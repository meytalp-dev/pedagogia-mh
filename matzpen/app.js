/* מצפן החינוך היוצר — הכלי הדיגיטלי */
(function () {
  'use strict';
  var C = window.MZ, SCHOOLS = window.MZ_SCHOOLS, API = window.MZApi;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function noIcon(s) { return String(s || '').replace(/^[^֐-׿A-Za-z0-9"(]+/, ''); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }

  /* המצפן הפנימי והשאלות שמובילות — מתוך החוברת */
  var INNER = [
    { head: 'קשר, אמון ומקום לכל אחד ואחת', text: 'בית ספר אינו רק מבנה, מערכת שעות או תוכנית עבודה — הוא בראש ובראשונה רשת של מערכות יחסים. עיקרון "האדם והחברה במרכז" מזכיר לנו שכל למידה משמעותית מתחילה במבט פוגש, בביטחון ובשייכות. לפני שאנחנו מלמדים מקצוע או מקנים מיומנות, אנחנו פוגשים אדם שלם — עם עולם רגשי, עוצמות ורצון להיראות.', q: 'האם כל תלמיד ואיש צוות יודעים שיש להם כאן עוגן אמיתי? כיצד שגרות המפגש, ההקשבה והאחריות ההדדית יוצרות קהילה שמאמינה באנשיה ומצמיחה אותם מתוכה?' },
    { head: 'בין הידיים לראש, בין הכיתה לעולם', text: 'מעשה היצירה והעבודה אינו נפרד מהעולם העיוני, הוא מנוע הלמידה העוצמתי ביותר שלו. בעיקרון הלמידה הדואלית, המקצוע, בית המלאכה והחניכות הם כר פורה להתפתחות אישית, לסקרנות ולרכישת מיומנויות חיים של ממש. הלמידה אינה ישיבה פסיבית מול לוח, אלא תנועה חיה של "ספירלת הזרימה": יוצאים אל אתגר אמיתי, חווים אותו בידיים ובגוף, ומעבדים אותו לכדי תובנה וצמיחה.', q: 'איך אנחנו מחברים בין מה שקורה בכיתה לעולם המעשה והחניכות? ואיך כל התנסות מקצועית הופכת להזדמנות לפתח חשיבה, שיתוף פעולה, יצירתיות וביטחון עצמי?' },
    { head: 'למידה שנוגעת בחיים ובכל קול', text: 'למידה מקבלת תוקף כשהתלמיד יכול להגיד בלב שלם: "זה קשור אליי, זה חשוב לעולם שלי". עיקרון הרלוונטיות מבקש מאיתנו לבנות בית חינוכי רחב ומזמין, כזה שלא דורש מאיש להשאיר את זהותו, תרבותו או סיפור חייו בשער בית הספר. כשאנו פותחים מרחב לבחירה אמיתית, מייצרים תוצרים שיש להם משמעות מעבר לציון במבחן, ומחברים את חומרי הלימוד למציאות היומיומית ולקהילה — הלמידה הופכת למעוררת חיים.', q: 'איפה התלמידים פוגשים את עצמם בתוכנית הלימודים? וכיצד בית הספר מעניק ביטוי אמיתי למגוון הקולות, השאלות הערכיות והתרבויות שמרכיבים אותו?' },
    { head: 'שדה ראייה רחב ובניית תמונת עתיד', text: 'תפקידנו אינו להכין את התלמיד לתפקיד צר ומוגדר, אלא לפתוח בפניו שערים רחבים ככל האפשר אל העולם. עיקרון זה עוסק בהענקת כנפיים וצידה עשירה לדרך: היכרות עם מסלולי המשך מגוונים, מפגש מעורר השראה עם בוגרים ומומחים, רכישת תעודות והסמכות בעלות ערך, והתנסות אמיצה ביזמות ובהובלה. מטרתנו לעזור לכל בוגר/ת להאמין ביכולתם לעצב את עתידם, להשפיע ולהוביל בחברה.', q: 'אילו דלתות אנחנו פותחים בפני התלמידים אל מעבר למוכר ולגלוי? ואיך אנחנו מלווים אותם בבניית תמונת עתיד בהירה, מעשית ומלאת שאיפות?' },
    { head: 'קהילה לומדת, משתפרת ומתחדשת', text: 'בית ספר יוצר אינו מערכת קפואה שפועלת מתוך כוחו של הרגל; הוא אורגניזם חי, קשוב ומתפתח. עיקרון "מודל חי ודינמי" מושתת על ההבנה שהצוות החינוכי הוא בעצמו קהילה לומדת וחוקרת. בעזרת עצירה לרפלקציה כנה, הקשבה לתהודה ולנתונים מהשטח, למידת עמיתים והטלת ספק בריאה בשגרות קיימות — אנחנו מעזים לנסות, לדייק, לפתח יוזמות חדשות ולשתף את הידע שלנו עם שותפים ורשתות חינוך.', q: 'מתי עצרנו לאחרונה לשאול בכנות "מה עובד ומה דורש חידוש"? וכיצד אנחנו מטפחים בתוכנו תרבות של אמון, למידה הדדית ואומץ להתחדש?' }
  ];

  /* אייקונים בקו */
  var IC = {
    l1: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-7"/><path d="M12 14c0-3 2-5 5-5 0 3-2 5-5 5z"/><path d="M5 21h14"/></svg>',
    l2: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V9"/><path d="M12 13c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6z"/><path d="M12 11C12 8 10 6 6.5 6c0 3 2 5 5.5 5z"/><path d="M5 21h14"/></svg>',
    l3: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-6"/><path d="M12 15l-3-3M12 15l3-2.5"/><path d="M7.5 15.5a4.5 4.5 0 0 1-.9-8.4A5.5 5.5 0 0 1 17.4 7a4.5 4.5 0 0 1-.9 8.5z"/><path d="M6 21h12"/></svg>',
    l4: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M6 14h12v7H6z"/></svg>',
    help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.2v.1"/></svg>',
    out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    hint: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
    anchor: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><path d="M12 7v14"/><path d="M5 13a7 7 0 0 0 14 0"/><path d="M8 11h8"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    compass: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>'
  };
  var LV = C.levels; // 4 שמות

  /* ---------- מצב ---------- */
  var S = { school: '', t: '', data: {}, mid: '', step: 'intro', pi: 0, qi: 0, ppi: 1, dirty: {}, editing: null };
  var DEV = store('mz_dev');
  if (!DEV) { DEV = 'd' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); store('mz_dev', DEV); }

  function val(k) { var o = S.data[k]; return o ? o.v : ''; }
  function jval(k, def) { try { var v = val(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function meas() { return jval('meas', []); }
  function K(kind, a) { return 'm:' + S.mid + ':' + kind + ':' + a; }

  /* ---------- שמירה ---------- */
  var queue = {}, timer = null;
  function put(k, v, now) {
    S.data[k] = { v: String(v), u: Date.now() };
    queue[k] = String(v); S.dirty[k] = 1;
    status('שומר…', 'busy');
    clearTimeout(timer); timer = setTimeout(flush, now ? 10 : 900);
  }
  function flush() {
    var keys = Object.keys(queue); if (!keys.length) return;
    var items = keys.slice(0, 50).map(function (k) { return { k: k, v: queue[k] }; });
    items.forEach(function (it) { delete queue[it.k]; });
    API.call({ a: 'set', t: S.t, items: items }).then(function (r) {
      if (!r.ok) throw r;
      items.forEach(function (it) { if (!queue[it.k]) delete S.dirty[it.k]; });
      if (Object.keys(queue).length) flush(); else status('נשמר', 'ok');
    }).catch(function (e) {
      items.forEach(function (it) { if (queue[it.k] === undefined) queue[it.k] = it.v; });
      if (e && e.err === 'auth') return logout('הכניסה פגה. היכנסו שוב עם הקוד של בית הספר.');
      status('אין חיבור — ננסה שוב', 'err');
      clearTimeout(timer); timer = setTimeout(flush, 5000);
    });
  }
  function status(t, cls) { var el = $('#saveState'); if (el) { el.textContent = t; el.className = 'save ' + (cls || ''); } }
  window.addEventListener('beforeunload', function (e) { if (Object.keys(queue).length) { flush(); e.preventDefault(); e.returnValue = ''; } });

  function pull(rerender) {
    return API.call({ a: 'get', t: S.t }).then(function (r) {
      if (!r.ok) { if (r.err === 'auth') logout('הכניסה פגה. היכנסו שוב עם הקוד של בית הספר.'); return; }
      var changed = false;
      Object.keys(r.data).forEach(function (k) {
        if (S.dirty[k]) return;
        var cur = S.data[k];
        if (!cur || cur.v !== r.data[k].v) { S.data[k] = r.data[k]; changed = true; }
      });
      if (changed && rerender) softRefresh();
    });
  }
  setInterval(function () { if (S.t && !document.hidden) pull(true); }, 25000);

  /* ---------- כניסה ---------- */
  function showLogin(msg) {
    document.body.classList.add('is-login');
    var DEMO = 'בית ספר בדיקה', demo = /[?&]demo\b/.test(location.search);
    var last = demo ? DEMO : (store('mz_school') || '');
    var list = demo ? SCHOOLS.concat([DEMO]) : SCHOOLS;
    $('#app').innerHTML =
      '<section class="login card">' +
      '<div class="login-head">' + IC.compass + '<div><h2>כניסה למצפן של בית הספר</h2><p>כל בית ספר עובד במרחב משלו. רק מי שיש לו את הקוד של בית הספר רואה את מה שנכתב בו.</p></div></div>' +
      (msg ? '<p class="note warn" role="alert">' + esc(msg) + '</p>' : '') +
      '<label class="fld"><span>בית הספר</span><select id="lgSchool"><option value="">בחרו בית ספר…</option>' +
      list.map(function (s) { return '<option' + (s === last ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></label>' +
      '<div id="lgRest"></div></section>';
    $('#lgSchool').addEventListener('change', loginStep);
    if (last) loginStep();
  }
  function loginStep() {
    var s = $('#lgSchool').value, box = $('#lgRest');
    if (!s) { box.innerHTML = ''; return; }
    box.innerHTML = '<p class="muted">בודק…</p>';
    API.call({ a: 'status', school: s }).then(function (r) {
      if (!r.ok) throw r;
      if (r.hasCode) {
        box.innerHTML = '<label class="fld"><span>הקוד של בית הספר</span><input id="lgCode" type="password" autocomplete="current-password" dir="ltr"></label>' +
          '<button class="btn primary" id="lgGo">כניסה</button><p class="muted small">שכחתם את הקוד? פנו למרחב הפדגוגי דרך "נתקלתם בבעיה?" בתחתית הדף. הנתונים שלכם לא יימחקו.</p>';
        $('#lgGo').onclick = function () { doLogin('login', s, $('#lgCode').value); };
      } else {
        box.innerHTML = '<div class="note"><span><b>זו הכניסה הראשונה של בית הספר.</b> קבעו קוד (6 תווים לפחות) ושתפו אותו עם הצוות המוביל בלבד. כל מי שיש לו את הקוד יוכל לראות ולערוך.</span></div>' +
          '<label class="fld"><span>קוד חדש לבית הספר</span><input id="lgCode" type="password" autocomplete="new-password" dir="ltr"></label>' +
          '<label class="fld"><span>שוב, לאימות</span><input id="lgCode2" type="password" autocomplete="new-password" dir="ltr"></label>' +
          '<button class="btn primary" id="lgGo">קביעת קוד וכניסה</button>';
        $('#lgGo').onclick = function () {
          var a = $('#lgCode').value, b = $('#lgCode2').value;
          if (a.length < 6) return loginErr('הקוד צריך להיות באורך 6 תווים לפחות.');
          if (a !== b) return loginErr('שני הקודים לא זהים.');
          doLogin('setCode', s, a);
        };
      }
      var inp = $('#lgCode'); inp.focus();
      $$('#lgRest input').forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#lgGo').click(); }); });
    }).catch(function () { box.innerHTML = '<p class="note warn">אין חיבור לשרת כרגע. נסו שוב בעוד רגע.</p>'; });
  }
  function loginErr(m) { var p = $('#lgErr'); if (!p) { p = document.createElement('p'); p.id = 'lgErr'; p.className = 'note warn'; p.setAttribute('role', 'alert'); $('#lgRest').appendChild(p); } p.textContent = m; }
  function doLogin(a, s, code) {
    var b = $('#lgGo'); b.disabled = true; b.textContent = 'רגע…';
    API.call({ a: a, school: s, code: code }).then(function (r) {
      if (!r.ok) {
        b.disabled = false; b.textContent = a === 'setCode' ? 'קביעת קוד וכניסה' : 'כניסה';
        return loginErr({ wrong: 'הקוד לא נכון.', locked: 'יותר מדי ניסיונות. נסו שוב בעוד רבע שעה.', exists: 'מישהו מבית הספר כבר קבע קוד. בקשו אותו מהצוות המוביל.', short: 'הקוד קצר מדי.' }[r.err] || 'משהו השתבש. נסו שוב.');
      }
      S.t = r.t; S.school = s; store('mz_t', r.t); store('mz_school', s);
      start();
    }).catch(function () { b.disabled = false; loginErr('אין חיבור לשרת כרגע.'); });
  }
  function logout(msg) { store('mz_t', null); S.t = ''; S.data = {}; showLogin(msg); }

  /* ---------- התחלה ---------- */
  function start() {
    document.body.classList.remove('is-login');
    $('#app').innerHTML = '<p class="muted center pad">טוען את המצפן של ' + esc(S.school) + '…</p>';
    pull(false).then(function () {
      if (!S.t) return;
      var m = meas();
      if (!m.length) { m = [{ id: newId(), label: monthLabel(), c: Date.now() }]; put('meas', JSON.stringify(m), true); }
      var saved = store('mz_mid');
      S.mid = (m.filter(function (x) { return x.id === saved; })[0] || m[m.length - 1]).id;
      var st = store('mz_step'); if (st) { try { st = JSON.parse(st); S.step = st.step || 'intro'; S.pi = st.pi || 0; S.qi = st.qi || 0; } catch (e) { } }
      shell(); render();
    });
  }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function monthLabel() { var M = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'], d = new Date(); return M[d.getMonth()] + ' ' + d.getFullYear(); }

  var STEPS = [
    { id: 'intro', t: 'פתיחה' }, { id: 'story', t: 'הסיפור' },
    { id: 'p1', t: 'עיקרון 1', p: 1 }, { id: 'p2', t: 'עיקרון 2', p: 2 }, { id: 'p3', t: 'עיקרון 3', p: 3 }, { id: 'p4', t: 'עיקרון 4', p: 4 }, { id: 'p5', t: 'עיקרון 5', p: 5 },
    { id: 'personal', t: 'עצירה אישית' }, { id: 'summary', t: 'תמונת מצב' }, { id: 'plan', t: 'תוכנית פעולה' }
  ];

  function shell() {
    var m = meas();
    $('#bar').innerHTML =
      '<div class="who"><span class="school">' + esc(S.school) + '</span>' +
      '<label class="meas"><span>מדידה</span><select id="measSel">' + m.map(function (x) { return '<option value="' + x.id + '"' + (x.id === S.mid ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select></label>' +
      '<button class="btn ghost sm" id="measNew" title="מדידה חדשה" aria-label="מדידה חדשה">' + IC.plus + '<span>מדידה חדשה</span></button></div>' +
      '<div class="bar-end"><span id="saveState" class="save ok">נשמר</span><button class="btn ghost sm" id="outBtn" title="יציאה">' + IC.out + '<span>יציאה</span></button></div>';
    $('#measSel').onchange = function () { S.mid = this.value; store('mz_mid', S.mid); render(); };
    $('#measNew').onclick = newMeasurement;
    $('#outBtn').onclick = function () { flush(); logout(''); };
    navRender();
  }
  function navRender() {
    $('#steps').innerHTML = STEPS.map(function (s) {
      var on = s.id === S.step, pc = s.p ? progP(s.p) : null;
      return '<button class="step' + (on ? ' on' : '') + (s.p ? ' p' + s.p : '') + '" data-step="' + s.id + '"' + (on ? ' aria-current="step"' : '') + '>' +
        (s.p ? '<i class="dot" style="--pc:' + C.principles[s.p - 1].color + '"></i>' : '') + '<span>' + s.t + '</span>' +
        (pc ? '<small>' + pc.done + '/' + pc.n + '</small>' : '') + '</button>';
    }).join('');
    $$('#steps .step').forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-step'), 0); }; });
    var on = $('#steps .step.on'); if (on && on.scrollIntoView) { try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { } }
  }
  function progP(n) { var p = C.principles[n - 1], d = 0; p.practices.forEach(function (x, i) { if (val(K('lv', n + '.' + i))) d++; }); return { done: d, n: p.practices.length }; }

  function newMeasurement() {
    var m = meas(), label = window.prompt('שם למדידה החדשה (למשל "סוף שנה תשפ״ז"):', monthLabel());
    if (!label) return;
    m.push({ id: newId(), label: label.slice(0, 40), c: Date.now() });
    put('meas', JSON.stringify(m), true);
    S.mid = m[m.length - 1].id; store('mz_mid', S.mid);
    shell(); go('p1', 0);
  }

  function go(step, qi) {
    flush();
    S.step = step; S.qi = qi || 0;
    store('mz_step', JSON.stringify({ step: S.step, pi: S.pi, qi: S.qi }));
    render(); window.scrollTo(0, 0);
  }

  function render() {
    navRender();
    var st = S.step, main = $('#app');
    document.body.setAttribute('data-step', st);
    document.body.classList.toggle('in-p', /^p\d$/.test(st));
    var p = /^p(\d)$/.exec(st);
    document.body.style.setProperty('--pc', p ? C.principles[+p[1] - 1].color : '');
    if (st === 'intro') main.innerHTML = vIntro();
    else if (st === 'story') main.innerHTML = vStory();
    else if (p) main.innerHTML = vPrinciple(+p[1]);
    else if (st === 'personal') main.innerHTML = vPersonal();
    else if (st === 'summary') main.innerHTML = vSummary();
    else if (st === 'plan') main.innerHTML = vPlan();
    bind();
  }
  function softRefresh() {
    // רענון בלי לשבור הקלדה: רק במסכים שמציגים נתוני אחרים
    var a = document.activeElement;
    if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { navRender(); return; }
    render();
  }

  /* ---------- מסכים ---------- */
  function vIntro() {
    var I = C.intro;
    return '<section class="card intro">' +
      '<p class="eyebrow">מדריך לתהליך העבודה הבית ספרי</p><h2>' + esc(I.title) + '</h2>' +
      '<p class="lead">כלי עבודה לפיתוח שפה משותפת, זיהוי חוזקות ושרטוט צעדי ההתפתחות הבאים של בית הספר. <b>' + esc(I.note) + '</b></p>' +
      '<div class="goals">' + I.goals.map(function (g) { var m = /^\d\.\s*([^—]+)—\s*(.*)$/.exec(g); return '<div class="goal"><b>' + esc(m ? m[1].trim() : '') + '</b><span>' + esc(m ? m[2] : g) + '</span></div>'; }).join('') + '</div>' +
      '<h3>ארבע הרמות</h3><div class="lvl-legend">' + I.levels.map(function (l, i) { return '<div class="lg l' + (i + 1) + '">' + IC['l' + (i + 1)] + '<b>' + esc(l.name) + '</b><span>' + esc(l.desc) + '</span></div>'; }).join('') + '</div>' +
      '<h3>שלושת שלבי התהליך</h3><ol class="phases">' +
      '<li><b>מיפוי ודיאלוג</b><span>הסיפור הבית ספרי, עצירה אישית לפני כל מפגש, ודירוג כל פרקטיקה מתוך שיח עם דוגמה מהשטח.</span></li>' +
      '<li><b>תמונת מצב ובחירת מיקוד</b><span>תמונת המצב נבנית לבד. מזהים חוזקות ובוחרים 1–2 מוקדי צמיחה.</span></li>' +
      '<li><b>העמקה ופעולה</b><span>כלים מהחוברת לכל פרקטיקה, ותוכנית פעולה: שגרה חדשה, מוביל/ה, ומה יעיד על התקדמות.</span></li></ol>' +
      '<p class="note">' + IC.hint + '<span>' + esc(I.example) + '</span></p>' +
      '<div class="actions"><button class="btn primary" data-go="story">מתחילים בסיפור הבית ספרי ' + IC.next + '</button></div></section>';
  }

  function ta(k, ph, rows, cls) { return '<textarea class="inp ' + (cls || '') + '" data-k="' + k + '" rows="' + (rows || 3) + '" placeholder="' + esc(ph || '') + '">' + esc(val(k)) + '</textarea>'; }
  function inp(k, ph) { return '<input class="inp" data-k="' + k + '" value="' + esc(val(k)) + '" placeholder="' + esc(ph || '') + '">'; }

  function vStory() {
    var T = C.story, br = bridgeStatus();
    return '<section class="card story">' +
      '<p class="eyebrow">נקודת המוצא של המצפן</p><h2>הסיפור הבית ספרי</h2><p class="lead">' + esc(T.sub) + '</p>' +
      '<p class="muted small">הסיפור משותף לכל המדידות של בית הספר.</p>' +
      '<label class="fld"><span>' + esc(T.need) + '</span>' + ta('story.need', '', 3) + '</label>' +
      '<label class="fld"><span>' + esc(T.beliefs) + '</span>' + ta('story.beliefs', 'אמונה בכל שורה', 4) + '</label>' +
      '<label class="fld big"><span>' + esc(T.idea) + '</span>' + ta('story.idea', '', 2, 'idea') + '</label>' +
      '<fieldset class="fld"><legend>' + esc(T.stones) + '</legend><div class="stones">' +
      [1, 2, 3].map(function (i) { return '<label><span>אבן גדולה ' + i + '</span>' + ta('story.stone' + i, '', 3) + '</label>'; }).join('') + '</div></fieldset>' +
      '<h3>' + esc(T.bridgeTitle) + '</h3><p class="muted">' + esc(T.bridgeSub) + '</p>' +
      '<div class="bridge">' + T.bridge.map(function (b, i) {
        return '<div class="brow"><div class="bhead"><b>' + esc(b.part) + '</b><span>' + esc(b.principles) + '</span>' + br[i] + '</div>' + ta('story.bridge.' + i, 'מה מגובה בעשייה — ומה עדיין על הנייר?', 2) + '</div>';
      }).join('') + '</div>' +
      '<p class="note anchor">' + IC.anchor + '<span>' + esc(T.anchor) + '</span></p>' +
      '<div class="actions"><button class="btn" data-go="intro">' + IC.prev + ' פתיחה</button><button class="btn primary" data-go="p1">לעיקרון 1 ' + IC.next + '</button></div></section>';
  }
  function bridgeStatus() {
    // לכל חלק בפרוגרמה: כמה פרקטיקות בעקרונות שבוחנים אותו פועלות בעקביות (3–4) במדידה הנוכחית
    return C.story.bridge.map(function (b) {
      var ns = (b.principles.match(/עיקרון (\d)/g) || []).map(function (x) { return +x.slice(-1); }), hi = 0, tot = 0, done = 0;
      ns.forEach(function (n) { C.principles[n - 1].practices.forEach(function (x, i) { tot++; var l = +val(K('lv', n + '.' + i)); if (l) done++; if (l >= 3) hi++; }); });
      if (!done) return '<em class="chip">טרם דורג</em>';
      return '<em class="chip">' + hi + ' מתוך ' + tot + ' פרקטיקות פועלות בעקביות</em>';
    });
  }

  function lvCard(k, i, desc, cur) {
    return '<button type="button" class="lvl l' + i + (cur === i ? ' on' : '') + '" data-lv="' + k + '" data-v="' + i + '" aria-pressed="' + (cur === i) + '">' +
      '<span class="lvl-top">' + IC['l' + i] + '<b>' + esc(LV[i - 1]) + '</b>' + (cur === i ? '<i class="tick">' + IC.check + '</i>' : '') + '</span><span class="lvl-desc">' + esc(desc) + '</span></button>';
  }

  function vPrinciple(n) {
    var P = C.principles[n - 1], I = INNER[n - 1], np = P.practices.length, qi = S.qi;
    var head = '<header class="phead"><p class="eyebrow">עיקרון ' + n + '</p><h2>' + esc(P.name) + '</h2></header>';
    var dots = '<nav class="pdots" aria-label="פרקטיקות">' + '<button class="pd' + (qi === 0 ? ' on' : '') + '" data-qi="0">פתיחה</button>' +
      P.practices.map(function (x, i) { var l = +val(K('lv', n + '.' + i)); return '<button class="pd' + (qi === i + 1 ? ' on' : '') + (l ? ' done' : '') + '" data-qi="' + (i + 1) + '" title="' + esc(x.name) + '">' + (l ? IC['l' + l] : (i + 1)) + '</button>'; }).join('') +
      '<button class="pd' + (qi === np + 1 ? ' on' : '') + '" data-qi="' + (np + 1) + '">שיח וסיכום</button></nav>';
    var body;
    if (qi === 0) {
      var pc = personalCount(n);
      body = '<div class="popen"><div class="inner"><p class="inner-head">' + IC.compass + '<b>המצפן הפנימי</b> — ' + esc(I.head) + '</p><p>' + esc(I.text) + '</p>' +
        '<p class="lead-q"><b>השאלות שמובילות אותנו</b><br>' + esc(I.q) + '</p></div>' +
        '<p class="muted small"><b>מתוך ספר ההפעלה:</b> ' + esc(P.guidebook) + '</p>' +
        '<p class="muted small"><b>מקורות נתונים מוצעים:</b> ' + esc(P.sources) + '</p>' +
        '<div class="note">' + IC.hint + '<span>לפני המפגש: כל משתתף/ת עונה לבד על שאלות העצירה האישית של העיקרון הזה (כ-10 דקות). ' +
        (pc ? '<b>' + pc + ' מהצוות כבר ענו.</b> ' : '') + '<a href="#" data-gopers="' + n + '">לעצירה האישית</a></span></div>' +
        '<div class="actions"><button class="btn primary" data-qi="1">לפרקטיקה הראשונה ' + IC.next + '</button></div></div>';
    } else if (qi <= np) {
      var i = qi - 1, x = P.practices[i], key = n + '.' + i, cur = +val(K('lv', key)), ev = val(K('ev', key));
      body = '<div class="practice"><p class="pcount">פרקטיקה ' + qi + ' מתוך ' + np + '</p><h3>' + esc(x.name) + '</h3><p class="what">' + esc(x.what) + '</p>' +
        '<div class="lvls" role="group" aria-label="הרמה שלנו">' + x.levels.map(function (d, j) { return lvCard(K('lv', key), j + 1, d, cur); }).join('') + '</div>' +
        '<label class="fld"><span>דוגמאות וראיות מהשטח — "אצלנו זה נראה כך..."</span>' + ta(K('ev', key), '1–2 דוגמאות מוחשיות: נתונים, שגרות, תוצרים', 3) + '</label>' +
        '<p class="note soft evhint"' + (cur && !ev.trim() ? '' : ' hidden') + '>' + IC.hint + '<span>אם קשה למצוא דוגמה מעשית — ייתכן שהדירוג שבחרנו גבוה מדי.</span></p>' +
        (x.tools.length || x.note ? '<div class="tools"><p class="tools-h">כלים מהחוברת לפרקטיקה הזו</p>' + (x.note ? '<p class="muted">' + esc(x.note) + '</p>' : '') +
          '<ul>' + x.tools.map(function (t) { return '<li><a href="' + esc(t.u) + '" target="_blank" rel="noopener">' + esc(t.t) + IC.link + '</a></li>'; }).join('') + '</ul></div>' : '') +
        '<div class="actions"><button class="btn" data-qi="' + (qi - 1) + '">' + IC.prev + ' הקודם</button><button class="btn primary" data-qi="' + (qi + 1) + '">' + (qi === np ? 'לשיח ולסיכום' : 'הבא') + ' ' + IC.next + '</button></div></div>';
    } else {
      var nextStep = n < 5 ? 'p' + (n + 1) : 'summary';
      body = '<div class="wrapup"><h3>שאלות לשיח צוותי</h3><ol class="tq">' + P.team.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol>' +
        '<p class="muted small"><b>להעמקה בספר ההפעלה:</b> ' + esc(P.deepen) + '</p>' +
        '<label class="fld bridge-help"><span>גשר לשותפות — במה נשמח לעזרה בעיקרון הזה?</span><small class="muted">' + esc(P.bridgeSub) + '</small>' + ta(K('help', n), 'הכשרה, ליווי, משאבים, חיבורים…', 3) + '</label>' +
        '<div class="actions"><button class="btn" data-qi="' + np + '">' + IC.prev + ' הפרקטיקה האחרונה</button><button class="btn primary" data-go="' + nextStep + '">' + (n < 5 ? 'לעיקרון ' + (n + 1) : 'לתמונת המצב') + ' ' + IC.next + '</button></div></div>';
    }
    return '<section class="card principle p' + n + '">' + head + dots + body + '</section>';
  }

  /* ---------- עצירה אישית ---------- */
  function personalAll(n) {
    var re = new RegExp('^p:' + S.mid + ':([a-z0-9]+):' + n + '$'), out = [];
    Object.keys(S.data).forEach(function (k) { var m = re.exec(k); if (m) { var o = jval(k, null); if (o && ((o.a || []).some(function (x) { return x && x.trim(); }) || (o.ins || '').trim())) out.push({ dev: m[1], o: o, u: S.data[k].u }); } });
    return out.sort(function (a, b) { return a.u - b.u; });
  }
  function personalCount(n) { return personalAll(n).length; }
  function vPersonal() {
    var n = S.ppi || 1, P = C.principles[n - 1], k = 'p:' + S.mid + ':' + DEV + ':' + n, mine = jval(k, { name: store('mz_name') || '', a: ['', '', ''], ins: '' });
    var all = personalAll(n);
    return '<section class="card personal">' +
      '<p class="eyebrow">לפני השיח הצוותי</p><h2>עצירה אישית</h2>' +
      '<p class="lead">' + esc(P.personalIntro) + '</p>' +
      '<div class="ptabs" role="tablist">' + C.principles.map(function (p, i) { return '<button role="tab" class="ptab' + (i + 1 === n ? ' on' : '') + '" style="--pc:' + p.color + '" data-ppi="' + (i + 1) + '" aria-selected="' + (i + 1 === n) + '">' + (i + 1) + '. ' + esc(p.name) + '</button>'; }).join('') + '</div>' +
      '<div class="mine" data-pk="' + k + '">' +
      '<label class="fld short"><span>השם שלי <small class="muted">(לא חובה — אפשר לענות בעילום שם)</small></span><input class="inp pn" value="' + esc(mine.name || '') + '" autocomplete="name"></label>' +
      P.personal.map(function (q, i) { return '<label class="fld"><span>' + (i + 1) + '. ' + esc(q) + '</span><textarea class="inp pa" data-i="' + i + '" rows="3">' + esc((mine.a || [])[i] || '') + '</textarea></label>'; }).join('') +
      '<label class="fld"><span>' + esc(P.personalClose) + '</span><textarea class="inp pi" rows="2">' + esc(mine.ins || '') + '</textarea></label>' +
      '<p class="muted small">התשובות נשמרות לבד ונראות לצוות של בית הספר בלבד. אפשר לחזור ולתקן מהמכשיר הזה.</p></div>' +
      '<div class="team-answers"><h3>מה הצוות הביא <span class="chip">' + all.length + '</span></h3>' +
      (all.length ? '<div class="tlist">' + all.map(function (r) {
        return '<article class="tans' + (r.dev === DEV ? ' me' : '') + '"><header>' + esc(r.o.name || 'בעילום שם') + (r.dev === DEV ? ' <small>(אני)</small>' : '') + '</header>' +
          (r.o.ins ? '<p class="ins">' + IC.hint + '<span>' + esc(r.o.ins) + '</span></p>' : '') +
          '<details><summary>כל התשובות</summary>' + P.personal.map(function (q, i) { return (r.o.a || [])[i] ? '<p><b>' + (i + 1) + '.</b> ' + esc(r.o.a[i]) + '</p>' : ''; }).join('') + '</details></article>';
      }).join('') + '</div>' : '<p class="muted">עוד אין תשובות לעיקרון הזה במדידה הנוכחית.</p>') + '</div>' +
      '<div class="actions"><button class="btn primary" data-go="p' + n + '">לדירוג עיקרון ' + n + ' ' + IC.next + '</button></div></section>';
  }

  /* ---------- תמונת מצב ---------- */
  function stats(mid) {
    var res = C.principles.map(function (P, pi) {
      var n = pi + 1, d = [0, 0, 0, 0, 0], sum = 0, cnt = 0, items = [];
      P.practices.forEach(function (x, i) { var l = +val('m:' + mid + ':lv:' + n + '.' + i) || 0; d[l]++; if (l) { sum += l; cnt++; } items.push({ name: x.name, l: l, i: i }); });
      return { n: n, P: P, d: d, avg: cnt ? Math.round(sum / cnt * 10) / 10 : null, items: items, total: P.practices.length };
    });
    var all = [], tot = [0, 0, 0, 0, 0];
    res.forEach(function (r) { r.items.forEach(function (it) { if (it.l) all.push(it.l); }); r.d.forEach(function (v, i) { tot[i] += v; }); });
    return { pr: res, avg: all.length ? Math.round(all.reduce(function (a, b) { return a + b; }, 0) / all.length * 10) / 10 : null, tot: tot, filled: all.length };
  }
  function prevMid() { var m = meas(), i = m.map(function (x) { return x.id; }).indexOf(S.mid); return i > 0 ? m[i - 1] : null; }
  function vSummary() {
    var s = stats(S.mid), pm = prevMid(), ps = pm ? stats(pm.id) : null, total = s.tot.reduce(function (a, b) { return a + b; }, 0);
    var cur = meas().filter(function (x) { return x.id === S.mid; })[0] || {};
    var strong = [], grow = [];
    s.pr.forEach(function (r) { r.items.forEach(function (it) { if (it.l >= 3) strong.push({ r: r, it: it }); else if (it.l) grow.push({ r: r, it: it }); }); });
    function bar(v) { return v == null ? 0 : (v - 0) / 4 * 100; }
    return '<section class="card summary">' +
      '<p class="eyebrow">' + esc(cur.label || '') + (pm ? ' · בהשוואה ל' + esc(pm.label) : '') + '</p><h2>תמונת מצב — הפרופיל הבית ספרי</h2>' +
      '<p class="lead">' + 'הסטנדרט המערכתי: עשייה עקבית ברוב הפרקטיקות — לא "מומחים" בהכול.' + '</p>' +
      '<div class="kpis"><div class="kpi"><b>' + (s.avg == null ? '—' : s.avg) + '</b><span>ממוצע בית ספרי (1–4)' + (ps && ps.avg != null ? ' · קודם: ' + ps.avg : '') + '</span></div>' +
      '<div class="kpi"><b>' + strong.length + '<small> / ' + total + '</small></b><span>פרקטיקות שפועלות בעקביות</span></div>' +
      '<div class="kpi"><b>' + s.filled + '<small> / ' + total + '</small></b><span>פרקטיקות שדורגו</span></div></div>' +
      '<h3>ממוצע לכל עיקרון</h3><div class="avgs">' + s.pr.map(function (r, i) {
        var pv = ps ? ps.pr[i].avg : null;
        return '<div class="avg" style="--pc:' + r.P.color + '"><span class="an">' + r.n + '. ' + esc(r.P.name) + '</span>' +
          '<span class="track"><i class="fill" style="width:' + bar(r.avg) + '%"></i>' + (pv != null ? '<i class="prev" style="inset-inline-start:' + bar(pv) + '%" title="מדידה קודמת: ' + pv + '"></i>' : '') + '</span>' +
          '<b class="av">' + (r.avg == null ? '—' : r.avg) + '</b>' + (pv != null ? '<small class="pv">קודם ' + pv + '</small>' : '') + '</div>';
      }).join('') + '<div class="scale"><span></span><span>1</span><span>2</span><span>3</span><span>4</span></div></div>' +
      '<h3>התפלגות הרמות</h3><div class="dist">' + s.pr.map(function (r) {
        return '<div class="drow"><span class="an">' + r.n + '. ' + esc(r.P.name) + '</span><span class="stack">' +
          [1, 2, 3, 4, 0].map(function (l) { return r.d[l] ? '<i class="sg s' + l + '" style="flex:' + r.d[l] + '" title="' + (l ? LV[l - 1] : 'טרם מולא') + ': ' + r.d[l] + '">' + r.d[l] + '</i>' : ''; }).join('') + '</span></div>';
      }).join('') + '<div class="dlegend">' + [1, 2, 3, 4].map(function (l) { return '<span><i class="sg s' + l + '"></i>' + LV[l - 1] + '</span>'; }).join('') + '<span><i class="sg s0"></i>טרם מולא</span></div></div>' +
      '<div class="two"><div class="col"><h3>' + IC.l3 + ' עוגנים שכבר פועלים בעקביות</h3>' + (strong.length ? '<ul class="plist">' + strong.map(function (x) { return '<li style="--pc:' + x.r.P.color + '"><span>' + esc(x.it.name) + '</span><em>' + LV[x.it.l - 1] + '</em></li>'; }).join('') + '</ul>' : '<p class="muted">עדיין אין פרקטיקות ברמה "פועל באופן עקבי" או "מומחים".</p>') + '</div>' +
      '<div class="col"><h3>' + IC.l1 + ' עדיין בדרך — מועמדים למוקדי צמיחה</h3>' + (grow.length ? '<ul class="plist">' + grow.map(function (x) { return '<li style="--pc:' + x.r.P.color + '"><span>' + esc(x.it.name) + '</span><em>' + LV[x.it.l - 1] + '</em></li>'; }).join('') + '</ul>' : '<p class="muted">אין כרגע פרקטיקות ברמות "מתחילים לגלות" או "מתנסים ומדייקים".</p>') + '</div></div>' +
      '<h3>הפרופיל המלא</h3>' + s.pr.map(function (r, i) {
        return '<details class="prof" style="--pc:' + r.P.color + '"><summary><b>' + r.n + '. ' + esc(r.P.name) + '</b><span>' + (r.avg == null ? 'טרם דורג' : 'ממוצע ' + r.avg) + '</span></summary><table><thead><tr><th>פרקטיקה</th><th>הרמה שלנו</th>' + (pm ? '<th>' + esc(pm.label) + '</th>' : '') + '</tr></thead><tbody>' +
          r.items.map(function (it) { var pl = ps ? ps.pr[i].items[it.i].l : 0; return '<tr><td>' + esc(it.name) + '</td><td>' + (it.l ? '<span class="lt l' + it.l + '">' + IC['l' + it.l] + LV[it.l - 1] + '</span>' : '<span class="muted">טרם מולא</span>') + '</td>' + (pm ? '<td>' + (pl ? LV[pl - 1] : '—') + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table></details>';
      }).join('') +
      helpList() +
      '<div class="actions"><button class="btn" data-print="1">' + IC.print + ' הדפסה / PDF</button><button class="btn primary" data-go="plan">לתוכנית הפעולה ' + IC.next + '</button></div></section>';
  }
  function helpList() {
    var h = C.principles.map(function (P, i) { return { P: P, v: val(K('help', i + 1)) }; }).filter(function (x) { return x.v.trim(); });
    if (!h.length) return '';
    return '<h3>גשר לשותפות — במה נשמח לעזרה</h3><ul class="helps">' + h.map(function (x) { return '<li style="--pc:' + x.P.color + '"><b>' + esc(x.P.name) + '</b><span>' + esc(x.v) + '</span></li>'; }).join('') + '</ul>';
  }

  /* ---------- תוכנית פעולה ---------- */
  function vPlan() {
    var idea = val('story.idea');
    return '<section class="card plan"><p class="eyebrow">העמקה ופעולה</p><h2>תוכנית פעולה</h2><p class="lead">' + esc(C.plan.sub) + '</p>' +
      '<p class="note anchor">' + IC.anchor + '<span>' + esc(noIcon(C.plan.anchor)) + (idea ? '<br><b>הרעיון המאחד שלנו:</b> ' + esc(idea) : '') + '</span></p>' +
      [0, 1, 2].map(planRow).join('') +
      '<p class="note">' + IC.help + '<span>' + esc(noIcon(C.plan.help)) + '</span></p>' +
      '<div class="actions"><button class="btn" data-go="summary">' + IC.prev + ' תמונת מצב</button><button class="btn primary" data-print="1">' + IC.print + ' הדפסה / PDF</button></div></section>';
  }
  function planRow(r) {
    var k = K('plan', r), o = jval(k, {}), pn = +o.p || 0, P = pn ? C.principles[pn - 1] : null, qi = o.q === undefined || o.q === '' ? -1 : +o.q;
    var curL = P && qi >= 0 ? +val(K('lv', pn + '.' + qi)) : 0;
    var tools = P && qi >= 0 ? P.practices[qi].tools : [];
    return '<fieldset class="prow" data-pk="' + k + '"' + (P ? ' style="--pc:' + P.color + '"' : '') + '><legend>פרקטיקה ' + (r + 1) + '</legend>' +
      '<div class="grid2"><label class="fld"><span>העיקרון</span><select class="inp pf" data-f="p"><option value="">בחרו…</option>' + C.principles.map(function (p, i) { return '<option value="' + (i + 1) + '"' + (pn === i + 1 ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(p.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld"><span>הפרקטיקה</span><select class="inp pf" data-f="q"' + (P ? '' : ' disabled') + '><option value="">בחרו…</option>' + (P ? P.practices.map(function (x, i) { return '<option value="' + i + '"' + (qi === i ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') : '') + '</select></label></div>' +
      '<div class="grid2"><div class="fld"><span>רמה נוכחית</span><p class="ro">' + (curL ? '<span class="lt l' + curL + '">' + IC['l' + curL] + LV[curL - 1] + '</span>' : '<span class="muted">' + (P && qi >= 0 ? 'טרם דורגה במצפן' : '—') + '</span>') + '</p></div>' +
      '<label class="fld"><span>רמת יעד</span><select class="inp pf" data-f="target"><option value="">בחרו…</option>' + LV.map(function (l, i) { return '<option value="' + (i + 1) + '"' + (+o.target === i + 1 ? ' selected' : '') + '>' + l + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="fld"><span>מה נעשה? (צעדים קונקרטיים)</span><textarea class="inp pf" data-f="steps" rows="3">' + esc(o.steps || '') + '</textarea></label>' +
      '<label class="fld"><span>מה יעיד שהתקדמנו?</span><textarea class="inp pf" data-f="sign" rows="2" placeholder="נתון בשאלון אח&quot;מ, סדירות חדשה, תוצר לקהילה…">' + esc(o.sign || '') + '</textarea></label>' +
      '<div class="grid2"><label class="fld"><span>אחראי/ת</span><input class="inp pf" data-f="owner" value="' + esc(o.owner || '') + '"></label>' +
      '<label class="fld"><span>לו"ז ונקודת בדיקה</span><input class="inp pf" data-f="when" value="' + esc(o.when || '') + '"></label></div>' +
      '<label class="fld"><span>איזו עזרה נדרשת — וממי?</span><textarea class="inp pf" data-f="help" rows="2">' + esc(o.help || '') + '</textarea></label>' +
      (tools.length ? '<div class="tools mini"><p class="tools-h">כלים מהחוברת</p><ul>' + tools.map(function (t) { return '<li><a href="' + esc(t.u) + '" target="_blank" rel="noopener">' + esc(t.t) + IC.link + '</a></li>'; }).join('') + '</ul></div>' : '') +
      '</fieldset>';
  }

  /* ---------- דוח להדפסה ---------- */
  function printReport() {
    var cur = meas().filter(function (x) { return x.id === S.mid; })[0] || {}, s = stats(S.mid);
    var plans = [0, 1, 2].map(function (r) { return jval(K('plan', r), null); }).filter(function (o) { return o && o.p; });
    var h = '<div class="rep"><header class="rep-h"><img src="assets/logo-minhal.png" alt="משרד העבודה · מינהל הכשרה מקצועית"><div><h1>מצפן החינוך היוצר</h1><p>' + esc(S.school) + ' · ' + esc(cur.label || '') + '</p></div></header>';
    if (val('story.idea')) h += '<p class="rep-idea"><b>הרעיון המאחד:</b> ' + esc(val('story.idea')) + '</p>';
    h += '<h2>תמונת מצב</h2><table class="rep-t"><thead><tr><th>עיקרון</th><th>ממוצע</th>' + LV.map(function (l) { return '<th>' + l + '</th>'; }).join('') + '<th>טרם מולא</th></tr></thead><tbody>' +
      s.pr.map(function (r) { return '<tr><td>' + r.n + '. ' + esc(r.P.name) + '</td><td>' + (r.avg == null ? '—' : r.avg) + '</td>' + [1, 2, 3, 4, 0].map(function (l) { return '<td>' + r.d[l] + '</td>'; }).join('') + '</tr>'; }).join('') +
      '<tr class="tot"><td>סה"כ בית ספרי</td><td>' + (s.avg == null ? '—' : s.avg) + '</td>' + [1, 2, 3, 4, 0].map(function (l) { return '<td>' + s.tot[l] + '</td>'; }).join('') + '</tr></tbody></table>';
    h += s.pr.map(function (r) { return '<h3>' + r.n + '. ' + esc(r.P.name) + '</h3><table class="rep-t sm"><tbody>' + r.items.map(function (it) { var ev = val('m:' + S.mid + ':ev:' + r.n + '.' + it.i); return '<tr><td>' + esc(it.name) + '</td><td>' + (it.l ? LV[it.l - 1] : '—') + '</td><td>' + esc(ev) + '</td></tr>'; }).join('') + '</tbody></table>' + (val(K('help', r.n)) ? '<p class="rep-help"><b>במה נשמח לעזרה:</b> ' + esc(val(K('help', r.n))) + '</p>' : ''); }).join('');
    if (plans.length) h += '<h2>תוכנית פעולה</h2>' + plans.map(function (o) { var P = C.principles[o.p - 1], x = o.q !== '' && o.q != null ? P.practices[+o.q] : null, cl = x ? +val(K('lv', o.p + '.' + o.q)) : 0; return '<div class="rep-plan"><h3>' + esc(x ? x.name : P.name) + ' <small>(' + esc(P.name) + ')</small></h3><p><b>רמה נוכחית:</b> ' + (cl ? LV[cl - 1] : '—') + ' · <b>רמת יעד:</b> ' + (o.target ? LV[o.target - 1] : '—') + '</p>' + [['steps', 'מה נעשה'], ['sign', 'מה יעיד שהתקדמנו'], ['owner', 'אחראי/ת'], ['when', 'לו"ז ונקודת בדיקה'], ['help', 'איזו עזרה נדרשת']].map(function (f) { return o[f[0]] ? '<p><b>' + f[1] + ':</b> ' + esc(o[f[0]]) + '</p>' : ''; }).join('') + '</div>'; }).join('');
    h += '<p class="rep-foot">המצפן אינו כלי שיפוטי — הוא מפת דרכים לצמיחה. · נבנה על ידי impactos · impactos.co.il</p></div>';
    var box = $('#printBox'); box.innerHTML = h;
    document.body.classList.add('printing');
    setTimeout(function () { window.print(); }, 250);
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('printing'); });

  /* ---------- אירועים ---------- */
  function bind() {
    var main = $('#app');
    $$('[data-go]', main).forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-go'), 0); }; });
    $$('[data-qi]', main).forEach(function (b) { b.onclick = function () { flush(); S.qi = +b.getAttribute('data-qi'); store('mz_step', JSON.stringify({ step: S.step, qi: S.qi })); render(); var c = $('.card', main); if (c && c.getBoundingClientRect().top < 0) window.scrollTo(0, 0); }; });
    $$('[data-gopers]', main).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); S.ppi = +a.getAttribute('data-gopers'); go('personal', 0); }; });
    $$('[data-ppi]', main).forEach(function (b) { b.onclick = function () { flush(); S.ppi = +b.getAttribute('data-ppi'); render(); }; });
    $$('[data-print]', main).forEach(function (b) { b.onclick = function () { flush(); printReport(); }; });
    $$('[data-lv]', main).forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-lv'), v = +b.getAttribute('data-v'), cur = +val(k);
        put(k, cur === v ? '' : v, true);
        var y = window.scrollY; render(); window.scrollTo(0, y);
      };
    });
    $$('.inp[data-k]', main).forEach(function (el) {
      el.addEventListener('input', function () {
        put(el.getAttribute('data-k'), el.value);
        if (/:ev:/.test(el.getAttribute('data-k'))) { var h = $('.evhint', main), lvk = el.getAttribute('data-k').replace(':ev:', ':lv:'); if (h) h.hidden = !(val(lvk) && !el.value.trim()); }
      });
    });
    var mine = $('.mine', main);
    if (mine) {
      var k = mine.getAttribute('data-pk');
      var save = function () {
        var o = { name: $('.pn', mine).value.trim(), a: $$('.pa', mine).map(function (t) { return t.value; }), ins: $('.pi', mine).value };
        store('mz_name', o.name); put(k, JSON.stringify(o));
      };
      $$('input,textarea', mine).forEach(function (el) { el.addEventListener('input', save); });
    }
    $$('.prow', main).forEach(function (fs) {
      var k = fs.getAttribute('data-pk');
      $$('.pf', fs).forEach(function (el) {
        var ev = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(ev, function () {
          var o = jval(k, {}); o[el.getAttribute('data-f')] = el.value;
          if (el.getAttribute('data-f') === 'p') o.q = '';
          put(k, JSON.stringify(o), el.tagName === 'SELECT');
          if (el.tagName === 'SELECT') { var y = window.scrollY; render(); window.scrollTo(0, y); }
        });
      });
    });
  }

  /* ---------- עזרה ---------- */
  function helpLink() {
    var a = $('#helpBtn'); if (!a) return;
    var sub = 'מצפן החינוך היוצר — נתקלתי בבעיה', body = 'בית הספר: ' + (S.school || store('mz_school') || '') + '\nמה ניסיתי לעשות:\n\nמה קרה:\n';
    a.href = 'mailto:merhav@pedagogiamh.co.il?subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(body);
  }
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#helpBtn')) helpLink(); }, true);

  /* ---------- הפעלה ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    if (API.isMock) document.body.classList.add('is-mock');
    helpLink();
    var t = store('mz_t'), s = store('mz_school');
    if (t && s) { S.t = t; S.school = s; start(); } else showLogin('');
  });
})();
