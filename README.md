# Samo_VR Portfolio

A static portfolio site with a local admin dashboard.

## File Structure

```
/
├── index.html          ← Public portfolio (deploy this)
├── admin.html          ← Admin dashboard (keep local)
├── 404.html             ← Custom not-found page (content editable from Admin)
├── robots.txt           ← Crawler rules (blocks /admin.html from indexing)
├── sitemap.xml           ← Basic sitemap for search engines
├── css/
│   ├── shared.css      ← Variables & shared base styles
│   ├── portfolio.css   ← Public site styles
│   └── admin.css       ← Dashboard styles
└── js/
    ├── shared-data.js  ← Data model, defaults, storage helpers
    ├── portfolio.js    ← Public site logic
    └── admin.js        ← Dashboard logic
```

---

## Deploying to GitHub Pages

### Can you upload only `index.html` and use admin locally?

**Yes - that's exactly the intended workflow.** Here's how:

1. **Put ALL files on GitHub** - push the entire folder including `admin.html`, `css/`, and `js/`. GitHub Pages serves static files, so `admin.html` will technically be accessible at `yourname.github.io/yourrepo/admin.html`, but it is password-protected and all data lives in `localStorage` on the visitor's machine - not your machine.

2. **Use admin locally** - open `admin.html` directly from your hard drive (just double-click it, or use `file:///path/to/admin.html` in your browser). Make your changes. The data is saved to `localStorage` in that browser.

3. **Sync to GitHub Pages** - since the portfolio reads from `localStorage`, changes you make in the local admin only affect your local browser. To publish changes to the live site, use the **Export JSON** button in admin → Settings, then paste that data into `shared-data.js` as the `DEFAULT` object values, and push to GitHub.

**Alternatively** - open both `index.html` and `admin.html` from the **same local folder** in the same browser. Changes in admin will reflect immediately on the local portfolio via the `storage` event listener (cross-tab sync works on `file://` in most browsers). This is the fastest local preview loop.

### Recommended GitHub Pages setup

1. Go to your repo → **Settings → Pages**
2. Set source to **Deploy from a branch → main → / (root)**
3. Your portfolio is live at `https://yourname.github.io/yourrepo/`
4. Admin is at `https://yourname.github.io/yourrepo/admin.html` (password protected)

### ⚠️ Before you deploy - update the placeholder URL ⚠️

`index.html`, `robots.txt`, and `sitemap.xml` currently use a **placeholder URL** (`https://samovr.github.io/`) for the canonical link, Open Graph tags, and sitemap. Find-and-replace that with your actual GitHub Pages URL once you know your repo name, e.g. `https://yourname.github.io/yourrepo/`. Search for `samovr.github.io` across the three files.

---

## 404 Page

GitHub Pages automatically serves `404.html` at the repo root for any URL that doesn't match a real file - no configuration needed. Its title, heading, message, and button are editable from **Admin → Settings → 404 Page**, and it falls back to sensible defaults if the admin has never been run (e.g. right after a fresh deploy).

---

## Project Tags & Filtering

Each project can have comma-separated **Tags** (separate from the Languages/Stack field) set in **Admin → Projects → Edit → Tags**. Any tag used on at least one project automatically appears as a filter chip above the projects grid on the public site - no separate tag management screen needed, the chips are derived live from whatever tags exist on your projects.

---

## Navigation Active State

The nav bar (desktop links and the mobile slide-out menu) highlights whichever section is currently in view as you scroll, using an `IntersectionObserver` - no manual scroll-position math, so it stays accurate even if section heights change.

---

## Mobile

- A hamburger menu replaces the desktop nav under 640px, opening a full-screen slide-out panel.
- The admin dashboard sidebar is replaced by a dropdown page-switcher under 700px.
- Project detail modal goes edge-to-edge on small screens instead of floating with margins.

---

## Site Lockdown

Lockdown is enforced in **JavaScript**, not CSS. This means:

- Disabling stylesheets in DevTools does **nothing** - the lock wall is injected as a DOM element with inline styles, not a CSS class.
- The lock re-checks on every `storage` event, so enabling/disabling it via the admin propagates to any open portfolio tab within seconds.
- The only way around it is to open DevTools and manually delete the `lockdown-wall` element. If you need stronger protection (e.g., hide source code), you would need a server-side solution - static sites cannot truly protect their source. For a portfolio, JS enforcement is more than sufficient as a "private/coming soon" gate.

---

## Default Password

`samo2025` - change it immediately from **Admin → Settings → Change Password**.

---

## Features Summary

| Feature | Where to edit |
|---------|---------------|
| Projects (title, desc, images, tabs, tags) | Admin → Projects |
| System Tabs per project | Admin → Projects → Edit → System Tabs section |
| Project Tags (filtering) | Admin → Projects → Edit → Tags field |
| About cards (rich text, colors) | Admin → About |
| Skills & proficiency bars | Admin → Skills |
| Work history timeline | Admin → Experience |
| Contact links (clipboard copy) | Admin → Contact |
| Live Terminal easter egg | Admin → Interactive → Live Terminal |
| Cursor constellation effect | Admin → Interactive → Cursor Constellation |
| Site Lockdown | Admin → Interactive → Site Lockdown |
| 404 Page content | Admin → Settings → 404 Page |
| Password change | Admin → Settings |
| Export / Reset data | Admin → Settings |
