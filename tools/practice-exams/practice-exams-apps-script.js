/**
 * מערכת תרגול מבחני גמר — הבית של המנהיגות הפדגוגית היוצרת · מינהל הכשרה מקצועית
 * Apps Script Backend (v2 — multi-teacher)
 *
 * תפקיד: קבלת הגשות מבחן מתלמידים, שמירה ב-Google Sheet,
 * ניהול מחוונים, ועדכון ציונים ידניים ע"י מורה.
 *
 * ═══════════════════════════════════════════════════════════════
 *  הוראות עדכון (לאחר שינוי מ-v1 ל-v2):
 * ═══════════════════════════════════════════════════════════════
 *
 * 1) הדביקי את כל הקובץ (Ctrl+A → Delete → Paste) במקום הקוד הקיים
 * 2) Save (Ctrl+S)
 * 3) הריצי setup — ייווצרו 2 טאבים חדשים: teachers, students
 * 4) Deploy → Manage deployments → עפרון "Edit" → Version: "New version" → Deploy
 *    (חשוב! בלי "New version" השינויים לא יעלו)
 * 5) ה-URL נשאר אותו URL — אין צורך לעדכן בקבצי HTML
 *
 * ═══════════════════════════════════════════════════════════════
 */

const ADMIN_EMAIL = 'mlypeleg@gmail.com';

const SHEET_SUBMISSIONS = 'submissions';
const SHEET_ANSWER_KEYS = 'answer_keys';
const SHEET_TEACHERS    = 'teachers';
const SHEET_STUDENTS    = 'students';
const SHEET_FEEDBACK    = 'feedback';
const SHEET_LOG         = 'log';

const SUBMISSION_HEADERS = [
  'submission_id', 'timestamp', 'exam_id', 'exam_title', 'sector', 'subject',
  'student_name', 'student_class', 'student_id',
  'teacher_code', 'teacher_name',
  'start_time', 'end_time', 'duration_sec',
  'correct', 'total_mc', 'earned_points', 'total_points_with_key',
  'pending_review', 'final_score', 'total_exam_points', 'review_status',
  'reviewed_by', 'reviewed_at', 'answers_json'
];

const ANSWER_KEY_HEADERS = ['exam_id', 'question_id', 'correct_answer', 'updated_at'];
const TEACHER_HEADERS    = ['teacher_code', 'name', 'email', 'pin', 'created_at', 'last_login'];
const STUDENT_HEADERS    = ['student_key', 'name', 'class', 'pin', 'teacher_code', 'created_at', 'last_login'];
const FEEDBACK_HEADERS   = ['timestamp', 'role', 'name', 'contact', 'subject', 'message', 'url'];
const LOG_HEADERS        = ['timestamp', 'action', 'details'];

// ============================================================
// setup — run once (also safe to re-run)
// ============================================================
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEET_SUBMISSIONS, SUBMISSION_HEADERS);
  ensureSheet_(ss, SHEET_ANSWER_KEYS, ANSWER_KEY_HEADERS);
  ensureSheet_(ss, SHEET_TEACHERS,    TEACHER_HEADERS);
  ensureSheet_(ss, SHEET_STUDENTS,    STUDENT_HEADERS);
  ensureSheet_(ss, SHEET_FEEDBACK,    FEEDBACK_HEADERS);
  ensureSheet_(ss, SHEET_LOG,         LOG_HEADERS);
  log_('setup', 'Sheets initialized');
  try { SpreadsheetApp.getUi().alert('מוכן! 5 טאבים נוצרו. עכשיו Deploy → Manage deployments → New version'); } catch(e) {}
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
}

// ============================================================
// doPost — all write/register/login operations
// ============================================================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'submit') {
      appendSubmission_(body.data);
      log_('submit', body.data.submissionId + ' · ' + body.data.student.name);
      return json_({ ok: true });
    }
    if (action === 'update') {
      updateSubmission_(body.data);
      log_('update', body.data.submissionId);
      return json_({ ok: true });
    }
    if (action === 'delete') {
      deleteSubmission_(body.submissionId);
      log_('delete', body.submissionId);
      return json_({ ok: true });
    }
    if (action === 'save-answer-key') {
      saveAnswerKey_(body.examId, body.key);
      log_('save-answer-key', body.examId);
      return json_({ ok: true });
    }
    if (action === 'register-teacher') {
      const res = registerTeacher_(body.name, body.email, body.pin);
      log_('register-teacher', body.name + ' · ' + (res.ok ? res.teacherCode : res.error));
      return json_(res);
    }
    if (action === 'login-teacher') {
      const res = loginTeacher_(body.name, body.pin);
      log_('login-teacher', body.name + ' · ' + (res.ok ? 'ok' : res.error));
      return json_(res);
    }
    if (action === 'register-or-login-student') {
      const res = registerOrLoginStudent_(body.name, body.class, body.pin, body.teacherCode);
      log_('student-login', body.name + ' · ' + body.class + ' · ' + (res.ok ? res.mode : res.error));
      return json_(res);
    }
    if (action === 'submit-feedback') {
      const res = submitFeedback_(body);
      log_('feedback', body.role + ' · ' + body.subject);
      return json_(res);
    }

    return json_({ ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    log_('error', String(err));
    return json_({ ok: false, error: String(err) });
  }
}

// ============================================================
// doGet — read operations for teacher dashboard
// ============================================================
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'submissions';
  const teacherCode = (e.parameter && e.parameter.teacherCode) || '';
  try {
    if (action === 'submissions') {
      return json_({ submissions: readSubmissions_(teacherCode) });
    }
    if (action === 'answer-keys') {
      return json_({ keys: readAnswerKeys_() });
    }
    if (action === 'teacher-info') {
      return json_({ teacher: readTeacherByCode_(teacherCode) });
    }
    return json_({ error: 'unknown action' });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// submissions
// ============================================================
function appendSubmission_(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SUBMISSIONS);
  const s = data.autoScore || {};
  sh.appendRow([
    data.submissionId,
    new Date(),
    data.examId, data.examTitle, data.sector, data.subject,
    data.student.name, data.student.class, data.student.id || '',
    data.teacherCode || '', data.teacherName || '',
    data.startTime, data.endTime, data.durationSec,
    s.correct || 0, s.totalMC || 0,
    s.earnedPoints || 0, s.totalPointsWithKey || 0,
    s.pendingReview || 0,
    data.finalScore != null ? data.finalScore : '',
    s.totalExamPoints || 0,
    data.reviewStatus, '', '',
    JSON.stringify(data.answers)
  ]);
}

function updateSubmission_(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SUBMISSIONS);
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.submissionId) {
      const s = data.autoScore || {};
      // Update columns 15-25 (correct through answers_json)
      sh.getRange(i + 1, 15, 1, 11).setValues([[
        s.correct || 0, s.totalMC || 0,
        s.earnedPoints || 0, s.totalPointsWithKey || 0,
        s.pendingReview || 0,
        data.finalScore != null ? data.finalScore : '',
        s.totalExamPoints || 0,
        data.reviewStatus,
        data.reviewedBy || '',
        data.reviewedAt || '',
        JSON.stringify(data.answers)
      ]]);
      return;
    }
  }
  appendSubmission_(data);
}

function deleteSubmission_(submissionId) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SUBMISSIONS);
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === submissionId) { sh.deleteRow(i + 1); return; }
  }
}

function readSubmissions_(teacherCode) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SUBMISSIONS);
  const values = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r[0]) continue;
    // Filter by teacher if provided
    if (teacherCode && r[9] !== teacherCode) continue;
    let answers = [];
    try { answers = JSON.parse(r[24] || '[]'); } catch (e) {}
    out.push({
      submissionId: r[0],
      examId: r[2], examTitle: r[3], sector: r[4], subject: r[5],
      student: { name: r[6], class: r[7], id: r[8] },
      teacherCode: r[9], teacherName: r[10],
      startTime: r[11], endTime: r[12], durationSec: r[13],
      autoScore: {
        correct: r[14], totalMC: r[15],
        earnedPoints: r[16], totalPointsWithKey: r[17],
        pendingReview: r[18], totalExamPoints: r[20]
      },
      finalScore: r[19] === '' ? null : Number(r[19]),
      reviewStatus: r[21], reviewedBy: r[22], reviewedAt: r[23],
      answers
    });
  }
  return out;
}

// ============================================================
// answer keys
// ============================================================
function saveAnswerKey_(examId, keyObj) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ANSWER_KEYS);
  const values = sh.getDataRange().getValues();
  for (let i = values.length - 1; i >= 1; i--) {
    if (values[i][0] === examId) sh.deleteRow(i + 1);
  }
  const now = new Date();
  const rows = Object.entries(keyObj).map(([qid, ans]) => [examId, qid, ans, now]);
  if (rows.length > 0) {
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
  }
}

function readAnswerKeys_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ANSWER_KEYS);
  const values = sh.getDataRange().getValues();
  const out = {};
  for (let i = 1; i < values.length; i++) {
    const [examId, qid, ans] = values[i];
    if (!examId) continue;
    if (!out[examId]) out[examId] = {};
    out[examId][qid] = ans;
  }
  return out;
}

// ============================================================
// teachers
// ============================================================
function generateTeacherCode_() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = 'TEA-';
  for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function registerTeacher_(name, email, pin) {
  if (!name || !pin) return { ok: false, error: 'שם ו-PIN חובה' };
  if (String(pin).length < 4) return { ok: false, error: 'PIN חייב 4 ספרות לפחות' };

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TEACHERS);
  const values = sh.getDataRange().getValues();
  const nameLower = String(name).trim().toLowerCase();

  // Check duplicate name
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]).trim().toLowerCase() === nameLower) {
      return { ok: false, error: 'השם כבר רשום במערכת. נסי להתחבר במקום להירשם.' };
    }
  }

  // Generate unique code
  let teacherCode;
  const existing = new Set(values.slice(1).map(r => r[0]));
  do { teacherCode = generateTeacherCode_(); } while (existing.has(teacherCode));

  sh.appendRow([teacherCode, name, email || '', String(pin), new Date(), new Date()]);
  return { ok: true, teacherCode, name, email };
}

function loginTeacher_(name, pin) {
  if (!name || !pin) return { ok: false, error: 'שם ו-PIN חובה' };
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TEACHERS);
  const values = sh.getDataRange().getValues();
  const nameLower = String(name).trim().toLowerCase();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]).trim().toLowerCase() === nameLower) {
      if (String(values[i][3]) !== String(pin)) {
        return { ok: false, error: 'PIN שגוי' };
      }
      // Update last_login
      sh.getRange(i + 1, 6).setValue(new Date());
      return {
        ok: true,
        teacherCode: values[i][0],
        name: values[i][1],
        email: values[i][2]
      };
    }
  }
  return { ok: false, error: 'שם לא נמצא. אולי צריך להירשם?' };
}

function readTeacherByCode_(teacherCode) {
  if (!teacherCode) return null;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TEACHERS);
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === teacherCode) {
      return { teacherCode: values[i][0], name: values[i][1], email: values[i][2] };
    }
  }
  return null;
}

// ============================================================
// students
// ============================================================
function registerOrLoginStudent_(name, cls, pin, teacherCode) {
  if (!name || !cls || !pin) return { ok: false, error: 'שם, כיתה ו-PIN חובה' };
  if (String(pin).length < 4) return { ok: false, error: 'PIN חייב 4 ספרות לפחות' };

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_STUDENTS);
  const values = sh.getDataRange().getValues();
  const studentKey = (String(name).trim() + '|' + String(cls).trim() + '|' + String(teacherCode || '')).toLowerCase();

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === studentKey) {
      // Existing student — verify PIN
      if (String(values[i][3]) !== String(pin)) {
        return { ok: false, error: 'PIN שגוי' };
      }
      sh.getRange(i + 1, 7).setValue(new Date());
      return { ok: true, mode: 'login', name, class: cls, teacherCode };
    }
  }

  // New student — register
  sh.appendRow([studentKey, name, cls, String(pin), teacherCode || '', new Date(), new Date()]);
  return { ok: true, mode: 'register', name, class: cls, teacherCode };
}

// ============================================================
// feedback
// ============================================================
function submitFeedback_(body) {
  const role = body.role || 'unknown';
  const name = body.name || 'אנונימי';
  const contact = body.contact || '';
  const subject = body.subject || 'ללא נושא';
  const message = body.message || '';
  const url = body.url || '';

  if (!message) return { ok: false, error: 'חובה להזין תוכן' };

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_FEEDBACK);
  sh.appendRow([new Date(), role, name, contact, subject, message, url]);

  try {
    const roleHe = role === 'teacher' ? 'מורה' : (role === 'student' ? 'תלמיד/ה' : role);
    const htmlBody =
      '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;">' +
        '<h2 style="color:#ec4899;">דיווח חדש ממערכת תרגול מבחני גמר</h2>' +
        '<table style="border-collapse:collapse;width:100%;">' +
          '<tr><td style="padding:8px;background:#f8fafc;font-weight:bold;">תפקיד</td><td style="padding:8px;">' + roleHe + '</td></tr>' +
          '<tr><td style="padding:8px;background:#f8fafc;font-weight:bold;">שם</td><td style="padding:8px;">' + name + '</td></tr>' +
          (contact ? '<tr><td style="padding:8px;background:#f8fafc;font-weight:bold;">צור קשר</td><td style="padding:8px;">' + contact + '</td></tr>' : '') +
          '<tr><td style="padding:8px;background:#f8fafc;font-weight:bold;">נושא</td><td style="padding:8px;">' + subject + '</td></tr>' +
          '<tr><td style="padding:8px;background:#f8fafc;font-weight:bold;vertical-align:top;">הודעה</td><td style="padding:8px;white-space:pre-wrap;">' + message + '</td></tr>' +
          (url ? '<tr><td style="padding:8px;background:#f8fafc;font-weight:bold;">דף</td><td style="padding:8px;"><a href="' + url + '">' + url + '</a></td></tr>' : '') +
        '</table>' +
        '<p style="color:#64748b;font-size:12px;margin-top:20px;">נשלח אוטומטית ממערכת תרגול מבחני גמר</p>' +
      '</div>';

    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      replyTo: contact && contact.indexOf('@') > -1 ? contact : ADMIN_EMAIL,
      subject: '[תרגול מבחנים] ' + subject + ' — ' + roleHe,
      htmlBody: htmlBody
    });
  } catch (e) {
    // Email fails silently — sheet row is saved
    log_('email-error', String(e));
  }

  return { ok: true };
}

// ============================================================
// log
// ============================================================
function log_(action, details) {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOG);
    sh.appendRow([new Date(), action, details]);
  } catch (e) {}
}
