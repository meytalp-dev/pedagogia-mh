// Guide Dashboard — מציג כל מורי המדריכ/ה + היסטוריית נוכחות + הדרכות
const guideSlug = TS.urlParam('g', '');
let guideEmail = TS.urlParam('guide', '');
const GUIDE_CFG = (window.TS_resolveGuide ? (window.TS_resolveGuide(guideSlug, guideEmail) || {}) : {});
if (!guideEmail && GUIDE_CFG.email) guideEmail = GUIDE_CFG.email;

let state = {
  guide: '',
  guideName: '',
  subject: '',
  trainings: [],
  teachers: []
};

// סינון מסלול: '' = הכל · 'bagrut' · 'gemer'
let currentTrack = '';

// ============================================================
// פיצול לפי יח"ל (9.9.26) — מתמטיקה בחברה היהודית: שירה 3 · גל 4-5
// ============================================================
// GUIDE_CFG.units מגדיר אילו רמות שייכות למדריכה. מורה שטרם סומן לו יח"ל
// מופיע אצל שתי המדריכות עם תווית "טרם סומן" — כך אף מורה לא נעלם בזמן
// שהחלוקה נעשית. הסינון כולו בצד הלקוח: מהשרת מגיעה רשימת המקצוע המלאה,
// ולכן שום מורה אינו בלתי־נגיש גם אם סומן בטעות (טאב "כל מורי המקצוע").
// unitsScope: 'mine' = הקבוצה שלי + טרם סומן · 'unmarked' · 'all'
let unitsScope = 'mine';

function guideUnits() {
  const u = GUIDE_CFG.units;
  return (Array.isArray(u) && u.length) ? u : null;
}
// "טרם סומן" = מורה בגרות בלי רמה. גמר לא נספר — בגמר אין יחידות לימוד,
// והוא שייך לשירה בכל מקרה; ספירתו כאן הציגה 12 "חסרים" שאין מה לעשות איתם.
function isUnmarked(t) {
  return t.type !== 'gemer' && TS.unitsSet(t.units).length === 0;
}
// שייך לקבוצה של המדריכה לפי הרמה שסומנה (גמר תמיד שייך למי שהמסלול פתוח אצלה)
function isMine(t) {
  const mine = guideUnits();
  if (!mine) return true;
  if (t.type === 'gemer') return true;   // כבר סונן קודם לפי GUIDE_CFG.tracks
  const u = TS.unitsSet(t.units);
  return u.length ? u.some(x => mine.indexOf(x) >= 0) : true;   // טרם סומן = אצל שתיהן
}
// הסט שנחשב "הקבוצה שלי" לצורך ה-KPI בראש הדף
function myTeachers() {
  return state.teachers.filter(isMine);
}

document.addEventListener('DOMContentLoaded', async () => {
  bindTabs();
  document.getElementById('btn-new-training').addEventListener('click', openNewTraining);
  document.getElementById('form-training').addEventListener('submit', submitTraining);
  document.getElementById('teacher-search').addEventListener('input', renderTeachers);
  const addBtn = document.getElementById('btn-add-teacher');
  if (addBtn) addBtn.addEventListener('click', () => openTeacherModal());
  const teacherForm = document.getElementById('form-teacher');
  if (teacherForm) teacherForm.addEventListener('submit', submitTeacher);
  const typeSel = document.getElementById('te-type');
  if (typeSel) typeSel.addEventListener('change', toggleUnitsRow);
  renderResources();
  await loadData();
});

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

async function loadData() {
  if (!TS.getAppsScriptUrl() || (!guideEmail && !GUIDE_CFG.subject)) {
    renderNoGuide();
    return;
  }

  // שתי קריאות במקביל:
  // 1. רשימת המורים של המקצוע — מקור האמת לרשימה (כולל מסלול בגרות/גמר ומגזר)
  // 2. guide.dashboard — היסטוריית נוכחות והדרכות (קיים רק למדריכה עם הדרכות בגיליון)
  const [rosterRes, dashRes] = await Promise.all([
    GUIDE_CFG.subject ? TS.api('teachers.list', { subject: GUIDE_CFG.subject }) : Promise.resolve(null),
    guideEmail ? TS.api('guide.dashboard', { guide: guideEmail }) : Promise.resolve(null)
  ]);

  const dash = (dashRes && dashRes.ok && dashRes.data) ? dashRes.data : null;

  if (!rosterRes || !rosterRes.ok) {
    // אין קונפיג מקצוע (קישור ישן עם ?guide= בלבד) — נופלים להתנהגות השרת
    if (dash) { state = dash; renderAll(); } else { renderNoGuide(); }
    return;
  }

  // סינון לפי המגזרים שבאחריות המדריכה (kelali+haredi = חברה יהודית · arab = חברה ערבית)
  // ולפי המסלולים שלה (גל — בגרות בלבד; בגמר אין יח"ל והוא נשאר אצל שירה).
  const sectors = GUIDE_CFG.sectors || null;
  const tracks = (Array.isArray(GUIDE_CFG.tracks) && GUIDE_CFG.tracks.length) ? GUIDE_CFG.tracks : null;
  const roster = (rosterRes.data || []).filter(t =>
    (!sectors || sectors.indexOf(t.sector || 'kelali') >= 0) &&
    (!tracks || tracks.indexOf(t.type === 'gemer' ? 'gemer' : 'bagrut') >= 0)
  );

  // הצמדת נוכחות מ-guide.dashboard לפי id
  const dashById = {};
  if (dash) (dash.teachers || []).forEach(t => { dashById[t.id] = t; });
  const trainings = dash ? (dash.trainings || []) : [];

  state = {
    guide: guideEmail || GUIDE_CFG.email || '',
    guideName: GUIDE_CFG.name || (dash && dash.guideName) || '',
    subject: GUIDE_CFG.subject || (dash && dash.subject) || '',
    trainings,
    teachers: roster.map(t => {
      const d = dashById[t.id];
      const netKey = (t.network || '').toString().replace(/^net_/, '');
      return {
        id: t.id,
        name: t.name,
        phone: t.phone,
        email: t.email,
        notes: t.notes || '',
        school: t.school,
        schoolName: t.schoolName || (d && d.schoolName) || '— ללא שיוך —',
        network: netKey,
        networkName: TS.netById(netKey).name || netKey,
        type: t.type === 'gemer' ? 'gemer' : 'bagrut',
        units: (t.units || '').toString().trim(),
        sector: t.sector || 'kelali',
        attendance: d ? d.attendance : {},
        stats: d ? d.stats : { present: 0, partial: 0, total: trainings.length, rate: 0 }
      };
    })
  };
  state.teachers.sort((a, b) => {
    if (a.schoolName !== b.schoolName) return a.schoolName.localeCompare(b.schoolName, 'he');
    return (a.name || '').localeCompare(b.name || '', 'he');
  });
  renderAll();
}

// לא זוהתה מדריכה — במקום נתוני דמו מבלבלים, הסבר ברור איך נכנסים
function renderNoGuide() {
  document.getElementById('page-title').textContent = 'לא זוהתה מדריכה';
  document.getElementById('page-subtitle').textContent = 'הדשבורד נפתח רק דרך הקישור האישי של כל מדריכ/ה';
  document.getElementById('teachers-container').innerHTML = `
    <div class="empty" style="padding:40px; text-align:center;">
      <div style="font-size:17px; font-weight:700; margin-bottom:8px;">הקישור חסר את זיהוי המדריכ/ה</div>
      <div style="color:var(--text-muted); line-height:1.8;">
        יש להיכנס דרך הקישור האישי שקיבלת (בצורה <code>guide/?g=...</code>).<br>
        לא קיבלת קישור? פני למיטל פלג.
      </div>
    </div>`;
  ['stat-teachers','stat-schools','stat-trainings'].forEach(id => document.getElementById(id).textContent = '0');
  document.getElementById('stat-rate').textContent = '—';
}

function renderAll() {
  const gName = GUIDE_CFG.name || state.guideName || state.guide || 'מדריכה';
  const gSubject = GUIDE_CFG.subject || state.subject || '';
  // ה-KPI מתייחס לקבוצה של המדריכה (הרמות שלה + מי שטרם סומן), לא לכל המקצוע
  const mine = myTeachers();
  const bagrutN = mine.filter(t => t.type !== 'gemer').length;
  const gemerN = mine.length - bagrutN;
  const unmarkedN = mine.filter(isUnmarked).length;
  const unitsLabel = guideUnits() ? guideUnits().join(' · ') + ' יח"ל' : '';
  const societyLabel = GUIDE_CFG.sectors
    ? (GUIDE_CFG.sectors.indexOf('arab') >= 0 ? 'החברה הערבית' : 'החברה היהודית')
    : '';
  document.getElementById('user-name').textContent = gName;
  document.getElementById('page-title').textContent =
    gName + (gSubject ? ' · ' + gSubject : '') + (unitsLabel ? ' · ' + unitsLabel : '');
  document.getElementById('page-subtitle').textContent =
    mine.length + ' מורים (' + bagrutN + ' בגרות · ' + gemerN + ' גמר) · ' +
    new Set(mine.map(t => t.schoolName)).size + ' בתי ספר' +
    (societyLabel ? ' · ' + societyLabel : '') +
    (unmarkedN ? ' · ' + unmarkedN + ' טרם סומנה להם רמה' : '');

  const totalRate = mine.length
    ? Math.round(mine.reduce((sum, t) => sum + (t.stats.rate || 0), 0) / mine.length)
    : 0;
  document.getElementById('stat-teachers').textContent = mine.length;
  document.getElementById('stat-schools').textContent = new Set(mine.map(t => t.schoolName)).size;
  document.getElementById('stat-trainings').textContent = state.trainings.length;
  document.getElementById('stat-rate').textContent = totalRate + '%';

  renderTeachers();
  renderTrainings();
  renderStats();
}

function renderTrackPills() {
  const bar = document.getElementById('track-filter');
  if (!bar) return;
  const scoped = state.teachers.filter(inScope);
  const bagrutN = scoped.filter(t => t.type !== 'gemer').length;
  const gemerN = scoped.length - bagrutN;
  const pill = (val, label, n) => `
    <button type="button" class="subject-pill ${currentTrack === val ? 'active' : ''}" data-track="${val}">
      ${label}${n !== null ? ` (${n})` : ''}
    </button>`;
  // למדריכה שהוגבלה לבגרות בלבד אין מה לסנן — כל הרשימה בגרות
  const tracks = GUIDE_CFG.tracks;
  bar.hidden = !!(Array.isArray(tracks) && tracks.length === 1);
  bar.innerHTML = '<span class="filter-label">מסלול</span>' +
    pill('', 'הכל', null) + pill('bagrut', 'בגרות', bagrutN) + pill('gemer', 'גמר', gemerN);
  bar.querySelectorAll('[data-track]').forEach(b =>
    b.addEventListener('click', () => { currentTrack = b.dataset.track; renderTeachers(); }));
}

// בורר היח"ל בשורת המורה — הכלי שבו המדריכות עושות סדר בחלוקה.
// מוצג רק כשהקבוצה מפוצלת ורק במסלול בגרות (בגמר אין יח"ל).
function unitsControl(t) {
  if (!guideUnits() || t.type === 'gemer') return '';
  const cur = TS.unitsSet(t.units).length ? t.units : '';
  const opts = [`<option value=""${cur ? '' : ' selected'} disabled>טרם סומן</option>`]
    .concat(TS.UNITS.map(u =>
      `<option value="${u.id}"${cur === u.id ? ' selected' : ''}>${u.name}</option>`));
  return `<select class="units-select${cur ? '' : ' unset'}" title="יחידות לימוד"
            onchange='setUnitsById(${JSON.stringify(String(t.id))}, this.value, this)'>${opts.join('')}</select>`;
}

// שמירת הרמה. עדכון אופטימי — הבורר לא ננעל, ובכישלון חוזרים לערך הקודם.
async function setUnitsById(id, units, el) {
  const t = state.teachers.find(x => String(x.id) === String(id));
  if (!t || !units || units === t.units) return;
  const prev = t.units;
  t.units = units;
  if (el) el.classList.remove('unset');
  if (!TS.getAppsScriptUrl()) { t.units = prev; TS.toast('אין חיבור לשרת'); renderTeachers(); return; }
  const res = await TS.apiPost('teachers.update', { id, units });
  if (res.ok) {
    TS.toast(t.name + ' → ' + TS.unitsLabel(units));
    renderAll();   // הרשימה והמונים מתעדכנים; מורה שעבר לקבוצה השנייה יוצא מ"שלי"
  } else {
    t.units = prev;
    TS.toast('לא נשמר — ' + (res.error || ''));
    renderTeachers();
  }
}

// האם המורה בתחום התצוגה הנוכחי (הקבוצה שלי / טרם סומן / כל המקצוע)
function inScope(t) {
  if (!guideUnits()) return true;
  if (unitsScope === 'all') return true;
  if (unitsScope === 'unmarked') return isUnmarked(t);
  return isMine(t);
}

// סרגל היח"ל — מוצג רק למדריכה שהקבוצה שלה מפוצלת לפי רמה.
// "כל מורי המקצוע" הוא שסתום הביטחון: מורה שסומן בטעות תמיד נשאר נגיש לתיקון.
function renderUnitsPills() {
  const bar = document.getElementById('units-filter');
  if (!bar) return;
  if (!guideUnits()) { bar.hidden = true; return; }
  bar.hidden = false;
  const mineN = state.teachers.filter(isMine).length;
  const unmarkedN = state.teachers.filter(isUnmarked).length;
  const pill = (val, label, n) => `
    <button type="button" class="subject-pill ${unitsScope === val ? 'active' : ''}" data-scope="${val}">
      ${label} (${n})
    </button>`;
  bar.innerHTML = '<span class="filter-label">יח"ל</span>' +
    pill('mine', 'הקבוצה שלי', mineN) +
    pill('unmarked', 'טרם סומן', unmarkedN) +
    pill('all', 'כל מורי המקצוע', state.teachers.length);
  bar.querySelectorAll('[data-scope]').forEach(b =>
    b.addEventListener('click', () => { unitsScope = b.dataset.scope; renderTeachers(); }));
}

function renderTeachers() {
  renderTrackPills();
  renderUnitsPills();
  const search = (document.getElementById('teacher-search').value || '').trim().toLowerCase();
  const filtered = state.teachers.filter(t =>
    inScope(t) &&
    (!currentTrack || (t.type === 'gemer' ? 'gemer' : 'bagrut') === currentTrack) &&
    (!search || (t.name || '').toLowerCase().includes(search) ||
                (t.schoolName || '').toLowerCase().includes(search))
  );

  // קיבוץ לפי בית ספר
  const bySchool = {};
  filtered.forEach(t => {
    const key = t.schoolName || '— ללא שיוך —';
    if (!bySchool[key]) bySchool[key] = { name: key, network: t.networkName, networkColor: t.network, teachers: [] };
    bySchool[key].teachers.push(t);
  });

  const container = document.getElementById('teachers-container');
  if (!Object.keys(bySchool).length) {
    container.innerHTML = '<div class="empty" style="padding:32px;">לא נמצאו מורים</div>';
    return;
  }

  const today = new Date();
  container.innerHTML = Object.values(bySchool).map(group => {
    const teachersHtml = group.teachers.map(t => `
      <tr>
        <td class="name-cell">
          <div class="te-row-head">
            <span class="te-name-text">${escapeHtml(t.name)}</span>
            <span class="track-chip ${t.type === 'gemer' ? 'gemer' : 'bagrut'}">${t.type === 'gemer' ? 'גמר' : 'בגרות'}</span>
            ${unitsControl(t)}
            <span class="te-actions">
              <button class="te-icon" title="עריכת מורה" onclick='editTeacherById(${JSON.stringify(String(t.id))})'>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
              </button>
              <button class="te-icon te-icon-danger" title="הסרת מורה" onclick='deleteTeacherById(${JSON.stringify(String(t.id))}, ${JSON.stringify(String(t.name))})'>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </span>
          </div>
          ${t.notes ? `<div class="te-note" onclick='editNoteById(${JSON.stringify(String(t.id))})' title="עריכת ההערה">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>${escapeHtml(t.notes)}</span>
          </div>` : `<button class="te-addnote" onclick='editNoteById(${JSON.stringify(String(t.id))})'>+ הוספת הערה</button>`}
        </td>
        ${state.trainings.map(tr => attCell(t.attendance[tr.id], tr.date, today)).join('')}
        <td class="rate-cell ${rateClass(t.stats.rate)}">${t.stats.rate}%</td>
      </tr>
    `).join('');
    return `
      <div class="school-group">
        <div class="school-header">
          <h3>${escapeHtml(group.name)}</h3>
          <span class="meta">
            <span class="net-chip ${group.networkColor}">${escapeHtml(group.network || group.networkColor)}</span>
            · ${group.teachers.length} מורים
          </span>
        </div>
        <div class="table-wrap" style="border:none;">
          <table class="att-grid">
            <thead>
              <tr>
                <th style="text-align:right;">שם המורה</th>
                ${state.trainings.map(tr => `<th class="att-cell">${shortDate(tr.date)}</th>`).join('')}
                <th>נוכחות</th>
              </tr>
            </thead>
            <tbody>${teachersHtml}</tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
}

function attCell(att, trainingDate, today) {
  const trDate = new Date(trainingDate);
  if (trDate > today) {
    return '<td class="att-cell"><span class="att-mark future" title="עתידי">·</span></td>';
  }
  if (!att) return '<td class="att-cell"><span class="att-mark absent" title="לא נוכחה">—</span></td>';
  if (att.status === 'present') return '<td class="att-cell"><span class="att-mark present" title="נוכחה">V</span></td>';
  if (att.status === 'partial') return '<td class="att-cell"><span class="att-mark partial" title="חצי נוכחות">½</span></td>';
  const title = att.notes ? att.notes.replace(/"/g, '&quot;') : 'לא נוכחה';
  return `<td class="att-cell"><span class="att-mark absent" title="${title}">—</span></td>`;
}

function shortDate(d) {
  const dt = new Date(d);
  return ('0' + (dt.getMonth() + 1)).slice(-2) + '/' + String(dt.getFullYear()).slice(-2);
}

function rateClass(r) {
  if (r >= 80) return 'high';
  if (r >= 50) return 'mid';
  return 'low';
}

function escapeHtml(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderTrainings() {
  const list = document.getElementById('trainings-list');
  if (!state.trainings.length) {
    list.innerHTML = '<div class="empty" style="padding:32px;">אין הדרכות עדיין</div>';
    return;
  }
  const baseUrl = location.origin + location.pathname.replace(/\/guide\/?$/, '');
  const today = new Date();
  list.innerHTML = state.trainings.map(t => {
    const trDate = new Date(t.date);
    const isFuture = trDate >= today;
    const checkinUrl = t.qrToken
      ? baseUrl + '/checkin/?t=' + encodeURIComponent(t.qrToken)
      : '';
    const presentCount = state.teachers.filter(tch => {
      const a = tch.attendance[t.id];
      return a && a.status === 'present';
    }).length;
    return `
      <div class="training-row">
        <div>
          <div class="when">${TS.formatDate(t.date)}</div>
          <div class="where">${escapeHtml(t.location || '—')} · ${escapeHtml(t.notes || '')}</div>
        </div>
        <div class="actions">
          ${!isFuture ? `<span style="color:var(--text-2); font-size:13px;">${presentCount} מתוך ${state.teachers.length} נוכחו</span>` : ''}
          ${isFuture && checkinUrl ? `
            <button class="copy-link-btn" data-url="${checkinUrl}" onclick="copyCheckinUrl(this)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              העתק קישור צ'ק-אין
            </button>` : ''}
          ${!isFuture ? `<a class="btn btn-secondary" href="attendance.html?training=${t.id}">רישום ידני</a>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function copyCheckinUrl(btn) {
  const url = btn.dataset.url;
  navigator.clipboard.writeText(url).then(() => {
    const original = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> הקישור הועתק';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = original;
    }, 2200);
  });
}

function renderStats() {
  const container = document.getElementById('stats-chart');
  if (!state.trainings.length || !state.teachers.length) {
    container.innerHTML = '<div class="empty">אין מספיק נתונים</div>';
    return;
  }
  const rows = state.trainings.map(t => {
    const present = state.teachers.filter(tch => {
      const a = tch.attendance[t.id];
      return a && a.status === 'present';
    }).length;
    const total = state.teachers.length;
    const rate = Math.round((present / total) * 100);
    return { date: t.date, label: TS.formatDate(t.date), present, total, rate };
  });
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
      ${rows.map(r => `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:4px;">
            <span><strong>${r.label}</strong></span>
            <span style="color:var(--text-2);">${r.present} / ${r.total} (${r.rate}%)</span>
          </div>
          <div style="background:var(--surface-2); border-radius:6px; height:20px; overflow:hidden;">
            <div style="background:${r.rate>=80?'var(--ok)':r.rate>=50?'#f59e0b':'var(--err)'};
                        width:${r.rate}%; height:100%; transition:width .3s;"></div>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:20px; padding:12px; background:var(--surface-2); border-radius:8px; color:var(--text-2); font-size:13px;">
      <strong>יעד נוכחות:</strong> 80%. מורים מתחת ל-50% נוכחות שנתית נחשבים בסיכון.
    </div>
  `;
}

/* ===== חומרים וקישורים (Drive / זום / שליחת חומרים) ===== */
function renderResources() {
  const card = document.getElementById('resources-card');
  const grid = document.getElementById('resources-grid');
  if (!card || !grid) return;
  const items = [];
  if (GUIDE_CFG.drive) {
    items.push(`<a class="resource-link" href="${GUIDE_CFG.drive}" target="_blank" rel="noopener">
      <span class="ic drive"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-3H5a2 2 0 0 0-2 2z"/></svg></span>
      <span class="tx"><strong>חומרי ההוראה ב-Drive</strong><span>פתיחת התיקייה</span></span></a>`);
  }
  if (GUIDE_CFG.zoom) {
    items.push(`<a class="resource-link" href="${GUIDE_CFG.zoom}" target="_blank" rel="noopener">
      <span class="ic zoom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l5-3v10l-5-3v-4z"/><rect x="3" y="6" width="12" height="12" rx="2"/></svg></span>
      <span class="tx"><strong>הזום הקבוע</strong><span>כניסה למפגש</span></span></a>`);
  }
  if (GUIDE_CFG.drive) {
    items.push(`<button type="button" class="resource-link" onclick="sendMaterials(this)">
      <span class="ic send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></span>
      <span class="tx"><strong>שליחת חומרים למורים</strong><span>העתקת הודעה מוכנה לוואטסאפ</span></span></button>`);
  }
  if (!items.length) { card.hidden = true; return; }
  grid.innerHTML = items.join('');
  card.hidden = false;
}

function sendMaterials(btn) {
  const subject = GUIDE_CFG.subject || '';
  const lines = ['שלום,', '', `מצורפים חומרי ההוראה${subject ? ' ל' + subject : ''}:`, GUIDE_CFG.drive];
  if (GUIDE_CFG.zoom) lines.push('', 'הזום הקבוע למפגשים:', GUIDE_CFG.zoom);
  lines.push('', 'בהצלחה!');
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    const tx = btn.querySelector('.tx span');
    const orig = tx ? tx.textContent : '';
    btn.classList.add('copied');
    if (tx) tx.textContent = '✓ ההודעה הועתקה — הדביקי בוואטסאפ';
    setTimeout(() => { btn.classList.remove('copied'); if (tx) tx.textContent = orig; }, 2600);
  });
}

/* ===== הוספה / עריכת מורה ===== */
function editTeacherById(id) {
  const t = state.teachers.find(x => String(x.id) === String(id));
  if (t) openTeacherModal(t);
}

// פתיחת המודאל עם פוקוס ישיר על שדה ההערה
function editNoteById(id) {
  const t = state.teachers.find(x => String(x.id) === String(id));
  if (!t) return;
  openTeacherModal(t);
  const notes = document.getElementById('te-notes');
  if (notes) { notes.focus(); notes.scrollIntoView({ block: 'center' }); }
}

// הסרת מורה
async function deleteTeacherById(id, name) {
  if (!confirm('להסיר את ' + (name || 'המורה') + ' מהרשימה?\nהפעולה אינה הפיכה.')) return;

  if (!TS.getAppsScriptUrl()) {
    TS.toast('אין חיבור לשרת — לא ניתן להסיר');
    return;
  }
  const res = await TS.apiPost('teachers.delete', { id });
  if (res.ok) {
    TS.toast('המורה הוסרה');
    await loadData();
  } else {
    TS.toast('שגיאה — ' + (res.error || ''));
  }
}
function openTeacherModal(teacher) {
  const f = document.getElementById('form-teacher');
  f.reset();
  document.getElementById('te-id').value = teacher ? (teacher.id || '') : '';
  document.getElementById('teacher-modal-title').textContent = teacher ? 'עריכת מורה' : 'הוספת מורה';
  if (teacher) {
    document.getElementById('te-name').value = teacher.name || '';
    document.getElementById('te-school').value = teacher.schoolName || '';
    document.getElementById('te-network').value = (teacher.network || '').replace(/^net_/, '');
    document.getElementById('te-phone').value = teacher.phone || '';
    document.getElementById('te-email').value = teacher.email || '';
    document.getElementById('te-notes').value = teacher.notes || '';
  }
  const typeSel = document.getElementById('te-type');
  if (typeSel) typeSel.value = teacher && teacher.type === 'gemer' ? 'gemer' : 'bagrut';
  const unitsSel = document.getElementById('te-units');
  if (unitsSel) {
    unitsSel.value = teacher ? (teacher.units || '') : '';
    // מדריכה של קבוצה מפוצלת — מורה חדש נפתח כברירת מחדל ברמה שלה
    if (!teacher && guideUnits() && guideUnits().length === 1) unitsSel.value = guideUnits()[0];
  }
  toggleUnitsRow();
  document.getElementById('modal-teacher').classList.add('open');
}
function closeTeacherModal() {
  document.getElementById('modal-teacher').classList.remove('open');
}

// שורת היח"ל במודל מוסתרת בגמר — אין בו יחידות לימוד
function toggleUnitsRow() {
  const row = document.getElementById('te-units-row');
  const typeSel = document.getElementById('te-type');
  if (!row || !typeSel) return;
  row.hidden = typeSel.value === 'gemer';
}
async function submitTeacher(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.subject = GUIDE_CFG.subject || state.subject || '';
  data.guide = guideEmail || (GUIDE_CFG.email || '');
  // מדריכה של החברה הערבית — מורה חדש נרשם אוטומטית במגזר הערבי
  if (GUIDE_CFG.sectors && GUIDE_CFG.sectors.length === 1) data.sector = GUIDE_CFG.sectors[0];
  const editing = !!data.id;

  if (!TS.getAppsScriptUrl()) {
    TS.toast('אין חיבור לשרת — לא ניתן לשמור');
    return;
  }

  const res = await TS.apiPost(editing ? 'teachers.update' : 'teachers.create', data);
  if (res.ok) {
    TS.toast(editing ? 'המורה עודכן' : 'המורה נוסף');
    closeTeacherModal();
    await loadData();
  } else {
    TS.toast('שגיאה — ' + (res.error || ''));
  }
}

function openNewTraining() {
  document.getElementById('form-training').reset();
  document.getElementById('t-date').value = new Date().toISOString().slice(0,10);
  populateSubjects('t-subject');
  document.getElementById('modal-training').classList.add('open');
}
function closeNewTraining() {
  document.getElementById('modal-training').classList.remove('open');
}
function populateSubjects(id) {
  const sel = document.getElementById(id);
  if (sel.options.length > 1) return;
  TS.SUBJECTS.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;   // דרך ה-DOM — הגרשיים של תנ"ך לא שוברות attribute
    sel.appendChild(opt);
  });
}

async function submitTraining(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  const res = await TS.apiPost('training.create', data);
  if (res.ok) {
    TS.toast('ההדרכה נוצרה');
    closeNewTraining();
    await loadData();
  } else {
    TS.toast('שגיאה');
  }
}
