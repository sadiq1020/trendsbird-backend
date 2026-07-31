import { z } from 'zod';

export const createPermissionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  groupId: z.string().uuid('Invalid group ID'),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
