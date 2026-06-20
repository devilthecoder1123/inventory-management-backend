import { NextFunction, Request, Response } from 'express';

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps async route handlers so thrown errors are forwarded to the error middleware. */
export const asyncHandler =
  (fn: AsyncRoute) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
