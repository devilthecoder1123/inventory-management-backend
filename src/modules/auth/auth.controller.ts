import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { signToken } from '../../utils/jwt';
import { LoginInput, RegisterInput } from './auth.schema';

function publicUser(user: { id: string; name: string; email: string; role: 'ADMIN' | 'STAFF' }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body as RegisterInput;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role ?? 'STAFF' },
  });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.status(201).json({ success: true, data: { user: publicUser(user), token } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.json({ success: true, data: { user: publicUser(user), token } });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, data: publicUser(user) });
});
