import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';

// Stub for Auth Guard — will verify access token cookie in Auth module step
export const authGuard = (req: Request, res: Response, next: NextFunction): void => {
  // Prototype stub for initial scaffolding
  next();
};
