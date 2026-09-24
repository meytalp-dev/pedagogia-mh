/* ============================================================
   staff.js — כניסת בעלי התפקידים של מנור (24.9.26, בקשת מיטל)
   -----------------------------------------------------------
   "כל בעל תפקיד רואה רק את המבט שלו." הכניסה בדף הבית (מייל → קוד),
   והסקריפט הזה נועל את המבטים עצמם.

   שימוש בדף מבט — בתוך <head>, לפני כל תוכן:
     <script src="../assets/staff.js" data-view="guide"></script>
   data-view: guide | inspector | principal
   (המבט הארצי ומבט הרשת ננעלים ב-auth-guard.js, שמכיר גם את הכניסה הזו.)

   מה קורה בדף מבט:
   - הדף מוסתר מיד, עד שנקבע שמותר לראות אותו.
   - אין כניסה במכשיר → מעבר לדלת הכניסה (?next= חוזר לכאן אחרי הכניסה).
   - יש כניסה, אבל הכתובת של מישהו אחר (?g= / ?i= / ?school=) → מוחזרים
     לכתובת שלך. מטה (ministry) רואה הכול.
   - מדריכ/ה בלי מייל במערכת נכנס/ת עם הקישור האישי שיש בו מפתח (&k=) —
     השרת מאמת את המפתח, ורק הקישור שלו/ה נפתח.
   - הבדיקה רק בטעינת הדף — לעולם לא באמצע עבודה (לקח ההזנה שאבדה, 1.9.26).
   ============================================================ */
(function () {
  var STORE = 'ts.staff.v1';
  var tag = document.currentScript;
  var view = (tag && tag.dataset.view) || '';
  // שורש מנור = התיקייה שמעל assets/
  var ROOT = (function () {
    try { return new URL('../', tag.src).pathname; } catch (e) { return '/hadrachot/'; }
  })();

  function get() { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } }
  function set(s) { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) {} }
  function clear() { try { localStorage.removeItem(STORE); } catch (e) {} }

  // מפקח.ת שמוכר.ת רק בשם (נמענים.js) → ה-slug מ-TS_INSPECTORS
  function inspectorSlug(r) {
    if (r.slug) return r.slug;
    var list = window.TS_INSPECTORS || {};
    var hit = Object.keys(list).filter(function (k) { return list[k].name === r.name; })[0];
    return hit || '';
  }

  function urlFor(r, s) {
    s = s || get() || {};
    switch (r.role) {
      case 'ministry':  return ROOT + 'ministry/';
      case 'network':   return ROOT + 'admin-network/?network=' + encodeURIComponent(r.network);
      case 'principal': return ROOT + 'admin-school/?school=' + encodeURIComponent(r.school);
      case 'guide':     return ROOT + 'guide/?g=' + encodeURIComponent(r.slug) +
                          (s.email ? '&guide=' + encodeURIComponent(s.email) : '');
      case 'inspector': {
        var slug = inspectorSlug(r);
        return slug ? ROOT + 'mabat/?i=' + encodeURIComponent(slug) : '';
      }
    }
    return '';
  }

  function label(r) {
    switch (r.role) {
      case 'ministry':  return { title: 'מבט ארצי', sub: 'כל הרשתות, בתי הספר והמדריכים' };
      case 'network':   return { title: 'מבט רשת', sub: r.label || r.network };
      case 'principal': return { title: 'מבט בית ספר', sub: r.label || r.school };
      case 'guide': {
        var g = (window.TS_GUIDES || {})[r.slug] || {};
        return { title: 'מבט המדריכ/ה', sub: [g.name, g.subject].filter(Boolean).join(' · ') || r.slug };
      }
      case 'inspector': {
        var ins = (window.TS_INSPECTORS || {})[inspectorSlug(r)] || {};
        return { title: 'מבט המפקח.ת', sub: ins.name || r.name || '' };
      }
    }
    return { title: r.role, sub: '' };
  }

  function logout() {
    clear();
    try { if (typeof TS !== 'undefined' && TS.authClear) TS.authClear(); } catch (e) {}
    location.href = ROOT;
  }

  window.TS_staff = { get: get, set: set, clear: clear, urlFor: urlFor, label: label,
                      inspectorSlug: inspectorSlug, logout: logout, ROOT: ROOT };

  if (!view) return;   // דף הבית משתמש רק בעזרים

  /* ---------------- נעילת דף מבט ---------------- */
  var veil = document.createElement('style');
  veil.textContent = 'html{visibility:hidden!important}';
  document.head.appendChild(veil);
  function show() { if (veil.parentNode) veil.parentNode.removeChild(veil); }
  function toGate() {
    location.replace(ROOT + '?next=' + encodeURIComponent(location.pathname + location.search));
  }
  function goHome() { location.replace(ROOT); }

  var qs = new URLSearchParams(location.search);
  var page = location.pathname.split('/').pop() || 'index.html';

  // מחזיר: 'ok' | כתובת להפניה | '' (אין הרשאה למבט הזה)
  function decide(roles, email) {
    if (roles.some(function (r) { return r.role === 'ministry'; })) return 'ok';
    var mine;
    if (view === 'guide') {
      var g = qs.get('g') || '';
      mine = roles.filter(function (r) { return r.role === 'guide'; });
      // דף הנוכחות הישן (?training=) — לכל מדריכ/ה
      if (page === 'attendance.html' && mine.length) return 'ok';
      if (mine.some(function (r) { return r.slug === g; })) {
        if (email && !qs.get('guide') && !qs.get('k')) {
          qs.set('guide', email);
          return location.pathname + '?' + qs.toString();
        }
        return 'ok';
      }
      // מפקח.ת פותח/ת את מרחב המדריכ/ה שלו/ה מתוך המבט המקצועי
      var insp = roles.filter(function (r) { return r.role === 'inspector'; });
      if (g && insp.some(function (r) {
        var s = inspectorSlug(r);
        return s && (window.TS_guidesOfInspector ? TS_guidesOfInspector(s) : [])
          .some(function (x) { return x.slug === g; });
      })) return 'ok';
      if (mine.length) return urlFor(mine[0], { email: email });
      if (insp.length) return urlFor(insp[0]);
      return '';
    }
    if (view === 'inspector') {
      var i = qs.get('i') || '';
      mine = roles.filter(function (r) { return r.role === 'inspector'; });
      if (mine.some(function (r) { return inspectorSlug(r) === i; })) return 'ok';
      return mine.length ? urlFor(mine[0]) : '';
    }
    if (view === 'principal') {
      var sch = qs.get('school') || '';
      mine = roles.filter(function (r) { return r.role === 'principal'; });
      if (mine.some(function (r) { return r.school === sch; })) return 'ok';
      // מנהל/ת רשת — בתי הספר של הרשת שלו/ה (השרת אוכף את הרשת)
      var net = (qs.get('network') || '').replace(/^net_/, '');
      if (net && roles.some(function (r) { return r.role === 'network' && r.network === net; })) return 'ok';
      if (mine.length) {
        qs.set('school', mine[0].school);
        return location.pathname + '?' + qs.toString();
      }
      return '';
    }
    return '';
  }

  function apply(roles, email) {
    var d = decide(roles || [], email || '');
    if (d === 'ok') { show(); return true; }
    if (d) { location.replace(d); return false; }
    goHome();   // מחובר/ת, אבל זה לא המבט שלך → הדלת מציגה את המבטים שלך
    return false;
  }

  function addLogout(s) {
    var bar = document.querySelector('.command-bar-status');
    if (!bar || document.getElementById('staff-logout')) return;
    var b = document.createElement('button');
    b.id = 'staff-logout';
    b.type = 'button';
    b.textContent = 'יציאה';
    b.title = s && s.email ? 'יציאה מ-' + s.email : 'יציאה';
    b.style.cssText = 'background:none;border:1px solid currentColor;border-radius:8px;padding:3px 10px;' +
      'font-family:inherit;font-size:12px;cursor:pointer;color:inherit;margin-inline-start:10px;';
    b.onclick = logout;
    bar.appendChild(b);
  }

  function run() {
    var s = get();
    // מדריכ/ה עם קישור מפתח (&k=) ובלי כניסה במכשיר
    if ((!s || !s.k) && view === 'guide' && qs.get('g') && qs.get('k')) {
      if (typeof TS === 'undefined') { toGate(); return; }
      TS.api('staff.self', { g: qs.get('g'), gk: qs.get('k') }, { cache: 'no' }).then(function (res) {
        if (res && res.ok) show(); else toGate();
      }).catch(toGate);
      return;
    }
    if (!s || !s.k) { toGate(); return; }
    if (!apply(s.roles, s.email)) return;
    addLogout(s);
    // אימות ברקע — תפקידים עדכניים; מפתח שבוטל → חזרה לדלת
    if (typeof TS !== 'undefined') {
      TS.api('staff.self', { k: s.k }, { cache: 'no' }).then(function (res) {
        if (!res) return;
        if (!res.ok && (res.error === 'bad_key' || res.error === 'no_roles')) { clear(); toGate(); return; }
        if (res.ok && res.data) {
          s.roles = res.data.roles; s.name = res.data.name || s.name;
          set(s);
          // התפקידים השתנו כך שהדף כבר לא שלך — רק ברענון הבא (לא באמצע עבודה)
        }
      }).catch(function () {});
    }
  }

  // guides.js / app.js נטענים בסוף ה-body — מחכים להם
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
