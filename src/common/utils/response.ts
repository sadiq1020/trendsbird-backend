import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    details?: unknown;
  };
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  meta?: Record<string, unknown>
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta !== undefined && { meta }),
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  code: string = 'ERROR',
  details?: unknown
): Response => {
  const payload: ApiResponse = {
    success: false,
    message,
    error: {
      code,
      ...(details !== undefined && { details }),
    },
  };
  return res.status(statusCode).json(payload);
};
