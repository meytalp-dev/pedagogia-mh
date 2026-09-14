#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
בונה את prisat-pikuah.html — פריסת הפיקוח תשפ״ז — משלושה קובצי אקסל שמגיעים מהמינהל:

  1. פריסת פיקוח <תאריך>.xlsx            רשת, מחוז, מגזר, מפקח.ת פדגוגי.ת, מפקחת המערך הטיפולי
  2. בתי ספר תשפז מעודכן <תאריך>.xlsx     שם רשמי, סמל משרד החינוך, רשות מקומית
  3. אנשי קשר עמותות ורשתות <תאריך>.xlsx  הנהלת הרשת ואיש.ת הקשר — שמות ותפקידים בלבד

העיצוב (14.9.26, לבקשת מיטל): אותו עיצוב פשוט ורשמי של mosdot-kesher.html — שתי לשוניות
(בתי הספר · רשתות ועמותות), חיפוש וסינון דביקים בראש כל לשונית, ובלי פרטי קשר.
פרטי הקשר המלאים נמצאים רק ב-mosdot-kesher.html, שנפתח בקישור עם מפתח.

מה נלקח מהעמוד הקיים (הוא המקור היחיד שלהם, ולכן הסקריפט קורא את הפלט של עצמו):
  - השם הקצר של כל מוסד — 64 השמות הקנוניים שכל שאר האתר מתיישר אליהם
  - המפקח.ת בתשפ״ו
  - ה-head עד style.css, התפריט והפוטר (בלוקי nav/foot מתוחזקים ב-build-nav.mjs)
כל אלה יושבים בבלוק <script type="application/json" id="ppData">.

פרטיות — בעמוד אין טלפון, מייל, כתובת או שם מנהל.ת.

מי קורא את העמוד (לא לשבור):
  - build-mosdot.mjs         קורא את ppData.schools
  - build-pikuah-miktzoi.py  קורא את ppData.schools, ואת ה-head עד <link … style.css> ואת בלוק ה-nav
  - mosdot-kesher/build.py   (ב-Downloads\\רויטל) קורא את ppData.schools ו-ppData.order

הרצה:  python tools/build-prisat-pikuah.py
ואחר כך: node tools/build-mosdot.mjs   (אדמין המוסדות קורא את הפריסה מכאן)
"""
import io, os, re, sys, json, html
from collections import Counter
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

DL   = r'C:/Users/meyta/Downloads'
SITE = os.path.join(DL, 'pedagogia-mh')
OUT  = os.path.join(SITE, 'prisat-pikuah.html')
X_PRISA  = os.path.join(DL, 'פריסת פיקוח 30.08.2026.xlsx')
X_SCHOOL = os.path.join(DL, 'בתי ספר תשפז מעודכן 30.08.2026.xlsx')
X_NETS   = os.path.join(DL, 'אנשי קשר עמותות ורשתות תשפז מעודכן 10.9.2026.xlsx')
UPDATED  = 'מעודכן ל-30.8.2026 · הנהלות הרשתות: 10.9.2026'

# שם בקובץ החדש ← השם הקנוני בעמוד (ראו schools-64-canonical)
ALIAS = {'צור באהר': 'סור באהר'}
# שמות נוספים שהמוסד מוכר בהם בגיליונות אחרים — רק כדי שהחיפוש ימצא אותם
SEARCH_ALIAS = {
    'הקמפוס התורני עתיד': ['חב"ד אור מנחם אשקלון', 'ישיבת עתיד אור מנחם'],
    'ערערה': ['מסאראת ואדי עארה'],
    'אבו סנאן': ['ירכא אבו סנאן'],
    'סור באהר': ['צור באהר'],
}

# שם הרשת בקובץ אנשי הקשר ← שם הרשת בפריסה
NET_NAME = {'דרור בתי חינוך': 'דרור', 'חנוך לנער': 'ישיבת חנוך לנער',
            'ימינו כקדם כפר זיתים': 'כפר זיתים'}
# שורות בלי שם רשת יורשות את הרשת שמעליהן — חוץ מאלה:
#   שני אזולאי — איש הקשר בשורה שלה הוא גילה כהנא, מנהלת רימונים (לפי קובץ בתי הספר)
#   הרב דביר בניהו — בקובץ בלי שם רשת; בית שולמית (תיכון הדר) לפי מיטל, 13.9.2026
NET_BY_PERSON = {('אזולאי', 'שני'): 'רימונים', ('בניהו', 'הרב דביר'): 'בית שולמית'}
# שורה שאי אפשר לשייך בוודאות נכנסת לכאן ולא לעמוד — ומודפסת בסוף הריצה לבירור
SKIP_PERSON = set()
# שם פרטי ושם משפחה שהוקלדו בעמודות הפוכות — לפי כתובת המייל של אותו אדם
# (OferY@, TamarP@, Itamar@, itamarp@, udi@). המפתח: (עמודת משפחה, עמודת פרטי)
SWAP = {('עופר', 'ירושלמי'), ('תמר', 'פלד אמיר'), ('איתמר', 'חנן'), ('איתמר', 'פוזן'), ('אודי', 'נתיב')}


def clean(s):
    return re.sub(r'\s+', ' ', str(s if s is not None else '')).strip()


def loose(s):
    """השוואת שמות בלי גרשיים, מקפים וסוגריים"""
    return re.sub(r'[\s\'"׳״()\-–]', '', s)


def rows_of(path):
    ws = openpyxl.load_workbook(path, data_only=True).worksheets[0]
    return [list(r) for r in ws.iter_rows(values_only=True)]


def col(hdr, *keys):
    for i, h in enumerate(hdr):
        if all(k in h for k in keys):
            return i
    sys.exit('עמודה לא נמצאה: ' + ' '.join(keys))


def fix_bidi(s):
    """אקסל שומר חלק מהשמות עם סוגריים וגרש שהתהפכו בכיווניות: '(בדאיאת (אום אל פחם בנות'"""
    s = clean(s)
    if s.startswith('(') and not s.endswith(')'):
        s = s[1:].strip() + ')'
    if s.startswith("'"):
        s = s[1:].strip() + "'"
    return s


def fix_role(r):
    return clean(r).replace('מנכ"ל', 'מנכל').replace('מנכל', 'מנכ״ל').replace('יו"ר', 'יו״ר')


def person(last, first):
    return clean(last + ' ' + first) if (last, first) in SWAP else clean(first + ' ' + last)


def prev_set(prev):
    return {x.strip() for x in prev.split('+') if x.strip()} if prev and prev not in ('—', '-') else set()


# ── 1. העמוד הקיים: שמות קנוניים ומפקח.ת תשפ״ו ────────────────────────────────
old = io.open(OUT, encoding='utf-8').read()
m = re.search(r'<script type="application/json" id="ppData">(.*?)</script>', old, re.S)
if not m:
    sys.exit('בלוק ppData לא נמצא בעמוד הקיים — עוצרים')
old_by_semel, old_by_name = {}, {}
for s in json.loads(m.group(1))['schools']:
    rec = dict(semel=s['semel'], name=s['name'], prev=s['prev'], sups=s['sups'], d=s['d'], n=s['net'], s=s['s'])
    if rec['semel'].isdigit():
        old_by_semel[rec['semel']] = rec
    old_by_name[rec['name']] = rec
if len(old_by_name) != 64:
    sys.exit('בעמוד הקיים %d מוסדות ולא 64 — עוצרים' % len(old_by_name))

# ── 2. פריסת הפיקוח ─────────────────────────────────────────────────────────────
pr = rows_of(X_PRISA)
h = [clean(x) for x in pr[0]]
cS, cN, cR, cD, cG = col(h, 'סמל'), col(h, 'שם'), col(h, 'רשת'), col(h, 'מחוז'), col(h, 'מגזר')
cP, cT = col(h, 'מפקח', 'פדגוגי'), col(h, 'טיפולי')
prisa = {}
for r in pr[1:]:
    if not r or r[cS] is None:
        continue
    semel = clean(r[cS])
    if semel in prisa:                   # ליווי משותף מופיע בקובץ פעמיים
        continue
    prisa[semel] = dict(xname=clean(r[cN]), net=clean(r[cR]), d=clean(r[cD]), s=clean(r[cG]),
                        sups=[clean(x) for x in str(r[cP]).split('+') if clean(x)],
                        ther=clean(r[cT]).replace('ד"ר', 'ד״ר'))
if len(prisa) != 64:
    sys.exit('בפריסה %d מוסדות ולא 64 — עוצרים' % len(prisa))

# ── 3. רשימת בתי הספר ───────────────────────────────────────────────────────────
sr = rows_of(X_SCHOOL)
h = [clean(x) for x in sr[0]]
kS, kN, kM = col(h, 'סמל מוסד'), col(h, 'שם בית הספר'), col(h, 'סמל משרד החינוך')
kC, kA = col(h, 'רשות מקומית'), col(h, 'כתובת')
kP, kT = col(h, 'מפקח', 'פדגוגי'), col(h, 'טיפולי')
details = {}
for r in sr[1:]:
    if not r or r[kS] is None:
        continue
    details[clean(r[kS])] = dict(off=fix_bidi(r[kN]), moe=clean(r[kM]), city=clean(r[kC]),
                                 addr=[clean(x) for x in str(r[kA] or '').split('|') if clean(x)],
                                 sups=[clean(x) for x in str(r[kP]).split('+') if clean(x)],
                                 ther=clean(r[kT]).replace('ד"ר', 'ד״ר'))

# ── 4. מיזוג + בדיקות מול העמוד הקודם ──────────────────────────────────────────
schools, used, notes = [], set(), []
for semel, p in prisa.items():
    rec = old_by_semel.get(semel) or old_by_name.get(ALIAS.get(p['xname'], p['xname']))
    if not rec:
        sys.exit('מוסד שלא קיים בעמוד — לבדוק ידנית: %s %s' % (semel, p['xname']))
    if rec['name'] in used:
        sys.exit('שני מוסדות מופו לאותו שם: ' + rec['name'])
    used.add(rec['name'])
    dt = details.get(semel)
    if not dt:
        sys.exit('סמל %s (%s) חסר ברשימת בתי הספר' % (semel, rec['name']))
    if set(dt['sups']) != set(p['sups']) or dt['ther'] != p['ther']:
        notes.append('אי-התאמה בין שני הקבצים ב-%s: %s / %s' % (rec['name'], p['sups'], dt['sups']))
    if set(rec['sups']) != set(p['sups']):
        notes.append('מפקח.ת השתנה מאז הגרסה הקודמת: %s  %s → %s' % (rec['name'], ' + '.join(rec['sups']), ' + '.join(p['sups'])))
    for k, lbl in (('n', 'net'), ('d', 'd'), ('s', 's')):
        if rec[k] and rec[k] != p[lbl]:
            notes.append('%s השתנה ב-%s: %s → %s' % (lbl, rec['name'], rec[k], p[lbl]))
    if not rec['semel'].isdigit():
        notes.append('נוסף סמל מוסד: %s ← %s' % (rec['name'], semel))
    prev = '' if rec['prev'] in ('—', '-') else rec['prev']
    ps = prev_set(prev)
    schools.append(dict(
        semel=semel, moe=dt['moe'], name=rec['name'],
        off=dt['off'] if loose(dt['off']) != loose(rec['name']) else '',
        net=p['net'], d=p['d'], s=p['s'], city=dt['city'], addr=dt['addr'],
        sups=p['sups'], prev=prev, chg=(not ps) or ps != set(p['sups']), ther=p['ther'],
        alias=SEARCH_ALIAS.get(rec['name'], [])))
missing = set(old_by_name) - used
if missing:
    sys.exit('מוסדות שהיו בעמוד ולא בפריסה החדשה: ' + ', '.join(sorted(missing)))

# ── 5. רשתות ועמותות — שמות ותפקידים בלבד ──────────────────────────────────────
nets, skipped, cur = {}, [], ''


def add_person(net, name, role, contact):
    people = nets.setdefault(net, [])
    for x in people:
        if x['n'] == name:
            break
    else:
        x = {'n': name, 'roles': [], 'contact': False}
        people.append(x)
    if role and role not in x['roles']:
        x['roles'].append(role)
    x['contact'] = x['contact'] or contact


for r in rows_of(X_NETS)[2:]:
    r = (r + [None] * 11)[:11]
    if clean(r[0]):
        cur = NET_NAME.get(clean(r[0]), clean(r[0]))
    last, first, role, clast, cfirst = clean(r[1]), clean(r[2]), clean(r[3]), clean(r[6]), clean(r[7])
    if (last, first) in SKIP_PERSON:
        skipped.append('%s %s (%s)' % (last, first, fix_role(role)))
        continue
    net = NET_BY_PERSON.get((last, first), cur)
    if not net:
        continue
    if last or first:
        add_person(net, person(last, first), fix_role(role), False)
    if clast or cfirst:
        add_person(net, person(clast, cfirst), '', True)
net_names = {s['net'] for s in schools}
for k in nets:
    if k not in net_names:
        notes.append('רשת בקובץ אנשי הקשר שלא קיימת בפריסה: ' + k)

# ── 6. סדרים ומספרים ────────────────────────────────────────────────────────────
def order_by_count(values):
    c = Counter(values)
    return sorted(c, key=lambda v: (-c[v], v)), c


SUP_ORDER, sup_n = order_by_count([n for s in schools for n in s['sups']])
THER_ORDER, ther_n = order_by_count([s['ther'] for s in schools if s['ther']])
D_ORDER, d_n = order_by_count([s['d'] for s in schools])
S_ORDER = [x for x in ('כללי', 'ערבי', 'חרדי') if any(s['s'] == x for s in schools)]
S_ORDER += sorted({s['s'] for s in schools} - set(S_ORDER))
N_ORDER, n_n = order_by_count([s['net'] for s in schools])

# סדר קבוע (לפי שם המפקח.ת ואז שם המוסד) — כך data/mosdot.json לא מתערבל. הדפדפן ממיין לפי שם.
schools.sort(key=lambda s: ('|'.join(s['sups']), s['name']))
N_CHG = sum(1 for s in schools if s['chg'])
N_JOINT = sum(1 for s in schools if len(s['sups']) > 1)

net_list = []
for n in N_ORDER:
    mine = [s for s in schools if s['net'] == n]
    dc = Counter(s['d'] for s in mine)
    net_list.append({'name': n, 'count': len(mine), 'people': nets.get(n, []),
                     'd': ' · '.join('%s %d' % (k, dc[k]) for k in D_ORDER if dc.get(k))})

# ── 7. הנתונים לדפדפן ───────────────────────────────────────────────────────────
DATA = json.dumps({
    'updated': UPDATED,
    'schools': [{k: s[k] for k in ('semel', 'moe', 'name', 'off', 'net', 'd', 's', 'city', 'addr',
                                     'sups', 'prev', 'chg', 'ther', 'alias')} for s in schools],
    'nets': net_list,
    'order': {'sup': SUP_ORDER, 'ther': THER_ORDER, 'd': D_ORDER, 's': S_ORDER, 'n': N_ORDER},
}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

# ── 8. המעטפת מהעמוד הקיים ──────────────────────────────────────────────────────
STYLE_LINK = '<link rel="stylesheet" href="style.css">'
head = old[:old.index(STYLE_LINK)]
head = re.sub(r'<title>.*?</title>', '<title>פריסת הפיקוח תשפ״ז · הבית של המנהיגות הפדגוגית היוצרת</title>', head)
head = re.sub(r'<meta name="description" content="[^"]*">',
              '<meta name="description" content="פריסת הפיקוח לשנת הלימודים תשפ״ז — 64 מוסדות, המפקחים '
              'הפדגוגיים והמפקחות על המערך הטיפולי, לפי מחוז, רשת ומגזר.">', head)
nav = old[old.index('<!-- nav:start'):old.index('<!-- nav:end -->') + len('<!-- nav:end -->')]
foot = old[old.index('<!-- foot:start'):old.index('<!-- foot:end -->') + len('<!-- foot:end -->')]

CSS = r"""
  /* "דקות קריאה" של site.js לא רלוונטי בעמוד רשימה (החלטת מיטל, 13.9.26) */
  main .readmeta{display:none!important}
  .pp{padding:0 var(--px) 56px;max-width:1280px}
  .pp :focus-visible{outline:3px solid var(--blue);outline-offset:2px;border-radius:4px}
  .pp-upd{margin:4px 0 0;color:var(--muted);font-size:var(--fs-sm)}
  .pp-gate{margin:26px 0;background:#fff;border:1px solid var(--border);border-radius:14px;padding:30px;text-align:center;color:var(--text2)}

  /* ראש דביק: לשוניות + חיפוש וסינון */
  .pp-stick{position:sticky;top:var(--navh,0px);z-index:40;background:var(--canvas);padding:6px 0 2px;margin-top:18px}
  .pp-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border-strong)}
  .pp-tabs button{font:inherit;font-weight:700;font-size:1rem;color:var(--text2);background:none;border:0;border-bottom:3px solid transparent;
    padding:10px 16px;margin-bottom:-1px;cursor:pointer}
  .pp-tabs button[aria-selected="true"]{color:var(--navy);border-bottom-color:var(--navy)}
  .pp-tabs .n{font-weight:600;color:var(--muted);font-size:.9rem;margin-inline-start:4px}
  .pp-bar{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 8px;align-items:center}
  .pp-field{position:relative;flex:2 1 300px}
  .pp-field svg{position:absolute;right:13px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none}
  .pp input[type=search],.pp select{font:inherit;font-size:.95rem;color:var(--text);background:#fff;border:1px solid var(--border-strong);border-radius:10px;
    padding:10px 12px;min-height:44px;width:100%;box-sizing:border-box}
  .pp input[type=search]{padding-right:40px}
  .pp select{flex:1 1 180px;width:auto;cursor:pointer}
  .pp input[type=search]:focus,.pp select:focus{border-color:var(--navy);outline:none;box-shadow:0 0 0 3px rgba(13,59,102,.12)}
  .pp-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;padding:0 0 10px;font-size:.92rem;color:var(--text2)}
  .pp-cnt{font-weight:700;color:var(--text)}
  .pp-chk{display:inline-flex;align-items:center;gap:7px;cursor:pointer;font-weight:600}
  .pp-chk input{width:17px;height:17px;accent-color:var(--navy);margin:0}
  .pp-lnk{font:inherit;font-size:.9rem;font-weight:700;color:var(--accent);background:none;border:0;padding:4px 0;cursor:pointer;
    text-decoration:underline;text-underline-offset:3px}

  /* רשימת בתי הספר */
  .pp-list{list-style:none;margin:6px 0 0;padding:0;background:#fff;border:1px solid var(--border);border-radius:14px;overflow:hidden}
  .pp-sc{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:6px 28px;padding:16px 22px;border-top:1px solid var(--border)}
  .pp-sc:first-child{border-top:0}
  .pp-sc h2{margin:0;font-size:1.06rem;line-height:1.35;color:var(--navy);font-weight:800}
  .pp-sc p{margin:0}
  .pp-sub{color:var(--text2);font-size:.9rem}
  .pp-off{color:var(--muted);font-size:.85rem}
  .pp-lbl{font-size:.78rem;font-weight:700;color:var(--muted);margin-bottom:2px!important}
  .pp-v{font-weight:700}
  .pp-prev{color:var(--muted);font-size:.86rem}
  .pp-chg{display:inline-block;font-size:.74rem;font-weight:700;color:#8A5A00;background:#FFF4E0;border-radius:999px;padding:0 8px;margin-inline-start:6px}
  .pp-empty{background:#fff;border:1px dashed var(--border-strong);border-radius:14px;padding:30px;text-align:center;color:var(--text2);margin-top:6px}

  /* רשתות */
  .pp-nets{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;margin-top:6px}
  .pp-net{background:#fff;border:1px solid var(--border);border-radius:14px;padding:18px 20px;display:flex;flex-direction:column}
  .pp-net h2{margin:0;font-size:1.12rem;color:var(--navy);display:flex;justify-content:space-between;align-items:baseline;gap:10px}
  .pp-net h2 span{font-size:.88rem;color:var(--text2);font-weight:600;white-space:nowrap}
  .pp-net .pp-sub{margin:2px 0 10px}
  .pp-net p{margin:0}
  .pp-ppl{list-style:none;margin:0;padding:0}
  .pp-ppl li{padding:8px 0;border-top:1px solid var(--border)}
  .pp-ppl .role{color:var(--text2);font-size:.88rem}
  .pp-tag{display:inline-block;font-size:.75rem;font-weight:700;color:var(--accent);background:#E8F4F8;border-radius:999px;padding:1px 9px;margin-inline-start:6px}
  .pp-net .pp-lnk{margin-top:auto;align-self:flex-start;padding-top:12px}

  @media (max-width:860px){
    .pp{padding:0 16px 40px}
    .pp-stick{position:static}
    .pp-sc{grid-template-columns:1fr;gap:10px;padding:16px}
    .pp-field{flex-basis:100%} .pp select{flex:1 1 calc(50% - 5px);min-width:0;font-size:.88rem}
    .pp-nets{grid-template-columns:1fr}
  }
  @media print{
    .pp-stick .pp-tabs,.pp-bar,.pp-lnk{display:none!important}
    .pp-stick{position:static} .pp-sc{break-inside:avoid}
  }
"""

MAIN = """
<div class="pagehead">
  <div class="crumb"><a href="index.html">בית</a> ‹ <a href="supervision.html">מרחב פיקוח</a> ‹ פריסת הפיקוח</div>
  <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
    <h1>פריסת הפיקוח</h1>
    <span class="tag" style="background:var(--navy);color:#fff;font-size:var(--fs-xs)">תשפ״ז</span>
  </div>
  <p class="lead" style="max-width:720px">שיוך המוסדות למפקחים הפדגוגיים ולמפקחות על המערך הטיפולי בשנת הלימודים תשפ״ז.</p>
  <p class="pp-upd">@@UPDATED@@</p>
</div>

<div class="pp">
  <noscript><div class="pp-gate">לצפייה בפריסה יש להפעיל JavaScript בדפדפן.</div></noscript>
  <div class="pp-stick" id="stick">
    <div class="pp-tabs" role="tablist" aria-label="תצוגה">
      <button type="button" role="tab" id="tab-s" aria-controls="panel-s" aria-selected="true">בתי הספר<span class="n">(@@N@@)</span></button>
      <button type="button" role="tab" id="tab-n" aria-controls="panel-n" aria-selected="false" tabindex="-1">רשתות ועמותות<span class="n">(@@NN@@)</span></button>
    </div>
    <div id="head-s">
      <div class="pp-bar">
        <div class="pp-field">
          <label class="sr-only" for="q">חיפוש בית ספר</label>
          <input id="q" type="search" autocomplete="off" placeholder="חיפוש בית ספר, יישוב, סמל מוסד או מפקח.ת">
          @@ICON@@
        </div>
        <label class="sr-only" for="fSup">מפקח.ת פדגוגי.ת</label><select id="fSup"><option value="">כל המפקחים הפדגוגיים</option></select>
        <label class="sr-only" for="fTher">מפקחת המערך הטיפולי</label><select id="fTher"><option value="">כל מפקחות המערך הטיפולי</option></select>
        <label class="sr-only" for="fD">מחוז</label><select id="fD"><option value="">כל המחוזות</option></select>
        <label class="sr-only" for="fN">רשת</label><select id="fN"><option value="">כל הרשתות</option></select>
      </div>
      <div class="pp-meta">
        <span class="pp-cnt" id="cnt" role="status" aria-live="polite"></span>
        <label class="pp-chk"><input type="checkbox" id="fChg"> רק מוסדות שהחליפו מפקח.ת (@@NCHG@@)</label>
        <button type="button" class="pp-lnk" id="clr" hidden>ניקוי החיפוש</button>
      </div>
    </div>
    <div id="head-n" hidden>
      <div class="pp-bar">
        <div class="pp-field">
          <label class="sr-only" for="qn">חיפוש רשת</label>
          <input id="qn" type="search" autocomplete="off" placeholder="חיפוש רשת או שם מהנהלת הרשת">
          @@ICON@@
        </div>
      </div>
      <div class="pp-meta"><span class="pp-cnt" id="cntN" role="status" aria-live="polite"></span></div>
    </div>
  </div>

  <section role="tabpanel" id="panel-s" aria-labelledby="tab-s">
    <ul class="pp-list" id="list"></ul>
    <div class="pp-empty" id="empty" hidden>לא נמצאו בתי ספר שמתאימים לחיפוש.</div>
  </section>
  <section role="tabpanel" id="panel-n" aria-labelledby="tab-n" hidden>
    <div class="pp-nets" id="nets"></div>
    <div class="pp-empty" id="emptyN" hidden>לא נמצאו רשתות שמתאימות לחיפוש.</div>
  </section>

  <p class="pp-upd" style="margin-top:22px">מוסד עם שני מפקחים פדגוגיים — ליווי משותף (@@JOINT@@). ״שינוי״ — המפקח.ת בתשפ״ז שונה מתשפ״ו, או שהמוסד לא היה בפריסה בתשפ״ו.
  · <a href="pikuah-miktzoi.html" style="color:var(--accent);font-weight:700">הפיקוח המקצועי — מגמות ומפקחים</a></p>
</div>
"""

ICON = ('<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" '
        'stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>')

JS = r"""
(function(){
'use strict';
var D=JSON.parse(document.getElementById('ppData').textContent);
var coll=new Intl.Collator('he');
function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function norm(s){return String(s||'').toLowerCase().replace(/[\u05F3\u05F4'"`]/g,'').replace(/[-\u2013\u2014_\/\\(),.:;|+]/g,' ').replace(/\s+/g,' ').trim();}
function toks(v){return norm(v).split(' ').filter(Boolean);}
function hit(h,t){for(var i=0;i<t.length;i++){if(h.indexOf(t[i])<0)return false;}return true;}

var S=D.schools.slice().sort(function(a,b){return coll.compare(a.name,b.name);});
S.forEach(function(s){ s._h=norm([s.name,s.off,s.semel,s.moe,s.net,s.d,s.s,s.city,s.sups.join(' '),s.prev,s.ther,(s.alias||[]).join(' ')].join(' ')); });
D.nets.forEach(function(n){ n._h=norm([n.name].concat(n.people.map(function(p){return p.n+' '+p.roles.join(' ');})).join(' ')); });

/* הראש הדביק נעצר מתחת לתפריט האתר, שגם הוא דביק */
function navh(){ var nv=document.querySelector('.nav'); document.documentElement.style.setProperty('--navh',(nv?nv.offsetHeight:0)+'px'); }
navh(); window.addEventListener('resize',navh);

var F={q:$('q'),sup:$('fSup'),ther:$('fTher'),d:$('fD'),n:$('fN'),chg:$('fChg')};
function fill(sel,vals){ vals.forEach(function(v){ var o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); }); }
fill(F.sup,D.order.sup); fill(F.ther,D.order.ther); fill(F.d,D.order.d); fill(F.n,D.order.n);

function schoolHtml(s){
  return '<li class="pp-sc">'
    +'<div><h2>'+esc(s.name)+'</h2>'
      +'<p class="pp-sub">'+esc([s.net,s.d,s.s].join(' · '))+(s.city?' · '+esc(s.city):'')+'</p>'
      +(s.off?'<p class="pp-off">'+esc(s.off)+'</p>':'')
      +'<p class="pp-off">סמל מוסד '+esc(s.semel)+(s.moe?' · סמל משרד החינוך '+esc(s.moe):'')+'</p></div>'
    +'<div><p class="pp-lbl">פיקוח פדגוגי</p><p class="pp-v">'+esc(s.sups.join(', '))+'</p>'
      +'<p class="pp-prev">בתשפ״ו: '+esc(s.prev||'לא היה בפריסה')+(s.chg?'<span class="pp-chg">שינוי</span>':'')+'</p></div>'
    +'<div><p class="pp-lbl">מערך טיפולי</p><p class="pp-v">'+esc(s.ther||'—')+'</p></div>'
    +'</li>';
}
function netHtml(n){
  var ppl=n.people.length?'<ul class="pp-ppl">'+n.people.map(function(p){
    return '<li><span class="pp-v">'+esc(p.n)+'</span>'+(p.contact?'<span class="pp-tag">איש.ת קשר לבתי הספר</span>':'')
      +(p.roles.length?'<p class="role">'+esc(p.roles.join(' · '))+'</p>':'')+'</li>';
  }).join('')+'</ul>':'<p class="pp-off">אין פרטי הנהלה לרשת בקובץ.</p>';
  return '<article class="pp-net"><h2>'+esc(n.name)+'<span>'+(n.count===1?'בית ספר אחד':n.count+' בתי ספר')+'</span></h2>'
    +'<p class="pp-sub">'+esc(n.d)+'</p>'+ppl
    +'<button type="button" class="pp-lnk" data-net="'+esc(n.name)+'">בתי הספר של הרשת</button></article>';
}

function render(){
  var t=toks(F.q.value);
  var list=S.filter(function(s){
    return (!F.sup.value||s.sups.indexOf(F.sup.value)>-1)&&(!F.ther.value||s.ther===F.ther.value)
      &&(!F.d.value||s.d===F.d.value)&&(!F.n.value||s.net===F.n.value)&&(!F.chg.checked||s.chg)&&hit(s._h,t);
  });
  $('list').innerHTML=list.map(schoolHtml).join('');
  $('list').hidden=!list.length; $('empty').hidden=!!list.length;
  $('cnt').textContent=list.length===S.length?'כל '+S.length+' בתי הספר':(list.length===1?'בית ספר אחד':list.length+' בתי ספר');
  $('clr').hidden=!(F.q.value||F.sup.value||F.ther.value||F.d.value||F.n.value||F.chg.checked);
}
function renderNets(){
  var t=toks($('qn').value), list=D.nets.filter(function(n){return hit(n._h,t);});
  $('nets').innerHTML=list.map(netHtml).join('');
  $('emptyN').hidden=!!list.length;
  $('cntN').textContent=list.length===D.nets.length?'כל '+list.length+' הרשתות והעמותות':(list.length===1?'רשת אחת':list.length+' רשתות');
}
function tab(which,focus){
  ['s','n'].forEach(function(k){
    var on=k===which, b=$('tab-'+k);
    b.setAttribute('aria-selected',on?'true':'false'); b.tabIndex=on?0:-1;
    $('panel-'+k).hidden=!on; $('head-'+k).hidden=!on;
    if(on&&focus) b.focus();
  });
}
function toTop(){ var y=$('stick').getBoundingClientRect().top+window.pageYOffset-(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navh'))||0)-8;
  if(window.pageYOffset>y) window.scrollTo({top:y,behavior:'smooth'}); }

var qT;
F.q.addEventListener('input',function(){ clearTimeout(qT); qT=setTimeout(render,120); });
[F.sup,F.ther,F.d,F.n,F.chg].forEach(function(x){ x.addEventListener('change',function(){ render(); toTop(); }); });
$('qn').addEventListener('input',function(){ clearTimeout(qT); qT=setTimeout(renderNets,120); });
$('clr').onclick=function(){ F.q.value=''; F.sup.value=F.ther.value=F.d.value=F.n.value=''; F.chg.checked=false; render(); F.q.focus(); };
$('tab-s').onclick=function(){tab('s');}; $('tab-n').onclick=function(){tab('n');};
document.querySelector('.pp-tabs').addEventListener('keydown',function(ev){
  if(ev.key==='ArrowLeft'||ev.key==='ArrowRight'){ ev.preventDefault(); tab($('tab-s').getAttribute('aria-selected')==='true'?'n':'s',true); }
});
$('nets').addEventListener('click',function(ev){
  var b=ev.target.closest('[data-net]'); if(!b) return;
  F.q.value=''; F.sup.value=F.ther.value=F.d.value=''; F.chg.checked=false; F.n.value=b.getAttribute('data-net');
  render(); tab('s',true); toTop();
});
render(); renderNets();
})();
"""

rep = {
    '@@UPDATED@@': html.escape(UPDATED), '@@N@@': str(len(schools)), '@@NN@@': str(len(N_ORDER)),
    '@@NCHG@@': str(N_CHG), '@@ICON@@': ICON,
    '@@JOINT@@': html.escape(', '.join(s['name'] for s in schools if len(s['sups']) > 1)),
}
main = MAIN
for k, v in rep.items():
    main = main.replace(k, v)
if '@@' in main:
    sys.exit('נשאר placeholder: ' + re.search(r'@@\w+@@', main).group(0))

page = (
    head + STYLE_LINK + '\n<style>' + CSS + '</style>\n</head>\n<body>\n<a class="skip" href="#main">דילוג לתוכן הראשי</a>\n\n'
    + nav + '\n\n<main id="main">\n' + main + '\n</main>\n\n' + foot + '\n\n'
    '<script type="application/json" id="ppData">' + DATA + '</script>\n'
    '<script src="site.js" defer></script>\n<script src="search.js" defer></script>\n'
    '<script>' + JS + '</script>\n'
    '<script>window.OGEN_WIDGET_POSITION="left";</script>\n<script src="/ogen-widget.pinned.js" defer></script>\n'
    '<script src="feedback.js" defer></script>\n</body>\n</html>\n'
)
# בקרת פרטיות: אסור שייכנס לעמוד מייל או מספר טלפון
leak = re.search(r'[\w.+-]+@[\w-]+\.[\w.]+|\b0\d{1,2}-?\d{7}\b', page)
if leak:
    sys.exit('נמצא פרט קשר בעמוד — עוצרים: ' + leak.group(0))
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(page)

# ── 9. דוח ──────────────────────────────────────────────────────────────────────
print('נכתב %s — %d מוסדות, %d שינויים מתשפ״ו, %d ליווי משותף' % (OUT, len(schools), N_CHG, N_JOINT))
print('פדגוגי:', ' · '.join('%s %d' % (n, sup_n[n]) for n in SUP_ORDER))
print('טיפולי:', ' · '.join('%s %d' % (n, ther_n[n]) for n in THER_ORDER))
print('רשתות:', ' · '.join('%s %d' % (n, n_n[n]) for n in N_ORDER))
for n in notes:
    print('  •', n)
for s in skipped:
    print('  ? שורה בקובץ אנשי הקשר בלי רשת מזוהה — לא נכנסה:', s)
