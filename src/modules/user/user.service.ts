import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/middlewares/error-handler';
import { prisma } from '../../prisma/client';
import { PaginatedResult } from '../permission/permission.interface';
import { UserDto } from './user.interface';
import { CreateUserInput, ListUsersQuery, UpdateUserInput } from './user.schema';

export class UserService {
  private formatUserDto(user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    gender: string | null;
    avatar: string | null;
    active: boolean;
    roleId: string;
    role: {
      id: string;
      name: string;
      description: string | null;
      status: boolean;
      createdAt: Date;
      updatedAt: Date;
      permissions?: Array<{ permission: { id: string; name: string; description: string | null; groupId: string } }>;
    };
    createdAt: Date;
    updatedAt: Date;
  }): UserDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      avatar: user.avatar,
      active: user.active,
      roleId: user.roleId,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        status: user.role.status,
        permissions: user.role.permissions ? user.role.permissions.map((rp) => rp.permission) : [],
        createdAt: user.role.createdAt,
        updatedAt: user.role.updatedAt,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async createUser(input: CreateUserInput): Promise<UserDto> {
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: input.email, mode: 'insensitive' } },
    });
    if (existingUser) {
      throw new AppError(`A user with email "${input.email}" already exists`, 409, 'CONFLICT_ERROR');
    }

    const role = await prisma.role.findUnique({ where: { id: input.roleId } });
    if (!role) {
      throw new AppError('Specified role does not exist', 404, 'NOT_FOUND');
    }
    if (!role.status) {
      throw new AppError('Cannot assign an inactive role to a user', 422, 'VALIDATION_ERROR');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const createdUser = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        password: hashedPassword,
        roleId: input.roleId,
        phone: input.phone,
        gender: input.gender,
        avatar: input.avatar,
        active: input.active,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    return this.formatUserDto(createdUser);
  }

  async listUsers(query: ListUsersQuery): Promise<PaginatedResult<UserDto>> {
    const { search, roleId, active, page, limit } = query;
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (roleId) {
      where.roleId = roleId;
    }
    if (active !== undefined) {
      where.active = active;
    }

    const [rawUsers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const items: UserDto[] = rawUsers.map((u) => this.formatUserDto(u));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUserById(id: string): Promise<UserDto> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return this.formatUserDto(user);
  }

  async updateUser(id: string, input: UpdateUserInput, currentUserId?: string): Promise<UserDto> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Prevent self-escalation: A user cannot modify their own role or active status
    if (currentUserId === id) {
      if (input.roleId !== undefined && input.roleId !== user.roleId) {
        throw new AppError('Self-escalation prevented: You cannot change your own role', 403, 'FORBIDDEN');
      }
      if (input.active !== undefined && input.active !== user.active) {
        throw new AppError('Self-escalation prevented: You cannot change your own active status', 403, 'FORBIDDEN');
      }
    }

    if (input.email && input.email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await prisma.user.findFirst({
        where: { email: { equals: input.email, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) {
        throw new AppError(`A user with email "${input.email}" already exists`, 409, 'CONFLICT_ERROR');
      }
    }

    if (input.roleId) {
      const role = await prisma.role.findUnique({ where: { id: input.roleId } });
      if (!role) {
        throw new AppError('Specified role does not exist', 404, 'NOT_FOUND');
      }
      if (!role.status) {
        throw new AppError('Cannot assign an inactive role to a user', 422, 'VALIDATION_ERROR');
      }
    }

    const updateData: Prisma.UserUpdateInput = {
      name: input.name,
      email: input.email ? input.email.toLowerCase() : undefined,
      phone: input.phone,
      gender: input.gender,
      avatar: input.avatar,
      active: input.active,
      role: input.roleId ? { connect: { id: input.roleId } } : undefined,
    };

    if (input.password) {
      updateData.password = await bcrypt.hash(input.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    return this.formatUserDto(updatedUser);
  }

  async deleteUser(id: string, currentUserId?: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    if (currentUserId === id) {
      throw new AppError('Self-deletion prevented: You cannot delete your own user account', 403, 'FORBIDDEN');
    }

    // Hard delete user (RefreshToken records cascade automatically via schema definition)
    await prisma.user.delete({ where: { id } });
  }
}
