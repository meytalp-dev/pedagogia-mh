/* מבט המדריכ/ה — הגדרות הניווט והסיור (24.9.26). הרכיבים עצמם: assets/menor-view.js + assets/tour.js
   הלשוניות נפתחות דרך TS_goTab (dashboard.js), כמו קיצורי הדרך שבראש העמוד. */
window.MENOR_VIEW = {
  view: 'guide',
  nav: [
    { sel: '#next-meet', label: 'המפגש הבא', icon: 'calendar' },
    { sel: '.command-strip', label: 'תמונת מצב', icon: 'pulse' },
    { sel: '#resources-card', label: 'חומרים וקישורים', icon: 'folder' },
    { tab: 'teachers', label: 'המורים שלי', icon: 'users' },
    { tab: 'meet', label: 'נוכחות', icon: 'check' },
    { tab: 'space', label: 'חומרים והודעות', icon: 'chat' },
    { tab: 'hours', label: 'שעות פרטניות', icon: 'clock' },
    { tab: 'monday', label: 'דיווח למונדיי', icon: 'doc' },
    { tab: 'plan', label: 'תוכנית שנתית', icon: 'calendar' },
    { tab: 'stats', label: 'סטטיסטיקה', icon: 'chart' }
  ],
  tour: {
    name: 'מבט המדריכ/ה',
    intro: 'המורים בקבוצות שלך, הנוכחות במפגשים והחומרים למורים — במקום אחד.',
    steps: [
      { sel: '.page-header', title: 'ברוכים הבאים למבט המדריכ/ה',
        text: 'הבית שלך במנור. מכאן גם מוסיפים מורה או הדרכה חדשה, בכפתורים שבראש הדף.' },
      { sel: '#next-meet', title: 'המפגש הבא',
        text: 'התאריך והנושא מהתוכנית השנתית. מכאן נכנסים למפגש ורושמים נוכחות.' },
      { sel: '#menor-nav', title: 'כפתורי ניווט',
        text: 'קפיצה מהירה לכל חלק בדף ולכל לשונית. הכפתור של החלק שמולך נצבע בירוק.' },
      { sel: '.command-strip', title: 'מה מחכה לטיפול',
        text: 'המספרים הראשונים הם מה שאפשר לפעול עליו: מורים שטרם השלימו פרטים, ומורים שעוד לא סומנה להם רמה.' },
      { sel: '.tabs-bar', title: 'הלשוניות',
        text: 'המורים שלי, נוכחות במפגשים, חומרים והודעות לקבוצה, שעות פרטניות ודיווח למונדיי — כל אחת בלשונית משלה.' },
      { sel: '#page-help', title: 'שאלה או קושי?',
        text: 'משהו לא עובד או לא ברור? "כתבו לנו" פותח הודעה ישירה. ואת הסיור אפשר לפתוח שוב מכאן.' }
    ]
  }
};
