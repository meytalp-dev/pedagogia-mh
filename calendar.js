/* ===== calendar.js — "הוספה ליומן" למועדים שבאתר (T89) =====
   קובץ אחד לשלושת העמודים שיש בהם מועדים: לוח הגאנט, לוח המבחנים
   ועמוד ההשתלמויות.

   שני סוגי כפתורים:
   1. השתלמות שלמה — הרשמה ליומן מנוי (/cal/<מזהה>.ics). הקבצים נבנים ב-
      tools/build-cal.mjs מטבלאות המועדים בעמוד ההשתלמויות. היומן נכנס
      כיומן נפרד ומתעדכן לבד כשמועד משתנה. באייפון/מק נפתח ביומן של אפל
      (webcal), בשאר המכשירים ב-Google Calendar. זה עובד גם באנדרואיד —
      שם קובץ .ics שהורד לא נפתח בשום אפליקציה ולכן "לא קורה כלום".
   2. מפגש בודד — קישור ל-Google Calendar (נפתח טופס, צריך ללחוץ "שמירה")
      וקובץ .ics (Outlook, אייפון). באנדרואיד הקובץ מוסתר — הוא לא עובד שם.

   השעות הן שעון ישראל; אירוע בלי שעה נרשם כיום שלם, וטווח (2.11–16.11)
   נרשם כימים שלמים לאורך כל הטווח.

   פונקציות הפענוח (parseDt, hoursFrom) משמשות גם את tools/build-cal.mjs,
   כדי שהאתר ויומני המנוי יקראו את הטבלאות באותה צורה בדיוק.
================================================================= */
(function () {
  'use strict';
  var TZ = 'Asia/Jerusalem';
  var SITE = 'הבית של המנהיגות הפדגוגית היוצרת';
  var FEED_BASE = 'pedagogiamh.co.il/cal/';
  var HAS_DOM = typeof document !== 'undefined';
  var nav = typeof navigator !== 'undefined' ? navigator : {};
  var UA = nav.userAgent || '';
  var IS_IOS = /iPhone|iPad|iPod/.test(UA) || (/Macintosh/.test(UA) && nav.maxTouchPoints > 1);
  var IS_APPLE = IS_IOS || /Macintosh/.test(UA);
  var IS_ANDROID = /Android/i.test(UA);
  var IS_MOBILE = IS_IOS || IS_ANDROID;

  /* ---------- עזרים ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(date) { return date.replace(/-/g, ''); }
  function iso(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function hm(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? pad(+m[1]) + m[2] + '00' : null; }
  function nextDay(date) {
    var p = date.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2] + 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function icsText(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, function (c) { return '\\' + c; });
  }
  function fold(line) { // שורה ב-ics לא עוברת 75 בתים — מקפלים
    // עוברים לפי נקודות-קוד (לא יחידות UTF-16) כדי שאימוג׳י/תו על-בסיסי לא ישבור את encodeURIComponent
    var out = '', bytes = 0, chars = Array.from(line);
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i], b;
      try { b = encodeURIComponent(ch).replace(/%[0-9A-F]{2}/g, 'x').length; }
      catch (e) { b = 1; }
      if (bytes + b > 72) { out += '\r\n '; bytes = 0; }
      out += ch; bytes += b;
    }
    return out;
  }
  function uid(ev) {
    var s = ev.date + '|' + ev.title + '|' + (ev.start || '') + '|' + (ev.desc || ''), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h.toString(16) + '@pedagogiamh.co.il';
  }
  function pageUrl() { return HAS_DOM ? location.origin + location.pathname : ''; }

  /* "זום · 8:30–10:30" → {start:'8:30', end:'10:30'}; "19:00" לבד → {start:'19:00'} */
  function okTime(t) { var p = t.split(':'); return +p[0] < 24 && +p[1] < 60; }
  function hoursFrom(text) {
    var m = /(?:^|[^\d])(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/.exec(text || '');
    return m && okTime(m[1]) && okTime(m[2]) ? { start: m[1], end: m[2] } : {};
  }
  function startFrom(text) { // שעת התחלה בלי שעת סיום ("19:00")
    var m = /(?:^|[^\d:])(\d{1,2}:\d{2})(?![\d:])/.exec(text || '');
    return m && okTime(m[1]) ? { start: m[1] } : {};
  }

  /* תא תאריך מהטבלאות → {date, endDate}
     "14.10.26" · "2.11–16.11.26" · "28.12–11.1" (שנה מהשורה הקודמת) · "1–3.2.27"
     prevYear — השנה של השורה הקודמת בטבלה, לתאריך שנכתב בלי שנה. */
  function yr(s) { return s.length === 2 ? 2000 + +s : +s; }
  function parseDt(text, prevYear) {
    var t = String(text || '').replace(/\s+/g, '');
    var m = /^(\d{1,2})(?:\.(\d{1,2}))?(?:\.(\d{2,4}))?(?:[–\-](\d{1,2})(?:\.(\d{1,2}))?(?:\.(\d{2,4}))?)?$/.exec(t);
    if (!m) return null;
    var d1 = +m[1], m1 = m[2] ? +m[2] : 0, y1 = m[3] ? yr(m[3]) : 0;
    var d2 = m[4] ? +m[4] : 0, m2 = m[5] ? +m[5] : 0, y2 = m[6] ? yr(m[6]) : 0;
    var ok = function (d, mo) { return mo >= 1 && mo <= 12 && d >= 1 && d <= 31; };
    if (!d2) {
      y1 = y1 || prevYear;
      return ok(d1, m1) && y1 ? { date: iso(y1, m1, d1) } : null;
    }
    if (!m2) return null;
    if (!m1) { m1 = m2; y1 = y2; }
    if (!y1 && y2) y1 = m1 <= m2 ? y2 : y2 - 1;
    if (!y1) y1 = prevYear;
    if (!y2) y2 = m2 < m1 ? y1 + 1 : y1;
    if (!ok(d1, m1) || !ok(d2, m2) || !y1) return null;
    return { date: iso(y1, m1, d1), endDate: iso(y2, m2, d2) };
  }

  /* ---------- ICS ---------- */
  function isRange(ev) { return ev.endDate && ev.endDate !== ev.date; }
  function vevent(ev, stamp) {
    var s = isRange(ev) ? null : hm(ev.start), e = hm(ev.end);
    var lines = ['BEGIN:VEVENT', 'UID:' + uid(ev),
      'DTSTAMP:' + (stamp || new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'))];
    if (s) {
      lines.push('DTSTART;TZID=' + TZ + ':' + ymd(ev.date) + 'T' + s);
      lines.push('DTEND;TZID=' + TZ + ':' + ymd(ev.date) + 'T' + (e || s));
    } else {
      lines.push('DTSTART;VALUE=DATE:' + ymd(ev.date));
      lines.push('DTEND;VALUE=DATE:' + ymd(nextDay(ev.endDate || ev.date)));
    }
    lines.push('SUMMARY:' + icsText(ev.title));
    var desc = [ev.desc, ev.url || pageUrl()].filter(Boolean).join('\n');
    if (desc) lines.push('DESCRIPTION:' + icsText(desc));
    if (ev.location) lines.push('LOCATION:' + icsText(ev.location));
    if (ev.url) lines.push('URL:' + ev.url);
    lines.push('END:VEVENT');
    return lines;
  }
  /* opts.stamp — DTSTAMP קבוע (ליומני המנוי, כדי שבנייה חוזרת לא תשנה קבצים)
     opts.feed  — יומן מנוי: מבקש מהיומן לרענן פעם ב-12 שעות */
  function ics(events, calName, opts) {
    opts = opts || {};
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//pedagogiamh.co.il//calendar//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:' + icsText(calName || SITE), 'X-WR-TIMEZONE:' + TZ];
    if (opts.feed) lines.push('REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H');
    lines = lines.concat(['BEGIN:VTIMEZONE', 'TZID:' + TZ,
      'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0300', 'TZNAME:IDT', 'DTSTART:19700327T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=FR;BYMONTHDAY=23,24,25,26,27,28,29', 'END:DAYLIGHT',
      'BEGIN:STANDARD', 'TZOFFSETFROM:+0300', 'TZOFFSETTO:+0200', 'TZNAME:IST', 'DTSTART:19701025T020000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
      'END:VTIMEZONE']);
    events.forEach(function (ev) { lines = lines.concat(vevent(ev, opts.stamp)); });
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function icsHref(events, calName) {
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics(events, calName));
  }
  function googleHref(ev) {
    var s = isRange(ev) ? null : hm(ev.start), e = hm(ev.end);
    var dates = s ? ymd(ev.date) + 'T' + s + '/' + ymd(ev.date) + 'T' + (e || s)
                  : ymd(ev.date) + '/' + ymd(nextDay(ev.endDate || ev.date));
    var q = 'action=TEMPLATE&text=' + encodeURIComponent(ev.title) + '&dates=' + dates + '&ctz=' + TZ;
    var details = [ev.desc, ev.url || pageUrl()].filter(Boolean).join('\n');
    if (details) q += '&details=' + encodeURIComponent(details);
    if (ev.location) q += '&location=' + encodeURIComponent(ev.location);
    return 'https://calendar.google.com/calendar/render?' + q;
  }
  function fileName(s) {
    return String(s || 'moed').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '-').slice(0, 60) + '.ics';
  }
  /* יומן מנוי של השתלמות שלמה */
  function feedWebcal(id) { return 'webcal://' + FEED_BASE + id + '.ics'; }
  function feedGoogle(id) { return 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(feedWebcal(id)); }

  /* שעות של שורה בטבלה, לפי סדר עדיפות: השורה עצמה → data-gs (שם המפגש בגאנט)
     → שורה שמתחת לתא rowspan ירשה את השעות מעליה → כותרת הטבלה → שעת התחלה בלבד */
  function pickHours(rowTxt, gs, inherited, headHours) {
    var h = hoursFrom(rowTxt);
    if (h.start) return h;
    h = hoursFrom(gs);
    if (h.start) return h;
    if (inherited && inherited.start) return inherited;
    if (headHours && headHours.start) return headHours;
    return startFrom(rowTxt);
  }

  /* תא שיכול להיות שם המפגש — לא מספר/שעה, לא יום ("ג׳") ולא שם חודש */
  var MONTH_RE = /^(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר)$/;
  function isTitle(t) { return t.length > 2 && !/^[\s\d:–\-·\/]*$/.test(t) && !MONTH_RE.test(t); }

  if (!HAS_DOM) { // הרצה מ-tools/build-cal.mjs — רק הפונקציות
    globalThis.pmhCal = { ics: ics, parseDt: parseDt, hoursFrom: hoursFrom, pickHours: pickHours, isTitle: isTitle };
    return;
  }

  /* ---------- כפתורים ---------- */
  var ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>';

  function button(ev, opts) {
    opts = opts || {};
    var wrap = document.createElement('span');
    wrap.className = 'cal-add' + (opts.cls ? ' ' + opts.cls : '');
    var a = document.createElement('a');
    a.className = 'cal-btn';
    a.href = icsHref([ev], ev.title);
    a.setAttribute('download', fileName(ev.title));
    a.innerHTML = ICON + '<span>ליומן</span>';
    a.title = 'הורדת קובץ יומן (.ics) — ' + ev.title;
    a.setAttribute('aria-label', 'הוספה ליומן: ' + ev.title);
    var g = document.createElement('a');
    g.className = 'cal-btn g';
    g.href = googleHref(ev);
    g.target = '_blank'; g.rel = 'noopener';
    g.textContent = 'Google';
    g.title = 'פתיחה ב-Google Calendar — בטופס שנפתח לוחצים "שמירה" · ' + ev.title;
    g.setAttribute('aria-label', 'הוספה ל-Google Calendar: ' + ev.title + ' (נפתח בלשונית חדשה, לוחצים שמירה)');
    if (IS_MOBILE) { // בטלפון Google קודם; באנדרואיד הקובץ לא נפתח בשום אפליקציה
      g.innerHTML = ICON + '<span>Google</span>';
      wrap.appendChild(g);
      if (!IS_ANDROID) wrap.appendChild(a);
    } else {
      wrap.appendChild(a); wrap.appendChild(g);
    }
    return wrap;
  }
  function bulkButton(events, label, calName) {
    var a = document.createElement('a');
    a.className = 'btn line cal-bulk';
    a.href = icsHref(events, calName);
    a.setAttribute('download', fileName(calName));
    a.innerHTML = ICON + ' ' + label + ' <small>(' + events.length + ' מועדים · .ics)</small>';
    return a;
  }
  /* קישור הרשמה ליומן מנוי: אפל → webcal, כל השאר → Google */
  function subLink(id, a) {
    if (IS_APPLE) { a.href = feedWebcal(id); }
    else { a.href = feedGoogle(id); a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }
  /* פס "הוספת כל המפגשים ליומן" מעל טבלת מועדים */
  function subscribeBar(id) {
    var bar = document.createElement('div');
    bar.className = 'cal-sub';
    var main = subLink(id, document.createElement('a'));
    main.className = 'cal-sub-btn';
    main.innerHTML = ICON + '<span>הוספת כל המפגשים ליומן</span>';
    main.setAttribute('aria-label', 'הוספת כל המפגשים ליומן' + (main.target ? ' (נפתח בלשונית חדשה)' : ''));
    bar.appendChild(main);
    if (!IS_ANDROID) { // באנדרואיד אין יומן שמקבל webcal — רק Google
      var alt = document.createElement('a');
      alt.className = 'cal-sub-alt';
      if (IS_APPLE) { alt.href = feedGoogle(id); alt.target = '_blank'; alt.rel = 'noopener'; alt.textContent = 'ל-Google Calendar'; }
      else { alt.href = feedWebcal(id); alt.textContent = 'ל-Outlook או ליומן אחר'; }
      bar.appendChild(alt);
    }
    var note = document.createElement('small');
    note.textContent = 'נכנס כיומן נפרד ומתעדכן לבד כשמועד משתנה.';
    bar.appendChild(note);
    return bar;
  }

  /* ---------- חיבור לעמודים ---------- */
  var HEB_MONTHS = { 'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'אפריל': 4, 'מאי': 5, 'יוני': 6, 'יולי': 7, 'אוגוסט': 8, 'ספטמבר': 9, 'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12 };

  /* לוח הגאנט — EVENTS/TRACKS שהעמוד חושף ב-window.PMH_GANTT */
  function wireGantt() {
    var G = window.PMH_GANTT;
    if (!G || !G.EVENTS) return;
    var evOf = function (e) {
      var h = hoursFrom(e.s);
      return { title: e.n, date: e.d, endDate: e.d2 || null, start: h.start, end: h.end,
        desc: [e.a || (G.TRACKS[e.t] || {}).aud || (G.TRACKS[e.t] || {}).name, e.s].filter(Boolean).join(' · '), url: e.u ? new URL(e.u, location.href).href : '' };
    };
    // כפתור בכל שורה ב"מהלך השנה"
    var agenda = document.getElementById('agenda');
    if (agenda) {
      [].forEach.call(agenda.querySelectorAll('.ev'), function (row) {
        var t = row.getAttribute('data-track'), b = row.querySelector('.tt b');
        if (!b) return;
        var dayTxt = (row.querySelector('.dt') || {}).textContent || '';
        var match = G.EVENTS.filter(function (e) { return e.t === t && e.n === b.textContent.trim(); });
        if (match.length > 1) { // אותו שם כמה פעמים — לפי היום בחודש
          var d = parseInt(dayTxt, 10);
          match = match.filter(function (e) { return parseInt(e.d.slice(8), 10) === d; });
        }
        if (match[0]) row.appendChild(button(evOf(match[0]), { cls: 'sm' }));
      });
    }
    // הרשמה ליומן של מסלול שלם — מתחת למקרא. הקבצים: /cal/<מסלול>.ics
    var legend = document.getElementById('legend');
    if (legend) {
      var bar = document.createElement('div');
      bar.className = 'cal-bar rv';
      bar.innerHTML = '<span class="cal-bar-t">' + ICON + ' הוספת כל מפגשי ההשתלמות שלך ליומן — בחרו השתלמות:</span>';
      Object.keys(G.TRACKS).forEach(function (tk) {
        var n = G.EVENTS.filter(function (e) { return e.t === tk; }).length;
        if (!n) return;
        var a = subLink(tk, document.createElement('a'));
        a.className = 'cal-btn t-' + tk;
        a.textContent = G.TRACKS[tk].name + ' (' + n + ')';
        a.title = 'כל ' + n + ' המועדים של ' + G.TRACKS[tk].name + ' — יומן נפרד שמתעדכן לבד';
        bar.appendChild(a);
      });
      var note = document.createElement('small');
      note.className = 'cal-bar-n';
      note.textContent = 'נכנס כיומן נפרד ומתעדכן לבד כשמועד משתנה.';
      bar.appendChild(note);
      legend.parentNode.insertBefore(bar, legend.nextSibling);
    }
  }

  /* לוח המבחנים — כרטיסי .ex עם "יום שני · 4 בינואר 2027" */
  function wireExams() {
    var grid = document.getElementById('exgrid');
    if (!grid) return;
    var all = [];
    [].forEach.call(grid.querySelectorAll('.ex'), function (card) {
      var h = card.querySelector('h2'), body = card.querySelector('.exb');
      var txt = card.textContent || '';
      var m = /(\d{1,2}) ב([א-ת]+) (20\d\d)/.exec(txt);
      if (!h || !body || !m || !HEB_MONTHS[m[2]]) return;
      var moed = card.getAttribute('data-moed') || '';
      var ev = { title: 'בחינה: ' + h.textContent.trim() + (moed ? ' · מועד ' + moed : ''),
        date: m[3] + '-' + pad(HEB_MONTHS[m[2]]) + '-' + pad(+m[1]),
        desc: 'לוח מבחנים תשפ״ז · ' + SITE };
      all.push(ev);
      body.appendChild(button(ev, { cls: 'sm' }));
    });
    if (all.length) {
      var bulk = bulkButton(all, 'כל לוח המבחנים ליומן', 'לוח מבחנים תשפ״ז');
      var wrap = document.createElement('div'); wrap.className = 'cal-bar rv'; wrap.appendChild(bulk);
      grid.parentNode.insertBefore(wrap, grid);
    }
  }

  /* השתלמויות — טבלאות .sched עם td.dt
     טבלה עם data-track (מסלול בגאנט) או data-cal (הדרכה בתחומי הדעת) מקבלת
     פס הרשמה ליומן המנוי. data-g בשורה = שם המפגש הקצר (גם בגאנט). */
  function cellText(td) {
    var c = td.cloneNode(true);
    [].forEach.call(c.querySelectorAll('.sm, .cal-add'), function (x) { x.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function rowTitle(tr, dt) {
    var tds = [].slice.call(tr.querySelectorAll('td'));
    for (var i = 0; i < tds.length; i++) {
      if (tds[i] === dt) continue;
      var t = cellText(tds[i]);
      if (isTitle(t)) return t;
    }
    return '';
  }
  function wireTables() {
    var tables = document.querySelectorAll('table.sched');
    if (!tables.length) return;
    var subbed = {};
    [].forEach.call(tables, function (tbl) {
      // הכותרת הקרובה שלפני הטבלה — שם ההשתלמות
      var ctx = document.title, heads = document.querySelectorAll('h2, h3');
      for (var i = 0; i < heads.length; i++) {
        if (heads[i].compareDocumentPosition(tbl) & Node.DOCUMENT_POSITION_FOLLOWING) ctx = cellText(heads[i]);
      }
      var th = tbl.querySelector('th');
      var headHours = hoursFrom(th ? th.textContent : '');
      var prevYear = 0, lastHours = {}, full = 0;
      [].forEach.call(tbl.querySelectorAll('tr'), function (tr) {
        var dt = tr.querySelector('td.dt');
        if (!dt) return;
        var p = parseDt(dt.textContent, prevYear);
        if (!p) return;
        prevYear = +(p.endDate || p.date).slice(0, 4);
        var rowTxt = [].map.call(tr.cells, function (c) { return c.textContent; }).join(' '), gs = tr.getAttribute('data-gs') || '';
        var short = tr.cells.length < full; // שורה שתא rowspan מעליה ממלא לה עמודה
        full = Math.max(full, tr.cells.length);
        var h = pickHours(rowTxt, gs, short ? lastHours : null, headHours);
        if (!short) lastHours = hoursFrom(rowTxt);
        var title = tr.getAttribute('data-g') || rowTitle(tr, dt) || ctx;
        var ev = { title: title, date: p.date, endDate: p.endDate || null, start: h.start, end: h.end,
          desc: [ctx, gs].filter(Boolean).join(' · ') };
        dt.appendChild(button(ev, { cls: 'sm col' }));
      });
      var feed = tbl.getAttribute('data-track') || tbl.getAttribute('data-cal');
      if (feed && !subbed[feed]) {
        subbed[feed] = true;
        tbl.parentNode.insertBefore(subscribeBar(feed), tbl);
      }
    });
  }

  function init() { wireGantt(); wireExams(); wireTables(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.pmhCal = { ics: ics, icsHref: icsHref, googleHref: googleHref, button: button, bulkButton: bulkButton,
    parseDt: parseDt, hoursFrom: hoursFrom, subscribeBar: subscribeBar };
})();
