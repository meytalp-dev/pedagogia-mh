/* ============================================================
   דוח שעות למונדיי — מנוע הדוח (23.9.26, שלב ד')
   -----------------------------------------------------------
   המדריכות ממלאות במונדיי של מרמנט (לוח "דוחות ביצוע") שורת משנה לכל
   פעילות: שם הפעילות · תאריך · שעת התחלה · מיקום · שעת סיום. השאר מחושב
   או נעול שם. מנור כבר יודע את רוב זה, ולכן הדוח בונה את השורות מראש:

   · הדרכה קבוצתית — מהמפגשים שנרשמה בהם נוכחות (meet.state). שעת ההתחלה
     מהתוכנית השנתית (plans.js → TS_meetingSlots); המשך מ-`hours` שהמדריכה
     כתבה ב"סיכום ההדרכה", ואם אין — מטווח השעות בתוכנית, ואם אין — 1.5.
   · הדרכה פרטנית — מהשעות הפרטניות (guide_hours). אין שם שעת התחלה,
     ולכן מוצעת ברירת מחדל והשורה מסומנת "מוצע".
   · פעילות אחרת — כפי שנרשמה (guide_activities).

   קביעות מיטל (23.9.26): מיקום ברירת מחדל = זום · השעות מוצעות והמדריכה
   מתקנת בטבלה לפני ההעתקה · פעילות אחרת נרשמת במנור.
   הקובץ בלי תלות ב-TS — כדי שאפשר יהיה לבדוק אותו לבד.
   ============================================================ */
(function () {
  const DEFAULT_LOCATION = 'זום';
  const DEFAULT_GROUP_HOURS = 1.5;
  const DEFAULT_IND_START = '16:00';

  const pad2 = n => (n < 10 ? '0' : '') + n;
  function toMin(hhmm) {
    const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }
  function fromMin(min) {
    min = ((Math.round(min) % 1440) + 1440) % 1440;
    return pad2(Math.floor(min / 60)) + ':' + pad2(min % 60);
  }
  function addHours(start, hours) {
    const s = toMin(start);
    return s === null ? '' : fromMin(s + Math.round((Number(hours) || 0) * 60));
  }
  function round4(h) { return Math.round((Number(h) || 0) * 4) / 4; }
  function dayLabel(iso) {
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? '' : ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][d.getDay()];
  }
  window.TS_reportDayLabel = dayLabel;

  // טווח שעות בתוכנית שמתחיל בשעת ההתחלה הזו — "14:00–15:30" → 1.5
  function planDuration(planMeeting, start) {
    const text = String((planMeeting && (planMeeting.time + ' ' + (planMeeting.goal || ''))) || '');
    const esc = start.replace(/^0/, '0?');
    const re = new RegExp('(?:^|[^\\d:])' + esc + '\\s*[–\\-]\\s*(\\d{1,2}:\\d{2})');
    const m = text.match(re);
    if (!m) return null;
    const a = toMin(start), b = toMin(m[1]);
    return a !== null && b !== null && b > a ? round4((b - a) / 60) : null;
  }

  function planMeetingFor(plan, date) {
    const list = plan && plan.meetings ? plan.meetings : [];
    return list.find(m => ((m.dates && m.dates.length) ? m.dates : [m.date, m.date2].filter(Boolean)).indexOf(date) >= 0) || null;
  }

  /* opts: { month:'YYYY-MM', slug, today, meetings:[meet.state], hours:[guide_hours],
            activities:[guide_activities], plan: TS_PLANS[slug] }
     → { rows:[{kind, name, date, day, start, end, location, hours, proposed, note}], total } */
  window.TS_hoursReport = function (opts) {
    const month = String(opts.month || '').slice(0, 7);
    const today = String(opts.today || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const plan = opts.plan || null;
    const inMonth = d => String(d || '').slice(0, 7) === month;
    const rows = [];

    // ---- הדרכה קבוצתית ----
    (opts.meetings || []).forEach(m => {
      const date = String(m.date || '').slice(0, 10);
      if (!inMonth(date) || date > today) return;
      const c = m.counts || {};
      const held = (Number(c.present) || 0) + (Number(c.absent) || 0) > 0 || Number(m.hours) > 0;
      if (!held) return;
      const pm = planMeetingFor(plan, date);
      const slots = (pm && window.TS_meetingSlots) ? window.TS_meetingSlots(pm).filter(s => s.date === date) : [];
      const topic = m.topic || (pm && pm.topic) || '';
      const name = 'הדרכה קבוצתית' + (topic ? ' — ' + topic : '');
      const givenHours = Number(m.hours) || 0;
      if (!slots.length) {
        rows.push({ kind: 'group', id: m.id, name: name, date: date, start: '', end: '',
          location: DEFAULT_LOCATION, hours: givenHours || DEFAULT_GROUP_HOURS,
          proposed: !givenHours, note: 'אין שעת התחלה בתוכנית — להשלים' });
        return;
      }
      // שני מועדים באותו יום (בוקר/ערב) = שתי שורות במונדיי
      slots.forEach(s => {
        const perSlot = givenHours ? round4(givenHours / slots.length) : (planDuration(pm, s.start) || DEFAULT_GROUP_HOURS);
        rows.push({ kind: 'group', id: m.id, name: name + (s.part ? ' (' + s.part + ')' : ''), date: date,
          start: s.start, end: addHours(s.start, perSlot), location: DEFAULT_LOCATION,
          hours: perSlot, proposed: !givenHours, note: givenHours ? '' : 'משך מוצע' });
      });
    });

    // ---- הדרכה פרטנית ----
    (opts.hours || []).forEach(h => {
      const date = String(h.date || '').slice(0, 10);
      if (!inMonth(date)) return;
      const who = (String(h.firstName || '') + ' ' + String(h.lastName || '')).trim();
      const hrs = round4(h.hours) || 1;
      const start = String(h.start || '') || DEFAULT_IND_START;
      rows.push({ kind: 'individual', id: h.id,
        name: 'הדרכה פרטנית' + (who ? ' — ' + who : '') + (h.schoolName ? ' (' + h.schoolName + ')' : '') + (h.topic ? ': ' + h.topic : ''),
        date: date, start: start, end: addHours(start, hrs), location: DEFAULT_LOCATION,
        hours: hrs, proposed: !h.start, note: h.start ? '' : 'שעת התחלה מוצעת' });
    });

    // ---- פעילות אחרת ----
    (opts.activities || []).forEach(a => {
      const date = String(a.date || '').slice(0, 10);
      if (!inMonth(date)) return;
      const hrs = round4(a.hours) || (a.start && a.end ? round4((toMin(a.end) - toMin(a.start)) / 60) : 0);
      rows.push({ kind: 'other', id: a.id, name: a.name || 'פעילות', date: date,
        start: a.start || '', end: a.end || (a.start && hrs ? addHours(a.start, hrs) : ''),
        location: a.location || DEFAULT_LOCATION, hours: hrs, proposed: false, note: '' });
    });

    rows.sort((x, y) => (x.date + (x.start || '99')).localeCompare(y.date + (y.start || '99')));
    rows.forEach(r => { r.day = dayLabel(r.date); });
    const total = round4(rows.reduce((s, r) => s + (Number(r.hours) || 0), 0));
    return { month: month, rows: rows, total: total };
  };

  // הטבלה כטקסט להדבקה (TSV) — בסדר העמודות של שורת המשנה במונדיי
  window.TS_hoursReportTsv = function (rows, withHeader) {
    const head = ['פעילות', 'תאריך', 'יום', 'שעת התחלה', 'מיקום', 'שעת סיום', 'שעות'];
    const fmtDate = d => { const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : d; };
    const lines = rows.map(r => [r.name, fmtDate(r.date), 'יום ' + r.day, r.start, r.location, r.end, String(r.hours)]
      .map(v => String(v == null ? '' : v).replace(/[\t\r\n]+/g, ' ')).join('\t'));
    return (withHeader ? [head.join('\t')] : []).concat(lines).join('\n');
  };
  window.TS_hoursReportCsv = function (rows) {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const fmtDate = d => { const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : d; };
    const head = ['פעילות', 'תאריך', 'יום', 'שעת התחלה', 'מיקום', 'שעת סיום', 'שעות'];
    return '﻿' + [head.map(q).join(',')].concat(rows.map(r =>
      [r.name, fmtDate(r.date), 'יום ' + r.day, r.start, r.location, r.end, r.hours].map(q).join(','))).join('\r\n');
  };
  window.TS_reportAddHours = addHours;
  window.TS_reportRound = round4;
})();
