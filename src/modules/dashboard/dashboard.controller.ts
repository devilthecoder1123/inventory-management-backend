import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler } from '../../utils/asyncHandler';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Format a Date as a UTC YYYY-MM-DD key. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Inclusive list of the last `days` day-keys, oldest first. */
function lastNDays(days: number): string[] {
  const keys: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

/**
 * Legacy summary endpoint (kept for backward compatibility).
 */
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

  const allProducts = await prisma.product.findMany({ select: { price: true, quantity: true } });
  const inventoryValue = allProducts.reduce((sum, p) => sum + Number(p.price) * p.quantity, 0);

  res.json({
    success: true,
    data: {
      totalProducts,
      totalCategories,
      totalSuppliers,
      totalStock: aggregates._sum.quantity ?? 0,
      inventoryValue: round2(inventoryValue),
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock,
      recentMovements,
    },
  });
});

/**
 * Rich analytics for the redesigned dashboard. Everything is derived from the
 * live database — products, categories, suppliers and the stock-movement ledger.
 */
export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const windowDays = Math.min(Math.max(parseInt(String(req.query.days ?? '30'), 10) || 30, 7), 90);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (windowDays - 1));
  since.setUTCHours(0, 0, 0, 0);

  const [products, categories, suppliers, windowMovements, recentMovements] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        quantity: true,
        reorderLevel: true,
        categoryId: true,
        supplierId: true,
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    }),
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.supplier.findMany({ select: { id: true, name: true } }),
    prisma.stockMovement.findMany({
      where: { createdAt: { gte: since } },
      select: { productId: true, type: true, quantity: true, createdAt: true },
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

  const priceById = new Map(products.map((p) => [p.id, Number(p.price)]));

  // ---- Summary + health ----
  let totalStock = 0;
  let inventoryValue = 0;
  let healthy = 0;
  let low = 0;
  let out = 0;
  for (const p of products) {
    totalStock += p.quantity;
    inventoryValue += Number(p.price) * p.quantity;
    if (p.quantity <= 0) out += 1;
    else if (p.quantity <= p.reorderLevel) low += 1;
    else healthy += 1;
  }
  const total = products.length || 1;
  // Healthy = 1.0, low = 0.5, out = 0.0 weighting.
  const score = Math.round(((healthy + low * 0.5) / total) * 100);
  const rating = score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor';

  // ---- Trends (units in/out per day + reconstructed value series) ----
  const dayKeys = lastNDays(windowDays);
  const indexByDay = new Map(dayKeys.map((k, i) => [k, i]));
  const series = dayKeys.map((date) => ({
    date,
    stockIn: 0,
    stockOut: 0,
    netUnits: 0,
    netValue: 0,
    value: 0,
  }));

  for (const m of windowMovements) {
    const i = indexByDay.get(dayKey(m.createdAt));
    if (i === undefined) continue;
    const price = priceById.get(m.productId) ?? 0;
    if (m.type === 'IN') {
      series[i].stockIn += m.quantity;
      series[i].netValue += price * m.quantity;
    } else if (m.type === 'OUT') {
      series[i].stockOut += m.quantity;
      series[i].netValue -= price * m.quantity;
    }
    // ADJUSTMENT stores an absolute level (delta unknown) — excluded from deltas.
  }

  // Reconstruct end-of-day inventory value backwards from the current value.
  let running = inventoryValue;
  for (let i = series.length - 1; i >= 0; i--) {
    series[i].netUnits = series[i].stockIn - series[i].stockOut;
    series[i].value = round2(running);
    running -= series[i].netValue;
  }
  const trendSeries = series.map((s) => ({
    date: s.date,
    stockIn: s.stockIn,
    stockOut: s.stockOut,
    netUnits: s.netUnits,
    value: s.value,
  }));

  // ---- Movers (by units shipped OUT in the window) ----
  const outByProduct = new Map<string, number>();
  for (const m of windowMovements) {
    if (m.type === 'OUT') outByProduct.set(m.productId, (outByProduct.get(m.productId) ?? 0) + m.quantity);
  }
  const withMovement = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    quantity: p.quantity,
    reorderLevel: p.reorderLevel,
    unitsOut: outByProduct.get(p.id) ?? 0,
  }));

  const fastMovers = [...withMovement]
    .filter((p) => p.unitsOut > 0)
    .sort((a, b) => b.unitsOut - a.unitsOut)
    .slice(0, 5);

  const slowMovers = [...withMovement]
    .filter((p) => p.quantity > 0)
    .sort((a, b) => a.unitsOut - b.unitsOut || b.quantity - a.quantity)
    .slice(0, 5);

  // ---- Critical alerts (out-of-stock first, then low) ----
  const criticalAlerts = products
    .filter((p) => p.quantity <= p.reorderLevel)
    .map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      quantity: p.quantity,
      reorderLevel: p.reorderLevel,
      severity: p.quantity <= 0 ? ('out' as const) : ('low' as const),
    }))
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'out' ? -1 : 1;
      return a.quantity - b.quantity;
    })
    .slice(0, 6);

  // ---- Category distribution (count + stock value) ----
  const catAgg = new Map<string, { id: string | null; name: string; productCount: number; stockValue: number }>();
  for (const c of categories) catAgg.set(c.id, { id: c.id, name: c.name, productCount: 0, stockValue: 0 });
  catAgg.set('__none__', { id: null, name: 'Uncategorized', productCount: 0, stockValue: 0 });
  for (const p of products) {
    const key = p.categoryId ?? '__none__';
    const bucket = catAgg.get(key) ?? catAgg.get('__none__')!;
    bucket.productCount += 1;
    bucket.stockValue += Number(p.price) * p.quantity;
  }
  const categoryDistribution = [...catAgg.values()]
    .filter((c) => c.productCount > 0)
    .map((c) => ({ ...c, stockValue: round2(c.stockValue) }))
    .sort((a, b) => b.stockValue - a.stockValue);

  // ---- Top suppliers (by stock value, then product count) ----
  const supAgg = new Map<string, { id: string; name: string; productCount: number; stockValue: number }>();
  for (const s of suppliers) supAgg.set(s.id, { id: s.id, name: s.name, productCount: 0, stockValue: 0 });
  for (const p of products) {
    if (!p.supplierId) continue;
    const bucket = supAgg.get(p.supplierId);
    if (!bucket) continue;
    bucket.productCount += 1;
    bucket.stockValue += Number(p.price) * p.quantity;
  }
  const topSuppliers = [...supAgg.values()]
    .map((s) => ({ ...s, stockValue: round2(s.stockValue) }))
    .sort((a, b) => b.stockValue - a.stockValue || b.productCount - a.productCount)
    .slice(0, 5);

  res.json({
    success: true,
    data: {
      generatedAt: new Date().toISOString(),
      windowDays,
      summary: {
        totalProducts: products.length,
        totalCategories: categories.length,
        totalSuppliers: suppliers.length,
        totalStock,
        inventoryValue: round2(inventoryValue),
        lowStockCount: low,
        outOfStockCount: out,
      },
      health: { score, rating, breakdown: { healthy, low, out } },
      trends: { days: windowDays, series: trendSeries },
      fastMovers,
      slowMovers,
      criticalAlerts,
      categoryDistribution,
      topSuppliers,
      recentMovements,
    },
  });
});
