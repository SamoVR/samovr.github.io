/* ════════════════════════════════════════════════
   SHARED DATA - single source of truth
   Used by index.html, admin.html and 404.html
   ════════════════════════════════════════════════ */

// ── STORAGE ──
// localStorage is completely disabled. The portfolio always loads from DEFAULT.
// Admin dashboard uses its own in-memory state (see admin.js). This is
// intentional: admin is a live local preview tool only. Nothing you do in
// admin ever persists across a refresh, and nothing ever reaches a deployed
// site's visitors, to actually change what's live on GitHub Pages, edit
// js/site-data.js (Admin → Settings → Export) and push that.
const STORE = {
  get(k)    { return null; },
  set(k, v) {
    // wipe any stale svr_* keys that may exist from older versions
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('svr_'))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
    return true;
  }
};

// ── LIVE PREVIEW ──
// Admin broadcasts every save on this channel; an open portfolio tab from the
// same origin (e.g. both opened from localhost) re-renders instantly. Nothing
// is written anywhere, so a refresh always goes back to DEFAULT.
const PREVIEW = (() => {
  let ch = null;
  try { ch = new BroadcastChannel('svr-preview'); } catch {}
  return {
    send(k, v) { if (ch) try { ch.postMessage({ k, v: JSON.parse(JSON.stringify(v)) }); } catch {} },
    listen(fn) { if (ch) ch.addEventListener('message', e => e.data && fn(e.data.k, e.data.v)); }
  };
})();

// DEFAULT (all site content) lives in js/site-data.js, loaded before this file.

// keys used across admin and portfolio
const DATA_KEYS = ['projects', 'about', 'skills', 'experience', 'contact', 'settings'];

function loadState(k) {
  // Always load from DEFAULT, localStorage is not used. See the STORE
  // comment above for why: admin.html is a local-only live preview tool,
  // and this keeps the portfolio's behavior identical whether it's opened
  // on localhost or on the deployed site.
  return JSON.parse(JSON.stringify(DEFAULT[k]));
}

// ── ESCAPING ──
// HTML-escape for safe interpolation into innerHTML
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── SLUGS ──
// Stable id for a project, used in shareable links (#/work/<slug>).
function projectSlug(p) {
  return (p && p.slug) || String((p && p.name) || 'project')
    .toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ── MEDIA HELPERS ──
const isVideoSrc = src => /\.(mp4|webm|mov)(\?|#|$)/i.test(String(src || ''));

// Small pre-rendered copy for cards and thumbnail strips (images/thumbs/).
// Uploaded data: URLs and anything outside images/ have no thumb, so they
// fall back to the original (see the onerror handlers that use data-full).
function thumbOf(src) {
  const s = String(src || '');
  const m = s.match(/^images\/([^/]+)\.(webp|png|jpe?g|mp4|webm)$/i);
  return m ? `images/thumbs/${m[1]}.webp` : s;
}

// YouTube id from any of the usual link shapes, or '' if it isn't one.
function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/i);
  return m ? m[1] : '';
}

// ── TOAST ──
function showToast(msg, ms) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), ms || 2400);
}

// ── CLIPBOARD ──
// Safe copy helper. Never call this via inline onclick string-building with
// interpolated user content, always wire it through addEventListener +
// data-attributes (see attachCopyHandlers in portfolio.js / admin.js).
// Building onclick="copyText('...')" strings by interpolating arbitrary
// user text breaks the instant that text contains a quote or apostrophe,
// since it corrupts the HTML attribute itself (not just the JS string).
function copyText(txt, label) {
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).catch(fallback);
  } else {
    fallback();
  }
  showToast('✓ ' + (label ? label + ' copied' : 'Copied to clipboard'));
}

// ── RENDER ICON (emoji or uploaded image) ──
// Projects can have iconType: 'emoji' | 'image'. This renders the right
// markup for either, used by both the project grid and the detail modal.
function renderIconMarkup(item, fallbackEmoji) {
  if (item && item.iconType === 'image' && item.iconImg) {
    return `<img src="${esc(item.iconImg)}" alt="" loading="lazy" decoding="async">`;
  }
  return esc(item && item.icon ? item.icon : fallbackEmoji);
}

// ── PASSWORD HASH (admin) ──
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
