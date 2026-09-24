/* ============================================================
   בדיקת מפגש הדרכה — לקישור שבמייל התזכורת (16.9.26)
   ?g=<slug>&d=<תאריך המפגש ISO>. מראה אם המדריכ/ה פתח/ה רישום,
   אם סימנ/ה נוכחות, ומי מהקבוצה נוכח / ממתין / לא נכח / עוד לא סומן.
   מתרענן כל דקה. נתונים: meet.report + teachers.list (כמו הדוח הארצי).
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const L = d => window.TS_meetDateLabel(d);
  const hm = ms => new Date(ms).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  const GUIDES = window.TS_GUIDES || {};
  let slug = TS.urlParam('g');
  let date = TS.urlParam('d');
  let teachers = null;
  let timer = null;

  function todayIso() {
    const t = new Date();
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }
  function planMeeting() {
    const plan = window.TS_planFor(slug);
    return plan ? plan.meetings.find(m => m.date === date) || null : null;
  }

  document.addEventListener('DOMContentLoaded', () => {
    // מדריכים עם תוכנית — לבחירת מפגש אחר בלי לחזור למייל
    const withPlan = Object.keys(window.TS_PLANS || {}).filter(k => GUIDES[k]);
    withPlan.sort((a, b) => GUIDES[a].name.localeCompare(GUIDES[b].name, 'he'));
    withPlan.forEach(k => {
      const o = document.createElement('option');
      o.value = k; o.textContent = GUIDES[k].name + ' · ' + window.TS_guideSubjects(GUIDES[k]).join(' + ');
      $('ms-guide').appendChild(o);
    });
    if (!slug || !GUIDES[slug]) slug = withPlan[0] || '';
    if (!date || !planMeeting()) {
      const next = window.TS_nextMeeting(window.TS_planFor(slug));
      const plan = window.TS_planFor(slug);
      date = next ? next.date : (plan && plan.meetings.length ? plan.meetings[plan.meetings.length - 1].date : todayIso());
    }
    $('ms-guide').value = slug;
    fillMeetings();
    $('ms-guide').addEventListener('change', () => {
      slug = $('ms-guide').value;
      const next = window.TS_nextMeeting(window.TS_planFor(slug));
      date = next ? next.date : window.TS_planFor(slug).meetings[0].date;
      fillMeetings(); go();
    });
    $('ms-meeting').addEventListener('change', () => { date = $('ms-meeting').value; go(); });
    $('ms-refresh').addEventListener('click', () => load());
    go();
  });

  function fillMeetings() {
    const plan = window.TS_planFor(slug);
    $('ms-meeting').innerHTML = (plan ? plan.meetings : []).map(m =>
      `<option value="${esc(m.date)}"${m.date === date ? ' selected' : ''}>${esc(m.label)}${m.subject ? ' · ' + esc(m.subject) : ''}</option>`).join('');
  }

  function go() {
    history.replaceState(null, '', '?g=' + encodeURIComponent(slug) + '&d=' + date);
    $('ms-body').innerHTML = '<div class="mv-empty">טוען…</div>';
    load();
  }

  async function load() {
    clearTimeout(timer);
    const want = slug + '|' + date;
    const [rep, tl] = await Promise.all([
      TS.api('meet.report', { guides: slug }, { cache: 'no' }),
      teachers ? Promise.resolve({ ok: true, data: teachers }) : TS.api('teachers.list', {})
    ]);
    if (want !== slug + '|' + date) return;   // בינתיים נבחר מפגש אחר
    if (!rep || !rep.ok) {
      $('ms-body').innerHTML = '<div class="mv-empty">הנתונים לא נטענו — ' + esc((rep && rep.error) || 'אין תשובה מהשרת') + '. מנסה שוב בעוד דקה.</div>';
    } else {
      if (tl && tl.ok) teachers = tl.data || [];
      render(rep.data);
    }
    $('ms-updated').textContent = 'עודכן ב-' + hm(Date.now());
    timer = setTimeout(load, 60000);
  }

  function render(data) {
    const g = Object.assign({ slug: slug }, GUIDES[slug]);
    const pm = planMeeting();
    const subject = (pm && pm.subject) || window.TS_guideSubjects(g).join(' + ');
    const insp = ((window.TS_INSPECTORS || {})[g.inspector] || {}).name || '';
    $('ms-title').textContent = g.name + ' · ' + subject;
    $('ms-sub').textContent = [pm ? 'מפגש ' + pm.label : L(date), insp ? 'מפקח/ת: ' + insp : ''].filter(Boolean).join(' · ');

    // מ-24.9.26 כל יום מפגש נרשם בנפרד (mt_<slug>_<יום>) — מאחדים את כל ימי המפגש של החודש
    const days = [date].concat(pm ? window.TS_meetingSlots(pm).map(s => s.date) : []);
    const ids = days.filter((d, i) => d && days.indexOf(d) === i).map(d => 'mt_' + slug + '_' + d.replace(/-/g, ''));
    const ms = (data.meetings || []).filter(x => ids.indexOf(x.id) >= 0);
    const m = ms.find(x => x.open) || ms.slice().sort((a, b) => String(b.openedAt || '').localeCompare(String(a.openedAt || '')))[0];
    const rows = (data.rows || []).filter(r => ids.indexOf(r.meetingId) >= 0);
    const c = { present: 0, absent: 0, pending: 0, gaps: 0 };
    ms.forEach(x => Object.keys(c).forEach(k => { c[k] += Number((x.counts || {})[k] || 0); }));
    const slots = pm ? window.TS_meetingSlots(pm) : [];
    const now = Date.now();
    const started = slots.some(s => new Date(s.date + 'T' + s.start + ':00').getTime() <= now);
    const lastEnd = slots.length ? new Date(slots[slots.length - 1].date + 'T23:59:00').getTime() : 0;

    // שלוש שאלות: נפתח רישום? סומנה נוכחות? ומה המספרים
    let openTxt, openCls;
    if (m && m.open) { openTxt = 'פתוח עכשיו — עד ' + hm(m.openUntil); openCls = 'ok'; }
    else if (m && m.openedAt) { openTxt = 'נפתח ב-' + L(m.openedAt.slice(0, 10)) + ' ' + hm(Date.parse(m.openedAt)) + ' ונסגר'; openCls = 'ok'; }
    else if (!started) { openTxt = 'המפגש עוד לא התחיל'; openCls = 'wait'; }
    else { openTxt = 'לא נפתח'; openCls = 'bad'; }
    const marked = c.present + c.absent;
    let markTxt, markCls;
    if (marked) { markTxt = 'כן — ' + (marked === 1 ? 'סימון אחד' : marked + ' סימונים'); markCls = 'ok'; }
    else if (!started) { markTxt = 'המפגש עוד לא התחיל'; markCls = 'wait'; }
    else if (now > lastEnd) { markTxt = 'לא — המפגש עבר בלי רישום'; markCls = 'bad'; }
    else { markTxt = 'עוד לא'; markCls = 'warn'; }

    // הקבוצה: מורי המדריכ/ה (ובמפגש של מקצוע אחד — רק מורי המקצוע), אדם אחד לשם+בית ספר
    const people = [];
    if (teachers) {
      const byKey = {};
      teachers.forEach(t => {
        if (!window.TS_guideHasTeacher(g, t)) return;
        if (pm && pm.subject && t.subject !== pm.subject) return;
        const k = norm(t.name) + '|' + norm(t.schoolName);
        if (!byKey[k]) people.push(byKey[k] = { name: t.name, school: t.schoolName || '', ids: [] });
        byKey[k].ids.push(String(t.id));
      });
    }
    const rowByTid = {};
    rows.forEach(r => { if (r.teacherId) rowByTid[r.teacherId] = r; });
    const used = new Set();
    const groups = { present: [], pending: [], absent: [], none: [] };
    people.forEach(p => {
      const tid = p.ids.find(i => rowByTid[i]);
      const r = tid ? rowByTid[tid] : null;
      if (r) used.add(r);
      const st = r && groups[r.status] ? r.status : 'none';
      groups[st].push({ name: p.name, school: p.school, r: r });
    });
    rows.forEach(r => {   // נרשמו/סומנו ואינם ברשימת הקבוצה
      if (used.has(r) || !groups[r.status]) return;
      groups[r.status].push({ name: r.teacherName, school: r.schoolName, r: r, outside: true });
    });

    const list = (key, title, cls, hint) => {
      const arr = groups[key].slice().sort((a, b) => a.school.localeCompare(b.school, 'he') || a.name.localeCompare(b.name, 'he'));
      if (!arr.length) return '';
      return `<details class="ms-grp ${cls}"${key !== 'none' || arr.length < 40 ? ' open' : ''}>
        <summary>${esc(title)} <b>${arr.length}</b>${hint ? `<span>${esc(hint)}</span>` : ''}</summary>
        <div class="mv-people">${arr.map(x => `<div><b>${esc(x.name)}</b><span>${esc(x.school)}${x.outside ? ' · לא ברשימת הקבוצה' : ''}${x.r && x.r.self && key !== 'pending' ? ' · נרשם/ה בעצמו/ה' : ''}${x.r && x.r.markedVia === 'zoom' ? ' · מדוח הזום' : ''}</span></div>`).join('')}</div>
      </details>`;
    };

    $('ms-body').innerHTML = `
      <section class="ms-meet">
        <div class="ms-when">${slots.map(s => `<span><b>${esc(L(s.date).replace(/\.\d\d$/, ''))}</b> ${esc(s.start)}${s.part ? ' · ' + esc(s.part) : ''}</span>`).join('') || esc(L(date))}</div>
        ${pm && pm.topic ? `<div class="ms-topic">${esc(pm.topic)}</div>` : ''}
      </section>
      <section class="ms-status">
        <div class="ms-q ${openCls}"><span>רישום עצמי של המורים</span><b>${esc(openTxt)}</b></div>
        <div class="ms-q ${markCls}"><span>המדריך/ה סימן/ה נוכחות</span><b>${esc(markTxt)}</b></div>
      </section>
      <section class="nk-kpis">
        <div class="nk-kpi"><div class="l">נוכחים</div><div class="v">${c.present}</div></div>
        <div class="nk-kpi ${c.pending ? 'amber' : ''}"><div class="l">נרשמו בעצמם, ממתינים לאישור</div><div class="v">${c.pending}</div></div>
        <div class="nk-kpi"><div class="l">לא נכחו</div><div class="v">${c.absent}</div></div>
        <div class="nk-kpi ${c.gaps ? 'red' : ''}"><div class="l">פערים</div><div class="v">${c.gaps}</div><div class="s">נרשם/ה בעצמו/ה וסומן/ה "לא נכח"</div></div>
        <div class="nk-kpi"><div class="l">בקבוצה</div><div class="v">${teachers ? people.length : '—'}</div><div class="s">${pm && pm.subject ? 'מורי ' + esc(pm.subject) : 'מורי המדריך/ה'}</div></div>
      </section>
      ${list('present', 'נוכחים', 'ok')}
      ${list('pending', 'נרשמו בעצמם — ממתינים לאישור המדריך/ה', 'warn', 'לא נספרים עד שהמדריך/ה מאשר/ת')}
      ${list('absent', 'סומנו "לא נכח/ה"', 'bad')}
      ${list('none', 'עוד לא סומנו', 'dim', started ? '' : 'המפגש עוד לא התחיל')}
      ${!rows.length && !people.length ? '<div class="mv-empty">אין עדיין נתונים למפגש הזה.</div>' : ''}`;
    $('ms-guide-link').hidden = false;
  }

  // הדשבורד של המדריכ/ה עם המפתח — by=admin כדי שהכניסה של מיטל לא תיספר כ"המדריכ/ה פתח/ה את הקישור"
  document.addEventListener('click', async e => {
    const a = e.target.closest('#ms-guide-link');
    if (!a) return;
    e.preventDefault();
    const w = window.open('about:blank', '_blank');
    const res = await TS.api('meet.guideKeys', { slugs: slug }, { cache: 'no' });
    const k = res && res.ok && res.data ? res.data[slug] : '';
    const url = '../guide/?g=' + encodeURIComponent(slug) + (k ? '&k=' + encodeURIComponent(k) : '') + '&by=admin';
    if (w) w.location = url; else location.href = url;
  });
})();
