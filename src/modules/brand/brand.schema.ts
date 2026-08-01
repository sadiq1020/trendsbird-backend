import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().trim().min(1, 'Brand name is required').max(100),
  slug: z.string().trim().optional(),
  logo: z.string().trim().optional(),
  description: z.string().trim().max(255).optional(),
  status: z.boolean().optional().default(true),
});

export const updateBrandSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  slug: z.string().trim().optional(),
  logo: z.string().trim().optional(),
  description: z.string().trim().max(255).optional(),
  status: z.boolean().optional(),
});

export const brandIdParamsSchema = z.object({
  id: z.string().uuid('Invalid brand ID'),
});

export const listBrandQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type ListBrandQuery = z.infer<typeof listBrandQuerySchema>;
