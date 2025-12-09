import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const bookingTrend = new Trend('booking_duration');
const discoveryTrend = new Trend('discovery_duration');
const successfulBookings = new Counter('successful_bookings');
const failedBookings = new Counter('failed_bookings');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    discovery_load: {
      executor: 'ramping-vus',
      exec: 'discoveryScenario',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 0 },
      ],
    },
    booking_stress: {
      executor: 'ramping-arrival-rate',
      exec: 'bookingScenario',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 0 },
      ],
    },
    spike_test: {
      executor: 'ramping-vus',
      exec: 'spikeScenario',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '10s', target: 500 },
        { duration: '30s', target: 500 },
        { duration: '10s', target: 10 },
        { duration: '10s', target: 0 },
      ],
      startTime: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
    booking_duration: ['p(95)<200'],
    discovery_duration: ['p(95)<300'],
  },
};

const restaurants = ['R1'];
const sectors = ['S1'];
const dates = ['2025-10-22', '2025-10-23', '2025-10-24', '2025-10-25'];
const partySizes = [2, 3, 4, 5, 6, 8];
const durations = [60, 75, 90, 120];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function discoveryScenario() {
  const restaurantId = randomElement(restaurants);
  const sectorId = randomElement(sectors);
  const date = randomElement(dates);
  const partySize = randomElement(partySizes);
  const duration = randomElement(durations);

  const url = `${BASE_URL}/api/v1/woki/discover?restaurantId=${restaurantId}&sectorId=${sectorId}&date=${date}&partySize=${partySize}&duration=${duration}&windowStart=20:00&windowEnd=23:45`;

  const response = http.get(url);

  discoveryTrend.add(response.timings.duration);

  const success = check(response, {
    'status is 200 or 409': (r) => r.status === 200 || r.status === 409,
    'has candidates or error': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return body.candidates !== undefined;
      }
      return true;
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
  sleep(0.5);
}

export function bookingScenario() {
  const restaurantId = randomElement(restaurants);
  const sectorId = randomElement(sectors);
  const date = randomElement(dates);
  const partySize = randomElement(partySizes);
  const duration = randomElement(durations);

  const payload = JSON.stringify({
    restaurantId,
    sectorId,
    partySize,
    durationMinutes: duration,
    date,
    windowStart: '20:00',
    windowEnd: '23:45',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': generateIdempotencyKey(),
    },
  };

  const response = http.post(`${BASE_URL}/api/v1/woki/bookings`, payload, params);

  bookingTrend.add(response.timings.duration);

  const success = check(response, {
    'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
    'booking created or conflict': (r) => {
      if (r.status === 201) {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      }
      return r.status === 409;
    },
    'response time < 300ms': (r) => r.timings.duration < 300,
  });

  if (response.status === 201) {
    successfulBookings.add(1);
  } else if (response.status === 409) {
    failedBookings.add(1);
  }

  errorRate.add(!success);
  sleep(1);
}

export function spikeScenario() {
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/v1/health`],
    [
      'GET',
      `${BASE_URL}/api/v1/woki/discover?restaurantId=R1&sectorId=S1&date=2025-10-22&partySize=4&duration=90`,
    ],
    [
      'GET',
      `${BASE_URL}/api/v1/woki/bookings?restaurantId=R1&sectorId=S1&date=2025-10-22`,
    ],
  ]);

  check(responses[0], {
    'health check OK': (r) => r.status === 200,
  });

  check(responses[1], {
    'discovery OK': (r) => r.status === 200 || r.status === 409,
  });

  check(responses[2], {
    'list bookings OK': (r) => r.status === 200,
  });
}

export function handleSummary(data) {
  return {
    'benchmarks/results/summary.json': JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data),
  };
}

function generateTextSummary(data) {
  const summary = data.metrics;

  return `
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              🔥 K6 LOAD TEST RESULTS 🔥                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

📊 HTTP Metrics:
  Requests:           ${summary.http_reqs.values.count}
  Duration:           ${summary.http_req_duration.values.avg.toFixed(2)}ms (avg)
  P50:                ${summary.http_req_duration.values.p50.toFixed(2)}ms
  P95:                ${summary.http_req_duration.values.p95.toFixed(2)}ms
  P99:                ${summary.http_req_duration.values.p99.toFixed(2)}ms
  Max:                ${summary.http_req_duration.values.max.toFixed(2)}ms

🎯 Custom Metrics:
  Successful Bookings: ${summary.successful_bookings ? summary.successful_bookings.values.count : 0}
  Failed Bookings:     ${summary.failed_bookings ? summary.failed_bookings.values.count : 0}
  Error Rate:          ${((summary.errors?.values.rate || 0) * 100).toFixed(2)}%

✅ Status Codes:
  2xx:                ${summary.http_req_duration?.values?.['2xx'] || 0}
  4xx:                ${summary.http_req_duration?.values?.['4xx'] || 0}
  5xx:                ${summary.http_req_duration?.values?.['5xx'] || 0}

🚀 Throughput:
  Req/sec:            ${(summary.http_reqs.values.rate || 0).toFixed(2)}
  Data received:      ${((summary.data_received?.values.count || 0) / 1024 / 1024).toFixed(2)} MB
  Data sent:          ${((summary.data_sent?.values.count || 0) / 1024 / 1024).toFixed(2)} MB

⏱️ Virtual Users:
  Max VUs:            ${summary.vus_max?.values.value || 0}

${summary.http_req_duration.values.p95 < 500 ? '✅ PASS: P95 < 500ms' : '❌ FAIL: P95 > 500ms'}
${(summary.errors?.values.rate || 0) < 0.05 ? '✅ PASS: Error rate < 5%' : '❌ FAIL: Error rate > 5%'}

`;
}



