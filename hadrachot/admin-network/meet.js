/* ============================================================
   נוכחות במפגשי ההדרכה — המסך של הרשת (18.9.26)
   -----------------------------------------------------------
   עד היום דשבורד הרשת קרא רק את מערכת ההדרכות הישנה, והציג "מדידת הנוכחות
   טרם החלה" גם כשכבר נרשמו נוכחויות במפגשי הזום.
   כאן: כרטיס לכל **מקצוע · מדריכ/ה** שיש בה מורים מהרשת, עם פירוט לפי
   בית ספר ורשימת מי שלא השתתף — אותו כרטיס בדיוק שהמפקח.ת והמבט הארצי
   רואים (assets/meet-view.js), רק שהנתונים מוגבלים לרשת.
   שליפה: meet.scope?network=<id> — שורות הנוכחות של מורי הרשת בלבד.
   ============================================================ */
(function () {
  let stats = null, failed = false, loaded = false;

  document.addEventListener('DOMContentLoaded', () => {
    const id = TS.urlParam('network', '');
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
    const held = gs.reduce((s, g) => s + g.held.length, 0);
    const persons = gs.reduce((a, g) => a.concat(g.persons), []);
    const never = persons.filter(p => !p.participated).length;
    if (sum) {
      sum.innerHTML = held
        ? `${gs.length} קבוצות הדרכה · ${held} מפגשים שהתקיימו · ` +
          (never ? `<b style="color:#8f2f1c">${never} מורים לא השתתפו באף מפגש</b>`
                 : '<b style="color:#1f7a5c">כל המורים השתתפו לפחות פעם אחת</b>')
        : `${gs.length} קבוצות הדרכה · עוד לא התקיים מפגש עם רישום נוכחות`;
    }
    box.innerHTML = gs.map(g => window.TS_meetGuideCard(g)).join('');
    window.TS_meetBindCopy(box, stats);

    // ה-KPI בראש הדף הגיע מהמערכת הישנה והציג "—" גם כשיש נתונים
    const rated = persons.filter(p => p.held > 0);
    const rate = rated.length ? Math.round(rated.reduce((s, p) => s + p.rate, 0) / rated.length) : null;
    const attEl = document.getElementById('stat-attendance');
    if (attEl && rate !== null) {
      attEl.textContent = rate + '%';
      attEl.className = 'cmd-metric-value ' + (rate >= 80 ? 'ok' : rate >= 50 ? 'warn' : 'err');
    }
    const missedEl = document.getElementById('stat-missed');
    if (missedEl && held) missedEl.textContent = never;
  }
})();
