
// ===== CONFIG =====
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyLwo3jrseEDJ4GLnVNCzoJTRJBK_IAkJE0IiGGcx18buwJQ0XSRgOcJ2FmbMtA5ojU/exec';
const PLAYER_BASE_URL = 'https://pedagogiamh.co.il/tools/opener-player/';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// ===== STATE =====
let currentStep = 1;
let user = { name: '', email: '' };
let details = {};
let selectedTypes = [];
let activities = []; // { type, data }

// ===== ACTIVITY TYPES =====
const TYPES = {
  question:   { icon: '🤔', name: 'שאלה מעוררת חשיבה', desc: 'שאלה + טיימר + רמז', shared: false },
  story:      { icon: '📖', name: 'סיפור / עובדה מפתיעה', desc: 'טקסט + שאלה לדיון', shared: false },
  vote:       { icon: '📊', name: 'הצבעה / סקר כיתתי', desc: 'הצבעה + גרף בזמן אמת', shared: true },
  riddle:     { icon: '🔍', name: 'חידה / ניחוש', desc: 'רמזים מתגלים', shared: false },
  truefalse:  { icon: '✅', name: 'נכון / לא נכון', desc: 'כרטיסים מתהפכים', shared: false },
  dilemma:    { icon: '🎭', name: 'מה היית עושה?', desc: 'דילמה + הצבעה', shared: true },
  image:      { icon: '🖼️', name: 'תמונה מדברת', desc: 'ויזואל + שאלה', shared: false },
  wordcloud:  { icon: '☁️', name: 'מילה אחת (ענן מילים)', desc: 'ענן מילים כיתתי', shared: true },
  wheel:      { icon: '🎲', name: 'גלגל מזל / הגרלה', desc: 'בחירה אקראית מרשימה', shared: false },
  fillblank:  { icon: '🧩', name: 'השלמת משפט', desc: 'מילה חסרה להשלמה', shared: false },
  guessnumber:{ icon: '🏆', name: 'ניחוש מספר', desc: 'כמה לדעתכם? הקרוב מנצח', shared: true },
  twotruths:  { icon: '💬', name: 'שני אמתות ושקר', desc: '3 טענות – מצאו את השקר', shared: false }
};

// ===== INIT =====
function init() {
  renderTypeGrid();
  loadDraft();
}

// ===== NAME SCREEN =====
function enterApp() {
  const name = document.getElementById('teacherName').value.trim();
  if (!name) { showToast('נא להזין שם'); return; }
  user.name = name;
  user.email = document.getElementById('teacherEmail').value.trim();
  document.getElementById('nameScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
}

// ===== STEPS =====
function goToStep(step) {
  if (step > currentStep && !validateStep(currentStep)) return;
  if (step >= 2) saveStepData();
  if (step === 3) refreshPreview();

  currentStep = step;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('step' + step).classList.add('active');

  for (let i = 1; i <= 3; i++) {
    const c = document.getElementById('sc' + i);
    c.classList.remove('active', 'done');
    if (i < step) c.classList.add('done');
    else if (i === step) c.classList.add('active');
    if (i < 3) {
      document.getElementById('sl' + i).classList.toggle('done', i < step);
    }
  }
}

function validateStep(step) {
  if (step === 1) {
    const name = document.getElementById('openerName').value.trim();
    const subject = document.getElementById('openerSubject').value;
    const grade = document.getElementById('openerGrade').value;
    if (!name) { showToast('נא למלא שם/נושא'); return false; }
    if (!subject) { showToast('נא לבחור מקצוע'); return false; }
    if (!grade) { showToast('נא לבחור כיתה'); return false; }
    return true;
  }
  if (step === 2) {
    if (selectedTypes.length < 1) { showToast('נא לבחור לפחות פעילות אחת'); return false; }
    saveActivityData();
    return true;
  }
  return true;
}

function saveStepData() {
  details = {
    name: document.getElementById('openerName').value.trim(),
    subject: document.getElementById('openerSubject').value,
    grade: document.getElementById('openerGrade').value
  };
}

// ===== TYPE GRID =====
function renderTypeGrid() {
  const grid = document.getElementById('typeGrid');
  grid.innerHTML = '';
  Object.entries(TYPES).forEach(([key, t]) => {
    const div = document.createElement('div');
    div.className = 'type-card' + (selectedTypes.includes(key) ? ' selected' : '');
    div.innerHTML = `<span class="type-icon">${t.icon}</span><div class="type-name">${t.name}</div><div class="type-desc">${t.desc}${t.shared ? ' 📱' : ''}</div>`;
    div.onclick = () => toggleType(key);
    grid.appendChild(div);
  });
}

function toggleType(key) {
  const idx = selectedTypes.indexOf(key);
  if (idx >= 0) {
    selectedTypes.splice(idx, 1);
    activities = activities.filter(a => a.type !== key);
  } else {
    if (selectedTypes.length >= 5) { showToast('מקסימום 5 פעילויות'); return; }
    selectedTypes.push(key);
    activities.push({ type: key, data: getDefaultData(key) });
  }
  renderTypeGrid();
  renderActivityEditors();
  document.getElementById('aiSection').style.display = selectedTypes.length > 0 ? 'block' : 'none';
}

// ===== DEFAULT DATA =====
function getDefaultData(type) {
  switch(type) {
    case 'question': return { text: '', hint: '', answer: '', timerSeconds: 60 };
    case 'story': return { text: '', discussionQuestion: '' };
    case 'vote': return { question: '', options: ['', '', '', ''] };
    case 'riddle': return { question: '', hints: ['', '', '', ''], answer: '' };
    case 'truefalse': return { statements: [{ text: '', isTrue: true, explanation: '' }, { text: '', isTrue: false, explanation: '' }, { text: '', isTrue: true, explanation: '' }] };
    case 'dilemma': return { scenario: '', options: [{ text: '', result: '' }, { text: '', result: '' }] };
    case 'image': return { emoji: '🏛️🔥⚔️', question: '' };
    case 'wordcloud': return { prompt: '' };
    case 'wheel': return { items: ['', '', '', '', '', ''], question: 'מי ענה נכון?' };
    case 'fillblank': return { sentence: '', answer: '', options: ['', '', ''] };
    case 'guessnumber': return { question: '', answer: 0, unit: '' };
    case 'twotruths': return { statements: [{ text: '', isLie: false }, { text: '', isLie: false }, { text: '', isLie: true }] };
  }
}

// ===== ACTIVITY EDITORS =====
function renderActivityEditors() {
  const container = document.getElementById('activityEditors');
  container.innerHTML = '';
  activities.forEach((act, i) => {
    const t = TYPES[act.type];
    const div = document.createElement('div');
    div.className = 'accordion' + (i === 0 ? ' open' : '');
    div.innerHTML = `
      <div class="accordion-header" onclick="toggleAccordion(this)">
        <span class="acc-icon">${t.icon}</span>
        <span class="acc-title">${t.name}${t.shared ? ' 📱' : ''}</span>
        <span class="acc-arrow">▼</span>
      </div>
      <div class="accordion-body">
        ${buildEditor(act.type, act.data, i)}
        <span class="remove-activity" onclick="removeActivity(${i})">🗑️ הסר פעילות</span>
      </div>`;
    container.appendChild(div);
  });
}

function buildEditor(type, data, idx) {
  const p = `act_${idx}_`;
  switch(type) {
    case 'question': return `
      <div class="form-row"><label>השאלה *</label><textarea id="${p}text" placeholder="שאלה שמעוררת סקרנות...">${data.text}</textarea></div>
      <div class="form-row"><label>רמז (אופציונלי)</label><input type="text" id="${p}hint" value="${data.hint}" placeholder="רמז שעוזר לחשוב..."></div>
      <div class="form-row"><label>תשובה / כיוון חשיבה</label><input type="text" id="${p}answer" value="${data.answer}" placeholder="התשובה או כיוון לדיון"></div>`;

    case 'story': return `
      <div class="form-row"><label>הסיפור / העובדה המפתיעה *</label><textarea id="${p}text" placeholder="סיפור קצר (3-4 משפטים) שמחבר לנושא...">${data.text}</textarea></div>
      <div class="form-row"><label>שאלה לדיון</label><input type="text" id="${p}discussionQuestion" value="${data.discussionQuestion}" placeholder="מה דעתכם?"></div>`;

    case 'vote': return `
      <div class="form-row"><label>שאלת ההצבעה *</label><input type="text" id="${p}question" value="${data.question}" placeholder="למשל: איזה משפט נכון?"></div>
      ${data.options.map((o, j) => `<div class="form-row"><label>אפשרות ${j+1}</label><input type="text" id="${p}opt${j}" value="${o}" placeholder="אפשרות ${j+1}"></div>`).join('')}
      <button class="btn btn-sm btn-secondary" onclick="addVoteOption(${idx})">+ אפשרות</button>`;

    case 'riddle': return `
      <div class="form-row"><label>שאלת החידה *</label><input type="text" id="${p}question" value="${data.question}" placeholder="מי אני? / מה אני?"></div>
      ${data.hints.map((h, j) => `<div class="form-row"><label>רמז ${j+1}</label><input type="text" id="${p}hint${j}" value="${h}" placeholder="רמז ${j+1}..."></div>`).join('')}
      <div class="form-row"><label>התשובה *</label><input type="text" id="${p}answer" value="${data.answer}" placeholder="התשובה לחידה"></div>`;

    case 'truefalse': return data.statements.map((s, j) => `
      <div style="background:var(--light-gray);padding:14px;border-radius:12px;margin-bottom:10px">
        <div class="form-row"><label>טענה ${j+1} *</label><input type="text" id="${p}st${j}" value="${s.text}" placeholder="טענה ${j+1}..."></div>
        <div class="form-row"><label>נכון או לא?</label>
          <select id="${p}tf${j}"><option value="true" ${s.isTrue?'selected':''}>נכון ✅</option><option value="false" ${!s.isTrue?'selected':''}>לא נכון ❌</option></select></div>
        <div class="form-row"><label>הסבר קצר</label><input type="text" id="${p}ex${j}" value="${s.explanation}" placeholder="למה?"></div>
      </div>`).join('') + `<button class="btn btn-sm btn-secondary" onclick="addStatement(${idx})">+ טענה</button>`;

    case 'dilemma': return `
      <div class="form-row"><label>תיאור הסיטואציה *</label><textarea id="${p}scenario" placeholder="תארו דילמה או סיטואציה מחיי היום-יום...">${data.scenario}</textarea></div>
      ${data.options.map((o, j) => `
        <div style="background:var(--light-gray);padding:14px;border-radius:12px;margin-bottom:10px">
          <div class="form-row"><label>אפשרות ${j+1} *</label><input type="text" id="${p}dopt${j}" value="${o.text}" placeholder="אפשרות ${j+1}"></div>
          <div class="form-row"><label>תוצאה/הסבר</label><input type="text" id="${p}dres${j}" value="${o.result}" placeholder="מה קורה אם בוחרים בזה?"></div>
        </div>`).join('')}`;

    case 'image': return `
      <div class="form-row"><label>אמוג'י / ויזואל *</label><input type="text" id="${p}emoji" value="${data.emoji}" placeholder="למשל: 🏛️🔥⚔️" style="font-size:2rem;text-align:center"></div>
      <div class="form-row"><label>שאלה *</label><input type="text" id="${p}question" value="${data.question}" placeholder="מה אתם רואים? מה קרה כאן?"></div>`;

    case 'wordcloud': return `
      <div class="form-row"><label>הנחיה לתלמידים *</label><input type="text" id="${p}prompt" value="${data.prompt}" placeholder="כתבו מילה אחת שקשורה ל..."></div>`;

    case 'wheel': return `
      <div class="form-row"><label>כותרת (אופציונלי)</label><input type="text" id="${p}question" value="${data.question}" placeholder="למשל: מי עונה?"></div>
      ${(data.items||[]).map((item, j) => `<div class="form-row"><label>פריט ${j+1}</label><input type="text" id="${p}item${j}" value="${item}" placeholder="שם תלמיד / שאלה / פריט"></div>`).join('')}
      <button class="btn btn-sm btn-secondary" onclick="addWheelItem(${idx})">+ פריט</button>`;

    case 'fillblank': return `
      <div class="form-row"><label>המשפט (סמנו ___ במקום המילה החסרה) *</label><input type="text" id="${p}sentence" value="${data.sentence}" placeholder="למשל: בניין ___ מתחיל באותיות הת"></div>
      <div class="form-row"><label>התשובה הנכונה *</label><input type="text" id="${p}answer" value="${data.answer}" placeholder="המילה החסרה"></div>
      ${(data.options||[]).map((o, j) => `<div class="form-row"><label>אפשרות מסיחה ${j+1}</label><input type="text" id="${p}fopt${j}" value="${o}" placeholder="תשובה שגויה ${j+1}"></div>`).join('')}`;

    case 'guessnumber': return `
      <div class="form-row"><label>השאלה * (למשל: כמה תלמידים יש בבית הספר?)</label><input type="text" id="${p}question" value="${data.question}" placeholder="כמה...?"></div>
      <div class="form-grid">
        <div class="form-row"><label>התשובה הנכונה (מספר) *</label><input type="number" id="${p}answer" value="${data.answer || ''}" placeholder="42"></div>
        <div class="form-row"><label>יחידת מידה (אופציונלי)</label><input type="text" id="${p}unit" value="${data.unit}" placeholder="ק״מ / שנים / אנשים"></div>
      </div>`;

    case 'twotruths': return `
      <p style="font-size:0.85rem;color:var(--gray);margin-bottom:12px">כתבו 3 טענות – 2 נכונות ואחת שקר. התלמידים צריכים למצוא את השקר!</p>
      ${(data.statements||[]).map((s, j) => `
        <div style="background:var(--light-gray);padding:14px;border-radius:12px;margin-bottom:10px">
          <div class="form-row"><label>טענה ${j+1} *</label><input type="text" id="${p}tt${j}" value="${s.text}" placeholder="טענה ${j+1}..."></div>
          <div class="form-row"><label>סוג</label>
            <select id="${p}lie${j}"><option value="false" ${!s.isLie?'selected':''}>אמת ✅</option><option value="true" ${s.isLie?'selected':''}>שקר ❌</option></select></div>
        </div>`).join('')}`;
  }
}

function toggleAccordion(el) {
  el.parentElement.classList.toggle('open');
}

function removeActivity(idx) {
  const type = activities[idx].type;
  activities.splice(idx, 1);
  selectedTypes = selectedTypes.filter(t => t !== type);
  renderTypeGrid();
  renderActivityEditors();
}

function addVoteOption(actIdx) {
  activities[actIdx].data.options.push('');
  saveActivityData();
  renderActivityEditors();
}

function addStatement(actIdx) {
  activities[actIdx].data.statements.push({ text: '', isTrue: true, explanation: '' });
  saveActivityData();
  renderActivityEditors();
}

function addWheelItem(actIdx) {
  activities[actIdx].data.items.push('');
  saveActivityData();
  renderActivityEditors();
}

// ===== SAVE ACTIVITY DATA =====
function saveActivityData() {
  activities.forEach((act, i) => {
    const p = `act_${i}_`;
    const el = (id) => { const e = document.getElementById(p + id); return e ? e.value : ''; };
    switch(act.type) {
      case 'question':
        act.data = { text: el('text'), hint: el('hint'), answer: el('answer'), timerSeconds: 60 };
        break;
      case 'story':
        act.data = { text: el('text'), discussionQuestion: el('discussionQuestion') };
        break;
      case 'vote':
        const opts = [];
        for (let j = 0; j < 10; j++) { const v = el('opt' + j); if (v !== '') opts.push(v); else if (document.getElementById(p + 'opt' + j)) opts.push(''); }
        act.data = { question: el('question'), options: opts.filter((_, j) => document.getElementById(p + 'opt' + j)) };
        break;
      case 'riddle':
        const hints = [];
        for (let j = 0; j < 10; j++) { const v = el('hint' + j); if (document.getElementById(p + 'hint' + j)) hints.push(v); }
        act.data = { question: el('question'), hints: hints, answer: el('answer') };
        break;
      case 'truefalse':
        const stmts = [];
        for (let j = 0; j < 10; j++) {
          if (!document.getElementById(p + 'st' + j)) break;
          stmts.push({ text: el('st' + j), isTrue: el('tf' + j) === 'true', explanation: el('ex' + j) });
        }
        act.data = { statements: stmts };
        break;
      case 'dilemma':
        const dopts = [];
        for (let j = 0; j < 5; j++) {
          if (!document.getElementById(p + 'dopt' + j)) break;
          dopts.push({ text: el('dopt' + j), result: el('dres' + j) });
        }
        act.data = { scenario: el('scenario'), options: dopts };
        break;
      case 'image':
        act.data = { emoji: el('emoji'), question: el('question') };
        break;
      case 'wordcloud':
        act.data = { prompt: el('prompt') };
        break;
      case 'wheel':
        const witems = [];
        for (let j = 0; j < 20; j++) { if (!document.getElementById(p + 'item' + j)) break; witems.push(el('item' + j)); }
        act.data = { question: el('question'), items: witems };
        break;
      case 'fillblank':
        const fopts = [];
        for (let j = 0; j < 5; j++) { if (!document.getElementById(p + 'fopt' + j)) break; fopts.push(el('fopt' + j)); }
        act.data = { sentence: el('sentence'), answer: el('answer'), options: fopts };
        break;
      case 'guessnumber':
        act.data = { question: el('question'), answer: parseFloat(el('answer')) || 0, unit: el('unit') };
        break;
      case 'twotruths':
        const ttStmts = [];
        for (let j = 0; j < 5; j++) {
          if (!document.getElementById(p + 'tt' + j)) break;
          ttStmts.push({ text: el('tt' + j), isLie: el('lie' + j) === 'true' });
        }
        act.data = { statements: ttStmts };
        break;
    }
  });
}

// ===== AI GENERATION =====
function buildOpenerPrompt() {
  const topic = document.getElementById('aiTopic').value.trim() || details.name;
  if (!topic) { showToast('נא להזין נושא'); return null; }
  const typeList = activities.map(a => {
    const t = TYPES[a.type];
    return `- ${a.type}: ${t.name}`;
  }).join('\n');

  const prompt = `אתה מורה יצירתי בבית ספר תיכון מקצועי בישראל. צור תוכן לפעילויות פתיחה לשיעור.

הנושא: ${topic}
מקצוע: ${details.subject}
כיתה: ${details.grade}

צור תוכן עבור הפעילויות הבאות:
${typeList}

כללים:
- שפה פשוטה וברורה, מתאימה לבני נוער עם קשיי קשב
- משפטים קצרים (עד 10 מילים)
- תוכן מעניין ומפתיע שיוצר סקרנות
- דוגמאות מחיי היום-יום

החזר JSON בפורמט הבא:
{
  "activities": [
    ${activities.map(a => {
      switch(a.type) {
        case 'question': return '{"type":"question","data":{"text":"שאלה מעוררת...","hint":"רמז...","answer":"תשובה/כיוון..."}}';
        case 'story': return '{"type":"story","data":{"text":"סיפור קצר (3-4 משפטים)...","discussionQuestion":"שאלה לדיון..."}}';
        case 'vote': return '{"type":"vote","data":{"question":"שאלה להצבעה...","options":["אפשרות 1","אפשרות 2","אפשרות 3","אפשרות 4"]}}';
        case 'riddle': return '{"type":"riddle","data":{"question":"מי אני?","hints":["רמז 1","רמז 2","רמז 3","רמז 4"],"answer":"התשובה"}}';
        case 'truefalse': return '{"type":"truefalse","data":{"statements":[{"text":"טענה...","isTrue":true,"explanation":"הסבר..."},{"text":"טענה...","isTrue":false,"explanation":"הסבר..."},{"text":"טענה...","isTrue":true,"explanation":"הסבר..."}]}}';
        case 'dilemma': return '{"type":"dilemma","data":{"scenario":"תיאור דילמה...","options":[{"text":"אפשרות 1","result":"תוצאה 1"},{"text":"אפשרות 2","result":"תוצאה 2"}]}}';
        case 'image': return '{"type":"image","data":{"emoji":"3-5 אמוג\'י מתאימים","question":"מה אתם רואים?"}}';
        case 'wordcloud': return '{"type":"wordcloud","data":{"prompt":"כתבו מילה אחת שקשורה ל..."}}';
        case 'wheel': return '{"type":"wheel","data":{"question":"מי עונה?","items":["פריט 1","פריט 2","פריט 3","פריט 4","פריט 5","פריט 6"]}}';
        case 'fillblank': return '{"type":"fillblank","data":{"sentence":"משפט עם ___ במקום המילה החסרה","answer":"המילה הנכונה","options":["מסיח 1","מסיח 2","מסיח 3"]}}';
        case 'guessnumber': return '{"type":"guessnumber","data":{"question":"כמה...?","answer":42,"unit":"יחידה"}}';
        case 'twotruths': return '{"type":"twotruths","data":{"statements":[{"text":"אמת 1","isLie":false},{"text":"אמת 2","isLie":false},{"text":"שקר","isLie":true}]}}';
        default: return '';
      }
    }).join(',\n    ')}
  ]
}`;

  return prompt;
}

function applyOpenerAIResult(parsed) {
  parsed.activities.forEach((aiAct, i) => {
    if (i < activities.length && activities[i].type === aiAct.type) {
      activities[i].data = aiAct.data;
    }
  });
  renderActivityEditors();
  showToast('התוכן נטען בהצלחה!');
}

// --- Chat flow: copy prompt -> paste Gemini answer, no API key ---
function copyChatPrompt() {
  const p = buildOpenerPrompt();
  if (!p) return;
  navigator.clipboard.writeText(p).then(() => {
    showToast('הפרומפט הועתק! עכשיו פתחו את Gemini והדביקו');
    revealPasteBox();
  }).catch(() => showToast('ההעתקה נכשלה — נסו שוב'));
}
function revealPasteBox() { document.getElementById('chatPasteBox').style.display = 'block'; }
function buildFromChatAnswer() {
  let text = document.getElementById('chatAnswer').value.trim();
  if (!text) { showToast('הדביקו קודם את התשובה של Gemini'); return; }
  text = text.replace(/```json/gi, '```');
  const fenced = text.split('```');
  if (fenced.length >= 3) text = fenced[1];
  const first = text.indexOf('{'); const last = text.lastIndexOf('}');
  if (first === -1 || last === -1) { showToast('לא נמצא JSON בתשובה — ודאו שהעתקתם את כל התשובה'); return; }
  try {
    applyOpenerAIResult(JSON.parse(text.slice(first, last + 1)));
    document.getElementById('chatAnswer').value = '';
  } catch(e) { showToast('התשובה לא תקינה — בקשו מ-Gemini: החזר JSON תקין בלבד, ונסו שוב'); }
}

async function generateWithAI() {
  const apiKey = getGeminiKey();
  if (!apiKey) return;

  const btn = document.getElementById('aiBtn');
  const status = document.getElementById('aiStatus');
  btn.disabled = true;
  status.textContent = '⏳ יוצר תוכן... (עד 30 שניות)';

  const prompt = buildOpenerPrompt();
  if (!prompt) { btn.disabled = false; status.textContent = ''; return; }

  try {
    const res = await fetch(GEMINI_URL + '?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.8 }
      })
    });

    const json = await res.json();
    const text = json.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(text);

    applyOpenerAIResult(parsed);
    status.textContent = '✅ התוכן נוצר בהצלחה!';
  } catch (e) {
    status.textContent = '❌ שגיאה: ' + e.message;
  }
  btn.disabled = false;
}

function getGeminiKey() {
  let key = localStorage.getItem('gemini_api_key');
  if (!key) {
    key = prompt('נדרש מפתח Gemini API חינמי (חד-פעמי, נשמר רק במכשיר שלכם).
1. היכנסו עם Gmail אישי (לא מייל ארגוני!) ל: aistudio.google.com/apikey
2. לחצו Create API key והעתיקו
3. הדביקו כאן:');
    if (key) localStorage.setItem('gemini_api_key', key);
  }
  return key;
}

// ===== PREVIEW =====
function refreshPreview() {
  saveActivityData();
  const html = generateOpenerHTML();
  document.getElementById('previewIframe').srcdoc = html;

  // Build tabs
  const tabsEl = document.getElementById('previewTabs');
  tabsEl.innerHTML = '';
  activities.forEach((act, i) => {
    const t = TYPES[act.type];
    const tab = document.createElement('div');
    tab.className = 'preview-tab' + (i === 0 ? ' active' : '');
    tab.textContent = t.icon + ' ' + t.name;
    tab.onclick = () => {
      tabsEl.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const iframe = document.getElementById('previewIframe');
      iframe.contentWindow.postMessage({ action: 'switchTab', index: i }, '*');
    };
    tabsEl.appendChild(tab);
  });
}

// ===== GENERATE HTML =====
function generateOpenerHTML() {
  const d = details;
  const tabsHTML = activities.map((act, i) => {
    const t = TYPES[act.type];
    return `<div class="tab ${i === 0 ? 'active' : ''}" onclick="switchTab(${i})">${t.icon} ${t.name}</div>`;
  }).join('');

  const activitiesHTML = activities.map((act, i) => {
    return `<div class="activity-panel ${i === 0 ? 'active' : ''}" id="panel-${i}">${generateActivityHTML(act, i)}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>פעילויות פתיחה – ${d.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=Noto+Sans+Hebrew:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--primary:#124D7A;--primary-light:#E8F2FF;--primary-dark:#0D3B66;--secondary:#087B9C;--accent:#52B788;--orange:#F4A261;--dark:#102A43;--gray:#52687A;--light-gray:#F1F5F9;--white:#FFFFFF;--radius:16px}
body{font-family:'Assistant',sans-serif;background:linear-gradient(135deg,#E8F2FF 0%,#F1F5F9 50%,#EDE9FE 100%);color:var(--dark);min-height:100vh}
header{text-align:center;padding:32px 20px 20px}
header h1{font-family:'Assistant',sans-serif;font-size:1.8rem;font-weight:700;margin-bottom:8px}
.meta{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
.tag{background:var(--white);padding:4px 14px;border-radius:50px;font-size:0.85rem;color:var(--gray);box-shadow:0 2px 8px rgba(0,0,0,0.06)}
.tag.hl{background:var(--primary);color:var(--white)}

/* TABS */
.tabs{display:flex;gap:0;background:var(--white);border-radius:14px 14px 0 0;margin:0 auto;max-width:900px;overflow-x:auto;box-shadow:0 2px 12px rgba(0,0,0,0.06)}
.tab{padding:14px 20px;cursor:pointer;font-weight:500;font-size:0.9rem;border-bottom:3px solid transparent;transition:all .25s;white-space:nowrap}
.tab:hover{background:var(--primary-light)}
.tab.active{border-bottom-color:var(--primary);color:var(--primary);font-weight:700;background:var(--primary-light)}

/* PANELS */
.panels{max-width:900px;margin:0 auto;background:var(--white);border-radius:0 0 14px 14px;box-shadow:0 4px 24px rgba(0,0,0,0.08);min-height:400px}
.activity-panel{display:none;padding:32px 28px}
.activity-panel.active{display:block;animation:fadeUp .4s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

/* COMMON */
.btn{border:none;cursor:pointer;font-family:'Assistant',sans-serif;font-weight:500;padding:12px 24px;border-radius:12px;font-size:0.95rem;transition:all .25s;display:inline-flex;align-items:center;gap:6px}
.btn-primary{background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:var(--white)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(42,157,143,0.3)}
.btn-secondary{background:var(--light-gray);color:var(--dark)}
.btn-secondary:hover{background:#E2E8F0}
.btn-accent{background:linear-gradient(135deg,var(--accent),#3DA676);color:var(--white)}
.btn-orange{background:linear-gradient(135deg,var(--orange),#E76F51);color:var(--white)}
.btn-group{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;justify-content:center}

.teacher-note{background:#FFFBEB;border-right:4px solid var(--orange);padding:14px 18px;border-radius:12px;font-size:0.9rem;line-height:1.7;display:none;margin-bottom:16px}
.teacher-note.show{display:block;animation:fadeUp .3s ease}

.section-title{font-family:'Assistant',sans-serif;font-size:1.3rem;font-weight:600;text-align:center;margin-bottom:20px}

/* FULLSCREEN */
.fs-overlay{position:fixed;inset:0;background:rgba(15,23,42,.97);z-index:1000;display:none;align-items:center;justify-content:center;padding:40px}
.fs-overlay.active{display:flex}
.fs-close{position:absolute;top:20px;left:20px;background:rgba(255,255,255,.15);border:none;color:var(--white);width:48px;height:48px;border-radius:50%;font-size:1.5rem;cursor:pointer}
.fs-close:hover{background:rgba(255,255,255,.25)}
.fs-content{color:var(--white);text-align:center;max-width:90vw;width:100%;font-size:1.4rem}

/* QUESTION */
.big-question{font-family:'Assistant',sans-serif;font-size:1.5rem;font-weight:600;text-align:center;line-height:1.8;margin-bottom:20px;padding:20px;background:var(--primary-light);border-radius:16px}
.timer-display{text-align:center;font-size:2.5rem;font-family:'Assistant',sans-serif;font-weight:700;color:var(--primary);margin:16px 0}
.hint-box,.answer-box{padding:16px 20px;border-radius:14px;margin:12px 0;display:none;animation:fadeUp .3s ease;font-size:1.05rem}
.hint-box{background:#FEF3C7;border-right:4px solid var(--orange)}
.answer-box{background:linear-gradient(135deg,var(--primary),var(--accent));color:var(--white);font-weight:600;font-size:1.2rem;text-align:center}

/* STORY */
.story-text{font-size:1.15rem;line-height:2;padding:24px;background:var(--primary-light);border-radius:16px;border-right:4px solid var(--primary);margin-bottom:16px}
.discussion-q{font-family:'Assistant',sans-serif;font-size:1.15rem;font-weight:600;text-align:center;padding:16px;display:none;animation:fadeUp .3s ease}

/* VOTE */
.vote-q{font-family:'Assistant',sans-serif;font-size:1.2rem;font-weight:600;text-align:center;margin-bottom:16px}
.vote-opts{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
.vote-o{border:2px solid #E2E8F0;background:var(--light-gray);padding:14px 20px;border-radius:14px;font-family:'Assistant',sans-serif;font-size:1.05rem;cursor:pointer;transition:all .25s;display:flex;align-items:center;gap:10px}
.vote-o:hover{border-color:var(--primary);background:var(--primary-light);transform:translateX(-4px)}
.vote-o.voted{border-color:var(--primary);background:var(--primary-light)}
.vote-letter{background:var(--primary);color:var(--white);width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0}
.chart{display:none;animation:fadeUp .4s ease}
.chart.show{display:block}
.bar-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.bar-label{width:36px;text-align:center;font-size:0.9rem;font-weight:500;flex-shrink:0}
.bar-bg{flex:1;height:34px;background:var(--light-gray);border-radius:10px;overflow:hidden}
.bar{height:100%;border-radius:10px;transition:width .6s cubic-bezier(.22,1,.36,1);display:flex;align-items:center;padding-left:10px}
.bar span{color:var(--white);font-weight:700;font-size:0.85rem}
.bar.c0{background:linear-gradient(90deg,var(--primary),var(--accent))}
.bar.c1{background:linear-gradient(90deg,#6366F1,#818CF8)}
.bar.c2{background:linear-gradient(90deg,var(--secondary),#F87171)}
.bar.c3{background:linear-gradient(90deg,var(--orange),#FBBF24)}
.chart-total{text-align:center;font-size:0.85rem;color:var(--gray);margin-top:8px}

/* RIDDLE */
.riddle-q{font-family:'Assistant',sans-serif;font-size:1.3rem;font-weight:600;text-align:center;margin-bottom:20px}
.hint-item{background:linear-gradient(135deg,#E8F2FF,#E8F2FF);padding:14px 20px;border-radius:14px;margin-bottom:10px;cursor:pointer;text-align:center;font-weight:500;color:var(--primary);transition:all .25s}
.hint-item:hover{transform:scale(1.02)}
.hint-item.revealed{background:var(--white);border:2px solid var(--primary);cursor:default;text-align:right;display:flex;align-items:center;gap:10px}
.hint-num{background:var(--primary);color:var(--white);width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;flex-shrink:0}
.riddle-answer{display:none;background:linear-gradient(135deg,var(--primary),var(--accent));color:var(--white);padding:20px;border-radius:16px;font-family:'Assistant',sans-serif;font-size:1.3rem;font-weight:700;text-align:center;animation:scaleIn .4s ease}
@keyframes scaleIn{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}

/* TRUE/FALSE */
.tf-cards{display:grid;gap:14px}
.tf-card{background:var(--light-gray);border-radius:14px;padding:18px 20px;cursor:pointer;transition:all .3s;position:relative;min-height:80px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:1.05rem;font-weight:500}
.tf-card:hover{transform:scale(1.02)}
.tf-card.flipped{cursor:default}
.tf-card.flipped.correct{background:#D1FAE5;border:2px solid var(--accent)}
.tf-card.flipped.wrong{background:#FFE4E6;border:2px solid var(--secondary)}
.tf-result{display:none;font-size:0.9rem;margin-top:8px;font-weight:400}
.tf-card.flipped .tf-result{display:block}

/* DILEMMA */
.dilemma-text{font-size:1.1rem;line-height:1.9;padding:24px;background:var(--primary-light);border-radius:16px;margin-bottom:20px;text-align:center}
.dilemma-opts{display:grid;gap:12px}
.dilemma-o{background:var(--white);border:2px solid #E2E8F0;border-radius:14px;padding:18px;cursor:pointer;transition:all .25s;text-align:center;font-weight:600;font-size:1.05rem}
.dilemma-o:hover{border-color:var(--primary);background:var(--primary-light);transform:translateY(-2px)}
.dilemma-o.chosen{border-color:var(--primary);background:var(--primary-light)}
.dilemma-result{display:none;padding:16px;background:#FFFBEB;border-radius:12px;margin-top:12px;font-size:0.95rem;animation:fadeUp .3s ease}
.dilemma-o.chosen .dilemma-result{display:block}

/* IMAGE */
.image-display{font-size:4rem;text-align:center;padding:32px;background:var(--primary-light);border-radius:20px;margin-bottom:16px;line-height:1.5}
.image-q{font-family:'Assistant',sans-serif;font-size:1.2rem;font-weight:600;text-align:center;margin-bottom:16px}

/* WORDCLOUD */
.wc-prompt{font-family:'Assistant',sans-serif;font-size:1.2rem;font-weight:600;text-align:center;margin-bottom:16px}
.wc-input-row{display:flex;gap:10px;margin-bottom:16px}
.wc-input{flex:1;border:2px solid #E2E8F0;border-radius:14px;padding:12px 18px;font-family:'Assistant',sans-serif;font-size:1.05rem;outline:none;direction:rtl}
.wc-input:focus{border-color:var(--primary)}
.wc-area{min-height:160px;border:2px dashed #E2E8F0;border-radius:16px;padding:20px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px}
.wc-area.has{border-color:var(--primary);background:var(--primary-light)}
.wc-word{display:inline-block;padding:6px 16px;border-radius:50px;font-family:'Assistant',sans-serif;font-weight:500;color:var(--white);animation:popIn .3s ease}
@keyframes popIn{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
.wc-word:hover{transform:scale(1.1);transition:transform .2s}
.wc-empty{color:var(--gray)}
.wc-count{text-align:center;font-size:0.85rem;color:var(--gray);margin-top:8px}

footer{text-align:center;padding:24px;color:var(--gray);font-size:0.8rem}
@media(max-width:600px){header h1{font-size:1.4rem}.activity-panel{padding:20px 16px}.big-question,.riddle-q{font-size:1.15rem}}
</style>
</head>
<body>
<header>
  <div style="font-size:2.5rem;margin-bottom:8px">🎯</div>
  <h1>פעילויות פתיחה – ${d.name}</h1>
  <div class="meta">
    <span class="tag hl">${d.subject}</span>
    <span class="tag">כיתה ${d.grade}׳</span>
    <span class="tag">${d.name}</span>
  </div>
</header>

<div class="tabs" id="tabs">${tabsHTML}</div>
<div class="panels" id="panels">${activitiesHTML}</div>

<div class="fs-overlay" id="fsOverlay">
  <button class="fs-close" onclick="closeFS()">✕</button>
  <div class="fs-content" id="fsContent"></div>
</div>

<footer>המרכז הפדגוגי · מינהל הכשרה מקצועית – פעילויות פתיחה לשיעור</footer>

<script>
// Tab switching
function switchTab(idx) {
  document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', i===idx));
  document.querySelectorAll('.activity-panel').forEach((p,i) => p.classList.toggle('active', i===idx));
}

// Listen for messages from parent (builder preview)
window.addEventListener('message', function(e) {
  if (e.data && e.data.action === 'switchTab') switchTab(e.data.index);
});

// Fullscreen
function openFS(panelIdx) {
  const panel = document.getElementById('panel-' + panelIdx);
  if (!panel) return;
  document.getElementById('fsContent').innerHTML = panel.innerHTML;
  document.getElementById('fsOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeFS() {
  document.getElementById('fsOverlay').classList.remove('active');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFS(); });

// Teacher note toggle
function toggleNote(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('show');
}

// Timer
function startTimer(id, seconds) {
  const el = document.getElementById(id);
  if (!el) return;
  let remaining = seconds;
  el.textContent = remaining;
  const interval = setInterval(() => {
    remaining--;
    el.textContent = remaining;
    if (remaining <= 0) { clearInterval(interval); el.textContent = '⏰ נגמר הזמן!'; }
  }, 1000);
}

// Show/hide elements
function showEl(id) { const el = document.getElementById(id); if(el) el.style.display = 'block'; }
function hideEl(id) { const el = document.getElementById(id); if(el) el.style.display = 'none'; }

${generateVoteJS()}
${generateRiddleJS()}
${generateTFJS()}
${generateDilemmaJS()}
${generateWordcloudJS()}
${generateWheelJS()}
${generateFillBlankJS()}
${generateGuessNumberJS()}
${generateTwoTruthsJS()}

// Auto-init wheels
document.querySelectorAll('.wheel-init').forEach(function(el) {
  var idx = parseInt(el.dataset.idx);
  var items = JSON.parse(el.dataset.items);
  initWheel(idx, items);
});
<\/script>
</body>
</html>`;
}

function generateActivityHTML(act, idx) {
  const t = TYPES[act.type];
  const d = act.data;
  const noteId = `note_${idx}`;

  let noteText = '';
  let contentHTML = '';

  switch(act.type) {
    case 'question':
      noteText = 'הציגו את השאלה על המסך. תנו לתלמידים 60 שניות לחשוב. אפשר לעבוד בזוגות. חשפו את הרמז אם צריך, ואז את כיוון התשובה.';
      contentHTML = `
        <div class="section-title">${t.icon} שאלה מעוררת חשיבה</div>
        <div class="big-question">${d.text || 'שאלה...'}</div>
        <div class="timer-display" id="timer_${idx}">60</div>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="startTimer('timer_${idx}', ${d.timerSeconds || 60})">⏱ התחל טיימר</button>
          ${d.hint ? `<button class="btn btn-orange" onclick="showEl('hint_${idx}')">💡 גלה רמז</button>` : ''}
          <button class="btn btn-accent" onclick="showEl('ans_${idx}')">✅ גלה תשובה</button>
        </div>
        ${d.hint ? `<div class="hint-box" id="hint_${idx}">💡 ${d.hint}</div>` : ''}
        <div class="answer-box" id="ans_${idx}">${d.answer || ''}</div>`;
      break;

    case 'story':
      noteText = 'הקריאו את הסיפור/העובדה בקול. תנו כמה שניות לעיכול. לחצו "מה דעתכם?" לדיון כיתתי.';
      contentHTML = `
        <div class="section-title">${t.icon} סיפור / עובדה מפתיעה</div>
        <div class="story-text">${d.text || 'סיפור...'}</div>
        <div class="btn-group"><button class="btn btn-primary" onclick="showEl('disc_${idx}')">💬 מה דעתכם?</button></div>
        <div class="discussion-q" id="disc_${idx}">💬 ${d.discussionQuestion || 'מה דעתכם?'}</div>`;
      break;

    case 'vote':
      noteText = 'הקרינו על המסך. כל תלמיד ניגש ולוחץ על התשובה שלו. הגרף מתעדכן בזמן אמת. אפשר גם לשתף קישור לטלפונים.';
      const letters = ['א','ב','ג','ד','ה','ו'];
      const optsHTML = (d.options || []).map((o, j) =>
        `<div class="vote-o" onclick="doVote(${idx},${j})"><span class="vote-letter">${letters[j] || j+1}</span><span>${o || 'אפשרות'}</span></div>`
      ).join('');
      const barsHTML = (d.options || []).map((o, j) =>
        `<div class="bar-row"><span class="bar-label">${letters[j] || j+1}</span><div class="bar-bg"><div class="bar c${j%4}" id="vbar_${idx}_${j}" style="width:0"><span></span></div></div></div>`
      ).join('');
      contentHTML = `
        <div class="section-title">${t.icon} הצבעה / סקר כיתתי</div>
        <div class="vote-q">${d.question || 'שאלה...'}</div>
        <div class="vote-opts" id="vopts_${idx}">${optsHTML}</div>
        <div class="chart" id="vchart_${idx}">${barsHTML}<div class="chart-total" id="vtotal_${idx}"></div></div>
        <div class="btn-group"><button class="btn btn-sm btn-secondary" onclick="resetVote(${idx})">🔄 אפס</button></div>`;
      break;

    case 'riddle':
      noteText = 'חשפו רמז אחד בכל פעם. תנו לתלמידים לנחש אחרי כל רמז. מי שמצליח עם הכי פחות רמזים – מנצח!';
      const hintsHTML = (d.hints || []).map((h, j) =>
        `<div class="hint-item" id="rhint_${idx}_${j}" onclick="revealRiddleHint(${idx},${j})">לחצו לגלות רמז ${j+1}</div>`
      ).join('');
      contentHTML = `
        <div class="section-title">${t.icon} חידה / ניחוש</div>
        <div class="riddle-q">${d.question || 'מי אני?'}</div>
        <div id="rhints_${idx}">${hintsHTML}</div>
        <div class="btn-group"><button class="btn btn-accent" id="rbtn_${idx}" style="display:none" onclick="showRiddleAnswer(${idx})">🎉 גלו את התשובה!</button></div>
        <div class="riddle-answer" id="rans_${idx}">${d.answer || 'התשובה'}</div>`;
      break;

    case 'truefalse':
      noteText = 'לחצו על כל טענה כדי לגלות אם היא נכונה או לא. אפשר לבקש מתלמידים להרים יד לפני שחושפים.';
      const stmtsHTML = (d.statements || []).map((s, j) =>
        `<div class="tf-card" id="tfc_${idx}_${j}" onclick="flipTF(${idx},${j})">
          <div><div>${s.text || 'טענה'}</div><div class="tf-result" id="tfr_${idx}_${j}">${s.isTrue ? '✅ נכון!' : '❌ לא נכון!'} ${s.explanation || ''}</div></div>
        </div>`
      ).join('');
      contentHTML = `
        <div class="section-title">${t.icon} נכון / לא נכון</div>
        <div class="tf-cards">${stmtsHTML}</div>`;
      break;

    case 'dilemma':
      noteText = 'הציגו את הסיטואציה. בקשו מתלמידים לבחור צד. אפשר לשתף קישור לטלפונים כדי שכולם יצביעו.';
      const dilOptsHTML = (d.options || []).map((o, j) =>
        `<div class="dilemma-o" onclick="chooseDilemma(${idx},${j})">${o.text || 'אפשרות'}<div class="dilemma-result">${o.result || ''}</div></div>`
      ).join('');
      contentHTML = `
        <div class="section-title">${t.icon} מה היית עושה?</div>
        <div class="dilemma-text">${d.scenario || 'סיטואציה...'}</div>
        <div class="dilemma-opts">${dilOptsHTML}</div>`;
      break;

    case 'image':
      noteText = 'הציגו את האמוג\'י. שאלו "מה אתם רואים?" ותנו לתלמידים להציע רעיונות. אפשר לרשום על הלוח.';
      contentHTML = `
        <div class="section-title">${t.icon} תמונה מדברת</div>
        <div class="image-display">${d.emoji || '🤔'}</div>
        <div class="image-q">${d.question || 'מה אתם רואים?'}</div>`;
      break;

    case 'wordcloud':
      noteText = 'שתפו קישור או הקרינו על המסך. כל תלמיד מקליד מילה אחת. ענן המילים גדל בזמן אמת!';
      contentHTML = `
        <div class="section-title">${t.icon} מילה אחת – ענן מילים</div>
        <div class="wc-prompt">${d.prompt || 'כתבו מילה אחת...'}</div>
        <div class="wc-input-row">
          <input type="text" class="wc-input" id="wcinput_${idx}" placeholder="כתבו מילה..." maxlength="20" onkeydown="if(event.key==='Enter')addWC(${idx})">
          <button class="btn btn-primary" onclick="addWC(${idx})">➕</button>
        </div>
        <div class="wc-area" id="wcarea_${idx}"><span class="wc-empty">🌤️ הענן ריק... הוסיפו מילים!</span></div>
        <div class="wc-count" id="wccount_${idx}"></div>`;
      break;

    case 'wheel':
      noteText = 'לחצו "סובב!" והגלגל יבחר פריט אקראי. מושלם לבחירת תלמיד שיענה, לנושא לדיון, או להגרלה.';
      const wheelItems = (d.items || []).filter(x => x);
      const wheelItemsJSON = JSON.stringify(wheelItems);
      contentHTML = `
        <div class="section-title">${t.icon} ${d.question || 'גלגל מזל'}</div>
        <div style="text-align:center;margin:20px 0">
          <canvas id="wheelCanvas_${idx}" width="320" height="320" style="max-width:100%"></canvas>
        </div>
        <div style="text-align:center;font-family:'Assistant',sans-serif;font-size:1.5rem;font-weight:700;min-height:50px;margin:12px 0" id="wheelResult_${idx}"></div>
        <div class="btn-group"><button class="btn btn-primary" onclick="spinWheel(${idx})">🎲 סובב!</button></div>
        <div class="wheel-init" data-idx="${idx}" data-items='${JSON.stringify(wheelItems).replace(/'/g, "&#39;")}'></div>`;
      break;

    case 'fillblank':
      noteText = 'הציגו את המשפט עם המילה החסרה. התלמידים בוחרים מבין האפשרויות. מצוין לבדיקת ידע קודם.';
      const allOpts = [d.answer, ...(d.options || [])].filter(x => x);
      const shuffled = allOpts.sort(() => Math.random() - 0.5);
      const optsButtons = shuffled.map((o, j) =>
        `<button class="btn btn-secondary" style="font-size:1.1rem" onclick="checkFB(${idx},'${o.replace(/'/g,"\\'")}','${(d.answer||'').replace(/'/g,"\\'")}')">${o}</button>`
      ).join('');
      contentHTML = `
        <div class="section-title">${t.icon} השלמת משפט</div>
        <div class="big-question">${(d.sentence || '___').replace('___', '<span style="border-bottom:3px solid var(--secondary);padding:0 20px;color:var(--secondary)">?</span>')}</div>
        <div class="btn-group" id="fbOpts_${idx}">${optsButtons}</div>
        <div class="answer-box" id="fbResult_${idx}"></div>`;
      break;

    case 'guessnumber':
      noteText = 'הציגו את השאלה. תלמידים מנחשים מספר. מי שהכי קרוב – מנצח! אפשר לשתף קישור לטלפונים.';
      contentHTML = `
        <div class="section-title">${t.icon} ניחוש מספר</div>
        <div class="big-question">${d.question || 'כמה...?'}</div>
        <div style="display:flex;gap:10px;justify-content:center;margin:16px 0">
          <input type="number" class="wc-input" id="gnInput_${idx}" placeholder="הניחוש שלכם..." style="max-width:200px;text-align:center;font-size:1.3rem">
          <button class="btn btn-primary" onclick="guessNumber(${idx}, ${d.answer || 0}, '${d.unit || ''}')">🏆 בדוק!</button>
        </div>
        <div class="answer-box" id="gnResult_${idx}"></div>`;
      break;

    case 'twotruths':
      noteText = '3 טענות על הנושא – 2 אמת ואחת שקר. התלמידים צריכים לזהות את השקר. מצוין לעורר דיון!';
      const ttStmts = (d.statements || []).map((s, j) =>
        `<div class="tf-card" id="ttc_${idx}_${j}" onclick="checkTT(${idx},${j},${s.isLie})">${s.text || 'טענה'}<div class="tf-result" id="ttr_${idx}_${j}">${s.isLie ? '❌ זה השקר!' : '✅ זו אמת!'}</div></div>`
      ).join('');
      contentHTML = `
        <div class="section-title">${t.icon} שני אמתות ושקר – מצאו את השקר!</div>
        <div class="tf-cards">${ttStmts}</div>`;
      break;
  }

  return `
    <div class="teacher-note" id="${noteId}"><strong>💡 הנחיה למורה:</strong> ${noteText}</div>
    ${contentHTML}
    <div class="btn-group">
      <button class="btn btn-secondary" onclick="toggleNote('${noteId}')">💡 הנחיה למורה</button>
      <button class="btn btn-primary" onclick="openFS(${idx})">🖥️ מסך מלא</button>
    </div>`;
}

// JS generators for the output HTML
function generateVoteJS() {
  return `
var voteData = {};
function doVote(actIdx, optIdx) {
  if (!voteData[actIdx]) voteData[actIdx] = {};
  voteData[actIdx][optIdx] = (voteData[actIdx][optIdx] || 0) + 1;
  var chart = document.getElementById('vchart_' + actIdx);
  if (chart) chart.classList.add('show');
  var total = 0;
  Object.values(voteData[actIdx]).forEach(function(v) { total += v; });
  Object.keys(voteData[actIdx]).forEach(function(k) {
    var bar = document.getElementById('vbar_' + actIdx + '_' + k);
    if (bar) {
      var pct = Math.round((voteData[actIdx][k] / total) * 100);
      bar.style.width = pct + '%';
      bar.querySelector('span').textContent = voteData[actIdx][k];
    }
  });
  var totalEl = document.getElementById('vtotal_' + actIdx);
  if (totalEl) totalEl.textContent = total + ' הצבעות';
}
function resetVote(actIdx) {
  voteData[actIdx] = {};
  var chart = document.getElementById('vchart_' + actIdx);
  if (chart) {
    chart.classList.remove('show');
    chart.querySelectorAll('.bar').forEach(function(b) { b.style.width = '0'; b.querySelector('span').textContent = ''; });
  }
  var totalEl = document.getElementById('vtotal_' + actIdx);
  if (totalEl) totalEl.textContent = '';
}`;
}

function generateRiddleJS() {
  const riddleData = {};
  activities.forEach((a, i) => {
    if (a.type === 'riddle') riddleData[i] = { hints: a.data.hints, revealed: 0 };
  });
  return `
var riddleState = ${JSON.stringify(riddleData)};
var riddleHints = ${JSON.stringify(Object.fromEntries(activities.filter(a => a.type === 'riddle').map((a, _, arr) => [activities.indexOf(a), a.data.hints])))};
function revealRiddleHint(actIdx, hintIdx) {
  if (!riddleState[actIdx]) riddleState[actIdx] = { revealed: 0 };
  if (hintIdx > riddleState[actIdx].revealed) return;
  var el = document.getElementById('rhint_' + actIdx + '_' + hintIdx);
  if (!el || el.classList.contains('revealed')) return;
  var hints = riddleHints[actIdx] || [];
  el.classList.add('revealed');
  el.innerHTML = '<span class="hint-num">' + (hintIdx+1) + '</span><span>' + (hints[hintIdx] || '') + '</span>';
  el.onclick = null;
  riddleState[actIdx].revealed = hintIdx + 1;
  if (riddleState[actIdx].revealed >= (hints.length || 4)) {
    var btn = document.getElementById('rbtn_' + actIdx);
    if (btn) btn.style.display = 'inline-flex';
  }
}
function showRiddleAnswer(actIdx) {
  var el = document.getElementById('rans_' + actIdx);
  if (el) el.style.display = 'block';
  var btn = document.getElementById('rbtn_' + actIdx);
  if (btn) btn.style.display = 'none';
}`;
}

function generateTFJS() {
  const tfData = {};
  activities.forEach((a, i) => {
    if (a.type === 'truefalse') tfData[i] = a.data.statements.map(s => s.isTrue);
  });
  return `
var tfCorrect = ${JSON.stringify(tfData)};
function flipTF(actIdx, stmtIdx) {
  var card = document.getElementById('tfc_' + actIdx + '_' + stmtIdx);
  if (!card || card.classList.contains('flipped')) return;
  card.classList.add('flipped');
  var isTrue = tfCorrect[actIdx] ? tfCorrect[actIdx][stmtIdx] : true;
  card.classList.add(isTrue ? 'correct' : 'wrong');
}`;
}

function generateDilemmaJS() {
  return `
function chooseDilemma(actIdx, optIdx) {
  var parent = event.target.closest('.dilemma-opts') || event.target.parentElement;
  parent.querySelectorAll('.dilemma-o').forEach(function(o) { o.classList.remove('chosen'); });
  event.target.closest('.dilemma-o').classList.add('chosen');
}`;
}

function generateWordcloudJS() {
  return `
var wcData = {};
var wcColors = ['linear-gradient(135deg,#124D7A,#52B788)','linear-gradient(135deg,#6366F1,#818CF8)','linear-gradient(135deg,#087B9C,#F87171)','linear-gradient(135deg,#F4A261,#FBBF24)','linear-gradient(135deg,#7C3AED,#A78BFA)','linear-gradient(135deg,#0EA5E9,#38BDF8)','linear-gradient(135deg,#14B8A6,#5EEAD4)','linear-gradient(135deg,#EC4899,#F472B6)'];
function addWC(actIdx) {
  var input = document.getElementById('wcinput_' + actIdx);
  if (!input) return;
  var word = input.value.trim();
  if (!word) return;
  if (!wcData[actIdx]) wcData[actIdx] = {};
  wcData[actIdx][word] = (wcData[actIdx][word] || 0) + 1;
  input.value = '';
  input.focus();
  renderWC(actIdx);
}
function renderWC(actIdx) {
  var area = document.getElementById('wcarea_' + actIdx);
  var countEl = document.getElementById('wccount_' + actIdx);
  if (!area) return;
  var entries = Object.entries(wcData[actIdx] || {});
  var maxC = Math.max.apply(null, entries.map(function(e){ return e[1]; }).concat([1]));
  var html = '';
  entries.forEach(function(e, i) {
    var word = e[0], count = e[1];
    var sz = 's1';
    if (count >= 4) sz = 's4'; else if (count >= 3) sz = 's3'; else if (count >= 2) sz = 's2';
    var sizes = {'s1':'0.9rem','s2':'1.2rem','s3':'1.6rem','s4':'2.2rem'};
    html += '<span class="wc-word" style="background:' + wcColors[i % wcColors.length] + ';font-size:' + sizes[sz] + '">' + word + (count > 1 ? ' (' + count + ')' : '') + '</span>';
  });
  area.innerHTML = html || '<span class="wc-empty">🌤️ הענן ריק... הוסיפו מילים!</span>';
  area.classList.toggle('has', entries.length > 0);
  var totalW = Object.values(wcData[actIdx] || {}).reduce(function(a,b){return a+b;}, 0);
  if (countEl) countEl.textContent = entries.length > 0 ? entries.length + ' מילים שונות | ' + totalW + ' סה"כ' : '';
}`;
}

function generateWheelJS() {
  return `
var wheelData = {};
function initWheel(idx, items) {
  wheelData[idx] = { items: items, angle: 0, spinning: false };
  drawWheel(idx);
}
function drawWheel(idx) {
  var canvas = document.getElementById('wheelCanvas_' + idx);
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var items = wheelData[idx].items;
  var n = items.length;
  if (n === 0) return;
  var cx = 160, cy = 160, r = 150;
  var colors = ['#124D7A','#6366F1','#087B9C','#F4A261','#52B788','#7C3AED','#0EA5E9','#EC4899','#14B8A6','#FBBF24'];
  var angle = wheelData[idx].angle;
  ctx.clearRect(0, 0, 320, 320);
  for (var i = 0; i < n; i++) {
    var start = angle + (i * 2 * Math.PI / n);
    var end = start + 2 * Math.PI / n;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    var mid = start + Math.PI / n;
    var tx = cx + r * 0.65 * Math.cos(mid);
    var ty = cy + r * 0.65 * Math.sin(mid);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Heebo';
    ctx.textAlign = 'center';
    ctx.fillText(items[i].substring(0, 10), 0, 5);
    ctx.restore();
  }
  // Arrow
  ctx.beginPath();
  ctx.moveTo(cx - 12, 4);
  ctx.lineTo(cx + 12, 4);
  ctx.lineTo(cx, 24);
  ctx.fillStyle = '#102A43';
  ctx.fill();
}
function spinWheel(idx) {
  if (!wheelData[idx] || wheelData[idx].spinning) return;
  wheelData[idx].spinning = true;
  var items = wheelData[idx].items;
  var n = items.length;
  var spins = 3 + Math.random() * 3;
  var targetAngle = wheelData[idx].angle + spins * 2 * Math.PI;
  var duration = 3000;
  var start = performance.now();
  var startAngle = wheelData[idx].angle;
  function animate(now) {
    var elapsed = now - start;
    var progress = Math.min(elapsed / duration, 1);
    var eased = 1 - Math.pow(1 - progress, 3);
    wheelData[idx].angle = startAngle + (targetAngle - startAngle) * eased;
    drawWheel(idx);
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      wheelData[idx].spinning = false;
      var finalAngle = wheelData[idx].angle % (2 * Math.PI);
      var sliceAngle = 2 * Math.PI / n;
      var pointerAngle = (2 * Math.PI - finalAngle + Math.PI * 1.5) % (2 * Math.PI);
      var selectedIdx = Math.floor(pointerAngle / sliceAngle) % n;
      var result = document.getElementById('wheelResult_' + idx);
      if (result) result.innerHTML = '🎉 ' + items[selectedIdx];
    }
  }
  requestAnimationFrame(animate);
}`;
}

function generateFillBlankJS() {
  return `
function checkFB(idx, chosen, correct) {
  var el = document.getElementById('fbResult_' + idx);
  if (!el) return;
  if (chosen === correct) {
    el.style.display = 'block';
    el.style.background = 'linear-gradient(135deg,#52B788,#124D7A)';
    el.innerHTML = '✅ נכון! התשובה היא: ' + correct;
  } else {
    el.style.display = 'block';
    el.style.background = 'linear-gradient(135deg,#087B9C,#F87171)';
    el.innerHTML = '❌ לא נכון. התשובה הנכונה: ' + correct;
  }
  var opts = document.getElementById('fbOpts_' + idx);
  if (opts) opts.querySelectorAll('.btn').forEach(function(b) { b.disabled = true; b.style.opacity = 0.5; });
}`;
}

function generateGuessNumberJS() {
  return `
function guessNumber(idx, correct, unit) {
  var input = document.getElementById('gnInput_' + idx);
  var el = document.getElementById('gnResult_' + idx);
  if (!input || !el) return;
  var guess = parseFloat(input.value);
  if (isNaN(guess)) { el.style.display = 'block'; el.style.background = '#F4A261'; el.innerHTML = '🤔 הזינו מספר!'; return; }
  var diff = Math.abs(guess - correct);
  var pct = correct !== 0 ? (diff / Math.abs(correct)) * 100 : diff;
  el.style.display = 'block';
  if (diff === 0) {
    el.style.background = 'linear-gradient(135deg,#52B788,#124D7A)';
    el.innerHTML = '🎯 מדויק! התשובה: ' + correct + ' ' + unit;
  } else if (pct < 10) {
    el.style.background = 'linear-gradient(135deg,#52B788,#124D7A)';
    el.innerHTML = '🔥 כמעט! התשובה: ' + correct + ' ' + unit + ' (הפרש: ' + diff + ')';
  } else if (pct < 30) {
    el.style.background = 'linear-gradient(135deg,#F4A261,#FBBF24)';
    el.innerHTML = '👍 לא רע! התשובה: ' + correct + ' ' + unit + ' (הפרש: ' + diff + ')';
  } else {
    el.style.background = 'linear-gradient(135deg,#087B9C,#F87171)';
    el.innerHTML = '😮 רחוק... התשובה: ' + correct + ' ' + unit + ' (הפרש: ' + diff + ')';
  }
}`;
}

function generateTwoTruthsJS() {
  return `
function checkTT(idx, stmtIdx, isLie) {
  var card = document.getElementById('ttc_' + idx + '_' + stmtIdx);
  if (!card || card.classList.contains('flipped')) return;
  card.classList.add('flipped');
  card.classList.add(isLie ? 'wrong' : 'correct');
}`;
}

// ===== DOWNLOAD =====
function downloadHTML() {
  saveActivityData();
  const html = generateOpenerHTML();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (details.name || 'opener').replace(/\s+/g, '-') + '.html';
  a.click();
  showToast('הקובץ הורד בהצלחה!');
}

// ===== PUBLISH =====
async function publishOpener() {
  saveActivityData();
  const openerId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);

  const openerJSON = JSON.stringify({ activities, types: selectedTypes });

  const saveData = {
    action: 'saveOpener',
    id: openerId,
    name: details.name,
    subject: details.subject,
    grade: details.grade,
    teacher: user.name,
    email: user.email,
    openerJSON: openerJSON
  };

  showToast('מפרסם...');

  try {
    await fetch(SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(saveData)
    });

    const url = PLAYER_BASE_URL + '?id=' + openerId;
    document.getElementById('publishLink').textContent = url;

    // Generate QR
    const qrContainer = document.getElementById('qrContainer');
    qrContainer.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      const canvas = document.createElement('canvas');
      qrContainer.appendChild(canvas);
      QRCode.toCanvas(canvas, url, { width: 200, margin: 2 });
    }

    document.getElementById('publishModal').classList.add('active');
  } catch (e) {
    showToast('שגיאה בפרסום: ' + e.message);
  }
}

function copyLink() {
  const link = document.getElementById('publishLink').textContent;
  navigator.clipboard.writeText(link).then(() => showToast('הקישור הועתק!'));
}

function closeModal() {
  document.getElementById('publishModal').classList.remove('active');
}

// ===== DRAFT =====
function saveDraft() {
  saveActivityData();
  localStorage.setItem('opener_draft', JSON.stringify({
    user, details, selectedTypes, activities,
    step: currentStep, savedAt: new Date().toISOString()
  }));
  showToast('טיוטה נשמרה!');
}

function loadDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem('opener_draft'));
    if (!draft) return;
    if (draft.user) user = draft.user;
    if (draft.details) {
      details = draft.details;
      if (details.name) document.getElementById('openerName').value = details.name;
      if (details.subject) document.getElementById('openerSubject').value = details.subject;
      if (details.grade) document.getElementById('openerGrade').value = details.grade;
    }
    if (draft.selectedTypes) selectedTypes = draft.selectedTypes;
    if (draft.activities) activities = draft.activities;
    renderTypeGrid();
    renderActivityEditors();
    if (selectedTypes.length > 0) document.getElementById('aiSection').style.display = 'block';
  } catch (e) {}
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== INIT =====
init();
