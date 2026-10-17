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
  /* שיעור שנבנה במחולל (11.10.26) — מזהה של 32 תווים, נשמר בשרת "מחולל - מוח".
     השרת מחזיר גרסת תלמיד בלבד: בלי מערך השיעור ובלי המחוון. */
  LK.GEN = "https://script.google.com/macros/s/AKfycbwAAve_lLJpWGxxh1gUHmJ_1aZ4J8bt7ush3WQYcgOfdCtWcz1TxOn1_YhUn0K-dnlr3w/exec";
  LK.load = function (id) {
    if (/^[a-f0-9]{32}$/.test(String(id))) {
      return fetch(LK.GEN + "?lesson=" + id).then(function (r) { return r.json(); })
        .then(function (d) { if (!d || !d.ok || !d.data) throw new Error("lesson " + id); return d.data; });
    }
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
  /* as="word" (11.10.26) — אותו מסמך כ-.doc: וורד ו-Google Docs פותחים אותו לעריכה מלאה */
  LK.download = function (node, title, filename, as) {
    var word = as === "word";
    var html = docHtml(title, node.innerHTML);
    if (word) html = html.replace("<html", '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"');
    var blob = new Blob(["﻿" + html], { type: word ? "application/msword;charset=utf-8" : "text/html;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = (filename || title || "תוצר") + (word ? ".doc" : ".html");
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  };

  /* ---------- מצגת PowerPoint לעריכה (11.10.26) ----------
     נבנית בדפדפן עם PptxGenJS (נטען רק כשלוחצים). 16:9, מימין לשמאל, Arial (יש בו עברית
     בכל מחשב), הערות המרצה בהערות הדובר. נפתחת לעריכה ב-PowerPoint וב-Google Slides. */
  var PPTX_SRC = "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";
  var PAL = ["2F74C0", "2F9F55", "F2B233", "EF5656", "8F7AC3"];
  function withPptx(cb) {
    if (global.PptxGenJS) return cb(true);
    var s = document.createElement("script");
    s.src = PPTX_SRC;
    s.onload = function () { cb(!!global.PptxGenJS); };
    s.onerror = function () { cb(false); };
    document.head.appendChild(s);
  }
  LK.pptx = function (d, filename, btn) {
    var slides = d.deck || [];
    if (!slides.length) return;
    var label = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.textContent = "בונה מצגת…"; }
    withPptx(function (ok) {
      if (btn) { btn.disabled = false; btn.innerHTML = label; }
      if (!ok) { alert("לא הצלחנו לטעון את בונה המצגות (אין חיבור?). אפשר להשתמש בכפתור ההדפסה בינתיים."); return; }
      var P = new global.PptxGenJS();
      P.layout = "LAYOUT_WIDE";   /* 13.33 × 7.5 אינץ׳ */
      P.rtlMode = true;
      P.title = d.topic || "מצגת";
      var W = 13.33, H = 7.5, FONT = "Arial", NAVY = "0D3B66", foot = (d.subject || "") + (d.topic ? " · " + d.topic : "");
      var T = { fontFace: FONT, rtlMode: true, align: "right" };
      function stripe(s, y, h) {
        PAL.forEach(function (c, n) { s.addShape(P.ShapeType.rect, { x: n * W / 5, y: y, w: W / 5, h: h, fill: { color: c }, line: { color: c } }); });
      }
      /* מצגת מהמחולל (שקפים לפי סוג) — כיוון 3 "בלוקים צבעוניים": בלוק צבע משמאל לפי סוג השקף */
      if (slides[0].type) {
        var BLK = { goal: "2F9F55", question: "EF5656", concept: "2F74C0", example: "E0A21F", compare: "8F7AC3", task: "1FA6A0", summary: "0B1B2B", exit: "EF5656" };
        var X0 = W * 0.28, CW = W - X0 - 0.6, INK = "0B1B2B", HF = "Arial";
        slides.forEach(function (sl, n) {
          var s = P.addSlide(), k = sl.type || "summary", c = BLK[k] || "2F74C0", b = sl.bullets || [];
          if (k === "title") {
            s.background = { color: INK };
            stripe(s, H - 0.22, 0.22);
            s.addText("מחולל השיעורים · המרחב הפדגוגי", Object.assign({}, T, { x: 0.8, y: 1.6, w: W - 1.6, h: 0.5, fontSize: 16, bold: true, color: "27C6F3" }));
            s.addText(sl.title || d.topic || "", Object.assign({}, T, { x: 0.8, y: 2.1, w: W - 1.6, h: 1.8, fontSize: 54, bold: true, color: "FFFFFF", fontFace: HF }));
            s.addText(b.join("\n"), Object.assign({}, T, { x: 0.8, y: 4.0, w: W - 1.6, h: 1.4, fontSize: 22, color: "C9D6E3", valign: "top" }));
          } else {
            s.background = { color: "FFFFFF" };
            s.addShape(P.ShapeType.rect, { x: 0, y: 0, w: W * 0.24, h: H, fill: { color: c }, line: { color: c } });
            s.addText(SL_HE[k] || "", { x: 0, y: H / 2 - 0.4, w: W * 0.24, h: 0.8, fontFace: HF, fontSize: 22, bold: true, color: "FFFFFF", align: "center", rtlMode: true });
            s.addText(("0" + (n + 1)).slice(-2), { x: W - 1.4, y: 0.35, w: 0.9, h: 0.5, fontFace: HF, fontSize: 16, bold: true, color: c, align: "right" });
            s.addText(sl.title || "", Object.assign({}, T, { x: X0, y: 0.8, w: CW, h: 1.0, fontSize: 36, bold: true, color: INK }));
            var y = 1.95;
            if (k === "question") {
              s.addText(sl.big || "", Object.assign({}, T, { x: X0, y: y, w: CW, h: 2.6, fontSize: 32, bold: true, color: INK, valign: "middle" }));
              if (b.length) s.addText(b.join("\n"), Object.assign({}, T, { x: X0, y: 4.8, w: CW, h: 0.9, fontSize: 18, color: "5B6B7C" }));
            } else if (k === "compare" && sl.left && sl.right) {
              var half = (CW - 0.5) / 2;
              [[sl.right, X0 + half + 0.5, "EFEAF8"], [sl.left, X0, "F3F5F8"]].forEach(function (cc) {
                s.addShape(P.ShapeType.rect, { x: cc[1], y: y, w: half, h: 3.9, fill: { color: cc[2] }, line: { color: cc[2] } });
                s.addText([{ text: cc[0].label || "", options: { bold: true, fontSize: 26, color: INK, breakLine: true } }].concat((cc[0].items || []).map(function (it) {
                  return { text: it, options: { fontSize: 20, color: INK, breakLine: true, paraSpaceBefore: 8 } };
                })), Object.assign({}, T, { x: cc[1] + 0.3, y: y + 0.25, w: half - 0.6, h: 3.4, valign: "top" }));
              });
            } else if (k === "exit") {
              b.forEach(function (q, i) {
                var yy = y + i * 1.25;
                s.addShape(P.ShapeType.rect, { x: X0, y: yy, w: CW, h: 1.05, fill: { color: "F3F5F8" }, line: { color: "F3F5F8" } });
                s.addText(String(i + 1), { x: X0 + CW - 0.8, y: yy, w: 0.6, h: 1.05, fontFace: HF, fontSize: 30, bold: true, color: c, align: "center", valign: "middle" });
                s.addText(q, Object.assign({}, T, { x: X0 + 0.2, y: yy, w: CW - 1.1, h: 1.05, fontSize: 20, color: INK, valign: "middle" }));
              });
            } else {
              var numbered = k === "concept" || k === "example" || k === "task";
              s.addText(b.map(function (x, i) {
                return { text: x, options: { bullet: numbered ? { type: "number" } : { code: "25A0" }, paraSpaceAfter: 12, breakLine: true } };
              }), Object.assign({}, T, { x: X0, y: y, w: CW, h: sl.big ? 2.7 : 4.6, fontSize: 22, color: INK, valign: "top" }));
              if (sl.big) s.addText(sl.big, { x: X0, y: 4.75, w: CW, h: 1.6, fontFace: HF, fontSize: 66, bold: true, color: c, align: "right", rtlMode: false });
            }
            s.addText(foot, Object.assign({}, T, { x: X0, y: H - 0.55, w: CW, h: 0.35, fontSize: 11, color: "8A97A6" }));
          }
          if (sl.note) s.addNotes(sl.note);
        });
        P.writeFile({ fileName: (filename || d.topic || "מצגת") + ".pptx" });
        return;
      }
      slides.forEach(function (sl, n) {
        var s = P.addSlide(), last = n === slides.length - 1, c = PAL[n % 5];
        if (n === 0) {
          s.background = { color: NAVY };
          stripe(s, H - 0.22, 0.22);
          s.addText(sl.title || d.topic || "", Object.assign({}, T, { x: 0.8, y: 2.0, w: W - 1.6, h: 1.6, fontSize: 46, bold: true, color: "FFFFFF", valign: "bottom" }));
          s.addText((sl.bullets || []).join("\n"), Object.assign({}, T, { x: 0.8, y: 3.75, w: W - 1.6, h: 1.6, fontSize: 22, color: "A9DCF0", valign: "top" }));
        } else {
          s.background = { color: last ? "F2F7FC" : "FFFFFF" };
          s.addShape(P.ShapeType.rect, { x: W - 0.28, y: 0, w: 0.28, h: H, fill: { color: c }, line: { color: c } });
          s.addText(String(n + 1), { x: 0.5, y: 0.45, w: 0.9, h: 0.6, fontFace: FONT, fontSize: 16, bold: true, color: c, align: "left" });
          s.addText(sl.title || "", Object.assign({}, T, { x: 0.8, y: 0.45, w: W - 1.7, h: 1.0, fontSize: 34, bold: true, color: NAVY }));
          s.addShape(P.ShapeType.rect, { x: W - 2.6, y: 1.5, w: 1.6, h: 0.07, fill: { color: c }, line: { color: c } });
          s.addText((sl.bullets || []).map(function (b) {
            return { text: b, options: { bullet: { code: "25CF" }, paraSpaceAfter: 14, breakLine: true } };
          }), Object.assign({}, T, { x: 0.8, y: 1.85, w: W - 1.7, h: H - 2.7, fontSize: 24, color: "102A43", valign: "top" }));
          s.addText(foot, Object.assign({}, T, { x: 0.8, y: H - 0.6, w: W - 1.7, h: 0.35, fontSize: 11, color: "5C7285" }));
        }
        if (sl.note) s.addNotes(sl.note);
      });
      P.writeFile({ fileName: (filename || d.topic || "מצגת") + ".pptx" });
    });
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
    box.querySelector('[data-a="wa"]').addEventListener("click", function () { emit("וואטסאפ", kind); });
    box.querySelector('[data-a="copy"]').addEventListener("click", function () {
      emit("העתקת קישור", kind);
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
      emit("QR", kind);
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

  /* QR מוכן בתוך קופסה — לפתיחה החיה, להצבעה ולענן (mecholel משתמש בזה גם בלוח החי) */
  LK.qr = function (box, url, size) {
    box.textContent = "";
    withQR(function (ok) {
      if (!ok || typeof QRCode === "undefined") { box.innerHTML = '<p class="lk-shx" dir="ltr">' + esc(url) + "</p>"; return; }
      new QRCode(box, { text: url, width: size || 170, height: size || 170, correctLevel: QRCode.CorrectLevel.M });
    });
  };

  /* ---------- ניטור: המחולל מאזין למה שהמורה עושה עם התוצרים (11.10.26) ---------- */
  LK.on = null;
  function emit(ev, d) { try { if (LK.on) LK.on(ev, d); } catch (e) {} }

  /* ---------- תוצאות התלמידים (11.10.26) ----------
     רק בשיעור שנבנה במחולל (מזהה של 32 תווים) ורק בעמוד התלמיד: הבוחן, דף העבודה, ההצבעה והענן
     שולחים לשרת. השם והכיתה נשמרים בדפדפן של התלמיד/ה (pmh.student), והמזהה האקראי של המכשיר
     (pmh.sid) מאפשר לעדכן את אותה שורה בהגשה חוזרת. אצל המורה — שום דבר לא נשלח. */
  var CUR = { student: false, live: false };
  function isGen(id) { return /^[a-f0-9]{32}$/.test(String(id || "")); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  LK.student = function () { var s = lsGet("pmh.student"); return s && s.name ? s : null; };
  LK.setStudent = function (name, cls) { lsSet("pmh.student", { name: String(name || "").trim().slice(0, 60), cls: String(cls || "").trim().slice(0, 20) }); };
  function sid() {
    var s = lsGet("pmh.sid");
    if (s && /^[a-f0-9]{16}$/.test(s)) return s;
    try { var a = new Uint8Array(8); crypto.getRandomValues(a); s = Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
    catch (e) { s = (Math.random().toString(16).slice(2) + "0000000000000000").slice(0, 16); }
    lsSet("pmh.sid", s);
    return s;
  }
  LK.sid = sid;
  /* שליחה לשרת. נכשל? ניסיון נוסף אחד אחרי 3 שניות — ואז הודעה למעלה */
  LK.submit = function (lid, kind, body) {
    var me = LK.student() || {};
    var payload = JSON.stringify({ action: "submit", lid: lid, kind: kind, sid: sid(), name: me.name || "", cls: me.cls || "",
      a: body.a, done: !!body.done, score: body.score, max: body.max });
    function once() { return fetch(LK.GEN, { method: "POST", body: payload }).then(function (r) { return r.json(); }); }
    return once().catch(function () { return new Promise(function (r) { setTimeout(r, 3000); }).then(once); })
      .catch(function () { return { ok: false, error: "network" }; });
  };
  function sentNote(host, d, retry) {
    var n = host.querySelector(".lk-sent") || host.appendChild(el("div", "lk-exp on lk-sent"));
    var ok = d && d.ok;
    n.innerHTML = ok ? "התשובות נשלחו למורה ✓" : "התשובות לא נשלחו. בדקו את החיבור לאינטרנט " +
      (retry ? '<button type="button" class="lk-btn">שליחה שוב</button>' : "ונסו שוב.");
    n.classList.toggle("bad", !ok);
    var b = n.querySelector("button");
    if (b) b.addEventListener("click", function () { b.disabled = true; b.textContent = "שולח…"; retry().then(function (r) { sentNote(host, r, retry); }); });
  }
  /* ספירות ההצבעה והענן — פתוחות, בלי שמות. סקר כל 4 שניות כל עוד הקופסה על המסך */
  function pollPublic(lid, k, box, paint) {
    var stopAt = Date.now() + 45 * 60000;
    function tick() {
      if (!box.isConnected || Date.now() > stopAt) return;
      if (!document.hidden && box.offsetParent !== null) {
        fetch(LK.GEN + "?live=" + lid + "&k=" + k).then(function (r) { return r.json(); }).then(function (d) { if (d && d.ok) paint(d); }).catch(function () {});
      }
      setTimeout(tick, 4000);
    }
    tick();
  }

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
    if (d.deck && d.deck.length && d.deck[0].type) return renderDeck2(d);
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

    /* עיצוב השקף (11.10.26): שקף פתיחה כהה, ושאר השקפים לבנים עם צבע מתחלף מפלטת האתר */
    function slideClass(n) {
      return "lk-slide " + (n === 0 ? "lk-s-title" : n === slides.length - 1 ? "lk-s-last" : "lk-s-c" + (n % 5));
    }
    function paint() {
      var s = slides[i];
      stage.innerHTML = '<div class="' + slideClass(i) + '"><div class="lk-num">' + (i + 1) + " / " + slides.length + "</div>" +
        "<h5>" + bidi(s.title) + "</h5><ul>" +
        (s.bullets || []).map(function (b) { return "<li>" + bidi(b) + "</li>"; }).join("") +
        '</ul><div class="lk-sfoot">' + esc(d.subject || "") + (d.topic ? " · " + esc(d.topic) : "") + "</div></div>";
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
    if (d.sheet && d.sheet.diff) return renderSheetDiff(d);
    var S = d.sheet || {};
    if (!S.tasks) return el("div", "lk-empty", "אין דף עבודה בקובץ התוכן הזה.");
    var h = '<div class="lk-sheet">';
    h += "<h5 style=\"font-size:var(--fs-xl);color:var(--navy);margin:0 0 4px\">" + bidi(S.title || d.topic) + "</h5>";
    h += '<div class="lk-name"><span>שם: ________________</span><span>כיתה: ________</span><span>תאריך: __________</span></div>';
    if (S.intro) h += '<p class="lk-q" style="margin-bottom:18px">' + nlb(S.intro) + "</p>";

    S.tasks.forEach(function (t) {
      h += '<div class="lk-task"><div class="lk-q"><b>' + esc(t.n) + ".</b> " + nlb(t.text) + "</div>";
      if (t.example) h += '<div class="lk-eg">' + nlb(t.example) + "</div>";
      h += '<div class="lk-lines" data-k="' + esc(t.n) + '" data-n="' + (t.lines || 3) + '">' + new Array((t.lines || 3) + 1).join("<div></div>") + "</div></div>";
    });
    if (S.bonus) {
      h += '<div class="lk-task"><div class="lk-q"><b>בונוס.</b> ' + nl(S.bonus) + "</div>" +
        '<div class="lk-lines" data-k="bonus" data-n="4">' + new Array(5).join("<div></div>") + "</div></div>";
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
    var body = el("div", "lk-body", h);
    wireSheet(body, d);
    return body;
  }

  /* דף עבודה מקוון — בעמוד התלמיד בשיעור מהמחולל: הקווים לכתיבה הופכים לשדות תשובה,
     הטיוטה נשמרת בדפדפן, ו"הגשה למורה" שולחת. אפשר להגיש שוב — ההגשה האחרונה נשמרת. */
  function wireSheet(wrap, d) {
    if (!(CUR.live && isGen(d.id))) return;
    var key = "pmh.sheet." + d.id, draft = lsGet(key) || {};
    wrap.querySelectorAll(".lk-lines[data-k]").forEach(function (L) {
      var ta = el("textarea", "lk-ans");
      ta.rows = Math.max(3, +L.getAttribute("data-n") || 3);
      ta.setAttribute("data-k", L.getAttribute("data-k"));
      ta.setAttribute("aria-label", "התשובה שלי");
      ta.placeholder = "כתבו כאן את התשובה";
      ta.value = draft[ta.getAttribute("data-k")] || "";
      ta.addEventListener("input", function () { draft[ta.getAttribute("data-k")] = ta.value; lsSet(key, draft); });
      L.parentNode.replaceChild(ta, L);
    });
    var foot = el("div", "lk-submit", '<button type="button" class="lk-btn primary">הגשה למורה</button><span>אפשר לתקן ולהגיש שוב — ההגשה האחרונה היא שנשמרת.</span>');
    (wrap.querySelector(".lk-sheet") || wrap).appendChild(foot);
    var btn = foot.querySelector("button");
    btn.addEventListener("click", function () {
      var diag = (d.sheet.diagnostic || []), picks = wrap.__diag || [];
      if (d.sheet.diff && picks.filter(function (x) { return x != null; }).length < diag.length) {
        sentNote(foot, { ok: false }); foot.querySelector(".lk-sent").textContent = "עונים קודם על שתי שאלות הפתיחה — הן קובעות את הערכה שלך.";
        return;
      }
      var t = {}, n = 0;
      wrap.querySelectorAll("textarea.lk-ans").forEach(function (ta) {
        var set = ta.closest(".lk-set");
        if (set && !set.classList.contains("on")) return;   /* בדיפרנציאלי — רק הערכה שנותבה */
        t[ta.getAttribute("data-k")] = ta.value;
        if (ta.value.trim()) n++;
      });
      if (!n) { sentNote(foot, { ok: false }); foot.querySelector(".lk-sent").textContent = "עוד לא כתבת תשובות."; return; }
      btn.disabled = true; btn.textContent = "שולח…";
      var send = function () { return LK.submit(d.id, "sheet", { a: { diag: picks, t: t }, done: true }); };
      send().then(function (r) { btn.disabled = false; btn.textContent = "הגשה למורה"; sentNote(foot, r, send); });
    });
  }

  /* ---------- 4 · פעילות פתיחה ---------- */
  function renderOpener(d) {
    if (d.opener && d.opener.otype) return renderOpener2(d);
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
          if (onScore) onScore(right, answered, items.length, n, oi);
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
    if (d.game && d.game.gameType) return renderGame2(d);
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
    /* בעמוד התלמיד — כל תשובה נשלחת (בשביל הלוח החי), והאחרונה מסמנת הגשה */
    var live = CUR.live && isGen(d.id), picks = Q.map(function () { return null; });
    quizCards(Q, host, function (right, answered, total, n, oi) {
      bar.update(right, answered, total);
      if (!live) return;
      picks[n] = oi;
      var done = answered === total, send = function () { return LK.submit(d.id, "quiz", { a: picks.slice(), done: done }); };
      send().then(function (r) { if (done) sentNote(wrap, r, send); });
    });

    wrap.__printHTML = Q.map(function (q, n) {
      return '<div class="lk-qcard"><div class="lk-qt">' + (n + 1) + ". " + esc(q.q) +
        " (" + ({ easy: "קל", medium: "בינוני", high: "מאתגר" }[q.level] || "") + ")</div>" +
        q.opts.map(function (o, i) { return '<div class="lk-a">' + (i === q.correct ? "✔ " : "○ ") + esc(o) + "</div>"; }).join("") +
        '<div class="lk-exp">' + esc(q.explain || "") + "</div></div>";
    }).join("");
    return wrap;
  }

  /* =====================================================================
     תוצרים מהמחולל (11.10.26) — פורמטים חדשים לצד הישנים של הבנק
     ===================================================================== */

  /* קישור יחסי לשורש האתר — עובד גם מ-mecholel.html וגם מ-shiur.html */
  function siteBase() {
    return /^https?:$/.test(location.protocol) ? location.origin + location.pathname.replace(/[^/]*$/, "") : LK.SITE;
  }

  /* ---------- משחק: נפתח בנגן המשחקים של האתר (12 סוגים) ---------- */
  var GAME_HE = { millionaire: "סולם הפרסים", trivia: "טריוויה", wheel: "גלגל השאלות", escape: "חדר בריחה", memory: "משחק זיכרון",
    matching: "התאמה", groups: "מיון לקבוצות", ordering: "סדר נכון", truefalse: "נכון / לא נכון", fillblank: "השלמת חסר",
    sentence: "סדר את המשפט", hangman: "נחשו את המילה" };
  function renderGame2(d) {
    var G = d.game, wrap = el("div", "lk-body lk-game2");
    var name = GAME_HE[G.gameType] || "משחק";
    wrap.appendChild(el("div", "lk-g2head", "<b>" + esc(name) + "</b><span>" + (G.items || []).length + " פריטים · משחקים על המסך או בטלפון</span>"));
    if (d.id) {
      var fr = el("iframe", "lk-gframe");
      /* אצל המורה (t=1) הנגן לא שולח תוצאות — רק תלמידים נספרים */
      fr.src = siteBase() + "tools/game-player/index.html?lid=" + d.id + (CUR.student ? "" : "&t=1");
      fr.title = name;
      fr.setAttribute("allow", "fullscreen");
      wrap.appendChild(fr);
    } else {
      wrap.appendChild(el("div", "lk-empty", "המשחק יוצג כאן ברגע שהשיעור יישמר."));
    }
    wrap.__printHTML = game2Print(G, true);
    wrap.__printStudent = game2Print(G, false);
    return wrap;
  }
  function game2Print(G, teacher) {
    var it = G.items || [], t = G.gameType, h = "<h4>" + esc(GAME_HE[t] || "משחק") + "</h4>";
    if (["millionaire", "trivia", "wheel"].indexOf(t) > -1) h += it.map(function (q, n) {
      return '<div class="lk-qcard"><div class="lk-qt">' + (n + 1) + ". " + esc(q.text) + "</div>" +
        (q.options || []).map(function (o, i) { return '<div class="lk-a">' + (teacher && i === q.correct ? "✔ " : "○ ") + esc(o) + "</div>"; }).join("") +
        (teacher ? '<div class="lk-exp">' + esc(q.explanation || "") + "</div>" : "") + "</div>";
    }).join("");
    else if (t === "matching") h += "<table><tbody>" + it.map(function (p) { return "<tr><td>" + esc(p.right) + "</td><td>" + (teacher ? esc(p.left) : "") + "</td></tr>"; }).join("") + "</tbody></table>";
    else if (t === "memory") h += "<table><tbody>" + it.map(function (p) { return "<tr><td>" + esc(p.front) + "</td><td>" + (teacher ? esc(p.back) : "") + "</td></tr>"; }).join("") + "</tbody></table>";
    else if (t === "groups") h += it.map(function (g) { return "<p><b>" + esc(g.name) + ":</b> " + (teacher ? esc((g.items || []).join(" · ")) : "") + "</p>"; }).join("");
    else if (t === "ordering") h += "<ol>" + it.slice().sort(function (a, b) { return a.position - b.position; }).map(function (x) { return "<li>" + esc(x.text) + "</li>"; }).join("") + "</ol>";
    else if (t === "escape") h += it.map(function (r, n) { return "<p><b>" + (n + 1) + ". " + esc(r.title) + "</b><br>" + esc(r.story) + "<br>" + esc(r.riddle) + (teacher ? "<br>תשובה: " + esc(r.answer) : "") + "</p>"; }).join("");
    else if (t === "truefalse") h += it.map(function (x, n) { return "<p>" + (n + 1) + ". " + esc(x.text) + (teacher ? " — <b>" + (x.correct ? "נכון" : "לא נכון") + "</b>. " + esc(x.explanation || "") : "") + "</p>"; }).join("");
    else if (t === "fillblank") h += it.map(function (x, n) { return "<p>" + (n + 1) + ". " + esc(x.sentence) + (teacher ? " — <b>" + esc(x.answer) + "</b>" : "") + "</p>"; }).join("");
    else if (t === "sentence") h += it.map(function (x, n) { return "<p>" + (n + 1) + ". " + esc(teacher ? x.sentence : shuffle(String(x.sentence).split(/\s+/)).join(" / ")) + "</p>"; }).join("");
    else if (t === "hangman") h += it.map(function (x, n) { return "<p>" + (n + 1) + ". " + esc(x.hint) + (teacher ? " — <b>" + esc(x.word) + "</b>" : "") + "</p>"; }).join("");
    return h;
  }

  /* ---------- פעילות פתיחה: 8 סוגים, כולם עובדים על המקרן ---------- */
  function openerBody2(O, wrap, d) {
    var D = O.data || {}, box = el("div", "lk-op2 lk-op-" + O.otype);
    function reveal(label, html, cls) {
      var b = el("button", "lk-btn lk-reveal" + (cls ? " " + cls : ""), label);
      b.type = "button";
      var r = el("div", "lk-rv", html);
      b.addEventListener("click", function () { r.classList.toggle("on"); });
      var w = el("div"); w.appendChild(b); w.appendChild(r); return w;
    }
    switch (O.otype) {
      case "question":
        box.appendChild(el("div", "lk-bigq", bidi(D.text)));
        var sec = Math.max(15, D.timerSeconds || 60), left = sec, tm = null;
        var clock = el("button", "lk-btn primary lk-timer", "⏱ " + sec + " שניות — התחלה");
        clock.type = "button";
        clock.addEventListener("click", function () {
          if (tm) { clearInterval(tm); tm = null; left = sec; clock.textContent = "⏱ " + sec + " שניות — התחלה"; return; }
          tm = setInterval(function () {
            left--; clock.textContent = "⏱ " + left;
            if (left <= 0) { clearInterval(tm); tm = null; clock.textContent = "הזמן נגמר!"; left = sec; }
          }, 1000);
        });
        box.appendChild(clock);
        if (D.hint) box.appendChild(reveal("רמז", bidi(D.hint)));
        if (D.answer) box.appendChild(reveal("כיוון לתשובה", bidi(D.answer), "lk-teacherish"));
        break;
      case "story":
        box.appendChild(el("div", "lk-story", nlb(D.text)));
        box.appendChild(el("div", "lk-bigq", bidi(D.discussionQuestion)));
        break;
      case "riddle":
        box.appendChild(el("div", "lk-bigq", bidi(D.question)));
        var hl = el("ol", "lk-hints"), hi = 0, hints = D.hints || [];
        var hb = el("button", "lk-btn primary", "רמז ראשון");
        hb.type = "button";
        hb.addEventListener("click", function () {
          if (hi >= hints.length) return;
          hl.appendChild(el("li", "", bidi(hints[hi++])));
          hb.textContent = hi < hints.length ? "רמז נוסף (" + hi + "/" + hints.length + ")" : "כל הרמזים נחשפו";
          hb.disabled = hi >= hints.length;
        });
        box.appendChild(hl); box.appendChild(hb);
        box.appendChild(reveal("הפתרון", "<b>" + bidi(D.answer) + "</b>"));
        break;
      case "truefalse":
        var grid = el("div", "lk-flips");
        (D.statements || []).forEach(function (s, n) {
          var c = el("button", "lk-flip", '<span class="f">' + (n + 1) + ". " + bidi(s.text) + "</span>" +
            '<span class="b ' + (s.isTrue ? "t" : "x") + '"><b>' + (s.isTrue ? "נכון" : "לא נכון") + "</b>" + bidi(s.explanation || "") + "</span>");
          c.type = "button";
          c.addEventListener("click", function () { c.classList.toggle("on"); });
          grid.appendChild(c);
        });
        box.appendChild(grid);
        break;
      case "dilemma":
        box.appendChild(el("div", "lk-story", nlb(D.scenario)));
        var ops = el("div", "lk-flips");
        (D.options || []).forEach(function (o, n) {
          var c = el("button", "lk-flip", '<span class="f"><b>' + "אבג"[n] + ".</b> " + bidi(o.text) + "</span>" +
            '<span class="b"><b>מה קורה?</b>' + bidi(o.result) + "</span>");
          c.type = "button";
          c.addEventListener("click", function () { c.classList.toggle("on"); });
          ops.appendChild(c);
        });
        box.appendChild(ops);
        break;
      case "twotruths":
        var tw = el("div", "lk-flips");
        var cards = (D.statements || []).map(function (s, n) {
          var c = el("div", "lk-flip lk-tt", '<span class="f">' + (n + 1) + ". " + bidi(s.text) + "</span>");
          c.dataset.lie = s.isLie ? "1" : "";
          tw.appendChild(c); return c;
        });
        box.appendChild(tw);
        var rv = el("button", "lk-btn primary", "חשיפה: מה השקר?");
        rv.type = "button";
        rv.addEventListener("click", function () {
          cards.forEach(function (c) { c.classList.add(c.dataset.lie ? "lie" : "truth"); });
          rv.disabled = true;
          if (D.explanation) box.appendChild(el("div", "lk-exp on", bidi(D.explanation)));
        });
        box.appendChild(rv);
        break;
      case "guessnumber":
        box.appendChild(el("div", "lk-bigq", bidi(D.question)));
        var row = el("div", "lk-guess", '<input type="number" inputmode="decimal" aria-label="הניחוש של הכיתה" placeholder="הניחוש של הכיתה">');
        var gb = el("button", "lk-btn primary", "בדיקה");
        gb.type = "button";
        var res = el("div", "lk-exp");
        gb.addEventListener("click", function () {
          var g = parseFloat(row.querySelector("input").value), a = Number(D.answer);
          var dir = isNaN(g) ? "" : g === a ? "בול! " : g < a ? "גבוה יותר. " : "נמוך יותר. ";
          res.innerHTML = dir + "התשובה: <b>" + esc(a.toLocaleString("he-IL")) + " " + esc(D.unit || "") + "</b>. " + bidi(D.explanation || "");
          res.classList.add("on");
        });
        row.appendChild(gb); box.appendChild(row); box.appendChild(res);
        break;
      case "vote":
        box.appendChild(el("div", "lk-bigq", bidi(D.question)));
        /* שלושה מצבים: ידני (+1 על המקרן) · חי (המורה פתח/ה הצבעה מהטלפונים) · תלמיד/ה (מצביע/ה פעם אחת) */
        var opts = D.options || [], votes = opts.map(function () { return 0; }), list = el("div", "lk-votes");
        var gen = isGen(d && d.id), mode = CUR.live && gen ? "student" : "manual";
        var vkey = gen ? "pmh.vote." + d.id : "", mine = vkey && lsGet(vkey) != null ? +lsGet(vkey) : -1;
        var cnt = el("div", "lk-cnt");
        var paintVotes = function () {
          var tot = votes.reduce(function (a, b) { return a + b; }, 0) || 1;
          var hide = mode === "student" && mine < 0;   /* לפני שהצביעו — בלי תוצאות, שלא ישפיע */
          list.innerHTML = "";
          opts.forEach(function (o, n) {
            var btn = mode === "manual" ? '<button type="button" class="lk-btn" aria-label="קול נוסף">+1</button>'
              : hide ? '<button type="button" class="lk-btn primary">בחירה</button>' : "";
            var r = el("div", "lk-vote" + (n === mine ? " mine" : "") + (btn ? "" : " nb"), btn + '<span class="t">' + bidi(o) + "</span>" +
              (hide ? "" : '<span class="bar"><i style="width:' + Math.round(votes[n] / tot * 100) + '%"></i></span><b>' + votes[n] + "</b>"));
            var b = r.querySelector("button");
            if (b) b.addEventListener("click", function () { if (mode === "manual") { votes[n]++; paintVotes(); } else cast(n); });
            list.appendChild(r);
          });
        };
        var follow = function () {
          pollPublic(d.id, "vote", list, function (x) {
            votes = opts.map(function (o, i) { return (x.counts || [])[i] || 0; });
            cnt.textContent = x.n + (x.n === 1 ? " הצביע/ה" : " הצביעו");
            paintVotes();
          });
        };
        var cast = function (n) {
          mine = n; paintVotes();
          LK.submit(d.id, "vote", { a: [n], done: true }).then(function (r) {
            if (r && r.ok) { lsSet(vkey, n); cnt.textContent = "ההצבעה נקלטה ✓"; follow(); }
            else { mine = -1; paintVotes(); cnt.textContent = "ההצבעה לא נקלטה — בדקו את החיבור ונסו שוב."; }
          });
        };
        paintVotes();
        box.appendChild(list);
        box.appendChild(cnt);
        if (mode === "student" && mine > -1) follow();
        if (!CUR.student && gen) box.appendChild(goLive("הצבעה מהטלפונים", "סורקים ומצביעים מהטלפון — הגרף מתמלא כאן", d, function (lbx) {
          mode = "live"; votes = opts.map(function () { return 0; }); paintVotes(); lbx.appendChild(cnt); follow(); emit("הצבעה חיה", "vote");
        }));
        break;
      case "wordcloud":
        box.appendChild(el("div", "lk-bigq", bidi(D.prompt)));
        if ((D.examples || []).length) box.appendChild(el("div", "lk-cloud-eg", "למשל: " + D.examples.map(bidi).join(" · ")));
        var cloud = el("div", "lk-cloud"), ccnt = el("div", "lk-cnt"), cgen = isGen(d && d.id);
        var paintCloud = function (x) {
          var words = x.words || [], mx = words.length ? words[0][1] : 1;
          if (!CUR.live) ccnt.textContent = x.n ? x.n + (x.n === 1 ? " שלח/ה מילים" : " שלחו מילים") : "";
          cloud.innerHTML = words.length ? words.map(function (w, i) {
            return '<span class="c' + (i % 5) + '" style="font-size:' + (1 + 1.7 * w[1] / mx).toFixed(2) + 'em">' + bidi(w[0]) + "</span>";
          }).join("") : '<span class="lk-cloud-empty">המילים יופיעו כאן</span>';
        };
        if (CUR.live && cgen) {
          var ckey = "pmh.cloud." + d.id, sent = lsGet(ckey) || [];
          var form = el("div", "lk-guess", '<input type="text" maxlength="30" aria-label="המילה שלי" placeholder="מילה אחת עד שלוש">');
          var sb = el("button", "lk-btn primary", "שליחה"); sb.type = "button";
          var inp = form.querySelector("input");
          var left = function () {
            sb.disabled = inp.disabled = sent.length >= 3;
            ccnt.textContent = sent.length ? "שלחת: " + sent.join(" · ") + (sent.length >= 3 ? " (אפשר עד 3)" : "") : "";
          };
          var showCloud = function () { if (!cloud.isConnected) { box.appendChild(cloud); paintCloud({ words: [] }); pollPublic(d.id, "cloud", cloud, paintCloud); } };
          sb.addEventListener("click", function () {
            var w = inp.value.trim();
            if (!w || sent.length >= 3) return;
            sb.disabled = true;
            LK.submit(d.id, "cloud", { a: sent.concat([w]), done: true }).then(function (r) {
              if (r && r.ok) { sent.push(w); lsSet(ckey, sent); inp.value = ""; left(); showCloud(); }
              else { left(); ccnt.textContent = "לא נשלח — בדקו את החיבור ונסו שוב."; }
            });
          });
          inp.addEventListener("keydown", function (e) { if (e.key === "Enter") sb.click(); });
          form.appendChild(sb); box.appendChild(form); box.appendChild(ccnt); left();
          if (sent.length) showCloud();
        } else if (!CUR.student && cgen) {
          box.appendChild(goLive("פתיחת הענן לטלפונים", "סורקים ושולחים מילה אחת עד שלוש — הענן נבנה כאן", d, function (lbx) {
            lbx.appendChild(ccnt); box.appendChild(cloud); paintCloud({ words: [] }); pollPublic(d.id, "cloud", cloud, paintCloud); emit("הצבעה חיה", "wordcloud");
          }));
        }
        break;
    }
    wrap.appendChild(box);
  }
  /* כפתור "חי" אצל המורה: QR לעמוד התלמיד של הפתיחה, ואז מתחילים לעקוב */
  function goLive(label, hint, d, start) {
    var w = el("div", "lk-golive");
    var b = el("button", "lk-btn primary", label); b.type = "button";
    w.appendChild(b);
    b.addEventListener("click", function () {
      var url = LK.shareURL(d.id, "opener");
      var lb = el("div", "lk-livebox", '<div class="lk-lqr"></div><div class="lk-ltx"><b>' + esc(hint) + '</b><div class="lk-url" dir="ltr"></div></div>');
      lb.querySelector(".lk-url").textContent = url;
      LK.qr(lb.querySelector(".lk-lqr"), url, 150);
      w.replaceChild(lb, b);
      start(lb.querySelector(".lk-ltx"));
    });
    return w;
  }
  function renderOpener2(d) {
    var O = d.opener, wrap = el("div", "lk-body");
    wrap.appendChild(el("div", "lk-card", "<h4>" + bidi(O.title) + '<span class="lk-min">' + esc(O.duration) + " דק׳ · " + esc(O.type || "") + "</span></h4>"));
    if (O.instructions) wrap.appendChild(el("div", "lk-card lk-teacher", '<h4>הפעלה — למורה</h4><p class="lk-q" style="margin:0">' + nl(O.instructions) + "</p>"));
    openerBody2(O, wrap, d);
    if (O.teacherNote) wrap.appendChild(el("div", "lk-note lk-teacher", "<b>הערת מרצה:</b> " + esc(O.teacherNote)));
    if (O.bridge) wrap.appendChild(el("div", "lk-card lk-teacher", '<h4>הגשר לשיעור — למורה</h4><p class="lk-q" style="margin:0">' + esc(O.bridge) + "</p>"));
    var D = O.data || {}, txt = function (x) { return esc(String(x == null ? "" : x)); };
    var body = { question: "<p>" + txt(D.text) + "</p>", story: "<p>" + txt(D.text) + "</p><p><b>" + txt(D.discussionQuestion) + "</b></p>",
      riddle: "<p>" + txt(D.question) + "</p><ol>" + (D.hints || []).map(function (h) { return "<li>" + txt(h) + "</li>"; }).join("") + "</ol>",
      truefalse: "<ol>" + (D.statements || []).map(function (s) { return "<li>" + txt(s.text) + "</li>"; }).join("") + "</ol>",
      dilemma: "<p>" + txt(D.scenario) + "</p><ol>" + (D.options || []).map(function (o) { return "<li>" + txt(o.text) + "</li>"; }).join("") + "</ol>",
      twotruths: "<ol>" + (D.statements || []).map(function (s) { return "<li>" + txt(s.text) + "</li>"; }).join("") + "</ol>",
      wordcloud: "<p>" + txt(D.prompt) + "</p>" + ((D.examples || []).length ? "<p>למשל: " + (D.examples || []).map(txt).join(" · ") + "</p>" : ""),
      guessnumber: "<p>" + txt(D.question) + "</p>", vote: "<p>" + txt(D.question) + "</p><ol>" + (D.options || []).map(function (o) { return "<li>" + txt(o) + "</li>"; }).join("") + "</ol>" }[O.otype] || "";
    var ans = { question: D.answer, riddle: D.answer, guessnumber: D.answer + " " + (D.unit || "") + " — " + (D.explanation || ""), twotruths: D.explanation,
      truefalse: (D.statements || []).map(function (s, n) { return (n + 1) + ". " + (s.isTrue ? "נכון" : "לא נכון") + " — " + s.explanation; }).join(" · "),
      dilemma: (D.options || []).map(function (o, n) { return "אבג"[n] + ". " + o.result; }).join(" · ") }[O.otype];
    wrap.__printStudent = '<div class="lk-card"><h4>' + esc(O.title) + "</h4>" + body + "</div>";
    wrap.__printHTML = wrap.__printStudent + (O.instructions ? "<p><b>הפעלה:</b> " + esc(O.instructions) + "</p>" : "") +
      (ans ? "<p><b>תשובות:</b> " + esc(ans) + "</p>" : "") + (O.teacherNote ? "<p><b>הערת מרצה:</b> " + esc(O.teacherNote) + "</p>" : "") +
      (O.bridge ? "<p><b>הגשר:</b> " + esc(O.bridge) + "</p>" : "");
    return wrap;
  }

  /* ---------- מצגת: פריסה לפי סוג השקף ---------- */
  var SL_ICON = {
    goal: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    question: '<path d="M9.1 9a3 3 0 1 1 4.2 2.8c-.8.4-1.3 1-1.3 1.9V15"/><circle cx="12" cy="18.5" r=".6"/><circle cx="12" cy="12" r="9.5"/>',
    concept: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    example: '<path d="M4 6h16M4 12h10M4 18h7"/><path d="m15 17 2 2 4-4"/>',
    compare: '<path d="M12 3v18"/><path d="M4 7h5M4 12h5M15 7h5M15 12h5"/>',
    task: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 2.5v3M15 2.5v3M8 11h8M8 15h5"/>',
    summary: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    exit: '<path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4M6 12h10"/>'
  };
  var SL_HE = { goal: "מטרה", question: "שאלה לדיון", concept: "מושג", example: "דוגמה פתורה", compare: "השוואה", task: "משימה", summary: "סיכום", exit: "כרטיס יציאה" };
  /* נוסחה בתוך משפט עברי: רצף של ספרות וסימני חשבון מבודד משמאל לימין */
  function mathBidi(s) {
    return bidi(s).replace(/([0-9][0-9,.%₪ ×÷=+−\-()]*[0-9%₪)])/g, function (m) { return /[×÷=]/.test(m) ? '<bdi dir="ltr">' + m + "</bdi>" : m; });
  }
  function slide2(s, n, total, d) {
    var k = s.type || "summary", b = s.bullets || [];
    var foot = '<div class="sfoot">' + esc(d.subject || "") + (d.topic ? " · " + esc(d.topic) : "") + "</div>";
    if (k === "title") {
      return '<section class="sl t-title"><div class="eyebrow">מחולל השיעורים · המרחב הפדגוגי</div><h1>' + bidi(s.title) + "</h1>" +
        b.map(function (x) { return '<p class="sub">' + bidi(x) + "</p>"; }).join("") + '<div class="bar"><i></i><i></i><i></i><i></i><i></i></div></section>';
    }
    var head = '<div class="num">' + ("0" + n).slice(-2) + '</div><div class="kick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (SL_ICON[k] || "") + "</svg><span>" + (SL_HE[k] || "") + "</span></div>";
    var body;
    if (k === "question") {
      body = "<h2>" + bidi(s.title) + "</h2><blockquote>" + mathBidi(s.big || "") + "</blockquote>" + b.map(function (x) { return '<p class="hint">' + bidi(x) + "</p>"; }).join("");
    } else if ((k === "concept" || k === "example" || k === "task") && s.big) {
      body = '<div class="split"><div class="txt"><h2>' + bidi(s.title) + '</h2><ol class="steps">' +
        b.map(function (x, i) { return '<li><b class="i">' + (i + 1) + "</b><span>" + mathBidi(x) + "</span></li>"; }).join("") +
        '</ol></div><div class="bigbox"><bdi dir="ltr" class="big">' + esc(s.big) + "</bdi></div></div>";
    } else if (k === "compare" && s.left && s.right) {
      var col = function (c, cls) { return '<div class="col ' + cls + '"><b>' + bidi(c.label) + "</b><ul>" + (c.items || []).map(function (x) { return "<li>" + mathBidi(x) + "</li>"; }).join("") + "</ul></div>"; };
      body = "<h2>" + bidi(s.title) + '</h2><div class="cols">' + col(s.right, "a") + '<div class="vs">או</div>' + col(s.left, "b") + "</div>";
    } else if (k === "exit") {
      body = "<h2>" + bidi(s.title) + '</h2><ol class="cards">' + b.map(function (x, i) { return "<li><b>" + (i + 1) + "</b><span>" + mathBidi(x) + "</span></li>"; }).join("") + "</ol>";
    } else {
      body = "<h2>" + bidi(s.title) + '</h2><ul class="pts">' + b.map(function (x) { return "<li>" + mathBidi(x) + "</li>"; }).join("") + "</ul>";
    }
    return '<section class="sl t-' + esc(k) + '">' + head + '<div class="body">' + body + "</div>" + foot + "</section>";
  }
  function renderDeck2(d) {
    var slides = d.deck, i = 0;
    var wrap = el("div", "lk-body lk-deck2"), stage = el("div", "lk-d2stage");
    var note = el("div", "lk-note lk-teacher"), nav = el("div", "lk-nav");
    var prev = el("button", "lk-btn", "‹ הקודם"), next = el("button", "lk-btn", "הבא ›"), pos = el("span", "lk-pos"), dots = el("div", "lk-dots");
    function paint() {
      stage.innerHTML = slide2(slides[i], i + 1, slides.length, d);
      var s = slides[i];
      note.innerHTML = s.note ? "<b>הערת מרצה:</b> " + esc(s.note) : "";
      note.style.display = s.note ? "" : "none";
      pos.textContent = i + 1 + " / " + slides.length;
      prev.disabled = i === 0; next.disabled = i === slides.length - 1;
      Array.prototype.forEach.call(dots.children, function (b, n) { b.classList.toggle("on", n === i); });
    }
    slides.forEach(function (s, n) {
      var b = el("button", "lk-dot"); b.type = "button"; b.setAttribute("aria-label", "שקף " + (n + 1));
      b.addEventListener("click", function () { i = n; paint(); }); dots.appendChild(b);
    });
    prev.type = next.type = "button";
    prev.addEventListener("click", function () { if (i > 0) { i--; paint(); } });
    next.addEventListener("click", function () { if (i < slides.length - 1) { i++; paint(); } });
    nav.appendChild(prev); nav.appendChild(next); nav.appendChild(pos); nav.appendChild(dots);
    wrap.appendChild(stage); wrap.appendChild(note); wrap.appendChild(nav);
    var all = function (notes) {
      return '<div class="lk-deck2">' + slides.map(function (s, n) {
        return slide2(s, n + 1, slides.length, d) + (notes && s.note ? '<div class="lk-note"><b>הערת מרצה:</b> ' + esc(s.note) + "</div>" : "");
      }).join("") + "</div>";
    };
    wrap.__printHTML = all(true);
    wrap.__printStudent = all(false);
    paint();
    return wrap;
  }

  /* ---------- דף עבודה דיפרנציאלי: 2 שאלות מאבחנות → אחת משלוש ערכות ---------- */
  function renderSheetDiff(d) {
    var S = d.sheet, wrap = el("div", "lk-body lk-diff");
    var tasksHTML = function (tasks, si) {
      return (tasks || []).map(function (t) {
        return '<div class="lk-task"><div class="lk-q"><b>' + esc(t.n) + ".</b> " + nlb(t.text) + "</div>" +
          (t.example ? '<div class="lk-eg">' + nlb(t.example) + "</div>" : "") +
          '<div class="lk-lines" data-k="s' + si + "-" + esc(t.n) + '" data-n="' + (t.lines || 3) + '">' + new Array((t.lines || 3) + 1).join("<div></div>") + "</div></div>";
      }).join("");
    };
    var head = '<div class="lk-sheet"><h5 style="font-size:var(--fs-xl);color:var(--navy);margin:0 0 4px">' + bidi(S.title || d.topic) + "</h5>" +
      '<div class="lk-name"><span>שם: ________________</span><span>כיתה: ________</span><span>תאריך: __________</span></div>' +
      (S.intro ? '<p class="lk-q" style="margin-bottom:14px">' + nlb(S.intro) + "</p>" : "");
    wrap.innerHTML = head + '<div class="lk-diag"><b class="lk-diag-h">שלב 1 · שתי שאלות פתיחה</b><div class="lk-diag-q"></div>' +
      '<div class="lk-route lk-teacher"><b>הניתוב:</b> 0 תשובות נכונות ← ערכת בסיס · 1 ← ביניים · 2 ← מתקדם</div></div>' +
      '<div class="lk-sets">' + (S.sets || []).map(function (s, n) {
        return '<div class="lk-set" data-set="' + n + '"><div class="lk-set-h"><b>ערכה ' + (n + 1) + " · " + esc(s.level) + "</b>" +
          (s.intro ? "<span>" + bidi(s.intro) + "</span>" : "") + "</div>" + tasksHTML(s.tasks, n) + "</div>";
      }).join("") + "</div>" +
      (S.bonus ? '<div class="lk-task"><div class="lk-q"><b>אתגר.</b> ' + nl(S.bonus) + '</div><div class="lk-lines" data-k="bonus" data-n="4">' + new Array(5).join("<div></div>") + "</div></div>" : "") +
      (S.selfCheck && S.selfCheck.length ? '<div class="lk-check"><b>בדקתי את עצמי</b>' + S.selfCheck.map(function (c) { return '<label><input type="checkbox"><span>' + esc(c) + "</span></label>"; }).join("") + "</div>" : "") +
      "</div>" +
      (S.rubric && S.rubric.length ? '<div class="lk-card lk-teacher"><h4>מחוון למורה</h4><table class="lk-rubric"><thead><tr><th>משימה</th><th>תשובה וקריטריון</th><th>ניקוד</th></tr></thead><tbody>' +
        S.rubric.map(function (r) { return "<tr><td>" + esc(r.task) + "</td><td>" + esc(r.answer) + "</td><td>" + esc(r.points) + "</td></tr>"; }).join("") + "</tbody></table></div>" : "");
    var qHost = wrap.querySelector(".lk-diag-q"), answered = 0, right = 0, diag = S.diagnostic || [];
    diag.forEach(function (q, n) {
      var card = el("div", "lk-qcard", '<div class="lk-qt">' + (n + 1) + ". " + bidi(q.q) + '</div><div class="lk-opts"></div>');
      var opts = card.querySelector(".lk-opts");
      (q.opts || []).forEach(function (o, oi) {
        var b = el("button", "lk-a", bidi(o)); b.type = "button";
        b.addEventListener("click", function () {
          if (card.dataset.done) return;
          card.dataset.done = "1"; answered++; if (oi === q.correct) right++;
          (wrap.__diag = wrap.__diag || diag.map(function () { return null; }))[n] = oi;
          Array.prototype.forEach.call(opts.children, function (x, bi) { x.disabled = true; if (bi === oi) x.classList.add("sel"); });
          if (answered === diag.length) {
            var lvl = Math.min(right, 2);
            wrap.classList.add("routed");
            wrap.querySelectorAll(".lk-set").forEach(function (s) { s.classList.toggle("on", +s.dataset.set === lvl); });
            var msg = el("div", "lk-exp on lk-routed", "מעולה! הערכה שלך: <b>ערכה " + (lvl + 1) + " · " + esc((S.sets[lvl] || {}).level || "") + "</b>. ממשיכים למטה ↓");
            qHost.parentNode.appendChild(msg);
            /* בלוח של המורה — מי התחיל ולאיזו ערכה נותב/ה */
            if (CUR.live && isGen(d.id)) LK.submit(d.id, "sheet", { a: { diag: wrap.__diag, t: {} }, done: false });
          }
        });
        opts.appendChild(b);
      });
      qHost.appendChild(card);
    });
    var printSets = function () {
      return head + "<p><b>שאלות הפתיחה:</b></p><ol>" + diag.map(function (q) { return "<li>" + esc(q.q) + "<br>" + (q.opts || []).map(function (o) { return "○ " + esc(o); }).join("<br>") + "</li>"; }).join("") + "</ol>" +
        (S.sets || []).map(function (s, n) { return "<h4>ערכה " + (n + 1) + " · " + esc(s.level) + "</h4>" + tasksHTML(s.tasks, n); }).join("") + "</div>";
    };
    wrap.__printStudent = printSets();
    wrap.__printHTML = printSets() + '<p><b>הניתוב:</b> 0 נכונות ← בסיס · 1 ← ביניים · 2 ← מתקדם. תשובות לשאלות הפתיחה: ' +
      diag.map(function (q, n) { return (n + 1) + ". " + esc((q.opts || [])[q.correct] || ""); }).join(" · ") + "</p>" +
      (S.rubric && S.rubric.length ? "<h4>מחוון</h4><table><tbody>" + S.rubric.map(function (r) { return "<tr><td>" + esc(r.task) + "</td><td>" + esc(r.answer) + "</td><td>" + esc(r.points) + "</td></tr>"; }).join("") + "</tbody></table>" : "");
    wireSheet(wrap, d);
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
    CUR = { student: student, live: student && isGen(data.id) };
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
      /* מצגת → PowerPoint לעריכה · מערך ודף עבודה → Word לעריכה · השאר → קובץ שנפתח בדפדפן */
      var downLabel = student ? "הורדה" : kind === "deck" ? "PowerPoint לעריכה" : (kind === "sheet" || kind === "lesson") ? "Word לעריכה" : "הורדה";
      var bDown = el("button", "lk-btn",
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 11l5 5 5-5M4 19h16"/></svg>' + downLabel);
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
        emit("הצגה לכיתה", kind);
        LK.present(body, meta.title + " · " + data.topic);
      });
      if (bSend) bSend.addEventListener("click", function () {
        var old = panel.querySelector(".lk-share");
        if (old) { old.remove(); return; }
        emit("שליחה לכיתה", kind);
        panel.insertBefore(LK.share(data, kind, meta.title), body);
      });
      bPrint.addEventListener("click", function () { emit("הדפסה", kind); LK.print(source(), fname); });
      bDown.addEventListener("click", function () {
        emit("הורדה", kind + (student ? "" : " · " + downLabel));
        if (student) return LK.download(source(), fname, fname);
        if (kind === "deck") return LK.pptx(data, fname, bDown);
        if (kind === "sheet" || kind === "lesson") return LK.download(source(), fname, fname, "word");
        LK.download(source(), fname, fname);
      });

      tab.addEventListener("click", function () {
        Array.prototype.forEach.call(tabs.children, function (t) {
          t.classList.remove("on"); t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("on"); tab.setAttribute("aria-selected", "true");
        Array.prototype.forEach.call(host.querySelectorAll(".lk-panel"), function (p) { p.classList.remove("on"); });
        panel.classList.add("on");
        if (!student) emit("לשונית", kind);
      });
    });
  };

  global.LessonKit = LK;
})(window);
