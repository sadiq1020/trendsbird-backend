import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  roleId: z.string().uuid('Invalid role ID'),
  phone: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  avatar: z.string().trim().optional(),
  active: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  email: z.string().trim().email('Invalid email address').optional(),
  password: z.string().min(6).max(100).optional(),
  roleId: z.string().uuid('Invalid role ID').optional(),
  phone: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  avatar: z.string().trim().optional(),
  active: z.boolean().optional(),
});

export const userIdParamsSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});

export const listUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  roleId: z.string().uuid().optional(),
  active: z
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

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
