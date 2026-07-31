import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';
import { verifyAccessToken } from '../utils/token';
import { prisma } from '../../prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roleId: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

const PUBLIC_PATHS = [
  '/',
  '/api/v1/health',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
];

export const authGuard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Opt-out check for public routes and static assets
    if (PUBLIC_PATHS.includes(req.path) || req.path.startsWith('/uploads')) {
      return next();
    }

    // Extract access token from HttpOnly cookie or Authorization Bearer header
    let token: string | undefined = req.cookies?.accessToken;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Unauthorized: Access token missing', 401, 'UNAUTHORIZED');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new AppError('Unauthorized: Access token invalid or expired', 401, 'UNAUTHORIZED');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
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

    if (!user || !user.active) {
      throw new AppError('Unauthorized: User account is inactive or invalid', 401, 'UNAUTHORIZED');
    }

    if (!user.role || !user.role.status) {
      throw new AppError('Unauthorized: User role is inactive or invalid', 401, 'UNAUTHORIZED');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.name);

    req.user = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      role: user.role.name,
      permissions,
    };

    next();
  } catch (error) {
    next(error);
  }
};
