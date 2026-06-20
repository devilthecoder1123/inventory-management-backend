import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from './category.controller';
import { createCategorySchema, updateCategorySchema } from './category.schema';

const router = Router();

router.use(authenticate);

router.get('/', listCategories);
router.get('/:id', getCategory);
router.post('/', validate(createCategorySchema), createCategory);
router.put('/:id', validate(updateCategorySchema), updateCategory);
router.delete('/:id', authorize('ADMIN'), deleteCategory);

export default router;
