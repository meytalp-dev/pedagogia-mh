// School Admin / Pedagogical Coordinator Dashboard
const schoolId = TS.urlParam('school', '');
const networkId = TS.urlParam('network', '');
const subjectParam = TS.urlParam('subject', '');  // אם יש subject ב-URL → מצב רכז פדגוגי

let state = {
  school: null,
  subjects: {},
  teachers: [],
  stats: { teachers: 0, avgRate: 0 }
};

document.addEventListener('DOMContentLoaded', async () => {
  bindTabs();
  document.getElementById('filter-search').addEventListener('input', renderTeachers);
  document.getElementById('filter-subject').addEventListener('change', renderTeachers);
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
  if (!schoolId) {
    renderLoadError('חסר מזהה בית ספר בקישור (school=...). יש להיכנס דרך הקישור שקיבלתם.');
    return;
  }
  const res = TS.getAppsScriptUrl()
    ? await TS.api('school.dashboard', { school: schoolId, subject: subjectParam })
    : { ok: false, error: 'no_url' };
  if (res.ok && res.data) {
    state = res.data;
    renderAll();
  } else {
    renderLoadError('לא הצלחנו לטעון את נתוני בית הספר מהשרת — נסו לרענן את הדף.' +
      (res.error ? ' (שגיאה: ' + res.error + ')' : ''));
  }
}

// שגיאת טעינה — מציגים אמת, לא נתוני דמו
function renderLoadError(msg) {
  const main = document.querySelector('main');
  if (main) main.innerHTML =
    '<div style="padding:48px 24px; text-align:center; color:var(--text-2); line-height:1.8;">' +
    msg.replace(/</g, '&lt;') + '</div>';
}

function renderAll() {
  if (!state.school) return;
  const s = state.school;
  const isCoordinator = !!subjectParam;
  document.getElementById('role-label').textContent = isCoordinator ? ('רכז פדגוגי · ' + subjectParam) : 'מנהל בית ספר';
  document.getElementById('user-name').textContent = s.principalName || '—';
  document.getElementById('user-school').textContent = s.name + ' · רשת ' + (s.networkName || '');

  document.getElementById('page-title').textContent = s.name;
  document.getElementById('page-subtitle').innerHTML =
    '<span class="net-chip ' + s.network + '">' + (s.networkName || s.network) + '</span> · ' +
    state.teachers.length + ' מורים' +
    (isCoordinator ? ' · מקצוע: ' + subjectParam : '');

  const subjectsCount = Object.keys(state.subjects).length;
  document.getElementById('stat-teachers').textContent = state.teachers.length;
  document.getElementById('stat-subjects').textContent = subjectsCount;
  document.getElementById('stat-rate').textContent = state.stats.avgRate + '%';
  document.getElementById('stat-rate').className = 'stat-value ' +
    (state.stats.avgRate >= 80 ? 'ok' : state.stats.avgRate >= 50 ? 'warn' : 'err');
  document.getElementById('stat-rate-sub').textContent = 'יעד: ' + (s.attendanceTarget || 80) + '%';

  const atRisk = state.teachers.filter(t => t.stats.rate < 50).length;
  document.getElementById('stat-risk').textContent = atRisk;
  document.getElementById('stat-risk').className = 'stat-value ' + (atRisk === 0 ? 'ok' : atRisk <= 2 ? 'warn' : 'err');

  populateSubjectFilter();
  renderAlerts();
  renderTeachers();
  renderTrainings();
}

function populateSubjectFilter() {
  const sel = document.getElementById('filter-subject');
  if (sel.options.length > 1) return;
  Object.keys(state.subjects).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;   // דרך ה-DOM — הגרשיים של תנ"ך לא שוברות attribute
    sel.appendChild(opt);
  });
  if (subjectParam) {
    sel.value = subjectParam;
    sel.disabled = true;  // ברכז פדגוגי הסינון נעול
  }
}

function renderAlerts() {
  const container = document.getElementById('alerts-section');
  const atRisk = state.teachers.filter(t => t.stats.rate < 50);
  if (!atRisk.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <div class="low-rate-card">
      <h4>${atRisk.length} מורים בסיכון — נוכחות מתחת ל-50%</h4>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${atRisk.slice(0, 8).map(t => `
          <a class="reminder-btn" href="${TS.whatsappLink(t.phone, `שלום ${t.name}, ראיתי שהיו לך פחות מחצי מההדרכות החודש. אשמח לדבר.`)}" target="_blank">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            ${TS.escape ? TS.escape(t.name) : t.name}
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

function renderTeachers() {
  const search = (document.getElementById('filter-search').value || '').trim().toLowerCase();
  const subjectFilter = document.getElementById('filter-subject').value;

  const filtered = state.teachers.filter(t => {
    if (search && !(t.name || '').toLowerCase().includes(search)) return false;
    if (subjectFilter && t.subject !== subjectFilter) return false;
    return true;
  });

  // קיבוץ לפי מקצוע
  const bySubject = {};
  filtered.forEach(t => {
    if (!bySubject[t.subject]) bySubject[t.subject] = [];
    bySubject[t.subject].push(t);
  });

  const container = document.getElementById('teachers-container');
  if (!Object.keys(bySubject).length) {
    container.innerHTML = '<div class="empty" style="padding:32px;">לא נמצאו מורים</div>';
    return;
  }

  const today = new Date();
  container.innerHTML = Object.keys(bySubject).sort().map(subj => {
    const trainings = state.subjects[subj] || [];
    const teachers = bySubject[subj];
    const avgRate = teachers.length
      ? Math.round(teachers.reduce((s, t) => s + t.stats.rate, 0) / teachers.length)
      : 0;
    const teachersHtml = teachers.map(t => `
      <tr>
        <td class="name-cell">
          ${escapeHtml(t.name)}
          ${t.phone ? `<a href="${TS.whatsappLink(t.phone, 'שלום ' + t.name)}" target="_blank" title="וואטסאפ" style="margin-right:6px; color:#25D366; vertical-align:middle;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654z"/></svg>
          </a>` : ''}
        </td>
        ${trainings.map(tr => attCell(t.attendance[tr.id], tr.date, today)).join('')}
        <td class="rate-cell ${rateClass(t.stats.rate)}">${t.stats.rate}%</td>
      </tr>
    `).join('');
    return `
      <div class="subject-group">
        <div class="subject-header">
          <h3>${escapeHtml(subj)} — ${teachers.length} מורים</h3>
          <span class="meta">ממוצע נוכחות: <strong class="${rateClass(avgRate)}">${avgRate}%</strong></span>
        </div>
        <div class="table-wrap" style="border:none;">
          <table class="att-grid">
            <thead>
              <tr>
                <th style="text-align:right;">שם המורה</th>
                ${trainings.map(tr => `<th class="att-cell">${shortDate(tr.date)}</th>`).join('')}
                <th>%</th>
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
  if (trDate > today) return '<td class="att-cell"><span class="att-mark future">·</span></td>';
  if (!att) return '<td class="att-cell"><span class="att-mark absent" title="לא נוכח">—</span></td>';
  if (att.status === 'present') return '<td class="att-cell"><span class="att-mark present">V</span></td>';
  if (att.status === 'partial') return '<td class="att-cell"><span class="att-mark partial">½</span></td>';
  const title = (att.notes || 'לא נוכח').replace(/"/g, '&quot;');
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
  const all = Object.values(state.subjects).flat();
  if (!all.length) {
    list.innerHTML = '<div class="empty" style="padding:32px;">אין הדרכות עדיין</div>';
    return;
  }
  all.sort((a, b) => new Date(b.date) - new Date(a.date));
  const today = new Date();
  list.innerHTML = all.map(t => {
    const trDate = new Date(t.date);
    const isFuture = trDate > today;
    const teachersInSubject = state.teachers.filter(tch => tch.subject === t.subject);
    const presentCount = teachersInSubject.filter(tch => {
      const a = tch.attendance[t.id];
      return a && a.status === 'present';
    }).length;
    return `
      <div style="padding:14px 16px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <div style="font-weight:700;">${TS.formatDate(t.date)} · ${escapeHtml(t.subject)}</div>
          <div style="color:var(--text-2); font-size:13px;">${escapeHtml(t.guideName || '')}</div>
        </div>
        <div style="color:var(--text-2); font-size:13px;">
          ${isFuture ? '🗓️ עתידי' : `${presentCount} מתוך ${teachersInSubject.length} נוכחו`}
        </div>
      </div>
    `;
  }).join('');
}

