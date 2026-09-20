import { PiiGuard, scanText } from '../src/ai/pii/pii-guard';
import { OrbitEngine } from '../src/ai';
import { Logger } from '../src/utils/logger/logger.util';

function runPiiGuardTests() {
  Logger.info('================================================================');
  Logger.info('🛡️ TESTING HARDENED PII-GUARD DETECTOR (INDIA-FOCUSED)');
  Logger.info('================================================================\n');

  OrbitEngine.initialize();
  const guard = new PiiGuard();

  const testCases: { name: string; text: string; shouldBlock: boolean; userId?: string }[] = [
    { name: '1. Direct Indian Phone', text: 'Call me on 9876543210', shouldBlock: true },
    { name: '2. Formatted Phone with country code', text: '+91 98765-43210', shouldBlock: true },
    { name: '3. Collapsed Spaced Phone', text: 'my no is 9 8 7 6 5 4 3 2 1 0', shouldBlock: true },
    { name: '4. Devanagari Digits Phone', text: 'मेरा नंबर ९८७६५४३२१० है', shouldBlock: true },
    { name: '5. Spelled-out Hinglish Digits', text: 'nau aath saat chhe paanch chaar teen do ek zero', shouldBlock: true },
    { name: '6. Spelled-out English Digits with multipliers', text: 'nine eight double seven six five four three two one', shouldBlock: true },
    { name: '7. Instagram Handle with explicit marker', text: 'add me on insta: cool_boy99', shouldBlock: true },
    { name: '8. Leetspeak Platform Handle', text: '1nst@ id is rohit_sharma', shouldBlock: true },
    { name: '9. Cyrillic Confusables Bypass Attempt', text: 'whаtsарр me on 9876543210', shouldBlock: true },
    { name: '10. UPI ID with known bank suffix', text: 'send money on rajesh@okaxis', shouldBlock: true },
    { name: '11. Paytm UPI ID', text: 'paytm karo on 9876543210@paytm', shouldBlock: true },
    { name: '12. Telegram Link', text: 'join my channel https://t.me/freemovies', shouldBlock: true },
    { name: '13. Shortened Link', text: 'click bit.ly/secretlink', shouldBlock: false }, // Short links trigger 'review' severity (needsReview: true, blocked: false)
    { name: '14. Innocent Hinglish Casual Chat', text: 'Koi online hai kya? Bas bore ho raha hu bro lol', shouldBlock: false },
    { name: '15. Innocent English Chat', text: 'Anyone want to play Valorant tonight at 9 pm?', shouldBlock: false },
  ];

  let passed = 0;
  for (const tc of testCases) {
    const res = guard.scan(tc.text);
    const pass = res.blocked === tc.shouldBlock;
    if (pass) {
      Logger.info(`✅ PASS: [${tc.name}] -> Blocked: ${res.blocked}, NeedsReview: ${res.needsReview}`);
      passed++;
    } else {
      Logger.error(`❌ FAIL: [${tc.name}] -> Expected Blocked=${tc.shouldBlock}, Got Blocked=${res.blocked}, Findings: ${JSON.stringify(res.findings)}`);
    }
  }

  // Test Cross-Message Phone Splitting
  Logger.info('\n--- [TEST 16] Cross-Message Phone Splitting Attack ---');
  const attackUser = 'malicious_user_404';
  const res1 = guard.scan('98765', attackUser);
  const res2 = guard.scan('43210', attackUser);

  if (!res1.blocked && res2.blocked && res2.findings.some(f => f.type === 'PHONE_CROSS_MESSAGE')) {
    Logger.info('✅ PASS: [Cross-Message Splitting] -> Message 1 passed, Message 2 caught split phone number across messages!');
    passed++;
  } else {
    Logger.error(`❌ FAIL: [Cross-Message Splitting] -> res1=${res1.blocked}, res2=${res2.blocked}`);
  }

  Logger.info('\n================================================================');
  Logger.info(`📊 PII-GUARD TEST RESULTS: ${passed}/${testCases.length + 1} PASSED`);
  Logger.info('================================================================\n');

  if (passed === testCases.length + 1) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPiiGuardTests();
