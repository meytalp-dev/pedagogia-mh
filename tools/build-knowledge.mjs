#!/usr/bin/env node
/**
 * בונה את knowledge.json — קובץ הידע שעוגן (הצ'אטבוט) מושך מהאתר.
 *
 * מה הוא עושה: עובר על כל עמודי ה-HTML באתר, מחלץ מכל עמוד את הטקסט
 * המהותי (בלי תפריטים, ניווט וסקריפטים) + כותרת + תיאור + קישורים,
 * וכותב הכול ל-knowledge.json בשורש האתר.
 *
 * הקובץ נטען על ידי ה-backend של עוגן (Google Apps Script) פעם בשעה,
 * כך שכל עמוד שנוסף לאתר נכנס לידע של עוגן אוטומטית — בלי לגעת בקוד.
 *
 * מתי הוא רץ: אוטומטית ב-GitHub Action על כל push שמשנה HTML,
 * ואפשר גם ידנית:  node tools/build-knowledge.mjs
 *
 * כוונון עלות: MAX_TOTAL_CHARS קובע את גודל הידע שנשלח למודל בכל שאלה.
 * גדול יותר = עוגן יודע יותר פרטים, אבל כל שאלה עולה יותר טוקנים.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://pedagogiamh.co.il";
const OUT = join(ROOT, "knowledge.json");

const MAX_PAGE_CHARS = 2000;   // תקרה לטקסט של עמוד בודד
const MAX_TOTAL_CHARS = 80000; // תקרה כוללת לכל הידע — טקסט + קישורים (נאכפת ע"י הקטנת תקרת העמוד)
const MAX_LINKS = 10;          // קישורים חיצוניים לכל עמוד

const SKIP = new Set(["_doc-template.html", "chipus.html", "work-plans-app.html", "em-head.tmp.html", "bagmgr.html",
  "admin.html", "sikum-matzevet.html", "matzevet-list.html", "talmidim.html"]);

/* מסיר אלמנט שלם מה-HTML כולל תגיות מקוננות מאותו סוג (למשל div בתוך div) */
function removeBlocks(html, openerRe) {
  let result = html;
  for (;;) {
    openerRe.lastIndex = 0;
    const m = openerRe.exec(result);
    if (!m) return result;
    const tag = m[1].toLowerCase();
    const tokenRe = new RegExp(`<${tag}(?=[\\s>])|</${tag}>`, "gi");
    tokenRe.lastIndex = m.index;
    let depth = 0;
    let end = result.length;
    let t;
    while ((t = tokenRe.exec(result))) {
      if (t[0][1] === "/") {
        depth--;
        if (depth === 0) { end = tokenRe.lastIndex; break; }
      } else {
        depth++;
      }
    }
    result = result.slice(0, m.index) + " " + result.slice(end);
  }
}

function decodeEntities(s) {
  const map = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
    "&#39;": "'", "&apos;": "'", "&nbsp;": " ", "&middot;": "·",
    "&rarr;": "←", "&larr;": "→", "&hellip;": "…",
  };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&[a-z]+;/gi, (e) => map[e] ?? " ");
}

function extractPage(html, url) {
  const titleM = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleM
    ? decodeEntities(titleM[1]).split("·")[0].trim()
    : url;
  const descM = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const description = descM ? decodeEntities(descM[1]).trim() : "";

  let body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];

  // הסרת השלד המשותף לכל העמודים: תפריטים, ניווט, פס ממשלתי, סקריפטים
  for (const re of [
    /<(script)[\s>]/i,
    /<(style)[\s>]/i,
    /<(noscript)[\s>]/i,
    /<(svg)[\s>]/i,
    /<(aside)\s[^>]*class="[^"]*drawer[^"]*"/i,
    /<(div)\s[^>]*class="[^"]*scrim[^"]*"/i,
    /<(div)\s[^>]*class="[^"]*govbar[^"]*"/i,
    /<(nav)[\s>]/i,
    /<(footer)[\s>]/i,
  ]) {
    body = removeBlocks(body, new RegExp(re.source, "gi"));
  }

  // קישורים חיצוניים שמופיעים בעמוד (בלי פונטים וכד'), עם שם הקישור.
  // השם חשוב: בלעדיו עוגן לא יודעת מה יש בכתובת, ולכן לא תדע להפנות לנוהל הנכון.
  const links = [];
  const seenUrls = new Set();
  for (const lm of body.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const u = lm[1];
    if (/fonts\.googleapis|fonts\.gstatic|googletagmanager/.test(u)) continue;
    if (u.startsWith(SITE)) continue;
    if (seenUrls.has(u)) continue;
    seenUrls.add(u);
    const label = decodeEntities(lm[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
    links.push(label ? label + " — " + u : u);
    if (links.length >= MAX_LINKS) break;
  }

  // תגיות → טקסט: שבירת שורה בגבולות בלוקים, ואז ניקוי
  const text = decodeEntities(
    body
      .replace(/<(?:h[1-6]|p|li|div|section|article|tr|br)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  return { url, title, description, text, links };
}

function clip(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastBreak = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(" "));
  return (lastBreak > max * 0.6 ? cut.slice(0, lastBreak) : cut).trim() + "…";
}

/* ---------- איסוף העמודים ---------- */
const files = readdirSync(ROOT)
  .filter((f) => f.endsWith(".html") && !SKIP.has(f))
  .sort();

const pages = [];
for (const f of files) {
  const html = readFileSync(join(ROOT, f), "utf8");
  pages.push(extractPage(html, `${SITE}/${f}`));
}
// עמוד הכלים (רשימת כל הכלים הדיגיטליים); עמודי הכלים עצמם הם אפליקציות — אין בהם טקסט
const toolsIndex = join(ROOT, "tools", "index.html");
if (existsSync(toolsIndex)) {
  pages.push(extractPage(readFileSync(toolsIndex, "utf8"), `${SITE}/tools/`));
}

/* ---------- אכיפת תקציב הגודל הכולל ---------- */
let cap = MAX_PAGE_CHARS;
const linkChars = (p) => (p.links || []).reduce((sum, l) => sum + l.length + 3, 0);
const totalAt = (c) => pages.reduce((sum, p) => sum + Math.min(p.text.length, c) + linkChars(p), 0);
while (cap > 300 && totalAt(cap) > MAX_TOTAL_CHARS) cap -= 100;
for (const p of pages) p.text = clip(p.text, cap);

const total = pages.reduce((s, p) => s + p.text.length, 0);
const out = {
  site: SITE,
  generatedAt: new Date().toISOString(),
  pageCount: pages.length,
  pages,
};
writeFileSync(OUT, JSON.stringify(out), "utf8");

console.log(`knowledge.json: ${pages.length} עמודים, ${total.toLocaleString()} תווי טקסט (תקרה לעמוד: ${cap})`);
for (const p of pages) console.log(`  ${String(p.text.length).padStart(5)}  ${p.url}`);
