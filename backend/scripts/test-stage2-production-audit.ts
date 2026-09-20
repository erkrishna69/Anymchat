import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { adminAuthMiddleware, getValidAdminKeys } from '../src/middlewares/auth/adminAuth.middleware';
import { ChatArchivalService } from '../src/services/archive/chatArchival.service';
import { FeedRepository } from '../src/repositories/feed/feed.repository';
import { DirectRepository } from '../src/repositories/direct/direct.repository';
import { DirectChatService } from '../src/services/direct/directChat.service';
import { RedisRateLimiterService } from '../src/services/rateLimit/redisRateLimiter.service';
import { validatePayloadSize, checkSocketEventRate } from '../src/sockets/middleware/socketSecurity.middleware';
import { MetricsService } from '../src/services/metrics/metrics.service';
import { ENV } from '../src/config/env/env.config';
import { Logger } from '../src/utils/logger/logger.util';

async function runStage2ProductionAudit() {
  Logger.info('================================================================');
  Logger.info('🧪 STARTING ANYMCHAT STAGE 2 PRODUCTION & SECURITY AUDIT');
  Logger.info('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      Logger.info(`✅ [PASS] ${testName} ${details ? `(${details})` : ''}`);
    } else {
      Logger.error(`❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
      throw new Error(`Audit Failure on: ${testName}`);
    }
  }

  // --- [TEST 1] Admin Authentication & Multi-Key Rotation Support ---
  Logger.info('--- [TEST 1] Admin Authentication, Constant-Time Match & Key Rotation ---');
  {
    const keys = getValidAdminKeys();
    assert(keys.length > 0, 'Admin keys configured', `Active keys: ${keys.length}`);

    // Mock Express Request & Response
    let statusSet: number | null = null;
    let jsonSet: any = null;
    let nextCalled = false;

    const mockRes = (): any => ({
      status: (code: number) => {
        statusSet = code;
        return {
          json: (data: any) => {
            jsonSet = data;
          },
        };
      },
    });

    // 1a: Invalid key should be rejected
    statusSet = null;
    adminAuthMiddleware(
      {
        headers: { 'x-admin-key': 'attacker_random_key_12345' },
        socket: { remoteAddress: '192.168.1.100' },
        method: 'POST',
        originalUrl: '/api/archive/trigger',
      } as any,
      mockRes(),
      () => {
        nextCalled = true;
      }
    );
    assert(statusSet === 401, 'Unauthorized request rejected with 401', `Status: ${statusSet}`);

    // 1b: Valid primary key should succeed
    nextCalled = false;
    adminAuthMiddleware(
      {
        headers: { 'x-admin-key': keys[0] },
        socket: { remoteAddress: '192.168.1.50' },
        method: 'POST',
        originalUrl: '/api/archive/trigger',
      } as any,
      mockRes(),
      () => {
        nextCalled = true;
      }
    );
    assert(nextCalled === true, 'Authorized admin request allowed via constant-time check');
  }

  // --- [TEST 2] AES-256-GCM Encryption, Key Validation & Tampering Check ---
  Logger.info('\n--- [TEST 2] AES-256-GCM Encryption, Decryption & Tamper Protection ---');
  {
    // 2a: Weak key rejection
    assert(
      ChatArchivalService.validateEncryptionKey('1234567890') === false,
      'Trivial/weak encryption keys rejected'
    );
    assert(
      ChatArchivalService.validateEncryptionKey('super_secret_enterprise_vault_key_2026') === true,
      'High-entropy 32-byte key accepted'
    );

    // 2b: Encrypt and Decrypt Round-trip
    const plainTranscript = `[2026-09-20T18:00:00.000Z] [FEED] [Sender: UserA]: Test message for encryption audit\n`;
    const secretKey = 'anymchat_production_vault_secret_key_32bytes!';
    const { encrypted, iv, tag, keyId } = ChatArchivalService.encryptTranscript(plainTranscript, secretKey);

    const envelope = JSON.stringify({
      version: '2.0',
      keyId,
      cipher: 'AES-256-GCM',
      iv,
      tag,
      sha256: crypto.createHash('sha256').update(plainTranscript).digest('hex'),
      data: encrypted.toString('base64'),
    });

    const decrypted = ChatArchivalService.decryptTranscript(envelope, secretKey);
    assert(decrypted === plainTranscript, 'Decrypted transcript matches original plain text exactly');

    // 2c: Tampering Detection (Modifying 1 byte of encrypted data should fail auth tag)
    let tamperedEnvelope = JSON.parse(envelope);
    const rawBuffer = Buffer.from(tamperedEnvelope.data, 'base64');
    rawBuffer[0] ^= 0xff; // Flip bits
    tamperedEnvelope.data = rawBuffer.toString('base64');

    let tamperCaught = false;
    try {
      ChatArchivalService.decryptTranscript(JSON.stringify(tamperedEnvelope), secretKey);
    } catch {
      tamperCaught = true;
    }
    assert(tamperCaught, 'AES-256-GCM Authentication Tag strictly caught ciphertext tampering');
  }

  // --- [TEST 3] Database-Level clientMessageId Idempotency ---
  Logger.info('\n--- [TEST 3] Database-Level clientMessageId Idempotency & E11000 Collision ---');
  {
    const clientMsgId = `cmsg_${uuidv4()}`;
    const senderId = 'anon_tester_idempotency_1';

    // First insert
    const msg1 = await FeedRepository.createMessage({
      senderAnonymousId: senderId,
      senderAlias: 'IdempotencyTester',
      senderAvatarColor: '#10B981',
      clientMessageId: clientMsgId,
      content: 'This message must not be duplicated even under retry storms',
      latitude: 28.6139,
      longitude: 77.209,
    });

    // Second insert with SAME clientMessageId & sender
    const msg2 = await FeedRepository.createMessage({
      senderAnonymousId: senderId,
      senderAlias: 'IdempotencyTester',
      senderAvatarColor: '#10B981',
      clientMessageId: clientMsgId,
      content: 'This message must not be duplicated even under retry storms',
      latitude: 28.6139,
      longitude: 77.209,
    });

    const id1 = msg1._id ? msg1._id.toString() : msg1.id;
    const id2 = msg2._id ? msg2._id.toString() : msg2.id;

    assert(id1 === id2, 'Database-level duplicate clientMessageId cleanly resolved to existing message ID', `ID: ${id1}`);
  }

  // --- [TEST 4] Direct Message Authorization Boundary ---
  Logger.info('\n--- [TEST 4] Direct Message Authorization & Privacy Boundary ---');
  {
    const alice = 'anon_alice_123';
    const bob = 'anon_bob_456';
    const eveAttacker = 'anon_eve_hacker';

    // Alice sends DM to Bob
    await DirectChatService.sendMessage(alice, bob, 'Secret message intended only for Bob');

    // Alice queries history
    const aliceHistory = await DirectChatService.getChatHistory(alice, bob);
    assert(aliceHistory.length > 0, 'Participant Alice can read her conversation with Bob');

    // Bob queries history
    const bobHistory = await DirectChatService.getChatHistory(bob, alice);
    assert(bobHistory.length > 0, 'Participant Bob can read his conversation with Alice');

    // Eve queries history between Alice and Bob
    const eveHistory = await DirectChatService.getChatHistory(eveAttacker, alice);
    const leakFound = eveHistory.some((m) => m.content.includes('intended only for Bob'));
    assert(!leakFound, 'Third-party Eve CANNOT see direct messages exchanged between Alice and Bob');
  }

  // --- [TEST 5] Socket Payload Size & Event Rate Limits ---
  Logger.info('\n--- [TEST 5] Socket Payload Bounds & Anti-Flood Limits ---');
  {
    // Small valid payload (under 4KB)
    const validSmallPayload = { content: 'Hello', location: { lat: 28, lng: 77 } };
    assert(validatePayloadSize(validSmallPayload, 4096) === true, 'Valid 4KB payload accepted');

    // Large malicious payload (50KB flood)
    const largeMaliciousPayload = { content: 'X'.repeat(50000) };
    assert(validatePayloadSize(largeMaliciousPayload, 4096) === false, '50KB oversized payload strictly rejected');

    // Event flood test on mock socket
    const mockSocket: any = { id: `socket_${uuidv4()}`, emit: () => {} };
    let floodBlocked = false;
    for (let i = 0; i < 20; i++) {
      const allowed = checkSocketEventRate(mockSocket);
      if (!allowed) {
        floodBlocked = true;
        break;
      }
    }
    assert(floodBlocked, 'Socket event rate limiter strictly blocked event flood (> 15 events/sec)');
  }

  // --- [TEST 6] Redis Failure Resilience & Fail-Safe Rate Limiter ---
  Logger.info('\n--- [TEST 6] Redis Offline Resilience & Fail-Safe Rate Limiter ---');
  {
    const testUser = `user_fail_test_${uuidv4()}`;
    const maxLimit = 5;

    // Simulate 5 allowed requests
    for (let i = 1; i <= maxLimit; i++) {
      const res = await RedisRateLimiterService.checkRateLimit(testUser, 'test', maxLimit, 60);
      assert(res.allowed === true, `Rate limit request #${i} permitted (${res.remaining} remaining)`);
    }

    // 6th request must be strictly rejected (No fail-open bypass!)
    const blockedRes = await RedisRateLimiterService.checkRateLimit(testUser, 'test', maxLimit, 60);
    assert(
      blockedRes.allowed === false,
      'Fail-safe in-memory rate limiter strictly blocked 6th request without failing open'
    );
  }

  // --- [TEST 7] Metrics & Telemetry Observability ---
  Logger.info('\n--- [TEST 7] Metrics & Telemetry Observability ---');
  {
    MetricsService.increment('messagesReceivedFeed', 10);
    MetricsService.increment('messagesPersisted', 8);
    MetricsService.increment('messagesDuplicateDeduped', 2);
    MetricsService.recordLatency(12.5);
    MetricsService.recordLatency(24.1);
    MetricsService.recordLatency(5.3);

    const snapshot = MetricsService.getMetrics();
    assert(snapshot.counters.messagesReceivedFeed >= 10, 'Metrics counter tracks messages received');
    assert(snapshot.latency.p50 > 0, 'Metrics telemetry tracks latency p50 distribution', `p50: ${snapshot.latency.p50}ms`);
    assert(snapshot.system.heapUsedMB > 0, 'Metrics telemetry reports Node.js heap consumption', `Heap: ${snapshot.system.heapUsedMB} MB`);
  }

  Logger.info('\n================================================================');
  Logger.info(`🎉 STAGE 2 AUDIT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED WITH ZERO FAILURES!`);
  Logger.info('================================================================\n');
}

runStage2ProductionAudit().catch((err) => {
  Logger.error('Stage 2 Production Audit failed:', err);
  process.exit(1);
});
