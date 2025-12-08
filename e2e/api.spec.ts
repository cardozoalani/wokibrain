import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('WokiBrain API E2E Tests', () => {
  test('should return health status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/v1/health`);

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
  });

  test('should discover available seats', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/v1/woki/discover?restaurantId=R1&sectorId=S1&date=2025-10-22&partySize=5&duration=90&windowStart=20:00&windowEnd=23:45`
    );

    expect(response.ok() || response.status() === 409).toBeTruthy();

    if (response.ok()) {
      const body = await response.json();
      expect(body.slotMinutes).toBe(15);
      expect(body.durationMinutes).toBe(90);
      expect(Array.isArray(body.candidates)).toBeTruthy();
    }
  });

  test('should create booking with idempotency', async ({ request }) => {
    const idempotencyKey = `test-${Date.now()}`;

    const response1 = await request.post(`${BASE_URL}/api/v1/woki/bookings`, {
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      data: {
        restaurantId: 'R1',
        sectorId: 'S1',
        partySize: 4,
        durationMinutes: 90,
        date: '2025-10-25',
      },
    });

    const body1 = await response1.json();

    if (response1.status() === 201) {
      expect(body1.id).toBeDefined();
      expect(body1.status).toBe('CONFIRMED');

      const response2 = await request.post(`${BASE_URL}/api/v1/woki/bookings`, {
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        data: {
          restaurantId: 'R1',
          sectorId: 'S1',
          partySize: 4,
          durationMinutes: 90,
          date: '2025-10-25',
        },
      });

      const body2 = await response2.json();
      expect(body1.id).toBe(body2.id);
    }
  });

  test('should list bookings for a date', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/v1/woki/bookings?restaurantId=R1&sectorId=S1&date=2025-10-22`
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.date).toBe('2025-10-22');
    expect(Array.isArray(body.bookings)).toBeTruthy();
  });

  test('should validate input and return 400', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/woki/bookings`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        restaurantId: 'R1',
        sectorId: 'S1',
        partySize: -5,
        durationMinutes: 90,
        date: '2025-10-22',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test('should return 404 for non-existent restaurant', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/v1/woki/discover?restaurantId=NONEXISTENT&sectorId=S1&date=2025-10-22&partySize=4&duration=90`
    );

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('NOT_FOUND');
  });

  test('should handle rate limiting', async ({ request }) => {
    const promises = Array.from({ length: 150 }, () =>
      request.get(`${BASE_URL}/api/v1/health`)
    );

    const responses = await Promise.all(promises);
    const blocked = responses.filter((r) => r.status() === 429);

    expect(blocked.length).toBeGreaterThan(0);
  });

  test('should handle concurrent bookings without race conditions', async ({ request }) => {
    const idempotencyKeys = Array.from({ length: 20 }, (_, i) => `concurrent-${Date.now()}-${i}`);

    const promises = idempotencyKeys.map((key) =>
      request.post(`${BASE_URL}/api/v1/woki/bookings`, {
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        data: {
          restaurantId: 'R1',
          sectorId: 'S1',
          partySize: 4,
          durationMinutes: 90,
          date: '2025-10-26',
        },
      })
    );

    const responses = await Promise.all(promises);
    const successful = responses.filter((r) => r.status() === 201).length;
    const conflicts = responses.filter((r) => r.status() === 409).length;

    expect(successful + conflicts).toBe(20);
    expect(successful).toBeGreaterThan(0);
  });

  test('should validate service windows', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/woki/bookings`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        restaurantId: 'R1',
        sectorId: 'S1',
        partySize: 4,
        durationMinutes: 90,
        date: '2025-10-22',
        windowStart: '02:00',
        windowEnd: '04:00',
      },
    });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('OUTSIDE_SERVICE_WINDOW');
  });
});



