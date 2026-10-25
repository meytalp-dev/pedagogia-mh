/* ============================================================
   שעות פרטניות — שיבוץ המורים (20.10.26, בקשת מיטל — אזרחות, סיגל נחום)
   מחליף את לוח הגוגל דוקס השבועי: המדריכ/ה מפרסמ/ת מועדים פנויים,
   והמורים בקבוצה משתבצים מהבית שלהם במנור (teacher/slots.js).
   מועד תפוס ננעל. על כל שיבוץ וביטול נשלח מייל למדריכ/ה ולמורה (בשרת).
   שרת: slots.guide · slots.add · slots.remove — אימות GUIDE_AUTH (meetings.js).
   מדריכ/ה נוסף/ת = slug ב-SLOT_GUIDES כאן, ב-teacher/slots.js וב-code.gs.
   ============================================================ */
(function () {
  const SLOT_GUIDES = ['sigal', 'yitzhak'];   // יצחק שמש — 22.10.26
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
    not_mine: 'אחד המורים שנבחרו כבר לא בקבוצה שלך — רעננו את הדף.',
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
      const n = (s.teacherIds || []).length;
      if (isBooked && s.group) {
        return `<div class="sl-row booked">
        <span class="sl-time">${esc(s.start)}</span>
        <span class="sl-who"><span class="track-chip">שעה משותפת · ${n} מורים</span>
          <div><b>${esc(s.teacherName)}</b></div>
          ${s.schoolName ? `<div class="sl-note">${esc(s.schoolName)}</div>` : ''}
          ${s.note ? `<div class="sl-note">נושא: ${esc(s.note)}</div>` : ''}</span>
        ${s.date >= t ? `<button type="button" class="mh-edit" data-sl-del="${esc(s.id)}" data-booked="1">ביטול המועד</button>` : ''}
      </div>`;
      }
      return `<div class="sl-row${isBooked ? ' booked' : ''}">
        <span class="sl-time">${esc(s.start)}</span>
        <span class="sl-who">${isBooked
          ? `<b>${esc(s.teacherName)}</b>${s.schoolName ? ' · ' + esc(s.schoolName) : ''}
             ${phone ? ` · <a href="tel:${esc(phone)}" dir="ltr">${esc(phone)}</a>` : ''}
             ${s.track ? ` · <span class="track-chip ${esc(s.track)}">${esc(TRACKS[s.track] || s.track)}</span>` : ''}
             ${s.note ? `<div class="sl-note">${esc(s.note)}</div>` : ''}`
          : '<span class="sl-free">פנוי</span>'}</span>
        ${!isBooked && s.date >= t ? `<button type="button" class="mh-edit" data-sl-grp="${esc(s.id)}">שיבוץ מורים</button>` : ''}
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
          <button type="button" class="btn btn-secondary" id="sl-grp-open">שיבוץ בית ספר או כמה מורים יחד</button>
        </div>
        <div class="ws-status" id="sl-status"></div>
        <div id="sl-grp" class="sl-grp" hidden></div>
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
    document.getElementById('sl-grp-open').addEventListener('click', () => openGroup(null));
    root.querySelectorAll('[data-sl-grp]').forEach(b => b.addEventListener('click', () =>
      openGroup((data.slots || []).find(x => x.id === b.dataset.slGrp))));
  }

  /* ---------- שעה משותפת (25.10.26, מיטל) ----------
     המדריכ/ה משבצ/ת בית ספר שלם או כמה מורים למועד אחד. כל מורה מקבל/ת מייל,
     ורואה את השעה בבית שלו/ה במנור. מועד פנוי שכבר פורסם — מתמלא; אחרת נוצר מועד חדש. */
  function roster() {
    const list = (typeof myTeachers === 'function') ? myTeachers() : [];
    const seen = {};
    return list.filter(x => x && x.id && !seen[x.id] && (seen[x.id] = 1));
  }

  function openGroup(slot) {
    const box = document.getElementById('sl-grp');
    const people = roster();
    if (!people.length) { status('רשימת המורים עוד נטענת — נסו שוב בעוד רגע.', false); return; }
    const bySchool = {};
    people.forEach(p => {
      const s = String(p.schoolName || '').replace(/\s+/g, ' ').trim() || 'בלי בית ספר';
      (bySchool[s] = bySchool[s] || []).push(p);
    });
    const schools = Object.keys(bySchool).sort((a, b) => a.localeCompare(b, 'he'));
    schools.forEach(s => bySchool[s].sort((a, b) => String(a.name).localeCompare(String(b.name), 'he')));
    box.hidden = false;
    box.innerHTML = `
      <div class="sl-grp-h">שיבוץ בית ספר או כמה מורים לשעה אחת</div>
      <div class="sl-add-row">
        <label>תאריך<input type="date" class="input" id="sg-date" min="${esc(today())}" value="${esc(slot ? slot.date : '')}"></label>
        <label>שעה<input class="input" id="sg-time" dir="ltr" placeholder="10:30" value="${esc(slot ? slot.start : '')}" style="max-width:110px;"></label>
        <label class="sl-grow">נושא (לא חובה — מופיע במייל)<input class="input" id="sg-note" maxlength="300"></label>
      </div>
      <div class="sl-grp-list">${schools.map((s, i) => `
        <details class="sl-grp-sch"${schools.length <= 3 ? ' open' : ''}>
          <summary><b>${esc(s)}</b> <span class="sl-note">· ${bySchool[s].length} מורים</span> <span class="sl-note" data-sg-n="${i}"></span></summary>
          <label class="gm-check sl-grp-all"><input type="checkbox" data-sg-school="${i}"> <span>כל המורים מבית הספר</span></label>
          ${bySchool[s].map(p => `<label class="gm-check"><input type="checkbox" data-sg-t="${esc(p.id)}" data-sg-si="${i}">
            <span>${esc(p.name)}${p.subject ? ' <span class="sl-note">· ' + esc(p.subject) + '</span>' : ''}</span></label>`).join('')}
        </details>`).join('')}</div>
      <div class="btn-row" style="margin:8px 0 0;">
        <button type="button" class="btn btn-primary" id="sg-save">שיבוץ ושליחת מייל למורים</button>
        <button type="button" class="btn btn-secondary" id="sg-close">סגירה</button>
      </div>
      <div class="ws-status" id="sg-status"></div>`;
    // כמה סומנו בכל בית ספר — גלוי גם כשבית הספר מקופל
    const count = () => {
      const n = box.querySelectorAll('input[data-sg-t]:checked').length;
      document.getElementById('sg-status').textContent = n ? 'נבחרו ' + n + ' מורים' : '';
      box.querySelectorAll('[data-sg-n]').forEach(el => {
        const k = box.querySelectorAll('input[data-sg-si="' + el.dataset.sgN + '"]:checked').length;
        el.textContent = k ? '· סומנו ' + k : '';
      });
    };
    box.querySelectorAll('input[data-sg-school]').forEach(c => c.addEventListener('change', () => {
      box.querySelectorAll('input[data-sg-si="' + c.dataset.sgSchool + '"]').forEach(x => { x.checked = c.checked; });
      count();
    }));
    box.querySelectorAll('input[data-sg-t]').forEach(c => c.addEventListener('change', () => {
      const si = c.dataset.sgSi;
      const all = box.querySelectorAll('input[data-sg-si="' + si + '"]');
      const on = box.querySelectorAll('input[data-sg-si="' + si + '"]:checked');
      const head = box.querySelector('input[data-sg-school="' + si + '"]');
      head.checked = on.length === all.length;
      head.indeterminate = on.length > 0 && on.length < all.length;
      count();
    }));
    document.getElementById('sg-close').addEventListener('click', () => { box.hidden = true; box.innerHTML = ''; });
    document.getElementById('sg-save').addEventListener('click', () => saveGroup(people));
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  async function saveGroup(people) {
    const box = document.getElementById('sl-grp');
    const st = document.getElementById('sg-status');
    const say = (txt, ok) => { st.textContent = txt; st.style.color = ok === false ? 'var(--err, #B4483C)' : ''; };
    const date = document.getElementById('sg-date').value;
    const time = parseTimes(document.getElementById('sg-time').value);
    const ids = [...box.querySelectorAll('input[data-sg-t]:checked')].map(c => c.dataset.sgT);
    if (!date) { say('בוחרים תאריך.', false); return; }
    if (time.length !== 1 || !time[0]) { say('כותבים שעה אחת, למשל 10:30.', false); return; }
    if (!ids.length) { say('מסמנים בית ספר או מורים.', false); return; }
    const ex = (data.slots || []).find(s => s.date === date && s.start === time[0]);
    if (ex && ex.status === 'booked') { say('במועד הזה כבר יש שיבוץ. בוחרים שעה אחרת או מבטלים את הקיים.', false); return; }
    const names = ids.map(id => (people.find(p => String(p.id) === id) || {}).name).filter(Boolean);
    if (!confirm('לשבץ ' + ids.length + ' מורים ל' + dayLbl(date) + ' בשעה ' + time[0] + '?\n\n' +
      names.slice(0, 12).join(', ') + (names.length > 12 ? ' ועוד ' + (names.length - 12) : '') +
      '\n\nכל אחד/ת יקבל/תקבל מייל עם המועד.')) return;
    const btn = document.getElementById('sg-save');
    btn.disabled = true;
    say('שומר ושולח מיילים…');
    const res = await TS.apiPost('slots.add', Object.assign({}, auth(), {
      items: JSON.stringify([{ date: date, start: time[0] }]), until: date,
      teacherIds: JSON.stringify(ids), note: document.getElementById('sg-note').value.trim()
    }));
    btn.disabled = false;
    if (!res || !res.ok) {
      // POST שהתשובה שלו נפלה — בודקים בטעינה אם השיבוץ נחת לפני שמבקשים שוב
      await load();
      const landed = (data.slots || []).find(s => s.date === date && s.start === time[0] && s.status === 'booked');
      if (landed) TS.toast('השיבוץ נשמר');
      else TS.toast(errText(res));
      return;
    }
    if (!(res.data.added || []).length) { say('לא שובץ — המועד תפוס או שהשעה עברה.', false); return; }
    TS.toast('שובצו ' + ids.length + ' מורים ונשלחו מיילים');
    await load();
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
    const msg = s.group
      ? 'לבטל את השעה המשותפת ב' + dayLbl(s.date) + ' בשעה ' + s.start + '?\n\nהמועד יימחק, וכל ' + (s.teacherIds || []).length + ' המורים שבו יקבלו מייל שהמועד בוטל.'
      : btn.dataset.booked === '1'
      ? 'לבטל את השיבוץ של ' + s.teacherName + ' ב' + dayLbl(s.date) + ' בשעה ' + s.start + '?\n\nהמועד יימחק, ו' + s.teacherName + ' יקבל/תקבל מייל שהמועד בוטל.'
      : 'למחוק את המועד ' + dayLbl(s.date) + ' בשעה ' + s.start + '?';
    if (!confirm(msg)) return;
    btn.disabled = true;
    const res = await TS.apiPost('slots.remove', Object.assign({}, auth(), { id: s.id }));
    if (!res || !res.ok) { btn.disabled = false; TS.toast(errText(res)); return; }
    TS.toast(s.group ? 'המועד בוטל ונשלחו מיילים למורים' : btn.dataset.booked === '1' ? 'השיבוץ בוטל ונשלח מייל למורה' : 'המועד נמחק');
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
