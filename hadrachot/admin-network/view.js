/* מבט רשת — הגדרות הניווט והסיור (24.9.26). הרכיבים עצמם: assets/menor-view.js + assets/tour.js */
window.MENOR_VIEW = {
  view: 'network',
  nav: [
    { sel: '.command-strip', label: 'תמונת מצב', icon: 'pulse' },
    { sel: '#trend-chart', up: '.card', label: 'מגמת נוכחות', icon: 'trend' },
    { sel: '#sec-haredi', up: '.card', label: 'לפי מגזר', icon: 'pie' },
    { sel: '#nw-meet-grid', up: '.attention-card', label: 'נוכחות במפגשים', icon: 'check' },
    { sel: '#schools-body', up: '.attention-card', label: 'בתי הספר', icon: 'school' }
  ],
  tour: {
    name: 'מבט הרשת',
    intro: 'תמונת המצב החודשית של בתי הספר ברשת — נוכחות, מגמות ופערים.',
    steps: [
      { sel: '.page-header', title: 'ברוכים הבאים למבט הרשת',
        text: 'כל בתי הספר ברשת במקום אחד. הכפתור "שליחת דוח לרשת" מכין מייל עם הדוח החודשי.' },
      { sel: '#menor-nav', title: 'כפתורי ניווט',
        text: 'קפיצה מהירה לכל חלק בדף. הכפתור של החלק שמולך נצבע בירוק.' },
      { sel: '.command-strip', title: 'תמונת מצב',
        text: 'בתי ספר, מורים, אחוז הנוכחות החודש, ומי פספס/ה — במבט אחד.' },
      { sel: '.attention-card:has(#nw-meet-grid)', title: 'נוכחות במפגשי ההדרכה',
        text: 'הנוכחות לפי חודש, ובפירוט — לפי מקצוע ומדריכ/ה.' },
      { sel: '.attention-card:has(#schools-body)', title: 'בתי הספר ברשת',
        text: 'אחוז הנוכחות של כל בית ספר. "פתח" מציג את מבט בית הספר, כמו שהמנהל/ת רואה אותו.' },
      { sel: '#page-help', title: 'שאלה או קושי?',
        text: 'משהו לא עובד או לא ברור? "כתבו לנו" פותח הודעה ישירה. ואת הסיור אפשר לפתוח שוב מכאן.' }
    ]
  }
};
