import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, 'Role name must be at least 2 characters').max(50),
  description: z.string().trim().max(255).optional(),
  status: z.boolean().optional().default(true),
  permissionIds: z.array(z.string().uuid('Invalid permission ID')).optional().default([]),
  grantAll: z.boolean().optional().default(false),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  description: z.string().trim().max(255).optional(),
  status: z.boolean().optional(),
  permissionIds: z.array(z.string().uuid('Invalid permission ID')).optional(),
  grantAll: z.boolean().optional(),
});

export const addRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid('Invalid permission ID')).min(1, 'Provide at least one permission ID'),
});

export const roleIdParamsSchema = z.object({
  id: z.string().uuid('Invalid role ID'),
});

export const rolePermissionParamsSchema = z.object({
  id: z.string().uuid('Invalid role ID'),
  permissionId: z.string().uuid('Invalid permission ID'),
});

export const listRolesQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AddRolePermissionsInput = z.infer<typeof addRolePermissionsSchema>;
export type ListRolesQuery = z.infer<typeof listRolesQuerySchema>;
