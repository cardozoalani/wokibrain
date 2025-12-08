interface Benchmark {
  name: string;
  baseline: number;
  threshold: number;
}

// Detect if we're testing production (has https:// or wokibrain.grgcrew.com)
const isProduction =
  process.env.BASE_URL?.includes('https://') ||
  process.env.BASE_URL?.includes('wokibrain.grgcrew.com');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Adjust baselines for production (accounting for network latency)
const benchmarks: Benchmark[] = isProduction
  ? [
      { name: 'Health Check', baseline: 150, threshold: 300 }, // Production: ~175ms observed
      { name: 'Discovery', baseline: 150, threshold: 300 }, // Production: ~170ms observed
      { name: 'Create Booking', baseline: 200, threshold: 400 },
      { name: 'List Bookings', baseline: 150, threshold: 300 }, // Production: ~171ms observed
    ]
  : [
      { name: 'Health Check', baseline: 5, threshold: 10 }, // Localhost
      { name: 'Discovery', baseline: 100, threshold: 200 },
      { name: 'Create Booking', baseline: 150, threshold: 300 },
      { name: 'List Bookings', baseline: 50, threshold: 100 },
    ];

async function measureLatency(url: string, iterations: number = 100): Promise<number[]> {
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await fetch(url);
    latencies.push(Date.now() - start);
  }

  return latencies;
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

async function runBenchmark(
  name: string,
  url: string,
  baseline: number,
  threshold: number
): Promise<boolean> {
  console.log(`\n📊 Benchmarking: ${name}`);
  console.log(`  Baseline: ${baseline}ms | Threshold: ${threshold}ms`);

  const latencies = await measureLatency(url);

  const mean = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
  const p50 = calculatePercentile(latencies, 50);
  const p95 = calculatePercentile(latencies, 95);
  const p99 = calculatePercentile(latencies, 99);

  console.log(`  Mean:     ${mean.toFixed(2)}ms`);
  console.log(`  P50:      ${p50.toFixed(2)}ms`);
  console.log(`  P95:      ${p95.toFixed(2)}ms`);
  console.log(`  P99:      ${p99.toFixed(2)}ms`);

  const regressionPercent = ((p95 - baseline) / baseline) * 100;

  if (p95 <= baseline) {
    console.log(`  ✅ PASS: P95 (${p95.toFixed(2)}ms) within baseline (${baseline}ms)`);
    return true;
  } else if (p95 <= threshold) {
    console.log(
      `  ⚠️  WARNING: P95 (${p95.toFixed(2)}ms) above baseline but within threshold (${threshold}ms)`
    );
    console.log(`  Regression: ${regressionPercent.toFixed(1)}%`);
    return true;
  } else {
    console.log(`  ❌ FAIL: P95 (${p95.toFixed(2)}ms) exceeds threshold (${threshold}ms)`);
    console.log(`  Regression: ${regressionPercent.toFixed(1)}%`);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║         📈 PERFORMANCE REGRESSION TESTING 📈               ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results: boolean[] = [];

  results.push(
    await runBenchmark(
      'Health Check',
      `${BASE_URL}/api/v1/health`,
      benchmarks[0].baseline,
      benchmarks[0].threshold
    )
  );

  results.push(
    await runBenchmark(
      'Discovery',
      `${BASE_URL}/api/v1/woki/discover?restaurantId=R1&sectorId=S1&date=2025-10-22&partySize=4&duration=90`,
      benchmarks[1].baseline,
      benchmarks[1].threshold
    )
  );

  results.push(
    await runBenchmark(
      'List Bookings',
      `${BASE_URL}/api/v1/woki/bookings?restaurantId=R1&sectorId=S1&date=2025-10-22`,
      benchmarks[3].baseline,
      benchmarks[3].threshold
    )
  );

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║                    📊 SUMMARY 📊                           ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log(`  Tests passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('\n  ✅ ALL BENCHMARKS PASSED\n');
    process.exit(0);
  } else {
    console.log('\n  ❌ SOME BENCHMARKS FAILED\n');
    process.exit(1);
  }
}

main().catch(console.error);
