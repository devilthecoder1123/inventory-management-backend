import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { CreateProductInput, ListProductQuery, UpdateProductInput } from './product.schema';

const productInclude = {
  category: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

/** Convert "" relation ids to null so Prisma disconnects them. */
function cleanRelations<T extends { categoryId?: unknown; supplierId?: unknown }>(data: T): T {
  if (data.categoryId === '') data.categoryId = null;
  if (data.supplierId === '') data.supplierId = null;
  return data;
}

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as ListProductQuery;

  const where: Prisma.ProductWhereInput = {};
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: 'insensitive' } },
      { sku: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  if (q.categoryId) where.categoryId = q.categoryId;
  if (q.supplierId) where.supplierId = q.supplierId;

  // "low stock" => quantity <= reorderLevel. Done via raw filter on two columns.
  if (q.lowStock) {
    where.quantity = { lte: prisma.product.fields.reorderLevel };
  }

  const skip = (q.page - 1) * q.limit;

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { [q.sortBy]: q.order },
      skip,
      take: q.limit,
    }),
  ]);

  res.json({
    success: true,
    data: products,
    meta: {
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.ceil(total / q.limit) || 1,
    },
  });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      ...productInclude,
      movements: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = cleanRelations(req.body as CreateProductInput);
  const product = await prisma.product.create({ data, include: productInclude });
  res.status(201).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = cleanRelations(req.body as UpdateProductInput);
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data,
    include: productInclude,
  });
  res.json({ success: true, data: product });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await prisma.product.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Product deleted' });
});
