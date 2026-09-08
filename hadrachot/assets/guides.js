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
    inspector: '', /* בקובץ המקור לא צוין מפקח.ת לעברית בחברה היהודית */
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
    inspector: 'yisachar',
    drive: '',
    zoom: ''
  },
  elisheva: {
    /* החליפה את ריקי פולק — קביעת מיטל 8.9.26.
       שם המשפחה טרם התקבל (בקובץ המקור מופיע שם פרטי בלבד). */
    name: 'אלישבע',
    subject: 'אזרחות',
    sectors: ['kelali', 'haredi'],
    inspector: '', /* בקובץ המקור לא צוין מפקח.ת לאזרחות בחברה היהודית */
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
    inspector: 'yasmin',
    drive: '',
    zoom: ''
  },
  rozin: {
    name: 'רוזין מטר דאו',
    subject: 'אנגלית',
    sectors: ['arab'],
    inspector: 'yasmin',
    drive: '',
    zoom: ''
  },
  wael: {
    name: 'ואאל טאהא',
    subject: 'ערבית',
    sectors: ['arab'],
    inspector: 'yasmin',
    drive: '',
    zoom: ''
  },
  rima: {
    /* נוספה 8.9.26 מקובץ "רשימת מדריכים".
       שם המשפחה טרם אומת (לפי המייל — ככל הנראה ברנסי). */
    name: 'רימה',
    subject: 'ספרות',
    sectors: ['arab'],
    inspector: 'yasmin',
    drive: '',
    zoom: ''
  },
  abed: {
    name: 'עבד אלוהאב חבאיב',
    subject: 'היסטוריה',
    sectors: ['arab'],
    inspector: 'ahmad',
    drive: '',
    zoom: ''
  },
  khaled: {
    name: 'חאלד גבארין',
    subject: 'אזרחות',
    sectors: ['arab'],
    inspector: 'ahmad',
    drive: '',
    zoom: ''
  },
  moshe: {
    name: 'משה עשור',
    subject: 'מתמטיקה',
    sectors: ['arab'],
    inspector: 'ahmad',
    drive: '',
    zoom: ''
  },
  suliman: {
    name: 'סולימאן ברייה',
    subject: 'מתמטיקה',
    sectors: ['arab'],
    inspector: 'ahmad',
    drive: '',
    zoom: ''
  },
  mansour: {
    name: 'מנסור עתאמנה',
    subject: 'מורשת אסלאמית',
    sectors: ['arab'],
    inspector: 'ahmad',
    drive: '',
    zoom: ''
  },
  muzna: {
    name: 'מזנה סלאלחה',
    subject: 'מורשת דרוזית',
    sectors: ['arab'],
    inspector: 'ahmad',
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
  yisachar: {
    name: 'יששכר חפץ',
    society: 'החברה היהודית',
    sectors: ['kelali', 'haredi'],
    subjects: ['תנ"ך', 'היסטוריה']
  },
  liat: {
    name: 'ליאת צבר',
    society: 'החברה היהודית',
    sectors: ['kelali', 'haredi'],
    subjects: ['אנגלית', 'ספרות']
  },
  revital: {
    name: 'רויטל אמיר',
    society: 'החברה היהודית',
    sectors: ['kelali', 'haredi'],
    subjects: ['מתמטיקה']
  },
  yasmin: {
    name: 'יסמין אמון',
    society: 'החברה הערבית',
    sectors: ['arab'],
    subjects: ['עברית', 'ערבית', 'אנגלית', 'ספרות']
  },
  ahmad: {
    name: 'אחמד מחאמיד',
    society: 'החברה הערבית',
    sectors: ['arab'],
    subjects: ['היסטוריה', 'אזרחות', 'מתמטיקה', 'מורשת אסלאמית', 'מורשת דרוזית']
  }
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
