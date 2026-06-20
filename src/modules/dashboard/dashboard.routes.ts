import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getAnalytics, getStats } from './dashboard.controller';

const router = Router();

router.use(authenticate);
router.get('/stats', getStats);
router.get('/analytics', getAnalytics);

export default router;
