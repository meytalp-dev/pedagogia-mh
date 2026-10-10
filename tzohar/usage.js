/* צוהר — מדידת שימוש (10.10.26)
   מדווח לשער על פתיחת צוהר, על כל עמוד בתפריט ועל כל מקטע מקופל שנפתח.
   השער שומר שורה אחת לאדם × מקטע בכל 20 דקות; מיטל ותצוגת אדמין (?as=) לא נספרות.
   הסיכום — בתובה, אצל האדמין: "שימוש · תובה וצוהר". קובץ נפרד כדי לא לגעת ב-app.js. */
(function () {
  'use strict';
  var GATE = 'https://script.google.com/macros/s/AKfycbynKp-eTNj7pY5lTaSD5_S_qhBH2RgEeLWOPW5ZeF2dTQ5hifL3Q7Lb4KDdQYJ_4Vz9/exec';
  var NAMES = { home: "צ'ק ליסט · משרדי", c: "צ'ק ליסט · אישי", s: 'בית הספר שלי', m: 'מנור', g: 'מארג',
    k: 'הידע', t: 'ארגז הכלים', p: 'התוכניות שלי' };
  var AS = /[?&]as=/.test(location.search) ? 1 : 0, last = '';

  function token() {
    var keys = ['localStorage', 'sessionStorage'];
    for (var i = 0; i < keys.length; i++) {
      try { var s = JSON.parse(window[keys[i]].getItem('pmh_auth') || 'null'); if (s && s.token && s.exp > Date.now()) return s.token; } catch (e) {}
    }
    return '';
  }
  function send(ev, sec) {
    var t = token();
    if (!t) return;
    try {
      fetch(GATE, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'track', token: t, app: 'tzohar', ev: ev, sec: sec || '', as: AS }) }).catch(function () {});
    } catch (e) {}
  }
  function page() { var h = location.hash.replace('#', ''); return NAMES[h] ? h : 'home'; }
  function sec(p) {
    var l = NAMES[p] || '';
    if (!l || l === last) return;
    last = l;
    send('sec', l);
  }

  var started = false;
  function start() {
    if (started) return; started = true;
    send('open', '');
    sec(page());
  }
  /* מעבר עמוד: app.js מחליף את הכתובת בלי אירוע hashchange — לכן מאזינים ללחיצה על פריט בתפריט */
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-page]') : null;
    if (b && started) sec(b.getAttribute('data-page'));
  }, true);
  window.addEventListener('hashchange', function () { if (started) sec(page()); });
  /* מקטע מקופל שנפתח בתוך העמוד */
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!started || !d || d.tagName !== 'DETAILS' || !d.open || !d.closest('#main')) return;
    var s = d.querySelector('summary');
    var txt = s ? s.textContent.replace(/\s+/g, ' ').trim().slice(0, 50) : '';
    if (txt) send('sec', (NAMES[page()] || '') + ' › ' + txt);
  }, true);

  if (document.documentElement.classList.contains('pmh-in')) start();
  else document.addEventListener('pmh:in', start);
})();
