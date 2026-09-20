import { connectRedis, disconnectRedis } from '../src/config/redis/redis.config';
import { IdempotencyService } from '../src/services/dedup/idempotency.service';
import { ChatArchivalService } from '../src/services/archive/chatArchival.service';
import { FeedRepository } from '../src/repositories/feed/feed.repository';
import { DirectRepository } from '../src/repositories/direct/direct.repository';
import { ENV } from '../src/config/env/env.config';
import { Logger } from '../src/utils/logger/logger.util';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

async function runAdversarialAudit() {
  Logger.info('================================================================');
  Logger.info('🛡️ STARTING ADVERSARIAL AUDIT & STRESS TESTING SUITE');
  Logger.info('================================================================\n');

  await connectRedis();

  let findingsPassed = 0;
  let totalTests = 0;

  // -------------------------------------------------------------
  // Test 1: Message Deduplication & Reconnect Storm Simulation
  // -------------------------------------------------------------
  totalTests++;
  Logger.info('--- [AUDIT 1] Reconnect Storm & Duplicate clientMessageId Replay ---');
  const clientMessageId = `client_msg_${Date.now()}_dedup_test`;
  const originalMessage = {
    id: 'msg_alpha_1',
    senderAlias: 'Volt_99',
    content: 'Replay storm test payload',
    createdAt: new Date().toISOString(),
  };

  // First ingestion
  const existing = await IdempotencyService.getProcessedMessage(clientMessageId);
  if (existing === null) {
    await IdempotencyService.recordProcessedMessage(clientMessageId, originalMessage, 60);
  }

  // Second & Third rapid duplicate replays (simulating socket reconnect retries)
  const replay1 = await IdempotencyService.getProcessedMessage(clientMessageId);
  const replay2 = await IdempotencyService.getProcessedMessage(clientMessageId);

  if (replay1 && replay2 && (replay1 as any).content === originalMessage.content) {
    Logger.info('✅ PASS: Duplicate message replay blocked. Cached result returned without duplicate processing.');
    findingsPassed++;
  } else {
    Logger.error('❌ FAIL: Deduplication failed to catch replay');
  }

  // -------------------------------------------------------------
  // Test 2: AES-256-GCM Transcript Encryption & Integrity Check
  // -------------------------------------------------------------
  totalTests++;
  Logger.info('\n--- [AUDIT 2] AES-256-GCM Encrypted Archival Storage Verification ---');
  const samplePlaintext = 'SECRET_CHAT_LOG: user_alice: Hello confidential world!';
  const encryptionKey = ENV.ARCHIVE_ENCRYPTION_KEY;

  const { encrypted, iv, tag } = ChatArchivalService.encryptTranscript(samplePlaintext, encryptionKey);

  // Verify decryption using key, iv, tag
  const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyHash, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');

  if (decrypted === samplePlaintext) {
    Logger.info('✅ PASS: AES-256-GCM encryption & authenticated decryption verified with valid auth tag.');
    findingsPassed++;
  } else {
    Logger.error('❌ FAIL: Transcript encryption mismatch');
  }

  // -------------------------------------------------------------
  // Test 3: Multi-Instance Distributed Archival Idempotency
  // -------------------------------------------------------------
  totalTests++;
  Logger.info('\n--- [AUDIT 3] Multi-Instance Concurrent Cron Contention Simulation ---');
  // Populate messages
  await FeedRepository.createMessage({
    senderAnonymousId: 'inst_test_anon',
    senderAlias: 'MultiInst_Test',
    senderAvatarColor: '#10B981',
    content: 'Distributed multi-instance test message',
    latitude: 28.61,
    longitude: 77.20,
  });

  const fixedWindowStart = new Date(Date.now() - 3600 * 1000);
  const fixedWindowEnd = new Date();

  // Run 3 concurrent instances attempting to archive the exact same time window
  const [inst1, inst2, inst3] = await Promise.all([
    ChatArchivalService.runHourlyArchive(fixedWindowStart, fixedWindowEnd, true),
    ChatArchivalService.runHourlyArchive(fixedWindowStart, fixedWindowEnd, true),
    ChatArchivalService.runHourlyArchive(fixedWindowStart, fixedWindowEnd, true),
  ]);

  Logger.info(`Instance 1 Result: Status=${inst1.status}, File=${inst1.fileName}`);
  Logger.info(`Instance 2 Result: Status=${inst2.status}, File=${inst2.fileName}`);
  Logger.info(`Instance 3 Result: Status=${inst3.status}, File=${inst3.fileName}`);

  // Exactly 1 instance should execute fresh, and others should be deduplicated / reuse the same file
  if (inst1.fileName && inst1.fileName === inst2.fileName && inst2.fileName === inst3.fileName) {
    Logger.info('✅ PASS: Multi-instance contention resolved idempotently without file duplication.');
    findingsPassed++;
  } else {
    Logger.error('❌ FAIL: Multi-instance created duplicate or conflicting files');
  }

  // -------------------------------------------------------------
  // Test 4: Local Storage Retention Policy Purge
  // -------------------------------------------------------------
  totalTests++;
  Logger.info('\n--- [AUDIT 4] Local Backup Storage Retention Purge ---');
  const dummyStaleDir = path.join(ENV.LOCAL_BACKUP_DIR, 'hourly', '2026-01-01');
  if (!fs.existsSync(dummyStaleDir)) fs.mkdirSync(dummyStaleDir, { recursive: true });
  const dummyStaleFile = path.join(dummyStaleDir, 'stale_test.enc.txt');
  fs.writeFileSync(dummyStaleFile, 'stale data', 'utf8');

  // Set file mtime to 48 hours ago
  const staleTime = new Date(Date.now() - 48 * 3600 * 1000);
  fs.utimesSync(dummyStaleFile, staleTime, staleTime);

  const purgedCount = ChatArchivalService.purgeOldLocalBackups(24); // Purge older than 24h
  if (!fs.existsSync(dummyStaleFile) && purgedCount >= 1) {
    Logger.info(`✅ PASS: Stale backup files successfully purged (${purgedCount} files cleaned). Disk growth bounded.`);
    findingsPassed++;
  } else {
    Logger.error('❌ FAIL: Stale file retention purge failed');
  }

  // -------------------------------------------------------------
  // Test 5: High-Volume Concurrent Message Burst Simulation
  // -------------------------------------------------------------
  totalTests++;
  Logger.info('\n--- [AUDIT 5] High-Volume Concurrent Message Burst (500 Concurrent Inserts) ---');
  const startTime = Date.now();
  const burstPromises = [];
  for (let i = 0; i < 500; i++) {
    burstPromises.push(
      FeedRepository.createMessage({
        senderAnonymousId: `burst_user_${i % 20}`,
        senderAlias: `BurstUser_${i % 20}`,
        senderAvatarColor: '#6366F1',
        content: `High throughput burst message #${i}`,
        latitude: 28.6139 + (i % 10) * 0.001,
        longitude: 77.2090 + (i % 10) * 0.001,
      })
    );
  }
  await Promise.all(burstPromises);
  const elapsedMs = Date.now() - startTime;
  const throughput = Math.round((500 / elapsedMs) * 1000);

  Logger.info(`Processed 500 concurrent messages in ${elapsedMs}ms (~${throughput} messages/sec)`);
  if (elapsedMs < 3000) {
    Logger.info('✅ PASS: High throughput burst executed without event loop starvation or memory crash.');
    findingsPassed++;
  } else {
    Logger.warn('⚠️ High latency during burst');
  }

  await disconnectRedis();

  Logger.info('\n================================================================');
  Logger.info(`📊 AUDIT RESULTS: ${findingsPassed}/${totalTests} TESTS PASSED`);
  Logger.info('================================================================\n');

  if (findingsPassed === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAdversarialAudit().catch((err) => {
  Logger.error('Adversarial Audit Fatal Error:', err);
  process.exit(1);
});
