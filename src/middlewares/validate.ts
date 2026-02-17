import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { badRequest } from './errorHandler';

type ValidationTarget = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[target];
      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        const errors = formatZodErrors(result.error);
        throw badRequest(`Validation error: ${errors}`);
      }

      // Replace the request data with parsed (and transformed) data
      req[target] = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

const formatZodErrors = (error: ZodError): string => {
  return error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join(', ');
};
