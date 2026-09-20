/**
 * Telemetry & Observability Metrics Service for AnymChat
 * Tracks operational counters, rates, and latency distributions
 */
export class MetricsService {
  private static counters = {
    messagesReceivedFeed: 0,
    messagesReceivedDirect: 0,
    messagesPersisted: 0,
    messagesDuplicateDeduped: 0,
    messagesRejectedRateLimit: 0,
    messagesRejectedSafetyOrPii: 0,
    messagesRejectedPayloadSize: 0,
    socketConnections: 0,
    socketDisconnects: 0,
    rateLimitHits: 0,
    archiveJobsSuccess: 0,
    archiveJobsFailed: 0,
    redisErrors: 0,
    mongoErrors: 0,
  };

  private static latencySamples: number[] = [];
  private static maxLatencySamples = 5000;

  public static increment(metric: keyof typeof MetricsService.counters, by: number = 1): void {
    if (this.counters[metric] !== undefined) {
      this.counters[metric] += by;
    }
  }

  public static recordLatency(ms: number): void {
    this.latencySamples.push(ms);
    if (this.latencySamples.length > this.maxLatencySamples) {
      this.latencySamples.shift();
    }
  }

  public static getMetrics(): {
    counters: typeof MetricsService.counters;
    latency: {
      p50: number;
      p95: number;
      p99: number;
      avg: number;
      sampleCount: number;
    };
    system: {
      uptimeSeconds: number;
      heapUsedMB: number;
      heapTotalMB: number;
      rssMB: number;
    };
  } {
    const memory = process.memoryUsage();
    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const count = sorted.length;

    const p50 = count > 0 ? sorted[Math.floor(count * 0.5)] : 0;
    const p95 = count > 0 ? sorted[Math.floor(count * 0.95)] : 0;
    const p99 = count > 0 ? sorted[Math.floor(count * 0.99)] : 0;
    const avg = count > 0 ? sorted.reduce((sum, v) => sum + v, 0) / count : 0;

    return {
      counters: { ...this.counters },
      latency: {
        p50: Math.round(p50 * 100) / 100,
        p95: Math.round(p95 * 100) / 100,
        p99: Math.round(p99 * 100) / 100,
        avg: Math.round(avg * 100) / 100,
        sampleCount: count,
      },
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        heapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMB: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
        rssMB: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      },
    };
  }

  public static resetForBenchmark(): void {
    for (const key of Object.keys(this.counters) as (keyof typeof MetricsService.counters)[]) {
      this.counters[key] = 0;
    }
    this.latencySamples = [];
  }
}
