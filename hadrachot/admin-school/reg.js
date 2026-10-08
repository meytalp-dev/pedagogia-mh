/* "טרם נרשמו למנור" במבט בית הספר (8.10.26, בקשת מיטל) — למנהל/ת ולרכז/ת הפדגוגי/ת.
   נתונים: registration.school (מפתח staff — השרת בודק שזה בית הספר שלך). שמות ומקצועות בלבד.
   "טרם נרשם/ה" = state none או started. הרשימה לפי אדם, לא לפי שורת מורה×מקצוע
   (לקח 6.10.26: "רשומים X מתוך Y" ספר שורות והרשימה ספרה אנשים). */
(function () {
  var sid = TS.urlParam('school', '');
  var box = document.getElementById('reg-container');
  var badge = document.getElementById('reg-count');
  if (!sid || !box) return;

  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var norm = function (n) { return String(n || '').replace(/\s+/g, ' ').trim(); };
  var toks = function (n) { return norm(n).split(/[\s\-]+/).filter(Boolean).sort().join(' '); };
  var st = (window.TS_staff && TS_staff.get()) || {};
  var teacherUrl = location.origin + ((window.TS_staff && TS_staff.ROOT) || '/hadrachot/') + 'teacher/';

  function render(rows) {
    var people = {}, order = [], registered = {}, all = {};
    rows.forEach(function (r) {
      if (r.state === 'leave') return;
      all[toks(r.name)] = 1;
      // ההרשמה היא של אדם, לא של מקצוע: מי שנרשם/ה באחד המקצועות — רשום/ה
      if (r.state !== 'none' && r.state !== 'started') registered[toks(r.name)] = 1;
    });
    rows.slice().sort(function (a, b) {
      return (a.subject || '').localeCompare(b.subject || '', 'he') || (a.name || '').localeCompare(b.name || '', 'he');
    }).forEach(function (r) {
      if (r.state !== 'none' && r.state !== 'started') return;
      var t = toks(r.name);
      if (registered[t]) return;   // שורה כפולה של מי שכבר רשום/ה (שם הפוך, רווח כפול)
      var p = people[t];
      if (!p) { p = people[t] = { name: norm(r.name), subjects: [], started: false }; order.push(t); }
      if (p.subjects.indexOf(r.subject) < 0) p.subjects.push(r.subject);
      if (r.state === 'started') p.started = true;
    });
    var list = order.map(function (t) { return people[t]; });
    var total = Object.keys(all).length;
    if (badge) badge.textContent = list.length ? '(' + list.length + ')' : '';

    if (!total) { box.innerHTML = '<div class="empty" style="padding:24px;">עדיין אין מורים רשומים לבית הספר במנור.</div>'; return; }
    if (!list.length) {
      box.innerHTML = '<p style="margin:4px 0 0; color:var(--ok); font-weight:700;">כל ' + total + ' המורים נרשמו למנור. תודה!</p>';
      return;
    }
    box.innerHTML =
      '<p style="margin:0 0 12px; color:var(--text-2); font-size:14px; line-height:1.7;">' +
        '<b style="color:var(--text);">' + list.length + '</b> מתוך ' + total + ' המורים בבית הספר טרם נרשמו. ' +
        'ההרשמה לוקחת דקה: בוחרים בית ספר, מקצוע ושם, ומקבלים קוד למייל.</p>' +
      '<ul style="list-style:none; margin:0 0 14px; padding:0;">' + list.map(function (p) {
        return '<li style="padding:8px 0; border-bottom:1px solid var(--border); display:flex; flex-wrap:wrap; gap:6px 10px; align-items:baseline;">' +
          '<b>' + esc(p.name) + '</b>' +
          '<span style="color:var(--text-2); font-size:13px;">' + esc(p.subjects.join(' · ')) + '</span>' +
          (p.started ? '<span style="font-size:12px; color:#92400e; background:var(--warn-soft); border-radius:999px; padding:0 8px;">קיבל/ה קוד ולא סיים/ה</span>' : '') +
          '</li>';
      }).join('') + '</ul>' +
      '<div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;">' +
        '<button type="button" class="btn btn-primary" id="reg-copy">העתקת הרשימה עם קישור ההרשמה</button>' +
        '<span id="reg-copied" style="color:var(--ok); font-size:14px;" aria-live="polite"></span>' +
      '</div>' +
      '<p style="margin:10px 0 0; font-size:13px; color:var(--text-2);">קישור ההרשמה למורים: ' +
        '<a href="' + esc(teacherUrl) + '" dir="ltr" target="_blank" rel="noopener">' + esc(teacherUrl.replace(/^https?:\/\//, '')) + '</a></p>';

    document.getElementById('reg-copy').addEventListener('click', function () {
      var text = 'מורים שטרם נרשמו למנור:\n' +
        list.map(function (p) { return '• ' + p.name + ' — ' + p.subjects.join(', '); }).join('\n') +
        '\n\nההרשמה לוקחת דקה: ' + teacherUrl;
      var done = function () { document.getElementById('reg-copied').textContent = 'הועתק. אפשר להדביק בהודעה למורים.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallback(text); done(); });
      else { fallback(text); done(); }
    });
  }

  function fallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  // נטען ברקע מיד (בשביל המספר על הלשונית) — לא מעכב את הנוכחות
  TS.api('registration.school', { sk: st.k || '', school: sid }, { cache: 'no' }).then(function (r) {
    if (r && r.ok) { render(r.data || []); return; }
    box.innerHTML = '<div class="empty" style="padding:24px;">' + (r && r.error === 'forbidden'
      ? 'הרשימה פתוחה רק אחרי כניסה בקוד מדף הבית של מנור.'
      : 'הטעינה נכשלה (השרת עמוס). רעננו את הדף בעוד רגע.') + '</div>';
  }).catch(function () {
    box.innerHTML = '<div class="empty" style="padding:24px;">הטעינה נכשלה. רעננו את הדף בעוד רגע.</div>';
  });
})();
