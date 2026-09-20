/* ============================================================
   נוכחות במפגשים — תצוגה משותפת (14.9.26)
   כרטיס לכל מדריכ/ה: אחוז נוכחות, הדרכות שהתקיימו (חודש = הדרכה אחת,
   גם כששני המועדים בוקר/ערב), ההדרכה האחרונה,
   התראה על מפגש שעבר בלי רישום, ומי לא השתתף באף מפגש (עם העתקה).
   משמש את mabat/ (מבט המפקח.ת) ואת ministry/nochechut.html.
   הנתונים מחושבים ב-meet-stats.js.
   ============================================================ */
(function () {
  const ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  const L = d => window.TS_meetDateLabel(d);
  window.TS_meetAlertIcon = ALERT;   // אותה התראה גם במסכים שלא בונים כרטיס מלא

  // הדרכה פרטנית — עמודה נפרדת ליד אחוז הנוכחות במפגשים (לא נכנסת לאחוז)
  window.TS_meetIndividualChip = function (p) {
    if (!p || !p.individual) return '';
    return `<span class="mv-ind" title="הדרכה פרטנית: ${p.individual} מפגשים (${p.individualDates.map(L).join(', ')})">פרטני ×${p.individual}</span>`;
  };

  window.TS_meetRateChip = function (p) {
    const ind = window.TS_meetIndividualChip(p);
    if (!p || p.held === 0 || p.rate === null) return '<span class="mv-chip none" title="עוד לא התקיימה הדרכה עם רישום נוכחות">—</span>' + (ind ? ' ' + ind : '');
    const title = `${p.present} מתוך ${p.held} הדרכות חודשיות` +
      (p.monthsMissed && p.monthsMissed.length ? ' · לא השתתף/ה: ' + p.missed.join(', ') : '');
    return `<span class="mv-chip ${window.TS_rateClass(p.rate)}" title="${esc(title)}">${p.present}/${p.held}</span>` + (ind ? ' ' + ind : '');
  };

  /* אותו מורה בשתי קבוצות הדרכה — מורה מתמטיקה שטרם סומנה לו רמת יח"ל
     שייך גם לשירה וגם לגל (כלל מכוון: עדיף שיופיע אצל שתיהן מאשר שייפול
     בין הכיסאות). התא הציג את הקבוצה הראשונה לפי סדר המדריכים, ולכן הראה
     "—" גם כשבקבוצה השנייה יש נוכחות מלאה (קודקס, 20.9.26).
     כאן מוצגות כל הקבוצות שנמדדו, עם שם המדריכ/ה ליד כל אחת. */
  window.TS_meetRateChips = function (list) {
    const ps = (list || []).filter(Boolean);
    if (!ps.length) return window.TS_meetRateChip(null);
    const measured = ps.filter(p => p.held > 0);
    if (measured.length < 2) return window.TS_meetRateChip(measured[0] || ps[0]);
    return measured.map(p => window.TS_meetRateChip(p) +
      `<span style="color:var(--text-muted);font-size:11px;margin-inline-start:3px">${esc(String(p.guideName || '').split(' ')[0])}</span>`
    ).join(' ');
  };

  window.TS_meetGuideCard = function (g, opts) {
    opts = opts || {};
    const rc = window.TS_rateClass(g.rate);
    const heldN = g.held.length;
    const subjects = window.TS_guideSubjects ? window.TS_guideSubjects(g).join(' · ') : (g.subject || '');
    const warnings = [];
    if (g.unrecorded.length) {
      warnings.push(`<div class="mv-warn">${ALERT}<span><b>לא הוזנה נוכחות</b> למפגש${g.unrecorded.length > 1 ? 'ים' : ''} ${esc(g.unrecorded.map(u => u.label || L(u.date)).join(', '))}</span></div>`);
    }
    if (g.pending) warnings.push(`<div class="mv-warn soft">${ALERT}<span>${g.pending} רישומים עצמיים ממתינים לאישור המדריכ/ה</span></div>`);
    if (g.gaps) warnings.push(`<div class="mv-warn soft">${ALERT}<span>${g.gaps} נרשמו בעצמם אבל סומנו "לא נכח/ה"</span></div>`);

    const lastMonth = (g.months && g.months.length) ? g.months[g.months.length - 1] : null;
    const lastLine = lastMonth
      ? `<div class="mv-line">ההדרכה האחרונה (${esc(lastMonth.label)}): <b>${lastMonth.rosterPresent}</b> מתוך ${lastMonth.rosterN} השתתפו</div>`
      : `<div class="mv-line">${g.planTotal ? 'עוד לא התקיים מפגש עם רישום נוכחות' : 'אין תוכנית מפגשים במערכת, ועוד לא נרשמה נוכחות'}</div>`;
    const nextLine = g.next ? `<div class="mv-line">המפגש הבא: <b>${esc(g.next.label || L(g.next.date))}</b>${g.next.topic ? ' · ' + esc(g.next.topic) : ''}</div>` : '';

    /* פירוט לפי חודש — שני המועדים של אותו חודש (בוקר/ערב) הם הדרכה אחת,
       ולכן שורה אחת לחודש, ולצידה מי לא השתתף באף אחד מהמועדים. */
    const months = g.months || [];
    const meetingsTable = months.length ? `
      <details>
        <summary>לפי חודש (${months.length})</summary>
        <table class="mv-table">
          <thead><tr><th>חודש</th><th>מועדים</th><th>השתתפו</th><th>אחוז</th></tr></thead>
          <tbody>${months.slice().reverse().map(mo => `
            <tr>
              <td>${esc(mo.label)}</td>
              <td class="num" title="${esc(mo.topics.join(' · '))}">${mo.dates.map(L).join(' · ')}</td>
              <td class="num">${mo.rosterPresent}/${mo.rosterN}</td>
              <td class="num">${mo.rate === null ? '<span class="mv-chip none">—</span>' : `<span class="mv-chip ${window.TS_rateClass(mo.rate)}">${mo.rate}%</span>`}</td>
            </tr>
            ${mo.absent && mo.absent.length ? `<tr class="mv-sub-row"><td colspan="4"><b>לא השתתפו:</b> ${esc(mo.absent.map(pp => pp.name + (pp.schoolName ? ' (' + pp.schoolName + ')' : '')).join(' · '))}</td></tr>` : ''}
          `).join('')}
          </tbody>
        </table>
      </details>` : '';

    const never = g.never;
    const neverBlock = never.length ? `
      <details>
        <summary>לא השתתפו כלל — לא במפגש ולא בהדרכה פרטנית (${never.length})</summary>
        <div class="mv-people">${never.map(p => `<div><b>${esc(p.name)}</b><span>${esc(p.schoolName)}</span></div>`).join('')}</div>
        <button type="button" class="mv-copy" data-mv-copy="${esc(g.slug)}">העתקת הרשימה</button>
      </details>` : '';

    // לפי בית ספר — איפה הנוכחות נמוכה, וכמה הדרכה פרטנית קיבל (לפחות אחת בשנה)
    let schoolBlock = '';
    if ((heldN || g.hoursLoaded) && g.persons.length) {
      const bySchool = {};
      g.persons.forEach(p => {
        const s = bySchool[p.schoolName] || (bySchool[p.schoolName] = { name: p.schoolName, n: 0, present: 0, held: 0, indT: 0 });
        s.n++; s.present += p.present; s.held += p.held; if (p.individual) s.indT++;
      });
      const indOf = {};
      (g.schools || []).forEach(s => { indOf[s.name] = s.individual; });
      const list = Object.values(bySchool).map(s => Object.assign(s, {
        rate: s.held ? Math.round(s.present / s.held * 100) : null,
        individual: indOf[s.name] || 0
      })).sort((a, b) => heldN ? (a.rate - b.rate) : (a.individual - b.individual) || a.name.localeCompare(b.name, 'he'));
      schoolBlock = `
      <details>
        <summary>לפי בית ספר (${list.length})</summary>
        <table class="mv-table">
          <thead><tr><th>בית ספר</th><th>מורים</th><th>נוכחות</th>${g.hoursLoaded ? '<th>פרטני</th>' : ''}</tr></thead>
          <tbody>${list.map(s => `<tr><td>${esc(s.name || '—')}</td><td class="num">${s.n}</td>
            <td class="num">${s.rate === null ? '<span class="mv-chip none">—</span>' : `<span class="mv-chip ${window.TS_rateClass(s.rate)}">${s.rate}%</span>`}</td>
            ${g.hoursLoaded ? `<td class="num">${s.individual ? `<span class="mv-ind" title="${s.individual} מפגשים פרטניים · ${s.indT} מתוך ${s.n} מורים">${s.indT}/${s.n} מורים</span>` : '<span class="mv-ind zero" title="עוד לא קיבל הדרכה פרטנית השנה">0</span>'}</td>` : ''}</tr>`).join('')}</tbody>
        </table>
      </details>`;
    }

    // דרישה: כל בית ספר לפחות הדרכה פרטנית אחת בשנה
    let indBlock = '';
    if (g.hoursLoaded && g.schools && g.schools.length) {
      const total = g.schools.length, done = g.schoolsWithIndividual, missing = g.schoolsNoIndividual;
      const tMissing = g.teachersNoIndividual || [];
      indBlock = `
      <div class="mv-line">הדרכה פרטנית השנה: <b>${g.individualSessions}</b> מפגשים · <b>${g.individualTeachers}</b> מתוך ${g.rosterN} מורים · <b>${done}</b> מתוך ${total} בתי ספר${g.individualOutside ? ` <span title="נרשמו בשם שלא נמצא ברשימת הקבוצה">(+${g.individualOutside} לא מזוהים)</span>` : ''}</div>
      ${tMissing.length ? `
      <details>
        <summary>מורים בלי הדרכה פרטנית השנה (${tMissing.length} מתוך ${g.rosterN})</summary>
        <div class="mv-people">${tMissing.map(p => `<div><b>${esc(p.name)}</b><span>${esc(p.schoolName)}</span></div>`).join('')}</div>
        <button type="button" class="mv-copy" data-mv-copy-tind="${esc(g.slug)}">העתקת הרשימה</button>
      </details>` : `<div class="mv-line" style="color:#1f7a5c"><b>כל המורים בקבוצה קיבלו הדרכה פרטנית השנה</b></div>`}
      ${missing.length ? `
      <details>
        <summary>בתי ספר בלי הדרכה פרטנית השנה (${missing.length} מתוך ${total})</summary>
        <div class="mv-people">${missing.map(n => `<div><b>${esc(n)}</b></div>`).join('')}</div>
        <button type="button" class="mv-copy" data-mv-copy-schools="${esc(g.slug)}">העתקת הרשימה</button>
      </details>` : `<div class="mv-line" style="color:#1f7a5c"><b>כל ${done} בתי הספר קיבלו הדרכה פרטנית השנה</b></div>`}`;
    }

    return `
      <div class="mv-card${g.unrecorded.length ? ' alert' : ''}">
        <div class="mv-head">
          <div>
            <div class="mv-name">${esc(g.name)}</div>
            <div class="mv-sub">${esc(subjects)}${opts.showInspector && g.inspectorName ? ' · מפקח.ת: ' + esc(g.inspectorName) : ''}</div>
          </div>
          <div class="mv-rate ${rc}"><b>${g.rate === null ? '—' : g.rate + '%'}</b><span>נוכחות ממוצעת</span></div>
        </div>
        <div class="mv-kpis">
          <div class="mv-kpi"><b>${months.length}</b><span>הדרכות שהתקיימו</span><small class="mv-kpi-note">${heldN} מועדים</small></div>
          <div class="mv-kpi"><b>${g.rosterN}</b><span>מורים בקבוצה</span></div>
          <div class="mv-kpi"><b>${heldN ? never.length : '—'}</b><span>לא השתתפו כלל</span></div>
          ${g.hoursLoaded && g.rosterN ? `<div class="mv-kpi${(g.teachersNoIndividual || []).length ? '' : ' ok'}"><b>${g.individualTeachers}<small style="font-size:11px;color:var(--text-muted)">/${g.rosterN}</small></b><span>מורים עם הדרכה פרטנית</span></div>` : ''}
          ${g.hoursLoaded && g.schools && g.schools.length ? `<div class="mv-kpi${g.schoolsNoIndividual.length ? '' : ' ok'}"><b>${g.schoolsWithIndividual}<small style="font-size:11px;color:var(--text-muted)">/${g.schools.length}</small></b><span>בתי ספר עם הדרכה פרטנית</span></div>` : ''}
        </div>
        ${lastLine}${nextLine}${indBlock}
        ${warnings.join('')}
        ${meetingsTable}${schoolBlock}${neverBlock}
      </div>`;
  };

  // העתקת רשימת "לא השתתפו" — שם · בית ספר, שורה לכל אחד
  window.TS_meetBindCopy = function (root, stats) {
    root.querySelectorAll('[data-mv-copy]').forEach(b => {
      b.addEventListener('click', () => {
        const g = stats.guides.find(x => x.slug === b.dataset.mvCopy);
        if (!g) return;
        const text = g.name + ' — לא השתתפו כלל (לא במפגש ולא בהדרכה פרטנית):\n' + g.never.map(p => p.name + ' · ' + p.schoolName).join('\n');
        copyText_(b, text);
      });
    });
    root.querySelectorAll('[data-mv-copy-tind]').forEach(b => {
      b.addEventListener('click', () => {
        const g = stats.guides.find(x => x.slug === b.dataset.mvCopyTind);
        if (!g) return;
        copyText_(b, g.name + ' — מורים שעוד לא קיבלו הדרכה פרטנית השנה:\n' + g.teachersNoIndividual.map(p => p.name + ' · ' + p.schoolName).join('\n'));
      });
    });
    root.querySelectorAll('[data-mv-copy-schools]').forEach(b => {
      b.addEventListener('click', () => {
        const g = stats.guides.find(x => x.slug === b.dataset.mvCopySchools);
        if (!g) return;
        copyText_(b, g.name + ' — בתי ספר שעוד לא קיבלו הדרכה פרטנית השנה:\n' + g.schoolsNoIndividual.join('\n'));
      });
    });
  };
  function copyText_(b, text) {
    const done = () => { const t = b.textContent; b.textContent = 'הועתק ✓'; setTimeout(() => { b.textContent = t; }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => window.prompt('להעתקה:', text));
    else window.prompt('להעתקה:', text);
  };
})();
