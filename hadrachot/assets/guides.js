/* ============================================================
   רישום מדריכות — מקור אמת יחיד לפרטי כל מדריכ/ה
   כל מדריכ/ה: שם, מקצוע, מגזרים שבאחריותה, מייל (אם יש),
   קישור Drive לחומרי הוראה וקישור קבוע לזום (אם יש).

   sectors — אילו מגזרים המדריכ/ה מלווה:
     ['kelali','haredi'] = החברה היהודית · ['arab'] = החברה הערבית
   המקור: "קבוצות הדרכה ופרטי המדריכים" תשפ"ז (pedagogiamh.co.il).

   הדשבורד נטען לפי ?g=<slug> או ?guide=<email>.
   ============================================================ */
window.TS_GUIDES = {

  /* ---------- החברה היהודית ---------- */
  shira: {
    name: 'שירה סיבוני',
    subject: 'מתמטיקה',
    sectors: ['kelali', 'haredi'],
    email: 'Shiras@gram.ort.org.il',
    drive: '',
    zoom: ''
  },
  sivan: {
    name: 'סיוון נחליאלי',
    subject: 'אנגלית',
    sectors: ['kelali', 'haredi'],
    email: '',
    drive: 'https://drive.google.com/drive/folders/1XhUtPHFz2Pv2HrNj6X6TtB-nqp3kzmMJ?usp=sharing',
    zoom: ''
  },
  moria: {
    name: 'מוריה פלינט',
    subject: 'עברית',
    sectors: ['kelali', 'haredi'],
    email: '',
    drive: 'https://drive.google.com/drive/folders/1uQKR8AmWZCv8-s6mD29SI0ngefxRjx-E?usp=sharing',
    zoom: 'https://edu-il.zoom.us/j/9525827563?omn=82061716992'
  },
  nira: {
    name: 'נירה הראל',
    subject: 'ספרות',
    sectors: ['kelali', 'haredi'],
    email: '',
    drive: '',
    zoom: ''
  },
  dana: {
    name: 'דנה ברצורי',
    subject: 'היסטוריה',
    sectors: ['kelali', 'haredi'],
    email: '',
    drive: '',
    zoom: ''
  },
  riki: {
    name: 'ריקי פולק',
    subject: 'אזרחות',
    sectors: ['kelali', 'haredi'],
    email: '',
    drive: '',
    zoom: ''
  },
  tali: {
    name: 'טלי אהרון זיו',
    subject: 'תנ"ך',
    sectors: ['kelali', 'haredi'],
    email: '',
    drive: '',
    zoom: ''
  },

  /* ---------- החברה הערבית ---------- */
  suha: {
    name: 'סוהא ערדה',
    subject: 'עברית',
    sectors: ['arab'],
    email: '',
    drive: '',
    zoom: ''
  },
  rozin: {
    name: 'רוזין מטר דאו',
    subject: 'אנגלית',
    sectors: ['arab'],
    email: '',
    drive: '',
    zoom: ''
  },
  wael: {
    name: 'ואאל טאהא',
    subject: 'ערבית',
    sectors: ['arab'],
    email: '',
    drive: '',
    zoom: ''
  },
  abed: {
    name: 'עבד אלוהאב חבאיב',
    subject: 'היסטוריה',
    sectors: ['arab'],
    email: '',
    drive: '',
    zoom: ''
  },
  khaled: {
    name: 'חאלד גבארין',
    subject: 'אזרחות',
    sectors: ['arab'],
    email: '',
    drive: '',
    zoom: ''
  },
  moshe: {
    name: 'משה עשור',
    subject: 'מתמטיקה',
    sectors: ['arab'],
    email: '',
    drive: '',
    zoom: ''
  },
  suliman: {
    name: 'סולימאן ברייה',
    subject: 'מתמטיקה',
    sectors: ['arab'],
    email: '',
    drive: '',
    zoom: ''
  },
  mansour: {
    name: 'מנסור עתאמנה',
    subject: 'מורשת אסלאמית',
    sectors: ['arab'],
    email: '',
    drive: '',
    zoom: ''
  },
  muzna: {
    name: 'מזנה סלאלחה',
    subject: 'מורשת דרוזית',
    sectors: ['arab'],
    email: '',
    drive: '',
    zoom: ''
  }
};

/* מחזיר את קונפיג המדריכה לפי slug (?g=) או לפי email (?guide=) */
window.TS_resolveGuide = function (slug, email) {
  const guides = window.TS_GUIDES || {};
  if (slug && guides[slug]) return Object.assign({ slug }, guides[slug]);
  if (email) {
    const key = Object.keys(guides).find(k => (guides[k].email || '').toLowerCase() === email.toLowerCase());
    if (key) return Object.assign({ slug: key }, guides[key]);
  }
  return null;
};
