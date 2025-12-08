import { WebhookRepository } from '@domain/repositories/webhook.repository';
import { Logger } from '@application/ports/logger.port';
import { NotFoundError } from '@shared/errors';

export class DeleteWebhookUseCase {
  constructor(
    private webhookRepo: WebhookRepository,
    private logger: Logger
  ) {}

  async execute(webhookId: string): Promise<void> {
    const webhook = await this.webhookRepo.findById(webhookId);

    if (!webhook) {
      throw new NotFoundError('Webhook', webhookId);
    }

    await this.webhookRepo.delete(webhookId);

    this.logger.info('Webhook deleted', {
      webhookId: webhook.id,
      url: webhook.url,
    });
  }
}

