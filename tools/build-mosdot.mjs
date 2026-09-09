/* ============================================================
   בניית data/mosdot.json — שכבת הנתונים הציבורית של אדמין המוסדות
   -----------------------------------------------------------
   מרכיב קובץ אחד משלושה מקורות שכבר קיימים באתר:

     prisat-pikuah.html   — 64 המוסדות: סמל, שם, רשת, מחוז, מגזר,
                            מפקח.ת פדגוגי.ת תשפ"ז ותשפ"ו
     pikuah-miktzoi.html  — המגמות בכל מוסד + המפקח.ת המקצועי.ת
     hadrachot/assets/guides.js — המדריכות והמפקחים של מצפן ההדרכות

   ** בקובץ הזה אין ולא יהיה טלפון או מייל. **
   פרטי הקשר האישיים נשלפים בזמן אמת מגיליון בדרייב דרך
   apps-script-הרשאות.js (מפתח admin-contacts) — ראו admin-mosdot.html.

   הרצה:  node tools/build-mosdot.mjs
   ============================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/* פענוח ישויות HTML — השמות בקבצי המקור מקודדים (&quot; &#x27;) */
function decode(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/* מוריד תגיות ומשאיר טקסט נקי */
const text = (html) => decode(String(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

/* ---------- 1. פריסת הפיקוח — הרשימה הראשית ---------- */

function readPrisat() {
  const html = read('prisat-pikuah.html');
  const rows = html.match(/<tr data-sup="[^"]*"[\s\S]*?<\/tr>/g) || [];
  const schools = rows.map((row) => {
    const attr = (n) => decode((row.match(new RegExp(`data-${n}="([^"]*)"`)) || [, ''])[1]);
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    const prevCell = cells[6] || '';
    return {
      semel: text(cells[0]) || '',
      name: text(cells[1]),
      network: text(cells[2]),
      district: attr('d'),
      sector: attr('s'),
      /* ליווי משותף מסומן בפריסה בשני שמות מופרדים ב-| */
      sup: attr('sup').split('|')[0].trim(),
      sups: attr('sup').split('|').map((x) => x.trim()).filter(Boolean),
      /* בתא "מפקח.ת תשפ״ו" יושבת גם תווית "שינוי" — מסירים אותה */
      supPrev: text(prevCell.replace(/<span class="chg">[\s\S]*?<\/span>/, '')),
      changed: attr('chg') === '1',
      megamot: []
    };
  });
  if (schools.length !== 64) {
    throw new Error(`ציפינו ל-64 מוסדות ב-prisat-pikuah.html, נמצאו ${schools.length}. ` +
                    'אם הפריסה באמת השתנתה — לעדכן גם את הבדיקה הזאת.');
  }
  return schools;
}

/* ---------- 2. הפיקוח המקצועי — המגמות ---------- */

function readMiktzoi() {
  const html = read('pikuah-miktzoi.html');
  const rows = [...html.matchAll(/<tr[^>]*data-sc="(\d*)"[^>]*>([\s\S]*?)<\/tr>/g)];
  return rows.map(([, semel, body]) => {
    const cells = [...body.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    const megCell = cells[2] || '';
    const name = text((megCell.match(/<span class="mg-name">([\s\S]*?)<\/span>/) || [, ''])[1]);
    const code = text((megCell.match(/<span class="mg-code">([\s\S]*?)<\/span>/) || [, ''])[1]);
    /* בתא הפיקוח המקצועי יכולים לשבת כמה דברים: שני מפקחים (span.sup-cell),
       הערה (span.mg-note), או "טרם שויך" (span.mg-open) כשאין מפקח.ת. */
    const supCell = cells[3] || '';
    const sups = [...supCell.matchAll(/<span class="sup-cell"[^>]*>([\s\S]*?)<\/span>\s*(?=<span class="(?:sup-cell|mg-note)"|$)/g)]
      .map((m) => text(m[1]))
      .filter((n) => n && n !== '—');
    return {
      semel,
      school: text(cells[1] || ''),
      name,
      code,
      /* הכיתות יושבות בתוך תא המגמה, בשורות מגמה בלבד */
      grades: text((megCell.match(/<span class="mg-gr">([\s\S]*?)<\/span>/) || [, ''])[1]),
      sups,
      note: text((supCell.match(/<span class="mg-note">([\s\S]*?)<\/span>/) || [, ''])[1]),
      open: /<span class="mg-open">/.test(supCell)
    };
  });
}

/* ---------- 3. המדריכות והמפקחים של מצפן ההדרכות ---------- */

/* guides.js הוא קובץ JS ולא JSON. במקום להריץ אותו — מחלצים את שני
   האובייקטים בעזרת Function, כך שההגדרה נשארת מקור אמת יחיד. */
function readGuides() {
  const js = read('hadrachot/assets/guides.js');
  const sandbox = { window: {} };
  new Function('window', js)(sandbox.window);
  const guides = sandbox.window.TS_GUIDES || {};
  const inspectors = sandbox.window.TS_INSPECTORS || {};

  const SECTOR_HE = { kelali: 'כללי', haredi: 'חרדי', arab: 'ערבי' };

  const guideList = Object.entries(guides).map(([slug, g]) => ({
    slug,
    name: g.name,
    subject: g.subject || '',
    sectors: (g.sectors || []).map((s) => SECTOR_HE[s] || s),
    units: g.units || [],
    tracks: g.tracks || [],
    inspector: inspectors[g.inspector] ? inspectors[g.inspector].name : ''
  }));

  const inspectorList = Object.entries(inspectors).map(([slug, i]) => ({
    slug,
    name: i.name,
    society: i.society || '',
    coverage: (i.coverage || []).map((c) => ({
      subject: c.subject,
      sectors: (c.sectors || []).map((s) => SECTOR_HE[s] || s)
    }))
  }));

  return { guides: guideList, inspectors: inspectorList };
}

/* ---------- הרכבה ---------- */

const schools = readPrisat();
const megamot = readMiktzoi();
const { guides, inspectors } = readGuides();

/* שיוך המגמות למוסדות: קודם לפי סמל, ואם אין סמל — לפי שם.
   שלושה מוסדות בפריסה ללא סמל (סור באהר, כפר עקב, אור דניאל). */
const bySemel = new Map();
const byName = new Map();
for (const s of schools) {
  if (s.semel) bySemel.set(s.semel, s);
  byName.set(s.name, s);
}

const unmatched = [];
for (const m of megamot) {
  const target = bySemel.get(m.semel) || byName.get(m.school);
  if (!target) {
    if (!unmatched.some((u) => u.semel === m.semel && u.school === m.school)) {
      unmatched.push({ semel: m.semel, school: m.school });
    }
    continue;
  }
  target.megamot.push({
    name: m.name, code: m.code, grades: m.grades,
    sups: m.sups, note: m.note, open: m.open
  });
}

/* פריסה לפי מפקח.ת — נגזרת, כדי שהעמוד לא יחשב אותה בכל טעינה */
const supMap = new Map();
for (const s of schools) {
  for (const name of s.sups) {
    if (!supMap.has(name)) supMap.set(name, []);
    supMap.get(name).push(s.semel || s.name);
  }
}
const supervisors = [...supMap.entries()]
  .map(([name, list]) => ({ name, count: list.length, schools: list }))
  .sort((a, b) => b.count - a.count);

/* מפקחים מקצועיים — נגזרים מהמגמות: מי מפקח על מה ובכמה מוסדות */
const profMap = new Map();
for (const s of schools) {
  for (const m of s.megamot) {
    for (const name of m.sups) {
      if (!profMap.has(name)) profMap.set(name, { megamot: new Set(), schools: new Set() });
      profMap.get(name).megamot.add(m.name);
      profMap.get(name).schools.add(s.semel || s.name);
    }
  }
}
const professional = [...profMap.entries()]
  .map(([name, v]) => ({
    name,
    megamot: [...v.megamot].sort(),
    schoolCount: v.schools.size
  }))
  .sort((a, b) => b.schoolCount - a.schoolCount);

const out = {
  meta: {
    generated: new Date().toISOString().slice(0, 10),
    count: schools.length,
    sources: [
      'prisat-pikuah.html — פריסת הפיקוח הפדגוגי תשפ"ז',
      'pikuah-miktzoi.html — מגמות ומפקחים מקצועיים תשפ"ז',
      'hadrachot/assets/guides.js — מדריכות ומפקחים, מצפן ההדרכות'
    ],
    /* מוסדות שמופיעים בפיקוח המקצועי ולא בפריסה — לתיעוד, לא שגיאה */
    unmatched
  },
  schools,
  supervisors,
  professional,
  guides,
  inspectors
};

writeFileSync(join(ROOT, 'data/mosdot.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');

const withMeg = schools.filter((s) => s.megamot.length).length;
console.log(`data/mosdot.json נכתב — ${schools.length} מוסדות, ${withMeg} מהם עם מגמות, ` +
            `${supervisors.length} מפקחים פדגוגיים, ${professional.length} מפקחים מקצועיים, ` +
            `${guides.length} מדריכות.`);
if (unmatched.length) {
  console.log('מוסדות מהפיקוח המקצועי שלא נמצאו בפריסה:');
  for (const u of unmatched) console.log(`  ${u.semel || '—'}  ${u.school}`);
}
