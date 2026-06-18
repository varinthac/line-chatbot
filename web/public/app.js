const API = '/api';

let currentPage = 1;
let totalPages = 1;
let lastQuery = {};
let currentView = 'table';

const fileTypeIcon = { image: '🖼️', video: '🎬', audio: '🎵', file: '📄' };
const fileTypeLabel = { image: 'รูปภาพ', video: 'วิดีโอ', audio: 'เสียง', file: 'ไฟล์' };

function getQueryParams() {
  return {
    fileName: document.getElementById('q-name').value.trim() || undefined,
    fileType: document.getElementById('q-type').value || undefined,
    channelId: document.getElementById('q-channel').value || undefined,
    ocrText: document.getElementById('q-ocr').value.trim() || undefined,
    lineUserId: document.getElementById('q-user').value.trim() || undefined,
    dateFrom: document.getElementById('q-from').value || undefined,
    dateTo: document.getElementById('q-to').value || undefined,
    done: document.getElementById('q-done').value || undefined,
  };
}

async function loadChannels() {
  try {
    const res = await fetch(`${API}/channels`);
    const channels = await res.json();
    const sel = document.getElementById('q-channel');
    channels.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.channelId;
      opt.textContent = c.channelName || c.channelId;
      sel.appendChild(opt);
    });
  } catch {}
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

function buildQueryString(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function fetchFiles(page = 1) {
  const params = { ...lastQuery, page, limit: 20 };
  const qs = buildQueryString(params);

  document.getElementById('results-list').innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>`;
  document.getElementById('pagination').innerHTML = '';
  document.getElementById('results-summary').style.display = 'none';

  try {
    const res = await fetch(`${API}/files?${qs}`);
    const data = await res.json();
    renderResults(data);
  } catch (err) {
    document.getElementById('results-list').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p></div>`;
  }
}

function setView(view) {
  currentView = view;
  document.getElementById('btn-grid').classList.toggle('active', view === 'grid');
  document.getElementById('btn-table').classList.toggle('active', view === 'table');
  fetchFiles(currentPage);
}

function renderResults(data) {
  const { total, files, page, limit } = data;
  currentPage = page;
  totalPages = Math.ceil(total / limit);

  const summary = document.getElementById('results-summary');
  summary.style.display = 'flex';
  document.getElementById('results-count').textContent = `พบ ${total.toLocaleString()} ไฟล์`;

  const list = document.getElementById('results-list');
  if (!files.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>ไม่พบไฟล์ที่ตรงกับเงื่อนไข</p></div>`;
    return;
  }

  list.innerHTML = '';
  if (currentView === 'table') {
    list.appendChild(createTable(files));
  } else {
    const grid = document.createElement('div');
    grid.className = 'file-grid';
    files.forEach(f => grid.appendChild(createCard(f)));
    list.appendChild(grid);
  }

  renderPagination(totalPages, page);
}

function createTable(files) {
  const table = document.createElement('table');
  table.className = 'file-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>ภาพ</th>
        <th>ชื่อไฟล์</th>
        <th>ประเภท</th>
        <th>Channel</th>
        <th>วันที่ส่ง</th>
        <th>ผู้ส่ง</th>
        <th>ข้อความ OCR</th>
        <th>Done</th>
        <th>หมายเหตุ</th>
        <th></th>
      </tr>
    </thead>
    <tbody></tbody>`;
  const tbody = table.querySelector('tbody');
  files.forEach(f => tbody.appendChild(createRow(f)));
  return table;
}

function createRow(file) {
  const tr = document.createElement('tr');
  tr.onclick = () => openModal(file);

  const isImage = file.fileType === 'image';
  const thumb = isImage
    ? `<img src="${API}/files/${file.id}/preview" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'thumb-icon-sm\\'>🖼️</div>'" />`
    : `<div class="thumb-icon-sm">${fileTypeIcon[file.fileType] || '📄'}</div>`;

  const badgeClass = `badge-${file.fileType}`;
  const ocrSnippet = file.ocrText ? escHtml(file.ocrText.replace(/\n/g, ' ').substring(0, 60)) + (file.ocrText.length > 60 ? '…' : '') : '-';
  const channelLabel = escHtml(file.channelName || file.channelId || '-');

  tr.innerHTML = `
    <td class="td-thumb">${thumb}</td>
    <td class="td-name" title="${escHtml(file.fileName)}">${escHtml(file.fileName)}</td>
    <td class="td-type"><span class="badge ${badgeClass}">${file.fileType}</span></td>
    <td class="td-channel">${channelLabel}</td>
    <td class="td-date">${formatDate(file.sentAt)}</td>
    <td class="td-user">${escHtml(file.lineUserId)}</td>
    <td class="td-ocr" title="${escHtml(file.ocrText || '')}">${ocrSnippet}</td>
    <td class="td-done"></td>
    <td class="td-note"></td>
    <td class="td-action"><button class="btn-delete" title="ลบไฟล์" onclick="deleteFile(event,'${file.id}')">🗑️</button></td>`;

  const cbx = document.createElement('input');
  cbx.type = 'checkbox';
  cbx.className = 'done-check';
  cbx.checked = !!file.done;
  cbx.title = 'Done';
  cbx.addEventListener('click', e => e.stopPropagation());
  cbx.addEventListener('change', () => patchFile(file.id, { done: cbx.checked }));
  tr.querySelector('.td-done').appendChild(cbx);

  const noteInput = document.createElement('input');
  noteInput.type = 'text';
  noteInput.className = 'note-input';
  noteInput.value = file.note || '';
  noteInput.placeholder = 'หมายเหตุ...';
  noteInput.addEventListener('click', e => e.stopPropagation());
  noteInput.addEventListener('blur', () => patchFile(file.id, { note: noteInput.value }));
  noteInput.addEventListener('keydown', e => { if (e.key === 'Enter') noteInput.blur(); });
  tr.querySelector('.td-note').appendChild(noteInput);

  return tr;
}

function createCard(file) {
  const card = document.createElement('div');
  card.className = 'file-card';
  card.onclick = () => openModal(file);

  const isImage = file.fileType === 'image';
  const thumbContent = isImage
    ? `<img src="${API}/files/${file.id}/preview" alt="${escHtml(file.fileName)}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'thumb-icon\\'>🖼️</span>'" />`
    : `<span class="thumb-icon">${fileTypeIcon[file.fileType] || '📄'}</span>`;

  const ocrSnippet = file.ocrText
    ? `<div class="file-card-ocr">📝 ${escHtml(file.ocrText.substring(0, 80))}${file.ocrText.length > 80 ? '…' : ''}</div>`
    : '';

  card.innerHTML = `
    <div class="file-card-thumb">
      ${thumbContent}
      <span class="file-type-badge">${file.fileType}</span>
    </div>
    <div class="file-card-body">
      <div class="file-card-name" title="${escHtml(file.fileName)}">${escHtml(file.fileName)}</div>
      <div class="file-card-meta">
        <span>📅 ${formatDate(file.sentAt)}</span>
        <span>👤 ${escHtml(file.lineUserId)}</span>
      </div>
      ${ocrSnippet}
    </div>`;

  return card;
}

function renderPagination(total, current) {
  const container = document.getElementById('pagination');
  container.innerHTML = '';
  if (total <= 1) return;

  const pages = [];
  pages.push(1);
  for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) pages.push(i);
  if (total > 1) pages.push(total);

  const addBtn = (label, page, disabled = false, active = false) => {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (active ? ' active' : '');
    btn.textContent = label;
    btn.disabled = disabled;
    btn.onclick = () => { currentPage = page; fetchFiles(page); scrollTo(0, 0); };
    container.appendChild(btn);
  };

  addBtn('‹', current - 1, current === 1);
  let prev = 0;
  pages.forEach(p => {
    if (p - prev > 1) {
      const dots = document.createElement('span');
      dots.textContent = '…';
      dots.style.padding = '8px 4px';
      container.appendChild(dots);
    }
    addBtn(p, p, false, p === current);
    prev = p;
  });
  addBtn('›', current + 1, current === total);
}

// ---- Modal ----
function openModal(file) {
  document.getElementById('modal-title').textContent = file.fileName;
  document.getElementById('modal-meta').innerHTML = `
    <span>📂 ${fileTypeLabel[file.fileType] || file.fileType}</span>
    <span>📅 ${formatDate(file.sentAt)}</span>
    <span>👤 ${escHtml(file.lineUserId)}</span>
    ${file.mimeType ? `<span>🔎 ${escHtml(file.mimeType)}</span>` : ''}`;

  renderPreview(file);

  const ocrSection = document.getElementById('modal-ocr');
  if (file.ocrText && file.ocrText.trim()) {
    ocrSection.style.display = 'block';
    document.getElementById('modal-ocr-text').textContent = file.ocrText;
  } else {
    ocrSection.style.display = 'none';
  }

  document.getElementById('modal-download').href = `${API}/files/${file.id}/download`;
  document.getElementById('modal-download').download = file.fileName;

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function renderPreview(file) {
  const container = document.getElementById('modal-preview');
  const src = `${API}/files/${file.id}/preview`;

  if (file.fileType === 'image') {
    container.innerHTML = `<img src="${src}" alt="${escHtml(file.fileName)}" />`;
  } else if (file.fileType === 'video') {
    container.innerHTML = `<video controls src="${src}"></video>`;
  } else if (file.fileType === 'audio') {
    container.innerHTML = `<audio controls src="${src}" style="width:100%;padding:20px;"></audio>`;
  } else if (file.mimeType === 'application/pdf') {
    container.innerHTML = `<iframe src="${src}" title="${escHtml(file.fileName)}"></iframe>`;
  } else {
    container.innerHTML = `
      <div class="preview-unavailable">
        <div class="icon">${fileTypeIcon[file.fileType] || '📄'}</div>
        <p>ไม่สามารถพรีวิวไฟล์ประเภทนี้ได้<br>กรุณาดาวน์โหลดเพื่อเปิด</p>
      </div>`;
  }
}

function closeModalDirect() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  document.getElementById('modal-preview').innerHTML = '';
}

function closeModal(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModalDirect();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModalDirect();
});

// ---- Event Listeners ----
document.getElementById('btn-search').addEventListener('click', () => {
  lastQuery = getQueryParams();
  currentPage = 1;
  fetchFiles(1);
});

document.getElementById('btn-clear').addEventListener('click', () => {
  ['q-name', 'q-ocr', 'q-user', 'q-from', 'q-to'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('q-type').value = '';
  document.getElementById('q-channel').value = '';
  document.getElementById('q-done').value = '';
  lastQuery = {};
  currentPage = 1;
  fetchFiles(1);
});

['q-name', 'q-ocr', 'q-user', 'q-from', 'q-to'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-search').click();
  });
});

async function patchFile(id, data) {
  try {
    await fetch(`${API}/files/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {}
}

async function deleteFile(e, id) {
  e.stopPropagation();
  if (!confirm('ต้องการลบไฟล์นี้?')) return;
  try {
    const res = await fetch(`${API}/files/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    fetchFiles(currentPage);
  } catch {
    alert('ลบไม่สำเร็จ กรุณาลองใหม่');
  }
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// โหลดข้อมูลเริ่มต้น
loadChannels();
fetchFiles(1);
