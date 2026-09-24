// Ministry / National Inspector Dashboard — מנור · רויטל אמיר
let state = {
  filter: { subject: '', availableSubjects: [] },
  summary: {},
  networkBreakdown: [],
  schoolBreakdown: []
};
let currentSubject = '';
let dashLoaded = false;   // ministry.dashboard הגיע (רשתות, בתי ספר, מורים)

// מגזר לכל בית ספר — לצ'יפ המגזר בטבלת בתי הספר (מפת פריסת הפיקוח)
let sectorBySchool = {};   // sch_id -> kelali | haredi | arab

// נוכחות לפי מקצוע (24.9.26, בקשת מיטל) — במקום "המורים שהוזנו לפי מגזר"
// ו"מורים לפי מקצוע ומגזר". null = עוד נטען; { failed } = לא נטען.
let subjectAtt = null;

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('month-label').textContent = TS.monthLabel();
  loadSectorMap();       // קובץ סטטי — לצ'יפ המגזר בטבלה
  loadSubjectAttendance();   // רץ במקביל ל-load — לא חוסם את שאר הדשבורד
  await load();
});

async function load() {
  const res = TS.getAppsScriptUrl()
    ? await TS.api('ministry.dashboard', { subject: currentSubject })
    : { ok: false, error: 'no_url' };
  if (res.ok && res.data) {
    state = res.data;
    dashLoaded = true;
    render();
  } else {
    renderLoadError(res.error || '');
  }
}

// שגיאת טעינה — מציגים אמת, לא נתוני דמו
function renderLoadError(err) {
  const msg = 'לא הצלחנו לטעון את הנתונים מהשרת — נסו לרענן את הדף.' +
    (err ? ' (שגיאה: ' + escapeHtml(err) + ')' : '');
  document.getElementById('networks-featured').innerHTML = emptyMsg(msg);
  document.getElementById('networks-grid').innerHTML = '';
  const tbody = document.getElementById('weak-schools-body');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="padding:24px; text-align:center; color:var(--text-muted);">' + msg + '</td></tr>';
}

async function loadSectorMap() {
  try {
    const mapRes = await fetch('../_data/sector-map-2027.json');
    const map = await mapRes.json();
    (map.schools || []).forEach(s => { sectorBySchool[s.id] = s.sector; });
  } catch (e) { /* המפה לא זמינה — הטבלה בלי צ'יפ מגזר */ }
  renderWeakSchools();   // רענון — כדי להוסיף צ'יפ מגזר לטבלה
}

function render() { renderMeetParts(); }

/* ============================================================
   מקצועות עם הנוכחות הנמוכה והגבוהה (24.9.26)
   -----------------------------------------------------------
   מקור: נוכחות מפגשי ההדרכה (meet.report) + רשימת המורים + השעות
   הפרטניות, מחושב ב-assets/meet-stats.js — בדיוק כמו בדוח הנוכחות
   (nochechut.html): יחידת הספירה היא חודש הדרכה, ושעה פרטנית מספקת את
   החודש. לכל מקצוע: סך החודשים שהמורים השתתפו בהם ÷ סך החודשים שנמדדו.
   נכנסים רק מורים שנמדדו (היה להם לפחות חודש הדרכה אחד).
   ============================================================ */
const SA_MIN_TEACHERS = 3;   // מקצוע עם פחות מורים שנמדדו לא נכנס לדירוג — אחוז של מורה אחד/שניים מטעה

async function loadSubjectAttendance() {
  try {
    if (typeof window.TS_meetStats !== 'function') throw new Error('meet-stats');
    const slugs = Object.keys(window.TS_GUIDES || {});
    const [rep, tl, ws] = await Promise.all([
      TS.api('meet.report', {}, { cache: 'no' }),
      TS.api('teachers.list', {}),
      // השעות הפרטניות נספרות כהשתתפות — נכשל? מחשבים בלעדיהן
      TS.api('guide.workspace', { guides: slugs.join(',') }, { cache: 'no' })
    ]);
    if (!rep || !rep.ok || !rep.data || !tl || !tl.ok) {
      subjectAtt = { failed: true }; meetStats = { failed: true };
      renderMeetParts(); return;
    }
    const hours = (ws && ws.ok && ws.data && ws.data.hours) || null;
    const guides = slugs.map(k => Object.assign({ slug: k }, window.TS_GUIDES[k]));
    const stats = window.TS_meetStats({
      today: rep.data.today, meetings: rep.data.meetings, rows: rep.data.rows,
      teachers: tl.data || [], guides: guides, hours: hours
    });
    meetStats = stats;
    subjectAtt = aggregateBySubject(stats);
  } catch (e) {
    console.error('subject attendance', e);
    subjectAtt = { failed: true }; meetStats = { failed: true };
  }
  renderMeetParts();
}

// כל מה שנשען על נוכחות המפגשים — מתרענן כשהנתונים מגיעים ובכל החלפת מקצוע
function renderMeetParts() {
  renderSubjectPills();
  renderCommandStrip();
  renderNetworkLenses();
  renderWeakSchools();
  renderSubjectAttendance();
}

/* ============================================================
   נוכחות ארצית / לפי רשת / לפי בית ספר — מאותם נתוני מפגשים (24.9.26)
   -----------------------------------------------------------
   עד היום הריבועים העליונים, כרטיסי הרשתות וטבלת בתי הספר קראו את
   מערכת ההדרכות הישנה (טאב attendance), שבה אין אף רישום — ולכן הכול
   הראה "—" / "טרם החלה מדידה" גם כשהמדריכים כבר רשמו נוכחות בזום.
   עכשיו הכול מחושב מ-meetStats (meet.report + teachers.list + שעות
   פרטניות, דרך TS_meetStats) — באותו כלל חודשי כמו דוח הנוכחות.
   המספרים המבניים (רשתות, בתי ספר, מורים) נשארים מ-ministry.dashboard.
   ============================================================ */
let meetStats = null;          // null = נטען · { failed } = לא נטען · אחרת תוצאת TS_meetStats
const MIN_MEASURED = 3;        // רשת/בית ספר עם פחות מורים שנמדדו לא נכנס לדירוג "החלשים"

// הקבוצות והמשתתפים — בסינון המקצוע אם נבחר
function meetGroups() {
  if (!meetStats || meetStats.failed) return [];
  const gs = meetStats.guides || [];
  return currentSubject ? gs.filter(g => window.TS_guideTeaches(g, currentSubject)) : gs;
}
function meetPersons() {
  const out = [];
  meetGroups().forEach(g => (g.persons || []).forEach(p => {
    if (currentSubject && (p.subjects || []).indexOf(currentSubject) < 0) return;
    out.push(p);
  }));
  return out;
}
function rateOf(ps) {
  const held = ps.reduce((s, p) => s + p.held, 0);
  const present = ps.reduce((s, p) => s + p.present, 0);
  return held ? Math.round(present / held * 100) : null;
}
// סיכום לקבוצת משתתפים: כמה נמדדו, אחוז, מי השתתף, מי בסיכון (מתחת ל-50%)
function summarize(ps) {
  const measured = ps.filter(p => p.held > 0);
  return {
    all: ps.length,
    measured: measured.length,
    rate: rateOf(measured),
    participated: measured.filter(p => p.participated).length,
    risk: measured.filter(p => p.rate !== null && p.rate < 50).length,
    onTarget: measured.filter(p => p.rate !== null && p.rate >= 80).length
  };
}
const netKey = id => String(id || '').replace(/^net_/, '');
function byNetwork() {
  const m = {};
  meetPersons().forEach(p => { (m[netKey(p.network)] = m[netKey(p.network)] || []).push(p); });
  const out = {};
  Object.keys(m).forEach(k => { out[k] = summarize(m[k]); });
  return out;
}

function aggregateBySubject(stats) {
  const bySubj = {};
  (stats.guides || []).forEach(g => {
    (g.persons || []).forEach(p => {
      if (!p.held) return;   // לא נמדד/ה עדיין — לא נכנס לאחוז
      const mine = (p.subjects || []).filter(s => window.TS_guideTeaches(g, s));
      const subs = mine.length ? mine : [p.subject || window.TS_guideSubjects(g)[0] || '—'];
      subs.forEach(s => {
        const a = bySubj[s] || (bySubj[s] = { name: s, present: 0, held: 0, people: {}, guides: {} });
        a.present += p.present;
        a.held += p.held;
        a.people[(p.name || '') + '|' + (p.schoolName || '')] = 1;
        a.guides[g.slug] = 1;
      });
    });
  });
  const list = Object.values(bySubj).map(a => ({
    name: a.name,
    rate: a.held ? Math.round(a.present / a.held * 100) : null,
    teachers: Object.keys(a.people).length,
    guides: Object.keys(a.guides).length,
    present: a.present, held: a.held
  })).filter(a => a.rate !== null);
  return { list: list, today: stats.today };
}

function renderSubjectAttendance() {
  const box = document.getElementById('subject-att');
  if (!box) return;
  if (!subjectAtt) { box.innerHTML = '<div class="sa-empty">טוען נוכחות לפי מקצוע…</div>'; return; }
  if (subjectAtt.failed) {
    box.innerHTML = '<div class="sa-empty">נתוני הנוכחות לא נטענו — תקלה רגעית בשרת. רעננו את הדף בעוד רגע.</div>';
    return;
  }
  const all = subjectAtt.list.slice();
  if (!all.length) {
    box.innerHTML = '<div class="sa-empty">טרם נמדדה נוכחות — עדיין לא התקיימו הדרכות עם רישום נוכחות. ' +
      'ברגע שהמדריכים ירשמו נוכחות, יופיעו כאן המקצועות עם הנוכחות הנמוכה והגבוהה.</div>';
    return;
  }
  // דירוג רק על מקצועות עם מספיק מורים שנמדדו; אם אין מספיק כאלה — על כולם
  let ranked = all.filter(a => a.teachers >= SA_MIN_TEACHERS);
  const usedMin = ranked.length >= 2;
  if (!usedMin) ranked = all;
  ranked.sort((a, b) => a.rate - b.rate || b.teachers - a.teachers || a.name.localeCompare(b.name, 'he'));
  const lowN = Math.min(3, Math.floor(ranked.length / 2));
  const low = ranked.slice(0, lowN);
  const high = ranked.slice(lowN).reverse().slice(0, 3);

  const rc = r => (window.TS_rateClass ? window.TS_rateClass(r) : (r >= 80 ? 'high' : r >= 60 ? 'mid' : 'low'));
  const row = a => `
    <div class="sa-row${currentSubject === a.name ? ' sel' : ''}">
      <span class="sa-name">${escapeHtml(a.name)}</span>
      <span class="sa-rate ${rc(a.rate)}">${a.rate}%</span>
      <span class="sa-bar" aria-hidden="true"><i class="${rc(a.rate)}" style="width:${Math.max(2, a.rate)}%"></i></span>
      <span class="sa-meta">${a.teachers} מורים שנמדדו · ${a.guides} ${a.guides === 1 ? 'מדריך/ה' : 'מדריכים'}</span>
    </div>`;
  const ICON_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7l6 6 4-4 8 8"/><path d="M21 11v6h-6"/></svg>';
  const ICON_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>';

  const sub = document.getElementById('subject-att-sub');
  if (sub) sub.textContent = 'אחוז ההשתתפות של המורים בהדרכות החודשיות, לפי מקצוע (כולל הדרכה פרטנית). ' +
    all.length + ' מקצועות נמדדו' + (usedMin ? ' · בדירוג רק מקצועות עם ' + SA_MIN_TEACHERS + ' מורים שנמדדו לפחות' : '') + '.';

  const allSorted = all.slice().sort((a, b) => a.rate - b.rate || a.name.localeCompare(b.name, 'he'));
  // מעט מקצועות נמדדו (תחילת השנה) — "נמוך" ו"גבוה" עוד לא אומרים הרבה: דירוג אחד
  const cols = ranked.length < 4
    ? `<div class="sa-cols" style="grid-template-columns:1fr;">
         <div class="sa-col"><h4>${ICON_UP}דירוג המקצועות שנמדדו עד כה — מהגבוה לנמוך</h4>${ranked.slice().reverse().map(row).join('')}</div>
       </div>`
    : `<div class="sa-cols">
         <div class="sa-col low"><h4>${ICON_DOWN}הנוכחות הנמוכה ביותר</h4>${low.map(row).join('')}</div>
         <div class="sa-col high"><h4>${ICON_UP}הנוכחות הגבוהה ביותר</h4>${high.map(row).join('')}</div>
       </div>`;
  box.innerHTML = cols + `
    <details class="sa-all">
      <summary>כל המקצועות (${all.length})</summary>
      <div class="table-wrap" style="border:none;">
        <table class="attention-table">
          <thead><tr><th>מקצוע</th><th class="num">אחוז נוכחות</th><th class="num">מורים שנמדדו</th><th class="num">חודשי השתתפות</th></tr></thead>
          <tbody>${allSorted.map(a => `
            <tr${currentSubject === a.name ? ' style="background:var(--surface-soft);"' : ''}>
              <td class="school-cell">${escapeHtml(a.name)}</td>
              <td class="num"><span class="sa-rate ${rc(a.rate)}" style="font-size:15px">${a.rate}%</span></td>
              <td class="num">${a.teachers}</td>
              <td class="num">${a.present}/${a.held}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </details>`;
}

// המקצועות בסינון — מהמדריכים (guides.js), לא מטאב ההדרכות הישן שבו רק מקצוע אחד
function renderSubjectPills() {
  const container = document.getElementById('subject-filter-bar');
  container.innerHTML = '<span class="filter-label">סינון מקצוע</span>';
  const all = document.createElement('button');
  all.className = 'subject-pill' + (currentSubject === '' ? ' active' : '');
  all.dataset.subject = '';
  all.textContent = 'כל המקצועות';
  all.onclick = () => switchSubject('');
  container.appendChild(all);

  const set = new Set();
  Object.values(window.TS_GUIDES || {}).forEach(g => window.TS_guideSubjects(g).forEach(s => set.add(s)));
  Array.from(set).sort((a, b) => a.localeCompare(b, 'he')).forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'subject-pill' + (currentSubject === s ? ' active' : '');
    btn.dataset.subject = s;
    btn.textContent = s;   // דרך ה-DOM — הגרשיים של תנ"ך
    btn.onclick = () => switchSubject(s);
    container.appendChild(btn);
  });
}
// ה-ministry.dashboard מסונן מחדש (מורים ובתי ספר במקצוע); הנוכחות מחושבת מקומית
async function switchSubject(s) { currentSubject = s; renderMeetParts(); await load(); }

function setKpi(id, text, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.remove('ok', 'warn', 'err', 'mint');
  if (cls) el.classList.add(cls);
}
function setSub(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

function renderCommandStrip() {
  const s = state.summary || {};
  if (dashLoaded) {
    setKpi('cmd-networks', s.networks || 0, 'mint');
    setKpi('cmd-schools', s.schools || 0);
    setKpi('cmd-teachers', s.teachers || 0);
  }
  if (!meetStats) {
    ['cmd-trainings', 'cmd-rate', 'cmd-participated'].forEach(id => setKpi(id, '…'));
    setSub('cmd-rate-sub', 'טוען נוכחות…');
    return;
  }
  if (meetStats.failed) {
    ['cmd-trainings', 'cmd-rate', 'cmd-participated'].forEach(id => setKpi(id, '—'));
    setSub('cmd-rate-sub', 'הנוכחות לא נטענה — רעננו');
    setSub('cmd-participated-sub', '');
    return;
  }
  const trainings = meetGroups().reduce((n, g) => n + (g.months || []).length, 0);
  const groups = meetGroups().filter(g => (g.months || []).length).length;
  setKpi('cmd-trainings', trainings);
  setSub('cmd-trainings-sub', !trainings ? 'עוד לא התקיימו הדרכות'
    : (trainings === 1 ? 'הדרכה חודשית אחת' : 'הדרכות חודשיות') + ' · ' + (groups === 1 ? 'קבוצה אחת' : groups + ' קבוצות'));
  const sum = summarize(meetPersons());
  if (sum.rate === null) {
    setKpi('cmd-rate', '—');
    setSub('cmd-rate-sub', 'טרם נמדדה נוכחות · יעד: 80%');
    setKpi('cmd-participated', '—');
    setSub('cmd-participated-sub', '');
    return;
  }
  setKpi('cmd-rate', sum.rate + '%', sum.rate >= 80 ? 'mint' : sum.rate >= 50 ? 'warn' : 'err');
  setSub('cmd-rate-sub', 'יעד: 80% · ' + sum.measured + ' מורים נמדדו');
  setKpi('cmd-participated', sum.participated, 'mint');
  setSub('cmd-participated-sub', 'מתוך ' + sum.measured + ' מורים שנמדדו');
}

// אין עדיין אף מורה שנמדד בסינון הנוכחי → אין דירוג ואין התראות
function noAttendanceYet() {
  if (!meetStats || meetStats.failed) return true;
  return summarize(meetPersons()).measured === 0;
}

function renderNetworkLenses() {
  const featEl = document.getElementById('networks-featured');
  const gridEl = document.getElementById('networks-grid');
  const nets = (state.networkBreakdown || []).slice();
  if (!dashLoaded) return;   // ministry.dashboard עוד לא הגיע — נשאר "טוען..."
  if (!nets.length) {
    featEl.innerHTML = emptyMsg('אין נתונים עבור הסינון הנוכחי');
    gridEl.innerHTML = '';
    return;
  }
  const att = byNetwork();
  nets.forEach(n => { n.att = att[netKey(n.id)] || summarize([]); });
  const note = text => '<div style="grid-column:1/-1; padding:20px 24px; border:1px dashed var(--border); border-radius:14px; color:var(--text-muted); line-height:1.8;">' + text + '</div>';
  const badges = document.querySelectorAll('.badge-attention');

  if (!meetStats || meetStats.failed || noAttendanceYet()) {
    badges.forEach(b => { b.hidden = true; });
    featEl.innerHTML = note(!meetStats ? 'טוען את נתוני הנוכחות במפגשי ההדרכה…'
      : meetStats.failed ? 'נתוני הנוכחות לא נטענו — תקלה רגעית בשרת. רעננו את הדף בעוד רגע.'
      : 'טרם נמדדה נוכחות' + (currentSubject ? ' במקצוע ' + escapeHtml(currentSubject) : '') + ' — אין עדיין רשתות לדירוג.');
    nets.sort((a, b) => (b.teachers || 0) - (a.teachers || 0));
    gridEl.innerHTML = nets.map(n => networkLensCard(n, false)).join('');
    return;
  }

  // דורשות תשומת לב: רשתות עם מספיק מורים שנמדדו, מתחת ליעד — עד 3 החלשות
  const featured = nets.filter(n => n.att.measured >= MIN_MEASURED && n.att.rate < 80)
    .sort((a, b) => a.att.rate - b.att.rate).slice(0, 3);
  badges.forEach(b => { b.hidden = false; });
  if (!featured.length) {
    document.querySelector('.section-head-flex .badge-attention').hidden = true;
    featEl.innerHTML = note('אין רשת מתחת ליעד (80%) מבין הרשתות שנמדדו בהן ' + MIN_MEASURED + ' מורים לפחות.');
  } else {
    featEl.innerHTML = featured.map(n => networkLensCard(n, true)).join('');
  }
  // השאר: קודם הנמדדות (מהחלשה לחזקה), אחריהן שטרם נמדדו
  const rest = nets.filter(n => featured.indexOf(n) < 0).sort((a, b) =>
    (a.att.rate === null ? 101 : a.att.rate) - (b.att.rate === null ? 101 : b.att.rate) || (b.teachers || 0) - (a.teachers || 0));
  gridEl.innerHTML = rest.map(n => networkLensCard(n, false)).join('');
}

function networkLensCard(n, isFeatured) {
  const a = n.att || summarize([]);
  const noData = a.rate === null;
  const rate = noData ? 0 : a.rate;
  const rateClass = rate >= 80 ? 'ok' : rate >= 50 ? 'warn' : 'err';
  const cssVar = `--lens-net: var(--net-${n.color || 'ort'});`;
  const action = recommendAction(a, rate);
  const circumference = 2 * Math.PI * 30;
  const dash = (rate / 100) * circumference;
  const statusTag = noData
    ? `<span class="net-lens-status-tag" style="background:var(--surface-soft); color:var(--text-muted);">${meetStats ? 'טרם נמדדה' : 'טוען…'}</span>`
    : `<span class="net-lens-status-tag ${rateClass}">${rateClass === 'ok' ? 'תקין' : rateClass === 'warn' ? 'מעקב' : 'דורש פעולה'}</span>`;
  return `
    <div class="net-lens" style="${cssVar}">
      <div class="net-lens-row-1">
        <div class="net-lens-name-block">
          <span class="net-lens-chip">${escapeHtml(n.name)}</span>
          ${statusTag}
        </div>
        <div class="net-lens-ring" aria-label="${noData ? 'אין עדיין נתוני נוכחות' : rate + '% נוכחות'}">
          <svg viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="var(--surface-soft)" stroke-width="6"/>
            <circle cx="36" cy="36" r="30" fill="none" stroke="var(--lens-net)" stroke-width="6" stroke-linecap="round"
                    stroke-dasharray="${noData ? 0 : dash} ${circumference}" stroke-dashoffset="0"/>
          </svg>
          <div class="net-lens-ring-text">${noData ? '—' : rate + '%'}<small>נוכחות</small></div>
        </div>
      </div>

      <div class="net-lens-stats">
        <div class="net-lens-stat">
          <div class="net-lens-stat-num">${n.teachers || 0}</div>
          <div class="net-lens-stat-label">מורים</div>
        </div>
        <div class="net-lens-stat">
          <div class="net-lens-stat-num">${noData ? '—' : a.measured}</div>
          <div class="net-lens-stat-label">נמדדו</div>
        </div>
        <div class="net-lens-stat">
          <div class="net-lens-stat-num ${noData ? '' : a.risk > 0 ? 'coral' : 'mint'}">${noData ? '—' : a.risk}</div>
          <div class="net-lens-stat-label">מתחת ל-50%</div>
        </div>
      </div>

      ${isFeatured && !noData ? `
        <div class="net-lens-action">
          <div class="net-lens-action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          </div>
          <div class="net-lens-action-text">
            <strong>פעולה מומלצת:</strong> ${escapeHtml(action)}
          </div>
        </div>
      ` : ''}

      <div class="net-lens-cta">
        <a class="btn-soft-sm" href="../admin-network/?network=${encodeURIComponent(netKey(n.id))}">
          פתח דשבורד
        </a>
        <button class="btn-soft-sm primary" onclick="sendToNetwork('${n.id}', '${escapeAttr(n.name)}', '${n.contactEmail || ''}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          שליחה
        </button>
      </div>
    </div>
  `;
}

function recommendAction(a, rate) {
  if (rate >= 80) return 'המשך מעקב חודשי שגרתי.';
  if (rate >= 50) return 'שיחה עם מנהל הרשת על המורים שמתחת ל-50%.';
  if (a.risk > 5) return 'פנייה ל-' + a.risk + ' מורים שמתחת ל-50%.';
  return 'שליחת דוח דחוף ובקשת תוכנית התערבות.';
}

// בתי הספר החלשים — מנוכחות המפגשים, רק בתי ספר עם מספיק מורים שנמדדו
function renderWeakSchools() {
  const tbody = document.getElementById('weak-schools-body');
  const msgRow = t => '<tr><td colspan="6" style="padding:24px; text-align:center; color:var(--text-muted);">' + t + '</td></tr>';
  if (!meetStats) { tbody.innerHTML = msgRow('טוען נוכחות…'); return; }
  if (meetStats.failed) { tbody.innerHTML = msgRow('נתוני הנוכחות לא נטענו — רעננו את הדף בעוד רגע.'); return; }
  const m = {};
  meetPersons().forEach(p => {
    const key = p.school || p.schoolName;
    if (!key) return;
    const s = m[key] || (m[key] = { id: p.school, name: p.schoolName || p.school, network: netKey(p.network), ps: [] });
    s.ps.push(p);
  });
  const schools = Object.values(m).map(s => Object.assign(s, summarize(s.ps)))
    .filter(s => s.measured >= MIN_MEASURED)
    .sort((a, b) => a.rate - b.rate || b.measured - a.measured)
    .slice(0, 10);
  if (!schools.length) {
    tbody.innerHTML = msgRow('טרם נמדדה נוכחות' + (currentSubject ? ' במקצוע ' + escapeHtml(currentSubject) : '') +
      ' — אין עדיין בית ספר עם ' + MIN_MEASURED + ' מורים שנמדדו.');
    return;
  }
  tbody.innerHTML = schools.map(s => {
    const rate = s.rate;
    const fillClass = rate >= 80 ? 'ok' : rate >= 50 ? 'warn' : '';
    const net = TS.netById(s.network);
    const netChip = s.network ? `<span class="net-chip ${net.color || s.network}">${escapeHtml(net.name || s.network)}</span>` : '—';
    const sector = sectorBySchool[s.id];
    const secChip = sector ? TS.secChip(sector) : '—';
    return `
      <tr>
        <td class="school-cell">${escapeHtml(s.name || '')}</td>
        <td>${netChip}</td>
        <td>${secChip}</td>
        <td>${s.measured}</td>
        <td>
          <div class="att-progress">
            <div class="att-progress-bar">
              <div class="att-progress-fill ${fillClass}" style="width:${rate}%"></div>
            </div>
            <span class="att-progress-val">${rate}%</span>
          </div>
        </td>
        <td>${s.id ? `<a class="open-btn" href="../admin-school/?school=${encodeURIComponent(s.id)}&network=${encodeURIComponent(s.network)}">פתח</a>` : ''}</td>
      </tr>
    `;
  }).join('');
}

function sendToNetwork(netId, netName, netEmail) {
  const n = (state.networkBreakdown || []).find(x => x.id === netId);
  if (!n) return;
  const a = byNetwork()[netKey(netId)] || summarize([]);
  const subjLabel = currentSubject ? ('— מקצוע: ' + currentSubject) : '';
  const subject = `דוח חודשי — רשת ${netName} ${subjLabel} — ${TS.monthLabel()}`;
  const body = [
    `שלום,`,
    ``,
    `מצורף דוח חודשי על הדרכות מורים ברשת ${netName} עבור ${TS.monthLabel()}.`,
    currentSubject ? `מקצוע: ${currentSubject}` : 'כל המקצועות',
    ``,
    `סיכום:`,
    `• מורים ברשת: ${n.teachers}`,
    `• בתי ספר: ${n.schools}`,
    ...(a.rate === null
      ? ['• מדידת הנוכחות במפגשי ההדרכה טרם החלה ברשת — נתוני נוכחות יופיעו בדוחות הבאים']
      : [
          `• אחוז נוכחות במפגשי ההדרכה: ${a.rate}% (${a.measured} מורים נמדדו)`,
          `• השתתפו לפחות פעם אחת: ${a.participated} מתוך ${a.measured}`,
          `• עומדים ביעד (80%+): ${a.onTarget}`,
          `• מתחת ל-50%: ${a.risk}`
        ]),
    ``,
    `דשבורד מלא של הרשת:`,
    `${location.origin}${location.pathname.replace('/ministry/', '/admin-network/')}?network=${netKey(netId)}${currentSubject ? '&subject=' + encodeURIComponent(currentSubject) : ''}`,
    ``,
    `בברכה,`,
    `רויטל אמיר`,
    `מפקחת ארצית · יחידת הפיקוח על הדרכות`,
    `משרד העבודה`
  ].join('\n');
  window.open(TS.gmailCompose({ to: netEmail, subject, body }), '_blank');
}

function emptyMsg(text) {
  return `<div style="grid-column:1/-1; padding:24px; text-align:center; color:var(--text-muted);">${text}</div>`;
}

function escapeHtml(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(s) {
  return (s || '').toString().replace(/'/g, "\\'");
}

// ============================================================
// סרגל הניווט העליון — הדגשת הסעיף שנמצא על המסך
// ============================================================
(function initPageNav() {
  const links = [...document.querySelectorAll('.pn a[href^="#"]')];
  if (!links.length) return;
  const targets = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (!targets.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-20% 0px -70% 0px' });

  targets.forEach(t => obs.observe(t));
})();
