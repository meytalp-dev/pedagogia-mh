/* ============================================================
   מבט ארצי — נוכחות במפגשי ההדרכה (14.9.26)
   כל המדריכים, לפי מדריך/ה · בית ספר · רשת · מורה, עם סינון וייצוא CSV.
   נתונים: meet.report + teachers.list · חישוב: assets/meet-stats.js
   ============================================================ */
(function () {
  let report = null, teachers = [], stats = null, hours = null;
  let showAllTeachers = false;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const L = d => window.TS_meetDateLabel(d);
  const pct = r => r === null || r === undefined ? '—' : r + '%';

  function societyOf(g) {
    const s = g.sectors || [];
    if (s.indexOf('arab') >= 0) return 'arab';
    if (s.length === 1 && s[0] === 'haredi') return 'haredi';
    return 'jewish';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const insp = window.TS_INSPECTORS || {};
    Object.keys(insp).forEach(k => $('f-insp').insertAdjacentHTML('beforeend', `<option value="${esc(k)}">${esc(insp[k].name)}</option>`));
    const subjects = new Set();
    Object.values(window.TS_GUIDES || {}).forEach(g => window.TS_guideSubjects(g).forEach(s => subjects.add(s)));
    Array.from(subjects).sort((a, b) => a.localeCompare(b, 'he')).forEach(s => {
      const o = document.createElement('option'); o.value = s; o.textContent = s;   // דרך ה-DOM — הגרשיים של תנ"ך
      $('f-subject').appendChild(o);
    });
    ['f-insp', 'f-society', 'f-subject', 'f-q', 'f-never', 'f-noind'].forEach(id => $(id).addEventListener('input', render));
    $('nk-more-btn').addEventListener('click', () => { showAllTeachers = true; render(); });
    document.querySelectorAll('[data-csv]').forEach(b => b.addEventListener('click', () => exportCsv(b.dataset.csv)));

    const allSlugs = Object.keys(window.TS_GUIDES || {}).join(',');
    const [rep, tl, ws] = await Promise.all([
      TS.api('meet.report', {}, { cache: 'no' }),
      TS.api('teachers.list', {}),
      // שעות פרטניות של כל המדריכים — נכשל? הדוח עולה בלי עמודת הפרטני
      TS.api('guide.workspace', { guides: allSlugs }, { cache: 'no' })
    ]);
    hours = (ws && ws.ok && ws.data && ws.data.hours) || null;
    if (!rep || !rep.ok || !tl || !tl.ok) {
      $('nk-sub').textContent = 'הנתונים לא נטענו — תקלה רגעית בשרת. רעננו בעוד רגע.';
      $('nk-guides').innerHTML = '<div class="mv-empty">הנתונים לא נטענו.</div>';
      return;
    }
    report = rep.data;
    teachers = tl.data || [];
    const guides = Object.keys(window.TS_GUIDES || {}).map(k => {
      const g = Object.assign({ slug: k }, window.TS_GUIDES[k]);
      g.inspectorName = (insp[g.inspector] || {}).name || '';
      g.society = societyOf(g);
      return g;
    });
    stats = window.TS_meetStats({ today: report.today, meetings: report.meetings, rows: report.rows, teachers: teachers, guides: guides, hours: hours });
    render();
  });

  function filteredGuides() {
    const fi = $('f-insp').value, fs = $('f-society').value, fsub = $('f-subject').value;
    return stats.guides.filter(g =>
      (!fi || g.inspector === fi) && (!fs || g.society === fs) &&
      (!fsub || window.TS_guideSubjects(g).indexOf(fsub) >= 0));
  }

  function aggregate(persons, keyFn, nameFn) {
    const m = {};
    persons.forEach(p => {
      const k = keyFn(p);
      const a = m[k] || (m[k] = { key: k, name: nameFn(p), network: p.network, schools: new Set(), n: 0, present: 0, held: 0, never: [], individual: 0 });
      a.n++; a.present += p.present; a.held += p.held; a.schools.add(p.schoolName);
      a.individual += p.individual || 0;
      if (p.individual) a.indT = (a.indT || 0) + 1; else a.indT = a.indT || 0;
      if (p.held && !p.participated) a.never.push(p);
    });
    return Object.values(m).map(a => Object.assign(a, { rate: a.held ? Math.round(a.present / a.held * 100) : null }))
      .sort((x, y) => (x.rate === null ? 101 : x.rate) - (y.rate === null ? 101 : y.rate));
  }

  function render() {
    if (!stats) return;
    const q = ($('f-q').value || '').trim().toLowerCase();
    const gs = filteredGuides();
    const persons = [].concat(...gs.map(g => g.persons));
    const qPersons = !q ? persons : persons.filter(p =>
      [p.name, p.schoolName, p.guideName].some(s => String(s || '').toLowerCase().includes(q)));

    // KPI
    const held = gs.reduce((s, g) => s + g.held.length, 0);
    const pres = persons.reduce((s, p) => s + p.present, 0);
    const denom = persons.reduce((s, p) => s + p.held, 0);
    const never = persons.filter(p => p.held && !p.participated);
    $('k-held').textContent = held;
    $('k-rate').textContent = denom ? Math.round(pres / denom * 100) + '%' : '—';
    $('k-never').textContent = held ? never.length : '—';
    $('k-never-s').textContent = held ? 'מתוך ' + persons.filter(p => p.held).length + ' מורים בקבוצות שנפגשו' : 'עוד לא התקיימו מפגשים';
    $('k-unrec').textContent = gs.reduce((s, g) => s + g.unrecorded.length, 0);
    $('k-pending').textContent = gs.reduce((s, g) => s + g.pending, 0);
    // אדום רק כשיש משהו לטפל בו — אפס באדום מושך תשומת לב לשווא
    $('k-never').parentElement.classList.toggle('red', held > 0 && never.length > 0);
    $('k-unrec').parentElement.classList.toggle('red', Number($('k-unrec').textContent) > 0);
    $('k-pending').parentElement.classList.toggle('amber', Number($('k-pending').textContent) > 0);
    // דרישה: כל בית ספר לפחות הדרכה פרטנית אחת בשנה (בכל מקצועות המדריכים שבסינון)
    const schoolInd = {};
    gs.forEach(g => (g.schools || []).forEach(s => { schoolInd[s.name] = (schoolInd[s.name] || 0) + s.individual; }));
    render.schoolInd = schoolInd;
    const schoolNames = Object.keys(schoolInd);
    const noInd = schoolNames.filter(n => !schoolInd[n]);
    $('k-ind').textContent = hours ? noInd.length : '—';
    $('k-ind-s').textContent = hours ? 'מתוך ' + schoolNames.length + ' · ' + gs.reduce((s, g) => s + (g.individualSessions || 0), 0) + ' מפגשים פרטניים השנה' : 'השעות הפרטניות לא נטענו';
    $('k-ind').parentElement.classList.toggle('red', !!hours && noInd.length > 0);
    const tNoInd = persons.filter(p => !p.individual);
    $('k-tind').textContent = hours ? tNoInd.length : '—';
    $('k-tind-s').textContent = hours ? 'מתוך ' + persons.length + ' מורים בקבוצות' : 'השעות הפרטניות לא נטענו';
    $('k-tind').parentElement.classList.toggle('red', !!hours && tNoInd.length > 0);
    $('nk-sub').textContent = gs.length + ' מדריכים · ' + persons.length + ' מורים בקבוצות · נכון להיום ' + L(stats.today);

    // מדריכים
    const gq = !q ? gs : gs.filter(g => [g.name, g.inspectorName].concat(window.TS_guideSubjects(g)).some(s => String(s || '').toLowerCase().includes(q))
      || g.persons.some(p => qPersons.indexOf(p) >= 0));
    const ordered = gq.slice().sort((a, b) =>
      (b.unrecorded.length - a.unrecorded.length) || ((a.rate === null ? 101 : a.rate) - (b.rate === null ? 101 : b.rate)));
    $('nk-guides').innerHTML = ordered.length ? ordered.map(g => window.TS_meetGuideCard(g, { showInspector: true })).join('') : '<div class="mv-empty">אין מדריכים שמתאימים לסינון</div>';
    window.TS_meetBindCopy($('nk-guides'), stats);

    // בתי ספר
    const schools = aggregate(qPersons, p => p.schoolName || '—', p => p.schoolName || '—');
    render.schools = schools;
    $('nk-schools').innerHTML = schools.length ? schools.map((s, i) => `
      <tr>
        <td><b>${esc(s.name)}</b></td>
        <td class="dim">${esc((TS.netById(s.network) || {}).name || s.network || '')}</td>
        <td class="num">${s.n}</td>
        <td class="num"><span class="mv-chip ${window.TS_rateClass(s.rate)}">${pct(s.rate)}</span></td>
        <td class="num">${s.held ? s.never.length : '—'}</td>
        <td class="num">${!hours ? '—' : (render.schoolInd[s.name] ? '<span class="mv-ind" title="' + render.schoolInd[s.name] + ' מפגשים פרטניים">' + s.indT + '/' + s.n + ' מורים</span>' : '<span class="mv-ind zero" title="עוד לא קיבל הדרכה פרטנית השנה">0</span>')}</td>
        <td>${s.never.length ? `<button type="button" class="nk-btn" data-school-copy="${i}" style="padding:3px 9px;font-size:11.5px;">העתקת מי שלא השתתף</button>` : ''}</td>
      </tr>`).join('') : '<tr><td colspan="7" class="dim" style="text-align:center;padding:18px;">אין נתונים</td></tr>';
    document.querySelectorAll('[data-school-copy]').forEach(b => b.addEventListener('click', () => {
      const s = schools[Number(b.dataset.schoolCopy)];
      copy(s.name + ' — מורים שלא השתתפו כלל (לא במפגש ולא בהדרכה פרטנית):\n' + s.never.map(p => p.name + ' · ' + p.subject + ' (' + p.guideName + ')').join('\n'), b);
    }));

    // רשתות
    const nets = aggregate(qPersons, p => p.network || '—', p => (TS.netById(p.network) || {}).name || p.network || '—');
    render.networks = nets;
    $('nk-networks').innerHTML = nets.map(n => `
      <tr>
        <td><b>${esc(n.name)}</b></td>
        <td class="num">${n.schools.size}</td>
        <td class="num">${n.n}</td>
        <td class="num"><span class="mv-chip ${window.TS_rateClass(n.rate)}">${pct(n.rate)}</span></td>
        <td class="num">${n.held ? n.never.length : '—'}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="dim" style="text-align:center;padding:18px;">אין נתונים</td></tr>';

    // מורים
    const onlyNever = $('f-never').checked;
    const onlyNoInd = $('f-noind').checked;
    let list = qPersons.filter(p => (!onlyNever || (p.held && !p.participated)) && (!onlyNoInd || !p.individual))
      .slice().sort((a, b) => ((a.rate === null ? 101 : a.rate) - (b.rate === null ? 101 : b.rate)) || a.name.localeCompare(b.name, 'he'));
    render.teachers = list;
    $('nk-teachers-sub').textContent = list.length + ' מורים' + (onlyNever ? ' שלא השתתפו כלל' : '') + (onlyNoInd ? ' · בלי הדרכה פרטנית השנה' : '');
    const LIMIT = 200;
    const shown = showAllTeachers ? list : list.slice(0, LIMIT);
    $('nk-more').hidden = showAllTeachers || list.length <= LIMIT;
    $('nk-teachers').innerHTML = shown.map(p => `
      <tr class="${p.held && !p.participated ? 'never' : ''}">
        <td><b>${esc(p.name)}</b></td>
        <td>${esc(p.schoolName)}</td>
        <td class="dim">${esc(p.subject)}</td>
        <td class="dim">${esc(p.guideName)}</td>
        <td class="num">${window.TS_meetRateChip(p).replace(/ ?<span class="mv-ind"[^]*?<\/span>/, '')}${p.pending ? ' <span class="dim" title="רישום עצמי שממתין לאישור">+' + p.pending + ' ממתין</span>' : ''}</td>
        <td class="dim">${esc(p.missed.map(L).join(', '))}</td>
        <td class="num">${!hours ? '—' : (p.individual ? window.TS_meetIndividualChip(p) : '<span class="mv-ind zero" title="עוד לא קיבל/ה הדרכה פרטנית השנה">אין</span>')}</td>
      </tr>`).join('') || '<tr><td colspan="7" class="dim" style="text-align:center;padding:18px;">אין מורים שמתאימים לסינון</td></tr>';
  }

  function copy(text, btn) {
    const done = () => { const t = btn.textContent; btn.textContent = 'הועתק ✓'; setTimeout(() => { btn.textContent = t; }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => window.prompt('להעתקה:', text));
    else window.prompt('להעתקה:', text);
  }

  function exportCsv(kind) {
    let head, rows;
    if (kind === 'teachers') {
      head = ['מורה', 'בית ספר', 'רשת', 'מקצוע', 'מדריך/ה', 'השתתף/ה', 'מפגשים שהתקיימו', 'אחוז', 'תאריכים שהחסיר/ה', 'ממתין לאישור', 'הדרכה פרטנית (מפגשים)', 'תאריכי הדרכה פרטנית'];
      rows = (render.teachers || []).map(p => [p.name, p.schoolName, (TS.netById(p.network) || {}).name || p.network, p.subject, p.guideName,
        p.present, p.held, p.rate === null ? '' : p.rate, p.missed.map(L).join(' '), p.pending || '', p.individual || 0, p.individualDates.map(L).join(' ')]);
    } else {
      const src = kind === 'schools' ? render.schools : render.networks;
      head = [kind === 'schools' ? 'בית ספר' : 'רשת', 'מורים', 'השתתפויות', 'מפגשים (מורה×מפגש)', 'אחוז', 'לא השתתפו כלל', 'הדרכה פרטנית (מפגשים)', 'מורים עם הדרכה פרטנית'];
      rows = (src || []).map(a => [a.name, a.n, a.present, a.held, a.rate === null ? '' : a.rate, a.never.length,
        kind === 'schools' ? (render.schoolInd[a.name] || 0) : a.individual, a.indT || 0]);
    }
    const cell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [head].concat(rows).map(r => r.map(cell).join(',')).join('\r\n');   // BOM — אקסל פותח עברית נכון
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'נוכחות-' + ({ teachers: 'מורים', schools: 'בתי-ספר', networks: 'רשתות' })[kind] + '-' + stats.today + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
})();
