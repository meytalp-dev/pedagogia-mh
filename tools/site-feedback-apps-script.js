/* =============================================================================
   משוב על האתר — Apps Script
   שומר כל משוב בלשונית "משוב אתר" בגיליון, ושולח התראה למייל.

   פריסה (פעם אחת):
   1. בגיליון:  תוספים ← Apps Script
   2. להדביק את כל הקובץ הזה בקובץ Code.gs (במקום מה שיש שם)
   3. לעדכן למטה את NOTIFY (כתובת המייל שתקבל התראות)
   4. פריסה ← פריסה חדשה ← סוג: אפליקציית אינטרנט
        "הפעלה בתור":    אני
        "מי יש לו גישה":  כל אחד            ← חשוב! אחרת השליחה מהאתר תיכשל
   5. להעתיק את כתובת ה-/exec ולהדביק אותה ב-feedback.js בשורה FEEDBACK_URL

   אחרי כל שינוי בקוד — פריסה ← ניהול פריסות ← עריכה (עיפרון) ← גרסה: חדשה ← פריסה.
   *לא* "פריסה חדשה" — אחרת הכתובת משתנה והאתר ממשיך לדבר עם הגרסה הישנה.
   ============================================================================= */

var NOTIFY = "meytalp@bethaarava.ort.org.il";   // לאן נשלחת ההתראה. אפשר כמה, מופרד בפסיקים
var SHEET  = "משוב אתר";

var HEADERS = ["תאריך", "קטגוריה", "המשוב", "עמוד", "כתובת", "שם", "אימייל", "מכשיר"];


/* ---------------------------- קליטת משוב ---------------------------- */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var text = String(d.text || "").trim();
    if (!text) return json({ ok: false, error: "empty" });

    var row = saveFeedback(d);
    try { notify(d, row); } catch (mailErr) { /* המשוב כבר נשמר — לא מפילים בגלל מייל */ }
    return json({ ok: true, row: row });

  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* גישה ישירה לכתובת — בדיקה שהפריסה חיה, ו-?mode=count למונה */
function doGet(e) {
  var mode = e && e.parameter ? e.parameter.mode : "";
  if (mode === "count") {
    return json({ ok: true, count: Math.max(0, sheet().getLastRow() - 1) });
  }
  return json({ ok: true, service: "site-feedback", sheet: SHEET });
}


/* ---------------------------- שמירה בגיליון ---------------------------- */
function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(HEADERS);
    var head = sh.getRange(1, 1, 1, HEADERS.length);
    head.setFontWeight("bold").setBackground("#0D3B66").setFontColor("#FFFFFF");
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 140);   // תאריך
    sh.setColumnWidth(2, 120);   // קטגוריה
    sh.setColumnWidth(3, 420);   // המשוב
    sh.setColumnWidth(4, 200);   // עמוד
    sh.setColumnWidth(5, 260);   // כתובת
    sh.getRange("C:C").setWrap(true);
  }
  return sh;
}

function saveFeedback(d) {
  var sh = sheet();
  sh.appendRow([
    new Date(),
    String(d.topic  || "כללי"),
    String(d.text   || "").slice(0, 5000),
    String(d.page   || ""),
    String(d.url    || ""),
    String(d.name   || ""),
    String(d.email  || ""),
    String(d.device || "").slice(0, 300)
  ]);
  return sh.getLastRow();
}


/* ---------------------------- התראה למייל ---------------------------- */
function notify(d, row) {
  if (!NOTIFY) return;

  var who  = d.name ? d.name : "מבקר/ת באתר";
  var page = d.page || d.url || "האתר";

  var html =
    '<div style="font-family:Assistant,Arial,sans-serif;direction:rtl;text-align:right;max-width:560px">' +
      '<div style="background:linear-gradient(135deg,#124D7A,#087B9C);color:#fff;padding:18px 22px;border-radius:14px 14px 0 0">' +
        '<div style="font-size:13px;opacity:.85">משוב חדש מהאתר</div>' +
        '<div style="font-size:19px;font-weight:800;margin-top:3px">' + esc(d.topic || "כללי") + '</div>' +
      '</div>' +
      '<div style="border:1px solid #D8E6F2;border-top:0;border-radius:0 0 14px 14px;padding:20px 22px;background:#fff">' +
        '<div style="font-size:15px;line-height:1.7;color:#102A43;white-space:pre-wrap">' + esc(d.text || "") + '</div>' +
        '<hr style="border:0;border-top:1px solid #E6EFF7;margin:18px 0">' +
        '<table style="font-size:13px;color:#52687A;line-height:1.9">' +
          rowHtml("מאת",    esc(who) + (d.email ? ' &lt;' + esc(d.email) + '&gt;' : "")) +
          rowHtml("עמוד",   esc(page)) +
          rowHtml("קישור",  '<a href="' + esc(d.url || "") + '" style="color:#0B7FA6">' + esc(d.url || "") + '</a>') +
          rowHtml("שורה",   row) +
        '</table>' +
      '</div>' +
    '</div>';

  MailApp.sendEmail({
    to:       NOTIFY,
    subject:  "משוב על האתר — " + (d.topic || "כללי") + " · " + page,
    htmlBody: html,
    replyTo:  d.email && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(d.email) ? d.email : undefined,
    name:     "הבית של המנהיגות הפדגוגית היוצרת"
  });
}

function rowHtml(k, v) {
  return '<tr><td style="padding-left:14px;font-weight:700;color:#0D3B66;white-space:nowrap">' + k + '</td><td>' + v + '</td></tr>';
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ---------------------------- בדיקה מתוך העורך ----------------------------
   להריץ פעם אחת (בחירת testFeedback ← Run) — כדי לאשר הרשאות ולוודא
   שהלשונית נוצרת ושההתראה מגיעה. אחר כך למחוק את שורת הבדיקה מהגיליון.  */
function testFeedback() {
  doPost({ postData: { contents: JSON.stringify({
    topic: "בדיקה",
    text:  "בדיקת חיבור — אפשר למחוק את השורה הזו.",
    name:  "בדיקה",
    email: "",
    page:  "בדיקה מתוך העורך",
    url:   "https://pedagogiamh.co.il/",
    device:"Apps Script editor"
  }) } });
}
