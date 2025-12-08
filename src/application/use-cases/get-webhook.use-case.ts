import { Webhook, WebhookEvent } from '@domain/entities/webhook.entity';
import { WebhookRepository } from '@domain/repositories/webhook.repository';
import { Logger } from '@application/ports/logger.port';
import { NotFoundError } from '@shared/errors';

export interface WebhookOutput {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export class GetWebhookUseCase {
  constructor(
    private webhookRepo: WebhookRepository,
    private logger: Logger
  ) {}

  async execute(webhookId: string): Promise<WebhookOutput> {
    const webhook = await this.webhookRepo.findById(webhookId);

    if (!webhook) {
      throw new NotFoundError('Webhook', webhookId);
    }

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

