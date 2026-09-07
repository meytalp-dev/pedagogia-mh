/* ===== sbjtabs.js — כרטיסיות (טאבים) =====
   הועתק מ-bagrut.html כדי שיהיה רכיב אחד לכל האתר.
   שימוש: .sbjtabs עם כפתורי .sbjtab[data-sp], ו-.sbjpanel עם אותו id. */
/* ===== כרטיסיות תחומי הדעת במדור "חומרי למידה מהרשת" ===== */
(function subjectTabs(){
  var bar=document.querySelector('.sbjtabs'); if(!bar) return;
  var tabs=[].slice.call(bar.querySelectorAll('.sbjtab'));

  function show(id,scroll){
    tabs.forEach(function(t){
      var on=(t.dataset.sp===id);
      t.setAttribute('aria-selected',on?'true':'false');
      t.tabIndex=on?0:-1;
      t.classList.toggle('on',on);
    });
    document.querySelectorAll('.sbjpanel').forEach(function(pn){
      var on=(pn.id===id);
      pn.hidden=!on;
      pn.classList.toggle('on',on);
      /* אלמנטים מוסתרים לא נחשפים בגלילה — משחררים אותם */
      if(on) pn.querySelectorAll('.sr').forEach(function(el){ el.classList.add('in'); });
    });
    if(scroll){
      var navh=(document.querySelector('.nav')||{}).offsetHeight||64;
      var top=bar.getBoundingClientRect().top+window.scrollY-navh-14;
      if(window.scrollY>top) window.scrollTo({top:top,behavior:'smooth'});
    }
  }

  bar.addEventListener('click',function(e){
    var b=e.target.closest('.sbjtab'); if(!b) return;
    show(b.dataset.sp,true);
  });

  /* ניווט מקלדת בין הכרטיסיות — חיצים, Home ו-End (RTL: ימין = הקודם) */
  bar.addEventListener('keydown',function(e){
    var i=tabs.indexOf(document.activeElement); if(i<0) return;
    var n=null;
    if(e.key==='ArrowLeft')      n=(i+1)%tabs.length;
    else if(e.key==='ArrowRight')n=(i-1+tabs.length)%tabs.length;
    else if(e.key==='Home')      n=0;
    else if(e.key==='End')       n=tabs.length-1;
    if(n===null) return;
    e.preventDefault(); tabs[n].focus(); show(tabs[n].dataset.sp,false);
  });

  /* קישור ישיר לתחום דעת: bagrut.html#sbjp-matematika */
  function fromHash(){
    var id=location.hash.slice(1);
    if(id && document.getElementById(id) && /^sbjp-/.test(id)) show(id,true);
  }
  fromHash(); window.addEventListener('hashchange',fromHash);

  /* החיפוש הפנימי מגיע ללינק שמוסתר בכרטיסייה סגורה — פותחים אותה */
  document.addEventListener('click',function(e){
    var a=e.target.closest('a[href^="#"]'); if(!a) return;
    var t=document.getElementById(a.getAttribute('href').slice(1));
    var pn=t&&t.closest?t.closest('.sbjpanel'):null;
    if(pn&&pn.hidden) show(pn.id,false);
  });
})();
