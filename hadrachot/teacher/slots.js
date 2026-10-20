/* ============================================================
   שיבוץ לשעה פרטנית — בית המורה (20.10.26, בקשת מיטל — אזרחות, סיגל נחום)
   המדריכ/ה מפרסמ/ת מועדים (guide/slots.js), והמורה בוחר/ת מועד פנוי כאן.
   מועד תפוס ננעל בשרת. אישור במייל למורה ועדכון למדריכ/ה (slots.book / slots.cancel).
   שיבוץ אחד קדימה בכל פעם — כדי להחליף מועד מבטלים קודם.
   מוצג רק למורי אזרחות (בדיקה מהירה כאן); השרת מחליט סופית לפי הקבוצה של המדריכ/ה.
   ============================================================ */
(function () {
  const SUBJECTS = ['אזרחות'];   // המקצועות של SLOT_GUIDES בשרת (כרגע: סיגל)
  const TRACKS = { bagrut: 'בחינת בגרות חיצונית', gemer: 'גמר' };
  const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const ERR = {
    taken: 'המועד הזה נתפס הרגע על ידי מורה אחר/ת. בחרו מועד אחר.',
    closed: 'השיבוץ למועד הזה כבר נסגר.',
    past: 'המועד כבר עבר.',
    has_booking: 'כבר יש לך שיבוץ קרוב. כדי להחליף מועד — קודם מבטלים את הקיים.',
    not_mine: 'המועדים האלה מיועדים למורים בקבוצה של המדריכ/ה.',
    bad_key: 'פג תוקף הכניסה. רעננו את הדף והיכנסו שוב.',
    not_found: 'המועד כבר לא קיים — רעננו את הדף.',
    busy: 'השרת עמוס כרגע — נסו שוב בעוד רגע.'
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const parse = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const dayLbl = s => { const d = parse(s); return 'יום ' + DAYS[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1); };
  const errText = r => ERR[r && r.error] || 'לא נשמר — נסו שוב.';

  let KEY = '', D = null, pick = '';
  const sec = () => document.getElementById('slot-sec');
  const box = () => document.getElementById('slot-root');

  async function init(key, teacher) {
    if (!key || !teacher || SUBJECTS.indexOf(String(teacher.subject || '').trim()) < 0) return;
    KEY = key;
    await load();
  }

  async function load() {
    let res = null;
    try { res = await TS.api('slots.teacher', { k: KEY }, { cache: 'no' }); } catch (e) { res = null; }
    if (!res || !res.ok || !res.data || !res.data.enabled) return;
    D = res.data;
    render();
    sec().hidden = false;
    if (typeof buildNav === 'function') buildNav();
  }

  function render() {
    const name = D.guideName || 'המדריכ/ה';
    const first = String(name).split(' ')[0];
    const head = document.getElementById('slot-guide');
    if (head) head.textContent = name;
    const mineNext = (D.mine || []).filter(m => !m.past);
    const minePast = (D.mine || []).filter(m => m.past);
    const open = D.open || [];
    let html = '';
    if (mineNext.length) {
      html += mineNext.map(m => `
        <div class="slot-mine">
          <div><div class="slot-mine-k">נרשמת לשעה פרטנית</div>
            <b>${esc(dayLbl(m.date))} בשעה <span dir="ltr">${esc(m.start)}</span></b>${m.track ? ' · ' + esc(TRACKS[m.track] || '') : ''}</div>
          <button type="button" class="btn btn-secondary" data-slot-cancel="${esc(m.id)}">ביטול השיבוץ</button>
        </div>`).join('');
    }
    if (open.length) {
      const byDate = {};
      open.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });
      html += `<p class="hint">${mineNext.length ? 'מועדים פנויים נוספים. אפשר להשתבץ לשעה אחת בכל פעם — כדי להחליף, קודם מבטלים.' : 'בוחרים מועד פנוי, ממלאים פרטים ולוחצים "שיבוץ". אישור יגיע במייל.'}</p>` +
        Object.keys(byDate).sort().map(d => `
        <div class="slot-day"><div class="slot-day-h">${esc(dayLbl(d))}</div>
          <div class="slot-times">${byDate[d].map(s => `<button type="button" class="slot-t${pick === s.id ? ' on' : ''}" data-slot="${esc(s.id)}" dir="ltr"${mineNext.length ? ' disabled' : ''}>${esc(s.start)}</button>`).join('')}</div>
        </div>`).join('');
      const p = open.find(s => s.id === pick);
      if (p && !mineNext.length) {
        html += `
        <div class="card slot-form">
          <div class="slot-form-h">שיבוץ ל${esc(dayLbl(p.date))} בשעה <span dir="ltr">${esc(p.start)}</span> עם ${esc(first)}</div>
          <div class="form-row"><span class="form-label">מסלול ההיבחנות</span>
            <label class="slot-radio"><input type="radio" name="slot-track" value="bagrut"${D.track === 'bagrut' ? ' checked' : ''}> בחינת בגרות חיצונית</label>
            <label class="slot-radio"><input type="radio" name="slot-track" value="gemer"${D.track === 'gemer' ? ' checked' : ''}> גמר</label>
          </div>
          <div class="form-row"><label class="form-label" for="slot-phone">טלפון לחזרה</label>
            <input class="input" id="slot-phone" type="tel" dir="ltr" inputmode="tel" value="${esc(D.phone || '')}" placeholder="050-0000000"></div>
          <div class="form-row"><label class="form-label" for="slot-note">על מה תרצו לדבר? (לא חובה)</label>
            <textarea class="textarea" id="slot-note" maxlength="300" style="min-height:64px;"></textarea></div>
          <div class="btn-row" style="margin:0;"><button type="button" class="btn btn-primary" id="slot-book">שיבוץ</button>
            <button type="button" class="btn btn-secondary" id="slot-back">ביטול</button></div>
        </div>`;
      }
    } else if (!mineNext.length) {
      html += `<div class="empty" style="padding:18px;">אין כרגע מועדים פנויים. ${esc(first)} מפרסמת מועדים חדשים מדי שבוע — וכשיהיו, הם יופיעו כאן.</div>`;
    }
    if (minePast.length) {
      html += `<div class="slot-past">שעות פרטניות שנקבעו: ${minePast.map(m => esc(dayLbl(m.date)) + ' <span dir="ltr">' + esc(m.start) + '</span>').join(' · ')}</div>`;
    }
    box().innerHTML = html;
    box().querySelectorAll('[data-slot]').forEach(b => b.addEventListener('click', () => {
      pick = pick === b.dataset.slot ? '' : b.dataset.slot;
      render();
      const f = box().querySelector('.slot-form');
      if (f) f.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }));
    box().querySelectorAll('[data-slot-cancel]').forEach(b => b.addEventListener('click', () => cancel(b)));
    const bk = document.getElementById('slot-book');
    if (bk) bk.addEventListener('click', () => book(bk));
    const back = document.getElementById('slot-back');
    if (back) back.addEventListener('click', () => { pick = ''; render(); });
  }

  async function book(btn) {
    const tr = box().querySelector('input[name="slot-track"]:checked');
    if (!tr) { TS.toast('בחרו מסלול: בגרות חיצונית או גמר'); return; }
    if (btn.disabled) return;
    btn.disabled = true; btn.textContent = 'משבץ…';
    const res = await TS.apiPost('slots.book', {
      k: KEY, id: pick, track: tr.value,
      phone: document.getElementById('slot-phone').value.trim(),
      note: document.getElementById('slot-note').value.trim()
    });
    if (res && res.ok) {
      TS.toast('נרשמת! אישור יגיע במייל');
      pick = '';
    } else {
      TS.toast(errText(res));
      if (!res || res.error !== 'taken') { btn.disabled = false; btn.textContent = 'שיבוץ'; return; }
      pick = '';
    }
    await load();
  }

  async function cancel(btn) {
    if (!confirm('לבטל את השיבוץ? המועד יחזור להיות פנוי למורים אחרים.')) return;
    btn.disabled = true;
    const res = await TS.apiPost('slots.cancel', { k: KEY, id: btn.dataset.slotCancel });
    if (!res || !res.ok) { btn.disabled = false; TS.toast(errText(res)); return; }
    TS.toast('השיבוץ בוטל');
    await load();
  }

  window.TS_teacherSlots = { init };
})();
