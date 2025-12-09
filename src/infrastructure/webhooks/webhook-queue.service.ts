import { KafkaClient } from '@infrastructure/messaging/kafka-client';
import { Logger } from '@application/ports/logger.port';
import { WebhookPayload } from './webhook.service';

export interface WebhookDeliveryMessage {
  webhookId: string;
  url: string;
  secret: string;
  payload: WebhookPayload;
  attempt: number;
  maxRetries: number;
  createdAt: string;
}

/**
 * Webhook Queue Service - Publishes webhook delivery tasks to Kafka
 * This allows webhooks to be processed asynchronously by dedicated workers
 */
export class WebhookQueueService {
  private readonly topic = 'wokibrain.webhooks.deliveries';

  constructor(
    private kafka: KafkaClient,
    private logger: Logger
  ) {}

  /**
   * Enqueue a webhook delivery task to Kafka
   */
  async enqueueWebhookDelivery(
    webhookId: string,
    url: string,
    secret: string,
    payload: WebhookPayload,
    maxRetries: number = 3
  ): Promise<void> {
    const message: WebhookDeliveryMessage = {
      webhookId,
      url,
      secret,
      payload,
      attempt: 1,
      maxRetries,
      createdAt: new Date().toISOString(),
    };

    try {
      await this.kafka.publishEvent(this.topic, message as any);
      this.logger.info('Webhook delivery enqueued', {
        webhookId,
        url,
        event: payload.event,
        topic: this.topic,
      });
    } catch (error) {
      this.logger.error('Failed to enqueue webhook delivery', error as Error, {
        webhookId,
        url,
        event: payload.event,
      });
      throw error;
    }
  }

  /**
   * Enqueue a retry for a failed webhook delivery
   */
  async enqueueRetry(
    message: WebhookDeliveryMessage,
    delayMs: number = 0
  ): Promise<void> {
    const retryMessage: WebhookDeliveryMessage = {
      ...message,
      attempt: message.attempt + 1,
    };

    try {
      // If delay is needed, we could use Kafka's delayed message feature
      // or a separate delay topic. For now, we'll publish immediately
      // and let the consumer handle delays
      const kafkaMessage = {
        aggregateId: retryMessage.webhookId,
        aggregateType: 'Webhook',
        eventType: 'WebhookDeliveryRetry',
        version: retryMessage.attempt,
        occurredAt: new Date(),
        payload: retryMessage,
      };
      await this.kafka.publishEvent(this.topic, kafkaMessage as any);
      this.logger.info('Webhook retry enqueued', {
        webhookId: message.webhookId,
        attempt: retryMessage.attempt,
        maxRetries: message.maxRetries,
      });
    } catch (error) {
      this.logger.error('Failed to enqueue webhook retry', error as Error, {
        webhookId: message.webhookId,
        attempt: retryMessage.attempt,
      });
      throw error;
    }
  }
}

