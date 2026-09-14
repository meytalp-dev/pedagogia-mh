/* ============================================================
   מבט המפקח.ת — נוכחות במפגשי ההדרכה (14.9.26)
   מקטע "נוכחות במפגשי ההדרכה" (כרטיס לכל מדריכ/ה שבאחריות המפקח.ת)
   ועמודת "נוכחות" בטבלת המורים. קריאה בלבד.
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

  window.MEET_render = function () {
    const box = document.getElementById('meet-card');
    if (!box || !state.guides.length) return;
    box.hidden = false;
    const grid = document.getElementById('meet-grid');
    if (!report) {
      grid.innerHTML = `<div class="mv-empty">${failed
        ? 'נתוני הנוכחות לא נטענו — תקלה רגעית בשרת. רעננו בעוד רגע.'
        : 'טוען נוכחות…'}</div>`;
      return;
    }
    stats = window.TS_meetStats({
      today: report.today, meetings: report.meetings, rows: report.rows,
      teachers: state.teachers, guides: state.guides
    });
    Object.keys(personByTeacher).forEach(k => delete personByTeacher[k]);
    stats.persons.forEach(p => p.ids.forEach(id => { if (!personByTeacher[id]) personByTeacher[id] = p; }));

    const alerts = stats.guides.reduce((s, g) => s + g.unrecorded.length, 0);
    const heldAll = stats.guides.reduce((s, g) => s + g.held.length, 0);
    const sum = document.getElementById('meet-summary');
    sum.innerHTML = heldAll
      ? `${heldAll} מפגשים עם רישום נוכחות${alerts ? ` · <b style="color:#8f2f1c">${alerts} מפגשים שעברו בלי רישום</b>` : ''}`
      : (alerts ? `<b style="color:#8f2f1c">${alerts} מפגשים שעברו בלי רישום נוכחות</b>` : 'עוד לא התקיימו מפגשים עם רישום נוכחות');

    // מדריכ/ה עם התראה — קודם
    const ordered = stats.guides.slice().sort((a, b) =>
      (b.unrecorded.length - a.unrecorded.length) || ((a.rate === null ? 101 : a.rate) - (b.rate === null ? 101 : b.rate)));
    grid.innerHTML = ordered.map(g => window.TS_meetGuideCard(g)).join('');
    window.TS_meetBindCopy(grid, stats);
  };

  // תא "נוכחות" בטבלת המורים של mabat
  window.MEET_cell = function (teacherId) {
    if (!report) return '<span class="mv-chip none">…</span>';
    return window.TS_meetRateChip(personByTeacher[teacherId]);
  };
})();
