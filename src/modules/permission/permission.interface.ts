import { STANDARD_ACTIONS } from './permission.schema';

export type StandardAction = (typeof STANDARD_ACTIONS)[number];

export interface PermissionDto {
  id: string;
  name: string;
  description?: string | null;
  groupId: string;
}

export interface PermissionGroupDto {
  id: string;
  name: string;
  description?: string | null;
  permissions: PermissionDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}