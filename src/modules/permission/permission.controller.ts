import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response';
import { ListPermissionGroupsQuery } from './permission.schema';
import { PermissionService } from './permission.service';

const permissionService = new PermissionService();

export class PermissionController {
  async createGroup(req: Request, res: Response): Promise<Response> {
    const group = await permissionService.createGroup(req.body);
    return sendSuccess(res, 201, 'Permission group created', group);
  }

  async listGroups(req: Request, res: Response): Promise<Response> {
    const query = req.query as unknown as ListPermissionGroupsQuery;
    const result = await permissionService.listGroups(query);
    return sendSuccess(res, 200, 'Permission groups fetched', result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }

  async getGroup(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const group = await permissionService.getGroupById(id);
    return sendSuccess(res, 200, 'Permission group fetched', group);
  }

  async updateGroup(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const group = await permissionService.updateGroup(id, req.body);
    return sendSuccess(res, 200, 'Permission group updated', group);
  }

  async addActions(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const group = await permissionService.addActions(id, req.body);
    return sendSuccess(res, 200, 'Actions added to permission group', group);
  }

  async removeAction(req: Request, res: Response): Promise<Response> {
    const { id, permissionId } = req.params as { id: string; permissionId: string };
    await permissionService.removeAction(id, permissionId);
    return sendSuccess(res, 200, 'Permission removed from group');
  }

  async deleteGroup(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    await permissionService.deleteGroup(id);
    return sendSuccess(res, 200, 'Permission group deleted');
  }
}