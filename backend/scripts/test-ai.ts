import { AiEngine } from '../src/ai';

console.log('====================================================');
console.log('           ANYMCHAT AI ENGINE TEST SUITE            ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assertTest(name: string, condition: boolean, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${name}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${name} ${detail ? `-> ${detail}` : ''}`);
  }
}

// 1. FREE EXPRESSION & VENTING (MUST BE ALLOWED)
console.log('--- TEST GROUP 1: Free Speech / Venting / Slang ---');
const ventingMsg1 = 'saala pura din kharab ho gaya dimag ka dahi ho gaya';
const r1 = AiEngine.moderate(ventingMsg1);
assertTest('Venting message 1 allowed', r1.isAllowed === true);

const ventingMsg2 = 'bakwaas hostel mess ka khana roz wahi daal chawal bhai kya chal raha hai';
const r2 = AiEngine.moderate(ventingMsg2);
assertTest('Venting message 2 allowed', r2.isAllowed === true);

// 2. DIRECT PHONE NUMBERS (MUST BE BLOCKED)
console.log('\n--- TEST GROUP 2: Direct Phone Numbers ---');
const phone1 = 'Call me on 9876543210 urgently';
const rPhone1 = AiEngine.moderate(phone1);
assertTest('Standard 10-digit phone blocked', rPhone1.isAllowed === false && rPhone1.hasPii === true);

const phone2 = 'Mera number note kar +91 9123456789';
const rPhone2 = AiEngine.moderate(phone2);
assertTest('+91 formatted phone blocked', rPhone2.isAllowed === false && rPhone2.hasPii === true);

// 3. OBFUSCATED / SPACED PHONE NUMBERS (MUST BE BLOCKED)
console.log('\n--- TEST GROUP 3: Spaced & Obfuscated Numbers ---');
const spacedPhone = 'number hai 9 8 7 6 5 4 3 2 1 0 call karo';
const rSpaced = AiEngine.moderate(spacedPhone);
assertTest('Spaced digits phone blocked', rSpaced.isAllowed === false && rSpaced.hasPii === true);

const dashedPhone = 'Call 98765-43210';
const rDashed = AiEngine.moderate(dashedPhone);
assertTest('Dashed phone blocked', rDashed.isAllowed === false && rDashed.hasPii === true);

// 4. SPELLED-OUT NUMBERS (MUST BE BLOCKED)
console.log('\n--- TEST GROUP 4: Spelled-Out Numbers (English & Hinglish) ---');
const spelledEng = 'number hai nine eight seven six five four three two one zero';
const rSpelledEng = AiEngine.moderate(spelledEng);
assertTest('English spelled-out phone blocked', rSpelledEng.isAllowed === false && rSpelledEng.hasPii === true);

const spelledHin = 'contact nau aath saat chhe paanch chaar teen do ek shunya pe';
const rSpelledHin = AiEngine.moderate(spelledHin);
assertTest('Hindi/Hinglish spelled-out phone blocked', rSpelledHin.isAllowed === false && rSpelledHin.hasPii === true);

// 5. INSTAGRAM & SOCIAL HANDLES (MUST BE BLOCKED)
console.log('\n--- TEST GROUP 5: Instagram & Social Handles ---');
const ig1 = 'add me on ig: rahul_sharma21';
const rIg1 = AiEngine.moderate(ig1);
assertTest('Instagram "ig: username" blocked', rIg1.isAllowed === false && rIg1.piiType === 'instagram');

const ig2 = 'my insta id is priya.99 ping me there';
const rIg2 = AiEngine.moderate(ig2);
assertTest('Instagram "my insta id is" blocked', rIg2.isAllowed === false && rIg2.piiType === 'instagram');

const ig3 = 'check my photos on instagram.com/cool_guy_99';
const rIg3 = AiEngine.moderate(ig3);
assertTest('Instagram URL blocked', rIg3.isAllowed === false && rIg3.piiType === 'instagram');

// 6. 200 WORDS LIMIT
console.log('\n--- TEST GROUP 6: 200 Words Limit Guard ---');
const shortMsg = 'Hey guys anyone up for late night tea near block b?';
const rShort = AiEngine.moderate(shortMsg);
assertTest('Short message allowed', rShort.isAllowed === true);

const longWords = new Array(210).fill('word').join(' ');
const rLong = AiEngine.moderate(longWords);
assertTest('210-word message blocked (over 200 limit)', rLong.isAllowed === false && rLong.piiType === 'length_exceeded');

// 7. HANDLE GENERATOR (WITH GENDER SELECTION)
console.log('\n--- TEST GROUP 7: Persona Handle Generator (Gender Tailored) ---');
const maleHandle = AiEngine.generateHandle(undefined, 1, 'male');
assertTest(`Male handle generated: ${maleHandle}`, typeof maleHandle === 'string' && maleHandle.length > 5);

const femaleHandle = AiEngine.generateHandle(undefined, 2, 'female');
assertTest(`Female handle generated: ${femaleHandle}`, typeof femaleHandle === 'string' && femaleHandle.length > 5);

const otherHandle = AiEngine.generateHandle(undefined, 3, 'other');
assertTest(`Other/Neutral handle generated: ${otherHandle}`, typeof otherHandle === 'string' && otherHandle.length > 5);

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
console.log('====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
