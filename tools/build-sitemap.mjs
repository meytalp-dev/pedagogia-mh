/* בונה את sitemap.xml מכל עמודי ה-HTML הציבוריים.
   מדלג על עמודים מוגנים (auth.js), עמודי noindex, ועמודי נגני הכלים
   (הם נטענים רק מתוך המחוללים). רץ מאותו אקשן שבונה את האינדקס. */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://pedagogiamh.co.il";

const isPublic = (html) =>
  !html.includes('src="/auth.js"') &&
  !html.includes("src=\"auth.js\"") &&
  !/name="robots"[^>]*noindex/.test(html);

const urls = [];
for (const f of readdirSync(ROOT).filter((x) => x.endsWith(".html")).sort()) {
  const html = readFileSync(join(ROOT, f), "utf8");
  if (!isPublic(html)) continue;
  const loc = f === "index.html" ? `${SITE}/` : `${SITE}/${f}`;
  const mod = statSync(join(ROOT, f)).mtime.toISOString().slice(0, 10);
  urls.push({ loc, mod });
}
/* עמודי המחוללים — רק דפי הפתיחה, לא הנגנים */
for (const d of readdirSync(join(ROOT, "tools"), { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.endsWith("-player")) continue;
  const p = join(ROOT, "tools", d.name, "index.html");
  if (!existsSync(p)) continue;
  const html = readFileSync(p, "utf8");
  if (!isPublic(html)) continue;
  urls.push({ loc: `${SITE}/tools/${d.name}/`, mod: statSync(p).mtime.toISOString().slice(0, 10) });
}
const ti = join(ROOT, "tools", "index.html");
if (existsSync(ti) && isPublic(readFileSync(ti, "utf8"))) {
  urls.push({ loc: `${SITE}/tools/`, mod: statSync(ti).mtime.toISOString().slice(0, 10) });
}

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.mod}</lastmod></url>`).join("\n") +
  "\n</urlset>\n";
writeFileSync(join(ROOT, "sitemap.xml"), xml);
console.log(`sitemap.xml — ${urls.length} כתובות`);
