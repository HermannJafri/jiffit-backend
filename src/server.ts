import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { prisma } from './config/database';
import { assertProductionOtpSafety, env } from './config/env';
import { logger } from './utils/logger';

assertProductionOtpSafety();

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.ALLOWED_ORIGINS, credentials: true },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    next(new Error('UNAUTHENTICATED'));
    return;
  }
  next();
});

async function start() {
  await prisma.$connect();
  server.listen(env.PORT, () => {
    logger.info(`Jiffit API listening on :${env.PORT}`);
  });
}

start().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
