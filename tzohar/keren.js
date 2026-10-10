/* קרן — העוזרת האישית בצוהר (10.10.26).
   חלונית צפה בכל עמוד: שלוש כותרות גדולות (נתונים ומיפוי · נהלים וידע · תוכניות עבודה) ושאלות קטנות מתחתן,
   ושדה לשאלה חופשית. בקשה לבנות תוכנית → תוכנית שנשמרת ב"התוכניות שלי" (פרטית לבית הספר).
   השרת (Apps Script "קרן") מאמת מול השער ומקבל רק את בית הספר של המחובר/ת. שום מפתח לא יושב כאן.
   מדבר עם app.js דרך window.TZOHAR. */
(function () {
  'use strict';
  var KEREN_EXEC = 'https://script.google.com/macros/s/AKfycbzvvBo-TR3sTUWpZSP7ChFJDJxUZ3ZNskiLaXXce4SydV9tW3w_0sZ79JBIH3VVvntZ/exec';   /* ריק = קרן מוסתרת (מתג חירום) */
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
    body.token = T.token(); body.snap = T.snap();
    if (T.as()) { body.as = T.as(); body.asRole = T.role(); }
    return new Promise(function (res, rej) {
      var done = false, t = setTimeout(function () { if (!done) { done = true; rej(new Error('timeout')); } }, ms || 120000);
      fetch(KEREN_EXEC, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); }).then(function (j) { if (!done) { done = true; clearTimeout(t); res(j); } })
        .catch(function (e) { if (!done) { done = true; clearTimeout(t); rej(e); } });
    });
  }
  var ERR = { 'no-api-key': 'קרן עוד לא הופעלה. מיטל מסדרת את זה.', badsession: 'פג הזמן של הכניסה. רענון הדף יבקש כניסה מחדש.',
              noschool: 'לא מצאנו לאיזה בית ספר שייך החשבון.', timeout: 'לקח יותר מדי זמן. נסו שוב בעוד רגע.' };
  function errText(e) { return ERR[e] || 'משהו השתבש. נסו שוב בעוד רגע.'; }

  /* ===== החלונית ===== */
  var HIST = [], BUSY = false;
  function build() {
    var fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'kr-fab'; fab.setAttribute('aria-label', 'קרן, העוזרת שלך');
    fab.innerHTML = '<img src="brand/keren-avatar.png" alt=""><span>קרן</span>';
    var p = document.createElement('div');
    p.className = 'kr-panel'; p.id = 'krPanel'; p.hidden = true;
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'קרן');
    p.innerHTML = '<div class="kr-head"><img src="brand/keren.png" alt=""><div><b>היי, אני קרן</b><small>העוזרת שלך בצוהר</small></div>' +
      '<button type="button" class="kr-ib" id="krNew" title="שיחה חדשה" aria-label="שיחה חדשה">' + IC.plus + '</button>' +
      '<button type="button" class="kr-ib" id="krX" aria-label="סגירה">' + IC.x + '</button></div>' +
      '<div class="kr-body" id="krBody"></div>' +
      '<form class="kr-in" id="krForm"><textarea id="krQ" rows="1" placeholder="אפשר לשאול כל דבר… · يمكن السؤال بالعربية" aria-label="שאלה לקרן"></textarea>' +
      '<button type="submit" aria-label="שליחה">' + IC.send + '</button></form>';
    document.body.appendChild(fab); document.body.appendChild(p);
    fab.onclick = function () { open(); };
    $('krX').onclick = close;
    $('krNew').onclick = function () { HIST = []; start(); };
    $('krForm').onsubmit = function (e) { e.preventDefault(); var q = $('krQ').value.trim(); if (q) send(q, looksLikePlan(q) ? 'plan' : 'ask'); };
    $('krQ').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('krForm').requestSubmit(); } });
    $('krQ').addEventListener('input', function () { this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 120) + 'px'; });
    $('krBody').addEventListener('click', onBodyClick);
    start();
  }
  function open(prefill) {
    $('krPanel').hidden = false; document.body.classList.add('kr-on');
    if (prefill) { $('krQ').value = prefill; }
    setTimeout(function () { $('krQ').focus(); }, 50);
  }
  function close() { $('krPanel').hidden = true; document.body.classList.remove('kr-on'); }
  function start() {
    var first = String((T.me() || {}).name || '').trim().split(/\s+/)[0];
    $('krBody').innerHTML = '<p class="kr-hi">' + (first ? esc(first) + ', ' : '') + 'במה נתחיל?</p>' + cats().map(function (c, i) {
      return '<div class="kr-cat kr-c' + i + '"><div class="kr-ct">' + IC[c[0]] + '<b>' + esc(c[1]) + '</b></div>' +
        c[2].map(function (q) { return '<button type="button" class="kr-q" data-kind="' + q[0] + '" data-q="' + esc(q[1]) + '">' + esc(q[1].trim()) + (q[0] === 'fill' ? '…' : '') + '</button>'; }).join('') + '</div>';
    }).join('') + '<p class="kr-note">קרן רואה רק את בית הספר שלך, ותוכניות שהיא בונה נשמרות ב"התוכניות שלי".</p>';
  }
  function onBodyClick(e) {
    var b = e.target.closest('[data-kind],[data-open],[data-copyans]');
    if (!b) return;
    if (b.hasAttribute('data-open')) { close(); T.go('p', b.getAttribute('data-open')); return; }
    if (b.hasAttribute('data-copyans')) { copyRich(answerHtml(b.closest('.kr-a').getAttribute('data-raw')), b.closest('.kr-a').getAttribute('data-raw')); return; }
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
    var wait = bubble('<span class="kr-dots"><i></i><i></i><i></i></span> ' + (kind === 'plan' ? 'קרן בונה את התוכנית — זה לוקח כדקה…' : 'קרן חושבת…'), 'kr-b kr-wait');
    var body = kind === 'plan' ? { action: 'plan', request: q } : { action: 'ask', question: q, history: HIST.slice(-6) };
    call(body, kind === 'plan' ? 180000 : 90000).then(function (r) {
      wait.remove();
      if (!r || !r.ok) throw new Error(r && r.error || 'x');
      if (kind === 'plan') {
        if (r.limited) return bubble(esc(r.message), 'kr-b');
        PLANS = null;
        bubble('<b>התוכנית מוכנה: ' + esc(r.plan.title) + '</b><div class="kr-s">נשמרה ב"התוכניות שלי". אפשר לערוך, להדפיס ולשלוח לצוות.</div>' +
          '<button type="button" class="kr-go" data-open="' + esc(r.plan.id) + '">לפתיחת התוכנית</button>', 'kr-b');
        HIST.push({ role: 'user', content: q }, { role: 'assistant', content: 'בניתי תוכנית: ' + r.plan.title });
      } else {
        var d = bubble(answerHtml(r.answer) + (r.sources && r.sources.length ? '<div class="kr-src">' + r.sources.map(esc).join(' · ') + '</div>' : '') +
          (r.limited ? '' : '<div class="kr-acts"><button type="button" data-copyans="1">' + IC.copy + 'העתקה</button></div>'), 'kr-b kr-a');
        d.setAttribute('data-raw', r.answer);
        if (!r.limited) HIST.push({ role: 'user', content: q }, { role: 'assistant', content: r.answer });
      }
    }).catch(function (e) {
      wait.remove();
      bubble(esc(errText(String(e.message))), 'kr-b kr-err');
    }).then(function () { BUSY = false; });
  }
  /* תשובה: "- " = נקודה, שורה שמסתיימת בנקודתיים = כותרת. השורה הראשונה מודגשת */
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
    if (!KEREN_EXEC) { el.innerHTML = '<div class="card"><div class="empty">קרן עוד לא הופעלה.</div></div>'; return; }
    if (!PLANS) {
      el.innerHTML = '<div class="card"><div class="empty">טוען את התוכניות…</div></div>';
      loadPlans().then(function () { mountPlans(el); }, function (e) { el.innerHTML = '<div class="card"><div class="empty">' + esc(errText(String(e.message))) + '</div></div>'; });
      return;
    }
    var p = OPENID && PLANS.filter(function (x) { return x.id === OPENID; })[0];
    el.innerHTML = p ? planPage(p) : listPage();
    wire(el, p);
  }
  function roleLbl(p) { return p.role === 'rakaz' ? 'תוכנית פדגוגית · של הרכז/ת' : 'תוכנית בית ספרית'; }
  function listPage() {
    var rk = T.role() === 'rakaz';
    var h = '<div class="card head"><h1>התוכניות שלי</h1><div class="meta">תוכניות העבודה שקרן בנתה ' + (rk ? 'לך' : 'לבית הספר') +
      '. הן פרטיות לבית הספר' + (rk ? ', והמנהל/ת רואה אותן.' : ' — כולל התוכניות הפדגוגיות של הרכז/ת.') + '</div>' +
      '<div class="acts" style="margin-top:12px"><button type="button" class="btn amber" data-kp="new">' + IC.plus + 'תוכנית חדשה עם קרן</button></div></div>';
    if (!PLANS.length) return h + '<div class="card"><div class="empty">עוד אין תוכניות. אפשר לבקש מקרן, למשל: "' + esc(cats()[2][2][0][1]) + '".</div></div>';
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
      (j.missing && !forDoc ? '<p class="small">מה היה עוזר לתוכנית מדויקת יותר: ' + esc(j.missing) + '</p>' : '');
  }
  function planPage(p) {
    var j = p.plan || {}, mine = p.mine;
    var mailA = '';
    if (isMobile()) mailA = '<a class="btn" href="mailto:?subject=' + encodeURIComponent(j.title || 'תוכנית עבודה') + '&body=' + encodeURIComponent(planPlain(j)) + '">' + IC.mail + 'מייל</a>';
    else mailA = '<button type="button" class="btn" data-kp="gmail">' + IC.mail + 'מייל (Gmail)</button><a class="btn sm" href="mailto:?subject=' + encodeURIComponent(j.title || 'תוכנית עבודה') + '" data-kp="outlook">בתוכנת המייל (Outlook)</a>';
    return '<button type="button" class="btn sm" data-kp="back" style="margin-bottom:10px">→ לכל התוכניות</button>' +
      '<div class="card kr-plan" id="krPlan"><p class="eyebrow">' + esc(roleLbl(p)) + ' · עודכנה ' + esc(fmt(p.updated)) + '</p>' +
      '<h1>' + ce('title', j.title || 'תוכנית עבודה') + '</h1>' +
      '<p class="small">הבקשה: ' + esc(p.request) + '</p>' +
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

  window.KEREN = { open: open, mountPlans: mountPlans, enabled: function () { return !!KEREN_EXEC; },
                   _setExec: function (u) { KEREN_EXEC = u; } };   /* _setExec — לבדיקות בלבד */
  function boot() { if (KEREN_EXEC && !document.querySelector('.kr-fab')) build(); }
  document.addEventListener('tzohar:ready', boot);
  if (T.ready && T.ready()) boot();
})();
