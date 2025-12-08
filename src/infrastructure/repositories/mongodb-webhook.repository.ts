import { Collection } from 'mongodb';
import { Webhook, WebhookEvent, WebhookStatus } from '@domain/entities/webhook.entity';
import { WebhookRepository } from '@domain/repositories/webhook.repository';

export class MongoDBWebhookRepository implements WebhookRepository {
  constructor(private collection: Collection<WebhookDocument>) {}

  async save(webhook: Webhook): Promise<void> {
    const doc = this.toDocument(webhook);
    await this.collection.replaceOne({ _id: webhook.id }, doc, { upsert: true });
  }

  async findById(id: string): Promise<Webhook | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(): Promise<Webhook[]> {
    const docs = await this.collection.find({}).toArray();
    return docs.map((doc) => this.toEntity(doc));
  }

  async findByEvent(event: WebhookEvent): Promise<Webhook[]> {
    const docs = await this.collection
      .find({
        events: event,
        status: WebhookStatus.ACTIVE,
      })
      .toArray();
    return docs.map((doc) => this.toEntity(doc));
  }

  async findByUrl(url: string): Promise<Webhook | null> {
    const doc = await this.collection.findOne({ url });
    return doc ? this.toEntity(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: id });
  }

  async findActive(): Promise<Webhook[]> {
    const docs = await this.collection.find({ status: WebhookStatus.ACTIVE }).toArray();
    return docs.map((doc) => this.toEntity(doc));
  }

  private toDocument(webhook: Webhook): WebhookDocument {
    return {
      _id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret,
      status: webhook.status,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }

  private toEntity(doc: WebhookDocument): Webhook {
    return Webhook.fromPersistence(
      {
        url: doc.url,
        events: doc.events as WebhookEvent[],
        secret: doc.secret,
        status: doc.status as WebhookStatus,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
      doc._id
    );
  }
}

interface WebhookDocument {
  _id: string;
  url: string;
  events: string[];
  secret: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

