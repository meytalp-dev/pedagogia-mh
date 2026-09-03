// School Principal — Teacher Entry v2
// לינק אחד לכל המנהלים: בוחרים בית ספר → מקלידים מורים לפי מקצוע / מדביקים מאקסל.
// כל שינוי נשמר לגיליון ברקע דרך תור שמירה (teachers.create / update / delete).

let schoolId = TS.urlParam('school', '');
let school = null;
let allSchools = [];
let curSubject = 'מתמטיקה';
let curType = 'bagrut';

// שורת מורה מקומית: { uid, serverId, name, subject, type, phone, email, seniority,
//                     needsCreate, needsUpdate, deleteAfterCreate, error }
let teachers = [];
let deleteQueue = [];   // serverIds למחיקה
let uidSeq = 0;

// הטיוטה נכתבת רק אחרי ש-restoreDraft רץ לבית הספר הנוכחי. בלי הדגל הזה,
// לולאת השמירה (שרצה כבר בזמן בחירת בית הספר) מוצאת רשימת מורים ריקה
// ומוחקת את הטיוטה — בדיוק לפני שהיא אמורה להישלף. זה מחק הזנות שלמות.
let draftReady = false;

// בנייד: בלי autofocus בטעינה — הוא גורר גלילה למטה ופתיחת מקלדת
const IS_TOUCH = window.matchMedia('(hover: none)').matches;

// מגזר לפי בית ספר (פריסת הפיקוח תשפ"ז) — נטען ברקע; מורה חדש נשמר עם המגזר הנכון
let sectorBySchool = {};
fetch('../_data/sector-map-2027.json')
  .then(r => r.json())
  .then(map => { (map.schools || []).forEach(s => { sectorBySchool[s.id] = s.sector; }); })
  .catch(() => {});

document.addEventListener('DOMContentLoaded', async () => {
  initEntryUI();
  if (schoolId) {
    document.getElementById('main-content').hidden = false;
    await loadDirect();
  } else {
    await showSchoolPicker();
  }
  startSaveLoop();
});

window.addEventListener('beforeunload', e => {
  if (unsavedCount() > 0) { e.preventDefault(); e.returnValue = ''; }
});

// ============================================================
// שלב 0 — בחירת בית ספר (לינק כללי בלי ?school=)
// ============================================================

async function showSchoolPicker() {
  document.getElementById('school-picker').hidden = false;

  const nsNet = document.getElementById('ns-network');
  TS.NETWORKS.forEach(n => nsNet.insertAdjacentHTML('beforeend', `<option value="${n.id}">${n.name}</option>`));

  document.getElementById('school-search').addEventListener('input', e => renderSchoolList(e.target.value));
  document.getElementById('btn-show-create').addEventListener('click', () => {
    const f = document.getElementById('form-new-school');
    f.hidden = !f.hidden;
    if (!f.hidden) f.querySelector('[name="name"]').focus();
  });
  document.getElementById('form-new-school').addEventListener('submit', createNewSchool);

  window.scrollTo(0, 0);
  if (!IS_TOUCH) document.getElementById('school-search').focus();

  // טעינה מיידית מהקובץ הסטטי שבאתר — הרשימה מופיעה בלי לחכות לשרת
  let renderedStatic = false;
  try {
    const r = await fetch('../_data/schools-2027.json');
    if (r.ok) {
      const j = await r.json();
      allSchools = (j.schools || [])
        .map(s => ({ id: s.id, name: s.name, network: s.network || '' }))
        .sort((a, b) => a.name.localeCompare(b.name, 'he'));
      if (allSchools.length) {
        renderSchoolList(document.getElementById('school-search').value);
        renderedStatic = true;
      }
    }
  } catch (e) { /* file:// או קובץ חסר — ניפול לשרת */ }

  // רענון שקט מהשרת ברקע — קולט בתי ספר שנוספו ורשתות שהושלמו מאז
  TS.api('schools.list', {}, { cache: 'no' }).then(res => {
    const live = (res.data || []).filter(s => s.name);
    if (live.length) {
      allSchools = live.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      renderSchoolList(document.getElementById('school-search').value);
    } else if (!renderedStatic) {
      renderSchoolList('');
    }
  });
}

function renderSchoolList(query) {
  const listEl = document.getElementById('school-list');
  const q = (query || '').trim();
  const matches = q ? allSchools.filter(s => s.name.includes(q)) : allSchools;
  if (!matches.length) {
    listEl.innerHTML = `<div class="empty-msg">לא נמצא בית ספר כזה — אפשר להוסיף אותו בכפתור למטה</div>`;
    return;
  }
  listEl.innerHTML = matches.map(s => `
    <button type="button" class="school-item" data-id="${s.id}">
      <span class="s-name">${s.name}</span>
      ${s.network ? TS.netChip(String(s.network).replace(/^net_/, '')) : '<span class="s-net-none">רשת טרם הוגדרה</span>'}
    </button>
  `).join('');
  listEl.querySelectorAll('.school-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const chosen = allSchools.find(s => s.id === btn.dataset.id);
      if (chosen) enterSchool(chosen);
    });
  });
}

async function createNewSchool(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  if (!data.name || !data.network) { TS.toast('יש למלא שם ורשת'); return; }

  const existing = allSchools.find(s => s.name.trim() === data.name.trim());
  if (existing) {
    TS.toast('בית הספר כבר קיים ברשימה — נכנסנו אליו');
    enterSchool(existing);
    return;
  }

  data.network = 'net_' + data.network;
  const res = await TS.apiPost('school.create', data);
  if (res.ok && res.data) {
    TS.toast('בית הספר נוסף');
    enterSchool(res.data);
  } else {
    TS.toast('שגיאה — ' + (res.error || ''));
  }
}

async function enterSchool(chosen) {
  school = chosen;
  draftReady = false;     // נועל את הטיוטה עד שהיא תישלף — ראו saveDraft
  schoolId = chosen.id;
  const url = new URL(location.href);
  url.searchParams.set('school', schoolId);
  history.replaceState(null, '', url);

  document.getElementById('school-picker').hidden = true;
  document.getElementById('main-content').hidden = false;
  window.scrollTo(0, 0);

  renderHeader();
  await loadTeachers();
  focusRapid();
}

async function loadDirect() {
  const [schoolRes] = await Promise.all([
    TS.api('school.get', { id: schoolId }, { cache: 'no' })
  ]);
  school = schoolRes.data || { id: schoolId, name: '—', network: '' };
  renderHeader();
  await loadTeachers();
  focusRapid();
}

async function loadTeachers() {
  // הדף פתוח להקלדה כבר בזמן הטעינה (2–4 שניות מול Apps Script). מה שהוקלד
  // בינתיים חי רק במערך המקומי — שומרים אותו בצד כדי שהרשימה מהשרת לא תדרוס אותו.
  const localPending = teachers.filter(t => !t.serverId);
  const res = await TS.api('teachers.list', { school: schoolId }, { cache: 'no' });
  teachers = (res.data || []).map(t => ({
    uid: 'u' + (++uidSeq),
    serverId: t.id,
    name: t.name || '',
    subject: t.subject || '',
    type: t.type === 'gemer' ? 'gemer' : 'bagrut',
    phone: (t.phone || '').toString(),
    email: t.email || '',
    seniority: t.seniority ? String(t.seniority) : '',
    needsCreate: false, needsUpdate: false, deleteAfterCreate: false, error: false
  }));
  localPending.forEach(t => {
    if (teachers.some(x => x.name === t.name && x.subject === t.subject)) return;
    teachers.push(t);
  });
  const restored = restoreDraft();
  draftReady = true;      // מכאן הטיוטה משקפת את המצב האמיתי ומותר לכתוב אליה
  renderAll();
  if (restored) TS.toast('שוחזרו ' + restored + ' מורים שלא הספיקו להישמר — הם נשמרים עכשיו');
}

// ============================================================
// כותרת — שם בי"ס + השלמת רשת + שם מנהל.ת
// ============================================================

function renderHeader() {
  if (!school) return;
  document.getElementById('school-name').textContent = school.name || '—';
  document.getElementById('hero-title').textContent = 'המורים של ' + (school.name || '—');

  const prEl = document.getElementById('principal-name');
  if (school.principalName) {
    prEl.textContent = school.principalName;
  } else {
    renderPrincipalFix(prEl);
  }
  const chipEl = document.getElementById('network-chip');
  const netId = (school.network || '').toString().replace(/^net_/, '');
  if (netId) {
    chipEl.innerHTML = TS.netChip(netId);
  } else {
    renderNetworkFix(chipEl);
  }
}

function renderPrincipalFix(el) {
  el.innerHTML = `<input class="input" id="fix-principal" placeholder="מה שמך? (שם המנהל.ת)"
      style="width:auto; display:inline-block; padding:4px 10px; font-size:13px;">
    <button type="button" class="btn btn-secondary" id="fix-principal-save" style="padding:4px 12px; font-size:13px;">שמירה</button>`;
  const save = async () => {
    const v = el.querySelector('#fix-principal').value.trim();
    if (!v) return;
    const res = await TS.apiPost('school.update', { id: school.id || schoolId, principalName: v });
    if (!res.ok) { TS.toast('שגיאה בשמירת השם — ' + (res.error || '')); return; }
    school.principalName = v;
    TS.toast('נעים מאוד, ' + v + '!');
    renderHeader();
  };
  el.querySelector('#fix-principal-save').addEventListener('click', save);
  el.querySelector('#fix-principal').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
  });
}

function renderNetworkFix(el) {
  el.innerHTML = `<select class="select" id="fix-network" style="width:auto; display:inline-block; padding:4px 10px; font-size:13px;">
    <option value="">לאיזו רשת שייך בית הספר?</option>
    ${TS.NETWORKS.map(n => `<option value="${n.id}">${n.name}</option>`).join('')}
  </select>`;
  el.querySelector('#fix-network').addEventListener('change', async e => {
    const v = e.target.value;
    if (!v) return;
    const res = await TS.apiPost('school.update', { id: school.id || schoolId, network: 'net_' + v });
    if (!res.ok) { TS.toast('שגיאה בשמירת הרשת — ' + (res.error || '')); return; }
    school.network = 'net_' + v;
    TS.toast('הרשת נשמרה');
    renderHeader();
  });
}

// ============================================================
// הזנת מורים — צ'יפים, הקלדה מהירה, הדבקה
// ============================================================

function initEntryUI() {
  // לשוניות
  document.getElementById('tab-type').addEventListener('click', () => switchTab('type'));
  document.getElementById('tab-paste').addEventListener('click', () => switchTab('paste'));
  // מתג בגרות/גמר
  document.querySelectorAll('#type-seg button').forEach(b =>
    b.addEventListener('click', () => setType(b.dataset.type)));
  // הקלדה מהירה
  document.getElementById('rapid').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); rapidAdd(); }
  });
  document.getElementById('rapid-phone').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); rapidAdd(); }
  });
  // הדבקת כמה שורות ישר לשדה השם
  document.getElementById('rapid').addEventListener('paste', e => {
    const txt = (e.clipboardData || window.clipboardData).getData('text');
    if (txt && txt.includes('\n')) {
      e.preventDefault();
      let n = 0;
      txt.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        // שורת כותרת של מקצוע — מחליפה את המקצוע הפעיל במקום להפוך לשם מורה
        const subj = subjectOfCell(trimmed);
        if (subj) { curSubject = subj; return; }
        if (addTeacherLocal(trimmed, {})) n++;
      });
      renderChips();
      if (n) { flash(n + ' נוספו ✓'); renderAll(); }
    }
  });
  document.getElementById('paste').addEventListener('input', parsePaste);
  document.getElementById('btn-add-pasted').addEventListener('click', addPasted);
  document.getElementById('btn-export').addEventListener('click', exportCsv);
  renderChips();
}

// מקבע שם שנשאר בתיבת ההקלדה. בלי זה, מעבר מקצוע/לשונית מוחק אותו בשקט
// או משייך אותו למקצוע הלא נכון.
function commitPending() {
  const el = document.getElementById('rapid');
  if (el && el.value.trim()) rapidAdd();
}

function switchTab(t) {
  if (t !== 'type') commitPending();
  document.getElementById('tab-type').classList.toggle('active', t === 'type');
  document.getElementById('tab-paste').classList.toggle('active', t === 'paste');
  document.getElementById('panel-type').style.display = t === 'type' ? '' : 'none';
  document.getElementById('panel-paste').style.display = t === 'paste' ? '' : 'none';
  if (t === 'type') focusRapid(); else document.getElementById('paste').focus();
}

function setType(t) {
  curType = t;
  document.querySelectorAll('#type-seg button').forEach(b => b.classList.toggle('active', b.dataset.type === t));
  focusRapid();
}

function focusRapid(force) {
  if (IS_TOUCH && !force) return;  // בנייד — מקלדת נפתחת רק ממגע של המשתמש
  const el = document.getElementById('rapid');
  if (el && document.getElementById('panel-type').style.display !== 'none') el.focus();
}

function renderChips() {
  const counts = {};
  teachers.forEach(t => counts[t.subject] = (counts[t.subject] || 0) + 1);
  // חשוב: הגרשיים בתנ"ך שוברות את ה-attribute — חייבים escape, אחרת המקצוע נשמר "תנ"
  document.getElementById('subject-chips').innerHTML = TS.SUBJECTS.map(s => `
    <button type="button" class="subject-chip ${s === curSubject ? 'active' : ''}" data-subject="${s.replace(/"/g, '&quot;')}">
      ${s}${counts[s] ? `<span class="cnt">${counts[s]}</span>` : ''}
    </button>`).join('');
  document.querySelectorAll('.subject-chip').forEach(b =>
    b.addEventListener('click', () => {
      const next = b.dataset.subject;
      commitPending();          // מה שמוקלד שייך למקצוע הנוכחי — מקבעים לפני ההחלפה
      curSubject = next;
      renderChips();
      focusRapid();
    }));

}

function flash(msg) {
  const f = document.getElementById('flash');
  f.textContent = msg || 'נוסף ✓';
  f.classList.add('show');
  setTimeout(() => f.classList.remove('show'), 1100);
}

// הוספת מורה מקומית + תיזמון שמירה. מחזירה false אם שם ריק / כפילות מדויקת.
function addTeacherLocal(name, extra) {
  name = (name || '').trim();
  if (!name) return false;
  const subject = extra.subject || curSubject;
  if (teachers.some(t => t.name === name && t.subject === subject)) return false;
  const existing = teachers.find(t => t.name === name);
  teachers.push({
    uid: 'u' + (++uidSeq),
    serverId: null,
    name,
    subject,
    type: extra.type || curType,
    phone: (extra.phone || (existing ? existing.phone : '') || '').trim(),
    email: extra.email || (existing ? existing.email : '') || '',
    seniority: extra.seniority || (existing ? existing.seniority : '') || '',
    needsCreate: true, needsUpdate: false, deleteAfterCreate: false, error: false
  });
  saveDraft();   // מיידי — לא מחכים לסבב הבא של התור
  return true;
}

function rapidAdd() {
  const nameEl = document.getElementById('rapid');
  const phoneEl = document.getElementById('rapid-phone');
  const name = nameEl.value.trim();
  if (!name) return;

  const existing = teachers.find(t => t.name === name);
  if (teachers.some(t => t.name === name && t.subject === curSubject)) {
    flash('כבר ברשימה של ' + curSubject);
    nameEl.value = ''; phoneEl.value = ''; nameEl.focus();
    return;
  }
  let phone = phoneEl.value.trim();
  if (!phone && existing && existing.phone) phone = existing.phone;
  // מורה בלי טלפון נקלט ומסומן להשלמה — בדיוק כמו במסלול ההדבקה.
  // חסימה כאן איבדה מורים בשקט: השם נשאר בתיבה והמעבר למקצוע הבא מחק אותו.
  phoneEl.classList.remove('field-missing');
  if (addTeacherLocal(name, { phone })) {
    nameEl.value = ''; phoneEl.value = '';
    flash(!phone ? 'נוסף — חסר טלפון ⚠️'
        : existing ? 'נוסף גם ל' + curSubject + ' ✓' : 'נוסף ✓');
    renderAll();
    nameEl.focus();
  }
}

// ---------- הדבקה מאקסל ----------
let parsed = [];

// זיהוי מקצוע גם עם שגיאות כתיב נפוצות ובלי גרשיים ("הסטוריה", "תנך").
// בלי זה, שורת כותרת כזו נבלעת כשם מורה ומקבלת את מקצוע ברירת המחדל.
const SUBJECT_ALIASES = {
  'הסטוריה': 'היסטוריה', 'היסטורה': 'היסטוריה',
  'מתימטיקה': 'מתמטיקה', 'מתמטיקת': 'מתמטיקה',
  'לשון': 'עברית', 'לשון והבעה': 'עברית', 'עברית לשון': 'עברית',
  'ספרויות': 'ספרות'
};
function subjectOfCell(c) {
  const clean = (c || '').replace(/["'׳״]/g, '').trim();
  if (!clean) return null;
  const hit = TS.SUBJECTS.find(s => s.replace(/["'׳״]/g, '') === clean);
  if (hit) return hit;
  if (SUBJECT_ALIASES[clean]) return SUBJECT_ALIASES[clean];
  return null;
}

function parsePaste() {
  const txt = document.getElementById('paste').value.trim();
  parsed = [];
  const box = document.getElementById('preview-box');
  if (!txt) { box.style.display = 'none'; return; }
  const typeMap = { 'בגרות': 'bagrut', 'גמר': 'gemer' };
  let runningSubject = '';   // שורת כותרת של מקצוע חלה על השורות שאחריה
  txt.split(/\r?\n/).forEach(line => {
    if (!line.trim()) return;
    const cells = line.split(/\t|,|;/).map(c => c.trim()).filter(c => c !== '');
    if (!cells.length) return;
    // שורה שכולה שם מקצוע = כותרת, לא מורה
    if (cells.length === 1 && subjectOfCell(cells[0])) {
      runningSubject = subjectOfCell(cells[0]);
      return;
    }
    const t = { name: '', subject: '', type: '', phone: '', email: '', seniority: '' };
    cells.forEach(c => {
      const clean = c.replace(/["']/g, '');
      const subj = subjectOfCell(c);
      if (clean.includes('@')) t.email = clean;
      else if (/^0?\d[\d\s-]{7,}$/.test(clean)) t.phone = clean;
      else if (typeMap[clean]) t.type = typeMap[clean];
      else if (subj) t.subject = subj;
      else if (/^\d{1,2}$/.test(clean)) t.seniority = clean;
      else if (!t.name && /[א-ת]/.test(clean)) t.name = clean;
    });
    if (!t.subject && runningSubject) t.subject = runningSubject;
    if (t.name) parsed.push(t);
  });
  if (!parsed.length) { box.style.display = 'none'; return; }
  box.style.display = '';
  const withSub = parsed.filter(p => p.subject).length;
  const noPhone = parsed.filter(p => !p.phone).length;
  document.getElementById('detected').innerHTML =
    `זוהו <b>${parsed.length} מורים</b> · ${withSub} עם מקצוע (לשאר יוצמד ${curSubject})` +
    (noPhone ? ` · <span class="missing-note">⚠️ ${noPhone} בלי טלפון — יסומנו ברשימה להשלמה</span>` : '');
  document.getElementById('preview-table').innerHTML = `
    <thead><tr><th>שם</th><th>מקצוע</th><th>סוג</th><th>טלפון</th><th>מייל</th></tr></thead>
    <tbody>${parsed.map(p => `<tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.subject || `<span style="color:var(--text-3)">${curSubject} (ברירת מחדל)</span>`}</td>
      <td>${p.type === 'gemer' ? 'גמר' : 'בגרות'}</td>
      <td>${p.phone || '<span class="missing-note">חסר ⚠️</span>'}</td><td>${p.email || '—'}</td>
    </tr>`).join('')}</tbody>`;
}

function addPasted() {
  let n = 0;
  parsed.forEach(p => { if (addTeacherLocal(p.name, p)) n++; });
  document.getElementById('paste').value = '';
  document.getElementById('preview-box').style.display = 'none';
  if (n) TS.toast(n + ' מורים נוספו לרשימה');
  renderAll();
  switchTab('type');
}

// ============================================================
// רשימה מקובצת לפי מקצוע
// ============================================================

function findByUid(uid) { return teachers.find(t => t.uid === uid); }

function toggleType(uid) {
  const t = findByUid(uid);
  if (!t) return;
  t.type = t.type === 'bagrut' ? 'gemer' : 'bagrut';
  markDirty(t);
  renderAll();
}

// פרטי-קשר של מורה רב-מקצועי מתעדכנים בכל המקצועות שלו יחד
function saveDetail(uid, field, val) {
  const row = findByUid(uid);
  if (!row) return;
  teachers.forEach(t => {
    if (t.name === row.name) { t[field] = val; markDirty(t); }
  });
  renderAll();
}

function markDirty(t) {
  if (!t.serverId && t.needsCreate) return; // הערכים העדכניים ייכנסו ליצירה ממילא
  t.needsUpdate = true;
}

function removeTeacher(uid) {
  const idx = teachers.findIndex(t => t.uid === uid);
  if (idx < 0) return;
  const t = teachers[idx];
  if (!confirm('להסיר את ' + t.name + ' (' + t.subject + ')?')) return;
  teachers.splice(idx, 1);
  if (t.serverId) deleteQueue.push(t.serverId);
  else if (!t.needsCreate) { /* בתהליך יצירה */ t.deleteAfterCreate = true; ghostRows.push(t); }
  renderAll();
}

function toggleDetails(uid) {
  const el = document.getElementById('det-' + uid);
  if (el) el.classList.toggle('open');
}

function renderAll() {
  document.getElementById('count').textContent = teachers.length;
  renderChips();
  updateSaveStatus();
  const roster = document.getElementById('roster');
  if (!teachers.length) {
    roster.innerHTML = `<div class="empty-roster">עדיין אין מורים — הקלידו שם וטלפון למעלה ולחצו Enter</div>`;
    return;
  }
  const groups = {};
  teachers.forEach(t => { (groups[t.subject] = groups[t.subject] || []).push(t); });
  const subjectOrder = [...TS.SUBJECTS, ...Object.keys(groups).filter(s => !TS.SUBJECTS.includes(s))];
  roster.innerHTML = subjectOrder.filter(s => groups[s]).map(s => {
    const missing = groups[s].filter(t => !t.phone).length;
    return `
    <div class="subject-group">
      <div class="subject-group-head"><span>${s}</span><span class="n">${groups[s].length} מורים${missing ? ` · <span class="missing-note">⚠️ ${missing} בלי טלפון</span>` : ''}</span></div>
      ${groups[s].map(t => {
        const others = teachers.filter(x => x.name === t.name && x.subject !== t.subject).map(x => x.subject);
        return `
        <div class="t-row ${t.error ? 't-error' : ''}">
          <span class="t-name">${t.name}${others.length ? `<span class="also">מלמד/ת גם ${others.join(' · ')}</span>` : ''}</span>
          <button type="button" class="t-type ${t.type}" data-uid="${t.uid}" data-act="type" title="לחיצה מחליפה">${t.type === 'gemer' ? 'גמר' : 'בגרות'}</button>
          <input class="t-phone" placeholder="טלפון חסר!" value="${t.phone}" inputmode="tel" data-uid="${t.uid}" data-field="phone">
          <span class="t-more">${[t.email, t.seniority ? 'ותק ' + t.seniority : ''].filter(Boolean).join(' · ')}${t.error ? ' <span class="missing-note">⚠️ לא נשמר — ננסה שוב</span>' : ''}</span>
          <span class="t-actions">
            <button type="button" class="mini-btn" data-uid="${t.uid}" data-act="details">פרטים</button>
            <button type="button" class="mini-btn" data-uid="${t.uid}" data-act="remove">הסרה</button>
          </span>
          <div class="t-details" id="det-${t.uid}">
            <input placeholder="מייל" value="${t.email}" data-uid="${t.uid}" data-field="email">
            <input placeholder="שנות ותק" value="${t.seniority}" data-uid="${t.uid}" data-field="seniority">
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');

  roster.querySelectorAll('[data-act="type"]').forEach(b => b.addEventListener('click', () => toggleType(b.dataset.uid)));
  roster.querySelectorAll('[data-act="details"]').forEach(b => b.addEventListener('click', () => toggleDetails(b.dataset.uid)));
  roster.querySelectorAll('[data-act="remove"]').forEach(b => b.addEventListener('click', () => removeTeacher(b.dataset.uid)));
  roster.querySelectorAll('input[data-field]').forEach(inp =>
    inp.addEventListener('change', () => saveDetail(inp.dataset.uid, inp.dataset.field, inp.value.trim())));
}

// ============================================================
// תור שמירה — פעולה אחת בכל רגע, רץ ברקע כל הזמן
// ============================================================

let saving = false;
let ghostRows = [];   // שורות שנמחקו בזמן שהיצירה שלהן באוויר

// ============================================================
// רשת ביטחון — טיוטה מקומית
// ============================================================
// השמירה לגיליון היא מורה־מורה, כ-4–12 שניות לכל אחת. עד עכשיו התור חי רק
// בזיכרון הדף: סגירת טאב / נעילת מסך / נפילת רשת מחקו את כל מה שטרם נשמר.
// כאן כל שורה שממתינה נכתבת מיידית ל-localStorage ומשוחזרת בפתיחה הבאה.

function draftKey() { return 'ts.draft.' + schoolId; }

function saveDraft() {
  if (!schoolId || !draftReady) return;
  try {
    const pending = teachers
      .filter(t => t.needsCreate || t.needsUpdate || !t.serverId)
      .map(t => ({
        name: t.name, subject: t.subject, type: t.type,
        phone: t.phone, email: t.email, seniority: t.seniority
      }));
    if (!pending.length && !deleteQueue.length) localStorage.removeItem(draftKey());
    else localStorage.setItem(draftKey(), JSON.stringify({ ts: Date.now(), pending, deleteQueue }));
  } catch (e) { /* מצב פרטי / אחסון מלא — לא מפילים את הדף */ }
}

// מוחזרת אחרי טעינת המורים מהשרת: מחזירה רק שורות שלא הספיקו להישמר.
function restoreDraft() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch (e) { return 0; }
  if (!d || !Array.isArray(d.pending)) return 0;
  let n = 0;
  d.pending.forEach(x => {
    if (!x || !x.name) return;
    if (teachers.some(t => t.name === x.name && t.subject === x.subject)) return;  // כבר בשרת
    teachers.push({
      uid: 'u' + (++uidSeq), serverId: null,
      name: x.name, subject: x.subject || 'מתמטיקה',
      type: x.type === 'gemer' ? 'gemer' : 'bagrut',
      phone: (x.phone || '').toString(), email: x.email || '', seniority: x.seniority || '',
      needsCreate: true, needsUpdate: false, deleteAfterCreate: false, error: false
    });
    n++;
  });
  (d.deleteQueue || []).forEach(id => { if (deleteQueue.indexOf(id) < 0) deleteQueue.push(id); });
  return n;
}

function unsavedCount() {
  return teachers.filter(t => !t.serverId || t.needsUpdate).length + deleteQueue.length + ghostRows.length;
}

function updateSaveStatus() {
  const el = document.getElementById('save-status');
  if (!el) return;
  // "נשמר" = יש לו serverId מהשרת. הדגל needsCreate מכובה כבר עם שליחת הבקשה,
  // ולכן ספירה לפיו הציגה מורה כ"נשמר" בזמן שהוא עדיין באוויר.
  const pending = teachers.filter(t => !t.serverId || t.needsUpdate).length;
  const n = unsavedCount();
  if (n === 0) {
    el.textContent = teachers.length
      ? '✓ כל ' + teachers.length + ' המורים נשמרו בגיליון'
      : '✓ הכל נשמר';
    el.className = 'save-status ok';
  } else {
    const saved = Math.max(0, teachers.length - pending);
    el.textContent = '⏳ נשמרו ' + saved + ' מתוך ' + teachers.length +
      ' — אל תסגרו את הדף עד ש-"✓ כל המורים נשמרו"';
    el.className = 'save-status busy';
  }
  const warn = document.getElementById('save-warn');
  if (warn) warn.hidden = (n === 0);
}

function startSaveLoop() {
  setInterval(() => { processQueue(); saveDraft(); }, 1200);
}

async function processQueue() {
  if (saving || !schoolId) return;
  saving = true;
  try {
    // 1. מחיקות
    while (deleteQueue.length) {
      const id = deleteQueue[0];
      const res = await TS.apiPost('teachers.delete', { id });
      if (res.ok || res.error === 'not_found') deleteQueue.shift();
      else { break; }
      updateSaveStatus();
    }
    // 2. יצירות — מורה שנכשל שוב ושוב יורד לסוף התור. אחרת שורה בעייתית אחת
    //    בראש הרשימה חוסמת את כל המורים שאחריה, והם לא מגיעים לשרת בכלל.
    const toCreate = teachers.find(t => t.needsCreate && (t.fails || 0) < 3)
                  || teachers.find(t => t.needsCreate);
    if (toCreate) {
      // אחרי כשל תגובה — ייתכן שהיצירה כן בוצעה בשרת. בודקים לפני ניסיון חוזר,
      // אחרת המורה ייווצר פעמיים.
      if (toCreate.error) {
        const chk = await TS.api('teachers.list', { school: schoolId }, { cache: 'no' });
        const hit = (chk.data || []).find(x => x.name === toCreate.name && x.subject === toCreate.subject);
        if (hit) {
          toCreate.serverId = hit.id;
          toCreate.needsCreate = false;
          toCreate.needsUpdate = true;  // מסנכרנים את הערכים הנוכחיים
          toCreate.error = false;
          renderAll();
          return;
        }
      }
      toCreate.needsCreate = false; // עריכות בזמן השמירה יסמנו needsUpdate
      const res = await TS.apiPost('teachers.create', {
        school: schoolId,
        schoolName: school ? (school.name || '') : '',
        network: school ? (school.network || '') : '',
        sector: sectorBySchool[schoolId] || '',
        name: toCreate.name,
        subject: toCreate.subject,
        type: toCreate.type,
        phone: toCreate.phone,
        email: toCreate.email,
        seniority: toCreate.seniority
      });
      if (res.ok && res.data) {
        toCreate.serverId = res.data.id;
        toCreate.error = false;
        if (toCreate.deleteAfterCreate) {
          deleteQueue.push(toCreate.serverId);
          ghostRows = ghostRows.filter(g => g !== toCreate);
        }
        toCreate.fails = 0;
      } else {
        toCreate.needsCreate = true;
        toCreate.error = true;
        toCreate.fails = (toCreate.fails || 0) + 1;
        renderAll();
      }
      updateSaveStatus();
    }
    // 3. עדכונים
    const toUpdate = teachers.find(t => t.needsUpdate && t.serverId);
    if (toUpdate) {
      toUpdate.needsUpdate = false;
      const res = await TS.apiPost('teachers.update', {
        id: toUpdate.serverId,
        name: toUpdate.name,
        subject: toUpdate.subject,
        type: toUpdate.type,
        phone: toUpdate.phone,
        email: toUpdate.email,
        seniority: toUpdate.seniority
      });
      if (!res.ok) { toUpdate.needsUpdate = true; toUpdate.error = true; renderAll(); }
      else if (toUpdate.error) { toUpdate.error = false; renderAll(); }
      updateSaveStatus();
    }
  } catch (e) {
    // רשת נפלה — ננסה בסבב הבא
  } finally {
    saving = false;
    updateSaveStatus();
  }
}

// ============================================================
// ייצוא CSV
// ============================================================

function exportCsv() {
  const headers = ['שם','מקצוע','סוג','טלפון','מייל','ותק'];
  const lines = [headers.join(',')];
  teachers.forEach(t => {
    const row = [t.name, t.subject, t.type === 'gemer' ? 'גמר' : 'בגרות', t.phone, t.email, t.seniority]
      .map(v => `"${(v || '').toString().replace(/"/g, '""')}"`);
    lines.push(row.join(','));
  });
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'morim-' + ((school && school.name) || 'export') + '.csv';
  a.click();
}
