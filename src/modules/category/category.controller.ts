import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response';
import { ListCategoryQuery } from './category.schema';
import { CategoryService } from './category.service';

const categoryService = new CategoryService();

export class CategoryController {
  async createCategory(req: Request, res: Response): Promise<Response> {
    const category = await categoryService.createCategory(req.body);
    return sendSuccess(res, 201, 'Category created successfully', category);
  }

  async listCategories(req: Request, res: Response): Promise<Response> {
    const query = req.query as unknown as ListCategoryQuery;
    const result = await categoryService.listCategories(query);

    return sendSuccess(res, 200, 'Categories fetched successfully', result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }

  async getCategoryTree(req: Request, res: Response): Promise<Response> {
    const tree = await categoryService.getCategoryTree();
    return sendSuccess(res, 200, 'Category tree fetched successfully', tree);
  }

  async getCategory(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const category = await categoryService.getCategoryById(id);
    return sendSuccess(res, 200, 'Category fetched successfully', category);
  }

  async updateCategory(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const category = await categoryService.updateCategory(id, req.body);
    return sendSuccess(res, 200, 'Category updated successfully', category);
  }

  async deleteCategory(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    await categoryService.deleteCategory(id);
    return sendSuccess(res, 200, 'Category deleted successfully');
  }
}
