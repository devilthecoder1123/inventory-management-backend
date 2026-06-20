import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler } from '../../utils/asyncHandler';

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [totalProducts, totalCategories, totalSuppliers, aggregates, lowStock, recentMovements] =
    await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.supplier.count(),
      prisma.product.aggregate({ _sum: { quantity: true } }),
      prisma.product.findMany({
        where: { quantity: { lte: prisma.product.fields.reorderLevel } },
        orderBy: { quantity: 'asc' },
        take: 10,
        include: { category: { select: { id: true, name: true } } },
      }),
      prisma.stockMovement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

  // Total inventory value = sum(price * quantity). Computed in JS to keep Decimal precision simple.
  const allProducts = await prisma.product.findMany({ select: { price: true, quantity: true } });
  const inventoryValue = allProducts.reduce(
    (sum, p) => sum + Number(p.price) * p.quantity,
    0,
  );

  res.json({
    success: true,
    data: {
      totalProducts,
      totalCategories,
      totalSuppliers,
      totalStock: aggregates._sum.quantity ?? 0,
      inventoryValue: Number(inventoryValue.toFixed(2)),
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock,
      recentMovements,
    },
  });
});
