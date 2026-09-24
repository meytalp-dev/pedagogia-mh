/* ▸ קישורים מהירים בראש מבט המורה (24.9.26, בקשת מיטל):
   (1) עמוד תוכנית הלימודים באתר לפי המקצוע והמסלול — אנגלית בגרות → /english-bagrut.html;
   (2) קהילת הווטסאפ של תחום הדעת — לפי המקצוע והשפה (מגזר ערבי → "לדוברי ערבית").
   קישורי הקהילות נקראים בזמן אמת מ-/kehilot.html (מקור האמת היחיד; עוגן קוראת את אותו
   עמוד), כך שקישור שמתחלף שם מתעדכן כאן לבד. אין התאמה — מפנים לעמוד הכללי. */
(function () {
  const PAGES = { 'עברית': 'hebrew', 'מתמטיקה': 'math', 'אנגלית': 'english', 'אזרחות': 'civics',
    'היסטוריה': 'history', 'תנ"ך': 'tanakh', 'תנ״ך': 'tanakh', 'ספרות': 'literature' };
  // שם הקהילה בעמוד הקהילות, כשהוא שונה משם המקצוע במערכת
  const COMMUNITY_NAME = { 'תנ"ך': 'תנ״ך', 'מורשת אסלאמית': 'מורשות', 'מורשת דרוזית': 'מורשות' };
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = s => String(s || '').replace(/["״']/g, '').replace(/\s+/g, ' ').trim();

  async function communityFor(subject, arab) {
    const want = norm((COMMUNITY_NAME[subject] || subject) + ' לדוברי ' + (arab ? 'ערבית' : 'עברית'));
    try {
      const html = await (await fetch('/kehilot.html', { cache: 'no-cache' })).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const a = [...doc.querySelectorAll('a.wa')].find(x => norm((x.querySelector('b') || {}).textContent) === want);
      return a ? a.getAttribute('href') : '';
    } catch (e) { return ''; }
  }

  window.TS_quickLinks = async function (teacher) {
    const box = document.getElementById('quick-links');
    if (!box || !teacher) return;
    const subject = String(teacher.subject || '').trim();
    const gmar = teacher.type === 'gemer';
    const slug = PAGES[subject];
    const track = gmar ? 'גמר' : 'בגרות';
    const curHref = slug ? '/' + slug + '-' + (gmar ? 'gmar' : 'bagrut') + '.html' : '/subjects.html';
    const curText = slug ? 'תוכנית הלימודים · ' + subject + ' ' + track : 'תוכניות הלימודים';
    const arab = teacher.sector === 'arab';
    box.innerHTML =
      `<a class="ql ql-cur" href="${esc(curHref)}" target="_blank" rel="noopener">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
         <span>${esc(curText)}</span></a>
       <a class="ql ql-wa" id="ql-wa" href="/kehilot.html" target="_blank" rel="noopener">
         <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>
         <span>${esc(subject ? 'קהילת הווטסאפ · ' + subject : 'קהילות הווטסאפ')}</span></a>`;
    box.hidden = false;
    if (!subject) return;
    const href = await communityFor(subject, arab);
    const wa = document.getElementById('ql-wa');
    if (href && wa) wa.href = href;
  };
})();
