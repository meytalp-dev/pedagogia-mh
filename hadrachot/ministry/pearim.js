// מבט ארצי — פערים ומעקב · מצפן ההדרכות
// שלושה חתכים שהמבט הארצי לא נותן: מי חסר מורה במקצוע, מי טרם הזין בכלל, ומי אחראי (מפקח.ת).

const SUBJECTS = ['מתמטיקה', 'אנגלית', 'עברית', 'ספרות', 'היסטוריה', 'תנ"ך', 'אזרחות', 'ערבית'];

// מקצועות שאינם נלמדים בכל המגזרים — משבצת "לא רלוונטי", לא פער
const SECTOR_RULES = {
  'תנ"ך': ['kelali', 'haredi'],
  'ערבית': ['arab']
};

const SECTOR_NAMES = { kelali: 'כללי', haredi: 'חרדי', arab: 'ערבי' };

let schools = [];        // { id, name, network, sector, inspector, district, teachers, bySubject }
let inspectors = [];     // { name, color }
let unmapped = [];

document.addEventListener('DOMContentLoaded', load);

async function load() {
  const [sectorMap, inspMap] = await Promise.all([
    loadJson('../_data/sector-map-2027.json'),
    loadJson('../_data/inspector-map-2027.json')
  ]);

  const sectorBySchool = {};
  (sectorMap.schools || []).forEach(s => { sectorBySchool[s.id] = s.sector; });

  const inspBySchool = {};
  (inspMap.schools || []).forEach(s => { inspBySchool[s.id] = s; });
  inspectors = inspMap.inspectors || [];
  unmapped = (inspMap.meta && inspMap.meta.unmapped) || [];

  const [schoolsRes, teachersRes] = await Promise.all([
    TS.api('schools.list', {}, { cache: 'no' }),
    TS.api('teachers.list', {}, { cache: 'no' })
  ]);

  if (!schoolsRes.ok || !teachersRes.ok) { renderError(); return; }

  const teachers = teachersRes.data || [];
  const byS = {};
  teachers.forEach(t => { (byS[t.school] = byS[t.school] || []).push(t); });

  schools = (schoolsRes.data || []).filter(s => s.name).map(s => {
    const mine = byS[s.id] || [];
    const bySubject = {};
    SUBJECTS.forEach(sub => { bySubject[sub] = 0; });
    mine.forEach(t => { if (bySubject[t.subject] !== undefined) bySubject[t.subject]++; });
    const insp = inspBySchool[s.id] || {};
    return {
      id: s.id,
      name: (s.name || '').trim(),
      network: String(s.network || '').replace(/^net_/, ''),
      sector: sectorBySchool[s.id] || '',
      inspector: insp.inspector || '',
      district: insp.district || '',
      semel: insp.semel || '',
      teachers: mine.length,
      bySubject
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'he'));

  document.getElementById('updated-label').textContent = new Date().toLocaleDateString('he-IL', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  renderKpi(teachers.length);
  renderGaps();
  buildFilters();
  renderMatrix();
  renderMissing();
  buildInspSubjectBar();
  renderInspectors();
  renderInspectorMatrix();
  renderUnmappedNote();
  initNavHighlight();
}

async function loadJson(url) {
  try { const r = await fetch(url); return r.ok ? await r.json() : {}; }
  catch (e) { return {}; }
}

function renderError() {
  const msg = 'לא הצלחנו לטעון את הנתונים מהשרת — נסו לרענן את הדף.';
  ['gap-grid', 'insp-grid'].forEach(id => {
    document.getElementById(id).innerHTML = '<div class="empty-row" style="grid-column:1/-1">' + msg + '</div>';
  });
  ['mx-body', 'missing-body', 'insp-body', 'insp-mx-body'].forEach(id => {
    document.getElementById(id).innerHTML = '<tr><td colspan="12" class="empty-row">' + msg + '</td></tr>';
  });
}

// ============================================================
// עזר
// ============================================================
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function relevant(school, subject) {
  const rule = SECTOR_RULES[subject];
  if (!rule) return true;
  if (!school.sector) return true;      // מגזר לא ידוע — לא מסתירים
  return rule.includes(school.sector);
}

function entered(s) { return s.teachers > 0; }

function missingSubjects(s) {
  return SUBJECTS.filter(sub => relevant(s, sub) && !s.bySubject[sub]);
}

function networkName(id) {
  const n = (TS.NETWORKS || []).find(x => x.id === id);
  return n ? n.name : (id || '—');
}

// ============================================================
// KPI
// ============================================================
function renderKpi(totalTeachers) {
  const filled = schools.filter(entered);
  const missing = schools.filter(s => !entered(s));
  let gapCells = 0;
  filled.forEach(s => { gapCells += missingSubjects(s).length; });

  document.getElementById('kpi-filled').textContent = filled.length;
  document.getElementById('kpi-filled-sub').textContent = 'מתוך ' + schools.length + ' בתי ספר';
  document.getElementById('kpi-missing').textContent = missing.length;
  document.getElementById('kpi-teachers').textContent = totalTeachers;
  document.getElementById('kpi-teachers-sub').textContent =
    'ממוצע ' + (filled.length ? Math.round(totalTeachers / filled.length) : 0) + ' מורים לבית ספר מזין';
  document.getElementById('kpi-gaps').textContent = gapCells;

  document.getElementById('n-missing').textContent = missing.length;
  document.getElementById('n-insp').textContent = inspectors.length;
}

// ============================================================
// פערי מקצוע
// ============================================================
function renderGaps() {
  const filled = schools.filter(entered);
  const grid = document.getElementById('gap-grid');

  const cards = SUBJECTS.map((sub, i) => {
    const pool = filled.filter(s => relevant(s, sub));
    const gap = pool.filter(s => !s.bySubject[sub]);
    const ratio = pool.length ? gap.length / pool.length : 0;
    return { sub, i, pool: pool.length, gap, ratio };
  }).sort((a, b) => b.gap.length - a.gap.length);

  const totalGapSubjects = cards.filter(c => c.gap.length > 0).length;
  document.getElementById('n-gaps').textContent = totalGapSubjects;

  grid.innerHTML = cards.map(c => {
    const warn = c.ratio >= 0.25 && c.gap.length > 0;
    const names = c.gap.map(s => escapeHtml(s.name)).join(' · ');
    return '<div class="gap-card' + (warn ? ' warn' : '') + '" data-i="' + c.i + '">' +
      '<h4>' + escapeHtml(c.sub) + '</h4>' +
      '<div class="big">' + c.gap.length + '</div>' +
      '<div class="cap">' + (c.gap.length === 1 ? 'בית ספר בלי מורה במקצוע' : 'בתי ספר בלי מורה במקצוע') +
        ' · מתוך ' + c.pool + ' רלוונטיים</div>' +
      (c.gap.length
        ? '<button type="button" class="toggle">מי חסר ›</button><div class="who">' + names + '</div>'
        : '<div class="cap" style="color:#14614f; font-weight:700; margin-top:8px">כל בתי הספר מכוסים</div>') +
      '</div>';
  }).join('');

  grid.querySelectorAll('.toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.gap-card');
      const open = card.classList.toggle('open');
      btn.textContent = open ? 'סגירה ‹' : 'מי חסר ›';
    });
  });
}

// ============================================================
// מטריצה
// ============================================================
function buildFilters() {
  const secSel = document.getElementById('f-sector');
  Object.keys(SECTOR_NAMES).forEach(k => {
    secSel.insertAdjacentHTML('beforeend', '<option value="' + k + '">' + SECTOR_NAMES[k] + '</option>');
  });

  const netSel = document.getElementById('f-network');
  [...new Set(schools.map(s => s.network).filter(Boolean))].sort().forEach(id => {
    netSel.insertAdjacentHTML('beforeend', '<option value="' + escapeHtml(id) + '">' + escapeHtml(networkName(id)) + '</option>');
  });

  const inspSel = document.getElementById('f-insp');
  inspectors.forEach(i => {
    inspSel.insertAdjacentHTML('beforeend', '<option value="' + escapeHtml(i.name) + '">' + escapeHtml(i.name) + '</option>');
  });

  ['f-q', 'f-sector', 'f-network', 'f-insp', 'f-gapsonly'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderMatrix);
  });
}

function filteredSchools() {
  const q = document.getElementById('f-q').value.trim();
  const sec = document.getElementById('f-sector').value;
  const net = document.getElementById('f-network').value;
  const insp = document.getElementById('f-insp').value;
  const gapsOnly = document.getElementById('f-gapsonly').checked;

  return schools.filter(s => {
    if (q && !s.name.includes(q)) return false;
    if (sec && s.sector !== sec) return false;
    if (net && s.network !== net) return false;
    if (insp && s.inspector !== insp) return false;
    if (gapsOnly && !(entered(s) && missingSubjects(s).length)) return false;
    return true;
  });
}

function renderMatrix() {
  const head = document.getElementById('mx-head');
  head.innerHTML = '<th class="name">בית ספר</th>' +
    SUBJECTS.map(s => '<th>' + escapeHtml(s) + '</th>').join('') +
    '<th>סה"כ</th>';

  const rows = filteredSchools();
  document.getElementById('mx-count').textContent = rows.length + ' בתי ספר מוצגים';

  const body = document.getElementById('mx-body');
  if (!rows.length) {
    body.innerHTML = '<tr><td class="empty-row" colspan="' + (SUBJECTS.length + 2) + '">אין בתי ספר שמתאימים לסינון</td></tr>';
    return;
  }

  body.innerHTML = rows.map(s => {
    const cells = SUBJECTS.map(sub => {
      if (!relevant(s, sub)) return '<td class="cell-na">—</td>';
      const n = s.bySubject[sub];
      if (!entered(s)) return '<td class="cell-na">·</td>';
      return '<td>' + (n
        ? '<span class="cell-n">' + n + '</span>'
        : '<span class="cell-0">0</span>') + '</td>';
    }).join('');
    const tag = entered(s) ? '' : ' <span class="badge warn">טרם הזין</span>';
    return '<tr><td class="name" title="' + escapeHtml(s.name) + '">' + escapeHtml(s.name) + tag + '</td>' +
      cells + '<td><b>' + s.teachers + '</b></td></tr>';
  }).join('');
}

// ============================================================
// טרם הזינו
// ============================================================
// רמז לכפילות רישום: מוסד אחר עם אותו סמל מוסד שכן הזין מורים.
// לא מאחדים אוטומטית — רק מסמנים לבדיקה (יש גם זוגות בנים/בנות אמיתיים
// שחולקים סמל, כמו עמל רהט).
function twinHint(s) {
  if (!s.semel) return '';
  const twins = schools.filter(o => o.id !== s.id && o.semel === s.semel && o.teachers > 0);
  if (!twins.length) return '';
  return '<div style="font-size:.74rem; color:var(--coral); margin-top:3px">' +
    'ייתכן שזו כפילות רישום — ' +
    twins.map(t => escapeHtml(t.name) + ' (' + t.teachers + ' מורים)').join(', ') +
    ' רשום עם אותו סמל מוסד</div>';
}

function renderMissing() {
  const rows = schools.filter(s => !entered(s));
  const body = document.getElementById('missing-body');
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty-row">כל בתי הספר הזינו מורים 🎉</td></tr>';
    return;
  }
  body.innerHTML = rows.map(s =>
    '<tr>' +
      '<td><b>' + escapeHtml(s.name) + '</b>' + twinHint(s) + '</td>' +
      '<td>' + escapeHtml(networkName(s.network)) + '</td>' +
      '<td>' + escapeHtml(SECTOR_NAMES[s.sector] || '—') + '</td>' +
      '<td>' + escapeHtml(s.inspector || '—') + '</td>' +
      '<td>' + escapeHtml(s.district || '—') + '</td>' +
      '<td><button type="button" class="btn btn-soft copy-link" data-id="' + escapeHtml(s.id) + '">העתקת קישור הזנה</button></td>' +
    '</tr>'
  ).join('');

  body.querySelectorAll('.copy-link').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = new URL('../admin-school/setup.html', location.href);
      url.searchParams.set('school', btn.dataset.id);
      try {
        await navigator.clipboard.writeText(url.href);
        btn.textContent = 'הועתק ✓';
      } catch (e) {
        btn.textContent = url.href;
      }
      setTimeout(() => { btn.textContent = 'העתקת קישור הזנה'; }, 2500);
    });
  });
}

// ============================================================
// לפי מפקח.ת
// ============================================================
// המקצוע שנבחר בסרגל של חתך המפקחים ('' = כל המקצועות)
let inspSubject = '';

function inspectorGroups() {
  const byInsp = {};
  schools.forEach(s => {
    const k = s.inspector || 'טרם שויך';
    (byInsp[k] = byInsp[k] || []).push(s);
  });
  const order = inspectors.map(i => i.name).filter(n => byInsp[n]);
  if (byInsp['טרם שויך']) order.push('טרם שויך');
  return { byInsp, order };
}

function inspectorColor(name) {
  const i = inspectors.find(x => x.name === name);
  return i ? i.color : '#95A3AE';
}

function buildInspSubjectBar() {
  const bar = document.getElementById('insp-subject-bar');
  if (!bar) return;
  const pills = ['<button type="button" class="subject-pill active" data-i="-1">כל המקצועות</button>']
    .concat(SUBJECTS.map((sub, i) =>
      '<button type="button" class="subject-pill" data-i="' + i + '">' + escapeHtml(sub) + '</button>'));
  bar.insertAdjacentHTML('beforeend', pills.join(''));
  bar.querySelectorAll('.subject-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.subject-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const i = Number(btn.dataset.i);
      inspSubject = i < 0 ? '' : SUBJECTS[i];
      renderInspectors();
    });
  });
}

function renderInspectors() {
  const groups = inspectorGroups();
  const byInsp = groups.byInsp, order = groups.order;
  const grid = document.getElementById('insp-grid');
  const sub = inspSubject;

  grid.innerHTML = order.map(name => {
    const list = byInsp[name];
    const color = escapeHtml(inspectorColor(name));

    if (!sub) {
      const filled = list.filter(entered);
      const missing = list.filter(s => !entered(s));
      const teachers = list.reduce((a, s) => a + s.teachers, 0);
      const gaps = filled.reduce((a, s) => a + missingSubjects(s).length, 0);
      const pct = list.length ? Math.round(filled.length / list.length * 100) : 0;
      return '<div class="insp-card" style="--c:' + color + '">' +
        '<h4><span class="dot"></span>' + escapeHtml(name) + '</h4>' +
        '<div class="insp-stats">' +
          '<div><b>' + list.length + '</b><span>מוסדות</span></div>' +
          '<div><b>' + filled.length + '</b><span>הזינו</span></div>' +
          '<div><b>' + teachers + '</b><span>מורים</span></div>' +
          '<div><b>' + gaps + '</b><span>פערי מקצוע</span></div>' +
        '</div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        (missing.length
          ? '<div class="insp-missing">טרם הזינו: ' + missing.map(s => escapeHtml(s.name)).join(' · ') + '</div>'
          : '<div class="insp-missing" style="color:#14614f">כל המוסדות הזינו ✓</div>') +
      '</div>';
    }

    // חתך מקצוע — רק מוסדות שהמקצוע נלמד בהם
    const pool = list.filter(s => relevant(s, sub));
    if (!pool.length) {
      return '<div class="insp-card" style="--c:' + color + '">' +
        '<h4><span class="dot"></span>' + escapeHtml(name) + '</h4>' +
        '<div class="insp-missing" style="color:var(--text-soft)">' + escapeHtml(sub) +
        ' לא נלמד במוסדות של המפקח.ת</div>' +
      '</div>';
    }
    const filled = pool.filter(entered);
    const withSub = filled.filter(s => s.bySubject[sub]);
    const without = filled.filter(s => !s.bySubject[sub]);
    const teachers = pool.reduce((a, s) => a + (s.bySubject[sub] || 0), 0);
    const pct = filled.length ? Math.round(withSub.length / filled.length * 100) : 0;

    return '<div class="insp-card" style="--c:' + color + '">' +
      '<h4><span class="dot"></span>' + escapeHtml(name) + '</h4>' +
      '<div class="insp-stats">' +
        '<div><b>' + teachers + '</b><span>מורי ' + escapeHtml(sub) + '</span></div>' +
        '<div><b>' + withSub.length + '</b><span>מוסדות עם מורה</span></div>' +
        '<div><b>' + without.length + '</b><span>מוסדות בלי</span></div>' +
        '<div><b>' + pool.length + '</b><span>מוסדות רלוונטיים</span></div>' +
      '</div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      (!filled.length
        ? '<div class="insp-missing">אף מוסד לא הזין עדיין מורים</div>'
        : without.length
          ? '<div class="insp-missing">בלי מורה ב' + escapeHtml(sub) + ': ' +
            without.map(s => escapeHtml(s.name)).join(' · ') + '</div>'
          : '<div class="insp-missing" style="color:#14614f">בכל המוסדות שהזינו יש מורה ✓</div>') +
    '</div>';
  }).join('');

  renderInspectorTable(byInsp, order);
}

// טבלת הפירוט — משנה עמודות לפי המקצוע שנבחר
function renderInspectorTable(byInsp, order) {
  const sub = inspSubject;
  const head = document.getElementById('insp-table-head');
  if (head) {
    head.innerHTML = '<th>מפקח.ת</th><th>בית ספר</th><th>רשת</th><th>מגזר</th>' +
      (sub ? '<th>מורי ' + escapeHtml(sub) + '</th><th>סטטוס</th>'
           : '<th>מורים</th><th>מקצועות חסרים</th>');
  }

  const rows = [];
  order.forEach(name => {
    let list = byInsp[name].slice();
    if (sub) list = list.filter(s => relevant(s, sub));
    list.sort((a, b) => (sub ? (b.bySubject[sub] || 0) - (a.bySubject[sub] || 0) : b.teachers - a.teachers));

    list.forEach(s => {
      let last;
      if (sub) {
        const n = s.bySubject[sub] || 0;
        last = '<td>' + (n ? '<span class="cell-n">' + n + '</span>' : '<span class="cell-0">0</span>') + '</td>' +
          '<td>' + (!entered(s)
            ? '<span class="badge warn">טרם הזין</span>'
            : (n ? '<span class="badge ok">יש מורה</span>'
                 : '<span class="badge err">חסר ' + escapeHtml(sub) + '</span>')) + '</td>';
      } else {
        const miss = entered(s) ? missingSubjects(s) : null;
        last = '<td>' + (s.teachers || '<span class="badge warn">0</span>') + '</td>' +
          '<td>' + (miss === null
            ? '<span class="badge warn">טרם הזין</span>'
            : (miss.length ? escapeHtml(miss.join(' · ')) : '<span class="badge ok">מלא</span>')) + '</td>';
      }
      rows.push('<tr>' +
        '<td><span style="display:inline-flex;align-items:center;gap:6px">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:' + escapeHtml(inspectorColor(name)) + '"></span>' +
          escapeHtml(name) + '</span></td>' +
        '<td><b>' + escapeHtml(s.name) + '</b></td>' +
        '<td>' + escapeHtml(networkName(s.network)) + '</td>' +
        '<td>' + escapeHtml(SECTOR_NAMES[s.sector] || '—') + '</td>' +
        last +
      '</tr>');
    });
  });
  document.getElementById('insp-body').innerHTML =
    rows.join('') || '<tr><td colspan="6" class="empty-row">אין נתונים</td></tr>';
}

// מטריצה: מפקח.ת × מקצוע — מורים בכל משבצת, ובאדום כמה מוסדות שהזינו בלי מורה
function renderInspectorMatrix() {
  const groups = inspectorGroups();
  const byInsp = groups.byInsp, order = groups.order;

  document.getElementById('insp-mx-head').innerHTML =
    '<th class="name">מפקח.ת</th>' +
    SUBJECTS.map(s => '<th>' + escapeHtml(s) + '</th>').join('') +
    '<th>סה"כ</th>';

  document.getElementById('insp-mx-body').innerHTML = order.map(name => {
    const list = byInsp[name];
    const cells = SUBJECTS.map(sub => {
      const pool = list.filter(s => relevant(s, sub));
      if (!pool.length) return '<td class="cell-na">—</td>';
      const n = pool.reduce((a, s) => a + (s.bySubject[sub] || 0), 0);
      const without = pool.filter(s => entered(s) && !s.bySubject[sub]).length;
      return '<td>' +
        (n ? '<span class="cell-n">' + n + '</span>' : '<span class="cell-0">0</span>') +
        (without ? '<div class="cell-sub">חסר ב-' + without + '</div>' : '') +
      '</td>';
    }).join('');
    const total = list.reduce((a, s) => a + s.teachers, 0);
    return '<tr><td class="name"><span style="display:inline-flex;align-items:center;gap:6px">' +
      '<span style="width:8px;height:8px;border-radius:50%;background:' + escapeHtml(inspectorColor(name)) + '"></span>' +
      escapeHtml(name) + '</span></td>' + cells + '<td><b>' + total + '</b></td></tr>';
  }).join('');
}

function renderUnmappedNote() {
  if (!unmapped.length) return;
  document.getElementById('unmapped-note').textContent =
    ' · ' + unmapped.length + ' בתי ספר טרם שויכו למפקח.ת: ' + unmapped.map(u => u.name).join(', ') + '.';
}

// ============================================================
// הדגשת הסעיף הפעיל בסרגל הניווט
// ============================================================
function initNavHighlight() {
  const links = [...document.querySelectorAll('.pn a[href^="#"]')];
  const targets = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (!targets.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-20% 0px -70% 0px' });

  targets.forEach(t => obs.observe(t));
}
