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
  passHash: DEFAULT.passHash,
  projects: loadD('projects'),
  about: loadD('about'),
  skills: loadD('skills'),
  experience: loadD('experience'),
  contact: loadD('contact'),
  settings: loadD('settings')
};

// Broadcasts the in-memory state so an open portfolio tab from the same
// origin (e.g. both on localhost) re-renders live - see PREVIEW in
// shared-data.js. Nothing is stored: refreshing any tab goes back to DEFAULT.
function persist(k) {
  PREVIEW.send(k, state[k]);
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
// Only a SHA-256 hash of the password lives in shared-data.js (it's public),
// so the typed password is hashed and compared. crypto.subtle needs a secure
// context: https, localhost or a file:// page all qualify.
async function doLogin() {
  let hash = '';
  try { hash = await sha256Hex(document.getElementById('lpass').value); }
  catch { const e = document.getElementById('lerr'); e.textContent = 'Open admin over https, localhost or as a local file to sign in.'; e.style.display = 'block'; return; }
  if (hash === state.passHash) {
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

function buildToolbar(tbId, editorId, opts = {}) {
  // accepts either element ids (static editors) or the elements themselves
  // (the system-tab editors are created dynamically, one per tab)
  const tb = typeof tbId === 'string' ? document.getElementById(tbId) : tbId;
  if (tb.children.length > 0) return;
  const editor = typeof editorId === 'string' ? document.getElementById(editorId) : editorId;

  const cmds = [
    ['<b>B</b>', 'bold'], ['<i>I</i>', 'italic'], ['<u>U</u>', 'underline'], ['<s>S</s>', 'strikeThrough'], null,
    ['H1', 'formatBlock', '<h2>'], ['H2', 'formatBlock', '<h3>'], ['¶', 'formatBlock', '<p>'], null,
    ['≡L', 'justifyLeft'], ['≡C', 'justifyCenter'], ['≡R', 'justifyRight'], null,
    ['• List', 'insertUnorderedList'], ['1. List', 'insertOrderedList'], null
  ];
  if (opts.extras) {
    // extra blocks for system tabs - styled on the live site by .tm-rich
    cmds.push(
      ['❝ Note', 'formatBlock', '<blockquote>'],
      ['— Divider', 'insertHorizontalRule'],
      ['&lt;/&gt; Code', () => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) { showToast('Select some text first, then click Code'); return; }
        document.execCommand('insertHTML', false, '<code>' + esc(sel.toString()) + '</code>');
      }],
      null
    );
  }
  cmds.forEach(c => {
    if (!c) { const s = document.createElement('div'); s.className = 'rb-sep'; tb.appendChild(s); return; }
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rb'; b.innerHTML = c[0];
    // preventDefault on mousedown is the actual fix - keeps the live
    // selection intact through the click
    b.addEventListener('mousedown', e => e.preventDefault());
    b.addEventListener('click', () => {
      editor.focus();
      if (typeof c[1] === 'function') c[1](); else document.execCommand(c[1], false, c[2] || null);
      markDirty(_dirtyModal);
    });
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
  const onSel = () => {
    // dynamic editors get thrown away when the modal is rebuilt - drop the
    // document-level listener with them so they don't pile up
    if (!editor.isConnected) { document.removeEventListener('selectionchange', onSel); return; }
    if (document.activeElement === editor) syncColorIndicator(editor, dots, colorLabel);
  };
  document.addEventListener('selectionchange', onSel);

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

// project media can be images or .mp4 clips (see shared-data.js)
function adminThumb(src) {
  return isVideoSrc(src)
    ? `<video src="${esc(src)}" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover"></video>`
    : `<img src="${esc(src)}" alt="">`;
}

function renderImgGrid() {
  const grid = document.getElementById('pm-img-grid');
  const hint = document.getElementById('pm-drag-hint');
  if (!pmImages.length) { grid.innerHTML = ''; hint.style.display = 'none'; return; }
  hint.style.display = pmImages.length > 1 ? 'block' : 'none';
  grid.innerHTML = pmImages.map((src, i) => `
    <div class="img-thumb" draggable="true" data-i="${i}">
      ${adminThumb(src)}
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
    document.getElementById('pm-role').value = '';
    document.getElementById('pm-year').value = '';
    document.getElementById('pm-video').value = '';
    document.getElementById('pm-highlights').value = '';
    document.getElementById('pm-featured').checked = false;
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
    document.getElementById('pm-role').value = p.role || '';
    document.getElementById('pm-year').value = p.year || '';
    document.getElementById('pm-video').value = p.videoUrl || '';
    document.getElementById('pm-highlights').value = (p.highlights || []).join('\n');
    document.getElementById('pm-featured').checked = !!p.featured;
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

  const val = id => document.getElementById(id).value.trim();
  const proj = {
    // start from the existing project so fields the form doesn't edit
    // (slug, demo, ...) survive a save
    ...(idx === -1 ? {} : state.projects[idx]),
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
    tabs: collectTabs(),
    role: val('pm-role'),
    year: val('pm-year'),
    videoUrl: val('pm-video'),
    highlights: val('pm-highlights').split('\n').map(l => l.trim()).filter(Boolean),
    featured: document.getElementById('pm-featured').checked
  };
  ['role', 'year', 'videoUrl'].forEach(k => { if (!proj[k]) delete proj[k]; });
  if (!proj.highlights.length) delete proj.highlights;
  if (!proj.featured) delete proj.featured;
  // only one featured card: featuring this project un-features the others
  if (proj.featured) state.projects.forEach(p => { delete p.featured; });
  if (idx === -1) state.projects.push(proj); else state.projects[idx] = proj;
  persist('projects');
  renderProjList(); closeM('pm');
  showToast('✓ Project saved');
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
        <div class="list-sub">${esc(c.value)} <span style="opacity:.6">· ${c.action === 'open' ? '↗ opens right away' : '⧉ copies to clipboard'}</span></div>
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
  if (isNew) { ['ctm-label', 'ctm-value', 'ctm-icon'].forEach(id => document.getElementById(id).value = ''); document.getElementById('ctm-action').value = 'copy'; }
  else {
    const c = state.contact[i];
    document.getElementById('ctm-label').value = c.label;
    document.getElementById('ctm-value').value = c.value;
    document.getElementById('ctm-icon').value = c.icon || '';
    document.getElementById('ctm-action').value = c.action === 'open' ? 'open' : 'copy';
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
    icon: document.getElementById('ctm-icon').value || '🔗',
    action: document.getElementById('ctm-action').value === 'open' ? 'open' : 'copy'
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
let tabEditorSeq = 0; // unique ids for each tab's rich editor

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
  card._orig = tab || {}; // keeps fields this editor doesn't show (slug, tagline, highlights, demo, latest)

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

  // rich editor (same toolbar as the project description + extra blocks)
  const richWrap = document.createElement('div');
  richWrap.className = 'rich-wrap tab-rich-wrap';
  richWrap.style.marginBottom = '.75rem';
  const descTb = document.createElement('div');
  descTb.className = 'rich-toolbar';
  const descArea = document.createElement('div');
  descArea.className = 'rich-body tab-desc-input';
  descArea.contentEditable = 'true';
  descArea.dataset.placeholder = 'Describe this system - use the toolbar for headings, lists, notes and colors…';
  descArea.innerHTML = tabDescToHtml(tab?.desc || '');
  // paste as plain text so copied web/Word styling doesn't leak into the page
  descArea.addEventListener('paste', e => {
    e.preventDefault();
    const t = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, t);
  });
  descArea.addEventListener('input', () => markDirty(_dirtyModal));
  richWrap.appendChild(descTb);
  richWrap.appendChild(descArea);
  buildToolbar(descTb, descArea, { extras: true });

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

  // extras used by the redesigned system view
  const extras = document.createElement('div');
  extras.className = 'tab-extras';
  extras.innerHTML = `
    <div class="grid2">
      <div class="fgroup"><label>Tagline (optional)</label><input type="text" class="tab-tagline-input" placeholder="One short line under the title"></div>
      <div class="fgroup"><label>Live demo</label><select class="tab-demo-input">
        <option value="">None</option><option value="medical">Medical Examine System replica</option><option value="samos">SAM-OS terminal replica</option>
      </select></div>
    </div>
    <div class="fgroup"><label>Highlights (optional, one per line)</label><textarea class="fta tab-highlights-input" style="min-height:70px"></textarea></div>
    <div class="fgroup"><label class="check-label"><input type="checkbox" class="tab-latest-input"> Latest release <span style="color:var(--muted);font-size:10px">(adds a "New" badge and features it in About)</span></label></div>`;
  extras.querySelector('.tab-tagline-input').value = tab?.tagline || '';
  extras.querySelector('.tab-demo-input').value = tab?.demo || '';
  extras.querySelector('.tab-highlights-input').value = (tab?.highlights || []).join('\n');
  extras.querySelector('.tab-latest-input').checked = !!tab?.latest;

  const pathBtn = document.createElement('button');
  pathBtn.type = 'button'; pathBtn.className = 'btn btn-ghost btn-sm'; pathBtn.textContent = '+ Add by path';
  pathBtn.style.marginBottom = '.5rem';
  pathBtn.addEventListener('click', () => {
    const v = (prompt('Image or .mp4 path inside your site, e.g. images/backrooms5.webp') || '').trim();
    if (!v) return;
    const ti = parseInt(card.dataset.tabidx, 10);
    (tabImgData[ti] = tabImgData[ti] || []).push(v);
    renderTabImgGrid(thumbGrid, ti);
    markDirty(_dirtyModal);
  });

  card.appendChild(topRow);
  card.appendChild(descLabel);
  card.appendChild(richWrap);
  card.appendChild(videoLabel);
  card.appendChild(videoInput);
  card.appendChild(extras);
  card.appendChild(imgLabel);
  card.appendChild(dropZone);
  card.appendChild(pathBtn);
  card.appendChild(thumbGrid);
  return card;
}

function renderTabImgGrid(grid, tabIdx) {
  const imgs = tabImgData[tabIdx] || [];
  grid.innerHTML = imgs.map((src, j) => `
    <div class="img-thumb" style="aspect-ratio:16/9" data-rmtab="${tabIdx}" data-rmimg="${j}">
      ${adminThumb(src)}
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

// an emptied contenteditable leaves stray <br>/<div> behind - treat as empty
function readTabDesc(el) {
  if (!el) return '';
  const hasContent = el.textContent.trim() || el.querySelector('hr');
  return hasContent ? el.innerHTML.trim() : '';
}

function collectTabs() {
  const wrap = document.getElementById('pm-tabs-wrap');
  if (!wrap) return [];
  return Array.from(wrap.querySelectorAll('.tab-editor-card')).map((card, i) => {
    const t = {
      ...(card._orig || {}),
      title: (card.querySelector('.tab-title-input')?.value || '').trim(),
      desc: readTabDesc(card.querySelector('.tab-desc-input')),
      videoUrl: (card.querySelector('.tab-video-input')?.value || '').trim(),
      tagline: card.querySelector('.tab-tagline-input').value.trim(),
      demo: card.querySelector('.tab-demo-input').value,
      highlights: card.querySelector('.tab-highlights-input').value.split('\n').map(l => l.trim()).filter(Boolean),
      latest: card.querySelector('.tab-latest-input').checked,
      images: [...(tabImgData[i] || [])]
    };
    // drop empty extras so the data file stays tidy
    ['tagline', 'demo'].forEach(k => { if (!t[k]) delete t[k]; });
    if (!t.highlights.length) delete t.highlights;
    if (!t.latest) delete t.latest;
    return t;
  }).filter(t => t.title);
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
async function changePass() {
  const cur = document.getElementById('pcur').value, nw = document.getElementById('pnew').value, cf = document.getElementById('pcon').value;
  const err = document.getElementById('perr'), ok = document.getElementById('pok'), out = document.getElementById('phash');
  err.style.display = 'none'; ok.style.display = 'none'; out.style.display = 'none';
  if (await sha256Hex(cur) !== state.passHash) { err.textContent = 'Current password incorrect.'; err.style.display = 'block'; return; }
  if (nw.length < 8) { err.textContent = 'Min 8 characters.'; err.style.display = 'block'; return; }
  if (nw !== cf) { err.textContent = 'Passwords do not match.'; err.style.display = 'block'; return; }
  state.passHash = await sha256Hex(nw);
  document.getElementById('phash-code').textContent = `passHash: '${state.passHash}'`;
  ok.style.display = 'block';
  out.style.display = 'flex';
  ['pcur', 'pnew', 'pcon'].forEach(id => document.getElementById(id).value = '');
}
document.getElementById('phash-copy').addEventListener('click', () => copyText(document.getElementById('phash-code').textContent, 'Hash line'));
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
// ═══════════════ HOMEPAGE: hero, code card, section texts ═══════════════
const SECTION_FIELDS = [
  ['about', 'About'], ['projects', 'Projects'], ['experience', 'Experience'],
  ['skills', 'Skills'], ['terminal', 'Terminal'], ['contact', 'Contact']
];

function addStatRow(st) {
  st = st || {};
  const row = document.createElement('div');
  row.className = 'home-row stat-row';
  row.innerHTML = `
    <input type="text" class="st-value" placeholder="4" style="width:70px">
    <input type="text" class="st-suffix" placeholder="+" style="width:60px">
    <input type="text" class="st-label" placeholder="Years shipping code" style="flex:1">
    <select class="st-auto"><option value="">Fixed number</option><option value="projects">Count projects</option><option value="systems">Count systems</option></select>
    <button type="button" class="ib ib-del">✕</button>`;
  row.querySelector('.st-value').value = st.value || '';
  row.querySelector('.st-suffix').value = st.suffix || '';
  row.querySelector('.st-label').value = st.label || '';
  row.querySelector('.st-auto').value = st.auto || '';
  row.querySelector('.ib-del').addEventListener('click', () => row.remove());
  document.getElementById('hero-stats-rows').appendChild(row);
}

function addCodeRow(c) {
  c = c || { file: '', lang: 'lua', code: '' };
  const row = document.createElement('div');
  row.className = 'home-code';
  row.innerHTML = `
    <div class="home-row">
      <input type="text" class="cd-file" placeholder="FileName.lua" style="flex:1">
      <select class="cd-lang"><option value="lua">Lua / Luau</option><option value="cpp">C++</option></select>
      <button type="button" class="ib ib-del">✕</button>
    </div>
    <textarea class="fta cd-code" spellcheck="false" style="font-family:var(--mono);font-size:12px;min-height:150px" placeholder="Paste code here (keep lines under ~60 characters)"></textarea>`;
  row.querySelector('.cd-file').value = c.file || '';
  row.querySelector('.cd-lang').value = c.lang === 'cpp' ? 'cpp' : 'lua';
  row.querySelector('.cd-code').value = c.code || '';
  row.querySelector('.ib-del').addEventListener('click', () => row.remove());
  // Tab inserts a tab instead of leaving the box
  row.querySelector('.cd-code').addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    document.execCommand('insertText', false, '\t');
  });
  document.getElementById('hero-code-rows').appendChild(row);
}

function renderHomeEditor() {
  const s = state.settings || {};
  const h = s.hero || DEFAULT.settings.hero || {};
  document.getElementById('hero-eyebrow').value = h.eyebrow || '';
  document.getElementById('hero-bio').value = h.bio || '';
  document.getElementById('hero-roles').value = (h.roles || []).join('\n');
  document.getElementById('hero-stats-rows').innerHTML = '';
  (h.stats || []).forEach(addStatRow);
  document.getElementById('hero-code-rows').innerHTML = '';
  (s.heroCode || []).forEach(addCodeRow);

  const sec = s.sections || DEFAULT.settings.sections || {};
  const wrap = document.getElementById('section-text-rows');
  wrap.innerHTML = SECTION_FIELDS.map(([k, name]) => `
    <div class="home-section" data-sec="${k}">
      <div class="home-section-name">${name}</div>
      <div class="grid2">
        <div class="fgroup"><label>Small label</label><input type="text" class="sc-tag"></div>
        <div class="fgroup"><label>Heading</label><input type="text" class="sc-title"></div>
      </div>
      <div class="fgroup"><label>Description</label><input type="text" class="sc-lede"></div>
    </div>`).join('') + `
    <div class="home-section" data-sec="footer">
      <div class="home-section-name">Footer</div>
      <div class="fgroup"><label>Footer note</label><input type="text" class="sc-note"></div>
    </div>`;
  wrap.querySelectorAll('[data-sec]').forEach(box => {
    const v = sec[box.dataset.sec] || {};
    ['tag', 'title', 'lede', 'note'].forEach(f => { const el = box.querySelector('.sc-' + f); if (el) el.value = v[f] || ''; });
  });
}

function saveHomeEditor() {
  const s = state.settings = state.settings || {};
  const val = id => document.getElementById(id).value.trim();
  s.hero = {
    ...(s.hero || {}),
    eyebrow: val('hero-eyebrow'),
    bio: val('hero-bio'),
    roles: val('hero-roles').split('\n').map(l => l.trim()).filter(Boolean),
    stats: Array.from(document.querySelectorAll('#hero-stats-rows .stat-row')).map(r => {
      const st = { label: r.querySelector('.st-label').value.trim() };
      const auto = r.querySelector('.st-auto').value;
      if (auto) st.auto = auto; else st.value = r.querySelector('.st-value').value.trim();
      const suffix = r.querySelector('.st-suffix').value.trim();
      if (suffix) st.suffix = suffix;
      return st;
    }).filter(st => st.label)
  };
  s.heroCode = Array.from(document.querySelectorAll('#hero-code-rows .home-code')).map(r => ({
    file: r.querySelector('.cd-file').value.trim() || 'snippet',
    lang: r.querySelector('.cd-lang').value,
    code: r.querySelector('.cd-code').value.replace(/\s+$/, '')
  })).filter(c => c.code);
  s.sections = {};
  document.querySelectorAll('#section-text-rows [data-sec]').forEach(box => {
    const v = {};
    ['tag', 'title', 'lede', 'note'].forEach(f => { const el = box.querySelector('.sc-' + f); if (el && el.value.trim()) v[f] = el.value.trim(); });
    s.sections[box.dataset.sec] = v;
  });
  persist('settings');
  showToast('✓ Homepage saved');
}

// ═══════════════ PUBLISH: a complete, ready-to-commit shared-data.js ═══════════════
// Takes the current shared-data.js from the site and swaps its DEFAULT object
// for everything edited here, so publishing is "replace the file and push".
async function publishData() {
  const data = { projects: state.projects, about: state.about, skills: state.skills, experience: state.experience, contact: state.contact, settings: state.settings, passHash: state.passHash };
  const block = 'const DEFAULT = ' + JSON.stringify(data, null, 2) + '\n';
  let src;
  try {
    const res = await fetch('js/shared-data.js', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    src = await res.text();
  } catch {
    showToast('⚠ Open admin through a local server (see README) to publish. Exporting JSON instead.');
    exportData();
    return;
  }
  const start = src.indexOf('const DEFAULT = {');
  const end = src.indexOf('\n// keys used across admin and portfolio');
  if (start < 0 || end < 0) { showToast('⚠ Couldn\'t find DEFAULT in shared-data.js'); return; }
  const out = src.slice(0, start) + block + src.slice(end);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([out], { type: 'text/javascript' }));
  a.download = 'shared-data.js';
  a.click();
  const big = JSON.stringify(data).includes('data:image');
  showToast(big ? '✓ Downloaded. Note: it contains uploaded images, consider using paths instead.' : '✓ Downloaded shared-data.js. Replace js/shared-data.js with it and push.', 4500);
}
document.getElementById('publish-btn').addEventListener('click', publishData);
document.getElementById('home-save-btn').addEventListener('click', saveHomeEditor);
document.getElementById('hero-add-stat').addEventListener('click', () => addStatRow());
document.getElementById('hero-add-code').addEventListener('click', () => addCodeRow());
document.getElementById('pm-add-path-btn').addEventListener('click', () => {
  const v = (prompt('Image or .mp4 path inside your site, e.g. images/shot.webp') || '').trim();
  if (!v) return;
  pmImages.push(v);
  renderImgGrid();
  markDirty('pm');
});

function initApp() {
  renderProjList(); renderAboutList(); renderSkillsList(); renderExpList(); renderContactList();
  renderInteractiveElements(); render404Settings(); renderHomeEditor();
}

wireStaticButtons();

// ── ADD SYSTEM TAB button (inside project modal) ──
document.getElementById('pm-add-tab-btn').addEventListener('click', () => {
  const wrap = document.getElementById('pm-tabs-wrap');
  const i = wrap.querySelectorAll('.tab-editor-card').length;
  tabImgData[i] = [];
  wrap.appendChild(buildTabRow({ title: '', desc: '', images: [] }, i));
});