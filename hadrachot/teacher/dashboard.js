// Teacher self-view
const teacherId = TS.urlParam('id', '');
let teacher = null;
let attendance = [];
let questions = [];

document.addEventListener('DOMContentLoaded', async () => {
  await load();
  document.getElementById('form-question').addEventListener('submit', submitQuestion);
  document.getElementById('btn-cert').addEventListener('click', requestCertificate);
});

async function requestCertificate() {
  const btn = document.getElementById('btn-cert');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> מפיק...';

  const res = await TS.apiPost('certificate.generate', { teacherId });
  btn.disabled = false;
  btn.textContent = 'הפק תעודה';
  if (res.ok && res.data) {
    showCertResult(res.data);
  } else {
    TS.toast('שגיאה בהפקת התעודה');
  }
}

function showCertResult(data) {
  const box = document.getElementById('cert-result');
  box.hidden = false;
  if (data.eligible) {
    box.innerHTML = `
      <div style="display:flex; gap:12px; align-items:flex-start;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>
        <div style="flex:1;">
          <div style="font-weight:700; color:#15803d; margin-bottom:4px;">עמדת בדרישות התוכנית</div>
          <div style="font-size:14px; color:var(--text-2);">${data.rate}% נוכחות (${data.present} מתוך ${data.total} הדרכות) · יעד: ${data.target}%</div>
          <div class="btn-row" style="margin: 12px 0 0;">
            <a class="btn btn-primary" href="${data.pdfUrl}" target="_blank">הורדת PDF</a>
            <a class="btn btn-soft" href="${data.docUrl}" target="_blank">פתיחה ב-Docs</a>
          </div>
        </div>
      </div>`;
  } else {
    box.innerHTML = `
      <div style="display:flex; gap:12px; align-items:flex-start;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div style="flex:1;">
          <div style="font-weight:700; color:#92400e; margin-bottom:4px;">עוד לא עמדת ביעד</div>
          <div style="font-size:14px; color:var(--text-2);">${data.rate}% נוכחות (${data.present} מתוך ${data.total}) · יעד: ${data.target}%</div>
          <div style="font-size:13px; color:var(--text-3); margin-top:8px;">הצטרפי להדרכות הבאות כדי לעמוד ביעד והתעודה תופק אוטומטית.</div>
        </div>
      </div>`;
  }
}

async function load() {
  const [teacherRes, attRes, qRes] = await Promise.all([
    TS.api('teacher.get', { id: teacherId }),
    TS.api('attendance.teacher', { teacherId }),
    TS.api('questions.list', { teacherId })
  ]);
  teacher = teacherRes.data;
  attendance = attRes.data || [];
  questions = qRes.data || [];
  render();
}

function render() {
  if (!teacher) {
    document.querySelector('main').innerHTML = '<div class="empty">לא נמצאו פרטים. נסי לפתוח את הקישור ששלחה לך המנהלת שלך.</div>';
    return;
  }
  document.getElementById('user-name').textContent = teacher.name;
  document.getElementById('user-meta').textContent = teacher.subject;

  // Profile
  document.getElementById('p-subject').textContent = teacher.subject;
  document.getElementById('p-type').innerHTML = TS.typeChip(teacher.type);
  document.getElementById('p-sector').innerHTML = TS.secChip(teacher.sector);
  document.getElementById('p-seniority').textContent = (teacher.seniority || 0) + ' שנים';
  document.getElementById('p-units').textContent = teacher.units || '—';
  document.getElementById('p-students').textContent = teacher.students || '—';

  // Stats
  const total = attendance.length;
  const present = attendance.filter(a => a.status === 'present').length;
  const missed = attendance.filter(a => a.status === 'absent').length;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-present').textContent = present;
  document.getElementById('stat-missed').textContent = missed;
  const rate = total ? Math.round((present / total) * 100) : 0;
  document.getElementById('stat-rate').textContent = rate + '%';
  document.getElementById('stat-rate').className = 'stat-value ' + (rate >= 90 ? 'ok' : rate >= 70 ? 'warn' : 'err');

  // PD badge
  document.getElementById('pd-status').innerHTML = teacher.pdActive
    ? '<span class="badge ok">בהשתלמות פעילה</span>'
    : '<span class="badge neutral">לא בהשתלמות</span>';

  document.getElementById('moe-status').innerHTML = teacher.moeApproval
    ? '<span class="badge info">מודרך גם במשרד החינוך</span>'
    : '<span class="badge neutral">לא מודרך במשה"ח</span>';

  // Attendance history
  const tbody = document.getElementById('history-body');
  if (!attendance.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">אין רישומים עדיין</td></tr>';
  } else {
    tbody.innerHTML = attendance.map(a => {
      const tr = a.training || {};
      const status = a.status === 'present'
        ? '<span class="badge ok">נכחתי</span>'
        : '<span class="badge err">חסרתי</span>';
      return `
        <tr>
          <td>${TS.formatDate(tr.date || a.timestamp)}</td>
          <td>${tr.subject || '—'}</td>
          <td>${status}</td>
        </tr>`;
    }).join('');
  }

  // Questions
  renderQuestions();
}

function renderQuestions() {
  const cont = document.getElementById('questions-list');
  if (!questions.length) {
    cont.innerHTML = '<div class="empty" style="padding:24px;">עדיין לא שאלת שאלות. הטופס למטה ↓</div>';
    return;
  }
  cont.innerHTML = questions.slice().reverse().map(q => `
    <div class="card" style="margin-bottom:12px; padding: 16px;">
      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:8px;">
        <strong>שאלה</strong>
        <span class="badge ${q.status==='answered'?'ok':'warn'}">${q.status==='answered' ? 'נענתה' : 'בהמתנה'}</span>
      </div>
      <div style="margin-bottom:12px;">${q.question || ''}</div>
      ${q.answer ? `<div style="background:var(--info-soft); padding:12px; border-radius:8px;"><strong style="color:var(--info);">תשובה:</strong><br>${q.answer}</div>` : ''}
      <div style="margin-top:8px; font-size:12px; color:var(--text-3);">נשלחה ${TS.formatDate(q.createdAt)}</div>
    </div>
  `).join('');
}

async function submitQuestion(e) {
  e.preventDefault();
  const text = document.getElementById('q-text').value.trim();
  if (!text) return;

  const res = await TS.apiPost('questions.create', { teacherId, question: text });
  if (res.ok) {
    TS.toast('השאלה נשלחה למדריכה');
    document.getElementById('q-text').value = '';
    questions.push(res.data);
    renderQuestions();
  } else {
    TS.toast('שגיאה');
  }
}
