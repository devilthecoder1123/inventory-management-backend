import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { JwtPayload, verifyToken } from '../utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Requires a valid Bearer token. Attaches the decoded user to req.user. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication token missing');
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

/** Restricts a route to the given roles. Use after authenticate. */
export function authorize(...roles: Array<'ADMIN' | 'STAFF'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  };
}
