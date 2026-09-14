/* ============================================================
   נוכחות במפגשים — תצוגה משותפת (14.9.26)
   כרטיס לכל מדריכ/ה: אחוז נוכחות, מפגשים שהתקיימו, המפגש האחרון,
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

  window.TS_meetRateChip = function (p) {
    if (!p || p.held === 0 || p.rate === null) return '<span class="mv-chip none" title="עוד לא התקיים מפגש עם רישום נוכחות">—</span>';
    return `<span class="mv-chip ${window.TS_rateClass(p.rate)}" title="${p.present} מתוך ${p.held} מפגשים">${p.present}/${p.held}</span>`;
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

    const lastLine = g.last
      ? `<div class="mv-line">המפגש האחרון (${esc(L(g.last.date))}): <b>${g.last.present}</b> מתוך ${g.rosterN} השתתפו</div>`
      : `<div class="mv-line">${g.planTotal ? 'עוד לא התקיים מפגש עם רישום נוכחות' : 'אין תוכנית מפגשים במערכת, ועוד לא נרשמה נוכחות'}</div>`;
    const nextLine = g.next ? `<div class="mv-line">המפגש הבא: <b>${esc(g.next.label || L(g.next.date))}</b>${g.next.topic ? ' · ' + esc(g.next.topic) : ''}</div>` : '';

    const meetingsTable = heldN ? `
      <details>
        <summary>פירוט המפגשים (${heldN})</summary>
        <table class="mv-table">
          <thead><tr><th>תאריך</th><th>נושא</th><th>השתתפו</th><th>ממתינים</th></tr></thead>
          <tbody>${g.held.slice().reverse().map(m => `
            <tr>
              <td class="num">${esc(L(m.date))}</td>
              <td>${esc(m.topic || '—')}${m.counts.zoom ? ' <span class="mv-zoom" title="סומן מתוך דוח המשתתפים של הזום">זום</span>' : ''}</td>
              <td class="num">${m.rosterPresent}/${g.rosterN}${g.outsidePresent && m.counts.present > m.rosterPresent ? ' <span title="השתתפו גם מחוץ לרשימת הקבוצה">+' + (m.counts.present - m.rosterPresent) + '</span>' : ''}</td>
              <td class="num">${m.counts.pending || ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </details>` : '';

    const never = g.never;
    const neverBlock = never.length ? `
      <details>
        <summary>לא השתתפו באף מפגש (${never.length})</summary>
        <div class="mv-people">${never.map(p => `<div><b>${esc(p.name)}</b><span>${esc(p.schoolName)}</span></div>`).join('')}</div>
        <button type="button" class="mv-copy" data-mv-copy="${esc(g.slug)}">העתקת הרשימה</button>
      </details>` : '';

    // לפי בית ספר — איפה הנוכחות נמוכה
    let schoolBlock = '';
    if (heldN && g.persons.length) {
      const bySchool = {};
      g.persons.forEach(p => {
        const s = bySchool[p.schoolName] || (bySchool[p.schoolName] = { name: p.schoolName, n: 0, present: 0 });
        s.n++; s.present += p.present;
      });
      const list = Object.values(bySchool).map(s => Object.assign(s, { rate: Math.round(s.present / (s.n * heldN) * 100) }))
        .sort((a, b) => a.rate - b.rate);
      schoolBlock = `
      <details>
        <summary>לפי בית ספר (${list.length})</summary>
        <table class="mv-table">
          <thead><tr><th>בית ספר</th><th>מורים</th><th>נוכחות</th></tr></thead>
          <tbody>${list.map(s => `<tr><td>${esc(s.name || '—')}</td><td class="num">${s.n}</td><td class="num"><span class="mv-chip ${window.TS_rateClass(s.rate)}">${s.rate}%</span></td></tr>`).join('')}</tbody>
        </table>
      </details>`;
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
          <div class="mv-kpi"><b>${heldN}${g.planTotal ? '<small style="font-size:11px;color:var(--text-muted)">/' + g.planTotal + '</small>' : ''}</b><span>מפגשים שהתקיימו</span></div>
          <div class="mv-kpi"><b>${g.rosterN}</b><span>מורים בקבוצה</span></div>
          <div class="mv-kpi"><b>${heldN ? never.length : '—'}</b><span>לא השתתפו כלל</span></div>
        </div>
        ${lastLine}${nextLine}
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
        const text = g.name + ' — לא השתתפו באף מפגש:\n' + g.never.map(p => p.name + ' · ' + p.schoolName).join('\n');
        const done = () => { const t = b.textContent; b.textContent = 'הועתק ✓'; setTimeout(() => { b.textContent = t; }, 2000); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => window.prompt('להעתקה:', text));
        else window.prompt('להעתקה:', text);
      });
    });
  };
})();
