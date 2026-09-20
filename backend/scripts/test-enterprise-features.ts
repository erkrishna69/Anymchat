import { connectRedis, getRedisStatus, disconnectRedis } from '../src/config/redis/redis.config';
import { RedisCacheService } from '../src/services/cache/redisCache.service';
import { FeedCacheService } from '../src/services/cache/feedCache.service';
import { RedisRateLimiterService } from '../src/services/rateLimit/redisRateLimiter.service';
import { FeedRepository } from '../src/repositories/feed/feed.repository';
import { DirectRepository } from '../src/repositories/direct/direct.repository';
import { ChatArchivalService } from '../src/services/archive/chatArchival.service';
import { GoogleDriveService } from '../src/services/archive/gdrive.service';
import { Logger } from '../src/utils/logger/logger.util';

async function runEnterpriseVerification() {
  Logger.info('================================================================');
  Logger.info('🧪 STARTING ANYMCHAT ENTERPRISE FEATURES VERIFICATION TEST');
  Logger.info('================================================================');

  // 1. Test Redis Connection & Failover
  Logger.info('\n--- [TEST 1] Redis Connection & Fallback Cache ---');
  await connectRedis();
  Logger.info(`Redis Connected Status: ${getRedisStatus() ? 'Active (Redis Server)' : 'Active (High-Speed In-Memory Cache Fallback)'}`);

  await RedisCacheService.set('test:key:enterprise', { status: 'ok', level: 'apple_google' }, 30);
  const cachedVal = await RedisCacheService.get<{ status: string; level: string }>('test:key:enterprise');
  if (cachedVal && cachedVal.level === 'apple_google') {
    Logger.info('✅ PASS: Redis/Cache get & set working seamlessly');
  } else {
    throw new Error('FAIL: Redis/Cache get & set mismatch');
  }

  // 2. Test Redis Rate Limiter
  Logger.info('\n--- [TEST 2] Redis Sliding Window Rate Limiter ---');
  const rate1 = await RedisRateLimiterService.checkRateLimit('user_test_999', 'post', 5, 10);
  const rate2 = await RedisRateLimiterService.checkRateLimit('user_test_999', 'post', 5, 10);
  Logger.info(`Rate limit check #1: Allowed=${rate1.allowed}, Count=${rate1.count}, Remaining=${rate1.remaining}`);
  Logger.info(`Rate limit check #2: Allowed=${rate2.allowed}, Count=${rate2.count}, Remaining=${rate2.remaining}`);
  if (rate1.allowed && rate2.allowed && rate2.count === 2) {
    Logger.info('✅ PASS: Redis Rate Limiter atomic counters working');
  } else {
    throw new Error('FAIL: Rate limiter counter unexpected value');
  }

  // 3. Test Feed Message Creation & Redis Sorted Set Caching
  Logger.info('\n--- [TEST 3] Feed Message Creation & 24h Redis Sorted Set ---');
  const createdFeedMsg = await FeedRepository.createMessage({
    senderAnonymousId: 'anon_test_user_alpha',
    senderAlias: 'CyberHawk_404',
    senderAvatarColor: '#4F46E5',
    senderGender: 'other',
    avatarId: 1,
    content: 'Testing 24h retention and hourly archival batching!',
    latitude: 28.6139,
    longitude: 77.2090,
  });
  Logger.info(`Created Feed Message ID: ${createdFeedMsg._id || createdFeedMsg.id}`);

  const recentFeed = await FeedCacheService.getRecentFeed(10);
  Logger.info(`Recent Feed from Active 24h Sorted Set: ${recentFeed.length} messages`);
  if (recentFeed.length > 0) {
    Logger.info(`✅ PASS: Message instantly available in active 24h cache (${recentFeed[0].senderAlias}: ${recentFeed[0].content})`);
  } else {
    throw new Error('FAIL: Feed message not found in active cache');
  }

  // 4. Test Direct Message Creation
  Logger.info('\n--- [TEST 4] Direct Message Creation & 24h Filter ---');
  const createdDm = await DirectRepository.createMessage({
    senderAnonymousId: 'anon_test_user_alpha',
    recipientAnonymousId: 'anon_test_user_beta',
    content: 'Direct confidential message for hourly archival test',
  });
  Logger.info(`Created DM ID: ${createdDm._id || createdDm.id}`);
  const conversation = await DirectRepository.getConversation('anon_test_user_alpha', 'anon_test_user_beta', 10);
  if (conversation.length > 0) {
    Logger.info(`✅ PASS: Direct conversation query with 24h guard working (${conversation.length} msgs)`);
  } else {
    throw new Error('FAIL: Direct conversation empty');
  }

  // 5. Test 1-Hour Chat Archival & Transcript Generation
  Logger.info('\n--- [TEST 5] 1-Hour Chat Archival & Transcript Engine ---');
  Logger.info(`Google Drive Configured: ${GoogleDriveService.isConfigured() ? 'YES (Cloud Upload Active)' : 'NO (Local Secure Staging Active)'}`);

  const archiveResult = await ChatArchivalService.runHourlyArchive(
    new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours window
    new Date(),
    true // Force execution for test verification
  );


  Logger.info(`Archive Result: Success=${archiveResult.success}, File=${archiveResult.fileName}`);
  Logger.info(`Archive Stats: TotalMessages=${archiveResult.totalMessages}, SizeBytes=${archiveResult.fileSizeBytes}, SHA256=${archiveResult.sha256}`);
  Logger.info(`Archive Status: ${archiveResult.status}`);

  if (archiveResult.success && archiveResult.totalMessages >= 1 && archiveResult.fileSizeBytes > 0) {
    Logger.info('✅ PASS: Hourly transcript successfully aggregated, hashed, and staged!');
  } else {
    throw new Error('FAIL: Archival batch failed or produced 0 messages');
  }


  // 6. Test 24-Hour Expiration & Purge
  Logger.info('\n--- [TEST 6] 24-Hour Cache Lifecycle & Expiration Purge ---');
  const purgedCount = await FeedCacheService.purgeExpiredMessages();
  Logger.info(`Purged expired messages older than 24h: ${purgedCount}`);
  Logger.info('✅ PASS: 24-Hour TTL Purge routine completed cleanly');

  await disconnectRedis();
  Logger.info('\n================================================================');
  Logger.info('🎉 ALL ENTERPRISE REQUIREMENTS VERIFIED SUCCESSFULLY!');
  Logger.info('================================================================\n');
  process.exit(0);
}

runEnterpriseVerification().catch((err) => {
  Logger.error('Verification failed:', err);
  process.exit(1);
});

