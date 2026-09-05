// שער איכות — חמישה כללים שמונעים חזרה למצב שלפני גלי השיפור.
//
// למה שער ולא דוח: check-freshness.mjs הוא התרעה לעורכת ולא מכשיל בנייה,
// וזה נכון לו — התיישנות היא שיפוט. הכללים כאן הם אחרים: כל אחד מהם מתאר
// מצב שכבר קרה באתר, נמצא, ותוקן. בלי שער הם יחזרו בעמוד הבא שייכתב,
// ואף אחד לא יידע עד שמישהו ייתקל בזה בשטח.
//
// הכללים:
//   1. התפריט והפוטר מסונכרנים עם templates/ (build-nav --check).
//   2. אין קישורים פנימיים שבורים, ואין og:url/canonical של עמוד אחר.
//   3. כל section="..." בסימון התפריט קיים בתבנית — אחרת שום פריט לא יסומן.
//   4. עמוד שמשתמש ב-.article טוען את article.css.
//   5. עמוד ארוך (1,200 מילים גלויות ומעלה) מציע דרך לנווט בתוכו.
//
// חריג מוצהר: <!-- pmh-allow: no-article-css --> או <!-- pmh-allow: no-nav -->
// בעמוד עצמו, עם נימוק אחרי הסימון. חריג הוא תיעוד, לא השתקה — הוא מודפס
// בסוף הריצה כדי שיישאר גלוי.
//
// הרצה:  node tools/check-rules.mjs        יוצא ב-1 אם יש הפרה
//        node tools/check-rules.mjs --list  מדפיס גם את החריגים המוצהרים

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LONG_WORDS = 1200;

const files = readdirSync(ROOT).filter(f => f.endsWith('.html') && !f.includes('.bak')).sort();
const fails = [];
const allowed = [];

const add = (rule, f, why) => fails.push({ rule, f, why });

/* ---------- 1. התפריט מסונכרן עם התבנית ---------- */
let navOut = '';
try {
  navOut = execSync('node tools/build-nav.mjs --check', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
} catch (e) {
  navOut = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
  add(1, '—', 'התפריט או הפוטר אינם מסונכרנים עם templates/. `node tools/build-nav.mjs` מתקן.' + '\n' +
    navOut.trim().split('\n').filter(l => l.includes('≠')).slice(0, 8).map(l => '      ' + l.trim()).join('\n'));
}
/* עמוד שהודבק מעמוד קיים בלי סימוני nav:start/foot:start נראה תקין
   היום, אבל הוא מוקפא: כל שינוי עתידי בתפריט יפסח עליו בשקט. */
for (const line of navOut.split('\n')) {
  const w = line.match(/⚠\s*(.+)$/);
  if (w) add(1, w[1].split(':')[0].trim(), w[1].split(':').slice(1).join(':').trim());
}

/* ---------- מפתחות ה-section שהתבנית מכירה ---------- */
const NAV_TPL = readFileSync(join(ROOT, 'templates/nav.html'), 'utf8');
const SECTIONS = new Set([...NAV_TPL.matchAll(/<a class="lnk[^"]*" href="([^"#]+)\.html"/g)].map(m => m[1]));

/* ---------- מילים גלויות: בלי מה שמקופל ב-details סגור ---------- */
function visibleWords(main) {
  let s = main.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
  s = s.replace(/<details\b(?![^>]*\bopen\b)[^>]*>([\s\S]*?)<\/details>/gi, (_, inner) =>
    ' ' + [...inner.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)].map(m => m[1]).join(' '));
  return s.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

for (const f of files) {
  const src = readFileSync(join(ROOT, f), 'utf8');
  const allow = new Set([...src.matchAll(/<!--\s*pmh-allow:\s*([a-z-]+)/g)].map(m => m[1]));
  for (const a of allow) allowed.push({ f, a });

  /* 2. קישורים פנימיים שבורים */
  for (const m of src.matchAll(/(?:href|src)="([^"#?]+)"/g)) {
    const h = m[1];
    if (/^(https?:|mailto:|tel:|javascript:|data:|\/\/)/i.test(h)) continue;
    if (/[${}'+]/.test(h) || !h.trim()) continue;
    if (!existsSync(join(ROOT, h.replace(/^\//, '')))) add(2, f, `קישור שבור: ${h}`);
  }
  const isContent = src.includes('<nav class="nav">');
  if (isContent) {
    const og = src.match(/<meta property="og:url" content="[^"]*\/([^"\/]+)"/);
    if (og && og[1] !== f) add(2, f, `og:url מצביע ל-${og[1]}`);
    const canon = src.match(/<link rel="canonical" href="[^"]*\/([^"\/]+)"/);
    if (canon && canon[1] !== f) add(2, f, `canonical מצביע ל-${canon[1]}`);
  }

  /* 3. section שאינו קיים בתבנית */
  const sec = src.match(/<!-- nav:start\s+section="([^"]*)"/);
  if (sec && sec[1] && !SECTIONS.has(sec[1]))
    add(3, f, `section="${sec[1]}" אינו קיים בתבנית — שום פריט בתפריט לא יסומן`);

  const mm = src.match(/<main id="main">([\s\S]*?)<\/main>/);
  if (!mm) continue;
  const main = mm[1];

  /* 4. .article בלי הגיליון שמעצב אותו */
  if (src.includes('class="article"') && !src.includes('article.css"') && !allow.has('no-article-css'))
    add(4, f, 'משתמש ב-.article אבל אינו טוען article.css — רכיבי הקיפול, הטבלאות והרוחב לא יעבדו');

  /* 5. עמוד ארוך בלי דרך לנווט בתוכו */
  const words = visibleWords(main);
  const hasNav = (main.match(/<h2 class="sub-sec/g) || []).length >= 3
    || (main.match(/<h2\b/g) || []).length >= 3
    || /ptabs|data-pn-links|class="toc"|data-pn="off"/.test(src);
  if (words >= LONG_WORDS && !hasNav && !allow.has('no-nav'))
    add(5, f, `${words} מילים גלויות ואין בו פס ניווט, לשוניות או תוכן עניינים`);
}

const NAMES = {
  1: 'התפריט מסונכרן עם התבנית',
  2: 'קישורים פנימיים ותגיות שיתוף',
  3: 'section קיים בתבנית',
  4: '.article טוען article.css',
  5: 'עמוד ארוך מציע דרך לנווט',
};

if (!fails.length) {
  console.log('שער האיכות: חמישה כללים, אפס הפרות. ' + files.length + ' עמודים נבדקו.');
} else {
  console.log('שער האיכות — ' + fails.length + ' הפרות:\n');
  for (const r of [1, 2, 3, 4, 5]) {
    const g = fails.filter(x => x.rule === r);
    if (!g.length) continue;
    console.log(`  כלל ${r} · ${NAMES[r]} — ${g.length}`);
    for (const x of g.slice(0, 12)) console.log(`    ${x.f}: ${x.why}`);
    if (g.length > 12) console.log(`    …ועוד ${g.length - 12}`);
    console.log('');
  }
}

if (allowed.length && (process.argv.includes('--list') || fails.length)) {
  console.log('חריגים מוצהרים (pmh-allow):');
  for (const a of allowed) console.log(`  ${a.f} — ${a.a}`);
}

process.exit(fails.length ? 1 : 0);
