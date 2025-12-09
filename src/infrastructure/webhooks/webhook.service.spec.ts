import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookService } from './webhook.service';
import { Webhook, WebhookEvent, WebhookStatus } from '@domain/entities/webhook.entity';
import { WebhookRepository } from '@domain/repositories/webhook.repository';
import { Logger } from '@application/ports/logger.port';

// Mock fetch globally
global.fetch = vi.fn();

describe('WebhookService', () => {
  let webhookRepo: WebhookRepository;
  let logger: Logger;
  let webhookService: WebhookService;

  beforeEach(() => {
    webhookRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByEvent: vi.fn(),
      findByUrl: vi.fn(),
      delete: vi.fn(),
      findActive: vi.fn(),
    };

    logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    webhookService = new WebhookService(webhookRepo, logger, {
      maxRetries: 2,
      retryDelayMs: 100,
      timeoutMs: 1000,
    });

    vi.clearAllMocks();
  });

  it('should deliver event to active webhooks', async () => {
    const webhook = Webhook.create(
      {
        url: 'https://example.com/webhook',
        events: [WebhookEvent.BOOKING_CREATED],
        secret: 'test-secret',
        status: WebhookStatus.ACTIVE,
      },
      'webhook-1'
    );

    vi.mocked(webhookRepo.findByEvent).mockResolvedValue([webhook]);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(''),
    } as any);

    await webhookService.deliverEvent(WebhookEvent.BOOKING_CREATED, {
      id: 'booking-1',
      restaurantId: 'R1',
    });

    expect(webhookRepo.findByEvent).toHaveBeenCalledWith(WebhookEvent.BOOKING_CREATED);
    expect(fetch).toHaveBeenCalled();
  });

  it('should retry on failure', async () => {
    const webhook = Webhook.create(
      {
        url: 'https://example.com/webhook',
        events: [WebhookEvent.BOOKING_CREATED],
        secret: 'test-secret',
        status: WebhookStatus.ACTIVE,
      },
      'webhook-1'
    );

    vi.mocked(webhookRepo.findByEvent).mockResolvedValue([webhook]);

    // Mock fetch to fail first time, then succeed
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(''),
      } as any);

    // Start with attempt 1, should retry and succeed on attempt 2
    const result = await webhookService.deliverToWebhook(
      webhook,
      {
        event: WebhookEvent.BOOKING_CREATED,
        data: { id: 'booking-1' },
        timestamp: new Date().toISOString(),
        id: 'event-1',
      },
      1 // Start with attempt 1
    );

    // Should be called twice: once for attempt 1 (fails), once for attempt 2 (succeeds)
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
    expect(result.attempt).toBe(2);
  });

  it('should generate and verify signatures', () => {
    const payload = JSON.stringify({ test: 'data' });
    const secret = 'test-secret';

    const signature = (webhookService as any).generateSignature(payload, secret);
    expect(signature).toMatch(/^sha256=/);

    const isValid = webhookService.verifySignature(payload, signature, secret);
    expect(isValid).toBe(true);

    const isInvalid = webhookService.verifySignature(payload, signature, 'wrong-secret');
    expect(isInvalid).toBe(false);
  });

  it('should skip inactive webhooks', async () => {
    const webhook = Webhook.create(
      {
        url: 'https://example.com/webhook',
        events: [WebhookEvent.BOOKING_CREATED],
        secret: 'test-secret',
        status: WebhookStatus.INACTIVE,
      },
      'webhook-1'
    );

    const result = await webhookService.deliverToWebhook(
      webhook,
      {
        event: WebhookEvent.BOOKING_CREATED,
        data: { id: 'booking-1' },
        timestamp: new Date().toISOString(),
        id: 'event-1',
      },
      1
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toContain('not active');
  });
});
