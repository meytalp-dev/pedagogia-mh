/* ===== toolbelt.js — ארגז הכלים של העמוד =====
   שני עוזרים שנבנים לבד מתוך תוכן העמוד, בלי HTML ידני בשום דף:

   א. חזרה לתוכן העניינים — אם בעמוד יש בלוק .toc, כל מדור (h2/h3/h4 עם class="sub-sec")
      מקבל בסופו קישור דיסקרטי "לתוכן העניינים". אין .toc — לא קורה כלום.

   ב. הדפסה ושמירה כ-PDF לטבלה — כל טבלה בתוך div.tbl-scroll (וכל table.doc שאינה בתוכו)
      מקבלת מעליה שורת כלים. הלחיצה פותחת חלון הדפסה נקי שמכיל את הטבלה בלבד:
      כותרת, שורת מקור עם שם העמוד וה-URL, והטבלה. השמירה כ-PDF נעשית ביעד
      "שמירה כ-PDF" בדיאלוג ההדפסה של הדפדפן — אין כאן הורדה אוטומטית.

   כיבוי: <body data-tb="off"> · <body data-tb-toc="off"> · <body data-tb-print="off">
   טבלה בודדת בלי כפתורים: class="no-print-tools" · טבלה קצרה מ-4 שורות לא מקבלת כפתורים.

   הקובץ רץ אחרי pagenav.js (DOMContentLoaded + setTimeout 0) ואינו נוגע ב-DOM של
   הטבלאות או הכותרות עצמן — רק מוסיף אחים לפניהן/אחריהן.
   נדרש גם toolbelt.css.
================================================================================ */
(function () {
  'use strict';
  if (window.__toolbeltLoaded) return;
  window.__toolbeltLoaded = true;

  var SKIP = '.nav,.drawer,.govbar,.foot,.hero,.pn,.pnd,.pn-cards,dialog,template,[data-tb-skip]';
  var NS = 'http://www.w3.org/2000/svg';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* טקסט נקי מכותרת — בלי תגיות "בקרוב", מונים והערות צד */
  function clean(el) {
    if (!el) return '';
    var c = el.cloneNode(true);
    c.querySelectorAll('.tag,.tag-soon,.soon,small,sup,button,.n,.ghost').forEach(function (x) { x.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }

  /* ---------- אייקוני קו — SVG ב-currentColor, בלי אימוג'ים ---------- */
  var PATHS = {
    up:    ['M12 19V5', 'M5 12l7-7 7 7'],
    print: ['M6 9V2h12v7',
            'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2',
            'M6 14h12v8H6z'],
    pdf:   ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']
  };

  function icon(kind) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.9');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    (PATHS[kind] || PATHS.up).forEach(function (d) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    });
    return svg;
  }

  /* =========================================================================
     א. חזרה לתוכן העניינים
     ========================================================================= */

  /* היכן מסתיים המדור: מיד לפני הכותרת הבאה (גם אם היא עטופה בבלוק אחר),
     או בסוף המיכל של הכותרת אם זו האחרונה. */
  function endOfSection(head, next) {
    if (!next) return { parent: head.parentElement, before: null };
    var n = next;
    while (n.parentElement && !n.parentElement.contains(head)) n = n.parentElement;
    if (n.parentElement && n.parentElement.contains(head)) return { parent: n.parentElement, before: n };
    return { parent: head.parentElement, before: null };
  }

  function backLink(href) {
    var box = document.createElement('div');
    box.className = 'tb-back';
    var a = document.createElement('a');
    a.className = 'tb-back-a';
    a.href = href;
    a.appendChild(icon('up'));
    a.appendChild(document.createTextNode('לתוכן העניינים'));
    box.appendChild(a);
    return box;
  }

  function buildBackToToc() {
    var toc = document.querySelector('.toc');
    if (!toc) return 0;                       /* אין תוכן עניינים — אין תופעות לוואי */
    if (!toc.id) toc.id = 'toc';
    toc.classList.add('tb-toc-target');       /* כדי שהפס הדביק לא יכסה אותו בקפיצה */
    var href = '#' + encodeURIComponent(toc.id);

    var heads = [].slice.call(document.querySelectorAll('h2.sub-sec,h3.sub-sec,h4.sub-sec'))
      .filter(function (h) { return !h.closest(SKIP) && !h.closest('.toc'); });
    if (heads.length < 2) return 0;

    var n = 0;
    heads.forEach(function (h, i) {
      var at = endOfSection(h, heads[i + 1] || null);
      if (!at.parent) return;
      /* לא מכפילים קישור אם כבר יש אחד באותו מקום */
      var prev = at.before ? at.before.previousElementSibling : at.parent.lastElementChild;
      if (prev && prev.classList && prev.classList.contains('tb-back')) return;
      var box = backLink(href);
      if (at.before) at.parent.insertBefore(box, at.before);
      else at.parent.appendChild(box);
      n++;
    });
    return n;
  }

  /* =========================================================================
     ב. הדפסה ושמירה כ-PDF לטבלה בודדת
     ========================================================================= */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* הכותרת של הטבלה: ה-caption שלה, ואם אין — ה-h2/h3 הקרוב מעליה */
  function titleFor(table, host) {
    var cap = table.querySelector(':scope > caption') || table.querySelector('caption');
    var t = clean(cap);
    if (t) return t;
    var n = host || table;
    while (n && n !== document.body) {
      var p = n.previousElementSibling;
      while (p) {
        if (/^H[1-6]$/.test(p.tagName)) { t = clean(p); if (t) return t; }
        var inner = p.querySelectorAll ? p.querySelectorAll('h2,h3,h4') : [];
        if (inner.length) { t = clean(inner[inner.length - 1]); if (t) return t; }
        p = p.previousElementSibling;
      }
      n = n.parentElement;
    }
    return clean(document.querySelector('h1')) || document.title || 'טבלה';
  }

  /* שם העמוד לשורת המקור — בלי סיומת שם האתר */
  function pageName() {
    var t = (document.title || '').split('·')[0].trim();
    return t || clean(document.querySelector('h1')) || location.pathname;
  }

  /* טבלה רחבה מודפסת לרוחב הדף */
  function isWide(table) {
    var cols = 0;
    [].slice.call(table.rows || []).forEach(function (r) {
      var c = 0;
      [].slice.call(r.cells || []).forEach(function (cell) { c += cell.colSpan || 1; });
      if (c > cols) cols = c;
    });
    var w = table.scrollWidth || 0;
    return cols >= 6 || w > 900;
  }

  function printCss(landscape) {
    return [
      '@page{size:A4 ' + (landscape ? 'landscape' : 'portrait') + ';margin:12mm}',
      'html,body{margin:0;padding:0}',
      'body{font-family:"Assistant","Noto Sans Hebrew","Segoe UI",Arial,sans-serif;',
      '  direction:rtl;text-align:right;color:#111;background:#fff;',
      '  font-size:11pt;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
      'h1{font-size:15pt;font-weight:800;color:#0D3B66;margin:0}',
      'h1::after{content:"";display:block;width:46px;height:2.5pt;background:#27C6F3;margin-top:5pt}',
      '.tb-src{font-size:8pt;color:#5A6B7A;margin:7pt 0 11pt;word-break:break-word}',
      '.tb-src span{white-space:nowrap}',
      'table{width:100%;border-collapse:collapse;font-size:9.5pt}',
      'caption{caption-side:top;text-align:right;font-weight:800;padding:0 0 6pt}',
      'th,td{border:.6pt solid #93A6B6;padding:4.5pt 6pt;text-align:right;vertical-align:top}',
      'thead th{background:#E7EFF7;color:#0D3B66;font-weight:700}',
      'thead{display:table-header-group}',
      'tfoot{display:table-footer-group}',
      'tr{page-break-inside:avoid;break-inside:avoid}',
      'td.k{background:#F2F7FC;font-weight:700;color:#0D3B66}',
      'ul,ol{margin:0;padding-inline-start:14pt}',
      'li{margin:1pt 0}',
      'a{color:inherit;text-decoration:none}',
      'img,svg{max-width:100%}',
      '@media screen{body{padding:22px;background:#fff}}'
    ].join('\n');
  }

  function buildDoc(table, host) {
    var ttl = titleFor(table, host);
    var clone = table.cloneNode(true);
    clone.querySelectorAll('caption,script,style,button,.tb-tools,.tb-back,.no-print')
      .forEach(function (x) { x.remove(); });
    clone.removeAttribute('id');

    return '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(ttl) + '</title><style>' + printCss(isWide(table)) + '</style></head><body>' +
      '<h1>' + esc(ttl) + '</h1>' +
      '<p class="tb-src"><span>' + esc(pageName()) + '</span> · ' + esc(location.href) + '</p>' +
      clone.outerHTML +
      '</body></html>';
  }

  var frame = null;
  function dropFrame() {
    if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
    frame = null;
  }

  function printTable(table, host) {
    var html;
    try { html = buildDoc(table, host); }
    catch (e) { return; }

    dropFrame();
    var f = document.createElement('iframe');
    f.className = 'tb-frame';
    f.setAttribute('aria-hidden', 'true');
    f.setAttribute('tabindex', '-1');
    f.title = 'תצוגת הדפסה';
    document.body.appendChild(f);
    frame = f;

    var win = f.contentWindow;
    if (!win) { dropFrame(); openFallback(html); return; }

    try {
      var d = win.document;
      d.open();
      d.write(html);
      d.close();
    } catch (e) { dropFrame(); openFallback(html); return; }

    var fired = false;
    function go() {
      if (fired) return;
      fired = true;
      try {
        win.focus();
        try { win.addEventListener('afterprint', function () { setTimeout(dropFrame, 400); }); } catch (e) {}
        win.print();
      } catch (e) {
        dropFrame();
        openFallback(html);
        return;
      }
      /* בדפדפנים שבהם print() חוסם — הדיאלוג כבר נסגר; אחרת afterprint יטפל */
      setTimeout(function () { if (frame === f) dropFrame(); }, 90000);
    }

    if (win.document.readyState === 'complete') setTimeout(go, 60);
    else { f.onload = function () { setTimeout(go, 60); }; setTimeout(go, 800); }
  }

  /* גיבוי לדפדפן שחוסם הדפסה מתוך iframe */
  function openFallback(html) {
    var w = window.open('', '_blank');
    if (!w) return;
    try {
      w.document.open();
      w.document.write(html);
      w.document.close();
      setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 250);
    } catch (e) {}
  }

  function toolsBar(table, host) {
    var ttl = titleFor(table, host);

    var bar = document.createElement('div');
    bar.className = 'tb-tools';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'כלים לטבלה: ' + ttl);

    function btn(kind, label, title) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tb-btn';
      b.title = title;
      b.setAttribute('aria-label', label + ' — ' + ttl);
      b.appendChild(icon(kind));
      var t = document.createElement('span');
      t.textContent = label;
      b.appendChild(t);
      b.addEventListener('click', function () { printTable(table, host); });
      return b;
    }

    bar.appendChild(btn('print', 'הדפסה',
      'הדפסת הטבלה הזו בלבד, בעמוד נקי עם כותרת ושורת מקור'));
    bar.appendChild(btn('pdf', 'שמירה כ-PDF',
      'נפתח חלון ההדפסה של הדפדפן — יש לבחור ביעד "שמירה כ-PDF" (Save as PDF)'));

    var note = document.createElement('span');
    note.className = 'tb-note';
    note.textContent = 'בחלון ההדפסה יש לבחור יעד: שמירה כ-PDF';
    bar.appendChild(note);

    return bar;
  }

  function buildTableTools() {
    var list = [];
    function add(t) {
      if (!t || list.indexOf(t) > -1) return;
      if (t.closest(SKIP)) return;
      if (t.classList.contains('no-print-tools') || t.closest('.no-print-tools')) return;
      if (t.querySelectorAll('tr').length < 4) return;   /* טבלה זעירה — לא מציפים */
      list.push(t);
    }
    document.querySelectorAll('div.tbl-scroll table').forEach(add);
    document.querySelectorAll('table.doc').forEach(add);

    var n = 0;
    list.forEach(function (t) {
      var host = t.closest('.tbl-scroll') || t;
      if (!host.parentNode) return;
      var prev = host.previousElementSibling;
      if (prev && prev.classList && prev.classList.contains('tb-tools')) return;
      host.parentNode.insertBefore(toolsBar(t, host), host);
      n++;
    });
    return n;
  }

  /* =========================================================================
     הפעלה — אחרי pagenav.js, כדי שלא נתנגש על אותן כותרות
     ========================================================================= */
  ready(function () {
    setTimeout(function () {
      var body = document.body;
      if (!body || body.dataset.tb === 'off') return;
      var backs = body.dataset.tbToc === 'off' ? 0 : buildBackToToc();
      var tools = body.dataset.tbPrint === 'off' ? 0 : buildTableTools();
      window.__toolbelt = { backs: backs, tools: tools };
    }, 0);
  });
})();
