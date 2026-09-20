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

  const S = { today: localToday(), meetings: [], rows: [], loaded: false, failed: false, badKey: false };
  let sel = null;           // { date, topic, source, label, time }
  let edits = {};           // entryKey → 'present' | 'absent' | 'clear'
  let live = null;          // { codes, offset, openUntil }
  let filter = 'all';
  let search = '';
  let schoolF = '';         // סינון רשימת הקבוצה לפי בית ספר
  let saving = false;
  let pollTimer = null, tickTimer = null, codeTimer = null;
  let adhocMeetings = [];
  let openMinutes = '90';
  let codeFetching = false;
  let lastCodeFetch = 0;
  let zoom = null;          // חלון ייבוא דוח הזום — ראו "ייבוא דוח משתתפים"
  let zoomMeta = {};        // entryKey → { minutes } — סימונים שבאו מהדוח

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
    if (!SLUG) { if (btn) btn.hidden = true; return; }
    renderShell();
    renderNextMeet();
    if (!CAN) { renderNoKey(); return; }
    pickDefault();
    renderSelection();
    // ביום המפגש הלשונית נפתחת לבד — זה מה שהמדריכ/ה צריכ/ה באותו יום
    if (isLiveDay() && btn) btn.click();
    load();
    window.addEventListener('beforeunload', e => {
      if (Object.keys(edits).length) { e.preventDefault(); e.returnValue = ''; }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isLiveDay()) load();
    });
  });

  // dashboard.js קורא לזה אחרי שרשימת המורים נטענה
  window.MEET_onRoster = function () { renderYear(); if (CAN && sel) renderBody(); };

  // ---------- הדרכה פרטנית כהשתתפות (14.9.26, החלטת מיטל) ----------
  // מורה שקיבל/ה שעה פרטנית "השתתף/ה השנה". לא נכנס לסימון של מפגש — מוצג
  // כתווית ליד השם. ודרישה: כל בית ספר בקבוצה לפחות הדרכה פרטנית אחת בשנה.
  // אותם כללים כמו ב-assets/meet-stats.js (שם + בית ספר, משנת הלימודים הנוכחית).
  let HOURS = null;   // null = השעות עוד לא נטענו (space.js)
  window.MEET_onHours = function (rows) {
    HOURS = rows || [];
    renderYear();
    if (CAN && sel && S.loaded && !saving) renderBody();
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

  // ---------- בחירת מפגש ----------
  function planMeetings() {
    return (PLAN && PLAN.meetings ? PLAN.meetings : []).map(m => ({
      date: m.date, date2: m.date2 || '', dates: m.dates || null, subject: m.subject || '', topic: m.topic || '', source: 'plan', label: m.label || labelOf(m.date), time: m.time || '', day: m.day || ''
    }));
  }

  // ---------- כרטיס "המפגש הבא" בראש העמוד (14.9.26) ----------
  // מדריכות לא מצאו איך נכנסים לנוכחות — הלשונית יושבת נמוך, ובמפגש עתידי
  // היא הציגה רק "המפגש עוד לא התקיים". הכרטיס מוביל ישר לרישום של אותו מפגש.
  function daysUntil(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const [ty, tm, td] = S.today.split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
  }
  // כל ימי המפגש: dates (מוריה — עד 3 ימים בחודש), או date + date2
  function daysOf(m) { return m ? (m.dates && m.dates.length ? m.dates : [m.date, m.date2].filter(Boolean)) : []; }
  function isDayOf(m, d) { return daysOf(m).indexOf(d) !== -1; }
  function nextMeeting() {
    return allMeetings().find(m => m.date >= S.today || (m.date2 && m.date2 >= S.today)) || null;
  }
  function renderNextMeet() {
    const box = document.getElementById('next-meet');
    if (!box) return;
    const m = nextMeeting();
    if (!m) { box.hidden = true; return; }
    const isToday = isDayOf(m, S.today);
    // מפגש בשני ימים: הספירה לאחור עד המועד הקרוב שעוד לא עבר
    const upcoming = daysOf(m).filter(d => d >= S.today).sort()[0];
    const n = daysUntil(upcoming);
    const when = isToday ? 'היום' : n === 1 ? 'מחר' : 'בעוד ' + n + ' ימים';
    const zoomUrl = GUIDE_CFG && /^https:\/\//.test(GUIDE_CFG.zoom || '') ? GUIDE_CFG.zoom : '';
    box.className = 'nm-card' + (isToday ? ' today' : '');
    box.innerHTML = `
      <div class="nm-date"><b>${esc(labelOf(upcoming).replace(/\.\d\d$/, ''))}</b><span>${esc(m.day || '')}</span></div>
      <div class="nm-tx">
        <div class="nm-eyebrow">${isToday ? '<span class="live-dot"></span>' : ''}<span>${isToday ? 'המפגש היום' : 'המפגש הבא · ' + esc(when)}</span></div>
        <div class="nm-title">${esc(m.topic || 'מפגש הדרכה')}</div>
        <div class="nm-sub">${esc(m.label)}${m.time ? ' · <bdi dir="ltr">' + esc(m.time) + '</bdi>' : ''}${isToday ? '' : ' · ביום המפגש נכנסים מכאן לרישום הנוכחות'}</div>
      </div>
      <div class="nm-act">
        ${zoomUrl ? `<a class="nm-btn" href="${esc(zoomUrl)}" target="_blank" rel="noopener">${ICON.screen}<span>כניסה לזום</span></a>` : ''}
        <button type="button" class="nm-btn primary" id="nm-go">${ICON.check}<span>${isToday ? 'כניסה למפגש ומילוי נוכחות' : 'למפגש ולנוכחות'}</span></button>
      </div>`;
    box.hidden = false;
    document.getElementById('nm-go').addEventListener('click', () => {
      if (CAN && (!sel || sel.date !== m.date)) selectMeeting(m);
      if (window.TS_goTab) window.TS_goTab('meet');
    });
  }
  function allMeetings() {
    const list = planMeetings();
    const have = new Set(list.map(m => m.date));
    S.meetings.concat(adhocMeetings).forEach(m => {
      if (have.has(m.date)) return;
      have.add(m.date);
      list.push({ date: m.date, topic: m.topic || '', source: 'adhoc', label: labelOf(m.date), time: '' });
    });
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }
  function pickDefault() {
    const list = allMeetings();
    sel = list.find(m => isDayOf(m, S.today))
      || list.filter(m => m.date < S.today).pop()
      || list[0]
      || null;
  }
  // מפגש בשני ימים (שירה: בוקר ביום א׳, ערב ביום ד׳) — הרישום העצמי נפתח בכל אחד מהם,
  // והנוכחות נרשמת תחת המפגש (date). בלי date2 זה פשוט היום של המפגש.
  function isLiveDay() { return !!sel && isDayOf(sel, S.today); }
  function sessionDates() { return daysOf(sel).join(','); }
  function serverMeeting(date) { return S.meetings.find(m => m.date === date) || null; }

  // ---------- טעינה ----------
  async function load() {
    if (!sel) {
      // בלי תוכנית (שירה): אולי כבר נרשמו מפגשים שלא בתוכנית — מושכים את הרשימה
      const r0 = await TS.api('meet.state', { guide: SLUG, k: KEY, ge: GE, all: 1 }, { cache: 'no' });
      if (r0 && r0.ok && r0.data) { S.meetings = r0.data.meetings || []; publishAll(r0.data); }
      else if (r0 && r0.error === 'bad_key') { S.badKey = true; renderSelection(); renderBody(); return; }
      pickDefault();
      renderSelection();
      if (!sel) return;
    }
    const date = sel.date;
    const res = await TS.api('meet.state', { guide: SLUG, k: KEY, ge: GE, date: date, all: 1 }, { cache: 'no' });
    if (res && res.ok && res.data) publishAll(res.data);
    if (!sel || sel.date !== date) return;   // בינתיים נבחר מפגש אחר
    if (res && res.ok && res.data) {
      S.meetings = res.data.meetings || [];
      S.rows = res.data.rows || [];
      S.loaded = true; S.failed = false; S.badKey = false;
      const sm = serverMeeting(date);
      if (sm && sm.open && isLiveDay()) { if (!live) fetchCode(); }
      else if (live) stopLive();
    } else if (res && res.error === 'bad_key') {
      S.badKey = true;
    } else {
      S.failed = true;
    }
    renderSelectOptions();
    renderNextMeet();
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
    if (typeof window.DASH_onMeetings === 'function') window.DASH_onMeetings();
  }
  function schedulePoll() {
    clearTimeout(pollTimer);
    if (isLiveDay() && !S.badKey && !zoom) {
      pollTimer = setTimeout(() => { if (!saving) load(); else schedulePoll(); }, POLL_MS);
    }
  }

  // ---------- שלד ----------
  function renderShell() {
    const root = document.getElementById('meet-root');
    root.innerHTML = `
      <section class="meet-card meet-head">
        <div class="meet-head-row">
          <div class="meet-head-tx">
            <h2>${ICON.users}<span>נוכחות במפגשי ההדרכה</span></h2>
            <div class="space-hint" style="margin:0;">מסמנים כאן מי השתתף. הרשימה כאן היא הקובעת. רישום עצמי של המורים הוא גיבוי, ונספר רק אחרי אישור.</div>
          </div>
          <label class="meet-pick">
            <span>המפגש</span>
            <select class="select" id="meet-select"></select>
          </label>
        </div>
        <div id="meet-adhoc" class="meet-adhoc" hidden>
          <label><span>תאריך המפגש</span><input type="date" class="input" id="meet-adhoc-date"></label>
          <label class="grow"><span>נושא (לא חובה)</span><input type="text" class="input" id="meet-adhoc-topic" maxlength="200"></label>
          <button type="button" class="btn btn-primary" id="meet-adhoc-go">לרישום הנוכחות</button>
          <button type="button" class="btn btn-secondary" id="meet-adhoc-cancel">ביטול</button>
        </div>
        <div class="meet-meta" id="meet-meta"></div>
        <details class="meet-howto" id="meet-howto">
          <summary>איך ממלאים נוכחות? שלושה צעדים</summary>
          <ol>
            <li><b>ביום המפגש</b> נכנסים מהכרטיס "המפגש הבא" בראש העמוד. המפגש של היום נבחר לבד, ורשימת המורים של הקבוצה נפתחת כאן.</li>
            <li><b>בתחילת המפגש (רשות)</b> לוחצים "פתיחת רישום עצמי", משתפים מסך עם הקוד ומדביקים בצ'אט של הזום את הקישור. המורים נרשמים בעצמם.</li>
            <li><b>בסוף המפגש</b> מסמנים ליד כל מורה "נכח/ה" או "לא נכח/ה", מאשרים את מי שנרשם בעצמו, ולוחצים <b>"שמירת הסימונים"</b>. אפשר גם לייבא את דוח המשתתפים מהזום.</li>
          </ol>
        </details>
      </section>
      <div id="meet-year"></div>
      <div id="meet-body"></div>`;

    document.getElementById('meet-select').addEventListener('change', onSelect);
    const dateIn = document.getElementById('meet-adhoc-date');
    dateIn.max = S.today;
    dateIn.value = S.today;
    document.getElementById('meet-adhoc-go').addEventListener('click', () => {
      const d = dateIn.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > S.today) { TS.toast('בוחרים תאריך של היום או מפגש שכבר התקיים'); return; }
      const topic = document.getElementById('meet-adhoc-topic').value.trim();
      const existing = allMeetings().find(m => isDayOf(m, d));
      if (existing) { selectMeeting(existing); }
      else {
        const m = { date: d, topic: topic, source: 'adhoc', label: labelOf(d), time: '' };
        adhocMeetings.push(m);
        selectMeeting(m);
      }
      document.getElementById('meet-adhoc').hidden = true;
    });
    document.getElementById('meet-adhoc-cancel').addEventListener('click', () => {
      document.getElementById('meet-adhoc').hidden = true;
      renderSelectOptions();
    });
  }

  function renderNoKey() {
    document.getElementById('meet-select').closest('.meet-pick').hidden = true;
    document.getElementById('meet-body').innerHTML = `
      <section class="meet-card meet-notice">
        <div class="meet-notice-ic">${ICON.key}</div>
        <div>
          <strong>רישום הנוכחות נפתח מהקישור האישי המעודכן</strong>
          <p>הקישור שדרכו נכנסת עדיין לא כולל את מפתח הנוכחות. צריך לבקש ממיטל פלג את הקישור המעודכן, ולהיכנס ממנו פעם אחת. אחרי זה המכשיר יזכור את המפתח.</p>
        </div>
      </section>`;
  }

  function renderSelectOptions() {
    const selEl = document.getElementById('meet-select');
    if (!selEl) return;
    const list = allMeetings();
    const counts = d => { const m = serverMeeting(d); return m ? m.counts : null; };
    selEl.innerHTML = list.map(m => {
      const c = counts(m.date);
      const tag = isDayOf(m, S.today) ? ' · היום'
        : m.date > S.today ? ' · עתידי'
        : (c && (c.present + c.absent) ? ' · סומנו ' + (c.present + c.absent) : '');
      const topic = m.topic ? ' — ' + (m.topic.length > 42 ? m.topic.slice(0, 42) + '…' : m.topic) : '';
      return `<option value="${esc(m.date)}"${sel && sel.date === m.date ? ' selected' : ''}>${esc(m.label + tag + topic)}</option>`;
    }).join('') + '<option value="__adhoc">+ מפגש שלא מופיע בתוכנית…</option>';
    if (!list.length) selEl.value = '__adhoc';
  }

  function onSelect(e) {
    const v = e.target.value;
    if (v === '__adhoc') {
      document.getElementById('meet-adhoc').hidden = false;
      document.getElementById('meet-adhoc-date').focus();
      return;
    }
    const m = allMeetings().find(x => x.date === v);
    if (m) selectMeeting(m);
  }

  function selectMeeting(m) {
    if (Object.keys(edits).length && !confirm('יש סימונים שלא נשמרו. לעבור מפגש בלי לשמור?')) {
      renderSelectOptions();
      return;
    }
    edits = {};
    zoom = null; zoomMeta = {};
    stopLive();
    sel = m;
    S.rows = []; S.loaded = false; S.failed = false;
    renderSelection();
    load();
  }

  function renderSelection() {
    renderSelectOptions();
    const meta = document.getElementById('meet-meta');
    if (!sel) {
      meta.innerHTML = '';
      document.getElementById('meet-adhoc').hidden = false;
      document.getElementById('meet-body').innerHTML = S.badKey
        ? `<section class="meet-card meet-notice warn"><div class="meet-notice-ic">${ICON.key}</div>
            <div><strong>המפתח שבקישור אינו תקין</strong><p>${esc(errText('bad_key'))}</p></div></section>`
        : `<section class="meet-card"><div class="empty" style="padding:24px;">
            תוכנית המפגשים השנתית עדיין לא הוזנה למערכת. בוחרים למעלה את תאריך המפגש כדי לרשום נוכחות.
          </div></section>`;
      return;
    }
    meta.innerHTML = `
      <span class="meet-date">${esc(sel.label)}</span>
      ${sel.time ? `<span class="meet-time">${esc(sel.time)}</span>` : ''}
      ${sel.topic ? `<span class="meet-topic">${esc(sel.topic)}</span>` : ''}`;
    renderBody();
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
    if (sel.date > S.today) {
      const n = daysUntil(sel.date);
      const howto = document.getElementById('meet-howto');
      if (howto) howto.open = true;
      body.innerHTML = `<section class="meet-card"><div class="empty" style="padding:26px; line-height:1.9;">
        <b>המפגש של ${esc(sel.label)} עוד לא התקיים</b> (${n === 1 ? 'מחר' : 'בעוד ' + n + ' ימים'}).<br>
        ביום המפגש נכנסים לכאן מהכרטיס "המפגש הבא" שבראש העמוד, ורשימת המורים של הקבוצה תופיע לסימון.<br>
        מפגש שכבר התקיים? בוחרים אותו ברשימה "המפגש" למעלה.</div></section>`;
      return;
    }
    if (typeof state === 'undefined' || !state.teachers || !state.teachers.length) {
      if (!S.loaded && !S.failed) {
        body.innerHTML = '<section class="meet-card"><div class="empty" style="padding:26px;">טוען…</div></section>';
        return;
      }
    }
    if (S.failed && !S.loaded) {
      body.innerHTML = `<section class="meet-card"><div class="empty" style="padding:22px; text-align:center;">
        הנוכחות לא נטענה — תקלה רגעית בשרת.<br>
        <button type="button" class="btn btn-secondary" id="meet-retry" style="margin-top:10px;">לנסות שוב</button></div></section>`;
      document.getElementById('meet-retry').addEventListener('click', () => { S.failed = false; renderBody(); load(); });
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
    const monthLbl = window.TS_meetMonthLabel ? window.TS_meetMonthLabel(monthOf(sel.date)) : '';
    const gaps = list.filter(g => g.self && g.guide === 'absent');
    const pending = list.filter(g => g.state === 'pending');
    const dirtyN = Object.keys(edits).length;
    const badge = document.getElementById('meet-count');
    if (badge) { badge.textContent = pending.length; badge.classList.toggle('zero', !pending.length); }

    // שמירה על המיקוד בשדה החיפוש בזמן ציור מחדש
    const minutesEl = document.getElementById('meet-minutes');
    if (minutesEl) openMinutes = minutesEl.value;
    const hadFocus = document.activeElement && document.activeElement.id === 'meet-search';
    const caret = hadFocus ? document.activeElement.selectionStart : 0;

    body.innerHTML = `
      ${isLiveDay() ? liveCardHtml() : ''}
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
      </section>`;

    bindBody(list);
    if (hadFocus) {
      const s = document.getElementById('meet-search');
      s.focus();
      try { s.setSelectionRange(caret, caret); } catch (e) {}
    }
    if (isLiveDay()) tick();
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

  // ---------- רישום עצמי חי ----------
  function liveCardHtml() {
    const sm = serverMeeting(sel.date);
    const open = sm && sm.open;
    if (!open) {
      return `
      <section class="meet-card meet-live closed">
        <div class="ml-tx">
          <h3>${ICON.screen}<span>רישום עצמי למשתתפים (גיבוי)</span></h3>
          <p>פותחים בתחילת המפגש. על המסך יוקרן קוד שמתחלף כל 5 דקות. המורים נרשמים איתו מהטלפון או מהמחשב. מי שלא נמצא במפגש לא יכול לראות את הקוד. אחרי שסוגרים את הרישום, או כשהזמן נגמר, אי אפשר יותר להירשם.</p>
        </div>
        <div class="ml-open">
          <label><span>פתוח למשך</span>
            <select class="select" id="meet-minutes">
              ${[['60', 'שעה'], ['90', 'שעה וחצי'], ['120', 'שעתיים']].map(([v, t]) =>
                `<option value="${v}"${v === openMinutes ? ' selected' : ''}>${t}</option>`).join('')}
            </select>
          </label>
          <button type="button" class="btn btn-primary" id="meet-open">פתיחת רישום עצמי</button>
        </div>
        <div class="ws-status" id="meet-live-status"></div>
      </section>`;
    }
    return `
      <section class="meet-card meet-live open">
        <div class="ml-code-wrap">
          <div class="ml-label">הקוד עכשיו</div>
          <div class="ml-code" id="meet-code" dir="ltr">····</div>
          <div class="ml-bar"><span id="meet-bar"></span></div>
          <div class="ml-count" id="meet-countdown"></div>
        </div>
        <div class="ml-tx">
          <h3><span class="live-dot"></span><span>הרישום העצמי פתוח עד ${esc(hhmm(sm.openUntil))}</span></h3>
          <p>משתפים מסך עם הקוד, ומדביקים בצ'אט של הזום את הקישור. הקוד מתחלף כל 5 דקות, וגם מי שהקליד רגע לפני ההחלפה נקלט.</p>
          <div class="ml-url" dir="ltr">${esc(mifgashUrl())}</div>
          <div class="gl-actions">
            <button type="button" class="gl-btn" id="meet-copy">${ICON.copy}<span>העתקת הודעה לצ'אט</span></button>
            <button type="button" class="gl-btn wa" id="meet-project">${ICON.screen}<span>הקרנה במסך מלא</span></button>
            <button type="button" class="gl-btn" id="meet-close">סגירת הרישום</button>
          </div>
          <div class="ws-status" id="meet-live-status"></div>
        </div>
      </section>`;
  }

  function bindLive() {
    const openBtn = document.getElementById('meet-open');
    if (openBtn) openBtn.addEventListener('click', async () => {
      openBtn.disabled = true; openBtn.textContent = 'פותח…';
      const body = {
        guide: SLUG, k: KEY, ge: GE, date: sel.date, sessionDates: sessionDates(), minutes: document.getElementById('meet-minutes').value,
        topic: sel.topic || '', source: sel.source || 'adhoc', guideName: GUIDE_CFG.name || ''
      };
      let res = await TS.apiPost('meet.open', body);
      // תשובה שהתקלקלה בדרך — פתיחה חוזרת בטוחה (רק מעדכנת את שעת הסגירה)
      for (let i = 0; i < 2 && res && res.error === 'bad_response'; i++) {
        await new Promise(r => setTimeout(r, 1500));
        res = await TS.apiPost('meet.open', body);
      }
      if (res && res.ok) { applyCodes(res.data); await load(); }
      else {
        await load();   // אולי נפתח למרות שהתשובה נפלה
        const sm = serverMeeting(sel.date);
        if (!(sm && sm.open)) {
          const st = document.getElementById('meet-live-status');
          if (st) st.innerHTML = '<span class="bad">' + esc(errText(res && res.error)) + '</span>';
        }
      }
    });
    const closeBtn = document.getElementById('meet-close');
    if (closeBtn) closeBtn.addEventListener('click', async () => {
      if (!confirm('לסגור את הרישום העצמי? אחרי הסגירה המורים לא יוכלו להירשם.')) return;
      closeBtn.disabled = true;
      const res = await TS.apiPost('meet.close', { guide: SLUG, k: KEY, ge: GE, date: sel.date });
      if (!(res && res.ok)) TS.toast(errText(res && res.error));
      stopLive();
      await load();
    });
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
  }

  async function fetchCode() {
    if (codeFetching) return;
    codeFetching = true;
    clearTimeout(codeTimer);
    const res = await TS.api('meet.code', { guide: SLUG, k: KEY, ge: GE, date: sel.date, sessionDates: sessionDates() }, { cache: 'no' });
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
      QRCode.toCanvas(url, { width: 220, margin: 1, color: { dark: '#17324D', light: '#FFFFFF' } }, (err, canvas) => {
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
