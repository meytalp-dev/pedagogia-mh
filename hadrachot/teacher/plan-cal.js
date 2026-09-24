/* ▸ התוכנית השנתית שלי + הוספה ליומן (24.9.26, בקשת מיטל).
   כל מפגשי התוכנית של המדריכ/ה (plans.js), מסוננים למסלול של המורה (sessionTimes),
   ולכל מועד ושעה — תיבת סימון. "הוספה ליומן" מוריד קובץ ics עם המועדים שסומנו
   (נפתח ביומן של גוגל, אאוטלוק ואייפון), ולכל מועד גם קישור ישיר ליומן גוגל.
   הבחירה נשמרת בדפדפן (ts.teacher.cal) כדי שהסימון לא יאבד. */
(function () {
  const CAL_KEY = 'ts.teacher.cal';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const loadSel = () => { try { return new Set(JSON.parse(localStorage.getItem(CAL_KEY) || '[]')); } catch (e) { return new Set(); } };
  const saveSel = set => { try { localStorage.setItem(CAL_KEY, JSON.stringify([...set])); } catch (e) { /* לא חוסם */ } };

  // שעה בישראל → UTC, בלי תלות באזור הזמן של המכשיר
  function ilToUtc(iso, hhmm) {
    const [y, m, d] = iso.split('-').map(Number);
    const [hh, mm] = hhmm.split(':').map(Number);
    const guess = Date.UTC(y, m - 1, d, hh, mm);
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess));
    const g = t => Number(parts.find(p => p.type === t).value);
    const asIl = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'));
    return new Date(guess - (asIl - guess));
  }
  const stamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const nextDay = iso => new Date(new Date(iso + 'T12:00:00Z').getTime() + 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  // "16:00" → שעה אחת; "20:30–21:30" → טווח; בלי שעה — אירוע של יום שלם
  function span(iso, time) {
    const m = String(time || '').match(/(\d{1,2}:\d{2})(?:\s*[–-]\s*(\d{1,2}:\d{2}))?/);
    if (!m) return null;
    const start = ilToUtc(iso, m[1]);
    const end = m[2] ? ilToUtc(iso, m[2]) : new Date(start.getTime() + 60 * 60000);
    return { start, end };
  }
  function slotsFor(plan) {
    const out = [];
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
    (plan || []).forEach(m => {
      planDays(m).forEach(d => {
        const t = sessionTimes(m, d);
        if (t === null) return;                        // מועד של מסלול אחר
        const list = t.length ? t : [{ time: '', label: '' }];
        list.forEach(x => out.push({
          id: d + '|' + (x.time || '') + '|' + (x.label || ''), date: d, time: x.time, label: x.label,
          topic: m.topic || 'מפגש הדרכה', month: m.month || '', past: d < today, mkey: String(m.date || d).slice(0, 7)
        }));
      });
    });
    return out;
  }
  const details = guideName => 'מפגש הדרכה' + (guideName ? ' עם ' + guideName : '') +
    ' · מנור, מבט המורה\nhttps://pedagogiamh.co.il/hadrachot/teacher/';
  function gcalLink(s, guideName) {
    const sp = span(s.date, s.time);
    const dates = sp ? stamp(sp.start) + '/' + stamp(sp.end) : s.date.replace(/-/g, '') + '/' + nextDay(s.date);
    const q = new URLSearchParams({ action: 'TEMPLATE', text: 'הדרכה: ' + s.topic + (s.label ? ' · ' + s.label : ''),
      dates: dates, details: details(guideName), ctz: 'Asia/Jerusalem' });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }
  function ics(slots, guideName) {
    const now = stamp(new Date());
    const txt = s => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const ev = slots.map((s, i) => {
      const sp = span(s.date, s.time);
      const when = sp ? ['DTSTART:' + stamp(sp.start), 'DTEND:' + stamp(sp.end)]
        : ['DTSTART;VALUE=DATE:' + s.date.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + nextDay(s.date)];
      return ['BEGIN:VEVENT', 'UID:menor-' + s.date.replace(/-/g, '') + '-' + i + '-' + now + '@pedagogiamh.co.il',
        'DTSTAMP:' + now].concat(when, [
        'SUMMARY:' + txt('הדרכה: ' + s.topic + (s.label ? ' · ' + s.label : '')),
        'DESCRIPTION:' + txt(details(guideName)),
        'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:' + txt('תזכורת להדרכה'), 'END:VALARM',
        'END:VEVENT']).join('\r\n');
    });
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Menor//pedagogiamh//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
      .concat(ev, ['END:VCALENDAR']).join('\r\n');
  }

  window.TS_renderPlan = function (slug, guideName) {
    const sec = document.getElementById('plan-sec');
    const box = document.getElementById('plan-list');
    if (!sec || !box) return;
    const slots = slotsFor(planMeetings(slug));
    if (!slots.length) return;
    const sel = loadSel();
    const groups = {};
    slots.forEach(s => { (groups[s.mkey] = groups[s.mkey] || []).push(s); });
    box.innerHTML = Object.keys(groups).sort().map(k => {
      const g = groups[k];
      const allPast = g.every(s => s.past);
      return `<div class="pl-month${allPast ? ' past' : ''}">
        <div class="pl-head"><b>${esc(g[0].month || monthLbl(k))}</b><span>${esc(g[0].topic)}</span></div>
        <div class="pl-slots">${g.map(s => `
          <label class="pl-slot${s.past ? ' past' : ''}">
            <input type="checkbox" data-slot="${esc(s.id)}"${sel.has(s.id) && !s.past ? ' checked' : ''}${s.past ? ' disabled' : ''}>
            <span class="pl-when">${esc(weekday(s.date))} ${esc(dateLbl(s.date))}</span>
            <span class="pl-time">${s.time ? '<b>' + esc(s.time) + '</b>' : ''}${s.label ? ' · ' + esc(s.label) : ''}</span>
            ${s.past ? '<span class="pl-past">עבר</span>'
              : `<a class="pl-g" href="${esc(gcalLink(s, guideName))}" target="_blank" rel="noopener">ליומן גוגל</a>`}
          </label>`).join('')}</div>
      </div>`;
    }).join('');
    const btn = document.getElementById('plan-ics');
    const count = () => {
      const n = box.querySelectorAll('input[data-slot]:checked').length;
      btn.disabled = !n;
      btn.textContent = n ? 'הוספה ליומן — ' + n + (n === 1 ? ' מועד' : ' מועדים') : 'סמנו מועדים להוספה ליומן';
    };
    box.onchange = e => {
      const cb = e.target.closest('input[data-slot]'); if (!cb) return;
      const set = loadSel(); cb.checked ? set.add(cb.dataset.slot) : set.delete(cb.dataset.slot); saveSel(set); count();
    };
    btn.onclick = () => {
      const ids = new Set([...box.querySelectorAll('input[data-slot]:checked')].map(x => x.dataset.slot));
      const chosen = slots.filter(s => ids.has(s.id));
      if (!chosen.length) return;
      const blob = new Blob([ics(chosen, guideName)], { type: 'text/calendar;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'hadrachot-menor.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      const msg = document.getElementById('plan-msg');
      msg.hidden = false;
      msg.textContent = 'הקובץ ירד. פותחים אותו, והמועדים נכנסים ליומן, עם תזכורת חצי שעה לפני.';
    };
    count();
    sec.hidden = false;
  };
  window.TS_planIcs = ics;          // לבדיקות
  window.TS_planSlots = slotsFor;
})();
