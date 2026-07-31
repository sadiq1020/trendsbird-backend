import bcrypt from 'bcrypt';
import { AppError } from '../../common/middlewares/error-handler';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken,
} from '../../common/utils/token';
import { prisma } from '../../prisma/client';
import { AuthLoginResponse, AuthRefreshResponse, AuthSessionUser } from './auth.interface';
import { LoginInput } from './auth.schema';

export class AuthService {
  async login(input: LoginInput): Promise<AuthLoginResponse> {
    const user = await prisma.user.findFirst({
      where: { email: { equals: input.email, mode: 'insensitive' } },
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

    // Uniform error for wrong email, wrong password, or inactive user (never reveal specific failure reason)
    if (!user || !user.active) {
      throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }

    if (!user.role || !user.role.status) {
      throw new AppError('Account role is inactive or invalid', 401, 'UNAUTHORIZED');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.name);

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
    });

    const refreshToken = generateRefreshToken({
      sub: user.id,
      tokenId: crypto.randomUUID(),
    });

    const tokenHash = hashToken(refreshToken);

    // Save refresh token record in DB for revocation tracking & token rotation
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    const sessionUser: AuthSessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      avatar: user.avatar,
      role: user.role.name,
      permissions,
    };

    return {
      user: sessionUser,
      accessToken,
      refreshToken,
    };
  }

  async refresh(rawRefreshToken: string): Promise<AuthRefreshResponse> {
    if (!rawRefreshToken) {
      throw new AppError('Refresh token is required', 401, 'UNAUTHORIZED');
    }

    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');
    }

    const tokenHash = hashToken(rawRefreshToken);

    const dbToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!dbToken || dbToken.revoked || dbToken.expiresAt < new Date()) {
      throw new AppError('Refresh token is invalid, revoked, or expired', 401, 'UNAUTHORIZED');
    }

    if (!dbToken.user || !dbToken.user.active || !dbToken.user.role || !dbToken.user.role.status) {
      throw new AppError('User account is inactive or invalid', 401, 'UNAUTHORIZED');
    }

    // Token Rotation: Invalidate the old refresh token
    await prisma.refreshToken.update({
      where: { id: dbToken.id },
      data: { revoked: true },
    });

    // Issue new access and refresh tokens
    const newAccessToken = generateAccessToken({
      sub: dbToken.user.id,
      email: dbToken.user.email,
      roleId: dbToken.user.roleId,
    });

    const newRefreshToken = generateRefreshToken({
      sub: dbToken.user.id,
      tokenId: crypto.randomUUID(),
    });

    const newTokenHash = hashToken(newRefreshToken);

    await prisma.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId: dbToken.user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revoked: true },
      });
    }
  }

  async getSession(userId: string): Promise<AuthSessionUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user || !user.active || !user.role || !user.role.status) {
      throw new AppError('Session invalid or account inactive', 401, 'UNAUTHORIZED');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.name);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      avatar: user.avatar,
      role: user.role.name,
      permissions,
    };
  }
}
