import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response';
import { ListUsersQuery } from './user.schema';
import { UserService } from './user.service';

const userService = new UserService();

export class UserController {
  async createUser(req: Request, res: Response): Promise<Response> {
    const user = await userService.createUser(req.body);
    return sendSuccess(res, 201, 'User created successfully', user);
  }

  async listUsers(req: Request, res: Response): Promise<Response> {
    const query = req.query as unknown as ListUsersQuery;
    const result = await userService.listUsers(query);
    return sendSuccess(res, 200, 'Users fetched successfully', result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }

  async getUser(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const user = await userService.getUserById(id);
    return sendSuccess(res, 200, 'User fetched successfully', user);
  }

  async updateUser(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const currentUserId = req.user?.id;
    const user = await userService.updateUser(id, req.body, currentUserId);
    return sendSuccess(res, 200, 'User updated successfully', user);
  }

  async deleteUser(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const currentUserId = req.user?.id;
    await userService.deleteUser(id, currentUserId);
    return sendSuccess(res, 200, 'User deleted successfully');
  }
}
