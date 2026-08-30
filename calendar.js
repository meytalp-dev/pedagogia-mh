/* ===== calendar.js — "הוספה ליומן" למועדים שבאתר (T89) =====
   קובץ אחד לשלושת העמודים שיש בהם מועדים: לוח הגאנט, לוח המבחנים
   ועמוד ההשתלמויות. לכל מועד נוצרים שני קישורים — קובץ .ics (כל יומן:
   Outlook, iPhone, Android) וקישור ישיר ל-Google Calendar. בנוסף:
   הורדת לוח שלם (צוות בגאנט / כל לוח המבחנים) בקובץ אחד.

   אין שרת ואין ספרייה — הקובץ נבנה בדפדפן ומורד כ-Blob.
   השעות הן שעון ישראל; אירוע בלי שעה נרשם כיום שלם.

   שימוש מעמוד אחר: pmhCal.button({title, date:'YYYY-MM-DD', start:'8:30',
   end:'10:30', desc, location, url}) מחזיר אלמנט עם שני הקישורים.
================================================================= */
(function () {
  'use strict';
  var TZ = 'Asia/Jerusalem';
  var SITE = 'הבית של המנהיגות הפדגוגית היוצרת';

  /* ---------- עזרים ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(date) { return date.replace(/-/g, ''); }
  function hm(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? pad(+m[1]) + m[2] + '00' : null; }
  function nextDay(date) {
    var p = date.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2] + 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function icsText(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, function (c) { return '\\' + c; });
  }
  function fold(line) { // שורה ב-ics לא עוברת 75 בתים — מקפלים
    var out = '', bytes = 0, i = 0;
    while (i < line.length) {
      var ch = line[i], b = encodeURIComponent(ch).replace(/%[0-9A-F]{2}/g, 'x').length;
      if (bytes + b > 72) { out += '\r\n '; bytes = 0; }
      out += ch; bytes += b; i++;
    }
    return out;
  }
  function uid(ev) {
    var s = ev.date + '|' + ev.title + '|' + (ev.start || ''), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h.toString(16) + '@pedagogiamh.co.il';
  }
  /* "זום · 8:30–10:30" → {start:'8:30', end:'10:30'} */
  function hoursFrom(text) {
    var m = /(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/.exec(text || '');
    return m ? { start: m[1], end: m[2] } : {};
  }

  /* ---------- ICS ---------- */
  function vevent(ev) {
    var s = hm(ev.start), e = hm(ev.end);
    var lines = ['BEGIN:VEVENT', 'UID:' + uid(ev),
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')];
    if (s) {
      lines.push('DTSTART;TZID=' + TZ + ':' + ymd(ev.date) + 'T' + s);
      lines.push('DTEND;TZID=' + TZ + ':' + ymd(ev.date) + 'T' + (e || s));
    } else {
      lines.push('DTSTART;VALUE=DATE:' + ymd(ev.date));
      lines.push('DTEND;VALUE=DATE:' + ymd(nextDay(ev.date)));
    }
    lines.push('SUMMARY:' + icsText(ev.title));
    var desc = [ev.desc, ev.url ? ev.url : (location.origin + location.pathname)].filter(Boolean).join('\n');
    if (desc) lines.push('DESCRIPTION:' + icsText(desc));
    if (ev.location) lines.push('LOCATION:' + icsText(ev.location));
    if (ev.url) lines.push('URL:' + ev.url);
    lines.push('END:VEVENT');
    return lines;
  }
  function ics(events, calName) {
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//pedagogiamh.co.il//calendar//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:' + icsText(calName || SITE), 'X-WR-TIMEZONE:' + TZ,
      'BEGIN:VTIMEZONE', 'TZID:' + TZ,
      'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0300', 'TZNAME:IDT', 'DTSTART:19700327T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1FR', 'END:DAYLIGHT',
      'BEGIN:STANDARD', 'TZOFFSETFROM:+0300', 'TZOFFSETTO:+0200', 'TZNAME:IST', 'DTSTART:19701025T020000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
      'END:VTIMEZONE'];
    events.forEach(function (ev) { lines = lines.concat(vevent(ev)); });
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function icsHref(events, calName) {
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics(events, calName));
  }
  function googleHref(ev) {
    var s = hm(ev.start), e = hm(ev.end);
    var dates = s ? ymd(ev.date) + 'T' + s + '/' + ymd(ev.date) + 'T' + (e || s)
                  : ymd(ev.date) + '/' + ymd(nextDay(ev.date));
    var q = 'action=TEMPLATE&text=' + encodeURIComponent(ev.title) + '&dates=' + dates + '&ctz=' + TZ;
    var details = [ev.desc, ev.url || (location.origin + location.pathname)].filter(Boolean).join('\n');
    if (details) q += '&details=' + encodeURIComponent(details);
    if (ev.location) q += '&location=' + encodeURIComponent(ev.location);
    return 'https://calendar.google.com/calendar/render?' + q;
  }
  function fileName(s) {
    return String(s || 'moed').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '-').slice(0, 60) + '.ics';
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
    g.title = 'פתיחה ב-Google Calendar — ' + ev.title;
    g.setAttribute('aria-label', 'הוספה ל-Google Calendar: ' + ev.title + ' (נפתח בלשונית חדשה)');
    wrap.appendChild(a); wrap.appendChild(g);
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

  /* ---------- חיבור לעמודים ---------- */
  var HEB_MONTHS = { 'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'אפריל': 4, 'מאי': 5, 'יוני': 6, 'יולי': 7, 'אוגוסט': 8, 'ספטמבר': 9, 'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12 };

  /* לוח הגאנט — EVENTS/TRACKS שהעמוד חושף ב-window.PMH_GANTT */
  function wireGantt() {
    var G = window.PMH_GANTT;
    if (!G || !G.EVENTS) return;
    var evOf = function (e) {
      var h = hoursFrom(e.s);
      return { title: e.n, date: e.d, start: h.start, end: h.end,
        desc: [(G.TRACKS[e.t] || {}).name, e.s].filter(Boolean).join(' · '), url: e.u ? new URL(e.u, location.href).href : '' };
    };
    // כפתור בכל שורה ב"מהלך השנה"
    var agenda = document.getElementById('agenda');
    if (agenda) {
      var byKey = {};
      G.EVENTS.forEach(function (e) { byKey[e.t + '|' + e.d + '|' + e.n] = e; });
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
    // הורדת לוח צוות שלם — מתחת למקרא
    var legend = document.getElementById('legend');
    if (legend) {
      var bar = document.createElement('div');
      bar.className = 'cal-bar rv';
      bar.innerHTML = '<span class="cal-bar-t">' + ICON + ' הוספת לוח שלם ליומן:</span>';
      Object.keys(G.TRACKS).forEach(function (tk) {
        var evs = G.EVENTS.filter(function (e) { return e.t === tk; }).map(evOf);
        if (!evs.length) return;
        var a = document.createElement('a');
        a.className = 'cal-btn t-' + tk;
        a.href = icsHref(evs, G.TRACKS[tk].name + ' · תשפ״ז');
        a.setAttribute('download', fileName(G.TRACKS[tk].name));
        a.textContent = G.TRACKS[tk].name + ' (' + evs.length + ')';
        a.title = 'קובץ .ics עם כל המועדים של ' + G.TRACKS[tk].name;
        bar.appendChild(a);
      });
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

  /* השתלמויות — טבלאות .sched עם td.dt (d.m.yy) */
  function wireTables() {
    var tables = document.querySelectorAll('table.sched');
    if (!tables.length) return;
    [].forEach.call(tables, function (tbl) {
      // הכותרת הקרובה שלפני הטבלה — שם ההשתלמות
      var ctx = document.title, heads = document.querySelectorAll('h2, h3');
      for (var i = 0; i < heads.length; i++) {
        if (heads[i].compareDocumentPosition(tbl) & Node.DOCUMENT_POSITION_FOLLOWING) ctx = heads[i].textContent.replace(/\s+/g, ' ').trim();
      }
      var lastHours = '';
      [].forEach.call(tbl.querySelectorAll('tr'), function (tr) {
        var dt = tr.querySelector('td.dt');
        if (!dt) return;
        var m = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/.exec(dt.textContent);
        if (!m) return;
        var y = m[3].length === 2 ? '20' + m[3] : m[3];
        var tds = [].slice.call(tr.querySelectorAll('td')).filter(function (td) { return td !== dt && !/^\d+$/.test(td.textContent.trim()); });
        var title = tds[0] ? tds[0].textContent.replace(/\s+/g, ' ').trim() : ctx;
        var hoursTxt = tds[1] ? tds[1].textContent : lastHours;
        if (tds[1]) lastHours = tds[1].textContent;
        var h = hoursFrom(hoursTxt);
        var ev = { title: title, date: y + '-' + pad(+m[2]) + '-' + pad(+m[1]), start: h.start, end: h.end,
          desc: [ctx, hoursTxt.replace(/\s+/g, ' ').trim()].filter(Boolean).join(' · ') };
        dt.appendChild(button(ev, { cls: 'sm col' }));
      });
    });
  }

  function init() { wireGantt(); wireExams(); wireTables(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.pmhCal = { ics: ics, icsHref: icsHref, googleHref: googleHref, button: button, bulkButton: bulkButton };
})();
