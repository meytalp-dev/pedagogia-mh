/* מדור בני ובנות השירות — לוגיקה משותפת לארבעת הדפים.
   הדפים יושבים בתיקייה sherut/ עם <base href="/"> כדי שהתפריט, הפוטר והחיפוש
   של האתר יעבדו כמו בשורש. לכן קישורי # בתוך העמוד מטופלים כאן (אחרת היו
   מובילים ל-/#...). כל תוכן מהשרת נכתב כטקסט (textContent) — לא כ-HTML. */
(function () {
  'use strict';

  var TOPICS = ['הפסקה פעילה', 'חג ומועד', 'טקס', 'היכרות וגיבוש', 'מוגנות ושייכות', 'שיח ערכי', 'יצירה', 'אחר'];
  var SCHOOLS = ['אורט אורמת', 'אורט בית הערבה', 'אורט תל נוף', 'אורט תעשייה אווירית', 'אנרג\'י טק', 'בית אל', 'בית דוד',
    'דן גורמה', 'דרור גליל', 'הדר', 'התיכון החברתי חיפה', 'חוש"ן', 'מצפה רמון', 'עמל אשדוד', 'עמל טק אין', 'עתיד באר שבע',
    'עתיד בת עמי', 'עתיד כרמיאל', 'עתיד פלמחים', 'צור ברק', 'צור ים', 'קמ"ג דימונה', 'רימונים', 'רמת דוד', 'תיכון החממה',
    'תיכון חברתי ת"א', 'עתיד זוקו', 'תיכון שיח', 'תפן ליזמות'];
  var DUR = [
    { k: '15', t: 'עד 15 דק׳', ok: function (m) { return m <= 15; } },
    { k: '30', t: 'עד 30 דק׳', ok: function (m) { return m <= 30; } },
    { k: '45', t: 'עד 45 דק׳', ok: function (m) { return m <= 45; } },
    { k: 'more', t: 'יותר מ-45 דק׳', ok: function (m) { return m > 45; } }
  ];

  /* ---------- כתובת השרת: config.js, או ?api= לבדיקות ---------- */
  function apiUrl() {
    var q = '';
    try { q = new URLSearchParams(location.search).get('api') || ''; } catch (e) {}
    /* עקיפה רק לשרתים מוכרים — שקישור מזויף לא ישלח פעילויות לשרת זר */
    if (q && /^(https:\/\/script\.google\.com\/|https:\/\/api\.pedagogiamh\.co\.il\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$))/.test(q)) return q;
    return (window.SHERUT_API || '').trim();
  }
  function getCards(api) {
    var u = api + (api.indexOf('?') > -1 ? '&' : '?') + 'mode=cards';
    return fetch(u, { credentials: 'omit' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !Array.isArray(d.cards)) throw new Error((d && d.err) || 'bad');
        return d.cards;
      });
  }

  /* ---------- עזרים ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function str(v) { return v == null ? '' : String(v).trim(); }
  function mins(v) { var n = parseInt(str(v), 10); return isNaN(n) ? null : n; }
  var ICONS = {
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 19a5.4 5.4 0 0 0-2.4-4.5"/>',
    school: '<path d="M3 10l9-5 9 5-9 5z"/><path d="M7 12.2V17c1.4 1.3 3.1 2 5 2s3.6-.7 5-2v-4.8"/>',
    print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>'
  };
  function icon(name, cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', 'sh-ic' + (cls ? ' ' + cls : ''));
    s.innerHTML = ICONS[name];
    return s;
  }

  /* ---------- קישורי # בעמוד (בגלל <base href="/">) ---------- */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    var t = id && document.getElementById(id);
    if (!t) return;
    t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
    try { history.replaceState(null, '', location.pathname + location.search + '#' + id); } catch (er) {}
  });

  var page = document.body.getAttribute('data-sherut');

  /* ================= בית: מספר הפעילויות במאגר ================= */
  if (page === 'home') {
    var box = $('#sh-count');
    var api = apiUrl();
    if (!api) {
      box.textContent = 'המאגר ייפתח אחרי הכנס';
      box.hidden = false;
    } else {
      getCards(api).then(function (cards) {
        box.textContent = '';
        box.appendChild(icon('box'));
        if (cards.length) {
          box.appendChild(el('b', '', String(cards.length)));
          box.appendChild(document.createTextNode(cards.length === 1 ? ' פעילות במאגר' : ' פעילויות במאגר'));
        } else {
          box.appendChild(document.createTextNode('המאגר נפתח — הפעילויות הראשונות בדרך'));
        }
        box.hidden = false;
      }).catch(function () { box.hidden = true; });
    }
  }

  /* ================= מאגר הפעילויות ================= */
  if (page === 'maagar') {
    var listEl = $('#sh-list'), resEl = $('#sh-res'), tools = $('#sh-tools'), emptyEl = $('#sh-empty');
    var state = { q: '', topic: '', dur: '' };
    var all = [];

    function showEmpty(title, text) {
      tools.hidden = true;
      listEl.textContent = '';
      emptyEl.textContent = '';
      emptyEl.appendChild(icon('box'));
      emptyEl.appendChild(el('b', '', title));
      if (text) emptyEl.appendChild(el('span', '', text));
      emptyEl.hidden = false;
    }

    function chipRow(wrap, items, key) {
      items.forEach(function (it) {
        var b = el('button', 'sh-chip', it.t);
        b.type = 'button';
        b.setAttribute('aria-pressed', state[key] === it.k ? 'true' : 'false');
        b.addEventListener('click', function () {
          state[key] = it.k;
          [].forEach.call(wrap.children, function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
          render();
        });
        wrap.appendChild(b);
      });
    }

    function section(body, title, text) {
      if (!text) return;
      body.appendChild(el('h4', '', title));
      body.appendChild(el('p', '', text));
    }

    function cardEl(c, i) {
      var art = el('article', 'sh-card');
      var head = el('div', 'sh-chead');
      if (str(c.topic)) head.appendChild(el('span', 'sh-tag', str(c.topic)));
      head.appendChild(el('h3', '', str(c.title) || 'פעילות'));
      var meta = el('div', 'sh-meta');
      var m = mins(c.duration);
      if (m != null || str(c.duration)) {
        var s1 = el('span'); s1.appendChild(icon('clock'));
        s1.appendChild(document.createTextNode(m != null ? m + ' דקות' : str(c.duration)));
        meta.appendChild(s1);
      }
      if (str(c.ages)) { var s2 = el('span'); s2.appendChild(icon('users')); s2.appendChild(document.createTextNode(str(c.ages))); meta.appendChild(s2); }
      if (str(c.school)) { var s3 = el('span'); s3.appendChild(icon('school')); s3.appendChild(document.createTextNode(str(c.school))); meta.appendChild(s3); }
      head.appendChild(meta);

      var body = el('div', 'sh-cbody');
      body.id = 'sh-c-' + i;
      body.hidden = true;
      section(body, 'חומרים', str(c.materials));
      var steps = str(c.steps).split(/\r?\n/).map(function (s) { return s.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim(); }).filter(Boolean);
      if (steps.length) {
        body.appendChild(el('h4', '', 'שלבי הפעילות'));
        var ol = el('ol');
        steps.forEach(function (s) { ol.appendChild(el('li', '', s)); });
        body.appendChild(ol);
      }
      if (str(c.tip)) {
        var tip = el('div', 'sh-tip');
        section(tip, 'טיפ', str(c.tip));
        body.appendChild(tip);
      }
      var by = [str(c.school), str(c.authors)].filter(Boolean).join(' · ');
      if (by) body.appendChild(el('p', 'sh-by', 'נכתב על ידי: ' + by));

      var act = el('div', 'sh-cact');
      var tg = el('button', 'sh-btn'); tg.type = 'button';
      tg.setAttribute('aria-expanded', 'false'); tg.setAttribute('aria-controls', body.id);
      tg.appendChild(icon('chev')); tg.appendChild(document.createTextNode('לפעילות המלאה'));
      tg.addEventListener('click', function () {
        var open = body.hidden;
        body.hidden = !open;
        art.classList.toggle('open', open);
        tg.setAttribute('aria-expanded', open ? 'true' : 'false');
        tg.lastChild.textContent = open ? 'סגירה' : 'לפעילות המלאה';
      });
      var pr = el('button', 'sh-btn'); pr.type = 'button';
      pr.appendChild(icon('print')); pr.appendChild(document.createTextNode('הדפסה'));
      pr.addEventListener('click', function () {
        [].forEach.call(document.querySelectorAll('.sh-card.print-me'), function (x) { x.classList.remove('print-me'); });
        art.classList.add('print-me');
        document.body.classList.add('sh-print-one');
        window.print();
      });
      act.appendChild(tg); act.appendChild(pr);
      head.appendChild(act);
      art.appendChild(head);
      art.appendChild(body);
      return art;
    }

    window.addEventListener('afterprint', function () {
      document.body.classList.remove('sh-print-one');
      [].forEach.call(document.querySelectorAll('.sh-card.print-me'), function (x) { x.classList.remove('print-me'); });
    });

    function hay(c) {
      return ['title', 'topic', 'ages', 'materials', 'steps', 'tip', 'school', 'authors'].map(function (k) { return str(c[k]); }).join(' ').toLowerCase();
    }

    function render() {
      var q = state.q.trim().toLowerCase();
      var d = DUR.filter(function (x) { return x.k === state.dur; })[0];
      var shown = all.filter(function (c) {
        if (state.topic && str(c.topic) !== state.topic) return false;
        if (d) { var m = mins(c.duration); if (m == null || !d.ok(m)) return false; }
        if (q && hay(c).indexOf(q) < 0) return false;
        return true;
      });
      listEl.textContent = '';
      shown.forEach(function (c, i) { listEl.appendChild(cardEl(c, i)); });
      resEl.textContent = shown.length
        ? (shown.length === all.length ? all.length + ' פעילויות' : shown.length + ' מתוך ' + all.length + ' פעילויות')
        : 'לא נמצאו פעילויות. אפשר לנקות את החיפוש או לבחור "הכול".';
    }

    var api2 = apiUrl();
    if (!api2) {
      showEmpty('המאגר ייפתח אחרי הכנס', 'כאן יופיעו הפעילויות שבני ובנות השירות העלו, אחרי אישור.');
    } else {
      resEl.textContent = 'טוען פעילויות…';
      getCards(api2).then(function (cards) {
        all = cards.filter(function (c) { return c && str(c.title); });
        all.sort(function (a, b) { return str(b.ts).localeCompare(str(a.ts)); });
        if (!all.length) { showEmpty('עוד אין פעילויות במאגר', 'הפעילויות שיועלו יופיעו כאן אחרי אישור.'); return; }
        chipRow($('#sh-ftopic'), [{ k: '', t: 'הכול' }].concat(TOPICS.map(function (t) { return { k: t, t: t }; })), 'topic');
        chipRow($('#sh-fdur'), [{ k: '', t: 'הכול' }].concat(DUR), 'dur');
        $('#sh-q').addEventListener('input', function () { state.q = this.value; render(); });
        tools.hidden = false;
        render();
      }).catch(function () {
        showEmpty('לא הצלחנו לטעון את המאגר', 'כדאי לנסות שוב בעוד כמה דקות.');
        resEl.textContent = '';
      });
    }
  }

  /* ================= העלאת פעילות ================= */
  if (page === 'haalaa') {
    var form = $('#sh-form');
    var topicSel = $('#f-topic'), schoolSel = $('#f-school'), otherWrap = $('#f-school-other-wrap'), other = $('#f-school-other');
    TOPICS.forEach(function (t) { var o = el('option', '', t); o.value = t; topicSel.appendChild(o); });
    SCHOOLS.concat(['אחר']).forEach(function (t) { var o = el('option', '', t); o.value = t; schoolSel.appendChild(o); });
    schoolSel.addEventListener('change', function () {
      otherWrap.hidden = schoolSel.value !== 'אחר';
      if (!otherWrap.hidden) other.focus();
    });

    var api3 = apiUrl();
    var sendBtn = $('#sh-send');
    if (!api3) {
      $('#sh-closed').hidden = false;
      sendBtn.disabled = true;
    }

    var RULES = [
      ['f-title', function (v) { return v.length < 3 ? 'כתבו שם לפעילות (לפחות 3 תווים).' : ''; }],
      ['f-topic', function (v) { return !v ? 'בחרו נושא.' : ''; }],
      ['f-ages', function (v) { return !v ? 'כתבו לאילו גילאים או שכבות הפעילות מתאימה.' : ''; }],
      ['f-duration', function (v) {
        if (!v) return 'כתבו כמה דקות נמשכת הפעילות.';
        if (!/^\d{1,3}$/.test(v) || +v < 1 || +v > 240) return 'כתבו מספר דקות בין 1 ל-240.';
        return '';
      }],
      ['f-steps', function (v) {
        var n = v.split(/\r?\n/).filter(function (s) { return s.trim(); }).length;
        return !n ? 'כתבו את שלבי הפעילות — שורה לכל שלב.' : '';
      }],
      ['f-school', function (v) { return !v ? 'בחרו בית ספר.' : ''; }],
      ['f-school-other', function (v) { return schoolSel.value === 'אחר' && !v ? 'כתבו את שם בית הספר.' : ''; }],
      ['f-authors', function (v) { return !v ? 'כתבו את השמות הפרטיים של כותבי הפעילות.' : ''; }]
    ];
    function check(id) {
      var inp = document.getElementById(id);
      var rule = RULES.filter(function (r) { return r[0] === id; })[0];
      var msg = rule ? rule[1](str(inp.value)) : '';
      var fld = inp.closest('.sh-fld');
      var err = fld.querySelector('.sh-err[data-for="' + id + '"]') || fld.querySelector('.sh-err');
      fld.classList.toggle('bad', !!msg);
      err.textContent = msg;
      if (msg) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
      return !msg;
    }
    RULES.forEach(function (r) {
      var inp = document.getElementById(r[0]);
      inp.addEventListener('blur', function () { if (inp.closest('.sh-fld').classList.contains('bad')) check(r[0]); });
      inp.addEventListener('input', function () { if (inp.closest('.sh-fld').classList.contains('bad')) check(r[0]); });
    });

    var okBox = $('#sh-ok'), errBox = $('#sh-fail');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      okBox.hidden = true; errBox.hidden = true;
      var first = null;
      RULES.forEach(function (r) { if (!check(r[0]) && !first) first = document.getElementById(r[0]); });
      if (first) { first.focus(); return; }
      if (!api3) return;
      var school = schoolSel.value === 'אחר' ? str(other.value) : schoolSel.value;
      var body = {
        a: 'card',
        title: str($('#f-title').value), topic: topicSel.value, ages: str($('#f-ages').value),
        duration: str($('#f-duration').value), materials: str($('#f-materials').value),
        steps: $('#f-steps').value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean).join('\n'),
        tip: str($('#f-tip').value), school: school, authors: str($('#f-authors').value)
      };
      sendBtn.disabled = true;
      sendBtn.lastChild.textContent = 'שולח…';
      fetch(api3, {
        method: 'POST', credentials: 'omit',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.err) || 'bad');
        form.reset();
        otherWrap.hidden = true;
        okBox.hidden = false;
        okBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }).catch(function () {
        errBox.hidden = false;
      }).then(function () {
        sendBtn.disabled = false;
        sendBtn.lastChild.textContent = 'שליחת הפעילות';
      });
    });
  }

  /* ================= חומרים: הדפסת התבנית ================= */
  if (page === 'chomarim') {
    var pb = $('#sh-print-tpl');
    if (pb) pb.addEventListener('click', function () { window.print(); });
  }
})();
