import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import { FeedRepository } from '../src/repositories/feed/feed.repository';
import { DirectRepository } from '../src/repositories/direct/direct.repository';
import { FeedCacheService } from '../src/services/cache/feedCache.service';
import { IdempotencyService } from '../src/services/dedup/idempotency.service';
import { PiiGuard } from '../src/ai/pii/pii-guard';
import { MetricsService } from '../src/services/metrics/metrics.service';
import { Logger } from '../src/utils/logger/logger.util';

interface BenchmarkResult {
  concurrency: number;
  totalOperations: number;
  durationMs: number;
  throughputOpsPerSec: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  heapStartMB: number;
  heapEndMB: number;
  heapDiffMB: number;
  successRate: number;
}

function calculatePercentiles(latencies: number[]) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const count = sorted.length;
  return {
    p50: sorted[Math.floor(count * 0.50)] || 0,
    p95: sorted[Math.floor(count * 0.95)] || 0,
    p99: sorted[Math.floor(count * 0.99)] || 0,
    max: sorted[count - 1] || 0,
  };
}

async function runConcurrencyTier(concurrency: number, opsPerWorker: number): Promise<BenchmarkResult> {
  const totalOps = concurrency * opsPerWorker;
  const latencies: number[] = [];
  let successfulOps = 0;
  const piiGuard = new PiiGuard();

  // Force Garbage Collection if available or sample memory
  if (global.gc) global.gc();
  const heapStart = process.memoryUsage().heapUsed / 1024 / 1024;

  const startTime = performance.now();

  // Create worker promises
  const workers: Promise<void>[] = [];

  for (let c = 0; c < concurrency; c++) {
    const workerId = `user_${c}_${uuidv4().substring(0, 6)}`;
    const workerPromise = (async () => {
      for (let o = 0; o < opsPerWorker; o++) {
        const clientMsgId = `cmsg_${workerId}_${o}`;
        const opStart = performance.now();

        try {
          // 1. PII Safety Guard Check
          const piiResult = piiGuard.scan('Hey everyone nearby in Sector 62! Anyone free?', workerId);
          if (piiResult.blocked) continue;

          // 2. Feed Message Creation + Sorted Set Cache Ingestion
          const msg = await FeedRepository.createMessage({
            senderAnonymousId: workerId,
            senderAlias: `AnonUser_${c}`,
            senderAvatarColor: '#6366F1',
            clientMessageId: clientMsgId,
            content: `High throughput benchmark payload #${o} from worker ${c}`,
            latitude: 28.6139 + (Math.random() - 0.5) * 0.05,
            longitude: 77.209 + (Math.random() - 0.5) * 0.05,
          });

          // 3. Idempotency Cache Record
          await IdempotencyService.recordProcessedMessage(clientMsgId, msg);

          const opDuration = performance.now() - opStart;
          latencies.push(opDuration);
          successfulOps++;
        } catch (err) {
          // Record failure
        }
      }
    })();

    workers.push(workerPromise);
  }

  await Promise.all(workers);

  const durationMs = performance.now() - startTime;
  const heapEnd = process.memoryUsage().heapUsed / 1024 / 1024;
  const { p50, p95, p99, max } = calculatePercentiles(latencies);

  return {
    concurrency,
    totalOperations: totalOps,
    durationMs: Math.round(durationMs),
    throughputOpsPerSec: Math.round((successfulOps / (durationMs / 1000)) * 100) / 100,
    p50Ms: Math.round(p50 * 100) / 100,
    p95Ms: Math.round(p95 * 100) / 100,
    p99Ms: Math.round(p99 * 100) / 100,
    maxMs: Math.round(max * 100) / 100,
    heapStartMB: Math.round(heapStart * 100) / 100,
    heapEndMB: Math.round(heapEnd * 100) / 100,
    heapDiffMB: Math.round((heapEnd - heapStart) * 100) / 100,
    successRate: Math.round((successfulOps / totalOps) * 10000) / 100,
  };
}

async function runBenchmarkSuite() {
  Logger.info('================================================================');
  Logger.info('🚀 STARTING ANYMCHAT HIGH-CONCURRENCY EMPIRICAL BENCHMARK SUITE');
  Logger.info('================================================================\n');

  const concurrencyTiers = [
    { concurrency: 100, opsPerWorker: 10 },    // 1,000 operations
    { concurrency: 500, opsPerWorker: 4 },     // 2,000 operations
    { concurrency: 1000, opsPerWorker: 2 },    // 2,000 operations
    { concurrency: 2500, opsPerWorker: 1 },    // 2,500 operations
  ];

  const results: BenchmarkResult[] = [];

  for (const tier of concurrencyTiers) {
    Logger.info(
      `⏳ Running Benchmark Tier: ${tier.concurrency} Concurrent Workers (${tier.concurrency * tier.opsPerWorker} total pipeline ops)...`
    );
    const res = await runConcurrencyTier(tier.concurrency, tier.opsPerWorker);
    results.push(res);
    Logger.info(
      `📊 [Tier Result] Concurrency: ${res.concurrency} | Throughput: ${res.throughputOpsPerSec} ops/sec | p50: ${res.p50Ms}ms | p95: ${res.p95Ms}ms | p99: ${res.p99Ms}ms | Heap: ${res.heapEndMB}MB (Δ ${res.heapDiffMB}MB) | Success: ${res.successRate}%\n`
    );
  }

  Logger.info('================================================================');
  Logger.info('📋 FINAL EMPIRICAL BENCHMARK SUMMARY REPORT');
  Logger.info('================================================================\n');
  console.table(results);

  Logger.info('\n✅ Benchmark Suite Completed Successfully!\n');
}

runBenchmarkSuite().catch((err) => {
  Logger.error('Benchmark Suite encountered fatal error:', err);
  process.exit(1);
});
