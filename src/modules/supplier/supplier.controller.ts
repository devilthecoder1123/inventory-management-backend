import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { CreateSupplierInput, UpdateSupplierInput } from './supplier.schema';

function normalize<T extends { email?: string | null }>(data: T): T {
  if (data.email === '') data.email = null;
  return data;
}

export const listSuppliers = asyncHandler(async (_req: Request, res: Response) => {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json({ success: true, data: suppliers });
});

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { products: true } } },
  });
  if (!supplier) throw ApiError.notFound('Supplier not found');
  res.json({ success: true, data: supplier });
});

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const data = normalize(req.body as CreateSupplierInput);
  const supplier = await prisma.supplier.create({ data });
  res.status(201).json({ success: true, data: supplier });
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const data = normalize(req.body as UpdateSupplierInput);
  const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: supplier });
});

export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
  await prisma.supplier.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Supplier deleted' });
});
