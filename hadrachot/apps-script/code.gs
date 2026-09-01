/**
 * Training Supervision — Apps Script Backend
 * מערכת פיקוח הדרכות משרד העבודה
 *
 * Sheets schema (8 tabs):
 *   networks    — id, name, color, contactEmail
 *   schools     — id, name, network, principalName, principalEmail, principalPhone
 *   teachers    — id, school, network, name, subject, type, sector, seniority,
 *                 units, students, phone, email, moeApproval, moeFile,
 *                 pdActive, pdFile, pdYear, createdAt
 *   trainings   — id, date, subject, guideName, guideEmail, network, sector, location, notes
 *   attendance  — id, trainingId, teacherId, status (present/absent), notes, timestamp
 *   pd          — id, teacherId, subject, year, status, fileUrl, addedAt
 *   questions   — id, teacherId, question, answer, status (open/answered), createdAt, answeredAt
 *   knowledge   — id, title, category, audience, link, description, addedAt
 *
 * Deploy: Web App → Anyone → Execute as Me
 */

// ============================================================
// SETUP
// ============================================================

const TABS = ['networks','schools','teachers','trainings','attendance','pd','questions','knowledge','feedback','alerts','users','subjects','audit_log'];

const SCHEMA = {
  networks:   ['id','name','color','contactEmail'],
  schools:    ['id','name','network','principalName','principalEmail','principalPhone','attendanceTarget'],
  teachers:   ['id','school','network','name','subject','subjectId','type','sector','seniority',
               'units','students','phone','email','moeApproval','moeFile',
               'pdActive','pdFile','pdYear','createdAt','schoolName','notes'],
  trainings:  ['id','date','subject','subjectId','guideName','guideEmail','network','sector','location','notes',
               'qrToken','materialsUrl','curriculumTopic','feedbackEnabled'],
  attendance: ['id','trainingId','teacherId','status','notes','timestamp','checkedInVia'],
  pd:         ['id','teacherId','subject','year','status','fileUrl','addedAt'],
  questions:  ['id','teacherId','question','answer','status','createdAt','answeredAt'],
  knowledge:  ['id','title','category','audience','link','description','addedAt'],
  feedback:   ['id','trainingId','teacherId','rating','comment','createdAt'],
  alerts:     ['id','type','severity','message','targetRole','targetId','createdAt','resolvedAt'],
  // Phase 1 hardening
  users:      ['id','email','name','role','networkId','schoolId','subjectId','guideId','active','createdAt'],
  subjects:   ['id','name','code','order','active'],
  audit_log:  ['id','timestamp','userEmail','action','targetType','targetId','status','notes']
};

// תפקידים נתמכים — סדר היררכי
const ROLES = {
  MINISTRY_ADMIN: 'ministry_admin',
  NETWORK_ADMIN: 'network_admin',
  SCHOOL_ADMIN: 'school_admin',
  SUBJECT_COORDINATOR: 'school_subject_coordinator',
  GUIDE: 'guide'
};
const ADMIN_ROLES = [ROLES.MINISTRY_ADMIN];  // לפעולות seed/alerts/certificate

// מקצועות עיוניים — לסידור subjects tab בטעינה ראשונה
const SEED_SUBJECTS = [
  ['subj_math',    'מתמטיקה',  'MATH', 1, 'TRUE'],
  ['subj_eng',     'אנגלית',   'ENG',  2, 'TRUE'],
  ['subj_heb',     'עברית',    'HEB',  3, 'TRUE'],
  ['subj_lit',     'ספרות',    'LIT',  4, 'TRUE'],
  ['subj_history', 'היסטוריה', 'HIST', 5, 'TRUE'],
  ['subj_civics',  'אזרחות',   'CIV',  6, 'TRUE'],
  ['subj_bible',   'תנ"ך',     'BIBL', 7, 'TRUE'],
  ['subj_arabic',  'ערבית',    'ARAB', 8, 'TRUE']
];

const SEED_NETWORKS = [
  ['net_ort',             'אורט',         'ort',             ''],
  ['net_amal',            'עמל',          'amal',            ''],
  ['net_atid',            'עתיד',         'atid',            ''],
  ['net_sakhnin',         'סכנין',        'sakhnin',         ''],
  ['net_dror',            'דרור',         'dror',            ''],
  ['net_ezraei_haredi',   'עצמאי חרדי',   'ezraei_haredi',   ''],
  ['net_beit_el',         'בית אל',       'beit_el',         ''],
  ['net_kanada_israel',   'קנדה ישראל',   'kanada_israel',   ''],
  ['net_shulamit_haredi', 'שלומית חרדי',  'shulamit_haredi', '']
];

function setupSchema() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  TABS.forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(SCHEMA[name]);
      sheet.getRange(1, 1, 1, SCHEMA[name].length)
           .setFontWeight('bold')
           .setBackground('#f5f7fa');
      sheet.setFrozenRows(1);
    } else {
      // הוספת עמודות חסרות לטאבים קיימים (לא שובר נתונים קיימים)
      const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const expected = SCHEMA[name];
      const missing = expected.filter(col => !existing.includes(col));
      if (missing.length) {
        const startCol = sheet.getLastColumn() + 1;
        sheet.getRange(1, startCol, 1, missing.length).setValues([missing])
             .setFontWeight('bold').setBackground('#fff7ed');
      }
    }
  });

  // Seed networks
  const netsSheet = ss.getSheetByName('networks');
  if (netsSheet.getLastRow() === 1) {
    SEED_NETWORKS.forEach(row => netsSheet.appendRow(row));
  }

  // Seed subjects (Phase 1)
  const subjSheet = ss.getSheetByName('subjects');
  if (subjSheet.getLastRow() === 1) {
    SEED_SUBJECTS.forEach(row => subjSheet.appendRow(row));
  }

  // Seed first ministry admin — Owner של ה-Sheet הופך לאדמין ראשי
  const usersSheet = ss.getSheetByName('users');
  if (usersSheet.getLastRow() === 1) {
    const ownerEmail = (ss.getOwner() && ss.getOwner().getEmail()) || Session.getActiveUser().getEmail();
    usersSheet.appendRow([
      'usr_seed_admin', ownerEmail, 'אדמין ראשי',
      ROLES.MINISTRY_ADMIN, '', '', '', '', 'TRUE',
      new Date().toISOString()
    ]);
  }

  // Sample school + sample teacher (delete later)
  const schools = ss.getSheetByName('schools');
  if (schools.getLastRow() === 1) {
    schools.appendRow(['sch_ort_beit_haarava', 'אורט בית הערבה', 'net_ort', 'מיטל פלג', 'meytalp@bethaarava.ort.org.il', '', 80]);
  }

  SpreadsheetApp.getUi().alert('✓ הסכמה הוקמה / עודכנה. הסשן מוכן לפריסה.');
}

// ============================================================
// ROUTING (GET + POST)
// ============================================================

function doGet(e) {
  return handleRequest(e.parameter);
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { body = e.parameter || {}; }
  return handleRequest(body);
}

// ============================================================
// AUTH + SCOPING (Phase 1 hardening)
// ============================================================
// כל endpoint שלא נמצא ב-PUBLIC_ACTIONS חייב לעבור requireAuthAndScope.
// המשתמש מזוהה לפי Session.getActiveUser().getEmail() — דורש שב-Web App יוגדר
// "Execute as: User accessing the web app" + "Who has access: Anyone in Google Workspace".

const PUBLIC_ACTIONS = new Set([
  // צ'ק-אין QR חייב להישאר פתוח — מורות לא מחוברות
  'qr.training', 'qr.checkin'
]);

const ADMIN_ONLY_ACTIONS = new Set([
  'seed.import',
  'alerts.compute',
  'certificate.generate',
  'admin.reset',
  'school.delete'
]);

function getActiveUserEmail_() {
  try {
    return (Session.getActiveUser().getEmail() || '').toLowerCase();
  } catch (e) { return ''; }
}

function findUserByEmail_(email) {
  if (!email) return null;
  const users = readAll('users');
  return users.find(u =>
    (u.email || '').toLowerCase() === email.toLowerCase() &&
    String(u.active).toUpperCase() !== 'FALSE'
  ) || null;
}

// requireAuthAndScope(params, action) → { user, scope } | throws
// Backward compat: אם users tab ריק (mode הקמה), פותח את הכל כדי לא לשבור פיילוטים פעילים.
// ברגע שמוסיפים משתמש ראשון לטאב users — Auth נכפה אוטומטית על כל הפעולות שאינן ציבוריות.
function requireAuthAndScope(params, action) {
  if (PUBLIC_ACTIONS.has(action)) {
    return { user: null, scope: { public: true } };
  }
  // Bootstrap mode: אם אין משתמשים מוגדרים — לאפשר כדי לא להפיל מערכת חיה
  const usersAll = readAll('users');
  if (!usersAll.length) {
    return { user: null, scope: { role: 'bootstrap' } };
  }
  const email = getActiveUserEmail_();
  if (!email) {
    throw new Error('unauthenticated — נא להיכנס עם חשבון Google');
  }
  const user = findUserByEmail_(email);
  if (!user) {
    throw new Error('user_not_provisioned: ' + email);
  }
  if (ADMIN_ONLY_ACTIONS.has(action) && ADMIN_ROLES.indexOf(user.role) < 0) {
    throw new Error('forbidden_admin_required');
  }
  // אכיפת scope לפי תפקיד
  const scope = enforceScope_(user, params, action);
  return { user, scope };
}

// מחזיר את ה-scope של המשתמש + מאמת ש-params לא חורגים מ-scope
function enforceScope_(user, params, action) {
  const role = user.role;
  const out = { role };

  if (role === ROLES.MINISTRY_ADMIN) {
    return out;  // ministry רואה הכל
  }
  if (role === ROLES.NETWORK_ADMIN) {
    if (!user.networkId) throw new Error('user_missing_network');
    out.networkId = user.networkId;
    // אם פעולה דורשת network פרמטר — חייב להיות שלו
    if (params.network && params.network !== user.networkId && params.network !== user.networkId.replace(/^net_/, '')) {
      throw new Error('forbidden_network_scope');
    }
    return out;
  }
  if (role === ROLES.SCHOOL_ADMIN || role === ROLES.SUBJECT_COORDINATOR) {
    if (!user.schoolId) throw new Error('user_missing_school');
    out.schoolId = user.schoolId;
    if (role === ROLES.SUBJECT_COORDINATOR) {
      if (!user.subjectId) throw new Error('coordinator_missing_subject');
      out.subjectId = user.subjectId;
    }
    if (params.school && params.school !== user.schoolId) {
      throw new Error('forbidden_school_scope');
    }
    return out;
  }
  if (role === ROLES.GUIDE) {
    if (!user.guideId && !user.email) throw new Error('user_missing_guide');
    out.guideEmail = user.email.toLowerCase();
    if (params.guide && params.guide.toLowerCase() !== out.guideEmail) {
      throw new Error('forbidden_guide_scope');
    }
    return out;
  }
  throw new Error('unknown_role: ' + role);
}

// ============================================================
// CACHE (Phase 1 hardening) — CacheService.getScriptCache()
// ============================================================
// CacheService מוגבל ל-100KB פר key, ו-9KB עבור key name. אם הערך גדול מ-90KB
// נחלק ל-chunks. TTL מקסימלי 6 שעות.

const CACHE_TTLS = {
  'guide.dashboard':    8 * 60,   // 8 דק'
  'school.dashboard':   8 * 60,   // 8 דק'
  'network.dashboard':  12 * 60,  // 12 דק'
  'ministry.dashboard': 20 * 60,  // 20 דק'
  'networks.list':      30 * 60,
  'subjects.list':      30 * 60
};
const CACHE_BYTE_LIMIT = 90 * 1024;
const CHUNK_PREFIX = '__chunk__';

function cacheKeyFor_(action, scope, params) {
  const scopeKey = JSON.stringify({
    role: scope.role || 'public',
    nid: scope.networkId || '',
    sid: scope.schoolId || '',
    subj: scope.subjectId || '',
    g: scope.guideEmail || ''
  });
  const paramsKey = JSON.stringify(params || {});
  return action + '|' + scopeKey + '|' + paramsKey;
}

function withCache_(action, scope, params, computeFn) {
  const ttl = CACHE_TTLS[action];
  if (!ttl) return computeFn();
  const cache = CacheService.getScriptCache();
  const key = cacheKeyFor_(action, scope, params);
  const cached = readCacheChunked_(cache, key);
  if (cached) return cached;
  const fresh = computeFn();
  writeCacheChunked_(cache, key, fresh, ttl);
  return fresh;
}

function readCacheChunked_(cache, key) {
  try {
    const meta = cache.get(key);
    if (!meta) return null;
    if (!meta.startsWith(CHUNK_PREFIX)) return JSON.parse(meta);
    const chunkCount = parseInt(meta.slice(CHUNK_PREFIX.length), 10);
    let combined = '';
    for (let i = 0; i < chunkCount; i++) {
      const part = cache.get(key + '#' + i);
      if (!part) return null;  // chunk missing → cache miss
      combined += part;
    }
    return JSON.parse(combined);
  } catch (e) { return null; }
}

function writeCacheChunked_(cache, key, value, ttl) {
  try {
    const s = JSON.stringify(value);
    if (s.length <= CACHE_BYTE_LIMIT) {
      cache.put(key, s, ttl);
      return;
    }
    const chunks = [];
    for (let i = 0; i < s.length; i += CACHE_BYTE_LIMIT) {
      chunks.push(s.slice(i, i + CACHE_BYTE_LIMIT));
    }
    const map = { [key]: CHUNK_PREFIX + chunks.length };
    chunks.forEach((c, i) => { map[key + '#' + i] = c; });
    cache.putAll(map, ttl);
  } catch (e) { /* silent */ }
}

function invalidateCache_(prefix) {
  // Apps Script CacheService לא תומך ב-remove-by-prefix. הפתרון: TTL קצר וגישת
  // "stale-write" — אחרי כל כתיבה משמעותית, הקליינט יעדכן את ה-cache שלו בעצמו.
  // כאן נשמור hook ריק לטובת קוד עתידי.
}

// ============================================================
// AUDIT LOG (Phase 1 hardening)
// ============================================================
function auditLog_(userEmail, action, targetType, targetId, status, notes) {
  try {
    appendRow('audit_log', {
      id: newId('aud'),
      timestamp: new Date().toISOString(),
      userEmail: userEmail || 'anonymous',
      action: action,
      targetType: targetType || '',
      targetId: targetId || '',
      status: status || 'ok',
      notes: notes || ''
    });
  } catch (e) { /* never break the request on audit failure */ }
}

function handleRequest(params) {
  const action = params.action || '';
  let userEmail = '';
  try {
    const { user, scope } = requireAuthAndScope(params, action);
    userEmail = user ? user.email : '';
    let result;
    switch (action) {
      case 'networks.list':       result = listNetworks(); break;
      case 'schools.list':        result = listSchools(params.network); break;
      case 'school.get':          result = getSchool(params.id); break;
      case 'school.create':       result = createSchool(params); break;
      case 'school.update':       result = updateSchool(params); break;
      case 'school.delete':       result = deleteSchool(params); break;

      case 'admin.reset':         result = adminReset(params); break;

      case 'teachers.list':       result = listTeachers(params); break;
      case 'teacher.get':         result = getTeacher(params.id); break;
      case 'teachers.create':     result = createTeacher(params); break;
      case 'teachers.update':     result = updateTeacher(params); break;
      case 'teachers.delete':     result = deleteTeacher(params); break;

      case 'trainings.list':      result = listTrainings(params); break;
      case 'training.create':     result = createTraining(params); break;

      case 'attendance.record':   result = recordAttendance(params); break;
      case 'attendance.bulk':     result = recordBulkAttendance(params); break;
      case 'attendance.monthly':  result = monthlyAttendance(params); break;
      case 'attendance.teacher':  result = teacherAttendance(params.teacherId); break;
      case 'attendance.training': result = trainingAttendance(params.trainingId); break;

      case 'pd.list':             result = listPD(params.teacherId); break;
      case 'pd.create':           result = createPD(params); break;

      case 'questions.list':      result = listQuestions(params); break;
      case 'questions.create':    result = createQuestion(params); break;
      case 'questions.answer':    result = answerQuestion(params); break;

      case 'knowledge.list':      result = listKnowledge(params); break;
      case 'knowledge.create':    result = createKnowledge(params); break;

      case 'reports.school':      result = schoolReport(params); break;
      case 'reports.network':     result = networkReport(params); break;
      case 'reports.ministry':    result = ministryReport(params); break;
      case 'reports.trend':       result = trendReport(params); break;
      case 'reports.heatmap':     result = heatmapReport(params); break;

      case 'qr.checkin':          result = qrCheckin(params); break;
      case 'qr.training':         result = getTrainingByToken(params.token); break;

      case 'feedback.submit':     result = submitFeedback(params); break;
      case 'feedback.list':       result = listFeedback(params); break;

      case 'certificate.generate':result = generateCertificate(params); break;

      case 'alerts.list':         result = listAlerts(params); break;
      case 'alerts.compute':      result = computeAlerts(); break;

      case 'calendar.ics':        result = exportIcs(params); break;

      case 'seed.import':         result = seedImport(params); break;
      case 'guide.dashboard':     result = withCache_('guide.dashboard',    scope, params, () => guideDashboard(applyScopeParams_(params, scope, 'guide'))); break;
      case 'school.dashboard':    result = withCache_('school.dashboard',   scope, params, () => schoolDashboard(applyScopeParams_(params, scope, 'school'))); break;
      case 'ministry.dashboard':  result = withCache_('ministry.dashboard', scope, params, () => ministryDashboard(params)); break;
      case 'network.dashboard':   result = withCache_('network.dashboard',  scope, params, () => networkDashboard(applyScopeParams_(params, scope, 'network'))); break;

      default: result = { ok: false, error: 'unknown_action: ' + action };
    }
    auditLog_(userEmail, action, 'endpoint', '', result && result.ok ? 'ok' : 'error', '');
    return jsonOut(result);
  } catch (err) {
    auditLog_(userEmail, action, 'endpoint', '', 'error', err.message);
    return jsonOut({ ok: false, error: err.message, stack: err.stack });
  }
}

// השלמת פרמטרים מתוך scope (כדי שמנהל ביה"ס לא יכול לטעון בית ספר אחר)
function applyScopeParams_(params, scope, kind) {
  const out = Object.assign({}, params);
  if (kind === 'school') {
    if (scope.schoolId) out.school = scope.schoolId;
    if (scope.subjectId && scope.role === ROLES.SUBJECT_COORDINATOR) {
      // רכז פדגוגי תקוע במקצוע שלו
      const subj = readAll('subjects').find(s => s.id === scope.subjectId);
      if (subj) out.subject = subj.name;
    }
  }
  if (kind === 'network') {
    if (scope.networkId) out.network = scope.networkId;
  }
  if (kind === 'guide') {
    if (scope.guideEmail) out.guide = scope.guideEmail;
  }
  return out;
}

// ============================================================
// HELPERS
// ============================================================

function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function readAll(name) {
  const s = sheet(name);
  if (!s) return [];
  const range = s.getDataRange().getValues();
  if (range.length < 2) return [];
  const headers = range[0];
  return range.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function appendRow(name, obj) {
  const s = sheet(name);
  // חשוב: כותבים לפי סדר העמודות הפיזי בגיליון (לא לפי SCHEMA), כי setupSchema
  // מוסיף עמודות חדשות בסוף ולכן הסדר עלול להיות שונה מ-SCHEMA. כתיבה לפי SCHEMA
  // הזיזה את כל הערכים עמודה (שם→מקצוע וכו'). שורת הכותרות הפיזית היא מקור האמת.
  const headers = (s.getLastColumn() >= 1)
    ? s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].filter(String)
    : SCHEMA[name];
  const row = headers.map(h => {
    if (obj[h] === undefined) return '';
    if (typeof obj[h] === 'boolean') return obj[h] ? 'TRUE' : 'FALSE';
    return obj[h];
  });
  s.appendRow(row);
  return obj;
}

function updateRowById(name, id, updates) {
  const s = sheet(name);
  const range = s.getDataRange().getValues();
  const headers = range[0];
  const idCol = headers.indexOf('id');
  for (let i = 1; i < range.length; i++) {
    if (range[i][idCol] === id) {
      Object.keys(updates).forEach(k => {
        const col = headers.indexOf(k);
        if (col >= 0) {
          let v = updates[k];
          if (typeof v === 'boolean') v = v ? 'TRUE' : 'FALSE';
          s.getRange(i + 1, col + 1).setValue(v);
        }
      });
      return true;
    }
  }
  return false;
}

function newId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return /^(true|1|yes|on)$/i.test(v.trim());
  return !!v;
}

function thisMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function monthKey(date) {
  const d = new Date(date);
  if (isNaN(d)) return '';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// ============================================================
// NETWORKS
// ============================================================

function listNetworks() {
  return { ok: true, data: readAll('networks') };
}

// ============================================================
// SCHOOLS
// ============================================================

function listSchools(network) {
  let data = readAll('schools');
  if (network) data = data.filter(s => s.network === network);
  return { ok: true, data };
}
function getSchool(id) {
  const found = readAll('schools').find(s => s.id === id);
  return { ok: true, data: found || null };
}
function createSchool(p) {
  const obj = {
    id: newId('sch'),
    name: p.name,
    network: p.network,
    principalName: p.principalName || '',
    principalEmail: p.principalEmail || '',
    principalPhone: p.principalPhone || ''
  };
  appendRow('schools', obj);
  return { ok: true, data: obj };
}

function updateSchool(p) {
  if (!p.id) return { ok: false, error: 'missing_id' };
  const updates = {};
  ['name','network','principalName','principalEmail','principalPhone','attendanceTarget'].forEach(k => {
    if (p[k] !== undefined) updates[k] = p[k];
  });
  const ok = updateRowById('schools', p.id, updates);
  return ok ? getSchool(p.id) : { ok: false, error: 'not_found' };
}

// מחיקת בית ספר — מסרב אם יש מורים משויכים, אלא אם force=true
function deleteSchool(p) {
  if (!p.id) return { ok: false, error: 'missing_id' };
  const attached = readAll('teachers').filter(t => t.school === p.id).length;
  if (attached && !toBool(p.force)) return { ok: false, error: 'has_teachers: ' + attached };
  const s = sheet('schools');
  const range = s.getDataRange().getValues();
  const idCol = range[0].indexOf('id');
  for (let i = range.length - 1; i >= 1; i--) {
    if (range[i][idCol] === p.id) { s.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'not_found' };
}

// איפוס שנתון — מוחק את כל שורות הנתונים בטאבים שנבחרו (שורת הכותרות נשארת).
// שימוש: ?action=admin.reset&tabs=teachers,attendance&confirm=RESET
function adminReset(p) {
  const ALLOWED = ['teachers','attendance','trainings','pd','questions','knowledge','feedback','alerts','schools'];
  if ((p.confirm || '') !== 'RESET') return { ok: false, error: 'missing_confirm_RESET' };
  const tabs = Array.isArray(p.tabs) ? p.tabs : String(p.tabs || '').split(',').map(t => t.trim()).filter(Boolean);
  if (!tabs.length) return { ok: false, error: 'missing_tabs' };
  const summary = {};
  tabs.forEach(name => {
    if (ALLOWED.indexOf(name) < 0) { summary[name] = 'not_allowed'; return; }
    const s = sheet(name);
    if (!s) { summary[name] = 'sheet_missing'; return; }
    const last = s.getLastRow();
    if (last > 1) s.deleteRows(2, last - 1);
    summary[name] = 'cleared_' + Math.max(0, last - 1) + '_rows';
  });
  auditLog_('', 'admin.reset', 'tabs', tabs.join(','), 'ok', '');
  return { ok: true, data: summary };
}

// ============================================================
// TEACHERS
// ============================================================

function listTeachers(p) {
  let data = readAll('teachers').map(t => ({...t, moeApproval: toBool(t.moeApproval), pdActive: toBool(t.pdActive)}));
  if (p.school)   data = data.filter(t => t.school === p.school);
  if (p.network)  data = data.filter(t => t.network === p.network);
  if (p.subject)  data = data.filter(t => t.subject === p.subject);
  if (p.sector)   data = data.filter(t => t.sector === p.sector);
  return { ok: true, data };
}

function getTeacher(id) {
  const found = readAll('teachers').find(t => t.id === id);
  if (found) {
    found.moeApproval = toBool(found.moeApproval);
    found.pdActive = toBool(found.pdActive);
  }
  return { ok: true, data: found || null };
}

function createTeacher(p) {
  const obj = {
    id: newId('tch'),
    school: p.school || '',
    schoolName: p.schoolName || '',
    network: (p.network || '').toString().replace(/^net_/, ''),
    name: p.name,
    subject: p.subject,
    type: p.type || 'bagrut',
    sector: p.sector || 'kelali',
    seniority: parseInt(p.seniority || 0, 10),
    units: p.units || '',
    students: parseInt(p.students || 0, 10),
    phone: p.phone || '',
    email: p.email || '',
    notes: p.notes || '',
    moeApproval: toBool(p.moeApproval),
    moeFile: p.moeFile || '',
    pdActive: toBool(p.pdActive),
    pdFile: p.pdFile || '',
    pdYear: p.pdYear || '',
    createdAt: new Date().toISOString()
  };
  appendRow('teachers', obj);
  return { ok: true, data: obj };
}

function updateTeacher(p) {
  if (!p.id) return { ok: false, error: 'missing_id' };
  const updates = {};
  ['name','schoolName','subject','type','sector','seniority','units','students','phone','email','moeApproval','moeFile','pdActive','pdFile','pdYear'].forEach(k => {
    if (p[k] !== undefined && p[k] !== '') updates[k] = p[k];
  });
  // notes — מותר לעדכן גם לערך ריק (מחיקת הערה)
  if (p.notes !== undefined) updates.notes = p.notes;
  // network — מנרמלים (ללא קידומת net_) כדי לתאום את תצוגת הצ'יפ
  if (p.network !== undefined && p.network !== '') updates.network = p.network.toString().replace(/^net_/, '');
  if (p.moeApproval !== undefined) updates.moeApproval = toBool(p.moeApproval);
  if (p.pdActive !== undefined) updates.pdActive = toBool(p.pdActive);
  const ok = updateRowById('teachers', p.id, updates);
  return { ok };
}

// מחיקת מורה — מסירה את שורת המורה. רישומי נוכחות היסטוריים נשארים אך לא יוצגו
// בדשבורד (מוצגים רק מורים שקיימים בטאב). אם cleanAttendance=true — מוחק גם נוכחות.
function deleteTeacher(p) {
  if (!p.id) return { ok: false, error: 'missing_id' };
  const s = sheet('teachers');
  const range = s.getDataRange().getValues();
  const headers = range[0];
  const idCol = headers.indexOf('id');
  let removed = false;
  for (let i = range.length - 1; i >= 1; i--) {
    if (range[i][idCol] === p.id) { s.deleteRow(i + 1); removed = true; break; }
  }
  if (!removed) return { ok: false, error: 'not_found' };

  if (toBool(p.cleanAttendance)) {
    const as = sheet('attendance');
    const ar = as.getDataRange().getValues();
    const tCol = ar[0].indexOf('teacherId');
    for (let i = ar.length - 1; i >= 1; i--) {
      if (ar[i][tCol] === p.id) as.deleteRow(i + 1);
    }
  }
  return { ok: true };
}

// ============================================================
// TRAININGS
// ============================================================

function listTrainings(p) {
  let data = readAll('trainings');
  if (p.network)  data = data.filter(t => t.network === p.network);
  if (p.sector)   data = data.filter(t => t.sector === p.sector);
  if (p.month)    data = data.filter(t => monthKey(t.date) === p.month);
  if (p.guide)    data = data.filter(t => t.guideEmail === p.guide);
  return { ok: true, data };
}

function createTraining(p) {
  const obj = {
    id: newId('trn'),
    date: p.date || new Date().toISOString().slice(0,10),
    subject: p.subject,
    guideName: p.guideName || '',
    guideEmail: p.guideEmail || '',
    network: p.network || '',
    sector: p.sector || '',
    location: p.location || '',
    notes: p.notes || '',
    qrToken: Utilities.getUuid().replace(/-/g, '').slice(0, 16),
    materialsUrl: p.materialsUrl || '',
    curriculumTopic: p.curriculumTopic || '',
    feedbackEnabled: p.feedbackEnabled !== false
  };
  appendRow('trainings', obj);
  return { ok: true, data: obj };
}

// ============================================================
// ATTENDANCE
// ============================================================

function recordAttendance(p) {
  const obj = {
    id: newId('att'),
    trainingId: p.trainingId,
    teacherId: p.teacherId,
    status: p.status || 'present',
    notes: p.notes || '',
    timestamp: new Date().toISOString()
  };
  appendRow('attendance', obj);
  return { ok: true, data: obj };
}

function recordBulkAttendance(p) {
  const records = p.records || [];
  if (typeof records === 'string') {
    try { records = JSON.parse(records); } catch (e) {}
  }
  const created = [];
  records.forEach(r => {
    created.push(recordAttendance({
      trainingId: p.trainingId,
      teacherId: r.teacherId,
      status: r.status,
      notes: r.notes || ''
    }).data);
  });
  return { ok: true, count: created.length };
}

function monthlyAttendance(p) {
  // returns { teacherId: { thisMonth: 'present'/'missed', lastMissedDate: '...' } }
  const month = p.month || thisMonthKey();
  const trainings = readAll('trainings').filter(t => monthKey(t.date) === month);
  if (p.network)  trainings.filter(t => t.network === p.network);
  const trainingIds = new Set(trainings.map(t => t.id));
  const attRecords = readAll('attendance').filter(a => trainingIds.has(a.trainingId));

  // Get relevant teachers
  let teachers = readAll('teachers');
  if (p.school)   teachers = teachers.filter(t => t.school === p.school);
  if (p.network)  teachers = teachers.filter(t => t.network === p.network);

  const out = {};
  teachers.forEach(t => {
    const rec = attRecords.filter(a => a.teacherId === t.id);
    const present = rec.find(a => a.status === 'present');
    out[t.id] = {
      thisMonth: present ? 'present' : (trainings.length ? 'missed' : null),
      lastMissedDate: trainings.length && !present ? trainings.map(tr => tr.date).sort().pop() : null,
      trainingsCount: trainings.length,
      attendedCount: rec.filter(a => a.status === 'present').length
    };
  });
  return { ok: true, data: out };
}

function trainingAttendance(trainingId) {
  const data = readAll('attendance').filter(a => a.trainingId === trainingId);
  return { ok: true, data };
}

function teacherAttendance(teacherId) {
  const records = readAll('attendance').filter(a => a.teacherId === teacherId);
  const trainingIds = records.map(r => r.trainingId);
  const trainings = readAll('trainings').filter(t => trainingIds.includes(t.id));
  const trainingsById = Object.fromEntries(trainings.map(t => [t.id, t]));
  const enriched = records.map(r => ({
    ...r,
    training: trainingsById[r.trainingId] || null
  })).sort((a,b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  return { ok: true, data: enriched };
}

// ============================================================
// PD (Professional Development / השתלמויות)
// ============================================================

function listPD(teacherId) {
  let data = readAll('pd');
  if (teacherId) data = data.filter(p => p.teacherId === teacherId);
  return { ok: true, data };
}

function createPD(p) {
  const obj = {
    id: newId('pd'),
    teacherId: p.teacherId,
    subject: p.subject,
    year: p.year || new Date().getFullYear(),
    status: p.status || 'active',
    fileUrl: p.fileUrl || '',
    addedAt: new Date().toISOString()
  };
  appendRow('pd', obj);
  // Update teacher pdActive flag
  if (obj.status === 'active') {
    updateRowById('teachers', p.teacherId, { pdActive: true, pdFile: obj.fileUrl, pdYear: obj.year });
  }
  return { ok: true, data: obj };
}

// ============================================================
// QUESTIONS (Teacher → Guide)
// ============================================================

function listQuestions(p) {
  let data = readAll('questions');
  if (p.teacherId) data = data.filter(q => q.teacherId === p.teacherId);
  if (p.status)    data = data.filter(q => q.status === p.status);
  return { ok: true, data };
}

function createQuestion(p) {
  const obj = {
    id: newId('q'),
    teacherId: p.teacherId,
    question: p.question,
    answer: '',
    status: 'open',
    createdAt: new Date().toISOString(),
    answeredAt: ''
  };
  appendRow('questions', obj);
  return { ok: true, data: obj };
}

function answerQuestion(p) {
  const ok = updateRowById('questions', p.id, {
    answer: p.answer,
    status: 'answered',
    answeredAt: new Date().toISOString()
  });
  return { ok };
}

// ============================================================
// KNOWLEDGE BASE
// ============================================================

function listKnowledge(p) {
  let data = readAll('knowledge');
  if (p.category) data = data.filter(k => k.category === p.category);
  if (p.audience) data = data.filter(k => !k.audience || k.audience === 'all' || k.audience === p.audience);
  return { ok: true, data };
}

function createKnowledge(p) {
  const obj = {
    id: newId('kn'),
    title: p.title,
    category: p.category || '',
    audience: p.audience || 'all',
    link: p.link || '',
    description: p.description || '',
    addedAt: new Date().toISOString()
  };
  appendRow('knowledge', obj);
  return { ok: true, data: obj };
}

// ============================================================
// REPORTS (Aggregated views)
// ============================================================

function schoolReport(p) {
  const teachers = readAll('teachers').filter(t => t.school === p.school);
  const attRes = monthlyAttendance({ school: p.school, month: p.month });
  const attData = attRes.data;
  const present = teachers.filter(t => attData[t.id]?.thisMonth === 'present').length;
  const missed = teachers.filter(t => attData[t.id]?.thisMonth === 'missed').length;
  const inPD = teachers.filter(t => toBool(t.pdActive)).length;
  return {
    ok: true,
    data: {
      total: teachers.length,
      present, missed, inPD,
      rate: teachers.length ? Math.round((present / teachers.length) * 100) : 0,
      missedTeachers: teachers.filter(t => attData[t.id]?.thisMonth === 'missed')
    }
  };
}

function networkReport(p) {
  const schools = readAll('schools').filter(s => s.network === p.network);
  const teachers = readAll('teachers').filter(t => t.network === p.network);
  const attRes = monthlyAttendance({ network: p.network, month: p.month });
  const attData = attRes.data;
  const bySector = { haredi: 0, arab: 0, kelali: 0 };
  teachers.forEach(t => { if (bySector[t.sector] !== undefined) bySector[t.sector]++; });
  const present = teachers.filter(t => attData[t.id]?.thisMonth === 'present').length;
  const missed = teachers.filter(t => attData[t.id]?.thisMonth === 'missed').length;
  return {
    ok: true,
    data: {
      schools: schools.length,
      teachers: teachers.length,
      present, missed,
      inPD: teachers.filter(t => toBool(t.pdActive)).length,
      rate: teachers.length ? Math.round((present / teachers.length) * 100) : 0,
      bySector,
      schoolBreakdown: schools.map(s => {
        const schTeachers = teachers.filter(t => t.school === s.id);
        const schPresent = schTeachers.filter(t => attData[t.id]?.thisMonth === 'present').length;
        return {
          id: s.id,
          name: s.name,
          teachers: schTeachers.length,
          present: schPresent,
          rate: schTeachers.length ? Math.round((schPresent / schTeachers.length) * 100) : 0
        };
      })
    }
  };
}

function ministryReport(p) {
  const networks = readAll('networks');
  const teachers = readAll('teachers');
  const attRes = monthlyAttendance({ month: p.month });
  const attData = attRes.data;
  return {
    ok: true,
    data: {
      networks: networks.length,
      schools: readAll('schools').length,
      teachers: teachers.length,
      present: teachers.filter(t => attData[t.id]?.thisMonth === 'present').length,
      missed: teachers.filter(t => attData[t.id]?.thisMonth === 'missed').length,
      inPD: teachers.filter(t => toBool(t.pdActive)).length,
      networkBreakdown: networks.map(n => {
        const netTeachers = teachers.filter(t => t.network === n.id);
        const netPresent = netTeachers.filter(t => attData[t.id]?.thisMonth === 'present').length;
        const sector = { haredi: 0, arab: 0, kelali: 0 };
        netTeachers.forEach(t => { if (sector[t.sector] !== undefined) sector[t.sector]++; });
        return {
          id: n.id,
          name: n.name,
          color: n.color,
          teachers: netTeachers.length,
          present: netPresent,
          missed: netTeachers.length - netPresent,
          rate: netTeachers.length ? Math.round((netPresent / netTeachers.length) * 100) : 0,
          sector
        };
      })
    }
  };
}

// ============================================================
// MONTHLY EMAIL TRIGGER (run on the 1st of each month)
// ============================================================

function monthlyEmailReports() {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const monthStr = lastMonth.getFullYear() + '-' + String(lastMonth.getMonth() + 1).padStart(2, '0');

  // To school principals
  readAll('schools').forEach(s => {
    if (!s.principalEmail) return;
    const rpt = schoolReport({ school: s.id, month: monthStr }).data;
    const body = [
      `דוח חודשי — ${s.name}`,
      ``,
      `מורים: ${rpt.total}`,
      `נוכחות: ${rpt.rate}% (${rpt.present}/${rpt.total})`,
      `פספסו: ${rpt.missed}`,
      `בהשתלמות: ${rpt.inPD}`,
      ``,
      rpt.missedTeachers.length ? `מורים שפספסו:\n${rpt.missedTeachers.map(t => '- ' + t.name + ' (' + t.subject + ')').join('\n')}` : '',
    ].filter(Boolean).join('\n');
    MailApp.sendEmail(s.principalEmail, `דוח הדרכות חודשי — ${s.name}`, body);
  });
}

// helper: install a time trigger that runs monthlyEmailReports on the 1st at 08:00
function installMonthlyTrigger() {
  ScriptApp.newTrigger('monthlyEmailReports')
    .timeBased()
    .onMonthDay(1)
    .atHour(8)
    .create();
  SpreadsheetApp.getUi().alert('✓ הטריגר החודשי הותקן.');
}

// ============================================================
// QR CHECK-IN — מורה סורקת ב-QR ונרשמת אוטומטית
// ============================================================

function getTrainingByToken(token) {
  if (!token) return { ok: false, error: 'missing_token' };
  const t = readAll('trainings').find(x => x.qrToken === token);
  if (!t) return { ok: false, error: 'token_not_found' };
  return { ok: true, data: t };
}

function qrCheckin(p) {
  if (!p.token) return { ok: false, error: 'missing_params' };
  const training = readAll('trainings').find(x => x.qrToken === p.token);
  if (!training) return { ok: false, error: 'invalid_token' };

  let teacherId = p.teacherId;

  // רישום פתוח — מורה שאינה ברשימה: מאתרים לפי טלפון/שם או יוצרים רשומה חדשה
  if (!teacherId) {
    const name = (p.teacherName || '').toString().trim();
    if (!name) return { ok: false, error: 'missing_params' };
    const phoneDigits = (p.phone || '').toString().replace(/\D/g, '');
    const net = (p.network || '').toString().replace(/^net_/, '');
    const subject = training.subject || p.subject || '';
    const schoolName = (p.schoolName || '').toString().trim();
    const teachers = readAll('teachers');

    let match = null;
    if (phoneDigits) {
      match = teachers.find(t => (t.phone || '').toString().replace(/\D/g, '') === phoneDigits && phoneDigits.length >= 9);
    }
    if (!match) {
      match = teachers.find(t =>
        (t.name || '').toString().trim() === name &&
        (!subject || t.subject === subject) &&
        (
          (schoolName && (t.schoolName || '').toString().trim() === schoolName) ||
          (net && (t.network || '').toString().replace(/^net_/, '') === net)
        )
      );
    }

    if (match) {
      teacherId = match.id;
    } else {
      const created = createTeacher({
        name: name,
        schoolName: schoolName,
        network: net,
        subject: subject,
        phone: phoneDigits,
        sector: p.sector || 'kelali'
      });
      teacherId = created.data.id;
    }
  }

  // הימנעות מרישום כפול
  const existing = readAll('attendance').find(a => a.trainingId === training.id && a.teacherId === teacherId);
  if (existing) {
    return { ok: true, data: { duplicate: true, training } };
  }

  const obj = {
    id: newId('att'),
    trainingId: training.id,
    teacherId: teacherId,
    status: 'present',
    notes: 'check-in via QR',
    timestamp: new Date().toISOString(),
    checkedInVia: 'qr'
  };
  appendRow('attendance', obj);
  return { ok: true, data: { duplicate: false, training, attendance: obj } };
}

// ============================================================
// FEEDBACK — דירוג איכות הדרכה ע"י המורה
// ============================================================

function submitFeedback(p) {
  // הימנעות מדירוג כפול
  const existing = readAll('feedback').find(f => f.trainingId === p.trainingId && f.teacherId === p.teacherId);
  if (existing) {
    updateRowById('feedback', existing.id, { rating: p.rating, comment: p.comment || '' });
    return { ok: true, data: { updated: true } };
  }
  const obj = {
    id: newId('fb'),
    trainingId: p.trainingId,
    teacherId: p.teacherId,
    rating: parseInt(p.rating, 10),
    comment: p.comment || '',
    createdAt: new Date().toISOString()
  };
  appendRow('feedback', obj);
  return { ok: true, data: obj };
}

function listFeedback(p) {
  let data = readAll('feedback');
  if (p.trainingId) data = data.filter(f => f.trainingId === p.trainingId);
  if (p.guideEmail) {
    const trainings = readAll('trainings').filter(t => t.guideEmail === p.guideEmail).map(t => t.id);
    data = data.filter(f => trainings.includes(f.trainingId));
  }
  // אגרגציה אופציונלית
  if (data.length) {
    const avg = data.reduce((s, f) => s + (parseFloat(f.rating) || 0), 0) / data.length;
    return { ok: true, data, avg: Math.round(avg * 10) / 10, count: data.length };
  }
  return { ok: true, data: [], avg: 0, count: 0 };
}

// ============================================================
// TREND REPORTS — גרף מגמות חודשי
// ============================================================

function trendReport(p) {
  // מחזיר 6 חודשים אחרונים — אחוז נוכחות פר חודש
  const months = lastNMonths(p.months || 6);
  const allTrainings = readAll('trainings');
  const allAttendance = readAll('attendance');
  let teachers = readAll('teachers');
  if (p.network) teachers = teachers.filter(t => t.network === p.network);
  if (p.school)  teachers = teachers.filter(t => t.school === p.school);
  const teacherIds = new Set(teachers.map(t => t.id));

  const series = months.map(m => {
    const monthTrainings = allTrainings.filter(t => monthKey(t.date) === m);
    if (p.network) monthTrainings.filter(t => !t.network || t.network === p.network);
    if (!monthTrainings.length || !teachers.length) {
      return { month: m, rate: null, present: 0, total: 0 };
    }
    const trainingIdSet = new Set(monthTrainings.map(t => t.id));
    const presentTeachers = new Set(
      allAttendance
        .filter(a => trainingIdSet.has(a.trainingId) && a.status === 'present' && teacherIds.has(a.teacherId))
        .map(a => a.teacherId)
    );
    return {
      month: m,
      rate: Math.round((presentTeachers.size / teachers.length) * 100),
      present: presentTeachers.size,
      total: teachers.length
    };
  });

  return { ok: true, data: { series, months, totalTeachers: teachers.length } };
}

function lastNMonths(n) {
  const out = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0'));
  }
  return out;
}

function heatmapReport(p) {
  // מטריצה: רשת × מקצוע = אחוז נוכחות
  const teachers = readAll('teachers');
  const attendance = readAll('attendance');
  const trainings = readAll('trainings');
  const month = p.month || thisMonthKey();
  const monthTrainings = trainings.filter(t => monthKey(t.date) === month);
  const trainingMap = Object.fromEntries(monthTrainings.map(t => [t.id, t]));

  const cells = {};
  TS_subjects().forEach(subj => {
    cells[subj] = {};
    readAll('networks').forEach(net => {
      const cellTeachers = teachers.filter(t => t.subject === subj && t.network === net.id);
      if (!cellTeachers.length) { cells[subj][net.id] = null; return; }
      const present = cellTeachers.filter(t =>
        attendance.some(a => a.teacherId === t.id && a.status === 'present' && trainingMap[a.trainingId])
      ).length;
      cells[subj][net.id] = Math.round((present / cellTeachers.length) * 100);
    });
  });

  return { ok: true, data: { cells, subjects: Object.keys(cells) } };
}

function TS_subjects() {
  return ['מתמטיקה','אנגלית','עברית','ספרות','היסטוריה','אזרחות','תנ"ך','ערבית'];
}

// ============================================================
// SUBJECTS MIGRATION HELPERS (Phase 1)
// ============================================================
// ממפים את ה-subject (מחרוזת חופשית בעברית) ל-subjectId קנוני בטאב subjects.
// קריאה: migrateSubjects() → עוברת על teachers + trainings ומעדכנת subjectId.

function getSubjectIdMap_() {
  const map = {};
  readAll('subjects').forEach(s => {
    if (s.name) map[s.name] = s.id;
  });
  return map;
}

function migrateSubjects() {
  const map = getSubjectIdMap_();
  const summary = { teachers: 0, trainings: 0, unmapped: [] };

  // teachers
  const teachers = readAll('teachers');
  teachers.forEach(t => {
    if (t.subjectId || !t.subject) return;
    const id = map[t.subject];
    if (id) {
      updateRowById('teachers', t.id, { subjectId: id });
      summary.teachers++;
    } else if (summary.unmapped.indexOf(t.subject) < 0) {
      summary.unmapped.push(t.subject);
    }
  });

  // trainings
  const trainings = readAll('trainings');
  trainings.forEach(tr => {
    if (tr.subjectId || !tr.subject) return;
    const id = map[tr.subject];
    if (id) {
      updateRowById('trainings', tr.id, { subjectId: id });
      summary.trainings++;
    } else if (summary.unmapped.indexOf(tr.subject) < 0) {
      summary.unmapped.push(tr.subject);
    }
  });

  return summary;
}

// ============================================================
// CERTIFICATE — תעודה אוטומטית בסוף שנה
// ============================================================

function generateCertificate(p) {
  if (!p.teacherId) return { ok: false, error: 'missing_teacherId' };
  const teacher = readAll('teachers').find(t => t.id === p.teacherId);
  if (!teacher) return { ok: false, error: 'teacher_not_found' };

  const school = readAll('schools').find(s => s.id === teacher.school);
  const network = readAll('networks').find(n => n.id === teacher.network);
  const year = p.year || new Date().getFullYear();
  const target = (school && school.attendanceTarget) || 80;

  // חישוב נוכחות שנתית
  const attendance = readAll('attendance').filter(a => a.teacherId === teacher.id);
  const trainings = readAll('trainings');
  const yearTrainings = trainings.filter(t => new Date(t.date).getFullYear() === year);
  const yearAttendance = attendance.filter(a =>
    yearTrainings.some(t => t.id === a.trainingId)
  );
  const present = yearAttendance.filter(a => a.status === 'present').length;
  const total = yearTrainings.filter(t =>
    !t.subject || t.subject === teacher.subject
  ).length;
  const rate = total ? Math.round((present / total) * 100) : 0;
  const eligible = rate >= target;

  // יצירת מסמך
  const docName = `תעודה — ${teacher.name} — ${year}`;
  const doc = DocumentApp.create(docName);
  const body = doc.getBody();
  body.setMarginTop(72).setMarginBottom(72).setMarginLeft(72).setMarginRight(72);

  // כותרת
  const title = body.appendParagraph('תעודת השתתפות');
  title.setHeading(DocumentApp.ParagraphHeading.TITLE);
  title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  const subtitle = body.appendParagraph(`תוכנית הדרכות מורים ${year}`);
  subtitle.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  subtitle.editAsText().setBold(true).setFontSize(14);

  body.appendParagraph('').setSpacingAfter(20);
  body.appendParagraph('ניתנת בזה ל-')
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
    .editAsText().setFontSize(12);

  const name = body.appendParagraph(teacher.name);
  name.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  name.editAsText().setBold(true).setFontSize(28);

  body.appendParagraph('').setSpacingAfter(20);
  const summary = [
    `מורה ל${teacher.subject}`,
    `${(network && network.name) || ''} · ${(school && school.name) || ''}`,
    '',
    `אחוז השתתפות שנתי: ${rate}%`,
    `(${present} מתוך ${total} הדרכות)`,
    '',
    eligible
      ? `עמדה בדרישות התוכנית (מינימום ${target}% השתתפות)`
      : `יעד התוכנית: ${target}% — לא הושלם השנה`
  ];
  summary.forEach(line => {
    const p2 = body.appendParagraph(line);
    p2.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    p2.editAsText().setFontSize(13);
  });

  body.appendParagraph('').setSpacingAfter(40);
  const stamp = body.appendParagraph('משרד העבודה · יחידת הפיקוח על הדרכות');
  stamp.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  stamp.editAsText().setItalic(true).setFontSize(11);

  const dateLine = body.appendParagraph(`הופק: ${new Date().toLocaleDateString('he-IL')}`);
  dateLine.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  dateLine.editAsText().setFontSize(10).setForegroundColor('#666666');

  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // המרה ל-PDF
  const pdfBlob = file.getAs('application/pdf');
  const pdfFile = DriveApp.createFile(pdfBlob).setName(docName + '.pdf');
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    ok: true,
    data: {
      eligible, rate, present, total, target,
      docUrl: doc.getUrl(),
      pdfUrl: pdfFile.getUrl(),
      pdfId: pdfFile.getId()
    }
  };
}

// ============================================================
// ALERTS — התראות יזומות
// ============================================================

function listAlerts(p) {
  let data = readAll('alerts').filter(a => !a.resolvedAt);
  if (p.targetRole) data = data.filter(a => a.targetRole === p.targetRole);
  if (p.targetId)   data = data.filter(a => a.targetId === p.targetId);
  return { ok: true, data };
}

function computeAlerts() {
  // לוגיקה: מורה שפספסה 2 חודשים ברציפות
  const teachers = readAll('teachers');
  const trainings = readAll('trainings');
  const attendance = readAll('attendance');
  const newAlerts = [];
  const months = lastNMonths(2);

  teachers.forEach(t => {
    const missed = months.every(m => {
      const monthTrainings = trainings.filter(tr =>
        monthKey(tr.date) === m &&
        (!tr.subject || tr.subject === t.subject)
      );
      if (!monthTrainings.length) return false;
      const wasPresent = monthTrainings.some(tr =>
        attendance.some(a => a.trainingId === tr.id && a.teacherId === t.id && a.status === 'present')
      );
      return !wasPresent;
    });

    if (missed) {
      // האם כבר יש התראה פתוחה לזה?
      const existing = readAll('alerts').find(a =>
        a.targetId === t.id && a.type === 'missed_2months' && !a.resolvedAt
      );
      if (existing) return;
      const obj = {
        id: newId('alr'),
        type: 'missed_2months',
        severity: 'warn',
        message: `${t.name} (${t.subject}) פספסה הדרכות חודשיים ברציפות`,
        targetRole: 'school',
        targetId: t.school,
        createdAt: new Date().toISOString(),
        resolvedAt: ''
      };
      appendRow('alerts', obj);
      newAlerts.push(obj);
    }
  });

  return { ok: true, data: { newAlerts, count: newAlerts.length } };
}

// ============================================================
// CALENDAR ICS EXPORT
// ============================================================

function exportIcs(p) {
  let trainings = readAll('trainings');
  if (p.teacherId) {
    const teacher = readAll('teachers').find(t => t.id === p.teacherId);
    if (teacher) {
      trainings = trainings.filter(t => !t.subject || t.subject === teacher.subject);
      if (teacher.sector) trainings = trainings.filter(t => !t.sector || t.sector === teacher.sector);
    }
  }
  if (p.guideEmail) trainings = trainings.filter(t => t.guideEmail === p.guideEmail);

  const ics = buildIcs(trainings);
  return { ok: true, data: { ics } };
}

function buildIcs(trainings) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Training Supervision//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];
  trainings.forEach(t => {
    const d = new Date(t.date);
    if (isNaN(d)) return;
    const dt = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + t.id + '@training-supervision');
    lines.push('DTSTART;VALUE=DATE:' + dt);
    lines.push('DTEND;VALUE=DATE:' + dt);
    lines.push('SUMMARY:הדרכת ' + (t.subject || ''));
    lines.push('LOCATION:' + (t.location || ''));
    lines.push('DESCRIPTION:' + (t.notes || '').replace(/\n/g, '\\n'));
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ============================================================
// SEED IMPORT — טעינת חבילת נתונים מ-JSON (לפיילוטים)
// ============================================================
// קלט: { tabs: { networks: [...], schools: [...], teachers: [...], trainings: [...], attendance: [...] } }
// מתנהג כ-upsert לפי id: רשומה קיימת תעודכן, חדשה תתווסף.

function seedImport(params) {
  const tabs = params.tabs || (params.payload && params.payload.tabs) || {};
  const order = ['networks','schools','teachers','trainings','attendance','pd','knowledge'];
  const summary = {};

  order.forEach(name => {
    if (!Array.isArray(tabs[name])) return;
    const s = sheet(name);
    if (!s) { summary[name] = { error: 'sheet_missing' }; return; }
    const range = s.getDataRange().getValues();
    const headers = range[0];
    // שורות חדשות נכתבות לפי הכותרות הפיזיות (headers), לא לפי SCHEMA — אחרת
    // הערכים מוסטים כשסדר העמודות בגיליון שונה מסדר SCHEMA.
    const schemaHeaders = headers && headers.length ? headers : (SCHEMA[name] || []);
    const idCol = headers.indexOf('id');
    const existingIds = {};
    for (let i = 1; i < range.length; i++) {
      if (range[i][idCol]) existingIds[range[i][idCol]] = i + 1;
    }

    // Phase 1 — אסוף שורות חדשות לכתיבה בקריאה אחת (setValues)
    const newRows = [];
    let updated = 0;
    tabs[name].forEach(obj => {
      const id = obj.id;
      if (!id) return;
      if (existingIds[id]) {
        // עדכון — קריאה פר שורה
        const rowNum = existingIds[id];
        const updates = headers.map((h, idx) => {
          if (obj[h] === undefined) return range[rowNum - 1][idx];  // נשאר ערך קיים
          let v = obj[h];
          if (typeof v === 'boolean') v = v ? 'TRUE' : 'FALSE';
          return v;
        });
        s.getRange(rowNum, 1, 1, headers.length).setValues([updates]);
        updated++;
      } else {
        const row = schemaHeaders.map(h => {
          if (obj[h] === undefined) return '';
          if (typeof obj[h] === 'boolean') return obj[h] ? 'TRUE' : 'FALSE';
          return obj[h];
        });
        newRows.push(row);
      }
    });

    // Phase 2 — הוספת כל השורות החדשות בקריאה אחת
    if (newRows.length) {
      const startRow = s.getLastRow() + 1;
      s.getRange(startRow, 1, newRows.length, schemaHeaders.length).setValues(newRows);
    }

    summary[name] = { added: newRows.length, updated, total: tabs[name].length };
  });

  return { ok: true, data: summary };
}

// ============================================================
// GUIDE DASHBOARD — כל המידע שמדריכ/ה צריכ/ה במסך אחד
// ============================================================
// קלט: { guide: 'email' }
// פלט: { guide, trainings, teachers (כולל היסטוריית נוכחות) }

function guideDashboard(params) {
  const guideEmail = (params.guide || '').toLowerCase();
  if (!guideEmail) return { ok: false, error: 'missing_guide_email' };

  const allTrainings = readAll('trainings').filter(
    t => (t.guideEmail || '').toLowerCase() === guideEmail
  );
  if (!allTrainings.length) {
    return { ok: true, data: { guide: guideEmail, trainings: [], teachers: [], subject: '' } };
  }

  const subject = allTrainings[0].subject || '';
  const trainingIds = allTrainings.map(t => t.id);

  const allAttendance = readAll('attendance').filter(a => trainingIds.indexOf(a.trainingId) >= 0);
  const teachers = readAll('teachers').filter(t => t.subject === subject);
  const schools = {};
  readAll('schools').forEach(s => { schools[s.id] = s; });
  const networks = {};
  readAll('networks').forEach(n => { networks[n.id] = n; });

  // הצמדת היסטוריית נוכחות לכל מורה
  const enriched = teachers.map(t => {
    const records = allAttendance.filter(a => a.teacherId === t.id);
    const byTraining = {};
    records.forEach(r => { byTraining[r.trainingId] = { status: r.status, notes: r.notes }; });
    const presentCount = records.filter(r => r.status === 'present').length;
    const partialCount = records.filter(r => r.status === 'partial').length;
    const totalSessions = allTrainings.length;
    const sch = schools[t.school] || {};
    const netKey = (t.network || '').toString().replace(/^net_/, '');
    return {
      id: t.id,
      name: t.name,
      phone: t.phone,
      email: t.email,
      notes: t.notes || '',
      school: t.school,
      schoolName: t.schoolName || sch.name || '— ללא שיוך —',
      network: netKey,
      networkName: (networks['net_' + netKey] || networks[netKey] || {}).name || netKey,
      attendance: byTraining,
      stats: {
        present: presentCount,
        partial: partialCount,
        total: totalSessions,
        rate: totalSessions ? Math.round(((presentCount + 0.5 * partialCount) / totalSessions) * 100) : 0
      }
    };
  });

  // מיון: לפי בית ספר, אז לפי שם
  enriched.sort((a, b) => {
    if (a.schoolName !== b.schoolName) return a.schoolName.localeCompare(b.schoolName, 'he');
    return (a.name || '').localeCompare(b.name || '', 'he');
  });

  // מיון הדרכות מהכי ישנה לכי חדשה
  allTrainings.sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    ok: true,
    data: {
      guide: guideEmail,
      guideName: allTrainings[0].guideName || '',
      subject,
      trainings: allTrainings,
      teachers: enriched
    }
  };
}

// ============================================================
// SCHOOL DASHBOARD — לכל מנהל/רכז פדגוגי של בית ספר
// ============================================================
// קלט: { school: 'sch_xxx', subject?: 'מתמטיקה' }
// פלט: כל המורים של בית הספר + היסטוריית נוכחות חוצת מקצועות

function schoolDashboard(params) {
  const schoolId = params.school || '';
  const subjectFilter = params.subject || '';
  if (!schoolId) return { ok: false, error: 'missing_school' };

  const schools = readAll('schools');
  const school = schools.filter(s => s.id === schoolId)[0];
  if (!school) return { ok: false, error: 'school_not_found' };

  const networks = {};
  readAll('networks').forEach(n => { networks[n.id] = n; });

  let teachers = readAll('teachers').filter(t => t.school === schoolId);
  if (subjectFilter) teachers = teachers.filter(t => t.subject === subjectFilter);

  // הדרכות בכל המקצועות של המורים הנ"ל
  const allSubjects = subjectFilter ? [subjectFilter] : Array.from(new Set(teachers.map(t => t.subject)));
  const allTrainings = readAll('trainings').filter(t => allSubjects.indexOf(t.subject) >= 0);
  const trainingIds = allTrainings.map(t => t.id);

  const allAttendance = readAll('attendance').filter(a => trainingIds.indexOf(a.trainingId) >= 0);

  // הצמדת נוכחות לכל מורה
  const enriched = teachers.map(t => {
    const records = allAttendance.filter(a => a.teacherId === t.id);
    const byTraining = {};
    records.forEach(r => { byTraining[r.trainingId] = { status: r.status, notes: r.notes }; });
    const teacherTrainings = allTrainings.filter(tr => tr.subject === t.subject);
    const presentCount = records.filter(r => r.status === 'present').length;
    const partialCount = records.filter(r => r.status === 'partial').length;
    const total = teacherTrainings.length;
    return {
      id: t.id,
      name: t.name,
      subject: t.subject,
      phone: t.phone,
      email: t.email,
      attendance: byTraining,
      stats: {
        present: presentCount,
        partial: partialCount,
        total: total,
        rate: total ? Math.round(((presentCount + 0.5 * partialCount) / total) * 100) : 0
      }
    };
  });

  // מיון: לפי מקצוע אז לפי שם
  enriched.sort((a, b) => {
    if (a.subject !== b.subject) return (a.subject || '').localeCompare(b.subject || '', 'he');
    return (a.name || '').localeCompare(b.name || '', 'he');
  });

  // מקצועות + הדרכותיהם
  const subjects = {};
  allSubjects.forEach(subj => {
    const subjTrainings = allTrainings
      .filter(tr => tr.subject === subj)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    subjects[subj] = subjTrainings;
  });

  const totalTeachers = enriched.length;
  const avgRate = totalTeachers
    ? Math.round(enriched.reduce((s, t) => s + t.stats.rate, 0) / totalTeachers)
    : 0;

  const networkName = (networks['net_' + school.network] || networks[school.network] || {}).name || school.network;

  return {
    ok: true,
    data: {
      school: { id: school.id, name: school.name, network: school.network, networkName: networkName,
                principalName: school.principalName, principalEmail: school.principalEmail,
                principalPhone: school.principalPhone, attendanceTarget: school.attendanceTarget || 80 },
      subjects: subjects,
      teachers: enriched,
      stats: { teachers: totalTeachers, avgRate: avgRate }
    }
  };
}

// ============================================================
// NETWORK DASHBOARD — למנהל/ת רשת
// ============================================================
// קלט: { network: 'net_ort' | 'ort', subject?: 'מתמטיקה' }
// פלט: כל בתי הספר ברשת + סטטיסטיקות שנתיות (לא חודשיות)

function networkDashboard(params) {
  const netParam = (params.network || '').replace(/^net_/, '');
  if (!netParam) return { ok: false, error: 'missing_network' };
  const subjectFilter = params.subject || '';

  const networks = readAll('networks');
  const network = networks.filter(n =>
    n.id === netParam || n.id === ('net_' + netParam) || (n.color || '') === netParam
  )[0];
  if (!network) return { ok: false, error: 'network_not_found' };

  const schools = readAll('schools').filter(s =>
    s.network === network.id || s.network === netParam
  );
  let teachers = readAll('teachers').filter(t =>
    t.network === network.id || t.network === netParam
  );
  if (subjectFilter) teachers = teachers.filter(t => t.subject === subjectFilter);

  let trainings = readAll('trainings');
  if (subjectFilter) trainings = trainings.filter(t => t.subject === subjectFilter);
  const trainingIds = trainings.map(t => t.id);
  const attendance = readAll('attendance').filter(a => trainingIds.indexOf(a.trainingId) >= 0);

  // חישוב פר מורה (שנתי - כל ההדרכות שהיו)
  const teacherStats = {};
  teachers.forEach(t => {
    const records = attendance.filter(a => a.teacherId === t.id);
    const teacherTrainings = trainings.filter(tr => tr.subject === t.subject);
    const present = records.filter(r => r.status === 'present').length;
    const partial = records.filter(r => r.status === 'partial').length;
    const total = teacherTrainings.length;
    teacherStats[t.id] = {
      present, partial, total,
      rate: total ? Math.round(((present + 0.5 * partial) / total) * 100) : 0
    };
  });

  // חישוב פר בית ספר
  const schoolBreakdown = schools.map(s => {
    const schoolTeachers = teachers.filter(t => t.school === s.id);
    if (!schoolTeachers.length) {
      return { id: s.id, name: s.name, teachers: 0, present: 0, rate: 0,
               principalName: s.principalName, principalEmail: s.principalEmail };
    }
    const rates = schoolTeachers.map(t => teacherStats[t.id]?.rate || 0);
    const avgRate = Math.round(rates.reduce((a,b)=>a+b, 0) / rates.length);
    const presentTeachers = schoolTeachers.filter(t => (teacherStats[t.id]?.rate || 0) >= 80).length;
    return {
      id: s.id, name: s.name,
      teachers: schoolTeachers.length,
      present: presentTeachers,
      rate: avgRate,
      principalName: s.principalName || '',
      principalEmail: s.principalEmail || ''
    };
  }).filter(s => s.teachers > 0)  // רק בתי ספר עם מורים
    .sort((a, b) => a.rate - b.rate);  // חלשים למעלה

  // סכימת רשת
  const allRates = Object.values(teacherStats).map(s => s.rate);
  const avgRate = allRates.length ? Math.round(allRates.reduce((a,b)=>a+b, 0) / allRates.length) : 0;
  const atRisk = Object.values(teacherStats).filter(s => s.rate < 50).length;
  const onTarget = Object.values(teacherStats).filter(s => s.rate >= 80).length;

  // מקצועות זמינים
  const availableSubjects = Array.from(new Set(teachers.map(t => t.subject))).filter(Boolean);

  return {
    ok: true,
    data: {
      network: { id: network.id, name: network.name, color: network.color, contactEmail: network.contactEmail || '' },
      filter: { subject: subjectFilter, availableSubjects },
      summary: {
        schools: schoolBreakdown.length,
        teachers: teachers.length,
        trainings: trainings.length,
        attendanceRecords: attendance.length,
        avgRate, atRisk, onTarget
      },
      schoolBreakdown
    }
  };
}

// ============================================================
// MINISTRY DASHBOARD — לרויטל אמיר ופיקוח ארצי
// ============================================================
// קלט: { subject?: 'מתמטיקה' }
// פלט: כל הרשתות עם נתוני נוכחות + סיכום ארצי + פילטר אופציונלי למקצוע

function ministryDashboard(params) {
  const subjectFilter = params.subject || '';

  const networks = readAll('networks');
  const schools = readAll('schools');
  let teachers = readAll('teachers');
  let trainings = readAll('trainings');

  if (subjectFilter) {
    teachers = teachers.filter(t => t.subject === subjectFilter);
    trainings = trainings.filter(t => t.subject === subjectFilter);
  }

  const trainingIds = trainings.map(t => t.id);
  const attendance = readAll('attendance').filter(a => trainingIds.indexOf(a.trainingId) >= 0);

  // חישוב פר מורה
  const teacherStats = {};
  teachers.forEach(t => {
    const records = attendance.filter(a => a.teacherId === t.id);
    const teacherTrainings = trainings.filter(tr => tr.subject === t.subject);
    const present = records.filter(r => r.status === 'present').length;
    const partial = records.filter(r => r.status === 'partial').length;
    const total = teacherTrainings.length;
    teacherStats[t.id] = {
      teacher: t,
      present,
      partial,
      total,
      rate: total ? Math.round(((present + 0.5 * partial) / total) * 100) : 0
    };
  });

  // מילון רשתות לחיפוש שם בעברית
  const networkByKey = {};
  networks.forEach(n => {
    networkByKey[n.id] = n;
    networkByKey[(n.id || '').replace(/^net_/, '')] = n;
    if (n.color) networkByKey[n.color] = n;
  });

  // חישוב פר בית ספר
  const schoolStats = {};
  schools.forEach(s => {
    const schoolTeachers = teachers.filter(t => t.school === s.id);
    if (!schoolTeachers.length) return;
    const rates = schoolTeachers.map(t => teacherStats[t.id]?.rate || 0);
    const avgRate = rates.length ? Math.round(rates.reduce((a,b)=>a+b, 0) / rates.length) : 0;
    const net = networkByKey[s.network] || {};
    schoolStats[s.id] = {
      school: s,
      networkName: net.name || s.network,
      networkColor: net.color || s.network,
      teachers: schoolTeachers.length,
      rate: avgRate
    };
  });

  // חישוב פר רשת
  const networkBreakdown = networks.map(n => {
    const netId = n.id;
    const netKey = netId.replace(/^net_/, '');
    const netSchools = schools.filter(s => s.network === netId || s.network === netKey);
    const netTeachers = teachers.filter(t => t.network === netId || t.network === netKey);
    if (!netTeachers.length) {
      return { id: netId, name: n.name, color: n.color, teachers: 0, schools: netSchools.length,
               present: 0, missed: 0, rate: 0, contactEmail: n.contactEmail };
    }
    const totalRate = netTeachers.reduce((sum, t) => sum + (teacherStats[t.id]?.rate || 0), 0);
    const avgRate = Math.round(totalRate / netTeachers.length);
    const presentCount = netTeachers.filter(t => (teacherStats[t.id]?.rate || 0) >= 80).length;
    const missedCount = netTeachers.filter(t => (teacherStats[t.id]?.rate || 0) < 50).length;
    return {
      id: netId, name: n.name, color: n.color,
      teachers: netTeachers.length, schools: netSchools.length,
      present: presentCount, missed: missedCount,
      rate: avgRate, contactEmail: n.contactEmail || ''
    };
  }).filter(n => n.teachers > 0);

  // סכימה ארצית
  const allRates = Object.values(teacherStats).map(s => s.rate);
  const ministryRate = allRates.length ? Math.round(allRates.reduce((a,b)=>a+b, 0) / allRates.length) : 0;

  // מקצועות זמינים (בנתונים)
  const availableSubjects = Array.from(new Set(readAll('trainings').map(t => t.subject))).filter(Boolean);

  return {
    ok: true,
    data: {
      filter: { subject: subjectFilter, availableSubjects },
      summary: {
        networks: networkBreakdown.length,
        schools: Object.keys(schoolStats).length,
        teachers: teachers.length,
        trainings: trainings.length,
        attendanceRecords: attendance.length,
        avgRate: ministryRate
      },
      networkBreakdown,
      schoolBreakdown: Object.values(schoolStats).sort((a, b) => a.rate - b.rate)  // הכי נמוכים למעלה
    }
  };
}
