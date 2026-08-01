export interface BrandDto {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  status: boolean;
  description?: string | null;
  productCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
