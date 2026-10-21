import http from 'http';
import fs from 'fs';
import path from 'path';

interface BenchmarkMetrics {
  totalRequests: number;
  concurrency: number;
  durationMs: number;
  throughputReqSec: number;
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  status2xx: number;
  status409Conflicts: number;
  status4xxClientErrors: number;
  status5xxServerErrors: number;
  networkErrors: number;
  dbSizeBytes: number;
}

function makeRequest(
  options: http.RequestOptions,
  postData?: string
): Promise<{ statusCode: number; latencyMs: number; body: string }> {
  return new Promise((resolve) => {
    const start = performance.now();
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        const latencyMs = performance.now() - start;
        resolve({ statusCode: res.statusCode || 500, latencyMs, body });
      });
    });

    req.on('error', (err) => {
      const latencyMs = performance.now() - start;
      resolve({ statusCode: 0, latencyMs, body: err.message });
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
  let status2xx = 0;
  let status409Conflicts = 0;
  let status4xxClientErrors = 0;
  let status5xxServerErrors = 0;
  let networkErrors = 0;
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

      if (res.statusCode >= 200 && res.statusCode < 300) {
        status2xx++;
      } else if (res.statusCode === 409) {
        status409Conflicts++;
      } else if (res.statusCode >= 400 && res.statusCode < 500) {
        status4xxClientErrors++;
      } else if (res.statusCode >= 500) {
        status5xxServerErrors++;
      } else {
        networkErrors++;
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
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const throughputReqSec = (latencies.length / durationMs) * 1000;

  const dbPath = path.resolve(process.cwd(), 'data', 'aicte_oneflow.sqlite');
  let dbSizeBytes = 0;
  try {
    if (fs.existsSync(dbPath)) {
      dbSizeBytes = fs.statSync(dbPath).size;
    }
  } catch {}

  const metrics: BenchmarkMetrics = {
    totalRequests: latencies.length,
    concurrency,
    durationMs,
    throughputReqSec,
    latencies,
    p50,
    p95,
    p99,
    min,
    max,
    status2xx,
    status409Conflicts,
    status4xxClientErrors,
    status5xxServerErrors,
    networkErrors,
    dbSizeBytes,
  };

  const successRate = ((metrics.status2xx / metrics.totalRequests) * 100).toFixed(2);
  const conflictRate = ((metrics.status409Conflicts / metrics.totalRequests) * 100).toFixed(2);
  const clientErrRate = ((metrics.status4xxClientErrors / metrics.totalRequests) * 100).toFixed(2);
  const serverErrRate = ((metrics.status5xxServerErrors / metrics.totalRequests) * 100).toFixed(2);

  console.log('\n================================================================');
  console.log('📊 MEASURED BENCHMARK BREAKDOWN & RELIABILITY REPORT');
  console.log('================================================================');
  console.log(`Total Requests Executed      : ${metrics.totalRequests}`);
  console.log(`Concurrency Level            : ${metrics.concurrency} parallel workers`);
  console.log(`Total Wall-Clock Duration    : ${(metrics.durationMs / 1000).toFixed(2)} seconds`);
  console.log(`Throughput                   : ${metrics.throughputReqSec.toFixed(1)} req/sec`);
  console.log('----------------------------------------------------------------');
  console.log(`Latency min                  : ${metrics.min.toFixed(2)} ms`);
  console.log(`Latency p50 (Median)         : ${metrics.p50.toFixed(2)} ms`);
  console.log(`Latency p95                  : ${metrics.p95.toFixed(2)} ms`);
  console.log(`Latency p99                  : ${metrics.p99.toFixed(2)} ms`);
  console.log(`Latency max                  : ${metrics.max.toFixed(2)} ms`);
  console.log('----------------------------------------------------------------');
  console.log(`Successful Responses (2xx)   : ${metrics.status2xx} (${successRate}%)`);
  console.log(`Expected Optimistic Conflicts: ${metrics.status409Conflicts} (${conflictRate}%) [HTTP 409]`);
  console.log(`Unexpected Client Errors     : ${metrics.status4xxClientErrors} (${clientErrRate}%) [HTTP 4xx]`);
  console.log(`Server Errors                : ${metrics.status5xxServerErrors} (${serverErrRate}%) [HTTP 5xx]`);
  console.log(`Network / Timeout Failures   : ${metrics.networkErrors}`);
  console.log(`Authoritative Database Size  : ${(metrics.dbSizeBytes / 1024).toFixed(1)} KB`);
  console.log('================================================================\n');
}

runBenchmark().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
