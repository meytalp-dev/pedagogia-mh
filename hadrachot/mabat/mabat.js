/* ============================================================
   מבט מקצועי למפקח.ת — קריאה בלבד
   נטען לפי mabat/?i=<slug> מתוך window.TS_INSPECTORS.
   מציג אך ורק את המורים במקצועות ובמגזרים שבאחריות המפקח.ת:
   אין כאן נתוני מפקחים אחרים, אין עריכה ואין מחיקה.
   ============================================================ */

const inspectorSlug = TS.urlParam('i', '');
const INSP = (window.TS_resolveInspector ? window.TS_resolveInspector(inspectorSlug) : null);

let state = { teachers: [], guides: [] };
let currentSubject = '';   // '' = כל המקצועות שבאחריותי
let currentTrack = '';     // '' = הכל · 'bagrut' · 'gemer'

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('teacher-search').addEventListener('input', renderTeachers);
  if (!INSP) { renderNoInspector(); return; }
  await loadData();
});

async function loadData() {
  if (!TS.getAppsScriptUrl()) { renderNoInspector(); return; }

  // קריאה אחת בלבד. חשוב: Apps Script מטפל בבקשות של אותו משתמש בטור,
  // ולכן קריאה נפרדת לכל מקצוע (5 אצל אחמד מחאמיד) חורגת מתקרת 30 השניות
  // וחלק מהמקצועות פשוט לא נטענים. מושכים הכול פעם אחת ומסננים כאן.
  const res = await TS.api('teachers.list', {});
  if (!res || !res.ok) { renderApiError(); return; }

  const sectors = INSP.sectors || null;
  const subjects = INSP.subjects || [];
  const teachers = [];
  (res.data || []).forEach(t => {
    if (subjects.indexOf(t.subject) < 0) return;            // רק המקצועות שבאחריותי
    const sector = t.sector || 'kelali';
    if (sectors && sectors.indexOf(sector) < 0) return;     // רק המגזרים שבאחריותי
    const netKey = (t.network || '').toString().replace(/^net_/, '');
    teachers.push({
      id: t.id,
      name: t.name || '',
      subject: t.subject,
      schoolName: t.schoolName || '— ללא שיוך —',
      network: netKey,
      networkName: TS.netById(netKey).name || netKey,
      type: t.type === 'gemer' ? 'gemer' : 'bagrut',
      sector: sector
    });
  });

  teachers.sort((a, b) => {
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject, 'he');
    if (a.schoolName !== b.schoolName) return a.schoolName.localeCompare(b.schoolName, 'he');
    return a.name.localeCompare(b.name, 'he');
  });

  state.teachers = teachers;
  state.guides = (window.TS_guidesOfInspector ? window.TS_guidesOfInspector(INSP.slug) : []);
  renderAll();
}

function renderNoInspector() {
  document.getElementById('page-title').textContent = 'לא זוהה מפקח.ת';
  document.getElementById('page-subtitle').textContent = 'המבט נפתח רק דרך הקישור האישי';
  document.getElementById('teachers-container').innerHTML = `
    <div class="empty" style="padding:40px; text-align:center;">
      <div style="font-size:17px; font-weight:700; margin-bottom:8px;">הקישור חסר את זיהוי המפקח.ת</div>
      <div style="color:var(--text-muted); line-height:1.8;">
        יש להיכנס דרך הקישור האישי שקיבלת (בצורה <code>mabat/?i=...</code>).<br>
        לא קיבלת קישור? פנו למיטל פלג.
      </div>
    </div>`;
  ['stat-teachers', 'stat-schools', 'stat-subjects', 'stat-guides']
    .forEach(id => document.getElementById(id).textContent = '0');
}

function renderApiError() {
  document.getElementById('page-title').textContent = INSP.name;
  document.getElementById('page-subtitle').textContent = INSP.subjects.join(' · ') + ' · ' + INSP.society;
  document.getElementById('user-name').textContent = INSP.name;
  document.getElementById('teachers-container').innerHTML = `
    <div class="empty" style="padding:40px; text-align:center;">
      <div style="font-size:17px; font-weight:700; margin-bottom:8px;">רשימת המורים לא נטענה</div>
      <div style="color:var(--text-muted); line-height:1.8;">
        תקלה רגעית בשרת. רעננו את העמוד בעוד רגע.<br>
        אם זה חוזר — פנו למיטל פלג.
      </div>
    </div>`;
  ['stat-teachers', 'stat-schools'].forEach(id => document.getElementById(id).textContent = '—');
  document.getElementById('stat-subjects').textContent = INSP.subjects.length;
  document.getElementById('stat-guides').textContent =
    (window.TS_guidesOfInspector ? window.TS_guidesOfInspector(INSP.slug).length : 0);
}

function renderAll() {
  const bagrutN = state.teachers.filter(t => t.type !== 'gemer').length;
  const gemerN = state.teachers.length - bagrutN;
  const schools = new Set(state.teachers.map(t => t.schoolName)).size;

  document.getElementById('user-name').textContent = INSP.name;
  document.getElementById('page-title').textContent = INSP.name;
  document.getElementById('page-subtitle').textContent =
    INSP.subjects.join(' · ') + ' · ' + INSP.society + ' — ' +
    state.teachers.length + ' מורים (' + bagrutN + ' בגרות · ' + gemerN + ' גמר) ב-' + schools + ' בתי ספר';

  document.getElementById('stat-teachers').textContent = state.teachers.length;
  document.getElementById('stat-schools').textContent = schools;
  document.getElementById('stat-subjects').textContent = INSP.subjects.length;
  document.getElementById('stat-guides').textContent = state.guides.length;

  renderGuides();
  renderTeachers();
}

function renderGuides() {
  if (!state.guides.length) return;
  const card = document.getElementById('guides-card');
  card.hidden = false;
  document.getElementById('guides-grid').innerHTML = state.guides.map(g => {
    const n = state.teachers.filter(t => t.subject === g.subject).length;
    return `
      <div class="guide-mini">
        <span class="gm-name">${escapeHtml(g.name)}</span>
        <span class="gm-sub">${escapeHtml(g.subject)}</span>
        <span class="gm-count">${n} מורים</span>
      </div>`;
  }).join('');
}

function renderPills() {
  // סרגל מקצועות — רק המקצועות שבאחריות המפקח.ת
  const sBar = document.getElementById('subject-filter');
  const sPill = (val, label, n) => `
    <button type="button" class="subject-pill ${currentSubject === val ? 'active' : ''}" data-subject="${escapeAttr(val)}">
      ${escapeHtml(label)}${n !== null ? ` (${n})` : ''}
    </button>`;
  sBar.innerHTML = '<span class="filter-label">מקצוע</span>' +
    sPill('', 'הכל', state.teachers.length) +
    INSP.subjects.map(s => sPill(s, s, state.teachers.filter(t => t.subject === s).length)).join('');
  sBar.querySelectorAll('[data-subject]').forEach(b =>
    b.addEventListener('click', () => { currentSubject = b.dataset.subject; renderTeachers(); }));

  // סרגל מסלול — נספר בתוך המקצוע שנבחר
  const inSubject = state.teachers.filter(t => !currentSubject || t.subject === currentSubject);
  const bagrutN = inSubject.filter(t => t.type !== 'gemer').length;
  const gemerN = inSubject.length - bagrutN;
  const tBar = document.getElementById('track-filter');
  const tPill = (val, label, n) => `
    <button type="button" class="subject-pill ${currentTrack === val ? 'active' : ''}" data-track="${val}">
      ${label}${n !== null ? ` (${n})` : ''}
    </button>`;
  tBar.innerHTML = '<span class="filter-label">מסלול</span>' +
    tPill('', 'הכל', null) + tPill('bagrut', 'בגרות', bagrutN) + tPill('gemer', 'גמר', gemerN);
  tBar.querySelectorAll('[data-track]').forEach(b =>
    b.addEventListener('click', () => { currentTrack = b.dataset.track; renderTeachers(); }));
}

function renderTeachers() {
  renderPills();
  const search = (document.getElementById('teacher-search').value || '').trim().toLowerCase();
  const filtered = state.teachers.filter(t =>
    (!currentSubject || t.subject === currentSubject) &&
    (!currentTrack || t.type === currentTrack) &&
    (!search || t.name.toLowerCase().includes(search) || t.schoolName.toLowerCase().includes(search))
  );

  const container = document.getElementById('teachers-container');
  if (!filtered.length) {
    container.innerHTML = '<div class="empty" style="padding:32px;">לא נמצאו מורים</div>';
    return;
  }

  // קיבוץ: מקצוע → בית ספר
  const bySubject = {};
  filtered.forEach(t => {
    if (!bySubject[t.subject]) bySubject[t.subject] = [];
    bySubject[t.subject].push(t);
  });

  container.innerHTML = Object.keys(bySubject).map(subject => {
    const rows = bySubject[subject];
    const schools = new Set(rows.map(t => t.schoolName)).size;
    const bagrutN = rows.filter(t => t.type !== 'gemer').length;
    const guide = state.guides.find(g => g.subject === subject);
    return `
      <div class="subj-group">
        <div class="subj-header">
          <h3>${escapeHtml(subject)}</h3>
          <span class="meta">
            ${rows.length} מורים ·
            <span class="track-chip bagrut">בגרות ${bagrutN}</span>
            <span class="track-chip gemer">גמר ${rows.length - bagrutN}</span>
            · ${schools} בתי ספר${guide ? ' · מדריכה: ' + escapeHtml(guide.name) : ''}
          </span>
        </div>
        <div class="table-wrap" style="border:none;">
          <table class="t-grid">
            <thead>
              <tr>
                <th>שם המורה</th>
                <th>בית ספר</th>
                <th>רשת</th>
                <th>מסלול</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(t => `
                <tr>
                  <td class="school-row-name">${escapeHtml(t.name)}</td>
                  <td>${escapeHtml(t.schoolName)}</td>
                  <td><span class="net-chip ${escapeAttr(t.network)}">${escapeHtml(t.networkName || t.network)}</span></td>
                  <td><span class="track-chip ${t.type}">${t.type === 'gemer' ? 'גמר' : 'בגרות'}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/* ערכים שנכנסים לתוך מרכאות של אטריביוט — כולל מקצועות עם גרש (תנ"ך) */
function escapeAttr(s) { return escapeHtml(s); }
