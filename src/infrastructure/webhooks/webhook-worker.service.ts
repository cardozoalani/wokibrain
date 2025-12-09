import { KafkaClient } from '@infrastructure/messaging/kafka-client';
import { WebhookService, WebhookPayload } from './webhook.service';
import { WebhookRepository } from '@domain/repositories/webhook.repository';
import { Logger } from '@application/ports/logger.port';
import { WebhookDeliveryMessage, WebhookQueueService } from './webhook-queue.service';
import { Webhook } from '@domain/entities/webhook.entity';

/**
 * Webhook Worker Service - Consumes webhook delivery messages from Kafka
 * and processes them with retry logic
 */
export class WebhookWorkerService {
  private readonly topic = 'wokibrain.webhooks.deliveries';
  private readonly groupId = 'webhook-workers';
  private isConsuming = false;

  constructor(
    private kafka: KafkaClient,
    private webhookService: WebhookService,
    private webhookRepo: WebhookRepository,
    private logger: Logger
  ) {}

  /**
   * Start consuming webhook delivery messages from Kafka
   */
  async start(): Promise<void> {
    if (this.isConsuming) {
      this.logger.warn('Webhook worker is already consuming');
      return;
    }

    await this.kafka.connect();

    await this.kafka.subscribe(
      [this.topic],
      async (payload) => {
        try {
          const message = JSON.parse(payload.message.value!.toString()) as WebhookDeliveryMessage;
          await this.processWebhookDelivery(message);
        } catch (error) {
          this.logger.error('Error processing webhook delivery message', error as Error);
          // Don't throw - let Kafka handle retries at the consumer level
        }
      },
      this.groupId
    );

    this.isConsuming = true;
    this.logger.info('Webhook worker started', {
      topic: this.topic,
      groupId: this.groupId,
    });
  }

  /**
   * Stop consuming webhook delivery messages
   */
  async stop(): Promise<void> {
    if (!this.isConsuming) {
      return;
    }

    await this.kafka.disconnect();
    this.isConsuming = false;
    this.logger.info('Webhook worker stopped');
  }

  /**
   * Process a webhook delivery message
   */
  private async processWebhookDelivery(message: WebhookDeliveryMessage): Promise<void> {
    // Fetch the webhook to ensure it's still active
    const webhook = await this.webhookRepo.findById(message.webhookId);

    if (!webhook) {
      this.logger.warn('Webhook not found, skipping delivery', {
        webhookId: message.webhookId,
      });
      return;
    }

    if (!webhook.isActive()) {
      this.logger.debug('Webhook is not active, skipping delivery', {
        webhookId: message.webhookId,
        status: webhook.status,
      });
      return;
    }

    // Create a Webhook entity from the message
    const webhookEntity = Webhook.fromPersistence(
      {
        url: message.url,
        events: [], // Not needed for delivery
        secret: message.secret,
        status: webhook.status,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      },
      message.webhookId
    );

    // Deliver the webhook
    const result = await this.webhookService.deliverToWebhook(
      webhookEntity,
      message.payload,
      message.attempt
    );

    // If delivery failed and we haven't reached max retries, enqueue a retry
    if (!result.success && message.attempt < message.maxRetries) {
      const delayMs = 1000 * Math.pow(2, message.attempt - 1); // Exponential backoff

      this.logger.info('Webhook delivery failed, will retry', {
        webhookId: message.webhookId,
        attempt: message.attempt,
        maxRetries: message.maxRetries,
        delayMs,
        error: result.error,
      });

      // Wait for the delay before enqueueing retry
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Enqueue retry (this will be picked up by another worker or the same one)
      // Note: In a production system, you might want to use a delay queue or
      // a separate retry topic with TTL
      const queueService = new WebhookQueueService(this.kafka, this.logger);
      await queueService.enqueueRetry(message, delayMs);
    } else if (!result.success) {
      const error = new Error(result.error || 'Webhook delivery failed permanently');
      this.logger.error('Webhook delivery failed permanently after all retries', error, {
        webhookId: message.webhookId,
        attempt: message.attempt,
        maxRetries: message.maxRetries,
      });
    } else {
      this.logger.info('Webhook delivered successfully', {
        webhookId: message.webhookId,
        attempt: message.attempt,
        statusCode: result.statusCode,
      });
    }
  }
}
