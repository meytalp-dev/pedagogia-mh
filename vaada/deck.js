/* ועדה מלווה — המצגת (4.11.26). מקור אחד לשקפים ושני פלטים:
   VAADA_DECK.collect(o)  → { slides, missing }: מצגת האב, כל מה שמולא.
   VAADA_DECK.agenda(o)   → { slides, missing }: השקפים הנבחרים לפי סדר היום: הצלחות, נתונים, תחנות, היוועצות, סיכום.
   VAADA_DECK.toPptx(o)   → קובץ PowerPoint, בדפדפן. שום דבר לא נשלח לשרת.
   VAADA_DECK.toHtml(slide) → שקף להצגה דיגיטלית.
   העיצוב כמו docs/vaada-melava-matzeget-tchilat-shana.pptx: רקע, פס צבעוני ולוגואים (deck/*.png),
   גופן David, צבע כותרת לפי תחום, טבלאות מימין לשמאל.
   תחום שלא מולא לא מקבל שקף. אין כאן שמות תלמידים, כי הם לא נשמרים במערכת.
   כל ערך נקרא דרך VAADA_PREFILL.deckValue: מה שנשמר גובר. נתון מוכן בלי שורת שנה נכנס רק אחרי אישור בית הספר.
   בגרף ערך חסר הוא null ולא 0: אפס אמיתי מקבל תווית, ערך חסר לא מצויר. */
var VAADA_DECK = (function () {
  'use strict';

  var FONT = 'David';
  var C = { blue: '3088C9', green: '359937', red: 'EB5859', purple: '9481BB', gold: 'A2752C', ink: '1A1A1A', muted: '595959', line: '8C8C8C', dark: '156082' };
  var TINT = { '3088C9': 'A6CAEC', '359937': 'B4E5A2', 'EB5859': 'FBD5D1', '9481BB': 'DDD3EC', '156082': 'A6CAEC' };
  var SEC_COLOR = { dualit: C.green, gmar: C.green, chanichut: C.green, taasuka: C.green, mgamot: C.green, hatmada: C.red, chevrati: C.red, yeutz: C.purple, shiluv: C.purple, aklim: C.purple, rigshi: C.purple };

  function txt(v) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\r/g, '').trim(); }
  function filled(v) {
    if (v == null) return false;
    if (typeof v === 'string') return !!v.trim();
    if (Array.isArray(v)) return v.some(filled);
    if (typeof v === 'object') return Object.keys(v).some(function (k) { return filled(v[k]); });
    return true;
  }
  function numOf(v) { var n = parseFloat(txt(v)); return isNaN(n) ? null : n; }
  function dmy(d) { return d ? String(d).slice(0, 10).split('-').reverse().join('.') : ''; }
  function pct(a, b) { return a != null && b > 0 ? Math.round(a / b * 100) : null; }
  function series(labels, rows, idx, name) {
    return { name: name, labels: labels, values: rows.map(function (r) { return numOf(r[idx]); }) };
  }
  function fieldOf(sec, k) { return sec.fields.filter(function (x) { return x.k === k; })[0]; }
  /* יש בשדה נתון בפועל. שם מגמה לבד הוא רק מילוי מראש של השורה */
  function hasValue(f, value) {
    if (f.t === 'file') return false;
    if (f.prefill !== 'megamotName') return filled(value);
    return (value || []).some(function (r) {
      return f.t === 'repeat'
        ? f.fields.some(function (x) { return x.k !== 'name' && filled(r[x.k]); })
        : filled((r || []).slice(1));
    });
  }

  /* ===== איסוף: שקף = כותרת, צבע, תחום ורשימת בלוקים (טבלה / גרף / תמונה) ===== */
  function Slide(title, color, sec) { this.title = title; this.color = color || C.blue; this.sec = sec || ''; this.blocks = []; }
  Slide.prototype.table = function (colW, head, rows, opts) {
    this.blocks.push({ type: 'table', colW: colW, head: head, rows: rows.map(function (r) { return r.map(txt); }), opts: opts || {} });
    return this;
  };
  /* סדרה או קטגוריה בלי אף ערך לא נכנסות. הצבע והמקרא נשארים של הסדרה המקורית */
  Slide.prototype.chart = function (ser, opts, h) {
    var palette = (opts && opts.colors) || (ser.length === 1 ? [C.blue] : [C.blue, C.green, C.purple, C.red, 'EEAC34']);
    var keep = ser.map(function (d, i) { return i; }).filter(function (i) { return ser[i].values.some(function (x) { return x != null; }); });
    if (!keep.length) return this;
    var cats = ser[0].labels.map(function (l, c) { return c; }).filter(function (c) { return keep.some(function (i) { return ser[i].values[c] != null; }); });
    this.blocks.push({
      type: 'chart', h: h || 2.6,
      series: keep.map(function (i) {
        return { name: ser[i].name, labels: cats.map(function (c) { return ser[i].labels[c]; }), values: cats.map(function (c) { return ser[i].values[c]; }) };
      }),
      opts: Object.assign({}, opts, { colors: keep.map(function (i) { return palette[i % palette.length]; }), legend: ser.length > 1 })
    });
    return this;
  };
  Slide.prototype.image = function (im) { this.blocks.push({ type: 'image', im: im }); return this; };

  function collect(o) {
    var V = o.V, v = V.v, images = o.images || [], slides = [], missing = [];
    function S(title, color, sec) { var s = new Slide(title, color, sec); slides.push(s); return s; }
    function val(sec, f) { return VAADA_PREFILL.deckValue(V, sec.id, f); }

    function tableRows(f, value) {
      var out = [];
      if (f.rows) f.rows.forEach(function (l, i) {
        var r = (value && value[i]) || [];
        if (filled(r)) out.push([l].concat(f.cols.map(function (c, j) { return txt(r[j]); })));
      });
      else (value || []).forEach(function (r) { if (filled(r)) out.push(f.cols.map(function (c, j) { return txt(r[j]); })); });
      return out;
    }
    function addFormTable(sl, f, value, opts) {
      var rows = tableRows(f, value);
      if (!rows.length) return false;
      var head = (f.rows ? [''] : []).concat(f.cols.map(function (c) { return c.l; }));
      var cw = opts && opts.colW ? opts.colW : head.map(function (h, i) { return f.rows && i === 0 ? 1.5 : 1; });
      sl.table(cw, head, rows, Object.assign({ heading: f.l, labelFirst: !!f.rows, fs: head.length > 5 ? 13 : undefined }, opts || {}));
      return true;
    }
    function addPlan(sl, p) {
      if (!filled(p)) return;
      var kv = [];
      if (txt(p.pride)) kv.push(['הגאווה הבית ספרית שלנו בתחום', txt(p.pride)]);
      if (txt(p.chal)) kv.push(['אתגרים מרכזיים', txt(p.chal)]);
      if (kv.length) sl.table([3, 9], null, kv, { labelFirst: true });
      (p.goals || []).forEach(function (g, i) {
        if (!filled(g)) return;
        var rows = (g.rows || []).filter(filled);
        sl.table([1, 1, 1], ['פעולות מרכזיות', 'משאבים / תכניות / מענים / יוזמות', 'מדדי הצלחה (איך נדע שהשגנו את היעד)'],
          rows.length ? rows : [['', '', '']], { heading: 'יעד מרכזי ' + (i + 1) + ': ' + txt(g.g) });
      });
    }

    /* פתיחה */
    var cover = S('', C.gold, '');
    cover.cover = { year: v.year, school: txt(v.school), date: dmy(v.date), rec: txt(v.recName) };

    /* מה סיכמנו בפעם הקודמת */
    var prev = (V.prev && V.prev.tasks) || [];
    var prevDone = prev.filter(function (t) { return t.draft !== 'כן' || t.refStatus; });
    if (prevDone.length) {
      S('מה סיכמנו ב' + V.prev.label).table([5, 1.5, 4.2, 1.1], ['משימה', 'סטטוס', 'מה למדנו', 'ממשיכים'],
        prevDone.map(function (t) { return [t.text + (t.owner ? ' (' + t.owner + ')' : ''), t.refStatus, t.refNote, t.refCont]; }));
    }
    var prevGaps = ((V.prev && V.prev.recs) || []).filter(function (r) { return r.ref; });
    if (prevGaps.length) S('הפערים שזוהו ב' + V.prev.label).table([6, 6], ['פער', 'מה קרה'], prevGaps.map(function (r) { return [r.text, r.ref]; }));

    /* התחומים לפי סדר המצגת */
    o.sections.forEach(function (sec) {
      var hasFile = (V.files || []).some(function (x) { return x.sec === sec.id; });
      /* ציוני האקלים נכנסים רק כשקפים משלהם, לא כטבלה נוספת בשקף התחום */
      var scoresF = sec.id === 'aklim' ? fieldOf(sec, 'scores') : null;
      var aklimT = scoresF ? aklimSlides(val(sec, scoresF), scoresF, sec.id) : [];
      aklimT.forEach(function (s) { slides.push(s); });
      var has = sec.fields.some(function (f) { return f !== scoresF && hasValue(f, val(sec, f)); });
      if (!has && !hasFile) { if (!sec.opt && !aklimT.length) missing.push(sec.title); return; }
      var color = SEC_COLOR[sec.id] || C.blue, sl = S(sec.title, color, sec.id);
      function get(k) { var f = fieldOf(sec, k); return { f: f, v: f ? val(sec, f) : null }; }

      if (sec.id === 'netunim') {
        var st = get('students'), rows = tableRows(st.f, st.v);
        var numeric = rows.filter(function (r) { return numOf(r[1]) != null; });
        if (numeric.length >= 2) sl.chart([{ name: 'מספר תלמידים', labels: numeric.map(function (r) { return r[0]; }), values: numeric.map(function (r) { return numOf(r[1]); }) }], { title: 'מספר תלמידים (נובמבר)', half: true }, 3.0);
        else if (rows.length) addFormTable(sl, st.f, st.v);
        var kv = sec.fields.filter(function (f) { return f.t !== 'table'; }).map(function (f) { return [f.l, txt(val(sec, f))]; }).filter(function (r) { return r[1]; });
        if (kv.length) sl.table([3, 9], null, kv, { labelFirst: true });
        return;
      }
      if (sec.id === 'gmar') {
        var el = get('elig'), er = tableRows(el.f, el.v);
        if (er.length) {
          addFormTable(sl, el.f, el.v, { fs: 14 });
          var ok = er.filter(function (r) { return r.slice(1, 5).some(function (x) { return numOf(x) != null; }); });
          if (ok.length >= 2) {
            var labs = ok.map(function (r) { return r[0]; });
            sl.chart([series(labs, ok, 1, 'מספר בוגרים'), series(labs, ok, 2, 'זכאים לתעודת מקצוע'), series(labs, ok, 3, 'בגרות טכנולוגית 14 יח\''), series(labs, ok, 4, 'בגרות מלאה')], { title: 'בוגרים וזכאות לאורך השנים' }, 2.9);
          }
        }
        ['subj', 'tracks'].forEach(function (k) { var x = get(k); addFormTable(sl, x.f, x.v, { fs: 14 }); });
        return;
      }
      if (sec.id === 'taasuka') {
        ['yod_a', 'yod_b'].forEach(function (k) {
          var x = get(k), rows = tableRows(x.f, x.v);
          if (!hasValue(x.f, x.v)) return;
          addFormTable(sl, x.f, x.v, { fs: 14, colW: [2.6, 1, 1, 1, 1] });
          var good = rows.filter(function (r) { return numOf(r[1]) > 0 || numOf(r[3]) > 0; });
          if (good.length) {
            var L = good.map(function (r) { return r[0]; });
            sl.chart([
              { name: 'תשפ"ו', labels: L, values: good.map(function (r) { return pct(numOf(r[2]), numOf(r[1])); }) },
              { name: 'תשפ"ז', labels: L, values: good.map(function (r) { return pct(numOf(r[4]), numOf(r[3])); }) }
            ], { title: 'אחוז המועסקים לפי מגמה · ' + x.f.l, percent: true, colors: [C.purple, C.green] }, 2.5);
          }
        });
        return;
      }
      if (sec.id === 'mgamot') {
        slides.pop();
        var list = get('list'), fs0 = sec.fields[0].fields;
        (list.v || []).filter(function (it) { return fs0.some(function (x) { return x.k !== 'name' && txt(it[x.k]); }); }).forEach(function (it) {
          S('מקצוע ומגמה · ' + (txt(it.name) || 'מגמה'), color, sec.id).table([3, 9], null,
            fs0.filter(function (x) { return x.k !== 'name' && txt(it[x.k]); }).map(function (x) { return [x.l, txt(it[x.k])]; }), { labelFirst: true });
        });
        return;
      }
      if (sec.id === 'hatmada') {
        var pl = get('plan'), dt = get('data'), dr = tableRows(dt.f, dt.v);
        addPlan(sl, pl.v);
        if (!sl.blocks.length) slides.pop();
        if (dr.length) {
          var sd = S('התמדה ונשירה · נתונים', color, sec.id);
          addFormTable(sd, dt.f, dt.v, { fs: 12, colW: [1, 1, 1.1, 1.1, 0.8, 1.6, 1.4, 2.4] });
          var G = dr.filter(function (r) { return numOf(r[5]) != null || numOf(r[6]) != null; });
          if (G.length) {
            var GL = G.map(function (r) { return r[0]; });
            sd.chart([series(GL, G, 5, 'נשירה סמויה'), series(GL, G, 6, 'נשירה גלויה')], { title: 'נשירה סמויה וגלויה לפי שכבה', colors: [C.purple, C.red] }, 2.8);
          }
        }
        return;
      }

      /* ברירת מחדל: השדות לפי הסדר */
      var pending = [];
      function flushKv() { if (pending.length) { sl.table([3, 9], null, pending, { labelFirst: true, labelFill: sec.id === 'sipur' ? 'C5E8F7' : null }); pending = []; } }
      sec.fields.forEach(function (f) {
        if (f === scoresF) return;
        var value = val(sec, f);
        if (f.t === 'text' || f.t === 'num' || f.t === 'area') { if (txt(value)) pending.push([f.l, txt(value)]); return; }
        flushKv();
        if (f.t === 'table') addFormTable(sl, f, value, f.k === 'jumps' ? { darkHead: true, colW: [1, 5, 3, 3] } : f.k === 'proud' ? { colW: [1, 11] } : {});
        else if (f.t === 'plan') addPlan(sl, value);
        else if (f.t === 'file') {
          var imgs = images.filter(function (i) { return i.sec === sec.id && i.field === f.k; });
          imgs.forEach(function (im) { S(sec.title + ' · ' + txt(im.name).replace(/\.[a-z0-9]+$/i, ''), color, sec.id).image(im); });
          var others = (V.files || []).filter(function (x) { return x.sec === sec.id && x.field === f.k && !imgs.some(function (i) { return i.id === x.id; }); });
          if (others.length) sl.table([3, 9], null, [['קבצים מצורפים במערכת', others.map(function (x) { return x.name; }).join('\n')]], { labelFirst: true });
        }
      });
      flushKv();
      if (!sl.blocks.length) slides.splice(slides.indexOf(sl), 1);
    });

    /* המלצות המפקח.ת */
    var recs = V.recs || [];
    if (recs.length) S('המלצות המפקח.ת').table([12], ['המלצות לוועדה הזו'], recs.map(function (r) { return [r.text]; }));

    /* פרוטוקול: מופיע רק אם כבר התקבלו החלטות */
    if ((V.tasks || []).length) {
      var P = S('פרוטוקול ועדה מלווה · שנת ' + v.year);
      var info = [['שם בית ספר', txt(v.school)], ['שם הרשת', txt(V.school.network)]];
      if (txt(v.parts)) info.push(['משתתפים', txt(v.parts)]);
      P.table([3, 9], null, info, { labelFirst: true });
      (o.doms || []).forEach(function (d) {
        var ts = V.tasks.filter(function (t) { var s = o.sectionOf(t.sec); return (s ? s.dom : 'general') === d[0]; });
        if (!ts.length) return;
        P.table([4, 1.8, 2.5, 2.5, 1.5], ['החלטות', 'גורם מרכזי ליישום', 'משאבים / תכניות / מענים / יוזמות', 'מדדי הצלחה', 'מועד מעקב ודיווח למפקח'],
          ts.map(function (t) { return [t.text, t.owner, t.res, t.measure, dmy(t.follow)]; }), { heading: d[1], fs: 14 });
      });
    }
    return { slides: slides, missing: missing };
  }

  /* שדה ציוני האקלים: שקף לכל קהל, עם טבלה רב-שנתית וגרף.
     סדר העמודות בשורה: קהל, ממד, תשפ"ה, תשפ"ו, בתי ספר דומים */
  function aklimSlides(value, f, secId) {
    var groups = {}, order = [], out = [];
    (value || []).filter(function (r) { return filled((r || []).slice(1)); }).forEach(function (r) {
      var g = txt(r[0]);
      if (!groups[g]) { groups[g] = []; order.push(g); }
      groups[g].push(r);
    });
    order.forEach(function (g) {
      var list = groups[g], s = new Slide('אקלים' + (g ? ' · ' + g : ''), C.purple, secId);
      var has = function (i) { return list.some(function (r) { return txt(r[i]); }); };
      var cols = [2, 3, 4, 5].filter(has), labels = list.map(function (r) { return txt(r[1]); });
      s.table([4].concat(cols.map(function () { return 1; })), [f.cols[1].l].concat(cols.map(function (i) { return f.cols[i].l; })),
        list.map(function (r) { return [txt(r[1])].concat(cols.map(function (i) { return txt(r[i]); })); }), { labelFirst: true, fs: list.length > 9 ? 12 : 14 });
      if (list.length <= 7) s.chart([3, 4].map(function (i) { return series(labels, list, i, f.cols[i].l); }), { title: 'אקלים' + (g ? ' ' + g : '') + ' לאורך השנים', colors: [C.purple, C.green], max100: true, dec: true }, 2.5);
      out.push(s);
    });
    return out;
  }

  /* ===== השקפים הנבחרים: סדר היום של הוועדה (נייר יעקבזון, 3.11.26) ===== */
  function agenda(o) {
    var V = o.V, master = collect(o), prep = (V.docs && V.docs.prep) || {}, slides = [];
    function S(title, color, sec) { var s = new Slide(title, color, sec); slides.push(s); return s; }
    function bySec(id) { return master.slides.filter(function (s) { return s.sec === id; })[0]; }
    slides.push(master.slides[0]);   /* פתיחה */

    var open = S('פתיחה ובמת הצלחות', C.blue, 'gaava');
    var gaava = o.sectionOf('gaava'), proudF = gaava ? fieldOf(gaava, 'proud') : null;
    var proud = proudF ? VAADA_PREFILL.deckValue(V, 'gaava', proudF) : null;
    var proudRows = (proud || []).map(function (r) { return txt(r[0]); }).filter(Boolean);
    open.table([12], ['3 דברים שאנחנו גאים בהם במיוחד'], proudRows.length ? proudRows.map(function (t) { return [t]; }) : [['טרם מולא']]);

    var data = S('נתונים בולטים ורצף רב-שנתי', C.blue, 'netunim');
    var net = bySec('netunim');
    if (net) net.blocks.filter(function (b) { return b.type === 'chart'; }).forEach(function (b) { data.blocks.push(b); });
    var prevT = ((V.prev && V.prev.tasks) || []).filter(function (t) { return t.draft !== 'כן' || t.refStatus; });
    if (prevT.length) data.table([5, 1.5, 4.2, 1.1], ['החלטות הוועדה הקודמת', 'סטטוס', 'מה למדנו', 'ממשיכים'], prevT.map(function (t) { return [t.text, t.refStatus, t.refNote, t.refCont]; }));
    var prevG = ((V.prev && V.prev.recs) || []).filter(function (r) { return r.ref; });
    if (prevG.length) data.table([6, 6], ['הפערים שזוהו בוועדה הקודמת', 'מה קרה'], prevG.map(function (r) { return [r.text, r.ref]; }));
    if (!data.blocks.length) data.table([12], null, [['טרם מולא']]);

    /* תחנה: צורך ← מטרה ומדדים ← פעולות ← משאבים */
    (prep.stations || []).filter(function (st) { return txt(st.title); }).forEach(function (st) {
      var color = SEC_COLOR[st.sec] || C.blue, s = S(txt(st.title), color, st.sec || 'station');
      var kv = [];
      if (txt(st.lead)) kv.push(['מוביל.ת התחנה', txt(st.lead)]);
      kv.push(['צורך', txt(st.need) || 'טרם נכתב']);
      if (txt(st.data)) kv.push(['הנתון שעליו הצורך נשען', txt(st.data)]);
      s.table([3, 9], null, kv, { labelFirst: true });
      var sec = st.sec ? o.sectionOf(st.sec) : null, planF = sec ? sec.fields.filter(function (f) { return f.t === 'plan'; })[0] : null;
      var plan = planF ? VAADA_PREFILL.deckValue(V, sec.id, planF) : null;
      ((plan && plan.goals) || []).forEach(function (g, i) {
        if (!filled(g)) return;
        var rows = (g.rows || []).filter(filled);
        s.table([1, 1, 1], ['פעולות', 'משאבים', 'מדדי הצלחה'], rows.length ? rows : [['', '', '']], { heading: 'מטרה ' + (i + 1) + ': ' + txt(g.g) });
      });
      if (txt(st.res)) s.table([3, 9], null, [['משאבים מסל התוכניות', txt(st.res)]], { labelFirst: true });
    });

    /* במת היוועצות */
    var iss = prep.issue || {};
    if (filled(iss.data) || filled(iss.price) || filled(iss.question)) {
      S('במת היוועצות', C.gold, 'consult').table([3, 9], null, [['הנתונים והבעיה', txt(iss.data)], ['המחירים', txt(iss.price)], ['שאלת ההיוועצות', txt(iss.question)]].filter(function (r) { return r[1]; }), { labelFirst: true })
        .table([1.6, 10.4], ['שלב', 'מה קורה'], [['שאלות בהרה', 'שאלות להבנה בלבד, בלי הצעות ובלי שיפוט.'], ['רעיונות וכיוונים', 'הצעות, ניסיון ומשאבים. המנהל מקשיב ורושם, בלי להגיב ובלי להצדיק.'], ['שיקוף', 'מה אני לוקח מכאן, ומה הצעד הראשון.']], { labelFirst: true });
    }

    /* סיכום: מה, מי, עד מתי */
    var sum = S('סיכום במליאה: החלטות ושיעורי בית', C.blue, 'summary');
    var ts = V.tasks || [];
    sum.table([6, 3, 2, 1], ['מה', 'מי', 'עד מתי', 'באחריות'], ts.length ? ts.map(function (t) { return [t.text, t.owner, dmy(t.follow), t.party || 'בית הספר']; }) : [['עדיין אין החלטות', '', '', '']]);
    return { slides: slides, missing: master.missing };
  }

  /* ===== PowerPoint ===== */
  /* אזור התוכן: בין הכותרת לבין הלוגואים שבתחתית */
  var X = 0.5, W = 12.33, TOP = 1.0, BOTTOM = 6.4;
  var FS = 16, LINE = 0.285, PAD = 0.13, CH = 0.102;

  /* כמה שורות תתפוס מחרוזת בעמודה ברוחב w. הערכה זהירה, כדי שטבלה לא תחרוג מהשקף */
  function linesOf(s, w, fs) {
    var per = Math.max(4, Math.floor((w - 0.2) / (CH * (fs || FS) / FS)));
    return txt(s).split('\n').reduce(function (n, p) { return n + Math.max(1, Math.ceil(p.length / per)); }, 0);
  }
  function rowHeight(cells, colW, fs) {
    var m = 1;
    cells.forEach(function (c) {
      var w = c.span ? colW.slice(c.at, c.at + c.span).reduce(function (a, b) { return a + b; }, 0) : colW[c.at];
      m = Math.max(m, linesOf(c.t, w, fs));
    });
    return m * LINE * ((fs || FS) / FS) + PAD;
  }
  /* תא ארוך מדי לעמוד אחד: חותכים בין מילים, וההמשך עובר לשקף הבא */
  function cutText(s, w, maxLines) {
    var per = Math.max(4, Math.floor((w - 0.2) / CH)), limit = per * maxLines;
    if (s.length <= limit) return [s, ''];
    var at = s.lastIndexOf(' ', limit);
    if (at < limit * 0.6) at = limit;
    return [s.slice(0, at).trim(), s.slice(at).trim()];
  }
  function cell(t, o) {
    var opt = { align: 'right', rtlMode: true, valign: 'top', fontFace: FONT, fontSize: o.fs || FS, bold: !!o.bold, color: o.color || C.ink, margin: 0.05 };
    if (o.fill) opt.fill = { color: o.fill };
    if (o.colspan) opt.colspan = o.colspan;
    return { text: t || '', options: opt };
  }

  function toPptx(o) {
    var out = o.selected ? agenda(o) : collect(o), v = o.V.v, base = o.base || '';
    var pres = new o.PptxGenJS();
    pres.layout = 'LAYOUT_WIDE';
    pres.rtlMode = true;
    pres.title = 'ועדה מלווה ' + v.year + ' · ' + v.school;
    pres.author = 'המרחב הפדגוגי';
    pres.company = 'המנהל להכשרה מקצועית';
    pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
    pres.defineSlideMaster({ title: 'CONTENT', background: { path: base + 'deck/bg-content.png' } });
    pres.defineSlideMaster({ title: 'COVER', background: { path: base + 'deck/bg-cover.png' } });

    function coverSlide(c) {
      var S = pres.addSlide({ masterName: 'COVER' });
      var box = { x: 2.0, w: 9.3, fontFace: FONT, align: 'center', rtlMode: true, isTextBox: true, margin: 0 };
      S.addText('ועדה מלווה ' + c.year, Object.assign({ y: 1.85, h: 0.65, fontSize: 38, bold: true, color: C.gold }, box));
      S.addText('תוכנית עבודה', Object.assign({ y: 2.5, h: 0.55, fontSize: 28, bold: true, color: C.gold }, box));
      S.addText('חינוך יוצר בית ספר מקצועי', Object.assign({ y: 3.05, h: 0.55, fontSize: 28, bold: true, color: C.gold }, box));
      S.addText('שם ביה"ס: ' + c.school, Object.assign({ y: 3.75, h: 0.45, fontSize: 22, bold: true, color: C.ink }, box));
      S.addText('תאריך: ' + c.date, Object.assign({ y: 4.2, h: 0.42, fontSize: 20, bold: true, color: C.ink }, box));
      if (c.rec) S.addText('רשם פרוטוקול הוועדה: ' + c.rec, Object.assign({ y: 4.95, h: 0.4, fontSize: 16, color: C.ink }, box));
    }
    function addChart(S, b, x, y, w, h) {
      var data = b.series, O = b.opts;
      S.addChart('bar', data.map(function (d) { return { name: d.name, labels: d.labels, values: d.values }; }), {
        x: x, y: y, w: w, h: h, barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 60,
        chartColors: O.colors, displayBlanksAs: 'gap',
        showTitle: !!O.title, title: O.title, titleFontFace: FONT, titleFontSize: 15, titleColor: C.ink,
        showLegend: !!O.legend, legendPos: 'b', legendFontFace: FONT, legendFontSize: 12, legendColor: C.ink,
        showValue: true, dataLabelPosition: 'outEnd', dataLabelFontFace: FONT, dataLabelFontSize: 12, dataLabelColor: C.ink,
        dataLabelFormatCode: O.percent ? '0"%"' : O.dec ? '0.0' : '#,##0',
        catAxisLabelFontFace: FONT, catAxisLabelFontSize: 12, catAxisLabelColor: C.ink, catAxisOrientation: 'maxMin',
        valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, valAxisMinVal: 0, valAxisMaxVal: O.percent || O.max100 ? 100 : undefined
      });
    }

    out.slides.forEach(function (sl) {
      if (sl.cover) return coverSlide(sl.cover);
      var page = 0, slide = null, y = TOP;
      function open() {
        page++;
        slide = pres.addSlide({ masterName: 'CONTENT' });
        slide.addText(sl.title + (page > 1 ? ' (המשך)' : ''), { x: X, y: 0.22, w: W, h: 0.68, fontFace: FONT, fontSize: 28, bold: true, color: sl.color, align: 'right', rtlMode: true, valign: 'middle', isTextBox: true, margin: 0, fit: 'shrink' });
        y = TOP;
      }
      function need(h) { if (!slide || y + h > BOTTOM) open(); }
      sl.blocks.forEach(function (b) {
        if (b.type === 'chart') {
          var h = Math.max(2.3, Math.min(b.h, BOTTOM - TOP));
          if (slide && BOTTOM - y >= 2.3) h = Math.min(h, BOTTOM - y - 0.1);
          need(h);
          addChart(slide, b, b.opts.half ? X : X, y, b.opts.half ? 6.0 : W, h);
          y += h + 0.15;
          return;
        }
        if (b.type === 'image') {
          open();
          var r = Math.min(W / (b.im.w || 1), (BOTTOM - TOP) / (b.im.h || 1)), iw = (b.im.w || 1) * r, ih = (b.im.h || 1) * r;
          slide.addImage({ data: b.im.data, x: X + (W - iw) / 2, y: TOP + (BOTTOM - TOP - ih) / 2, w: iw, h: ih, altText: txt(b.im.name) });
          return;
        }
        addTable(b);
      });
      if (!slide) open();

      /* טבלה שמתחלקת בין שקפים לפי הערכת גובה */
      function addTable(b) {
        var opts = b.opts, fs = opts.fs || FS, tint = TINT[sl.color] || TINT[C.blue];
        var total = b.colW.reduce(function (a, c) { return a + c; }, 0), scale = W / total;
        var colW = b.colW.map(function (w) { return w * scale; });
        var headRows = [];
        if (opts.heading) headRows.push({ kind: 'heading', cells: [{ t: opts.heading, at: 0, span: colW.length }] });
        if (b.head) headRows.push({ kind: 'head', cells: b.head.map(function (t, i) { return { t: t, at: i }; }) });
        var queue = b.rows.map(function (r) { return r.slice(); });
        var headH = headRows.reduce(function (s, r) { return s + rowHeight(r.cells, colW, fs); }, 0);
        while (queue.length) {
          need(headH + 0.5);
          var avail = BOTTOM - y - headH, used = 0, rows = [];
          while (queue.length) {
            var r = queue[0], h = rowHeight(r.map(function (t, i) { return { t: t, at: i }; }), colW, fs);
            if (used + h <= avail) { rows.push(queue.shift()); used += h; continue; }
            var fullPage = BOTTOM - TOP - headH;
            if (h > fullPage || (avail - used > 1.2 && h > 1.2)) {
              var maxL = Math.floor((avail - used - PAD) / LINE);
              if (maxL >= 2) {
                var first = [], rest = [];
                r.forEach(function (t, i) { var c = cutText(t, colW[i], maxL); first.push(c[0]); rest.push(c[1]); });
                rows.push(first); queue[0] = rest; used = avail;
                continue;
              }
            }
            break;
          }
          if (!rows.length) { open(); continue; }
          var data = headRows.map(function (hr) {
            return hr.kind === 'heading'
              ? [cell(hr.cells[0].t, { bold: true, fill: tint, colspan: colW.length, fs: fs })]
              : hr.cells.map(function (c) { return cell(c.t, { bold: true, fill: opts.darkHead ? C.dark : tint, color: opts.darkHead ? 'FFFFFF' : C.ink, fs: fs }); }).reverse();
          }).concat(rows.map(function (row) {
            return row.map(function (t, i) {
              var lab = opts.labelFirst && i === 0;
              return cell(t, { bold: lab, fill: lab ? (opts.labelFill || 'F2F2F2') : null, fs: fs });
            }).reverse();
          }));
          slide.addTable(data, { x: X, y: y, w: W, colW: colW.slice().reverse(), fontFace: FONT, fontSize: fs, border: { type: 'solid', pt: 0.75, color: C.line }, valign: 'top', autoPage: false });
          y += headH + used + 0.22;
          if (queue.length) open();
        }
      }
    });
    return { pres: pres, missing: out.missing };
  }

  /* ===== הצגה דיגיטלית ===== */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function chartHtml(b) {
    var data = b.series, O = b.opts, labels = data[0].labels, colors = O.colors;
    var maxV = O.percent || O.max100 ? 100 : Math.max.apply(null, data.map(function (d) { return Math.max.apply(null, d.values.concat([1])); }));
    var W0 = 720, H0 = 230, base = 195, top = 22, group = W0 / labels.length, bar = Math.min(62, (group * 0.72) / data.length);
    var h = '<figure class="dk-chart">' + (O.title ? '<figcaption>' + esc(O.title) + '</figcaption>' : '') + '<svg viewBox="0 0 ' + W0 + ' ' + H0 + '" role="img" aria-label="' + esc(O.title || 'גרף') + '">';
    labels.forEach(function (l, i) {
      /* השנה הראשונה בצד ימין */
      var gx = W0 - group * (i + 1), start = gx + (group - bar * data.length) / 2;
      data.forEach(function (d, j) {
        var val = d.values[i], bh = (val / maxV) * (base - top), x = start + bar * (data.length - 1 - j);
        if (val != null) {
          h += '<rect x="' + x.toFixed(1) + '" y="' + (base - bh).toFixed(1) + '" width="' + (bar - 3).toFixed(1) + '" height="' + bh.toFixed(1) + '" fill="#' + colors[j % colors.length] + '"></rect>';
          h += '<text x="' + (x + (bar - 3) / 2).toFixed(1) + '" y="' + (base - bh - 5).toFixed(1) + '" text-anchor="middle" font-size="13">' + val + (O.percent ? '%' : '') + '</text>';
        }
      });
      h += '<text x="' + (gx + group / 2).toFixed(1) + '" y="' + (base + 20) + '" text-anchor="middle" font-size="14">' + esc(l) + '</text>';
    });
    h += '<line x1="0" x2="' + W0 + '" y1="' + base + '" y2="' + base + '" stroke="#8c8c8c"></line></svg>';
    if (O.legend) h += '<div class="dk-legend">' + data.map(function (d, j) { return '<span><i style="background:#' + colors[j % colors.length] + '"></i>' + esc(d.name) + '</span>'; }).join('') + '</div>';
    return h + '</figure>';
  }
  function tableHtml(b, color) {
    var O = b.opts, tint = TINT[color] || TINT[C.blue], total = b.colW.reduce(function (a, c) { return a + c; }, 0);
    var h = '<table class="dk-tb' + (b.head ? '' : ' kv') + '"><colgroup>' + b.colW.map(function (w) { return '<col style="width:' + (w / total * 100).toFixed(1) + '%">'; }).join('') + '</colgroup>';
    if (O.heading || b.head) h += '<thead>';
    if (O.heading) h += '<tr><th colspan="' + b.colW.length + '" style="background:#' + tint + '">' + esc(O.heading) + '</th></tr>';
    if (b.head) h += '<tr>' + b.head.map(function (t) { return '<th style="background:#' + (O.darkHead ? C.dark : tint) + (O.darkHead ? ';color:#fff' : '') + '">' + esc(t) + '</th>'; }).join('') + '</tr>';
    if (O.heading || b.head) h += '</thead>';
    h += '<tbody>' + b.rows.map(function (r) {
      return '<tr>' + r.map(function (t, i) {
        var lab = O.labelFirst && i === 0, l = b.head && b.head[i] ? ' data-l="' + esc(b.head[i]) + '"' : '';
        return '<td' + l + (lab ? ' class="lab"' + (O.labelFill ? ' style="background:#' + O.labelFill + '"' : '') : '') + '>' + esc(t) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
    return h;
  }
  function toHtml(sl) {
    if (sl.cover) {
      var c = sl.cover;
      return '<div class="dk-cover"><div class="dk-frame"><h2>ועדה מלווה ' + esc(c.year) + '</h2><p class="g">תוכנית עבודה</p><p class="g">חינוך יוצר בית ספר מקצועי</p><p><b>שם ביה"ס: ' + esc(c.school) + '</b></p><p><b>תאריך: ' + esc(c.date) + '</b></p>' + (c.rec ? '<p class="s">רשם פרוטוקול הוועדה: ' + esc(c.rec) + '</p>' : '') + '</div></div>';
    }
    return '<h2 class="dk-title" style="color:#' + sl.color + '">' + esc(sl.title) + '</h2><div class="dk-body">' + sl.blocks.map(function (b) {
      if (b.type === 'table') return tableHtml(b, sl.color);
      if (b.type === 'chart') return chartHtml(b);
      return '<img class="dk-img" data-img="' + esc(b.im.id) + '" alt="' + esc(b.im.name) + '">';
    }).join('') + '</div>';
  }

  return { collect: collect, agenda: agenda, toPptx: toPptx, toHtml: toHtml, filled: filled };
})();
