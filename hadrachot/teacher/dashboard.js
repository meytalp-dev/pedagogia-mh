// Teacher self-view
/* ==========================================================================
   הזיהוי (21.9.26) — שלושה מקורות, לפי סדר:
   1. `?id=` בכתובת — הקישורים שכבר הופצו ממשיכים לעבוד.
   2. זיכרון במכשיר (localStorage) — מהכניסה השנייה ואילך, בלי טופס.
   3. טופס הכניסה — בית ספר מרשימה סגורה, שם מרשימת בית הספר, ומייל.

   האימות (21.9.26): קוד בן 6 ספרות במייל → מפתח חתום. פרוס @37.

   "הבית של המורה" (אושר 22.9.26): הדף עבר מספירת נוכחות לליווי הדרכה —
   ההדרכה הבאה · המסע שלי השנה (חודש · נושא · מה לקחת לכיתה · סיכום) ·
   חומרים והודעות מהמדריכ/ה · ההדרכה הפרטנית שלי · שאלה למדריכ/ה.
   אין תעודה (החלטה 9, 22.9). הקרס הוא אחריותיות (החלטה 10): הנוכחות
   מדווחת למנהל/ת ולמפקח.ת, והערך למורה הוא לוודא שנרשמה נכון.
   הכול מתוכן שכבר קיים: meet.scope (מפגשים + סיכומים + שעות פרטניות),
   plans.js (התוכנית השנתית), guide.group (קבצים והודעות).
   **מקטע ריק לא מוצג.**
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

let teacherKey = (savedIdentity() || {}).k || '';
let teacherId = teacherKey ? (savedIdentity() || {}).id
  : (TS.urlParam('id', '') || (savedIdentity() || {}).id || '');
let teacher = null;
let attendance = [];
let questions = [];
let monthly = null;        // המשתתף/ת מתוך TS_meetStats — present · held · rate · חודשים
let scopeData = null;      // תשובת meet.scope — מפגשים (עם סיכומים), שורות, שעות פרטניות
let guideSlug = '';        // המדריכ/ה שהמורה נספר/ת אצלה
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('form-question').addEventListener('submit', submitQuestion);
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
  $g('tg-verify').addEventListener('click', onGateVerify);
  $g('tg-resend').addEventListener('click', onGateResend);
  $g('tg-code').addEventListener('keydown', e => { if (e.key === 'Enter') onGateVerify(); });
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
  const res = await TS.api('teachers.list', { school: id }, { cache: 'no' });
  // בינתיים נבחר בית ספר אחר — התשובה הזו כבר לא רלוונטית
  if ($g('tg-school').value !== id) return;
  /* אותו אדם בבגרות ובגמר הוא שתי שורות ואדם אחד — מוצג פעם אחת,
     כמו בכל שאר המסכים. הכניסה נעשית לשורה הראשונה שלו. */
  const seen = {};
  gateTeachers = (res && res.data ? res.data : []).filter(t => {
    // רק מורי בית הספר שנבחר — גם אם השרת או מטמון ישן החזירו יותר
    if (String(t.school || '') !== String(id)) return false;
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
  nameSel.onchange = () => {
    const t = gateTeachers.find(x => String(x.id) === nameSel.value);
    const mail = $g('tg-email');
    if (t && t.email && String(t.email).indexOf('@') > 0 && !mail.value) mail.value = t.email;
  };
}

/* שלב 1 — שליחת הקוד. המייל אינו נשמר כאן: הוא נשמר בשרת רק אחרי אימות
   מוצלח, כך שהכתובת שנאספת היא תמיד כזו שהוכחה גישה אליה. */
const GATE_ERRORS = {
  email_mismatch: 'המייל אינו תואם לכתובת הרשומה במערכת. פנו למדריכ/ה שלכם.',
  cooldown: 'נשלח קוד ממש עכשיו. המתינו דקה ונסו שוב.',
  quota: 'לא ניתן לשלוח קוד כרגע. נסו שוב מחר, או פנו למדריכ/ה שלכם.',
  not_found: 'לא נמצאה רשומה מתאימה. פנו למדריכ/ה שלכם.',
  expired: 'הקוד פג תוקף. בקשו קוד חדש.',
  wrong_code: 'הקוד שגוי. בדקו ונסו שוב.',
  too_many: 'יותר מדי ניסיונות. בקשו קוד חדש.',
  bad_input: 'הפרטים אינם תקינים.'
};
const gateErr = r => GATE_ERRORS[r && r.error] || 'תקלה רגעית. נסו שוב בעוד רגע.';

async function onGateEnter() {
  const btn = $g('tg-enter');
  const id = $g('tg-name').value;
  const email = String($g('tg-email').value || '').trim();
  if (!id) return gateMsg('בחרו את השם שלכם מהרשימה.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return gateMsg('כתובת המייל אינה תקינה.');

  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = 'שולח…';
  gateMsg('');
  const r = await TS.apiPost('teacher.codeSend', { id: id, email: email });
  btn.disabled = false;
  btn.textContent = label;
  if (!r || !r.ok) return gateMsg(gateErr(r));

  $g('tg-step2').hidden = false;
  ['tg-school', 'tg-name', 'tg-email'].forEach(x => { $g(x).disabled = true; });
  btn.hidden = true;
  gateMsg('שלחנו קוד בן 6 ספרות ל-' + email + '. הוא תקף ל-20 דקות.', true);
  $g('tg-code').focus();
}

// שלב 2 — אימות הקוד. רק כאן נפתחת הדלת.
async function onGateVerify() {
  const btn = $g('tg-verify');
  const id = $g('tg-name').value;
  const code = String($g('tg-code').value || '').replace(/\D/g, '');
  if (code.length !== 6) return gateMsg('הקוד הוא 6 ספרות.');
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = 'נכנס…';
  const r = await TS.apiPost('teacher.codeVerify', { id: id, code: code });
  if (!r || !r.ok) {
    btn.disabled = false; btn.textContent = label;
    return gateMsg(gateErr(r));
  }
  rememberIdentity({ k: r.data.key, id: r.data.id, name: r.data.name || '',
    at: new Date().toISOString() });
  teacherKey = r.data.key;
  teacherId = r.data.id;
  $g('teacher-gate').hidden = true;
  $g('teacher-body').hidden = false;
  const exit = $g('tg-exit');
  if (exit) exit.hidden = false;
  await load();
}

async function onGateResend() {
  $g('tg-step2').hidden = true;
  ['tg-school', 'tg-name', 'tg-email'].forEach(x => { $g(x).disabled = false; });
  $g('tg-enter').hidden = false;
  $g('tg-code').value = '';
  gateMsg('');
}

/* הנוכחות (21.9.26) — הדף קרא `attendance.teacher`, כלומר את מערכת הנוכחות
   הישנה, בעוד הנוכחות נרשמת ב-meetings/meeting_attendance. התוצאה: מורה
   שבאמת נכח ראה "0 הדרכות · 0% נוכחות" (נבדק על שיר כהן, עברית). זו אותה
   תקלה שתוקנה אצל המדריכה ב-18.9. החישוב כאן ב-assets/meet-stats.js —
   אותו מנוע כמו כל המסכים, ולכן המורה רואה בדיוק את מה שרואים המדריכה,
   המנהל/ת והמפקח.ת. הנתונים מ-meet.scope?school=; אין צורך בשינוי שרת. */
async function load() {
  /* מפתח חתום כשיש — הכתובת כבר לא חושפת מזהה שאפשר לנחש. teacher.get
     נשאר לקישורים הישנים שהופצו עם ?id=. */
  const teacherRes = teacherKey
    ? await TS.api('teacher.self', { k: teacherKey })
    : await TS.api('teacher.get', { id: teacherId });
  teacher = teacherRes && teacherRes.data;
  if (teacher && teacher.id) teacherId = teacher.id;
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
  scopeData = d;
  guideSlug = p.guideSlug;
  renderAttendance();
  renderHere(d, p.guideSlug);
  renderNext(d, p.guideSlug);
  renderIndividual(d, p.guideSlug);
  loadGroup(p.guideSlug);
}

/* ---------------------- עזרים לתוכן ההדרכות ---------------------- */
const normName = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const dateLbl = d => (window.TS_meetDateLabel ? window.TS_meetDateLabel(d) : d);
const monthLbl = k => (window.TS_meetMonthLabel ? window.TS_meetMonthLabel(k) : k);
function planMeetings(slug) {
  const plan = window.TS_planFor ? window.TS_planFor(slug) : null;
  return (plan && plan.meetings) ? plan.meetings : [];
}
function planDays(m) { return (m.dates && m.dates.length) ? m.dates : [m.date, m.date2].filter(Boolean); }
// הנושא של מועד: מה שנשמר בשרת, ואם אין — מהתוכנית השנתית (87/87 מפגשים עם נושא)
function planTopic(slug, date) {
  const m = planMeetings(slug).find(x => planDays(x).indexOf(date) >= 0);
  return m ? (m.topic || '') : '';
}
// המפגשים של המדריכ/ה בחודש נתון, כולל מה שהמדריכה כתבה בסיום ההדרכה
function monthInfo(k) {
  const out = { topics: [], takeaways: [], summaries: [] };
  if (!scopeData) return out;
  const push = (arr, v) => { v = String(v || '').trim(); if (v && arr.indexOf(v) < 0) arr.push(v); };
  (scopeData.meetings || [])
    .filter(m => String(m.guideSlug) === String(guideSlug) && String(m.date).slice(0, 7) === k)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach(m => {
      push(out.topics, m.topic || planTopic(guideSlug, String(m.date).slice(0, 10)));
      push(out.takeaways, m.takeaway);
      push(out.summaries, m.summary);
    });
  return out;
}
// השעות הפרטניות של המורה: meet.scope כבר מסנן לפי בית הספר, ולכן התאמה לפי שם
function myHours(scope, slug) {
  const me = normName(teacher && teacher.name);
  if (!me) return [];
  return (scope.hours || [])
    .filter(h => String(h.guideSlug) === String(slug) && normName((h.firstName || '') + ' ' + (h.lastName || '')) === me)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
const ICON_TAKE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>';
const ICON_FILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
const ICON_MSG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
const ICON_ONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 14.5-4 16 0"/></svg>';

/* ▸ ההדרכה הבאה — מהתוכנית השנתית של המדריכ/ה. מפגש בשני ימים נשאר "הבא"
   עד שעבר גם המועד השני; מדריכ/ה בשני מקצועות — רק מפגש של המקצוע שלי. */
function renderNext(scope, slug) {
  const sec = document.getElementById('next-sec');
  if (!sec) return;
  const today = String(scope.today || '').slice(0, 10);
  const mySubject = teacher && teacher.subject;
  const next = planMeetings(slug).find(m =>
    (m.date2 || m.date) >= today && (!m.subject || !mySubject || m.subject === mySubject));
  if (!next) return;                         // אין תוכנית — המקטע לא מוצב
  const days = planDays(next);
  const isToday = days.indexOf(today) >= 0;
  const first = days[0] || next.date;
  const dm = String(first).match(/^(\d{4})-(\d{2})-(\d{2})/);
  document.getElementById('next-day').textContent = dm ? Number(dm[3]) : '';
  document.getElementById('next-month').textContent = dm ? monthLbl(dm[1] + '-' + dm[2]).split(' ')[0] : '';
  document.getElementById('next-topic').textContent = next.topic || 'מפגש הדרכה';
  const meta = [];
  if (next.label) meta.push(next.label + (next.day ? ' · ' + next.day : ''));
  if (next.time) meta.push(next.time);
  if (next.note) meta.push(next.note);
  document.getElementById('next-meta').textContent = meta.join(' · ');
  const soon = document.getElementById('next-soon');
  const diff = Math.round((new Date(first) - new Date(today)) / 86400000);
  if (isToday) { soon.hidden = false; soon.textContent = 'היום! הכפתור "אני כאן" מופיע למטה בזמן ההדרכה'; }
  else if (diff > 0 && diff <= 7) { soon.hidden = false; soon.textContent = diff === 1 ? 'מחר' : 'בעוד ' + diff + ' ימים'; }
  sec.hidden = false;
}

/* ▸ ההדרכה הפרטנית שלי — הנושא של כל שעה (guide_hours.topic נכתב בשפע) */
function renderIndividual(scope, slug) {
  const sec = document.getElementById('ind-sec');
  const list = document.getElementById('ind-list');
  if (!sec || !list) return;
  const mine = myHours(scope, slug);
  if (!mine.length) return;
  list.innerHTML = mine.map(h => `
    <div class="h-item">${ICON_ONE}
      <div class="t"><b>${esc(dateLbl(h.date))}</b>${h.topic ? ' · ' + esc(h.topic) : ''}
        ${h.hours ? `<div class="d">${esc(h.hours)} ${Number(h.hours) === 1 ? 'שעה' : 'שעות'}</div>` : ''}</div>
    </div>`).join('');
  sec.hidden = false;
}

/* ▸ חומרים והודעות מהמדריכ/ה — guide.group, קיים ופתוח. אותם קבצים ואותן
   הודעות שהמדריכה שולחת לקבוצה (קבצי המפקח.ת מסוננים בשרת). */
async function loadGroup(slug) {
  if (!slug) return;
  let res = null;
  try { res = await TS.api('guide.group', { guide: slug }); } catch (e) { res = null; }
  if (!res || !res.ok || !res.data) return;
  renderGroup(res.data);
}
function renderGroup(g) {
  const files = (g.files || []).filter(f => f.fileName || f.fileUrl);
  const msgs = (g.messages || []).filter(m => String(m.text || '').trim());
  const when = iso => {
    const d = String(iso || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? dateLbl(d) : '';
  };
  if (files.length) {
    document.getElementById('mat-list').innerHTML = files.map(f => `
      <div class="h-item">${ICON_FILE}
        <div class="t">${f.fileUrl
          ? `<a href="${esc(f.fileUrl)}" target="_blank" rel="noopener">${esc(f.fileName || 'קובץ')}</a>`
          : esc(f.fileName)}${f.note ? `<div>${esc(f.note)}</div>` : ''}</div>
        <div class="d">${esc(when(f.createdAt))}</div>
      </div>`).join('');
    document.getElementById('mat-sec').hidden = false;
  }
  if (msgs.length) {
    document.getElementById('msg-list').innerHTML = msgs.map(m => `
      <div class="h-item">${ICON_MSG}
        <div class="t"><div class="msg">${esc(m.text)}</div>
          ${m.authorName ? `<div class="d">${esc(m.authorName)}</div>` : ''}</div>
        <div class="d">${esc(when(m.createdAt))}</div>
      </div>`).join('');
    document.getElementById('msg-sec').hidden = false;
  }
}

/* "אני כאן" — מוצג רק ביום שבו לקבוצה של המורה יש מועד הדרכה.
   האם הרישום באמת פתוח נקבע בשרת (meetOpenFor_), ולכן לחיצה ביום שבו
   המדריכה עוד לא פתחה מקבלת הודעה ברורה ולא כישלון סתום. */
function renderHere(scope, guideSlug) {
  const card = document.getElementById('th-card');
  if (!card || !guideSlug) return;
  const today = String(scope.today || '').slice(0, 10);
  const mine = (scope.meetings || []).filter(m =>
    String(m.guideSlug) === String(guideSlug) && String(m.date).slice(0, 10) === today);
  if (!mine.length) return;                 // אין הדרכה היום — הכרטיס לא מופיע

  // כבר סומן/נרשם במפגש הזה — מראים את המצב במקום כפתור
  const ids = new Set(mine.map(m => String(m.id)));
  const row = (scope.rows || []).find(r =>
    ids.has(String(r.meetingId)) && String(r.teacherId) === String(teacher.id));
  card.hidden = false;
  document.getElementById('th-when').textContent =
    'היום מתקיימת ההדרכה שלך' + (mine[0].topic ? ' · ' + mine[0].topic : '');
  if (row) return hereDone(row.status === 'present'
    ? 'הנוכחות שלך אושרה ✓'
    : row.status === 'pending' ? 'נרשמת — ממתין לאישור המדריכ/ה.'
    : 'המדריכ/ה סימנה אותך במפגש הזה.');

  const btn = document.getElementById('th-btn');
  // הרישום נפתח ע"י המדריכה; עד אז אומרים את זה מראש ולא נותנים ללחוץ לריק
  if (!mine.some(m => m.open)) {
    btn.disabled = true;
    const msg = document.getElementById('th-msg');
    msg.hidden = false;
    msg.className = 'th-msg';
    msg.textContent = 'הרישום ייפתח כשהמדריכ/ה תתחיל את ההדרכה. רעננו את הדף אז.';
    return;
  }
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = 'רושם…';
    const r = await TS.apiPost('teacher.here', { k: teacherKey, g: guideSlug });
    if (r && r.ok) {
      return hereDone(r.data.already
        ? 'כבר נרשמת להדרכה הזו.'
        : 'נרשמת ✓ ממתין לאישור המדריכ/ה.');
    }
    btn.disabled = false;
    btn.textContent = 'אני כאן ✓';
    const msg = document.getElementById('th-msg');
    msg.hidden = false;
    msg.className = 'th-msg err';
    msg.textContent = (r && r.error === 'closed')
      ? 'הרישום עדיין לא נפתח. המדריכ/ה פותחת אותו בתחילת ההדרכה.'
      : 'תקלה רגעית. נסו שוב בעוד רגע.';
  };
}

function hereDone(text) {
  const btn = document.getElementById('th-btn');
  if (btn) btn.hidden = true;
  const msg = document.getElementById('th-msg');
  if (!msg) return;
  msg.hidden = false;
  msg.className = 'th-msg ok';
  msg.textContent = text;
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
  const lbl = monthLbl;
  const ind = new Set(monthly.individualMonths || []);
  const group = new Set(monthly.groupMonths || []);
  const rows = (monthly.monthsAttended || []).map(k => ({ k: k, ok: true }))
    .concat((monthly.monthsMissed || []).map(k => ({ k: k, ok: false })))
    .sort((a, b) => b.k.localeCompare(a.k));
  const indHours = scopeData ? myHours(scopeData, guideSlug) : [];
  tbody.innerHTML = rows.map(r => {
    const viaInd = r.ok && ind.has(r.k);
    const info = monthInfo(r.k);
    // חודש שנמדד דרך שעה פרטנית בלבד — הנושא הוא של השעה
    let topic = info.topics.join(' · ');
    if (!group.has(r.k)) {
      const t = indHours.filter(h => String(h.date).slice(0, 7) === r.k && h.topic).map(h => h.topic);
      topic = 'הדרכה פרטנית' + (t.length ? ' · ' + t.join(' · ') : '');
    }
    const status = r.ok
      ? '<span class="badge ok">השתתפתי</span>' + (viaInd && group.has(r.k) ? ' <span class="badge info">גם פרטנית</span>' : '')
      : '<span class="badge err">לא השתתפתי</span>';
    const detail = (info.takeaways.length || info.summaries.length) ? `
      <tr class="jr-detail">
        <td colspan="3">
          ${info.takeaways.map(t => `<div class="jr-take">${ICON_TAKE}<div><b>מה לקחת לכיתה:</b> ${esc(t)}</div></div>`).join('')}
          ${info.summaries.map(t => `<details class="jr-sum"><summary>סיכום ונקודות חשובות מההדרכה</summary><p>${esc(t)}</p></details>`).join('')}
        </td>
      </tr>` : '';
    return `
      <tr>
        <td><b>${esc(lbl(r.k))}</b></td>
        <td class="jr-topic">${esc(topic || (group.has(r.k) ? 'הדרכה חודשית' : ''))}</td>
        <td>${status}</td>
      </tr>${detail}`;
  }).join('');
}

function render() {
  if (!teacher) {
    document.querySelector('main').innerHTML = '<div class="empty">לא נמצאו פרטים. נסי לפתוח את הקישור ששלחה לך המנהלת שלך.</div>';
    return;
  }
  document.getElementById('user-name').textContent = teacher.name;
  document.getElementById('user-meta').textContent = teacher.subject;
  const hello = document.getElementById('hello');
  if (hello) hello.textContent = 'שלום ' + String(teacher.name || '').trim().split(' ')[0];

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
