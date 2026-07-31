import { z } from 'zod';
import { AttributeType } from '@prisma/client';

export const createAttributeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.nativeEnum(AttributeType),
});

export type CreateAttributeInput = z.infer<typeof createAttributeSchema>;
