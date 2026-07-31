import { z } from 'zod';
import { MediaType } from '@prisma/client';

export const updateMediaMetaSchema = z.object({
  altText: z.string().trim().max(255).optional(),
  title: z.string().trim().max(255).optional(),
});

export const mediaIdParamsSchema = z.object({
  id: z.string().uuid('Invalid media ID'),
});

export const listMediaQuerySchema = z.object({
  search: z.string().trim().optional(),
  type: z.nativeEnum(MediaType).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type UpdateMediaMetaInput = z.infer<typeof updateMediaMetaSchema>;
export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;
