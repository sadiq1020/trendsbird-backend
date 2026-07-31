import { Request, Response, NextFunction } from 'express';

// Stub for Permission Guard — will enforce RBAC string permissions in subsequent steps
export const permissionGuard = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Prototype stub for initial scaffolding
    next();
  };
};
