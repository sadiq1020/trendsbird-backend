import { z } from 'zod';
import { AttributeType } from '@prisma/client';

export const attributeValueItemSchema = z.object({
  value: z.string().trim().min(1, 'Attribute value cannot be empty').max(100),
  slug: z.string().trim().optional(),
  referenceValue: z.string().trim().optional(),
});

export const createAttributeSchema = z.object({
  name: z.string().trim().min(1, 'Attribute name is required').max(100),
  slug: z.string().trim().optional(),
  type: z.nativeEnum(AttributeType),
  values: z.array(attributeValueItemSchema).optional().default([]),
});

export const updateAttributeSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  slug: z.string().trim().optional(),
  type: z.nativeEnum(AttributeType).optional(),
});

export const addAttributeValuesSchema = z.object({
  values: z.array(attributeValueItemSchema).min(1, 'Provide at least one attribute value to add'),
});

export const updateAttributeValueSchema = z.object({
  value: z.string().trim().min(1).max(100).optional(),
  slug: z.string().trim().optional(),
  referenceValue: z.string().trim().optional(),
});

export const attributeIdParamsSchema = z.object({
  id: z.string().uuid('Invalid attribute ID'),
});

export const attributeValueParamsSchema = z.object({
  id: z.string().uuid('Invalid attribute ID'),
  valueId: z.string().uuid('Invalid attribute value ID'),
});

export const listAttributeQuerySchema = z.object({
  search: z.string().trim().optional(),
  type: z.nativeEnum(AttributeType).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type AttributeValueItemInput = z.infer<typeof attributeValueItemSchema>;
export type CreateAttributeInput = z.infer<typeof createAttributeSchema>;
export type UpdateAttributeInput = z.infer<typeof updateAttributeSchema>;
export type AddAttributeValuesInput = z.infer<typeof addAttributeValuesSchema>;
export type UpdateAttributeValueInput = z.infer<typeof updateAttributeValueSchema>;
export type ListAttributeQuery = z.infer<typeof listAttributeQuerySchema>;
