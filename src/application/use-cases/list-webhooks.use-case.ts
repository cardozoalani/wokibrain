import { Webhook, WebhookEvent } from '@domain/entities/webhook.entity';
import { WebhookRepository } from '@domain/repositories/webhook.repository';
import { Logger } from '@application/ports/logger.port';

export interface WebhookOutput {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ListWebhooksUseCase {
  constructor(
    private webhookRepo: WebhookRepository,
    private logger: Logger
  ) {}

  async execute(): Promise<WebhookOutput[]> {
    const webhooks = await this.webhookRepo.findAll();
    return webhooks.map((webhook) => this.mapToOutput(webhook));
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
