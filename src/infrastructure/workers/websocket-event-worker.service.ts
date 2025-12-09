import { KafkaClient } from '@infrastructure/messaging/kafka-client';
import { EventBus } from '@infrastructure/messaging/event-bus';
import { DomainEvent } from '@domain/events/domain-event';
import { WebSocketServer } from '@infrastructure/websocket/websocket-server';
import { Logger } from '@application/ports/logger.port';

/**
 * WebSocket Event Worker - Consumes domain events and broadcasts to WebSocket clients
 */
export class WebSocketEventWorkerService {
  private readonly aggregateTypes = ['Booking'];
  private isConsuming = false;

  constructor(
    private eventBus: EventBus,
    private webSocketServer: WebSocketServer,
    private logger: Logger
  ) {}

  /**
   * Start consuming events and broadcasting to WebSocket clients
   */
  async start(): Promise<void> {
    if (this.isConsuming) {
      this.logger.warn('WebSocket event worker is already consuming');
      return;
    }

    // Register WebSocket broadcast handlers
    await this.eventBus.subscribe('BookingCreated', async (event) => {
      await this.handleEvent(event);
    });

    await this.eventBus.subscribe('BookingCancelled', async (event) => {
      await this.handleEvent(event);
    });

    await this.eventBus.subscribe('BookingUpdated', async (event) => {
      await this.handleEvent(event);
    });

    // Start consuming events
    if ('startConsuming' in this.eventBus) {
      await (this.eventBus as any).startConsuming(this.aggregateTypes);
    }

    this.isConsuming = true;
    this.logger.info('WebSocket event worker started', {
      aggregateTypes: this.aggregateTypes,
    });
  }

  /**
   * Stop consuming events
   */
  async stop(): Promise<void> {
    if (!this.isConsuming) {
      return;
    }

    this.isConsuming = false;
    this.logger.info('WebSocket event worker stopped');
  }

  /**
   * Handle a domain event and broadcast to WebSocket clients
   */
  private async handleEvent(event: DomainEvent): Promise<void> {
    try {
      this.webSocketServer.broadcastEvent(event);
      this.logger.debug('Event broadcasted to WebSocket clients', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
    } catch (error) {
      this.logger.error('Failed to broadcast event to WebSocket', error as Error, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
    }
  }
}
