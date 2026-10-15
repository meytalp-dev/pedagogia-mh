/* ============================================================
   "היום שלי" — hayom.html (15.10.26, מיטל)
   -----------------------------------------------------------
   1. הדרכות היום ו-7 הימים הבאים — מ-TS_PLANS (+ plan-changes) דרך TS_meetingSlots,
      והמצב מהשרת (meet.report): רישום פתוח / כמה נרשמו.
   2. הדרכות שעברו בלי נוכחות — מפגש מהתוכנית ב-45 הימים האחרונים שכל המועדים שלו
      עברו (לפחות אתמול) ואין לו אף שורת נוכחות. מפגש כזה לא נספר לאף מורה.
   3. קיצורים קבועים. מפתחות של מערכות אחרות — localStorage בלבד (הרפו ציבורי).
   4. "הקישורים שלי" — רשימה אישית בדפדפן (מצגות, דפים מלווים).
   המבט של מדריכה: guide/?g=<slug>&k=<meet.guideKeys>&by=admin (כמו admin-guides).
   ============================================================ */
(function () {
  'use strict';
  const KEYS_LS = 'hayom.keys.v1';
  const MINE_LS = 'hayom.mine.v1';
  const GAP_DAYS = 45;
  const WEEK_DAYS = 7;
  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  const isoOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const addDays = (iso, n) => { const p = iso.split('-').map(Number); return isoOf(new Date(p[0], p[1] - 1, p[2] + n)); };
  const dayLabel = iso => { const p = iso.split('-').map(Number); const d = new Date(p[0], p[1] - 1, p[2]); return 'יום ' + DAYS[d.getDay()] + ' · ' + p[2] + '.' + p[1]; };
  const dm = iso => +iso.slice(8, 10) + '.' + +iso.slice(5, 7);
  const TODAY = isoOf(new Date());

  const guides = () => window.TS_GUIDES || {};
  const guideName = slug => (guides()[slug] && guides()[slug].name) || slug;
  const guideSubject = (slug, m) => (m && m.subject) || ((guides()[slug] || {}).subjects || [])[0] || (guides()[slug] || {}).subject || '';

  let MEET_KEYS = {};
  let KEYS_STATE = 'unknown';
  let REPORT = null;

  /* קישור למבט המדריכה. רבקה (views) — המבט של מקצוע המפגש. */
  function guideUrl(slug, subject) {
    const g = guides()[slug] || {};
    let s = '';
    if (g.views && subject) Object.keys(g.views).forEach(k => { if (g.views[k] === subject) s = k; });
    return 'guide/?g=' + encodeURIComponent(slug) + (s ? '&s=' + s : '') +
      (MEET_KEYS[slug] ? '&k=' + encodeURIComponent(MEET_KEYS[slug]) : '') + '&by=admin';
  }

  /* כל המועדים מהתוכנית: [{slug, m, date, start, part}] */
  function allSlots() {
    const plans = window.TS_PLANS || {};
    const out = [];
    Object.keys(plans).forEach(slug => {
      (plans[slug].meetings || []).forEach(m => {
        const slots = window.TS_meetingSlots ? window.TS_meetingSlots(m) : [];
        if (slots.length) slots.forEach(s => out.push({ slug, m, date: s.date, start: s.start, part: s.part || '' }));
        else (m.dates || [m.date, m.date2]).filter(Boolean).forEach(d => out.push({ slug, m, date: d, start: '', part: '' }));
      });
    });
    return out;
  }

  /* מפגש בשרת לפי slug + date של המפגש (מזהה mt_<slug>_<yyyymmdd>) */
  function serverMeeting(slug, m) {
    if (!REPORT) return null;
    const id = 'mt_' + slug + '_' + String(m.date).replace(/-/g, '');
    return (REPORT.meetings || []).find(x => x.id === id) || null;
  }
  function rowsCount(slug, m) {
    if (!REPORT) return null;
    const id = 'mt_' + slug + '_' + String(m.date).replace(/-/g, '');
    return (REPORT.rows || []).filter(r => r.meetingId === id).length;
  }

  function statusChip(slug, m, slotDate) {
    if (!REPORT) return '';
    const sm = serverMeeting(slug, m);
    const n = rowsCount(slug, m);
    if (sm && sm.open) return '<span class="hy-chip open">הרישום פתוח · ' + n + ' נרשמו</span>';
    if (n) return '<span class="hy-chip ok">' + n + ' נרשמו</span>';
    if (slotDate < TODAY) return '<span class="hy-chip err">אין נוכחות</span>';
    return '';
  }

  function renderWeek() {
    const end = addDays(TODAY, WEEK_DAYS);
    const slots = allSlots().filter(s => s.date >= TODAY && s.date <= end)
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    if (!slots.length) { $('hy-week').innerHTML = '<div class="hy-empty">אין הדרכות בתוכנית בשבוע הקרוב.</div>'; return; }
    /* היום ומחר פתוחים; שאר השבוע מקופל — שהעמוד לא יהיה ארוך בנייד */
    const tomorrow = addDays(TODAY, 1);
    const block = list => {
      let html = '', day = '';
      list.forEach(s => {
        if (s.date !== day) {
          if (day) html += '</div>';
          day = s.date;
          html += '<div class="hy-day">' + (s.date === TODAY ? 'היום · ' : s.date === tomorrow ? 'מחר · ' : '') +
            esc(dayLabel(s.date)) + '</div><div class="hy-list">';
        }
        const subj = guideSubject(s.slug, s.m);
        html += '<div class="hy-row">' +
          '<span class="hy-time">' + esc(s.start || '—') + '</span>' +
          '<div class="hy-main"><b>' + esc(guideName(s.slug)) + ' · ' + esc(subj) + (s.part ? ' · ' + esc(s.part) : '') + '</b>' +
          '<small>' + esc(s.m.topic || '') + '</small></div>' +
          // מועד עתידי של מפגש שכבר התחיל (מוריה: 3 ימים) — הספירה שייכת למועד הקודם, לא מציגים
          (s.date <= TODAY ? statusChip(s.slug, s.m, s.date) : '') +
          '<a class="hy-btn primary" href="' + esc(guideUrl(s.slug, s.m.subject)) + '" target="_blank" rel="noopener">המבט של המדריכה</a>' +
          '</div>';
      });
      return html + (day ? '</div>' : '');
    };
    const near = slots.filter(s => s.date <= tomorrow), rest = slots.filter(s => s.date > tomorrow);
    $('hy-week').innerHTML = (near.length ? block(near) : '<div class="hy-empty">אין הדרכות היום ומחר.</div>') +
      (rest.length ? '<details class="hy-more" style="margin-top:12px"><summary>שאר השבוע · ' + rest.length + ' מועדים</summary>' +
        block(rest) + '</details>' : '');
  }

  function renderGaps() {
    if (!REPORT) {
      $('hy-gaps').innerHTML = '<div class="hy-empty">' + (KEYS_STATE === 'denied'
        ? 'צריך להתחבר כאדמין כדי לראות נוכחות.' : 'נתוני הנוכחות לא נטענו. לרענן בעוד רגע.') + '</div>';
      return;
    }
    const from = addDays(TODAY, -GAP_DAYS);
    const byMeeting = {};
    allSlots().forEach(s => {
      const k = s.slug + '|' + s.m.date;
      const cur = byMeeting[k] || (byMeeting[k] = { slug: s.slug, m: s.m, last: '' });
      if (s.date > cur.last) cur.last = s.date;
    });
    const gaps = Object.keys(byMeeting).map(k => byMeeting[k])
      .filter(x => x.last < TODAY && x.last >= from && !rowsCount(x.slug, x.m))
      .sort((a, b) => b.last.localeCompare(a.last));
    if (!gaps.length) { $('hy-gaps').innerHTML = '<div class="hy-empty">אין. לכל ההדרכות שעברו יש נוכחות.</div>'; return; }
    $('hy-gaps').innerHTML = '<div class="hy-list">' + gaps.map(x =>
      '<div class="hy-row alert">' +
      '<span class="hy-time">' + esc(dm(x.m.date)) + '</span>' +
      '<div class="hy-main"><b>' + esc(guideName(x.slug)) + ' · ' + esc(guideSubject(x.slug, x.m)) + '</b>' +
      '<small>' + esc(x.m.topic || '') + '</small></div>' +
      '<a class="hy-btn" href="' + esc(guideUrl(x.slug, x.m.subject)) + '" target="_blank" rel="noopener">לסימון נוכחות</a>' +
      '</div>').join('') + '</div>';
  }

  /* ---------- קיצורים ---------- */
  function links() {
    const k = lsGet(KEYS_LS, {});
    const T = 'https://tfasim.pedagogiamh.co.il/';
    const P = 'https://pedagogiamh.co.il/';
    return [
      { t: 'דוח משתתפי זום', d: 'Reports → Usage: מי נכח בכל פגישה', u: 'https://zoom.us/account/my/report' },
      { t: 'אדווה — שולחן המנחה', d: 'מפגשים, מצגות, דף מלווה, נוכחות ומשוב', u: k.adva ? T + 'shagririm/index.html?k=' + encodeURIComponent(k.adva) : '' },
      { t: 'אדווה — המבט של אלנט', d: 'הקישור לשני ולדוד', u: k.advaView ? T + 'shagririm/index.html?k=' + encodeURIComponent(k.advaView) : '' },
      { t: 'מיפוי צוות — מבט על', d: 'מי ענה בכל בית ספר', u: k.mipui ? T + 'shagririm/mipui/index.html?k=' + encodeURIComponent(k.mipui) : '' },
      { t: 'אישור תוכניות הגמר', d: 'דשבורד: מי סיים ומי לא', u: k.tochniyot ? P + 'ishur-tochniyot-dash.html#k=' + encodeURIComponent(k.tochniyot) : '' },
      { t: 'דשבורד אלנט', d: 'השתלמויות בית ספריות — מה שני רואה', u: k.elnet ? P + 'dashboard-elnet.html?k=' + encodeURIComponent(k.elnet) : '' },
      { t: 'כתובות מייל שחזרו', d: 'הגיליון של הממסר', u: k.bounces || '' },
      { t: 'מדריכות ומפקחים', d: 'קישורים אישיים, הודעות, מי פתח', u: 'admin-guides.html' },
      { t: 'ניקוי כפילויות ושמות', d: 'מורים כפולים ותיקוני שם', u: 'admin-cleanup.html' },
      { t: 'דוח נוכחות ארצי', d: 'לפי מדריך, בית ספר, רשת', u: 'ministry/nochechut.html' },
      { t: 'תובה', d: 'הבית של המפקחים', u: T + 'revital/' },
      { t: 'צוהר', d: 'מרחב המנהלים', u: P + 'tzohar/' },
      { t: 'נטע', d: 'מרחב הרכזים הפדגוגיים', u: P + 'neta/' },
      { t: 'מרכז הניהול של מנור', d: 'כל דפי האדמין', u: 'admin.html' }
    ];
  }
  function renderLinks() {
    $('hy-links').innerHTML = links().map(l => l.u
      ? '<a class="hy-tile" href="' + esc(l.u) + '" target="_blank" rel="noopener"><b>' + esc(l.t) + '</b><small>' + esc(l.d) + '</small></a>'
      : '<a class="hy-tile locked" href="#hy-keys-box" data-openkeys="1"><b>' + esc(l.t) + '</b><small>' + esc(l.d) + '</small></a>').join('');
  }

  /* ---------- הקישורים שלי ---------- */
  function renderMine() {
    const list = lsGet(MINE_LS, []);
    $('hy-mine').innerHTML = list.length ? list.map((x, i) =>
      '<div class="hy-row hy-mine-row"><a href="' + esc(x.u) + '" target="_blank" rel="noopener"><b>' + esc(x.t) + '</b></a>' +
      '<button class="hy-btn" type="button" data-del="' + i + '" aria-label="הסרת ' + esc(x.t) + '">הסרה</button></div>').join('')
      : '<div class="hy-empty">עוד אין. מוסיפים למטה.</div>';
  }

  /* ---------- כל המדריכות ---------- */
  function renderGuides() {
    const g = guides();
    const list = Object.keys(g).filter(s => !g[s].hidden).sort((a, b) => String(g[a].name).localeCompare(String(g[b].name), 'he'));
    $('hy-guides').innerHTML = list.map(s =>
      '<a class="hy-tile" href="' + esc(guideUrl(s)) + '" target="_blank" rel="noopener"><b>' + esc(g[s].name) + '</b>' +
      '<small>' + esc((g[s].subjects || [g[s].subject]).filter(Boolean).join(' · ')) + '</small></a>').join('');
  }

  function renderKeyWarn() {
    const box = $('hy-keywarn');
    if (KEYS_STATE === 'ok') { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = KEYS_STATE === 'denied'
      ? '<span>צריך להתחבר כאדמין, אחרת המבטים של המדריכות נפתחים נעולים.</span> <a class="hy-btn" href="./?next=hayom.html">כניסה</a>'
      : '<span>השרת של מנור לא ענה. הקישורים למדריכות נבנו בלי מפתח — לרענן בעוד רגע.</span>';
  }

  function renderAll() { renderKeyWarn(); renderWeek(); renderGaps(); renderLinks(); renderMine(); renderGuides(); }

  async function load() {
    const slugs = Object.keys(guides()).join(',');
    const [k, r] = await Promise.all([
      TS.api('meet.guideKeys', { slugs: slugs }, { cache: 'no' }),
      TS.api('meet.report', { guides: slugs }, { cache: 'no' })
    ]);
    if (k && k.ok && k.data) { MEET_KEYS = k.data; KEYS_STATE = 'ok'; }
    else KEYS_STATE = /unauthenticated|forbidden/.test((k && k.error) || '') ? 'denied' : 'error';
    if (r && r.ok && r.data) REPORT = r.data;
    renderAll();
  }

  function init() {
    const p = TODAY.split('-').map(Number);
    $('hy-date').textContent = dayLabel(TODAY) + '.' + p[0];
    renderAll();

    // מפתחות
    const form = $('hy-keys');
    const saved = lsGet(KEYS_LS, {});
    Array.from(form.elements).forEach(el => { if (el.name && saved[el.name]) el.value = saved[el.name]; });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const o = {};
      Array.from(form.elements).forEach(el => { if (el.name) o[el.name] = String(el.value || '').trim(); });
      if (lsSet(KEYS_LS, o)) { $('hy-keys-ok').hidden = false; setTimeout(() => { $('hy-keys-ok').hidden = true; }, 2500); }
      renderLinks();
    });
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-openkeys]');
      if (a) { $('hy-keys-box').open = true; }
      const d = e.target.closest('[data-del]');
      if (d) {
        const list = lsGet(MINE_LS, []);
        list.splice(+d.getAttribute('data-del'), 1);
        lsSet(MINE_LS, list);
        renderMine();
      }
    });
    // הקישורים שלי
    $('hy-add').addEventListener('submit', e => {
      e.preventDefault();
      const t = $('hy-add-name').value.trim(), u = $('hy-add-url').value.trim();
      if (!t || !/^https?:\/\//.test(u)) return;
      const list = lsGet(MINE_LS, []);
      list.push({ t: t, u: u });
      lsSet(MINE_LS, list);
      $('hy-add-name').value = ''; $('hy-add-url').value = '';
      renderMine();
    });
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
