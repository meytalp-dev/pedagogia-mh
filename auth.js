/* auth.js — שער הרשאות למרחבים סגורים.
   ------------------------------------------------------------------
   שימוש: בתוך <head> של עמוד מוגן, מוקדם ככל האפשר —
     <script src="/auth.js" data-space="pikuah"></script>

   מרחבים אפשריים: pikuah | menahalim | netunim  (או כמה, מופרדים בפסיק)

   מה זה עושה: מסתיר את העמוד מיד, מבקש זיהוי (Google או סיסמה),
   שולח ל-Apps Script לאימות מול גיליון ההרשאות, ורק אז חושף.

   מה זה *לא* עושה: הקובץ עצמו ציבורי ב-GitHub Pages. לכן תוכן
   שחייב הגנה אמיתית לא יושב ב-HTML אלא נשלף מהשרת אחרי אימות —
   ראו data-protected ו-PMH_AUTH.load() בהמשך.                       */
(function () {
  'use strict';

  /* ===== הגדרות — לעדכן אחרי הפריסה ===== */
  var API       = 'https://script.google.com/macros/s/AKfycbynKp-eTNj7pY5lTaSD5_S_qhBH2RgEeLWOPW5ZeF2dTQ5hifL3Q7Lb4KDdQYJ_4Vz9/exec';   /* כתובת ה-exec של סקריפט ההרשאות */
  var CLIENT_ID = '770511902858-0nf2b0i4fge0jmp9jovccl2nokgovhq5.apps.googleusercontent.com';  /* OAuth Client ID מ-Google Cloud  */

  var KEY   = 'pmh_auth';
  var GSI   = 'https://accounts.google.com/gsi/client';
  var NAMES = {
    pikuah:    'מרחב הפיקוח',
    menahalim: 'מרחב המנהלים',
    netunim:   'תוכניות עבודה ומצבת תלמידים'
  };

  /* המרחב הנדרש בעמוד הזה */
  var me = document.currentScript;
  var need = ((me && me.getAttribute('data-space')) || '').split(',')
               .map(function (s) { return s.trim(); }).filter(Boolean);
  if (!need.length) need = ['pikuah'];

  /* ===== הסתרה מיידית — לפני שהדפדפן צייר משהו ===== */
  var hide = document.createElement('style');
  hide.id = 'pmh-hide';
  hide.textContent = 'body>*:not(#pmh-gate){visibility:hidden!important}';
  (document.head || document.documentElement).appendChild(hide);

  function reveal() {
    var s = document.getElementById('pmh-hide');
    if (s) s.parentNode.removeChild(s);
    var g = document.getElementById('pmh-gate');
    if (g) g.parentNode.removeChild(g);
    document.documentElement.classList.add('pmh-in');
    fillProtected();
    badge();
  }

  /* ===== סשן מקומי =====
     sessionStorage ולא localStorage: על מחשב משותף בבית ספר, טוקןד
     ששורד סגירת דפדפן מכניס את המשתמש הבא אוטומטית. */
  function store() {
    try { return window.sessionStorage; } catch (e) { return null; }
  }
  /* שאריות מהגרסה הקודמת — נמחקות פעם אחת ולא נקראות */
  try { localStorage.removeItem(KEY); } catch (e) {}

  function session() {
    try {
      var st = store(); if (!st) return null;
      var s = JSON.parse(st.getItem(KEY) || 'null');
      if (!s || !s.token || !s.exp || s.exp < Date.now()) return null;
      return s;
    } catch (e) { return null; }
  }
  function allowed(s) {
    if (!s || !s.spaces) return false;
    if (s.spaces.indexOf('all') > -1) return true;
    for (var i = 0; i < need.length; i++) {
      if (s.spaces.indexOf(need[i]) > -1) return true;
    }
    return false;
  }
  function logout() {
    try { var st = store(); if (st) st.removeItem(KEY); } catch (e) {}
    location.reload();
  }

  /* ===== קריאה לשרת ===== */
  function api(payload) {
    if (!API || API.indexOf('PASTE_') === 0) {
      return Promise.resolve({ ok: false, error: 'unconfigured' });
    }
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: 'network' }; });
  }

  /* ===== עיצוב מסך הכניסה ===== */
  var STYLE = [
    '#pmh-gate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;',
    'justify-content:center;padding:20px;background:#0D3B66;background-image:',
    'radial-gradient(circle at 20% 15%,rgba(255,255,255,.10),transparent 45%),',
    'radial-gradient(circle at 85% 80%,rgba(11,127,166,.35),transparent 50%);',
    'font-family:Assistant,"Noto Sans Hebrew",system-ui,sans-serif;direction:rtl}',
    '#pmh-gate *{box-sizing:border-box}',
    '#pmh-box{width:100%;max-width:392px;background:#fff;border-radius:18px;padding:34px 30px 26px;',
    'box-shadow:0 24px 60px rgba(0,0,0,.28);text-align:center;animation:pmhUp .35s ease both}',
    '@keyframes pmhUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}',
    '#pmh-box img{height:46px;margin-bottom:16px}',
    '#pmh-box h2{margin:0 0 6px;font-size:1.24rem;color:#0D3B66;font-weight:800;line-height:1.3}',
    '#pmh-box .sub{margin:0 0 22px;font-size:.87rem;color:#5A6B80;line-height:1.55}',
    '#pmh-g{display:flex;justify-content:center;min-height:44px}',
    '#pmh-or{display:flex;align-items:center;gap:10px;margin:20px 0 16px;color:#9AA8B8;font-size:.78rem}',
    '#pmh-or:before,#pmh-or:after{content:"";flex:1;height:1px;background:#E4E9EF}',
    '#pmh-pw{width:100%;padding:11px 14px;border:1.5px solid #DDE3EA;border-radius:10px;',
    'font:inherit;font-size:.94rem;text-align:center;direction:ltr}',
    '#pmh-pw:focus{outline:none;border-color:#0D3B66;box-shadow:0 0 0 3px rgba(13,59,102,.12)}',
    '#pmh-go{width:100%;margin-top:10px;padding:11px;border:0;border-radius:10px;background:#0D3B66;',
    'color:#fff;font:inherit;font-weight:700;font-size:.94rem;cursor:pointer;transition:background .15s}',
    '#pmh-go:hover{background:#0A2E52}#pmh-go:disabled{opacity:.55;cursor:default}',
    '#pmh-err{margin-top:14px;font-size:.85rem;color:#C0392B;font-weight:600;min-height:20px;line-height:1.45}',
    '#pmh-note{margin-top:20px;padding-top:16px;border-top:1px solid #EEF1F5;',
    'font-size:.78rem;color:#8A97A6;line-height:1.6}',
    '#pmh-note a{color:#0D3B66;font-weight:600}',
    '#pmh-who{position:fixed;bottom:14px;inset-inline-start:14px;z-index:9998;display:flex;align-items:center;',
    'gap:8px;background:rgba(255,255,255,.96);border:1px solid #E4E9EF;border-radius:99px;',
    'padding:5px 8px 5px 12px;font:600 .76rem/1 Assistant,system-ui,sans-serif;color:#5A6B80;',
    'box-shadow:0 4px 14px rgba(13,59,102,.12);direction:rtl}',
    '#pmh-who button{border:0;background:#F2F5F8;color:#0D3B66;border-radius:99px;padding:5px 10px;',
    'font:inherit;cursor:pointer}#pmh-who button:hover{background:#E4EAF1}',
    '@media(max-width:520px){#pmh-who{display:none}}'
  ].join('');

  var styled = false;
  function injectStyle() {
    if (styled) return;
    styled = true;
    var st = document.createElement('style');
    st.textContent = STYLE;
    document.head.appendChild(st);
  }

  /* ===== מסך הכניסה ===== */
  function gate() {
    injectStyle();

    var label = need.map(function (n) { return NAMES[n] || n; }).join(' · ');
    var g = document.createElement('div');
    g.id = 'pmh-gate';
    g.innerHTML =
      '<div id="pmh-box" role="dialog" aria-modal="true" aria-labelledby="pmh-t">' +
        '<img src="/logo.png" alt="משרד העבודה">' +
        '<h2 id="pmh-t">כניסה ל' + label + '</h2>' +
        '<p class="sub">התוכן בעמוד זה פתוח לבעלי הרשאה בלבד.<br>נא להזדהות כדי להמשיך.</p>' +
        '<div id="pmh-g"></div>' +
        '<div id="pmh-or">או</div>' +
        '<input id="pmh-pw" type="password" placeholder="סיסמת המרחב" autocomplete="current-password">' +
        '<button id="pmh-go" type="button">כניסה</button>' +
        '<div id="pmh-err" role="alert"></div>' +
        '<div id="pmh-note">אין לך גישה ואת.ה סבור.ה שהיא מגיעה לך?<br>' +
          '<a href="mailto:meytalp@bethaarava.ort.org.il?subject=' +
          encodeURIComponent('בקשת הרשאה — ' + label) + '">פנייה לקבלת הרשאה</a></div>' +
      '</div>';
    document.body.appendChild(g);

    var err = document.getElementById('pmh-err');
    var pw  = document.getElementById('pmh-pw');
    var go  = document.getElementById('pmh-go');

    function fail(msg) { err.textContent = msg; go.disabled = false; }

    function accept(res) {
      if (!res || !res.ok) {
        var e = res && res.error;
        return fail(
          e === 'notlisted'    ? 'החשבון ' + (res.email || '') + ' אינו מופיע ברשימת בעלי ההרשאה.' :
          e === 'nospace'      ? 'החשבון שלך מאושר, אך לא ל' + label + '.' :
          e === 'badpass'      ? 'סיסמה שגויה.' :
          e === 'inactive'     ? 'ההרשאה שלך הושהתה. נא לפנות למנהלת המערכת.' :
          e === 'unconfigured' ? 'שער ההרשאות עדיין לא הוגדר. נא לפנות למנהלת האתר.' :
          e === 'network'      ? 'לא הצלחנו להתחבר לשרת. נסו שוב בעוד רגע.' :
                                 'הכניסה נכשלה. נסו שוב.');
      }
      try {
        /* ארבע שעות לכל היותר — גם אם השרת מבקש יותר */
        var hrs = Math.min(Number(res.hours) || 4, 4);
        var st = store();
        if (st) st.setItem(KEY, JSON.stringify({
          token: res.token, email: res.email, name: res.name || res.email,
          spaces: res.spaces || [], exp: Date.now() + hrs * 3600e3
        }));
      } catch (e2) {}
      if (!allowed(session())) return fail('החשבון שלך מאושר, אך לא ל' + label + '.');
      reveal();
    }

    go.addEventListener('click', function () {
      var v = pw.value.trim();
      if (!v) { pw.focus(); return; }
      go.disabled = true; err.textContent = '';
      api({ action: 'passwordLogin', password: v, space: need[0] }).then(accept);
    });
    pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });

    /* כפתור Google — נטען אחרי שהמסך כבר עומד */
    if (CLIENT_ID && CLIENT_ID.indexOf('PASTE_') !== 0) {
      var s = document.createElement('script');
      s.src = GSI; s.async = true; s.defer = true;
      s.onload = function () {
        try {
          google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: function (r) {
              err.textContent = '';
              api({ action: 'googleLogin', credential: r.credential, space: need[0] }).then(accept);
            }
          });
          google.accounts.id.renderButton(document.getElementById('pmh-g'), {
            theme: 'outline', size: 'large', shape: 'pill',
            text: 'signin_with', locale: 'he', width: 300
          });
        } catch (e3) {
          document.getElementById('pmh-or').style.display = 'none';
        }
      };
      s.onerror = function () { document.getElementById('pmh-or').style.display = 'none'; };
      document.head.appendChild(s);
    } else {
      document.getElementById('pmh-g').style.display = 'none';
      document.getElementById('pmh-or').style.display = 'none';
    }
  }

  /* ===== שבב "מחובר.ת כ..." ===== */
  function badge() {
    var s = session(); if (!s) return;
    injectStyle();
    var b = document.createElement('div');
    b.id = 'pmh-who';
    var nm = document.createElement('span');
    nm.textContent = s.name;
    var out = document.createElement('button');
    out.type = 'button'; out.textContent = 'יציאה';
    out.addEventListener('click', logout);
    b.appendChild(nm); b.appendChild(out);
    document.body.appendChild(b);
  }

  /* ===== תוכן מוגן שנשלף מהשרת =====
     <div data-protected="pikuah-schools"></div>  →  ימולא רק אחרי אימות.
     התוכן עצמו לא יושב בקובץ ה-HTML ולכן לא ניתן לשליפה בלי הרשאה. */
  function fillProtected() {
    var slots = document.querySelectorAll('[data-protected]');
    if (!slots.length) return;
    var s = session(); if (!s) return;
    Array.prototype.forEach.call(slots, function (el) {
      el.innerHTML = '<div style="padding:28px;text-align:center;color:#8A97A6;font-size:.9rem">טוען…</div>';
      api({ action: 'content', token: s.token, key: el.getAttribute('data-protected') })
        .then(function (r) {
          if (r && r.ok && r.html) {
            el.innerHTML = r.html;
            el.dispatchEvent(new CustomEvent('pmh:loaded', { bubbles: true }));
          } else {
            el.innerHTML = '<div style="padding:28px;text-align:center;color:#C0392B;font-size:.9rem">' +
                           'לא הצלחנו לטעון את התוכן.</div>';
          }
        });
    });
  }

  /* ===== API לשימוש מתוך העמוד ===== */
  window.PMH_AUTH = {
    user: function () {
      var s = session();
      return s ? { email: s.email, name: s.name, spaces: s.spaces } : null;
    },
    logout: logout,
    /* שליפת תוכן מוגן: PMH_AUTH.load('pikuah-schools').then(function(r){ ... }) */
    load: function (key) {
      var s = session();
      if (!s) return Promise.resolve(null);
      return api({ action: 'content', token: s.token, key: key });
    }
  };

  /* ===== ההפעלה ===== */
  var cur = session();
  if (cur && allowed(cur)) {
    /* יש סשן תקף — חושפים מיד (בלי הבהוב), ומאמתים מול השרת ברקע */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', reveal);
    } else { reveal(); }
    api({ action: 'verify', token: cur.token, space: need[0] }).then(function (r) {
      if (r && r.ok === false && r.error !== 'network' && r.error !== 'unconfigured') logout();
    });
  } else {
    if (cur) { try { var st0 = store(); if (st0) st0.removeItem(KEY); } catch (e) {} }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', gate);
    } else { gate(); }
  }
})();
