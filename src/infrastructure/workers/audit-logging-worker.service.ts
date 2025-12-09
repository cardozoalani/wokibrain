import { KafkaClient } from '@infrastructure/messaging/kafka-client';
import { EventBus } from '@infrastructure/messaging/event-bus';
import { DomainEvent } from '@domain/events/domain-event';
import { Logger } from '@application/ports/logger.port';
import { Collection, Db } from 'mongodb';

interface AuditLog {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  version: number;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
  storedAt: Date;
  source: string;
}

/**
 * Audit Logging Worker - Consumes all domain events and stores them for audit/compliance
 */
export class AuditLoggingWorkerService {
  private readonly aggregateTypes = ['Booking'];
  private isConsuming = false;
  private auditCollection: Collection<AuditLog>;

  constructor(
    private eventBus: EventBus,
    private db: Db,
    private logger: Logger
  ) {
    this.auditCollection = db.collection('audit_logs');
    this.ensureIndexes();
  }

  private async ensureIndexes(): Promise<void> {
    await this.auditCollection.createIndex({ eventId: 1 }, { unique: true });
    await this.auditCollection.createIndex({ aggregateId: 1, version: 1 });
    await this.auditCollection.createIndex({ eventType: 1, occurredAt: -1 });
    await this.auditCollection.createIndex({ aggregateType: 1, occurredAt: -1 });
    await this.auditCollection.createIndex({ occurredAt: -1 });
  }

  /**
   * Start consuming events and storing for audit
   */
  async start(): Promise<void> {
    if (this.isConsuming) {
      this.logger.warn('Audit logging worker is already consuming');
      return;
    }

    // Register audit handlers for all booking events
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
    this.logger.info('Audit logging worker started', {
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
    this.logger.info('Audit logging worker stopped');
  }

  /**
   * Handle a domain event and store for audit
   */
  private async handleEvent(event: DomainEvent): Promise<void> {
    try {
      const auditLog: AuditLog = {
        eventId: `${event.aggregateId}-${event.version}-${Date.now()}`,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        version: event.version,
        payload: event.payload as Record<string, unknown>,
        metadata: event.metadata,
        occurredAt: event.occurredAt,
        storedAt: new Date(),
        source: 'kafka-event-bus',
      };

      await this.auditCollection.insertOne(auditLog);

      this.logger.debug('Event stored for audit', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        version: event.version,
      });
    } catch (error) {
      this.logger.error('Failed to store event for audit', error as Error, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
    }
  }
}
