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
// the DEFAULT object below directly and push that.
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

// ── DEFAULT CONTENT ──
// Project fields: name, slug, icon / iconType / iconImg, accentColor, shortDesc,
// fullDesc (HTML), langs, tags, status ('complete' | 'wip'), link, images,
// tabs (systems). Optional extras used by the redesigned site: year, role,
// featured, videoUrl (YouTube showcase), highlights (bullet list),
// demo ('medical' | 'samos' mounts an interactive replica).
// Systems (tabs) take: title, desc, images, videoUrl, and optionally slug,
// tagline, highlights, demo, latest (shown as "Latest release" on the page).
// Image paths may also point at .mp4 clips; they play inline, muted and looped.
const DEFAULT = {
  "projects": [
    {
      "name": "RIFT | Render Engine",
      "slug": "rift-render-engine",
      "icon": "🎮",
      "iconType": "image",
      "iconImg": "images/riftlogo.webp",
      "accentColor": "#7f77dd",
      "shortDesc": "A custom 3D scene editor and real-time renderer built entirely in C++ using OpenGL.",
      "fullDesc": "Originally started as a school project, <font color=\"#7f77dd\">RIFT </font>grew into a fully-featured render engine and scene editor. Built solo in <font color=\"#38bdf8\">C++</font> using <font color=\"#38bdf8\">OpenGL</font>, <font color=\"#38bdf8\">ImGui</font>, <font color=\"#38bdf8\">json</font>, and <font color=\"#38bdf8\">stbimage</font>. Features include a scene hierarchy, transform controls (position/rotation/scale), texture mapping, animation timeline with keyframe curves, scene save/load, and a property inspector panel. Every system was written from scratch, this was about understanding how engines work, not just using one.",
      "langs": "C++, OpenGL, GLSL, ImGui",
      "tags": "Graphics, Tools",
      "status": "complete",
      "role": "Solo developer",
      "link": "https://github.com/SamoVR/SamosCircus2/tree/master/RenderEngine",
      "highlights": [
        "Every system written from scratch in C++",
        "Scene hierarchy, inspector & transform tools",
        "Keyframe animation timeline with curves",
        "Scene save / load"
      ],
      "images": [
        "images/rift5.webp",
        "images/rift4.webp",
        "images/rift3.webp"
      ],
      "tabs": [
        {
          "title": "Scene Editor",
          "desc": "The editor exposes a full scene hierarchy with an object list panel, a 3D viewport, and a property inspector. Objects can be added, duplicated, or removed at runtime. Each object holds its own transform, texture reference, and name, all editable live.",
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
      "slug": "the-backrooms-adysync",
      "icon": "🔦",
      "iconType": "image",
      "iconImg": "images/backroomslogo.webp",
      "accentColor": "#fbbf24",
      "shortDesc": "A Roblox horror experience where I build the game systems: power, doors, protocols, an in-world terminal and a medical system.",
      "fullDesc": "An ongoing <font color=\"#38bdf8\">Roblox </font>horror game where I serve as <font color=\"#4ade80\">Systems Programmer</font>. I designed and built the backend system architecture: a physics-based <font color=\"#fbbf24\">Generator System</font> with dynamic fuel consumption, fan physics and real-time status screens; a <font color=\"#fbbf24\">LightSystem</font> supporting global and area-specific blackouts via CollectionService; a modular <font color=\"#fbbf24\">TimeDoor System</font>; <font color=\"#fbbf24\">SAM-OS</font>, an in-world terminal on top of CMDR that drives remote door lockdowns and a <font color=\"#fbbf24\">Protocol System</font> with layered authorization; and the <font color=\"#fbbf24\">Medical Examine System</font>, a server-authoritative triage UI. Every system is <font color=\"#f87171\">modular</font>, <font color=\"#f87171\">documented</font>, and <font color=\"#f87171\">built to be extended without touching core logic</font>. Open a system below for the full breakdown, videos, and two of them you can try right here in the browser.",
      "langs": "Lua, Roblox Studio",
      "tags": "Game Dev, UI",
      "status": "wip",
      "year": "2025 – Now",
      "role": "Systems Programmer",
      "featured": true,
      "link": "https://www.roblox.com/games/10720776665/The-Backrooms-AdySYNC",
      "highlights": [
        "3 documented systems, 2 playable in your browser",
        "Server-authoritative doors, protocols and medical data",
        "SAM-OS: CMDR-based terminal with live door progress",
        "Medical Examine System with a live triage UI"
      ],
      "images": [
        "images/backrooms1.webp",
        "images/backrooms2.webp",
        "images/backrooms3.webp",
        "images/backrooms4.webp"
      ],
      "tabs": [
        {
          "title": "Medical Examine System",
          "slug": "medical-examine-system",
          "latest": true,
          "tagline": "Examine sessions, health data & a live healing UI",
          "desc": "<p>A player holding the examining clipboard can check another player's injuries limb by limb. The examiner clicks a target, the target accepts, and a live healing UI opens with the patient's health and conditions, updating the moment anything changes.</p><blockquote><b>Server owns everything.</b> Clients never read character data or decide anything on their own. Every request is validated by the server, and the examiner only ever sees what the server sends.</blockquote><h3>Session flow</h3><ol><li>The examiner clicks a highlighted player with the clipboard equipped. The server ignores self-exams, dead targets, a target with a pending request, or an examiner already in a session.</li><li>The target gets an <b>Incoming Request</b> popup with a draining timer; ignored, it declines itself after 15 seconds.</li><li>On accept, the healing UI opens and the patient sees a \"Being examined by …\" label.</li><li>Health and condition changes stream in; anything inside a 0.1 s window is coalesced into one update.</li></ol><p>A session ends on a manual close, death, the patient moving more than 20 studs away (checked every 1.5 s), or either player leaving. Both clients share <b>one teardown path</b>.</p><h3>Health rules</h3><p>Each character carries a <code>Medical</code> folder with one NumberValue per R15 body part, plus a <code>Condition</code> attribute (Bleeding, Burn, Fracture…). New condition types need no code change. Parts are grouped into six R6 zones, and <b>a zone is only as healthy as its weakest part</b>, so one destroyed hand turns the whole arm black. Quick View shows the zone average instead.</p><ul><li><b>81–100%</b> white and <b>61–80%</b> yellow: Stable</li><li><b>31–60%</b> orange: Caution</li><li><b>1–30%</b> red and <b>0%</b> black: Critical</li></ul><h3>The healing UI</h3><p>Four panels re-render from the same payload: a <b>Triage Card</b>, a clickable <b>Body Diagram</b>, an <b>Overview</b> of the selected zone and a <b>Quick View</b> of every zone. The console pops in, limbs thicken their outline on hover and flash red when they lose health, Critical labels pulse, and Quick View bars fill while the percentages count up. Every cosmetic effect runs client-side only.</p>",
          "videoUrl": "https://www.youtube.com/watch?v=VGKnKUkq2TM",
          "demo": "medical",
          "highlights": [
            "Every remote call validated by the server",
            "Updates coalesced into 0.1 s batches",
            "4 live panels · 6 body zones · 15 tracked parts",
            "Shipped with full maintenance documentation"
          ],
          "images": [
            "images/medical5.webp",
            "images/medical1.webp",
            "images/medical2.webp",
            "images/medical3.webp",
            "images/medical4.webp"
          ]
        },
        {
          "title": "SAM-OS Terminal",
          "slug": "sam-os-terminal",
          "tagline": "In-world command terminal for doors, protocols & alerts",
          "desc": "<p>SAM-OS is the in-game admin console used to control facility systems: door lockdowns, security protocols and site-wide alerts. It looks and behaves like a retro amber CRT terminal and is built on <b>CMDR</b>, which I reskinned and extended for the game, including a custom inline progress line.</p><h3>Three layers</h3><ul><li><b>The terminal</b> is purely visual: output, a blinking cursor, an autocomplete dropdown. It doesn't know what a door is.</li><li><b>CMDR</b> validates the typed command and its arguments, then runs the command's code <b>on the server</b>, so nobody can unlock doors by editing their own client.</li><li><b>Door &amp; protocol systems</b> live in the map and know how to change state, with the right animation, sound and checks.</li></ul><blockquote><b>Modular by design.</b> Each layer only talks to the one below it through a tag, an attribute or an event name. Adding a door or a protocol is a data change, not a code change.</blockquote><h3>Remote doors</h3><p>Doors are tagged <code>RemoteDoor</code> and found by their <code>Codename</code> attribute, which also feeds autocomplete. A dispatch table picks a handler by <code>Type</code>: <b>Heavy</b> (a slab that lifts), <b>PPR</b> (slides along its own facing) or <b>EmergencyBlast</b> (two halves, bell, prelocks and flashing alarms). <code>lockdown * true</code> seals the whole facility, each door with its own progress bar; doors that are busy, already in that state or <code>Broken</code> are skipped and summarised. All door state lives on the door itself, so many doors can move in the same frame.</p><h3>Protocols &amp; authorization</h3><p>Site-wide alert levels from Green to Contingency; only one can be active, and activating a new one replaces the old. Access is two-layered: a whitelist gate (username → team → group rank) decides who may run <code>protocol</code> at all, then each protocol has its own minimum rank. Activation just writes a level number, and the directive screens around the map react to it independently.</p><h3>Terminals in the world</h3><p>Any model tagged <code>Terminal</code> gets a proximity prompt automatically, including ones tagged at runtime. The GUI is rebuilt fresh on every client instead of cloned, so each player gets live animations (scan sweep, pulsing status, session clock), and the whole look is driven by a single <code>THEME</code> table.</p>",
          "videoUrl": "https://youtu.be/IFKqM6eMltk",
          "demo": "samos",
          "highlights": [
            "Commands validated by CMDR, executed on the server",
            "3 door types behind one Open/Close dispatch table",
            "Facility-wide lockdown with per-door progress",
            "Two-layer protocol authorization"
          ],
          "images": [
            "images/backrooms5.webp",
            "images/backrooms6.webp",
            "images/backrooms7.webp",
            "images/backrooms8.webp"
          ]
        },
        {
          "title": "Generator System",
          "slug": "generator-system",
          "tagline": "Area power, fuel consumption & fan physics",
          "desc": "The Generator System manages area-specific power through attribute-tagged generator objects (ID, Area, Enabled, FuelLevel). Dynamic fuel consumption scales with fan activity. Includes real-time status screens with color-coded fuel indicators (Normal / Danger / Critical), smooth fan acceleration physics, gas-can refueling with a polished UI, and a dev dashboard for live monitoring.",
          "videoUrl": "https://youtu.be/K98QBrEiATU",
          "images": [
            "images/backrooms9.webp"
          ]
        }
      ]
    },
    {
      "name": "SCPF | Artemis",
      "slug": "scpf-artemis",
      "icon": "🧬",
      "iconType": "image",
      "iconImg": "images/artemislogo.webp",
      "accentColor": "#d4a017",
      "shortDesc": "Actor developer and programmer on a large-scale SCP Foundation Roblox experience.",
      "fullDesc": "Contributed to <font color=\"#7f77dd\">Vistrim's SCPF: Artemis</font> as both an <font color=\"#4ade80\">Actor Developer</font> and a <font color=\"#4ade80\">core programmer</font>. Scripted and integrated a large roster of <font color=\"#fbbf24\">SCP entities</font>, including<font color=\"#fbbf24\"> SCP-610-1 (\"Flesh that Hates\")</font> and several others, and built or contributed to systems including <font color=\"#fbbf24\">Mining</font>, <font color=\"#fbbf24\">Infection</font>, <font color=\"#fbbf24\">Fire</font>, <font color=\"#fbbf24\">Fall Damage</font>, <font color=\"#fbbf24\">Ambience</font>, <font color=\"#fbbf24\">Area</font>, and <font color=\"#fbbf24\">Cloak</font>. The <font color=\"#fbbf24\">Fall Damage</font> system uses Y-coordinate delta tracking with configurable thresholds (15–110 studs), a <font color=\"#f87171\">server-authoritative architecture to prevent exploits</font>, and a client-side kneeling animation trigger for major impacts.",
      "langs": "Lua, Roblox Studio",
      "tags": "Game Dev",
      "status": "complete",
      "year": "2023 – 2024",
      "role": "Actor Developer & Programmer",
      "link": "https://www.roblox.com/communities/16228589/Artemis-Special-Containment-Procedures-Foundation",
      "highlights": [
        "8 SCP entities scripted & integrated",
        "Server-authoritative fall damage",
        "Mining, infection, fire & cloak systems"
      ],
      "images": [
        "images/artemis1.webp",
        "images/artemis2.webp",
        "images/artemis3.webp",
        "images/artemis4.webp"
      ],
      "tabs": [
        {
          "title": "SCP-610",
          "desc": "SCP-610's main abilities such as roar, or attack. \nNote: models and animations for these entities were not created by me.",
          "images": [
            "images/scp1.webp",
            "images/scp2.webp",
            "images/scp3.webp"
          ]
        }
      ]
    },
    {
      "name": "Innovation HQ 3.0",
      "slug": "innovation-hq",
      "icon": "🏢",
      "iconType": "image",
      "iconImg": "images/innohqlogo.webp",
      "accentColor": "#38bdf8",
      "shortDesc": "Lead Programmer on an ongoing Roblox project spanning scripted events through full game systems.",
      "fullDesc": "Serving as <font color=\"#4ade80\">Lead Programmer</font> on<font color=\"#7f77dd\"> Innovation HQ 3.0 </font>since May 2024. Responsible for the scripting architecture across the project, ranging from simple scripted events to complete systems including the <font color=\"#fbbf24\">Door System</font>, <font color=\"#fbbf24\">Infection System</font>, and <font color=\"#fbbf24\">Nametag System</font>. The project is actively in development, systems are built with <font color=\"#f87171\">modularity </font>and <font color=\"#f87171\">extensibility </font>as a priority.",
      "langs": "Lua, Roblox Studio",
      "tags": "Game Dev",
      "status": "wip",
      "year": "2024 – Now",
      "role": "Lead Programmer",
      "link": "https://www.roblox.com/games/18489578811/Innovation-Inc-Reimagined-HQ-3-0",
      "highlights": [
        "Lead programmer since May 2024",
        "Door, infection & nametag systems",
        "Modular, extensible architecture"
      ],
      "images": [
        "images/innohq3.webp",
        "images/innohq1.webp",
        "images/innohq2.webp"
      ],
      "tabs": []
    },
    {
      "name": "Samo's Scripting Place",
      "slug": "samos-scripting-place",
      "icon": "💻",
      "iconType": "image",
      "iconImg": "images/sspicon.webp",
      "accentColor": "#ff5c6c",
      "shortDesc": "Systems and experiments I build on Roblox in my free time.",
      "fullDesc": "A personal <font color=\"#7f77dd\">Roblox </font>project where I showcase various <font color=\"#fbbf24\">systems </font>and <font color=\"#fbbf24\">experiments </font>I've built in my free time, ranging from <font color=\"#fbbf24\">gameplay mechanics</font> to <font color=\"#f87171\">technical scripting</font> projects.",
      "langs": "Lua, Roblox Studio",
      "tags": "Game Dev, Tools",
      "status": "wip",
      "role": "Solo developer",
      "link": "https://www.roblox.com/games/16847910715/Samos-Scripting-Place",
      "highlights": [
        "Soul & demon possession system",
        "Raycast field-of-view visualizer",
        "Personal R&D sandbox"
      ],
      "images": [
        "images/ssp.webp",
        "images/soulsys.mp4",
        "images/vissys.mp4"
      ],
      "tabs": [
        {
          "title": "Soul System",
          "desc": "A system that lets you exit your body as a spiritual being. You can exit your body as either a soul or a demon. Where a soul can roam the map with other souls or get to places normal mortals can't. A demon on the other hand can consume these souls and steal their body if left unattended. However, demons are sensitive to sacred objects such as crucifixes and can't get near them or else they will be diminished or forced to get out of possessed bodies.",
          "videoUrl": "",
          "images": [
            "images/soulsys.mp4"
          ]
        },
        {
          "title": "Vision System",
          "desc": "By pressing V on your keyboard, and hovering your mouse over players, you can click on them to initiate raycast visualization from their camera. This essentially visualizes the exact field of players vision. This system is in its raw form and could have many uses, such as detecting whether a player is able to see you, or detecting if a players vision is obstructed. Supports both first person and third person mode.",
          "videoUrl": "",
          "images": [
            "images/vissys.mp4"
          ]
        }
      ]
    }
  ],
  "about": [
    {
      "label": "Background",
      "content": "I'm a software developer with 4+ years of experience across two domains: native C++ application development with OpenGL, and Lua scripting on the Roblox platform. I'm currently studying Computer Science, where C++ is my primary language, with Kotlin on the horizon. I care deeply about writing clean, performant, well-documented code, and I don't ship something until it's done properly &amp; fully.",
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
        { "name": "Lua", "level": 92, "color": "#7f77dd" },
        { "name": "C++", "level": 82, "color": "#7f77dd" },
        { "name": "PHP", "level": 77, "color": "#7f77dd" },
        { "name": "Javascript", "level": 67, "color": "#7f77dd" },
        { "name": "GLSL", "level": 65, "color": "#7f77dd" },
        { "name": "C#", "level": 62, "color": "#7f77dd" }
      ]
    },
    {
      "title": "Graphics & Engines",
      "skills": [
        { "name": "Roblox Studio", "level": 95, "color": "#7f77dd" },
        { "name": "OpenGL", "level": 82, "color": "#7f77dd" },
        { "name": "Unity", "level": 60, "color": "#7f77dd" },
        { "name": "Unreal Engine", "level": 24, "color": "#7f77dd" }
      ]
    },
    {
      "title": "Dev Tools & Software",
      "skills": [
        { "name": "Visual Studio", "level": 90, "color": "#7f77dd" },
        { "name": "VS Code", "level": 86, "color": "#7f77dd" },
        { "name": "Git", "level": 85, "color": "#7f77dd" },
        { "name": "Autodesk Fusion", "level": 75, "color": "#7f77dd" }
      ]
    }
  ],
  "experience": [
    {
      "company": "The Backrooms | AdySYNC",
      "years": "2025 - Now",
      "role": "Programmer - Roblox",
      "desc": "Serving as a programmer on an ambitious Roblox horror experience. Designed and built a suite of core game systems from the ground up, including a physics-based Generator System with dynamic fuel consumption and fan mechanics, a modular LightSystem for area-specific blackout events, a TimeDoor System, a Protocol System with layered authorization, a terminal framework integrated with the CMDR command library, and a server-authoritative Medical Examine System with a live triage UI. Each system is designed to be modular, well-documented, and easily extendable.",
      "tags": "Lua,Roblox Studio,Game Systems,CMDR,UI,Modular Architecture"
    },
    {
      "company": "Innovation HQ 3.0",
      "years": "May 2024 - Now",
      "role": "Lead Programmer - Roblox",
      "desc": "Working as Lead Programmer on an ongoing Roblox project, responsible for a wide range of systems including Door Systems, Infection Systems, Nametag Systems, and more. Overseeing the scripting architecture from simple scripted events through to full game subsystems.",
      "tags": "Lua,Roblox Studio,Game Systems,Scripting"
    },
    {
      "company": "SCPF | Artemis",
      "years": "Jul 2023 - Mar 2024",
      "role": "Actor Developer & Programmer - Roblox",
      "desc": "Worked as an Actor Developer and one of the main programmers on Vistrim's SCPF: Artemis. Scripted and integrated a wide range of SCP entities, including SCP-457, SCP-662, SCP-610-1, SCP-610-2, SCP-610-4, SCP-963, SCP-034, and SCP-504, alongside core gameplay systems: Mining, Infection, Fire, Anomaly Actor, Ambience, Area, Fall Damage, and Cloak Systems.",
      "tags": "Lua,Roblox Studio,Actor Development,Game Systems"
    },
    {
      "company": "C++ / OpenGL / Lua - Personal Projects",
      "years": "2022 - Now",
      "role": "Systems & Graphics Programmer",
      "desc": "Building native C++ applications with a focus on real-time 3D graphics via OpenGL. The biggest is the RIFT Render Engine, a custom scene editor and renderer that started as a school project and grew into a full-featured tool with scene save/load, animation timelines, an object hierarchy, texture mapping, and a built-in property inspector. Alongside it sit lighter projects like Samo's Scripting Place, a sandbox of Roblox systems built for fun.",
      "tags": "C++,OpenGL,GLSL,ImGui,Visual Studio,Git,Lua,Roblox Studio"
    }
  ],
  "contact": [
    {
      "label": "GitHub",
      "value": "https://github.com/SamoVR",
      "icon": "🐙",
      "action": "open"
    },
    {
      "label": "Email",
      "value": "samovr.main@gmail.com",
      "icon": "📧",
      "action": "copy"
    },
    {
      "label": "Discord",
      "value": "samo_vr",
      "icon": "💬",
      "action": "copy"
    }
  ],
  "settings": {
    "hero": {
      "eyebrow": "Systems & Graphics Programmer",
      "bio": "I build <strong>game systems in Lua for Roblox</strong> and <strong>real-time graphics in C++ / OpenGL</strong>. From server-authoritative gameplay to a hand-written render engine, I've spent 4+ years shipping real projects, and I don't call something done until it's done properly.",
      "roles": [
        "build game systems in Lua.",
        "write render engines in C++.",
        "design server-authoritative UI.",
        "document everything I ship."
      ],
      "stats": [
        { "value": "4", "suffix": "+", "label": "Years shipping code" },
        { "value": "7", "suffix": "M+", "label": "Player visits on my work" },
        { "auto": "projects", "label": "Featured projects" },
        { "auto": "systems", "label": "Systems documented" }
      ]
    },
    // Snippets typed out by the editor card in the hero. Short, illustrative
    // excerpts written from the project docs; swap in real code any time.
    "heroCode": [
      {
        "file": "MedicalExamineService.lua",
        "lang": "lua",
        "code": "-- Server owns everything: clients only see what we send.\nRequestExamine.OnServerEvent:Connect(function(examiner, target)\n\tif not isPlayer(target) or target == examiner then return end\n\tif sessions[examiner] or pending[target] then return end\n\tif not isAlive(target) then return end\n\n\tpending[target] = examiner\n\tExamineRequested:FireClient(target, examiner.Name)\nend)"
      },
      {
        "file": "ZoneHealth.lua",
        "lang": "lua",
        "code": "-- A zone is only as healthy as its weakest part.\nlocal function readZone(medical, partNames)\n\tlocal lowest, sum, count = nil, 0, 0\n\tfor _, name in partNames do\n\t\tlocal value = medical:FindFirstChild(name)\n\t\tif value then\n\t\t\tlocal hp = math.clamp(value.Value, 0, 100)\n\t\t\tlowest = math.min(lowest or hp, hp)\n\t\t\tsum, count = sum + hp, count + 1\n\t\tend\n\tend\n\tif count == 0 then return \"unknown\", \"unknown\" end\n\treturn lowest, sum / count\nend"
      },
      {
        "file": "Renderer.cpp",
        "lang": "cpp",
        "code": "// RIFT: draw every object in the scene hierarchy\nvoid Renderer::drawScene(const Scene& scene,\n                         const Camera& cam) {\n    shader.use();\n    shader.setMat4(\"uView\", cam.view());\n    shader.setMat4(\"uProj\", cam.projection(aspect));\n\n    for (const auto& obj : scene.objects()) {\n        shader.setMat4(\"uModel\", obj.transform.matrix());\n        (obj.texture ? *obj.texture : fallback).bind(0);\n        obj.mesh->draw();\n    }\n}"
      }
    ],
    "terminalEnabled": true,
    "terminalTitle": "guest@samo_vr: ~",
    "terminalLines": [
      {
        "type": "cmd",
        "text": "whoami"
      },
      {
        "type": "out",
        "text": "Samo_VR - Programmer. Lua by day, C++ by night."
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
    "lockdown": false,
    "lockdownMsg": "This portfolio is currently private. Check back soon.",
    "scrollReveal": true,
    "heroReveal": true,
    "progressBar": true,
    "cardImagePreview": true,
    "konamiEnabled": true,
    "currentlyBuilding": "Currently scripting",
    "statusBadgeEnabled": true,
    "notFound": {
      "title": "404",
      "heading": "Lost in the build folder.",
      "message": "The page you're looking for doesn't exist, it might have been moved, renamed, or never built in the first place.",
      "buttonText": "← Back to Home",
      "buttonLink": "/"
    }
  },
  // SHA-256 of the admin password (never store the plain password here: this
  // file is public). Generate a new one from Admin → Settings → Change Password.
  passHash: '15288750a0168c973a1cb743cb11f0f1221d1621bd095d6b1a17066a6b58e97e'
}

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
