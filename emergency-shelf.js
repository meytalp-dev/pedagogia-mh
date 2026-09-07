/* מדף ההעשרה — למידה בחירום
   כל פריט נבדק ידנית (curl / דפדפן) בתאריך 7.9.2026 והחזיר 200.
   להוספת משאב: שורה אחת במערך SHELF. אין צורך לגעת ב-HTML.

   kind : live | course | video | tour | podcast | bank | guide
   time : short (עד ~15 ד') | lesson (שיעור שלם) | multi (כמה מפגשים ומעלה)
   who  : students | teacher | both
*/
(function () {
  'use strict';

  var KIND = {
    live:    { label: 'שיעור חי',      cls: 'k-live'  },
    course:  { label: 'קורס',          cls: 'k-course'},
    video:   { label: 'צפייה',         cls: 'k-video' },
    tour:    { label: 'סיור וירטואלי', cls: 'k-tour'  },
    podcast: { label: 'האזנה',         cls: 'k-pod'   },
    bank:    { label: 'מאגר מוכן',     cls: 'k-bank'  },
    guide:   { label: 'מדריך למורה',   cls: 'k-guide' }
  };

  var TIME = {
    short:  'עד 15 דקות',
    lesson: 'שיעור שלם',
    multi:  'כמה מפגשים'
  };

  var SHELF = [
    /* ===== שיעורים חיים — הדבר היחיד שנותן לתלמיד בבית מסגרת אמיתית ===== */
    {
      title: 'המקפצה — בית הספר הווירטואלי',
      url: 'https://my.edu.gov.il/',
      src: 'משרד החינוך', kind: 'live', time: 'multi', who: 'students',
      topic: ['ליבה', 'העשרה', 'מתמטיקה', 'אנגלית'],
      badge: 'חינם',
      desc: 'שיעורים חיים בקבוצות קטנות לכיתות ד׳–י״ב: מקצועות ליבה לצד סדנאות העשרה ומרתונים. תלמיד שנשאר בבית יכול להיכנס לשיעור עוד היום, בלי שהמורה תלמד אותו בעצמה.'
    },

    /* ===== קורסים מקוונים לתלמידים ===== */
    {
      title: '46 קורסים להכנה לבגרות',
      url: 'https://campus.gov.il/municipality/moe-2/',
      src: 'קמפוס IL', kind: 'course', time: 'multi', who: 'students',
      topic: ['בגרות', 'מתמטיקה', 'מדעים', 'מדעי המחשב'],
      badge: 'חינם',
      desc: 'מתמטיקה, ביולוגיה, כימיה, פיזיקה ומדעי המחשב. הכתובת הראשונה לשלוח אליה תלמיד שיש לו בגרות ואין לו שיעור.'
    },
    {
      title: '71 קורסים של משרד העבודה',
      url: 'https://campus.gov.il/institution/ministry-of-labor/',
      src: 'קמפוס IL', kind: 'course', time: 'multi', who: 'both',
      topic: ['תעסוקה', 'טכנולוגיה', 'ניהול', 'בריאות'],
      badge: 'שלנו',
      desc: 'הקורסים של המשרד שלנו: בינה מלאכותית, סייבר, תכנות, ניהול, סיעוד, הנדסה ומיומנויות תעסוקה. מתאים במיוחד לתלמידי י״א–י״ב בנתיבי החניכות.'
    },
    {
      title: 'הפסיכומטרי של המדינה',
      url: 'https://campus.gov.il/en/course/mse-gov-psychometry-he/',
      src: 'קמפוס IL', kind: 'course', time: 'multi', who: 'students',
      topic: ['בגרות', 'המשך לימודים'],
      badge: 'חינם',
      desc: 'קורס הכנה מלא ואינטראקטיבי, פתוח לכולם בלי תשלום ובלי ועדה. משימת חירום ארוכת־טווח לתלמיד י״ב שיושב בבית.'
    },
    {
      title: 'AI לשימוש בעבודה ובקריירה',
      url: 'https://campus.gov.il/course/digitalil-gov-ai2-he/',
      src: 'קמפוס IL', kind: 'course', time: 'multi', who: 'students',
      topic: ['בינה מלאכותית', 'תעסוקה'],
      badge: 'חינם',
      desc: 'בינה מלאכותית, אוטומציה וסוכני AI לייעול תהליכי עבודה. מיומנות תעסוקתית אמיתית — לא מילוי זמן.'
    },
    {
      title: 'קורסים וירטואליים לנוער',
      url: 'https://noar.tau.ac.il/hebrew_virtual_courses_syl',
      src: 'נוער שוחר מדע · אוניברסיטת תל אביב', kind: 'course', time: 'multi', who: 'students',
      topic: ['מדעים', 'העשרה', 'אקדמיה'],
      desc: 'קורסים אקדמיים מקוונים בעברית שנכתבו לבני נוער. העשרה ברמה גבוהה לתלמידים שרוצים יותר ממה שיש בכיתה.'
    },
    {
      title: 'קורסים מקוונים במדע',
      url: 'https://davidson.org.il/learn-experience/courses/',
      src: 'מכון דוידסון · מכון ויצמן', kind: 'course', time: 'lesson', who: 'students',
      topic: ['מדעים', 'העשרה'],
      badge: 'חינם',
      desc: 'מדע במטבח, מוח וזיכרון, גנטיקה, המדע שמאחורי הכדורגל — לצד חידות, אתגרים וניסויים שאפשר לעשות בבית עם מה שיש במטבח.'
    },
    {
      title: 'קטלוג הקורסים המלא',
      url: 'https://campus.gov.il/catalog/',
      src: 'קמפוס IL', kind: 'course', time: 'multi', who: 'both',
      topic: ['הכול'],
      desc: 'מאות קורסים, מסננים לפי נושא, משך ושפה — כולל ערבית, רוסית ואנגלית. מקור טוב למשימת העשרה שבועית שנשלחת פעם בשבוע.'
    },

    /* ===== סיורים וירטואליים ===== */
    {
      title: 'מוזיאון בכף ידך',
      url: 'https://tours.imj.org.il/',
      src: 'מוזיאון ישראל, ירושלים', kind: 'tour', time: 'lesson', who: 'both',
      topic: ['אמנות', 'ארכיאולוגיה', 'תרבות'],
      badge: 'חינם',
      desc: 'סיור וירטואלי באולמות המוזיאון. עובד יפה כשיעור שלם: כל תלמיד בוחר מוצג אחד, מצלם מסך וכותב שלוש שורות למה בחר בו.'
    },
    {
      title: 'סיור 360° ללימוד השואה',
      url: 'https://www.yadvashem.org/he/education/virtual-tour.html',
      src: 'יד ושם', kind: 'tour', time: 'lesson', who: 'both',
      topic: ['היסטוריה', 'שואה', 'זיכרון'],
      badge: 'חינם',
      desc: 'מרחב חינוכי וירטואלי במסע כרונולוגי — חיי הקהילות לפני המלחמה, הרדיפות, ההצלה, השחרור והשיבה לחיים. מיועד לכיתות ז׳ ומעלה.'
    },
    {
      title: 'תערוכות והדגמות מקוונות',
      url: 'https://mada.org.il/',
      src: 'מוזיאון המדע ע״ש בלומפילד, ירושלים', kind: 'tour', time: 'short', who: 'students',
      topic: ['מדעים', 'ניסויים'],
      desc: 'מוצגים, סרטוני הדגמה וניסויים שאפשר לבצע בבית. פתיח טוב לשיעור מדעים מרחוק.'
    },

    /* ===== צפייה והאזנה — לרגעים שאין בהם כוח למסך מלא ===== */
    {
      title: 'כאן חינוכית',
      url: 'https://www.kankids.org.il/',
      src: 'תאגיד השידור הישראלי', kind: 'video', time: 'short', who: 'students',
      topic: ['מדעים', 'היסטוריה', 'טבע', 'ספרות'],
      badge: 'חינם',
      desc: 'סדרות חינוכיות ופודקאסטים לילדים ולנוער — היסטוריה, טבע, מדע וספרות. מתאים גם כהפוגה מכוונת ולא רק כשיעור.'
    },
    {
      title: 'רשת עושים היסטוריה',
      url: 'https://osimhistoria.com/',
      src: 'עושים היסטוריה', kind: 'podcast', time: 'short', who: 'students',
      topic: ['היסטוריה', 'מדעים', 'פסיכולוגיה', 'כלכלה'],
      badge: 'חינם',
      desc: 'עשרות תוכניות בעברית: היסטוריה, מדע, פסיכולוגיה, בינה מלאכותית, רפואה וכלכלה. פרק אחד = משימת האזנה + שלוש שאלות. עובד גם בלי מסך, גם באוזניות בדרך.'
    },
    {
      title: 'אקדמיה ברשת — כל השידורים',
      url: 'https://pop.education.gov.il/sherutey-tiksuv-bachinuch/academya-bareshet/kol-hashidurim/',
      src: 'משרד החינוך', kind: 'video', time: 'lesson', who: 'both',
      topic: ['הכול'],
      badge: 'חינם',
      desc: 'אלפי הרצאות ושיעורים מוקלטים לפי תחום ולפי שפה. שימושי גם למורה להכנה וגם לשליחה ישירה לתלמידים.'
    },
    {
      title: 'אקדמיה ברשת — סדרות',
      url: 'https://pop.education.gov.il/sherutey-tiksuv-bachinuch/academya-bareshet/sdarot/',
      src: 'משרד החינוך', kind: 'video', time: 'multi', who: 'both',
      topic: ['הכול'],
      desc: 'סדרות וידאו שנבנו כרצף ולא כהרצאה בודדת — מתאים לבנות מהן יחידה של שבועיים.'
    },

    /* ===== מאגרים ומדריכים למורה ===== */
    {
      title: 'למידה בחירום — עמוד הריכוז הרשמי',
      url: 'https://pop.education.gov.il/sherutey-tiksuv-bachinuch/emergency-learning/',
      src: 'המרחב הפדגוגי', kind: 'guide', time: 'short', who: 'teacher',
      topic: ['חירום', 'ניהול למידה'],
      badge: 'להתחיל כאן',
      desc: 'העמוד הרשמי של המשרד: בוט לאיתור חומרי הוראה, חומרים לחינוך מיוחד ולעולים חדשים, מדור הפוגה ופנאי, וקו החירום הארצי 6552*.'
    },
    {
      title: 'מאגר יחידות הוראה מתוקשבות',
      url: 'https://pop.education.gov.il/tchumey_daat/teaching-units-stock/',
      src: 'פורטל עובדי הוראה', kind: 'bank', time: 'lesson', who: 'teacher',
      topic: ['הכול'],
      badge: '300+ יחידות',
      desc: 'יחידות הוראה מוכנות, מסוננות לפי כיתה, תחום דעת, נושא ושפה. הדרך המהירה ביותר להגיע לשיעור בנוי בלי לכתוב אותו.'
    },
    {
      title: 'צוותי תהוד״ה — שגרת חירום',
      url: 'https://pop.education.gov.il/sherutey-tiksuv-bachinuch/emergency-learning/resonance-education-teams-emergency-routine/',
      src: 'המרחב הפדגוגי', kind: 'guide', time: 'short', who: 'teacher',
      topic: ['חירום', 'צוות', 'רגשי'],
      desc: 'הנחיה מסודרת לצוות החינוכי בהסבה מהירה של שגרת ההוראה למתכונת מקוונת, כולל שמירת קשר עם התלמידים ועם ההורים.'
    },
    {
      title: 'קל לי בדיגיטלי',
      url: 'https://pop.education.gov.il/sherutey-tiksuv-bachinuch/ka-li-digitali/',
      src: 'המרחב הפדגוגי', kind: 'bank', time: 'short', who: 'teacher',
      topic: ['כלים דיגיטליים', 'חגים'],
      desc: 'פעילויות דיגיטליות קצרות שנשלחות למורים בוואטסאפ, סביב חגים ואירועי השנה, וניתנות להתאמה לכל תחום דעת.'
    },
    {
      title: 'למידה היברידית — שמונה צעדים וחמישה מודלים',
      url: 'https://pop.education.gov.il/teaching-tools/teaching-practices/search-teaching-practices/learning-from-distance/',
      src: 'פורטל עובדי הוראה', kind: 'guide', time: 'lesson', who: 'teacher',
      topic: ['ניהול למידה'],
      badge: 'המעשי ביותר',
      desc: 'תכנון יחידה, בחירת מודל ושילוב סינכרוני עם א-סינכרוני — עם סרטונים ומערכי שיעור לדוגמה.'
    },
    {
      title: 'הוראה ולמידה מרחוק במרחבים דיגיטליים',
      url: 'https://pop.education.gov.il/sherutey-tiksuv-bachinuch/distance-teaching-learning-digital/',
      src: 'המרחב הפדגוגי', kind: 'guide', time: 'short', who: 'teacher',
      topic: ['ניהול למידה', 'רגשי', 'הורים'],
      desc: 'עמוד הריכוז: ניהול הלמידה המקוונת, מיומנויות דיגיטליות, תקשורת עם הורים, למידה רגשית-חברתית ובטיחות ברשת.'
    },
    {
      title: 'מפגש חי מרחוק — Zoom, Meet ו-Teams',
      url: 'https://pop.education.gov.il/sherutey-tiksuv-bachinuch/virtual-classroom-meeting/',
      src: 'המרחב הפדגוגי', kind: 'guide', time: 'short', who: 'teacher',
      topic: ['כלים דיגיטליים'],
      desc: 'הצד הטכני יחד עם העקרונות הפדגוגיים לשיעור סינכרוני שלא מתפרק אחרי עשר דקות.'
    },
    {
      title: 'מרחב למידה בקצב אישי',
      url: 'https://pop.education.gov.il/sherutey-tiksuv-bachinuch/digital-classroom-learning-space/',
      src: 'המרחב הפדגוגי', kind: 'bank', time: 'lesson', who: 'teacher',
      topic: ['כלים דיגיטליים'],
      desc: 'תבניות מוכנות ל-Classroom, ל-Teams ול-Moodle ללמידה א-סינכרונית.'
    },

    /* ===== מסלול ההשתלמות של המורה ===== */
    {
      title: 'נערכים ללמידה מרחוק I: שיקולי דעת והיבטים טכנולוגיים',
      url: 'https://campus.gov.il/course/moe-edu-tch-learningfromdistancei-he/',
      src: 'משרד החינוך · קמפוס IL', kind: 'course', time: 'multi', who: 'teacher',
      topic: ['השתלמות', 'ניהול למידה'],
      badge: '6 שעות · תעודה',
      desc: 'הקורס הראשון במסלול בן חמישה קורסים (30 שעות סה״כ): מה בכלל מחליטים כשעוברים ללמידה מרחוק, ואיזו טכנולוגיה באמת נחוצה.'
    },
    {
      title: 'למידה מרחוק II: היבטים פדגוגיים',
      url: 'https://campus.gov.il/course/moe-edu-tch-learningfromdistanceii-he/',
      src: 'משרד החינוך · קמפוס IL', kind: 'course', time: 'multi', who: 'teacher',
      topic: ['השתלמות', 'ניהול למידה'],
      badge: '6 שעות · תעודה',
      desc: 'איך נראית הוראה טובה כשהקבוצה לא בחדר — נוכחות, קצב, מעורבות ומה שמחליף את קשר העין.'
    },
    {
      title: 'למידה מרחוק III: עזרים דיגיטליים לגיוון הוראה והערכה',
      url: 'https://campus.gov.il/course/moe-edu-tch-learningfromdistanceiii-he/',
      src: 'משרד החינוך · קמפוס IL', kind: 'course', time: 'multi', who: 'teacher',
      topic: ['השתלמות', 'כלים דיגיטליים', 'הערכה'],
      badge: '6 שעות · תעודה',
      desc: 'הכלים עצמם — מה משרת גיוון בהוראה ומה משרת הערכה, ומתי כלי נוסף רק מכביד.'
    },
    {
      title: 'למידה מרחוק IV: תכנון למידה שבועית',
      url: 'https://campus.gov.il/course/moe-edu-tch-learningfromdistanceiv-he/',
      src: 'משרד החינוך · קמפוס IL', kind: 'course', time: 'multi', who: 'teacher',
      topic: ['השתלמות', 'ניהול למידה'],
      badge: '6 שעות · תעודה',
      desc: 'המעבר משיעור בודד לשבוע שלם — הקורס הכי שימושי מבין החמישה כשהחירום מתארך.'
    },
    {
      title: 'בינה מלאכותית כעוזר הוראה',
      url: 'https://campus.gov.il/course/moe-edu-shelf-aiedu-he/',
      src: 'משרד החינוך · קמפוס IL', kind: 'course', time: 'multi', who: 'teacher',
      topic: ['בינה מלאכותית', 'השתלמות'],
      badge: '6 שעות',
      desc: 'ניסוח פרומפטים, יצירת תוכן ותכנון שיעור בעזרת AI — משלים ישירות את מחולל המערכים שבעמוד הזה.'
    },

    /* ===== רשתות החינוך ===== */
    {
      title: 'למידה מרחוק בחירום',
      url: 'https://www.amalnet.k12.il/e-learning1/',
      src: 'רשת עמל', kind: 'bank', time: 'lesson', who: 'teacher',
      topic: ['חירום'],
      desc: 'מערכי שיעור וכלים שנבנו במיוחד למצב חירום. פתוח בלי הזדהות.'
    },
    {
      title: 'למידה במרחבי החיים — קורס MOOC',
      url: 'https://www.amalnet.k12.il/lwl/',
      src: 'רשת עמל', kind: 'course', time: 'multi', who: 'both',
      topic: ['העשרה'],
      desc: 'קורס אונליין ללמידה עצמית — מתאים גם למורים כהשתלמות וגם לתלמידים כהעשרה.'
    },
    {
      title: 'AI-TIPS',
      url: 'https://www.amalnet.k12.il/ai-tips/',
      src: 'רשת עמל', kind: 'guide', time: 'short', who: 'teacher',
      topic: ['בינה מלאכותית'],
      desc: 'פרקטיקות בינה מלאכותית שמקצרות את הכנת החומרים מרחוק.'
    },
    {
      title: 'רק יחד — כלים ושגרות לשעת חירום',
      url: 'https://brancoweiss.org.il/product/%d7%a8%d7%a7-%d7%99%d7%97%d7%93-%d7%9b%d7%9c%d7%99%d7%9d-%d7%95%d7%a9%d7%92%d7%a8%d7%95%d7%aa-%d7%9c%d7%a9%d7%a2%d7%aa-%d7%97%d7%99%d7%a8%d7%95%d7%9d/',
      src: 'מכון ברנקו וייס', kind: 'bank', time: 'short', who: 'teacher',
      topic: ['רגשי', 'חירום'],
      badge: 'חינם',
      desc: 'שגרות פתיחה ושיח רגשי מוכנים להפעלה מיידית בכיתה או במפגש מקוון.'
    },
    {
      title: 'מדידה, הערכה ומשוב בלמידה מרחוק',
      url: 'https://brancoweiss.org.il/product/%d7%9e%d7%93%d7%99%d7%93%d7%94-%d7%94%d7%a2%d7%a8%d7%9b%d7%94-%d7%95%d7%9e%d7%a9%d7%95%d7%91-%d7%91%d7%9c%d7%9e%d7%99%d7%93%d7%94-%d7%9e%d7%a8%d7%97%d7%95%d7%a7/',
      src: 'מכון ברנקו וייס', kind: 'guide', time: 'lesson', who: 'teacher',
      topic: ['הערכה'],
      desc: 'איך יודעים שלמדו — כשאין מבחן בכיתה.'
    },
    {
      title: 'עקרונות ללמידה בחירום',
      url: 'https://atidedu.org.il/library/learning/',
      src: 'רשת עתיד', kind: 'guide', time: 'short', who: 'teacher',
      topic: ['חירום'],
      desc: 'המסגרת הפדגוגית — מה משנים בשעת חירום ומה דווקא משאירים.'
    },
    {
      title: 'וּבְחַרְתָּ — חוברת מערכים לזיכרון והנצחה',
      url: 'https://atidedu.org.il/library/lesson-plan/',
      src: 'רשת עתיד', kind: 'bank', time: 'lesson', who: 'teacher',
      topic: ['זיכרון', 'רגשי'],
      desc: 'מודל שלושה מעגלים — פרט, קהילה, מדינה. לצד 600 ימים ולזכור אותם באותה ספרייה.'
    }
  ];

  /* ---------- מצב הסינון ---------- */
  var state = { kind: 'all', time: 'all', who: 'all', q: '' };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function matches(it) {
    if (state.kind !== 'all' && it.kind !== state.kind) return false;
    if (state.time !== 'all' && it.time !== state.time) return false;
    if (state.who !== 'all' && it.who !== state.who && it.who !== 'both') return false;
    if (state.q) {
      var hay = (it.title + ' ' + it.src + ' ' + it.desc + ' ' + (it.topic || []).join(' ')).toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
    }
    return true;
  }

  function card(it) {
    var k = KIND[it.kind] || KIND.guide;
    return '' +
      '<article class="shelf-it ' + k.cls + '">' +
        '<div class="shelf-top">' +
          '<span class="shelf-kind">' + esc(k.label) + '</span>' +
          '<span class="shelf-time">' + esc(TIME[it.time] || '') + '</span>' +
          (it.badge ? '<span class="shelf-badge">' + esc(it.badge) + '</span>' : '') +
        '</div>' +
        '<h3><a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + esc(it.title) +
          '<span class="sr-only"> (נפתח בלשונית חדשה)</span></a></h3>' +
        '<div class="shelf-src">' + esc(it.src) + '</div>' +
        '<p>' + esc(it.desc) + '</p>' +
        '<div class="shelf-acts">' +
          '<a class="shelf-go" href="' + esc(it.url) + '" target="_blank" rel="noopener">פתיחה ‹</a>' +
          '<button type="button" class="shelf-copy" data-t="' + esc(it.title) + '" data-u="' + esc(it.url) + '">העתקה לשליחה</button>' +
        '</div>' +
      '</article>';
  }

  function render() {
    var grid = document.getElementById('shelf-grid');
    var count = document.getElementById('shelf-count');
    if (!grid) return;
    var list = SHELF.filter(matches);
    grid.innerHTML = list.length
      ? list.map(card).join('')
      : '<p class="shelf-empty">אין משאב שמתאים לשילוב הזה. נסו לוותר על אחד המסננים.</p>';
    if (count) {
      count.textContent = list.length === SHELF.length
        ? SHELF.length + ' משאבים'
        : list.length + ' מתוך ' + SHELF.length;
    }
  }

  function initFilters() {
    document.querySelectorAll('#shelf-filters [data-f]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var group = btn.getAttribute('data-f');
        var val = btn.getAttribute('data-v');
        state[group] = val;
        document.querySelectorAll('#shelf-filters [data-f="' + group + '"]').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        render();
      });
    });

    var q = document.getElementById('shelf-q');
    if (q) {
      q.addEventListener('input', function () { state.q = q.value.trim(); render(); });
    }

    var reset = document.getElementById('shelf-reset');
    if (reset) {
      reset.addEventListener('click', function () {
        state = { kind: 'all', time: 'all', who: 'all', q: '' };
        if (q) q.value = '';
        document.querySelectorAll('#shelf-filters [data-f]').forEach(function (b) {
          var on = b.getAttribute('data-v') === 'all';
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        render();
      });
    }
  }

  /* העתקה לשליחה בוואטסאפ — כותרת ואחריה הקישור */
  function initCopy() {
    var grid = document.getElementById('shelf-grid');
    if (!grid) return;
    grid.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.shelf-copy');
      if (!btn) return;
      var text = btn.getAttribute('data-t') + '\n' + btn.getAttribute('data-u');
      var done = function () {
        var old = btn.textContent;
        btn.textContent = 'הועתק ✓';
        btn.classList.add('ok');
        setTimeout(function () { btn.textContent = old; btn.classList.remove('ok'); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
      } else {
        fallback(text, done);
      }
    });
  }

  function fallback(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:absolute;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  function start() { render(); initFilters(); initCopy(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
