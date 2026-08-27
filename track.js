/* ===== track.js — נתיב הלימוד (גמר / בגרות) לאורך כל האתר =====
   נטען ב-<head> ללא defer, כדי לקבוע את הנתיב לפני הציור הראשון — בלי הבהוב.
   מקור הנתיב, לפי סדר עדיפות:  ?track=gmr|bgr|all  ←  localStorage  ←  "הכול".
   הסינון עצמו נעשה ב-CSS (style.css) לפי data-tk על <html>, על סמך data-track שעל הבלוקים.
   ערכי data-track אפשריים:  gmr · bgr · both (תמיד מוצג).
   הפעלה בעמוד: מתג עם class="trackpills" שבתוכו .pill עם data-track.
================================================================= */
(function () {
  'use strict';
  var KEY = 'pmh-track';
  var LBL = { all: 'הכול', gmr: 'תעודת גמר', bgr: 'בגרות' };

  function norm(t) { return (t === 'gmr' || t === 'bgr') ? t : 'all'; }
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }

  var fromUrl = null;
  try { fromUrl = new URLSearchParams(location.search).get('track'); } catch (e) {}
  var track = norm(fromUrl || stored());

  /* נקבע מיד — לפני שהדפדפן צייר את הגוף */
  document.documentElement.setAttribute('data-tk', track);
  try { localStorage.setItem(KEY, track); } catch (e) {}

  function set(next, opts) {
    next = norm(next);
    if (next === track && !(opts && opts.force)) return;
    track = next;
    document.documentElement.setAttribute('data-tk', track);
    try { localStorage.setItem(KEY, track); } catch (e) {}
    try {
      var u = new URL(location.href);
      if (track === 'all') u.searchParams.delete('track');
      else u.searchParams.set('track', track);
      history.replaceState(null, '', u);
    } catch (e) {}
    paint();
    document.dispatchEvent(new CustomEvent('pmh:track', { detail: track }));
  }

  /* סימון המתג + נשיאת הנתיב בקישורים פנימיים שסומנו data-keep-track */
  function paint() {
    document.querySelectorAll('.trackpills .pill[data-track]').forEach(function (p) {
      var on = norm(p.getAttribute('data-track')) === track;
      p.classList.toggle('on', on);
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.querySelectorAll('a[data-keep-track]').forEach(function (a) {
      var base = a.getAttribute('data-href') || a.getAttribute('href') || '';
      if (!a.getAttribute('data-href')) a.setAttribute('data-href', base);
      base = a.getAttribute('data-href');
      var hash = '', q = base.indexOf('#');
      if (q > -1) { hash = base.slice(q); base = base.slice(0, q); }
      a.setAttribute('href', track === 'all' ? base + hash
        : base + (base.indexOf('?') > -1 ? '&' : '?') + 'track=' + track + hash);
    });
  }

  function wire() {
    document.querySelectorAll('.trackpills .pill[data-track]').forEach(function (p) {
      if (p.__tk || p.tagName === 'A') return; p.__tk = 1;
      p.setAttribute('role', 'button');
      p.setAttribute('tabindex', '0');
      p.addEventListener('click', function () { set(p.getAttribute('data-track')); });
      p.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.click(); }
      });
    });
    document.querySelectorAll('.trackbar').forEach(function (b) {
      requestAnimationFrame(function () { b.classList.add('ready'); });
    });
    paint();
  }

  window.PMH_TRACK = {
    get: function () { return track; },
    set: set,
    label: function (t) { return LBL[norm(t || track)]; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
