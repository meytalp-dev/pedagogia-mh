/* "טרם נרשמו למנור" במבט המפקח.ת (22.10.26, מיטל: "כן תפתח") — כל בתי הספר בפריסת הפיקוח שלי.
   נתונים: registration.inspector (מפתח staff — השרת בודק מי המפקח/ת ומחזיר רק את בתי הספר שלו/ה).
   אותם כללים כמו בלשונית של מבט בית הספר (admin-school/reg.js): הרשימה לפי אדם, ומי שנרשם/ה
   באחד המקצועות נחשב/ת רשום/ה. בית ספר עם חוסרים נפתח לשמות + העתקה. */
(function () {
  var card = document.getElementById('reg-card');
  var box = document.getElementById('reg-container');
  var sumEl = document.getElementById('reg-summary');
  if (!card || !box || typeof TS === 'undefined') return;   // TS = const ב-app.js, לא על window

  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var norm = function (n) { return String(n || '').replace(/\s+/g, ' ').trim(); };
  var toks = function (n) { return norm(n).split(/[\s\-]+/).filter(Boolean).sort().join(' '); };
  var st = (window.TS_staff && TS_staff.get()) || {};
  if (!st.k) return;   // בלי כניסת בעלי תפקידים — לא מציגים כלום
  var teacherUrl = location.origin + ((window.TS_staff && TS_staff.ROOT) || '/hadrachot/') + 'teacher/';
  var isHq = (st.roles || []).some(function (r) { return r.role === 'ministry'; });
  var insp = (typeof INSP !== 'undefined') ? INSP : null;   // const ב-mabat.js — לא על window

  function bySchool(rows) {
    var all = {}, reg = {}, people = {}, order = [];
    rows.forEach(function (r) {
      if (r.state === 'leave') return;
      var t = toks(r.name);
      all[t] = 1;
      if (r.state !== 'none' && r.state !== 'started') reg[t] = 1;
    });
    rows.slice().sort(function (a, b) {
      return (a.subject || '').localeCompare(b.subject || '', 'he') || (a.name || '').localeCompare(b.name || '', 'he');
    }).forEach(function (r) {
      if (r.state !== 'none' && r.state !== 'started') return;
      var t = toks(r.name);
      if (reg[t]) return;
      var p = people[t];
      if (!p) { p = people[t] = { name: norm(r.name), subjects: [], started: false }; order.push(t); }
      if (p.subjects.indexOf(r.subject) < 0) p.subjects.push(r.subject);
      if (r.state === 'started') p.started = true;
    });
    return { total: Object.keys(all).length, list: order.map(function (t) { return people[t]; }) };
  }

  function copy(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, function () { fallback(text); done(); }); return; }
    fallback(text); done();
  }
  function fallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function render(d) {
    var rowsBy = {};
    (d.rows || []).forEach(function (r) { (rowsBy[r.school] = rowsBy[r.school] || []).push(r); });
    var schools = (d.schools || []).map(function (s) {
      var x = bySchool(rowsBy[s.id] || []);
      return { id: s.id, name: s.name, total: x.total, list: x.list };
    }).filter(function (s) { return s.total; })
      .sort(function (a, b) { return b.list.length - a.list.length || a.name.localeCompare(b.name, 'he'); });
    if (!schools.length) return;
    var total = schools.reduce(function (a, s) { return a + s.total; }, 0);
    var miss = schools.reduce(function (a, s) { return a + s.list.length; }, 0);
    sumEl.textContent = miss ? miss + ' מתוך ' + total + ' טרם נרשמו' : 'כולם נרשמו';
    box.innerHTML =
      '<p style="margin:0 0 12px; color:var(--text-2); font-size:14px; line-height:1.7;">' +
        'בתי הספר בפיקוחך. מורה שלא נרשם/ה למנור לא נספר/ת בנוכחות בהדרכות. ' +
        'המנהלים והרכזים הפדגוגיים רואים את אותה רשימה במבט בית הספר.</p>' +
      schools.map(function (s, i) {
        var head = '<b>' + esc(s.name) + '</b><span style="margin-inline-start:auto; font-size:13px; font-weight:700; color:' +
          (s.list.length ? '#a4442f' : 'var(--ok)') + ';">' + (s.list.length ? s.list.length + ' מתוך ' + s.total + ' טרם נרשמו' : 'כולם נרשמו ✓') + '</span>';
        if (!s.list.length) return '<div style="display:flex; gap:10px; padding:10px 4px; border-bottom:1px solid var(--border);">' + head + '</div>';
        return '<details style="border-bottom:1px solid var(--border);"><summary style="cursor:pointer; display:flex; gap:10px; padding:10px 4px; list-style:none;">' + head + '</summary>' +
          '<ul style="list-style:none; margin:0 0 10px; padding:0 4px;">' + s.list.map(function (p) {
            return '<li style="padding:6px 0; display:flex; flex-wrap:wrap; gap:4px 10px; align-items:baseline;"><span>' + esc(p.name) + '</span>' +
              '<span style="color:var(--text-2); font-size:13px;">' + esc(p.subjects.join(' · ')) + '</span>' +
              (p.started ? '<span style="font-size:12px; color:#92400e; background:var(--warn-soft); border-radius:999px; padding:0 8px;">קיבל/ה קוד ולא סיים/ה</span>' : '') + '</li>';
          }).join('') + '</ul>' +
          '<div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin:0 4px 12px;">' +
            '<button type="button" class="btn btn-secondary" data-reg-copy="' + i + '">העתקת הרשימה עם קישור ההרשמה</button>' +
            '<span data-reg-done="' + i + '" style="color:var(--ok); font-size:14px;" aria-live="polite"></span></div></details>';
      }).join('');
    box.querySelectorAll('[data-reg-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = schools[+b.getAttribute('data-reg-copy')];
        var text = 'מורים ב' + s.name + ' שטרם נרשמו למנור:\n' +
          s.list.map(function (p) { return '• ' + p.name + ' — ' + p.subjects.join(', '); }).join('\n') +
          '\n\nההרשמה לוקחת דקה: ' + teacherUrl;
        copy(text, function () { box.querySelector('[data-reg-done="' + b.getAttribute('data-reg-copy') + '"]').textContent = 'הועתק.'; });
      });
    });
    card.hidden = false;
  }

  var params = { sk: st.k };
  if (isHq && insp && insp.name) params.name = insp.name;   // מטה צופה במבט של מפקח/ת
  TS.api('registration.inspector', params, { cache: 'no' }).then(function (r) {
    if (r && r.ok && r.data) render(r.data);
  }).catch(function () {});
})();
