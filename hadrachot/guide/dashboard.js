// Guide Dashboard — מציג כל מורי המדריכ/ה + היסטוריית נוכחות + הדרכות
const guideSlug = TS.urlParam('g', '');
let guideEmail = TS.urlParam('guide', '');
const GUIDE_CFG = (window.TS_resolveGuide ? (window.TS_resolveGuide(guideSlug, guideEmail) || {}) : {});
if (!guideEmail && GUIDE_CFG.email) guideEmail = GUIDE_CFG.email;

let state = {
  guide: '',
  guideName: '',
  subject: '',
  trainings: [],
  teachers: []
};

// סינון מסלול: '' = הכל · 'bagrut' · 'gemer'
let currentTrack = '';

// ============================================================
// פיצול לפי יח"ל (9.9.26) — מתמטיקה בחברה היהודית: שירה 3 · גל 4-5
// ============================================================
// GUIDE_CFG.units מגדיר אילו רמות שייכות למדריכה. מורה שטרם סומן לו יח"ל
// מופיע אצל שתי המדריכות עם תווית "טרם סומן" — כך אף מורה לא נעלם בזמן
// שהחלוקה נעשית. הסינון כולו בצד הלקוח: מהשרת מגיעה רשימת המקצוע המלאה,
// ולכן שום מורה אינו בלתי־נגיש גם אם סומן בטעות (טאב "כל מורי המקצוע").
// unitsScope: 'mine' = הקבוצה שלי + טרם סומן · 'unmarked' · 'all'
let unitsScope = 'mine';

function guideUnits() {
  const u = GUIDE_CFG.units;
  return (Array.isArray(u) && u.length) ? u : null;
}
// "טרם סומן" = מורה בגרות בלי רמה. גמר לא נספר — בגמר אין יחידות לימוד,
// והוא שייך לשירה בכל מקרה; ספירתו כאן הציגה 12 "חסרים" שאין מה לעשות איתם.
function isUnmarked(t) {
  return t.type !== 'gemer' && TS.unitsSet(t.units).length === 0;
}
// שייך לקבוצה של המדריכה לפי הרמה שסומנה (גמר תמיד שייך למי שהמסלול פתוח אצלה)
function isMine(t) {
  const mine = guideUnits();
  if (!mine) return true;
  if (t.type === 'gemer') return true;   // כבר סונן קודם לפי GUIDE_CFG.tracks
  const u = TS.unitsSet(t.units);
  return u.length ? u.some(x => mine.indexOf(x) >= 0) : true;   // טרם סומן = אצל שתיהן
}
// הסט שנחשב "הקבוצה שלי" לצורך ה-KPI בראש הדף
function myTeachers() {
  return state.teachers.filter(isMine);
}

document.addEventListener('DOMContentLoaded', async () => {
  bindTabs();
  document.getElementById('btn-new-training').addEventListener('click', openNewTraining);
  // פעולות מהירות בראש הדף — פותחות את הכלי המקופל שלו וגוללות אליו
  document.querySelectorAll('.gq[data-tool]').forEach(b => b.addEventListener('click', () => {
    const tool = document.getElementById(b.dataset.tool);
    if (!tool) return;
    const outer = tool.closest('details:not(.tool)');
    if (outer) outer.open = true;
    tool.open = true;
    tool.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const f = tool.querySelector('input, select, textarea');
    if (f) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) {} }, 450);
  }));
  // כפתור ניווט שמוביל לכלי מקופל (open ב-view.js) — פותחים אותו וגוללים אליו
  document.addEventListener('click', e => {
    const a = e.target.closest('#menor-nav a[data-i]');
    const it = a && window.MENOR_VIEW && MENOR_VIEW.nav[+a.dataset.i];
    if (!it || !it.open) return;
    const tool = document.getElementById(it.open);
    if (!tool || tool.hidden) return;
    const outer = tool.closest('details:not(.tool)');
    if (outer) outer.open = true;
    tool.open = true;
    setTimeout(() => tool.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  });
  const qAdd = document.querySelector('.gq[data-add-teacher]');
  if (qAdd) qAdd.addEventListener('click', () => { const b = document.getElementById('btn-add-teacher'); if (b) b.click(); });
  document.getElementById('form-training').addEventListener('submit', submitTraining);
  document.getElementById('teacher-search').addEventListener('input', renderTeachers);
  document.getElementById('teacher-school').addEventListener('change', renderTeachers);
  const addBtn = document.getElementById('btn-add-teacher');
  if (addBtn) addBtn.addEventListener('click', () => openTeacherModal());
  const teacherForm = document.getElementById('form-teacher');
  if (teacherForm) teacherForm.addEventListener('submit', submitTeacher);
  const typeSel = document.getElementById('te-type');
  if (typeSel) typeSel.addEventListener('change', toggleUnitsRow);
  renderResources();
  renderPlan();
  loadSchools();   // רשימת בתי הספר מוכנה עוד לפני שנפתח חלון ההוספה
  // space.js / meetings.js מסתירים את הלשוניות שלהם ב-DOMContentLoaded משלהם
  setTimeout(syncQuickLinks, 0);
  await loadData();
  reportSeen();
});

/* תיעוד פתיחה (16.9.26) — כדי שהשאלה "מי קיבל את הקישור האישי שלו" תיענה
   מהנתונים ולא מהזיכרון. נשלח אחרי הטעינה ובלי await: כשל כאן לא ייראה
   למדריכה ולא יעכב את הדף. רק מי, מתי וכמה פעמים — בלי IP ובלי דפדפן. */
function reportSeen() {
  if (!guideSlug) return;
  // מיטל נכנסת מעמוד בדיקת המפגש — לא פתיחה של המדריכ/ה
  if (new URLSearchParams(location.search).get('by') === 'admin') return;
  // כניסת מטה (staff.js, 24.9.26) — צפייה של מיטל/רויטל אינה פתיחה של הקישור
  try { if (((window.TS_staff && TS_staff.get()) || {}).roles.some(r => r.role === 'ministry')) return; } catch (e) {}
  try {
    TS.api('link.seen', { kind: 'guide', slug: guideSlug, name: GUIDE_CFG.name || '' },
           { cache: 'no' });
  } catch (e) { /* לא שובר את הדף */ }
}

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
  // קיצורי הדרך בראש העמוד (14.9.26) — הלשוניות יושבות מתחת לחומרים ולנתונים,
  // ומדריכות לא מצאו את "חומרים והודעות" ואת "שעות פרטניות".
  document.querySelectorAll('[data-go]').forEach(b =>
    b.addEventListener('click', () => goTab(b.dataset.go)));
}

/* 24.9.26 — אין יותר לשוניות: העמוד הוא שישה מקטעים. goTab נשאר (מבט המדריכ/ה,
   meetings.js, "לרשימת הנוכחות") ומוביל למקטע, ופותח אותו אם הוא מקופל. */
const SECTION_OF = {
  meet: ['sec-month'], months: ['sec-months'], space: ['sec-space'], questions: ['sec-questions'],
  teachers: ['sec-teachers'], tools: ['sec-tools'],
  hours: ['sec-tools', 'tool-hours'], monday: ['sec-tools', 'tool-monday'], plan: ['sec-tools', 'tool-plan'],
  trainings: ['sec-tools', 'tool-trainings'], adhoc: ['sec-tools', 'tool-adhoc'], year: ['sec-tools', 'tool-year']
};
function goTab(name) {
  const ids = SECTION_OF[name] || [];
  let el = null;
  ids.forEach(id => {
    const x = document.getElementById(id);
    if (!x) return;
    if (x.tagName === 'DETAILS') x.open = true;
    el = x;
  });
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.TS_goTab = goTab;

// קיצור דרך ללשונית מוסתרת (תוכנית שנתית למדריכה בלי תוכנית) — מוסתר גם הוא
function syncQuickLinks() {
  document.querySelectorAll('[data-go]').forEach(b => {
    const btn = document.getElementById('tab-btn-' + b.dataset.go);
    b.hidden = !btn || btn.hidden;
  });
}

/* opts.fresh — אחרי שמירה: עוקפים את המטמון המקומי. בטעינה רגילה הרשימה
   מוצגת מהמטמון (עד 5 דקות) ומתרעננת ברקע; עד 17.9.26 הרענון נשמר ולא הוצג,
   ולכן מורה שנוסף ממכשיר אחר "לקח זמן עד שהופיע". */
async function loadData(opts) {
  opts = opts || {};
  if (!TS.getAppsScriptUrl() || (!guideEmail && !GUIDE_CFG.subject)) {
    renderNoGuide();
    return;
  }

  // שתי קריאות במקביל:
  // 1. רשימת המורים של המקצוע — מקור האמת לרשימה (כולל מסלול בגרות/גמר ומגזר)
  // 2. guide.dashboard — היסטוריית נוכחות והדרכות (קיים רק למדריכה עם הדרכות בגיליון)
  /* מדריכה עם יותר ממקצוע אחד (רבקה נחום — היסטוריה + אזרחות): הפרמטר
     subject בשרת מקבל מקצוע יחיד, ולכן מושכים את כל המורים ומסננים כאן.
     אותו שיקול כמו ב-mabat: קריאה נפרדת לכל מקצוע חורגת מתקרת 30 השניות
     של Apps Script, וחלק מהמקצועות פשוט לא נטענים. מדריכה עם מקצוע אחד
     ממשיכה בקריאה הממוקדת — בלי שינוי התנהגות. */
  const mySubjects = (window.TS_guideSubjects ? window.TS_guideSubjects(GUIDE_CFG) : [])
    .filter(Boolean);
  let rosterSig = '';
  const apiOpts = opts.fresh ? { cache: 'no' } : {
    onRefresh: res => {
      if (res && res.ok && JSON.stringify(res.data) !== rosterSig) loadData({ fresh: true });
    }
  };
  const rosterReq = !mySubjects.length ? Promise.resolve(null)
    : mySubjects.length === 1 ? TS.api('teachers.list', { subject: mySubjects[0] }, apiOpts)
    : TS.api('teachers.list', {}, apiOpts);

  const [rosterRes, dashRes] = await Promise.all([
    rosterReq,
    guideEmail ? TS.api('guide.dashboard', { guide: guideEmail }) : Promise.resolve(null)
  ]);

  const dash = (dashRes && dashRes.ok && dashRes.data) ? dashRes.data : null;
  if (rosterRes && rosterRes.ok) rosterSig = JSON.stringify(rosterRes.data);

  if (!rosterRes || !rosterRes.ok) {
    /* מדריכה מזוהה (יש לה קונפיג) — הכשל הוא בשרת, לא בקישור. עד 11.9.26
       נפלנו כאן ל"לא זוהתה מדריכה", או לרשימת guide.dashboard — 0 מורים אצל
       מי שאין לה הדרכות בגיליון. שתיהן נראו למדריכה כמו נתונים חסרים. */
    if (GUIDE_CFG.subject) { renderApiError(); return; }
    // אין קונפיג מקצוע (קישור ישן עם ?guide= בלבד) — נופלים להתנהגות השרת
    if (dash) { state = dash; renderAll(); } else { renderNoGuide(); }
    return;
  }

  // סינון לפי המגזרים שבאחריות המדריכה (kelali+haredi = חברה יהודית · arab = חברה ערבית)
  // ולפי המסלולים שלה (גל — בגרות בלבד; בגמר אין יח"ל והוא נשאר אצל שירה).
  const sectors = GUIDE_CFG.sectors || null;
  const tracks = (Array.isArray(GUIDE_CFG.tracks) && GUIDE_CFG.tracks.length) ? GUIDE_CFG.tracks : null;
  const roster = (rosterRes.data || []).filter(t =>
    // סינון המקצוע נדרש רק כשמשכנו את כל המורים (מדריכה רב-מקצועית)
    (mySubjects.length < 2 || mySubjects.indexOf(t.subject) >= 0) &&
    (!sectors || sectors.indexOf(t.sector || 'kelali') >= 0) &&
    (!tracks || tracks.indexOf(t.type === 'gemer' ? 'gemer' : 'bagrut') >= 0)
  );

  // הצמדת נוכחות מ-guide.dashboard לפי id
  const dashById = {};
  if (dash) (dash.teachers || []).forEach(t => { dashById[t.id] = t; });
  const trainings = dash ? (dash.trainings || []) : [];
  legacyTrainings = trainings;

  state = {
    guide: guideEmail || GUIDE_CFG.email || '',
    guideName: GUIDE_CFG.name || (dash && dash.guideName) || '',
    subject: GUIDE_CFG.subject || (dash && dash.subject) || '',
    trainings,
    teachers: roster.map(t => {
      const d = dashById[t.id];
      const netKey = (t.network || '').toString().replace(/^net_/, '');
      return {
        id: t.id,
        name: t.name,
        phone: t.phone,
        email: t.email,
        notes: t.notes || '',
        school: t.school,
        subject: t.subject,
        schoolName: t.schoolName || (d && d.schoolName) || '— ללא שיוך —',
        network: netKey,
        networkName: TS.netById(netKey).name || netKey,
        type: t.type === 'gemer' ? 'gemer' : 'bagrut',
        units: (t.units || '').toString().trim(),
        sector: t.sector || 'kelali',
        attendance: d ? d.attendance : {},
        stats: d ? d.stats : { present: 0, partial: 0, total: trainings.length, rate: 0 },
        legacyAttendance: d ? d.attendance : {},
        legacyStats: d ? d.stats : { present: 0, partial: 0, total: trainings.length, rate: 0 }
      };
    })
  };
  state.teachers.sort((a, b) => {
    if (a.schoolName !== b.schoolName) return a.schoolName.localeCompare(b.schoolName, 'he');
    return (a.name || '').localeCompare(b.name || '', 'he');
  });
  applyMeetings();
  renderAll();
}

/* ============================================================
   מפגשי ההדרכה (meetings.js) כחלק מ"המורים שלי" — 17.9.26
   -----------------------------------------------------------
   הנוכחות נרשמת היום בלשונית "נוכחות במפגשים" (טאבים meetings /
   meeting_attendance), אבל הטבלה, אחוז הנוכחות, "ההדרכות שלי" והסטטיסטיקה
   קראו רק את טאב ההדרכות הישן. מוריה סימנה 36 נוכחויות בשני מפגשים וראתה
   0 הדרכות ו-0%. כאן כל מפגש שהתקיים נכנס כהדרכה (virtual) לאותו state,
   ושאר הקוד נשאר כמו שהוא.
   כללי הספירה — כמו ב-assets/meet-stats.js: מפגש שהתקיים = עד היום ויש בו
   לפחות סימון אחד; נוכחות = present בלבד; אותו מורה בבגרות ובגמר = אדם אחד;
   מפגש של מקצוע אחר (רבקה) לא נספר למורה. הדרכה פרטנית לא נכנסת לאחוז.
   **18.9.26 (קביעת מיטל): המדריכ/ה רואה כל מועד שהעבירה — הספירה חודשית.**
   בכל חודש שני מועדים, בוקר וערב, והם הדרכה אחת: מי שהיה באחד מהם נחשב
   נוכח בהדרכה של החודש. לכן בטבלה יש עמודה לכל מועד (כדי שהמדריכ/ה תראה
   את העבודה שלה ומי היה בכל מועד), אבל **אחוז הנוכחות נספר לפי חודשים** —
   וזה גם מה שהמפקח.ת והדוחות רואים.
   ============================================================ */
let legacyTrainings = [];
function meetNorm(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function applyMeetings() {
  const M = window.MEET_ALL;
  if (!M) return;
  const today = M.today || new Date().toISOString().slice(0, 10);
  const held = (M.meetings || [])
    .filter(m => m.date <= today && m.counts && (m.counts.present + m.counts.absent) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const subjOf = m => (window.TS_meetingSubject ? window.TS_meetingSubject(guideSlug, m.date) : '') || '';
  const heldIds = new Set(held.map(m => m.id));
  const indMonths = (typeof window.MEET_indMonths === 'function') ? window.MEET_indMonths() : null;

  // נוכחות לפי אדם (שם + בית ספר), כדי ששורת הבגרות ושורת הגמר יסומנו יחד
  const personOf = t => meetNorm(t.name) + '|' + meetNorm(t.schoolName);
  const personById = {};
  state.teachers.forEach(t => { personById[String(t.id)] = personOf(t); });
  const attended = {};   // personKey → Set(meetingId)
  (M.rows || []).forEach(r => {
    if (r.status !== 'present' || !heldIds.has(r.meetingId)) return;
    const k = personById[String(r.teacherId)];
    if (!k) return;
    (attended[k] = attended[k] || new Set()).add(r.meetingId);
  });

  // קיבוץ לחודשים: כל חודש = עמודה אחת, ובתוכה כל המועדים שלו
  const monthsMap = {};
  held.forEach(m => {
    const k = m.date.slice(0, 7);
    const mo = monthsMap[k] || (monthsMap[k] = { key: k, date: m.date, ids: [], dates: [], subjects: {}, topics: [] });
    mo.ids.push(m.id);
    mo.dates.push(m.date);
    const sx = subjOf(m);
    if (sx) mo.subjects[sx] = 1;
    if (m.topic && mo.topics.indexOf(m.topic) < 0) mo.topics.push(m.topic);
  });
  const months = Object.keys(monthsMap).sort().map(k => monthsMap[k]);

  // עמודה לכל מועד, מקובצת תחת החודש שלה
  state.months = months;
  state.trainings = legacyTrainings.concat(held.map(m => ({
    id: m.id, date: m.date, virtual: true, monthKey: m.date.slice(0, 7),
    subject: subjOf(m), location: 'מועד הדרכה', notes: m.topic || ''
  })));
  state.teachers.forEach(t => {
    const att = Object.assign({}, t.legacyAttendance || {});
    const set = attended[personOf(t)] || new Set();
    // תצוגה: מה היה בכל מועד
    held.forEach(m => {
      const sx = subjOf(m);
      if (sx && sx !== t.subject) { att[m.id] = { status: 'na' }; return; }
      if (set.has(m.id)) att[m.id] = { status: 'present' };
    });
    /* ספירה: חודשית — נוכחות באחד המועדים של החודש = נוכחות בהדרכה של החודש.
       שעה פרטנית מספקת אף היא את החודש שבו ניתנה (קביעת מיטל 20.9.26),
       וחודש שניתנה בו שעה פרטנית בלי הדרכה קבוצתית נכנס לספירה. */
    const indM = indMonths ? (indMonths[personOf(t)] || new Set()) : new Set();
    const counted = {};
    let total = 0, present = 0;
    months.forEach(mo => {
      const subs = Object.keys(mo.subjects);
      if (subs.length && subs.indexOf(t.subject) < 0) return;
      counted[mo.key] = 1;
      total++;
      if (mo.ids.some(id => set.has(id)) || indM.has(mo.key)) present++;
    });
    indM.forEach(k => { if (!counted[k]) { total++; present++; } });
    t.monthsCounted = counted;
    t.indMonths = indM;
    const ls = t.legacyStats || { present: 0, partial: 0, total: legacyTrainings.length };
    const allTotal = (ls.total || 0) + total;
    const allPresent = (ls.present || 0) + present;
    t.attendance = att;
    t.stats = {
      present: allPresent, partial: ls.partial || 0, total: allTotal,
      rate: allTotal ? Math.round(allPresent / allTotal * 100) : null
    };
  });

  /* "טרם השלימו את הדרכת <החודש>" — המספר שהמדריכה יכולה לפעול עליו.
     נספר על **החודש האחרון שהתקיים** ולפי **אנשים**, לא שורות: מי שאין לו
     נוכחות מאושרת באף אחד ממועדי החודש ולא קיבל שעה פרטנית באותו חודש.
     זה בדיוק המספר שמוצג במסך הסימון (53 אצל מוריה), ולא מספר הלא-מסומנים
     במועד בודד (60) — חלקם נכחו במועד האחר. */
  const lastMo = months.length ? months[months.length - 1] : null;
  if (!lastMo) { state.lastMonth = null; return; }
  const subs = Object.keys(lastMo.subjects);
  const seen = {};
  let rosterN = 0, missing = 0;
  state.teachers.forEach(t => {
    if (typeof isMine === 'function' && !isMine(t)) return;
    if (subs.length && subs.indexOf(t.subject) < 0) return;
    const k = personOf(t);
    if (seen[k]) return;
    seen[k] = 1;
    rosterN++;
    const done = lastMo.ids.some(id => (attended[k] || new Set()).has(id)) ||
      ((indMonths && indMonths[k]) ? indMonths[k].has(lastMo.key) : false);
    if (!done) missing++;
  });
  state.lastMonth = { key: lastMo.key, rosterN: rosterN, missing: missing,
    label: (window.TS_meetMonthLabel ? window.TS_meetMonthLabel(lastMo.key) : lastMo.key) };
}
window.DASH_onMeetings = function () {
  if (!state.teachers.length) return;   // הרשימה עוד לא נטענה — loadData יחיל בסוף
  applyMeetings();
  renderAll();
};

// תקלה רגעית בשרת של Google (302→404 או פסק זמן), אחרי שלושה ניסיונות
// ב-TS.api. הכותרת נשארת של המדריכה, כדי שלא תחשוב שהקישור שלה שבור.
function renderApiError() {
  const gName = GUIDE_CFG.name || 'מדריכה';
  const gSubject = (window.TS_guideSubjects ? window.TS_guideSubjects(GUIDE_CFG) : []).join(' · ');
  document.getElementById('user-name').textContent = gName;
  document.getElementById('page-title').textContent = gName + (gSubject ? ' · ' + gSubject : '');
  document.getElementById('page-subtitle').textContent = 'רשימת המורים לא נטענה כרגע';
  document.getElementById('teachers-container').innerHTML = `
    <div class="empty" style="padding:40px; text-align:center;">
      <div style="font-size:17px; font-weight:700; margin-bottom:8px;">רשימת המורים לא נטענה</div>
      <div style="color:var(--text-muted); line-height:1.8; margin-bottom:14px;">
        תקלה רגעית בשרת — הנתונים שלך לא נפגעו.<br>
        לחצי על "לנסות שוב". אם זה חוזר — פני למיטל פלג.
      </div>
      <button type="button" class="btn btn-primary" id="btn-retry-load">לנסות שוב</button>
    </div>`;
  ['stat-teachers', 'stat-schools', 'stat-trainings', 'stat-rate', 'stat-todo', 'stat-units']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
  document.getElementById('btn-retry-load').addEventListener('click', async () => {
    document.getElementById('teachers-container').innerHTML = '<div class="empty" style="padding:32px;">טוען...</div>';
    await loadData();
  });
}

// לא זוהתה מדריכה — במקום נתוני דמו מבלבלים, הסבר ברור איך נכנסים
function renderNoGuide() {
  document.getElementById('page-title').textContent = 'לא זוהתה מדריכה';
  document.getElementById('page-subtitle').textContent = 'הדשבורד נפתח רק דרך הקישור האישי של כל מדריכ/ה';
  document.getElementById('teachers-container').innerHTML = `
    <div class="empty" style="padding:40px; text-align:center;">
      <div style="font-size:17px; font-weight:700; margin-bottom:8px;">הקישור חסר את זיהוי המדריכ/ה</div>
      <div style="color:var(--text-muted); line-height:1.8;">
        יש להיכנס דרך הקישור האישי שקיבלת (בצורה <code>guide/?g=...</code>).<br>
        לא קיבלת קישור? פני למיטל פלג.
      </div>
    </div>`;
  ['stat-teachers','stat-schools','stat-trainings'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '0'; });
}

function renderAll() {
  const gName = GUIDE_CFG.name || state.guideName || state.guide || 'מדריכה';
  // שני מקצועות מוצגים שניהם בכותרת — "רבקה נחום · היסטוריה · אזרחות"
  const gSubject = (window.TS_guideSubjects && window.TS_guideSubjects(GUIDE_CFG).length)
    ? window.TS_guideSubjects(GUIDE_CFG).join(' · ')
    : (GUIDE_CFG.subject || state.subject || '');
  // ה-KPI מתייחס לקבוצה של המדריכה (הרמות שלה + מי שטרם סומן), לא לכל המקצוע
  const mine = myTeachers();
  const bagrutN = mine.filter(t => t.type !== 'gemer').length;
  const gemerN = mine.length - bagrutN;
  const unmarkedN = mine.filter(isUnmarked).length;
  /* אותו אדם בבגרות ובגמר = שתי שורות במערכת ואדם אחד בספירה (כלל מיטל).
     עד 20.9.26 הדשבורד ספר שורות, ולכן הראה 87 מורים ו-39% בעוד המפקחת
     ראתה 86 ו-38% על אותה קבוצה (קודקס). כאן מקובצים לאנשים, כמו
     assets/meet-stats.js — שורת בגרות ושורת גמר מקבלות ממילא אותו t.stats. */
  const peopleMap = {};
  mine.forEach(t => {
    const k = meetNorm(t.name) + '|' + meetNorm(t.schoolName);
    if (!peopleMap[k]) peopleMap[k] = t;
  });
  const people = Object.keys(peopleMap).map(k => peopleMap[k]);
  const bothN = mine.length - people.length;
  const unitsLabel = guideUnits() ? guideUnits().join(' · ') + ' יח"ל' : '';
  /* מדריכה שהמגזר החרדי הוא כל הקבוצה שלה (שרה ברדה, 10.9.26) לא תיקרא
     "החברה היהודית" — זה נכון אבל מטשטש בדיוק את מה שמייחד אותה. */
  const societyLabel = GUIDE_CFG.sectors
    ? (GUIDE_CFG.sectors.indexOf('arab') >= 0 ? 'החברה הערבית'
      : (GUIDE_CFG.sectors.length === 1 && GUIDE_CFG.sectors[0] === 'haredi'
        ? 'המגזר החרדי' : 'החברה היהודית'))
    : '';
  document.getElementById('user-name').textContent = gName;
  document.getElementById('page-title').textContent =
    gName + (gSubject ? ' · ' + gSubject : '') + (unitsLabel ? ' · ' + unitsLabel : '');
  document.getElementById('page-subtitle').textContent =
    people.length + ' מורים (' + bagrutN + ' בגרות · ' + gemerN + ' גמר' +
    (bothN ? ' · ' + bothN + ' בשניהם' : '') + ') · ' +
    new Set(mine.map(t => t.schoolName)).size + ' בתי ספר' +
    (societyLabel ? ' · ' + societyLabel : '');
    // "טרם סומנה להם רמה" עבר לפס העליון כמספר לפעולה — לא חוזר כאן

  // מורה שעוד לא התקיים מפגש שרלוונטי אליו — לא נספר כ-0%
  const rated = people.filter(t => t.stats.total);
  const totalRate = rated.length
    ? Math.round(rated.reduce((sum, t) => sum + (t.stats.rate || 0), 0) / rated.length)
    : null;
  const setTx = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTx('stat-teachers', people.length);
  const schoolsN = new Set(mine.map(t => t.schoolName)).size;
  setTx('stat-schools', schoolsN);
  // מקטע "המורים שלי" מקופל — המספר מופיע בכותרת שלו
  setTx('te-count', people.length + ' מורים · ' + schoolsN + ' בתי ספר · לוחצים כדי לפתוח');
  setTx('stat-schools-sub', schoolsN + ' בתי ספר');

  /* שני המספרים לפעולה (20.9.26) — ראו את ההערה בפס ב-index.html */
  const lm = state.lastMonth;
  const todoEl = document.getElementById('stat-todo');
  if (todoEl) {
    todoEl.textContent = lm ? lm.missing : '—';
    todoEl.className = 'cmd-metric-value ' + (!lm ? '' : lm.missing ? 'warn' : 'mint');
    setTx('stat-todo-sub', lm
      ? 'את הדרכת ' + lm.label.replace(/ \d{4}$/, '') + ' · מתוך ' + lm.rosterN
      : 'טרם התקיימה הדרכה');
  }
  const unitsEl = document.getElementById('stat-units');
  if (unitsEl) {
    // רמת יח"ל נדרשת רק בבגרות; בגמר אין יח"ל
    const unitsRelevant = people.filter(t => t.type !== 'gemer').length;
    unitsEl.textContent = unmarkedN || '—';
    unitsEl.className = 'cmd-metric-value ' + (unmarkedN ? 'warn' : 'mint');
    setTx('stat-units-sub', unmarkedN ? 'מתוך ' + unitsRelevant + ' בבגרות' : 'כל הרמות סומנו');
  }
  /* "הדרכות השנה" — כמה מועדים העבירה בפועל, ומתחת כמה הדרכות חודשיות זה
     לצורך הספירה של המפקח.ת (מיטל, 20.9.26: "היא עשתה שתיים"). */
  const monN = (state.months || []).length;
  setTx('stat-trainings', state.trainings.length);
  const trSub = document.getElementById('stat-trainings-sub');
  if (trSub) {
    trSub.textContent = monN
      ? 'מועדים · ' + (monN === 1 ? 'הדרכה חודשית אחת' : monN + ' הדרכות חודשיות') + ' בספירה'
      : '';
    trSub.hidden = !monN;
  }
  setTx('stat-rate', totalRate === null ? '—' : totalRate + '%');
  setTx('stat-rate-base', totalRate === null ? 'טרם נמדד'
    : 'נמדדו ' + rated.length + ' מתוך ' + people.length + ' מורים');

  renderTeachers();
  renderTrainings();
  renderStats();
  renderQuestions();
  // לשונית "נוכחות במפגשים" (meetings.js) בונה את הרשימה מאותה קבוצה
  if (typeof window.MEET_onRoster === 'function') window.MEET_onRoster();
}

function renderTrackPills() {
  const bar = document.getElementById('track-filter');
  if (!bar) return;
  const scoped = state.teachers.filter(inScope);
  const bagrutN = scoped.filter(t => t.type !== 'gemer').length;
  const gemerN = scoped.length - bagrutN;
  const pill = (val, label, n) => `
    <button type="button" class="subject-pill ${currentTrack === val ? 'active' : ''}" data-track="${val}">
      ${label}${n !== null ? ` (${n})` : ''}
    </button>`;
  // למדריכה שהוגבלה לבגרות בלבד אין מה לסנן — כל הרשימה בגרות
  const tracks = GUIDE_CFG.tracks;
  bar.hidden = !!(Array.isArray(tracks) && tracks.length === 1);
  bar.innerHTML = '<span class="filter-label">מסלול</span>' +
    pill('', 'הכל', null) + pill('bagrut', 'בגרות', bagrutN) + pill('gemer', 'גמר', gemerN);
  bar.querySelectorAll('[data-track]').forEach(b =>
    b.addEventListener('click', () => { currentTrack = b.dataset.track; renderTeachers(); }));
}

// בורר היח"ל בשורת המורה — הכלי שבו המדריכות עושות סדר בחלוקה.
// מוצג רק כשהקבוצה מפוצלת ורק במסלול בגרות (בגמר אין יח"ל).
function unitsControl(t) {
  if (!guideUnits() || t.type === 'gemer') return '';
  const cur = TS.unitsSet(t.units).length ? t.units : '';
  const opts = [`<option value=""${cur ? '' : ' selected'} disabled>טרם סומן</option>`]
    .concat(TS.UNITS.map(u =>
      `<option value="${u.id}"${cur === u.id ? ' selected' : ''}>${u.name}</option>`));
  return `<select class="units-select${cur ? '' : ' unset'}" title="יחידות לימוד"
            onchange='setUnitsById(${JSON.stringify(String(t.id))}, this.value, this)'>${opts.join('')}</select>`;
}

// שמירת הרמה. עדכון אופטימי — הבורר לא ננעל, ובכישלון חוזרים לערך הקודם.
async function setUnitsById(id, units, el) {
  const t = state.teachers.find(x => String(x.id) === String(id));
  if (!t || !units || units === t.units) return;
  const prev = t.units;
  t.units = units;
  if (el) el.classList.remove('unset');
  if (!TS.getAppsScriptUrl()) { t.units = prev; TS.toast('אין חיבור לשרת'); renderTeachers(); return; }
  const res = await TS.apiPost('teachers.update', { id, units });
  if (res.ok) {
    TS.toast(t.name + ' → ' + TS.unitsLabel(units));
    renderAll();   // הרשימה והמונים מתעדכנים; מורה שעבר לקבוצה השנייה יוצא מ"שלי"
  } else {
    t.units = prev;
    TS.toast('לא נשמר — ' + (res.error || ''));
    renderTeachers();
  }
}

// האם המורה בתחום התצוגה הנוכחי (הקבוצה שלי / טרם סומן / כל המקצוע)
function inScope(t) {
  if (!guideUnits()) return true;
  if (unitsScope === 'all') return true;
  if (unitsScope === 'unmarked') return isUnmarked(t);
  return isMine(t);
}

// סרגל היח"ל — מוצג רק למדריכה שהקבוצה שלה מפוצלת לפי רמה.
// "כל מורי המקצוע" הוא שסתום הביטחון: מורה שסומן בטעות תמיד נשאר נגיש לתיקון.
function renderUnitsPills() {
  const bar = document.getElementById('units-filter');
  if (!bar) return;
  if (!guideUnits()) { bar.hidden = true; return; }
  bar.hidden = false;
  const mineN = state.teachers.filter(isMine).length;
  const unmarkedN = state.teachers.filter(isUnmarked).length;
  const pill = (val, label, n) => `
    <button type="button" class="subject-pill ${unitsScope === val ? 'active' : ''}" data-scope="${val}">
      ${label} (${n})
    </button>`;
  bar.innerHTML = '<span class="filter-label">יח"ל</span>' +
    pill('mine', 'הקבוצה שלי', mineN) +
    pill('unmarked', 'טרם סומן', unmarkedN) +
    pill('all', 'כל מורי המקצוע', state.teachers.length);
  bar.querySelectorAll('[data-scope]').forEach(b =>
    b.addEventListener('click', () => { unitsScope = b.dataset.scope; renderTeachers(); }));
}

const teOpenSchools = new Set();   // בתי ספר שהמדריכ/ה פתחה ברשימה
function renderTeachers() {
  renderTrackPills();
  renderUnitsPills();
  const search = (document.getElementById('teacher-search').value || '').trim().toLowerCase();
  const inTrack = t => inScope(t) &&
    (!currentTrack || (t.type === 'gemer' ? 'gemer' : 'bagrut') === currentTrack);
  const schoolSel = renderSchoolSelect(state.teachers.filter(inTrack));
  const filtered = state.teachers.filter(t =>
    inTrack(t) &&
    (!schoolSel || (t.schoolName || '— ללא שיוך —') === schoolSel) &&
    (!search || (t.name || '').toLowerCase().includes(search) ||
                (t.schoolName || '').toLowerCase().includes(search))
  );

  // קיבוץ לפי בית ספר
  const bySchool = {};
  filtered.forEach(t => {
    const key = t.schoolName || '— ללא שיוך —';
    if (!bySchool[key]) bySchool[key] = { name: key, network: t.networkName, networkColor: t.network, teachers: [] };
    bySchool[key].teachers.push(t);
  });

  const container = document.getElementById('teachers-container');
  if (!Object.keys(bySchool).length) {
    container.innerHTML = '<div class="empty" style="padding:32px;">לא נמצאו מורים</div>';
    return;
  }

  const today = new Date();
  /* 24.9.26 (בקשת מיטל): "המורים שלי צריך להיות מקופל" — כל בית ספר מתקפל,
     וסגור כברירת מחדל. בחיפוש או בבחירת בית ספר — פתוח, כדי שהתוצאה תיראה מיד. */
  const groups = Object.values(bySchool).sort((a, b) => a.name.localeCompare(b.name, 'he'));
  const forceOpen = !!(search || schoolSel || groups.length === 1);
  const allOpen = forceOpen || groups.every(g => teOpenSchools.has(g.name));
  container.innerHTML = `
    <div class="te-foldbar">
      <span><b>${filtered.length}</b> מורים ב-<b>${groups.length}</b> בתי ספר${forceOpen ? '' : ' · לוחצים על בית ספר כדי לראות את המורים'}</span>
      ${forceOpen ? '' : `<button type="button" class="btn btn-secondary" id="te-fold-all" style="padding:6px 12px; font-size:13px;">${allOpen ? 'קיפול כל בתי הספר' : 'פתיחת כל בתי הספר'}</button>`}
    </div>` + groups
    .map(group => {
    const teachersHtml = group.teachers.map(t => `
      <tr>
        <td class="name-cell">
          <div class="te-row-head">
            <span class="te-name-text">${escapeHtml(t.name)}</span>
            <span class="track-chip ${t.type === 'gemer' ? 'gemer' : 'bagrut'}">${t.type === 'gemer' ? 'גמר' : 'בגרות'}</span>
            ${unitsControl(t)}
            <span class="te-actions">
              <button class="te-icon" title="עריכת מורה" onclick='editTeacherById(${JSON.stringify(String(t.id))})'>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
              </button>
              <button class="te-icon te-icon-danger" title="הסרת מורה" onclick='deleteTeacherById(${JSON.stringify(String(t.id))}, ${JSON.stringify(String(t.name))})'>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </span>
          </div>
          ${t.notes ? `<div class="te-note" onclick='editNoteById(${JSON.stringify(String(t.id))})' title="עריכת ההערה">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>${escapeHtml(t.notes)}</span>
          </div>` : `<button class="te-addnote" onclick='editNoteById(${JSON.stringify(String(t.id))})'>+ הוספת הערה</button>`}
        </td>
        ${state.trainings.map(tr => attCell(t.attendance[tr.id], tr.date, today)).join('')}
        ${t.stats.total ? `<td class="rate-cell ${rateClass(t.stats.rate)}">${t.stats.rate}%</td>` : '<td class="rate-cell">—</td>'}
      </tr>
    `).join('');
    return `
      <details class="school-group" data-school="${escapeHtml(group.name)}"${forceOpen || teOpenSchools.has(group.name) ? ' open' : ''}>
        <summary class="school-header">
          <span class="te-sh"><svg class="mm-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg><h3>${escapeHtml(group.name)}</h3></span>
          <span class="meta">
            <span class="net-chip ${group.networkColor}">${escapeHtml(group.network || group.networkColor)}</span>
            · ${group.teachers.length} מורים
          </span>
        </summary>
        <div class="table-wrap" style="border:none;">
          <table class="att-grid">
            <thead>
              ${monthHeaderRow()}
              <tr>
                <th style="text-align:right;">שם המורה</th>
                ${state.trainings.map(tr => `<th class="att-cell" title="${escapeHtml(tr.notes || '')}">${shortDate(tr.date)}</th>`).join('')}
                <th>נוכחות</th>
              </tr>
            </thead>
            <tbody>${teachersHtml}</tbody>
          </table>
        </div>
      </details>
    `;
  }).join('');
  // הפתיחה נזכרת בין ציורים (סינון מסלול, שמירת רמה) — אבל לא בזמן חיפוש
  container.querySelectorAll('details.school-group').forEach(d => d.addEventListener('toggle', () => {
    if (forceOpen) return;
    if (d.open) teOpenSchools.add(d.dataset.school); else teOpenSchools.delete(d.dataset.school);
    const b = document.getElementById('te-fold-all');
    if (b) b.textContent = groups.every(g => teOpenSchools.has(g.name)) ? 'קיפול כל בתי הספר' : 'פתיחת כל בתי הספר';
  }));
  const foldAll = document.getElementById('te-fold-all');
  if (foldAll) foldAll.addEventListener('click', () => {
    const open = !groups.every(g => teOpenSchools.has(g.name));
    groups.forEach(g => { if (open) teOpenSchools.add(g.name); else teOpenSchools.delete(g.name); });
    renderTeachers();
  });
}

// בורר בית הספר — לפי א"ב, עם מספר המורים. בית ספר שנבחר ונעלם מהסינון (מסלול
// אחר) מתאפס, אחרת הרשימה נשארת ריקה בלי סיבה נראית.
function renderSchoolSelect(teachers) {
  const el = document.getElementById('teacher-school');
  if (!el) return '';
  const counts = {};
  teachers.forEach(t => { const k = t.schoolName || '— ללא שיוך —'; counts[k] = (counts[k] || 0) + 1; });
  const names = Object.keys(counts).sort((a, b) => a.localeCompare(b, 'he'));
  let cur = el.value;
  if (cur && !counts[cur]) cur = '';
  el.innerHTML = `<option value="">כל בתי הספר (${names.length})</option>` +
    names.map(n => `<option value="${escapeHtml(n).replace(/"/g, '&quot;')}">${escapeHtml(n)} · ${counts[n]}</option>`).join('');
  el.value = cur;
  return cur;
}

function attCell(att, trainingDate, today) {
  const trDate = new Date(trainingDate);
  if (trDate > today) {
    return '<td class="att-cell"><span class="att-mark future" title="עתידי">·</span></td>';
  }
  if (att && att.status === 'na') return '<td class="att-cell"><span class="att-mark future" title="מפגש במקצוע אחר">·</span></td>';
  if (!att) return '<td class="att-cell"><span class="att-mark absent" title="לא נוכחה">—</span></td>';
  if (att.status === 'present') return '<td class="att-cell"><span class="att-mark present" title="נוכחה">V</span></td>';
  if (att.status === 'partial') return '<td class="att-cell"><span class="att-mark partial" title="חצי נוכחות">½</span></td>';
  const title = att.notes ? att.notes.replace(/"/g, '&quot;') : 'לא נוכחה';
  return `<td class="att-cell"><span class="att-mark absent" title="${title}">—</span></td>`;
}

/* שורת החודשים מעל שורת המועדים: "ספטמבר · הדרכה אחת" מעל 15.9 ו-16.9.
   ככה רואים גם כל מועד שהתקיים, וגם שהם הדרכה אחת לצורך הספירה. */
function monthHeaderRow() {
  const cols = state.trainings;
  if (!cols.some(t => t.monthKey)) return '';
  const groups = [];
  cols.forEach(t => {
    const k = t.monthKey || '';
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.n++;
    else groups.push({ key: k, n: 1 });
  });
  return `<tr class="month-head">
      <th></th>
      ${groups.map(gp => `<th class="att-cell" colspan="${gp.n}">${gp.key
        ? escapeHtml(monthShort(gp.key)) + (gp.n > 1 ? ` <small>· ${gp.n} מועדים · הדרכה אחת בספירה</small>` : '')
        : ''}</th>`).join('')}
      <th></th>
    </tr>`;
}

// שם החודש לכותרת העמודה — עמודה אחת לכל הדרכה חודשית
function monthShort(key) {
  const full = window.TS_meetMonthLabel ? window.TS_meetMonthLabel(key) : key;
  return full.replace(/ \d{4}$/, '');
}

// יום.חודש — שני מפגשים באותו חודש (15.9 ו-16.9) נראו בפורמט חודש/שנה כעמודה כפולה
function shortDate(d) {
  const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return Number(m[3]) + '.' + Number(m[2]);
  const dt = new Date(d);
  return dt.getDate() + '.' + (dt.getMonth() + 1);
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
  if (!state.trainings.length) {
    list.innerHTML = '<div class="empty" style="padding:32px;">אין הדרכות עדיין. נוכחות שמסמנים במקטע "החודש" תופיע כאן.</div>';
    return;
  }
  const baseUrl = location.origin + location.pathname.replace(/\/guide\/?$/, '');
  const today = new Date();
  list.innerHTML = state.trainings.map(t => {
    const trDate = new Date(t.date);
    const isFuture = trDate >= today;
    const checkinUrl = t.qrToken
      ? baseUrl + '/checkin/?t=' + encodeURIComponent(t.qrToken)
      : '';
    const presentCount = state.teachers.filter(tch => {
      const a = tch.attendance[t.id];
      return a && a.status === 'present';
    }).length;
    if (t.virtual) {
      const pool = state.teachers.filter(tch => !t.subject || tch.subject === t.subject).length;
      const mo = (state.months || []).find(x => x.key === t.monthKey);
      const sameMonth = mo && mo.dates.length > 1;
      return `
      <div class="training-row">
        <div>
          <div class="when">${TS.formatDate(t.date)}</div>
          <div class="where">${escapeHtml(t.notes || 'מפגש הדרכה')}<br><span style="color:var(--text-muted)">${escapeHtml(
            monthShort(t.monthKey) + (sameMonth ? ' · אחד מ-' + mo.dates.length + ' מועדים של אותה הדרכה' : ''))}</span></div>
        </div>
        <div class="actions">
          <span style="color:var(--text-2); font-size:13px;">${presentCount} מתוך ${pool} נוכחו</span>
          <button type="button" class="btn btn-secondary" onclick="goTab('meet')">לרשימת הנוכחות</button>
        </div>
      </div>`;
    }
    return `
      <div class="training-row">
        <div>
          <div class="when">${TS.formatDate(t.date)}</div>
          <div class="where">${escapeHtml(t.location || '—')} · ${escapeHtml(t.notes || '')}</div>
        </div>
        <div class="actions">
          ${!isFuture ? `<span style="color:var(--text-2); font-size:13px;">${presentCount} מתוך ${state.teachers.length} נוכחו</span>` : ''}
          ${isFuture && checkinUrl ? `
            <button class="copy-link-btn" data-url="${checkinUrl}" onclick="copyCheckinUrl(this)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              העתק קישור צ'ק-אין
            </button>` : ''}
          ${!isFuture ? `<a class="btn btn-secondary" href="attendance.html?training=${t.id}">רישום ידני</a>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function copyCheckinUrl(btn) {
  const url = btn.dataset.url;
  navigator.clipboard.writeText(url).then(() => {
    const original = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> הקישור הועתק';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = original;
    }, 2200);
  });
}

function renderStats() {
  const container = document.getElementById('stats-chart');
  if (!container) return;   // "סטטיסטיקה חודשית" הוסרה מהעמוד (24.9.26)
  if (!state.trainings.length || !state.teachers.length) {
    container.innerHTML = '<div class="empty">אין מספיק נתונים</div>';
    return;
  }
  const rows = state.trainings.map(t => {
    const present = state.teachers.filter(tch => {
      const a = tch.attendance[t.id];
      return a && a.status === 'present';
    }).length;
    const total = state.teachers.filter(tch => !t.subject || tch.subject === t.subject).length || 1;
    const rate = Math.round((present / total) * 100);
    return { date: t.date, label: TS.formatDate(t.date), present, total, rate };
  });
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
      ${rows.map(r => `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:4px;">
            <span><strong>${r.label}</strong></span>
            <span style="color:var(--text-2);">${r.present} / ${r.total} (${r.rate}%)</span>
          </div>
          <div style="background:var(--surface-2); border-radius:6px; height:20px; overflow:hidden;">
            <div style="background:${r.rate>=80?'var(--ok)':r.rate>=50?'#f59e0b':'var(--err)'};
                        width:${r.rate}%; height:100%; transition:width .3s;"></div>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:20px; padding:12px; background:var(--surface-2); border-radius:8px; color:var(--text-2); font-size:13px;">
      <strong>יעד נוכחות:</strong> 80%. מורים מתחת ל-50% נוכחות שנתית נחשבים בסיכון.
    </div>
  `;
}

/* ============================================================
   שאלות מהמורים (24.9.26) — מה שמורה שולח/ת ב"שאלה למדריכ/ה" במבט המורה
   (questions.create). השרת מחזיר את כל השאלות, ולכן מסננים כאן לפי המורים
   של הקבוצה. תשובה נשמרת ב-questions.answer ומופיעה למורה באותו מקום.
   ============================================================ */
let questionsData = null, questionsLoading = false, qDrafts = {};
async function loadQuestions() {
  if (questionsLoading) return;
  questionsLoading = true;
  const res = await TS.api('questions.list', {}, { cache: 'no' });
  questionsLoading = false;
  questionsData = (res && res.ok && Array.isArray(res.data)) ? res.data : (questionsData || []);
  if (!(res && res.ok)) questionsData.failed = true;
  renderQuestions();
}
function renderQuestions() {
  const box = document.getElementById('q-root');
  if (!box) return;
  if (!state.teachers.length) return;
  if (questionsData === null) { loadQuestions(); return; }
  const byId = {};
  state.teachers.forEach(t => { byId[String(t.id)] = t; });
  const mine = questionsData.filter(q => byId[String(q.teacherId)])
    .sort((a, b) => (a.status === 'answered') - (b.status === 'answered') ||
      String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const openN = mine.filter(q => q.status !== 'answered').length;
  const badge = document.getElementById('q-count');
  if (badge) { badge.hidden = !openN; badge.textContent = openN + (openN === 1 ? ' שאלה מחכה לתשובה' : ' שאלות מחכות לתשובה'); }
  if (!mine.length) {
    box.innerHTML = `<div class="empty" style="padding:18px; line-height:1.8;">${questionsData.failed
      ? 'השאלות לא נטענו כרגע — תקלה רגעית בשרת. <button type="button" class="mh-edit" id="q-retry">לנסות שוב</button>'
      : 'עדיין אין שאלות. מורה ששואל/ת ב"שאלה למדריכ/ה" במבט המורה — השאלה תופיע כאן.'}</div>`;
    const r = document.getElementById('q-retry');
    if (r) r.addEventListener('click', () => { questionsData = null; renderQuestions(); });
    return;
  }
  box.innerHTML = mine.map(q => {
    const t = byId[String(q.teacherId)];
    const answered = q.status === 'answered';
    return `
      <div class="q-item${answered ? '' : ' open'}" data-q="${escapeHtml(q.id)}">
        <div class="q-meta"><span><b>${escapeHtml(t.name)}</b> · ${escapeHtml(t.schoolName || '')}</span>
          <span>${q.createdAt ? TS.formatDate(q.createdAt) : ''} · ${answered ? 'נענתה' : 'מחכה לתשובה'}</span></div>
        <div class="q-text">${escapeHtml(q.question || '')}</div>
        ${answered ? `<div class="q-ans"><b>התשובה שלך:</b> ${escapeHtml(q.answer || '')}</div>` : `
        <div class="q-form">
          <textarea class="textarea" data-qa="${escapeHtml(q.id)}" placeholder="התשובה תופיע למורה במבט המורה">${escapeHtml(qDrafts[q.id] || '')}</textarea>
          <button type="button" class="btn btn-primary" data-qsend="${escapeHtml(q.id)}">שליחת תשובה</button>
        </div>`}
      </div>`;
  }).join('');
  box.querySelectorAll('[data-qa]').forEach(ta => ta.addEventListener('input', () => { qDrafts[ta.dataset.qa] = ta.value; }));
  box.querySelectorAll('[data-qsend]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.qsend;
    // מבט המורה מציג את התשובה כ-HTML — שולחים טקסט נקי בלבד
    const answer = String(qDrafts[id] || '').replace(/[<>]/g, '').trim();
    if (!answer) { TS.toast('כותבים תשובה ואז שולחים'); return; }
    b.disabled = true; b.textContent = 'שולח…';
    const res = await TS.apiPost('questions.answer', { id: id, answer: answer });
    if (res && res.ok) {
      const q = questionsData.find(x => String(x.id) === String(id));
      if (q) { q.answer = answer; q.status = 'answered'; q.answeredAt = new Date().toISOString(); }
      delete qDrafts[id];
      TS.toast('התשובה נשלחה למורה');
      renderQuestions();
    } else {
      b.disabled = false; b.textContent = 'שליחת תשובה';
      TS.toast('התשובה לא נשלחה — לנסות שוב');
    }
  }));
}

/* ============================================================
   תוכנית שנתית — מועדי מפגשי ההדרכה (assets/plans.js)
   הלשונית מוצגת רק למדריכ/ה שיש לה תוכנית רשומה.
   ============================================================ */
function renderPlan() {
  const box = document.getElementById('plan-container');
  const tabBtn = document.getElementById('tool-plan');
  if (!box) return;
  const plan = window.TS_planFor ? window.TS_planFor(guideSlug) : null;
  if (!plan) { if (tabBtn) tabBtn.hidden = true; return; }
  if (tabBtn) tabBtn.hidden = false;

  const next = window.TS_nextMeeting ? window.TS_nextMeeting(plan) : null;
  const ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
  const ICON_FLAG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';

  const head = `
    <div class="plan-head">
      <h2>${escapeHtml(plan.title)}</h2>
      <p>${escapeHtml(plan.subtitle || '')}${plan.timeNote ? ' · ' + escapeHtml(plan.timeNote) : ''}</p>
      <div class="plan-next ${next ? '' : 'done'}">
        ${ICON_CAL}
        <span>${next
          ? 'המפגש הבא: ' + escapeHtml(next.label) + ' · ' + escapeHtml(next.time) + ' — ' + escapeHtml(next.topic)
          : 'כל מפגשי השנה התקיימו'}</span>
      </div>
    </div>`;

  const rows = plan.meetings.map(m => {
    const isNext = next && m.date === next.date;
    const isPast = next ? m.date < next.date : true;
    return `
      <div class="plan-item ${isNext ? 'next' : ''} ${isPast ? 'past' : ''}">
        <div class="plan-when">
          <span class="plan-date">${escapeHtml(m.label)}</span>
          ${m.day ? `<span class="plan-day">יום ${escapeHtml(m.day)}</span>` : ''}
          ${m.month ? `<span class="plan-day">${escapeHtml(m.month)}</span>` : ''}
          <span class="plan-time">${escapeHtml(m.time)}</span>
        </div>
        <div class="plan-body">
          ${isNext ? '<span class="plan-badge">המפגש הבא</span>' : ''}
          <strong>${escapeHtml(m.topic)}</strong>
          ${m.goal ? `<span class="goal">${escapeHtml(m.goal)}</span>` : ''}
          ${m.examples ? `<span class="ex">דוגמאות: ${escapeHtml(m.examples)}</span>` : ''}
          ${m.note ? `<span class="note">${ICON_FLAG}${escapeHtml(m.note)}</span>` : ''}
        </div>
      </div>`;
  }).join('');

  const notes = (plan.notes && plan.notes.length)
    ? `<div class="plan-notes"><strong>הערות לתוכנית</strong><ul>${
        plan.notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>${
        plan.source ? `<div style="margin-top:8px;font-size:12px;opacity:.8">${escapeHtml(plan.source)}</div>` : ''}</div>`
    : (plan.source ? `<div class="plan-notes" style="font-size:12px;opacity:.85">${escapeHtml(plan.source)}</div>` : '');

  box.innerHTML = head + '<div class="plan-list">' + rows + '</div>' + notes;
}

/* ===== חומרים וקישורים (Drive / זום / שליחת חומרים) ===== */
function renderResources() {
  const card = document.getElementById('resources-card');
  const grid = document.getElementById('resources-grid');
  if (!card || !grid) return;
  const items = [];
  if (GUIDE_CFG.drive) {
    items.push(`<a class="resource-link" href="${GUIDE_CFG.drive}" target="_blank" rel="noopener">
      <span class="ic drive"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-3H5a2 2 0 0 0-2 2z"/></svg></span>
      <span class="tx"><strong>חומרי ההוראה ב-Drive</strong><span>פתיחת התיקייה</span></span></a>`);
  }
  if (GUIDE_CFG.zoom) {
    items.push(`<a class="resource-link" href="${GUIDE_CFG.zoom}" target="_blank" rel="noopener">
      <span class="ic zoom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l5-3v10l-5-3v-4z"/><rect x="3" y="6" width="12" height="12" rx="2"/></svg></span>
      <span class="tx"><strong>הזום הקבוע</strong><span>כניסה למפגש</span></span></a>`);
  }
  if (GUIDE_CFG.drive) {
    items.push(`<button type="button" class="resource-link" onclick="sendMaterials(this)">
      <span class="ic send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></span>
      <span class="tx"><strong>שליחת חומרים למורים</strong><span>העתקת הודעה מוכנה לוואטסאפ</span></span></button>`);
  }
  const tool = document.getElementById('tool-links');
  if (!items.length) { card.hidden = true; if (tool) tool.hidden = true; return; }
  grid.innerHTML = items.join('');
  card.hidden = false;
}

function sendMaterials(btn) {
  // שני מקצועות → "חומרי ההוראה להיסטוריה ואזרחות"
  const subject = (window.TS_guideSubjects ? window.TS_guideSubjects(GUIDE_CFG) : [])
    .filter(Boolean).join(' ו') || GUIDE_CFG.subject || '';
  const lines = ['שלום,', '', `מצורפים חומרי ההוראה${subject ? ' ל' + subject : ''}:`, GUIDE_CFG.drive];
  if (GUIDE_CFG.zoom) lines.push('', 'הזום הקבוע למפגשים:', GUIDE_CFG.zoom);
  lines.push('', 'בהצלחה!');
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    const tx = btn.querySelector('.tx span');
    const orig = tx ? tx.textContent : '';
    btn.classList.add('copied');
    if (tx) tx.textContent = '✓ ההודעה הועתקה — הדביקי בוואטסאפ';
    setTimeout(() => { btn.classList.remove('copied'); if (tx) tx.textContent = orig; }, 2600);
  });
}

/* ===== הוספה / עריכת מורה ===== */
function editTeacherById(id) {
  const t = state.teachers.find(x => String(x.id) === String(id));
  if (t) openTeacherModal(t);
}

// פתיחת המודאל עם פוקוס ישיר על שדה ההערה
function editNoteById(id) {
  const t = state.teachers.find(x => String(x.id) === String(id));
  if (!t) return;
  openTeacherModal(t);
  const notes = document.getElementById('te-notes');
  if (notes) { notes.focus(); notes.scrollIntoView({ block: 'center' }); }
}

// הסרת מורה
async function deleteTeacherById(id, name) {
  if (!confirm('להסיר את ' + (name || 'המורה') + ' מהרשימה?\nהפעולה אינה הפיכה.')) return;

  if (!TS.getAppsScriptUrl()) {
    TS.toast('אין חיבור לשרת — לא ניתן להסיר');
    return;
  }
  const res = await TS.apiPost('teachers.delete', { id });
  if (res.ok) {
    TS.toast('המורה הוסרה');
    await loadData();
  } else {
    TS.toast('שגיאה — ' + (res.error || ''));
  }
}
function openTeacherModal(teacher) {
  const f = document.getElementById('form-teacher');
  f.reset();
  document.getElementById('te-id').value = teacher ? (teacher.id || '') : '';
  document.getElementById('teacher-modal-title').textContent = teacher ? 'עריכת מורה' : 'הוספת מורה';
  fillSchoolSelect(teacher);
  if (teacher) {
    document.getElementById('te-name').value = teacher.name || '';
    document.getElementById('te-network').value = (teacher.network || '').replace(/^net_/, '');
    /* הטלפון מגיע ל-teachers.list הפתוח ממוסך ("•••993"). עד 17.9.26 הוא הוצג
       בשדה, וכל עריכה כתבה את הכוכביות לגיליון במקום המספר (קרה בפועל למורה
       אחד). מוצג ריק עם הסבר — ומה שריק לא נשלח ולא דורס. */
    const ph = document.getElementById('te-phone');
    const masked = /[•]/.test(teacher.phone || '');
    ph.value = masked ? '' : (teacher.phone || '');
    ph.placeholder = masked ? 'שמור במערכת — למילוי רק כדי להחליף' : '05...';
    document.getElementById('te-email').value = teacher.email || '';
    document.getElementById('te-notes').value = teacher.notes || '';
  }
  const typeSel = document.getElementById('te-type');
  if (typeSel) typeSel.value = teacher && teacher.type === 'gemer' ? 'gemer' : 'bagrut';
  const unitsSel = document.getElementById('te-units');
  if (unitsSel) {
    unitsSel.value = teacher ? (teacher.units || '') : '';
    // מדריכה של קבוצה מפוצלת — מורה חדש נפתח כברירת מחדל ברמה שלה
    if (!teacher && guideUnits() && guideUnits().length === 1) unitsSel.value = guideUnits()[0];
  }
  fillSubjectRow(teacher);
  toggleUnitsRow();
  setEmailField(!teacher);
  document.getElementById('modal-teacher').classList.add('open');
}

/* ===== בית ספר מרשימה סגורה (17.9.26, בקשת מוריה) =====
   עד היום השדה היה טקסט חופשי: המורה נשמר עם השם שאמר ("אור מנחם עתיד
   אשקלון") ובלי מזהה בית ספר. בלי מזהה הוא לא נספר לבית הספר, לא מגיע
   לטופס האימות של המנהל, מקבל מגזר ברירת מחדל, וההגנה מכפילויות בשרת
   (לפי מזהה + שם + מקצוע + מסלול) לא חלה — ולכן כל לחיצה חוזרת יצרה שורה.
   הרשימה: schools.list, מסוננת למגזרים של המדריכה (sector-map-2027.json). */
let SCHOOLS = null;              // [{ id, name, network, sector }]
let schoolsLoading = null;
function loadSchools() {
  if (SCHOOLS) return Promise.resolve(SCHOOLS);
  if (schoolsLoading) return schoolsLoading;
  schoolsLoading = Promise.all([
    TS.api('schools.list', {}),
    fetch('../_data/sector-map-2027.json').then(r => r.json()).catch(() => ({}))
  ]).then(([res, map]) => {
    const sectorById = {};
    ((map && map.schools) || []).forEach(x => { sectorById[x.id] = x.sector; });
    if (!res || !res.ok) { schoolsLoading = null; return null; }
    SCHOOLS = (res.data || []).map(x => ({
      id: String(x.id), name: String(x.name || '').trim(),
      network: String(x.network || '').replace(/^net_/, ''),
      sector: sectorById[x.id] || ''
    })).filter(x => x.id && x.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'he'));
    return SCHOOLS;
  });
  return schoolsLoading;
}
function schoolById(id) { return (SCHOOLS || []).find(x => x.id === String(id || '')) || null; }

function fillSchoolSelect(teacher) {
  const sel = document.getElementById('te-school');
  const hint = document.getElementById('te-school-hint');
  if (!sel) return;
  const cur = teacher ? String(teacher.school || '') : '';
  const draw = () => {
    const secs = GUIDE_CFG.sectors || null;
    const list = (SCHOOLS || []).filter(x => !secs || !x.sector || secs.indexOf(x.sector) >= 0 || x.id === cur);
    sel.innerHTML = '<option value="">בחרי בית ספר מהרשימה</option>' +
      list.map(x => `<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('');
    sel.value = cur && schoolById(cur) ? cur : '';
    sel.onchange = () => {
      const s = schoolById(sel.value);
      if (s && s.network) document.getElementById('te-network').value = s.network;
      if (hint) hint.hidden = true;
    };
    // מורה ישן שנשמר בשם חופשי — מראים מה נכתב, כדי שיהיה קל לבחור את הנכון
    if (hint) {
      const free = teacher && !schoolById(cur) && teacher.schoolName && teacher.schoolName !== '— ללא שיוך —';
      hint.textContent = free ? 'רשום כרגע: "' + teacher.schoolName + '" — בחרי את בית הספר הרשמי מהרשימה' : '';
      hint.hidden = !free;
    }
  };
  if (SCHOOLS) { draw(); return; }
  sel.innerHTML = '<option value="">טוען את רשימת בתי הספר…</option>';
  loadSchools().then(list => {
    if (list) draw();
    else sel.innerHTML = '<option value="">הרשימה לא נטענה — סגרי ופתחי שוב</option>';
  });
}

/* מייל המורה — רשות (17.9.26, החלטת מיטל לבקשת מוריה). ב-14.9.26 נקבע חובה,
   אבל למדריכה לא תמיד יש את המייל. מורה שנשמר בלי מייל מסומן בטופס האימות
   של המנהל/ת (verify.html), שחוסם את האישור עד שלכולם יש מייל.
   בעריכה: הרשימה כאן מגיעה מ-teachers.list הפתוח, שבו השרת ממסך את המייל
   ל-'' — ריק בעריכה לא דורס (updateTeacher מדלג על ריק). */
const TE_EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
function setEmailField(isNew) {
  const inp = document.getElementById('te-email');
  const label = document.getElementById('te-email-label');
  const err = document.getElementById('te-email-err');
  const note = document.getElementById('te-email-note');
  if (!inp) return;
  if (label) label.textContent = 'מייל';
  if (note) note.hidden = !isNew;
  inp.placeholder = isNew ? 'name@example.com' : 'להשאיר ריק כדי לא לשנות את המייל הקיים';
  inp.style.borderColor = '';
  if (err) { err.hidden = true; err.textContent = ''; }
  inp.oninput = () => { inp.style.borderColor = ''; if (err) err.hidden = true; };
  // type="email" — הדפדפן עוצר את השליחה לפני submitTeacher ומציג בועה משלו.
  // מבטלים את הבועה ומציגים את אותה הודעה אדומה כמו בשאר המקרים.
  inp.oninvalid = ev => {
    ev.preventDefault();
    if (err) { err.textContent = 'המייל לא תקין'; err.hidden = false; }
    inp.style.borderColor = '#D97757';
    inp.focus();
  };
}
function emailProblem(email) {
  const v = (email || '').trim();
  if (!v) return '';
  return TE_EMAIL_RE.test(v) ? '' : 'המייל לא תקין';
}

/* שורת המקצוע — רלוונטית רק למדריכה עם יותר ממקצוע אחד.
   בלעדיה כל מורה שרבקה תזין היה נשמר בהיסטוריה, גם אם הוא מורה לאזרחות. */
function fillSubjectRow(teacher) {
  const row = document.getElementById('te-subject-row');
  const sel = document.getElementById('te-subject');
  if (!row || !sel) return;
  const subs = (window.TS_guideSubjects ? window.TS_guideSubjects(GUIDE_CFG) : []).filter(Boolean);
  if (subs.length < 2) { row.hidden = true; sel.innerHTML = ''; return; }
  sel.innerHTML = subs.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  sel.value = (teacher && subs.indexOf(teacher.subject) >= 0) ? teacher.subject : subs[0];
  row.hidden = false;
}
function closeTeacherModal() {
  document.getElementById('modal-teacher').classList.remove('open');
}

// שורת היח"ל במודל מוסתרת בגמר — אין בו יחידות לימוד
function toggleUnitsRow() {
  const row = document.getElementById('te-units-row');
  const typeSel = document.getElementById('te-type');
  if (!row || !typeSel) return;
  row.hidden = typeSel.value === 'gemer';
}
async function submitTeacher(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  /* מדריכה רב-מקצועית בחרה מקצוע בטופס — לא דורסים אותו.
     במקצוע יחיד השדה מוסתר וריק, והמקצוע נקבע מהקונפיג כמו תמיד. */
  const mySubs = (window.TS_guideSubjects ? window.TS_guideSubjects(GUIDE_CFG) : []).filter(Boolean);
  if (!(mySubs.length > 1 && data.subject)) {
    data.subject = GUIDE_CFG.subject || state.subject || '';
  }
  data.guide = guideEmail || (GUIDE_CFG.email || '');
  const editing = !!data.id;

  // בית הספר קובע שם רשמי, רשת ומגזר. בלי מגזר נכון המורה לא מופיע
  // אצל המדריכה הנכונה ולא בדשבורדים הארציים.
  const school = schoolById(data.school);
  if (!school) {
    TS.toast('יש לבחור בית ספר מהרשימה');
    document.getElementById('te-school').focus();
    return;
  }
  data.schoolName = school.name;
  if (school.network) data.network = school.network;
  if (school.sector) data.sector = school.sector;
  else if (GUIDE_CFG.sectors && GUIDE_CFG.sectors.length === 1) data.sector = GUIDE_CFG.sectors[0];
  // Google Sheets הופך "4-5" לתאריך ו-"3" למספר — חייבים לעבור דרך unitsForWrite
  if (data.units) data.units = TS.unitsForWrite(data.units);

  data.email = (data.email || '').trim();
  const problem = emailProblem(data.email);
  if (problem) {
    const inp = document.getElementById('te-email');
    const err = document.getElementById('te-email-err');
    if (err) { err.textContent = problem; err.hidden = false; }
    if (inp) { inp.style.borderColor = '#D97757'; inp.focus(); }
    return;
  }
  if (!data.email) delete data.email;   // לא שולחים ריק
  if (!data.phone || /[•]/.test(data.phone)) delete data.phone;   // ריק או ממוסך — לא דורסים

  if (!TS.getAppsScriptUrl()) {
    TS.toast('אין חיבור לשרת — לא ניתן לשמור');
    return;
  }

  /* שמירה כפולה (17.9.26) — מוריה לחצה שוב כשהתשובה לא חזרה, ואייל גונן
     נשמר שלוש פעמים. שלוש שכבות: (1) הכפתור ננעל בזמן השמירה; (2) המפתח
     של בית הספר מפעיל את ההגנה מכפילויות בשרת; (3) תשובה שנפלה בדרך
     (Apps Script מחזיר מדי פעם דף HTML) נבדקת מול השרת לפני שמכריזים כישלון —
     הכתיבה כמעט תמיד כבר בוצעה. */
  const btn = document.getElementById('te-submit');
  if (btn && btn.disabled) return;
  if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'שומר…'; }
  let saved = false;
  try {
    const res = await TS.apiPost(editing ? 'teachers.update' : 'teachers.create', data);
    saved = !!res.ok;
    if (!saved && !editing) saved = await teacherLanded(data);
    if (saved) {
      TS.toast((editing ? 'המורה עודכן' : 'המורה נוסף') +
        (!editing && !data.email ? ' · בלי מייל — המנהל/ת יתבקש/תתבקש להשלים' : ''));
      closeTeacherModal();
    } else {
      TS.toast('לא נשמר — ' + (res.error === 'bad_response' || res.transient
        ? 'תקלה רגעית בשרת. אפשר ללחוץ שוב על "שמירה"' : (res.error || '')));
    }
  } finally {
    // משחררים לפני רענון הרשימה: הרענון לוקח כמה שניות, ובבדיקה הכפתור
    // נשאר "שומר…" גם בחלון הבא ונראה תקוע.
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'שמירה'; }
  }
  if (saved) await loadData({ fresh: true });
}

// האם המורה בכל זאת נכתב? בדיקה ישירה מול רשימת בית הספר, בלי מטמון.
async function teacherLanded(data) {
  const res = await TS.api('teachers.list', { school: data.school }, { cache: 'no' });
  if (!res || !res.ok) return false;
  const name = (data.name || '').trim();
  const type = data.type === 'gemer' ? 'gemer' : 'bagrut';
  return (res.data || []).some(t =>
    (t.name || '').trim() === name && t.subject === data.subject &&
    (t.type === 'gemer' ? 'gemer' : 'bagrut') === type);
}

function openNewTraining() {
  document.getElementById('form-training').reset();
  document.getElementById('t-date').value = new Date().toISOString().slice(0,10);
  populateSubjects('t-subject');
  document.getElementById('modal-training').classList.add('open');
}
function closeNewTraining() {
  document.getElementById('modal-training').classList.remove('open');
}
function populateSubjects(id) {
  const sel = document.getElementById(id);
  if (sel.options.length > 1) return;
  TS.SUBJECTS.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;   // דרך ה-DOM — הגרשיים של תנ"ך לא שוברות attribute
    sel.appendChild(opt);
  });
}

async function submitTraining(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  const res = await TS.apiPost('training.create', data);
  if (res.ok) {
    TS.toast('ההדרכה נוצרה');
    closeNewTraining();
    await loadData();
  } else {
    TS.toast('שגיאה');
  }
}
