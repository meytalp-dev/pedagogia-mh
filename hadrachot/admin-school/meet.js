/* ============================================================
   נוכחות בהדרכות — המסך של המנהל/ת (18.9.26)
   -----------------------------------------------------------
   עד היום הדשבורד של בית הספר הציג רק את טאב ההדרכות הישן, שבו אין כלום,
   ולכן מנהל/ת לא יכל/ה לדעת מי מהמורים לא הגיע למפגשי ההדרכה.
   כאן: כרטיס לכל **מקצוע · מדריכ/ה** (קביעת מיטל 18.9.26), ובתוכו המורים
   של בית הספר בלבד — מי היה, מי לא, ומה החסיר.

   נתונים: `meet.scope?school=<id>` — מחזיר את כל המפגשים (לחישוב "מפגש
   שהתקיים") אבל רק את שורות הנוכחות של מורי בית הספר, ואת השעות הפרטניות
   של בית הספר. החישוב: assets/meet-stats.js — אותם כללי ספירה בדיוק כמו
   אצל המדריכה, המפקח.ת והדוח הארצי, כדי ששלושתם לא יראו מספרים שונים.
   ============================================================ */
(function () {
  let stats = null, failed = false, loaded = false;
  const personByTeacher = {};

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const L = d => (window.TS_meetDateLabel ? window.TS_meetDateLabel(d) : d);

  document.addEventListener('DOMContentLoaded', () => {
    const id = TS.urlParam('school', '');
    if (id) load(id);
  });

  async function load(schoolId) {
    render();   // "טוען…"
    const [rep, tl] = await Promise.all([
      TS.api('meet.scope', { school: schoolId }, { cache: 'no' }),
      // רשימת המורים המלאה של בית הספר — צריך ממנה מגזר, מסלול ויח"ל
      // כדי לדעת לאיזו קבוצת הדרכה כל מורה שייך/ת (אותה לוגיקה כמו בדשבורד המדריכה)
      TS.api('teachers.list', { school: schoolId })
    ]);
    loaded = true;
    if (!rep || !rep.ok || !tl || !tl.ok) { failed = true; render(); return; }
    const guides = Object.keys(window.TS_GUIDES || {})
      .map(k => Object.assign({ slug: k }, window.TS_GUIDES[k]));
    stats = window.TS_meetStats({
      today: rep.data.today, meetings: rep.data.meetings, rows: rep.data.rows,
      teachers: tl.data || [], guides: guides, hours: hoursBySlug(rep.data.hours)
    });
    stats.persons.forEach(p => p.ids.forEach(id => { if (!personByTeacher[id]) personByTeacher[id] = p; }));
    render();
    updateKpis();
    if (typeof window.SCHOOL_onMeet === 'function') window.SCHOOL_onMeet();
  }

  // guide_hours מגיע כרשימה שטוחה; meet-stats מצפה למפה לפי slug
  function hoursBySlug(rows) {
    if (!rows) return null;
    const out = {};
    rows.forEach(h => { (out[h.guideSlug] = out[h.guideSlug] || []).push(h); });
    return out;
  }

  // הקבוצות שיש בהן מורים של בית הספר — רק הן מעניינות את המנהל/ת
  function myGuides() {
    return (stats ? stats.guides : []).filter(g => g.persons.length)
      .sort((a, b) => {
        const sa = (window.TS_guideSubjects ? window.TS_guideSubjects(a) : [a.subject]).join(' ');
        const sb = (window.TS_guideSubjects ? window.TS_guideSubjects(b) : [b.subject]).join(' ');
        return sa.localeCompare(sb, 'he') || String(a.name).localeCompare(String(b.name), 'he');
      });
  }

  // חיבור לכרטיסי ה-KPI של הדף — עד היום הם חושבו מטאב ההדרכות הישן והציגו 0%
  function updateKpis() {
    const persons = (stats ? stats.guides : []).reduce((a, g) => a.concat(g.persons), []);
    const rated = persons.filter(p => p.held > 0);
    const rate = rated.length ? Math.round(rated.reduce((s, p) => s + p.rate, 0) / rated.length) : null;
    const rateEl = document.getElementById('stat-rate');
    const subEl = document.getElementById('stat-rate-sub');
    const riskEl = document.getElementById('stat-risk');
    if (rateEl) rateEl.textContent = rate === null ? '—' : rate + '%';
    if (subEl) subEl.textContent = rated.length ? 'יעד: 80% · ממפגשי ההדרכה' : 'טרם התקיים מפגש עם רישום נוכחות';
    if (riskEl) riskEl.textContent = rated.length ? rated.filter(p => p.rate < 50).length : '—';
  }

  function render() {
    const box = document.getElementById('meet-container');
    if (!box) return;
    if (!loaded) { box.innerHTML = '<div class="mv-empty">טוען נוכחות…</div>'; return; }
    if (failed) {
      box.innerHTML = '<div class="mv-empty">נתוני הנוכחות לא נטענו — תקלה רגעית בשרת. רעננו בעוד רגע.</div>';
      return;
    }
    const gs = myGuides();
    if (!gs.length) {
      box.innerHTML = '<div class="mv-empty">אין עדיין קבוצות הדרכה עם מורים מבית הספר.</div>';
      return;
    }
    const held = gs.reduce((s, g) => s + g.held.length, 0);
    const head = document.getElementById('meet-summary');
    if (head) {
      const persons = gs.reduce((a, g) => a.concat(g.persons), []);
      const never = persons.filter(p => !p.participated).length;
      head.innerHTML = held
        ? `${gs.length} קבוצות הדרכה · ${held} מפגשים שהתקיימו · ` +
          (never ? `<b style="color:#8f2f1c">${never} מורים לא השתתפו באף מפגש</b>` : '<b style="color:#1f7a5c">כל המורים השתתפו לפחות פעם אחת</b>')
        : `${gs.length} קבוצות הדרכה · עוד לא התקיים מפגש עם רישום נוכחות`;
    }
    box.innerHTML = gs.map(card).join('');
    bindCopy(box);
  }

  function card(g) {
    const subjects = window.TS_guideSubjects ? window.TS_guideSubjects(g).join(' · ') : (g.subject || '');
    const held = g.held.length;
    const persons = g.persons;
    const never = persons.filter(p => !p.participated);
    const rated = persons.filter(p => p.held > 0);
    const rate = rated.length ? Math.round(rated.reduce((s, p) => s + p.rate, 0) / rated.length) : null;
    const rc = window.TS_rateClass ? window.TS_rateClass(rate) : '';

    const rows = persons.slice().sort((a, b) =>
      (a.rate === null ? 101 : a.rate) - (b.rate === null ? 101 : b.rate) ||
      a.name.localeCompare(b.name, 'he')).map(p => `
      <tr>
        <td>${esc(p.name)}</td>
        <td class="num">${window.TS_meetRateChip(p)}</td>
        <td>${p.missed.length ? esc(p.missed.map(L).join(', ')) : (p.held ? '<span style="color:#1f7a5c">היה/הייתה בכל המפגשים</span>' : '—')}</td>
      </tr>`).join('');

    const lastLine = g.last
      ? `<div class="mv-line">המפגש האחרון (${esc(L(g.last.date))}): <b>${persons.filter(p => p.attended.indexOf(g.held[g.held.length - 1].id) >= 0).length}</b> מתוך ${persons.length} מורים מבית הספר השתתפו</div>`
      : '<div class="mv-line">עוד לא התקיים מפגש עם רישום נוכחות</div>';
    const nextLine = g.next
      ? `<div class="mv-line">המפגש הבא: <b>${esc(g.next.label || L(g.next.date))}</b>${g.next.topic ? ' · ' + esc(g.next.topic) : ''}</div>` : '';

    const neverBlock = (held && never.length) ? `
      <details open>
        <summary>לא השתתפו באף מפגש (${never.length})</summary>
        <div class="mv-people">${never.map(p => `<div><b>${esc(p.name)}</b><span>${esc(p.subject || '')}</span></div>`).join('')}</div>
        <button type="button" class="mv-copy" data-copy="${esc(g.slug)}">העתקת הרשימה</button>
      </details>` : (held ? '<div class="mv-line" style="color:#1f7a5c"><b>כל המורים השתתפו לפחות במפגש אחד</b></div>' : '');

    return `
      <div class="mv-card">
        <div class="mv-head">
          <div>
            <div class="mv-name">${esc(subjects)}</div>
            <div class="mv-sub">מדריכ/ה: ${esc(g.name)}</div>
          </div>
          <div class="mv-rate ${rc}"><b>${rate === null ? '—' : rate + '%'}</b><span>נוכחות המורים שלנו</span></div>
        </div>
        <div class="mv-kpis">
          <div class="mv-kpi"><b>${held}${g.planTotal ? `<small style="font-size:11px;color:var(--text-muted)">/${g.planTotal}</small>` : ''}</b><span>מפגשים שהתקיימו</span></div>
          <div class="mv-kpi"><b>${persons.length}</b><span>מורים מבית הספר</span></div>
          <div class="mv-kpi"><b>${held ? never.length : '—'}</b><span>לא השתתפו כלל</span></div>
        </div>
        ${lastLine}${nextLine}
        ${neverBlock}
        <details${held ? '' : ' open'}>
          <summary>כל המורים בקבוצה (${persons.length})</summary>
          <table class="mv-table">
            <thead><tr><th>מורה</th><th>נוכחות</th><th>מפגשים שהחסיר/ה</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </details>
      </div>`;
  }

  // "מי לא היה" — רשימה להעתקה, כמו בכל דף מעקב
  function bindCopy(root) {
    root.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
      const g = (stats.guides || []).find(x => x.slug === b.dataset.copy);
      if (!g) return;
      const txt = g.persons.filter(p => !p.participated).map(p => p.name).join('\n');
      navigator.clipboard.writeText(txt).then(() => {
        const t = b.textContent; b.textContent = '✓ הועתק';
        setTimeout(() => { b.textContent = t; }, 2000);
      });
    }));
  }

  // תא נוכחות בטבלת המורים של הדף (dashboard.js)
  window.SCHOOL_meetCell = function (teacherId) {
    if (!stats) return '';
    const p = personByTeacher[String(teacherId)];
    return p ? window.TS_meetRateChip(p) : '<span class="mv-chip none">—</span>';
  };
})();
