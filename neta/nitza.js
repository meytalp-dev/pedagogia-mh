/* ניצה — העוזרת האישית בנטע, מרחב הרכזים הפדגוגיים (11.10.26). הועתק מקרן של צוהר (10.10.26).
   אותו שרת כמו קרן (Apps Script "קרן"); app=neta אומר לשרת לענות בשם ניצה. השמות הפנימיים (KEREN, kr-) נשארו.
   חלונית צפה בכל עמוד: שלוש כותרות גדולות (נתונים ומיפוי · נהלים וידע · תוכניות עבודה) ושאלות קטנות מתחתן,
   ושדה לשאלה חופשית. בקשה לבנות תוכנית → תוכנית שנשמרת ב"התוכניות שלי" (פרטית לבית הספר).
   השרת מאמת מול השער ומקבל רק את בית הספר של המחובר/ת. שום מפתח לא יושב כאן.
   מדבר עם app.js דרך window.TZOHAR. */
(function () {
  'use strict';
  var KEREN_EXEC = 'https://script.google.com/macros/s/AKfycbzvvBo-TR3sTUWpZSP7ChFJDJxUZ3ZNskiLaXXce4SydV9tW3w_0sZ79JBIH3VVvntZ/exec';   /* ריק = ניצה מוסתרת (מתג חירום) */
  var T = window.TZOHAR;
  if (!T) return;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function isMobile() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (window.matchMedia && matchMedia('(pointer:coarse)').matches && innerWidth < 900); }
  var IC = {
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16M8 16V9M13 16V6M18 16v-4"/></svg>',
    book:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/></svg>',
    list:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9l1.5 1.5L11 8M7 15l1.5 1.5L11 14M14 9h4M14 15h4"/></svg>',
    send:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/></svg>',
    x:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    plus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    copy:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2"/><rect x="6" y="14" width="12" height="7"/></svg>',
    mail:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    ok:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    edit:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>'
  };

  /* ===== השאלות בחלונית — לפי תפקיד. kind: ask | plan | fill (ממלא את השדה להשלמה) ===== */
  function cats() {
    if (T.role() === 'rakaz') return [
      ['chart', 'נתונים ומיפוי', [['ask', 'מה עולה מסקר האקלים על ההוראה והלמידה, ומה כדאי לעשות?'], ['ask', 'מה הכי דחוף אצלנו בתחום הפדגוגי?']]],
      ['book', 'נהלים וידע', [['ask', 'איך מנסחים יעד פדגוגי מדיד (SMART)?'], ['ask', 'איך מלווים מורה חדש/ה בשנה הראשונה?']]],
      ['list', 'תוכניות עבודה', [['plan', 'בני לי תוכנית עבודה פדגוגית שנתית לבית הספר'], ['fill', 'הכיני לי ישיבת צוות מורים על ']]]
    ];
    return [
      ['chart', 'נתונים ומיפוי', [['ask', 'מה הכי דחוף אצלנו השבוע?'], ['ask', 'מה עולה מסקר האקלים, ומה כדאי לעשות?']]],
      ['book', 'נהלים וידע', [['fill', 'מה אומר הנוהל על '], ['ask', 'מה התפקיד של כל אחד מבעלי התפקידים אצלנו?']]],
      ['list', 'תוכניות עבודה', [['plan', 'על פי שאלוני האקלים, בני לי תוכנית עבודה למחנכים וליועצים'], ['plan', 'אילו פעולות יקדמו אותי ליעדים מהוועדה המלווה? בני לי תוכנית']]]
    ];
  }
  function looksLikePlan(q) { return /תוכנית|תכנית|خطة/.test(q) && /(בני|תבני|תבנה|בנה|הכיני|תכיני|הכן|תכין|לבנות|ابن|ابني|اعد|حضر)/.test(q); }

  /* ===== רשת ===== */
  function call(body, ms) {
    body.token = T.token(); body.snap = T.snap(); body.app = 'neta';
    if (T.as()) { body.as = T.as(); body.asRole = T.role(); }
    return new Promise(function (res, rej) {
      var done = false, t = setTimeout(function () { if (!done) { done = true; rej(new Error('timeout')); } }, ms || 120000);
      fetch(KEREN_EXEC, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); }).then(function (j) { if (!done) { done = true; clearTimeout(t); if (j && j.left) setLeft(j.left.kind, j.left.n); if (j && j.quota) { QUOTA = j.quota; showLeft(); } res(j); } })
        .catch(function (e) { if (!done) { done = true; clearTimeout(t); rej(e); } });
    });
  }
  var ERR = { 'no-api-key': 'ניצה עוד לא הופעלה. מיטל מסדרת את זה.', badsession: 'פג הזמן של הכניסה. רענון הדף יבקש כניסה מחדש.',
              noschool: 'לא מצאנו לאיזה בית ספר שייך החשבון.', timeout: 'לקח יותר מדי זמן. נסו שוב בעוד רגע.' };
  function errText(e) { return ERR[e] || 'משהו השתבש. נסו שוב בעוד רגע.'; }

  /* ===== החלונית ===== */
  var HIST = [], BUSY = false;
  function build() {
    var fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'kr-fab'; fab.setAttribute('aria-label', 'ניצה, העוזרת שלך');
    fab.innerHTML = '<img src="brand/ozeret-avatar.png" alt=""><span>ניצה</span>';
    var p = document.createElement('div');
    p.className = 'kr-panel'; p.id = 'krPanel'; p.hidden = true;
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'ניצה');
    p.innerHTML = '<div class="kr-head"><img src="brand/ozeret.png" alt=""><div><b>היי, אני ניצה</b><small>העוזרת שלך בנטע</small></div>' +
      '<button type="button" class="kr-ib" id="krNew" title="שיחה חדשה" aria-label="שיחה חדשה">' + IC.plus + '</button>' +
      '<button type="button" class="kr-ib" id="krX" aria-label="סגירה">' + IC.x + '</button></div>' +
      '<div class="kr-ctx" id="krCtx" hidden></div>' +
      '<div class="kr-body" id="krBody"></div>' +
      '<form class="kr-in" id="krForm"><textarea id="krQ" rows="1" placeholder="שאלה על בית הספר, נוהל או תוכנית עבודה… · يمكن السؤال بالعربية" aria-label="שאלה לניצה"></textarea>' +
      '<button type="submit" aria-label="שליחה">' + IC.send + '</button></form><div class="kr-left" id="krLeft" aria-live="polite"></div>';
    document.body.appendChild(fab); document.body.appendChild(p);
    fab.onclick = function () { open(); };
    $('krX').onclick = close;
    $('krNew').onclick = function () { HIST = []; start(); };
    $('krCtx').onclick = function (e) { if (e.target.closest('[data-unplan]')) { unplan(); HIST = []; start(); } };
    $('krForm').onsubmit = function (e) { e.preventDefault(); var q = $('krQ').value.trim(); if (q) send(q, PCTX ? 'help' : looksLikePlan(q) ? 'plan' : 'ask'); };
    $('krQ').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('krForm').requestSubmit(); } });
    $('krQ').addEventListener('input', function () { this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 120) + 'px'; });
    $('krBody').addEventListener('click', onBodyClick);
    start();
  }
  /* 12.10.26 (סקירה): כמה שאלות ותוכניות נשארו היום — גלוי מתחת לתיבה. שאלה שנכשלה לא נספרת (בשרת) */
  var QUOTA = null;
  function setLeft(kind, n) { if (!QUOTA) QUOTA = {}; QUOTA[kind] = n; showLeft(); }
  function showLeft() {
    var el = $('krLeft'); if (!el || !QUOTA) return;
    var a = QUOTA.ask, pl = QUOTA.plan, parts = [];
    if (a !== undefined) parts.push(a === 1 ? 'שאלה אחת' : a + ' שאלות');
    if (pl !== undefined) parts.push(pl === 1 ? 'תוכנית אחת' : pl + ' תוכניות');
    el.textContent = parts.length ? 'נשארו היום: ' + parts.join(' · ') + ' · מתחדש בחצות' : '';
  }
  function open(prefill) {
    $('krPanel').hidden = false; document.body.classList.add('kr-on');
    if (!QUOTA) call({ action: 'quota' }, 30000).catch(function () {});
    if (prefill) { $('krQ').value = prefill; }
    setTimeout(function () { $('krQ').focus(); }, 50);
  }
  function close() { $('krPanel').hidden = true; document.body.classList.remove('kr-on', 'kr-dock'); }

  /* ===== ליד התוכנית (11.10.26, מיטל): העוזרת פתוחה לצד התוכנית שקוראים — עונה עליה ובונה חומרי עבודה
     (מערך לישיבת צוות, כלי מיפוי, הנחיה לצוות). חומר שאושר נוסף לתוכנית (plan.extras) ונשמר. ===== */
  var PCTX = null;   /* { p: התוכנית, el: המקום שבו היא מוצגת } */
  function suggest(j) {
    var out = [], seen = {};
    function put(t) { t = t.replace(/\s+/g, ' ').trim(); if (t && !seen[t] && out.length < 5) { seen[t] = 1; out.push(t); } }
    (j.tracks || []).forEach(function (t) {
      (t.actions || []).forEach(function (a) {
        var w = String(a.what || '').replace(/[.]$/, '');
        var cut = w.length > 70 ? w.slice(0, 70).replace(/\s+\S*$/, '') + '…' : w;
        if (out.length >= 2) return;
        if (/ישיב|מפגש|השתלמות|סדנ|הדרכ/.test(w)) put('מערך מוכן ל: ' + cut);
        else if (/מיפוי|מפה|סקר|שאלון/.test(w)) put('כלי מוכן ל: ' + cut);
      });
    });
    put('כלי מיפוי לתלמידי הכלה ושילוב');
    put('הנחיה קצרה לצוות: מה התוכנית מבקשת מכל אחד');
    put('מדדי הצלחה ודרך מעקב לכל מטרה');
    return out;
  }
  /* PCTX: { type: plan|task|office|aklim|vaad|yaad|tool, id, label, sug: [הצעות], hi: שורת פתיחה, p + el (בתוכנית), mine } */
  var CTX_SUG = {
    task:   ['הכיני לי את מה שהמשימה הזו דורשת', 'נוסח הודעה למי שמטפל/ת במשימה', 'רשימת בדיקה: מה צריך כדי לסיים אותה'],
    office: ['מה בדיוק צריך לעשות כדי לסגור את המשימה?', 'נוסח מייל למי שצריך לטפל בזה', 'רשימת בדיקה לסגירת המשימה'],
    aklim:  ['מה עולה מהתוצאות, ומה עושים עם זה בצוות?', 'מערך לפגישת למידה עם הצוות על הממצאים', 'שלושה צעדים לממד החלש ביותר'],
    vaad:   ['הכיני אותי לוועדה המלווה הבאה', 'תוכנית קצרה לפערים שעלו בוועדה', 'מה כדאי להציג בוועדה, ואיך'],
    yaad:   ['פרקי את היעדים לצעדים ולמדדים', 'מה הצוות צריך לעשות החודש כדי להתקדם ביעדים?', 'איך מודדים התקדמות באמצע השנה?'],
    tool:   ['התאימי את הכלי לבית הספר שלנו, ממולא בנתונים שלנו', 'איך משתמשים בכלי בישיבת צוות?']   /* 12.10.26: "דוגמה ממולאת" יצאה כמעט זהה להתאמה — אוחדו */
  };
  var CTX_HI = { plan: 'מה להכין לתוכנית?', task: 'איך לעזור במשימה?', office: 'איך לעזור במשימה?', aklim: 'מה לעשות עם תוצאות האקלים?',
                 vaad: 'במה לעזור לקראת הוועדה?', yaad: 'איך להתקדם ביעדים?', tool: 'איך להתאים את הכלי?' };
  function ctxMode(c) {
    PCTX = c; HIST = [];
    if (!c.sug) c.sug = CTX_SUG[c.type] || [];
    $('krCtx').hidden = false;
    $('krCtx').innerHTML = '<span>עובדת איתך על: <b>' + esc(c.label || '') + '</b></span>' +
      '<button type="button" data-unplan="1" aria-label="חזרה לשיחה כללית">' + IC.x + '</button>';
    start(); open();
    document.body.classList.add('kr-dock');
  }
  function planMode(p, el) {
    ctxMode({ type: 'plan', id: p.id, label: (p.plan && p.plan.title) || p.title || 'התוכנית', p: p, el: el, mine: p.mine, sug: suggest(p.plan || {}) });
  }
  /* מבחוץ (app.js / tasks.js): KEREN.helpWith({ type, id, title }) */
  function helpWith(o) {
    if (!o || !CTX_HI[o.type]) return;
    ctxMode({ type: o.type, id: String(o.id || ''), label: String(o.title || '').slice(0, 160), title: String(o.title || '').slice(0, 300) });
  }
  function unplan() {
    if (!PCTX) return;
    PCTX = null; $('krCtx').hidden = true; $('krCtx').innerHTML = '';
    document.body.classList.remove('kr-dock');
  }
  /* יציאה מהתוכנית (מעבר עמוד, חזרה לרשימה) — העוזרת נסגרת וחוזרת לשיחה הכללית */
  document.addEventListener('click', function (e) {
    if (!PCTX) return;
    if (e.target.closest('[data-page],[data-go],[data-kp="back"]') && !e.target.closest('#krPanel')) { unplan(); close(); HIST = []; start(); }
  }, true);
  function start() {
    var first = String((T.me() || {}).name || '').trim().split(/\s+/)[0];
    if (PCTX) {
      $('krBody').innerHTML = '<p class="kr-hi">' + (first ? esc(first) + ', ' : '') + (CTX_HI[PCTX.type] || 'במה לעזור?') + '</p>' +
        '<div class="kr-cat kr-c0"><div class="kr-ct">' + IC.spark + '<b>' + (PCTX.type === 'plan' ? 'חומרי עבודה מתוך התוכנית' : 'אפשר לבקש למשל') + '</b></div>' +
        PCTX.sug.map(function (q) { return '<button type="button" class="kr-q" data-kind="help" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>' +
        '<p class="kr-note">אפשר גם לכתוב בקשה משלך' + (PCTX.type === 'plan' ? ', למשל "תני לי מערך לישיבת צוות על…", או לשאול על התוכנית' : '') + '. ' +
        'בכלי מיפוי ניצה בונה את המסגרת, ואת הפרטים על התלמידים בית הספר ממלא אצלו.</p>';
      return;
    }
    $('krBody').innerHTML = '<p class="kr-hi">' + (first ? esc(first) + ', ' : '') + 'במה נתחיל?</p>' + cats().map(function (c, i) {
      return '<div class="kr-cat kr-c' + i + '"><div class="kr-ct">' + IC[c[0]] + '<b>' + esc(c[1]) + '</b></div>' +
        c[2].map(function (q) { return '<button type="button" class="kr-q" data-kind="' + q[0] + '" data-q="' + esc(q[1]) + '">' + esc(q[1].trim()) + (q[0] === 'fill' ? '…' : '') + '</button>'; }).join('') + '</div>';
    }).join('') + '<p class="kr-note">ניצה רואה רק את בית הספר שלך, ותוכניות שהיא בונה נשמרות ב"התוכניות שלי".</p>';
  }
  function onBodyClick(e) {
    var b = e.target.closest('[data-kind],[data-open],[data-copyans],[data-add],[data-addall],[data-gock],[data-go],[data-attach],[data-copymat]');
    if (!b) return;
    if (b.hasAttribute('data-open')) { close(); T.go('p', b.getAttribute('data-open')); return; }
    if (b.hasAttribute('data-go')) { close(); return; }   /* המעבר עצמו — ב-app.js */
    if (b.hasAttribute('data-gock')) { close(); T.go('c'); return; }
    var bub = b.closest('.kr-a');
    if (b.hasAttribute('data-copymat')) { copyRich(matDoc(bub._m), bub._m.answer || ''); return; }
    if (b.hasAttribute('data-attach')) { attach(bub._m, b); return; }
    if (b.hasAttribute('data-copyans')) { var rr = bub._r; copyRich(rr && rr.groups ? answerDoc(rr) : answerHtml(bub.getAttribute('data-raw')), bub.getAttribute('data-raw')); return; }
    if (b.hasAttribute('data-add')) {
      var ix = b.getAttribute('data-add').split('.');
      addTasks(bub, [bub._r.groups[+ix[0]].items[+ix[1]]], [b]); return;
    }
    if (b.hasAttribute('data-addall')) {
      var btns = [].slice.call(bub.querySelectorAll('.kr-add:not(.on)'));
      if (!btns.length) return;
      var items = btns.map(function (x) { var i = x.getAttribute('data-add').split('.'); return bub._r.groups[+i[0]].items[+i[1]]; });
      if (window.TZCONFIRMTASKS && !TZCONFIRMTASKS(items)) return;   /* רואים מה ייכנס לפני ההוספה (סקירה 12.10.26) */
      addTasks(bub, items, btns.concat([b])); return;
    }
    var kind = b.getAttribute('data-kind'), q = b.getAttribute('data-q');
    if (kind === 'fill') { $('krQ').value = q; $('krQ').focus(); return; }
    send(q, kind);
  }
  function bubble(html, cls) {
    if ($('krBody').querySelector('.kr-hi')) $('krBody').innerHTML = '';
    var d = document.createElement('div'); d.className = 'kr-m ' + cls; d.innerHTML = html;
    $('krBody').appendChild(d); $('krBody').scrollTop = $('krBody').scrollHeight;
    return d;
  }
  function send(q, kind) {
    if (BUSY) return;
    BUSY = true; $('krQ').value = ''; $('krQ').style.height = 'auto';
    bubble(esc(q), 'kr-u');
    if (kind === 'help' && !PCTX) kind = 'ask';
    var wait = bubble('<span class="kr-dots"><i></i><i></i><i></i></span> ' + (kind === 'help' ? 'ניצה מכינה — זה לוקח כחצי דקה…' : kind === 'plan' ? 'ניצה בונה את התוכנית — זה לוקח כדקה…' : 'ניצה חושבת…'), 'kr-b kr-wait');
    var body = kind === 'help' ? { action: 'planHelp', id: PCTX.type === 'plan' ? PCTX.id : '', ctx: { type: PCTX.type, id: PCTX.id, title: PCTX.title || PCTX.label }, request: q, history: HIST.slice(-4) } :
               kind === 'plan' ? { action: 'plan', request: q } : { action: 'ask', question: q, history: HIST.slice(-6) };
    call(body, kind === 'plan' ? 180000 : 150000).then(function (r) {
      wait.remove();
      if (!r || !r.ok) throw new Error(r && r.error || 'x');
      if (kind === 'help') {
        if (r.limited) return bubble(esc(r.message), 'kr-b');
        var hd = bubble(matView(r) + (r.sources && r.sources.length ? '<div class="kr-src">' + r.sources.map(esc).join(' · ') + '</div>' : '') +
          '<div class="kr-acts">' + (r.kind === 'material' && PCTX && PCTX.type === 'plan' && PCTX.mine ? '<button type="button" class="kr-all" data-attach="1">' + IC.plus + 'הוספה לתוכנית</button>' : '') +
          '<button type="button" data-copymat="1">' + IC.copy + 'העתקה</button></div>', 'kr-b kr-a kr-mat');
        hd._m = r;
        HIST.push({ role: 'user', content: q }, { role: 'assistant', content: String(r.answer || '').slice(0, 2500) });
      } else if (kind === 'plan') {
        if (r.limited) return bubble(esc(r.message), 'kr-b');
        PLANS = null;
        bubble('<b>התוכנית מוכנה: ' + esc(r.plan.title) + '</b><div class="kr-s">נשמרה ב"התוכניות שלי". אפשר לערוך, להדפיס ולשלוח לצוות.</div>' +
          '<button type="button" class="kr-go" data-open="' + esc(r.plan.id) + '">לפתיחת התוכנית</button>', 'kr-b');
        HIST.push({ role: 'user', content: q }, { role: 'assistant', content: 'בניתי תוכנית: ' + r.plan.title });
      } else {
        var acts = (r.groups || []).reduce(function (n, g) { return n + (g.items || []).filter(isTask).length; }, 0);
        var d = bubble((r.groups ? answerView(r) : answerHtml(r.answer)) +
          (r.sources && r.sources.length ? '<div class="kr-src">' + r.sources.map(esc).join(' · ') + '</div>' : '') +
          (r.limited ? '' : '<div class="kr-acts">' + (acts > 1 && tasksOn() ? '<button type="button" class="kr-all" data-addall="1">' + IC.plus + 'הוספת כל ' + acts + ' המשימות לצ\'ק ליסט</button>' : '') +
            '<button type="button" data-copyans="1">' + IC.copy + 'העתקה</button></div>'), 'kr-b kr-a');
        d.setAttribute('data-raw', r.answer);
        d._r = r;
        if (!r.limited) HIST.push({ role: 'user', content: q }, { role: 'assistant', content: r.answer });
      }
    }).catch(function (e) {
      wait.remove();
      bubble(esc(errText(String(e.message))), 'kr-b kr-err');
    }).then(function () { BUSY = false; });
  }
  /* ===== תשובה במבנה (11.10.26): שורה תחתונה, קבוצות, ולכל פריט מי · עד מתי · מקור, כפתור לטופס, והוספה לצ'ק ליסט ===== */
  function tasksOn() { return !!(window.TZTASKS && TZTASKS.enabled()); }
  function isTask(x) { return !!(x && (x.who || x.due || x.link)); }
  function answerView(r) {
    var TT = window.TZTASKS;
    return '<p class="kr-lead">' + esc(r.lead) + '</p>' + (r.groups || []).map(function (g, gi) {
      return '<div class="kr-g"><h4>' + esc(g.title) + '</h4>' + (g.items || []).map(function (x, ii) {
        var meta = [x.who ? esc(x.who) : '', x.due && TT ? 'עד ' + TT.heDate(x.due) : ''].filter(Boolean).join(' · ');
        var btn = TT && x.link ? TT.linkBtn(x.link, 'kr-lb') : '';
        var add = isTask(x) && tasksOn() ? '<button type="button" class="kr-add" data-add="' + gi + '.' + ii + '" aria-label="הוספה לצ\'ק ליסט">' + IC.plus + 'לצ\'ק ליסט</button>' : '';
        return '<div class="kr-it"><div class="kr-itx">' + esc(x.text) + '</div>' +
          (meta || x.src ? '<div class="kr-im">' + meta + (x.src ? '<span class="kr-sc">' + esc(x.src) + '</span>' : '') + '</div>' : '') +
          (btn || add ? '<div class="kr-ia">' + btn + add + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    }).join('') + (r.tail ? '<p class="kr-tail">' + esc(r.tail) + '</p>' : '');
  }
  /* חומר עבודה: שורה תחתונה, ואז חלקים — פסקה, פריטים וטבלה (בכלי מיפוי: עמודות ושורות ריקות למילוי) */
  function matSections(m, doc) {
    return (m.sections || []).map(function (s) {
      var t = (s.cols || []).length ? '<div class="kr-tw"><table class="kr-t"><tr>' + s.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>' +
        (s.rows || []).map(function (row) { return '<tr>' + row.map(function (c) { return '<td>' + (c ? esc(c) : (doc ? '&nbsp;' : '<span class="kr-blank"></span>')) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>' : '';
      return '<h4>' + esc(s.heading) + '</h4>' + (s.text ? '<p>' + esc(s.text) + '</p>' : '') +
        ((s.items || []).length ? '<ul>' + s.items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + t;
    }).join('');
  }
  function matView(m) {
    return (m.kind === 'material' && m.title ? '<p class="kr-mt">' + IC.spark + esc(m.title) + '</p>' : '') +
      (m.lead ? '<p class="kr-lead">' + esc(m.lead) + '</p>' : '') + matSections(m) + (m.tail ? '<p class="kr-tail">' + esc(m.tail) + '</p>' : '');
  }
  function matDoc(m) {
    return (m.title ? '<h3>' + esc(m.title) + '</h3>' : '') + (m.lead ? '<p><b>' + esc(m.lead) + '</b></p>' : '') +
      matSections(m, true).replace(/<div class="kr-tw">|<\/table><\/div>/g, function (x) { return x.indexOf('div class') > -1 ? '' : '</table>'; })
        .replace(/<table class="kr-t">/g, '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%">') + (m.tail ? '<p>' + esc(m.tail) + '</p>' : '');
  }
  function attach(m, btn) {
    if (!PCTX) return;
    var p = PCTX.p, j = JSON.parse(JSON.stringify(p.plan || {}));
    j.extras = (j.extras || []).concat([{ id: Math.random().toString(36).slice(2, 10), title: m.title || 'חומר לתוכנית', forPart: m.forPart || '', lead: m.lead || '',
      sections: m.sections || [], created: new Date().toISOString().slice(0, 10) }]);
    btn.disabled = true;
    call({ action: 'planSave', id: p.id, plan: j }, 60000).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.error || 'x');
      p.plan = j; p.updated = r.updated;
      btn.classList.add('on'); btn.innerHTML = IC.ok + 'נוסף לתוכנית';
      if (PCTX && PCTX.el && document.body.contains(PCTX.el)) {
        mountPlans(PCTX.el);
        var x = document.getElementById('krx-' + j.extras[j.extras.length - 1].id);
        if (x) { x.open = true; x.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      }
      T.toast('נוסף לתוכנית');
    }).catch(function (e) { btn.disabled = false; T.toast(String(e.message) === 'toolong' ? 'התוכנית מלאה מדי. אפשר להסיר חומר ישן ולנסות שוב.' : 'ההוספה נכשלה. נסו שוב.'); });
  }

  /* להעתקה ולמייל — HTML פשוט */
  function answerDoc(r) {
    return '<p><b>' + esc(r.lead) + '</b></p>' + (r.groups || []).map(function (g) {
      return '<h4>' + esc(g.title) + '</h4><ul>' + (g.items || []).map(function (x) {
        var m = [x.who, x.due && window.TZTASKS ? 'עד ' + TZTASKS.heDate(x.due) : ''].filter(Boolean).join(' · ');
        return '<li>' + esc(x.text) + (m ? ' — ' + esc(m) : '') + (x.src ? ' <small>(' + esc(x.src) + ')</small>' : '') + '</li>';
      }).join('') + '</ul>';
    }).join('') + (r.tail ? '<p>' + esc(r.tail) + '</p>' : '');
  }
  function addTasks(bub, list, btns) {
    btns.forEach(function (b) { b.disabled = true; });
    TZTASKS.add(list.map(function (x) { return { text: x.text, who: x.who, due: x.due || TZTASKS.nextSunday(), link: x.link, src: x.src }; }), 'keren').then(function () {
      btns.forEach(function (b) { b.classList.add('on'); b.innerHTML = IC.ok + 'בצ\'ק ליסט'; });
      var all = bub.querySelector('[data-addall]');
      if (all && !bub.querySelector('.kr-add:not(.on)')) { all.disabled = true; all.classList.add('on'); all.innerHTML = IC.ok + 'הכול בצ\'ק ליסט'; }
      if (!bub.querySelector('.kr-gock')) {
        var g = document.createElement('button'); g.type = 'button'; g.className = 'kr-gock'; g.setAttribute('data-gock', '1'); g.textContent = 'לצ\'ק ליסט האישי ←';
        bub.querySelector('.kr-acts').appendChild(g);
      }
      T.toast(list.length > 1 ? list.length + ' משימות נוספו לצ\'ק ליסט' : 'נוסף לצ\'ק ליסט');
    }).catch(function () { btns.forEach(function (b) { b.disabled = false; }); T.toast('ההוספה נכשלה. נסו שוב.'); });
  }
  /* תשובה ישנה (טקסט): "- " = נקודה, שורה שמסתיימת בנקודתיים = כותרת. השורה הראשונה מודגשת */
  function answerHtml(t) {
    var lines = String(t || '').split('\n'), out = '', ul = false;
    lines.forEach(function (l, i) {
      var s = l.trim();
      if (!s) return;
      if (/^[-•]\s+/.test(s)) { if (!ul) { out += '<ul>'; ul = true; } out += '<li>' + esc(s.replace(/^[-•]\s+/, '')) + '</li>'; return; }
      if (ul) { out += '</ul>'; ul = false; }
      out += /:$/.test(s) && s.length < 70 ? '<h4>' + esc(s) + '</h4>' : '<p' + (i === 0 ? ' class="kr-lead"' : '') + '>' + esc(s) + '</p>';
    });
    return out + (ul ? '</ul>' : '');
  }

  /* ===== העתקה, הדפסה ומייל ===== */
  function rtlize(html) {
    return '<div dir="rtl" style="direction:rtl;text-align:right;font-family:Arial,sans-serif;font-size:15px;line-height:1.6">' +
      html.replace(/<(h2|h3|h4|p|ul|ol|li|table|td|th)(\s|>)/g, '<$1 dir="rtl" style="direction:rtl;text-align:right"$2') + '</div>';
  }
  function copyRich(html, text) {
    var h = rtlize(html), ok = false;
    function onCopy(ev) { ev.clipboardData.setData('text/html', h); ev.clipboardData.setData('text/plain', text); ev.preventDefault(); }
    document.addEventListener('copy', onCopy);
    try {
      var d = document.createElement('div'); d.contentEditable = 'true'; d.innerHTML = h; d.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(d);
      var r = document.createRange(); r.selectNodeContents(d); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      ok = document.execCommand('copy'); sel.removeAllRanges(); document.body.removeChild(d);
    } catch (e) { ok = false; }
    document.removeEventListener('copy', onCopy);
    T.toast(ok ? 'הועתק' : 'ההעתקה לא הצליחה');
    return ok;
  }

  /* ===== התוכניות שלי ===== */
  var PLANS = null, OPENID = '', EDIT = false;
  function loadPlans() {
    return call({ action: 'plans' }, 60000).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.error || 'x');
      PLANS = r.plans || []; return PLANS;
    });
  }
  function mountPlans(el, id) {
    if (id) OPENID = id;
    if (!KEREN_EXEC) { el.innerHTML = '<div class="card"><div class="empty">ניצה עוד לא הופעלה.</div></div>'; return; }
    if (!PLANS) {
      el.innerHTML = '<div class="card"><div class="empty">טוען את התוכניות…</div></div>';
      loadPlans().then(function () { mountPlans(el); }, function (e) { el.innerHTML = '<div class="card"><div class="empty">' + esc(errText(String(e.message))) + '</div></div>'; });
      return;
    }
    var p = OPENID && PLANS.filter(function (x) { return x.id === OPENID; })[0];
    if (!p && PCTX) unplan();
    el.innerHTML = p ? planPage(p) : listPage();
    wire(el, p);
  }
  function roleLbl(p) { return p.role === 'rakaz' ? 'תוכנית פדגוגית · של הרכז/ת' : 'תוכנית בית ספרית'; }
  function listPage() {
    var rk = T.role() === 'rakaz';
    var h = '<div class="card head"><h1>התוכניות שלי</h1><div class="meta">תוכניות העבודה שניצה בנתה ' + (rk ? 'לך' : 'לבית הספר') +
      '. הן פרטיות לבית הספר' + (rk ? ', והמנהל/ת רואה אותן.' : ' — כולל התוכניות הפדגוגיות של הרכז/ת.') + '</div>' +
      '<div class="acts" style="margin-top:12px"><button type="button" class="btn amber" data-kp="new">' + IC.plus + 'תוכנית חדשה עם ניצה</button></div></div>';
    if (!PLANS.length) return h + '<div class="card"><div class="empty">עוד אין תוכניות. אפשר לבקש מניצה, למשל: "' + esc(cats()[2][2][0][1]) + '".</div></div>';
    return h + '<div class="tiles" style="margin-top:14px">' + PLANS.map(function (p) {
      return '<button type="button" class="tile kr-pt" data-kp="open" data-id="' + esc(p.id) + '"><b>' + esc(p.title || 'תוכנית') + '</b>' +
        '<span>' + esc(roleLbl(p)) + ' · עודכנה ' + esc(fmt(p.updated)) + '</span><span>' + esc(p.request) + '</span></button>';
    }).join('') + '</div>';
  }
  function fmt(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (+m[3]) + '.' + (+m[2]) + '.' + m[1] : s; }
  function ce(path, val, tag, cls) {
    tag = tag || 'span';
    return '<' + tag + (cls ? ' class="' + cls + '"' : '') + ' data-k="' + path + '"' + (EDIT ? ' contenteditable="true"' : '') + '>' + esc(val) + '</' + tag + '>';
  }
  function planBody(j, forDoc) {
    var e = forDoc ? function (p, v, t) { return '<' + (t || 'span') + '>' + esc(v) + '</' + (t || 'span') + '>'; } : ce;
    return (j.basis ? e('basis', j.basis, 'p', 'kr-basis') : '') +
      '<h3>מטרות לשנה</h3><table class="kr-t"><tr><th>מטרה</th><th>מדד הצלחה</th></tr>' + (j.goals || []).map(function (g, i) {
        return '<tr><td>' + e('goals.' + i + '.goal', g.goal) + (g.src ? '<small> (' + esc(g.src) + ')</small>' : '') + '</td><td data-l="מדד הצלחה">' + e('goals.' + i + '.measure', g.measure) + '</td></tr>';
      }).join('') + '</table>' +
      (j.tracks || []).map(function (t, ti) {
        return '<h3>' + e('tracks.' + ti + '.name', t.name) + '</h3><table class="kr-t"><tr><th>פעולה</th><th>מי</th><th>מתי</th><th>איך יודעים</th></tr>' +
          (t.actions || []).map(function (a, ai) {
            var b = 'tracks.' + ti + '.actions.' + ai + '.';
            return '<tr><td>' + e(b + 'what', a.what) + '</td><td data-l="מי">' + e(b + 'who', a.who) + '</td><td data-l="מתי">' + e(b + 'when', a.when) + '</td><td data-l="איך יודעים">' + e(b + 'measure', a.measure) + '</td></tr>';
          }).join('') + '</table>';
      }).join('') +
      '<h3>לוח השנה</h3><table class="kr-t">' + (j.months || []).map(function (m, mi) {
        return '<tr><th>' + esc(m.period) + '</th><td><ul>' + (m.items || []).map(function (x, xi) { return '<li>' + e('months.' + mi + '.items.' + xi, x) + '</li>'; }).join('') + '</ul></td></tr>';
      }).join('') + '</table>' +
      ((j.first || []).length ? '<h3>הצעדים הראשונים</h3><ol>' + j.first.map(function (x, i) { return '<li>' + e('first.' + i, x) + '</li>'; }).join('') + '</ol>' : '') +
      (j.missing && !forDoc ? '<p class="small">מה היה עוזר לתוכנית מדויקת יותר: ' + esc(j.missing) + '</p>' : '') +
      extrasHtml(j, forDoc);
  }
  var PLANMINE = false;
  function extrasHtml(j, forDoc) {
    var X = j.extras || [];
    if (!X.length) return '';
    if (forDoc) return '<h3>חומרים לתוכנית</h3>' + X.map(function (x) { return matDoc(x); }).join('');
    return '<h3 class="kr-xh">' + IC.spark + 'חומרים לתוכנית</h3>' + X.map(function (x) {
      return '<details class="kr-x" id="krx-' + esc(x.id) + '"><summary><b>' + esc(x.title) + '</b>' + (x.forPart ? '<small>' + esc(x.forPart) + '</small>' : '') + '</summary>' +
        '<div class="kr-xb">' + (x.lead ? '<p class="kr-lead">' + esc(x.lead) + '</p>' : '') + matSections(x) +
        '<div class="acts"><button type="button" class="btn sm" data-kp="xcopy" data-x="' + esc(x.id) + '">' + IC.copy + 'העתקה</button>' +
        (EDIT || !PLANMINE ? '' : '<button type="button" class="btn sm" data-kp="xdel" data-x="' + esc(x.id) + '" style="color:var(--bad)">' + IC.trash + 'הסרה מהתוכנית</button>') + '</div></div></details>';
    }).join('');
  }
  function planPage(p) {
    var j = p.plan || {}, mine = p.mine;
    PLANMINE = !!mine;
    var mailA = '';
    if (isMobile()) mailA = '<a class="btn" href="mailto:?subject=' + encodeURIComponent(j.title || 'תוכנית עבודה') + '&body=' + encodeURIComponent(planPlain(j)) + '">' + IC.mail + 'מייל</a>';
    else mailA = '<button type="button" class="btn" data-kp="gmail">' + IC.mail + 'מייל (Gmail)</button><a class="btn sm" href="mailto:?subject=' + encodeURIComponent(j.title || 'תוכנית עבודה') + '" data-kp="outlook">בתוכנת המייל (Outlook)</a>';
    return '<button type="button" class="btn sm" data-kp="back" style="margin-bottom:10px">→ לכל התוכניות</button>' +
      '<div class="card kr-plan" id="krPlan"><p class="eyebrow">' + esc(roleLbl(p)) + ' · עודכנה ' + esc(fmt(p.updated)) + '</p>' +
      '<h1>' + ce('title', j.title || 'תוכנית עבודה') + '</h1>' +
      '<p class="small">הבקשה: ' + esc(p.request) + '</p>' +
      (EDIT ? '' : '<div class="kr-work"><button type="button" class="btn amber" data-kp="work">' + IC.spark + 'עבודה על התוכנית עם ניצה</button>' +
        '<span class="small">מערך לישיבת צוות, כלי מיפוי, הנחיה לצוות — מתוך מה שכתוב כאן</span></div>') +
      (EDIT ? '<div class="note">מצב עריכה: לוחצים על כל טקסט ומשנים. בסוף — "שמירה".</div>' : '') +
      planBody(j) + '</div>' +
      '<div class="acts" style="margin-top:12px">' +
      (mine ? (EDIT ? '<button type="button" class="btn primary" data-kp="save">שמירה</button><button type="button" class="btn" data-kp="cancel">ביטול</button>'
                    : '<button type="button" class="btn primary" data-kp="edit">' + IC.edit + 'עריכה</button>') : '<span class="small">התוכנית של הרכז/ת — לקריאה בלבד.</span>') +
      (EDIT ? '' : '<button type="button" class="btn" data-kp="copy">' + IC.copy + 'העתקה</button>' +
        (isMobile() ? '' : '<button type="button" class="btn" data-kp="print">' + IC.print + 'הדפסה</button>') + mailA +
        (mine ? '<button type="button" class="btn sm" data-kp="del" style="margin-inline-start:auto;color:var(--bad)">מחיקה</button>' : '')) + '</div>';
  }
  function planDocHtml(j) { return '<h2>' + esc(j.title || 'תוכנית עבודה') + '</h2>' + planBody(j, true); }
  function planPlain(j) {
    return [(j.title || ''), (j.basis || ''), 'מטרות:', (j.goals || []).map(function (g) { return '- ' + g.goal + ' (מדד: ' + g.measure + ')'; }).join('\n')]
      .concat((j.tracks || []).map(function (t) { return t.name + ':\n' + (t.actions || []).map(function (a) { return '- ' + a.what + ' · ' + a.who + ' · ' + a.when; }).join('\n'); }))
      .concat(['לוח השנה:', (j.months || []).map(function (m) { return m.period + ': ' + (m.items || []).join(' · '); }).join('\n')])
      .concat((j.first || []).length ? ['הצעדים הראשונים:', j.first.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n')] : [])
      .filter(Boolean).join('\n\n').slice(0, 6000);
  }
  function collect(el, j) {
    var o = JSON.parse(JSON.stringify(j));
    el.querySelectorAll('[data-k]').forEach(function (n) {
      var path = n.getAttribute('data-k').split('.'), cur = o;
      for (var i = 0; i < path.length - 1; i++) cur = cur[/^\d+$/.test(path[i]) ? +path[i] : path[i]];
      var last = path[path.length - 1];
      cur[/^\d+$/.test(last) ? +last : last] = n.textContent.replace(/\s+/g, ' ').trim();
    });
    return o;
  }
  function wire(el, p) {
    el.onclick = function (e) {
      var b = e.target.closest('[data-kp]'); if (!b) return;
      var k = b.getAttribute('data-kp');
      if (k === 'new') { open(cats()[2][2][0][1]); }
      else if (k === 'open') { OPENID = b.getAttribute('data-id'); EDIT = false; mountPlans(el); scrollTo(0, 0); }
      else if (k === 'back') { OPENID = ''; EDIT = false; mountPlans(el); }
      else if (k === 'work') { planMode(p, el); }
      else if (k === 'xcopy') { var xx = (p.plan.extras || []).filter(function (x) { return x.id === b.getAttribute('data-x'); })[0]; if (xx) copyRich(matDoc(xx), xx.title); }
      else if (k === 'xdel') {
        var xid = b.getAttribute('data-x'), x0 = (p.plan.extras || []).filter(function (x) { return x.id === xid; })[0];
        if (!x0 || !confirm('להסיר מהתוכנית את "' + x0.title + '"?')) return;
        var j2 = JSON.parse(JSON.stringify(p.plan)); j2.extras = (j2.extras || []).filter(function (x) { return x.id !== xid; });
        call({ action: 'planSave', id: p.id, plan: j2 }, 60000).then(function (r) {
          if (!r || !r.ok) throw new Error();
          p.plan = j2; p.updated = r.updated; mountPlans(el); T.toast('הוסר');
        }).catch(function () { T.toast('ההסרה נכשלה'); });
      }
      else if (k === 'edit') { EDIT = true; mountPlans(el); }
      else if (k === 'cancel') { EDIT = false; mountPlans(el); }
      else if (k === 'save') {
        var j = collect($('krPlan'), p.plan);
        b.disabled = true;
        call({ action: 'planSave', id: p.id, plan: j }, 60000).then(function (r) {
          if (!r || !r.ok) throw new Error(r && r.error || 'x');
          p.plan = j; p.title = j.title; p.updated = r.updated; EDIT = false; mountPlans(el); T.toast('נשמר');
        }).catch(function () { b.disabled = false; T.toast('השמירה נכשלה. נסו שוב.'); });
      }
      else if (k === 'del') {
        if (!confirm('למחוק את התוכנית "' + (p.title || '') + '"?')) return;
        call({ action: 'planDel', id: p.id }, 60000).then(function (r) {
          if (!r || !r.ok) throw new Error();
          PLANS = PLANS.filter(function (x) { return x.id !== p.id; }); OPENID = ''; mountPlans(el); T.toast('נמחקה');
        }).catch(function () { T.toast('המחיקה נכשלה'); });
      }
      else if (k === 'copy') copyRich(planDocHtml(p.plan), planPlain(p.plan));
      else if (k === 'gmail') {
        var ok = copyRich(planDocHtml(p.plan), planPlain(p.plan));
        window.open('https://mail.google.com/mail/?view=cm&fs=1&su=' + encodeURIComponent(p.plan.title || 'תוכנית עבודה') + (ok ? '' : '&body=' + encodeURIComponent(planPlain(p.plan))), '_blank', 'noopener');
        if (ok) T.toast('התוכנית הועתקה. לחצו בגוף המייל ו-Ctrl+V');
      }
      else if (k === 'outlook') { copyRich(planDocHtml(p.plan), planPlain(p.plan)); }
      else if (k === 'print') {
        var w = window.open('', '_blank');
        if (!w) return;
        w.document.write('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>' + esc(p.plan.title || '') + '</title><style>' +
          'body{font-family:Arial,sans-serif;direction:rtl;margin:28px;color:#1c2a2d;font-size:13px;line-height:1.5}h2{color:#26505e}h3{color:#26505e;margin:18px 0 6px}' +
          'table{border-collapse:collapse;width:100%}td,th{border:1px solid #cfdcdc;padding:6px 8px;text-align:right;vertical-align:top}th{background:#eef5f5}ul,ol{margin:0;padding-inline-start:18px}small{color:#5f6f72}' +
          '</style></head><body><p style="color:#5f6f72">' + esc(T.school().name) + ' · ' + esc(roleLbl(p)) + '</p>' + planDocHtml(p.plan) + '</body></html>');
        w.document.close(); setTimeout(function () { w.print(); }, 300);
      }
    };
  }

  window.KEREN = { open: open, mountPlans: mountPlans, enabled: function () { return !!KEREN_EXEC; }, call: call, helpWith: helpWith, name: 'ניצה',   /* call — גם לצ'ק ליסט (tasks.js) */
                   _setExec: function (u) { KEREN_EXEC = u; } };   /* _setExec — לבדיקות בלבד */
  function boot() { if (KEREN_EXEC && !document.querySelector('.kr-fab')) build(); }
  document.addEventListener('tzohar:ready', boot);
  if (T.ready && T.ready()) boot();
})();
