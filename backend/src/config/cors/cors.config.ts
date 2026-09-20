import { CorsOptions } from 'cors';
import { ENV } from '../env/env.config';

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl) or localhost/specified origin
    if (!origin || origin.includes('localhost') || origin === ENV.CORS_ORIGIN) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for dev/local testing
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
