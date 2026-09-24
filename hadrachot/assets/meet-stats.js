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
   · **יחידת הספירה היא חודש, לא מועד (18.9.26, קביעת מיטל).** בכל חודש יש
     שני מועדים — בוקר וערב — אבל זו הדרכה אחת, והמורה צריך/ה להשתתף באחד
     מהם. לכן `present`/`held` של כל משתתף/ת נספרים ב**חודשים**: חודש שבו
     נכח/ה באחד המועדים נספר כנוכחות מלאה. פירוט המועדים נשמר ב-`sessions*`.
   · הקבוצה של מדריכ/ה = מקצוע + מגזר + מסלול + יח"ל, בדיוק כמו בדשבורד המדריכ/ה:
     מורה בגרות שטרם סומנו לו יח"ל שייך לשתי הקבוצות (שירה וגל).
   · אותו מורה בבגרות ובגמר (שתי שורות במערכת) הוא משתתף אחד.
   · הדרכה פרטנית (טאב guide_hours) **נספרת כהשתתפות חודשית** (החלטת מיטל
     20.9.26, שינוי מ-14.9). היחידה היא חודש, ולכן שעה פרטנית רק **מספקת**
     את החודש שבו ניתנה — כמו נוכחות באחד המועדים — והאחוז לא יכול לעבור
     100%. חודש בלי הדרכה קבוצתית שניתנה בו שעה פרטנית **נמדד** דרכה.
     כך המסכים סופרים בדיוק כמו הדוח החודשי במייל. הפירוט נשאר נפרד:
     p.groupMonths (קבוצתי בלבד) · p.individualMonths · mo.viaIndividual.
     התאמה לפי שם + בית ספר (הרישום בטופס ממלא אותם מרשימת הקבוצה; אין teacherId).
     רק שעות משנת הלימודים הנוכחית (מ-1.9).
   · דרישה: כל בית ספר בקבוצה מקבל לפחות הדרכה פרטנית אחת בשנה —
     g.schoolsNoIndividual = בתי הספר שעוד לא.
   ============================================================ */
(function () {
  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

  // תוויות חודש — בלי תלות ב-TS: meet-stats נטען גם בשרת (הדוח החודשי במייל)
  const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                     'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  function monthKey(date) { return String(date || '').slice(0, 7); }
  function monthLabel(key) {
    const m = String(key || '').match(/^(\d{4})-(\d{2})$/);
    return m ? HE_MONTHS[Number(m[2]) - 1] + ' ' + m[1] : String(key || '');
  }
  window.TS_meetMonthLabel = monthLabel;

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

  // תחילת שנת הלימודים של תאריך נתון — 1.9
  window.TS_schoolYearStart = function (today) {
    const [y, m] = String(today).slice(0, 7).split('-').map(Number);
    return (m >= 9 ? y : y - 1) + '-09-01';
  };

  // שעות פרטניות — מקבל { slug: [..] } (כמו guide.workspace) או מערך עם guideSlug
  function hoursBySlug(hours) {
    if (!hours) return {};
    if (!Array.isArray(hours)) return hours;
    const out = {};
    hours.forEach(h => { (out[h.guideSlug] = out[h.guideSlug] || []).push(h); });
    return out;
  }

  window.TS_meetStats = function (opts) {
    const today = opts.today || new Date().toISOString().slice(0, 10);
    const guides = opts.guides || [];
    const teachers = opts.teachers || [];
    const meetings = opts.meetings || [];
    const rows = opts.rows || [];
    const yearStart = window.TS_schoolYearStart(today);
    const allHours = hoursBySlug(opts.hours);
    const hoursLoaded = !!opts.hours;

    const rowsByMeeting = {};
    rows.forEach(r => { (rowsByMeeting[r.meetingId] = rowsByMeeting[r.meetingId] || []).push(r); });

    const out = { today: today, guides: [], persons: [] };

    guides.forEach(g0 => {
      const g = Object.assign({}, g0);
      const myMeetings = meetings.filter(m => m.guideSlug === g.slug);
      const held = myMeetings.filter(m => m.date <= today && (m.counts.present + m.counts.absent) > 0);
      const heldIds = new Set(held.map(m => m.id));
      // מדריכה בשני מקצועות (רבקה): מפגש של מקצוע אחד לא נספר למורי המקצוע השני
      const subjOf = m => (window.TS_meetingSubject ? window.TS_meetingSubject(g.slug, m.date) : '');

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
            subject: t.subject, subjects: [], ids: [], present: 0, absent: 0, pending: 0, zoom: 0,
            attended: [], missed: [], individual: 0, individualHours: 0, individualDates: []
          };
          persons.push(p);
        }
        p.ids.push(String(t.id));
        if (t.subject && p.subjects.indexOf(t.subject) < 0) p.subjects.push(t.subject);
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
      // חודשי ההדרכה שהתקיימו — יחידת הספירה. מועד בוקר ומועד ערב באותו חודש
      // הם הדרכה אחת, ולכן הם מתמזגים לשורה אחת.
      const monthsMap = {};
      held.forEach(m => {
        const k = monthKey(m.date);
        const mo = monthsMap[k] || (monthsMap[k] = {
          key: k, label: monthLabel(k), meetings: [], dates: [], subjects: {}, topics: []
        });
        mo.meetings.push(m.id);
        mo.dates.push(m.date);
        const sub = subjOf(m);
        if (sub) mo.subjects[sub] = 1;
        if (m.topic && mo.topics.indexOf(m.topic) < 0) mo.topics.push(m.topic);
      });
      const months = Object.keys(monthsMap).sort().map(k => monthsMap[k]);

      persons.forEach(p => {
        // אותו אדם עם שתי שורות (בגרות+גמר) שסומן פעמיים באותו מפגש — נספר פעם אחת
        p.attended = Array.from(new Set(p.attended));
        const mine = held.filter(m => { const s = subjOf(m); return !s || p.subjects.indexOf(s) >= 0; });
        p.sessionsPresent = p.attended.length;
        p.sessionsHeld = mine.length;
        p.sessionsMissed = mine.filter(m => p.attended.indexOf(m.id) < 0).map(m => m.date);
        // חודש רלוונטי = חודש שיש בו מועד במקצוע של המורה; נוכחות באחד המועדים מספיקה
        const myMonths = months.filter(mo => {
          const subs = Object.keys(mo.subjects);
          return !subs.length || subs.some(sx => p.subjects.indexOf(sx) >= 0);
        });
        p.monthsAttended = myMonths.filter(mo => mo.meetings.some(id => p.attended.indexOf(id) >= 0)).map(mo => mo.key);
        p.groupMonths = myMonths.map(mo => mo.key);   // לפני שילוב הפרטני — לתצוגה
        p.monthsMissed = myMonths.filter(mo => p.monthsAttended.indexOf(mo.key) < 0).map(mo => mo.key);
        p.present = p.monthsAttended.length;
        p.held = myMonths.length;
        // תאריכי ההיעדרות נשארים לתצוגה מפורטת, אבל הספירה חודשית
        p.missed = p.monthsMissed.map(monthLabel);
        p.rate = p.held ? Math.round(p.present / p.held * 100) : null;
      });
      // ---- הדרכה פרטנית ----
      const byNameSchool = {}, byName = {};
      persons.forEach(p => {
        byNameSchool[norm(p.name) + '|' + norm(p.schoolName)] = p;
        (byName[norm(p.name)] = byName[norm(p.name)] || []).push(p);
      });
      const rosterSchools = {};
      persons.forEach(p => { if (p.schoolName) rosterSchools[norm(p.schoolName)] = p.schoolName; });
      const schoolSessions = {};   // norm(school) → מספר מפגשים פרטניים
      let indSessions = 0, indHours = 0, indOutside = 0;
      (allHours[g.slug] || []).forEach(h => {
        const d = String(h.date || '').slice(0, 10);
        if (!d || d < yearStart || d > today) return;
        indSessions++;
        indHours += Number(h.hours) || 0;
        const full = norm((h.firstName || '') + ' ' + (h.lastName || ''));
        // שם + בית ספר; אם בית הספר נכתב אחרת — שם שמופיע פעם אחת בלבד בקבוצה
        let p = byNameSchool[full + '|' + norm(h.schoolName)];
        if (!p && byName[full] && byName[full].length === 1) p = byName[full][0];
        if (p) {
          p.individual++;
          p.individualHours += Number(h.hours) || 0;
          p.individualDates.push(d);
        } else indOutside++;
        const sk = p ? norm(p.schoolName) : norm(h.schoolName);
        if (sk) schoolSessions[sk] = (schoolSessions[sk] || 0) + 1;
      });
      /* ---- שילוב ההדרכה הפרטנית בספירה (קביעת מיטל 20.9.26) ----
         עד כה השעה הפרטנית נספרה כ"השתתף/ה השנה" אבל לא נכנסה לאחוז —
         בשיטת הספירה לפי מועדים היא הייתה מוסיפה אירוע ומקפיצה את האחוז
         מעל 100%. בספירה החודשית זה כבר לא קורה: היחידה היא **חודש**,
         והשעה הפרטנית רק **מספקת** את החודש שבו ניתנה, בדיוק כמו נוכחות
         באחד המועדים. מכאן שהמסכים סופרים עכשיו כמו הדוח החודשי במייל.
         · חודש שבו הייתה הדרכה קבוצתית והמורה נעדר/ה אבל קיבל/ה שעה
           פרטנית — נספר כהשתתפות.
         · חודש שבו לא התקיימה הדרכה קבוצתית כלל אבל ניתנה שעה פרטנית —
           נכנס למכנה ולמונה (החודש **נמדד** דרך הפרטני).
         p.groupMonths נשמר לתצוגה של "ההדרכות הקבוצתיות" בנפרד. */
      persons.forEach(p => {
        p.individualDates.sort();
        const indMonths = Array.from(new Set(p.individualDates.map(monthKey)));
        p.individualMonths = indMonths;
        const allKeys = Array.from(new Set(p.groupMonths.concat(indMonths)));
        p.monthsAttended = allKeys.filter(k =>
          p.monthsAttended.indexOf(k) >= 0 || indMonths.indexOf(k) >= 0);
        p.monthsMissed = allKeys.filter(k => p.monthsAttended.indexOf(k) < 0);
        p.present = p.monthsAttended.length;
        p.held = allKeys.length;
        p.missed = p.monthsMissed.map(monthLabel);
        p.rate = p.held ? Math.round(p.present / p.held * 100) : null;
        p.participated = p.present > 0;
      });
      const schoolNames = Object.keys(rosterSchools).map(k => rosterSchools[k]).sort((a, b) => a.localeCompare(b, 'he'));
      const schools = schoolNames.map(n => ({ name: n, individual: schoolSessions[norm(n)] || 0 }));

      persons.sort((a, b) => a.schoolName.localeCompare(b.schoolName, 'he') || a.name.localeCompare(b.name, 'he'));

      // מפגשים מהתוכנית שעברו בלי רישום
      const plan = window.TS_planFor ? window.TS_planFor(g.slug) : null;
      const planMeetings = plan && plan.meetings ? plan.meetings : [];
      const unrecorded = planMeetings
        // מפגש בשני ימים (שירה) — "עבר בלי רישום" רק אחרי המועד השני
        .filter(pm => (pm.date2 || pm.date) < today && !held.some(m => ((pm.dates && pm.dates.length) ? pm.dates : [pm.date, pm.date2]).indexOf(m.date) >= 0))
        .map(pm => ({ date: pm.date, label: pm.label, topic: pm.topic || '' }));
      const next = planMeetings.find(pm => (pm.date2 || pm.date) >= today) || null;

      const presentSum = persons.reduce((s, p) => s + p.present, 0);
      const heldSum = persons.reduce((s, p) => s + p.held, 0);
      const last = held.length ? held[held.length - 1] : null;
      // סיכום לכל חודש: כמה מהקבוצה השתתפו, ומי לא
      months.forEach(mo => {
        const subs = Object.keys(mo.subjects);
        const rel = persons.filter(p => !subs.length || subs.some(sx => p.subjects.indexOf(sx) >= 0));
        mo.rosterN = rel.length;
        // monthsAttended כבר כולל חודש שסופק ע"י שעה פרטנית (20.9.26)
        mo.present = rel.filter(p => p.monthsAttended.indexOf(mo.key) >= 0);
        mo.absent = rel.filter(p => p.monthsAttended.indexOf(mo.key) < 0);
        mo.viaIndividual = mo.present.filter(p => (p.individualMonths || []).indexOf(mo.key) >= 0 &&
          (p.attended || []).every(id => mo.meetings.indexOf(id) < 0)).length;
        mo.rosterPresent = mo.present.length;
        mo.rate = rel.length ? Math.round(mo.rosterPresent / rel.length * 100) : null;
      });

      Object.assign(g, {
        persons: persons,
        months: months,
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
        rate: heldSum ? Math.round(presentSum / heldSum * 100) : null,
        // "לא השתתפו כלל" — לא במפגש ולא בהדרכה פרטנית
        // "לא השתתפו כלל" — רק מי שנמדד (יש לו חודש קבוצתי או פרטני) ולא השתתף
        never: persons.filter(p => p.held > 0 && !p.participated),
        hoursLoaded: hoursLoaded,
        individualSessions: indSessions,
        individualHours: indHours,
        individualTeachers: persons.filter(p => p.individual > 0).length,
        // מעקב גם לפי מורה (החלטת מיטל) — מי עוד לא קיבל/ה הדרכה פרטנית השנה
        teachersNoIndividual: persons.filter(p => !p.individual),
        individualOutside: indOutside,
        schools: schools,
        schoolsWithIndividual: schools.filter(s => s.individual > 0).length,
        schoolsNoIndividual: schools.filter(s => !s.individual).map(s => s.name),
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
