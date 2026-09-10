/* ============================================================
   מבט מקצועי למפקח.ת — קריאה בלבד
   נטען לפי mabat/?i=<slug> מתוך window.TS_INSPECTORS.
   מציג אך ורק את המורים במקצועות ובמגזרים שבאחריות המפקח.ת:
   אין כאן נתוני מפקחים אחרים, אין עריכה ואין מחיקה.
   ============================================================ */

const inspectorSlug = TS.urlParam('i', '');
const INSP = (window.TS_resolveInspector ? window.TS_resolveInspector(inspectorSlug) : null);

let state = {
  teachers: [],
  guides: [],
  // מרחב המדריכה — שלוש מפות לפי slug. ריק עד שהשרת מחזיר (או אם הפריסה
  // עדיין בלי guide.workspace — אז הכרטיסים פשוט מציגים 0 ולא נשברים).
  ws: { files: {}, messages: {}, hours: {} }
};
let currentSubject = '';   // '' = כל המקצועות שבאחריותי
let currentTrack = '';     // '' = הכל · 'bagrut' · 'gemer'

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('teacher-search').addEventListener('input', renderTeachers);
  if (!INSP) { renderNoInspector(); return; }
  initGuideWorkspaceUI();
  await loadData();
});

async function loadData() {
  if (!TS.getAppsScriptUrl()) { renderNoInspector(); return; }

  // קריאה אחת בלבד. חשוב: Apps Script מטפל בבקשות של אותו משתמש בטור,
  // ולכן קריאה נפרדת לכל מקצוע (5 אצל אחמד מחאמיד) חורגת מתקרת 30 השניות
  // וחלק מהמקצועות פשוט לא נטענים. מושכים הכול פעם אחת ומסננים כאן.
  state.guides = (window.TS_guidesOfInspector ? window.TS_guidesOfInspector(INSP.slug) : []);

  // שתי הקריאות במקביל. מרחב המדריכה לא חוסם את רשימת המורים: אם הוא נכשל
  // (או שהפריסה עדיין בלי הפעולה), הטבלה עולה כרגיל והכרטיסים מציגים 0.
  const [res] = await Promise.all([
    TS.api('teachers.list', {}),
    loadWorkspace()
  ]);
  if (!res || !res.ok) { renderApiError(); return; }

  const teachers = [];
  (res.data || []).forEach(t => {
    const sector = t.sector || 'kelali';
    /* הצלבה של subjects×sectors לא מספיקה מאז 9.9.26: יששכר הוא תנ"ך ארצי
       ובנוסף כל המקצועות במגזר החרדי, וליאת ארצית באנגלית ובספרות אבל לא
       בעברית לדוברי ערבית. TS_inspectorCovers היא הבדיקה היחידה הנכונה. */
    if (!window.TS_inspectorCovers(INSP, t.subject, sector)) return;
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
  renderAll();
}

// cache:'no' — קובץ שהועלה או הודעה שנשלחה חייבים להופיע מיד, לא אחרי TTL
async function loadWorkspace() {
  if (!state.guides.length) return;
  const slugs = state.guides.map(g => g.slug).join(',');
  const res = await TS.api('guide.workspace', { guides: slugs }, { cache: 'no' });
  if (res && res.ok && res.data) state.ws = res.data;
}

function renderNoInspector() {
  /* שני מקרים שונים, ואסור לבלבל ביניהם: קישור בלי ?i= (מישהו הגיע לכתובת
     החשופה), לעומת קישור עם slug שכבר אינו בפריסה — למשל מפקח.ת שיצא.ה
     מהפריסה. להגיד לו "הקישור חסר זיהוי" זה פשוט לא נכון, והוא ינסה שוב. */
  const stale = !!inspectorSlug;
  document.getElementById('page-title').textContent = stale ? 'המבט אינו פעיל' : 'לא זוהה מפקח.ת';
  document.getElementById('page-subtitle').textContent = 'המבט נפתח רק דרך הקישור האישי';
  document.getElementById('teachers-container').innerHTML = stale ? `
    <div class="empty" style="padding:40px; text-align:center;">
      <div style="font-size:17px; font-weight:700; margin-bottom:8px;">הקישור הזה אינו פעיל יותר</div>
      <div style="color:var(--text-muted); line-height:1.8;">
        פריסת הפיקוח עודכנה, והמבט שהקישור הזה הוביל אליו אינו קיים עוד.<br>
        לבירור — מיטל פלג.
      </div>
    </div>` : `
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
  document.getElementById('stat-guides').textContent = state.guides.length;
  // כרטיסי המדריכות עולים גם כשרשימת המורים נפלה — הקבצים, ההודעות
  // והשעות הפרטניות אינם תלויים בה, ואין סיבה לחסום אותם בגלל תקלה רגעית.
  renderGuides();
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

const ICON_FILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
const ICON_MSG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5a8.4 8.4 0 0 1-.9-3.9 8.4 8.4 0 0 1 8.4-9 8.4 8.4 0 0 1 8.6 8.4z"/></svg>';
const ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

function wsOf(slug, kind) {
  return (state.ws && state.ws[kind] && state.ws[kind][slug]) || [];
}

function renderGuides() {
  if (!state.guides.length) return;
  const card = document.getElementById('guides-card');
  card.hidden = false;
  document.getElementById('guides-grid').innerHTML = state.guides.map(g => {
    const n = state.teachers.filter(t => window.TS_guideTeaches(g, t.subject)).length;
    const files = wsOf(g.slug, 'files').length;
    const msgs = wsOf(g.slug, 'messages').length;
    const hoursRows = wsOf(g.slug, 'hours');
    const hoursSum = hoursRows.reduce((s, h) => s + (Number(h.hours) || 0), 0);
    const btn = (kind, icon, label, count) => `
      <button type="button" class="gm-btn" data-guide="${escapeAttr(g.slug)}" data-open="${kind}" title="${escapeAttr(label)} — ${escapeAttr(g.name)}">
        ${icon}<span>${label}</span><span class="n ${count ? '' : 'zero'}">${count}</span>
      </button>`;
    return `
      <div class="guide-mini">
        <span class="gm-name">${escapeHtml(g.name)}</span>
        <span class="gm-sub">${escapeHtml(window.TS_guideSubjects(g).join(' · '))}</span>
        <span class="gm-count">${n} מורים${hoursSum ? ' · ' + fmtHours(hoursSum) + ' שעות פרטניות' : ''}</span>
        <div class="gm-actions">
          ${btn('files', ICON_FILE, 'קבצים', files)}
          ${btn('messages', ICON_MSG, 'הודעות', msgs)}
          ${btn('hours', ICON_CLOCK, 'שעות', hoursRows.length)}
        </div>
      </div>`;
  }).join('');

  document.querySelectorAll('#guides-grid [data-open]').forEach(b =>
    b.addEventListener('click', () => openGuideWorkspace(b.dataset.guide, b.dataset.open)));
}

// 1.5 ולא 1.50, 2 ולא 2.0
function fmtHours(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return Number.isInteger(v) ? String(v) : String(v);
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
    // מדריכה רב-מקצועית משויכת לכל אחת מקבוצות המקצוע שלה
    const guide = state.guides.find(g => window.TS_guideTeaches(g, subject));
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

/* ============================================================
   מרחב המדריכה — קבצים · הודעות · שעות פרטניות
   נפתח מכרטיס המדריכה שבראש העמוד. שאר העמוד נשאר קריאה בלבד:
   הכתיבה כאן היא של המפקח.ת אל המדריכה, ולא נגיעה בנתוני המורים.
   ============================================================ */

const MAX_FILE_BYTES = 8 * 1024 * 1024;   // זהה לתקרה בצד השרת
let wsGuide = null;                        // המדריכה שהחלון פתוח עליה

function initGuideWorkspaceUI() {
  const modal = document.getElementById('guide-modal');

  document.getElementById('gw-close').addEventListener('click', closeGuideWorkspace);
  modal.addEventListener('click', e => { if (e.target === modal) closeGuideWorkspace(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeGuideWorkspace();
  });

  document.querySelectorAll('.ws-tab').forEach(t =>
    t.addEventListener('click', () => switchWsTab(t.dataset.tab)));

  // ---- קבצים ----
  const dz = document.getElementById('drop-zone');
  const input = document.getElementById('file-input');
  dz.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { uploadFiles(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault(); dz.classList.add('over');
  }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault(); dz.classList.remove('over');
  }));
  dz.addEventListener('drop', e => uploadFiles(e.dataTransfer.files));

  // ---- הודעות ----
  document.getElementById('msg-send').addEventListener('click', sendMessage);

  // ---- שעות פרטניות ----
  document.getElementById('hours-form').addEventListener('submit', e => {
    e.preventDefault();
    addHours();
  });
}

function openGuideWorkspace(slug, tab) {
  wsGuide = state.guides.find(g => g.slug === slug);
  if (!wsGuide) return;
  document.getElementById('gw-title').textContent = wsGuide.name;
  document.getElementById('gw-sub').textContent =
    window.TS_guideSubjects(wsGuide).join(' · ') + ' · ' +
    state.teachers.filter(t => window.TS_guideTeaches(wsGuide, t.subject)).length + ' מורים';
  fillHoursDefaults();
  switchWsTab(tab || 'files');
  renderWsPanes();
  document.getElementById('guide-modal').classList.add('open');
}

function closeGuideWorkspace() {
  document.getElementById('guide-modal').classList.remove('open');
  wsGuide = null;
}

function switchWsTab(tab) {
  document.querySelectorAll('.ws-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.ws-pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + tab));
}

function renderWsPanes() {
  renderWsFiles();
  renderWsMessages();
  renderWsHours();
}

// אחרי כל כתיבה — מושכים מחדש ומרעננים גם את המונים שעל הכרטיסים
async function refreshWorkspace() {
  await loadWorkspace();
  renderGuides();
  if (wsGuide) renderWsPanes();
}

// ---------- קבצים ----------
function renderWsFiles() {
  const rows = wsOf(wsGuide.slug, 'files');
  const el = document.getElementById('files-list');
  if (!rows.length) {
    el.innerHTML = '<div class="empty" style="padding:20px;">עדיין לא הועלו קבצים</div>';
    return;
  }
  el.innerHTML = rows.map(f => `
    <div class="file-row">
      <span class="fr-icon">${ICON_FILE}</span>
      <div class="fr-body">
        <a class="fr-name" href="${escapeAttr(f.fileUrl)}" target="_blank" rel="noopener">${escapeHtml(f.fileName)}</a>
        <div class="fr-meta">${fmtSize(f.size)}${f.uploadedBy ? ' · ' + escapeHtml(f.uploadedBy) : ''} · ${fmtWhen(f.createdAt)}</div>
      </div>
      <button type="button" class="row-del" data-del-file="${escapeAttr(f.id)}" title="מחיקה">מחיקה</button>
    </div>`).join('');

  el.querySelectorAll('[data-del-file]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('למחוק את הקובץ? הוא יעבור לסל המיחזור בדרייב.')) return;
    b.disabled = true;
    const res = await TS.apiPost('guide.file.delete', { id: b.dataset.delFile });
    if (res && res.ok) { TS.toast('הקובץ נמחק'); await refreshWorkspace(); }
    else { b.disabled = false; TS.toast('המחיקה נכשלה'); }
  }));
}

async function uploadFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length || !wsGuide) return;
  const status = document.getElementById('files-status');
  let done = 0;

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      status.textContent = `"${file.name}" גדול מדי (${fmtSize(file.size)}) — עד 8MB לקובץ.`;
      continue;
    }
    status.textContent = `מעלה את "${file.name}" (${done + 1} מתוך ${files.length})...`;
    let data;
    try { data = await fileToBase64(file); }
    catch (e) { status.textContent = `קריאת "${file.name}" נכשלה.`; continue; }

    const res = await TS.apiPost('guide.file.add', {
      guide: wsGuide.slug,
      guideName: wsGuide.name,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      data: data,
      byName: INSP.name
    });
    if (res && res.ok) done++;
    else status.textContent = `העלאת "${file.name}" נכשלה` + (res && res.error ? ' (' + res.error + ')' : '') + '.';
  }

  if (done) {
    status.textContent = done === files.length ? '' : status.textContent;
    TS.toast(done === 1 ? 'הקובץ הועלה' : done + ' קבצים הועלו');
    await refreshWorkspace();
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    // readAsDataURL ולא ArrayBuffer: המרה ידנית ל-base64 על קובץ של מגהבייטים
    // חוסמת את הדפדפן. כאן הדפדפן עושה את זה, ואנחנו רק חותכים את הקידומת.
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// ---------- הודעות ----------
function renderWsMessages() {
  const rows = wsOf(wsGuide.slug, 'messages');
  const el = document.getElementById('msg-list');
  if (!rows.length) {
    el.innerHTML = '<div class="empty" style="padding:20px;">אין עדיין הודעות</div>';
    return;
  }
  el.innerHTML = rows.map(m => `
    <div class="msg ${m.authorRole === 'inspector' ? 'mine' : ''}">
      <div class="msg-head">
        <span class="msg-author">${escapeHtml(m.authorName || 'ללא שם')}${m.authorRole === 'inspector' ? ' · מפקח.ת' : ''}</span>
        <span class="msg-time">${fmtWhen(m.createdAt)}</span>
      </div>
      <div class="msg-text">${escapeHtml(m.text)}</div>
    </div>`).join('');
  el.scrollTop = el.scrollHeight;   // ההודעה האחרונה תמיד בשדה הראייה
}

async function sendMessage() {
  const box = document.getElementById('msg-text');
  const text = box.value.trim();
  if (!text || !wsGuide) return;
  const btn = document.getElementById('msg-send');
  const status = document.getElementById('msg-status');
  btn.disabled = true;
  status.textContent = 'שולח...';

  const res = await TS.apiPost('guide.message.add', {
    guide: wsGuide.slug,
    guideName: wsGuide.name,
    text: text,
    byName: INSP.name,
    byRole: 'inspector'
  });
  btn.disabled = false;
  if (res && res.ok) {
    box.value = '';
    status.textContent = '';
    await refreshWorkspace();
  } else {
    status.textContent = 'ההודעה לא נשמרה. נסו שוב.';
  }
}

// ---------- שעות פרטניות ----------
function fillHoursDefaults() {
  const subj = document.getElementById('h-subject');
  // המקצוע של המדריכה ראשון ומסומן — הוא הנפוץ כמעט תמיד
  // המקצועות של המדריכה ראשונים ומסומנים — הם הנפוצים כמעט תמיד
  const mine = window.TS_guideSubjects(wsGuide);
  const list = mine.concat(TS.SUBJECTS.filter(s => mine.indexOf(s) < 0));
  subj.innerHTML = list.map(s => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`).join('');

  const dl = document.getElementById('schools-datalist');
  const schools = Array.from(new Set(state.teachers.map(t => t.schoolName)))
    .filter(s => s && s !== '— ללא שיוך —').sort((a, b) => a.localeCompare(b, 'he'));
  dl.innerHTML = schools.map(s => `<option value="${escapeAttr(s)}"></option>`).join('');

  const d = new Date();
  document.getElementById('h-date').value =
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function renderWsHours() {
  const rows = wsOf(wsGuide.slug, 'hours');
  const total = document.getElementById('hours-total');
  const el = document.getElementById('hours-list');

  if (!rows.length) {
    total.hidden = true;
    el.innerHTML = '<div class="empty" style="padding:20px;">עדיין לא נרשמו שעות פרטניות</div>';
    return;
  }
  const sum = rows.reduce((s, h) => s + (Number(h.hours) || 0), 0);
  total.hidden = false;
  total.textContent = `סה"כ ${fmtHours(sum)} שעות · ` +
    (rows.length === 1 ? 'מפגש אחד' : rows.length + ' מפגשים');

  el.innerHTML = `
    <div class="table-wrap" style="border:none;">
      <table class="t-grid">
        <thead>
          <tr><th>מורה</th><th>מקצוע</th><th>בית ספר</th><th>נושא ההדרכה</th><th>תאריך</th><th>שעות</th><th></th></tr>
        </thead>
        <tbody>
          ${rows.map(h => `
            <tr>
              <td class="school-row-name">${escapeHtml((h.firstName + ' ' + h.lastName).trim())}</td>
              <td>${escapeHtml(h.subject || '—')}</td>
              <td>${escapeHtml(h.schoolName || '—')}</td>
              <td>${escapeHtml(h.topic || '—')}</td>
              <td>${fmtDateOnly(h.date)}</td>
              <td>${fmtHours(h.hours)}</td>
              <td><button type="button" class="row-del" data-del-hours="${escapeAttr(h.id)}" title="מחיקה">מחיקה</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  el.querySelectorAll('[data-del-hours]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('למחוק את הרישום?')) return;
    b.disabled = true;
    const res = await TS.apiPost('guide.hours.delete', { id: b.dataset.delHours });
    if (res && res.ok) { TS.toast('הרישום נמחק'); await refreshWorkspace(); }
    else { b.disabled = false; TS.toast('המחיקה נכשלה'); }
  }));
}

async function addHours() {
  if (!wsGuide) return;
  const form = document.getElementById('hours-form');
  const status = document.getElementById('hours-status');
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  status.textContent = 'שומר...';

  const res = await TS.apiPost('guide.hours.add', {
    guide: wsGuide.slug,
    guideName: wsGuide.name,
    firstName: document.getElementById('h-first').value.trim(),
    lastName: document.getElementById('h-last').value.trim(),
    subject: document.getElementById('h-subject').value,
    schoolName: document.getElementById('h-school').value.trim(),
    topic: document.getElementById('h-topic').value.trim(),
    date: document.getElementById('h-date').value,
    hours: document.getElementById('h-hours').value,
    byName: INSP.name
  });
  btn.disabled = false;

  if (res && res.ok) {
    status.textContent = '';
    // מנקים את שם המורה, הנושא והשעות. התאריך, המקצוע ובית הספר נשארים —
    // רישום של כמה מורים מאותו בית ספר ביום אחד הוא המקרה הרגיל.
    ['h-first', 'h-last', 'h-topic'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('h-hours').value = '1';
    TS.toast('הרישום נשמר');
    await refreshWorkspace();
    document.getElementById('h-first').focus();
  } else {
    status.textContent = 'הרישום לא נשמר' + (res && res.error ? ' (' + res.error + ')' : '') + '. נסו שוב.';
  }
}

// ---------- עיצוב ערכים ----------
function fmtSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('he-IL') + ' · ' +
         d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

// התאריך נשמר כטקסט yyyy-mm-dd. new Date() עליו מפרש UTC ומזיז יום
// אחורה בשעון ישראל — לכן מפרקים ידנית ולא דרך אובייקט Date.
function fmtDateOnly(v) {
  const s = String(v || '').slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : (s || '—');
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/* ערכים שנכנסים לתוך מרכאות של אטריביוט — כולל מקצועות עם גרש (תנ"ך) */
function escapeAttr(s) { return escapeHtml(s); }
