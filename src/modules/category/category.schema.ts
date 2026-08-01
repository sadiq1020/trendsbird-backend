import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  slug: z.string().trim().optional(),
  description: z.string().trim().max(255).optional(),
  parentId: z.string().uuid('Invalid parent category ID').nullable().optional(),
  image: z.string().trim().optional(),
  active: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  slug: z.string().trim().optional(),
  description: z.string().trim().max(255).optional(),
  parentId: z.string().uuid('Invalid parent category ID').nullable().optional(),
  image: z.string().trim().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const categoryIdParamsSchema = z.object({
  id: z.string().uuid('Invalid category ID'),
});

export const listCategoryQuerySchema = z.object({
  search: z.string().trim().optional(),
  active: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  parentId: z.string().uuid().nullable().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoryQuery = z.infer<typeof listCategoryQuerySchema>;
