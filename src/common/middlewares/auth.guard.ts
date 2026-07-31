import { Request, Response, NextFunction } from 'express';

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

// Stub for Auth Guard — will verify access token cookie in Auth module step
export const authGuard = (req: Request, res: Response, next: NextFunction): void => {
  // Prototype stub for initial scaffolding
  next();
};
