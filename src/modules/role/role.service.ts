import { Prisma } from '@prisma/client';
import { AppError } from '../../common/middlewares/error-handler';
import { prisma } from '../../prisma/client';
import { PaginatedResult } from '../permission/permission.interface';
import { RoleDto } from './role.interface';
import {
  AddRolePermissionsInput,
  CreateRoleInput,
  ListRolesQuery,
  UpdateRoleInput,
} from './role.schema';

export class RoleService {
  /**
   * Helper method to ensure at least one active role in the system retains `role:update`.
   * Prevents system lockout where nobody can manage roles.
   */
  private async validateRoleUpdateGuard(
    targetRoleId: string,
    action: 'deactivate' | 'remove_permission' | 'delete'
  ): Promise<void> {
    // Find the ID of the 'role:update' permission in the system if it exists
    const roleUpdatePermission = await prisma.permission.findUnique({
      where: { name: 'role:update' },
    });

    if (!roleUpdatePermission) {
      // If the permission doesn't exist in DB yet, guard passes
      return;
    }

    // Find all active roles (other than targetRoleId if deactivating/deleting) that hold 'role:update'
    const remainingActiveRolesWithPermission = await prisma.role.count({
      where: {
        status: true,
        id: action === 'deactivate' || action === 'delete' ? { not: targetRoleId } : undefined,
        permissions: {
          some: {
            permissionId: roleUpdatePermission.id,
            // If action is remove_permission on this targetRoleId, ignore this targetRoleId's link
            ...(action === 'remove_permission' ? { roleId: { not: targetRoleId } } : {}),
          },
        },
      },
    });

    if (remainingActiveRolesWithPermission === 0) {
      throw new AppError(
        'Action refused: This operation would leave no active role in the system capable of managing roles (lacking role:update permission)',
        409,
        'CONFLICT_ERROR'
      );
    }
  }

  async createRole(input: CreateRoleInput): Promise<RoleDto> {
    const existingRole = await prisma.role.findFirst({
      where: { name: { equals: input.name, mode: 'insensitive' } },
    });
    if (existingRole) {
      throw new AppError(`A role named "${input.name}" already exists`, 409, 'CONFLICT_ERROR');
    }

    let targetPermissionIds: string[] = input.permissionIds || [];

    if (input.grantAll) {
      const allPermissions = await prisma.permission.findMany({ select: { id: true } });
      targetPermissionIds = allPermissions.map((p) => p.id);
    } else if (targetPermissionIds.length > 0) {
      const validPermissions = await prisma.permission.findMany({
        where: { id: { in: targetPermissionIds } },
        select: { id: true },
      });
      if (validPermissions.length !== targetPermissionIds.length) {
        throw new AppError('One or more provided permission IDs do not exist', 422, 'VALIDATION_ERROR');
      }
    }

    const createdRoleId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdRole = await tx.role.create({
        data: {
          name: input.name,
          description: input.description,
          status: input.status,
        },
      });

      if (targetPermissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: targetPermissionIds.map((permissionId) => ({
            roleId: createdRole.id,
            permissionId,
          })),
        });
      }

      return createdRole.id;
    });

    return this.getRoleById(createdRoleId);
  }

  async listRoles(query: ListRolesQuery): Promise<PaginatedResult<RoleDto>> {
    const { search, status, page, limit } = query;
    const where: Prisma.RoleWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (status !== undefined) {
      where.status = status;
    }

    const [rawRoles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        include: {
          permissions: {
            include: { permission: true },
          },
          _count: {
            select: { users: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.role.count({ where }),
    ]);

    const items: RoleDto[] = rawRoles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      status: role.status,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getRoleById(id: string): Promise<RoleDto> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new AppError('Role not found', 404, 'NOT_FOUND');
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      status: role.status,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async updateRole(id: string, input: UpdateRoleInput): Promise<RoleDto> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new AppError('Role not found', 404, 'NOT_FOUND');
    }

    if (input.name && input.name.toLowerCase() !== role.name.toLowerCase()) {
      const existing = await prisma.role.findFirst({
        where: { name: { equals: input.name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) {
        throw new AppError(`A role named "${input.name}" already exists`, 409, 'CONFLICT_ERROR');
      }
    }

    // Check guard if deactivating role
    if (input.status === false && role.status === true) {
      await this.validateRoleUpdateGuard(id, 'deactivate');
    }

    let targetPermissionIds: string[] | undefined = input.permissionIds;

    if (input.grantAll) {
      const allPermissions = await prisma.permission.findMany({ select: { id: true } });
      targetPermissionIds = allPermissions.map((p) => p.id);
    }

    if (targetPermissionIds !== undefined) {
      // Check if updating permissions removes role:update from this role
      const roleUpdatePermission = await prisma.permission.findUnique({
        where: { name: 'role:update' },
      });

      if (roleUpdatePermission) {
        const currentlyHasRoleUpdate = role.permissions.some(
          (rp) => rp.permissionId === roleUpdatePermission.id
        );
        const willHaveRoleUpdate = targetPermissionIds.includes(roleUpdatePermission.id);

        if (currentlyHasRoleUpdate && !willHaveRoleUpdate) {
          await this.validateRoleUpdateGuard(id, 'remove_permission');
        }
      }

      if (targetPermissionIds.length > 0) {
        const validPermissions = await prisma.permission.findMany({
          where: { id: { in: targetPermissionIds } },
          select: { id: true },
        });
        if (validPermissions.length !== targetPermissionIds.length) {
          throw new AppError('One or more provided permission IDs do not exist', 422, 'VALIDATION_ERROR');
        }
      }
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.role.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          status: input.status,
        },
      });

      if (targetPermissionIds !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (targetPermissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: targetPermissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
          });
        }
      }
    });

    return this.getRoleById(id);
  }

  async addPermissions(id: string, input: AddRolePermissionsInput): Promise<RoleDto> {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new AppError('Role not found', 404, 'NOT_FOUND');
    }

    const validPermissions = await prisma.permission.findMany({
      where: { id: { in: input.permissionIds } },
      select: { id: true },
    });
    if (validPermissions.length !== input.permissionIds.length) {
      throw new AppError('One or more provided permission IDs do not exist', 422, 'VALIDATION_ERROR');
    }

    const existingRolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: id, permissionId: { in: input.permissionIds } },
      select: { permissionId: true },
    });
    const existingIds = new Set(existingRolePermissions.map((rp) => rp.permissionId));
    const newPermissionIds = input.permissionIds.filter((pId) => !existingIds.has(pId));

    if (newPermissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: newPermissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
      });
    }

    return this.getRoleById(id);
  }

  async removePermission(roleId: string, permissionId: string): Promise<RoleDto> {
    const rolePermission = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
      include: { permission: true },
    });

    if (!rolePermission) {
      throw new AppError('Permission is not assigned to this role', 404, 'NOT_FOUND');
    }

    if (rolePermission.permission.name === 'role:update') {
      await this.validateRoleUpdateGuard(roleId, 'remove_permission');
    }

    await prisma.rolePermission.delete({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });

    return this.getRoleById(roleId);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
        permissions: { include: { permission: true } },
      },
    });

    if (!role) {
      throw new AppError('Role not found', 404, 'NOT_FOUND');
    }

    if (role._count.users > 0) {
      throw new AppError(
        `Refusing to delete role: ${role._count.users} user(s) are currently assigned to this role`,
        409,
        'CONFLICT_ERROR'
      );
    }

    const hasRoleUpdate = role.permissions.some((rp) => rp.permission.name === 'role:update');
    if (hasRoleUpdate) {
      await this.validateRoleUpdateGuard(id, 'delete');
    }

    await prisma.role.delete({ where: { id } });
  }
}
