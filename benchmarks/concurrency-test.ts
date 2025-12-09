import { faker } from '@faker-js/faker';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface ConcurrentRequest {
  id: string;
  restaurantId: string;
  sectorId: string;
  tableIds: string[];
  start: Date;
  status: 'pending' | 'success' | 'conflict' | 'error';
  responseTime: number;
}

async function createBooking(params: {
  restaurantId: string;
  sectorId: string;
  partySize: number;
  date: string;
  idempotencyKey: string;
}): Promise<{ status: number; time: number; body: any }> {
  const startTime = Date.now();

  const response = await fetch(`${BASE_URL}/api/v1/woki/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': params.idempotencyKey,
    },
    body: JSON.stringify({
      restaurantId: params.restaurantId,
      sectorId: params.sectorId,
      partySize: params.partySize,
      durationMinutes: 90,
      date: params.date,
      windowStart: '20:00',
      windowEnd: '23:45',
    }),
  });

  const body = await response.json();
  const time = Date.now() - startTime;

  return { status: response.status, time, body };
}

async function testConcurrentBookings(): Promise<void> {
  console.log('\n🔥 Testing Concurrent Bookings (Race Condition Detection)\n');

  const numRequests = 50;
  const requests: ConcurrentRequest[] = [];

  const promises = Array.from({ length: numRequests }, (_, i) =>
    createBooking({
      restaurantId: 'R1',
      sectorId: 'S1',
      partySize: faker.number.int({ min: 4, max: 6 }),
      date: '2025-10-22',
      idempotencyKey: faker.string.uuid(),
    }).then((result) => {
      const request: ConcurrentRequest = {
        id: `req-${i}`,
        restaurantId: 'R1',
        sectorId: 'S1',
        tableIds: result.body.tableIds || [],
        start: new Date(),
        status:
          result.status === 201
            ? 'success'
            : result.status === 409
              ? 'conflict'
              : 'error',
        responseTime: result.time,
      };
      requests.push(request);
      return request;
    })
  );

  await Promise.all(promises);

  const successful = requests.filter((r) => r.status === 'success').length;
  const conflicts = requests.filter((r) => r.status === 'conflict').length;
  const errors = requests.filter((r) => r.status === 'error').length;

  const avgResponseTime =
    requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length;
  const p95ResponseTime = requests
    .map((r) => r.responseTime)
    .sort((a, b) => a - b)[Math.floor(requests.length * 0.95)];

  console.log('📊 Concurrency Test Results:');
  console.log(`  Total requests:     ${numRequests}`);
  console.log(`  Successful (201):   ${successful} (${((successful / numRequests) * 100).toFixed(1)}%)`);
  console.log(`  Conflicts (409):    ${conflicts} (${((conflicts / numRequests) * 100).toFixed(1)}%)`);
  console.log(`  Errors (5xx):       ${errors} (${((errors / numRequests) * 100).toFixed(1)}%)`);
  console.log(`  Avg response time:  ${avgResponseTime.toFixed(2)}ms`);
  console.log(`  P95 response time:  ${p95ResponseTime.toFixed(2)}ms`);

  const tableConflicts = new Map<string, number>();
  const successfulRequests = requests.filter((r) => r.status === 'success');

  for (const req of successfulRequests) {
    for (const tableId of req.tableIds) {
      tableConflicts.set(tableId, (tableConflicts.get(tableId) || 0) + 1);
    }
  }

  console.log('\n🪑 Table Assignment Distribution:');
  for (const [tableId, count] of tableConflicts.entries()) {
    console.log(`  ${tableId}: ${count} bookings`);
  }

  const hasDoubleBooking = Array.from(tableConflicts.values()).some((count) => count > 1);

  if (hasDoubleBooking) {
    console.log('\n❌ FAIL: Double booking detected! Lock mechanism failed.');
  } else {
    console.log('\n✅ PASS: No double bookings. Lock mechanism working correctly.');
  }

  if (errors > numRequests * 0.05) {
    console.log(`\n❌ FAIL: Error rate ${((errors / numRequests) * 100).toFixed(1)}% exceeds 5% threshold`);
  } else {
    console.log(`\n✅ PASS: Error rate ${((errors / numRequests) * 100).toFixed(1)}% within acceptable range`);
  }
}

async function testIdempotency(): Promise<void> {
  console.log('\n🔄 Testing Idempotency (Duplicate Detection)\n');

  const idempotencyKey = faker.string.uuid();
  const payload = {
    restaurantId: 'R1',
    sectorId: 'S1',
    partySize: 4,
    durationMinutes: 90,
    date: '2025-10-23',
  };

  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      fetch(`${BASE_URL}/api/v1/woki/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      }).then((r) => r.json())
    )
  );

  const bookingIds = new Set(results.map((r) => r.id));

  console.log('📊 Idempotency Test Results:');
  console.log(`  Requests sent:      10`);
  console.log(`  Unique booking IDs: ${bookingIds.size}`);
  console.log(`  Expected:           1`);

  if (bookingIds.size === 1) {
    console.log('\n✅ PASS: Idempotency working correctly. All requests returned same booking.');
  } else {
    console.log(
      `\n❌ FAIL: Idempotency broken. Created ${bookingIds.size} different bookings with same key.`
    );
  }
}

async function testRateLimiting(): Promise<void> {
  console.log('\n⏱️  Testing Rate Limiting\n');

  const requests = Array.from({ length: 150 }, () =>
    fetch(`${BASE_URL}/api/v1/health`).then((r) => ({
      status: r.status,
      rateLimit: r.headers.get('x-ratelimit-remaining'),
    }))
  );

  const results = await Promise.all(requests);

  const blocked = results.filter((r) => r.status === 429).length;
  const allowed = results.filter((r) => r.status === 200).length;

  console.log('📊 Rate Limiting Test Results:');
  console.log(`  Total requests:     150`);
  console.log(`  Allowed (200):      ${allowed}`);
  console.log(`  Blocked (429):      ${blocked}`);
  console.log(`  Rate limit config:  100 req/min`);

  if (blocked > 0) {
    console.log('\n✅ PASS: Rate limiting is working. Blocked excess requests.');
  } else {
    console.log(
      '\n⚠️  WARNING: No requests blocked. Rate limiting may not be configured correctly.'
    );
  }
}

async function testMemoryLeak(): Promise<void> {
  console.log('\n💾 Testing Memory Leak (10,000 requests)\n');

  const iterations = 10000;
  let successCount = 0;

  const startMemory = process.memoryUsage();

  for (let i = 0; i < iterations; i++) {
    const response = await fetch(
      `${BASE_URL}/api/v1/woki/discover?restaurantId=R1&sectorId=S1&date=2025-10-22&partySize=4&duration=90`
    );

    if (response.status === 200 || response.status === 409) {
      successCount++;
    }

    if (i % 1000 === 0) {
      const currentMemory = process.memoryUsage();
      const heapUsedMB = (currentMemory.heapUsed / 1024 / 1024).toFixed(2);
      console.log(`  Progress: ${i}/${iterations} | Heap: ${heapUsedMB} MB`);
    }
  }

  const endMemory = process.memoryUsage();

  const startHeapMB = startMemory.heapUsed / 1024 / 1024;
  const endHeapMB = endMemory.heapUsed / 1024 / 1024;
  const increase = endHeapMB - startHeapMB;
  const increasePercent = (increase / startHeapMB) * 100;

  console.log('\n📊 Memory Leak Test Results:');
  console.log(`  Requests completed: ${successCount}/${iterations}`);
  console.log(`  Start heap:         ${startHeapMB.toFixed(2)} MB`);
  console.log(`  End heap:           ${endHeapMB.toFixed(2)} MB`);
  console.log(`  Increase:           ${increase.toFixed(2)} MB (${increasePercent.toFixed(1)}%)`);

  if (increasePercent < 50) {
    console.log('\n✅ PASS: No significant memory leak detected.');
  } else {
    console.log(
      `\n❌ FAIL: Possible memory leak. Heap increased ${increasePercent.toFixed(1)}%`
    );
  }
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║         🧪 WOKIBRAIN COMPREHENSIVE STRESS TESTS 🧪         ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('🔍 Testing server availability...');
  const healthCheck = await fetch(`${BASE_URL}/api/v1/health`);

  if (!healthCheck.ok) {
    console.log('❌ Server not responding. Start with: docker-compose up');
    process.exit(1);
  }

  console.log('✅ Server is up!\n');

  await testConcurrentBookings();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await testIdempotency();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await testRateLimiting();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await testMemoryLeak();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║              ✅ ALL STRESS TESTS COMPLETE ✅               ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📝 Next steps:');
  console.log('  1. Review results above');
  console.log('  2. Run k6 for advanced scenarios: npm run benchmark:k6');
  console.log('  3. Run artillery for sustained load: npm run benchmark:artillery');
  console.log('  4. Profile with clinic: npm run benchmark:profile\n');
}

main().catch(console.error);



