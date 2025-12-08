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
        { duration: '30s', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
    },
    booking_stress: {
      executor: 'ramping-arrival-rate',
      exec: 'bookingScenario',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 10,
      maxVUs: 50,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
    },
    spike_test: {
      executor: 'ramping-vus',
      exec: 'spikeScenario',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '10s', target: 20 },
        { duration: '20s', target: 20 },
        { duration: '10s', target: 5 },
        { duration: '10s', target: 0 },
      ],
      startTime: '2m',
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
    ['GET', `${BASE_URL}/api/v1/woki/bookings?restaurantId=R1&sectorId=S1&date=2025-10-22`],
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
  const summary = data.metrics || {};
  const httpDuration = summary.http_req_duration?.values || {};
  const httpReqs = summary.http_reqs?.values || {};
  const httpFailed = summary.http_req_failed?.values || {};

  const safeToFixed = (value) => {
    if (value == null || value === undefined || isNaN(value)) {
      return '0.00';
    }
    try {
      return Number(value).toFixed(2);
    } catch (e) {
      return '0.00';
    }
  };

  const safeNumber = (value, defaultValue = 0) => {
    if (value == null || value === undefined || isNaN(value)) {
      return defaultValue;
    }
    return Number(value);
  };

  // k6 stores percentiles in different format
  const p50 = httpDuration['p(50)'] || httpDuration.med || httpDuration.p50 || 0;
  const p95 = httpDuration['p(95)'] || httpDuration.p95 || 0;
  const p99 = httpDuration['p(99)'] || httpDuration.p99 || 0;
  const avg = httpDuration.avg || httpDuration.mean || 0;
  const max = httpDuration.max || 0;

  return `
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              🔥 K6 LOAD TEST RESULTS 🔥                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

📊 HTTP Metrics:
  Requests:           ${safeNumber(httpReqs.count, 0)}
  Duration:           ${safeToFixed(avg)}ms (avg)
  P50:                ${safeToFixed(p50)}ms
  P95:                ${safeToFixed(p95)}ms
  P99:                ${safeToFixed(p99)}ms
  Max:                ${safeToFixed(max)}ms

🎯 Custom Metrics:
  Successful Bookings: ${safeNumber(summary.successful_bookings?.values?.count, 0)}
  Failed Bookings:     ${safeNumber(summary.failed_bookings?.values?.count, 0)}
  Error Rate:          ${safeToFixed((httpFailed.rate || summary.errors?.values?.rate || 0) * 100)}%

✅ Status Codes:
  2xx:                ${safeNumber(summary['http_req_duration{status:200}']?.values?.count || summary.http_req_duration?.values?.['2xx'] || 0, 0)}
  4xx:                ${safeNumber(summary['http_req_duration{status:400}']?.values?.count || summary.http_req_duration?.values?.['4xx'] || 0, 0)}
  5xx:                ${safeNumber(summary['http_req_duration{status:500}']?.values?.count || summary.http_req_duration?.values?.['5xx'] || 0, 0)}

🚀 Throughput:
  Req/sec:            ${safeToFixed(httpReqs.rate)}
  Data received:      ${safeToFixed(safeNumber(summary.data_received?.values?.count, 0) / 1024 / 1024)} MB
  Data sent:          ${safeToFixed(safeNumber(summary.data_sent?.values?.count, 0) / 1024 / 1024)} MB

⏱️ Virtual Users:
  Max VUs:            ${safeNumber(summary.vus_max?.values?.value, 0)}

${safeNumber(p95, 0) < 500 ? '✅ PASS: P95 < 500ms' : '❌ FAIL: P95 > 500ms'}
${safeNumber(httpFailed.rate || summary.errors?.values?.rate || 0, 0) < 0.05 ? '✅ PASS: Error rate < 5%' : '❌ FAIL: Error rate > 5%'}

`;
}
