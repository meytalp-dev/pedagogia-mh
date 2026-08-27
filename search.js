/* =========================================================
   חיפוש באתר — מנוע + חלון חיפוש מהיר (ספוטלייט)
   נטען בכל עמוד. האינדקס (search-index.json) נמשך בפעם
   הראשונה שפותחים את החיפוש — לא בטעינת העמוד.

   שימוש מבחוץ (chipus.html):
     SiteSearch.ready().then(ix => ...)
     SiteSearch.query('אוגדן שעות', {cat:'menahalim', kind:'page'})
     SiteSearch.open('מילה')   // פותח את חלון החיפוש המהיר
   ========================================================= */
(function () {
  "use strict";

  var INDEX_URL = "/search-index.json";
  var KINDS = [
    { id: "page", label: "עמודים" },
    { id: "drive", label: "דרייב" },
    { id: "pdf", label: "מסמכים" },
    { id: "link", label: "קישורים" },
  ];

  /* ---------- נרמול עברית ----------
     מוריד ניקוד, מאחד גרשיים (״ ' " ׳), מקף עברי ופיסוק —
     כדי ש"תשפ״ז" ו"תשפז", או "קב״ס" ו"קבס", יימצאו זה את זה. */
  var NIKUD = /[֑-ׇ]/g;
  function norm(s) {
    return (s || "")
      .toString()
      .replace(NIKUD, "")
      .replace(/[״”“"׳’‘'`]/g, "")
      .replace(/[־‐-―–—_]/g, " ")
      .replace(/[.,;:!?()[\]{}<>|\\/·•‹›»«]/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();
  }

  /* כתיב מלא/חסר — צמדים שנכתבים באתר בצורה אחת ומחפשים בצורה אחרת */
  var SPELL_PAIRS = [
    ["תכנית", "תוכנית"], ["תכניות", "תוכניות"], ["תכנון", "תיכנון"],
    ["ועדה", "וועדה"], ["ועדות", "וועדות"],
    ["יעוץ", "ייעוץ"], ["יעוצי", "ייעוצי"], ["יעוצית", "ייעוצית"],
    ["יועץ", "יועצת"], ["חנוך", "חינוך"], ["מקצעי", "מקצועי"],
    ["סילבוס", "סילאבוס"], ["שאלון", "שאלונים"],
  ];
  var SPELL = {};
  SPELL_PAIRS.forEach(function (p) {
    (SPELL[p[0]] = SPELL[p[0]] || []).push(p[1]);
    (SPELL[p[1]] = SPELL[p[1]] || []).push(p[0]);
  });

  /* צורות חלופיות לאסימון: בלי אותיות השימוש (ב, ל, ה, ו, מ, ש, כ, כש, מה…),
     בלי סיומת ריבוי, ובכתיב החלופי — כדי ש"תכנית" ימצא "תוכניות עבודה". */
  var PREFIX = /^(ומ|וב|ול|וה|וכ|כש|מה|לה|בה|שה|[בלהומשכ])/;
  var SUFFIX = /(יות|יים|ים|ות)$/;
  function variants(tok) {
    var out = [tok];
    function add(t) { if (t.length >= 2 && out.indexOf(t) < 0) out.push(t); }

    var m = tok.match(PREFIX);
    var bare = m && tok.length - m[1].length >= 3 ? tok.slice(m[1].length) : null;
    if (bare) add(bare);

    [tok, bare].forEach(function (t) {
      if (!t) return;
      (SPELL[t] || []).forEach(add);
      var s = t.match(SUFFIX);
      if (s && t.length - s[1].length >= 3) {
        var stem = t.slice(0, t.length - s[1].length);
        add(stem);
        (SPELL[stem] || []).forEach(add);
      }
    });
    /* יחיד↔רבים של מילים בסיומת ־ית: "תוכנית" → "תוכני" שנמצא גם ב"תוכניות" */
    out.slice().forEach(function (t) {
      if (t.length >= 5 && t.slice(-2) === "ית") add(t.slice(0, -1));
    });
    return out;
  }

  /* ---------- טעינת האינדקס ---------- */
  var indexPromise = null;
  function ready() {
    if (!indexPromise) {
      indexPromise = fetch(INDEX_URL, { cache: "no-cache" })
        .then(function (r) {
          if (!r.ok) throw new Error("index " + r.status);
          return r.json();
        })
        .then(function (ix) {
          ix.catLabel = {};
          (ix.cats || []).forEach(function (c) { ix.catLabel[c.id] = c.label; });
          ix.pages.forEach(function (p) {
            p.kind = "page";
            p.url = "/" + p.f;
            p._t = norm(p.t);
            p._d = norm(p.d + " " + (p.k || ""));
            p._s = norm((p.s || []).map(function (x) { return x.t; }).join(" "));
            p._x = norm(p.x);
          });
          var titleOf = {};
          ix.pages.forEach(function (p) { titleOf[p.f] = p.t; });
          ix.resources.forEach(function (r) {
            r.kind = r.k === "doc" ? "pdf" : r.k;   // Word/PPT נספרים עם המסמכים
            r.url = r.u;
            /* "מופיע ב…" — שמות העמודים שמקשרים למשאב, לא שמות הקבצים */
            r.from = (r.p || []).map(function (f) { return titleOf[f] || f; });
            r._t = norm(r.t);
            r._d = norm(r.from.join(" "));
          });
          return ix;
        })
        .catch(function (e) {
          indexPromise = null;
          throw e;
        });
    }
    return indexPromise;
  }

  /* ---------- ניקוד התאמה ---------- */
  function scoreField(hay, toks, weight) {
    var s = 0;
    for (var i = 0; i < toks.length; i++) {
      var vs = variants(toks[i]);
      var hit = 0;
      for (var v = 0; v < vs.length; v++) {
        var at = hay.indexOf(vs[v]);
        if (at < 0) continue;
        hit = weight;
        /* בונוס להתאמה בתחילת מילה — "בגרות" עדיף על "מבוגרות" */
        if (at === 0 || hay[at - 1] === " ") hit += weight * 0.4;
        break;
      }
      if (!hit) return -1; // אסימון שלא נמצא בשדה כלל
      s += hit;
    }
    return s;
  }

  function scoreItem(it, toks, phrase) {
    var total = 0, matched = 0;
    var fields = it.kind === "page"
      ? [[it._t, 100], [it._d, 34], [it._s, 26], [it._x, 10]]
      : [[it._t, 100], [it._d, 8]];

    for (var f = 0; f < fields.length; f++) {
      var sc = scoreField(fields[f][0], toks, fields[f][1]);
      if (sc >= 0) { total += sc; matched++; }
    }
    if (!matched) {
      /* לא כל האסימונים באותו שדה — מקבלים חלקית אם כולם קיימים בעמוד */
      var all = fields.map(function (f) { return f[0]; }).join(" ");
      var sc2 = scoreField(all, toks, 6);
      if (sc2 < 0) return 0;
      total = sc2;
    }
    if (phrase) {
      if (it._t.indexOf(phrase) >= 0) total += 160;
      else if (it.kind === "page" && (it._d + " " + it._s).indexOf(phrase) >= 0) total += 60;
      else if (it.kind === "page" && it._x.indexOf(phrase) >= 0) total += 25;
    }
    if (it.kind === "page" && it.f === "index.html") total -= 12; // דף הבית מתאים כמעט לכל דבר
    return total;
  }

  /* נרמול ששומר מיפוי חזרה לטקסט המקורי — כדי לחתוך קטע קריא סביב ההתאמה.
     חייב להפיק בדיוק את אותה מחרוזת ש-norm() מפיקה. */
  var DROP = /[֑-ׇ״”“"׳’‘'`]/;
  var TOSPACE = /[־‐-―–—_.,;:!?()[\]{}<>|\\/·•‹›»«\s]/;
  function normMap(s) {
    var out = [], map = [], prevSpace = true;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (DROP.test(ch)) continue;
      if (TOSPACE.test(ch)) {
        if (prevSpace) continue;
        prevSpace = true;
        ch = " ";
      } else {
        prevSpace = false;
        ch = ch.toLowerCase();
      }
      out.push(ch);
      map.push(i);
    }
    while (out.length && out[out.length - 1] === " ") { out.pop(); map.pop(); }
    return { n: out.join(""), map: map };
  }

  /* קטע טקסט סביב ההתאמה */
  function snippet(it, toks) {
    if (it.kind !== "page") {
      var from = (it.from || []).slice(0, 3).join(" · ");
      var what = it.kind === "drive" ? "תיקיית דרייב" : it.kind === "pdf" ? "קובץ להורדה" : "קישור חיצוני";
      return from ? what + " — מקושר מתוך " + from : what;
    }
    if (!it.x) return it.d || "";
    var mp = normMap(it.x);
    var at = -1, tok = "";
    for (var i = 0; i < toks.length && at < 0; i++) {
      var vs = variants(toks[i]);
      for (var v = 0; v < vs.length; v++) {
        at = mp.n.indexOf(vs[v]);
        if (at >= 0) { tok = vs[v]; break; }
      }
    }
    if (at < 0) return it.d || it.x.replace(/\n/g, " ").slice(0, 150);
    var rawAt = mp.map[at];
    var rawEnd = mp.map[Math.min(mp.map.length - 1, at + tok.length)] || rawAt + tok.length;
    var start = Math.max(0, rawAt - 70);
    var end = Math.min(it.x.length, rawEnd + 110);
    var out = it.x.slice(start, end).replace(/\n/g, " · ").replace(/\s+/g, " ").trim();
    return (start > 0 ? "…" : "") + out + (end < it.x.length ? "…" : "");
  }

  /* ---------- חיפוש ---------- */
  function runQuery(ix, q, filters) {
    filters = filters || {};
    var nq = norm(q);
    var toks = nq.split(" ").filter(function (t) { return t.length >= 2; });
    if (!toks.length) return [];
    var phrase = toks.length > 1 ? nq : "";

    var pool = [].concat(ix.pages, ix.resources);
    var out = [];
    for (var i = 0; i < pool.length; i++) {
      var it = pool[i];
      if (filters.cat && filters.cat !== "all" && it.c !== filters.cat) continue;
      if (filters.kind && filters.kind !== "all" && it.kind !== filters.kind) continue;
      var s = scoreItem(it, toks, phrase);
      if (s > 0) out.push({ item: it, score: s });
    }
    out.sort(function (a, b) { return b.score - a.score; });

    return out.map(function (r) {
      var it = r.item;
      return {
        kind: it.kind,
        title: it.t,
        url: it.url,
        cat: it.c,
        catLabel: ix.catLabel[it.c] || "",
        desc: it.kind === "page" ? (it.d || "") : (it.from || []).join(" · "),
        snippet: snippet(it, toks),
        sections: it.kind === "page" ? matchedSections(it, toks) : [],
        score: r.score,
      };
    });
  }

  /* כותרות משנה בעמוד שתואמות לחיפוש — קפיצה ישירה לקטע */
  function matchedSections(p, toks) {
    if (!p.s) return [];
    var hits = [];
    for (var i = 0; i < p.s.length && hits.length < 3; i++) {
      var sec = p.s[i];
      if (!sec.id) continue;
      var h = norm(sec.t);
      var ok = toks.every(function (t) {
        return variants(t).some(function (v) { return h.indexOf(v) >= 0; });
      });
      if (ok) hits.push({ t: sec.t, url: "/" + p.f + "#" + sec.id });
    }
    return hits;
  }

  function query(q, filters) {
    return ready().then(function (ix) { return runQuery(ix, q, filters); });
  }

  /* ---------- סימון מילות החיפוש בתוצאה ---------- */
  function esc(s) {
    return (s || "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function mark(text, q) {
    var toks = norm(q).split(" ").filter(function (t) { return t.length >= 2; });
    if (!toks.length) return esc(text);
    var all = [];
    toks.forEach(function (t) { all = all.concat(variants(t)); });
    all.sort(function (a, b) { return b.length - a.length; });
    var re = new RegExp("(" + all.map(function (t) {
      return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("|") + ")", "gi");
    return esc(text).replace(re, "<mark>$1</mark>");
  }

  /* ---------- אייקונים ---------- */
  var ICON = {
    page: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    drive: '<svg viewBox="0 0 24 24"><path d="M4 7a2 2 0 0 1 2-2h4l2 2.5h6a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg>',
    pdf: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 16.5c2.5-.6 4-3.5 3.4-4.6-.7-1.2-1.9.5-1.4 2.4.6 2.2 2.4 3.4 4.6 3"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1 1"/><path d="M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1-1"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  };

  /* ---------- חלון החיפוש המהיר ---------- */
  var box = null, input = null, list = null, hint = null, pills = null;
  var state = { q: "", cat: "all", results: [], sel: 0, ix: null };

  function build() {
    if (box) return;
    box = document.createElement("div");
    box.className = "sbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "חיפוש באתר");
    box.innerHTML =
      '<div class="sbox-scrim"></div>' +
      '<div class="sbox-panel">' +
        '<div class="sbox-top">' +
          '<span class="sbox-ic">' + ICON.search + "</span>" +
          '<input type="search" class="sbox-in" placeholder="חיפוש באתר — נוהל, טופס, תחום דעת, דרייב…" ' +
            'autocomplete="off" spellcheck="false" aria-label="מה לחפש">' +
          '<button class="sbox-x" aria-label="סגירה">✕</button>' +
        "</div>" +
        '<div class="sbox-pills" role="tablist"></div>' +
        '<div class="sbox-list" role="listbox"></div>' +
        '<div class="sbox-foot"><span class="sbox-hint"></span>' +
          '<span class="sbox-keys"><kbd>↑</kbd><kbd>↓</kbd> מעבר · <kbd>Enter</kbd> פתיחה · <kbd>Esc</kbd> סגירה</span>' +
        "</div>" +
      "</div>";
    document.body.appendChild(box);

    input = box.querySelector(".sbox-in");
    list = box.querySelector(".sbox-list");
    hint = box.querySelector(".sbox-hint");
    pills = box.querySelector(".sbox-pills");

    box.querySelector(".sbox-scrim").addEventListener("click", close);
    box.querySelector(".sbox-x").addEventListener("click", close);
    input.addEventListener("input", function () { state.q = input.value; render(); });
    input.addEventListener("keydown", onKey);
    list.addEventListener("mousemove", function (e) {
      var row = e.target.closest(".sres");
      if (row) { state.sel = +row.dataset.i; paintSel(); }
    });
  }

  function buildPills(ix) {
    var cats = [{ id: "all", label: "הכול" }].concat(ix.cats || []);
    pills.innerHTML = cats.map(function (c) {
      return '<button class="spill' + (c.id === state.cat ? " on" : "") +
        '" data-cat="' + c.id + '" role="tab">' + esc(c.label) + "</button>";
    }).join("");
    [].forEach.call(pills.querySelectorAll(".spill"), function (b) {
      b.addEventListener("click", function () {
        state.cat = b.dataset.cat;
        [].forEach.call(pills.querySelectorAll(".spill"), function (x) {
          x.classList.toggle("on", x === b);
        });
        render();
        input.focus();
      });
    });
  }

  function render() {
    if (!state.ix) return;
    var q = state.q.trim();
    if (q.length < 2) {
      state.results = [];
      list.innerHTML = suggestHTML();
      hint.textContent = "";
      bindRows();
      return;
    }
    state.results = runQuery(state.ix, q, { cat: state.cat }).slice(0, 40);
    state.sel = 0;
    if (!state.results.length) {
      list.innerHTML =
        '<div class="sempty"><b>לא נמצאו תוצאות ל“' + esc(q) + '”</b>' +
        "<span>אפשר לנסות מילה אחת, לבטל את הסינון, או לשאול את עוגן.</span>" +
        '<button class="sask">⚓ שאלו את עוגן</button></div>';
      var ask = list.querySelector(".sask");
      if (ask) ask.addEventListener("click", function () {
        close();
        var b = document.querySelector(".open-ogen") ||
          document.querySelector("[data-ogen]") ||
          document.getElementById("ogen-launcher");
        if (b) b.click();
      });
      hint.textContent = "0 תוצאות";
      return;
    }
    hint.textContent = state.results.length + " תוצאות" +
      (state.results.length === 40 ? " (מוצגות הראשונות)" : "");
    list.innerHTML = state.results.map(rowHTML).join("");
    bindRows();
    paintSel();
  }

  function rowHTML(r, i) {
    var subs = r.sections.map(function (s) {
      return '<a class="ssec" href="' + esc(s.url) + '">↳ ' + esc(s.t) + "</a>";
    }).join("");
    return '<a class="sres" role="option" data-i="' + i + '" href="' + esc(r.url) + '"' +
      (r.kind === "page" ? "" : ' target="_blank" rel="noopener"') + ">" +
      '<span class="sres-ic i-' + r.kind + '">' + (ICON[r.kind] || ICON.link) + "</span>" +
      '<span class="sres-tx">' +
        '<span class="sres-t">' + mark(r.title, state.q) + "</span>" +
        '<span class="sres-s">' + mark(r.snippet, state.q) + "</span>" +
        (subs ? '<span class="sres-secs">' + subs + "</span>" : "") +
      "</span>" +
      '<span class="sres-cat">' + esc(r.catLabel) + "</span>" +
      "</a>";
  }

  /* מסך פתיחה — קיצורי דרך נפוצים */
  var QUICK = [
    ["נהלים והנחיות", "/procedures.html"],
    ["תחומי דעת · בגרות / גמר", "/subjects.html"],
    ["תוכניות עבודה", "/work-plans.html"],
    ["בעלי תפקידים", "/tafkidim.html"],
    ["השתלמויות תשפ\"ז", "/hishtalmuyot.html"],
    ["דרייב מנהלים", "/drive-menahalim.html"],
    ["ארגז הכלים הדיגיטלי", "/tools/"],
  ];
  function suggestHTML() {
    return '<div class="squick"><div class="sq-h">קיצורי דרך</div>' +
      QUICK.map(function (q) {
        return '<a class="sq" href="' + q[1] + '">' + ICON.page + esc(q[0]) + "</a>";
      }).join("") + "</div>";
  }

  function bindRows() {
    [].forEach.call(list.querySelectorAll(".sres"), function (a) {
      a.addEventListener("click", function () { setTimeout(close, 30); });
    });
  }

  function paintSel() {
    var rows = list.querySelectorAll(".sres");
    [].forEach.call(rows, function (r, i) {
      var on = i === state.sel;
      r.classList.toggle("on", on);
      if (on) r.scrollIntoView({ block: "nearest" });
    });
  }

  function onKey(e) {
    if (e.key === "Escape") { close(); return; }
    var n = state.results.length;
    if (!n) {
      if (e.key === "Enter" && state.q.trim().length >= 2) goPage();
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); state.sel = (state.sel + 1) % n; paintSel(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); state.sel = (state.sel - 1 + n) % n; paintSel(); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) return goPage();
      var row = list.querySelectorAll(".sres")[state.sel];
      if (row) row.click();
    }
  }

  /* מעבר לעמוד החיפוש המלא עם כל התוצאות */
  function goPage() {
    location.href = "/chipus.html?q=" + encodeURIComponent(state.q.trim()) +
      (state.cat !== "all" ? "&cat=" + state.cat : "");
  }

  var lastFocus = null;
  function open(initial) {
    build();
    lastFocus = document.activeElement;
    document.body.classList.add("sbox-open");
    box.classList.add("on");
    if (typeof initial === "string") { state.q = initial; input.value = initial; }
    input.focus();
    input.select();
    ready().then(function (ix) {
      state.ix = ix;
      if (!pills.children.length) buildPills(ix);
      render();
    }).catch(function () {
      list.innerHTML = '<div class="sempty"><b>לא הצלחנו לטעון את אינדקס החיפוש</b>' +
        "<span>נסו לרענן את העמוד.</span></div>";
    });
  }

  function close() {
    if (!box) return;
    box.classList.remove("on");
    document.body.classList.remove("sbox-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- כפתור החיפוש בתפריט העליון + במגירה ---------- */
  function mountButton() {
    /* הכפתור יושב ליד הלוגו ולא בקצה השני של השורה — שם התפריט נשבר
       לשורה שנייה שהוויג'ט הצף של עוגן מסתיר. */
    var nav = document.querySelector(".nav");
    var brand = nav && nav.querySelector(".brand");
    if (nav && !nav.querySelector(".searchbtn")) {
      var b = document.createElement("button");
      b.className = "searchbtn";
      b.type = "button";
      b.setAttribute("aria-label", "חיפוש באתר (Ctrl+K)");
      b.innerHTML = ICON.search + "<span>חיפוש</span>";
      b.addEventListener("click", function () { open(""); });
      if (brand && brand.nextSibling) nav.insertBefore(b, brand.nextSibling);
      else nav.appendChild(b);
    }
    /* קישור במגירת "כל האתר" — מעל מדור השירותים */
    var body = document.querySelector(".drawer .body");
    if (body && !body.querySelector(".drawer-search")) {
      var sects = body.querySelectorAll(".sect");
      var anchor = null;
      [].forEach.call(sects, function (s) {
        if (!anchor && s.textContent.indexOf("שירותים") >= 0) anchor = s;
      });
      var a = document.createElement("a");
      a.className = "drawer-search";
      a.href = "/chipus.html";
      a.innerHTML = "🔍 חיפוש באתר";
      if (anchor) body.insertBefore(a, anchor.nextSibling);
      else body.appendChild(a);
    }
  }

  /* ---------- קיצורי מקלדת ---------- */
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "k") { e.preventDefault(); open(""); return; }
    if (k === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var t = e.target;
      var typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (!typing) { e.preventDefault(); open(""); }
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountButton);
  } else mountButton();

  window.SiteSearch = {
    ready: ready,
    query: query,
    open: open,
    close: close,
    norm: norm,
    mark: mark,
    icon: ICON,
    kinds: KINDS,
  };
})();
