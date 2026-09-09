/* ============================================================
   פרטי קשר אישיים — מדריכות ומפקחים
   -----------------------------------------------------------
   ** קובץ זה נטען אך ורק מדף האדמין המוגן admin-guides.html. **
   אין לטעון אותו מדפים פתוחים (guide/, mabat/, login.html) —
   שם נטען assets/guides.js בלבד, שמכיל מידע מקצועי ללא פרטים אישיים.

   המקור: קובץ "רשימת מדריכים" תשפ"ז (מיטל פלג, 8.9.26).
   המפתחות זהים ל-slugs שב-guides.js / TS_INSPECTORS.
   ============================================================ */
window.TS_CONTACTS = {

  guides: {
    /* ---------- החברה היהודית ---------- */
    shira:    { phone: '050-9040252', email: 'Shirasib@gmail.com' },
    sivan:    { phone: '052-8285022', email: 'sivann66@gmail.com' },
    moria:    { phone: '054-3168002', email: 'moriah.flint@gmail.com' },
    nira:     { phone: '054-4642841', email: 'nira23101969@gmail.com' },
    dana:     { phone: '050-3149106', email: '' },
    elisheva: { phone: '',            email: 'e7co@hotmail.com' },
    tali:     { phone: '050-2219000', email: 'Tali.lu.aharon@gmail.com' },
    gal:      { phone: '054-5542889', email: '' },

    /* ---------- החברה הערבית ---------- */
    suha:     { phone: '052-8616162', email: 'soha38815@gmail.com' },
    rozin:    { phone: '054-8116623', email: 'Rozeen_mtr@yahoo.com' },
    wael:     { phone: '052-4069544', email: 'laianw@walla.co.il' },
    rima:     { phone: '054-6211885', email: 'Rimabransi@gmail.com' },
    abed:     { phone: '052-2618595', email: '' },
    khaled:   { phone: '052-5618070', email: 'gabarinkhalid@gmail.com' },
    moshe:    { phone: '052-2978071', email: 'Moshassor@gmail.com' },
    suliman:  { phone: '052-8621691', email: '' },
    mansour:  { phone: '',            email: '' },
    muzna:    { phone: '052-7789995', email: '' }
  },

  /* המיילים מגיעים מגיליון ההרשאות של מרחב הפיקוח (harshaot.csv) —
     אותם חשבונות שאיתם הם נכנסים לאתר, ולכן זו הכתובת הנכונה לפנייה.
     הטלפונים אינם בקובץ "רשימת מדריכים" (יש בו עמודת טלפון למדריכות בלבד);
     המקור שלהם הוא רשימת המשתתפים של זימוני הכשרת הרכזים —
     Downloads\רויטל\_מקור-זימונים\_participants.json (9.9.26). */
  inspectors: {
    yisachar: { phone: '052-8182834', email: 'ysaschar.hefez@labor.gov.il' },
    liat:     { phone: '050-7597144', email: 'liat.tzabar@labor.gov.il' },
    revital:  { phone: '050-8944480', email: 'revital.amir@labor.gov.il' },
    yasmin:   { phone: '050-9117613', email: 'yasmin.amon@labor.gov.il' },
    /* נכנסו לפריסה 9.9.26. אינם ברשימת המשתתפים של זימוני הרכזים, ולכן
       יש להם מייל בלבד — הטלפון יתווסף מהדף בכפתור "+ הוספת טלפון". */
    sigalit:  { phone: '', email: 'sigalit.day@labor.gov.il' },
    wesam:    { phone: '', email: 'wesam.swalha@labor.gov.il' }
    /* אחמד מחאמיד הוסר מהפריסה 9.9.26 (החלטת מיטל) — המקצועות שלו עברו ליסמין אמון. */
  }
};

/* פרטי קשר לפי slug — מחזיר תמיד אובייקט */
window.TS_contactOf = function (kind, slug) {
  const c = window.TS_CONTACTS || {};
  return ((c[kind] || {})[slug]) || { phone: '', email: '' };
};
