/* ============================================================
   training-report.js — דף "השתלמות מקצועית" (28.9.26, בקשת מיטל)
   -----------------------------------------------------------
   דף נפרד אצל כל מדריכ/ה (guide/hishtalmut.html) ובאדמין
   (ministry/hishtalmut.html). הקבוצות שמיטל ביקשה:
     מי ענה ומי טרם ענה · מי עבר וצירף אישור · מי עבר ולא צירף ·
     מי נרשם השנה (עם אישור / בלי) · מי לא עבר ולא נרשם.
   "לא עבר השתלמות" = נרשמו השנה + לא נרשמו.
   הסטטוס מ-teachers.list; האישורים מ-training.files (TS_training.files).
   בגרות וגמר של אותו אדם באותו מקצוע = שורה אחת.
   ============================================================ */
(function () {
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /* האם המורה בקבוצה של המדריכ/ה — אותם כללים כמו בדשבורד המדריכ/ה:
     מקצוע · מגזר · מסלול · ובקבוצה מפוצלת לפי יח"ל — הרמה שסומנה */
  function guideCovers(g, t) {
    if (!g) return false;
    var subs = window.TS_guideSubjects ? TS_guideSubjects(g) : [g.subject];
    if (subs.indexOf(t.subject) < 0) return false;
    if (g.sectors && g.sectors.indexOf(t.sector || 'kelali') < 0) return false;
    var type = t.type === 'gemer' ? 'gemer' : 'bagrut';
    if (Array.isArray(g.tracks) && g.tracks.length && g.tracks.indexOf(type) < 0) return false;
    if (Array.isArray(g.units) && g.units.length && type !== 'gemer') {
      var u = TS.unitsSet(t.units);
      return u.length ? u.some(function (x) { return g.units.indexOf(x) >= 0; }) : g.unmarked !== false;
    }
    return true;
  }

  function dedupe(rows) {
    var seen = {}, out = [];
    rows.forEach(function (t) {
      if (!String(t.name || '').trim()) return;
      var k = [t.school, String(t.name).trim(), String(t.subject || '').trim()].join('|');
      var prev = seen[k];
      if (prev) {
        prev.tracks.push(t.type === 'gemer' ? 'גמר' : 'בגרות');
        prev.ids.push(String(t.id));
        if (!prev.trainingStatus && t.trainingStatus) prev.trainingStatus = t.trainingStatus;
        return;
      }
      var r = Object.assign({}, t, { tracks: [t.type === 'gemer' ? 'גמר' : 'בגרות'], ids: [String(t.id)] });
      seen[k] = r; out.push(r);
    });
    return out;
  }

  var GROUPS = [
    { key: 'missing', title: 'טרם ענו', sub: 'עוד לא נרשמו למבט המורה — השאלה נשאלת בהרשמה', cls: 'neutral' },
    { key: 'none', title: 'לא עברו השתלמות ולא נרשמו השנה', sub: 'צריך לפנות אליהם בפרטי', cls: 'err' },
    { key: 'passed-nofile', title: 'עברו השתלמות — לא צירפו אישור', sub: 'לבקש את האישור', cls: 'warn' },
    { key: 'registered-nofile', title: 'נרשמו השנה — לא צירפו אישור', sub: 'לבקש את אישור ההרשמה', cls: 'warn' },
    { key: 'passed-file', title: 'עברו השתלמות וצירפו אישור', sub: '', cls: 'ok' },
    { key: 'registered-file', title: 'נרשמו השנה וצירפו אישור', sub: '', cls: 'info' }
  ];

  function groupOf(t, files) {
    var st = String(t.trainingStatus || '');
    if (!st) return 'missing';
    if (st === 'none') return 'none';
    // מ-29.9.26 files מחזיר גם מורים עם הערה בלי קובץ — קובץ = url לא ריק
    var f = t.ids.some(function (id) { return files[id] && files[id].url; });
    return st + (f ? '-file' : '-nofile');
  }
  function noteOf(t, files) {
    for (var i = 0; i < t.ids.length; i++) if (files[t.ids[i]] && files[t.ids[i]].note) return files[t.ids[i]].note;
    return '';
  }
  function fileOf(t, files) {
    for (var i = 0; i < t.ids.length; i++) if (files[t.ids[i]] && files[t.ids[i]].url) return files[t.ids[i]];
    return null;
  }

  var CSS =
    '.tr-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}' +
    '@media(max-width:760px){.tr-kpis{grid-template-columns:repeat(2,1fr)}}' +
    '.tr-kpi{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px}' +
    '.tr-kpi .l{font-size:12px;color:var(--text-muted);font-weight:600}' +
    '.tr-kpi .v{font-size:28px;font-weight:800;line-height:1.15;font-variant-numeric:tabular-nums;color:var(--primary-dark,#143E4C)}' +
    '.tr-kpi .s{font-size:11.5px;color:var(--text-muted)}' +
    '.tr-kpi.red{border-color:#E7C0B5;background:#FDF4F1}.tr-kpi.red .v{color:#a4442f}' +
    '.tr-flt{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 12px}' +
    '.tr-flt select,.tr-flt input{padding:8px 12px;border:1px solid var(--border);border-radius:9px;background:var(--surface);font:inherit;font-size:.84rem;color:var(--text)}' +
    '.tr-flt input{flex:1;min-width:160px}' +
    '.tr-grp{margin-bottom:14px;border:1px solid var(--border);border-radius:12px;background:var(--surface);overflow:hidden}' +
    '.tr-grp>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:12px 14px;flex-wrap:wrap}' +
    '.tr-grp>summary::-webkit-details-marker{display:none}' +
    '.tr-grp h2{margin:0;font-size:16px;flex:1;min-width:200px}' +
    '.tr-grp h2 small{display:block;font-size:12px;font-weight:500;color:var(--text-muted);margin-top:2px}' +
    '.tr-n{font-size:15px;font-weight:800;min-width:34px;text-align:center}' +
    '.tr-copy{font-family:inherit;font-size:12.5px;font-weight:600;padding:6px 12px;border-radius:9px;border:1px solid var(--border);background:#fff;color:var(--text);cursor:pointer}' +
    '.tr-wrap{overflow-x:auto;border-top:1px solid var(--border)}' +
    'table.tr-t{width:100%;border-collapse:collapse;font-size:13px}' +
    'table.tr-t th{background:var(--surface-soft);font-size:11.5px;font-weight:700;color:var(--text-muted);text-align:right;padding:8px 10px;white-space:nowrap}' +
    'table.tr-t td{padding:7px 10px;border-top:1px solid var(--border-soft,#E8EEF0)}' +
    'table.tr-t a{font-weight:700;color:var(--primary,#1A5365)}' +
    '.tr-empty{padding:12px 14px;font-size:13px;color:var(--text-muted)}';

  /* opts: { rows, files, guides: [{slug,name,...}] (אופציונלי — עמודת מדריכ/ה ומסנן) } */
  function render(el, opts) {
    if (!document.getElementById('tr-css')) {
      var st = document.createElement('style'); st.id = 'tr-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    var files = opts.files || {};
    var guides = opts.guides || null;
    var all = dedupe(opts.rows || []);
    all.forEach(function (t) {
      t._guides = guides ? guides.filter(function (g) { return guideCovers(g, t); }).map(function (g) { return g.name; }) : [];
    });
    var f = el._trF || (el._trF = { subject: '', school: '', guide: '', q: '' });
    var uniq = function (a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }).sort(function (a, b) { return a.localeCompare(b, 'he'); }); };
    var subjects = uniq(all.map(function (t) { return t.subject; }));
    var schools = uniq(all.map(function (t) { return t.schoolName; }));
    var gnames = guides ? uniq(guides.map(function (g) { return g.name; })) : [];
    var rows = all.filter(function (t) {
      if (f.subject && t.subject !== f.subject) return false;
      if (f.school && t.schoolName !== f.school) return false;
      if (f.guide && t._guides.indexOf(f.guide) < 0) return false;
      if (f.q && (t.name + ' ' + t.schoolName).toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
      return true;
    });
    var by = {}; GROUPS.forEach(function (g) { by[g.key] = []; });
    rows.forEach(function (t) { by[groupOf(t, files)].push(t); });
    var answered = rows.length - by.missing.length;
    var notPassed = by.none.length + by['registered-file'].length + by['registered-nofile'].length;
    var passed = by['passed-file'].length + by['passed-nofile'].length;
    var sel = function (id, label, list, val) {
      return list.length > 1 ? '<select id="' + id + '"><option value="">' + label + '</option>' +
        list.map(function (x) { return '<option' + (x === val ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>' : '';
    };
    var cols = '<th>שם</th><th>בית ספר</th><th>מקצוע</th><th>מסלול</th>' + (guides ? '<th>מדריכ/ה</th>' : '');
    el.innerHTML =
      '<div class="tr-kpis">' +
        '<div class="tr-kpi"><div class="l">ענו</div><div class="v">' + answered + '</div><div class="s">מתוך ' + rows.length + ' מורים</div></div>' +
        '<div class="tr-kpi' + (by.missing.length ? ' red' : '') + '"><div class="l">טרם ענו</div><div class="v">' + by.missing.length + '</div><div class="s">לא נרשמו למבט המורה</div></div>' +
        '<div class="tr-kpi"><div class="l">עברו השתלמות</div><div class="v">' + passed + '</div><div class="s">' + by['passed-file'].length + ' עם אישור · ' + by['passed-nofile'].length + ' בלי</div></div>' +
        '<div class="tr-kpi' + (by.none.length ? ' red' : '') + '"><div class="l">לא עברו השתלמות</div><div class="v">' + notPassed + '</div><div class="s">' +
          (by['registered-file'].length + by['registered-nofile'].length) + ' נרשמו השנה · ' + by.none.length + ' לא נרשמו</div></div>' +
      '</div>' +
      '<div class="tr-flt">' + sel('tr-subject', 'כל המקצועות', subjects, f.subject) + sel('tr-school', 'כל בתי הספר', schools, f.school) +
        sel('tr-guide', 'כל המדריכים', gnames, f.guide) +
        '<input type="search" id="tr-q" placeholder="חיפוש מורה / בית ספר" value="' + esc(f.q) + '"></div>' +
      GROUPS.map(function (g) {
        var list = by[g.key];
        return '<details class="tr-grp"' + (list.length && g.key !== 'passed-file' && g.key !== 'registered-file' ? ' open' : '') + ' data-g="' + g.key + '">' +
          '<summary><span class="badge ' + g.cls + ' tr-n">' + list.length + '</span><h2>' + g.title + (g.sub ? '<small>' + g.sub + '</small>' : '') + '</h2>' +
          (list.length ? '<button type="button" class="tr-copy" data-copy="' + g.key + '">העתקת הרשימה</button>' : '') + '</summary>' +
          (list.length ? '<div class="tr-wrap"><table class="tr-t"><thead><tr>' + cols +
            (g.key.indexOf('-file') > 0 ? '<th>אישור</th>' : '') + (g.key.indexOf('nofile') > 0 ? '<th>הערת המורה</th>' : '') + '</tr></thead><tbody>' +
            list.map(function (t) {
              var fl = fileOf(t, files);
              return '<tr><td>' + esc(t.name) + '</td><td>' + esc(t.schoolName) + '</td><td>' + esc(t.subject) + '</td><td>' + esc(t.tracks.join(' + ')) + '</td>' +
                (guides ? '<td>' + esc(t._guides.join(', ') || '—') + '</td>' : '') +
                (g.key.indexOf('-file') > 0 ? '<td>' + (fl ? '<a href="' + esc(fl.url) + '" target="_blank" rel="noopener">פתיחה</a>' : '') + '</td>' : '') +
                (g.key.indexOf('nofile') > 0 ? '<td>' + esc(noteOf(t, files)) + '</td>' : '') + '</tr>';
            }).join('') + '</tbody></table></div>'
            : '<div class="tr-empty">אין מורים בקבוצה הזו.</div>') +
        '</details>';
      }).join('');

    [['tr-subject', 'subject'], ['tr-school', 'school'], ['tr-guide', 'guide']].forEach(function (p) {
      var s = el.querySelector('#' + p[0]);
      if (s) s.onchange = function () { f[p[1]] = s.value; render(el, opts); };
    });
    var q = el.querySelector('#tr-q');
    var tmr = null;
    q.oninput = function () { clearTimeout(tmr); tmr = setTimeout(function () { f.q = q.value; render(el, opts); el.querySelector('#tr-q').focus(); }, 250); };
    el.querySelectorAll('[data-copy]').forEach(function (b) {
      b.onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        var txt = by[b.dataset.copy].map(function (t) { return [t.name, t.subject, t.schoolName].join(' · '); }).join('\n');
        var done = function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'העתקת הרשימה'; }, 1600); };
        try { navigator.clipboard.writeText(txt).then(done, function () { window.prompt('העתיקו:', txt); }); }
        catch (err) { window.prompt('העתיקו:', txt); }
      };
    });
  }

  window.TS_trainingReport = { render: render, guideCovers: guideCovers };
})();
