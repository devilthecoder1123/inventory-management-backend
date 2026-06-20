import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import categoryRoutes from '../modules/category/category.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import productRoutes from '../modules/product/product.routes';
import stockRoutes from '../modules/stock/stock.routes';
import supplierRoutes from '../modules/supplier/supplier.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', service: 'ims-backend', time: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/products', productRoutes);
router.use('/stock-movements', stockRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
