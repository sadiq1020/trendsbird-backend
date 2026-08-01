import { Prisma } from '@prisma/client';
import { AppError } from '../../common/middlewares/error-handler';
import { generateSlug } from '../../common/utils/slug';
import { prisma } from '../../prisma/client';
import { PaginatedResult } from '../permission/permission.interface';
import { BrandDto } from './brand.interface';
import { CreateBrandInput, ListBrandQuery, UpdateBrandInput } from './brand.schema';

export class BrandService {
  private formatBrandDto(brand: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    status: boolean;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: { products?: number };
  }): BrandDto {
    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo,
      status: brand.status,
      description: brand.description,
      productCount: brand._count?.products ?? 0,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }

  async createBrand(input: CreateBrandInput): Promise<BrandDto> {
    const existingName = await prisma.brand.findFirst({
      where: { name: { equals: input.name, mode: 'insensitive' } },
    });
    if (existingName) {
      throw new AppError(`A brand named "${input.name}" already exists`, 409, 'CONFLICT_ERROR');
    }

    const targetSlug = generateSlug(input.slug || input.name);
    if (!targetSlug) {
      throw new AppError('Brand name must produce a valid slug', 422, 'VALIDATION_ERROR');
    }

    const existingSlug = await prisma.brand.findUnique({ where: { slug: targetSlug } });
    if (existingSlug) {
      throw new AppError(`A brand with slug "${targetSlug}" already exists`, 409, 'CONFLICT_ERROR');
    }

    const createdBrand = await prisma.brand.create({
      data: {
        name: input.name,
        slug: targetSlug,
        logo: input.logo,
        description: input.description,
        status: input.status,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    return this.formatBrandDto(createdBrand);
  }

  async listBrands(query: ListBrandQuery): Promise<PaginatedResult<BrandDto>> {
    const { search, status, page, limit } = query;
    const where: Prisma.BrandWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status !== undefined) {
      where.status = status;
    }

    const [rawBrands, total] = await Promise.all([
      prisma.brand.findMany({
        where,
        include: {
          _count: { select: { products: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.brand.count({ where }),
    ]);

    const items = rawBrands.map((b) => this.formatBrandDto(b));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getBrandById(id: string): Promise<BrandDto> {
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!brand) {
      throw new AppError('Brand not found', 404, 'NOT_FOUND');
    }

    return this.formatBrandDto(brand);
  }

  async updateBrand(id: string, input: UpdateBrandInput): Promise<BrandDto> {
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new AppError('Brand not found', 404, 'NOT_FOUND');
    }

    if (input.name && input.name.toLowerCase() !== brand.name.toLowerCase()) {
      const existingName = await prisma.brand.findFirst({
        where: { name: { equals: input.name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existingName) {
        throw new AppError(`A brand named "${input.name}" already exists`, 409, 'CONFLICT_ERROR');
      }
    }

    let targetSlug: string | undefined = undefined;
    if (input.slug || input.name) {
      targetSlug = generateSlug(input.slug || input.name || brand.name);
      if (targetSlug !== brand.slug) {
        const existingSlug = await prisma.brand.findFirst({
          where: { slug: targetSlug, id: { not: id } },
        });
        if (existingSlug) {
          throw new AppError(`A brand with slug "${targetSlug}" already exists`, 409, 'CONFLICT_ERROR');
        }
      }
    }

    const updatedBrand = await prisma.brand.update({
      where: { id },
      data: {
        name: input.name,
        slug: targetSlug,
        logo: input.logo,
        description: input.description,
        status: input.status,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    return this.formatBrandDto(updatedBrand);
  }

  async deleteBrand(id: string): Promise<void> {
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!brand) {
      throw new AppError('Brand not found', 404, 'NOT_FOUND');
    }

    if (brand._count.products > 0) {
      throw new AppError(
        `Refusing deletion: Brand is currently referenced by ${brand._count.products} product(s)`,
        409,
        'CONFLICT_ERROR'
      );
    }

    await prisma.brand.delete({ where: { id } });
  }
}
