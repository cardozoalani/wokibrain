import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { MongoDBWebhookRepository } from './mongodb-webhook.repository';
import { Webhook, WebhookEvent, WebhookStatus } from '@domain/entities/webhook.entity';

describe('MongoDBWebhookRepository', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let repository: MongoDBWebhookRepository;

  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('test');
    repository = new MongoDBWebhookRepository(db.collection('webhooks'));
  });

  afterEach(async () => {
    await client.close();
    await mongoServer.stop();
  });

  it('should save and find a webhook', async () => {
    const webhook = Webhook.create(
      {
        url: 'https://example.com/webhook',
        events: [WebhookEvent.BOOKING_CREATED],
        secret: 'test-secret',
        status: WebhookStatus.ACTIVE,
      },
      'webhook-1'
    );

    await repository.save(webhook);

    const found = await repository.findById('webhook-1');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('webhook-1');
    expect(found?.url).toBe('https://example.com/webhook');
    expect(found?.events).toEqual([WebhookEvent.BOOKING_CREATED]);
  });

  it('should find webhooks by event', async () => {
    const webhook1 = Webhook.create(
      {
        url: 'https://example.com/webhook1',
        events: [WebhookEvent.BOOKING_CREATED],
        secret: 'secret1',
        status: WebhookStatus.ACTIVE,
      },
      'webhook-1'
    );

    const webhook2 = Webhook.create(
      {
        url: 'https://example.com/webhook2',
        events: [WebhookEvent.BOOKING_CANCELLED],
        secret: 'secret2',
        status: WebhookStatus.ACTIVE,
      },
      'webhook-2'
    );

    await repository.save(webhook1);
    await repository.save(webhook2);

    const found = await repository.findByEvent(WebhookEvent.BOOKING_CREATED);
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe('webhook-1');
  });

  it('should find webhook by URL', async () => {
    const webhook = Webhook.create(
      {
        url: 'https://example.com/webhook',
        events: [WebhookEvent.BOOKING_CREATED],
        secret: 'test-secret',
        status: WebhookStatus.ACTIVE,
      },
      'webhook-1'
    );

    await repository.save(webhook);

    const found = await repository.findByUrl('https://example.com/webhook');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('webhook-1');
  });

  it('should find all active webhooks', async () => {
    const active1 = Webhook.create(
      {
        url: 'https://example.com/active1',
        events: [WebhookEvent.BOOKING_CREATED],
        secret: 'secret1',
        status: WebhookStatus.ACTIVE,
      },
      'webhook-1'
    );

    const inactive = Webhook.create(
      {
        url: 'https://example.com/inactive',
        events: [WebhookEvent.BOOKING_CREATED],
        secret: 'secret2',
        status: WebhookStatus.INACTIVE,
      },
      'webhook-2'
    );

    await repository.save(active1);
    await repository.save(inactive);

    const active = await repository.findActive();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('webhook-1');
  });

  it('should delete a webhook', async () => {
    const webhook = Webhook.create(
      {
        url: 'https://example.com/webhook',
        events: [WebhookEvent.BOOKING_CREATED],
        secret: 'test-secret',
        status: WebhookStatus.ACTIVE,
      },
      'webhook-1'
    );

    await repository.save(webhook);
    await repository.delete('webhook-1');

    const found = await repository.findById('webhook-1');
    expect(found).toBeNull();
  });
});
