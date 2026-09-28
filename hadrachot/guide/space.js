/* ============================================================
   חומרים והודעות לקבוצה — הצד של המדריכה (11.9.26)
   -----------------------------------------------------------
   מרחב המדריכה (קבצים · הודעות) נבנה ב-9.9.26 רק במבט המפקח.ת (mabat/),
   והמדריכה עצמה לא ראתה אותו (שירה סיבוני, 10.9.26). כאן היא מעלה חומרים
   ומפרסמת הודעות לקבוצת ההדרכה שלה, והמורים רואים אותם בעמוד הקבוצה —
   kvutza/?g=<slug> — שהיא שולחת פעם אחת לקבוצת הוואטסאפ.

   אותם טאבים בגיליון כמו ב-mabat (guide_files / guide_messages):
     byRole 'guide'     — חומר / הודעה לקבוצה, מופיע בעמוד הקבוצה
     byRole 'inspector' — נכתב במבט המפקח.ת, מוצג כאן למדריכה בלבד
   שעות פרטניות (14.9.26, קביעת מיטל): המדריכה רושמת ומעדכנת "מה עשינו
   במפגש" בטאב נפרד; המפקח.ת רואה אותן במבט המקצועי. הן לא חלק מעמוד
   הקבוצה — guide.group לא מחזיר אותן.
   נטען אחרי dashboard.js ומשתמש ב-GUIDE_CFG וב-state שלו.
   ============================================================ */
(function () {
  const SLUG = (typeof GUIDE_CFG !== 'undefined' && GUIDE_CFG.slug) || '';
  const MAX_FILE_BYTES = 8 * 1024 * 1024;   // זהה לתקרה בצד השרת
  const ICON_FILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';

  let data = { files: [], messages: [], hours: [], activities: [] };
  let loadFailed = false;

  document.addEventListener('DOMContentLoaded', () => {
    const tabBtn = document.getElementById('tab-btn-space');
    // בלי slug אין לאיזו קבוצה לפרסם (קישור ישן עם ?guide= בלבד)
    const hoursBtn = document.getElementById('tab-btn-hours');
    const mondayBtn = document.getElementById('tab-btn-monday');
    if (!SLUG) { [tabBtn, hoursBtn, mondayBtn].forEach(b => { if (b) b.hidden = true; }); return; }
    initLinkCard();
    loadContacts();
    document.getElementById('gmsg-send').addEventListener('click', sendMessage);
    initUpload();
    initHours();
    initActivities();
    initReport();
    loadSpace();
  });

  // ---------- קישור הקבוצה ----------
  function groupUrl() {
    return new URL('../kvutza/?g=' + encodeURIComponent(SLUG), location.href).href;
  }
  function subjectsLabel() {
    const subs = window.TS_guideSubjects ? window.TS_guideSubjects(GUIDE_CFG) : [];
    return subs.filter(Boolean).join(' ו') || GUIDE_CFG.subject || '';
  }
  function initLinkCard() {
    const url = groupUrl();
    document.getElementById('group-url').textContent = url;
    document.getElementById('group-open').href = url;
    const copyBtn = document.getElementById('group-copy');
    copyBtn.addEventListener('click', () => copyText(url, copyBtn));
  }

  function copyText(text, btn) {
    const label = btn.querySelector('span');
    const orig = label ? label.textContent : '';
    const done = () => {
      btn.classList.add('done');
      if (label) label.textContent = 'הועתק ✓';
      setTimeout(() => { btn.classList.remove('done'); if (label) label.textContent = orig; }, 2200);
    };
    const manual = () => window.prompt('העתיקי את הקישור:', text);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, manual);
    } else {
      manual();
    }
  }

  // ---------- טעינה ----------
  // cache:'no' — הודעה שפורסמה או קובץ שהועלה חייבים להופיע מיד
  async function loadSpace() {
    const res = await TS.api('guide.workspace', { guides: SLUG }, { cache: 'no' });
    if (res && res.ok && res.data) {
      loadFailed = false;
      data = {
        files: (res.data.files && res.data.files[SLUG]) || [],
        messages: (res.data.messages && res.data.messages[SLUG]) || [],
        hours: (res.data.hours && res.data.hours[SLUG]) || [],
        // שרת ישן בלי פעילויות — רשימה ריקה, לא שגיאה
        activities: (res.data.activities && res.data.activities[SLUG]) || []
      };
    } else {
      loadFailed = true;
    }
    render();
  }

  function render() {
    const badge = document.getElementById('space-count');
    const n = data.messages.filter(m => m.authorRole !== 'inspector').length;
    badge.textContent = n;
    badge.classList.toggle('zero', !n);
    renderMessages();
    renderMail();
    renderFiles();
    renderHours();
    renderActivities();
    renderReport();
  }

  function failBox() {
    return `<div class="empty" style="padding:18px; text-align:center;">
      לא נטען — תקלה רגעית בשרת.<br>
      <button type="button" class="btn btn-secondary" data-retry style="margin-top:10px;">לנסות שוב</button>
    </div>`;
  }
  function bindRetry(el) {
    const b = el.querySelector('[data-retry]');
    if (b) b.addEventListener('click', () => { b.disabled = true; loadSpace(); });
  }

  // ---------- הודעות ----------
  function renderMessages() {
    const list = document.getElementById('gmsg-list');
    const insp = document.getElementById('insp-msgs');
    if (loadFailed) { list.innerHTML = failBox(); bindRetry(list); insp.innerHTML = ''; return; }

    // השרת מחזיר בסדר כרונולוגי; לוח הודעות לקבוצה — החדשה למעלה
    const mine = data.messages.filter(m => m.authorRole !== 'inspector').slice().reverse();
    const fromInsp = data.messages.filter(m => m.authorRole === 'inspector');

    list.innerHTML = mine.length
      ? `<div class="space-sub">פורסמו לקבוצה (${mine.length})</div>` + mine.map(m => `
        <div class="msg">
          <div class="msg-head">
            <span class="msg-author">${esc(m.authorName || GUIDE_CFG.name || '')}</span>
            <span class="msg-time">${fmtWhen(m.createdAt)}</span>
          </div>
          <div class="msg-text">${linkify(m.text)}</div>
          <div class="msg-actions">
            <button type="button" class="row-del" data-del-msg="${esc(m.id)}">מחיקה</button>
          </div>
        </div>`).join('')
      : '<div class="empty" style="padding:18px;">עדיין לא פורסמו הודעות לקבוצה</div>';

    list.querySelectorAll('[data-del-msg]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('למחוק את ההודעה? היא תיעלם גם מעמוד הקבוצה.')) return;
      b.disabled = true;
      const res = await TS.apiPost('guide.message.delete', { id: b.dataset.delMsg });
      if (res && res.ok) TS.toast('ההודעה נמחקה');
      await loadSpace();   // גם בכישלון — אולי נמחקה בפועל והתשובה נפלה בדרך
    }));

    insp.innerHTML = fromInsp.length
      ? '<div class="space-sub">הערות מהמפקח.ת · רק לך, לא מוצגות לקבוצה</div>' + fromInsp.map(m => `
        <div class="msg insp">
          <div class="msg-head">
            <span class="msg-author">${esc(m.authorName || 'המפקח.ת')}</span>
            <span class="msg-time">${fmtWhen(m.createdAt)}</span>
          </div>
          <div class="msg-text">${linkify(m.text)}</div>
        </div>`).join('')
      : '';
  }

  /* 28.9.26 (מיטל): במקום וואטסאפ — ההודעה נשמרת בעמוד הקבוצה ונשלחת במייל
     אישי לכל מורה (guide.mail.send). השרת בונה את רשימת הנמענים בעצמו. */
  async function sendMessage() {
    const box = document.getElementById('gmsg-text');
    const subjBox = document.getElementById('gmsg-subject');
    const text = box.value.trim();
    if (!text) { box.focus(); return; }
    const withMail = document.getElementById('gmsg-mail').checked;
    const subject = subjBox.value.trim() || ('הודעה מ' + (GUIDE_CFG.name || 'המדריך/ה') + (subjectsLabel() ? ' · הדרכה ב' + subjectsLabel() : ''));
    const auth = window.GUIDE_AUTH ? window.GUIDE_AUTH() : {};
    if (withMail && !(auth.k || auth.ge)) {
      TS.toast('שליחה במייל דורשת כניסה מהקישור האישי — ההודעה תפורסם רק בעמוד הקבוצה');
    }
    const n = mailInfo().withEmail.length;
    if (withMail && (auth.k || auth.ge) && !confirm('לשלוח את ההודעה במייל ל-' + n + ' מורים?')) return;
    const btn = document.getElementById('gmsg-send');
    const status = document.getElementById('gmsg-status');
    btn.disabled = true;
    status.textContent = 'מפרסמת...';

    const res = await TS.apiPost('guide.message.add', {
      guide: SLUG,
      guideName: GUIDE_CFG.name || '',
      text: text,
      byName: GUIDE_CFG.name || '',
      byRole: 'guide'
    });
    // ב-POST אין ניסיון חוזר (הוא היה משכפל). אם התשובה נפלה בדרך, ייתכן
    // שההודעה נשמרה — בודקים בטעינה לפני שמבקשים מהמדריכה לפרסם שוב.
    await loadSpace();
    const landed = (res && res.ok) ||
      data.messages.some(m => m.authorRole !== 'inspector' && String(m.text).trim() === text);
    if (!landed) {
      btn.disabled = false;
      status.textContent = 'ההודעה לא פורסמה. נסי שוב בעוד רגע.';
      return;
    }
    box.value = '';
    if (!withMail || !(auth.k || auth.ge)) {
      btn.disabled = false;
      status.textContent = 'פורסם בעמוד הקבוצה ✓';
      return;
    }
    status.textContent = 'פורסם בעמוד הקבוצה ✓ · שולחת במייל... (זה לוקח כדקה)';
    const res2 = await TS.apiPost('guide.mail.send', Object.assign({}, auth, {
      subject: subject, text: text + '\n\nכל החומרים וההודעות של הקבוצה: ' + groupUrl()
    }));
    btn.disabled = false;
    const MAIL_ERR = {
      daily_limit: 'היום כבר נשלחו 3 מיילים לקבוצה — אפשר שוב מחר.',
      quota: 'מכסת המיילים היומית של המערכת כמעט נגמרה — לנסות מחר.',
      no_recipients: 'לאף מורה בקבוצה אין עדיין מייל.',
      bad_key: 'אין הרשאת שליחה מהקישור הזה.'
    };
    if (res2 && res2.ok) {
      subjBox.value = '';
      const d = res2.data || {};
      status.textContent = 'פורסם ✓ · נשלח במייל ל-' + (d.sent || 0) + ' מורים' +
        (d.missing && d.missing.length ? ' · ל-' + d.missing.length + ' אין מייל (ברשימת התפוצה)' : '');
    } else {
      status.textContent = 'פורסם בעמוד הקבוצה ✓ · המייל לא נשלח: ' + (MAIL_ERR[res2 && res2.error] || 'תקלה רגעית — ייתכן שחלק נשלחו. לא לשלוח שוב לפני שבודקים.');
    }
  }

  /* ---------- רשימת התפוצה + אלפון המורים (28.9.26) ----------
     מחושבת מרשימת הקבוצה שכבר בדף (dashboard.js) — אותו כלל כמו בשרת:
     אדם אחד לשם + בית ספר, מייל אחד לאדם. */
  /* פרטי הקשר המלאים — guide.contacts (רק עם מפתח המדריכ/ה). רשימת הקבוצה
     שבדף ממוסכת (teachers.list לא מחזיר מייל למי שאין לו חשבון). */
  let CONTACTS = null;       // id → { email, phone }; null = עוד לא נטען
  let contactsFailed = false;
  async function loadContacts() {
    const auth = window.GUIDE_AUTH ? window.GUIDE_AUTH() : {};
    if (!(auth.k || auth.ge)) return;
    const r = await TS.api('guide.contacts', auth, { cache: 'no' });
    if (r && r.ok && Array.isArray(r.data)) {
      CONTACTS = {};
      r.data.forEach(t => { CONTACTS[String(t.id)] = t; });
      contactsFailed = false;
    } else contactsFailed = true;
    renderMail();
  }
  window.SPACE_onAuth = loadContacts;
  function mailInfo() {
    const base = (typeof myTeachers === 'function') ? myTeachers() : myRoster();
    const all = CONTACTS ? base.map(t => Object.assign({}, t, { email: (CONTACTS[String(t.id)] || {}).email || '', phone: (CONTACTS[String(t.id)] || {}).phone || '' })) : base;
    const okMail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());
    const people = {}, list = [];
    all.forEach(t => {
      const k = String(t.name || '').replace(/\s+/g, ' ').trim().toLowerCase() + '|' + String(t.schoolName || '').trim().toLowerCase();
      let p = people[k];
      if (!p) { p = people[k] = { name: t.name || '', school: t.schoolName || '', email: '', phone: '', tracks: [] }; list.push(p); }
      if (!p.email && okMail(t.email)) p.email = String(t.email).trim().toLowerCase();
      if (!p.phone && t.phone) p.phone = String(t.phone).trim();
      const tr = t.type === 'gemer' ? 'גמר' : 'בגרות';
      if (p.tracks.indexOf(tr) < 0) p.tracks.push(tr);
    });
    list.sort((a, b) => String(a.school).localeCompare(String(b.school), 'he') || String(a.name).localeCompare(String(b.name), 'he'));
    const seen = {};
    const withEmail = list.filter(p => p.email && !seen[p.email] && (seen[p.email] = 1));
    return { all: list, withEmail: withEmail, missing: list.filter(p => !p.email) };
  }
  window.SPACE_onRoster = function () { renderMail(); };
  function renderMail() {
    const root = document.getElementById('mail-root');
    if (!root) return;
    const info = mailInfo();
    const nEl = document.getElementById('gmsg-mail-n');
    if (nEl) nEl.textContent = info.all.length ? '(' + info.withEmail.length + ')' : '';
    if (!info.all.length || !CONTACTS) {
      root.innerHTML = `<div class="empty" style="padding:18px;">${contactsFailed ? 'פרטי הקשר לא נטענו — תקלה רגעית. <button type="button" class="gl-btn" id="ml-retry"><span>לנסות שוב</span></button>'
        : (window.GUIDE_AUTH && (window.GUIDE_AUTH().k || window.GUIDE_AUTH().ge)) || CONTACTS === null ? 'טוען את רשימת התפוצה…' : 'רשימת התפוצה נפתחת מהקישור האישי.'}</div>`;
      const rb = document.getElementById('ml-retry');
      if (rb) rb.addEventListener('click', () => { contactsFailed = false; renderMail(); loadContacts(); });
      return;
    }
    const missMsg = 'שלום,\nכדי שהמורים יקבלו את ההודעות והתזכורות של ההדרכה במייל, חסרה לנו כתובת מייל של:\n\n' +
      info.missing.map(p => '• ' + p.name + (p.school ? ' — ' + p.school : '')).join('\n') +
      '\n\nאפשר להשיב לי עם הכתובות. תודה!\n' + (GUIDE_CFG.name || '');
    root.innerHTML = `
      <div class="ml-kpis">
        <div><b>${info.all.length - info.missing.length}</b><span>עם מייל</span></div>
        <div class="${info.missing.length ? 'warn' : ''}"><b>${info.missing.length}</b><span>חסר מייל</span></div>
        <div><b>${info.all.length}</b><span>מורים בקבוצה</span></div>
      </div>
      <div class="ml-actions">
        <button type="button" class="gl-btn" id="ml-copy-mails"><span>העתקת כל המיילים</span></button>
        <button type="button" class="gl-btn" id="ml-csv"><span>הורדת האלפון לאקסל</span></button>
      </div>
      ${info.missing.length ? `
      <details class="ml-miss">
        <summary>חסר מייל ל-${info.missing.length} מורים — הודעה מוכנה</summary>
        <ul>${info.missing.map(p => `<li>${esc(p.name)} <span>· ${esc(p.school)}</span></li>`).join('')}</ul>
        <button type="button" class="gl-btn" id="ml-copy-miss" style="margin-bottom:10px;"><span>העתקת הודעה עם הרשימה</span></button>
      </details>` : '<div class="space-hint" style="margin:0;">לכל המורים בקבוצה יש מייל.</div>'}
      <details class="ml-miss" style="border-color:var(--border);background:var(--surface);">
        <summary style="color:var(--text);">אלפון המורים (${info.all.length})</summary>
        <div class="rep-wrap" style="max-height:340px;overflow:auto;margin-bottom:10px;">
          <table class="rep-table"><tbody>
            <tr><th>שם</th><th>בית ספר</th><th>טלפון</th><th>מייל</th></tr>
            ${info.all.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.school)}</td><td dir="ltr">${p.phone ? `<a href="tel:${esc(p.phone.replace(/[^\d+]/g, ''))}">${esc(p.phone)}</a>` : '—'}</td><td dir="ltr">${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : '—'}</td></tr>`).join('')}
          </tbody></table>
        </div>
      </details>`;
    const copy = (text, b) => copyText(text, b);
    document.getElementById('ml-copy-mails').addEventListener('click', e => copy(info.withEmail.map(p => p.email).join(', '), e.currentTarget));
    const miss = document.getElementById('ml-copy-miss');
    if (miss) miss.addEventListener('click', e => copy(missMsg, e.currentTarget));
    document.getElementById('ml-csv').addEventListener('click', () => {
      const q = v => '"' + String(v || '').replace(/"/g, '""') + '"';
      const csv = '﻿' + ['שם,בית ספר,מסלול,טלפון,מייל'].concat(info.all.map(p =>
        [p.name, p.school, p.tracks.join(' + '), p.phone, p.email].map(q).join(','))).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'אלפון-מורים-' + (GUIDE_CFG.name || SLUG) + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
    });
  }

  /* ================================================================
     מאגר החומרים (28.9.26, מיטל: "כפתור בנפרד למאגר חומרים, כל קובץ שהמדריכים
     מעלים ייכנס אליו, לוגיקה לפי תיקיות — שילוב").
     שני סוגי תיקיות:
       · תיקייה לכל מפגש — נגזרת מ-plans.js ("מפגש 18.10 — <נושא>"), לא נשמרת.
       · תיקיות נושא — שם חופשי שהמדריכ/ה יוצר/ת בהעלאה, עד 3 רמות ("371 / פונקציות").
     כל קובץ נושא folder בגיליון; ריק = "כללי". קובץ או קישור (kind='link') —
     שניהם באותו מאגר. תיקיית הדרייב הקיימת של המדריכ/ה (guides.js → drive) מוצגת בראש.
     ================================================================ */
  const GENERAL = 'כללי';
  const NEW_FOLDER = '__new__';
  let libSearch = '';
  let libOpen = null;        // תיקיות פתוחות — שורד ציור מחדש

  function planFolders() {
    const plan = window.TS_planFor ? window.TS_planFor(SLUG) : null;
    return ((plan && plan.meetings) || []).map(m => {
      const p = String(m.date || '').split('-');
      return 'מפגש ' + Number(p[2]) + '.' + Number(p[1]) + (m.topic ? ' — ' + String(m.topic).replace(/\//g, '-').slice(0, 45) : '');
    });
  }
  // התיקייה שמוצעת בהעלאה: המפגש הקרוב (או של היום)
  function currentMeetingFolder() {
    const plan = window.TS_planFor ? window.TS_planFor(SLUG) : null;
    const ms = (plan && plan.meetings) || [];
    const today = todayStr();
    const idx = ms.findIndex(m => (m.date2 || m.date) >= today);
    const pf = planFolders();
    return idx >= 0 ? pf[idx] : (pf[pf.length - 1] || GENERAL);
  }
  function fileFolders() {
    return Array.from(new Set(data.files.map(f => f.folder || GENERAL)));
  }
  // כל התיקיות לבורר: קיימות (נושא) → מפגשים → כללי
  function allFolders() {
    const pf = planFolders();
    const topics = fileFolders().filter(f => f !== GENERAL && pf.indexOf(f) < 0).sort((a, b) => a.localeCompare(b, 'he'));
    return { topics: topics, meetings: pf };
  }

  function fillFolderSelect() {
    const sel = document.getElementById('lib-folder');
    if (!sel) return;
    const keep = sel.value;
    const F = allFolders();
    const opt = (v, label) => `<option value="${esc(v)}">${esc(label || v)}</option>`;
    sel.innerHTML =
      (F.topics.length ? `<optgroup label="תיקיות נושא">${F.topics.map(f => opt(f)).join('')}</optgroup>` : '') +
      (F.meetings.length ? `<optgroup label="לפי מפגש">${F.meetings.map(f => opt(f)).join('')}</optgroup>` : '') +
      opt(GENERAL) + opt(NEW_FOLDER, '+ תיקייה חדשה…');
    const all = [...F.topics, ...F.meetings, GENERAL, NEW_FOLDER];
    sel.value = all.indexOf(keep) >= 0 ? keep : currentMeetingFolder();
    if (!sel.value) sel.value = GENERAL;
    document.getElementById('lib-newfolder').hidden = sel.value !== NEW_FOLDER;
  }
  function chosenFolder() {
    const sel = document.getElementById('lib-folder');
    if (sel.value === NEW_FOLDER) return document.getElementById('lib-newfolder').value.trim();
    return sel.value === GENERAL ? '' : sel.value;
  }

  function renderDriveCard() {
    const box = document.getElementById('lib-drive');
    if (!box) return;
    const url = /^https:\/\//.test(GUIDE_CFG.drive || '') ? GUIDE_CFG.drive : '';
    box.innerHTML = url ? `<div class="lib-drive">${ICON_FILE}<span>תיקיית החומרים הקיימת שלך בדרייב</span>
      <a href="${esc(url)}" target="_blank" rel="noopener">פתיחה</a></div>` : '';
  }

  // עץ: { name, files: [], kids: {name: node} }
  function buildTree(files) {
    const root = { name: '', files: [], kids: {} };
    files.forEach(f => {
      const parts = (f.folder || GENERAL).split(' / ');
      let node = root;
      parts.forEach(p => { node = node.kids[p] = node.kids[p] || { name: p, files: [], kids: {} }; });
      node.files.push(f);
    });
    return root;
  }
  function countTree(n) { return n.files.length + Object.keys(n.kids).reduce((s, k) => s + countTree(n.kids[k]), 0); }

  function fileRowHtml(f, folders) {
    const fromInsp = f.uploaderRole === 'inspector';
    const isLink = f.kind === 'link';
    const meta = isLink ? (/drive\.google|docs\.google/.test(f.fileUrl) ? 'קישור לדרייב' : 'קישור')
      : '<bdi dir="ltr">' + fmtSize(f.size) + '</bdi>';
    const cur = f.folder || GENERAL;
    const move = fromInsp ? '' : `<select class="fr-move" data-move="${esc(f.id)}" title="העברה לתיקייה" aria-label="העברה לתיקייה">
      <option value="">העברה…</option>${folders.filter(x => x !== cur).map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select>`;
    return `
      <div class="file-row">
        <span class="fr-icon">${ICON_FILE}</span>
        <div class="fr-body">
          <a class="fr-name" href="${esc(safeUrl(f.fileUrl))}" target="_blank" rel="noopener">${esc(f.fileName)}</a>
          ${fromInsp ? '<span class="from-insp">מהמפקח.ת · רק לך</span>' : ''}
          <div class="fr-meta">${meta} · ${fmtWhen(f.createdAt)}</div>
        </div>
        ${move}
        ${fromInsp ? '' : `<button type="button" class="row-del" data-del-file="${esc(f.id)}" title="מחיקה">מחיקה</button>`}
      </div>`;
  }

  function folderHtml(node, path, folders, depth) {
    const full = path ? path + ' / ' + node.name : node.name;
    const kids = Object.keys(node.kids).sort((a, b) => a.localeCompare(b, 'he', { numeric: true }));
    const isMeeting = /^מפגש \d/.test(node.name);
    const open = libSearch || (libOpen && libOpen.has(full));
    return `
      <details class="lib-folder" data-folder="${esc(full)}"${open ? ' open' : ''}>
        <summary><svg class="mm-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
          <span>${esc(node.name)}</span>${isMeeting && depth === 0 ? '<span class="auto">מפגש</span>' : ''}<span class="c">${countTree(node)}</span></summary>
        <div class="lib-body">
          ${kids.map(k => folderHtml(node.kids[k], full, folders, depth + 1)).join('')}
          ${node.files.sort((a, b) => String(a.fileName).localeCompare(String(b.fileName), 'he', { numeric: true })).map(f => fileRowHtml(f, folders)).join('')}
        </div>
      </details>`;
  }

  function renderFiles() {
    const el = document.getElementById('gfiles-list');
    const badge = document.getElementById('lib-count');
    fillFolderSelect();
    renderDriveCard();
    if (loadFailed) { el.innerHTML = failBox(); bindRetry(el); return; }
    if (badge) { badge.textContent = data.files.length; badge.classList.toggle('zero', !data.files.length); }
    if (!libOpen) libOpen = new Set();
    const q = libSearch.trim().toLowerCase();
    const files = q ? data.files.filter(f => (String(f.fileName) + ' ' + (f.folder || '')).toLowerCase().indexOf(q) >= 0) : data.files;
    if (!files.length) {
      el.innerHTML = `<div class="empty" style="padding:18px;">${q ? 'לא נמצא במאגר' : 'המאגר עדיין ריק. מעלים קובץ למעלה — הוא נכנס לתיקייה שבחרת.'}</div>`;
      return;
    }
    const tree = buildTree(files);
    const F = allFolders();
    const folders = [...F.topics, ...fileFolders().filter(f => F.topics.indexOf(f) < 0 && f !== GENERAL), GENERAL]
      .filter((v, i, a) => a.indexOf(v) === i);
    // סדר: תיקיות נושא (א-ב) → מפגשים (לפי התוכנית) → כללי
    const pf = planFolders();
    const names = Object.keys(tree.kids).sort((a, b) => {
      const rank = n => n === GENERAL ? 2 : pf.indexOf(n) >= 0 ? 1 : 0;
      return rank(a) - rank(b) || (rank(a) === 1 ? pf.indexOf(a) - pf.indexOf(b) : a.localeCompare(b, 'he', { numeric: true }));
    });
    el.innerHTML = names.map(n => folderHtml(tree.kids[n], '', folders, 0)).join('');

    el.querySelectorAll('details.lib-folder').forEach(d => d.addEventListener('toggle', e => {
      e.stopPropagation();
      if (d.open) libOpen.add(d.dataset.folder); else libOpen.delete(d.dataset.folder);
    }));
    el.querySelectorAll('[data-del-file]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('למחוק את הקובץ מהמאגר? הוא ייעלם גם מהמורים.')) return;
      b.disabled = true;
      const res = await TS.apiPost('guide.file.delete', { id: b.dataset.delFile });
      if (res && res.ok) TS.toast('הקובץ נמחק');
      await loadSpace();
    }));
    el.querySelectorAll('[data-move]').forEach(s => s.addEventListener('change', async () => {
      if (!s.value) return;
      const auth = window.GUIDE_AUTH ? window.GUIDE_AUTH() : {};
      s.disabled = true;
      const res = await TS.apiPost('guide.file.move', Object.assign({}, auth, { id: s.dataset.move, folder: s.value === GENERAL ? '' : s.value }));
      if (res && res.ok) { TS.toast('הועבר ל' + s.value); libOpen.add(s.value); }
      else TS.toast(res && res.error === 'bad_key' ? 'אין הרשאה מהקישור הזה' : 'ההעברה לא הצליחה — לנסות שוב');
      await loadSpace();
    }));
  }

  function initUpload() {
    const dz = document.getElementById('gdrop-zone');
    const input = document.getElementById('gfile-input');
    dz.addEventListener('click', () => input.click());
    input.addEventListener('change', () => { uploadFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => {
      e.preventDefault(); dz.classList.add('over');
    }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => {
      e.preventDefault(); dz.classList.remove('over');
    }));
    dz.addEventListener('drop', e => uploadFiles(e.dataTransfer.files));
    const sel = document.getElementById('lib-folder');
    sel.addEventListener('change', () => {
      const nf = document.getElementById('lib-newfolder');
      nf.hidden = sel.value !== NEW_FOLDER;
      if (!nf.hidden) nf.focus();
    });
    const search = document.getElementById('lib-search');
    search.addEventListener('input', () => { libSearch = search.value; renderFiles(); });
    document.getElementById('lib-link-add').addEventListener('click', addLink);
    fillFolderSelect();
    renderDriveCard();
  }

  async function addLink() {
    const url = document.getElementById('lib-link-url').value.trim();
    const name = document.getElementById('lib-link-name').value.trim();
    const status = document.getElementById('gfiles-status');
    if (!/^https:\/\//.test(url)) { status.textContent = 'הקישור צריך להתחיל ב-https://'; return; }
    const auth = window.GUIDE_AUTH ? window.GUIDE_AUTH() : {};
    if (!(auth.k || auth.ge)) { status.textContent = 'הוספת קישור דורשת כניסה מהקישור האישי.'; return; }
    if (document.getElementById('lib-folder').value === NEW_FOLDER && !chosenFolder()) { status.textContent = 'חסר שם לתיקייה החדשה.'; return; }
    const folder = chosenFolder();
    status.textContent = 'מוסיפה…';
    const res = await TS.apiPost('guide.file.link', Object.assign({}, auth, {
      guideName: GUIDE_CFG.name || '', fileName: name || url, fileUrl: url, folder: folder,
      mimeType: 'text/uri-list', byName: GUIDE_CFG.name || ''
    }));
    await loadSpace();
    if ((res && res.ok) || data.files.some(f => f.fileUrl === url)) {
      document.getElementById('lib-link-url').value = '';
      document.getElementById('lib-link-name').value = '';
      status.textContent = 'הקישור נוסף ל' + (folder || GENERAL) + ' ✓';
      libOpen.add(folder || GENERAL);
      renderFiles();
    } else {
      status.textContent = 'הקישור לא נוסף. נסי שוב בעוד רגע.';
    }
  }

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const status = document.getElementById('gfiles-status');
    if (document.getElementById('lib-folder').value === NEW_FOLDER && !chosenFolder()) {
      status.textContent = 'חסר שם לתיקייה החדשה.';
      document.getElementById('lib-newfolder').focus();
      return;
    }
    const folder = chosenFolder();
    const problems = [];
    let done = 0;
    const unsure = [];   // התשובה נפלה — אולי הקובץ עלה בכל זאת

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        problems.push(`"${file.name}" גדול מדי (${fmtSize(file.size)}) — עד 8MB לקובץ. קובץ גדול: להעלות לדרייב ולהוסיף כקישור`);
        continue;
      }
      status.textContent = `מעלה את "${file.name}" ל${folder || GENERAL} (${done + unsure.length + 1} מתוך ${files.length})...`;
      let b64;
      try { b64 = await fileToBase64(file); }
      catch (e) { problems.push(`קריאת "${file.name}" נכשלה`); continue; }

      const res = await TS.apiPost('guide.file.add', {
        guide: SLUG,
        guideName: GUIDE_CFG.name || '',
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: b64,
        folder: folder,
        byName: GUIDE_CFG.name || '',
        byRole: 'guide'
      });
      if (res && res.ok) done++;
      else if (res && res.error && !res.transient && !/timeout|http_|bad_response|Failed to fetch/i.test(res.error)) {
        problems.push(`העלאת "${file.name}" נכשלה (${res.error})`);
      } else {
        unsure.push(file.name);
      }
    }

    await loadSpace();
    unsure.forEach(name => {
      if (data.files.some(f => f.fileName === name)) done++;
      else problems.push(`העלאת "${name}" לא הושלמה — נסי שוב`);
    });
    if (libOpen) libOpen.add(folder || GENERAL);
    document.getElementById('lib-newfolder').value = '';
    renderFiles();
    if (folder) document.getElementById('lib-folder').value = folder;
    status.textContent = problems.join(' · ');
    if (done) TS.toast((done === 1 ? 'הקובץ נכנס' : done + ' קבצים נכנסו') + ' ל' + (folder || GENERAL));
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      // readAsDataURL ולא ArrayBuffer — הדפדפן ממיר, בלי לחסום את העמוד
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  // ---------- שעות פרטניות ----------
  let editingHoursId = '';
  const val = id => document.getElementById(id).value.trim();

  function initHours() {
    document.getElementById('hours-form').addEventListener('submit', e => { e.preventDefault(); saveHours(); });
    document.getElementById('h-cancel').addEventListener('click', () => {
      resetHoursForm();
      document.getElementById('hours-status').textContent = '';
    });
    fillSubjectSelect();
    // רשימת המורים נטענת ב-dashboard.js אחרי שהעמוד עלה — ממלאים בפוקוס
    ['h-pick', 'h-school'].forEach(id => document.getElementById(id).addEventListener('focus', fillTeacherLists));
    document.getElementById('h-pick').addEventListener('change', applyPickedTeacher);
    setToday();
  }

  function myRoster() {
    return (typeof state !== 'undefined' && state && Array.isArray(state.teachers)) ? state.teachers : [];
  }

  function fillSubjectSelect() {
    // המקצועות של המדריכה ראשונים — הם כמעט תמיד הנכונים
    const mine = window.TS_guideSubjects ? window.TS_guideSubjects(GUIDE_CFG).filter(Boolean) : [];
    const list = mine.concat((TS.SUBJECTS || []).filter(s => mine.indexOf(s) < 0));
    document.getElementById('h-subject').innerHTML =
      list.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  }

  const NO_SCHOOL = '— ללא שיוך —';
  function pickLabel(t) { return t.name + (t.schoolName && t.schoolName !== NO_SCHOOL ? ' · ' + t.schoolName : ''); }

  function fillTeacherLists() {
    const roster = myRoster();
    const dl = document.getElementById('h-teachers-dl');
    if (dl.childElementCount !== roster.length) {
      dl.innerHTML = roster.map(t => `<option value="${esc(pickLabel(t))}"></option>`).join('');
    }
    const schools = Array.from(new Set(roster.map(t => t.schoolName)))
      .filter(s => s && s !== NO_SCHOOL).sort((a, b) => a.localeCompare(b, 'he'));
    document.getElementById('h-schools-dl').innerHTML =
      schools.map(s => `<option value="${esc(s)}"></option>`).join('');
  }

  // בחירה מהרשימה ממלאת שם ובית ספר. השם נחתך במילה הראשונה — אם במערכת
  // הוא רשום "משפחה פרטי", המדריכה מתקנת בשדות; שום דבר לא ננעל.
  function applyPickedTeacher() {
    const v = val('h-pick');
    const t = myRoster().find(x => pickLabel(x) === v);
    if (!t) return;
    const parts = String(t.name || '').trim().split(/\s+/);
    document.getElementById('h-first').value = parts.shift() || '';
    document.getElementById('h-last').value = parts.join(' ');
    if (t.schoolName && t.schoolName !== NO_SCHOOL) document.getElementById('h-school').value = t.schoolName;
    document.getElementById('h-topic').focus();
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function setToday() { document.getElementById('h-date').value = todayStr(); }

  function readHoursForm() {
    return {
      firstName: val('h-first'),
      lastName: val('h-last'),
      subject: document.getElementById('h-subject').value,
      schoolName: val('h-school'),
      topic: val('h-topic'),
      notes: val('h-notes'),
      date: document.getElementById('h-date').value,
      hours: document.getElementById('h-hours').value
    };
  }

  async function saveHours() {
    const f = readHoursForm();
    const status = document.getElementById('hours-status');
    if (!f.firstName && !f.lastName) { status.textContent = 'חסר שם המורה.'; document.getElementById('h-first').focus(); return; }
    if (!(Number(f.hours) > 0)) { status.textContent = 'מספר השעות צריך להיות גדול מ-0.'; return; }
    const btn = document.getElementById('h-submit');
    const id = editingHoursId;
    btn.disabled = true;
    status.textContent = 'שומרת...';

    const res = id
      ? await TS.apiPost('guide.hours.update', Object.assign({ id: id }, f))
      : await TS.apiPost('guide.hours.add', Object.assign({
          guide: SLUG, guideName: GUIDE_CFG.name || '', byName: GUIDE_CFG.name || ''
        }, f));

    // כמו בהודעות: POST לא חוזר, אבל התשובה שלו יכולה ליפול אחרי שנשמר.
    // טוענים ובודקים אם הרישום נחת לפני שאומרים "לא נשמר".
    await loadSpace();
    const same = h => (h.firstName || '') === f.firstName && (h.lastName || '') === f.lastName &&
      String(h.topic || '') === f.topic && String(h.notes || '') === f.notes &&
      Number(h.hours) === Number(f.hours) && String(h.date || '').slice(0, 10) === f.date;
    const landed = (res && res.ok) ||
      (id ? data.hours.some(h => h.id === id && same(h)) : data.hours.some(same));
    btn.disabled = false;

    if (landed) {
      resetHoursForm();
      status.textContent = id ? 'העדכון נשמר ✓' : 'הרישום נשמר ✓';
      renderHours();
    } else {
      status.textContent = 'לא נשמר. נסי שוב בעוד רגע.';
    }
  }

  // אחרי הוספה: שם, נושא ותיאור מתנקים; תאריך, מקצוע ובית ספר נשארים —
  // כמה מורים מאותו בית ספר באותו יום זה המקרה הרגיל. אחרי עדכון — איפוס מלא.
  function resetHoursForm() {
    const wasEditing = !!editingHoursId;
    editingHoursId = '';
    ['h-pick', 'h-first', 'h-last', 'h-topic', 'h-notes'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('h-hours').value = '1';
    if (wasEditing) {
      setToday();
      document.getElementById('h-school').value = '';
      fillSubjectSelect();
    }
    document.getElementById('hours-form-title').textContent = 'רישום שעה פרטנית';
    document.getElementById('h-submit').textContent = 'הוספה';
    document.getElementById('h-cancel').hidden = true;
    document.querySelectorAll('.h-row.editing').forEach(r => r.classList.remove('editing'));
  }

  function startEditHours(id) {
    const h = data.hours.find(x => x.id === id);
    if (!h) return;
    editingHoursId = id;
    document.getElementById('h-pick').value = '';
    document.getElementById('h-first').value = h.firstName || '';
    document.getElementById('h-last').value = h.lastName || '';
    const sel = document.getElementById('h-subject');
    if (h.subject && !Array.from(sel.options).some(o => o.value === h.subject)) {
      sel.insertAdjacentHTML('beforeend', `<option value="${esc(h.subject)}">${esc(h.subject)}</option>`);
    }
    if (h.subject) sel.value = h.subject;
    document.getElementById('h-school').value = h.schoolName || '';
    document.getElementById('h-topic').value = h.topic || '';
    document.getElementById('h-notes').value = h.notes || '';
    document.getElementById('h-date').value = String(h.date || '').slice(0, 10);
    document.getElementById('h-hours').value = h.hours || 1;
    document.getElementById('hours-form-title').textContent = 'עדכון רישום';
    document.getElementById('h-submit').textContent = 'שמירת העדכון';
    document.getElementById('h-cancel').hidden = false;
    document.getElementById('hours-status').textContent = '';
    document.querySelectorAll('.h-row').forEach(r => r.classList.toggle('editing', r.dataset.hrow === id));
    document.getElementById('hours-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('h-notes').focus({ preventScroll: true });
  }

  function renderHours() {
    const el = document.getElementById('hours-list');
    const total = document.getElementById('hours-total');
    if (loadFailed) { total.hidden = true; el.innerHTML = failBox(); bindRetry(el); return; }
    const rows = data.hours;   // השרת ממיין לפי תאריך, החדש למעלה
    // לשונית הנוכחות (meetings.js) סופרת את השעות הפרטניות כהשתתפות — מעדכנים אותה
    if (typeof window.MEET_onHours === 'function') window.MEET_onHours(rows);
    const badge = document.getElementById('hours-count');
    badge.textContent = rows.length;
    badge.classList.toggle('zero', !rows.length);

    if (!rows.length) {
      total.hidden = true;
      el.innerHTML = '<div class="empty" style="padding:18px;">עדיין לא נרשמו שעות פרטניות</div>';
      return;
    }
    const sum = rows.reduce((s, h) => s + (Number(h.hours) || 0), 0);
    total.hidden = false;
    total.textContent = `סה"כ ${fmtHours(sum)} שעות · ` + (rows.length === 1 ? 'מפגש אחד' : rows.length + ' מפגשים');

    el.innerHTML = rows.map(h => {
      // רישום שהמפקח.ת הוסיפ.ה מהמבט שלה — מסומן, כדי שלא ייראה כמו טעות
      const byOther = h.createdBy && GUIDE_CFG.name && h.createdBy !== GUIDE_CFG.name;
      const n = Number(h.hours) || 0;
      return `
      <div class="h-row ${h.id === editingHoursId ? 'editing' : ''}" data-hrow="${esc(h.id)}">
        <div class="h-top">
          <span class="h-who">${esc((String(h.firstName || '') + ' ' + String(h.lastName || '')).trim() || '—')}</span>
          <span class="h-when">${fmtDateOnly(h.date)} · <bdi dir="ltr">${fmtHours(n)}</bdi> ${n === 1 ? 'שעה' : 'שעות'}</span>
        </div>
        <div class="h-meta">${esc([h.subject, h.schoolName].filter(Boolean).join(' · '))}${byOther ? ' · <span class="h-by">נרשם ע"י ' + esc(h.createdBy) + '</span>' : ''}</div>
        ${h.topic ? `<div class="h-topic">${esc(h.topic)}</div>` : ''}
        ${h.notes ? `<div class="h-notes">${linkify(h.notes)}</div>` : '<div class="h-notes none">עוד לא נכתב מה נעשה במפגש</div>'}
        <div class="h-actions">
          <button type="button" class="edit" data-edit-hours="${esc(h.id)}">עדכון</button>
          <button type="button" class="row-del" data-del-hours="${esc(h.id)}">מחיקה</button>
        </div>
      </div>`;
    }).join('');

    el.querySelectorAll('[data-edit-hours]').forEach(b =>
      b.addEventListener('click', () => startEditHours(b.dataset.editHours)));
    el.querySelectorAll('[data-del-hours]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('למחוק את הרישום? הוא יימחק גם מהמבט של המפקח.ת.')) return;
      b.disabled = true;
      const delId = b.dataset.delHours;
      const res = await TS.apiPost('guide.hours.delete', { id: delId });
      if (res && res.ok) TS.toast('הרישום נמחק');
      if (editingHoursId === delId) resetHoursForm();
      await loadSpace();
    }));
  }

  /* ================================================================
     פעילות אחרת (23.9.26, שלב ד') — מה שמדווח במונדיי ואינו הדרכה.
     אותו דפוס כמו השעות הפרטניות: טופס, רשימה, עדכון ומחיקה.
     ================================================================ */
  let editingActId = '';
  function initActivities() {
    const form = document.getElementById('act-form');
    if (!form) return;
    form.addEventListener('submit', e => { e.preventDefault(); saveActivity(); });
    document.getElementById('a-cancel').addEventListener('click', () => {
      resetActForm();
      document.getElementById('act-status').textContent = '';
    });
    document.getElementById('a-date').value = todayStr();
  }
  function readActForm() {
    return {
      name: val('a-name'), date: document.getElementById('a-date').value,
      start: document.getElementById('a-start').value, end: document.getElementById('a-end').value,
      location: document.getElementById('a-location').value,
      hours: document.getElementById('a-hours').value, notes: val('a-notes')
    };
  }
  async function saveActivity() {
    const f = readActForm();
    const status = document.getElementById('act-status');
    if (!f.name) { status.textContent = 'חסר שם הפעילות.'; document.getElementById('a-name').focus(); return; }
    if (!f.date) { status.textContent = 'חסר תאריך.'; return; }
    if (!(Number(f.hours) > 0) && !(f.start && f.end && f.end > f.start)) {
      status.textContent = 'צריך שעת התחלה וסיום, או מספר שעות.'; return;
    }
    const btn = document.getElementById('a-submit');
    const id = editingActId;
    btn.disabled = true;
    status.textContent = 'שומרת...';
    const res = id
      ? await TS.apiPost('guide.activity.update', Object.assign({ id: id }, f))
      : await TS.apiPost('guide.activity.add', Object.assign({
          guide: SLUG, guideName: GUIDE_CFG.name || '', byName: GUIDE_CFG.name || ''
        }, f));
    await loadSpace();
    const same = a => String(a.name || '') === f.name && String(a.date || '').slice(0, 10) === f.date &&
      String(a.start || '') === f.start && String(a.end || '') === f.end;
    const landed = (res && res.ok) ||
      (id ? data.activities.some(a => a.id === id && same(a)) : data.activities.some(same));
    btn.disabled = false;
    if (landed) {
      resetActForm();
      status.textContent = id ? 'העדכון נשמר ✓' : 'הפעילות נשמרה ✓ והיא כבר בדוח למטה';
      renderActivities();
      renderReport();
    } else {
      status.textContent = 'לא נשמר. נסי שוב בעוד רגע.';
    }
  }
  function resetActForm() {
    const wasEditing = !!editingActId;
    editingActId = '';
    ['a-name', 'a-start', 'a-end', 'a-hours', 'a-notes'].forEach(i => document.getElementById(i).value = '');
    if (wasEditing) { document.getElementById('a-date').value = todayStr(); document.getElementById('a-location').value = 'זום'; }
    document.getElementById('act-form-title').textContent = 'פעילות אחרת';
    document.getElementById('a-submit').textContent = 'הוספה';
    document.getElementById('a-cancel').hidden = true;
    document.querySelectorAll('.h-row.editing[data-arow]').forEach(r => r.classList.remove('editing'));
  }
  function startEditActivity(id) {
    const a = data.activities.find(x => x.id === id);
    if (!a) return;
    editingActId = id;
    document.getElementById('a-name').value = a.name || '';
    document.getElementById('a-date').value = String(a.date || '').slice(0, 10);
    document.getElementById('a-start').value = a.start || '';
    document.getElementById('a-end').value = a.end || '';
    document.getElementById('a-location').value = a.location || 'זום';
    document.getElementById('a-hours').value = a.hours || '';
    document.getElementById('a-notes').value = a.notes || '';
    document.getElementById('act-form-title').textContent = 'עדכון פעילות';
    document.getElementById('a-submit').textContent = 'שמירת העדכון';
    document.getElementById('a-cancel').hidden = false;
    document.getElementById('act-status').textContent = '';
    document.querySelectorAll('[data-arow]').forEach(r => r.classList.toggle('editing', r.dataset.arow === id));
    document.getElementById('act-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderActivities() {
    const el = document.getElementById('act-list');
    if (!el) return;
    if (loadFailed) { el.innerHTML = failBox(); bindRetry(el); return; }
    const rows = data.activities || [];
    if (!rows.length) {
      el.innerHTML = '<div class="empty" style="padding:18px;">עדיין לא נרשמו פעילויות אחרות. הדרכות קבוצתיות ופרטניות נכנסות לדוח לבד — כאן רק מה שמעבר להן.</div>';
      return;
    }
    el.innerHTML = rows.map(a => {
      const n = Number(a.hours) || 0;
      return `
      <div class="h-row ${a.id === editingActId ? 'editing' : ''}" data-arow="${esc(a.id)}">
        <div class="h-top">
          <span class="h-who">${esc(a.name || '—')}</span>
          <span class="h-when">${fmtDateOnly(a.date)}${a.start ? ' · <bdi dir="ltr">' + esc(a.start) + (a.end ? '–' + esc(a.end) : '') + '</bdi>' : ''} · <bdi dir="ltr">${fmtHours(n)}</bdi> ${n === 1 ? 'שעה' : 'שעות'}</span>
        </div>
        <div class="h-meta">${esc(a.location || 'זום')}${a.notes ? ' · ' + esc(a.notes) : ''}</div>
        <div class="h-actions">
          <button type="button" class="edit" data-edit-act="${esc(a.id)}">עדכון</button>
          <button type="button" class="row-del" data-del-act="${esc(a.id)}">מחיקה</button>
        </div>
      </div>`;
    }).join('');
    el.querySelectorAll('[data-edit-act]').forEach(b => b.addEventListener('click', () => startEditActivity(b.dataset.editAct)));
    el.querySelectorAll('[data-del-act]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('למחוק את הפעילות?')) return;
      b.disabled = true;
      const delId = b.dataset.delAct;
      const res = await TS.apiPost('guide.activity.delete', { id: delId });
      if (res && res.ok) TS.toast('הפעילות נמחקה');
      if (editingActId === delId) resetActForm();
      await loadSpace();
    }));
  }

  /* ================================================================
     דוח שעות למונדיי (שלב ד') — המנוע ב-assets/hours-report.js.
     המפגשים הקבוצתיים מ-window.MEET_ALL (meetings.js מפרסם אחרי meet.state),
     השעות הפרטניות והפעילויות מ-data. הטבלה ניתנת לעריכה לפני ההעתקה;
     העריכה לא נשמרת — היא תיקון של ההצעה לקראת ההדבקה במונדיי.
     ================================================================ */
  let repRows = [];
  function initReport() {
    const sel = document.getElementById('rep-month');
    if (!sel) return;
    const t = todayStr();
    const [y, m] = t.split('-').map(Number);
    const startY = m >= 9 ? y : y - 1;
    const months = [];
    for (let i = 0; i < 12; i++) {
      const mm = ((8 + i) % 12) + 1, yy = startY + (8 + i >= 12 ? 1 : 0);
      const key = yy + '-' + String(mm).padStart(2, '0');
      if (key > t.slice(0, 7)) break;
      months.push(key);
    }
    sel.innerHTML = months.map(k => `<option value="${k}">${esc(window.TS_meetMonthLabel ? TS_meetMonthLabel(k) : k)}</option>`).join('');
    sel.value = t.slice(0, 7);
    sel.addEventListener('change', renderReport);
    document.getElementById('rep-refresh').addEventListener('click', renderReport);
    document.getElementById('rep-copy').addEventListener('click', copyReport);
    document.getElementById('rep-csv').addEventListener('click', downloadReport);
    // הנוכחות נטענת אחרי המרחב — כשהיא מגיעה הדוח מתעדכן
    document.addEventListener('meet:all', renderReport);
  }
  window.SPACE_onMeetings = function () { renderReport(); };
  function renderReport() {
    const body = document.getElementById('rep-body');
    const sel = document.getElementById('rep-month');
    if (!body || !sel || !window.TS_hoursReport) return;
    const M = window.MEET_ALL || {};
    const plan = window.TS_planFor ? window.TS_planFor(SLUG) : null;
    const rep = window.TS_hoursReport({
      month: sel.value, slug: SLUG, today: M.today || todayStr(),
      meetings: (M.meetings || []).filter(m => !m.guideSlug || m.guideSlug === SLUG),
      hours: data.hours, activities: data.activities, plan: plan
    });
    repRows = rep.rows;
    const total = document.getElementById('rep-total');
    total.hidden = !rep.rows.length;
    total.textContent = 'סה"כ ' + fmtHours(rep.total) + ' שעות · ' + rep.rows.length + ' שורות';
    if (!rep.rows.length) {
      body.innerHTML = '<tr><td class="rep-empty">אין עדיין פעילות בחודש הזה. הדרכה קבוצתית נכנסת אחרי שסימנת בה נוכחות; פרטנית ופעילות אחרת — אחרי שרשמת אותן למעלה.</td></tr>';
      return;
    }
    const KIND = { group: 'קבוצתית', individual: 'פרטנית', other: 'אחרת' };
    body.innerHTML = `<tr><th>פעילות</th><th>תאריך</th><th>יום</th><th>שעת התחלה</th><th>מיקום</th><th>שעת סיום</th><th>שעות</th></tr>` +
      rep.rows.map((r, i) => `
      <tr class="${r.proposed ? 'proposed' : ''}" data-i="${i}">
        <td class="name"><input class="input" data-f="name" value="${esc(r.name)}"><span class="kind">${KIND[r.kind] || ''}${r.proposed && r.note ? '<span class="prop">' + esc(r.note) + '</span>' : ''}</span></td>
        <td class="d"><input class="input" type="date" data-f="date" value="${esc(r.date)}"></td>
        <td class="kind" data-day>${esc('יום ' + r.day)}</td>
        <td class="t"><input class="input" type="time" step="900" data-f="start" value="${esc(r.start)}"></td>
        <td><select class="select" data-f="location">${['זום', 'טלפון', 'מחשב', 'פרונטלי'].map(l => `<option${l === r.location ? ' selected' : ''}>${l}</option>`).join('')}</select></td>
        <td class="t"><input class="input" type="time" step="900" data-f="end" value="${esc(r.end)}"></td>
        <td class="h" data-hours>${fmtHours(r.hours)}</td>
      </tr>`).join('');
    body.querySelectorAll('[data-f]').forEach(inp => inp.addEventListener('input', () => {
      const tr = inp.closest('tr');
      const r = repRows[Number(tr.dataset.i)];
      const f = inp.dataset.f;
      if (f === 'start' && inp.value) {
        // הזזת ההתחלה שומרת על המשך; הסיום זז איתה
        r.start = inp.value;
        r.end = window.TS_reportAddHours(r.start, r.hours);
        tr.querySelector('[data-f="end"]').value = r.end;
      } else if (f === 'end' && inp.value && r.start) {
        r.end = inp.value;
        const mins = (Number(r.end.slice(0, 2)) * 60 + Number(r.end.slice(3))) - (Number(r.start.slice(0, 2)) * 60 + Number(r.start.slice(3)));
        if (mins > 0) { r.hours = window.TS_reportRound(mins / 60); tr.querySelector('[data-hours]').textContent = fmtHours(r.hours); }
      } else {
        r[f] = inp.value;
        if (f === 'date') { r.day = window.TS_reportDayLabel(r.date); tr.querySelector('[data-day]').textContent = 'יום ' + r.day; }
      }
      r.proposed = false;
      tr.classList.remove('proposed');
      const p = tr.querySelector('.prop'); if (p) p.remove();
      total.textContent = 'סה"כ ' + fmtHours(repRows.reduce((s, x) => s + (Number(x.hours) || 0), 0)) + ' שעות · ' + repRows.length + ' שורות';
    }));
  }
  async function copyReport() {
    const status = document.getElementById('rep-status');
    if (!repRows.length) { status.textContent = 'אין שורות להעתקה.'; return; }
    const text = window.TS_hoursReportTsv(repRows, false);
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = repRows.length + ' שורות הועתקו. במונדיי: פותחים את הפריט שלך בחודש, לוחצים על תא "Subitem" הראשון הריק ומדביקים (Ctrl+V) — כל שורה נכנסת כשורת משנה.';
    } catch (e) {
      status.textContent = 'ההעתקה נחסמה בדפדפן — הורידי ל-Excel במקום.';
    }
  }
  function downloadReport() {
    if (!repRows.length) return;
    const csv = window.TS_hoursReportCsv(repRows);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'דוח-שעות-' + (GUIDE_CFG.name || SLUG) + '-' + document.getElementById('rep-month').value + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  // 1.5 ולא 1.50
  function fmtHours(n) { return String(Math.round((Number(n) || 0) * 100) / 100); }
  // התאריך נשמר כטקסט yyyy-mm-dd; new Date() היה מזיז יום אחורה בשעון ישראל
  function fmtDateOnly(v) {
    const s = String(v || '').slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : (s || '—');
  }

  // ---------- עיצוב ערכים ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safeUrl(u) { return /^https:\/\//i.test(String(u || '')) ? u : '#'; }
  // קישור זום / דרייב בתוך הודעה נהיה לחיץ. רץ על טקסט שכבר עבר esc,
  // ולכן עוצרים לפני ישויות (&quot; וכו') ומורידים פיסוק שבסוף משפט.
  function linkify(text) {
    return esc(text).replace(/https?:\/\/(?:(?!&quot;|&#39;|&lt;|&gt;)[^\s<])+/g, u => {
      const clean = u.replace(/[.,;:!?)\]]+$/, '');
      return `<a dir="ltr" href="${clean}" target="_blank" rel="noopener">${clean}</a>${u.slice(clean.length)}`;
    });
  }
  function fmtSize(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function fmtWhen(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString('he-IL') + ' · ' +
           d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }
})();
