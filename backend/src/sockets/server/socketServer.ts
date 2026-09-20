import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { socketConfig } from '../../config/socket/socket.config';
import { SocketRegistry } from '../registry/socketRegistry';
import { handleConnection } from '../handlers/connection/connection.handler';
import { Logger } from '../../utils/logger/logger.util';

export function setupSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, socketConfig);
  SocketRegistry.init(io);

  io.on('connection', (socket) => {
    handleConnection(socket);
  });

  Logger.info('Socket.io Realtime Engine initialized');
  return io;
}
