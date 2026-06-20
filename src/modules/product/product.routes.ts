import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from './product.controller';
import {
  createProductSchema,
  listProductQuerySchema,
  updateProductSchema,
} from './product.schema';

const router = Router();

router.use(authenticate);

router.get('/', validate(listProductQuerySchema, 'query'), listProducts);
router.get('/:id', getProduct);
router.post('/', validate(createProductSchema), createProduct);
router.put('/:id', validate(updateProductSchema), updateProduct);
router.delete('/:id', authorize('ADMIN'), deleteProduct);

export default router;
