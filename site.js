/* משותף לכל עמודי הבית של המנהיגות הפדגוגית היוצרת */
/* ===== תפריט המגירה =====
   toggleMenu נקראת מתוך onclick בכל 151 עמודי האתר (ההמבורגר, ה-X, הרקע המעומעם)
   ולכן היא נשארת גלובלית עם אותה חתימה בדיוק. מה שנוסף מסביבה:
   inert + aria-expanded, העברת פוקוס לתוך המגירה ובחזרה לכפתור שפתח,
   לכידת Tab בתוך המגירה הפתוחה וסגירה ב-Escape.
   ההסתרה עצמה נעשית ב-CSS (visibility ב-.drawer) כדי שהמגירה תהיה סגורה
   ולא ממוקדת עוד לפני שהסקריפט הזה בכלל רץ. אותו דפוס כמו התפריט של pagenav.js. */
(function drawerMenu(){
  var lastTrigger=null;

  function drawer(){return document.querySelector('.drawer')}
  function burger(){return document.querySelector('.burger')}
  function isOpen(){return document.body.classList.contains('menu-open')}
  function focusables(d){
    return [].slice.call(d.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(function(el){return el.offsetWidth||el.offsetHeight||el.getClientRects().length});
  }
  /* מסנכרן inert/aria למצב בפועל — נקרא גם בטעינה, כדי שהמגירה הסגורה
     תצא מסדר ה-Tab ומקורא המסך כבר ברגע הראשון */
  function sync(){
    var d=drawer(), b=burger(), open=isOpen();
    if(d){ if(open) d.removeAttribute('inert'); else d.setAttribute('inert',''); }
    if(b) b.setAttribute('aria-expanded',open?'true':'false');
  }

  window.toggleMenu=function(open){
    var d=drawer(), b=burger();
    var want=(open===undefined)?!isOpen():!!open;
    if(want===isOpen()){ sync(); return; }
    if(want) lastTrigger=(document.activeElement&&document.activeElement!==document.body)?document.activeElement:null;
    document.body.classList.toggle('menu-open',want);
    sync();
    if(!d) return;
    if(want){
      var f=focusables(d);
      if(f.length){
        f[0].focus();
        /* רשת ביטחון: אם דפדפן כלשהו עדיין לא סיים לעדכן את ה-visibility,
           ה-focus הראשון נופל בשקט — מנסים שוב אחרי שהסגנון חושב מחדש */
        if(document.activeElement!==f[0]) requestAnimationFrame(function(){
          requestAnimationFrame(function(){ if(isOpen()) f[0].focus(); });
        });
      }
    } else {
      var back=(lastTrigger&&document.contains(lastTrigger))?lastTrigger:b;
      var a=document.activeElement;
      if(back&&(!a||a===document.body||d.contains(a))) back.focus();
      lastTrigger=null;
    }
  };

  document.addEventListener('keydown',function(e){
    if(!isOpen()) return;
    if(e.key==='Escape'||e.key==='Esc'){ e.preventDefault(); window.toggleMenu(false); return; }
    if(e.key!=='Tab') return;
    var d=drawer(); if(!d) return;
    var a=document.activeElement;
    /* לוכדים רק כשהפוקוס כבר בתוך המגירה או על ההמבורגר — כדי לא להיאבק
       על הפוקוס עם חלון החיפוש או עם הוויג'ט של העוגן */
    if(!(d.contains(a)||a===burger())) return;
    var f=focusables(d); if(!f.length) return;
    var first=f[0], last=f[f.length-1];
    if(e.shiftKey&&(a===first||a===burger())){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey&&a===last){ e.preventDefault(); first.focus(); }
  });

  sync();
})();

/* ===== קיפול מדורי המגירה =====
   94 קישורים ב-11 מדורים הם ארבעה עד חמישה מסכי גלילה בנייד —
   מדור השירותים, שבו ארגז הכלים ועוגן, מתחיל אחרי 78 קישורים.
   הסדר והתוכן לא משתנים — רק מדור סגור מתכווץ לשורה אחת.
   המדור של העמוד הנוכחי נפתח לבד. מדור סגור מקבל hidden
   ולכן יוצא מסדר ה-Tab ומקורא המסך, בדיוק כמו המגירה עצמה. */
(function drawerSections(){
  var body=document.querySelector('.drawer .body');
  if(!body) return;
  var sects=[].slice.call(body.children).filter(function(el){
    return el.classList && el.classList.contains('sect');
  });
  if(sects.length<4) return;

  var here=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  var groups=[];

  sects.forEach(function(sect,i){
    var panel=document.createElement('div');
    panel.className='dgroup';
    panel.id='dgrp-'+(i+1);
    var n=sect.nextSibling;
    while(n && !(n.nodeType===1 && n.classList && n.classList.contains('sect'))){
      var next=n.nextSibling;
      panel.appendChild(n);
      n=next;
    }
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='dsect';
    btn.setAttribute('aria-controls',panel.id);
    var label=document.createElement('span');
    label.textContent=sect.textContent;
    btn.appendChild(label);
    btn.insertAdjacentHTML('beforeend',
      '<svg class="dcaret" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" '+
      'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '+
      'stroke-linejoin="round"><path d="M4 6.5 8 10.5 12 6.5"/></svg>');
    sect.parentNode.replaceChild(btn,sect);
    btn.parentNode.insertBefore(panel,btn.nextSibling);
    groups.push({btn:btn,panel:panel});
  });

  function setOpen(g,open){
    g.panel.hidden=!open;
    g.btn.setAttribute('aria-expanded',open?'true':'false');
  }

  /* המדור שמכיל את העמוד הנוכחי — ואם אין כזה, הראשון */
  var active=-1;
  groups.forEach(function(g,i){
    if(active>-1) return;
    var hit=[].slice.call(g.panel.querySelectorAll('a[href]')).some(function(a){
      var h=(a.getAttribute('href')||'').split('#')[0].split('/').pop().toLowerCase();
      return h && h===here;
    });
    if(hit) active=i;
  });
  if(active<0) active=0;
  groups.forEach(function(g,i){ setOpen(g,i===active); });

  body.addEventListener('click',function(e){
    var btn=e.target.closest?e.target.closest('.dsect'):null;
    if(!btn) return;
    var g=groups.filter(function(x){return x.btn===btn})[0];
    if(!g) return;
    setOpen(g,g.panel.hidden);
  });
})();

(function animateCounters(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.num-count').forEach(el=>{
    const target=parseInt(el.dataset.count,10), suffix=el.dataset.suffix||'';
    const t0=performance.now(), dur=900;
    function tick(t){
      const p=Math.min((t-t0)/dur,1), eased=1-Math.pow(1-p,3);
      el.textContent=Math.round(target*eased).toLocaleString('he-IL')+suffix;
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
})();

/* פס התקדמות גלילה — הגרדיאנט הצבעוני של מצגת המנהלים, נבנה בכל עמוד ארוך */
(function pageBar(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const bar=document.createElement('div'); bar.id='pagebar'; bar.setAttribute('aria-hidden','true');
  document.body.appendChild(bar);
  let ticking=false;
  function update(){
    ticking=false;
    const max=document.documentElement.scrollHeight-innerHeight;
    bar.style.width=(max>200 ? (scrollY/max)*100 : 0)+'%';
  }
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update)}},{passive:true});
  update();
})();

/* חשיפה בגלילה — אלמנטים שמתחת לקו המסך נכנסים באנימציית המצגת (rise עם blur / cardIn) */
(function scrollReveal(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const els=[...document.querySelectorAll('.card,.rv,.mokad,.linkcard,.tipcard,.row,.p-row,.cy-step')]
    .filter(el=>el.getBoundingClientRect().top>innerHeight*.92);
  if(!els.length) return;
  document.documentElement.classList.add('sr-on');
  const byParent=new Map();
  els.forEach(el=>{
    const n=byParent.get(el.parentElement)||0;
    el.style.setProperty('--d',Math.min(n*70,350)+'ms');
    byParent.set(el.parentElement,n+1);
    el.classList.add('sr');
  });
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}});
  },{rootMargin:'0px 0px -7% 0px',threshold:.05});
  els.forEach(el=>io.observe(el));
})();

/* בסיום אנימציית כניסה משחררים אותה — אחרת fill:both נועל את ה-transform וחוסם את ה-hover */
document.addEventListener('animationend',e=>{
  const el=e.target;
  if(!(el instanceof Element)) return;
  if(e.animationName==='rise'||e.animationName==='cardIn'){
    el.classList.remove('sr','in');
    el.style.animation='none';
  }
});

/* תמונות רצות "מהשטח" — crossfade בין התמונות שבתוך .fieldshow, כולל החלפת כיתוב.
   WCAG 2.2.2 (רמה A): להחלפה אוטומטית חייבת להיות דרך עצירה. ריחוף עכבר לבדו
   לא קיים בנייד ולא במקלדת, ולכן מוזרק כאן כפתור השהיה/הפעלה אמיתי.
   מי שביקש "פחות תנועה" מקבל את הקרוסלה עצורה מלכתחילה — עם כפתור להפעלה ידנית.
   הטיימר נעצר באמת (clearInterval) כשהקרוסלה יוצאת מהמסך, כשהלשונית מוסתרת
   וב-pagehide, ולא ממשיך לרוץ לריק כמו קודם. */
(function fieldShows(){
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  /* אייקוני קו, currentColor, עובי 1.8 — כמו שאר האייקונים באתר */
  const ICON={
    pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5v14"/><path d="M14.5 5v14"/></svg>',
    play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2 18.5 12 8 18.8Z"/></svg>'
  };
  document.querySelectorAll('.fieldshow').forEach(box=>{
    const imgs=[...box.querySelectorAll('img')];
    if(imgs.length<2) return;
    const cap=box.dataset.capTarget ? document.querySelector(box.dataset.capTarget) : null;
    if(cap) cap.style.transition='opacity .35s ease';
    const delay=+(box.dataset.interval||6000);
    let i=Math.max(0,imgs.findIndex(im=>im.classList.contains('on')));
    let timer=null, capTimer=null, hovered=false, offscreen=false, io=null;
    let playing=!reduce.matches;

    const btn=document.createElement('button');
    btn.type='button';
    btn.className='fieldshow-toggle';
    box.appendChild(btn);

    function advance(){
      /* אם הקרוסלה הוסרה מהמסמך — עוצרים ומשחררים את ההפניה אליה */
      if(!box.isConnected){ clearInterval(timer); timer=null; clearTimeout(capTimer); if(io) io.disconnect(); return; }
      if(hovered) return;
      imgs[i].classList.remove('on');
      i=(i+1)%imgs.length;
      imgs[i].classList.add('on');
      if(cap&&imgs[i].dataset.cap){
        cap.style.opacity=0;
        clearTimeout(capTimer);
        capTimer=setTimeout(()=>{cap.textContent=imgs[i].dataset.cap;cap.style.opacity=1},350);
      }
    }
    function sync(){
      const run=playing&&!offscreen&&!document.hidden;
      if(run&&!timer) timer=setInterval(advance,delay);
      else if(!run&&timer){ clearInterval(timer); timer=null; }
    }
    function render(){
      btn.innerHTML=playing?ICON.pause:ICON.play;
      const label=playing?'השהיית מצגת התמונות':'המשך מצגת התמונות';
      btn.setAttribute('aria-label',label);
      btn.title=label;
      sync();
    }
    btn.addEventListener('click',()=>{playing=!playing;render()});

    /* ריחוף העכבר נשאר כנוחות — אבל הוא כבר לא אמצעי העצירה היחיד */
    box.addEventListener('pointerenter',()=>hovered=true);
    box.addEventListener('pointerleave',()=>hovered=false);

    if('IntersectionObserver' in window){
      io=new IntersectionObserver(es=>{offscreen=!es[0].isIntersecting;sync()},{threshold:0});
      io.observe(box);
    }
    document.addEventListener('visibilitychange',sync);
    addEventListener('pagehide',()=>{playing=false;clearTimeout(capTimer);sync()});
    if(reduce.addEventListener) reduce.addEventListener('change',e=>{playing=!e.matches;render()});

    render();
  });
})();

/* מתג שפה עברית/ערבית — תרגום Google בתוך העמוד.
   ההעדפה נשמרת ב-sessionStorage (פר-לשונית) והעוגייה מסונכרנת אליה,
   כדי שערבית לא "תידבק" לצמיתות. אפשר גם לכפות שפה עם ?lang=he / ?lang=ar */
(function langSwitch(){
  const ss={
    get(k){try{return sessionStorage.getItem(k)}catch(e){return null}},
    set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}},
    del(k){try{sessionStorage.removeItem(k)}catch(e){}}
  };
  const domains=['','; domain='+location.hostname,'; domain=.'+location.hostname.replace(/^www\./,'')];
  function cookieIsAr(){
    const m=document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
    return /\/ar$/.test(m?decodeURIComponent(m[1]):'');
  }
  function writeCookie(ar){
    domains.forEach(d=>{
      document.cookie='googtrans='+(ar?'/iw/ar':'')+'; path=/'+d+(ar?'':'; expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });
  }

  /* 1. ?lang=he / ?lang=ar — דלת מילוט מפורשת */
  const forced=new URLSearchParams(location.search).get('lang');
  if(forced==='he'||forced==='ar'){
    ss.set('lang',forced); ss.del('langSyncTries'); writeCookie(forced==='ar');
    const u=new URL(location.href); u.searchParams.delete('lang');
    location.replace(u.pathname+u.search+u.hash); return;
  }

  /* 2. סנכרון העוגייה להעדפת הלשונית — מנקה עוגייה שנשארה מגלישה קודמת */
  const wantAr=ss.get('lang')==='ar';
  if(wantAr!==cookieIsAr()){
    writeCookie(wantAr);
    const tries=+(ss.get('langSyncTries')||0);
    if(tries<2){ ss.set('langSyncTries',tries+1); location.reload(); return; }
  } else { ss.del('langSyncTries'); }
  const isAr=wantAr&&cookieIsAr();

  /* 3. המתג עצמו */
  const holder=document.querySelector('.govbar .left');
  if(holder){
    const sw=document.createElement('span');
    sw.className='langsw';
    sw.setAttribute('role','group');
    sw.setAttribute('aria-label','שפת התצוגה');
    /* aria-pressed מספר לקורא המסך איזו שפה פעילה עכשיו — הצבע/המשקל לבדם לא נגישים */
    sw.innerHTML='<button type="button" data-lang="he" aria-pressed="'+(isAr?'false':'true')+'"'+(isAr?'':' class="on"')+'>עברית</button>'+
                 '<span class="lsep" aria-hidden="true">|</span>'+
                 '<button type="button" data-lang="ar" lang="ar" aria-pressed="'+(isAr?'true':'false')+'"'+(isAr?' class="on"':'')+'>العربية</button>';
    const old=[...holder.querySelectorAll('.dis')].find(a=>a.textContent.trim()==='العربية');
    if(old) old.replaceWith(sw); else holder.appendChild(sw);
    sw.addEventListener('click',e=>{
      const b=e.target.closest('button');
      if(!b) return;
      const ar=b.dataset.lang==='ar';
      if(ar===isAr) return;
      ss.set('lang',ar?'ar':'he'); ss.del('langSyncTries');
      writeCookie(ar); location.reload();
    });
  }

  if(!isAr) return;
  document.documentElement.classList.add('lang-ar');
  const box=document.createElement('div');
  box.id='google_translate_element'; box.style.display='none';
  document.body.appendChild(box);
  window.googleTranslateElementInit=function(){
    new google.translate.TranslateElement({pageLanguage:'iw',includedLanguages:'ar',autoDisplay:false},'google_translate_element');
  };
  const s=document.createElement('script');
  s.src='https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.body.appendChild(s);

  /* שפת המסמך חייבת להשתנות יחד עם התוכן (WCAG 3.1.1, רמה A):
     כל עוד documentElement.lang נשאר "he", קורא מסך מקריא את הערבית בקול עברי.
     Google Translate לא נוגע ב-lang בעצמו, ולכן מעדכנים כאן ידנית — אבל רק אחרי
     שהתרגום באמת הוחל (הווידג'ט מוסיף ל-html את translated-rtl/translated-ltr).
     בכוונה בלי timeout כגיבוי: אם התרגום נכשל, התוכן נשאר עברית ו-lang צריך
     להישאר he. חזרה לעברית לא מטופלת כאן — היא טוענת את העמוד מחדש נקי. */
  const html=document.documentElement;
  function markArabic(){
    if(html.lang==='ar') return;
    html.lang='ar';
    html.dir='rtl';
  }
  if(/\btranslated-(rtl|ltr)\b/.test(html.className)) markArabic();
  else if(window.MutationObserver){
    const mo=new MutationObserver(()=>{
      if(/\btranslated-(rtl|ltr)\b/.test(html.className)){ markArabic(); mo.disconnect(); }
    });
    mo.observe(html,{attributes:true,attributeFilter:['class']});
  }
})();

function openOgen(){
  const l=document.querySelector('.ogenw-launcher');
  if(l){
    toggleMenu(false);
    const p=document.querySelector('.ogenw-panel');
    if(!p||!p.classList.contains('ogenw-open')) l.click();
  } else {
    window.open('https://meytalp-dev.github.io/ogen/','_blank');
  }
}
document.querySelectorAll('.ogen-btn,.open-ogen').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openOgen()}));

/* סנכרון aria-expanded בתפריטי הפס העליון (נפתחים ב-hover/focus-within ב-CSS) */
(function navAria(){
  document.querySelectorAll(".navitem").forEach(function(it){
    var lnk = it.querySelector(".lnk[aria-haspopup]"); if(!lnk) return;
    lnk.setAttribute("aria-expanded","false");
    function set(v){ lnk.setAttribute("aria-expanded", v?"true":"false"); }
    it.addEventListener("mouseenter",function(){set(true)});
    it.addEventListener("mouseleave",function(){set(false)});
    it.addEventListener("focusin",function(){set(true)});
    it.addEventListener("focusout",function(){ if(!it.contains(document.activeElement)) set(false); });
  });
})();

/* ===== אזהרת תוכן מיושן (הצעת GPT · על תשתית תג השנה) =====
   כל עמוד תוכן נושא <meta name="pmh-year" content="תשפ״ז">. כשעמוד מתויג
   לשנה קודמת (כי הוחלף בגרסה חדשה), נזריק פס אזהרה בראש העמוד עם קישור
   לגרסה העדכנית — כדי שמנהל.ת שנחת.ה ישירות מגוגל/וואטסאפ על עמוד ישן
   ידע.ו מיד. אין מה לתחזק ידנית: הפס מופיע לבד ברגע ש-pmh-year משתנה.

   כדי לסמן עמוד כמיושן: לשנות את pmh-year לשנה הישנה (למשל "תשפ״ו").
   קישור לגרסה העדכנית (רשות): <meta name="pmh-current" content="URL">
   טקסט הקישור (רשות):        <meta name="pmh-current-label" content="...">
   בקיץ, כשמתחילה שנה חדשה — לעדכן את CURRENT_YEAR כאן (ובבדיקת ההתיישנות). */
(function () {
  var CURRENT_YEAR = 'תשפ״ז';
  var meta = document.querySelector('meta[name="pmh-year"]');
  if (!meta) return;
  var year = (meta.getAttribute('content') || '').trim();
  if (!year || year === CURRENT_YEAR) return;

  var cur = document.querySelector('meta[name="pmh-current"]');
  var curUrl = cur ? cur.getAttribute('content') : 'index.html';
  var lbl = document.querySelector('meta[name="pmh-current-label"]');
  var curLabel = (lbl && lbl.getAttribute('content')) || 'למידע העדכני לשנה הנוכחית';

  function build() {
    if (document.getElementById('pmh-stale')) return;
    var bar = document.createElement('div');
    bar.id = 'pmh-stale';
    bar.setAttribute('role', 'alert');
    bar.style.cssText = 'direction:rtl;text-align:center;background:#FDECEC;color:#8A1C13;' +
      'border-bottom:2px solid #E4A6A0;padding:10px 16px;font:600 .92rem/1.5 "Assistant","Noto Sans Hebrew",sans-serif;' +
      'display:flex;gap:8px 14px;align-items:center;justify-content:center;flex-wrap:wrap';
    bar.innerHTML =
      '<span><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px;margin-inline-end:5px">' +
      '<path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17h.01"/></svg>' +
      'תוכן זה מתייחס לשנת ' + year + ' ואינו בהכרח בתוקף לשנת ' + CURRENT_YEAR + '.</span>' +
      '<a href="' + curUrl + '" style="color:#0D3B66;font-weight:800;text-decoration:underline;white-space:nowrap">' +
      curLabel + ' ←</a>';
    document.body.insertBefore(bar, document.body.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
