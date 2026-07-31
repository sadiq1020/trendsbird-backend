import { RoleDto } from '../role/role.interface';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  avatar?: string | null;
  active: boolean;
  roleId: string;
  role: RoleDto;
  createdAt: Date;
  updatedAt: Date;
}
