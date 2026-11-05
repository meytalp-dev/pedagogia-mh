/* ועדה מלווה — הערך של שדה בטופס (5.11.26).
   סדר העדיפות: מה שבית הספר שמר, נתון מוכן (V.seed), ומה שכבר ידוע במערכת (מפקח, מגמות, בעלי תפקידים, אקלים).
   שמירה של ריק נחשבת שמירה: הנתון המוכן לא חוזר. ערך שלא נמצא נשאר ריק.
   למצגת (deckValue): נתון מוכן של שנה קודמת נכנס רק אחרי שבית הספר אישר אותו, חוץ מטבלאות שיש בהן שורת שנה.
   ES5 בלבד, בלי תלות ב-app.js. */
window.VAADA_PREFILL = (function () {
  'use strict';

  /* התאמת שורות הטבלה לשמות התפקידים בנספח */
  var ROLE_MATCH = { 'מנהל.ת': /^מנהל/, 'סגן.ית מנהל.ת': /סגן/, 'רכז פדגוגי': /פדגוג/, 'רכז חניכות': /חניכות/, 'רכז חברתי': /חברתי/, 'יועץ/יועצים': /יוע[ץצ]|ייעוץ/, 'מת"לית': /מת.?ל/, 'רכז הכלה ושילוב': /הכלה|שילוב/ };

  function str(x) { return x == null ? '' : String(x); }
  function filled(x) {
    if (x == null) return false;
    if (typeof x === 'string') return x.trim() !== '';
    if (Array.isArray(x)) return x.some(filled);
    if (typeof x === 'object') return Object.keys(x).some(function (k) { return filled(x[k]); });
    return true;
  }
  function savedData(V, secId) { return ((V.secs || {})[secId] || {}).data || {}; }
  function isSaved(V, secId, f) { return savedData(V, secId)[f.k] !== undefined; }
  function seedOf(V, secId, f) {
    if (V.v && V.v.status === 'closed') return null;
    var e = ((V.seed || {})[secId] || {})[f.k];
    return e && filled(e.v) ? e : null;
  }

  function megamotRows(V, f) {
    var m = (V.school || {}).megamot || [];
    if (f.prefill === 'megamot') return m.map(function (x) { return [x[0], x[1]]; });
    if (f.prefill === 'megamotName') return m.map(function (x) { return [x[0]]; });
    return [];
  }
  /* שמות מהנספח. חברות בהנהלה והכשרה ממלאים ידנית */
  function rolesRows(V, f) {
    return f.rows.map(function (l) {
      var names = V.tuva.roles.filter(function (r) { return !r.vacant && r.name && ROLE_MATCH[l] && ROLE_MATCH[l].test(r.role || ''); }).map(function (r) { return r.name; });
      /* המנהל.ת לא ברשימת הנספח: השם מקובץ המנהלים */
      var pr = ((V.seed || {}).sipur || {}).principal;
      if (l === 'מנהל.ת' && !names.length && pr && filled(pr.v)) names = [pr.v];
      return [names.join(', '), '', ''];
    });
  }
  /* סדר העמודות: קהל, ממד, תשפ"ד, תשפ"ה, תשפ"ו, בתי ספר דומים. תא חסר נשאר ריק */
  function aklimRows(V) {
    return ((V.tuva || {}).aklim || []).map(function (r) {
      return [str(r['קהל']) + (str(r['יחידה']) ? ' · ' + str(r['יחידה']) : ''), str(r['ממד']), str(r['תשפ"ד']), str(r['תשפ"ה']), str(r['תשפ"ו']), str(r['השוואה'])];
    });
  }

  function isTuvaField(secId, f) { return (secId === 'koach' && f.k === 'roles') || f.prefill === 'aklim'; }
  /* מה שידוע במערכת, בלי מה שנשמר ובלי נתון מוכן */
  function known(V, secId, f) {
    if (secId === 'sipur' && f.k === 'sup') return ((V.school || {}).sups || []).join(' · ');
    if (secId === 'koach' && f.k === 'roles' && (V.tuva || {}).roles) return rolesRows(V, f);
    if (f.prefill === 'aklim') return aklimRows(V);
    if (f.t === 'table' && f.add) return megamotRows(V, f);
    if (f.t === 'repeat' && f.prefill) return megamotRows(V, f).map(function (r) { return { name: r[0] }; });
    return undefined;
  }

  function value(V, secId, f) {
    if (isSaved(V, secId, f)) return savedData(V, secId)[f.k];
    var e = seedOf(V, secId, f);
    return e ? e.v : known(V, secId, f);
  }
  /* למצגת: מה שמתאים להציג כנתון של השנה. שדה בלי שורת שנה (צוות, שילוב, בעלי תפקידים) עובר רק אחרי אישור בית הספר */
  var DECK_SEED = { netunim: { students: 1, classes: 1 }, gmar: { elig: 1 }, taasuka: { yod_a: 1, yod_b: 1 }, sipur: { principal: 1 }, aklim: { scores: 1 } };
  function deckValue(V, secId, f) {
    if (isSaved(V, secId, f)) return savedData(V, secId)[f.k];
    var e = seedOf(V, secId, f);
    return e && (DECK_SEED[secId] || {})[f.k] ? e.v : known(V, secId, f);
  }
  /* מאיפה הגיע ערך שעוד לא נשמר. ריק: אין מה לסמן */
  function source(V, secId, f) {
    if (isSaved(V, secId, f)) return '';
    var e = seedOf(V, secId, f);
    if (e) return str(e.src);
    return isTuvaField(secId, f) && filled(known(V, secId, f)) ? 'תובה' : '';
  }
  /* יש בתחום נתון מוכן שעוד לא נשמר */
  function hasAny(V, secId) {
    var sec = VAADA.section(V.v.stage, secId);
    return !!sec && sec.fields.some(function (f) { return source(V, secId, f) !== ''; });
  }

  return { value: value, deckValue: deckValue, source: source, hasAny: hasAny };
})();
