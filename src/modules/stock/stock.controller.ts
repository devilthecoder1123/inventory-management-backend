import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { CreateMovementInput, ListMovementQuery } from './stock.schema';

/**
 * Records a stock movement and atomically updates the product quantity.
 *  - IN          => quantity increases by |quantity|
 *  - OUT         => quantity decreases by |quantity| (cannot go below zero)
 *  - ADJUSTMENT  => sets the absolute new quantity to |quantity|
 */
export const createMovement = asyncHandler(async (req: Request, res: Response) => {
  const { productId, type, quantity, note } = req.body as CreateMovementInput;
  const userId = req.user!.id;

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');

    let newQuantity: number;
    let recordedQty: number;

    if (type === 'IN') {
      recordedQty = Math.abs(quantity);
      newQuantity = product.quantity + recordedQty;
    } else if (type === 'OUT') {
      recordedQty = Math.abs(quantity);
      newQuantity = product.quantity - recordedQty;
      if (newQuantity < 0) {
        throw ApiError.badRequest(
          `Insufficient stock. Available: ${product.quantity}, requested: ${recordedQty}`,
        );
      }
    } else {
      // ADJUSTMENT: quantity is the new absolute value
      recordedQty = Math.abs(quantity);
      newQuantity = recordedQty;
    }

    const movement = await tx.stockMovement.create({
      data: { productId, type, quantity: recordedQty, note: note ?? null, userId },
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, sku: true } },
      },
    });

    await tx.product.update({ where: { id: productId }, data: { quantity: newQuantity } });

    return { movement, newQuantity };
  });

  res.status(201).json({ success: true, data: result.movement, meta: { newQuantity: result.newQuantity } });
});

export const listMovements = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as ListMovementQuery;

  const where: Prisma.StockMovementWhereInput = {};
  if (q.productId) where.productId = q.productId;
  if (q.type) where.type = q.type;

  const skip = (q.page - 1) * q.limit;

  const [total, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: q.limit,
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, sku: true } },
      },
    }),
  ]);

  res.json({
    success: true,
    data: movements,
    meta: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) || 1 },
  });
});
