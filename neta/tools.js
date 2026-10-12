/* נטע · כלים לרכז/ת הפדגוגי/ת (11.10.26, מיטל: "לגבי הרכזת — בא לי הכל").
   x — תצפיות בשיעור: מלאה לפי תמ"ה (מכון אבני ראשה) או קצרה; ניצה מנסחת משוב; מי טרם נצפה; התמונה הבית ספרית
   b — בחינות: לוח המבחנים (מתוך luach-mivchanim.html) + פריסת ההיבחנות של בית הספר (מתוך data/sheelonim.json), נשמרת
   y — לוח שנה פדגוגי: יומני האתר (רכזים פדגוגיים, מבחנים, חגים, ארצי) + הרשמה ליומן
   ישיבת צוות (h) — ב-/tzohar/tools.js. השרת: keren-gas/כלים.js (docs/docSave/docDel, obsFeedback). */
(function () {
  var T = window.TZOHAR;
  if (!T) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function on() { return !!(window.KEREN && KEREN.enabled()); }
  function api(body, ms) { return on() ? KEREN.call(body, ms || 90000) : Promise.reject(new Error('off')); }
  var ERR = { badsession: 'פג הזמן של הכניסה. רענון הדף יבקש כניסה מחדש.', timeout: 'לקח יותר מדי זמן. נסו שוב בעוד רגע.', notyours: 'אין הרשאה למסמך הזה.', toolong: 'המסמך ארוך מדי לשמירה.' };
  function errText(e) { return ERR[e] || 'משהו השתבש. נסו שוב בעוד רגע.'; }
  function isMobile() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (window.matchMedia && matchMedia('(pointer:coarse)').matches && innerWidth < 900); }
  var UA = navigator.userAgent || '', IS_APPLE = /iPhone|iPad|iPod|Macintosh/.test(UA);
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function todayIso() { return iso(new Date()); }
  function heDate(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (+m[3]) + '.' + (+m[2]) + '.' + m[1] : ''; }
  var MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function norm(s) { return String(s || '').replace(/["״׳'`]/g, '').replace(/[-–־]/g, ' ').replace(/\s+/g, ' ').trim(); }

  var IC = {
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    exam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>'
  };

  function copyHtml(html, text) {
    var ok = false;
    function onCopy(ev) { ev.clipboardData.setData('text/html', html); ev.clipboardData.setData('text/plain', text); ev.preventDefault(); }
    document.addEventListener('copy', onCopy);
    try {
      var d = document.createElement('div'); d.contentEditable = 'true'; d.innerHTML = html; d.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(d);
      var r = document.createRange(); r.selectNodeContents(d); var s = getSelection(); s.removeAllRanges(); s.addRange(r);
      ok = document.execCommand('copy'); s.removeAllRanges(); document.body.removeChild(d);
    } catch (e) { ok = false; }
    document.removeEventListener('copy', onCopy);
    return ok;
  }
  function rtlWrap(html) { return '<div dir="rtl" style="direction:rtl;text-align:right;font-family:Arial,sans-serif;font-size:15px;line-height:1.6">' + html + '</div>'; }
  function printHtml(title, body) {
    var w = window.open('', '_blank');
    if (!w) { T.toast('הדפדפן חסם חלון חדש. אפשר להעתיק ולהדביק במסמך.'); return; }
    w.document.write('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<style>body{font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111;max-width:820px;margin:28px auto;padding:0 18px}h1{font-size:20px}h2{font-size:16px;margin:18px 0 6px}' +
      'table{border-collapse:collapse;width:100%;margin:6px 0}td,th{border:1px solid #bbb;padding:4px 7px;text-align:right;vertical-align:top}th{background:#f2f2f2}.src{color:#666;font-size:12px}</style></head><body>' + body +
      '<script>setTimeout(function(){print()},250)<\/script></body></html>');
    w.document.close();
  }

  /* ===== מסמכים בשרת (משותף ל-x ו-b) ===== */
  var DOCS = {}, DST = {};
  function loadDocs(kind) {
    if (DST[kind] === 'ok' || DST[kind] === 'load') return;
    DST[kind] = 'load';
    api({ action: 'docs', kind: kind }, 60000).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.error);
      DOCS[kind] = r.docs || []; DST[kind] = 'ok';
    }).catch(function () { DOCS[kind] = DOCS[kind] || []; DST[kind] = 'err'; }).then(redraw);
  }
  function saveNew(kind, doc) {
    return api({ action: 'docSave', kind: kind, doc: doc }, 60000).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.error);
      DOCS[kind] = [r.doc].concat(DOCS[kind] || []);
      return r.doc;
    });
  }
  function saveOld(d) {
    return api({ action: 'docSave', id: d.id, doc: d.doc }, 60000).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.error);
      d.updated = r.updated || d.updated; d.title = d.doc.title || d.title;
      return d;
    });
  }

  /* ===================== x — תצפיות בשיעור ===================== */
  /* חלק א' וחלק ב' — הנוסח מתוך "תמ"ה: כלי למיפוי תמונת מצב בית ספרית" (מכון אבני ראשה). לא לשנות בלי לבדוק מול המקור. */
  var TAMA_SRC = 'https://avneyrosha.org.il/wp-content/uploads/2024/09/resources-Tama.pdf';
  var TAMA_A = [
    ['השיעור מתחיל בזמן', 'אם לא — לציין איחור בדקות'],
    ['השיעור מסתיים בזמן', 'אם לא — לציין שחרור מוקדם בדקות'],
    ['השיעור נפתח בסיכום הנלמד בשיעורים קודמים', ''],
    ['רוב זמן השיעור מנוצל להוראה וללמידה', ''],
    ['השיעור כולל מטלות ללמידה עצמית', ''],
    ['השיעור כולל מטלות ללמידה בקבוצות', '']
  ];
  var TAMA_B = [
    ['כמות השאלות שהמורה שואל/ת בשיעור', ''],
    ['השאלות שהמורה שואל/ת הן פתוחות ו/או מעוררות חשיבה', 'שאלות פתוחות: שאלות שלהן יותר מתשובה אחת אפשרית ושהתשובה עליהן אינה ידועה מראש לתלמידים.'],
    ['המורה מעניק/ה זמן שהייה ניכר לקבלת תשובות מתלמידים', ''],
    ['מתקיים שיח לימודי בין תלמידים', ''],
    ['המורה נותן/ת משוב לתשובות או מטלות תלמידים', ''],
    ['משובי המורה הם שיפוטיים', 'משוב שיפוטי: המורה מחווה דעה, חיובית או שלילית, על איכות תשובת התלמיד ("טוב", "יפה", "נכון", "לא נכון", "לא הקשבת", "התבלבלת" וכד׳).'],
    ['רוב התלמידים משתתפים בשיח הלמידה', ''],
    ['המורה מעביר/ה את חומר הלימוד בהרצאה', ''],
    ['מתקיים "פינג־פונג" של שאלות ותשובות בין המורה לתלמידים', '"פינג־פונג": המורה שואל, תלמיד עונה, מקבל משוב, וחוזר חלילה.'],
    ['המורה מסביר/ה באופן בהיר את ציפיותיו/ה מלמידת התלמידים', ''],
    ['המורה מדרבן/ת את התלמידים ללמידה ולהצלחה לימודית', ''],
    ['מטלות הלמידה משלבות חשיבה מסדר גבוה', 'חשיבה מסדר גבוה: פעילויות לטיפוח מיומנויות חשיבה כגון השוואה, מיון, הסבר, הסקת מסקנות, טעינת טיעון, זיהוי עיקר וטפל.'],
    ['התלמידים מציגים תוצרי למידה', ''],
    ['המורה מדגים/ה כיצד לבצע מיומנויות חשיבה מסדר גבוה', 'המורה מבצע/ת את מיומנות החשיבה בפני התלמידים ומסביר/ה כיצד ביצע/ה אותה.']
  ];
  var SCALE = ['במידה מועטה או בכלל לא', 'במידה בינונית', 'במידה רבה', 'במידה רבה מאוד'];
  var XV = 'list', XO = null, XID = '', XBUSY = false;   /* list | form | view */
  /* טיוטת תצפית במכשיר — כל הקלדה נשמרת; מעבר עמוד, תשובה מאוחרת מהשרת או סגירת הדף לא מוחקים (סקירה 12.10.26).
     נמחקת בשמירה, ב"יציאה בלי לשמור" וביציאה מהחשבון */
  function XDK() { var s = T.school(); return 'neta.obsdraft.' + (s ? s.semel : ''); }
  function draftGet() { try { return JSON.parse(localStorage.getItem(XDK()) || 'null'); } catch (e) { return null; } }
  function draftPut() { try { if (XO) localStorage.setItem(XDK(), JSON.stringify({ id: XID, o: XO, t: Date.now() })); else localStorage.removeItem(XDK()); } catch (e) {} }
  function roster() { var r = (DOCS.roster || [])[0]; return r && r.doc && r.doc.names ? r.doc.names : []; }
  function obsList() { return (DOCS.obs || []).filter(function (d) { return d.doc; }); }
  function newObs(mode) {
    return { mode: mode, title: '', teacher: '', date: todayIso(), kita: '', subject: '', start: '', end: '',
             a: TAMA_A.map(function () { return { v: '', n: '' }; }), aOwn: { t: '', v: '', n: '' },
             b: TAMA_B.map(function () { return { v: '', n: '' }; }), bOwn: { t: '', v: '', n: '' },
             seen: '', strengths: '', grow: '', feedback: null };
  }
  function pageX() {
    var head = '<div class="card head"><h1>תצפיות בשיעור</h1><div class="meta">תצפית מלאה לפי כלי תמ"ה, או תצפית קצרה לביקור מהיר. ' +
      'מטרת התצפית היא קודם כול תמונת מצב בית ספרית; משוב למורה — על בסיס אמון, ובידיעת המורה.</div></div>';
    if (XV === 'form' && XO) return head + '<p class="tt-note">הטיוטה נשמרת במכשיר בזמן ההקלדה — אפשר לעבור עמוד ולחזור. נשמרת בנטע רק בלחיצה על "שמירה".</p>' + obsForm(XO);
    if (XV === 'view') { var d = (DOCS.obs || []).filter(function (x) { return x.id === XID; })[0]; if (d) return head + obsView(d); }
    var L = obsList(), names = roster();
    var seenSet = {}; L.forEach(function (d) { seenSet[norm(d.doc.teacher)] = 1; });
    var notYet = names.filter(function (n) { return !seenSet[norm(n)]; });
    var tama = L.filter(function (d) { return d.doc.mode === 'tama'; });
    var dr = draftGet();
    return head + (dr && dr.o ? '<div class="tt-note">יש תצפית שלא נשמרה' + (dr.o.teacher ? ' (' + esc(dr.o.teacher) + ')' : '') + '. ' +
        '<button type="button" class="btn sm primary" data-xt="draft">להמשיך</button> <button type="button" class="btn sm" data-xt="draftdel">למחוק את הטיוטה</button></div>' : '') +
      '<div class="card"><div class="acts"><button type="button" class="btn primary" data-xt="new" data-mode="tama">' + IC.eye + 'תצפית מלאה (תמ"ה)</button>' +
      '<button type="button" class="btn" data-xt="new" data-mode="short">תצפית קצרה</button></div>' +
      '<p class="small" style="margin:10px 0 0">כלי תמ"ה — "כלי למיפוי תמונת מצב בית ספרית של תהליכי הוראה ולמידה", <a href="' + TAMA_SRC + '" target="_blank" rel="noopener">מכון אבני ראשה</a>.</p></div>' +
      '<h2 class="pt">מי טרם נצפה</h2><div class="card">' +
      (DST.roster === 'load' ? '<div class="empty">טוען…</div>' :
        (names.length ? '<p class="small">' + (names.length - notYet.length) + ' מתוך ' + names.length + ' מורים נצפו' + (notYet.length ? '' : ' — כולם') + '.</p>' +
          (notYet.length ? '<div class="chips">' + notYet.map(function (n) { return '<span class="chip soft">' + esc(n) + '</span>'; }).join('') + '</div>' +
            '<div class="acts" style="margin-top:8px"><button type="button" class="btn sm" data-xt="copyNot">' + IC.copy + 'העתקת הרשימה</button></div>' : '')
          : '<p class="small">עוד אין רשימת מורים. מדביקים אותה פעם אחת — שם בכל שורה (אפשר להעתיק מ"המורים שלי" במבט של בית הספר במנור).</p>') +
        '<details class="tt-roster"' + (names.length ? '' : ' open') + '><summary>רשימת המורים (' + names.length + ')</summary>' +
        '<textarea class="fld" id="xRoster" rows="6" placeholder="שם מלא בכל שורה">' + esc(names.join('\n')) + '</textarea>' +
        '<div class="acts" style="margin-top:8px"><button type="button" class="btn sm" data-xt="roster">שמירת הרשימה</button></div></details>') + '</div>' +
      (tama.length ? '<h2 class="pt">' + (tama.length < PIC_MIN ? 'ממצאים ראשוניים' : 'התמונה הבית ספרית') + '</h2>' + picture(tama) : '') +
      '<h2 class="pt">התצפיות</h2><div class="card">' +
      (DST.obs === 'load' && !L.length ? '<div class="empty">טוען…</div>' : !L.length ? '<div class="empty">עוד לא נשמרה תצפית.</div>' :
        '<ul class="tt-docs">' + L.map(function (d) {
          return '<li><button type="button" class="tt-doc" data-xt="open" data-id="' + esc(d.id) + '"><b>' + esc(d.doc.teacher || 'ללא שם') + ' · ' + esc(heDate(d.doc.date)) + '</b>' +
            '<small>' + (d.doc.mode === 'tama' ? 'תמ"ה' : 'קצרה') + (d.doc.subject ? ' · ' + esc(d.doc.subject) : '') + (d.doc.kita ? ' · ' + esc(d.doc.kita) : '') +
            (d.doc.feedback ? ' · יש משוב' : '') + (d.mine ? '' : ' · של ' + (d.role === 'principal' ? 'המנהל/ת' : 'הרכז/ת')) + '</small></button></li>';
        }).join('') + '</ul>') + '</div>';
  }
  /* התמונה הבית ספרית — כמו "טבלה משוקללת" בתמ"ה: חלק א' באחוזי "כן", חלק ב' בהתפלגות לפי ארבע הדרגות */
  /* 12.10.26 (סקירה): מעט תצפיות = "ממצאים ראשוניים", לא תמונה של בית הספר; "לא נמדד" במקום מקף */
  var PIC_MIN = 5;
  function picture(list) {
    var n = list.length;
    var h = '<div class="card">' + (n < PIC_MIN ? '<p class="tt-note"><b>רק ' + (n === 1 ? 'תצפית אחת' : n + ' תצפיות') + ' — ממצאים ראשוניים.</b> עוד לא תמונה של בית הספר, וכדאי לא להסיק מהם מסקנות. מ-' + PIC_MIN + ' תצפיות, במקצועות ובכיתות שונים, התמונה מתחילה לייצג.</p>'
      : '<p class="small"><b>מתוך ' + n + ' תצפיות תמ"ה.</b> ככל שיש יותר תצפיות, במקצועות ובכיתות שונים — התמונה מייצגת יותר.</p>');
    h += '<h3 class="tt-h3">חלק א׳ · כמה שיעורים</h3><ul class="pic">' + TAMA_A.map(function (it, i) {
      var yes = list.filter(function (d) { return (d.doc.a[i] || {}).v === 'כן'; }).length, ans = list.filter(function (d) { return (d.doc.a[i] || {}).v; }).length;
      var pc = ans ? Math.round(100 * yes / ans) : 0;
      return '<li><span class="t">' + esc(it[0]) + '</span><span class="bar"><i style="width:' + pc + '%"></i></span><b>' + (ans ? pc + '%' : '<small>לא נמדד</small>') + '</b></li>';
    }).join('') + '</ul>';
    h += '<h3 class="tt-h3">חלק ב׳ · באיזו מידה</h3><div class="pic-leg">' + SCALE.map(function (s, k) { return '<span><i class="lv' + k + '"></i>' + esc(s) + '</span>'; }).join('') + '</div><ul class="pic b">' +
      TAMA_B.map(function (it, i) {
        var c = [0, 0, 0, 0], ans = 0;
        list.forEach(function (d) { var v = SCALE.indexOf((d.doc.b[i] || {}).v); if (v > -1) { c[v]++; ans++; } });
        return '<li><span class="t">' + esc(it[0]) + '</span><span class="stack">' + (ans ? c.map(function (x, k) {
          return x ? '<i class="lv' + k + '" style="flex-grow:' + x + '" title="' + esc(SCALE[k]) + ': ' + x + '"></i>' : '';
        }).join('') : '<i class="none"></i>') + '</span><b>' + ans + '</b></li>';
      }).join('') + '</ul></div>';
    return h;
  }
  function obsForm(o) {
    var names = roster(), tama = o.mode === 'tama';
    var h = '<div class="card"><button type="button" class="back" data-xt="back">→ לכל התצפיות</button>' +
      '<h2 class="tt-h">' + (tama ? 'תצפית מלאה · תמ"ה' : 'תצפית קצרה') + '</h2>' +
      '<div class="tt-form"><label class="small">המורה<input class="fld" data-xf="teacher" list="xNames" value="' + esc(o.teacher) + '"></label>' +
      '<datalist id="xNames">' + names.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      '<label class="small">תאריך<input class="fld" type="date" data-xf="date" value="' + esc(o.date) + '"></label>' +
      '<label class="small">כיתה<input class="fld" data-xf="kita" value="' + esc(o.kita) + '"></label>' +
      '<label class="small">מקצוע<input class="fld" data-xf="subject" value="' + esc(o.subject) + '"></label>' +
      (tama ? '<label class="small">שעת התחלה בפועל<input class="fld" type="time" data-xf="start" value="' + esc(o.start) + '"></label>' +
              '<label class="small">שעת הסיום בפועל<input class="fld" type="time" data-xf="end" value="' + esc(o.end) + '"></label>' : '') + '</div>';
    if (tama) {
      h += '<p class="small" style="margin-top:12px">טבלת התצפית נועדה לקבלת אומדן בקירוב. במהלך הצפייה רושמים הערות, עדויות ודוגמאות, וממלאים את הטבלה בשלמותה מיד בתום השיעור.</p>' +
        '<h3 class="tt-h3">חלק א׳ · פרטים ומאפיינים כלליים</h3><ol class="obs-a">' + TAMA_A.map(function (it, i) { return rowA('a', i, it[0], it[1], o.a[i]); }).join('') +
        '<li class="own"><input class="fld sm" data-xo="aOwn.t" placeholder="בחירה שלך: מאפיין נוסף (לא חובה)" value="' + esc(o.aOwn.t) + '">' + yesNo('aOwn', -1, o.aOwn.v) + '</li></ol>' +
        '<h3 class="tt-h3">חלק ב׳ · מאפייני השיעור</h3><ol class="obs-b">' + TAMA_B.map(function (it, i) { return rowB(i, it[0], it[1], o.b[i]); }).join('') +
        '<li class="own"><input class="fld sm" data-xo="bOwn.t" placeholder="בחירה שלך: מרכיב נוסף (לא חובה)" value="' + esc(o.bOwn.t) + '">' + scale('bOwn', -1, o.bOwn.v) + '</li></ol>';
    } else {
      h += '<label class="small" style="display:block;margin-top:10px">מה ראיתי<textarea class="fld" data-xf="seen" rows="4">' + esc(o.seen) + '</textarea></label>' +
        '<label class="small" style="display:block">חוזקות<textarea class="fld" data-xf="strengths" rows="3">' + esc(o.strengths) + '</textarea></label>' +
        '<label class="small" style="display:block">נקודות לצמיחה<textarea class="fld" data-xf="grow" rows="3">' + esc(o.grow) + '</textarea></label>';
    }
    return h + '<p class="small">בלי שמות תלמידים. התצפית נשמרת לבית הספר — את/ה והמנהל/ת רואים אותה.</p>' +
      '<div class="acts"><button type="button" class="btn primary" data-xt="save"' + (XBUSY ? ' disabled' : '') + '>' + (XBUSY ? 'שומר…' : 'שמירת התצפית') + '</button></div></div>';
  }
  function yesNo(part, i, v) {
    return '<span class="yn" role="radiogroup"' + (i > -1 ? ' aria-labelledby="q' + part + i + '"' : ' aria-label="המאפיין שבחרת"') + '>' + ['כן', 'לא'].map(function (x) {
      return '<label><input type="radio" name="' + part + i + '" data-xr="' + part + '" data-i="' + i + '" value="' + x + '"' + (v === x ? ' checked' : '') + '>' + x + '</label>';
    }).join('') + '</span>';
  }
  function scale(part, i, v) {
    return '<span class="sc" role="radiogroup"' + (i > -1 ? ' aria-labelledby="q' + part + i + '"' : ' aria-label="המרכיב שבחרת"') + '>' + SCALE.map(function (x, k) {
      return '<label title="' + esc(x) + '"><input type="radio" name="' + part + i + '" data-xr="' + part + '" data-i="' + i + '" value="' + esc(x) + '"' + (v === x ? ' checked' : '') + '><span>' + esc(x.replace('במידה ', '')) + '</span></label>';
    }).join('') + '</span>';
  }
  function rowA(part, i, t, hint, cur) {
    return '<li><div class="q"><b id="q' + part + i + '">' + esc(t) + '</b>' + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</div>' + yesNo(part, i, cur.v) +
      '<input class="fld sm" data-xn="a" data-i="' + i + '" placeholder="הערות ודוגמאות" value="' + esc(cur.n) + '"></li>';
  }
  function rowB(i, t, hint, cur) {
    return '<li><div class="q"><b id="qb' + i + '">' + esc(t) + '</b>' + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</div>' + scale('b', i, cur.v) +
      '<input class="fld sm" data-xn="b" data-i="' + i + '" placeholder="הערות ודוגמאות" value="' + esc(cur.n) + '"></li>';
  }
  function obsText(o) {
    var L = [o.teacher + ' · ' + heDate(o.date) + (o.subject ? ' · ' + o.subject : '') + (o.kita ? ' · ' + o.kita : '')];
    if (o.mode === 'tama') {
      L.push('', 'חלק א׳');
      TAMA_A.forEach(function (it, i) { if (o.a[i].v || o.a[i].n) L.push('• ' + it[0] + ': ' + (o.a[i].v || '—') + (o.a[i].n ? ' (' + o.a[i].n + ')' : '')); });
      if (o.aOwn.t) L.push('• ' + o.aOwn.t + ': ' + (o.aOwn.v || '—'));
      L.push('', 'חלק ב׳');
      TAMA_B.forEach(function (it, i) { if (o.b[i].v || o.b[i].n) L.push('• ' + it[0] + ': ' + (o.b[i].v || '—') + (o.b[i].n ? ' (' + o.b[i].n + ')' : '')); });
      if (o.bOwn.t) L.push('• ' + o.bOwn.t + ': ' + (o.bOwn.v || '—'));
    } else {
      if (o.seen) L.push('', 'מה ראיתי: ' + o.seen);
      if (o.strengths) L.push('חוזקות: ' + o.strengths);
      if (o.grow) L.push('נקודות לצמיחה: ' + o.grow);
    }
    return L.join('\n');
  }
  function fbText(f) {
    return f.opening + '\n\n' + (f.strengths || []).map(function (x) { return '• ' + x; }).join('\n') + '\n\n' + (f.grow || []).map(function (x) { return '• ' + x; }).join('\n') + '\n\n' + f.next + '\n\n' + f.closing;
  }
  function fbHtml(f) {
    return '<p>' + esc(f.opening) + '</p><p><b>מה ראיתי שעובד</b></p><ul>' + (f.strengths || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      '<p><b>כיווני צמיחה</b></p><ul>' + (f.grow || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><p>' + esc(f.next) + '</p><p>' + esc(f.closing) + '</p>';
  }
  function obsView(d) {
    var o = d.doc, f = o.feedback;
    var sub = 'משוב מהתצפית · ' + heDate(o.date);
    var h = '<div class="card"><button type="button" class="back" data-xt="back">→ לכל התצפיות</button>' +
      '<h2 class="tt-h">' + esc(o.teacher) + ' · ' + esc(heDate(o.date)) + '</h2><p class="small">' + (o.mode === 'tama' ? 'תצפית מלאה (תמ"ה)' : 'תצפית קצרה') +
      (o.subject ? ' · ' + esc(o.subject) : '') + (o.kita ? ' · ' + esc(o.kita) : '') + '</p>' +
      '<div class="pre note">' + esc(obsText(o)) + '</div>' +
      '<div class="acts" style="margin-top:10px">' + (d.mine ? '<button type="button" class="btn" data-xt="edit">עריכה</button>' : '') +
      '<button type="button" class="btn" data-xt="print">' + IC.print + 'הדפסה</button>' + (d.mine ? '<button type="button" class="btn" data-xt="del">מחיקה</button>' : '') + '</div></div>';
    h += '<h2 class="pt">משוב למורה</h2><div class="card">';
    if (!f) h += on() && d.mine ? '<p class="small">ניצה מנסחת משוב מתוך התצפית: חוזקות, כיווני צמיחה וצעד משותף. עורכים לפני שמשתפים.</p>' +
      /* 12.10.26 (סקירת קודקס): שם המורה מוסר לפני השליחה — אבל ההערות החופשיות נשלחות כמו שהן */
      '<p class="tt-note">שם המורה לא נשלח לניצה. <b>מה שכתוב בהערות נשלח כמו שהוא</b> — אם כתבת שם של מורה או תלמיד/ה, כדאי לערוך ולמחוק לפני שמבקשים משוב.</p>' +
      '<button type="button" class="btn primary" data-xt="fb"' + (XBUSY ? ' disabled' : '') + '>' + IC.spark + (XBUSY ? 'ניצה כותבת…' : 'ניצה, נסחי משוב') + '</button>' : '<div class="empty">עוד אין משוב.</div>';
    else {
      var text = fbText(f), href = 'mailto:?subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(text);
      h += '<div class="tt-letter">' + fbHtml(f) + '</div>' +
        '<div class="acts" style="margin-top:10px"><button type="button" class="btn" data-xt="fbcopy">' + IC.copy + 'העתקה</button>' +
        (isMobile() ? '<a class="btn" href="' + esc(href) + '">' + T.icon('mail') + 'במייל</a>' : '<button type="button" class="btn" data-xt="fbgmail" data-sub="' + esc(sub) + '">' + T.icon('mail') + 'טיוטה ב-Gmail</button>') +
        (d.mine && on() ? '<button type="button" class="btn sm" data-xt="fb">ניסוח מחדש</button>' : '') + '</div>';
    }
    return h + '</div>';
  }

  /* ===================== b — בחינות ===================== */
  var EXAMS = null, EST = '', SH = null, SST = '', BV = 'luach', BCORE = false;
  function loadExams() {
    if (EST) return; EST = 'load';
    fetch('/luach-mivchanim.html', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (h) {
      var d = new DOMParser().parseFromString(h, 'text/html');
      EXAMS = [].map.call(d.querySelectorAll('.ex'), function (el) {
        var spans = el.querySelectorAll('.exm span'), when = '', mm, dt = '';
        [].forEach.call(spans, function (s) { if (/\d{4}/.test(s.textContent)) when = s.textContent.trim(); });
        mm = when.match(/(\d{1,2}) ב?([א-ת]+) (\d{4})/);
        if (mm) { var mi = MONTHS.indexOf(mm[2]); if (mi > -1) dt = mm[3] + '-' + ('0' + (mi + 1)).slice(-2) + '-' + ('0' + mm[1]).slice(-2); }
        return { date: dt, when: when, subject: (el.querySelector('h2') || {}).textContent || '', moed: el.getAttribute('data-moed') || '', core: el.getAttribute('data-core') === '1' };
      }).filter(function (x) { return x.date; }).sort(function (a, b) { return a.date.localeCompare(b.date); });
      EST = 'ok';
    }).catch(function () { EST = 'err'; }).then(redraw);
  }
  function loadSheelonim() {
    if (SST) return; SST = 'load';
    fetch('/data/sheelonim.json').then(function (r) { return r.json(); }).then(function (j) { SH = j; SST = 'ok'; }).catch(function () { SST = 'err'; }).then(redraw);
  }
  function feedLinks(id, label) {
    var web = 'webcal://pedagogiamh.co.il/cal/' + id + '.ics', g = 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(web);
    return '<a class="btn sm" href="' + esc(IS_APPLE ? web : g) + '" target="_blank" rel="noopener">' + IC.cal + esc(label) + '</a>';
  }
  function pageB() {
    var h = '<div class="card head"><h1>בחינות</h1><div class="meta">לוח המבחנים הארצי, ופריסת ההיבחנות של בית הספר — אילו שאלונים בכל שכבה ובאיזה מועד.</div></div>' +
      '<div class="tabs2" role="tablist"><button type="button" role="tab" data-bt="luach" aria-selected="' + (BV === 'luach') + '">לוח המבחנים</button>' +
      '<button type="button" role="tab" data-bt="prisa" aria-selected="' + (BV === 'prisa') + '">פריסת ההיבחנות שלנו</button></div>';
    return h + (BV === 'luach' ? luach() : prisa());
  }
  function luach() {
    if (EST !== 'ok') return '<div class="card"><div class="empty">' + (EST === 'err' ? 'הלוח לא נטען. רענון הדף ינסה שוב.' : 'טוען…') + '</div></div>';
    var t = todayIso(), in14 = iso(new Date(Date.now() + 14 * 864e5));
    var up = EXAMS.filter(function (e) { return e.date >= t && (!BCORE || e.core); }), soon = up.filter(function (e) { return e.date <= in14; });
    function row(e) {
      var d = new Date(e.date + 'T12:00:00');
      return '<li><span class="dd"><b>' + d.getDate() + '</b>' + MONTHS[d.getMonth()].slice(0, 3) + '</span><span><b>' + esc(e.subject) + '</b><small>יום ' + DAYS[d.getDay()] + ' · ' + esc(e.moed) + (e.core ? ' · ליבה' : '') + '</small></span></li>';
    }
    var byM = {}, order = [];
    up.forEach(function (e) { var k = e.date.slice(0, 7); if (!byM[k]) { byM[k] = []; order.push(k); } byM[k].push(e); });
    return '<div class="card"><p class="eyebrow">' + IC.exam + 'בשבועיים הקרובים</p>' + (soon.length ? '<ul class="exl">' + soon.map(row).join('') + '</ul>' : '<div class="empty">אין בחינות בשבועיים הקרובים.</div>') +
      '<div class="acts" style="margin-top:10px">' + feedLinks('exam', 'כל הלוח ביומן שלי') + '<a class="btn sm" href="/luach-mivchanim.html" target="_blank" rel="noopener">הלוח המלא באתר</a></div>' +
      '<p class="small" style="margin-top:6px">ההרשמה ליומן מתעדכנת לבד כשמועד משתנה. בלוח מופיעים מקצועות הליבה ומקצועות נוספים; בחינות המגמות — בפריסת ההיבחנות.</p></div>' +
      '<div class="card"><div class="acts" style="justify-content:space-between"><p class="eyebrow" style="margin:0">' + IC.cal + 'כל הבחינות הקרובות (' + up.length + ')</p>' +
      '<label class="small"><input type="checkbox" data-bcore' + (BCORE ? ' checked' : '') + '> רק מקצועות ליבה</label></div>' +
      order.map(function (k) { var p = k.split('-'); return '<h3 class="tt-h3">' + MONTHS[+p[1] - 1] + ' ' + p[0] + '</h3><ul class="exl">' + byM[k].map(row).join('') + '</ul>'; }).join('') + '</div>';
  }
  /* פריסת ההיבחנות: לכל מקצוע/מגמה — השאלונים מתוך חוברת השאלונים (data/sheelonim.json), ולכל שאלון שכבה ומועד */
  var GR = ['', 'י׳', 'י״א', 'י״ב'], MO = ['', 'חורף', 'קיץ'];
  var PR = null;   /* { id?, doc: { title, subjects: [{ name, rows: { code: { g, m } } }] } } */
  function prisaDoc() {
    if (PR) return PR;
    var d = (DOCS.prisa || []).filter(function (x) { return x.mine; })[0] || (DOCS.prisa || [])[0];
    PR = d ? { id: d.id, mine: d.mine, doc: JSON.parse(JSON.stringify(d.doc)) } : { id: '', mine: true, doc: { title: 'פריסת ההיבחנות', subjects: [] } };
    if (!PR.doc.subjects.length) {   /* הצעה ראשונה: המגמות של בית הספר שיש להן שאלונים בחוברת */
      (T.snap().megamot || []).forEach(function (m) { var n = matchSubject(String(m).replace(/\s*\(.*\)\s*$/, '')); if (n && !PR.doc.subjects.some(function (s) { return s.name === n; })) PR.doc.subjects.push({ name: n, rows: {} }); });
    }
    return PR;
  }
  function subjects() { var o = {}, L = []; (SH || []).forEach(function (r) { if (r[0] && !o[r[0]]) { o[r[0]] = 1; L.push(r[0]); } }); return L; }
  function matchSubject(name) {
    var n = norm(name); if (!n) return '';
    var L = subjects(), exact = L.filter(function (s) { return norm(s) === n; })[0];
    return exact || L.filter(function (s) { return norm(s).indexOf(n) > -1 || n.indexOf(norm(s)) > -1; })[0] || '';
  }
  function papers(sub) {   /* שאלונים (שורות עם מספר שאלון) של מקצוע */
    return (SH || []).filter(function (r) { return r[0] === sub && r[5]; }).map(function (r) { return { code: r[5], name: r[1], units: r[2], how: r[6], ext: r[7], w: r[9] }; });
  }
  function prisa() {
    if (SST !== 'ok' || DST.prisa === 'load') return '<div class="card"><div class="empty">' + (SST === 'err' ? 'חוברת השאלונים לא נטענה.' : 'טוען…') + '</div></div>';
    var P = prisaDoc(), ed = P.mine;
    var h = '<div class="card"><p class="small">לכל מקצוע ומגמה — השאלונים מחוברת השאלונים. בוחרים לכל שאלון שכבה ומועד, ושומרים. ' +
      (P.id ? '' : 'הוספנו את המגמות של בית הספר שמצאנו בחוברת; אפשר להוסיף ולהסיר.') + '</p>' +
      (ed ? '<div class="tt-row"><input class="fld" list="bSubs" id="bAdd" placeholder="הוספת מקצוע או מגמה…" style="flex:1"><datalist id="bSubs">' + subjects().map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist>' +
        '<button type="button" class="btn" data-bt2="add">הוספה</button></div>' : '') + '</div>';
    P.doc.subjects.forEach(function (s, si) {
      var rows = papers(s.name);
      h += '<div class="card"><div class="acts" style="justify-content:space-between"><h3 class="tt-h3" style="margin:0">' + esc(s.name) + '</h3>' +
        (ed ? '<button type="button" class="btn sm" data-bt2="rm" data-si="' + si + '">הסרה</button>' : '') + '</div>' +
        (rows.length ? '<div class="tbl"><table class="pr"><thead><tr><th>שאלון</th><th>שם</th><th>אופן</th><th>שכבה</th><th>מועד</th></tr></thead><tbody>' + rows.map(function (r) {
          var v = s.rows[r.code] || {};
          /* 12.10.26 (סקירה): data-l = כותרת העמודה, לתצוגת כרטיס בנייד; לכל בחירה שם נגיש */
          return '<tr><td data-l="שאלון" dir="ltr">' + esc(r.code) + '</td><td data-l="שם">' + esc(r.name) + (r.units ? ' <small>(' + esc(String(r.units).replace('/', '')) + ' יח"ל)</small>' : '') + '</td><td data-l="אופן"><small>' + esc(r.how || r.ext) + (r.w ? ' · ' + Math.round(r.w * 100) + '%' : '') + '</small></td>' +
            '<td data-l="שכבה">' + sel('g', si, r.code, GR, v.g, ed, 'שכבה · ' + r.code + ' ' + r.name) + '</td><td data-l="מועד">' + sel('m', si, r.code, MO, v.m, ed, 'מועד · ' + r.code + ' ' + r.name) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty">לא נמצאו שאלונים למקצוע הזה בחוברת.</div>') + '</div>';
    });
    var any = P.doc.subjects.some(function (s) { return Object.keys(s.rows).some(function (k) { return s.rows[k].g; }); });
    return h + '<div class="acts">' + (ed ? '<button type="button" class="btn primary" data-bt2="save"' + (XBUSY ? ' disabled' : '') + '>' + (XBUSY ? 'שומר…' : 'שמירת הפריסה') + '</button>' : '') +
      (any ? '<button type="button" class="btn" data-bt2="print">' + IC.print + 'הדפסה לפי שכבות</button>' : '') + '</div>' +
      /* שינויים שלא נשמרו — פס קבוע בתחתית המסך עם כפתור שמירה, גם כשהרשימה ארוכה (סקירה 12.10.26) */
      (ed ? '<div class="pr-dirty" id="prDirty"' + (PDIRTY ? '' : ' hidden') + ' role="status"><span>יש שינויים שלא נשמרו</span>' +
        '<button type="button" class="btn primary sm" data-bt2="save"' + (XBUSY ? ' disabled' : '') + '>' + (XBUSY ? 'שומר…' : 'שמירה') + '</button></div>' : '');
  }
  var PDIRTY = false;
  window.addEventListener('beforeunload', function (e) { if (PDIRTY) { e.preventDefault(); e.returnValue = ''; } });
  function sel(k, si, code, opts, v, ed, label) {
    return '<select class="fld sm" data-ps="' + k + '" data-si="' + si + '" data-code="' + esc(code) + '" aria-label="' + esc(label || '') + '"' + (ed ? '' : ' disabled') + '>' +
      opts.map(function (o) { return '<option value="' + esc(o) + '"' + ((v || '') === o ? ' selected' : '') + '>' + (o || '—') + '</option>'; }).join('') + '</select>';
  }
  function prisaPrint() {
    var P = prisaDoc(), h = '<h1>פריסת ההיבחנות · ' + esc(T.school() ? T.school().name : '') + '</h1>';
    GR.slice(1).forEach(function (g) {
      var rows = [];
      P.doc.subjects.forEach(function (s) { papers(s.name).forEach(function (r) { var v = s.rows[r.code]; if (v && v.g === g) rows.push([s.name, r.code, r.name, v.m || '', r.how || r.ext]); }); });
      if (rows.length) h += '<h2>שכבה ' + g + '</h2><table><tr><th>מקצוע</th><th>שאלון</th><th>שם</th><th>מועד</th><th>אופן</th></tr>' +
        rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (i === 1 ? ' dir="ltr"' : '') + '>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
    });
    printHtml('פריסת ההיבחנות', h + '<p class="src">מספרי השאלונים: חוברת השאלונים באתר pedagogiamh.co.il</p>');
  }

  /* ===================== y — לוח שנה פדגוגי ===================== */
  var FEEDS = [['rakazPed', 'רכזים פדגוגיים · השתלמויות ומפגשים'], ['exam', 'לוח המבחנים'], ['national', 'אירועים ארציים'], ['holiday', 'חגים וחופשות']];
  var EV = null, YST = '';
  function parseIcs(txt, src) {
    var out = [];
    txt.replace(/\r\n[ \t]/g, '').split('BEGIN:VEVENT').slice(1).forEach(function (b) {
      var s = (b.match(/\nSUMMARY[^:]*:(.*)/) || [])[1] || '', d = (b.match(/\nDTSTART[^:]*:(\d{8})/) || [])[1] || '', t = (b.match(/\nDTSTART[^:]*:\d{8}T(\d{2})(\d{2})/) || []);
      if (!d) return;
      out.push({ date: d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8), time: t[1] ? t[1] + ':' + t[2] : '', title: s.replace(/\\,/g, ',').replace(/\\n/g, ' ').trim(), src: src });
    });
    return out;
  }
  function loadCal() {
    if (YST) return; YST = 'load';
    Promise.all(FEEDS.map(function (f) { return fetch('/cal/' + f[0] + '.ics').then(function (r) { return r.text(); }).then(function (t) { return parseIcs(t, f[0]); }).catch(function () { return []; }); }))
      .then(function (L) { EV = [].concat.apply([], L).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }); YST = 'ok'; })
      .catch(function () { YST = 'err'; }).then(redraw);
  }
  var YF = { rakazPed: 1, exam: 1, national: 1, holiday: 1 };
  function pageY() {
    var h = '<div class="card head"><h1>לוח שנה פדגוגי</h1><div class="meta">כל המועדים של הרכז/ת במקום אחד: ההשתלמויות והמפגשים של הרכזים, הבחינות, האירועים הארציים והחגים. ההרשמה ליומן מתעדכנת לבד.</div></div>' +
      '<div class="card"><p class="eyebrow">' + IC.cal + 'הוספה ליומן שלי</p><div class="acts">' + FEEDS.map(function (f) { return feedLinks(f[0], f[1]); }).join('') + '</div>' +
      '<p class="small" style="margin-top:6px">' + (IS_APPLE ? 'נפתח ביומן של אפל.' : 'נפתח ב-Google Calendar — מאשרים "הוספה".') + ' כל יומן נכנס בנפרד, ואפשר להסתיר אותו בכל רגע.</p></div>';
    if (YST !== 'ok') return h + '<div class="card"><div class="empty">' + (YST === 'err' ? 'היומנים לא נטענו.' : 'טוען…') + '</div></div>';
    var t = todayIso(), end = iso(new Date(Date.now() + 120 * 864e5));
    var L = EV.filter(function (e) { return e.date >= t && e.date <= end && YF[e.src]; });
    var byM = {}, order = [];
    L.forEach(function (e) { var k = e.date.slice(0, 7); if (!byM[k]) { byM[k] = []; order.push(k); } byM[k].push(e); });
    var name = {}; FEEDS.forEach(function (f) { name[f[0]] = f[1].split(' · ')[0]; });
    return h + '<div class="card"><div class="ychips">' + FEEDS.map(function (f) {
      return '<label class="ychip y-' + f[0] + '"><input type="checkbox" data-yf="' + f[0] + '"' + (YF[f[0]] ? ' checked' : '') + '>' + esc(name[f[0]]) + '</label>';
    }).join('') + '</div><p class="small">ארבעת החודשים הקרובים · ' + L.length + ' מועדים</p>' +
      (L.length ? order.map(function (k) {
        var p = k.split('-');
        return '<h3 class="tt-h3">' + MONTHS[+p[1] - 1] + ' ' + p[0] + '</h3><ul class="exl">' + byM[k].map(function (e) {
          var d = new Date(e.date + 'T12:00:00');
          return '<li><span class="dd"><b>' + d.getDate() + '</b>' + MONTHS[d.getMonth()].slice(0, 3) + '</span><span><b>' + esc(e.title) + '</b><small>יום ' + DAYS[d.getDay()] + (e.time ? ' · ' + e.time : '') +
            ' · <span class="ytag y-' + e.src + '">' + esc(name[e.src]) + '</span></small></span></li>';
        }).join('') + '</ul>';
      }).join('') : '<div class="empty">אין מועדים בתקופה הזו.</div>') + '</div>';
  }


  /* ===================== n — הכירו את ניצה (11.10.26, מיטל: "הסבר על ניצה, אולי וירטואלי, שיבינו מה הם יכולים לעשות איתה") =====================
     סימולציה: לוחצים על שאלה, וניצה "מקלידה" תשובה לדוגמה על בית ספר דמיוני — בלי קריאה לשרת ובלי לבזבז שאלות.
     לצד כל תרחיש: איפה עושים את זה בנטע, וכפתור לנסות עכשיו. התשובות כתובות מראש; לא נתונים של בית ספר אמיתי. */
  var NZ = [
    { k: 'urgent', q: 'מה הכי דחוף אצלנו בתחום הפדגוגי?', where: 'בחלונית של ניצה — הכפתור בפינת המסך, בכל עמוד.', go: 'ask',
      a: ['הכי דחוף השבוע: רישום המורים למנור, והשתלמות מוסדית שתתמקד בפער בפדגוגיה.',
          '**מנור**', '• 6 מתוך 24 מורים עוד לא נרשמו. כדאי לשלוח להם את ההודעה המוכנה מעמוד מנור. (מקור: מנור)',
          '**השתלמות מוסדית**', '• בשאלון האקלים, ממד הפדגוגיה של המורים נמוך מקבוצת ההשוואה. השתלמות סביב למידה פעילה תענה על זה. (מקור: שאלון אקלים)',
          '• כדאי לנסח עם המנהל/ת יעד פדגוגי אחד ברור לפני ההגשה.',
          '**לצ׳ק ליסט**', '• ליד כל משימה בתשובה יש כפתור "לצ׳ק ליסט" — והיא נכנסת לצ׳ק ליסט שלי, עם תזכורת ביומן ומייל למי שמטפל/ת.'],
      tip: 'ניצה עונה מתוך הנתונים של בית הספר שלך — מנור, האקלים, הוועדה המלווה, הנספח — ומציינת מאיפה כל דבר.' },
    { k: 'plan', q: 'בני לי תוכנית עבודה פדגוגית שנתית', where: 'בחלונית של ניצה. התוכנית נשמרת ב"התוכניות שלי".', go: 'p',
      a: ['בניתי טיוטה: "מהוראה פרונטלית ללמידה פעילה".',
          '**3 מטרות לשנה**, לכל אחת מדד הצלחה — למשל: 50% מהמורים מקיימים למידה פעילה, לפי שאלון האקלים בסוף השנה.',
          '**פעולות לפי תחום** — הוראה ולמידה, פיתוח צוות, מגמות ובגרות, תלמידים מתקשים — עם מי ועד מתי.',
          '**לוח חודשי** — מה עושים בכל חודשיים, מספטמבר עד אוגוסט.',
          '**שלושה צעדים ראשונים** לשבועיים הקרובים.',
          'אפשר לערוך כל שורה, להדפיס ולשלוח — והמנהל/ת רואה את התוכנית גם בצוהר.'],
      tip: 'אחרי שהתוכנית נבנתה — "עבודה על התוכנית" פותח את ניצה לידה: היא מכינה מערך לישיבת צוות, כלי מיפוי או הנחיה לצוות מתוך התוכנית.' },
    { k: 'aklim', q: 'ניצה, מה עושים עם תוצאות האקלים?', where: 'ב"בית הספר שלי", במקטע האקלים — הכפתור "ניצה, מה עושים עם זה?".', go: 's',
      a: ['שלושה דברים שאפשר להתחיל בהם כבר החודש:',
          '• **ישיבת צוות על ההיגד הנמוך ביותר** — להציג אותו לצוות ולשאול: מה אנחנו רואים בכיתות? (ניצה יכולה להכין את מערך הישיבה)',
          '• **תצפיות ממוקדות** — 4–5 תצפיות בשיעורים, על השאלה שהאקלים מעלה.',
          '• **שיחה עם תלמידים** — 3–5 תלמידים מכמה שכבות, על חוויית הלמידה.',
          'כל אחת מהן נכנסת לצ׳ק ליסט בלחיצה.'],
      tip: 'אותו כפתור מופיע גם ליד הוועדה המלווה וליד היעדים — ניצה נפתחת ליד מה שקוראים.' },
    { k: 'meet', q: 'תסכמי את ישיבת הצוות', where: 'בעמוד "ישיבת צוות": מקליטים בטלפון או במחשב, או מדביקים פרוטוקול.', go: 'h',
      a: ['**סיכום ישיבת צוות · היערכות למחצית**',
          '**מה נדון** • לוח המבחנים של המחצית • עומס המטלות בשכבת י״א',
          '**החלטות** • כל צוות מקצוע מצמצם מטלה אחת בשבוע המבחנים',
          '**משימות** • לעדכן את לוח המטלות — רכזי המקצועות, עד יום חמישי • לשלוח עדכון להורי י״א — מחנכי השכבה',
          '**נשאר פתוח** • מועד ישיבת המשוב על המחצית',
          'המשימות נכנסות לצ׳ק ליסט בלחיצה אחת. ההקלטה עצמה לא נשמרת — רק הסיכום.'],
      tip: 'ניצה לא מעתיקה לסיכום פרטים אישיים על תלמידים — רק "נדון מקרה של תלמיד/ה".' },
    { k: 'obs', q: 'נסחי משוב מהתצפית', where: 'בעמוד "תצפיות": אחרי שממלאים תצפית (מלאה לפי תמ"ה או קצרה).', go: 'x',
      a: ['**תודה על הפתיחות** — היה מעניין לראות את השיעור.',
          '**מה ראיתי שעובד** • שאלות פתוחות לאורך השיעור, שהזמינו כמה תשובות אפשריות • זמן המתנה לתשובה, שאפשר ליותר תלמידים להשתתף',
          '**כיווני צמיחה** • מה אם בסוף השיעור התלמידים יציגו תוצר קצר? זו דרך לראות מה נלמד',
          '**צעד משותף** • נקבע תצפית חוזרת בעוד חודש, הפעם עם מוקד שתבחר/י.',
          'שם המורה לא נשלח לניצה. עורכים, ושולחים במייל או מעתיקים לשיחה.'],
      tip: 'כל התצפיות מצטרפות ל"תמונה הבית ספרית" — למשל, באיזו מידה יש שיח בין תלמידים בכלל השיעורים.' },
    { k: 'tool', q: 'תתאימי את הכלי לבית הספר שלנו', where: 'ב"ארגז הכלים": ליד כל כלי — "התאמה לבית הספר שלנו".', go: 't',
      a: ['התאמתי את **שאלון הפדגוגיה למורים** לבית הספר שלכם:',
          '• הוספתי שאלות על למידה במגמות — חשמל ותקשוב — לצד מקצועות הליבה.',
          '• קיצרתי ל-12 שאלות, כדי שיתאים לישיבת צוות של 20 דקות.',
          '• הוספתי טבלה לסיכום התוצאות לפי מגמה.',
          'החומר מוכן להדפסה או להעתקה — בלי פרטים של תלמידים.'],
      tip: 'ניצה עובדת גם בערבית: שואלים בערבית — והיא עונה בערבית.' }
  ];
  var NZK = '', NZT = null;
  function md(t) { return esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); }
  function pageN() {
    var cur = NZ.filter(function (x) { return x.k === NZK; })[0];
    return '<div class="card head nz-head"><img src="brand/ozeret-avatar.png" alt="" class="nz-av"><div><h1>הכירו את ניצה</h1><div class="meta">העוזרת האישית שלך בנטע. ' +
      'היא מכירה את הנתונים של בית הספר ואת הידע של המינהל, עונה על שאלות ובונה חומרי עבודה. לחצו על שאלה, ותראו מה היא עונה — <b>בבית ספר לדוגמה</b>.</div></div></div>' +
      '<div class="nz-grid"><div class="nz-qs">' + NZ.map(function (x) {
        return '<button type="button" class="nz-q' + (x.k === NZK ? ' on' : '') + '" data-nz="' + x.k + '">' + esc(x.q) + '</button>';
      }).join('') + '</div><div class="card nz-chat" aria-live="polite">' + (cur
        ? '<div class="nz-me">' + esc(cur.q) + '</div><div class="nz-bot"><img src="brand/ozeret-avatar.png" alt="" class="nz-av sm"><div class="nz-b" id="nzB"></div></div>' +
          '<div class="nz-after" id="nzAfter" hidden><p><b>איפה זה בנטע:</b> ' + esc(cur.where) + '</p><p class="small">' + esc(cur.tip) + '</p>' +
          '<div class="acts"><button type="button" class="btn primary" data-nzgo="' + cur.go + '">' + IC.spark + 'לנסות עכשיו</button></div></div>'
        : '<div class="empty">בחרו שאלה מהרשימה.</div>') + '</div></div>' +
      '<h2 class="pt">חשוב לדעת</h2><div class="card"><ul class="nz-know">' +
      '<li><b>פרטית לבית הספר.</b> מה שבונים עם ניצה — תוכניות, משימות, תצפיות — רואים רק את/ה והמנהל/ת. המפקח/ת לא רואה.</li>' +
      '<li><b>בלי פרטי תלמידים.</b> לא כותבים לניצה שמות או פרטים אישיים של תלמידים, והיא גם לא מוסיפה כאלה.</li>' +
      '<li><b>מציינת מקורות.</b> ליד כל טענה — מאיפה היא: מנור, אקלים, הוועדה המלווה, הנהלים באתר. מה שאין לה נתון עליו — היא אומרת.</li>' +
      '<li><b>טיוטה, לא החלטה.</b> כל מה שניצה בונה הוא טיוטה לעריכה. ההחלטות שלך ושל הצוות.</li>' +
      '<li><b>תקרה יומית:</b> 10 שאלות ו-3 תוכניות ביום לכל משתמש/ת.</li></ul></div>';
  }
  function typeOut(cur) {
    clearInterval(NZT);
    var lines = cur.a, li = 0, ci = 0, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function html(upto, part) { return lines.slice(0, upto).map(function (l) { return '<p>' + md(l) + '</p>'; }).join('') + (part != null ? '<p>' + md(part) + '<span class="nz-caret"></span></p>' : ''); }
    function done() { var b = $('nzB'), a = $('nzAfter'); if (b) b.innerHTML = html(lines.length); if (a) a.hidden = false; }
    if (!$('nzB')) return;
    if (reduce) { done(); return; }
    $('nzB').innerHTML = '<span class="nz-dots"><i></i><i></i><i></i></span>';
    setTimeout(function () {
      NZT = setInterval(function () {
        if (!$('nzB')) { clearInterval(NZT); return; }
        ci += 3;
        if (ci >= lines[li].length) { li++; ci = 0; }
        if (li >= lines.length) { clearInterval(NZT); done(); return; }
        $('nzB').innerHTML = html(li, lines[li].slice(0, ci).replace(/\*+$/, ''));
      }, 18);
    }, 700);
  }

  /* ===== ציור + אירועים ===== */
  var CUR = '';
  function body(p) { return ({ n: pageN, x: pageX, b: pageB, y: pageY }[p])(); }
  function redraw() { var el = $('ntTool'); if (el && CUR) el.innerHTML = body(CUR); }
  /* כל הקלדה בטופס התצפית — ישר למודל ולטיוטה, כדי שציור מחדש לא ימחק אותה */
  function xLive(e) { var root = $('ntTool'); if (XV === 'form' && XO && root && root.contains(e.target) && e.target.closest('[data-xf],[data-xn],[data-xo],[data-xr]')) { readForm(); draftPut(); } }
  document.addEventListener('input', xLive);
  document.addEventListener('change', xLive);
  function readForm() {
    var root = $('ntTool'); if (!root || !XO) return;
    [].forEach.call(root.querySelectorAll('[data-xf]'), function (el) { XO[el.getAttribute('data-xf')] = el.value; });
    [].forEach.call(root.querySelectorAll('[data-xn]'), function (el) { XO[el.getAttribute('data-xn')][+el.getAttribute('data-i')].n = el.value; });
    [].forEach.call(root.querySelectorAll('[data-xo]'), function (el) { var p = el.getAttribute('data-xo').split('.'); XO[p[0]][p[1]] = el.value; });
    [].forEach.call(root.querySelectorAll('[data-xr]:checked'), function (el) {
      var part = el.getAttribute('data-xr'), i = +el.getAttribute('data-i');
      if (i < 0) XO[part].v = el.value; else XO[part][i].v = el.value;
    });
  }
  document.addEventListener('click', function (e) {
    var root = $('ntTool'); if (!root) return;
    var nz = e.target.closest && e.target.closest('[data-nz],[data-nzgo]');
    if (nz && root.contains(nz)) {
      if (nz.hasAttribute('data-nz')) {
        NZK = nz.getAttribute('data-nz'); redraw(); typeOut(NZ.filter(function (x) { return x.k === NZK; })[0]);
        if (isMobile()) { var c = root.querySelector('.nz-chat'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      } else { var g = nz.getAttribute('data-nzgo'); if (g === 'ask') { if (window.KEREN && KEREN.open) KEREN.open(); } else T.go(g); }
      return;
    }
    var b = e.target.closest && e.target.closest('[data-xt],[data-bt],[data-bt2]');
    if (!b || !root.contains(b)) return;
    var k = b.getAttribute('data-xt');
    if (b.hasAttribute('data-bt')) { BV = b.getAttribute('data-bt'); redraw(); return; }
    var k2 = b.getAttribute('data-bt2');
    if (k2) {
      var P = prisaDoc();
      if (k2 === 'add') {
        var n = matchSubject(($('bAdd') || {}).value || '');
        if (!n) { T.toast('לא נמצא מקצוע כזה בחוברת השאלונים'); return; }
        if (!P.doc.subjects.some(function (s) { return s.name === n; })) { P.doc.subjects.push({ name: n, rows: {} }); PDIRTY = true; }
        redraw();
      } else if (k2 === 'rm') { P.doc.subjects.splice(+b.getAttribute('data-si'), 1); PDIRTY = true; redraw(); }
      else if (k2 === 'print') prisaPrint();
      else if (k2 === 'save') {
        XBUSY = true; redraw();
        (P.id ? api({ action: 'docSave', id: P.id, doc: P.doc }, 60000).then(function (r) { if (!r || !r.ok) throw new Error(r && r.error); })
              : saveNew('prisa', P.doc).then(function (d) { P.id = d.id; }))
          .then(function () { PDIRTY = false; T.toast('הפריסה נשמרה'); }).catch(function (er) { T.toast(errText(er && er.message)); })
          .then(function () { XBUSY = false; redraw(); });
      }
      return;
    }
    if (k === 'new') {
      if (draftGet() && !confirm('יש תצפית שלא נשמרה. להתחיל חדשה ולמחוק אותה?')) return;
      XO = newObs(b.getAttribute('data-mode')); XV = 'form'; XID = ''; draftPut(); redraw(); window.scrollTo(0, 0);
    }
    else if (k === 'draft') { var dr = draftGet(); if (dr && dr.o) { XO = dr.o; XID = dr.id || ''; XV = 'form'; redraw(); window.scrollTo(0, 0); } }
    else if (k === 'draftdel') { if (confirm('למחוק את הטיוטה?')) { XO = null; draftPut(); redraw(); } }
    else if (k === 'back') {
      if (XV === 'form' && XO) { readForm(); if (!confirm('לצאת בלי לשמור? מה שהוקלד יימחק.')) return; }
      XV = 'list'; XO = null; draftPut(); redraw();
    }
    else if (k === 'open') { XID = b.getAttribute('data-id'); XV = 'view'; redraw(); window.scrollTo(0, 0); }
    else if (k === 'edit') { var d0 = (DOCS.obs || []).filter(function (x) { return x.id === XID; })[0]; XO = JSON.parse(JSON.stringify(d0.doc)); XV = 'form'; redraw(); }
    else if (k === 'save') {
      readForm();
      if (!String(XO.teacher).trim()) { T.toast('צריך את שם המורה'); return; }
      XO.title = XO.teacher + ' · ' + heDate(XO.date);
      XBUSY = true; redraw();
      var old = XID && (DOCS.obs || []).filter(function (x) { return x.id === XID; })[0];
      (old ? (old.doc = XO, saveOld(old)) : saveNew('obs', XO)).then(function (d) {
        XID = d.id; XV = 'view'; XO = null; draftPut(); T.toast('התצפית נשמרה');
      }).catch(function (er) { T.toast(errText(er && er.message)); }).then(function () { XBUSY = false; redraw(); window.scrollTo(0, 0); });
    }
    else if (k === 'del') {
      if (!confirm('למחוק את התצפית?')) return;
      api({ action: 'docDel', id: XID }, 60000).then(function (r) {
        if (!r || !r.ok) throw new Error(r && r.error);
        DOCS.obs = DOCS.obs.filter(function (x) { return x.id !== XID; }); XV = 'list'; redraw(); T.toast('נמחקה');
      }).catch(function (er) { T.toast(errText(er && er.message)); });
    }
    else if (k === 'print') { var dp = (DOCS.obs || []).filter(function (x) { return x.id === XID; })[0]; printHtml(dp.doc.title, '<h1>תצפית · ' + esc(dp.doc.title) + '</h1><pre style="white-space:pre-wrap;font:inherit">' + esc(obsText(dp.doc)) + '</pre>' + (dp.doc.mode === 'tama' ? '<p class="src">מבוסס על כלי תמ"ה, מכון אבני ראשה</p>' : '')); }
    else if (k === 'fb') {
      var df = (DOCS.obs || []).filter(function (x) { return x.id === XID; })[0], o = JSON.parse(JSON.stringify(df.doc));
      delete o.feedback; delete o.teacher; delete o.title;   /* שם המורה לא נשלח — לא נחוץ לניסוח */
      XBUSY = true; redraw();
      api({ action: 'obsFeedback', obs: o }, 90000).then(function (r) {
        if (r && r.limited) { T.toast(r.message); return; }
        if (!r || !r.ok) throw new Error(r && r.error);
        df.doc.feedback = r.feedback; return saveOld(df);
      }).catch(function (er) { T.toast(errText(er && er.message)); }).then(function () { XBUSY = false; redraw(); });
    }
    else if (k === 'fbcopy' || k === 'fbgmail') {
      var dc = (DOCS.obs || []).filter(function (x) { return x.id === XID; })[0], f = dc.doc.feedback, ok = copyHtml(rtlWrap(fbHtml(f)), fbText(f));
      if (k === 'fbgmail') { window.open('https://mail.google.com/mail/?view=cm&fs=1&su=' + encodeURIComponent(b.getAttribute('data-sub')) + (ok ? '' : '&body=' + encodeURIComponent(fbText(f))), '_blank', 'noopener'); T.toast(ok ? 'הנוסח הועתק. לחצו בגוף המייל ו-Ctrl+V' : 'נפתחה טיוטה'); }
      else T.toast(ok ? 'הועתק' : 'ההעתקה לא הצליחה');
    }
    else if (k === 'roster') {
      var names = (($('xRoster') || {}).value || '').split(/\n+/).map(function (x) { return x.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
      var cur = (DOCS.roster || []).filter(function (x) { return x.mine; })[0], doc = { title: 'רשימת המורים', names: names };
      (cur ? (cur.doc = doc, saveOld(cur)) : saveNew('roster', doc)).then(function () { T.toast('הרשימה נשמרה · ' + names.length + ' מורים'); redraw(); })
        .catch(function (er) { T.toast(errText(er && er.message)); });
    }
    else if (k === 'copyNot') {
      var seenSet = {}; obsList().forEach(function (d) { seenSet[norm(d.doc.teacher)] = 1; });
      var not = roster().filter(function (n) { return !seenSet[norm(n)]; });
      T.toast(copyHtml(rtlWrap(not.map(esc).join('<br>')), not.join('\n')) ? 'הועתקו ' + not.length + ' שמות' : 'ההעתקה לא הצליחה');
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target, root = $('ntTool'); if (!root || !root.contains(el)) return;
    if (el.hasAttribute('data-ps')) {
      var s = prisaDoc().doc.subjects[+el.getAttribute('data-si')], c = el.getAttribute('data-code');
      s.rows[c] = s.rows[c] || {}; s.rows[c][el.getAttribute('data-ps')] = el.value;
      PDIRTY = true; var pd = $('prDirty'); if (pd) pd.hidden = false;
    }
    else if (el.hasAttribute('data-bcore')) { BCORE = el.checked; redraw(); }
    else if (el.hasAttribute('data-yf')) { YF[el.getAttribute('data-yf')] = el.checked ? 1 : 0; redraw(); }
  });

  window.NTTOOLS = {
    pages: function () {
      if (T.role() !== 'rakaz') return [];
      return [['n', IC.spark, 'הכירו את ניצה', 'מה אפשר לבקש מניצה — שש דוגמאות שרואים בלחיצה.'],
              ['x', IC.eye, 'תצפיות', 'תצפית מלאה (תמ"ה) או קצרה, משוב מניצה, ומי טרם נצפה.'],
              ['b', IC.exam, 'בחינות', 'לוח המבחנים ופריסת ההיבחנות של בית הספר.'],
              ['y', IC.cal, 'לוח שנה פדגוגי', 'כל המועדים במקום אחד, והוספה ליומן.']];
    },
    owns: function (p) { return T.role() === 'rakaz' && /^[nxby]$/.test(p); },
    html: function (p) { CUR = p; return '<div id="ntTool" data-p="' + p + '">' + body(p) + '</div>'; },
    mount: function (p) {
      CUR = p;
      if (p === 'x') { loadDocs('obs'); loadDocs('roster'); }
      if (p === 'b') { loadExams(); loadSheelonim(); loadDocs('prisa'); }
      if (p === 'y') loadCal();
    },
    busy: function () { return false; }
  };
})();
