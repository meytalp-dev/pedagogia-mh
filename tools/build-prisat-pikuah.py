#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
בונה את prisat-pikuah.html — פריסת הפיקוח תשפ״ז — משלושה קובצי אקסל שמגיעים מהמינהל:

  1. פריסת פיקוח <תאריך>.xlsx            רשת, מחוז, מגזר, מפקח.ת פדגוגי.ת, מפקחת המערך הטיפולי
  2. בתי ספר תשפז מעודכן <תאריך>.xlsx     שם רשמי, סמל משרד החינוך, רשות, כתובת, טלפון המוסד
  3. אנשי קשר עמותות ורשתות <תאריך>.xlsx  הנהלת הרשת ואיש.ת הקשר — שמות ותפקידים בלבד

מה נלקח מהעמוד הקיים (הוא המקור היחיד שלהם, ולכן הסקריפט קורא את הפלט של עצמו):
  - השם הקצר של כל מוסד — 64 השמות הקנוניים שכל שאר האתר מתיישר אליהם
  - המפקח.ת בתשפ״ו
  - ה-head עד style.css, התפריט והפוטר (בלוקי nav/foot מתוחזקים ב-build-nav.mjs)

פרטיות — בעמוד אין טלפון נייד, אין מייל ואין שם מנהל.ת. טלפון המוסד מוצג רק כשהוא קו
נייח: בחלק מהמוסדות "טלפון המוסד" בקובץ הוא בעצם הנייד של המנהל.ת. פרטי קשר אישיים
נמצאים באדמין המוסדות בלבד (גיליון נפרד בדרייב, מאחורי שער ההרשאות).

חוזה עם סקריפטים שקוראים את העמוד — לא לשבור:
  - build-mosdot.mjs         <tr data-sup="..."> ותאים 0-6: סמל, שם, רשת, מחוז, מגזר, מפקח.ת, תשפ״ו
  - build-pikuah-miktzoi.py  שורה אחת לכל <tr>; <td class="semel">…</td><td class="school">…</td>
                             צמודים, וטקסט נקי בתא השם. ה-head עד <link … style.css> נלקח משם.

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
SOURCES  = 'פריסת הפיקוח ורשימת בתי הספר מ-30.8.2026 · אנשי הקשר ברשתות מ-10.9.2026'

# צבע קבוע לכל מפקח.ת — אותם צבעים שהיו בעמוד ושמופיעים בפיקוח המקצועי
SUP_COLOR = {
    'יסמין אמון': '#1F7A4D', 'יששכר חפץ': '#17857F', 'ליאת צבר': '#6E56A8',
    'סיגלית דאי': '#B0375E', 'ויסאם סואלחה': '#14548C', 'רביב שורץ': '#9A5B00',
    'שרונה בלוך': '#0E7490', 'רויטל אמיר': '#C0392B',
}
# המערך הטיפולי מסומן ביהלום ולא בעיגול — כדי שלא יתבלבל עם המפקחים הפדגוגיים
THER_COLOR = {
    'עירית אלדד': '#3F5FA8', 'אסתי רייפר': '#8A4FA0',
    "שרית תורג'מן יפה": '#B5543A', 'ד״ר מיכל גלסר': '#2D7F6E',
}
SECTOR_COLOR = {'כללי': '#2F74C0', 'ערבי': '#1F8A4C', 'חרדי': '#7B61B8'}
FALLBACK = ['#52687A', '#8A6D3B', '#4F6D8F', '#6B5B7B']

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


e = lambda s: html.escape(str(s), quote=True)


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


def landline(p):
    p = clean(p)
    digits = re.sub(r'\D', '', p.split('/')[0])
    if not digits or digits.startswith('05') or (len(digits) == 9 and digits[0] == '5'):
        return None                       # ריק או נייד — לא מוצג
    return {'t': p, 'href': 'tel:+972' + digits[1:] if digits[0] == '0' else 'tel:' + digits}


def fix_role(r):
    return clean(r).replace('מנכ"ל', 'מנכל').replace('מנכל', 'מנכ״ל').replace('יו"ר', 'יו״ר')


def prev_set(prev):
    return {x.strip() for x in prev.split('+') if x.strip()} if prev and prev not in ('—', '-') else set()


# ── 1. העמוד הקיים: שמות קנוניים ומפקח.ת תשפ״ו ────────────────────────────────
old = io.open(OUT, encoding='utf-8').read()


def cell_text(c):
    return clean(html.unescape(re.sub(r'<[^>]+>', ' ', c)))


old_by_semel, old_by_name = {}, {}
for attrs, body in re.findall(r'<tr (data-sup="[^"]*"[^>]*)>(.*?)</tr>', old):
    a = {k: html.unescape(v) for k, v in re.findall(r'data-([\w-]+)="([^"]*)"', attrs)}
    cells = re.findall(r'<td[^>]*>(.*?)</td>', body)
    rec = dict(semel=cell_text(cells[0]), name=cell_text(cells[1]),
               prev=cell_text(re.sub(r'<span class="chg">.*?</span>', '', cells[6])),
               sups=[x.strip() for x in a['sup'].split('|')], d=a.get('d', ''), n=a.get('n', ''), s=a.get('s', ''))
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
kT1, kT2 = col(h, 'טלפון המוסד'), col(h, 'טלפון נוסף')
kP, kT = col(h, 'מפקח', 'פדגוגי'), col(h, 'טיפולי')
details = {}
for r in sr[1:]:
    if not r or r[kS] is None:
        continue
    semel = clean(r[kS])
    tels = [t for t in (landline(r[kT1]), landline(r[kT2])) if t]
    seen, tel = set(), []
    for t in tels:
        if t['t'] not in seen:
            seen.add(t['t']); tel.append(t)
    details[semel] = dict(off=fix_bidi(r[kN]), moe=clean(r[kM]), city=clean(r[kC]),
                          addr=[clean(x) for x in str(r[kA] or '').split('|') if clean(x)], tel=tel,
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
        net=p['net'], d=p['d'], s=p['s'], city=dt['city'], addr=dt['addr'], tel=dt['tel'],
        sups=p['sups'], prev=prev, chg=(not ps) or ps != set(p['sups']), ther=p['ther'],
        alias=SEARCH_ALIAS.get(rec['name'], [])))
missing = set(old_by_name) - used
if missing:
    sys.exit('מוסדות שהיו בעמוד ולא בפריסה החדשה: ' + ', '.join(sorted(missing)))

# ── 5. רשתות ועמותות ────────────────────────────────────────────────────────────
nets, skipped, cur = {}, [], ''
for r in rows_of(X_NETS)[2:]:
    r = (r + [None] * 11)[:11]
    if clean(r[0]):
        cur = NET_NAME.get(clean(r[0]), clean(r[0]))
    last, first, role, clast, cfirst = clean(r[1]), clean(r[2]), clean(r[3]), clean(r[6]), clean(r[7])
    if (last, first) in SKIP_PERSON:
        skipped.append('%s %s (%s)' % (last, first, fix_role(role)))
        continue
    net = NET_BY_PERSON.get((last, first), cur)
    if not net or not (last or first or clast or cfirst):
        continue
    n = nets.setdefault(net, {'lead': [], 'contact': []})
    # שמות כפי שהם בקובץ: שם משפחה ואז שם פרטי
    if last or first:
        nm = clean(last + ' ' + first)
        if nm not in [x['n'] for x in n['lead']]:
            n['lead'].append({'n': nm, 'r': fix_role(role)})
    if clast or cfirst:
        nm = clean(clast + ' ' + cfirst)
        if nm not in n['contact']:
            n['contact'].append(nm)
net_names = {s['net'] for s in schools}
for k in nets:
    if k not in net_names:
        notes.append('רשת בקובץ אנשי הקשר שלא קיימת בפריסה: ' + k)

# ── 6. סדרים, צבעים, מספרים ─────────────────────────────────────────────────────
def order_by_count(values):
    c = Counter(values)
    return sorted(c, key=lambda v: (-c[v], v)), c


SUP_ORDER, sup_n = order_by_count([n for s in schools for n in s['sups']])
THER_ORDER, ther_n = order_by_count([s['ther'] for s in schools if s['ther']])
D_ORDER, d_n = order_by_count([s['d'] for s in schools])
S_ORDER = [x for x in ('כללי', 'ערבי', 'חרדי') if any(s['s'] == x for s in schools)]
S_ORDER += sorted({s['s'] for s in schools} - set(S_ORDER))
N_ORDER, n_n = order_by_count([s['net'] for s in schools])

for i, n in enumerate([n for n in SUP_ORDER if n not in SUP_COLOR]):
    SUP_COLOR[n] = FALLBACK[i % len(FALLBACK)]; notes.append('מפקח.ת בלי צבע קבוע: ' + n)
for i, n in enumerate([n for n in THER_ORDER if n not in THER_COLOR]):
    THER_COLOR[n] = FALLBACK[i % len(FALLBACK)]; notes.append('מפקחת טיפולית בלי צבע קבוע: ' + n)

# הסדר הסטטי זהה לעמוד הקודם (לפי שם המפקח.ת ואז שם המוסד) — כך data/mosdot.json לא מתערבל.
# הדפדפן ממיין ומקבץ בעצמו, כך שהסדר הזה משפיע רק על מי שקורא את הקובץ.
schools.sort(key=lambda s: ('|'.join(s['sups']), s['name']))
for i, s in enumerate(schools):
    s['i'] = i

N_CHG = sum(1 for s in schools if s['chg'])
N_JOINT = sum(1 for s in schools if len(s['sups']) > 1)
no_addr = [s['name'] for s in schools if not s['addr']]


def plural(n, one='מוסד אחד', many='מוסדות'):
    return one if n == 1 else '%d %s' % (n, many)


def counts_line(c, order):
    return ' · '.join('%s %d' % (e(k), c[k]) for k in order if c.get(k))


# ── 7. HTML: כרטיסי מפקחים ─────────────────────────────────────────────────────
CHECK = ('<svg class="on-ind" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" '
         'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>')


def person_card(kind, name, color):
    mine = [s for s in schools if (name in s['sups'] if kind == 'sup' else s['ther'] == name)]
    sec = Counter(s['s'] for s in mine)
    dist = Counter(s['d'] for s in mine)
    bar = ''.join('<i style="width:%.1f%%;background:%s"></i>' % (100.0 * sec[k] / len(mine), SECTOR_COLOR.get(k, '#8A97A6'))
                  for k in S_ORDER if sec.get(k))
    if kind == 'sup':
        other = Counter(s['ther'] for s in mine if s['ther'])
        other_lbl, other_order = 'מערך טיפולי', THER_ORDER
        new = sum(1 for s in mine if name not in prev_set(s['prev']))
    else:
        other = Counter(n for s in mine for n in s['sups'])
        other_lbl, other_order = 'פיקוח פדגוגי', SUP_ORDER
        new = 0
    mk = 'pp-dot' if kind == 'sup' else 'pp-dm'
    return (
        '<button type="button" class="pp-person" data-f="%s" data-v="%s" aria-pressed="false" style="--c:%s">'
        '<span class="ph"><span class="nm"><span class="%s" aria-hidden="true"></span>%s</span>'
        '<span class="num">%d<small>%s</small></span></span>'
        '<span class="pp-bar" aria-hidden="true">%s</span>'
        '<span class="ln">%s</span>'
        '<span class="ln"><b>מחוזות</b> %s</span>'
        '<span class="ln"><b>%s</b> %s</span>%s%s</button>'
    ) % (kind, e(name), color, mk, e(name), len(mine), 'מוסדות' if len(mine) != 1 else 'מוסד',
         bar, counts_line(sec, S_ORDER), counts_line(dist, D_ORDER),
         other_lbl, counts_line(other, other_order),
         ('<span class="ln"><b>חדשים בליווי בתשפ״ז</b> %d</span>' % new) if new else '', CHECK)


PED_CARDS = '\n'.join(person_card('sup', n, SUP_COLOR[n]) for n in SUP_ORDER)
THER_CARDS = '\n'.join(person_card('ther', n, THER_COLOR[n]) for n in THER_ORDER)

# ── 8. HTML: שורות הטבלה ────────────────────────────────────────────────────────
MORE = ('<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" '
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg>')


def sup_cells(s):
    return ' '.join('<span class="sup-cell" style="--c:%s"><span class="pp-dot"></span>%s</span>' % (SUP_COLOR[n], e(n))
                    for n in s['sups'])


def ther_cell(s):
    if not s['ther']:
        return '—'
    return '<span class="sup-cell" style="--c:%s"><span class="pp-dm"></span>%s</span>' % (THER_COLOR[s['ther']], e(s['ther']))


ROWS = '\n'.join(
    '        <tr data-sup="%s" data-d="%s" data-n="%s" data-s="%s" data-chg="%d" data-th="%s" data-i="%d">'
    '<td class="semel">%s</td><td class="school">%s</td><td>%s</td><td>%s</td><td>%s</td>'
    '<td>%s</td><td class="prev">%s%s</td><td>%s</td>'
    '<td class="go"><button type="button" class="pp-more" data-i="%d" aria-label="כל הפרטים על %s">%s</button></td></tr>'
    % (e('|'.join(s['sups'])), e(s['d']), e(s['net']), e(s['s']), s['chg'], e(s['ther']), s['i'],
       e(s['semel']), e(s['name']), e(s['net']), e(s['d']), e(s['s']),
       sup_cells(s), e(s['prev'] or '—'), '<span class="chg">שינוי</span>' if s['chg'] else '', ther_cell(s),
       s['i'], e(s['name']), MORE)
    for s in schools)

# ── 9. HTML: רשתות ועמותות ──────────────────────────────────────────────────────
def net_card(net):
    mine = [s for s in schools if s['net'] == net]
    info = nets.get(net)
    if info and (info['lead'] or info['contact']):
        dl = ''
        if info['lead']:
            dl += '<dt>הנהלה</dt><dd>%s</dd>' % '<br>'.join(
                '%s%s' % (e(x['n']), (' <span class="role">· %s</span>' % e(x['r'])) if x['r'] else '') for x in info['lead'])
        if info['contact']:
            dl += '<dt>איש.ת קשר למשרד העבודה</dt><dd>%s</dd>' % '<br>'.join(e(x) for x in info['contact'])
        body = '<dl>%s</dl>' % dl
    else:
        body = '<p class="na">אין לרשת פרטים בקובץ אנשי הקשר</p>'
    return (
        '<article class="pp-net"><h3>%s <small>%s</small></h3>'
        '<p class="meta">%s<br>%s</p>%s'
        '<button type="button" class="pp-go" data-go="n" data-v="%s">הצגת המוסדות ברשת%s</button></article>'
    ) % (e(net), plural(len(mine)), counts_line(Counter(s['d'] for s in mine), D_ORDER),
         counts_line(Counter(s['s'] for s in mine), S_ORDER), body, e(net), MORE)


NET_CARDS = '\n'.join(net_card(n) for n in N_ORDER)

# ── 10. הנתונים לדפדפן ──────────────────────────────────────────────────────────
DATA = json.dumps({
    'schools': [{k: s[k] for k in ('i', 'semel', 'moe', 'name', 'off', 'net', 'd', 's', 'city', 'addr', 'tel',
                                     'sups', 'prev', 'chg', 'ther', 'alias')} for s in schools],
    'nets': nets,
    'order': {'sup': SUP_ORDER, 'ther': THER_ORDER, 'd': D_ORDER, 's': S_ORDER, 'n': N_ORDER},
    'colors': {'sup': SUP_COLOR, 'ther': THER_COLOR, 'sector': SECTOR_COLOR},
}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

# ── 11. המעטפת מהעמוד הקיים ─────────────────────────────────────────────────────
STYLE_LINK = '<link rel="stylesheet" href="style.css">'
head = old[:old.index(STYLE_LINK)]
head = re.sub(r'<title>.*?</title>', '<title>פריסת הפיקוח תשפ״ז · הבית של המנהיגות הפדגוגית היוצרת</title>', head)
head = re.sub(r'<meta name="description" content="[^"]*">',
              '<meta name="description" content="מי מלווה כל מוסד בתשפ״ז — 64 מוסדות, המפקחים הפדגוגיים '
              'והמפקחות על המערך הטיפולי, לפי מחוז, רשת ומגזר, כולל השוואה לתשפ״ו.">', head)
nav = old[old.index('<!-- nav:start'):old.index('<!-- nav:end -->') + len('<!-- nav:end -->')]
foot = old[old.index('<!-- foot:start'):old.index('<!-- foot:end -->') + len('<!-- foot:end -->')]

CSS = r"""
  .pp-wrap{padding:0 var(--px) 56px}
  .pp-wrap :focus-visible{outline:3px solid var(--blue);outline-offset:2px}
  .pp-meta{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:var(--fs-sm);color:var(--muted);font-weight:600;margin-top:4px}
  .pp-meta b{color:var(--text2)}
  /* "דקות קריאה" של site.js סופר את תאי הטבלה כמילים — בעמוד הזה הוא מטעה (החלטת מיטל, 13.9.26) */
  main .readmeta{display:none!important}

  /* מספרים */
  .pp-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;padding:18px var(--px) 4px}
  .pp-kpi{background:#fff;border:1px solid var(--border);border-radius:16px;padding:16px 12px 14px;box-shadow:var(--sh-sm);
    text-align:center;font:inherit;color:inherit;display:flex;flex-direction:column;gap:2px;align-items:center}
  .pp-kpi b{font-size:1.9rem;font-weight:800;color:var(--navy);line-height:1.15;font-variant-numeric:tabular-nums}
  .pp-kpi span{font-size:var(--fs-sm);color:var(--text2);font-weight:600;line-height:1.35}
  button.pp-kpi{cursor:pointer;transition:transform .2s var(--ease),box-shadow .2s var(--ease),border-color .2s}
  button.pp-kpi:hover{transform:translateY(-2px);box-shadow:var(--sh-md);border-color:#F0D6A2}
  button.pp-kpi b{color:#8A5A00}
  button.pp-kpi .go{font-size:var(--fs-2xs);color:#8A5A00;font-weight:800;margin-top:2px}

  /* מדורים */
  .pp-sec{padding:30px 0 6px;scroll-margin-top:120px}
  .pp-sec>h2.sub-sec{font-size:var(--fs-3xl);color:var(--navy);margin:0 0 4px}
  .pp-intro{color:var(--text2);margin:0 0 14px;max-width:760px}
  .pp-h3{font-size:var(--fs-lg);color:var(--text);margin:18px 0 10px;display:flex;align-items:center;gap:10px}
  .pp-h3 .hint{font-size:var(--fs-xs);font-weight:600;color:var(--muted)}

  /* כרטיסי מפקחים */
  .pp-people{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:12px}
  .pp-person{font:inherit;text-align:start;color:var(--text);background:#fff;border:1px solid var(--border);border-radius:16px;
    padding:14px 18px 14px 16px;box-shadow:var(--sh-sm);cursor:pointer;position:relative;overflow:hidden;
    display:flex;flex-direction:column;gap:7px;transition:transform .2s var(--ease),box-shadow .2s var(--ease),border-color .2s}
  .pp-person::before{content:"";position:absolute;inset-block:0;inset-inline-start:0;width:5px;background:var(--c)}
  .pp-person:hover{transform:translateY(-2px);box-shadow:var(--sh-md);border-color:var(--border-strong)}
  .pp-person[aria-pressed="true"]{border-color:var(--c);box-shadow:0 0 0 2px var(--c),var(--sh-md)}
  .pp-person .ph{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
  .pp-person .nm{font-weight:800;font-size:1.02rem;display:flex;align-items:center;gap:8px;padding-top:3px}
  .pp-person .num{font-size:1.7rem;font-weight:800;color:var(--c);line-height:1;font-variant-numeric:tabular-nums;
    display:flex;flex-direction:column;align-items:center}
  .pp-person .num small{font-size:var(--fs-2xs);color:var(--muted);font-weight:700;margin-top:3px}
  .pp-person .ln{font-size:var(--fs-xs);color:var(--text2);line-height:1.55}
  .pp-person .ln b{color:var(--text);font-weight:700;margin-inline-end:4px}
  .pp-person .on-ind{position:absolute;bottom:12px;inset-inline-end:12px;color:#fff;background:var(--c);border-radius:50%;
    padding:3px;width:22px;height:22px;box-sizing:border-box;opacity:0;transform:scale(.6);transition:.2s var(--ease)}
  .pp-person[aria-pressed="true"] .on-ind{opacity:1;transform:none}
  .pp-bar{display:flex;height:8px;border-radius:99px;overflow:hidden;background:var(--soft-bg);gap:2px}
  .pp-bar i{display:block;height:100%}

  /* סימנים */
  .pp-dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--c);flex:none}
  .pp-dm{display:inline-block;width:9px;height:9px;background:var(--c);transform:rotate(45deg);border-radius:2px;flex:none;margin:0 1px}
  .pp-sq{display:inline-block;width:10px;height:10px;background:var(--c);border-radius:3px;flex:none}
  .sup-cell{display:inline-flex;align-items:center;gap:7px;font-weight:700;color:var(--text);white-space:nowrap}
  .chg{display:inline-block;margin-inline-start:6px;background:#FFF4E0;color:#8A5A00;border:1px solid #F0D6A2;
    border-radius:999px;padding:0 8px;font-size:.72rem;font-weight:700;vertical-align:middle;white-space:nowrap}

  /* חיפוש, תצוגה, קיבוץ */
  .pp-tools{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;margin:6px 0 12px}
  .pp-search{position:relative;flex:1 1 320px;min-width:0}
  .pp-search input{width:100%;box-sizing:border-box;border:1.5px solid var(--border-strong);border-radius:999px;
    padding:12px 46px 12px 44px;font:inherit;font-size:var(--fs-md);background:#fff;color:var(--text);box-shadow:var(--sh-sm);outline:none}
  .pp-search input:focus{border-color:var(--blue);box-shadow:0 0 0 4px var(--blue-100)}
  .pp-search>svg{position:absolute;right:17px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none}
  .pp-search kbd{position:absolute;left:16px;top:50%;transform:translateY(-50%);font:inherit;font-size:var(--fs-2xs);font-weight:800;
    color:var(--muted);border:1px solid var(--border-strong);border-bottom-width:2px;border-radius:6px;padding:0 7px;background:var(--soft-bg)}
  .pp-search input:focus~kbd,.pp-search input:not(:placeholder-shown)~kbd{display:none}
  .pp-seg{display:inline-flex;border:1px solid var(--border-strong);border-radius:999px;padding:3px;background:#fff;box-shadow:var(--sh-sm)}
  .pp-seg button{font:inherit;font-weight:700;font-size:var(--fs-sm);border:0;background:none;padding:7px 14px;border-radius:999px;
    color:var(--text2);cursor:pointer;display:inline-flex;gap:7px;align-items:center}
  .pp-seg button[aria-pressed="true"]{background:var(--navy);color:#fff}
  .pp-group{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:var(--fs-sm);color:var(--text2)}
  .pp-group select{font:inherit;font-weight:700;font-size:var(--fs-sm);color:var(--text);border:1px solid var(--border-strong);
    border-radius:999px;padding:8px 14px;background:#fff;box-shadow:var(--sh-sm);cursor:pointer}
  .pp-ftoggle{display:none;font:inherit;font-weight:800;font-size:var(--fs-sm);border:1px solid var(--border-strong);background:#fff;
    color:var(--navy);border-radius:999px;padding:8px 16px;cursor:pointer;align-items:center;gap:8px;box-shadow:var(--sh-sm)}
  .pp-ftoggle .n{background:var(--navy);color:#fff;border-radius:999px;min-width:20px;padding:0 6px;font-size:var(--fs-2xs);line-height:20px;text-align:center}
  .pp-ftoggle .n:empty{display:none}

  /* סינונים */
  .pp-filters{background:#fff;border:1px solid var(--border);border-radius:18px;padding:4px 18px;box-shadow:var(--sh-sm)}
  .pp-facet{display:grid;grid-template-columns:170px 1fr;gap:10px;align-items:start;padding:12px 0;border-bottom:1px solid #EDF3F9}
  .pp-facet:last-child{border-bottom:0}
  .pp-facet .lb{font-weight:800;font-size:var(--fs-sm);color:var(--navy);padding-top:8px}
  .pp-chips{display:flex;flex-wrap:wrap;gap:6px}
  .pp-chip{font:inherit;font-size:var(--fs-sm);font-weight:700;display:inline-flex;align-items:center;gap:7px;min-height:36px;
    border:1px solid var(--border-strong);background:#fff;color:var(--text);border-radius:999px;padding:5px 12px 5px 7px;cursor:pointer;
    transition:background .15s,border-color .15s,color .15s}
  .pp-chip:hover:not(:disabled){border-color:var(--cc,var(--navy))}
  .pp-chip .c{background:var(--soft-bg);color:var(--text2);border-radius:999px;padding:1px 8px;font-size:var(--fs-2xs);
    font-variant-numeric:tabular-nums;min-width:12px;text-align:center}
  .pp-chip[aria-pressed="true"]{background:var(--cc,var(--navy));border-color:transparent;color:#fff}
  .pp-chip[aria-pressed="true"] .c{background:rgba(255,255,255,.24);color:#fff}
  .pp-chip[aria-pressed="true"] .pp-dot,.pp-chip[aria-pressed="true"] .pp-dm,.pp-chip[aria-pressed="true"] .pp-sq{background:#fff}
  .pp-chip:disabled{opacity:.4;cursor:default}

  /* שורת מצב */
  .pp-statusbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:16px 0 12px}
  .pp-status{font-weight:700;color:var(--text2);outline:none}
  .pp-status b{color:var(--navy);font-size:1.05rem}
  .pp-status .note{font-weight:600;color:var(--muted);font-size:var(--fs-xs)}
  .pp-pills{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  .pp-pill{font:inherit;font-size:var(--fs-xs);font-weight:700;background:var(--blue-bg);color:var(--navy);border:1px solid #CFE2F7;
    border-radius:999px;padding:4px 12px 4px 9px;display:inline-flex;gap:7px;align-items:center;cursor:pointer}
  .pp-pill:hover{background:#DDEBFB}
  .pp-clear{font:inherit;font-size:var(--fs-xs);font-weight:800;color:var(--accent);background:none;border:0;cursor:pointer;
    text-decoration:underline;text-underline-offset:3px;padding:4px}
  .pp-actions{margin-inline-start:auto;display:flex;gap:6px;flex-wrap:wrap}
  .pp-act{font:inherit;font-size:var(--fs-xs);font-weight:700;display:inline-flex;gap:6px;align-items:center;border:1px solid var(--border);
    background:#fff;color:var(--text2);border-radius:10px;padding:7px 11px;cursor:pointer;box-shadow:var(--sh-sm)}
  .pp-act:hover{border-color:var(--border-strong);color:var(--navy)}

  /* טבלה */
  .pk-scroll{overflow-x:auto;border:1px solid var(--border);border-radius:16px;background:#fff;box-shadow:var(--sh-sm)}
  table.pk{width:100%;border-collapse:collapse;font-size:.9rem;min-width:1000px}
  table.pk thead th{background:var(--navy);color:#fff;font-weight:600;text-align:right;padding:12px 14px;white-space:nowrap;font-size:.85rem}
  .th-sort{font:inherit;color:inherit;background:none;border:0;cursor:pointer;display:inline-flex;gap:5px;align-items:center;padding:0}
  .th-sort svg{opacity:.45}
  th[aria-sort] .th-sort svg{opacity:1}
  th[aria-sort="descending"] .th-sort svg{transform:rotate(180deg)}
  table.pk td{padding:11px 14px;border-bottom:1px solid var(--border);vertical-align:middle}
  table.pk tbody tr[data-i]{cursor:pointer}
  table.pk tbody tr[data-i]:hover{background:var(--blue-bg)}
  table.pk tr.grp th{background:var(--soft-bg);color:var(--navy);text-align:right;padding:11px 14px;font-weight:800;font-size:.92rem;
    border-bottom:1px solid var(--border)}
  .grp-in{display:inline-flex;align-items:center;gap:9px}
  .gc{font-weight:600;color:var(--muted);font-size:var(--fs-xs)}
  table.pk .semel{font-variant-numeric:tabular-nums;color:var(--muted);font-size:.85rem;white-space:nowrap}
  table.pk .school{font-weight:700;color:var(--navy)}
  .prev{color:var(--muted);font-size:.85rem;white-space:nowrap}
  td.go{width:1%;padding:6px 10px}
  .pp-more{font:inherit;width:34px;height:34px;border-radius:50%;border:1px solid var(--border);background:#fff;color:var(--accent);
    display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
  .pp-more:hover{background:var(--blue-bg);border-color:var(--border-strong)}

  /* כרטיסי מוסדות */
  .pp-cards{display:flex;flex-direction:column;gap:22px}
  .pp-gh{display:flex;align-items:center;gap:9px;font-size:var(--fs-lg);font-weight:800;color:var(--navy);margin:0 0 10px}
  .pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px}
  .pp-card{font:inherit;text-align:start;color:var(--text);background:#fff;border:1px solid var(--border);border-radius:14px;
    padding:13px 16px;display:flex;flex-direction:column;gap:6px;cursor:pointer;box-shadow:var(--sh-sm);
    transition:transform .2s var(--ease),box-shadow .2s var(--ease),border-color .2s}
  .pp-card:hover{transform:translateY(-2px);box-shadow:var(--sh-md);border-color:var(--border-strong)}
  .pc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
  .pc-name{font-weight:800;color:var(--navy);font-size:1rem;line-height:1.35}
  .pc-off{font-size:var(--fs-xs);color:var(--muted);line-height:1.4}
  .pc-meta{font-size:var(--fs-xs);color:var(--text2);font-weight:600}
  .pc-row{display:flex;align-items:center;gap:6px 10px;font-size:var(--fs-sm);flex-wrap:wrap}
  .pc-k{font-size:var(--fs-2xs);font-weight:800;color:var(--muted);min-width:42px}

  .pk-empty{padding:34px;text-align:center;color:var(--text2);font-weight:600;background:#fff;border:1px dashed var(--border-strong);border-radius:16px}
  .pk-empty button{margin-top:10px}

  /* רשתות */
  .pp-nets{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
  .pp-net{background:#fff;border:1px solid var(--border);border-radius:16px;padding:16px 18px;box-shadow:var(--sh-sm);
    display:flex;flex-direction:column;gap:8px}
  .pp-net h3{margin:0;font-size:1.08rem;color:var(--navy);display:flex;justify-content:space-between;gap:10px;align-items:baseline}
  .pp-net h3 small{font-size:var(--fs-sm);color:var(--text2);font-weight:700;white-space:nowrap}
  .pp-net .meta{margin:0;font-size:var(--fs-xs);color:var(--muted);font-weight:600;line-height:1.6}
  .pp-net dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:5px 12px;font-size:var(--fs-sm);
    border-top:1px solid #EDF3F9;padding-top:9px}
  .pp-net dt{color:var(--muted);font-weight:700;font-size:var(--fs-xs);padding-top:2px;max-width:110px;line-height:1.35}
  .pp-net dd{margin:0;font-weight:600;line-height:1.5}
  .pp-net .role{color:var(--muted);font-weight:600;font-size:var(--fs-xs)}
  .pp-net .na{margin:0;font-size:var(--fs-xs);color:var(--muted);border-top:1px solid #EDF3F9;padding-top:9px}
  .pp-go{font:inherit;font-size:var(--fs-sm);font-weight:800;color:var(--accent);background:none;border:0;padding:4px 0;cursor:pointer;
    display:inline-flex;align-items:center;gap:4px;margin-top:auto;align-self:flex-start}
  .pp-go:hover{text-decoration:underline;text-underline-offset:3px}
  .pp-note{margin-top:26px;line-height:1.75}
  .pp-note ul{margin:6px 0 0;padding-inline-start:20px}

  /* מגירת פרטי המוסד — מעוגנת לשמאל: translateX שלילי מוציא אותה החוצה גם ב-RTL */
  .pp-scrim{position:fixed;inset:0;background:rgba(13,59,102,.34);z-index:900;opacity:0;visibility:hidden;transition:opacity .25s,visibility 0s .25s}
  .pp-scrim.on{opacity:1;visibility:visible;transition:opacity .25s}
  .pp-dw{position:fixed;top:0;bottom:0;left:0;width:min(470px,100vw);background:#fff;z-index:901;box-shadow:var(--sh-float);
    transform:translateX(-102%);visibility:hidden;pointer-events:none;display:flex;flex-direction:column;
    transition:transform .3s var(--ease),visibility 0s .3s}
  .pp-dw.on{transform:none;visibility:visible;pointer-events:auto;transition:transform .3s var(--ease)}
  .pp-dw header{padding:22px 24px 18px;background:var(--grad);color:#fff;position:relative}
  .pp-dw .eyebrow{margin:0 0 4px;font-size:var(--fs-xs);font-weight:700;opacity:.85}
  .pp-dw h2{margin:0;font-size:1.45rem;line-height:1.25;padding-left:44px}
  .pp-dw .off{margin:6px 0 0;opacity:.88;font-size:var(--fs-sm)}
  .pp-dw .x{position:absolute;top:16px;left:16px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.4);
    background:rgba(255,255,255,.14);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
  .pp-dw .x:hover{background:rgba(255,255,255,.26)}
  .pp-dw .x:focus-visible{outline:3px solid #fff;outline-offset:2px}
  .pp-dw .bd{padding:6px 24px 30px;overflow:auto;flex:1}
  .pp-dw .gh{font-size:var(--fs-xs);font-weight:800;color:var(--accent);margin:18px 0 8px;padding-top:14px;border-top:1px solid var(--border)}
  .pp-dw .gh:first-child{border-top:0;padding-top:6px}
  .pp-dw dl{display:grid;grid-template-columns:128px 1fr;gap:9px 12px;margin:0}
  .pp-dw dt{color:var(--muted);font-weight:700;font-size:var(--fs-sm)}
  /* block ולא flex — ב-flex התגית <br> מתעלמים ממנה וכל השמות נדחסים לשורה אחת */
  .pp-dw dd{margin:0;font-weight:600;line-height:1.75}
  .pp-dw dd .sup-cell{margin-inline-end:10px}
  .pp-dw dd a{color:var(--accent);font-weight:700;margin-inline-end:12px;white-space:nowrap}
  .pp-dw .tag2{font-size:var(--fs-2xs);font-weight:800;background:var(--soft-bg);color:var(--text2);border-radius:999px;padding:1px 8px}
  .pp-dw .acts{display:flex;flex-direction:column;gap:8px}
  .pp-dw .acts button,.pp-dw .acts a{font:inherit;font-size:var(--fs-sm);font-weight:700;text-align:start;color:var(--navy);text-decoration:none;
    background:var(--soft-bg);border:1px solid var(--border);border-radius:12px;padding:10px 14px;cursor:pointer;
    display:flex;align-items:center;justify-content:space-between;gap:10px}
  .pp-dw .acts button:hover,.pp-dw .acts a:hover{border-color:var(--border-strong);background:var(--blue-bg)}

  @media (max-width:1000px){ .pp-kpis{grid-template-columns:repeat(3,minmax(0,1fr))} }
  @media (max-width:760px){
    .pp-wrap{padding:0 16px 40px} .pp-kpis{padding:14px 16px 4px;gap:8px}
    .pp-kpi{padding:12px 8px} .pp-kpi b{font-size:1.5rem}
    .pp-facet{grid-template-columns:1fr;gap:6px} .pp-facet .lb{padding-top:0}
    .pp-ftoggle{display:inline-flex}
    .pp-filters[data-open="false"]{display:none}
    .pp-search kbd{display:none}
    .pp-actions{margin-inline-start:0}
    .pp-dw dl{grid-template-columns:1fr;gap:2px 0} .pp-dw dd{margin-bottom:8px}
  }
  @media (max-width:520px){ .pp-kpis{grid-template-columns:repeat(2,minmax(0,1fr))} }
  @media (prefers-reduced-motion:reduce){
    .pp-person,.pp-card,.pp-kpi,.pp-dw,.pp-scrim,.pp-person .on-ind{transition:none!important}
  }
  @media print{
    .govbar,.nav,.drawer,.scrim,.foot,#pagebar,.ogenw-launcher,.pn,.pnd,.pp-kpis,.pp-tools,.pp-filters,.pp-actions,.pp-clear,
    #mefakchim,#reshatot,.pp-note,.pp-dw,.pp-scrim,td.go,th.go,#cardsView{display:none!important}
    #tableView,#tableView[hidden]{display:block!important}
    .pk-scroll{border:0;box-shadow:none;overflow:visible}
    table.pk{min-width:0;font-size:9pt}
    table.pk thead th,table.pk tr.grp th{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .pp-pill svg{display:none}
  }
"""

ICON = {
    'search': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    'table': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M3 15h18M9.5 9.5V20"/></svg>',
    'cards': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="3" y="13" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13" width="7.5" height="7.5" rx="2"/></svg>',
    'filter': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16M7 12h10M10 19h4"/></svg>',
    'link': '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
    'csv': '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4"/><path d="M5 19h14"/></svg>',
    'print': '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V4h10v5"/><rect x="3.5" y="9" width="17" height="7.5" rx="2"/><path d="M7 14h10v6H7z"/></svg>',
    'sort': '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6 4-4 4 4M8 2v12"/></svg>',
}


def th(key, label):
    return '<th scope="col" data-k="%s"><button type="button" class="th-sort" data-k="%s">%s%s</button></th>' % (key, key, label, ICON['sort'])


GROUP_OPTS = ''.join('<option value="%s"%s>%s</option>' % (v, ' selected' if v == 'sup' else '', l) for v, l in (
    ('sup', 'מפקח.ת פדגוגי.ת'), ('ther', 'מפקחת המערך הטיפולי'), ('d', 'מחוז'), ('n', 'רשת'), ('s', 'מגזר'), ('', 'בלי קיבוץ')))

MAIN = """
<div class="pagehead">
  <div class="crumb rv"><a href="index.html">בית</a> ‹ <a href="supervision.html">מרחב פיקוח</a> ‹ פריסת הפיקוח</div>
  <div class="rv d1" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
    <h1>פריסת הפיקוח</h1>
    <span class="tag" style="background:var(--navy);color:#fff;font-size:var(--fs-xs)">תשפ״ז</span>
  </div>
  <p class="rv d2 lead" style="max-width:720px">מי מלווה כל מוסד בתשפ״ז — בפיקוח הפדגוגי ובמערך הטיפולי. חפשו מוסד, סננו לפי מפקח.ת, מחוז, רשת או מגזר, ולחצו על מוסד כדי לראות את כל הפרטים שלו.</p>
  <div class="pp-meta rv d2"><span><b>עודכן:</b> @@SOURCES@@</span></div>
</div>

<section class="pp-kpis rv d2" aria-label="הפריסה במספרים">
  <div class="pp-kpi"><b>@@N@@</b><span>מוסדות בפיקוח</span></div>
  <div class="pp-kpi"><b>@@NSUP@@</b><span>מפקחים פדגוגיים</span></div>
  <div class="pp-kpi"><b>@@NTHER@@</b><span>מפקחות על המערך הטיפולי</span></div>
  <div class="pp-kpi"><b>@@ND@@</b><span>מחוזות</span></div>
  <div class="pp-kpi"><b>@@NN@@</b><span>רשתות ועמותות</span></div>
  <button type="button" class="pp-kpi" data-go="chg"><b>@@NCHG@@</b><span>מוסדות שהחליפו מפקח.ת</span><span class="go">להצגת המוסדות</span></button>
</section>

<div class="pp-wrap">

<section class="pp-sec" id="mefakchim" aria-labelledby="h-mefakchim">
  <h2 class="sub-sec" id="h-mefakchim">מי מלווה את מי</h2>
  <p class="pp-intro">כל כרטיס מראה כמה מוסדות בליווי, באילו מגזרים ומחוזות, ועם מי עובדים בצד השני של הפיקוח. לחיצה על כרטיס מסננת את רשימת המוסדות — ולחיצה נוספת מבטלת.</p>
  <h3 class="pp-h3">פיקוח פדגוגי <span class="hint">עיגול בצבע המפקח.ת</span></h3>
  <div class="pp-people">
@@PED_CARDS@@
  </div>
  <h3 class="pp-h3">פיקוח על המערך הטיפולי <span class="hint">יהלום בצבע המפקחת</span></h3>
  <div class="pp-people">
@@THER_CARDS@@
  </div>
</section>

<section class="pp-sec" id="mosdot" aria-labelledby="h-mosdot">
  <h2 class="sub-sec" id="h-mosdot">המוסדות</h2>

  <div class="pp-tools">
    <div class="pp-search">
      <label class="sr-only" for="ppQ">חיפוש מוסד</label>
      <input id="ppQ" type="search" autocomplete="off" placeholder="חיפוש לפי שם מוסד, סמל, יישוב או מפקח.ת" aria-describedby="ppQh">
      @@I_SEARCH@@<kbd aria-hidden="true">/</kbd>
      <span class="sr-only" id="ppQh">אפשר לחפש כמה מילים יחד, למשל: עתיד חיפה</span>
    </div>
    <button type="button" class="pp-ftoggle" id="ppFtoggle" aria-expanded="false" aria-controls="ppFacets" data-act="filters">@@I_FILTER@@סינון<span class="n" id="ppFn"></span></button>
    <div class="pp-seg" role="group" aria-label="תצוגה">
      <button type="button" data-view="table" aria-pressed="true">@@I_TABLE@@טבלה</button>
      <button type="button" data-view="cards" aria-pressed="false">@@I_CARDS@@כרטיסים</button>
    </div>
    <label class="pp-group">קיבוץ לפי <select id="ppGroup">@@GROUP_OPTS@@</select></label>
  </div>

  <div class="pp-filters" id="ppFacets" data-open="false" aria-label="סינונים"></div>

  <div class="pp-statusbar">
    <div class="pp-status" id="ppStatus" tabindex="-1" role="status" aria-live="polite">מוצגים <b id="ppShown">@@N@@</b> מתוך @@N@@ מוסדות <span class="note" id="ppNote"></span></div>
    <div class="pp-pills" id="ppPills"></div>
    <div class="pp-actions">
      <button type="button" class="pp-act" data-act="link">@@I_LINK@@<span>העתקת קישור לתצוגה</span></button>
      <button type="button" class="pp-act" data-act="csv">@@I_CSV@@<span>ייצוא לאקסל</span></button>
      <button type="button" class="pp-act" data-act="print">@@I_PRINT@@<span>הדפסה</span></button>
    </div>
  </div>
  <div class="sr-only" aria-live="polite" id="ppLive"></div>

  <div class="pp-cards" id="cardsView" hidden></div>
  <div class="pk-scroll" id="tableView">
    <table class="pk">
      <caption class="sr-only">פריסת הפיקוח תשפ״ז — מוסד, רשת, מחוז, מגזר, מפקח.ת פדגוגי.ת בתשפ״ז ובתשפ״ו ומפקחת המערך הטיפולי</caption>
      <thead><tr>
        @@TH@@<th scope="col" class="go"><span class="sr-only">פרטים</span></th>
      </tr></thead>
      <tbody id="tb">
@@ROWS@@
      </tbody>
    </table>
  </div>
  <div class="pk-empty" id="ppEmpty" hidden>לא נמצאו מוסדות שמתאימים לחיפוש ולסינון.<br><button type="button" class="pp-act" data-clear="1">ניקוי כל הסינונים</button></div>
</section>

<section class="pp-sec" id="reshatot" aria-labelledby="h-reshatot">
  <h2 class="sub-sec" id="h-reshatot">רשתות ועמותות</h2>
  <p class="pp-intro">הנהלת כל רשת ואיש.ת הקשר שלה לבתי הספר של משרד העבודה — שמות ותפקידים בלבד, כפי שהם בקובץ אנשי הקשר (שם משפחה ואז שם פרטי). טלפונים ומיילים נמצאים באדמין המוסדות, למורשים.</p>
  <div class="pp-nets">
@@NET_CARDS@@
  </div>
</section>

<div class="notice pp-note">
  <b>כדאי לדעת</b>
  <ul>
    <li>מוסד עם שני מפקחים פדגוגיים הוא ליווי משותף (@@JOINT@@). הוא נספר אצל שניהם, ולכן סכום העומסים בכרטיסים גבוה מ-@@N@@.</li>
    <li>״שינוי״ — המפקח.ת בתשפ״ז שונה מתשפ״ו, או שהמוסד לא היה בפריסה בתשפ״ו.</li>
    <li>טלפון המוסד מוצג רק כשהוא קו נייח. חסרים בקובץ כתובת וטלפון ל: @@NOADDR@@.</li>
    <li>עדכוני פריסה מתבצעים דרך הפיקוח הפדגוגי · <a href="supervision.html" style="color:var(--blue);font-weight:700">חזרה למרחב הפיקוח</a> · <a href="pikuah-miktzoi.html" style="color:var(--blue);font-weight:700">הפיקוח המקצועי — מגמות ומפקחים</a></li>
  </ul>
</div>

</div>

<div class="pp-scrim" id="ppScrim" data-close="1"></div>
<div class="pp-dw" id="ppDw" role="dialog" aria-modal="true" aria-labelledby="ppDwT" aria-hidden="true"></div>
"""

JS = r"""
(function(){
'use strict';
var D=JSON.parse(document.getElementById('ppData').textContent);
var S=D.schools, C=D.colors, coll=new Intl.Collator('he');
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
/* חיפוש סלחני: בלי גרשיים, מקפים וסוגריים, וכל מילה בנפרד */
function norm(s){return String(s||'').toLowerCase().replace(/[\u05F3\u05F4'"`]/g,'').replace(/[-\u2013\u2014_\/\\(),.:;\u00B7|+]/g,' ').replace(/\s+/g,' ').trim();}
var X='<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>';
var GO='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg>';

var F=[
  {k:'sup', lb:'מפקח.ת פדגוגי.ת', sh:'פדגוגי', get:function(s){return s.sups;}, col:C.sup, mk:'dot'},
  {k:'ther',lb:'מפקחת המערך הטיפולי', sh:'טיפולי', get:function(s){return s.ther?[s.ther]:[];}, col:C.ther, mk:'dm'},
  {k:'d',   lb:'מחוז', sh:'מחוז', get:function(s){return [s.d];}},
  {k:'s',   lb:'מגזר', sh:'מגזר', get:function(s){return [s.s];}, col:C.sector, mk:'sq'},
  {k:'n',   lb:'רשת / עמותה', sh:'רשת', get:function(s){return [s.net];}}
];
var FK={}; F.forEach(function(f){FK[f.k]=f;});
var FLAGS=[
  {k:'chg',  lb:'החליפו מפקח.ת מתשפ״ו', t:function(s){return s.chg;}},
  {k:'joint',lb:'ליווי משותף', t:function(s){return s.sups.length>1;}}
];
var FL={}; FLAGS.forEach(function(x){FL[x.k]=x;});

var st={q:'',f:{},fl:{},g:'sup',sk:'name',sd:1,view:'table'};
function resetFilters(){ st.q=''; F.forEach(function(f){st.f[f.k]=[];}); FLAGS.forEach(function(x){st.fl[x.k]=false;}); }
resetFilters();

S.forEach(function(s){
  s._h=norm([s.name,s.off,s.semel,s.moe,s.net,s.d,s.s,s.city,(s.addr||[]).join(' '),s.sups.join(' '),s.prev,s.ther,(s.alias||[]).join(' ')].join(' '));
});

function match(s,skipF,skipFl){
  if(st.q){ var t=norm(st.q).split(' '); for(var i=0;i<t.length;i++){ if(t[i]&&s._h.indexOf(t[i])<0) return false; } }
  for(var j=0;j<F.length;j++){
    var f=F[j]; if(f.k===skipF) continue;
    var sel=st.f[f.k]; if(!sel.length) continue;
    var v=f.get(s), ok=false;
    for(var m=0;m<v.length;m++){ if(sel.indexOf(v[m])>-1){ok=true;break;} }
    if(!ok) return false;
  }
  for(var k=0;k<FLAGS.length;k++){ var x=FLAGS[k]; if(x.k!==skipFl && st.fl[x.k] && !x.t(s)) return false; }
  return true;
}
function mark(kind,c){ return c?'<span class="pp-'+kind+'" style="--c:'+c+'" aria-hidden="true"></span>':''; }
function activeCount(){ var n=st.q?1:0; F.forEach(function(f){n+=st.f[f.k].length;}); FLAGS.forEach(function(x){if(st.fl[x.k])n++;}); return n; }

/* ---- בניית לוח הסינונים (פעם אחת) ---- */
var fbox=$('ppFacets');
(function(){
  var h='';
  F.forEach(function(f){
    h+='<div class="pp-facet" role="group" aria-labelledby="fl-'+f.k+'"><div class="lb" id="fl-'+f.k+'">'+esc(f.lb)+'</div><div class="pp-chips">';
    D.order[f.k].forEach(function(v){
      var c=f.col&&f.col[v];
      h+='<button type="button" class="pp-chip" data-f="'+f.k+'" data-v="'+esc(v)+'" aria-pressed="false"'+(c?' style="--cc:'+c+'"':'')+'>'+mark(f.mk,c)+'<span>'+esc(v)+'</span><span class="c"></span></button>';
    });
    h+='</div></div>';
  });
  h+='<div class="pp-facet" role="group" aria-labelledby="fl-x"><div class="lb" id="fl-x">מצב</div><div class="pp-chips">';
  FLAGS.forEach(function(x){ h+='<button type="button" class="pp-chip" data-fl="'+x.k+'" aria-pressed="false" style="--cc:#8A5A00"><span>'+esc(x.lb)+'</span><span class="c"></span></button>'; });
  fbox.innerHTML=h+'</div></div>';
})();
var CHIPS=[].slice.call(fbox.querySelectorAll('.pp-chip'));
var PEOPLE=[].slice.call(document.querySelectorAll('.pp-person'));

/* ---- מיון וקיבוץ ---- */
var SORTK={semel:function(s){return s.semel;},name:function(s){return s.name;},net:function(s){return s.net;},d:function(s){return s.d;},
  s:function(s){return s.s;},sup:function(s){return s.sups.join(' ');},prev:function(s){return s.prev;},ther:function(s){return s.ther;}};
function sortList(a){
  var k=st.sk, g=SORTK[k]||SORTK.name, d=st.sd;
  return a.slice().sort(function(x,y){
    var r=k==='semel'?((+x.semel||0)-(+y.semel||0)):coll.compare(g(x)||'',g(y)||'');
    return (r||coll.compare(x.name,y.name))*d;
  });
}
function groups(list){
  if(!st.g) return [{k:'',items:sortList(list)}];
  var f=FK[st.g], m={}, sel=st.f[st.g];
  /* כשמסננים לפי אותה עמודה שמקבצים לפיה — רק הערכים שנבחרו מקבלים כותרת,
     אחרת מוסד בליווי משותף היה פותח קבוצה גם למפקח.ת שלא סוננו אליו */
  list.forEach(function(s){ f.get(s).forEach(function(v){ if(sel.length&&sel.indexOf(v)<0) return; (m[v]=m[v]||[]).push(s); }); });
  return D.order[st.g].filter(function(v){return m[v];}).map(function(v){return {k:v,items:sortList(m[v])};});
}
function plural(n){ return n===1?'מוסד אחד':n+' מוסדות'; }
function ghead(g){ var f=FK[st.g]; return '<span class="grp-in">'+mark(f.mk,f.col&&f.col[g.k])+'<span>'+esc(g.k)+'</span><span class="gc">'+plural(g.items.length)+'</span></span>'; }
function supsHtml(s){ return s.sups.map(function(n){return '<span class="sup-cell">'+mark('dot',C.sup[n]||'#52687A')+esc(n)+'</span>';}).join(' '); }
function therHtml(s){ return s.ther?'<span class="sup-cell">'+mark('dm',C.ther[s.ther]||'#52687A')+esc(s.ther)+'</span>':'—'; }

/* ---- טבלה: השורות הסטטיות מסודרות מחדש; מוסד בליווי משותף משוכפל לקבוצה השנייה ---- */
var tb=$('tb'), ROW={};
[].forEach.call(tb.querySelectorAll('tr[data-i]'),function(tr){ROW[tr.getAttribute('data-i')]=tr;});
function renderTable(gs){
  var frag=document.createDocumentFragment(), used={};
  gs.forEach(function(g){
    if(g.k){ var tr=document.createElement('tr'); tr.className='grp'; tr.innerHTML='<th colspan="9" scope="colgroup">'+ghead(g)+'</th>'; frag.appendChild(tr); }
    g.items.forEach(function(s){ var r=ROW[s.i]; if(used[s.i]) r=r.cloneNode(true); used[s.i]=1; frag.appendChild(r); });
  });
  tb.textContent=''; tb.appendChild(frag);
  [].forEach.call(document.querySelectorAll('table.pk thead th[data-k]'),function(th){
    if(th.getAttribute('data-k')===st.sk) th.setAttribute('aria-sort',st.sd>0?'ascending':'descending'); else th.removeAttribute('aria-sort');
  });
}
function card(s){
  return '<button type="button" class="pp-card" data-i="'+s.i+'">'
    +'<span class="pc-top"><span class="pc-name">'+esc(s.name)+'</span>'+(s.chg?'<span class="chg">שינוי</span>':'')+'</span>'
    +(s.off?'<span class="pc-off">'+esc(s.off)+'</span>':'')
    +'<span class="pc-meta">'+esc([s.net,s.d,s.s].join(' · '))+(s.semel?' · סמל '+esc(s.semel):'')+'</span>'
    +'<span class="pc-row"><span class="pc-k">פדגוגי</span>'+supsHtml(s)+'</span>'
    +'<span class="pc-row"><span class="pc-k">טיפולי</span>'+therHtml(s)+'</span></button>';
}
function renderCards(gs){
  $('cardsView').innerHTML=gs.map(function(g){
    return '<section>'+(g.k?'<h3 class="pp-gh">'+ghead(g)+'</h3>':'')+'<div class="pp-grid">'+g.items.map(card).join('')+'</div></section>';
  }).join('');
}

/* ---- כתובת: מצב הסינון נשמר ב-# כדי שאפשר לשתף תצוגה ---- */
function syncHash(){
  var p=[];
  if(st.q) p.push('q='+encodeURIComponent(st.q));
  F.forEach(function(f){ if(st.f[f.k].length) p.push(f.k+'='+st.f[f.k].map(encodeURIComponent).join(',')); });
  FLAGS.forEach(function(x){ if(st.fl[x.k]) p.push(x.k+'=1'); });
  if(st.g!=='sup') p.push('g='+(st.g||'none'));
  var h=p.length?'#'+p.join('&'):'';
  if(!h && location.hash.indexOf('=')<0) return;      /* לא לדרוס עוגן של מדור */
  if(location.hash!==h) try{ history.replaceState(null,'',location.pathname+location.search+h); }catch(e){}
}
function readHash(){
  var h=location.hash.slice(1); if(h.indexOf('=')<0) return false;
  resetFilters(); st.g='sup';
  h.split('&').forEach(function(kv){
    var i=kv.indexOf('='); if(i<0) return;
    var k=kv.slice(0,i), v=kv.slice(i+1);
    try{
      if(k==='q') st.q=decodeURIComponent(v);
      else if(FK[k]) st.f[k]=v.split(',').map(decodeURIComponent).filter(function(x){return D.order[k].indexOf(x)>-1;});
      else if(FL[k]) st.fl[k]=v==='1';
      else if(k==='g') st.g=(v==='none')?'':(FK[v]?v:'sup');
    }catch(e){}
  });
  $('ppQ').value=st.q; $('ppGroup').value=st.g;
  return true;
}

/* ---- עדכון כללי ---- */
function update(){
  var list=S.filter(function(s){return match(s);});
  CHIPS.forEach(function(b){
    var n=0, on, fk=b.getAttribute('data-f'), v=b.getAttribute('data-v'), fl=b.getAttribute('data-fl');
    if(fk){ var f=FK[fk]; S.forEach(function(s){ if(f.get(s).indexOf(v)>-1 && match(s,fk)) n++; }); on=st.f[fk].indexOf(v)>-1; }
    else { var x=FL[fl]; S.forEach(function(s){ if(x.t(s) && match(s,null,fl)) n++; }); on=st.fl[fl]; }
    b.querySelector('.c').textContent=n;
    b.setAttribute('aria-pressed',on?'true':'false');
    b.disabled=!on&&n===0;
  });
  PEOPLE.forEach(function(b){ b.setAttribute('aria-pressed',st.f[b.getAttribute('data-f')].indexOf(b.getAttribute('data-v'))>-1?'true':'false'); });

  $('ppShown').textContent=list.length;
  var gs=groups(list), dup=st.g==='sup'&&gs.length>1&&list.some(function(s){return s.sups.length>1;});
  $('ppNote').textContent=dup?'· מוסד בליווי משותף מופיע אצל שני המפקחים':'';
  var p='';
  if(st.q) p+=pill('q','','חיפוש: '+st.q);
  F.forEach(function(f){ st.f[f.k].forEach(function(v){ p+=pill(f.k,v,f.sh+': '+v); }); });
  FLAGS.forEach(function(x){ if(st.fl[x.k]) p+=pill('fl',x.k,x.lb); });
  if(p) p+='<button type="button" class="pp-clear" data-clear="1">ניקוי כל הסינונים</button>';
  $('ppPills').innerHTML=p;
  var n=activeCount(); $('ppFn').textContent=n||'';
  $('ppEmpty').hidden=list.length>0;
  $('tableView').hidden=st.view!=='table'||!list.length;
  $('cardsView').hidden=st.view!=='cards'||!list.length;
  renderTable(gs); renderCards(gs); syncHash();
}
function pill(k,v,label){ return '<button type="button" class="pp-pill" data-pk="'+k+'" data-pv="'+esc(v)+'" aria-label="הסרת הסינון '+esc(label)+'">'+esc(label)+X+'</button>'; }
function toggleF(k,v){ var a=st.f[k], i=a.indexOf(v); if(i>-1){a.splice(i,1);return false;} a.push(v); return true; }
function toList(focus){
  var sec=$('mosdot'); if(sec.getBoundingClientRect().top>140||sec.getBoundingClientRect().top<-40) sec.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
  if(focus) $('ppStatus').focus({preventScroll:true});
}
function say(msg){ var l=$('ppLive'); l.textContent=''; setTimeout(function(){l.textContent=msg;},60); }

/* ---- תצוגה ---- */
function setView(v,save){
  st.view=v==='cards'?'cards':'table';
  [].forEach.call(document.querySelectorAll('[data-view]'),function(b){ b.setAttribute('aria-pressed',b.getAttribute('data-view')===st.view?'true':'false'); });
  if(save) try{ localStorage.setItem('pp-view',st.view); }catch(e){}
  update();
}

/* ---- מגירת פרטי המוסד ---- */
var dw=$('ppDw'), scrim=$('ppScrim'), lastFocus=null;
function openDw(i,from){
  var s=S[i]; if(!s) return;
  lastFocus=from||document.activeElement;
  var net=D.nets[s.net], h='';
  function row(k,v){ if(v) h+='<dt>'+k+'</dt><dd>'+v+'</dd>'; }
  h+='<header><p class="eyebrow">'+esc(s.net)+' · '+esc(s.d)+' · '+esc(s.s)+'</p><h2 id="ppDwT">'+esc(s.name)+'</h2>'
    +(s.off?'<p class="off">'+esc(s.off)+'</p>':'')
    +'<button type="button" class="x" data-close="1" aria-label="סגירת הפרטים">'+X.replace(/11/g,'16')+'</button></header><div class="bd">';
  h+='<div class="gh">הפיקוח בתשפ״ז</div><dl>';
  row('פיקוח פדגוגי',supsHtml(s)+(s.sups.length>1?'<span class="tag2">ליווי משותף</span>':''));
  row('בתשפ״ו',esc(s.prev||'לא היה בפריסה')+(s.chg?'<span class="chg">שינוי</span>':''));
  row('מערך טיפולי',therHtml(s));
  h+='</dl><div class="gh">פרטי המוסד</div><dl>';
  row('סמל מוסד',esc(s.semel)); row('סמל משרד החינוך',esc(s.moe));
  row('רשת',esc(s.net)); row('מחוז',esc(s.d)); row('מגזר',esc(s.s)); row('רשות מקומית',esc(s.city));
  row('כתובת',(s.addr||[]).map(esc).join('<br>'));
  row('טלפון המוסד',(s.tel||[]).map(function(t){return '<a href="'+esc(t.href)+'" dir="ltr">'+esc(t.t)+'</a>';}).join(''));
  h+='</dl>';
  if(net&&(net.lead.length||net.contact.length)){
    h+='<div class="gh">הרשת · '+esc(s.net)+'</div><dl>';
    row('הנהלה',net.lead.map(function(x){return esc(x.n)+(x.r?' <span class="tag2">'+esc(x.r)+'</span>':'');}).join('<br>'));
    row('איש.ת קשר',net.contact.map(esc).join('<br>'));
    h+='</dl>';
  }
  h+='<div class="gh">להמשיך מכאן</div><div class="acts">';
  s.sups.forEach(function(n){ h+='<button type="button" data-go="sup" data-v="'+esc(n)+'">כל המוסדות של '+esc(n)+GO+'</button>'; });
  if(s.ther) h+='<button type="button" data-go="ther" data-v="'+esc(s.ther)+'">כל המוסדות של '+esc(s.ther)+' · מערך טיפולי'+GO+'</button>';
  h+='<button type="button" data-go="n" data-v="'+esc(s.net)+'">כל המוסדות ברשת '+esc(s.net)+GO+'</button>';
  h+='<a href="pikuah-miktzoi.html">המגמות והפיקוח המקצועי במוסדות'+GO+'</a></div></div>';
  dw.innerHTML=h;
  dw.classList.add('on'); scrim.classList.add('on'); dw.setAttribute('aria-hidden','false');
  document.documentElement.style.overflow='hidden';
  setTimeout(function(){ var x=dw.querySelector('.x'); if(x) x.focus(); },30);
}
function closeDw(keepFocus){
  if(!dw.classList.contains('on')) return;
  dw.classList.remove('on'); scrim.classList.remove('on'); dw.setAttribute('aria-hidden','true');
  document.documentElement.style.overflow='';
  if(!keepFocus&&lastFocus&&document.body.contains(lastFocus)) lastFocus.focus();
}
dw.addEventListener('keydown',function(ev){
  if(ev.key==='Escape'){ ev.preventDefault(); closeDw(); return; }
  if(ev.key!=='Tab') return;
  var f=dw.querySelectorAll('a[href],button:not([disabled])'); if(!f.length) return;
  var a=f[0], z=f[f.length-1];
  if(ev.shiftKey&&document.activeElement===a){ ev.preventDefault(); z.focus(); }
  else if(!ev.shiftKey&&document.activeElement===z){ ev.preventDefault(); a.focus(); }
});

/* ---- פעולות ---- */
function copyLink(btn){
  var url=location.href, lbl=btn.querySelector('span'), orig=lbl.textContent;
  function done(){ lbl.textContent='הקישור הועתק'; say('הקישור לתצוגה הנוכחית הועתק'); setTimeout(function(){lbl.textContent=orig;},2200); }
  function fallback(){ var ta=document.createElement('textarea'); ta.value=url; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); done(); }catch(e){} ta.remove(); }
  if(navigator.clipboard&&window.isSecureContext) navigator.clipboard.writeText(url).then(done,fallback); else fallback();
}
function csv(){
  var list=sortList(S.filter(function(s){return match(s);}));
  var H=['סמל מוסד','סמל משרד החינוך','שם המוסד','שם רשמי','רשת','מחוז','מגזר','רשות מקומית','מפקח.ת פדגוגי.ת תשפ״ז','מפקח.ת פדגוגי.ת תשפ״ו','מפקחת המערך הטיפולי','כתובת','טלפון המוסד'];
  var rows=[H].concat(list.map(function(s){ return [s.semel,s.moe,s.name,s.off||'',s.net,s.d,s.s,s.city,s.sups.join(' + '),s.prev,s.ther,(s.addr||[]).join(' · '),(s.tel||[]).map(function(t){return t.t;}).join(' / ')]; }));
  var txt='\ufeff'+rows.map(function(r){ return r.map(function(c){ c=String(c==null?'':c); return /[",\r\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c; }).join(','); }).join('\r\n');
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'}));
  a.download='פריסת-פיקוח-תשפז.csv'; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },800);
  say('הקובץ ירד — '+plural(list.length));
}

document.addEventListener('click',function(ev){
  var t=ev.target, b; if(!t.closest) return;
  if((b=t.closest('.pp-chip'))){
    var fl=b.getAttribute('data-fl');
    if(fl) st.fl[fl]=!st.fl[fl]; else toggleF(b.getAttribute('data-f'),b.getAttribute('data-v'));
    update(); return;
  }
  if((b=t.closest('.pp-person'))){ if(toggleF(b.getAttribute('data-f'),b.getAttribute('data-v'))){ update(); toList(); } else update(); return; }
  if((b=t.closest('.pp-pill'))){
    var k=b.getAttribute('data-pk'), v=b.getAttribute('data-pv');
    if(k==='q'){ st.q=''; $('ppQ').value=''; } else if(k==='fl') st.fl[v]=false; else toggleF(k,v);
    update(); $('ppStatus').focus({preventScroll:true}); return;
  }
  if(t.closest('[data-clear]')){ resetFilters(); $('ppQ').value=''; update(); $('ppQ').focus(); return; }
  if((b=t.closest('[data-go]'))){
    resetFilters(); $('ppQ').value='';
    var g=b.getAttribute('data-go'); if(g==='chg') st.fl.chg=true; else st.f[g]=[b.getAttribute('data-v')];
    closeDw(true); update(); toList(true); return;
  }
  if((b=t.closest('.th-sort'))){ var sk=b.getAttribute('data-k'); if(st.sk===sk) st.sd=-st.sd; else { st.sk=sk; st.sd=1; } update(); return; }
  if((b=t.closest('.pp-card'))){ openDw(+b.getAttribute('data-i'),b); return; }
  if((b=t.closest('#tb tr[data-i]'))){ if(t.closest('a')) return; openDw(+b.getAttribute('data-i'),b.querySelector('.pp-more')); return; }
  if(t.closest('[data-close]')){ closeDw(); return; }
  if((b=t.closest('[data-view]'))){ setView(b.getAttribute('data-view'),true); return; }
  if((b=t.closest('[data-act]'))){
    var a=b.getAttribute('data-act');
    if(a==='link') copyLink(b); else if(a==='csv') csv(); else if(a==='print') window.print();
    else if(a==='filters'){ var open=fbox.getAttribute('data-open')!=='true'; fbox.setAttribute('data-open',open?'true':'false'); b.setAttribute('aria-expanded',open?'true':'false'); }
    return;
  }
});
var qT;
$('ppQ').addEventListener('input',function(){ var v=this.value; clearTimeout(qT); qT=setTimeout(function(){ st.q=v.trim(); update(); },140); });
$('ppGroup').addEventListener('change',function(){ st.g=this.value; update(); });
document.addEventListener('keydown',function(ev){
  if(ev.key==='/'&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey){
    var a=document.activeElement, tag=a&&a.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(a&&a.isContentEditable)||dw.classList.contains('on')) return;
    ev.preventDefault(); $('ppQ').focus();
  }
});
window.addEventListener('hashchange',function(){ if(readHash()) update(); });

/* ---- התחלה ---- */
readHash();
var saved=null; try{ saved=localStorage.getItem('pp-view'); }catch(e){}
setView(saved||(window.matchMedia&&matchMedia('(max-width:760px)').matches?'cards':'table'),false);
})();
"""

TH = ''.join([th('semel', 'סמל מוסד'), th('name', 'שם המוסד'), th('net', 'רשת'), th('d', 'מחוז'), th('s', 'מגזר'),
              th('sup', 'מפקח.ת פדגוגי.ת תשפ״ז'), th('prev', 'תשפ״ו'), th('ther', 'מערך טיפולי')])

rep = {
    '@@SOURCES@@': e(SOURCES), '@@N@@': str(len(schools)), '@@NSUP@@': str(len(SUP_ORDER)),
    '@@NTHER@@': str(len(THER_ORDER)), '@@ND@@': str(len(D_ORDER)), '@@NN@@': str(len(N_ORDER)),
    '@@NCHG@@': str(N_CHG), '@@PED_CARDS@@': PED_CARDS, '@@THER_CARDS@@': THER_CARDS,
    '@@ROWS@@': ROWS, '@@NET_CARDS@@': NET_CARDS, '@@TH@@': TH, '@@GROUP_OPTS@@': GROUP_OPTS,
    '@@JOINT@@': e(', '.join(s['name'] for s in schools if len(s['sups']) > 1)),
    '@@NOADDR@@': e(', '.join(no_addr) or '—'),
    '@@I_SEARCH@@': ICON['search'], '@@I_FILTER@@': ICON['filter'], '@@I_TABLE@@': ICON['table'],
    '@@I_CARDS@@': ICON['cards'], '@@I_LINK@@': ICON['link'], '@@I_CSV@@': ICON['csv'], '@@I_PRINT@@': ICON['print'],
}
main = MAIN
for k, v in rep.items():
    main = main.replace(k, v)
if '@@' in main:
    sys.exit('נשאר placeholder: ' + re.search(r'@@\w+@@', main).group(0))

page = (
    head + STYLE_LINK + '\n<link rel="stylesheet" href="/toolbelt.css">\n<link rel="stylesheet" href="/pagenav.css">\n'
    '<style>' + CSS + '</style>\n</head>\n<body data-pn-min="3">\n<a class="skip" href="#main">דילוג לתוכן הראשי</a>\n\n'
    + nav + '\n\n<main id="main">\n' + main + '\n</main>\n\n' + foot + '\n\n'
    '<script type="application/json" id="ppData">' + DATA + '</script>\n'
    '<script src="site.js" defer></script>\n<script src="search.js" defer></script>\n'
    '<script>' + JS + '</script>\n'
    '<script>window.OGEN_WIDGET_POSITION="left";</script>\n<script src="/ogen-widget.pinned.js" defer></script>\n'
    '<script src="feedback.js" defer></script>\n<script src="/toolbelt.js" defer></script>\n'
    '<script src="/pagenav.js" defer></script>\n</body>\n</html>\n'
)
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(page)

# ── 12. דוח ─────────────────────────────────────────────────────────────────────
print('נכתב %s — %d מוסדות, %d שינויים מתשפ״ו, %d ליווי משותף' % (OUT, len(schools), N_CHG, N_JOINT))
print('פדגוגי:', ' · '.join('%s %d' % (n, sup_n[n]) for n in SUP_ORDER))
print('טיפולי:', ' · '.join('%s %d' % (n, ther_n[n]) for n in THER_ORDER))
print('רשתות:', ' · '.join('%s %d' % (n, n_n[n]) for n in N_ORDER))
print('רשתות עם אנשי קשר:', ', '.join(nets))
for n in notes:
    print('  •', n)
for s in skipped:
    print('  ? שורה בקובץ אנשי הקשר בלי רשת מזוהה — לא נכנסה:', s)
