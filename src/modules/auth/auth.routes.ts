import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { login, me, register } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, me);

export default router;
