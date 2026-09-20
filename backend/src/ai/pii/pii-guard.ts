/**
 * pii-guard.ts — hardened PII / contact-leak detector (India-focused)
 *
 * Pipeline:
 *   raw → canonicalize() → 3 views (canon / collapsed / deobfuscated)
 *       → regex detectors  +  digit-stream detector  +  cross-message buffer
 *       → { blocked, needsReview, findings }
 *
 * Usage:
 *   const guard = new PiiGuard();                 // ek shared instance rakho
 *   const res = guard.scan(message, userId);      // userId do -> split-across-messages bhi pakdega
 *   if (res.blocked) reject(); else if (res.needsReview) queueForModeration();
 *
 * Findings me RAW match kabhi nahi hota (sirf masked preview) -> logs me PII leak nahi hoga.
 */

/* ───────────────────────────── Types ───────────────────────────── */

export type Severity = 'block' | 'review';
export type PiiType =
  | 'PHONE'
  | 'PHONE_SPLIT'
  | 'PHONE_CROSS_MESSAGE'
  | 'SOCIAL_HANDLE'
  | 'SOCIAL_URL'
  | 'EMAIL'
  | 'UPI'
  | 'SHORT_LINK'
  | 'CONTACT_INTENT'
  | 'OVERSIZE';

export interface Finding {
  type: PiiType;
  severity: Severity;
  view: string;
  preview: string; // masked, never the raw value
}

export interface ScanResult {
  blocked: boolean;
  needsReview: boolean;
  findings: Finding[];
}

/* ─────────────────────── Pattern building blocks ─────────────────────── */

// leetspeak-tolerant platform names: 1nsta, sn4p, wh4tsapp, inst@gram ...
const LEET: Record<string, string> = {
  a: '[a4@]', e: '[e3]', i: '[i1!|]', l: '[l1|]', o: '[o0]', s: '[s5$]', t: '[t7+]', g: '[g9]',
};
const leetify = (w: string) => [...w].map((c) => LEET[c] ?? c).join('');

const STRONG_PLATFORMS = [
  'instagram', 'insta', 'snapchat', 'snap', 'telegram',
  'whatsapp', 'whatsap', 'watsapp', 'whtsapp', 'discord', 'skype',
];
// chhote/ambiguous naam -> sirf explicit marker (":" "=" "-" "id") ke saath count honge
const WEAK_PLATFORMS = ['ig', 'sc', 'tg', 'wa'];
const WEAK = new Set(WEAK_PLATFORMS);
const PLATFORM_ALT = [...STRONG_PLATFORMS.map(leetify), ...WEAK_PLATFORMS].join('|');

const UPI_HANDLES =
  'ok(?:hdfcbank|axis|sbi|icici|bizaxis)|ybl|ibl|axl|apl|yapl|paytm|pt(?:yes|sbi|hdfc|axis)|upi|sbi|icici|' +
  'hdfcbank|axisbank|kotak|fbl|federal|freecharge|ikwik|airtel|jupiter|idfcbank|idfcfirst|aubank|yesbank|' +
  'indus|rbl|pnb|boi|cnrb|barodampay|wa(?:icici|hdfcbank|axis|sbi)|abfspay|postbank|jio|dbs|hsbc|payzapp|naviaxis';

const SOCIAL_DOMAINS =
  'instagram\\.com|instagr\\.am|ig\\.me|wa\\.me|whatsapp\\.com|t\\.me|telegram\\.(?:me|dog|org)|snapchat\\.com|' +
  'discord\\.(?:gg|com)|linktr\\.ee|facebook\\.com|fb\\.(?:me|com)|twitter\\.com|x\\.com|linkedin\\.com|threads\\.net';

/**
 * NOTE: sab patterns canonicalize() ke baad (lowercase, ASCII digits) chalte hain.
 * Sirf SOCIAL 'g' flag ke saath hai -> matchAll se use karo. Baaki me .test() safe hai
 * (global regex pe .test() lastIndex ka classic bug deta hai — 'g' mat lagana).
 */
export const PII_PATTERNS = {
  // 1. Phone — (?<!\d)/(?!\d) => lambe IDs/timestamps ke andar false-positive nahi
  PHONE_DIRECT: /(?<!\d)(?:(?:\+|00)?91[\s.-]?|0)?[6-9]\d{9}(?!\d)/,
  // har digit ke pehle optional ek separator: 98765 43210, 987-654-3210, 9 8 7 6 5 ...
  PHONE_FORMATTED: /(?<!\d)(?:(?:\+|00)?91[\s.-]?|0)?[6-9](?:[\s.-]?\d){9}(?!\d)/,

  // 2. Social handles (platform + optional label + optional marker + handle)
  SOCIAL: new RegExp(
    String.raw`(?<![a-z0-9])(${PLATFORM_ALT})(?![a-z0-9])\s*(id|handle|acc?(?:ount)?|username|user|name)?\s*` +
      String.raw`((?:(?:is|hai|pe|par|on|at|:|=|-|@)\s*)*)([a-z0-9._]{3,30})`,
    'g',
  ),
  HANDLE_TAG: /(?<![a-z0-9._%+-])@((?=[a-z0-9._]*[a-z])[a-z0-9._]{3,30})/,
  SOCIAL_URL: new RegExp(
    String.raw`(?<![a-z0-9@.-])(?:https?:\/\/)?(?:[a-z0-9-]+\.)*(?:${SOCIAL_DOMAINS})(?![a-z0-9-])`,
  ),
  SHORT_LINK:
    /(?<![a-z0-9])(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|rb\.gy|cutt\.ly|shorturl\.at|is\.gd|rebrand\.ly|lnk\.bio|bio\.link|beacons\.ai)\/\S+/,

  // 3. Email — SAARE domains (sirf gmail/yahoo nahi). Business email allow karni ho to domain filter lagao.
  EMAIL: /(?<![a-z0-9._%+-])[a-z0-9._%+-]{2,64}@(?:[a-z0-9-]{1,63}\.)+[a-z]{2,10}(?![a-z0-9])/,

  // 4. UPI — known handles = block, generic "name@word" (dot ke bina) = review
  UPI_KNOWN: new RegExp(String.raw`(?<![a-z0-9._%+-])[a-z0-9._-]{2,64}@(?:${UPI_HANDLES})(?![a-z0-9])`),
  UPI_GENERIC: /(?<![a-z0-9._%+-])[a-z0-9._-]{2,64}@[a-z][a-z0-9]{2,20}\b(?!\.[a-z0-9])/,
  UPI_DEEPLINK: /upi:\/\/[^\s]+/,

  // 5. "Contact do / number bhejo" type intent (Hinglish + Devanagari)
  CONTACT_INTENT:
    /(?<![a-z0-9])(?:(?:call|text|msg|message|dm|ping|whatsapp|watsapp|contact|reach)\s*(?:me|karo|kar|krna|krdo)|(?:mera|meri|mere|apna|apni|my)\s*(?:number|num|no|nmbr|contact|mobile|phone|insta|instagram|snap|whatsapp|watsapp|telegram|id)|(?:number|num|nmbr|contact|mobile|phone|insta|snap|id)\s*(?:de|do|dedo|bhej|bhejo|share|send|batao|bata|dijiye))(?![a-z0-9])|इंस्टा|स्नैप|व्हाट्स|वाट्स|टेलीग्राम|नंबर|नम्बर|मोबाइल/,
};

const PHONE_EXACT = /^(?:0{0,2}91|0)?[6-9]\d{9}$/;
const PHONE_WINDOW = /[6-9]\d{9}/;

const STOP = new Set(
  (
    'is hai pe par on at id handle account ac acc username user name number no my mera meri mere ka ki ke se ko ' +
    'me mein add follow dm karo kar de do dena batao bhej bhejo hi hello the and aur ya or to tu tum aap you your ' +
    'tera teri chat story post reel reels video app profile page link bio message msg call text please pls plz bata ' +
    'dedo dijiye share send kya kaise nahi nhi haan ok okay bro bhai yaar sir use using download install group dp ' +
    'pic pics photo dekho dekh check aao aajao banao bana create login password what when where why how who this ' +
    'that kyu kab kaha for with from also just only'
  ).split(/\s+/),
);
const TIME_LIKE = /^\d+(?:am|pm|min|mins|hr|hrs|sec|k|m|st|nd|rd|th)$/;

/* ───────────────────────── 1. Canonicalization ───────────────────────── */

// Non-ASCII digit blocks ka "zero" codepoint (Devanagari, Bengali, Gujarati, Tamil, Arabic-Indic, Thai ...)
const DIGIT_ZEROS = [
  0x0660, 0x06f0, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66,
  0x0de6, 0x0e50, 0x0ed0, 0x0f20, 0x1040, 0x17e0, 0x1810,
];

// Chhota confusables map (Cyrillic/Greek -> Latin). Production me full Unicode TR39 skeleton use karo
// (npm: `confusables`) — ye map common lookalikes cover karta hai.
const CONFUSABLES: Record<string, string> = {
  а: 'a', с: 'c', е: 'e', о: 'o', р: 'p', х: 'x', у: 'y', і: 'i', ј: 'j', ѕ: 's', һ: 'h', ԁ: 'd',
  ԛ: 'q', ԝ: 'w', к: 'k', м: 'm', т: 't', н: 'h', ѵ: 'v', ӏ: 'l',
  α: 'a', ο: 'o', ν: 'v', ρ: 'p', ι: 'i', τ: 't', υ: 'u', κ: 'k', χ: 'x', ε: 'e', β: 'b',
  ı: 'i', ɑ: 'a',
};

export function canonicalize(input: string): string {
  let s = input.normalize('NFKC'); // fullwidth ９８７, ＠, ２ , math-bold 𝟗 sab ASCII
  s = s.replace(/[\t\n\r\u2028\u2029]+/g, ' ');
  // zero-width, bidi, soft-hyphen, variation selectors, keycap combiner, control chars ...
  s = s.replace(/[\p{Cf}\p{Cc}\u3164\uFFA0\u115F\u1160\u034F\u180B-\u180F\uFE00-\uFE0F\u20E3\u2800]/gu, '');
  s = s.replace(/\p{Zs}+/gu, ' ');
  s = s.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-').replace(/[\u3002\uFF61]/g, '.');
  s = s.toLowerCase();
  // Latin accents hatao (é -> e), Devanagari matras ko mat chhedo
  s = s.normalize('NFD').replace(/(\p{Script=Latin})\p{M}+/gu, '$1').normalize('NFC');
  // dingbat circled digits ❶ ➀ ➊
  s = s.replace(/[\u24FF\u2776-\u277E\u2780-\u2788\u278A-\u2792]/g, (ch) => {
    const cp = ch.charCodeAt(0);
    if (cp === 0x24ff) return '0'; // ⓿
    return String(cp - (cp <= 0x277e ? 0x2775 : cp <= 0x2788 ? 0x277f : 0x2789));
  });
  // Devanagari/Arabic/Bengali/... digits -> ASCII
  s = s.replace(/\p{Nd}/gu, (ch) => {
    const cp = ch.codePointAt(0)!;
    const z = DIGIT_ZEROS.find((zero) => cp >= zero && cp <= zero + 9);
    return z === undefined ? ch : String(cp - z);
  });
  s = s.replace(/[\u0370-\u03ff\u0400-\u052f\u0131\u0251]/gu, (ch) => CONFUSABLES[ch] ?? ch);
  return s.replace(/ {2,}/g, ' ').trim();
}

/** "i n s t a g r a m" / "r.a.h.u.l" -> "instagram" / "rahul" */
function collapseSpacedLetters(s: string): string {
  return s.replace(
    /(?<![a-z0-9])[a-z](?:[\s.\-_*|,]+[a-z])(?:[\s.\-_*|,]+[a-z]){2,}(?![a-z0-9])/g,
    (m) => m.replace(/[\s.\-_*|,]+/g, ''),
  );
}

/** "rahul at gmail dot com", "[at]", "(dot)", "at the rate", "slash", "underscore" -> real symbols */
function deobfuscate(s: string, weak = false): string {
  const out = s
    .replace(/\s*[(\[{<]\s*(?:dot|\.)\s*[)\]}>]\s*/g, '.')
    .replace(/\s*[(\[{<]\s*(?:at|@)\s*[)\]}>]\s*/g, '@')
    .replace(/\s*(?<![a-z])at\s*the\s*rate(?:\s*of)?(?![a-z])\s*/g, '@')
    .replace(/\s*(?<![a-z])dot\s*com(?![a-z])/g, '.com')
    .replace(/\s*(?<![a-z])dot(?![a-z])\s*/g, '.')
    .replace(/\s*(?<![a-z])slash(?![a-z])\s*/g, '/')
    .replace(/\s*(?<![a-z])(?:underscore|under\s*score)(?![a-z])\s*/g, '_');
  // Plain "at" English preposition bhi hai ("look at amazon dot in") -> alag WEAK view me, weaker severity ke saath
  const withAt = weak
    ? out.replace(
        new RegExp(String.raw`(?<=[a-z0-9])\s+at\s+(?=[a-z0-9]+\s*\.|(?:${UPI_HANDLES})(?![a-z]))`, 'g'),
        '@',
      )
    : out;
  return withAt.replace(/\s*@\s*/g, '@').replace(/\s*\.\s*(?=[a-z]{2,10}(?![a-z]))/g, '.');
}

/* ───────────────────────── 2. Digit-stream detector ───────────────────────── */

const NUM_WORDS = new Map<string, string>(
  Object.entries({
    zero: '0', shunya: '0', sifar: '0', शून्य: '0', जीरो: '0',
    one: '1', ek: '1', aik: '1', एक: '1',
    two: '2', do: '2', dho: '2', दो: '2',
    three: '3', teen: '3', tin: '3', तीन: '3',
    four: '4', char: '4', chaar: '4', चार: '4',
    five: '5', panch: '5', paanch: '5', paach: '5', पांच: '5', पाँच: '5', पाच: '5',
    six: '6', chhe: '6', chhah: '6', chah: '6', chheh: '6', che: '6', छह: '6', छः: '6', छे: '6', छ: '6',
    seven: '7', saat: '7', sat: '7', सात: '7',
    eight: '8', aath: '8', aat: '8', ath: '8', आठ: '8',
    nine: '9', nau: '9', nao: '9', nou: '9', नौ: '9',
  }),
);
const MULT = new Map<string, number>(
  Object.entries({ double: 2, dabal: 2, dubal: 2, dbl: 2, triple: 3, tripal: 3, tipal: 3, डबल: 2, ट्रिपल: 3 }),
);
// leet-digit sirf tab jab pehle se >=3 digits ka run chal raha ho
const LEET_DIGITS = new Map<string, string>([['o', '0'], ['oh', '0'], ['l', '1'], ['i', '1']]);

const TOKEN_RE = /\d|[a-z]+|[\u0900-\u0963\u0966-\u097f]+|[^\s]/gu;

interface Run {
  digits: string;
  mixed: boolean; // digits alag-alag tokens se bane (space/word/symbol)
  soft: boolean; // '/' ya ':' involve (date/time jaisa) -> weaker evidence
  obf: boolean; // words / leet / stray letters use hue -> clearly obfuscation
}

/**
 * Text ko "digit stream" me todta hai: digits, number-words (english/hinglish/devanagari),
 * double/triple, leet, aur filler symbols sab join ho jaate hain.
 * maxJunkWords>0 => beech me thode random words bhi allow (loose mode).
 */
function digitRuns(canon: string, maxJunkWords: number): Run[] {
  const runs: Run[] = [];
  let digits = '';
  let mixed = false, soft = false, obf = false;
  let junk = 0, mult = 1, lastEnd = -1;
  let pend = false; // stray letter / double-triple ke baad agla digit aaye tabhi "obfuscated" maano

  const flush = () => {
    if (digits) runs.push({ digits, mixed, soft, obf });
    digits = ''; mixed = soft = obf = pend = false; junk = 0; mult = 1; lastEnd = -1;
  };
  const add = (d: string, fromWord: boolean) => {
    if (pend) { obf = mixed = true; pend = false; }
    digits += d.repeat(mult);
    mult = 1; junk = 0;
    if (fromWord) { obf = true; mixed = true; lastEnd = -1; }
  };

  for (const m of canon.matchAll(TOKEN_RE)) {
    const t = m[0];
    const at = m.index ?? 0;

    if (/^\d$/.test(t)) {
      if (digits && at !== lastEnd) mixed = true;
      add(t, false);
      lastEnd = at + 1;
      continue;
    }
    const mult_ = MULT.get(t);
    if (mult_ !== undefined) { mult = mult_; pend = true; continue; }
    const w = NUM_WORDS.get(t);
    if (w !== undefined) { add(w, true); continue; }
    if (t === '/' || t === ':') { if (digits) soft = true; continue; }

    if (/^[a-z\u0900-\u097f]+$/.test(t)) {
      const leet = LEET_DIGITS.get(t);
      if (leet !== undefined && digits.length >= 3) { add(leet, true); continue; }
      if (t.length === 1 && /[a-z]/.test(t)) { // "9x8x7x6..." — stray letter as separator
        if (digits) pend = true;
        continue;
      }
      if (digits && junk < maxJunkWords) { junk++; continue; }
      flush();
      continue;
    }
    // baaki punctuation / emoji / symbols = filler
  }
  flush();
  return runs;
}

function classifyRun(r: Run): Severity | null {
  const exact = PHONE_EXACT.test(r.digits);
  const embedded = !exact && r.mixed && r.digits.length >= 10 && PHONE_WINDOW.test(r.digits);
  if (exact) return r.soft && !r.obf ? 'review' : 'block';
  if (embedded) return r.obf ? 'block' : 'review'; // "do nine eight seven..." jaisa prefix trick
  return null;
}

/* ───────────────────────── 3. Text detectors ───────────────────────── */

const mask = (s: string) => (s.length <= 4 ? '***' : `${s.slice(0, 2)}***${s.slice(-1)}`);
const mk = (type: PiiType, severity: Severity, view: string, value: string): Finding => ({
  type, severity, view, preview: mask(value),
});

function classifySocial(m: RegExpMatchArray): Severity | null {
  const platform = m[1] ?? '';
  const label = m[2];
  const marker = m[3] ?? '';
  const handle = (m[4] ?? '').replace(/[._]+$/, '');
  if (handle.length < 3 || STOP.has(handle) || !/[a-z]/.test(handle) || TIME_LIKE.test(handle)) return null;

  const weak = WEAK.has(platform);
  const handleLike = /[0-9_.]/.test(handle);
  const punct = /[:=@-]/.test(marker);
  const explicit = punct || (Boolean(label) && (marker !== '' || handleLike));

  if (explicit) return 'block'; // "insta: rahul", "snap id is kumar"
  if (handleLike) return weak ? 'review' : 'block'; // "insta rahul_99"
  return !weak && handle.length >= 5 ? 'review' : null; // "insta rahulsharma" (ambiguous)
}

const PERSONAL_MAIL = /@(?:gmail|googlemail|yahoo|ymail|outlook|hotmail|live|icloud|proton(?:mail)?|rediffmail)\./;
// sirf wo handles jo English words se collide nahi karte (airtel/jio/sbi/upi jaise words ko weak view me ignore karte hain)
const UPI_DISTINCT = new RegExp(
  String.raw`(?<![a-z0-9._%+-])[a-z0-9._-]{2,64}@(?:ok(?:hdfcbank|axis|sbi|icici|bizaxis)|ybl|ibl|axl|apl|yapl|paytm|pt(?:yes|sbi|hdfc|axis)|wa(?:icici|hdfcbank|axis|sbi))(?![a-z0-9])`,
);

function detectText(view: string, name: string, out: Finding[]): void {
  const P = PII_PATTERNS;
  let m: RegExpMatchArray | null;

  if (name === 'deobf-weak') {
    // plain-"at" wala view: personal-mail / distinctive UPI = block, unknown-domain email = review
    if ((m = view.match(P.EMAIL))) out.push(mk('EMAIL', PERSONAL_MAIL.test(m[0]) ? 'block' : 'review', name, m[0]));
    if ((m = view.match(UPI_DISTINCT))) out.push(mk('UPI', 'block', name, m[0]));
    return;
  }

  if ((m = view.match(P.PHONE_DIRECT) ?? view.match(P.PHONE_FORMATTED))) out.push(mk('PHONE', 'block', name, m[0]));
  if ((m = view.match(P.SOCIAL_URL))) out.push(mk('SOCIAL_URL', 'block', name, m[0]));
  if ((m = view.match(P.SHORT_LINK))) out.push(mk('SHORT_LINK', 'review', name, m[0]));
  if ((m = view.match(P.EMAIL))) out.push(mk('EMAIL', 'block', name, m[0]));
  if ((m = view.match(P.UPI_KNOWN) ?? view.match(P.UPI_DEEPLINK))) out.push(mk('UPI', 'block', name, m[0]));
  // generic "x@y" sirf canon view me (deobf me "at" -> "@" se 'look at this' jaisa noise aata hai)
  else if (name === 'canon' && (m = view.match(P.UPI_GENERIC))) out.push(mk('UPI', 'review', name, m[0]));
  if ((m = view.match(P.HANDLE_TAG))) out.push(mk('SOCIAL_HANDLE', 'block', name, m[0]));

  for (const sm of view.matchAll(P.SOCIAL)) {
    const sev = classifySocial(sm);
    if (sev) out.push(mk('SOCIAL_HANDLE', sev, name, sm[4] ?? ''));
  }
  if ((m = view.match(P.CONTACT_INTENT))) out.push(mk('CONTACT_INTENT', 'review', name, m[0]));
}

/* ───────────────────────── 4. Guard (stateful) ───────────────────────── */

export interface PiiGuardOptions {
  maxLen?: number; // isse lamba message fail-closed (truncate = bypass hota hai)
  looseSplit?: boolean; // "98765 hmm 43210" type split -> review
  windowMs?: number; // cross-message window
  maxEntries?: number;
}

function decide(findings: Finding[]): ScanResult {
  const seen = new Set<string>();
  const uniq = findings.filter((f) => {
    const k = `${f.type}:${f.severity}`;
    return seen.has(k) ? false : (seen.add(k), true);
  });
  const blocked = uniq.some((f) => f.severity === 'block');
  return { blocked, needsReview: !blocked && uniq.length > 0, findings: uniq };
}

export class PiiGuard {
  // Production me Redis (key=userId, TTL=windowMs) use karo — in-memory sirf single-instance ke liye
  private history = new Map<string, { digits: string; ts: number }[]>();

  constructor(private readonly opts: PiiGuardOptions = {}) {}

  scan(raw: string, userId?: string, now: number = Date.now()): ScanResult {
    if (raw.length > (this.opts.maxLen ?? 4000)) {
      return decide([{ type: 'OVERSIZE', severity: 'block', view: 'raw', preview: '' }]);
    }

    const canon = canonicalize(raw);
    const findings: Finding[] = [];
    const views: [string, string][] = [
      ['canon', canon],
      ['collapsed', collapseSpacedLetters(canon)],
      ['deobf', deobfuscate(canon)],
      ['deobf-weak', deobfuscate(canon, true)],
    ];
    for (const [name, text] of views) detectText(text, name, findings);

    const strict = digitRuns(canon, 0);
    for (const r of strict) {
      const sev = classifyRun(r);
      if (sev) findings.push(mk('PHONE', sev, 'digits', r.digits));
    }
    if ((this.opts.looseSplit ?? true) && !findings.some((f) => f.type === 'PHONE' && f.severity === 'block')) {
      for (const r of digitRuns(canon, 2)) {
        if (classifyRun(r)) findings.push(mk('PHONE_SPLIT', 'review', 'digits-loose', r.digits));
      }
    }
    if (userId && this.crossMessage(userId, strict, canon.length, now)) {
      findings.push(mk('PHONE_CROSS_MESSAGE', 'block', 'history', ''));
    }
    return decide(findings);
  }

  /** "98765" ... phir ... "43210" — alag messages me number todne wala trick */
  private crossMessage(userId: string, runs: Run[], canonLen: number, now: number): boolean {
    const windowMs = this.opts.windowMs ?? 5 * 60_000;
    const maxEntries = this.opts.maxEntries ?? 10;
    const digits = runs.map((r) => r.digits).join('');
    const prev = (this.history.get(userId) ?? []).filter((e) => now - e.ts <= windowMs);

    let hit = false;
    if (digits && canonLen <= 40) {
      // sirf chhote, digit wale messages track karo
      const entries = [...prev, { digits, ts: now }].slice(-maxEntries);
      this.history.set(userId, entries);
      if (entries.length > 1) {
        const joined = entries.map((e) => e.digits).join('');
        const lastStart = joined.length - digits.length;
        for (let i = 0; i + 10 <= joined.length; i++) {
          // window purane message se shuru ho aur current message tak jaaye
          if (i < lastStart && i + 9 >= lastStart && /[6-9]/.test(joined[i]!)) { hit = true; break; }
        }
      }
    } else if (prev.length) this.history.set(userId, prev);
    else this.history.delete(userId);

    if (this.history.size > 5000) this.sweep(now, windowMs);
    return hit;
  }

  private sweep(now: number, windowMs: number): void {
    for (const [k, v] of this.history) {
      if (!v.length || now - v[v.length - 1]!.ts > windowMs) this.history.delete(k);
    }
  }
}

/** Stateless shortcut (cross-message check nahi hoga) */
export const scanText = (raw: string): ScanResult => new PiiGuard().scan(raw);
