/* משותף לכל עמודי הבית של המנהיגות הפדגוגית היוצרת */
function toggleMenu(open){document.body.classList.toggle('menu-open',open)}

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

/* תמונות רצות "מהשטח" — crossfade בין התמונות שבתוך .fieldshow, כולל החלפת כיתוב */
(function fieldShows(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.fieldshow').forEach(box=>{
    const imgs=[...box.querySelectorAll('img')];
    if(imgs.length<2) return;
    const cap=box.dataset.capTarget ? document.querySelector(box.dataset.capTarget) : null;
    if(cap) cap.style.transition='opacity .35s ease';
    let i=Math.max(0,imgs.findIndex(im=>im.classList.contains('on'))), paused=false;
    box.addEventListener('pointerenter',()=>paused=true);
    box.addEventListener('pointerleave',()=>paused=false);
    setInterval(()=>{
      if(paused||document.hidden) return;
      imgs[i].classList.remove('on');
      i=(i+1)%imgs.length;
      imgs[i].classList.add('on');
      if(cap&&imgs[i].dataset.cap){
        cap.style.opacity=0;
        setTimeout(()=>{cap.textContent=imgs[i].dataset.cap;cap.style.opacity=1},350);
      }
    }, +(box.dataset.interval||6000));
  });
})();

/* מתג שפה עברית/ערבית — תרגום Google בתוך העמוד, מופעל רק כשנבחרה ערבית */
(function langSwitch(){
  const m=document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
  const isAr=/\/ar$/.test(m?decodeURIComponent(m[1]):'');
  function setLang(ar){
    const domains=['','; domain='+location.hostname,'; domain=.'+location.hostname.replace(/^www\./,'')];
    domains.forEach(d=>{
      document.cookie='googtrans='+(ar?'/iw/ar':'')+'; path=/'+d+(ar?'':'; expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });
    location.reload();
  }
  const holder=document.querySelector('.govbar .left');
  if(holder){
    const sw=document.createElement('span');
    sw.className='langsw';
    sw.innerHTML='<button type="button" data-lang="he"'+(isAr?'':' class="on"')+'>עברית</button>'+
                 '<span class="lsep">|</span>'+
                 '<button type="button" data-lang="ar" lang="ar"'+(isAr?' class="on"':'')+'>العربية</button>';
    const old=[...holder.querySelectorAll('a.dis')].find(a=>a.textContent.trim()==='العربية');
    if(old) old.replaceWith(sw); else holder.appendChild(sw);
    sw.addEventListener('click',e=>{
      const b=e.target.closest('button');
      if(b && (b.dataset.lang==='ar')!==isAr) setLang(b.dataset.lang==='ar');
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
