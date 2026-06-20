import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
