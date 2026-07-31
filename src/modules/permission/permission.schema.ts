import { z } from 'zod';

export const STANDARD_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'watch',
  'upload',
  'write',
  'approve',
  'status',
] as const;

const actionsField = z.array(z.enum(STANDARD_ACTIONS)).optional().default([]);
const customActionsField = z
  .array(z.string().trim().min(1, 'Custom action name cannot be empty').max(50))
  .optional()
  .default([]);

export const createPermissionGroupBodySchema = z.object({
  name: z.string().trim().min(2, 'Group name must be at least 2 characters').max(50),
  description: z.string().trim().max(255).optional(),
  actions: actionsField,
  customActions: customActionsField,
});

export const updatePermissionGroupBodySchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  description: z.string().trim().max(255).optional(),
});

export const addActionsBodySchema = z.object({
  actions: actionsField,
  customActions: customActionsField,
});

export const groupIdParamsSchema = z.object({
  id: z.string().uuid('Invalid group id'),
});

export const removeActionParamsSchema = z.object({
  id: z.string().uuid('Invalid group id'),
  permissionId: z.string().uuid('Invalid permission id'),
});

export const listPermissionGroupsQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreatePermissionGroupInput = z.infer<typeof createPermissionGroupBodySchema>;
export type UpdatePermissionGroupInput = z.infer<typeof updatePermissionGroupBodySchema>;
export type AddActionsInput = z.infer<typeof addActionsBodySchema>;
export type ListPermissionGroupsQuery = z.infer<typeof listPermissionGroupsQuerySchema>;