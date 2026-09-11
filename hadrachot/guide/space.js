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
   נטען אחרי dashboard.js ומשתמש ב-GUIDE_CFG שלו.
   ============================================================ */
(function () {
  const SLUG = (typeof GUIDE_CFG !== 'undefined' && GUIDE_CFG.slug) || '';
  const MAX_FILE_BYTES = 8 * 1024 * 1024;   // זהה לתקרה בצד השרת
  const ICON_FILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';

  let data = { files: [], messages: [] };
  let loadFailed = false;

  document.addEventListener('DOMContentLoaded', () => {
    const tabBtn = document.getElementById('tab-btn-space');
    // בלי slug אין לאיזו קבוצה לפרסם (קישור ישן עם ?guide= בלבד)
    if (!SLUG) { if (tabBtn) tabBtn.hidden = true; return; }
    initLinkCard();
    document.getElementById('gmsg-send').addEventListener('click', sendMessage);
    initUpload();
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
  // wa.me בלי מספר — הוואטסאפ פותח בחירת צ'אט, והמדריכה בוחרת את הקבוצה.
  // שליחה אחת לקבוצה, לא הפצה המונית.
  function waLink(text) { return 'https://wa.me/?text=' + encodeURIComponent(text); }
  function withGroupLink(text) {
    return text + '\n\nכל החומרים וההודעות של הקבוצה:\n' + groupUrl();
  }

  function initLinkCard() {
    const url = groupUrl();
    const subj = subjectsLabel();
    document.getElementById('group-url').textContent = url;
    document.getElementById('group-open').href = url;
    document.getElementById('group-wa').href = waLink(
      'שלום לכולם,\n' +
      'כאן יופיעו החומרים וההודעות של קבוצת ההדרכה' + (subj ? ' ב' + subj : '') + ':\n' +
      url + '\n\nכדאי לשמור את הקישור.\n' + (GUIDE_CFG.name || ''));
    const copyBtn = document.getElementById('group-copy');
    copyBtn.addEventListener('click', () => copyText(url, copyBtn));
  }

  function copyText(text, btn) {
    const label = btn.querySelector('span');
    const orig = label ? label.textContent : '';
    const done = () => {
      btn.classList.add('done');
      if (label) label.textContent = 'הקישור הועתק ✓';
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
        messages: (res.data.messages && res.data.messages[SLUG]) || []
      };
    } else {
      loadFailed = true;
    }
    render();
  }

  function render() {
    const badge = document.getElementById('space-count');
    const n = data.files.length + data.messages.length;
    badge.textContent = n;
    badge.classList.toggle('zero', !n);
    renderMessages();
    renderFiles();
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
            <a href="${esc(waLink(withGroupLink(m.text)))}" target="_blank" rel="noopener">שליחה לוואטסאפ</a>
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

  async function sendMessage() {
    const box = document.getElementById('gmsg-text');
    const text = box.value.trim();
    if (!text) { box.focus(); return; }
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
    btn.disabled = false;
    if (landed) {
      box.value = '';
      status.innerHTML = 'פורסם בעמוד הקבוצה ✓ · <a href="' + esc(waLink(withGroupLink(text))) +
        '" target="_blank" rel="noopener">לשלוח גם לקבוצת הוואטסאפ</a>';
    } else {
      status.textContent = 'ההודעה לא פורסמה. נסי שוב בעוד רגע.';
    }
  }

  // ---------- קבצים ----------
  function renderFiles() {
    const el = document.getElementById('gfiles-list');
    if (loadFailed) { el.innerHTML = failBox(); bindRetry(el); return; }
    if (!data.files.length) {
      el.innerHTML = '<div class="empty" style="padding:18px;">עדיין לא הועלו קבצים</div>';
      return;
    }
    el.innerHTML = data.files.map(f => {
      const fromInsp = f.uploaderRole === 'inspector';
      return `
      <div class="file-row">
        <span class="fr-icon">${ICON_FILE}</span>
        <div class="fr-body">
          <a class="fr-name" href="${esc(safeUrl(f.fileUrl))}" target="_blank" rel="noopener">${esc(f.fileName)}</a>
          ${fromInsp ? '<span class="from-insp">מהמפקח.ת · רק לך</span>' : ''}
          <div class="fr-meta"><bdi dir="ltr">${fmtSize(f.size)}</bdi> · ${fmtWhen(f.createdAt)}</div>
        </div>
        ${fromInsp ? '' : `<button type="button" class="row-del" data-del-file="${esc(f.id)}" title="מחיקה">מחיקה</button>`}
      </div>`;
    }).join('');

    el.querySelectorAll('[data-del-file]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('למחוק את הקובץ? הוא ייעלם מעמוד הקבוצה ויעבור לסל המיחזור בדרייב.')) return;
      b.disabled = true;
      const res = await TS.apiPost('guide.file.delete', { id: b.dataset.delFile });
      if (res && res.ok) TS.toast('הקובץ נמחק');
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
  }

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const status = document.getElementById('gfiles-status');
    const problems = [];
    let done = 0;
    const unsure = [];   // התשובה נפלה — אולי הקובץ עלה בכל זאת

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        problems.push(`"${file.name}" גדול מדי (${fmtSize(file.size)}) — עד 8MB לקובץ`);
        continue;
      }
      status.textContent = `מעלה את "${file.name}" (${done + unsure.length + 1} מתוך ${files.length})...`;
      let b64;
      try { b64 = await fileToBase64(file); }
      catch (e) { problems.push(`קריאת "${file.name}" נכשלה`); continue; }

      const res = await TS.apiPost('guide.file.add', {
        guide: SLUG,
        guideName: GUIDE_CFG.name || '',
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: b64,
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
    // קובץ שהתשובה עליו נפלה אבל הוא כבר ברשימה — עלה
    unsure.forEach(name => {
      if (data.files.some(f => f.fileName === name)) done++;
      else problems.push(`העלאת "${name}" לא הושלמה — נסי שוב`);
    });

    status.textContent = problems.join(' · ');
    if (done) TS.toast(done === 1 ? 'הקובץ הועלה' : done + ' קבצים הועלו');
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
