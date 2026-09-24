/* ============================================================
   נוכחות במפגשי ההדרכה — המסך של הרשת (18.9.26)
   -----------------------------------------------------------
   עד היום דשבורד הרשת קרא רק את מערכת ההדרכות הישנה, והציג "מדידת הנוכחות
   טרם החלה" גם כשכבר נרשמו נוכחויות במפגשי הזום.
   המבנה (בקשת מיטל 18.9.26): קודם **השורה התחתונה** — אחוז הנוכחות של
   הרשת; אחריה **טבלה חודשית** — לכל חודש אחוז, ובפתיחה אילו בתי ספר לא
   השתתפו; ורק אחר כך הפירוט לפי מקצוע ומדריכ/ה.
   **יחידת הספירה היא חודש:** שני המועדים של אותו חודש (בוקר וערב) הם
   הדרכה אחת, ומי שהיה באחד מהם השתתף בהדרכה של החודש.
   שליפה: meet.scope?network=<id> — שורות הנוכחות של מורי הרשת בלבד.
   ============================================================ */
(function () {
  let stats = null, failed = false, loaded = false;

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const L = d => (window.TS_meetDateLabel ? window.TS_meetDateLabel(d) : d);

  /* חודשי ההדרכה של הרשת — איחוד של כל קבוצות ההדרכה, ולכל חודש חתך
     לפי בית ספר. זה החתך שמנהל/ת הרשת מבקש/ת: מי לא השתתף החודש. */
  function networkMonths(gs) {
    const byMonth = {};
    gs.forEach(g => (g.months || []).forEach(mo => {
      const m = byMonth[mo.key] || (byMonth[mo.key] = {
        key: mo.key, label: mo.label, n: 0, present: 0, dates: {}, schools: {}
      });
      m.n += mo.rosterN;
      m.present += mo.rosterPresent;
      mo.dates.forEach(d => { m.dates[d] = 1; });
      const add = (p, ok) => {
        const name = p.schoolName || '— ללא שיוך —';
        const sc = m.schools[name] || (m.schools[name] = { name: name, n: 0, present: 0, absent: [] });
        sc.n++;
        if (ok) sc.present++; else sc.absent.push(p.name);
      };
      mo.present.forEach(p => add(p, true));
      mo.absent.forEach(p => add(p, false));
    }));
    return Object.keys(byMonth).sort().reverse().map(k => {
      const m = byMonth[k];
      m.rate = m.n ? Math.round(m.present / m.n * 100) : null;
      m.schoolList = Object.keys(m.schools).map(n => {
        const sc = m.schools[n];
        sc.rate = sc.n ? Math.round(sc.present / sc.n * 100) : null;
        return sc;
      }).sort((a, b) => a.rate - b.rate || a.name.localeCompare(b.name, 'he'));
      m.dateList = Object.keys(m.dates).sort();
      return m;
    });
  }

  function monthsHtml(gs) {
    const months = networkMonths(gs);
    if (!months.length) return '';
    const n = months.reduce((s, m) => s + m.n, 0);
    const present = months.reduce((s, m) => s + m.present, 0);
    const rate = n ? Math.round(present / n * 100) : null;
    const rc = window.TS_rateClass ? window.TS_rateClass(rate) : '';
    return `
      <div class="mv-bottom" style="margin-bottom:12px;">
        <div class="mv-bottom-rate ${rc}"><b>${rate}%</b><span>נוכחות הרשת בהדרכות</span></div>
        <div class="mv-bottom-tx">${months.length === 1 ? 'הדרכה חודשית אחת התקיימה' : months.length + ' הדרכות חודשיות התקיימו'} · ${gs.length} קבוצות הדרכה</div>
      </div>
      <table class="mv-table">
        <thead><tr><th>חודש</th><th>מועדים</th><th>אחוז נוכחות</th><th>השתתפו</th><th>בתי ספר</th></tr></thead>
        <tbody>${months.map(m => {
          const zero = m.schoolList.filter(sc => !sc.present);
          return `
          <tr>
            <td><b>${esc(m.label)}</b></td>
            <td class="num">${m.dateList.map(L).join(' · ')}</td>
            <td class="num"><span class="mv-chip ${window.TS_rateClass(m.rate)}">${m.rate}%</span></td>
            <td class="num">${m.present}/${m.n}</td>
            <td>${zero.length
              ? `<b style="color:#8f2f1c">${zero.length} בתי ספר בלי אף משתתף</b>`
              : '<span style="color:#1f7a5c">בכל בתי הספר היו משתתפים</span>'}</td>
          </tr>
          <tr class="mv-sub-row"><td colspan="5">
            <details>
              <summary>פירוט לפי בית ספר (${m.schoolList.length})</summary>
              <table class="mv-table">
                <thead><tr><th>בית ספר</th><th>אחוז</th><th>השתתפו</th><th>מי לא השתתף/ה</th></tr></thead>
                <tbody>${m.schoolList.map(sc => `
                  <tr>
                    <td>${esc(sc.name)}</td>
                    <td class="num"><span class="mv-chip ${window.TS_rateClass(sc.rate)}">${sc.rate}%</span></td>
                    <td class="num">${sc.present}/${sc.n}</td>
                    <td>${sc.absent.length ? esc(sc.absent.join(' · ')) : '<span style="color:#1f7a5c">כולם השתתפו</span>'}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </details>
          </td></tr>`;
        }).join('')}
        </tbody>
      </table>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const id = TS.urlParam('network', '').replace(/^net_/, '');   // net_ort → ort (ראו dashboard.js)
    if (id) load(id);
  });

  async function load(networkId) {
    const [rep, tl] = await Promise.all([
      TS.api('meet.scope', { network: networkId }, { cache: 'no' }),
      TS.api('teachers.list', { network: 'net_' + networkId })
    ]);
    loaded = true;
    if (!rep || !rep.ok || !tl || !tl.ok) { failed = true; render(); return; }
    const guides = Object.keys(window.TS_GUIDES || {})
      .map(k => Object.assign({ slug: k }, window.TS_GUIDES[k]));
    const hours = {};
    (rep.data.hours || []).forEach(h => { (hours[h.guideSlug] = hours[h.guideSlug] || []).push(h); });
    stats = window.TS_meetStats({
      today: rep.data.today, meetings: rep.data.meetings, rows: rep.data.rows,
      teachers: tl.data || [], guides: guides, hours: hours
    });
    render();
  }

  function render() {
    const box = document.getElementById('nw-meet-grid');
    const sum = document.getElementById('nw-meet-summary');
    if (!box) return;
    if (!loaded) { box.innerHTML = '<div class="mv-empty">טוען נוכחות…</div>'; return; }
    if (failed) {
      box.innerHTML = '<div class="mv-empty">נתוני הנוכחות לא נטענו — תקלה רגעית בשרת. רעננו בעוד רגע.</div>';
      return;
    }
    const gs = (stats.guides || []).filter(g => g.persons.length)
      .sort((a, b) => ((a.rate === null ? 101 : a.rate) - (b.rate === null ? 101 : b.rate)));
    if (!gs.length) {
      box.innerHTML = '<div class="mv-empty">אין עדיין קבוצות הדרכה עם מורים מהרשת.</div>';
      if (sum) sum.textContent = '';
      return;
    }
    const monthsN = new Set();
    gs.forEach(g => (g.months || []).forEach(mo => monthsN.add(mo.key)));
    const persons = gs.reduce((a, g) => a.concat(g.persons), []);
    /* "לא השתתף/ה" נאמר רק על מי שיש לו מדידה. מורה בקבוצה שטרם התקיימה בה
       הדרכה עם רישום נוכחות הוא "טרם נמדד" — לא היעדרות. בלי ההפרדה הזו
       הכרטיס הציג 191 "לא השתתפו" כש-169 מהם כלל לא נמדדו (קודקס, 20.9.26).
       אותו כלל כבר קיים במנוע (never) ובמבט הארצי (f-never). */
    const measured = persons.filter(p => p.held > 0);
    const never = measured.filter(p => !p.participated).length;
    const unmeasured = persons.length - measured.length;
    const groupsMeasured = gs.filter(g => (g.months || []).length).length;
    const held = monthsN.size;
    if (sum) {
      sum.innerHTML = held
        ? `${held === 1 ? 'הדרכה חודשית אחת התקיימה' : held + ' הדרכות חודשיות התקיימו'} · ` +
          `מבוסס על ${groupsMeasured} מתוך ${gs.length} קבוצות הדרכה · ` +
          (never ? `<b style="color:#8f2f1c">${never} מורים לא השתתפו באף הדרכה</b>`
                 : '<b style="color:#1f7a5c">כל מי שנמדד השתתף לפחות פעם אחת</b>') +
          (unmeasured ? ` · <span style="color:var(--text-muted)">${unmeasured} מורים טרם נמדדו</span>` : '')
        : `${gs.length} קבוצות הדרכה · ההדרכות טרם התחילו`;
    }
    // קודם החודשים (השורה התחתונה והפירוט), ואז הכרטיסים לפי מקצוע ומדריכ/ה
    const monthsBox = document.getElementById('nw-meet-months');
    if (monthsBox) monthsBox.innerHTML = monthsHtml(gs);
    box.innerHTML = gs.map(g => window.TS_meetGuideCard(g)).join('');
    window.TS_meetBindCopy(box, stats);
    applyToPage(gs, persons, { never: never, unmeasured: unmeasured, held: held,
      groups: gs.length, groupsMeasured: groupsMeasured });
  }

  /* ה-KPI וגרף המגמה שייכים לדשבורד הישן, והוא מצייר אותם כשהתשובה שלו
     מגיעה — לפעמים אחרינו, ואז הוא דרס את הנתונים האמיתיים ב-"—".
     dashboard.js קורא לנו בסוף ה-render שלו, והפונקציה בטוחה לקריאה חוזרת. */
  let last = null;
  function applyToPage(gs, persons, info) {
    if (gs) last = { gs: gs, persons: persons, info: info };
    if (!last) return;
    renderTrend(last.gs);
    const i = last.info;
    const rated = last.persons.filter(p => p.held > 0);
    const rate = rated.length ? Math.round(rated.reduce((s, p) => s + p.rate, 0) / rated.length) : null;
    const attEl = document.getElementById('stat-attendance');
    if (attEl && rate !== null) {
      attEl.textContent = rate + '%';
      attEl.className = 'cmd-metric-value ' + (rate >= 80 ? 'ok' : rate >= 50 ? 'warn' : 'err');
    }
    // אחוז בלי בסיס מדידה מטעה בתחילת השנה — כמה קבוצות בכלל נמדדו
    const attSub = document.getElementById('stat-attendance-sub');
    if (attSub) attSub.textContent = i.groupsMeasured
      ? 'מבוסס על ' + i.groupsMeasured + ' מתוך ' + i.groups + ' קבוצות'
      : 'טרם נמדד';
    const missedEl = document.getElementById('stat-missed');
    if (missedEl && i.held) missedEl.textContent = i.never;
    const missedSub = document.getElementById('stat-missed-sub');
    if (missedSub) missedSub.textContent = i.unmeasured ? i.unmeasured + ' מורים טרם נמדדו' : '';
  }
  window.NW_meetApply = function () { applyToPage(); };

  /* "מגמת נוכחות 6 חודשים" היה ריק תמיד — הגרף נבנה מהמערכת הישנה.
     עכשיו: עמודה לכל חודש הדרכה שהתקיים. */
  function renderTrend(gs) {
    const el = document.getElementById('trend-chart');
    if (!el) return;
    const months = networkMonths(gs).slice().reverse();
    if (!months.length) {
      el.innerHTML = '<div class="empty">ההדרכות טרם התחילו — הגרף ייבנה מההדרכה החודשית הראשונה.</div>';
      return;
    }
    el.innerHTML = `
      <div class="mv-trend">${months.map(m => `
        <div class="mv-trend-col" title="${esc(m.label)}: ${m.present} מתוך ${m.n}">
          <div class="mv-trend-bar-wrap"><div class="mv-trend-bar ${window.TS_rateClass(m.rate)}" style="height:${Math.max(m.rate, 2)}%"></div></div>
          <div class="mv-trend-val">${m.rate}%</div>
          <div class="mv-trend-lbl">${esc(m.label.replace(/ \d{4}$/, ''))}</div>
        </div>`).join('')}
      </div>`;
  }
})();
