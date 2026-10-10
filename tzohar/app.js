/* צוהר — הדף האישי של המנהל/ת והרכז/ת הפדגוגי/ת (10.10.26).
   "החלון שלך לבית הספר": מה חסר, בית הספר, מנור, מארג (מנהלים), הידע, ארגז הכלים (רכזים).
   מקורות (כל אחד נטען ונכשל בנפרד):
     tzohar-data (שער, מוגן)  — אנשי קשר, נספח, בנות שירות, סל, אקלים, יעדים, טיפים.
                                 השער מחזיר רק את בית הספר של המחובר/ת. בלי שום נתון שהמפקחים כתבו.
     /data/mosdot.json        — רשת, מחוז, מגמות (ציבורי)
     מנור registration.count  — מספרי רישום המורים (ציבורי, מספרים בלבד)
     השתלמות מוסדית mode=public · רישום להשתלמויות mode=schools · מצבת mode=list (ציבורי, מספרים וסטטוס)
   אדמין (all): ?as=<סמל>&r=rakaz|principal — רואה את צוהר כמו בית הספר הזה. */
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
  var MAREG_TO = 'mlypeleg@gmail.com';
  var WS = [['social', 'רכזים חברתיים'], ['matal', 'מת״ליות'], ['career', 'נתיבים לקריירה'],
            ['honchim', 'מורים חונכים'], ['ped', 'רכזים פדגוגיים'], ['sherut', 'שירות לאומי']];

  var I = {
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
    ASROLE = q.get('r') === 'rakaz' ? 'rakaz' : 'principal';
  }

  /* ===== מצב ===== */
  var D = null;                                   /* tzohar-data */
  var R = { mosdot: null, menor: null, matz: null, bs: null, rg: null };
  var ST = { mosdot: 'load', menor: 'load', matz: 'load', bs: 'load', rg: 'load' };
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
      if (D.error === 'noschool' || !D.school) return noSchool();
      $('meSchool').textContent = D.school.name;
      $('meRole').textContent = isRakaz() ? 'רכז/ת פדגוגי/ת' : 'מנהל/ת';
      $('meRole').hidden = false;
      PAGE = fromHash();
      side(); render();
      loadPublic();
      READY = true;
      document.dispatchEvent(new Event('tzohar:ready'));   /* קרן (keren.js) נדלקת כאן */
      side();
      try { if (!localStorage.getItem('tzohar.tour') && !IS_ADMIN) { localStorage.setItem('tzohar.tour', '1'); tour(0); } } catch (e) {}
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
      'כתבו למיטל ותעדכן את השיוך.</p><div class="acts">' + mailBtns('שיוך בית ספר בצוהר', 'שלום מיטל,\nנכנסתי לצוהר ולא הופיע בית הספר שלי.\nשם: ' + (ME.name || '') + '\nבית הספר: ', 'כתיבה למיטל') + '</div></div>';
  }

  /* אדמין בלי ?as — בחירת בית ספר ותפקיד */
  function pickSchool() {
    $('meSchool').textContent = 'תצוגת אדמין';
    $('nav').innerHTML = '';
    var list = D.schools || [];
    $('main').innerHTML = '<div class="card head"><h1>צוהר · תצוגת אדמין</h1><div class="meta">בחרו בית ספר ותפקיד, ותראו את צוהר בדיוק כמו שהמנהל/ת או הרכז/ת שלו רואים.</div>' +
      '<input class="fld" id="pq" placeholder="חיפוש בית ספר" aria-label="חיפוש בית ספר"></div>' +
      '<div class="card"><ul class="megs" id="pl"></ul></div>';
    function draw() {
      var q = String($('pq').value || '').trim();
      $('pl').innerHTML = list.filter(function (s) { return !q || s.name.indexOf(q) > -1; }).map(function (s) {
        return '<li style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="flex:1;min-width:160px">' + esc(s.name) + '</b>' +
          '<a class="btn sm" href="?as=' + esc(s.semel) + '">כמנהל/ת</a><a class="btn sm" href="?as=' + esc(s.semel) + '&r=rakaz">כרכז/ת</a></li>';
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
      Object.keys(d.bySchool || {}).forEach(function (k) { if (canon(k) === name) R.menor = d.bySchool[k]; });
      loaded('menor', true);
    }).catch(function () { loaded('menor', false); });
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
    else if (n.missing.length) out.push({ k: 'nispach', t: 'נספח בעלי התפקידים', st: 'gap',
      d: 'הנספח הוגש ב-' + n.ts + '. חסרים: ' + n.missing.map(function (m) { return m.split(' — ')[0]; }).join(', ') + '.', acts: a(LINK.nispach, 'לעדכון הנספח', 1), link: 'nispach' });
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
      var no = WS.filter(function (w) { return !(Number(R.rg && R.rg[w[0]]) > 0); }).map(function (w) { return w[1]; });
      var chips = '<div class="ck-chips">' + WS.map(function (w) {
        var c = Number(R.rg && R.rg[w[0]]) || 0;
        return '<a class="chip' + (c ? ' ok' : '') + '" href="' + SITE + 'hishtalmuyot.html#rg=' + w[0] + '" target="_blank" rel="noopener">' + (c ? I.ok : '') + esc(w[1]) + (c ? ' · ' + c : '') + '</a>';
      }).join('') + '</div>';
      var d = no.length === WS.length ? 'אף אחד מבית הספר עוד לא נרשם. כל בעל/ת תפקיד נרשם/ת בעצמו/ה בטופס אחד.' : no.length ? 'עוד לא נרשמו ל: ' + no.join(', ') + '.' : 'בעלי התפקידים נרשמו לכל ' + WS.length + ' ההשתלמויות.';
      out.push({ k: 'rg', t: RG, st: !no.length || mdone('rg') ? 'done' : 'gap', manual: true, d: d, html: esc(d) + chips, link: 'rg',
        acts: a(LINK.rg, 'לטופס הרישום', 1) + '<button type="button" class="btn sm" data-copy="rg">' + I.copy + 'העתקת הקישור לבעלי התפקידים</button>' });
    }
    /* מנור */
    var MN = 'רישום המורים במנור';
    var macts = '<a class="btn primary sm" href="' + LINK.menor + '" target="_blank" rel="noopener">מי עוד לא נרשם' + I.ext + '</a>' +
      '<button type="button" class="btn sm" data-copy="menor">' + I.copy + 'העתקת ההודעה למורים</button>';
    if (ST.menor !== 'ok') out.push({ k: 'menor', t: MN, st: ST.menor });
    else if (!R.menor || !R.menor.t) out.push({ k: 'menor', t: MN, st: 'gap', d: 'אין עדיין מורים רשומים במנור לבית הספר. כל מורה נרשם/ת פעם אחת בקישור הקבוע.', acts: macts, link: 'menor' });
    else if (R.menor.r < R.menor.t) {
      var pc = Math.round(100 * R.menor.r / R.menor.t), dm = 'נרשמו ' + R.menor.r + ' מתוך ' + R.menor.t + ' מורים. ' + (R.menor.t - R.menor.r) + ' עוד לא נרשמו.';
      out.push({ k: 'menor', t: MN, st: 'gap', d: dm, acts: macts, link: 'menor',
        html: esc(dm) + '<div class="meter"><div class="b"><i class="' + (pc < 50 ? 'low' : 'mid') + '" style="width:' + pc + '%"></i></div><span>' + pc + '%</span></div>' });
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
  function openGaps() { return D && D.school ? items().filter(function (x) { return x.st === 'gap'; }).length : 0; }

  /* ===== ניווט ===== */
  function hasMine() { return !!(window.KEREN && KEREN.enabled() && window.TZTASKS); }
  function pages() {
    var P = [['home', I.home, 'משרדי', 'ck']];
    if (hasMine()) P.push(['c', I.check, 'אישי', 'ck']);
    P.push(['s', I.school, 'בית הספר שלי'], ['m', I.chart, 'מנור']);
    if (!isRakaz()) P.push(['g', I.weave, 'מארג']);
    P.push(['k', I.book, 'הידע ' + (isRakaz() ? 'לרכז/ת' : 'למנהל/ת')]);
    if (isRakaz()) P.push(['t', I.tools, 'ארגז הכלים']);
    if (window.KEREN && KEREN.enabled()) P.push(['p', I.doc, 'התוכניות שלי']);   /* התוכניות שקרן בנתה (10.10.26) */
    P.push(['tour', I.tour, 'סיור בצוהר']);
    return P;
  }
  function fromHash() {
    var h = location.hash.replace('#', '');
    return pages().some(function (p) { return p[0] === h; }) && h !== 'tour' ? h : 'home';
  }
  function side() {
    if (!D || !D.school) return;
    var n = openGaps(), nm = window.TZTASKS ? TZTASKS.openCount() : 0, grp = false;
    $('nav').innerHTML = pages().map(function (p) {
      var extra = p[0] === 'home' && n ? '<span class="n">' + n + '</span>' : p[0] === 'c' && nm ? '<span class="n soft">' + nm + '</span>' : (p[0] === 'g' ? '<span class="pilot">פיילוט</span>' : '');
      var head = p[3] === 'ck' && !grp ? (grp = true, '<li class="nav-g">' + I.check + 'צ\'ק ליסט</li>') : '';
      return head + '<li' + (p[3] ? ' class="nav-sub"' : '') + '><button type="button" data-page="' + p[0] + '"' + (PAGE === p[0] ? ' aria-current="true"' : '') + '>' +
        (p[3] ? '' : p[1]) + esc(p[2]) + extra + '</button></li>';
    }).join('');
  }
  var PLANID = '';   /* תוכנית לפתיחה בעמוד "התוכניות שלי" (מקרן) */
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
    /* הצ'ק ליסט: נתון שנטען ברקע לא סוגר חלונית יומן/מייל פתוחה או שדה שמקלידים בו */
    if ((PAGE === 'home' || PAGE === 'c') && !force && document.querySelector('#main .ck-p:not([hidden]), #main .ck-add input:focus, #ckText:not(:placeholder-shown)')) return;
    var h = '';
    if (IS_ADMIN) h += '<div class="asbar">תצוגת אדמין: <b>' + esc(D.school.name) + '</b> · כמו ש' + (isRakaz() ? 'הרכז/ת' : 'המנהל/ת') + ' רואה' +
      ' · <a href="?as=' + esc(D.school.semel) + (isRakaz() ? '' : '&r=rakaz') + location.hash + '">' + (isRakaz() ? 'לתצוגת מנהל/ת' : 'לתצוגת רכז/ת') + '</a>' +
      ' · <a href="./">בית ספר אחר</a></div>';
    h += ({ home: home, s: schoolPage, m: menorPage, g: maregPage, k: knowPage, t: toolsPage, c: minePage,
            p: function () { return '<div id="kerenPlans"></div>'; } }[PAGE] || home)();
    $('main').innerHTML = h;
    if (PAGE === 'p' && window.KEREN) KEREN.mountPlans($('kerenPlans'), PLANID);
    if (PAGE === 'c' && window.TZTASKS) TZTASKS.mountMine($('ckMine'));
    if (tBox) setTimeout(tPlace, 30);   /* נתון שנטען באמצע הסיור משנה את הפריסה */
  }

  function headCard(sub) {
    var s = D.school, m = R.mosdot;
    var megs = m ? (m.megamot || []).filter(function (x) { return x.name; }).length : null;
    var p = R.menor && R.menor.t ? Math.round(100 * R.menor.r / R.menor.t) : null;
    var n = openGaps();
    return '<div class="card head"><h1>' + esc(s.name) + '</h1><div class="meta">' +
      (m ? esc(m.network) + ' · ' : '') + 'סמל <b>' + esc(s.semel) + '</b>' + (m ? ' · ' + esc(m.district) : '') +
      ' · מפקח/ת: <b>' + esc((s.sups || []).join(', ')) + '</b></div>' + (sub || '') +
      '<div class="facts">' +
      '<div class="fact"><span>תלמידים</span><b>' + (R.matz || (ST.matz === 'load' ? '…' : '—')) + '</b></div>' +
      '<div class="fact"><span>מגמות</span><b>' + (megs === null ? (ST.mosdot === 'load' ? '…' : '—') : megs) + '</b></div>' +
      '<div class="fact"><span>משימות פתוחות</span><b class="' + (n ? 'bad' : 'ok') + '">' + n + '</b></div>' +
      '<div class="fact"><span>מורים שנרשמו למנור</span><b class="' + (p === null ? '' : p < 50 ? 'bad' : p < 100 ? '' : 'ok') + '">' +
        (p === null ? (ST.menor === 'load' ? '…' : '—') : p + '%') + '</b></div>' +
      '</div></div>';
  }

  /* לשוניות הצ'ק ליסט בראש העמוד — גם בטלפון, בלי לפתוח את התפריט */
  function ckTabs() {
    if (!hasMine()) return '';
    var n = openGaps(), nm = TZTASKS.openCount();
    return '<div class="ck-tabs" role="tablist">' + [['home', 'משרדי', n], ['c', 'אישי', nm]].map(function (t) {
      return '<button type="button" role="tab" data-page="' + t[0] + '" aria-selected="' + (PAGE === t[0]) + '">' + t[1] + (t[2] ? '<span class="n">' + t[2] + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function home() {
    var all = items(), open = all.filter(function (x) { return x.st === 'gap'; });
    var first = String(ME.name || '').trim().split(/\s+/)[0];
    var hello = IS_ADMIN ? '' : '<p class="lead" style="margin-top:8px">שלום' + (first ? ' ' + esc(first) : '') + '. כאן רואים במבט אחד מה כבר הושלם ומה עוד מחכה, וכל כפתור מוביל ישר לטופס.</p>';
    var order = { gap: 0, wait: 1, load: 2, err: 2, done: 3 };
    all.sort(function (a, b) { return order[a.st] - order[b.st]; });
    return headCard(hello) +
      '<h2 class="pt">צ\'ק ליסט</h2>' + ckTabs() +
      '<p class="small ck-lead">המשימות של בית הספר מול המינהל. משימה שהמערכת רואה כגמורה מסומנת לבד; את השאר מסמנים כאן.</p>' +
      (!open.length && all.every(function (x) { return x.st === 'done' || x.st === 'wait'; }) ? '<div class="allok">' + I.ok + 'הכול הושלם. תודה!</div>' : '') +
      '<div class="card ck-card" id="ckOffice">' + (window.TZTASKS ? TZTASKS.officeHtml(all) : '') + '</div>';
  }
  function minePage() {
    return '<div class="card head"><h1>הצ\'ק ליסט האישי</h1><div class="meta">המשימות שלך — שכתבת לבד או שהוספת מהתשובות של קרן. ' +
      (isRakaz() ? 'פרטי לבית הספר; המנהל/ת רואה אותו.' : 'פרטי לבית הספר; המפקח/ת לא רואה אותו.') + '</div></div>' +
      '<h2 class="pt">צ\'ק ליסט</h2>' + ckTabs() + '<div id="ckMine"></div>';
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
        return '<li>' + esc(w[1]) + '<small>' + (c ? c + ' נרשמו' : 'עוד אף אחד לא נרשם') + '</small></li>';
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
      y === null || y === undefined ? failed() : y ? '<div class="pre">' + esc(y) + '</div>' : '<div class="empty">אין יעדים מהוועדה המלווה האחרונה בקובץ.</div>');
    return h + '</div>';
  }

  var VAAD_SECS = [['topics', 'נושאים מרכזיים'], ['strengths', 'חוזקות'], ['gaps', 'פערים ואתגרים'], ['decisions', 'החלטות וצעדים להמשך'], ['facts', 'נתונים']];
  function vaadSec() {
    var rows = D.vaadot, rk = isRakaz(), title = 'ועדה מלווה תשפ״ו' + (rk ? ' · החלקים הפדגוגיים' : '');
    if (!rows) return sec('vaad', I.flag, title, 'לא נטען', failed());
    if (!rows.length) return sec('vaad', I.flag, title, 'אין', '<div class="empty">לא התקבל בצוהר מסמך של ועדה מלווה מתשפ״ו.</div>');
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
    return sec('vaad', I.flag, title, order.length === 1 ? 'ועדה אחת' : order.length + ' ועדות', body);
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
    return sec('akl', I.chart, 'שאלון אקלים תשפ״ו', 'התקבלו: ' + esc(got.join(' · ')), body);
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
    h += '<div class="card"><p class="eyebrow">' + I.users + 'מי עוד לא נרשם/ה</p>' +
      '<p style="margin:0 0 10px">את הרשימה המלאה, עם השמות והמקצועות, רואים במבט של בית הספר במנור, בלשונית "טרם נרשמו".</p>' +
      '<div class="acts"><a class="btn primary" href="' + LINK.menor + '" target="_blank" rel="noopener">למבט של בית הספר במנור' + I.ext + '</a></div>' +
      '<div class="small" style="margin-top:8px">מנור מבקש כניסה משלו בפעם הראשונה (קוד במייל).</div></div>';
    h += '<div class="card" id="menorMsg"><p class="eyebrow">' + I.mail + 'הודעה מוכנה למורים</p><div class="pre note">' + esc(menorMsg()) + '</div>' +
      '<div class="acts"><button type="button" class="btn" data-copy="menor">' + I.copy + 'העתקת ההודעה</button>' +
      '<button type="button" class="btn" data-copy="link">' + I.copy + 'העתקת קישור ההרשמה בלבד</button></div></div>';
    return h;
  }

  /* ===== מארג · פיילוט (מנהלים) ===== */
  var SHOTS = [
    ['img/mareg-1.png', 'הבית של המנהל/ת', 'מה מחכה לאישור, מה מאחר, ואיך מתקדמים היעדים.'],
    ['img/mareg-2.png', 'מפת המטרות', 'המטרות של בית הספר, וכל בעלי התפקידים שמחוברים אליהן.'],
    ['img/mareg-3.png', 'לוח השנה', 'כל האירועים מכל התוכניות במקום אחד, והתראה על שבוע עמוס.'],
    ['img/mareg-4.png', 'האחראי/ת על משימה', 'מקבל/ת מייל ומסמנ/ת "בוצע" מהטלפון, בלי להיכנס למערכת.']
  ];
  function maregMail() {
    var s = D.school.name, n = ME.name || '';
    var sub = 'מארג · בית הספר שלנו רוצה להצטרף לפיילוט — ' + s;
    var text = 'שלום מיטל,\n\nראיתי את מארג בצוהר, ונשמח להצטרף לפיילוט.\n\nבית הספר: ' + s + '\nשם: ' + n + '\n\nתודה!';
    return { sub: sub, text: text };
  }
  function maregPage() {
    var mm = maregMail();
    return '<div class="card mareg"><span class="badge">פיילוט · תשפ״ז</span><h1>מארג · תוכנית העבודה של בית הספר</h1>' +
      '<p style="margin:0 0 6px">מארג אורג את התוכניות האישיות של בעלי התפקידים לתוכנית בית ספרית אחת: מטרות, יעדים ומדדים, לוח אירועים, ותזכורות לאחראים על כל משימה.</p>' +
      '<p style="margin:0 0 6px"><b>בתי הספר בפיילוט יוכלו להתאים את המערכת לבית הספר שלהם — לצרכים ולטעם שלהם.</b></p>' +
      '<p style="margin:0 0 12px" class="small">אנחנו מתחילים בפיילוט עם כמה בתי ספר, והמפקח/ת רואה את התוכנית מהיום הראשון.</p>' +
      '<div class="acts">' + mailBtns(mm.sub, mm.text, 'אני רוצה את מארג בבית הספר שלי', true) + '</div></div>' +
      '<h2 class="pt">איך זה נראה</h2><p class="small" style="margin-top:-4px">המסכים מבית ספר לדוגמה. הנתונים בדויים.</p>' +
      '<div class="shots">' + SHOTS.map(function (x) {
        return '<figure class="shot"><a href="' + x[0] + '" target="_blank" rel="noopener"><img src="' + x[0] + '" alt="' + esc(x[1]) + '" loading="lazy"></a>' +
          '<figcaption><b>' + esc(x[1]) + '</b>' + esc(x[2]) + '</figcaption></figure>';
      }).join('') + '</div>';
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
      ['matzpen.html', 'מצפן החינוך היוצר', 'התפיסה הפדגוגית'],
      ['menahalim-hadashim.html', 'ערכת כניסה למנהל/ת חדש/ה', 'כל מה שצריך בשנה הראשונה'],
      ['menahalim.html', 'מרחב המנהלים', 'כל העמודים למנהלים']
    ]]
  ];
  function href(u) { return /^https?:/.test(u) ? u : SITE + u; }
  function tiles(list) {
    return '<div class="tiles">' + list.map(function (x) {
      return '<a class="tile" href="' + esc(href(x[0])) + '" target="_blank" rel="noopener"><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span></a>';
    }).join('') + '</div>';
  }
  function knowPage() {
    return '<div class="card head"><h1>הידע ' + (isRakaz() ? 'לרכז/ת' : 'למנהל/ת') + '</h1><div class="meta">הנהלים, בעלי התפקידים והמסמכים הארציים — כל אחד נפתח בעמוד שלו באתר.</div></div>' +
      KNOW.map(function (g) { return '<div class="grp-h">' + esc(g[0]) + '</div>' + tiles(g[1]); }).join('') + tipsBlock('principal');
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
      ['tafkidim.html#rakaz-pedagogi', 'הגדרת התפקיד', 'רכז/ת פדגוגי/ת יוצר/ת · סגן/ית מנהל/ת'],
      ['rakaz-pedagogi-klim.html', 'ארגז הכלים המלא באתר', 'כל הכלים ומסמכי היסוד']
    ]]
  ];
  function toolsPage() {
    return '<div class="card head"><h1>ארגז הכלים לרכז/ת הפדגוגי/ת</h1><div class="meta">כלים לתכנון, להנחיית הצוות ולעבודה הפדגוגית, וטיפים שמתעדכנים במהלך השנה.</div></div>' +
      tipsBlock('rakaz') + TOOLS.map(function (g) { return '<div class="grp-h">' + esc(g[0]) + '</div>' + tiles(g[1]); }).join('');
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
  function tourSteps() {
    var S = [
      [I.check, 'צ\'ק ליסט', 'המשימות של בית הספר מול המינהל: מה הושלם, מה עוד מחכה, וכפתור שמוביל ישר לטופס. לכל משימה אפשר לקבוע תזכורת ביומן ולשלוח מייל למי שמטפל/ת בה.'],
      [I.school, 'בית הספר שלי', 'אנשי הקשר והמפקח/ת, המגמות, בעלי התפקידים, ההשתלמויות, סל התוכניות, סקר האקלים והיעדים מהוועדה המלווה. הכול מקופל — לוחצים על כותרת כדי לפתוח.'],
      [I.chart, 'מנור', 'כמה מהמורים כבר נרשמו, קישור למבט של בית הספר במנור, והודעה מוכנה לשלוח למורים.']
    ];
    if (!isRakaz()) S.push([I.weave, 'מארג', 'תוכנית העבודה הבית ספרית החדשה. אפשר להציץ במסכים ולבקש להצטרף לפיילוט — ומי שבפיילוט מתאים/ה את המערכת לבית הספר, לצרכים ולטעם שלו.']);
    S.push([I.book, 'הידע', 'הנהלים, בעלי התפקידים והמסמכים הארציים במקום אחד.']);
    if (isRakaz()) S.push([I.tools, 'ארגז הכלים', 'הכלים של הרכז/ת הפדגוגי/ת וטיפים לעבודה עם הצוות, שמתעדכנים במהלך השנה.']);
    return S;
  }
  /* כל תחנה: עמוד (go) + מה מאירים (sel). כמו הסיור של תובה */
  function tourStops() {
    var T = tourSteps(), by = {};
    T.forEach(function (x) { by[x[1]] = x[2]; });
    var S = [
      { go: 'home', sel: '#main .card.head', title: 'ברוכים הבאים לצוהר',
        text: 'צוהר הוא החלון שלך לבית הספר: מה כבר הושלם ומה עוד חסר, הנתונים של בית הספר, והידע שצריך — במקום אחד, בלי לחפש בין טפסים.' },
      { go: 'home', sel: '.side', drawer: true, title: 'התפריט',
        text: 'כאן עוברים בין החלקים של צוהר. בטלפון התפריט נפתח מהכפתור שבפינה למעלה.' },
      { go: 'home', sel: '#ckOffice', title: 'צ\'ק ליסט משרדי', text: by['צ\'ק ליסט'] },
      { go: 's', sel: '#secs', title: 'בית הספר שלי', text: by['בית הספר שלי'] },
      { go: 'm', sel: '#menorMsg', title: 'מנור', text: by['מנור'] }
    ];
    if (!isRakaz()) S.push({ go: 'g', sel: '.mareg', title: 'מארג', text: by['מארג'] });
    S.push({ go: 'k', sel: '#main .tiles', title: 'הידע', text: by['הידע'] });
    if (isRakaz()) S.push({ go: 't', sel: '#main .tiles', title: 'ארגז הכלים', text: by['ארגז הכלים'] });
    if (window.KEREN && KEREN.enabled()) {
      S.push({ go: 'home', sel: '.kr-fab', title: 'קרן — העוזרת שלך',
        text: 'קרן מכירה את הנתונים של בית הספר שלך ואת הידע של המינהל. אפשר לשאול אותה כל שאלה, ולבקש ממנה לבנות ' +
          (isRakaz() ? 'תוכנית עבודה פדגוגית' : 'תוכנית עבודה — למשל למחנכים וליועצים לפי שאלוני האקלים') + '. עונה גם בערבית.' });
      S.push({ go: 'c', sel: '#ckMine', title: 'צ\'ק ליסט אישי',
        text: 'המשימות שלך. כותבים משימה לבד, או מוסיפים מהתשובה של קרן — משימה אחת או את כולן. לכל משימה: תזכורת ביומן ומייל למי שמטפל/ת בה.' });
      S.push({ go: 'p', sel: '#kerenPlans', title: 'התוכניות שלי',
        text: 'כל תוכנית שקרן בונה נשמרת כאן. אפשר לערוך, להדפיס ולשלוח לצוות. התוכניות פרטיות לבית הספר' + (isRakaz() ? ', והמנהל/ת רואה אותן.' : ', כולל התוכניות הפדגוגיות של הרכז/ת.') });
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
    tBox.setAttribute('role', 'dialog'); tBox.setAttribute('aria-label', 'סיור בצוהר');
    document.body.appendChild(tHole); document.body.appendChild(tBox);
    document.body.classList.add('touring');
    document.addEventListener('keydown', tKey);
    addEventListener('resize', tPlace); addEventListener('scroll', tPlace, { passive: true });
    tShow();
  }

  /* ===== אירועים ===== */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-page],[data-go],[data-copy],[data-gmail],[data-saldoc],[data-vdoc],[data-tip],#tpGo');
    if (!t) return;
    if (t.hasAttribute('data-page')) go(t.getAttribute('data-page'));
    else if (t.hasAttribute('data-go')) go(t.getAttribute('data-go'));
    else if (t.hasAttribute('data-copy')) { var cp = t.getAttribute('data-copy'); copyText(cp === 'link' ? LINK.teacher : cp === 'rg' ? LINK.rg : menorMsg()); }
    else if (t.hasAttribute('data-gmail')) gmailOpen(Number(t.getAttribute('data-gmail')));
    else if (t.hasAttribute('data-saldoc')) openSal();
    else if (t.hasAttribute('data-tip')) tipToggle(Number(t.getAttribute('data-tip')), t.getAttribute('data-op'));
    else if (t.hasAttribute('data-vdoc')) openVaada(t.getAttribute('data-vdoc'));
    else if (t.id === 'tpGo') tipSave();
  });
  document.addEventListener('toggle', function (e) {
    var d = e.target; if (d && d.getAttribute && d.getAttribute('data-sec')) OPEN[d.getAttribute('data-sec')] = d.open;
  }, true);
  window.addEventListener('hashchange', function () { if (D && D.school) { PAGE = fromHash(); side(); render(); } });
  $('burger').onclick = function () { document.body.classList.toggle('drawer'); };
  $('scrim').onclick = function () { document.body.classList.remove('drawer'); };
  $('out').onclick = function () { if (window.PMH_AUTH) PMH_AUTH.logout(); };

  /* ===== מה שקרן (keren.js) צריכה מהדף ===== */
  var READY = false;
  /* snap = מה שהמשתמש/ת רואה ממילא בצוהר ושמחושב כאן (מקורות ציבוריים). השרת של קרן מקצר כל שדה */
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
    token: token, snap: snap, toast: toast,
    role: function () { return role(); }, me: function () { return ME; }, school: function () { return D && D.school; },
    as: function () { return AS; }, ready: function () { return READY; }, go: go,
    people: people, links: function () { return LINK; },
    /* רק עמודי הצ'ק ליסט מצוירים מחדש — בעמוד אחר (למשל עריכת תוכנית) מתעדכן רק המונה בתפריט */
    refresh: function (force) { if (D && D.school) { side(); if (PAGE === 'home' || PAGE === 'c') render(force); } }
  };

  function boot() { if (window.PMH_AUTH && PMH_AUTH.allowed()) start(); }
  if (document.documentElement.classList.contains('pmh-in')) boot();
  else document.addEventListener('pmh:in', boot);
})();
