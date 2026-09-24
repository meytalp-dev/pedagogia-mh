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
    'מתמטיקה','אנגלית','עברית','ספרות','היסטוריה','אזרחות','תנ"ך','ערבית',
    // נלמדים בחברה הערבית בלבד, ורק בחלק מבתי הספר. נוספו 9.9.26 —
    // עד אז מנסור עתאמנה ומזנה לא ראו אף מורה בדשבורד שלהם.
    'מורשת אסלאמית','מורשת דרוזית'
  ];

  const TYPES = [
    { id: 'bagrut', name: 'בגרות' },
    { id: 'gemer',  name: 'גמר'   }
  ];

  // יחידות לימוד — רלוונטי למסלול בגרות בלבד (בגמר אין יח"ל).
  // נשמר בשדה teachers.units. שלושה ערכים בלבד, כדי שהחלוקה בין
  // קבוצות ההדרכה תהיה חד־משמעית: 3 · 4-5 · מי שמלמד/ת גם וגם.
  const UNITS = [
    { id: '3',     name: '3 יח"ל',   short: '3'   },
    { id: '4-5',   name: '4-5 יח"ל', short: '4-5' },
    { id: '3+4-5', name: '3 + 4-5',  short: '3+4-5' }
  ];

  // מפרק ערך שמור לרשימת הרמות שהוא מכיל: '3+4-5' → ['3','4-5'].
  // ערך ריק (טרם סומן) מחזיר מערך ריק — לא להתייחס אליו כאילו הוא 3.
  function unitsSet(v) {
    const s = (v || '').toString().trim();
    if (!s) return [];
    if (s === '3+4-5') return ['3', '4-5'];
    return UNITS.some(u => u.id === s) ? [s] : [];
  }
  function unitsLabel(v) {
    const hit = UNITS.find(u => u.id === (v || '').toString().trim());
    return hit ? hit.name : '';
  }
  // ⚠ Google Sheets ממיר "4-5" ל**תאריך** (2026-05-03) ו-"3" למספר. גרשן מוביל
  // מכריח את התא להישאר טקסט, והקריאה חוזרת נקייה ("4-5"). כל כתיבה של units
  // לשרת חייבת לעבור כאן. נמצא בבדיקת דפדפן 9.9.26 — לא בקריאת קוד.
  function unitsForWrite(v) {
    const s = (v || '').toString().trim();
    return s ? "'" + s : '';
  }

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

  // ---------- Auth (מייל + סיסמה) ----------
  // פרטי ההתחברות נשמרים ב-localStorage ומצורפים אוטומטית לכל קריאה לשרת.
  function authGet() {
    try { return JSON.parse(localStorage.getItem('ts.auth') || 'null'); } catch (e) { return null; }
  }
  function authSet(payload) {
    localStorage.setItem('ts.auth', JSON.stringify({
      email: payload.email, token: payload.token, role: payload.role,
      name: payload.name || '', networkId: payload.networkId || '',
      schoolId: payload.schoolId || '', subjectId: payload.subjectId || '',
      guideId: payload.guideId || ''
    }));
  }
  function authClear() { localStorage.removeItem('ts.auth'); }
  function withAuth_(params) {
    const a = authGet();
    if (a && a.token) return Object.assign({ authEmail: a.email, authToken: a.token }, params);
    return params;
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

  // fetch עם תקרת זמן. בלי זה בקשה שנתקעת ברשת סלולרית חלשה לא נכשלת לעולם,
  // ותור השמירה של הזנת המורים נשאר תקוע עליה בשקט עד שהדף נסגר.
  // 14.9.26: טעינת teachers.list נמדדה ב-35–39 שניות בעומס — 30 הפילו אותה
  const REQUEST_TIMEOUT_MS = 60000;
  // כתיבה מקבלת יותר: השרת ממתין עד 45 שניות למנעול, ובעומס (14.9.26) נמדדו
  // כ-30% מהבקשות ב-32–35 שניות — ממש מעל 30. הלקוח ויתר והציג "timeout"
  // על בקשה שהייתה מסתיימת (ולפעמים כבר נכתבה).
  const POST_TIMEOUT_MS = 90000;
  async function fetchWithTimeout(url, opts, ms) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms || REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, Object.assign({}, opts, { signal: ctl.signal }));
    } finally {
      clearTimeout(timer);
    }
  }

  // Apps Script עונה 302 לכתובת תוכן זמנית, ומדי פעם הכתובת הזו מחזירה 404
  // ודף HTML במקום JSON (נמדד 11.9.26: עד 3 מתוך 6 קריאות). בלי ניסיון חוזר,
  // דשבורד המדריכה נפל בשקט ל"לא זוהתה מדריכה". GET בלבד — קריאה בלי תופעות
  // לוואי. POST לא חוזר: הכתיבה כבר בוצעה לפני ההפניה, וניסיון שני היה משכפל.
  const GET_ATTEMPTS = 3;
  const RETRY_DELAYS_MS = [1200, 3000];
  const sleep_ = ms => new Promise(r => setTimeout(r, ms));

  /* בקשה כפולה לקריאות (24.9.26): נמדד שבקשה רגילה עונה ב-2–3 שניות, אבל בערך
     אחת מחמש נתקעת 20–25 שניות (Google מעיר מופע חדש של השרת) — והדף מחכה לאיטית
     שבהן. קריאה שלא ענתה תוך HEDGE_MS נשלחת שוב, והתשובה הראשונה מנצחת.
     רק לקריאות: פעולה שכותבת (גם ב-GET, כמו link.seen) לעולם לא נשלחת פעמיים. */
  const HEDGE_MS = 5000;
  const HEDGE_RE = /\.(list|get|dashboard|scope|report|state|self|directory|workspace|group|roster|code|status|verify|timing)$/;
  function getOnce_(url) {
    return fetchWithTimeout(url).then(async res => {
      if (!res.ok) { const e = new Error('http_' + res.status); e.kind = 'http'; throw e; }
      const text = await res.text();
      try { return JSON.parse(text); }
      catch (err) { const e = new Error('bad_response'); e.kind = 'bad'; throw e; }
    });
  }
  function getHedged_(url, hedge) {
    if (!hedge) return getOnce_(url);
    return new Promise((resolve, reject) => {
      let done = false, pending = 0, fired = 0;
      const fire = () => {
        pending++; fired++;
        getOnce_(url).then(j => { if (!done) { done = true; clearTimeout(t); resolve(j); } },
          e => { if (--pending === 0 && !done && fired === 2) { done = true; reject(e); }
                 else if (pending === 0 && !done && fired === 1) { done = true; clearTimeout(t); reject(e); } });
      };
      const t = setTimeout(() => { if (!done) fire(); }, HEDGE_MS);
      fire();
    });
  }

  async function fetchFromApi(action, params) {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('action', action);
    Object.entries(withAuth_(params)).forEach(([k,v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
    let last = null, timeouts = 0;
    for (let i = 0; i < GET_ATTEMPTS; i++) {
      if (i) await sleep_(RETRY_DELAYS_MS[i - 1]);
      try {
        return await getHedged_(url.toString(), HEDGE_RE.test(action) && action !== 'link.seen');
      } catch (e) {
        if (e.kind === 'http' || e.kind === 'bad') { last = { ok: false, error: e.message }; continue; }
        last = { ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message };
        // פסק זמן אחד מתקבל בניסיון חוזר; שניים ברצף — כבר דקה, לא ממשיכים
        if (e.name === 'AbortError' && ++timeouts >= 2) break;
      }
    }
    console.error('API error', action, last && last.error);
    // transient — סימן לעמוד להציג "תקלה רגעית" עם כפתור ניסיון חוזר,
    // ולא הודעה שמאשימה את הקישור או את הנתונים
    return Object.assign({ transient: true }, last);
  }

  async function apiPost(action, body) {
    if (!APPS_SCRIPT_URL) return { ok: false, error: 'no_url' };
    try {
      const res = await fetchWithTimeout(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action, ...withAuth_(body) }),
        headers: { 'Content-Type': 'text/plain' }
      }, POST_TIMEOUT_MS);
      // אותה תקלה רגעית כמו ב-GET: ההפניה מחזירה לפעמים דף HTML של "הדף לא נמצא".
      // בלי זה המשתמש ראה "Unexpected token '<' ... is not valid JSON" (דנה, 17.9.26).
      // הכתיבה עצמה בדרך כלל כבר בוצעה — העמוד מחליט אם לבדוק מחדש או לנסות שוב.
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); }
      catch (e) { return { ok: false, error: 'bad_response', transient: true }; }
      // הזרמת cache אחרי POST שמשנה נתונים
      if (json && json.ok) cacheInvalidate();
      return json;
    } catch (e) {
      console.error('API error', e);
      return { ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message };
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
  // authuser: כל מייל שיוצא בשם מיטל נשלח מהג'ימייל ולא מחשבון אורט — לדומיין
  // bethaarava.ort.org.il אין רשומת SPF, ושרתי מיקרוסופט דוחים ממנו (3 מתוך 32
  // נחסמו כך בסבב לרכזי התקשוב). אם נפתח חשבון אחר — מחליפים חשבון בפינה.
  const MAIL_FROM = 'mlypeleg@gmail.com';
  function gmailCompose({to='', subject='', body='', cc='', authuser=MAIL_FROM} = {}) {
    const u = new URL('https://mail.google.com/mail/');
    if (authuser) u.searchParams.set('authuser', authuser);
    u.searchParams.set('view', 'cm');
    u.searchParams.set('fs', '1');
    if (to) u.searchParams.set('to', to);
    if (cc) u.searchParams.set('cc', cc);
    if (subject) u.searchParams.set('su', subject);
    if (body) u.searchParams.set('body', body);
    return u.toString();
  }

  /* הנוסח כטקסט אחד להעתקה — לכל מי שלא שולחת דרך ג'ימייל בדפדפן
     (אאוטלוק, אפליקציית מייל בנייד, הדבקה לוואטסאפ web). */
  function mailPlainText({to='', subject='', body=''} = {}) {
    return [to ? 'אל: ' + to : '', subject ? 'נושא: ' + subject : '', '', body]
      .filter((l, i) => l !== '' || i === 2).join('\n');
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
                  <text x="${padX - 8}" y="${y + 4}" text-anchor="end" fill="#9ca3af" font-size="11" font-family="Fredoka, Heebo, sans-serif">${v}%</text>`;
        }).join('')}
        <!-- target line at 80% -->
        <line x1="${padX}" y1="${padY + innerH - 0.8 * innerH}" x2="${w - padX}" y2="${padY + innerH - 0.8 * innerH}" stroke="#16a34a" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
        <text x="${w - padX + 4}" y="${padY + innerH - 0.8 * innerH + 4}" fill="#16a34a" font-size="10" font-family="Fredoka, Heebo, sans-serif">יעד 80%</text>
        <!-- line -->
        <path d="${linePath}" fill="none" stroke="#0891b2" stroke-width="2.5" stroke-linecap="round"/>
        <!-- points -->
        ${series.map((p, i) => {
          if (p.rate === null) return '';
          const [x, y] = xy(i, p.rate);
          const color = p.rate >= 90 ? '#16a34a' : p.rate >= 70 ? '#f59e0b' : '#dc2626';
          return `<circle cx="${x}" cy="${y}" r="5" fill="${color}" stroke="white" stroke-width="2"/>
                  <text x="${x}" y="${y - 12}" text-anchor="middle" fill="${color}" font-size="11" font-weight="700" font-family="Fredoka, Heebo, sans-serif">${p.rate}%</text>`;
        }).join('')}
        <!-- X labels -->
        ${series.map((p, i) => {
          const [x] = xy(i, 0);
          return `<text x="${x}" y="${h - 14}" text-anchor="middle" fill="#6b7280" font-size="12" font-family="Fredoka, Heebo, sans-serif">${shortMonth(p.month)}</text>`;
        }).join('')}
      </svg>
    `;
  }

  return {
    NETWORKS, SECTORS, SUBJECTS, TYPES, UNITS,
    unitsSet, unitsLabel, unitsForWrite,
    authGet, authSet, authClear,
    api, apiPost,
    netById, secById, netChip, secChip, typeChip,
    attendanceBadge, toast, urlParam,
    monthLabel, formatDate,
    gmailCompose, mailPlainText, MAIL_FROM, whatsappLink,
    setAppsScriptUrl, getAppsScriptUrl,
    renderTrendChart
  };
})();
