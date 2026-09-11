/* ============================================================
   עמוד קבוצת ההדרכה — מה שהמורים רואים (11.9.26)
   -----------------------------------------------------------
   kvutza/?g=<slug>. קריאה בלבד ובלי התחברות: המדריכה שולחת את הקישור
   פעם אחת לקבוצת הוואטסאפ של המורים שלה (guide/space.js).
   הנתונים מגיעים מ-guide.group — רק קבצים שהמדריכה העלתה והודעות שהיא
   פרסמה. **לא** guide.workspace: הוא מחזיר גם שעות פרטניות (שמות מורים
   ובתי ספר) ואת ההערות של המפקח.ת, ושום דבר מזה לא מגיע לדפדפן של מורה.
   ============================================================ */
(function () {
  const SLUG = TS.urlParam('g', '');
  const CFG = window.TS_resolveGuide ? window.TS_resolveGuide(SLUG, '') : null;
  const ICON_FILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
  const ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

  document.addEventListener('DOMContentLoaded', () => {
    if (!CFG) { renderBadLink(); return; }
    renderHeader();
    renderPlan();
    load();
  });

  const $ = id => document.getElementById(id);

  function subjects() {
    return (window.TS_guideSubjects ? window.TS_guideSubjects(CFG) : [CFG.subject]).filter(Boolean);
  }
  // אותו תיוג כמו בדשבורד המדריכה
  function societyLabel() {
    const s = CFG.sectors;
    if (!s || !s.length) return '';
    if (s.indexOf('arab') >= 0) return 'החברה הערבית';
    if (s.length === 1 && s[0] === 'haredi') return 'המגזר החרדי';
    return 'החברה היהודית';
  }

  function renderHeader() {
    const subj = subjects().join(' · ');
    const units = (Array.isArray(CFG.units) && CFG.units.length) ? CFG.units.join(' · ') + ' יח"ל' : '';
    $('g-title').textContent = subj || 'קבוצת ההדרכה';
    $('g-sub').textContent = ['בהנחיית ' + CFG.name, units, societyLabel()].filter(Boolean).join(' · ');
    document.title = (subj ? subj + ' · ' : '') + 'קבוצת ההדרכה של ' + CFG.name;
  }

  // ---------- תוכנית שנתית (assets/plans.js) ----------
  function renderPlan() {
    const plan = window.TS_planFor ? window.TS_planFor(SLUG) : null;
    if (!plan) return;
    const next = window.TS_nextMeeting ? window.TS_nextMeeting(plan) : null;
    $('g-next').innerHTML = `
      <div class="g-next ${next ? '' : 'done'}">
        ${ICON_CAL}
        <span>${next
          ? 'המפגש הבא: ' + esc(next.label) + (next.time ? ' · ' + esc(next.time) : '') + ' — ' + esc(next.topic)
          : 'כל מפגשי השנה התקיימו'}</span>
      </div>`;
    $('g-plan').innerHTML = plan.meetings.map(m => {
      const isNext = next && m.date === next.date;
      const isPast = next ? m.date < next.date : true;
      return `
        <div class="pl-row ${isNext ? 'next' : ''} ${isPast ? 'past' : ''}">
          <div>
            <span class="pl-date">${esc(m.label)}</span>
            <span class="pl-time">${esc(m.time || '')}</span>
          </div>
          <div>
            <div class="pl-topic">${esc(m.topic)}</div>
            ${m.goal ? `<div class="pl-goal">${esc(m.goal)}</div>` : ''}
            ${m.note ? `<div class="pl-goal"><b>${esc(m.note)}</b></div>` : ''}
          </div>
        </div>`;
    }).join('');
    $('g-plan-card').hidden = false;
  }

  // ---------- טעינה ----------
  async function load() {
    const res = await TS.api('guide.group', { guide: SLUG }, { cache: 'no' });
    if (res && res.ok && res.data) {
      renderMessages(res.data.messages || []);
      renderFiles(res.data.files || []);
      return;
    }
    // השרת עוד בלי הפעולה — לפני הפריסה של 11.9.26
    if (res && String(res.error || '').indexOf('unknown_action') === 0) { renderNotReady(); return; }
    renderError();
  }

  function renderMessages(rows) {
    $('g-msg-n').textContent = rows.length ? '(' + rows.length + ')' : '';
    $('g-messages').innerHTML = rows.length
      ? rows.map(m => `
        <div class="msg">
          <div class="msg-head">
            <span class="msg-author">${esc(m.authorName || CFG.name)}</span>
            <span class="msg-time">${fmtWhen(m.createdAt)}</span>
          </div>
          <div class="msg-text">${linkify(m.text)}</div>
        </div>`).join('')
      : '<div class="empty" style="padding:20px;">עדיין אין הודעות. כשהמדריכה תפרסם — הן יופיעו כאן.</div>';
  }

  function renderFiles(rows) {
    $('g-files-n').textContent = rows.length ? '(' + rows.length + ')' : '';
    $('g-files').innerHTML = rows.length
      ? rows.map(f => `
        <a class="file-row" href="${esc(safeUrl(f.fileUrl))}" target="_blank" rel="noopener">
          <span class="fr-icon">${ICON_FILE}</span>
          <span class="fr-body">
            <span class="fr-name">${esc(f.fileName)}</span>
            <span class="fr-meta" style="display:block;"><bdi dir="ltr">${fmtSize(f.size)}</bdi> · ${fmtWhen(f.createdAt)}</span>
          </span>
          <span class="fr-open">פתיחה</span>
        </a>`).join('')
      : '<div class="empty" style="padding:20px;">עדיין אין חומרים בקבוצה.</div>';
  }

  function setBoth(html) {
    $('g-messages').innerHTML = html;
    $('g-files').innerHTML = html;
  }

  function renderError() {
    setBoth(`<div class="empty" style="padding:20px; text-align:center;">
      לא נטען — תקלה רגעית בשרת.<br>
      <button type="button" class="btn btn-secondary" data-retry style="margin-top:10px;">לנסות שוב</button>
    </div>`);
    document.querySelectorAll('[data-retry]').forEach(b => b.addEventListener('click', () => {
      setBoth('<div class="empty" style="padding:20px;">טוען...</div>');
      load();
    }));
  }

  function renderNotReady() {
    setBoth('<div class="empty" style="padding:20px;">העמוד בהקמה — החומרים וההודעות יופיעו כאן בקרוב.</div>');
  }

  function renderBadLink() {
    $('g-title').textContent = 'הקישור אינו שלם';
    $('g-sub').textContent = 'בקשו מהמדריכה את הקישור לעמוד הקבוצה';
    ['g-messages-card', 'g-files-card'].forEach(id => $(id).hidden = true);
  }

  // ---------- עיצוב ערכים ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safeUrl(u) { return /^https:\/\//i.test(String(u || '')) ? u : '#'; }
  // רץ על טקסט שכבר עבר esc — עוצרים לפני ישויות ומורידים פיסוק שבסוף משפט
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
