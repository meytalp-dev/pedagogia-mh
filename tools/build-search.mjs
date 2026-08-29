#!/usr/bin/env node
/**
 * בונה את search-index.json — האינדקס של החיפוש באתר.
 *
 * מה הוא עושה: עובר על כל עמודי ה-HTML, מחלץ כותרת, תיאור, כותרות-משנה
 * (עם העוגנים שלהן), טקסט ותגית סיווג — וכותב אינדקס אחד שהדפדפן טוען
 * פעם אחת (search.js) ומחפש בו בצד הלקוח. אין שרת ואין תלות חיצונית.
 *
 * נוסף על העמודים, האינדקס כולל "משאבים": קובצי PDF/Word, תיקיות דרייב
 * וקישורים חיצוניים שמופיעים בעמודים — כדי שחיפוש "אוגדן שעות" או
 * "דרייב ייעוצי" יחזיר את הקובץ עצמו ולא רק את העמוד שמכיל אותו.
 *
 * מתי הוא רץ: אוטומטית ב-GitHub Action על כל push שמשנה HTML
 * (יחד עם build-knowledge.mjs), ואפשר גם ידנית:
 *   node tools/build-search.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "search-index.json");

const MAX_TEXT = 2600; // תווי טקסט לעמוד — מספיק להתאמות אמת בלי לנפח את הקובץ

/* עמודים שאינם חלק מהאתר הציבורי (טפסים, גיליונות, תבניות) */
const SKIP = new Set([
  "_doc-template.html",
  "ogdan-megama.html",   // תבנית מגמה בודדת — נטענת עם ?m=<סמל>
  "em-head.tmp.html",
  "bagmgr.html",
  "chipus.html",
  "work-plans-app.html",
  "mishov-menahalim.html",
  "sheelot-menahalim.html",
  "shut-menahalim.html",
  "sikum-mishov.html",
  "matzevet-list.html",
  "talmidim.html",
  "sikum-matzevet.html",
  "admin.html",   // פאנל ניהול — לבעלי הרשאה בלבד
]);

/* ---------- סיווג לפי מרחב ---------- */
const CATS = [
  { id: "pedagogi", label: "מרחב פדגוגי" },
  { id: "subjects", label: "תחומי דעת" },
  { id: "career", label: "חניכות וקריירה" },
  { id: "yeutz", label: "מרחב ייעוצי" },
  { id: "pikuah", label: "מרחב פיקוח" },
  { id: "menahalim", label: "מרחב מנהלים" },
  { id: "hadashim", label: "מנהלים חדשים" },
  { id: "nehalim", label: "נהלים וטפסים" },
  { id: "hadracha", label: "הדרכה והשתלמויות" },
  { id: "kelim", label: "כלים ושירותים" },
];

const CAT_OF = {
  "index.html": "pedagogi",
  "space.html": "pedagogi",
  "ai.html": "pedagogi",
  "documents.html": "pedagogi",
  "emergency.html": "pedagogi",
  "alternatives.html": "pedagogi",

  "subjects.html": "subjects",
  "bagrut-bank.html": "subjects",
  "civics.html": "subjects",
  "english.html": "subjects",
  "hebrew.html": "subjects",
  "history.html": "subjects",
  "literature.html": "subjects",
  "math.html": "subjects",
  "tanakh.html": "subjects",

  "career.html": "career",
  "chanichut.html": "career",
  "chaka.html": "career",
  "zinuk.html": "career",
  "career-rakaz.html": "career",

  "counseling.html": "yeutz",
  "drive-yeutz.html": "yeutz",
  "preda-yb.html": "yeutz",
  "bikur-sadir.html": "yeutz",
  "michtav-kabas.html": "yeutz",
  "michtav-aklim.html": "yeutz",
  "hachala.html": "yeutz",

  "supervision.html": "pikuah",
  "prisat-pikuah.html": "pikuah",
  "madadim-livuy.html": "pikuah",

  "menahalim.html": "menahalim",
  "work-plans.html": "menahalim",
  "tafkidim.html": "menahalim",
  "baaley-tafkidim.html": "menahalim",
  "ogdan-shaot.html": "menahalim",
  "drive-menahalim.html": "menahalim",
  "tashpaz.html": "menahalim",
  "gantt.html": "menahalim",

  "menahalim-hadashim.html": "hadashim",
  "tafkid-menahel.html": "hadashim",
  "shana-rishona.html": "hadashim",
  "tamtzit-hinuch-yotzer.html": "hadashim",

  "procedures.html": "nehalim",
  "klita-miyun.html": "nehalim",
  "chasimat-kfulim.html": "nehalim",
  "sherut-leumi.html": "nehalim",
  "michtav-sium-limudim.html": "nehalim",
  "tofes-divuach-chodshi.html": "nehalim",

  "hishtalmuyot.html": "hadracha",
  "hishtalmut-gmul.html": "hadracha",
  "format-silabus.html": "hadracha",
  "kvutzot-hadracha.html": "hadracha",

  "install.html": "kelim",
  "tools/index.html": "kelim",
  "klim-digitaliim.html": "kelim",
  "hodaot.html": "kelim",

  "rakaz-pedagogi-klim.html": "pedagogi",
  "luach-mivchanim.html": "subjects",
  "cherum-nehalim.html": "nehalim",
  "vaada-melava.html": "pikuah",

  "morim-honchim.html": "hadracha",
  "honchim-hanchayot.html": "hadracha",
  "honchim-maslul.html": "hadracha",
  "honchim-haaracha.html": "hadracha",
  "honchim-haaracha-emtza.html": "hadracha",
  "honchim-sium.html": "hadracha",
  "honchim-igeret.html": "hadracha",
};

/* מילות מפתח נוספות לעמודים שהניסוח בהם שונה ממה שמחפשים בפועל */
const EXTRA_KEYS = {
  "bagrut-bank.html": "שאלונים מבחנים בחינות מועדי בגרות",
  "ogdan-shaot.html": "תקן שעות תקציב גמולים",
  "prisat-pikuah.html": "מפקחים מפקחת חלוקת בתי ספר",
  "work-plans.html": "תוכנית עבודה יעדים מדדים בעלי תפקידים",
  "tofes-divuach-chodshi.html": "היעדרויות נוכחות דיווח חודשי",
  "michtav-kabas.html": "קב\"ס ביקור סדיר נשירה",
  "bikur-sadir.html": "קב\"ס נוכחות היעדרות נשירה",
  "install.html": "אפליקציה נייד מסך הבית PWA",
  "tools/index.html": "מחוללים משחקים חידונים מצגות אינפוגרפיקה AI",
  "gantt.html": "לוח שנה מועדים צוותים תאריכים",
  "hishtalmuyot.html": "פיתוח מקצועי גמול קורסים",
  "morim-honchim.html": "מתמחים סטאז' רישיון הוראה חונך",
  "honchim-hanchayot.html": "מתמחה סטאז' חונכות רישיון הוראה",
  "vaada-melava.html": "ועדה מלווה מוסדית סיכום",
  "cherum-nehalim.html": "חירום אירוע חריג מלחמה",
  "luach-mivchanim.html": "מועדי בחינות בגרות גמר",
};

/* ---------- כלי עזר ---------- */
function removeBlocks(html, openerRe) {
  let result = html;
  for (;;) {
    openerRe.lastIndex = 0;
    const m = openerRe.exec(result);
    if (!m) return result;
    const tag = m[1].toLowerCase();
    const tokenRe = new RegExp("<" + tag + "(?=[\\s>])|</" + tag + ">", "gi");
    tokenRe.lastIndex = m.index;
    let depth = 0;
    let end = result.length;
    let t;
    while ((t = tokenRe.exec(result))) {
      if (t[0][1] === "/") {
        depth--;
        if (depth === 0) { end = tokenRe.lastIndex; break; }
      } else depth++;
    }
    result = result.slice(0, m.index) + " " + result.slice(end);
  }
}

const ENT = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'",
  "&apos;": "'", "&nbsp;": " ", "&middot;": "·", "&rarr;": "←",
  "&larr;": "→", "&hellip;": "…", "&times;": "×",
};

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&[a-z]+;/gi, (e) => ENT[e] ?? " ");
}

function strip(s) {
  return decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function clip(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const br = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(" "));
  return (br > max * 0.6 ? cut.slice(0, br) : cut).trim() + "…";
}

/* שם קצר וקריא למשאב — בלי חצי משפט שנקטע באמצע */
function trimLabel(s) {
  let t = s.replace(/\s*[⬇↗←→]\s*$/, "").trim();
  if (t.length > 62) {
    const cut = t.slice(0, 62);
    const br = cut.lastIndexOf(" ");
    t = (br > 30 ? cut.slice(0, br) : cut) + "…";
  }
  return t.replace(/[\s,;·|-]+…?$/, (m) => (m.includes("…") ? "…" : "")).trim();
}

/* סוג המשאב לפי הכתובת */
function linkType(u) {
  if (/drive\.google\.com|docs\.google\.com/.test(u)) return "drive";
  if (/\.pdf($|[?#])/i.test(u)) return "pdf";
  if (/\.(docx?|pptx?|xlsx?)($|[?#])/i.test(u)) return "doc";
  return "link";
}

/* ---------- חילוץ עמוד ---------- */
function extractPage(html, file) {
  const titleRaw = (html.match(/<title>([\s\S]*?)<\/title>/i) || [, file])[1];
  const title = decode(titleRaw).split("·")[0].trim() || file;
  const descM = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const description = descM ? decode(descM[1]).trim() : "";

  let body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];
  const shell = [
    /<(script)[\s>]/i,
    /<(style)[\s>]/i,
    /<(noscript)[\s>]/i,
    /<(svg)[\s>]/i,
    /<(aside)\s[^>]*class="[^"]*drawer[^"]*"/i,
    /<(div)\s[^>]*class="[^"]*scrim[^"]*"/i,
    /<(div)\s[^>]*class="[^"]*govbar[^"]*"/i,
    /<(nav)[\s>]/i,
    /<(footer)[\s>]/i,
    /<(div)\s[^>]*class="foot"/i,
  ];
  for (const re of shell) body = removeBlocks(body, new RegExp(re.source, "gi"));

  /* כותרות משנה + עוגנים — כדי לקפוץ ישר לקטע הנכון */
  const sections = [];
  const seenSec = new Set();
  const usable = (t) => t && t.length <= 90 && /[א-תA-Za-z]/.test(t) && !seenSec.has(t);

  /* קודם הכרטיסים בעלי id — אלה העוגנים שהתפריטים מפנים אליהם, ולהם יש כתובת ישירה */
  const anchored = /<(?:div|section|a)\b[^>]*\bid="([a-z0-9\-_]+)"[^>]*>[\s\S]{0,400}?<(?:h2|h3|h4|b|strong)[^>]*>([\s\S]{2,90}?)<\//gi;
  for (const m of body.matchAll(anchored)) {
    const t = strip(m[2]);
    if (!usable(t)) continue;
    seenSec.add(t);
    sections.push({ t, id: m[1] });
    if (sections.length >= 30) break;
  }
  for (const m of body.matchAll(/<(h2|h3)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    const t = strip(m[3]);
    if (!usable(t)) continue;
    seenSec.add(t);
    const idM = m[2].match(/\bid="([^"]+)"/i);
    sections.push(idM ? { t, id: idM[1] } : { t });
    if (sections.length >= 60) break;
  }

  /* משאבים: קבצים, דרייב וקישורים חיצוניים */
  const res = [];
  const seenU = new Set();
  for (const lm of body.matchAll(/<a\b[^>]*href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const u = lm[1];
    if (/^(mailto:|tel:|javascript:)/i.test(u)) continue;
    if (/fonts\.googleapis|fonts\.gstatic|googletagmanager/.test(u)) continue;
    const isLocalPage = !/^https?:/i.test(u) && /\.html?($|[?#])/i.test(u);
    if (isLocalPage) continue; // עמודי האתר כבר באינדקס
    const k = linkType(u);
    if (k === "link" && !/^https?:/i.test(u)) continue;
    if (seenU.has(u)) continue;
    seenU.add(u);
    /* שם המשאב: הכותרת שבתוך הקישור אם יש — אחרת כל הטקסט שלו */
    const inner = lm[2];
    const headM = inner.match(/<(?:b|strong|h3|h4)[^>]*>([\s\S]*?)<\/(?:b|strong|h3|h4)>/i);
    const label = trimLabel(strip(headM ? headM[1] : inner) || strip(inner));
    if (!label || !/[א-תA-Za-z]/.test(label)) continue;
    res.push({ t: label, u, k });
    if (res.length >= 25) break;
  }

  const text = decode(
    body
      .replace(/<(?:h[1-6]|p|li|div|section|article|tr|br)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  return { title, description, sections, res, text: clip(text, MAX_TEXT) };
}

/* ---------- ריצה ---------- */
const files = readdirSync(ROOT)
  .filter((f) => f.endsWith(".html") && !SKIP.has(f))
  .sort();
if (existsSync(join(ROOT, "tools", "index.html"))) files.push("tools/index.html");

const pages = [];
const resources = [];
const seenRes = new Map();

for (const f of files) {
  const html = readFileSync(join(ROOT, f), "utf8");
  const p = extractPage(html, f);
  const c = CAT_OF[f] || "pedagogi";
  const page = { f, t: p.title, d: p.description, c, s: p.sections, x: p.text };
  if (EXTRA_KEYS[f]) page.k = EXTRA_KEYS[f];
  pages.push(page);

  for (const r of p.res) {
    const prev = seenRes.get(r.u);
    if (prev) {
      if (!prev.p.includes(f)) prev.p.push(f);
      continue;
    }
    const entry = { t: r.t, u: r.u, k: r.k, c, p: [f] };
    seenRes.set(r.u, entry);
    resources.push(entry);
  }
}

const out = { generatedAt: new Date().toISOString(), cats: CATS, pages, resources };
const json = JSON.stringify(out);
writeFileSync(OUT, json, "utf8");

console.log(
  "search-index.json: " + pages.length + " עמודים, " +
  resources.length + " משאבים, " + (json.length / 1024).toFixed(0) + "KB"
);
