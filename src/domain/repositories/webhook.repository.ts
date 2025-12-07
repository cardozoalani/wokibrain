import { Webhook, WebhookEvent } from '@domain/entities/webhook.entity';

export interface WebhookRepository {
  save(webhook: Webhook): Promise<void>;
  findById(id: string): Promise<Webhook | null>;
  findAll(): Promise<Webhook[]>;
  findByEvent(event: WebhookEvent): Promise<Webhook[]>;
  findByUrl(url: string): Promise<Webhook | null>;
  delete(id: string): Promise<void>;
  findActive(): Promise<Webhook[]>;
}



