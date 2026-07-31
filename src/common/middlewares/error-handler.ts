import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';
import { env } from '../../config/env';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_SERVER_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): Response => {
  // Handle Custom AppError
  if (err instanceof AppError) {
    if (env.NODE_ENV === 'development') {
      console.error(`[AppError] ${err.statusCode} - ${err.message}`);
    }
    return sendError(res, err.statusCode, err.message, err.code, err.details);
  }

  // Handle Zod Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    if (env.NODE_ENV === 'development') {
      console.error('[ValidationError]', formattedErrors);
    }
    return sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', formattedErrors);
  }

  if (env.NODE_ENV === 'development') {
    console.error(' Error Stack:', err.stack || err.message || err);
  }

  // Handle Prisma / Database Known Errors
  if (err.name === 'PrismaClientKnownRequestError') {
    // Unique constraint failed
    const prismaErr = err as { code?: string; meta?: { target?: string[] } };
    if (prismaErr.code === 'P2002') {
      const targets = prismaErr.meta?.target ? prismaErr.meta.target.join(', ') : 'field';
      return sendError(res, 409, `Duplicate entry for ${targets}`, 'CONFLICT_ERROR');
    }
    if (prismaErr.code === 'P2025') {
      return sendError(res, 404, 'Requested record not found', 'NOT_FOUND');
    }
  }

  // Generic fallback for unhandled exceptions (do not leak internal details)
  const isDev = env.NODE_ENV === 'development';
  return sendError(
    res,
    500,
    isDev ? err.message || 'Internal Server Error' : 'An unexpected error occurred on the server',
    'INTERNAL_SERVER_ERROR'
  );
};
