/* ===== pagenav.js — תפריט התמצאות אוטומטי לעמודים ארוכים =====
   בונה לבד, מתוך כותרות העמוד:
   1) פס ניווט דביק מתחת לתפריט הראשי — כרטיסייה לכל מדור, עם סימון המדור הנוכחי בגלילה.
   2) תפריט צד נפתח (המבורגר) לעמודים עמוסים — כל המדורים ותתי־הנושאים כרשימה היררכית.
   3) רשת כרטיסיות "מה יש בעמוד" בראש התוכן — כבויה כברירת מחדל (opt-in בלבד).
   אין צורך לערוך את העמוד: מספיק לטעון את pagenav.css ואת הקובץ הזה.
   כיבוי הכול: <body data-pn="off"> · הדלקת הכרטיסיות: <body data-pn-cards="on">
   מינימום מדורים להצגת הפס: 4 (או data-pn-min="3").

   תפריט הצד נדלק לבד בעמוד עמוס, בשני מסלולים:
   8 מדורים ראשיים ומעלה, או 12 שורות תוכן־עניינים ומעלה (מדורים + תתי־נושאים יחד) —
   כך גם עמוד שער עם מעט מדורים ראשיים והרבה תתי־נושאים מקבל מפה מלאה.
   עקיפה ידנית: <body data-pn-drawer="on"> / <body data-pn-drawer="off">
   שינוי הסף: <body data-pn-drawer-min="6">
================================================================= */
(function () {
  'use strict';
  if (window.__pagenavLoaded) return;
  window.__pagenavLoaded = true;

  var SKIP = '.nav,.drawer,.govbar,.foot,.hero,.toc,.pn,.pn-cards,.pnd,.sub,dialog,template,[data-pn-skip]';
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

  /* אייקוני קו — SVG ב-currentColor, בלי אימוג'ים */
  var PATHS = {
    up:   ['M8 13V3M3.5 7.5 8 3l4.5 4.5'],
    go:   ['M10 3.5 5.5 8l4.5 4.5'],
    menu: ['M2.5 4h11', 'M2.5 8h11', 'M2.5 12h11'],
    x:    ['M4 4l8 8', 'M12 4l-8 8'],
    out:  ['M5.5 10.5 10.5 5.5', 'M6 5.5h4.5V10'],
    back: ['M6 3.5 10.5 8 6 12.5']
  };

  function icon(kind) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    (PATHS[kind] || PATHS.go).forEach(function (d) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    });
    return svg;
  }

  function pad(i) { return (i + 1 < 10 ? '0' : '') + (i + 1); }

  /* המיכל שבו נכון להשתיל את הכרטיסיות: מטפסים מהכותרת עד לבלוק העליון בזרימת התוכן */
  var HOLDERS = '.article,.wrap,main,article,body,.body-sec';
  function anchorFor(el) {
    var n = el, guard = 0;
    while (n.parentElement && n.parentElement !== document.body &&
           !n.parentElement.matches(HOLDERS) && guard++ < 8) n = n.parentElement;
    return n;
  }

  /* הבלוק העליון שבו יושבת הכותרת הראשית — הפס נכנס מיד אחריו */
  function bodyBlock(el) {
    /* מאז שנוסף <main id="main"> לכל העמודים (נגישות, WCAG 2.4.1) העצירה
       חייבת להיות גם עליו — אחרת הטיפוס מגיע ל-<main> עצמו והפס הדביק
       נדחף אחרי סגירתו, כלומר לתחתית המסמך. */
    function isStop(p) { return p === document.body || p.tagName === 'MAIN'; }
    var n = el, guard = 0;
    while (n && n.parentElement && !isStop(n.parentElement) && guard++ < 12) n = n.parentElement;
    return n && n.parentElement && isStop(n.parentElement) ? n : null;
  }

  /* מדור מוצג בפועל? (עמודים עם סינון מסלולים מסתירים בלוקים שלמים) */
  function shown(el) {
    return !!(el.offsetParent || el.getClientRects().length);
  }

  /* יעד הקישור של תת־נושא: אם הכותרת יושבת בתוך קישור לעמוד אחר — כמו בעמוד שער
     שכל שורה בו מפנה לעמוד משלה — הולכים לשם. אחרת עוגן בתוך העמוד. */
  function subTarget(h, fallbackId) {
    var a = h.closest('a[href]');
    var href = a && a.getAttribute('href');
    if (href && href.charAt(0) !== '#' && !/^javascript:/i.test(href)) {
      return { href: href, out: true, el: h };
    }
    if (href && href.length > 1 && href.charAt(0) === '#') {
      var t = document.getElementById(decodeURIComponent(href.slice(1)));
      return { href: href, out: false, el: t || h };
    }
    if (!h.id) h.id = fallbackId;
    return { href: '#' + encodeURIComponent(h.id), out: false, el: h };
  }

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
    var cur = null, seq = 0;
    all.forEach(function (h) {
      var idx = isHead(h);
      if (idx > -1) { cur = out[idx]; return; }
      if (minis.indexOf(h) < 0) return;
      if (!cur || cur.subs.length >= 12) return;
      var t = subTarget(h, 'sub-' + (++seq));
      t.title = clean(h);
      cur.subs.push(t);
    });
    return out;
  }


  /* ---------- מדורים שהם עמודים נפרדים ----------
     בעמוד עמוס עדיף שכל מדור יהיה עמוד משלו. מגדירים בעמוד רשימה מוסתרת:
       <nav data-pn-links hidden><a href="takziv-101.html">קליטת עולים</a>…</nav>
     וכל קישור הופך לכרטיסייה בפס — שפותחת עמוד, לא קופצת בתוך העמוד.        */
  function fromPageLinks() {
    var host = document.querySelector('[data-pn-links]');
    if (!host) return null;
    var links = [].slice.call(host.querySelectorAll('a[href]'));
    if (links.length < 2) return null;
    return links.map(function (a, i) {
      return {
        el: null, id: 'pl-' + i, href: a.getAttribute('href'),
        title: clean(a), subs: [], ext: /^https?:/i.test(a.getAttribute('href'))
      };
    });
  }

  /* ---------- שבב "חזרה" ----------
     <body data-back="procedures.html|נהלים"> — ואם אין, נגזר מפירורי הלחם.  */
  function backInfo() {
    var d = (document.body.dataset.back || '').trim();
    if (d) {
      var parts = d.split('|');
      return { href: parts[0].trim(), label: (parts[1] || '').trim() || 'חזרה' };
    }
    var crumbs = document.querySelectorAll('.crumb a[href], .breadcrumb a[href]');
    if (crumbs.length) {
      var last = crumbs[crumbs.length - 1];
      return { href: last.getAttribute('href'), label: clean(last) };
    }
    return null;
  }

  function buildBack(info) {
    var a = document.createElement('a');
    a.className = 'pn-back';
    a.href = info.href;
    a.appendChild(icon('back'));
    var t = document.createElement('span');
    t.textContent = 'חזרה ל' + info.label;
    a.appendChild(t);
    a.title = 'חזרה ל' + info.label;
    return a;
  }

  /* פס מינימלי — לעמוד שאין בו מספיק מדורים לפס מלא, אבל כן צריך כפתור חזרה */
  function buildBackOnlyBar(info) {
    var bar = document.createElement('nav');
    bar.className = 'pn pn-backonly';
    bar.id = 'pagenav';
    bar.setAttribute('aria-label', 'ניווט');
    var inner = document.createElement('div');
    inner.className = 'pn-in';
    inner.appendChild(buildBack(info));
    var up = document.createElement('button');
    up.className = 'pn-up'; up.type = 'button';
    up.title = 'חזרה לראש העמוד';
    up.setAttribute('aria-label', 'חזרה לראש העמוד');
    up.appendChild(icon('up'));
    up.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    inner.appendChild(up);
    bar.appendChild(inner);
    bar.__in = inner; bar.__tabs = document.createElement('div');
    return bar;
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
      if (it.href) { a.href = it.href; a.classList.add('is-page'); }
      else a.href = '#' + encodeURIComponent(it.id);
      var n = document.createElement('span');
      n.className = 'n';
      n.textContent = pad(i);
      var t = document.createElement('span');
      t.className = 't';
      t.textContent = it.title;
      a.title = it.title;
      a.appendChild(n);
      a.appendChild(t);
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
    bar.__in = inner;
    return bar;
  }

  /* ---------- בניית תפריט הצד (המבורגר) ----------
     חי לצד הפס הדביק, לא במקומו: הכפתור נכנס בראש הפס, החלונית עצמה על ה-body. */
  function buildDrawer(items) {
    var subCount = 0;
    items.forEach(function (it) { subCount += it.subs.length; });

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pnd-btn';
    btn.id = 'pn-drawer-btn';
    btn.setAttribute('aria-controls', 'pn-drawer');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'פתיחת תפריט מדורי העמוד');
    btn.appendChild(icon('menu'));
    var btnT = document.createElement('span');
    btnT.className = 'pnd-btn-t';
    btnT.textContent = 'מדורים';
    btn.appendChild(btnT);

    var scrim = document.createElement('div');
    scrim.className = 'pnd-scrim';

    var panel = document.createElement('aside');
    panel.className = 'pnd';
    panel.id = 'pn-drawer';
    panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'pn-drawer-ttl');

    var head = document.createElement('div');
    head.className = 'pnd-head';
    var ttlBox = document.createElement('div');
    var ttl = document.createElement('strong');
    ttl.id = 'pn-drawer-ttl';
    ttl.textContent = 'מדורי העמוד';
    var cnt = document.createElement('span');
    cnt.className = 'pnd-count';
    cnt.textContent = items.length + ' מדורים' + (subCount ? ' · ' + subCount + ' תתי־נושאים' : '');
    ttlBox.appendChild(ttl);
    ttlBox.appendChild(cnt);
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'pnd-x';
    x.setAttribute('aria-label', 'סגירת תפריט מדורי העמוד');
    x.appendChild(icon('x'));
    head.appendChild(ttlBox);
    head.appendChild(x);

    var body = document.createElement('nav');
    body.className = 'pnd-body';
    body.setAttribute('aria-label', 'מדורי העמוד');
    var list = document.createElement('ol');
    list.className = 'pnd-list';

    var flatSubs = [];
    items.forEach(function (it, i) {
      var li = document.createElement('li');
      li.className = 'pnd-item';

      var a = document.createElement('a');
      a.className = 'pnd-sec';
      a.href = '#' + encodeURIComponent(it.id);
      var n = document.createElement('span');
      n.className = 'n';
      n.textContent = pad(i);
      var t = document.createElement('span');
      t.className = 't';
      t.textContent = it.title;
      a.appendChild(n);
      a.appendChild(t);
      li.appendChild(a);
      it.dsec = a;
      it.dli = li;

      if (it.subs.length) {
        var ul = document.createElement('ul');
        ul.className = 'pnd-subs';
        it.subs.forEach(function (s) {
          var sli = document.createElement('li');
          var sa = document.createElement('a');
          sa.className = 'pnd-sub' + (s.out ? ' out' : '');
          sa.href = s.href;
          sa.appendChild(document.createTextNode(s.title));
          if (s.out) sa.appendChild(icon('out'));
          sli.appendChild(sa);
          ul.appendChild(sli);
          s.link = sa;
          if (!s.out && s.el) flatSubs.push(s);
        });
        li.appendChild(ul);
      }
      list.appendChild(li);
    });
    body.appendChild(list);

    panel.appendChild(head);
    panel.appendChild(body);

    /* --- פתיחה, סגירה ומלכודת פוקוס --- */
    function isOpen() { return document.body.classList.contains('pnd-open'); }
    function focusables() {
      return [].slice.call(panel.querySelectorAll('a[href],button:not([disabled])'))
        .filter(function (el) { return el.offsetParent || el.getClientRects().length; });
    }
    function scrollActiveIntoView() {
      var on = list.querySelector('.pnd-sec.on');
      if (!on || !isOpen()) return;
      var r = on.getBoundingClientRect(), br = body.getBoundingClientRect();
      if (r.top < br.top + 8 || r.bottom > br.bottom - 8) {
        body.scrollTop += (r.top - br.top) - body.clientHeight / 3;
      }
    }
    function open() {
      if (isOpen()) return;
      document.body.classList.add('pnd-open');
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'סגירת תפריט מדורי העמוד');
      panel.focus();
      scrollActiveIntoView();
    }
    /* הפוקוס חוזר לכפתור שפתח — חוץ מלחיצה על קישור, ששם הדף ממילא קופץ ליעד */
    function close(restore) {
      if (!isOpen()) return;
      document.body.classList.remove('pnd-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'פתיחת תפריט מדורי העמוד');
      if (restore !== false) btn.focus();
    }

    btn.addEventListener('click', function () { isOpen() ? close() : open(); });
    x.addEventListener('click', function () { close(); });
    scrim.addEventListener('click', function () { close(); });

    /* לחיצה על קישור סוגרת — הניווט עצמו ממשיך כרגיל */
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a[href]')) close(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { e.preventDefault(); close(); }
    });

    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey && (a === first || a === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    });

    /* הפוקוס לא בורח מהתפריט הפתוח — כפתור ההמבורגר עצמו מותר, הוא המתג */
    document.addEventListener('focusin', function (e) {
      if (isOpen() && e.target !== btn && !panel.contains(e.target)) panel.focus();
    });

    return {
      btn: btn, panel: panel, scrim: scrim, subs: flatSubs, close: close,
      mark: function (i) {
        items.forEach(function (it, k) {
          if (!it.dsec) return;
          it.dsec.classList.toggle('on', k === i);
          if (k === i) it.dsec.setAttribute('aria-current', 'true');
          else it.dsec.removeAttribute('aria-current');
        });
        scrollActiveIntoView();
      },
      markSub: function (s) {
        flatSubs.forEach(function (o) {
          o.link.classList.toggle('on', o === s);
          if (o === s) o.link.setAttribute('aria-current', 'true');
          else o.link.removeAttribute('aria-current');
        });
      }
    };
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
        it.subs.slice(0, 5).forEach(function (s) {
          var li = document.createElement('li');
          li.textContent = s.title;
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
      it.card = a;
    });

    wrap.appendChild(head);
    wrap.appendChild(grid);
    return wrap;
  }

  /* ---------- מיקום, קיזוז גלילה וסימון המדור הנוכחי ---------- */
  function install(bar, cards, drawer, items, firstHead) {
    var mainNav = document.querySelector('.nav');
    var hero = document.querySelector('.hero');

    var h1 = document.querySelector('h1');
    var after = hero || (h1 ? bodyBlock(h1) : null) || mainNav;
    if (after && after.parentNode) after.parentNode.insertBefore(bar, after.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);

    /* כפתור ההמבורגר חי בתוך הפס הדביק (ראשון = הימני ב-RTL);
       החלונית והרקע יושבים על ה-body כדי שלא ייחתכו בגלילת הפס. */
    if (bar.__back) bar.__in.insertBefore(bar.__back, bar.__in.firstChild);

    if (drawer) {
      bar.__in.insertBefore(drawer.btn, bar.__in.firstChild);
      document.body.appendChild(drawer.scrim);
      document.body.appendChild(drawer.panel);
    }

    if (cards) {
      var at = anchorFor(firstHead);
      if (at && at.parentNode) {
        at.parentNode.insertBefore(cards, at);
        /* מחוץ לעמוד־מסמך אין מיכל עם שוליים — נותנים לכרטיסיות רוחב ושוליים משלהן */
        if (!cards.closest('.article')) cards.classList.add('pn-wide');
      }
    }

    function sizes() {
      var navH = mainNav ? Math.round(mainNav.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty('--pn-nav', navH + 'px');
      var barH = Math.round(bar.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--pn-bar', barH + 'px');
      return navH + barH;
    }

    var offset = sizes();
    addEventListener('resize', function () { offset = sizes(); }, { passive: true });

    /* התאמה לסינון מסלולים בעמודי תחומי הדעת: מדור שהוסתר — גם הכרטיסייה שלו מוסתרת */
    function sync() {
      items.forEach(function (it) {
        var vis = shown(it.el);
        it.hidden = !vis;
        it.tab.classList.toggle('pn-off', !vis);
        if (it.card) it.card.classList.toggle('pn-off', !vis);
        if (it.dli) it.dli.classList.toggle('pn-off', !vis);
      });
    }
    sync();
    document.addEventListener('click', function () { setTimeout(function () { sync(); spy(); }, 30); }, true);

    /* דעיכה בקצוות רק כשבאמת יש עוד כרטיסיות מעבר לקצה */
    var box = bar.__tabs;
    function fades() {
      var sl = Math.abs(box.scrollLeft), max = box.scrollWidth - box.clientWidth;
      box.style.setProperty('--f-s', sl > 4 ? '22px' : '0px');
      box.style.setProperty('--f-e', sl < max - 4 ? '22px' : '0px');
    }
    box.addEventListener('scroll', fades, { passive: true });
    addEventListener('resize', fades, { passive: true });
    fades();

    var ticking = false, active = -1, activeSub = null;
    /* sync() אינו נקרא כאן: נראות המדורים משתנה רק בלחיצה, ומאזין הלחיצה
       למעלה כבר מפעיל אותו. קריאתו בכל פריים של גלילה גרמה 30–40 חישובי
       פריסה כפויים בעמודים הכבדים. */
    function spy() {
      ticking = false;
      var line = offset + 26, cur = -1;
      for (var i = 0; i < items.length; i++) {
        if (items[i].hidden) continue;
        if (items[i].el.getBoundingClientRect().top <= line) cur = i;
        else if (cur > -1) break;
      }
      if (cur < 0) { for (var j = 0; j < items.length; j++) { if (!items[j].hidden) { cur = j; break; } } }
      if (cur < 0) return;
      if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) {
        for (var k = items.length - 1; k >= 0; k--) { if (!items[k].hidden) { cur = k; break; } }
      }
      /* סימון תת־הנושא הנוכחי בתפריט הצד — רק לתתי־נושאים שהם עוגן בתוך העמוד */
      if (drawer && drawer.subs.length) {
        var s = null;
        for (var m = 0; m < drawer.subs.length; m++) {
          var o = drawer.subs[m];
          if (!o.el.getClientRects().length) continue;
          if (o.el.getBoundingClientRect().top <= line) s = o;
          else if (s) break;
        }
        if (s !== activeSub) { activeSub = s; drawer.markSub(s); }
      }

      if (cur === active) return;
      if (active > -1) {
        items[active].tab.classList.remove('on');
        items[active].tab.removeAttribute('aria-current');
      }
      active = cur;
      var tab = items[cur].tab;
      tab.classList.add('on');
      tab.setAttribute('aria-current', 'true');
      if (drawer) drawer.mark(cur);
      /* גלילת הפס כך שהכרטיסייה הפעילה תמיד נראית */
      var r = tab.getBoundingClientRect(), br = box.getBoundingClientRect();
      if (r.right > br.right - 8 || r.left < br.left + 8) {
        box.scrollLeft += (r.left + r.width / 2) - (br.left + br.width / 2);
      }
      fades();
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
    if (document.querySelector('.ptabs')) return;  /* לעמוד כבר יש מערכת כרטיסיות משלו */

    var back = backInfo();
    var pageLinks = fromPageLinks();
    var existing = pageLinks ? null : fromExistingToc();
    var items = pageLinks || existing || fromHeadings();

    /* אין מספיק מדורים לפס מלא — אבל אם זה עמוד־בן, עדיין מגיע לו כפתור חזרה */
    if (!items) {
      if (back) install(buildBackOnlyBar(back), null, null, [], null);
      return;
    }

    /* עמוד ״ארוך״: גובה של יותר מפעמיים וחצי מסך. שם די בשלושה מדורים כדי שתפריט יעזור. */
    var long = document.documentElement.scrollHeight > innerHeight * 2.5;
    var min = parseInt(body.dataset.pnMin, 10) || (long ? 3 : 4);
    if (!pageLinks && items.length < min) {
      if (back) install(buildBackOnlyBar(back), null, null, [], null);
      return;
    }

    /* רשת הכרטיסיות ״מה יש בעמוד״ כבויה כברירת מחדל (החלטת מיטל, 28.8.26).
       להחזרה בעמוד בודד: <body data-pn-cards="on"> — ואז יש להחזיר גם את כללי
       ה־CSS של .pn-cards/.pn-grid/.pn-card שהוסרו מ־pagenav.css (זמינים בהיסטוריית git). */
    var wantCards = body.dataset.pnCards === 'on' && !existing;

    /* עמוד ״עמוס״: הפס האופקי כבר לא מספיק והמשתמש צריך מפה מלאה של העמוד.
       שני מסלולים — הרבה מדורים ראשיים, או תוכן־עניינים ארוך גם כשהמדורים
       הראשיים מעטים (עמוד שער כמו chevrati.html: 5 מדורים ו־16 תתי־נושאים). */
    var subCount = 0;
    items.forEach(function (it) { subCount += it.subs.length; });
    var dmin = parseInt(body.dataset.pnDrawerMin, 10) || 8;
    var busy = items.length >= dmin || (items.length + subCount) >= dmin + 4;
    var pref = body.dataset.pnDrawer;
    var wantDrawer = pref === 'on' || (pref !== 'off' && busy);

    var bar = buildBar(items);
    if (back) bar.__back = buildBack(back);

    /* במצב "כל מדור הוא עמוד" אין מה לעקוב אחריו בגלילה — רק כרטיסיות שמנווטות */
    if (pageLinks) {
      var here = location.pathname.split('/').pop();
      items.forEach(function (it) {
        if (it.href && it.href.split('#')[0].split('/').pop() === here) {
          it.tab.classList.add('on');
          it.tab.setAttribute('aria-current', 'page');
        }
      });
      install(bar, null, null, [], null);
      return;
    }

    var drawer = wantDrawer ? buildDrawer(items) : null;
    var cards = wantCards ? buildCards(items) : null;
    install(bar, cards, drawer, items, items[0].el);
  });
})();
