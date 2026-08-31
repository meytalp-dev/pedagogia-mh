// בדיקת התיישנות אוטומטית (T86) — רצה באקשן אחרי כל עדכון תוכן, ומקומית.
//
// מה נבדק:
//   1. עמודים שלא נגעו בהם 180 יום ומעלה (לפי git).
//   2. קישורים פנימיים שבורים — href/src לקובץ שלא קיים ברפו.
//   3. תג השנה: <meta name="pmh-year"> שאינו השנה הנוכחית, או עמוד תוכן בלי תג.
//   4. שנה קודמת בכותרת/פתיח של עמוד שמתויג כשנה הנוכחית.
//
// הפלט: טבלת Markdown ל-$GITHUB_STEP_SUMMARY (מופיעה בעמוד הריצה באקשן)
// וגם ל-stdout. לא מכשיל את הבנייה — זו התרעה לעורכת, לא שער.
//
// הרצה מקומית:  node tools/check-freshness.mjs
// שינוי השנה הנוכחית: CURRENT_YEAR למטה (פעם בשנה, בקיץ).

import { readFileSync, readdirSync, existsSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CURRENT_YEAR = 'תשפ״ז';
const OLDER_YEARS = ['תשפ״ד', 'תשפ״ה', 'תשפ״ו'];
const STALE_DAYS = 180;

const files = readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
const stale = [], broken = [], yearOff = [], noYear = [], oldInHead = [];
const now = Date.now();

// קומיטים אוטומטיים של רענון תבנית/ידע לא נחשבים "עריכת תוכן" — אחרת כל עמוד
// מתאפס בכל שינוי תפריט. מדלגים עליהם ומוצאים את מועד עריכת התוכן האמיתי.
const AUTO_MSG = /(עדכון אוטומטי של knowledge|תבנית אחת לתפריט|רענון|build-nav|knowledge\.json)/;
function lastCommitDate(f) {
  try {
    const out = execSync(`git log -30 --format=%cs%x09%s -- "${f}"`, { cwd: ROOT, encoding: 'utf8' }).trim();
    if (!out) return null;
    for (const line of out.split('\n')) {
      const tab = line.indexOf('\t');
      const date = line.slice(0, tab), subj = line.slice(tab + 1);
      if (!AUTO_MSG.test(subj)) return date; // הקומיט האנושי האחרון
    }
    return out.split('\t')[0]; // הכול אוטומטי — נופלים למועד האחרון
  } catch { return null; }
}
function text(html) { return html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); }

for (const f of files) {
  const src = readFileSync(join(ROOT, f), 'utf8');
  const isContent = src.includes('<nav class="nav">');

  // 1. התיישנות לפי git
  const d = lastCommitDate(f);
  if (d) {
    const days = Math.round((now - Date.parse(d)) / 86400000);
    if (days >= STALE_DAYS) stale.push({ f, d, days });
  }

  // 2. קישורים פנימיים שבורים (מדלגים על תבניות JS כמו ${...} או '+x+')
  for (const m of src.matchAll(/(?:href|src)="([^"#?]+)"/g)) {
    const h = m[1];
    if (/^(https?:|mailto:|tel:|javascript:|data:|\/\/)/i.test(h)) continue;
    if (/[${}'+]/.test(h) || !h.trim()) continue;
    const p = h.replace(/^\//, '');
    if (!existsSync(join(ROOT, p))) broken.push({ f, h });
  }

  if (!isContent) continue;

  // 2ב. תגיות שיתוף שהועתקו מעמוד המעטפת — og:url שמצביע לעמוד אחר
  const og = src.match(/<meta property="og:url" content="[^"]*\/([^"\/]+)"/);
  if (og && og[1] !== f) broken.push({ f, h: `og:url → ${og[1]} (תגית שיתוף של עמוד אחר)` });
  const canon = src.match(/<link rel="canonical" href="[^"]*\/([^"\/]+)"/);
  if (canon && canon[1] !== f) broken.push({ f, h: `canonical → ${canon[1]}` });

  // 3. תג השנה
  const meta = src.match(/<meta name="pmh-year" content="([^"]*)"/);
  if (!meta) noYear.push(f);
  else if (meta[1] !== CURRENT_YEAR) yearOff.push({ f, y: meta[1] });

  // 4. שנה קודמת בכותרת/פתיח של עמוד המתויג כשנה הנוכחית
  if (meta && meta[1] === CURRENT_YEAR) {
    const head = [/<title>([\s\S]*?)<\/title>/, /<h1[^>]*>([\s\S]*?)<\/h1>/, /class="kicker"[^>]*>([\s\S]*?)<\//, /<p class="lead">([\s\S]*?)<\/p>/]
      .map(re => (src.match(re) || [, ''])[1]).join(' ');
    const hit = OLDER_YEARS.filter(y => text(head).includes(y));
    if (hit.length && !text(head).includes(CURRENT_YEAR)) oldInHead.push({ f, y: hit.join(', ') });
  }
}

let md = `## בדיקת התיישנות · ${new Date().toISOString().slice(0, 10)}\n\n`;
md += `| בדיקה | ממצאים |\n|---|---|\n`;
md += `| עמודים שלא עודכנו ${STALE_DAYS} יום | ${stale.length} |\n`;
md += `| קישורים פנימיים שבורים | ${broken.length} |\n`;
md += `| עמודים המתויגים לשנה שאינה ${CURRENT_YEAR} | ${yearOff.length} |\n`;
md += `| עמודי תוכן בלי תג שנה | ${noYear.length} |\n`;
md += `| שנה קודמת בכותרת של עמוד ${CURRENT_YEAR} | ${oldInHead.length} |\n\n`;
if (stale.length) md += `### לא עודכנו ${STALE_DAYS} יום\n` + stale.sort((a, b) => b.days - a.days).map(s => `- ${s.f} — ${s.d} (${s.days} יום)`).join('\n') + '\n\n';
if (broken.length) {
  // מקובץ לפי היעד — קישור שבור בתפריט מופיע ב-155 עמודים, ומספיקה שורה אחת
  const byTarget = {};
  for (const b of broken) (byTarget[b.h] = byTarget[b.h] || []).push(b.f);
  md += `### קישורים שבורים\n` + Object.keys(byTarget).map(h => {
    const fs = byTarget[h];
    return `- \`${h}\` — ${fs.length > 3 ? `${fs.length} עמודים (${fs.slice(0, 3).join(', ')}…)` : fs.join(', ')}`;
  }).join('\n') + '\n\n';
}
if (yearOff.length) md += `### מתויגים לשנה אחרת (ארכיון?)\n` + yearOff.map(y => `- ${y.f} — ${y.y}`).join('\n') + '\n\n';
if (noYear.length) md += `### בלי תג שנה\n` + noYear.map(f => `- ${f}`).join('\n') + '\n\n';
if (oldInHead.length) md += `### שנה קודמת בכותרת/פתיח\n` + oldInHead.map(o => `- ${o.f} — ${o.y}`).join('\n') + '\n\n';
if (!stale.length && !broken.length && !yearOff.length && !noYear.length && !oldInHead.length) md += 'הכול עדכני.\n';

console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
