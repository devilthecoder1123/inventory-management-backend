import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

async function bootstrap() {
  const app = createApp();

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 IMS API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err);
  process.exit(1);
});
