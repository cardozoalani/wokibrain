import crypto from 'crypto';
import { Webhook, WebhookEvent } from '@domain/entities/webhook.entity';
import { WebhookRepository } from '@domain/repositories/webhook.repository';
import { Logger } from '@application/ports/logger.port';
import { WebhookQueueService } from './webhook-queue.service';

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
  id: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  attempt: number;
  deliveredAt: Date;
}

export interface WebhookDeliveryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<WebhookDeliveryOptions> = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 10000,
};

export class WebhookService {
  constructor(
    private webhookRepo: WebhookRepository,
    private logger: Logger,
    private options: WebhookDeliveryOptions = {},
    private queueService?: WebhookQueueService
  ) {}

  /**
   * Deliver a webhook event to all active webhooks that subscribe to it
   */
  async deliverEvent(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
    const webhooks = await this.webhookRepo.findByEvent(event);

    if (webhooks.length === 0) {
      this.logger.debug(`No webhooks subscribed to event: ${event}`);
      return;
    }

    this.logger.info(`Delivering event ${event} to ${webhooks.length} webhook(s)`);

    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
    };

    // If queue service is available, use Kafka for async processing
    // Otherwise, fall back to direct delivery (for backwards compatibility)
    if (this.queueService) {
      // Enqueue all webhook deliveries to Kafka
      const enqueuePromises = webhooks.map((webhook) =>
        this.queueService!.enqueueWebhookDelivery(
          webhook.id,
          webhook.url,
          webhook.secret,
          payload,
          this.options.maxRetries || 3
        ).catch((error) => {
          this.logger.error('Failed to enqueue webhook', error as Error, {
            webhookId: webhook.id,
            url: webhook.url,
          });
        })
      );
      await Promise.allSettled(enqueuePromises);
    } else {
      // Direct delivery (legacy mode - for backwards compatibility)
      const deliveries = webhooks.map((webhook) => this.deliverToWebhook(webhook, payload));
      await Promise.allSettled(deliveries);
    }
  }

  /**
   * Deliver a webhook payload to a specific webhook with retry logic
   */
  async deliverToWebhook(
    webhook: Webhook,
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<WebhookDeliveryResult> {
    if (!webhook.isActive()) {
      this.logger.debug(`Skipping inactive webhook: ${webhook.id}`);
      return {
        success: false,
        error: 'Webhook is not active',
        attempt,
        deliveredAt: new Date(),
      };
    }

    const opts = { ...DEFAULT_OPTIONS, ...this.options };
    const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WokiBrain-Event': payload.event,
          'X-WokiBrain-Signature': signature,
          'X-WokiBrain-Delivery': payload.id,
          'X-WokiBrain-Timestamp': payload.timestamp,
          'User-Agent': 'WokiBrain-Webhooks/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const success = response.ok;

      if (success) {
        this.logger.info(`Webhook delivered successfully`, {
          webhookId: webhook.id,
          url: webhook.url,
          event: payload.event,
          statusCode: response.status,
          attempt,
        });

        return {
          success: true,
          statusCode: response.status,
          attempt,
          deliveredAt: new Date(),
        };
      } else {
        // Retry on client/server errors (4xx/5xx)
        const shouldRetry = response.status >= 500 || (response.status >= 400 && response.status < 500 && attempt < opts.maxRetries);

        if (shouldRetry && attempt < opts.maxRetries) {
          this.logger.warn(`Webhook delivery failed, retrying`, {
            webhookId: webhook.id,
            url: webhook.url,
            event: payload.event,
            statusCode: response.status,
            attempt,
            maxRetries: opts.maxRetries,
          });

          // Exponential backoff: delay = baseDelay * 2^(attempt-1)
          const delay = opts.retryDelayMs * Math.pow(2, attempt - 1);
          await this.sleep(delay);

          return this.deliverToWebhook(webhook, payload, attempt + 1);
        } else {
          const errorText = await response.text().catch(() => 'Unknown error');
          const error = new Error(`HTTP ${response.status}: ${errorText}`);
          this.logger.error('Webhook delivery failed permanently', error, {
            webhookId: webhook.id,
            url: webhook.url,
            event: payload.event,
            statusCode: response.status,
            attempt,
            maxRetries: opts.maxRetries,
          });

          return {
            success: false,
            statusCode: response.status,
            error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
            attempt,
            deliveredAt: new Date(),
          };
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = error instanceof Error && error.name === 'AbortError';

      // Retry on network errors and timeouts
      if ((isTimeout || errorMessage.includes('fetch')) && attempt < opts.maxRetries) {
        this.logger.warn(`Webhook delivery error, retrying`, {
          webhookId: webhook.id,
          url: webhook.url,
          event: payload.event,
          error: errorMessage,
          attempt,
          maxRetries: opts.maxRetries,
        });

        // Exponential backoff
        const delay = opts.retryDelayMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);

        return this.deliverToWebhook(webhook, payload, attempt + 1);
      } else {
        const error = new Error(errorMessage);
        this.logger.error('Webhook delivery failed permanently', error, {
          webhookId: webhook.id,
          url: webhook.url,
          event: payload.event,
          attempt,
          maxRetries: opts.maxRetries,
        });

        return {
          success: false,
          error: errorMessage,
          attempt,
          deliveredAt: new Date(),
        };
      }
    }
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

