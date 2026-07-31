import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  image: z.string().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
