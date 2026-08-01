import { Prisma, StockStatus } from '@prisma/client';
import { AppError } from '../../common/middlewares/error-handler';
import { generateSlug } from '../../common/utils/slug';
import { prisma } from '../../prisma/client';
import { PaginatedResult } from '../permission/permission.interface';
import { ProductDto, ProductVariantDto } from './product.interface';
import { CreateProductInput, ListProductQuery, MediaAttachmentInput, UpdateProductInput, VariantInput } from './product.schema';

export class ProductService {
  private deriveStockStatus(stock: number, lowStockThreshold: number = 5): StockStatus {
    if (stock <= 0) return StockStatus.OUT_OF_STOCK;
    if (stock <= lowStockThreshold) return StockStatus.LOW_STOCK;
    return StockStatus.IN_STOCK;
  }

  private normalizeMediaAttachments(mediaList: MediaAttachmentInput[]): MediaAttachmentInput[] {
    let thumbnailFound = false;
    return mediaList.map((item, index) => {
      let isThumb = item.isThumbnail;
      if (isThumb) {
        if (thumbnailFound) {
          isThumb = false; // Demote duplicate thumbnail flag
        } else {
          thumbnailFound = true;
        }
      }
      return {
        ...item,
        isThumbnail: isThumb,
        sortOrder: item.sortOrder ?? index,
      };
    });
  }

  private validateVariantCombinations(variants: VariantInput[]): void {
    const combinationSet = new Set<string>();
    const skuSet = new Set<string>();

    for (const v of variants) {
      if (skuSet.has(v.sku.toLowerCase())) {
        throw new AppError(`Duplicate variant SKU "${v.sku}" in request payload`, 409, 'CONFLICT_ERROR');
      }
      skuSet.add(v.sku.toLowerCase());

      const comboKey = [...v.attributeValueIds].sort().join(',');
      if (combinationSet.has(comboKey)) {
        throw new AppError('Two variants of the same product cannot have identical attribute combinations', 409, 'CONFLICT_ERROR');
      }
      combinationSet.add(comboKey);
    }
  }

  private formatProductDto(product: any, baseUrl: string): ProductDto {
    const categories = product.categories
      ? product.categories.map((pc: any) => ({
          id: pc.category.id,
          name: pc.category.name,
          slug: pc.category.slug,
          description: pc.category.description,
          image: pc.category.image,
          parentId: pc.category.parentId,
          active: pc.category.active,
          sortOrder: pc.category.sortOrder,
          createdAt: pc.category.createdAt,
          updatedAt: pc.category.updatedAt,
        }))
      : [];

    const media = product.media
      ? product.media.map((ma: any) => ({
          id: ma.id,
          mediaId: ma.media.id,
          media: {
            id: ma.media.id,
            fileName: ma.media.fileName,
            storedPath: ma.media.storedPath,
            publicUrl: ma.media.publicUrl,
            mimeType: ma.media.mimeType,
            type: ma.media.type,
            size: ma.media.size,
            width: ma.media.width,
            height: ma.media.height,
            thumbnailPath: ma.media.thumbnailPath,
            thumbnailUrl: ma.media.thumbnailPath ? `${baseUrl}/uploads/thumbnails/${ma.media.thumbnailPath.split(/[\/\\]/).pop()}` : null,
            altText: ma.media.altText,
            title: ma.media.title,
            uploadedById: ma.media.uploadedById,
            createdAt: ma.media.createdAt,
            updatedAt: ma.media.updatedAt,
          },
          isThumbnail: ma.isThumbnail,
          isGallery: ma.isGallery,
          sortOrder: ma.sortOrder,
        }))
      : [];

    const thumbnailItem = media.find((m: any) => m.isThumbnail);
    const thumbnail = thumbnailItem ? thumbnailItem.media : (media.length > 0 ? media[0].media : null);

    const variants: ProductVariantDto[] = product.variants
      ? product.variants.map((v: any) => {
          const attributeValues = v.attributeValues
            ? v.attributeValues.map((avLink: any) => ({
                attributeId: avLink.attributeValue.attribute.id,
                attributeName: avLink.attributeValue.attribute.name,
                attributeValueId: avLink.attributeValue.id,
                value: avLink.attributeValue.value,
                slug: avLink.attributeValue.slug,
                referenceValue: avLink.attributeValue.referenceValue,
              }))
            : [];

          const variantMedia = v.media
            ? v.media.map((vma: any) => ({
                id: vma.id,
                mediaId: vma.media.id,
                media: {
                  id: vma.media.id,
                  fileName: vma.media.fileName,
                  storedPath: vma.media.storedPath,
                  publicUrl: vma.media.publicUrl,
                  mimeType: vma.media.mimeType,
                  type: vma.media.type,
                  size: vma.media.size,
                  width: vma.media.width,
                  height: vma.media.height,
                  thumbnailPath: vma.media.thumbnailPath,
                  thumbnailUrl: vma.media.thumbnailPath ? `${baseUrl}/uploads/thumbnails/${vma.media.thumbnailPath.split(/[\/\\]/).pop()}` : null,
                  altText: vma.media.altText,
                  title: vma.media.title,
                  uploadedById: vma.media.uploadedById,
                  createdAt: vma.media.createdAt,
                  updatedAt: vma.media.updatedAt,
                },
                isThumbnail: vma.isThumbnail,
                isGallery: vma.isGallery,
                sortOrder: vma.sortOrder,
              }))
            : [];

          return {
            id: v.id,
            productId: v.productId,
            sku: v.sku,
            price: Number(v.price),
            salePrice: v.salePrice ? Number(v.salePrice) : null,
            stock: v.stock,
            stockStatus: v.stockStatus,
            lowStockThreshold: v.lowStockThreshold,
            weight: v.weight ? Number(v.weight) : null,
            active: v.active,
            attributeValues,
            media: variantMedia,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt,
          };
        })
      : [];

    let priceMin: number | null = null;
    let priceMax: number | null = null;

    if (product.hasVariants && variants.length > 0) {
      const prices = variants.map((v) => v.salePrice ?? v.price);
      priceMin = Math.min(...prices);
      priceMax = Math.max(...prices);
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      shortDescription: product.shortDescription,
      longDescription: product.longDescription,
      hasVariants: product.hasVariants,
      price: product.price ? Number(product.price) : null,
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      stock: product.stock,
      stockStatus: product.stockStatus,
      priceMin,
      priceMax,
      weight: product.weight ? Number(product.weight) : null,
      active: product.active,
      featured: product.featured,
      sortOrder: product.sortOrder,
      brandId: product.brandId,
      brand: product.brand
        ? {
            id: product.brand.id,
            name: product.brand.name,
            slug: product.brand.slug,
            logo: product.brand.logo,
            status: product.brand.status,
            description: product.brand.description,
            createdAt: product.brand.createdAt,
            updatedAt: product.brand.updatedAt,
          }
        : null,
      categories,
      thumbnail,
      media,
      variants,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async createProduct(input: CreateProductInput, baseUrl: string): Promise<ProductDto> {
    const targetSlug = generateSlug(input.slug || input.name);
    if (!targetSlug) {
      throw new AppError('Product name must produce a valid slug', 422, 'VALIDATION_ERROR');
    }

    const existingSlug = await prisma.product.findUnique({ where: { slug: targetSlug } });
    if (existingSlug) {
      throw new AppError(`A product with slug "${targetSlug}" already exists`, 409, 'CONFLICT_ERROR');
    }

    if (input.brandId) {
      const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
      if (!brand) {
        throw new AppError('Specified brand does not exist', 404, 'NOT_FOUND');
      }
    }

    if (input.categoryIds && input.categoryIds.length > 0) {
      const categories = await prisma.category.findMany({
        where: { id: { in: input.categoryIds } },
        select: { id: true },
      });
      if (categories.length !== input.categoryIds.length) {
        throw new AppError('One or more specified category IDs do not exist', 404, 'NOT_FOUND');
      }
    }

    // Process & normalize media attachments
    const normalizedMedia = this.normalizeMediaAttachments(input.media || []);

    if (normalizedMedia.length > 0) {
      const mediaIds = normalizedMedia.map((m) => m.mediaId);
      const dbMedia = await prisma.media.findMany({
        where: { id: { in: mediaIds } },
        select: { id: true },
      });
      if (dbMedia.length !== mediaIds.length) {
        throw new AppError('One or more specified media IDs do not exist', 404, 'NOT_FOUND');
      }
    }

    // Simple vs Variable Validation
    let simpleSku: string | null = null;
    let simplePrice: number | null = null;
    let simpleSalePrice: number | null = null;
    let simpleStock: number | null = null;
    let simpleStockStatus: StockStatus | null = null;

    if (!input.hasVariants) {
      simpleSku = input.sku;
      simplePrice = input.price;
      simpleSalePrice = input.salePrice ?? null;
      simpleStock = input.stock;
      simpleStockStatus = this.deriveStockStatus(input.stock);

      const existingSku = await prisma.product.findUnique({ where: { sku: simpleSku } });
      if (existingSku) {
        throw new AppError(`A product with SKU "${simpleSku}" already exists`, 409, 'CONFLICT_ERROR');
      }
    } else {
      this.validateVariantCombinations(input.variants);

      // Collect all variant SKUs & attributeValueIds for batch validation
      const variantSkus = input.variants.map((v) => v.sku);
      const existingVariantSkus = await prisma.productVariant.findMany({
        where: { sku: { in: variantSkus } },
        select: { sku: true },
      });
      if (existingVariantSkus.length > 0) {
        const Skus = existingVariantSkus.map((s) => s.sku).join(', ');
        throw new AppError(`Variant SKU(s) already exist: ${Skus}`, 409, 'CONFLICT_ERROR');
      }

      const allAttrValueIds = Array.from(
        new Set(input.variants.flatMap((v) => v.attributeValueIds))
      );
      const dbAttrValues = await prisma.attributeValue.findMany({
        where: { id: { in: allAttrValueIds } },
        select: { id: true },
      });
      if (dbAttrValues.length !== allAttrValueIds.length) {
        throw new AppError('One or more referenced attribute value IDs do not exist', 404, 'NOT_FOUND');
      }
    }

    // Atomic Transaction to create Product and associated records
    const createdProductId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdProduct = await tx.product.create({
        data: {
          name: input.name,
          slug: targetSlug,
          sku: simpleSku,
          shortDescription: input.shortDescription,
          longDescription: input.longDescription,
          hasVariants: input.hasVariants,
          price: simplePrice !== null ? new Prisma.Decimal(simplePrice) : null,
          salePrice: simpleSalePrice !== null ? new Prisma.Decimal(simpleSalePrice) : null,
          stock: simpleStock,
          stockStatus: simpleStockStatus,
          weight: input.weight !== undefined ? new Prisma.Decimal(input.weight) : null,
          active: input.active,
          featured: input.featured,
          sortOrder: input.sortOrder,
          brandId: input.brandId || null,
        },
      });

      // Link Categories
      if (input.categoryIds && input.categoryIds.length > 0) {
        await tx.productCategory.createMany({
          data: input.categoryIds.map((categoryId) => ({
            productId: createdProduct.id,
            categoryId,
          })),
        });
      }

      // Link Media
      if (normalizedMedia.length > 0) {
        await tx.mediaAttachment.createMany({
          data: normalizedMedia.map((m) => ({
            mediaId: m.mediaId,
            productId: createdProduct.id,
            isThumbnail: m.isThumbnail,
            isGallery: m.isGallery,
            sortOrder: m.sortOrder,
          })),
        });
      }

      // Create Variants (if variable product)
      if (input.hasVariants && input.variants) {
        for (const v of input.variants) {
          const vStockStatus = this.deriveStockStatus(v.stock, v.lowStockThreshold || 5);
          const createdVariant = await tx.productVariant.create({
            data: {
              productId: createdProduct.id,
              sku: v.sku,
              price: new Prisma.Decimal(v.price),
              salePrice: v.salePrice !== undefined && v.salePrice !== null ? new Prisma.Decimal(v.salePrice) : null,
              stock: v.stock,
              stockStatus: vStockStatus,
              lowStockThreshold: v.lowStockThreshold || null,
              weight: v.weight !== undefined ? new Prisma.Decimal(v.weight) : null,
              active: v.active,
            },
          });

          // Link Variant Attribute Values
          await tx.productVariantAttributeValue.createMany({
            data: v.attributeValueIds.map((attributeValueId) => ({
              variantId: createdVariant.id,
              attributeValueId,
            })),
          });

          // Link Variant Media
          if (v.media && v.media.length > 0) {
            const normalizedVariantMedia = this.normalizeMediaAttachments(v.media);
            await tx.mediaAttachment.createMany({
              data: normalizedVariantMedia.map((vm) => ({
                mediaId: vm.mediaId,
                variantId: createdVariant.id,
                isThumbnail: vm.isThumbnail,
                isGallery: vm.isGallery,
                sortOrder: vm.sortOrder,
              })),
            });
          }
        }
      }

      return createdProduct.id;
    });

    return this.getProductById(createdProductId, baseUrl);
  }

  async listProducts(query: ListProductQuery, baseUrl: string): Promise<PaginatedResult<ProductDto>> {
    const { search, categoryId, brandId, active, featured, hasVariants, sort, page, limit } = query;
    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (categoryId) {
      where.categories = { some: { categoryId } };
    }

    if (brandId) {
      where.brandId = brandId;
    }

    if (active !== undefined) {
      where.active = active;
    }

    if (featured !== undefined) {
      where.featured = featured;
    }

    if (hasVariants !== undefined) {
      where.hasVariants = hasVariants;
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ createdAt: 'desc' }];
    if (sort === 'price_asc') {
      orderBy = [{ price: 'asc' }, { createdAt: 'desc' }];
    } else if (sort === 'price_desc') {
      orderBy = [{ price: 'desc' }, { createdAt: 'desc' }];
    } else if (sort === 'name_asc') {
      orderBy = [{ name: 'asc' }];
    } else if (sort === 'name_desc') {
      orderBy = [{ name: 'desc' }];
    }

    const [rawProducts, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          brand: true,
          categories: { include: { category: true } },
          media: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
          variants: {
            include: {
              attributeValues: {
                include: {
                  attributeValue: {
                    include: { attribute: true },
                  },
                },
              },
              media: { include: { media: true } },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    const items = rawProducts.map((p) => this.formatProductDto(p, baseUrl));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getProductById(id: string, baseUrl: string): Promise<ProductDto> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        categories: { include: { category: true } },
        media: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
        variants: {
          include: {
            attributeValues: {
              include: {
                attributeValue: {
                  include: { attribute: true },
                },
              },
            },
            media: { include: { media: true } },
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    return this.formatProductDto(product, baseUrl);
  }

  async updateProduct(id: string, input: UpdateProductInput, baseUrl: string): Promise<ProductDto> {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    if (input.name && input.name.toLowerCase() !== product.name.toLowerCase()) {
      const targetSlug = generateSlug(input.slug || input.name);
      const existingSlug = await prisma.product.findFirst({
        where: { slug: targetSlug, id: { not: id } },
      });
      if (existingSlug) {
        throw new AppError(`A product with slug "${targetSlug}" already exists`, 409, 'CONFLICT_ERROR');
      }
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Simple product updates
      let simplePrice = input.price !== undefined ? input.price : (product.price ? Number(product.price) : null);
      let simpleSalePrice = input.salePrice !== undefined ? input.salePrice : (product.salePrice ? Number(product.salePrice) : null);
      let simpleStock = input.stock !== undefined ? input.stock : product.stock;
      let simpleStockStatus = simpleStock !== null && simpleStock !== undefined ? this.deriveStockStatus(simpleStock) : product.stockStatus;

      await tx.product.update({
        where: { id },
        data: {
          name: input.name,
          shortDescription: input.shortDescription,
          longDescription: input.longDescription,
          brandId: input.brandId,
          active: input.active,
          featured: input.featured,
          sortOrder: input.sortOrder,
          price: simplePrice !== null && simplePrice !== undefined ? new Prisma.Decimal(simplePrice) : undefined,
          salePrice: simpleSalePrice !== null && simpleSalePrice !== undefined ? new Prisma.Decimal(simpleSalePrice) : undefined,
          stock: simpleStock,
          stockStatus: simpleStockStatus,
        },
      });

      // Categories re-linking
      if (input.categoryIds !== undefined) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (input.categoryIds.length > 0) {
          await tx.productCategory.createMany({
            data: input.categoryIds.map((categoryId) => ({
              productId: id,
              categoryId,
            })),
          });
        }
      }

      // Media re-linking
      if (input.media !== undefined) {
        const normalizedMedia = this.normalizeMediaAttachments(input.media);
        await tx.mediaAttachment.deleteMany({ where: { productId: id } });
        if (normalizedMedia.length > 0) {
          await tx.mediaAttachment.createMany({
            data: normalizedMedia.map((m) => ({
              mediaId: m.mediaId,
              productId: id,
              isThumbnail: m.isThumbnail,
              isGallery: m.isGallery,
              sortOrder: m.sortOrder,
            })),
          });
        }
      }
    });

    return this.getProductById(id, baseUrl);
  }

  async deleteProduct(id: string): Promise<void> {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    // Delete product record (cascades variants, categories, and media attachments cleanly while keeping Media assets)
    await prisma.product.delete({ where: { id } });
  }
}
