import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';

type Target = 'body' | 'query' | 'params';

/** Validates a request segment against a Zod schema and replaces it with the parsed value. */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      throw ApiError.badRequest('Validation failed', details);
    }
    // Reassign parsed (and coerced) values.
    req[target] = result.data as never;
    next();
  };
}
