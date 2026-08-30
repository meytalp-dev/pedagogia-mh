/* מדידת טראפיק — Google Analytics 4 + ניהול הסכמה (Google Consent Mode)
   קובץ מרכזי אחד לכל האתר. לשינוי המזהה — לשנות כאן בלבד.

   עקרון: ברירת המחדל היא דחייה. סקריפט gtag אינו נטען כלל ואינו יוצר עוגיות
   עד שהמשתמש בוחר במפורש "אישור" בבאנר. הבחירה נשמרת ומכובדת בביקורים הבאים.

   שינוי הבחירה בדיעבד:
     window.pmhConsent.open()   — פתיחה מחדש של הבאנר (למשל מעמוד הפרטיות)
     window.pmhConsent.get()    — 'granted' | 'denied' | null
     window.pmhConsent.grant()  — אישור ישיר
     window.pmhConsent.deny()   — דחייה ישירה
     window.pmhConsent.reset()  — מחיקת הבחירה והצגת הבאנר מחדש
   בנוסף: כל אלמנט בעמוד עם התכונה data-pmh-consent-open יפתח את הבאנר בלחיצה,
   בלי צורך בקוד נוסף בעמוד. */
(function () {
  var GA_ID      = 'G-FYEE26HSRP';
  var STORE_KEY  = 'pmh-consent';       // הערך: 'granted' או 'denied'
  var LEGACY_KEY = 'pmh-cookies-ok';    // המפתח הישן — היה "הבנתי" בלבד, לא בחירה

  // ---------- שכבת ההסכמה: נטענת תמיד, לא יוצרת שום בקשת רשת ----------
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  // ברירת מחדל — דחייה. חייב להידחף לפני כל טעינה אפשרית של gtag.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted'
  });

  // ---------- שמירה וקריאה של הבחירה ----------
  function readChoice() {
    var v = null;
    try { v = localStorage.getItem(STORE_KEY); } catch (e) {}
    if (!v) {
      var m = document.cookie.match(/(?:^|;\s*)pmh-consent=(granted|denied)/);
      if (m) v = m[1];
    }
    return (v === 'granted' || v === 'denied') ? v : null;
  }
  function writeChoice(v) {
    try { localStorage.setItem(STORE_KEY, v); } catch (e) {}
    // גיבוי לדפדפנים שחוסמים localStorage — עוגיית העדפה לשנה
    document.cookie = STORE_KEY + '=' + v + '; path=/; max-age=31536000; samesite=lax';
  }
  function clearChoice() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    try { localStorage.removeItem(LEGACY_KEY); } catch (e) {}
    document.cookie = STORE_KEY + '=; path=/; max-age=0; samesite=lax';
    document.cookie = LEGACY_KEY + '=; path=/; max-age=0; samesite=lax';
  }

  // ---------- טעינת GA — רק אחרי הסכמה מפורשת ----------
  // לא למדוד תצוגה מקומית (file:// או localhost) — רק את האתר החי
  function measurableHost() {
    var h = location.hostname;
    if (!h || h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:') return false;
    return true;
  }

  var t0 = Date.now(), sent = false, gaLoaded = false, engagementOn = false;

  /* מדידת זמן שהייה אמיתי: GA4 לבדו לא סופר את הדף האחרון בביקור.
     שולחים את משך השהייה בדף בעת יציאה — כך "זמן ממוצע בדף" מדויק.
     רץ רק אם ניתנה הסכמה. */
  function sendEngagement() {
    if (sent) return; sent = true;
    var sec = Math.round((Date.now() - t0) / 1000);
    if (sec < 1 || sec > 7200) return;
    gtag('event', 'page_exit', {
      seconds_on_page: sec,
      page_path: location.pathname,
      page_title: document.title
    });
  }
  function onHide() { if (document.visibilityState === 'hidden') sendEngagement(); }

  function startEngagement() {
    if (engagementOn) return; engagementOn = true;
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', sendEngagement);
  }

  function loadGA() {
    if (gaLoaded) return; gaLoaded = true;
    if (!GA_ID || GA_ID.indexOf('REPLACE') > -1) return;
    if (!measurableHost()) return;

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    gtag('js', new Date());
    gtag('config', GA_ID);
    startEngagement();
  }

  function grant() {
    writeChoice('granted');
    gtag('consent', 'update', { analytics_storage: 'granted' });
    loadGA();
  }
  function deny() {
    writeChoice('denied');
    gtag('consent', 'update', { analytics_storage: 'denied' });
    // לא נטען דבר. אם GA כבר נטען בביקור הזה — האחסון נחסם ע״י Consent Mode.
  }

  // ---------- הבאנר ----------
  /* באנר תחתון: מסביר מה נאסף ומאפשר לבחור — אישור או דחייה.
     מזריק את העיצוב בעצמו — כך שהוא עובד בכל עמוד שטוען את הקובץ הזה,
     גם עמודים ללא style.css. רץ גם בתצוגה מקומית (לבדיקה), אף שהמדידה עצמה כבויה שם. */
  var wrap = null, styleAdded = false;

  function injectCSS() {
    if (styleAdded) return; styleAdded = true;
    var css = document.createElement('style');
    css.textContent =
      '#pmh-cookies{position:fixed;inset-inline:0;bottom:0;z-index:9000;display:flex;justify-content:center;' +
      'padding:0 14px 14px;pointer-events:none;font-family:"Assistant","Noto Sans Hebrew",sans-serif}' +
      '#pmh-cookies .pmh-c-box{pointer-events:auto;direction:rtl;text-align:right;width:100%;max-width:760px;' +
      'background:#fff;color:#102A43;border:1px solid #D8E6F2;border-radius:16px;' +
      'box-shadow:0 20px 60px rgba(13,59,102,.14);padding:16px 18px;' +
      'display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;' +
      'transform:translateY(120%);opacity:0;transition:transform .5s cubic-bezier(.16,1,.3,1),opacity .4s ease}' +
      '#pmh-cookies.on .pmh-c-box{transform:none;opacity:1}' +
      '#pmh-cookies .pmh-c-ico{flex:none;color:#0F62D8;margin-top:2px}' +
      '#pmh-cookies .pmh-c-txt{flex:1 1 320px;min-width:240px;font-size:.95rem;line-height:1.6;color:#52687A}' +
      '#pmh-cookies .pmh-c-txt b{color:#0D3B66;font-weight:800}' +
      '#pmh-cookies .pmh-c-more{display:none;margin-top:8px;font-size:.88rem;color:#5B6F80}' +
      '#pmh-cookies.open .pmh-c-more{display:block}' +
      '#pmh-cookies .pmh-c-act{flex:none;display:flex;align-items:center;gap:10px;' +
      'margin-inline-start:auto;flex-wrap:wrap}' +
      '#pmh-cookies .pmh-c-btn{cursor:pointer;border-radius:999px;padding:10px 26px;font-weight:700;' +
      'font-size:.95rem;font-family:inherit;line-height:1.2;' +
      'transition:transform .2s,box-shadow .2s,background .2s}' +
      '#pmh-cookies .pmh-c-ok{border:1.5px solid transparent;color:#fff;' +
      'background:linear-gradient(135deg,#124D7A,#087B9C)}' +
      '#pmh-cookies .pmh-c-ok:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(13,59,102,.22)}' +
      '#pmh-cookies .pmh-c-no{border:1.5px solid #7FA6C6;color:#0D3B66;background:#fff}' +
      '#pmh-cookies .pmh-c-no:hover{transform:translateY(-1px);background:#F1F7FC;' +
      'box-shadow:0 10px 24px rgba(13,59,102,.12)}' +
      '#pmh-cookies .pmh-c-link{background:none;border:none;cursor:pointer;font-family:inherit;font-size:.9rem;' +
      'font-weight:700;color:#0F62D8;text-decoration:underline;padding:2px 4px;border-radius:6px}' +
      '#pmh-cookies .pmh-c-btn:focus-visible,#pmh-cookies .pmh-c-link:focus-visible{' +
      'outline:3px solid #0F62D8;outline-offset:2px}' +
      '@media(max-width:560px){#pmh-cookies .pmh-c-act{width:100%;margin-top:4px}' +
      '#pmh-cookies .pmh-c-btn{flex:1 1 45%;padding:10px 14px}' +
      '#pmh-cookies .pmh-c-link{flex:1 1 100%;text-align:center;order:3}}' +
      '@media(prefers-reduced-motion:reduce){#pmh-cookies .pmh-c-box{transition:none;transform:none;opacity:1}' +
      '#pmh-cookies .pmh-c-btn:hover{transform:none}}';
    document.head.appendChild(css);
  }

  function close() {
    if (!wrap) return;
    var w = wrap; wrap = null;
    w.classList.remove('on');
    setTimeout(function () { if (w.parentNode) w.remove(); }, 500);
  }

  function build(focusFirst) {
    if (wrap) { // כבר פתוח — רק להחזיר את המיקוד
      if (focusFirst) { var b = wrap.querySelector('.pmh-c-ok'); if (b) b.focus(); }
      return;
    }
    injectCSS();

    wrap = document.createElement('div');
    wrap.id = 'pmh-cookies';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'בחירת הסכמה לשימוש בעוגיות');
    wrap.innerHTML =
      '<div class="pmh-c-box">' +
        '<svg class="pmh-c-ico" width="26" height="26" viewBox="0 0 24 24" fill="none" ' +
          'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M12 2.5a9.5 9.5 0 1 0 9.5 9.5 4 4 0 0 1-5-5 3.6 3.6 0 0 1-4.5-4.5Z"/>' +
          '<circle cx="9" cy="10" r="1"/><circle cx="14" cy="14.5" r="1"/><circle cx="8.5" cy="15.5" r="1"/>' +
        '</svg>' +
        '<div class="pmh-c-txt">' +
          '<b>מדידת שימוש — רק באישורך</b> — האתר יכול למדוד שימוש אנונימי, ' +
          'כדי לדעת אילו תכנים מועילים ולשפר אותם. איננו אוספים מידע מזהה. ' +
          'בלי אישור לא תתבצע מדידה ולא ייטענו עוגיות מדידה.' +
          '<div class="pmh-c-more">באישור נטען Google Analytics, ששומר מזהה ביקור אנונימי ' +
          '(אילו עמודים נצפו וכמה זמן). אין שמירה של שם, טלפון, דוא״ל או כל פרט מזהה אחר, ' +
          'ואין העברת מידע לגורמים מסחריים. ' +
          'בדחייה לא נטען דבר, ונשמרת אצלך רק העובדה שבחרת לדחות — כדי לא לשאול שוב. ' +
          'אפשר לשנות את הבחירה בכל רגע, וכן למחוק את העוגיות דרך הגדרות הדפדפן.</div>' +
        '</div>' +
        '<div class="pmh-c-act">' +
          '<button type="button" class="pmh-c-link">פרטים</button>' +
          '<button type="button" class="pmh-c-btn pmh-c-no">דחייה</button>' +
          '<button type="button" class="pmh-c-btn pmh-c-ok">אישור</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);

    var box = wrap;
    box.querySelector('.pmh-c-link').addEventListener('click', function () {
      var open = box.classList.toggle('open');
      this.textContent = open ? 'סגירת הפרטים' : 'פרטים';
    });
    box.querySelector('.pmh-c-ok').addEventListener('click', function () {
      grant(); close();
    });
    box.querySelector('.pmh-c-no').addEventListener('click', function () {
      deny(); close();
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (box.parentNode) box.classList.add('on');
        if (focusFirst) { var b = box.querySelector('.pmh-c-ok'); if (b) b.focus(); }
      });
    });
  }

  function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // ---------- ממשק ציבורי לשינוי הבחירה בדיעבד ----------
  window.pmhConsent = {
    get: readChoice,
    grant: function () { grant(); close(); },
    deny:  function () { deny();  close(); },
    open:  function () { whenReady(function () { build(true); }); },
    reset: function () {
      clearChoice();
      gtag('consent', 'update', { analytics_storage: 'denied' });
      whenReady(function () { build(true); });
    }
  };

  // כפתור/קישור בעמוד הפרטיות: <button data-pmh-consent-open>הגדרות עוגיות</button>
  document.addEventListener('click', function (ev) {
    var el = ev.target && ev.target.closest && ev.target.closest('[data-pmh-consent-open]');
    if (!el) return;
    ev.preventDefault();
    window.pmhConsent.open();
  });

  // ---------- הפעלה ----------
  var choice = readChoice();
  if (choice === 'granted') {
    gtag('consent', 'update', { analytics_storage: 'granted' });
    loadGA();
  } else if (choice === 'denied') {
    // מכבדים את הדחייה — לא טוענים דבר ולא מציגים את הבאנר שוב
  } else {
    // אין בחירה עדיין (כולל מי שראה רק את ההודעה הישנה "הבנתי") — שואלים.
    // המתנה קצרה — שהבאנר לא יתחרה באנימציות הכניסה של העמוד
    whenReady(function () { setTimeout(function () { build(false); }, 700); });
  }
})();
