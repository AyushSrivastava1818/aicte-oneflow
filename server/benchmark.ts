import http from 'http';
import fs from 'fs';
import path from 'path';

interface BenchmarkResult {
  totalRequests: number;
  concurrency: number;
  durationMs: number;
  throughputReqSec: number;
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
  errorCount: number;
  errorRate: number;
  dbSizeBytes: number;
}

function makeRequest(options: http.RequestOptions, postData?: string): Promise<{ statusCode: number; latencyMs: number }> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const latencyMs = performance.now() - start;
        resolve({ statusCode: res.statusCode || 500, latencyMs });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runBenchmark(): Promise<void> {
  console.log('================================================================');
  console.log('🏛️ AICTE OneFlow — Official Synthetic Stress & Latency Benchmark');
  console.log('================================================================');
  console.log(`Node.js Version : ${process.version}`);
  console.log(`OS Platform     : ${process.platform} ${process.arch}`);
  console.log(`Timestamp       : ${new Date().toISOString()}`);

  const port = 3001;
  const concurrency = 10;
  const totalRequests = 500;
  const warmupRequests = 50;

  const endpoints = [
    { path: '/api/applications', method: 'GET', weight: 35 },
    { path: '/api/applications/app-101', method: 'GET', weight: 25 },
    { path: '/api/undertakings', method: 'GET', weight: 15 },
    { path: '/api/evc', method: 'GET', weight: 10 },
    { path: '/api/audit/verify', method: 'GET', weight: 10 },
    { path: '/api/notifications/reconcile', method: 'POST', weight: 5 },
  ];

  // Warm-up phase
  console.log(`\n1. Running warm-up (${warmupRequests} requests)...`);
  for (let i = 0; i < warmupRequests; i++) {
    await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/applications',
      method: 'GET',
      headers: {
        'x-simulated-role': 'CENTRAL_ADMIN',
      },
    });
  }
  console.log('   ✓ Warm-up completed.');

  // Benchmark phase
  console.log(`\n2. Executing benchmark (${totalRequests} requests, Concurrency: ${concurrency})...`);
  const latencies: number[] = [];
  let errorCount = 0;
  let completed = 0;

  const startTime = performance.now();

  async function worker() {
    while (completed < totalRequests) {
      const currentIdx = completed++;
      if (currentIdx >= totalRequests) break;

      // Select endpoint based on weights
      const rand = Math.random() * 100;
      let cum = 0;
      let selected = endpoints[0];
      for (const ep of endpoints) {
        cum += ep.weight;
        if (rand <= cum) {
          selected = ep;
          break;
        }
      }

      try {
        const res = await makeRequest({
          hostname: 'localhost',
          port,
          path: selected.path,
          method: selected.method,
          headers: {
            'x-simulated-role': 'CENTRAL_ADMIN',
            'Content-Type': 'application/json',
          },
        });

        latencies.push(res.latencyMs);
        if (res.statusCode >= 400 && res.statusCode !== 409) {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const durationMs = performance.now() - startTime;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const throughputReqSec = (latencies.length / durationMs) * 1000;

  const dbPath = path.resolve(process.cwd(), 'data', 'aicte_oneflow.sqlite');
  let dbSizeBytes = 0;
  try {
    if (fs.existsSync(dbPath)) {
      dbSizeBytes = fs.statSync(dbPath).size;
    }
  } catch {}

  const result: BenchmarkResult = {
    totalRequests: latencies.length,
    concurrency,
    durationMs,
    throughputReqSec,
    latencies,
    p50,
    p95,
    p99,
    errorCount,
    errorRate: (errorCount / latencies.length) * 100,
    dbSizeBytes,
  };

  console.log('\n================================================================');
  console.log('📊 MEASURED BENCHMARK RESULTS');
  console.log('================================================================');
  console.log(`Total Requests Tested : ${result.totalRequests}`);
  console.log(`Concurrency Level     : ${result.concurrency}`);
  console.log(`Total Duration        : ${(result.durationMs / 1000).toFixed(2)} seconds`);
  console.log(`Throughput            : ${result.throughputReqSec.toFixed(1)} req/sec`);
  console.log(`p50 Latency (Median)  : ${result.p50.toFixed(2)} ms`);
  console.log(`p95 Latency           : ${result.p95.toFixed(2)} ms`);
  console.log(`p99 Latency           : ${result.p99.toFixed(2)} ms`);
  console.log(`Error Count / Rate    : ${result.errorCount} (${result.errorRate.toFixed(2)}%)`);
  console.log(`SQLite Database Size  : ${(result.dbSizeBytes / 1024).toFixed(1)} KB`);
  console.log('================================================================\n');
}

runBenchmark().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
