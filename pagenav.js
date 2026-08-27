/* ===== pagenav.js — תפריט התמצאות אוטומטי לעמודים ארוכים =====
   בונה לבד, מתוך כותרות העמוד:
   1) פס ניווט דביק מתחת לתפריט הראשי — כרטיסייה לכל מדור, עם סימון המדור הנוכחי בגלילה.
   2) רשת כרטיסיות "מה יש בעמוד" בראש התוכן, כולל תתי־הנושאים של כל מדור.
   אין צורך לערוך את העמוד: מספיק לטעון את pagenav.css ואת הקובץ הזה.
   כיבוי: <body data-pn="off"> · בלי כרטיסיות: <body data-pn-cards="off">
   מינימום מדורים להצגה: 4 (או data-pn-min="3").
================================================================= */
(function () {
  'use strict';
  if (window.__pagenavLoaded) return;
  window.__pagenavLoaded = true;

  var SKIP = '.nav,.drawer,.govbar,.foot,.hero,.toc,.pn,.pn-cards,.sub,dialog,template,[data-pn-skip]';
  var NS = 'http://www.w3.org/2000/svg';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* טקסט נקי מכותרת — בלי תגיות "בקרוב", מונים והערות צד */
  function clean(el) {
    var c = el.cloneNode(true);
    c.querySelectorAll('.tag,.tag-soon,.soon,small,sup,button,.n,.c').forEach(function (x) { x.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }

  function icon(kind) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', kind === 'up' ? 'M8 13V3M3.5 7.5 8 3l4.5 4.5' : 'M10 3.5 5.5 8l4.5 4.5');
    svg.appendChild(p);
    return svg;
  }

  function pad(i) { return (i + 1 < 10 ? '0' : '') + (i + 1); }

  /* ---------- איסוף המדורים ---------- */
  function fromExistingToc() {
    var links = document.querySelectorAll('.toc a[href^="#"]');
    if (links.length < 3) return null;
    var out = [];
    links.forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      var el = id && document.getElementById(id);
      if (!el) return;
      var t = a.querySelector('.lt');
      out.push({ el: el, id: id, title: clean(t || a), subs: [] });
    });
    return out.length >= 3 ? out : null;
  }

  function fromHeadings() {
    var all = [].slice.call(document.querySelectorAll('h2,h3,h4'));
    all = all.filter(function (h) { return !h.closest(SKIP) && clean(h); });

    var marked = all.filter(function (h) { return h.classList.contains('sub-sec'); });
    var heads = marked.length >= 3 ? marked : all.filter(function (h) { return h.tagName === 'H2'; });
    if (heads.length < 3) return null;

    var isHead = heads.indexOf.bind(heads);
    var minis = all.filter(function (h) {
      return isHead(h) < 0 && (h.classList.contains('mini') || (!marked.length && h.tagName === 'H3'));
    });

    var out = heads.map(function (h, i) {
      if (!h.id) h.id = 'sec-' + (i + 1);
      return { el: h, id: h.id, title: clean(h), subs: [] };
    });

    /* שיוך תתי־נושאים למדור שמעליהם, לפי סדר העמוד */
    var cur = null;
    all.forEach(function (h) {
      var idx = isHead(h);
      if (idx > -1) { cur = out[idx]; return; }
      if (minis.indexOf(h) < 0) return;
      if (cur && cur.subs.length < 5) cur.subs.push(clean(h));
    });
    return out;
  }

  /* ---------- בניית הפס הדביק ---------- */
  function buildBar(items) {
    var bar = document.createElement('nav');
    bar.className = 'pn';
    bar.id = 'pagenav';
    bar.setAttribute('aria-label', 'ניווט בתוך העמוד');

    var inner = document.createElement('div');
    inner.className = 'pn-in';

    var lbl = document.createElement('span');
    lbl.className = 'pn-lbl';
    lbl.textContent = 'בעמוד';

    var tabs = document.createElement('div');
    tabs.className = 'pn-tabs';
    items.forEach(function (it, i) {
      var a = document.createElement('a');
      a.className = 'pn-tab';
      a.href = '#' + encodeURIComponent(it.id);
      var n = document.createElement('span');
      n.className = 'n';
      n.textContent = pad(i);
      a.appendChild(n);
      a.appendChild(document.createTextNode(it.title));
      tabs.appendChild(a);
      it.tab = a;
    });

    var up = document.createElement('button');
    up.className = 'pn-up';
    up.type = 'button';
    up.title = 'חזרה לראש העמוד';
    up.setAttribute('aria-label', 'חזרה לראש העמוד');
    up.appendChild(icon('up'));
    up.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    inner.appendChild(lbl);
    inner.appendChild(tabs);
    inner.appendChild(up);
    bar.appendChild(inner);
    bar.__tabs = tabs;
    return bar;
  }

  /* ---------- בניית כרטיסיות המדורים ---------- */
  function buildCards(items) {
    var wrap = document.createElement('section');
    wrap.className = 'pn-cards';
    wrap.setAttribute('aria-label', 'מה יש בעמוד');

    var head = document.createElement('div');
    head.className = 'pn-cards-head';
    var h = document.createElement('h2');
    h.textContent = 'מה יש בעמוד';
    var hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = items.length + ' מדורים · לחיצה קופצת ישירות למדור';
    head.appendChild(h);
    head.appendChild(hint);

    var grid = document.createElement('div');
    grid.className = 'pn-grid';
    items.forEach(function (it, i) {
      var a = document.createElement('a');
      a.className = 'pn-card';
      a.href = '#' + encodeURIComponent(it.id);

      var n = document.createElement('span');
      n.className = 'pn-n';
      n.textContent = pad(i);

      var t = document.createElement('h3');
      t.textContent = it.title;

      a.appendChild(n);
      a.appendChild(t);

      if (it.subs.length) {
        var ul = document.createElement('ul');
        it.subs.forEach(function (s) {
          var li = document.createElement('li');
          li.textContent = s;
          ul.appendChild(li);
        });
        a.appendChild(ul);
      }

      var go = document.createElement('span');
      go.className = 'pn-go';
      go.appendChild(document.createTextNode('למדור'));
      go.appendChild(icon('go'));
      a.appendChild(go);

      grid.appendChild(a);
    });

    wrap.appendChild(head);
    wrap.appendChild(grid);
    return wrap;
  }

  /* ---------- מיקום, קיזוז גלילה וסימון המדור הנוכחי ---------- */
  function install(bar, cards, items, firstHead) {
    var mainNav = document.querySelector('.nav');
    var hero = document.querySelector('.hero');

    if (hero && hero.parentNode) hero.parentNode.insertBefore(bar, hero.nextSibling);
    else if (mainNav && mainNav.parentNode) mainNav.parentNode.insertBefore(bar, mainNav.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);

    if (cards && firstHead && firstHead.parentNode) {
      firstHead.parentNode.insertBefore(cards, firstHead);
    }

    function sizes() {
      var navH = mainNav ? Math.round(mainNav.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty('--pn-nav', navH + 'px');
      var barH = Math.round(bar.getBoundingClientRect().height);
      document.documentElement.style.scrollPaddingTop = (navH + barH + 14) + 'px';
      return navH + barH;
    }

    var offset = sizes();
    addEventListener('resize', function () { offset = sizes(); }, { passive: true });

    var ticking = false, active = -1;
    function spy() {
      ticking = false;
      var line = offset + 26, cur = 0;
      for (var i = 0; i < items.length; i++) {
        if (items[i].el.getBoundingClientRect().top <= line) cur = i; else break;
      }
      if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) cur = items.length - 1;
      if (cur === active) return;
      if (active > -1) {
        items[active].tab.classList.remove('on');
        items[active].tab.removeAttribute('aria-current');
      }
      active = cur;
      var tab = items[cur].tab;
      tab.classList.add('on');
      tab.setAttribute('aria-current', 'true');
      /* גלילת הפס כך שהכרטיסייה הפעילה תמיד נראית */
      var box = bar.__tabs, r = tab.getBoundingClientRect(), br = box.getBoundingClientRect();
      if (r.right > br.right - 8 || r.left < br.left + 8) {
        box.scrollLeft += (r.left + r.width / 2) - (br.left + br.width / 2);
      }
    }
    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(spy); }
    }, { passive: true });
    setTimeout(function () { offset = sizes(); spy(); }, 60);
    addEventListener('load', function () { offset = sizes(); spy(); });
  }

  ready(function () {
    var body = document.body;
    if (body.dataset.pn === 'off') return;

    var existing = fromExistingToc();
    var items = existing || fromHeadings();
    if (!items) return;

    var min = parseInt(body.dataset.pnMin, 10) || 4;
    if (items.length < min) return;

    var wantCards = !existing && body.dataset.pnCards !== 'off';
    var bar = buildBar(items);
    var cards = wantCards ? buildCards(items) : null;
    install(bar, cards, items, items[0].el);
  });
})();
