import { DomainEvent } from '@domain/events/domain-event';
import { KafkaClient } from './kafka-client';
import { Logger } from '@application/ports/logger.port';

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): Promise<void>;
}

export class KafkaEventBus implements EventBus {
  private readonly topicPrefix = 'wokibrain';
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  constructor(
    private kafka: KafkaClient,
    private logger: Logger
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    const topic = this.getTopicName(event.aggregateType);
    await this.kafka.publishEvent(topic, event);

    this.logger.info('Event published', {
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      topic,
    });
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    const eventsByTopic = new Map<string, DomainEvent[]>();

    for (const event of events) {
      const topic = this.getTopicName(event.aggregateType);
      if (!eventsByTopic.has(topic)) {
        eventsByTopic.set(topic, []);
      }
      eventsByTopic.get(topic)!.push(event);
    }

    await Promise.all(
      Array.from(eventsByTopic.entries()).map(([topic, topicEvents]) =>
        this.kafka.publishBatch(topic, topicEvents)
      )
    );

    this.logger.info('Event batch published', {
      count: events.length,
      topics: Array.from(eventsByTopic.keys()),
    });
  }

  async subscribe(
    eventType: string,
    handler: (event: DomainEvent) => Promise<void>
  ): Promise<void> {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler);

    this.logger.info('Event handler registered', { eventType });
  }

  async startConsuming(aggregateTypes: string[]): Promise<void> {
    const topics = aggregateTypes.map((type) => this.getTopicName(type));

    await this.kafka.subscribe(topics, async (payload) => {
      const event = JSON.parse(payload.message.value!.toString()) as DomainEvent;

      const handlers = this.handlers.get(event.eventType) || [];

      await Promise.all(handlers.map((handler) => handler(event)));
    });

    this.logger.info('Started consuming events', { topics });
  }

  private getTopicName(aggregateType: string): string {
    return `${this.topicPrefix}.${aggregateType.toLowerCase()}.events`;
  }
}
