import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Logger } from '@application/ports/logger.port';
import { DomainEvent } from '@domain/events/domain-event';

export interface WebSocketConfig {
  cors?: {
    origin: string | string[];
    credentials: boolean;
  };
  path?: string;
}

export class WebSocketServer {
  private io: SocketIOServer;
  private connections: Map<string, Socket> = new Map();

  constructor(
    httpServer: HttpServer,
    config: WebSocketConfig,
    private logger: Logger
  ) {
    this.io = new SocketIOServer(httpServer, {
      cors: config.cors || {
        origin: '*',
        credentials: true,
      },
      path: config.path || '/ws',
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.connections.set(socket.id, socket);

      this.logger.info('WebSocket client connected', {
        socketId: socket.id,
        totalConnections: this.connections.size,
      });

      socket.on('subscribe', (data: { restaurantId?: string; sectorId?: string }) => {
        this.handleSubscribe(socket, data);
      });

      socket.on('unsubscribe', (data: { restaurantId?: string; sectorId?: string }) => {
        this.handleUnsubscribe(socket, data);
      });

      socket.on('disconnect', () => {
        this.connections.delete(socket.id);
        this.logger.info('WebSocket client disconnected', {
          socketId: socket.id,
          totalConnections: this.connections.size,
        });
      });

      socket.on('error', (error) => {
        this.logger.error('WebSocket error', error as Error, {
          socketId: socket.id,
        });
      });
    });
  }

  private handleSubscribe(socket: Socket, data: { restaurantId?: string; sectorId?: string }): void {
    if (data.restaurantId) {
      socket.join(`restaurant:${data.restaurantId}`);
      this.logger.debug('Client subscribed to restaurant', {
        socketId: socket.id,
        restaurantId: data.restaurantId,
      });
    }

    if (data.sectorId) {
      socket.join(`sector:${data.sectorId}`);
      this.logger.debug('Client subscribed to sector', {
        socketId: socket.id,
        sectorId: data.sectorId,
      });
    }

    socket.emit('subscribed', { success: true, ...data });
  }

  private handleUnsubscribe(socket: Socket, data: { restaurantId?: string; sectorId?: string }): void {
    if (data.restaurantId) {
      socket.leave(`restaurant:${data.restaurantId}`);
    }

    if (data.sectorId) {
      socket.leave(`sector:${data.sectorId}`);
    }

    socket.emit('unsubscribed', { success: true, ...data });
  }

  broadcastEvent(event: DomainEvent): void {
    const payload = event.payload as any;

    if (payload.restaurantId) {
      this.io.to(`restaurant:${payload.restaurantId}`).emit('booking-event', {
        type: event.eventType,
        data: payload,
        timestamp: event.occurredAt,
      });
    }

    if (payload.sectorId) {
      this.io.to(`sector:${payload.sectorId}`).emit('booking-event', {
        type: event.eventType,
        data: payload,
        timestamp: event.occurredAt,
      });
    }

    this.logger.debug('Event broadcasted via WebSocket', {
      eventType: event.eventType,
      aggregateId: event.aggregateId,
    });
  }

  broadcastToRestaurant(restaurantId: string, eventType: string, data: unknown): void {
    this.io.to(`restaurant:${restaurantId}`).emit(eventType, data);
  }

  broadcastToSector(sectorId: string, eventType: string, data: unknown): void {
    this.io.to(`sector:${sectorId}`).emit(eventType, data);
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        this.logger.info('WebSocket server closed');
        resolve();
      });
    });
  }
}



