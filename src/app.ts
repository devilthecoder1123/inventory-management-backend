import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProd } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import routes from './routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(isProd ? 'combined' : 'dev'));

  // Basic rate limiting to protect the API.
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get('/', (_req, res) => {
    res.json({ success: true, message: 'Inventory Management System API', docs: '/api/health' });
  });

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
