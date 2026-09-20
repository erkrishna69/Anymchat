import http from 'http';
import { createApp } from './app';
import { setupSocketServer } from './sockets/server/socketServer';
import { connectMongoDB } from './config/database/mongo.config';
import { connectRedis, disconnectRedis } from './config/redis/redis.config';
import { startHourlyArchiveCron, stopHourlyArchiveCron } from './jobs/hourlyArchive.cron';
import { ENV } from './config/env/env.config';
import { Logger } from './utils/logger/logger.util';
import { OrbitEngine } from './ai';
import { SafetyService } from './services/safety/safety.service';

async function bootstrap() {
  Logger.info('Starting AnymChat Backend Service...');

  // 1. Primary Database Connection (MongoDB with automatic fallback)
  const mongoConnected = await connectMongoDB();

  // 2. Redis Caching & Ultra-Low-Latency Layer
  const redisConnected = await connectRedis();

  // 3. Reset in-memory timeouts on restart
  SafetyService.clearAllTimeouts();

  // 4. Initialize Orbit AI Safety & PII Moderation Engine
  OrbitEngine.initialize();

  // 5. Start Automated 1-Hour Chat Archival Background Worker
  startHourlyArchiveCron();

  // 6. Create Express App
  const app = createApp();
  const httpServer = http.createServer(app);

  // 7. Setup Socket.IO Server
  setupSocketServer(httpServer);

  // 8. Listen
  httpServer.listen(ENV.PORT, () => {
    Logger.info(`AnymChat server listening on port ${ENV.PORT}`);
    Logger.info(`Proximity default range: ${ENV.DEFAULT_RADIUS_KM} KM`);
    Logger.info(`Message 24-Hour Ephemeral Retention: Active (${ENV.MESSAGE_TTL_SECONDS}s)`);
    Logger.info(`Health check: http://localhost:${ENV.PORT}/api/health`);
    
    if (mongoConnected && redisConnected) {
      Logger.info('All set');
    }
  });

  // Handle termination signals
  const shutdown = async () => {
    Logger.info('Shutting down server gracefully...');
    stopHourlyArchiveCron();
    await disconnectRedis();
    httpServer.close(() => {
      Logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}


bootstrap().catch((err) => {
  Logger.error('Fatal bootstrapping error:', err);
  process.exit(1);
});
