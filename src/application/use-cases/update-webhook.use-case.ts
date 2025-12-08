import { Webhook, WebhookEvent, WebhookStatus } from '@domain/entities/webhook.entity';
import { WebhookRepository } from '@domain/repositories/webhook.repository';
import { Logger } from '@application/ports/logger.port';
import { NotFoundError } from '@shared/errors';

export interface UpdateWebhookInput {
  url?: string;
  events?: WebhookEvent[];
  active?: boolean;
}

export interface WebhookOutput {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export class UpdateWebhookUseCase {
  constructor(
    private webhookRepo: WebhookRepository,
    private logger: Logger
  ) {}

  async execute(webhookId: string, input: UpdateWebhookInput): Promise<WebhookOutput> {
    const webhook = await this.webhookRepo.findById(webhookId);

    if (!webhook) {
      throw new NotFoundError('Webhook', webhookId);
    }

    if (input.url !== undefined) {
      try {
        new URL(input.url);
      } catch {
        throw new Error('Invalid webhook URL');
      }
      webhook.updateUrl(input.url);
    }

    if (input.events !== undefined) {
      if (input.events.length === 0) {
        throw new Error('At least one event must be specified');
      }

      const validEvents = Object.values(WebhookEvent);
      for (const event of input.events) {
        if (!validEvents.includes(event)) {
          throw new Error(`Invalid event: ${event}`);
        }
      }

      webhook.updateEvents(input.events);
    }

    if (input.active !== undefined) {
      if (input.active) {
        webhook.activate();
      } else {
        webhook.deactivate();
      }
    }

    await this.webhookRepo.save(webhook);

    this.logger.info('Webhook updated', {
      webhookId: webhook.id,
      url: webhook.url,
      events: webhook.events,
      status: webhook.status,
    });

    return this.mapToOutput(webhook);
  }

  private mapToOutput(webhook: Webhook): WebhookOutput {
    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      active: webhook.isActive(),
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
    };
  }
}

