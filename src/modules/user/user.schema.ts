import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.string().uuid('Invalid role ID'),
  phone: z.string().optional(),
  gender: z.string().optional(),
  avatar: z.string().optional(),
  active: z.boolean().default(true),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
