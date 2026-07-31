import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response';
import { AppError } from '../../common/middlewares/error-handler';
import { ListMediaQuery } from './media.schema';
import { MediaService } from './media.service';

const mediaService = new MediaService();

const getBaseUrl = (req: Request): string => {
  return `${req.protocol}://${req.get('host')}`;
};

export class MediaController {
  async uploadFiles(req: Request, res: Response): Promise<Response> {
    const files = req.files as Express.Multer.File[] | undefined;
    const singleFile = req.file as Express.Multer.File | undefined;

    const fileList: Express.Multer.File[] = files || (singleFile ? [singleFile] : []);

    if (fileList.length === 0) {
      throw new AppError('No files uploaded', 400, 'VALIDATION_ERROR');
    }

    const uploadedById = req.user?.id;
    if (!uploadedById) {
      throw new AppError('Unauthorized user context missing', 401, 'UNAUTHORIZED');
    }

    const baseUrl = getBaseUrl(req);
    const media = await mediaService.processAndSaveUploads(fileList, uploadedById, baseUrl);

    return sendSuccess(
      res,
      201,
      `${media.length} file(s) uploaded and processed successfully`,
      media.length === 1 ? media[0] : media
    );
  }

  async listMedia(req: Request, res: Response): Promise<Response> {
    const query = req.query as unknown as ListMediaQuery;
    const baseUrl = getBaseUrl(req);
    const result = await mediaService.listMedia(query, baseUrl);

    return sendSuccess(res, 200, 'Media library assets fetched successfully', result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }

  async getMedia(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const baseUrl = getBaseUrl(req);
    const media = await mediaService.getMediaById(id, baseUrl);

    return sendSuccess(res, 200, 'Media asset fetched successfully', media);
  }

  async updateMediaMeta(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const baseUrl = getBaseUrl(req);
    const media = await mediaService.updateMediaMeta(id, req.body, baseUrl);

    return sendSuccess(res, 200, 'Media metadata updated successfully', media);
  }

  async deleteMedia(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    await mediaService.deleteMedia(id);

    return sendSuccess(res, 200, 'Media asset and stored files deleted successfully');
  }
}
