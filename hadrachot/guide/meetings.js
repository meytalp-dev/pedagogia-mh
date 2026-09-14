/* ============================================================
   נוכחות במפגשים — הצד של המדריכ/ה (14.9.26)
   -----------------------------------------------------------
   המפגשים בזום. המדריכ/ה מסמנ/ת נוכחות מתוך רשימת הקבוצה — זו הרשימה
   הקובעת. גיבוי: בזמן המפגש פותחים "רישום עצמי", מקרינים קוד בן 4 ספרות
   שמתחלף כל דקה, והמורים נרשמים בעמוד mifgash/?g=<slug>. רישום עצמי מופיע
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

  const PLAN = window.TS_planFor ? window.TS_planFor(SLUG) : null;

  const S = { today: localToday(), meetings: [], rows: [], loaded: false, failed: false, badKey: false };
  let sel = null;           // { date, topic, source, label, time }
  let edits = {};           // entryKey → 'present' | 'absent' | 'clear'
  let live = null;          // { codes, offset, openUntil }
  let filter = 'all';
  let search = '';
  let saving = false;
  let pollTimer = null, tickTimer = null, codeTimer = null;
  let adhocMeetings = [];
  let openMinutes = '90';
  let codeFetching = false;
  let lastCodeFetch = 0;

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
    if (!KEY) { renderNoKey(); return; }
    pickDefault();
    renderSelection();
    // ביום המפגש הלשונית נפתחת לבד — זה מה שהמדריכ/ה צריכ/ה באותו יום
    if (sel && sel.date === S.today && btn) btn.click();
    load();
    window.addEventListener('beforeunload', e => {
      if (Object.keys(edits).length) { e.preventDefault(); e.returnValue = ''; }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && sel && sel.date === S.today) load();
    });
  });

  // dashboard.js קורא לזה אחרי שרשימת המורים נטענה
  window.MEET_onRoster = function () { if (KEY && sel) renderBody(); };

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
      timeout: 'אין תשובה מהשרת (תקשורת איטית).'
    };
    return map[err] || ('תקלה: ' + (err || 'אין תשובה מהשרת'));
  }

  // ---------- בחירת מפגש ----------
  function planMeetings() {
    return (PLAN && PLAN.meetings ? PLAN.meetings : []).map(m => ({
      date: m.date, topic: m.topic || '', source: 'plan', label: m.label || labelOf(m.date), time: m.time || ''
    }));
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
    sel = list.find(m => m.date === S.today)
      || list.filter(m => m.date < S.today).pop()
      || list[0]
      || null;
  }
  function serverMeeting(date) { return S.meetings.find(m => m.date === date) || null; }

  // ---------- טעינה ----------
  async function load() {
    if (!sel) {
      // בלי תוכנית (שירה): אולי כבר נרשמו מפגשים שלא בתוכנית — מושכים את הרשימה
      const r0 = await TS.api('meet.state', { guide: SLUG, k: KEY }, { cache: 'no' });
      if (r0 && r0.ok && r0.data) { S.meetings = r0.data.meetings || []; }
      else if (r0 && r0.error === 'bad_key') { S.badKey = true; renderSelection(); renderBody(); return; }
      pickDefault();
      renderSelection();
      if (!sel) return;
    }
    const date = sel.date;
    const res = await TS.api('meet.state', { guide: SLUG, k: KEY, date: date }, { cache: 'no' });
    if (!sel || sel.date !== date) return;   // בינתיים נבחר מפגש אחר
    if (res && res.ok && res.data) {
      S.meetings = res.data.meetings || [];
      S.rows = res.data.rows || [];
      S.loaded = true; S.failed = false; S.badKey = false;
      const sm = serverMeeting(date);
      if (sm && sm.open && date === S.today) { if (!live) fetchCode(); }
      else if (live) stopLive();
    } else if (res && res.error === 'bad_key') {
      S.badKey = true;
    } else {
      S.failed = true;
    }
    renderSelectOptions();
    renderBody();
    schedulePoll();
  }
  function schedulePoll() {
    clearTimeout(pollTimer);
    if (sel && sel.date === S.today && !S.badKey) {
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
      </section>
      <div id="meet-body"></div>`;

    document.getElementById('meet-select').addEventListener('change', onSelect);
    const dateIn = document.getElementById('meet-adhoc-date');
    dateIn.max = S.today;
    dateIn.value = S.today;
    document.getElementById('meet-adhoc-go').addEventListener('click', () => {
      const d = dateIn.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > S.today) { TS.toast('בוחרים תאריך של היום או מפגש שכבר התקיים'); return; }
      const topic = document.getElementById('meet-adhoc-topic').value.trim();
      const existing = allMeetings().find(m => m.date === d);
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
      const tag = m.date === S.today ? ' · היום'
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
  function entries() {
    const teachers = (typeof myTeachers === 'function') ? myTeachers() : [];
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
    const orig = g.row ? (g.row.guideStatus || '') : '';
    if (status === orig) delete edits[g.key];
    else edits[g.key] = status || 'clear';
    renderBody();
  }

  // ---------- גוף הלשונית ----------
  function renderBody() {
    const body = document.getElementById('meet-body');
    if (!body || !sel || !KEY) return;
    if (S.badKey) {
      body.innerHTML = `<section class="meet-card meet-notice warn"><div class="meet-notice-ic">${ICON.key}</div>
        <div><strong>המפתח שבקישור אינו תקין</strong><p>${esc(errText('bad_key'))}</p></div></section>`;
      return;
    }
    if (sel.date > S.today) {
      body.innerHTML = `<section class="meet-card"><div class="empty" style="padding:26px;">
        המפגש עוד לא התקיים. ביום המפגש יופיעו כאן רשימת הקבוצה והרישום העצמי.</div></section>`;
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
      ${sel.date === S.today ? liveCardHtml() : ''}
      <section class="meet-card">
        <div class="meet-sum">
          <button type="button" class="meet-stat present${filter === 'present' ? ' on' : ''}" data-filter="present"><b>${c.present}</b><span>נכחו</span></button>
          <button type="button" class="meet-stat absent${filter === 'absent' ? ' on' : ''}" data-filter="absent"><b>${c.absent}</b><span>לא נכחו</span></button>
          <button type="button" class="meet-stat pending${filter === 'pending' ? ' on' : ''}" data-filter="pending"><b>${c.pending}</b><span>ממתינים לאישור</span></button>
          <button type="button" class="meet-stat none${filter === 'none' ? ' on' : ''}" data-filter="none"><b>${c.none}</b><span>לא סומנו</span></button>
        </div>
        ${S.failed ? '<div class="meet-warn">הרענון האחרון נכשל — מוצג המצב האחרון שנטען.</div>' : ''}
        ${gaps.length ? `<div class="meet-warn">${ICON.alert}<span><b>${gaps.length}</b> נרשמו בעצמם אבל סומנו "לא נכח/ה". כדאי לבדוק מול דוח המשתתפים של הזום.</span></div>` : ''}
        <div class="meet-save-bar">
          <button type="button" class="btn btn-primary" id="meet-save"${dirtyN && !saving ? '' : ' disabled'}>
            ${saving ? 'שומר…' : dirtyN ? 'שמירת ' + dirtyN + ' סימונים' : 'הכל שמור'}
          </button>
          <button type="button" class="btn btn-secondary" id="meet-rest-absent"${c.none ? '' : ' disabled'}>כל מי שלא סומן — לא נכח/ה</button>
          <span class="meet-save-note" id="meet-save-note">${dirtyN ? 'יש סימונים שלא נשמרו' : ''}</span>
        </div>
      </section>

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
    if (sel.date === S.today) tick();
  }

  function listHtml(list) {
    const q = norm(search);
    const shown = list.filter(g =>
      (filter === 'all' || g.state === filter) &&
      (!q || norm(g.name).includes(q) || norm(g.schoolName).includes(q)));
    if (!list.length) return '<div class="empty" style="padding:22px;">רשימת המורים של הקבוצה עדיין נטענת…</div>';
    if (!shown.length) return '<div class="empty" style="padding:22px;">אין מורים שמתאימים לחיפוש</div>';
    return shown.map(g => rowHtml(g, false)).join('');
  }

  function rowHtml(g, pendingBox) {
    const badges = [];
    if (g.self) badges.push(`<span class="mb self">נרשם/ה בעצמו/ה${g.selfAt ? ' ' + esc(whenLabel(g.selfAt)) : ''}</span>`);
    if (g.self && g.guide === 'absent') badges.push('<span class="mb gap">פער</span>');
    if (!g.listed) badges.push('<span class="mb unlisted">לא ברשימת הקבוצה</span>');
    if (g.dirty) badges.push('<span class="mb dirty">לא נשמר</span>');
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
        ? { teacherId: g.teacherId, teacherName: g.name, schoolName: g.schoolName, status: want[k] }
        : { rowId: g.rowId, status: want[k] };
    }).filter(Boolean);
    if (!records.length) { edits = {}; renderBody(); return; }

    saving = true;
    renderBody();
    const res = await TS.apiPost('meet.mark', {
      guide: SLUG, k: KEY, date: sel.date, topic: sel.topic || '', source: sel.source || 'adhoc',
      guideName: GUIDE_CFG.name || '', records: JSON.stringify(records)
    });
    saving = false;

    if (res && res.ok) {
      // מה שסומן בזמן השמירה נשאר לשמירה הבאה
      Object.keys(want).forEach(k => { if (edits[k] === want[k]) delete edits[k]; });
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
          <p>פותחים בתחילת המפגש. על המסך יוקרן קוד שמתחלף כל דקה, והמורים נרשמים איתו מהטלפון או מהמחשב. מי שלא נמצא במפגש לא יכול לראות את הקוד. אחרי שסוגרים את הרישום, או כשהזמן נגמר, אי אפשר יותר להירשם.</p>
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
          <p>משתפים מסך עם הקוד, ומדביקים בצ'אט של הזום את הקישור. הקוד מתחלף כל דקה.</p>
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
      const res = await TS.apiPost('meet.open', {
        guide: SLUG, k: KEY, date: sel.date, minutes: document.getElementById('meet-minutes').value,
        topic: sel.topic || '', source: sel.source || 'adhoc', guideName: GUIDE_CFG.name || ''
      });
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
      const res = await TS.apiPost('meet.close', { guide: SLUG, k: KEY, date: sel.date });
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
    const res = await TS.api('meet.code', { guide: SLUG, k: KEY, date: sel.date }, { cache: 'no' });
    codeFetching = false;
    if (res && res.ok && res.data) { applyCodes(res.data); return; }
    if (res && res.error === 'closed') { stopLive(); load(); return; }
    codeTimer = setTimeout(fetchCode, 8000);   // תקלה רגעית — ניסיון חוזר קרוב
  }
  function applyCodes(d) {
    if (!d || !d.codes) return;
    live = { codes: d.codes, offset: (d.serverNow || Date.now()) - Date.now(), openUntil: d.openUntil, stepSec: d.stepSec || 60 };
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
      if (cnt) cnt.textContent = cur ? 'מתחלף בעוד ' + left + ' שנ׳' : 'טוען קוד…';
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
