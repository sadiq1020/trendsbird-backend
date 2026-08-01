import { Prisma } from '@prisma/client';
import { AppError } from '../../common/middlewares/error-handler';
import { generateSlug } from '../../common/utils/slug';
import { prisma } from '../../prisma/client';
import { PaginatedResult } from '../permission/permission.interface';
import { CategoryDto, CategoryTreeNode } from './category.interface';
import { CreateCategoryInput, ListCategoryQuery, UpdateCategoryInput } from './category.schema';

export class CategoryService {
  /**
   * Prevents category inheritance cycles where a category becomes its own ancestor.
   */
  private async detectCycle(categoryId: string, newParentId: string): Promise<void> {
    if (categoryId === newParentId) {
      throw new AppError('Cycle detected: A category cannot be its own parent', 422, 'VALIDATION_ERROR');
    }

    let currentAncestorId: string | null = newParentId;

    while (currentAncestorId) {
      if (currentAncestorId === categoryId) {
        throw new AppError('Cycle detected: A category cannot be its own ancestor', 422, 'VALIDATION_ERROR');
      }

      const parentCategory: { parentId: string | null } | null = await prisma.category.findUnique({
        where: { id: currentAncestorId },
        select: { parentId: true },
      });

      currentAncestorId = parentCategory?.parentId || null;
    }
  }

  private formatCategoryDto(category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    parentId: string | null;
    parent?: { id: string; name: string; slug: string } | null;
    active: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    _count?: { children?: number; products?: number };
  }): CategoryDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      parentId: category.parentId,
      parent: category.parent ? { id: category.parent.id, name: category.parent.name, slug: category.parent.slug } : null,
      childrenCount: category._count?.children ?? 0,
      productCount: category._count?.products ?? 0,
      active: category.active,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  async createCategory(input: CreateCategoryInput): Promise<CategoryDto> {
    const targetSlug = generateSlug(input.slug || input.name);
    if (!targetSlug) {
      throw new AppError('Category name must produce a valid slug', 422, 'VALIDATION_ERROR');
    }

    const existingSlug = await prisma.category.findUnique({ where: { slug: targetSlug } });
    if (existingSlug) {
      throw new AppError(`A category with slug "${targetSlug}" already exists`, 409, 'CONFLICT_ERROR');
    }

    if (input.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
      if (!parent) {
        throw new AppError('Parent category not found', 404, 'NOT_FOUND');
      }
    }

    const createdCategory = await prisma.category.create({
      data: {
        name: input.name,
        slug: targetSlug,
        description: input.description,
        parentId: input.parentId || null,
        image: input.image,
        active: input.active,
        sortOrder: input.sortOrder,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { children: true, products: true } },
      },
    });

    return this.formatCategoryDto(createdCategory);
  }

  async listCategories(query: ListCategoryQuery): Promise<PaginatedResult<CategoryDto>> {
    const { search, active, parentId, page, limit } = query;
    const where: Prisma.CategoryWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (active !== undefined) {
      where.active = active;
    }

    if (parentId !== undefined) {
      where.parentId = parentId;
    }

    const [rawCategories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          _count: { select: { children: true, products: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.category.count({ where }),
    ]);

    const items = rawCategories.map((c) => this.formatCategoryDto(c));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    const allCategories = await prisma.category.findMany({
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { children: true, products: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const categoryMap = new Map<string, CategoryTreeNode>();
    const rootNodes: CategoryTreeNode[] = [];

    // First pass: instantiate all nodes with empty children arrays
    for (const cat of allCategories) {
      const node: CategoryTreeNode = {
        ...this.formatCategoryDto(cat),
        children: [],
      };
      categoryMap.set(node.id, node);
    }

    // Second pass: link child nodes to their parent
    for (const node of categoryMap.values()) {
      if (node.parentId && categoryMap.has(node.parentId)) {
        categoryMap.get(node.parentId)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }

  async getCategoryById(id: string): Promise<CategoryDto> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { children: true, products: true } },
      },
    });

    if (!category) {
      throw new AppError('Category not found', 404, 'NOT_FOUND');
    }

    return this.formatCategoryDto(category);
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryDto> {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new AppError('Category not found', 404, 'NOT_FOUND');
    }

    if (input.parentId !== undefined && input.parentId !== null) {
      const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
      if (!parent) {
        throw new AppError('Parent category not found', 404, 'NOT_FOUND');
      }

      await this.detectCycle(id, input.parentId);
    }

    let targetSlug: string | undefined = undefined;
    if (input.slug || input.name) {
      targetSlug = generateSlug(input.slug || input.name || category.name);
      if (targetSlug !== category.slug) {
        const existingSlug = await prisma.category.findFirst({
          where: { slug: targetSlug, id: { not: id } },
        });
        if (existingSlug) {
          throw new AppError(`A category with slug "${targetSlug}" already exists`, 409, 'CONFLICT_ERROR');
        }
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: input.name,
        slug: targetSlug,
        description: input.description,
        parentId: input.parentId,
        image: input.image,
        active: input.active,
        sortOrder: input.sortOrder,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { children: true, products: true } },
      },
    });

    return this.formatCategoryDto(updatedCategory);
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { children: true, products: true } },
      },
    });

    if (!category) {
      throw new AppError('Category not found', 404, 'NOT_FOUND');
    }

    if (category._count.children > 0) {
      throw new AppError(
        `Refusing deletion: Category has ${category._count.children} child subcategories attached`,
        409,
        'CONFLICT_ERROR'
      );
    }

    if (category._count.products > 0) {
      throw new AppError(
        `Refusing deletion: Category has ${category._count.products} products attached`,
        409,
        'CONFLICT_ERROR'
      );
    }

    await prisma.category.delete({ where: { id } });
  }
}
