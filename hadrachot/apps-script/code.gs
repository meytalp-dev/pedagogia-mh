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
 *   guide_files / guide_messages / guide_hours — מרחב המדריכה (9.9.26),
 *                 נפתח מתוך "מבט מקצועי". ראו את המקטע בסוף הקובץ.
 *
 * Deploy: Web App → Anyone → Execute as Me
 */

// ============================================================
// SETUP
// ============================================================

const TABS = ['networks','schools','teachers','trainings','attendance','pd','questions','knowledge','feedback','alerts','users','subjects','audit_log','contacts',
              'guide_files','guide_messages','guide_hours','meetings','meeting_attendance','link_views'];

const SCHEMA = {
  networks:   ['id','name','color','contactEmail','inviteCode'],
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
  // Phase 1 hardening + Phase 2 auth (סיסמה שהמשתמש קובע)
  users:      ['id','email','name','role','networkId','schoolId','subjectId','guideId','active','createdAt',
               'passwordHash','salt','token','tokenExpires','passwordSetAt'],
  subjects:   ['id','name','code','order','active'],
  audit_log:  ['id','timestamp','userEmail','action','targetType','targetId','status','notes'],
  // פרטי קשר אישיים של מדריכות ומפקחים — יושבים כאן ולא בקוד, כי הרפו ציבורי.
  // נקראים אך ורק דרך contacts.list, שדורש טוקן של אדמין ארצי (STRICT_AUTH_ACTIONS).
  contacts:   ['id','kind','slug','name','phone','email','updatedAt','updatedBy'],
  // מרחב המדריכה (9.9.26) — נפתח מתוך "מבט מקצועי", כרטיס לכל מדריכה.
  // guideSlug הוא המפתח מתוך assets/guides.js ולא מזהה פנימי חדש.
  guide_files:    ['id','guideSlug','guideName','fileName','fileUrl','fileId','mimeType','size','note','uploadedBy','createdAt','uploaderRole'],
  guide_messages: ['id','guideSlug','guideName','authorName','authorRole','text','createdAt'],
  guide_hours:    ['id','guideSlug','guideName','firstName','lastName','subject','schoolName','topic','date','hours','notes','createdBy','createdAt'],
  // נוכחות במפגשי ההדרכה (14.9.26) — ראו את המקטע בסוף הקובץ.
  // בכוונה לא trainings/attendance: הדוחות הישנים מחשבים כל הדרכה מול כל מורי
  // המקצוע בכל המגזרים, ומפגש של קבוצה אחת היה מסמן את כל השאר "לא נכחו".
  meetings:           ['id','guideSlug','guideName','date','topic','source','openUntil','openedAt','closedAt','createdAt','updatedAt'],
  meeting_attendance: ['id','meetingId','guideSlug','date','teacherId','teacherName','schoolName',
                       'status','guideStatus','selfCheckinAt','markedAt','source','updatedAt',
                       // markedVia: 'manual' | 'zoom' — סימון שנעשה מתוך דוח המשתתפים של הזום
                       'markedVia','zoomMinutes'],
  // מי פתח את הקישור האישי שלו (16.9.26) — התשובה ל"שלחנו לכולם?".
  // סימון "נשלח" ב-admin-guides נשמר בדפדפן ומעיד רק על לחיצה; זה מעיד על
  // פתיחה בפועל. אין כאן IP ואין user-agent — רק מי, מתי, וכמה פעמים.
  link_views:         ['id','kind','slug','name','firstSeenAt','lastSeenAt','views']
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

// Phase 2 — אכיפת התחברות על כל הפעולות שאינן ציבוריות.
// false = מצב מעבר: התחברות אפשרית (טוקנים עובדים) אבל לא חובה — המערכת ממשיכה לעבוד כרגיל.
// true  = חובה: כל פעולה שאינה ציבורית דורשת authEmail+authToken תקפים.
// מדליקים אחרי שכל בעלי התפקידים קבעו סיסמה.
const AUTH_ENFORCED = false;

const PUBLIC_ACTIONS = new Set([
  // צ'ק-אין QR חייב להישאר פתוח — מורות לא מחוברות
  'qr.training', 'qr.checkin',
  // התחברות וקביעת סיסמה — חייבים להיות פתוחים
  'auth.status', 'auth.login', 'auth.setPassword', 'auth.changePassword', 'auth.verify',
  // הרשמה עצמית של רשתות עם קוד הזמנה — הקוד עצמו הוא ההרשאה
  'auth.registerInfo', 'auth.register',
  // נוכחות במפגשים — למדריכות ולמורים אין חשבונות. ההרשאה בפנים:
  // meet.* דורשות מפתח מדריכה (k), checkin.* דורשות מפגש פתוח עכשיו + קוד מתחלף
  'meet.state', 'meet.open', 'meet.close', 'meet.code', 'meet.mark',
  'checkin.roster', 'checkin.submit',
  // תיעוד פתיחת הקישור האישי — נשלח מהדשבורד של המדריכה וממבט המפקח.ת,
  // ולשניהם אין חשבון. כותב רק לתוך link_views, ורק slug שקיים בסכימה.
  'link.seen'
]);

const ADMIN_ONLY_ACTIONS = new Set([
  'seed.import',
  'alerts.compute',
  'certificate.generate',
  'admin.reset',
  'school.delete',
  'users.list',
  'users.upsert',
  'users.delete',
  'invites.ensure'
]);

// פעולות שנושאות מידע אישי: דורשות טוקן תקף של אדמין ארצי **תמיד** —
// גם כל עוד AUTH_ENFORCED=false. בלי זה הן היו פתוחות לכל מי שיודע את כתובת
// ה-/exec (הפריסה היא ANYONE_ANONYMOUS), וזה בדיוק מה שרצינו למנוע כשהוצאנו
// את הטלפונים מהקובץ הסטטי.
const STRICT_AUTH_ACTIONS = new Set([
  'contacts.list',
  'contacts.upsert',
  // שליחת מייל בשם בעלת הסקריפט — בלי טוקן אדמין זו תיבת ריליי פתוחה לכל מי
  // שיודע את כתובת ה-/exec. חייב להישאר כאן גם אחרי הדלקת AUTH_ENFORCED.
  'verify.mailSend',
  // מפתחות הכניסה של המדריכות לרישום הנוכחות — מי שמחזיק מפתח מסמן נוכחות
  'meet.guideKeys',
  // מי פתח את הקישור האישי ומתי — קריאה לאדמין ארצי בלבד
  'link.views'
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
// אימות לפי טוקן (Phase 2) — authEmail + authToken שנשלחים בכל קריאה מהדפדפן
function findUserByToken_(email, token) {
  if (!email || !token) return null;
  const user = findUserByEmail_(email);
  if (!user || !user.token || String(user.token) !== String(token)) return null;
  if (user.tokenExpires && new Date(user.tokenExpires) < new Date()) return null;
  return user;
}

function requireAuthAndScope(params, action) {
  if (PUBLIC_ACTIONS.has(action)) {
    return { user: null, scope: { public: true } };
  }

  // 0. פעולות מידע אישי — טוקן של אדמין ארצי, בלי קשר ל-AUTH_ENFORCED
  if (STRICT_AUTH_ACTIONS.has(action)) {
    const strictUser = findUserByToken_(params.authEmail, params.authToken);
    if (!strictUser) throw new Error('unauthenticated — פרטי קשר דורשים התחברות');
    if (ADMIN_ROLES.indexOf(strictUser.role) < 0) throw new Error('forbidden_admin_required');
    return { user: strictUser, scope: enforceScope_(strictUser, params, action) };
  }

  // 1. טוקן תקף — המשתמש מזוהה, ה-scope שלו נאכף
  const tokenUser = findUserByToken_(params.authEmail, params.authToken);
  if (tokenUser) {
    if (ADMIN_ONLY_ACTIONS.has(action) && ADMIN_ROLES.indexOf(tokenUser.role) < 0) {
      throw new Error('forbidden_admin_required');
    }
    return { user: tokenUser, scope: enforceScope_(tokenUser, params, action) };
  }

  // 2. מצב מעבר — התחברות עדיין לא חובה: הכל פתוח כמו היום
  if (!AUTH_ENFORCED) {
    return { user: null, scope: { role: 'open' } };
  }

  // 3. אכיפה מלאה — בלי טוקן אין כניסה (חוץ מ-fallback של סשן Google, אם קיים)
  const email = getActiveUserEmail_();
  if (email) {
    const user = findUserByEmail_(email);
    if (user) {
      if (ADMIN_ONLY_ACTIONS.has(action) && ADMIN_ROLES.indexOf(user.role) < 0) {
        throw new Error('forbidden_admin_required');
      }
      return { user, scope: enforceScope_(user, params, action) };
    }
  }
  throw new Error('unauthenticated — יש להתחבר עם מייל וסיסמה');
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
// AUTH — מייל + סיסמה שהמשתמש קובע (Phase 2)
// ============================================================
// כל בעל תפקיד מופיע בטאב users (מיטל מוסיפה דרך admin-users.html).
// בכניסה הראשונה המשתמש קובע סיסמה; מקבל טוקן שנשמר בדפדפן.

const TOKEN_DAYS = 180;
const MIN_PASSWORD_LEN = 6;

function hashPassword_(password, salt) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + '|' + password,
    Utilities.Charset.UTF_8
  );
  return raw.map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function issueToken_(user) {
  const token = Utilities.getUuid() + '-' + Utilities.getUuid().slice(0, 8);
  const expires = new Date(Date.now() + TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  updateRowById('users', user.id, { token, tokenExpires: expires });
  return { token, expires };
}

function authPayload_(user, tokenInfo) {
  return {
    ok: true,
    email: user.email,
    name: user.name || '',
    role: user.role,
    networkId: user.networkId || '',
    schoolId: user.schoolId || '',
    subjectId: user.subjectId || '',
    guideId: user.guideId || '',
    token: tokenInfo ? tokenInfo.token : undefined,
    tokenExpires: tokenInfo ? tokenInfo.expires : undefined
  };
}

// מה מצב המייל הזה — קיים? כבר קבע סיסמה?
function authStatus(p) {
  const email = (p.email || '').trim().toLowerCase();
  if (!email) return { ok: false, error: 'missing_email' };
  const user = findUserByEmail_(email);
  if (!user) return { ok: true, exists: false };
  return { ok: true, exists: true, hasPassword: !!user.passwordHash, name: user.name || '', role: user.role };
}

// כניסה ראשונה — קביעת סיסמה (רק למייל שמופיע ברשימה ועדיין בלי סיסמה)
function authSetPassword(p) {
  const email = (p.email || '').trim().toLowerCase();
  const password = p.password || '';
  const user = findUserByEmail_(email);
  if (!user) return { ok: false, error: 'not_provisioned' };
  if (user.passwordHash) return { ok: false, error: 'password_already_set' };
  if (password.length < MIN_PASSWORD_LEN) return { ok: false, error: 'password_too_short' };
  const salt = Utilities.getUuid();
  updateRowById('users', user.id, {
    salt,
    passwordHash: hashPassword_(password, salt),
    passwordSetAt: new Date().toISOString()
  });
  const tokenInfo = issueToken_(user);
  return authPayload_(user, tokenInfo);
}

// התחברות רגילה
function authLogin(p) {
  const email = (p.email || '').trim().toLowerCase();
  const password = p.password || '';
  const user = findUserByEmail_(email);
  if (!user) return { ok: false, error: 'not_provisioned' };
  if (!user.passwordHash) return { ok: false, error: 'password_not_set' };
  if (hashPassword_(password, user.salt || '') !== user.passwordHash) {
    return { ok: false, error: 'wrong_password' };
  }
  const tokenInfo = issueToken_(user);
  return authPayload_(user, tokenInfo);
}

// בדיקת טוקן שמור בדפדפן
function authVerify(p) {
  const user = findUserByToken_(p.authEmail || p.email, p.authToken || p.token);
  if (!user) return { ok: false, error: 'invalid_token' };
  return authPayload_(user, null);
}

// החלפת סיסמה (עם הסיסמה הישנה)
function authChangePassword(p) {
  const email = (p.email || '').trim().toLowerCase();
  const user = findUserByEmail_(email);
  if (!user || !user.passwordHash) return { ok: false, error: 'not_provisioned' };
  if (hashPassword_(p.oldPassword || '', user.salt || '') !== user.passwordHash) {
    return { ok: false, error: 'wrong_password' };
  }
  if ((p.newPassword || '').length < MIN_PASSWORD_LEN) return { ok: false, error: 'password_too_short' };
  const salt = Utilities.getUuid();
  updateRowById('users', user.id, {
    salt,
    passwordHash: hashPassword_(p.newPassword, salt),
    passwordSetAt: new Date().toISOString()
  });
  const tokenInfo = issueToken_(user);
  return authPayload_(user, tokenInfo);
}

// ---------- הרשמה עצמית של רשתות (קוד הזמנה) ----------
// לכל רשת קוד סודי בעמודת inviteCode בטאב networks. מיטל שולחת לרשת קישור
// register.html?code=<קוד>; איש הקשר נרשם עם המייל והסיסמה שלו ומקבל
// network_admin לרשת של הקוד בלבד. הקוד רב-פעמי (כמה אנשי קשר לרשת) —
// יצירה מחדש (regenerate) מבטלת את הקוד הישן.

function makeInviteCode_() {
  // 10 תווים קריאים, בלי דו-משמעיים (0/o, 1/l/i)
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 10; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// עמודת inviteCode עשויה לא להתקיים בגיליונות ותיקים — מוסיפים אותה בשקט
function ensureInviteColumn_() {
  const s = sheet('networks');
  const headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  if (headers.indexOf('inviteCode') < 0) {
    s.getRange(1, s.getLastColumn() + 1).setValue('inviteCode');
  }
}

function findNetworkByInvite_(code) {
  const c = String(code || '').trim().toLowerCase();
  if (!c) return null;
  return readAll('networks').find(n =>
    n.inviteCode && String(n.inviteCode).trim().toLowerCase() === c) || null;
}

// admin בלבד — מוודא קוד לכל רשת ומחזיר את כולם. p.regenerate=<networkId> מחליף קוד.
function ensureInvites(p) {
  ensureInviteColumn_();
  const nets = readAll('networks');
  nets.forEach(n => {
    if (!n.inviteCode || (p.regenerate && p.regenerate === n.id)) {
      const code = makeInviteCode_();
      updateRowById('networks', n.id, { inviteCode: code });
      n.inviteCode = code;
    }
  });
  return { ok: true, data: nets.map(n => ({ id: n.id, name: n.name, color: n.color, inviteCode: n.inviteCode })) };
}

// ציבורי — לדף ההרשמה: איזו רשת מאחורי הקוד (בלי לחשוף שום דבר נוסף)
function authRegisterInfo(p) {
  const net = findNetworkByInvite_(p.code);
  if (!net) return { ok: false, error: 'invalid_invite' };
  return { ok: true, networkId: net.id, networkName: net.name };
}

// ציבורי — הרשמה בפועל: יוצר network_admin לרשת של הקוד ומחבר מיד
function authRegister(p) {
  const net = findNetworkByInvite_(p.code);
  if (!net) return { ok: false, error: 'invalid_invite' };
  const email = (p.email || '').trim().toLowerCase();
  if (!email || email.indexOf('@') < 0) return { ok: false, error: 'invalid_email' };
  const password = p.password || '';
  if (password.length < MIN_PASSWORD_LEN) return { ok: false, error: 'password_too_short' };
  // בדיקה מול כל המשתמשים, גם מושבתים — מייל אחד = חשבון אחד
  const exists = readAll('users').some(u => (u.email || '').toLowerCase() === email);
  if (exists) return { ok: false, error: 'already_registered' };
  const salt = Utilities.getUuid();
  const now = new Date().toISOString();
  const user = {
    id: newId('usr'), email, name: (p.name || '').trim(), role: ROLES.NETWORK_ADMIN,
    networkId: net.id, schoolId: '', subjectId: '', guideId: '',
    active: 'TRUE', createdAt: now,
    passwordHash: hashPassword_(password, salt), salt,
    token: '', tokenExpires: '', passwordSetAt: now
  };
  appendRow('users', user);
  const tokenInfo = issueToken_(user);
  return authPayload_(user, tokenInfo);
}

// ---------- פרטי קשר (admin בלבד — נאכף ב-STRICT_AUTH_ACTIONS) ----------
// למה כאן ולא בקובץ סטטי: assets/guides-contact.js יושב ברפו ציבורי, ולכן כל
// טלפון שנכתב בו נגיש לכל מי שיודע את הכתובת. כאן הוא בגיליון הפרטי, ויוצא
// רק למי שמחזיק טוקן של אדמין ארצי.
// id = kind:slug (למשל inspector:revital) — כך ייבוא חוזר מעדכן ולא מכפיל.

function contactId_(kind, slug) {
  return String(kind || '').trim() + ':' + String(slug || '').trim();
}

// הטאב נוצר בהרצת setupSchema, אבל ההעלאה הראשונה מגיעה מהדפדפן — לפניה.
// בלי היצירה כאן appendRow היה נופל על getLastColumn של גיליון שאינו קיים.
function ensureContactsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName('contacts');
  if (s) return s;
  s = ss.insertSheet('contacts');
  s.appendRow(SCHEMA.contacts);
  s.getRange(1, 1, 1, SCHEMA.contacts.length).setFontWeight('bold').setBackground('#f5f7fa');
  s.setFrozenRows(1);
  return s;
}

function listContacts() {
  const rows = readAll('contacts');
  return {
    ok: true,
    data: rows.map(r => ({
      kind: r.kind || '',
      slug: r.slug || '',
      name: r.name || '',
      phone: r.phone || '',
      email: r.email || '',
      updatedAt: r.updatedAt || ''
    }))
  };
}

// מקבל רשומה בודדת (kind/slug/phone/email) או params.items = מערך רשומות.
// שדה שלא נשלח לא נדרס — כדי שעדכון טלפון לא ימחק מייל קיים.
function upsertContacts(p, user) {
  ensureContactsSheet_();
  let items = p.items;
  if (typeof items === 'string') { try { items = JSON.parse(items); } catch (e) { items = null; } }
  if (!Array.isArray(items)) items = [{ kind: p.kind, slug: p.slug, name: p.name, phone: p.phone, email: p.email }];

  const existing = readAll('contacts');
  const byId = {};
  existing.forEach(r => { byId[r.id] = r; });
  const now = new Date().toISOString();
  const by = (user && user.email) || '';
  let created = 0, updated = 0;
  const errors = [];

  items.forEach(item => {
    const kind = String(item.kind || '').trim();
    const slug = String(item.slug || '').trim();
    if (!kind || !slug) { errors.push('missing_kind_or_slug'); return; }
    const id = contactId_(kind, slug);
    const prev = byId[id];
    const row = {
      id: id, kind: kind, slug: slug,
      name:  item.name  === undefined ? (prev ? prev.name  : '') : String(item.name),
      phone: item.phone === undefined ? (prev ? prev.phone : '') : String(item.phone),
      email: item.email === undefined ? (prev ? prev.email : '') : String(item.email),
      updatedAt: now, updatedBy: by
    };
    if (prev) { updateRowById('contacts', id, row); updated++; }
    else { appendRow('contacts', row); byId[id] = row; created++; }
  });

  return { ok: errors.length === 0, created: created, updated: updated, errors: errors };
}

// ============================================================
// פתיחת הקישור האישי (16.9.26)
// ------------------------------------------------------------
// עד היום השאלה "שלחנו לכולם את הקישור?" נענתה מהסימונים ב-admin-guides,
// שנשמרים ב-localStorage של הדפדפן ששלח ומעידים על לחיצה — לא על הגעה.
// מכאן והלאה הדשבורד של המדריכה ומבט המפקח.ת מדווחים פתיחה, ולכן אפשר
// לראות מי באמת נכנס. פעולת הכתיבה ציבורית (למדריכה אין חשבון) ולכן היא
// מקבלת רק kind/slug מוכרים, ולא כותבת שום דבר מהבקשה עצמה.
// ============================================================

function ensureLinkViewsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName('link_views');
  if (s) return s;
  s = ss.insertSheet('link_views');
  s.appendRow(SCHEMA.link_views);
  s.getRange(1, 1, 1, SCHEMA.link_views.length).setFontWeight('bold').setBackground('#f5f7fa');
  s.setFrozenRows(1);
  return s;
}

const LINK_KINDS = ['guide', 'inspector'];

function linkSeen(p) {
  const kind = String(p.kind || '').trim();
  const slug = String(p.slug || '').trim();
  if (LINK_KINDS.indexOf(kind) < 0) return { ok: false, error: 'bad_kind' };
  if (!/^[a-z][a-z0-9_]{0,30}$/.test(slug)) return { ok: false, error: 'bad_slug' };

  ensureLinkViewsSheet_();
  const id = kind + ':' + slug;
  const now = new Date().toISOString();

  // מנעול קצר — שתי פתיחות באותה שנייה היו יוצרות שתי שורות לאותו אדם
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return { ok: false, error: 'busy' }; }
  try {
    const prev = readAll('link_views').find(r => r.id === id);
    // השם נשמר פעם אחת בלבד, כדי שהגיליון יהיה קריא בלי להצליב מול guides.js
    const name = String(p.name || (prev ? prev.name : '') || '').slice(0, 60);
    if (prev) {
      updateRowById('link_views', id, {
        name: name,
        lastSeenAt: now,
        views: (Number(prev.views) || 0) + 1
      });
    } else {
      appendRow('link_views', {
        id: id, kind: kind, slug: slug, name: name,
        firstSeenAt: now, lastSeenAt: now, views: 1
      });
    }
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

function linkViews() {
  const rows = readAll('link_views').map(r => ({
    kind: r.kind || '',
    slug: r.slug || '',
    name: r.name || '',
    firstSeenAt: r.firstSeenAt || '',
    lastSeenAt: r.lastSeenAt || '',
    views: Number(r.views) || 0
  }));
  return { ok: true, data: rows };
}

// ---------- ניהול משתמשים (admin בלבד — נאכף ב-requireAuthAndScope) ----------

function listUsers() {
  const data = readAll('users').map(u => ({
    id: u.id, email: u.email, name: u.name, role: u.role,
    networkId: u.networkId || '', schoolId: u.schoolId || '',
    subjectId: u.subjectId || '', guideId: u.guideId || '',
    active: String(u.active).toUpperCase() !== 'FALSE',
    hasPassword: !!u.passwordHash,
    createdAt: u.createdAt || ''
  }));
  return { ok: true, data };
}

// upsert לפי email. resetPassword=true מוחק סיסמה וטוקן — המשתמש יקבע חדשה בכניסה הבאה.
function upsertUser(p) {
  const email = (p.email || '').trim().toLowerCase();
  if (!email || email.indexOf('@') < 0) return { ok: false, error: 'invalid_email' };
  const all = readAll('users');
  const existing = all.find(u => (u.email || '').toLowerCase() === email);
  const fields = {};
  ['name', 'role', 'networkId', 'schoolId', 'subjectId', 'guideId'].forEach(k => {
    if (p[k] !== undefined) fields[k] = p[k];
  });
  if (p.active !== undefined) fields.active = toBool(p.active) ? 'TRUE' : 'FALSE';
  if (toBool(p.resetPassword)) {
    fields.passwordHash = ''; fields.salt = ''; fields.token = ''; fields.tokenExpires = ''; fields.passwordSetAt = '';
  }
  if (existing) {
    updateRowById('users', existing.id, fields);
    return { ok: true, data: Object.assign({}, existing, fields, { id: existing.id }) };
  }
  if (!p.role) return { ok: false, error: 'missing_role' };
  const obj = Object.assign({
    id: newId('usr'), email, name: '', role: '',
    networkId: '', schoolId: '', subjectId: '', guideId: '',
    active: 'TRUE', createdAt: new Date().toISOString(),
    passwordHash: '', salt: '', token: '', tokenExpires: '', passwordSetAt: ''
  }, fields);
  appendRow('users', obj);
  return { ok: true, data: obj };
}

function deleteUser(p) {
  if (!p.id) return { ok: false, error: 'missing_id' };
  const s = sheet('users');
  const range = s.getDataRange().getValues();
  const idCol = range[0].indexOf('id');
  for (let i = range.length - 1; i >= 1; i--) {
    if (range[i][idCol] === p.id) { s.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'not_found' };
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

// ---- עומס (14.9.26) ----
// בשעות העומס כ-30% מהבקשות חיכו 32–39 שניות — גם בקשה בלי שום פעולה — ומנהלים
// קיבלו "השליחה נכשלה (timeout)" ורשימת מורים שלא נטענה. כל בקשה, כולל GET
// והפולינג של דפי הנוכחות, כתבה שורה ל-audit_log בגיליון, ולכן:
// (1) קריאות מוצלחות לא נרשמות ביומן — כתיבות, התחברות ושגיאות ממשיכות להירשם;
// (2) teachers.list נשמר במטמון 2 דקות. כל כתיבה (כל פעולה שאינה קריאה) מחליפה
//     את מספר הדור, כך שמה שנשמר מופיע מיד ולא אחרי ה-TTL.
// link.seen כותב, אבל נמצא ברשימה בכוונה: הוא נשלח בכל פתיחת דשבורד, ובלעדיו
// כל פתיחה הייתה מאפסת את מטמון רשימת המורים (bumpTeachersGen_) וכותבת שורה
// ליומן — בדיוק שני הדברים שגרמו לעומס של 14.9.26. הוא נוגע רק ב-link_views.
const READ_ONLY_RE_ = /^(networks\.list|schools\.list|school\.get|teachers\.list|teacher\.get|trainings\.list|attendance\.(monthly|teacher|training)|pd\.list|questions\.list|knowledge\.list|reports\.\w+|qr\.training|feedback\.list|alerts\.list|calendar\.ics|auth\.(status|verify|registerInfo)|contacts\.list|guide\.(dashboard|workspace|group)|meet\.(state|code|report)|checkin\.roster|link\.(seen|views)|(school|ministry|network)\.dashboard)$/;
const TEACHERS_CACHE_TTL_ = 120;

function teachersGen_() {
  const cache = CacheService.getScriptCache();
  let gen = cache.get('teachersGen');
  if (!gen) { gen = String(Date.now()); cache.put('teachersGen', gen, 21600); }
  return gen;
}

function bumpTeachersGen_() {
  try {
    CacheService.getScriptCache().put('teachersGen', Date.now() + '_' + Math.floor(Math.random() * 1e6), 21600);
  } catch (e) { /* מטמון לא זמין — הקריאה הבאה פשוט תקרא מהגיליון */ }
}

function listTeachersCached_(p, user) {
  let cache, key;
  try {
    cache = CacheService.getScriptCache();
    const q = {};
    ['school', 'network', 'subject', 'sector'].forEach(k => { if (p[k]) q[k] = p[k]; });
    // הזהות נכנסת למפתח: בלי משתמש ובלי בית ספר פרטי הקשר ממוסכים
    key = 'tl|' + teachersGen_() + '|' + (user ? user.email : '') + '|' + JSON.stringify(q);
    if (key.length > 240) key = 'tl|' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, key));
    const hit = readCacheChunked_(cache, key);
    if (hit) return hit;
  } catch (e) { cache = null; }
  const fresh = listTeachers(p, user);
  if (cache && fresh && fresh.ok) writeCacheChunked_(cache, key, fresh, TEACHERS_CACHE_TTL_);
  return fresh;
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

      case 'teachers.list':       result = listTeachersCached_(params, user); break;
      case 'teacher.get':         result = getTeacher(params.id); break;
      case 'teachers.create':     result = createTeacher(params); break;
      case 'teachers.createMany': result = createTeachersBatch(params); break;
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

      case 'auth.status':         result = authStatus(params); break;
      case 'auth.login':          result = authLogin(params); break;
      case 'auth.setPassword':    result = authSetPassword(params); break;
      case 'auth.changePassword': result = authChangePassword(params); break;
      case 'auth.verify':         result = authVerify(params); break;
      case 'auth.registerInfo':   result = authRegisterInfo(params); break;
      case 'auth.register':       result = authRegister(params); break;
      case 'invites.ensure':      result = ensureInvites(params); break;

      case 'users.list':          result = listUsers(); break;
      case 'users.upsert':        result = upsertUser(params); break;
      case 'users.delete':        result = deleteUser(params); break;

      case 'seed.import':         result = seedImport(params); break;

      case 'verify.mailSend':     result = verifyMailSend(params, user); break;
      case 'contacts.list':       result = listContacts(); break;
      case 'contacts.upsert':     result = upsertContacts(params, user); break;
      case 'guide.dashboard':     result = withCache_('guide.dashboard',    scope, params, () => guideDashboard(applyScopeParams_(params, scope, 'guide'), user)); break;

      // מרחב המדריכה — קבצים, הודעות ושעות פרטניות (9.9.26).
      // בלי withCache_: הודעה שנשלחת חייבת להופיע מיד, לא אחרי TTL.
      case 'guide.workspace':     result = guideWorkspace(params); break;
      case 'guide.group':         result = guideGroup(params); break;
      case 'guide.file.add':      result = guideFileAdd(params); break;
      case 'guide.file.delete':   result = guideFileDelete(params); break;
      case 'guide.message.add':   result = guideMessageAdd(params); break;
      case 'guide.message.delete':result = guideMessageDelete(params); break;
      case 'guide.hours.add':     result = guideHoursAdd(params); break;
      case 'guide.hours.update':  result = guideHoursUpdate(params); break;
      case 'guide.hours.delete':  result = guideHoursDelete(params); break;

      // נוכחות במפגשי ההדרכה (14.9.26)
      case 'meet.state':          result = meetState(params); break;
      case 'meet.open':           result = meetOpen(params); break;
      case 'meet.close':          result = meetClose(params); break;
      case 'meet.code':           result = meetCode(params); break;
      case 'meet.mark':           result = meetMark(params); break;
      case 'meet.guideKeys':      result = meetGuideKeys(params); break;
      case 'meet.report':         result = meetReport(params); break;
      case 'checkin.roster':      result = checkinRoster(params); break;
      case 'checkin.submit':      result = checkinSubmit(params); break;

      // פתיחת הקישור האישי (16.9.26)
      case 'link.seen':           result = linkSeen(params); break;
      case 'link.views':          result = linkViews(); break;

      case 'school.dashboard':    result = withCache_('school.dashboard',   scope, params, () => schoolDashboard(applyScopeParams_(params, scope, 'school'))); break;
      case 'ministry.dashboard':  result = withCache_('ministry.dashboard', scope, params, () => ministryDashboard(params)); break;
      case 'network.dashboard':   result = withCache_('network.dashboard',  scope, params, () => networkDashboard(applyScopeParams_(params, scope, 'network'))); break;

      default: result = { ok: false, error: 'unknown_action: ' + action };
    }
    if (READ_ONLY_RE_.test(action)) {
      // קריאה מוצלחת לא נרשמת ביומן; קריאה שנכשלה כן
      if (!(result && result.ok)) auditLog_(userEmail, action, 'endpoint', '', 'error', '');
    } else {
      auditLog_(userEmail, action, 'endpoint', '', result && result.ok ? 'ok' : 'error', '');
      bumpTeachersGen_();   // כל כתיבה מבטלת את מטמון רשימות המורים
    }
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
  // inviteCode הוא סוד — נחשף רק דרך invites.ensure (אדמין בלבד)
  return { ok: true, data: readAll('networks').map(n => {
    const { inviteCode, ...pub } = n;
    return pub;
  }) };
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

// מיסוך פרטי קשר למי שלא מחובר (הגנת ביניים עד הדלקת AUTH_ENFORCED):
// זרימות ההזנה של בתי הספר נשארות פתוחות ושלמות, אבל רשימות רחבות
// (לפי מקצוע / בלי סינון) מוסרות טלפון ומייל רק למשתמש עם token תקף.
function maskContact_(t) {
  const digits = (t.phone || '').toString().replace(/\D/g, '');
  return Object.assign({}, t, {
    phone: digits ? '•••' + digits.slice(-3) : '',
    email: ''
  });
}

function listTeachers(p, user) {
  let data = readAll('teachers').map(t => ({...t, moeApproval: toBool(t.moeApproval), pdActive: toBool(t.pdActive)}));
  if (p.school)   data = data.filter(t => t.school === p.school);
  if (p.network)  data = data.filter(t => t.network === p.network);
  if (p.subject)  data = data.filter(t => t.subject === p.subject);
  if (p.sector)   data = data.filter(t => t.sector === p.sector);
  // בלי token ובלי סינון לבית ספר יחיד (זרימת ההזנה) — בלי פרטי קשר
  if (!user && !p.school) data = data.map(maskContact_);
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

// schoolName הוא שדה משוכפל שכל הדשבורדים נשענים עליו. הלקוח שלח לפעמים "—"
// (מציין תצוגה שנכנס לשורות אמיתיות כשכשל רגעי מנע ממנו לטעון את שם בית הספר),
// ולכן השרת הוא הפוסק: אם השם חסר או הוא מציין — שולפים אותו לפי המזהה.
// מפתח הזהות של מורה בתוך בית ספר: שם + מקצוע + מסלול. זה בדיוק הכלל שהלקוח
// אוכף כשהוא חוסם הוספה כפולה, ולכן אפשר להישען עליו גם בשרת.
// המסלול הוא חלק מהזהות: אותו מורה יכול ללמד את אותו מקצוע גם לבגרות וגם
// לגמר, ואלה שתי שורות נפרדות (סחנין ואכסאל, 9.9.26). בלי ה-type כאן שורת
// הגמר נחסמה כ"כפילות" של הבגרות והוחזרה השורה הקיימת.
function teacherKey_(schoolId, name, subject, type) {
  return String(schoolId || '').trim() + ' ' +
         String(name || '').trim() + ' ' +
         String(subject || '').trim() + ' ' +
         (String(type || '').trim() === 'gemer' ? 'gemer' : 'bagrut');
}

// מחזיר מפה של המורים הקיימים בבית ספר לפי מפתח הזהות.
function existingTeachersMap_(schoolId) {
  const map = {};
  if (!schoolId) return map;
  readAll('teachers').forEach(function (t) {
    if (String(t.school || '').trim() !== String(schoolId).trim()) return;
    const k = teacherKey_(t.school, t.name, t.subject, t.type);
    if (!map[k]) map[k] = t;
  });
  return map;
}

function resolveSchoolName_(schoolId, given) {
  const g = String(given === undefined || given === null ? '' : given).trim();
  if (g && g !== '—' && g !== '-') return g;
  if (!schoolId) return '';
  const hit = readAll('schools').filter(function (s) { return s.id === schoolId; })[0];
  return hit ? String(hit.name || '') : '';
}

function createTeacher(p) {
  const obj = {
    id: newId('tch'),
    school: p.school || '',
    schoolName: resolveSchoolName_(p.school || '', p.schoolName),
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
  // אידמפוטנטיות. תשובה שנעלמת בדרך (Apps Script מחזיר מדי פעם דף HTML) גורמת
  // ללקוח לנסות שוב, והניסיון החוזר יצר מורה שני. הכתיבה מתבצעת רק אם המורה
  // הזה לא קיים; אחרת מוחזרת השורה הקיימת והלקוח מקשר אליה.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(45000)) return { ok: false, error: 'busy_try_again' };
  try {
    const dup = existingTeachersMap_(obj.school)[teacherKey_(obj.school, obj.name, obj.subject, obj.type)];
    if (dup) return { ok: true, data: dup, existed: true };
    appendRow('teachers', obj);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, data: obj };
}

// יצירת רשימת מורים שלמה בבקשה אחת.
// הזנה מורה־מורה עלתה 3–4.5 שניות לכל אחד: 25 מורים = כשתי דקות שבהן הדף
// חייב להישאר פתוח, ער ומחובר — וכל הפרעה בהן איבדה עבודה. כאן הכל נכתב
// בקריאת setValues אחת, כך שאותם 25 מורים לוקחים בקשה אחת של שניות בודדות.
function createTeachersBatch(p) {
  let list = p.teachers;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch (err) { return { ok: false, error: 'bad_teachers_json' }; }
  }
  if (!Array.isArray(list) || !list.length) return { ok: false, error: 'no_teachers' };
  if (list.length > 200) return { ok: false, error: 'too_many_rows' };

  const s = sheet('teachers');
  if (!s) return { ok: false, error: 'no_sheet' };

  const stamp = new Date().toISOString();
  const base = Date.now();
  const batchSchool = p.school || '';
  const batchSchoolName = resolveSchoolName_(batchSchool, p.schoolName);   // קריאה אחת למנה
  const created = [];
  list.forEach((t, i) => {
    if (!t) return;
    const name = String(t.name === undefined ? '' : t.name).trim();
    const subject = String(t.subject === undefined ? '' : t.subject).trim();
    if (!name || !subject) return;   // שורה בלי שם או בלי מקצוע — לא נכתבת
    created.push({
      // המזהה כולל את האינדקס: Date.now() זהה לכל השורות באותה בקשה,
      // ורנדום של 0–999 לבדו התנגש בהסתברות ממשית בתוך מנה של 25.
      id: 'tch_' + base + '_' + i + '_' + Math.floor(Math.random() * 1000),
      school: t.school || batchSchool,
      schoolName: (t.school && t.school !== batchSchool)
        ? resolveSchoolName_(t.school, t.schoolName)
        : batchSchoolName,
      network: (t.network || p.network || '').toString().replace(/^net_/, ''),
      name: name,
      subject: subject,
      type: t.type === 'gemer' ? 'gemer' : 'bagrut',
      sector: t.sector || p.sector || 'kelali',
      seniority: parseInt(t.seniority || 0, 10) || 0,
      units: t.units || '',
      students: parseInt(t.students || 0, 10) || 0,
      phone: t.phone === undefined ? '' : String(t.phone),
      email: t.email || '',
      notes: t.notes || '',
      moeApproval: toBool(t.moeApproval),
      moeFile: t.moeFile || '',
      pdActive: toBool(t.pdActive),
      pdFile: t.pdFile || '',
      pdYear: t.pdYear || '',
      createdAt: stamp
    });
  });
  if (!created.length) return { ok: false, error: 'no_valid_rows' };

  // המנעול עוטף גם את בדיקת הקיום וגם את הכתיבה. בדיקה מחוץ למנעול לא שווה
  // כלום: שתי מנות זהות שמגיעות במקביל היו שתיהן עוברות אותה וכותבות פעמיים.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(45000)) return { ok: false, error: 'busy_try_again' };

  let toWrite = [], reused = [];
  try {
    // אידמפוטנטיות: מורה שכבר קיים לא נכתב שוב — לא מול הגיליון ולא מול המנה
    // עצמה. שליחה חוזרת של אותה מנה (תשובה שנעלמה בדרך, לחיצה כפולה) לא תיצור
    // כפילות, והלקוח מקבל בכל מקרה שורה עם id לכל שם ששלח.
    const existing = existingTeachersMap_(batchSchool);
    const seenInBatch = {};
    created.forEach(function (obj) {
      const k = teacherKey_(obj.school, obj.name, obj.subject, obj.type);
      if (existing[k]) { reused.push(existing[k]); return; }
      if (seenInBatch[k]) return;
      seenInBatch[k] = true;
      toWrite.push(obj);
    });

    if (toWrite.length) {
      // סדר העמודות הפיזי בגיליון הוא מקור האמת, לא SCHEMA — כמו ב-appendRow.
      const headers = (s.getLastColumn() >= 1)
        ? s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].filter(String)
        : SCHEMA.teachers;
      const rows = toWrite.map(function (obj) {
        return headers.map(function (h) {
          if (obj[h] === undefined) return '';
          if (typeof obj[h] === 'boolean') return obj[h] ? 'TRUE' : 'FALSE';
          return obj[h];
        });
      });
      s.getRange(s.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
      SpreadsheetApp.flush();
    }
  } finally {
    lock.releaseLock();
  }

  return {
    ok: true,
    data: toWrite.concat(reused),   // שורה עם id לכל שם ששלח הלקוח
    count: toWrite.length,
    reused: reused.length,
    skipped: list.length - created.length - reused.length
  };
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

// ============================================================
// שליחת קישורי האימות למנהלים במייל
// נבנה 9.9.26 אחרי שוואטסאפ חסם את החשבון בשליחה לעשרות מספרים ברצף.
// הכתובות מגיעות מהדפדפן של מיטל (שמורות אצלה במכשיר בלבד, לא בגיליון),
// וההודעה נבנית כאן מהנתונים החיים כדי שלא ניתן יהיה להזריק תוכן חופשי.
// הפעולה ב-STRICT_AUTH_ACTIONS — דורשת טוקן אדמין ארצי תמיד.
// ============================================================
const MAIL_MAX_BATCH = 120;

// בתי ספר שכבר שלחו אישור — לא מטרידים אותם שוב
function verifiedSchools_() {
  const out = {};
  readAll('questions').forEach(function (q) {
    const tid = String(q.teacherId || '');
    if (tid.indexOf('verify:') !== 0) return;
    out[tid.slice(7)] = true;
  });
  return out;
}

function verifyMailSend(p, user) {
  let list;
  try { list = JSON.parse(p.recipients || '[]'); } catch (e) { return { ok: false, error: 'bad_recipients' }; }
  if (!Array.isArray(list) || !list.length) return { ok: false, error: 'no_recipients' };
  if (list.length > MAIL_MAX_BATCH) return { ok: false, error: 'too_many_recipients: ' + list.length };

  const dryRun = String(p.dryRun) === 'true';
  const base = 'https://pedagogiamh.co.il/hadrachot';
  const signer = (user && user.name) ? user.name : 'יחידת הפיקוח על הדרכות מורים';
  const replyTo = (user && user.email) ? user.email : '';

  const schools = {};
  readAll('schools').forEach(function (s) { schools[s.id] = s; });
  const bySchool = {};
  readAll('teachers').forEach(function (t) {
    if (!t.school) return;
    if (!bySchool[t.school]) bySchool[t.school] = [];
    bySchool[t.school].push(t);
  });
  const verified = verifiedSchools_();

  const quotaBefore = MailApp.getRemainingDailyQuota();
  if (!dryRun && quotaBefore < list.length) {
    return { ok: false, error: 'quota_too_low', quota: quotaBefore, needed: list.length };
  }

  const sent = [], skipped = [], failed = [], seen = {};
  const MAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  list.forEach(function (r) {
    const id = String((r && r.school) || '').trim();
    const email = String((r && r.email) || '').trim();
    const s = schools[id];
    if (!s) { skipped.push({ school: id || '(ריק)', why: 'בית ספר לא נמצא' }); return; }
    if (seen[id]) { skipped.push({ school: s.name, why: 'כפילות ברשימה' }); return; }
    seen[id] = true;
    if (!MAIL_RE.test(email)) { skipped.push({ school: s.name, why: 'כתובת לא תקינה' }); return; }
    const rows = bySchool[id] || [];
    if (!rows.length) { skipped.push({ school: s.name, why: 'עדיין לא הוזנו מורים' }); return; }
    if (verified[id]) { skipped.push({ school: s.name, why: 'כבר שלחו אישור' }); return; }

    const counts = {};
    rows.forEach(function (t) {
      let k = String(t.subject || '').trim();
      if (k === 'תנ') k = 'תנ"ך';
      if (!k) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    const summary = Object.keys(counts).map(function (k) { return k + ' ' + counts[k]; }).join(' · ');
    const link = base + '/verify.html?school=' + encodeURIComponent(id);

    // נוסח תזכורת (14.9.26) — בלי שם אישי בחתימה, רק כותרת היחידה
    const body = [
      'תזכורת — אימות רשימת המורים',
      '',
      'שלום' + (s.principalName ? ' ' + s.principalName : '') + ',',
      '',
      'זו תזכורת: טרם התקבל אישור לרשימת המורים של ' + s.name + ' במצפן ההדרכות.',
      'הוזנו ' + rows.length + ' מורים: ' + summary + '.',
      '',
      'נא להיכנס לטופס האימות ולוודא שכל מורה משויך/ת למקצוע ולמסלול הנכונים (בגרות/גמר),',
      'להוסיף מורים שנשכחו, ובמתמטיקה גם לסמן כמה יחידות מלמד/ת כל מורה — ולאשר:',
      link,
      '',
      'לוקח שתי דקות. תודה רבה!',
      'שנה טובה!',
      '',
      'יחידת הפיקוח על הדרכות מורים · משרד העבודה'
    ].join(String.fromCharCode(10));

    if (dryRun) { sent.push({ school: s.name, email: email, teachers: rows.length }); return; }

    try {
      const opts = {
        to: email,
        subject: 'תזכורת: אימות רשימת המורים — ' + s.name,
        body: body,
        name: 'מצפן ההדרכות · משרד העבודה'
      };
      if (replyTo) opts.replyTo = replyTo;
      MailApp.sendEmail(opts);
      sent.push({ school: s.name, email: email, teachers: rows.length });
    } catch (e) {
      failed.push({ school: s.name, email: email, why: e.message });
    }
  });

  return {
    ok: true, dryRun: dryRun,
    sent: sent, skipped: skipped, failed: failed,
    quotaBefore: quotaBefore,
    quotaAfter: dryRun ? quotaBefore : MailApp.getRemainingDailyQuota()
  };
}

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

function guideDashboard(params, user) {
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
    const contact = user ? { phone: t.phone, email: t.email } : maskContact_(t);
    return {
      id: t.id,
      name: t.name,
      phone: contact.phone,
      email: contact.email,
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

// ============================================================
// מרחב המדריכה — קבצים, הודעות ושעות פרטניות (9.9.26)
// ------------------------------------------------------------
// נפתח מתוך "מבט מקצועי" (mabat/?i=<slug>), כרטיס לכל מדריכה.
// שלושה מאגרים נפרדים, כולם ממופתחים ב-guideSlug מתוך assets/guides.js:
//   guide_files    — קבצים שהועלו (הקובץ עצמו יושב בדרייב, כאן רק המצביע)
//   guide_messages — authorRole='guide' = הודעה של המדריכה לקבוצת ההדרכה שלה;
//                    authorRole='inspector' = הערה של המפקח.ת למדריכה בלבד
//   guide_hours    — שעות פרטניות שהמדריכה עושה מול מורה בודד/ת
// הטאבים נוצרים לבד בכתיבה הראשונה (ensureTab_), כדי שלא יידרש
// setupSchema ידני אחרי הפריסה.
//
// עמוד הקבוצה (kvutza/?g=<slug>, 11.9.26) — המורים של הקבוצה רואים את מה
// שהמדריכה מעלה ומפרסמת. הוא קורא ל-guide.group ולא ל-guide.workspace:
// guide.workspace מחזיר גם שעות פרטניות (שמות מורים ובתי ספר) וגם את
// ההערות של המפקח.ת, ושום דבר מזה לא אמור להגיע לדפדפן של מורה.
// ============================================================

const GUIDE_FILES_ROOT_NAME = 'מצפן ההדרכות — קבצי מדריכות';
// 8MB. מגבלת ה-POST של Apps Script גבוהה יותר, אבל base64 מנפח ב-33%
// ובקשה כבדה נתקעת בתקרת 30 השניות ברשת סלולרית. עדיף שגיאה ברורה.
const MAX_GUIDE_FILE_BYTES = 8 * 1024 * 1024;

function ensureTab_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.appendRow(SCHEMA[name]);
    s.getRange(1, 1, 1, SCHEMA[name].length).setFontWeight('bold').setBackground('#f5f7fa');
    s.setFrozenRows(1);
  } else {
    // טאב שנוצר לפני שנוספה עמודה ל-SCHEMA (uploaderRole, 11.9.26): appendRow
    // כותב לפי הכותרות הפיזיות ומפיל בשקט שדה שאין לו עמודה — מוסיפים בסוף.
    const width = Math.max(s.getLastColumn(), 1);
    const have = s.getRange(1, 1, 1, width).getValues()[0].map(String);
    const missing = SCHEMA[name].filter(h => have.indexOf(h) < 0);
    if (missing.length) {
      s.getRange(1, s.getLastColumn() + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    }
  }
  return s;
}

function deleteRowById_(name, id) {
  const s = sheet(name);
  if (!s) return false;
  const range = s.getDataRange().getValues();
  if (range.length < 2) return false;
  const idCol = range[0].indexOf('id');
  if (idCol < 0) return false;
  for (let i = range.length - 1; i >= 1; i--) {
    if (String(range[i][idCol]) === String(id)) { s.deleteRow(i + 1); return true; }
  }
  return false;
}

// תיקיית הדרייב של המדריכה. נוצרת פעם אחת ונשמרת ב-ScriptProperties,
// כדי שלא ייווצרו תיקיות כפולות בכל העלאה.
function guideDriveFolder_(guideSlug, guideName) {
  const props = PropertiesService.getScriptProperties();
  let root = null;
  const rootId = props.getProperty('guideFilesRootId');
  if (rootId) { try { root = DriveApp.getFolderById(rootId); } catch (e) { root = null; } }
  if (!root) {
    const it = DriveApp.getFoldersByName(GUIDE_FILES_ROOT_NAME);
    root = it.hasNext() ? it.next() : DriveApp.createFolder(GUIDE_FILES_ROOT_NAME);
    props.setProperty('guideFilesRootId', root.getId());
  }
  const subName = String(guideName || guideSlug || 'כללי').trim() || guideSlug;
  const subIt = root.getFoldersByName(subName);
  return subIt.hasNext() ? subIt.next() : root.createFolder(subName);
}

function safeFileName_(name) {
  const clean = String(name || '').replace(/[\\\/\x00-\x1f]/g, '_').trim();
  return clean.slice(0, 120) || 'קובץ';
}

function guideSlugList_(p) {
  return String(p.guides || p.guide || '')
    .split(',').map(s => s.trim()).filter(Boolean);
}

// Google Sheets מחזיר תאריכים כאובייקט Date. JSON.stringify היה הופך אותו
// ל-UTC ומזיז יום אחורה בשעון ישראל — לכן ממירים כאן לזמן מקומי.
function toIso_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, 'Asia/Jerusalem', "yyyy-MM-dd'T'HH:mm:ss");
  }
  return String(v);
}

// ---------- קריאה אחת לכל המדריכות של המפקח.ת ----------
// mabat טוען את כל המדריכות בבת אחת. קריאה נפרדת לכל מדריכה חורגת
// מתקרת 30 השניות של Apps Script בדיוק כמו ב-teachers.list.
function guideWorkspace(p) {
  const slugs = guideSlugList_(p);
  if (!slugs.length) return { ok: false, error: 'missing_guides' };
  const inSlugs = r => slugs.indexOf(String(r.guideSlug || '')) >= 0;

  const files = readAll('guide_files').filter(inSlugs);
  const messages = readAll('guide_messages').filter(inSlugs);
  const hours = readAll('guide_hours').filter(inSlugs);

  const bucket = () => slugs.reduce((acc, s) => { acc[s] = []; return acc; }, {});
  const out = { files: bucket(), messages: bucket(), hours: bucket() };

  files.forEach(f => out.files[f.guideSlug].push({
    id: f.id, fileName: f.fileName, fileUrl: f.fileUrl, mimeType: f.mimeType,
    size: Number(f.size) || 0, note: f.note || '',
    uploadedBy: f.uploadedBy || '', uploaderRole: f.uploaderRole || '',
    createdAt: toIso_(f.createdAt)
  }));
  messages.forEach(m => out.messages[m.guideSlug].push({
    id: m.id, authorName: m.authorName || '', authorRole: m.authorRole || '',
    text: m.text || '', createdAt: toIso_(m.createdAt)
  }));
  hours.forEach(h => out.hours[h.guideSlug].push({
    id: h.id, firstName: h.firstName || '', lastName: h.lastName || '',
    subject: h.subject || '', schoolName: h.schoolName || '',
    topic: h.topic || '', date: toIso_(h.date), hours: Number(h.hours) || 0,
    notes: h.notes || '', createdBy: h.createdBy || '', createdAt: toIso_(h.createdAt)
  }));

  // חדש למעלה בקבצים ובשעות; הודעות בסדר כרונולוגי, כמו שיחה
  slugs.forEach(s => {
    out.files[s].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    out.hours[s].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    out.messages[s].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  });

  return { ok: true, data: out };
}

// ---------- עמוד הקבוצה — מה שהמורים רואים ----------
// מדריכה אחת, ורק מה שנועד לקבוצה: קבצים שהמדריכה העלתה והודעות שהיא
// פרסמה. בלי שעות פרטניות, בלי הערות המפקח.ת, בלי מזהים פנימיים.
function guideGroup(p) {
  const slug = String(p.guide || '').trim();
  if (!slug) return { ok: false, error: 'missing_guide' };
  const mine = r => String(r.guideSlug || '') === slug;

  const files = readAll('guide_files')
    .filter(f => mine(f) && String(f.uploaderRole || '') !== 'inspector')
    .map(f => ({
      fileName: f.fileName || '', fileUrl: f.fileUrl || '', mimeType: f.mimeType || '',
      size: Number(f.size) || 0, createdAt: toIso_(f.createdAt)
    }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const messages = readAll('guide_messages')
    .filter(m => mine(m) && String(m.authorRole || '') === 'guide')
    .map(m => ({ authorName: m.authorName || '', text: m.text || '', createdAt: toIso_(m.createdAt) }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return { ok: true, data: { files, messages } };
}

// ---------- קבצים ----------
function guideFileAdd(p) {
  const slug = String(p.guide || '').trim();
  if (!slug) return { ok: false, error: 'missing_guide' };
  if (!p.data) return { ok: false, error: 'missing_file' };

  // הקליינט עשוי לשלוח data:URL מלא — חותכים את הקידומת
  const b64 = String(p.data).replace(/^data:[^;]*;base64,/, '');
  let bytes;
  try { bytes = Utilities.base64Decode(b64); }
  catch (e) { return { ok: false, error: 'bad_encoding' }; }
  if (bytes.length > MAX_GUIDE_FILE_BYTES) return { ok: false, error: 'file_too_large' };

  const fileName = safeFileName_(p.fileName);
  const blob = Utilities.newBlob(bytes, p.mimeType || 'application/octet-stream', fileName);
  const file = guideDriveFolder_(slug, p.guideName).createFile(blob);
  // בלי זה הקובץ פתוח רק לבעלת הסקריפט, והמדריכה מקבלת "אין לך גישה".
  // הקישור עצמו אינו ניתן לניחוש, אבל מי שמקבל אותו רואה את הקובץ.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  ensureTab_('guide_files');
  const obj = {
    id: newId('gf'),
    guideSlug: slug,
    guideName: p.guideName || '',
    fileName: fileName,
    fileUrl: file.getUrl(),
    fileId: file.getId(),
    mimeType: file.getMimeType(),
    size: bytes.length,
    note: p.note || '',
    uploadedBy: p.byName || '',
    createdAt: new Date().toISOString(),
    // 'guide' = חומר לקבוצה (מופיע בעמוד הקבוצה) · 'inspector' = למדריכה בלבד
    uploaderRole: p.byRole === 'inspector' ? 'inspector' : 'guide'
  };
  appendRow('guide_files', obj);
  return { ok: true, data: obj };
}

function guideFileDelete(p) {
  if (!p.id) return { ok: false, error: 'missing_id' };
  const row = readAll('guide_files').find(f => String(f.id) === String(p.id));
  if (!row) return { ok: false, error: 'not_found' };
  // הקובץ לפח ולא מחיקה קשה — טעות של קליק אחד חייבת להיות הפיכה
  if (row.fileId) { try { DriveApp.getFileById(row.fileId).setTrashed(true); } catch (e) {} }
  deleteRowById_('guide_files', p.id);
  return { ok: true, data: { id: p.id } };
}

// ---------- הודעות ----------
function guideMessageAdd(p) {
  const slug = String(p.guide || '').trim();
  const text = String(p.text || '').trim();
  if (!slug) return { ok: false, error: 'missing_guide' };
  if (!text) return { ok: false, error: 'missing_text' };
  ensureTab_('guide_messages');
  const obj = {
    id: newId('gm'),
    guideSlug: slug,
    guideName: p.guideName || '',
    authorName: p.byName || '',
    // רק שני ערכים חוקיים — עמוד הקבוצה מסנן לפי 'guide', וערך חופשי
    // מהלקוח לא אמור להכריע מה מתפרסם למורים
    authorRole: p.byRole === 'inspector' ? 'inspector' : 'guide',
    text: text.slice(0, 4000),
    createdAt: new Date().toISOString()
  };
  appendRow('guide_messages', obj);
  return { ok: true, data: obj };
}

function guideMessageDelete(p) {
  if (!p.id) return { ok: false, error: 'missing_id' };
  const ok = deleteRowById_('guide_messages', p.id);
  return ok ? { ok: true, data: { id: p.id } } : { ok: false, error: 'not_found' };
}

// ---------- שעות פרטניות ----------
function guideHoursAdd(p) {
  const slug = String(p.guide || '').trim();
  if (!slug) return { ok: false, error: 'missing_guide' };
  const first = String(p.firstName || '').trim();
  const last = String(p.lastName || '').trim();
  if (!first && !last) return { ok: false, error: 'missing_teacher_name' };
  ensureTab_('guide_hours');
  const obj = {
    id: newId('gh'),
    guideSlug: slug,
    guideName: p.guideName || '',
    firstName: first,
    lastName: last,
    subject: p.subject || '',
    schoolName: p.schoolName || '',
    topic: p.topic || '',
    // גרש מוביל — אחרת Sheets הופך "2026-09-09" לתא תאריך והקריאה חוזרת כ-Date
    date: p.date ? "'" + String(p.date).trim() : '',
    hours: Number(p.hours) || 0,
    notes: p.notes || '',
    createdBy: p.byName || '',
    createdAt: new Date().toISOString()
  };
  appendRow('guide_hours', obj);
  return { ok: true, data: obj };
}

function guideHoursUpdate(p) {
  if (!p.id) return { ok: false, error: 'missing_id' };
  const updates = {};
  ['firstName','lastName','subject','schoolName','topic','notes'].forEach(k => {
    if (p[k] !== undefined) updates[k] = p[k];
  });
  if (p.date !== undefined) updates.date = p.date ? "'" + String(p.date).trim() : '';
  if (p.hours !== undefined) updates.hours = Number(p.hours) || 0;
  const ok = updateRowById('guide_hours', p.id, updates);
  return ok ? { ok: true, data: { id: p.id } } : { ok: false, error: 'not_found' };
}

function guideHoursDelete(p) {
  if (!p.id) return { ok: false, error: 'missing_id' };
  const ok = deleteRowById_('guide_hours', p.id);
  return ok ? { ok: true, data: { id: p.id } } : { ok: false, error: 'not_found' };
}

// ============================================================
// נוכחות במפגשי ההדרכה (14.9.26)
// ============================================================
// המפגשים בזום. שני מסלולים, והמדריכה היא הקובעת:
//
// 1. המדריכה מסמנת נוכחות (meet.mark) מתוך רשימת הקבוצה בדשבורד שלה.
// 2. גיבוי — המורה נרשם בעצמו בעמוד mifgash/?g=<slug> (checkin.submit).
//    רישום עצמי נקלט רק כש:
//      · המדריכה פתחה רישום למפגש של היום (meet.open) והחלון לא נסגר;
//      · המורה הקליד את הקוד בן 4 הספרות שמוקרן במפגש. הקוד מתחלף כל דקה
//        (HMAC על מזהה המפגש וחלון הזמן) — צילום שנשלח לוואטסאפ פג תוך דקה-שתיים.
//    רישום עצמי נשמר כ-'pending' ולא נספר כנוכחות עד שהמדריכה מאשרת.
//    מורה שנרשם בעצמו והמדריכה סימנה "לא נכח" — מסומן כפער.
//
// הרשאות: למדריכות ולמורים אין חשבונות, ולכן כל הפעולות ב-PUBLIC_ACTIONS.
// פעולות המדריכה דורשות מפתח k = HMAC(סוד, slug) שנוסע בקישור האישי שלה.
// מיטל מקבלת את המפתחות ב-meet.guideKeys (STRICT — טוקן אדמין). הסוד עצמו
// יושב ב-ScriptProperties ולא יוצא מהשרת; גם הקוד המתחלף נגזר ממנו.
// מי שיודע רק את ה-slug (הוא מופיע בכתובת עמוד הקבוצה) לא יכול לסמן נוכחות.

const MEET_TZ = 'Asia/Jerusalem';
const MEET_CODE_STEP_SEC = 300;       // הקוד על המסך מתחלף כל 5 דקות (החלטת מיטל 17.9.26)
// גם הקוד הקודם מתקבל — מי שהתחיל להקליד רגע לפני ההחלפה לא נדחה.
// קוד שהוצג לאחרונה לפני 5 דקות ומעלה נדחה.
const MEET_CODE_GRACE_STEPS = 1;
const MEET_OPEN_DEFAULT_MIN = 90;
const MEET_OPEN_MAX_MIN = 180;
const MEET_FAIL_PER_PERSON = 6;       // ניסיונות קוד שגויים לאדם לפני נעילה
const MEET_FAIL_PER_MEETING = 200;    // תקרה כללית למפגש — מונע ניחוש בכוח
const MEET_FAIL_WINDOW_SEC = 600;
const MEET_MAX_MARK_RECORDS = 500;

function meetSecret_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('MEET_SECRET');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('MEET_SECRET', s);
  }
  return s;
}

function meetHmacHex_(msg) {
  const sig = Utilities.computeHmacSha256Signature(String(msg), meetSecret_());
  return sig.map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function meetSlug_(v) {
  const s = String(v || '').trim();
  return /^[a-z0-9_-]{1,40}$/i.test(s) ? s : '';
}

function meetGuideKey_(slug) {
  return meetHmacHex_('guide:' + slug).slice(0, 16);
}

// השוואה באורך קבוע — לא מדליפה כמה תווים נכונים דרך זמן התגובה
function meetSafeEqual_(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// מחזיר את ה-slug אם המפתח תקין, אחרת ''
// שתי דרכים: המפתח k, או המייל של המדריכ/ה שכבר נוסע בקישור האישי שהופץ
// ב-8.9.26 (&guide=<email>) — כך הקישורים הקיימים ממשיכים לעבוד בלי הפצה
// מחדש (בקשת מיטל 14.9.26). המייל נבדק מול טאב contacts בשרת, לא מול הדפדפן.
// מי שאין לו מייל במערכת (עבד, גל ועוד) — רק מפתח.
function meetAuthGuide_(p) {
  const slug = meetSlug_(p.guide);
  if (!slug) return '';
  if (p.k && meetSafeEqual_(p.k, meetGuideKey_(slug))) return slug;
  const email = String(p.ge || '').trim().toLowerCase();
  if (email && email.indexOf('@') > 0) {
    const c = readAll('contacts').find(r => String(r.id) === 'guide:' + slug);
    const known = c ? String(c.email || '').trim().toLowerCase() : '';
    if (known && meetSafeEqual_(email, known)) return slug;
  }
  return '';
}

function meetToday_() {
  return Utilities.formatDate(new Date(), MEET_TZ, 'yyyy-MM-dd');
}

function meetDate_(v) {
  const s = String(toIso_(v) || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function meetId_(slug, date) {
  return 'mt_' + slug + '_' + date.replace(/-/g, '');
}

// היום הוא יום של המפגש: התאריך שלו, או אחד ממועדיו הנוספים (sessionDates).
// מועד נוסף מתקבל רק עד 14 יום אחרי המפגש — אחרת מפתח של מדריך היה פותח רישום בכל יום.
function meetIsSessionDay_(date, sessionDates) {
  const today = meetToday_();
  if (date === today) return true;
  const max = Utilities.formatDate(new Date(new Date(date + 'T12:00:00Z').getTime() + 14 * 86400000), 'UTC', 'yyyy-MM-dd');
  return String(sessionDates || '').split(',').map(x => x.trim())
    .some(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d === today && d >= date && d <= max);
}

// המפגש הפתוח עכשיו של המדריך — עמוד המורה לא יודע באיזה מועד מדובר,
// ולכן מחפשים לפי חלון פתוח ולא לפי תאריך היום. חלון נסגר תוך 3 שעות לכל היותר.
function meetOpenFor_(slug, now) {
  ensureTab_('meetings');
  const open = readAll('meetings').filter(m => String(m.guideSlug) === slug && Number(m.openUntil) > now);
  if (!open.length) return null;
  open.sort((a, b) => String(b.openedAt || '').localeCompare(String(a.openedAt || '')));
  return open[0];
}

function meetCodeAt_(meetingId, step) {
  const hex = meetHmacHex_('code:' + meetingId + ':' + step);
  return String(parseInt(hex.slice(0, 8), 16) % 10000).padStart(4, '0');
}

function meetStep_(ms) {
  return Math.floor(ms / 1000 / MEET_CODE_STEP_SEC);
}

function meetStr_(v, max) {
  return String(v === undefined || v === null ? '' : v).trim().slice(0, max);
}

function meetNormName_(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function meetRecords_(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v) { try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch (e) {} }
  return [];
}

// כל הכתיבות לנוכחות עוברות במנעול: עשרות מורים נרשמים באותה דקה,
// ובלי מנעול שתי בקשות קוראות "אין שורה" ושתיהן מוסיפות.
function meetWithLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { ok: false, error: 'busy' };
  try { return fn(); } finally { lock.releaseLock(); }
}

function meetFind_(id) {
  ensureTab_('meetings');
  return readAll('meetings').find(m => String(m.id) === id) || null;
}

function meetPublic_(m, now) {
  const openUntil = Number(m.openUntil) || 0;
  return {
    id: String(m.id), date: meetDate_(m.date), topic: m.topic || '', source: m.source || '',
    open: openUntil > now, openUntil: openUntil
  };
}

// יוצר את שורת המפגש בפעם הראשונה שנוגעים בו. מזהה קבוע לפי מדריכה+תאריך:
// שני המועדים של אותו יום (בוקר/ערב) הם מפגש אחד — מורה משתתף באחד מהם.
function meetEnsure_(slug, date, p) {
  const id = meetId_(slug, date);
  const found = meetFind_(id);
  if (found) {
    if (p.topic && !found.topic) updateRowById('meetings', id, { topic: meetStr_(p.topic, 300) });
    return found;
  }
  const nowIso = new Date().toISOString();
  const obj = {
    id: id, guideSlug: slug, guideName: meetStr_(p.guideName, 80),
    // גרש מוביל — אחרת Sheets הופך את התאריך לתא Date
    date: "'" + date, topic: meetStr_(p.topic, 300),
    source: p.source === 'plan' ? 'plan' : 'adhoc',
    openUntil: 0, openedAt: '', closedAt: '', createdAt: nowIso, updatedAt: nowIso
  };
  appendRow('meetings', obj);
  obj.date = date;
  return obj;
}

function meetRowPublic_(r) {
  return {
    id: String(r.id), teacherId: String(r.teacherId || ''), teacherName: r.teacherName || '',
    schoolName: r.schoolName || '', status: r.status || '', guideStatus: r.guideStatus || '',
    selfCheckinAt: toIso_(r.selfCheckinAt), markedAt: toIso_(r.markedAt), source: r.source || '',
    markedVia: r.markedVia || '', zoomMinutes: Number(r.zoomMinutes) || 0
  };
}

// ---------- המדריכה: מצב המפגשים ----------
function meetState(p) {
  const slug = meetAuthGuide_(p);
  if (!slug) return { ok: false, error: 'bad_key' };
  const now = Date.now();
  ensureTab_('meeting_attendance');
  const meetings = readAll('meetings').filter(m => String(m.guideSlug) === slug);
  const rows = readAll('meeting_attendance').filter(r => String(r.guideSlug) === slug);

  const counts = {};
  rows.forEach(r => {
    const c = counts[r.meetingId] || (counts[r.meetingId] = { present: 0, absent: 0, pending: 0, gaps: 0 });
    if (c[r.status] !== undefined) c[r.status]++;
    if (r.selfCheckinAt && r.guideStatus === 'absent') c.gaps++;
  });

  const date = meetDate_(p.date);
  const data = {
    now: now, today: meetToday_(),
    meetings: meetings.map(m => Object.assign(meetPublic_(m, now),
      { counts: counts[m.id] || { present: 0, absent: 0, pending: 0, gaps: 0 } }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    rows: []
  };
  if (date) {
    const id = meetId_(slug, date);
    data.meetingId = id;
    data.rows = rows.filter(r => String(r.meetingId) === id).map(meetRowPublic_);
  }
  return { ok: true, data: data };
}

// ---------- המדריכה: פתיחת רישום עצמי ----------
function meetOpen(p) {
  const slug = meetAuthGuide_(p);
  if (!slug) return { ok: false, error: 'bad_key' };
  const date = meetDate_(p.date);
  // רישום עצמי רק ביום המפגש (או ביום המועד השני שלו) — לא מראש ולא בדיעבד
  if (!date || !meetIsSessionDay_(date, p.sessionDates)) return { ok: false, error: 'not_today' };
  let minutes = Math.round(Number(p.minutes) || MEET_OPEN_DEFAULT_MIN);
  minutes = Math.max(10, Math.min(MEET_OPEN_MAX_MIN, minutes));
  return meetWithLock_(() => {
    const m = meetEnsure_(slug, date, p);
    const now = Date.now();
    const openUntil = now + minutes * 60 * 1000;
    const nowIso = new Date(now).toISOString();
    updateRowById('meetings', m.id, { openUntil: openUntil, openedAt: nowIso, updatedAt: nowIso });
    m.openUntil = openUntil;
    return { ok: true, data: Object.assign(meetPublic_(m, now), meetCodes_(m.id, now)) };
  });
}

function meetClose(p) {
  const slug = meetAuthGuide_(p);
  if (!slug) return { ok: false, error: 'bad_key' };
  const date = meetDate_(p.date);
  if (!date) return { ok: false, error: 'bad_date' };
  const id = meetId_(slug, date);
  return meetWithLock_(() => {
    if (!meetFind_(id)) return { ok: false, error: 'not_found' };
    const nowIso = new Date().toISOString();
    updateRowById('meetings', id, { openUntil: 0, closedAt: nowIso, updatedAt: nowIso });
    return { ok: true, data: { id: id, open: false } };
  });
}

// הקוד הנוכחי ושני הבאים, עם גבולות הזמן — המסך של המדריכה מחליף קוד לבד
// לפי השעון, בלי לפנות לשרת בכל החלפה. serverNow מאפשר לתקן סטיית שעון.
function meetCodes_(meetingId, now) {
  const step = meetStep_(now);
  const codes = [];
  for (let i = 0; i < 3; i++) {
    const s = step + i;
    codes.push({ code: meetCodeAt_(meetingId, s),
      from: s * MEET_CODE_STEP_SEC * 1000, to: (s + 1) * MEET_CODE_STEP_SEC * 1000 });
  }
  return { codes: codes, serverNow: now, stepSec: MEET_CODE_STEP_SEC };
}

function meetCode(p) {
  const slug = meetAuthGuide_(p);
  if (!slug) return { ok: false, error: 'bad_key' };
  const date = meetDate_(p.date);
  if (!date || !meetIsSessionDay_(date, p.sessionDates)) return { ok: false, error: 'not_today' };
  const m = meetFind_(meetId_(slug, date));
  const now = Date.now();
  if (!m || !(Number(m.openUntil) > now)) return { ok: false, error: 'closed' };
  return { ok: true, data: Object.assign(meetPublic_(m, now), meetCodes_(m.id, now)) };
}

// ---------- המדריכה: סימון נוכחות ----------
// records: [{ teacherId?, rowId?, teacherName, schoolName, status: present|absent|clear }]
// המדריכה קובעת: guideStatus שלה הוא הסטטוס. 'clear' מחזיר למצב לא מסומן —
// ואם המורה נרשם בעצמו, השורה חוזרת ל"ממתין לאישור".
function meetMark(p) {
  const slug = meetAuthGuide_(p);
  if (!slug) return { ok: false, error: 'bad_key' };
  const date = meetDate_(p.date);
  if (!date) return { ok: false, error: 'bad_date' };
  if (date > meetToday_()) return { ok: false, error: 'future_meeting' };
  const records = meetRecords_(p.records).slice(0, MEET_MAX_MARK_RECORDS);
  if (!records.length) return { ok: false, error: 'no_records' };

  return meetWithLock_(() => {
    const m = meetEnsure_(slug, date, p);
    const s = ensureTab_('meeting_attendance');
    const values = s.getDataRange().getValues();
    const headers = values[0].map(String);
    const col = {};
    headers.forEach((h, i) => { col[h] = i; });
    const nowIso = new Date().toISOString();

    const byTeacher = {}, byRow = {};
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][col.meetingId]) !== m.id) continue;
      const tid = String(values[i][col.teacherId] || '');
      if (tid) byTeacher[tid] = i;
      byRow[String(values[i][col.id])] = i;
    }

    const dirty = {}, toDelete = [], newRows = [];
    let changed = 0;
    records.forEach(r => {
      const status = String(r.status || '');
      if (['present', 'absent', 'clear'].indexOf(status) < 0) return;
      const tid = meetStr_(r.teacherId, 80);
      const rid = meetStr_(r.rowId, 80);
      const via = r.via === 'zoom' ? 'zoom' : 'manual';
      const zoomMin = Math.max(0, Math.min(1000, Math.round(Number(r.zoomMinutes) || 0))) || '';
      const idx = tid && byTeacher[tid] > 0 ? byTeacher[tid]
        : (rid && byRow[rid] > 0 ? byRow[rid] : -1);

      if (idx > 0) {
        const row = values[idx];
        if (status === 'clear') {
          if (row[col.selfCheckinAt]) {
            row[col.guideStatus] = ''; row[col.status] = 'pending';
          } else {
            if (toDelete.indexOf(idx) < 0) toDelete.push(idx);
            changed++; return;
          }
        } else {
          row[col.guideStatus] = status; row[col.status] = status;
        }
        row[col.markedAt] = nowIso; row[col.updatedAt] = nowIso;
        if (col.markedVia !== undefined) row[col.markedVia] = status === 'clear' ? '' : via;
        if (col.zoomMinutes !== undefined) row[col.zoomMinutes] = via === 'zoom' ? zoomMin : '';
        dirty[idx] = true; changed++;
        return;
      }
      if (status === 'clear' || !tid || byTeacher[tid] === -2) return;   // שורה חדשה רק למורה מהרשימה
      const obj = {
        id: newId('ma'), meetingId: m.id, guideSlug: slug, date: "'" + date,
        teacherId: tid, teacherName: meetStr_(r.teacherName, 120), schoolName: meetStr_(r.schoolName, 120),
        status: status, guideStatus: status, selfCheckinAt: '', markedAt: nowIso,
        source: 'guide', updatedAt: nowIso,
        markedVia: via, zoomMinutes: via === 'zoom' ? zoomMin : ''
      };
      byTeacher[tid] = -2;   // כפילות באותה בקשה
      newRows.push(headers.map(h => obj[h] === undefined ? '' : obj[h]));
      changed++;
    });

    Object.keys(dirty).forEach(k => {
      const i = Number(k);
      if (toDelete.indexOf(i) >= 0) return;
      const row = values[i].slice();
      // התאריך נקרא כמחרוזת; כתיבה חוזרת בלי גרש הייתה הופכת אותו לתא Date
      row[col.date] = "'" + meetDate_(row[col.date]);
      s.getRange(i + 1, 1, 1, headers.length).setValues([row]);
    });
    if (newRows.length) {
      s.getRange(s.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
    }
    // מוחקים מלמטה למעלה — אחרת כל מחיקה מזיזה את האינדקסים של השורות שאחריה
    toDelete.sort((a, b) => b - a).forEach(i => s.deleteRow(i + 1));

    updateRowById('meetings', m.id, { updatedAt: nowIso });
    return { ok: true, data: { meetingId: m.id, changed: changed } };
  });
}

// ---------- מיטל: מפתחות המדריכות לקישורים האישיים ----------
function meetGuideKeys(p) {
  const slugs = String(p.slugs || '').split(',').map(meetSlug_).filter(Boolean);
  const out = {};
  slugs.forEach(s => { out[s] = meetGuideKey_(s); });
  return { ok: true, data: out };
}

// ---------- המורה: רשימת הקבוצה ----------
// מחזירה שמות ובתי ספר רק בזמן שהרישום פתוח — מחוץ לחלון העמוד לא חושף כלום.
// המקצועות/מגזרים מגיעים מהלקוח (guides.js לא קיים בשרת); זו רשימה שממילא
// נגישה היום ב-teachers.list, ומוגבלת כאן לשם + בית ספר.
function checkinRoster(p) {
  const slug = meetSlug_(p.g);
  if (!slug) return { ok: false, error: 'missing_guide' };
  const now = Date.now();
  const m = meetOpenFor_(slug, now);
  if (!m) {
    return { ok: true, data: { open: false } };
  }
  const list = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
  const subjects = list(p.subjects), sectors = list(p.sectors), tracks = list(p.tracks);
  if (!subjects.length) return { ok: false, error: 'missing_subjects' };
  const teachers = readAll('teachers').filter(t =>
    subjects.indexOf(String(t.subject || '')) >= 0 &&
    (!sectors.length || sectors.indexOf(String(t.sector || 'kelali')) >= 0) &&
    (!tracks.length || tracks.indexOf(t.type === 'gemer' ? 'gemer' : 'bagrut') >= 0) &&
    String(t.name || '').trim()
  );
  // אותו מורה בבגרות ובגמר הוא שתי שורות בגיליון — למורה מציגים שם אחד
  const seen = {};
  const roster = [];
  teachers.forEach(t => {
    const key = meetNormName_(t.name) + '|' + String(t.school || t.schoolName || '');
    if (seen[key]) return;
    seen[key] = true;
    roster.push({ id: String(t.id), name: String(t.name).trim(), schoolName: String(t.schoolName || '').trim() });
  });
  roster.sort((a, b) => a.name.localeCompare(b.name, 'he'));
  return { ok: true, data: { open: true, topic: m.topic || '', openUntil: Number(m.openUntil), roster: roster } };
}

// ---------- המורה: רישום עצמי ----------
function checkinSubmit(p) {
  const slug = meetSlug_(p.g);
  if (!slug) return { ok: false, error: 'missing_guide' };
  const now = Date.now();
  const m = meetOpenFor_(slug, now);
  if (!m) return { ok: false, error: 'closed' };
  const date = meetDate_(m.date);   // תאריך המפגש — גם כשנרשמים במועד השני שלו

  const teacherId = meetStr_(p.teacherId, 80);
  let teacherName = meetStr_(p.teacherName, 120);
  let schoolName = meetStr_(p.schoolName, 120);
  if (!teacherId && (!teacherName || !schoolName)) return { ok: false, error: 'missing_params' };

  const who = teacherId || meetNormName_(teacherName) + '|' + meetNormName_(schoolName);
  const cache = CacheService.getScriptCache();
  const personKey = 'mfail:' + m.id + ':' + meetHmacHex_('who:' + who).slice(0, 24);
  const meetingKey = 'mfail:' + m.id;
  const personFails = Number(cache.get(personKey) || 0);
  const meetingFails = Number(cache.get(meetingKey) || 0);
  if (personFails >= MEET_FAIL_PER_PERSON || meetingFails >= MEET_FAIL_PER_MEETING) {
    return { ok: false, error: 'locked' };
  }

  const code = String(p.code || '').replace(/\D/g, '');
  const step = meetStep_(now);
  let codeOk = false;
  for (let i = 0; i <= MEET_CODE_GRACE_STEPS; i++) {
    if (code.length === 4 && meetSafeEqual_(code, meetCodeAt_(m.id, step - i))) { codeOk = true; break; }
  }
  if (!codeOk) {
    cache.put(personKey, String(personFails + 1), MEET_FAIL_WINDOW_SEC);
    cache.put(meetingKey, String(meetingFails + 1), MEET_FAIL_WINDOW_SEC);
    return { ok: false, error: 'bad_code' };
  }

  // מורה מהרשימה — השם ובית הספר נלקחים מהגיליון, לא מהדפדפן
  if (teacherId) {
    const t = readAll('teachers').find(x => String(x.id) === teacherId);
    if (!t) return { ok: false, error: 'unknown_teacher' };
    teacherName = String(t.name || '').trim();
    schoolName = String(t.schoolName || '').trim();
  }

  return meetWithLock_(() => {
    ensureTab_('meeting_attendance');
    const rows = readAll('meeting_attendance').filter(r => String(r.meetingId) === m.id);
    const existing = teacherId
      ? rows.find(r => String(r.teacherId) === teacherId)
      : rows.find(r => !r.teacherId &&
          meetNormName_(r.teacherName) === meetNormName_(teacherName) &&
          meetNormName_(r.schoolName) === meetNormName_(schoolName));
    const nowIso = new Date(now).toISOString();

    if (existing) {
      if (existing.selfCheckinAt) return { ok: true, data: { duplicate: true } };
      updateRowById('meeting_attendance', existing.id, {
        selfCheckinAt: nowIso, updatedAt: nowIso,
        status: existing.guideStatus || 'pending'
      });
      return { ok: true, data: { duplicate: false } };
    }
    appendRow('meeting_attendance', {
      id: newId('ma'), meetingId: m.id, guideSlug: slug, date: "'" + date,
      teacherId: teacherId, teacherName: teacherName, schoolName: schoolName,
      status: 'pending', guideStatus: '', selfCheckinAt: nowIso, markedAt: '',
      source: teacherId ? 'self' : 'self_unlisted', updatedAt: nowIso
    });
    return { ok: true, data: { duplicate: false } };
  });
}

// ---------- דוח נוכחות — מבט המפקח.ת והמבט הארצי (14.9.26) ----------
// קריאה בלבד. בכוונה לא ב-PUBLIC_ACTIONS: כשתידלק AUTH_ENFORCED הדוח ידרוש
// התחברות כמו שאר הדשבורדים. guides=<slug,slug> מצמצם למדריכים של מפקח.ת.
// המכנה (מי שייך לאיזו קבוצה) מחושב בדפדפן מ-guides.js — השרת לא מכיר אותו.
function meetReport(p) {
  ensureTab_('meetings');
  ensureTab_('meeting_attendance');
  const slugs = String(p.guides || '').split(',').map(meetSlug_).filter(Boolean);
  const inScope = r => !slugs.length || slugs.indexOf(String(r.guideSlug || '')) >= 0;
  const now = Date.now();

  const rows = readAll('meeting_attendance').filter(inScope).map(r => ({
    meetingId: String(r.meetingId || ''), guideSlug: String(r.guideSlug || ''),
    date: meetDate_(r.date), teacherId: String(r.teacherId || ''),
    teacherName: r.teacherName || '', schoolName: r.schoolName || '',
    status: r.status || '', guideStatus: r.guideStatus || '',
    self: !!r.selfCheckinAt, markedVia: r.markedVia || '', zoomMinutes: Number(r.zoomMinutes) || 0
  }));

  const counts = {};
  rows.forEach(r => {
    const c = counts[r.meetingId] || (counts[r.meetingId] = { present: 0, absent: 0, pending: 0, gaps: 0, zoom: 0 });
    if (c[r.status] !== undefined) c[r.status]++;
    if (r.self && r.guideStatus === 'absent') c.gaps++;
    if (r.markedVia === 'zoom') c.zoom++;
  });

  const meetings = readAll('meetings').filter(inScope).map(m => Object.assign(meetPublic_(m, now), {
    guideSlug: String(m.guideSlug || ''), guideName: m.guideName || '',
    openedAt: String(toIso_(m.openedAt) || ''),
    counts: counts[m.id] || { present: 0, absent: 0, pending: 0, gaps: 0, zoom: 0 }
  })).sort((a, b) => a.date.localeCompare(b.date));

  return { ok: true, data: { today: meetToday_(), meetings: meetings, rows: rows } };
}

// ============================================================
// תזכורת במייל למיטל בתחילת כל מפגש הדרכה (16.9.26)
// ------------------------------------------------------------
// טריגר זמן כל 5 דקות (meetRemindTick) → לכל מועד שהתחיל ב-15 הדקות האחרונות
// נשלח מייל אחד, עם קישור לעמוד בדיקת המפגש (ministry/mifgash-status.html)
// ומצב הרישום ברגע השליחה.
// לוח המפגשים לא מוחזק כאן: הקוד טוען מהאתר את guides.js ו-plans.js (מקור האמת
// היחיד) ומשתמש ב-TS_meetingSlots שבו. כך מדריך/ה חדש/ה ב-plans.js נכנס/ת
// לתזכורות לבד, בלי לגעת בשרת. הטעינה נשמרת במטמון לשעה.
//
// הפעלה חד-פעמית: בעורך Apps Script מריצים setupMeetReminders ומאשרים הרשאות
// (שליפת קבצים מהאתר + טריגרים). בדיקה: meetRemindTest שולח מייל לדוגמה.
// כיבוי: stopMeetReminders.
// סיכום נוכחות (16.9.26): שעתיים אחרי המועד האחרון של כל יום מפגש נשלח מייל שני —
// כמה נוכחים מתוך הקבוצה, מי ממתין לאישור, ואזהרה אם לא הוזנה נוכחות. בדיקה: meetSummaryTest.
// ============================================================

const REMIND_TO = 'meytalp@bethaarava.ort.org.il';
const REMIND_SITE = 'https://pedagogiamh.co.il/hadrachot/';
const REMIND_WINDOW_MIN = 15;     // מועד שהתחיל עד לפני 15 דק׳ עדיין נשלח (הטריגר רץ כל 5)
const REMIND_EARLY_MIN = 0;       // כמה דקות לפני תחילת המפגש לשלוח
// מייל סיכום נוכחות: שעתיים אחרי המועד האחרון של אותו יום (לכל מפגש בנפרד)
const REMIND_SUMMARY_AFTER_MIN = 120;

// { slots: [{ slug, mdate, date, start, part, topic, subject }], guides: { slug: { name, subject, insp } } }
function remindLoad_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('remind_data_v2');
  if (hit) return JSON.parse(hit);
  const ts = Date.now();
  const get = f => {
    const r = UrlFetchApp.fetch(REMIND_SITE + 'assets/' + f + '?t=' + ts, { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) throw new Error(f + ' HTTP ' + r.getResponseCode());
    return r.getContentText('UTF-8');
  };
  const win = {};
  // הקבצים כותבים רק ל-window.* — מריצים אותם עם window מקומי
  new Function('window', get('guides.js') + '\n;\n' + get('plans.js') + '\n;\n' + get('meet-stats.js'))(win);
  const data = { slots: [], guides: {}, roster: {} };
  Object.keys(win.TS_GUIDES || {}).forEach(k => {
    const g = win.TS_GUIDES[k];
    data.guides[k] = { name: g.name || k, subject: g.subject || (g.subjects || []).join(' + '),
                       insp: ((win.TS_INSPECTORS || {})[g.inspector] || {}).name || '' };
  });
  Object.keys(win.TS_PLANS || {}).forEach(slug => {
    (win.TS_PLANS[slug].meetings || []).forEach(m => {
      win.TS_meetingSlots(m).forEach(x => data.slots.push({
        slug: slug, mdate: m.date, date: x.date, start: x.start, part: x.part,
        topic: m.topic || '', subject: m.subject || ''
      }));
    });
  });
  // גודל הקבוצה לכל מדריכ/ה, ולכל מקצוע אצל מדריכ/ה בכמה מקצועות — אדם אחד לשם+בית ספר
  try {
    const teachers = readAll('teachers');
    const norm = x => String(x || '').replace(/\s+/g, ' ').trim().toLowerCase();
    Object.keys(win.TS_PLANS || {}).forEach(slug => {
      const g = Object.assign({ slug: slug }, (win.TS_GUIDES || {})[slug]);
      if (!g.name) return;
      const seen = {};
      teachers.forEach(t => {
        if (!win.TS_guideHasTeacher(g, t)) return;
        const k = norm(t.name) + '|' + norm(t.schoolName);
        [slug, slug + '|' + t.subject].forEach(key => {
          const set = seen[key] || (seen[key] = {});
          set[k] = 1;
        });
      });
      Object.keys(seen).forEach(key => { data.roster[key] = Object.keys(seen[key]).length; });
    });
  } catch (e) { console.error('remindLoad_: roster ' + e); }
  const json = JSON.stringify(data);
  if (Utilities.newBlob(json).getBytes().length < 90000) cache.put('remind_data_v2', json, 3600);
  return data;
}

// כל המועדים, עם at = דקות לפי שעון ישראל
function remindSlots_(data) {
  return data.slots.map(s => Object.assign({ at: remindMinutes_(s.date, s.start) }, s));
}

// דקות מאז 1970 לפי שעון ישראל — השוואה בלי להתעסק בשעון קיץ
function remindMinutes_(date, hhmm) {
  const d = date.split('-').map(Number), t = hhmm.split(':').map(Number);
  return Math.round(Date.UTC(d[0], d[1] - 1, d[2], t[0], t[1]) / 60000);
}

function remindNowMinutes_() {
  const s = Utilities.formatDate(new Date(), MEET_TZ, 'yyyy-MM-dd HH:mm').split(' ');
  return remindMinutes_(s[0], s[1]);
}

function meetRemindTick() {
  let data;
  try { data = remindLoad_(); }
  catch (e) { console.error('meetRemindTick: load failed ' + e); return; }
  const now = remindNowMinutes_();
  const slots = remindSlots_(data);
  const due = slots.filter(s =>
    s.at - REMIND_EARLY_MIN <= now && now - s.at < REMIND_WINDOW_MIN);
  const sums = remindSummaries_(slots).filter(x => x.at <= now && now - x.at < REMIND_WINDOW_MIN);
  if (!due.length && !sums.length) return;
  const props = PropertiesService.getScriptProperties();
  sums.forEach(x => {
    const key = 'remind_sum_' + x.slug + '_' + x.date + '_' + x.last.replace(':', '');
    if (props.getProperty(key)) return;
    props.setProperty(key, String(Date.now()));
    try { remindSendSummary_(data, x, false); }
    catch (e) { console.error('meetRemindTick: summary failed ' + key + ' ' + e); }
  });
  due.forEach(s => {
    const key = 'remind_' + s.slug + '_' + s.date + '_' + s.start.replace(':', '');
    if (props.getProperty(key)) return;
    props.setProperty(key, String(Date.now()));   // קודם מסמנים — כשל שליחה לא יציף במיילים
    try { remindSend_(data, s, false); }
    catch (e) { console.error('meetRemindTick: send failed ' + key + ' ' + e); }
  });
  remindCleanup_(props, now);
}

// מוחק סימוני "נשלח" בני יותר מ-3 ימים
function remindCleanup_(props, now) {
  const all = props.getProperties();
  Object.keys(all).forEach(k => {
    const m = /^remind_.+_(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})$/.exec(k);
    if (m && now - remindMinutes_(m[1], m[2] + ':' + m[3]) > 3 * 24 * 60) props.deleteProperty(k);
  });
}

function remindEsc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function remindSend_(data, s, isTest) {
  const g = data.guides[s.slug] || {};
  const insp = g.insp || '';
  const subject = s.subject || g.subject || '';
  const name = g.name || s.slug;
  const dm = +s.date.slice(8, 10) + '.' + +s.date.slice(5, 7);
  const link = REMIND_SITE + 'ministry/mifgash-status.html?g=' + encodeURIComponent(s.slug) + '&d=' + s.mdate;

  // מצב הרישום ברגע השליחה (המפגש נרשם תחת mdate גם כשהמועד ביום אחר)
  const row = meetFind_(meetId_(s.slug, s.mdate));
  let state;
  if (!row) state = 'המדריך/ה עוד לא נכנס/ה ללשונית הנוכחות של המפגש הזה.';
  else {
    const open = Number(row.openUntil) > Date.now();
    const rows = readAll('meeting_attendance').filter(r => String(r.meetingId) === String(row.id));
    const c = { present: 0, absent: 0, pending: 0 };
    rows.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
    state = (open ? 'הרישום העצמי פתוח עכשיו. ' : 'הרישום העצמי סגור כרגע. ') +
      'סומנו: ' + c.present + ' נוכחים · ' + c.absent + ' לא נכחו · ' + c.pending + ' נרשמו בעצמם וממתינים לאישור.';
  }

  const title = (isTest ? '[בדיקה] ' : '') + 'מתחילה עכשיו הדרכה: ' + subject + ' · ' + name + ' · ' + s.start;
  const lines = [
    ['מדריך/ה', name],
    ['מקצוע', subject],
    ['מועד', dm + ' בשעה ' + s.start + (s.part ? ' · ' + s.part : '')],
    ['נושא', s.topic],
    ['מפקח/ת', insp],
    ['מצב הרישום', state]
  ].filter(x => x[1]);
  const html =
    '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1b2a3a">' +
    '<p style="margin:0 0 12px">מיטל, מתחיל עכשיו מפגש הדרכה. כדאי לוודא שהרישום מתבצע.</p>' +
    '<table style="border-collapse:collapse;margin-bottom:16px">' +
    lines.map(x => '<tr><td style="padding:4px 0 4px 16px;color:#5b6b7b;white-space:nowrap;vertical-align:top">' +
      remindEsc_(x[0]) + '</td><td style="padding:4px 0">' + remindEsc_(x[1]) + '</td></tr>').join('') +
    '</table>' +
    '<p style="margin:0 0 18px"><a href="' + link + '" style="background:#256A8A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;display:inline-block">בדיקת הנוכחות במפגש</a></p>' +
    '<p style="margin:0;font-size:12px;color:#8a97a6">העמוד מתעדכן כל דקה: האם הרישום נפתח, מי סומן ומי עוד לא. נדרשת התחברות כמנהלת.<br>' +
    'תזכורת אוטומטית ממצפן ההדרכות · הכיבוי: stopMeetReminders בעורך Apps Script.</p></div>';
  const text = lines.map(x => x[0] + ': ' + x[1]).join('\n') + '\n\nבדיקת הנוכחות: ' + link;
  MailApp.sendEmail({ to: REMIND_TO, subject: title, body: text, htmlBody: html, name: 'מצפן ההדרכות' });
}

// יום מפגש = כל המועדים של מפגש אחד באותו תאריך. הסיכום יוצא REMIND_SUMMARY_AFTER_MIN
// אחרי המועד האחרון שלו, ומסכם את המפגש כולו עד אותו רגע (שני ימים = מצטבר).
function remindSummaries_(slots) {
  const byDay = {};
  slots.forEach(s => {
    const k = s.slug + '|' + s.mdate + '|' + s.date;
    const d = byDay[k] || (byDay[k] = { slug: s.slug, mdate: s.mdate, date: s.date, topic: s.topic, subject: s.subject, last: s.start, lastAt: s.at });
    if (s.at > d.lastAt) { d.lastAt = s.at; d.last = s.start; }
  });
  const days = Object.keys(byDay).map(k => byDay[k]);
  days.forEach(d => {
    d.at = d.lastAt + REMIND_SUMMARY_AFTER_MIN;
    d.later = days.filter(o => o.slug === d.slug && o.mdate === d.mdate && o.date > d.date).map(o => o.date).sort();
  });
  return days;
}

function remindSendSummary_(data, x, isTest) {
  const g = data.guides[x.slug] || {};
  const name = g.name || x.slug;
  const subject = x.subject || g.subject || '';
  const dm = d => +d.slice(8, 10) + '.' + +d.slice(5, 7);
  const link = REMIND_SITE + 'ministry/mifgash-status.html?g=' + encodeURIComponent(x.slug) + '&d=' + x.mdate;
  const total = data.roster[x.subject ? x.slug + '|' + x.subject : x.slug] || 0;

  const row = meetFind_(meetId_(x.slug, x.mdate));
  const rows = row ? readAll('meeting_attendance').filter(r => String(r.meetingId) === String(row.id)) : [];
  const by = { present: [], absent: [], pending: [] };
  rows.forEach(r => { if (by[r.status]) by[r.status].push(r); });
  const gaps = rows.filter(r => r.selfCheckinAt && r.guideStatus === 'absent').length;
  const marked = by.present.length + by.absent.length;
  const pct = total ? Math.round(by.present.length / total * 100) : null;

  const headline = marked
    ? 'נוכחים: ' + by.present.length + (total ? ' מתוך ' + total + ' (' + pct + '%)' : '')
    : (by.pending.length ? 'המדריך/ה לא אישר/ה נוכחות — ' + by.pending.length + ' נרשמו בעצמם' : 'לא הוזנה נוכחות');
  const title = (isTest ? '[בדיקה] ' : '') + 'סיכום נוכחות: ' + subject + ' · ' + name + ' · ' + dm(x.date) + ' — ' + headline;

  const facts = [
    ['מדריך/ה', name],
    ['מקצוע', subject],
    ['מפגש', dm(x.mdate) + (x.date !== x.mdate ? ' (מועד נוסף ' + dm(x.date) + ')' : '') + (x.topic ? ' · ' + x.topic : '')],
    ['נוכחים', by.present.length + (total ? ' מתוך ' + total + ' מורים בקבוצה · ' + pct + '%' : '')],
    ['לא נכחו', String(by.absent.length)],
    ['נרשמו בעצמם וממתינים לאישור', String(by.pending.length)],
    ['פערים', gaps ? gaps + ' (נרשמו בעצמם וסומנו "לא נכח")' : ''],
    ['הערה', x.later.length ? 'זה סיכום ביניים — למפגש יש עוד מועד ב-' + x.later.map(dm).join(', ') + '.' : '']
  ].filter(f => f[1]);
  const warn = marked ? '' : (row
    ? 'המדריך/ה נכנס/ה למפגש אבל עוד לא סימן/ה נוכחות.'
    : 'המדריך/ה לא נכנס/ה ללשונית הנוכחות של המפגש הזה.');

  const names = (arr, max) => {
    const sorted = arr.slice().sort((a, b) => String(a.schoolName).localeCompare(String(b.schoolName), 'he') ||
      String(a.teacherName).localeCompare(String(b.teacherName), 'he'));
    const shown = sorted.slice(0, max).map(r => remindEsc_(r.teacherName) + ' <span style="color:#8a97a6">· ' + remindEsc_(r.schoolName) + '</span>');
    return shown.join('<br>') + (sorted.length > max ? '<br><span style="color:#8a97a6">ועוד ' + (sorted.length - max) + '…</span>' : '');
  };
  const block = (t, arr) => arr.length
    ? '<p style="margin:14px 0 4px;font-weight:bold">' + remindEsc_(t) + ' (' + arr.length + ')</p><div style="font-size:13px;line-height:1.7">' + names(arr, 80) + '</div>'
    : '';

  const html =
    '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1b2a3a">' +
    '<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:' + (marked ? '#1f7a5c' : '#a4442f') + '">' + remindEsc_(headline) + '</p>' +
    (warn ? '<p style="margin:0 0 12px;padding:8px 12px;background:#FDF4F1;border-radius:8px;color:#8f2f1c">' + remindEsc_(warn) + '</p>' : '') +
    '<table style="border-collapse:collapse;margin:8px 0 14px">' +
    facts.map(f => '<tr><td style="padding:3px 0 3px 16px;color:#5b6b7b;white-space:nowrap;vertical-align:top">' +
      remindEsc_(f[0]) + '</td><td style="padding:3px 0">' + remindEsc_(f[1]) + '</td></tr>').join('') +
    '</table>' +
    '<p style="margin:0 0 6px"><a href="' + link + '" style="background:#256A8A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;display:inline-block">לפירוט המלא — כולל מי לא סומן</a></p>' +
    block('נוכחים', by.present) + block('ממתינים לאישור המדריך/ה', by.pending) + block('סומנו "לא נכח/ה"', by.absent) +
    '<p style="margin:18px 0 0;font-size:12px;color:#8a97a6">סיכום אוטומטי ממצפן ההדרכות, שעתיים אחרי המועד האחרון של היום.</p></div>';
  const text = headline + '\n' + (warn ? warn + '\n' : '') + '\n' +
    facts.map(f => f[0] + ': ' + f[1]).join('\n') + '\n\nפירוט: ' + link;
  MailApp.sendEmail({ to: REMIND_TO, subject: title, body: text, htmlBody: html, name: 'מצפן ההדרכות' });
}

// מייל סיכום לדוגמה — על יום המפגש האחרון שכבר עבר (לא מסמן "נשלח")
function meetSummaryTest() {
  const data = remindLoad_();
  const now = remindNowMinutes_();
  const x = remindSummaries_(remindSlots_(data)).filter(d => d.lastAt <= now).sort((a, b) => b.lastAt - a.lastAt)[0];
  if (x) remindSendSummary_(data, x, true);
}

// להריץ פעם אחת מהעורך: מאשר הרשאות, מתקין טריגר כל 5 דקות, ושולח מייל בדיקה
function setupMeetReminders() {
  stopMeetReminders();
  ScriptApp.newTrigger('meetRemindTick').timeBased().everyMinutes(5).create();
  const data = remindLoad_();
  const now = remindNowMinutes_();
  const next = remindSlots_(data).filter(s => s.at >= now).sort((a, b) => a.at - b.at).slice(0, 5);
  console.log('הטריגר הותקן. המועדים הקרובים: ' +
    next.map(s => s.slug + ' ' + s.date + ' ' + s.start).join(' | '));
  meetRemindTest();
}

function stopMeetReminders() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'meetRemindTick')
    .forEach(t => ScriptApp.deleteTrigger(t));
}

// מייל בדיקה על המועד הקרוב ביותר — לא מסמן "נשלח"
function meetRemindTest() {
  const data = remindLoad_();
  const now = remindNowMinutes_();
  const s = remindSlots_(data).filter(x => x.at >= now).sort((a, b) => a.at - b.at)[0];
  if (s) remindSend_(data, s, true);
}
