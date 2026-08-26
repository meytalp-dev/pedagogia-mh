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
