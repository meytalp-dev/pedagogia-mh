/* auth.js — שער הרשאות למרחבים סגורים.
   ------------------------------------------------------------------
   שימוש: בתוך <head> של עמוד מוגן, מוקדם ככל האפשר —
     <script src="/auth.js" data-space="pikuah"></script>

   מרחבים אפשריים: pikuah | menahalim | netunim  (או כמה, מופרדים בפסיק)

   מה זה עושה: מסתיר את העמוד מיד ומבקש זיהוי — בוחרים שם מהרשימה
   (או מקלידים מייל), קוד בן 6 ספרות נשלח למייל הרשום בגיליון
   ההרשאות, והמכשיר זוכר את המשתמש ל-30 יום (מ-24.9.26).

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
    netunim:   'תוכניות עבודה ומצבת תלמידים',
    tikshuv:   'מעקב קהילת התקשוב',
    mosdot:    'אדמין המוסדות'
  };

  /* המרחב הנדרש בעמוד הזה */
  var me = document.currentScript;
  var need = ((me && me.getAttribute('data-space')) || '').split(',')
               .map(function (s) { return s.trim(); }).filter(Boolean);
  if (!need.length) need = ['pikuah'];

  /* data-optional: העמוד עצמו פתוח לכולם, ורק חלק ממנו דורש כניסה.
     אין הסתרה ואין מסך כניסה עד שהעמוד קורא ל-PMH_AUTH.login().
     אחרי כניסה מוצלחת נורה האירוע pmh:in על document. */
  var optional = !!(me && me.hasAttribute('data-optional'));

  /* ===== הסתרה מיידית — לפני שהדפדפן צייר משהו ===== */
  if (!optional) {
    var hide = document.createElement('style');
    hide.id = 'pmh-hide';
    hide.textContent = 'body>*:not(#pmh-gate){visibility:hidden!important}';
    (document.head || document.documentElement).appendChild(hide);
  }

  function reveal() {
    var s = document.getElementById('pmh-hide');
    if (s) s.parentNode.removeChild(s);
    var g = document.getElementById('pmh-gate');
    if (g) g.parentNode.removeChild(g);
    document.documentElement.classList.add('pmh-in');
    fillProtected();
    badge();
    try { document.dispatchEvent(new CustomEvent('pmh:in')); } catch (e) {}
  }

  /* ===== סשן מקומי =====
     מ-24.9.26: localStorage ל-30 יום — המכשיר זוכר את המשתמש, כמו
     "מבט המורה" במנור. במחשב משותף — כפתור "יציאה" בפינה מנקה.
     סשן ישן ב-sessionStorage (הכניסה הקודמת) עדיין נקרא עד שייסגר הדפדפן. */
  function store() {
    try { return window.localStorage; } catch (e) { return null; }
  }
  function oldStore() {
    try { return window.sessionStorage; } catch (e) { return null; }
  }

  function session() {
    try {
      var st = store(), s = st && JSON.parse(st.getItem(KEY) || 'null');
      if (!s || !s.token) { var o = oldStore(); s = o && JSON.parse(o.getItem(KEY) || 'null'); }
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
  function clearSession() {
    try { var st = store(); if (st) st.removeItem(KEY); } catch (e) {}
    try { var o = oldStore(); if (o) o.removeItem(KEY); } catch (e) {}
  }
  function logout() {
    clearSession();
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
    '.pmh-tabs{display:flex;gap:6px;background:#F2F5F8;border-radius:12px;padding:4px;margin-bottom:12px}',
    '.pmh-tabs[hidden]{display:none}',
    '.pmh-tab{flex:1;border:0;background:none;border-radius:9px;padding:9px 6px;font:inherit;font-size:.88rem;',
    'font-weight:700;color:#5A6B80;cursor:pointer}',
    '.pmh-tab[aria-selected=true]{background:#fff;color:#0D3B66;box-shadow:0 1px 4px rgba(13,59,102,.14)}',
    '.pmh-in{display:block;width:100%;padding:11px 14px;border:1.5px solid #DDE3EA;border-radius:10px;',
    'font:inherit;font-size:.94rem;background:#fff;color:#1b2a3a}',
    '.pmh-in+.pmh-in{margin-top:10px}.pmh-in[hidden]{display:none}',
    '.pmh-in:focus{outline:none;border-color:#0D3B66;box-shadow:0 0 0 3px rgba(13,59,102,.12)}',
    '.pmh-code{text-align:center;font-size:1.5rem;letter-spacing:.4em;font-weight:800}',
    '#pmh-ok{width:100%;margin-top:10px;padding:11px;border:0;border-radius:10px;background:#0D3B66;',
    'color:#fff;font:inherit;font-weight:700;font-size:.94rem;cursor:pointer}#pmh-ok:disabled{opacity:.55}',
    '.pmh-link{display:block;margin:12px auto 0;border:0;background:none;color:#0D3B66;font:inherit;',
    'font-size:.84rem;text-decoration:underline;cursor:pointer}',
    '.pmh-pw{width:100%;padding:11px 14px;border:1.5px solid #DDE3EA;border-radius:10px;',
    'font:inherit;font-size:.94rem;text-align:center;direction:ltr}',
    '.pmh-pw:focus{outline:none;border-color:#0D3B66;box-shadow:0 0 0 3px rgba(13,59,102,.12)}',
    '.pmh-pw+.pmh-pw{margin-top:10px}',
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

  var CANCEL = '<button id="pmh-cancel" type="button" style="margin-top:14px;border:0;background:none;' +
    'color:#5A6B80;font:inherit;font-size:.87rem;text-decoration:underline;cursor:pointer">חזרה לעמוד</button>';

  /* ===== מסך הכניסה — קוד במייל (24.9.26) =====
     כמו "מבט המורה" במנור: בוחרים את השם מהרשימה → קוד בן 6 ספרות
     נשלח למייל הרשום בגיליון ההרשאות → המכשיר זוכר ל-30 יום.
     מי שאינו ברשימה (או מעדיף) — מקליד את כתובת המייל. */
  var LAST = 'pmh_last';   /* האדם האחרון שנבחר במכשיר — למילוי מראש */
  var SUB1 = 'בחרו את שמכם — נשלח קוד כניסה למייל שלכם.<br>המכשיר יזכור אתכם ל-30 יום.';

  function gate() {
    injectStyle();

    /* data-label: שם אחר למסך הכניסה, כשהעמוד אינו המרחב עצמו */
    var label = (me && me.getAttribute('data-label')) ||
                need.map(function (n) { return NAMES[n] || n; }).join(' · ');
    var g = document.createElement('div');
    g.id = 'pmh-gate';
    g.innerHTML =
      '<div id="pmh-box" role="dialog" aria-modal="true" aria-labelledby="pmh-t">' +
        '<img src="/logo.png" alt="משרד העבודה">' +
        '<h2 id="pmh-t"></h2>' +
        '<p class="sub" id="pmh-sub">' + SUB1 + '</p>' +
        '<div id="pmh-s1">' +
          '<div class="pmh-tabs" role="tablist">' +
            '<button type="button" class="pmh-tab" data-role="menahalim">מנהל/ת בית ספר</button>' +
            '<button type="button" class="pmh-tab" data-role="pikuah">מפקח/ת · מטה</button>' +
          '</div>' +
          '<select id="pmh-school" class="pmh-in" aria-label="בית הספר"></select>' +
          '<select id="pmh-name" class="pmh-in" aria-label="השם שלי"></select>' +
          '<input id="pmh-mail" class="pmh-in" type="email" dir="ltr" autocomplete="email" ' +
            'placeholder="כתובת המייל שלך" hidden>' +
          '<button id="pmh-go" type="button">שליחת קוד למייל</button>' +
          '<button id="pmh-alt" class="pmh-link" type="button"></button>' +
        '</div>' +
        '<div id="pmh-s2" hidden>' +
          '<input id="pmh-code" class="pmh-in pmh-code" type="text" inputmode="numeric" ' +
            'autocomplete="one-time-code" maxlength="6" placeholder="••••••" dir="ltr">' +
          '<button id="pmh-ok" type="button">כניסה</button>' +
          '<button id="pmh-back" class="pmh-link" type="button">לא הגיע קוד? חזרה ושליחה מחדש</button>' +
        '</div>' +
        '<div id="pmh-err" role="alert"></div>' +
        '<div id="pmh-note">אין לך גישה ואת.ה סבור.ה שהיא מגיעה לך?<br>' +
          '<a href="mailto:meytalp@bethaarava.ort.org.il?subject=' +
          encodeURIComponent('בקשת הרשאה — ' + label) + '">פנייה לקבלת הרשאה</a></div>' +
        (optional ? CANCEL : '') +
      '</div>';
    document.body.appendChild(g);
    if (optional) g.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'pmh-cancel' && g.parentNode) g.parentNode.removeChild(g);
    });

    function $(id) { return document.getElementById(id); }
    $('pmh-t').textContent = 'כניסה ל' + label;
    var schoolSel = $('pmh-school'), nameSel = $('pmh-name'), mail = $('pmh-mail');
    var go = $('pmh-go'), ok = $('pmh-ok'), codeIn = $('pmh-code'), sub = $('pmh-sub');
    var people = [];
    var role = (need.indexOf('pikuah') > -1 || need.indexOf('netunim') > -1) &&
               need.indexOf('menahalim') < 0 ? 'pikuah' : 'menahalim';
    var byMail = false, who = null;   /* who = {id} או {email} — למי נשלח הקוד */

    function msg(t, good) {
      var e = $('pmh-err');
      e.textContent = t || '';
      e.style.color = good ? '#1E7B4A' : '#C0392B';
    }
    function errText(res) {
      var e = res && res.error;
      return e === 'notlisted'   ? 'הכתובת ' + (res.email || '') + ' אינה מופיעה ברשימת בעלי ההרשאה.' :
             e === 'notfound'    ? 'השם לא נמצא. נא לרענן את העמוד ולנסות שוב.' :
             e === 'bademail'    ? 'כתובת המייל אינה תקינה.' :
             e === 'nospace'     ? 'ההרשאה שלך אינה כוללת את ' + label + '.' :
             e === 'inactive'    ? 'ההרשאה שלך הושהתה. נא לפנות למנהלת המערכת.' :
             e === 'cooldown'    ? 'נשלח קוד ממש עכשיו. בדקו את תיבת המייל (גם בספאם), או נסו שוב בעוד דקה.' :
             e === 'quota'       ? 'לא ניתן לשלוח קוד כרגע. נסו שוב מאוחר יותר.' :
             e === 'badcode'     ? 'הקוד שגוי. בדקו ונסו שוב.' :
             e === 'codeexpired' ? 'הקוד פג תוקף. חזרו ובקשו קוד חדש.' :
             e === 'toomany'     ? 'יותר מדי ניסיונות. חזרו ובקשו קוד חדש.' :
             e === 'unconfigured'? 'שער ההרשאות עדיין לא הוגדר. נא לפנות למנהלת האתר.' :
             e === 'network'     ? 'לא הצלחנו להתחבר לשרת. נסו שוב בעוד רגע.' :
                                   'תקלה רגעית. נסו שוב בעוד רגע.';
    }

    function opt(v, t) { var o = document.createElement('option'); o.value = v; o.textContent = t; return o; }
    function cmp(a, b) { return String(a).localeCompare(String(b), 'he'); }

    /* ממלא את הבחירות לפי התפקיד שנבחר */
    function render() {
      Array.prototype.forEach.call(g.querySelectorAll('.pmh-tab'), function (b) {
        b.setAttribute('aria-selected', b.getAttribute('data-role') === role ? 'true' : 'false');
      });
      var list = people.filter(function (p) { return p.role === role; });
      schoolSel.hidden = byMail || role !== 'menahalim';
      if (role === 'menahalim') {
        /* תמיד 64 בתי הספר מפריסת הפיקוח (school-names.js) — גם כשאין
           לבית הספר מנהל/ת רשום/ה בגיליון. שם שאינו מה-64 (רשת) — בסוף. */
        var cur = schoolSel.value, seen = {}, schools = [], other = [];
        var S = window.SchoolNames;
        if (S && S.list) S.list.forEach(function (s) { seen[s] = 1; schools.push(s); });
        list.forEach(function (p) {
          if (p.school && !seen[p.school]) { seen[p.school] = 1; (S && S.list ? other : schools).push(p.school); }
        });
        schools.sort(cmp); other.sort(cmp);
        schoolSel.innerHTML = '';
        schoolSel.appendChild(opt('', 'בחרו את בית הספר'));
        schools.concat(other).forEach(function (s) { schoolSel.appendChild(opt(s, s)); });
        if (cur && seen[cur]) schoolSel.value = cur;
        list = list.filter(function (p) { return p.school && p.school === schoolSel.value; });
      }
      list.sort(function (a, b) { return cmp(a.name, b.name); });
      nameSel.innerHTML = '';
      var noOne = role === 'menahalim' && schoolSel.value && !list.length;
      nameSel.appendChild(opt('', noOne ? 'אין עדיין מנהל/ת רשום/ה לבית הספר' :
                                  role === 'menahalim' && !schoolSel.value ? 'השם שלי' : 'בחרו את שמכם'));
      list.forEach(function (p) { nameSel.appendChild(opt(p.id, p.name + '  ·  ' + p.hint)); });
      nameSel.disabled = !list.length;
      if (list.length === 1) nameSel.value = list[0].id;
      if (noOne && !byMail) msg('לבית הספר הזה עוד לא נרשמה הרשאה. אפשר להיכנס עם כתובת המייל, או לפנות לקבלת הרשאה (למטה).');
    }

    function setMode(m) {
      byMail = m;
      g.querySelector('.pmh-tabs').hidden = m;
      nameSel.hidden = m;
      mail.hidden = !m;
      $('pmh-alt').textContent = m ? 'חזרה לבחירה מהרשימה' : 'לא מופיע/ה ברשימה? כניסה עם כתובת מייל';
      msg('');
      render();
      if (m) mail.focus();
    }
    setMode(false);

    Array.prototype.forEach.call(g.querySelectorAll('.pmh-tab'), function (b) {
      b.addEventListener('click', function () { role = b.getAttribute('data-role'); msg(''); render(); });
    });
    schoolSel.addEventListener('change', function () { msg(''); render(); });
    $('pmh-alt').addEventListener('click', function () { setMode(!byMail); });

    /* הרשימה — מהשרת, עם מטמון לסשן הדפדפן */
    nameSel.disabled = true; schoolSel.disabled = true;
    nameSel.innerHTML = ''; nameSel.appendChild(opt('', 'טוען את הרשימה…'));
    /* שמות בתי הספר בגיליון ההרשאות בכתיב חופשי — מציגים את השם האחיד
       (school-names.js, 64 שמות). כתיב לא מוכר נשאר כמו שהוא. */
    function canonAll() {
      /* הדבקה לגיליון מכניסה לפעמים תווי כיוון בלתי נראים (RLM) —
         בלעדיהם שם בית הספר לא מזוהה (ישיבת חנוך לנער, 24.9.26) */
      people.forEach(function (p) {
        p.name = String(p.name || '').replace(/[‎‏‪-‮⁦-⁩]/g, '').trim();
        p.school = String(p.school || '').replace(/[‎‏‪-‮⁦-⁩]/g, '').trim();
      });
      var S = window.SchoolNames;
      if (!S || !S.canon) return;
      people.forEach(function (p) {
        if (!p.school) return;
        var c = S.canon(p.school);
        if (c && S.list.indexOf(c) > -1) p.school = c;
      });
    }
    if (!window.SchoolNames) {
      var sn = document.createElement('script');
      sn.src = '/school-names.js';
      sn.onload = function () {
        if (!people.length) return;
        var keep = nameSel.value;
        canonAll();
        var p = keep && people.filter(function (x) { return x.id === keep; })[0];
        render();
        if (p && p.school) { schoolSel.value = p.school; render(); }
        if (p) nameSel.value = p.id;
      };
      document.head.appendChild(sn);
    }
    function gotPeople(list) {
      people = list || [];
      canonAll();
      schoolSel.disabled = false;
      var last = null;
      try { last = JSON.parse(store().getItem(LAST) || 'null'); } catch (e) {}
      var p = last && people.filter(function (x) { return x.id === last.id; })[0];
      if (p) {
        role = p.role; render();
        if (p.school) { schoolSel.value = p.school; render(); }
        nameSel.value = p.id;
      } else render();
    }
    var cached = null;
    try { cached = JSON.parse(oldStore().getItem('pmh_people') || 'null'); } catch (e) {}
    if (cached && cached.length) gotPeople(cached);
    else api({ action: 'people' }).then(function (r) {
      if (r && r.ok && r.people) {
        try { oldStore().setItem('pmh_people', JSON.stringify(r.people)); } catch (e) {}
        gotPeople(r.people);
      } else {
        setMode(true);
        msg('טעינת הרשימה נכשלה — אפשר להיכנס עם כתובת המייל.');
      }
    });

    /* שלב 1 — שליחת הקוד */
    function send() {
      if (byMail) {
        var m = String(mail.value || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) { mail.focus(); return msg('כתובת המייל אינה תקינה.'); }
        who = { email: m };
      } else {
        if (role === 'menahalim' && !schoolSel.value) { schoolSel.focus(); return msg('בחרו את בית הספר.'); }
        if (!nameSel.value) { nameSel.focus(); return msg('בחרו את שמכם מהרשימה.'); }
        who = { id: nameSel.value };
      }
      go.disabled = true; go.textContent = 'שולח…'; msg('');
      api({ action: 'codeSend', id: who.id, email: who.email, space: need[0] }).then(function (r) {
        go.disabled = false; go.textContent = 'שליחת קוד למייל';
        if (!r || !r.ok) return msg(errText(r));
        if (who.id) { try { store().setItem(LAST, JSON.stringify({ id: who.id })); } catch (e) {} }
        $('pmh-s1').hidden = true; $('pmh-s2').hidden = false;
        sub.innerHTML = '';
        sub.appendChild(document.createTextNode('שלחנו קוד בן 6 ספרות אל'));
        sub.appendChild(document.createElement('br'));
        var b = document.createElement('b'); b.dir = 'ltr'; b.textContent = r.hint || '';
        sub.appendChild(b);
        sub.appendChild(document.createElement('br'));
        sub.appendChild(document.createTextNode('הקוד תקף ל-' + (r.ttlMin || 20) + ' דקות. לא רואים? בדקו גם בספאם.'));
        codeIn.value = ''; codeIn.focus();
      });
    }

    /* שלב 2 — אימות הקוד. רק כאן נפתח המרחב */
    var verifying = false;
    function verify() {
      if (verifying) return;
      var c = String(codeIn.value || '').replace(/\D/g, '');
      if (c.length !== 6) { codeIn.focus(); return msg('הקוד הוא 6 ספרות.'); }
      verifying = true; ok.disabled = true; ok.textContent = 'נכנס…'; msg('');
      api({ action: 'codeVerify', id: who.id, email: who.email, code: c, space: need[0] }).then(function (r) {
        verifying = false; ok.disabled = false; ok.textContent = 'כניסה';
        if (!r || !r.ok) return msg(errText(r));
        try {
          var hrs = Math.min(Number(r.hours) || 4, 720);
          store().setItem(KEY, JSON.stringify({
            token: r.token, email: r.email, name: r.name || r.email,
            spaces: r.spaces || [], exp: Date.now() + hrs * 3600e3
          }));
        } catch (e) {}
        if (!allowed(session())) return msg('ההרשאה שלך אינה כוללת את ' + label + '.');
        reveal();
      });
    }

    go.addEventListener('click', send);
    ok.addEventListener('click', verify);
    $('pmh-back').addEventListener('click', function () {
      $('pmh-s2').hidden = true; $('pmh-s1').hidden = false; msg('');
      sub.innerHTML = SUB1;
    });
    mail.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
    codeIn.addEventListener('input', function () {
      var c = codeIn.value.replace(/\D/g, '').slice(0, 6);
      if (c !== codeIn.value) codeIn.value = c;
      if (c.length === 6) verify();
    });
    codeIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') verify(); });
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
    /* מצב data-optional: העמוד פותח את מסך הכניסה כשהמשתמש מבקש */
    login: function () {
      if (allowed(session())) return reveal();
      if (!document.getElementById('pmh-gate')) gate();
    },
    /* האם יש סשן תקף שמורשה למרחב של העמוד הזה */
    allowed: function () { return allowed(session()); },
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
  } else if (optional) {
    /* עמוד פתוח — לא נוגעים בסשן של מרחב אחר, ומחכים ל-PMH_AUTH.login() */
  } else {
    if (cur) clearSession();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', gate);
    } else { gate(); }
  }
})();
