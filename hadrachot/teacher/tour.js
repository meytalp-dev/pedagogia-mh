/* סיור קצר במבט המורה (24.9.26, בקשת מיטל) — שלב 3 של ההרשמה.
   מתחיל לבד פעם אחת אחרי ההרשמה (ts.teacher.tour = 'pending'), ואפשר לחזור אליו
   בכל רגע מהכפתור "סיור בדף". ?tour=1 מפעיל אותו תמיד (גם בהדמיה).
   כל תחנה מדגישה מקטע אמיתי בדף; מקטע שלא מוצג (ריק) מדלגים עליו. */
(function () {
  const KEY = 'ts.teacher.tour';
  const STEPS = [
    { sel: '.page-header', title: 'ברוכים הבאים למבט המורה',
      text: 'זה הבית שלך במנור: ההדרכות שלך השנה, רישום הנוכחות, והחומרים מהמדריכ/ה — במקום אחד.' },
    { sel: '#teacher-nav', title: 'כפתורי ניווט',
      text: 'קפיצה מהירה לכל חלק בדף. הכפתור של החלק שמולך נצבע בירוק.' },
    { sel: '#next-sec', title: 'ההדרכה הבאה',
      text: 'התאריכים והשעות של ההדרכה הבאה, לפי המסלול שלך. ליד כל מועד — רישום הנוכחות.' },
    { sel: '#th-card', title: 'רישום נוכחות ביום ההדרכה',
      text: 'במפגש המדריכ/ה מציג/ה קוד בן 4 ספרות. מקלידים אותו כאן, והנוכחות נרשמת ומחכה לאישור.' },
    { sel: '#plan-sec', title: 'התוכנית השנתית שלי',
      text: 'כל מפגשי השנה לפי המסלול שלך. מסמנים את המועדים שמתאימים לך ולוחצים "הוספה ליומן" — או "ליומן גוגל" ליד מועד בודד.' },
    { sel: '#notes-sec', title: 'המחברת שלי',
      text: 'מקום אישי לכתוב בו תוך כדי ההדרכה ולצרף קבצים לעצמך. רק את/ה רואה אותה, ואפשר לפתוח אותה מכל מכשיר.' },
    { sel: '#journey-sec', title: 'המסע שלי השנה',
      text: 'כל חודש: האם השתתפת, נושא ההדרכה, מה לקחת לכיתה והסיכום. כאן גם מוודאים שהנוכחות נרשמה נכון.' },
    { sel: '#mat-sec', title: 'חומרים מהמדריכ/ה',
      text: 'מצגות וקבצים שהמדריכ/ה העלה/תה לקבוצה.' },
    { sel: '#msg-sec', title: 'הודעות',
      text: 'עדכונים מהמדריכ/ה לקבוצה.' },
    { sel: '#q-sec', title: 'שאלה למדריכ/ה',
      text: 'שאלה על תוכן ההדרכה? כותבים כאן, והמדריכ/ה מקבל/ת מייל ועונה.' },
    { sel: '#page-help', title: 'קושי טכני?',
      text: 'משהו לא עובד בדף? "כתבו לנו" פותח הודעה ישירה. ואת הסיור הזה אפשר לפתוח שוב מכאן.' }
  ];

  let i = 0, steps = [], box, hole;
  const visible = el => el && !el.hidden && el.offsetParent !== null && el.getBoundingClientRect().height > 0;

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
    const r = document.querySelector(steps[i].sel).getBoundingClientRect();
    const pad = 8;
    Object.assign(hole.style, { top: (r.top - pad) + 'px', left: (r.left - pad) + 'px',
      width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
    const bw = Math.min(360, window.innerWidth - 24);
    box.style.width = bw + 'px';
    const below = r.bottom + 14 + box.offsetHeight < window.innerHeight;
    const top = below ? r.bottom + 14 : Math.max(12, r.top - 14 - box.offsetHeight);
    let left = r.left + r.width - bw;                 // RTL: מיושר לקצה הימני של המקטע
    left = Math.max(12, Math.min(left, window.innerWidth - bw - 12));
    box.style.top = top + 'px';
    box.style.left = left + 'px';
  }
  function show() {
    const s = steps[i];
    const el = document.querySelector(s.sel);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    box.innerHTML =
      `<div class="tour-count">${i + 1} מתוך ${steps.length}</div>
       <h3>${s.title}</h3><p>${s.text}</p>
       <div class="tour-actions">
         <button type="button" class="tour-next">${i === steps.length - 1 ? 'סיום' : 'הבא'}</button>
         ${i ? '<button type="button" class="tour-prev">הקודם</button>' : ''}
         <button type="button" class="tour-skip">דילוג על הסיור</button>
       </div>`;
    box.querySelector('.tour-next').onclick = () => go(1);
    const prev = box.querySelector('.tour-prev'); if (prev) prev.onclick = () => go(-1);
    box.querySelector('.tour-skip').onclick = end;
    setTimeout(place, 350); place();
    box.querySelector('.tour-next').focus({ preventScroll: true });
  }
  function go(d) {
    const n = i + d;
    if (n >= steps.length) return end();
    if (n < 0) return;
    i = n; show();
  }
  function end() {
    try { localStorage.setItem(KEY, 'done'); } catch (e) { /* לא חוסם */ }
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place);
    if (box) box.remove(); if (hole) hole.remove();
    box = hole = null;
  }
  function start() {
    if (box) return;
    steps = STEPS.filter(s => visible(document.querySelector(s.sel)));
    if (!steps.length) return;
    i = 0; build(); show();
  }
  function maybeStart() {
    let flag = '';
    try { flag = localStorage.getItem(KEY) || ''; } catch (e) { flag = ''; }
    const forced = new URLSearchParams(location.search).get('tour') === '1';
    if (forced || flag === 'pending') setTimeout(start, 600);
  }
  window.TS_teacherTour = { start: start, maybeStart: maybeStart };
  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('[data-tour-start]')) { e.preventDefault(); start(); }
  });
})();
