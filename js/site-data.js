/* ════════════════════════════════════════════════
   SITE DATA - everything shown on the website
   Edit it in admin.html, click Export, and replace this file with the
   downloaded one. (Hand-editing is fine too.)
   ════════════════════════════════════════════════ */

// ── DEFAULT CONTENT ──
// Project fields: name, slug, icon / iconType / iconImg, accentColor, shortDesc,
// fullDesc (HTML), langs, tags, status ('complete' | 'wip'), link, images,
// tabs (systems). Optional extras: year, role, featured, videoUrl (YouTube
// showcase), highlights (bullet list), demo ('medical' | 'samos' mounts an
// interactive replica).
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
      "shortDesc": "My own 3D scene editor and real-time renderer, written from scratch in C++ and OpenGL.",
      "fullDesc": "<p>RIFT started as a school project and kept growing until it was a full render engine with its own scene editor. I built it alone in C++, with OpenGL for rendering, ImGui for the interface, json for scene files and stb_image for textures.</p><p>It has a scene hierarchy, transform controls for position, rotation and scale, texture mapping, an animation timeline with keyframe curves, a property inspector, and scene saving and loading. I wrote every system myself, because the whole point was to learn how an engine works on the inside.</p>",
      "langs": "C++, OpenGL, GLSL, ImGui",
      "tags": "Graphics, Tools",
      "status": "complete",
      "role": "Solo developer",
      "link": "https://github.com/SamoVR/SamosCircus2/tree/master/RenderEngine",
      "highlights": [
        "Every system written from scratch in C++",
        "Scene hierarchy, inspector and transform tools",
        "Keyframe animation timeline with curves",
        "Saves and loads whole scenes"
      ],
      "images": [
        "images/rift5.webp",
        "images/rift4.webp",
        "images/rift3.webp"
      ],
      "tabs": [
        {
          "title": "Scene Editor",
          "tagline": "Hierarchy, viewport and inspector",
          "desc": "<p>The editor has an object list that shows the scene hierarchy, a 3D viewport and a property inspector. You can add, duplicate or remove objects while it runs, and each object keeps its own name, transform and texture, all editable live.</p>",
          "images": [
            "images/rift2.webp"
          ]
        },
        {
          "title": "Animation Timeline",
          "tagline": "Keyframes and curves for every transform",
          "desc": "<p>The animation timeline sits under the viewport. You key position, rotation and scale on X, Y and Z and preview the result in real time. Each curve is drawn as a coloured spline with keyframe handles you can drag.</p>",
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
      "shortDesc": "A Roblox horror game where I'm the systems programmer: power, doors, protocols, terminals, medical, all of it.",
      "fullDesc": "<p>An ongoing Roblox horror game where I'm the systems programmer. I designed and built the backend:</p><ul><li>a physics-based generator system with fuel consumption, fan physics and live status screens</li><li>a light system for global and area-specific blackouts, driven by CollectionService</li><li>a modular time door system</li><li>SAM-OS, an in-world terminal built on CMDR that runs remote door lockdowns and a protocol system with layered authorization</li><li>the Medical Examine System, a server-authoritative triage UI</li></ul><p>Every system is modular and documented, and new features plug in without touching the core logic. The write-ups below explain how they work, and you can try SAM-OS right here in your browser.</p>",
      "langs": "Lua, Roblox Studio",
      "tags": "Game Dev, UI",
      "status": "wip",
      "year": "2025 – now",
      "role": "Systems Programmer",
      "featured": true,
      "link": "https://www.roblox.com/games/10720776665/The-Backrooms-AdySYNC",
      "highlights": [
        "SAM-OS runs in your browser, so you can try it",
        "Every action is checked on the server, so exploiters can't fake it",
        "SAM-OS terminal built on CMDR",
        "Medical system with a live triage UI"
      ],
      "images": [
        "images/backrooms1.webp",
        "images/backrooms2.webp",
        "images/backrooms3.webp",
        "images/backrooms4.webp"
      ],
      "tabs": [
        /*
        {
          "title": "Medical Examine System",
          "slug": "medical-examine-system",
          "tagline": "Check another player's injuries, limb by limb, live",
          "desc": "<p>Grab the clipboard, click another player, and once they accept you get a live readout of their injuries, limb by limb. It works like a hospital chart: the character holds the real readings, the server collects them, and the UI only shows what the server sends.</p><blockquote>The server owns everything. Clients never read character data or make decisions on their own; the server validates every request, and the examiner only ever sees what it sends.</blockquote><h3>How a session runs</h3><ol><li>The examiner clicks a highlighted player with the clipboard equipped. The server ignores self-exams, dead targets, a target who already has a pending request, and an examiner who's already in a session.</li><li>The target gets an <b>Incoming Request</b> popup with a draining timer. If they ignore it, it declines itself after 15 seconds.</li><li>Once they accept, the healing UI opens and the patient sees a \"Being examined by …\" label.</li><li>Health and condition changes stream in, and anything inside a 0.1 s window gets merged into one update.</li></ol><p>A session ends when someone closes it, either player dies or leaves, or the patient moves more than 20 studs away (checked every 1.5 s). Both clients go through the same single teardown path.</p><h3>Health rules</h3><p>Each character carries a <code>Medical</code> folder with one NumberValue per R15 body part, plus a <code>Condition</code> attribute (Bleeding, Burn, Fracture…), so new condition types need no code changes. The parts are grouped into six R6 zones, and a zone is only as healthy as its weakest part: one destroyed hand turns the whole arm black. Quick View shows the zone average instead.</p><ul><li><b>81–100%</b> white and <b>61–80%</b> yellow: Stable</li><li><b>31–60%</b> orange: Caution</li><li><b>1–30%</b> red and <b>0%</b> black: Critical</li></ul><h3>The healing UI</h3><p>Four panels re-render from the same payload: a <b>Triage Card</b>, a clickable <b>Body Diagram</b>, an <b>Overview</b> of the selected zone and a <b>Quick View</b> of every zone. The console pops in, limbs get a thicker outline on hover and flash red when they lose health, Critical labels pulse, and the Quick View bars fill while the percentages count up. All the cosmetic effects run on the client only.</p>",
          "videoUrl": "https://www.youtube.com/watch?v=VGKnKUkq2TM",
          "demo": "medical",
          "highlights": [
            "The server validates every remote call",
            "Updates merged into 0.1 s batches",
            "4 live panels, 6 body zones, 15 tracked parts",
            "Shipped with full maintenance docs"
          ],
          "images": [
            "images/medical5.webp",
            "images/medical1.webp",
            "images/medical2.webp",
            "images/medical3.webp",
            "images/medical4.webp"
          ]
        },
        */
        {
          "title": "SAM-OS Terminal",
          "slug": "sam-os-terminal",
          "tagline": "The in-game terminal for doors, protocols and alerts",
          "desc": "<p>SAM-OS is the in-game terminal that runs the facility: door lockdowns, security protocols and site-wide alerts. It's a retro amber CRT terminal built on <b>CMDR</b>, which I restyled and extended for the game, down to a fully custom progress line.</p><h3>Three layers</h3><ul><li><b>The terminal</b> only draws things: output, a blinking cursor, an autocomplete dropdown. It has no idea what a door is.</li><li><b>CMDR</b> checks the typed command and its arguments, then runs the command's code on the server, so nobody can unlock doors by editing their own client.</li><li><b>The door and protocol systems</b> live in the map and know how to change state, with the right animation, sound and checks.</li></ul><blockquote>Each layer only talks to the one below it, through a tag, an attribute or an event name. Adding a door or a protocol is a data change; the code stays as it is.</blockquote><h3>Remote doors</h3><p>Doors are tagged <code>RemoteDoor</code> and looked up by their <code>Codename</code> attribute, which also feeds autocomplete. A dispatch table picks the handler from the door's <code>Type</code>: <b>Heavy</b> is a slab that lifts, <b>PPR</b> slides along its own facing, and <b>EmergencyBlast</b> splits into two halves with a bell, prelocks and flashing alarms.</p><p><code>lockdown * true</code> seals the whole facility, and every door gets its own progress bar. Doors that are busy, already in that state or marked <code>Broken</code> are skipped and listed in a summary. Each door keeps its state on itself, so any number of them can move in the same frame.</p><h3>Protocols and authorization</h3><p>Protocols are site-wide alert levels from Green to Contingency. Only one can be active, so activating a new one replaces the old one. Access has two layers: a whitelist (username, then team, then group rank) decides who can run <code>protocol</code> at all, and each protocol sets its own minimum rank on top of that. Activating one just writes a level number, and the directive screens around the map react to it on their own.</p><h3>Terminals in the world</h3><p>Any model tagged <code>Terminal</code> gets a proximity prompt automatically, even if it's tagged at runtime. The GUI is built fresh on every client instead of cloned, so each player gets live animations (scan sweep, pulsing status, session clock), and a single <code>THEME</code> table drives the whole look.</p>",
          "videoUrl": "https://youtu.be/IFKqM6eMltk",
          "demo": "samos",
          "highlights": [
            "CMDR validates every command, the server runs it",
            "Three door types behind one Open/Close dispatch table",
            "Facility-wide lockdown with a progress bar per door",
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
          "tagline": "Area power, fuel and fan physics",
          "desc": "<p>Each area gets its power from generator objects tagged with attributes (<code>ID</code>, <code>Area</code>, <code>Enabled</code>, <code>FuelLevel</code>). Fuel burns faster the harder the fans are working, and the fans speed up and slow down smoothly instead of snapping.</p><p>Status screens show the fuel level in real time, colour-coded Normal, Danger or Critical. Players refuel with gas cans through their own refuel UI, and there's a dev dashboard for watching every generator live.</p>",
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
      "shortDesc": "Actor developer and one of the main programmers on a large SCP Foundation game on Roblox.",
      "fullDesc": "<p>I worked on Vistrim's SCPF: Artemis as an actor developer and one of the core programmers. I scripted and integrated a long list of SCP entities, SCP-610-1 (\"Flesh that Hates\") among them, and built or worked on the mining, infection, fire, fall damage, ambience, area and cloak systems.</p><p>Fall damage tracks how far your character drops on the Y axis, against configurable thresholds between 15 and 110 studs. The server decides the damage so exploiters can't get around it, and a hard landing triggers a kneeling animation on the client.</p>",
      "langs": "Lua, Roblox Studio",
      "tags": "Game Dev",
      "status": "complete",
      "year": "2023 – 2024",
      "role": "Actor Developer & Programmer",
      "link": "https://www.roblox.com/communities/16228589/Artemis-Special-Containment-Procedures-Foundation",
      "highlights": [
        "8 SCP entities scripted and integrated",
        "Server-authoritative fall damage",
        "Mining, infection, fire and cloak systems"
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
          "desc": "<p>SCP-610's main abilities, like its roar and its attack.</p><p>The models and animations for these entities were made by other people. The scripting is mine.</p>",
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
      "shortDesc": "Lead programmer on an ongoing Roblox project, from small scripted events up to full game systems.",
      "fullDesc": "<p>I've been the lead programmer on Innovation HQ 3.0 since May 2024. I'm in charge of the scripting architecture for the whole project, from simple scripted events to complete systems like doors, infection and nametags.</p><p>The game is still in active development, so everything is built to be modular and easy to extend.</p>",
      "langs": "Lua, Roblox Studio",
      "tags": "Game Dev",
      "status": "wip",
      "year": "2024 – now",
      "role": "Lead Programmer",
      "link": "https://www.roblox.com/games/18489578811/Innovation-Inc-Reimagined-HQ-3-0",
      "highlights": [
        "Lead programmer since May 2024",
        "Door, infection and nametag systems",
        "Modular systems that are easy to extend"
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
      "shortDesc": "My Roblox sandbox for the systems I build in my free time.",
      "fullDesc": "<p>My personal Roblox place, where I put the systems and experiments I build in my free time, from gameplay mechanics to the more technical scripting stuff.</p><p>The biggest thing in it right now is the reworked Soul System, plus a HUD that ties every system in the place together.</p>",
      "langs": "Lua, Roblox Studio",
      "tags": "Game Dev, Tools, UI",
      "status": "wip",
      "role": "Solo developer",
      "link": "https://www.roblox.com/games/16847910715/Samos-Scripting-Place",
      "highlights": [
        "Reworked soul and demon system with 4 abilities",
        "Place-wide HUD any script can plug into",
        "Raycast field-of-view visualizer",
        "Personal R&D sandbox"
      ],
      "images": [
        "images/soulsys3.webp",
        "images/soulsys2.webp",
        "images/ssp.webp",
        "images/soulsys.mp4",
        "images/vissys.mp4"
      ],
      "tabs": [
        {
          "title": "Soul System",
          "slug": "soul-system",
          "latest": true,
          "tagline": "Leave your body as a soul or a demon",
          "desc": "<p>Get torn out of your body as a <b>Soul</b> or a <b>Demon</b>. A glowing path leads back to your body, and the world fogs over the further you stray. Spirits can see each other and anything tagged <code>SoulObject</code>, and only they can stand on it.</p><p>This is a full rewrite of my old soul system: same idea, rebuilt from scratch so the old bugs can't come back.</p><h3>Demons</h3><ul><li><b>Devour</b> (hold R) a soul for Power. The victim gets a warning and can run.</li><li><b>Possess</b> (hold Q) an empty body. Its owner can hold E to tear you back out.</li><li>Four abilities unlock by tier as your Power grows. <b>Soul Chains</b> drags a soul to you and roots it, <b>Dread Howl</b> stuns nearby souls and scares the living with flickering lights, <b>Desecrate</b> drops a sigil that strips sacred objects of their Level, and <b>Manifest</b> makes you visible and solid, with a Rend attack.</li><li>Objects tagged <code>Sacred</code> burn demons and push them away, harder the higher their Level. While you're possessing someone, sacred ground loosens your grip on the body instead.</li></ul><h3>Fixed for good</h3><ul><li>Your character is never swapped or respawned during a transition. It turns into the spirit in place and gets every property back exactly; the body left behind is a clone.</li><li>Possession welds the stolen body onto the invisible spirit and mirrors your animation onto it, so leaving a body can't delete it or respawn you.</li><li>The ragdoll works on both Motor6D and the new avatar joint rigs. Joints are released instead of destroyed, limbs can't sink into the floor, and you never get stuck unable to move after getting up.</li></ul><h3>How it looks</h3><p>When you leave your body, a soft copy of you rises off it with spirals of light. When you possess one, the body convulses and gets hauled upright like a puppet. The demon aura grows with every tier and ends as a burning fallen angel with a halo. Die as a demon and a pentagram opens under you, chains drag you down and hell erupts. Every effect comes from a shared VFX library, recoloured to the theme: demon red, soul blue, holy gold.</p>",
          "videoUrl": "",
          "highlights": [
            "Soul or Demon, with a path back to your body",
            "Devour, possess, and 4 tiered demon abilities",
            "Sacred objects that burn and repel demons"
          ],
          "images": [
            "images/soulsys3.webp",
            "images/soulsys2.webp",
            "images/soulsys.mp4"
          ]
        },
        {
          "title": "Place HUD",
          "slug": "place-hud",
          "tagline": "One HUD for every system in the place",
          "desc": "<p>An always-on HUD for the whole place, built from one config module so every system can plug into it.</p><ul><li><b>Title panel</b> (top left) with the place name and a tag chip.</li><li><b>Status list</b> (top right): Vision, Spirit, and anything else that registers itself.</li><li><b>Notifications</b>: a shared feed under the status list, which the server can push to everyone.</li><li><b>Vitals</b> (bottom centre): health, plus Power and tier while you're a demon. It replaces the default Roblox health bar.</li><li><b>Keybind bar</b>: system keys like Vision and Reality Rift, plus the demon abilities and their cooldowns while you're a demon.</li></ul><p>When you're out of your body, the accent colour follows your form and the soul system's hold prompts sit right above the bar. Any script can use it with one line, like <code>PlaceHud.notify(\"Saved!\", \"Success\")</code>, or <code>Hud.notifyAll(\"Event starting!\", \"Warning\")</code> from the server.</p>",
          "videoUrl": "",
          "highlights": [
            "Status list, notifications, vitals and a keybind bar",
            "Follows your soul or demon form",
            "One-line API from any client or server script"
          ],
          "images": [
            "images/soulsys3.webp",
            "images/soulsys2.webp"
          ]
        },
        {
          "title": "Vision System",
          "slug": "vision-system",
          "tagline": "See exactly what another player sees",
          "desc": "<p>Press V, hover over a player and click them, and the system raycasts from their camera to draw exactly what they can see. It works in first and third person.</p><p>It's still a raw prototype, but it has plenty of possible uses, like checking whether a player can see you or whether something is blocking their view.</p>",
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
      "content": "I've been programming for more than four years, in two worlds: native C++ applications with OpenGL, and Lua scripting on Roblox. I'm studying Computer Science, where C++ is my main language and Kotlin is next on the list. I like code that's clean, fast and documented, and I don't ship anything until it's done properly.",
      "width": "full"
    },
    {
      "label": "What I focus on",
      "content": "Game systems architecture for Roblox in Lua, real-time graphics, modular frameworks, and low-level C++.",
      "width": "normal"
    },
    {
      "label": "What I use day to day",
      "content": "C++ with OpenGL, Lua in Roblox Studio, Git, Visual Studio and VS Code.",
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
        { "name": "JavaScript", "level": 67, "color": "#7f77dd" },
        { "name": "GLSL", "level": 65, "color": "#7f77dd" },
        { "name": "C#", "level": 62, "color": "#7f77dd" }
      ]
    },
    {
      "title": "Graphics and engines",
      "skills": [
        { "name": "Roblox Studio", "level": 95, "color": "#7f77dd" },
        { "name": "OpenGL", "level": 82, "color": "#7f77dd" },
        { "name": "Unity", "level": 60, "color": "#7f77dd" },
        { "name": "Unreal Engine", "level": 24, "color": "#7f77dd" }
      ]
    },
    {
      "title": "Tools",
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
      "years": "2025 – now",
      "role": "Systems programmer, Roblox",
      "desc": "I design and build the core systems for a Roblox horror game, from the ground up: a physics-based generator system with fuel consumption and fan mechanics, a modular light system for area blackouts, time doors, a protocol system with layered authorization, a terminal framework on top of the CMDR command library, and a server-authoritative medical examine system with a live triage UI. Every one of them is modular, documented and easy to extend.",
      "tags": "Lua,Roblox Studio,Game Systems,CMDR,UI,Modular Architecture"
    },
    {
      "company": "Innovation HQ 3.0",
      "years": "May 2024 – now",
      "role": "Lead programmer, Roblox",
      "desc": "Lead programmer on an ongoing Roblox project. I'm responsible for the scripting architecture, from simple scripted events to full systems like doors, infection and nametags.",
      "tags": "Lua,Roblox Studio,Game Systems,Scripting"
    },
    {
      "company": "SCPF | Artemis",
      "years": "Jul 2023 – Mar 2024",
      "role": "Actor developer and programmer, Roblox",
      "desc": "Actor developer and one of the main programmers on Vistrim's SCPF: Artemis. I scripted and integrated SCP-457, SCP-662, SCP-610-1, SCP-610-2, SCP-610-4, SCP-963, SCP-034 and SCP-504, and worked on the core gameplay systems: mining, infection, fire, anomaly actors, ambience, areas, fall damage and cloaking.",
      "tags": "Lua,Roblox Studio,Actor Development,Game Systems"
    },
    {
      "company": "Personal projects",
      "years": "2022 – now",
      "role": "Systems and graphics programmer",
      "desc": "Native C++ applications, mostly real-time 3D graphics with OpenGL. The biggest is RIFT, my own scene editor and renderer. It started as a school project and grew into a proper tool with scene saving and loading, animation timelines, an object hierarchy, texture mapping and a property inspector. Next to it sit lighter projects like Samo's Scripting Place, my sandbox of Roblox systems built for fun.",
      "tags": "C++,OpenGL,GLSL,ImGui,Visual Studio,Git,Lua,Roblox Studio"
    }
  ],
  "contact": [
    {
      "label": "Discord",
      "value": "samo_vr",
      "icon": "💬",
      "action": "copy"
    },
    {
      "label": "Email",
      "value": "samovr.main@gmail.com",
      "icon": "📧",
      "action": "copy"
    },
    {
      "label": "GitHub",
      "value": "https://github.com/SamoVR",
      "icon": "🐙",
      "action": "open"
    }
  ],
  "settings": {
    // Headings and short texts for each page section (Admin → Homepage)
    "sections": {
      "about": {
        "tag": "About",
        "title": "Who I am",
        "lede": "Who I am and what I'm into."
      },
      "projects": {
        "tag": "Selected work",
        "title": "Things I've built",
        "lede": "Open any project for the full breakdown, with screenshots and videos. You can even try SAM-OS right here in your browser."
      },
      "experience": {
        "tag": "Experience",
        "title": "Where I've worked",
        "lede": "Teams and projects I've written systems for, newest first."
      },
      "skills": {
        "tag": "Toolbox",
        "title": "Languages and tools",
        "lede": "What I use and how well I know it."
      },
      "terminal": {
        "tag": "A little easter egg",
        "title": "Poking around",
        "lede": "A real (tiny) shell. Click it and type <code>help</code>."
      },
      "contact": {
        "tag": "Contact",
        "title": "Get in touch",
        "lede": "I'm open to collaborations and freelance work, and always happy to talk code."
      },
      "footer": {
        "note": "Systems & Graphics Programmer"
      }
    },
    "hero": {
      "eyebrow": "Systems & Graphics Programmer",
      "bio": "I build game systems in Lua for Roblox and graphics code in C++ with OpenGL. I've been shipping real projects for more than four years, from big game systems to my own render engine, and nothing ships until it's done properly.",
      "roles": [
        "write Lua by day.",
        "write C++ by night.",
        "build systems exploiters can't touch.",
        "document everything I ship."
      ],
      "stats": [
        { "value": "4", "suffix": "+", "label": "Years of experience" },
        { "value": "7", "suffix": "M+", "label": "Game visits" },
        { "auto": "projects", "label": "Projects" },
        { "auto": "systems", "label": "Systems written up" }
      ]
    },
    // Snippets typed out by the editor card in the hero. Short, illustrative
    // excerpts written from the project docs; swap in real code any time.
    "heroCode": [
      {
        "file": "MedicalExamineService.lua",
        "lang": "lua",
        "code": "-- The server decides, clients just get the result.\nRequestExamine.OnServerEvent:Connect(function(examiner, target)\n\tif not isPlayer(target) or target == examiner then return end\n\tif sessions[examiner] or pending[target] then return end\n\tif not isAlive(target) then return end\n\n\tpending[target] = examiner\n\tExamineRequested:FireClient(target, examiner.Name)\nend)"
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
        "text": "Samo_VR, programmer. Lua by day, C++ by night."
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
    "lockdownMsg": "This portfolio is private for now. Check back soon.",
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
      "message": "There's nothing at this address. It might have been moved or renamed, or it never got built in the first place.",
      "buttonText": "Back to the homepage",
      "buttonLink": "/"
    }
  },
  passHash: '432b79121752641641a11165ddb2c0e8b721e43f346acce2d802647d1bd7214a'
};
