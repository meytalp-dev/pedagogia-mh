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

/* קישור עם ?id= של מורה אחר/ת גובר על הזיהוי השמור בדפדפן (24.9.26) —
   אחרת מי שנכנס/ה פעם אחת כמורה א׳ ופותח/ת קישור של מורה ב׳ רואה שוב את א׳. */
const urlTeacherId_ = TS.urlParam('id', '');
const savedForOther_ = urlTeacherId_ && String((savedIdentity() || {}).id || '') !== urlTeacherId_;
/* צפייה של מטה (24.9.26): teacher/?ak=<מפתח> — הקישור נבנה בלוח המבטים בדף הבית
   (staff.teacherKey, רק למטה · אדמין). לא נשמר במכשיר, לא נוגע בזיהוי השמור,
   ו"המחברת שלי" לא נפתחת — היא פרטית למורה. */
const ADMIN_KEY_ = /^[a-f0-9]{24}$/.test(TS.urlParam('ak', '')) ? TS.urlParam('ak', '') : '';
/* קישור אישי מהמייל (28.9.26): teacher/?tk=<מפתח> — התזכורת והמיילים מהמדריכ/ה
   נשלחים לתיבה של המורה, ולכן הקישור בהם הוא הכניסה עצמה. נשמר במכשיר כמו כניסה בקוד. */
const MAIL_KEY_ = !ADMIN_KEY_ && /^[a-f0-9]{24}$/.test(TS.urlParam('tk', '')) ? TS.urlParam('tk', '') : '';
let teacherKey = ADMIN_KEY_ || MAIL_KEY_ || (savedForOther_ ? '' : ((savedIdentity() || {}).k || ''));
let teacherId = (ADMIN_KEY_ || MAIL_KEY_) ? '' : teacherKey ? (savedIdentity() || {}).id
  : (urlTeacherId_ || (savedIdentity() || {}).id || '');
let teacher = null;

/* ▸ רישום אחד (29.9.26, מיטל): הקישור שהמדריכ/ה מדביק/ה בצ'אט הוא mifgash/?g=<slug>.
   מי שעוד לא נרשם/ה מגיע/ה לכאן עם ?next=mifgash&g=<slug> — עובר/ת רישום מלא
   (מייל + קוד + השתלמות + יח"ל) ואז חוזר/ת לבד לרישום הנוכחות. */
const NEXT_MIFGASH_ = TS.urlParam('next', '') === 'mifgash' && /^[a-z0-9_-]{1,40}$/i.test(TS.urlParam('g', ''))
  ? TS.urlParam('g', '') : '';

/* ▸ הדמיה של רישום הנוכחות (24.9.26): teacher/?demo=1
   מורה לדוגמה, "היום" יש הדרכה והרישום פתוח. הקוד הנכון בהדמיה: 1234.
   שום בקשה לא יוצאת לשרת — TS.api/TS.apiPost מוחלפים בתשובות מקומיות. */
const DEMO_ = TS.urlParam('demo', '') === '1';
if (DEMO_) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  const mid = 'mt_moria_' + today.replace(/-/g, '');
  const SELF = { id: 'demo_t', name: 'מורה לדוגמה', subject: 'עברית', type: 'bagrut', sector: 'kelali',
    school: 'demo_s', schoolName: 'בית ספר לדוגמה',
    // ?demo=1&tq=1 — הדגמת שאלת ההשתלמות (28.9.26); &subj=מתמטיקה להערת המפמ"ר
    // &tq=2 — התזכורת בכניסה חוזרת: ענה/תה "עברתי" ועוד לא צירף/ה אישור
    trainingStatus: TS.urlParam('tq', '') === '1' ? '' : 'passed',
    trainingFile: /^[12]$/.test(TS.urlParam('tq', '')) ? '' : '#' };
  if (TS.urlParam('subj', '')) SELF.subject = TS.urlParam('subj', '');
  const SCOPE = { today: today, rows: [
      { meetingId: 'mt_moria_20260915', guideSlug: 'moria', date: '2026-09-15', teacherId: 'demo_t', status: 'present' }],
    hours: [], meetings: [
    { id: 'mt_moria_20260915', guideSlug: 'moria', guideName: 'מוריה פלינט', date: '2026-09-15', topic: 'מפגש פתיחת שנה',
      open: false, openUntil: 0, summary: '', takeaway: 'לפתוח כל שיעור בכתיבה חופשית של 5 דקות', hours: 0,
      counts: { present: 1, absent: 0, pending: 0, gaps: 0, zoom: 0 } },
    { id: mid, guideSlug: 'moria', guideName: 'מוריה פלינט', date: today, topic: 'אסטרטגיות לטקסטים ארוכים',
      open: true, openUntil: Date.now() + 3 * 3600e3, summary: '', takeaway: '', hours: 0,
      counts: { present: 0, absent: 0, pending: 0, gaps: 0, zoom: 0 } }] };
  // בתוכנית של מוריה נוסף מועד "היום", כדי שתופיע גם השורה עם הכפתור ליד התאריך
  const planFor = window.TS_planFor;
  window.TS_planFor = slug => {
    const plan = planFor ? planFor(slug) : null;
    if (slug !== 'moria' || !plan) return plan;
    const parts = today.split('-');
    const dm = Number(parts[2]) + '.' + Number(parts[1]);
    return Object.assign({}, plan, { meetings: [{ date: today, dates: [today], topic: 'אסטרטגיות לטקסטים ארוכים',
      goal: '70% חיצוני (' + dm + ' בשעה 16:00): טקסטים ארוכים · 30% פנימי (' + dm + ' בשעה 17:00): תהליך הכתיבה' }]
      .concat((plan.meetings || []).filter(x => (x.date2 || x.date) > today)) });
  };
  const DEMO_NOTES = [{ id: 'demo_n1', date: '2026-09-15', meetingTopic: 'מפגש פתיחת שנה', title: 'שלושה דברים לזכור',
    text: 'לפתוח כל שיעור בכתיבה חופשית של 5 דקות.\nלבדוק את מפרט ההיבחנות החדש.\nלשתף את הצוות במצגת.',
    files: [], updatedAt: '2026-09-15T18:00:00' }];
  const reply = data => Promise.resolve({ ok: true, data: data });
  TS.api = (action) => {
    if (action === 'teacher.self' || action === 'teacher.get') return reply(SELF);
    if (action === 'meet.scope') return reply(SCOPE);
    if (action === 'notes.list') return reply(JSON.parse(JSON.stringify(DEMO_NOTES)));
    if (action === 'guide.group') return reply({ files: [], messages: [
      { authorName: 'מוריה פלינט', text: 'בהדמיה: כאן מופיעות הודעות מהמדריכה.', createdAt: new Date().toISOString() }] });
    return reply([]);
  };
  TS.apiPost = (action, body) => new Promise(res => setTimeout(() => {
    if (action === 'notes.save') {
      const n = Object.assign({ id: body.id || 'demo_n' + Date.now(), files: [] }, DEMO_NOTES.find(x => x.id === body.id) || {},
        { date: body.date, meetingTopic: body.meetingTopic, title: body.title, text: body.text, updatedAt: new Date().toISOString() });
      const i = DEMO_NOTES.findIndex(x => x.id === n.id); if (i >= 0) DEMO_NOTES[i] = n; else DEMO_NOTES.unshift(n);
      return res({ ok: true, data: JSON.parse(JSON.stringify(n)) });
    }
    if (action === 'notes.file') {
      const f = { fileId: 'demo_f' + Date.now(), name: body.fileName, url: '#', mimeType: body.mimeType, size: 0 };
      const n = DEMO_NOTES.find(x => x.id === body.noteId); if (n) n.files.push(f);
      return res({ ok: true, data: f });
    }
    if (action === 'notes.delete' || action === 'notes.fileDelete') return res({ ok: true, data: {} });
    if (action === 'teacher.training') return res({ ok: true, data: { trainingStatus: body.status || SELF.trainingStatus,
      unitsSelf: body.units || SELF.unitsSelf || '',
      trainingFile: body.data ? '#' : '', trainingFileName: body.fileName || '', trainingAt: new Date().toISOString() } });
    if (action === 'checkin.submit') {
      res(String(body.code) === '1234' ? { ok: true, data: { duplicate: false } } : { ok: false, error: 'bad_code' });
    } else res({ ok: false, error: 'demo' });
  }, 700));
  teacherKey = ''; teacherId = 'demo_t';
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.className = 'demo-bar';
    bar.innerHTML = '<b>הדמיה</b> — מורה לדוגמה, היום יש הדרכה והרישום פתוח. הקוד שהמדריכה "מציגה במפגש": <b dir="ltr">1234</b>. אפשר לנסות גם קוד שגוי. שום דבר לא נשמר.';
    document.body.insertBefore(bar, document.body.firstChild);
  });
}
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
    location.href = location.pathname +     // בלי ?id= — חוזר לטופס
      (NEXT_MIFGASH_ ? '?next=mifgash&g=' + encodeURIComponent(NEXT_MIFGASH_) : '');
  });
  /* כל כניסה בלי מפתח חתום עוברת בהרשמה (24.9.26, החלטת מיטל): המורה מקליד/ה מייל
     ומאמת/ת בקוד, וכך המייל נאסף לכרטיס. קישור ישן עם ?id= רק ממלא מראש את הטופס. */
  if (!teacherKey && !DEMO_) { await showGate(urlTeacherId_ || teacherId); return; }
  if (savedIdentity() && exit && !DEMO_ && !ADMIN_KEY_) exit.hidden = false;
  if (ADMIN_KEY_) {
    const bar = document.createElement('div');
    bar.className = 'demo-bar';
    bar.innerHTML = '<b>צפייה של מטה</b> — כך המורה רואה את הדף. "המחברת שלי" פרטית למורה ולא מוצגת. ' +
      '<a href="../" style="color:inherit;font-weight:700">חזרה ללוח המבטים</a>';
    document.body.insertBefore(bar, document.body.firstChild);
    // מטה לא רושמת נוכחות בשם המורה
    const st = document.createElement('style');
    st.textContent = '#th-card, .ns-btn, .th-notes { display: none !important; }';
    document.head.appendChild(st);
  }
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

async function showGate(prefillId) {
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
  ['tg-school', 'tg-subject', 'tg-name'].forEach(x => $g(x).addEventListener('change', updateHelpLink));
  if ($g('tg-newname')) $g('tg-newname').addEventListener('input', () => { resetPick(); showFix(false); });
  if ($g('tg-fix-link')) $g('tg-fix-link').addEventListener('click', () => showFix(true, ''));
  updateHelpLink();
  if (prefillId) await prefillGate(prefillId);
}

/* קישור ישן עם ?id= — בוחרים מראש בית ספר, מקצוע ושם; המייל והקוד עדיין נדרשים */
async function prefillGate(id) {
  let t = null;
  try { const r = await TS.api('teacher.get', { id: id }, { cache: 'no' }); t = r && r.data; } catch (e) { t = null; }
  if (!t || !t.school) return;
  $g('tg-school').value = t.school;
  await onGateSchool();
  if (t.subject) { $g('tg-subject').value = String(t.subject).trim(); onGateSubject(); }
  const opt = [...$g('tg-name').options].find(o => o.textContent.trim() === String(t.name || '').trim());
  if (opt) $g('tg-name').value = opt.value;
  updateHelpLink();
}

/* "שאלה או קושי?" — וואטסאפ למיטל, עם הפרטים שכבר נבחרו (כמו בכל טפסי משרד העבודה) */
function updateHelpLink() {
  const a = $g('tg-help');
  if (!a) return;
  const txt = sel => { const el = $g(sel); return el && el.value ? el.options[el.selectedIndex].textContent.trim() : ''; };
  const who = [txt('tg-name'), txt('tg-school'), txt('tg-subject')].filter(Boolean).join(' · ');
  const msg = 'שלום, יש לי שאלה או קושי בהרשמה למבט המורה של מנור.' + (who ? ' ' + who + '.' : '') + ' תיאור:';
  a.href = 'https://wa.me/972536256653?text=' + encodeURIComponent(msg);
}

function gateStep(n) {
  [1, 2, 3, 4].forEach(i => {
    const li = $g('tg-st' + i);
    if (li) { li.classList.toggle('on', i === n); li.classList.toggle('done', i < n); }
  });
}

/* סינון מקצוע (24.9.26): בבית ספר גדול רשימת השמות הייתה ארוכה מדי.
   בוחרים בית ספר → מקצוע → שם. מורה שמלמד/ת שני מקצועות מופיע/ה בשניהם. */
let gateSchoolRows = [];
let gateAllRows = [];       // כל המורים בכל בתי הספר — בשביל "מקצוע אחר"
let gatePendingId = '';     // המזהה שהשרת החזיר בשליחת הקוד (גם למורה חדש/ה)
let gateChangeEmail = false;
const NEW_NAME_ = '__new';
/* "האם זה/זו את/ה?" (29.9.26): לפני שנוצר כרטיס חדש מחפשים שם דומה בבית הספר.
   gatePick — כרטיס קיים שנבחר (אותו מקצוע) · gatePickName — אותו אדם במקצוע אחר:
   כרטיס חדש במקצוע שנבחר, בכתיב שכבר רשום (כך השם אחיד בכל המערכת). */
let gatePick = null;
let gatePickName = '';
let gateNewConfirmed = false;
function resetPick() {
  gatePick = null; gatePickName = ''; gateNewConfirmed = false;
  const box = $g('tg-sugg'); if (box) { box.hidden = true; box.innerHTML = ''; }
}
function showFix(on, prefill) {
  const f = $g('tg-fix'), l = $g('tg-fix-link');
  if (!f) return;
  f.hidden = !on;
  if (l) l.hidden = on || !$g('tg-name').value || $g('tg-name').value === NEW_NAME_;
  if (on && prefill != null) $g('tg-namefix').value = prefill;
  if (!on) $g('tg-namefix').value = '';
}

async function onGateSchool() {
  const id = $g('tg-school').value;
  const subjSel = $g('tg-subject');
  const nameSel = $g('tg-name');
  gateTeachers = []; gateSchoolRows = [];
  resetPick(); showNewName(false);
  nameSel.disabled = true;
  nameSel.innerHTML = '<option value="">קודם בוחרים מקצוע</option>';
  if (!id) {
    subjSel.disabled = true;
    subjSel.innerHTML = '<option value="">קודם בוחרים בית ספר</option>';
    return;
  }
  subjSel.disabled = true;
  subjSel.innerHTML = '<option value="">טוען את המקצועות…</option>';
  /* רק בית הספר שנבחר (30.9.26): ניסיון לטעון מראש את כל בתי הספר (teachers.roster,
     91KB) היה איטי יותר — גוגל מעבירה תשובה גדולה ב-5–38 שניות ולפעמים בדף שגיאה,
     ורשימה של בית ספר אחד חוזרת בכ-2 שניות */
  const res = await TS.api('teachers.list', { school: id });
  // בינתיים נבחר בית ספר אחר — התשובה הזו כבר לא רלוונטית
  if ($g('tg-school').value !== id) return;
  /* תקלה בטעינה (24.9.26): עד היום תשובה שנכשלה הוצגה כ"בבית הספר הזה עוד לא
     הוזנו מורים" — מטעה. עכשיו: הודעה ברורה וכפתור לניסיון חוזר. */
  if (!res || !res.ok) {
    subjSel.innerHTML = '<option value="">הטעינה נכשלה — נסו שוב</option>';
    gateMsg('הרשימה לא נטענה (השרת עמוס). לחצו "ניסיון חוזר" או בחרו שוב את בית הספר.');
    const m = $g('tg-msg');
    const retry = document.createElement('button');
    retry.type = 'button'; retry.className = 'tg-retry'; retry.textContent = 'ניסיון חוזר';
    retry.onclick = () => { gateMsg(''); onGateSchool(); };
    m.appendChild(document.createTextNode(' ')); m.appendChild(retry);
    return;
  }
  gateMsg('');
  gateAllRows = (res && res.data ? res.data : []);
  // רק מורי בית הספר שנבחר — גם אם השרת או מטמון ישן החזירו יותר
  gateSchoolRows = gateAllRows.filter(t =>
    String(t.school || '') === String(id) && String(t.name || '').trim());
  const subjects = [...new Set(gateSchoolRows.map(t => String(t.subject || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'he'));
  /* מורה חדש/ה (29.9.26) יכול/ה ללמד מקצוע שעוד אין לו מורים בבית הספר —
     שאר המקצועות מופיעים בקבוצה נפרדת, באותו כתיב כמו בכל המערכת */
  const others = [...new Set(gateAllRows.map(t => String(t.subject || '').trim()).filter(Boolean))]
    .filter(x => subjects.indexOf(x) < 0).sort((a, b) => a.localeCompare(b, 'he'));
  subjSel.disabled = false;
  subjSel.innerHTML = '<option value="">בחרו מקצוע</option>' +
    subjects.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('') +
    (others.length ? '<optgroup label="מקצוע אחר">' +
      others.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('') + '</optgroup>' : '');
  subjSel.onchange = onGateSubject;
  if (subjects.length === 1) { subjSel.value = subjects[0]; onGateSubject(); }
}

function onGateSubject() {
  const subj = $g('tg-subject').value;
  const nameSel = $g('tg-name');
  showNewName(false);
  resetPick(); showFix(false);
  if (!subj) {
    gateTeachers = [];
    nameSel.disabled = true;
    nameSel.innerHTML = '<option value="">קודם בוחרים מקצוע</option>';
    return;
  }
  /* אותו אדם בבגרות ובגמר הוא שתי שורות ואדם אחד — מוצג פעם אחת.
     הכניסה נעשית לשורה הראשונה שלו. */
  const seen = {};
  gateTeachers = gateSchoolRows.filter(t => {
    if (String(t.subject || '').trim() !== subj) return false;
    const k = String(t.name || '').trim();
    if (seen[k]) return false;
    seen[k] = 1;
    return true;
  }).sort((a, b) => String(a.name).localeCompare(String(b.name), 'he'));
  nameSel.disabled = false;
  nameSel.innerHTML = '<option value="">' + (gateTeachers.length ? 'בחרו את שמכם' : 'אין עוד מורים במקצוע הזה') + '</option>' +
    gateTeachers.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('') +
    `<option value="${NEW_NAME_}">השם שלי לא ברשימה — הוספה</option>`;
  // מייל שכבר רשום במערכת — ממלאים מראש לאישור, לא מבקשים להקליד שוב.
  // מחליפים שם → המייל שמולא אוטומטית מתחלף (או מתרוקן); מייל שהוקלד ביד נשאר.
  nameSel.onchange = () => {
    showNewName(nameSel.value === NEW_NAME_);
    gateChangeEmail = false;
    resetPick(); showFix(false);
    const t = gateTeachers.find(x => String(x.id) === nameSel.value);
    const mail = $g('tg-email');
    const auto = mail.dataset.auto || '';
    if (mail.value && mail.value !== auto) return;
    const next = t && t.email && String(t.email).indexOf('@') > 0 ? String(t.email) : '';
    mail.value = next;
    mail.dataset.auto = next;
  };
}

/* שלב 1 — שליחת הקוד. המייל אינו נשמר כאן: הוא נשמר בשרת רק אחרי אימות
   מוצלח, כך שהכתובת שנאספת היא תמיד כזו שהוכחה גישה אליה. */
const GATE_ERRORS = {
  email_mismatch: 'המייל אינו תואם לכתובת הרשומה במערכת.',
  cooldown: 'נשלח קוד ממש עכשיו. המתינו דקה ונסו שוב.',
  quota: 'לא ניתן לשלוח קוד כרגע. נסו שוב מחר, או פנו למדריכ/ה שלכם.',
  not_found: 'לא נמצאה רשומה מתאימה. פנו למדריכ/ה שלכם.',
  expired: 'הקוד פג תוקף. בקשו קוד חדש.',
  wrong_code: 'הקוד שגוי. בדקו ונסו שוב.',
  too_many: 'יותר מדי ניסיונות. בקשו קוד חדש.',
  bad_input: 'הפרטים אינם תקינים.',
  /* הודעות ברורות במקום "תקלה רגעית" (29.9.26) */
  busy: 'המערכת עמוסה כרגע — הרבה מורים נרשמים יחד. נסו שוב בעוד דקה.',
  busy_try_again: 'המערכת עמוסה כרגע — הרבה מורים נרשמים יחד. נסו שוב בעוד דקה.',
  timeout: 'השרת לא הספיק לענות. נסו שוב בעוד דקה.',
  bad_response: 'החיבור לשרת נקטע באמצע. נסו שוב בעוד דקה.'
};
const gateErr = (r, sending) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב.';
  }
  const e = String((r && r.error) || '');
  // בשליחת קוד ייתכן שהקוד יצא לפני שהחיבור נקטע
  if (sending && (e === 'timeout' || e === 'bad_response')) {
    return 'החיבור לשרת נקטע באמצע. ייתכן שהקוד כבר נשלח — בדקו את המייל (גם בספאם). אם לא הגיע, נסו שוב בעוד דקה.';
  }
  if (GATE_ERRORS[e]) return GATE_ERRORS[e];
  if (/Failed to fetch|NetworkError|Load failed|network/i.test(e)) {
    return 'החיבור לשרת נכשל. בדקו את החיבור לאינטרנט ונסו שוב.';
  }
  // מכסת המיילים של גוגל נגמרה (חריגה בשרת, לא quota שלנו)
  if (/too many times|Service invoked/i.test(e)) return GATE_ERRORS.quota;
  return 'תקלה רגעית. נסו שוב בעוד רגע.';
};

function showNewName(on) {
  const box = $g('tg-new');
  if (!box) return;
  box.hidden = !on;
  if (on) setTimeout(() => $g('tg-newname').focus(), 0);
}

function renderSuggestions(list, typed) {
  const box = $g('tg-sugg');
  const subj = $g('tg-subject').value;
  box.innerHTML = '<h4>מצאנו שמות דומים בבית הספר. האם זה/זו את/ה?</h4>' +
    list.map((x, i) => '<button type="button" data-i="' + i + '"><div><b>' + esc(x.row.name) + '</b>' +
      '<small>' + esc(x.row.subject || '') + (String(x.row.subject || '').trim() !== subj ? ' · נוסיף גם ' + esc(subj) : '') +
      '</small></div><span>כן, זה/זו אני</span></button>').join('') +
    '<button type="button" class="none" data-i="-1">אף אחד מאלה — להוסיף אותי כחדש/ה</button>';
  box.hidden = false;
  gateMsg('');
  box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.i);
    box.hidden = true;
    if (i < 0) { gateNewConfirmed = true; return onGateEnter(); }
    const c = list[i].row;
    if (String(c.subject || '').trim() === subj) gatePick = c;
    else gatePickName = String(c.name).trim();
    // הכתיב שהמורה הקליד/ה — מוצע כתיקון (לא משנה מיד, עובר לאישור)
    const differs = typed.replace(/\s+/g, ' ').trim() !== String(c.name).replace(/\s+/g, ' ').trim();
    showFix(differs, differs ? typed : '');
    gateMsg('נבחר/ה: ' + c.name + '. אם השם כתוב אחרת — תקנו בשדה "איך השם שלך נכתב נכון", ולחצו "שליחת קוד למייל".', true);
  }));
}

async function onGateEnter() {
  const btn = $g('tg-enter');
  const id = $g('tg-name').value;
  const isNew = id === NEW_NAME_;
  const newName = String(($g('tg-newname') || {}).value || '').replace(/\s+/g, ' ').trim();
  const email = String($g('tg-email').value || '').trim();
  if (!id) return gateMsg('בחרו את השם שלכם מהרשימה — או "השם שלי לא ברשימה".');
  if (isNew && newName.split(' ').length < 2) { $g('tg-newname').focus(); return gateMsg('כתבו שם פרטי ושם משפחה.'); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return gateMsg('כתובת המייל אינה תקינה.');
  // מורה "חדש/ה" — קודם בודקים אם זה/זו בעצם מישהו/י שכבר ברשימה בכתיב אחר
  if (isNew && !gatePick && !gatePickName && !gateNewConfirmed && window.TS_nameMatch) {
    const list = TS_nameMatch.suggest(newName, gateSchoolRows, { min: 0.75, max: 4 });
    if (list.length) return renderSuggestions(list, newName);
  }

  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = 'שולח… (עד דקה — אנא המתינו)';
  gateMsg('');
  const body = gatePick ? { id: String(gatePick.id), email: email }
    : isNew ? { newName: gatePickName || newName, school: $g('tg-school').value, subject: $g('tg-subject').value, email: email }
    : { id: id, email: email };
  if (gateChangeEmail) body.changeEmail = '1';
  const fix = String(($g('tg-namefix') || {}).value || '').replace(/\s+/g, ' ').trim();
  if (!$g('tg-fix').hidden && fix.length >= 3) body.nameFix = fix;
  const r = await TS.apiPost('teacher.codeSend', body);
  btn.disabled = false;
  btn.textContent = label;
  if (!r || !r.ok) {
    /* מייל שונה מהרשום (29.9.26): כנראה הכתובת אצלנו ישנה — מציעים לעדכן */
    if (r && r.error === 'email_mismatch') return offerEmailChange(r.data && r.data.hint);
    return gateMsg(gateErr(r, true));
  }
  gatePendingId = String((r.data && r.data.id) || (gatePick ? gatePick.id : isNew ? '' : id));

  $g('tg-step2').hidden = false;
  gateStep(2);
  ['tg-school', 'tg-subject', 'tg-name', 'tg-email', 'tg-newname', 'tg-namefix'].forEach(x => { if ($g(x)) $g(x).disabled = true; });
  if ($g('tg-fix-link')) $g('tg-fix-link').hidden = true;
  btn.hidden = true;
  gateMsg('שלחנו קוד בן 6 ספרות ל-' + email + '. הוא תקף ל-20 דקות.' +
    (gateChangeEmail ? ' אחרי האימות זו תהיה הכתובת שלך במערכת.' : ''), true);
  $g('tg-code').focus();
}

function offerEmailChange(hint) {
  gateMsg('המייל שרשום אצלנו שונה' + (hint ? ' (' + hint + ')' : '') + '. ' +
    'אם יש לך גישה אליו — כתבו אותו. אם המייל שלך השתנה, אפשר לעדכן:');
  const m = $g('tg-msg');
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tg-change';
  b.textContent = 'המייל שלי השתנה — שליחת קוד לכתובת שכתבתי';
  b.onclick = () => { gateChangeEmail = true; onGateEnter(); };
  m.appendChild(b);
}

// שלב 2 — אימות הקוד. רק כאן נפתחת הדלת.
async function onGateVerify() {
  const btn = $g('tg-verify');
  const id = gatePendingId || $g('tg-name').value;
  const code = String($g('tg-code').value || '').replace(/\D/g, '');
  if (code.length !== 6) return gateMsg('הקוד הוא 6 ספרות.');
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = 'נכנס… (עד דקה או שתיים — אנא המתינו)';
  const r = await TS.apiPost('teacher.codeVerify', { id: id, code: code });
  if (!r || !r.ok) {
    btn.disabled = false; btn.textContent = label;
    return gateMsg(gateErr(r));
  }
  rememberIdentity({ k: r.data.key, id: r.data.id, name: r.data.name || '',
    school: $g('tg-school').value || '', at: new Date().toISOString() });
  teacherKey = r.data.key;
  teacherId = r.data.id;
  gateStep(3);
  // שלב 3 (שאלת ההשתלמות) נשאל ב-load() אם עוד לא נענה; שלב 4: סיור קצר — tour.js
  try { localStorage.setItem('ts.teacher.tour', 'pending'); } catch (e) { /* לא חוסם */ }
  $g('teacher-gate').hidden = true;
  $g('teacher-body').hidden = false;
  const exit = $g('tg-exit');
  if (exit) exit.hidden = false;
  await load();
}

async function onGateResend() {
  $g('tg-step2').hidden = true;
  gateStep(1);
  ['tg-school', 'tg-subject', 'tg-name', 'tg-email', 'tg-newname', 'tg-namefix'].forEach(x => { if ($g(x)) $g(x).disabled = false; });
  gatePendingId = ''; gateChangeEmail = false;
  showFix(!$g('tg-fix').hidden);
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
  /* מהירות (24.9.26): כל בקשה ל-Apps Script לוקחת 3 עד 30 שניות, ועד היום הן
     נשלחו אחת אחרי השנייה. עכשיו השאלות ונתוני המפגשים יוצאים יחד עם פרטי
     המורה (בית הספר שמור מהכניסה), והמסך מראה "טוען" במקום להיות ריק. */
  const saved = (savedForOther_ || DEMO_ || ADMIN_KEY_) ? {} : (savedIdentity() || {});
  showLoading(true);
  if (saved.name) {
    const hello = document.getElementById('hello');
    if (hello) hello.textContent = 'שלום ' + String(saved.name).trim().split(' ')[0];
  }
  const qPromise = teacherId ? TS.api('questions.list', { teacherId }) : null;
  // צפייה של מטה: בית הספר מגיע בקישור (&s=), וכך ההדרכות נטענות במקביל לפרטי המורה
  const adminSchool = ADMIN_KEY_ ? TS.urlParam('s', '') : '';
  let scopeSchool = adminSchool || (saved.school && String(saved.id) === String(teacherId) ? saved.school : '');
  let scopePromise = scopeSchool ? fetchScope(scopeSchool) : null;

  /* מפתח חתום כשיש — הכתובת כבר לא חושפת מזהה שאפשר לנחש. teacher.get
     נשאר לקישורים הישנים שהופצו עם ?id=. */
  const teacherRes = teacherKey
    ? await TS.api('teacher.self', { k: teacherKey })
    : await TS.api('teacher.get', { id: teacherId });
  teacher = teacherRes && teacherRes.data;
  if (teacher && teacher.id) teacherId = teacher.id;
  if (teacher && MAIL_KEY_) {
    rememberIdentity({ k: MAIL_KEY_, id: teacher.id, name: teacher.name || '', school: teacher.school || '', at: new Date().toISOString() });
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* לא חוסם */ }
  }
  // מורה שנמחק או אוחד — הזיהוי השמור כבר לא תקף, חוזרים לטופס
  if (!teacher) {
    showLoading(false);
    if (ADMIN_KEY_) { alert('המורה לא נמצא/ה (אולי נמחק/ה או אוחד/ה).'); return; }
    try { localStorage.removeItem(LS_KEY); } catch (e) { /* לא חוסם */ }
    if (!TS.urlParam('id', '')) { teacherId = ''; await showGate(); return; }
  }
  /* שאלת ההשתלמות (28.9.26) — חלק מהרישום הראשוני, חובה. גם מי שנכנס/ה בקישור
     מהמייל (?tk=) ולא עבר/ה בטופס ההרשמה נשאל/ת כאן לפני שהדף נפתח.
     החלטת מיטל (28.9.26): מי שעוד לא צירף/ה אישור — או ענה/תה "לא נרשמתי" —
     רואה את המסך שוב בכל כניסה (פעם אחת לכל פתיחה של הדפדפן), עם התשובה
     הקודמת מסומנת. רק מי שהשלים/ה הכול, כולל אישור, נכנס/ת ישר לדף. */
  if (teacher && (teacherKey || DEMO_) && !ADMIN_KEY_) {
    const reminder = trainingIncomplete() && !remindedThisVisit();
    // במתמטיקה ובאנגלית גם יח"ל — חובה, גם למי שכבר ענה/תה על ההשתלמות לפני שנוספה השאלה
    if (!teacher.trainingStatus || needsUnits() || reminder) {
      showLoading(false);
      await askTraining(!!teacher.trainingStatus);
      showLoading(true);
    }
  }
  if (NEXT_MIFGASH_ && teacher && teacherKey && !ADMIN_KEY_ && !DEMO_) {
    location.replace('../mifgash/?g=' + encodeURIComponent(NEXT_MIFGASH_));
    return;
  }
  render();
  // כפתורי הניווט מיד — לא מחכים להדרכות (השרת עונה לאט; מתעדכנים שוב בסוף)
  buildNav();
  // זיהוי ישן בלי בית ספר, או שבית הספר השתנה — מבקשים לפי הרשומה העדכנית
  if (teacher && teacher.school && (!scopePromise || scopeSchool !== teacher.school)) {
    scopeSchool = teacher.school;
    scopePromise = fetchScope(teacher.school);
    if (saved.k) rememberIdentity(Object.assign({}, saved, { school: teacher.school }));
  }
  const [scopeRes, qRes] = await Promise.all([
    scopePromise || Promise.resolve(null),
    qPromise || TS.api('questions.list', { teacherId })
  ]);
  // תקלה בעיבוד לא משאירה את הודעת הטעינה על המסך לתמיד
  try { applyScope(scopeRes); } catch (e) { console.error("applyScope", e); }
  showLoading(false);
  if (window.TS_notes && !ADMIN_KEY_) TS_notes.init(guideSlug);
  questions = (qRes && qRes.data) || [];
  renderQuestions();
  buildNav();
  if (window.TS_teacherTour) window.TS_teacherTour.maybeStart();
}

/* ▸ כפתורי ניווט למעלה (24.9.26) — רק למקטעים שמוצגים בפועל (מקטע ריק לא מוצג) */
const NAV_ITEMS = [
  ['next-sec', 'ההדרכה הבאה', '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'],
  ['th-card', 'רישום נוכחות', '<path d="M20 6L9 17l-5-5"/>'],
  ['plan-sec', 'התוכנית השנתית', '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'],
  ['notes-sec', 'המחברת שלי', '<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h8M8 13h6"/>'],
  ['journey-sec', 'המסע שלי', '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>'],
  ['mat-sec', 'חומרים', '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>'],
  ['msg-sec', 'הודעות', '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'],
  ['ind-sec', 'הדרכה פרטנית', '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 14.5-4 16 0"/>'],
  ['kb-sec', 'מאגר הידע', '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'],
  ['q-sec', 'שאלה למדריכ/ה', '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>']
];
let navObs = null;
function buildNav() {
  const nav = document.getElementById('teacher-nav');
  const inner = document.getElementById('teacher-nav-inner');
  const body = document.getElementById('teacher-body');
  if (!nav || !inner || !body || body.hidden) return;
  const shown = NAV_ITEMS.filter(([id]) => { const el = document.getElementById(id); return el && !el.hidden; });
  inner.innerHTML = '<span class="pn-label">קפיצה אל</span>' + shown.map(([id, label, icon]) =>
    `<a href="#${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>${label}</a>`).join('');
  nav.hidden = !shown.length;
  if (navObs) navObs.disconnect();
  const links = [...inner.querySelectorAll('a')];
  navObs = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-20% 0px -70% 0px' });
  shown.forEach(([id]) => navObs.observe(document.getElementById(id)));
}

function showLoading(on) {
  const el = document.getElementById('home-loading');
  if (el) el.hidden = !on;
}

/* נתוני המפגשים: מהמטמון של הדפדפן מיד (אם יש), ורענון ברקע שמצייר מחדש */
function fetchScope(school) {
  return TS.api('meet.scope', { school: school }, { onRefresh: applyScope });
}

function applyScope(res) {
  if (!teacher || !res || !res.ok || !res.data) return;
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
  if (window.TS_renderPlan) window.TS_renderPlan(p.guideSlug, ((window.TS_GUIDES || {})[p.guideSlug] || {}).name || '');
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
/* ▸ השעות של כל מועד (24.9.26). בתוכניות יש כמה פורמטים:
   (1) goal עם "(ג׳ 13.10 בשעה 16:00, א׳ 18.10 בשעה 13:00)" לכל מסלול — מוריה;
   (2) time עם תאריך ושעה לסירוגין: "בוקר 8.10 · 10:00 · אחה"צ 9.10 · 18:00";
   (3) time עם שעה לכל מועד לפי הסדר: "11:00 / 18:00", "9:00–10:00 · 16:30–17:30";
   (4) שעה אחת לכל המועדים: "20:30–21:30".
   מחזיר [{time, label}], או null כשהמועד שייך רק למסלול שאינו של המורה. */
const HEB_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
function weekday(iso) {
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
  return isNaN(d) ? '' : 'יום ' + HEB_DAYS[d.getDay()];
}
function dmOf(iso) {
  const m = String(iso).match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? Number(m[2]) + '.' + Number(m[1]) : '';
}
const TIME_RE = /\d{1,2}:\d{2}(?:\s*[–-]\s*\d{1,2}:\d{2})?/;
function sessionTimes(m, iso) {
  const dm = dmOf(iso);
  const hasDm = str => new RegExp('(^|[^\d.])' + dm.replace('.', '\.') + '(?![\d])').test(str);
  const goal = String(m.goal || '');
  if (/בשעה/.test(goal)) {
    const all = [];
    goal.split(' · ').forEach(seg => {
      const mm = seg.match(/^\s*([^(]+?)\s*\(([^)]*)\)/);
      if (!mm) return;
      mm[2].split(',').forEach(part => {
        const t = part.match(TIME_RE);
        if (t && hasDm(part)) all.push({ time: t[0], label: mm[1].trim() });
      });
    });
    if (!all.length) return [];
    const type = teacher && teacher.type;
    const isGmar = x => /גמר/.test(x.label);
    const mine = type === 'gemer' ? all.filter(isGmar) : type === 'bagrut' ? all.filter(x => !isGmar(x)) : all;
    return mine.length ? mine : null;
  }
  const time = String(m.time || '').trim();
  if (!time || !TIME_RE.test(time)) return time ? [{ time: time, label: '' }] : [];
  const parts = time.split(/\s*·\s*/);
  // (2) תאריך ואחריו שעה
  if (parts.some(hasDm)) {
    for (let i = 0; i < parts.length; i++) {
      if (!hasDm(parts[i])) continue;
      const own = parts[i].match(TIME_RE);
      if (own) return [{ time: own[0], label: '' }];
      if (parts[i + 1] && TIME_RE.test(parts[i + 1])) return [{ time: parts[i + 1].match(TIME_RE)[0], label: '' }];
    }
    return [];
  }
  // (3) שעה לכל מועד לפי הסדר
  const times = (time.match(new RegExp(TIME_RE.source, 'g')) || []);
  const days = planDays(m);
  if (times.length > 1 && times.length === days.length) {
    const i = days.indexOf(String(iso).slice(0, 10));
    if (i >= 0) return [{ time: times[i], label: '' }];
  }
  // (4) שעה אחת (או כמה) לכל המועדים
  return [{ time: times.join(' / '), label: '' }];
}

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
  document.getElementById('next-meta').textContent = meta.join(' · ');   // מוסתר (24.9.26) — התאריכים והשעות בשורות למטה
  const soon = document.getElementById('next-soon');
  const diff = Math.round((new Date(first) - new Date(today)) / 86400000);
  if (isToday) { soon.hidden = false; soon.textContent = 'היום! רושמים נוכחות עם הקוד שמוצג במפגש'; }
  else if (diff > 0 && diff <= 7) { soon.hidden = false; soon.textContent = diff === 1 ? 'מחר' : 'בעוד ' + diff + ' ימים'; }
  // שורה לכל מועד, ולידה רישום הנוכחות — פעיל ביום ההדרכה עצמו
  const row = myRowToday(scope, slug);
  document.getElementById('next-sessions').innerHTML = days.filter(d => d >= today).map(d => {
    const times = sessionTimes(next, d);
    if (times === null) return '';        // מועד של מסלול אחר (בגרות/גמר) — לא של המורה הזו
    const act = d === today
      ? (row ? `<span class="ns-done">${esc(rowText(row))}</span>`
             : '<button type="button" class="btn btn-primary ns-btn ns-act" data-go-here>רישום נוכחות</button>')
      : `<span class="ns-wait">הרישום ייפתח ביום ההדרכה</span>`;
    const when = `<span class="ns-when">${esc(weekday(d))} ${esc(dateLbl(d))}</span>`;
    const tline = times.length ? `<span class="ns-times">${times.map(t =>
      `<b>${esc(t.time)}</b>${t.label ? ' · ' + esc(t.label) : ''}`).join(' &nbsp;|&nbsp; ')}</span>` : '';
    return `<div class="ns-row"${d === today ? ' data-today="1"' : ''}><span class="ns-info">${when}${tline}</span>${act}</div>`;
  }).join('');
  document.querySelectorAll('[data-go-here]').forEach(b => b.onclick = () => {
    const card = document.getElementById('th-card');
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const inp = document.getElementById('th-code');
    if (inp) setTimeout(() => inp.focus(), 350);
  });
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
    // מאגר החומרים לפי תיקיות (28.9.26) — כל תיקייה מתקפלת; "כללי" בסוף
    const item = f => `
      <div class="h-item">${ICON_FILE}
        <div class="t">${f.fileUrl
          ? `<a href="${esc(f.fileUrl)}" target="_blank" rel="noopener">${esc(f.fileName || 'קובץ')}</a>`
          : esc(f.fileName)}${f.note ? `<div>${esc(f.note)}</div>` : ''}</div>
        <div class="d">${esc(when(f.createdAt))}</div>
      </div>`;
    const groups = {};
    files.forEach(f => { (groups[f.folder || 'כללי'] = groups[f.folder || 'כללי'] || []).push(f); });
    const names = Object.keys(groups).sort((a, b) => (a === 'כללי') - (b === 'כללי') || a.localeCompare(b, 'he', { numeric: true }));
    document.getElementById('mat-list').innerHTML = names.length === 1 ? groups[names[0]].map(item).join('')
      : names.map(n => `<details class="mat-folder"><summary><b>${esc(n)}</b> <span class="d">(${groups[n].length})</span></summary>${groups[n].map(item).join('')}</details>`).join('');
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
  buildNav();
}

/* "אני כאן" — מוצג רק ביום שבו לקבוצה של המורה יש מועד הדרכה.
   האם הרישום באמת פתוח נקבע בשרת (meetOpenFor_), ולכן לחיצה ביום שבו
   המדריכה עוד לא פתחה מקבלת הודעה ברורה ולא כישלון סתום. */
/* ▸ רישום נוכחות מדף המורה (24.9.26, בקשת מיטל): ביום ההדרכה המורה מקליד/ה
   את הקוד בן 4 הספרות שהמדריכ/ה מציג/ה במפגש — אותו קוד ואותו checkin.submit
   של דף mifgash/, רק בלי לבחור שוב בית ספר ושם. הרישום ממתין לאישור המדריכ/ה.
   מחליף את "אני כאן" בלי קוד: הקוד מוכיח שהמורה באמת במפגש. */
function myRowToday(scope, guideSlug) {
  const today = String(scope.today || '').slice(0, 10);
  const open = (scope.meetings || []).filter(m => String(m.guideSlug) === String(guideSlug) &&
    (m.open || String(m.date).slice(0, 10) === today));
  const ids = new Set(open.map(m => String(m.id)));
  return (scope.rows || []).find(r => ids.has(String(r.meetingId)) && String(r.teacherId) === String(teacher.id));
}
function isSessionDay(scope, guideSlug) {
  const today = String(scope.today || '').slice(0, 10);
  if ((scope.meetings || []).some(m => String(m.guideSlug) === String(guideSlug) &&
      (m.open || String(m.date).slice(0, 10) === today))) return true;
  return planMeetings(guideSlug).some(m => planDays(m).indexOf(today) >= 0);
}
function rowText(row) {
  return row.status === 'present' ? 'הנוכחות שלך אושרה ✓'
    : row.status === 'pending' ? 'נרשמת! הנוכחות שלך עודכנה ✓'
    : 'המדריכ/ה סימנה אותך במפגש הזה.';
}

function renderHere(scope, guideSlug) {
  const card = document.getElementById('th-card');
  if (!card || !guideSlug || !isSessionDay(scope, guideSlug)) return;   // אין הדרכה היום — אין כרטיס
  const mine = (scope.meetings || []).filter(m => String(m.guideSlug) === String(guideSlug) && m.open);
  const topic = (mine[0] && mine[0].topic) || '';
  card.hidden = false;
  document.getElementById('th-when').textContent =
    'היום מתקיימת ההדרכה שלך' + (topic ? ' · ' + topic : '');
  const row = myRowToday(scope, guideSlug);
  if (row) return hereDone(rowText(row));

  const input = document.getElementById('th-code');
  const btn = document.getElementById('th-btn');
  const msg = document.getElementById('th-msg');
  const say = (text, cls) => { msg.hidden = !text; msg.className = 'th-msg' + (cls ? ' ' + cls : ''); msg.textContent = text || ''; };
  if (!mine.length) say('הרישום ייפתח כשהמדריכ/ה תתחיל את ההדרכה ותציג את הקוד.', '');
  input.oninput = () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 4);
    btn.disabled = input.value.length !== 4;
  };
  input.onkeydown = e => { if (e.key === 'Enter' && !btn.disabled) btn.click(); };
  let sending = false;
  btn.onclick = async () => {
    const code = input.value.replace(/\D/g, '');
    if (code.length !== 4 || sending) return;
    sending = true; btn.disabled = true; btn.textContent = 'רושם…';
    const r = await TS.apiPost('checkin.submit', { g: guideSlug, teacherId: String(teacher.id), code: code });
    sending = false; btn.textContent = 'רישום נוכחות';
    if (r && r.ok) {
      renderSessionDone();
      return hereDone(r.data && r.data.duplicate ? 'כבר נרשמת להדרכה הזו ✓ הנוכחות שלך עודכנה.' : 'נרשמת! הנוכחות שלך עודכנה ✓');
    }
    const err = r && r.error;
    say(err === 'closed' ? 'הרישום עוד לא נפתח או כבר נסגר. הקוד מוצג במפגש כשהמדריכ/ה פותח/ת את הרישום.'
      : err === 'bad_code' ? 'הקוד לא נכון או שכבר התחלף. מקלידים את הקוד שמופיע עכשיו במפגש.'
      : err === 'locked' ? 'יותר מדי ניסיונות. אפשר לנסות שוב בעוד 10 דקות, או לפנות למדריכ/ה בצ\'אט.'
      : 'לא הצלחנו לרשום כרגע. אפשר לנסות שוב.', 'err');
    if (err === 'bad_code') { input.value = ''; input.focus(); }
    btn.disabled = input.value.length !== 4;
  };
}

function hereDone(text) {
  const form = document.getElementById('th-form');
  if (form) form.hidden = true;
  const msg = document.getElementById('th-msg');
  if (!msg) return;
  msg.hidden = false;
  msg.className = 'th-msg ok';
  msg.textContent = text;
}
function renderSessionDone() {
  document.querySelectorAll('.ns-row[data-today="1"] .ns-act').forEach(el => {
    el.outerHTML = '<span class="ns-done">נרשמת ✓</span>';
  });
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
  if (window.TS_quickLinks) TS_quickLinks(teacher);

  // Profile
  document.getElementById('p-subject').textContent = teacher.subject;
  document.getElementById('p-type').innerHTML = TS.typeChip(teacher.type);
  document.getElementById('p-sector').innerHTML = TS.secChip(teacher.sector);
  document.getElementById('p-seniority').textContent = (teacher.seniority || 0) + ' שנים';
  document.getElementById('p-units').textContent = teacher.units || '—';
  document.getElementById('p-students').textContent = teacher.students || '—';

  renderAttendance();

  // ההשתלמות המקצועית (28.9.26) — במקום תג pdActive הישן, שאיש לא מילא
  renderTraining();

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

/* ==========================================================================
   שאלת ההשתלמות המקצועית (28.9.26, בקשת מיטל)
   "האם עברת השתלמות מקצועית ב-3 השנים האחרונות ברמת הלימוד שאת/ה מלמד/ת
   (הגבוהה מביניהן)?"  כן → אפשר לצרף אישור · לא → "האם נרשמת השנה?"
   כן → אפשר לצרף אישור · לא → פנייה למדריכ/ה בפרטי (נוסח מוכן ב"שאלה למדריכ/ה").
   התשובה חובה; האישור רשות ואפשר להשלים מדף הבית (pd-sec).
   שרת: teacher.training { k, status, data?, fileName?, mimeType? }.
   ========================================================================== */
const TRAINING_LABEL = {
  passed: 'עברתי השתלמות מקצועית ב-3 השנים האחרונות',
  registered: 'נרשמתי להשתלמות השנה',
  none: 'לא עברתי השתלמות ולא נרשמתי השנה'
};
const TRAINING_ERRORS = {
  file_too_large: 'הקובץ גדול מדי (עד 8MB). אפשר לצלם שוב או לשמור כ-PDF קטן יותר.',
  bad_key: 'פג תוקף הכניסה. רעננו את הדף והיכנסו שוב.',
  bad_status: 'בחרו תשובה.',
  bad_units: 'סמנו אילו יחידות לימוד את/ה מלמד/ת.'
};
/* הערה למורי מתמטיקה שלא צירפו אישור (28.9.26, נוסח מיטל) */
const TRAINING_MATH_NOTE = '<b>שימו לב:</b> במתמטיקה, על פי הנחיית המפמ"ר, ההשתלמות היא חובה. ' +
  'מכיוון שנכנסה תוכנית לימודים חדשה, כל מורה נדרש/ת לעבור השתלמות מקצועית בשלוש השנים האחרונות. ' +
  'ההשתלמות לתוכנית החדשה היא חלק מאחריות המורה ומחויבותו/ה לפיתוח מקצועי. ' +
  'על פי חוזר מנכ"ל, מורים המלמדים 5 יח"ל מחויבים לעבור השתלמות של 5 יח"ל. ' +
  '<b>אנא דאגו להעלות את האישורים המתאימים.</b>';
const isMathTeacher = () => /מתמטיקה/.test(String((teacher && teacher.subject) || ''));
const TRAINING_NONE_Q = 'שלום, לא עברתי השתלמות מקצועית ב-3 השנים האחרונות ועדיין לא נרשמתי להשתלמות השנה. אשמח לתאם איתך.';

function readFileB64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ''));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

async function sendTraining(status, file, units, note) {
  const body = { k: teacherKey };
  if (status) body.status = status;
  if (units) body.units = units;
  if (note !== undefined) body.note = note;
  if (file) {
    if (file.size > 8 * 1024 * 1024) return { ok: false, error: 'file_too_large' };
    body.data = await readFileB64(file);
    body.fileName = file.name;
    body.mimeType = file.type || 'application/octet-stream';
  }
  const r = await TS.apiPost('teacher.training', body);
  if (r && r.ok && r.data && teacher) Object.assign(teacher, r.data);
  return r;
}

function trainingStatusFromForm() {
  const passed = (document.querySelector('input[name="tq-passed"]:checked') || {}).value;
  const reg = (document.querySelector('input[name="tq-reg"]:checked') || {}).value;
  if (passed === 'yes') return 'passed';
  if (passed === 'no' && reg === 'yes') return 'registered';
  if (passed === 'no' && reg === 'no') return 'none';
  return '';
}

/* יחידות לימוד (28.9.26, מיטל) — מתמטיקה: 3 · 4 · 5 · גמר · אנגלית: 3 · 4 · 5.
   בחירה מרובה, חובה. נשמר ב-unitsSelf דרך teacher.training; השרת גוזר ממנו את
   units (3 · 4-5 · 3+4-5) רק כשהוא ריק — כדי לא לדרוס שיוך שמדריכ/ה קבע/ה. */
const UNITS_Q = { 'מתמטיקה': ['3', '4', '5', 'gemer'], 'אנגלית': ['3', '4', '5'] };
const UNITS_Q_LABEL = { '3': '3 יח"ל', '4': '4 יח"ל', '5': '5 יח"ל', gemer: 'גמר' };
function unitsOptions() {
  const s = String((teacher && teacher.subject) || '');
  const k = Object.keys(UNITS_Q).find(x => s.indexOf(x) >= 0);
  return k ? UNITS_Q[k] : null;
}
function needsUnits() { return !!unitsOptions() && !String(teacher.unitsSelf || ''); }
function unitsFromForm() {
  return [...document.querySelectorAll('#tq-units input:checked')].map(el => el.value).join(',');
}

/* התשובה ניתנה אבל חסר אישור, או "לא עברתי ולא נרשמתי" */
function trainingIncomplete() {
  const st = String((teacher && teacher.trainingStatus) || '');
  if (!st) return false;
  return st === 'none' || !String(teacher.trainingFile || '');
}
/* פעם אחת לכל פתיחה של הדפדפן — לא בכל רענון */
const TQ_SS = 'ts.teacher.tqReminded';
function remindedThisVisit() {
  try { return sessionStorage.getItem(TQ_SS) === String(teacherId || '1'); } catch (e) { return false; }
}
function markReminded() {
  try { sessionStorage.setItem(TQ_SS, String(teacherId || '1')); } catch (e) { /* לא חוסם */ }
}

function askTraining(reminder) {
  return new Promise(resolve => {
    $g('teacher-gate').hidden = false;
    $g('teacher-body').hidden = true;
    ['tg-step1', 'tg-step2', 'tg-enter'].forEach(x => { $g(x).hidden = true; });
    const sub = document.querySelector('#teacher-gate .tg-sub');
    const prev = String(teacher.trainingStatus || '');
    const uOpts = unitsOptions();
    const prevUnits = String(teacher.unitsSelf || '');
    const prevNote = String(teacher.trainingNote || '');
    if ($g('tq-note')) $g('tq-note').value = prevNote;
    const unitsOnly = reminder && needsUnits() && !trainingIncomplete();
    $g('tq-units-set').hidden = !uOpts;
    if (uOpts) {
      const on = prevUnits.split(',');
      $g('tq-units').innerHTML = uOpts.map(u => '<label class="tq-opt"><input type="checkbox" value="' + u + '"' +
        (on.indexOf(u) >= 0 ? ' checked' : '') + '><span>' + UNITS_Q_LABEL[u] + '</span></label>').join('');
    }
    if (sub) sub.textContent = unitsOnly
      ? 'עוד שאלה אחת לפני שהדף נפתח: אילו יחידות לימוד את/ה מלמד/ת? כך נדע לאיזו קבוצת הדרכה לשייך אותך.'
      : !reminder
      ? 'עוד שאלה אחת לפני שהדף נפתח. התשובה מגיעה למדריכ/ה ולמנהל/ת, כדי שנדע מי צריך/ה עזרה בהרשמה להשתלמות.'
      : prev === 'none'
        ? 'בכניסה הקודמת ציינת שלא עברת השתלמות ולא נרשמת השנה. נרשמת בינתיים? עדכנו כאן וצרפו את האישור.'
        : 'עוד לא צירפת ' + (prev === 'registered' ? 'אישור הרשמה להשתלמות' : 'אישור השתלמות') +
          '. אפשר לצרף עכשיו (PDF או תמונה) — עד שהאישור מצורף, ההודעה הזו תופיע בכל כניסה.';
    const pick = (name, val) => { const el = document.querySelector('input[name="' + name + '"][value="' + val + '"]'); if (el) el.checked = true; };
    if (reminder) {
      markReminded();
      if (prev === 'passed') pick('tq-passed', 'yes');
      else { pick('tq-passed', 'no'); pick('tq-reg', prev === 'registered' ? 'yes' : 'no'); }
    }
    const later = $g('tq-later');
    const done = () => {
      $g('tg-step3').hidden = true;
      gateStep(4);
      $g('teacher-gate').hidden = true;
      $g('teacher-body').hidden = false;
      resolve();
    };
    // "אשלים בהמשך" רק כשחסר אישור בלבד — יח"ל ותשובת ההשתלמות הן חובה
    if (later) { later.hidden = !reminder || needsUnits(); later.onclick = done; }
    gateMsg('');
    gateStep(3);
    $g('tg-step3').hidden = false;

    const sync = () => {
      const passed = (document.querySelector('input[name="tq-passed"]:checked') || {}).value;
      $g('tq-reg-set').hidden = passed !== 'no';
      const st = trainingStatusFromForm();
      $g('tq-file-box').hidden = !(st === 'passed' || st === 'registered');
      $g('tq-file-label').textContent = st === 'registered' ? 'אישור ההרשמה להשתלמות' : 'אישור ההשתלמות';
      $g('tq-none').hidden = st !== 'none';
      const noFile = !($g('tq-file').files && $g('tq-file').files[0]);
      $g('tq-math').innerHTML = TRAINING_MATH_NOTE;
      $g('tq-math').hidden = !(isMathTeacher() && st && (st === 'none' || noFile));
      gateMsg('');
    };
    document.querySelectorAll('#tg-step3 input[type=radio]').forEach(el => el.addEventListener('change', sync));
    $g('tq-file').addEventListener('change', sync);
    sync();

    $g('tq-save').onclick = async () => {
      const st = trainingStatusFromForm();
      const units = uOpts ? unitsFromForm() : '';
      if (uOpts && !units) return gateMsg('סמנו אילו יחידות לימוד את/ה מלמד/ת.');
      if (!st) {
        const passed = (document.querySelector('input[name="tq-passed"]:checked') || {}).value;
        return gateMsg(passed === 'no' ? 'ענו גם על השאלה אם נרשמת להשתלמות השנה.' : 'ענו על השאלה כדי להמשיך.');
      }
      const input = $g('tq-file');
      const file = (st !== 'none' && input.files && input.files[0]) || null;
      // תזכורת בלי שינוי ובלי קובץ — אין מה לשמור, נכנסים לדף
      const noteEl = $g('tq-note');
      const note = noteEl && (st === 'passed' || st === 'registered') ? String(noteEl.value || '').replace(/\s+/g, ' ').trim() : prevNote;
      if (reminder && st === prev && !file && units === prevUnits && note === prevNote) return done();
      const btn = $g('tq-save');
      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = (file ? 'מעלה את האישור…' : 'שומר…') + ' (עד דקה — אנא המתינו)';
      let r = null;
      try { r = await sendTraining(st, file, units !== prevUnits ? units : '', note !== prevNote ? note : undefined); } catch (e) { r = null; }
      btn.disabled = false;
      btn.textContent = label;
      if (!r || !r.ok) return gateMsg(TRAINING_ERRORS[r && r.error] || 'השמירה לא הצליחה. נסו שוב בעוד רגע.');
      if (st === 'none') { const q = $g('q-text'); if (q && !q.value) q.value = TRAINING_NONE_Q; }
      done();
    };
  });
}

/* דף הבית: תזכורת רק כשיש מה לעשות (מקטע ריק לא מוצג), ושורה ב"הפרטים שלי" */
function renderTraining() {
  const st = String(teacher.trainingStatus || '');
  const file = String(teacher.trainingFile || '');
  const badge = document.getElementById('pd-status');
  if (badge) {
    badge.innerHTML = !st ? '<span class="badge neutral">השתלמות: טרם נענה</span>'
      : '<span class="badge ' + (st === 'none' ? 'warn' : 'ok') + '">' + esc(TRAINING_LABEL[st]) + '</span>' +
        (file ? ' <a class="badge info" href="' + esc(file) + '" target="_blank" rel="noopener">האישור שצירפתי</a>' : '');
  }
  const sec = document.getElementById('pd-sec');
  if (!sec || ADMIN_KEY_) return;
  const text = document.getElementById('pd-text');
  const actions = document.getElementById('pd-actions');
  const input = document.getElementById('pd-file');
  if (st === 'none') {
    text.innerHTML = '<b>השתלמות מקצועית:</b> ציינת שלא עברת השתלמות ולא נרשמת השנה. ' +
      'כדאי לפנות למדריכ/ה המקצועי/ת שלך בהודעה פרטית כדי לתאם.';
    actions.innerHTML = '<a class="btn btn-primary" href="#q-sec" id="pd-ask">פנייה למדריכ/ה</a>' +
      '<button type="button" class="btn btn-secondary" id="pd-reg">נרשמתי — צירוף אישור</button>';
    sec.hidden = false;
    document.getElementById('pd-ask').onclick = () => {
      const q = document.getElementById('q-text');
      if (q && !q.value) q.value = TRAINING_NONE_Q;
      setTimeout(() => q && q.focus(), 400);
    };
    document.getElementById('pd-reg').onclick = () => { input.dataset.status = 'registered'; input.click(); };
  } else if ((st === 'passed' || st === 'registered') && !file) {
    text.innerHTML = '<b>השתלמות מקצועית:</b> ' + esc(TRAINING_LABEL[st]) + '. ' +
      'עוד לא צירפת ' + (st === 'registered' ? 'אישור הרשמה' : 'אישור השתלמות') + ' — אפשר עכשיו, PDF או תמונה.';
    actions.innerHTML = '<button type="button" class="btn btn-primary" id="pd-up">צירוף אישור</button>';
    sec.hidden = false;
    document.getElementById('pd-up').onclick = () => { input.dataset.status = ''; input.click(); };
  } else {
    sec.hidden = true;
    return;
  }
  if (isMathTeacher()) text.insertAdjacentHTML('afterend', '<div class="tq-math">' + TRAINING_MATH_NOTE + '</div>');
  sec.querySelectorAll('.tq-math').forEach((el, i, all) => { if (i < all.length - 1) el.remove(); });
  input.onchange = async () => {
    const f = input.files && input.files[0];
    if (!f) return;
    const status = input.dataset.status || '';
    actions.innerHTML = '<span class="pd-msg">מעלה את האישור…</span>';
    let r = null;
    try { r = await sendTraining(status, f); } catch (e) { r = null; }
    input.value = '';
    if (!r || !r.ok) {
      renderTraining();
      document.getElementById('pd-actions').insertAdjacentHTML('beforeend',
        '<span class="pd-msg" style="color:#8f2f1c">' + esc(TRAINING_ERRORS[r && r.error] || 'ההעלאה לא הצליחה. נסו שוב.') + '</span>');
      return;
    }
    renderTraining();
    buildNav();
  };
}
