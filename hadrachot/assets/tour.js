/* סיור בדף — מנגנון משותף לכל המבטים של מנור (24.9.26).
   הכללה של teacher/tour.js (שנשאר כפי שהוא במבט המורה).
   שימוש:
     MenorTour.setup({
       key: 'ts.tour.guide',            // נשמר ב-localStorage: 'done' אחרי סיום/דילוג
       name: 'מבט המדריכ/ה',            // לחלון הפתיחה
       intro: 'טקסט קצר לחלון הפתיחה',
       auto: true,                      // חלון פתיחה בכניסה הראשונה (ברירת מחדל: כן)
       steps: [{ sel: '.page-header', title: '...', text: '...' }, ...]
     });
   ?tour=1 פותח את חלון הפתיחה תמיד. כל [data-tour-start] מתחיל את הסיור ישירות.
   תחנה שהמקטע שלה לא מוצג (ריק/מוסתר) — מדלגים עליה. */
(function () {
  let cfg = null, i = 0, steps = [], box, hole;
  const visible = el => el && !el.hidden && el.offsetParent !== null && el.getBoundingClientRect().height > 0;
  const q = s => { try { return document.querySelector(s); } catch (e) { return null; } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const setDone = () => { try { localStorage.setItem(cfg.key, 'done'); } catch (e) { /* לא חוסם */ } };
  const shown = () => (cfg ? cfg.steps : []).filter(s => visible(q(s.sel)));

  function build() {
    hole = document.createElement('div');
    hole.className = 'tour-hole';
    box = document.createElement('div');
    box.className = 'tour-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-live', 'polite');
    document.body.append(hole, box);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { passive: true });
  }
  function onKey(e) {
    if (!box) return;
    if (e.key === 'Escape') end();
    if (e.key === 'ArrowLeft') go(1);
    if (e.key === 'ArrowRight') go(-1);
  }
  function place() {
    if (!box || !steps[i]) return;
    const el = q(steps[i].sel);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 8;
    // מקטע גבוה מהמסך — מדגישים רק את החלק הנראה, כדי שהחלון לא ייצא מהמסך
    const top = Math.max(r.top, 4), bottom = Math.min(r.bottom, window.innerHeight - 4);
    Object.assign(hole.style, { top: (top - pad) + 'px', left: (r.left - pad) + 'px',
      width: (r.width + pad * 2) + 'px', height: Math.max(0, bottom - top + pad * 2) + 'px' });
    const bw = Math.min(360, window.innerWidth - 24);
    box.style.width = bw + 'px';
    const bh = box.offsetHeight;
    let bt;
    if (bottom + 14 + bh < window.innerHeight) bt = bottom + 14;
    else if (top - 14 - bh > 0) bt = top - 14 - bh;
    else bt = Math.max(12, window.innerHeight - bh - 12);
    let left = r.left + r.width - bw;                 // RTL: מיושר לקצה הימני של המקטע
    left = Math.max(12, Math.min(left, window.innerWidth - bw - 12));
    box.style.top = bt + 'px';
    box.style.left = left + 'px';
  }
  function show() {
    const s = steps[i];
    const el = q(s.sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: el.getBoundingClientRect().height > window.innerHeight * 0.6 ? 'start' : 'center' });
    box.innerHTML =
      `<div class="tour-count">${i + 1} מתוך ${steps.length}</div>
       <h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>
       <div class="tour-actions">
         <button type="button" class="tour-next">${i === steps.length - 1 ? 'סיום' : 'הבא'}</button>
         ${i ? '<button type="button" class="tour-prev">הקודם</button>' : ''}
         <button type="button" class="tour-skip">דילוג על הסיור</button>
       </div>`;
    box.querySelector('.tour-next').onclick = () => go(1);
    const prev = box.querySelector('.tour-prev'); if (prev) prev.onclick = () => go(-1);
    box.querySelector('.tour-skip').onclick = end;
    setTimeout(place, 400); place();
    box.querySelector('.tour-next').focus({ preventScroll: true });
  }
  function go(d) {
    const n = i + d;
    if (n >= steps.length) return end();
    if (n < 0) return;
    i = n; show();
  }
  function end() {
    setDone();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place);
    if (box) box.remove(); if (hole) hole.remove();
    box = hole = null;
  }
  function start() {
    if (!cfg || box) return;
    const ti = document.querySelector('.tour-intro'); if (ti) ti.remove();
    steps = shown();
    if (!steps.length) return;
    i = 0; build(); show();
  }
  function intro() {
    if (!cfg || box || document.querySelector('.tour-intro')) return;
    if (document.querySelector('.modal-overlay.open')) return;   // לא קופצים מעל חלון פתוח
    const n = shown().length;
    if (n < 2) return;                                           // הדף עוד לא נטען / מצב שגיאה
    const root = (document.querySelector('link[rel="icon"]') || {}).href || '';
    const sail = root.replace(/menor-mark\.svg.*$/, 'menor-sail.png');
    const wrap = document.createElement('div');
    wrap.className = 'tour-intro';
    wrap.innerHTML =
      `<div class="ti-card" role="dialog" aria-modal="true" aria-labelledby="ti-h">
         ${sail ? `<img src="${esc(sail)}" alt="" aria-hidden="true">` : ''}
         <h2 id="ti-h">ברוכים הבאים ל${esc(cfg.name || 'מנור')}</h2>
         <p>${esc(cfg.intro || '')} רוצה סיור קצר בדף? ${n} תחנות, פחות מדקה.</p>
         <div class="ti-actions">
           <button type="button" class="ti-go">יאללה, לסיור</button>
           <button type="button" class="ti-skip">דילוג על הסיור</button>
         </div>
         <div class="ti-note">אפשר לחזור לסיור בכל רגע מהכפתור "סיור בדף".</div>
       </div>`;
    document.body.appendChild(wrap);
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onEsc); };
    const skip = () => { close(); setDone(); };
    const onEsc = e => { if (e.key === 'Escape') skip(); };
    wrap.querySelector('.ti-go').onclick = () => { close(); start(); };
    wrap.querySelector('.ti-skip').onclick = skip;
    wrap.addEventListener('click', e => { if (e.target === wrap) skip(); });
    document.addEventListener('keydown', onEsc);
    window.scrollTo({ top: 0 });
    wrap.querySelector('.ti-go').focus({ preventScroll: true });
  }
  /* כניסה ראשונה: מחכים שהנתונים ייטענו (המקטעים נפתחים רק כשיש בהם תוכן),
     ומנסים כמה פעמים עד שיש לפחות שתי תחנות גלויות. */
  function maybeStart() {
    if (!cfg) return;
    let flag = '';
    try { flag = localStorage.getItem(cfg.key) || ''; } catch (e) { flag = 'done'; }
    const forced = new URLSearchParams(location.search).get('tour') === '1';
    if (!forced && (flag === 'done' || cfg.auto === false)) return;
    let tries = 0;
    const tick = () => {
      if (document.querySelector('.tour-intro') || box) return;
      if (shown().length >= 2 && !document.querySelector('.modal-overlay.open')) return intro();
      if (++tries < 8) setTimeout(tick, 1000);
    };
    setTimeout(tick, cfg.delay || 1800);
  }
  function setup(c) {
    cfg = c;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', maybeStart);
    else maybeStart();
  }
  window.MenorTour = { setup: setup, start: start, intro: intro };
  document.addEventListener('click', e => {
    if (!cfg) return;
    if (e.target.closest && e.target.closest('[data-tour-start]')) { e.preventDefault(); start(); }
  });
})();
