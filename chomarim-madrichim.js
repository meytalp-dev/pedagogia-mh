/* ===== chomarim-madrichim.js — "חומרי למידה מהמדריכים" בעמוד המקצוע (20.10.26, מיטל) =====
   הקבצים שמדריכי תחום הדעת העלו למאגר שלהם במנור, אחרי שמיטל אישרה אותם לאתר
   (hadrachot/admin-chomarim.html). נטען מהשרת של מנור: site.materials — רק מאושרים.
   שימוש: הכותרת בעמוד (לפס הניווט), ומתחתיה <div class="mdr-box" data-subject="math" data-track="bagrut"></div>
   track: bagrut מציג בגרות+שניהם · gmar מציג גמר+שניהם. מגזרים — לפי המדריכ/ה. */
(function () {
  var EXEC = 'https://script.google.com/macros/s/AKfycbwDOLGv0Hr7KNjFJBIslJkDt9cDa2g4-Gfho3dTfI0AP3uwjlM3NGCwSnQkXZd4DUlyHg/exec';
  var SECTORS = [['kelali', 'כללי'], ['haredi', 'חרדי'], ['arab', 'ערבי']];
  var GENERAL = 'כללי';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function typeOf(f) {
    var m = /\.([A-Za-z0-9]{2,5})$/.exec(f.name || '');
    var ext = m ? m[1].toLowerCase() : '';
    if (f.kind === 'link' && !ext) return /youtu/.test(f.url) ? 'סרטון' : 'קישור';
    if (ext === 'pdf') return 'PDF';
    if (/^(ppt|pptx|key)$/.test(ext) || /presentation/.test(f.mime)) return 'מצגת';
    if (/^(doc|docx|odt)$/.test(ext) || /document/.test(f.mime)) return 'מסמך';
    if (/^(xls|xlsx|csv)$/.test(ext) || /sheet/.test(f.mime)) return 'גיליון';
    if (/^(png|jpe?g|gif|webp)$/.test(ext) || /^image\//.test(f.mime)) return 'תמונה';
    if (/^(mp4|mov|webm)$/.test(ext) || /^video\//.test(f.mime)) return 'סרטון';
    return ext ? ext.toUpperCase() : 'קובץ';
  }
  function cleanName(n) { return String(n || '').replace(/\.[A-Za-z0-9]{2,5}$/, '').replace(/_/g, ' ').trim(); }
  function safeUrl(u) { return /^https:\/\//i.test(String(u || '')) ? u : '#'; }

  function fileRow(f) {
    return '<a class="mdr-file" href="' + esc(safeUrl(f.url)) + '" target="_blank" rel="noopener">' +
      '<span class="mdr-name">' + esc(cleanName(f.name)) + '</span>' +
      '<span class="mdr-type">' + esc(typeOf(f)) + '</span>' +
      '<span class="sr-only"> (נפתח בלשונית חדשה)</span></a>';
  }

  // תיקיות לפי המדריכ/ה — כמו במאגר במנור; תיקייה בודדת נפתחת לבד
  function panelHtml(files) {
    var byGuide = {};
    files.forEach(function (f) { (byGuide[f.guide] = byGuide[f.guide] || []).push(f); });
    return Object.keys(byGuide).sort(function (a, b) { return a.localeCompare(b, 'he'); }).map(function (g) {
      var byFolder = {};
      byGuide[g].forEach(function (f) { var k = f.folder || GENERAL; (byFolder[k] = byFolder[k] || []).push(f); });
      var names = Object.keys(byFolder).sort(function (a, b) {
        if (a === GENERAL) return 1; if (b === GENERAL) return -1;
        return a.localeCompare(b, 'he', { numeric: true });
      });
      var one = names.length === 1;
      return '<div class="mdr-guide"><div class="mdr-by">מאת ' + esc(g) + ' · ' + byGuide[g].length + ' פריטים</div>' +
        names.map(function (n) {
          var list = byFolder[n].sort(function (a, b) { return a.name.localeCompare(b.name, 'he', { numeric: true }); });
          return '<details class="mdr-folder"' + (one ? ' open' : '') + '><summary><span>' + esc(n) + '</span><b>' + list.length + '</b></summary>' +
            '<div class="mdr-files">' + list.map(fileRow).join('') + '</div></details>';
        }).join('') + '</div>';
    }).join('');
  }

  function render(box, all) {
    var track = box.getAttribute('data-track');
    var files = all.filter(function (f) { return f.track === 'both' || f.track === track; });
    if (!files.length) {
      box.innerHTML = '<p class="mdr-empty">החומרים של המדריכים יעלו לכאן בקרוב.</p>';
      return;
    }
    var bySector = {};
    SECTORS.forEach(function (s) {
      bySector[s[0]] = files.filter(function (f) { return (f.sectors || []).indexOf(s[0]) >= 0; });
    });
    // מגזרים עם אותם קבצים בדיוק (מדריכ/ה שמלווה כללי וחרדי) — לשונית אחת "כללי · חרדי"
    var tabs = [];
    SECTORS.forEach(function (s) {
      var list = bySector[s[0]];
      if (!list.length) return;
      var sig = list.map(function (f) { return f.id; }).sort().join(',');
      var same = tabs.filter(function (t) { return t.sig === sig; })[0];
      if (same) { same[1] += ' · ' + s[1]; return; }
      var t = [s[0], s[1]]; t.sig = sig; tabs.push(t);
    });
    var uid = 'mdr-' + (box.getAttribute('data-subject') || '') + '-' + track;
    var bar = tabs.length > 1
      ? '<div class="mdr-tabs" role="tablist" aria-label="חומרי המדריכים לפי מגזר">' + tabs.map(function (s, i) {
          return '<button type="button" class="sbjtab" role="tab" id="' + uid + '-t-' + s[0] + '" aria-controls="' + uid + '-p-' + s[0] + '" aria-selected="' + (i ? 'false' : 'true') + '" tabindex="' + (i ? '-1' : '0') + '" data-mdr="' + s[0] + '"><span>' + s[1] + '</span><b class="sbjn">' + bySector[s[0]].length + '</b></button>';
        }).join('') + '</div>'
      : '';
    var panels = tabs.map(function (s, i) {
      return '<div class="mdr-panel" role="' + (bar ? 'tabpanel' : 'region') + '" id="' + uid + '-p-' + s[0] + '"' +
        (bar ? ' aria-labelledby="' + uid + '-t-' + s[0] + '"' : '') + (i ? ' hidden' : '') + '>' +
        (bar ? '' : '<div class="mdr-sector">' + s[1] + '</div>') + panelHtml(bySector[s[0]]) + '</div>';
    }).join('');
    box.innerHTML = bar + panels;
    if (!bar) return;
    var btns = [].slice.call(box.querySelectorAll('.mdr-tabs .sbjtab'));
    function show(key, focus) {
      btns.forEach(function (b) {
        var on = b.getAttribute('data-mdr') === key;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      [].forEach.call(box.querySelectorAll('.mdr-panel'), function (p) { p.hidden = p.id !== uid + '-p-' + key; });
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { show(b.getAttribute('data-mdr'), false); });
      b.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowLeft' ? (i + 1) % btns.length : e.key === 'ArrowRight' ? (i - 1 + btns.length) % btns.length : -1;
        if (n < 0) return;
        e.preventDefault(); show(btns[n].getAttribute('data-mdr'), true);
      });
    });
  }

  function load(box) {
    var subject = box.getAttribute('data-subject');
    var ck = 'pmh.mdr.' + subject;
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(ck) || 'null'); } catch (e) { cached = null; }
    if (cached) { render(box, cached); return; }
    box.innerHTML = '<p class="mdr-empty">טוען…</p>';
    fetch(EXEC + '?action=site.materials&subject=' + encodeURIComponent(subject))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var list = (j && j.ok && j.data) || [];
        try { sessionStorage.setItem(ck, JSON.stringify(list)); } catch (e) { /* בלי מטמון */ }
        render(box, list);
      })
      .catch(function () {
        box.innerHTML = '<p class="mdr-empty">לא הצלחנו לטעון את החומרים כרגע. נסו לרענן את העמוד.</p>';
      });
  }

  function init() { [].forEach.call(document.querySelectorAll('.mdr-box[data-subject]'), load); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
