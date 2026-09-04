/* ===== subject-tools.js — "ארגז הכלים של התחום" בכל עמוד תחום דעת ובשני הנתיבים =====
   מקור אחת ויחיד לנתוני הכלים לפי תחום דעת. המקור התוכני: klim-tchumey-daat.html
   ("ארגז כלים לכל תחום דעת"), שנשאר הארגז המלא — כאן מוצג רק מה שרלוונטי לתחום שבעמוד.

   שימוש בעמוד:
     <section class="sktbx" data-subject="math"></section>            תחום דעת בודד
     <section class="sktbx" data-subject="all" data-strack="gmr"></section>   כל התחומים (גמר/בגרות)

   תוספות אופציונליות על ה-section:
     data-sec-id="sec-argaz-klim"   מזהה לכותרת (ברירת מחדל: argaz-klim)
     class="sktbx flush"            כשהמדור כבר יושב בתוך מיכל עם padding אופקי
     data-strack="gmr|bgr"          מוסיף ?track= לקישורי עמודי המקצוע
     data-official="off"            משמיט את שבבי הפורטל הרשמי (לעמוד שכבר יש בו מדור פורטלים)

   הקובץ נטען כסקריפט רגיל (בלי defer) לפני site.js ולפני pagenav.js, כדי שהכותרת
   שהוא יוצר תהיה בעמוד בזמן שפס הניווט האוטומטי אוסף את המדורים.
================================================================= */
(function () {
  'use strict';
  if (window.__subjectToolsLoaded) return;
  window.__subjectToolsLoaded = true;

  /* ---------- אייקוני קו · SVG ב-currentColor, בלי אימוג'ים ---------- */
  var IC = {
    box:    '<path d="M3.5 8.5h17v10a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M3.5 8.5 6 4.5h12l2.5 4"/><path d="M12 8.5v11M9.5 12.5h5"/>',
    portal: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.2 2.4 3.4 5.3 3.4 8.5s-1.2 6.1-3.4 8.5c-2.2-2.4-3.4-5.3-3.4-8.5S9.8 5.9 12 3.5z"/>',
    center: '<path d="M4.5 20V9.5L12 4l7.5 5.5V20z"/><path d="M9.5 20v-6h5v6"/>',
    calc:   '<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h2M13.5 12h2M8.5 16h2M13.5 16h2"/>',
    graph:  '<path d="M4.5 3.5v17h16"/><path d="m7.5 15.5 3.5-4.5 3 2.5 4.5-6"/>',
    doc:    '<path d="M5 4.5h9.5L19 9v10.5H5z"/><path d="M14.5 4.5V9H19"/><path d="M8 12.5h7M8 16h4.5"/>',
    book:   '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
    scroll: '<path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H18a1 1 0 0 1 1 1v13.5H6.5A1.5 1.5 0 0 0 5 20z"/><path d="M9 8.5h6M9 11.8h4"/>',
    spark:  '<path d="m12 3.8 1.8 5.4 5.4 1.8-5.4 1.8L12 18.2l-1.8-5.4L4.8 11l5.4-1.8z"/><path d="M18.6 3.6v2.8M17.2 5h2.8"/>',
    time:   '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.3l3.4 2.1"/>',
    board:  '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M9.3 9.5v10M14.7 9.5v10"/>',
    users:  '<circle cx="9.2" cy="8.4" r="3.1"/><path d="M3.6 19.6c0-3.1 2.5-5.2 5.6-5.2s5.6 2.1 5.6 5.2"/><path d="M16.2 6.1a3.1 3.1 0 0 1 0 5.8M17.6 14.9c1.9.8 3 2.5 3 4.7"/>',
    globe:  '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.2 2.4 3.4 5.3 3.4 8.5s-1.2 6.1-3.4 8.5c-2.2-2.4-3.4-5.3-3.4-8.5S9.8 5.9 12 3.5z"/>'
  };

  function svg(kind, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (IC[kind] || IC.doc) + '</svg>';
  }

  /* ---------- הנתונים · מקור: klim-tchumey-daat.html ---------- */
  var SUBJECT_TOOLS = {

    math: {
      name: 'מתמטיקה',
      page: 'math.html',
      icon: 'calc',
      official: {
        href: 'https://pop.education.gov.il/tchumey_daat/matmatika/chativa-elyona/',
        title: 'מרחב פדגוגי · מתמטיקה בחטיבה עליונה',
        tag: 'המקור הרשמי',
        icon: 'portal',
        note: 'הפורטל הרשמי של משרד החינוך למתמטיקה בחטיבה העליונה — מיקודים, הנחיות הפיקוח, חומרי הוראה ומאגרי שאלות.'
      },
      tools: [
        { href: 'https://highmath.haifa.ac.il/', title: 'מרכז המורים הארצי למתמטיקה', chip: 'מרכז המורים הארצי', tag: 'מרכז מורים ארצי', icon: 'center',
          note: 'מרכז המורים הארצי לעל־יסודי שבאוניברסיטת חיפה — יישומונים דינמיים, פעילויות וחומרי למידה לכל רמות ההיבחנות.' },
        { href: 'https://www.geogebra.org', title: 'GeoGebra', chip: 'GeoGebra', tag: 'כלי חינמי', icon: 'graph',
          note: 'סביבה דינמית לגאומטריה, לאלגברה ולגרפים — הדגמה חיה בכיתה במקום שרטוט על הלוח.' },
        { href: 'https://www.desmos.com/calculator', title: 'מחשבון גרפי · Desmos', chip: 'Desmos', tag: 'כלי חינמי', icon: 'graph',
          note: 'מחשבון גרפי בדפדפן, בלי התקנה — שרטוט פונקציות, חקר פרמטרים והשוואת מודלים בזמן אמת.' }
      ]
    },

    hebrew: {
      name: 'עברית · הבנה, הבעה ולשון',
      short: 'עברית',
      page: 'hebrew.html',
      icon: 'doc',
      official: {
        href: 'https://pop.education.gov.il/tchumey_daat/ivrit_havana_habaa_lashon/chativa-elyona/',
        title: 'מרחב פדגוגי · עברית בחטיבה עליונה',
        tag: 'המקור הרשמי',
        icon: 'portal',
        note: 'הפורטל הרשמי להבנה, להבעה וללשון בחטיבה העליונה — תוכנית הלימודים, המיומנויות וחומרי ההוראה לכל פרק.'
      },
      tools: [
        { href: 'https://pop.education.gov.il/tchumey_daat/ivrit_havana_habaa_lashon/chativa-elyona/pedagogya-ivrit-hata/a-i/', title: 'כלים דיגיטליים ו־AI בהוראת העברית', chip: 'כלים דיגיטליים ו־AI', tag: 'כלים דיגיטליים', icon: 'spark',
          note: 'מדור הכלים הדיגיטליים והבינה המלאכותית של הפיקוח על הוראת העברית — כלים שנבחרו לשימוש בשיעור.' },
        { href: 'https://pop.education.gov.il/tchumey_daat/ivrit_havana_habaa_lashon/chativa-elyona/havana-habaa-olim/', title: 'עברית לעולים', chip: 'עברית לעולים', tag: 'אוכלוסייה ייעודית', icon: 'users',
          note: 'חומרי הוראה והתאמות ללומדים עולים — בניית מיומנויות שפה בסיסיות לצד ההכנה להיבחנות.' }
      ]
    },

    english: {
      name: 'אנגלית',
      page: 'english.html',
      icon: 'globe',
      official: {
        href: 'https://pop.education.gov.il/tchumey_daat/english/chativa-elyona/study_topics/',
        title: 'מרחב פדגוגי · English · Study Topics',
        tag: 'המקור הרשמי',
        icon: 'portal',
        note: 'הפורטל הרשמי לאנגלית בחטיבה העליונה — נושאי הלימוד, המודולים והמיקודים של הפיקוח על הוראת האנגלית.'
      },
      tools: [
        { href: 'https://www.etai.org.il/', title: 'ETAI · איגוד מורי האנגלית בישראל', chip: 'ETAI', tag: 'איגוד מקצועי', icon: 'users',
          note: 'האיגוד המקצועי של מורי האנגלית — כנסים, פיתוח מקצועי וקהילת מורים ארצית.' },
        { href: 'https://learnenglishteens.britishcouncil.org/', title: 'British Council · LearnEnglish Teens', chip: 'British Council Teens', tag: 'תרגול לתלמיד', icon: 'board',
          note: 'פעילויות, סרטונים ותרגול מדורג לבני נוער — מתאים לעבודה עצמאית, לשיעורי בית ולהשלמות.' },
        { href: 'https://www.linguahouse.com', title: 'Linguahouse', chip: 'Linguahouse', tag: 'מערכי שיעור', icon: 'doc',
          note: 'מערכי שיעור מוכנים להדפסה באנגלית, מסודרים לפי רמה ולפי נושא — חוסך בנייה מאפס.' }
      ]
    },

    civics: {
      name: 'אזרחות',
      page: 'civics.html',
      icon: 'center',
      official: {
        href: 'https://pop.education.gov.il/tchumey_daat/citizenship/',
        title: 'מרחב פדגוגי · אזרחות',
        tag: 'המקור הרשמי',
        icon: 'portal',
        note: 'הפורטל הרשמי לאזרחות — תוכנית הלימודים, חומרי ההוראה ועדכוני הפיקוח.'
      },
      tools: [
        { href: 'https://pop.education.gov.il/tchumey_daat/citizenship/citizenship-high-school/citizenship-pedagogy/citizenship-task/', title: 'מטלת הביצוע באזרחות', chip: 'מטלת הביצוע', tag: 'הערכה חלופית', icon: 'doc',
          note: 'ההנחיות המלאות למטלת הביצוע — מבנה המטלה, שלבי העבודה, לוחות הזמנים והמחוון.' },
        { href: 'https://kedma-edu.org.il/kedma_material/', title: 'מאגר המערכים של קדמה', chip: 'מאגר קדמה', tag: 'מאגר מערכים', icon: 'book',
          note: 'מאגר מערכי שיעור פתוח — חומר מוכן לשיעור דיון בסוגיות אזרחיות וחברתיות.' }
      ]
    },

    history: {
      name: 'היסטוריה',
      page: 'history.html',
      icon: 'time',
      official: {
        href: 'https://pop.education.gov.il/tchumey_daat/historya/chativa-elyona/',
        title: 'מרחב פדגוגי · היסטוריה בחטיבה עליונה',
        tag: 'המקור הרשמי',
        icon: 'portal',
        note: 'הפורטל הרשמי להיסטוריה בחטיבה העליונה — תוכנית הלימודים, יחידות ההוראה וחומרי הלמידה.'
      },
      tools: [
        { href: 'https://timeline.knightlab.com', title: 'TimelineJS', chip: 'TimelineJS', tag: 'כלי חינמי', icon: 'time',
          note: 'בניית ציר זמן אינטראקטיבי מתוך גיליון נתונים — כלי מדויק למטלת חקר ולסיכום תקופה.' },
        { href: 'https://www.storyboardthat.com', title: 'Storyboard That', chip: 'Storyboard That', tag: 'כלי יצירה', icon: 'board',
          note: 'יצירת סטוריבורד ורצף אירועים מצויר — להמחשת תהליך היסטורי בלי טקסט ארוך.' }
      ]
    },

    literature: {
      name: 'ספרות',
      page: 'literature.html',
      icon: 'book',
      official: {
        href: 'https://pop.education.gov.il/tchumey_daat/safrut/chativa-elyona/',
        title: 'מרחב פדגוגי · ספרות בחטיבה עליונה',
        tag: 'המקור הרשמי',
        icon: 'portal',
        note: 'הפורטל הרשמי לספרות ממלכתי בחטיבה העליונה — יצירות המיקוד, המיומנויות וחומרי ההוראה.'
      },
      tools: [
        { href: 'https://pop.education.gov.il/tchumey_daat/safrut/chativa-elyona/pedagogia-safrut2/darkey-oraa/', title: 'דרכי הוראה בספרות', chip: 'דרכי הוראה', tag: 'פדגוגיה', icon: 'book',
          note: 'מדור דרכי ההוראה — גישות, אסטרטגיות והצעות מעשיות להוראת יצירה בכיתה.' },
        { title: 'יחידות הוראה לפי יוצר', tag: 'יחידות מוכנות', icon: 'doc',
          note: 'יחידות הוראה מלאות ליוצרים שבמיקוד, במרחב הפדגוגי:',
          links: [
            { href: 'https://pop.education.gov.il/tchumey_daat/safrut/chativa-elyona/noseem_nilmadim/shmuel-yosef-agnon/', label: 'ש״י עגנון' },
            { href: 'https://pop.education.gov.il/tchumey_daat/safrut/chativa-elyona/noseem_nilmadim/dalia-ravikovic/', label: 'דליה רביקוביץ' },
            { href: 'https://pop.education.gov.il/tchumey_daat/safrut/chativa-elyona/noseem_nilmadim/haim-gouri/', label: 'חיים גורי' }
          ] }
      ]
    },

    tanakh: {
      name: 'תנ״ך',
      page: 'tanakh.html',
      icon: 'scroll',
      official: {
        href: 'https://pop.education.gov.il/tchumey_daat/tanach_mamlachti/chativa-elyona/',
        title: 'מרחב פדגוגי · תנ״ך ממלכתי בחטיבה עליונה',
        tag: 'המקור הרשמי',
        icon: 'portal',
        note: 'הפורטל הרשמי לתנ״ך ממלכתי בחטיבה העליונה — תוכנית הלימודים, המיקוד וחומרי ההוראה.'
      },
      tools: [
        { href: 'https://edu.929.org.il/', title: 'תנ״ך ממלכתי · 929 חינוך', chip: '929 חינוך', tag: 'הממצא החזק בסקירה', icon: 'scroll', star: true,
          note: 'האתר השלם ביותר שנמצא בסקירה: מערכי שיעור לי׳–י״ב, חומרי הוראה וצירי זמן, אזור מפמ״ר, ונתיב בגרות גמיש עם הערכה חלופית.' }
      ]
    }
  };

  var ORDER = ['hebrew', 'math', 'english', 'history', 'civics', 'literature', 'tanakh'];
  var FULL_BOX = 'klim-tchumey-daat.html';

  /* ---------- עיצוב · מוזרק פעם אחת, זהה בכל העמודים ---------- */
  var CSS = [
    '.sktbx{padding:18px var(--px) 34px;display:block}',
    '.sktbx.flush{padding-inline:0}',
    '.sktbx h2.sk-h{font-size:clamp(1.22rem,2.3vw,1.5rem);font-weight:800;color:var(--navy);',
      'margin:0 0 8px;padding-top:22px;border-top:1px solid var(--border);',
      'display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}',
    '.sktbx h2.sk-h::before{content:"";width:30px;height:7px;border-radius:4px;',
      'background:linear-gradient(90deg,var(--cyan),var(--blue));flex:0 0 auto;transform:translateY(-3px)}',
    '.sktbx h2.sk-h .sk-hic{width:21px;height:21px;flex:0 0 auto;color:var(--navy);align-self:center;margin-inline-end:-4px}',
    '.sktbx h2.sk-h .sk-note{font-size:.82rem;font-weight:600;color:var(--text2)}',
    '.sktbx .sk-lead{font-size:.88rem;color:var(--text2);margin:0 0 16px;max-width:780px;line-height:1.6}',
    '.sktbx .sk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(258px,1fr));gap:13px}',
    '.sktbx .sk-card{display:flex;flex-direction:column;gap:7px;background:var(--surface);',
      'border:1px solid var(--border);border-radius:14px;padding:16px 18px;',
      'color:inherit;text-decoration:none;box-shadow:var(--sh-sm);transition:.22s var(--ease,ease)}',
    '.sktbx a.sk-card:hover{border-color:var(--cyan);box-shadow:var(--sh-md);transform:translateY(-2px)}',
    '.sktbx .sk-card.main{background:var(--blue-bg);border-color:var(--blue-100)}',
    '.sktbx .sk-card.star{border-color:var(--cyan);background:var(--cyan-100)}',
    '.sktbx .sk-top{display:flex;align-items:flex-start;gap:9px}',
    '.sktbx .sk-ic{width:19px;height:19px;flex:0 0 auto;color:#0A7799;margin-top:2px}',
    '.sktbx .sk-t{font-size:.97rem;font-weight:700;color:var(--navy);line-height:1.35}',
    '.sktbx .sk-d{font-size:.82rem;color:var(--text2);line-height:1.55}',
    '.sktbx .sk-tag{align-self:flex-start;font-size:.72rem;font-weight:700;letter-spacing:.02em;',
      'padding:3px 11px;border-radius:999px;background:var(--soft-bg);color:var(--navy-800);white-space:nowrap}',
    '.sktbx .sk-card.main .sk-tag{background:#fff;color:#0A7799}',
    '.sktbx .sk-card.star .sk-tag{background:#fff;color:#0A7799}',
    '.sktbx .sk-chips{display:flex;flex-wrap:wrap;gap:6px}',
    '.sktbx a.sk-chip{font-size:.8rem;font-weight:600;color:#0A7799;background:var(--cyan-100);',
      'border-radius:999px;padding:4px 12px;text-decoration:none;transition:.18s}',
    '.sktbx a.sk-chip:hover{background:#0A7799;color:#fff}',
    '.sktbx a.sk-go{margin-top:auto;padding-top:4px;font-size:.83rem;font-weight:700;color:#0A7799;text-decoration:none}',
    '.sktbx a.sk-go:hover{text-decoration:underline}',
    '.sktbx .sk-foot{margin-top:16px;display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px}',
    '.sktbx a.sk-all{display:inline-flex;align-items:center;gap:9px;background:var(--navy);color:#fff;',
      'border-radius:12px;padding:11px 18px;font-size:.88rem;font-weight:700;text-decoration:none;',
      'box-shadow:var(--sh-sm);transition:.22s}',
    '.sktbx a.sk-all:hover{background:var(--navy-800);box-shadow:var(--sh-md);transform:translateY(-2px)}',
    '.sktbx a.sk-all .sk-ic{color:#fff;margin-top:0}',
    '.sktbx .sk-foot-note{font-size:.8rem;color:var(--text2);max-width:460px;line-height:1.5}',
    '@media(max-width:640px){.sktbx .sk-grid{grid-template-columns:1fr}}'
  ].join('');

  function injectCss() {
    if (document.getElementById('sktbx-css')) return;
    var s = document.createElement('style');
    s.id = 'sktbx-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---------- בנייה ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function card(t, extraClass) {
    var body =
      '<span class="sk-top">' + svg(t.icon || 'doc', 'sk-ic') + '<span class="sk-t">' + esc(t.title) + '</span></span>' +
      (t.note ? '<span class="sk-d">' + esc(t.note) + '</span>' : '') +
      (t.links ? '<span class="sk-chips">' + t.links.map(function (l) {
        return '<a class="sk-chip" href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.label) + '</a>';
      }).join('') + '</span>' : '') +
      (t.tag ? '<span class="sk-tag">' + esc(t.tag) + '</span>' : '');

    var cls = 'sk-card' + (extraClass ? ' ' + extraClass : '') + (t.star ? ' star' : '');
    if (t.href) {
      return '<a class="' + cls + '" href="' + esc(t.href) + '" target="_blank" rel="noopener">' + body + '</a>';
    }
    return '<div class="' + cls + '">' + body + '</div>';
  }

  function fullBoxLink(text) {
    return '<a class="sk-all" href="' + FULL_BOX + '">' + svg('box', 'sk-ic') +
      '<span>' + esc(text) + '</span></a>';
  }

  function heading(id, note, title) {
    return '<h2 class="sub-sec sk-h" id="' + esc(id) + '">' + svg('box', 'sk-hic') +
      esc(title || 'ארגז הכלים של התחום') +
      (note ? '<small class="sk-note">' + esc(note) + '</small>' : '') + '</h2>';
  }

  function renderOne(key, secId) {
    var d = SUBJECT_TOOLS[key];
    if (!d) return '';
    var cards = card(d.official, 'main') + d.tools.map(function (t) { return card(t); }).join('');
    return heading(secId, d.name) +
      '<p class="sk-lead">הכלים והמקורות שנבחרו בסקירת האתר דווקא עבור ' + esc(d.short || d.name) +
      ' — המקור הרשמי במרחב הפדגוגי של משרד החינוך, ולצידו כלים ייעודיים לתחום. ' +
      'הרשימה נגזרת מארגז הכלים המלא, והיא מתעדכנת ממנו.</p>' +
      '<div class="sk-grid">' + cards + '</div>' +
      '<div class="sk-foot">' + fullBoxLink('לארגז הכלים המלא · כל שבעת תחומי הדעת') +
      '<span class="sk-foot-note">הארגז המלא הוא המקור היחיד לרשימה הזו — כל כלי נוסף שנכנס אליו מופיע גם כאן.</span></div>';
  }

  function renderAll(secId, strack, withOfficial) {
    var q = strack ? '?track=' + strack : '';
    var cards = ORDER.map(function (key) {
      var d = SUBJECT_TOOLS[key];
      var chips = (withOfficial ? [{ href: d.official.href, label: 'המרחב הפדגוגי' }] : [])
        .concat(d.tools.reduce(function (acc, t) {
          if (t.href) acc.push({ href: t.href, label: t.chip || t.title });
          else if (t.links) t.links.forEach(function (l) { acc.push({ href: l.href, label: l.label }); });
          return acc;
        }, []));
      return '<div class="sk-card">' +
        '<span class="sk-top">' + svg(d.icon, 'sk-ic') + '<span class="sk-t">' + esc(d.name) + '</span></span>' +
        '<span class="sk-chips">' + chips.map(function (c) {
          return '<a class="sk-chip" href="' + esc(c.href) + '" target="_blank" rel="noopener">' + esc(c.label) + '</a>';
        }).join('') + '</span>' +
        '<a class="sk-go" href="' + d.page + q + '">ארגז הכלים של ' + esc(d.short || d.name) + ' ←</a>' +
        '</div>';
    }).join('');

    return heading(secId, 'שבעת תחומי הדעת', 'ארגז הכלים לפי תחום דעת') +
      '<p class="sk-lead">בלי לצאת מהנתיב: הכלים הייעודיים של כל אחד משבעת תחומי הדעת' +
      (withOfficial ? ', לצד המקור הרשמי במרחב הפדגוגי של משרד החינוך' : ' — הפורטלים הרשמיים כבר מרוכזים במדור הפורטלים שלמעלה') +
      '. כל תחום נפתח בעמוד שלו עם ארגז הכלים המלא שלו.</p>' +
      '<div class="sk-grid">' + cards + '</div>' +
      '<div class="sk-foot">' + fullBoxLink('לארגז הכלים המלא · כל שבעת תחומי הדעת') +
      '<span class="sk-foot-note">הארגז המלא הוא המקור היחיד לרשימה הזו — אין כאן עותק נפרד שצריך לתחזק.</span></div>';
  }

  function build() {
    var hosts = document.querySelectorAll('.sktbx[data-subject]:empty');
    if (!hosts.length) return false;
    injectCss();
    [].slice.call(hosts).forEach(function (host) {
      var key = host.getAttribute('data-subject');
      var secId = host.getAttribute('data-sec-id') || 'argaz-klim';
      var html = (key === 'all')
        ? renderAll(secId, host.getAttribute('data-strack'), host.getAttribute('data-official') !== 'off')
        : renderOne(key, secId);
      if (!html) return;
      host.innerHTML = html;
      host.setAttribute('aria-labelledby', secId);
    });
    return true;
  }

  window.SUBJECT_TOOLS = SUBJECT_TOOLS;

  /* הקובץ נטען בסוף ה-body — מצייני המקום כבר בעמוד, ולכן בונים מיד,
     לפני site.js ולפני pagenav.js. אם הוזז ל-head, נמתין ל-DOM. */
  if (!build() && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  }
})();
