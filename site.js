/* משותף לכל עמודי המרכז הפדגוגי */
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
