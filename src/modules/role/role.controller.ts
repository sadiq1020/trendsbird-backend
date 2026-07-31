import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response';
import { ListRolesQuery } from './role.schema';
import { RoleService } from './role.service';

const roleService = new RoleService();

export class RoleController {
  async createRole(req: Request, res: Response): Promise<Response> {
    const role = await roleService.createRole(req.body);
    return sendSuccess(res, 201, 'Role created successfully', role);
  }

  async listRoles(req: Request, res: Response): Promise<Response> {
    const query = req.query as unknown as ListRolesQuery;
    const result = await roleService.listRoles(query);
    return sendSuccess(res, 200, 'Roles fetched successfully', result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }

  async getRole(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const role = await roleService.getRoleById(id);
    return sendSuccess(res, 200, 'Role fetched successfully', role);
  }

  async updateRole(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const role = await roleService.updateRole(id, req.body);
    return sendSuccess(res, 200, 'Role updated successfully', role);
  }

  async addPermissions(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const role = await roleService.addPermissions(id, req.body);
    return sendSuccess(res, 200, 'Permissions added to role successfully', role);
  }

  async removePermission(req: Request, res: Response): Promise<Response> {
    const { id, permissionId } = req.params as { id: string; permissionId: string };
    const role = await roleService.removePermission(id, permissionId);
    return sendSuccess(res, 200, 'Permission removed from role successfully', role);
  }

  async deleteRole(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    await roleService.deleteRole(id);
    return sendSuccess(res, 200, 'Role deleted successfully');
  }
}
