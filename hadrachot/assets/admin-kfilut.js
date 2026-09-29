/* ============================================================
   admin-kfilut.js — תיקוני שם וכפילויות בכתיב שונה (29.9.26, מיטל)
   -----------------------------------------------------------
   נטען ב-admin-cleanup.html. שני מקטעים:
   1. תיקוני שם שמורים ביקשו בהרשמה (teachers.nameFixes) — אישור/עריכה/דחייה.
      אישור מעדכן את השם בכל השורות של אותו אדם באותו בית ספר.
   2. שמות דומים באותו בית ספר, מקצוע ומסלול (TS_nameMatch.similar ≥ 0.85) —
      "להשאיר את זה" מאחד (teachers.merge): הנוכחות, השאלות והמחברת עוברות
      לכרטיס שנשאר, והכפול נמחק. "לא אותו אדם" — מוסתר במכשיר הזה.
   הפעולות דורשות כניסת מטה (מפתח staff בדף הבית של מנור). שום דבר לא קורה בלי לחיצה.
   ============================================================ */
(function () {
  const DISMISS = 'ts.kfilut.dismissed';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const staffKey = () => { try { return (JSON.parse(localStorage.getItem('ts.staff.v1') || 'null') || {}).k || ''; } catch (e) { return ''; } };
  const dismissed = () => { try { return JSON.parse(localStorage.getItem(DISMISS) || '{}'); } catch (e) { return {}; } };
  const dismiss = k => { const d = dismissed(); d[k] = 1; try { localStorage.setItem(DISMISS, JSON.stringify(d)); } catch (e) {} };
  const typeOf = t => (String(t.type || '') === 'gemer' ? 'gemer' : 'bagrut');
  let TEACHERS = [];

  function mount() {
    const main = document.querySelector('main.container');
    const box = document.createElement('div');
    box.innerHTML = `
      <div class="clean-sec" id="kf-fix-sec">
        <h3>תיקוני שם שמורים ביקשו <span id="kf-fix-n"></span></h3>
        <p class="d">מורים שבחרו את הכרטיס שלהם בהרשמה וכתבו איך השם שלהם נכתב נכון. אפשר לערוך לפני האישור.
           אישור מעדכן את השם בכל השורות של המורה באותו בית ספר (בגרות, גמר, כמה מקצועות).</p>
        <div id="kf-fix-list"><div class="empty">טוען…</div></div>
      </div>
      <div class="clean-sec" id="kf-dup-sec">
        <h3>שמות דומים — כפילויות אפשריות <span id="kf-dup-n"></span></h3>
        <p class="d">אותו בית ספר, אותו מקצוע ואותו מסלול, והשמות כמעט זהים (כתיב שונה, סדר הפוך, שגיאת הקלדה).
           "להשאיר את זה" מאחד: הנוכחות, השאלות והמחברת עוברות לכרטיס שנשאר, והכפול נמחק. האיחוד סופי.</p>
        <div id="kf-dup-list"><div class="empty">טוען…</div></div>
      </div>`;
    const anchor = document.getElementById('content');
    main.insertBefore(box, anchor);
    if (!staffKey()) {
      const msg = '<div class="alert warn"><div class="alert-body">הפעולות האלה דורשות כניסת מטה — היכנסי קודם בדף הבית של מנור (מייל → קוד), וחזרי לדף.</div></div>';
      document.getElementById('kf-fix-list').innerHTML = msg;
    }
  }

  async function loadFixes() {
    const el = document.getElementById('kf-fix-list');
    const k = staffKey();
    if (!k) return;
    const r = await TS.api('teachers.nameFixes', { k: k }, { cache: 'no' });
    if (!r || !r.ok) { el.innerHTML = '<div class="empty">' + (r && r.error === 'forbidden' ? 'אין הרשאת מטה.' : 'הטעינה נכשלה — רענני.') + '</div>'; return; }
    const list = r.data || [];
    document.getElementById('kf-fix-n').textContent = '(' + list.length + ')';
    if (!list.length) { el.innerHTML = '<div class="empty">אין בקשות פתוחות.</div>'; return; }
    el.innerHTML = list.map(f => `
      <div class="row-item" data-id="${esc(f.id)}">
        <span class="who"><b>${esc(f.name)}</b> ← <input class="input kf-to" value="${esc(f.nameFix)}" style="width:210px;display:inline-block;padding:4px 8px;">
          <br><small>${esc(f.subject || '')} · ${esc(f.schoolName || f.school || '')}</small></span>
        <button class="btn btn-primary kf-ok" type="button">אישור</button>
        <button class="btn kf-no" type="button">דחייה</button>
      </div>`).join('');
    el.querySelectorAll('.row-item').forEach(row => {
      const id = row.dataset.id;
      const act = async approve => {
        row.querySelectorAll('button').forEach(b => { b.disabled = true; });
        const r2 = await TS.apiPost('teachers.nameFixApply', { k: staffKey(), id: id, approve: approve ? '1' : '0', name: row.querySelector('.kf-to').value });
        if (r2 && r2.ok) { row.classList.add('gone'); row.querySelector('.who small').textContent += approve ? ' · עודכן ✓' : ' · נדחה'; }
        else { row.querySelectorAll('button').forEach(b => { b.disabled = false; }); alert('לא נשמר: ' + ((r2 && r2.error) || '')); }
      };
      row.querySelector('.kf-ok').onclick = () => act(true);
      row.querySelector('.kf-no').onclick = () => act(false);
    });
  }

  function findPairs(rows) {
    const d = dismissed();
    const bySchool = {};
    rows.forEach(t => { if (String(t.name || '').trim()) (bySchool[t.school] = bySchool[t.school] || []).push(t); });
    const out = [];
    Object.keys(bySchool).forEach(sc => {
      const L = bySchool[sc];
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
        const a = L[i], b = L[j];
        if (String(a.subject).trim() !== String(b.subject).trim() || typeOf(a) !== typeOf(b)) continue;
        const na = String(a.name).replace(/\s+/g, ' ').trim(), nb = String(b.name).replace(/\s+/g, ' ').trim();
        const key = [a.id, b.id].sort().join('|');
        if (d[key]) continue;
        const s = na === nb ? 1 : TS_nameMatch.similar(na, nb);
        if (s >= 0.85) out.push({ a: a, b: b, s: s, key: key });
      }
    });
    return out.sort((x, y) => String(x.a.schoolName || '').localeCompare(String(y.a.schoolName || ''), 'he'));
  }

  function card(t, other) {
    const bits = [];
    if (String(t.email || '').trim()) bits.push('יש מייל');
    if (String(t.trainingStatus || '').trim()) bits.push('ענה/תה על השתלמות');
    if (String(t.selfAdded || '').trim()) bits.push('נרשם/ה בעצמו/ה');
    return `<div style="flex:1;min-width:180px;">
      <b>${esc(t.name)}</b><br><small>${esc(bits.join(' · ') || 'בלי מייל')}</small><br>
      <button class="btn btn-primary kf-keep" type="button" data-keep="${esc(t.id)}" data-drop="${esc(other.id)}" style="margin-top:6px;">להשאיר את זה</button>
    </div>`;
  }

  function renderPairs() {
    const el = document.getElementById('kf-dup-list');
    const pairs = findPairs(TEACHERS);
    document.getElementById('kf-dup-n').textContent = '(' + pairs.length + ')';
    if (!pairs.length) { el.innerHTML = '<div class="empty">לא נמצאו שמות דומים.</div>'; return; }
    el.innerHTML = pairs.map(p => `
      <div class="row-item" data-key="${esc(p.key)}" style="flex-wrap:wrap;align-items:flex-start;">
        <div style="flex-basis:100%;"><small>${esc(p.a.schoolName || p.a.school)} · ${esc(p.a.subject)}${typeOf(p.a) === 'gemer' ? ' · גמר' : ''}</small></div>
        ${card(p.a, p.b)}${card(p.b, p.a)}
        <button class="btn kf-not" type="button" style="align-self:center;">לא אותו אדם</button>
      </div>`).join('');
    el.querySelectorAll('.row-item').forEach(row => {
      row.querySelector('.kf-not').onclick = () => { dismiss(row.dataset.key); row.remove(); };
      row.querySelectorAll('.kf-keep').forEach(b => b.onclick = async () => {
        const k = staffKey();
        if (!k) { alert('צריך כניסת מטה — היכנסי בדף הבית של מנור.'); return; }
        const keepName = b.parentElement.querySelector('b').textContent;
        if (!confirm('לאחד ולהשאיר את "' + keepName + '"? הכרטיס השני יימחק והנוכחות שלו תעבור. אי אפשר לבטל.')) return;
        row.querySelectorAll('button').forEach(x => { x.disabled = true; });
        const r = await TS.apiPost('teachers.merge', { k: k, keep: b.dataset.keep, drop: b.dataset.drop });
        if (r && r.ok) {
          row.classList.add('gone');
          TEACHERS = TEACHERS.filter(t => String(t.id) !== String(b.dataset.drop));
          const m = r.data && r.data.moved || {};
          row.insertAdjacentHTML('beforeend', '<div style="flex-basis:100%;"><small>אוחד ✓ ' +
            esc(Object.keys(m).map(x => x + ': ' + m[x]).join(' · ')) + '</small></div>');
        } else {
          row.querySelectorAll('button').forEach(x => { x.disabled = false; });
          alert('האיחוד נכשל: ' + ((r && r.error) || ''));
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    mount();
    loadFixes();
    const res = await TS.api('teachers.list', {}, { cache: 'no' });
    TEACHERS = (res && res.ok && res.data) || [];
    renderPairs();
  });
  window.TS_kfilut = { findPairs: findPairs };
})();
