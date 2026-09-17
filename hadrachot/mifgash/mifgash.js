/* ============================================================
   רישום עצמי לנוכחות במפגש — הצד של המורה (14.9.26)
   -----------------------------------------------------------
   mifgash/?g=<slug>. הקישור קבוע לכל קבוצה ואפשר להדביק אותו בצ'אט של
   הזום בכל מפגש — הוא לבדו לא מספיק: הרישום נקלט רק כשהרישום פתוח עכשיו
   ורק עם הקוד בן 4 הספרות שמוקרן במפגש ומתחלף כל 5 דקות (גם הקוד הקודם מתקבל).
   הרישום נשמר כ"ממתין לאישור" עד שהמדריכ/ה מאשר/ת.

   שמות המורים מגיעים מ-checkin.roster רק בזמן שהרישום פתוח.
   הבחירה נשמרת במכשיר — במפגש הבא נשאר רק להקליד קוד.
   צד השרת: checkin.roster / checkin.submit בסוף apps-script/code.gs.
   ============================================================ */
(function () {
  const SLUG = TS.urlParam('g', '');
  const G = (window.TS_resolveGuide ? window.TS_resolveGuide(SLUG, '') : null) || null;
  const ARAB = !!(G && G.sectors && G.sectors.indexOf('arab') >= 0);
  const ME_KEY = 'ts.mifgash.me.' + SLUG;
  const RETRY_MS = 20000;

  let roster = [];
  let me = null;          // { teacherId, name, schoolName, free }
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
  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function show(name) {
    ['loading', 'invalid', 'closed', 'who', 'code', 'done'].forEach(s => { $('st-' + s).hidden = (s !== name); });
  }
  function loadMe() {
    try { const v = JSON.parse(localStorage.getItem(ME_KEY) || 'null'); return v && v.name ? v : null; } catch (e) { return null; }
  }
  function saveMe(v) { try { localStorage.setItem(ME_KEY, JSON.stringify(v)); } catch (e) {} }

  document.addEventListener('DOMContentLoaded', () => {
    if (!G || !G.slug) { show('invalid'); return; }
    const subjects = (window.TS_guideSubjects ? window.TS_guideSubjects(G) : [G.subject]).filter(Boolean);
    $('mf-title').innerHTML = t('רישום נוכחות למפגש', 'تسجيل الحضور للقاء');
    $('mf-sub').innerHTML = esc([subjects.join(' · '), G.name].filter(Boolean).join(' · '));
    $('foot-note').innerHTML = t('הנוכחות נספרת אחרי אישור בסיום המפגש.', 'يُحتسب الحضور بعد التأكيد في نهاية اللقاء.');

    // טקסטים קבועים
    $('q-name').innerHTML = t('מה השם שלך?', 'ما اسمك؟');
    $('who-search').placeholder = ARAB ? 'הקלידו שם · اكتبوا الاسم' : 'מקלידים שם או בית ספר';
    $('btn-unlisted').innerHTML = t('השם שלי לא ברשימה', 'اسمي غير موجود في القائمة');
    $('q-free').innerHTML = t('רישום בלי שם מהרשימה', 'التسجيل بدون اسم من القائمة');
    $('lbl-free-name').innerHTML = t('שם מלא', 'الاسم الكامل');
    $('lbl-free-school').innerHTML = t('בית ספר', 'المدرسة');
    $('btn-free-next').innerHTML = t('המשך', 'متابعة');
    $('btn-back-list').innerHTML = t('חזרה לרשימה', 'العودة إلى القائمة');
    $('q-me').innerHTML = t('נרשמת כבר מהמכשיר הזה:', 'سجّلت سابقًا من هذا الجهاز:');
    $('btn-its-me').innerHTML = t('זה אני — המשך', 'هذا أنا — متابعة');
    $('btn-not-me').innerHTML = t('לא אני', 'ليس أنا');
    $('btn-change').innerHTML = t('החלפה', 'تغيير');
    $('q-code').innerHTML = t('מה הקוד שמופיע עכשיו על המסך?', 'ما الرمز الظاهر الآن على الشاشة؟');
    $('btn-submit').innerHTML = t('רישום נוכחות', 'تسجيل الحضور');
    $('btn-retry').innerHTML = t('בדיקה שוב', 'تحقق مرة أخرى');

    $('btn-retry').addEventListener('click', loadRoster);
    $('who-search').addEventListener('input', renderList);
    $('btn-unlisted').addEventListener('click', () => { $('who-pick').hidden = true; $('who-free').hidden = false; $('free-name').focus(); });
    $('btn-back-list').addEventListener('click', () => { $('who-free').hidden = true; $('who-pick').hidden = false; });
    $('btn-free-next').addEventListener('click', () => {
      const name = $('free-name').value.trim(), school = $('free-school').value.trim();
      if (!name) { $('free-name').focus(); return; }
      if (!school) { $('free-school').focus(); return; }
      choose({ teacherId: '', name: name, schoolName: school, free: true });
    });
    $('btn-its-me').addEventListener('click', () => choose(me));
    $('btn-not-me').addEventListener('click', () => { me = null; $('me-saved').hidden = true; $('who-pick').hidden = false; $('who-search').focus(); });
    $('btn-change').addEventListener('click', () => { me = null; showWho(false); });
    $('code-input').addEventListener('input', e => {
      const v = e.target.value.replace(/\D/g, '').slice(0, 4);
      if (e.target.value !== v) e.target.value = v;
      $('btn-submit').disabled = v.length !== 4 || sending;
      $('code-err').hidden = true;
      if (v.length === 4) submit();
    });
    $('btn-submit').addEventListener('click', submit);

    me = loadMe();
    loadRoster();
  });

  async function loadRoster() {
    clearTimeout(retryTimer);
    show('loading');
    const res = await TS.api('checkin.roster', {
      g: G.slug,
      subjects: ((window.TS_guideSubjects ? window.TS_guideSubjects(G) : [G.subject]) || []).filter(Boolean).join(','),
      sectors: (G.sectors || []).join(','),
      tracks: (Array.isArray(G.tracks) ? G.tracks : []).join(',')
    }, { cache: 'no' });

    if (!res || !res.ok) {
      showClosed(t('אין חיבור כרגע', 'لا يوجد اتصال حاليًا'), t('בודקים שוב בעוד רגע.', 'نحاول مرة أخرى بعد لحظة.'));
      retryTimer = setTimeout(loadRoster, RETRY_MS);
      return;
    }
    if (!res.data.open) {
      showClosed(t('הרישום עוד לא נפתח', 'التسجيل لم يُفتح بعد'),
        t('הרישום לנוכחות פתוח רק בזמן המפגש, אחרי שנפתח במפגש. הדף בודק שוב לבד.', 'التسجيل مفتوح فقط أثناء اللقاء بعد فتحه. الصفحة تتحقق تلقائيًا.'));
      retryTimer = setTimeout(loadRoster, RETRY_MS);
      return;
    }
    roster = res.data.roster || [];
    if (res.data.topic) $('mf-sub').innerHTML += ' · ' + esc(res.data.topic);
    // מי שנשמר במכשיר — מוודאים שעדיין ברשימה (או שנרשם כשם חופשי)
    if (me && !me.free && !roster.some(r => r.id === me.teacherId)) me = null;
    showWho(!!me);
  }

  function showClosed(h, p) {
    $('closed-h').innerHTML = h;
    $('closed-p').innerHTML = p;
    show('closed');
  }

  function showWho(withSaved) {
    show('who');
    $('who-free').hidden = true;
    if (withSaved && me) {
      $('me-saved').hidden = false;
      $('who-pick').hidden = true;
      $('me-name').textContent = me.name;
      $('me-school').textContent = me.schoolName || '';
    } else {
      $('me-saved').hidden = true;
      $('who-pick').hidden = false;
      $('who-search').value = '';
      renderList();
    }
  }

  function renderList() {
    const q = norm($('who-search').value);
    const box = $('who-list');
    if (q.length < 2) {
      box.innerHTML = '<div class="mf-hint">' + t('מקלידים לפחות שתי אותיות מהשם', 'اكتبوا حرفين على الأقل من الاسم') + '</div>';
      return;
    }
    const hits = roster.filter(r => norm(r.name).includes(q) || norm(r.schoolName).includes(q)).slice(0, 40);
    if (!hits.length) {
      box.innerHTML = '<div class="mf-hint">' + t('לא נמצא. אפשר ללחוץ על "השם שלי לא ברשימה".', 'لم يتم العثور. اضغطوا "اسمي غير موجود في القائمة".') + '</div>';
      return;
    }
    box.innerHTML = hits.map(r =>
      `<button type="button" class="mf-item" role="listitem" data-id="${esc(r.id)}"><b>${esc(r.name)}</b><span>${esc(r.schoolName)}</span></button>`
    ).join('');
    box.querySelectorAll('.mf-item').forEach(b => b.addEventListener('click', () => {
      const r = roster.find(x => x.id === b.dataset.id);
      if (r) choose({ teacherId: r.id, name: r.name, schoolName: r.schoolName, free: false });
    }));
  }

  function choose(v) {
    me = v;
    saveMe(v);
    $('code-name').textContent = v.name;
    $('code-school').textContent = v.schoolName || '';
    $('code-input').value = '';
    $('code-err').hidden = true;
    $('btn-submit').disabled = true;
    show('code');
    $('code-input').focus();
  }

  async function submit() {
    const code = $('code-input').value.replace(/\D/g, '');
    if (code.length !== 4 || sending || !me) return;
    sending = true;
    $('btn-submit').disabled = true;
    $('btn-submit').innerHTML = t('רושם…', 'جارٍ التسجيل…');
    const payload = { g: G.slug, code: code };
    if (me.teacherId) payload.teacherId = me.teacherId;
    else { payload.teacherName = me.name; payload.schoolName = me.schoolName; }
    const res = await TS.apiPost('checkin.submit', payload);
    sending = false;
    $('btn-submit').innerHTML = t('רישום נוכחות', 'تسجيل الحضور');

    if (res && res.ok) {
      const dup = res.data && res.data.duplicate;
      $('done-h').innerHTML = dup ? t('כבר נרשמת למפגש הזה', 'لقد سجّلت لهذا اللقاء مسبقًا') : t('נרשמת בהצלחה', 'تم تسجيلك بنجاح');
      $('done-p').innerHTML = esc(me.name) + '<br>' + t('הנוכחות תאושר בסיום המפגש. אפשר לסגור את הדף.', 'سيتم تأكيد الحضور في نهاية اللقاء. يمكن إغلاق الصفحة.');
      show('done');
      return;
    }
    const err = res && res.error;
    if (err === 'closed') {
      showClosed(t('הרישום נסגר', 'تم إغلاق التسجيل'), t('אפשר לפנות למדריך/ה בצ\'אט של המפגש.', 'يمكن التوجه للمرشد في دردشة اللقاء.'));
      return;
    }
    const msg = err === 'bad_code'
      ? t('הקוד לא נכון או שכבר התחלף. מקלידים את הקוד שמופיע עכשיו על המסך.', 'الرمز غير صحيح أو تم تغييره. اكتبوا الرمز الظاهر الآن على الشاشة.')
      : err === 'locked'
        ? t('יותר מדי ניסיונות. אפשר לנסות שוב בעוד 10 דקות, או לפנות בצ\'אט של המפגש.', 'محاولات كثيرة جدًا. حاولوا مرة أخرى بعد 10 دقائق أو توجهوا عبر الدردشة.')
        : err === 'unknown_teacher'
          ? t('השם הזה כבר לא ברשימה. לוחצים על "החלפה" ובוחרים שוב.', 'هذا الاسم لم يعد في القائمة. اضغطوا "تغيير" واختاروا مجددًا.')
          : t('לא הצלחנו לרשום כרגע. אפשר לנסות שוב.', 'لم نتمكن من التسجيل حاليًا. حاولوا مرة أخرى.');
    // התשובה ל-POST נופלת לפעמים גם כשהרישום עבר — ניסיון חוזר יחזיר "כבר נרשמת"
    $('code-err').innerHTML = msg;
    $('code-err').hidden = false;
    if (err === 'bad_code') { $('code-input').value = ''; $('code-input').focus(); }
    $('btn-submit').disabled = $('code-input').value.length !== 4;
  }
})();
