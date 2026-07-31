import { Prisma } from '@prisma/client';
import { AppError } from '../../common/middlewares/error-handler';
import { generateSlug } from '../../common/utils/slug';
import { prisma } from '../../prisma/client';
import { PaginatedResult, PermissionGroupDto } from './permission.interface';
import {
  AddActionsInput,
  CreatePermissionGroupInput,
  ListPermissionGroupsQuery,
  UpdatePermissionGroupInput,
} from './permission.schema';

/**
 * Normalises a group's display name plus its chosen standard/custom actions
 * into the final "module:action" permission strings, e.g. "Product" + create
 * => "product:create". Standard actions are already lowercase (enum-backed);
 * custom actions are slugified so "Bulk Export" becomes "bulk-export".
 */
const buildActionNames = (moduleKey: string, actions: string[], customActions: string[]): string[] => {
  const normalisedCustom = customActions.map((action) => generateSlug(action)).filter(Boolean);
  const uniqueActions = Array.from(new Set([...actions, ...normalisedCustom]));
  return uniqueActions.map((action) => `${moduleKey}:${action}`);
};

export class PermissionService {
  async createGroup(input: CreatePermissionGroupInput): Promise<PermissionGroupDto> {
    if (input.actions.length + input.customActions.length === 0) {
      throw new AppError('Select at least one action for this permission group', 422, 'VALIDATION_ERROR');
    }

    // Case-insensitive duplicate check: Postgres unique constraints are
    // case-sensitive by default, but "Product" and "product" would produce
    // the identical module:action prefix, so we guard against that here.
    const existingGroup = await prisma.permissionGroup.findFirst({
      where: { name: { equals: input.name, mode: 'insensitive' } },
    });
    if (existingGroup) {
      throw new AppError(`A permission group named "${input.name}" already exists`, 409, 'CONFLICT_ERROR');
    }

    const moduleKey = generateSlug(input.name);
    if (!moduleKey) {
      throw new AppError('Group name must contain at least one letter or number', 422, 'VALIDATION_ERROR');
    }

    const permissionNames = buildActionNames(moduleKey, input.actions, input.customActions);

    const duplicatePermissions = await prisma.permission.findMany({
      where: { name: { in: permissionNames } },
      select: { name: true },
    });
    if (duplicatePermissions.length > 0) {
      const names = duplicatePermissions.map((p: { name: string }) => p.name).join(', ');
      throw new AppError(`These permissions already exist: ${names}`, 409, 'CONFLICT_ERROR');
    }

    const createdGroupId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdGroup = await tx.permissionGroup.create({
        data: {
          name: input.name,
          description: input.description,
        },
      });

      await tx.permission.createMany({
        data: permissionNames.map((name) => ({ name, groupId: createdGroup.id })),
      });

      return createdGroup.id;
    });

    return this.getGroupById(createdGroupId);
  }

  async listGroups(query: ListPermissionGroupsQuery): Promise<PaginatedResult<PermissionGroupDto>> {
    const { search, page, limit } = query;
    const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {};

    const [items, total] = await Promise.all([
      prisma.permissionGroup.findMany({
        where,
        include: { permissions: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.permissionGroup.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getGroupById(id: string): Promise<PermissionGroupDto> {
    const group = await prisma.permissionGroup.findUnique({
      where: { id },
      include: { permissions: true },
    });
    if (!group) {
      throw new AppError('Permission group not found', 404, 'NOT_FOUND');
    }
    return group;
  }

  async updateGroup(id: string, input: UpdatePermissionGroupInput): Promise<PermissionGroupDto> {
    const group = await prisma.permissionGroup.findUnique({ where: { id } });
    if (!group) {
      throw new AppError('Permission group not found', 404, 'NOT_FOUND');
    }

    if (input.name && input.name.toLowerCase() !== group.name.toLowerCase()) {
      const existing = await prisma.permissionGroup.findFirst({
        where: { name: { equals: input.name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) {
        throw new AppError(`A permission group named "${input.name}" already exists`, 409, 'CONFLICT_ERROR');
      }
    }

    // Note: renaming a group does NOT retroactively rename its existing
    // "module:action" permission strings — those are already the source of
    // truth for routes and role assignments. Only new actions added after a
    // rename will use the new module key. This is documented as a known
    // design decision in the README rather than silently rewriting
    // permission names that roles already depend on.
    await prisma.permissionGroup.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
      },
    });

    return this.getGroupById(id);
  }

  async addActions(id: string, input: AddActionsInput): Promise<PermissionGroupDto> {
    if (input.actions.length + input.customActions.length === 0) {
      throw new AppError('Provide at least one action to add', 422, 'VALIDATION_ERROR');
    }

    const group = await prisma.permissionGroup.findUnique({ where: { id } });
    if (!group) {
      throw new AppError('Permission group not found', 404, 'NOT_FOUND');
    }

    const moduleKey = generateSlug(group.name);
    const permissionNames = buildActionNames(moduleKey, input.actions, input.customActions);

    const existingPermissions = await prisma.permission.findMany({
      where: { name: { in: permissionNames } },
      select: { name: true },
    });
    const existingNames = new Set(existingPermissions.map((p: { name: string }) => p.name));
    const newNames = permissionNames.filter((name) => !existingNames.has(name));

    if (newNames.length === 0) {
      throw new AppError('All requested actions already exist on this group', 409, 'CONFLICT_ERROR');
    }

    await prisma.permission.createMany({
      data: newNames.map((name) => ({ name, groupId: id })),
    });

    return this.getGroupById(id);
  }

  async removeAction(groupId: string, permissionId: string): Promise<void> {
    const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission || permission.groupId !== groupId) {
      throw new AppError('Permission not found in this group', 404, 'NOT_FOUND');
    }

    // Cascade decision (documented): deleting a permission also removes it
    // from every role that held it. RolePermission.permissionId has
    // onDelete: Cascade in the schema, so this delete alone cleans up all
    // role links automatically — a role is never left pointing at a
    // permission that no longer exists.
    await prisma.permission.delete({ where: { id: permissionId } });
  }

  async deleteGroup(id: string): Promise<void> {
    const group = await prisma.permissionGroup.findUnique({ where: { id } });
    if (!group) {
      throw new AppError('Permission group not found', 404, 'NOT_FOUND');
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Deleting every permission in the group cascades their RolePermission
      // links (schema-level cascade), then the now-empty group can be removed.
      await tx.permission.deleteMany({ where: { groupId: id } });
      await tx.permissionGroup.delete({ where: { id } });
    });
  }
}