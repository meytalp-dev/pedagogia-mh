// Teacher self-view
/* ==========================================================================
   הזיהוי (21.9.26) — שלושה מקורות, לפי סדר:
   1. `?id=` בכתובת — הקישורים שכבר הופצו ממשיכים לעבוד.
   2. זיכרון במכשיר (localStorage) — מהכניסה השנייה ואילך, בלי טופס.
   3. טופס הכניסה — בית ספר מרשימה סגורה, שם מרשימת בית הספר, ומייל.

   ⚠ אין כאן עדיין אימות במייל. המייל **מזהה ולא מאמת**, ולכן אסור להפיץ
   את הקישור לפני שנפרס האימות (קוד בן 6 ספרות). קביעת מיטל 21.9.26.
   ========================================================================== */
const LS_KEY = 'ts.teacher.v1';

function savedIdentity() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return (o && o.id) ? o : null;
  } catch (e) { return null; }   // דפדפן פרטי / אחסון חסום — פשוט טופס
}
function rememberIdentity(o) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) { /* לא חוסם כניסה */ }
}

let teacherId = TS.urlParam('id', '') || (savedIdentity() || {}).id || '';
let teacher = null;
let attendance = [];
let questions = [];

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('form-question').addEventListener('submit', submitQuestion);
  document.getElementById('btn-cert').addEventListener('click', requestCertificate);
  const exit = document.getElementById('tg-exit');
  if (exit) exit.addEventListener('click', () => {
    try { localStorage.removeItem(LS_KEY); } catch (e) { /* לא חוסם */ }
    location.href = location.pathname;      // בלי ?id= — חוזר לטופס
  });
  if (!teacherId) { await showGate(); return; }
  if (savedIdentity() && exit) exit.hidden = false;
  await load();
});

/* ---------------------- טופס הכניסה ---------------------- */
const $g = id => document.getElementById(id);
let gateTeachers = [];

function gateMsg(text, ok) {
  const el = $g('tg-msg');
  el.hidden = !text;
  el.textContent = text || '';
  el.className = 'tg-msg' + (ok ? ' ok' : '');
}

async function showGate() {
  $g('teacher-gate').hidden = false;
  $g('teacher-body').hidden = true;
  const res = await TS.api('schools.list', {});
  const list = (res && res.data ? res.data : [])
    .filter(s => s.name)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'he'));
  const sel = $g('tg-school');
  sel.innerHTML = '<option value="">בחרו בית ספר</option>' +
    list.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  sel.addEventListener('change', onGateSchool);
  $g('tg-enter').addEventListener('click', onGateEnter);
}

async function onGateSchool() {
  const id = $g('tg-school').value;
  const nameSel = $g('tg-name');
  gateTeachers = [];
  if (!id) {
    nameSel.disabled = true;
    nameSel.innerHTML = '<option value="">קודם בוחרים בית ספר</option>';
    return;
  }
  nameSel.disabled = true;
  nameSel.innerHTML = '<option value="">טוען…</option>';
  const res = await TS.api('teachers.list', { school: id });
  /* אותו אדם בבגרות ובגמר הוא שתי שורות ואדם אחד — מוצג פעם אחת,
     כמו בכל שאר המסכים. הכניסה נעשית לשורה הראשונה שלו. */
  const seen = {};
  gateTeachers = (res && res.data ? res.data : []).filter(t => {
    const k = String(t.name || '').trim();
    if (!k || seen[k]) return false;
    seen[k] = 1;
    return true;
  }).sort((a, b) => String(a.name).localeCompare(String(b.name), 'he'));
  nameSel.disabled = !gateTeachers.length;
  nameSel.innerHTML = gateTeachers.length
    ? '<option value="">בחרו את שמכם</option>' +
      gateTeachers.map(t => `<option value="${esc(t.id)}">${esc(t.name)}${t.subject ? ' · ' + esc(t.subject) : ''}</option>`).join('')
    : '<option value="">בבית הספר הזה עוד לא הוזנו מורים</option>';
  // מייל שכבר רשום במערכת — ממלאים מראש לאישור, לא מבקשים להקליד שוב
  nameSel.addEventListener('change', () => {
    const t = gateTeachers.find(x => String(x.id) === nameSel.value);
    const mail = $g('tg-email');
    if (t && t.email && String(t.email).indexOf('@') > 0 && !mail.value) mail.value = t.email;
  });
}

async function onGateEnter() {
  const btn = $g('tg-enter');
  const id = $g('tg-name').value;
  const email = String($g('tg-email').value || '').trim();
  if (!id) return gateMsg('בחרו את השם שלכם מהרשימה.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return gateMsg('כתובת המייל אינה תקינה.');

  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = 'נכנס…';
  const t = gateTeachers.find(x => String(x.id) === id) || {};
  // נשמר רק כשהוא חדש או שונה — כך נאספים המיילים החסרים בלי לדרוס קיימים
  if (String(t.email || '').trim().toLowerCase() !== email.toLowerCase()) {
    const r = await TS.apiPost('teachers.update', { id: id, email: email });
    if (!r || !r.ok) {
      btn.disabled = false; btn.textContent = label;
      return gateMsg('השמירה נכשלה — תקלה רגעית. נסו שוב בעוד רגע.');
    }
  }
  rememberIdentity({ id: id, name: t.name || '', at: new Date().toISOString() });
  teacherId = id;
  $g('teacher-gate').hidden = true;
  $g('teacher-body').hidden = false;
  const exit = $g('tg-exit');
  if (exit) exit.hidden = false;
  await load();
}

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

/* הנוכחות החדשה (21.9.26) — הדף קרא `attendance.teacher`, כלומר את מערכת
   הנוכחות הישנה, בעוד הנוכחות נרשמת ב-meetings/meeting_attendance. התוצאה:
   מורה שבאמת נכח ראה "0 הדרכות · 0% נוכחות" (נבדק על שיר כהן, עברית).
   זו אותה תקלה שתוקנה אצל המדריכה ב-18.9.
   כאן החישוב נעשה ב-assets/meet-stats.js — אותו מנוע כמו כל שאר המסכים,
   ולכן המורה רואה בדיוק את מה שרואים המדריכה, המנהל/ת והמפקח.ת.
   הנתונים מ-meet.scope?school=<id>: כל המפגשים (כדי לדעת מה התקיים) ורק
   שורות הנוכחות של בית הספר. אין צורך בשינוי שרת. */
let monthly = null;        // המשתתף/ת מתוך TS_meetStats — present · held · rate · חודשים
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Apps Script מטפל בבקשות של אותו משתמש **בטור**, ולכן כל קריאה נוספת
   מאריכה את ההמתנה של המורה. teacher.get קודם (בלעדיו אין school), ומיד
   אחריו הנוכחות — הכי חשובה למורה. השאלות נטענות אחרונות ולא חוסמות. */
async function load() {
  const teacherRes = await TS.api('teacher.get', { id: teacherId });
  teacher = teacherRes && teacherRes.data;
  // מורה שנמחק או אוחד — הזיהוי השמור כבר לא תקף, חוזרים לטופס
  if (!teacher) {
    try { localStorage.removeItem(LS_KEY); } catch (e) { /* לא חוסם */ }
    if (!TS.urlParam('id', '')) { teacherId = ''; await showGate(); return; }
  }
  render();
  await loadAttendance();
  const qRes = await TS.api('questions.list', { teacherId });
  questions = qRes.data || [];
  renderQuestions();
}

async function loadAttendance() {
  if (!teacher || !teacher.school) return;
  const res = await TS.api('meet.scope', { school: teacher.school }, { cache: 'no' });
  if (!res || !res.ok || !res.data) return;
  const d = res.data;
  const guides = Object.keys(window.TS_GUIDES || {})
    .map(k => Object.assign({ slug: k }, window.TS_GUIDES[k]));
  const hours = {};
  (d.hours || []).forEach(h => { (hours[h.guideSlug] = hours[h.guideSlug] || []).push(h); });
  const stats = window.TS_meetStats({
    today: d.today, meetings: d.meetings, rows: d.rows,
    teachers: [teacher], guides: guides, hours: hours
  });
  // המורה מופיע/ה בקבוצה של המדריכ/ה שלו/ה; בלי יח"ל — אצל שתיהן, ואז
  // נלקחת התמונה המלאה ביותר (אותו כלל כמו TS_meetRateChips).
  const mine = (stats.persons || []).filter(p => p.held > 0);
  const p = mine.sort((a, b) => b.held - a.held)[0] || (stats.persons || [])[0];
  if (!p) return;
  monthly = p;
  renderAttendance();
}

/* יחידת התצוגה היא חודש, כמו בכל המערכת: בכל חודש הדרכה אחת בשני מועדים,
   ונוכחות באחד מהם היא נוכחות מלאה. שעה פרטנית מספקת אף היא את החודש. */
function renderAttendance() {
  const set = (id, v, cls) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = v;
    if (cls !== undefined) el.className = 'cmd-metric-value ' + cls;
  };
  const tbody = document.getElementById('history-body');
  // "—" נראה כמו אפס. עד שהנוכחות מגיעה (Apps Script עונה בטור, כמה שניות)
  // מוצג חיווי טעינה מפורש — מורה שרואה אפס אחרי שהשתתף לא חוזר לדף.
  if (!monthly) {
    ['stat-total', 'stat-present', 'stat-missed', 'stat-rate'].forEach(id => set(id, '…', ''));
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="empty">טוען את הנוכחות שלך…</td></tr>';
    return;
  }
  set('stat-total', monthly.held);
  set('stat-present', monthly.present, 'mint');
  set('stat-missed', monthly.held - monthly.present, 'warn');
  const rate = monthly.rate;
  set('stat-rate', rate === null ? '—' : rate + '%',
    rate === null ? '' : rate >= 80 ? 'mint' : rate >= 60 ? 'warn' : 'err');

  if (!tbody) return;
  if (!monthly.held) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">עוד לא התקיימה הדרכה עם רישום נוכחות.</td></tr>';
    return;
  }
  const L = d => (window.TS_meetDateLabel ? window.TS_meetDateLabel(d) : d);
  const lbl = k => (window.TS_meetMonthLabel ? window.TS_meetMonthLabel(k) : k);
  const ind = new Set(monthly.individualMonths || []);
  const rows = (monthly.monthsAttended || []).map(k => ({ k: k, ok: true }))
    .concat((monthly.monthsMissed || []).map(k => ({ k: k, ok: false })))
    .sort((a, b) => b.k.localeCompare(a.k));
  tbody.innerHTML = rows.map(r => {
    const viaInd = r.ok && ind.has(r.k);
    return `
      <tr>
        <td><b>${esc(lbl(r.k))}</b></td>
        <td>${viaInd ? 'הדרכה פרטנית' : 'הדרכה חודשית'}</td>
        <td>${r.ok
          ? '<span class="badge ok">השתתפתי</span>'
          : '<span class="badge err">לא השתתפתי</span>'}</td>
      </tr>`;
  }).join('');
  const dates = (monthly.individualDates || []);
  if (dates.length) {
    tbody.innerHTML += `<tr><td colspan="3" class="empty" style="text-align:right;">
      הדרכה פרטנית השנה: ${dates.map(L).join(' · ')}</td></tr>`;
  }
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

  renderAttendance();

  // PD badge
  document.getElementById('pd-status').innerHTML = teacher.pdActive
    ? '<span class="badge ok">בהשתלמות פעילה</span>'
    : '<span class="badge neutral">לא בהשתלמות</span>';

  document.getElementById('moe-status').innerHTML = teacher.moeApproval
    ? '<span class="badge info">מודרך גם במשרד החינוך</span>'
    : '<span class="badge neutral">לא מודרך במשה"ח</span>';

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
