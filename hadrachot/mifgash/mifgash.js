/* ============================================================
   רישום עצמי לנוכחות במפגש — הצד של המורה (14.9.26)
   -----------------------------------------------------------
   mifgash/?g=<slug>. הקישור קבוע לכל קבוצה ואפשר להדביק אותו בצ'אט של
   הזום בכל מפגש.

   רישום פשוט (12.10.26, מיטל): בלי קוד על המסך. הרישום נפתח לבד 15 דק׳
   לפני כל מועד בתוכנית ונסגר שעתיים אחרי תחילתו (השרת — meetAutoOpenTick_).
   המורה המזוהה במכשיר לוחץ/ת "אני כאן" — teacher.here עם המפתח החתום
   (ts.teacher.v1), שהוא הוכחת זהות חזקה יותר מהקוד. הרישום נשמר כ"ממתין"
   עד שהמדריכ/ה מאשר/ת (במבט או מהמייל), ואחרי 3 ימים מאושר לבד.

   מי שעוד לא נרשם/ה ב"מבט המורה" מועבר/ת ל-teacher/?next=mifgash&g=<slug>:
   מייל + קוד במייל, ומשם חוזר/ת לכאן. שאלת ההשתלמות ויח"ל נשאלות בכניסה
   הבאה לבית של המורה — לא באמצע המפגש.
   צד השרת: checkin.status / teacher.here ב-apps-script/code.gs.
   ============================================================ */
(function () {
  const SLUG = TS.urlParam('g', '');
  const G = (window.TS_resolveGuide ? window.TS_resolveGuide(SLUG, '') : null) || null;
  const ARAB = !!(G && G.sectors && G.sectors.indexOf('arab') >= 0);
  const TEACHER_KEY = 'ts.teacher.v1';   // הזיהוי של מבט המורה (teacher/dashboard.js)
  const DONE_KEY = 'ts.mifgash.done.' + SLUG;   // נרשמתי היום — פתיחה חוזרת מראה את האישור
  const RETRY_MS = 20000;
  const EARLY_MIN = 15;                  // כמו MEET_AUTO_EARLY_MIN בשרת

  let me = null;          // { teacherId, k, name, schoolName }
  let retryTimer = null;
  let sending = false;

  const $ = id => document.getElementById(id);

  // עברית + ערבית (לקבוצות בחברה הערבית)
  function t(he, ar) {
    return esc(he) + (ARAB && ar ? '<span class="ar" lang="ar" dir="rtl">' + esc(ar) + '</span>' : '');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function show(name) {
    ['loading', 'invalid', 'closed', 'here', 'done'].forEach(s => { $('st-' + s).hidden = (s !== name); });
  }
  function loadMe() {
    try {
      const v = JSON.parse(localStorage.getItem(TEACHER_KEY) || 'null');
      // school הוא מזהה (sch_…) — מציגים רק את השם, אם נשמר
      return v && v.k && v.id ? { teacherId: String(v.id), k: String(v.k), name: v.name || '', schoolName: v.schoolName || '' } : null;
    } catch (e) { return null; }
  }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function loadDone() {
    try {
      const v = JSON.parse(localStorage.getItem(DONE_KEY) || 'null');
      return v && v.day === today() && String(v.id) === String(me.teacherId) ? v : null;
    } catch (e) { return null; }
  }
  function saveDone(at) {
    try { localStorage.setItem(DONE_KEY, JSON.stringify({ day: today(), id: me.teacherId, at: at })); } catch (e) {}
  }
  function nowHHMM() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function showDone(dup, at) {
    $('done-h').innerHTML = dup ? t('כבר נרשמת למפגש של היום', 'لقد سجّلت للقاء اليوم')
      : t('נרשמת! הנוכחות שלך עודכנה', 'تم التسجيل! تم تحديث حضورك');
    $('done-p').innerHTML = '<b>' + esc(me.name) + '</b>' + (me.schoolName ? ' · ' + esc(me.schoolName) : '') + '<br>' +
      t('הנוכחות שלך נקלטה במערכת. אין צורך לעשות שום דבר נוסף — אפשר לסגור את הדף.',
        'تم استلام حضورك في النظام. لا حاجة لأي خطوة أخرى — يمكن إغلاق الصفحة.');
    $('done-when').textContent = at ? ('✓ ' + at) : '';
    $('done-when').hidden = !at;
    show('done');
  }
  function toRegistration(forget) {
    if (forget) { try { localStorage.removeItem(TEACHER_KEY); } catch (e) {} }
    location.replace('../teacher/?next=mifgash&g=' + encodeURIComponent(SLUG));
  }

  // מתי הרישום נפתח היום — לפי התוכנית (plans.js), 15 דק׳ לפני המועד
  function nextOpenToday() {
    const plan = window.TS_PLANS && G && window.TS_PLANS[G.slug];
    if (!plan || !window.TS_meetingSlots) return '';
    const d = today();
    const now = new Date().getHours() * 60 + new Date().getMinutes();
    const mins = [];
    (plan.meetings || []).forEach(m => window.TS_meetingSlots(m).forEach(s => {
      if (s.date !== d) return;
      const [h, mi] = s.start.split(':').map(Number);
      const at = h * 60 + mi - EARLY_MIN;
      if (at > now) mins.push(at);
    }));
    if (!mins.length) return '';
    const m = Math.min.apply(null, mins);
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!G || !G.slug) { show('invalid'); return; }
    me = loadMe();
    if (!me) { toRegistration(false); return; }   // עוד לא נרשם/ה — קודם מייל וקוד, פעם אחת
    const prevDone = loadDone();
    if (prevDone) { showDone(true, prevDone.at); return; }
    const subjects = (window.TS_guideSubjects ? window.TS_guideSubjects(G) : [G.subject]).filter(Boolean);
    $('mf-title').innerHTML = t('רישום נוכחות למפגש', 'تسجيل الحضور للقاء');
    $('mf-sub').innerHTML = esc([subjects.join(' · '), G.name].filter(Boolean).join(' · '));
    $('foot-note').innerHTML = t('הרישום מגיע מיד למדריכ/ה.', 'يصل التسجيل فورًا إلى المرشد/ة.');

    $('here-hello').innerHTML = t('שלום ' + (me.name || ''), 'مرحبًا ' + (me.name || ''));
    $('here-school').textContent = me.schoolName || '';
    $('btn-not-me').innerHTML = t('לא אני', 'ليس أنا');
    $('btn-here').innerHTML = t('אני כאן במפגש', 'أنا هنا في اللقاء');
    $('btn-retry').innerHTML = t('בדיקה שוב', 'تحقق مرة أخرى');

    $('btn-retry').addEventListener('click', loadStatus);
    $('btn-not-me').addEventListener('click', () => toRegistration(true));
    $('btn-here').addEventListener('click', submit);

    loadStatus();
  });

  async function loadStatus() {
    clearTimeout(retryTimer);
    show('loading');
    const res = await TS.api('checkin.status', { g: G.slug }, { cache: 'no' });
    if (!res || !res.ok) {
      showClosed(t('אין חיבור כרגע', 'لا يوجد اتصال حاليًا'), t('בודקים שוב בעוד רגע.', 'نحاول مرة أخرى بعد لحظة.'));
      retryTimer = setTimeout(loadStatus, RETRY_MS);
      return;
    }
    if (!res.data.open) {
      const at = nextOpenToday();
      showClosed(t('הרישום עוד לא נפתח', 'التسجيل لم يُفتح بعد'),
        at ? t('הרישום ייפתח היום ב-' + at + '. הדף בודק שוב לבד.', 'سيُفتح التسجيل اليوم الساعة ' + at + '. الصفحة تتحقق تلقائيًا.')
           : t('הרישום פתוח בזמן המפגש בלבד. הדף בודק שוב לבד.', 'التسجيل مفتوح فقط أثناء اللقاء. الصفحة تتحقق تلقائيًا.'));
      retryTimer = setTimeout(loadStatus, RETRY_MS);
      return;
    }
    if (res.data.topic) $('mf-sub').innerHTML = $('mf-sub').innerHTML.split(' · <i>')[0] + ' · <i>' + esc(res.data.topic) + '</i>';
    $('here-err').hidden = true;
    $('btn-here').disabled = false;
    show('here');
  }

  function showClosed(h, p) {
    $('closed-h').innerHTML = h;
    $('closed-p').innerHTML = p;
    show('closed');
  }

  async function submit() {
    if (sending || !me) return;
    sending = true;
    $('btn-here').disabled = true;
    $('btn-here').innerHTML = t('רושם…', 'جارٍ التسجيل…');
    $('here-err').hidden = true;
    const payload = { k: me.k, g: G.slug };
    let res = await TS.apiPost('teacher.here', payload);
    // תשובה שנפלה בדרך — ניסיון שקט נוסף; השרת לא יוצר שורה שנייה (already)
    if (res && !res.ok && (res.transient || res.error === 'timeout' || res.error === 'bad_response' || res.error === 'busy')) {
      res = await TS.apiPost('teacher.here', payload);
    }
    sending = false;
    $('btn-here').innerHTML = t('אני כאן במפגש', 'أنا هنا في اللقاء');

    if (res && res.ok) {
      const at = 'נקלט ב-' + nowHHMM();
      saveDone(at);
      showDone(!!(res.data && res.data.already), at);
      return;
    }
    const err = res && res.error;
    if (err === 'bad_key') { toRegistration(true); return; }   // הרשומה נמחקה/אוחדה — נרשמים מחדש
    if (err === 'closed') {
      showClosed(t('הרישום נסגר', 'تم إغلاق التسجيل'), t('אפשר לפנות למדריך/ה בצ\'אט של המפגש.', 'يمكن التوجه للمرشد في دردشة اللقاء.'));
      return;
    }
    $('here-err').innerHTML = t('לא הצלחנו לרשום כרגע. אפשר ללחוץ שוב.', 'لم نتمكن من التسجيل حاليًا. اضغطوا مرة أخرى.');
    $('here-err').hidden = false;
    $('btn-here').disabled = false;
  }
})();
