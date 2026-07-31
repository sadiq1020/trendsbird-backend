import { MediaType } from '@prisma/client';

export interface MediaDto {
  id: string;
  fileName: string;
  storedPath: string;
  publicUrl: string;
  mimeType: string;
  type: MediaType;
  size: number;
  width?: number | null;
  height?: number | null;
  thumbnailPath?: string | null;
  thumbnailUrl?: string | null;
  altText?: string | null;
  title?: string | null;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
}
