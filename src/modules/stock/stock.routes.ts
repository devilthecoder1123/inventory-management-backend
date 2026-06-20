import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createMovement, listMovements } from './stock.controller';
import { createMovementSchema, listMovementQuerySchema } from './stock.schema';

const router = Router();

router.use(authenticate);

router.get('/', validate(listMovementQuerySchema, 'query'), listMovements);
router.post('/', validate(createMovementSchema), createMovement);

export default router;
