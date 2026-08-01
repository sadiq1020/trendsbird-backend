import { AttributeType } from '@prisma/client';

export interface AttributeValueDto {
  id: string;
  value: string;
  slug: string;
  referenceValue?: string | null;
  attributeId: string;
  variantCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttributeDto {
  id: string;
  name: string;
  slug: string;
  type: AttributeType;
  values: AttributeValueDto[];
  createdAt: Date;
  updatedAt: Date;
}
