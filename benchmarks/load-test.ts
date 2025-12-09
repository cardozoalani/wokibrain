import autocannon from 'autocannon';
import { faker } from '@faker-js/faker';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface LoadTestOptions {
  connections: number;
  duration: number;
  pipelining: number;
  name: string;
}

interface TestScenario {
  name: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  setupRequest?: (requestParams: any) => any;
}

const scenarios: TestScenario[] = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/api/v1/health',
  },
  {
    name: 'Discover Seats',
    method: 'GET',
    path: '/api/v1/woki/discover',
    setupRequest: (req) => {
      const dates = ['2025-10-22', '2025-10-23', '2025-10-24'];
      const partySizes = [2, 4, 6, 8];
      const durations = [60, 90, 120];

      return {
        ...req,
        path: `${req.path}?restaurantId=R1&sectorId=S1&date=${faker.helpers.arrayElement(dates)}&partySize=${faker.helpers.arrayElement(partySizes)}&duration=${faker.helpers.arrayElement(durations)}`,
      };
    },
  },
  {
    name: 'Create Booking',
    method: 'POST',
    path: '/api/v1/woki/bookings',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': '',
    },
    setupRequest: (req) => {
      return {
        ...req,
        headers: {
          ...req.headers,
          'Idempotency-Key': faker.string.uuid(),
        },
        body: JSON.stringify({
          restaurantId: 'R1',
          sectorId: 'S1',
          partySize: faker.number.int({ min: 2, max: 8 }),
          durationMinutes: faker.helpers.arrayElement([60, 90, 120]),
          date: faker.helpers.arrayElement(['2025-10-22', '2025-10-23']),
          windowStart: '20:00',
          windowEnd: '23:45',
        }),
      };
    },
  },
  {
    name: 'List Bookings',
    method: 'GET',
    path: '/api/v1/woki/bookings',
    setupRequest: (req) => {
      return {
        ...req,
        path: `${req.path}?restaurantId=R1&sectorId=S1&date=2025-10-22`,
      };
    },
  },
];

async function runLoadTest(scenario: TestScenario, options: LoadTestOptions): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔥 Running: ${scenario.name}`);
  console.log(`${'='.repeat(60)}\n`);

  const config: any = {
    url: `${BASE_URL}${scenario.path}`,
    method: scenario.method,
    connections: options.connections,
    duration: options.duration,
    pipelining: options.pipelining,
    headers: scenario.headers || {},
  };

  if (scenario.setupRequest) {
    config.setupClient = (client: any) => {
      client.setRequestGenerator((req: any) => scenario.setupRequest!(req));
    };
  }

  if (scenario.body) {
    config.body = JSON.stringify(scenario.body);
  }

  const result = await autocannon(config);

  console.log('\n📊 Results:');
  console.log(`  Requests:       ${result.requests.total}`);
  console.log(`  Duration:       ${result.duration}s`);
  console.log(`  Req/sec:        ${result.requests.average.toFixed(2)}`);
  console.log(`  Throughput:     ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(`  Latency:`);
  console.log(`    Mean:         ${result.latency.mean.toFixed(2)}ms`);
  console.log(`    P50:          ${result.latency.p50.toFixed(2)}ms`);
  console.log(`    P95:          ${result.latency.p95.toFixed(2)}ms`);
  console.log(`    P99:          ${result.latency.p99.toFixed(2)}ms`);
  console.log(`    Max:          ${result.latency.max.toFixed(2)}ms`);
  console.log(`  Errors:         ${result.errors}`);
  console.log(`  Timeouts:       ${result.timeouts}`);
  console.log(`  2xx responses:  ${result['2xx'] || 0}`);
  console.log(`  4xx responses:  ${result['4xx'] || 0}`);
  console.log(`  5xx responses:  ${result['5xx'] || 0}`);
}

async function main(): Promise<void> {
  console.log('\n🚀 WokiBrain Load Testing Suite\n');

  const testConfigs: LoadTestOptions[] = [
    {
      name: 'Light Load',
      connections: 10,
      duration: 10,
      pipelining: 1,
    },
    {
      name: 'Medium Load',
      connections: 50,
      duration: 30,
      pipelining: 1,
    },
    {
      name: 'Heavy Load',
      connections: 100,
      duration: 30,
      pipelining: 1,
    },
    {
      name: 'Extreme Load',
      connections: 200,
      duration: 60,
      pipelining: 10,
    },
  ];

  const selectedConfig = testConfigs[1];

  for (const scenario of scenarios) {
    await runLoadTest(scenario, selectedConfig);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log('\n✅ Load testing complete!\n');
}

main().catch(console.error);



