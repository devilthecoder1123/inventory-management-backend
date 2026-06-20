import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { isProd } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  // Prisma known errors -> friendly messages
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return res.status(409).json({ success: false, message: `A record with this ${target} already exists` });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ success: false, message: 'Related record does not exist' });
    }
  }

  // eslint-disable-next-line no-console
  console.error('[Unhandled Error]', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(isProd ? {} : { error: err instanceof Error ? err.message : String(err) }),
  });
}
