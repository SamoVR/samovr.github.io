/* ════════════════════════════════════════════════
   PORTFOLIO LOGIC — index.html
   ════════════════════════════════════════════════ */

const state = {
  projects: loadState('projects'),
  about: loadState('about'),
  skills: loadState('skills'),
  experience: loadState('experience'),
  contact: loadState('contact'),
  settings: loadState('settings')
};

// ═══════════════ LOCKDOWN — JS-enforced, not CSS ═══════════════
// Lockdown is checked in JS, not CSS, so removing a stylesheet does nothing.
// The wall element is injected into the DOM and the body is set to
// overflow:hidden inline — both must be circumvented to see the page,
// and the check reruns on every storage event so toggling via DevTools
// re-locks immediately.
function checkLockdown() {
  const cfg = state.settings || {};
  const locked = !!(cfg.lockdown);
  let wall = document.getElementById('lockdown-wall');
  if (locked) {
    document.body.style.overflow = 'hidden';
    if (!wall) {
      wall = document.createElement('div');
      wall.id = 'lockdown-wall';
      wall.style.cssText = [
        'position:fixed','inset:0','z-index:99999',
        'background:#0a0a0a',
        'display:flex','flex-direction:column',
        'align-items:center','justify-content:center',
        'font-family:"JetBrains Mono",monospace',
        'color:#f0f0f0','text-align:center','padding:2rem'
      ].join(';');
      wall.innerHTML = `
        <div style="font-size:2rem;margin-bottom:1.5rem">🔒</div>
        <div style="font-size:1.4rem;font-weight:700;letter-spacing:-.02em;margin-bottom:.75rem">Samo_VR</div>
        <div id="lockdown-msg" style="font-size:14px;color:#888;max-width:380px;line-height:1.7"></div>
      `;
      document.body.appendChild(wall);
    }
    const msgEl = document.getElementById('lockdown-msg');
    if (msgEl) msgEl.textContent = cfg.lockdownMsg || 'This portfolio is currently private.';
  } else {
    if (wall) wall.remove();
    document.body.style.overflow = '';
  }
}

// ═══════════════ RENDER: ABOUT ═══════════════
function renderAbout() {
  document.getElementById('about-grid').innerHTML = state.about.map(c => `
    <div class="about-card ${c.width === 'full' ? 'about-full' : ''}">
      <div class="about-card-label">${esc(c.label)}</div>
      <div class="about-card-value">${c.content}</div>
    </div>`).join('');
}

// ═══════════════ RENDER: SKILLS ═══════════════
function renderSkills() {
  document.getElementById('skills-container').innerHTML = state.skills.map(g => `
    <div class="skill-group">
      <div class="skill-group-title">${esc(g.title)}</div>
      <div class="skill-list">
        ${g.skills.map(s => `
          <div class="skill-item">
            <span>${esc(s.name)}</span>
            <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${s.level}%;background:${s.color || 'var(--accent)'}"></div></div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

// ═══════════════ RENDER: EXPERIENCE ═══════════════
function renderExperience() {
  document.getElementById('experience-container').innerHTML = state.experience.map(e => `
    <div class="exp-item">
      <div class="exp-years">${esc(e.years)}</div>
      <div>
        <div class="exp-dot"></div>
        <div class="exp-company">${esc(e.company)}</div>
        <div class="exp-role">${esc(e.role)}</div>
        <div class="exp-desc">${esc(e.desc)}</div>
        <div class="exp-tags">${(e.tags || '').split(',').filter(t => t.trim()).map(t => `<span class="tag">${esc(t.trim())}</span>`).join('')}</div>
      </div>
    </div>`).join('');
}

// ═══════════════ RENDER: PROJECTS (with tag filtering) ═══════════════
let activeProjectTag = null; // null = "All"

function getAllProjectTags() {
  const set = new Set();
  state.projects.forEach(p => (p.tags || '').split(',').forEach(t => { const v = t.trim(); if (v) set.add(v); }));
  return Array.from(set);
}

function renderProjectFilterBar() {
  const bar = document.getElementById('project-filter-bar');
  const tags = getAllProjectTags();
  // if the previously active tag no longer exists (e.g. removed via admin),
  // fall back to "All" instead of silently showing an empty grid
  if (activeProjectTag && !tags.includes(activeProjectTag)) activeProjectTag = null;
  if (!tags.length) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
  bar.style.display = 'flex';
  bar.innerHTML = `<button type="button" class="filter-chip ${activeProjectTag === null ? 'active' : ''}" data-tag="">All</button>` +
    tags.map(t => `<button type="button" class="filter-chip ${activeProjectTag === t ? 'active' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
  bar.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeProjectTag = chip.dataset.tag || null;
      renderProjectFilterBar();
      renderProjects();
    });
  });
}

function renderProjects() {
  const filtered = activeProjectTag
    ? state.projects.filter(p => (p.tags || '').split(',').map(t => t.trim()).includes(activeProjectTag))
    : state.projects;

  // map filtered items back to their real index in state.projects so
  // openPD(i) still opens the correct project after filtering
  const indexed = filtered.map(p => ({ p, i: state.projects.indexOf(p) }));

  document.getElementById('project-filter-empty').style.display = indexed.length ? 'none' : 'block';

  document.getElementById('projects-container').innerHTML = indexed.map(({ p, i }) => `
    <div class="project-card" data-pidx="${i}" tabindex="0" role="button" aria-label="View ${esc(p.name)} details" style="--card-accent:${p.accentColor || 'var(--accent)'}">
      <div class="project-card-top">
        <div class="project-icon">${renderIconMarkup(p, '💻')}</div>
        <span class="project-status ${p.status === 'complete' ? 'status-complete' : 'status-wip'}">${p.status === 'complete' ? 'Complete' : 'In Progress'}</span>
      </div>
      <div class="project-name">${esc(p.name)}</div>
      <div class="project-desc">${esc(p.shortDesc || '')}</div>
      <div class="project-footer">
        <div class="project-langs">${(p.langs || '').split(',').filter(l => l.trim()).map((l, idx, arr) => `<span class="lang-dot">${esc(l.trim())}</span>${idx < arr.length - 1 ? '<span class="lang-dot" style="color:var(--border2)"> · </span>' : ''}`).join('')}</div>
        <span style="font-family:var(--mono);font-size:11px;color:${p.accentColor || 'var(--accent)'}">View →</span>
      </div>
    </div>`).join('');

  // event delegation: click or Enter/Space opens the detail modal.
  // using data-pidx + delegation instead of inline onclick keeps this
  // immune to any special characters in project content.
  const grid = document.getElementById('projects-container');
  grid.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => openPD(parseInt(card.dataset.pidx, 10)));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPD(parseInt(card.dataset.pidx, 10)); }
    });
  });
}

// ═══════════════ RENDER: CONTACT ═══════════════
function renderContact() {
  const el = document.getElementById('contact-links');
  el.innerHTML = state.contact.map((c, i) => `
    <button class="contact-btn" data-cidx="${i}" type="button">
      <span style="font-size:16px">${c.icon || '🔗'}</span>${esc(c.label)}
    </button>`).join('');

  // Safe copy wiring: read the value out of state (not out of the DOM
  // string), so there's no escaping tightrope to walk at all.
  el.querySelectorAll('.contact-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = state.contact[parseInt(btn.dataset.cidx, 10)];
      if (c) copyText(c.value);
    });
  });
}

// ═══════════════ PROJECT DETAIL MODAL ═══════════════
let pdGalleryImgs = [];
let pdGalleryIdx = 0;

function openPD(i) {
  const p = state.projects[i];
  if (!p) return;
  const ac = p.accentColor || 'var(--accent)';
  const modal = document.getElementById('pd-modal');
  modal.style.setProperty('--ac', ac);

  document.getElementById('pd-icon').innerHTML = renderIconMarkup(p, '💻');
  document.getElementById('pd-title').textContent = p.name;
  const sub = document.getElementById('pd-subtitle');
  sub.textContent = p.status === 'complete' ? '✓ Complete' : '⏳ In Progress';

  const imgs = p.images || [];
  pdGalleryImgs = imgs;
  pdGalleryIdx = 0;
  renderPDGallery();

  // mobile fallback grid (shown only under the 880px breakpoint via CSS)
  const mobileWrap = document.getElementById('pd-images-mobile');
  if (imgs.length) {
    mobileWrap.innerHTML = `<div class="pd-section-label">Screenshots</div><div class="pd-images-mobile-grid">${
      imgs.map((src, j) => `<img src="${esc(src)}" alt="Screenshot ${j + 1}" data-imgidx="${j}">`).join('')
    }</div>`;
    mobileWrap.querySelectorAll('img').forEach(img => {
      img.addEventListener('click', () => openLB(pdGalleryImgs, parseInt(img.dataset.imgidx, 10)));
    });
  } else {
    mobileWrap.innerHTML = '';
  }

  document.getElementById('pd-desc').innerHTML = (p.fullDesc || p.shortDesc || '').replace(/\n/g, '<br>') || '<span style="color:var(--muted);font-style:italic">No description yet.</span>';
  document.getElementById('pd-tags').innerHTML = (p.langs || '').split(',').filter(t => t.trim()).map(t => `<span class="tag" style="background:${ac}22;color:${ac}">${esc(t.trim())}</span>`).join('');

  const lsec = document.getElementById('pd-links-section');
  const linksEl = document.getElementById('pd-links');
  linksEl.innerHTML = '';
  if (p.link) {
    lsec.style.display = 'block';
    const a = document.createElement('a');
    a.className = 'pd-link filled';
    a.href = p.link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.background = ac;
    a.textContent = '🔗 View Project';
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'pd-link ghost';
    copyBtn.textContent = 'Copy Link';
    copyBtn.addEventListener('click', () => copyText(p.link));
    linksEl.appendChild(a);
    linksEl.appendChild(copyBtn);
  } else {
    lsec.style.display = 'none';
  }

  // ── TABS ──
  const tabsWrap = document.getElementById('pd-tabs-section');
  const tabs = p.tabs || [];
  if (tabs.length) {
    tabsWrap.style.display = 'block';
    tabsWrap.innerHTML = `<div class="pd-section-label">Systems</div><div class="pd-tabs-row" id="pd-tabs-btns"></div>`;
    const tabsBtns = document.getElementById('pd-tabs-btns');
    tabs.forEach((tab, ti) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pd-tab-btn';
      btn.textContent = tab.title;
      btn.style.setProperty('--tab-ac', ac);
      btn.addEventListener('click', () => openTabModal(tab, ac));
      tabsBtns.appendChild(btn);
    });
  } else {
    tabsWrap.style.display = 'none';
    tabsWrap.innerHTML = '';
  }

  document.getElementById('pd-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderPDGallery() {
  const galleryEl = document.getElementById('pd-gallery');
  const emptyEl = document.getElementById('pd-gallery-empty');
  const headEl = document.getElementById('pd-gallery-headwrap');
  const mainWrap = document.getElementById('pd-gallery-mainwrap');
  const thumbsEl = document.getElementById('pd-gallery-thumbs');

  if (!pdGalleryImgs.length) {
    emptyEl.style.display = 'flex';
    headEl.style.display = 'none';
    mainWrap.style.display = 'none';
    thumbsEl.style.display = 'none';
    return;
  }
  emptyEl.style.display = 'none';
  headEl.style.display = 'flex';
  mainWrap.style.display = 'flex';
  thumbsEl.style.display = pdGalleryImgs.length > 1 ? 'flex' : 'none';

  document.getElementById('pd-gallery-count').textContent = `${pdGalleryIdx + 1} / ${pdGalleryImgs.length}`;

  const mainImg = document.getElementById('pd-gallery-img');
  mainImg.src = pdGalleryImgs[pdGalleryIdx];
  mainImg.onclick = () => openLB(pdGalleryImgs, pdGalleryIdx);

  thumbsEl.innerHTML = pdGalleryImgs.map((src, j) => `
    <div class="pd-thumb ${j === pdGalleryIdx ? 'active' : ''}" data-imgidx="${j}"><img src="${esc(src)}" alt="Thumbnail ${j + 1}"></div>
  `).join('');
  thumbsEl.querySelectorAll('.pd-thumb').forEach(t => {
    t.addEventListener('click', () => { pdGalleryIdx = parseInt(t.dataset.imgidx, 10); renderPDGallery(); });
  });
}

function pdGalleryNav(dir) {
  if (!pdGalleryImgs.length) return;
  pdGalleryIdx = (pdGalleryIdx + dir + pdGalleryImgs.length) % pdGalleryImgs.length;
  renderPDGallery();
}

function closePD() {
  const overlay = document.getElementById('pd-overlay');
  const modal = document.getElementById('pd-modal');
  modal.classList.add('closing');
  overlay.classList.add('closing');
  setTimeout(() => {
    overlay.classList.remove('open', 'closing');
    modal.classList.remove('closing');
    document.body.style.overflow = '';
  }, 170);
}

// ═══════════════ LIGHTBOX (full-res viewer, with its own prev/next) ═══════════════
let lbImgs = [];
let lbIdx = 0;

function openLB(imgs, idx) {
  lbImgs = imgs;
  lbIdx = idx;
  renderLB();
  document.getElementById('lb-overlay').classList.add('open');
}
function renderLB() {
  document.getElementById('lb-img').src = lbImgs[lbIdx];
  const multi = lbImgs.length > 1;
  document.querySelectorAll('.lb-nav').forEach(n => n.style.display = multi ? 'flex' : 'none');
}
function lbNav(dir) {
  lbIdx = (lbIdx + dir + lbImgs.length) % lbImgs.length;
  renderLB();
}
function closeLB() {
  document.getElementById('lb-overlay').classList.remove('open');
}

// ═══════════════ TAB SUB-MODAL ═══════════════
function openTabModal(tab, ac) {
  let overlay = document.getElementById('tab-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tab-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:rgba(0,0,0,.85);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:2rem';
    overlay.innerHTML = `
      <div id="tab-modal-box" style="background:#111;border:.5px solid rgba(255,255,255,.13);border-radius:14px;width:100%;max-width:580px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:.5px solid rgba(255,255,255,.07)">
          <div id="tab-modal-title" style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:#f0f0f0"></div>
          <button id="tab-modal-close" style="background:#181818;border:.5px solid rgba(255,255,255,.13);color:#888;font-size:15px;width:30px;height:30px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
        </div>
        <div style="overflow-y:auto;flex:1">
          <div id="tab-modal-desc" style="padding:1.5rem 1.5rem 1rem;font-size:14px;color:#888;line-height:1.85"></div>
          <div id="tab-modal-imgs" style="display:none"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeTabModal(); });
    document.getElementById('tab-modal-close').addEventListener('click', closeTabModal);
  }

  document.getElementById('tab-modal-title').textContent = tab.title;
  document.getElementById('tab-modal-title').style.color = ac || '#7f77dd';

  // description first, then images below
  document.getElementById('tab-modal-desc').innerHTML = (tab.desc || '').replace(/\n/g, '<br>') || '<em style="color:#555">No description yet.</em>';

  const imgsEl = document.getElementById('tab-modal-imgs');
  const imgs = tab.images || [];
  if (imgs.length) {
    imgsEl.style.display = 'grid';
    imgsEl.style.cssText = `display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.6rem;padding:0 1.5rem 1.25rem`;
    imgsEl.innerHTML = imgs.map((src, j) => `<div style="border-radius:8px;overflow:hidden;aspect-ratio:16/9;border:.5px solid rgba(255,255,255,.07)"><img src="${esc(src)}" style="width:100%;height:100%;object-fit:cover;display:block;cursor:zoom-in" data-imgidx="${j}"></div>`).join('');
    imgsEl.querySelectorAll('img').forEach(img => {
      img.addEventListener('click', () => openLB(imgs, parseInt(img.dataset.imgidx, 10)));
    });
  } else {
    imgsEl.style.display = 'none';
    imgsEl.innerHTML = '';
  }

  overlay.style.display = 'flex';
}

function closeTabModal() {
  const o = document.getElementById('tab-modal-overlay');
  if (o) o.style.display = 'none';
}

// ═══════════════ CURSOR PARTICLE EFFECT ═══════════════
let cursorCanvas, cursorCtx, cursorParticles = [], cursorMouse = { x: -999, y: -999 }, cursorRaf = null;

function initCursorEffect() {
  if (cursorCanvas) { cursorCanvas.remove(); cursorCanvas = null; }
  if (cursorRaf) { cancelAnimationFrame(cursorRaf); cursorRaf = null; }

  const cfg = state.settings || {};
  if (!cfg.cursorEffect) return;

  cursorCanvas = document.createElement('canvas');
  cursorCanvas.id = 'cursor-canvas';
  cursorCanvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.55';
  document.body.insertBefore(cursorCanvas, document.body.firstChild);
  cursorCtx = cursorCanvas.getContext('2d');
  cursorParticles = [];

  function resize() {
    cursorCanvas.width = window.innerWidth;
    cursorCanvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Spawn a particle near the cursor
  window.addEventListener('mousemove', e => {
    cursorMouse.x = e.clientX;
    cursorMouse.y = e.clientY;
    if (Math.random() < 0.35) {
      cursorParticles.push({
        x: e.clientX + (Math.random() - .5) * 20,
        y: e.clientY + (Math.random() - .5) * 20,
        vx: (Math.random() - .5) * .6,
        vy: -Math.random() * .8 - .2,
        life: 1,
        decay: .012 + Math.random() * .015,
        r: 1.5 + Math.random() * 2
      });
    }
  });

  // Static constellation nodes — placed once
  const nodes = [];
  function buildNodes() {
    nodes.length = 0;
    const count = Math.floor((window.innerWidth * window.innerHeight) / 18000);
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - .5) * .18,
        vy: (Math.random() - .5) * .18,
        r: .8 + Math.random() * 1.2
      });
    }
  }
  buildNodes();
  window.addEventListener('resize', buildNodes);

  const ACCENT = [127, 119, 221];
  const LINK_DIST = 120;
  const MOUSE_DIST = 160;

  function draw() {
    cursorRaf = requestAnimationFrame(draw);
    const ctx = cursorCtx;
    ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
    const W = cursorCanvas.width, H = cursorCanvas.height;

    // Move nodes, bounce off walls
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });

    // Draw links between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < LINK_DIST) {
          const a = (1 - d/LINK_DIST) * 0.18;
          ctx.strokeStyle = `rgba(${ACCENT},${a})`;
          ctx.lineWidth = .8;
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
        }
      }
      // Link to mouse
      const mdx = nodes[i].x - cursorMouse.x, mdy = nodes[i].y - cursorMouse.y;
      const md = Math.sqrt(mdx*mdx + mdy*mdy);
      if (md < MOUSE_DIST) {
        const a = (1 - md/MOUSE_DIST) * 0.45;
        ctx.strokeStyle = `rgba(${ACCENT},${a})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(cursorMouse.x, cursorMouse.y); ctx.stroke();
      }
    }

    // Draw nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${ACCENT},0.45)`;
      ctx.fill();
    });

    // Draw cursor trail particles
    cursorParticles = cursorParticles.filter(p => p.life > 0);
    cursorParticles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${ACCENT},${p.life * 0.8})`;
      ctx.fill();
    });

    // Cursor glow
    if (cursorMouse.x > 0) {
      const g = ctx.createRadialGradient(cursorMouse.x, cursorMouse.y, 0, cursorMouse.x, cursorMouse.y, 80);
      g.addColorStop(0, `rgba(${ACCENT},0.08)`);
      g.addColorStop(1, `rgba(${ACCENT},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cursorMouse.x, cursorMouse.y, 80, 0, Math.PI*2); ctx.fill();
    }
  }
  draw();
}

// ═══════════════ TERMINAL / TYPING INTERACTIVE ELEMENT ═══════════════
let termTimer = null;

function renderTerminal() {
  const section = document.getElementById('terminal-section');
  const cfg = state.settings || {};
  if (!cfg.terminalEnabled) {
    section.classList.remove('enabled');
    clearTimeout(termTimer);
    return;
  }
  section.classList.add('enabled');
  document.getElementById('term-title-label').textContent = cfg.terminalTitle || 'guest@samo_vr: ~';

  clearTimeout(termTimer);
  const lines = (cfg.terminalLines && cfg.terminalLines.length) ? cfg.terminalLines : DEFAULT.settings.terminalLines;
  const body = document.getElementById('term-body');
  body.innerHTML = '';
  typeSequence(body, lines, 0);
}

// Recursively types out each line, command-by-character then output instantly
// (mimicking a real shell: you type the command, the output just appears).
// Loops back to the start after a pause so the section feels alive without
// needing the user to do anything.
function typeSequence(body, lines, i) {
  if (i >= lines.length) {
    termTimer = setTimeout(() => { body.innerHTML = ''; typeSequence(body, lines, 0); }, 2200);
    return;
  }
  const line = lines[i];
  const row = document.createElement('div');
  row.className = 'term-line';

  if (line.type === 'cmd') {
    const prompt = document.createElement('span');
    prompt.className = 'term-prompt';
    prompt.textContent = '❯';
    const textSpan = document.createElement('span');
    textSpan.className = 'term-text';
    const cursor = document.createElement('span');
    cursor.className = 'term-cursor';
    row.appendChild(prompt);
    row.appendChild(textSpan);
    row.appendChild(cursor);
    body.appendChild(row);

    let charIdx = 0;
    const txt = line.text || '';
    const typeChar = () => {
      if (charIdx <= txt.length) {
        textSpan.textContent = txt.slice(0, charIdx);
        charIdx++;
        termTimer = setTimeout(typeChar, 38 + Math.random() * 35);
      } else {
        cursor.remove();
        termTimer = setTimeout(() => typeSequence(body, lines, i + 1), 380);
      }
    };
    typeChar();
  } else {
    // output line — appears instantly under the command, like a real shell
    const textSpan = document.createElement('span');
    textSpan.className = line.type === 'comment' ? 'term-comment' : 'term-text';
    textSpan.style.whiteSpace = 'pre-wrap';
    textSpan.textContent = line.text || '';
    row.appendChild(textSpan);
    body.appendChild(row);
    termTimer = setTimeout(() => typeSequence(body, lines, i + 1), 480);
  }
  body.scrollTop = body.scrollHeight;
}

// ═══════════════ CROSS-TAB SYNC FROM ADMIN ═══════════════
window.addEventListener('storage', e => {
  if (!e.key || !e.key.startsWith('svr_')) return;
  const k = e.key.replace('svr_', '');
  if (state[k] === undefined) return;
  try { state[k] = e.newValue ? JSON.parse(e.newValue) : JSON.parse(JSON.stringify(DEFAULT[k])); }
  catch { return; }
  renderAll();
});

// ═══════════════ WIRE UP STATIC CONTROLS ═══════════════
function wireStaticControls() {
  document.getElementById('pd-overlay').addEventListener('click', e => {
    if (e.target.id === 'pd-overlay') closePD();
  });
  document.getElementById('pd-close-btn').addEventListener('click', closePD);
  document.getElementById('pd-gallery-prev').addEventListener('click', () => pdGalleryNav(-1));
  document.getElementById('pd-gallery-next').addEventListener('click', () => pdGalleryNav(1));

  document.getElementById('lb-overlay').addEventListener('click', closeLB);
  document.getElementById('lb-close-btn').addEventListener('click', e => { e.stopPropagation(); closeLB(); });
  document.getElementById('lb-prev-btn').addEventListener('click', e => { e.stopPropagation(); lbNav(-1); });
  document.getElementById('lb-next-btn').addEventListener('click', e => { e.stopPropagation(); lbNav(1); });

  document.addEventListener('keydown', e => {
    if (document.getElementById('tab-modal-overlay') && document.getElementById('tab-modal-overlay').style.display === 'flex') {
      if (e.key === 'Escape') { closeTabModal(); return; }
    }
    if (document.getElementById('lb-overlay').classList.contains('open')) {
      if (e.key === 'Escape') closeLB();
      if (e.key === 'ArrowLeft') lbNav(-1);
      if (e.key === 'ArrowRight') lbNav(1);
      return;
    }
    if (document.getElementById('pd-overlay').classList.contains('open')) {
      if (e.key === 'Escape') closePD();
      if (e.key === 'ArrowLeft') pdGalleryNav(-1);
      if (e.key === 'ArrowRight') pdGalleryNav(1);
    }
  });
}

// ═══════════════ NAV ACTIVE STATE (scrollspy) ═══════════════
// Highlights whichever section is currently in view using IntersectionObserver
// rather than scroll-position math, since it's cheaper and handles
// variable section heights correctly without manual offset tuning.
function initScrollspy() {
  const sections = Array.from(document.querySelectorAll('section[id]'));
  const navLinks = Array.from(document.querySelectorAll('.nav-links a, .mobile-nav-links a'));
  if (!sections.length || !navLinks.length) return;

  const setActive = id => {
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  };

  const observer = new IntersectionObserver(entries => {
    // pick the entry most visible in the viewport right now
    let best = null;
    entries.forEach(entry => {
      if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) best = entry;
    });
    if (best) setActive(best.target.id);
  }, { rootMargin: '-40% 0px -50% 0px', threshold: [0, .25, .5, .75, 1] });

  sections.forEach(s => observer.observe(s));

  // also set active state immediately on click, so it feels instant rather
  // than waiting for scroll to settle
  navLinks.forEach(a => {
    a.addEventListener('click', () => setActive(a.getAttribute('href').slice(1)));
  });
}

// ═══════════════ MOBILE NAV (hamburger) ═══════════════
function initMobileNav() {
  const toggle = document.getElementById('mobile-nav-toggle');
  const panel = document.getElementById('mobile-nav-panel');
  if (!toggle || !panel) return;
  const close = () => { panel.classList.remove('open'); toggle.classList.remove('open'); document.body.style.overflow = ''; };
  const open = () => { panel.classList.add('open'); toggle.classList.add('open'); document.body.style.overflow = 'hidden'; };
  toggle.addEventListener('click', () => panel.classList.contains('open') ? close() : open());
  panel.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  panel.addEventListener('click', e => { if (e.target === panel) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
}

function renderAll() {
  checkLockdown();
  renderAbout();
  renderSkills();
  renderExperience();
  renderProjectFilterBar();
  renderProjects();
  renderContact();
  renderTerminal();
  initCursorEffect();
}

wireStaticControls();
initMobileNav();
checkLockdown();
renderAll();
initScrollspy();
