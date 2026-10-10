/* צוהר · צ'ק ליסט (11.10.26, מיטל).
   שתי לשוניות תחת "צ'ק ליסט" בתפריט:
     משרדי — המשימות של המנהל להכשרה מקצועית (מה שהיה "מה חסר" + הצ'ק ליסט למנהלים מ-tfasim). הנתונים מ-app.js.
     אישי  — משימות שהמנהל/ת או הרכז/ת הוסיפו לבד או מתשובה של קרן. נשמר בשרת של קרן (לשונית "צ'ק ליסט"), פרטי לבית הספר.
   בכל משימה: תזכורת ביומן (גוגל / קובץ .ics לאאוטלוק ולאייפון) ומייל למי שמטפל/ת
   (בנייד mailto אמיתי שנבנה כשהחלונית מצוירת; במחשב טיוטת Gmail + העתקת HTML מימין לשמאל, ולצדה mailto).
   המייל יוצא מהתיבה של המנהל/ת עצמם. */
(function () {
  'use strict';
  var T = window.TZOHAR;
  if (!T) return;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function isMobile() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (window.matchMedia && matchMedia('(pointer:coarse)').matches && innerWidth < 900); }
  var IC = {
    cal:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    ok:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
    wait: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
    ext:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
    del:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    dl:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>'
  };

  /* ===== תאריכים ===== */
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  /* ברירת המחדל לתזכורת: יום ראשון הקרוב (היום, אם היום יום ראשון) — מיטל אישרה 11.10.26 */
  function nextSunday() { var d = new Date(); d.setDate(d.getDate() + (7 - d.getDay()) % 7); return iso(d); }
  function heDate(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (+m[3]) + '.' + (+m[2]) : ''; }
  function late(s) { return s && s < iso(new Date()); }

  /* ===== קישורים — מפתח → כתובת או עמוד בצוהר (קרן מחזירה רק מפתח) ===== */
  function linkOf(k) {
    var L = T.links();
    return {
      nispach:     { url: L.nispach, label: 'לנספח בעלי התפקידים' },
      bs:          { url: L.bs, label: 'להגשת הבקשה' },
      rg:          { url: L.rg, label: 'לטופס הרישום' },
      menor:       { url: L.menor, label: 'מי עוד לא נרשם במנור' },
      'menor-msg': { go: 'm', label: 'להודעה למורים' },
      school:      { go: 's', label: 'לבית הספר שלי' },
      plans:       { go: 'p', label: 'לתוכניות שלי' }
    }[k] || null;
  }
  function linkBtn(k, cls) {
    var l = linkOf(k); if (!l) return '';
    return l.url ? '<a class="btn ' + (cls || 'primary') + ' sm" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + IC.ext + '</a>'
                 : '<button type="button" class="btn ' + (cls || 'primary') + ' sm" data-go="' + l.go + '">' + esc(l.label) + '</button>';
  }

  /* ===== אנשים: מי מטפל/ת → מייל (מאנשי הקשר והנספח של בית הספר) ===== */
  function people() { return T.people() || []; }
  function matchWho(who) {
    var w = String(who || '');
    if (!w) return null;
    var best = null;
    people().forEach(function (p) {
      if (!p.email || best) return;
      var parts = String(p.name || '').trim().split(/\s+/);
      if (parts.length >= 2 && w.indexOf(parts[0]) > -1 && w.indexOf(parts[parts.length - 1]) > -1) best = p;
    });
    return best;
  }

  /* ===== רשת (דרך השרת של קרן) ===== */
  function on() { return !!(window.KEREN && KEREN.enabled()); }
  function api(body, ms) { return on() ? KEREN.call(body, ms || 60000) : Promise.reject(new Error('off')); }
  var TASKS = null, LOADING = null, ERR = '';
  function cacheKey() { var s = T.school(); return 'tzohar.tasks.' + (s ? s.semel : '') + '.' + T.role(); }
  function load() {
    if (LOADING) return LOADING;
    if (TASKS === null) { try { TASKS = JSON.parse(localStorage.getItem(cacheKey()) || 'null'); } catch (e) {} }
    LOADING = api({ action: 'tasks' }).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.error || 'x');
      TASKS = r.tasks || []; ERR = ''; keep();
    }).catch(function (e) { ERR = String(e.message || 'x'); if (TASKS === null) TASKS = []; })
      .then(function () { LOADING = null; T.refresh(); });
    return LOADING;
  }
  function keep() { try { localStorage.setItem(cacheKey(), JSON.stringify(TASKS)); } catch (e) {} }
  function mine() { return (TASKS || []).filter(function (t) { return t.id.indexOf('o-') !== 0; }); }
  function openCount() { return mine().filter(function (t) { return t.mine && !t.done; }).length; }
  function officeDone(key) { var t = (TASKS || []).filter(function (x) { return x.id === 'o-' + key && x.mine; })[0]; return !!(t && t.done); }

  function add(list, origin) {
    list = (list || []).map(function (t) {
      var p = t.email ? null : matchWho(t.who);
      return { text: t.text, who: t.who || '', email: t.email || (p ? p.email : ''), due: t.due || '', link: t.link || '', src: t.src || '' };
    });
    return api({ action: 'taskAdd', tasks: list, origin: origin || 'manual' }).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.error || 'x');
      TASKS = (TASKS || []).concat(r.tasks || []); keep(); T.refresh(true);
      return r.tasks;
    });
  }
  function setTask(id, fields) {
    var t = (TASKS || []).filter(function (x) { return x.id === id; })[0];
    var before = t ? JSON.stringify(t) : null;
    if (t) Object.keys(fields).forEach(function (k) { t[k] = fields[k]; });
    else TASKS.push({ id: id, done: !!fields.done, mine: true, role: T.role(), text: fields.text || '' });
    keep();
    return api({ action: 'taskSet', id: id, fields: fields }).then(function (r) {
      if (!r || !r.ok) throw new Error(r && r.error || 'x');
    }).catch(function () {
      if (t && before) { var o = JSON.parse(before); Object.keys(o).forEach(function (k) { t[k] = o[k]; }); }
      else TASKS = TASKS.filter(function (x) { return x.id !== id; });
      keep(); T.refresh(true); T.toast('השמירה נכשלה. נסו שוב.');
    });
  }

  /* ===== יומן ===== */
  function gcalUrl(title, details, date) {
    var d = date.replace(/-/g, '');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) +
      '&dates=' + d + 'T083000/' + d + 'T090000&ctz=Asia/Jerusalem&details=' + encodeURIComponent(details);
  }
  function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  /* זמן "צף" (בלי אזור זמן) = 08:30 לפי השעון של המכשיר. תזכורת בזמן האירוע */
  function icsHref(title, details, date) {
    var d = date.replace(/-/g, ''), now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//tzohar//he', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + d + '-' + Math.random().toString(36).slice(2, 10) + '@tzohar', 'DTSTAMP:' + now,
      'DTSTART:' + d + 'T083000', 'DTEND:' + d + 'T090000', 'SUMMARY:' + icsEsc(title), 'DESCRIPTION:' + icsEsc(details),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(title), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  }

  /* ===== מייל ===== */
  function mailContent(R, to) {
    var p = people().filter(function (x) { return x.email === to; })[0];
    var first = p ? String(p.name || '').replace(/^ד["״]ר\s+/, '').trim().split(/\s+/)[0] : '';
    var me = String((T.me() || {}).name || '').trim(), l = linkOf(R.link);
    var head = ['שלום' + (first ? ' ' + first : '') + ',', '', 'אשמח שתטפל/י במשימה הזו:', R.title];
    if (R.detail) head.push(R.detail);
    if (R.due) head.push('עד: ' + heDate(R.due));
    var foot = ['', 'תודה' + (me ? ',' : ''), me];
    var url = l && l.url ? l.url : '';
    var text = head.concat(url ? ['', 'הקישור: ' + url] : []).concat(foot).join('\n').replace(/\n+$/, '');
    /* ב-HTML הקישור הוא טקסט קצר ולא כתובת ארוכה */
    var html = '<div dir="rtl" style="direction:rtl;text-align:right;font-family:Arial,sans-serif;font-size:15px;line-height:1.6">' +
      head.map(esc).join('<br>') + (url ? '<br><br><a href="' + esc(url) + '">' + esc(l.label) + '</a>' : '') + foot.map(esc).join('<br>').replace(/(<br>)+$/, '') + '</div>';
    return { sub: 'משימה מ' + (T.school() ? T.school().name : 'צוהר') + ': ' + R.title.slice(0, 80), text: text, html: html };
  }
  function copyHtml(html, text) {
    var ok = false;
    function onCopy(ev) { ev.clipboardData.setData('text/html', html); ev.clipboardData.setData('text/plain', text); ev.preventDefault(); }
    document.addEventListener('copy', onCopy);
    try {
      var d = document.createElement('div'); d.contentEditable = 'true'; d.innerHTML = html; d.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(d);
      var r = document.createRange(); r.selectNodeContents(d); var s = getSelection(); s.removeAllRanges(); s.addRange(r);
      ok = document.execCommand('copy'); s.removeAllRanges(); document.body.removeChild(d);
    } catch (e) { ok = false; }
    document.removeEventListener('copy', onCopy);
    return ok;
  }

  /* ===== רישום המשימות שעל המסך (לחלוניות היומן והמייל) ===== */
  var REG = {};
  /* R: { key, kind: 'office'|'mine', id, title, detail, due, who, email, link, readOnly } */
  function reg(R) { REG[R.key] = R; return R.key; }

  /* שורת משימה. box: 'check' (אפשר לסמן) / 'auto' (המערכת קובעת) */
  function row(R, o) {
    reg(R);
    var st = o.st, done = st === 'done';
    var box = o.box === 'check'
      ? '<button type="button" class="ck-box" data-ck="toggle" role="checkbox" aria-checked="' + done + '" aria-label="' + (done ? 'בוצע — ביטול הסימון' : 'סימון שבוצע') + '"' + (R.readOnly ? ' disabled' : '') + '>' + (done ? IC.ok : '') + '</button>'
      : '<span class="ck-st ' + (done ? 'ok' : st === 'wait' ? 'wait' : st === 'gap' ? 'gap' : 'mute') + '" title="' + (done ? 'הושלם' : st === 'wait' ? 'בטיפול' : st === 'gap' ? 'חסר' : '') + '">' +
          (done ? IC.ok : st === 'wait' ? IC.wait : '') + '</span>';
    var meta = [];
    if (R.who) meta.push('<span>' + esc(R.who) + '</span>');
    if (R.due) meta.push('<span class="' + (late(R.due) && !done ? 'late' : '') + '">עד ' + heDate(R.due) + '</span>');
    if (R.src) meta.push('<span class="ck-src">' + esc(R.src) + '</span>');
    if (o.tag) meta.unshift(o.tag);
    var tools = done ? '' : '<button type="button" class="ck-tool" data-ck="cal" aria-expanded="false">' + IC.cal + 'תזכורת ביומן</button>' +
      '<button type="button" class="ck-tool" data-ck="mail" aria-expanded="false">' + IC.mail + 'מייל למטפל/ת</button>';
    var del = R.kind === 'mine' && !R.readOnly ? '<button type="button" class="ck-tool ck-del" data-ck="del" aria-label="מחיקת המשימה">' + IC.del + '</button>' : '';
    return '<li class="ck-i' + (done ? ' done' : '') + '" data-key="' + esc(R.key) + '">' + box +
      '<div class="ck-tx"><div class="ck-t">' + esc(R.title) + '</div>' +
      (o.detail ? '<div class="ck-d">' + o.detail + '</div>' : '') +
      (meta.length ? '<div class="ck-m">' + meta.join('') + '</div>' : '') +
      ((o.acts || tools || del) ? '<div class="ck-a">' + (done ? '' : (o.acts || '')) + tools + del + '</div>' : '') +
      '<div class="ck-p" hidden></div></div></li>';
  }

  /* ===== הצ'ק ליסט המשרדי — הפריטים מגיעים מ-app.js ===== */
  function officeHtml(items) {
    var open = items.filter(function (x) { return x.st !== 'done'; }), done = items.filter(function (x) { return x.st === 'done'; });
    var r = function (x) {
      return row({ key: 'o-' + x.k, kind: 'office', id: 'o-' + x.k, title: x.t, detail: x.plain || '', due: '', link: x.link || '' },
                 { st: x.st, box: x.manual ? 'check' : 'auto', detail: x.html, acts: x.acts });
    };
    return '<ul class="ck">' + open.map(r).join('') + '</ul>' +
      (done.length ? '<details class="ck-done"><summary>הושלמו (' + done.length + ')</summary><ul class="ck">' + done.map(r).join('') + '</ul></details>' : '');
  }

  /* ===== הצ'ק ליסט האישי ===== */
  function mountMine(el) {
    if (!on()) { el.innerHTML = '<div class="card"><div class="empty">הצ\'ק ליסט האישי עוד לא פעיל.</div></div>'; return; }
    if (TASKS === null || (LOADING && !(TASKS || []).length)) { el.innerHTML = '<div class="card"><div class="empty">טוען את המשימות…</div></div>'; load(); return; }
    var rk = T.role() === 'rakaz', all = mine();
    var my = all.filter(function (t) { return t.mine; }), other = all.filter(function (t) { return !t.mine; });
    var open = my.filter(function (t) { return !t.done; }), done = my.filter(function (t) { return t.done; });
    open.sort(function (a, b) { return (a.due || '9') < (b.due || '9') ? -1 : (a.due || '9') > (b.due || '9') ? 1 : 0; });
    var opts = '<option value="">מי מטפל/ת? (לא חובה)</option><option value="__me">אני</option>' + people().filter(function (p) { return p.email; }).map(function (p) {
      return '<option value="' + esc(p.email) + '">' + esc(p.name + (p.role ? ' · ' + p.role : '')) + '</option>';
    }).join('');
    var h = '<form class="card ck-add" id="ckAdd"><label for="ckText" class="eyebrow">' + IC.plus + 'משימה חדשה</label>' +
      '<input class="fld" id="ckText" maxlength="400" placeholder="מה צריך לעשות?" autocomplete="off">' +
      '<div class="ck-row"><select class="fld" id="ckWho" aria-label="מי מטפל/ת">' + opts + '</select>' +
      '<label class="ck-date"><span>עד</span><input class="fld" type="date" id="ckDue" value="' + nextSunday() + '"></label>' +
      '<button type="submit" class="btn primary">הוספה</button></div>' +
      '<p class="small" style="margin:8px 0 0">אפשר גם להוסיף משימות ישר מהתשובות של קרן.</p></form>';
    if (ERR && !my.length) h += '<div class="card"><div class="empty">לא הצלחנו לטעון את המשימות. רענון הדף ינסה שוב.</div></div>';
    else if (!my.length) h += '<div class="card"><div class="empty">עוד אין משימות. כתבו משימה למעלה, או שאלו את קרן "מה הכי דחוף אצלנו השבוע?" והוסיפו מהתשובה.</div></div>';
    else {
      h += '<div class="card ck-card"><ul class="ck">' + open.map(function (t) { return mineRow(t); }).join('') + '</ul>' +
        (!open.length ? '<div class="allok" style="margin:0">' + IC.ok + 'כל המשימות בוצעו.</div>' : '') +
        (done.length ? '<details class="ck-done"><summary>בוצעו (' + done.length + ')</summary><ul class="ck">' + done.map(function (t) { return mineRow(t); }).join('') + '</ul></details>' : '') + '</div>';
    }
    if (!rk && other.length) {
      h += '<h2 class="pt">המשימות של הרכז/ת הפדגוגי/ת</h2><div class="card ck-card"><ul class="ck">' +
        other.map(function (t) { return mineRow(t, true); }).join('') + '</ul></div>';
    }
    el.innerHTML = h;
    $('ckAdd').onsubmit = function (e) {
      e.preventDefault();
      var text = $('ckText').value.trim(); if (!text) { $('ckText').focus(); return; }
      var v = $('ckWho').value, p = people().filter(function (x) { return x.email === v; })[0];
      var who = v === '__me' ? 'אני' : p ? p.name : '', email = v === '__me' ? '' : v;
      var b = this.querySelector('button[type=submit]'); b.disabled = true;
      add([{ text: text, who: who, email: email, due: $('ckDue').value }], 'manual').then(function () { T.toast('נוסף לצ\'ק ליסט'); })
        .catch(function () { b.disabled = false; T.toast('ההוספה נכשלה. נסו שוב.'); });
    };
  }
  function mineRow(t, ro) {
    return row({ key: t.id, kind: 'mine', id: t.id, title: t.text, due: t.due, who: t.who, email: t.email, src: t.src ? 'מקור: ' + t.src : '', link: t.link, readOnly: !!ro || !t.mine },
               { st: t.done ? 'done' : 'gap', box: 'check', acts: linkBtn(t.link, ''), tag: t.origin === 'keren' ? '<span class="ck-tag">מקרן</span>' : '' });
  }

  /* ===== חלוניות יומן ומייל — מתחת לשורה, עם קישורים אמיתיים ===== */
  function panelCal(R, p, date) {
    var d = date || R.due || nextSunday();
    var details = [R.detail, T.school() ? 'צוהר · ' + T.school().name : ''].filter(Boolean).join('\n');
    var l = linkOf(R.link); if (l && l.url) details += '\n' + l.url;
    p.innerHTML = '<div class="ck-pt">' + IC.cal + 'תזכורת ביומן</div>' +
      '<div class="ck-row"><label class="ck-date"><span>ביום</span><input class="fld" type="date" data-ckf="date" value="' + esc(d) + '"></label><span class="small">בשעה 8:30</span></div>' +
      '<div class="acts" style="margin-top:8px"><a class="btn primary sm" target="_blank" rel="noopener" href="' + esc(gcalUrl(R.title, details, d)) + '">' + IC.cal + 'ליומן גוגל</a>' +
      '<a class="btn sm" download="tzohar-' + esc(R.key) + '.ics" href="' + esc(icsHref(R.title, details, d)) + '">' + IC.dl + 'ליומן אחר (אאוטלוק, אייפון)</a></div>';
  }
  function panelMail(R, p, to) {
    to = to === undefined ? (R.email || '') : to;
    var list = people().filter(function (x) { return x.email; });
    var opts = '<option value="">בחירת נמען/ת…</option>' + list.map(function (x) {
      return '<option value="' + esc(x.email) + '"' + (x.email === to ? ' selected' : '') + '>' + esc(x.name + (x.role ? ' · ' + x.role : '')) + '</option>';
    }).join('') + '<option value="__other"' + (to && !list.some(function (x) { return x.email === to; }) ? ' selected' : '') + '>כתובת אחרת…</option>';
    var other = to && !list.some(function (x) { return x.email === to; });
    var m = mailContent(R, to), href = 'mailto:' + encodeURIComponent(to).replace(/%40/g, '@') + '?subject=' + encodeURIComponent(m.sub) + '&body=' + encodeURIComponent(m.text);
    var btns = !to ? '<span class="small">בחרו למי לשלוח.</span>' : isMobile()
      ? '<a class="btn primary sm" href="' + esc(href) + '">' + IC.mail + 'פתיחת המייל</a>'
      : '<button type="button" class="btn primary sm" data-ck="gmail">' + IC.mail + 'טיוטה ב-Gmail</button><a class="btn sm" href="' + esc(href) + '">בתוכנת המייל (Outlook)</a>';
    p.innerHTML = '<div class="ck-pt">' + IC.mail + 'מייל למי שמטפל/ת</div>' +
      '<select class="fld" data-ckf="to" aria-label="נמען/ת">' + opts + '</select>' +
      (other || p.getAttribute('data-other') ? '<input class="fld" type="email" dir="ltr" data-ckf="addr" placeholder="name@example.com" value="' + esc(other ? to : '') + '">' : '') +
      '<div class="acts" style="margin-top:8px">' + btns + '</div>' +
      (to ? '<details class="ck-prev"><summary>הנוסח</summary><div class="pre">' + esc(m.text) + '</div></details>' : '');
    p.setAttribute('data-to', to);
  }

  function rowOf(el) { var li = el.closest('.ck-i'); return li ? { li: li, R: REG[li.getAttribute('data-key')], p: li.querySelector('.ck-p') } : null; }
  function toggle(x, kind) {
    var cur = x.p.getAttribute('data-kind');
    x.li.querySelectorAll('[data-ck=cal],[data-ck=mail]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (!x.p.hidden && cur === kind) { x.p.hidden = true; return; }
    x.p.hidden = false; x.p.setAttribute('data-kind', kind); x.p.removeAttribute('data-other');
    x.li.querySelector('[data-ck=' + kind + ']').setAttribute('aria-expanded', 'true');
    if (kind === 'cal') panelCal(x.R, x.p); else panelMail(x.R, x.p);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ck]'); if (!b) return;
    var x = rowOf(b); if (!x || !x.R) return;
    var k = b.getAttribute('data-ck'), R = x.R;
    if (k === 'cal' || k === 'mail') toggle(x, k);
    else if (k === 'toggle') {
      if (R.readOnly || !on()) { if (!on()) T.toast('הסימון יפעל כשקרן תופעל'); return; }
      var t = (TASKS || []).filter(function (y) { return y.id === R.id; })[0];
      var now = !(t && t.done);
      setTask(R.id, R.kind === 'office' ? { done: now, text: R.title } : { done: now });
      T.refresh(true);
      if (now) T.toast('סומן שבוצע');
    }
    else if (k === 'del') {
      if (!confirm('למחוק את המשימה "' + R.title.slice(0, 60) + '"?')) return;
      api({ action: 'taskDel', id: R.id }).then(function (r) {
        if (!r || !r.ok) throw new Error();
        TASKS = TASKS.filter(function (y) { return y.id !== R.id; }); keep(); T.refresh(true); T.toast('נמחקה');
      }).catch(function () { T.toast('המחיקה נכשלה'); });
    }
    else if (k === 'gmail') {
      var to = x.p.getAttribute('data-to'), m = mailContent(R, to), ok = copyHtml(m.html, m.text);
      window.open('https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to) + '&su=' + encodeURIComponent(m.sub) + (ok ? '' : '&body=' + encodeURIComponent(m.text)), '_blank', 'noopener');
      T.toast(ok ? 'הנוסח הועתק. לחצו בגוף המייל ו-Ctrl+V' : 'נפתחה טיוטה');
    }
  });
  document.addEventListener('change', function (e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-ckf'); if (!f) return;
    var x = rowOf(e.target); if (!x || !x.R) return;
    if (f === 'date') {
      var d = e.target.value; if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      panelCal(x.R, x.p, d);
      if (x.R.kind === 'mine' && !x.R.readOnly && d !== x.R.due) { x.R.due = d; setTask(x.R.id, { due: d }); }
    } else if (f === 'to') {
      var v = e.target.value;
      if (v === '__other') { x.p.setAttribute('data-other', '1'); panelMail(x.R, x.p, ''); var a = x.p.querySelector('[data-ckf=addr]'); if (a) a.focus(); return; }
      x.p.removeAttribute('data-other');
      panelMail(x.R, x.p, v); saveWho(x.R, v);
    } else if (f === 'addr') {
      var v2 = e.target.value.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v2)) { T.toast('כתובת המייל לא תקינה'); return; }
      panelMail(x.R, x.p, v2); saveWho(x.R, v2);
    }
  });
  /* במשימה אישית — הנמען/ת נשמר/ת כמי שמטפל/ת */
  function saveWho(R, email) {
    if (R.kind !== 'mine' || R.readOnly || !email || email === R.email) return;
    var p = people().filter(function (x) { return x.email === email; })[0];
    R.email = email; var f = { email: email };
    if (p && !R.who) { R.who = p.name; f.who = p.name; }
    setTask(R.id, f);
  }

  window.TZTASKS = { officeHtml: officeHtml, mountMine: mountMine, add: add, load: load, officeDone: officeDone, openCount: openCount,
                     linkOf: linkOf, linkBtn: linkBtn, matchWho: matchWho, nextSunday: nextSunday, heDate: heDate, enabled: on };
  function boot() { if (on()) load(); }
  document.addEventListener('tzohar:ready', function () { setTimeout(boot, 0); });   /* אחרי ש-keren.js נדלקת */
  if (T.ready && T.ready()) setTimeout(boot, 0);
})();
