/* ============================================================
   name-match.js — התאמת שמות בכתיב שונה (29.9.26, בקשת מיטל)
   -----------------------------------------------------------
   בהדרכה של סוהא (29.9) מורים כתבו "השם שלי לא מופיע" — ורובם כן היו
   ברשימה, בכתיב אחר: בוח'ארי עביר / עביר בוחארי, שרארה אנע'אם / אנג'אם
   שרארה, עורובה / ערובה. בעיקר שמות ערביים בתעתיק עברי.
   ההשוואה מתעלמת מ: גרש (ג'/ע'/ח'), ע↔ג, אותיות סופיות, וו/יי כפולות,
   א/ה בסוף מילה, א באמצע, סדר המילים, ושגיאת הקלדה קטנה (Levenshtein יחסי).
   נבדק על 11 המקרים מהיום: 10/10 זוהו, והחסרה (ליאנא נביל) לא הותאמה לאף אחד.

   TS_nameMatch.score(a, b)      → 0..1 (כמה מילים של a נמצאות ב-b)
   TS_nameMatch.similar(a, b)    → ציון סימטרי (לזיהוי כפילויות)
   TS_nameMatch.suggest(q, rows, {min, max}) → [{row, score}] ממוין
   ============================================================ */
(function () {
  function words(s) {
    s = String(s || '').replace(/["'׳״`’\-.]/g, '');
    s = s.replace(/ע/g, 'ג').replace(/ך/g, 'כ').replace(/ם/g, 'מ').replace(/ן/g, 'נ')
      .replace(/ף/g, 'פ').replace(/ץ/g, 'צ');
    s = s.replace(/וו+/g, 'ו').replace(/יי+/g, 'י');
    s = s.replace(/[הא](?=\s|$)/g, '');
    s = s.replace(/א/g, '');
    return s.split(/\s+/).filter(Boolean);
  }
  function lev(a, b) {
    const d = [];
    for (let j = 0; j <= b.length; j++) d[j] = j;
    for (let i = 1; i <= a.length; i++) {
      let p = d[0];
      d[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const t = d[j];
        d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1));
        p = t;
      }
    }
    return d[b.length];
  }
  function score(q, n) {
    const A = words(q), B = words(n);
    if (!A.length || !B.length) return 0;
    let tot = 0;
    A.forEach(w => {
      let best = 1;
      B.forEach(x => { best = Math.min(best, lev(w, x) / Math.max(w.length, x.length, 1)); });
      tot += 1 - best;
    });
    return tot / A.length;
  }
  function similar(a, b) { return Math.min(score(a, b), score(b, a)); }
  function suggest(q, rows, opt) {
    opt = opt || {};
    const min = opt.min == null ? 0.75 : opt.min;
    const seen = {};
    return (rows || [])
      .map(r => ({ row: r, score: score(q, r.name) }))
      .filter(x => x.score >= min)
      .sort((a, b) => b.score - a.score)
      .filter(x => {
        const k = String(x.row.name).trim() + '|' + String(x.row.subject || '').trim();
        if (seen[k]) return false;
        seen[k] = 1;
        return true;
      })
      .slice(0, opt.max || 4);
  }
  window.TS_nameMatch = { words: words, score: score, similar: similar, suggest: suggest };
})();
