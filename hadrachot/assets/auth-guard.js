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
  const LOGIN = ROOT + 'login.html?next=' + encodeURIComponent(location.pathname + location.search);

  function deny(text) {
    document.documentElement.innerHTML =
      '<body style="font-family:Heebo,sans-serif; direction:rtl; display:grid; place-items:center; min-height:90vh; background:#F4F7F8; color:#17324D;">' +
      '<div style="text-align:center; max-width:420px; padding:24px;">' +
      '<div style="font-size:20px; font-weight:700; margin-bottom:10px;">אין הרשאה לעמוד הזה</div>' +
      '<div style="color:#5C7182; line-height:1.8;">' + text + '</div>' +
      '<a href="' + ROOT + 'login.html" style="display:inline-block; margin-top:18px; color:#256A8A; font-weight:600;">מעבר לדף הכניסה</a>' +
      '</div></body>';
  }

  async function guard() {
    if (!window.TS) return;                    // app.js לא נטען — לא חוסמים
    const auth = TS.authGet();

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

    if (!auth || !auth.token) { location.href = LOGIN; return; }

    // אימות הטוקן מול השרת (ברקע — אם נפל, מפנים להתחברות)
    TS.api('auth.verify', {}, { cache: 'no' }).then(res => {
      if (!res || !res.ok) { TS.authClear(); location.href = LOGIN; }
    });

    // בדיקת תפקיד לדף (אדמין ארצי תמיד מורשה)
    if (allowedRoles.length &&
        auth.role !== 'ministry_admin' &&
        allowedRoles.indexOf(auth.role) < 0) {
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
    const auth = TS && TS.authGet();
    if (!auth) return;
    const bar = document.querySelector('.command-bar-status');
    if (!bar) return;
    const btn = document.createElement('button');
    btn.textContent = 'יציאה';
    btn.title = 'התנתקות ' + (auth.email || '');
    btn.style.cssText = 'background:none;border:1px solid currentColor;border-radius:8px;padding:3px 10px;font-family:inherit;font-size:12px;cursor:pointer;color:inherit;margin-inline-start:10px;';
    btn.onclick = () => { TS.authClear(); location.href = ROOT + 'login.html'; };
    bar.appendChild(btn);
  }

  guard();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addLogout);
  } else {
    addLogout();
  }
})();
