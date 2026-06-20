import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: required('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/ims?schema=public'),
  jwtSecret: required('JWT_SECRET', 'change-me-in-production'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
};

export const isProd = env.nodeEnv === 'production';
