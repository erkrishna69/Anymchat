import { connectMongoDB } from '../src/config/database/mongo.config';
import { connectRedis, disconnectRedis } from '../src/config/redis/redis.config';
import { FeedRepository } from '../src/repositories/feed/feed.repository';
import { FeedService } from '../src/services/feed/feed.service';
import { DirectRepository } from '../src/repositories/direct/direct.repository';
import { DirectChatService } from '../src/services/direct/directChat.service';
import { AuthService } from '../src/services/auth/auth.service';
import { v4 as uuidv4 } from 'uuid';

async function runAudit() {
  console.log('================================================================');
  console.log('🔍 ANTIMATTER/ANYMCHAT STRICT PERSISTENCE & SECURITY AUDIT SUITE');
  console.log('================================================================\n');

  await connectMongoDB();
  await connectRedis();

  const { FeedMessageModel } = await import('../src/models/feedMessage/feedMessage.model');
  const { DirectMessageModel } = await import('../src/models/directMessage/directMessage.model');
  await FeedMessageModel.deleteMany({ content: { $regex: /Persistence test|Old message|Duplicate prevention|Faraway Mumbai/ } });
  await DirectMessageModel.deleteMany({ content: { $regex: /Private message between User A and User B/ } });

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: User Identity Creation & Scoping
    // -------------------------------------------------------------
    console.log('\n--- 1. User Identity & Token Isolation ---');
    const { user: userA } = await AuthService.createAnonymousUser({ alias: 'AuditUserA', avatarId: 1 });
    const { user: userB } = await AuthService.createAnonymousUser({ alias: 'AuditUserB', avatarId: 2 });
    const { user: userC } = await AuthService.createAnonymousUser({ alias: 'AuditUserC', avatarId: 3 });

    assert(!!userA.anonymousId && !!userB.anonymousId && !!userC.anonymousId, 'User accounts generated with unique IDs');
    assert(userA.anonymousId !== userB.anonymousId, 'Account isolation between User A and User B');

    // -------------------------------------------------------------
    // Test 2: Feed Message Persistence & Retrieval
    // -------------------------------------------------------------
    console.log('\n--- 2. Feed History Persistence & Ordering ---');
    const centerLat = 28.6315;
    const centerLng = 77.2167;

    const feedMsg1 = await FeedService.postMessage({
      senderAnonymousId: userA.anonymousId,
      senderAlias: userA.alias,
      senderAvatarColor: '#6366F1',
      avatarId: 1,
      content: 'Persistence test message 1 (Hello Delhi!)',
      latitude: centerLat,
      longitude: centerLng,
      clientMessageId: `audit-msg-${uuidv4()}`,
    });

    const feedMsg2 = await FeedService.postMessage({
      senderAnonymousId: userB.anonymousId,
      senderAlias: userB.alias,
      senderAvatarColor: '#10B981',
      avatarId: 2,
      content: 'Persistence test message 2 (Realtime nearby)',
      latitude: centerLat + 0.01, // ~1.1 km away
      longitude: centerLng + 0.01,
      clientMessageId: `audit-msg-${uuidv4()}`,
    });

    const nearbyFeed = await FeedService.getNearbyFeed(userA.anonymousId, centerLat, centerLng, 10);
    const hasMsg1 = nearbyFeed.some((m) => m.id === feedMsg1.id);
    const hasMsg2 = nearbyFeed.some((m) => m.id === feedMsg2.id);

    assert(hasMsg1, 'User A message persists in 10 km feed');
    assert(hasMsg2, 'User B nearby message persists in 10 km feed');

    // Verify ordering: newest messages first
    if (nearbyFeed.length >= 2) {
      const idx1 = nearbyFeed.findIndex((m) => m.id === feedMsg1.id);
      const idx2 = nearbyFeed.findIndex((m) => m.id === feedMsg2.id);
      assert(idx2 <= idx1, 'Newer message appears before older message in feed query result');
    }

    // -------------------------------------------------------------
    // Test 3: Geospatial Distance Boundary Filter (10 KM Strict Guard)
    // -------------------------------------------------------------
    console.log('\n--- 3. Geospatial 10 KM Distance Boundary Guard ---');
    // Post a message in Mumbai (~1100 km away)
    const farMsg = await FeedService.postMessage({
      senderAnonymousId: userC.anonymousId,
      senderAlias: userC.alias,
      senderAvatarColor: '#F59E0B',
      avatarId: 3,
      content: 'Faraway Mumbai message',
      latitude: 19.076,
      longitude: 72.8777,
      clientMessageId: `audit-far-${uuidv4()}`,
    });

    const delhiFeed = await FeedService.getNearbyFeed(userA.anonymousId, centerLat, centerLng, 10);
    const containsFarMsg = delhiFeed.some((m) => m.id === farMsg.id);
    assert(!containsFarMsg, 'Messages outside 10 km radius are strictly excluded from Delhi feed');

    // -------------------------------------------------------------
    // Test 4: 24-Hour Ephemeral Retention Proof
    // -------------------------------------------------------------
    console.log('\n--- 4. 24-Hour Ephemeral Retention Enforcement ---');
    // Create an expired message (25 hours ago) directly in repository
    const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await FeedRepository.createMessage({
      senderAnonymousId: userA.anonymousId,
      senderAlias: userA.alias,
      senderAvatarColor: '#6366F1',
      avatarId: 1,
      content: 'Old message from yesterday (>24 hours ago)',
      latitude: centerLat,
      longitude: centerLng,
      clientMessageId: `audit-old-${uuidv4()}`,
      createdAt: expiredTime,
    });

    const feedAfterCutoff = await FeedService.getNearbyFeed(userA.anonymousId, centerLat, centerLng, 10);
    console.log('Test 4 feed items count:', feedAfterCutoff.length);
    feedAfterCutoff.forEach((m) => console.log(' -> item:', m.content, 'createdAt:', m.createdAt));
    const containsOld = feedAfterCutoff.some((m) => m.content.includes('Old message from yesterday'));
    assert(!containsOld, 'Messages older than 24 hours are strictly filtered out of feed history');

    // -------------------------------------------------------------
    // Test 5: Direct Chat History Persistence & Authorization Scoping
    // -------------------------------------------------------------
    console.log('\n--- 5. Direct Chat Persistence & Authorization Isolation ---');
    const dmResult = await DirectChatService.sendMessage(
      userA.anonymousId,
      userB.anonymousId,
      'Private message between User A and User B',
      `dm-audit-${uuidv4()}`
    );

    assert(dmResult.success && !!dmResult.message, 'Direct message sent successfully');

    // User A fetches conversation with User B
    const historyA = await DirectChatService.getChatHistory(userA.anonymousId, userB.anonymousId);
    const userASeesDM = historyA.some((m) => m.content === 'Private message between User A and User B');
    assert(userASeesDM, 'User A can view their direct chat history with User B');

    // User B fetches conversation with User A
    const historyB = await DirectChatService.getChatHistory(userB.anonymousId, userA.anonymousId);
    const userBSeesDM = historyB.some((m) => m.content === 'Private message between User A and User B');
    assert(userBSeesDM, 'User B can view their direct chat history with User A');

    // User C attempts to view User A <-> User B chat
    const historyC_with_B = await DirectChatService.getChatHistory(userC.anonymousId, userB.anonymousId);
    const userCSeesPrivateDM = historyC_with_B.some((m) => m.content === 'Private message between User A and User B');
    assert(!userCSeesPrivateDM, 'User C CANNOT view private messages between User A and User B (Cross-Account Isolation)');

    // -------------------------------------------------------------
    // Test 6: Message Idempotency & Deduplication Guard
    // -------------------------------------------------------------
    console.log('\n--- 6. Idempotency & Duplicate Insertion Guard ---');
    const sharedClientMsgId = `idempotent-test-${uuidv4()}`;

    const insert1 = await FeedService.postMessage({
      senderAnonymousId: userA.anonymousId,
      senderAlias: userA.alias,
      senderAvatarColor: '#6366F1',
      avatarId: 1,
      content: 'Duplicate prevention test message',
      latitude: centerLat,
      longitude: centerLng,
      clientMessageId: sharedClientMsgId,
    });

    const insert2 = await FeedService.postMessage({
      senderAnonymousId: userA.anonymousId,
      senderAlias: userA.alias,
      senderAvatarColor: '#6366F1',
      avatarId: 1,
      content: 'Duplicate prevention test message',
      latitude: centerLat,
      longitude: centerLng,
      clientMessageId: sharedClientMsgId,
    });

    assert(insert1.id === insert2.id, 'Duplicate send with same clientMessageId resolves to existing record without creating duplicate');

    console.log('\n================================================================');
    console.log(`AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    await disconnectRedis();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Audit execution error:', err);
    await disconnectRedis();
    process.exit(1);
  }
}

runAudit();
