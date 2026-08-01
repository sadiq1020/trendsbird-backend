import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response';
import { ListAttributeQuery } from './attribute.schema';
import { AttributeService } from './attribute.service';

const attributeService = new AttributeService();

export class AttributeController {
  async createAttribute(req: Request, res: Response): Promise<Response> {
    const attribute = await attributeService.createAttribute(req.body);
    return sendSuccess(res, 201, 'Attribute created successfully', attribute);
  }

  async listAttributes(req: Request, res: Response): Promise<Response> {
    const query = req.query as unknown as ListAttributeQuery;
    const result = await attributeService.listAttributes(query);

    return sendSuccess(res, 200, 'Attributes fetched successfully', result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }

  async getAttribute(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const attribute = await attributeService.getAttributeById(id);
    return sendSuccess(res, 200, 'Attribute fetched successfully', attribute);
  }

  async updateAttribute(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const attribute = await attributeService.updateAttribute(id, req.body);
    return sendSuccess(res, 200, 'Attribute updated successfully', attribute);
  }

  async addValues(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const attribute = await attributeService.addValues(id, req.body);
    return sendSuccess(res, 200, 'Attribute values added successfully', attribute);
  }

  async updateValue(req: Request, res: Response): Promise<Response> {
    const { id, valueId } = req.params as { id: string; valueId: string };
    const value = await attributeService.updateValue(id, valueId, req.body);
    return sendSuccess(res, 200, 'Attribute value updated successfully', value);
  }

  async deleteValue(req: Request, res: Response): Promise<Response> {
    const { id, valueId } = req.params as { id: string; valueId: string };
    await attributeService.deleteValue(id, valueId);
    return sendSuccess(res, 200, 'Attribute value deleted successfully');
  }

  async deleteAttribute(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    await attributeService.deleteAttribute(id);
    return sendSuccess(res, 200, 'Attribute deleted successfully');
  }
}
