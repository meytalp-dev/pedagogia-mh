/* ==========================================================================
   משוב על האתר — pedagogiamh.co.il
   מקבל את מה ש-feedback.js שולח, כותב לגיליון ושולח התראה למייל.

   פריסה:
   1. script.google.com  →  פרויקט חדש  →  להדביק את כל הקובץ הזה
   2. Deploy → New deployment → Web app
        Execute as:      Me
        Who has access:  Anyone            ← חובה, אחרת הדפדפן ייחסם
   3. להעתיק את כתובת ה-/exec ולהדביק ב-feedback.js בשורה FEEDBACK_URL

   הגיליון נוצר לבד בהרצה הראשונה — אין צורך להכין כלום מראש.
   ========================================================================== */

var NOTIFY   = "merhav@pedagogiamh.co.il";   // לאן נשלחת ההתראה (עבר מ-bethaarava, 13.10.26)
var SS_NAME  = "משוב על האתר — פדגוגיה מ״ה";
var TAB      = "משוב אתר";
var HEADERS  = ["חותמת זמן", "נושא", "המשוב", "שם", "אימייל", "עמוד", "כתובת", "דפדפן/מכשיר"];

/* ------------------------- הגיליון (נוצר פעם אחת) ------------------------- */
function sheet_() {
  var props = PropertiesService.getScriptProperties();
  var id    = props.getProperty("SS_ID");
  var ss;

  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(SS_NAME);
    props.setProperty("SS_ID", ss.getId());
  }

  var sh = ss.getSheetByName(TAB);
  if (!sh) {
    sh = ss.insertSheet(TAB);
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#0B2E4F")
      .setFontColor("#FFFFFF");
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    sh.setColumnWidth(3, 420);   // עמודת המשוב — רחבה
    sh.setColumnWidth(7, 260);
  }
  return sh;
}

/* --------------------------------- קליטה --------------------------------- */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);

    var row = [
      new Date(),
      d.topic  || "כללי",
      d.text   || "",
      d.name   || "",
      d.email  || "",
      d.page   || "",
      d.url    || "",
      d.device || ""
    ];

    var sh = sheet_();
    sh.appendRow(row);
    sh.getRange(sh.getLastRow(), 3).setWrap(true);

    notify_(d, sh.getParent().getUrl());

    return json_({ ok: true });

  } catch (err) {
    // גם בכישלון מחזירים JSON תקין — כדי שהלקוח יציג נפילה מסודרת ולא יתקע
    return json_({ ok: false, error: String(err) });
  }
}

/* הרצה אחת מהעורך: יוצרת את הגיליון ומאשרת הרשאות גיליון + מייל */
function setup() {
  var url = sheet_().getParent().getUrl();
  MailApp.getRemainingDailyQuota();
  Logger.log("מוכן. הגיליון: " + url);
}

/* בדיקה מהירה מהדפדפן: פתיחת כתובת ה-exec צריכה להחזיר ok */
function doGet() {
  return json_({ ok: true, alive: true, sheet: sheet_().getParent().getUrl() });
}

/* ------------------------------- ההתראה --------------------------------- */
function notify_(d, sheetUrl) {
  if (!NOTIFY) return;

  var subject = "משוב חדש על האתר — " + (d.topic || "כללי");
  var who     = d.name || "אנונימי";
  var body =
      '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#12263A">' +
      '<p style="margin:0 0 14px"><b>' + esc_(who) + '</b> השאיר/ה משוב על האתר.</p>' +
      '<table cellpadding="7" style="border-collapse:collapse;font-size:14px">' +
      row_("נושא",   d.topic) +
      row_("המשוב",  d.text) +
      row_("עמוד",   d.page) +
      row_("כתובת",  d.url) +
      row_("אימייל", d.email) +
      '</table>' +
      '<p style="margin:16px 0 0"><a href="' + sheetUrl + '">פתיחת הגיליון המלא</a></p>' +
      '</div>';

  var opts = { htmlBody: body };
  if (d.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) opts.replyTo = d.email;

  MailApp.sendEmail(Object.assign({ to: NOTIFY, subject: subject }, opts));
}

function row_(label, val) {
  if (!val) return "";
  return '<tr>' +
         '<td style="background:#F1F5F9;font-weight:bold;white-space:nowrap;vertical-align:top">' + label + '</td>' +
         '<td>' + esc_(String(val)).replace(/\n/g, "<br>") + '</td>' +
         '</tr>';
}

function esc_(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
                       .setMimeType(ContentService.MimeType.JSON);
}

