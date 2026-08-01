import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response';
import { ListProductQuery } from './product.schema';
import { ProductService } from './product.service';

const productService = new ProductService();

const getBaseUrl = (req: Request): string => {
  return `${req.protocol}://${req.get('host')}`;
};

export class ProductController {
  async createProduct(req: Request, res: Response): Promise<Response> {
    const baseUrl = getBaseUrl(req);
    const product = await productService.createProduct(req.body, baseUrl);
    return sendSuccess(res, 201, 'Product created successfully', product);
  }

  async listProducts(req: Request, res: Response): Promise<Response> {
    const query = req.query as unknown as ListProductQuery;
    const baseUrl = getBaseUrl(req);
    const result = await productService.listProducts(query, baseUrl);

    return sendSuccess(res, 200, 'Products fetched successfully', result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }

  async getProduct(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const baseUrl = getBaseUrl(req);
    const product = await productService.getProductById(id, baseUrl);
    return sendSuccess(res, 200, 'Product fetched successfully', product);
  }

  async updateProduct(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const baseUrl = getBaseUrl(req);
    const product = await productService.updateProduct(id, req.body, baseUrl);
    return sendSuccess(res, 200, 'Product updated successfully', product);
  }

  async deleteProduct(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    await productService.deleteProduct(id);
    return sendSuccess(res, 200, 'Product deleted successfully');
  }
}
