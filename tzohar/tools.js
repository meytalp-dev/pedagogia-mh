/* צוהר · כלים למנהל/ת (11.10.26, מיטל: "תבנה עם ההמלצה שלך וגם המכתבים המוכנים הם להיט").
   ארבעה עמודים, כל אחד עם כרטיס בדשבורד ופריט בתפריט:
   v — הכנה לוועדה המלווה (קרן מכינה מסמך מהנתונים של בית הספר; עריכה, הדפסה, שמירה)
   e — אירוע חריג צעד אחר צעד (לפי הנהלים שבאתר; בלי שום פרט על תלמיד — רק סימון צעדים, נשמר בדפדפן)
   h — ישיבת הנהלה בהקלטה (תמלול → קרן מסכמת → משימות לצ׳ק ליסט)
   l — מכתבים מוכנים (קב"ס, סיום לימודים — פרטי בית הספר ממולאים לבד, פרטי התלמיד לא נשמרים; ומכתב חופשי מקרן)
   השרת: keren-gas/כלים.js (vaadaPrep, letter, transcribe, meetSum, docs, docSave, docDel). */
(function () {
  var T = window.TZOHAR;
  if (!T) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function on() { return !!(window.KEREN && KEREN.enabled()); }
  function api(body, ms) { return on() ? KEREN.call(body, ms || 120000) : Promise.reject(new Error('off')); }
  var ERR = { 'no-api-key': 'קרן עוד לא הופעלה.', 'no-stt-key': 'התמלול עוד לא הופעל. מיטל מסדרת את זה.', badsession: 'פג הזמן של הכניסה. רענון הדף יבקש כניסה מחדש.',
              timeout: 'לקח יותר מדי זמן. נסו שוב בעוד רגע.', sttlimit: 'הגעת לתקרת ההקלטה היומית (3 שעות).', toolong: 'הקטע ארוך מדי.', short: 'הטקסט קצר מדי לסיכום.',
              badaudio: 'הפורמט של ההקלטה לא נתמך.', sttfail: 'התמלול לא הצליח. אפשר לנסות שוב.', notyours: 'אין הרשאה למסמך הזה.' };
  function errText(e) { return ERR[e] || 'משהו השתבש. נסו שוב בעוד רגע.'; }
  function isMobile() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (window.matchMedia && matchMedia('(pointer:coarse)').matches && innerWidth < 900); }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function heDate(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (+m[3]) + '.' + (+m[2]) + '.' + m[1] : ''; }
  function D() { return T.data ? T.data() : null; }
  /* נטע (רכז/ת): ישיבת צוות וניצה; צוהר (מנהל/ת): ישיבת הנהלה וקרן */
  function RK() { return T.role() === 'rakaz'; }
  function BOT() { return (window.KEREN && KEREN.name) || 'קרן'; }

  var IC = {
    vaad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20a5 5 0 0 1 10 0M11 20a5 5 0 0 1 10 0"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>',
    letter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/></svg>'
  };

  /* ===== עזרים: הדפסה, העתקה, מייל ===== */
  function printHtml(title, body) {
    var w = window.open('', '_blank');
    if (!w) { T.toast('הדפדפן חסם חלון חדש. אפשר להעתיק ולהדביק במסמך.'); return; }
    w.document.write('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<style>body{font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#111;max-width:720px;margin:32px auto;padding:0 20px}' +
      'h1{font-size:21px;margin:0 0 12px}h2{font-size:17px;margin:22px 0 6px}ul{padding-inline-start:20px;margin:6px 0}p{margin:6px 0}.src{color:#666;font-size:12.5px}' +
      '.fill{border-bottom:1px solid #999;display:inline-block;min-width:120px}@media print{body{margin:0 auto}}</style></head><body>' + body +
      '<script>setTimeout(function(){print()},250)<\/script></body></html>');
    w.document.close();
  }
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
  /* כפתור מייל לפי הכלל: בנייד mailto אמיתי, במחשב טיוטת Gmail + העתקת HTML מימין לשמאל */
  function mailBtns(to, sub, text, label) {
    var href = 'mailto:' + to.map(function (x) { return encodeURIComponent(x).replace(/%40/g, '@'); }).join(',') + '?subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(text);
    return isMobile() ? '<a class="btn sm" href="' + esc(href) + '">' + T.icon('mail') + esc(label) + '</a>'
      : '<button type="button" class="btn sm" data-tt="gmail" data-to="' + esc(to.join(',')) + '" data-sub="' + esc(sub) + '">' + T.icon('mail') + esc(label) + '</button>';
  }
  var MAILTEXT = {};   /* הנוסח של כל כפתור Gmail שעל המסך, לפי הנושא */
  function supEmails() { return ((D() && D().contacts) || []).filter(function (c) { return c.sup && c.email; }).map(function (c) { return String(c.email).split(/[\s,;]+/)[0]; }).filter(Boolean); }
  function personByRole(re) {
    var p = ((D() && D().nispach && D().nispach.people) || []).filter(function (q) { return re.test(q.role || ''); })[0];
    return p ? { name: p.name || '', phone: p.phone || '', email: p.email || '' } : { name: '', phone: '', email: '' };
  }
  function principal() {
    var c = ((D() && D().contacts) || []).filter(function (x) { return !x.sup && /מנהל/.test((x.kind || '') + ' ' + (x.role || '')); })[0];
    return c ? c.name : (T.me() && T.me().name) || '';
  }

  /* ===== מסמכים (vaada / meet / letter) ===== */
  var DOCS = { vaada: null, meet: null, letter: null }, DST = {};
  function loadDocs(kind, cb) {
    if (DOCS[kind] && !cb) return;
    DST[kind] = 'load';
    api({ action: 'docs', kind: kind }, 60000).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.error);
      DOCS[kind] = r.docs || []; DST[kind] = 'ok';
    }).catch(function () { DST[kind] = 'err'; DOCS[kind] = DOCS[kind] || []; }).then(function () { if (cb) cb(); else redraw(); });
  }
  function docList(kind, empty) {
    if (DST[kind] === 'load' && !DOCS[kind]) return '<div class="empty">טוען…</div>';
    var L = DOCS[kind] || [];
    if (!L.length) return '<div class="empty">' + empty + '</div>';
    return '<ul class="tt-docs">' + L.map(function (d) {
      return '<li><button type="button" class="tt-doc" data-tt="open" data-kind="' + kind + '" data-id="' + esc(d.id) + '"><b>' + esc(d.title || 'ללא שם') + '</b>' +
        '<small>עודכן ' + esc(heDate(d.updated)) + (d.mine ? '' : ' · של הרכז/ת') + '</small></button></li>';
    }).join('') + '</ul>';
  }
  function docById(kind, id) { return (DOCS[kind] || []).filter(function (d) { return d.id === id; })[0]; }
  function saveDoc(kind, d, btn) {
    if (btn) btn.disabled = true;
    api({ action: 'docSave', id: d.id, doc: d.doc }, 60000).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.error);
      d.updated = r.updated || d.updated; T.toast('נשמר');
    }).catch(function (e) { T.toast(errText(e && e.message)); }).then(function () { if (btn) btn.disabled = false; });
  }

  /* ===================== v — הכנה לוועדה המלווה ===================== */
  var VOPEN = '', VBUSY = false;
  function pageV() {
    var d = VOPEN ? docById('vaada', VOPEN) : null;
    if (d) return vaadaDoc(d);
    return '<div class="card head"><h1>הכנה לוועדה המלווה</h1><div class="meta">קרן מכינה מסמך לוועדה מתוך מה שכבר ידוע על בית הספר: היעדים והסיכומים של הוועדות הקודמות, האקלים, מנור, בעלי התפקידים ומה שפתוח מול המינהל. עורכים, מדפיסים ומביאים לוועדה.</div></div>' +
      '<div class="card">' + (on() ? '<label class="small" for="vNote">דגשים שחשוב לך שייכנסו (לא חובה)</label>' +
        '<textarea class="fld" id="vNote" maxlength="800" placeholder="למשל: להדגיש את ההתקדמות במגמת החשמל, לבקש ליווי בנושא אקלים"></textarea>' +
        '<div class="acts" style="margin-top:10px"><button type="button" class="btn primary" data-tt="vgo"' + (VBUSY ? ' disabled' : '') + '>' + IC.spark + (VBUSY ? 'קרן מכינה… (עד דקה וחצי)' : 'קרן, תכיני לי מסמך לוועדה') + '</button></div>'
        : '<div class="empty">קרן עוד לא הופעלה.</div>') + '</div>' +
      '<h2 class="pt">המסמכים שהוכנו</h2><div class="card">' + docList('vaada', 'עוד לא הוכן מסמך.') + '</div>';
  }
  function vaadaDoc(d) {
    var j = d.doc || {}, ed = d.mine;
    function f(path, val, tag) { return ed ? '<' + tag + ' class="tt-ed" contenteditable="true" data-p="' + path + '">' + esc(val) + '</' + tag + '>' : '<' + tag + '>' + esc(val) + '</' + tag + '>'; }
    return '<div class="card head">' + f('title', j.title || '', 'h1') + '<div class="meta">עודכן ' + esc(heDate(d.updated)) + (ed ? ' · אפשר לערוך כל שורה ישירות בדף' : '') + '</div></div>' +
      '<div class="card tt-vdoc">' + f('intro', j.intro || '', 'p') +
      (j.sections || []).map(function (s, i) {
        return '<h2>' + esc(s.h) + '</h2><ul>' + (s.points || []).map(function (p, k) { return f('sections.' + i + '.points.' + k, p, 'li'); }).join('') + '</ul>' +
          (s.src ? '<p class="small">מקור: ' + esc(s.src) + '</p>' : '');
      }).join('') +
      ((j.asks || []).length ? '<h2>מה נבקש מהוועדה</h2><ul>' + j.asks.map(function (a, k) { return f('asks.' + k, a, 'li'); }).join('') + '</ul>' : '') +
      (j.missing ? '<p class="small tt-miss">כדאי להשלים לפני הוועדה: ' + esc(j.missing) + '</p>' : '') + '</div>' +
      '<div class="acts" style="margin-top:12px">' + (ed ? '<button type="button" class="btn primary" data-tt="vsave">שמירה</button>' : '') +
      '<button type="button" class="btn" data-tt="vprint">' + IC.print + 'הדפסה</button><button type="button" class="btn" data-tt="vcopy">' + IC.copy + 'העתקה</button>' +
      '<button type="button" class="btn" data-tt="vback">לכל המסמכים</button>' + (ed ? '<button type="button" class="btn" data-tt="vdel">מחיקה</button>' : '') + '</div>';
  }
  function vaadaHtml(j) {
    return '<h1>' + esc(j.title) + '</h1><p>' + esc(j.intro) + '</p>' + (j.sections || []).map(function (s) {
      return '<h2>' + esc(s.h) + '</h2><ul>' + (s.points || []).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>';
    }).join('') + ((j.asks || []).length ? '<h2>מה נבקש מהוועדה</h2><ul>' + j.asks.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '');
  }
  function vaadaText(j) {
    return j.title + '\n\n' + j.intro + '\n' + (j.sections || []).map(function (s) { return '\n' + s.h + '\n' + (s.points || []).map(function (p) { return '• ' + p; }).join('\n'); }).join('\n') +
      ((j.asks || []).length ? '\n\nמה נבקש מהוועדה\n' + j.asks.map(function (a) { return '• ' + a; }).join('\n') : '');
  }
  function collectEdits(root, j) {
    [].forEach.call(root.querySelectorAll('[data-p]'), function (el) {
      var p = el.getAttribute('data-p').split('.'), o = j;
      for (var i = 0; i < p.length - 1; i++) o = o[p[i]];
      o[p[p.length - 1]] = el.textContent.replace(/\s+/g, ' ').trim();
    });
  }

  /* ===================== e — אירוע חריג ===================== */
  /* הנוסח מתוך עמודי הנהלים באתר (cherum-harchakat-talmid, cherum-chovat-divuach, cherum-tofes-divuach, cherum-tzelach).
     לא לקצר מועד, סף או גורם מדווח בלי לבדוק מול העמוד. כל שלב מקשר לעמוד שלו. */
  var EV_TYPES = [
    ['violence', 'אלימות'], ['sexual', 'פגיעה מינית'], ['suicide', 'אמירה או ניסיון אובדני'], ['drugs', 'סמים ואלכוהול'],
    ['emergency', 'אירוע חירום: תאונה, פציעה, פיגוע'], ['disaster', 'אסון: הפעלת הצל"ח'], ['removal', 'שוקלים הרחקת תלמיד/ה']
  ];
  var P_H = 'cherum-harchakat-talmid.html', P_D = 'cherum-chovat-divuach.html', P_F = 'cherum-tofes-divuach.html', P_Z = 'cherum-tzelach.html';
  var EV_FIRST = [
    ['מיד', 'מענה ראשוני חירומי. אם יש סכנה — להיעזר בגורמי חוץ: משטרה, מכבי אש, מד"א.', P_H],
    ['מיד', 'דיווח ראשוני טלפוני או בוואטסאפ, והיוועצות, עם ממונה הנוער במחוז.', P_H],
    ['מיד', 'לעדכן במייל מסודר את המפקח/ת הפדגוגי/ת הכולל/ת, את המפקחת על המערך הטיפולי ואת הגוף המפעיל.', P_H, 'mail']
  ];
  var EV_TYPE_STEPS = {
    violence: [
      ['מיד', 'באירוע טיפולי — היוועצות מיידית עם המפקחת על המערך הטיפולי.', P_H],
      ['לפי הסוג', 'איום וסחיטה, נזק בזדון, פריצה, הצתה או נשיאת נשק: המנהל/ת מגיש/ה תלונה במשטרה.', P_D],
      ['לפי הסוג', 'אלימות בין תלמידים: דיווח למשטרה לפי חומרת האירוע.', P_D],
      ['לפי הסוג', 'אלימות בתוך המשפחה: דיווח לעו"ס לחוק נוער או למשטרה. אין ליידע הורים.', P_D],
      ['לפי הסוג', 'אלימות ע"י אדם זר או מוכר: מי שבפניו נחשפה הפגיעה מדווח/ת לעו"ס לחוק נוער או למשטרה.', P_D],
      ['בהמשך', 'אם תלמידים היו עדים או שמעו על הפגיעה — עבודה עם כל התלמידים לפי מעגלי הפגיעה.', P_D]
    ],
    sexual: [
      ['מיד', 'היוועצות מיידית עם המפקחת על המערך הטיפולי.', P_H],
      ['מיד', 'מי שבפניו נחשפה הפגיעה מדווח/ת בכתב לעו"ס לחוק נוער או למשטרה, ומתעד/ת את מועד הדיווח ומי קיבל אותו.', P_D],
      ['מיד', 'לקבל מידע ולהימנע מחקירה. אם מעורבים כמה תלמידים — לשוחח עם כל אחד/ת בנפרד.', P_D],
      ['לפי הסוג', 'גילוי עריות או פגיעה בתוך המשפחה: לא ליידע הורים — היידוע נעשה ע"י עו"ס לחוק נוער.', P_D],
      ['לפי הסוג', 'פגיעה בין תלמידים: ועדה בין־מקצועית באחריות המפקחת על הייעוץ (הפרדה בין הפוגע לנפגע לפי הצורך, טיפול בשניהם, פרטיות, מוגנות לכלל התלמידים).', P_D],
      ['בהמשך', 'פגיעה בין תלמידים: המנהל/ת נפגש/ת לפחות פעם אחת עם התלמיד/ה הנפגע/ת והוריו/ה, ולפחות פעם אחת עם התלמיד/ה הפוגע/ת והוריו/ה.', P_D]
    ],
    suicide: [
      ['מיד', 'כל איש/ת צוות מדווח/ת מיידית ליועץ/ת ולמנהל/ת.', P_D],
      ['מיד', 'דיווח מיידי להורים. אם אין אפשרות או שאין שיתוף פעולה — דיווח לעו"ס לחוק נוער.', P_D],
      ['מיד', 'היוועצות מיידית עם המפקחת על המערך הטיפולי.', P_H],
      ['מיד', 'אם יש כוונה או תוכנית: היועץ/ת מבקש/ת מההורים לקחת את התלמיד/ה מיידית להערכה פסיכיאטרית, ומשגיחים עד ההערכה. לפיקוח מדווחים כשיש אמירה שמצביעה על כוונה או תוכנית.', P_D],
      ['בהמשך', 'היועץ/ת בונה תוכנית ביטחון ועורך/ת חוזה עם התלמיד/ה, וממפה מעגלי סיכון של כלל התלמידים.', P_D]
    ],
    drugs: [
      ['מיד', 'חובת הדיווח על המנהל/ת: דיווח לקצין/עובד נוער במשטרה או היוועצות עמו, ויידוע ההורים על הדיווח. אם אי אפשר ליידע הורים — ליידע עו"ס לחוק נוער.', P_D],
      ['מיד', 'היוועצות מיידית עם המפקחת על המערך הטיפולי.', P_H],
      ['חשוב', 'אין להוציא תלמיד/ה מבית הספר בגין עבירת סמים. אין לחקור תלמידים, להעסיק חוקר או לדרוש בדיקות שתן — זו סמכות המשטרה.', P_D],
      ['בהמשך', 'לבנות לתלמיד/ה תוכנית חינוכית־טיפולית, בבית הספר או מחוצה לו.', P_D]
    ],
    emergency: [],
    disaster: [
      ['עד 120 דקות', 'לזמן את הצל"ח ולדווח למשרד העבודה, למפקח/ת הכולל/ת, ליועץ/ת הבכיר/ה ולרשות המקומית — עד 120 דקות מקבלת ההודעה.', P_Z],
      ['בהמשך', 'לנהל יומן אירועים ולתכנן חזרה הדרגתית לשגרה.', P_Z]
    ],
    removal: [
      ['חשוב', 'הרחקה זמנית עד 3 ימים — בסמכות המנהל/ת. מעל 3 ימים — באישור בכתב מהמפקח/ת הפדגוגי/ת.', P_H],
      ['חשוב', 'לעדכן את הקב"ס, לשלוח מכתב יידוע להורים, ולא לשחרר תלמיד/ה הביתה בלי יידוע טלפוני.', P_H],
      ['חשוב', 'הרחקה לצמיתות — רק כמוצא אחרון, בחמישה שלבים: דיון פנימי, זימון בדואר רשום, ועדה ברשות המפקח/ת הכולל/ת, החלטה מנומקת בכתב, וועדת ערר.', P_H],
      ['תוך 3 ימים', 'החלטת ועדת ההרחקה מועברת להורים תוך 3 ימים לכל היותר. ערר ההורים — עד 14 ימים מההודעה.', P_H]
    ]
  };
  var EV_AFTER = [
    ['היום', 'לכנס צוות בין־מקצועי, לחלק תפקידים, לתעד בתיק התלמיד/ה ובתיק האירועים החריגים של בית הספר.', P_H],
    ['עד 48 שעות', 'דו"ח משלים בטופס "דיווח על אירוע חריג" — שמות התלמידים בראשי תיבות בלבד, כולל כל הדיווחים הטלפוניים. נשלח למפקח/ת הפדגוגי/ת הכולל/ת, למפקחת על המערך הטיפולי ולממונה המחוזי.', P_F],
    ['במקביל', 'מילוי הטופס לא מחליף את חובת הדיווח החוקית — לדווח במקביל לפקיד סעד / לעו"ס לחוק נוער לפי הנוהל.', P_F],
    ['בהמשך', 'תוכנית התערבות בשני חלקים: לפי מעגלי הפגיעות, ותוכנית מתמשכת שתמנע הישנות.', P_H],
    ['אחרי כמה ימים', 'ועדה בין־מקצועית להפקת לקחים; המסקנות לממונה המחוזי, למפקח/ת הכולל/ת, למפקחת על המערך הטיפולי ולרשת החינוך.', P_H]
  ];
  var EVK = 'tzohar.event';
  function evGet() { try { return JSON.parse(localStorage.getItem(EVK) || 'null'); } catch (e) { return null; } }
  function evPut(x) { try { if (x) localStorage.setItem(EVK, JSON.stringify(x)); else localStorage.removeItem(EVK); } catch (e) {} }
  function evSteps(type) {
    return EV_FIRST.concat(EV_TYPE_STEPS[type] || []).concat(type === 'removal' ? [] : EV_AFTER);
  }
  function pageE() {
    var ev = evGet();
    var h = '<div class="card head"><h1>אירוע חריג</h1><div class="meta">מה עושים, צעד אחר צעד, לפי הנהלים של המינהל. <b>כשיש ספק — אין ספק: תמיד עדיף לדווח ולהתייעץ.</b> אתם לא לבד.</div></div>';
    if (!ev) {
      return h + '<div class="card"><p class="lead">מה קרה?</p><div class="tt-evtypes">' + EV_TYPES.map(function (t) {
        return '<button type="button" class="btn" data-tt="evstart" data-type="' + t[0] + '">' + esc(t[1]) + '</button>';
      }).join('') + '</div>' +
        '<p class="small" style="margin-top:12px">שום פרט על התלמידים לא נכתב ולא נשמר כאן — רק סימון הצעדים, בדפדפן שלך. בטופס הרשמי מעורבים מסומנים בראשי תיבות בלבד.</p></div>' +
        '<h2 class="pt">הנהלים המלאים</h2><div class="card"><ul class="tt-links">' +
        [[P_H, 'ניהול אירוע חריג והרחקת תלמיד'], [P_D, 'חובת דיווח והנחיות לפעולה'], [P_F, 'טופס דיווח על אירוע חריג'], [P_Z, 'צל"ח — צוות לשעת חירום']].map(function (l) {
          return '<li><a href="/' + l[0] + '" target="_blank" rel="noopener">' + esc(l[1]) + '</a></li>';
        }).join('') + '</ul></div>';
    }
    var name = (EV_TYPES.filter(function (t) { return t[0] === ev.type; })[0] || ['', ''])[1];
    var steps = evSteps(ev.type), done = ev.done || {}, n = steps.filter(function (s, i) { return done[i]; }).length;
    var sup = supEmails(), school = T.school() ? T.school().name : '';
    var sub = 'עדכון על אירוע חריג · ' + school;
    var text = 'שלום,\n\nמעדכנים על אירוע חריג בבית הספר ' + school + '.\n\nסוג האירוע: ' + name + '\nמועד: [תאריך ושעה]\nמה נעשה עד עכשיו: [פעולות ראשונות, למי דווח]\nמעורבים: [ראשי תיבות בלבד, גיל/כיתה]\n\nדו"ח משלים בטופס "דיווח על אירוע חריג" יישלח עד 48 שעות.\n\n' + principal() + '\n' + school;
    MAILTEXT[sub] = { text: text, html: rtlWrap(esc(text).replace(/\n/g, '<br>')) };
    return h + '<div class="card"><div class="tt-evhead"><b>' + esc(name) + '</b><span class="small">התחלתם ב-' + esc(ev.t) + ' · ' + n + ' מתוך ' + steps.length + ' צעדים</span></div>' +
      '<ol class="tt-steps">' + steps.map(function (s, i) {
        return '<li class="' + (done[i] ? 'ok' : '') + '"><label><input type="checkbox" data-tt="evstep" data-i="' + i + '"' + (done[i] ? ' checked' : '') + '>' +
          '<span class="w">' + esc(s[0]) + '</span><span class="tx">' + esc(s[1]) + '</span></label>' +
          '<div class="tt-sacts"><a class="small" href="/' + s[2] + '" target="_blank" rel="noopener">לנוהל</a>' +
          (s[3] === 'mail' ? (sup.length ? ' · ' + mailBtns(sup, sub, text, 'טיוטת מייל לפיקוח') : ' · <span class="small">כתובת המפקח/ת לא נמצאה באנשי הקשר</span>') : '') + '</div></li>';
      }).join('') + '</ol>' +
      '<div class="acts" style="margin-top:12px"><a class="btn" href="/docs/tofes-divuach-eruah-charig.docx" target="_blank" rel="noopener">טופס הדיווח (Word)</a>' +
      '<button type="button" class="btn" data-tt="evend">סיום · אירוע חדש</button></div>' +
      '<p class="small" style="margin-top:10px">במייל ובטופס — מעורבים בראשי תיבות בלבד. הסימון נשמר רק בדפדפן הזה.</p></div>';
  }

  /* ===================== h — ישיבת הנהלה בהקלטה ===================== */
  var SEG_MAX = 20 * 60, REC = { st: '' }, MT = { text: '', date: '', topic: '', busy: false, msg: '', err: '' }, MOPEN = '';
  function recMime() {
    var c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4'];
    for (var i = 0; i < c.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c[i])) return c[i];
    return '';
  }
  function clock(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  /* קטע שהסתיים → תור תמלול (אחד אחרי השני, כדי שהסדר יישמר) */
  var QUEUE = [], QBUSY = false, PARTS = [], FAILED = [], WT = null;
  /* 11.10.26 (מיטל: "הקלטתי וזה לא תמלל"): התמלול הצליח בשרת, אבל הדף לא הראה שהוא עובד.
     עכשיו: שעון "מתמלל… 0:12" שזז, הכפתורים אפורים בזמן העבודה, וקטע שנכשל נשמר בדף — "לנסות שוב" בלי להקליט מחדש */
  function sendSeg(blob, mime, secs, idx) {
    QUEUE.push({ blob: blob, mime: mime, secs: secs, idx: idx });
    pump();
  }
  function waitTick() {
    var el = $('ttWait');
    if (!QBUSY) { clearInterval(WT); WT = null; return; }
    if (el) el.textContent = clock((Date.now() - MT.t0) / 1000);
  }
  function pump() {
    if (QBUSY || !QUEUE.length) return;
    QBUSY = true;
    var q = QUEUE.shift(), fr = new FileReader();
    var many = QUEUE.length || q.idx > 0;
    MT.msg = 'מתמלל' + (many ? ' קטע ' + (q.idx + 1) : '') + '… בדרך כלל עד חצי דקה'; MT.t0 = Date.now(); MT.err = '';
    if (!WT) WT = setInterval(waitTick, 1000);
    redraw();
    fr.onload = function () {
      var b64 = String(fr.result || '').replace(/^data:[^,]*,/, '');
      /* זמן המתנה לפי האורך: לפחות דקה וחצי; קטע של 20 דקות — עד כ-5 דקות */
      api({ action: 'transcribe', audio: b64, mime: q.mime, secs: Math.round(q.secs) }, Math.max(90000, 60000 + q.secs * 200)).then(function (r) {
        if (!r || !r.ok) throw new Error(r && r.error || 'sttfail');
        PARTS[q.idx] = r.text;
      }).catch(function (e) {
        MT.err = errText(e && e.message) + ' ההקלטה נשמרה בדף — אפשר לנסות שוב.';
        FAILED.push(q);
      }).then(function () {
        QBUSY = false;
        if (!QUEUE.length && REC.st !== 'rec') { MT.text = PARTS.filter(Boolean).join('\n\n'); MT.msg = ''; REC.st = ''; }
        redraw(); pump();
      });
    };
    fr.readAsDataURL(q.blob);
  }
  function retry() {
    if (!FAILED.length) return;
    var L = FAILED; FAILED = []; MT.err = '';
    L.forEach(function (q) { QUEUE.push(q); });
    pump();
  }
  function recStart() {
    if (REC.st === 'rec') return;
    var mime = recMime();
    if (!mime || !navigator.mediaDevices) { T.toast('הדפדפן הזה לא מאפשר הקלטה. אפשר להעלות קובץ או להדביק טקסט.'); return; }
    if (MT.text && !confirm('יש כבר טקסט מהקלטה קודמת. להתחיל הקלטה חדשה (הטקסט הקודם יימחק)?')) return;
    MT.text = ''; MT.err = ''; PARTS = []; FAILED = [];
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      REC = { st: 'rec', stream: stream, mime: mime, t0: Date.now(), seg: 0, segT0: Date.now() };
      function segment() {
        var mr = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 }), chunks = [], idx = REC.seg, t0 = Date.now();
        REC.mr = mr; REC.segT0 = t0;
        mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        mr.onstop = function () {
          var secs = (Date.now() - t0) / 1000;
          if (secs >= 2) sendSeg(new Blob(chunks, { type: mime.split(';')[0] }), mime, secs, idx);
          if (REC.st === 'rec' && REC.rotate) { REC.rotate = false; REC.seg++; segment(); }
          else if (REC.st !== 'rec') { stream.getTracks().forEach(function (t) { t.stop(); }); }
        };
        mr.start(1000);
      }
      segment();
      REC.timer = setInterval(function () {
        var t = (Date.now() - REC.t0) / 1000, el = $('ttClock');
        if (el) el.textContent = clock(t);
        if ((Date.now() - REC.segT0) / 1000 >= SEG_MAX && REC.mr && REC.mr.state === 'recording') { REC.rotate = true; REC.mr.stop(); }   /* קטע חדש כל 20 דקות */
      }, 1000);
      if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request('screen').then(function (w) { REC.wake = w; }, function () {});
      redraw();
    }, function () { T.toast('אין גישה למיקרופון. צריך לאשר לדפדפן להשתמש במיקרופון.'); });
  }
  function recStop() {
    if (REC.st !== 'rec') return;
    REC.st = 'send'; clearInterval(REC.timer);
    if (REC.wake) { try { REC.wake.release(); } catch (e) {} }
    if (REC.mr && REC.mr.state === 'recording') REC.mr.stop(); else REC.stream.getTracks().forEach(function (t) { t.stop(); });
    MT.msg = 'מתמלל…'; redraw();
  }
  window.addEventListener('beforeunload', function (e) { if (REC.st === 'rec' || QBUSY) { e.preventDefault(); e.returnValue = ''; } });
  function pageH() {
    var m = MOPEN ? docById('meet', MOPEN) : null;
    if (m) return meetDoc(m);
    var rec = REC.st === 'rec', busy = REC.st === 'send' || QBUSY || MT.busy;
    var canRec = !!(window.MediaRecorder && navigator.mediaDevices && recMime());
    return '<div class="card head"><h1>' + (RK() ? 'ישיבת צוות' : 'ישיבת הנהלה') + '</h1><div class="meta">מקליטים את הישיבה, ו' + BOT() + ' מחזירה סיכום, החלטות ומשימות לכל אחד/ת. המשימות נכנסות לצ׳ק ליסט בלחיצה. ' +
      'ההקלטה עצמה לא נשמרת בשום מקום — רק הסיכום.</div></div>' +
      '<div class="card">' + (!on() ? '<div class="empty">קרן עוד לא הופעלה.</div>' :
        '<div class="tt-rec">' + (rec
          ? '<span class="tt-dot"></span><b id="ttClock">' + clock((Date.now() - REC.t0) / 1000) + '</b><button type="button" class="btn primary" data-tt="recstop">' + IC.stop + 'סיום ההקלטה</button>' +
            '<p class="small">השאירו את המסך דלוק ואת הדף פתוח. בישיבה ארוכה ההקלטה נשלחת בקטעים של 20 דקות.</p>'
          : (canRec ? '<button type="button" class="btn primary" data-tt="recstart"' + (busy ? ' disabled' : '') + '>' + IC.mic + 'התחלת הקלטה</button>' : '<span class="small">הדפדפן הזה לא מאפשר הקלטה.</span>') +
            '<label class="btn"' + (busy ? ' aria-disabled="true"' : '') + '>' + IC.up + 'העלאת קובץ הקלטה<input type="file" accept="audio/*" data-tt="file" hidden' + (busy ? ' disabled' : '') + '></label>') + '</div>' +
        (MT.msg ? '<p class="tt-busy"><span class="tt-spin" aria-hidden="true"></span>' + esc(MT.msg) + (QBUSY ? ' <b id="ttWait">' + clock((Date.now() - MT.t0) / 1000) + '</b>' : '') + '</p>' : '') +
        (MT.err ? '<p class="tt-err">' + esc(MT.err) + (FAILED.length ? ' <button type="button" class="btn sm" data-tt="retry">לנסות שוב</button>' : '') + '</p>' : '') +
        '<label class="small" for="ttText" style="display:block;margin-top:12px">הטקסט של הישיבה — מהתמלול, או הדבקה של פרוטוקול</label>' +
        '<textarea class="fld" id="ttText" rows="8" placeholder="התמלול יופיע כאן. אפשר גם להדביק פרוטוקול שנכתב ביד.">' + esc(MT.text) + '</textarea>' +
        '<div class="tt-row"><label class="small">תאריך<input class="fld" type="date" id="ttDate" value="' + esc(MT.date || todayIso()) + '"></label>' +
        '<label class="small" style="flex:1">נושא (לא חובה)<input class="fld" id="ttTopic" maxlength="120" value="' + esc(MT.topic) + '" placeholder="למשל: היערכות למחצית"></label></div>' +
        '<div class="acts" style="margin-top:10px"><button type="button" class="btn primary" data-tt="msum"' + (busy || rec ? ' disabled' : '') + '>' + IC.spark + (MT.busy ? BOT() + ' מסכמת… (עד דקה)' : BOT() + ', תסכמי את הישיבה') + '</button></div>') +
      '</div><h2 class="pt">ישיבות קודמות</h2><div class="card">' + docList('meet', 'עוד לא סוכמה ישיבה.') + '</div>';
  }
  function meetDoc(d) {
    var j = d.doc || {};
    function ul(a) { return (a || []).length ? '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="small">אין.</p>'; }
    return '<div class="card head"><h1>' + esc(j.title || d.title) + '</h1><div class="meta">' + (j.date ? 'הישיבה: ' + esc(heDate(j.date)) + ' · ' : '') + 'סוכם ' + esc(heDate(d.created)) + '</div></div>' +
      '<div class="card tt-vdoc"><h2>מה נדון</h2>' + ul(j.summary) + '<h2>החלטות</h2>' + ul(j.decisions) +
      '<h2>משימות</h2>' + ((j.tasks || []).length ? '<ul class="tt-tasks">' + j.tasks.map(function (t, i) {
        return '<li><span><b>' + esc(t.text) + '</b>' + (t.who || t.due ? '<small>' + esc([t.who, t.due ? 'עד ' + heDate(t.due) : ''].filter(Boolean).join(' · ')) + '</small>' : '') + '</span>' +
          (window.TZTASKS && TZTASKS.enabled() ? '<button type="button" class="btn sm" data-tt="tadd" data-i="' + i + '">לצ\'ק ליסט</button>' : '') + '</li>';
      }).join('') + '</ul>' + (window.TZTASKS && TZTASKS.enabled() && j.tasks.length > 1 ? '<button type="button" class="btn sm" data-tt="taddall">הוספת כל ' + j.tasks.length + ' המשימות לצ\'ק ליסט</button>' : '') : '<p class="small">לא עלו משימות.</p>') +
      ((j.open || []).length ? '<h2>נשאר פתוח</h2>' + ul(j.open) : '') + '</div>' +
      '<div class="acts" style="margin-top:12px"><button type="button" class="btn" data-tt="mprint">' + IC.print + 'הדפסה</button><button type="button" class="btn" data-tt="mcopy">' + IC.copy + 'העתקה</button>' +
      '<button type="button" class="btn" data-tt="mback">לכל הישיבות</button>' + (d.mine ? '<button type="button" class="btn" data-tt="mdel">מחיקה</button>' : '') + '</div>';
  }
  function meetText(j) {
    function L(a) { return (a || []).map(function (x) { return '• ' + x; }).join('\n'); }
    return j.title + '\n\nמה נדון\n' + L(j.summary) + '\n\nהחלטות\n' + L(j.decisions) + '\n\nמשימות\n' +
      (j.tasks || []).map(function (t) { return '• ' + t.text + (t.who ? ' — ' + t.who : '') + (t.due ? ' (עד ' + heDate(t.due) + ')' : ''); }).join('\n') +
      ((j.open || []).length ? '\n\nנשאר פתוח\n' + L(j.open) : '');
  }
  function meetHtml(j) {
    function ul(a) { return '<ul>' + (a || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
    return '<h1>' + esc(j.title) + '</h1><h2>מה נדון</h2>' + ul(j.summary) + '<h2>החלטות</h2>' + ul(j.decisions) + '<h2>משימות</h2>' +
      ul((j.tasks || []).map(function (t) { return t.text + (t.who ? ' — ' + t.who : '') + (t.due ? ' (עד ' + heDate(t.due) + ')' : ''); })) +
      ((j.open || []).length ? '<h2>נשאר פתוח</h2>' + ul(j.open) : '');
  }

  /* ===================== l — מכתבים ===================== */
  /* הנוסח מתוך michtav-kabas.html (נספח 8.4) ו-michtav-sium-limudim.html (נספח 8.6). פרטי התלמיד/ה לא נשמרים — רק על המסך עד ההדפסה */
  var LT = '', LF = {}, LFREE = { req: '', busy: false, res: null, err: '' };
  var LETTERS = {
    kabas: { name: 'מכתב לקב"ס — תלמיד/ה שלא חזר/ה לביקור סדיר', page: 'michtav-kabas.html',
      when: 'נשלח לאחר שתלמיד/ה נעדר/ה מסיבה לא מוצדקת וטרם חזר/ה לביקור סדיר, ואחרי שבית הספר ביצע את הפעולות לפי ההנחיות. מסווג "סודי — יימסר אישית לקב"ס"; לבקש אישור קבלה.',
      fields: [['date', 'תאריך', 'auto'], ['kabas', 'שם הקב"ס'], ['rashut', 'הרשות'], ['school', 'שם בית הספר', 'auto'],
               ['yoetz', 'שם היועץ/ת', 'auto'], ['yoetzTel', 'הטלפון של היועץ/ת', 'auto'], ['mechanech', 'שם המחנך/ת'], ['mechanechTel', 'הטלפון של המחנך/ת'],
               ['last', 'שם משפחה של התלמיד/ה', 'student'], ['first', 'שם פרטי', 'student'], ['tz', 'מספר זהות', 'student'], ['days', 'סה"כ ימי היעדרות מתחילת השנה', 'student'],
               ['actions', 'הפעולות שבית הספר נקט להחזרת התלמיד/ה', 'long'], ['other1', 'גורם טיפול נוסף (שם, תפקיד, טלפון)'], ['other2', 'גורם טיפול נוסף (שם, תפקיד, טלפון)'],
               ['principal', 'שם המנהל/ת', 'auto']],
      attach: ['מיפוי היעדרויות התלמיד/ה — רישום מפורט מתחילת השנה', 'העתק מכתבי ההתראה ומסמכים רלוונטיים', 'דו"ח ביקור בית מלא (תאריך, מי ביצע, נוכחים, סיכום)'],
      body: function (f) {
        return '<p>סודי — יימסר אישית לקב"ס</p><p>תאריך: ' + v(f.date) + '</p><p>לכבוד: ' + v(f.kabas) + '<br>קצין ביקור סדיר (קב"ס) ברשות ' + v(f.rashut) + '</p>' +
          '<p><b>פרטי בית הספר:</b><br>שם בית הספר: ' + v(f.school) + '<br>שם היועץ/ת: ' + v(f.yoetz) + ' · מס\' הטל\': ' + v(f.yoetzTel) + '<br>שם המחנך/ת: ' + v(f.mechanech) + ' · מס\' הטל\': ' + v(f.mechanechTel) + '</p>' +
          '<p><b>פרטי התלמיד/ה:</b><br>שם משפחה: ' + v(f.last) + ' · שם פרטי: ' + v(f.first) + ' · מס\' זהות: ' + v(f.tz) + '<br>סה"כ ימי ההיעדרות מתחילת שנה"ל: ' + v(f.days) + '</p>' +
          '<p><b>הפעולות שנקט בית הספר להחזרת התלמיד/ה לביקור סדיר:</b><br>' + v(f.actions, 1) + '</p>' +
          '<p><b>גורמי טיפול נוספים רלוונטיים:</b><br>' + v(f.other1) + '<br>' + v(f.other2) + '</p>' +
          '<p>בברכה,<br>שם המנהל/ת: ' + v(f.principal) + ' · חתימה: <span class="fill"></span></p>';
      } },
    sium: { name: 'מכתב סיום לימודים — להורים', page: 'michtav-sium-limudim.html',
      when: 'יוצא לאחר ההחלטה על הפסקת לימודים — בעקבות התייעצות עם המפקח/ת הפדגוגי/ת הכולל/ת ולאחר ועדת התמדה בנוכחות ההורים. לוודא שהקב"ס מחפש מסגרת חלופית. לא ניתן להפסיק לימודים בכיתה י"ב — במקרה חריג להיוועץ עם המפקח/ת הכולל/ת.',
      fields: [['date', 'תאריך', 'auto'], ['to1', 'לכבוד (שורה ראשונה)'], ['to2', 'לכבוד (שורה שנייה)'], ['student', 'שם התלמיד/ה', 'student'], ['school', 'שם בית הספר', 'auto'],
               ['notice', 'תאריך ההודעה הקודמת', 'student'], ['tz', 'ת"ז התלמיד/ה', 'student'], ['kita', 'כיתה', 'student'],
               ['reasons', 'הסיבות להחלטה', 'long'], ['steps', 'מהלכים שננקטו טרום ההחלטה', 'long'], ['decision', 'החלטת המפקח/ת הפדגוגי/ת הכולל/ת', 'long'], ['principal', 'שם המנהל/ת', 'auto']],
      attach: ['העתקים: קצין ביקור סדיר (קב"ס) · ממונה מחוז · מפקח/ת פדגוגי/ת כולל/ת · מפקחת על הצוותים הטיפוליים · תיק אישי של התלמיד/ה'],
      body: function (f) {
        return '<p>תאריך: ' + v(f.date) + '</p><p>לכבוד<br>' + v(f.to1) + '<br>' + v(f.to2) + '</p><p>אדון/גברת נכבדים,</p>' +
          '<p><b>הנדון: הודעה בדבר סיום לימודים של בנך/בתך ' + v(f.student) + ' בבית הספר ' + v(f.school) + '</b></p>' +
          '<p>בהמשך להודעה שנשלחה בתאריך ' + v(f.notice) + ' בדבר בעיית ביקור סדיר ו/או תפקוד לקוי של בנך/בתך, ' + v(f.student) + ' ת.ז ' + v(f.tz) +
          ' הרשום/ה בבית ספרנו בכיתה ' + v(f.kita) + ', ובהמשך לקיום ועדת התמדה בנוכחותכם.</p>' +
          '<p>הרינו להודיעך כי הוחלט על סיום לימודי בנך/בתך בבית ספרנו בשל הסיבות הבאות:<br>' + v(f.reasons, 1) + '</p>' +
          '<p><b>מהלכים שננקטו טרום ההחלטה:</b><br>' + v(f.steps, 1) + '</p><p><b>החלטת המפקח הפדגוגי הכולל:</b><br>' + v(f.decision, 1) + '</p>' +
          '<p>בכבוד רב,<br>' + v(f.principal) + '<br>מנהל/ת בית הספר</p>' +
          '<p class="src">העתקים: קצין ביקור סדיר (קב"ס) · ממונה מחוז · מפקח פדגוגי כולל · מפקחת על הצוותים הטיפוליים · תיק אישי של התלמיד/ה</p>';
      } }
  };
  function v(s, multi) { s = String(s || '').trim(); return s ? (multi ? esc(s).replace(/\n/g, '<br>') : esc(s)) : '<span class="fill">&nbsp;</span>'; }
  function autoFields() {
    var y = personByRole(/יועץ|ייעוץ/);
    return { date: heDate(todayIso()), school: T.school() ? T.school().name : '', yoetz: y.name, yoetzTel: y.phone, principal: principal() };
  }
  function pageL() {
    var h = '<div class="card head"><h1>מכתבים</h1><div class="meta">פרטי בית הספר, המנהל/ת והיועץ/ת ממולאים לבד. פרטי התלמיד/ה ממלאים כאן לפני ההדפסה — <b>הם לא נשמרים בשום מקום</b>.</div></div>';
    if (LT && LETTERS[LT]) {
      var L = LETTERS[LT], a = autoFields();
      Object.keys(a).forEach(function (k) { if (LF[k] === undefined) LF[k] = a[k]; });
      return h + '<div class="card"><button type="button" class="back" data-tt="lback">→ לכל המכתבים</button><h2 class="tt-h">' + esc(L.name) + '</h2>' +
        '<p class="small">' + esc(L.when) + ' <a href="/' + L.page + '" target="_blank" rel="noopener">לנוהל המלא</a></p>' +
        '<div class="tt-form">' + L.fields.map(function (f) {
          var val = LF[f[0]] || '', cls = f[2] === 'student' ? ' tt-student' : '';
          return '<label class="small' + cls + '">' + esc(f[1]) + (f[2] === 'student' ? ' <span class="tt-priv">לא נשמר</span>' : '') +
            (f[2] === 'long' ? '<textarea class="fld" data-lf="' + f[0] + '" rows="3">' + esc(val) + '</textarea>' : '<input class="fld" data-lf="' + f[0] + '" value="' + esc(val) + '">') + '</label>';
        }).join('') + '</div>' +
        '<h3 class="tt-h3">המכתב</h3><div class="tt-letter" id="ttLetter">' + L.body(LF) + '</div>' +
        (L.attach ? '<p class="small"><b>לצרף / לשלוח:</b> ' + L.attach.map(esc).join(' · ') + '</p>' : '') +
        '<div class="acts" style="margin-top:10px"><button type="button" class="btn primary" data-tt="lprint">' + IC.print + 'הדפסה</button>' +
        '<button type="button" class="btn" data-tt="lcopy">' + IC.copy + 'העתקה</button><button type="button" class="btn" data-tt="lclear">ניקוי פרטי התלמיד/ה</button></div></div>';
    }
    return h + '<div class="card"><p class="lead">מכתבים לפי הנוהל</p><div class="tt-ltypes">' + Object.keys(LETTERS).map(function (k) {
      return '<button type="button" class="dtile" data-tt="lopen" data-k="' + k + '"><span class="ic">' + IC.letter + '</span><span class="tx"><b>' + esc(LETTERS[k].name) + '</b><small>הנוסח מהנוהל · פרטי בית הספר ממולאים</small></span></button>';
    }).join('') + '</div></div>' +
      '<h2 class="pt">מכתב חופשי עם קרן</h2><div class="card">' + (!on() ? '<div class="empty">קרן עוד לא הופעלה.</div>' :
        '<label class="small" for="lfReq">למי ועל מה? קרן תנסח, ואת/ה עורך/ת</label><textarea class="fld" id="lfReq" maxlength="1000" placeholder="למשל: מכתב להורי שכבת י׳ על ערב הורים ב-12.11 בשעה 18:00, עם בקשה לאשר הגעה">' + esc(LFREE.req) + '</textarea>' +
        '<div class="acts" style="margin-top:10px"><button type="button" class="btn primary" data-tt="lfree"' + (LFREE.busy ? ' disabled' : '') + '>' + IC.spark + (LFREE.busy ? 'קרן כותבת…' : 'קרן, תנסחי') + '</button></div>' +
        (LFREE.err ? '<p class="tt-err">' + esc(LFREE.err) + '</p>' : '') +
        (LFREE.res ? '<div class="tt-letter tt-free" style="margin-top:12px"><p>תאריך: ' + esc(heDate(todayIso())) + '</p>' +
          '<p><b>הנדון: <span contenteditable="true" class="tt-ed" id="lfSub">' + esc(LFREE.res.subject) + '</span></b></p>' +
          '<div contenteditable="true" class="tt-ed" id="lfBody">' + esc(LFREE.res.body).replace(/\n/g, '<br>') + '</div>' +
          '<p>בברכה,<br>' + esc(principal()) + '<br>' + esc(T.school() ? T.school().name : '') + '</p></div>' +
          '<p class="small">אפשר לערוך את המכתב ישירות. מקומות בסוגריים מרובעים — למילוי.</p>' +
          '<div class="acts"><button type="button" class="btn primary" data-tt="lfprint">' + IC.print + 'הדפסה</button><button type="button" class="btn" data-tt="lfcopy">' + IC.copy + 'העתקה</button></div>' : '')) + '</div>';
  }

  /* ===== ציור + אירועים ===== */
  var CUR = '';
  function redraw() { var el = $('tzTool'); if (el && CUR) el.innerHTML = ({ v: pageV, e: pageE, h: pageH, l: pageL }[CUR])(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-tt]');
    if (!b || !$('tzTool') || !$('tzTool').contains(b)) return;
    var k = b.getAttribute('data-tt');
    if (k === 'file') return;
    /* --- ועדה --- */
    if (k === 'vgo') {
      var note = ($('vNote') || {}).value || '';   /* לפני redraw — הוא מחליף את התיבה */
      VBUSY = true; redraw();
      api({ action: 'vaadaPrep', note: note }, 180000).then(function (r) {
        if (r && r.limited) { T.toast(r.message); return; }
        if (!r || !r.ok) throw new Error(r && r.error);
        DOCS.vaada = [r.doc].concat(DOCS.vaada || []); VOPEN = r.doc.id;
      }).catch(function (er) { T.toast(errText(er && er.message)); }).then(function () { VBUSY = false; redraw(); window.scrollTo(0, 0); });
    }
    else if (k === 'open') {
      if (b.getAttribute('data-kind') === 'vaada') VOPEN = b.getAttribute('data-id'); else MOPEN = b.getAttribute('data-id');
      redraw(); window.scrollTo(0, 0);
    }
    else if (k === 'vback') { VOPEN = ''; redraw(); }
    else if (k === 'vsave') { var d = docById('vaada', VOPEN); collectEdits($('tzTool'), d.doc); d.title = d.doc.title; saveDoc('vaada', d, b); }
    else if (k === 'vprint' || k === 'vcopy') {
      var dv = docById('vaada', VOPEN); if (dv.mine) collectEdits($('tzTool'), dv.doc);
      if (k === 'vprint') printHtml(dv.doc.title, vaadaHtml(dv.doc));
      else T.toast(copyHtml(rtlWrap(vaadaHtml(dv.doc)), vaadaText(dv.doc)) ? 'הועתק — אפשר להדביק במסמך או במייל' : 'ההעתקה לא הצליחה');
    }
    else if (k === 'vdel' || k === 'mdel') {
      var kind = k === 'vdel' ? 'vaada' : 'meet', id = kind === 'vaada' ? VOPEN : MOPEN;
      if (!confirm('למחוק את המסמך?')) return;
      api({ action: 'docDel', id: id }, 60000).then(function (r) {
        if (!r || !r.ok) throw new Error(r && r.error);
        DOCS[kind] = (DOCS[kind] || []).filter(function (x) { return x.id !== id; });
        if (kind === 'vaada') VOPEN = ''; else MOPEN = '';
        redraw(); T.toast('נמחק');
      }).catch(function (er) { T.toast(errText(er && er.message)); });
    }
    /* --- אירוע חריג --- */
    else if (k === 'evstart') {
      var d0 = new Date();
      evPut({ type: b.getAttribute('data-type'), t: heDate(todayIso()) + ' ' + ('0' + d0.getHours()).slice(-2) + ':' + ('0' + d0.getMinutes()).slice(-2), done: {} });
      redraw(); window.scrollTo(0, 0);
    }
    else if (k === 'evend') { if (confirm('לסיים ולנקות את הסימונים?')) { evPut(null); redraw(); } }
    /* --- ישיבה --- */
    else if (k === 'recstart') recStart();
    else if (k === 'recstop') recStop();
    else if (k === 'retry') retry();
    else if (k === 'msum') {
      MT.text = ($('ttText') || {}).value || ''; MT.date = ($('ttDate') || {}).value || ''; MT.topic = ($('ttTopic') || {}).value || '';
      if (MT.text.trim().length < 80) { T.toast('צריך טקסט של הישיבה — מהקלטה או הדבקה'); return; }
      MT.busy = true; MT.err = ''; redraw();
      api({ action: 'meetSum', text: MT.text, date: MT.date, topic: MT.topic }, 180000).then(function (r) {
        if (r && r.limited) { T.toast(r.message); return; }
        if (!r || !r.ok) throw new Error(r && r.error);
        DOCS.meet = [r.doc].concat(DOCS.meet || []); MOPEN = r.doc.id; MT.text = ''; MT.topic = '';
      }).catch(function (er) { MT.err = errText(er && er.message); }).then(function () { MT.busy = false; redraw(); window.scrollTo(0, 0); });
    }
    else if (k === 'mback') { MOPEN = ''; redraw(); }
    else if (k === 'mprint' || k === 'mcopy') {
      var dm = docById('meet', MOPEN);
      if (k === 'mprint') printHtml(dm.doc.title, meetHtml(dm.doc));
      else T.toast(copyHtml(rtlWrap(meetHtml(dm.doc)), meetText(dm.doc)) ? 'הועתק' : 'ההעתקה לא הצליחה');
    }
    else if (k === 'tadd' || k === 'taddall') {
      var dj = docById('meet', MOPEN).doc, list = k === 'tadd' ? [dj.tasks[+b.getAttribute('data-i')]] : dj.tasks;
      b.disabled = true;
      TZTASKS.add(list.map(function (t) { return { text: t.text, who: t.who, due: t.due, src: dj.title }; }), 'meet').then(function () {
        T.toast(list.length > 1 ? 'נוספו ' + list.length + ' משימות לצ\'ק ליסט האישי' : 'נוספה לצ\'ק ליסט האישי');
      }).catch(function () { b.disabled = false; T.toast('ההוספה לא הצליחה'); });
    }
    /* --- מכתבים --- */
    else if (k === 'lopen') { LT = b.getAttribute('data-k'); LF = {}; redraw(); window.scrollTo(0, 0); }
    else if (k === 'lback') { LT = ''; LF = {}; redraw(); }
    else if (k === 'lclear') {
      LETTERS[LT].fields.forEach(function (f) { if (f[2] === 'student') LF[f[0]] = ''; });
      redraw();
    }
    else if (k === 'lprint') printHtml(LETTERS[LT].name, LETTERS[LT].body(LF));
    else if (k === 'lcopy') { var lh = LETTERS[LT].body(LF); T.toast(copyHtml(rtlWrap(lh), $('ttLetter').innerText) ? 'הועתק — אפשר להדביק ב-Word או במייל' : 'ההעתקה לא הצליחה'); }
    else if (k === 'lfree') {
      LFREE.req = ($('lfReq') || {}).value || '';
      if (!LFREE.req.trim()) { T.toast('כתבו למי ועל מה המכתב'); return; }
      LFREE.busy = true; LFREE.err = ''; redraw();
      api({ action: 'letter', request: LFREE.req }, 90000).then(function (r) {
        if (r && r.limited) { T.toast(r.message); return; }
        if (!r || !r.ok) throw new Error(r && r.error);
        LFREE.res = r.letter;
      }).catch(function (er) { LFREE.err = errText(er && er.message); }).then(function () { LFREE.busy = false; redraw(); });
    }
    else if (k === 'lfprint' || k === 'lfcopy') {
      var fh = $('tzTool').querySelector('.tt-free').innerHTML.replace(/ contenteditable="true"/g, '');
      if (k === 'lfprint') printHtml(LFREE.res.title || 'מכתב', fh);
      else T.toast(copyHtml(rtlWrap(fh), $('tzTool').querySelector('.tt-free').innerText) ? 'הועתק' : 'ההעתקה לא הצליחה');
    }
    else if (k === 'gmail') {
      var sub = b.getAttribute('data-sub'), mt = MAILTEXT[sub] || { text: '', html: '' }, ok = copyHtml(mt.html, mt.text);
      window.open('https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(b.getAttribute('data-to')) + '&su=' + encodeURIComponent(sub) + (ok ? '' : '&body=' + encodeURIComponent(mt.text)), '_blank', 'noopener');
      T.toast(ok ? 'הנוסח הועתק. לחצו בגוף המייל ו-Ctrl+V' : 'נפתחה טיוטה');
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!$('tzTool') || !$('tzTool').contains(el)) return;
    if (el.getAttribute('data-tt') === 'evstep') {
      var ev = evGet(); if (!ev) return;
      ev.done = ev.done || {}; ev.done[el.getAttribute('data-i')] = el.checked; evPut(ev); redraw();
    }
    else if (el.getAttribute('data-tt') === 'file' && el.files && el.files[0]) {
      var f = el.files[0], mime = String(f.type || '').split(';')[0];
      if (f.size > 10 * 1024 * 1024) { T.toast('הקובץ גדול מ-10MB. אפשר לפצל אותו או להקליט כאן.'); return; }
      if (!/^audio\//.test(mime)) { T.toast('צריך קובץ שמע'); return; }
      MT.text = ''; MT.err = ''; PARTS = []; FAILED = []; REC.st = 'send';
      var a = new Audio(), url = URL.createObjectURL(f);
      a.onloadedmetadata = function () { sendSeg(f, mime, isFinite(a.duration) ? a.duration : 600, 0); URL.revokeObjectURL(url); };
      a.onerror = function () { sendSeg(f, mime, 600, 0); URL.revokeObjectURL(url); };
      a.src = url;
    }
  });
  document.addEventListener('input', function (e) {
    var el = e.target, f = el.getAttribute && el.getAttribute('data-lf');
    if (!f || !LT) return;
    LF[f] = el.value;
    var out = $('ttLetter'); if (out) out.innerHTML = LETTERS[LT].body(LF);
  });

  /* ===== הממשק לצוהר (app.js) ===== */
  window.TZTOOLS = {
    /* [מפתח, אייקון, שם בתפריט, תיאור לכרטיס] — רק למנהל/ת */
    pages: function () {
      if (RK()) return [['h', IC.mic, 'ישיבת צוות', 'מקליטים את הישיבה, וניצה מחזירה סיכום, החלטות ומשימות לצ׳ק ליסט.']];
      return [['v', IC.vaad, 'הכנה לוועדה', 'קרן מכינה מסמך מהנתונים'], ['h', IC.mic, 'ישיבת הנהלה', 'הקלטה → סיכום ומשימות'],
              ['l', IC.letter, 'מכתבים', 'קב"ס, סיום לימודים, ומכתב חופשי'], ['e', IC.alert, 'אירוע חריג', 'מה עושים, צעד אחר צעד']];
    },
    owns: function (p) { return RK() ? p === 'h' : /^[vehl]$/.test(p); },
    html: function (p) { CUR = p; return '<div id="tzTool" data-p="' + p + '">' + ({ v: pageV, e: pageE, h: pageH, l: pageL }[p])() + '</div>'; },
    mount: function (p) { CUR = p; if (p === 'v') loadDocs('vaada'); if (p === 'h') loadDocs('meet'); },
    busy: function () { return REC.st === 'rec' || QBUSY; }
  };
})();
