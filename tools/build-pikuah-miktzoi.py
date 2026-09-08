# -*- coding: utf-8 -*-
"""בונה את pikuah-miktzoi.html מטבלת השליטה של הפיקוח המקצועי.

כשמגיעה גרסה מעודכנת של הטבלה מהמינהל: לשמור אותה ב-Downloads,
לעדכן כאן את XLSX לשם הקובץ החדש ולהריץ

    python tools/build-pikuah-miktzoi.py

העמוד נבנה מחדש במלואו — אין צורך לערוך אותו ידנית.
העמודה "מפקח.ת פדגוגי.ת" נשאבת מ-prisat-pikuah.html שכבר באתר,
לכן ALIAS ממפה שמות שנכתבו אחרת בשתי הרשימות.
שני מוסדות משרד החינוך שבטבלה אינם נמנים על 64 מוסדות הפיקוח
הפדגוגי, ולכן מסומנים "פיקוח מקצועי בלבד".
"""
import io, os, re, html
import openpyxl

DL    = r'C:/Users/meyta/Downloads'
SITE  = os.path.join(DL, 'pedagogia-mh')
XLSX  = os.path.join(DL, 'עותק של עותק של סופי - טבלת שליטה פיקוח מקצועי  7 בספטמבר (003).xlsx')
OUT   = os.path.join(SITE, 'pikuah-miktzoi.html')
SHELL = os.path.join(SITE, 'prisat-pikuah.html')


# ── 1. קריאת האקסל ────────────────────────────────────────────────────────────
def val(v):
    return re.sub(r'\s+', ' ', str(v).replace('\xa0', ' ')).strip() if v not in (None, '') else ''


wb = openpyxl.load_workbook(XLSX, data_only=True)
ws = wb['פריסת פיקוח ']
schools, cur = [], None
for r in ws.iter_rows(min_row=2, max_col=12, values_only=True):
    if val(r[1]):
        cur = {'semel': val(r[0]), 'name': val(r[1]), 'reshet': val(r[2]),
               'mehoz': val(r[3]), 'migzar': val(r[4]), 'megamot': []}
        schools.append(cur)
    if val(r[9]) and cur is not None:
        cur['megamot'].append({'raw': val(r[9]), 'sup_raw': val(r[10]), 'note': val(r[11])})


# ── 2. פירוק שם המגמה: שם · סמל · שכבות (המקור נשמר כפי שהוא) ────────────────
def split_megama(s):
    name, code, grades = s, '', ''
    m = re.search(r'\(([^()]*)\)\s*$', name)
    if m:
        inner = m.group(1).strip()
        if re.fullmatch(r'\d{2,4}', inner):            # "עיצוב שיער (603)"
            code, name = inner, name[:m.start()]
        else:
            grades, name = inner, name[:m.start()]
    m = re.search(r'[-\u2013\s]\s*(\d{2,4})\s*[-\u2013]?\s*$', name)
    if m:
        code, name = m.group(1), name[:m.start()]
    name = name.strip(' ,-\u2013')
    return name or s, code, grades


# ── 3. פירוק שם המפקח.ת: שמות + הערה בסוגריים ────────────────────────────────
def split_sup(s):
    if not s:
        return [], ''
    note = ''
    m = re.search(r'\(([^()]*)\)\s*$', s)
    if m:
        note, s = m.group(1).strip(), s[:m.start()].strip()
    if not s or s.startswith('לבדיקה'):
        return [], (s + (' · ' + note if note else '')).strip(' ·')
    return [n.strip() for n in s.split('+') if n.strip()], note


for sc in schools:
    for mg in sc['megamot']:
        mg['name'], mg['code'], mg['grades'] = split_megama(mg['raw'])
        mg['sups'], mg['sup_note'] = split_sup(mg['sup_raw'])
        mg['tet'] = mg['raw'].startswith("ט' כללית")

# ── 4. המפקח.ת הפדגוגי.ת — מצטרף מפריסת הפיקוח שכבר באתר ─────────────────────
shell_src = io.open(SHELL, encoding='utf-8').read()
ped = {}
for sup, semel, school in re.findall(
        r'<tr data-sup="(.*?)".*?<td class="semel">(.*?)</td><td class="school">(.*?)</td>', shell_src):
    ped[html.unescape(school)] = html.unescape(sup)
    if semel.strip().isdigit():
        ped[semel.strip()] = html.unescape(sup)
ALIAS = {'אור דניאל נתניה': 'אור דניאל', 'צור באהר': 'סור באהר',
         'עתיד אור מנחם (קמפוס לשעבר)': 'הקמפוס התורני עתיד'}
for sc in schools:
    key = sc['semel'] if sc['semel'] in ped else ALIAS.get(sc['name'], sc['name'])
    sc['ped'] = ped.get(key, '')

# ── 5. צבעים למפקחים המקצועיים ───────────────────────────────────────────────
PALETTE = ['#14548C', '#9A5B00', '#6E56A8', '#1F7A4D', '#B0375E', '#A8437A', '#0E7490',
           '#17857F', '#C0392B', '#2E6B2E', '#8A4B00', '#5B4BA8', '#0D3B66', '#3F7A1F',
           '#A03A6B', '#1B6E8C', '#7A3E12', '#4A5D23', '#8C2F5A']
count = {}
for sc in schools:
    for mg in sc['megamot']:
        for n in mg['sups']:
            count[n] = count.get(n, 0) + 1
order = sorted(count, key=lambda n: (-count[n], n))
color = {n: PALETTE[i % len(PALETTE)] for i, n in enumerate(order)}

# ── 6. מספרים לכרטיסי הסיכום ─────────────────────────────────────────────────
all_mg    = [mg for sc in schools for mg in sc['megamot']]
n_schools = len(schools)
n_tech    = len([m for m in all_mg if not m['tet']])
n_sups    = len(order)
n_open    = len([m for m in all_mg if not m['tet'] and not m['sups']])

# ── 7. בניית השורות ──────────────────────────────────────────────────────────
e = lambda s: html.escape(s, quote=True)
rows = []
for sc in schools:
    for i, mg in enumerate(sc['megamot']):
        if mg['sups']:
            supcell = ''.join(
                '<span class="sup-cell" style="--c:%s"><span class="dot"></span>%s</span>' % (color[n], e(n))
                for n in mg['sups'])
        elif mg['tet']:
            supcell = '<span class="mg-na">—</span>'
        else:
            supcell = '<span class="mg-open">טרם שויך</span>'
        if mg['sup_note']:
            supcell += '<span class="mg-note">%s</span>' % e(mg['sup_note'])
        code   = '<span class="mg-code">%s</span>' % e(mg['code']) if mg['code'] else ''
        grades = '<span class="mg-gr">%s</span>' % e(mg['grades']) if mg['grades'] else ''
        note   = '<span class="mg-q">%s</span>' % e(mg['note']) if mg['note'] else ''
        search = ' '.join([sc['semel'], sc['name'], sc['reshet'], sc['mehoz'], sc['migzar'],
                           mg['raw'], mg['sup_raw'], sc['ped']]).lower()
        rows.append(
            '<tr class="%s" data-sc="%s" data-sup="%s" data-d="%s" data-n="%s" data-s="%s"'
            ' data-view="%s" data-t="%s">'
            '<td class="semel"><span>%s</span></td><td class="school"><span>%s</span></td>'
            '<td class="meg" title="%s"><span class="mg-name">%s</span>%s%s%s</td>'
            '<td class="supc">%s</td><td class="ped">%s</td></tr>' % (
                'grp' if i == 0 else '',
                e(sc['semel'] or sc['name']),
                e('|'.join(mg['sups'])), e(sc['mehoz']), e(sc['reshet']), e(sc['migzar']),
                'tet' if mg['tet'] else ('open' if not mg['sups'] else 'tech'),
                e(search),
                e(sc['semel']) or '—', e(sc['name']),
                e(mg['raw']), e(mg['name']), code, grades, note,
                supcell,
                e(sc['ped']) if sc['ped'] else '<span class="mg-na">פיקוח מקצועי בלבד</span>'))

chips = ['<span class="pk-sup on" data-sup="" style="--c:#0D3B66">'
         '<span class="dot"></span>כל המפקחים<span class="n">%d</span></span>' % len(all_mg)]
chips += ['<span class="pk-sup" data-sup="%s" style="--c:%s"><span class="dot"></span>%s<span class="n">%d</span></span>'
          % (e(n), color[n], e(n), count[n]) for n in order]

opt = lambda vals: ''.join('<option>%s</option>' % e(v) for v in vals)
mehozot  = sorted({s['mehoz'] for s in schools if s['mehoz']})
reshatot = sorted({s['reshet'] for s in schools if s['reshet']})
migzarim = sorted({s['migzar'] for s in schools if s['migzar']})

# ── 8. המעטפת מהעמוד הקיים ───────────────────────────────────────────────────
head = shell_src[:shell_src.index('<link rel="stylesheet" href="style.css">')]
head = head.replace('data-space="pikuah"', 'data-space="pikuah,menahalim"')
head = re.sub(r'<title>.*?</title>',
              '<title>פיקוח מקצועי · מגמות ומפקחים תשפ״ז · הבית של המנהיגות הפדגוגית היוצרת</title>',
              head)
head = re.sub(r'<meta name="description" content=".*?">',
              '<meta name="description" content="טבלת השליטה של הפיקוח המקצועי תשפ״ז — כל המגמות '
              'המתוכננות בכל מוסד ומי המפקח.ת המקצועי.ת שמלווה כל מגמה.">', head)
nav = shell_src[shell_src.index('<!-- nav:start'):
                shell_src.index('<!-- nav:end -->') + len('<!-- nav:end -->')]

STYLE = r"""<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="/toolbelt.css">
<style>
  .pk-wrap{padding:8px var(--px) 48px}
  .pk-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 14px}
  .pk-search{flex:1 1 260px;min-width:210px;border:1px solid var(--border);border-radius:999px;
    padding:10px 44px 10px 18px;font:inherit;font-size:.92rem;color:var(--text);
    background:#fff url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2352687A' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3.5-3.5'/%3E%3C/svg%3E") no-repeat right 16px center/17px;
    box-shadow:var(--sh-sm);outline:none;transition:border-color .2s var(--ease)}
  .pk-search:focus{border-color:var(--blue)}
  .pk-sel{border:1px solid var(--border);border-radius:999px;padding:10px 16px;font:inherit;font-size:.88rem;
    font-weight:600;color:var(--text2);background:#fff;box-shadow:var(--sh-sm);cursor:pointer;outline:none}
  .pk-sel:focus{border-color:var(--blue)}
  .pk-sups{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}
  .pk-sup{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);background:#fff;
    border-radius:999px;padding:6px 10px 6px 14px;font-weight:700;font-size:.86rem;color:var(--text2);
    cursor:pointer;transition:.2s var(--ease);box-shadow:var(--sh-sm)}
  .pk-sup:hover{border-color:var(--border-strong);transform:translateY(-1px)}
  .pk-sup .dot{width:10px;height:10px;border-radius:50%;background:var(--c);flex:none}
  .pk-sup .n{background:var(--soft-bg);border-radius:999px;padding:1px 9px;font-size:.78rem;color:var(--muted)}
  .pk-sup.on{background:var(--c);border-color:transparent;color:#fff}
  .pk-sup.on .dot{background:#fff}
  .pk-sup.on .n{background:rgba(255,255,255,.24);color:#fff}
  .pk-scroll{overflow-x:auto;border:1px solid var(--border);border-radius:16px;background:#fff;box-shadow:var(--sh-sm)}
  table.pk{width:100%;border-collapse:collapse;font-size:.9rem;min-width:940px}
  table.pk th{position:sticky;top:0;z-index:2;background:var(--navy);color:#fff;font-weight:600;
    text-align:right;padding:12px 14px;white-space:nowrap;font-size:.85rem}
  table.pk td{padding:10px 14px;border-bottom:1px solid #EEF3F8;vertical-align:middle}
  table.pk tbody tr:last-child td{border-bottom:0}
  table.pk tbody tr.top td{border-top:2px solid var(--border);padding-top:14px}
  table.pk tbody tr:hover{background:var(--blue-bg)}
  table.pk td.semel{font-variant-numeric:tabular-nums;color:var(--muted);font-size:.85rem;white-space:nowrap}
  table.pk td.school{font-weight:700;color:var(--navy);min-width:155px}
  td.dim>span{opacity:0}
  table.pk tbody tr:hover td.dim>span{opacity:.35}
  .mg-name{font-weight:600;color:var(--text)}
  .mg-code{display:inline-block;margin-inline-start:8px;background:var(--soft-bg);color:var(--text2);
    border-radius:999px;padding:1px 9px;font-size:.76rem;font-weight:700;font-variant-numeric:tabular-nums}
  .mg-gr{display:inline-block;margin-inline-start:8px;color:var(--muted);font-size:.78rem;white-space:nowrap}
  .mg-q{display:inline-block;margin-inline-start:8px;background:#FFF4E0;color:#8A5A00;border:1px solid #F0D6A2;
    border-radius:999px;padding:0 8px;font-size:.72rem;font-weight:700}
  .sup-cell{display:inline-flex;align-items:center;gap:8px;font-weight:700;color:var(--text);white-space:nowrap}
  .sup-cell+.sup-cell{margin-inline-start:10px}
  .sup-cell .dot{width:9px;height:9px;border-radius:50%;background:var(--c);flex:none}
  .mg-open{display:inline-block;background:#FFF1F1;color:#A32B2B;border:1px solid #F3C9C9;
    border-radius:999px;padding:1px 10px;font-size:.76rem;font-weight:700}
  .mg-na{color:#A9B6C2;font-size:.85rem}
  .mg-note{display:block;color:var(--muted);font-size:.74rem;margin-top:3px;max-width:230px;line-height:1.4}
  td.ped{color:var(--text2);font-size:.85rem;white-space:nowrap}
  .pk-empty{padding:34px;text-align:center;color:var(--text2);font-weight:600}
  .pk-count{font-size:.86rem;color:var(--text2);font-weight:600;margin:12px 2px 0}
  .pk-count b{color:var(--navy)}
  @media (max-width:720px){ .pk-wrap{padding:8px 16px 40px} }
  @media print{ .govbar,.nav,.drawer,.scrim,.pk-bar,.pk-sups,.foot,#pagebar,.ogenw-launcher{display:none!important}
    .pk-scroll{border:0;box-shadow:none;overflow:visible}
    td.dim>span{opacity:1}
    table.pk th{background:#0D3B66!important;-webkit-print-color-adjust:exact;print-color-adjust:exact} }
</style>
<!-- pmh-allow: no-nav — העמוד הוא טבלת נתונים אחת רצופה (284 שורות מוסד–מגמה–מפקח.ת) עם סינון וחיפוש מעליה. ספירת המילים היא תאי טבלה ולא טקסט קריא, ופס ניווט פנים-עמודי לא מוסיף כאן כלום. -->
</head>
<body>
<a class="skip" href="#main">דילוג לתוכן הראשי</a>
"""

BODY = r"""
<main id="main">

<div class="pagehead">
  <div class="crumb rv"><a href="index.html">בית</a> ‹ <a href="supervision.html">מרחב פיקוח</a> ‹ פיקוח מקצועי</div>
  <div class="rv d1" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
    <h1>פיקוח מקצועי · מגמות ומפקחים</h1>
    <span class="tag" style="background:var(--navy);color:#fff;font-size:var(--fs-xs)">תשפ״ז</span>
  </div>
  <p class="rv d2 lead" style="max-width:730px">כל המגמות המתוכננות בכל מוסד, ומי המפקח.ת המקצועי.ת שמלווה כל מגמה. אפשר לחפש מוסד או מגמה, לסנן לפי מפקח.ת מקצועי.ת, מחוז, רשת ומגזר — ולראות לצד כל שורה גם את המפקח.ת הפדגוגי.ת של המוסד.</p>
</div>

<div class="grid c4 rv d2" style="padding:18px var(--px) 6px">
  <div class="card" style="padding:18px;text-align:center"><div class="num-count" data-count="{n_schools}" style="font-size:1.8rem;font-weight:800;color:var(--navy)">{n_schools}</div><div style="font-size:var(--fs-sm);color:var(--text2);font-weight:600">מוסדות בטבלה</div></div>
  <div class="card" style="padding:18px;text-align:center"><div class="num-count" data-count="{n_tech}" style="font-size:1.8rem;font-weight:800;color:var(--navy)">{n_tech}</div><div style="font-size:var(--fs-sm);color:var(--text2);font-weight:600">מגמות מתוכננות</div></div>
  <div class="card" style="padding:18px;text-align:center"><div class="num-count" data-count="{n_sups}" style="font-size:1.8rem;font-weight:800;color:var(--navy)">{n_sups}</div><div style="font-size:var(--fs-sm);color:var(--text2);font-weight:600">מפקחים מקצועיים</div></div>
  <div class="card" style="padding:18px;text-align:center"><div class="num-count" data-count="{n_open}" style="font-size:1.8rem;font-weight:800;color:var(--navy)">{n_open}</div><div style="font-size:var(--fs-sm);color:var(--text2);font-weight:600">מגמות שטרם שויכו</div></div>
</div>

<div class="pk-wrap">
  <div class="pk-sups rv" id="supBar" style="margin-top:14px">
{chips}
  </div>

  <div class="pk-bar rv d1">
    <input class="pk-search" id="q" type="search" placeholder="חיפוש מוסד, סמל מוסד, מגמה, סמל מגמה או מפקח.ת…" aria-label="חיפוש">
    <select class="pk-sel" id="fDistrict" aria-label="מחוז"><option value="">כל המחוזות</option>{mehozot}</select>
    <select class="pk-sel" id="fNet" aria-label="רשת"><option value="">כל הרשתות</option>{reshatot}</select>
    <select class="pk-sel" id="fSector" aria-label="מגזר"><option value="">כל המגזרים</option>{migzarim}</select>
    <select class="pk-sel" id="fView" aria-label="תצוגה"><option value="">כל השורות</option><option value="nottet">רק מגמות · בלי ט׳ כללית</option><option value="open">רק מגמות שטרם שויכו</option></select>
  </div>

  <div class="pk-scroll rv d1">
    <table class="pk">
      <thead><tr>
        <th>סמל מוסד</th><th>שם המוסד</th><th>מגמה מתוכננת</th>
        <th>מפקח.ת מקצועי.ת</th><th>מפקח.ת פדגוגי.ת</th>
      </tr></thead>
      <tbody id="tb">
{rows}
      </tbody>
    </table>
    <div class="pk-empty" id="empty" hidden>לא נמצאו שורות שמתאימות לסינון</div>
  </div>
  <div class="pk-count rv d2">מוצגות <b id="shown">{n_rows}</b> מתוך {n_rows} שורות · <span style="color:var(--muted)">מקור: טבלת שליטה פיקוח מקצועי, 7 בספטמבר · מינהל הכשרה מקצועית</span></div>

  <div class="notice rv d2" style="margin-top:22px">
    שם המגמה, סמל המגמה והשכבות מוצגים כפי שהם רשומים בטבלת המקור — ריחוף על שם המגמה מציג את הרישום המלא.
    שני שמות באותה שורה = ליווי משותף. שורות שמסומנות <b>פיקוח מקצועי בלבד</b> הן מוסדות משרד החינוך
    שאינם נמנים על 64 מוסדות הפיקוח הפדגוגי ·
    <a href="prisat-pikuah.html" style="color:var(--blue);font-weight:700">פריסת הפיקוח הפדגוגי</a> ·
    <a href="supervision.html" style="color:var(--blue);font-weight:700">מרחב הפיקוח</a> ·
    <a href="menahalim.html" style="color:var(--blue);font-weight:700">מרחב המנהלים</a>
  </div>
</div>

</main>

<!-- foot:start tagline="פיקוח מקצועי · תשפ״ז" -->
<div class="foot"><div class="row"><div style="display:flex;align-items:center;gap:14px"><img src="logo.png" alt="משרד העבודה" width="1200" height="420"><span>© מינהל הכשרה מקצועית</span></div><span>פיקוח מקצועי · תשפ״ז</span></div><nav class="foot-links" aria-label="קישורים משפטיים"><a href="negishut.html">הצהרת נגישות</a><a href="kesher.html">יצירת קשר</a><a href="privacy.html">מדיניות פרטיות</a><a href="about.html">מי אנחנו</a></nav><div style="text-align:center;font-size:.72rem;color:#8A97A6;padding:8px 0 2px;opacity:.9">האתר נבנה על ידי <a href="https://impact-os.app" target="_blank" rel="noopener" style="color:inherit;font-weight:600">impactos · impact-os.app</a></div></div>
<!-- foot:end -->

<script src="site.js" defer></script>
<script src="search.js" defer></script>
<script>
(function(){
  var rows=[].slice.call(document.querySelectorAll('#tb tr'));
  var q=document.getElementById('q'), shown=document.getElementById('shown'), empty=document.getElementById('empty');
  var sels={sup:'', d:'', n:'', s:'', view:''};
  var map={fDistrict:'d', fNet:'n', fSector:'s', fView:'view'};

  function apply(){
    var t=q.value.trim().toLowerCase(), c=0, prev=null;
    rows.forEach(function(tr){
      var ok = (!sels.sup  || tr.dataset.sup.split('|').indexOf(sels.sup)>-1)
            && (!sels.d    || tr.dataset.d===sels.d)
            && (!sels.n    || tr.dataset.n===sels.n)
            && (!sels.s    || tr.dataset.s===sels.s)
            && (!sels.view || (sels.view==='open' ? tr.dataset.view==='open' : tr.dataset.view!=='tet'))
            && (!t         || tr.dataset.t.indexOf(t)>-1);
      tr.hidden=!ok;
      if(!ok) return;
      c++;
      // שם המוסד וסמלו מוצגים פעם אחת לכל מוסד — נקבע מחדש לפי מה שנשאר אחרי הסינון
      var first = tr.dataset.sc!==prev;
      prev = tr.dataset.sc;
      tr.classList.toggle('top', first);
      tr.children[0].classList.toggle('dim', !first);
      tr.children[1].classList.toggle('dim', !first);
    });
    shown.textContent=c; empty.hidden=c>0;
  }

  q.addEventListener('input',apply);
  Object.keys(map).forEach(function(id){
    document.getElementById(id).addEventListener('change',function(){ sels[map[id]]=this.value; apply(); });
  });
  document.getElementById('supBar').addEventListener('click',function(ev){
    var b=ev.target.closest('.pk-sup'); if(!b) return;
    document.querySelectorAll('.pk-sup').forEach(function(x){x.classList.remove('on')});
    b.classList.add('on'); sels.sup=b.dataset.sup; apply();
  });
  apply();
})();
</script>
<script>window.OGEN_WIDGET_POSITION="left";</script>
<script src="/ogen-widget.pinned.js" defer></script>
<script src="feedback.js" defer></script>
<script src="/toolbelt.js" defer></script>
</body>
</html>
"""

body = (BODY.replace('{n_schools}', str(n_schools)).replace('{n_tech}', str(n_tech))
            .replace('{n_sups}', str(n_sups)).replace('{n_open}', str(n_open))
            .replace('{n_rows}', str(len(rows)))
            .replace('{chips}', '\n'.join('    ' + c for c in chips))
            .replace('{mehozot}', opt(mehozot)).replace('{reshatot}', opt(reshatot))
            .replace('{migzarim}', opt(migzarim))
            .replace('{rows}', '\n'.join('        ' + r for r in rows)))

io.open(OUT, 'w', encoding='utf-8', newline='\n').write(head + STYLE + nav + body)
print('נכתב:', OUT)
print('מוסדות %d · שורות %d · מגמות %d · מפקחים %d · ללא שיוך %d'
      % (n_schools, len(rows), n_tech, n_sups, n_open))
print('מפקחים:', ', '.join('%s (%d)' % (n, count[n]) for n in order))
print('בלי מפקח.ת פדגוגי.ת:', [s['name'] for s in schools if not s['ped']])
