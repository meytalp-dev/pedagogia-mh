/* ============================================================
   מבט המפקח.ת — נוכחות במפגשי ההדרכה (14.9.26)
   כרטיס מצומצם לכל מדריכ/ה בתוך "המדריכות שבאחריותי" (מ-24.9.26 — במקום
   מקטע נוכחות נפרד) ועמודת "נוכחות" בטבלת המורים. קריאה בלבד.
   נטען אחרי mabat.js; mabat.js קורא ל-MEET_load בזמן הטעינה ול-MEET_render
   אחרי שהמורים נטענו. החישוב: assets/meet-stats.js · התצוגה: assets/meet-view.js
   ============================================================ */
(function () {
  let report = null;      // { today, meetings, rows }
  let stats = null;
  let failed = false;
  const personByTeacher = {};

  window.MEET_load = async function () {
    const guides = (state && state.guides) || [];
    if (!guides.length) return;
    const res = await TS.api('meet.report', { guides: guides.map(g => g.slug).join(',') }, { cache: 'no' });
    if (res && res.ok && res.data) { report = res.data; failed = false; }
    else failed = true;
  };

  /* 24.9.26 — כרטיס אחד לכל מדריכ/ה (בקשת מיטל: "פחות עמוס, רק מה שחשוב").
     קודם היו שני מקטעים נפרדים — "המדריכות שבאחריותי" ו"נוכחות במפגשי ההדרכה"
     (TS_meetGuideCard המלא) — ובכל כרטיס גם רשימות ארוכות של מורים ובתי ספר
     *בלי* הדרכה פרטנית. עכשיו: שם, נוכחות, הדרכות קבוצתיות, המפגש הבא,
     הדרכה פרטנית = מספר המפגשים + מי קיבל (מורה · בית ספר), והשאר תחת
     "פרטים נוספים". הרשימות של "בלי הדרכה פרטנית" הוסרו מכאן בכוונה.
     TS_meetGuideCard (assets/meet-view.js) נשאר כמו שהוא למבט הארצי ולרשת. */
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const L = d => window.TS_meetDateLabel(d);

  function guideCard(g0, g) {
    const subjects = window.TS_guideSubjects ? window.TS_guideSubjects(g0).join(' · ') : '';
    const actions = window.guideActionsHtml ? window.guideActionsHtml(g0) : '';
    if (!g) {
      return `<div class="mv-card gx-card"><div class="mv-head"><div>
        <div class="mv-name">${esc(g0.name)}</div><div class="mv-sub">${esc(subjects)}</div></div></div>${actions}</div>`;
    }
    const rc = window.TS_rateClass(g.rate);
    const months = g.months || [];
    const measuredN = g.persons.filter(p => p.held > 0).length;
    const alertIcon = window.TS_meetAlertIcon || '';

    // השורה העיקרית: הדרכות קבוצתיות + מורים בקבוצה
    const groupLine = `<div class="gx-facts">
      <span><b>${months.length}</b> ${months.length === 1 ? 'הדרכה קבוצתית' : 'הדרכות קבוצתיות'}</span>
      <span><b>${g.rosterN}</b> מורים בקבוצה</span>
    </div>`;
    const nextLine = g.next ? `<div class="mv-line">המפגש הבא: <b>${esc(g.next.label || L(g.next.date))}</b></div>` : '';
    const warn = g.unrecorded.length
      ? `<div class="mv-warn">${alertIcon}<span><b>לא הוזנה נוכחות</b> למפגש${g.unrecorded.length > 1 ? 'ים' : ''} ${esc(g.unrecorded.map(u => u.label || L(u.date)).join(', '))}</span></div>` : '';

    // הדרכה פרטנית — כמה מפגשים, ומי קיבל/ה (רק מי שקיבל/ה)
    let ind = '';
    if (g.hoursLoaded) {
      const got = g.persons.filter(p => p.individual > 0)
        .sort((a, b) => (a.schoolName || '').localeCompare(b.schoolName || '', 'he') || a.name.localeCompare(b.name, 'he'));
      const n = g.individualSessions || 0;
      ind = `<div class="gx-ind">
        <div class="gx-ind-head">הדרכה פרטנית: <b>${n ? (n === 1 ? 'מפגש אחד' : n + ' מפגשים') : 'עוד לא התקיימה'}</b></div>
        ${got.length ? `<div class="gx-ind-list">${got.map(p => `<div><b>${esc(p.name)}${p.individual > 1 ? ` <small>×${p.individual}</small>` : ''}</b><span>${esc(p.schoolName || '—')}</span></div>`).join('')}</div>` : ''}
        ${g.individualOutside ? `<div class="gx-ind-note">מתוכם ${g.individualOutside === 1 ? 'מפגש אחד' : g.individualOutside + ' מפגשים'} בשם שלא נמצא ברשימת הקבוצה</div>` : ''}
      </div>`;
    }

    // פרטים נוספים — כל השאר, סגור כברירת מחדל
    const more = [];
    const rateBase = g.rate === null ? 'עוד לא נמדדה נוכחות'
      : months.length ? 'הנוכחות הממוצעת נמדדה אצל ' + measuredN + ' מתוך ' + g.rosterN + ' מורים'
      : 'הנוכחות הממוצעת מהדרכה פרטנית בלבד — ' + measuredN + ' מתוך ' + g.rosterN + ' מורים';
    more.push(`<div class="mv-line">${esc(rateBase)}</div>`);
    const lastMonth = months.length ? months[months.length - 1] : null;
    if (lastMonth) more.push(`<div class="mv-line">ההדרכה האחרונה (${esc(lastMonth.label)}): <b>${lastMonth.rosterPresent}</b> מתוך ${lastMonth.rosterN} השתתפו</div>`);
    if (g.next && g.next.topic) more.push(`<div class="mv-line">נושא המפגש הבא: ${esc(g.next.topic)}</div>`);
    if (g.pending) more.push(`<div class="mv-warn soft">${alertIcon}<span>${g.pending} רישומים עצמיים ממתינים לאישור המדריכ/ה</span></div>`);
    if (g.gaps) more.push(`<div class="mv-warn soft">${alertIcon}<span>${g.gaps} נרשמו בעצמם אבל סומנו "לא נכח/ה"</span></div>`);
    if (months.length) more.push(`
      <div class="gx-sub-h">לפי חודש</div>
      <table class="mv-table">
        <thead><tr><th>חודש</th><th>מועדים</th><th>השתתפו</th><th>אחוז</th></tr></thead>
        <tbody>${months.slice().reverse().map(mo => `
          <tr><td>${esc(mo.label)}</td><td class="num">${mo.dates.map(L).join(' · ')}</td>
          <td class="num">${mo.rosterPresent}/${mo.rosterN}</td>
          <td class="num">${mo.rate === null ? '<span class="mv-chip none">—</span>' : `<span class="mv-chip ${window.TS_rateClass(mo.rate)}">${mo.rate}%</span>`}</td></tr>`).join('')}
        </tbody>
      </table>`);
    if (g.never.length) more.push(`
      <div class="gx-sub-h">לא השתתפו כלל (${g.never.length} מתוך ${measuredN} שנמדדו)</div>
      <div class="mv-people">${g.never.map(p => `<div><b>${esc(p.name)}</b><span>${esc(p.schoolName)}</span></div>`).join('')}</div>
      <button type="button" class="mv-copy" data-mv-copy="${esc(g.slug)}">העתקת הרשימה</button>`);
    more.push(`<div class="gx-sub-h">מרחב המדריכ/ה</div>${actions}`);

    return `
      <div class="mv-card gx-card${g.unrecorded.length ? ' alert' : ''}">
        <div class="mv-head">
          <div>
            <div class="mv-name">${esc(g.name)}</div>
            <div class="mv-sub">${esc(subjects)}</div>
          </div>
          <div class="mv-rate ${rc}"><b>${g.rate === null ? '—' : g.rate + '%'}</b><span>נוכחות</span></div>
        </div>
        ${groupLine}${nextLine}${warn}${ind}
        <details class="gx-more">
          <summary>פרטים נוספים</summary>
          <div class="gx-more-body">${more.join('')}</div>
        </details>
      </div>`;
  }

  window.MEET_render = function () {
    if (!state.guides.length) return;
    const grid = document.getElementById('guides-grid');
    if (!grid) return;
    document.getElementById('guides-card').hidden = false;
    const sum = document.getElementById('meet-summary');
    if (!report) {
      // עד שהנוכחות מגיעה נשאר הכרטיס הזמני של mabat.js
      sum.textContent = failed ? 'נתוני הנוכחות לא נטענו — תקלה רגעית בשרת. רעננו בעוד רגע.' : 'טוען נוכחות…';
      return;
    }
    stats = window.TS_meetStats({
      today: report.today, meetings: report.meetings, rows: report.rows,
      teachers: state.teachers, guides: state.guides,
      // שעות פרטניות — כבר נטענו ב-mabat.js (guide.workspace). נכשל? בלי השורה, לא "0 לכולם"
      hours: (state.ws && state.ws.hours) || null
    });
    Object.keys(personByTeacher).forEach(k => delete personByTeacher[k]);
    // כל הקבוצות של אותו מורה, לא הראשונה בלבד — ראו TS_meetRateChips
    stats.persons.forEach(p => p.ids.forEach(id => { (personByTeacher[id] = personByTeacher[id] || []).push(p); }));

    const alerts = stats.guides.reduce((s, g) => s + g.unrecorded.length, 0);
    // יחידת הספירה היא חודש (18.9.26) — שני מועדים באותו חודש הם הדרכה אחת
    const heldAll = stats.guides.reduce((s, g) => s + ((g.months || []).length), 0);
    sum.innerHTML = heldAll
      ? `${heldAll === 1 ? 'הדרכה חודשית אחת' : heldAll + ' הדרכות חודשיות'} עם רישום נוכחות${alerts ? ` · <b style="color:#8f2f1c">${alerts} מועדים בלי רישום</b>` : ''}`
      : (alerts ? `<b style="color:#8f2f1c">${alerts} מועדים שעברו בלי רישום נוכחות</b>` : '');

    // מדריכ/ה עם התראה — קודם
    const bySlug = {};
    stats.guides.forEach(g => { bySlug[g.slug] = g; });
    const ordered = state.guides.slice().sort((a, b) => {
      const A = bySlug[a.slug], B = bySlug[b.slug];
      if (!A || !B) return 0;
      return (B.unrecorded.length - A.unrecorded.length) || ((A.rate === null ? 101 : A.rate) - (B.rate === null ? 101 : B.rate));
    });
    grid.classList.add('gx');
    grid.innerHTML = ordered.map(g0 => guideCard(g0, bySlug[g0.slug])).join('');
    window.TS_meetBindCopy(grid, stats);
    if (window.bindGuideActions) window.bindGuideActions(grid);
  };

  // תא "נוכחות" בטבלת המורים של mabat
  window.MEET_cell = function (teacherId) {
    if (!report) return '<span class="mv-chip none">…</span>';
    return window.TS_meetRateChips(personByTeacher[teacherId]);
  };
})();
