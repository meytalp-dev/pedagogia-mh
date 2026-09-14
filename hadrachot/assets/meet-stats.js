/* ============================================================
   חישוב נוכחות במפגשי ההדרכה — משותף למבט המפקח.ת ולמבט הארצי (14.9.26)
   -----------------------------------------------------------
   קלט: תשובת meet.report (מפגשים + שורות נוכחות), teachers.list, guides.js,
   plans.js. פלט: לכל מדריכ/ה ולכל משתתף/ת — כמה מפגשים התקיימו, כמה השתתף/ה.

   כללי הספירה (אותם כללים בכל מקום שמציג נוכחות):
   · "מפגש שהתקיים" = תאריך שעבר או היום, ושהמדריכ/ה סימנ/ה בו לפחות נוכחות אחת.
     רק הוא נכנס למכנה. מפגש מהתוכנית שתאריכו עבר ואין בו סימון — "לא הוזנה
     נוכחות", ומוצג כהתראה ולא כהיעדרות של כל הקבוצה.
   · נוכחות = status 'present' בלבד. רישום עצמי שלא אושר ('pending') לא נספר.
   · הקבוצה של מדריכ/ה = מקצוע + מגזר + מסלול + יח"ל, בדיוק כמו בדשבורד המדריכ/ה:
     מורה בגרות שטרם סומנו לו יח"ל שייך לשתי הקבוצות (שירה וגל).
   · אותו מורה בבגרות ובגמר (שתי שורות במערכת) הוא משתתף אחד.
   ============================================================ */
(function () {
  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

  function unitsOf(v) {
    return (window.TS && TS.unitsSet) ? TS.unitsSet(v) : (String(v || '').trim() ? [String(v).trim()] : []);
  }

  // האם המורה בקבוצה של המדריכ/ה — זהה ל-isMine + סינון המגזר/מסלול ב-guide/dashboard.js
  window.TS_guideHasTeacher = function (g, t) {
    if (!g || !t) return false;
    if (!window.TS_guideTeaches(g, t.subject)) return false;
    const sector = t.sector || 'kelali';
    if (g.sectors && g.sectors.length && g.sectors.indexOf(sector) < 0) return false;
    const track = t.type === 'gemer' ? 'gemer' : 'bagrut';
    if (Array.isArray(g.tracks) && g.tracks.length && g.tracks.indexOf(track) < 0) return false;
    if (Array.isArray(g.units) && g.units.length && track !== 'gemer') {
      const u = unitsOf(t.units);
      if (u.length && !u.some(x => g.units.indexOf(x) >= 0)) return false;
    }
    return true;
  };

  window.TS_meetStats = function (opts) {
    const today = opts.today || new Date().toISOString().slice(0, 10);
    const guides = opts.guides || [];
    const teachers = opts.teachers || [];
    const meetings = opts.meetings || [];
    const rows = opts.rows || [];

    const rowsByMeeting = {};
    rows.forEach(r => { (rowsByMeeting[r.meetingId] = rowsByMeeting[r.meetingId] || []).push(r); });

    const out = { today: today, guides: [], persons: [] };

    guides.forEach(g0 => {
      const g = Object.assign({}, g0);
      const myMeetings = meetings.filter(m => m.guideSlug === g.slug);
      const held = myMeetings.filter(m => m.date <= today && (m.counts.present + m.counts.absent) > 0);
      const heldIds = new Set(held.map(m => m.id));

      // משתתפים: קיבוץ לפי שם + בית ספר
      const groups = {};
      const persons = [];
      teachers.forEach(t => {
        if (!window.TS_guideHasTeacher(g, t)) return;
        const key = norm(t.name) + '|' + norm(t.schoolName || t.school);
        let p = groups[key];
        if (!p) {
          p = groups[key] = {
            key: g.slug + ':' + key, guideSlug: g.slug, guideName: g.name,
            name: t.name || '', schoolName: t.schoolName || '', school: t.school || '',
            network: String(t.network || '').replace(/^net_/, ''), sector: t.sector || 'kelali',
            subject: t.subject, ids: [], present: 0, absent: 0, pending: 0, zoom: 0,
            attended: [], missed: []
          };
          persons.push(p);
        }
        p.ids.push(String(t.id));
      });
      const personById = {};
      persons.forEach(p => p.ids.forEach(id => { personById[id] = p; }));

      let outside = 0;
      rows.forEach(r => {
        if (r.guideSlug !== g.slug || !heldIds.has(r.meetingId)) return;
        const p = r.teacherId ? personById[r.teacherId] : null;
        if (!p) { if (r.status === 'present') outside++; return; }
        if (r.status === 'present') { p.present++; p.attended.push(r.meetingId); if (r.markedVia === 'zoom') p.zoom++; }
        else if (r.status === 'absent') p.absent++;
        else if (r.status === 'pending') p.pending++;
      });
      persons.forEach(p => {
        // אותו אדם עם שתי שורות (בגרות+גמר) שסומן פעמיים באותו מפגש — נספר פעם אחת
        p.attended = Array.from(new Set(p.attended));
        p.present = p.attended.length;
        p.held = held.length;
        p.missed = held.filter(m => p.attended.indexOf(m.id) < 0).map(m => m.date);
        p.rate = held.length ? Math.round(p.present / held.length * 100) : null;
      });
      persons.sort((a, b) => a.schoolName.localeCompare(b.schoolName, 'he') || a.name.localeCompare(b.name, 'he'));

      // מפגשים מהתוכנית שעברו בלי רישום
      const plan = window.TS_planFor ? window.TS_planFor(g.slug) : null;
      const planMeetings = plan && plan.meetings ? plan.meetings : [];
      const unrecorded = planMeetings
        .filter(pm => pm.date < today && !held.some(m => m.date === pm.date))
        .map(pm => ({ date: pm.date, label: pm.label, topic: pm.topic || '' }));
      const next = planMeetings.find(pm => pm.date >= today) || null;

      const presentSum = persons.reduce((s, p) => s + p.present, 0);
      const last = held.length ? held[held.length - 1] : null;
      Object.assign(g, {
        persons: persons,
        meetings: myMeetings,
        held: held.map(m => Object.assign({}, m, {
          rosterPresent: persons.filter(p => p.attended.indexOf(m.id) >= 0).length
        })),
        unrecorded: unrecorded,
        next: next,
        planTotal: planMeetings.length,
        rosterN: persons.length,
        presentSum: presentSum,
        outsidePresent: outside,
        rate: (held.length && persons.length) ? Math.round(presentSum / (held.length * persons.length) * 100) : null,
        never: held.length ? persons.filter(p => p.present === 0) : [],
        pending: myMeetings.reduce((s, m) => s + (m.counts.pending || 0), 0),
        gaps: myMeetings.reduce((s, m) => s + (m.counts.gaps || 0), 0),
        last: last ? {
          date: last.date, topic: last.topic,
          present: persons.filter(p => p.attended.indexOf(last.id) >= 0).length,
          absent: last.counts.absent
        } : null
      });
      out.guides.push(g);
      out.persons = out.persons.concat(persons);
    });
    return out;
  };

  window.TS_meetDateLabel = function (iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? Number(m[3]) + '.' + Number(m[2]) + '.' + m[1].slice(2) : '';
  };

  window.TS_rateClass = function (r) {
    if (r === null || r === undefined) return 'none';
    return r >= 80 ? 'high' : r >= 60 ? 'mid' : 'low';
  };
})();
