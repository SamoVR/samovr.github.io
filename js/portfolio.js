/* ════════════════════════════════════════════════
   PORTFOLIO LOGIC - index.html
   Renders every section from DEFAULT (site-data.js), and owns the
   project detail view, lightbox, command menu and navigation.
   Motion (smooth scroll, reveals, hero intro) lives in fx.js.
   ════════════════════════════════════════════════ */

const state = {
  projects: loadState('projects'),
  about: loadState('about'),
  skills: loadState('skills'),
  experience: loadState('experience'),
  contact: loadState('contact'),
  settings: loadState('settings')
};

// shared between portfolio.js and fx.js
const SVR = window.SVR = { lenis: null, locks: 0, fx: null };
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

function lockScroll() {
  if (SVR.locks++ === 0) { document.body.classList.add('no-scroll'); if (SVR.lenis) SVR.lenis.stop(); }
}
function unlockScroll() {
  if (SVR.locks > 0 && --SVR.locks === 0) { document.body.classList.remove('no-scroll'); if (SVR.lenis) SVR.lenis.start(); }
}
function scrollToId(id, opts) {
  const el = typeof id === 'string' ? document.getElementById(id.replace(/^#/, '')) : id;
  if (!el) return;
  if (SVR.lenis) SVR.lenis.scrollTo(el, { offset: el.id === 'top' ? 0 : -64, duration: 1.3, ...(opts || {}) });
  else el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

// ═══════════════ LOCKDOWN - JS-enforced, not CSS ═══════════════
// Lockdown is checked in JS, not CSS, so removing a stylesheet does nothing.
// The wall element is injected into the DOM with inline styles and the body
// is set to overflow:hidden inline, both must be circumvented to see the page.
function checkLockdown() {
  const cfg = state.settings || {};
  let wall = document.getElementById('lockdown-wall');
  if (cfg.lockdown) {
    document.body.style.overflow = 'hidden';
    if (!wall) {
      wall = document.createElement('div');
      wall.id = 'lockdown-wall';
      wall.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:99999', 'background:radial-gradient(ellipse at 50% 30%,rgba(139,132,255,.12),transparent 60%),#08080b',
        'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center', 'gap:.9rem',
        'font-family:"JetBrains Mono",monospace', 'color:#ededf2', 'text-align:center', 'padding:2rem'
      ].join(';');
      wall.innerHTML = `
        <div style="width:56px;height:56px;border-radius:16px;display:grid;place-items:center;font-size:24px;background:rgba(139,132,255,.12);border:1px solid rgba(139,132,255,.35)">🔒</div>
        <div style="font-size:1.6rem;font-weight:800;letter-spacing:-.03em">Samo<span style="color:#8b84ff">_VR</span></div>
        <div id="lockdown-msg" style="font-size:14px;color:#8d8d9b;max-width:380px;line-height:1.7"></div>`;
      document.body.appendChild(wall);
    }
    document.getElementById('lockdown-msg').textContent = cfg.lockdownMsg || 'This portfolio is currently private.';
  } else {
    if (wall) wall.remove();
    document.body.style.overflow = '';
  }
}

// ═══════════════ MEDIA HELPERS ═══════════════
const posterOf = src => (/^images\/[^/]+\.(mp4|webm)$/i.test(src) ? src.replace(/\.(mp4|webm)$/i, '.webp') : '');

// thumb=true → small pre-rendered image (falls back to the full file, see onerror below)
function mediaHTML(src, opts) {
  const o = opts || {};
  const alt = esc(o.alt || '');
  if (isVideoSrc(src)) {
    if (o.thumb) return `<img src="${esc(thumbOf(src))}" data-full="${esc(posterOf(src))}" alt="${alt}" loading="lazy" decoding="async">`;
    const poster = posterOf(src);
    return `<video src="${esc(src)}"${poster ? ` poster="${esc(poster)}"` : ''} autoplay muted loop playsinline preload="metadata" aria-label="${alt}"></video>`;
  }
  const s = o.thumb ? thumbOf(src) : src;
  return `<img src="${esc(s)}"${s !== src ? ` data-full="${esc(src)}"` : ''} alt="${alt}"${o.eager ? '' : ' loading="lazy"'} decoding="async">`;
}
// missing thumbnail → swap to the original image once
document.addEventListener('error', e => {
  const t = e.target;
  if (t && t.tagName === 'IMG' && t.dataset.full) { const f = t.dataset.full; delete t.dataset.full; t.src = f; }
}, true);

const playIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>';
const arrowIcon = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const copyIcon = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.8" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 3.5v-.2A1.3 1.3 0 0 0 9.2 2H3.3A1.3 1.3 0 0 0 2 3.3v5.9a1.3 1.3 0 0 0 1.3 1.3h.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const extIcon ='<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Click-to-load YouTube: shows the thumbnail until the visitor asks for the
// video, so nothing from YouTube loads (or tracks) before that.
function ytHTML(url, title) {
  const id = youtubeId(url);
  if (!id) return '';
  return `<button type="button" class="yt" data-yt="${id}" data-title="${esc(title || 'Video')}" aria-label="Play video: ${esc(title || 'Video')}">
    <img src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg" data-full="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
    <span class="yt-play">${playIcon}</span>
    <span class="yt-meta"><span class="yt-title">${esc(title || 'Watch the video')}</span><span class="yt-host">youtube.com</span></span>
  </button>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('.yt[data-yt]');
  if (!b) return;
  const wrap = document.createElement('div');
  wrap.className = 'yt';
  wrap.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0&modestbranding=1" title="${esc(b.dataset.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  b.replaceWith(wrap);
});

function linkLabel(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    if (/roblox\.com$/.test(h)) return /\/communities\//.test(url) ? 'View the Roblox group' : 'Play on Roblox';
    if (/github\.com$/.test(h)) return 'View source on GitHub';
    return 'Visit ' + h;
  } catch { return 'View project'; }
}
const statusInfo = p => (p.status === 'complete' ? { cls: 'status-complete', text: 'Complete' } : { cls: 'status-wip', text: 'In progress' });
const splitList = s => String(s || '').split(',').map(t => t.trim()).filter(Boolean);
const systemsCount = () => state.projects.reduce((n, p) => n + (p.tabs || []).length, 0);
const featuredIndex = () => { const i = state.projects.findIndex(p => p.featured); return i; };
const systemSlug = t => (t && t.slug) || projectSlug({ name: t && t.title });
const hasDemo = p => !!p.demo || (p.tabs || []).some(t => t.demo);
const DEMOS = { medical: () => typeof MedicalDemo !== 'undefined' && MedicalDemo, samos: () => typeof SamosDemo !== 'undefined' && SamosDemo };
// the system flagged `latest` (falls back to the featured project itself)
function latestRelease() {
  for (let i = 0; i < state.projects.length; i++) {
    const ti = (state.projects[i].tabs || []).findIndex(t => t.latest);
    if (ti >= 0) return { pi: i, ti };
  }
  const fi = featuredIndex();
  return { pi: fi >= 0 ? fi : 0, ti: -1 };
}
function openSystem(pi, ti) {
  const p = state.projects[pi], t = p && (p.tabs || [])[ti];
  if (!t) return openProject(pi);
  if (pmIndex !== pi || $('#pm-overlay').hidden) openProject(pi, { push: true });
  openTabModal(t, p.accentColor, { project: p.name, tabs: p.tabs, index: ti, pi });
}

// ═══════════════ RENDER: HERO ═══════════════
function renderHero() {
  const s = state.settings || {};
  const h = s.hero || {};
  if (h.eyebrow) $('#hero-eyebrow').textContent = h.eyebrow;
  $('#hero-bio').innerHTML = h.bio || '';
  const roles = (h.roles && h.roles.length) ? h.roles : ['build game systems.'];
  $('#role-rotator').textContent = roles[0];

  const status = $('#hero-status');
  const txt = (s.currentlyBuilding || '').trim();
  status.hidden = !(s.statusBadgeEnabled && txt);
  $('#hero-status-text').textContent = txt;

  const stats = (h.stats || []).map(st => {
    let value = st.value, suffix = st.suffix || '';
    if (st.auto === 'projects') value = state.projects.length;
    if (st.auto === 'systems') value = systemsCount();
    return `<div class="hero-stat"><dt>${esc(st.label)}</dt><dd><span class="count" data-to="${esc(value)}">${esc(value)}</span>${suffix ? `<span>${esc(suffix)}</span>` : ''}</dd></div>`;
  });
  $('#hero-stats').innerHTML = stats.join('');
}

// ═══════════════ RENDER: MARQUEE ═══════════════
function renderMarquee() {
  const words = [];
  const add = w => { w = String(w || '').trim(); if (w && !words.some(x => x.toLowerCase() === w.toLowerCase())) words.push(w); };
  state.skills.forEach(g => g.skills.forEach(k => add(k.name)));
  ['Game systems', 'Real-time graphics', 'Server-authoritative', 'UI engineering', 'ImGui', 'Documentation'].forEach(add);
  const row = words.map(w => `<span class="marquee-item">${esc(w)}</span>`).join('');
  $('#marquee-track').innerHTML = `<div style="display:flex">${row}</div><div style="display:flex">${row}</div>`;
}

// ═══════════════ RENDER: ABOUT (bento) ═══════════════
function renderAbout() {
  const cards = state.about.map(c => `
    <div class="bento-card ${c.width === 'full' ? 'span-full' : ''}" data-reveal>
      <div class="bento-label">${esc(c.label)}</div>
      <div class="bento-value">${c.content}</div>
    </div>`);

  // "latest release" card, next to the first full-width card
  const lr = latestRelease();
  const fp = state.projects[lr.pi];
  const ft = fp && lr.ti >= 0 ? fp.tabs[lr.ti] : null;
  if (fp) {
    const now = `
      <div class="bento-card span-third bento-now" data-reveal style="--card-accent:${esc(fp.accentColor || 'var(--accent)')}">
        <div>
          <div class="bento-label">Latest release</div>
          <div class="bento-now-title">${esc(ft ? ft.title : fp.name)}</div>
          <div class="bento-now-sub">${esc(ft ? `${ft.tagline || ''}${ft.tagline ? '. ' : ''}A system in ${fp.name}.` : fp.shortDesc || '')}</div>
        </div>
        <button type="button" class="btn btn-outline btn-sm" data-open-project="${lr.pi}"${ft ? ` data-system="${lr.ti}"` : ''}>${ft && ft.demo ? 'Try the live demo' : 'Open'} ${arrowIcon}</button>
      </div>`;
    const at = state.about.findIndex(c => c.width === 'full');
    cards.splice(at >= 0 ? at + 1 : cards.length, 0, now);
  }
  $('#about-grid').innerHTML = cards.join('');
}

// ═══════════════ RENDER: SKILLS ═══════════════
const TIERS = [[90, 'Expert'], [75, 'Advanced'], [60, 'Proficient'], [40, 'Familiar'], [0, 'Learning']];
const tierOf = lvl => TIERS.find(([min]) => (lvl || 0) >= min)[1];
function renderSkills() {
  $('#skills-container').innerHTML = state.skills.map(g => `
    <div class="skill-group" data-reveal>
      <div class="skill-group-head"><span class="skill-group-title">${esc(g.title)}</span><span class="skill-group-count">${g.skills.length}</span></div>
      <div class="skill-list">
        ${g.skills.map(s => {
          const lvl = Math.max(0, Math.min(100, s.level || 0));
          const segs = Array.from({ length: 5 }, (_, i) => {
            const fill = Math.max(0, Math.min(1, (lvl - i * 20) / 20));
            return `<i style="--fill:${fill.toFixed(2)};--seg:${esc(s.color || 'var(--accent)')}"></i>`;
          }).join('');
          const tier = tierOf(lvl);
          return `<div class="skill-item" data-tier="${tier}" title="${esc(s.name)}: ${lvl}/100">
            <span class="skill-name">${esc(s.name)}</span><span class="skill-tier">${tier}</span>
            <span class="skill-meter" aria-hidden="true">${segs}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`).join('');
}

// ═══════════════ RENDER: EXPERIENCE ═══════════════
function renderExperience() {
  $('#experience-container').innerHTML = `<div class="timeline-rail" aria-hidden="true"><span class="timeline-fill"></span></div>` +
    state.experience.map(e => {
      const now = /now|present/i.test(e.years || '');
      return `
      <article class="exp-item" data-reveal>
        <div class="exp-when"><div class="exp-years">${esc(e.years)}</div>${now ? '<span class="exp-now">Current</span>' : ''}</div>
        <span class="exp-dot" aria-hidden="true"></span>
        <div class="exp-card">
          <h3 class="exp-company">${esc(e.company)}</h3>
          <div class="exp-role">${esc(e.role)}</div>
          <p class="exp-desc">${esc(e.desc)}</p>
          <div class="exp-tags">${splitList(e.tags).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        </div>
      </article>`;
    }).join('');
}

// ═══════════════ RENDER: PROJECTS (with tag filtering) ═══════════════
let activeProjectTag = null; // null = "All"

function getAllProjectTags() {
  const counts = new Map();
  state.projects.forEach(p => splitList(p.tags).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function renderProjectFilterBar() {
  const bar = $('#project-filter-bar');
  const tags = getAllProjectTags();
  // if the previously active tag no longer exists (e.g. removed via admin),
  // fall back to "All" instead of silently showing an empty grid
  if (activeProjectTag && !tags.some(([t]) => t === activeProjectTag)) activeProjectTag = null;
  bar.hidden = !tags.length;
  bar.innerHTML = `<button type="button" class="filter-chip ${activeProjectTag === null ? 'active' : ''}" data-tag="" aria-pressed="${activeProjectTag === null}">All <span class="count">${state.projects.length}</span></button>` +
    tags.map(([t, n]) => `<button type="button" class="filter-chip ${activeProjectTag === t ? 'active' : ''}" data-tag="${esc(t)}" aria-pressed="${activeProjectTag === t}">${esc(t)} <span class="count">${n}</span></button>`).join('');
  $$('.filter-chip', bar).forEach(chip => chip.addEventListener('click', () => {
    activeProjectTag = chip.dataset.tag || null;
    $$('.filter-chip', bar).forEach(c => { const on = c === chip; c.classList.toggle('active', on); c.setAttribute('aria-pressed', on); });
    applyProjectFilter(true);
  }));
}

function projectCardHTML(p, i) {
  const ac = p.accentColor || 'var(--accent)';
  const st = statusInfo(p);
  const featured = !!p.featured;
  const showMedia = (state.settings || {}).cardImagePreview !== false && (p.images || []).length;
  const cover = (p.images || [])[0];
  const langs = splitList(p.langs).map(l => `<span class="lang-chip">${esc(l)}</span>`).join('');
  const meta = [p.year, featured ? '' : p.role].filter(Boolean).map(esc).join(' · ');
  const badges = `<div class="project-badges">
      <span class="badge ${st.cls}"><i class="badge-dot"></i>${st.text}</span>
      <span style="display:flex;gap:.4rem">${hasDemo(p) ? '<span class="badge">◉ Live demo</span>' : ''}${p.videoUrl || (p.tabs || []).some(t => youtubeId(t.videoUrl)) ? '<span class="badge badge-video">▶ Video</span>' : ''}</span>
    </div>`;
  const media = showMedia ? `<div class="project-media">${mediaHTML(cover, { thumb: !featured, alt: p.name + ' screenshot' })}<div class="project-media-tint"></div>${badges}</div>` : '';

  if (featured) {
    return `
    <article class="project-card featured" data-pidx="${i}" data-tags="${esc(splitList(p.tags).join('|'))}" aria-label="${esc(p.name)} (featured project)" style="--card-accent:${esc(ac)}" data-reveal>
      ${media}
      <div class="project-body">
        <div class="project-icon">${renderIconMarkup(p, '💻')}</div>
        <div class="project-meta"><span class="featured-kicker">Featured</span>${p.year ? `<span>${esc(p.year)}</span>` : ''}${p.role ? `<span>${esc(p.role)}</span>` : ''}</div>
        <h3 class="project-name">${esc(p.name)}</h3>
        <p class="project-desc">${esc(p.shortDesc || '')}</p>
        ${(p.tabs || []).length ? `
        <div class="featured-systems">
          <div class="featured-systems-label">Systems</div>
          ${p.tabs.map((t, ti) => `
            <button type="button" class="featured-system" data-open-project="${i}" data-system="${ti}">
              <span class="featured-system-idx">${String(ti + 1).padStart(2, '0')}</span>
              <span class="featured-system-text"><b>${esc(t.title)}</b>${t.tagline ? `<small>${esc(t.tagline)}</small>` : ''}</span>
              ${t.latest ? '<span class="featured-system-tag new">New</span>' : ''}${t.demo ? '<span class="featured-system-tag">Live demo</span>' : ''}
              <span class="featured-system-go" aria-hidden="true">${arrowIcon}</span>
            </button>`).join('')}
        </div>` : (p.highlights || []).length ? `<ul class="featured-highlights">${p.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
        <div class="featured-actions">
          <button type="button" class="btn btn-primary" data-open-project="${i}">Read the breakdown ${arrowIcon}</button>
          ${p.demo ? `<button type="button" class="btn btn-outline" data-open-project="${i}" data-section="demo">Try the live demo</button>` : ''}
          ${p.videoUrl ? `<button type="button" class="btn btn-outline" data-open-project="${i}" data-section="video">${playIcon.replace('22', '14').replace('22', '14')} Watch</button>` : ''}
          <span class="project-langs">${langs}</span>
        </div>
      </div>
    </article>`;
  }
  return `
    <article class="project-card" data-pidx="${i}" data-tags="${esc(splitList(p.tags).join('|'))}" tabindex="0" role="button" aria-label="Open ${esc(p.name)}" style="--card-accent:${esc(ac)}" data-reveal>
      ${media}
      <div class="project-body">
        <div class="project-icon"${showMedia ? '' : ' style="position:static;margin-bottom:1rem"'}>${renderIconMarkup(p, '💻')}</div>
        <div class="project-meta">${meta}</div>
        <h3 class="project-name">${esc(p.name)}</h3>
        <p class="project-desc">${esc(p.shortDesc || '')}</p>
        <div class="project-footer">
          <div class="project-langs">${langs}</div>
          <span class="project-go" aria-hidden="true">${arrowIcon}</span>
        </div>
      </div>
    </article>`;
}

function renderProjects() {
  const grid = $('#projects-container');
  // featured project always leads the grid, whatever its position in the data
  const order = state.projects.map((p, i) => i).sort((a, b) => (state.projects[b].featured ? 1 : 0) - (state.projects[a].featured ? 1 : 0));
  grid.innerHTML = order.map(i => projectCardHTML(state.projects[i], i)).join('');
  // 4 regular cards sit in one compact row of four instead of 3 + 1
  const regular = state.projects.filter(p => !p.featured).length;
  grid.classList.toggle('cols-4', regular === 4);
  // event delegation keeps this immune to any special characters in content
  $$('.project-card', grid).forEach(card => {
    const open = () => openProject(parseInt(card.dataset.pidx, 10));
    card.addEventListener('click', e => { if (!e.target.closest('[data-open-project]')) open(); });
    card.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); open(); } });
  });
  applyProjectFilter(false);
}

// FLIP: remember where every card was, filter, then animate from there
function applyProjectFilter(animate) {
  const cards = $$('#projects-container .project-card');
  const first = new Map(cards.map(c => [c, c.hidden ? null : c.getBoundingClientRect()]));
  cards.forEach(c => { c.hidden = !!activeProjectTag && !c.dataset.tags.split('|').includes(activeProjectTag); });
  $('#project-filter-empty').hidden = cards.some(c => !c.hidden);
  if (!animate) return;
  cards.forEach(c => {
    if (c.hidden) return;
    c.classList.add('in');
    const a = first.get(c), b = c.getBoundingClientRect();
    if (!a) { c.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)' }); return; }
    const dx = a.left - b.left, dy = a.top - b.top;
    if (dx || dy) c.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.16,1,.3,1)' });
  });
  if (window.ScrollTrigger) ScrollTrigger.refresh();
}

// ═══════════════ RENDER: CONTACT ═══════════════
function renderContact() {
  const el = $('#contact-links');
  // Each link has an action set in the admin: 'open' goes straight to the
  // site (a real <a>, so middle-click / new-tab / screen readers all work),
  // 'copy' (the default) copies the value to the clipboard.
  el.innerHTML = state.contact.map((c, i) => {
    const href = c.action === 'open' ? contactHref(c.value) : null;
    const shown = String(c.value || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/^mailto:/i, '');
    const inner = `<span class="contact-icon" aria-hidden="true">${esc(c.icon || '🔗')}</span>
      <span class="contact-text"><span class="contact-label">${esc(c.label)}</span><span class="contact-value">${esc(shown)}</span></span>`;
    if (href) {
      const ext = /^https?:/i.test(href);
      return `<a class="contact-card" data-reveal href="${esc(href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''} title="${ext ? 'Opens in a new tab' : 'Opens your mail app'}">${inner}<span class="contact-action" aria-hidden="true">↗</span></a>`;
    }
    return `<button class="contact-card contact-copy" data-reveal data-cidx="${i}" type="button" title="Copy to clipboard" aria-label="Copy ${esc(c.label)}: ${esc(c.value)}">${inner}<span class="contact-action" aria-hidden="true">${copyIcon}</span></button>`;
  }).join('');

  // Copy wiring: read the value out of state (not out of the DOM string),
  // so there's no escaping tightrope to walk at all.
  $$('.contact-copy', el).forEach(btn => btn.addEventListener('click', () => {
    const c = state.contact[parseInt(btn.dataset.cidx, 10)];
    if (!c) return;
    copyText(c.value, c.label);
    const act = $('.contact-action', btn);
    btn.classList.add('copied'); act.textContent = '✓';
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.classList.remove('copied'); act.innerHTML = copyIcon; }, 1600);
  }));

  // the tagline says exactly what clicking does, based on each link's action
  const opens = state.contact.filter(c => c.action === 'open' && contactHref(c.value)).map(c => c.label);
  const copies = state.contact.filter(c => !(c.action === 'open' && contactHref(c.value))).map(c => c.label);
  const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const parts = [];
  if (opens.length) parts.push(`${list(opens)} open${opens.length === 1 ? 's' : ''} in a new tab`);
  if (copies.length) parts.push(`${list(copies)} cop${copies.length === 1 ? 'ies' : 'y'} to your clipboard`);
  const lede = ((state.settings.sections || {}).contact || {}).lede || 'Open to collaborations, freelance work, or just talking about code.';
  $('#contact-tagline').textContent = lede + ' ' + (parts.length ? parts.join('; ') + '.' : '');

  // the same links, compact, at the bottom of the mobile menu
  $('#mobile-menu-foot').innerHTML = state.contact.map((c, i) => `<button type="button" class="btn btn-outline btn-sm" data-cidx="${i}">${esc(c.icon || '')} ${esc(c.label)}</button>`).join('');
  $$('#mobile-menu-foot [data-cidx]').forEach(b => b.addEventListener('click', () => {
    const c = state.contact[parseInt(b.dataset.cidx, 10)];
    const href = c.action === 'open' ? contactHref(c.value) : null;
    if (href) window.open(href, '_blank', 'noopener'); else copyText(c.value, c.label);
  }));
}

// Turns a contact value into something a browser can open, or null if it
// isn't a link (then the button just falls back to copying).
function contactHref(v) {
  v = String(v || '').trim();
  if (!v || /\s/.test(v)) return null;
  if (/^https?:\/\//i.test(v) || /^mailto:/i.test(v)) return v;
  if (/^[^@/]+@[^@/]+\.[a-z]{2,}$/i.test(v)) return 'mailto:' + v;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(v)) return 'https://' + v;
  return null;
}

// ═══════════════ DIALOG HELPERS ═══════════════
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,iframe,[tabindex]:not([tabindex="-1"])';
function trapFocus(container, e) {
  const els = $$(FOCUSABLE, container).filter(el => el.offsetParent !== null || el === document.activeElement);
  if (!els.length) return;
  const first = els[0], last = els[els.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

// ═══════════════ PROJECT DETAIL ═══════════════
let pmIndex = -1;
let pmReturnFocus = null;
let pmDemo = null;
const pmGal = { items: [], idx: 0 };

function openProject(i, opts) {
  const o = opts || {};
  const p = state.projects[i];
  if (!p) return;
  const overlay = $('#pm-overlay'), sheet = $('#pm-sheet');
  const wasOpen = !overlay.hidden;
  pmIndex = i;
  const ac = p.accentColor || '#8b84ff';
  sheet.style.setProperty('--ac', ac);

  // header
  $('#pm-icon').innerHTML = renderIconMarkup(p, '💻');
  $('#pm-title').textContent = p.name;
  const st = statusInfo(p);
  $('#pm-sub').innerHTML = `<span class="${st.cls}"><i class="badge-dot"></i>${st.text}</span>${p.year ? `<span>· ${esc(p.year)}</span>` : ''}${p.role ? `<span>· ${esc(p.role)}</span>` : ''}`;

  // gallery
  pmGal.items = (p.images || []).slice();
  pmGal.idx = 0;
  renderPMGallery(true);

  // description
  $('#pm-desc').innerHTML = (p.fullDesc || esc(p.shortDesc || '')).replace(/\n/g, '<br>') || '<span style="color:var(--muted);font-style:italic">No description yet.</span>';

  // showcase video
  const vSec = $('#pm-video-sec');
  vSec.hidden = !youtubeId(p.videoUrl);
  $('#pm-video').innerHTML = vSec.hidden ? '' : ytHTML(p.videoUrl, p.name + ' · showcase');

  // interactive demo
  if (pmDemo) { pmDemo.destroy(); pmDemo = null; }
  const dSec = $('#pm-demo-sec');
  const pDemo = p.demo && DEMOS[p.demo] ? DEMOS[p.demo]() : null;
  dSec.hidden = !pDemo;
  if (pDemo) pmDemo = pDemo.mount($('#pm-demo'));

  // systems
  renderPMSystems(p, ac);

  // sidebar
  const facts = [
    ['Role', p.role], ['Timeline', p.year], ['Status', st.text], ['Type', splitList(p.tags).join(', ')],
    ['Systems', (p.tabs || []).length ? String((p.tabs || []).length) : '']
  ].filter(f => f[1]);
  $('#pm-facts').innerHTML = facts.map(([k, v]) => `<div class="pm-fact"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
  const hl = p.highlights || [];
  $('#pm-highlights-wrap').hidden = !hl.length;
  $('#pm-highlights').innerHTML = hl.map(h => `<li>${esc(h)}</li>`).join('');
  $('#pm-tags').innerHTML = splitList(p.langs).map(t => `<span class="tag">${esc(t)}</span>`).join('');

  const links = $('#pm-links');
  links.innerHTML = '';
  if (p.link) {
    const a = document.createElement('a');
    a.className = 'pm-link filled';
    a.href = p.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.innerHTML = `${esc(linkLabel(p.link))} ${extIcon}`;
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'pm-link ghost';
    copyBtn.textContent = 'Copy project link';
    copyBtn.addEventListener('click', () => copyText(p.link, 'Link'));
    links.append(a, copyBtn);
  }

  // prev / next
  const n = state.projects.length;
  const prev = state.projects[(i - 1 + n) % n], next = state.projects[(i + 1) % n];
  $('#pm-footer').innerHTML = n > 1 ? `
    <button type="button" class="pm-foot-btn prev" data-go="-1"><span class="pm-foot-arrow">←</span><span><span class="pm-foot-dir">Previous</span><span class="pm-foot-name">${esc(prev.name)}</span></span></button>
    <button type="button" class="pm-foot-btn next" data-go="1"><span><span class="pm-foot-dir">Next</span><span class="pm-foot-name">${esc(next.name)}</span></span><span class="pm-foot-arrow">→</span></button>` : '';
  $('#pm-prev').hidden = $('#pm-next').hidden = n < 2;

  // show
  if (!wasOpen) {
    pmReturnFocus = document.activeElement;
    overlay.hidden = false;
    overlay.classList.remove('closing');
    lockScroll();
    sheet.focus({ preventScroll: true });
  } else {
    sheet.classList.remove('swap'); void sheet.offsetWidth;
  }
  const scroller = $('#pm-scroll');
  scroller.scrollTop = 0;
  if (o.section) {
    const target = o.section === 'demo' ? $('#pm-demo-sec') : o.section === 'video' ? $('#pm-video-sec') : null;
    if (target && !target.hidden) setTimeout(() => scroller.scrollTo({ top: target.offsetTop - 16, behavior: 'smooth' }), 380);
  }

  // shareable URL: #/work/<slug>
  const hash = '#/work/' + projectSlug(p);
  if (o.push !== false && location.hash !== hash) {
    if (wasOpen) history.replaceState({ svrModal: true }, '', hash);
    else history.pushState({ svrModal: true }, '', hash);
  }
  document.title = `${p.name} · Samo_VR`;
}

function closeProject(fromPop) {
  const overlay = $('#pm-overlay');
  if (overlay.hidden) return;
  if (!fromPop && history.state && history.state.svrModal) { history.back(); return; } // popstate closes it
  if (!fromPop && /^#\/work\//.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  closeTabModal(true);
  overlay.classList.add('closing');
  setTimeout(() => {
    overlay.hidden = true;
    overlay.classList.remove('closing');
    if (pmDemo) { pmDemo.destroy(); pmDemo = null; }
    $('#pm-media').innerHTML = '';
    $('#pm-video').innerHTML = '';
    unlockScroll();
    if (pmReturnFocus && document.contains(pmReturnFocus)) pmReturnFocus.focus({ preventScroll: true });
  }, 200);
  document.title = 'Samo_VR · Systems & Graphics Programmer';
  pmIndex = -1;
}

function stepProject(dir) {
  const n = state.projects.length;
  if (pmIndex < 0 || n < 2) return;
  openProject((pmIndex + dir + n) % n);
}

function routeFromHash() {
  const m = location.hash.match(/^#\/work\/([\w-]+)(?:\/([\w-]+))?/);
  if (m) {
    const i = state.projects.findIndex(p => projectSlug(p) === m[1]);
    if (i >= 0) {
      if (pmIndex !== i || $('#pm-overlay').hidden) openProject(i, { push: false });
      const ti = m[2] ? (state.projects[i].tabs || []).findIndex(t => systemSlug(t) === m[2]) : -1;
      if (ti >= 0) openTabModal(state.projects[i].tabs[ti], state.projects[i].accentColor, { project: state.projects[i].name, tabs: state.projects[i].tabs, index: ti, pi: i, push: false });
      else closeTabModal(true);
      return true;
    }
  } else if (!$('#pm-overlay').hidden) {
    closeProject(true);
  }
  return false;
}

function renderPMGallery(fresh) {
  const wrap = $('#pm-media');
  const items = pmGal.items;
  if (!items.length) { wrap.innerHTML = ''; wrap.hidden = true; return; }
  wrap.hidden = false;
  const src = items[pmGal.idx];
  const bg = isVideoSrc(src) ? posterOf(src) : src;
  if (fresh || !$('.gal', wrap)) {
    wrap.innerHTML = `
      <div class="gal">
        <div class="gal-stage">
          <div class="gal-frame"></div>
          ${items.length > 1 ? `<button class="gal-nav prev" type="button" aria-label="Previous screenshot"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3 5 8l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <button class="gal-nav next" type="button" aria-label="Next screenshot"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="m6 3 5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
          <span class="gal-count"></span>
          <button class="gal-zoom" type="button" aria-label="View full size"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5 9 7M2.5 13.5 7 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
        ${items.length > 1 ? `<div class="gal-thumbs">${items.map((s, j) => `<button class="gal-thumb" type="button" data-j="${j}" aria-label="Screenshot ${j + 1}">${mediaHTML(s, { thumb: true })}${isVideoSrc(s) ? '<span class="play">▶</span>' : ''}</button>`).join('')}</div>` : ''}
      </div>`;
    const g = $('.gal', wrap);
    const prevB = $('.gal-nav.prev', g), nextB = $('.gal-nav.next', g);
    if (prevB) prevB.addEventListener('click', () => pmGalleryNav(-1));
    if (nextB) nextB.addEventListener('click', () => pmGalleryNav(1));
    $('.gal-zoom', g).addEventListener('click', () => openLB(pmGal.items, pmGal.idx));
    $$('.gal-thumb', g).forEach(t => t.addEventListener('click', () => { pmGal.idx = parseInt(t.dataset.j, 10); renderPMGallery(); }));
  }
  const frame = $('.gal-frame', wrap);
  frame.innerHTML = `${bg ? `<img class="gal-bg" src="${esc(thumbOf(bg))}" data-full="${esc(bg)}" alt="" aria-hidden="true">` : ''}${mediaHTML(src, { alt: `Screenshot ${pmGal.idx + 1}`, eager: true })}`;
  const main = frame.lastElementChild;
  main.classList.add('gal-fade');
  main.addEventListener('click', () => openLB(pmGal.items, pmGal.idx));
  $('.gal-count', wrap).textContent = `${pmGal.idx + 1} / ${items.length}`;
  $$('.gal-thumb', wrap).forEach((t, j) => t.classList.toggle('active', j === pmGal.idx));
  const active = $('.gal-thumb.active', wrap);
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function pmGalleryNav(dir) {
  if (pmGal.items.length < 2) return;
  pmGal.idx = (pmGal.idx + dir + pmGal.items.length) % pmGal.items.length;
  renderPMGallery();
}

function renderPMSystems(p, ac) {
  const wrap = $('#pm-systems-sec');
  const tabs = p.tabs || [];
  wrap.hidden = !tabs.length;
  if (!tabs.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `
    <div class="pd-systems-head">
      <h3 class="pm-label">Systems <span class="pd-systems-count">${tabs.length}</span></h3>
      <div class="pd-systems-hint">Open a system to see how it works</div>
    </div>
    <div class="pd-tabs-row"></div>`;
  const row = $('.pd-tabs-row', wrap);
  tabs.forEach((tab, ti) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pd-tab-btn';
    btn.style.setProperty('--tab-ac', ac);

    // teaser = first sentence of the description (CSS clamps it to 2 lines)
    const plain = (tabDescToHtml(tab.desc) || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const tmp = document.createElement('textarea'); tmp.innerHTML = plain;
    const decoded = tmp.value;
    const firstSentence = tab.tagline || (decoded.match(/^.*?[.!?](?=\s|$)/) || [decoded])[0];
    const teaser = firstSentence.length > 140 ? firstSentence.slice(0, 137).trimEnd() + '…' : firstSentence;

    const imgCount = (tab.images || []).length;
    const vids = (tab.images || []).filter(isVideoSrc).length;
    const badges = [
      tab.latest ? '<span class="pd-tab-badge pd-tab-new">New</span>' : '',
      tab.demo ? '<span class="pd-tab-badge">◉ Live demo</span>' : '',
      youtubeId(tab.videoUrl) ? '<span class="pd-tab-badge">▶ Video</span>' : '',
      vids ? `<span class="pd-tab-badge">◉ ${vids} clip${vids > 1 ? 's' : ''}</span>` : '',
      imgCount - vids ? `<span class="pd-tab-badge">🖼 ${imgCount - vids} ${imgCount - vids === 1 ? 'screenshot' : 'screenshots'}</span>` : ''
    ].join('');

    btn.innerHTML = `
      <span class="pd-tab-index">${String(ti + 1).padStart(2, '0')}</span>
      <span class="pd-tab-main">
        <span class="pd-tab-title">${esc(tab.title)}</span>
        ${teaser ? `<span class="pd-tab-teaser">${esc(teaser)}</span>` : ''}
        ${badges ? `<span class="pd-tab-badges">${badges}</span>` : ''}
      </span>
      <span class="pd-tab-arrow" aria-hidden="true">${arrowIcon}</span>`;
    btn.setAttribute('aria-label', `Open ${tab.title}`);
    btn.addEventListener('click', () => openTabModal(tab, ac, { project: p.name, tabs, index: ti, pi: state.projects.indexOf(p) }));
    row.appendChild(btn);
  });
}

// ═══════════════ LIGHTBOX (full-res viewer, with its own prev/next) ═══════════════
let lbImgs = [];
let lbIdx = 0;

function openLB(imgs, idx) {
  lbImgs = imgs;
  lbIdx = idx;
  renderLB();
  const o = $('#lb-overlay');
  if (o.hidden) { o.hidden = false; lockScroll(); $('#lb-close-btn').focus({ preventScroll: true }); }
  $$('#pm-overlay video, #tab-modal-overlay video').forEach(v => v.pause()); // one clip at a time
}
function renderLB() {
  const src = lbImgs[lbIdx];
  $('#lb-stage').innerHTML = mediaHTML(src, { alt: `Image ${lbIdx + 1} of ${lbImgs.length}`, eager: true });
  const multi = lbImgs.length > 1;
  $$('.lb-nav').forEach(n => { n.hidden = !multi; });
  $('#lb-count').textContent = multi ? `${lbIdx + 1} / ${lbImgs.length}` : '';
}
function lbNav(dir) {
  if (lbImgs.length < 2) return;
  lbIdx = (lbIdx + dir + lbImgs.length) % lbImgs.length;
  renderLB();
}
function closeLB() {
  const o = $('#lb-overlay');
  if (o.hidden) return;
  o.hidden = true;
  $('#lb-stage').innerHTML = '';
  unlockScroll();
  $$('#pm-overlay video, #tab-modal-overlay video').forEach(v => { if (v.offsetParent) v.play().catch(() => {}); });
}

// ═══════════════ SYSTEM DETAIL MODAL ═══════════════
// ctx = { project, tabs, index } - lets the modal show "System 1 / 2" and
// step between the project's systems without closing it.
let tmCtx = null;
let tmDemo = null;

function openTabModal(tab, ac, ctx) {
  ac = ac || '#8b84ff';
  tmCtx = ctx && ctx.tabs ? { ...ctx, ac } : { project: '', tabs: [tab], index: 0, ac };

  let overlay = document.getElementById('tab-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tab-modal-overlay';
    overlay.className = 'tm-overlay';
    overlay.innerHTML = `
      <div class="tm-box" id="tab-modal-box" role="dialog" aria-modal="true" aria-labelledby="tab-modal-title" tabindex="-1">
        <div class="tm-head">
          <div class="tm-head-glow"></div>
          <button class="tm-close" id="tab-modal-close" type="button" aria-label="Close">✕</button>
          <div class="tm-eyebrow"><span class="tm-eyebrow-num" id="tm-num"></span><span id="tm-eyebrow"></span></div>
          <div class="tm-title" id="tab-modal-title"></div>
          <div class="tm-tagline" id="tm-tagline"></div>
          <button class="tm-share" id="tm-share" type="button" aria-label="Copy a link to this system" title="Copy link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1 1M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1-1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="tm-scroll" id="tm-scroll" data-lenis-prevent>
          <ul class="tm-highlights" id="tm-highlights" hidden></ul>
          <div class="tm-section" id="tab-modal-demo" hidden></div>
          <div class="tm-section" id="tab-modal-video" hidden></div>
          <div class="tm-rich" id="tab-modal-desc"></div>
          <div class="tm-section" id="tab-modal-imgs" hidden></div>
        </div>
        <div class="tm-foot" id="tm-foot">
          <button class="tm-nav prev" id="tm-prev" type="button"></button>
          <button class="tm-nav next" id="tm-next" type="button"></button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeTabModal(); });
    document.getElementById('tab-modal-close').addEventListener('click', closeTabModal);
    document.getElementById('tm-prev').addEventListener('click', () => tabModalStep(-1));
    document.getElementById('tm-next').addEventListener('click', () => tabModalStep(1));
    document.getElementById('tm-share').addEventListener('click', () => copyText(location.origin + location.pathname + location.hash, 'System link'));
  }

  const box = document.getElementById('tab-modal-box');
  box.style.setProperty('--ac', ac);

  // header
  const total = tmCtx.tabs.length;
  document.getElementById('tm-num').textContent = String(tmCtx.index + 1).padStart(2, '0');
  document.getElementById('tm-eyebrow').textContent =
    (tmCtx.project ? tmCtx.project + ' · ' : '') + 'System' + (total > 1 ? ` ${tmCtx.index + 1} of ${total}` : '');
  document.getElementById('tab-modal-title').textContent = tab.title;
  document.getElementById('tm-tagline').textContent = tab.tagline || '';

  const hl = tab.highlights || [];
  const hlEl = document.getElementById('tm-highlights');
  hlEl.hidden = !hl.length;
  hlEl.innerHTML = hl.map(h => `<li>${esc(h)}</li>`).join('');

  // description (rich HTML from the admin editor, or legacy plain text)
  document.getElementById('tab-modal-desc').innerHTML =
    tabDescToHtml(tab.desc) || '<p class="tm-empty">No description yet.</p>';

  // interactive replica, if this system has one
  if (tmDemo) { tmDemo.destroy(); tmDemo = null; }
  const demoEl = document.getElementById('tab-modal-demo');
  const demoLib = tab.demo && DEMOS[tab.demo] ? DEMOS[tab.demo]() : null;
  demoEl.hidden = !demoLib;
  box.classList.toggle('tm-wide', !!demoLib);
  if (demoLib) {
    demoEl.innerHTML = `<div class="tm-label">Try it: interactive replica <span class="tm-label-note">runs in your browser, built from the system's own rules</span></div><div class="tm-demo-mount"></div>`;
    tmDemo = demoLib.mount(demoEl.querySelector('.tm-demo-mount'));
  } else demoEl.innerHTML = '';

  // video: embedded right here (click to load) instead of sending people off-site
  const videoEl = document.getElementById('tab-modal-video');
  videoEl.hidden = !youtubeId(tab.videoUrl);
  videoEl.innerHTML = videoEl.hidden ? '' : `<div class="tm-label">Showcase video</div>${ytHTML(tab.videoUrl, tab.title + ' · showcase')}`;

  // shareable link: #/work/<project>/<system>
  if (tmCtx.pi !== undefined && ctx && ctx.push !== false) {
    const hash = `#/work/${projectSlug(state.projects[tmCtx.pi])}/${systemSlug(tab)}`;
    if (location.hash !== hash) history.replaceState(history.state, '', hash);
  }
  document.getElementById('tm-share').hidden = tmCtx.pi === undefined;

  // screenshots & clips
  const imgsEl = document.getElementById('tab-modal-imgs');
  const imgs = tab.images || [];
  imgsEl.hidden = !imgs.length;
  imgsEl.innerHTML = !imgs.length ? '' : `
    <div class="tm-label">Media <span class="tm-label-count">${imgs.length}</span></div>
    <div class="tm-gallery n-${Math.min(imgs.length, 4)}">${
      imgs.map((src, j) => `
        <button class="tm-shot" type="button" data-imgidx="${j}" aria-label="Open media ${j + 1}">
          ${isVideoSrc(src) ? mediaHTML(src) : mediaHTML(src, { alt: `Screenshot ${j + 1}` })}
          <span class="tm-shot-zoom" aria-hidden="true">⤢</span>
        </button>`).join('')
    }</div>`;
  $$('.tm-shot', imgsEl).forEach(b => b.addEventListener('click', () => openLB(imgs, parseInt(b.dataset.imgidx, 10))));

  // prev / next system
  const foot = document.getElementById('tm-foot');
  foot.hidden = total < 2;
  if (total > 1) {
    const prevT = tmCtx.tabs[(tmCtx.index - 1 + total) % total];
    const nextT = tmCtx.tabs[(tmCtx.index + 1) % total];
    // with only two systems, prev and next would be the same target - show one
    document.getElementById('tm-prev').hidden = !(total > 2 || tmCtx.index > 0);
    document.getElementById('tm-next').hidden = !(total > 2 || tmCtx.index < total - 1);
    document.getElementById('tm-prev').innerHTML = `<span class="tm-nav-arrow">←</span><span class="tm-nav-text"><span class="tm-nav-dir">Previous</span><span class="tm-nav-name">${esc(prevT.title)}</span></span>`;
    document.getElementById('tm-next').innerHTML = `<span class="tm-nav-text"><span class="tm-nav-dir">Next</span><span class="tm-nav-name">${esc(nextT.title)}</span></span><span class="tm-nav-arrow">→</span>`;
  }

  if (overlay.style.display !== 'flex') {
    overlay.style.display = 'flex';
    overlay._returnFocus = document.activeElement;
    lockScroll();
  }
  document.getElementById('tm-scroll').scrollTop = 0;
  box.focus({ preventScroll: true });
  // replay the entrance animation each time (also when stepping systems)
  box.classList.remove('tm-in'); void box.offsetWidth; box.classList.add('tm-in');
}

function tabModalStep(dir) {
  if (!tmCtx || tmCtx.tabs.length < 2) return;
  const n = tmCtx.tabs.length;
  const idx = (tmCtx.index + dir + n) % n;
  openTabModal(tmCtx.tabs[idx], tmCtx.ac, { project: tmCtx.project, tabs: tmCtx.tabs, index: idx, pi: tmCtx.pi });
}

function closeTabModal(fromRoute) {
  const o = document.getElementById('tab-modal-overlay');
  if (!o || o.style.display !== 'flex') return;
  o.style.display = 'none';
  $('#tab-modal-video').innerHTML = '';
  if (tmDemo) { tmDemo.destroy(); tmDemo = null; }
  // back to the project's own link
  if (fromRoute !== true && tmCtx && tmCtx.pi !== undefined && !$('#pm-overlay').hidden) {
    history.replaceState(history.state, '', '#/work/' + projectSlug(state.projects[tmCtx.pi]));
  }
  unlockScroll();
  if (o._returnFocus && document.contains(o._returnFocus)) o._returnFocus.focus({ preventScroll: true });
}
const tabModalOpen = () => { const o = document.getElementById('tab-modal-overlay'); return !!o && o.style.display === 'flex'; };

// ═══════════════ COMMAND MENU (Ctrl/⌘ K) ═══════════════
let cmdkItems = [], cmdkSel = 0, cmdkReturn = null;

function cmdkSource() {
  const items = [];
  const sec = (label, id, icon) => items.push({ group: 'Jump to', label, icon, hint: '#' + id, run: () => scrollToId(id) });
  sec('Home', 'top', '⌂'); sec('About', 'about', '01'); sec('Work', 'projects', '02'); sec('Experience', 'experience', '03');
  sec('Skills', 'skills', '04');
  if ((state.settings || {}).terminalEnabled) sec('Terminal', 'terminal-section', '05');
  sec('Contact', 'contact', '06');
  state.projects.forEach((p, i) => items.push({ group: 'Projects', label: p.name, iconHTML: renderIconMarkup(p, '💻'), hint: splitList(p.tags).join(' · '), run: () => openProject(i) }));
  state.projects.forEach((p, i) => (p.tabs || []).forEach((t, ti) => items.push({
    group: 'Systems', label: t.title, icon: t.demo ? '◉' : '▸', hint: (t.demo ? 'live demo · ' : '') + p.name, run: () => openSystem(i, ti)
  })));
  state.contact.forEach(c => {
    const href = c.action === 'open' ? contactHref(c.value) : null;
    items.push({ group: 'Actions', label: href ? `Open ${c.label}` : `Copy ${c.label}`, icon: c.icon || '🔗', hint: c.value, run: () => (href ? window.open(href, '_blank', 'noopener') : copyText(c.value, c.label)) });
  });
  if ((state.settings || {}).terminalEnabled) items.push({ group: 'Actions', label: 'Open the terminal', icon: '>_', run: () => { scrollToId('terminal-section'); setTimeout(() => Terminal.focus(), 900); } });
  items.push({ group: 'Actions', label: 'Copy link to this page', icon: '🔗', run: () => copyText(location.origin + location.pathname, 'Link') });
  return items;
}

// subsequence match with a small bonus for word starts; good enough for ~25 items
function fuzzy(q, s) {
  q = q.toLowerCase(); s = s.toLowerCase();
  if (!q) return 1;
  if (s.includes(q)) return 100 - s.indexOf(q);
  let i = 0, score = 0;
  for (let j = 0; j < s.length && i < q.length; j++) if (s[j] === q[i]) { score += (j === 0 || s[j - 1] === ' ') ? 3 : 1; i++; }
  return i === q.length ? score : 0;
}

function renderCmdk() {
  const q = $('#cmdk-input').value.trim();
  const list = $('#cmdk-list');
  cmdkItems = cmdkSource()
    .map(it => ({ it, score: fuzzy(q, `${it.label} ${it.hint || ''} ${it.group}`) }))
    .filter(x => x.score > 0)
    .sort((a, b) => (q ? b.score - a.score : 0))
    .map(x => x.it);
  cmdkSel = Math.min(cmdkSel, Math.max(0, cmdkItems.length - 1));
  if (!cmdkItems.length) { list.innerHTML = '<div class="cmdk-empty">No results. Try "medical", "github" or "skills".</div>'; return; }
  let html = '', group = '';
  cmdkItems.forEach((it, i) => {
    if (!q && it.group !== group) { group = it.group; html += `<div class="cmdk-group">${esc(group)}</div>`; }
    html += `<button type="button" class="cmdk-item" role="option" data-i="${i}" aria-selected="${i === cmdkSel}">
      <span class="cmdk-item-icon">${it.iconHTML || esc(it.icon || '•')}</span>
      <span class="cmdk-item-text">${esc(it.label)}</span>
      ${it.hint ? `<span class="cmdk-item-hint">${esc(it.hint)}</span>` : ''}
    </button>`;
  });
  list.innerHTML = html;
  $$('.cmdk-item', list).forEach(b => {
    b.addEventListener('mousemove', () => { if (cmdkSel !== +b.dataset.i) { cmdkSel = +b.dataset.i; markCmdk(); } });
    b.addEventListener('click', () => runCmdk(+b.dataset.i));
  });
}
function markCmdk() {
  $$('#cmdk-list .cmdk-item').forEach(b => b.setAttribute('aria-selected', +b.dataset.i === cmdkSel));
  const cur = $(`#cmdk-list .cmdk-item[data-i="${cmdkSel}"]`);
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}
function runCmdk(i) {
  const it = cmdkItems[i];
  closeCmdk();
  if (it) setTimeout(it.run, 60);
}
function openCmdk() {
  const c = $('#cmdk');
  if (!c.hidden) return;
  cmdkReturn = document.activeElement;
  c.hidden = false;
  lockScroll();
  $('#cmdk-input').value = '';
  cmdkSel = 0;
  renderCmdk();
  $('#cmdk-input').focus();
}
function closeCmdk() {
  const c = $('#cmdk');
  if (c.hidden) return;
  c.hidden = true;
  unlockScroll();
  if (cmdkReturn && document.contains(cmdkReturn)) cmdkReturn.focus({ preventScroll: true });
}

// ═══════════════ NAV: scrollspy, indicator, hide on scroll, mobile menu ═══════════════
function initNav() {
  const nav = $('#nav');
  const links = $$('.nav-links a');
  const mobileLinks = $$('.mobile-menu nav a');
  const indicator = $('.nav-indicator');

  const moveIndicator = a => {
    if (!a) { indicator.style.opacity = '0'; return; }
    indicator.style.opacity = '1';
    indicator.style.width = a.offsetWidth + 'px';
    indicator.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  const setActive = id => {
    let hit = null;
    links.forEach(a => { const on = a.getAttribute('href') === '#' + id; a.classList.toggle('active', on); if (on) hit = a; });
    mobileLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    moveIndicator(hit);
  };

  // highlight whichever section crosses the middle band of the viewport
  const sections = $$('main section[id]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id === 'terminal-section' ? 'skills' : e.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => io.observe(s));
  window.addEventListener('resize', () => moveIndicator($('.nav-links a.active')), { passive: true });

  // solid background once scrolled; slide away when scrolling down, back on up
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 24);
    if (!document.body.classList.contains('no-scroll')) nav.classList.toggle('hide', y > 480 && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove('hide');
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // mobile menu
  const toggle = $('#nav-toggle'), menu = $('#mobile-menu');
  const setMenu = open => {
    if (menu.classList.contains('open') === open) return;
    menu.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
    nav.classList.remove('hide');
    if (open) lockScroll(); else unlockScroll();
  };
  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  SVR.closeMenu = () => setMenu(false);

  // every in-page anchor goes through one handler, so smooth scrolling,
  // the mobile menu and Lenis all agree on what happens
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id === '#' || id.startsWith('#/')) return;
    const target = document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    setMenu(false);
    scrollToId(target);
    if (target.id === 'main') target.focus({ preventScroll: true });
  });
}

// ═══════════════ EASTER EGGS ═══════════════
// Konami code anywhere on the page, plus the invisible dot in the corner.
let _glitching = false;
function triggerGlitch() {
  if (_glitching) return;
  _glitching = true;
  const CHARS = 'アイウエオカキクケコサシスセソタチツ01010101#$@%!?><[]{}|\\';
  const DURATION = 2600, FRAME_MS = 38;
  const targets = $$('h1 span,h2,h3,.hero-eyebrow,.nav-logo-text,.section-tag,.project-name,.exp-company,.exp-role,.bento-label,.skill-name,.hero-stat dt,.contact-label,.footer-name')
    .filter(el => !el.closest('#lockdown-wall') && el.offsetParent !== null && !el.children.length);
  const originals = targets.map(el => ({ el, text: el.textContent }));
  const rand = () => CHARS[Math.floor(Math.random() * CHARS.length)];

  const crt = document.createElement('div');
  crt.style.cssText = 'position:fixed;inset:0;z-index:8999;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.2) 3px,rgba(0,0,0,.2) 4px);mix-blend-mode:multiply';
  document.body.appendChild(crt);
  document.body.animate([{ filter: 'none' }, { filter: 'hue-rotate(40deg) saturate(1.6)' }, { filter: 'none' }], { duration: 500, iterations: 3 });
  showToast('// ya just found an easter egg 👾', 3200);

  const start = performance.now();
  const frame = () => {
    const progress = Math.min(1, (performance.now() - start) / DURATION);
    const resolveP = progress < 0.6 ? 0 : (progress - 0.6) / 0.4;
    originals.forEach(({ el, text }) => {
      const revealTo = Math.floor(resolveP * text.length);
      let out = '';
      for (let i = 0; i < text.length; i++) out += (text[i] === ' ' || i < revealTo) ? text[i] : rand();
      el.textContent = out;
    });
    if (progress < 1) setTimeout(frame, FRAME_MS);
    else { originals.forEach(({ el, text }) => { el.textContent = text; }); crt.remove(); _glitching = false; }
  };
  frame();
}

function initEasterEggs() {
  const s = state.settings || {};
  if (!s.konamiEnabled) return;
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let pos = 0;
  document.addEventListener('keydown', e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === code[pos] ? pos + 1 : (k === code[0] ? 1 : 0);
    if (pos === code.length) { pos = 0; triggerGlitch(); }
  });
  // invisible 14×14px button in the bottom-left corner; hovering reveals a dot
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Easter egg');
  btn.style.cssText = 'position:fixed;bottom:.6rem;left:.7rem;width:14px;height:14px;padding:0;border:0;border-radius:50%;background:transparent;cursor:default;z-index:500;opacity:0;transition:opacity .2s';
  btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; btn.style.background = 'var(--accent)'; btn.style.cursor = 'pointer'; });
  btn.addEventListener('mouseleave', () => { btn.style.opacity = '0'; btn.style.background = 'transparent'; btn.style.cursor = 'default'; });
  btn.addEventListener('click', triggerGlitch);
  document.body.appendChild(btn);
}

// ═══════════════ STATIC CONTROLS & KEYBOARD ═══════════════
function wireStaticControls() {
  $('#pm-overlay').addEventListener('click', e => { if (e.target.id === 'pm-overlay') closeProject(); });
  $('#pm-close').addEventListener('click', () => closeProject());
  $('#pm-prev').addEventListener('click', () => stepProject(-1));
  $('#pm-next').addEventListener('click', () => stepProject(1));
  $('#pm-share').addEventListener('click', () => copyText(location.origin + location.pathname + '#/work/' + projectSlug(state.projects[pmIndex]), 'Project link'));
  $('#pm-footer').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) stepProject(parseInt(b.dataset.go, 10)); });

  $('#lb-overlay').addEventListener('click', e => { if (e.target.id === 'lb-overlay' || e.target.id === 'lb-stage') closeLB(); });
  $('#lb-close-btn').addEventListener('click', closeLB);
  $('#lb-prev-btn').addEventListener('click', () => lbNav(-1));
  $('#lb-next-btn').addEventListener('click', () => lbNav(1));
  // swipe between images on touch screens
  let sx = null;
  $('#lb-overlay').addEventListener('pointerdown', e => { sx = e.clientX; });
  $('#lb-overlay').addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 50) lbNav(e.clientX < sx ? 1 : -1); sx = null; });

  $('#cmdk-trigger').addEventListener('click', openCmdk);
  $('#footer-cmdk').addEventListener('click', openCmdk);
  $('#cmdk').addEventListener('click', e => { if (e.target.id === 'cmdk') closeCmdk(); });
  $('#cmdk-input').addEventListener('input', () => { cmdkSel = 0; renderCmdk(); });
  const kbd = isMac ? '⌘ K' : 'Ctrl K';
  $('#cmdk-kbd').textContent = kbd;
  $$('#footer-cmdk kbd').forEach(k => { k.textContent = kbd; });

  // "open project" buttons anywhere (bento card, featured card)
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-open-project]');
    if (!b) return;
    e.stopPropagation();
    const pi = parseInt(b.dataset.openProject, 10);
    if (b.dataset.system !== undefined) openSystem(pi, parseInt(b.dataset.system, 10));
    else openProject(pi, { section: b.dataset.section });
  });

  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;

    // command menu shortcut works everywhere except inside the terminal
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $('#cmdk').hidden ? openCmdk() : closeCmdk(); return; }
    if (!$('#cmdk').hidden) {
      if (e.key === 'Escape') { e.preventDefault(); closeCmdk(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); cmdkSel = (cmdkSel + 1) % Math.max(1, cmdkItems.length); markCmdk(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cmdkSel = (cmdkSel - 1 + cmdkItems.length) % Math.max(1, cmdkItems.length); markCmdk(); }
      else if (e.key === 'Enter') { e.preventDefault(); runCmdk(cmdkSel); }
      else if (e.key === 'Tab') trapFocus($('.cmdk-box'), e);
      return;
    }

    // top-most layer first: lightbox > system modal > project modal > menu
    if (!$('#lb-overlay').hidden) {
      if (e.key === 'Escape') closeLB();
      else if (e.key === 'ArrowLeft') lbNav(-1);
      else if (e.key === 'ArrowRight') lbNav(1);
      else if (e.key === 'Tab') trapFocus($('#lb-overlay'), e);
      return;
    }
    if (tabModalOpen()) {
      if (e.key === 'Escape') closeTabModal();
      else if (e.key === 'ArrowLeft' && !typing) tabModalStep(-1);
      else if (e.key === 'ArrowRight' && !typing) tabModalStep(1);
      else if (e.key === 'Tab') trapFocus($('#tab-modal-box'), e);
      return;
    }
    if (!$('#pm-overlay').hidden) {
      if (e.key === 'Escape') closeProject();
      else if (e.key === 'Tab') trapFocus($('#pm-sheet'), e);
      else if (!typing && e.key === 'ArrowLeft') pmGalleryNav(-1);
      else if (!typing && e.key === 'ArrowRight') pmGalleryNav(1);
      return;
    }
    if (e.key === 'Escape' && $('#mobile-menu').classList.contains('open')) { SVR.closeMenu(); return; }
    if (e.key === '/' && !typing) { e.preventDefault(); openCmdk(); }
  });

  window.addEventListener('popstate', routeFromHash);
  $('#footer-year').textContent = new Date().getFullYear();
}

// ═══════════════ LIVE PREVIEW FROM ADMIN ═══════════════
// Admin broadcasts each save; re-render so edits show up instantly in an
// open portfolio tab. Nothing is stored, a refresh goes back to DEFAULT.
PREVIEW.listen((k, v) => {
  if (!(k in state) || v == null) return;
  state[k] = v;
  renderAll();
  if (k === 'settings') Terminal.reset({ state, openProject, glitch: triggerGlitch });
  if (SVR.fx) SVR.fx.refresh();
});

// ═══════════════ PAGE TEXTS (settings.sections) ═══════════════
// Elements marked data-text / data-html="sections.about.title" take their
// text from settings; the HTML's own text is the fallback.
function renderTexts() {
  const get = path => path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), state.settings || {});
  $$('[data-text]').forEach(el => { const v = get(el.dataset.text); if (typeof v === 'string' && v) el.textContent = v; });
  $$('[data-html]').forEach(el => { const v = get(el.dataset.html); if (typeof v === 'string' && v) el.innerHTML = v; });
}

function renderAll() {
  checkLockdown();
  renderTexts();
  renderHero();
  renderMarquee();
  renderAbout();
  renderProjectFilterBar();
  renderProjects();
  renderExperience();
  renderSkills();
  renderContact();
}

renderAll();
wireStaticControls();
initNav();
initEasterEggs();
Terminal.init({ state, openProject, glitch: triggerGlitch });
// deep link straight into a project (#/work/<slug>)
SVR.deepLinked = routeFromHash();
