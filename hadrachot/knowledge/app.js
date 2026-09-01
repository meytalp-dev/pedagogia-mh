// Knowledge base
let items = [];
let filterCategory = '';
let filterAudience = '';

document.addEventListener('DOMContentLoaded', async () => {
  await load();
  setupFilters();
  document.getElementById('form-knowledge').addEventListener('submit', submitItem);
});

async function load() {
  const res = await TS.api('knowledge.list', {});
  items = res.data || [];
  render();
}

function setupFilters() {
  document.getElementById('search').addEventListener('input', render);
  document.getElementById('cat-filter').addEventListener('change', e => { filterCategory = e.target.value; render(); });
  document.getElementById('aud-filter').addEventListener('change', e => { filterAudience = e.target.value; render(); });
}

function render() {
  const search = document.getElementById('search').value.trim().toLowerCase();
  const list = items.filter(i => {
    if (filterCategory && i.category !== filterCategory) return false;
    if (filterAudience && i.audience && i.audience !== filterAudience && i.audience !== 'all') return false;
    if (search) {
      const blob = (i.title + ' ' + (i.description || '')).toLowerCase();
      if (!blob.includes(search)) return false;
    }
    return true;
  });
  document.getElementById('count').textContent = `${list.length} פריטים`;

  // Categories list
  const cats = [...new Set(items.map(i => i.category).filter(Boolean))];
  const catSel = document.getElementById('cat-filter');
  if (catSel.options.length <= 1) {
    cats.forEach(c => catSel.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`));
  }

  const grid = document.getElementById('items');
  if (!list.length) {
    grid.innerHTML = `<div class="empty card">אין פריטים להצגה</div>`;
    return;
  }
  grid.innerHTML = list.map(i => `
    <a class="card kn-card" href="${i.link || '#'}" target="_blank">
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
        ${i.category ? `<span class="badge neutral">${i.category}</span>` : ''}
        ${audienceBadge(i.audience)}
      </div>
      <h3 style="margin-bottom:8px;">${i.title}</h3>
      <p style="color:var(--text-2); font-size:14px;">${i.description || ''}</p>
      <div style="margin-top:12px; display:flex; gap:6px; align-items:center; color:var(--info); font-weight:600; font-size:13px;">
        <span>פתחי</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M7 7h10v10"/></svg>
      </div>
    </a>
  `).join('');
}

function audienceBadge(a) {
  if (!a || a === 'all') return '<span class="badge info">לכולם</span>';
  const map = { teacher:'למורים', guide:'למדריכים', principal:'למנהלים' };
  return `<span class="badge info">${map[a] || a}</span>`;
}

async function submitItem(e) {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  const res = await TS.apiPost('knowledge.create', fd);
  if (res.ok) {
    TS.toast('נוסף בהצלחה');
    items.push(res.data);
    render();
    closeAddItem();
    e.target.reset();
  }
}

function openAddItem() {
  document.getElementById('modal-add').classList.add('open');
}
function closeAddItem() {
  document.getElementById('modal-add').classList.remove('open');
}
