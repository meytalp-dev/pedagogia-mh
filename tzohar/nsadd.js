/* הוספת בעל/ת תפקיד לנספח — מצוהר ומנטע (18.10.26).
   היה קישור "לעדכון הנספח" לטופס המלא: הטופס נפתח ריק, ושליחה שלו מוחקת את כל בעלי
   התפקידים של בית הספר (לירון, אורט תעשייה אווירית). כאן מוסיפים אדם אחד, בלי למחוק כלום.
   השער (tzNispachAdd בצוהר.js) קובע את בית הספר לפי המחובר/ת. תפקיד שסומן "טרם אויש"
   מתעדכן ל"מאויש" באותה שורה.
   app.js מצייר את NSADD.box(n) בבעלי התפקידים; כפתור [data-nsadd] בכל מקום פותח את הטופס. */
(function () {
  'use strict';

  var GATE = 'https://script.google.com/macros/s/AKfycbynKp-eTNj7pY5lTaSD5_S_qhBH2RgEeLWOPW5ZeF2dTQ5hifL3Q7Lb4KDdQYJ_4Vz9/exec';
  /* זהה ל-TZ_NISPACH_ROLES בשער */
  var ROLES = ['רכז.ת פדגוגי.ת · סגן.ית מנהל.ת', 'רכז.ת חינוך חברתי יוצר', 'רכז.ת צוות צעיר', 'רכז.ת חניכות',
    'מת״ל/ית — מעריך.ה ומקדם.ת תפקודי למידה', 'רכז.ת הכלה ושילוב', 'יועץ.ת חינוכי.ת',
    'רכז.ת אס״א — מניעת אלימות, סמים והתנהגויות סיכוניות', 'רכז.ת ביטחון, בטיחות והיערכות לחירום', 'רכז.ת טיולים',
    'רכז.ת מחשוב והוראה טכנולוגית', 'רכז.ת בגרות', 'רכז.ת משמעת', 'רכז.ת מערכת',
    'רכז.ת מגמה', 'רכז.ת מקצוע', 'רכז.ת שכבה', 'מורה חונך.ת', 'תפקיד אחר'];
  var ERR = {
    locked: 'המערכת סגורה זמנית. נסו שוב מאוחר יותר.',
    notsubmitted: 'הנספח של בית הספר עוד לא הוגש — קודם מגישים את הנספח המלא.',
    noname: 'חסר שם בעל/ת התפקיד.', badrole: 'בחרו תפקיד מהרשימה.',
    badphone: 'מספר הטלפון לא תקין.', bademail: 'כתובת המייל לא תקינה.',
    badsession: 'פג תוקף הכניסה. צאו והיכנסו שוב.', noschool: 'לא זוהה בית הספר של החשבון.'
  };

  var css = document.createElement('style');
  css.textContent =
    '.ns-form{margin:4px 0 14px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--paper)}' +
    '.ns-form h4{margin:0 0 4px;font:700 16px/1.3 Rubik,sans-serif;color:var(--navy)}' +
    '.ns-form .ns-safe{margin:0 0 10px;font-size:13.5px;color:var(--muted)}' +
    '.ns-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.ns-grid label{display:block;font-size:13.5px;font-weight:600;color:var(--ink)}' +
    '.ns-grid .ns-w{grid-column:1/-1}' +
    '.ns-grid input,.ns-grid select{display:block;width:100%;font:inherit;font-size:16px;border:1px solid var(--line);border-radius:11px;padding:9px 11px;background:#fff;margin-top:4px;color:var(--ink)}' +
    '.ns-grid input[dir=ltr]{text-align:left}' +
    '.ns-msg{margin-top:10px;font-size:14px;color:var(--bad)}' +
    '.ns-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}' +
    '@media(max-width:600px){.ns-grid{grid-template-columns:1fr}}';
  document.head.appendChild(css);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var $ = function (id) { return document.getElementById(id); };
  var T = function () { return window.TZOHAR; };

  /* missing: "תפקיד" או "תפקיד — פירוט" (מה שהשער מחזיר) */
  function split(m) { var i = String(m).indexOf(' — '), r = i > -1 ? m.slice(0, i) : m; return ROLES.indexOf(r) > -1 ? [r, i > -1 ? m.slice(i + 3) : ''] : [m, '']; }

  function box(n) {
    var miss = (n.missing || []).map(split).filter(function (x) { return ROLES.indexOf(x[0]) > -1; });
    var opt = function (r, d) { var v = r + (d ? ' — ' + d : ''); return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; };
    var sel = '<option value="">בחירת תפקיד…</option>' +
      (miss.length ? '<optgroup label="חסרים בנספח">' + miss.map(function (x) { return opt(x[0], x[1]); }).join('') + '</optgroup>' : '') +
      '<optgroup label="בעל/ת תפקיד נוסף/ת">' + ROLES.map(function (r) { return opt(r, ''); }).join('') + '</optgroup>';
    return '<div class="acts" style="margin:0 0 10px"><button type="button" class="btn primary sm" data-nsadd="1">+ הוספת בעל/ת תפקיד</button></div>' +
      '<form class="ns-form" id="nsForm" hidden novalidate>' +
      '<h4>הוספת בעל/ת תפקיד לנספח</h4>' +
      '<p class="ns-safe">ההוספה לא מוחקת ולא משנה את מי שכבר רשום/ה בנספח.</p>' +
      '<div class="ns-grid">' +
      '<label class="ns-w">תפקיד<select id="nsRole" required>' + sel + '</select></label>' +
      '<label class="ns-w" id="nsDetailL" hidden>פירוט (מגמה / מקצוע / שכבה / שם התפקיד)<input id="nsDetail" maxlength="120"></label>' +
      '<label>שם מלא<input id="nsName" maxlength="120" autocomplete="off" required></label>' +
      '<label>שעות בתפקיד<input id="nsHours" inputmode="decimal" maxlength="20"></label>' +
      '<label>נייד<input id="nsPhone" type="tel" dir="ltr" maxlength="20"></label>' +
      '<label>מייל<input id="nsEmail" type="email" dir="ltr" maxlength="120"></label>' +
      '</div><div class="ns-msg" id="nsMsg" role="alert" hidden></div>' +
      '<div class="ns-acts"><button type="submit" class="btn primary sm" id="nsSave">שמירה בנספח</button>' +
      '<button type="button" class="btn sm" id="nsCancel">ביטול</button></div></form>';
  }

  /* תפקיד שצריך פירוט (מגמה, מקצוע, שכבה, חונך/ת, אחר) — השדה נפתח */
  var NEEDS_DETAIL = ['רכז.ת מגמה', 'רכז.ת מקצוע', 'רכז.ת שכבה', 'מורה חונך.ת', 'תפקיד אחר'];
  function syncDetail() {
    var v = split($('nsRole').value);
    var need = !v[1] && NEEDS_DETAIL.indexOf(v[0]) > -1;
    $('nsDetailL').hidden = !need;
  }

  /* פתיחה: מכל מקום (דף הבית, הצ'ק ליסט) — עוברים לבית הספר שלי, פותחים את בעלי התפקידים ואת הטופס */
  function open() {
    if (!$('nsForm')) T().go('s');
    var sec = document.querySelector('details[data-sec="roles"]');
    if (sec && !sec.open) sec.open = true;
    var f = $('nsForm'); if (!f) return;
    f.hidden = false;
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { try { $('nsRole').focus({ preventScroll: true }); } catch (e) {} }, 350);
  }
  function close() { var f = $('nsForm'); if (f) { f.reset(); f.hidden = true; $('nsMsg').hidden = true; } }
  function msg(t) { var m = $('nsMsg'); m.textContent = t; m.hidden = !t; }

  function save() {
    var rv = split($('nsRole').value), name = $('nsName').value.trim();
    if (!rv[0]) return msg('בחרו תפקיד מהרשימה.');
    if (!name) return msg('חסר שם בעל/ת התפקיד.');
    var body = {
      action: 'tzNispachAdd', token: T().token(), as: T().as(), asRole: T().role(),
      role: rv[0], detail: rv[1] || ($('nsDetailL').hidden ? '' : $('nsDetail').value.trim()),
      name: name, hours: $('nsHours').value.trim(), phone: $('nsPhone').value.trim(), email: $('nsEmail').value.trim()
    };
    var b = $('nsSave'); b.disabled = true; b.textContent = 'שומר…'; msg('');
    fetch(GATE, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || 'server');
        /* עדכון מקומי — בלי לטעון את כל צוהר מחדש */
        var n = T().data().nispach, label = body.role + (body.detail ? ' — ' + body.detail : '');
        n.people.push({ role: body.role, detail: body.detail, name: name, email: body.email, phone: body.phone });
        var i = n.missing.indexOf(label); if (i < 0) i = n.missing.indexOf(body.role);
        if (i > -1) n.missing.splice(i, 1);
        T().go('s');
        var sec = document.querySelector('details[data-sec="roles"]'); if (sec) sec.open = true;
        T().toast(name + ' נוסף/ה לנספח');
        if (T().refresh) T().refresh(true);
      })
      .catch(function (e) {
        b.disabled = false; b.textContent = 'שמירה בנספח';
        msg(ERR[e && e.message] || 'השמירה לא הצליחה. בדקו את החיבור ונסו שוב.');
      });
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-nsadd],#nsCancel');
    if (!t) return;
    e.preventDefault();
    if (t.id === 'nsCancel') close(); else open();
  });
  document.addEventListener('change', function (e) { if (e.target && e.target.id === 'nsRole') syncDetail(); });
  document.addEventListener('input', function (e) { if (e.target && e.target.closest && e.target.closest('#nsForm') && $('nsMsg')) msg(''); });
  document.addEventListener('submit', function (e) { if (e.target && e.target.id === 'nsForm') { e.preventDefault(); save(); } });

  window.NSADD = { box: box, open: open, busy: function () { var f = $('nsForm'); return !!(f && !f.hidden); } };
})();
