/* ועדה מלווה — הדף (4.11.26). השרת: רויטל\vaada-gas\Code.js. כל הנתונים נשלפים אחרי כניסה; אין כאן שום נתון אישי.
   ניתוב לפי hash:
   #                 מסך הבית (מנהל.ת: בית הספר · מפקח.ת ומטה: רשימה · בעל.ת תפקיד: התחומים שלי)
   #m  ·  #m/<סמל>   מסלול המנהל.ת: מילוי מצגת האב, ואז בחירת תחנות. בלי התפריט המלא. הנתונים הם אותם נתונים
   #s/<סמל>          דף בית הספר: אנשים, תמונת מצב, הוועדה הקודמת, משימות פתוחות, הוועדות (הוועדה של השנה נפתחת לבד)
   #v/<id>           ראשי של הוועדה: סיכום וכרטיס לכל פריט בתפריט
   #v/<id>/prep      הכנה: תחנות וסוגיית ליבה
   #v/<id>/fill      מילוי מצגת האב  ·  #v/<id>/e/<תחום>  מילוי תחום
   #v/<id>/deck      מצגת הוועדה: בחירה בין הצגה דיגיטלית ל-PowerPoint  ·  #v/<id>/live/<מספר שקף>
   #v/<id>/recs      המלצות המפקח.ת
   #v/<id>/tasks     משימות מהוועדה
   #v/<id>/sign      פרוטוקול וחתימות
   #v/<id>/past      ועדות קודמות
   #v/<id>/brief     שיחה מצומצמת  ·  #v/<id>/hivui  חיווי להנהלת המינהל  ·  #v/<id>/sup  הכנת מפקח.ת */
(function () {
  'use strict';
  var API = 'https://script.google.com/macros/s/AKfycbw0P5NiD_OVrY_1Gn6mFpnkLncRBRz-nMud8bXUzB8hXfea9mUApCSSn5eWV5gc1kVW/exec';
  var KEY = 'vaada_session';
  var APP = document.getElementById('app');
  var SITE = 'https://pedagogiamh.co.il/vaada/';
  var S = { token: '', me: null, board: null, V: null };
  var pollT = null, liveId = 0;

  /* ===== עזרים ===== */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function isMobile() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (matchMedia('(pointer:coarse)').matches && innerWidth < 900); }
  function toast(t) {
    var el = $('#toast'); el.textContent = t; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 3800);
  }
  function count(n, one, many) { return n === 1 ? one : n + ' ' + many; }
  function fmtDate(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; }
  function fmtAt(d) { var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})/.exec(d || ''); return m ? m[3] + '.' + m[2] + ' ' + m[4] : (d || ''); }

  var ERR = {
    network: 'אין חיבור לשרת. בודקים את האינטרנט ומנסים שוב.', server: 'משהו השתבש בשרת. מנסים שוב בעוד רגע.',
    forbidden: 'אין לחשבון הזה הרשאה לפעולה.', notfound: 'הוועדה לא נמצאה.', closed: 'הוועדה סגורה. המנהל.ת יכול.ה לפתוח אותה מחדש.', notclosed: 'חותמים אחרי שסוגרים את הוועדה.', nofile: 'המסמך עדיין לא זמין במערכת החדשה.',
    toolong: 'התחום ארוך מדי לשמירה. כדאי לקצר או להעביר חלק לקובץ.', toolarge: 'הקובץ גדול מ-8MB.', toomany: 'כבר יש 10 תמונות בוועדה הזו. כדי להוסיף, מוחקים תמונה אחרת.', badmail: 'כתובת המייל לא תקינה.', empty: 'לא נכתב טקסט.',
    notlisted: 'המייל הזה לא ברשימה. אפשר לנסות מייל אחר שלך, או ללחוץ "נתקלתם בבעיה?" למטה.',
    cooldown: 'קוד נשלח לפני פחות מדקה. בודקים במייל (גם בספאם).', quota: 'הגענו למכסת המיילים של היום. מנסים שוב מחר.',
    expired: 'הקוד פג. שולחים קוד חדש.', badcode: 'הקוד לא נכון. מנסים שוב.', toomany: 'יותר מדי ניסיונות. שולחים קוד חדש.'
  };
  function errText(e) { return ERR[e] || ERR.server; }

  function api(action, data) {
    var body = Object.assign({ action: action, token: S.token }, data || {});
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: 'network' }; })
      .then(function (r) {
        if (r && r.error === 'badsession') { logout(true); throw new Error('session'); }
        return r;
      });
  }

  function session() { try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.exp > Date.now() ? s : null; } catch (e) { return null; } }
  function logout(silent) {
    try { localStorage.removeItem(KEY); sessionStorage.removeItem(GUEST_KEY); } catch (e) {}
    S.token = ''; S.me = null; S.V = null; S.board = null; S.SCH = null; setFocus(false);
    QUEUES = {}; Q = newQueue(null, null);
    if (!silent) location.hash = '';
    route();
  }

  /* ===== כניסה ===== */
  function viewLogin() {
    document.body.classList.add('at-login');
    $('#who').hidden = true; $('#out').hidden = true;
    APP.innerHTML = '<div class="gate-head"><img src="logo-minhal.png" alt="משרד העבודה · מינהל הכשרה מקצועית"><svg class="gate-mark" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke-width="17" stroke-linecap="round" transform="rotate(-62 50 50)"><circle cx="50" cy="50" r="38" stroke="#1D4F5E" stroke-dasharray="132 239"/><circle cx="50" cy="50" r="38" stroke="#C4862A" stroke-dasharray="26 239" stroke-dashoffset="-164"/><circle cx="50" cy="50" r="38" stroke="#7F9A8E" stroke-dasharray="20 239" stroke-dashoffset="-204"/></g></svg><div class="gate-name"><b>מעגל</b><small>הוועדה המלווה</small></div></div><form class="card login" id="lf"><h1 class="vh">כניסה למעגל</h1><p>מקלידים את המייל שלך, ונשלח אליו קוד בן 6 ספרות. המכשיר יזכור אותך ל-30 יום.</p>' +
      '<label class="f"><b>המייל שלך</b><input type="email" id="le" dir="ltr" autocomplete="email" required></label>' +
      '<label class="f" id="lcw" hidden><b>הקוד שקיבלת במייל</b><input type="text" inputmode="numeric" id="lc" dir="ltr" autocomplete="one-time-code" maxlength="6"></label>' +
      '<button class="btn primary" id="lb" style="width:100%">שליחת קוד</button><div class="err" id="lerr" role="alert"></div>' +
      '<button type="button" class="link" id="lresend" hidden>שליחת קוד חדש</button></form>';
    var sent = false;
    function send() {
      var email = $('#le').value.trim();
      $('#lerr').textContent = ''; $('#lb').disabled = true; $('#lb').textContent = 'שולח…';
      api('codeSend', { email: email }).then(function (r) {
        $('#lb').disabled = false;
        if (r.ok || r.error === 'cooldown') {
          sent = true; $('#lcw').hidden = false; $('#lresend').hidden = false; $('#lb').textContent = 'כניסה'; $('#lc').focus();
          if (r.error) $('#lerr').textContent = errText(r.error);
        } else { $('#lb').textContent = 'שליחת קוד'; $('#lerr').textContent = errText(r.error); }
      });
    }
    $('#lf').onsubmit = function (e) {
      e.preventDefault();
      if (!sent) return send();
      $('#lerr').textContent = ''; $('#lb').disabled = true;
      api('codeVerify', { email: $('#le').value.trim(), code: $('#lc').value.trim() }).then(function (r) {
        $('#lb').disabled = false;
        if (!r.ok) { $('#lerr').textContent = errText(r.error); return; }
        try { localStorage.setItem(KEY, JSON.stringify({ token: r.token, exp: r.exp })); } catch (ex) {}
        S.token = r.token; S.me = r.me;
        route();
      });
    };
    $('#lresend').onclick = send;
  }

  function header() {
    if (!S.me) return;
    document.body.classList.remove('at-login');
    var w = $('#who');
    w.textContent = S.me.name || S.me.email; w.hidden = false;
    $('#out').hidden = S.me.role === 'guest';
  }

  /* קישור צפייה זמני: #g/<קוד>. הקוד נשמר רק בלשונית הזו, ולא דורס כניסה רגילה במכשיר */
  var GUEST_KEY = 'vaada_guest';
  function guestToken() { try { return sessionStorage.getItem(GUEST_KEY) || ''; } catch (e) { return ''; } }
  function enterGuest(tok) {
    loading();
    S.token = tok; S.V = null; S.board = null; S.SCH = null; setFocus(false);
    try { sessionStorage.setItem(GUEST_KEY, tok); } catch (e) {}
    api('board').then(function (r) {
      if (!r.ok || !r.schools.length) return failed(r.error);
      S.me = r.me; header();
      location.replace('#s/' + r.schools[0].semel);
    }).catch(function () {});
  }

  /* ===== ניתוב ===== */
  window.addEventListener('hashchange', route);
  function route() {
    clearTimeout(pollT); pollT = null; liveId++; document.onkeydown = null;
    flushNow();
    var gm = /^#g\/([\w-]+)/.exec(location.hash);
    if (gm) return enterGuest(gm[1]);
    if (!S.token) S.token = guestToken();
    if (!S.token) {
      var s = session();
      if (!s) return viewLogin();
      S.token = s.token;
    }
    var h = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    window.scrollTo(0, 0);
    if (h[0] === 'm') { setFocus(true); return viewFocus(h[1]); }
    if (focusOn() && h[0] !== 'v') return location.replace('#m' + (h[0] === 's' && h[1] ? '/' + h[1] : ''));
    if (!h[0]) return viewHome();
    if (h[0] === 's') return viewSchool(h[1], h[2]);
    if (h[0] === 'v') return withVaada(h[1], function () {
      /* מנהל.ת אזור: רק הפרוטוקול והחתימה */
      if (S.V.caps.rep) return viewSign();
      if (focusOn() && FOCUS_PAGES.indexOf(h[2] || '') < 0) return location.replace('#m/' + S.V.v.semel);
      if (h[2] === 'e') return viewEdit(h[3]);
      if (h[2] === 'fill') return viewPrep();
      if (!S.V.caps.full) return location.replace('#');
      if (h[2] === 'holders') return viewHolders();
      if (h[2] === 'deck') return viewDeck();
      if (h[2] === 'live') return viewLive(Number(h[3]) || 0, false);
      if (h[2] === 'all') return viewLive(Number(h[3]) || 0, true);
      if (h[2] === 'recs') return viewRecs();
      if (h[2] === 'tasks') return viewTasks();
      if (h[2] === 'sign' || h[2] === 'sum') return viewSign();
      if (h[2] === 'prev') return viewPrevPage();
      if (h[2] === 'past') return location.replace('#v/' + S.V.v.id + '/prev');
      if (h[2] === 'prep') return viewPrepare();
      if (h[2] === 'brief' && S.V.caps.brief) return viewBrief();
      if (h[2] === 'hivui' && S.V.caps.hivui) return viewHivui();
      if (h[2] === 'sup' && S.V.caps.supPaper) return viewSup();
      return viewVaadaHome();
    });
    location.hash = '';
  }
  function loading() { APP.innerHTML = '<div class="loading">טוען…</div>'; }
  function failed(e) { APP.innerHTML = '<div class="card"><h2>לא הצלחנו לפתוח</h2><p>' + esc(errText(e)) + '</p><a class="btn" href="#">חזרה למסך הראשי</a></div>'; }
  function loadBoard() {
    return api('board').then(function (r) { if (r.ok) { S.board = r; S.me = r.me; header(); } return r; });
  }

  /* ===== בית ===== */
  function viewHome() {
    loading();
    loadBoard().then(function (r) {
      if (!r.ok) return failed(r.error);
      var me = r.me;
      if (me.principalOf.length === 1 && !me.all && r.schools.length === 1) { location.replace('#s/' + me.principalOf[0]); return; }
      if (!r.schools.length) return viewMine(me);
      viewBoard(r);
    }).catch(function () {});
  }

  /* בעל.ת תפקיד או רשם.ת: רק מה ששויך */
  function viewMine(me) {
    var h = '<div class="head"><h1>הוועדה המלווה</h1><p>אלה הפריטים שהמנהל.ת שייך.ה אליך.</p></div>';
    var byV = {};
    me.assigned.forEach(function (a) { (byV[a.vid] = byV[a.vid] || []).push(a.sec); });
    h += '<div class="card">';
    me.recorderOf.forEach(function (id) { h += '<a class="row" href="#v/' + esc(id) + '"><span class="rm"><span class="rt">רישום הפרוטוקול של הוועדה</span></span><span class="tag info">רשם.ת</span></a>'; });
    (me.netOf || []).forEach(function (id) { h += '<a class="row" href="#v/' + esc(id) + '/sign"><span class="rm"><span class="rt">פרוטוקול הוועדה וחתימה</span></span><span class="tag info">מנהל.ת אזור</span></a>'; });
    Object.keys(byV).forEach(function (vid) {
      var st = vid.split('-').pop();
      byV[vid].forEach(function (sec) {
        var def = VAADA.section(st, sec);
        h += '<a class="row" href="#v/' + esc(vid) + '/e/' + esc(sec) + '"><span class="rm"><span class="rt">' + esc(def ? def.title : sec) + '</span></span><span class="tag">פתיחה</span></a>';
      });
    });
    if (!me.assigned.length && !me.recorderOf.length && !(me.netOf || []).length) h += '<div class="empty">עוד לא שויכו אליך תחומים.</div>';
    APP.innerHTML = h + '</div>';
  }

  /* מצב בית הספר. הוועדה נפתחת לבד בכניסה, ולכן "התחילו" = תחום אחד לפחות נשמר או נקבע תאריך */
  function schoolState(s) {
    var v = s.vaadot.filter(function (x) { return x.stage === 'a'; })[0];
    if (!v || (v.status !== 'closed' && !v.started)) return { key: 'none', tag: '<span class="tag warn">טרם התחילו להכין</span>', v: v };
    if (v.status === 'closed') return { key: 'closed', tag: '<span class="tag ok">התקיימה ונסגרה</span>', v: v };
    return { key: 'prep', tag: '<span class="tag info">בהכנה · ' + v.done + ' מתוך ' + v.total + '</span>', v: v };
  }

  function viewBoard(r, q) {
    var list = r.schools;
    var missing = list.filter(function (s) { return schoolState(s).key === 'none'; });
    var closed = list.filter(function (s) { return schoolState(s).key === 'closed'; }).length;
    var opened = list.length - missing.length;
    var pct = list.length ? Math.round(opened / list.length * 100) : 0;
    var h = '<div class="head"><h1>' + (r.me.role === 'sup' ? 'בתי הספר שלי' : 'כל בתי הספר') + '</h1></div>' +
      '<div class="card summary"><b>התחילו להכין ' + opened + ' מתוך ' + list.length + ' · נסגרו ' + closed + '</b><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    if (missing.length && r.me.role !== 'guest') {
      var names = missing.map(function (s) { return s.name + (s.principals[0] ? ' · ' + s.principals[0].name : ''); }).join('\n');
      var mails = missing.map(function (s) { return (s.principals[0] || {}).email; }).filter(Boolean).join(',');
      h += '<details class="card"><summary><b>מי טרם התחיל להכין (' + missing.length + ')</b></summary><div class="val" style="margin-top:9px">' + esc(names) + '</div>' +
        '<div class="acts"><button type="button" class="btn small" id="copyMissing">העתקת הרשימה</button>' +
        mailBtn({ id: 'mailMissing', cls: 'btn small', label: 'מייל תזכורת', bcc: mails, subject: 'תזכורת: הכנת הוועדה המלווה במערכת הדיגיטלית', lines: ['שלום,', 'טרם התחילה במערכת ההכנה לוועדה המלווה של תחילת השנה. ההכנה נעשית בכתובת:', SITE, 'בכניסה מקלידים את המייל שלך ומקבלים קוד, ונכנסים ישר לדף של בית הספר.', 'זימונים לוועדת פתיחת השנה נשלחים עד 15.11, ומצגת האב נשלחת למפקחים כשבועיים לפני הוועדה.', '', 'המרחב הפדגוגי · המנהל להכשרה מקצועית · משרד העבודה'] }) +
        '</div></details>';
      S.copyMissing = names;
    }
    h += '<div class="filter"><input type="search" id="q" placeholder="חיפוש בית ספר, רשת או מפקח.ת" aria-label="חיפוש" value="' + esc(q || '') + '"></div><div class="card" id="blist"></div>';
    APP.innerHTML = h;
    function draw() {
      var t = $('#q').value.trim();
      var hit = list.filter(function (s) { return !t || (s.name + ' ' + s.network + ' ' + s.sups.join(' ')).indexOf(t) > -1; });
      $('#blist').innerHTML = hit.map(function (s) {
        var st = schoolState(s);
        return '<a class="row" href="#s/' + s.semel + '"><span class="rm"><span class="rt">' + esc(s.name) + '</span><br><span class="rs">' + esc(s.sups.join(' · ')) + ' · ' + esc(s.network) + (s.principals[0] ? ' · ' + esc(s.principals[0].name) : '') + '</span></span>' +
          ((st.v && st.v.date) || s.dateA ? '<span class="rs">' + fmtDate((st.v && st.v.date) || s.dateA) + '</span>' : '') +
          (s.open ? '<span class="tag">' + count(s.open, 'משימה פתוחה אחת', 'משימות פתוחות') + '</span>' : '') + st.tag + '</a>';
      }).join('') || '<div class="empty">לא נמצא בית ספר.</div>';
    }
    draw();
    $('#q').oninput = draw;
    var c = $('#copyMissing');
    if (c) c.onclick = function () { copyText(S.copyMissing); toast('הרשימה הועתקה'); };
    wireMail();
  }

  /* ===== מסלול המנהל.ת: הקישור שנשלח למנהלים. אותם עמודים ואותם נתונים, בלי התפריט המלא (מיטל, 5.11.26) ===== */
  /* תחנה נספרת רק כשמילאו בה משהו מעבר לכותרת: הכותרות המוצעות הן רק הצעה */
  function realStations(V) {
    return ((V.docs.prep || {}).stations || []).filter(function (st) { return st.title && Object.keys(st).some(function (k) { return k !== 'title' && k !== 'sec' && String(st[k] || '').trim(); }); }).length;
  }
  var FOCUS_PAGES = ['prev', 'prep', 'fill', 'holders', 'e', 'deck', 'live', 'all'];
  var FOCUS_KEY = 'vaada_focus';
  function focusOn() { try { return sessionStorage.getItem(FOCUS_KEY) === '1'; } catch (e) { return false; } }
  function setFocus(on) { try { if (on) sessionStorage.setItem(FOCUS_KEY, '1'); else sessionStorage.removeItem(FOCUS_KEY); } catch (e) {} }
  function focusBar(cur) {
    var base = '#v/' + S.V.v.id;
    /* בתוך הצעדים בטלפון הסרגל מוסתר: המסך נשאר למה שממלאים עכשיו */
    var inStep = /\/(e|prep)(\/|$)/.test(location.hash);
    return '<nav class="fbar' + (inStep ? ' instep' : '') + '" aria-label="השלבים"><a href="' + base + '/fill"' + (cur === 'fill' ? ' aria-current="page"' : '') + '>1. מילוי מצגת האב</a><a href="' + base + '/prep"' + (cur === 'prep' ? ' aria-current="page"' : '') + '>2. בחירת תחנות</a><a href="' + base + '/deck"' + (cur === 'deck' ? ' aria-current="page"' : '') + '>3. המצגת</a></nav>';
  }
  /* הקישור למנהלים פותח ישר את מילוי מצגת האב. אחריה בוחרים תחנות (מיטל, 5.11.26) */
  function viewFocus(semel) {
    loading();
    var go1 = function (sm) {
      withSchool(sm, function (r) { location.replace('#v/' + r.current + '/fill'); });
    };
    if (semel) return go1(semel);
    loadBoard().then(function (r) {
      if (!r.ok) return failed(r.error);
      var mine = r.me.principalOf || [];
      if (mine.length === 1) return location.replace('#m/' + mine[0]);
      /* בלי בית ספר אחד ברור (מטה, מפקח.ת, בעל.ת תפקיד): למסך הרגיל */
      setFocus(false); location.replace('#');
    }).catch(function () {});
  }

  /* ===== המערכת של בית הספר: בית + דף לכל פריט (מיטל, 4.11.26: לא עמוד אחד עמוס) =====
     #s/<סמל>        בית: סיכום הוועדה + כרטיס לכל פריט
     #s/<סמל>/pic    תמונת מצב: מיפוי, עובדות מהוועדה הקודמת, אקלים, סל
     #s/<סמל>/roles  בעלי התפקידים מהנספח
     #s/<סמל>/prev   עובר ל-#v/<id>/prev: ועדת תשפ"ו (החלטות, פערים, מה קרה איתם, המסמך)
     #s/<סמל>/open   משימות פתוחות לאורך השנה
     הנתונים נטענים פעם אחת (פעולה school, שגם פותחת את הוועדה של השנה) ונשמרים ב-S.SCH */
  var SCHOOL_PAGES = [['', 'ראשי'], ['pic', 'תמונת מצב'], ['roles', 'בעלי תפקידים'], ['prev', 'ועדת תשפ"ו'], ['open', 'משימות פתוחות']];
  var VAADA_PAGES = [['', 'ראשי הוועדה'], ['prep', 'הכנה'], ['fill', 'מילוי מצגת האב'], ['deck', 'מצגת הוועדה'], ['recs', 'המלצות המפקח.ת'], ['tasks', 'החלטות ומשימות'], ['sign', 'פרוטוקול וחתימות']];
  var SUP_PAGES = [['brief', 'שיחה מצומצמת'], ['hivui', 'חיווי להנהלת המינהל'], ['sup', 'הכנת מפקח.ת']];

  /* תפריט צד מקובץ: קבוצה לבית הספר, קבוצה לוועדה (ולפיקוח). רק הקבוצה הנוכחית פתוחה */
  function sideMenu(groups, title, sub) {
    return '<nav class="vmenu" aria-label="תפריט"><b>' + esc(title) + '</b><span class="rs">' + esc(sub) + '</span>' +
      groups.map(function (g) {
        var cur = g.items.some(function (it) { return it[2]; });
        return '<details class="mg"' + (cur ? ' open' : '') + '><summary>' + esc(g.title) + '</summary>' +
          g.items.map(function (it) { return '<a href="' + it[0] + '"' + (it[2] ? ' aria-current="page"' : '') + '>' + esc(it[1]) + '</a>'; }).join('') + '</details>';
      }).join('') + '</nav>';
  }
  function menuGroup(title, pages, base, cur) {
    return { title: title, items: pages.map(function (p) { return [base + (p[0] ? '/' + p[0] : ''), p[1], cur === p[0]]; }) };
  }
  function schoolGroup(semel, cur) { return menuGroup('בית הספר', SCHOOL_PAGES, '#s/' + semel, cur); }
  function vaadaGroup(id, cur) { return menuGroup('ועדת תחילת שנה ' + VAADA.YEAR, VAADA_PAGES, '#v/' + id, cur); }

  function withSchool(semel, then) {
    if (S.SCH && S.SCH.school.semel === semel) return then(S.SCH);
    loading();
    api('school', { semel: semel }).then(function (r) {
      if (!r.ok) return failed(r.error);
      S.SCH = r; S.me = r.me; S.board = null; header();
      then(r);
    }).catch(function () {});
  }
  function viewSchool(semel, page) {
    page = page || '';
    var toPrev = page === 'prev' || page === 'past';
    if (!SCHOOL_PAGES.some(function (p) { return p[0] === page; })) page = '';
    withSchool(semel, function (r) {
      if (toPrev) return location.replace('#v/' + r.current + '/prev');
      var s = r.school, many = r.me.all || (r.me.semels || []).length > 1;
      var crumb = page ? '<a class="crumb" href="#s/' + semel + '">→ ' + esc(s.name) + '</a>' :
        many ? '<a class="crumb" href="#">→ ' + (r.me.role === 'sup' && !r.me.all ? 'בתי הספר שלי' : 'כל בתי הספר') + '</a>' : '';
      var title = page ? SCHOOL_PAGES.filter(function (p) { return p[0] === page; })[0][1] : s.name;
      var head = crumb + '<div class="head"><h1>' + esc(title) + '</h1><p>' + (page ? esc(s.name) + ' · ' : '') + esc(s.network) + ' · מפקח.ת: ' + esc(s.sups.join(' · ')) +
        (r.principals.length ? ' · מנהל.ת: ' + esc(r.principals.map(function (p) { return p.name; }).join(', ')) : ' · <span class="tag warn">אין מנהל.ת ברשימה</span>') + '</p></div>';
      var body = page === 'pic' ? schoolPic(r) : page === 'roles' ? schoolRoles(r) : page === 'open' ? schoolOpen(r) : schoolHome(r);
      APP.innerHTML = '<div class="shell">' + sideMenu([schoolGroup(semel, page), vaadaGroup(r.current)], s.name, s.network) + '<div class="vmain">' + head + body + '</div></div>';
      wirePast();
    });
  }
  function plainList(items) { return '<ul class="plain">' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
  function tilesOf(items) {
    return '<div class="tiles">' + items.map(function (x) { return '<a class="tile" href="' + x[0] + '"><b>' + esc(x[1]) + '</b>' + (x[2] ? '<span>' + esc(x[2]) + '</span>' : '') + '</a>'; }).join('') + '</div>';
  }
  function goLink(href, label) { return '<div class="acts"><a class="btn small" href="' + href + '">' + esc(label) + '</a></div>'; }

  /* בית: מצב הוועדה + כרטיס לכל דף של בית הספר + כרטיס לכל פריט בוועדה */
  function schoolHome(r) {
    var a = r.vaadot.filter(function (v) { return v.stage === 'a'; })[0], st = schoolState({ vaadot: r.vaadot }), t = r.tuva || {};
    var base = '#v/' + r.current, sb = '#s/' + r.school.semel;
    var sub = a && a.status === 'closed' ? 'הוועדה התקיימה ונסגרה' + (a.date ? ' · ' + fmtDate(a.date) : '') :
      a && a.date ? 'הושלמו ' + a.done + ' מתוך ' + a.total + ' תחומים' :
      'זימונים עד 15.11 · הוועדה עד אמצע ינואר · הושלמו ' + (a ? a.done : 0) + ' מתוך ' + (a ? a.total : 18) + ' תחומים';
    var pct = a && a.total ? Math.round(a.done / a.total * 100) : 0;
    var h = '<div class="card vstat"><div class="vstat-t"><div class="vsk">ועדת תחילת שנה ' + esc(VAADA.YEAR) + '</div>' + (a && a.date ? '<div class="vdate">' + fmtDate(a.date) + '</div>' : '') + st.tag + '<div class="rs">' + esc(sub) + '</div><div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
      '<a class="btn primary" id="enterV" href="' + base + '">כניסה לוועדה</a></div>';
    var have = [t.mipuiFacts ? 'מיפוי' : '', t.aklim ? 'אקלים' : '', t.sal ? 'סל תוכניות' : '', t.facts ? 'עובדות מהוועדה הקודמת' : ''].filter(Boolean);
    var roles = (t.roles || []).filter(function (x) { return x.role; }), vac = roles.filter(function (x) { return x.vacant; }).length;
    var pv = r.prev || { tasks: [], recs: [] }, op = r.open || [];
    var prevSub = [pv.tasks.length ? count(pv.tasks.length, 'החלטה אחת', 'החלטות') : '', pv.recs.length ? count(pv.recs.length, 'פער אחד', 'פערים') : ''].filter(Boolean).join(' · ');
    var prevDone = pv.tasks.filter(function (x) { return x.refStatus; }).length + pv.recs.filter(function (x) { return x.ref; }).length;
    h += '<h2 class="sh">בית הספר</h2>' + tilesOf([
      [sb + '/pic', 'תמונת מצב', have.length ? have.join(' · ') : 'עוד אין נתונים'],
      [sb + '/roles', 'בעלי תפקידים', roles.length ? count(roles.length, 'בעל.ת תפקיד אחד.ת', 'בעלי תפקידים') + (vac ? ' · ' + count(vac, 'תפקיד אחד טרם אויש', 'טרם אוישו') : '') : 'אין נספח במערכת'],
      [sb + '/prev', 'ועדת תשפ"ו', prevSub ? prevSub + ' · נענו ' + prevDone + ' מתוך ' + (pv.tasks.length + pv.recs.length) : 'אין החלטות במערכת'],
      [sb + '/open', 'משימות פתוחות', op.length ? count(op.length, 'משימה פתוחה אחת', 'משימות פתוחות') : 'עדיין אין משימות']
    ]);
    var nSeed = a && a.status === 'closed' ? 0 : (r.seedSecs || []).length;
    h += '<h2 class="sh">ועדת תחילת שנה ' + esc(VAADA.YEAR) + '</h2>' + tilesOf([
      [base + '/prep', 'הכנה', 'תחנות וסוגיית ליבה'], [base + '/fill', 'מילוי מצגת האב', (a ? a.done : 0) + ' מתוך ' + (a ? a.total : 18) + ' תחומים' + (nSeed ? ' · ' + count(nSeed, 'תחום אחד מוכן לבדיקה', 'תחומים מוכנים לבדיקה') : '')], [base + '/deck', 'מצגת הוועדה', 'שקפים נבחרים או מצגת אב'],
      [base + '/recs', 'המלצות המפקח.ת', 'של המפקח.ת הפדגוגי.ת'], [base + '/tasks', 'החלטות ומשימות', 'ההחלטות מהוועדה והסטטוס שלהן'], [base + '/sign', 'פרוטוקול וחתימות', 'אחרי סגירת הוועדה']
    ]);
    h += '<div class="tl future"><h3>ועדת סיכום שנה</h3><div class="rs">' + (r.dateB ? 'מועד: ' + fmtDate(r.dateB) + ' · ' : 'אפריל–יוני · זימונים עד 15.5. ') + 'תיפתח כאן בהמשך השנה, עם המשימות של ועדת תחילת השנה.</div></div>';
    return h;
  }

  /* תמונת מצב: רק עובדות שמותר לבית הספר לראות (לפי נייר יעקבזון). הדירוגים נשארים אצל המפקח.ת */
  function schoolPic(r) {
    var t = r.tuva || {}, base = '#v/' + r.current, h = '';
    var m = t.mipuiFacts || {}, facts = [['תלמידים בכיתות ט–יב', m['מספר תלמידים מט-יב']], ['תלמידים בינואר השנה', m['מספר תלמידים בינואר השנה בכיתות ט-יב']], ['תלמידים בינואר שנה שעברה', m['מספר תלמידים בינואר שנה שעברה']], ['תלמידי קורסים', m['מספר תלמידי קורסים']], ['מגמות לימוד', m['מגמות לימוד']]].filter(function (x) { return x[1]; });
    if (facts.length) h += '<div class="card"><h2>מהמיפוי' + (m['תאריך קליטת טופס'] ? ' · ' + fmtDate(m['תאריך קליטת טופס']) : '') + '</h2>' + plainList(facts.map(function (x) { return esc(x[0]) + ': <b>' + esc(x[1]) + '</b>'; })) + goLink(base + '/e/netunim', 'לעדכון בנתוני בית הספר') + '</div>';
    if (t.facts && (t.facts.facts || []).length) h += '<div class="card"><h2>עובדות מהוועדה הקודמת' + (t.facts.stage ? ' (' + esc(t.facts.stage) + ')' : '') + '</h2>' + plainList(t.facts.facts.map(esc)) + '</div>';
    if (t.aklim && t.aklim.length) {
      var byAud = {};
      t.aklim.forEach(function (x) { (byAud[x['קהל'] || ''] = byAud[x['קהל'] || ''] || []).push(x); });
      h += '<div class="card"><h2>שאלון האקלים</h2><div class="rs" style="margin-bottom:6px">ציונים מ-0 עד 100. ההשוואה היא לבתי ספר דומים. ירוק: מעל ההשוואה, כתום: מתחת.</div>';
      Object.keys(byAud).forEach(function (aud) {
        h += '<div class="tblw"><table class="grid aklim"><thead><tr><th>' + esc(aud || 'ממד') + '</th><th>תשפ"ו</th><th>תשפ"ה</th><th>השוואה</th></tr></thead><tbody>' +
          byAud[aud].map(function (x) {
            var now = Number(x['תשפ"ו']), cmp = Number(x['השוואה']), cls = now && cmp ? (now >= cmp ? ' up' : ' down') : '';
            return '<tr><td class="rowlbl">' + esc(x['ממד']) + '</td><td data-l="תשפ&quot;ו" class="n' + cls + '">' + esc(x['תשפ"ו']) + '</td><td data-l="תשפ&quot;ה" class="n">' + esc(x['תשפ"ה']) + '</td><td data-l="השוואה" class="n">' + esc(x['השוואה']) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      });
      if (t.aklimWeak && t.aklimWeak.length) h += '<details><summary><b>ההיגדים הנמוכים ביותר</b></summary>' + plainList(t.aklimWeak.slice(0, 12).map(function (x) { return esc(x['קהל'] || '') + ': ' + esc(x['היגד'] || '') + (x['ממוצע'] ? ' (' + esc(x['ממוצע']) + ')' : ''); })) + '</details>';
      h += goLink(base + '/e/aklim', 'לתחום האקלים בוועדה') + '</div>';
    }
    if (t.sal && (t.sal.programs || []).length) {
      var byDom = {};
      t.sal.programs.forEach(function (p) { (byDom[p.domain || 'אחר'] = byDom[p.domain || 'אחר'] || []).push(p); });
      h += '<div class="card"><h2>סל התוכניות שהוגש</h2>' + Object.keys(byDom).map(function (d) {
        return '<h3>' + esc(d) + '</h3>' + plainList(byDom[d].map(function (p) { return esc(p.name) + (p.target ? ' <span class="rs">(' + esc(p.target) + ')</span>' : ''); }));
      }).join('') + '</div>';
    }
    return h || '<div class="card empty">עוד אין נתונים על בית הספר במערכת. הם ייכנסו עם מילוי מצגת האב.' + goLink(base + '/fill', 'למילוי מצגת האב') + '</div>';
  }

  function schoolRoles(r) {
    var roles = ((r.tuva || {}).roles || []).filter(function (x) { return x.role; }), base = '#v/' + r.current;
    if (!roles.length) return '<div class="card empty">אין במערכת נספח בעלי תפקידים לבית הספר.' + goLink(base + '/e/koach', 'למילוי כוח האדם בוועדה') + '</div>';
    return '<div class="card"><div class="rs" style="margin-bottom:8px">מנספח בעלי התפקידים שהוגש. תיקונים נעשים בתחום כוח האדם בוועדה.</div><div class="tblw"><table class="grid"><thead><tr><th>תפקיד</th><th>שם</th><th>שעות</th><th>ותק</th></tr></thead><tbody>' +
      roles.map(function (x) { return '<tr><td class="rowlbl">' + esc(x.role) + (x.detail ? ' <span class="rs">' + esc(x.detail) + '</span>' : '') + '</td><td data-l="שם">' + (x.vacant ? '<span class="tag warn">טרם אויש</span>' : esc(x.name)) + '</td><td data-l="שעות">' + esc(x.hours) + '</td><td data-l="ותק">' + esc(x.years) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' + goLink(base + '/e/koach', 'לעדכון בכוח האדם') + '</div>';
  }

  function schoolOpen(r) {
    var op = r.open || [];
    if (!op.length) return '<div class="card empty">עדיין אין משימות. ההחלטות שייכתבו בוועדת תחילת השנה יופיעו כאן, עם הסטטוס שלהן לאורך השנה.' + goLink('#v/' + r.current + '/tasks', 'להחלטות ומשימות בוועדה') + '</div>';
    return '<div class="card"><div class="rs" style="margin-bottom:8px">משימות שעוד לא סומנו "עמידה בתכנון" או "בוטל". לחיצה פותחת את המשימות בוועדה שלהן.</div>' +
      plainList(op.map(function (x) { return '<a class="plink" href="#v/' + esc(x.vid) + '/tasks">' + esc(x.text) + '</a>' + (x.owner ? ' <span class="rs">· ' + esc(x.owner) + '</span>' : '') + (x.party === 'פיקוח' ? ' <span class="tag">באחריות הפיקוח</span>' : '') + (x.follow ? ' <span class="rs">· מעקב עד ' + fmtDate(x.follow) + '</span>' : '') + (x.st ? ' <span class="tag info">' + esc(x.st) + '</span>' : ''); })) + '</div>';
  }


  /* ===== טעינת ועדה ===== */
  function withVaada(id, then) {
    if (S.V && S.V.v.id === id && withVaada.keep) { withVaada.keep = false; return then(); }
    loading();
    api('vaada', { id: id }).then(function (r) {
      if (!r.ok) return failed(r.error);
      S.V = r; S.me = r.me; S.SCH = null; header();
      then();
    }).catch(function () {});
  }
  function go(hash) { withVaada.keep = true; if (location.hash === hash) route(); else location.hash = hash; }
  function secs() { return VAADA.sections(S.V.v.stage); }
  function visibleSecs() { var V = S.V; return secs().filter(function (s) { return V.caps.full || V.caps.mine.indexOf(s.id) > -1; }); }
  function secStatus(id) { var x = S.V.secs[id]; return x ? x.status : ''; }
  function statusTag(id) {
    var st = secStatus(id);
    if (st === 'done') return '<span class="tag ok">הושלם</span>';
    if (st === 'started') return '<span class="tag info">בעבודה</span>';
    return VAADA_PREFILL.hasAny(S.V, id) ? '<span class="tag ready">מוכן לבדיקה</span>' : '<span class="tag">טרם התחיל</span>';
  }
  /* קבוצת "לפיקוח" בתפריט: רק מה שמותר למחובר.ת */
  function supGroup(id, cur) {
    var c = S.V.caps, pages = SUP_PAGES.filter(function (p) { return p[0] === 'brief' ? c.brief : p[0] === 'hivui' ? c.hivui : c.supPaper; });
    return pages.length ? menuGroup('לפיקוח', pages, '#v/' + id, cur) : null;
  }
  function viewName() {
    var p = location.hash.split('/')[2] || '';
    return p === 'e' || p === 'holders' ? 'fill' : p === 'live' || p === 'all' ? 'deck' : p === 'sum' ? 'sign' : p;
  }
  function vHead() {
    var V = S.V, v = V.v, h = '';
    if (focusOn()) h = '';
    else if (V.caps.full) h += '<a class="crumb" href="#' + (viewName() ? 'v/' + v.id : 's/' + v.semel) + '">→ ' + (viewName() ? 'ראשי הוועדה' : esc(v.school)) + '</a>';
    else h += '<a class="crumb" href="#">→ הוועדה המלווה</a>';
    return h + '<div class="head"><h1>ועדה מלווה · ' + esc(VAADA.STAGES[v.stage]) + ' ' + esc(v.year) + '</h1><p>' + esc(v.school) + (v.date ? ' · ' + fmtDate(v.date) : '') + (v.status === 'closed' ? ' · <b>הוועדה נסגרה</b>' : '') + '</p></div>';
  }
  /* תפריט מקובץ בצד במחשב: בית הספר (מקופל), הוועדה (פתוח), לפיקוח. בטלפון: הכרטיסים במסך הראשי של הוועדה */
  function shell(inner) {
    var V = S.V;
    inner = backToSlide() + inner;
    document.body.classList.toggle('on-live', /^(live|all)$/.test(location.hash.split('/')[2] || ''));
    if (!V.caps.full) { APP.innerHTML = inner; wireBack(); return; }
    if (focusOn()) { APP.innerHTML = focusBar(viewName()) + inner; wireBack(); return; }
    var cur = viewName(), groups = [schoolGroup(V.v.semel, cur === 'prev' ? 'prev' : null), vaadaGroup(V.v.id, cur), supGroup(V.v.id, cur)].filter(Boolean);
    APP.innerHTML = '<div class="shell' + (/^(live|all)$/.test(location.hash.split('/')[2] || '') ? ' wide' : '') + '">' + sideMenu(groups, V.v.school, VAADA.STAGES[V.v.stage] + ' ' + V.v.year) + '<div class="vmain">' + inner + '</div></div>';
    wireBack();
  }
  /* עריכה מתוך ההצגה: "חזרה לשקף" בראש הטופס, עד שחוזרים למצגת (מיטל, 7.11.26) */
  var BACK = null;
  function backToSlide() {
    if (!BACK) return '';
    if (location.hash !== BACK.to) { if (/^#v\/[^/]+\/(live|all)\//.test(location.hash)) BACK = null; return ''; }
    return '<a class="btn small primary backslide" id="backSlide" href="' + BACK.from + '">→ חזרה לשקף</a>';
  }
  function wireBack() {
    var b = $('#backSlide');
    if (b) b.onclick = function (e) {
      e.preventDefault();
      var to = BACK.from;
      Promise.all(Object.keys(QUEUES).map(function (k) { return flush(QUEUES[k]); })).then(function () { go(to); }, function () { go(to); });
    };
  }

  /* ===== ראשי של הוועדה: סיכום + כרטיס לכל פריט בתפריט ===== */
  function reqDone() {
    var req = VAADA.required(S.V.v.stage);
    return { total: req.length, done: req.filter(function (s) { return secStatus(s.id) === 'done'; }).length };
  }
  /* לוח מועדים מתאריך הוועדה. המועדים הם הצעה, כמו בנייר */
  function timeline() {
    var d = S.V.v.date;
    if (!d) return '<div class="card"><b>עוד לא נקבע תאריך לוועדה.</b> <a href="#v/' + S.V.v.id + '/fill">קביעת התאריך ב"פרטי הוועדה"</a>. לפיו יופיע כאן לוח ההכנה.</div>';
    function back(n) { var x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() - n); return fmtDate(x.toISOString().slice(0, 10)); }
    var rows = [[21, 'שיחה מקדימה: בחירת תחנות וסוגיית ליבה'], [14, 'מצגת האב נשלחת למפקחים'], [7, 'סנכרון בין המפקחים, לפי הצורך, ושיח עם בעלי התפקידים'], [0, 'הוועדה']];
    return '<div class="card"><b>לוח ההכנה</b><div class="tline">' + rows.map(function (r) { return '<div><b>' + (r[0] ? back(r[0]) : fmtDate(d)) + '</b><span>' + esc(r[1]) + '</span></div>'; }).join('') + '</div></div>';
  }
  function viewVaadaHome() {
    var V = S.V, base = '#v/' + V.v.id, d = reqDone();
    var doneT = V.tasks.filter(function (t) { return t.st === 'עמידה בתכנון' || t.st === 'בוטל'; }).length;
    var need = signSlots();
    var signed = need.filter(function (n) { return n.done; }).length;
    var nSt = realStations(V);
    var tiles = [
      ['prep', 'הכנה', nSt ? 'נבחרו ' + count(nSt, 'תחנה אחת', 'תחנות') : 'בחירת 3–4 תחנות וסוגיית ליבה'],
      ['fill', 'מילוי מצגת האב', 'הושלמו ' + d.done + ' מתוך ' + d.total + ' תחומים'],
      ['deck', 'מצגת הוועדה', 'שקפים נבחרים או מצגת אב, על המסך'],
      ['recs', 'המלצות המפקח.ת', V.recs.length ? count(V.recs.length, 'המלצה אחת', 'המלצות') : 'עדיין אין המלצות'],
      ['tasks', 'החלטות ומשימות', V.tasks.length ? 'בוצעו ' + doneT + ' מתוך ' + V.tasks.length : 'עדיין אין החלטות'],
      ['sign', 'פרוטוקול וחתימות', V.v.status === 'closed' ? 'נחתם על ידי ' + signed + ' מתוך ' + need.length : 'חותמים אחרי סגירת הוועדה']
    ];
    if (V.caps.brief) tiles.push(['brief', 'שיחה מצומצמת', 'מפקח.ת ומנהל.ת בלבד']);
    if (V.caps.hivui) tiles.push(['hivui', 'חיווי להנהלת המינהל', 'תמונת מצב והחלטות מרכזיות']);
    if (V.caps.supPaper) tiles.push(['sup', 'הכנת מפקח.ת', 'שאלות, סימני אזהרה ונתונים']);
    shell(vHead() + timeline() + '<div class="tiles">' + tiles.map(function (t) {
      return '<a class="tile" href="' + base + '/' + t[0] + '"><b>' + esc(t[1]) + '</b><span>' + esc(t[2]) + '</span></a>';
    }).join('') + '</div>');
  }

  /* ===== הכנה ===== */
  function viewPrep() {
    var V = S.V, v = V.v, manage = V.caps.manage && v.status !== 'closed';
    var req = VAADA.required(v.stage).filter(function (s) { return V.caps.full || V.caps.mine.indexOf(s.id) > -1; });
    var done = req.filter(function (s) { return secStatus(s.id) === 'done'; });
    var pct = req.length ? Math.round(done.length / req.length * 100) : 0;
    var h = vHead() + '<div class="card summary"><b>הושלמו ' + done.length + ' מתוך ' + req.length + ' תחומים</b><div class="bar"><i style="width:' + pct + '%"></i></div>';
    var left = req.filter(function (s) { return secStatus(s.id) !== 'done'; });
    /* כל שורה לחיצה: נכנסים ישר להשלים את התחום (מיטל, 12.11.26) */
    if (left.length && V.caps.full) h += '<details><summary>מי טרם סיים (' + left.length + ')</summary><ul class="plain leftl" id="leftList">' + left.map(function (s) {
      var w = whoFills(s.id);
      return '<li><a class="plink" href="#v/' + v.id + '/e/' + s.id + '">' + esc(s.title) + '</a> <span class="rs">· ' + esc(w.length ? w.join(', ') : 'המנהל.ת') + '</span></li>';
    }).join('') + '</ul><button type="button" class="btn small" id="copyLeft" style="margin-top:8px">העתקת הרשימה</button></details>';
    h += '</div>';
    if (manage || V.caps.full) h += metaCard(manage);
    var prevN = V.prev.tasks.length;
    if (prevN) {
      var handled = V.prev.tasks.filter(function (t) { return t.refStatus; }).length;
      h += '<div class="prevbox" style="padding:12px 16px"><b>מ' + esc(V.prev.label) + ': ' + handled + ' מתוך ' + prevN + ' משימות עודכנו.</b> בכל תחום מופיעות בראש העמוד המשימות שלו.</div>';
    }
    /* במקום רשימה של 18 תחומים: "להמשיך" אחד, והקבוצות מקופלות. מי שרק קורא רואה הכול פתוח */
    var nx = nextSec(null), vis = visibleSecs(), g = '';
    if (V.caps.full) {
      var hs = activeHolders(), mailN = {};
      hs.forEach(function (x) { mailN[x.email || x.name] = 1; });
      var nH = Object.keys(mailN).length;
      h += '<div class="card holdc"><b>' + (nH ? count(nH, 'בעל.ת תפקיד אחד.ת ממלא.ת', 'בעלי תפקידים ממלאים') + ' את התחומים שלהם' : 'עוד אין בעלי תפקידים שממלאים תחומים') + '</b><div class="rs">' +
        (nH ? 'שויכו לבד מנספח בעלי התפקידים, לפי התפקיד. כל אחד.ת נכנס.ת עם המייל ורואה רק את התחומים שלו.ה.' : 'אפשר להוסיף בעלי תפקידים ולבחור לכל אחד.ת תחומים.') + '</div>' +
        '<a class="btn small" href="#v/' + v.id + '/holders">' + (manage ? 'מי ממלא מה · הוספה ועדכון' : 'מי ממלא מה') + ' ←</a></div>';
    }
    if (nx && v.status !== 'closed' && V.caps.edit.indexOf(nx.id) > -1) h += '<a class="btn primary fnext" href="#v/' + v.id + '/e/' + nx.id + '">להמשיך: ' + esc(nx.title) + ' ←</a>';
    else if (!nx && focusOn()) h += '<a class="btn primary fnext" href="#v/' + v.id + '/prep">כל התחומים הושלמו. לבחירת התחנות ←</a>';
    vis.forEach(function (s, i) {
      if (s.g !== g) {
        if (g) h += '</details>';
        g = s.g;
        var inG = vis.filter(function (x) { return x.g === g; }), doneG = inG.filter(function (x) { return secStatus(x.id) === 'done'; }).length;
        h += '<details class="secgrp"' + (!V.caps.manage || (nx && nx.g === g) ? ' open' : '') + '><summary><b>' + esc(g) + '</b><span class="rs">' + doneG + ' מתוך ' + inG.length + '</span></summary>';
      }
      var who = whoFills(s.id);
      var pt = V.prev.tasks.filter(function (t) { return t.sec === s.id; });
      var open = pt.filter(function (t) { return !t.refStatus; }).length;
      h += '<div class="sec-row" data-sec="' + s.id + '"><div class="rm"><a href="#v/' + v.id + '/e/' + s.id + '">' + esc(s.title) + (s.opt ? ' (רשות)' : '') + '</a><br><span class="rs">' +
        (who.length ? 'ממלא.ת: ' + esc(who.join(', ')) : 'ממלא.ת: המנהל.ת') + (open ? ' · ' + count(open, 'משימה אחת', 'משימות') + ' מהוועדה הקודמת' : '') + '</span></div>' + statusTag(s.id) + '</div>';
      if (i === vis.length - 1) h += '</details>';
    });
    if (focusOn()) h += '<button type="button" class="link" id="fexit">לכל המערכת</button>';
    shell(h);
    var fx = $('#fexit');
    if (fx) fx.onclick = function () { setFocus(false); location.hash = '#s/' + v.semel; };
    var cl = $('#copyLeft');
    if (cl) cl.onclick = function () { copyText(leftText(left)); toast('הרשימה הועתקה'); };
    wireMeta();
  }
  function leftText(left) {
    return left.map(function (s) { var w = whoFills(s.id); return s.title + ' · ' + (w.length ? w.join(', ') : 'המנהל.ת'); }).join('\n');
  }
  /* מי ממלא.ת תחום: בעלי התפקידים (מהנספח או שנוספו) + שיוך ידני ישן, אם יש */
  function activeHolders() { return (S.V.holders || []).filter(function (x) { return !x.off; }); }
  function whoFills(sec) {
    var out = [];
    activeHolders().forEach(function (x) { if (x.secs.indexOf(sec) > -1 && out.indexOf(x.name) < 0) out.push(x.name); });
    var a = S.V.assign[sec];
    if (a && out.indexOf(a.name || a.email) < 0) out.push(a.name || a.email);
    return out;
  }

  /* ===== מי ממלא מה (#v/<id>/holders): שיוך אוטומטי מהנספח + הוספה ועריכה של המנהל.ת. מיטל, 12.11.26 ===== */
  function viewHolders() {
    var V = S.V, v = V.v, manage = V.caps.manage && v.status !== 'closed';
    var list = V.holders || [], act = list.filter(function (x) { return !x.off; }), offs = list.filter(function (x) { return x.off; });
    var title = function (id) { var d = VAADA.section(v.stage, id); return d ? d.title : id; };
    var h = vHead() + '<div class="head"><h2>מי ממלא מה</h2><p>' +
      (manage ? 'בעלי התפקידים מנספח בעלי התפקידים שויכו לבד לתחומים שלהם, לפי התפקיד. אפשר לשנות תחומים, להסיר ולהוסיף. כל אחד.ת נכנס.ת עם המייל שכאן ורואה רק את התחומים שלו.ה.' : 'בעלי התפקידים שממלאים תחומים בוועדה.') + '</p></div>';
    if (manage) h += '<div class="acts" style="margin-bottom:12px"><button type="button" class="btn primary small" id="hAdd">+ הוספת בעל.ת תפקיד</button></div><div id="hForm"></div>';
    h += '<div class="card">' + (act.length ? act.map(function (x) {
      return '<div class="hrow" data-k="' + esc(x.key) + '"><div class="rm"><b>' + esc(x.name) + '</b> <span class="rs">' + esc(x.role || '') + (x.detail ? ' · ' + esc(x.detail) : '') + (x.src === 'נוסף' ? ' · נוסף.ה ידנית' : '') + '</span>' +
        (x.email ? '<div class="rs" dir="ltr" style="text-align:right">' + esc(x.email) + '</div>' : '') +
        '<div class="htags">' + (x.secs.length ? x.secs.map(function (s) { return '<span class="tag">' + esc(title(s)) + '</span>'; }).join('') : '<span class="tag warn">בלי תחום</span>') + '</div></div>' +
        (manage ? '<div class="hacts">' + (x.email && x.secs.length ? holderMail(x) : '') + '<button type="button" class="link" data-he="' + esc(x.key) + '">עריכה</button><button type="button" class="link" data-hd="' + esc(x.key) + '">הסרה</button></div>' : '') + '</div>';
    }).join('') : '<div class="empty">אין בעלי תפקידים שממלאים תחומים. התחומים אצל המנהל.ת.</div>') + '</div>';
    var none = secs().filter(function (s) { return !whoFills(s.id).length; });
    if (none.length) h += '<details class="card"><summary><b>' + count(none.length, 'תחום אחד', 'תחומים') + ' אצל המנהל.ת</b></summary>' + plainList(none.map(function (s) { return esc(s.title) + (s.opt ? ' (רשות)' : ''); })) + '</details>';
    if (manage && offs.length) h += '<details class="card"><summary>הוסרו (' + offs.length + ')</summary>' + offs.map(function (x) {
      return '<div class="hrow"><div class="rm">' + esc(x.name) + ' <span class="rs">' + esc(x.role || '') + '</span></div><button type="button" class="link" data-hr="' + esc(x.key) + '">החזרה</button></div>';
    }).join('') + '</details>';
    h += '<div class="acts"><a class="btn small" href="#v/' + v.id + '/fill">→ חזרה למילוי מצגת האב</a></div>';
    shell(h);
    wireMail();
    if (!manage) return;
    var byKey = {}; list.forEach(function (x) { byKey[x.key] = x; });
    $('#hAdd').onclick = function () { holderForm(null); };
    $$('[data-he]').forEach(function (b) { b.onclick = function () { holderForm(byKey[b.getAttribute('data-he')]); }; });
    $$('[data-hd]').forEach(function (b) {
      b.onclick = function () {
        var x = byKey[b.getAttribute('data-hd')];
        if (!confirm('להסיר את ' + x.name + '? הכניסה שלו.ה לתחומים תיחסם.')) return;
        holderSend({ key: x.key, del: true }, 'הוסר.ה');
      };
    });
    $$('[data-hr]').forEach(function (b) {
      b.onclick = function () { var x = byKey[b.getAttribute('data-hr')]; holderSend({ key: x.key, name: x.name, role: x.role, email: x.email, secs: x.secs, off: false }, 'הוחזר.ה'); };
    });
  }
  function holderSend(data, done) {
    return api('holderSave', Object.assign({ semel: S.V.v.semel }, data)).then(function (r) {
      if (!r.ok) { toast(errText(r.error)); return false; }
      S.V.holders = r.holders; toast(done); viewHolders(); return true;
    }).catch(function () { return false; });
  }
  function holderForm(x) {
    var box = $('#hForm'), v = S.V.v;
    x = x || { name: '', role: '', email: '', secs: [] };
    box.innerHTML = '<form class="card hform"><h3>' + (x.key ? 'עריכת ' + esc(x.name) : 'הוספת בעל.ת תפקיד') + '</h3>' +
      '<label class="f"><b>שם</b><input type="text" name="name" required value="' + esc(x.name) + '"></label>' +
      '<label class="f"><b>תפקיד</b><input type="text" name="role" placeholder="למשל: רכז.ת מגמה, סגן.ית מנהל.ת" value="' + esc(x.role) + '"></label>' +
      '<label class="f"><b>מייל</b><span class="hint">איתו נכנסים למעגל ומקבלים קוד</span><input type="email" name="email" dir="ltr" required value="' + esc(x.email) + '"></label>' +
      '<fieldset class="f hsecs"><legend><b>התחומים שהוא.היא ממלא.ת</b></legend>' + secs().map(function (s) {
        return '<label class="chk"><input type="checkbox" value="' + s.id + '"' + (x.secs.indexOf(s.id) > -1 ? ' checked' : '') + '> ' + esc(s.title) + (s.opt ? ' (רשות)' : '') + '</label>';
      }).join('') + '</fieldset>' +
      '<div class="acts"><button class="btn primary small">שמירה</button><button type="button" class="btn small" id="hCancel">ביטול</button></div></form>';
    var f = box.querySelector('form');
    f.scrollIntoView({ block: 'start' });
    f.elements.name.focus();
    $('#hCancel').onclick = function () { box.innerHTML = ''; };
    f.onsubmit = function (e) {
      e.preventDefault();
      var picked = Array.prototype.map.call(f.querySelectorAll('.hsecs input:checked'), function (c) { return c.value; });
      if (!picked.length && !confirm('לא נבחר תחום. לשמור בכל זאת? בלי תחום אין כניסה.')) return;
      var btn = f.querySelector('.btn.primary'); btn.disabled = true;
      holderSend({ key: x.key, name: f.elements.name.value.trim(), role: f.elements.role.value.trim(), email: f.elements.email.value.trim(), secs: picked }, x.key ? 'נשמר' : 'נוסף.ה')
        .then(function (okd) { if (!okd) btn.disabled = false; });
    };
  }
  function holderMail(x) {
    var v = S.V.v, t = x.secs.map(function (s) { var d = VAADA.section(v.stage, s); return d ? d.title : s; });
    var links = x.secs.map(function (s, i) { return t[i] + ': ' + SITE + '#v/' + v.id + '/e/' + s; });
    return mailBtn({ id: 'hm_' + x.key.replace(/[^\w]/g, '_'), cls: 'btn small', label: 'מייל', to: x.email,
      subject: 'ועדה מלווה ' + v.school + ': ' + (t.length === 1 ? 'התחום "' + t[0] + '"' : 'התחומים שלך'),
      lines: ['שלום ' + x.name + ',', 'לקראת הוועדה המלווה של ' + v.school + ', אבקש למלא במערכת מעגל את ' + (t.length === 1 ? 'התחום:' : 'התחומים:'), ''].concat(links).concat(['', 'בכניסה מקלידים את המייל הזה (' + x.email + ') ומקבלים קוד. הכול נשמר אוטומטית. בסוף כל תחום לוחצים "סיימתי את התחום".', '', 'תודה!']) });
  }

  function metaCard(edit) {
    var v = S.V.v;
    if (!edit) return '<div class="card"><b>מועד:</b> ' + (fmtDate(v.date) || 'טרם נקבע') + ' · <b>רשם.ת:</b> ' + esc(v.recName || v.recEmail || 'טרם מונה') + '</div>';
    return '<details class="card metac"><summary><b>פרטי הוועדה: מועד, רשם.ת, רשת ומשתתפים</b></summary><div style="margin-top:12px">' +
      '<label class="f"><b>תאריך הוועדה</b><input type="date" data-m="date" value="' + esc(v.date) + '"></label>' +
      '<label class="f"><b>רשם.ת הפרוטוקול: שם</b><input type="text" data-m="recName" value="' + esc(v.recName) + '"></label>' +
      '<label class="f"><b>רשם.ת הפרוטוקול: מייל</b><span class="hint">הרשם.ת נכנס.ת עם המייל הזה ורושם.ת את ההחלטות. בלי רשם.ת — המנהל.ת רושם.ת.</span><input type="email" dir="ltr" data-m="recEmail" value="' + esc(v.recEmail) + '"></label>' +
      '<label class="f"><b>מנהל.ת אזור: שם</b><input type="text" data-m="netName" value="' + esc(v.netName) + '"></label>' +
      '<label class="f"><b>מנהל.ת אזור: מייל</b><span class="hint">נכנס.ת עם המייל הזה ורואה רק את הפרוטוקול והחתימה.</span><input type="email" dir="ltr" data-m="netEmail" value="' + esc(v.netEmail) + '"></label>' +
      '<label class="f"><b>משתתפים</b><span class="hint">שם ותפקיד, שורה לכל אחד.ת. חובה: מנהל.ת והנהלה, מנהל.ת אזור, מפקח.ת כולל.ת, מפקחת מערך טיפולי, מפקחים מקצועיים.</span><textarea data-m="parts">' + esc(v.parts) + '</textarea></label>' +
      '<label class="f"><b>מיילים למשלוח הסיכום (רשות)</b><span class="hint">מופרדים בפסיק</span><input type="text" dir="ltr" data-m="emails" value="' + esc(v.emails) + '"></label>' +
      '<div class="saved" id="metaSaved"></div></div></details>';
  }
  function wireMeta() {
    $$('[data-m]').forEach(function (el) {
      el.onchange = function () {
        var p = {}; p[el.getAttribute('data-m')] = el.value;
        $('#metaSaved').textContent = 'שומר…';
        api('meta', { id: S.V.v.id, patch: p }).then(function (r) {
          if (r.ok) { S.V.v = r.v; S.board = null; $('#metaSaved').textContent = 'נשמר'; }
          else { $('#metaSaved').textContent = errText(r.error); }
        }).catch(function () {});
      };
    });
  }

  function assignForm(sec) {
    var row = $('.sec-row[data-sec="' + sec + '"]'), old = $('.assign');
    if (old) old.parentNode.removeChild(old);
    var a = S.V.assign[sec] || {};
    var f = document.createElement('form');
    f.className = 'assign';
    f.innerHTML = '<input type="text" placeholder="שם בעל.ת התפקיד" aria-label="שם" value="' + esc(a.name) + '"><input type="email" dir="ltr" placeholder="מייל" aria-label="מייל" value="' + esc(a.email) + '"><button class="btn small primary">שמירה</button><div id="asMail" style="grid-column:1/-1"></div>';
    row.appendChild(f);
    f.onsubmit = function (e) {
      e.preventDefault();
      var name = f.children[0].value.trim(), email = f.children[1].value.trim();
      api('assign', { id: S.V.v.id, sec: sec, name: name, email: email }).then(function (r) {
        if (!r.ok) return toast(errText(r.error));
        if (email) S.V.assign[sec] = { name: name, email: email }; else delete S.V.assign[sec];
        toast(email ? 'השיוך נשמר' : 'השיוך הוסר');
        $('#asMail').innerHTML = email ? mailBtn({ id: 'mailAs', cls: 'btn small', label: 'הכנת מייל לבעל.ת התפקיד', to: email, subject: 'ועדה מלווה: התחום "' + VAADA.section(S.V.v.stage, sec).title + '"', lines: ['שלום ' + name + ',', 'לקראת הוועדה המלווה של ' + S.V.v.school + ', אבקש למלא את התחום "' + VAADA.section(S.V.v.stage, sec).title + '" במערכת:', SITE + '#v/' + S.V.v.id + '/e/' + sec, 'בכניסה מקלידים את המייל הזה ומקבלים קוד. הכול נשמר אוטומטית. אחרי המילוי לוחצים "סיימתי את התחום".', 'תודה!'] }) : '';
        wireMail();
      }).catch(function () {});
    };
  }

  /* ===== שדות טופס ===== */
  /* הלוגיקה של הערך ההתחלתי נמצאת ב-prefill.js */
  function initial(secId, f) { return VAADA_PREFILL.value(S.V, secId, f); }
  /* תווית ליד כותרת שדה שהערך שלו מוכן מראש ועוד לא נשמר: רק מאיפה זה, בלי מספר עמוד (מיטל, 5.11.26) */
  function srcTag(secId, f) {
    var s = VAADA_PREFILL.source(S.V, secId, f);
    return s ? '<span class="presrc" data-src="' + f.k + '">' + esc(s.replace(/,?\s*עמ['׳]?\s*\d[\d\s,–-]*/g, ' ').replace(/\s+/g, ' ').trim()) + '</span>' : '';
  }
  /* רמזים שלא נכנסים לטופס. כל השאר כבר בתוך השדות */
  function tuvaBox(secId) {
    var t = S.V.tuva || {}, h = '';
    var src = function (txt) { return '<div class="rs" style="margin-bottom:6px">' + esc(txt) + '</div>'; };
    var list = function (items) { return '<ul class="plain">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
    if (secId === 'netunim' && t.mipuiFacts) {
      var m = t.mipuiFacts, lines = [['השנה', m['מספר תלמידים בינואר השנה בכיתות ט-יב']], ['שנה שעברה', m['מספר תלמידים בינואר שנה שעברה']]].filter(function (x) { return x[1]; });
      if (lines.length) h += src('תלמידים בינואר, מהמיפוי:') + list(lines.map(function (x) { return x[0] + ': ' + x[1]; }));
    }
    if (secId === 'aklim' && (t.aklimWeak || []).length) {
      h += src('ההיגדים הנמוכים:') + list(t.aklimWeak.slice(0, 12).map(function (x) { return (x['קהל'] || '') + ': ' + (x['היגד'] || '') + (x['ממוצע'] ? ' (' + x['ממוצע'] + ')' : ''); }));
    }
    /* סל התוכניות בכל תחום שיש לו תחום מקביל בסל (מיטל, 5.11.26) */
    var PED = /פדגוג/, MIK = /מקצוע|חניכות/, YEU = /ייעוצ|יעוצ|טיפול/, CHE = /חברתי/;
    var sal = t.sal, domOf = { dualit: PED, pituach: PED, gmar: PED, pedagogit: PED, chanichut: MIK, taasuka: MIK, mgamot: MIK, yeutz: YEU, hatmada: YEU, shiluv: YEU, aklim: YEU, rigshi: YEU, chevrati: CHE, bogrim: CHE };
    if (sal && domOf[secId]) {
      var pr = (sal.programs || []).filter(function (p) { return domOf[secId].test(p.domain || ''); });
      if (pr.length) h += src('מסל התוכניות:') + list(pr.map(function (p) { return p.name + (p.target ? ' (' + p.target + ')' : ''); }));
    }
    return h ? '<details class="card tuvabox"><summary><b>לעיון, לא נכנס לטופס</b></summary><div style="margin-top:8px">' + h + '</div></details>' : '';
  }

  function cellInput(col, val, fk, r, c) {
    var a = ' data-cell="' + fk + '" data-r="' + r + '" data-c="' + c + '"';
    if (col.t === 'yn') return '<select' + a + ' aria-label="' + esc(col.l) + '"><option value=""></option><option' + (val === 'כן' ? ' selected' : '') + '>כן</option><option' + (val === 'לא' ? ' selected' : '') + '>לא</option></select>';
    if (col.t === 'num') return '<input type="text" inputmode="numeric" data-num' + a + ' aria-label="' + esc(col.l) + '" value="' + esc(val) + '">';
    if (col.t === 'area') return '<textarea rows="3"' + a + ' aria-label="' + esc(col.l) + '">' + esc(val) + '</textarea>';
    return '<textarea rows="1" style="min-height:42px"' + a + ' aria-label="' + esc(col.l) + '">' + esc(val) + '</textarea>';
  }
  function tableHtml(f, val, tag) {
    var rows = f.rows || null, n = rows ? rows.length : Math.max((val || []).length, f.minRows || (f.add ? 1 : 0));
    /* טור מספרים אחד: בטלפון התווית והמספר באותה שורה */
    var tight = rows && f.cols.length === 1 && f.cols[0].t === 'num';
    /* שורות ממוספרות (1, 2, 3): עמודת התווית צרה, כדי שלא תיראה כמו שדה (מיטל, 5.11.26) */
    var short = rows && rows.every(function (l) { return l.length <= 2; });
    var h = '<div class="f"><span class="lbl">' + esc(f.l) + (tag || '') + '</span>' + (f.h ? '<span class="hint">' + esc(f.h) + '</span>' : '') + '<div class="tblw"><table class="grid' + (tight ? ' tight' : '') + (short ? ' short' : '') + '" data-table="' + f.k + '"><thead><tr>' + (rows ? '<th></th>' : '');
    f.cols.forEach(function (c) { h += '<th scope="col">' + esc(c.l) + '</th>'; });
    h += (f.add ? '<th aria-label="מחיקה"></th>' : '') + '</tr></thead><tbody>';
    for (var r = 0; r < n; r++) h += tableRow(f, val, r);
    h += '</tbody></table></div>' + (f.add ? '<button type="button" class="link" data-addrow="' + f.k + '">+ הוספת שורה</button>' : '') + '</div>';
    return h;
  }
  function tableRow(f, val, r) {
    var h = '<tr>' + (f.rows ? '<td class="rowlbl">' + esc(f.rows[r]) + '</td>' : '');
    f.cols.forEach(function (c, i) {
      var v = val && val[r] ? val[r][i] : '';
      h += '<td data-l="' + esc(c.l) + '"' + (c.t === 'area' ? ' class="wide"' : '') + '>' + cellInput(c, v == null ? '' : v, f.k, r, i) + '</td>';
    });
    if (f.add) h += '<td><button type="button" class="rowdel" data-delrow="' + f.k + '" aria-label="מחיקת שורה">×</button></td>';
    return h + '</tr>';
  }
  function planHtml(f, val) {
    val = val || {};
    var goals = val.goals || [{}, {}, {}];
    var h = '<div data-plan="' + f.k + '"><label class="f"><b>הגאווה הבית ספרית שלנו בתחום</b><textarea data-p="pride">' + esc(val.pride) + '</textarea></label>' +
      '<label class="f"><b>אתגרים מרכזיים</b><textarea data-p="chal">' + esc(val.chal) + '</textarea></label>';
    [0, 1, 2].forEach(function (i) {
      var g = goals[i] || {};
      /* יעד 1 פתוח, ויעד שכבר מולא פתוח. השאר מקופלים, שהעמוד לא יהיה ארוך בטלפון */
      var isOpen = i === 0 || g.g || (g.rows || []).length;
      h += '<details class="block"' + (isOpen ? ' open' : '') + '><summary><b>יעד מרכזי ' + (i + 1) + '</b></summary><div style="margin-top:10px"><label class="f"><span class="lbl">מהו היעד</span><textarea rows="2" style="min-height:58px" data-g="' + i + '">' + esc(g.g) + '</textarea></label>' +
        tableHtml({ k: f.k + '__' + i, l: 'איך נגיע ליעד', add: true, minRows: 1, cols: [{ l: 'פעולות מרכזיות' }, { l: 'משאבים / תכניות / מענים / יוזמות' }, { l: 'מדדי הצלחה (איך נדע שהשגנו את היעד)' }] }, g.rows) + '</div></details>';
    });
    return h + '</div>';
  }
  function repeatHtml(f, val) {
    val = val && val.length ? val : [{}];
    var h = (f.h ? '<p class="hint">' + esc(f.h) + '</p>' : '') + '<div data-repeat="' + f.k + '">';
    val.forEach(function (it, i) { h += repeatItem(f, it, i); });
    return h + '</div><button type="button" class="btn small" data-addrep="' + f.k + '">+ הוספת ' + esc(f.item) + '</button>';
  }
  function repeatItem(f, it, i) {
    var h = '<details class="block" ' + (i === 0 ? 'open' : '') + ' data-item><summary><b>' + esc(it.name || (f.item + ' ' + (i + 1))) + '</b></summary><div style="margin-top:10px">';
    f.fields.forEach(function (x) {
      h += '<label class="f"><b>' + esc(x.l) + '</b>' + (x.t === 'text' ? '<input type="text" data-rf="' + x.k + '" value="' + esc(it[x.k]) + '">'
        : x.t === 'yn' ? '<select data-rf="' + x.k + '">' + ['', 'כן', 'לא'].map(function (o) { return '<option' + (o === (it[x.k] || '') ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>'
        : '<textarea data-rf="' + x.k + '">' + esc(it[x.k]) + '</textarea>') + '</label>';
    });
    return h + '<button type="button" class="link danger" data-delrep>מחיקת ה' + esc(f.item) + '</button></div></details>';
  }
  /* תמונות לשקפים: בכל תחום, אחרי השדות. כל תמונה = שקף במצגת האב, אחרי התחום (מיטל, 8.11.26) */
  var IMG_MAX = 10, IMG_MB = 5;
  var IMG_FIELD = { k: 'img', img: true, l: 'תמונות לשקפים (רשות)', h: 'כל תמונה נכנסת כשקף נפרד במצגת האב, אחרי התחום. PNG או JPG, עד ' + IMG_MB + 'MB לתמונה ועד ' + IMG_MAX + ' תמונות לוועדה.' };
  /* x: קובץ מהשרת (mime) או קובץ שנבחר בדפדפן (type) */
  function isImg(x) { return /^image\/(png|jpe?g|gif)$/.test(x.mime || x.type || ''); }
  function fileHtml(f, secId) {
    var list = S.V.files.filter(function (x) { return x.sec === secId && x.field === f.k; });
    return '<div class="f" data-fileblock="' + f.k + '"><span class="lbl">' + esc(f.l) + '</span>' + (f.h ? '<span class="hint">' + esc(f.h) + '</span>' : '') + filesList(list, true) +
      '<label class="btn small" style="margin-top:6px">' + (f.img ? 'הוספת תמונה' : 'העלאת קובץ') + '<input type="file" hidden data-up="' + f.k + '" accept="' + (f.img ? 'image/png,image/jpeg,image/gif' : 'image/*,.pdf,.ppt,.pptx,.doc,.docx') + '"></label></div>';
  }
  function filesList(list, del) {
    return list.map(function (x) {
      return '<div class="task"><button type="button" class="link" data-file="' + esc(x.id) + '">' + esc(x.name) + '</button>' + (del ? ' <button type="button" class="link danger" data-filedel="' + esc(x.id) + '">מחיקה</button>' : '') + '</div>';
    }).join('');
  }
  function fieldHtml(sec, f) {
    var val = initial(sec.id, f), tag = srcTag(sec.id, f), top = tag ? '<div class="pretop">' + tag + '</div>' : '';
    if (f.t === 'table') return tableHtml(f, val, tag);
    if (f.t === 'plan') return top + planHtml(f, val);
    if (f.t === 'repeat') return top + repeatHtml(f, val);
    if (f.t === 'file') return fileHtml(f, sec.id);
    var hint = f.h ? '<span class="hint">' + esc(f.h) + '</span>' : '';
    if (f.t === 'area') return '<label class="f"><b>' + esc(f.l) + tag + '</b>' + hint + '<textarea data-f="' + f.k + '">' + esc(val) + '</textarea></label>';
    if (f.t === 'yn') return '<label class="f"><b>' + esc(f.l) + tag + '</b>' + hint + '<select data-f="' + f.k + '"><option value=""></option><option' + (val === 'כן' ? ' selected' : '') + '>כן</option><option' + (val === 'לא' ? ' selected' : '') + '>לא</option></select></label>';
    return '<label class="f"><b>' + esc(f.l) + tag + '</b>' + hint + '<input type="text"' + (f.t === 'num' ? ' inputmode="numeric"' : '') + ' data-f="' + f.k + '" value="' + esc(val) + '"></label>';
  }

  /* קריאת הערך מהטופס */
  function readTable(el, f) {
    var out = [];
    $$('tbody tr', el).forEach(function (tr) {
      var r = $$('[data-cell]', tr).map(function (c) { return c.value; });
      out.push(r);
    });
    return f && f.add ? out.filter(function (r) { return r.some(Boolean); }) : out;
  }
  function readField(root, f) {
    if (f.t === 'table') return readTable($('[data-table="' + f.k + '"]', root), f);
    if (f.t === 'plan') {
      var p = $('[data-plan="' + f.k + '"]', root), o = { pride: $('[data-p=pride]', p).value, chal: $('[data-p=chal]', p).value, goals: [] };
      [0, 1, 2].forEach(function (i) {
        o.goals.push({ g: $('[data-g="' + i + '"]', p).value, rows: readTable($('[data-table="' + f.k + '__' + i + '"]', p), { add: true }) });
      });
      return o;
    }
    if (f.t === 'repeat') {
      return $$('[data-item]', $('[data-repeat="' + f.k + '"]', root)).map(function (it) {
        var o = {}; $$('[data-rf]', it).forEach(function (x) { o[x.getAttribute('data-rf')] = x.value; }); return o;
      });
    }
    return $('[data-f="' + f.k + '"]', root).value;
  }

  /* ===== שמירה אוטומטית =====
     שדה שהשתנה נכנס לתור ונשלח אחרי שהמשתמש.ת עצר.ה. אם השליחה נכשלה — נשאר בתור, נשמר במכשיר ומנסים שוב. */
  /* תור נפרד לכל תחום: מעבר לתחום אחר לא מאפס שמירה שעוד לא הסתיימה, והיא נשלחת רק לתחום שלה */
  function newQueue(id, sec) { return { id: id, sec: sec, patch: {}, sending: null, run: null, timer: null, busy: false, fails: 0 }; }
  var QUEUES = {};
  var Q = newQueue(null, null);
  function queueOf(id, sec) { var k = id + '|' + sec; return QUEUES[k] || (QUEUES[k] = newQueue(id, sec)); }
  function draftKey(q) { return 'vaada_draft_' + q.id + '_' + q.sec; }
  /* הטיוטה במכשיר כוללת גם מה שנשלח ועוד לא אושר */
  function writeDraft(q) {
    try { localStorage.setItem(draftKey(q), JSON.stringify(Object.assign({}, q.sending, q.patch))); } catch (e) {}
  }
  function setSaved(t, bad) { var el = $('#saved'); if (el) { el.textContent = t; el.className = 'saved' + (bad ? ' bad' : ''); } }
  function queue(k, val) {
    var q = Q;
    q.patch[k] = val;
    writeDraft(q);
    setSaved('שומר…');
    clearTimeout(q.timer);
    q.timer = setTimeout(function () { flush(q); }, 900);
  }
  /* תור שכבר שולח מחזיר את השליחה הנוכחית, וההמשך שלה שולח גם את מה שנוסף בינתיים */
  function flush(q) {
    q = q || Q;
    clearTimeout(q.timer);
    if (q.busy) return q.run;
    if (!q.id || !Object.keys(q.patch).length) return Promise.resolve(true);
    var patch = q.patch, id = q.id, sec = q.sec;
    q.patch = {}; q.sending = patch; q.busy = true;
    q.run = api('save', { id: id, sec: sec, patch: patch }).then(function (r) {
      q.busy = false; q.sending = null;
      if (r.ok) {
        q.fails = 0;
        try { if (Object.keys(q.patch).length) writeDraft(q); else localStorage.removeItem(draftKey(q)); } catch (e) {}
        var x = S.V && S.V.v.id === id ? (S.V.secs[sec] = S.V.secs[sec] || { data: {}, status: 'started' }) : null;
        if (x) { Object.keys(patch).forEach(function (k) { x.data[k] = patch[k]; }); x.status = r.status; }
        if (q === Q) setSaved('נשמר ' + fmtAt(r.at).split(' ').pop());
        if (Object.keys(q.patch).length) return flush(q);
        return true;
      }
      q.patch = Object.assign(patch, q.patch);
      writeDraft(q);
      q.fails++;
      if (q === Q) setSaved('לא נשמר: ' + errText(r.error), true);
      else if (q.fails === 1) toast('לא נשמר בתחום הקודם: ' + errText(r.error));
      if (r.error === 'network' || r.error === 'server') q.timer = setTimeout(function () { flush(q); }, Math.min(30000, 4000 * q.fails));
      return false;
    }).catch(function () { q.busy = false; return false; });
    return q.run;
  }
  function flushNow() { if (Q.id && Object.keys(Q.patch).length) flush(); }
  window.addEventListener('beforeunload', function (e) {
    var open = Object.keys(QUEUES).map(function (k) { return QUEUES[k]; }).filter(function (q) { return Object.keys(q.patch).length || q.busy; });
    if (!open.length) return;
    open.forEach(function (q) { flush(q); });
    e.preventDefault(); e.returnValue = '';
  });

  /* ===== צעד אחד בכל פעם: בלי גלילה ארוכה (מיטל, 5.11.26) =====
     כל השדות נשארים בטופס ורק מוסתרים, כך שהקריאה והשמירה לא משתנות. הצעדים נקבעים לפי הגובה בפועל:
     שדות נכנסים יחד לצעד כל עוד הם נכנסים למסך, וטבלה שלא נכנסת מתפרקת לשורות. */
  var STEP_AT = {};
  function stepBar(endHtml, savedHtml) {
    return '<div class="savebar snav"><button type="button" class="btn small" id="sPrev">→ הקודם</button><span class="smid"><span class="rs" id="sPos"></span>' + savedHtml + '</span><button type="button" class="btn small primary" id="sNext">הבא ←</button>' + endHtml + '</div>' +
      '<details class="card pall" id="sAll"><summary><b>כל השלבים</b></summary><div id="sRows"></div></details>';
  }
  function stepper(root, key, end) {
    var atoms = [], boxes = [], steps = [], cur = 0;
    var budget = Math.max(320, innerHeight * 0.6);
    function hOf(el) { return el.getBoundingClientRect().height + 16; }
    function collect() {
      atoms = []; boxes = [];
      var pend = [];
      function add(a) { a.also = pend; pend = []; atoms.push(a); }
      function kids(el, box) { Array.prototype.slice.call(el.children).forEach(function (x) { walk(x, box); }); }
      function walk(el, box) {
        if (el.tagName === 'SUMMARY' || /^H\d$/.test(el.tagName) || (el.hidden && el.tagName === 'BUTTON')) return;
        if (el.classList.contains('pretop')) { pend.push(el); return; }
        if (el.hasAttribute('data-item') || el.hasAttribute('data-st') || el.classList.contains('card')) { boxes.push(el); el.hidden = false; if (el.tagName === 'DETAILS') el.open = true; kids(el, el); return; }
        if (el.tagName === 'DETAILS') { el.open = true; el.hidden = false; add({ el: el, box: box }); return; }
        if (el.tagName === 'DIV' && !el.classList.contains('f')) return kids(el, box);
        el.hidden = false;
        var tb = el.classList.contains('f') && $('table[data-table]', el);
        if (!tb) { add({ el: el, box: box, join: el.tagName === 'BUTTON' }); return; }
        $$('tbody tr', tb).forEach(function (tr) { tr.hidden = false; });
        /* טבלה שנכנסת למסך נשארת שלמה, בצעד משלה. מתפרקת לשורות רק כשהיא גבוהה מהמסך (מיטל, 5.11.26) */
        if (hOf(el) <= Math.max(budget, innerHeight - 220)) { add({ el: el, box: box }); return; }
        $$('tbody tr', tb).forEach(function (tr, i) { add({ el: el, box: box, tr: tr, first: i === 0 }); });
      }
      kids(root, null);
      /* גובה רק אחרי שהכול גלוי */
      atoms.forEach(function (a) { a.h = a.tr ? hOf(a.tr) + (a.first ? hOf(a.el) - $$('tbody tr', a.el).reduce(function (s, t) { return s + t.getBoundingClientRect().height; }, 0) : 0) : hOf(a.el); });
      steps = []; var sum = 0, st = null;
      atoms.forEach(function (a) {
        if (st && (a.join || (st[0].box === a.box && sum + a.h <= budget))) { st.push(a); sum += a.h; }
        else { st = [a]; steps.push(st); sum = a.h; }
      });
    }
    function caption(s) {
      var a = s[0], box = a.box && a.box.querySelector('summary b'), l = a.tr ? $('.rowlbl', a.tr) : null;
      var own = l || (a.tr || a.el).querySelector('summary b, b, .lbl, h2');
      if (a.tr && !l) own = null;
      var t = [box ? box.textContent : '', a.tr ? ($('.lbl', a.el) || {}).firstChild ? $('.lbl', a.el).firstChild.textContent : '' : '', own ? (own.firstChild || own).textContent : ''].filter(Boolean);
      return t.join(' · ') || 'שורה';
    }
    function filled(s) {
      return s.some(function (a) { return $$('input:not([type=file]):not([type=checkbox]):not([data-s=title]),textarea', a.tr || a.el).some(function (x) { return String(x.value).trim(); }); });
    }
    function rows() {
      $('#sRows').innerHTML = steps.map(function (s, i) { return '<button type="button" class="prow" data-sj="' + i + '"' + (i === cur ? ' aria-current="true"' : '') + '><span class="pmark' + (filled(s) ? ' on' : '') + '">' + (filled(s) ? '✓' : '') + '</span><span>' + esc(caption(s)) + '</span></button>'; }).join('');
      $$('[data-sj]').forEach(function (b) { b.onclick = function () { $('#sAll').open = false; show(Number(b.getAttribute('data-sj'))); }; });
    }
    function show(i, stay) {
      cur = Math.max(0, Math.min(i, steps.length - 1)); STEP_AT[key] = cur;
      atoms.forEach(function (a) { a.el.hidden = true; if (a.tr) a.tr.hidden = true; a.also.forEach(function (x) { x.hidden = true; }); });
      steps[cur].forEach(function (a) { a.el.hidden = false; if (a.tr) a.tr.hidden = false; a.also.forEach(function (x) { x.hidden = false; }); });
      boxes.forEach(function (b) { b.hidden = !steps[cur].some(function (a) { return b.contains(a.el); }); });
      $$('[data-addrow]', root).forEach(function (b) { var tb = $('[data-table="' + b.getAttribute('data-addrow') + '"]', root), trs = $$('tbody tr', tb); b.hidden = !!(trs.length && trs[trs.length - 1].hidden); });
      var last = cur === steps.length - 1;
      $('#sPos').textContent = (cur + 1) + ' מתוך ' + steps.length;
      $('#sPrev').disabled = cur === 0;
      $('#sNext').hidden = last;
      if (end) end.hidden = !last;
      rows();
      if (!stay) window.scrollTo(0, 0);
    }
    function move(d) { var a = document.activeElement; if (a && a.blur && /TEXTAREA|INPUT/.test(a.tagName)) a.blur(); show(cur + d); }
    $('#sPrev').onclick = function () { move(-1); };
    $('#sNext').onclick = function () { move(1); };
    root.classList.add('stepped');
    collect();
    show(STEP_AT[key] || 0, true);
    /* אחרי הוספה או מחיקה של שורה: הצעדים נקבעים מחדש, ונשארים ליד מה ששונה */
    return {
      rebuild: function (target) {
        var keep = cur;
        collect();
        if (target) steps.forEach(function (s, i) { if (s.some(function (a) { return a.tr === target || a.el.contains(target) || target.contains(a.el); })) keep = i; });
        show(keep, true);
      }
    };
  }

  /* ===== מילוי תחום ===== */
  /* התחום הבא שלא הסתיים. תחום רשות לא נספר */
  function nextSec(secId) {
    var vis = visibleSecs(), i = vis.map(function (s) { return s.id; }).indexOf(secId);
    return vis.slice(i + 1).concat(vis.slice(0, Math.max(i, 0))).filter(function (s) { return !s.opt && secStatus(s.id) !== 'done'; })[0] || null;
  }
  function nextSecHash(secId) {
    var n = nextSec(secId);
    return n ? '#v/' + S.V.v.id + '/e/' + n.id : (S.V.caps.full ? '#v/' + S.V.v.id + '/fill' : '#');
  }
  function viewEdit(secId) {
    var V = S.V, v = V.v, sec = VAADA.section(v.stage, secId);
    if (!sec) return failed('notfound');
    if (!V.caps.full && V.caps.mine.indexOf(secId) < 0) return failed('forbidden');
    var edit = V.caps.edit.indexOf(secId) > -1;
    if (!edit) return viewRead(secId);
    Q = queueOf(v.id, secId);
    /* טיוטה שלא הגיעה לשרת (נפל החיבור) */
    var pending = null;
    try { pending = JSON.parse(localStorage.getItem(draftKey(Q)) || 'null'); } catch (e) {}
    if (pending) {
      var d = (V.secs[secId] = V.secs[secId] || { data: {}, status: 'started' }).data;
      Object.keys(pending).forEach(function (k) { d[k] = pending[k]; });
      Q.patch = Object.assign(pending, Q.patch);
    }
    var h = '<a class="crumb" href="' + (V.caps.full ? '#v/' + v.id + '/fill' : '#') + '">→ ' + (V.caps.full ? 'כל התחומים' : 'התחומים שלי') + '</a>' +
      '<div class="head stephead"><h1>' + esc(sec.title) + '</h1><p>' + esc(v.school) + ' · בלי שמות תלמידים</p></div>';
    h += prevLine(secId) + tuvaBox(secId);
    h += '<form class="card" id="sf" onsubmit="return false">' + sec.fields.map(function (f) { return fieldHtml(sec, f); }).join('') + fileHtml(IMG_FIELD, secId) + '</form>';
    var isDone = secStatus(secId) === 'done';
    h += stepBar(isDone ? '<a class="btn small primary" id="sEnd" href="' + nextSecHash(secId) + '">' + (nextSec(secId) ? 'לתחום הבא ←' : 'לכל התחומים ←') + '</a>' : '<button type="button" class="btn small primary" id="doneBtn">סיימתי את התחום</button>', '<span class="saved" id="saved">הכול נשמר אוטומטית</span>');
    if (isDone) h += '<button type="button" class="link" id="doneBtn">לפתוח שוב לעריכה</button>';
    shell(h);
    var form = $('#sf');
    wirePrev(secId);
    var steps = stepper(form, v.id + '|' + secId, $(isDone ? '#sEnd' : '#doneBtn'));
    function fieldOf(el) {
      if (el.hasAttribute('data-f')) return el.getAttribute('data-f');
      var w = el.closest('[data-plan]'); if (w) return w.getAttribute('data-plan');
      w = el.closest('[data-repeat]'); if (w) return w.getAttribute('data-repeat');
      w = el.closest('[data-table]'); return w ? w.getAttribute('data-table') : null;
    }
    function changed(el) {
      var k = fieldOf(el);
      if (!k) return;
      var f = sec.fields.filter(function (x) { return x.k === k; })[0];
      if (!f) return;
      var tag = $('[data-src="' + k + '"]', form);
      if (tag) tag.parentNode.removeChild(tag);
      queue(k, readField(form, f));
    }
    form.addEventListener('input', function (e) {
      if (e.target.hasAttribute('data-num')) e.target.value = e.target.value.replace(/[^\d.]/g, '');
      changed(e.target);
    });
    form.addEventListener('change', function (e) {
      if (e.target.type === 'file') return;
      changed(e.target);
    });
    form.addEventListener('click', function (e) {
      var t = e.target, k;
      if ((k = t.getAttribute('data-addrow'))) {
        var f = fieldDef(sec, k), tbl = $('[data-table="' + k + '"] tbody', form);
        tbl.insertAdjacentHTML('beforeend', tableRow(f, null, tbl.children.length));
        steps.rebuild(tbl.lastElementChild);
      } else if (t.hasAttribute('data-delrow')) {
        var tb = t.closest('[data-table]');
        t.closest('tr').parentNode.removeChild(t.closest('tr'));
        changed(tb);
        steps.rebuild();
      } else if ((k = t.getAttribute('data-addrep'))) {
        var rf = fieldDef(sec, k), wrap = $('[data-repeat="' + k + '"]', form);
        wrap.insertAdjacentHTML('beforeend', repeatItem(rf, {}, wrap.children.length).replace('<details class="block" ', '<details class="block" open '));
        steps.rebuild(wrap.lastElementChild);
      } else if (t.hasAttribute('data-delrep')) {
        var w = t.closest('[data-repeat]');
        if (confirm('למחוק את כל מה שנכתב ב' + 'פריט הזה?')) { t.closest('[data-item]').parentNode.removeChild(t.closest('[data-item]')); changed(w); steps.rebuild(); }
      } else if (t.getAttribute('data-file')) fileOpen(t.getAttribute('data-file'));
      else if (t.getAttribute('data-filedel')) fileDel(t.getAttribute('data-filedel'), secId);
    });
    $$('[data-up]', form).forEach(function (inp) {
      inp.onchange = function () { upload(inp, secId); };
    });
    $('#doneBtn').onclick = function () {
      var b = this, wasDone = secStatus(secId) === 'done';
      b.disabled = true;
      /* מי שסיים/ה אישר/ה גם את מה שהיה מוכן מראש: נשמר כמו שמוצג */
      var fill = {};
      if (!wasDone) $$('[data-src]', form).forEach(function (t) {
        var k = t.getAttribute('data-src');
        fill[k] = readField(form, fieldDef(sec, k));
      });
      flush().then(function () {
        /* fill: השרת שומר רק שדה שעדיין ריק אצלו, כדי לא לדרוס עריכה ממכשיר אחר */
        return api('save', { id: v.id, sec: secId, patch: {}, fill: fill, done: !wasDone });
      }).then(function (r) {
        b.disabled = false;
        if (!r.ok) return toast(errText(r.error));
        V.secs[secId] = V.secs[secId] || { data: {} };
        V.secs[secId].status = r.status;
        if (r.data) V.secs[secId].data = r.data;
        S.board = null;
        toast(wasDone ? 'התחום נפתח לעריכה' : 'התחום סומן כהושלם. תודה!');
        if (!wasDone) delete STEP_AT[v.id + '|' + secId];
        go(wasDone ? '#v/' + v.id + '/e/' + secId : BACK && BACK.to === location.hash ? BACK.from : nextSecHash(secId));
      }).catch(function () {});
    };
    if (pending) { setSaved('שומר טיוטה שלא נשמרה…'); flush(); }
  }
  function fieldDef(sec, k) {
    var f = sec.fields.filter(function (x) { return x.k === k; })[0];
    if (f) return f;
    var m = /^(.+)__(\d)$/.exec(k);
    return { k: k, add: true, cols: [{ l: 'פעולות מרכזיות' }, { l: 'משאבים / תכניות / מענים / יוזמות' }, { l: 'מדדי הצלחה (איך נדע שהשגנו את היעד)' }], _m: m };
  }

  /* ===== מהוועדה הקודמת ===== */
  function prevList(secId) { return S.V.prev.tasks.filter(function (t) { return t.sec === secId; }); }
  function prevBox(secId) {
    var list = prevList(secId);
    if (!list.length) return '';
    var isDraft = list.some(function (t) { return t.draft === 'כן'; });
    return '<section class="prevbox" id="prevbox"><h2>מה סיכמנו ב' + esc(S.V.prev.label) + '</h2><p>' +
      (isDraft ? 'המשימות נלקחו מהתקציר של המסמך, ולכן הן טיוטה: מאשרים, מתקנים או מוחקים. ' : '') + 'לכל משימה: מה קרה איתה, מה למדנו, והאם ממשיכים.</p>' +
      list.map(prevTask).join('') + '</section>';
  }
  /* החלטה שכבר נענתה לא מבקשת תשובה שוב: רק תזכורת שקטה שאפשר לפתוח (מיטל, 5.11.26) */
  function prevLine(secId) {
    var list = prevList(secId), n = list.length;
    if (!n || !S.V.caps.full) return '';
    var open = list.filter(function (t) { return !t.refStatus; }).length;
    if (!open) return '<a class="card prevline done" href="#v/' + S.V.v.id + '/prev"><b>' + (n === 1 ? 'ההחלטה מהוועדה הקודמת בתחום הזה נענתה' : 'ההחלטות מהוועדה הקודמת בתחום הזה נענו') + '</b><span>לצפייה</span></a>';
    return '<a class="card prevline" href="#v/' + S.V.v.id + '/prev"><b>' + count(open, 'החלטה אחת', 'החלטות') + ' מהוועדה הקודמת בתחום הזה עוד בלי תשובה</b><span>מה קרה איתן</span></a>';
  }
  /* על מה שקרה בוועדה הקודמת עונה המנהל.ת */
  function canReflect() { return S.V.v.status !== 'closed' && S.V.caps.manage; }

  /* ===== ועדת תשפ"ו: החלטות, פערים, מה קרה איתם, והמסמך ===== */
  function prevCountHtml() {
    var P = S.V.prev, total = P.tasks.length + P.recs.length, done = P.tasks.filter(function (t) { return t.refStatus; }).length + P.recs.filter(function (r) { return r.ref; }).length;
    return '<b>נענו ' + done + ' מתוך ' + total + '</b><div class="bar"><i style="width:' + (total ? Math.round(done / total * 100) : 0) + '%"></i></div>';
  }
  function drawPrevCount() { var el = $('#prevCount'); if (el) el.innerHTML = prevCountHtml(); }
  /* המנהל.ת עונה על פריט אחד בכל פעם: סיים, מגיע הבא. בלי גלילה ארוכה (מיטל, 5.11.26). מי שרק קורא רואה רשימה */
  function viewPrevPage() {
    var V = S.V, P = V.prev, can = canReflect();
    var secTitle = function (id) { var d = VAADA.section('a', id); return d ? d.title : ''; };
    var items = P.tasks.map(function (t) { return { id: t.id, kind: 't', t: t }; }).concat(P.recs.map(function (r) { return { id: r.id, kind: 'r', r: r }; }));
    var answered = function (it) {
      if (it.kind === 't') { var x = P.tasks.filter(function (q) { return q.id === it.id; })[0]; return !!(x && x.refStatus); }
      var y = P.recs.filter(function (q) { return q.id === it.id; })[0]; return !!(y && y.ref);
    };
    var textOf = function (it) { return it.kind === 't' ? it.t.text : it.r.text; };
    var cardOf = function (it) {
      if (it.kind === 't') return '<div class="rs ptsec">החלטה' + (it.t.sec ? ' · ' + esc(secTitle(it.t.sec)) : '') + '</div>' + prevTask(it.t);
      var r = it.r;
      return '<div class="rs ptsec">פער שזוהה</div><div class="card" data-rec="' + esc(r.id) + '"><div class="ttxt"><b>' + esc(r.text) + '</b>' + (r.draft === 'כן' ? '<span class="draftnote">טיוטה</span>' : '') + '</div>' +
        (can ? '<label class="f" style="margin:8px 0 4px"><span class="lbl">מה קרה?</span><textarea data-ref>' + esc(r.ref) + '</textarea></label><span class="rs" data-refsaved></span>' +
          (r.draft === 'כן' ? '<div class="acts" style="margin-top:4px"><button type="button" class="link danger" data-rdel>מחיקה</button></div>' : '')
          : (r.ref ? '<div class="val" style="margin-top:6px"><b>מה קרה:</b> ' + esc(r.ref) + '</div>' : '<div class="rs" style="margin-top:6px">טרם נענה.</div>')) + '</div>';
    };
    var back = focusOn() ? '#v/' + V.v.id + '/fill' : '#s/' + V.v.semel;
    var h = '<a class="crumb" href="' + back + '">→ ' + (focusOn() ? 'מילוי מצגת האב' : esc(V.v.school)) + '</a><div class="head"><h1>ועדת תשפ"ו</h1><p>' + (can ? 'מה קרה עם מה שסוכם.' : 'עונה המנהל.ת.') + ' התשובות נכנסות למצגת של ועדת ' + esc(VAADA.YEAR) + '.</p></div>';
    if (!items.length) h += '<div class="card empty">אין במערכת החלטות מהוועדה הקודמת.</div>';
    else h += '<div class="card summary" id="prevCount">' + prevCountHtml() + '</div>';
    h += '<section id="prevbox" class="prevp">' + items.map(function (it, i) { return '<div class="pitem" data-pi="' + i + '"' + (can ? ' hidden' : '') + '>' + cardOf(it) + '</div>'; }).join('') + '</section>';
    if (can && items.length) {
      h += '<div class="pnav" id="pnav"><button type="button" class="btn" id="pPrev">→ הקודם</button><span id="pPos" class="rs"></span><button type="button" class="btn primary" id="pNext">הבא ←</button></div>' +
        '<div class="card pdone" id="pDone" hidden><h2 id="pDoneT"></h2><div class="acts"><a class="btn primary" href="' + (focusOn() ? back + '">חזרה למילוי מצגת האב' : back + '">חזרה לבית הספר') + '</a><button type="button" class="btn" id="pAgain">חזרה לפריטים</button></div></div>' +
        '<details class="card pall" id="pAll"><summary><b>כל הפריטים</b></summary><div id="pRows"></div></details>';
    }
    h += '<details class="card"><summary><b>המסמכים</b></summary><div id="pastBody" style="margin-top:8px"><div class="loading">טוען…</div></div></details>';
    shell(h);
    wirePrev();
    if (can && items.length) {
      var cur = 0;
      var first = 0;
      while (first < items.length && answered(items[first])) first++;
      cur = first < items.length ? first : 0;
      if (viewPrevPage.at !== undefined && viewPrevPage.at < items.length) cur = viewPrevPage.at;
      viewPrevPage.at = undefined;
      var rows = function () {
        $('#pRows').innerHTML = items.map(function (it, i) { return '<button type="button" class="prow" data-jump="' + i + '" data-jump-id="' + esc(it.id) + '"' + (i === cur ? ' aria-current="true"' : '') + '><span class="pmark' + (answered(it) ? ' on' : '') + '">' + (answered(it) ? '✓' : '') + '</span><span>' + esc(textOf(it)) + '</span></button>'; }).join('');
        $$('[data-jump]').forEach(function (b) { b.onclick = function () { show(Number(b.getAttribute('data-jump'))); $('#pAll').open = false; }; });
      };
      var show = function (i) {
        cur = i;
        $('#pDone').hidden = true; $('#pnav').hidden = false; $('#prevbox').hidden = false;
        $$('.pitem').forEach(function (x) { x.hidden = Number(x.getAttribute('data-pi')) !== i; });
        $('#pPos').textContent = (i + 1) + ' מתוך ' + items.length;
        $('#pPrev').disabled = i === 0;
        $('#pNext').textContent = i === items.length - 1 ? 'סיום' : 'הבא ←';
        rows(); window.scrollTo(0, 0);
      };
      $('#pPrev').onclick = function () { flushRef(); if (cur > 0) show(cur - 1); };
      $('#pNext').onclick = function () {
        flushRef();
        if (cur < items.length - 1) return show(cur + 1);
        var open = items.filter(function (it) { return !answered(it); }).length;
        $('#pDoneT').textContent = open ? 'נשארו ' + count(open, 'פריט אחד', 'פריטים') + ' בלי תשובה' : 'כל הפריטים נענו. תודה!';
        $('#pDone').hidden = false; $('#pnav').hidden = true; $('#prevbox').hidden = true; window.scrollTo(0, 0);
      };
      $('#pAgain').onclick = function () { show(0); };
      var flushRef = function () { var a = document.activeElement; if (a && a.blur && a.tagName === 'TEXTAREA') a.blur(); };
      show(cur);
    }
    if (can) $$('[data-rec]').forEach(function (card) {
      var id = card.getAttribute('data-rec'), ta = $('[data-ref]', card), del = $('[data-rdel]', card);
      ta.onchange = function () {
        var sv = $('[data-refsaved]', card); sv.textContent = 'שומר…';
        api('recRef', { id: V.v.id, recId: id, ref: ta.value }).then(function (r) {
          if (!r.ok) { sv.textContent = errText(r.error); return; }
          P.recs = P.recs.map(function (x) { return x.id === id ? r.rec : x; });
          sv.textContent = 'נשמר'; drawPrevCount();
          var dn = $('.draftnote', card); if (dn) dn.remove();
          if (del) { del.parentNode.removeChild(del); del = null; }
        }).catch(function () {});
      };
      if (del) del.onclick = function () {
        if (!confirm('למחוק את הפריט הזה?')) return;
        api('recDel', { id: V.v.id, recId: id }).then(function (r) {
          if (!r.ok) return toast(errText(r.error));
          P.recs = P.recs.filter(function (x) { return x.id !== id; });
          viewPrevPage.at = Number(card.closest('[data-pi]').getAttribute('data-pi'));
          viewPrevPage();
        }).catch(function () {});
      };
    });
    pastList(V.v.semel).then(function (html) {
      var b = $('#pastBody');
      if (b) { b.innerHTML = html; wirePast(); }
    });
  }
  function prevTask(t) {
    var can = canReflect(), id = esc(t.id), h = '<div class="ptask" data-pt="' + id + '">';
    h += '<div class="ttxt">' + esc(t.text) + (t.draft === 'כן' ? '<span class="draftnote">טיוטה</span>' : '') + '</div>' + (t.owner ? '<div class="town">אחריות: ' + esc(t.owner) + '</div>' : '') + (t.st ? '<div class="town">סומן במהלך השנה: ' + esc(t.st) + (t.stNote ? ' · ' + esc(t.stNote) : '') + '</div>' : '');
    if (!can) return h + (t.refStatus ? '<div><b>' + esc(t.refStatus) + '</b></div>' : '') + (t.refNote ? '<div class="val">' + esc(t.refNote) + '</div>' : '') + '</div>';
    h += '<div class="statuses" role="group" aria-label="סטטוס">' + VAADA.STATUSES.map(function (s) { return '<button type="button" data-st="' + esc(s) + '" aria-pressed="' + (t.refStatus === s) + '">' + esc(s) + '</button>'; }).join('') + '</div>';
    h += '<label class="f" style="margin-bottom:8px"><span class="lbl" style="font-size:.92rem">מה קרה ומה למדנו?</span><textarea rows="2" style="min-height:60px" data-rn>' + esc(t.refNote) + '</textarea></label>';
    h += '<div class="acts" style="margin-top:0"><span class="lbl" style="margin:0;font-size:.92rem">ממשיכים לשנה הזו?</span><div class="statuses" style="margin:0">' +
      ['כן', 'לא'].map(function (x) { return '<button type="button" data-cont="' + x + '" aria-pressed="' + (t.refCont === x) + '">' + x + '</button>'; }).join('') + '</div>';
    if (t.draft === 'כן') h += '<button type="button" class="link" data-tedit>תיקון הנוסח</button>' + (S.V.caps.manage ? '<button type="button" class="link danger" data-tdel>מחיקה</button>' : '');
    return h + '</div></div>';
  }
  function wirePrev(secId) {
    var box = $('#prevbox');
    if (!box) return;
    function send(el, data) {
      var wrap = el.closest('[data-pt]'), id = wrap.getAttribute('data-pt');
      return api('reflect', Object.assign({ id: S.V.v.id, taskId: id }, data)).then(function (r) {
        if (!r.ok) { toast(errText(r.error)); return null; }
        S.V.prev.tasks = S.V.prev.tasks.map(function (t) { return t.id === id ? r.task : t; });
        S.V.tasks = S.V.tasks.filter(function (t) { return t.from !== id; });
        if (r.carried) S.V.tasks.push(r.carried);
        drawPrevCount();
        return r;
      }).catch(function () { return null; });
    }
    box.addEventListener('click', function (e) {
      var t = e.target, wrap = t.closest('[data-pt]');
      if (!wrap) return;
      if (t.hasAttribute('data-st')) {
        var was = t.getAttribute('aria-pressed') === 'true', v = was ? '' : t.getAttribute('data-st');
        $$('[data-st]', wrap).forEach(function (b) { b.setAttribute('aria-pressed', String(!was && b === t)); });
        send(t, { status: v }).then(function (r) { if (r) { var dn = $('.draftnote', wrap); if (dn) dn.remove(); } });
      } else if (t.hasAttribute('data-cont')) {
        var w2 = t.getAttribute('aria-pressed') === 'true', c = w2 ? '' : t.getAttribute('data-cont');
        $$('[data-cont]', wrap).forEach(function (b) { b.setAttribute('aria-pressed', String(!w2 && b === t)); });
        send(t, { cont: c }).then(function (r) { if (r && c === 'כן') toast('המשימה נכנסה להחלטות של הוועדה הזו'); });
      } else if (t.hasAttribute('data-tedit')) {
        var txt = $('.ttxt', wrap), cur = S.V.prev.tasks.filter(function (x) { return x.id === wrap.getAttribute('data-pt'); })[0];
        var val = prompt('נוסח המשימה', cur.text);
        if (val && val.trim()) send(t, { text: val }).then(function (r) { if (r) txt.textContent = r.task.text; });
      } else if (t.hasAttribute('data-tdel')) {
        if (!confirm('למחוק את הטיוטה הזו? היא נלקחה מהתקציר.')) return;
        api('taskDel', { id: S.V.v.id, taskId: wrap.getAttribute('data-pt') }).then(function (r) {
          if (!r.ok) return toast(errText(r.error));
          S.V.prev.tasks = S.V.prev.tasks.filter(function (x) { return x.id !== wrap.getAttribute('data-pt'); });
          if ($('#pnav')) { viewPrevPage.at = Number(wrap.closest('[data-pi]').getAttribute('data-pi')); viewPrevPage(); return; }
          wrap.parentNode.removeChild(wrap);
        }).catch(function () {});
      }
    });
    box.addEventListener('change', function (e) {
      if (e.target.hasAttribute('data-rn')) send(e.target, { note: e.target.value });
    });
  }

  /* ===== קבצים ===== */
  function upload(inp, secId) {
    var file = inp.files[0];
    if (!file) return;
    var field = inp.getAttribute('data-up'), r = new FileReader();
    if (field === IMG_FIELD.k) {
      inp.value = '';
      if (!isImg(file)) return toast('אפשר להוסיף תמונה מסוג PNG או JPG בלבד.');
      if (file.size > IMG_MB * 1024 * 1024) return toast('התמונה גדולה מ-' + IMG_MB + 'MB. אפשר להקטין אותה ולנסות שוב.');
      if (S.V.files.filter(isImg).length >= IMG_MAX) return toast(ERR.toomany);
    } else if (file.size > 8 * 1024 * 1024) return toast(ERR.toolarge);
    setSaved('מעלה קובץ…');
    r.onload = function () {
      api('upload', { id: S.V.v.id, sec: secId, field: field, name: file.name, mime: file.type, b64: String(r.result).split(',')[1] }).then(function (x) {
        if (!x.ok) { setSaved('הקובץ לא עלה: ' + errText(x.error), true); return; }
        S.V.files.push(x.file);
        var block = $('[data-fileblock="' + field + '"]');
        block.querySelector('label').insertAdjacentHTML('beforebegin', filesList([x.file], true));
        setSaved('הקובץ עלה');
        inp.value = '';
      }).catch(function () {});
    };
    r.readAsDataURL(file);
  }
  function fileOpen(id) {
    toast('מכין את הקובץ…');
    api('file', { fileId: id }).then(function (r) {
      if (!r.ok) return toast(errText(r.error));
      saveB64(r);
    }).catch(function () {});
  }
  function saveB64(r) {
    var bin = atob(r.b64), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    var url = URL.createObjectURL(new Blob([arr], { type: r.mime || 'application/octet-stream' }));
    var a = document.createElement('a');
    a.href = url; a.download = r.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  function fileDel(id, secId) {
    if (!confirm('למחוק את הקובץ?')) return;
    api('fileDel', { fileId: id }).then(function (r) {
      if (!r.ok) return toast(errText(r.error));
      S.V.files = S.V.files.filter(function (f) { return f.id !== id; });
      withVaada.keep = true; route();
    }).catch(function () {});
  }

  /* ===== תצוגה לקריאה ===== */
  function noneVal() { return '<span class="none">לא מולא</span>'; }
  function roTable(f, val) {
    var rows = f.rows ? f.rows.map(function (l, i) { return { l: l, c: (val && val[i]) || [] }; }) : (val || []).map(function (c) { return { c: c }; });
    if (!rows.some(function (r) { return r.c.some(Boolean); })) return noneVal();
    var h = '<div class="tblw"><table class="grid"><thead><tr>' + (f.rows ? '<th></th>' : '') + f.cols.map(function (c) { return '<th>' + esc(c.l) + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr>' + (f.rows ? '<td class="rowlbl">' + esc(r.l) + '</td>' : '') + f.cols.map(function (c, i) { return '<td data-l="' + esc(c.l) + '" class="val">' + (r.c[i] ? esc(r.c[i]) : '') + '</td>'; }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function roField(sec, f) {
    var val = initial(sec.id, f), h = '<div class="f"><span class="lbl">' + esc(f.l) + srcTag(sec.id, f) + '</span>';
    if (f.t === 'table') h += roTable(f, val);
    else if (f.t === 'file') {
      var list = S.V.files.filter(function (x) { return x.sec === sec.id && x.field === f.k; });
      h += list.length ? filesList(list, false) : noneVal();
    } else if (f.t === 'plan') {
      var p = val || {};
      h += '<div><b>הגאווה:</b> <span class="val">' + (p.pride ? esc(p.pride) : noneVal()) + '</span></div><div><b>אתגרים:</b> <span class="val">' + (p.chal ? esc(p.chal) : noneVal()) + '</span></div>';
      (p.goals || []).forEach(function (g, i) {
        if (!g.g && !(g.rows || []).length) return;
        h += '<div class="block" style="margin-top:9px"><h3>יעד ' + (i + 1) + ': ' + esc(g.g) + '</h3>' + roTable({ cols: [{ l: 'פעולות מרכזיות' }, { l: 'משאבים' }, { l: 'מדדי הצלחה' }] }, g.rows) + '</div>';
      });
    } else if (f.t === 'repeat') {
      (val || []).forEach(function (it) {
        h += '<details class="block"><summary><b>' + esc(it.name || 'מגמה') + '</b></summary>' + f.fields.map(function (x) { return it[x.k] && x.k !== 'name' ? '<div style="margin-top:7px"><b>' + esc(x.l) + ':</b> <span class="val">' + esc(it[x.k]) + '</span></div>' : ''; }).join('') + '</details>';
      });
      if (!(val || []).length) h += noneVal();
    } else h += '<div class="val">' + (val ? esc(val) : noneVal()) + '</div>';
    return h + '</div>';
  }
  function viewRead(secId) {
    var V = S.V, sec = VAADA.section(V.v.stage, secId);
    var h = '<a class="crumb" href="' + (V.caps.full ? '#v/' + V.v.id + '/fill' : '#') + '">→ כל התחומים</a><div class="head"><h1>' + esc(sec.title) + '</h1><p>' + esc(V.v.school) + '</p></div>' + prevLine(secId) +
      '<div class="card ro">' + sec.fields.map(function (f) { return roField(sec, f); }).join('') + '</div>';
    shell(h);
    wirePrev(secId);
    $$('[data-file]').forEach(function (b) { b.onclick = function () { fileOpen(b.getAttribute('data-file')); }; });
  }

  /* ===== מצגת הוועדה: בחירה ===== */
  function collectSlides(all) {
    var V = S.V;
    return VAADA_DECK[all ? 'collect' : 'agenda']({
      V: V, initial: initial, sections: secs(), doms: VAADA.DOMS, sectionOf: function (id) { return VAADA.section(V.v.stage, id); },
      images: V.files.filter(function (f) { return /^image\/(png|jpe?g|gif)/.test(f.mime || ''); }).map(function (f) { return { id: f.id, sec: f.sec, field: f.field, name: f.name }; })
    });
  }
  function viewDeck() {
    var V = S.V, out = collectSlides(true);
    var nSt = realStations(V);
    var hint = nSt ? '' : '<div class="card">עוד לא נבחרו תחנות, ולכן השקפים הנבחרים יכללו רק פתיחה, נתונים וסיכום. <a href="#v/' + V.v.id + '/prep">בחירת תחנות</a></div>';
    var miss = out.missing.length ? '<details class="card"><summary><b>' + (out.missing.length === 1 ? 'תחום אחד עוד לא מולא ולא ייכנס' : out.missing.length + ' תחומים עוד לא מולאו ולא ייכנסו') + '</b></summary><div class="val" style="margin-top:8px">' + esc(out.missing.join('\n')) + '</div></details>' : '';
    shell(vHead() + hint + miss + '<div class="tiles">' +
      '<a class="tile big" href="#v/' + V.v.id + '/live/0"><b>שקפים נבחרים</b><span>מה שמציגים בוועדה: הצלחות, נתונים, התחנות, היוועצות וסיכום. לצד כל שקף רושמים הערות והחלטות.</span></a>' +
      '<a class="tile big" href="#v/' + V.v.id + '/all/0"><b>מצגת אב</b><span>כל מה שמולא. המפקחים רואים אותה כאן כשבועיים לפני הוועדה, לרקע ולא להצגה.</span></a></div>' +
      '<p class="rs">בכל שקף אפשר ללחוץ "עריכה", לתקן בטופס של התחום ולחזור לשקף המעודכן.</p>');
  }

  /* ===== הצגה דיגיטלית: שקף, ולצידו הערות והחלטות של התחום ===== */
  /* לאן "עריכה" בשקף: הטופס של התחום, ההכנה (תחנות והיוועצות) או ההמלצות. רק למי שמותר לערוך שם */
  function editHref(sl) {
    var V = S.V, id = V.v.id, e = sl.edit;
    if (!e) return '';
    if (e === 'prep') return V.caps.prepEdit ? '#v/' + id + '/prep' : '';
    if (e === 'recs') return V.caps.rec ? '#v/' + id + '/recs' : '';
    return VAADA.section(V.v.stage, e) && V.caps.edit.indexOf(e) > -1 ? '#v/' + id + '/e/' + e : '';
  }
  var SIDE_HIDE = false;
  function fsOn() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  /* במסך מלא הדף נראה כמו מצגת: בלי הכותרת, התפריט והשלבים. הכפתור מתעדכן גם כשיוצאים ב-Esc */
  function fsSync() {
    document.body.classList.toggle('present', fsOn());
    var b = $('#fsBtn');
    if (b) b.textContent = fsOn() ? 'יציאה ממסך מלא' : 'מסך מלא';
  }
  document.addEventListener('fullscreenchange', fsSync);
  document.addEventListener('webkitfullscreenchange', fsSync);
  function viewLive(n, all) {
    var V = S.V, v = V.v, out = collectSlides(all), slides = out.slides, base = '#v/' + v.id + (all ? '/all/' : '/live/');
    n = Math.max(0, Math.min(n, slides.length - 1));
    var sl = slides[n], secId = sl.sec, edit = editHref(sl);
    BACK = null;
    var prevN = n > 0 ? '<a class="btn small" href="' + base + (n - 1) + '" id="sPrev">→ הקודם</a>' : '';
    var nextN = n < slides.length - 1 ? '<a class="btn small" href="' + base + (n + 1) + '" id="sNext">הבא ←</a>' : (focusOn() ? '<a class="btn small primary" href="#v/' + v.id + '/deck">חזרה למצגת</a>' : '<a class="btn small primary" href="#v/' + v.id + '/sign">לפרוטוקול ←</a>');
    var side = secId ? '<aside class="lside" id="lside">' + notesCard() + decideCard() + (prevList(secId).length ? '<details class="card" style="margin:0"><summary><b>מה סיכמנו בפעם הקודמת</b></summary>' + prevBox(secId) + '</details>' : '') + '</aside>' : '';
    shell(vHead() + '<div class="lnav">' + prevN + '<select id="lsel" aria-label="מעבר לשקף">' + slides.map(function (s, i) { return '<option value="' + i + '"' + (i === n ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(s.cover ? 'פתיחה' : s.title) + '</option>'; }).join('') + '</select>' + nextN +
      (edit ? '<a class="btn small" href="' + edit + '" id="editBtn">עריכה</a>' : '') +
      (side ? '<button type="button" class="btn small" id="sideBtn" aria-pressed="' + !SIDE_HIDE + '">' + (SIDE_HIDE ? 'הצגת הרישום' : 'הסתרת הרישום') + '</button>' : '') +
      '<button type="button" class="btn small" id="fsBtn">' + (fsOn() ? 'יציאה ממסך מלא' : 'מסך מלא') + '</button></div>' +
      '<div class="live' + (secId && !SIDE_HIDE ? '' : ' solo') + '"><div class="lmain"><div class="slidewrap" id="slidewrap"><div class="slide' + (sl.cover ? ' is-cover' : '') + '">' + VAADA_DECK.toHtml(sl, { n: n + 1, of: slides.length, kind: all ? 'מצגת אב' : 'שקפים נבחרים' }) + '</div></div></div>' + side + '</div>');
    $('#lsel').onchange = function () { go(base + this.value); };
    if (edit) $('#editBtn').onclick = function () { BACK = { to: edit, from: base + n }; };
    /* מסך מלא על כל הדף ולא על השקף בלבד: המעבר בין שקפים לא מוציא ממנו, והניווט והרישום נשארים (מיטל, 7.11.26) */
    $('#fsBtn').onclick = function () {
      var d = document, el = d.documentElement;
      if (fsOn()) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    };
    if (side) $('#sideBtn').onclick = function () {
      SIDE_HIDE = !SIDE_HIDE;
      $('.live').classList.toggle('solo', SIDE_HIDE);
      this.textContent = SIDE_HIDE ? 'הצגת הרישום' : 'הסתרת הרישום';
      this.setAttribute('aria-pressed', String(!SIDE_HIDE));
    };
    document.onkeydown = function (e) {
      if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
      if (e.key === 'ArrowLeft' && n < slides.length - 1) go(base + (n + 1));
      if (e.key === 'ArrowRight' && n > 0) go(base + (n - 1));
    };
    $$('[data-img]').forEach(function (img) {
      api('file', { fileId: img.getAttribute('data-img') }).then(function (r) { if (r.ok) img.src = 'data:' + r.mime + ';base64,' + r.b64; }).catch(function () {});
    });
    if (!secId) return;
    wirePrev(secId);
    drawNotes(secId); drawDecisions(secId);
    wireLive(secId);
    /* הערות והחלטות של האחרים מגיעות תוך חצי דקה */
    var mine = ++liveId;
    (function tick() {
      pollT = setTimeout(function () {
        if (mine !== liveId) return;
        api('live', { id: v.id }).then(function (r) {
          if (mine !== liveId || !r.ok) return;
          V.notes = r.notes; V.tasks = r.tasks;
          drawNotes(secId);
          /* לא לצייר מחדש רשימה בזמן עריכת החלטה */
          if (!$('#tform') || !$('#tform').contains(document.activeElement)) drawDecisions(secId);
          tick();
        }).catch(function () {});
      }, 30000);
    })();
  }

  /* ===== המלצות המפקח.ת ===== */
  function viewRecs() {
    var V = S.V, can = V.caps.rec;
    var h = vHead();
    h += '<div id="recList">' + V.recs.map(recLine).join('') + '</div>';
    if (!V.recs.length && !can) h += '<div class="card empty">עדיין אין המלצות.</div>';
    if (can) h += '<form class="card" id="recForm"><label class="f" style="margin-bottom:8px"><b>המלצה חדשה</b><textarea id="recText"></textarea></label><button class="btn small primary">הוספה</button></form>';
    else if (V.v.status !== 'closed') h += '<p class="rs">ההמלצות נכתבות על ידי המפקח.ת הפדגוגי.ת.</p>';
    shell(h);
    if (!can) return;
    $('#recForm').onsubmit = function (e) {
      e.preventDefault();
      var t = $('#recText').value.trim();
      if (!t) return;
      api('recSave', { id: V.v.id, text: t }).then(function (r) {
        if (!r.ok) return toast(errText(r.error));
        V.recs.push(r.rec); $('#recText').value = ''; $('#recList').innerHTML = V.recs.map(recLine).join(''); wireRecDel();
      }).catch(function () {});
    };
    wireRecDel();
    function wireRecDel() {
      $$('[data-rnew]').forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-rnew');
          if (!confirm('למחוק את ההמלצה?')) return;
          api('recDel', { id: V.v.id, recId: id }).then(function (r) {
            if (!r.ok) return toast(errText(r.error));
            V.recs = V.recs.filter(function (x) { return x.id !== id; }); $('#recList').innerHTML = V.recs.map(recLine).join(''); wireRecDel();
          }).catch(function () {});
        };
      });
    }
  }
  function recLine(r) {
    return '<div class="task"><b>' + esc(r.text) + '</b><small>' + esc(r.by) + ' · ' + fmtAt(r.at) + '</small>' + (S.V.caps.rec ? '<button type="button" class="link danger" data-rnew="' + esc(r.id) + '">מחיקה</button>' : '') + '</div>';
  }

  /* ===== משימות מהוועדה: הסטטוס מתעדכן לאורך השנה, גם אחרי שהוועדה נסגרה ===== */
  function viewTasks() {
    var V = S.V;
    function canT(t) { return V.caps.taskSt || (t.party === 'פיקוח' && V.caps.supOf); }
    var done = V.tasks.filter(function (t) { return t.st === 'עמידה בתכנון' || t.st === 'בוטל'; }).length;
    var pct = V.tasks.length ? Math.round(done / V.tasks.length * 100) : 0;
    var h = vHead();
    if (!V.tasks.length) h += '<div class="card empty">עדיין אין משימות. הן נוצרות מההחלטות בזמן ההצגה הדיגיטלית של הוועדה.</div>';
    else h += '<div class="card summary"><b>בוצעו ' + done + ' מתוך ' + V.tasks.length + ' משימות</b><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    VAADA.DOMS.forEach(function (d) {
      var ts = V.tasks.filter(function (t) { return domOfSec(t.sec) === d[0]; });
      if (!ts.length) return;
      h += '<div class="grp">' + esc(d[1]) + '</div>' + ts.map(function (t) {
        return '<div class="card" data-tk="' + esc(t.id) + '"><b>' + esc(t.text) + '</b>' +
          (t.owner ? '<div class="rs">אחריות: ' + esc(t.owner) + '</div>' : '') + (t.measure ? '<div class="rs">מדד: ' + esc(t.measure) + '</div>' : '') + (t.follow ? '<div class="rs">מעקב: ' + fmtDate(t.follow) + '</div>' : '') +
          (t.party ? '<div class="rs">באחריות הפיקוח</div>' : '') +
          (canT(t) ? '<div class="statuses" role="group" aria-label="סטטוס">' + VAADA.STATUSES.map(function (s) { return '<button type="button" data-tst="' + esc(s) + '" aria-pressed="' + (t.st === s) + '">' + esc(s) + '</button>'; }).join('') + '</div><label class="f" style="margin:0"><span class="lbl" style="font-size:.92rem">הערה</span><textarea rows="1" style="min-height:48px" data-tnote>' + esc(t.stNote) + '</textarea></label>'
            : '<div style="margin-top:6px"><span class="tag' + (t.st ? ' info' : '') + '">' + esc(t.st || 'לא עודכן') + '</span>' + (t.stNote ? ' <span class="val">' + esc(t.stNote) + '</span>' : '') + '</div>') + '</div>';
      }).join('');
    });
    shell(h);
    $$('[data-tk]').forEach(function (card) {
      var id = card.getAttribute('data-tk');
      function save(data) {
        return api('taskStatus', Object.assign({ taskId: id }, data)).then(function (r) {
          if (!r.ok) { toast(errText(r.error)); return null; }
          V.tasks = V.tasks.map(function (t) { return t.id === id ? r.task : t; });
          return r;
        }).catch(function () { return null; });
      }
      $$('[data-tst]', card).forEach(function (b) {
        b.onclick = function () {
          var was = b.getAttribute('aria-pressed') === 'true';
          $$('[data-tst]', card).forEach(function (o) { o.setAttribute('aria-pressed', String(!was && o === b)); });
          save({ status: was ? '' : b.getAttribute('data-tst') });
        };
      });
      var n = $('[data-tnote]', card);
      if (n) n.onchange = function () { save({ note: n.value }); };
    });
  }

  /* ===== שמירה אוטומטית למסמכי ועדה ===== */
  function docAuto(kind, root, read) {
    var t = null, busy = false, again = false, last = null, el = $('[data-docsaved]', root);
    function say(s) { if (el) el.textContent = s; }
    function send() {
      if (busy) { again = true; return; }
      busy = true; say('שומר…');
      /* הערכים נקראים בזמן ההקלדה: אם עברו בינתיים לדף אחר, נשמר מה שהוקלד ולא דף אחר */
      var patch = last || read();
      last = null;
      S.V.docs[kind] = Object.assign(S.V.docs[kind] || {}, patch);
      api('docSave', { id: S.V.v.id, kind: kind, patch: patch }).then(function (r) {
        busy = false;
        say(r.ok ? 'נשמר ' + fmtAt(r.at).split(' ').pop() : 'לא נשמר: ' + errText(r.error));
        if (again) { again = false; send(); }
      }).catch(function () { busy = false; });
    }
    root.addEventListener('input', function () { last = read(); say('שומר…'); clearTimeout(t); t = setTimeout(send, 900); });
    root.addEventListener('change', function () { last = read(); clearTimeout(t); t = setTimeout(send, 300); });
    return send;
  }
  function fld(label, key, val, hint, area, dis) {
    return '<label class="f"><b>' + esc(label) + '</b>' + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + (area === false ? '<input type="text" data-d="' + key + '" value="' + esc(val) + '"' + (dis ? ' disabled' : '') + '>' : '<textarea data-d="' + key + '"' + (dis ? ' disabled' : '') + '>' + esc(val) + '</textarea>') + '</label>';
  }
  function helpBlock(kind, title) {
    return '<details class="card" id="helpBox" data-kind="' + kind + '"><summary><b>' + esc(title) + '</b></summary><div id="helpBody" class="rs" style="margin-top:8px">טוען…</div></details>';
  }
  function wireHelp() {
    var box = $('#helpBox');
    if (!box) return;
    box.addEventListener('toggle', function () {
      if (!box.open || box._done) return;
      box._done = true;
      api('help', { kind: box.getAttribute('data-kind') }).then(function (r) {
        $('#helpBody').className = '';
        $('#helpBody').innerHTML = r.ok ? helpHtml(r.doc) : esc(errText(r.error));
      }).catch(function () {});
    });
  }
  function helpHtml(doc) {
    return doc.map(function (x) {
      if (x.h) return '<h3 style="margin:14px 0 4px">' + esc(x.h) + '</h3>';
      if (x.p) return '<p style="margin:5px 0">' + esc(x.p) + '</p>';
      var head = x.t[0];
      return '<div class="tblw" style="margin:8px 0"><table class="grid"><thead><tr>' + head.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        x.t.slice(1).map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td data-l="' + esc(head[i] || '') + '">' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    }).join('');
  }

  /* ===== הכנה: תחנות וסוגיית ליבה (נייר יעקבזון). עורכים המנהל.ת והמפקח.ת הפדגוגי.ת ===== */
  var STATION_SECS = ['dualit', 'chanichut', 'hatmada', 'yeutz', 'chevrati', 'acher'];
  var STATION_HINT = ['חינוך יוצר', 'חניכות ותעסוקה', 'נוכחות ונשירה'];
  function viewPrepare() {
    var V = S.V, can = V.caps.prepEdit, P = V.docs.prep || {}, dis = !can;
    var stations = (P.stations && P.stations.length ? P.stations : [{}, {}, {}]).slice(0, 4);
    var iss = P.issue || {}, tests = iss.tests || [];
    var TESTS = ['יש נתון שמראה את הבעיה?', 'יש מחיר ממשי שבית הספר משלם היום?', 'הפתרון אינו ידוע מראש, והמנהל באמת מתלבט?', 'הסוגיה בהשפעת בית הספר, ולא רק בהשפעת גורם חיצוני?'];
    function stHtml(st, i) {
      var title = st.title || (P.stations ? '' : STATION_HINT[i] || '');
      var sec = st.sec !== undefined ? st.sec : (i === 0 ? 'dualit' : i === 1 ? 'chanichut' : i === 2 ? 'hatmada' : '');
      return '<details class="block" data-st ' + (i === 0 || st.need ? 'open' : '') + '><summary><b>תחנה ' + (i + 1) + (title ? ': ' + esc(title) : '') + '</b></summary><div style="margin-top:10px">' +
        '<label class="f"><b>שם התחנה</b><input type="text" data-s="title" value="' + esc(title) + '"' + (dis ? ' disabled' : '') + '></label>' +
        '<label class="f"><b>היעדים והפעולות נלקחים מהתחום</b><select data-s="sec"' + (dis ? ' disabled' : '') + '><option value="">בלי תחום</option>' + STATION_SECS.map(function (id) { var s = VAADA.section(V.v.stage, id); return '<option value="' + id + '"' + (sec === id ? ' selected' : '') + '>' + esc(s.title) + '</option>'; }).join('') + '</select></label>' +
        '<label class="f"><b>מוביל.ת התחנה</b><span class="hint">חברי הצוות מובילים את התחנות שבתחום אחריותם.</span><input type="text" data-s="lead" value="' + esc(st.lead) + '"' + (dis ? ' disabled' : '') + '></label>' +
        '<label class="f"><b>צורך</b><span class="hint">מה הנתונים אומרים עלינו, ומה הכי דוחק?</span><textarea data-s="need"' + (dis ? ' disabled' : '') + '>' + esc(st.need) + '</textarea></label>' +
        '<label class="f"><b>הנתון שעליו הצורך נשען</b><span class="hint">2–3 נתונים בולטים בהשוואה לשנים קודמות</span><textarea data-s="data"' + (dis ? ' disabled' : '') + '>' + esc(st.data) + '</textarea></label>' +
        '<label class="f"><b>משאבים מסל התוכניות</b><span class="hint">סל התוכניות, שעות, תקציב וכוח אדם, בתוך היעד. לא כטבלה חשבונאית.</span><textarea data-s="res"' + (dis ? ' disabled' : '') + '>' + esc(st.res) + '</textarea></label>' +
        '</div></details>';
    }
    var back = focusOn() ? '#v/' + V.v.id + '/fill' : '#v/' + V.v.id;
    var h = (can ? '<a class="crumb" href="' + back + '">→ ' + (focusOn() ? 'מילוי מצגת האב' : 'ראשי הוועדה') + '</a><div class="head stephead"><h1>' + (focusOn() ? 'בחירת תחנות' : 'הכנה') + '</h1><p>עד 3–4 תחנות, לעומק. כל מה שלא נבחר נשאר במצגת האב.</p></div>' : vHead() + '<div class="head"><h2>התחנות שנבחרו</h2><p>עד 3–4 תחנות, לעומק. כל מה שלא נבחר נשאר במצגת האב.</p></div>') +
      '<form id="prepForm" onsubmit="return false"><div id="stList">' + stations.map(stHtml).join('') + '</div>' +
      (can ? '<button type="button" class="link" id="addSt"' + (stations.length >= 4 ? ' hidden' : '') + '>+ הוספת תחנה</button>' : '') +
      '<div class="card" style="margin-top:14px"><h2 style="margin-bottom:8px">סוגיית הליבה לבמת ההיוועצות</h2>' +
      '<label class="f"><b>1. הנתונים והבעיה</b><span class="hint">מה קורה היום, על סמך אילו נתונים, ומה כבר ניסינו.</span><textarea data-i="data"' + (dis ? ' disabled' : '') + '>' + esc(iss.data) + '</textarea></label>' +
      '<label class="f"><b>2. המחירים</b><span class="hint">מה בית הספר משלם בגלל הבעיה: תלמידים, צוות, תוצאות, משאבים.</span><textarea data-i="price"' + (dis ? ' disabled' : '') + '>' + esc(iss.price) + '</textarea></label>' +
      '<label class="f"><b>3. שאלת ההיוועצות</b><span class="hint">שאלה פתוחה אחת שהמנהל באמת מתלבט בה, בנוסח "איך...".</span><textarea data-i="question"' + (dis ? ' disabled' : '') + '>' + esc(iss.question) + '</textarea></label>' +
      '<div class="f"><span class="lbl">מבחן המהותיות</span>' + TESTS.map(function (t, i) { return '<label class="chk"><input type="checkbox" data-t="' + i + '"' + (tests[i] ? ' checked' : '') + (dis ? ' disabled' : '') + '> ' + esc(t) + '</label>'; }).join('') +
      '<span class="hint" id="testNote" style="margin-top:6px"></span></div></div></form>' +
      (can ? stepBar('<button type="button" class="btn small primary" id="prepEnd">סיום ←</button>', '<span class="saved" data-docsaved>הכול נשמר אוטומטית</span>') : '<div class="savebar"><span class="saved" data-docsaved>לקריאה</span></div>') + helpBlock('man', 'נייר למנהל/ת: המתווה, עשה ואל תעשה');
    /* עטיפה משלה: במסלול המנהל.ת האב הוא #app, והמאזין היה נשאר פעיל בדפים אחרים */
    shell('<div id="prepRoot">' + h + '</div>');
    wireHelp();
    function note() {
      var boxes = $$('[data-t]'), all = boxes.every(function (b) { return b.checked; });
      $('#testNote').textContent = all ? '' : 'סוגיה שלא עומדת במבחן הזה מתאימה יותר לשיחה שוטפת עם המפקח.';
    }
    note();
    if (!can) return;
    var form = $('#prepForm').parentNode;
    var send = docAuto('prep', form, function () {
      note();
      return {
        stations: $$('[data-st]').map(function (b) { var o = {}; $$('[data-s]', b).forEach(function (e) { o[e.getAttribute('data-s')] = e.value; }); return o; }),
        issue: (function () { var o = { tests: $$('[data-t]').map(function (b) { return b.checked; }) }; $$('[data-i]').forEach(function (e) { o[e.getAttribute('data-i')] = e.value; }); return o; })()
      };
    });
    var steps = stepper($('#prepForm'), V.v.id + '|prep', $('#prepEnd'));
    /* סיום: בלי סטטוס. במסלול המנהל.ת חוזרים למילוי, שהוא המסך הראשי שלהם */
    $('#prepEnd').onclick = function () {
      delete STEP_AT[V.v.id + '|prep'];
      go(focusOn() ? '#v/' + V.v.id + '/fill' : '#v/' + V.v.id);
    };
    $('#prepForm').addEventListener('input', function (e) {
      if (!e.target.hasAttribute('data-s') || e.target.getAttribute('data-s') !== 'title') return;
      var box = e.target.closest('[data-st]'), n = $$('[data-st]').indexOf(box) + 1;
      $('summary b', box).textContent = 'תחנה ' + n + (e.target.value ? ': ' + e.target.value : '');
    });
    var add = $('#addSt');
    if (add) add.onclick = function () {
      var list = $('#stList');
      list.insertAdjacentHTML('beforeend', stHtml({ sec: '' }, list.children.length).replace('data-st ', 'data-st open '));
      if (list.children.length >= 4) add.parentNode.removeChild(add);
      steps.rebuild(list.lastElementChild);
    };
  }

  /* ===== שיחה מצומצמת: מפקח.ת ומנהל.ת בלבד. לא נכנסת לפרוטוקול, למצגת או למייל ===== */
  function viewBrief() {
    var V = S.V, B = V.docs.brief || {};
    shell(vHead() + '<div class="card" id="briefForm"><h2 style="margin-bottom:4px">שיחה מצומצמת</h2><p class="rs" style="margin:0 0 12px">רק המפקח.ת הפדגוגי.ת והמנהל.ת רואים את העמוד הזה. הוא לא נכנס לפרוטוקול, למצגת או למייל.</p>' +
      fld('מה התרשמתי שעובד טוב', 'works', B.works, 'דבר אחד ספציפי.') +
      fld('מה דורש תשומת לב', 'attn', B.attn, 'עד שני דברים, כולל סוגיות רגישות שלא עלו במליאה.') +
      fld('מה המנהל צריך מהפיקוח כדי לעמוד בהחלטות', 'need', B.need) +
      '<div class="saved" data-docsaved>הכול נשמר אוטומטית</div></div>');
    var f = $('#briefForm');
    docAuto('brief', f, function () { var o = {}; $$('[data-d]', f).forEach(function (e) { o[e.getAttribute('data-d')] = e.value; }); return o; });
  }

  /* ===== חיווי להנהלת המינהל: מפקחים ומטה, בלי המנהל.ת ===== */
  function viewHivui() {
    var V = S.V, H = V.docs.hivui || {}, can = V.caps.hivuiEdit;
    shell(vHead() + '<div class="card" id="hivuiForm"><h2 style="margin-bottom:4px">חיווי להנהלת המינהל</h2><p class="rs" style="margin:0 0 12px">גלוי למפקחים ולמטה. המנהל.ת לא רואה את העמוד. המועד והתבנית האחידה עדיין פתוחים בנייר.</p>' +
      fld('תמונת מצב', 'status', H.status, '', true, !can) + fld('החלטות מרכזיות', 'decisions', H.decisions, '', true, !can) + fld('סוגיות שדורשות מעורבות מערכתית', 'issues', H.issues, '', true, !can) +
      '<div class="saved" data-docsaved>' + (can ? 'הכול נשמר אוטומטית' : 'לקריאה') + '</div></div>');
    if (!can) return;
    var f = $('#hivuiForm');
    docAuto('hivui', f, function () { var o = {}; $$('[data-d]', f).forEach(function (e) { o[e.getAttribute('data-d')] = e.value; }); return o; });
  }

  /* ===== הכנת מפקח.ת: הנייר, ונתוני תובה רק לבית הספר בפיילוט ===== */
  function viewSup() {
    var V = S.V;
    var h = vHead() + '<div id="supData"></div>' + helpBlock('sup', 'נייר למפקח/ת: שאלות, סימני אזהרה ומקרים');
    shell(h);
    wireHelp();
    var box = $('#supData');
    if (!V.caps.supData) { box.innerHTML = '<div class="card empty">נתוני ההכנה מתובה (דירוגי המיפוי, תוכנית אישית, ביקורים) פתוחים כרגע רק בפיילוט.</div>'; return; }
    box.innerHTML = '<div class="loading">טוען…</div>';
    api('supPrep', { id: V.v.id }).then(function (r) {
      if (!r.ok) { box.innerHTML = '<div class="card empty">' + esc(errText(r.error)) + '</div>'; return; }
      var d = r.data, out = '<p class="rs">רק למפקח.ת. לא נשלח לבית הספר ולא נכנס למצגת. פערים עולים בשיחה המקדימה, לא לראשונה בוועדה.</p>';
      if (d.mipui) {
        var keys = Object.keys(d.mipui).filter(function (k) { return k !== 'תאריך קליטת טופס'; });
        out += '<div class="card"><h2 style="margin-bottom:8px">דירוגי המיפוי' + (d.mipui['תאריך קליטת טופס'] ? ' · ' + fmtDate(d.mipui['תאריך קליטת טופס']) : '') + '</h2><div class="tblw"><table class="grid"><tbody>' + keys.map(function (k) { return '<tr><td class="rowlbl">' + esc(k) + '</td><td>' + esc(d.mipui[k]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
      }
      (d.ishit || []).forEach(function (p) {
        out += '<div class="card"><h2 style="margin-bottom:8px">תוכנית אישית' + (p['נכתב ע"י'] ? ' · ' + esc(p['נכתב ע"י']) : '') + '</h2>' + Object.keys(p).filter(function (k) { return k !== 'נכתב ע"י'; }).map(function (k) { return '<div style="margin-top:6px"><b>' + esc(k) + ':</b> <span class="val">' + esc(p[k]) + '</span></div>'; }).join('') + '</div>';
      });
      if ((d.bikurim || []).length) out += '<div class="card"><h2 style="margin-bottom:8px">ביקורים אחרונים</h2>' + d.bikurim.map(function (b) {
        return '<details class="block"><summary><b>' + esc(fmtDate(b['תאריך']) || b['תאריך'] || '') + '</b> ' + esc(b['מפקח.ת'] || '') + '</summary>' + ['נושאים', 'סיכום', 'פעולות למעקב'].filter(function (k) { return b[k]; }).map(function (k) { return '<div style="margin-top:6px"><b>' + k + ':</b> <span class="val">' + esc(b[k]) + '</span></div>'; }).join('') + '</details>';
      }).join('') + '</div>';
      box.innerHTML = out;
    }).catch(function () {});
  }

  /* ===== ועדות קודמות ===== */
  function summaryHtml(raw) {
    var s = {};
    try { s = JSON.parse(raw || '{}'); } catch (e) {}
    var parts = [['topics', 'נושאים'], ['strengths', 'חוזקות'], ['gaps', 'פערים'], ['decisions', 'החלטות'], ['facts', 'נתונים']];
    var h = parts.filter(function (p) { return (s[p[0]] || []).length; }).map(function (p) {
      return '<h3 style="margin-top:10px">' + p[1] + '</h3><ul class="plain">' + s[p[0]].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    }).join('');
    return h || '<div class="rs">אין תקציר למסמך הזה.</div>';
  }
  function pastList(semel) {
    return api('past', { semel: semel }).then(function (r) {
      if (!r.ok) return '<div class="card empty">' + esc(errText(r.error)) + '</div>';
      if (!r.rows.length) return '<div class="card empty">אין במערכת מסמך של ועדה מלווה מהשנה הזו.</div>';
      var byStage = r.rows.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      return byStage.map(function (x, i) {
        return '<details class="card"' + (i ? '' : ' open') + '><summary><b>ועדה מלווה ' + esc(x.year) + ' · ' + esc(x.stage) + '</b>' + (x.date ? ' <span class="rs">' + fmtDate(x.date) + '</span>' : '') + '</summary>' + summaryHtml(x.summary) +
          (x.hasFile ? '<div class="acts"><button type="button" class="btn small" data-past="' + esc(x.key) + '">פתיחת המסמך</button></div>' : '') + '</details>';
      }).join('');
    }).catch(function () { return ''; });
  }
  function wirePast() {
    $$('[data-past]').forEach(function (b) {
      b.onclick = function () {
        toast('מכין את המסמך…');
        api('pastFile', { key: b.getAttribute('data-past') }).then(function (r) {
          if (!r.ok) return toast(errText(r.error));
          saveB64(r);
        }).catch(function () {});
      };
    });
  }
  function notesCard() {
    var can = S.V.caps.note && S.V.v.status !== 'closed';
    return '<div class="card" style="margin:0"><h3>הערות בדיון</h3><div id="nlist"></div>' + (can ? '<form id="nform" style="margin-top:9px"><textarea rows="2" id="ntext" style="min-height:64px" placeholder="הערה לתחום הזה" aria-label="הערה"></textarea><button class="btn small primary" style="margin-top:7px;width:100%">הוספת הערה</button></form>' : '') + '</div>';
  }
  function decideCard() {
    var can = S.V.caps.decide;
    return '<div class="card" style="margin:0"><h3>החלטות ומשימות</h3><div id="tlist"></div>' + (can ? '<form id="tform" style="margin-top:10px"><input type="hidden" id="tid">' +
      '<label class="f" style="margin-bottom:8px"><b>החלטה</b><textarea rows="2" id="ttext" style="min-height:62px"></textarea></label>' +
      '<label class="f" style="margin-bottom:8px"><b>מי: גורם מרכזי ליישום</b><input type="text" id="towner"></label>' +
      '<label class="f" style="margin-bottom:8px"><b>באחריות</b><select id="tparty"><option value="">בית הספר</option><option value="פיקוח">הפיקוח</option></select></label>' +
      '<label class="f" style="margin-bottom:8px"><b>משאבים / תכניות / מענים / יוזמות</b><input type="text" id="tres"></label>' +
      '<label class="f" style="margin-bottom:8px"><b>מדדי הצלחה (איך נדע שהשגנו את היעד)</b><input type="text" id="tmeasure"></label>' +
      '<label class="f" style="margin-bottom:8px"><b>מועד מעקב ודיווח למפקח</b><input type="date" id="tfollow"></label>' +
      '<button class="btn small primary" id="tsave" style="width:100%">שמירת ההחלטה</button></form>' : (S.V.v.status === 'closed' ? '' : '<p class="rs" style="margin:8px 0 0">את ההחלטות רושם.ת ' + esc(S.V.v.recName || 'המנהל.ת') + '.</p>')) + '</div>';
  }
  function drawNotes(sec) {
    var el = $('#nlist'); if (!el) return;
    var list = S.V.notes.filter(function (n) { return n.sec === sec; });
    el.innerHTML = list.length ? list.map(function (n) {
      var del = S.V.v.status !== 'closed' && (n.email === S.me.email || S.V.caps.manage);
      return '<div class="note"><small><span>' + esc(n.name) + ' · ' + fmtAt(n.at) + '</span>' + (del ? '<button type="button" class="link danger" data-ndel="' + esc(n.id) + '">מחיקה</button>' : '') + '</small><div class="val">' + esc(n.text) + '</div></div>';
    }).join('') : '<div class="rs" style="padding:6px 0">אין עדיין הערות בתחום הזה.</div>';
  }
  function taskLine(t, edit) {
    return '<div class="task"><b>' + esc(t.text) + (t.from ? '<span class="draftnote" style="background:var(--blue-soft);color:var(--navy)">ממשיכה</span>' : '') + '</b>' +
      (t.party ? '<small>באחריות הפיקוח</small>' : '') + (t.owner ? '<small>אחריות: ' + esc(t.owner) + '</small>' : '') + (t.measure ? '<small>מדד: ' + esc(t.measure) + '</small>' : '') + (t.res ? '<small>משאבים: ' + esc(t.res) + '</small>' : '') + (t.follow ? '<small>מעקב: ' + fmtDate(t.follow) + '</small>' : '') +
      (edit ? '<button type="button" class="link" data-tedit2="' + esc(t.id) + '">עריכה</button> <button type="button" class="link danger" data-tdel2="' + esc(t.id) + '">מחיקה</button>' : '') + '</div>';
  }
  function drawDecisions(sec) {
    var el = $('#tlist'); if (!el) return;
    var list = S.V.tasks.filter(function (t) { return t.sec === sec; });
    el.innerHTML = list.length ? list.map(function (t) { return taskLine(t, S.V.caps.decide); }).join('') : '<div class="rs" style="padding:6px 0">אין עדיין החלטות בתחום הזה.</div>';
  }
  function wireLive(sec) {
    var nf = $('#nform');
    if (nf) nf.onsubmit = function (e) {
      e.preventDefault();
      var t = $('#ntext').value.trim();
      if (!t) return;
      var b = nf.querySelector('button'); b.disabled = true;
      api('note', { id: S.V.v.id, sec: sec, text: t }).then(function (r) {
        b.disabled = false;
        if (!r.ok) return toast(errText(r.error));
        S.V.notes.push(r.note); $('#ntext').value = ''; drawNotes(sec);
      }).catch(function () {});
    };
    $('#nlist').addEventListener('click', function (e) {
      var id = e.target.getAttribute('data-ndel');
      if (!id) return;
      api('noteDel', { noteId: id }).then(function (r) {
        if (!r.ok) return toast(errText(r.error));
        S.V.notes = S.V.notes.filter(function (n) { return n.id !== id; }); drawNotes(sec);
      }).catch(function () {});
    });
    var tf = $('#tform');
    if (tf) tf.onsubmit = function (e) {
      e.preventDefault();
      var text = $('#ttext').value.trim();
      if (!text) return toast('כותבים קודם את ההחלטה');
      var b = $('#tsave'); b.disabled = true;
      var task = { id: $('#tid').value, sec: sec, text: text, owner: $('#towner').value, res: $('#tres').value, measure: $('#tmeasure').value, follow: $('#tfollow').value, party: $('#tparty').value };
      api('taskSave', { id: S.V.v.id, task: task }).then(function (r) {
        b.disabled = false;
        if (!r.ok) return toast(errText(r.error));
        S.V.tasks = S.V.tasks.filter(function (t) { return t.id !== r.task.id; }).concat(r.task);
        tf.reset(); $('#tid').value = ''; b.textContent = 'שמירת ההחלטה'; drawDecisions(sec);
      }).catch(function () {});
    };
    $('#tlist').addEventListener('click', function (e) {
      var ed = e.target.getAttribute('data-tedit2'), del = e.target.getAttribute('data-tdel2');
      if (ed) {
        var t = S.V.tasks.filter(function (x) { return x.id === ed; })[0];
        $('#tid').value = t.id; $('#ttext').value = t.text; $('#towner').value = t.owner; $('#tres').value = t.res; $('#tmeasure').value = t.measure; $('#tfollow').value = t.follow; $('#tparty').value = t.party || '';
        $('#tsave').textContent = 'עדכון ההחלטה'; $('#ttext').focus();
      } else if (del && confirm('למחוק את ההחלטה?')) {
        api('taskDel', { id: S.V.v.id, taskId: del }).then(function (r) {
          if (!r.ok) return toast(errText(r.error));
          S.V.tasks = S.V.tasks.filter(function (x) { return x.id !== del; }); drawDecisions(sec);
        }).catch(function () {});
      }
    });
  }

  /* ===== סיכום ופרוטוקול ===== */
  function domName(d) { for (var i = 0; i < VAADA.DOMS.length; i++) if (VAADA.DOMS[i][0] === d) return VAADA.DOMS[i][1]; return d; }
  function domOfSec(sec) { var s = VAADA.section(S.V.v.stage, sec); return s ? s.dom : 'general'; }
  /* מי צריך לחתום: המפקח.ת הפדגוגי.ת ומנהל.ת האזור */
  function signSlots() {
    var V = S.V, signs = V.signs || [], out = [];
    (V.school.sups || []).forEach(function (name) {
      var s = signs.filter(function (x) { return x.role === 'ped' && x.name === name; })[0] || null;
      out.push({ label: 'מפקח.ת פדגוגי.ת', name: name, done: s });
    });
    /* חתימה של מפקח.ת ששמו.ה לא בפריסה עדיין נספרת */
    signs.filter(function (x) { return x.role === 'ped' && (V.school.sups || []).indexOf(x.name) < 0; }).forEach(function (s) { out.push({ label: 'מפקח.ת פדגוגי.ת', name: s.name, done: s }); });
    out.push({ label: 'מנהל.ת אזור', name: V.v.netName || '', done: signs.filter(function (x) { return x.role === 'net'; })[0] || null });
    return out;
  }
  function signCard() {
    var V = S.V, v = V.v;
    var h = '<div class="card" id="signCard"><h2 style="margin-bottom:8px">חתימות</h2>';
    if (v.status !== 'closed') h += '<p class="rs">חותמים אחרי שסוגרים את הוועדה. פתיחה מחדש מאפסת את החתימות.</p>';
    signSlots().forEach(function (s) {
      h += '<div class="row"><span class="rm"><span class="rt">' + esc(s.label) + (s.name ? ': ' + esc(s.name) : '') + '</span>' + (s.done ? '<br><span class="rs">אישר.ה: ' + esc(s.done.name) + ' · ' + fmtAt(s.done.at) + '</span>' : '') + '</span>' + (s.done ? '<span class="tag ok">נחתם</span>' : '<span class="tag">טרם נחתם</span>') + '</div>';
    });
    if (V.caps.sign) {
      var mine = (V.signs || []).filter(function (x) { return x.email === S.me.email; })[0];
      h += '<div class="acts">' + (mine ? '<button type="button" class="link danger" id="unsignBtn">ביטול החתימה שלי</button>' : '<button type="button" class="btn primary" id="signBtn">קראתי ומאשר.ת</button>') + '</div>';
    }
    return h + '</div>';
  }
  function viewSign() {
    var V = S.V, v = V.v;
    var h = V.caps.rep ? '<div class="head"><h1>פרוטוקול הוועדה</h1><p>' + esc(v.school) + '</p></div>' : vHead();
    if (v.date && v.status !== 'closed') {
      var d = new Date(v.date + 'T12:00:00'); d.setDate(d.getDate() + 2);
      h += '<div class="deadline">סיכום הוועדה נשלח לכלל המשתתפים בתוך 48 שעות: עד ' + fmtDate(d.toISOString().slice(0, 10)) + '.</div>';
    }
    var canClose = V.caps.manage || V.caps.decide;
    h += '<div class="acts" style="margin:0 0 14px"><button type="button" class="btn small" id="printBtn">הדפסה / PDF</button>';
    if (!V.caps.rep) h += mailBtn({ id: 'mailSum', cls: 'btn small', label: 'מייל לכלל המשתתפים', to: v.emails, subject: 'סיכום הוועדה המלווה: ' + v.school, lines: sumLines(), html: true });
    if (!V.caps.rep && v.status === 'closed' && v.netEmail) h += mailBtn({ id: 'mailSign', cls: 'btn small', label: 'בקשת חתימה ממנהל.ת האזור', to: v.netEmail, subject: 'חתימה על פרוטוקול הוועדה המלווה: ' + v.school, lines: ['שלום ' + (v.netName || '') + ',', 'פרוטוקול הוועדה המלווה של ' + v.school + ' מוכן לחתימה:', SITE + '#v/' + v.id + '/sign', 'בכניסה מקלידים את המייל הזה ומקבלים קוד.', 'תודה!'] });
    if (v.status !== 'closed' && canClose) h += '<button type="button" class="btn small primary" id="closeBtn">סגירת הוועדה</button>';
    if (v.status === 'closed' && V.caps.manage) h += '<button type="button" class="btn small" id="reopenBtn">פתיחה מחדש</button>';
    h += '</div>' + signCard() + protocolHtml();
    if (V.caps.rep) APP.innerHTML = h; else shell(h);
    $('#printBtn').onclick = function () { window.print(); };
    wireMail();
    function reload() { S.board = null; route(); }
    var cb = $('#closeBtn');
    if (cb) cb.onclick = function () {
      if (!confirm('לסגור את הוועדה? אחרי הסגירה אי אפשר לערוך, אפשר לחתום, והמשימות עוברות לוועדה הבאה. המנהל.ת יכול.ה לפתוח מחדש.')) return;
      api('close', { id: v.id }).then(function (r) { if (!r.ok) return toast(errText(r.error)); reload(); }).catch(function () {});
    };
    var rb = $('#reopenBtn');
    if (rb) rb.onclick = function () {
      if (!confirm('לפתוח מחדש? החתימות יימחקו, וצריך יהיה לחתום שוב.')) return;
      api('reopen', { id: v.id }).then(function (r) { if (!r.ok) return toast(errText(r.error)); reload(); }).catch(function () {});
    };
    var sb = $('#signBtn');
    if (sb) sb.onclick = function () {
      sb.disabled = true;
      api('sign', { id: v.id }).then(function (r) { if (!r.ok) { sb.disabled = false; return toast(errText(r.error)); } reload(); }).catch(function () {});
    };
    var ub = $('#unsignBtn');
    if (ub) ub.onclick = function () {
      api('sign', { id: v.id, remove: true }).then(function (r) { if (!r.ok) return toast(errText(r.error)); reload(); }).catch(function () {});
    };
  }
  function protocolHtml() {
    var V = S.V, v = V.v;
    var h = '<article class="doc"><h1>פרוטוקול ועדה מלווה · ' + esc(VAADA.STAGES[v.stage]) + ' ' + esc(v.year) + '</h1>' +
      '<dl><dt>בית ספר</dt><dd>' + esc(v.school) + '</dd><dt>רשת</dt><dd>' + esc(V.school.network) + '</dd><dt>תאריך</dt><dd>' + (fmtDate(v.date) || '—') + '</dd><dt>רשם.ת</dt><dd>' + esc(v.recName || '—') + '</dd><dt>משתתפים</dt><dd class="val">' + esc(v.parts || '—') + '</dd></dl>';
    var pt = V.prev.tasks;
    if (pt.length) {
      h += '<h2>מעקב אחרי ' + esc(V.prev.label) + '</h2><div class="tblw"><table class="grid"><thead><tr><th>משימה</th><th>סטטוס</th><th>מה למדנו</th><th>ממשיכים</th></tr></thead><tbody>' +
        pt.map(function (t) { return '<tr><td data-l="משימה">' + esc(t.text) + '</td><td data-l="סטטוס">' + esc(t.refStatus || 'לא עודכן') + '</td><td data-l="מה למדנו" class="val">' + esc(t.refNote) + '</td><td data-l="ממשיכים">' + esc(t.refCont) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    VAADA.DOMS.forEach(function (d) {
      var ts = V.tasks.filter(function (t) { return domOfSec(t.sec) === d[0]; });
      var ns = V.notes.filter(function (n) { return domOfSec(n.sec) === d[0]; });
      if (!ts.length && !ns.length) return;
      h += '<h2>' + esc(d[1]) + '</h2>';
      if (ts.length) h += '<div class="tblw"><table class="grid"><thead><tr><th>החלטות</th><th>גורם מרכזי ליישום</th><th>משאבים / תכניות / מענים / יוזמות</th><th>מדדי הצלחה</th><th>מועד מעקב ודיווח למפקח</th></tr></thead><tbody>' +
        ts.map(function (t) { return '<tr><td data-l="החלטות">' + esc(t.text) + '</td><td data-l="גורם מרכזי ליישום">' + esc(t.owner) + '</td><td data-l="משאבים">' + esc(t.res) + '</td><td data-l="מדדי הצלחה">' + esc(t.measure) + '</td><td data-l="מועד מעקב">' + fmtDate(t.follow) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      if (ns.length) h += '<h3 style="margin:12px 0 2px">הערות מהדיון</h3>' + ns.map(function (n) { return '<div class="note"><small>' + esc(n.name) + '</small><div class="val">' + esc(n.text) + '</div></div>'; }).join('');
    });
    if ((V.recs || []).length) h += '<h2>המלצות המפקח.ת</h2><ul class="plain">' + V.recs.map(function (r) { return '<li>' + esc(r.text) + '</li>'; }).join('') + '</ul>';
    if (!V.tasks.length && !V.notes.length && !pt.length) h += '<p class="empty">עדיין אין החלטות. הן נכתבות בהצגה הדיגיטלית של הוועדה.</p>';
    return h + '</article>';
  }
  function sumLines() {
    var V = S.V, v = V.v, out = ['שלום,', 'מצורף סיכום הוועדה המלווה של ' + v.school + (v.date ? ' מתאריך ' + fmtDate(v.date) : '') + '.', ''];
    VAADA.DOMS.forEach(function (d) {
      var ts = V.tasks.filter(function (t) { return domOfSec(t.sec) === d[0]; });
      if (!ts.length) return;
      out.push(d[1] + ':');
      ts.forEach(function (t) { out.push('• ' + t.text + (t.owner ? ' (' + t.owner + ')' : '') + (t.follow ? ', מעקב ' + fmtDate(t.follow) : '')); });
      out.push('');
    });
    out.push('הפרוטוקול המלא מצורף כקובץ.', 'תודה לכל השותפים.');
    return out;
  }

  /* ===== כפתור מייל (סקיל mail-button): נייד mailto אמיתי, מחשב טיוטת Gmail + הדבקת HTML =====
     ה-mailto נבנה כשמציירים את הדף. המייל יוצא מהתיבה של מי שלוחץ.ה, לכן בלי authuser. */
  var MAILS = {};
  function mailBtn(o) {
    MAILS[o.id] = o;
    var q = [];
    if (o.bcc) q.push('bcc=' + encodeURIComponent(o.bcc));
    q.push('subject=' + encodeURIComponent(o.subject));
    var body = o.lines.join('\n');
    if (body.length > 1700) body = body.slice(0, 1700) + '\n…\n(המשך בפרוטוקול המצורף)';
    q.push('body=' + encodeURIComponent(body));
    return '<a class="' + o.cls + '" id="' + o.id + '" href="mailto:' + encodeURIComponent(o.to || '').replace(/%40/g, '@').replace(/%2C/g, ',') + '?' + q.join('&') + '">' + esc(o.label) + '</a>';
  }
  function wireMail() {
    Object.keys(MAILS).forEach(function (id) {
      var a = document.getElementById(id);
      if (!a || a._wired) return;
      a._wired = true;
      a.addEventListener('click', function (e) {
        if (isMobile()) return;   /* בנייד הקישור נפתח כפי שהוא */
        e.preventDefault();
        var o = MAILS[id];
        var html = '<div dir="rtl" style="text-align:right;font-family:Arial,sans-serif;font-size:15px;line-height:1.7">' + o.lines.map(function (l) { return l ? esc(l) : '&nbsp;'; }).join('<br>') + '</div>';
        var copied = copyHtml(html);
        var u = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(o.to || '') + (o.bcc ? '&bcc=' + encodeURIComponent(o.bcc) : '') + '&su=' + encodeURIComponent(o.subject) + (copied ? '' : '&body=' + encodeURIComponent(o.lines.join('\n')));
        window.open(u, '_blank', 'noopener');
        if (copied) toast('הנוסח הועתק. לוחצים בגוף המייל ואז Ctrl+V');
      });
    });
  }
  function copyHtml(html) {
    var d = document.createElement('div');
    d.contentEditable = 'true'; d.innerHTML = html; d.style.position = 'fixed'; d.style.insetInlineStart = '-9999px'; d.dir = 'rtl';
    document.body.appendChild(d);
    var r = document.createRange(); r.selectNodeContents(d);
    var s = getSelection(); s.removeAllRanges(); s.addRange(r);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    s.removeAllRanges(); d.remove();
    return ok;
  }
  function copyText(t) {
    var ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }

  $('#out').onclick = function () { logout(); };
  route();
})();
