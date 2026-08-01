import { StockStatus } from '@prisma/client';
import { BrandDto } from '../brand/brand.interface';
import { CategoryDto } from '../category/category.interface';
import { MediaDto } from '../media/media.interface';

export interface MediaAttachmentDto {
  id: string;
  mediaId: string;
  media: MediaDto;
  isThumbnail: boolean;
  isGallery: boolean;
  sortOrder: number;
}

export interface ProductVariantAttributeValueDto {
  attributeId: string;
  attributeName: string;
  attributeValueId: string;
  value: string;
  slug: string;
  referenceValue?: string | null;
}

export interface ProductVariantDto {
  id: string;
  productId: string;
  sku: string;
  price: number;
  salePrice?: number | null;
  stock: number;
  stockStatus: StockStatus;
  lowStockThreshold?: number | null;
  weight?: number | null;
  active: boolean;
  attributeValues: ProductVariantAttributeValueDto[];
  media: MediaAttachmentDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDto {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  hasVariants: boolean;
  price?: number | null;
  salePrice?: number | null;
  stock?: number | null;
  stockStatus?: StockStatus | null;
  priceMin?: number | null;
  priceMax?: number | null;
  weight?: number | null;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  brandId?: string | null;
  brand?: BrandDto | null;
  categories: CategoryDto[];
  thumbnail?: MediaDto | null;
  media: MediaAttachmentDto[];
  variants: ProductVariantDto[];
  createdAt: Date;
  updatedAt: Date;
}
