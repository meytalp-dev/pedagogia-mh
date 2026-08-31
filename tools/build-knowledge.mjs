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
 * התקציב מתחלק בין כל העמודים, ולכן ככל שנוספים עמודים כל אחד נחתך יותר.
 * ב-80,000 (הערך המקורי) התקרה ירדה ל-700 תווים לעמוד ו-68 מתוך 71 העמודים
 * נחתכו — עוגן ראה רבע מהאתר. 180,000 מחזיק את התקרה על MAX_PAGE_CHARS.
 * העלות בפועל נמוכה מכפי שנראה: הידע יושב בבלוק עם cache_control, ולכן
 * רק השאלה הראשונה בשיחה משלמת עליו מלא — שאלות ההמשך קוראות ממטמון ב-0.1×.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://pedagogiamh.co.il";
const OUT = join(ROOT, "knowledge.json");

const MAX_PAGE_CHARS = 2000;   // תקרה לטקסט של עמוד בודד
const MAX_TOTAL_CHARS = 290000; // תקרה כוללת לכל הידע — טקסט + קישורים (נאכפת ע"י הקטנת תקרת העמוד)
const MAX_LINKS = 10;          // קישורים חיצוניים לכל עמוד

const SKIP = new Set(["_doc-template.html", "chipus.html", "work-plans-app.html", "em-head.tmp.html", "bagmgr.html",
  "admin.html", "sikum-matzevet.html", "matzevet-list.html", "talmidim.html",
  "matzpen.html", "matzpen-demo.html", "rishum-pticha.html"]);

/* עמוד מוגן = עמוד שטוען את /auth.js.
   הסינון נגזר מהקוד עצמו ולא מרשימה ידנית: העמודים המוגנים הצהירו על עצמם
   בשורת ה-script, ולכן עמוד מוגן חדש נחסם אוטומטית גם אם ישכחו לעדכן כאן.
   בלי זה עוגן עונה לכל שואל אנונימי מתוך תוכן שמאחורי שער ההרשאות. */
const isGated = (src) => /<script[^>]+\bsrc=["'](?:\.{0,2}\/)?auth\.js/i.test(src);

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

/* ---------- נתונים מובְנים שיושבים ב-JS ולא בטקסט העמוד ---------- */
/* חילוץ הטקסט למעלה מוחק בלוקי <script>, ולכן טבלאות שנבנות בדפדפן מ-JS
   (אוגדן השעות) לא הגיעו לעוגן בכלל — היא ענתה "אין לי את זה" על מספר
   שמופיע באתר. כאן אנחנו קוראים את ה-JS ישירות והופכים אותו לשורות טקסט.
   התוצר מסומן כ"נעוץ" (pinned): הוא נוסף לעמוד אחרי החיתוך ולא נספר
   בתקציב, כדי שנתוני ליבה לא ייחתכו כשנוספים עמודים לאתר. */

/* מוציא ליטרל JS מתוך קובץ ומחזיר אותו כאובייקט */
function evalLiteral(src, re, label) {
  const m = src.match(re);
  if (!m) { console.warn(`אזהרה: לא נמצא ${label} — הנתונים לא ייכנסו לידע`); return null; }
  try {
    return Function(`"use strict"; return (${m[1]});`)();
  } catch (e) {
    console.warn(`אזהרה: ${label} לא נפרס (${e.message})`);
    return null;
  }
}

const KITA_LABEL = { "ט": "ט׳", "י": "י׳", "יא": "י״א", "יב": "י״ב", "קורס": "קורס" };

/* טבלאות התפלגות שעות הליבה לפי מסלול וכיתה (מתוך המכתב המלווה),
   שיושבות במערך HOURS בתוך <script> ב-ogdan-shaot.html */
function ogdanCoreHours(pageHtml) {
  const HOURS = evalLiteral(pageHtml, /var\s+HOURS\s*=\s*(\[[\s\S]*?\]);\s*\n/, "מערך HOURS בעמוד אוגדן השעות");
  if (!HOURS) return "";
  const out = [
    "התפלגות שעות מקצועות הליבה לפי מסלול וכיתה (ש״ש שבועיות, מתוך המכתב המלווה לאוגדן).",
    "אלה המספרים המחייבים לשאלות מסוג \"כמה שעות אזרחות בכיתה ט׳ במסלול 55\".",
  ];
  for (const p of HOURS) {
    out.push(`מסלול ${p.id} — ${p.t}:`);
    for (const r of p.rows) {
      const cells = p.k.map((k, i) => `${k} ${r[i + 1]}`).join(", ");
      out.push(`  ${r[0]}: ${cells}`);
    }
    if (p.sum) out.push(`  סה״כ שעות: ${p.k.map((k, i) => `${k} ${p.sum[i]}`).join(", ")}`);
  }
  return out.join("\n");
}

/* 1,077 שורות מגמה־כיתה מתוך ogdan-data.js, בפורמט דחוס עם מקרא.
   מסלולים שחולקים בדיוק את אותה התפלגות מאוחדים לשורה אחת. */
function ogdanMegamot(dataJs) {
  const D = evalLiteral(dataJs, /window\.OGDAN\s*=\s*(\{[\s\S]*?\})\s*;?\s*$/, "window.OGDAN בקובץ ogdan-data.js");
  if (!D || !D.rows) return "";

  // קיבוץ: מגמה → חתימת שעות → המסלולים שחולקים אותה
  const byMegama = new Map();
  const perMaslul = new Map();
  for (const r of D.rows) {
    const key = r[1] + "|" + r[0];
    if (!perMaslul.has(key)) perMaslul.set(key, []);
    perMaslul.get(key).push(r);
  }
  for (const [key, rows] of perMaslul) {
    const [megIdx, masIdx] = key.split("|");
    const sig = rows
      .map((r) => {
        const kita = KITA_LABEL[D.kitot[r[2]]] || D.kitot[r[2]];
        const pitzul = r[8] ? `,פ${r[8]}` : "";
        return `${kita}=${r[9]}(${r[4]}+${r[5]}${pitzul})`;
      })
      .join(" ");
    if (!byMegama.has(megIdx)) byMegama.set(megIdx, new Map());
    const sigs = byMegama.get(megIdx);
    if (!sigs.has(sig)) sigs.set(sig, []);
    sigs.get(sig).push(D.maslulim[masIdx][0]);
  }

  const out = [
    "כל מגמות האוגדן המקוצר לפי מסלול וכיתה. פורמט כל שורה:",
    "סמל־מגמה שם [תחום] מ<מסלולים>: כיתה=סה״כ שעות(ש״ש עיוני+ש״ש מעשי,פ=פיצול)",
    "מסלולים שחולקים בדיוק את אותה התפלגות שעות מאוחדים לשורה אחת.",
    "שמות המסלולים: " + D.maslulim.map((m) => `${m[0]} ${m[1]}`).join(" · "),
  ];
  const tchumim = Object.entries(D.tchumim).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`);
  if (tchumim.length) out.push("שמות התחומים: " + tchumim.join(" · "));

  for (const [megIdx, sigs] of byMegama) {
    const m = D.megamot[megIdx];
    for (const [sig, masList] of sigs) {
      out.push(`${m[0]} ${m[2]} [ת${m[1] || "-"}] מ${masList.join(",")}: ${sig}`);
    }
  }
  return out.join("\n");
}

/* מחזיר מפה: שם קובץ עמוד → טקסט נעוץ שיצורף לו.
   את מערך HOURS מחפשים בכל עמודי האתר ולא בקובץ קבוע: הטבלאות כבר עברו
   פעם אחת מ-ogdan-shaot.html ל-ogdan-hitpalgut.html, והצמדה לשם קובץ
   שברה את החילוץ בשקט. */
function buildPinned(files) {
  const pinned = new Map();
  const add = (file, text) => {
    if (!text) return;
    pinned.set(file, pinned.has(file) ? pinned.get(file) + "\n\n" + text : text);
  };

  const hoursFile = files.find((f) =>
    /var\s+HOURS\s*=\s*\[/.test(readFileSync(join(ROOT, f), "utf8")));
  if (hoursFile) add(hoursFile, ogdanCoreHours(readFileSync(join(ROOT, hoursFile), "utf8")));
  else console.warn("אזהרה: מערך HOURS לא נמצא באף עמוד — טבלאות שעות הליבה לא ייכנסו לידע");

  /* הגדרות התפקידים המלאות יושבות ב-role-defs.js ומוצגות במודאל בעמוד
     התפקידים — בלי החילוץ הזה עוגן לא מכיר אותן בכלל. */
  const rolesPath = join(ROOT, "role-defs.js");
  if (existsSync(rolesPath) && files.includes("tafkidim.html")) {
    const R = evalLiteral(readFileSync(rolesPath, "utf8"),
      /const\s+ROLE_DEFS\s*=\s*(\{[\s\S]*\n\});/, "ROLE_DEFS בקובץ role-defs.js");
    if (R) {
      const strip = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const parts = [];
      for (const key of Object.keys(R)) {
        const d = R[key];
        const lines = ["## " + strip(d.title)];
        if (d.lead) lines.push(strip(d.lead));
        for (const sec of d.sections || []) {
          const items = (sec.items || []).map(strip);
          for (const act of sec.acts || []) {
            items.push(strip(act.b) + ": " + (act.items || []).map(strip).join(" · "));
          }
          if (items.length) lines.push(strip(sec.h) + " — " + items.join(" · "));
        }
        parts.push(lines.join("\n"));
      }
      add("tafkidim.html", "הגדרות התפקידים המלאות:\n" + parts.join("\n\n"));
    }
  }

  const dataPath = join(ROOT, "ogdan-data.js");
  if (existsSync(dataPath) && files.includes("ogdan-shaot.html")) {
    add("ogdan-shaot.html", ogdanMegamot(readFileSync(dataPath, "utf8")));
  }
  return pinned;
}

/* ---------- איסוף העמודים ---------- */
const gated = [];
const files = readdirSync(ROOT)
  .filter((f) => f.endsWith(".html") && !SKIP.has(f))
  .filter((f) => {
    if (!isGated(readFileSync(join(ROOT, f), "utf8"))) return true;
    gated.push(f);
    return false;
  })
  .sort();
if (gated.length) {
  console.log(`סוננו ${gated.length} עמודים מוגנים (טוענים /auth.js): ${gated.sort().join(", ")}`);
}

const pinned = buildPinned(files);

const pages = [];
for (const f of files) {
  const html = readFileSync(join(ROOT, f), "utf8");
  const page = extractPage(html, `${SITE}/${f}`);
  if (pinned.has(f)) page.pinned = pinned.get(f);
  pages.push(page);
}
// עמוד הכלים (רשימת כל הכלים הדיגיטליים); עמודי הכלים עצמם הם אפליקציות — אין בהם טקסט
const toolsIndex = join(ROOT, "tools", "index.html");
if (existsSync(toolsIndex)) {
  const toolsHtml = readFileSync(toolsIndex, "utf8");
  if (!isGated(toolsHtml)) pages.push(extractPage(toolsHtml, `${SITE}/tools/`));
}

/* ---------- אכיפת תקציב הגודל הכולל ---------- */
let cap = MAX_PAGE_CHARS;
const linkChars = (p) => (p.links || []).reduce((sum, l) => sum + l.length + 3, 0);
const totalAt = (c) => pages.reduce((sum, p) => sum + Math.min(p.text.length, c) + linkChars(p), 0);
while (cap > 300 && totalAt(cap) > MAX_TOTAL_CHARS) cap -= 100;
// הטקסט הנעוץ נוסף אחרי החיתוך ואינו נספר בתקציב — נתוני ליבה לא נחתכים
for (const p of pages) {
  p.text = clip(p.text, cap);
  if (p.pinned) {
    p.text += "\n" + p.pinned;
    delete p.pinned;
  }
}

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
