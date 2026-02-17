import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error(`[Error] ${statusCode} - ${message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export class ApiError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFound = (message = 'Resource not found'): ApiError => {
  return new ApiError(404, message);
};

export const badRequest = (message = 'Bad request'): ApiError => {
  return new ApiError(400, message);
};

export const unauthorized = (message = 'Unauthorized'): ApiError => {
  return new ApiError(401, message);
};

export const forbidden = (message = 'Forbidden'): ApiError => {
  return new ApiError(403, message);
};

export const conflict = (message = 'Conflict'): ApiError => {
  return new ApiError(409, message);
};
