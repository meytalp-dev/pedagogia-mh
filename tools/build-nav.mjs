// מרענן את התפריט והפוטר בכל עמודי האתר מתוך תבנית אחת.
//
// למה: התפריט היה משוכפל ידנית ב-160 קבצים, וכל שינוי בו התפזר לגרסאות
// סותרות (עמודים עם דור ישן, בלי מדור, בלי תפריט). מעכשיו יש מקור אחד —
// templates/nav.html ו-templates/foot.html — והעמודים מכילים רק עותק
// שמתחדש בכל בנייה.
//
// איך: כל עמוד מסמן את הבלוק המתחלף בהערות HTML:
//     <!-- nav:start section="procedures" -->  …  <!-- nav:end -->
//     <!-- foot:start tagline="מרחב מנהלים" --> …  <!-- foot:end -->
// הסקריפט מחליף רק את מה שבין הסימונים ומשאיר את שאר העמוד כפי שהוא —
// כך אפשר להמשיך לערוך עמודים ידנית בלי לאבד כלום.
//   section  — מפתח הפריט שיסומן active (שם הקובץ בלי .html של הפריט בתפריט).
//   tagline  — הטקסט בצד ימין של הפוטר. בלי tagline: שם האתר.
//
// הרצה:  node tools/build-nav.mjs          מעדכן קבצים שהשתנו
//        node tools/build-nav.mjs --check  רק בודק, יוצא ב-1 אם יש עמוד לא מעודכן
//
// רץ גם באקשן build-knowledge לפני בניית הידע והחיפוש.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const SITE_NAME = 'הבית של המנהיגות הפדגוגית היוצרת';

function stripComment(tpl) {
  // הערת ההסבר בראש התבנית לא נכנסת לעמודים
  const end = tpl.indexOf('-->');
  return (tpl.startsWith('<!--') && end > -1 ? tpl.slice(end + 3) : tpl).trim();
}
const NAV_TPL = stripComment(readFileSync(join(ROOT, 'templates/nav.html'), 'utf8'));
const FOOT_TPL = stripComment(readFileSync(join(ROOT, 'templates/foot.html'), 'utf8'));

// מפתחות ה-section המוכרים — כל href של a.lnk בתבנית
const SECTIONS = new Set(
  [...NAV_TPL.matchAll(/<a class="lnk" href="([^"#]+)\.html"/g)].map(m => m[1])
);

function parseAttrs(str) {
  const out = {};
  for (const m of str.matchAll(/([a-z]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function renderNav(section) {
  if (!section) return NAV_TPL;
  return NAV_TPL.replace(/<a class="lnk" href="([^"#]+)\.html"/g, (all, key) =>
    key === section ? `<a class="lnk active" href="${key}.html"` : all
  );
}

function renderFoot(tagline) {
  return FOOT_TPL.replace('{{tagline}}', tagline || SITE_NAME);
}

const NAV_RE = /<!-- nav:start([^>]*?)-->[\s\S]*?<!-- nav:end -->/;
const FOOT_RE = /<!-- foot:start([^>]*?)-->[\s\S]*?<!-- foot:end -->/;

const files = readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
const changed = [], warnings = [];
let managedNav = 0, managedFoot = 0;

for (const f of files) {
  const src = readFileSync(join(ROOT, f), 'utf8');
  const crlf = src.includes('\r\n');
  const eol = s => (crlf ? s.replace(/\r?\n/g, '\r\n') : s);
  let out = src;

  const nav = src.match(NAV_RE);
  if (nav) {
    managedNav++;
    const { section = '' } = parseAttrs(nav[1]);
    if (section && !SECTIONS.has(section)) warnings.push(`${f}: section="${section}" לא קיים בתבנית`);
    const block = `<!-- nav:start${section ? ` section="${section}"` : ''} -->\n${renderNav(section)}\n<!-- nav:end -->`;
    out = out.replace(NAV_RE, () => eol(block));
  } else if (src.includes('<nav class="nav">')) {
    warnings.push(`${f}: יש תפריט אבל אין סימוני nav:start/nav:end — לא מתעדכן מהתבנית`);
  }

  const foot = src.match(FOOT_RE);
  if (foot) {
    managedFoot++;
    const { tagline = '' } = parseAttrs(foot[1]);
    const block = `<!-- foot:start${tagline ? ` tagline="${tagline}"` : ''} -->\n${renderFoot(tagline)}\n<!-- foot:end -->`;
    out = out.replace(FOOT_RE, () => eol(block));
  } else if (nav && f !== 'index.html') {
    warnings.push(`${f}: יש פוטר אבל אין סימוני foot:start/foot:end`);
  }

  if (out !== src) {
    changed.push(f);
    if (!CHECK) writeFileSync(join(ROOT, f), out, 'utf8');
  }
}

console.log(`build-nav: ${managedNav} עמודים עם תפריט מנוהל, ${managedFoot} עם פוטר מנוהל, ${changed.length} ${CHECK ? 'דורשים עדכון' : 'עודכנו'}`);
for (const c of changed) console.log('  ' + (CHECK ? '≠ ' : '✓ ') + c);
for (const w of warnings) console.log('  ⚠ ' + w);
if (CHECK && changed.length) process.exit(1);
