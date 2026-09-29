/* ============================================================
   training.js — שאלת ההשתלמות המקצועית במסכי הצפייה (28.9.26)
   -----------------------------------------------------------
   המורה עונה/ה בהרשמה למבט המורה (teacher/): האם עבר/ה השתלמות מקצועית
   ב-3 השנים האחרונות ברמת הלימוד שמלמד/ת; אם לא — האם נרשם/ה השנה.
   הסטטוס מגיע בכל שורת מורה ב-teachers.list (trainingStatus).
   הקישור לאישור הוא מסמך אישי ולכן לא יוצא ברשימה הפתוחה — רק דרך
   training.files, עם מפתח בעל תפקיד (ts.staff.v1) או מפתח מדריכ/ה (?g=&k=).

   שימוש:
     TS_training.chip(t, files)   → HTML: תג סטטוס + קישור לאישור (אם יש)
     TS_training.files()          → Promise<{ teacherId: {url, name} }>
     TS_training.counts(rows)     → { passed, registered, none, missing, total }
   ============================================================ */
(function () {
  var LABEL = { passed: 'עבר/ה השתלמות', registered: 'נרשם/ה השנה', none: 'לא נרשם/ה' };
  var CLS = { passed: 'ok', registered: 'info', none: 'err' };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var pending = null;

  function files() {
    if (pending) return pending;
    var body = {};
    try {
      var s = JSON.parse(localStorage.getItem('ts.staff.v1') || 'null');
      if (s && s.k) body.sk = s.k;
    } catch (e) { /* אחסון חסום — ננסה מפתח מדריכ/ה */ }
    if (!body.sk) {
      var qs = new URLSearchParams(location.search);
      if (qs.get('g') && qs.get('k')) { body.g = qs.get('g'); body.gk = qs.get('k'); }
    }
    if (!body.sk && !body.gk) return Promise.resolve({});
    pending = TS.api('training.files', body, { cache: 'no' })
      .then(function (r) { window.TS_training.filesOk = !!(r && r.ok); return (r && r.ok && r.data) || {}; })
      .catch(function () { return {}; });
    return pending;
  }

  function chip(t, fileMap) {
    var st = String((t && t.trainingStatus) || '');
    if (!st) return '<span class="badge neutral" title="המורה עוד לא נרשם/ה למבט המורה">טרם ענה/תה</span>';
    var f = fileMap && fileMap[String(t.id)];
    var note = f && f.note ? ' <span class="badge neutral" title="' + esc(f.note) + '">הערה</span>' : '';
    if (f && !f.url) f = null;
    return '<span class="badge ' + CLS[st] + '">' + LABEL[st] + '</span>' + note +
      (f ? ' <a class="badge neutral" href="' + esc(f.url) + '" target="_blank" rel="noopener" title="' +
        esc(f.name || 'אישור') + '">אישור</a>' : '');
  }

  function counts(rows) {
    var c = { passed: 0, registered: 0, none: 0, missing: 0, total: 0 };
    (rows || []).forEach(function (t) {
      c.total++;
      var st = String(t.trainingStatus || '');
      if (c[st] !== undefined && st !== 'missing' && st !== 'total') c[st]++; else c.missing++;
    });
    return c;
  }

  /* TS_training.mount(el, rows, { bySchool }) — מקטע מלא למנהל/ת, למפקח/ת ולמבט הארצי:
     שורה תחתונה (ספירה), סינון לפי תשובה, טבלה, ו"מי טרם ענה / לא נרשם" עם העתקה
     (כלל: כל דף מעקב מציג גם מי חסר). מורה בבגרות ובגמר באותו מקצוע = שורה אחת. */
  var CSS = '.trn-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 12px}' +
    '.trn-bar button.badge{border:1px solid transparent;cursor:pointer;font-family:inherit;font-size:13px;padding:4px 11px}' +
    '.trn-bar button.badge.on{border-color:currentColor}' +
    '.trn-copy{margin-inline-start:auto;font-size:12.5px;padding:5px 12px}' +
    '.trn-table{width:100%;border-collapse:collapse;font-size:13.5px}' +
    '.trn-table th{text-align:right;font-size:12px;color:var(--text-2);font-weight:700;padding:7px 8px;border-bottom:1px solid var(--border)}' +
    '.trn-table td{padding:7px 8px;border-bottom:1px solid var(--border);vertical-align:middle}' +
    '.trn-table a.badge{text-decoration:none}' +
    '.trn-wrap{overflow-x:auto}.trn-empty{padding:18px;color:var(--text-2);font-size:14px}' +
    '.trn-lead{font-size:13px;color:var(--text-2);line-height:1.6;margin:0 0 10px}';

  function dedupe(rows) {
    var seen = {}, out = [];
    (rows || []).forEach(function (t) {
      if (!String(t.name || '').trim()) return;
      var k = [t.school, String(t.name).trim(), String(t.subject || '').trim()].join('|');
      if (seen[k]) {
        // השורה עם תשובה גוברת על שורה בלי
        if (!seen[k].trainingStatus && t.trainingStatus) out[out.indexOf(seen[k])] = seen[k] = t;
        return;
      }
      seen[k] = t; out.push(t);
    });
    return out;
  }

  function mount(el, rows, opts) {
    if (!el) return;
    opts = opts || {};
    if (!document.getElementById('trn-css')) {
      var st = document.createElement('style'); st.id = 'trn-css'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    var list = dedupe(rows).sort(function (a, b) {
      return String(a.schoolName || '').localeCompare(String(b.schoolName || ''), 'he') ||
        String(a.subject || '').localeCompare(String(b.subject || ''), 'he') ||
        String(a.name || '').localeCompare(String(b.name || ''), 'he');
    });
    var filter = el.dataset.trnFilter || '';
    var fileMap = el._trnFiles || {};
    var c = counts(list);
    var show = list.filter(function (t) { return !filter || (t.trainingStatus || 'missing') === filter; });
    var btn = function (key, cls, label) {
      return '<button type="button" class="badge ' + cls + (filter === key ? ' on' : '') + '" data-f="' + key + '">' + label + '</button>';
    };
    el.innerHTML =
      '<p class="trn-lead">התשובה של כל מורה לשאלה בהרשמה למבט המורה: האם עבר/ה השתלמות מקצועית ב-3 השנים האחרונות ברמת הלימוד שמלמד/ת, ואם לא — האם נרשם/ה השנה.</p>' +
      '<div class="trn-bar">' +
        btn('passed', 'ok', c.passed + ' עברו') + btn('registered', 'info', c.registered + ' נרשמו השנה') +
        btn('none', 'err', c.none + ' לא נרשמו') + btn('missing', 'neutral', c.missing + ' טרם ענו') +
        (filter === 'none' || filter === 'missing'
          ? '<button type="button" class="btn btn-secondary trn-copy" data-copy>העתקת הרשימה</button>' : '') +
      '</div>' +
      (show.length ? '<div class="trn-wrap"><table class="trn-table"><thead><tr><th>שם</th>' +
        (opts.bySchool === false ? '' : '<th>בית ספר</th>') + '<th>מקצוע</th><th>השתלמות</th></tr></thead><tbody>' +
        show.map(function (t) {
          return '<tr><td>' + esc(t.name) + '</td>' +
            (opts.bySchool === false ? '' : '<td>' + esc(t.schoolName || '') + '</td>') +
            '<td>' + esc(t.subject || '') + '</td><td>' + chip(t, fileMap) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="trn-empty">אין מורים בסינון הזה.</div>');
    el.querySelectorAll('[data-f]').forEach(function (b) {
      b.onclick = function () {
        el.dataset.trnFilter = filter === b.dataset.f ? '' : b.dataset.f;
        mount(el, rows, opts);
      };
    });
    var cp = el.querySelector('[data-copy]');
    if (cp) cp.onclick = function () {
      var txt = show.map(function (t) {
        return [t.name, t.subject, opts.bySchool === false ? '' : t.schoolName].filter(Boolean).join(' · ');
      }).join('\n');
      var done = function () { cp.textContent = 'הועתק ✓'; setTimeout(function () { cp.textContent = 'העתקת הרשימה'; }, 1600); };
      try { navigator.clipboard.writeText(txt).then(done, function () { window.prompt('העתיקו:', txt); }); }
      catch (e) { window.prompt('העתיקו:', txt); }
    };
    if (!el._trnFilesAsked) {
      el._trnFilesAsked = true;
      files().then(function (m) { el._trnFiles = m; if (Object.keys(m).length) mount(el, rows, opts); });
    }
  }

  window.TS_training = { files: files, chip: chip, counts: counts, mount: mount, LABEL: LABEL };
})();
