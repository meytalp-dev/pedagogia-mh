/* ============================================================
   רישום מדריכות ומפקחים — מקור אמת יחיד
   -----------------------------------------------------------
   קובץ זה נטען גם בדפים הפתוחים (guide/, mabat/, login.html),
   ולכן הוא מכיל אך ורק מידע מקצועי: שם, מקצוע, מגזרים, מפקח.ת.
   ** טלפונים ומיילים אישיים נמצאים ב-assets/guides-contact.js **
   שנטען רק מדף האדמין המוגן admin-guides.html.

   sectors — אילו מגזרים המדריכ/ה מלווה:
     ['kelali','haredi'] = החברה היהודית · ['arab'] = החברה הערבית
   inspector — slug המפקח.ת המקצועי.ת מתוך TS_INSPECTORS למטה.

   המקור: "רשימת מדריכים" תשפ"ז (מיטל פלג, 8.9.26) —
   מעודכן על גבי "קבוצות הדרכה ופרטי המדריכים" תשפ"ז.

   דשבורד מדריכה נטען לפי ?g=<slug>; מבט מפקח.ת לפי mabat/?i=<slug>.
   ============================================================ */
window.TS_GUIDES = {

  /* ---------- החברה היהודית ---------- */
  shira: {
    name: 'שירה סיבוני',
    subject: 'מתמטיקה',
    sectors: ['kelali', 'haredi'],
    inspector: 'revital',
    drive: '',
    zoom: ''
  },
  sivan: {
    name: 'סיוון נחליאלי',
    subject: 'אנגלית',
    sectors: ['kelali', 'haredi'],
    inspector: 'liat',
    drive: 'https://drive.google.com/drive/folders/1XhUtPHFz2Pv2HrNj6X6TtB-nqp3kzmMJ?usp=sharing',
    zoom: ''
  },
  moria: {
    name: 'מוריה פלינט',
    subject: 'עברית',
    sectors: ['kelali', 'haredi'],
    inspector: 'liat',
    drive: 'https://drive.google.com/drive/folders/1uQKR8AmWZCv8-s6mD29SI0ngefxRjx-E?usp=sharing',
    zoom: '' /* קישור זום אישי קבוע הוסר מסיבות אבטחה (1.9.26) — לשתף קישור מפגש חד־פעמי בערוץ סגור */
  },
  nira: {
    name: 'נירה הראל',
    subject: 'ספרות',
    sectors: ['kelali', 'haredi'],
    inspector: 'liat',
    drive: '',
    zoom: ''
  },
  dana: {
    name: 'דנה ברצורי',
    subject: 'היסטוריה',
    sectors: ['kelali', 'haredi'],
    inspector: 'sigalit',
    drive: '',
    zoom: ''
  },
  elisheva: {
    /* החליפה את ריקי פולק — קביעת מיטל 8.9.26.
       שם המשפחה טרם התקבל (בקובץ המקור מופיע שם פרטי בלבד). */
    name: 'אלישבע',
    subject: 'אזרחות',
    sectors: ['kelali', 'haredi'],
    inspector: 'sigalit',
    drive: '',
    zoom: ''
  },
  gal: {
    /* קבוצה חדשה 9.9.26 — מתמטיקה 4-5 יח"ל. שם משפחה טרם התקבל.
       הפילוח לפי יחידות עדיין לא קיים בנתוני המורים, ולכן גל ושירה
       רואים כרגע את אותם 110 מורי המתמטיקה בחברה היהודית. */
    name: 'גל',
    subject: 'מתמטיקה',
    sectors: ['kelali', 'haredi'],
    inspector: 'revital',
    drive: '',
    zoom: ''
  },
  tali: {
    name: 'טלי אהרון זיו',
    subject: 'תנ"ך',
    sectors: ['kelali', 'haredi'],
    inspector: 'yisachar',
    drive: '',
    zoom: ''
  },

  /* ---------- החברה הערבית ---------- */
  suha: {
    name: 'סוהא ערדה',
    subject: 'עברית',
    sectors: ['arab'],
    inspector: 'wesam',
    drive: '',
    zoom: ''
  },
  rozin: {
    name: 'רוזין מטר דאו',
    subject: 'אנגלית',
    sectors: ['arab'],
    inspector: 'liat',
    drive: '',
    zoom: ''
  },
  wael: {
    name: 'ואאל טאהא',
    subject: 'ערבית',
    sectors: ['arab'],
    inspector: 'wesam',
    drive: '',
    zoom: ''
  },
  rima: {
    /* נוספה 8.9.26 מקובץ "רשימת מדריכים".
       שם המשפחה טרם אומת (לפי המייל — ככל הנראה ברנסי). */
    name: 'רימה',
    subject: 'ספרות',
    sectors: ['arab'],
    inspector: 'liat',
    drive: '',
    zoom: ''
  },
  abed: {
    name: 'עבד אלוהאב חבאיב',
    subject: 'היסטוריה',
    sectors: ['arab'],
    inspector: 'yasmin',
    drive: '',
    zoom: ''
  },
  khaled: {
    name: 'חאלד גבארין',
    subject: 'אזרחות',
    sectors: ['arab'],
    inspector: 'yasmin',
    drive: '',
    zoom: ''
  },
  moshe: {
    name: 'משה עשור',
    subject: 'מתמטיקה',
    sectors: ['arab'],
    inspector: 'yasmin',
    drive: '',
    zoom: ''
  },
  suliman: {
    name: 'סולימאן ברייה',
    subject: 'מתמטיקה',
    sectors: ['arab'],
    inspector: 'yasmin',
    drive: '',
    zoom: ''
  },
  mansour: {
    name: 'מנסור עתאמנה',
    subject: 'מורשת אסלאמית',
    sectors: ['arab'],
    inspector: 'yasmin',
    drive: '',
    zoom: ''
  },
  muzna: {
    name: 'מזנה סלאלחה',
    subject: 'מורשת דרוזית',
    sectors: ['arab'],
    inspector: 'yasmin',
    drive: '',
    zoom: ''
  }
};

/* ============================================================
   המפקחים המקצועיים — מי אחראי על אילו מקצועות
   subjects — המקצועות שבאחריות המפקח.ת (נגזר משדה inspector למעלה)
   sectors  — המגזרים שבהם המבט שלו.ה נחתך
   המקור: עמודת "מפקח" בקובץ "רשימת מדריכים" תשפ"ז.
   ============================================================ */
window.TS_INSPECTORS = {
  /* פריסת הפיקוח לפי מקצועות — עדכון מיטל 9.9.26.
     המבנה: coverage = זוגות מקצוע×מגזרים, כי מפקח.ת יכול.ה להיות ארצי.ת
     במקצוע אחד ומגזרי.ת באחר (ליאת: אנגלית וספרות בכל המגזרים, אבל עברית
     רק בחברה היהודית — לדוברי ערבית זה ויסאם). allSubjectsSectors = מגזר שלם
     בכל המקצועות, וזה המקרה של יששכר במגזר החרדי.
     חפיפה היא לגיטימית: מורה אנגלית חרדי נראה גם לליאת (מפקחת המקצוע)
     וגם ליששכר (מפקח המגזר). */

  liat: {
    name: 'ליאת צבר',
    society: 'ארצי',
    coverage: [
      { subject: 'אנגלית', sectors: ['kelali', 'haredi', 'arab'] },
      { subject: 'ספרות',  sectors: ['kelali', 'haredi', 'arab'] },
      /* עברית בחברה היהודית בלבד — עברית לדוברי ערבית היא של ויסאם */
      { subject: 'עברית',  sectors: ['kelali', 'haredi'] }
    ]
  },
  sigalit: {
    name: 'סיגלית דאי',
    society: 'החברה הכללית',
    coverage: [
      { subject: 'אזרחות',   sectors: ['kelali'] },
      { subject: 'היסטוריה', sectors: ['kelali'] }
    ]
  },
  yisachar: {
    name: 'יששכר חפץ',
    society: 'תנ"ך ארצי + המגזר החרדי',
    coverage: [
      { subject: 'תנ"ך', sectors: ['kelali', 'haredi', 'arab'] }
    ],
    allSubjectsSectors: ['haredi']
  },
  revital: {
    name: 'רויטל אמיר',
    society: 'החברה היהודית',
    coverage: [
      { subject: 'מתמטיקה', sectors: ['kelali', 'haredi'] }
    ]
  },
  wesam: {
    name: 'ויסאם סואלחה',
    society: 'החברה הערבית',
    coverage: [
      { subject: 'עברית', sectors: ['arab'] },
      { subject: 'ערבית', sectors: ['arab'] }
    ]
  },
  yasmin: {
    name: 'יסמין אמון',
    society: 'החברה הערבית',
    coverage: [
      { subject: 'מתמטיקה',        sectors: ['arab'] },
      { subject: 'אזרחות',         sectors: ['arab'] },
      { subject: 'היסטוריה',       sectors: ['arab'] },
      { subject: 'מורשת אסלאמית',  sectors: ['arab'] },
      { subject: 'מורשת דרוזית',   sectors: ['arab'] }
    ]
  }
};

/* subjects/sectors נגזרים מ-coverage — דפים ותיקים ממשיכים לקרוא אותם כרשימות
   שטוחות (כותרות, מונים, סרגלי סינון), בלי לדעת על המבנה החדש. */
(function deriveInspectorFields() {
  const list = window.TS_INSPECTORS || {};
  Object.keys(list).forEach(slug => {
    const ins = list[slug];
    const subjects = [], sectors = [];
    (ins.coverage || []).forEach(c => {
      if (subjects.indexOf(c.subject) < 0) subjects.push(c.subject);
      (c.sectors || []).forEach(sc => { if (sectors.indexOf(sc) < 0) sectors.push(sc); });
    });
    (ins.allSubjectsSectors || []).forEach(sc => { if (sectors.indexOf(sc) < 0) sectors.push(sc); });
    ins.subjects = subjects;
    ins.sectors = sectors;
  });
})();

/* האם המורה הזה באחריות המפקח.ת — הבדיקה היחידה שכל הדפים צריכים לקרוא לה.
   בלי זה כל דף היה מצליב subjects×sectors לבד ומחזיר מתמטיקה כללי ליששכר. */
window.TS_inspectorCovers = function (ins, subject, sector) {
  if (!ins) return false;
  const sec = sector || 'kelali';
  if ((ins.allSubjectsSectors || []).indexOf(sec) >= 0) return true;
  return (ins.coverage || []).some(c =>
    c.subject === subject && (!c.sectors || c.sectors.indexOf(sec) >= 0));
};

/* מחזיר את קונפיג המדריכה לפי slug (?g=) או לפי email (?guide=) */
window.TS_resolveGuide = function (slug, email) {
  const guides = window.TS_GUIDES || {};
  if (slug && guides[slug]) return Object.assign({ slug }, guides[slug]);
  if (email) {
    const contacts = (window.TS_CONTACTS && window.TS_CONTACTS.guides) || {};
    const key = Object.keys(guides).find(k =>
      ((guides[k].email || (contacts[k] || {}).email || '')).toLowerCase() === email.toLowerCase());
    if (key) return Object.assign({ slug: key }, guides[key]);
  }
  return null;
};

/* מחזיר את קונפיג המפקח.ת לפי slug (mabat/?i=) */
window.TS_resolveInspector = function (slug) {
  const list = window.TS_INSPECTORS || {};
  return (slug && list[slug]) ? Object.assign({ slug }, list[slug]) : null;
};

/* כל המדריכות שתחת מפקח.ת מסוים.ת */
window.TS_guidesOfInspector = function (slug) {
  const guides = window.TS_GUIDES || {};
  return Object.keys(guides)
    .filter(k => guides[k].inspector === slug)
    .map(k => Object.assign({ slug: k }, guides[k]));
};
