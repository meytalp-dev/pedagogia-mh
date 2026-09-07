/* ===== ערכת השיעור =====
   הופכת קובץ תוכן אחד (lessons/<id>.json) לשישה תוצרים חיים:
   מערך שיעור · מצגת · דף עבודה · פעילות פתיחה · משחק · בוחן.

   שני כללים שנשמרים כאן בכוונה:
   1. אין window.open — חלון קופץ נחסם בדפדפן והתוצר "לא נפתח".
      ההדפסה עוברת דרך iframe מוסתר, וההורדה דרך Blob + a[download].
   2. הרנדרר לא יודע מאיפה הגיע התוכן. בנק סטטי ופלט של מודל
      נראים לו זהים — ולכן שניהם מתרנדרים באותה צורה בדיוק. */
(function (global) {
  "use strict";

  var LK = {};

  /* ---------- עזר ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nl(s) { return esc(s).replace(/\n/g, "<br>"); }

  /* מחרוזת אנגלית בתוך עמוד ימין-לשמאל: אלגוריתם ה-bidi זורק את סימן
     הפיסוק הסופי לקצה השמאלי, ו-"Where do you work?" מוצג "?Where do you work".
     בשיעור אנגלית זו טעות נלמדת, ולכן טקסט לטיני טהור מבודד ב-<bdi dir="ltr">. */
  var RE_HE = /[֐-׿]/;
  var RE_LAT = /[A-Za-z]/;
  /* קו תחתון ותו הפרדה נכללים ברצף בכוונה: בלעדיהם "Where ____ you work?"
     ו-"What · Who · Where" נשברים לקטעים נפרדים, וכל קטע מסודר מימין לשמאל. */
  var RE_RUN = /[A-Za-z][A-Za-z0-9'’\-+\/().,:;!?"=_· ]*/g;
  function bidi(s) {
    var t = String(s == null ? "" : s);
    if (!RE_LAT.test(t)) return esc(t);
    if (!RE_HE.test(t)) return '<bdi dir="ltr">' + esc(t) + "</bdi>";
    /* משפט מעורב: מבודדים כל רצף לטיני בנפרד, כדי שהפיסוק שלו יישאר צמוד אליו */
    var out = "", last = 0, m;
    RE_RUN.lastIndex = 0;
    while ((m = RE_RUN.exec(t)) !== null) {
      var run = m[0].replace(/[\s]+$/, "");
      if (!run) continue;
      out += esc(t.slice(last, m.index)) + '<bdi dir="ltr">' + esc(run) + "</bdi>";
      last = m.index + run.length;
      RE_RUN.lastIndex = last;
    }
    return out + esc(t.slice(last));
  }
  function nlb(s) { return bidi(s).replace(/\n/g, "<br>"); }
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function shuffle(a) {
    var r = a.slice(), i, j, t;
    for (i = r.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = r[i]; r[i] = r[j]; r[j] = t; }
    return r;
  }
  LK.esc = esc;

  var ICON = {
    lesson: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5.5A1.5 1.5 0 0 1 4 19.5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    deck: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8.5 20h7"/>',
    sheet: '<path d="M14 3v5h5"/><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 12h6M9 16h6"/>',
    opener: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    game: '<rect x="2" y="7" width="20" height="12" rx="4"/><path d="M7 11v4M5 13h4M16 12h.01M18.5 15h.01"/>',
    quiz: '<path d="M9 11l2 2 4-4"/><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4"/>'
  };
  function svg(kind) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[kind] || "") + "</svg>";
  }

  /* הסדר כאן הוא סדר העבודה של המורה, ולא סדר שרירותי:
     קוראים את התוכנית, ואז מריצים אותה — פותחים · מציגים · משחקים ·
     מתרגלים בכתב · בודקים. */
  LK.KINDS = {
    lesson: { title: "מערך שיעור", file: "מערך-שיעור", icon: ICON.lesson },
    opener: { title: "פעילות פתיחה", file: "פעילות-פתיחה", icon: ICON.opener },
    deck:   { title: "מצגת",        file: "מצגת",        icon: ICON.deck },
    game:   { title: "משחק",        file: "משחק",        icon: ICON.game },
    sheet:  { title: "דף עבודה",    file: "דף-עבודה",    icon: ICON.sheet },
    quiz:   { title: "בוחן",        file: "בוחן",        icon: ICON.quiz }
  };

  /* ---------- טעינת תוכן ---------- */
  LK.load = function (id) {
    return fetch("lessons/" + encodeURIComponent(id) + ".json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("lesson " + id + " → " + r.status);
        return r.json();
      });
  };

  /* ---------- הדפסה והורדה ללא חלון קופץ ---------- */
  var PRINT_CSS =
    'body{font-family:Arial,"Segoe UI",sans-serif;direction:rtl;color:#102A43;line-height:1.7;padding:26px;font-size:13.5px}' +
    'h3{color:#0D3B66;font-size:20px;margin:0 0 4px}h4{color:#0D3B66;font-size:15px;margin:16px 0 8px}' +
    'h5{color:#0D3B66;font-size:17px;margin:0 0 10px}' +
    '.lk-sub{color:#5C7285;font-size:12px;margin-bottom:14px}' +
    '.lk-card,.lk-sheet{border:1px solid #D8E6F2;border-radius:10px;padding:14px 16px;margin-bottom:12px;page-break-inside:avoid}' +
    '.lk-meta{display:flex;gap:10px;margin-bottom:12px}.lk-meta div{flex:1;background:#F2F7FC;border-radius:8px;padding:9px 11px}' +
    '.lk-meta b{display:block;font-size:11px;color:#5C7285;margin-bottom:2px}.lk-meta span{font-size:12.5px}' +
    '.lk-step{display:flex;gap:10px;padding:8px 0;border-top:1px solid #eee}.lk-step .lk-t{width:48px;font-weight:bold;color:#0A7799;font-size:11.5px}' +
    '.lk-step b{display:block;color:#0D3B66}.lk-step p{margin:0;color:#42586A}' +
    '.lk-slide{border:1px solid #ccc;border-radius:10px;padding:20px;margin-bottom:12px;page-break-inside:avoid}' +
    '.lk-slide .lk-num{font-size:11px;color:#5C7285;margin-bottom:6px}' +
    '.lk-note{background:#FFF8E6;border:1px solid #F5D98B;border-radius:8px;padding:9px 12px;margin-top:8px;font-size:12px;color:#6B4E00}' +
    '.lk-lines div{border-bottom:1px solid #bbb;height:24px}' +
    '.lk-eg{background:#EEF6FF;border-radius:8px;padding:8px 11px;font-size:12px;margin-bottom:7px}' +
    '.lk-q{white-space:pre-wrap;margin-bottom:6px}' +
    '.lk-task{margin-bottom:16px;page-break-inside:avoid}' +
    '.lk-check{background:#F2F7FC;border-radius:8px;padding:11px 14px;margin-top:14px}' +
    '.lk-name{display:flex;gap:24px;border-bottom:1px solid #ccc;padding-bottom:10px;margin-bottom:12px;color:#5C7285}.lk-name span{flex:1}' +
    'table{width:100%;border-collapse:collapse;font-size:12.5px}th{background:#F2F7FC;text-align:start;padding:8px 10px;border-bottom:1px solid #ccc;color:#0D3B66}' +
    'td{padding:8px 10px;border-bottom:1px solid #eee;vertical-align:top}' +
    'ul,ol{padding-inline-start:20px;margin:0}li{margin-bottom:4px}' +
    '.lk-opt{border:1px solid #D8E6F2;border-radius:9px;padding:11px 13px;margin-bottom:8px}' +
    '.lk-verdict{font-weight:bold;color:#0A7799;font-size:12px}' +
    '.lk-qcard{border:1px solid #D8E6F2;border-radius:9px;padding:11px 13px;margin-bottom:9px;page-break-inside:avoid}' +
    '.lk-qt{font-weight:bold;margin-bottom:6px}.lk-a{display:block;padding:4px 0;color:#42586A}' +
    '.lk-exp{background:#F2F7FC;border-radius:8px;padding:8px 11px;font-size:12px;margin-top:6px}' +
    '.lk-acts,.lk-nav,.lk-dots,.lk-tabs,button{display:none !important}';

  function docHtml(title, inner) {
    return '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">' +
      "<title>" + esc(title) + "</title><style>" + PRINT_CSS + "</style></head><body>" + inner + "</body></html>";
  }

  /* הדפסה דרך iframe מוסתר — לא נחסם ע"י חוסם חלונות קופצים */
  LK.print = function (node, title) {
    var f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;inset-inline-end:-10000px;bottom:0;width:820px;height:600px;border:0;opacity:0";
    document.body.appendChild(f);
    var d = f.contentWindow.document;
    d.open();
    d.write(docHtml(title || "מערך שיעור", node.innerHTML));
    d.close();
    var go = function () {
      try { f.contentWindow.focus(); f.contentWindow.print(); }
      catch (e) { /* אם ההדפסה נכשלה — הקובץ עדיין ניתן להורדה */ }
      setTimeout(function () { f.remove(); }, 1500);
    };
    if (d.readyState === "complete") setTimeout(go, 120);
    else f.onload = function () { setTimeout(go, 120); };
  };

  /* הורדה כקובץ HTML עצמאי */
  LK.download = function (node, title, filename) {
    var blob = new Blob(["﻿" + docHtml(title, node.innerHTML)], { type: "text/html;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = (filename || title || "תוצר") + ".html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  };

  /* ---------- מצב הצגה לכיתה ----------
     מעביר את הרכיב החי אל מסך מלא ומחזיר אותו למקומו ביציאה.
     מעבירים את הצומת עצמו ולא עותק — כדי שהמשחק והבוחן ימשיכו לעבוד.
     כל מה שמסומן lk-teacher מוסתר: הערות מרצה ומחוון לא עולים על המקרן. */
  LK.present = function (node, title) {
    var home = node.parentNode, after = node.nextSibling;
    var stage = el("div", "lk-stage on");
    var inner = el("div", "lk-inner");
    stage.appendChild(inner);

    var bar = el("div", "lk-ctl",
      '<span class="lk-title">' + esc(title) + "</span>" +
      '<span class="lk-sp">' +
      '<span class="lk-hintk">← → מעבר · Esc יציאה</span>' +
      '<button type="button" data-a="notes" class="lk-tsw">הערות מרצה</button>' +
      '<button type="button" data-a="exit">יציאה ממצב הצגה</button>' +
      "</span>");

    inner.appendChild(node);
    /* הסרגל חייב להיות בתוך הבמה: אלמנט במסך מלא מקודם ל-top layer,
       וכל מה שנשאר מחוצה לו אינו נראה ואינו לחיץ — כולל כפתור היציאה. */
    stage.appendChild(bar);
    document.body.appendChild(stage);

    var scrollY = window.scrollY;
    document.documentElement.style.overflow = "hidden";
    try { if (stage.requestFullscreen) stage.requestFullscreen(); } catch (e) {}

    function close() {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      if (after) home.insertBefore(node, after); else home.appendChild(node);
      stage.remove();   /* הסרגל בתוך הבמה ונמחק יחד איתה */
      document.documentElement.style.overflow = "";
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
      window.scrollTo(0, scrollY);
    }
    function onKey(e) {
      if (e.key === "Escape") { close(); return; }
      /* בעברית החץ ה"קדימה" הוא השמאלי — הדפדפן לא הופך את זה בשבילנו */
      var nav = node.querySelectorAll(".lk-nav .lk-btn");
      if (!nav.length) return;
      if (e.key === "ArrowLeft" || e.key === "PageDown" || e.key === " ") { nav[1].click(); e.preventDefault(); }
      if (e.key === "ArrowRight" || e.key === "PageUp") { nav[0].click(); e.preventDefault(); }
    }
    function onFs() { if (!document.fullscreenElement && stage.isConnected) close(); }

    bar.querySelector('[data-a="exit"]').addEventListener("click", close);
    /* ברירת המחדל היא הסתרה. המתג נועד למסך של המורה כשהוא לא משוכפל למקרן. */
    bar.querySelector('[data-a="notes"]').addEventListener("click", function () {
      this.classList.toggle("on", stage.classList.toggle("lk-shownotes"));
    });
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return close;
  };

  /* ---------- שליחה לכיתה ----------
     בונה קישור לעמוד התלמיד (shiur.html) עם מזהה השיעור והרכיב המבוקש.
     מערך השיעור לעולם אינו נשלח — הוא מסמך המורה. */
  LK.STUDENT_KINDS = ["opener", "deck", "game", "sheet", "quiz"];

  /* כשהעמוד נפתח כקובץ מקומי (file://) אין origin תקין, והקישור היה יוצא שבור.
     במקרה כזה נופלים לדומיין הקבוע של האתר. */
  LK.SITE = "https://pedagogiamh.co.il/";

  LK.shareURL = function (id, kind) {
    var base = /^https?:$/.test(location.protocol)
      ? location.origin + location.pathname.replace(/[^/]*$/, "") + "shiur.html"
      : LK.SITE + "shiur.html";
    var u = base + "?id=" + encodeURIComponent(id);
    if (kind && LK.STUDENT_KINDS.indexOf(kind) !== -1) u += "&r=" + encodeURIComponent(kind);
    return u;
  };

  var QR_SRC = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
  var qrState = 0;   /* 0 טרם נטען · 1 בטעינה · 2 מוכן · 3 נכשל */
  var qrWaiting = [];
  function withQR(cb) {
    if (qrState === 2) return cb(true);
    if (qrState === 3) return cb(false);
    qrWaiting.push(cb);
    if (qrState === 1) return;
    qrState = 1;
    var s = document.createElement("script");
    s.src = QR_SRC;
    s.onload = function () { qrState = 2; qrWaiting.splice(0).forEach(function (f) { f(true); }); };
    s.onerror = function () { qrState = 3; qrWaiting.splice(0).forEach(function (f) { f(false); }); };
    document.head.appendChild(s);
  }

  LK.share = function (data, kind, title) {
    var url = LK.shareURL(data.id, kind);
    var msg = "שיעור " + (data.topic || "") + " — " + (title || "") + "\n" + url;

    var box = el("div", "lk-share",
      "<b>שליחה לכיתה</b>" +
      '<p class="lk-shx">הקישור פותח לתלמידים את הרכיב הזה בלבד. מערך השיעור והמחוון אינם נכללים בו.</p>' +
      '<div class="lk-url" dir="ltr"></div>' +
      '<div class="lk-shb">' +
        '<button type="button" class="lk-btn primary" data-a="copy">העתקת הקישור</button>' +
        '<a class="lk-btn" data-a="wa" target="_blank" rel="noopener">שליחה בוואטסאפ</a>' +
        '<button type="button" class="lk-btn" data-a="qr">הצגת QR לסריקה</button>' +
        '<button type="button" class="lk-btn" data-a="close">סגירה</button>' +
      "</div>" +
      '<div class="lk-qr" hidden></div>');

    box.querySelector(".lk-url").textContent = url;
    box.querySelector('[data-a="wa"]').href = "https://wa.me/?text=" + encodeURIComponent(msg);
    box.querySelector('[data-a="copy"]').addEventListener("click", function () {
      var b = this;
      LK.copy(url).then(function () {
        var o = b.textContent; b.textContent = "הועתק ✓";
        setTimeout(function () { b.textContent = o; }, 1800);
      });
    });
    box.querySelector('[data-a="close"]').addEventListener("click", function () { box.remove(); });

    var qrBox = box.querySelector(".lk-qr");
    box.querySelector('[data-a="qr"]').addEventListener("click", function () {
      if (!qrBox.hidden) { qrBox.hidden = true; return; }
      qrBox.hidden = false;
      if (qrBox.dataset.done) return;
      qrBox.textContent = "בונה קוד…";
      withQR(function (ok) {
        qrBox.textContent = "";
        if (!ok || typeof QRCode === "undefined") {
          qrBox.innerHTML = '<p class="lk-shx">לא הצלחנו לטעון את מחולל ה-QR (כנראה אין חיבור לאינטרנט). הקישור למעלה עובד כרגיל — אפשר להעתיק אותו.</p>';
          return;
        }
        new QRCode(qrBox, { text: url, width: 190, height: 190, correctLevel: QRCode.CorrectLevel.M });
        qrBox.insertAdjacentHTML("beforeend", '<p class="lk-shx">הקרינו את הקוד — התלמידים סורקים במצלמת הטלפון.</p>');
        qrBox.dataset.done = "1";
      });
    });
    return box;
  };

  LK.copy = function (text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var t = document.createElement("textarea");
    t.value = text;
    t.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(t);
    t.select();
    try { document.execCommand("copy"); } catch (e) {}
    t.remove();
    return Promise.resolve();
  };

  /* ---------- 1 · מערך שיעור ---------- */
  function renderLesson(d) {
    var L = d.lesson || {};
    var h = "";
    h += '<div class="lk-meta">' +
      "<div><b>מטרת השיעור</b><span>" + esc(d.goal) + "</span></div>" +
      "<div><b>המיומנות</b><span>" + esc(d.skill) + "</span></div>" +
      "<div><b>מה להכין מראש</b><span>" + esc(d.prep) + "</span></div>" +
      "</div>";

    ["opening", "body", "closing"].forEach(function (k) {
      var s = L[k];
      if (!s) return;
      h += '<div class="lk-card"><h4>' + esc(s.title) +
        '<span class="lk-min">' + esc(s.minutes) + " דק׳</span></h4>";
      (s.steps || []).forEach(function (st) {
        h += '<div class="lk-step"><div class="lk-t">' + esc(st.minutes) + " דק׳</div>" +
          "<div><b>" + esc(st.title) + "</b><p>" + nlb(st.text) + "</p></div></div>";
      });
      h += "</div>";
    });

    if (L.guidingQuestions && L.guidingQuestions.length) {
      h += '<div class="lk-card lk-teacher"><h4>שאלות מנחות למורה</h4><ol class="lk-list">' +
        L.guidingQuestions.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") +
        "</ol></div>";
    }
    if (L.materials) {
      h += '<div class="lk-card"><h4>חומרי עזר</h4>';
      if (L.materials.inClass) {
        h += "<p style=\"font-size:var(--fs-xs);color:var(--muted);font-weight:700;margin:0 0 6px\">בכיתה</p><ul class=\"lk-list\">" +
          L.materials.inClass.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul>";
      }
      if (L.materials.toSend) {
        h += "<p style=\"font-size:var(--fs-xs);color:var(--muted);font-weight:700;margin:12px 0 6px\">לשליחה לתלמידים</p><ul class=\"lk-list\">" +
          L.materials.toSend.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul>";
      }
      h += "</div>";
    }
    if (L.differentiation) {
      h += '<div class="lk-card lk-teacher"><h4>התאמות</h4>' +
        '<div class="lk-step"><div class="lk-t">מתקשה</div><div><p>' + esc(L.differentiation.struggling) + "</p></div></div>" +
        '<div class="lk-step"><div class="lk-t">סיים</div><div><p>' + esc(L.differentiation.fast) + "</p></div></div>" +
        "</div>";
    }
    if (L.exitTicket && L.exitTicket.length) {
      h += '<div class="lk-card"><h4>כרטיס יציאה</h4><ol class="lk-list">' +
        L.exitTicket.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ol></div>";
    }
    if (L.nextCheck && L.nextCheck.length) {
      h += '<div class="lk-card lk-teacher"><h4>מה לבדוק לפני השיעור הבא</h4><ul class="lk-list">' +
        L.nextCheck.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ul></div>";
    }
    return el("div", "lk-body", h);
  }

  /* ---------- 2 · מצגת ---------- */
  function renderDeck(d) {
    var slides = d.deck || [];
    var wrap = el("div", "lk-body");
    if (!slides.length) return el("div", "lk-empty", "אין מצגת בקובץ התוכן הזה.");

    var i = 0;
    var stage = el("div");
    var note = el("div", "lk-note lk-teacher");
    var nav = el("div", "lk-nav");
    var prev = el("button", "lk-btn", "‹ הקודם");
    var next = el("button", "lk-btn", "הבא ›");
    var pos = el("span", "lk-pos");
    var dots = el("div", "lk-dots");

    function paint() {
      var s = slides[i];
      stage.innerHTML = '<div class="lk-slide"><div class="lk-num">שקף ' + (i + 1) + " מתוך " + slides.length + "</div>" +
        "<h5>" + bidi(s.title) + "</h5><ul>" +
        (s.bullets || []).map(function (b) { return "<li>" + bidi(b) + "</li>"; }).join("") +
        "</ul></div>";
      note.innerHTML = s.note ? "<b>הערת מרצה:</b> " + esc(s.note) : "";
      note.style.display = s.note ? "" : "none";
      pos.textContent = i + 1 + " / " + slides.length;
      prev.disabled = i === 0;
      next.disabled = i === slides.length - 1;
      Array.prototype.forEach.call(dots.children, function (b, n) { b.classList.toggle("on", n === i); });
    }
    slides.forEach(function (s, n) {
      var b = el("button", "lk-dot");
      b.type = "button";
      b.setAttribute("aria-label", "שקף " + (n + 1));
      b.addEventListener("click", function () { i = n; paint(); });
      dots.appendChild(b);
    });
    prev.type = next.type = "button";
    prev.addEventListener("click", function () { if (i > 0) { i--; paint(); } });
    next.addEventListener("click", function () { if (i < slides.length - 1) { i++; paint(); } });

    nav.appendChild(prev); nav.appendChild(next); nav.appendChild(pos); nav.appendChild(dots);
    wrap.appendChild(stage); wrap.appendChild(note); wrap.appendChild(nav);

    /* בהדפסה ובהורדה — כל השקפים, לא רק הנוכחי */
    function deckPrint(withNotes) {
      return slides.map(function (s, n) {
        return '<div class="lk-slide"><div class="lk-num">שקף ' + (n + 1) + " מתוך " + slides.length + "</div>" +
          "<h5>" + esc(s.title) + "</h5><ul>" +
          (s.bullets || []).map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" +
          (withNotes && s.note ? '<div class="lk-note"><b>הערת מרצה:</b> ' + esc(s.note) + "</div>" : "") + "</div>";
      }).join("");
    }
    wrap.__printStudent = deckPrint(false);
    wrap.__printHTML = slides.map(function (s, n) {
      return '<div class="lk-slide"><div class="lk-num">שקף ' + (n + 1) + " מתוך " + slides.length + "</div>" +
        "<h5>" + esc(s.title) + "</h5><ul>" +
        (s.bullets || []).map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" +
        (s.note ? '<div class="lk-note"><b>הערת מרצה:</b> ' + esc(s.note) + "</div>" : "") + "</div>";
    }).join("");

    paint();
    return wrap;
  }

  /* ---------- 3 · דף עבודה ---------- */
  function renderSheet(d) {
    var S = d.sheet || {};
    if (!S.tasks) return el("div", "lk-empty", "אין דף עבודה בקובץ התוכן הזה.");
    var h = '<div class="lk-sheet">';
    h += "<h5 style=\"font-size:var(--fs-xl);color:var(--navy);margin:0 0 4px\">" + bidi(S.title || d.topic) + "</h5>";
    h += '<div class="lk-name"><span>שם: ________________</span><span>כיתה: ________</span><span>תאריך: __________</span></div>';
    if (S.intro) h += '<p class="lk-q" style="margin-bottom:18px">' + nlb(S.intro) + "</p>";

    S.tasks.forEach(function (t) {
      h += '<div class="lk-task"><div class="lk-q"><b>' + esc(t.n) + ".</b> " + nlb(t.text) + "</div>";
      if (t.example) h += '<div class="lk-eg">' + nlb(t.example) + "</div>";
      h += '<div class="lk-lines">' + new Array((t.lines || 3) + 1).join("<div></div>") + "</div></div>";
    });
    if (S.bonus) {
      h += '<div class="lk-task"><div class="lk-q"><b>בונוס.</b> ' + nl(S.bonus) + "</div>" +
        '<div class="lk-lines">' + new Array(5).join("<div></div>") + "</div></div>";
    }
    if (S.selfCheck && S.selfCheck.length) {
      h += '<div class="lk-check"><b>בדקתי את עצמי</b>' +
        S.selfCheck.map(function (c) {
          return "<label><input type=\"checkbox\"><span>" + esc(c) + "</span></label>";
        }).join("") + "</div>";
    }
    h += "</div>";

    if (S.rubric && S.rubric.length) {
      h += '<div class="lk-card lk-teacher"><h4>מחוון למורה</h4><table class="lk-rubric">' +
        "<thead><tr><th>משימה</th><th>תשובה וקריטריון</th><th>ניקוד</th></tr></thead><tbody>" +
        S.rubric.map(function (r) {
          return "<tr><td>" + esc(r.task) + "</td><td>" + esc(r.answer) + "</td><td>" + esc(r.points) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    }
    return el("div", "lk-body", h);
  }

  /* ---------- 4 · פעילות פתיחה ---------- */
  function renderOpener(d) {
    var O = d.opener;
    if (!O) return el("div", "lk-empty", "אין פעילות פתיחה בקובץ התוכן הזה.");
    var wrap = el("div", "lk-body");
    /* הכותרת נשארת לכולם. הוראות ההפעלה והגשר מנוסחים אל המורה
       ("הציגו לכיתה", "כתבו על הלוח") — ולכן הם lk-teacher ואינם
       מוקרנים על הקיר ואינם נשלחים לתלמידים. */
    var h = '<div class="lk-card"><h4>' + bidi(O.title) +
      '<span class="lk-min">' + esc(O.duration) + " דק׳</span></h4></div>";
    if (O.instructions) {
      h += '<div class="lk-card lk-teacher"><h4>הפעלה — למורה</h4>' +
        '<p class="lk-q" style="margin-bottom:0">' + nl(O.instructions) + "</p></div>";
    }
    h += '<div class="lk-card"><h4>המשפטים — לחצו כדי לחשוף את הניתוח</h4><div id="lk-op-list"></div></div>';
    if (O.teacherNote) h += '<div class="lk-note lk-teacher"><b>הערת מרצה:</b> ' + esc(O.teacherNote) + "</div>";
    if (O.bridge) h += '<div class="lk-card lk-teacher" style="margin-top:14px"><h4>הגשר לשיעור — למורה</h4><p class="lk-q" style="margin:0">' + esc(O.bridge) + "</p></div>";
    wrap.innerHTML = h;

    var list = wrap.querySelector("#lk-op-list");
    (O.items || []).forEach(function (it, n) {
      var card = el("div", "lk-opt",
        '<div class="lk-txt"><b style="color:var(--navy)">' + (n + 1) + ".</b> " + bidi(it.text) + "</div>" +
        '<div class="lk-rev"><span class="lk-verdict">' + esc(it.verdict) + "</span>" +
        '<p class="lk-why">' + bidi(it.why) + "</p></div>");
      card.addEventListener("click", function () { card.classList.toggle("open"); });
      list.appendChild(card);
    });

    /* לתלמיד: ההוראות למורה, הערת המרצה והגשר אינם נכללים */
    wrap.__printStudent = '<div class="lk-card"><h4>' + esc(O.title) + "</h4></div>" +
      (O.items || []).map(function (it, n) {
        return '<div class="lk-opt"><div class="lk-txt"><b>' + (n + 1) + ".</b> " + esc(it.text) + "</div></div>";
      }).join("");

    /* בהדפסה — הניתוח גלוי ממילא */
    wrap.__printHTML = h.replace('<div id="lk-op-list"></div>',
      (O.items || []).map(function (it, n) {
        return '<div class="lk-opt"><div class="lk-txt"><b>' + (n + 1) + ".</b> " + esc(it.text) + "</div>" +
          '<div><span class="lk-verdict">' + esc(it.verdict) + "</span><p>" + esc(it.why) + "</p></div></div>";
      }).join(""));
    return wrap;
  }

  /* ---------- משותף: כרטיס שאלה אינטראקטיבי ---------- */
  function quizCards(items, host, onScore) {
    var answered = 0, right = 0;
    items.forEach(function (q, n) {
      var card = el("div", "lk-qcard");
      var lvl = q.level ? '<span class="lk-lvl ' + esc(q.level) + '">' +
        ({ easy: "קל", medium: "בינוני", high: "מאתגר" }[q.level] || esc(q.level)) + "</span>" : "";
      card.innerHTML = '<div class="lk-qt">' + (n + 1) + ". " + bidi(q.q) + lvl + '</div><div class="lk-opts"></div><div class="lk-exp"></div>';
      var opts = card.querySelector(".lk-opts");
      var exp = card.querySelector(".lk-exp");
      q.opts.forEach(function (o, oi) {
        var b = el("button", "lk-a", bidi(o));
        b.type = "button";
        b.addEventListener("click", function () {
          if (card.dataset.done) return;
          card.dataset.done = "1";
          answered++;
          if (oi === q.correct) right++;
          Array.prototype.forEach.call(opts.children, function (btn, bi) {
            btn.disabled = true;
            if (bi === q.correct) btn.classList.add("ok");
            else if (bi === oi) btn.classList.add("no");
          });
          exp.innerHTML = bidi(q.explain || "");
          exp.classList.add("on");
          if (onScore) onScore(right, answered, items.length);
        });
        opts.appendChild(b);
      });
      host.appendChild(card);
    });
  }

  function scoreBar(label) {
    var s = el("div", "lk-score",
      "<span>" + esc(label) + '</span><span class="lk-bar"><span class="lk-fill"></span></span><span class="lk-n">0 / 0</span>');
    s.update = function (right, answered, total) {
      s.querySelector(".lk-fill").style.width = (answered / total * 100) + "%";
      s.querySelector(".lk-n").textContent = right + " / " + answered;
    };
    return s;
  }

  /* ---------- 5 · משחק ---------- */
  function renderGame(d) {
    var G = d.game;
    if (!G) return el("div", "lk-empty", "אין משחק בקובץ התוכן הזה.");
    var wrap = el("div", "lk-body");

    if (G.quiz && G.quiz.length) {
      var sec = el("div", "lk-g", "<b>שאלות מהירות</b>");
      var bar = scoreBar("ניקוד");
      sec.appendChild(bar);
      var host = el("div");
      sec.appendChild(host);
      quizCards(G.quiz, host, bar.update);
      wrap.appendChild(sec);
    }

    if (G.matching && G.matching.length) {
      var m = el("div", "lk-g", "<b>התאמה — לחצו מושג ואז את ההגדרה שלו</b>");
      var grid = el("div", "lk-match");
      var colR = el("div", "lk-col", "<b>מושג</b>");
      var colL = el("div", "lk-col", "<b>הגדרה</b>");
      var sel = null, left = G.matching.length;
      var status = el("div", "lk-exp on", "נותרו " + left + " התאמות.");

      G.matching.forEach(function (p, n) {
        var b = el("button", "lk-m", bidi(p.right));
        b.type = "button"; b.dataset.i = n;
        b.addEventListener("click", function () {
          if (b.classList.contains("done")) return;
          if (sel) sel.classList.remove("sel");
          sel = b; b.classList.add("sel");
        });
        colR.appendChild(b);
      });
      shuffle(G.matching.map(function (p, n) { return { p: p, n: n }; })).forEach(function (o) {
        var b = el("button", "lk-m", bidi(o.p.left));
        b.type = "button";
        b.addEventListener("click", function () {
          if (b.classList.contains("done") || !sel) return;
          if (sel.dataset.i === String(o.n)) {
            sel.classList.remove("sel"); sel.classList.add("done"); b.classList.add("done");
            sel = null; left--;
            status.textContent = left ? "נותרו " + left + " התאמות." : "כל ההתאמות נכונות. כל הכבוד!";
          } else {
            b.classList.add("miss");
            setTimeout(function () { b.classList.remove("miss"); }, 550);
          }
        });
        colL.appendChild(b);
      });
      grid.appendChild(colR); grid.appendChild(colL);
      m.appendChild(grid); m.appendChild(status);
      wrap.appendChild(m);
    }

    if (G.truefalse && G.truefalse.length) {
      var tf = el("div", "lk-g", "<b>נכון או לא נכון</b>");
      var tfHost = el("div");
      quizCards(G.truefalse.map(function (t) {
        return { q: t.statement, opts: ["נכון", "לא נכון"], correct: t.correct ? 0 : 1, explain: t.explain };
      }), tfHost);
      tf.appendChild(tfHost);
      wrap.appendChild(tf);
    }

    wrap.__printHTML = gamePrint(G);
    return wrap;
  }

  function gamePrint(G) {
    var h = "";
    if (G.quiz) {
      h += "<h4>שאלות מהירות</h4>" + G.quiz.map(function (q, n) {
        return '<div class="lk-qcard"><div class="lk-qt">' + (n + 1) + ". " + esc(q.q) + "</div>" +
          q.opts.map(function (o, i) { return '<div class="lk-a">' + (i === q.correct ? "✔ " : "○ ") + esc(o) + "</div>"; }).join("") +
          '<div class="lk-exp">' + esc(q.explain || "") + "</div></div>";
      }).join("");
    }
    if (G.matching) {
      h += "<h4>התאמה</h4><table><thead><tr><th>מושג</th><th>הגדרה</th></tr></thead><tbody>" +
        G.matching.map(function (p) { return "<tr><td>" + esc(p.right) + "</td><td>" + esc(p.left) + "</td></tr>"; }).join("") +
        "</tbody></table>";
    }
    if (G.truefalse) {
      h += "<h4>נכון או לא נכון</h4>" + G.truefalse.map(function (t, n) {
        return '<div class="lk-qcard"><div class="lk-qt">' + (n + 1) + ". " + esc(t.statement) + "</div>" +
          '<div class="lk-a">' + (t.correct ? "נכון" : "לא נכון") + '</div><div class="lk-exp">' + esc(t.explain || "") + "</div></div>";
      }).join("");
    }
    return h;
  }

  /* ---------- 6 · בוחן דיפרנציאלי ---------- */
  function renderQuiz(d) {
    var Q = d.quiz;
    if (!Q || !Q.length) return el("div", "lk-empty", "אין בוחן בקובץ התוכן הזה.");
    var wrap = el("div", "lk-body");
    var counts = { easy: 0, medium: 0, high: 0 };
    Q.forEach(function (q) { if (counts[q.level] != null) counts[q.level]++; });
    /* תיאור מבנה הבוחן מדבר *על* התלמיד ולא *אל* התלמיד — חומר מורה. */
    wrap.appendChild(el("div", "lk-exp on lk-teacher",
      "הבוחן דיפרנציאלי: " + counts.easy + " שאלות ברמה קלה, " + counts.medium +
      " ברמה בינונית ו-" + counts.high + " מאתגרות. התלמיד מתקדם לפי הצלחתו."));
    var bar = scoreBar("ניקוד");
    wrap.appendChild(bar);
    var host = el("div");
    wrap.appendChild(host);
    quizCards(Q, host, bar.update);

    wrap.__printHTML = Q.map(function (q, n) {
      return '<div class="lk-qcard"><div class="lk-qt">' + (n + 1) + ". " + esc(q.q) +
        " (" + ({ easy: "קל", medium: "בינוני", high: "מאתגר" }[q.level] || "") + ")</div>" +
        q.opts.map(function (o, i) { return '<div class="lk-a">' + (i === q.correct ? "✔ " : "○ ") + esc(o) + "</div>"; }).join("") +
        '<div class="lk-exp">' + esc(q.explain || "") + "</div></div>";
    }).join("");
    return wrap;
  }

  var RENDER = {
    lesson: renderLesson, deck: renderDeck, sheet: renderSheet,
    opener: renderOpener, game: renderGame, quiz: renderQuiz
  };

  /* ---------- הרכבה: לשוניות + תוצרים ---------- */
  LK.mount = function (host, data, kinds, opts) {
    opts = opts || {};
    var student = !!opts.student;
    host.innerHTML = "";
    host.className = "lk" + (student ? " lk-student" : "");
    kinds = (kinds && kinds.length ? kinds : Object.keys(LK.KINDS)).filter(function (k) {
      /* הגנת עומק: בעמוד התלמיד לא מרנדרים חומרי מורה גם אם התבקשו במפורש */
      return RENDER[k] && (!student || LK.STUDENT_KINDS.indexOf(k) !== -1);
    });
    if (!kinds.length) return;

    var tabs = el("div", "lk-tabs");
    tabs.setAttribute("role", "tablist");
    host.appendChild(tabs);

    kinds.forEach(function (kind, n) {
      var meta = LK.KINDS[kind];

      var tab = el("button", "lk-tab" + (n === 0 ? " on" : ""), svg(kind) + esc(meta.title));
      tab.type = "button";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", n === 0 ? "true" : "false");
      tabs.appendChild(tab);

      var panel = el("div", "lk-panel" + (n === 0 ? " on" : ""));
      panel.setAttribute("role", "tabpanel");

      var head = el("div", "lk-head",
        "<div><h3>" + esc(meta.title) + " · " + bidi(data.topic) + "</h3>" +
        '<div class="lk-sub">' + esc(data.subject) + " · " + esc(data.grade) +
        (data.duration ? " · " + esc(data.duration) + " דקות" : "") +
        (data.module ? " · " + esc(data.module) : "") + "</div></div>");

      var acts = el("div", "lk-acts");
      var bShow = null, bSend = null;
      if (!student) {
        bShow = el("button", "lk-btn primary",
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M12 17v4M8 21h8"/></svg>הצגה לכיתה');
        bShow.type = "button";
        acts.appendChild(bShow);

        /* מערך השיעור הוא מסמך המורה — אין לו כפתור שליחה */
        if (data.id && LK.STUDENT_KINDS.indexOf(kind) !== -1) {
          bSend = el("button", "lk-btn",
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M14 6l6 6-6 6"/><path d="M4 5v14"/></svg>שליחה לכיתה');
          bSend.type = "button";
          acts.appendChild(bSend);
        }
      }
      var bPrint = el("button", "lk-btn",
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></svg>הדפסה');
      var bDown = el("button", "lk-btn",
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 11l5 5 5-5M4 19h16"/></svg>הורדה');
      bPrint.type = bDown.type = "button";
      acts.appendChild(bPrint);
      acts.appendChild(bDown);
      head.appendChild(acts);
      panel.appendChild(head);

      var body = RENDER[kind](data);
      /* בעמוד התלמיד מוחקים את חומרי המורה מה-DOM ולא רק מסתירים אותם:
         הסתרה ב-CSS עדיין משאירה אותם ב"הצג מקור". */
      if (student) {
        body.querySelectorAll(".lk-teacher").forEach(function (n) { n.remove(); });
        /* גרסאות ההדפסה של המשחק והבוחן מסמנות את התשובה הנכונה, ושל
           המצגת והפתיחה כוללות הערות מרצה. לתלמיד מגישים גרסה נקייה,
           ובהיעדרה נופלים לשכפול ה-DOM החי — שם נחשף רק מה שהוא כבר פתר. */
        body.__printHTML = body.__printStudent || null;
      }
      panel.appendChild(body);
      host.appendChild(panel);

      /* מקור להדפסה: גרסת ההדפסה אם הרנדרר סיפק אחת, אחרת ה-DOM עצמו */
      function source() {
        if (body.__printHTML) {
          var tmp = el("div");
          tmp.innerHTML = '<h3>' + esc(meta.title) + " · " + esc(data.topic) + "</h3>" +
            '<div class="lk-sub">' + esc(data.subject) + " · " + esc(data.grade) + "</div>" + body.__printHTML;
          return tmp;
        }
        var clone = el("div");
        clone.innerHTML = head.innerHTML + body.innerHTML;
        return clone;
      }
      var fname = meta.file + " · " + data.topic;
      if (bShow) bShow.addEventListener("click", function () {
        LK.present(body, meta.title + " · " + data.topic);
      });
      if (bSend) bSend.addEventListener("click", function () {
        var old = panel.querySelector(".lk-share");
        if (old) { old.remove(); return; }
        panel.insertBefore(LK.share(data, kind, meta.title), body);
      });
      bPrint.addEventListener("click", function () { LK.print(source(), fname); });
      bDown.addEventListener("click", function () { LK.download(source(), fname, fname); });

      tab.addEventListener("click", function () {
        Array.prototype.forEach.call(tabs.children, function (t) {
          t.classList.remove("on"); t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("on"); tab.setAttribute("aria-selected", "true");
        Array.prototype.forEach.call(host.querySelectorAll(".lk-panel"), function (p) { p.classList.remove("on"); });
        panel.classList.add("on");
      });
    });
  };

  global.LessonKit = LK;
})(window);
