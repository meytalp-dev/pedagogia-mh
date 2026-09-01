// Training Supervision — Shared utilities
// קישור ל-Apps Script + פונקציות עזר משותפות

const TS = (() => {
  // Apps Script URL — נטען כברירת מחדל; localStorage גובר אם הוגדר אחר
  const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbwDOLGv0Hr7KNjFJBIslJkDt9cDa2g4-Gfho3dTfI0AP3uwjlM3NGCwSnQkXZd4DUlyHg/exec';
  const APPS_SCRIPT_URL = localStorage.getItem('ts.appsScriptUrl') || DEFAULT_URL;

  const NETWORKS = [
    { id: 'ort',             name: 'אורט',        color: 'ort'             },
    { id: 'amal',            name: 'עמל',         color: 'amal'            },
    { id: 'atid',            name: 'עתיד',        color: 'atid'            },
    { id: 'sakhnin',         name: 'סכנין',       color: 'sakhnin'         },
    { id: 'dror',            name: 'דרור',        color: 'dror'            },
    { id: 'ezraei_haredi',   name: 'עצמאי חרדי',  color: 'ezraei_haredi'   },
    { id: 'beit_el',         name: 'בית אל',      color: 'beit_el'         },
    { id: 'kanada_israel',   name: 'קנדה ישראל',  color: 'kanada_israel'   },
    { id: 'shulamit_haredi', name: 'שלומית חרדי', color: 'shulamit_haredi' }
  ];

  const SECTORS = [
    { id: 'haredi', name: 'חרדי' },
    { id: 'arab',   name: 'ערבי' },
    { id: 'kelali', name: 'כללי' }
  ];

  const SUBJECTS = [
    'מתמטיקה','אנגלית','עברית','ספרות','היסטוריה','אזרחות','תנ"ך','ערבית'
  ];

  const TYPES = [
    { id: 'bagrut', name: 'בגרות' },
    { id: 'gemer',  name: 'גמר'   }
  ];

  // Client-side cache (5 דקות) — מאיץ פתיחת דשבורדים אחרי הקריאה הראשונה
  const CACHE_TTL_MS = 5 * 60 * 1000;
  function cacheKey(action, params) {
    return 'ts.cache.' + action + '.' + JSON.stringify(params || {});
  }
  function cacheGet(action, params) {
    try {
      const raw = localStorage.getItem(cacheKey(action, params));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
      return obj.data;
    } catch (e) { return null; }
  }
  function cacheSet(action, params, data) {
    try {
      localStorage.setItem(cacheKey(action, params), JSON.stringify({ ts: Date.now(), data }));
    } catch (e) {}
  }
  function cacheInvalidate(prefix) {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('ts.cache.' + (prefix || ''))) localStorage.removeItem(k);
    });
  }

  // opts.cache: 'fresh' (default) → cache-first, refresh background. 'no' → always fetch. 'only' → cache or null.
  async function api(action, params = {}, opts = {}) {
    if (!APPS_SCRIPT_URL) {
      console.warn('Apps Script URL לא הוגדר. בעמוד הראשי יש כפתור להגדרה.');
      return { ok: false, error: 'no_url' };
    }
    const cacheMode = opts.cache || 'fresh';
    if (cacheMode !== 'no') {
      const cached = cacheGet(action, params);
      if (cached) {
        // refresh in background if mode is 'fresh'
        if (cacheMode === 'fresh') {
          fetchFromApi(action, params).then(res => {
            if (res && res.ok) {
              cacheSet(action, params, res);
              if (typeof opts.onRefresh === 'function') opts.onRefresh(res);
            }
          });
        }
        return cached;
      }
    }
    const res = await fetchFromApi(action, params);
    if (res && res.ok && cacheMode !== 'no') cacheSet(action, params, res);
    return res;
  }

  async function fetchFromApi(action, params) {
    try {
      const url = new URL(APPS_SCRIPT_URL);
      url.searchParams.set('action', action);
      Object.entries(params).forEach(([k,v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });
      const res = await fetch(url.toString());
      return await res.json();
    } catch (e) {
      console.error('API error', e);
      return { ok: false, error: e.message };
    }
  }

  async function apiPost(action, body) {
    if (!APPS_SCRIPT_URL) return { ok: false, error: 'no_url' };
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action, ...body }),
        headers: { 'Content-Type': 'text/plain' }
      });
      const json = await res.json();
      // הזרמת cache אחרי POST שמשנה נתונים
      if (json && json.ok) cacheInvalidate();
      return json;
    } catch (e) {
      console.error('API error', e);
      return { ok: false, error: e.message };
    }
  }

  function netById(id) {
    return NETWORKS.find(n => n.id === id) || { id, name: id, color: '' };
  }
  function secById(id) {
    return SECTORS.find(s => s.id === id) || { id, name: id };
  }

  function netChip(netId) {
    const n = netById(netId);
    return `<span class="net-chip ${n.color}">${n.name}</span>`;
  }
  function secChip(secId) {
    const s = secById(secId);
    return `<span class="sec-chip ${secId}">${s.name}</span>`;
  }
  function typeChip(typeId) {
    const t = TYPES.find(x => x.id === typeId);
    return `<span class="badge neutral">${t ? t.name : typeId}</span>`;
  }

  function attendanceBadge(percent) {
    if (percent === null || percent === undefined) return `<span class="badge neutral">—</span>`;
    if (percent >= 90) return `<span class="badge ok">${percent}%</span>`;
    if (percent >= 70) return `<span class="badge warn">${percent}%</span>`;
    return `<span class="badge err">${percent}%</span>`;
  }

  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  }

  function urlParam(name, def = '') {
    return new URLSearchParams(location.search).get(name) || def;
  }

  function monthLabel(date = new Date()) {
    const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date)) return d;
    return date.toLocaleDateString('he-IL');
  }

  // Gmail compose
  function gmailCompose({to='', subject='', body=''} = {}) {
    const u = new URL('https://mail.google.com/mail/');
    u.searchParams.set('view', 'cm');
    u.searchParams.set('fs', '1');
    if (to) u.searchParams.set('to', to);
    if (subject) u.searchParams.set('su', subject);
    if (body) u.searchParams.set('body', body);
    return u.toString();
  }

  // WhatsApp
  function whatsappLink(phone, text='') {
    const u = new URL('https://api.whatsapp.com/send');
    if (phone) u.searchParams.set('phone', String(phone).replace(/[^\d]/g, ''));
    if (text) u.searchParams.set('text', text);
    return u.toString();
  }

  function setAppsScriptUrl(url) {
    localStorage.setItem('ts.appsScriptUrl', url);
    location.reload();
  }
  function getAppsScriptUrl() {
    return APPS_SCRIPT_URL;
  }

  // SVG sparkline / trend chart — לא דורש ספריית chart חיצונית
  function renderTrendChart(targetEl, series, options = {}) {
    const w = options.width || 720;
    const h = options.height || 220;
    const padX = 40, padY = 30, padBottom = 40;
    const innerW = w - padX * 2;
    const innerH = h - padY - padBottom;

    const validPoints = series.filter(p => p.rate !== null);
    if (!validPoints.length) {
      targetEl.innerHTML = `<div class="empty" style="padding:32px;">אין מספיק נתונים להצגת מגמה</div>`;
      return;
    }
    const maxY = 100;
    const minY = 0;
    const step = innerW / Math.max(1, series.length - 1);

    function xy(i, rate) {
      const x = padX + step * i;
      const y = padY + innerH - ((rate - minY) / (maxY - minY)) * innerH;
      return [x, y];
    }

    const pointsArr = series.map((p, i) => p.rate !== null ? xy(i, p.rate) : null);
    const linePath = pointsArr.filter(Boolean).map((pt, i) => (i === 0 ? 'M' : 'L') + pt[0] + ',' + pt[1]).join(' ');

    const months = ['ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ'];
    function shortMonth(ym) {
      const m = parseInt(ym.split('-')[1], 10);
      return months[m - 1] || '';
    }

    const yLabels = [0, 25, 50, 75, 100];

    targetEl.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto; max-height:${h}px;" aria-label="גרף מגמת נוכחות">
        <!-- gridlines -->
        ${yLabels.map(v => {
          const y = padY + innerH - (v / maxY) * innerH;
          return `<line x1="${padX}" y1="${y}" x2="${w - padX}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
                  <text x="${padX - 8}" y="${y + 4}" text-anchor="end" fill="#9ca3af" font-size="11" font-family="Heebo">${v}%</text>`;
        }).join('')}
        <!-- target line at 80% -->
        <line x1="${padX}" y1="${padY + innerH - 0.8 * innerH}" x2="${w - padX}" y2="${padY + innerH - 0.8 * innerH}" stroke="#16a34a" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
        <text x="${w - padX + 4}" y="${padY + innerH - 0.8 * innerH + 4}" fill="#16a34a" font-size="10" font-family="Heebo">יעד 80%</text>
        <!-- line -->
        <path d="${linePath}" fill="none" stroke="#0891b2" stroke-width="2.5" stroke-linecap="round"/>
        <!-- points -->
        ${series.map((p, i) => {
          if (p.rate === null) return '';
          const [x, y] = xy(i, p.rate);
          const color = p.rate >= 90 ? '#16a34a' : p.rate >= 70 ? '#f59e0b' : '#dc2626';
          return `<circle cx="${x}" cy="${y}" r="5" fill="${color}" stroke="white" stroke-width="2"/>
                  <text x="${x}" y="${y - 12}" text-anchor="middle" fill="${color}" font-size="11" font-weight="700" font-family="Heebo">${p.rate}%</text>`;
        }).join('')}
        <!-- X labels -->
        ${series.map((p, i) => {
          const [x] = xy(i, 0);
          return `<text x="${x}" y="${h - 14}" text-anchor="middle" fill="#6b7280" font-size="12" font-family="Heebo">${shortMonth(p.month)}</text>`;
        }).join('')}
      </svg>
    `;
  }

  return {
    NETWORKS, SECTORS, SUBJECTS, TYPES,
    api, apiPost,
    netById, secById, netChip, secChip, typeChip,
    attendanceBadge, toast, urlParam,
    monthLabel, formatDate,
    gmailCompose, whatsappLink,
    setAppsScriptUrl, getAppsScriptUrl,
    renderTrendChart
  };
})();
