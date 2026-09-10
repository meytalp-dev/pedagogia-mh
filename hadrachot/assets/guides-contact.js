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
    /* ---------- החברה היהודית · המגזר הכללי ---------- */
    shira:    { phone: '050-9040252', email: 'Shirasib@gmail.com' },      /* מתמטיקה 3 יח"ל */
    sivan:    { phone: '052-8285022', email: 'sivann66@gmail.com' },      /* אנגלית */
    moria:    { phone: '054-3168002', email: 'moriah.flint@gmail.com' },  /* עברית */
    nira:     { phone: '054-4642841', email: 'nira23101969@gmail.com' },  /* ספרות */
    dana:     { phone: '050-3149106', email: '' },                        /* היסטוריה — אין מייל */
    elisheva: { phone: '',            email: 'e7co@hotmail.com' },        /* אזרחות — אין טלפון */
    tali:     { phone: '050-2219000', email: 'Tali.lu.aharon@gmail.com' },/* תנ"ך */
    gal:      { phone: '054-5542889', email: '' },                        /* מתמטיקה 4-5 — אין מייל */

    /* ---------- החברה היהודית · המגזר החרדי ----------
       נפתח 10.9.26. הפרטים התקבלו מהמדריכות עצמן ישירות (ולא מגיליון
       ההרשאות או מקובץ "רשימת מדריכים"), ולכן זה המקור היחיד שלהם. */
    sarah:    { phone: '',            email: '1895barda@gmail.com' },     /* ספרות — אין טלפון */
    rivka:    { phone: '052-7654555', email: 'rnrn2222@gmail.com' },      /* היסטוריה + אזרחות */
    dina:     { phone: '',            email: 'Dinarot2@gmail.com' },      /* תנ"ך — אין טלפון */

    /* ---------- החברה הערבית ---------- */
    suha:     { phone: '052-8616162', email: 'soha38815@gmail.com' },     /* עברית */
    rozin:    { phone: '054-8116623', email: 'Rozeen_mtr@yahoo.com' },    /* אנגלית */
    wael:     { phone: '052-4069544', email: 'laianw@walla.co.il' },      /* ערבית */
    rima:     { phone: '054-6211885', email: 'Rimabransi@gmail.com' },    /* ספרות */
    abed:     { phone: '052-2618595', email: '' },                        /* היסטוריה — אין מייל */
    khaled:   { phone: '052-5618070', email: 'gabarinkhalid@gmail.com' }, /* אזרחות */
    moshe:    { phone: '052-2978071', email: 'Moshassor@gmail.com' },     /* מתמטיקה */
    suliman:  { phone: '052-8621691', email: '' },                        /* מתמטיקה — אין מייל */
    mansour:  { phone: '',            email: '' },                        /* מורשת אסלאמית — אין כלום */
    muzna:    { phone: '052-7789995', email: '' }                         /* מורשת דרוזית — אין מייל */
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
    /* נכנסו לפריסה 9.9.26. אינם ברשימת המשתתפים של זימוני הרכזים —
       הטלפונים התקבלו ישירות ממיטל (9.9.26). */
    sigalit:  { phone: '052-3253793', email: 'sigalit.day@labor.gov.il' },
    wesam:    { phone: '050-6290288', email: 'wesam.swalha@labor.gov.il' }
    /* אחמד מחאמיד הוסר מהפריסה 9.9.26 (החלטת מיטל) — המקצועות שלו עברו ליסמין אמון. */
  }
};

/* פרטי קשר לפי slug — מחזיר תמיד אובייקט */
window.TS_contactOf = function (kind, slug) {
  const c = window.TS_CONTACTS || {};
  return ((c[kind] || {})[slug]) || { phone: '', email: '' };
};
