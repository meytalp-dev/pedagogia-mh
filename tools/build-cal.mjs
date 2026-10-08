/* בונה מטבלאות המועדים בעמוד ההשתלמויות (hishtalmuyot.html):
     1. את מפגשי ההשתלמויות בלוח הגאנט — gantt.html, בין הסימונים cal:gen
     2. את יומני המנוי cal/<מזהה>.ics — אחד לכל מסלול בגאנט ואחד לכל טבלת
        הדרכה בתחומי הדעת. כפתור "הוספת כל המפגשים ליומן" (calendar.js)
        מפנה אליהם, והיומן של מי שנרשם מתעדכן מהם לבד.

   כך יש מקור אחד לתאריכים: משנים מועד רק בטבלה בעמוד ההשתלמויות, והגאנט
   והיומנים נבנים ממנו. רץ מהאקשן build-knowledge בכל push.

   סימון הטבלאות:
     <table class="sched" data-track="rakaz">     מסלול בגאנט (מפתח ב-TRACKS)
       data-gu="..."                               קישור לכל מפגשי המסלול בגאנט (לא חובה)
     <table class="sched" data-cal="daat-math">   יומן בלבד, בלי גאנט
     <tr data-g="שם קצר" data-gs="פרטים" data-ga="למי">
       data-g חובה בטבלת מסלול — השם שמופיע בגאנט וביומן.
       data-gs — שורת הפרטים בגאנט (שעה/מקום). data-ga — דורס את "למי" של המסלול.
   התאריך תמיד נלקח מתא ה-td.dt — לא מכפילים אותו לשום מקום אחר.

   מה שאין לו שורה בטבלאות (חגים, אירועים לאומיים, בחינות, הודעות) נשאר
   ידני ב-gantt.html, מחוץ לסימונים, ונכנס גם הוא ליומן של המסלול שלו.

   הרצה:  node tools/build-cal.mjs          בונה ומעדכן
          node tools/build-cal.mjs --check  יוצא ב-1 אם משהו לא מעודכן (בלי לכתוב) */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const SITE = 'https://pedagogiamh.co.il/';
const STAMP = '20260901T000000Z'; // DTSTAMP קבוע — בנייה חוזרת לא משנה קבצים
const START = '/* cal:gen:start', END = '/* cal:gen:end */';
const CAL_DIR = join(ROOT, 'cal');

// אותן פונקציות פענוח שהאתר משתמש בהן
const ctx = {}; vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, 'calendar.js'), 'utf8'), ctx);
const { ics, parseDt, hoursFrom, pickHours, isTitle } = ctx.pmhCal;

const fail = msg => { console.error('build-cal: ' + msg); process.exit(1); };
const ENT = { amp: '&', quot: '"', lt: '<', gt: '>', nbsp: ' ', '#39': "'" };
const decode = s => s.replace(/&(amp|quot|lt|gt|nbsp|#39);/g, (_, k) => ENT[k]);
const text = s => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const attrs = s => Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));
const lf = s => s.replace(/\r\n/g, '\n');

/* מסיר <span class="sm">…</span> (שורת משנה בתא) כולל span-ים מקוננים */
function dropSm(html) {
  let out = '', i = 0;
  for (;;) {
    const k = html.indexOf('<span class="sm"', i);
    if (k < 0) return out + html.slice(i);
    out += html.slice(i, k);
    const re = /<(\/?)span\b[^>]*>/g; re.lastIndex = k;
    let depth = 0, m;
    while ((m = re.exec(html))) { depth += m[1] ? -1 : 1; if (!depth) break; }
    if (depth) return out;
    i = re.lastIndex;
  }
}
function rowTitle(cells, dt) {
  for (const c of cells) {
    if (c === dt) continue;
    const t = text(dropSm(c.html));
    if (isTitle(t)) return t;
  }
  return '';
}

/* ---------- 1. קריאת הטבלאות ---------- */
const H = readFileSync(join(ROOT, 'hishtalmuyot.html'), 'utf8');
const tables = [];
for (const [, secId, body] of H.matchAll(/<section class="prog[^"]*" id="([^"]+)"([\s\S]*?)<\/section>/g)) {
  for (const tm of body.matchAll(/<table class="sched"([^>]*)>([\s\S]*?)<\/table>/g)) {
    const ta = attrs(tm[1]);
    if (!ta['data-track'] && !ta['data-cal']) continue;
    const heads = [...body.slice(0, tm.index).matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)];
    const heading = heads.length ? text(heads.at(-1)[1].replace(/<small[\s\S]*?<\/small>/, '')) : secId;
    const rows = [];
    let headHours = null, prevYear = 0, lastHours = {}, full = 0;
    for (const rm of tm[2].matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)) {
      const ra = attrs(rm[1]);
      const cells = [...rm[2].matchAll(/<t([dh])([^>]*)>([\s\S]*?)<\/t[dh]>/g)].map(c => ({ th: c[1] === 'h', a: c[2], html: c[3] }));
      if (headHours === null && cells[0] && cells[0].th) headHours = hoursFrom(text(cells[0].html)); // כמו querySelector('th')
      const dt = cells.find(c => /class="dt"/.test(c.a));
      if (!dt) continue;
      const p = parseDt(text(dt.html), prevYear);
      if (!p) continue; // "—" = מועד שטרם נקבע
      prevYear = +(p.endDate || p.date).slice(0, 4);
      const rowTxt = cells.map(c => text(c.html)).join(' '), gs = ra['data-gs'] || '';
      const short = cells.length < full; full = Math.max(full, cells.length);
      const h = pickHours(rowTxt, gs, short ? lastHours : null, headHours);
      if (!short) lastHours = hoursFrom(rowTxt);
      rows.push({ ra, p, h, title: ra['data-g'] || rowTitle(cells, dt) || heading });
    }
    tables.push({ secId, ta, heading, rows });
  }
}
if (!tables.length) fail('לא נמצאה אף טבלה מסומנת ב-hishtalmuyot.html');

/* ---------- 2. הגאנט ---------- */
const gPath = join(ROOT, 'gantt.html');
const G0 = readFileSync(gPath, 'utf8');
const s0 = G0.indexOf(START), e0 = G0.indexOf(END);
if (s0 < 0 || e0 < 0) fail('הסימונים cal:gen חסרים ב-gantt.html');
const evalGantt = src => vm.runInNewContext(src.slice(src.indexOf('const TRACKS = {'), src.indexOf('/* ===== רינדור')) + ';({TRACKS, EVENTS})');
const { TRACKS } = evalGantt(G0);

const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const groups = new Map(); // מסלול → שורות, לפי סדר ההופעה בעמוד
for (const t of tables) {
  const tk = t.ta['data-track'];
  if (!tk) continue;
  if (!TRACKS[tk]) fail(`data-track="${tk}" לא קיים ב-TRACKS שבגאנט`);
  if (!groups.has(tk)) groups.set(tk, []);
  for (const r of t.rows) {
    if (!r.ra['data-g']) fail(`שורה בלי data-g (שם בגאנט) בטבלה ${tk}, תאריך ${r.p.date}`);
    groups.get(tk).push({ t, r });
  }
}
const NL = G0.includes('\r\n') ? '\r\n' : '\n'; // שומרים על סופי השורה של הקובץ
let block = START + ' — נבנה אוטומטית מטבלאות המועדים ב-hishtalmuyot.html (tools/build-cal.mjs).' + NL +
  '    לא עורכים כאן: משנים בטבלה בעמוד ההשתלמויות. */' + NL;
for (const [tk, list] of groups) {
  block += ` /* --- ${TRACKS[tk].name} --- */` + NL;
  list.sort((a, b) => a.r.p.date.localeCompare(b.r.p.date)); // יציב — שומר סדר באותו יום
  for (const { t, r } of list) {
    let o = `{t:${q(tk)}, d:${q(r.p.date)}`;
    if (r.p.endDate) o += `, d2:${q(r.p.endDate)}`;
    o += `, n:${q(r.ra['data-g'])}, s:${q(r.ra['data-gs'] || '')}`;
    if (r.ra['data-ga']) o += `, a:${q(r.ra['data-ga'])}`;
    if (t.ta['data-gu']) o += `, u:${q(t.ta['data-gu'])}`;
    block += ` ${o}},` + NL;
  }
}
block += ' ' + END;
const G1 = G0.slice(0, s0) + block + G0.slice(e0 + END.length);

/* ---------- 3. יומני המנוי ---------- */
const { EVENTS: MANUAL } = evalGantt(G1.slice(0, G1.indexOf(START)) + G1.slice(G1.indexOf(END) + END.length));
const feeds = new Map(); // מזהה → {name, events}
const feed = (id, name) => { if (!feeds.has(id)) feeds.set(id, { name, events: [] }); return feeds.get(id).events; };
const aud = (tk, a) => a || TRACKS[tk].aud || '';

for (const [tk, list] of groups) {
  const evs = feed(tk, TRACKS[tk].name + ' · תשפ״ז');
  for (const { t, r } of list) {
    evs.push({ title: r.ra['data-g'] + ' · ' + TRACKS[tk].name, date: r.p.date, endDate: r.p.endDate || null,
      start: r.h.start, end: r.h.end, desc: [aud(tk, r.ra['data-ga']), r.ra['data-gs']].filter(Boolean).join(' · '),
      url: SITE + (t.ta['data-gu'] || 'hishtalmuyot.html#' + t.secId) });
  }
}
for (const e of MANUAL) { // ידני בגאנט: חגים, אירועים לאומיים, בחינות, הודעות
  const tk = e.t, h = hoursFrom(e.s);
  const pre = tk === 'exam' ? 'בחינת בגרות: ' : '';
  const post = groups.has(tk) ? ' · ' + TRACKS[tk].name : '';
  feed(tk, TRACKS[tk].name + ' · תשפ״ז').push({ title: pre + e.n + post, date: e.d, endDate: e.d2 || null,
    start: h.start, end: h.end, desc: [aud(tk, e.a), e.s].filter(Boolean).join(' · '),
    url: SITE + (e.u || 'gantt.html') });
}
for (const t of tables) {
  const id = t.ta['data-cal'];
  if (!id) continue;
  const subject = t.heading.split(' — ')[0];
  const evs = feed(id, t.heading + ' · הדרכות תשפ״ז');
  for (const r of t.rows) {
    evs.push({ title: r.title.startsWith(subject) ? r.title : subject + ' · ' + r.title, date: r.p.date, endDate: r.p.endDate || null,
      start: r.h.start, end: r.h.end, desc: t.heading + ' · הדרכה בתחומי הדעת',
      url: SITE + 'hishtalmuyot.html#' + t.secId });
  }
}
const out = new Map();
for (const [id, f] of feeds) {
  if (!/^[\w-]+$/.test(id)) fail(`מזהה יומן לא תקין: ${id}`);
  f.events.sort((a, b) => a.date.localeCompare(b.date));
  out.set(id + '.ics', ics(f.events, f.name, { stamp: STAMP, feed: true }));
}

/* ---------- 4. כתיבה / בדיקה ---------- */
const stale = existsSync(CAL_DIR) ? readdirSync(CAL_DIR).filter(f => f.endsWith('.ics') && !out.has(f)) : [];
const changed = [];
if (lf(G1) !== lf(G0)) changed.push('gantt.html');
for (const [f, body] of out) {
  const p = join(CAL_DIR, f);
  if (!existsSync(p) || readFileSync(p, 'utf8') !== body) changed.push('cal/' + f);
}
stale.forEach(f => changed.push('cal/' + f + ' (למחיקה)'));

if (CHECK) {
  if (changed.length) fail('לא מעודכן — להריץ node tools/build-cal.mjs:\n  ' + changed.join('\n  '));
  console.log(`build-cal: מעודכן (${groups.size} מסלולים בגאנט, ${out.size} יומנים)`);
  process.exit(0);
}
if (lf(G1) !== lf(G0)) writeFileSync(gPath, G1);
mkdirSync(CAL_DIR, { recursive: true });
for (const [f, body] of out) writeFileSync(join(CAL_DIR, f), body);
stale.forEach(f => unlinkSync(join(CAL_DIR, f)));
console.log(`build-cal: ${groups.size} מסלולים בגאנט, ${out.size} יומנים` + (changed.length ? '\n  עודכן: ' + changed.join(', ') : ' — אין שינוי'));
