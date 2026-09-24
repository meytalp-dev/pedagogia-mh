// בונה את school-names.js — מקור אחד לשמות בתי הספר בכל האתר, בטפסים ובמנור.
// השם הקנוני = השם בפריסת הפיקוח שבאדמין המוסדות (data/mosdot.json, 64 מוסדות).
// כל כתיב אחר שנאסף אי פעם (ALIAS של matzevet-list, השם הרשמי והכינויים בפריסה,
// השמות שבתי הספר הזינו במנור, והרשימה הידנית למטה) ממופה אליו.
//
// הרצה: node tools/build-school-names.mjs   (אחרי build-mosdot.mjs)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const mosdot = JSON.parse(read('data/mosdot.json'));
const schools = mosdot.schools;
if (schools.length !== 64) throw new Error(`צפויים 64 בתי ספר, נמצאו ${schools.length}`);
const canon = new Set(schools.map(s => s.name));
const bySemel = Object.fromEntries(schools.map(s => [String(s.semel), s.name]));

const alias = {};
const add = (from, to, src) => {
  from = String(from || '').replace(/\s+/g, ' ').trim();
  if (!from || canon.has(from)) return;
  if (!canon.has(to)) throw new Error(`${src}: "${from}" → "${to}" — היעד אינו שם קנוני`);
  if (alias[from] && alias[from] !== to) throw new Error(`${src}: "${from}" ממופה גם ל-"${alias[from]}" וגם ל-"${to}"`);
  alias[from] = to;
};

// 1. כינויים שנצברו ב-matzevet-list (דרך build-mosdot). "ירכא אבו סנאן" שם הוא שם ישן, לא קנוני.
const OLD_TARGET = { 'ירכא אבו סנאן': 'אבו סנאן' };
for (const [k, v] of Object.entries({ ...mosdot.aliases.exact, ...mosdot.aliases.approx })) add(k, OLD_TARGET[v] || v, 'mosdot.aliases');
for (const [k, v] of Object.entries(OLD_TARGET)) add(k, v, 'OLD_TARGET');

// 2. פריסת הפיקוח: השם הרשמי (off) והכינויים (alias) של כל מוסד
const pp = JSON.parse(read('prisat-pikuah.html').match(/<script type="application\/json" id="ppData">([\s\S]*?)<\/script>/)[1]);
for (const s of pp.schools || pp) {
  const to = bySemel[String(s.semel)];
  if (!to) continue;
  add(s.off, to, 'ppData.off');
  for (const a of s.alias || []) add(a, to, 'ppData.alias');
}

// 3. השמות במנור (לפי סמל מוסד משיוך הפיקוח)
const im = JSON.parse(read('hadrachot/_data/inspector-map-2027.json'));
for (const s of im.schools) if (bySemel[String(s.semel)]) add(s.name, bySemel[String(s.semel)], 'inspector-map');

// 4. כתיבים שנמצאו בטפסים ובדפים ולא נאספו באף מקור אחר
const EXTRA = {
  'אור העתיד תורני גן יבנה': 'אור העתיד תורני מקצועי',
  'אורט תעשיה אווירית': 'אורט תעשייה אווירית',
  'בת עמי': 'עתיד בת עמי',
  // גיליון ההרשאות — שער הכניסה (24.9.26)
  'מסעדה': 'תיכון טכנולוגי אי טק סקול (מסעדה)',
  'טכנולוגי לבנות בית חנינה': 'בית חנינה בנות',
  'דן גורמה תל-אביב': 'דן גורמה',
  'דן גורמה תל אביב': 'דן גורמה',
  'דרור הגליל': 'דרור גליל',
  'התיכון החברתי תל אביב יפו': 'תיכון חברתי ת"א',
  'התיכון החברתי ת״א-יפו': 'תיכון חברתי ת"א',
  'תיכון חברתי ת״א': 'תיכון חברתי ת"א',
  'זוקו': 'תיכון עוצמ"ה עתיד זוקו',
  'חבד אור מנחם אשקלון': 'הקמפוס התורני עתיד',
  'חב"ד אור מנחם אשקלון': 'הקמפוס התורני עתיד',
  'עתיד אור מנחם': 'הקמפוס התורני עתיד',
  'חושן': 'חוש"ן',
  'חנוך לנער צפת': 'ישיבת חנוך לנער',
  'כסרא סמיע': 'אלחכמה כסרא-סמיע',
  'כפר יאסיף': 'כפר יסיף',
  'מעיינות צפת': 'מרחביה/מעיינות',
  'תיכון מעיינות': 'מרחביה/מעיינות',
  'עמל אנרגיטק': "אנרג'י טק",
  'אנרג׳יטק': "אנרג'י טק",
  'עמל טייבה': "עמל טייבה ב'",
  'עמל נצרת': 'נצרת',
  'עמל רמת דוד': 'רמת דוד',
  'עמל רהט בנים': 'עמל רהט',
  'עמל רהט בנות': 'עמל רהט',
  'עתיד בית דוד': 'בית דוד',
  'עתיד גוליס בנות - ירכא': "ג'וליס בנות",
  'עתיד גוליס בנות ירכא': "ג'וליס בנות",
  'עתיד ירכא בנים': 'עתיד גליל מערבי ירכא בנים',
  'עתיד כפר חבד אוהלי תמימים': 'עתיד כפר חב"ד',
  'אוהלי תמימים עתיד כפר חב"ד': 'עתיד כפר חב"ד',
  'עתיד מסעדה': 'תיכון טכנולוגי אי טק סקול (מסעדה)',
  'עתיד צור ים': 'צור ים',
  'עתיד קמג': 'קמ"ג דימונה',
  'עתיד תפן': 'תפן ליזמות',
  'פלמחים': 'עתיד פלמחים',
  'רימונים טבריה': 'רימונים',
  'תיכון בקהילה מהאראת שפרעם': 'שפרעם',
  'תיכון בקהילה מהאראת שפרעם 54106': 'שפרעם',
  'תל שבע': 'סכנין תל שבע',
  'ח׳טוואת ירכא אבו סנאן': 'אבו סנאן',
  "ח'טוואת ירכא אבו סנאן": 'אבו סנאן',
  'עתיד יוצר אבדאע ביר אל מכסור': 'עתיד טק ביר אל מכסור',
  'עתיד ביר אל מכסור': 'עתיד טק ביר אל מכסור',
  'תיכון אלאמאני סחנין': 'אל אמאני סכנין',
  'תיכון אלאמאני סחנין 54100': 'אל אמאני סכנין',
  'תיכון מסאראת': 'ערערה',
  'תיכון מסאראת ערערה': 'ערערה',
  'התיכון החברתי מצפה רמון': 'מצפה רמון',
  'אור דניאל נתניה': 'אור דניאל',
  'צור באהר': 'סור באהר',
  'ימינו כקדם כפר זיתים': 'כפר זיתים',
  'תיכון הדר': 'הדר',
  'תיכון חברתי חיפה': 'התיכון החברתי חיפה',
  'אורט כרמל חיפה': 'אורט כרמל',
  'עמל טכנולוגי רהט': 'עמל רהט',
  'עמל טכנולוגי טייבה': "עמל טייבה ב'",
  'תיכון יוצר עתיד באר-שבע': 'עתיד באר שבע',
  'תיכון יוצר עמל טכנולוגי': 'עמל אשדוד',
  'אלמנארה': 'כפר יסיף',
  'אלאופוק א.א.פחם': 'אום אל פחם בנים',
  'טכנולוגי לבנים /בית חנינה': 'בית חנינה בנים',
  'עתיד מגשימים כרמיאל': 'עתיד כרמיאל',
  'טכנולוגי אכסאל': 'אכסאל',
  'אור העתיד': 'אור העתיד תורני מקצועי',
  'אורט צור ברק': 'צור ברק',
  'אורמת': 'אורט אורמת',
  'המכון החסידי טכנולוגי': 'ישיבת חנוך לנער',
  'מרכז תורני טכנולוגי נחלים': 'נחלים',
  'תיכון יוצר עתיד פלמחים': 'עתיד פלמחים',
  'תיכון עתיד יוצר עוצמ"ה זוקו קריית ביאליק': 'תיכון עוצמ"ה עתיד זוקו',
  'תיכון עתיד יוצר קמ"ג': 'קמ"ג דימונה',
  'מגשימים': 'עתיד כרמיאל',
};
for (const [k, v] of Object.entries(EXTRA)) add(k, v, 'EXTRA');

const out = `/* נוצר אוטומטית ע"י tools/build-school-names.mjs — לא לערוך ידנית.
   שמות בתי הספר האחידים = פריסת הפיקוח שבאדמין המוסדות (data/mosdot.json).
   SchoolNames.list — 64 השמות · SchoolNames.canon(שם) — השם האחיד לכל כתיב מוכר,
   ואם הכתיב לא מוכר — השם כפי שהוא. */
(function (g) {
  var LIST = ${JSON.stringify(schools.map(s => s.name).sort((a, b) => a.localeCompare(b, 'he')))};
  var ALIAS = ${JSON.stringify(alias)};
  function norm(s) { return String(s || '').replace(/["'׳״’”]/g, '').replace(/[.,()\\/\\-]/g, ' ').replace(/\\s+/g, ' ').trim(); }
  var BY_NORM = {};
  LIST.forEach(function (n) { BY_NORM[norm(n)] = n; });
  Object.keys(ALIAS).forEach(function (k) { if (!BY_NORM[norm(k)]) BY_NORM[norm(k)] = ALIAS[k]; });
  function canon(name) {
    var s = String(name == null ? '' : name).replace(/\\s+/g, ' ').trim();
    if (!s) return s;
    if (LIST.indexOf(s) > -1) return s;
    return ALIAS[s] || BY_NORM[norm(s)] || s;
  }
  g.SchoolNames = { list: LIST.slice(), alias: ALIAS, canon: canon, isCanon: function (n) { return LIST.indexOf(n) > -1; } };
})(typeof window !== 'undefined' ? window : globalThis);
`;
fs.writeFileSync(path.join(ROOT, 'school-names.js'), out);
console.log(`school-names.js: ${canon.size} שמות, ${Object.keys(alias).length} כתיבים חלופיים`);
