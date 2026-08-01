import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response';
import { ListBrandQuery } from './brand.schema';
import { BrandService } from './brand.service';

const brandService = new BrandService();

export class BrandController {
  async createBrand(req: Request, res: Response): Promise<Response> {
    const brand = await brandService.createBrand(req.body);
    return sendSuccess(res, 201, 'Brand created successfully', brand);
  }

  async listBrands(req: Request, res: Response): Promise<Response> {
    const query = req.query as unknown as ListBrandQuery;
    const result = await brandService.listBrands(query);

    return sendSuccess(res, 200, 'Brands fetched successfully', result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }

  async getBrand(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const brand = await brandService.getBrandById(id);
    return sendSuccess(res, 200, 'Brand fetched successfully', brand);
  }

  async updateBrand(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const brand = await brandService.updateBrand(id, req.body);
    return sendSuccess(res, 200, 'Brand updated successfully', brand);
  }

  async deleteBrand(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    await brandService.deleteBrand(id);
    return sendSuccess(res, 200, 'Brand deleted successfully');
  }
}
