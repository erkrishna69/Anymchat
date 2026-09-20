import express, { Application } from 'express';
import cors from 'cors';
import { corsConfig } from './config/cors/cors.config';
import apiRouter from './routes/api.router';
import { errorHandlerMiddleware } from './middlewares/error/errorHandler.middleware';

import { globalApiRateLimiter } from './middlewares/rateLimit/rateLimit.middleware';

export function createApp(): Application {
  const app = express();

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.removeHeader('X-Powered-By');
    next();
  });

  // Core Middlewares
  app.use(cors(corsConfig));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Root Greeting
  app.get('/', (req, res) => {
    res.json({
      name: 'AnymChat Realtime Proximity API',
      description: '10 KM Radius Anonymous Social Network',
      version: '1.0.0',
      radius: '10 KM',
      documentation: '/api/health',
    });
  });

  // API Domain Routes (Protected by Global Rate Limiter: max 120 req/min)
  app.use('/api', globalApiRateLimiter, apiRouter);

  // Global Error Handler
  app.use(errorHandlerMiddleware);

  return app;
}
