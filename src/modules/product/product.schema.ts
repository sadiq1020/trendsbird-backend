import { z } from 'zod';
import { StockStatus } from '@prisma/client';

export const mediaAttachmentInputSchema = z.object({
  mediaId: z.string().uuid('Invalid media ID'),
  isThumbnail: z.boolean().optional().default(false),
  isGallery: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const variantInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    sku: z.string().trim().min(1, 'Variant SKU is required'),
    price: z.number().min(0, 'Price cannot be negative'),
    salePrice: z.number().min(0, 'Sale price cannot be negative').nullable().optional(),
    stock: z.number().int().min(0, 'Stock cannot be negative'),
    lowStockThreshold: z.number().int().min(0).optional(),
    weight: z.number().min(0).optional(),
    active: z.boolean().optional().default(true),
    attributeValueIds: z
      .array(z.string().uuid('Invalid attribute value ID'))
      .min(1, 'Variant must have at least one attribute value'),
    media: z.array(mediaAttachmentInputSchema).optional().default([]),
  })
  .refine(
    (data) => {
      if (data.salePrice !== undefined && data.salePrice !== null) {
        return data.salePrice <= data.price;
      }
      return true;
    },
    {
      message: 'Sale price cannot exceed regular price',
      path: ['salePrice'],
    }
  );

export const baseProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(200),
  slug: z.string().trim().optional(),
  shortDescription: z.string().trim().optional(),
  longDescription: z.string().trim().optional(),
  brandId: z.string().uuid('Invalid brand ID').nullable().optional(),
  categoryIds: z.array(z.string().uuid('Invalid category ID')).optional().default([]),
  media: z.array(mediaAttachmentInputSchema).optional().default([]),
  weight: z.number().min(0).optional(),
  active: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
});

export const simpleProductCreateSchema = baseProductSchema.extend({
  hasVariants: z.literal(false),
  sku: z.string().trim().min(1, 'SKU is required for products without variants'),
  price: z.number().min(0, 'Price cannot be negative'),
  salePrice: z.number().min(0, 'Sale price cannot be negative').nullable().optional(),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  weight: z.number().min(0).optional(),
});

export const variableProductCreateSchema = baseProductSchema.extend({
  hasVariants: z.literal(true),
  variants: z
    .array(variantInputSchema)
    .min(1, 'A variable product must contain at least one variant'),
});

export const createProductSchema = z
  .discriminatedUnion('hasVariants', [simpleProductCreateSchema, variableProductCreateSchema])
  .refine(
    (data) => {
      if (!data.hasVariants && data.salePrice !== undefined && data.salePrice !== null) {
        return data.salePrice <= data.price;
      }
      return true;
    },
    {
      message: 'Sale price cannot exceed regular price',
      path: ['salePrice'],
    }
  );

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().optional(),
  shortDescription: z.string().trim().optional(),
  longDescription: z.string().trim().optional(),
  brandId: z.string().uuid().nullable().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  media: z.array(mediaAttachmentInputSchema).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  // For simple products
  sku: z.string().trim().optional(),
  price: z.number().min(0).optional(),
  salePrice: z.number().min(0).nullable().optional(),
  stock: z.number().int().min(0).optional(),
  weight: z.number().min(0).optional(),
  // For variable products
  variants: z.array(variantInputSchema).optional(),
});

export const productIdParamsSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

export const listProductQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  active: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  featured: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  hasVariants: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type MediaAttachmentInput = z.infer<typeof mediaAttachmentInputSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductQuery = z.infer<typeof listProductQuerySchema>;
