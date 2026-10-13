/* מושך משרת מנור את שינויי המועד שהמדריכות עשו (plan.changes) וכותב אותם ל-
   hadrachot/assets/plan-changes.js. משם הם מונחים על plans.js בכל דפי מנור,
   ובטבלאות, בגאנט וביומן המנוי (build-cal.mjs רץ אחריו באקשן).
   רץ מ-.github/workflows/sync-plan-changes.yml כל חצי שעה.

   הרצה:  node tools/sync-plan-changes.mjs     כותב רק כשיש שינוי, ומדפיס changed / unchanged
   כתובת השרת נלקחת מ-hadrachot/assets/app.js (DEFAULT_URL) — מקור אחד. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'hadrachot', 'assets', 'plan-changes.js');
const fail = msg => { console.error('sync-plan-changes: ' + msg); process.exit(1); };

const app = readFileSync(join(ROOT, 'hadrachot', 'assets', 'app.js'), 'utf8');
const url = (/DEFAULT_URL\s*=\s*'(https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec)'/.exec(app) || [])[1];
if (!url) fail('לא נמצאה כתובת השרת (DEFAULT_URL) ב-app.js');

let body = null;
for (let i = 0; i < 3 && !body; i++) {
  try {
    const r = await fetch(url + '?action=plan.changes&t=' + Date.now(), { redirect: 'follow' });
    const j = await r.json();
    if (j && j.ok && j.data && Array.isArray(j.data.changes)) body = j;
  } catch (e) { /* "הדף לא נמצא" רגעי של Apps Script — עוד ניסיון */ }
  if (!body) await new Promise(res => setTimeout(res, 2000));
}
// שרת שלא עונה — לא נוגעים בקובץ: עדיף שינוי שמתעכב מאשר מחיקה של כל השינויים.
// לא נכשלים: תקלה רגעית של גוגל לא צריכה לשלוח למיטל מייל "הריצה נכשלה" כל חצי שעה.
if (!body) { console.warn('sync-plan-changes: השרת לא ענה — הקובץ נשאר כמו שהוא, ננסה בריצה הבאה'); process.exit(0); }

const D = /^\d{4}-\d{2}-\d{2}$/, T = /^\d{2}:\d{2}$/, S = /^[a-z0-9_-]{1,40}$/i;
const list = body.data.changes
  .filter(c => c && S.test(c.g) && D.test(c.m) && D.test(c.f) && T.test(c.fs) && D.test(c.t) && T.test(c.ts))
  .map(c => ({ g: c.g, m: c.m, f: c.f, fs: c.fs, t: c.t, ts: c.ts }))
  .sort((a, b) => (a.g + a.m + a.f + a.fs).localeCompare(b.g + b.m + b.f + b.fs));

const old = readFileSync(OUT, 'utf8');
const NL = old.includes('\r\n') ? '\r\n' : '\n';
const head = old.slice(0, old.indexOf('window.TS_PLAN_CHANGES'));
if (!head) fail('מבנה הקובץ plan-changes.js לא מוכר');
const json = list.length ? '[' + NL + list.map(c => '  ' + JSON.stringify(c)).join(',' + NL) + NL + ']' : '[]';
const next = head + 'window.TS_PLAN_CHANGES = ' + json + ';' + NL +
  'if (window.TS_applyPlanChanges) window.TS_applyPlanChanges(window.TS_PLAN_CHANGES);' + NL;
if (next === old) { console.log('unchanged · ' + list.length + ' שינויים'); process.exit(0); }
writeFileSync(OUT, next, 'utf8');
console.log('changed · ' + list.length + ' שינויים');
