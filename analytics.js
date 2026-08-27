/* מדידת טראפיק — Google Analytics 4
   קובץ מרכזי אחד לכל האתר. לשינוי המזהה — לשנות כאן בלבד. */
(function () {
  var GA_ID = 'G-FYEE26HSRP';
  if (!GA_ID || GA_ID.indexOf('REPLACE') > -1) return;

  // לא למדוד תצוגה מקומית (file:// או localhost) — רק את האתר החי
  var h = location.hostname;
  if (!h || h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:') return;

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);

  /* מדידת זמן שהייה אמיתי: GA4 לבדו לא סופר את הדף האחרון בביקור.
     שולחים את משך השהייה בדף בעת יציאה — כך "זמן ממוצע בדף" מדויק. */
  var t0 = Date.now(), sent = false;
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
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendEngagement();
  });
  window.addEventListener('pagehide', sendEngagement);

})();

/* ===== הודעת עוגיות =====
   באנר תחתון חד-פעמי: מסביר שהאתר משתמש בעוגיות למדידת שימוש אנונימית.
   רץ בנפרד מ-GA (גם בתצוגה מקומית), מזריק את העיצוב בעצמו — כך שהוא עובד
   בכל עמוד שטוען את הקובץ הזה, גם עמודים ללא style.css. */
(function cookieNotice () {
  var KEY = 'pmh-cookies-ok';

  function seen () {
    try { if (localStorage.getItem(KEY)) return true; } catch (e) {}
    return document.cookie.indexOf(KEY + '=1') > -1;
  }
  function remember () {
    try { localStorage.setItem(KEY, new Date().toISOString().slice(0, 10)); } catch (e) {}
    // גיבוי לדפדפנים שחוסמים localStorage — עוגייה לשנה
    document.cookie = KEY + '=1; path=/; max-age=31536000; samesite=lax';
  }
  if (seen()) return;

  function build () {
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
      '#pmh-cookies .pmh-c-ico{flex:none;color:#1677FF;margin-top:2px}' +
      '#pmh-cookies .pmh-c-txt{flex:1 1 320px;min-width:240px;font-size:.95rem;line-height:1.6;color:#52687A}' +
      '#pmh-cookies .pmh-c-txt b{color:#0D3B66;font-weight:800}' +
      '#pmh-cookies .pmh-c-more{display:none;margin-top:8px;font-size:.88rem;color:#60778A}' +
      '#pmh-cookies.open .pmh-c-more{display:block}' +
      '#pmh-cookies .pmh-c-act{flex:none;display:flex;align-items:center;gap:14px;margin-inline-start:auto}' +
      '#pmh-cookies .pmh-c-ok{border:none;cursor:pointer;border-radius:999px;padding:10px 26px;font-weight:700;' +
      'font-size:.95rem;font-family:inherit;color:#fff;background:linear-gradient(135deg,#124D7A,#087B9C);' +
      'transition:transform .2s,box-shadow .2s}' +
      '#pmh-cookies .pmh-c-ok:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(13,59,102,.22)}' +
      '#pmh-cookies .pmh-c-link{background:none;border:none;cursor:pointer;font-family:inherit;font-size:.9rem;' +
      'font-weight:700;color:#1677FF;text-decoration:underline;padding:0}' +
      '@media(max-width:560px){#pmh-cookies .pmh-c-act{width:100%;margin-top:4px}' +
      '#pmh-cookies .pmh-c-ok{flex:1}}' +
      '@media(prefers-reduced-motion:reduce){#pmh-cookies .pmh-c-box{transition:none;transform:none;opacity:1}}';
    document.head.appendChild(css);

    var wrap = document.createElement('div');
    wrap.id = 'pmh-cookies';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'הודעה על שימוש בעוגיות');
    wrap.innerHTML =
      '<div class="pmh-c-box">' +
        '<svg class="pmh-c-ico" width="26" height="26" viewBox="0 0 24 24" fill="none" ' +
          'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M12 2.5a9.5 9.5 0 1 0 9.5 9.5 4 4 0 0 1-5-5 3.6 3.6 0 0 1-4.5-4.5Z"/>' +
          '<circle cx="9" cy="10" r="1"/><circle cx="14" cy="14.5" r="1"/><circle cx="8.5" cy="15.5" r="1"/>' +
        '</svg>' +
        '<div class="pmh-c-txt">' +
          '<b>האתר משתמש בעוגיות</b> — לתפעול תקין של הדפים ולמדידת שימוש אנונימית, ' +
          'כדי לדעת אילו תכנים מועילים ולשפר אותם. איננו אוספים מידע מזהה.' +
          '<div class="pmh-c-more">העוגיות שומרות מזהה ביקור אנונימי של Google Analytics ' +
          '(אילו עמודים נצפו וכמה זמן), ואת העובדה שההודעה הזו נסגרה. ' +
          'אין שמירה של שם, טלפון, דוא״ל או כל פרט מזהה אחר, ואין העברת מידע לגורמים מסחריים. ' +
          'ניתן למחוק את העוגיות בכל רגע דרך הגדרות הדפדפן.</div>' +
        '</div>' +
        '<div class="pmh-c-act">' +
          '<button type="button" class="pmh-c-link">פרטים</button>' +
          '<button type="button" class="pmh-c-ok">הבנתי</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);

    wrap.querySelector('.pmh-c-link').addEventListener('click', function () {
      var open = wrap.classList.toggle('open');
      this.textContent = open ? 'סגירת הפרטים' : 'פרטים';
    });
    wrap.querySelector('.pmh-c-ok').addEventListener('click', function () {
      remember();
      wrap.classList.remove('on');
      setTimeout(function () { wrap.remove(); }, 500);
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { wrap.classList.add('on'); });
    });
  }

  // המתנה קצרה — שהבאנר לא יתחרה באנימציות הכניסה של העמוד
  function start () { setTimeout(build, 700); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
