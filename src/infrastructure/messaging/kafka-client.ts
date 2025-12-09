import { Kafka, Producer, Consumer, Admin, EachMessagePayload } from 'kafkajs';
import { DomainEvent } from '@domain/events/domain-event';
import { Logger } from '@application/ports/logger.port';

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}

export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private admin: Admin;
  private connected: boolean = false;

  constructor(
    private config: KafkaConfig,
    private logger: Logger
  ) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: config.sasl as any, // Type assertion needed due to union type in kafkajs
    });

    this.producer = this.kafka.producer({
      idempotent: true,
      maxInFlightRequests: 5,
      transactionalId: `${config.clientId}-producer`,
    });

    this.consumer = this.kafka.consumer({
      groupId: config.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    this.admin = this.kafka.admin();
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    await Promise.all([this.producer.connect(), this.consumer.connect(), this.admin.connect()]);

    this.connected = true;
    this.logger.info('Kafka client connected', {
      brokers: this.config.brokers,
      clientId: this.config.clientId,
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    await Promise.all([
      this.producer.disconnect(),
      this.consumer.disconnect(),
      this.admin.disconnect(),
    ]);

    this.connected = false;
    this.logger.info('Kafka client disconnected');
  }

  async publishEvent(topic: string, event: DomainEvent): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          key: event.aggregateId,
          value: JSON.stringify(event),
          headers: {
            eventType: event.eventType,
            aggregateType: event.aggregateType,
            version: event.version.toString(),
          },
        },
      ],
    });

    this.logger.debug('Event published to Kafka', {
      topic,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
    });
  }

  async publishBatch(topic: string, events: DomainEvent[]): Promise<void> {
    const messages = events.map((event) => ({
      key: event.aggregateId,
      value: JSON.stringify(event),
      headers: {
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        version: event.version.toString(),
      },
    }));

    await this.producer.send({ topic, messages });

    this.logger.debug('Batch published to Kafka', {
      topic,
      count: events.length,
    });
  }

  async subscribe(
    topics: string[],
    handler: (message: EachMessagePayload) => Promise<void>,
    groupId?: string
  ): Promise<void> {
    // If a different groupId is provided, create a new consumer
    let consumer = this.consumer;
    if (groupId && groupId !== this.config.groupId) {
      consumer = this.kafka.consumer({
        groupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
      });
      await consumer.connect();
    }

    await consumer.subscribe({ topics, fromBeginning: false });

    await consumer.run({
      eachMessage: async (payload) => {
        try {
          await handler(payload);

          this.logger.debug('Message processed', {
            topic: payload.topic,
            partition: payload.partition,
            offset: payload.message.offset,
          });
        } catch (error) {
          this.logger.error('Failed to process message', error as Error, {
            topic: payload.topic,
            partition: payload.partition,
            offset: payload.message.offset,
          });
          throw error;
        }
      },
    });
  }

  async createTopics(
    topics: Array<{ topic: string; numPartitions?: number; replicationFactor?: number }>
  ): Promise<void> {
    const created = await this.admin.createTopics({
      topics: topics.map((t) => ({
        topic: t.topic,
        numPartitions: t.numPartitions || 3,
        replicationFactor: t.replicationFactor || 3,
        configEntries: [
          { name: 'retention.ms', value: '604800000' },
          { name: 'compression.type', value: 'snappy' },
        ],
      })),
    });

    if (created) {
      this.logger.info('Kafka topics created', { topics: topics.map((t) => t.topic) });
    }
  }

  async getTopics(): Promise<string[]> {
    return await this.admin.listTopics();
  }

  async deleteTopics(topics: string[]): Promise<void> {
    await this.admin.deleteTopics({ topics });
    this.logger.info('Kafka topics deleted', { topics });
  }
}
