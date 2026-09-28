/* ============================================================
   מאגר החומרים — עמוד נפרד (guide/maagar.html?g=<slug>), 28.9.26
   -----------------------------------------------------------
   מיטל: "מאגר החומרים צריך להיות בנפרד — זה יוצר עומס על הדף". הקוד עבר
   כמו שהוא מ-space.js; כאן הוא טוען לבד את guide.workspace ואת ההרשאה
   (מפתח המדריכ/ה שנשמר במכשיר, מייל מהקישור, או מפתח שמטה מקבל/ת).
   ============================================================ */
(function () {
  const SLUG = TS.urlParam('g', '');
  let guideEmail = TS.urlParam('guide', '');
  const GUIDE_CFG = (window.TS_resolveGuide ? (window.TS_resolveGuide(SLUG, guideEmail) || {}) : {}) || {};
  if (!GUIDE_CFG.slug) GUIDE_CFG.slug = SLUG;
  if (!guideEmail && GUIDE_CFG.email) guideEmail = GUIDE_CFG.email;
  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const ICON_FILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
  let data = { files: [] };
  let driveFile = null;      // תיקיית הדרייב שהמדריכ/ה צירף/ה בעצמו/ה (28.9.26)
  let driveSig = null;       // הכרטיס נצייר מחדש רק כשהמצב משתנה — שלא יימחק מה שמוקלד
  let loadFailed = false;
  let loaded = false;

  let KEY = '';
  try { KEY = TS.urlParam('k', '') || localStorage.getItem('ts.meet.k.' + SLUG) || ''; } catch (e) { KEY = TS.urlParam('k', ''); }
  window.GUIDE_AUTH = () => ({ guide: SLUG, k: KEY, ge: guideEmail });
  async function adminKey() {
    const st = window.TS_staff && window.TS_staff.get ? window.TS_staff.get() : null;
    if (!st || !st.k || !(st.roles || []).some(r => r.role === 'ministry')) return '';
    try {
      const r = await TS.api('staff.guideKeys', { k: st.k, slugs: SLUG }, { cache: 'no' });
      return (r && r.ok && r.data && r.data[SLUG]) || '';
    } catch (e) { return ''; }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!SLUG) return;
    const back = document.getElementById('back-guide');
    if (back) back.href = './' + location.search.replace(/&?k=[^&]*/, '');
    const t = document.getElementById('lib-title');
    if (t && GUIDE_CFG.name) t.textContent = 'מאגר החומרים · ' + GUIDE_CFG.name;
    document.title = 'מאגר החומרים' + (GUIDE_CFG.name ? ' · ' + GUIDE_CFG.name : '') + ' — מנור';
    initUpload();
    loadSpace();
    if (!KEY && !guideEmail) KEY = await adminKey();
  });

  async function loadSpace() {
    const res = await TS.api('guide.workspace', { guides: SLUG }, { cache: 'no' });
    if (res && res.ok && res.data) {
      loadFailed = false;
      const all = (res.data.files && res.data.files[SLUG]) || [];
      // קישור תיקיית הדרייב (source='drive-folder') מוצג בכרטיס שבראש המאגר, לא כקובץ בתיקייה
      driveFile = all.find(f => f.source === 'drive-folder') || null;
      data = { files: all.filter(f => f.source !== 'drive-folder') };
    } else loadFailed = true;
    const first = !loaded;
    loaded = true;
    renderFiles();
    if (first) focusDriveFromMail();
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

  /* העלאה (מיטל 28.9.26): בוחרים קבצים → "לאיזו תיקייה?" — התיקיות הקיימות (כמו בדרייב),
     המפגש הקרוב, כללי, או פתיחת תיקייה חדשה. מכפתור "העלאה לכאן" בתיקייה — בלי שאלה. */
  let pendingFiles = null;
  const ICON_DIR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-3H5a2 2 0 0 0-2 2z"/></svg>';
  function askFolder(files) {
    pendingFiles = files;
    const F = allFolders();
    const next = currentMeetingFolder();
    const topLevel = Array.from(new Set(F.topics.map(f => f.split(' / ')[0])));
    const btn = f => `<button type="button" data-pick="${esc(f)}">${ICON_DIR}<span>${esc(f)}</span></button>`;
    document.getElementById('lib-ask-q').textContent = files.length === 1
      ? 'לאיזו תיקייה להעלות את "' + files[0].name + '"?' : 'לאיזו תיקייה להעלות את ' + files.length + ' הקבצים?';
    document.getElementById('lib-ask-list').innerHTML =
      F.topics.map(btn).join('') + btn(GENERAL) +
      (next && next !== GENERAL ? '<div class="sub-h">או לתיקיית המפגש הקרוב</div>' + btn(next) : '');
    const box = document.getElementById('lib-ask');
    box.hidden = false;
    box.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => doUpload(b.dataset.pick === GENERAL ? '' : b.dataset.pick)));
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    void topLevel;
  }
  function closeAsk() {
    pendingFiles = null;
    document.getElementById('lib-ask').hidden = true;
    document.getElementById('lib-newfolder').value = '';
  }
  function doUpload(folder) {
    const files = pendingFiles;
    closeAsk();
    if (files && files.length) uploadFiles(files, folder);
  }

  function renderDriveCard() {
    const box = document.getElementById('lib-drive');
    if (!box) return;
    const fixed = /^https:\/\//.test(GUIDE_CFG.drive || '') ? GUIDE_CFG.drive : '';
    const own = driveFile && /^https:\/\//.test(driveFile.fileUrl || '') ? driveFile.fileUrl : '';
    const url = fixed || own;
    if (!loaded && !fixed) return;   // לא מציגים "אין לנו" לפני שהמאגר נטען
    const sig = (loadFailed ? 'x' : '') + url;
    if (sig === driveSig) return;
    driveSig = sig;
    if (loadFailed && !fixed) { box.innerHTML = ''; return; }
    if (url) {
      box.innerHTML = `<div class="lib-drive">${ICON_FILE}<span>תיקיית החומרים שלך בדרייב</span>
        <a href="${esc(url)}" target="_blank" rel="noopener">פתיחה</a>
        ${!fixed ? '<button type="button" class="lib-drive-edit" id="lib-drive-edit">החלפת הקישור</button>' : ''}</div>`;
      const ed = document.getElementById('lib-drive-edit');
      if (ed) ed.addEventListener('click', () => { driveSig = 'edit'; box.innerHTML = driveFormHtml(url); bindDriveForm(); });
      return;
    }
    box.innerHTML = driveFormHtml('');
    bindDriveForm();
  }
  // "עוד אין לנו את תיקיית הדרייב שלך" — מגיעים לכאן גם ישר מהמייל (&drive=1)
  function driveFormHtml(cur) {
    return `<div class="lib-drive lib-drive-ask" id="lib-drive-ask">
      <div class="lib-drive-q">${ICON_FILE}<span><b>${cur ? 'החלפת הקישור לתיקיית הדרייב' : 'עוד אין לנו את תיקיית הדרייב שלך'}</b> —
        הדביקו כאן את הקישור לתיקייה שבה נמצאים החומרים שלך, והיא תופיע כאן בראש המאגר.</span></div>
      <div class="lib-drive-row">
        <input class="input" id="lib-drive-url" type="url" dir="ltr" placeholder="https://drive.google.com/drive/folders/..." value="${esc(cur)}">
        <button type="button" class="btn btn-primary" id="lib-drive-save">שמירה</button>
      </div>
      <div class="lib-drive-status" id="lib-drive-status" aria-live="polite"></div>
    </div>`;
  }
  function bindDriveForm() {
    const input = document.getElementById('lib-drive-url');
    const save = document.getElementById('lib-drive-save');
    if (!input || !save) return;
    const go = () => saveDrive(input.value.trim());
    save.addEventListener('click', go);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }
  async function saveDrive(url) {
    const status = document.getElementById('lib-drive-status');
    const say = t => { if (status) status.textContent = t; };
    if (!/^https:\/\/(drive|docs)\.google\.com\//.test(url)) { say('צריך קישור לדרייב — מתחיל ב-https://drive.google.com'); return; }
    const auth = window.GUIDE_AUTH ? window.GUIDE_AUTH() : {};
    if (!(auth.k || auth.ge)) { say('השמירה דורשת כניסה מהקישור האישי שקיבלת במייל.'); return; }
    const btn = document.getElementById('lib-drive-save');
    if (btn) btn.disabled = true;
    say('שומרת…');
    const res = await TS.apiPost('guide.file.link', Object.assign({}, auth, {
      guideName: GUIDE_CFG.name || '', fileName: 'תיקיית הדרייב שלי', fileUrl: url, folder: '',
      mimeType: 'text/uri-list', byName: GUIDE_CFG.name || '', source: 'drive-folder'
    }));
    await loadSpace();
    if (!(driveFile && driveFile.fileUrl === url)) {
      if (btn) btn.disabled = false;
      say((res && res.error === 'bad_key') ? 'הקישור האישי לא תקף. פתחו את המאגר מהקישור שבמייל.' : 'לא נשמר. נסו שוב בעוד רגע.');
    }
  }
  function focusDriveFromMail() {
    if (TS.urlParam('drive', '') !== '1') return;
    const box = document.getElementById('lib-drive');
    if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const input = document.getElementById('lib-drive-url');
    if (input) setTimeout(() => input.focus(), 400);
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

  // "גרפים 371.pdf" מוצג בעברית כ-"pdf.371 גרפים" — הסיומת יורדת לשורת הפרטים
  function extOf(n) { const m = /\.([A-Za-z0-9]{2,5})$/.exec(String(n || '')); return m ? m[1] : ''; }
  function baseName(n) { return extOf(n) ? String(n).replace(/\.[A-Za-z0-9]{2,5}$/, '') : String(n || ''); }
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
          <a class="fr-name" href="${esc(safeUrl(f.fileUrl))}" target="_blank" rel="noopener">${esc(baseName(f.fileName))}</a>
          ${fromInsp ? '<span class="from-insp">מהמפקח.ת · רק לך</span>' : ''}
          <div class="fr-meta">${extOf(f.fileName) ? '<bdi dir="ltr">' + esc(extOf(f.fileName).toUpperCase()) + '</bdi> · ' : ''}${meta} · ${fmtWhen(f.createdAt)}</div>
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
          <span>${esc(node.name)}</span>${isMeeting && depth === 0 ? '<span class="auto">מפגש</span>' : ''}<span class="c">${countTree(node)}</span><button type="button" class="up" data-up="${esc(full === GENERAL ? '' : full)}">+ העלאה לכאן</button></summary>
        <div class="lib-body">
          ${kids.map(k => folderHtml(node.kids[k], full, folders, depth + 1)).join('')}
          ${node.files.sort((a, b) => String(a.fileName).localeCompare(String(b.fileName), 'he', { numeric: true })).map(f => fileRowHtml(f, folders)).join('')}
        </div>
      </details>`;
  }

  function renderFiles() {
    const el = document.getElementById('gfiles-list');
    const badge = document.getElementById('lib-count');
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
    el.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      upTarget = b.dataset.up;
      document.getElementById('gfile-input').click();
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

  let upTarget = null;       // תיקייה שנבחרה מכפתור "העלאה לכאן" (null = לשאול)
  function takeFiles(list) {
    const files = Array.from(list || []);
    if (!files.length) return;
    if (upTarget !== null) { const f = upTarget; upTarget = null; uploadFiles(files, f); }
    else askFolder(files);
  }
  function initUpload() {
    const dz = document.getElementById('gdrop-zone');
    const input = document.getElementById('gfile-input');
    // השדה יושב בתוך האזור — הלחיצה שלו מבעבעת לכאן ואסור שתאפס את התיקייה שנבחרה
    dz.addEventListener('click', e => { if (e.target === input) return; upTarget = null; input.click(); });
    input.addEventListener('change', () => { takeFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => {
      e.preventDefault(); dz.classList.add('over');
    }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => {
      e.preventDefault(); dz.classList.remove('over');
    }));
    dz.addEventListener('drop', e => { upTarget = null; takeFiles(e.dataTransfer.files); });
    document.getElementById('lib-ask-cancel').addEventListener('click', closeAsk);
    const go = () => {
      const name = document.getElementById('lib-newfolder').value.trim();
      if (!name) { document.getElementById('lib-newfolder').focus(); return; }
      doUpload(name);
    };
    document.getElementById('lib-newfolder-go').addEventListener('click', go);
    document.getElementById('lib-newfolder').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    const search = document.getElementById('lib-search');
    search.addEventListener('input', () => { libSearch = search.value; renderFiles(); });
    document.getElementById('lib-link-add').addEventListener('click', addLink);
    renderDriveCard();
  }

  async function addLink() {
    const url = document.getElementById('lib-link-url').value.trim();
    const name = document.getElementById('lib-link-name').value.trim();
    const status = document.getElementById('gfiles-status');
    if (!/^https:\/\//.test(url)) { status.textContent = 'הקישור צריך להתחיל ב-https://'; return; }
    const auth = window.GUIDE_AUTH ? window.GUIDE_AUTH() : {};
    if (!(auth.k || auth.ge)) { status.textContent = 'הוספת קישור דורשת כניסה מהקישור האישי.'; return; }
    const tops = allFolders().topics;
    const ans = window.prompt('לאיזו תיקייה להוסיף את הקישור?\n' + tops.concat([GENERAL]).map((f, i) => (i + 1) + '. ' + f).join('\n') +
      '\n\nאפשר להקליד מספר, או שם של תיקייה חדשה:', '');
    if (ans === null) return;
    const n = Number(ans.trim());
    if (/^\d+$/.test(ans.trim()) && !(n >= 1 && n <= tops.length + 1)) { status.textContent = 'אין תיקייה במספר הזה.'; return; }
    const pick = /^\d+$/.test(ans.trim()) ? tops.concat([GENERAL])[n - 1] : ans.trim();
    const folder = !pick || pick === GENERAL ? '' : pick;
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

  async function uploadFiles(fileList, folder) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    folder = folder || '';
    const status = document.getElementById('gfiles-status');
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
    renderFiles();
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

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safeUrl(u) { return /^https:\/\//i.test(String(u || '')) ? u : '#'; }
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
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
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
})();
