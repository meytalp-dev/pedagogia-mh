/* =========================================================
   סינון תוכן לפי קטגוריות — משותף ל-career.html ול-chanichut.html
   מבנה נדרש בעמוד:
     .catcard[data-cat]      כרטיס בשער הקטגוריות
     #catbar .cpill[data-cat] פיל בפס הסינון ("all" = הכול)
     section.cat-panel[data-cat]  פאנל התוכן
     .cgo[data-goto] / a.cgo-lnk[data-goto]  מעבר לקטגוריה
   אופציונלי: #catbar[data-default="all"] כדי לפתוח בתצוגת הכול
   ========================================================= */
(function catTabs(){
  var panels=[].slice.call(document.querySelectorAll('.cat-panel'));
  if(!panels.length) return;
  var pills=[].slice.call(document.querySelectorAll('.cpill'));
  var cards=[].slice.call(document.querySelectorAll('.catcard'));
  var bar  =document.getElementById('catbar');
  var nav  =document.querySelector('.nav');

  /* גובה הניווט הדביק — כדי שפס הקטגוריות ייתפס בדיוק מתחתיו */
  function navH(){
    if(!nav) return 66;
    var h=nav.offsetHeight||66;
    document.documentElement.style.setProperty('--navh',h+'px');
    return h;
  }
  navH();
  addEventListener('resize',navH,{passive:true});

  var valid={all:1};
  panels.forEach(function(p){valid[p.dataset.cat]=1});
  var first=(bar&&bar.dataset.default)||panels[0].dataset.cat;
  var booted=false;

  function show(cat,scroll,target){
    if(!valid[cat]) cat=first;
    panels.forEach(function(p){
      var on=(cat==='all'||p.dataset.cat===cat);
      p.hidden=!on;
      if(on&&booted){
        /* משחררים אלמנטים שננעלו על ידי חשיפת-הגלילה של site.js */
        [].slice.call(p.querySelectorAll('.sr')).forEach(function(el){el.classList.add('in')});
        p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop');
      }
    });
    pills.forEach(function(b){
      var on=b.dataset.cat===cat;
      b.classList.toggle('on',on);
      b.setAttribute('aria-selected',on?'true':'false');
    });
    cards.forEach(function(c){c.classList.toggle('on',c.dataset.cat===cat)});

    try{
      history.replaceState(null,'',cat==='all'?location.pathname:'#'+(target||cat));
    }catch(e){}

    if(scroll){
      var anchor=(target&&document.getElementById(target))||bar;
      if(anchor){
        var y=anchor.getBoundingClientRect().top+scrollY-navH()-(anchor===bar?6:56);
        scrollTo({top:y,behavior:'smooth'});
      }
    }
  }

  pills.forEach(function(b){b.addEventListener('click',function(){show(b.dataset.cat,true)})});
  cards.forEach(function(c){c.addEventListener('click',function(){show(c.dataset.cat,true)})});
  [].slice.call(document.querySelectorAll('.cgo,.cgo-lnk')).forEach(function(b){
    b.addEventListener('click',function(e){e.preventDefault();show(b.dataset.goto,true)});
  });

  /* פענוח עוגן: שם קטגוריה, או id של אלמנט כלשהו בתוך פאנל */
  function resolve(key){
    if(!key) return null;
    if(valid[key]) return {cat:key};
    var el=document.getElementById(key);
    var p=el&&el.closest?el.closest('.cat-panel'):null;
    if(p) return {cat:p.dataset.cat,target:(p.id===key?null:key)};
    return null;
  }

  var h=(location.hash||'').replace('#','');
  var r=resolve(h);
  show(r?r.cat:first, !!r, r&&r.target);
  booted=true;

  addEventListener('hashchange',function(){
    var k=(location.hash||'').replace('#','');
    var res=resolve(k);
    if(res) show(res.cat,true,res.target);
  });
})();
