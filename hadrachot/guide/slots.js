/* ============================================================
   שעות פרטניות — שיבוץ המורים (20.10.26, בקשת מיטל — אזרחות, סיגל נחום)
   מחליף את לוח הגוגל דוקס השבועי: המדריכ/ה מפרסמ/ת מועדים פנויים,
   והמורים בקבוצה משתבצים מהבית שלהם במנור (teacher/slots.js).
   מועד תפוס ננעל. על כל שיבוץ וביטול נשלח מייל למדריכ/ה ולמורה (בשרת).
   שרת: slots.guide · slots.add · slots.remove — אימות GUIDE_AUTH (meetings.js).
   מדריכ/ה נוסף/ת = slug ב-SLOT_GUIDES כאן, ב-teacher/slots.js וב-code.gs.
   ============================================================ */
(function () {
  const SLOT_GUIDES = ['sigal'];
  const SLUG = (typeof GUIDE_CFG !== 'undefined' && GUIDE_CFG.slug) || '';
  const sec = document.getElementById('sec-slots');
  if (!sec) return;
  if (SLOT_GUIDES.indexOf(SLUG) < 0) { sec.remove(); return; }
  sec.hidden = false;

  const TRACKS = { bagrut: 'בגרות חיצונית', gemer: 'גמר' };
  const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const TEACHER_URL = 'https://pedagogiamh.co.il/hadrachot/teacher/#slot-sec';
  const root = document.getElementById('slots-root');
  let data = null;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const auth = () => (typeof window.GUIDE_AUTH === 'function' ? window.GUIDE_AUTH() : { guide: SLUG });
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const parse = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const dayLbl = s => { const d = parse(s); return 'יום ' + DAYS[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1); };
  const shortLbl = s => { const d = parse(s); return DAYS[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1); };
  // ברירת המחדל ל"פתוח לשיבוץ עד": יום חמישי שלפני השבוע של המועד (כמו בלוח של סיגל)
  const thursdayBefore = s => { const d = parse(s); const back = (d.getDay() + 7 - 4) % 7 || 7; d.setDate(d.getDate() - back); return ymd(d); };
  const today = () => (data && data.today) || ymd(new Date());
  const weekOf = s => addDays(s, -parse(s).getDay());   // יום ראשון של השבוע
  const ERR = {
    bad_key: 'אין הרשאה — צריך להיכנס מהקישור האישי שלך למנור.',
    bad_items: 'לא הוזנו מועדים תקינים. בוחרים תאריך וכותבים שעות, למשל 10:30, 11:30.',
    past: 'אי אפשר למחוק שעה שכבר התקיימה — היא נשמרת כתיעוד.',
    not_found: 'המועד כבר לא קיים — רעננו את הדף.',
    busy: 'השרת עמוס כרגע — נסו שוב בעוד רגע.'
  };
  const errText = r => ERR[r && r.error] || 'לא נשמר — נסו שוב.';

  async function load() {
    const res = await TS.api('slots.guide', auth(), { cache: 'no' });
    if (!res || !res.ok) {
      root.innerHTML = '<div class="empty" style="padding:18px;">' + esc(errText(res)) +
        ' <button type="button" class="mh-edit" id="sl-retry">לנסות שוב</button></div>';
      const b = document.getElementById('sl-retry');
      if (b) b.addEventListener('click', load);
      return;
    }
    data = res.data;
    render();
    if (!load.jumped && location.hash === '#sec-slots') {
      load.jumped = true;
      setTimeout(() => sec.scrollIntoView({ block: 'start' }), 60);
    }
  }

  function render() {
    const slots = data.slots || [];
    const t = today();
    const upcoming = slots.filter(s => s.date >= t);
    const past = slots.filter(s => s.date < t);
    const booked = upcoming.filter(s => s.status === 'booked').length;
    const chip = document.getElementById('slots-count');
    if (chip) {
      chip.hidden = !upcoming.length;
      chip.textContent = booked + ' מתוך ' + upcoming.length + ' שובצו';
    }
    const byDate = list => {
      const g = {};
      list.forEach(s => { (g[s.date] = g[s.date] || []).push(s); });
      return Object.keys(g).sort().map(d => ({ date: d, slots: g[d] }));
    };
    const row = s => {
      const isBooked = s.status === 'booked';
      const phone = String(s.phone || '').replace(/^'+/, '');
      return `<div class="sl-row${isBooked ? ' booked' : ''}">
        <span class="sl-time">${esc(s.start)}</span>
        <span class="sl-who">${isBooked
          ? `<b>${esc(s.teacherName)}</b>${s.schoolName ? ' · ' + esc(s.schoolName) : ''}
             ${phone ? ` · <a href="tel:${esc(phone)}" dir="ltr">${esc(phone)}</a>` : ''}
             ${s.track ? ` · <span class="track-chip ${esc(s.track)}">${esc(TRACKS[s.track] || s.track)}</span>` : ''}
             ${s.note ? `<div class="sl-note">${esc(s.note)}</div>` : ''}`
          : '<span class="sl-free">פנוי</span>'}</span>
        ${s.date >= t ? `<button type="button" class="mh-edit" data-sl-del="${esc(s.id)}" data-booked="${isBooked ? 1 : 0}">${isBooked ? 'ביטול השיבוץ' : 'מחיקה'}</button>` : ''}
      </div>`;
    };
    const day = g => {
      const until = g.slots.map(s => s.until).filter(Boolean).sort()[0];
      return `<div class="sl-day"><div class="sl-day-h"><b>${esc(dayLbl(g.date))}</b>${until && g.date >= t
        ? `<span class="sl-until">${until >= t ? 'פתוח לשיבוץ עד ' + esc(shortLbl(until)) : 'השיבוץ נסגר'}</span>` : ''}</div>
        ${g.slots.map(row).join('')}</div>`;
    };
    const lastWeek = slots.length ? weekOf(slots[slots.length - 1].date) : '';
    root.innerHTML = `
      <div class="sl-add">
        <div class="sl-add-row">
          <label>תאריך<input type="date" class="input" id="sl-date" min="${esc(t)}"></label>
          <label class="sl-grow">שעות (מפרידים בפסיק)<input class="input" id="sl-times" dir="ltr" placeholder="10:30, 11:30, 14:30"></label>
          <label>פתוח לשיבוץ עד<input type="date" class="input" id="sl-until"></label>
        </div>
        <div class="btn-row" style="margin:8px 0 0;">
          <button type="button" class="btn btn-primary" id="sl-add">הוספת המועדים</button>
          ${lastWeek ? `<button type="button" class="btn btn-secondary" id="sl-copy">העתקת מועדי השבוע של ${esc(shortLbl(lastWeek))} לשבוע שאחריו</button>` : ''}
        </div>
        <div class="ws-status" id="sl-status"></div>
      </div>
      ${upcoming.length ? byDate(upcoming).map(day).join('')
        : '<div class="empty" style="padding:18px;">עדיין אין מועדים קרובים. מוסיפים תאריך ושעות — והם יופיעו למורים בבית שלהם במנור.</div>'}
      ${past.length ? `<details class="sl-past"><summary>מועדים שעברו (${past.length})</summary>${byDate(past).reverse().map(day).join('')}</details>` : ''}
      <div class="sl-share">
        <b>הקישור למורים</b> — במקום הלוח בגוגל דוקס. כל מורה נכנס/ת לבית שלו/ה במנור ומשתבצ/ת שם:
        <div class="gl-row"><span class="gl-url" dir="ltr">${esc(TEACHER_URL)}</span>
          <button type="button" class="gl-btn" id="sl-share-copy"><span>העתקת הודעה למורים</span></button></div>
      </div>`;

    const dateIn = document.getElementById('sl-date');
    const untilIn = document.getElementById('sl-until');
    dateIn.addEventListener('change', () => {
      if (dateIn.value && !untilIn.dataset.touched) {
        const th = thursdayBefore(dateIn.value);
        untilIn.value = th >= t ? th : t;
      }
    });
    untilIn.addEventListener('input', () => { untilIn.dataset.touched = '1'; });
    document.getElementById('sl-add').addEventListener('click', addFromForm);
    const copyBtn = document.getElementById('sl-copy');
    if (copyBtn) copyBtn.addEventListener('click', () => copyWeek(lastWeek));
    document.getElementById('sl-share-copy').addEventListener('click', shareCopy);
    root.querySelectorAll('[data-sl-del]').forEach(b => b.addEventListener('click', () => remove(b)));
  }

  function status(text, ok) {
    const el = document.getElementById('sl-status');
    if (el) { el.textContent = text; el.style.color = ok === false ? 'var(--err, #B4483C)' : ''; }
  }

  function parseTimes(v) {
    return String(v || '').split(/[,\s،;]+/).map(x => {
      const m = /^(\d{1,2})(?:[:.](\d{2}))?$/.exec(x.trim());
      if (!m || +m[1] > 23 || +(m[2] || 0) > 59) return '';
      return m[1].padStart(2, '0') + ':' + (m[2] || '00');
    });
  }

  async function send(items, until, btn) {
    if (btn) btn.disabled = true;
    status('שומר…');
    const res = await TS.apiPost('slots.add', Object.assign({}, auth(), { items: JSON.stringify(items), until: until || '' }));
    if (btn) btn.disabled = false;
    if (!res || !res.ok) { status(errText(res), false); return false; }
    const n = (res.data.added || []).length, skip = (res.data.skipped || []).length;
    TS.toast(n ? (n === 1 ? 'נוסף מועד אחד' : 'נוספו ' + n + ' מועדים') : 'לא נוסף מועד');
    await load();
    status(skip ? skip + ' מועדים דולגו — כבר קיימים או שהשעה עברה.' : '', skip ? false : true);
    return true;
  }

  function addFromForm() {
    const date = document.getElementById('sl-date').value;
    const raw = document.getElementById('sl-times').value;
    const until = document.getElementById('sl-until').value;
    const times = parseTimes(raw);
    if (!date) { status('בוחרים תאריך.', false); return; }
    if (!raw.trim() || times.some(x => !x)) { status('כותבים שעות בפורמט 10:30, מופרדות בפסיק.', false); return; }
    if (until && until > date) { status('"פתוח לשיבוץ עד" צריך להיות לפני המועד או באותו יום.', false); return; }
    send([...new Set(times)].map(start => ({ date, start })), until, document.getElementById('sl-add'));
  }

  // אותן שעות בדיוק, שבוע אחרי — "מדי שבוע יוצא לו״ז דומה"
  function copyWeek(week) {
    const src = (data.slots || []).filter(s => weekOf(s.date) === week);
    if (!src.length) return;
    const items = src.map(s => ({ date: addDays(s.date, 7), start: s.start }));
    const first = items.map(x => x.date).sort()[0];
    const until = thursdayBefore(first) >= today() ? thursdayBefore(first) : today();
    const list = items.map(x => shortLbl(x.date) + ' ' + x.start).join('\n');
    if (!confirm('להוסיף את המועדים האלה?\n\n' + list + '\n\nפתוח לשיבוץ עד ' + shortLbl(until) + '. השיבוצים עצמם לא מועתקים — כל המועדים יהיו פנויים.')) return;
    send(items, until, document.getElementById('sl-copy'));
  }

  async function remove(btn) {
    const s = (data.slots || []).find(x => x.id === btn.dataset.slDel);
    if (!s) return;
    const msg = btn.dataset.booked === '1'
      ? 'לבטל את השיבוץ של ' + s.teacherName + ' ב' + dayLbl(s.date) + ' בשעה ' + s.start + '?\n\nהמועד יימחק, ו' + s.teacherName + ' יקבל/תקבל מייל שהמועד בוטל.'
      : 'למחוק את המועד ' + dayLbl(s.date) + ' בשעה ' + s.start + '?';
    if (!confirm(msg)) return;
    btn.disabled = true;
    const res = await TS.apiPost('slots.remove', Object.assign({}, auth(), { id: s.id }));
    if (!res || !res.ok) { btn.disabled = false; TS.toast(errText(res)); return; }
    TS.toast(btn.dataset.booked === '1' ? 'השיבוץ בוטל ונשלח מייל למורה' : 'המועד נמחק');
    load();
  }

  async function shareCopy() {
    const first = (GUIDE_CFG && GUIDE_CFG.name) || '';
    const text = 'מורים יקרים,\n' +
      'השיבוץ לשעות הפרטניות עובר למנור.\n' +
      'נכנסים לבית שלכם במנור, ובמקטע "שיבוץ לשעה פרטנית" בוחרים מועד פנוי. אישור יגיע אליכם במייל.\n' +
      'מועד שנתפס ננעל, כך שאף שיבוץ לא יימחק בטעות.\n\n' + TEACHER_URL + '\n\nברכה והצלחה' + (first ? '\n' + first : '');
    try { await navigator.clipboard.writeText(text); TS.toast('ההודעה הועתקה — אפשר להדביק במייל או בקבוצה'); }
    catch (e) { prompt('העתיקו את ההודעה:', text); }
  }

  load();
})();
