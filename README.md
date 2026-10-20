# Samo_VR Portfolio

A static portfolio site (GitHub Pages) with a local admin dashboard. No build step: plain HTML, CSS and JavaScript, plus two small vendored libraries.

## File Structure

```
/
├── index.html            ← Public portfolio
├── admin.html            ← Admin dashboard (local editing + live preview)
├── 404.html              ← Not-found page (content editable from Admin)
├── robots.txt / sitemap.xml
├── css/
│   ├── shared.css        ← Design tokens & shared primitives (used by all pages)
│   ├── portfolio.css     ← Public site styles
│   ├── medical-demo.css  ← Interactive Medical UI replica
│   ├── samos-demo.css    ← Interactive SAM-OS terminal replica
│   └── admin.css         ← Dashboard styles
├── js/
│   ├── shared-data.js    ← ALL site content (the DEFAULT object) + helpers
│   ├── portfolio.js      ← Renders sections, project detail, lightbox, Ctrl K menu
│   ├── fx.js             ← Motion: smooth scroll, reveals, intro, hero, marquee
│   ├── hero-shader.js    ← Raw WebGL/GLSL background in the hero
│   ├── medical-demo.js   ← In-browser replica of the Medical Examine System UI
│   ├── samos-demo.js     ← In-browser replica of the SAM-OS terminal
│   ├── terminal.js       ← The interactive "Poking around" shell
│   ├── tab-format.js     ← Turns system-tab descriptions into HTML
│   └── admin.js          ← Dashboard logic
├── vendor/               ← GSAP 3.14.2 + ScrollTrigger, Lenis 1.3.21 (local copies)
└── images/
    ├── *.webp / *.mp4    ← Screenshots and clips
    └── thumbs/           ← 720px copies used on cards and thumbnail strips
```

## Editing content

Everything on the site comes from the `DEFAULT` object in `js/shared-data.js`. To change what's live, edit it and push.

Project fields:

| Field | Notes |
|-------|-------|
| `name`, `shortDesc`, `fullDesc` | `fullDesc` is HTML (the admin's rich editor writes it) |
| `icon` / `iconType` / `iconImg` | Emoji, or an image path |
| `accentColor` | Tints the card, detail view and system cards |
| `langs`, `tags` | Comma-separated. Tags become the filter chips |
| `status` | `complete` or `wip` |
| `link` | Game / repo link. The button label adapts (Play on Roblox, View source on GitHub, …) |
| `images` | Screenshots **or `.mp4` clips** (clips autoplay muted in the gallery) |
| `tabs` | "Systems": title, desc (HTML or plain text), optional `videoUrl` (YouTube), images. Optional extras: `tagline`, `highlights`, `slug` (link: `/#/work/<project>/<system>`), `demo` (`"medical"` or `"samos"`), `latest` (shown as "Latest release" in About) |
| `year`, `role` | Optional, shown on cards and in the detail sidebar |
| `videoUrl` | Optional YouTube showcase, embedded click-to-play |
| `highlights` | Optional bullet list |
| `featured` | One project shown as the large card at the top of the grid |
| `slug` | Optional; used in shareable links like `/#/work/medical-examine-system` |
| `demo` | Project-level replica (same values as on systems); usually you'll put demos on a system instead |

Hero text, rotating role lines, stats and the code snippets typed out in the hero live under `settings.hero` and `settings.heroCode`. The hero snippets are short illustrative excerpts; swap in real code any time.

### Using the admin

1. Serve the folder locally (`python -m http.server 8765`) and open `http://localhost:8765/admin.html` and `http://localhost:8765/` side by side.
2. Edits in the admin show up **live** in the open portfolio tab (BroadcastChannel). Nothing is stored: refreshing either tab goes back to `DEFAULT`.
3. When you're happy, **Settings → Publish (download shared-data.js)**. Replace `js/shared-data.js` with the downloaded file and push. That's it.

Everything visible on the site is editable from the admin: **Homepage** (hero text, rotating lines, stats, code card snippets, every section's label/heading/description, footer note), **Projects** (including each system's tagline, highlights, live demo and "New" flag), About, Skills, Experience, Contact, Interactive toggles and the 404 page.

For images, copy the file into `images/` and use **+ Add by path** in the editor. Uploading through the admin works too, but it embeds the image inside the data file and makes it huge.

### Admin password

Only a SHA-256 **hash** is stored (`passHash` in `shared-data.js`), because that file is public. To change it: **Settings → Change Password** generates a `passHash: '…'` line; paste it over the old one and push. The old plain-text password was public in this repo's history, so pick a new one you don't use anywhere else.

Admin is still a convenience page, not real security: anything on a static site is readable. It's excluded from search engines via `robots.txt` and a `noindex` tag.

## Media guidelines

- Use **WebP** for screenshots and **MP4** instead of GIFs (the two old GIFs were 164 MB; as MP4 they're 4.6 MB).
- Put a 720px-wide copy with the same name in `images/thumbs/` (cards use it; if it's missing, the full image is used automatically).
- For a clip `images/name.mp4`, add a poster frame `images/name.webp` (and its thumb).

With [ffmpeg](https://ffmpeg.org/):

```bash
ffmpeg -i shot.png -vf "scale='min(1920,iw)':-2" -c:v libwebp -quality 82 images/shot.webp
ffmpeg -i images/shot.webp -vf "scale='min(720,iw)':-2" -c:v libwebp -quality 72 images/thumbs/shot.webp
ffmpeg -i clip.gif -vf "fps=30,scale=1280:-2,format=yuv420p" -c:v libx264 -crf 25 -movflags +faststart -an images/clip.mp4
ffmpeg -i images/clip.mp4 -frames:v 1 -c:v libwebp images/clip.webp
```

## Features

| Feature | Where to edit |
|---------|---------------|
| Projects, systems, media, featured card | Admin → Projects |
| About cards | Admin → About |
| Skills (shown as 5-segment meters with a tier label) | Admin → Skills |
| Experience timeline | Admin → Experience |
| Contact links (open or copy, per link) | Admin → Contact |
| Interactive terminal (scripted intro, then real commands: `help`, `projects`, `open 1`, `neofetch`, …) | Admin → Interactive → Live Terminal |
| Cursor glow, scroll reveal, hero intro, card covers, progress bar, status badge | Admin → Interactive |
| Secret button + Konami code (↑↑↓↓←→←→BA) glitch | Admin → Interactive → Secret Button |
| Site lockdown | Admin → Interactive → Site Lockdown |
| 404 page | Admin → Settings → 404 Page |

Also built in: shareable project links (`/#/work/<slug>`, back button closes the project), a command menu (`Ctrl K` / `⌘ K` / `/`), keyboard navigation in galleries and the lightbox, swipe on touch, and full `prefers-reduced-motion` support.

## Site Lockdown

Lockdown is enforced in **JavaScript**, not CSS: the wall is injected as a DOM element with inline styles, so disabling stylesheets does nothing. Static sites can't truly hide their source, so treat it as a "private / coming soon" gate, not security.

## 404 Page

GitHub Pages serves `404.html` for any URL that doesn't exist, at any depth. All of its asset paths are absolute (`/css/...`) so it renders correctly on nested URLs too.

## Deploying

Repo → **Settings → Pages** → Deploy from a branch → `main` → `/ (root)`. The site is live at `https://samovr.github.io/`.

## Third-party code

- [GSAP](https://gsap.com) 3.14.2 + ScrollTrigger: scroll-linked timeline & parallax ([GSAP standard license](https://gsap.com/standard-license), free for all uses)
- [Lenis](https://github.com/darkroomengineering/lenis) 1.3.21: smooth scrolling (MIT)
- Fonts: Inter and JetBrains Mono via Google Fonts

Both libraries are optional: if they fail to load, the site falls back to native scrolling and simple reveals.
