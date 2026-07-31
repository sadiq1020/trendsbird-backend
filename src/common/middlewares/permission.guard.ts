import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';

export const permissionGuard = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Unauthorized: Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
      return next(
        new AppError(
          `Forbidden: You do not have permission '${requiredPermission}'`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};
