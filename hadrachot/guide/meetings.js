/* ============================================================
   נוכחות במפגשים — הצד של המדריכ/ה (14.9.26)
   -----------------------------------------------------------
   המפגשים בזום. המדריכ/ה מסמנ/ת נוכחות מתוך רשימת הקבוצה — זו הרשימה
   הקובעת. גיבוי: בזמן המפגש פותחים "רישום עצמי", מקרינים קוד בן 4 ספרות
   שמתחלף כל 5 דקות (גם הקוד הקודם מתקבל), והמורים נרשמים בעמוד mifgash/?g=<slug>. רישום עצמי מופיע
   כאן כ"ממתין לאישור" ולא נספר עד שמאשרים.

   הרשאה: מפתח k בקישור האישי (נוצר ב-admin-guides.html). נשמר במכשיר,
   כדי שקישור ישן שנפתח אחר כך מאותו מכשיר ימשיך לעבוד.
   נטען אחרי dashboard.js ומשתמש ב-GUIDE_CFG, ב-state וב-myTeachers שלו.
   צד השרת: meet.* / checkin.* בסוף apps-script/code.gs.

   24.9.26 (בקשת מיטל): "רישום הנוכחות צריך להיות הרבה יותר פשוט".
   במקום בורר מפגש אחד — רשימה לפי חודשים (כל חודש מתקפל), ובתוכה כל
   **יום מפגש** בשורה משלו: תאריך · יום · שעות/מסלולים · נושא. ליד כל שורה:
   "פתיחת הרישום" (ביום המפגש) → הקוד הגדול בתוך השורה + "סגירת הרישום",
   ו"סימון נוכחות" שפותח מתחת לשורה את הסימון הידני של אותו מועד.
   יחידת הרישום בשרת היא יום (meetId_ = slug + תאריך) — לכן כל יום מפגש
   נרשם עכשיו תחת התאריך שלו, ולא תחת היום הראשון של החודש כמו קודם.
   מועדים באותו יום (16:00/17:00/18:00 אצל מוריה) הם שורה אחת: לשרת אין
   דרך להבדיל ביניהם, וקוד פתוח אחד משרת את כל מועדי היום.
   ============================================================ */
(function () {
  const SLUG = (typeof GUIDE_CFG !== 'undefined' && GUIDE_CFG.slug) || '';
  const ARAB = !!(GUIDE_CFG && GUIDE_CFG.sectors && GUIDE_CFG.sectors.indexOf('arab') >= 0);
  const POLL_MS = 20000;
  const CODE_REFRESH_MS = 100000;

  let KEY = '';
  try {
    const fromUrl = TS.urlParam('k', '');
    if (fromUrl) { localStorage.setItem('ts.meet.k.' + SLUG, fromUrl); KEY = fromUrl; }
    else KEY = localStorage.getItem('ts.meet.k.' + SLUG) || '';
  } catch (e) { KEY = TS.urlParam('k', ''); }

  // המייל שכבר בקישור האישי (&guide=) — מספיק לזיהוי בשרת, בלי מפתח
  const GE = (typeof guideEmail !== "undefined" && guideEmail) ? String(guideEmail) : "";
  const CAN = !!(KEY || GE);

  const PLAN = window.TS_planFor ? window.TS_planFor(SLUG) : null;

  const S = { today: localToday(), meetings: [], rows: [], rowsDate: '', loaded: false, failed: false, badKey: false };
  let sel = null;           // המועד שהסימון הידני שלו פתוח — { date, topic, source, subject, label, slots }
  let openMonths = null;    // חודשים פתוחים ('YYYY-MM'); null = ברירת המחדל (החודש הנוכחי)
  let monthsSig = '';
  let edits = {};           // entryKey → 'present' | 'absent' | 'clear'
  let live = null;          // { codes, offset, openUntil }
  let filter = 'all';
  let search = '';
  let schoolF = '';         // סינון רשימת הקבוצה לפי בית ספר
  let saving = false;
  let pollTimer = null, tickTimer = null, codeTimer = null;
  let adhocMeetings = [];
  let codeFetching = false;
  let lastCodeFetch = 0;
  let zoom = null;          // חלון ייבוא דוח הזום — ראו "ייבוא דוח משתתפים"
  let zoomMeta = {};        // entryKey → { minutes } — סימונים שבאו מהדוח
  let wrapDraft = null;     // סיכום ההדרכה בעריכה — { summary, takeaway, hours }, שורד ציור מחדש
  let wrapSaving = false;
  let wrapNote = '';

  const ICON = {
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    screen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>'
  };

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('tab-btn-meet');
    // בלי slug (קישור ישן עם ?guide= בלבד) אין תוכנית ואין רישום — המקטעים מוסתרים
    if (!SLUG) { ['sec-month', 'sec-months', 'tool-adhoc', 'tool-year'].forEach(id => { const el = document.getElementById(id); if (el) el.hidden = true; }); return; }
    renderShell();
    renderNextMeet();
    if (!CAN) { renderNoKey(); return; }
    renderMonths();
    load();
    window.addEventListener('beforeunload', e => {
      if (Object.keys(edits).length || wrapDraft) { e.preventDefault(); e.returnValue = ''; }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isLiveDay()) load();
    });
  });

  // dashboard.js קורא לזה אחרי שרשימת המורים נטענה
  window.MEET_onRoster = function () {
    renderYear();
    if (!CAN) return;
    monthsSig = '';
    renderMonths();
    if (sel) renderBody();
  };

  // ---------- הדרכה פרטנית כהשתתפות (14.9.26, החלטת מיטל) ----------
  // מורה שקיבל/ה שעה פרטנית "השתתף/ה השנה". לא נכנס לסימון של מפגש — מוצג
  // כתווית ליד השם. ודרישה: כל בית ספר בקבוצה לפחות הדרכה פרטנית אחת בשנה.
  // אותם כללים כמו ב-assets/meet-stats.js (שם + בית ספר, משנת הלימודים הנוכחית).
  let HOURS = null;   // null = השעות עוד לא נטענו (space.js)
  window.MEET_onHours = function (rows) {
    HOURS = rows || [];
    renderYear();
    if (CAN && sel && S.rowsDate === sel.date && !saving) renderBody();
    // הדשבורד סופר את החודשים הפרטניים (קביעת מיטל 20.9.26) — מחשב מחדש
    if (typeof window.DASH_onMeetings === 'function') window.DASH_onMeetings();
  };

  /* חודשי ההדרכה הפרטנית לכל אדם (שם|בית ספר) — הדשבורד מצרף אותם לספירה,
     בדיוק כמו assets/meet-stats.js. null = השעות עוד לא נטענו. */
  window.MEET_indMonths = function () {
    if (!HOURS) return null;
    const idx = individualIndex();       // מיישר שם/בית ספר באותם כללים
    const out = {};
    const teachers = (typeof myTeachers === 'function') ? myTeachers() : [];
    const byName = {};
    teachers.forEach(t => { (byName[norm(t.name)] = byName[norm(t.name)] || []).push(t); });
    const ys = yearStart();
    HOURS.forEach(h => {
      const d = String(h.date || '').slice(0, 10);
      if (!d || d < ys || d > S.today) return;
      const full = norm((h.firstName || '') + ' ' + (h.lastName || ''));
      let school = norm(h.schoolName);
      const same = (byName[full] || []);
      if (!same.some(t => norm(t.schoolName) === school) && same.length === 1) school = norm(same[0].schoolName);
      (out[full + '|' + school] = out[full + '|' + school] || new Set()).add(d.slice(0, 7));
    });
    return out;
  };
  function yearStart() {
    const [y, m] = S.today.split('-').map(Number);
    return (m >= 9 ? y : y - 1) + '-09-01';
  }
  function individualIndex() {
    const idx = { byKey: {}, bySchool: {}, sessions: 0, teachers: 0 };
    if (!HOURS) return idx;
    const teachers = (typeof myTeachers === 'function') ? myTeachers() : [];
    const byName = {};
    teachers.forEach(t => { (byName[norm(t.name)] = byName[norm(t.name)] || []).push(t); });
    const ys = yearStart();
    HOURS.forEach(h => {
      const d = String(h.date || '').slice(0, 10);
      if (!d || d < ys || d > S.today) return;
      idx.sessions++;
      const full = norm((h.firstName || '') + ' ' + (h.lastName || ''));
      let school = norm(h.schoolName);
      const same = (byName[full] || []);
      if (!same.some(t => norm(t.schoolName) === school) && same.length === 1) school = norm(same[0].schoolName);
      const key = full + '|' + school;
      if (!idx.byKey[key]) { idx.byKey[key] = 0; idx.teachers++; }
      idx.byKey[key]++;
      if (school) idx.bySchool[school] = (idx.bySchool[school] || 0) + 1;
    });
    return idx;
  }
  function renderYear() {
    const box = document.getElementById('meet-year');
    if (!box) return;
    const teachers = (typeof myTeachers === 'function') ? myTeachers() : [];
    if (!HOURS || !teachers.length) { box.innerHTML = ''; return; }
    const idx = individualIndex();
    const schools = Array.from(new Set(teachers.map(t => t.schoolName).filter(n => n && n !== '— ללא שיוך —')))
      .sort((a, b) => a.localeCompare(b, 'he'));
    const missing = schools.filter(n => !idx.bySchool[norm(n)]);
    const done = schools.length - missing.length;
    // גם לפי מורה (החלטת מיטל) — אותו מורה בבגרות ובגמר נספר פעם אחת
    const people = [];
    const seen = new Set();
    teachers.forEach(t => {
      const k = norm(t.name) + '|' + norm(t.schoolName);
      if (seen.has(k)) return;
      seen.add(k);
      people.push({ name: t.name, schoolName: t.schoolName, has: !!idx.byKey[k] });
    });
    const tMissing = people.filter(p => !p.has)
      .sort((a, b) => String(a.schoolName).localeCompare(String(b.schoolName), 'he') || String(a.name).localeCompare(String(b.name), 'he'));
    const tDone = people.length - tMissing.length;
    box.innerHTML = `
      <section class="meet-card meet-year">
        <div class="my-row">
          <div class="my-tx">
            <h3>${ICON.users}<span>הדרכה פרטנית השנה</span></h3>
            <div class="space-hint" style="margin:0;">שעה פרטנית נחשבת השתתפות של המורה. כל בית ספר צריך לקבל לפחות הדרכה פרטנית אחת בשנה. רושמים בלשונית "שעות פרטניות".</div>
          </div>
          <div class="my-kpis">
            <div><b>${idx.sessions}</b><span>מפגשים</span></div>
            <div class="${tMissing.length ? '' : 'ok'}"><b>${tDone}<small>/${people.length}</small></b><span>מורים</span></div>
            <div class="${missing.length ? '' : 'ok'}"><b>${done}<small>/${schools.length}</small></b><span>בתי ספר</span></div>
          </div>
        </div>
        ${tMissing.length ? `
        <details class="my-missing">
          <summary>מורים שעוד לא קיבלו הדרכה פרטנית (${tMissing.length})</summary>
          <div class="my-people">${tMissing.map(p => `<div><b>${esc(p.name)}</b><span>${esc(p.schoolName || '')}</span></div>`).join('')}</div>
        </details>` : '<div class="my-done">כל המורים בקבוצה קיבלו הדרכה פרטנית השנה</div>'}
        ${missing.length ? `
        <details class="my-missing">
          <summary>בתי ספר שעוד לא קיבלו הדרכה פרטנית (${missing.length})</summary>
          <div class="my-chips">${missing.map(n => `<span>${esc(n)}</span>`).join('')}</div>
        </details>` : '<div class="my-done">כל בתי הספר בקבוצה קיבלו הדרכה פרטנית השנה</div>'}
      </section>`;
  }

  // ---------- עזרים ----------
  function localToday() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function labelOf(date) {
    const [y, m, d] = date.split('-');
    return Number(d) + '.' + Number(m) + '.' + y.slice(2);
  }
  function hhmm(ms) {
    const d = new Date(ms);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function whenLabel(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d) ? '' : hhmm(d.getTime());
  }
  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function mifgashUrl() { return new URL('../mifgash/?g=' + encodeURIComponent(SLUG), location.href).href; }
  function errText(err) {
    const map = {
      bad_key: 'המפתח שבקישור אינו תקין. צריך לבקש ממיטל פלג את הקישור האישי המעודכן.',
      not_today: 'רישום עצמי נפתח רק ביום המפגש.',
      future_meeting: 'אי אפשר לסמן נוכחות למפגש שעוד לא התקיים.',
      busy: 'השרת עמוס ברגע זה — לנסות שוב בעוד כמה שניות.',
      closed: 'הרישום העצמי נסגר.',
      timeout: 'אין תשובה מהשרת (תקשורת איטית).',
      bad_response: 'תקלה רגעית בשרת של גוגל — ללחוץ שוב על הכפתור.'
    };
    return map[err] || ('תקלה: ' + (err || 'אין תשובה מהשרת'));
  }

  // ---------- המועדים (24.9.26) ----------
  // כל יום מפגש מהתוכנית = מועד (שורה) משלו. מפגש שנרשם בשרת ולא מופיע
  // בתוכנית (מפגש נוסף שהמדריכ/ה הוסיפה) — גם הוא שורה.
  const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  function weekday(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  }
  function monthName(k) {
    const [y, m] = String(k).split('-').map(Number);
    return (MONTHS[m - 1] || '') + ' ' + y;
  }
  function shortLabel(iso) { const p = iso.split('-'); return Number(p[2]) + '.' + Number(p[1]); }

  function planMeetings() {
    return (PLAN && PLAN.meetings ? PLAN.meetings : []).map(m => ({
      date: m.date, date2: m.date2 || '', dates: m.dates || null, subject: m.subject || '', topic: m.topic || '',
      goal: m.goal || '', source: 'plan', label: m.label || labelOf(m.date), time: m.time || '', day: m.day || ''
    }));
  }
  // כל ימי המפגש: dates (מוריה — עד 3 ימים בחודש), או date + date2
  function daysOf(m) { return m ? (m.dates && m.dates.length ? m.dates : [m.date, m.date2].filter(Boolean)) : []; }

  // "70% חיצוני (ג׳ 15.9 בשעה 16:00, …): מפרט ההיבחנות" → { '70% חיצוני': 'מפרט ההיבחנות' }
  function trackTopics(pm) {
    const out = {};
    String(pm.goal || '').split(' · ').forEach(seg => {
      const i = seg.indexOf('): ');
      if (i < 0) return;
      out[seg.split(' (')[0].trim()] = seg.slice(i + 3).trim();
    });
    return out;
  }

  let sessCache = null, sessSig = '';
  function sessions() {
    const sig = S.meetings.map(m => m.date + m.topic).join('|') + '#' + adhocMeetings.map(m => m.date).join('|');
    if (sessCache && sig === sessSig) return sessCache;
    const out = [], have = new Set();
    planMeetings().forEach(pm => {
      const slots = window.TS_meetingSlots ? window.TS_meetingSlots(pm) : [];
      const tt = trackTopics(pm);
      const days = daysOf(pm);
      days.forEach(d => {
        if (!d || have.has(d)) return;
        have.add(d);
        const mine = slots.filter(x => x.date === d).map(x => ({ start: x.start, part: x.part || '', topic: tt[x.part] || '' }));
        out.push({
          date: d, subject: pm.subject, topic: pm.topic, source: 'plan', label: labelOf(d), slots: mine,
          // שעה בלי תאריך ("11:00 / 18:00") — רק כשיש יום אחד בחודש, אחרת היא לא שייכת לשורה מסוימת
          time: mine.length ? '' : (days.length === 1 ? pm.time : '')
        });
      });
    });
    S.meetings.concat(adhocMeetings).forEach(m => {
      if (!m.date || have.has(m.date)) return;
      have.add(m.date);
      out.push({ date: m.date, subject: '', topic: m.topic || '', source: 'adhoc', label: labelOf(m.date), slots: [], time: '' });
    });
    out.sort((a, b) => a.date.localeCompare(b.date));
    sessCache = out; sessSig = sig;
    return out;
  }
  function sessionByDate(d) { return sessions().find(s => s.date === d) || null; }
  function todaySession() { return sessionByDate(S.today); }
  function nextSession() { return sessions().find(s => s.date >= S.today) || null; }
  function timesText(s) {
    if (s.slots && s.slots.length) return s.slots.map(x => x.start + (x.part ? ' ' + x.part : '')).join(' · ');
    return s.time || '';
  }

  // ---------- כרטיס "המפגש הבא" בראש העמוד (14.9.26) ----------
  // מדריכות לא מצאו איך נכנסים לנוכחות — הכרטיס מוביל ישר לשורה של המועד.
  function daysUntil(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const [ty, tm, td] = S.today.split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
  }
  function renderNextMeet() {
    const box = document.getElementById('next-meet');
    if (!box) return;
    const s = nextSession();
    if (!s) { box.hidden = true; return; }
    const isToday = s.date === S.today;
    const n = daysUntil(s.date);
    const when = isToday ? 'היום' : n === 1 ? 'מחר' : 'בעוד ' + n + ' ימים';
    const zoomUrl = GUIDE_CFG && /^https:\/\//.test(GUIDE_CFG.zoom || '') ? GUIDE_CFG.zoom : '';
    const tt = timesText(s);
    box.className = 'nm-card' + (isToday ? ' today' : '');
    box.innerHTML = `
      <div class="nm-date"><b>${esc(shortLabel(s.date))}</b><span>יום ${esc(weekday(s.date))}</span></div>
      <div class="nm-tx">
        <div class="nm-eyebrow">${isToday ? '<span class="live-dot"></span>' : ''}<span>${isToday ? 'המפגש היום' : 'המפגש הבא · ' + esc(when)}</span></div>
        <div class="nm-title">${esc(s.topic || 'מפגש הדרכה')}</div>
        <div class="nm-sub">${tt ? '<bdi>' + esc(tt) + '</bdi>' : esc(s.label)}${isToday ? '' : ' · ביום המפגש פותחים מכאן את רישום הנוכחות'}</div>
      </div>
      <div class="nm-act">
        ${zoomUrl ? `<a class="nm-btn" href="${esc(zoomUrl)}" target="_blank" rel="noopener">${ICON.screen}<span>כניסה לזום</span></a>` : ''}
        <button type="button" class="nm-btn primary" id="nm-go">${ICON.check}<span>${isToday ? 'לפתיחת רישום הנוכחות' : 'למועדים ולנוכחות'}</span></button>
      </div>`;
    box.hidden = false;
    document.getElementById('nm-go').addEventListener('click', () => {
      if (window.TS_goTab) window.TS_goTab('meet');
      if (CAN) revealSession(s.date);
    });
  }

  // מועד שנרשם בשרת — לפי התאריך שלו (meetId_ = slug + תאריך)
  function serverMeeting(date) { return S.meetings.find(m => m.date === date) || null; }
  function isLiveDay() { return !!todaySession() || S.meetings.some(m => m.open); }

  // ---------- טעינה ----------
  async function load() {
    const date = sel ? sel.date : '';
    const params = { guide: SLUG, k: KEY, ge: GE, all: 1 };
    if (date) params.date = date;
    const res = await TS.api('meet.state', params, { cache: 'no' });
    if (res && res.ok && res.data) {
      publishAll(res.data);
      S.meetings = res.data.meetings || [];
      S.loaded = true; S.failed = false; S.badKey = false;
      if (sel && sel.date === date) { S.rows = res.data.rows || []; S.rowsDate = date; }
      const sm = serverMeeting(S.today);
      if (sm && sm.open) { if (!live) fetchCode(); }
      else if (live) stopLive();
    } else if (res && res.error === 'bad_key') {
      S.badKey = true;
    } else {
      S.failed = true;
    }
    renderNextMeet();
    renderMonths();
    renderBody();
    schedulePoll();
  }
  // כל המפגשים והרישומים של המדריכ/ה → לשונית "המורים שלי", אחוז הנוכחות
  // ו"ההדרכות שלי" (dashboard.js). עד 17.9.26 אלה הציגו רק את טאב ההדרכות
  // הישן, ומדריכה שסימנה נוכחות כאן ראתה שם 0 הדרכות ו-0%.
  // שרת ישן בלי allRows — לא מפרסמים, והדשבורד נשאר כמו שהיה.
  let allSig = '';
  function publishAll(d) {
    if (!d || !Array.isArray(d.allRows)) return;
    const sig = JSON.stringify([d.meetings, d.allRows.map(r => [r.meetingId, r.teacherId, r.status])]);
    if (sig === allSig) return;
    allSig = sig;
    window.MEET_ALL = { today: d.today || S.today, meetings: d.meetings || [], rows: d.allRows };
    // דוח השעות למונדיי (space.js) בונה את השורות הקבוצתיות מכאן
    if (typeof window.SPACE_onMeetings === 'function') window.SPACE_onMeetings();
    if (typeof window.DASH_onMeetings === 'function') window.DASH_onMeetings();
  }
  // הרישומים של מועד אחד מתוך כל הרישומים שכבר בדף — הסימון נפתח מיד, בלי לחכות לשרת
  function rowsFromAll(date) {
    const sm = serverMeeting(date);
    if (!sm) return S.loaded ? [] : null;
    if (!window.MEET_ALL || !Array.isArray(window.MEET_ALL.rows)) return null;
    return window.MEET_ALL.rows.filter(r => String(r.meetingId) === String(sm.id));
  }
  function schedulePoll() {
    clearTimeout(pollTimer);
    if (isLiveDay() && !S.badKey && !zoom) {
      pollTimer = setTimeout(() => { if (!saving) load(); else schedulePoll(); }, POLL_MS);
    }
  }

  // ---------- שלד (24.9.26 — עמוד אחד) ----------
  // מקטע 1 (#meet-root) — מועדי החודש. מקטע 2 (#meet-history) — חודש-חודש.
  // "מפגש שלא מופיע בתוכנית" עבר ל"כלים נוספים" (#meet-adhoc-host).
  let selWhere = 'cur';     // איפה נפתח הסימון: 'cur' = מקטע החודש · 'hist' = נוכחות לפי חודשים
  function renderShell() {
    const host = document.getElementById('meet-adhoc-host');
    if (!host) return;
    host.innerHTML = `
      <div class="space-hint" style="margin-top:0;">מפגש נוסף או מפגש שהוזז לתאריך שלא בתוכנית. בוחרים תאריך (היום או מפגש שכבר התקיים), ואחר כך מסמנים נוכחות כרגיל.</div>
      <div id="meet-adhoc" class="meet-adhoc" style="margin-top:6px; padding-top:0; border-top:none;">
        <label><span>תאריך המפגש</span><input type="date" class="input" id="meet-adhoc-date"></label>
        <label class="grow"><span>נושא (לא חובה)</span><input type="text" class="input" id="meet-adhoc-topic" maxlength="200"></label>
        <button type="button" class="btn btn-primary" id="meet-adhoc-go">הוספת המפגש וסימון נוכחות</button>
      </div>`;
    const dateIn = document.getElementById('meet-adhoc-date');
    dateIn.max = S.today;
    dateIn.value = S.today;
    document.getElementById('meet-adhoc-go').addEventListener('click', () => {
      const d = dateIn.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > S.today) { TS.toast('בוחרים תאריך של היום או מפגש שכבר התקיים'); return; }
      const topic = document.getElementById('meet-adhoc-topic').value.trim();
      if (!sessionByDate(d)) adhocMeetings.push({ date: d, topic: topic });
      const s = sessionByDate(d);
      if (!s) return;
      const where = monthOf(d) === focusMonth(sessions()) ? 'cur' : 'hist';
      if (!(sel && sel.date === d)) selectSession(s, where);
      else revealSession(d, where);
    });
  }

  function renderNoKey() {
    const tool = document.getElementById('tool-adhoc');
    if (tool) tool.hidden = true;
    const html = `
      <section class="meet-card meet-notice">
        <div class="meet-notice-ic">${ICON.key}</div>
        <div>
          <strong>רישום הנוכחות נפתח מהקישור האישי המעודכן</strong>
          <p>הקישור שדרכו נכנסת עדיין לא כולל את מפתח הנוכחות. צריך לבקש ממיטל פלג את הקישור המעודכן, ולהיכנס ממנו פעם אחת. אחרי זה המכשיר יזכור את המפתח.</p>
        </div>
      </section>`;
    const root = document.getElementById('meet-root');
    if (root) root.innerHTML = html;
    const hist = document.getElementById('meet-history');
    if (hist) hist.innerHTML = '';
  }

  // ---------- חישובים חודשיים ----------
  // רשימת הקבוצה (אדם = שם + בית ספר), למקצוע של המועד אצל מדריכה בשני מקצועות
  function rosterGroups(subject) {
    const all = (typeof myTeachers === 'function') ? myTeachers() : [];
    const ts = subject ? all.filter(t => t.subject === subject) : all;
    const groups = {}, out = [];
    ts.forEach(t => {
      const k = norm(t.name) + '|' + norm(t.schoolName);
      if (!groups[k]) { groups[k] = { key: k, ids: [], name: t.name, school: t.schoolName || '' }; out.push(groups[k]); }
      groups[k].ids.push(String(t.id));
    });
    return out;
  }
  // השתתפו / לא השתתפו / קיבלו הדרכה פרטנית — לפי אותם כללים של הדוחות:
  // נוכחות מאושרת באחד ממועדי החודש = השתתף/ה. שעה פרטנית באותו חודש מספקת
  // אף היא את החודש (קביעת מיטל 20.9.26), ולכן מי שקיבל/ה פרטני לא נספר/ת "לא השתתפו".
  function monthSummary(k, list) {
    if (!window.MEET_ALL) return null;
    const subs = Array.from(new Set(list.map(s => s.subject || '')));
    const groups = rosterGroups(subs.length === 1 ? subs[0] : '');
    if (!groups.length) return null;
    const ids = new Set((window.MEET_ALL.meetings || []).filter(m => monthOf(m.date) === k).map(m => String(m.id)));
    const present = new Set();
    (window.MEET_ALL.rows || []).forEach(r => {
      if (r.status === 'present' && ids.has(String(r.meetingId))) present.add(String(r.teacherId));
    });
    const indAll = window.MEET_indMonths ? window.MEET_indMonths() : null;   // null = השעות עוד לא נטענו
    const byName = (a, b) => String(a.school).localeCompare(String(b.school), 'he') || String(a.name).localeCompare(String(b.name), 'he');
    const att = [], not = [], ind = [];
    groups.forEach(g => {
      const was = g.ids.some(id => present.has(id));
      const gotInd = !!(indAll && indAll[g.key] && indAll[g.key].has(k));
      if (was) att.push(g);
      if (gotInd) ind.push(g);
      if (!was && !gotInd) not.push(g);
    });
    return { att: att.sort(byName), not: not.sort(byName), ind: ind.sort(byName), total: groups.length, indLoaded: !!indAll, current: k === monthOf(S.today) };
  }
  // המועדים של מקטע 1: החודש הנוכחי, ואם אין בו מפגשים — החודש הבא שיש בו
  function focusMonth(list) {
    if (!list.length) return '';
    const cur = monthOf(S.today);
    if (list.some(s => monthOf(s.date) === cur)) return cur;
    const nx = list.find(s => s.date >= S.today);
    return nx ? monthOf(nx.date) : monthOf(list[list.length - 1].date);
  }

  function renderMonths() {
    const root = document.getElementById('meet-root');
    const hist = document.getElementById('meet-history');
    if (!root || !CAN) return;
    if (S.badKey) {
      root.innerHTML = `<section class="meet-card meet-notice warn"><div class="meet-notice-ic">${ICON.key}</div>
        <div><strong>המפתח שבקישור אינו תקין</strong><p>${esc(errText('bad_key'))}</p></div></section>`;
      if (hist) hist.innerHTML = '';
      return;
    }
    const list = sessions();
    if (!openMonths) openMonths = new Set();
    // הרענון כל 20 שניות ביום המפגש — מציירים מחדש רק כשמשהו השתנה
    const sig = JSON.stringify([S.meetings, sel && sel.date, selWhere, Array.from(openMonths), S.failed, S.loaded,
      list.length, (window.MEET_ALL && window.MEET_ALL.rows || []).length, allSig.length, HOURS ? HOURS.length : -1,
      (typeof myTeachers === 'function') ? myTeachers().length : 0]);
    if (sig === monthsSig && root.querySelector('.ss-row, .cur-empty')) return;
    monthsSig = sig;
    const hadFocus = document.activeElement && document.activeElement.id && document.activeElement.closest &&
      document.activeElement.closest('#meet-root, #meet-history') ? document.activeElement.id : '';

    const fm = focusMonth(list);
    // התג בכותרת מקטע 1 סופר רק את החודש שמוצג בו — ממתינים מחודש קודם מסומנים במקטע 2
    const badge = document.getElementById('meet-count');
    const pendCur = S.meetings.filter(m => monthOf(m.date) === fm).reduce((n, m) => n + ((m.counts && m.counts.pending) || 0), 0);
    if (badge) { badge.hidden = !pendCur; badge.textContent = pendCur + ' ממתינים לאישור'; }
    const title = document.querySelector('#sec-month-title span');
    if (title) {
      title.textContent = !fm ? 'החודש'
        : fm === monthOf(S.today) ? 'החודש — ' + monthName(fm)
        : fm > monthOf(S.today) ? 'החודש הבא — ' + monthName(fm) : 'המפגשים האחרונים — ' + monthName(fm);
    }

    // ---- מקטע 1 ----
    const warn = S.failed && !S.loaded
      ? `<div class="meet-warn" style="margin:0 0 12px;">${ICON.alert}<span>הנוכחות לא נטענה — תקלה רגעית בשרת. <button type="button" class="mh-edit" id="meet-retry">לנסות שוב</button></span></div>` : '';
    if (!list.length) {
      root.innerHTML = warn + `<div class="cur-empty">${S.loaded || S.failed
        ? 'תוכנית המפגשים השנתית עדיין לא הוזנה למערכת. כדי לרשום נוכחות: "כלים נוספים" ← "מפגש שלא מופיע בתוכנית".'
        : 'טוען…'}</div>`;
    } else {
      const cur = list.filter(s => monthOf(s.date) === fm);
      const ms = fm <= monthOf(S.today) && cur.some(s => s.date <= S.today) ? monthSummary(fm, cur) : null;
      const later = cur.some(s => s.date >= S.today) ? null : list.find(s => s.date > S.today);
      root.innerHTML = warn +
        (ms ? `<div class="mh-sum" style="margin:-6px 0 10px;">${sumHtml(ms)}<button type="button" class="mh-edit" data-gohist="${esc(fm)}">מי השתתף ומי לא</button></div>` : '') +
        `<div class="mm-rows cur-rows">${cur.map(s => sessRowHtml(s, 'cur')).join('')}</div>` +
        (later ? `<div class="cur-empty" style="margin-top:10px;">המפגש הבא: <b>יום ${esc(weekday(later.date))} ${esc(shortLabel(later.date))}</b>${timesText(later) ? ' · <bdi>' + esc(timesText(later)) + '</bdi>' : ''} — ${esc(later.topic || 'מפגש הדרכה')}. ביום המפגש הוא יופיע כאן עם כפתור "פתיחת הרישום".</div>` : '');
    }

    // ---- מקטע 2: חודשים שכבר התחילו ----
    if (hist) {
      const byMonth = {};
      list.forEach(s => { (byMonth[monthOf(s.date)] = byMonth[monthOf(s.date)] || []).push(s); });
      const keys = Object.keys(byMonth).filter(k => k <= monthOf(S.today) && byMonth[k].some(s => s.date <= S.today)).sort().reverse();
      hist.innerHTML = !keys.length
        ? '<div class="cur-empty">עוד לא התקיים אף מפגש השנה. אחרי המפגש הראשון החודש יופיע כאן.</div>'
        : keys.map(k => monthHtml(k, byMonth[k])).join('');
    }
    bindMonths();
    if (live) tick();
    if (hadFocus) { const el = document.getElementById(hadFocus); if (el) el.focus(); }
  }

  function sumHtml(ms) {
    return `<span class="ok">השתתפו <b>${ms.att.length}</b></span> · <span class="bad">${ms.current ? 'עוד לא השתתפו' : 'לא השתתפו'} <b>${ms.not.length}</b></span>` +
      (ms.indLoaded ? ` · <span class="ind">פרטני <b>${ms.ind.length}</b></span>` : '') + ` <span>(מתוך ${ms.total})</span>`;
  }
  function peopleHtml(arr, cls, title, empty, copy) {
    return `
      <div class="mh-list ${cls}">
        <h4><span>${title}</span><span class="c">${arr.length}</span></h4>
        ${arr.length ? `<ul class="mh-people">${arr.map(g => `<li><b>${esc(g.name)}</b><span>${esc(g.school)}</span></li>`).join('')}</ul>`
          : `<div class="mh-empty">${empty}</div>`}
        ${copy && arr.length ? `<button type="button" class="mh-copy" data-copy="${esc(arr.map(g => g.name + (g.school ? ' — ' + g.school : '')).join('\n'))}">העתקת הרשימה</button>` : ''}
      </div>`;
  }
  function monthHtml(k, ss) {
    const ms = monthSummary(k, ss);
    const pend = ss.reduce((n, s) => { const sm = serverMeeting(s.date); return n + ((sm && sm.counts && sm.counts.pending) || 0); }, 0);
    const days = ss.filter(s => s.date <= S.today);
    return `
      <details class="mm" data-month="${k}"${openMonths.has(k) ? ' open' : ''}>
        <summary>
          <svg class="mm-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
          <span class="mm-name">${esc(monthName(k))}</span>
          <span class="mh-sum">${ms ? sumHtml(ms) : 'טוען…'}</span>
          ${pend ? `<span class="mm-chip pend">${pend} ממתינים לאישור</span>` : ''}
        </summary>
        <div class="mm-rows">
          ${ms ? `
          <div class="mh-lists">
            ${peopleHtml(ms.att, 'ok', 'השתתפו החודש', 'עוד אין נוכחות מאושרת החודש', false)}
            ${peopleHtml(ms.not, 'bad', ms.current ? 'עוד לא השתתפו' : 'לא השתתפו', 'כל הקבוצה השתתפה החודש', true)}
            ${ms.indLoaded ? peopleHtml(ms.ind, 'ind', 'קיבלו הדרכה פרטנית', 'לא נרשמה החודש הדרכה פרטנית', false)
              : '<div class="mh-list ind"><h4><span>קיבלו הדרכה פרטנית</span></h4><div class="mh-empty">טוען…</div></div>'}
          </div>
          <div class="mh-note">מי שהשתתף/ה באחד ממועדי החודש השתתף/ה בהדרכה של החודש. מי שקיבל/ה הדרכה פרטנית החודש לא נספר/ת ב"לא השתתפו".</div>` : ''}
          <div class="mh-days">
            <h4>מועדי החודש</h4>
            ${days.map(s => dayRowHtml(s)).join('')}
          </div>
        </div>
      </details>`;
  }
  function dayRowHtml(s) {
    const sm = serverMeeting(s.date);
    const c = (sm && sm.counts) || { present: 0, absent: 0, pending: 0 };
    const isSel = !!sel && sel.date === s.date && selWhere === 'hist';
    const st = (c.present + c.absent + c.pending)
      ? `<span class="ss-st ok">נוכחים <b>${c.present}</b></span>${c.pending ? `<span class="ss-st pend">${c.pending} ממתינים לאישור</span>` : ''}`
      : '<span class="ss-st none">לא סומנה נוכחות</span>';
    return `
      <div class="mh-dayrow${isSel ? ' sel' : ''}" id="sh-${esc(s.date)}">
        <div class="mh-day">
          <span class="d">יום ${esc(weekday(s.date))} ${esc(shortLabel(s.date))}</span>
          <span class="st">${st}</span>
          <button type="button" class="mh-edit" data-hpanel="${esc(s.date)}" aria-expanded="${isSel}">${isSel ? 'סגירת העריכה' : c.pending ? 'אישור ועריכת הנוכחות' : 'עריכת הנוכחות'}</button>
        </div>
        ${isSel ? '<div class="ss-panel" id="meet-body"></div>' : ''}
      </div>`;
  }

  function sessRowHtml(s) {
    const sm = serverMeeting(s.date);
    const c = (sm && sm.counts) || { present: 0, absent: 0, pending: 0 };
    const isToday = s.date === S.today;
    const future = s.date > S.today;
    const open = !!(sm && sm.open);
    const isSel = !!sel && sel.date === s.date && selWhere === 'cur';
    const total = rosterGroups(s.subject).length;
    const slots = s.slots && s.slots.length
      ? s.slots.map(x => `<li><bdi dir="ltr" class="ss-hour">${esc(x.start)}</bdi>${x.part ? `<span class="ss-part"><bdi>${esc(x.part)}</bdi></span>` : ''}${x.topic ? `<span class="ss-ttl">${esc(x.topic)}</span>` : ''}</li>`).join('')
      : (s.time ? `<li><span class="ss-ttl">${esc(s.time)}</span></li>` : '');

    let status;
    if (future) {
      const n = daysUntil(s.date);
      status = `<span class="ss-st fut">${n === 1 ? 'מחר' : 'בעוד ' + n + ' ימים'}</span>`;
    } else if (c.present + c.absent + c.pending) {
      status = `<span class="ss-st ok">נוכחים <b>${c.present}</b>${total ? ' מתוך ' + total : ''}</span>` +
        (c.pending ? `<span class="ss-st pend">${c.pending} ממתינים לאישור</span>` : '');
    } else {
      status = `<span class="ss-st none">${isToday ? 'עוד לא נרשמה נוכחות' : 'לא סומנה נוכחות'}</span>`;
    }

    const acts = [];
    /* "פתיחת הרישום" ליד כל מפגש (מיטל, 24.9.26). השרת פותח רישום רק ביום המפגש —
       בכוונה, כדי שלא יירשמו מראש או בדיעבד — ולכן בשאר הימים הכפתור מוצג אפור עם הסבר. */
    const openBtnOff = t => `<button type="button" class="btn btn-secondary ss-btn ss-off" disabled title="${esc(t)}">${ICON.screen}<span>פתיחת הרישום</span></button><span class="ss-later">${esc(t)}</span>`;
    if (future) {
      acts.push(openBtnOff('ייפתח ביום המפגש, ' + shortLabel(s.date)));
    } else {
      if (isToday && !open) acts.push(`<button type="button" class="btn btn-primary ss-btn" data-open="${esc(s.date)}">${ICON.screen}<span>פתיחת הרישום</span></button>`);
      if (!isToday) acts.push(openBtnOff('המפגש עבר — מסמנים ידנית'));
      if (open) acts.push(`<button type="button" class="btn btn-secondary ss-btn ss-close" data-close="${esc(s.date)}">סגירת הרישום</button>`);
      acts.push(`<button type="button" class="btn ${isSel ? 'btn-secondary' : (!isToday && (c.pending || !(c.present + c.absent)) ? 'btn-primary' : 'btn-secondary')} ss-btn" data-panel="${esc(s.date)}" aria-expanded="${isSel}">
        ${isSel ? 'סגירת הסימון' : c.pending ? ICON.check + '<span>אישור וסימון נוכחות</span>' : ICON.check + '<span>סימון נוכחות ידני</span>'}</button>`);
    }

    return `
      <div class="ss-row${isToday ? ' today' : ''}${future ? ' future' : ''}${isSel ? ' sel' : ''}${open ? ' live' : ''}" id="ss-${esc(s.date)}">
        <div class="ss-main">
          <div class="ss-date"><b>${esc(shortLabel(s.date))}</b><span>יום ${esc(weekday(s.date))}</span>${isToday ? '<em>היום</em>' : ''}</div>
          <div class="ss-tx">
            <div class="ss-topic">${esc(s.topic || 'מפגש הדרכה')}${s.source === 'adhoc' ? ' <span class="mb unlisted">לא בתוכנית</span>' : ''}</div>
            ${slots ? `<ul class="ss-slots">${slots}</ul>` : ''}
            <div class="ss-status">${status}</div>
          </div>
          <div class="ss-act">${acts.join('')}</div>
        </div>
        ${open ? livePanelHtml(sm) : ''}
        ${isSel ? '<div class="ss-panel" id="meet-body"></div>' : ''}
      </div>`;
  }

  function bindMonths() {
    ['meet-root', 'meet-history'].forEach(id => {
      const box = document.getElementById(id);
      if (!box) return;
      box.querySelectorAll('details.mm').forEach(d => d.addEventListener('toggle', () => {
        if (d.open) openMonths.add(d.dataset.month); else openMonths.delete(d.dataset.month);
      }));
      box.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openRegistration(sessionByDate(b.dataset.open), b)));
      box.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeRegistration(b.dataset.close, b)));
      box.querySelectorAll('[data-panel], [data-hpanel]').forEach(b => b.addEventListener('click', () => {
        const where = b.dataset.hpanel ? 'hist' : 'cur';
        const s = sessionByDate(b.dataset.hpanel || b.dataset.panel);
        if (!s) return;
        if (sel && sel.date === s.date && selWhere === where) closePanel(); else selectSession(s, where);
      }));
      box.querySelectorAll('[data-gohist]').forEach(b => b.addEventListener('click', () => {
        openMonths.add(b.dataset.gohist);
        renderMonths();
        const d = document.querySelector('#meet-history details.mm[data-month="' + b.dataset.gohist + '"]');
        if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }));
      box.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
        const text = b.dataset.copy;
        const done = () => { b.textContent = 'הועתק ✓'; setTimeout(() => { b.textContent = 'העתקת הרשימה'; }, 2000); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => window.prompt('להעתקה:', text));
        else window.prompt('להעתקה:', text);
      }));
    });
    const retry = document.getElementById('meet-retry');
    if (retry) retry.addEventListener('click', () => { S.failed = false; load(); });
    bindLive();
  }

  // מגלגל אל המועד (ובמקטע 2 — פותח את החודש שלו)
  function revealSession(date, where) {
    if (!openMonths) openMonths = new Set();
    if (where === 'hist') openMonths.add(monthOf(date));
    renderMonths();
    if (sel) renderBody();
    setTimeout(() => {
      const row = document.getElementById((where === 'hist' ? 'sh-' : 'ss-') + date);
      if (row) row.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }

  function unsavedOk() {
    if (Object.keys(edits).length && !confirm('יש סימונים שלא נשמרו. להמשיך בלי לשמור?')) return false;
    if (wrapDraft && !confirm('סיכום ההדרכה לא נשמר. להמשיך בלי לשמור?')) return false;
    return true;
  }
  function resetPanel() {
    edits = {};
    zoom = null; zoomMeta = {};
    wrapDraft = null; wrapNote = '';
    filter = 'all'; search = ''; schoolF = '';
  }
  function selectSession(s, where) {
    if (!unsavedOk()) return;
    resetPanel();
    sel = s;
    selWhere = where === 'hist' ? 'hist' : 'cur';
    // מועד מחוץ לחודש של מקטע 1 נפתח תמיד במקטע 2
    if (selWhere === 'cur' && monthOf(s.date) !== focusMonth(sessions())) selWhere = 'hist';
    const rows = rowsFromAll(s.date);
    S.rows = rows || [];
    S.rowsDate = rows ? s.date : '';
    revealSession(s.date, selWhere);
    load();
  }
  function closePanel() {
    if (!unsavedOk()) return;
    resetPanel();
    sel = null;
    S.rows = []; S.rowsDate = '';
    renderMonths();
    schedulePoll();
  }

  // ---------- רשימת המשתתפים ----------
  // אותו מורה בבגרות ובגמר הוא שתי שורות במערכת — במפגש הוא אדם אחד.
  /* ------------------------------------------------------------------
     הכלל של מיטל: בכל חודש שני מועדים — בוקר וערב — אבל זו הדרכה אחת,
     ומי שהיה באחד מהם השתתף בהדרכה של החודש. המדריכה מסמנת **מועד**,
     והמערכת סופרת **חודש**, ולכן "60 לא סומנו" במועד הערב אינו "60
     שלא השתתפו החודש" — חלקם נכחו בבוקר (קודקס, 20.9.26).
     כאן מחושב המצב החודשי מ-window.MEET_ALL (כל רישומי המדריכ/ה, כבר
     בדף — meet.state?all=1), בלי קריאה נוספת ובלי לשנות את כללי הספירה.
     ------------------------------------------------------------------ */
  function monthOf(d) { return String(d || '').slice(0, 7); }
  let mPresentCache = new Set();   // מתעדכן בכל ציור, נקרא משורת המורה

  // המועדים של אותו חודש ואותו מקצוע כמו המפגש הנבחר
  function monthMeetingIds() {
    if (!sel) return [];
    const all = (window.MEET_ALL && window.MEET_ALL.meetings) || S.meetings || [];
    const k = monthOf(sel.date);
    const subjOf = m => window.TS_meetingSubject ? window.TS_meetingSubject(SLUG, m.date) : '';
    return all.filter(m => monthOf(m.date) === k &&
      (!sel.subject || !subjOf(m) || subjOf(m) === sel.subject)).map(m => String(m.id));
  }

  // מי מהקבוצה כבר יש לו נוכחות מאושרת באחד ממועדי החודש
  function monthlyPresent() {
    const ids = new Set(monthMeetingIds());
    const out = new Set();
    const rows = (window.MEET_ALL && window.MEET_ALL.rows) || [];
    rows.forEach(r => {
      if (r.status === 'present' && r.teacherId && ids.has(String(r.meetingId))) out.add(String(r.teacherId));
    });
    return out;
  }

  function entries() {
    const all = (typeof myTeachers === 'function') ? myTeachers() : [];
    // מפגש של מקצוע אחד אצל מדריכה בשני מקצועות (רבקה) — רק מורי אותו מקצוע
    const teachers = sel && sel.subject ? all.filter(t => t.subject === sel.subject) : all;
    const groups = {};
    const list = [];
    teachers.forEach(t => {
      const k = norm(t.name) + '|' + norm(t.schoolName);
      if (!groups[k]) {
        groups[k] = { key: '', ids: [], name: t.name, schoolName: t.schoolName, listed: true };
        list.push(groups[k]);
      }
      groups[k].ids.push(String(t.id));
    });
    const rowByTeacher = {};
    S.rows.forEach(r => { if (r.teacherId) rowByTeacher[r.teacherId] = r; });
    const used = new Set();
    list.forEach(g => {
      const hit = g.ids.find(id => rowByTeacher[id]);
      g.teacherId = hit || g.ids[0];
      g.row = hit ? rowByTeacher[hit] : null;
      g.key = 't:' + g.teacherId;
      if (g.row) used.add(g.row.id);
    });
    // מי שנרשם/סומן ואינו ברשימה הנוכחית (שלא ברשימה, או שעבר קבוצה)
    S.rows.forEach(r => {
      if (used.has(r.id)) return;
      list.push({
        key: r.teacherId ? 't:' + r.teacherId : 'r:' + r.id,
        teacherId: r.teacherId, rowId: r.id, ids: r.teacherId ? [r.teacherId] : [],
        name: r.teacherName || '—', schoolName: r.schoolName || '', listed: false, row: r
      });
    });
    list.forEach(g => {
      const orig = g.row ? (g.row.guideStatus || '') : '';
      const e = edits[g.key];
      g.guide = e === undefined ? orig : (e === 'clear' ? '' : e);
      g.self = !!(g.row && g.row.selfCheckinAt);
      g.selfAt = g.row ? g.row.selfCheckinAt : '';
      g.state = g.guide || (g.self ? 'pending' : 'none');
      g.dirty = e !== undefined;
    });
    return list;
  }

  function setMark(g, status) {
    delete zoomMeta[g.key];   // סימון ידני גובר על ההתאמה מהזום
    const orig = g.row ? (g.row.guideStatus || '') : '';
    if (status === orig) delete edits[g.key];
    else edits[g.key] = status || 'clear';
    renderBody();
  }

  // ---------- גוף הלשונית ----------
  function renderBody() {
    const body = document.getElementById('meet-body');
    if (!body || !sel || !CAN) return;
    if (S.badKey) {
      body.innerHTML = `<section class="meet-card meet-notice warn"><div class="meet-notice-ic">${ICON.key}</div>
        <div><strong>המפתח שבקישור אינו תקין</strong><p>${esc(errText('bad_key'))}</p></div></section>`;
      return;
    }
    if (sel.date > S.today) { body.innerHTML = ''; return; }   // אין סימון למפגש שעוד לא התקיים
    if (S.rowsDate !== sel.date) {
      body.innerHTML = S.failed && !S.loaded
        ? `<section class="meet-card"><div class="empty" style="padding:22px; text-align:center;">
            הנוכחות לא נטענה — תקלה רגעית בשרת.<br>
            <button type="button" class="btn btn-secondary" id="meet-retry2" style="margin-top:10px;">לנסות שוב</button></div></section>`
        : '<section class="meet-card"><div class="empty" style="padding:26px;">טוען את רשימת הקבוצה…</div></section>';
      const r = document.getElementById('meet-retry2');
      if (r) r.addEventListener('click', () => { S.failed = false; renderBody(); load(); });
      return;
    }

    const list = entries();
    const c = { present: 0, absent: 0, pending: 0, none: 0 };
    list.forEach(g => { c[g.state]++; });
    // המצב החודשי — לצד המצב של המועד הנבחר
    const mPresent = monthlyPresent();
    mPresentCache = mPresent;
    const monthDone = g => (g.ids || []).some(id => mPresent.has(String(id)));
    const inRoster = list.filter(g => g.listed);
    const monthMissing = inRoster.filter(g => !monthDone(g)).length;
    const monthDates = (function () {
      const all = (window.MEET_ALL && window.MEET_ALL.meetings) || S.meetings || [];
      const ids = new Set(monthMeetingIds());
      return all.filter(m => ids.has(String(m.id))).map(m => m.date).sort();
    })();
    const monthLbl = window.TS_meetMonthLabel ? window.TS_meetMonthLabel(monthOf(sel.date)) : monthName(monthOf(sel.date));
    const gaps = list.filter(g => g.self && g.guide === 'absent');
    const pending = list.filter(g => g.state === 'pending');
    const dirtyN = Object.keys(edits).length;

    // שמירה על המיקוד בשדה החיפוש בזמן ציור מחדש
    const hadFocus = document.activeElement && document.activeElement.id === 'meet-search';
    const caret = hadFocus ? document.activeElement.selectionStart : 0;

    body.innerHTML = `
      <section class="meet-card">
        <div class="meet-month-head">
          <b>הדרכת ${esc(monthLbl)}</b>
          <span>${monthDates.length > 1 ? 'מועדי החודש: ' + monthDates.map(labelOf).join(' · ') : 'מועד יחיד החודש'}</span>
          <span class="meet-month-now">מסמנים כעת: ${esc(sel.label || labelOf(sel.date))}</span>
        </div>
        <div class="meet-sum">
          <button type="button" class="meet-stat present${filter === 'present' ? ' on' : ''}" data-filter="present"><b>${c.present}</b><span>נכחו במועד הזה</span></button>
          <button type="button" class="meet-stat absent${filter === 'absent' ? ' on' : ''}" data-filter="absent"><b>${c.absent}</b><span>לא נכחו</span></button>
          <button type="button" class="meet-stat pending${filter === 'pending' ? ' on' : ''}" data-filter="pending"><b>${c.pending}</b><span>ממתינים לאישור</span></button>
          <button type="button" class="meet-stat none${filter === 'none' ? ' on' : ''}" data-filter="none"><b>${c.none}</b><span>טרם נבדקו במועד הזה</span></button>
        </div>
        <div class="meet-month-note">
          <b>${monthMissing}</b> מתוך ${inRoster.length} מורים עדיין ללא נוכחות מאושרת ב${esc(monthLbl)}.
          <span>הספירה בדוחות היא חודשית: מי שאושרה לו נוכחות באחד ממועדי החודש השתתף/ה בהדרכה של החודש,
          גם אם במועד הזה לא סומן/ה. מי שאין לו נוכחות באף מועד ייספר כמי שלא השתתף/ה.</span>
        </div>
        ${S.failed ? '<div class="meet-warn">הרענון האחרון נכשל — מוצג המצב האחרון שנטען.</div>' : ''}
        ${gaps.length ? `<div class="meet-warn">${ICON.alert}<span><b>${gaps.length}</b> נרשמו בעצמם אבל סומנו "לא נכח/ה". כדאי לבדוק מול דוח המשתתפים של הזום.</span></div>` : ''}
        <div class="meet-save-bar">
          <button type="button" class="btn btn-primary" id="meet-save"${dirtyN && !saving ? '' : ' disabled'}>
            ${saving ? 'שומר…' : dirtyN ? 'שמירת ' + dirtyN + ' סימונים' : 'כל השינויים נשמרו'}
          </button>
          <button type="button" class="btn btn-secondary" id="meet-zoom-btn">ייבוא דוח משתתפים מהזום</button>
          <button type="button" class="btn btn-secondary" id="meet-rest-absent"${c.none ? '' : ' disabled'}>כל מי שלא סומן — לא נכח/ה</button>
          <span class="meet-save-note" id="meet-save-note">${dirtyN ? 'יש סימונים שלא נשמרו' : ''}</span>
        </div>
      </section>

      ${zoom ? zoomPanelHtml(list) : ''}

      ${pending.length ? `
      <section class="meet-card meet-pending">
        <h3>ממתינים לאישור <span class="n">${pending.length}</span></h3>
        <div class="space-hint">נרשמו בעצמם עם הקוד שהוקרן. מאשרים רק את מי שבאמת השתתף.</div>
        ${pending.map(g => rowHtml(g, true)).join('')}
        ${pending.length > 1 ? '<button type="button" class="btn btn-secondary" id="meet-approve-all" style="margin-top:8px;">אישור כל הממתינים</button>' : ''}
      </section>` : ''}

      <section class="meet-card">
        <div class="meet-list-head">
          <h3>רשימת הקבוצה</h3>
          ${schoolSelectHtml(list)}
          <input type="search" class="input" id="meet-search" placeholder="חיפוש שם או בית ספר" value="${esc(search)}">
          ${filter !== 'all' ? '<button type="button" class="meet-clear-filter" data-filter="all">הצגת כולם</button>' : ''}
        </div>
        <div id="meet-list">${listHtml(list)}</div>
      </section>

      ${wrapCardHtml()}`;

    bindBody(list);
    bindWrap();
    if (hadFocus) {
      const s = document.getElementById('meet-search');
      s.focus();
      try { s.setSelectionRange(caret, caret); } catch (e) {}
    }
  }

  /* ------------------------------------------------------------------
     סיכום ההדרכה (22.9.26) — "בית של המורה".
     שלושה שדות על המפגש: סיכום ונקודות חשובות · מה לקחת לכיתה · שעות.
     שני שדות טקסט נפרדים בכוונה (קביעת מיטל 22.9): הקצר הוא זה שמגיע
     למורה בראש החודש שלו, ואסור שייבלע בארוך. השעות = משך ההדרכה, הבסיס
     לדוח השעות למונדיי. זה המסך שהמדריכה ממילא פותחת — לא מסך נוסף.
     הטיוטה נשמרת ב-wrapDraft כי renderBody מצייר מחדש בכל רענון ביום המפגש.
     ------------------------------------------------------------------ */
  function wrapValues() {
    if (wrapDraft) return wrapDraft;
    const sm = serverMeeting(sel.date) || {};
    return { summary: sm.summary || '', takeaway: sm.takeaway || '', hours: sm.hours ? String(sm.hours) : '' };
  }
  function wrapCardHtml() {
    if (!sel || sel.date > S.today) return '';
    const v = wrapValues();
    const sm = serverMeeting(sel.date) || {};
    const filled = !!(sm.summary || sm.takeaway || sm.hours);
    return `
      <section class="meet-card meet-wrap" id="meet-wrap">
        <h3>סיכום ההדרכה${filled && !wrapDraft ? ' <span class="n ok">מולא</span>' : ''}</h3>
        <div class="space-hint">מה שנכתב כאן מגיע למורים במבט המורה, ליד החודש הזה. "מה לקחת לכיתה" הוא המשפט שהמורה רואה ראשון.</div>
        <div class="meet-wrap-grid">
          <label class="grow"><span>מה לקחת לכיתה (משפט אחד–שניים)</span>
            <input type="text" class="input" id="wrap-takeaway" maxlength="600" value="${esc(v.takeaway)}" placeholder="למשל: לפתוח כל שיעור בשאלת אבחון קצרה"></label>
          <label><span>כמה זמן נמשכה ההדרכה (שעות)</span>
            <input type="number" class="input" id="wrap-hours" min="0" max="24" step="0.25" value="${esc(v.hours)}" placeholder="1.5"></label>
          <label class="full"><span>סיכום ונקודות חשובות</span>
            <textarea class="textarea" id="wrap-summary" rows="4" maxlength="4000" placeholder="הנקודות המרכזיות של ההדרכה, כפי שתרצי שהמורים יזכרו אותן">${esc(v.summary)}</textarea></label>
        </div>
        <div class="meet-save-bar">
          <button type="button" class="btn btn-primary" id="wrap-save"${wrapDraft && !wrapSaving ? '' : ' disabled'}>
            ${wrapSaving ? 'שומר…' : wrapDraft ? 'שמירת הסיכום' : filled ? 'הסיכום שמור' : 'שמירת הסיכום'}
          </button>
          <span class="meet-save-note" id="wrap-note">${esc(wrapNote || (wrapDraft ? 'יש שינויים שלא נשמרו' : ''))}</span>
        </div>
      </section>`;
  }
  function bindWrap() {
    const card = document.getElementById('meet-wrap');
    if (!card) return;
    const read = () => ({
      summary: document.getElementById('wrap-summary').value,
      takeaway: document.getElementById('wrap-takeaway').value,
      hours: document.getElementById('wrap-hours').value
    });
    ['wrap-summary', 'wrap-takeaway', 'wrap-hours'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        wrapDraft = read();
        wrapNote = '';
        const btn = document.getElementById('wrap-save');
        if (btn) { btn.disabled = wrapSaving; btn.textContent = 'שמירת הסיכום'; }
        const note = document.getElementById('wrap-note');
        if (note) note.textContent = 'יש שינויים שלא נשמרו';
      });
    });
    document.getElementById('wrap-save').addEventListener('click', async () => {
      if (!wrapDraft || wrapSaving) return;
      const v = read();
      wrapSaving = true;
      const btn = document.getElementById('wrap-save');
      btn.disabled = true; btn.textContent = 'שומר…';
      const res = await TS.apiPost('meet.wrap', {
        guide: SLUG, k: KEY, ge: GE, date: sel.date, topic: sel.topic || '', source: sel.source || 'adhoc',
        guideName: GUIDE_CFG.name || '', summary: v.summary, takeaway: v.takeaway, hours: v.hours
      });
      wrapSaving = false;
      if (res && res.ok && res.data) {
        // מעדכנים את המפגש בזיכרון כדי שהכרטיס יראה "שמור" גם לפני הרענון הבא
        const i = S.meetings.findIndex(m => m.date === sel.date);
        if (i >= 0) S.meetings[i] = Object.assign({}, S.meetings[i], res.data);
        else S.meetings.push(res.data);
        wrapDraft = null;
        wrapNote = 'נשמר. המורים יראו את זה במבט המורה.';
        if (typeof TS !== 'undefined' && TS.toast) TS.toast('סיכום ההדרכה נשמר');
        renderBody();
        load();
      } else {
        wrapNote = 'השמירה נכשלה — ' + errText(res && res.error);
        renderBody();
      }
    });
  }

  // בורר בית ספר ברשימת הקבוצה — לפי א"ב (14.9.26)
  const NO_SCHOOL = '— ללא בית ספר —';
  function schoolOf(g) { return g.schoolName || NO_SCHOOL; }
  function schoolSelectHtml(list) {
    const counts = {};
    list.forEach(g => { counts[schoolOf(g)] = (counts[schoolOf(g)] || 0) + 1; });
    const names = Object.keys(counts).sort((a, b) => a.localeCompare(b, 'he'));
    if (schoolF && !counts[schoolF]) schoolF = '';
    return `<select class="select" id="meet-school" aria-label="סינון לפי בית ספר">
      <option value="">כל בתי הספר (${names.length})</option>
      ${names.map(n => `<option value="${esc(n)}"${n === schoolF ? ' selected' : ''}>${esc(n)} · ${counts[n]}</option>`).join('')}
    </select>`;
  }

  function listHtml(list) {
    const q = norm(search);
    const shown = list.filter(g =>
      (filter === 'all' || g.state === filter) &&
      (!schoolF || schoolOf(g) === schoolF) &&
      (!q || norm(g.name).includes(q) || norm(g.schoolName).includes(q)))
      // מסודר לפי בית ספר (א"ב) ובתוכו לפי שם, עם כותרת לכל בית ספר
      .sort((a, b) => schoolOf(a).localeCompare(schoolOf(b), 'he') || String(a.name).localeCompare(String(b.name), 'he'));
    // קבוצה ריקה באמת מול רשימה שעוד לא הגיעה — עד היום שתיהן אמרו "נטענת…"
    if (!list.length) {
      const ready = typeof state !== 'undefined' && state.teachers && state.teachers.length;
      return '<div class="empty" style="padding:22px;">' +
        (ready ? 'אין מורים בקבוצה הזו.' : 'רשימת המורים של הקבוצה עדיין נטענת…') + '</div>';
    }
    if (!shown.length) return '<div class="empty" style="padding:22px;">אין מורים שמתאימים לחיפוש</div>';
    const perSchool = {};
    shown.forEach(g => { perSchool[schoolOf(g)] = (perSchool[schoolOf(g)] || 0) + 1; });
    let last = null;
    return shown.map(g => {
      const s = schoolOf(g);
      const head = s !== last ? `<div class="meet-school-h">${esc(s)} <span>· ${perSchool[s]}</span></div>` : '';
      last = s;
      return head + rowHtml(g, false);
    }).join('');
  }

  function rowHtml(g, pendingBox) {
    const badges = [];
    if (g.self) badges.push(`<span class="mb self">נרשם/ה בעצמו/ה${g.selfAt ? ' ' + esc(whenLabel(g.selfAt)) : ''}</span>`);
    if (g.self && g.guide === 'absent') badges.push('<span class="mb gap">פער</span>');
    if (!g.listed) badges.push('<span class="mb unlisted">לא ברשימת הקבוצה</span>');
    if (g.dirty) badges.push('<span class="mb dirty">לא נשמר</span>');
    // נוכחות מאושרת במועד אחר של אותו חודש — ההדרכה החודשית שלו/ה כבר הושלמה
    if (g.guide !== 'present' && (g.ids || []).some(id => mPresentCache.has(String(id)))) {
      badges.push('<span class="mb month" title="אושרה לו/ה נוכחות במועד אחר של החודש — נספר/ת כמי שהשתתף/ה בהדרכה החודשית">✓ השלים/ה את החודש</span>');
    }
    const ind = HOURS ? (individualIndex().byKey[norm(g.name) + '|' + norm(g.schoolName)] || 0) : 0;
    if (ind) badges.push(`<span class="mb ind" title="קיבל/ה הדרכה פרטנית השנה — נחשב השתתפות">פרטני ×${ind}</span>`);
    return `
      <div class="meet-row s-${g.state}" data-key="${esc(g.key)}">
        <div class="mr-tx">
          <div class="mr-name">${esc(g.name)}</div>
          <div class="mr-meta">${esc(g.schoolName || '')} ${badges.join(' ')}</div>
        </div>
        <div class="mr-act">
          <button type="button" class="mr-btn yes${g.guide === 'present' ? ' on' : ''}" data-mark="present" aria-pressed="${g.guide === 'present'}">${pendingBox ? 'אישור' : 'נכח/ה'}</button>
          <button type="button" class="mr-btn no${g.guide === 'absent' ? ' on' : ''}" data-mark="absent" aria-pressed="${g.guide === 'absent'}">לא נכח/ה</button>
        </div>
      </div>`;
  }

  function bindBody(list) {
    const byKey = {};
    list.forEach(g => { byKey[g.key] = g; });
    document.querySelectorAll('#meet-body .meet-row [data-mark]').forEach(b => {
      b.addEventListener('click', () => {
        const g = byKey[b.closest('.meet-row').dataset.key];
        if (!g) return;
        const want = b.dataset.mark;
        setMark(g, g.guide === want ? '' : want);
      });
    });
    document.querySelectorAll('#meet-body [data-filter]').forEach(b => {
      b.addEventListener('click', () => { filter = (filter === b.dataset.filter) ? 'all' : b.dataset.filter; renderBody(); });
    });
    const s = document.getElementById('meet-search');
    s.addEventListener('input', () => {
      search = s.value;
      document.getElementById('meet-list').innerHTML = listHtml(entries());
      bindRows(byKey);
    });
    const sch = document.getElementById('meet-school');
    if (sch) sch.addEventListener('change', () => {
      schoolF = sch.value;
      document.getElementById('meet-list').innerHTML = listHtml(entries());
      bindRows(byKey);
    });
    document.getElementById('meet-save').addEventListener('click', save);
    document.getElementById('meet-rest-absent').addEventListener('click', () => {
      list.filter(g => g.state === 'none').forEach(g => { edits[g.key] = 'absent'; });
      renderBody();
    });
    const all = document.getElementById('meet-approve-all');
    if (all) all.addEventListener('click', () => {
      list.filter(g => g.state === 'pending').forEach(g => { edits[g.key] = 'present'; });
      renderBody();
    });
    bindLive();
    bindZoom(list);
  }
  function bindRows(byKey) {
    document.querySelectorAll('#meet-list .meet-row [data-mark]').forEach(b => {
      b.addEventListener('click', () => {
        const g = byKey[b.closest('.meet-row').dataset.key];
        if (!g) return;
        setMark(g, g.guide === b.dataset.mark ? '' : b.dataset.mark);
      });
    });
  }

  // ---------- ייבוא דוח משתתפים מהזום (14.9.26) ----------
  // הדוח (CSV) יורד מאתר הזום: Reports → Usage → מספר המשתתפים ליד המפגש → Export.
  // אותו אדם שנכנס ויצא כמה פעמים מופיע בכמה שורות — מחברים את הדקות.
  // ההתאמה לשמות הקבוצה היא הצעה בלבד: המדריכ/ה רואה כל שורה, מתקנ/ת ומאשר/ת,
  // ורק אז זה נכנס לסימונים (ועדיין צריך "שמירה"). נשמר עם markedVia='zoom'.
  const ZOOM_DEFAULT_MIN = 20;

  function viaOf(k) { return zoomMeta[k] ? 'zoom' : 'manual'; }
  function zoomMinOf(k) { return zoomMeta[k] ? zoomMeta[k].minutes : ''; }

  function parseCsv(text) {
    const rows = []; let row = [], cell = '', q = false;
    const t = String(text || '').replace(/^﻿/, '');
    const delim = (t.split('\n')[0].match(/\t/g) || []).length > (t.split('\n')[0].match(/,/g) || []).length ? '\t' : ',';
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) {
        if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && t[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.map(r => r.map(c => c.trim()));
  }

  // מאתר את שורת הכותרות של טבלת המשתתפים. בקובץ הזום יש לפעמים קודם טבלת
  // סיכום של המפגש ("Host name", "Duration") — לכן מחפשים עמודת שם שאינה של המארח
  // וגם עמודת הצטרפות/עזיבה/מייל, ובוחרים את ההתאמה האחרונה.
  function zoomParse(text) {
    const rows = parseCsv(text).filter(r => r.some(Boolean));
    let hIdx = -1, cols = null;
    rows.forEach((r, i) => {
      const low = r.map(c => c.toLowerCase());
      const name = low.findIndex(c => /^(name|שם|participant|משתתף|الاسم)/.test(c) || /name \(|שם \(/.test(c));
      const dur = low.findIndex(c => /duration|משך|minutes|דקות|المدة/.test(c));
      const email = low.findIndex(c => /e-?mail|מייל|דוא"?ל|דואר/.test(c));
      const extra = low.some(c => /join|leave|guest|הצטרפות|עזיבה|אורח/.test(c)) || email >= 0;
      if (name >= 0 && !/host|מארח/.test(low[name]) && extra) { hIdx = i; cols = { name, dur, email }; }
    });
    if (hIdx < 0) {
      // בלי כותרות (הדבקה של רשימת שמות מחלון המשתתפים) — כל שורה = שם
      const names = rows.map(r => r[0]).filter(n => n && n.length < 80);
      return names.map(n => ({ raw: n, minutes: 0 }));
    }
    const byName = {};
    rows.slice(hIdx + 1).forEach(r => {
      const raw = r[cols.name] || '';
      if (!raw) return;
      const key = norm(raw.replace(/\s*\(.*\)\s*$/, '')) || norm(raw);
      const it = byName[key] || (byName[key] = { raw: raw, minutes: 0, email: '' });
      it.minutes += cols.dur >= 0 ? (Number(String(r[cols.dur]).replace(/[^\d.]/g, '')) || 0) : 0;
      if (cols.email >= 0 && r[cols.email]) it.email = r[cols.email].toLowerCase();
    });
    return Object.values(byName);
  }

  // נרמול לשם השוואה: בלי ניקוד, בלי פיסוק, אותיות סופיות כרגילות
  function nameKey(s) {
    return String(s || '').toLowerCase()
      .replace(/[֑-ׇً-ٟ]/g, '')
      .replace(/[ךםןףץ]/g, ch => ({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' })[ch])
      .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }
  function nameScore(a, b) {
    const x = nameKey(a), y = nameKey(b);
    if (!x || !y) return 0;
    if (x === y) return 1;
    const tx = x.split(' '), ty = y.split(' ');
    const common = tx.filter(w => w.length > 1 && ty.indexOf(w) >= 0).length;
    let s = common / Math.max(tx.length, ty.length);
    if (common && (x.includes(y) || y.includes(x))) s = Math.max(s, 0.85);
    return s;
  }

  function zoomMatch(items, list) {
    const emailOf = {};
    ((typeof myTeachers === 'function') ? myTeachers() : []).forEach(t => {
      if (t.email) emailOf[String(t.email).trim().toLowerCase()] = String(t.id);
    });
    const guideName = GUIDE_CFG.name || '';
    const cands = [];
    items.forEach((it, i) => {
      // "כינוי (שם מקורי)" — בודקים את שני החלקים
      const m = it.raw.match(/^(.*?)\s*\((.*)\)\s*$/);
      const names = m ? [m[1], m[2]] : [it.raw];
      it.display = names[0] || it.raw;
      it.host = guideName && names.some(n => nameScore(n, guideName) >= 0.6);
      list.forEach(g => {
        let sc = Math.max.apply(null, names.map(n => nameScore(n, g.name)));
        if (it.email && emailOf[it.email] && g.ids.indexOf(emailOf[it.email]) >= 0) sc = 1.01;
        if (sc >= 0.5) cands.push({ i, key: g.key, sc });
      });
    });
    // התאמה חמדנית: הציון הגבוה קודם, כל משתתף וכל מורה פעם אחת
    cands.sort((a, b) => b.sc - a.sc);
    const usedItem = new Set(), usedKey = new Set();
    cands.forEach(c => {
      if (usedItem.has(c.i) || usedKey.has(c.key) || items[c.i].host) return;
      usedItem.add(c.i); usedKey.add(c.key);
      items[c.i].matchKey = c.key; items[c.i].score = c.sc;
    });
    items.forEach(it => {
      if (it.matchKey === undefined) it.matchKey = '';
      it.checked = !!it.matchKey && !it.host && (it.minutes === 0 || it.minutes >= zoom.minMin) && (it.score || 0) >= 0.6;
    });
    items.sort((a, b) => (a.host - b.host) || (!!a.matchKey - !!b.matchKey) || a.display.localeCompare(b.display, 'he'));
  }

  function zoomPanelHtml(list) {
    if (zoom.stage === 'input') {
      return `
      <section class="meet-card meet-zoom">
        <h3>ייבוא דוח משתתפים מהזום</h3>
        <div class="space-hint">
          מורידים את הדוח מאתר הזום (zoom.us, לא מהאפליקציה): <b>Reports</b> ← <b>Usage</b> ← לוחצים על מספר המשתתפים ליד המפגש ← <b>Export</b>.
          המערכת מחברת כניסות חוזרות של אותו אדם, מציעה התאמה לשמות הקבוצה, ואתם מאשרים לפני שמשהו מסומן.
        </div>
        <div class="zoom-drop" id="zoom-drop">
          <input type="file" id="zoom-file" accept=".csv,.txt,text/csv">
          <div>או הדבקה של רשימת המשתתפים (שם בכל שורה):</div>
          <textarea class="textarea" id="zoom-paste" rows="4" placeholder="מדביקים כאן…"></textarea>
        </div>
        ${zoom.error ? `<div class="meet-warn">${ICON.alert}<span>${esc(zoom.error)}</span></div>` : ''}
        <div class="meet-save-bar">
          <button type="button" class="btn btn-primary" id="zoom-read">קריאת הרשימה</button>
          <button type="button" class="btn btn-secondary" id="zoom-cancel">ביטול</button>
        </div>
      </section>`;
    }
    const byKey = {};
    list.forEach(g => { byKey[g.key] = g; });
    const opts = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'he'));
    const matched = zoom.items.filter(it => it.matchKey && !it.host).length;
    const checked = zoom.items.filter(it => it.checked).length;
    const unmatched = zoom.items.filter(it => !it.matchKey && !it.host).length;
    const hasMinutes = zoom.items.some(it => it.minutes > 0);
    return `
      <section class="meet-card meet-zoom">
        <h3>ייבוא דוח משתתפים מהזום${zoom.fileName ? ' · <span style="font-weight:500;color:var(--text-muted);font-size:12.5px;">' + esc(zoom.fileName) + '</span>' : ''}</h3>
        <div class="space-hint">
          ${zoom.items.length} משתתפים בדוח · <b>${matched}</b> הותאמו לרשימת הקבוצה${unmatched ? ' · <b style="color:#9a6400">' + unmatched + ' לא הותאמו</b> — בוחרים ידנית, או משאירים "לא מהקבוצה"' : ''}.
          בודקים כל שורה. רק שורות מסומנות ב-✓ יסומנו "נכח/ה".
        </div>
        ${hasMinutes ? `<label class="zoom-min">מינימום דקות במפגש כדי להיחשב נוכח/ת:
          <input type="number" class="input" id="zoom-min" min="0" max="300" value="${zoom.minMin}"></label>` : ''}
        <div class="zoom-table-wrap">
          <table class="zoom-table">
            <thead><tr><th>✓</th><th>השם בזום</th>${hasMinutes ? '<th>דקות</th>' : ''}<th>מורה ברשימה</th></tr></thead>
            <tbody>${zoom.items.map((it, i) => `
              <tr class="${it.host ? 'host' : !it.matchKey ? 'nomatch' : (hasMinutes && it.minutes < zoom.minMin ? 'short' : '')}">
                <td><input type="checkbox" data-zchk="${i}"${it.checked ? ' checked' : ''}${it.matchKey ? '' : ' disabled'} aria-label="לסמן נכח/ה"></td>
                <td>${esc(it.raw)}${it.host ? ' <span class="mb self">המדריך/ה</span>' : ''}${it.email ? '<div class="zoom-email">' + esc(it.email) + '</div>' : ''}</td>
                ${hasMinutes ? `<td class="num">${Math.round(it.minutes)}</td>` : ''}
                <td><select class="select" data-zsel="${i}">
                  <option value="">— לא מהקבוצה —</option>
                  ${opts.map(g => `<option value="${esc(g.key)}"${it.matchKey === g.key ? ' selected' : ''}>${esc(g.name)} · ${esc(g.schoolName || '')}</option>`).join('')}
                </select></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="meet-save-bar">
          <button type="button" class="btn btn-primary" id="zoom-apply"${checked ? '' : ' disabled'}>סימון ${checked} כ"נכח/ה"</button>
          <button type="button" class="btn btn-secondary" id="zoom-back">קובץ אחר</button>
          <button type="button" class="btn btn-secondary" id="zoom-cancel">ביטול</button>
        </div>
      </section>`;
  }

  function bindZoom(list) {
    const btn = document.getElementById('meet-zoom-btn');
    if (btn) btn.addEventListener('click', () => {
      zoom = { stage: 'input', items: [], minMin: ZOOM_DEFAULT_MIN, fileName: '', error: '' };
      clearTimeout(pollTimer);
      renderBody();
      const p = document.querySelector('.meet-zoom');
      if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    if (!zoom) return;
    const cancel = document.getElementById('zoom-cancel');
    if (cancel) cancel.addEventListener('click', () => { zoom = null; renderBody(); schedulePoll(); });

    if (zoom.stage === 'input') {
      const run = (text, fileName) => {
        const items = zoomParse(text);
        if (!items.length) { zoom.error = 'לא נמצאו משתתפים בקובץ. בודקים שזה דוח המשתתפים (Participants) מאתר הזום.'; renderBody(); return; }
        zoom.items = items; zoom.fileName = fileName || ''; zoom.stage = 'review'; zoom.error = '';
        zoomMatch(zoom.items, list);
        renderBody();
      };
      document.getElementById('zoom-read').addEventListener('click', () => {
        const f = document.getElementById('zoom-file').files[0];
        const pasted = document.getElementById('zoom-paste').value;
        if (f) {
          if (/\.xlsx?$/i.test(f.name)) { zoom.error = 'זה קובץ אקסל. בזום בוחרים ייצוא כ-CSV, או פותחים באקסל ושומרים בשם כ-CSV.'; renderBody(); return; }
          const fr = new FileReader();
          fr.onload = () => run(String(fr.result || ''), f.name);
          fr.onerror = () => { zoom.error = 'הקובץ לא נקרא.'; renderBody(); };
          fr.readAsText(f, 'utf-8');
        } else if (pasted.trim()) run(pasted, '');
        else { zoom.error = 'בוחרים קובץ או מדביקים רשימה.'; renderBody(); }
      });
      return;
    }

    document.querySelectorAll('[data-zchk]').forEach(c => c.addEventListener('change', () => {
      zoom.items[Number(c.dataset.zchk)].checked = c.checked; renderBody();
    }));
    document.querySelectorAll('[data-zsel]').forEach(s => s.addEventListener('change', () => {
      const it = zoom.items[Number(s.dataset.zsel)];
      // אותו מורה לא יכול להיות מותאם לשני משתתפים — ההתאמה הקודמת מתבטלת
      if (s.value) zoom.items.forEach(o => { if (o !== it && o.matchKey === s.value) { o.matchKey = ''; o.checked = false; } });
      it.matchKey = s.value;
      it.checked = !!s.value && !it.host;
      renderBody();
    }));
    const minEl = document.getElementById('zoom-min');
    if (minEl) minEl.addEventListener('change', () => {
      zoom.minMin = Math.max(0, Number(minEl.value) || 0);
      zoom.items.forEach(it => { if (it.matchKey && !it.host) it.checked = it.minutes >= zoom.minMin; });
      renderBody();
    });
    document.getElementById('zoom-back').addEventListener('click', () => { zoom.stage = 'input'; zoom.items = []; renderBody(); });
    document.getElementById('zoom-apply').addEventListener('click', () => {
      const byKey = {};
      list.forEach(g => { byKey[g.key] = g; });
      const marked = new Set();
      zoom.items.filter(it => it.checked && it.matchKey && byKey[it.matchKey]).forEach(it => {
        const g = byKey[it.matchKey];
        marked.add(g.key);
        zoomMeta[g.key] = { minutes: Math.round(it.minutes) || '' };
        edits[g.key] = 'present';
      });
      // מי שמסומן "נכח/ה" אבל לא הופיע בדוח — להפנות תשומת לב, לא לשנות לבד
      const notInZoom = list.filter(g => g.guide === 'present' && !marked.has(g.key));
      zoom = null;
      renderBody();
      schedulePoll();
      const note = document.getElementById('meet-save-note');
      if (note) note.innerHTML = 'סומנו ' + marked.size + ' מתוך דוח הזום — לוחצים "שמירה".' +
        (notInZoom.length ? '<br><span class="bad">מסומנים "נכח/ה" ולא מופיעים בדוח: ' + esc(notInZoom.map(g => g.name).join(', ')) + '</span>' : '');
    });
  }

  // ---------- שמירה ----------
  async function save() {
    const list = entries();
    const byKey = {};
    list.forEach(g => { byKey[g.key] = g; });
    const want = Object.assign({}, edits);
    const records = Object.keys(want).map(k => {
      const g = byKey[k];
      if (!g) return null;
      return g.teacherId
        ? { teacherId: g.teacherId, teacherName: g.name, schoolName: g.schoolName, status: want[k], via: viaOf(k), zoomMinutes: zoomMinOf(k) }
        : { rowId: g.rowId, status: want[k], via: viaOf(k), zoomMinutes: zoomMinOf(k) };
    }).filter(Boolean);
    if (!records.length) { edits = {}; renderBody(); return; }

    saving = true;
    renderBody();
    const res = await TS.apiPost('meet.mark', {
      guide: SLUG, k: KEY, ge: GE, date: sel.date, topic: sel.topic || '', source: sel.source || 'adhoc',
      guideName: GUIDE_CFG.name || '', records: JSON.stringify(records)
    });
    saving = false;

    if (res && res.ok) {
      // מה שסומן בזמן השמירה נשאר לשמירה הבאה
      Object.keys(want).forEach(k => { if (edits[k] === want[k]) { delete edits[k]; delete zoomMeta[k]; } });
      await load();
      TS.toast('הנוכחות נשמרה');
      return;
    }
    // POST לא חוזר על עצמו (היה משכפל), אבל התשובה שלו נופלת לפעמים גם כשהכתיבה
    // עברה. טוענים מחדש ובודקים מה נחת לפני שאומרים "לא נשמר".
    await load();
    const after = entries();
    const byKeyAfter = {};
    after.forEach(g => { byKeyAfter[g.key] = g; });
    let missing = 0;
    Object.keys(want).forEach(k => {
      const g = byKeyAfter[k];
      const serverGuide = g && g.row ? (g.row.guideStatus || '') : '';
      const target = want[k] === 'clear' ? '' : want[k];
      if (g && serverGuide === target) { if (edits[k] === want[k]) delete edits[k]; }
      else missing++;
    });
    renderBody();
    if (missing) {
      const note = document.getElementById('meet-save-note');
      if (note) note.innerHTML = '<span class="bad">' + esc(missing + ' סימונים לא נשמרו. ' + errText(res && res.error)) + '</span>';
    } else {
      TS.toast('הנוכחות נשמרה');
    }
  }

  // ---------- רישום עצמי חי — בתוך השורה של המועד (24.9.26) ----------
  // משך הפתיחה לפי מועדי היום: מהשעה הראשונה עד שעה אחרי האחרונה (מוריה:
  // 16:00–19:00 = שלוש שעות). בלי שעות בתוכנית — שעה וחצי. השרת מגביל ל-10–180.
  function openMinutesFor(s) {
    const mins = (s && s.slots ? s.slots : []).map(x => { const [h, m] = x.start.split(':').map(Number); return h * 60 + m; }).sort((a, b) => a - b);
    if (mins.length < 2) return 90;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const end = mins[mins.length - 1] + 75;
    return Math.max(60, Math.min(180, end - Math.min(nowMin, mins[0])));
  }

  function livePanelHtml(sm) {
    return `
      <div class="ss-live meet-live open">
        <div class="ml-code-wrap">
          <div class="ml-label">הקוד עכשיו</div>
          <div class="ml-code" id="meet-code" dir="ltr">····</div>
          <div class="ml-bar"><span id="meet-bar"></span></div>
          <div class="ml-count" id="meet-countdown"></div>
        </div>
        <div class="ml-tx">
          <h3><span class="live-dot"></span><span>הרישום פתוח עד ${esc(hhmm(sm.openUntil))}</span></h3>
          <p>משתפים מסך עם הקוד ומדביקים בצ'אט של הזום את הקישור. המורים נכנסים לקישור, בוחרים את השם ומקלידים את הקוד. הקוד מתחלף כל 5 דקות, וגם מי שהקליד רגע לפני ההחלפה נקלט.</p>
          <div class="ml-url" dir="ltr">${esc(mifgashUrl())}</div>
          <div class="gl-actions">
            <button type="button" class="gl-btn wa" id="meet-project">${ICON.screen}<span>הקרנה במסך מלא</span></button>
            <button type="button" class="gl-btn" id="meet-copy">${ICON.copy}<span>העתקת הודעה לצ'אט</span></button>
            <button type="button" class="gl-btn" id="meet-extend">הארכה בשעה</button>
          </div>
          <div class="ws-status" id="meet-live-status"></div>
        </div>
      </div>`;
  }

  async function openRegistration(s, btn, minutes) {
    if (!s) return;
    if (btn) { btn.disabled = true; const t = btn.querySelector('span') || btn; t.textContent = 'פותח…'; }
    const body = {
      guide: SLUG, k: KEY, ge: GE, date: s.date, sessionDates: s.date, minutes: minutes || openMinutesFor(s),
      topic: s.topic || '', source: s.source || 'adhoc', guideName: GUIDE_CFG.name || ''
    };
    let res = await TS.apiPost('meet.open', body);
    // תשובה שהתקלקלה בדרך — פתיחה חוזרת בטוחה (רק מעדכנת את שעת הסגירה)
    for (let i = 0; i < 2 && res && res.error === 'bad_response'; i++) {
      await new Promise(r => setTimeout(r, 1500));
      res = await TS.apiPost('meet.open', body);
    }
    if (res && res.ok) {
      if (res.data) {
        // השורה נפתחת מיד, לפני הרענון
        const i = S.meetings.findIndex(m => m.date === s.date);
        const patch = { date: s.date, id: res.data.id, open: true, openUntil: res.data.openUntil, topic: res.data.topic || s.topic || '' };
        if (i >= 0) S.meetings[i] = Object.assign({}, S.meetings[i], patch);
        else S.meetings.push(Object.assign({ counts: { present: 0, absent: 0, pending: 0, gaps: 0 } }, patch));
        renderMonths();
        applyCodes(res.data);
      }
      await load();
      return;
    }
    await load();   // אולי נפתח למרות שהתשובה נפלה
    const sm = serverMeeting(s.date);
    if (!(sm && sm.open)) TS.toast(errText(res && res.error));
  }

  async function closeRegistration(date, btn) {
    if (!confirm('לסגור את הרישום? אחרי הסגירה המורים לא יוכלו להירשם עם הקוד.')) return;
    if (btn) { btn.disabled = true; btn.textContent = 'סוגר…'; }
    const res = await TS.apiPost('meet.close', { guide: SLUG, k: KEY, ge: GE, date: date });
    if (!(res && res.ok)) TS.toast(errText(res && res.error));
    else {
      const i = S.meetings.findIndex(m => m.date === date);
      if (i >= 0) S.meetings[i] = Object.assign({}, S.meetings[i], { open: false, openUntil: 0 });
      TS.toast('הרישום נסגר');
    }
    stopLive();
    await load();
  }

  function bindLive() {
    const copyBtn = document.getElementById('meet-copy');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const text = 'רישום נוכחות למפגש' + (ARAB ? ' | تسجيل الحضور' : '') + ':\n' + mifgashUrl() +
        '\nמקלידים את הקוד שמופיע על המסך' + (ARAB ? '\nاكتبوا الرمز الظاهر على الشاشة' : '');
      const done = () => { const s = copyBtn.querySelector('span'); s.textContent = 'הועתק ✓'; setTimeout(() => { s.textContent = "העתקת הודעה לצ'אט"; }, 2200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => window.prompt('להעתקה:', text));
      else window.prompt('להעתקה:', text);
    });
    const projBtn = document.getElementById('meet-project');
    if (projBtn) projBtn.addEventListener('click', openProjector);
    const extBtn = document.getElementById('meet-extend');
    if (extBtn) extBtn.addEventListener('click', () => {
      const sm = serverMeeting(S.today);
      const left = sm && sm.openUntil ? Math.max(0, Math.ceil((sm.openUntil - Date.now()) / 60000)) : 0;
      openRegistration(todaySession() || { date: S.today, topic: '', source: 'adhoc', slots: [] }, extBtn, Math.min(180, left + 60));
    });
  }

  // הקוד של המועד שפתוח היום
  async function fetchCode() {
    if (codeFetching) return;
    codeFetching = true;
    clearTimeout(codeTimer);
    const res = await TS.api('meet.code', { guide: SLUG, k: KEY, ge: GE, date: S.today, sessionDates: S.today }, { cache: 'no' });
    codeFetching = false;
    if (res && res.ok && res.data) { applyCodes(res.data); return; }
    if (res && res.error === 'closed') { stopLive(); load(); return; }
    codeTimer = setTimeout(fetchCode, 8000);   // תקלה רגעית — ניסיון חוזר קרוב
  }
  function applyCodes(d) {
    if (!d || !d.codes) return;
    live = { codes: d.codes, offset: (d.serverNow || Date.now()) - Date.now(), openUntil: d.openUntil, stepSec: d.stepSec || 300 };
    clearInterval(tickTimer);
    tickTimer = setInterval(tick, 1000);
    clearTimeout(codeTimer);
    codeTimer = setTimeout(fetchCode, CODE_REFRESH_MS);
    tick();
  }
  function stopLive() {
    live = null;
    clearInterval(tickTimer); clearTimeout(codeTimer);
    closeProjector();
  }
  function currentCode() {
    if (!live) return null;
    const t = Date.now() + live.offset;
    if (live.openUntil && t >= live.openUntil) return { expired: true };
    const c = live.codes.find(x => t >= x.from && t < x.to);
    if (!c) return null;
    return { code: c.code, left: Math.max(0, Math.ceil((c.to - t) / 1000)), frac: (c.to - t) / (c.to - c.from) };
  }
  function tick() {
    const cur = currentCode();
    if (cur && cur.expired) { stopLive(); load(); return; }
    const txt = cur ? cur.code : '····';
    const left = cur ? cur.left : 0;
    const frac = cur ? cur.frac : 0;
    if (!cur && live && Date.now() - lastCodeFetch > 8000) { lastCodeFetch = Date.now(); fetchCode(); }
    [['meet-code', 'meet-bar', 'meet-countdown'], ['proj-code', 'proj-bar', 'proj-count']].forEach(([a, b, c]) => {
      const el = document.getElementById(a);
      if (!el) return;
      if (el.textContent !== txt) el.textContent = txt;
      const bar = document.getElementById(b);
      if (bar) bar.style.width = Math.round(frac * 100) + '%';
      const cnt = document.getElementById(c);
      if (cnt) cnt.textContent = cur ? 'מתחלף בעוד ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') : 'טוען קוד…';
    });
  }

  // ---------- הקרנה ----------
  function openProjector() {
    closeProjector();
    const url = mifgashUrl();
    const short = url.replace(/^https?:\/\//, '');
    const ov = document.createElement('div');
    ov.className = 'meet-proj';
    ov.id = 'meet-proj';
    ov.innerHTML = `
      <button type="button" class="proj-x" id="proj-x" aria-label="סגירה">×</button>
      <div class="proj-grid">
        <div class="proj-side">
          <div class="proj-h">רישום נוכחות למפגש</div>
          ${ARAB ? '<div class="proj-ar" lang="ar">تسجيل الحضور للقاء</div>' : ''}
          <ol class="proj-steps">
            <li>נכנסים לקישור מהצ'אט או סורקים${ARAB ? '<span lang="ar">ادخلوا الرابط من الدردشة أو امسحوا الرمز</span>' : ''}</li>
            <li>בוחרים את השם${ARAB ? '<span lang="ar">اختاروا اسمكم</span>' : ''}</li>
            <li>מקלידים את הקוד${ARAB ? '<span lang="ar">اكتبوا الرمز</span>' : ''}</li>
          </ol>
          <div class="proj-qr" id="proj-qr"></div>
          <div class="proj-url" dir="ltr">${esc(short)}</div>
        </div>
        <div class="proj-main">
          <div class="proj-label">הקוד${ARAB ? ' · <span lang="ar">الرمز</span>' : ''}</div>
          <div class="proj-code" id="proj-code" dir="ltr">····</div>
          <div class="proj-bar"><span id="proj-bar"></span></div>
          <div class="proj-count" id="proj-count"></div>
        </div>
      </div>`;
    document.body.appendChild(ov);
    document.getElementById('proj-x').addEventListener('click', closeProjector);
    document.addEventListener('keydown', escClose);
    if (ov.requestFullscreen) ov.requestFullscreen().catch(() => {});
    drawQr(url);
    tick();
  }
  function escClose(e) { if (e.key === 'Escape') closeProjector(); }
  function closeProjector() {
    const ov = document.getElementById('meet-proj');
    document.removeEventListener('keydown', escClose);
    if (!ov) return;
    if (document.fullscreenElement === ov && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    ov.remove();
  }
  function drawQr(url) {
    const target = document.getElementById('proj-qr');
    const draw = () => {
      if (!window.QRCode || !target) return;
      QRCode.toCanvas(url, { width: 220, margin: 1, color: { dark: '#143E4C', light: '#FFFFFF' } }, (err, canvas) => {
        if (canvas && target.isConnected) { target.innerHTML = ''; target.appendChild(canvas); }
      });
    };
    if (window.QRCode) { draw(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js';
    s.onload = draw;
    document.head.appendChild(s);
  }
})();
