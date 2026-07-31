import { z } from 'zod';
import { StockStatus } from '@prisma/client';

export const baseProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  brandId: z.string().uuid().optional(),
  categoryIds: z.array(z.string().uuid()).default([]),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const simpleProductSchema = baseProductSchema.extend({
  hasVariants: z.literal(false),
  sku: z.string().min(1, 'SKU is required for products without variants'),
  price: z.number().positive('Price must be positive'),
  salePrice: z.number().positive().optional(),
  stock: z.number().int().nonnegative('Stock must be non-negative'),
  stockStatus: z.nativeEnum(StockStatus),
  weight: z.number().positive().optional(),
});

export const variantProductSchema = baseProductSchema.extend({
  hasVariants: z.literal(true),
});

export const createProductSchema = z.discriminatedUnion('hasVariants', [
  simpleProductSchema,
  variantProductSchema,
]);

export type CreateProductInput = z.infer<typeof createProductSchema>;
