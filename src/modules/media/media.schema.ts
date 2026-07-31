import { z } from 'zod';

export const updateMediaMetaSchema = z.object({
  altText: z.string().optional(),
  title: z.string().optional(),
});

export type UpdateMediaMetaInput = z.infer<typeof updateMediaMetaSchema>;
