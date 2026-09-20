import { ServerOptions } from 'socket.io';
import { ENV } from '../env/env.config';

export const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
};
