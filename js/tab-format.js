// Helper for system-tab descriptions. Loaded after shared-data.js (uses its esc()).
// ── SYSTEM TAB DESCRIPTIONS ──
// Tab descriptions are now saved as HTML from the rich editor in the admin.
// Older tabs were saved as plain text (with \n line breaks), so this turns
// either form into HTML. Plain text becomes paragraphs, and a short line
// ending in ":" (e.g. "Features:") becomes a sub-heading.
function tabDescToHtml(desc) {
  const s = String(desc == null ? '' : desc).trim();
  if (!s) return '';
  if (/<\/?[a-z][a-z0-9]*(\s[^>]*)?\/?>/i.test(s)) return s; // already HTML
  const out = [];
  let buf = [];
  const flush = () => { if (buf.length) { out.push('<p>' + buf.map(esc).join('<br>') + '</p>'); buf = []; } };
  s.split(/\r?\n/).forEach(raw => {
    const line = raw.trim();
    if (!line) { flush(); return; }
    if (line.length <= 40 && line.endsWith(':')) { flush(); out.push('<h3>' + esc(line.slice(0, -1).trim()) + '</h3>'); return; }
    buf.push(line);
  });
  flush();
  return out.join('');
}