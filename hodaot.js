/* =========================================================================
   hodaot.js — משיכת ההודעות מפאנל האדמין והצגתן באתר
   -------------------------------------------------------------------------
   שני שימושים:
     1. עמוד ההודעות המלא — צריך אלמנט #hlist
     2. פס ההודעות בשער "המרחב הפדגוגי" — צריך אלמנט #hstrip
   שניהם אופציונליים; הקובץ לא עושה כלום אם אין אף אחד מהם בעמוד.
   ========================================================================= */
(function () {
  'use strict';

  /* ===== לאחר פריסת "פיד ציבורי" ב-Apps Script — להדביק כאן את הכתובת ===== */
  var FEED_URL = 'https://script.google.com/macros/s/AKfycby8x1GYzIxMjHUsqnAItJ2AAQgCl4rqM16GeE11CJVBIRrf9rLV9iKkNYr-MTJSp2UVYw/exec';

  var list  = document.getElementById('hlist');   // עמוד ההודעות המלא
  var strip = document.getElementById('hstrip');  // פס בשער המרחב הפדגוגי
  var cards = document.getElementById('hcards');  // כרטיס "לוח הודעות" בדף הבית
  var badge = document.getElementById('hbadge');  // מונה על כפתור ההודעות בדף הבית
  if (!list && !strip && !cards && !badge) return;

  var ICON_LINK =
    '<svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  var ICON_FILE =
    '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v3h3"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function fmt(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function state(el, icon, title, text) {
    el.innerHTML =
      '<div class="hstate">' + icon +
      (title ? '<b>' + esc(title) + '</b>' : '') +
      esc(text) + '</div>';
  }

  function cls(type) { return type === 'הדרכה' ? 'guide' : 'important'; }

  /* ---------- עמוד ההודעות המלא ---------- */
  function renderList(items) {
    if (!items.length) {
      state(list,
        '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
        'אין הודעות פעילות כרגע',
        'כשתפורסם הודעה חדשה היא תופיע כאן.');
      return;
    }
    list.innerHTML = items.map(function (it) {
      var c = cls(it.type);
      var links = [];
      if (it.link) links.push('<a href="' + esc(it.link) + '" target="_blank" rel="noopener">' +
        ICON_LINK + 'למעבר</a>');
      if (it.file) links.push('<a href="' + esc(it.file) + '" target="_blank" rel="noopener">' +
        ICON_FILE + 'לקובץ המצורף</a>');

      return '<article class="hitem t-' + c + '">' +
        '<div class="htop">' +
          '<span class="htag tg-' + c + '">' + esc(it.type) + '</span>' +
          '<h3>' + esc(it.title) + '</h3>' +
          '<span class="hdate">' + fmt(it.created) + '</span>' +
        '</div>' +
        (it.body ? '<p>' + esc(it.body) + '</p>' : '') +
        (links.length ? '<div class="hlinks">' + links.join('') + '</div>' : '') +
      '</article>';
    }).join('');
  }

  function wireFilter(items) {
    var pills = [].slice.call(document.querySelectorAll('.hpill'));
    pills.forEach(function (p) {
      p.addEventListener('click', function () {
        pills.forEach(function (x) { x.classList.remove('on'); });
        p.classList.add('on');
        var f = p.dataset.f;
        renderList(f === 'all' ? items : items.filter(function (i) { return i.type === f; }));
      });
    });
  }

  /* ---------- פס קצר בשער ---------- */
  function renderStrip(items) {
    var top = items.slice(0, 3);
    if (!top.length) { strip.innerHTML = ''; return; }
    strip.innerHTML =
      '<div class="striphead"><b>הודעות אחרונות</b>' +
      '<a href="hodaot.html">לכל ההודעות</a></div>' +
      '<div class="stripitems">' +
      top.map(function (it) {
        return '<a class="stripitem t-' + cls(it.type) + '" href="hodaot.html">' +
          '<span class="htag tg-' + cls(it.type) + '">' + esc(it.type) + '</span>' +
          '<b>' + esc(it.title) + '</b>' +
          '<span class="hdate">' + fmt(it.created) + '</span></a>';
      }).join('') + '</div>';
  }

  /* ---------- כרטיס "לוח הודעות" בדף הבית ----------
     משתמש בסגנון .ann שכבר קיים בעמוד, כדי שייראה חלק מהמקטע. */
  function renderCards(items) {
    var top = items.slice(0, 4);
    if (!top.length) {
      cards.innerHTML = '<p style="color:var(--muted);font-size:.88rem;padding:10px 0">' +
        'אין כרגע הודעות פעילות.</p>';
      return;
    }
    cards.innerHTML = top.map(function (it) {
      var d = new Date(it.created);
      var when = isNaN(d) ? '' : d.getDate() + '.' + (d.getMonth() + 1);
      var cl = it.type === 'הדרכה' ? 'gmr' : 'cyn';
      return '<a class="ann" href="hodaot.html">' +
        '<span class="tag ' + cl + '">' + esc(when) + '</span>' +
        '<span><b>' + esc(it.title) + '</b>' +
        (it.body ? '<span class="sub">' + esc(it.body) + '</span>' : '') +
        '</span></a>';
    }).join('');
  }

  /* ---------- טעינה ---------- */
  if (!FEED_URL) {
    var icon = '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>' +
               '<circle cx="12" cy="12" r="4"/></svg>';
    if (list) state(list, icon, 'מערכת ההודעות טרם חוברה',
      'יש להדביק את כתובת פריסת "פיד ציבורי" במשתנה FEED_URL בקובץ hodaot.js.');
    if (strip) strip.innerHTML = '';
    if (cards) cards.innerHTML = '';
    return;
  }

  function show(data) {
    var items = (data && data.items) || [];
    if (list)  { renderList(items); wireFilter(items); }
    if (strip) renderStrip(items);
    if (cards) renderCards(items);
    if (badge && items.length) { badge.textContent = items.length; badge.hidden = false; }
  }

  function fail() {
    var icon = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/>' +
               '<path d="M12 8v4M12 16h.01"/></svg>';
    if (list) state(list, icon, 'לא הצלחנו לטעון את ההודעות',
      'אפשר לרענן את העמוד, או לבדוק שפריסת הפיד ב-Apps Script פעילה.');
    if (strip) strip.innerHTML = '';
    if (cards) cards.innerHTML = '';
  }

  /* אם fetch נחסם (CORS/רשת) — נופלים ל-JSONP, ש-Apps Script תומך בו */
  function viaJsonp() {
    var cb = 'hodaotCB' + Date.now();
    var t  = setTimeout(function () { cleanup(); fail(); }, 12000);
    function cleanup() {
      clearTimeout(t);
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
      if (s.parentNode) s.parentNode.removeChild(s);
    }
    window[cb] = function (data) { cleanup(); show(data); };
    var s = document.createElement('script');
    s.src = FEED_URL + '?mode=feed&callback=' + cb;
    s.onerror = function () { cleanup(); fail(); };
    document.head.appendChild(s);
  }

  fetch(FEED_URL + '?mode=feed', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(show)
    .catch(viaJsonp);
})();
