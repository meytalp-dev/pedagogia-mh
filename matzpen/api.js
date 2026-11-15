/* חיבור לשרת. EXEC ריק = שרת מדומה בדפדפן (לבדיקות מקומיות בלבד). */
(function () {
  var EXEC = (window.MZ_EXEC || '');

  function real(body) {
    return fetch(EXEC, {
      method: 'POST', credentials: 'omit', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  /* ---- שרת מדומה ---- */
  function ls(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem('mzmock:' + k) || 'null');
      localStorage.setItem('mzmock:' + k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  function mock(q) {
    var codes = ls('codes') || {}, db = ls('db') || {};
    var r;
    switch (q.a) {
      case 'status': r = { ok: true, hasCode: !!codes[q.school] }; break;
      case 'setCode':
        if (String(q.code).length < 6) r = { ok: false, err: 'short' };
        else if (codes[q.school]) r = { ok: false, err: 'exists' };
        else { codes[q.school] = q.code; ls('codes', codes); r = { ok: true, t: 'mock|' + q.school }; }
        break;
      case 'login':
        if (!codes[q.school]) r = { ok: false, err: 'nocode' };
        else if (codes[q.school] !== q.code) r = { ok: false, err: 'wrong' };
        else r = { ok: true, t: 'mock|' + q.school };
        break;
      case 'get': {
        var s = String(q.t || '').split('|')[1];
        if (!s || !codes[s]) { r = { ok: false, err: 'auth' }; break; }
        r = { ok: true, school: s, data: db[s] || {} }; break;
      }
      case 'set': {
        var s2 = String(q.t || '').split('|')[1];
        if (!s2 || !codes[s2]) { r = { ok: false, err: 'auth' }; break; }
        db[s2] = db[s2] || {};
        (q.items || []).forEach(function (it) { db[s2][it.k] = { v: String(it.v), u: Date.now() }; });
        ls('db', db); r = { ok: true, u: Date.now() }; break;
      }
      default: r = { ok: false, err: 'action' };
    }
    return new Promise(function (res) { setTimeout(function () { res(JSON.parse(JSON.stringify(r))); }, 120); });
  }

  window.MZApi = {
    call: function (body) { return EXEC ? real(body) : mock(body); },
    isMock: !EXEC
  };
})();
