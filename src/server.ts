import app from './app';
import { env } from './config/env';
import { prisma } from './prisma/client';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚠️ Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('🔒 Closed remaining HTTP connections.');
    await prisma.$disconnect();
    console.log('🔌 Disconnected Prisma Client.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
