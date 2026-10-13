/* נטע — מרחב הרכזים הפדגוגיים (11.10.26, הופרד מצוהר לבקשת מיטל).
   צוהר נשאר למנהלים. כאן: הצ'ק ליסט שלי, בית הספר שלי (החלקים הפדגוגיים), מנור, הידע, ארגז הכלים,
   התוכניות שלי וניצה — העוזרת (nitza.js, אותו שרת כמו קרן עם app=neta).
   הנתונים — אותו tzohar-data מהשער, תמיד בתפקיד rakaz. מנהל/ת שנכנס/ת לכאן מועבר/ת לצוהר.
   הגלובלי window.TZOHAR נשאר בשם הזה — tasks.js ו-nitza.js נשענים עליו.
   מקורות (כל אחד נטען ונכשל בנפרד):
     tzohar-data (שער, מוגן)  — אנשי קשר, נספח, בנות שירות, סל, אקלים, יעדים, טיפים.
                                 השער מחזיר רק את בית הספר של המחובר/ת. בלי שום נתון שהמפקחים כתבו.
     /data/mosdot.json        — רשת, מחוז, מגמות (ציבורי)
     מנור registration.count  — מספרי רישום המורים (ציבורי, מספרים בלבד)
     השתלמות מוסדית mode=public · רישום להשתלמויות mode=schools · מצבת mode=list (ציבורי, מספרים וסטטוס)
   אדמין (all): ?as=<סמל> — רואה את נטע כמו הרכז/ת של בית הספר הזה. */
(function () {
  'use strict';

  var GAS = 'https://script.google.com/macros/s/';
  var GATE = GAS + 'AKfycbynKp-eTNj7pY5lTaSD5_S_qhBH2RgEeLWOPW5ZeF2dTQ5hifL3Q7Lb4KDdQYJ_4Vz9/exec';
  var SRC = {
    mosdot: '/data/mosdot.json',
    menor:  GAS + 'AKfycbwDOLGv0Hr7KNjFJBIslJkDt9cDa2g4-Gfho3dTfI0AP3uwjlM3NGCwSnQkXZd4DUlyHg/exec?action=registration.count&by=school',
    matz:   GAS + 'AKfycbyozBbEf78cLV61ODLyzhzLSyI2auAUMd8YVgp0qZLGs3O4MYAFhAQuVG7NIxjX0Mq7Lw/exec?mode=list',
    bs:     GAS + 'AKfycbybTYpXL_XPluv-r1wUZaWwDsZjAtXX4BeaO7quSQOvqWf0u8EUNJUbAxleScvchzcX/exec?mode=public',
    rg:     GAS + 'AKfycbxraYAhcv_oefTLHxyOfripC0R2LlmPMgYNIWR4rCQUa0FFybRoFHIe4zqgWB1MikF9/exec?mode=schools'
  };
  var SITE = 'https://pedagogiamh.co.il/';
  var LINK = {
    nispach: SITE + 'nispach-baaley-tafkidim.html',
    bs:      SITE + 'hishtalmut-beit-sifrit.html',
    rg:      SITE + 'hishtalmuyot.html#rishum',
    teacher: SITE + 'hadrachot/teacher/',
    menor:   SITE + 'hadrachot/admin-school/'
  };
  var MAREG_TO = 'merhav@pedagogiamh.co.il';   /* כתובת מיטל לכפתורי המייל */
  var WS = [['social', 'רכזים חברתיים'], ['matal', 'מת״ליות'], ['career', 'נתיבים לקריירה'],
            ['honchim', 'מורים חונכים'], ['ped', 'רכזים פדגוגיים'], ['sherut', 'שירות לאומי']];

  var I = {
    house: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    home:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 7-7"/><rect x="3" y="4" width="18" height="16" rx="3"/></svg>',
    school:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-6 9 6"/><path d="M5 9v11h14V9"/><path d="M10 20v-5h4v5"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16M8 16V9M13 16V6M18 16v-4"/></svg>',
    weave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8c3 0 3 8 6 8s3-8 6-8 3 8 6 8"/><path d="M3 16c3 0 3-8 6-8s3 8 6 8 3-8 6-8"/></svg>',
    book:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/></svg>',
    tools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/></svg>',
    tour:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2c2.9.4 5 2.8 5 5.8"/></svg>',
    doc:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
    flag:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
    car:   '<svg class="car" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    mail:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    copy:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    ext:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
    ok:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.5 1.5L7 5M3.5 12l1.5 1.5L7 11M3.5 18l1.5 1.5L7 17"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>'
  };

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var SN = window.SchoolNames || { canon: function (n) { return n; } };
  function canon(n) { return SN.canon(String(n || '').trim()); }
  function toast(t) {
    var el = $('toast'); el.textContent = t; el.classList.add('on');
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('on'); }, 2400);
  }
  function copyText(text) {
    var ok = function () { toast('הועתק'); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, function () { fb(); ok(); });
    else { fb(); ok(); }
    function fb() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }
  }
  function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (window.matchMedia && matchMedia('(pointer:coarse)').matches && innerWidth < 900);
  }
  function fetchJson(url, opts, ms, tries) {
    tries = tries || 3;
    return new Promise(function (res, rej) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; rej(new Error('timeout')); } }, ms);
      fetch(url, opts).then(function (r) { return r.json(); })
        .then(function (j) { if (!done) { done = true; clearTimeout(t); res(j); } })
        .catch(function (e) { if (!done) { done = true; clearTimeout(t); rej(e); } });
    }).catch(function (e) { if (tries > 1) return fetchJson(url, opts, ms, tries - 1); throw e; });
  }
  function token() {
    try { var s = JSON.parse(localStorage.getItem('pmh_auth') || 'null'); if (s && s.token && s.exp > Date.now()) return s.token; } catch (e) {}
    try { var o = JSON.parse(sessionStorage.getItem('pmh_auth') || 'null'); if (o && o.token && o.exp > Date.now()) return o.token; } catch (e) {}
    return '';
  }
  function gate(body, ms) {
    body.token = token();
    return fetchJson(GATE, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }, ms || 60000, 2);
  }
  function phoneOf(v) {
    var s = String(v || '').replace(/[^\d+]/g, '');
    if (s.indexOf('+972') === 0) s = '0' + s.slice(4);
    if (s.indexOf('972') === 0 && s.length === 12) s = '0' + s.slice(3);
    if (/^5\d{8}$/.test(s) || /^[2-9]\d{7}$/.test(s)) s = '0' + s;
    if (/^05\d{8}$/.test(s)) return s.slice(0, 3) + '-' + s.slice(3);
    if (/^0[2-9]\d{7}$/.test(s)) return s.slice(0, 2) + '-' + s.slice(2);
    return s;
  }
  function telA(p) { p = phoneOf(p); return p ? '<a href="tel:' + esc(p.replace(/[^\d+]/g, '')) + '" dir="ltr">' + esc(p) + '</a>' : ''; }
  function mailA(m) {
    return String(m || '').split(/[\s,;]+/).filter(function (x) { return x.indexOf('@') > 0; }).map(function (x) {
      return '<a href="mailto:' + esc(x) + '" dir="ltr">' + esc(x) + '</a>';
    }).join(' ');
  }
  function initials(n) { var p = String(n || '').replace(/^ד["״]ר\s+/, '').trim().split(/\s+/); return esc((p[0] || '').charAt(0) + (p[1] || '').charAt(0)); }
  function fmtDate(v) { var m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (+m[3]) + '.' + (+m[2]) + '.' + m[1] : esc(v); }
  function tag(cls, t) { return '<span class="chip ' + cls + '">' + esc(t) + '</span>'; }

  /* ===== מי נכנס/ה ===== */
  var ME = {}, IS_ADMIN = false, AS = '', ASROLE = '';
  function whoAmI() {
    ME = (window.PMH_AUTH && PMH_AUTH.user()) || {};
    IS_ADMIN = (ME.spaces || []).indexOf('all') > -1;
    var q = new URLSearchParams(location.search);
    AS = IS_ADMIN ? String(q.get('as') || '').trim() : '';
    ASROLE = 'rakaz';
  }

  /* ===== מצב ===== */
  var D = null;                                   /* tzohar-data */
  var R = { mosdot: null, menor: null, matz: null, bs: null, rg: null, names: null };
  var ST = { mosdot: 'load', menor: 'load', matz: 'load', bs: 'load', rg: 'load', names: 'load' };
  var PAGE = 'home';
  var OPEN = {};
  function role() { return D && D.me ? D.me.role : 'principal'; }
  function isRakaz() { return role() === 'rakaz'; }

  function start() {
    whoAmI();
    $('meName').textContent = ME.name || '';
    gate({ action: 'content', key: 'tzohar-data', as: AS, asRole: ASROLE }, 90000).then(function (res) {
      if (!res || !res.ok) {
        if (res && (res.error === 'badsession' || res.error === 'nospace') && window.PMH_AUTH) { PMH_AUTH.logout(); return; }
        throw new Error(res && res.error);
      }
      D = res.data || {};
      if (IS_ADMIN && !AS) return pickSchool();
      /* נטע לרכזים בלבד — מנהל/ת שהגיע/ה לכאן עובר/ת לצוהר */
      if (!IS_ADMIN && !isRakaz()) { location.replace('/tzohar/'); return; }
      if (D.error === 'noschool' || !D.school) return noSchool();
      $('meSchool').textContent = D.school.name;
      $('meRole').textContent = 'רכז/ת פדגוגי/ת';
      $('meRole').hidden = false;
      PAGE = fromHash();
      side(); render();
      loadPublic();
      READY = true;
      document.dispatchEvent(new Event('tzohar:ready'));   /* ניצה (nitza.js) ו-tasks.js נדלקות כאן */
      side();
      try { if (!localStorage.getItem('neta.tour') && !IS_ADMIN) { localStorage.setItem('neta.tour', '1'); tour(0); } } catch (e) {}
    }).catch(function () {
      $('main').innerHTML = '<div class="card"><b>לא הצלחנו לטעון את הנתונים של בית הספר.</b><div class="acts" style="margin-top:10px"><button class="btn primary" id="retry">לנסות שוב</button></div></div>';
      $('retry').onclick = start;
    });
  }

  /* מי שאין לו/ה בית ספר בגיליון ההרשאות */
  function noSchool() {
    $('nav').innerHTML = '';
    var raw = D && D.me && D.me.rawSchool;
    $('main').innerHTML = '<div class="card"><b>לא מצאנו לאיזה בית ספר שייך החשבון הזה.</b>' +
      '<p class="small">' + (raw ? 'בגיליון ההרשאות רשום: "' + esc(raw) + '", והשם לא זוהה כאחד מ-64 בתי הספר. ' : '') +
      'כתבו למיטל ותעדכן את השיוך.</p><div class="acts">' + mailBtns('שיוך בית ספר בנטע', 'שלום מיטל,\nנכנסתי לנטע ולא הופיע בית הספר שלי.\nשם: ' + (ME.name || '') + '\nבית הספר: ', 'כתיבה למיטל') + '</div></div>';
  }

  /* אדמין בלי ?as — בחירת בית ספר */
  function pickSchool() {
    $('meSchool').textContent = 'תצוגת אדמין';
    $('nav').innerHTML = '';
    var list = D.schools || [];
    $('main').innerHTML = '<div class="card head"><h1>נטע · תצוגת אדמין</h1><div class="meta">בחרו בית ספר, ותראו את נטע בדיוק כמו שהרכז/ת הפדגוגי/ת שלו רואה.</div>' +
      '<input class="fld" id="pq" placeholder="חיפוש בית ספר" aria-label="חיפוש בית ספר"></div>' +
      '<div class="card"><ul class="megs" id="pl"></ul></div>';
    function draw() {
      var q = String($('pq').value || '').trim();
      $('pl').innerHTML = list.filter(function (s) { return !q || s.name.indexOf(q) > -1; }).map(function (s) {
        return '<li style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="flex:1;min-width:160px">' + esc(s.name) + '</b>' +
          '<a class="btn sm" href="?as=' + esc(s.semel) + '">כניסה</a></li>';
      }).join('');
    }
    $('pq').oninput = draw; draw();
  }

  /* ===== מקורות ציבוריים ===== */
  function loaded(k, ok) { ST[k] = ok ? 'ok' : 'err'; side(); render(); }
  function loadPublic() {
    var semel = D.school.semel, name = D.school.name;
    fetchJson(SRC.mosdot, {}, 20000).then(function (m) {
      R.mosdot = (m.schools || []).filter(function (s) { return String(s.semel) === semel; })[0] || null; loaded('mosdot', true);
    }).catch(function () { loaded('mosdot', false); });
    fetchJson(SRC.menor, {}, 45000).then(function (d) {
      if (!d || !d.ok) throw new Error();
      if (R.names) return loaded('menor', true);   /* הרשימה עם השמות כבר הגיעה — המספרים שלה קובעים */
      Object.keys(d.bySchool || {}).forEach(function (k) { if (canon(k) === name) R.menor = d.bySchool[k]; });
      loaded('menor', true);
    }).catch(function () { loaded('menor', !!R.names); });
    fetchJson(SRC.matz, {}, 30000).then(function (d) {
      (d.rows || []).forEach(function (row) { if (canon(row[1]) === name) R.matz = Number(row[2]) || 0; });
      loaded('matz', true);
    }).catch(function () { loaded('matz', false); });
    fetchJson(SRC.bs, {}, 45000).then(function (d) {
      /* שליחה חוזרת מוסיפה שורה — האחרונה היא הקובעת */
      (d.rows || []).forEach(function (row) {
        if (String(row['סמל מוסד'] || '').trim() === semel || canon(row['בית הספר']) === name)
          R.bs = { status: String(row['סטטוס'] || ''), name: String(row['שם ההשתלמות'] || ''), ts: String(row['חותמת זמן'] || '') };
      });
      loaded('bs', true);
    }).catch(function () { loaded('bs', false); });
    fetchJson(SRC.rg, {}, 45000).then(function (d) {
      Object.keys(d.schools || {}).forEach(function (k) { if (canon(k) === name) R.rg = d.schools[k]; });
      loaded('rg', true);
    }).catch(function () { loaded('rg', false); });
    /* מי עוד לא נרשם/ה למנור — שמות, דרך השער (13.10.26, כמו בצוהר). כשהרשימה מגיעה, גם המספרים נלקחים ממנה */
    gate({ action: 'content', key: 'tzohar-menor', as: AS, asRole: ASROLE }, 90000).then(function (res) {
      var rows = res && res.ok && res.data && res.data.rows;
      if (!rows) throw new Error();
      R.names = rows;
      var reg = rows.filter(function (x) { return x.state === 'partial' || x.state === 'done'; }).length;
      R.menor = { t: rows.length, r: reg };
      ST.menor = 'ok';
      loaded('names', true);
    }).catch(function () { loaded('names', false); });
  }

  /* ===== "מי?" — כל חוסר נפתח בלחיצה לרשימת השמות + העתקה (13.10.26, מיטל; כמו בצוהר) ===== */
  var WHO = {}, WHO_OPEN = {};
  /* lines: [html, טקסט להעתקה] */
  function whoBox(id, label, lines, copyHead, copyTail) {
    WHO[id] = copyHead + '\n' + lines.map(function (l, i) { return (i + 1) + '. ' + l[1]; }).join('\n') + (copyTail ? '\n\n' + copyTail : '');
    return '<details class="who" data-who="' + id + '"' + (WHO_OPEN[id] ? ' open' : '') + '><summary>' + esc(label) + I.car + '</summary>' +
      '<ol>' + lines.map(function (l) { return '<li>' + l[0] + '</li>'; }).join('') + '</ol>' +
      '<button type="button" class="btn sm" data-copywho="' + id + '">' + I.copy + 'העתקת הרשימה</button></details>';
  }
  function menorMissing() {
    return (R.names || []).filter(function (x) { return x.state === 'none' || x.state === 'started'; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, 'he'); })
      .map(function (x) {
        var t = x.name + (x.subject ? ' · ' + x.subject : '');
        return [esc(t) + (x.state === 'started' ? ' <small>(התחיל/ה ולא סיים/ה)</small>' : ''), t];
      });
  }
  function menorWho() {
    if (ST.names === 'load') return '<div class="small who-wait">טוען את השמות…</div>';
    if (ST.names !== 'ok') return '<div class="small who-wait">השמות לא נטענו כרגע — אפשר לראות אותם במבט של בית הספר במנור.</div>';
    var L = menorMissing();
    if (!L.length) return '';
    return whoBox('menor', (L.length === 1 ? 'מורה אחד/ת עוד לא נרשם/ה' : L.length + ' מורים עוד לא נרשמו') + ' — מי?', L,
      'מורים שעוד לא נרשמו למנור — ' + D.school.name + ':', 'קישור ההרשמה: ' + LINK.teacher);
  }
  var WS_ROLE = { social: /^רכז\.ת חינוך חברתי/, matal: /מת[״"]ל/, ped: /^רכז\.ת פדגוגי/, honchim: /^מורה חונכ?/ };
  var WS_AUD = { social: 'רכז/ת חברתי/ת', matal: 'מת״לית', ped: 'רכז/ת פדגוגי/ת', honchim: 'מורים חונכים', sherut: 'בנות/בני השירות הלאומי', career: 'מוביל/ת נתיבים לקריירה' };
  function rgWhoOf(k) {
    if (k === 'sherut') return (D.sherut || []).map(function (b) { return b.name; }).filter(Boolean);
    var re = WS_ROLE[k];
    if (!re || !D.nispach || !D.nispach.people) return [];
    return D.nispach.people.filter(function (p) { return re.test(String(p.role || '')); }).map(function (p) { return p.name; }).filter(Boolean);
  }
  function rgWho(no) {
    if (!no.length) return '';
    var L = no.map(function (w) {
      var ppl = rgWhoOf(w[0]);
      var t = ppl.length ? ppl.join(', ') : (WS_AUD[w[0]] || 'בעל/ת התפקיד') + (w[0] === 'career' ? ' — לא מופיע/ה בנספח' : ' — אין בנספח');
      return ['<b>' + esc(w[1]) + ':</b> ' + (ppl.length ? esc(t) : '<small>' + esc(t) + '</small>'), w[1] + ': ' + t];
    });
    return whoBox('rg', 'מי צריך/ה להירשם? (' + no.length + ')', L,
      'בעלי תפקידים שעוד לא נרשמו להשתלמויות — ' + D.school.name + ':', 'טופס הרישום: ' + LINK.rg);
  }

  /* ===== הצ'ק ליסט המשרדי — משימה לכל תחום: done / gap / wait / load / err (11.10.26: היה "מה חסר" בכרטיסים;
     נוספו מהצ'ק ליסט למנהלים ב-tfasim: קישור לכל השתלמות, העתקת הקישורים, הפגישה עם רכז/ת התקשוב).
     manual = אפשר לסמן ידנית (כשהמערכת לא יכולה לדעת לבד). השאר נקבעים מהנתונים. */
  function a(url, label, primary) { return '<a class="btn' + (primary ? ' primary' : '') + ' sm" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + I.ext + '</a>'; }
  function items() {
    var out = [], n = D.nispach, TT = window.TZTASKS;
    var mdone = function (k) { return !!(TT && TT.officeDone(k)); };
    /* נספח */
    if (!n) out.push({ k: 'nispach', t: 'נספח בעלי התפקידים', st: 'err' });
    else if (!n.submitted) out.push({ k: 'nispach', t: 'נספח בעלי התפקידים', st: 'gap', d: 'הנספח עוד לא הוגש.', acts: a(LINK.nispach, 'להגשת הנספח', 1), link: 'nispach' });
    else if (n.missing.length) {
      var nm = n.missing.map(function (m) { return m.split(' — ')[0]; });
      out.push({ k: 'nispach', t: 'נספח בעלי התפקידים', st: 'gap',
        d: 'הנספח הוגש ב-' + n.ts + '. חסרים: ' + nm.join(', ') + '.', acts: a(LINK.nispach, 'לעדכון הנספח', 1), link: 'nispach',
        html: esc('הנספח הוגש ב-' + n.ts + '.') + whoBox('nispach', (nm.length === 1 ? 'חסר תפקיד אחד' : 'חסרים ' + nm.length + ' תפקידים') + ' — אילו?',
          nm.map(function (m) { return [esc(m), m]; }), 'תפקידים שחסרים בנספח בעלי התפקידים — ' + D.school.name + ':', 'לעדכון הנספח: ' + LINK.nispach) });
    }
    else out.push({ k: 'nispach', t: 'נספח בעלי התפקידים', st: 'done', d: 'הוגש ב-' + n.ts + '. כל התפקידים מאוישים.' });
    /* השתלמות מוסדית */
    var BS = 'בחירת ההשתלמות המוסדית';
    if (ST.bs !== 'ok') out.push({ k: 'bs', t: BS, st: ST.bs });
    else if (!R.bs) out.push({ k: 'bs', t: BS, st: 'gap', d: 'הבקשה עוד לא הוגשה. בוחרים השתלמות מהקטלוג, או מנחה מבחוץ בכפוף לתנאי הסף, והבקשה עוברת לאישור המפקח/ת.',
      acts: a(LINK.bs, 'להגשת הבקשה', 1), link: 'bs' });
    else {
      var s = R.bs.status;
      if (s.indexOf('ממתין') > -1) out.push({ k: 'bs', t: BS, st: 'wait', d: '"' + R.bs.name + '" ממתינה לאישור המפקח/ת.' });
      else if (s.indexOf('נדח') > -1 || s.indexOf('הוחזר') > -1) out.push({ k: 'bs', t: BS, st: 'gap', d: '"' + R.bs.name + '": ' + s + '. צריך להגיש מחדש.', acts: a(LINK.bs, 'להגשה מחדש', 1), link: 'bs' });
      else out.push({ k: 'bs', t: BS, st: 'done', d: '"' + R.bs.name + '" · ' + s + '.' });
    }
    /* רישום להשתלמויות — לא מסומן לבד כשחסר משהו: לא כל בית ספר צריך את כולן, המנהל/ת מחליט/ה מתי זה גמור */
    var RG = 'רישום בעלי התפקידים להשתלמויות';
    if (ST.rg !== 'ok') out.push({ k: 'rg', t: RG, st: ST.rg, manual: true });
    else {
      var noW = WS.filter(function (w) { return !(Number(R.rg && R.rg[w[0]]) > 0); }), no = noW.map(function (w) { return w[1]; });
      var chips = '<div class="ck-chips">' + WS.map(function (w) {
        var c = Number(R.rg && R.rg[w[0]]) || 0;
        return '<a class="chip' + (c ? ' ok' : '') + '" href="' + SITE + 'hishtalmuyot.html#rg=' + w[0] + '" target="_blank" rel="noopener">' + (c ? I.ok : '') + esc(w[1]) + (c ? ' · ' + c : '') + '</a>';
      }).join('') + '</div>';
      var d = no.length === WS.length ? 'אף אחד מבית הספר עוד לא נרשם. כל בעל/ת תפקיד נרשם/ת בעצמו/ה בטופס אחד.' : no.length ? 'עוד לא נרשמו ל: ' + no.join(', ') + '.' : 'בעלי התפקידים נרשמו לכל ' + WS.length + ' ההשתלמויות.';
      out.push({ k: 'rg', t: RG, st: !no.length || mdone('rg') ? 'done' : 'gap', manual: true, d: d, html: esc(d) + chips + rgWho(noW), link: 'rg',
        acts: a(LINK.rg, 'לטופס הרישום', 1) + '<button type="button" class="btn sm" data-copy="rg">' + I.copy + 'העתקת הקישור לבעלי התפקידים</button>' });
    }
    /* מנור */
    var MN = 'רישום המורים במנור';
    var macts = '<a class="btn primary sm" href="' + LINK.menor + '" target="_blank" rel="noopener">הפירוט המלא במנור' + I.ext + '</a>' +
      '<button type="button" class="btn sm" data-copy="menor">' + I.copy + 'העתקת ההודעה למורים</button>';
    if (ST.menor !== 'ok') out.push({ k: 'menor', t: MN, st: ST.menor });
    else if (!R.menor || !R.menor.t) out.push({ k: 'menor', t: MN, st: 'gap', d: 'אין עדיין מורים רשומים במנור לבית הספר. כל מורה נרשם/ת פעם אחת בקישור הקבוע.', acts: macts, link: 'menor' });
    else if (R.menor.r < R.menor.t) {
      var pc = Math.round(100 * R.menor.r / R.menor.t), dm = 'נרשמו ' + R.menor.r + ' מתוך ' + R.menor.t + ' מורים. ' + (R.menor.t - R.menor.r) + ' עוד לא נרשמו.';
      out.push({ k: 'menor', t: MN, st: 'gap', d: dm, acts: macts, link: 'menor',
        html: esc(dm) + '<div class="meter"><div class="b"><i class="' + (pc < 50 ? 'low' : 'mid') + '" style="width:' + pc + '%"></i></div><span>' + pc + '%</span></div>' + menorWho() });
    }
    else out.push({ k: 'menor', t: MN, st: 'done', d: 'כל ' + R.menor.t + ' המורים נרשמו.' });
    /* סל תוכניות */
    if (D.sal === null || D.sal === undefined) out.push({ k: 'sal', t: 'סל תוכניות תשפ״ז', st: 'err' });
    else if (!D.sal) out.push({ k: 'sal', t: 'סל תוכניות תשפ״ז', st: 'gap', d: 'לא התקבל מסמך סל תוכניות של בית הספר.' });
    else out.push({ k: 'sal', t: 'סל תוכניות תשפ״ז', st: 'done', d: 'הוגש.' + (D.sal.note ? ' הערה: ' + D.sal.note : '') });
    /* פגישה עם רכז/ת התקשוב — מהצ'ק ליסט למנהלים (tfasim), סימון ידני בלבד */
    if (!isRakaz()) out.push({ k: 'tikshuv', t: 'פגישה קצרה עם רכז/ת התקשוב', st: mdone('tikshuv') ? 'done' : 'gap', manual: true,
      d: 'שיחת חשיבה משותפת על תוכנית העבודה של התקשוב בבית הספר לשנה הקרובה.' });
    out.forEach(function (x) {
      if (x.st === 'load') x.d = 'טוען…';
      else if (x.st === 'err') x.d = 'המקור לא נטען כרגע. רענון הדף ינסה שוב.';
      if (!x.html) x.html = esc(x.d || '');
      x.plain = x.st === 'gap' || x.st === 'wait' ? x.d : '';
    });
    return out;
  }
  /* בנטע אין צ'ק ליסט משרדי (הוא של המנהל/ת בצוהר). items() נשאר רק כרקע לניצה (snap.gaps) */
  function openMine() { return window.TZTASKS ? TZTASKS.openCount() : 0; }

  /* ===== ניווט ===== */
  function hasMine() { return !!(window.KEREN && KEREN.enabled() && window.TZTASKS); }
  /* [מפתח, אייקון, שם, משפט לכרטיסייה בדף הבית] */
  function TOOLMODS() { return [window.TZTOOLS, window.NTTOOLS].filter(Boolean); }
  function toolOf(p) { return TOOLMODS().filter(function (m) { return m.owns(p); })[0]; }
  function pages() {
    var P = [['home', I.house, 'ראשי'],
             ['c', I.check, 'המשימות שלי', 'לכתוב, לסמן, תזכורת ביומן וטיוטת מייל לאחראי/ת.'],
             ['s', I.school, 'בית הספר שלי', 'אנשי קשר, מגמות, בעלי תפקידים, אקלים, הוועדה המלווה והיעדים.'],
             ['m', I.chart, 'מנור · הרשמה להשתלמויות', 'כמה מורים נרשמו, מי עוד לא, והודעה מוכנה למורים.'],
             ['k', I.book, 'הידע לרכז/ת', 'הנהלים, בעלי התפקידים והמסמכים הארציים.'],
             ['t', I.tools, 'ארגז הכלים', 'כלים לתכנון ולהנחיית הצוות, וטיפים לרכזים.']];
    if (window.KEREN && KEREN.enabled()) P.push(['p', I.doc, 'התוכניות שלי', 'תוכניות העבודה שניצה בנתה איתך — לערוך, להדפיס ולשלוח.']);
    TOOLMODS().forEach(function (m) { m.pages().forEach(function (t) { P.push(t); }); });   /* כלים: ישיבת צוות (/tzohar/tools.js), תצפיות, בחינות, לוח שנה (tools.js) — 11.10.26 */
    P.push(['tour', I.tour, 'סיור בנטע', 'שתי דקות על כל מה שיש כאן.']);
    return P;
  }
  function fromHash() {
    var h = location.hash.replace('#', '');
    return pages().some(function (p) { return p[0] === h; }) && h !== 'tour' ? h : 'home';
  }
  function side() {
    if (!D || !D.school) return;
    var nm = openMine();
    $('nav').innerHTML = pages().map(function (p) {
      var extra = p[0] === 'c' && nm ? '<span class="n soft">' + nm + '</span>' : '';
      return '<li><button type="button" data-page="' + p[0] + '"' + (PAGE === p[0] ? ' aria-current="true"' : '') + '>' +
        p[1] + esc(p[2]) + extra + '</button></li>';
    }).join('');
    /* תפריט מצומצם במחשב (11.10.26, כמו בצוהר ובתובה): שם הפריט לתווית שקופצת מעל האייקון */
    [].forEach.call($('nav').querySelectorAll('button'), function (b) {
      var x = b.cloneNode(true);
      [].forEach.call(x.querySelectorAll('.n'), function (y) { y.remove(); });
      b.setAttribute('data-tip', x.textContent.trim());
    });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('#railTog')) return;
    var on = document.body.classList.toggle('rail');
    try { localStorage.setItem('neta.rail', on ? '1' : '0'); } catch (err) {}
    $('railTog').querySelector('span').textContent = on ? 'הרחבת התפריט' : 'צמצום התפריט';
  });
  var PLANID = '';   /* תוכנית לפתיחה בעמוד "התוכניות שלי" (מניצה) */
  function go(p, id) {
    if (p === 'tour') { document.body.classList.remove('drawer'); return tour(0); }
    PAGE = p; PLANID = id || '';
    var keep = location.search;
    history.replaceState(null, '', location.pathname + keep + (p === 'home' ? '' : '#' + p));
    document.body.classList.remove('drawer');
    side(); render(true); window.scrollTo(0, 0);
  }

  /* ===== ציור ===== */
  function render(force) {
    if (!D || !D.school) return;
    /* "התוכניות שלי" מנוהל ע"י keren.js — נתון ציבורי שנטען ברקע לא מצייר אותו מחדש (ולא מוחק עריכה) */
    if (PAGE === 'p' && !force && $('kerenPlans')) return;
    /* כלים: נתון שנטען ברקע לא מצייר מחדש — לא עוצר הקלטה ולא מוחק טופס תצפית באמצע */
    var tool = toolOf(PAGE);
    if (tool && !force && document.querySelector('#tzTool[data-p="' + PAGE + '"],#ntTool[data-p="' + PAGE + '"]')) return;
    /* הצ'ק ליסט: נתון שנטען ברקע לא סוגר חלונית יומן/מייל פתוחה או שדה שמקלידים בו */
    if (PAGE === 'c' && !force && document.querySelector('#main .ck-p:not([hidden]), #main .ck-add input:focus, #ckText:not(:placeholder-shown)')) return;
    var h = '';
    if (IS_ADMIN) h += '<div class="asbar">תצוגת אדמין: <b>' + esc(D.school.name) + '</b> · כמו שהרכז/ת רואה' +
      ' · <a href="/tzohar/?as=' + esc(D.school.semel) + '">לצוהר של בית הספר</a>' +
      ' · <a href="./">בית ספר אחר</a></div>';
    h += ({ home: home, c: minePage, s: schoolPage, m: menorPage, k: knowPage, t: toolsPage,
            p: function () { return '<div id="kerenPlans"></div>'; } }[PAGE] || (tool ? function () { return tool.html(PAGE); } : home))();
    $('main').innerHTML = h;
    if (PAGE === 'p' && window.KEREN) KEREN.mountPlans($('kerenPlans'), PLANID);
    if (PAGE === 'c' && window.TZTASKS && $('ckMine')) TZTASKS.mountMine($('ckMine'));
    if (tool) tool.mount(PAGE);
    if (tBox) setTimeout(tPlace, 30);   /* נתון שנטען באמצע הסיור משנה את הפריסה */
  }

  /* 12.10.26 (סקירה): במקום מקף — טוען / לא נטען / אין נתון, כדי שיהיה ברור מה קרה */
  function noVal(st) {
    return '<small class="fx">' + (st === 'load' ? 'טוען…' : st === 'err' ? 'לא נטען — רענון הדף ינסה שוב' : 'אין נתון') + '</small>';
  }
  function headCard(sub) {
    var s = D.school, m = R.mosdot;
    var megs = m ? (m.megamot || []).filter(function (x) { return x.name; }).length : null;
    var p = R.menor && R.menor.t ? Math.round(100 * R.menor.r / R.menor.t) : null;
    var n = openMine();
    return '<div class="card head"><h1>' + esc(s.name) + '</h1><div class="meta">' +
      (m ? esc(m.network) + ' · ' : '') + 'סמל <b>' + esc(s.semel) + '</b>' + (m ? ' · ' + esc(m.district) : '') +
      ' · מפקח/ת: <b>' + esc((s.sups || []).join(', ')) + '</b></div>' + (sub || '') +
      '<div class="facts">' +
      '<div class="fact"><span>תלמידים</span><b>' + (R.matz || noVal(ST.matz)) + '</b></div>' +
      '<div class="fact"><span>מגמות</span><b>' + (megs === null ? noVal(ST.mosdot) : megs) + '</b></div>' +
      '<div class="fact"><span>המשימות שלי</span><b class="' + (n ? '' : 'ok') + '">' + n + '</b></div>' +
      '<div class="fact"><span>מורים שנרשמו למנור</span><b class="' + (p === null ? '' : p < 50 ? 'bad' : p < 100 ? '' : 'ok') + '">' +
        (p === null ? noVal(ST.menor) : p + '%') + '</b></div>' +
      '</div></div>';
  }

  /* הבית (מיטל, 11.10.26 — כמו בשאר המערכות): סיכום בית הספר, ומתחתיו כרטיסייה לכל פריט בתפריט — במחשב ובנייד */
  /* 12.10.26 (סקירת GPT, מיטל): כמו בצוהר — מה נטע עושה בשבילך, "מה עושים עכשיו", שלוש קבוצות, "שלוש הצלחות" */
  var GROUPS = [['work', 'מה דורש טיפול', ['c', 'p', 'y']],
                ['tools', 'כלים לעבודה עם הצוות', ['x', 'h', 'b', 't']],
                ['info', 'מידע על בית הספר', ['s', 'm', 'k']]];
  var WINS = [['x', 'להדביק את רשימת המורים', 'תוך דקה רואים מי עוד לא נצפה השנה.'],
              ['ask', 'לבקש מניצה מערך לישיבת צוות', 'כותבים נושא — ומקבלים מערך מוכן לפי בית הספר שלך.'],
              ['b', 'לראות את לוח הבחינות', 'כל מועדי הבגרות במקום אחד, ופריסת ההיבחנות של בית הספר.']];
  function winsGet() { try { return JSON.parse(localStorage.getItem('neta.wins') || '{}'); } catch (e) { return {}; } }
  function winsPut(o) { try { localStorage.setItem('neta.wins', JSON.stringify(o)); } catch (e) {} }
  function winsCard() {
    var w = winsGet(); if (w.closed || IS_ADMIN) return '';
    var keys = {}; pages().forEach(function (p) { keys[p[0]] = 1; });
    var list = WINS.filter(function (x) { return x[0] === 'ask' ? !!(window.KEREN && KEREN.enabled()) : keys[x[0]]; });
    if (!list.length || list.every(function (x) { return w[x[0]]; })) return '';
    return '<div class="card wins" id="wins"><button type="button" class="wins-x" data-wins="close" aria-label="סגירה">×</button>' +
      '<h2>להתחיל כאן — שלושה דברים של 3 דקות</h2><ol>' + list.map(function (x) {
        return '<li class="' + (w[x[0]] ? 'ok' : '') + '"><button type="button" data-wins="' + x[0] + '">' + (w[x[0]] ? I.ok : '<span class="num"></span>') +
          '<span><b>' + esc(x[1]) + '</b><small>' + esc(x[2]) + '</small></span></button></li>';
      }).join('') + '</ol></div>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-wins]'); if (!b) return;
    var k = b.getAttribute('data-wins'), w = winsGet();
    if (k === 'close') { w.closed = 1; winsPut(w); var c = $('wins'); if (c) c.remove(); return; }
    w[k] = 1; winsPut(w);
    if (k === 'ask') {
      if (window.KEREN) KEREN.open('מערך לישיבת צוות על ');
      render(true);
    } else go(k);
  });
  function home() {
    var first = String(ME.name || '').trim().split(/\s+/)[0];
    var nm0 = openMine();
    var hello0 = IS_ADMIN ? '' : '<p class="lead" style="margin-top:8px">שלום' + (first ? ' ' + esc(first) : '') + '. נטע מרכזת בשבילך את הנתונים הפדגוגיים, ' +
      'מכינה טיוטות (מערך לישיבה, סיכום, משוב תצפית) וזוכרת את המשימות. את/ה רק בודק/ת ומחליט/ה.</p>';
    hello0 += '<div class="next' + (nm0 ? '' : ' calm') + '"><span class="lbl">מה עושים עכשיו</span>' +
      (nm0 ? '<span class="tx"><b>' + (nm0 === 1 ? 'משימה אחת פתוחה ברשימה שלך' : nm0 + ' משימות פתוחות ברשימה שלך') + '</b></span>' +
             '<button type="button" class="btn primary sm" data-page="c">למשימות שלי</button>'
           : '<span class="tx"><b>אין משימות פתוחות.</b><small>אפשר להיעזר באחד הכלים למטה, או לבקש מניצה רעיון לשבוע.</small></span>') + '</div>';
    var byKey = {}; pages().forEach(function (p) { if (p[0] !== 'home') byKey[p[0]] = p; });
    function tileN(p) {
      var cnt = p[0] === 'c' && nm0 ? '<span class="n">' + nm0 + (nm0 === 1 ? ' פתוחה' : ' פתוחות') + '</span>' : '';
      return '<button type="button" class="hub-t" data-page="' + p[0] + '"><span class="hub-i">' + p[1] + '</span><b>' + esc(p[2]) + cnt + '</b><span>' + esc(p[3] || '') + '</span></button>';
    }
    var used = { n: 1, tour: 1 };
    var groups = GROUPS.map(function (g) {
      var t = g[2].filter(function (k) { return byKey[k]; }); t.forEach(function (k) { used[k] = 1; });
      return t.length ? '<h2 class="dgrp">' + esc(g[1]) + '</h2><div class="hub">' + t.map(function (k) { return tileN(byKey[k]); }).join('') + '</div>' : '';
    }).join('');
    var rest = Object.keys(byKey).filter(function (k) { return !used[k]; });
    if (rest.length) groups += '<div class="hub">' + rest.map(function (k) { return tileN(byKey[k]); }).join('') + '</div>';
    var foot = [];
    if (byKey.n) foot.push('<button type="button" data-page="n">' + byKey.n[1] + 'הכירו את ניצה — מה אפשר לבקש</button>');
    foot.push('<button type="button" data-page="tour">' + I.tour + 'סיור של 2 דקות בנטע</button>');
    return headCard(hello0) + winsCard() + '<div id="hub">' + groups + '</div><div class="dfoot">' + foot.join('') + '</div>';
  }
  function minePage() {
    return '<div class="card head"><h1>המשימות שלי</h1><div class="meta">משימות שכתבת לבד או שהוספת מהתשובות של ניצה. פרטי לבית הספר; המפקח/ת לא רואה אותן.</div></div>' +
      (hasMine() ? '<div id="ckMine"></div>' : '<div class="card"><div class="empty">הצ\'ק ליסט יפעל כשניצה תופעל.</div></div>');
  }

  /* ניצה ליד הנתונים (11.10.26): הכפתור פותח אותה בהקשר — אקלים / ועדה / יעדים / כלי */
  function helpOn() { return !!(window.KEREN && KEREN.helpWith && KEREN.enabled()); }
  function helpBtn(type, title, label, id) {
    return helpOn() ? '<div class="acts help-row"><button type="button" class="btn amber sm" data-help="' + type + '" data-ht="' + esc(title) + '"' + (id ? ' data-hid="' + esc(id) + '"' : '') + '>' +
      I.spark + esc(label) + '</button></div>' : '';
  }
  function sec(key, icon, title, sum, body) {
    return '<details class="card sec" data-sec="' + key + '"' + (OPEN[key] ? ' open' : '') + '><summary><span class="st">' + icon + esc(title) + '</span>' +
      '<span class="sum">' + (sum || '') + '</span>' + I.car + '</summary><div class="sb">' + body + '</div></details>';
  }
  function person(roleTxt, name, phone, email, extra) {
    var links = [telA(phone), mailA(email)].filter(Boolean).join('');
    return '<div class="person"><div class="av">' + initials(name) + '</div><div class="tx"><div class="r">' + esc(roleTxt) + '</div>' +
      '<div class="nm">' + esc(name) + '</div>' + (links ? '<div class="lk">' + links + '</div>' : '') + (extra ? '<div class="x">' + extra + '</div>' : '') + '</div></div>';
  }
  function failed(k) { return '<div class="empty">' + (k === 'load' ? 'טוען…' : 'המקור לא נטען כרגע. רענון הדף ינסה שוב.') + '</div>'; }

  function schoolPage() {
    var h = headCard(), s = D.school;

    /* אנשי קשר */
    var cs = D.contacts, cB = '', cS = '';
    if (!cs) { cB = failed(); cS = 'לא נטען'; }
    else {
      var mine = cs.filter(function (c) { return !c.sup; }), sups = cs.filter(function (c) { return c.sup; });
      var office = mine.map(function (c) { return c.office; }).filter(Boolean)[0];
      cS = esc((s.sups || []).join(', '));
      if (office) cB += '<div class="note">' + I.phone.replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px"') + ' טלפון בית הספר: ' + telA(office) + '</div>';
      cB += mine.map(function (c) { return person(c.role || c.kind || 'מנהל/ת', c.name, c.phone, c.email); }).join('');
      (s.sups || []).forEach(function (n) {
        var c = sups.filter(function (x) { return String(x.name).trim() === n; })[0];
        cB += person('מפקח/ת פדגוגי/ת', n, c && c.phone, c && c.email);
      });
    }
    h += '<div id="secs">' + sec('contacts', I.phone, 'אנשי קשר והמפקח/ת', cS, cB);

    /* מגמות */
    var m = R.mosdot, megs = m ? (m.megamot || []).filter(function (x) { return x.name; }) : [];
    h += sec('megamot', I.book, 'מגמות', ST.mosdot === 'ok' ? megs.length + ' מגמות' : (ST.mosdot === 'load' ? 'טוען…' : 'לא נטען'),
      ST.mosdot !== 'ok' ? failed(ST.mosdot) : megs.length ? '<ul class="megs">' + megs.map(function (x) {
        var sub = [x.grades ? 'שכבות ' + x.grades : '', x.sups && x.sups.length ? 'מפקח/ת מקצועי/ת: ' + x.sups.join(', ') : ''].filter(Boolean).join(' · ');
        return '<li>' + esc(x.name) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</li>';
      }).join('') + '</ul>' : '<div class="empty">אין מגמות רשומות בפריסה.</div>');

    /* בעלי תפקידים */
    var n = D.nispach, rB = '', rS = '';
    if (!n) { rB = failed(); rS = 'לא נטען'; }
    else if (!n.submitted) { rS = tag('', 'הנספח לא הוגש'); rB = '<div class="empty">הנספח עוד לא הוגש.</div><div class="acts"><a class="btn primary sm" href="' + LINK.nispach + '" target="_blank" rel="noopener">להגשת הנספח' + I.ext + '</a></div>'; }
    else {
      rS = n.people.length + ' · ' + (n.missing.length ? tag('', n.missing.length === 1 ? 'חסר תפקיד אחד' : n.missing.length + ' תפקידים חסרים') : tag('ok', 'מאויש'));
      rB = '<div class="small" style="margin-bottom:10px">הנספח הוגש ' + esc(n.ts) + ' · <a href="' + LINK.nispach + '" target="_blank" rel="noopener">לעדכון הנספח</a></div>';
      if (n.missing.length) rB += '<div class="miss">' + n.missing.map(function (x) { return tag('', 'חסר: ' + x.split(' — ')[0]); }).join('') + '</div>';
      rB += n.people.map(function (q) { return person(String(q.role).split(' — ')[0] + (q.detail ? ' · ' + q.detail : ''), q.name, q.phone, q.email); }).join('');
    }
    h += sec('roles', I.users, 'בעלי התפקידים', rS, rB);

    /* בנות שירות */
    var sh = D.sherut;
    h += sec('sherut', I.users, 'בנות שירות', !sh ? 'לא נטען' : sh.length ? (sh.length === 1 ? 'בת שירות אחת' : sh.length + ' בנות שירות') : 'אין',
      !sh ? failed() : sh.length ? sh.map(function (b) {
        return person('בת שירות' + (b.coord ? ' · רכזת: ' + b.coord : ''), b.name, b.phone, b.email, esc([b.city, b.from ? 'שירות ' + fmtDate(b.from) + '–' + fmtDate(b.to) : b.status].filter(Boolean).join(' · ')));
      }).join('') : '<div class="empty">אין בנות שירות משובצות בבית הספר.</div>');

    /* השתלמויות */
    var hB = '', hS = [];
    if (ST.bs !== 'ok') hB += failed(ST.bs);
    else if (!R.bs) { hS.push(tag('', 'מוסדית לא הוגשה')); hB += '<div class="miss">' + tag('', 'השתלמות מוסדית לא הוגשה') + '</div>'; }
    else {
      var bst = R.bs.status, bc = bst.indexOf('מאושר') > -1 ? 'ok' : (bst.indexOf('ממתין') > -1 ? 'warn' : '');
      hS.push(tag(bc, 'מוסדית: ' + bst.split(' — ')[0]));
      hB += person('השתלמות מוסדית', R.bs.name, '', '', tag(bc, bst) + (R.bs.ts ? ' · הוגשה ' + esc(R.bs.ts.split(' ')[0]) : ''));
    }
    if (ST.rg === 'ok') {
      var tot = 0; WS.forEach(function (w) { tot += Number(R.rg && R.rg[w[0]]) || 0; });
      hS.push(tot ? tot + ' נרשמו' : tag('', 'אין נרשמים'));
      hB += '<h4 style="margin:14px 0 4px">רישום בעלי התפקידים להשתלמויות</h4><ul class="megs">' + WS.map(function (w) {
        var c = Number(R.rg && R.rg[w[0]]) || 0;
        var ppl = c ? [] : rgWhoOf(w[0]);   /* מי צריך/ה להירשם — לפי הנספח (13.10.26) */
        return '<li>' + esc(w[1]) + '<small>' + (c ? c + ' נרשמו' : 'עוד אף אחד לא נרשם' + (ppl.length ? ' · בעל/ת התפקיד: ' + esc(ppl.join(', ')) : '')) + '</small></li>';
      }).join('') + '</ul>';
    } else hB += failed(ST.rg);
    h += sec('hisht', I.book, 'השתלמויות', hS.join(' · ') || 'טוען…', hB);

    /* סל תוכניות */
    var sl = D.sal;
    h += sec('sal', I.doc, 'סל תוכניות תשפ״ז', sl === null || sl === undefined ? 'לא נטען' : sl ? tag('ok', 'הוגש') : tag('', 'לא הוגש'),
      sl === null || sl === undefined ? failed() : !sl ? '<div class="empty">לא התקבל מסמך סל תוכניות של בית הספר.</div>' :
        (sl.note ? '<div class="note"><b>הערה:</b> ' + esc(sl.note) + '</div>' : '') +
        (sl.hasDoc ? '<div class="acts"><button type="button" class="btn primary sm" data-saldoc="1">' + I.doc + 'פתיחת המסמך שהוגש</button></div>' : '<div class="small">המסמך עוד לא הועלה.</div>') +
        (sl.file ? '<div class="small" style="margin-top:6px">' + esc(sl.file) + '</div>' : ''));

    /* אקלים */
    h += aklimSec();

    /* ועדה מלווה (מיטל, 10.10.26): המנהל/ת — הכול + המסמכים; הרכז/ת — החלקים הפדגוגיים */
    h += vaadSec();

    /* יעדים */
    var y = D.yaadim;
    h += sec('yaad', I.flag, 'היעדים מהוועדה המלווה האחרונה', y === null || y === undefined ? 'לא נטען' : y ? 'יש יעדים' : 'אין',
      y === null || y === undefined ? failed() : y ? '<div class="pre">' + esc(y) + '</div>' + helpBtn('yaad', 'היעדים מהוועדה המלווה', 'עבודה על היעדים עם ניצה') : '<div class="empty">אין יעדים מהוועדה המלווה האחרונה בקובץ.</div>');
    return h + '</div>';
  }

  var VAAD_SECS = [['topics', 'נושאים מרכזיים'], ['strengths', 'חוזקות'], ['gaps', 'פערים ואתגרים'], ['decisions', 'החלטות וצעדים להמשך'], ['facts', 'נתונים']];
  function vaadSec() {
    var rows = D.vaadot, rk = true, title = 'ועדה מלווה תשפ״ו' + (rk ? ' · החלקים הפדגוגיים' : '');
    if (!rows) return sec('vaad', I.flag, title, 'לא נטען', failed());
    if (!rows.length) return sec('vaad', I.flag, title, 'אין', '<div class="empty">לא התקבל מסמך של ועדה מלווה מתשפ״ו.</div>');
    var by = {}, order = [];
    rows.forEach(function (x) { var st = x.stage || 'ועדה מלווה'; if (!by[st]) { by[st] = []; order.push(st); } by[st].push(x); });
    function dateOf(st) { return by[st].map(function (x) { return x.date; }).sort().pop() || ''; }
    order.sort(function (a, b) { return dateOf(b).localeCompare(dateOf(a)); });
    var body = order.map(function (st, i) {
      var J = {}, docs = by[st];
      docs.forEach(function (x) {
        var j = null; try { j = JSON.parse(rk ? x.ped : x.summary); } catch (e) { j = null; }
        if (!j) return;
        VAAD_SECS.forEach(function (k) { (j[k[0]] || []).forEach(function (t) { J[k[0]] = J[k[0]] || []; if (J[k[0]].indexOf(t) < 0) J[k[0]].push(t); }); });
      });
      var inner = VAAD_SECS.map(function (k) {
        var L = J[k[0]] || [];
        return L.length ? '<h4 style="margin:10px 0 4px">' + esc(k[1]) + '</h4><ul class="lvl">' + L.map(function (t) { return '<li><span>' + esc(t) + '</span></li>'; }).join('') + '</ul>' : '';
      }).join('') || '<div class="empty">' + (rk ? 'אין במסמך הזה חלקים פדגוגיים.' : 'אין תקציר למסמך הזה.') + '</div>';
      var btns = rk ? '' : docs.filter(function (x) { return x.fid; }).map(function (x) {
        return '<button type="button" class="btn sm" data-vdoc="' + esc(x.fid) + '">' + I.doc + 'פתיחה: ' + esc(x.kind || 'מסמך') + '</button>';
      }).join('');
      return '<div' + (i ? ' style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)"' : '') + '><b>' + esc(st === 'ועדה מלווה' ? 'תשפ״ו' : st) + '</b>' +
        (dateOf(st) ? ' <span class="small">· ' + fmtDate(dateOf(st)) + '</span>' : '') + (btns ? '<div class="acts" style="margin-top:6px">' + btns + '</div>' : '') + inner + '</div>';
    }).join('');
    return sec('vaad', I.flag, title, order.length === 1 ? 'ועדה אחת' : order.length + ' ועדות', body + helpBtn('vaad', 'הוועדה המלווה', 'הכנה לוועדה עם ניצה'));
  }
  function openVaada(fid) {
    var w = window.open('', '_blank');
    if (w) w.document.write('<p dir="rtl" style="font-family:Arial,sans-serif;padding:24px">טוען את המסמך…</p>');
    gate({ action: 'vaadaDoc', semel: D.school.semel, fid: fid }, 120000).then(function (d) {
      if (!d || !d.ok) throw new Error(d && d.error);
      var bin = atob(d.b64), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([arr], { type: d.mime || 'application/pdf' }));
      if (w) w.location.href = url; else location.href = url;
    }).catch(function () { if (w) w.close(); toast('לא הצלחנו לפתוח את המסמך. נסו שוב בעוד רגע.'); });
  }

  var AKL_AUD = ['מורים', 'תלמידים', 'פדגוגיה'];
  function num(v) { v = String(v == null ? '' : v).trim(); return v === '' || isNaN(Number(v)) ? null : Number(v); }
  function aklimSec() {
    var rows = D.aklim;
    if (!rows) return sec('akl', I.chart, 'שאלון אקלים תשפ״ו', 'לא נטען', failed());
    if (!rows.length) return sec('akl', I.chart, 'שאלון אקלים תשפ״ו', 'לא התקבל דוח', '<div class="empty">לא התקבל דוח אקלים תשפ״ו לבית הספר.</div>');
    var by = {}, keys = [];
    rows.forEach(function (r) { var k = r['קהל'] + '|' + (r['יחידה'] || ''); if (!by[k]) { by[k] = []; keys.push(k); } by[k].push(r); });
    keys.sort(function (a, b) { return AKL_AUD.indexOf(a.split('|')[0]) - AKL_AUD.indexOf(b.split('|')[0]) || a.localeCompare(b); });
    var weak = D.aklimWeak || [];
    var body = '<div class="small">הפס: ציון תשפ״ו (0–100) · הקו הכתום: ההשוואה · החץ: שינוי מתשפ״ה</div>' + keys.map(function (k) {
      var list = by[k], aud = k.split('|')[0], unit = k.split('|')[1], f = list[0];
      var resp = num(f['משיבים']);
      var w = weak.filter(function (x) { return x['קהל'] === aud && String(x['יחידה'] || '') === unit; })
        .sort(function (a, b) { return Number(a['דירוג בכרטיס']) - Number(b['דירוג בכרטיס']); });
      return '<h4 style="margin:16px 0 2px">' + esc(aud + (unit ? ' · ' + unit : '')) + (resp !== null ? ' <span class="small">· ' + resp + ' משיבים</span>' : '') + '</h4>' +
        '<ul class="akl">' + list.map(function (r) {
          var cur = num(r['תשפ"ו']), cmp = num(r['השוואה']), chg = num(r['שינוי מתשפ"ה']);
          var cl = function (x) { return Math.max(0, Math.min(100, x)); };
          return '<li class="akb"><div class="akn">' + esc(r['ממד']) + '</div><div class="akr"><div class="akt"><i class="akf" style="width:' + cl(cur || 0) + '%"></i>' +
            (cmp !== null ? '<i class="akc" style="inset-inline-start:' + cl(cmp) + '%"></i>' : '') + '</div>' +
            '<div class="akv"><b>' + (cur === null ? '—' : Math.round(cur)) + '</b>' + (cmp !== null ? '<span>השוואה ' + Math.round(cmp) + '</span>' : '') +
            (chg !== null ? '<span>' + (Math.abs(chg) < 0.5 ? '=' : (chg > 0 ? '↑ ' : '↓ ') + Math.abs(Math.round(chg))) + '</span>' : '') + '</div></div></li>';
        }).join('') + '</ul>' +
        (w.length ? '<details style="margin-top:8px"><summary class="small" style="cursor:pointer">3 ההיגדים עם הציון הנמוך</summary><ul class="lvl">' + w.map(function (x) {
          return '<li><span>' + esc(x['היגד']) + '<small style="display:block;color:var(--muted)">' + esc(x['ממד']) + '</small></span><span class="chip warn">' + Math.round(num(x['ממוצע']) || 0) + '</span></li>';
        }).join('') + '</ul></details>' : '');
    }).join('');
    var got = AKL_AUD.filter(function (a) { return keys.some(function (k) { return k.split('|')[0] === a; }); });
    return sec('akl', I.chart, 'שאלון אקלים תשפ״ו', 'התקבלו: ' + esc(got.join(' · ')), body + helpBtn('aklim', 'שאלון האקלים', 'עבודה על התוצאות עם ניצה'));
  }

  /* ===== מנור ===== */
  function menorMsg() {
    return 'מורים יקרים,\nכל המורים בבית הספר נרשמים השנה למנור — כך ההדרכות, ההשתלמויות והנוכחות שלכם מסודרות במקום אחד.\n' +
      'ההרשמה לוקחת שתי דקות: מייל, קוד שמגיע למייל, ובחירת המקצוע.\nלהרשמה: ' + LINK.teacher + '\nתודה!';
  }
  function menorPage() {
    var h = '<div class="card head"><h1>מנור · רישום המורים</h1><div class="meta">מנור מרכז את ההדרכות וההשתלמויות של המורים. כל מורה נרשם/ת פעם אחת.</div></div>';
    var t = R.menor && R.menor.t, r = R.menor ? R.menor.r : 0, pc = t ? Math.round(100 * r / t) : 0;
    /* המספרים תלויים במנור; הכפתור וההודעה למורים מוצגים גם כשהמספרים עוד נטענים */
    h += '<div class="card"><p class="eyebrow">' + I.chart + 'המצב היום</p>' +
      (ST.menor !== 'ok' ? failed(ST.menor) : t ?'<div class="meter"><div class="b"><i class="' + (pc < 50 ? 'low' : pc < 100 ? 'mid' : '') + '" style="width:' + pc + '%"></i></div><span>' + pc + '%</span></div>' +
        '<div>נרשמו <b>' + r + '</b> מתוך <b>' + t + '</b> מורים' + (t > r ? ' · <b>' + (t - r) + '</b> עוד לא נרשמו' : ' · כולם נרשמו') + '</div>'
        : '<div class="empty">אין עדיין מורים רשומים במנור לבית הספר.</div>') + '</div>';
    /* 13.10.26 (מיטל): השמות כאן — לא רק קישור למנור */
    var L = ST.names === 'ok' ? menorMissing() : null;
    h += '<div class="card"><p class="eyebrow">' + I.users + 'מי עוד לא נרשם/ה</p>' +
      (L === null ? '<p style="margin:0 0 10px">' + (ST.names === 'load' ? 'טוען את השמות…' : 'השמות לא נטענו כרגע. רענון הדף ינסה שוב, ואפשר לראות אותם גם במבט של בית הספר במנור.') + '</p>'
       : !L.length ? '<div class="allok" style="margin:0 0 10px">' + I.ok + 'כל המורים נרשמו.</div>'
       : '<ol class="who-list">' + L.map(function (l) { return '<li>' + l[0] + '</li>'; }).join('') + '</ol>' +
         '<div class="acts" style="margin-bottom:10px"><button type="button" class="btn primary" data-copywho="menor">' + I.copy + 'העתקת הרשימה</button></div>') +
      '<div class="small">כל הפרטים (גם מי נרשם/ה ומה עוד חסר לו/ה) — <a href="' + LINK.menor + '" target="_blank" rel="noopener">במבט של בית הספר במנור</a>. מנור מבקש כניסה משלו בפעם הראשונה (קוד במייל).</div></div>';
    if (L && L.length) menorWho();   /* ממלא את טקסט ההעתקה */
    /* השתתפות המורים בהדרכות ובהשתלמויות — כבר קיימת במבט של בית הספר במנור (לשוניות "נוכחות בהדרכות", "השתלמות מקצועית"), 11.10.26 */
    h += '<div class="card"><p class="eyebrow">' + I.chart + 'המורים בהדרכות ובהשתלמויות</p>' +
      '<p style="margin:0 0 10px">מי השתתף/ה, כמה שעות, ומי עוד לא השתתף/ה בשום הדרכה — במבט של בית הספר במנור, בלשוניות "נוכחות בהדרכות" ו"השתלמות מקצועית".</p>' +
      '<div class="acts"><a class="btn" href="' + LINK.menor + '" target="_blank" rel="noopener">לנוכחות ולהשתלמויות במנור' + I.ext + '</a></div></div>';
    h += '<div class="card" id="menorMsg"><p class="eyebrow">' + I.mail + 'הודעה מוכנה למורים</p><div class="pre note">' + esc(menorMsg()) + '</div>' +
      '<div class="acts"><button type="button" class="btn" data-copy="menor">' + I.copy + 'העתקת ההודעה</button>' +
      '<button type="button" class="btn" data-copy="link">' + I.copy + 'העתקת קישור ההרשמה בלבד</button></div></div>';
    return h;
  }

  /* כפתור מייל אל מיטל: בנייד mailto אמיתי (נבנה כבר בציור), במחשב טיוטת Gmail + העתקת HTML מימין לשמאל, ולצדו mailto */
  var MAILS = [];
  function mailBtns(sub, text, label, primary) {
    var href = 'mailto:' + MAREG_TO + '?subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(text);
    var cls = 'btn' + (primary ? ' amber' : ' primary');
    if (isMobile()) return '<a class="' + cls + '" href="' + esc(href) + '">' + I.mail + esc(label) + '</a>';
    MAILS.push({ sub: sub, text: text });
    return '<button type="button" class="' + cls + '" data-gmail="' + (MAILS.length - 1) + '">' + I.mail + esc(label) + '</button>' +
      '<a class="btn sm" href="' + esc(href) + '">בתוכנת המייל (Outlook)</a>';
  }
  function gmailOpen(i) {
    var m = MAILS[i]; if (!m) return;
    var html = '<div dir="rtl" style="text-align:right;font-family:Arial,sans-serif;font-size:15px;line-height:1.6">' +
      esc(m.text).replace(/\n/g, '<br>') + '</div>';
    var copied = false;
    /* הלוח מקבל את ה-HTML המלא (עם dir="rtl") — בלי זה Chrome מעתיק עטיפה של span בלי הכיוון */
    function onCopy(ev) { ev.clipboardData.setData('text/html', html); ev.clipboardData.setData('text/plain', m.text); ev.preventDefault(); }
    document.addEventListener('copy', onCopy);
    try {
      var d = document.createElement('div');
      d.contentEditable = 'true'; d.innerHTML = html;
      d.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(d);
      var rg = document.createRange(); rg.selectNodeContents(d);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg);
      copied = document.execCommand('copy');
      sel.removeAllRanges(); document.body.removeChild(d);
    } catch (e) { copied = false; }
    document.removeEventListener('copy', onCopy);
    var url = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(MAREG_TO) + '&su=' + encodeURIComponent(m.sub) +
      (copied ? '' : '&body=' + encodeURIComponent(m.text));
    window.open(url, '_blank', 'noopener');
    toast(copied ? 'הנוסח הועתק. לחצו בגוף המייל ו-Ctrl+V' : 'נפתחה טיוטה');
  }

  /* ===== הידע למנהל/ת ולרכז/ת — עמודי האתר הארציים ===== */
  var KNOW = [
    ['נהלים והנחיות', [
      ['procedures.html', 'נהלים', 'כל הנהלים של המינהל במקום אחד'],
      ['cherum-nehalim.html', 'חירום ואירוע חריג', 'מה עושים ולמי מדווחים'],
      ['bikur-sadir.html', 'ביקור סדיר ומניעת נשירה', 'הנחיות לדיווח ולטיפול'],
      ['https://apps.education.gov.il/mankal/', 'חוזרי מנכ״ל', 'משרד החינוך · אתר חיצוני']
    ]],
    ['בעלי תפקידים', [
      ['tafkidim.html', 'בעלי התפקידים', 'הגדרות התפקידים בבית הספר'],
      ['baaley-tafkidim.html', 'חלוקת שעות, גמולים ודגשים', 'מסמך ההנחיות לבעלי התפקידים'],
      ['hishtalmuyot.html', 'השתלמויות ופיתוח מקצועי', 'ההשתלמויות של תשפ״ז והרישום'],
      ['gantt.html', 'לוח גאנט צוותים', 'מועדי המפגשים של כל הצוותים']
    ]],
    ['השנה בבית הספר', [
      ['tashpaz.html', 'היערכות תשפ״ז', 'מה צריך להיות מוכן'],
      ['vaada-melava.html', 'ועדה מלווה בית ספרית', 'פעמיים בשנה, מול הפיקוח והרשת'],
      ['michtav-aklim.html', 'פגישת למידה על שאלוני האקלים', 'איך לומדים מהתוצאות'],
      ['doch-pedagogi.html', 'הדוח הפדגוגי', 'מה נכנס לדוח ואיך'],
      ['pikuah-miktzoi.html', 'פיקוח מקצועי', 'מגמות ומפקחים מקצועיים']
    ]],
    ['כלים ומסמכים', [
      ['documents.html', 'כלים ניהוליים פדגוגיים', 'תבניות ומסמכים לעבודה'],
      ['matzpen.html', 'מצפן החינוך היוצר', 'התפיסה הפדגוגית']
    ]]
  ];
  function href(u) { return /^https?:/.test(u) ? u : SITE + u; }
  function tiles(list) {
    return '<div class="tiles">' + list.map(function (x) {
      return '<a class="tile" href="' + esc(href(x[0])) + '" target="_blank" rel="noopener"><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span></a>';
    }).join('') + '</div>';
  }
  function knowPage() {
    /* הטיפים לרכזים מוצגים בארגז הכלים */
    return '<div class="card head"><h1>הידע לרכז/ת</h1><div class="meta">הנהלים, בעלי התפקידים והמסמכים הארציים — כל אחד נפתח בעמוד שלו באתר.</div></div>' +
      KNOW.map(function (g) { return '<div class="grp-h">' + esc(g[0]) + '</div>' + tiles(g[1]); }).join('');
  }

  /* ===== ארגז הכלים לרכז/ת ===== */
  var TOOLS = [
    ['התוכנית השנתית של הרכז/ת', [
      ['rakaz-tochnit-avoda.html', 'תוכנית עבודה שנתית', 'יעדים, פעולות, לוחות זמנים ומדדי הצלחה'],
      ['rakaz-tochnit-yeadim.html', 'מטרות־על ויעדי SMART', 'איך מנסחים יעד שאפשר למדוד'],
      ['rakaz-tochnit-chodshi.html', 'הפוקוס החודשי והסדירויות', 'על מה עובדים בכל חודש'],
      ['rakaz-tochnit-klim.html', 'שנים־עשר הכלים', 'הכלים של הרכז/ת לאורך השנה'],
      ['rakaz-tochnit-klita.html', 'קליטת מורים חדשים', 'יומן רפלקציה וקהילות לומדות']
    ]],
    ['תכנון והוראה', [
      ['rakaz-tavnit-tichnun.html', 'תבנית לתכנון לימודי', 'נושאים, מיומנויות, שעות והערכה'],
      ['rakaz-tochnit-pratanit.html', 'תוכנית פדגוגית פרטנית', 'לתלמיד/ה שזקוק/ה לתוכנית מותאמת'],
      ['rakaz-prisat-hivachanut.html', 'פריסת היבחנות תלת־שנתית', 'תוכנית ההיבחנות לתשפ״ז']
    ]],
    ['מדידה, מיפוי והערכה', [
      ['rakaz-mipuy-beit-sifri.html', 'מיפוי בית ספרי', 'התמונה הכוללת כבסיס לתכנון'],
      ['rakaz-chovert-sheelonim.html', 'חוברת השאלונים', 'מספרי שאלונים, יחידות והתאמות'],
      ['rakaz-sheelon-morim.html', 'שאלון פדגוגיה · מורים', 'הבסיס לפגישת הלמידה'],
      ['rakaz-sheelon-talmidim.html', 'שאלון פדגוגיה · תלמידים', 'התמונה מנקודת המבט שלהם']
    ]],
    ['התפקיד', [
      ['tafkidim.html#rakaz-pedagogi', 'הגדרת התפקיד', 'רכז/ת פדגוגי/ת יוצר/ת · סגן/ית מנהל/ת', 'nohelp'],   /* nohelp: אין מה להתאים (ניסוי 12.10.26) */
      ['rakaz-pedagogi-klim.html', 'ארגז הכלים המלא באתר', 'כל הכלים ומסמכי היסוד', 'nohelp']
    ]]
  ];
  function toolTiles(list) {
    if (!helpOn()) return tiles(list);
    return '<div class="tiles">' + list.map(function (x) {
      return '<div class="tile-w"><a class="tile" href="' + esc(href(x[0])) + '" target="_blank" rel="noopener"><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span></a>' + (x[3] === 'nohelp' ? '</div>' :
        '<button type="button" class="tile-help" data-help="tool" data-ht="' + esc(x[1]) + '" data-hid="' + esc(x[0]) + '">' + I.spark + 'התאמה לבית הספר שלנו</button></div>');
    }).join('') + '</div>';
  }
  function toolsPage() {
    return '<div class="card head"><h1>ארגז הכלים לרכז/ת הפדגוגי/ת</h1><div class="meta">כלים לתכנון, להנחיית הצוות ולעבודה הפדגוגית, וטיפים שמתעדכנים במהלך השנה.</div></div>' +
      tipsBlock('rakaz') + TOOLS.map(function (g) { return '<div class="grp-h">' + esc(g[0]) + '</div>' + toolTiles(g[1]); }).join('');
  }

  /* טיפים מהגיליון — מיטל ורויטל מוסיפות. where: באיזה עמוד מוצגים (rakaz = ארגז הכלים, principal = הידע) */
  function tipsBlock(where) {
    var list = (D.tips || []).filter(function (t) {
      if (where === 'rakaz') return t.who === 'rakaz' || (isRakaz() && t.who === 'all');
      return t.who === 'principal' || (!isRakaz() && t.who === 'all');
    });
    var add = IS_ADMIN ? '<details class="card" style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">+ הוספת טיפ</summary>' +
      '<input class="fld" id="tpT" placeholder="כותרת" maxlength="200"><textarea class="fld" id="tpX" placeholder="הטיפ עצמו (אפשר כמה שורות)"></textarea>' +
      '<input class="fld" id="tpL" placeholder="קישור (לא חובה)" dir="ltr">' +
      '<select class="fld" id="tpW"><option value="rakaz">לרכזים (ארגז הכלים)</option><option value="principal">למנהלים (הידע)</option><option value="all">לשניהם</option></select>' +
      '<div class="acts" style="margin-top:10px"><button type="button" class="btn primary" id="tpGo">שמירה</button></div></details>' : '';
    if (!list.length && !IS_ADMIN) return '';
    return '<div class="grp-h">' + I.light.replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-3px;color:#c98a1b"') + ' טיפים ' + (where === 'rakaz' ? 'לרכזים' : 'למנהלים') + '</div>' +
      (list.length ? '<div class="tiles">' + list.map(function (t) {
        var inner = '<b>' + esc(t.title) + '</b>' + (t.text ? '<span style="white-space:pre-wrap">' + esc(t.text) + '</span>' : '') +
          (IS_ADMIN ? '<span class="small">' + fmtDate(t.date) + (t.active ? '' : ' · מוסתר') + ' · <button type="button" class="btn sm" data-tip="' + t.row + '" data-op="' + (t.active ? 'hide' : 'show') + '">' + (t.active ? 'הסתרה' : 'החזרה') + '</button></span>' : '');
        return t.link && !IS_ADMIN ? '<a class="tile tip" href="' + esc(t.link) + '" target="_blank" rel="noopener">' + inner + '</a>'
          : '<div class="tile tip' + (t.active ? '' : ' off') + '">' + inner + (t.link ? '<a href="' + esc(t.link) + '" target="_blank" rel="noopener" class="small">לקישור</a>' : '') + '</div>';
      }).join('') + '</div>' : '<div class="empty">עוד אין טיפים כאן.</div>') + add;
  }
  function tipSave() {
    var b = { action: 'tzTip', op: 'add', title: $('tpT').value, text: $('tpX').value, link: $('tpL').value, who: $('tpW').value };
    $('tpGo').disabled = true;
    gate(b).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.error);
      toast('הטיפ נשמר'); start();
    }).catch(function (e) { $('tpGo').disabled = false; toast(String(e.message) === 'badlink' ? 'הקישור צריך להתחיל ב-https://' : 'השמירה נכשלה. נסו שוב.'); });
  }
  function tipToggle(row, op) {
    gate({ action: 'tzTip', op: op, row: row }).then(function (r) { if (!r || !r.ok) throw new Error(); start(); })
      .catch(function () { toast('הפעולה נכשלה'); });
  }

  /* מסמך הסל: חלון נפתח מיד בלחיצה, והמסמך נטען אליו מהשער (רק המסמך של בית הספר שלך) */
  function openSal() {
    var w = window.open('', '_blank');
    if (w) w.document.write('<p dir="rtl" style="font-family:Arial,sans-serif;padding:24px">טוען את המסמך…</p>');
    gate({ action: 'salDoc', semel: D.school.semel }, 120000).then(function (d) {
      if (!d || !d.ok) throw new Error(d && d.error);
      var bin = atob(d.b64), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([arr], { type: d.mime || 'application/pdf' }));
      if (w) w.location.href = url; else location.href = url;
    }).catch(function () { if (w) w.close(); toast('לא הצלחנו לפתוח את המסמך. נסו שוב בעוד רגע.'); });
  }

  /* ===== סיור ===== */
  /* כל תחנה: עמוד (go) + מה מאירים (sel). כמו הסיור של תובה וצוהר */
  function tourStops() {
    var S = [
      { go: 'home', sel: '#main .card.head', title: 'ברוכים הבאים לנטע',
        text: 'נטע הוא המרחב שלך, הרכז/ת הפדגוגי/ת: המשימות שלך, הנתונים הפדגוגיים של בית הספר, והכלים לעבודה עם הצוות — במקום אחד.' },
      { go: 'home', sel: '#hub', title: 'מכאן לכל מקום',
        text: 'בעמוד הראשי — הכרטיסים בשלוש קבוצות: מה דורש טיפול, כלים לעבודה עם הצוות, ומידע על בית הספר. לוחצים ועוברים.' },
      { go: 'home', sel: '.side', drawer: true, title: 'התפריט',
        text: 'כאן עוברים בין החלקים של נטע. בטלפון התפריט נפתח מהכפתור שבפינה למעלה.' },
      { go: 'c', sel: '#ckMine', title: 'המשימות שלי',
        text: 'המשימות שלך. כותבים משימה לבד, או מוסיפים מהתשובה של ניצה — משימה אחת או את כולן. לכל משימה: תזכורת ביומן וטיוטת מייל לאחראי/ת.' },
      { go: 's', sel: '#secs', title: 'בית הספר שלי',
        text: 'אנשי הקשר והמפקח/ת, המגמות, בעלי התפקידים, ההשתלמויות, שאלון האקלים, החלקים הפדגוגיים מהוועדה המלווה והיעדים. הכול מקופל — לוחצים על כותרת כדי לפתוח.' },
      { go: 'm', sel: '#menorMsg', title: 'מנור', text: 'כמה מהמורים כבר נרשמו, קישור למבט של בית הספר במנור, והודעה מוכנה לשלוח למורים.' },
      { go: 'k', sel: '#main .tiles', title: 'הידע לרכז/ת', text: 'הנהלים, בעלי התפקידים והמסמכים הארציים במקום אחד.' },
      { go: 't', sel: '#main .tiles', title: 'ארגז הכלים', text: 'הכלים של הרכז/ת הפדגוגי/ת וטיפים לעבודה עם הצוות, שמתעדכנים במהלך השנה.' }
    ];
    if (window.KEREN && KEREN.enabled()) {
      S.push({ go: 'home', sel: '.kr-fab', title: 'ניצה — העוזרת שלך',
        text: 'ניצה מכירה את הנתונים של בית הספר שלך ואת הידע של המינהל. אפשר לשאול אותה כל שאלה פדגוגית, ולבקש ממנה לבנות תוכנית עבודה פדגוגית. עונה גם בערבית.' });
      S.push({ go: 'p', sel: '#kerenPlans', title: 'התוכניות שלי',
        text: 'כל תוכנית שניצה בונה נשמרת כאן. אפשר לערוך, להדפיס ולשלוח לצוות. התוכניות פרטיות לבית הספר, והמנהל/ת רואה אותן.' });
    }
    S.push({ go: 'home', sel: '#nav [data-page="tour"]', drawer: true, title: 'אפשר לחזור לסיור', text: 'הסיור נמצא תמיד כאן בתפריט. בהצלחה!' });
    return S;
  }
  var TS = [], TI = 0, tBox = null, tHole = null;
  function tPick(sel) {
    var list = document.querySelectorAll(sel);
    for (var k = 0; k < list.length; k++) {
      var el = list[k], r = el.getBoundingClientRect();
      if (el.getClientRects().length && r.height > 0 && r.right > 0 && r.left < innerWidth) return el;
    }
    return null;
  }
  function tPlace() {
    if (!tBox || !TS[TI]) return;
    var el = tPick(TS[TI].sel); if (!el) return;
    var r = el.getBoundingClientRect(), pad = 8;
    var top = Math.max(r.top, 8), bottom = Math.min(r.bottom, innerHeight - 8);
    tHole.style.top = (top - pad) + 'px'; tHole.style.left = (r.left - pad) + 'px';
    tHole.style.width = (r.width + pad * 2) + 'px'; tHole.style.height = Math.max(0, bottom - top + pad * 2) + 'px';
    var bw = Math.min(380, innerWidth - 24);
    tBox.style.width = bw + 'px';
    var bt, left;
    if (innerWidth < 700) {   /* טלפון: בועה בתחתית המסך, הרכיב המואר למעלה */
      bt = innerHeight - tBox.offsetHeight - 12; left = (innerWidth - bw) / 2;
    } else {
      var below = bottom + 14 + tBox.offsetHeight < innerHeight;
      bt = below ? bottom + 14 : Math.max(12, top - 14 - tBox.offsetHeight);
      if (!below && top - 14 - tBox.offsetHeight < 12) bt = innerHeight - tBox.offsetHeight - 12;
      left = Math.max(12, Math.min(r.left + r.width - bw, innerWidth - bw - 12));   /* RTL: מיושר לקצה הימני */
    }
    tBox.style.top = bt + 'px'; tBox.style.left = left + 'px';
  }
  function tShow() {
    var s = TS[TI];
    if (PAGE !== s.go) { PAGE = s.go; side(); render(); }
    var mob = innerWidth < 960;
    document.body.classList.toggle('drawer', !!s.drawer && mob);
    setTimeout(function () {
      var el = tPick(s.sel);
      if (!el) return tStep(1);   /* העמוד לא הציג את הרכיב — ממשיכים */
      if (!s.drawer) {
        var r = el.getBoundingClientRect();
        /* בטלפון הבועה בתחתית — הרכיב נגלל לחלק העליון של המסך */
        window.scrollTo({ top: Math.max(0, scrollY + r.top - (innerWidth < 700 ? 70 : Math.max(80, (innerHeight - r.height) / 2))), behavior: 'smooth' });
      }
      tBox.innerHTML = '<div class="tour-count">' + (TI + 1) + ' מתוך ' + TS.length + '</div><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p>' +
        '<div class="tour-actions"><button type="button" class="tour-next">' + (TI === TS.length - 1 ? 'סיום' : 'הבא') + '</button>' +
        (TI ? '<button type="button" class="tour-prev">הקודם</button>' : '') + '<button type="button" class="tour-skip">יציאה מהסיור</button></div>';
      tBox.querySelector('.tour-next').onclick = function () { tStep(1); };
      var pv = tBox.querySelector('.tour-prev'); if (pv) pv.onclick = function () { tStep(-1); };
      tBox.querySelector('.tour-skip').onclick = tEnd;
      tPlace(); setTimeout(tPlace, 450);
      tBox.querySelector('.tour-next').focus({ preventScroll: true });
    }, 280);
  }
  function tStep(d) { var n = TI + d; if (n >= TS.length) return tEnd(); if (n < 0) return; TI = n; tShow(); }
  function tKey(e) { if (e.key === 'Escape') tEnd(); else if (e.key === 'ArrowLeft') tStep(1); else if (e.key === 'ArrowRight') tStep(-1); }
  function tEnd() {
    document.removeEventListener('keydown', tKey);
    removeEventListener('resize', tPlace); removeEventListener('scroll', tPlace);
    if (tBox) tBox.remove(); if (tHole) tHole.remove();
    tBox = tHole = null;
    document.body.classList.remove('drawer', 'touring');
    go('home');
  }
  function tour() {
    if (tBox) return;
    TS = tourStops(); TI = 0;
    tHole = document.createElement('div'); tHole.className = 'tour-hole';
    tBox = document.createElement('div'); tBox.className = 'tour-box';
    tBox.setAttribute('role', 'dialog'); tBox.setAttribute('aria-label', 'סיור בנטע');
    document.body.appendChild(tHole); document.body.appendChild(tBox);
    document.body.classList.add('touring');
    document.addEventListener('keydown', tKey);
    addEventListener('resize', tPlace); addEventListener('scroll', tPlace, { passive: true });
    tShow();
  }

  /* ===== אירועים ===== */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-page],[data-go],[data-copy],[data-copywho],[data-gmail],[data-saldoc],[data-vdoc],[data-tip],[data-help],#tpGo');
    if (!t) return;
    if (t.hasAttribute('data-page')) go(t.getAttribute('data-page'));
    else if (t.hasAttribute('data-go')) go(t.getAttribute('data-go'));
    else if (t.hasAttribute('data-copy')) { var cp = t.getAttribute('data-copy'); copyText(cp === 'link' ? LINK.teacher : cp === 'rg' ? LINK.rg : menorMsg()); }
    else if (t.hasAttribute('data-copywho')) { if (WHO[t.getAttribute('data-copywho')]) copyText(WHO[t.getAttribute('data-copywho')]); }
    else if (t.hasAttribute('data-gmail')) gmailOpen(Number(t.getAttribute('data-gmail')));
    else if (t.hasAttribute('data-saldoc')) openSal();
    else if (t.hasAttribute('data-tip')) tipToggle(Number(t.getAttribute('data-tip')), t.getAttribute('data-op'));
    else if (t.hasAttribute('data-vdoc')) openVaada(t.getAttribute('data-vdoc'));
    else if (t.id === 'tpGo') tipSave();
    else if (t.hasAttribute('data-help') && helpOn()) KEREN.helpWith({ type: t.getAttribute('data-help'), title: t.getAttribute('data-ht'), id: t.getAttribute('data-hid') || '' });
  });
  document.addEventListener('toggle', function (e) {
    var d = e.target; if (d && d.getAttribute && d.getAttribute('data-sec')) OPEN[d.getAttribute('data-sec')] = d.open;
    if (d && d.getAttribute && d.getAttribute('data-who')) WHO_OPEN[d.getAttribute('data-who')] = d.open;
  }, true);
  window.addEventListener('hashchange', function () { if (D && D.school) { PAGE = fromHash(); side(); render(); } });
  $('burger').onclick = function () { document.body.classList.toggle('drawer'); };
  $('scrim').onclick = function () { document.body.classList.remove('drawer'); };
  /* יציאה יזומה — מוחקים מהדפדפן את המשימות ואת סימוני האירוע החריג (מחשב משותף; סקירה 12.10.26).
     יציאה אוטומטית אחרי badsession לא מוחקת, כדי לא לאבד סימונים באמצע אירוע */
  $('out').onclick = function () {
    try { Object.keys(localStorage).forEach(function (k) { if (/^(tzohar|neta)\.(tasks|event|obsdraft)/.test(k)) localStorage.removeItem(k); }); } catch (e) {}
    if (window.PMH_AUTH) PMH_AUTH.logout();
  };

  /* ===== מה שניצה (nitza.js) ו-tasks.js צריכות מהדף ===== */
  var READY = false;
  /* snap = מה שהמשתמש/ת רואה ממילא בנטע ושמחושב כאן (מקורות ציבוריים). השרת של קרן מקצר כל שדה */
  function snap() {
    if (!D || !D.school) return {};
    var m = R.mosdot;
    return {
      students: R.matz || '', network: m ? m.network : '', district: m ? m.district : '',
      megamot: m ? (m.megamot || []).filter(function (x) { return x.name; }).map(function (x) { return x.name + (x.grades ? ' (' + x.grades + ')' : ''); }) : [],
      gaps: items().filter(function (x) { return x.st === 'gap' || x.st === 'wait'; }).map(function (x) { return x.t + ': ' + x.d; }),
      menor: R.menor && R.menor.t ? 'נרשמו ' + R.menor.r + ' מתוך ' + R.menor.t + ' מורים' : '',
      bs: R.bs ? '"' + R.bs.name + '" · ' + R.bs.status : (ST.bs === 'ok' ? 'לא הוגשה' : ''),
      rg: ST.rg === 'ok' ? WS.map(function (w) { return w[1] + ' ' + (Number(R.rg && R.rg[w[0]]) || 0); }).join(', ') : ''
    };
  }
  /* מי אפשר לבחור כמטפל/ת במשימה ולמי לשלוח מייל: אנשי הקשר של בית הספר (בלי המפקחים) + בעלי התפקידים מהנספח */
  function people() {
    if (!D) return [];
    var out = [], seen = {};
    function put(name, role, email) {
      email = String(email || '').split(/[\s,;]+/).filter(function (x) { return x.indexOf('@') > 0; })[0] || '';
      name = String(name || '').trim();
      if (!name) return;
      var k = (email || name).toLowerCase();
      if (seen[k]) return; seen[k] = 1;
      out.push({ name: name, role: String(role || '').split(' — ')[0], email: email });
    }
    (D.contacts || []).filter(function (c) { return !c.sup; }).forEach(function (c) { put(c.name, c.role || c.kind || 'מנהל/ת', c.email); });
    ((D.nispach && D.nispach.people) || []).forEach(function (q) { put(q.name, q.role, q.email); });
    return out;
  }
  window.TZOHAR = {
    token: token, snap: snap, toast: toast, data: function () { return D; }, icon: function (k) { return I[k] || ''; },
    role: function () { return role(); }, me: function () { return ME; }, school: function () { return D && D.school; },
    as: function () { return AS; }, ready: function () { return READY; }, go: go,
    people: people, links: function () { return LINK; },
    /* מצב דרישה של המטה (done/gap/wait/load/err) — לקישור משימה לדרישה: מה שאומת מהנתונים מסומן לבד (12.10.26) */
    officeSt: function (k) { if (!D || !D.school) return ''; var x = items().filter(function (y) { return y.k === k; })[0]; return x ? x.st : ''; },
    officeTitle: function (k) { if (!D || !D.school) return ''; var x = items().filter(function (y) { return y.k === k; })[0]; return x ? x.t : ''; },
    /* רק עמודי הצ'ק ליסט מצוירים מחדש — בעמוד אחר (למשל עריכת תוכנית) מתעדכן רק המונה בתפריט */
    refresh: function (force) { if (D && D.school) { side(); if (PAGE === 'home' || PAGE === 'c') render(force); } }
  };

  function boot() { if (window.PMH_AUTH && PMH_AUTH.allowed()) start(); }
  if (document.documentElement.classList.contains('pmh-in')) boot();
  else document.addEventListener('pmh:in', boot);
})();
