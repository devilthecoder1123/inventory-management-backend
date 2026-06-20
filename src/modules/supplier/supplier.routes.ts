import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
} from './supplier.controller';
import { createSupplierSchema, updateSupplierSchema } from './supplier.schema';

const router = Router();

router.use(authenticate);

router.get('/', listSuppliers);
router.get('/:id', getSupplier);
router.post('/', validate(createSupplierSchema), createSupplier);
router.put('/:id', validate(updateSupplierSchema), updateSupplier);
router.delete('/:id', authorize('ADMIN'), deleteSupplier);

export default router;
