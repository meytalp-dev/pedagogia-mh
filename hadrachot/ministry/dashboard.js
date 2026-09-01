// Ministry / National Inspector Dashboard — מצפן הפיקוח · רויטל אמיר
let state = {
  filter: { subject: '', availableSubjects: [] },
  summary: {},
  networkBreakdown: [],
  schoolBreakdown: []
};
let currentSubject = '';

// פילוח מגזרים — נבנה בצד הלקוח מרשימת המורים + מפת המגזרים של פריסת הפיקוח
let allTeachers = [];
let sectorBySchool = {};   // sch_id -> kelali | haredi | arab
const SECTOR_ORDER = ['kelali', 'haredi', 'arab'];
const SECTOR_COLORS = { kelali: '#1d4ed8', haredi: '#5b21b6', arab: '#047857' };

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('month-label').textContent = TS.monthLabel();
  loadSectorData();   // רץ במקביל ל-load — לא חוסם את שאר הדשבורד
  await load();
});

async function load() {
  const res = TS.getAppsScriptUrl()
    ? await TS.api('ministry.dashboard', { subject: currentSubject })
    : { ok: false, error: 'no_url' };
  if (res.ok && res.data) {
    state = res.data;
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

async function loadSectorData() {
  try {
    const mapRes = await fetch('../_data/sector-map-2027.json');
    const map = await mapRes.json();
    (map.schools || []).forEach(s => { sectorBySchool[s.id] = s.sector; });
  } catch (e) { /* המפה לא זמינה — ניפול לשדה sector של המורה */ }

  const res = await TS.api('teachers.list', {});
  if (res.ok && res.data) allTeachers = res.data;
  renderSectorView();
  renderWeakSchools();   // רענון — כדי להוסיף צ'יפ מגזר לטבלה
}

function teacherSector(t) {
  return sectorBySchool[t.school] || t.sector || 'kelali';
}

function render() {
  renderSubjectPills();
  renderCommandStrip();
  renderNetworkLenses();
  renderWeakSchools();
  renderSectorView();
}

function renderSectorView() {
  const lensesEl = document.getElementById('sector-lenses');
  const matrixEl = document.getElementById('sector-matrix-body');
  if (!lensesEl || !matrixEl) return;
  if (!allTeachers.length) {
    lensesEl.innerHTML = emptyMsg('טוען את רשימת המורים...');
    return;
  }

  const teachers = currentSubject
    ? allTeachers.filter(t => t.subject === currentSubject)
    : allTeachers;

  // כרטיס לכל מגזר: מורים · בתי ספר · המקצוע הגדול ביותר
  const bySector = {};
  SECTOR_ORDER.forEach(s => bySector[s] = { teachers: 0, schools: {}, subjects: {} });
  teachers.forEach(t => {
    const sec = teacherSector(t);
    const b = bySector[sec] || bySector.kelali;
    b.teachers++;
    if (t.school) b.schools[t.school] = true;
    const subj = t.subject || '—';
    b.subjects[subj] = (b.subjects[subj] || 0) + 1;
  });

  const total = teachers.length || 1;
  lensesEl.innerHTML = SECTOR_ORDER.map(sec => {
    const b = bySector[sec];
    const pct = Math.round((b.teachers / total) * 100);
    const topSubjects = Object.entries(b.subjects)
      .sort((a, z) => z[1] - a[1]).slice(0, 3)
      .map(([name, n]) => `${escapeHtml(name)} · ${n}`).join('<br>');
    return `
      <div class="net-lens" style="--lens-net: ${SECTOR_COLORS[sec]};">
        <div class="net-lens-row-1">
          <div class="net-lens-name-block">
            ${TS.secChip(sec)}
            <span class="net-lens-status-tag ok">${pct}% מהמורים</span>
          </div>
        </div>
        <div class="net-lens-stats">
          <div class="net-lens-stat">
            <div class="net-lens-stat-num">${b.teachers}</div>
            <div class="net-lens-stat-label">מורים</div>
          </div>
          <div class="net-lens-stat">
            <div class="net-lens-stat-num">${Object.keys(b.schools).length}</div>
            <div class="net-lens-stat-label">בתי ספר</div>
          </div>
          <div class="net-lens-stat">
            <div class="net-lens-stat-num">${Object.keys(b.subjects).length}</div>
            <div class="net-lens-stat-label">מקצועות</div>
          </div>
        </div>
        ${topSubjects ? `<div style="font-size:13px; color:var(--text-muted); line-height:1.7; padding-top:10px; border-top:1px solid var(--border);">${topSubjects}</div>` : ''}
      </div>`;
  }).join('');

  // מטריצה — מקצוע × מגזר (תמיד על כל המורים, בלי סינון המקצוע)
  const matrix = {};
  allTeachers.forEach(t => {
    const subj = t.subject || '—';
    const sec = teacherSector(t);
    matrix[subj] = matrix[subj] || { kelali: 0, haredi: 0, arab: 0 };
    matrix[subj][sec] = (matrix[subj][sec] || 0) + 1;
  });
  const subjectOrder = [...TS.SUBJECTS.filter(s => matrix[s]),
                        ...Object.keys(matrix).filter(s => !TS.SUBJECTS.includes(s)).sort()];
  const totals = { kelali: 0, haredi: 0, arab: 0 };
  matrixEl.innerHTML = subjectOrder.map(subj => {
    const row = matrix[subj];
    SECTOR_ORDER.forEach(s => totals[s] += row[s] || 0);
    const rowTotal = SECTOR_ORDER.reduce((n, s) => n + (row[s] || 0), 0);
    const active = currentSubject === subj;
    return `
      <tr${active ? ' style="background:var(--surface-soft);"' : ''}>
        <td class="school-cell">${escapeHtml(subj)}</td>
        <td>${row.kelali || '—'}</td>
        <td>${row.haredi || '—'}</td>
        <td>${row.arab || '—'}</td>
        <td><strong>${rowTotal}</strong></td>
      </tr>`;
  }).join('') + `
    <tr style="border-top:2px solid var(--border);">
      <td class="school-cell"><strong>סה"כ</strong></td>
      <td><strong>${totals.kelali}</strong></td>
      <td><strong>${totals.haredi}</strong></td>
      <td><strong>${totals.arab}</strong></td>
      <td><strong>${totals.kelali + totals.haredi + totals.arab}</strong></td>
    </tr>`;
}

function renderSubjectPills() {
  const container = document.getElementById('subject-filter-bar');
  container.innerHTML = '<span class="filter-label">סינון מקצוע</span>';
  const all = document.createElement('button');
  all.className = 'subject-pill' + (currentSubject === '' ? ' active' : '');
  all.dataset.subject = '';
  all.textContent = 'כל המקצועות';
  all.onclick = () => switchSubject('');
  container.appendChild(all);

  const subjects = state.filter?.availableSubjects || [];
  subjects.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'subject-pill' + (currentSubject === s ? ' active' : '');
    btn.dataset.subject = s;
    btn.textContent = s;
    btn.onclick = () => switchSubject(s);
    container.appendChild(btn);
  });
}
async function switchSubject(s) { currentSubject = s; await load(); }

function renderCommandStrip() {
  const s = state.summary || {};
  document.getElementById('cmd-networks').textContent = s.networks || 0;
  document.getElementById('cmd-schools').textContent = s.schools || 0;
  document.getElementById('cmd-teachers').textContent = s.teachers || 0;
  document.getElementById('cmd-trainings').textContent = s.trainings || 0;
  const rateEl = document.getElementById('cmd-rate');
  rateEl.classList.remove('ok', 'warn', 'err', 'mint');
  if (noAttendanceYet()) {
    rateEl.textContent = '—';
  } else {
    rateEl.textContent = (s.avgRate || 0) + '%';
    rateEl.classList.add(s.avgRate >= 80 ? 'mint' : s.avgRate >= 50 ? 'warn' : 'err');
  }
  document.getElementById('cmd-records').textContent = s.attendanceRecords || 0;
}

// עוד לא נרשמה אף נוכחות במערכת → 0% אצל כולם הוא "אין נתונים", לא "בסיכון"
function noAttendanceYet() {
  return !((state.summary || {}).attendanceRecords > 0);
}

function renderNetworkLenses() {
  const nets = (state.networkBreakdown || []).slice();
  if (!nets.length) {
    document.getElementById('networks-featured').innerHTML = emptyMsg('אין נתונים עבור הסינון הנוכחי');
    document.getElementById('networks-grid').innerHTML = '';
    return;
  }

  // אין עדיין נתוני נוכחות — בלי התראות ובלי "רשתות חלשות"; כולן בגריד הרגיל, במצב נייטרלי
  document.querySelectorAll('.badge-attention').forEach(b => { b.hidden = noAttendanceYet(); });
  if (noAttendanceYet()) {
    nets.sort((a, b) => (b.teachers || 0) - (a.teachers || 0));
    document.getElementById('networks-featured').innerHTML =
      '<div style="grid-column:1/-1; padding:20px 24px; border:1px dashed var(--border); border-radius:14px; color:var(--text-muted); line-height:1.8;">' +
      'מדידת הנוכחות טרם החלה — עדיין לא נקלטו רישומי נוכחות, ולכן אין רשתות שדורשות פעולה ואין התראות. ' +
      'ברגע שייקלטו צ\'ק-אינים ראשונים, הרשתות החלשות יופיעו כאן.' +
      '</div>';
    document.getElementById('networks-grid').innerHTML = nets.map(n => networkLensCard(n, false)).join('');
    return;
  }

  // מיון: חלשות ראשונות
  nets.sort((a, b) => (a.rate || 0) - (b.rate || 0));

  // 2-3 חלשות לטוף Featured
  const featuredCount = Math.min(3, Math.max(1, Math.floor(nets.length * 0.3)));
  const featured = nets.slice(0, featuredCount);
  const rest = nets.slice(featuredCount);

  document.getElementById('networks-featured').innerHTML = featured.map(n => networkLensCard(n, true)).join('');
  document.getElementById('networks-grid').innerHTML = rest.map(n => networkLensCard(n, false)).join('');
}

function networkLensCard(n, isFeatured) {
  const noData = noAttendanceYet();
  const rate = n.rate || 0;
  const rateClass = rate >= 80 ? 'ok' : rate >= 50 ? 'warn' : 'err';
  const cssVar = `--lens-net: var(--net-${n.color || 'ort'});`;
  const action = recommendAction(n, rate);
  const circumference = 2 * Math.PI * 30;
  const dash = (rate / 100) * circumference;
  const statusTag = noData
    ? '<span class="net-lens-status-tag" style="background:var(--surface-soft); color:var(--text-muted);">טרם החלה מדידה</span>'
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
          <div class="net-lens-stat-num">${n.schools || 0}</div>
          <div class="net-lens-stat-label">בתי ספר</div>
        </div>
        <div class="net-lens-stat">
          <div class="net-lens-stat-num ${noData ? '' : n.missed > 0 ? 'coral' : 'mint'}">${noData ? '—' : n.missed || 0}</div>
          <div class="net-lens-stat-label">בסיכון</div>
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
        <a class="btn-soft-sm" href="../admin-network/?network=${encodeURIComponent(n.id)}">
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

function recommendAction(n, rate) {
  if (rate >= 80) return 'המשך מעקב חודשי שגרתי.';
  if (rate >= 50) return 'שיחה עם מנהל הרשת על מורים בסיכון.';
  if (n.missed > 5) return 'התראה ל-' + n.missed + ' מורים שמתחת ל-50%.';
  return 'שליחת דוח דחוף ובקשת תוכנית התערבות.';
}

function renderWeakSchools() {
  const tbody = document.getElementById('weak-schools-body');
  const schools = (state.schoolBreakdown || []).slice(0, 10);
  if (noAttendanceYet()) {
    tbody.innerHTML = '<tr><td colspan="6" style="padding:24px; text-align:center; color:var(--text-muted);">מדידת הנוכחות טרם החלה — אין עדיין דירוג בתי ספר.</td></tr>';
    return;
  }
  if (!schools.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="padding:24px; text-align:center; color:var(--text-muted);">אין נתוני בתי ספר</td></tr>';
    return;
  }
  tbody.innerHTML = schools.map(s => {
    const school = s.school || {};
    const rate = s.rate || 0;
    const fillClass = rate >= 80 ? 'ok' : rate >= 50 ? 'warn' : '';
    const netColor = s.networkColor || (school.network || '').replace(/^net_/, '');
    const netName = s.networkName || netColor || '—';
    const netChip = netColor ? `<span class="net-chip ${netColor}">${escapeHtml(netName)}</span>` : '—';
    const sector = sectorBySchool[school.id];
    const secChip = sector ? TS.secChip(sector) : '—';
    return `
      <tr>
        <td class="school-cell">${escapeHtml(school.name || '')}</td>
        <td>${netChip}</td>
        <td>${secChip}</td>
        <td>${s.teachers}</td>
        <td>
          <div class="att-progress">
            <div class="att-progress-bar">
              <div class="att-progress-fill ${fillClass}" style="width:${rate}%"></div>
            </div>
            <span class="att-progress-val">${rate}%</span>
          </div>
        </td>
        <td><a class="open-btn" href="../admin-school/?school=${encodeURIComponent(school.id)}&network=${encodeURIComponent(school.network || '')}">פתח</a></td>
      </tr>
    `;
  }).join('');
}

function sendToNetwork(netId, netName, netEmail) {
  const n = (state.networkBreakdown || []).find(x => x.id === netId);
  if (!n) return;
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
    ...(noAttendanceYet()
      ? ['• מדידת הנוכחות טרם החלה — נתוני נוכחות יופיעו בדוחות הבאים']
      : [
          `• אחוז נוכחות ממוצע: ${n.rate}%`,
          `• עומדים ביעד (80%+): ${n.present}`,
          `• בסיכון (מתחת ל-50%): ${n.missed}`
        ]),
    ``,
    `דשבורד מלא של הרשת:`,
    `${location.origin}${location.pathname.replace('/ministry/', '/admin-network/')}?network=${netId}${currentSubject ? '&subject=' + encodeURIComponent(currentSubject) : ''}`,
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
