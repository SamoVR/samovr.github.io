/* ════════════════════════════════════════════════
   SHARED DATA — single source of truth
   Used by both portfolio.js and admin.js
   ════════════════════════════════════════════════ */

// ── STORAGE ──
// VERSION: bump this string every time you push a content update to Git.
// Any visitor whose browser has an older version cached will have their
// localStorage wiped automatically on next load — they'll always see the
// latest data from the file instead of a stale cached copy.
const CACHE_VERSION = '2026-06-21-v2';

const STORE = {
  _local: location.hostname === 'localhost' || location.hostname === '127.0.0.1',

  // Wipe all svr_* keys if the stored version doesn't match CACHE_VERSION.
  // Runs once on load (called below). Safe to call on both local and live —
  // on live it also clears any legacy keys written before the localhost guard
  // was added.
  bustIfStale() {
    try {
      if (localStorage.getItem('svr_version') !== CACHE_VERSION) {
        Object.keys(localStorage)
          .filter(k => k.startsWith('svr_'))
          .forEach(k => localStorage.removeItem(k));
        localStorage.setItem('svr_version', CACHE_VERSION);
      }
    } catch { /* storage unavailable — ignore */ }
  },

  get(k) {
    if (!this._local) return null;
    try { const v = localStorage.getItem('svr_' + k); return v ? JSON.parse(v) : null; }
    catch { return null; }
  },
  set(k, v) {
    if (!this._local) return false;
    try { localStorage.setItem('svr_' + k, JSON.stringify(v)); return true; }
    catch (err) {
      console.error('Storage write failed for key', k, err);
      return false;
    }
  }
};

// Run the stale-cache check immediately on load, before anything else reads
// from localStorage. On the live site this clears legacy svr_* keys. On
// localhost it only clears if the version stamp changed (i.e. you bumped it).
STORE.bustIfStale();

// ── DEFAULT CONTENT ──
const DEFAULT = {
  "projects": [
    {
      "name": "RIFT | Render Engine",
      "icon": "🎮",
      "iconType": "emoji",
      "iconImg": "",
      "accentColor": "#7f77dd",
      "shortDesc": "A custom 3D scene editor and real-time renderer built entirely in C++ using OpenGL.",
      "fullDesc": "Originally started as a school project, <font color=\"#7f77dd\">RIFT </font>grew into a fully-featured render engine and scene editor. Built solo in <font color=\"#38bdf8\">C++</font> using <font color=\"#38bdf8\">OpenGL</font>, <font color=\"#38bdf8\">ImGui</font>, <font color=\"#38bdf8\">json</font>, and <font color=\"#38bdf8\">stbimage</font>. Features include a scene hierarchy, transform controls (position/rotation/scale), texture mapping, animation timeline with keyframe curves, scene save/load, and a property inspector panel. Every system was written from scratch — this was about understanding how engines work, not just using one.",
      "langs": "C++, OpenGL, GLSL, ImGui",
      "tags": "Graphics, Tools",
      "status": "wip",
      "link": "https://github.com/SamoVR/SamosCircus2/tree/master/RenderEngine",
      "images": [
        "images/rift3.webp",
        "images/rift4.webp",
        "images/rift5.webp"
      ],
      "tabs": [
        {
          "title": "Scene Editor",
          "desc": "The editor exposes a full scene hierarchy with an object list panel, a 3D viewport, and a property inspector. Objects can be added, duplicated, or removed at runtime. Each object holds its own transform, texture reference, and name — all editable live.",
          "images": [
            "images/rift2.webp"
          ]
        },
        {
          "title": "Animation Timeline",
          "desc": "A keyframe-based animation timeline sits below the viewport. Position, rotation, and scale curves (X/Y/Z) can be authored and previewed in real time. Curves are displayed as coloured splines with draggable keyframe handles.",
          "images": [
            "images/rift1.webp"
          ]
        }
      ]
    },
    {
      "name": "The Backrooms | AdySYNC",
      "icon": "🔦",
      "iconType": "emoji",
      "iconImg": "",
      "accentColor": "#fbbf24",
      "shortDesc": "A Roblox horror experience with a full suite of hand-built game systems.",
      "fullDesc": "An ongoing <font color=\"#38bdf8\">Roblox </font>horror game where I serve as <font color=\"#4ade80\">Lead Programmer</font>. I designed and built the entire backend system architecture: a physics-based <font color=\"#fbbf24\">Generator System</font> with dynamic fuel consumption,<font color=\"#fbbf24\"> fan physics</font>, and<font color=\"#fbbf24\"> real-time status screens</font>; a <font color=\"#fbbf24\">LightSystem</font> supporting global and area-specific blackouts via CollectionService; a modular<font color=\"#fbbf24\"> TimeDoor System</font> for interval-based door logic; a <font color=\"#fbbf24\">Protocol System</font> with layered authorization (username, team, group-rank); and a <font color=\"#fbbf24\">terminal framework </font>fully integrated with the CMDR command library. Every system is <font color=\"#f87171\">modular</font>, <font color=\"#f87171\">well-commented</font>, and <font color=\"#f87171\">built to be extended without touching core logic</font>.",
      "langs": "Lua, Roblox Studio",
      "tags": "Game Dev",
      "status": "wip",
      "link": "https://www.roblox.com/games/10720776665/The-Backrooms-AdySYNC",
      "images": [
        "images/backrooms1.png",
        "images/backrooms2.png",
        "images/backrooms3.png",
        "images/backrooms4.png"
      ],
      "tabs": [
        {
          "title": "Generator System",
          "desc": "The Generator System manages area-specific power through attribute-tagged generator objects (ID, Area, Enabled, FuelLevel). Dynamic fuel consumption scales with fan activity. Includes real-time status screens with color-coded fuel indicators (Normal / Danger / Critical), smooth fan acceleration physics, gas-can refueling with a polished UI, and a dev dashboard for live monitoring.",
          "images": [
            "images/backrooms7.png"
          ]
        },
        {
          "title": "Protocol & Terminal Systems",
          "desc": "A centralized Protocol System handles activation, authorization, and synchronized broadcasting to all directive screens across the site. Authorization is layered (username → team → group rank). The terminal framework auto-initializes all terminals and connects them to CMDR for in-world command execution. A custom Protocol argument type supports fuzzy search and autocomplete via replicated registry scanning.",
          "images": [
            "images/backrooms5.png",
            "images/backrooms6.png"
          ]
        }
      ]
    },
    {
      "name": "SCPF | Artemis",
      "icon": "🧬",
      "iconType": "emoji",
      "iconImg": "",
      "accentColor": "#8f6200",
      "shortDesc": "Actor developer and programmer on a large-scale SCP Foundation Roblox experience.",
      "fullDesc": "Contributed to <font color=\"#7f77dd\">Vistrim's SCPF: Artemis</font> as both an <font color=\"#4ade80\">Actor Developer</font> and a <font color=\"#4ade80\">core programmer</font>. Scripted and integrated a large roster of <font color=\"#fbbf24\">SCP entities</font> — including<font color=\"#fbbf24\"> SCP-610-1 (\"Flesh that Hates\")</font> and several others — and built or contributed to systems including <font color=\"#fbbf24\">Mining</font>, <font color=\"#fbbf24\">Infection</font>, <font color=\"#fbbf24\">Fire</font>, <font color=\"#fbbf24\">Fall Damage</font>, <font color=\"#fbbf24\">Ambience</font>, <font color=\"#fbbf24\">Area</font>, and <font color=\"#fbbf24\">Cloak</font>. The <font color=\"#fbbf24\">Fall Damage</font> system uses Y-coordinate delta tracking with configurable thresholds (15–110 studs), a <font color=\"#f87171\">server-authoritative architecture to prevent exploits</font>, and a client-side kneeling animation trigger for major impacts.",
      "langs": "Lua, Roblox Studio",
      "tags": "Game Dev",
      "status": "complete",
      "link": "https://www.roblox.com/communities/16228589/Artemis-Special-Containment-Procedures-Foundation",
      "images": [
        "images/artemis1.png",
        "images/artemis2.png",
        "images/artemis3.png",
        "images/artemis4.png"
      ],
      "tabs": [
        {
          "title": "SCP-610",
          "desc": "Scripted multiple SCP entities for Artemis, handling AI behaviour, animations, hitboxes, and interaction logic. Entities include SCP-457, SCP-662, SCP-610-1, SCP-610-2, SCP-610-4, SCP-963, SCP-034, and SCP-504. Note: models and animations for these entities were not created by me.",
          "images": [
            "images/scp1.png",
            "images/scp2.png",
            "images/scp3.png"
          ]
        }
      ]
    },
    {
      "name": "Innovation HQ 3.0",
      "icon": "🏢",
      "iconType": "emoji",
      "iconImg": "",
      "accentColor": "#38bdf8",
      "shortDesc": "Lead Programmer on an ongoing Roblox project spanning scripted events through full game systems.",
      "fullDesc": "Serving as <font color=\"#4ade80\">Lead Programmer</font> on<font color=\"#7f77dd\"> Innovation HQ 3.0 </font>since May 2024. Responsible for the scripting architecture across the project, ranging from simple scripted events to complete systems including the <font color=\"#fbbf24\">Door System</font>, <font color=\"#fbbf24\">Infection System</font>, and <font color=\"#fbbf24\">Nametag System</font>. The project is actively in development — systems are built with <font color=\"#f87171\">modularity </font>and <font color=\"#f87171\">extensibility </font>as a priority.",
      "langs": "Lua, Roblox Studio",
      "tags": "Game Dev",
      "status": "wip",
      "link": "https://www.roblox.com/games/18489578811/Innovation-Inc-Reimagined-HQ-3-0",
      "images": [
        "images/innohq1.png",
        "images/innohq2.png"
      ],
      "tabs": []
    }
  ],
  "about": [
    {
      "label": "Background",
      "content": "I'm a software developer with 4+ years of experience across two domains: native C++ application development with OpenGL, and Lua scripting on the Roblox platform. I'm currently studying Computer Science, where C++ is my primary language — with Kotlin on the horizon. I care deeply about writing clean, performant, well-documented code, and I don't ship something until it's done properly &amp; fully.",
      "width": "full"
    },
    {
      "label": "Core Focus",
      "content": "Game systems architecture for <font color=\"#38bdf8\">Roblox </font>projects (<font color=\"#38bdf8\">Lua </font>development), real-time graphics programming, modular framework design, and low-level <font color=\"#38bdf8\">C++</font> development.",
      "width": "normal"
    },
    {
      "label": "Currently Working With",
      "content": "C++ with OpenGL, Lua in Roblox Studio, Git, Visual Studio, and VS Code.",
      "width": "normal"
    }
  ],
  "skills": [
    {
      "title": "Languages",
      "skills": [
        {
          "name": "C++",
          "level": 82,
          "color": "#7f77dd"
        },
        {
          "name": "C#",
          "level": 62,
          "color": "#7f77dd"
        },
        {
          "name": "GLSL",
          "level": 65,
          "color": "#7f77dd"
        },
        {
          "name": "Lua",
          "level": 92,
          "color": "#7f77dd"
        },
        {
          "name": "PHP",
          "level": 77,
          "color": "#7f77dd"
        },
        {
          "name": "Javascript",
          "level": 67,
          "color": "#7f77dd"
        }
      ]
    },
    {
      "title": "Graphics & Engines",
      "skills": [
        {
          "name": "OpenGL",
          "level": 82,
          "color": "#7f77dd"
        },
        {
          "name": "Roblox Studio",
          "level": 95,
          "color": "#7f77dd"
        },
        {
          "name": "Unity",
          "level": 60,
          "color": "#7f77dd"
        },
        {
          "name": "Unreal Engine",
          "level": 24,
          "color": "#7f77dd"
        }
      ]
    },
    {
      "title": "Dev Tools & Software",
      "skills": [
        {
          "name": "Git",
          "level": 85,
          "color": "#7f77dd"
        },
        {
          "name": "Visual Studio",
          "level": 90,
          "color": "#7f77dd"
        },
        {
          "name": "VS Code",
          "level": 86,
          "color": "#7f77dd"
        },
        {
          "name": "Autodesk Fusion",
          "level": 75,
          "color": "#7f77dd"
        }
      ]
    }
  ],
  "experience": [
    {
      "company": "The Backrooms | AdySYNC",
      "years": "2025 — Now",
      "role": "Programmer — Roblox",
      "desc": "Serving as a programmer on an ambitious Roblox horror experience. Designed and built a suite of core game systems from the ground up — including a physics-based Generator System with dynamic fuel consumption and fan mechanics, a modular LightSystem for area-specific blackout events, a TimeDoor System, a Protocol System with layered authorization, and a terminal framework integrated with the CMDR command library. Each system is designed to be modular, well-documented, and easily extendable.",
      "tags": "Lua,Roblox Studio,Game Systems,CMDR,Modular Architecture"
    },
    {
      "company": "Innovation HQ 3.0",
      "years": "May 2024 — Now",
      "role": "Lead Programmer — Roblox",
      "desc": "Working as Lead Programmer on an ongoing Roblox project, responsible for a wide range of systems including Door Systems, Infection Systems, Nametag Systems, and more. Overseeing the scripting architecture from simple scripted events through to full game subsystems.",
      "tags": "Lua,Roblox Studio,Game Systems,Scripting"
    },
    {
      "company": "SCPF | Artemis",
      "years": "Jul 2023 — Mar 2024",
      "role": "Actor Developer & Programmer — Roblox",
      "desc": "Worked as an Actor Developer and one of the main programmers on Vistrim's SCPF: Artemis. Scripted and integrated a wide range of SCP entities — including SCP-457, SCP-662, SCP-610-1, SCP-610-2, SCP-610-4, SCP-963, SCP-034, and SCP-504 — alongside core gameplay systems: Mining, Infection, Fire, Anomaly Actor, Ambience, Area, Fall Damage, and Cloak Systems.",
      "tags": "Lua,Roblox Studio,Actor Development,Game Systems"
    },
    {
      "company": "C++ / OpenGL — Personal Projects",
      "years": "2022 — Now",
      "role": "Systems & Graphics Programmer",
      "desc": "Building native C++ applications with a focus on real-time 3D graphics via OpenGL. Primary project is the RIFT Render Engine — a custom scene editor and renderer originally started as a school project and grown into a full-featured tool with scene save/load, animation timelines, object hierarchy, texture mapping, and a built-in property inspector.",
      "tags": "C++,OpenGL,GLSL,ImGui,Visual Studio,Git"
    }
  ],
  "contact": [
    {
      "label": "GitHub",
      "value": "https://github.com/SamoVR",
      "icon": "🐙"
    },
    {
      "label": "Email",
      "value": "samovr.main@gmail.com",
      "icon": "📧"
    },
    {
      "label": "Discord",
      "value": "samo_vr",
      "icon": "💬"
    }
  ],
  "settings": {
    "terminalEnabled": true,
    "terminalTitle": "guest@samo_vr: ~",
    "terminalLines": [
      {
        "type": "cmd",
        "text": "whoami"
      },
      {
        "type": "out",
        "text": "Samo_VR — Programmer. C++ by day, Lua by night."
      },
      {
        "type": "comment",
        "text": "WHERE IS MY COFFEE?!!"
      },
      {
        "type": "cmd",
        "text": "cat skills.txt"
      },
      {
        "type": "out",
        "text": "C++  · OpenGL · GLSL · Lua · Roblox Studio · Git"
      },
      {
        "type": "cmd",
        "text": "./build.sh --release"
      },
      {
        "type": "out",
        "text": "Compiling..."
      },
      {
        "type": "out",
        "text": "Compiled & Released!"
      }
    ],
    "cursorEffect": true,
    "lockdown": true,
    "lockdownMsg": "This portfolio is currently private. Check back soon.",
    "scrollReveal": true,
    "glitchTitle": true,
    "progressBar": true,
    "counterAnim": true,
    "cardImagePreview": true,
    "konamiEnabled": true,
    "notFound": {
      "title": "404",
      "heading": "Lost in the build folder.",
      "message": "The page you're looking for doesn't exist — it might have been moved, renamed, or never built in the first place.",
      "buttonText": "← Back to Home",
      "buttonLink": "index.html"
    }
  },
  pass: 'SamoLeDev'
};

// keys that get synced between admin <-> portfolio via localStorage
const DATA_KEYS = ['projects', 'about', 'skills', 'experience', 'contact', 'settings'];

function loadState(k) {
  const stored = STORE.get(k);
  return stored !== null ? stored : JSON.parse(JSON.stringify(DEFAULT[k]));
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

// ── TOAST ──
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2400);
}

// ── CLIPBOARD ──
// Safe copy helper. Never call this via inline onclick string-building with
// interpolated user content — always wire it through addEventListener +
// data-attributes (see attachCopyHandlers in portfolio.js / admin.js).
// This is what the old code got wrong: building onclick="copyText('...')"
// strings by interpolating arbitrary user text broke the instant that text
// contained a quote or apostrophe, since it corrupts the HTML attribute
// itself (not just the JS string inside it).
function copyText(txt) {
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
  showToast('✓ Copied to clipboard');
}

// ── RENDER ICON (emoji or uploaded image) ──
// Projects can now have iconType: 'emoji' | 'image'. This renders the right
// markup for either, used by both the project grid and the detail modal.
function renderIconMarkup(item, fallbackEmoji) {
  if (item && item.iconType === 'image' && item.iconImg) {
    return `<img src="${esc(item.iconImg)}" alt="">`;
  }
  return esc(item && item.icon ? item.icon : fallbackEmoji);
}
