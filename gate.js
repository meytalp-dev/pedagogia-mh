/* שער המרחב הפדגוגי — ניתוב רך של נחיתות ישירות.
   נטען ב-<head> של עמודי המרחב בלבד, לפני הרינדור, כדי שלא תהיה הבהוב.

   הכלל: מי שנוחת על עמוד פנימי מחוץ לאתר (וואטסאפ, גוגל, QR, סימנייה)
   ובאותו סשן עוד לא ראה את השער — מנותב פעם אחת ל-space.html?next=<העמוד>,
   ושם מחכה לו כפתור "המשך אל ...". ניווט פנימי באתר לא מנותב אף פעם.

   דלת מילוט: ?direct=1 בסוף הכתובת עוקף לחלוטין (לשימוש ב-QR ובקישורים
   שחייבים לפתוח את העמוד עצמו). זה ניתוב, לא אבטחה — האתר סטטי. */
(function(){
  var KEY='gateSeen';
  try{
    if(top!==self) return;                     /* בתוך iframe — לא נוגעים */
    if(/bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram/i
       .test(navigator.userAgent)) return;      /* מנועי חיפוש ותצוגות מקדימות */
    if(/[?&]direct=1\b/.test(location.search)){ sessionStorage.setItem(KEY,'1'); return; }
    if(sessionStorage.getItem(KEY)) return;

    var ref=document.referrer;
    if(ref){
      try{ if(new URL(ref).host===location.host){ sessionStorage.setItem(KEY,'1'); return; } }
      catch(e){ /* referrer לא תקין — מתייחסים אליו כאל חיצוני */ }
    }

    var here=location.pathname.split('/').pop();
    if(!here || here==='space.html') return;

    /* מסמנים לפני ההפניה: אחרי שראו את השער פעם אחת, הכול נפתח ישירות */
    sessionStorage.setItem(KEY,'1');
    location.replace('/space.html?next='+encodeURIComponent(here+location.search+location.hash));
  }catch(e){ /* sessionStorage חסום — לא מנתבים */ }
})();
