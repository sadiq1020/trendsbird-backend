import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  logo: z.string().optional(),
  description: z.string().optional(),
  status: z.boolean().default(true),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
