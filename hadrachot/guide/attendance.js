// Guide — Attendance recording
const trainingId = TS.urlParam('training', '');
let training = null;
let teachers = [];
let attendance = {}; // teacherId → 'present' | 'absent' | undefined
let notesById = {};
let filterNet = '';
let filterSector = '';
let filterSubject = '';

document.addEventListener('DOMContentLoaded', async () => {
  await load();
  setupFilters();
  document.getElementById('btn-save').addEventListener('click', saveAttendance);
  document.getElementById('btn-mark-all').addEventListener('click', () => markAll('present'));
  document.getElementById('btn-qr').addEventListener('click', openQr);
});

// QR display
function openQr() {
  if (!training) return;
  const token = training.qrToken || 'demo-token-' + training.id;
  const base = window.location.origin + window.location.pathname.replace(/\/guide\/attendance\.html.*$/, '/checkin/');
  const url = base + '?t=' + token;
  const target = document.getElementById('qr-target');
  target.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    QRCode.toCanvas(url, { width: 320, margin: 1 }, (err, canvas) => {
      if (canvas) target.appendChild(canvas);
    });
  } else {
    target.innerHTML = '<div class="empty">QR לא נטען</div>';
  }
  document.getElementById('qr-url').textContent = url;
  document.getElementById('qr-modal').classList.add('open');
}
function closeQr() {
  document.getElementById('qr-modal').classList.remove('open');
}
function copyCheckInUrl() {
  const url = document.getElementById('qr-url').textContent;
  navigator.clipboard.writeText(url).then(() => TS.toast('הקישור הועתק'));
}
function openCheckInUrl() {
  window.open(document.getElementById('qr-url').textContent, '_blank');
}

async function load() {
  const [trainRes, teachersRes, attRes] = await Promise.all([
    TS.api('trainings.list', {}),
    TS.api('teachers.list', {}),
    TS.api('attendance.training', { trainingId })
  ]);
  training = (trainRes.data || []).find(t => t.id === trainingId);
  teachers = teachersRes.data || [];
  if (training) {
    teachers = teachers.filter(t => !training.subject || t.subject === training.subject);
    if (training.sector) {
      teachers = teachers.filter(t => t.sector === training.sector);
    }
  }
  // Pre-fill existing attendance (כולל QR check-ins)
  (attRes.data || []).forEach(a => {
    attendance[a.teacherId] = a.status;
    if (a.checkedInVia === 'qr') notesById[a.teacherId] = 'check-in via QR';
  });
  render();

  // Auto-refresh כל 15 שניות כדי לקלוט check-ins חדשים
  if (!window._refreshTimer) {
    window._refreshTimer = setInterval(refreshAttendance, 15000);
  }
}

async function refreshAttendance() {
  if (!TS.getAppsScriptUrl()) return;
  const res = await TS.api('attendance.training', { trainingId });
  if (res.ok && res.data) {
    let changed = false;
    res.data.forEach(a => {
      if (attendance[a.teacherId] !== a.status) {
        attendance[a.teacherId] = a.status;
        changed = true;
      }
    });
    if (changed) {
      renderList();
      TS.toast('עודכן — מורים חדשים נכנסו דרך QR');
    }
  }
}

function setupFilters() {
  populateNetworkFilter();
  TS.SUBJECTS.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;   // דרך ה-DOM — הגרשיים של תנ"ך לא שוברות attribute
    document.getElementById('filter-subject').appendChild(opt);
  });
  ['filter-net','filter-sector','filter-subject','filter-search'].forEach(id => {
    document.getElementById(id).addEventListener('input', e => {
      if (id==='filter-net') filterNet = e.target.value;
      if (id==='filter-sector') filterSector = e.target.value;
      if (id==='filter-subject') filterSubject = e.target.value;
      renderList();
    });
  });
}
function populateNetworkFilter() {
  const sel = document.getElementById('filter-net');
  TS.NETWORKS.forEach(n => sel.insertAdjacentHTML('beforeend', `<option value="${n.id}">${n.name}</option>`));
}

function render() {
  // Training header
  if (training) {
    document.getElementById('train-subject').textContent = training.subject;
    document.getElementById('train-date').textContent = TS.formatDate(training.date);
    const audience = training.sector
      ? `<span class="sec-chip ${training.sector}">${TS.secById(training.sector).name}</span>`
      : `<span class="badge info">פתוחה לכל המגזרים</span>`;
    document.getElementById('train-net').innerHTML = audience;
    document.getElementById('train-loc').textContent = training.location || '';
  }
  renderList();
}

function renderList() {
  const search = (document.getElementById('filter-search').value || '').trim().toLowerCase();
  const list = teachers.filter(t => {
    if (search && !(t.name||'').toLowerCase().includes(search)) return false;
    if (filterNet && t.network !== filterNet) return false;
    if (filterSector && t.sector !== filterSector) return false;
    if (filterSubject && t.subject !== filterSubject) return false;
    return true;
  });
  document.getElementById('count').textContent = `${list.length} מורים`;

  const cont = document.getElementById('list');
  if (!list.length) {
    cont.innerHTML = `<div class="empty">אין מורים תואמים לסינון</div>`;
    return;
  }
  cont.innerHTML = list.map(t => {
    const status = attendance[t.id];
    return `
      <div class="att-row">
        <div class="att-info">
          <div class="att-name">${t.name}</div>
          <div class="att-meta">${t.subject} · ${TS.secChip(t.sector)} · ${TS.netChip(t.network)}</div>
        </div>
        <div class="att-actions">
          <button class="btn ${status==='present'?'btn-primary':'btn-secondary'}" data-id="${t.id}" data-status="present">נכח</button>
          <button class="btn ${status==='absent'?'btn-warn':'btn-secondary'}" data-id="${t.id}" data-status="absent">לא נכח</button>
        </div>
      </div>
    `;
  }).join('');
  cont.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id, status = btn.dataset.status;
      attendance[id] = attendance[id] === status ? undefined : status;
      renderList();
      renderSummary();
    });
  });
  renderSummary();
}

function renderSummary() {
  const present = Object.values(attendance).filter(v => v==='present').length;
  const absent = Object.values(attendance).filter(v => v==='absent').length;
  document.getElementById('sum-present').textContent = present;
  document.getElementById('sum-absent').textContent = absent;
}

function markAll(status) {
  teachers.forEach(t => attendance[t.id] = status);
  renderList();
}

async function saveAttendance() {
  const records = Object.entries(attendance)
    .filter(([_, status]) => status)
    .map(([teacherId, status]) => ({ teacherId, status, notes: notesById[teacherId] || '' }));

  if (!records.length) {
    TS.toast('לא סומנו מורים');
    return;
  }
  const res = await TS.apiPost('attendance.bulk', { trainingId, records });
  if (res.ok) {
    TS.toast(`נשמרו ${res.count} רישומים`);
    setTimeout(() => { window.location.href = './'; }, 1200);
  } else {
    TS.toast('שגיאה — ' + (res.error || ''));
  }
}
