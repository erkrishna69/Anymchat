import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import locationRoutes from './location/location.routes';
import feedRoutes from './feed/feed.routes';
import directRoutes from './direct/direct.routes';
import presenceRoutes from './presence/presence.routes';
import safetyRoutes from './safety/safety.routes';
import referralRoutes from './referral/referral.routes';
import { archiveRoutes } from './archive/archive.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/location', locationRoutes);
apiRouter.use('/feed', feedRoutes);
apiRouter.use('/direct', directRoutes);
apiRouter.use('/presence', presenceRoutes);
apiRouter.use('/safety', safetyRoutes);
apiRouter.use('/referrals', referralRoutes);
apiRouter.use('/archive', archiveRoutes);


import { getMongoConnectionStatus } from '../config/database/mongo.config';
import { getRedisStatus } from '../config/redis/redis.config';
import { GoogleDriveService } from '../services/archive/gdrive.service';
import { ENV } from '../config/env/env.config';

// Liveness Probe (process is alive and running)
apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    appName: 'AnymChat Backend',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness Probe (database & cache connection health for Load Balancer routing)
apiRouter.get('/ready', (req, res) => {
  const mongoOk = getMongoConnectionStatus();
  const redisOk = getRedisStatus();
  const isHealthy = mongoOk || redisOk; // Can serve in fallback mode if one is active

  res.status(isHealthy ? 200 : 503).json({
    ready: isHealthy,
    storage: {
      mongodb: {
        connected: mongoOk,
        mode: mongoOk ? 'primary_persistence' : 'in_memory_fallback',
      },
      redis: {
        connected: redisOk,
        mode: redisOk ? 'cluster_cache' : 'in_memory_cache_fallback',
      },
    },
    features: {
      messageTtlHours: ENV.MESSAGE_TTL_SECONDS / 3600,
      archivalEnabled: ENV.ARCHIVE_ENABLED,
      googleDriveConfigured: GoogleDriveService.isConfigured(),
    },
    timestamp: new Date().toISOString(),
  });
});

import { MetricsService } from '../services/metrics/metrics.service';

// Metrics Probe (Operational telemetry and Prometheus-friendly diagnostics)
apiRouter.get('/metrics', (req, res) => {
  res.status(200).json({
    success: true,
    data: MetricsService.getMetrics(),
  });
});

export default apiRouter;

