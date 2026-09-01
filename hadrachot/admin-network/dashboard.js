// Network Admin Dashboard — מנהל/ת רשת
const networkId = TS.urlParam('network', '');
let data = null;

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('month-label').textContent = TS.monthLabel();
  const btn = document.getElementById('btn-send-report');
  if (btn) btn.addEventListener('click', sendReportToNetwork);
  await loadData();
});

async function loadData() {
  if (!TS.getAppsScriptUrl()) {
    data = demoData();
    document.getElementById('user-name').textContent = 'דמו';
    document.getElementById('user-network').textContent = 'רשת אורט';
    render();
    return;
  }
  const res = await TS.api('network.dashboard', { network: networkId });
  if (res.ok && res.data) {
    data = res.data;
    if (data.network) {
      document.getElementById('user-network').textContent = 'רשת ' + data.network.name;
      const tag = document.querySelector('.network-tag');
      if (tag) tag.innerHTML = `<span class="net-chip ${data.network.color}">${data.network.name}</span>`;
    }
    render();
  } else {
    data = demoData();
    render();
  }
}

function render() {
  if (!data) return;
  const s = data.summary || {};
  document.getElementById('stat-schools').textContent = s.schools || 0;
  document.getElementById('stat-teachers').textContent = s.teachers || 0;
  document.getElementById('stat-attendance').textContent = (s.avgRate || 0) + '%';
  document.getElementById('stat-attendance').className = 'stat-value ' +
    (s.avgRate >= 80 ? 'ok' : s.avgRate >= 50 ? 'warn' : 'err');

  const pdEl = document.getElementById('stat-pd');
  if (pdEl) pdEl.textContent = s.onTarget || 0;
  const missedEl = document.getElementById('stat-missed');
  if (missedEl) missedEl.textContent = s.atRisk || 0;

  // Sector breakdown — placeholder (אין לנו עדיין נתוני מגזר)
  ['sec-haredi','sec-arab','sec-kelali','sec-haredi-pct','sec-arab-pct','sec-kelali-pct'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });

  // Schools table
  const tbody = document.getElementById('schools-body');
  const schools = data.schoolBreakdown || [];
  if (!schools.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">אין בתי ספר עם נתונים ברשת</td></tr>`;
    return;
  }
  tbody.innerHTML = schools.map(s => `
    <tr>
      <td><strong>${escapeHtml(s.name)}</strong></td>
      <td>${s.teachers}</td>
      <td>${s.present}</td>
      <td><span class="badge ${s.rate >= 80 ? 'ok' : s.rate >= 50 ? 'warn' : 'err'}">${s.rate}%</span></td>
      <td>
        <a class="btn btn-secondary" href="../admin-school/?school=${encodeURIComponent(s.id)}&network=${encodeURIComponent(networkId)}">פתח</a>
      </td>
    </tr>
  `).join('');
}

function escapeHtml(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sendReportToNetwork() {
  if (!data || !data.network) return;
  const net = data.network;
  const s = data.summary || {};
  const subject = `דוח חודשי — רשת ${net.name} — ${TS.monthLabel()}`;
  const lines = [
    `שלום,`,
    ``,
    `מצורף דוח חודשי על הדרכות המורים ברשת ${net.name}.`,
    ``,
    `סיכום:`,
    `• בתי ספר עם מורים בהדרכה: ${s.schools}`,
    `• סה"כ מורים: ${s.teachers}`,
    `• אחוז נוכחות ממוצע: ${s.avgRate}%`,
    `• עומדים ביעד (80%+): ${s.onTarget}`,
    `• מורים בסיכון (מתחת ל-50%): ${s.atRisk}`,
    ``,
    `פירוט לפי בית ספר (מהחלש לחזק):`,
    ...(data.schoolBreakdown || []).slice(0, 15).map(sc =>
      `• ${sc.name}: ${sc.rate}% (${sc.teachers} מורים)`
    ),
    ``,
    `דשבורד מלא של הרשת:`,
    `${location.origin}${location.pathname}?network=${networkId}`,
    ``,
    `בברכה,`,
    `יחידת הפיקוח על הדרכות · משרד העבודה`
  ];
  const body = lines.join('\n');
  window.open(TS.gmailCompose({ to: net.contactEmail || '', subject, body }), '_blank');
}

function demoData() {
  return {
    network: { id: 'net_ort', name: 'אורט', color: 'ort', contactEmail: '' },
    filter: { subject: '', availableSubjects: ['מתמטיקה'] },
    summary: { schools: 6, teachers: 22, trainings: 6, attendanceRecords: 90, avgRate: 47, atRisk: 5, onTarget: 4 },
    schoolBreakdown: [
      { id: 'sch_005', name: 'אורט בית הערבה',      teachers: 3, present: 1, rate: 35 },
      { id: 'sch_006', name: 'אורט דן גורמה',       teachers: 2, present: 0, rate: 20 },
      { id: 'sch_007', name: 'אורט תל נוף',         teachers: 6, present: 4, rate: 78 },
      { id: 'sch_008', name: 'אורט תעשייה אווירית', teachers: 4, present: 2, rate: 55 },
      { id: 'sch_009', name: 'אורט אורמת יבנה',     teachers: 5, present: 3, rate: 60 }
    ]
  };
}
