import mongoose from 'mongoose';
import { ENV } from '../env/env.config';

let isMongoConnected = false;

export async function connectMongoDB(): Promise<boolean> {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(ENV.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isMongoConnected = true;
    const sanitizedUri = ENV.MONGO_URI.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
    console.log('Connected to MongoDB at:', sanitizedUri);
    return true;
  } catch (error: any) {
    console.warn('MongoDB connection not available (' + error.message + '). Operating in In-Memory High-Speed Cache Fallback Mode.');
    isMongoConnected = false;
    return false;
  }
}

export function getMongoConnectionStatus(): boolean {
  return isMongoConnected;
}
