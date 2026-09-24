/* ============================================================
   auth-guard.js — שומר כניסה לדשבורדים
   נטען אחרי app.js. שימוש:
     <script src="../assets/auth-guard.js" data-roles="guide,ministry_admin"></script>

   התנהגות:
   - אם בשרת עדיין לא פרוסה מערכת ההתחברות (Apps Script ישן) — מצב חסד:
     הדף נפתח כרגיל (כמו היום), בלי לחסום אף אחד.
   - ברגע שהשרת תומך: מי שלא מחובר מופנה ל-login.html, וחוזר לדף אחרי כניסה.
   - data-roles (אופציונלי): אילו תפקידים מורשים לדף. ministry_admin תמיד מורשה.
   ============================================================ */
(function () {
  const scriptTag = document.currentScript;
  const allowedRoles = (scriptTag && scriptTag.dataset.roles || '')
    .split(',').map(s => s.trim()).filter(Boolean);

  // נתיב יחסי לשורש המערכת (login.html יושב בשורש training-supervision)
  const ROOT = location.pathname.replace(/\/(ministry|guide|admin-network|admin-school|checkin|teacher|knowledge)\/.*$|\/[^\/]*$/, '/');
  // מ-24.9.26 הדלת היא דף הבית של מנור (מייל → קוד); login.html נשאר לכניסה בסיסמה
  const LOGIN = ROOT + '?next=' + encodeURIComponent(location.pathname + location.search);

  // כניסת בעלי התפקידים (staff.js, 24.9.26) — מתורגמת לתפקיד של הדף
  function staffAsAuth() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem('ts.staff.v1') || 'null'); } catch (e) {}
    if (!s || !s.k || !Array.isArray(s.roles)) return null;
    if (s.roles.some(r => r.role === 'ministry')) return { role: 'ministry_admin', email: s.email, name: s.name };
    const net = s.roles.filter(r => r.role === 'network')[0];
    if (net) return { role: 'network_admin', networkId: net.network, email: s.email, name: s.name };
    return { role: 'staff', email: s.email, name: s.name };
  }

  function deny(text) {
    document.documentElement.innerHTML =
      '<body style="font-family:Fredoka,Heebo,sans-serif; direction:rtl; display:grid; place-items:center; min-height:90vh; background:#F3F7FA; color:#143E4C;">' +
      '<div style="text-align:center; max-width:420px; padding:24px;">' +
      '<div style="font-size:20px; font-weight:700; margin-bottom:10px;">אין הרשאה לעמוד הזה</div>' +
      '<div style="color:#4F6E7A; line-height:1.8;">' + text + '</div>' +
      '<a href="' + ROOT + 'login.html" style="display:inline-block; margin-top:18px; color:#1A5365; font-weight:600;">מעבר לדף הכניסה</a>' +
      '</div></body>';
  }

  async function guard() {
    // typeof ולא window.TS: app.js מגדיר const TS, שאינו נתלה על window — עד 24.9.26
    // הבדיקה הזו החזירה תמיד והשומר לא נעל כלום
    if (typeof TS === 'undefined') return;   // app.js לא נטען — לא חוסמים
    let auth = TS.authGet();
    const viaStaff = (!auth || !auth.token) ? staffAsAuth() : null;

    // בדיקה אם השרת בכלל תומך בהתחברות (פעם בשעה, נשמר ב-sessionStorage)
    let backendReady = sessionStorage.getItem('ts.authBackend');
    if (backendReady === null) {
      try {
        const ping = await TS.api('auth.status', { email: 'ping@ping' }, { cache: 'no' });
        backendReady = (ping && ping.error && ping.error.indexOf('unknown_action') === 0) ? '0' : '1';
      } catch (e) { backendReady = '0'; }
      sessionStorage.setItem('ts.authBackend', backendReady);
    }
    if (backendReady === '0') return;          // מצב חסד — השרת עדיין בלי auth

    if (viaStaff) {
      auth = viaStaff;             // staff.js מאמת את המפתח ברקע בדף הבית ובמבטים
    } else if (!auth || !auth.token) {
      location.href = LOGIN; return;
    } else {
      // אימות הטוקן מול השרת (ברקע — אם נפל, מפנים להתחברות)
      TS.api('auth.verify', {}, { cache: 'no' }).then(res => {
        if (!res || !res.ok) { TS.authClear(); location.href = LOGIN; }
      });
    }

    // בדיקת תפקיד לדף (אדמין ארצי תמיד מורשה)
    if (allowedRoles.length &&
        auth.role !== 'ministry_admin' &&
        allowedRoles.indexOf(auth.role) < 0) {
      if (viaStaff) { location.replace(ROOT); return; }   // הדלת תציג את המבטים שלך
      deny('החשבון ' + (auth.email || '') + ' (' + (auth.name || auth.role) + ') אינו מורשה לדף הזה. אם לדעתך זו טעות — פנה/י למיטל פלג.');
      return;
    }

    // נעילת scope — מניעת דליפה בין רשתות/בתי ספר דרך שינוי ה-URL:
    // מנהל רשת שמבקש ?network= של רשת אחרת מוחזר אוטומטית לרשת שלו,
    // ומנהל בי"ס/רכז שמבקש ?school= אחר מוחזר לבי"ס שלו.
    // (השרת אוכף את זה ממילא ברמת ה-API — זו שכבת ההגנה בדפדפן.)
    const qs = new URLSearchParams(location.search);
    if (auth.role === 'network_admin' && auth.networkId) {
      const own = String(auth.networkId).replace(/^net_/, '');
      const asked = (qs.get('network') || '').replace(/^net_/, '');
      if (asked !== own) {
        qs.set('network', own);
        location.replace(location.pathname + '?' + qs.toString());
        return;
      }
    }
    if ((auth.role === 'school_admin' || auth.role === 'school_subject_coordinator') && auth.schoolId) {
      const asked = qs.get('school') || '';
      if (asked && asked !== auth.schoolId) {
        qs.set('school', auth.schoolId);
        location.replace(location.pathname + '?' + qs.toString());
        return;
      }
    }
  }

  // כפתור יציאה קטן בפס העליון (אם קיים ומחוברים)
  function addLogout() {
    const auth = (TS && TS.authGet()) || staffAsAuth();
    if (!auth) return;
    const bar = document.querySelector('.command-bar-status');
    if (!bar) return;
    const btn = document.createElement('button');
    btn.textContent = 'יציאה';
    btn.title = 'התנתקות ' + (auth.email || '');
    btn.style.cssText = 'background:none;border:1px solid currentColor;border-radius:8px;padding:3px 10px;font-family:inherit;font-size:12px;cursor:pointer;color:inherit;margin-inline-start:10px;';
    btn.onclick = () => {
      TS.authClear();
      try { localStorage.removeItem('ts.staff.v1'); } catch (e) {}
      location.href = ROOT;
    };
    bar.appendChild(btn);
  }

  guard();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addLogout);
  } else {
    addLogout();
  }
})();
