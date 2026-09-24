/* ============================================================
   נוכחות בהדרכות — המסך של המנהל/ת (18.9.26)
   -----------------------------------------------------------
   עד היום הדשבורד של בית הספר הציג רק את טאב ההדרכות הישן, שבו אין כלום,
   ולכן מנהל/ת לא יכל/ה לדעת מי מהמורים לא הגיע למפגשי ההדרכה.
   כאן: כרטיס לכל **מקצוע · מדריכ/ה** (קביעת מיטל 18.9.26), ובתוכו המורים
   של בית הספר בלבד — מי היה, מי לא, ומה החסיר.
   **יחידת הספירה היא חודש** (קביעת מיטל 18.9.26): בכל חודש שני מועדים,
   בוקר וערב, אבל זו הדרכה אחת — מי שהיה באחד מהם השתתף בהדרכה של החודש.

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
    // כל הקבוצות של אותו מורה, לא הראשונה בלבד — ראו TS_meetRateChips
    Object.keys(personByTeacher).forEach(k => delete personByTeacher[k]);
    stats.persons.forEach(p => p.ids.forEach(id => { (personByTeacher[id] = personByTeacher[id] || []).push(p); }));
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
    if (subEl) subEl.textContent = rated.length ? 'יעד: 80% · בהדרכות החודשיות' : 'טרם התקיימה הדרכה עם רישום נוכחות';
    if (riskEl) riskEl.textContent = rated.length ? rated.filter(p => p.rate < 50).length : '—';
  }
  /* ה-KPI שייכים לדשבורד הישן, והוא מצייר אותם כשהתשובה שלו מגיעה — לפעמים
     אחרינו, ואז הוא דרס את נתוני המפגשים ב-"—" (קודקס, 20.9.26). dashboard.js
     קורא לנו בסוף ה-render שלו; הפונקציה בטוחה לקריאה חוזרת ויוצאת בלי נתונים.
     אותה תבנית כבר עובדת ב-admin-network (NW_meetApply). */
  window.SCHOOL_meetApply = function () { if (stats) updateKpis(); };

  function render() {
    const box = document.getElementById('meet-container');
    if (!box) return;
    // הכותרת נשארה "טוען…" גם בכישלון ובאפס קבוצות — שלושת המצבים נפרדים
    const head = document.getElementById('meet-summary');
    const setHead = t => { if (head) head.innerHTML = t; };
    if (!loaded) { box.innerHTML = '<div class="mv-empty">טוען נוכחות…</div>'; setHead('טוען…'); return; }
    if (failed) {
      box.innerHTML = '<div class="mv-empty">נתוני הנוכחות לא נטענו — תקלה רגעית בשרת. רעננו בעוד רגע.</div>';
      setHead('הנתונים לא נטענו');
      return;
    }
    const gs = myGuides();
    if (!gs.length) {
      box.innerHTML = '<div class="mv-empty">אין עדיין קבוצות הדרכה עם מורים מבית הספר.</div>';
      setHead('אין קבוצות הדרכה עם מורים מבית הספר');
      return;
    }
    setHead(summaryHtml(gs));
    box.innerHTML = gs.map(card).join('');
    bindCopy(box);
  }

  /* השורה התחתונה קודם (בקשת מיטל 18.9.26): אחוז הנוכחות של בית הספר,
     ואחריו שורה לכל חודש — אחוז, ומי לא השתתף. */
  function schoolMonths(gs) {
    const byMonth = {};
    gs.forEach(g => (g.months || []).forEach(mo => {
      const m = byMonth[mo.key] || (byMonth[mo.key] = { key: mo.key, label: mo.label, n: 0, present: 0, absent: [], came: [], groups: [] });
      m.n += mo.rosterN;
      m.present += mo.rosterPresent;
      mo.absent.forEach(p => m.absent.push({ name: p.name, subject: p.subject || '', guide: g.name }));
      (mo.present || []).forEach(p => m.came.push({ name: p.name, subject: p.subject || '', guide: g.name }));
      m.groups.push(g.name);
    }));
    return Object.keys(byMonth).sort().reverse().map(k => {
      const m = byMonth[k];
      m.rate = m.n ? Math.round(m.present / m.n * 100) : null;
      return m;
    });
  }

  function summaryHtml(gs) {
    const months = schoolMonths(gs);
    if (!months.length) return `${gs.length} קבוצות הדרכה · עוד לא התקיימה הדרכה עם רישום נוכחות`;
    const n = months.reduce((s, m) => s + m.n, 0);
    const present = months.reduce((s, m) => s + m.present, 0);
    const rate = n ? Math.round(present / n * 100) : null;
    const rc = window.TS_rateClass ? window.TS_rateClass(rate) : '';
    return `
      <div class="mv-bottom">
        <div class="mv-bottom-rate ${rc}"><b>${rate}%</b><span>נוכחות בית הספר בהדרכות</span></div>
        <div class="mv-bottom-tx">${months.length === 1 ? 'הדרכה חודשית אחת התקיימה' : months.length + ' הדרכות חודשיות התקיימו'} · ${gs.length} קבוצות הדרכה</div>
      </div>
      <table class="mv-table" style="margin-top:10px;">
        <thead><tr><th>חודש</th><th>אחוז נוכחות</th><th>השתתפו</th><th>מי השתתף/ה · מי לא</th></tr></thead>
        <tbody>${months.map(m => `
          <tr>
            <td><b>${esc(m.label)}</b></td>
            <td class="num"><span class="mv-chip ${window.TS_rateClass(m.rate)}">${m.rate}%</span></td>
            <td class="num">${m.present}/${m.n}</td>
            <td>${m.came.length
              ? `<details class="sa-came"><summary>השתתפו: ${m.came.length} מורים</summary><div class="mv-people">${m.came.map(a => `<div><b>${esc(a.name)}</b><span>${esc(a.subject)}${a.guide ? ' · ' + esc(a.guide) : ''}</span></div>`).join('')}</div></details>`
              : ''}${m.absent.length
              ? `<details><summary>לא השתתפו: ${m.absent.length} מורים</summary><div class="mv-people">${m.absent.map(a => `<div><b>${esc(a.name)}</b><span>${esc(a.subject)}${a.guide ? ' · ' + esc(a.guide) : ''}</span></div>`).join('')}</div></details>`
              : '<span style="color:#1f7a5c">כולם השתתפו</span>'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function card(g) {
    const subjects = window.TS_guideSubjects ? window.TS_guideSubjects(g).join(' · ') : (g.subject || '');
    const months = g.months || [];
    const held = months.length;
    const persons = g.persons;
    // רק מי שנמדד. מורה שבמקצוע שלו לא התקיימה הדרכה (p.held===0) הוא
    // "טרם נמדד" — גם כשלקבוצה בכללותה יש חודשים שהתקיימו.
    const never = persons.filter(p => p.held > 0 && !p.participated);
    const rated = persons.filter(p => p.held > 0);
    const rate = rated.length ? Math.round(rated.reduce((s, p) => s + p.rate, 0) / rated.length) : null;
    const rc = window.TS_rateClass ? window.TS_rateClass(rate) : '';

    const rows = persons.slice().sort((a, b) =>
      (a.rate === null ? 101 : a.rate) - (b.rate === null ? 101 : b.rate) ||
      a.name.localeCompare(b.name, 'he')).map(p => `
      <tr>
        <td>${esc(p.name)}</td>
        <td class="num">${window.TS_meetRateChip(p)}</td>
        <td>${p.missed.length ? esc(p.missed.join(', ')) : (p.held ? '<span style="color:#1f7a5c">השתתף/ה בכל ההדרכות</span>' : '—')}</td>
      </tr>`).join('');

    const monthRows = months.slice().reverse().map(mo => `
      <tr>
        <td><b>${esc(mo.label)}</b><br><span style="color:var(--text-muted); font-size:12px;">${mo.dates.map(L).join(' · ')}</span></td>
        <td class="num">${mo.rate === null ? '—' : `<span class="mv-chip ${window.TS_rateClass(mo.rate)}">${mo.rate}%</span>`}</td>
        <td class="num">${mo.rosterPresent}/${mo.rosterN}</td>
        <td>
          ${(mo.present || []).length ? `<div class="sa-who sa-yes"><span class="sa-tag">השתתפו</span>${esc(mo.present.map(pp => pp.name).join(' · '))}</div>` : ''}
          ${mo.absent.length
            ? `<div class="sa-who sa-no"><span class="sa-tag">לא השתתפו</span>${esc(mo.absent.map(pp => pp.name).join(' · '))}</div>`
            : '<div class="sa-who sa-yes"><span style="color:#1f7a5c">כולם השתתפו</span></div>'}
        </td>
      </tr>`).join('');

    const lastMonth = months.length ? months[months.length - 1] : null;
    const lastLine = lastMonth
      ? `<div class="mv-line">ההדרכה האחרונה (${esc(lastMonth.label)}): <b>${lastMonth.rosterPresent}</b> מתוך ${lastMonth.rosterN} מורים מבית הספר השתתפו</div>`
      : '<div class="mv-line">עוד לא התקיימה הדרכה עם רישום נוכחות</div>';
    /* בלי זה אי אפשר להבדיל בין מפגש שטרם הגיע לבין מפגש שעבר ולא דווח,
       והמנהל/ת עלול/ה לפנות למורה כשהפער הוא בהזנה (קודקס, 20.9.26).
       אותה התראה כבר מוצגת למפקח.ת ובמבט הארצי דרך TS_meetGuideCard. */
    const unrecLine = (g.unrecorded || []).length
      ? `<div class="mv-warn">${window.TS_meetAlertIcon || ''}<span><b>לא הוזנה נוכחות</b> למועד${g.unrecorded.length > 1 ? 'ים' : ''} ` +
        `${esc(g.unrecorded.map(u => u.label || L(u.date)).join(', '))} — הנתון החסר אצל המדריכ/ה, ` +
        `ואינו נספר כהיעדרות של המורים.</span></div>`
      : '';
    const nextLine = g.next
      ? `<div class="mv-line">המפגש הבא: <b>${esc(g.next.label || L(g.next.date))}</b>${g.next.topic ? ' · ' + esc(g.next.topic) : ''}</div>` : '';

    /* "במקצוע תרשום גם מי כן השתתף" (מיטל, 24.9.26): לצד מי לא הגיע —
       מי כן השתתף/ה, בשמו/ה, ובאילו חודשים. */
    const monthLabel = {};
    months.forEach(mo => { monthLabel[mo.key] = mo.label; });
    const came = persons.filter(p => p.held > 0 && p.participated)
      .sort((a, b) => (b.rate || 0) - (a.rate || 0) || a.name.localeCompare(b.name, 'he'));
    const cameBlock = came.length ? `
      <details open class="sa-came">
        <summary>השתתפו בהדרכות (${came.length})</summary>
        <div class="mv-people">${came.map(p => `<div><b>${esc(p.name)}</b><span>${
          esc((p.monthsAttended || []).map(k => monthLabel[k] || k).join(' · ') || (p.subject || ''))}</span></div>`).join('')}</div>
      </details>` : '';

    const neverBlock = (held && never.length) ? `
      <details open>
        <summary>לא השתתפו באף הדרכה (${never.length})</summary>
        <div class="mv-people">${never.map(p => `<div><b>${esc(p.name)}</b><span>${esc(p.subject || '')}</span></div>`).join('')}</div>
        <button type="button" class="mv-copy" data-copy="${esc(g.slug)}">העתקת הרשימה</button>
      </details>` : (held ? '<div class="mv-line" style="color:#1f7a5c"><b>כל המורים השתתפו לפחות בהדרכה אחת</b></div>' : '');

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
          <div class="mv-kpi"><b>${held}</b><span>הדרכות שהתקיימו</span></div>
          <div class="mv-kpi"><b>${persons.length}</b><span>מורים מבית הספר</span></div>
          <div class="mv-kpi ok"><b>${held ? came.length : '—'}</b><span>השתתפו</span></div>
          <div class="mv-kpi"><b>${held ? never.length : '—'}</b><span>לא השתתפו כלל</span></div>
        </div>
        ${unrecLine}
        ${lastLine}${nextLine}
        ${cameBlock}
        ${neverBlock}
        ${months.length ? `
        <details open>
          <summary>לפי חודש (${months.length})</summary>
          <table class="mv-table">
            <thead><tr><th>חודש</th><th>אחוז</th><th>השתתפו</th><th>מי השתתף/ה · מי לא</th></tr></thead>
            <tbody>${monthRows}</tbody>
          </table>
        </details>` : ''}
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
      const txt = g.persons.filter(p => p.held > 0 && !p.participated).map(p => p.name).join('\n');
      navigator.clipboard.writeText(txt).then(() => {
        const t = b.textContent; b.textContent = '✓ הועתק';
        setTimeout(() => { b.textContent = t; }, 2000);
      });
    }));
  }

  /* סיכום לפי מקצוע — לכותרת קבוצת המקצוע בטבלת המורים. עד 18.9.26 נכתב שם
     "טרם התקיימו הדרכות" לפי המערכת הישנה, גם כשכבר הייתה נוכחות. */
  window.SCHOOL_meetSubject = function (subject) {
    if (!stats) return null;
    const persons = [];
    (stats.guides || []).forEach(g => g.persons.forEach(p => {
      if ((p.subjects || []).indexOf(subject) >= 0) persons.push(p);
    }));
    const rated = persons.filter(p => p.held > 0);
    if (!rated.length) return null;
    const months = {};
    (stats.guides || []).forEach(g => (g.months || []).forEach(mo => {
      const subs = Object.keys(mo.subjects);
      if (!subs.length || subs.indexOf(subject) >= 0) months[mo.key] = 1;
    }));
    return {
      rate: Math.round(rated.reduce((s, p) => s + p.rate, 0) / rated.length),
      months: Object.keys(months).length,
      never: rated.filter(p => !p.participated).length
    };
  };

  // תא נוכחות בטבלת המורים של הדף (dashboard.js)
  window.SCHOOL_meetCell = function (teacherId) {
    if (!stats) return '';
    const list = personByTeacher[String(teacherId)];
    return list ? window.TS_meetRateChips(list) : '<span class="mv-chip none">—</span>';
  };
})();
