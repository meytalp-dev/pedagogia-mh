/* ניתוב לשרתי Apps Script (22.11.26).
   ברשת משרד העבודה script.google.com חסום, ומפקחים רואים "אין חיבור לשרת".
   בטעינה בודקים פעם אחת אם גוגל נגיש מהרשת הזאת (קריאת doGet של מעגל, בלי כתיבה).
   נגיש → פונים ישר לגוגל, כמו קודם. חסום → דרך api.pedagogiamh.co.il (merhav-api ב-Vercel).
   התוצאה נשמרת ל-12 שעות בדפדפן. אחרי תקלת רשת קוראים ל-ApiRoute.failed(), והבקשה הבאה בודקת מחדש.
   שימוש: ApiRoute.url(API).then(function (u) { return fetch(u, ...); })  */
(function () {
  var PROXY = 'https://api.pedagogiamh.co.il/s/';
  var CANARY = 'https://script.google.com/macros/s/AKfycbw0P5NiD_OVrY_1Gn6mFpnkLncRBRz-nMud8bXUzB8hXfea9mUApCSSn5eWV5gc1kVW/exec';
  var KEY = 'apiRoute', TTL = 12 * 36e5, WAIT = 6000;
  var forced = (/[?&]route=(proxy|direct)\b/.exec(location.search) || [])[1] || '';
  var mode = '', probe = null;

  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && (o.m === 'direct' || o.m === 'proxy') && Date.now() - o.t < TTL) return o.m;
    } catch (e) {}
    return '';
  }
  function save(m) { try { localStorage.setItem(KEY, JSON.stringify({ m: m, t: Date.now() })); } catch (e) {} }

  function check() {
    return new Promise(function (done) {
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); done(false); }, WAIT);
      fetch(CANARY, { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (j) { clearTimeout(timer); done(!!(j && j.ok)); })
        .catch(function () { clearTimeout(timer); done(false); });
    });
  }

  function decide() {
    if (forced) return Promise.resolve(forced);
    if (mode) return Promise.resolve(mode);
    if (!probe) probe = check().then(function (ok) { mode = ok ? 'direct' : 'proxy'; save(mode); probe = null; return mode; });
    return probe;
  }

  function url(direct) {
    var m = /^https:\/\/script\.google\.com\/macros\/s\/([A-Za-z0-9_-]+)\/exec(.*)$/.exec(String(direct));
    if (!m) return Promise.resolve(direct);
    return decide().then(function (md) { return md === 'proxy' ? PROXY + m[1] + m[2] : direct; });
  }

  mode = load();
  if (!mode && !forced) decide();

  window.ApiRoute = {
    url: url,
    failed: function () { mode = ''; try { localStorage.removeItem(KEY); } catch (e) {} },
    mode: function () { return forced || mode; }
  };
})();
