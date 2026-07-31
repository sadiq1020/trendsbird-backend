import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { MediaType, Prisma } from '@prisma/client';
import { AppError } from '../../common/middlewares/error-handler';
import { prisma } from '../../prisma/client';
import { PaginatedResult } from '../permission/permission.interface';
import { MediaDto } from './media.interface';
import { ListMediaQuery, UpdateMediaMetaInput } from './media.schema';

export class MediaService {
  private formatMediaDto(media: {
    id: string;
    fileName: string;
    storedPath: string;
    publicUrl: string;
    mimeType: string;
    type: MediaType;
    size: number;
    width: number | null;
    height: number | null;
    thumbnailPath: string | null;
    altText: string | null;
    title: string | null;
    uploadedById: string;
    createdAt: Date;
    updatedAt: Date;
  }, baseUrl: string): MediaDto {
    const thumbnailUrl = media.thumbnailPath
      ? `${baseUrl}/uploads/thumbnails/${path.basename(media.thumbnailPath)}`
      : null;

    return {
      id: media.id,
      fileName: media.fileName,
      storedPath: media.storedPath,
      publicUrl: media.publicUrl,
      mimeType: media.mimeType,
      type: media.type,
      size: media.size,
      width: media.width,
      height: media.height,
      thumbnailPath: media.thumbnailPath,
      thumbnailUrl,
      altText: media.altText,
      title: media.title,
      uploadedById: media.uploadedById,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    };
  }

  async processAndSaveUploads(
    files: Express.Multer.File[],
    uploadedById: string,
    baseUrl: string
  ): Promise<MediaDto[]> {
    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 400, 'VALIDATION_ERROR');
    }

    const createdRecords: MediaDto[] = [];

    for (const file of files) {
      const isImage = file.mimetype.startsWith('image/');
      const mediaType: MediaType = isImage ? 'IMAGE' : 'VIDEO';

      let width: number | null = null;
      let height: number | null = null;
      let thumbnailPath: string | null = null;

      if (isImage) {
        try {
          const imageMetadata = await sharp(file.path).metadata();
          width = imageMetadata.width || null;
          height = imageMetadata.height || null;

          const thumbFileName = `thumb-${file.filename}`;
          thumbnailPath = path.join(process.cwd(), 'uploads', 'thumbnails', thumbFileName);

          await sharp(file.path)
            .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
            .toFile(thumbnailPath);
        } catch (err) {
          console.error('Error generating image thumbnail:', err);
        }
      }

      const publicUrl = `${baseUrl}/uploads/${file.filename}`;

      const mediaRecord = await prisma.media.create({
        data: {
          fileName: file.originalname,
          storedPath: file.path,
          publicUrl,
          mimeType: file.mimetype,
          type: mediaType,
          size: file.size,
          width,
          height,
          thumbnailPath,
          title: path.basename(file.originalname, path.extname(file.originalname)),
          uploadedById,
        },
      });

      createdRecords.push(this.formatMediaDto(mediaRecord, baseUrl));
    }

    return createdRecords;
  }

  async listMedia(query: ListMediaQuery, baseUrl: string): Promise<PaginatedResult<MediaDto>> {
    const { search, type, page, limit } = query;
    const where: Prisma.MediaWhereInput = {};

    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { altText: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    const [rawMedia, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.media.count({ where }),
    ]);

    const items = rawMedia.map((m) => this.formatMediaDto(m, baseUrl));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getMediaById(id: string, baseUrl: string): Promise<MediaDto> {
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new AppError('Media asset not found', 404, 'NOT_FOUND');
    }
    return this.formatMediaDto(media, baseUrl);
  }

  async updateMediaMeta(id: string, input: UpdateMediaMetaInput, baseUrl: string): Promise<MediaDto> {
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new AppError('Media asset not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.media.update({
      where: { id },
      data: {
        altText: input.altText,
        title: input.title,
      },
    });

    return this.formatMediaDto(updated, baseUrl);
  }

  async deleteMedia(id: string): Promise<void> {
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new AppError('Media asset not found', 404, 'NOT_FOUND');
    }

    // Delete physical files from disk safely
    try {
      if (fs.existsSync(media.storedPath)) {
        await fs.promises.unlink(media.storedPath);
      }
      if (media.thumbnailPath && fs.existsSync(media.thumbnailPath)) {
        await fs.promises.unlink(media.thumbnailPath);
      }
    } catch (err) {
      console.error('Warning: Failed to delete physical file from disk:', err);
    }

    // Delete database record (cascades MediaAttachment relations cleanly)
    await prisma.media.delete({ where: { id } });
  }
}
