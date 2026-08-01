import { AttributeType, Prisma } from '@prisma/client';
import { AppError } from '../../common/middlewares/error-handler';
import { generateSlug } from '../../common/utils/slug';
import { prisma } from '../../prisma/client';
import { PaginatedResult } from '../permission/permission.interface';
import { AttributeDto, AttributeValueDto } from './attribute.interface';
import {
  AddAttributeValuesInput,
  CreateAttributeInput,
  ListAttributeQuery,
  UpdateAttributeInput,
  UpdateAttributeValueInput,
} from './attribute.schema';

export class AttributeService {
  private formatAttributeDto(attribute: {
    id: string;
    name: string;
    slug: string;
    type: AttributeType;
    createdAt: Date;
    updatedAt: Date;
    values?: Array<{
      id: string;
      value: string;
      slug: string;
      referenceValue: string | null;
      attributeId: string;
      createdAt: Date;
      updatedAt: Date;
      _count?: { variantLinks?: number };
    }>;
  }): AttributeDto {
    return {
      id: attribute.id,
      name: attribute.name,
      slug: attribute.slug,
      type: attribute.type,
      values: attribute.values
        ? attribute.values.map((v) => ({
            id: v.id,
            value: v.value,
            slug: v.slug,
            referenceValue: v.referenceValue,
            attributeId: v.attributeId,
            variantCount: v._count?.variantLinks ?? 0,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt,
          }))
        : [],
      createdAt: attribute.createdAt,
      updatedAt: attribute.updatedAt,
    };
  }

  async createAttribute(input: CreateAttributeInput): Promise<AttributeDto> {
    const existingName = await prisma.attribute.findFirst({
      where: { name: { equals: input.name, mode: 'insensitive' } },
    });
    if (existingName) {
      throw new AppError(`An attribute named "${input.name}" already exists`, 409, 'CONFLICT_ERROR');
    }

    const targetSlug = generateSlug(input.slug || input.name);
    if (!targetSlug) {
      throw new AppError('Attribute name must produce a valid slug', 422, 'VALIDATION_ERROR');
    }

    const existingSlug = await prisma.attribute.findUnique({ where: { slug: targetSlug } });
    if (existingSlug) {
      throw new AppError(`An attribute with slug "${targetSlug}" already exists`, 409, 'CONFLICT_ERROR');
    }

    // Check for internal duplicate values in the initial payload
    if (input.values && input.values.length > 0) {
      const valueNames = input.values.map((v) => v.value.trim().toLowerCase());
      const uniqueNames = new Set(valueNames);
      if (uniqueNames.size !== valueNames.length) {
        throw new AppError('Initial attribute values must be unique', 422, 'VALIDATION_ERROR');
      }
    }

    const createdAttributeId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.attribute.create({
        data: {
          name: input.name,
          slug: targetSlug,
          type: input.type,
        },
      });

      if (input.values && input.values.length > 0) {
        await tx.attributeValue.createMany({
          data: input.values.map((v) => ({
            value: v.value,
            slug: generateSlug(v.slug || v.value),
            referenceValue: v.referenceValue,
            attributeId: created.id,
          })),
        });
      }

      return created.id;
    });

    return this.getAttributeById(createdAttributeId);
  }

  async listAttributes(query: ListAttributeQuery): Promise<PaginatedResult<AttributeDto>> {
    const { search, type, page, limit } = query;
    const where: Prisma.AttributeWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    const [rawAttributes, total] = await Promise.all([
      prisma.attribute.findMany({
        where,
        include: {
          values: {
            include: {
              _count: { select: { variantLinks: true } },
            },
            orderBy: { value: 'asc' },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.attribute.count({ where }),
    ]);

    const items = rawAttributes.map((a) => this.formatAttributeDto(a));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getAttributeById(id: string): Promise<AttributeDto> {
    const attribute = await prisma.attribute.findUnique({
      where: { id },
      include: {
        values: {
          include: {
            _count: { select: { variantLinks: true } },
          },
          orderBy: { value: 'asc' },
        },
      },
    });

    if (!attribute) {
      throw new AppError('Attribute not found', 404, 'NOT_FOUND');
    }

    return this.formatAttributeDto(attribute);
  }

  async updateAttribute(id: string, input: UpdateAttributeInput): Promise<AttributeDto> {
    const attribute = await prisma.attribute.findUnique({ where: { id } });
    if (!attribute) {
      throw new AppError('Attribute not found', 404, 'NOT_FOUND');
    }

    if (input.name && input.name.toLowerCase() !== attribute.name.toLowerCase()) {
      const existingName = await prisma.attribute.findFirst({
        where: { name: { equals: input.name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existingName) {
        throw new AppError(`An attribute named "${input.name}" already exists`, 409, 'CONFLICT_ERROR');
      }
    }

    let targetSlug: string | undefined = undefined;
    if (input.slug || input.name) {
      targetSlug = generateSlug(input.slug || input.name || attribute.name);
      if (targetSlug !== attribute.slug) {
        const existingSlug = await prisma.attribute.findFirst({
          where: { slug: targetSlug, id: { not: id } },
        });
        if (existingSlug) {
          throw new AppError(`An attribute with slug "${targetSlug}" already exists`, 409, 'CONFLICT_ERROR');
        }
      }
    }

    await prisma.attribute.update({
      where: { id },
      data: {
        name: input.name,
        slug: targetSlug,
        type: input.type,
      },
    });

    return this.getAttributeById(id);
  }

  async addValues(attributeId: string, input: AddAttributeValuesInput): Promise<AttributeDto> {
    const attribute = await prisma.attribute.findUnique({ where: { id: attributeId } });
    if (!attribute) {
      throw new AppError('Attribute not found', 404, 'NOT_FOUND');
    }

    const existingValues = await prisma.attributeValue.findMany({
      where: { attributeId },
      select: { value: true },
    });
    const existingSet = new Set(existingValues.map((v) => v.value.toLowerCase()));

    const newValuesToInsert: Array<{ value: string; slug: string; referenceValue?: string }> = [];

    for (const valItem of input.values) {
      const lower = valItem.value.trim().toLowerCase();
      if (existingSet.has(lower)) {
        throw new AppError(
          `Value "${valItem.value}" already exists under this attribute`,
          409,
          'CONFLICT_ERROR'
        );
      }
      existingSet.add(lower);
      newValuesToInsert.push({
        value: valItem.value,
        slug: generateSlug(valItem.slug || valItem.value),
        referenceValue: valItem.referenceValue,
      });
    }

    await prisma.attributeValue.createMany({
      data: newValuesToInsert.map((v) => ({
        value: v.value,
        slug: v.slug,
        referenceValue: v.referenceValue,
        attributeId,
      })),
    });

    return this.getAttributeById(attributeId);
  }

  async updateValue(
    attributeId: string,
    valueId: string,
    input: UpdateAttributeValueInput
  ): Promise<AttributeValueDto> {
    const attributeValue = await prisma.attributeValue.findUnique({
      where: { id: valueId },
      include: { _count: { select: { variantLinks: true } } },
    });

    if (!attributeValue || attributeValue.attributeId !== attributeId) {
      throw new AppError('Attribute value not found under this attribute', 404, 'NOT_FOUND');
    }

    if (input.value && input.value.toLowerCase() !== attributeValue.value.toLowerCase()) {
      const existingValue = await prisma.attributeValue.findFirst({
        where: { attributeId, value: { equals: input.value, mode: 'insensitive' }, id: { not: valueId } },
      });
      if (existingValue) {
        throw new AppError(
          `Value "${input.value}" already exists under this attribute`,
          409,
          'CONFLICT_ERROR'
        );
      }
    }

    const updated = await prisma.attributeValue.update({
      where: { id: valueId },
      data: {
        value: input.value,
        slug: input.slug || input.value ? generateSlug(input.slug || input.value || attributeValue.value) : undefined,
        referenceValue: input.referenceValue,
      },
      include: { _count: { select: { variantLinks: true } } },
    });

    return {
      id: updated.id,
      value: updated.value,
      slug: updated.slug,
      referenceValue: updated.referenceValue,
      attributeId: updated.attributeId,
      variantCount: updated._count.variantLinks,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteValue(attributeId: string, valueId: string): Promise<void> {
    const attributeValue = await prisma.attributeValue.findUnique({
      where: { id: valueId },
      include: { _count: { select: { variantLinks: true } } },
    });

    if (!attributeValue || attributeValue.attributeId !== attributeId) {
      throw new AppError('Attribute value not found under this attribute', 404, 'NOT_FOUND');
    }

    if (attributeValue._count.variantLinks > 0) {
      throw new AppError(
        `Refusing deletion: Attribute value "${attributeValue.value}" is currently referenced by ${attributeValue._count.variantLinks} product variant(s)`,
        409,
        'CONFLICT_ERROR'
      );
    }

    await prisma.attributeValue.delete({ where: { id: valueId } });
  }

  async deleteAttribute(id: string): Promise<void> {
    const attribute = await prisma.attribute.findUnique({ where: { id } });
    if (!attribute) {
      throw new AppError('Attribute not found', 404, 'NOT_FOUND');
    }

    const usedVariantLinksCount = await prisma.productVariantAttributeValue.count({
      where: {
        attributeValue: {
          attributeId: id,
        },
      },
    });

    if (usedVariantLinksCount > 0) {
      throw new AppError(
        `Refusing deletion: Attribute values under "${attribute.name}" are currently referenced by ${usedVariantLinksCount} product variant(s)`,
        409,
        'CONFLICT_ERROR'
      );
    }

    await prisma.attribute.delete({ where: { id } });
  }
}
