import { PermissionDto } from '../permission/permission.interface';

export interface RoleDto {
  id: string;
  name: string;
  description?: string | null;
  status: boolean;
  userCount?: number;
  permissions: PermissionDto[];
  createdAt: Date;
  updatedAt: Date;
}
