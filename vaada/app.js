/* ועדה מלווה — הדף (4.11.26). השרת: רויטל\vaada-gas\Code.js. כל הנתונים נשלפים אחרי כניסה; אין כאן שום נתון אישי.
   ניתוב לפי hash:
   #                 מסך הבית (מנהל.ת: בית הספר · מפקח.ת ומטה: רשימה · בעל.ת תפקיד: התחומים שלי)
   #s/<סמל>          ציר הוועדות של בית ספר
   #v/<id>           הכנה: כל התחומים ומי ממלא
   #v/<id>/e/<תחום>  מילוי תחום
   #v/<id>/live/<תחום>  מצב ועדה
   #v/<id>/sum       סיכום ופרוטוקול */
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
    forbidden: 'אין לחשבון הזה הרשאה לפעולה.', notfound: 'הוועדה לא נמצאה.', closed: 'הוועדה סגורה. המנהל.ת יכול.ה לפתוח אותה מחדש.',
    toolong: 'התחום ארוך מדי לשמירה. כדאי לקצר או להעביר חלק לקובץ.', toolarge: 'הקובץ גדול מ-8MB.', badmail: 'כתובת המייל לא תקינה.', empty: 'לא נכתב טקסט.',
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
    try { localStorage.removeItem(KEY); } catch (e) {}
    S.token = ''; S.me = null; S.V = null; S.board = null;
    if (!silent) location.hash = '';
    route();
  }

  /* ===== כניסה ===== */
  function viewLogin() {
    $('#who').hidden = true; $('#out').hidden = true;
    APP.innerHTML = '<form class="card login" id="lf"><h1>כניסה לוועדה המלווה</h1><p>מקלידים את המייל שלך, ונשלח אליו קוד בן 6 ספרות. המכשיר יזכור אותך ל-30 יום.</p>' +
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
    var w = $('#who');
    w.textContent = S.me.name || S.me.email; w.hidden = false;
    $('#out').hidden = false;
  }

  /* ===== ניתוב ===== */
  window.addEventListener('hashchange', route);
  function route() {
    clearTimeout(pollT); pollT = null; liveId++;
    flushNow();
    if (!S.token) {
      var s = session();
      if (!s) return viewLogin();
      S.token = s.token;
    }
    var h = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    window.scrollTo(0, 0);
    if (!h[0]) return viewHome();
    if (h[0] === 's') return viewSchool(h[1]);
    if (h[0] === 'v') return withVaada(h[1], function () {
      if (h[2] === 'e') return viewEdit(h[3]);
      if (h[2] === 'live') return viewLive(h[3]);
      if (h[2] === 'sum') return viewSum();
      return viewPrep();
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
    var h = '<div class="head"><h1>התחומים שלי</h1><p>אלה התחומים שהמנהל.ת שייך.ה אליך. בכל תחום יש שמירה אוטומטית.</p></div>';
    var byV = {};
    me.assigned.forEach(function (a) { (byV[a.vid] = byV[a.vid] || []).push(a.sec); });
    h += '<div class="card">';
    me.recorderOf.forEach(function (id) { h += '<a class="row" href="#v/' + esc(id) + '/live"><span class="rm"><span class="rt">רישום הפרוטוקול של הוועדה</span></span><span class="tag info">רשם.ת</span></a>'; });
    Object.keys(byV).forEach(function (vid) {
      var st = vid.split('-').pop();
      byV[vid].forEach(function (sec) {
        var def = VAADA.section(st, sec);
        h += '<a class="row" href="#v/' + esc(vid) + '/e/' + esc(sec) + '"><span class="rm"><span class="rt">' + esc(def ? def.title : sec) + '</span></span><span class="tag">פתיחה</span></a>';
      });
    });
    if (!me.assigned.length && !me.recorderOf.length) h += '<div class="empty">עוד לא שויכו אליך תחומים.</div>';
    APP.innerHTML = h + '</div>';
  }

  function schoolState(s) {
    var v = s.vaadot.filter(function (x) { return x.stage === 'a'; })[0];
    if (!v) return { key: 'none', tag: '<span class="tag warn">טרם נפתחה</span>', done: 0 };
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
      '<div class="card summary"><b>נפתחו ' + opened + ' ועדות מתוך ' + list.length + ' · נסגרו ' + closed + '</b><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    if (missing.length) {
      var names = missing.map(function (s) { return s.name + (s.principals[0] ? ' · ' + s.principals[0].name : ''); }).join('\n');
      var mails = missing.map(function (s) { return (s.principals[0] || {}).email; }).filter(Boolean).join(',');
      h += '<details class="card"><summary><b>מי טרם פתח ועדה (' + missing.length + ')</b></summary><div class="val" style="margin-top:9px">' + esc(names) + '</div>' +
        '<div class="acts"><button type="button" class="btn small" id="copyMissing">העתקת הרשימה</button>' +
        mailBtn({ id: 'mailMissing', cls: 'btn small', label: 'מייל תזכורת', bcc: mails, subject: 'תזכורת: פתיחת הוועדה המלווה במערכת הדיגיטלית', lines: ['שלום,', 'טרם נפתחה במערכת הוועדה המלווה של תחילת השנה. הפתיחה וההכנה נעשות בכתובת:', SITE, 'בכניסה מקלידים את המייל שלך ומקבלים קוד.', 'זימונים לוועדת פתיחת השנה נשלחים עד 15.11, והחומרים מופצים שבוע לפני הוועדה.', '', 'המרחב הפדגוגי · המנהל להכשרה מקצועית · משרד העבודה'] }) +
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
          (st.v && st.v.date ? '<span class="rs">' + fmtDate(st.v.date) + '</span>' : '') +
          (s.open ? '<span class="tag">' + count(s.open, 'משימה פתוחה אחת', 'משימות פתוחות') + '</span>' : '') + st.tag + '</a>';
      }).join('') || '<div class="empty">לא נמצא בית ספר.</div>';
    }
    draw();
    $('#q').oninput = draw;
    var c = $('#copyMissing');
    if (c) c.onclick = function () { copyText(S.copyMissing); toast('הרשימה הועתקה'); };
    wireMail();
  }

  /* ===== בית ספר: ציר ועדות ===== */
  function viewSchool(semel) {
    loading();
    (S.board ? Promise.resolve(S.board) : loadBoard()).then(function (r) {
      header();
      var s = (r.schools || []).filter(function (x) { return x.semel === semel; })[0];
      if (!s) return failed('forbidden');
      var manage = r.me.admin || r.me.principalOf.indexOf(semel) > -1;
      var back = r.schools.length > 1 ? '<a class="crumb" href="#">→ כל בתי הספר</a>' : '';
      var a = s.vaadot.filter(function (v) { return v.stage === 'a'; })[0];
      var h = back + '<div class="head"><h1>' + esc(s.name) + '</h1><p>' + esc(s.network) + ' · ' + esc(s.sups.join(' · ')) + '</p></div><h2 style="margin-bottom:10px">' + VAADA.YEAR + '</h2><div class="timeline">';
      h += '<div class="tl"><h3>ועדת תחילת שנה</h3>';
      if (a) {
        h += '<div>' + schoolState({ vaadot: [a] }).tag + '</div>' + (a.date ? '<div class="rs">' + fmtDate(a.date) + '</div>' : '') +
          '<a class="btn primary" href="#v/' + a.id + '">פתיחה</a>';
      } else if (manage) {
        h += '<div class="rs">זימונים עד 15.11 · הוועדה עד אמצע ינואר</div><button type="button" class="btn primary" id="openA">פתיחת הוועדה</button>';
      } else h += '<div><span class="tag warn">טרם נפתחה</span></div><div class="rs">המנהל.ת פותח.ת את הוועדה.</div>';
      h += '</div><div class="tl future"><h3>ועדת סיכום שנה</h3><div class="rs">אפריל–יוני · זימונים עד 15.5. תיפתח כאן בהמשך השנה, עם המשימות של ועדת תחילת השנה.</div></div></div>';
      APP.innerHTML = h;
      var o = $('#openA');
      if (o) o.onclick = function () {
        o.disabled = true; o.textContent = 'פותח…';
        api('open', { semel: semel, stage: 'a' }).then(function (x) {
          S.board = null;
          if (x.ok) location.hash = '#v/' + x.id; else { toast(errText(x.error)); o.disabled = false; o.textContent = 'פתיחת הוועדה'; }
        });
      };
    }).catch(function () {});
  }

  /* ===== טעינת ועדה ===== */
  function withVaada(id, then) {
    if (S.V && S.V.v.id === id && withVaada.keep) { withVaada.keep = false; return then(); }
    loading();
    api('vaada', { id: id }).then(function (r) {
      if (!r.ok) return failed(r.error);
      S.V = r; S.me = r.me; header();
      then();
    }).catch(function () {});
  }
  function go(hash) { withVaada.keep = true; if (location.hash === hash) route(); else location.hash = hash; }
  function secs() { return VAADA.sections(S.V.v.stage); }
  function visibleSecs() { var V = S.V; return secs().filter(function (s) { return V.caps.full || V.caps.mine.indexOf(s.id) > -1; }); }
  function secStatus(id) { var x = S.V.secs[id]; return x ? x.status : ''; }
  function statusTag(id) {
    var st = secStatus(id);
    return st === 'done' ? '<span class="tag ok">הושלם</span>' : st === 'started' ? '<span class="tag info">בעבודה</span>' : '<span class="tag">טרם התחיל</span>';
  }
  function vHead() {
    var V = S.V, v = V.v, base = '#v/' + v.id, h = '';
    if (V.caps.full) h += '<a class="crumb" href="#s/' + v.semel + '">→ ' + esc(v.school) + '</a>';
    else h += '<a class="crumb" href="#">→ התחומים שלי</a>';
    h += '<div class="head"><h1>ועדה מלווה · ' + esc(VAADA.STAGES[v.stage]) + ' ' + esc(v.year) + '</h1><p>' + esc(v.school) + (v.date ? ' · ' + fmtDate(v.date) : '') + (v.status === 'closed' ? ' · <b>הוועדה נסגרה</b>' : '') + '</p></div>';
    if (V.caps.full) {
      var cur = viewName();
      h += '<nav class="steps" aria-label="שלבי הוועדה"><a href="' + base + '"' + (cur === 'prep' ? ' aria-current="page"' : '') + '>הכנה</a>' +
        '<a href="' + base + '/live"' + (cur === 'live' ? ' aria-current="page"' : '') + '>בוועדה</a>' +
        '<a href="' + base + '/sum"' + (cur === 'sum' ? ' aria-current="page"' : '') + '>סיכום</a></nav>';
    }
    return h;
  }
  function viewName() { var p = location.hash.split('/')[2]; return p === 'live' ? 'live' : p === 'sum' ? 'sum' : 'prep'; }

  /* ===== הכנה ===== */
  function viewPrep() {
    var V = S.V, v = V.v, manage = V.caps.manage && v.status !== 'closed';
    var req = VAADA.required(v.stage).filter(function (s) { return V.caps.full || V.caps.mine.indexOf(s.id) > -1; });
    var done = req.filter(function (s) { return secStatus(s.id) === 'done'; });
    var pct = req.length ? Math.round(done.length / req.length * 100) : 0;
    var h = vHead() + '<div class="card summary"><b>הושלמו ' + done.length + ' מתוך ' + req.length + ' תחומים</b><div class="bar"><i style="width:' + pct + '%"></i></div>';
    var left = req.filter(function (s) { return secStatus(s.id) !== 'done'; });
    if (left.length && V.caps.full) h += '<details><summary>מי טרם סיים (' + left.length + ')</summary><div class="val" id="leftList" style="margin-top:7px">' + esc(leftText(left)) + '</div><button type="button" class="btn small" id="copyLeft" style="margin-top:8px">העתקת הרשימה</button></details>';
    h += '</div>';
    if (manage || V.caps.full) h += metaCard(manage);
    var prevN = V.prev.tasks.length;
    if (prevN) {
      var handled = V.prev.tasks.filter(function (t) { return t.refStatus; }).length;
      h += '<div class="prevbox" style="padding:12px 16px"><b>מ' + esc(V.prev.label) + ': ' + handled + ' מתוך ' + prevN + ' משימות עודכנו.</b> בכל תחום מופיעות בראש העמוד המשימות שלו.</div>';
    }
    var g = '';
    visibleSecs().forEach(function (s) {
      if (s.g !== g) { g = s.g; h += '<div class="grp">' + esc(g) + '</div>'; }
      var a = V.assign[s.id];
      var pt = V.prev.tasks.filter(function (t) { return t.sec === s.id; });
      var open = pt.filter(function (t) { return !t.refStatus; }).length;
      h += '<div class="sec-row" data-sec="' + s.id + '"><div class="rm"><a href="#v/' + v.id + '/e/' + s.id + '">' + esc(s.title) + (s.opt ? ' (רשות)' : '') + '</a><br><span class="rs">' +
        (a ? esc(a.name || a.email) : 'ממלא.ת: ' + esc(s.who)) + (open ? ' · ' + count(open, 'משימה אחת', 'משימות') + ' מהוועדה הקודמת' : '') + '</span></div>' + statusTag(s.id) +
        (manage ? '<button type="button" class="link" data-as="' + s.id + '">' + (a ? 'שינוי שיוך' : 'שיוך') + '</button>' : '') + '</div>';
    });
    APP.innerHTML = h;
    var cl = $('#copyLeft');
    if (cl) cl.onclick = function () { copyText(leftText(left)); toast('הרשימה הועתקה'); };
    wireMeta();
    $$('[data-as]').forEach(function (b) { b.onclick = function () { assignForm(b.getAttribute('data-as')); }; });
  }
  function leftText(left) {
    return left.map(function (s) { var a = S.V.assign[s.id]; return s.title + ' · ' + (a ? (a.name || a.email) : s.who); }).join('\n');
  }

  function metaCard(edit) {
    var v = S.V.v;
    if (!edit) return '<div class="card"><b>מועד:</b> ' + (fmtDate(v.date) || 'טרם נקבע') + ' · <b>רשם.ת:</b> ' + esc(v.recName || v.recEmail || 'טרם מונה') + '</div>';
    return '<details class="card"' + (v.date ? '' : ' open') + '><summary><b>פרטי הוועדה: מועד, רשם.ת ומשתתפים</b></summary><div style="margin-top:12px">' +
      '<label class="f"><b>תאריך הוועדה</b><input type="date" data-m="date" value="' + esc(v.date) + '"></label>' +
      '<label class="f"><b>רשם.ת הפרוטוקול: שם</b><input type="text" data-m="recName" value="' + esc(v.recName) + '"></label>' +
      '<label class="f"><b>רשם.ת הפרוטוקול: מייל</b><span class="hint">הרשם.ת נכנס.ת עם המייל הזה ורושם.ת את ההחלטות. בלי רשם.ת — המנהל.ת רושם.ת.</span><input type="email" dir="ltr" data-m="recEmail" value="' + esc(v.recEmail) + '"></label>' +
      '<label class="f"><b>משתתפים</b><span class="hint">שם ותפקיד, שורה לכל אחד.ת. חובה: מנהל.ת והנהלה, נציג.ת הרשת, מפקח.ת כולל.ת, מפקחת מערך טיפולי, מפקחים מקצועיים.</span><textarea data-m="parts">' + esc(v.parts) + '</textarea></label>' +
      '<label class="f"><b>מיילים למשלוח הסיכום</b><span class="hint">מופרדים בפסיק</span><input type="text" dir="ltr" data-m="emails" value="' + esc(v.emails) + '"></label>' +
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
  function prefillRows(f) {
    var m = (S.V.school.megamot || []);
    if (f.prefill === 'megamot') return m.map(function (x) { return [x[0], x[1]]; });
    if (f.prefill === 'megamotName') return m.map(function (x) { return [x[0]]; });
    return [];
  }
  /* ערך התחלתי של שדה: מה שנשמר, ואם אין — מה שידוע כבר על בית הספר */
  function initial(secId, f) {
    var d = (S.V.secs[secId] || {}).data || {};
    if (d[f.k] !== undefined) return d[f.k];
    var sch = S.V.school;
    if (secId === 'sipur') {
      if (f.k === 'sup') return sch.sups.join(' · ');
      if (f.k === 'network') return '';
    }
    if (f.t === 'table' && f.add) {
      var rows = prefillRows(f);
      return rows.length ? rows : [];
    }
    if (f.t === 'repeat' && f.prefill) return prefillRows(f).map(function (r) { return { name: r[0] }; });
    return undefined;
  }

  function cellInput(col, val, fk, r, c) {
    var a = ' data-cell="' + fk + '" data-r="' + r + '" data-c="' + c + '"';
    if (col.t === 'yn') return '<select' + a + ' aria-label="' + esc(col.l) + '"><option value=""></option><option' + (val === 'כן' ? ' selected' : '') + '>כן</option><option' + (val === 'לא' ? ' selected' : '') + '>לא</option></select>';
    return '<textarea rows="1" style="min-height:42px"' + a + ' aria-label="' + esc(col.l) + '">' + esc(val) + '</textarea>';
  }
  function tableHtml(f, val) {
    var rows = f.rows || null, n = rows ? rows.length : Math.max((val || []).length, f.minRows || (f.add ? 1 : 0));
    var h = '<div class="f"><span class="lbl">' + esc(f.l) + '</span>' + (f.h ? '<span class="hint">' + esc(f.h) + '</span>' : '') + '<div class="tblw"><table class="grid" data-table="' + f.k + '"><thead><tr>' + (rows ? '<th></th>' : '');
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
      h += '<td data-l="' + esc(c.l) + '">' + cellInput(c, v == null ? '' : v, f.k, r, i) + '</td>';
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
    var h = '<div data-repeat="' + f.k + '">';
    val.forEach(function (it, i) { h += repeatItem(f, it, i); });
    return h + '</div><button type="button" class="btn small" data-addrep="' + f.k + '">+ הוספת ' + esc(f.item) + '</button>';
  }
  function repeatItem(f, it, i) {
    var h = '<details class="block" ' + (i === 0 ? 'open' : '') + ' data-item><summary><b>' + esc(it.name || (f.item + ' ' + (i + 1))) + '</b></summary><div style="margin-top:10px">';
    f.fields.forEach(function (x) {
      h += '<label class="f"><b>' + esc(x.l) + '</b>' + (x.t === 'text' ? '<input type="text" data-rf="' + x.k + '" value="' + esc(it[x.k]) + '">' : '<textarea data-rf="' + x.k + '">' + esc(it[x.k]) + '</textarea>') + '</label>';
    });
    return h + '<button type="button" class="link danger" data-delrep>מחיקת ה' + esc(f.item) + '</button></div></details>';
  }
  function fileHtml(f, secId) {
    var list = S.V.files.filter(function (x) { return x.sec === secId && x.field === f.k; });
    return '<div class="f" data-fileblock="' + f.k + '"><span class="lbl">' + esc(f.l) + '</span>' + (f.h ? '<span class="hint">' + esc(f.h) + '</span>' : '') + filesList(list, true) +
      '<label class="btn small" style="margin-top:6px">העלאת קובץ<input type="file" hidden data-up="' + f.k + '" accept="image/*,.pdf,.ppt,.pptx,.doc,.docx"></label></div>';
  }
  function filesList(list, del) {
    return list.map(function (x) {
      return '<div class="task"><button type="button" class="link" data-file="' + esc(x.id) + '">' + esc(x.name) + '</button>' + (del ? ' <button type="button" class="link danger" data-filedel="' + esc(x.id) + '">מחיקה</button>' : '') + '</div>';
    }).join('');
  }
  function fieldHtml(sec, f) {
    var val = initial(sec.id, f);
    if (f.t === 'table') return tableHtml(f, val);
    if (f.t === 'plan') return planHtml(f, val);
    if (f.t === 'repeat') return repeatHtml(f, val);
    if (f.t === 'file') return fileHtml(f, sec.id);
    var hint = f.h ? '<span class="hint">' + esc(f.h) + '</span>' : '';
    if (f.t === 'area') return '<label class="f"><b>' + esc(f.l) + '</b>' + hint + '<textarea data-f="' + f.k + '">' + esc(val) + '</textarea></label>';
    return '<label class="f"><b>' + esc(f.l) + '</b>' + hint + '<input type="text"' + (f.t === 'num' ? ' inputmode="numeric"' : '') + ' data-f="' + f.k + '" value="' + esc(val) + '"></label>';
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
  var Q = { id: null, sec: null, patch: {}, timer: null, busy: false, fails: 0 };
  function draftKey() { return 'vaada_draft_' + Q.id + '_' + Q.sec; }
  function setSaved(t, bad) { var el = $('#saved'); if (el) { el.textContent = t; el.className = 'saved' + (bad ? ' bad' : ''); } }
  function queue(k, val) {
    Q.patch[k] = val;
    try { localStorage.setItem(draftKey(), JSON.stringify(Q.patch)); } catch (e) {}
    setSaved('שומר…');
    clearTimeout(Q.timer);
    Q.timer = setTimeout(flush, 900);
  }
  function flush() {
    clearTimeout(Q.timer);
    if (Q.busy || !Q.id || !Object.keys(Q.patch).length) return Promise.resolve(true);
    var patch = Q.patch, id = Q.id, sec = Q.sec, dk = draftKey();
    Q.patch = {}; Q.busy = true;
    return api('save', { id: id, sec: sec, patch: patch }).then(function (r) {
      Q.busy = false;
      if (r.ok) {
        Q.fails = 0;
        try { if (Q.sec !== sec || !Object.keys(Q.patch).length) localStorage.removeItem(dk); } catch (e) {}
        var x = S.V && S.V.v.id === id ? (S.V.secs[sec] = S.V.secs[sec] || { data: {}, status: 'started' }) : null;
        if (x) { Object.keys(patch).forEach(function (k) { x.data[k] = patch[k]; }); x.status = r.status; }
        setSaved('נשמר ' + fmtAt(r.at).split(' ').pop());
        if (Object.keys(Q.patch).length) return flush();
        return true;
      }
      Q.patch = Object.assign(patch, Q.patch);
      Q.fails++;
      setSaved('לא נשמר: ' + errText(r.error), true);
      if (r.error === 'network' || r.error === 'server') Q.timer = setTimeout(flush, Math.min(30000, 4000 * Q.fails));
      return false;
    }).catch(function () { Q.busy = false; return false; });
  }
  function flushNow() { if (Q.id && Object.keys(Q.patch).length) flush(); }
  window.addEventListener('beforeunload', function (e) {
    if (Q.id && (Object.keys(Q.patch).length || Q.busy)) { flushNow(); e.preventDefault(); e.returnValue = ''; }
  });

  /* ===== מילוי תחום ===== */
  function viewEdit(secId) {
    var V = S.V, v = V.v, sec = VAADA.section(v.stage, secId);
    if (!sec) return failed('notfound');
    if (!V.caps.full && V.caps.mine.indexOf(secId) < 0) return failed('forbidden');
    var edit = V.caps.edit.indexOf(secId) > -1;
    if (!edit) return viewRead(secId);
    Q.id = v.id; Q.sec = secId; Q.patch = {}; Q.fails = 0;
    /* טיוטה שלא הגיעה לשרת (נפל החיבור) */
    var pending = null;
    try { pending = JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch (e) {}
    if (pending) {
      var d = (V.secs[secId] = V.secs[secId] || { data: {}, status: 'started' }).data;
      Object.keys(pending).forEach(function (k) { d[k] = pending[k]; });
      Q.patch = pending;
    }
    var vis = visibleSecs(), idx = vis.map(function (s) { return s.id; }).indexOf(secId);
    var h = '<a class="crumb" href="#v/' + v.id + '" data-keep>→ ' + (V.caps.full ? 'כל התחומים' : 'התחומים שלי') + '</a>' +
      '<div class="head"><h1>' + esc(sec.title) + '</h1><p>' + esc(v.school) + ' · ועדת ' + esc(VAADA.STAGES[v.stage]) + ' ' + esc(v.year) + '. בלי שמות תלמידים, בבקשה.</p></div>';
    h += prevBox(secId);
    h += '<form class="card" id="sf" onsubmit="return false">' + sec.fields.map(function (f) { return fieldHtml(sec, f); }).join('') + '</form>';
    var isDone = secStatus(secId) === 'done';
    h += '<div class="savebar"><span class="saved" id="saved">הכול נשמר אוטומטית</span>' +
      (idx < vis.length - 1 ? '<a class="btn small" href="#v/' + v.id + '/e/' + vis[idx + 1].id + '">לתחום הבא ←</a>' : '') +
      '<button type="button" class="btn small primary" id="doneBtn">' + (isDone ? 'לפתוח שוב לעריכה' : 'סיימתי את התחום') + '</button></div>';
    APP.innerHTML = h;
    var form = $('#sf');
    wirePrev(secId);
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
      if (f) queue(k, readField(form, f));
    }
    form.addEventListener('input', function (e) { changed(e.target); });
    form.addEventListener('change', function (e) {
      if (e.target.type === 'file') return;
      changed(e.target);
    });
    form.addEventListener('click', function (e) {
      var t = e.target, k;
      if ((k = t.getAttribute('data-addrow'))) {
        var f = fieldDef(sec, k), tbl = $('[data-table="' + k + '"] tbody', form);
        tbl.insertAdjacentHTML('beforeend', tableRow(f, null, tbl.children.length));
      } else if (t.hasAttribute('data-delrow')) {
        var tb = t.closest('[data-table]');
        t.closest('tr').parentNode.removeChild(t.closest('tr'));
        changed(tb);
      } else if ((k = t.getAttribute('data-addrep'))) {
        var rf = fieldDef(sec, k), wrap = $('[data-repeat="' + k + '"]', form);
        wrap.insertAdjacentHTML('beforeend', repeatItem(rf, {}, wrap.children.length).replace('<details class="block" ', '<details class="block" open '));
      } else if (t.hasAttribute('data-delrep')) {
        var w = t.closest('[data-repeat]');
        if (confirm('למחוק את כל מה שנכתב ב' + 'פריט הזה?')) { t.closest('[data-item]').parentNode.removeChild(t.closest('[data-item]')); changed(w); }
      } else if (t.getAttribute('data-file')) fileOpen(t.getAttribute('data-file'));
      else if (t.getAttribute('data-filedel')) fileDel(t.getAttribute('data-filedel'), secId);
    });
    $$('[data-up]', form).forEach(function (inp) {
      inp.onchange = function () { upload(inp, secId); };
    });
    $('#doneBtn').onclick = function () {
      var b = this, wasDone = secStatus(secId) === 'done';
      b.disabled = true;
      flush().then(function () {
        return api('save', { id: v.id, sec: secId, patch: {}, done: !wasDone });
      }).then(function (r) {
        b.disabled = false;
        if (!r.ok) return toast(errText(r.error));
        V.secs[secId] = V.secs[secId] || { data: {} };
        V.secs[secId].status = r.status;
        S.board = null;
        toast(wasDone ? 'התחום נפתח לעריכה' : 'התחום סומן כהושלם. תודה!');
        go('#v/' + v.id);
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
  function canReflect() {
    var c = S.V.caps;
    return S.V.v.status !== 'closed' && (c.manage || c.decide || c.mine.length > 0);
  }
  function prevTask(t) {
    var can = canReflect(), id = esc(t.id), h = '<div class="ptask" data-pt="' + id + '">';
    h += '<div class="ttxt">' + esc(t.text) + (t.draft === 'כן' ? '<span class="draftnote">טיוטה</span>' : '') + '</div>' + (t.owner ? '<div class="town">אחריות: ' + esc(t.owner) + '</div>' : '');
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
    if (file.size > 8 * 1024 * 1024) return toast(ERR.toolarge);
    var field = inp.getAttribute('data-up'), r = new FileReader();
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
      var bin = atob(r.b64), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([arr], { type: r.mime || 'application/octet-stream' }));
      var a = document.createElement('a');
      a.href = url; a.download = r.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }).catch(function () {});
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
    var d = (S.V.secs[sec.id] || {}).data || {}, val = d[f.k], h = '<div class="f"><span class="lbl">' + esc(f.l) + '</span>';
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
    var h = '<a class="crumb" href="#v/' + V.v.id + '" data-keep>→ כל התחומים</a><div class="head"><h1>' + esc(sec.title) + '</h1><p>' + esc(V.v.school) + '</p></div>' + prevBox(secId) +
      '<div class="card ro">' + sec.fields.map(function (f) { return roField(sec, f); }).join('') + '</div>';
    APP.innerHTML = h;
    wirePrev(secId);
    $$('[data-file]').forEach(function (b) { b.onclick = function () { fileOpen(b.getAttribute('data-file')); }; });
  }

  /* ===== מצב ועדה: תחום אחד על המסך, ולצידו הערות והחלטות ===== */
  function viewLive(secId) {
    var V = S.V, v = V.v;
    if (!V.caps.full) return failed('forbidden');
    var all = secs();
    var sec = VAADA.section(v.stage, secId) || all[0];
    var idx = all.indexOf(sec), base = '#v/' + v.id + '/live/';
    var nav = '<div class="lnav">' + (idx > 0 ? '<a class="btn small" href="' + base + all[idx - 1].id + '">→ הקודם</a>' : '') +
      '<select id="lsel" aria-label="מעבר לתחום">' + all.map(function (s) { return '<option value="' + s.id + '"' + (s === sec ? ' selected' : '') + '>' + esc(s.title) + '</option>'; }).join('') + '</select>' +
      (idx < all.length - 1 ? '<a class="btn small" href="' + base + all[idx + 1].id + '">הבא ←</a>' : '<a class="btn small primary" href="#v/' + v.id + '/sum">לסיכום ←</a>') + '</div>';
    var main = '<div class="lmain"><div class="card ro"><h2 style="margin-bottom:12px">' + esc(sec.title) + '</h2>' + sec.fields.map(function (f) { return roField(sec, f); }).join('') + '</div></div>';
    var side = '<aside class="lside">' + notesCard() + decideCard() + '</aside>';
    var pb = prevBox(sec.id);
    APP.innerHTML = vHead() + nav + pb + '<div class="live">' + main + side + '</div>';
    wirePrev(sec.id);
    $('#lsel').onchange = function () { go(base + this.value); };
    $$('[data-file]').forEach(function (b) { b.onclick = function () { fileOpen(b.getAttribute('data-file')); }; });
    drawNotes(sec.id); drawDecisions(sec.id);
    wireLive(sec.id);
    /* הערות והחלטות של האחרים מגיעות תוך חצי דקה */
    var mine = ++liveId;
    (function tick() {
      pollT = setTimeout(function () {
        if (mine !== liveId) return;
        api('live', { id: v.id }).then(function (r) {
          if (mine !== liveId || !r.ok) return;
          V.notes = r.notes; V.tasks = r.tasks;
          drawNotes(sec.id);
          /* לא לצייר מחדש רשימה בזמן עריכת החלטה */
          if (!$('#tform') || !$('#tform').contains(document.activeElement)) drawDecisions(sec.id);
          tick();
        }).catch(function () {});
      }, 30000);
    })();
  }
  function notesCard() {
    var can = S.V.caps.note && S.V.v.status !== 'closed';
    return '<div class="card" style="margin:0"><h3>הערות בדיון</h3><div id="nlist"></div>' + (can ? '<form id="nform" style="margin-top:9px"><textarea rows="2" id="ntext" style="min-height:64px" placeholder="הערה לתחום הזה" aria-label="הערה"></textarea><button class="btn small primary" style="margin-top:7px;width:100%">הוספת הערה</button></form>' : '') + '</div>';
  }
  function decideCard() {
    var can = S.V.caps.decide;
    return '<div class="card" style="margin:0"><h3>החלטות ומשימות</h3><div id="tlist"></div>' + (can ? '<form id="tform" style="margin-top:10px"><input type="hidden" id="tid">' +
      '<label class="f" style="margin-bottom:8px"><b>החלטה</b><textarea rows="2" id="ttext" style="min-height:62px"></textarea></label>' +
      '<label class="f" style="margin-bottom:8px"><b>גורם מרכזי ליישום</b><input type="text" id="towner"></label>' +
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
      (t.owner ? '<small>אחריות: ' + esc(t.owner) + '</small>' : '') + (t.measure ? '<small>מדד: ' + esc(t.measure) + '</small>' : '') + (t.res ? '<small>משאבים: ' + esc(t.res) + '</small>' : '') + (t.follow ? '<small>מעקב: ' + fmtDate(t.follow) + '</small>' : '') +
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
      var task = { id: $('#tid').value, sec: sec, text: text, owner: $('#towner').value, res: $('#tres').value, measure: $('#tmeasure').value, follow: $('#tfollow').value };
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
        $('#tid').value = t.id; $('#ttext').value = t.text; $('#towner').value = t.owner; $('#tres').value = t.res; $('#tmeasure').value = t.measure; $('#tfollow').value = t.follow;
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
  function viewSum() {
    var V = S.V, v = V.v;
    if (!V.caps.full) return failed('forbidden');
    var h = vHead();
    var deadline = '';
    if (v.date && v.status !== 'closed') {
      var d = new Date(v.date + 'T12:00:00'); d.setDate(d.getDate() + 2);
      deadline = '<div class="deadline">לפי הנוהל, סיכום הוועדה נשלח לכלל המשתתפים בתוך 48 שעות: עד ' + fmtDate(d.toISOString().slice(0, 10)) + '.</div>';
    }
    h += deadline;
    var canClose = V.caps.manage || V.caps.decide;
    h += '<div class="acts" style="margin:0 0 14px"><button type="button" class="btn small" id="printBtn">הדפסה / PDF</button>' +
      mailBtn({ id: 'mailSum', cls: 'btn small', label: 'מייל לכלל המשתתפים', to: v.emails, subject: 'סיכום הוועדה המלווה: ' + v.school, lines: sumLines(), html: true }) +
      (v.status !== 'closed' && canClose ? '<button type="button" class="btn small primary" id="closeBtn">סגירת הוועדה</button>' : '') +
      (v.status === 'closed' && V.caps.manage ? '<button type="button" class="btn small" id="reopenBtn">פתיחה מחדש</button>' : '') + '</div>';
    h += protocolHtml();
    APP.innerHTML = h;
    $('#printBtn').onclick = function () { window.print(); };
    wireMail();
    var cb = $('#closeBtn');
    if (cb) cb.onclick = function () {
      if (!confirm('לסגור את הוועדה? אחרי הסגירה אי אפשר לערוך, והמשימות עוברות לוועדה הבאה. המנהל.ת יכול.ה לפתוח מחדש.')) return;
      api('close', { id: v.id }).then(function (r) { if (!r.ok) return toast(errText(r.error)); S.board = null; route(); }).catch(function () {});
    };
    var rb = $('#reopenBtn');
    if (rb) rb.onclick = function () {
      api('reopen', { id: v.id }).then(function (r) { if (!r.ok) return toast(errText(r.error)); S.board = null; route(); }).catch(function () {});
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
    if (!V.tasks.length && !V.notes.length && !pt.length) h += '<p class="empty">עדיין אין החלטות. הן נכתבות בלשונית "בוועדה".</p>';
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
