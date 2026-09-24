/* רכיבי מבט משותפים למנור (24.9.26) — כמו במבט המורה:
   1. סרגל ניווט דביק (.pn) שנבנה רק מהמקטעים שמוצגים בפועל, מדגיש את המקטע
      שמול העין, ומתרענן לבד כשהנתונים נטענים (MutationObserver).
   2. פס "שאלה או קושי" עם וואטסאפ וכפתור "סיור בדף".
   3. סמל לבן בשבב ירוק לכותרות מקטע שאין להן סמל.
   4. הסיור (assets/tour.js) — אם נטען והוגדרו תחנות.
   שימוש (לפני הטעינה של הקובץ הזה או אחריה):
     MenorView.init({
       view: 'guide',                    // מפתח הסיור: ts.tour.<view>
       nav: [{ sel: '#x', up: '.card', label: 'תווית', icon: 'users', tab: 'meet' }],
       heads: [{ sel: 'h2', icon: 'chart' }],
       help: true, helpIn: 'main',
       tour: { name: 'מבט ...', intro: '...', steps: [...] }
     });
   דף שכבר יש בו <nav class="pn"> קבוע — הסרגל שלו נשאר, לא נבנה חדש. */
(function () {
  const ICONS = {
    pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    check: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 14.5-4 16 0"/>',
    school: '<path d="M3 21h18M3 10l9-7 9 7M5 10v11M19 10v11M9 14h6v7H9z"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    network: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v3M10.5 14L7 17M13.5 14L17 17"/>',
    pie: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    folder: '<path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-3H5a2 2 0 0 0-2 2z"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2 6.4-6.4 2 2-6.4z"/>'
  };
  const svg = (name, cls) => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.compass}</svg>`;
  const q = s => { try { return document.querySelector(s); } catch (e) { return null; } };
  const visible = el => el && !el.hidden && el.offsetParent !== null && el.getBoundingClientRect().height > 0;
  let cfg = null, nav = null, inner = null, obs = null, lastKey = '', seq = 0;

  function target(it) {
    let el = q(it.sel);
    if (el && it.up) el = el.closest(it.up);
    return el;
  }
  function tabBtn(name) {
    return document.getElementById('tab-btn-' + name) || q('.tab-btn[data-tab="' + name + '"]');
  }
  function isShown(it) {
    if (it.tab) { const b = tabBtn(it.tab); return !!b && visible(b); }
    return visible(target(it));
  }

  /* ---------- סרגל הניווט ---------- */
  function ensureNav() {
    if (nav) return true;
    if (q('nav.pn')) return false;                  // לדף יש כבר סרגל קבוע
    nav = document.createElement('nav');
    nav.className = 'pn';
    nav.id = 'menor-nav';
    nav.setAttribute('aria-label', 'ניווט בעמוד');
    nav.hidden = true;
    nav.innerHTML = '<div class="pn-inner"></div>';
    inner = nav.firstChild;
    const anchor = q('header.command-bar') || q('header.topbar');
    if (anchor) anchor.after(nav); else document.body.prepend(nav);
    inner.addEventListener('click', onNavClick);
    return true;
  }
  function onNavClick(e) {
    const a = e.target.closest('a[data-i]');
    if (!a) return;
    e.preventDefault();
    const it = cfg.nav[+a.dataset.i];
    if (it.tab) {
      if (typeof window.TS_goTab === 'function') window.TS_goTab(it.tab);
      else {
        const b = tabBtn(it.tab); if (b) b.click();
        const bar = q('.tabs-bar'); if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      mark(a);
      return;
    }
    const el = target(it);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function mark(a) { [...inner.querySelectorAll('a')].forEach(x => x.classList.toggle('on', x === a)); }

  function buildNav() {
    if (!cfg || !cfg.nav || !ensureNav()) return;
    const list = cfg.nav.map((it, i) => Object.assign({ i }, it)).filter(isShown);
    const key = list.map(it => it.i).join(',');
    if (key === lastKey) return;
    lastKey = key;
    inner.innerHTML = '<span class="pn-label">קפיצה אל</span>' + list.map(it =>
      `<a href="#" data-i="${it.i}">${svg(it.icon)}${it.label}</a>`).join('');
    nav.hidden = list.length < 2;
    if (obs) obs.disconnect();
    obs = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      const a = inner.querySelector(`a[data-i="${e.target.dataset.mvI}"]`);
      if (a) mark(a);
    }), { rootMargin: '-20% 0px -70% 0px' });
    list.forEach(it => {
      const el = it.tab ? document.getElementById('tab-' + it.tab) : target(it);
      if (!el) return;
      el.dataset.mvI = it.i;
      el.setAttribute('data-mv-sec', '');
      obs.observe(el);
    });
  }

  /* ---------- סמלים לכותרות ---------- */
  function addHeads() {
    (cfg.heads || []).forEach(h => {
      document.querySelectorAll(h.sel).forEach(el => {
        if (el.querySelector('svg')) return;
        if (h.match && el.textContent.indexOf(h.match) < 0) return;
        el.insertAdjacentHTML('afterbegin', svg(h.icon, 'mv-ico'));
      });
    });
  }

  /* ---------- שאלה או קושי ---------- */
  function addHelp() {
    if (cfg.help === false || q('#page-help')) return;
    const host = q(cfg.helpIn || 'main') || document.body;
    const sec = document.createElement('section');
    sec.className = 'page-help';
    sec.id = 'page-help';
    sec.innerHTML =
      `<div class="ph-text"><b>שאלה או קושי טכני בדף?</b><span>אם משהו לא עובד או לא ברור — כתבו לנו ונחזור אליך.</span></div>
       <div class="ph-actions">
         <a class="helpbtn" href="https://wa.me/972536256653" target="_blank" rel="noopener">${svg('chat')}כתבו לנו</a>
         ${cfg.tour ? `<button type="button" class="helpbtn" data-tour-start>${svg('compass')}סיור בדף</button>` : ''}
       </div>`;
    host.appendChild(sec);
  }
  /* קישור "סיור בדף" קטן בכותרת העמוד, כמו אצל המורה */
  function addTourLink() {
    if (!cfg.tour) return;
    const head = q('.page-header > div');
    if (!head || head.querySelector('[data-tour-start]')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mv-tour-link';
    b.setAttribute('data-tour-start', '');
    b.textContent = 'סיור בדף';
    head.appendChild(b);
  }

  function refresh() { if (cfg) { buildNav(); addHeads(); } }
  function watch() {
    const root = q('main') || document.body;
    let t = 0;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(refresh, 250); })
      .observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    window.addEventListener('resize', () => { lastKey = ''; refresh(); });
  }

  function run() {
    addHeads();
    buildNav();
    addHelp();
    addTourLink();
    watch();
    // עוד רענון אחרי שהנתונים הגיעו מהשרת (גם אם שום דבר לא השתנה ב-DOM הראשי)
    [800, 2500, 6000].forEach(ms => setTimeout(refresh, ms));
    if (cfg.tour && window.MenorTour) {
      window.MenorTour.setup(Object.assign({ key: 'ts.tour.' + cfg.view }, cfg.tour));
    }
  }
  function init(c) {
    if (cfg) return;
    cfg = c || {};
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  }
  window.MenorView = { init: init, refresh: refresh, icons: ICONS };
  if (window.MENOR_VIEW) init(window.MENOR_VIEW);
})();
