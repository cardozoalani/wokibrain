import { Webhook, WebhookEvent, WebhookStatus } from '@domain/entities/webhook.entity';
import { WebhookRepository } from '@domain/repositories/webhook.repository';
import { Logger } from '@application/ports/logger.port';
import { randomUUID, randomBytes } from 'crypto';

export interface CreateWebhookInput {
  url: string;
  events: WebhookEvent[];
  secret: string;
}

export interface WebhookOutput {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export class CreateWebhookUseCase {
  constructor(
    private webhookRepo: WebhookRepository,
    private logger: Logger
  ) {}

  async execute(input: CreateWebhookInput): Promise<WebhookOutput> {
    // Validate URL
    try {
      new URL(input.url);
    } catch {
      throw new Error('Invalid webhook URL');
    }

    // Check if webhook with same URL already exists
    const existing = await this.webhookRepo.findByUrl(input.url);
    if (existing) {
      throw new Error('Webhook with this URL already exists');
    }

    // Validate events
    if (input.events.length === 0) {
      throw new Error('At least one event must be specified');
    }

    const validEvents = Object.values(WebhookEvent);
    for (const event of input.events) {
      if (!validEvents.includes(event)) {
        throw new Error(`Invalid event: ${event}`);
      }
    }

    const webhook = Webhook.create(
      {
        url: input.url,
        events: input.events,
        secret: input.secret || this.generateSecret(),
        status: WebhookStatus.ACTIVE,
      },
      randomUUID()
    );

    await this.webhookRepo.save(webhook);

    this.logger.info('Webhook created', {
      webhookId: webhook.id,
      url: webhook.url,
      events: webhook.events,
    });

    return this.mapToOutput(webhook);
  }

  private generateSecret(): string {
    return randomBytes(32).toString('hex');
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

