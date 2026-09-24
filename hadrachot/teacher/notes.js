/* ▸ המחברת שלי — מחברת ידע פרטית למורה (24.9.26, בקשת מיטל).
   כותבים תוך כדי ההדרכה דברים חשובים ומצרפים קבצים לעצמך. שמור בשרת לפי
   המפתח החתום (notes.* ב-code.gs), כך שזמין מכל מכשיר. פרטי: רק המורה רואה.
   טיוטה שלא נשמרה נשמרת בדפדפן (ts.teacher.noteDraft) — סגירת לשונית באמצע
   הדרכה לא מוחקת מה שנכתב. */
(function () {
  const DRAFT = 'ts.teacher.noteDraft';
  const MAX_MB = 8;
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const $ = id => document.getElementById(id);
  let notes = [], editing = null, pending = [], slugRef = '';
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  const key = () => (typeof DEMO_ !== 'undefined' && DEMO_) ? 'demo' : (typeof teacherKey !== 'undefined' ? teacherKey : '');

  const ERR = {
    bad_key: 'צריך להיכנס מחדש כדי לשמור במחברת.', too_long: 'ההערה ארוכה מדי (עד 20,000 תווים).',
    file_too_large: 'הקובץ גדול מדי (עד ' + MAX_MB + 'MB).', too_many_files: 'אפשר לצרף עד 10 קבצים להערה.',
    not_found: 'ההערה לא נמצאה. רעננו את הדף.'
  };
  const errText = r => (r && ERR[r.error]) || 'לא הצלחנו לשמור כרגע. נסו שוב בעוד רגע.';

  function topicFor(date) {
    try { return (typeof planTopic === 'function' && slugRef) ? planTopic(slugRef, date) : ''; } catch (e) { return ''; }
  }
  function say(text, cls) {
    const m = $('nt-msg'); if (!m) return;
    m.hidden = !text; m.className = 'nt-msg' + (cls ? ' ' + cls : ''); m.textContent = text || '';
  }
  function saveDraft() {
    if (editing && editing.id) return;               // עריכה של הערה קיימת — לא טיוטה
    try {
      localStorage.setItem(DRAFT, JSON.stringify({ date: $('nt-date').value, title: $('nt-title').value, text: $('nt-text').value }));
    } catch (e) { /* לא חוסם */ }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT); } catch (e) { /* לא חוסם */ } }

  function openEditor(note, dateOverride) {
    editing = note || { id: '' };
    pending = [];
    let d = note ? note.date : (dateOverride || today());
    let title = note ? note.title : '', text = note ? note.text : '';
    if (!note) {
      try {
        const dr = JSON.parse(localStorage.getItem(DRAFT) || 'null');
        if (dr && (dr.text || dr.title)) { d = dateOverride || dr.date || d; title = dr.title || ''; text = dr.text || ''; }
      } catch (e) { /* אין טיוטה */ }
    }
    $('nt-date').value = d;
    $('nt-title').value = title;
    $('nt-text').value = text;
    $('nt-files').value = '';
    renderPending();
    renderTopic();
    $('nt-editor').hidden = false;
    $('nt-new').hidden = true;
    $('nt-editor-title').textContent = note ? 'עריכת הערה' : 'הערה חדשה';
    say('');
    $('nt-text').focus();
  }
  function closeEditor() {
    $('nt-editor').hidden = true;
    $('nt-new').hidden = false;
    editing = null; pending = [];
  }
  function renderTopic() {
    const t = topicFor($('nt-date').value);
    const el = $('nt-topic');
    el.hidden = !t;
    el.textContent = t ? 'ההדרכה בתאריך הזה: ' + t : '';
  }
  function renderPending() {
    const box = $('nt-pending');
    const existing = (editing && editing.files) || [];
    box.innerHTML = existing.map(f =>
      `<span class="nt-file"><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)}</a>
        <button type="button" class="nt-x" data-del-file="${esc(f.fileId)}" aria-label="הסרת ${esc(f.name)}">×</button></span>`).join('') +
      pending.map((f, i) => `<span class="nt-file new">${esc(f.name)}
        <button type="button" class="nt-x" data-drop="${i}" aria-label="ביטול ${esc(f.name)}">×</button></span>`).join('');
  }
  const toB64 = file => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  async function save() {
    const btn = $('nt-save');
    const text = $('nt-text').value.trim(), title = $('nt-title').value.trim();
    if (!text && !title && !pending.length) return say('כתבו משהו או צרפו קובץ לפני השמירה.', 'err');
    btn.disabled = true; btn.textContent = 'שומר…'; say('');
    const date = $('nt-date').value || today();
    const r = await TS.apiPost('notes.save', { k: key(), id: editing && editing.id || '', date: date,
      meetingTopic: topicFor(date), title: title, text: $('nt-text').value });
    if (!r || !r.ok) { btn.disabled = false; btn.textContent = 'שמירה'; return say(errText(r), 'err'); }
    let note = r.data;
    note.files = (editing && editing.files) || note.files || [];
    const fails = [];
    for (let i = 0; i < pending.length; i++) {
      const f = pending[i];
      btn.textContent = 'מעלה קובץ ' + (i + 1) + ' מתוך ' + pending.length + '…';
      if (f.size > MAX_MB * 1024 * 1024) { fails.push(f.name + ' (גדול מ-' + MAX_MB + 'MB)'); continue; }
      let data;
      try { data = await toB64(f); } catch (e) { fails.push(f.name); continue; }
      const u = await TS.apiPost('notes.file', { k: key(), noteId: note.id, fileName: f.name, mimeType: f.type || '', data: data });
      if (u && u.ok) note.files = note.files.concat([u.data]); else fails.push(f.name);
    }
    const i = notes.findIndex(n => n.id === note.id);
    if (i >= 0) notes[i] = note; else notes.unshift(note);
    clearDraft();
    btn.disabled = false; btn.textContent = 'שמירה';
    closeEditor();
    renderList();
    if (fails.length) say('ההערה נשמרה, אבל לא הצלחנו לצרף: ' + fails.join(', ') + '. אפשר לנסות שוב בעריכה.', 'err');
    else say('נשמר במחברת ✓', 'ok');
    const m = $('nt-msg'); if (m) setTimeout(() => { if (m.className.indexOf('ok') >= 0) m.hidden = true; }, 3500);
  }

  function renderList() {
    const box = $('nt-list');
    if (!notes.length) {
      box.innerHTML = '<div class="nt-empty">עוד אין כאן הערות. בזמן ההדרכה לוחצים "הערה חדשה" וכותבים מה שחשוב לך לזכור — אפשר לצרף גם קבצים.</div>';
      return;
    }
    box.innerHTML = notes.map(n => `
      <article class="nt-card" data-id="${esc(n.id)}">
        <div class="nt-head">
          <span class="nt-date">${esc(typeof weekday === 'function' ? weekday(n.date) : '')} ${esc(typeof dateLbl === 'function' ? dateLbl(n.date) : n.date)}</span>
          ${n.meetingTopic ? `<span class="nt-mt">${esc(n.meetingTopic)}</span>` : ''}
          <span class="nt-acts">
            <button type="button" data-edit="${esc(n.id)}">עריכה</button>
            <button type="button" data-remove="${esc(n.id)}">מחיקה</button>
          </span>
        </div>
        ${n.title ? `<h3 class="nt-title">${esc(n.title)}</h3>` : ''}
        ${n.text ? `<div class="nt-text">${esc(n.text)}</div>` : ''}
        ${(n.files || []).length ? `<div class="nt-files">${n.files.map(f =>
          `<a class="nt-file" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)}</a>`).join('')}</div>` : ''}
      </article>`).join('');
  }

  async function onListClick(e) {
    const ed = e.target.closest('[data-edit]');
    if (ed) { const n = notes.find(x => x.id === ed.dataset.edit); if (n) { openEditor(n); $('notes-sec').scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      if (!confirm('למחוק את ההערה? הקבצים שצורפו יעברו לפח.')) return;
      const r = await TS.apiPost('notes.delete', { k: key(), id: rm.dataset.remove });
      if (!r || !r.ok) return say(errText(r), 'err');
      notes = notes.filter(x => x.id !== rm.dataset.remove);
      renderList(); say('ההערה נמחקה.', 'ok');
    }
  }
  async function onPendingClick(e) {
    const drop = e.target.closest('[data-drop]');
    if (drop) { pending.splice(Number(drop.dataset.drop), 1); renderPending(); return; }
    const del = e.target.closest('[data-del-file]');
    if (del && editing && editing.id) {
      if (!confirm('להסיר את הקובץ מההערה?')) return;
      const r = await TS.apiPost('notes.fileDelete', { k: key(), noteId: editing.id, fileId: del.dataset.delFile });
      if (!r || !r.ok) return say(errText(r), 'err');
      editing.files = (editing.files || []).filter(f => f.fileId !== del.dataset.delFile);
      const i = notes.findIndex(n => n.id === editing.id); if (i >= 0) notes[i].files = editing.files;
      renderPending(); renderList();
    }
  }

  window.TS_notes = {
    async init(guideSlug) {
      slugRef = guideSlug || '';
      const sec = $('notes-sec');
      if (!sec || !key()) return;
      if (!sec.dataset.wired) {
        sec.dataset.wired = '1';
        $('nt-new').onclick = () => openEditor(null);
        $('nt-cancel').onclick = closeEditor;
        $('nt-save').onclick = save;
        $('nt-date').onchange = () => { renderTopic(); saveDraft(); };
        $('nt-title').oninput = saveDraft;
        $('nt-text').oninput = saveDraft;
        $('nt-files').onchange = e => {
          [...e.target.files].forEach(f => pending.push(f));
          e.target.value = '';
          renderPending();
        };
        $('nt-list').onclick = onListClick;
        $('nt-pending').onclick = onPendingClick;
      }
      sec.hidden = false;
      const r = await TS.api('notes.list', { k: key() }, { cache: 'no' });
      notes = (r && r.ok && r.data) || [];
      renderList();
    },
    // מכרטיס הרישום ביום ההדרכה: "פתיחת המחברת להדרכה של היום"
    openToday() {
      $('notes-sec').scrollIntoView({ behavior: 'smooth', block: 'start' });
      openEditor(null, today());
    }
  };
})();
