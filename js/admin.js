/* ════════════════════════════════════════════════
   ADMIN LOGIC - admin.html
   ════════════════════════════════════════════════ */

// loadD() goes through STORE.get(), falling back to a fresh copy of
// DEFAULT if nothing's been saved yet (e.g. this is the very first load
// since the last refresh - see the STORE comment in shared-data.js).
function loadD(k) {
  const stored = STORE.get(k);
  return stored !== null ? stored : JSON.parse(JSON.stringify(DEFAULT[k]));
}

const state = {
  pass: STORE.get('pass') || DEFAULT.pass,
  projects: loadD('projects'),
  about: loadD('about'),
  skills: loadD('skills'),
  experience: loadD('experience'),
  contact: loadD('contact'),
  settings: loadD('settings')
};

// Writes the in-memory state out to localStorage so other open tabs (i.e.
// index.html on localhost) pick it up live via the 'storage' event. This
// is what makes the admin → portfolio live preview work. Refreshing any
// tab wipes it all again - see the STORE comment in shared-data.js.
function persist(k) {
  if (k === 'pass') return STORE.set('pass', state.pass);
  return STORE.set(k, state[k]);
}

// ═══════════════ MODAL OPEN/CLOSE ═══════════════
// ═══════════════ MODAL OPEN/CLOSE ═══════════════
// Dirty-state tracking: set to the modal ID whenever the user makes any
// change inside a modal. Cleared on save or intentional close.
let _dirtyModal = null;

function markDirty(modalId) { _dirtyModal = modalId; }
function clearDirty()       { _dirtyModal = null; }

function openM(id) {
  clearDirty();
  document.getElementById(id).classList.add('open');
  // start listening for any input change inside this modal
  const el = document.getElementById(id);
  el._dirtyHandler = () => markDirty(id);
  el.addEventListener('input',  el._dirtyHandler, true);
  el.addEventListener('change', el._dirtyHandler, true);
}

function closeM(id) {
  const el = document.getElementById(id);
  if (el._dirtyHandler) {
    el.removeEventListener('input',  el._dirtyHandler, true);
    el.removeEventListener('change', el._dirtyHandler, true);
    el._dirtyHandler = null;
  }
  clearDirty();
  el.classList.remove('open');
}

// Outside-click: warn if there are unsaved changes
document.querySelectorAll('.moverlay').forEach(el => el.addEventListener('click', e => {
  if (e.target !== el) return;
  if (_dirtyModal === el.id) {
    if (!confirm('You have unsaved changes. Close anyway?')) return;
  }
  closeM(el.id);
}));

// ═══════════════ AUTH ═══════════════
function doLogin() {
  if (document.getElementById('lpass').value === state.pass) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    initApp();
  } else {
    document.getElementById('lerr').style.display = 'block';
  }
}
document.getElementById('lpass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('login-btn').addEventListener('click', doLogin);

function doLogout() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('lpass').value = '';
  document.getElementById('lerr').style.display = 'none';
}
document.getElementById('logout-btn').addEventListener('click', doLogout);

// ═══════════════ NAV ═══════════════
function nav(page, el) {
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('page-' + page).classList.add('active');
  const mobileSelect = document.getElementById('mobile-page-select');
  if (mobileSelect) mobileSelect.value = page;
}
document.querySelectorAll('.sidebar-item[data-nav]').forEach(btn => {
  btn.addEventListener('click', () => nav(btn.dataset.nav, btn));
});
document.getElementById('mobile-page-select').addEventListener('change', e => {
  const matchingSidebarBtn = document.querySelector(`.sidebar-item[data-nav="${e.target.value}"]`);
  nav(e.target.value, matchingSidebarBtn);
});

// ═══════════════ RICH EDITOR ═══════════════
// Two bugs fixed here vs the original:
//
// 1. SELECTION LOSS: toolbar buttons live outside the contenteditable
//    region. A plain click on them fires `mousedown` first, which the
//    browser uses to start collapsing/moving the text selection - so by
//    the time `.focus()` + `execCommand()` ran in the old code, the user's
//    highlighted text was already gone, and the color/format applied to
//    the wrong place (felt like it "changes the style" globally instead of
//    the selected text). Fix: call `preventDefault()` on `mousedown` for
//    every toolbar control, which tells the browser not to touch the
//    current selection at all, so it's still exactly what the user
//    highlighted when `execCommand` runs on `click`.
//
// 2. NO VISIBLE "CURRENT COLOR": color dots had no active/selected state,
//    so there was no way to see what was applied. Fix: track the color at
//    the *current cursor position* (via `queryCommandValue('foreColor')`)
//    on every selection change, and reflect it as an active ring on the
//    matching dot + a text label.
const COLORS = ['#f0f0f0', '#7f77dd', '#4ade80', '#fbbf24', '#f87171', '#38bdf8', '#e879a0', '#fb923c', '#888'];

function buildToolbar(tbId, editorId) {
  const tb = document.getElementById(tbId);
  if (tb.children.length > 0) return;
  const editor = document.getElementById(editorId);

  const cmds = [
    ['<b>B</b>', 'bold'], ['<i>I</i>', 'italic'], ['<u>U</u>', 'underline'], ['<s>S</s>', 'strikeThrough'], null,
    ['H1', 'formatBlock', '<h2>'], ['H2', 'formatBlock', '<h3>'], ['¶', 'formatBlock', '<p>'], null,
    ['≡L', 'justifyLeft'], ['≡C', 'justifyCenter'], ['≡R', 'justifyRight'], null,
    ['• List', 'insertUnorderedList'], ['1. List', 'insertOrderedList'], null
  ];
  cmds.forEach(c => {
    if (!c) { const s = document.createElement('div'); s.className = 'rb-sep'; tb.appendChild(s); return; }
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rb'; b.innerHTML = c[0];
    // preventDefault on mousedown is the actual fix - keeps the live
    // selection intact through the click
    b.addEventListener('mousedown', e => e.preventDefault());
    b.addEventListener('click', () => { editor.focus(); document.execCommand(c[1], false, c[2] || null); markDirty(_dirtyModal); });
    tb.appendChild(b);
  });

  // ── color dots, now with an active indicator ──
  const sep = document.createElement('div'); sep.className = 'rb-sep'; tb.appendChild(sep);
  const colorLabel = document.createElement('span');
  colorLabel.className = 'rb-current-label';
  colorLabel.textContent = '';
  const dots = [];
  COLORS.forEach(col => {
    const d = document.createElement('div');
    d.className = 'rb-color'; d.style.background = col; d.title = col; d.dataset.col = col.toLowerCase();
    d.addEventListener('mousedown', e => e.preventDefault());
    d.addEventListener('click', () => {
      editor.focus();
      document.execCommand('foreColor', false, col);
      updateActiveColorDot(dots, colorLabel, col);
    });
    dots.push(d);
    tb.appendChild(d);
  });
  tb.appendChild(colorLabel);

  // reflect the color under the cursor as the selection moves, so the
  // toolbar always shows "what color is this text", not just "what did I
  // last click"
  editor.addEventListener('keyup', () => syncColorIndicator(editor, dots, colorLabel));
  editor.addEventListener('mouseup', () => syncColorIndicator(editor, dots, colorLabel));
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === editor) syncColorIndicator(editor, dots, colorLabel);
  });

  // ── font size ──
  const sep2 = document.createElement('div'); sep2.className = 'rb-sep'; tb.appendChild(sep2);
  [['S', '2'], ['M', '3'], ['L', '4'], ['XL', '5']].forEach(([lbl, sz]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rb'; b.textContent = lbl;
    b.addEventListener('mousedown', e => e.preventDefault());
    b.addEventListener('click', () => { editor.focus(); document.execCommand('fontSize', false, sz); });
    tb.appendChild(b);
  });
}

function rgbToHex(rgb) {
  const m = rgb.match(/\d+/g);
  if (!m) return null;
  return '#' + m.slice(0, 3).map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('');
}

function updateActiveColorDot(dots, label, hexColor) {
  dots.forEach(d => d.classList.toggle('active', d.dataset.col === hexColor.toLowerCase()));
  label.textContent = hexColor.toLowerCase();
}

function syncColorIndicator(editor, dots, label) {
  try {
    let val = document.queryCommandValue('foreColor');
    if (!val) { dots.forEach(d => d.classList.remove('active')); label.textContent = ''; return; }
    const hex = val.startsWith('rgb') ? rgbToHex(val) : val;
    if (!hex) { dots.forEach(d => d.classList.remove('active')); label.textContent = ''; return; }
    updateActiveColorDot(dots, label, hex);
  } catch {
    // queryCommandValue can throw in some edge cases (e.g. editor not
    // focused yet) - fail quietly, indicator just stays as-is
  }
}

function initRich(tbId, editorId) { buildToolbar(tbId, editorId); }

// ═══════════════ SWATCH COLOR PICKERS (project accent, etc.) ═══════════════
// Fix vs original: selecting a swatch now also updates a visible
// "currently selected" chip (dot + hex text) next to the row, so there's
// always a clear answer to "what color is picked right now" - not just a
// thin white outline that's easy to miss, especially for similar colors.
function pickColor(el, hiddenId) {
  const c = el.dataset.c;
  document.getElementById(hiddenId).value = c;
  document.getElementById(hiddenId + '-picker').value = c;
  const row = el.closest('.color-row');
  row.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  updateColorCurrentChip(row, c);
}
function syncColorPicker(hiddenId, val) {
  document.getElementById(hiddenId).value = val;
  const row = document.getElementById(hiddenId + '-picker').closest('.color-row');
  row.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  updateColorCurrentChip(row, val);
}
function updateColorCurrentChip(row, val) {
  let chip = row.querySelector('.color-current');
  if (!chip) {
    chip = document.createElement('div');
    chip.className = 'color-current';
    chip.innerHTML = `<span class="color-current-dot"></span><span class="color-current-val"></span>`;
    row.appendChild(chip);
  }
  chip.querySelector('.color-current-dot').style.background = val;
  chip.querySelector('.color-current-val').textContent = val;
}

// ═══════════════ PROJECT ICON: emoji vs uploaded image ═══════════════
let pmIconType = 'emoji';
let pmIconImg = '';

function setIconMode(mode) {
  pmIconType = mode;
  document.getElementById('pm-icon-mode-emoji').classList.toggle('active', mode === 'emoji');
  document.getElementById('pm-icon-mode-image').classList.toggle('active', mode === 'image');
  document.getElementById('pm-icon-emoji-row').style.display = mode === 'emoji' ? 'block' : 'none';
  document.getElementById('pm-icon-image-row').style.display = mode === 'image' ? 'flex' : 'none';
}

function handleIconUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Please choose an image file'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    pmIconImg = ev.target.result;
    renderIconPreview();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function removeIconImage() {
  pmIconImg = '';
  renderIconPreview();
}

function renderIconPreview() {
  const preview = document.getElementById('pm-icon-preview');
  const removeBtn = document.getElementById('pm-icon-remove-btn');
  if (pmIconImg) {
    preview.innerHTML = `<img src="${pmIconImg}" alt="">`;
    removeBtn.style.display = 'inline-flex';
  } else {
    preview.innerHTML = `<span class="icon-preview-placeholder">No<br>image</span>`;
    removeBtn.style.display = 'none';
  }
}

// ═══════════════ IMAGE UPLOAD + DRAG REORDER (screenshots) ═══════════════
let pmImages = [];
let dragSrc = null;

function handleImgUpload(e) {
  const files = Array.from(e.target.files).slice(0, 8 - pmImages.length);
  let done = 0;
  if (!files.length) return;
  files.forEach(f => {
    const r = new FileReader();
    r.onload = ev => { pmImages.push(ev.target.result); done++; if (done === files.length) renderImgGrid(); };
    r.readAsDataURL(f);
  });
  e.target.value = '';
}

function renderImgGrid() {
  const grid = document.getElementById('pm-img-grid');
  const hint = document.getElementById('pm-drag-hint');
  if (!pmImages.length) { grid.innerHTML = ''; hint.style.display = 'none'; return; }
  hint.style.display = pmImages.length > 1 ? 'block' : 'none';
  grid.innerHTML = pmImages.map((src, i) => `
    <div class="img-thumb" draggable="true" data-i="${i}">
      <img src="${src}" alt="">
      <div class="img-thumb-overlay">
        <button type="button" class="img-thumb-btn del" data-removeidx="${i}">✕ Remove</button>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.img-thumb').forEach(thumb => {
    const i = parseInt(thumb.dataset.i, 10);
    thumb.addEventListener('dragstart', e => { dragSrc = i; setTimeout(() => thumb.classList.add('dragging'), 0); });
    thumb.addEventListener('dragover', e => { e.preventDefault(); thumb.classList.add('drag-over'); });
    thumb.addEventListener('dragleave', () => thumb.classList.remove('drag-over'));
    thumb.addEventListener('drop', e => {
      e.preventDefault();
      thumb.classList.remove('drag-over');
      document.querySelectorAll('.img-thumb').forEach(t => t.classList.remove('dragging'));
      if (dragSrc === null || dragSrc === i) return;
      const moved = pmImages.splice(dragSrc, 1)[0];
      pmImages.splice(i, 0, moved);
      dragSrc = null;
      renderImgGrid();
    });
  });
  grid.querySelectorAll('[data-removeidx]').forEach(btn => {
    btn.addEventListener('click', () => { pmImages.splice(parseInt(btn.dataset.removeidx, 10), 1); renderImgGrid(); });
  });
}

const pmDropZone = document.getElementById('pm-drop');
pmDropZone.addEventListener('dragover', e => { e.preventDefault(); pmDropZone.classList.add('dragover'); });
pmDropZone.addEventListener('dragleave', () => pmDropZone.classList.remove('dragover'));
pmDropZone.addEventListener('drop', e => {
  e.preventDefault(); pmDropZone.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).slice(0, 8 - pmImages.length);
  files.forEach(f => { const r = new FileReader(); r.onload = ev => { pmImages.push(ev.target.result); renderImgGrid(); }; r.readAsDataURL(f); });
});

// ═══════════════ PROJECTS ═══════════════
function renderProjList() {
  const el = document.getElementById('proj-list');
  if (!state.projects.length) { el.innerHTML = '<p style="font-size:13px;color:var(--muted);font-family:var(--mono)">No projects yet.</p>'; return; }
  el.innerHTML = state.projects.map((p, i) => `
    <div class="list-item">
      <div style="width:28px;height:28px;border-radius:6px;background:${p.accentColor || 'var(--accent)'}22;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;overflow:hidden">${renderIconMarkup(p, '💻')}</div>
      <div class="list-main">
        <div class="list-name">${esc(p.name)}</div>
        <div class="list-sub">${esc(p.langs || '')} · ${p.status === 'complete' ? 'Complete' : 'In Progress'} · ${(p.images || []).length} image(s)${p.tags ? ' · 🏷 ' + esc(p.tags) : ''}</div>
      </div>
      <div class="list-actions">
        <button type="button" class="ib ib-edit" data-editidx="${i}">Edit</button>
        <button type="button" class="ib ib-del" data-delidx="${i}">Del</button>
      </div>
    </div>`).join('');
  el.querySelectorAll('[data-editidx]').forEach(b => b.addEventListener('click', () => openProjModal(parseInt(b.dataset.editidx, 10))));
  el.querySelectorAll('[data-delidx]').forEach(b => b.addEventListener('click', () => delItem('projects', parseInt(b.dataset.delidx, 10))));
}

function openProjModal(i) {
  initRich('pm-tb', 'pm-body');
  const isNew = i === null;
  document.getElementById('pm-title').textContent = isNew ? 'Add Project' : 'Edit Project';
  document.getElementById('pm-idx').value = isNew ? -1 : i;
  pmImages = [];
  pmIconImg = '';

  if (isNew) {
    document.getElementById('pm-name').value = '';
    document.getElementById('pm-icon').value = '💻';
    document.getElementById('pm-color').value = '#7f77dd';
    document.getElementById('pm-color-picker').value = '#7f77dd';
    document.getElementById('pm-short').value = '';
    document.getElementById('pm-body').innerHTML = '';
    document.getElementById('pm-langs').value = '';
    document.getElementById('pm-tags').value = '';
    document.getElementById('pm-status').value = 'complete';
    document.getElementById('pm-link').value = '';
    document.querySelectorAll('#pm .color-swatch').forEach((s, idx) => s.classList.toggle('selected', idx === 0));
    updateColorCurrentChip(document.querySelector('#pm .color-row'), '#7f77dd');
    setIconMode('emoji');
  } else {
    const p = state.projects[i];
    document.getElementById('pm-name').value = p.name || '';
    document.getElementById('pm-icon').value = p.icon || '💻';
    const ac = p.accentColor || '#7f77dd';
    document.getElementById('pm-color').value = ac;
    document.getElementById('pm-color-picker').value = ac;
    document.getElementById('pm-short').value = p.shortDesc || '';
    document.getElementById('pm-body').innerHTML = p.fullDesc || '';
    document.getElementById('pm-langs').value = p.langs || '';
    document.getElementById('pm-tags').value = p.tags || '';
    document.getElementById('pm-status').value = p.status || 'complete';
    document.getElementById('pm-link').value = p.link || '';
    pmImages = [...(p.images || [])];
    document.querySelectorAll('#pm .color-swatch').forEach(s => s.classList.toggle('selected', s.dataset.c === ac));
    updateColorCurrentChip(document.querySelector('#pm .color-row'), ac);
    pmIconImg = p.iconType === 'image' ? (p.iconImg || '') : '';
    setIconMode(p.iconType === 'image' ? 'image' : 'emoji');
  }
  renderIconPreview();
  renderImgGrid();
  renderTabsEditor(isNew ? [] : (state.projects[i]?.tabs || []));
  openM('pm');
}

function saveProject() {
  const idx = parseInt(document.getElementById('pm-idx').value, 10);
  const fullDesc = document.getElementById('pm-body').innerHTML.trim();

  if (pmIconType === 'image' && !pmIconImg) {
    // user switched to image mode but never actually uploaded one,
    // fall back to emoji rather than saving a project with no visible icon
    showToast('No icon image uploaded - using emoji instead');
    pmIconType = 'emoji';
  }

  const proj = {
    name: document.getElementById('pm-name').value || 'Untitled',
    icon: document.getElementById('pm-icon').value || '💻',
    iconType: pmIconType,
    iconImg: pmIconType === 'image' ? pmIconImg : '',
    accentColor: document.getElementById('pm-color').value || '#7f77dd',
    shortDesc: document.getElementById('pm-short').value || '',
    fullDesc: fullDesc,
    langs: document.getElementById('pm-langs').value || '',
    tags: document.getElementById('pm-tags').value || '',
    status: document.getElementById('pm-status').value,
    link: document.getElementById('pm-link').value || '',
    images: [...pmImages],
    tabs: collectTabs()
  };
  if (idx === -1) state.projects.push(proj); else state.projects[idx] = proj;
  const ok = persist('projects');
  renderProjList(); closeM('pm');
  if (ok === false) showToast('⚠ Save may have failed - storage full (try fewer/smaller images)');
  else showToast('✓ Project saved');
}

// ═══════════════ ABOUT ═══════════════
function renderAboutList() {
  const el = document.getElementById('about-list');
  el.innerHTML = state.about.map((c, i) => `
    <div class="list-item">
      <div class="list-main">
        <div class="list-name">${esc(c.label)}</div>
        <div class="list-sub">${c.width === 'full' ? 'Full width' : 'Half width'}</div>
      </div>
      <div class="list-actions">
        <button type="button" class="ib ib-edit" data-editidx="${i}">Edit</button>
        <button type="button" class="ib ib-del" data-delidx="${i}">Del</button>
      </div>
    </div>`).join('');
  el.querySelectorAll('[data-editidx]').forEach(b => b.addEventListener('click', () => openAboutModal(parseInt(b.dataset.editidx, 10))));
  el.querySelectorAll('[data-delidx]').forEach(b => b.addEventListener('click', () => delItem('about', parseInt(b.dataset.delidx, 10))));
}

function openAboutModal(i) {
  initRich('am-tb', 'am-body');
  const isNew = i === null;
  document.getElementById('am-title').textContent = isNew ? 'Add Card' : 'Edit Card';
  document.getElementById('am-idx').value = isNew ? -1 : i;
  if (isNew) {
    document.getElementById('am-label').value = '';
    document.getElementById('am-body').innerHTML = '';
    document.getElementById('am-width').value = 'normal';
  } else {
    const c = state.about[i];
    document.getElementById('am-label').value = c.label;
    document.getElementById('am-body').innerHTML = c.content;
    document.getElementById('am-width').value = c.width || 'normal';
  }
  openM('am');
}

function saveAbout() {
  const idx = parseInt(document.getElementById('am-idx').value, 10);
  const card = { label: document.getElementById('am-label').value || 'Card', content: document.getElementById('am-body').innerHTML, width: document.getElementById('am-width').value };
  if (idx === -1) state.about.push(card); else state.about[idx] = card;
  persist('about'); renderAboutList(); closeM('am'); showToast('✓ Card saved');
}

// ═══════════════ SKILLS ═══════════════
function renderSkillsList() {
  const el = document.getElementById('skills-list');
  el.innerHTML = state.skills.map((g, i) => `
    <div class="list-item">
      <div class="list-main">
        <div class="list-name">${esc(g.title)}</div>
        <div class="list-sub">${g.skills.map(s => esc(s.name)).join(', ')}</div>
      </div>
      <div class="list-actions">
        <button type="button" class="ib ib-edit" data-editidx="${i}">Edit</button>
        <button type="button" class="ib ib-del" data-delidx="${i}">Del</button>
      </div>
    </div>`).join('');
  el.querySelectorAll('[data-editidx]').forEach(b => b.addEventListener('click', () => openSGModal(parseInt(b.dataset.editidx, 10))));
  el.querySelectorAll('[data-delidx]').forEach(b => b.addEventListener('click', () => delItem('skills', parseInt(b.dataset.delidx, 10))));
}

function openSGModal(i) {
  const isNew = i === null;
  document.getElementById('sgm-title').textContent = isNew ? 'Add Skill Group' : 'Edit Skill Group';
  document.getElementById('sgm-idx').value = isNew ? -1 : i;
  document.getElementById('sgm-title-input').value = isNew ? '' : (state.skills[i]?.title || '');
  const rows = document.getElementById('sgm-rows');
  rows.innerHTML = '';
  const skills = isNew ? [{ name: '', level: 80, color: '#7f77dd' }] : (state.skills[i]?.skills || [{ name: '', level: 80, color: '#7f77dd' }]);
  skills.forEach(s => addSGRow(s));
  openM('sgm');
}

function addSGRow(s) {
  const s2 = s || { name: '', level: 80, color: '#7f77dd' };
  const div = document.createElement('div'); div.className = 'sg-skill-row';

  const nameInput = document.createElement('input');
  nameInput.type = 'text'; nameInput.placeholder = 'Skill name'; nameInput.value = s2.name;

  const levelInput = document.createElement('input');
  levelInput.type = 'number'; levelInput.min = '0'; levelInput.max = '100'; levelInput.value = s2.level || 80; levelInput.style.width = '65px';

  const colorInput = document.createElement('input');
  colorInput.type = 'color'; colorInput.value = s2.color || '#7f77dd';
  colorInput.style.cssText = 'width:34px;height:30px;padding:1px 2px;border-radius:4px';

  const preview = document.createElement('div'); preview.className = 'sg-level-preview';
  const fill = document.createElement('div'); fill.className = 'sg-level-fill';
  fill.style.width = (s2.level || 80) + '%'; fill.style.background = s2.color || '#7f77dd';
  preview.appendChild(fill);

  const delBtn = document.createElement('button');
  delBtn.type = 'button'; delBtn.className = 'ib ib-del'; delBtn.style.padding = '4px 8px'; delBtn.textContent = '✕';
  delBtn.addEventListener('click', () => div.remove());

  levelInput.addEventListener('input', () => { fill.style.width = Math.min(100, Math.max(0, parseInt(levelInput.value, 10) || 0)) + '%'; });
  colorInput.addEventListener('input', () => { fill.style.background = colorInput.value; });

  div.appendChild(nameInput); div.appendChild(levelInput); div.appendChild(colorInput); div.appendChild(preview); div.appendChild(delBtn);
  document.getElementById('sgm-rows').appendChild(div);
}

document.getElementById('sgm-add-row-btn').addEventListener('click', () => addSGRow());

function saveSG() {
  const idx = parseInt(document.getElementById('sgm-idx').value, 10);
  const rows = Array.from(document.getElementById('sgm-rows').querySelectorAll('.sg-skill-row'));
  const skills = rows.map(r => {
    const ins = r.querySelectorAll('input');
    return { name: ins[0].value.trim(), level: Math.min(100, Math.max(0, parseInt(ins[1].value, 10) || 0)), color: ins[2].value };
  }).filter(s => s.name);
  const group = { title: document.getElementById('sgm-title-input').value || 'Skills', skills };
  if (idx === -1) state.skills.push(group); else state.skills[idx] = group;
  persist('skills'); renderSkillsList(); closeM('sgm'); showToast('✓ Skill group saved');
}

// ═══════════════ EXPERIENCE ═══════════════
function renderExpList() {
  const el = document.getElementById('exp-list');
  el.innerHTML = state.experience.map((e, i) => `
    <div class="list-item">
      <div class="list-main">
        <div class="list-name">${esc(e.company)}</div>
        <div class="list-sub">${esc(e.role)} · ${esc(e.years)}</div>
      </div>
      <div class="list-actions">
        <button type="button" class="ib ib-edit" data-editidx="${i}">Edit</button>
        <button type="button" class="ib ib-del" data-delidx="${i}">Del</button>
      </div>
    </div>`).join('');
  el.querySelectorAll('[data-editidx]').forEach(b => b.addEventListener('click', () => openExpModal(parseInt(b.dataset.editidx, 10))));
  el.querySelectorAll('[data-delidx]').forEach(b => b.addEventListener('click', () => delItem('experience', parseInt(b.dataset.delidx, 10))));
}

function openExpModal(i) {
  const isNew = i === null;
  document.getElementById('expm-title').textContent = isNew ? 'Add Work Entry' : 'Edit Work Entry';
  document.getElementById('expm-idx').value = isNew ? -1 : i;
  if (isNew) { ['expm-company', 'expm-years', 'expm-role', 'expm-desc', 'expm-tags'].forEach(id => document.getElementById(id).value = ''); }
  else {
    const e = state.experience[i];
    document.getElementById('expm-company').value = e.company;
    document.getElementById('expm-years').value = e.years;
    document.getElementById('expm-role').value = e.role;
    document.getElementById('expm-desc').value = e.desc;
    document.getElementById('expm-tags').value = e.tags || '';
  }
  openM('expm');
}

function saveExp() {
  const idx = parseInt(document.getElementById('expm-idx').value, 10);
  const entry = {
    company: document.getElementById('expm-company').value || 'Company',
    years: document.getElementById('expm-years').value || '',
    role: document.getElementById('expm-role').value || '',
    desc: document.getElementById('expm-desc').value || '',
    tags: document.getElementById('expm-tags').value || ''
  };
  if (idx === -1) state.experience.push(entry); else state.experience[idx] = entry;
  persist('experience'); renderExpList(); closeM('expm'); showToast('✓ Work entry saved');
}

// ═══════════════ CONTACT ═══════════════
function renderContactList() {
  const el = document.getElementById('contact-list');
  el.innerHTML = state.contact.map((c, i) => `
    <div class="list-item">
      <div style="font-size:20px;width:28px;text-align:center;flex-shrink:0">${esc(c.icon || '🔗')}</div>
      <div class="list-main">
        <div class="list-name">${esc(c.label)}</div>
        <div class="list-sub">${esc(c.value)}</div>
      </div>
      <div class="list-actions">
        <button type="button" class="ib ib-edit" data-editidx="${i}">Edit</button>
        <button type="button" class="ib ib-del" data-delidx="${i}">Del</button>
      </div>
    </div>`).join('');
  el.querySelectorAll('[data-editidx]').forEach(b => b.addEventListener('click', () => openCtModal(parseInt(b.dataset.editidx, 10))));
  el.querySelectorAll('[data-delidx]').forEach(b => b.addEventListener('click', () => delItem('contact', parseInt(b.dataset.delidx, 10))));
}

function openCtModal(i) {
  const isNew = i === null;
  document.getElementById('ctm-title').textContent = isNew ? 'Add Link' : 'Edit Link';
  document.getElementById('ctm-idx').value = isNew ? -1 : i;
  if (isNew) { ['ctm-label', 'ctm-value', 'ctm-icon'].forEach(id => document.getElementById(id).value = ''); }
  else {
    const c = state.contact[i];
    document.getElementById('ctm-label').value = c.label;
    document.getElementById('ctm-value').value = c.value;
    document.getElementById('ctm-icon').value = c.icon || '';
  }
  openM('ctm');
}

function saveContact() {
  const idx = parseInt(document.getElementById('ctm-idx').value, 10);
  // No escaping tightrope here on purpose: this is stored as plain data and
  // rendered later via esc() / addEventListener wiring on the portfolio
  // side - never concatenated into an onclick string. That's *why* last
  // time a quote or apostrophe in one of these fields broke the entire
  // page: this value used to get spliced directly into an inline onclick=""
  // attribute. Any character is safe to type here now.
  const link = {
    label: document.getElementById('ctm-label').value || 'Link',
    value: document.getElementById('ctm-value').value || '',
    icon: document.getElementById('ctm-icon').value || '🔗'
  };
  if (idx === -1) state.contact.push(link); else state.contact[idx] = link;
  persist('contact'); renderContactList(); closeM('ctm'); showToast('✓ Link saved');
}

// ═══════════════ DELETE ═══════════════
const RENDER_FNS = { projects: renderProjList, about: renderAboutList, skills: renderSkillsList, experience: renderExpList, contact: renderContactList };
function delItem(key, i) {
  const labels = { projects: 'project', about: 'card', skills: 'skill group', experience: 'entry', contact: 'link' };
  if (!confirm(`Delete this ${labels[key]}?`)) return;
  state[key].splice(i, 1); persist(key);
  RENDER_FNS[key]();
  showToast('Deleted');
}

// ═══════════════ PROJECT TABS EDITOR ═══════════════
// Per-tab image uploads (separate from screenshots)
let tabImgData = {}; // keyed by tab row index during editing

function renderTabsEditor(tabs) {
  let wrap = document.getElementById('pm-tabs-wrap');
  if (!wrap) return; // guard - HTML element may not exist yet
  tabImgData = {};
  wrap.innerHTML = '';
  (tabs || []).forEach((tab, i) => {
    tabImgData[i] = [...(tab.images || [])];
    wrap.appendChild(buildTabRow(tab, i));
  });
}

function buildTabRow(tab, i) {
  tabImgData[i] = tabImgData[i] || [...(tab?.images || [])];
  const card = document.createElement('div');
  card.className = 'tab-editor-card';
  card.dataset.tabidx = i;

  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;align-items:center;gap:.6rem;margin-bottom:.75rem';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'tab-title-input';
  titleInput.placeholder = 'System / tab name (e.g. Rendering Pipeline)';
  titleInput.value = tab?.title || '';
  titleInput.style.flex = '1';

  const delBtn = document.createElement('button');
  delBtn.type = 'button'; delBtn.className = 'ib ib-del'; delBtn.textContent = '✕ Remove tab';
  delBtn.style.flexShrink = '0';
  delBtn.addEventListener('click', () => {
    card.remove();
    reindexTabCards();
  });

  topRow.appendChild(titleInput);
  topRow.appendChild(delBtn);

  const descLabel = document.createElement('div');
  descLabel.style.cssText = 'font-family:var(--mono);font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:.3rem';
  descLabel.textContent = 'Description';

  const descArea = document.createElement('textarea');
  descArea.className = 'fta tab-desc-input';
  descArea.placeholder = 'Brief description of this system or feature...';
  descArea.value = tab?.desc || '';
  descArea.style.cssText = 'min-height:80px;margin-bottom:.75rem';

  const videoLabel = document.createElement('div');
  videoLabel.style.cssText = 'font-family:var(--mono);font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:.3rem';
  videoLabel.textContent = 'Video link (optional)';

  const videoInput = document.createElement('input');
  videoInput.type = 'url';
  videoInput.className = 'tab-video-input';
  videoInput.placeholder = 'https://youtu.be/... - shows a "Watch Video" button on the live tab';
  videoInput.value = tab?.videoUrl || '';
  videoInput.style.cssText = 'margin-bottom:.75rem;width:100%';

  const imgLabel = document.createElement('div');
  imgLabel.style.cssText = 'font-family:var(--mono);font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:.3rem';
  imgLabel.textContent = 'Images (optional)';

  const dropZone = document.createElement('div');
  dropZone.className = 'img-drop-zone';
  dropZone.style.cssText = 'padding:.75rem;margin-bottom:.5rem';
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.multiple = true;
  fileInput.addEventListener('change', e => {
    const files = Array.from(e.target.files).slice(0, 4 - (tabImgData[i] || []).length);
    files.forEach(f => {
      const r = new FileReader();
      r.onload = ev => { tabImgData[i] = tabImgData[i] || []; tabImgData[i].push(ev.target.result); renderTabImgGrid(thumbGrid, i); };
      r.readAsDataURL(f);
    });
    e.target.value = '';
  });
  const dropLabel = document.createElement('div');
  dropLabel.className = 'img-drop-label';
  dropLabel.innerHTML = 'Click or drag images · <span>Browse</span> · Max 4';
  dropZone.appendChild(fileInput); dropZone.appendChild(dropLabel);

  const thumbGrid = document.createElement('div');
  thumbGrid.className = 'img-grid';
  thumbGrid.style.cssText = 'grid-template-columns:repeat(auto-fill,minmax(90px,1fr))';
  renderTabImgGrid(thumbGrid, i);

  card.appendChild(topRow);
  card.appendChild(descLabel);
  card.appendChild(descArea);
  card.appendChild(videoLabel);
  card.appendChild(videoInput);
  card.appendChild(imgLabel);
  card.appendChild(dropZone);
  card.appendChild(thumbGrid);
  return card;
}

function renderTabImgGrid(grid, tabIdx) {
  const imgs = tabImgData[tabIdx] || [];
  grid.innerHTML = imgs.map((src, j) => `
    <div class="img-thumb" style="aspect-ratio:16/9" data-rmtab="${tabIdx}" data-rmimg="${j}">
      <img src="${src}" alt="">
      <div class="img-thumb-overlay">
        <button type="button" class="img-thumb-btn del" data-rmtab="${tabIdx}" data-rmimg="${j}">✕</button>
      </div>
    </div>`).join('');
  grid.querySelectorAll('[data-rmimg]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ti = parseInt(btn.dataset.rmtab, 10);
      const ii = parseInt(btn.dataset.rmimg, 10);
      tabImgData[ti].splice(ii, 1);
      renderTabImgGrid(grid, ti);
    });
  });
}

function reindexTabCards() {
  const wrap = document.getElementById('pm-tabs-wrap');
  if (!wrap) return;
  const newTabImgData = {};
  Array.from(wrap.querySelectorAll('.tab-editor-card')).forEach((card, newI) => {
    const oldI = parseInt(card.dataset.tabidx, 10);
    newTabImgData[newI] = tabImgData[oldI] || [];
    card.dataset.tabidx = newI;
  });
  tabImgData = newTabImgData;
}

function collectTabs() {
  const wrap = document.getElementById('pm-tabs-wrap');
  if (!wrap) return [];
  return Array.from(wrap.querySelectorAll('.tab-editor-card')).map((card, i) => ({
    title: (card.querySelector('.tab-title-input')?.value || '').trim(),
    desc: (card.querySelector('.tab-desc-input')?.value || '').trim(),
    videoUrl: (card.querySelector('.tab-video-input')?.value || '').trim(),
    images: [...(tabImgData[i] || [])]
  })).filter(t => t.title);
}

// ═══════════════ INTERACTIVE ELEMENTS (settings) ═══════════════
// New: a dashboard-controlled toggle for the terminal/typing widget, plus a
// small editor for its title and the lines it types out. Built generically
// enough (an `elcard` pattern) that another interactive element could be
// added later by following the same shape: a toggle + a config block.
function renderInteractiveElements() {
  const s = state.settings || {};

  // terminal
  const termEnabled = !!(s.terminalEnabled);
  document.getElementById('term-toggle-input').checked = termEnabled;
  document.getElementById('term-config').classList.toggle('show', termEnabled);
  document.getElementById('term-title-input').value = s.terminalTitle || DEFAULT.settings.terminalTitle;
  renderTermLineRows();

  // cursor
  const ct = document.getElementById('cursor-toggle-input');
  if (ct) ct.checked = !!(s.cursorEffect);

  // lockdown
  const lt = document.getElementById('lock-toggle-input');
  const lm = document.getElementById('lock-msg-input');
  const lockEnabled = !!(s.lockdown);
  if (lt) lt.checked = lockEnabled;
  if (lm) lm.value = s.lockdownMsg || DEFAULT.settings.lockdownMsg;
  const lockConfig = document.getElementById('lock-config');
  if (lockConfig) lockConfig.classList.toggle('show', lockEnabled);

  // new toggles
  const set = (id, key) => { const el = document.getElementById(id); if (el) el.checked = s[key] !== false; };
  set('scroll-reveal-toggle', 'scrollReveal');
  set('hero-reveal-toggle',   'heroReveal');
  set('progress-toggle',      'progressBar');
  set('card-preview-toggle',  'cardImagePreview');
  set('konami-toggle',        'konamiEnabled');

  // status badge - explicit on/off toggle, separate from the text content
  const statusEnabled = s.statusBadgeEnabled !== false;
  const sbt = document.getElementById('status-badge-toggle');
  if (sbt) sbt.checked = statusEnabled;
  const statusConfig = document.getElementById('status-badge-config');
  if (statusConfig) statusConfig.classList.toggle('show', statusEnabled);
  const cb = document.getElementById('currently-building-input');
  if (cb) cb.value = s.currentlyBuilding || '';
}

function renderTermLineRows() {
  const wrap = document.getElementById('term-lines-rows');
  wrap.innerHTML = '';
  const lines = (state.settings && state.settings.terminalLines && state.settings.terminalLines.length)
    ? state.settings.terminalLines
    : JSON.parse(JSON.stringify(DEFAULT.settings.terminalLines));
  lines.forEach(line => addTermLineRow(line));
}

function addTermLineRow(line) {
  const l = line || { type: 'cmd', text: '' };
  const row = document.createElement('div'); row.className = 'term-line-row';

  const typeSelect = document.createElement('select');
  [['cmd', 'Command'], ['out', 'Output'], ['comment', 'Comment']].forEach(([val, label]) => {
    const opt = document.createElement('option'); opt.value = val; opt.textContent = label;
    if (val === l.type) opt.selected = true;
    typeSelect.appendChild(opt);
  });

  const textInput = document.createElement('input');
  textInput.type = 'text'; textInput.value = l.text || '';
  textInput.placeholder = l.type === 'cmd' ? 'e.g. whoami' : 'e.g. Samo_VR - Software Developer';

  const delBtn = document.createElement('button');
  delBtn.type = 'button'; delBtn.className = 'ib ib-del'; delBtn.textContent = '✕';
  delBtn.addEventListener('click', () => row.remove());

  row.appendChild(typeSelect); row.appendChild(textInput); row.appendChild(delBtn);
  document.getElementById('term-lines-rows').appendChild(row);
}

function saveInteractiveElements() {
  const s = state.settings = state.settings || {};

  // terminal
  s.terminalEnabled = document.getElementById('term-toggle-input').checked;
  s.terminalTitle   = document.getElementById('term-title-input').value || DEFAULT.settings.terminalTitle;
  const rows = Array.from(document.getElementById('term-lines-rows').querySelectorAll('.term-line-row'));
  const lines = rows.map(r => {
    const sel = r.querySelector('select'), inp = r.querySelector('input');
    return { type: sel.value, text: inp.value };
  }).filter(l => l.text.trim());
  s.terminalLines = lines.length ? lines : JSON.parse(JSON.stringify(DEFAULT.settings.terminalLines));

  // cursor + lockdown
  const get = id => { const el = document.getElementById(id); return el ? el.checked : false; };
  const val = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  s.cursorEffect    = get('cursor-toggle-input');
  s.lockdown        = get('lock-toggle-input');
  s.lockdownMsg     = val('lock-msg-input') || DEFAULT.settings.lockdownMsg;

  // new features
  s.scrollReveal    = get('scroll-reveal-toggle');
  s.heroReveal      = get('hero-reveal-toggle');
  s.progressBar     = get('progress-toggle');
  s.cardImagePreview= get('card-preview-toggle');
  s.konamiEnabled   = get('konami-toggle');
  s.statusBadgeEnabled = get('status-badge-toggle');
  s.currentlyBuilding = val('currently-building-input');

  persist('settings');
  showToast('✓ Settings saved');
}

document.getElementById('term-toggle-input').addEventListener('change', e => {
  document.getElementById('term-config').classList.toggle('show', e.target.checked);
});
document.getElementById('status-badge-toggle').addEventListener('change', e => {
  document.getElementById('status-badge-config').classList.toggle('show', e.target.checked);
});
document.getElementById('lock-toggle-input').addEventListener('change', e => {
  document.getElementById('lock-config').classList.toggle('show', e.target.checked);
});
document.getElementById('term-add-line-btn').addEventListener('click', () => addTermLineRow());
// Both save buttons call the same function
document.getElementById('term-save-btn').addEventListener('click', saveInteractiveElements);
document.getElementById('term-save-btn-bottom').addEventListener('click', saveInteractiveElements);
// ═══════════════ SETTINGS: password / export / reset ═══════════════
function changePass() {
  const cur = document.getElementById('pcur').value, nw = document.getElementById('pnew').value, cf = document.getElementById('pcon').value;
  const err = document.getElementById('perr'), ok = document.getElementById('pok');
  err.style.display = 'none'; ok.style.display = 'none';
  if (cur !== state.pass) { err.textContent = 'Current password incorrect.'; err.style.display = 'block'; return; }
  if (nw.length < 6) { err.textContent = 'Min 6 characters.'; err.style.display = 'block'; return; }
  if (nw !== cf) { err.textContent = 'Passwords do not match.'; err.style.display = 'block'; return; }
  state.pass = nw; persist('pass');
  ok.style.display = 'block';
  ['pcur', 'pnew', 'pcon'].forEach(id => document.getElementById(id).value = '');
  setTimeout(() => ok.style.display = 'none', 2500);
}
document.getElementById('changepass-btn').addEventListener('click', changePass);

// ═══════════════ SETTINGS: 404 page ═══════════════
function render404Settings() {
  const nf = (state.settings && state.settings.notFound) || DEFAULT.settings.notFound;
  document.getElementById('nf-title').value = nf.title || '';
  document.getElementById('nf-heading').value = nf.heading || '';
  document.getElementById('nf-message').value = nf.message || '';
  document.getElementById('nf-btntext').value = nf.buttonText || '';
  document.getElementById('nf-btnlink').value = nf.buttonLink || '';
}

function save404Settings() {
  state.settings = state.settings || {};
  state.settings.notFound = {
    title: document.getElementById('nf-title').value || '404',
    heading: document.getElementById('nf-heading').value || '',
    message: document.getElementById('nf-message').value || '',
    buttonText: document.getElementById('nf-btntext').value || '← Back to Home',
    buttonLink: document.getElementById('nf-btnlink').value || 'index.html'
  };
  persist('settings');
  showToast('✓ 404 page saved');
}
document.getElementById('nf-save-btn').addEventListener('click', save404Settings);

function exportData() {
  const data = { projects: state.projects, about: state.about, skills: state.skills, experience: state.experience, contact: state.contact, settings: state.settings };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'samo_vr_portfolio_data.json'; a.click();
}
document.getElementById('export-btn').addEventListener('click', exportData);

function resetData() {
  if (!confirm('Reset ALL content to defaults? This cannot be undone.')) return;
  DATA_KEYS.forEach(k => { state[k] = JSON.parse(JSON.stringify(DEFAULT[k])); persist(k); });
  initApp(); showToast('✓ Reset to defaults');
}
document.getElementById('reset-btn').addEventListener('click', resetData);

// ═══════════════ STATIC BUTTON WIRING (modals open / save / cancel) ═══════════════
function wireStaticButtons() {
  document.getElementById('add-project-btn').addEventListener('click', () => openProjModal(null));
  document.getElementById('add-about-btn').addEventListener('click', () => openAboutModal(null));
  document.getElementById('add-sg-btn').addEventListener('click', () => openSGModal(null));
  document.getElementById('add-exp-btn').addEventListener('click', () => openExpModal(null));
  document.getElementById('add-contact-btn').addEventListener('click', () => openCtModal(null));

  document.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.closeModal;
    if (_dirtyModal === id) {
      if (!confirm('You have unsaved changes. Close anyway?')) return;
    }
    closeM(id);
  }));

  document.getElementById('pm-save-btn').addEventListener('click', saveProject);
  document.getElementById('am-save-btn').addEventListener('click', saveAbout);
  document.getElementById('sgm-save-btn').addEventListener('click', saveSG);
  document.getElementById('expm-save-btn').addEventListener('click', saveExp);
  document.getElementById('ctm-save-btn').addEventListener('click', saveContact);

  document.getElementById('pm-icon-mode-emoji').addEventListener('click', () => { setIconMode('emoji'); markDirty(_dirtyModal); });
  document.getElementById('pm-icon-mode-image').addEventListener('click', () => { setIconMode('image'); markDirty(_dirtyModal); });
  document.getElementById('pm-icon-file').addEventListener('change', e => { handleIconUpload(e); markDirty(_dirtyModal); });
  document.getElementById('pm-icon-remove-btn').addEventListener('click', () => { removeIconImage(); markDirty(_dirtyModal); });
  document.getElementById('pm-file').addEventListener('change', e => { handleImgUpload(e); markDirty(_dirtyModal); });

  document.querySelectorAll('.color-swatch[data-target]').forEach(s => {
    s.addEventListener('click', () => { pickColor(s, s.dataset.target); markDirty(_dirtyModal); });
  });
  document.querySelectorAll('input[type=color][data-synctarget]').forEach(inp => {
    inp.addEventListener('input', () => { syncColorPicker(inp.dataset.synctarget, inp.value); markDirty(_dirtyModal); });
  });
}

// ═══════════════ INIT ═══════════════
function initApp() {
  renderProjList(); renderAboutList(); renderSkillsList(); renderExpList(); renderContactList();
  renderInteractiveElements(); render404Settings();
}

wireStaticButtons();

// ── ADD SYSTEM TAB button (inside project modal) ──
document.getElementById('pm-add-tab-btn').addEventListener('click', () => {
  const wrap = document.getElementById('pm-tabs-wrap');
  const i = wrap.querySelectorAll('.tab-editor-card').length;
  tabImgData[i] = [];
  wrap.appendChild(buildTabRow({ title: '', desc: '', images: [] }, i));
});
