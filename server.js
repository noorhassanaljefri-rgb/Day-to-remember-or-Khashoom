'use strict';
/**
 * A Day to Remember ✦ — backend
 * Zero dependencies. Requires Node.js >= 22.13 (built-in node:sqlite).
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const PUBLIC_DIR = path.join(__dirname, 'public');
fs.mkdirSync(DATA_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/* Secrets                                                             */
/* ------------------------------------------------------------------ */
const keyFile = path.join(DATA_DIR, 'secret.key');
if (!fs.existsSync(keyFile)) {
  fs.writeFileSync(keyFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
}
const SALT = Buffer.from(fs.readFileSync(keyFile, 'utf8').trim(), 'hex');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normCode(s) {
  return String(s)
    .normalize('NFKC')
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
function hashCode(code) {
  return crypto.scryptSync(normCode(code), SALT, 32, { N: 16384, r: 8, p: 1 }).toString('hex');
}
function safeEq(aHex, bHex) {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(pw), salt, 64, { N: 16384, r: 8, p: 1 });
  return salt.toString('hex') + ':' + h.toString('hex');
}
function verifyPassword(pw, stored) {
  try {
    const [s, h] = stored.split(':');
    const calc = crypto.scryptSync(String(pw), Buffer.from(s, 'hex'), 64, { N: 16384, r: 8, p: 1 });
    return crypto.timingSafeEqual(calc, Buffer.from(h, 'hex'));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Database                                                            */
/* ------------------------------------------------------------------ */
const db = new DatabaseSync(path.join(DATA_DIR, 'site.db'));
db.exec('PRAGMA journal_mode=WAL;');
db.exec(`
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT, position INTEGER NOT NULL,
  title TEXT NOT NULL, body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS stops (
  id INTEGER PRIMARY KEY AUTOINCREMENT, position INTEGER NOT NULL,
  locked_title TEXT NOT NULL, unlocked_title TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '', activity TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '', maps_url TEXT NOT NULL DEFAULT '',
  departure_time TEXT NOT NULL DEFAULT '', departure_note TEXT NOT NULL DEFAULT '',
  code_hash TEXT NOT NULL DEFAULT '', show_activity INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY, created INTEGER NOT NULL, last_seen INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS unlocks (
  visitor_id TEXT NOT NULL, stop_id INTEGER NOT NULL, at INTEGER NOT NULL,
  PRIMARY KEY (visitor_id, stop_id));
`);

try { db.exec('ALTER TABLE stops ADD COLUMN show_activity INTEGER NOT NULL DEFAULT 0'); } catch {}

const kvGet = (k, d = null) => {
  const r = db.prepare('SELECT value FROM kv WHERE key=?').get(k);
  return r ? JSON.parse(r.value) : d;
};
const kvSet = (k, v) =>
  db
    .prepare('INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(k, JSON.stringify(v));
function tx(fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Defaults (exact copy supplied by the owner)                         */
/* ------------------------------------------------------------------ */
const DEFAULT_CONTENT = {
  siteTitle: 'A Day to Remember ✦',
  date: '11.11.2026',
  inviteMessage:
    'اخترت هذا اليوم لان تاريخه مميز، ابا اصنع معك ذكريات حلوه وما ابا يوم يشبه باقي الأيام\n\n' +
    'جهز نفسك ليوم مختلف، يوم مليان تفاصيل صغيرة، وضحكات، ولحظات أتمنى تظل في بالك حتى بعد ما يخلص اليوم .\n\n' +
    'ما راح أقولك وين بنروح، ولا إيش مخططة لك، بس أوعدك إن كل تفصيلة في هذا اليوم وراها سبب.\n\n' +
    'كل اللي أبغاه منك إنك تعطيني يومك، وتثق فيني، وتخلي الباقي عليا "ابغاك ليا لوحدي اليوم"',
  inviteTagline: 'You, me, and a day worth remembering. ✦',
  inviteButton: 'Accept My Invitation ✦',
  rulesHeading: 'Before Our day Begins… ♡',
  rulesSubtitle: 'A few little rules for our special day.',
  rulesIntro: 'قبل ما نبدأ، عندنا كم شرط بسيط جدًا (مو قابل للتفاوض طبعًا 🤍).',
  rulesFooter: 'Your only job today is to enjoy every little moment.',
  rulesButton: "Let’s Make Memories ♡",
  mapHeading: 'Our Little Adventure ✦',
  stopLabel: 'Stop',
  popupTitle: 'A Little Secret Is Waiting ✦',
  popupMessage: 'Your next destination is still a secret...',
  popupPlaceholder: 'Enter the Secret Code',
  popupButton: 'Unlock My Surprise ✦',
  wrongCode: 'Not quite! Try again ✦',
  tooManyTries: 'Too many tries… take a little breath and try again soon ✦',
  mapButton: 'Take Me There ✦',
  mapFooter: '/n الي يرجع في كلامه اييش؟؟ ف خليك قد كلامك قبل ما تقفبل الدعوه',
    'Your only job today is to enjoy every little moment.',
  mapClosing: 'Let’s Make Memories ♡',
  letterPopupTitle: 'One Last Secret ♡',
  letterPopupMessage: 'Something written just for you…',
  letterPopupButton: 'Open My Letter ♡',
};

const DEFAULT_THEME = {
  bg: '#f1f8fc',
  bg2: '#fff4cc',
  card: '#fffefa',
  blush: '#d4ebf8',
  rose: '#4a9fcb',
  deep: '#1c6490',
  ink: '#1f3b4d',
  sun: '#efb62b',
  hearts: true,
  heartCount: 14,
};

const DEFAULT_CHECKLIST = [
  ['Sleep Tight, Wake Up Right 🌙', 'نام بدري ولا تسهر عشان تقدر تصحى بدري وتكون مصحصح، وأول ما تصحى خذ بابونجك وروّق، أبغاك فايق ومروق معايا طول اليوم، ورانا يوم حلو يستنانا إن شاء الله 🤍'],
  ['Rise & Shine — 1:00 PM ☀️', 'الساعة 1 الظهر تكون صاحي وتبدأ تتجهز، ممنوع التأجيل وممنوع «خمس دقايق زيادة».'],
  ['Save Your Coffee for Me ☕♡', 'ممنوع تشرب قهوتك لحالك قبل ما نتقابل، خلّها عليا اليوم، حنشربها سوا ونروّق سوا، وأبغا أول قهوة في يومك تكون معايا 🤍'],
  ['Dress to Impress (A Little) 🤍', 'اكشخ، بس مو لازم تكشخ زيادة. البس شيء مرتب وحلو ومريح بنفس الوقت، وأهم شرط: ممنوع الشورت منعًا باتًا.'],
  ['Just in Case 👕', 'جيب معاك تيشيرت احتياطي، لأنه ممكن نتوسخ شوي في نص اليوم، ولا تسأل ليش، بس اسمع الكلام 🤫.'],
  ['Be There — 2:00 PM 📍', 'الساعة 2 الظهر تكون واصل اللوكيشن الأول، مو تتحرك من بيتك الساعة 2، تكون موجود في المكان فعلًا، وأنا حكون مستنيتك هناك 🤍'],
  [
    'Timing Is Everything ⏰',
    'الوقت اليوم مهم جدًا، وكل دقيقة محسوبة. التأخير ممكن يخرب علينا أشياء حلوة، فخلينا نمشي على الوقت بالضبط عشان ما أقلب حياتك ……ايش خليني اسمع\nايووووااا لا اقلب حياتك طين',
  ],
  ['Leave Your Brain at Home 🧠', 'اليوم أعطي عقلك إجازة، لا تفكر كثير، ولا تحلل، ولا تحاول تعرف إيش مخططة. بس انبسط وعيش اللحظة.'],
  ['No Spoilers, Please 🤫', 'ممنوع الأسئلة من نوع «وين بنروح؟» و«ايش بعدين؟» و«ليش؟». كل شيء راح تعرفه في وقته.'],
  ['Trust the Map 🗺️', 'عندنا خريطة وخطة، والمطلوب منك تمشي عليها خطوة بخطوة. لا تختصر الطريق، ولا تستعجل الأحداث، ولا تبدأ العبط حقك.'],
  ['Be Present 🤍', 'خل جوالك على جنب قد ما تقدر. أبغاك تعيش اليوم معي، مو من ورا الشاشة.'],
  ['No Payments, No Exceptions💳🚫', 'ممنوع تدفع أي شيء اليوم، كل شيء عليا من البداية للنهاية، وما أبغا أي نقاش أو محاولة منك للدفع. هذا شرط أساسي وغير قابل للتفاوض.'],
  ['One Last Thing… ♡', 'مو مطلوب منك أي شيء غير إنك تكون على طبيعتك، تضحك من قلبك، وتخليني أشوفك مبسوط.'],
  ['Bring That Smile — MANDATORY! ♡', 'وأخيرًا، أهم شرط في اليوم كله، وأبغاك تركز معايا فيه كويس: جيب معاك ابتسامتك اللي أحبها، ضروري ضروري ضروري! مو طلب، هذا أمر، وممنوع تجيني من غيرها. ترا كل ذا اليوم عشان أشوفك مبسوط وتضحك من قلبك، فانتبه تنساها، لأنها أهم شيء عندي 🤍'],
];

const FIRST_STOP = {
  locked_title: 'Where It All Begins ♡',
  unlocked_title: 'Where It All Begins ♡',
  emoji: '📍',
  activity: 'اللوكيشن الأول',
  maps_url: 'https://maps.app.goo.gl/CYWooS1UHUG4jnfv8?g_st=ic',
  departure_time: '2:00 PM',
  departure_note: 'لازم تكون هناك الساعة ٢',
};
const DEFAULT_STOPS = [
  FIRST_STOP,
  {
    locked_title: 'The First Secret ✦',
    unlocked_title: 'A Little Mess, A Lot of Memories ✦',
    emoji: '🏺',
    activity: 'Pottery Workshop',
    maps_url: 'https://maps.app.goo.gl/SkMP8bppBhmp2kDbA?g_st=ic',
    departure_time: '4:45 PM',
    departure_note: 'حط في بالك لازم نطلع من ذا المكان الساعة ٤:٤٥ مساءً',
  },
  {
    locked_title: 'Another Little Mystery ✦',
    unlocked_title: 'A Table for Two ✦',
    emoji: '🍽️',
    activity: 'Fancy Fine Dining Restaurant',
    maps_url: 'https://maps.app.goo.gl/tYp36wKvFY4mtSqx8?g_st=ic',
    departure_time: '6:45 PM',
    departure_note: 'حط في بالك لازم نطلع من ذا المكان الساعة ٦:٤٥ مساءً',
  },
  {
    locked_title: 'One Last Surprise ✦',
    unlocked_title: 'One More Scene Together ✦',
    emoji: '🎬',
    activity: 'VIP Cinema',
    maps_url: 'https://maps.app.goo.gl/1iqd6PFcLAeD74QT8?g_st=ic',
    departure_time: '',
    departure_note: '',
  },
];

/* The letter behind the golden star (only sent to the browser after the right password). */
const LETTER_CODE = '14111998';
const LETTER = {
  title: 'To My Ineffable ♡',
  subtitle: '11:11 — A moment made just for you.',
  paragraphs: [
    'فيه ناس تقابلهم في حياتك، وفيه ناس ما تكتفي إنك تعرفهم… تحس فيهم، وتحس إن وجودهم مختلف عن أي أحد ثاني.',
    'And you… you’re one of those rare people that words could never do justice to.',
    'معاك عشت مشاعر ما كنت أعرف كيف أشرحها، وأحاسيس ما عرفت أسميها، ومواقف ولحظات كانت تعني لي أكثر بكثير من اللي قدرت أقوله لك.',
    'ضحكنا مع بعض، وسكتنا مع بعض، وسولفنا سوالف ما تخلص، وعشنا مواقف ما كنت حاسبتلها حساب ، وتفاصيل صغيرة يمكن مرت علينا بشكل عادي، بس كبرت وصار لها مكان كبير في قلبي…ومدري متى وكيف بالضبط، بس بين كل هذي اللحظات، صرت شخص مو عادي أبدًا بالنسبة لي.',
    'ولو طلب مني أحد أوصفك بكلمة وحدة، بقول له:',
    'My Ineffable.♡',
    'Someone so special, so beautifully indescribable, that no words could ever be enough.',
    'انت شخص عجزت اوصفه.',
    'لأن مهما لقيت كلمات حلوة، أحس إنها مو كفاية عشان أوصفك، أو أوصف إحساسي معاك، أو حتى المكان اللي أخذته في قلبي من غير ما أحس.',
    'أتمنى تعرف إنك شخص أقدّره بأشياء يمكن ما تنتبه لها، وإن لك معزّة بقلبي أكبر من اللي أعرف أعبّر عنها أحيانًا.',
    'ولو فيه شيء واحد أتمناه لك، فهو إن الحياة دايم تعطيك أسباب تضحك فيها من قلبك، وإن قلبك يلقى راحته حتى في أصعب أيامه، وإنك ما تنسى أبدًا إنك تستاهل كل شي حلو في ذي الحياه،حبيت احتفل بوجودك في ذي الحياه وفي حياتي واليوم ما كان مجرد أماكن رحنا لها، أو أشياء سويناها.',
    'اليوم كان عشانك أنت.',
    'عشان أحتفل بيوم ميلادك قبل الكل، عشان أشوف ابتسامتك، وأسمع ضحكتك، وأصنع معاك لحظات صغيرة أتمنى تظل في بالك حتى بعد ما يخلص اليوم.',
    'Because sometimes, the most beautiful gift isn’t something you can hold. It’s a feeling, a memory, a moment that stays with you.',
    'ما أعرف إيش مخبّي لنا بكرة، بس أعرف إنك تركت أثر في قلبي ما حيروح ، مو لانك حاولت تسوي شيء كبير… بس لانك كنت، دايما حاضر بطبيعتك وبكل تفاصيلك.',
    'وأنت تركت في قلبي أثر ما يشبه اي شي',
    'ولو كان لي أمنية وحدة الساعة 11:11، بتكون إنك تشوف نفسك بعيوني، حتى لو لحظة وحدة بس.',
    'يمكن وقتها تفهم ليش مهما حاولت أتكلم عنك، أحس إن الكلام ما يكفي.',
    'أنت بالنسبة لي شخص ما توفيه الكلمات حقه، ولا تقدر الأوصاف تختصره.',
    'فيه أيام ما ننساها بسبب الأشياء اللي صارت فيها…',
    'And there are days we never forget because of the person we shared them with.',
    'And for me, that person is you. Always you.',
  ],
  date: '11.11.2026',
  signoff: 'With all the feelings that words could never express, Noor loves you in ways words could never explain, and adores you more deeply than you’ll ever know.',
};

// Initial secret codes chosen by the owner (stored only as hashes). Change them any time in /admin.
const INITIAL_CODES = ['11112026', '2507', '1208', '1508'];
const CODE_WORDS = ['rose', 'pearl', 'jasmine', 'honey', 'velvet', 'lotus', 'amber', 'moon', 'silk', 'peach', 'dawn', 'cherry'];

const CONTENT_VERSION = 3;
function seed() {
  if (kvGet('seeded')) return;
  const firstCodes = [];
  tx(() => {
    kvSet('content', DEFAULT_CONTENT);
    kvSet('theme', DEFAULT_THEME);
    kvSet('epoch', 1);
    DEFAULT_CHECKLIST.forEach(([t, b], i) =>
      db.prepare('INSERT INTO checklist(position,title,body) VALUES(?,?,?)').run(i, t, b)
    );
    const words = [...CODE_WORDS].sort(() => crypto.randomInt(-1, 2));
    DEFAULT_STOPS.forEach((s, i) => {
      const code = INITIAL_CODES[i];
      firstCodes.push(code);
      db.prepare(
        `INSERT INTO stops(position,locked_title,unlocked_title,emoji,activity,description,maps_url,departure_time,departure_note,code_hash)
         VALUES(?,?,?,?,?,?,?,?,?,?)`
      ).run(i, s.locked_title, s.unlocked_title, s.emoji, s.activity, '', s.maps_url, s.departure_time, s.departure_note, code ? hashCode(code) : '');
    });
    const adminPw = process.env.ADMIN_PASSWORD || `${words[5]}-${words[6]}-${crypto.randomInt(1000, 9999)}`;
    kvSet('adminHash', hashPassword(adminPw));
    kvSet('seeded', true);
    kvSet('contentVersion', CONTENT_VERSION);
    const txt =
      'A Day to Remember ✦ — FIRST-RUN CREDENTIALS (delete this file after saving them somewhere safe)\n\n' +
      `Admin password : ${adminPw}\n` +
      DEFAULT_STOPS.map((s, i) => `Stop ${i + 1} code     : ${firstCodes[i] || '(none — open for everyone)'}   (${s.activity})`).join('\n') +
      `\nLetter password: ${LETTER_CODE}   (golden star at the end of the map)` +
      '\n\nChange all of these from the Admin Dashboard (/admin).\n';
    fs.writeFileSync(path.join(DATA_DIR, 'FIRST-RUN-CREDENTIALS.txt'), txt, { mode: 0o600 });
  });
  console.log('\n=== First run: credentials saved to', path.join(DATA_DIR, 'FIRST-RUN-CREDENTIALS.txt'), '===\n');
}
seed();

/* Bring an existing database up to the latest copy (keeps the secret codes). */
function migrate() {
  const v = kvGet('contentVersion', 1);
  if (v >= CONTENT_VERSION) return;
  tx(() => {
   if (v < 2) {
    const keys = ['rulesHeading', 'rulesSubtitle', 'rulesIntro', 'rulesFooter', 'rulesButton'];
    const cur = kvGet('content', {});
    keys.forEach((k) => (cur[k] = DEFAULT_CONTENT[k]));
    kvSet('content', cur);
    db.exec('DELETE FROM checklist');
    DEFAULT_CHECKLIST.forEach(([t, b], i) => db.prepare('INSERT INTO checklist(position,title,body) VALUES(?,?,?)').run(i, t, b));
    const rows = getStops();
    if (rows.length === 3) {
      rows.forEach((r, i) => {
        const d = DEFAULT_STOPS[i + 1];
        db.prepare('UPDATE stops SET position=?, maps_url=?, departure_time=?, departure_note=? WHERE id=?').run(i + 1, d.maps_url, d.departure_time, d.departure_note, r.id);
      });
      const f = FIRST_STOP;
      db.prepare(
        `INSERT INTO stops(position,locked_title,unlocked_title,emoji,activity,description,maps_url,departure_time,departure_note,code_hash)
         VALUES(0,?,?,?,?,'',?,?,?,'')`
      ).run(f.locked_title, f.unlocked_title, f.emoji, f.activity, f.maps_url, f.departure_time, f.departure_note);
    }
    kvSet('epoch', kvGet('epoch', 1) + 1);
   }
    // v3: the first location gets its own secret code
    const first = getStops()[0];
    if (first && !first.code_hash && first.maps_url === FIRST_STOP.maps_url) {
      db.prepare('UPDATE stops SET code_hash=? WHERE id=?').run(hashCode(INITIAL_CODES[0]), first.id);
      db.prepare('DELETE FROM unlocks WHERE stop_id=?').run(first.id);
    }
    kvSet('contentVersion', CONTENT_VERSION);
  });
  console.log('Content updated to version', CONTENT_VERSION);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
class HttpError extends Error {
  constructor(status, msg) {
    super(msg);
    this.status = status;
  }
}

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req, limit = 200 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, 'Too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(v && typeof v === 'object' ? v : {});
      } catch {
        reject(new HttpError(400, 'Bad JSON'));
      }
    });
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
const isHttps = (req) => !!req.socket.encrypted || (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https');
function cookie(req, name, value, opts) {
  let c = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=${opts.sameSite}; Max-Age=${opts.maxAge}`;
  if (isHttps(req)) c += '; Secure';
  return c;
}
function addCookie(res, c) {
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, c) : [c]);
}
function clientIp(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}
function checkOrigin(req) {
  const o = req.headers.origin;
  if (!o) return;
  let host;
  try {
    host = new URL(o).host;
  } catch {
    throw new HttpError(403, 'Forbidden');
  }
  const allowed = [req.headers.host];
  if (TRUST_PROXY && req.headers['x-forwarded-host']) allowed.push(req.headers['x-forwarded-host']);
  if (!allowed.includes(host)) throw new HttpError(403, 'Forbidden');
}

/* ---- rate limiting (in-memory) ---- */
const limits = new Map();
function lockedFor(key) {
  const e = limits.get(key);
  if (!e) return 0;
  const left = e.until - Date.now();
  return left > 0 ? Math.ceil(left / 1000) : 0;
}
function recordFail(key, max, windowMs, lockMs) {
  const now = Date.now();
  let e = limits.get(key);
  if (!e || (now - e.start > windowMs && e.until <= now)) e = { start: now, count: 0, until: 0, strikes: e ? e.strikes : 0 };
  e.count++;
  if (e.count >= max) {
    e.strikes++;
    e.until = now + Math.min(lockMs * 2 ** (e.strikes - 1), 3600_000);
    e.count = 0;
    e.start = now;
  }
  limits.set(key, e);
}
setInterval(() => {
  const now = Date.now();
  for (const [k, e] of limits) if (e.until < now && now - e.start > 2 * 3600_000) limits.delete(k);
  for (const [k, s] of sessions) if (s.exp < now) sessions.delete(k);
}, 600_000).unref();

/* ---- visitors ---- */
function getVisitor(req, res, create) {
  const tok = parseCookies(req).vid;
  if (tok && /^[a-f0-9]{48}$/.test(tok)) {
    const id = sha256(tok);
    const row = db.prepare('SELECT id FROM visitors WHERE id=?').get(id);
    if (row) {
      db.prepare('UPDATE visitors SET last_seen=? WHERE id=?').run(Date.now(), id);
      return { id };
    }
  }
  if (!create) return null;
  const n = db.prepare('SELECT COUNT(*) c FROM visitors').get().c;
  if (n > 3000) {
    db.prepare(
      'DELETE FROM visitors WHERE id IN (SELECT id FROM visitors WHERE id NOT IN (SELECT visitor_id FROM unlocks) ORDER BY last_seen ASC LIMIT 1000)'
    ).run();
  }
  const token = crypto.randomBytes(24).toString('hex');
  const id = sha256(token);
  const now = Date.now();
  db.prepare('INSERT INTO visitors(id,created,last_seen) VALUES(?,?,?)').run(id, now, now);
  addCookie(res, cookie(req, 'vid', token, { sameSite: 'Lax', maxAge: 31536000 }));
  return { id };
}

/* ---- validation ---- */
const BANNED = /birthday|b-?day|عيد\s*ميلاد|ميلاد/i;
function cleanStr(v, max, { trim = true, label = 'الحقل', required = false } = {}) {
  if (v == null) v = '';
  if (typeof v !== 'string') throw new HttpError(400, `${label}: قيمة غير صالحة`);
  v = v.replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (trim) v = v.trim();
  if (v.length > max) throw new HttpError(400, `${label}: النص طويل جدًا`);
  if (required && !v) throw new HttpError(400, `${label}: لا يمكن أن يكون فارغًا`);
  if (BANNED.test(v)) throw new HttpError(400, `${label}: يحتوي على كلمة ممنوعة في الموقع (لا يُذكر عيد الميلاد أبدًا) — عدّل النص وأعد الحفظ`);
  return v;
}
function validMaps(u) {
  if (!u) return true;
  try {
    const x = new URL(u);
    if (x.protocol !== 'https:') return false;
    const h = x.hostname.toLowerCase();
    return (
      h === 'maps.app.goo.gl' ||
      h === 'goo.gl' ||
      h === 'g.co' ||
      h === 'maps.apple.com' ||
      /^(www\.|maps\.)?google\.[a-z.]{2,}$/.test(h) ||
      h.endsWith('.google.com')
    );
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Data shaping                                                        */
/* ------------------------------------------------------------------ */
const getContent = () => ({ ...DEFAULT_CONTENT, ...kvGet('content', {}) });
const getTheme = () => ({ ...DEFAULT_THEME, ...kvGet('theme', {}) });
const getChecklist = () => db.prepare('SELECT id,title,body FROM checklist ORDER BY position,id').all();
const getStops = () => db.prepare('SELECT * FROM stops ORDER BY position,id').all();

function stopDetail(r, n) {
  return {
    id: r.id,
    number: n,
    title: r.unlocked_title || r.locked_title,
    emoji: r.show_activity ? r.emoji : '',
    activity: r.show_activity ? r.activity : '',
    description: r.description,
    mapsUrl: r.maps_url,
    departureTime: r.departure_time,
    departureNote: r.departure_note,
  };
}

function publicState(visitor) {
  const unlocked = new Set(db.prepare('SELECT stop_id FROM unlocks WHERE visitor_id=?').all(visitor.id).map((r) => r.stop_id));
  return {
    content: getContent(),
    theme: getTheme(),
    epoch: kvGet('epoch', 1),
    checklist: getChecklist(),
    stops: getStops().map((r, i) =>
      unlocked.has(r.id) || !r.code_hash
        ? { id: r.id, number: i + 1, lockedTitle: r.locked_title, unlocked: true, open: !r.code_hash, detail: stopDetail(r, i + 1) }
        : { id: r.id, number: i + 1, lockedTitle: r.locked_title, unlocked: false } // nothing else leaves the server
    ),
  };
}

function adminState() {
  const stops = getStops();
  const unlockRows = db.prepare('SELECT visitor_id, stop_id FROM unlocks').all();
  const byV = new Map();
  unlockRows.forEach((u) => {
    if (!byV.has(u.visitor_id)) byV.set(u.visitor_id, []);
    byV.get(u.visitor_id).push(u.stop_id);
  });
  return {
    content: getContent(),
    theme: getTheme(),
    epoch: kvGet('epoch', 1),
    checklist: getChecklist(),
    stops: stops.map((r) => ({
      id: r.id,
      lockedTitle: r.locked_title,
      unlockedTitle: r.unlocked_title,
      emoji: r.emoji,
      activity: r.activity,
      description: r.description,
      mapsUrl: r.maps_url,
      departureTime: r.departure_time,
      departureNote: r.departure_note,
      showActivity: !!r.show_activity,
      codeSet: !!r.code_hash,
    })),
    visitors: db
      .prepare('SELECT id,created,last_seen FROM visitors ORDER BY last_seen DESC LIMIT 200')
      .all()
      .map((v) => ({ id: v.id, short: v.id.slice(0, 6), created: v.created, lastSeen: v.last_seen, unlocked: byV.get(v.id) || [] })),
  };
}

migrate();

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */
async function handleUnlock(req, res) {
  const b = await readBody(req, 4096);
  const ip = clientIp(req);
  const v = getVisitor(req, res, true);
  const keys = ['ip:' + ip, 'vid:' + v.id];
  const wait = Math.max(...keys.map(lockedFor));
  if (wait > 0) return json(res, 429, { ok: false, retryAfter: wait });

  const stopId = Number(b.stopId);
  const code = typeof b.code === 'string' ? b.code.slice(0, 200) : '';
  const row = Number.isInteger(stopId) ? db.prepare('SELECT * FROM stops WHERE id=?').get(stopId) : null;
  const calc = hashCode(code || '-'); // always hash: uniform timing
  const ok = !!(row && row.code_hash && code && safeEq(calc, row.code_hash));
  if (!ok) {
    recordFail('ip:' + ip, 10, 600_000, 600_000);
    recordFail('vid:' + v.id, 5, 600_000, 300_000);
    await sleep(300);
    return json(res, 401, { ok: false });
  }
  db.prepare('INSERT OR IGNORE INTO unlocks(visitor_id,stop_id,at) VALUES(?,?,?)').run(v.id, row.id, Date.now());
  const n = getStops().findIndex((s) => s.id === row.id) + 1;
  return json(res, 200, { ok: true, stop: stopDetail(row, n) });
}

/* "Start over" (browser back button): forget this visitor's unlocked stops */
async function handleRestart(req, res) {
  await readBody(req, 1024);
  const v = getVisitor(req, res, false);
  if (v) db.prepare('DELETE FROM unlocks WHERE visitor_id=?').run(v.id);
  return json(res, 200, { ok: true });
}

const LETTER_HASH = hashCode(LETTER_CODE);
async function handleLetter(req, res) {
  const b = await readBody(req, 4096);
  // no attempt limit for the letter: he can try as many times as he likes
  const code = typeof b.code === 'string' ? b.code.slice(0, 200) : '';
  const ok = !!code && safeEq(hashCode(code), LETTER_HASH);
  if (!ok) {
    await sleep(300);
    return json(res, 401, { ok: false });
  }
  return json(res, 200, { ok: true, letter: LETTER });
}

/* ------------------------------------------------------------------ */
/* Admin API                                                           */
/* ------------------------------------------------------------------ */
const sessions = new Map();
const ADMIN_TTL = 12 * 3600_000;

function adminSession(req) {
  const t = parseCookies(req).admin;
  if (!t) return null;
  const s = sessions.get(sha256(t));
  if (!s || s.exp < Date.now()) return null;
  return { key: sha256(t) };
}

async function handleAdmin(req, res, p) {
  const m = req.method;
  const ip = clientIp(req);

  if (p === '/api/admin/login' && m === 'POST') {
    const b = await readBody(req, 2048);
    const k = 'adm:' + ip;
    const wait = lockedFor(k);
    if (wait > 0) return json(res, 429, { ok: false, error: `محاولات كثيرة. حاول بعد ${wait} ثانية`, retryAfter: wait });
    const pw = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
    if (!pw || !verifyPassword(pw, kvGet('adminHash', ''))) {
      recordFail(k, 5, 900_000, 900_000);
      await sleep(600);
      return json(res, 401, { ok: false, error: 'كلمة المرور غير صحيحة' });
    }
    const tok = crypto.randomBytes(32).toString('hex');
    sessions.set(sha256(tok), { exp: Date.now() + ADMIN_TTL });
    addCookie(res, cookie(req, 'admin', tok, { sameSite: 'Strict', maxAge: ADMIN_TTL / 1000 }));
    return json(res, 200, { ok: true });
  }

  const sess = adminSession(req);
  if (!sess) throw new HttpError(401, 'غير مصرّح');

  if (p === '/api/admin/logout' && m === 'POST') {
    sessions.delete(sess.key);
    addCookie(res, cookie(req, 'admin', '', { sameSite: 'Strict', maxAge: 0 }));
    return json(res, 200, { ok: true });
  }
  if (p === '/api/admin/state' && m === 'GET') return json(res, 200, { ok: true, state: adminState() });

  if (m !== 'PUT' && m !== 'POST') throw new HttpError(404, 'Not found');
  const b = await readBody(req);

  if (p === '/api/admin/content' && m === 'PUT') {
    const inc = b.content && typeof b.content === 'object' ? b.content : {};
    const out = {};
    for (const k of Object.keys(DEFAULT_CONTENT)) {
      const long = k === 'inviteMessage';
      out[k] = cleanStr(inc[k], long ? 6000 : 400, { trim: !long, label: k, required: true });
    }
    kvSet('content', out);
    return json(res, 200, { ok: true, state: adminState() });
  }

  if (p === '/api/admin/theme' && m === 'PUT') {
    const t = b.theme || {};
    const out = { ...DEFAULT_THEME };
    for (const k of ['bg', 'bg2', 'card', 'blush', 'rose', 'deep', 'ink', 'sun']) {
      if (!/^#[0-9a-fA-F]{6}$/.test(t[k] || '')) throw new HttpError(400, 'لون غير صالح');
      out[k] = t[k].toLowerCase();
    }
    out.hearts = !!t.hearts;
    out.heartCount = Math.max(0, Math.min(30, Number(t.heartCount) | 0));
    kvSet('theme', out);
    return json(res, 200, { ok: true, state: adminState() });
  }

  if (p === '/api/admin/checklist' && m === 'PUT') {
    const items = Array.isArray(b.items) ? b.items : null;
    if (!items || items.length > 60) throw new HttpError(400, 'قائمة غير صالحة');
    const clean = items.map((it, i) => ({
      title: cleanStr(it && it.title, 200, { label: `البند ${i + 1} (العنوان)`, required: true }),
      body: cleanStr(it && it.body, 1500, { trim: false, label: `البند ${i + 1} (النص)` }),
    }));
    tx(() => {
      db.exec('DELETE FROM checklist');
      clean.forEach((it, i) => db.prepare('INSERT INTO checklist(position,title,body) VALUES(?,?,?)').run(i, it.title, it.body));
    });
    return json(res, 200, { ok: true, state: adminState() });
  }

  if (p === '/api/admin/stops' && m === 'PUT') {
    const incoming = Array.isArray(b.stops) ? b.stops : null;
    if (!incoming || incoming.length > 12) throw new HttpError(400, 'قائمة المحطات غير صالحة (الحد الأقصى 12)');
    const existing = new Map(getStops().map((r) => [r.id, r]));
    const clean = incoming.map((s, i) => {
      const L = `المحطة ${i + 1}`;
      const id = Number.isInteger(s.id) && existing.has(s.id) ? s.id : null;
      const mapsUrl = cleanStr(s.mapsUrl, 600, { label: `${L} (رابط الخريطة)` });
      if (!validMaps(mapsUrl)) throw new HttpError(400, `${L}: رابط الخريطة يجب أن يكون https من Google Maps`);
      let codeHash = id ? existing.get(id).code_hash : '';
      const nc = typeof s.newCode === 'string' ? s.newCode : '';
      if (nc.trim()) {
        if (normCode(nc).length < 4) throw new HttpError(400, `${L}: الرمز السري قصير (4 أحرف على الأقل، والأفضل 6+)`);
        if (nc.length > 100) throw new HttpError(400, `${L}: الرمز السري طويل جدًا`);
        codeHash = hashCode(nc);
      }
      return {
        id,
        locked_title: cleanStr(s.lockedTitle, 200, { label: `${L} (العنوان المقفل)`, required: true }),
        unlocked_title: cleanStr(s.unlockedTitle, 200, { label: `${L} (العنوان بعد الفتح)` }),
        emoji: cleanStr(s.emoji, 16, { label: `${L} (الإيموجي)` }),
        activity: cleanStr(s.activity, 200, { label: `${L} (النشاط)` }),
        description: cleanStr(s.description, 1500, { trim: false, label: `${L} (الوصف)` }),
        maps_url: mapsUrl,
        departure_time: cleanStr(s.departureTime, 60, { label: `${L} (وقت المغادرة)` }),
        departure_note: cleanStr(s.departureNote, 400, { label: `${L} (ملاحظة المغادرة)` }),
        code_hash: codeHash,
        show_activity: s.showActivity ? 1 : 0,
      };
    });
    const hs = clean.map((c) => c.code_hash).filter(Boolean);
    if (new Set(hs).size !== hs.length) throw new HttpError(400, 'كل محطة تحتاج رمزًا سريًا مختلفًا — يوجد رمزان متطابقان');
    tx(() => {
      const keep = new Set(clean.filter((c) => c.id).map((c) => c.id));
      for (const id of existing.keys()) {
        if (!keep.has(id)) {
          db.prepare('DELETE FROM stops WHERE id=?').run(id);
          db.prepare('DELETE FROM unlocks WHERE stop_id=?').run(id);
        }
      }
      clean.forEach((c, i) => {
        const vals = [i, c.locked_title, c.unlocked_title, c.emoji, c.activity, c.description, c.maps_url, c.departure_time, c.departure_note, c.code_hash, c.show_activity];
        if (c.id) {
          // an existing stop whose code changed must not stay unlocked for old visitors
          if (existing.get(c.id).code_hash !== c.code_hash) db.prepare('DELETE FROM unlocks WHERE stop_id=?').run(c.id);
          db.prepare(
            `UPDATE stops SET position=?,locked_title=?,unlocked_title=?,emoji=?,activity=?,description=?,maps_url=?,departure_time=?,departure_note=?,code_hash=?,show_activity=? WHERE id=?`
          ).run(...vals, c.id);
        } else {
          db.prepare(
            `INSERT INTO stops(position,locked_title,unlocked_title,emoji,activity,description,maps_url,departure_time,departure_note,code_hash,show_activity) VALUES(?,?,?,?,?,?,?,?,?,?,?)`
          ).run(...vals);
        }
      });
    });
    return json(res, 200, { ok: true, state: adminState() });
  }

  if (p === '/api/admin/reset' && m === 'POST') {
    const scope = b.scope;
    if (scope === 'visitor') {
      if (typeof b.visitor !== 'string' || !/^[a-f0-9]{64}$/.test(b.visitor)) throw new HttpError(400, 'زائر غير صالح');
      db.prepare('DELETE FROM unlocks WHERE visitor_id=?').run(b.visitor);
    } else if (scope === 'unlocks') {
      db.prepare('DELETE FROM unlocks').run();
    } else if (scope === 'checklist') {
      kvSet('epoch', kvGet('epoch', 1) + 1);
    } else if (scope === 'everything') {
      db.prepare('DELETE FROM unlocks').run();
      kvSet('epoch', kvGet('epoch', 1) + 1);
    } else throw new HttpError(400, 'نوع إعادة الضبط غير معروف');
    return json(res, 200, { ok: true, state: adminState() });
  }

  if (p === '/api/admin/password' && m === 'POST') {
    const cur = typeof b.current === 'string' ? b.current : '';
    const next = typeof b.next === 'string' ? b.next : '';
    if (!verifyPassword(cur, kvGet('adminHash', ''))) throw new HttpError(400, 'كلمة المرور الحالية غير صحيحة');
    if (next.length < 10 || next.length > 200) throw new HttpError(400, 'كلمة المرور الجديدة يجب ألا تقل عن 10 أحرف');
    kvSet('adminHash', hashPassword(next));
    for (const k of sessions.keys()) if (k !== sess.key) sessions.delete(k);
    return json(res, 200, { ok: true });
  }

  throw new HttpError(404, 'Not found');
}

/* ------------------------------------------------------------------ */
/* Router + static files                                               */
/* ------------------------------------------------------------------ */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function securityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  );
  if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}

function serveStatic(req, res, pathname) {
  let rel = pathname;
  if (rel === '/') rel = '/index.html';
  if (rel === '/admin' || rel === '/admin/') rel = '/admin.html';
  let file;
  try {
    file = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(rel)));
  } catch {
    throw new HttpError(404, 'Not found');
  }
  if (!file.startsWith(PUBLIC_DIR + path.sep)) throw new HttpError(404, 'Not found');
  const type = MIME[path.extname(file).toLowerCase()];
  if (!type || !fs.existsSync(file) || !fs.statSync(file).isFile()) throw new HttpError(404, 'Not found');
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    securityHeaders(req, res);
    const url = new URL(req.url, 'http://local');
    const p = url.pathname;
    const m = req.method;
    if (!['GET', 'HEAD', 'POST', 'PUT'].includes(m)) throw new HttpError(405, 'Method not allowed');

    if (p === '/healthz') return json(res, 200, { ok: true });

    if (p.startsWith('/api/')) {
      if (m !== 'GET') {
        checkOrigin(req);
        if (req.headers['x-requested-with'] !== 'fetch') throw new HttpError(403, 'Forbidden');
      }
      if (p === '/api/site' && m === 'GET') {
        const v = getVisitor(req, res, true);
        return json(res, 200, publicState(v));
      }
      if (p === '/api/unlock' && m === 'POST') return await handleUnlock(req, res);
      if (p === '/api/restart' && m === 'POST') return await handleRestart(req, res);
      if (p === '/api/letter' && m === 'POST') return await handleLetter(req, res);
      if (p.startsWith('/api/admin/')) return await handleAdmin(req, res, p);
      throw new HttpError(404, 'Not found');
    }
    if (m !== 'GET' && m !== 'HEAD') throw new HttpError(405, 'Method not allowed');
    return serveStatic(req, res, p);
  } catch (e) {
    if (res.headersSent) return res.end();
    if (e instanceof HttpError) {
      if (req.url.startsWith('/api/')) return json(res, e.status, { ok: false, error: e.message });
      res.writeHead(e.status, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(e.status === 404 ? 'Not found' : e.message);
    }
    console.error(e);
    return json(res, 500, { ok: false, error: 'Server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`A Day to Remember ✦  →  http://localhost:${PORT}   (admin: /admin)`);
});
