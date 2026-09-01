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
    setNetworkTitle();
    render();
    return;
  }
  const res = await TS.api('network.dashboard', { network: networkId });
  if (res.ok && res.data) {
    data = res.data;
    setNetworkTitle();
    render();
  } else {
    data = demoData();
    setNetworkTitle();
    render();
  }
  loadSectors();   // רץ ברקע — לא מעכב את שאר הדשבורד
}

// שם הרשת — בכותרת הראשית, בפינת המשתמש ובכותרת הטאב
function setNetworkTitle() {
  if (!data || !data.network) return;
  const name = 'רשת ' + data.network.name;
  const titleEl = document.getElementById('network-title');
  if (titleEl) titleEl.textContent = name;
  document.title = name + ' — מצפן ההדרכות';
  document.getElementById('user-network').textContent = name;
  const tag = document.querySelector('.network-tag');
  if (tag) tag.innerHTML = `<span class="net-chip ${data.network.color}">${escapeHtml(data.network.name)}</span>`;
}

// עוד לא נרשמה אף נוכחות → 0% אצל כולם הוא "אין נתונים", לא "כולם פספסו"
function noAttendanceYet() {
  return !((data && data.summary || {}).attendanceRecords > 0);
}

// פילוח מגזרים אמיתי — מרשימת המורים של הרשת
async function loadSectors() {
  const res = await TS.api('teachers.list', { network: 'net_' + networkId });
  if (!res.ok || !res.data) return;
  const counts = { haredi: 0, arab: 0, kelali: 0 };
  res.data.forEach(t => {
    counts[counts[t.sector] !== undefined ? t.sector : 'kelali']++;
  });
  const total = res.data.length || 1;
  [['haredi','sec-haredi'],['arab','sec-arab'],['kelali','sec-kelali']].forEach(([sec, id]) => {
    const el = document.getElementById(id);
    const pctEl = document.getElementById(id + '-pct');
    if (el) el.textContent = counts[sec];
    if (pctEl) pctEl.textContent = Math.round((counts[sec] / total) * 100) + '% מהמורים ברשת';
  });
}

function render() {
  if (!data) return;
  const s = data.summary || {};
  const noData = noAttendanceYet();
  document.getElementById('stat-schools').textContent = s.schools || 0;
  document.getElementById('stat-teachers').textContent = s.teachers || 0;

  const attEl = document.getElementById('stat-attendance');
  if (noData) {
    attEl.textContent = '—';
    attEl.className = 'stat-value info';
  } else {
    attEl.textContent = (s.avgRate || 0) + '%';
    attEl.className = 'stat-value ' + (s.avgRate >= 80 ? 'ok' : s.avgRate >= 50 ? 'warn' : 'err');
  }

  const pdEl = document.getElementById('stat-pd');
  if (pdEl) pdEl.textContent = s.onTarget || 0;
  const missedEl = document.getElementById('stat-missed');
  if (missedEl) missedEl.textContent = noData ? '—' : s.atRisk || 0;

  // גרף המגמה — יופיע כשיהיו רישומי נוכחות
  const trendEl = document.getElementById('trend-chart');
  if (trendEl) {
    trendEl.innerHTML = '<div class="empty">' + (noData
      ? 'מדידת הנוכחות טרם החלה — הגרף ייבנה מהצ\'ק-אינים הראשונים.'
      : 'נתוני המגמה מצטברים מחודש לחודש.') + '</div>';
  }

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
      <td>${noData ? '—' : s.present}</td>
      <td>${noData ? '<span class="badge neutral">—</span>' : `<span class="badge ${s.rate >= 80 ? 'ok' : s.rate >= 50 ? 'warn' : 'err'}">${s.rate}%</span>`}</td>
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
    ...(noAttendanceYet()
      ? [`• מדידת הנוכחות טרם החלה — נתוני נוכחות יופיעו בדוחות הבאים`]
      : [
          `• אחוז נוכחות ממוצע: ${s.avgRate}%`,
          `• עומדים ביעד (80%+): ${s.onTarget}`,
          `• מורים בסיכון (מתחת ל-50%): ${s.atRisk}`
        ]),
    ``,
    `פירוט לפי בית ספר${noAttendanceYet() ? '' : ' (מהחלש לחזק)'}:`,
    ...(data.schoolBreakdown || []).slice(0, 15).map(sc =>
      noAttendanceYet()
        ? `• ${sc.name}: ${sc.teachers} מורים`
        : `• ${sc.name}: ${sc.rate}% (${sc.teachers} מורים)`
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
