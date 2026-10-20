/* ════════════════════════════════════════════════
   MEDICAL EXAMINE SYSTEM - interactive web replica
   A browser re-creation of the in-game healing UI, driven by the same
   rules as the real system (see the project's documentation):
     • a fake "server" owns all health data and builds the payload
     • the "client" console only ever renders that payload
     • zone health = weakest part, Quick View = zone average
     • five colour bands, Stable / Caution / Critical at 60 / 30
     • changes inside 0.1 s are coalesced into one ExamineDataUpdate
     • request popup auto-declines after 15 s; sessions end on close,
       death or distance
   Every remote event is printed to the network log so visitors can see
   the request → accept → updates → teardown flow happen.
   ════════════════════════════════════════════════ */

const MedicalDemo = (() => {
  // ── config (mirrors the constants at the top of the real scripts) ──
  const REQUEST_TIMEOUT_SECONDS = 15;
  const REFRESH_COALESCE_SECONDS = 0.1;
  const HEALTH_DROP_THRESHOLD = 1;

  const ZONES = [
    { id: 'HeadLimb',     label: 'Head',     title: 'HEAD',      parts: ['Head'] },
    { id: 'TorsoLimb',    label: 'Torso',    title: 'TORSO',     parts: ['UpperTorso', 'LowerTorso'] },
    { id: 'LeftArmLimb',  label: 'LeftArm',  title: 'LEFT ARM',  parts: ['LeftUpperArm', 'LeftLowerArm', 'LeftHand'] },
    { id: 'RightArmLimb', label: 'RightArm', title: 'RIGHT ARM', parts: ['RightUpperArm', 'RightLowerArm', 'RightHand'] },
    { id: 'LeftLegLimb',  label: 'LeftLeg',  title: 'LEFT LEG',  parts: ['LeftUpperLeg', 'LeftLowerLeg', 'LeftFoot'] },
    { id: 'RightLegLimb', label: 'RightLeg', title: 'RIGHT LEG', parts: ['RightUpperLeg', 'RightLowerLeg', 'RightFoot'] }
  ];
  // body diagram layout (viewBox 0 0 200 204), mirrored like the in-game figure
  const FIGURE = {
    HeadLimb:     [80, 4, 40, 40],
    TorsoLimb:    [60, 48, 80, 82],
    LeftArmLimb:  [20, 48, 36, 82],
    RightArmLimb: [144, 48, 36, 82],
    LeftLegLimb:  [60, 134, 38, 66],
    RightLegLimb: [102, 134, 38, 66]
  };
  const CONDITIONS = ['Bleeding', 'Burn', 'Fracture', 'Laceration'];

  // ── colours ──
  const BLACK = [14, 14, 16], RED = [209, 69, 59], ORANGE = [232, 163, 61], YELLOW = [232, 212, 77], WHITE = [232, 232, 232], GREY = [96, 96, 104];
  const AMBER = ORANGE;
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;

  // LIMB_COLOR_STOPS: five bands that blend into each other around the edges
  function bandColor(h) {
    if (typeof h !== 'number') return GREY;
    if (h <= 0) return BLACK;
    if (h < 4) return mix(BLACK, RED, h / 4);
    const edges = [[30, RED, ORANGE], [60, ORANGE, YELLOW], [80, YELLOW, WHITE]];
    for (const [e, lo, hi] of edges) if (Math.abs(h - e) <= 4) return mix(lo, hi, (h - (e - 4)) / 8);
    return h < 30 ? RED : h < 60 ? ORANGE : h < 80 ? YELLOW : WHITE;
  }
  // Quick View / Overview text use the simpler red → amber → white ramp
  function rampColor(h) {
    if (typeof h !== 'number') return GREY;
    if (h <= 30) return RED;
    if (h <= 60) return mix(RED, AMBER, (h - 30) / 30);
    return mix(AMBER, WHITE, (h - 60) / 40);
  }
  function severityFromZoneHealth(h) {
    if (typeof h !== 'number') return 'Unknown';
    if (h <= 30) return 'Critical';
    if (h <= 60) return 'Caution';
    return 'Stable';
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const svgNS = 'http://www.w3.org/2000/svg';

  function mount(root) {
    if (!root) return null;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
    const t0 = performance.now();

    // ════════ "SERVER" ════════
    const server = { parts: {}, session: null, pending: null };
    function seed() {
      // same state as the showcase video frame: a hurt right arm and a fractured left leg
      const start = {
        Head: 62, UpperTorso: 70, LowerTorso: 70,
        LeftUpperArm: 70, LeftLowerArm: 70, LeftHand: 70,
        RightUpperArm: 54, RightLowerArm: 34, RightHand: 65,
        LeftUpperLeg: 58, LeftLowerLeg: 62, LeftFoot: 63,
        RightUpperLeg: 77, RightLowerLeg: 77, RightFoot: 77
      };
      ZONES.forEach(z => z.parts.forEach(p => { server.parts[p] = { hp: start[p], cond: '' }; }));
      server.parts.RightUpperArm.cond = 'Bleeding';
      server.parts.LeftUpperLeg.cond = 'Fracture';
    }
    seed();

    function buildPayload() {
      const zones = {}, parts = {}, triageEntries = [];
      ZONES.forEach(z => {
        let lowest = null, sum = 0, n = 0;
        z.parts.forEach(p => {
          const v = server.parts[p];
          if (!v) { parts[p] = 'unknown'; return; }
          const hp = clamp(Math.round(v.hp), 0, 100); // clamped for display only
          parts[p] = hp;
          lowest = lowest == null ? hp : Math.min(lowest, hp);
          sum += hp; n++;
        });
        zones[z.id] = { health: lowest == null ? 'unknown' : lowest, average: n ? Math.round((sum / n) * 10) / 10 : 'unknown' };
      });
      ZONES.forEach(z => z.parts.forEach(p => {
        const v = server.parts[p];
        if (v && v.cond) triageEntries.push({ part: p, condition: v.cond, severity: severityFromZoneHealth(zones[z.id].health) });
      }));
      return { zones, parts, triageEntries };
    }

    // changes inside REFRESH_COALESCE_SECONDS go out as one update
    let dirty = 0, flushId = 0;
    function changed(n) {
      if (!server.session) { log('SRV', 'Medical values changed', 'no open session, nothing sent'); return; }
      dirty += n || 1;
      if (flushId) return;
      flushId = later(() => {
        flushId = 0;
        if (!server.session) { dirty = 0; return; }
        log('S→C', 'ExamineDataUpdate', `${dirty} change${dirty === 1 ? '' : 's'} batched`);
        dirty = 0;
        client.onData(buildPayload());
        checkDeath();
      }, REFRESH_COALESCE_SECONDS * 1000);
    }
    function checkDeath() {
      if (!server.session) return;
      if (server.parts.Head.hp <= 0 || server.parts.UpperTorso.hp <= 0) {
        endSession('died');
        later(() => { seed(); log('SRV', 'Player2 respawned', 'health reset'); }, 1600);
      }
    }

    function requestExamine() {
      log('C→S', 'RequestExamine', 'Player2');
      if (server.session) return log('SRV', 'ignored', 'examiner already in a session');
      if (server.pending) return log('SRV', 'ignored', 'target already has a pending request');
      server.pending = { at: performance.now() };
      log('S→C', 'ExamineRequested', '"Player1" → Player2');
      client.showRequest();
    }
    function respondExamine(accepted, timedOut) {
      if (!server.pending) return;
      log('C→S', 'RespondExamine', String(accepted) + (timedOut ? ' (timed out)' : ''));
      server.pending = null;
      if (!accepted) { log('SRV', 'request dropped', ''); client.backToIdle(); return; }
      server.session = { target: 'Player2' };
      log('S→C', 'SessionStarted', '"Player2", 1337420042');
      client.openConsole('Player2', '0042');
      log('S→C', 'ExamineDataUpdate', 'initial snapshot');
      client.onData(buildPayload(), true);
    }
    function endSession(reason) {
      if (!server.session) return;
      server.session = null;
      log('S→C', 'SessionEnded', `"${reason}"`);
      client.closeConsole();
    }

    // ── test rig (the in-world buttons from the showcase map) ──
    const hurt = (p, amount) => { const v = server.parts[p]; v.hp = Math.max(0, v.hp - amount); return v; };
    const rig = {
      damageAll() {
        ZONES.forEach(z => z.parts.forEach(p => hurt(p, rand(6, 20))));
        changed(15);
      },
      bleedRightArm() {
        hurt('RightUpperArm', rand(10, 20)).cond = 'Bleeding'; changed(2);
      },
      fractureLeftLeg() {
        hurt('LeftUpperLeg', rand(15, 25)).cond = 'Fracture'; changed(2);
      },
      randomHit() {
        const z = pick(ZONES), p = pick(z.parts), v = hurt(p, rand(12, 32));
        let n = 1;
        if (Math.random() < 0.4) { v.cond = pick(CONDITIONS); n++; }
        changed(n);
      },
      healAll() {
        ZONES.forEach(z => z.parts.forEach(p => { server.parts[p].hp = 100; server.parts[p].cond = ''; }));
        changed(15);
      },
      walkAway() {
        if (!server.session) return;
        log('SRV', 'distance check', 'target is 23.4 studs away (> 20)');
        endSession('distance');
      }
    };

    // ════════ DOM ════════
    root.innerHTML = `
      <div class="md">
        <div class="md-rig" role="group" aria-label="Test rig">
          <span class="md-rig-label">Test rig</span>
          <button type="button" data-rig="damageAll">Damage all limbs</button>
          <button type="button" data-rig="bleedRightArm">Bleeding R-Arm</button>
          <button type="button" data-rig="fractureLeftLeg">Fracture L-Leg</button>
          <button type="button" data-rig="randomHit">Random hit</button>
          <button type="button" data-rig="healAll">Heal all</button>
          <button type="button" data-rig="walkAway" class="md-rig-walk" disabled>Walk 20+ studs away</button>
          <label class="md-live"><input type="checkbox" data-live> Live damage</label>
        </div>
        <div class="md-stage">
          <div class="md-status" hidden><span>Player2's screen</span>Being examined by Player1</div>
          <div class="md-idle">
            <div class="md-players">
              <div class="md-player">
                <span class="md-avatar">P1</span>
                <span class="md-player-text"><b>Player1</b><small>You · Examining Clipboard equipped</small></span>
              </div>
              <span class="md-players-arrow" aria-hidden="true">→</span>
              <button type="button" class="md-player md-target" data-examine>
                <span class="md-avatar">P2</span>
                <span class="md-player-text"><b>Player2</b><small>Click to examine</small></span>
              </button>
            </div>
            <p class="md-idle-hint">The server validates every request: no self-exams, no dead targets, one pending request per target.</p>
          </div>
          <div class="md-popup-wrap" hidden>
            <div class="md-screen-label">Player2's screen</div>
            <div class="md-popup" role="dialog" aria-label="Incoming request">
              <div class="md-pop-eyebrow">Incoming request</div>
              <div class="md-pop-name">Player1</div>
              <div class="md-pop-msg">Is requesting to examine you.</div>
              <div class="md-pop-actions">
                <button type="button" data-decline>Decline</button>
                <button type="button" data-accept class="md-accept">Accept</button>
              </div>
              <div class="md-pop-timer"><i></i></div>
            </div>
          </div>
          <div class="md-console" hidden>
            <div class="md-head">
              <span class="md-target-name"></span>
              <span class="md-target-id"></span>
              <button type="button" class="md-close" aria-label="Close examine session">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </button>
            </div>
            <div class="md-row">
              <div class="md-col md-triage">
                <div class="md-col-label">Triage card</div>
                <div class="md-triage-list"></div>
                <div class="md-empty">No conditions on this triage card.</div>
              </div>
              <div class="md-col md-bodycol">
                <div class="md-col-label md-center">Body diagram</div>
                <div class="md-figure-box"><svg class="md-figure" viewBox="0 0 200 204" role="group" aria-label="Body diagram"></svg></div>
                <div class="md-legend"><span class="st">Stable</span><span class="ca">Caution</span><span class="cr">Critical</span></div>
              </div>
              <div class="md-col md-over">
                <div class="md-col-label">Overview</div>
                <div class="md-over-body"></div>
              </div>
            </div>
            <div class="md-quick">
              <div class="md-col-label">Quick view</div>
              <div class="md-quick-grid"></div>
            </div>
          </div>
        </div>
        <div class="md-log" aria-live="off">
          <div class="md-log-head"><span>Network log</span><span class="md-log-legend"><b>C→S</b> client to server · <b>S→C</b> server to client</span></div>
          <div class="md-log-body"></div>
        </div>
      </div>`;

    const $ = s => root.querySelector(s);
    const stage = $('.md-stage'), idle = $('.md-idle'), popWrap = $('.md-popup-wrap'), consoleEl = $('.md-console');
    const statusEl = $('.md-status'), logBody = $('.md-log-body'), walkBtn = $('.md-rig-walk');

    function log(dir, name, args) {
      const row = document.createElement('div');
      row.className = 'md-log-row md-log-' + (dir === 'C→S' ? 'up' : dir === 'S→C' ? 'down' : 'srv');
      const secs = ((performance.now() - t0) / 1000).toFixed(1).padStart(5, ' ');
      row.innerHTML = `<span class="md-log-t">${secs}s</span><span class="md-log-dir">${dir}</span><span class="md-log-ev"><b></b> <span></span></span>`;
      row.querySelector('b').textContent = name;
      row.querySelector('.md-log-ev span').textContent = args || '';
      logBody.appendChild(row);
      while (logBody.children.length > 40) logBody.firstChild.remove();
      logBody.scrollTop = logBody.scrollHeight;
    }

    // ── figure ──
    const fig = $('.md-figure');
    const limbEls = {};
    ZONES.forEach(z => {
      const [x, y, w, h] = FIGURE[z.id];
      const r = document.createElementNS(svgNS, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h);
      r.setAttribute('rx', z.id === 'HeadLimb' ? 4 : 2);
      r.setAttribute('class', 'md-limb');
      r.setAttribute('tabindex', '0');
      r.setAttribute('role', 'button');
      r.setAttribute('aria-label', z.title.toLowerCase());
      r.dataset.zone = z.id;
      fig.appendChild(r);
      limbEls[z.id] = r;
      const select = () => {
        client.selected = z.id;
        r.classList.remove('bump'); void r.getBoundingClientRect(); r.classList.add('bump');
        client.renderSelection();
        client.renderOverview(true);
      };
      r.addEventListener('click', select);
      r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
    });

    // ── quick view rows ──
    const quick = $('.md-quick-grid');
    const quickEls = {};
    ZONES.forEach(z => {
      const cell = document.createElement('div');
      cell.className = 'md-cell';
      cell.innerHTML = `<div class="md-cell-label">${z.label}</div><div class="md-bar-row"><div class="md-bar"><i></i></div><span class="md-pct">0%</span></div>`;
      quick.appendChild(cell);
      quickEls[z.id] = { fill: cell.querySelector('i'), pct: cell.querySelector('.md-pct'), shown: 0, raf: 0 };
    });

    // ════════ "CLIENT" (renders only what the server sends) ════════
    const client = {
      data: null,
      selected: null,
      triageRows: new Map(),

      showRequest() {
        idle.hidden = true;
        popWrap.hidden = false;
        const bar = popWrap.querySelector('.md-pop-timer i');
        bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)';
        void bar.offsetWidth;
        bar.style.transition = `transform ${REQUEST_TIMEOUT_SECONDS}s linear`;
        bar.style.transform = 'scaleX(0)';
        popWrap.querySelector('.md-popup').classList.remove('pop-in'); void popWrap.offsetWidth;
        popWrap.querySelector('.md-popup').classList.add('pop-in');
        clearTimeout(client._timeout);
        client._timeout = later(() => respondExamine(false, true), REQUEST_TIMEOUT_SECONDS * 1000);
      },
      backToIdle() {
        clearTimeout(client._timeout);
        popWrap.hidden = true;
        consoleEl.hidden = true;
        statusEl.hidden = true;
        idle.hidden = false;
        walkBtn.disabled = true;
      },
      openConsole(name, id) {
        clearTimeout(client._timeout);
        popWrap.hidden = true;
        idle.hidden = true;
        $('.md-target-name').textContent = name;
        $('.md-target-id').textContent = 'ID ···' + id;
        // overview + quick view reset to their "studio" state for a new session
        client.selected = null;
        client.data = null;
        client.triageRows.forEach(r => r.remove());
        client.triageRows.clear();
        Object.values(quickEls).forEach(q => { q.shown = 0; q.fill.style.transition = 'none'; q.fill.style.width = '0%'; q.pct.textContent = '0%'; });
        client.renderSelection();
        client.renderOverview();
        consoleEl.hidden = false;
        consoleEl.classList.remove('md-out', 'md-in'); void consoleEl.offsetWidth;
        consoleEl.classList.add('md-in');
        statusEl.hidden = false;
        walkBtn.disabled = false;
      },
      closeConsole() {
        walkBtn.disabled = true;
        statusEl.hidden = true;
        consoleEl.classList.remove('md-in');
        consoleEl.classList.add('md-out');
        later(() => { consoleEl.classList.remove('md-out'); client.backToIdle(); }, 260);
      },

      onData(payload, initial) {
        const prev = client.data;
        client.data = payload;
        client.renderFigure(prev);
        client.renderTriage(initial);
        client.renderOverview();
        client.renderQuick(initial);
      },

      renderFigure(prev) {
        ZONES.forEach(z => {
          const el = limbEls[z.id];
          const h = client.data.zones[z.id].health;
          const c = bandColor(h);
          el.style.setProperty('--fill', `rgba(${c[0]},${c[1]},${c[2]},${typeof h === 'number' && h <= 0 ? 1 : 0.42})`);
          el.style.setProperty('--edge', `rgba(${c[0]},${c[1]},${c[2]},.55)`);
          const before = prev && prev.zones[z.id].health;
          if (typeof before === 'number' && typeof h === 'number' && before - h >= HEALTH_DROP_THRESHOLD) {
            el.classList.remove('flash'); void el.getBoundingClientRect(); el.classList.add('flash');
          }
        });
      },

      renderSelection() {
        ZONES.forEach(z => limbEls[z.id].classList.toggle('selected', client.selected === z.id));
      },

      renderTriage(initial) {
        const list = $('.md-triage-list');
        const next = new Map();
        client.data.triageEntries.forEach(e => next.set(e.part + '|' + e.condition, e));
        // fade out rows that are gone
        client.triageRows.forEach((row, key) => {
          if (next.has(key)) return;
          client.triageRows.delete(key);
          row.classList.add('leaving');
          later(() => row.remove(), 260);
        });
        next.forEach((e, key) => {
          let row = client.triageRows.get(key);
          if (!row) {
            row = document.createElement('div');
            row.className = 'md-entry' + (initial ? '' : ' entering');
            row.innerHTML = `<div class="md-entry-main"><div class="md-entry-cond"></div><div class="md-entry-part"></div></div><div class="md-entry-sev"></div>`;
            row.querySelector('.md-entry-cond').textContent = e.condition;
            row.querySelector('.md-entry-part').textContent = e.part;
            list.appendChild(row);
            client.triageRows.set(key, row);
          }
          const sev = row.querySelector('.md-entry-sev');
          sev.textContent = e.severity;
          sev.className = 'md-entry-sev sev-' + e.severity.toLowerCase();
        });
        $('.md-empty').hidden = next.size > 0;
      },

      renderOverview(fadeIn) {
        const box = $('.md-over-body');
        if (!client.selected || !client.data) {
          box.innerHTML = '<div class="md-over-none">Nothing selected</div><div class="md-over-hint">Click a limb to see its details.</div>';
          return;
        }
        const z = ZONES.find(x => x.id === client.selected);
        const zd = client.data.zones[z.id];
        const head = document.createElement('div');
        head.className = 'md-over-title';
        head.style.color = rgb(rampColor(zd.health));
        head.textContent = `${z.title} — ${typeof zd.average === 'number' ? Math.round(zd.average) + '%' : 'Unknown'}`;
        const rows = document.createElement('div');
        rows.className = 'md-over-rows';
        z.parts.forEach(p => {
          const hp = client.data.parts[p];
          const r = document.createElement('div');
          r.className = 'md-over-part';
          r.style.color = rgb(rampColor(hp));
          r.textContent = `${p} — ${typeof hp === 'number' ? hp + '%' : 'Unknown'}`;
          rows.appendChild(r);
          const conds = client.data.triageEntries.filter(e => e.part === p);
          if (conds.length) conds.forEach(c => {
            const cr = document.createElement('div');
            cr.className = 'md-over-cond';
            cr.textContent = '▼ ' + c.condition;
            rows.appendChild(cr);
          });
          else {
            const none = document.createElement('div');
            none.className = 'md-over-ok';
            none.textContent = 'No active conditions.';
            rows.appendChild(none);
          }
        });
        box.replaceChildren(head, rows);
        if (fadeIn) { box.classList.remove('fade'); void box.offsetWidth; box.classList.add('fade'); }
      },

      renderQuick(initial) {
        ZONES.forEach(z => {
          const q = quickEls[z.id];
          const avg = client.data.zones[z.id].average;
          const target = typeof avg === 'number' ? avg : 0;
          q.fill.style.transition = '';
          const c = rampColor(avg);
          q.fill.style.background = rgb(c);
          // bars start empty on open, then fill; later updates glide
          if (initial) requestAnimationFrame(() => requestAnimationFrame(() => { q.fill.style.width = target + '%'; }));
          else q.fill.style.width = target + '%';
          // count the percentage to its new value
          cancelAnimationFrame(q.raf);
          const from = q.shown, start = performance.now(), dur = initial ? 900 : 500;
          const tick = now => {
            const k = Math.min(1, (now - start) / dur);
            const e = 1 - Math.pow(1 - k, 3);
            q.shown = from + (target - from) * e;
            q.pct.textContent = Math.round(q.shown) + '%';
            if (k < 1) q.raf = requestAnimationFrame(tick);
          };
          q.raf = requestAnimationFrame(tick);
        });
      }
    };

    // ── wiring ──
    root.querySelector('[data-examine]').addEventListener('click', requestExamine);
    root.querySelector('[data-accept]').addEventListener('click', () => respondExamine(true));
    root.querySelector('[data-decline]').addEventListener('click', () => respondExamine(false));
    root.querySelector('.md-close').addEventListener('click', () => { log('C→S', 'CloseExamine', ''); endSession('manual'); });
    root.querySelectorAll('[data-rig]').forEach(b => b.addEventListener('click', () => rig[b.dataset.rig]()));
    let liveId = 0;
    root.querySelector('[data-live]').addEventListener('change', e => {
      clearInterval(liveId);
      if (e.target.checked) liveId = setInterval(() => (Math.random() < 0.82 ? rig.randomHit() : rig.healAll()), 1500);
    });

    log('SRV', 'MedicalExamineService ready', '7 remotes created');

    return {
      destroy() {
        timers.forEach(clearTimeout);
        timers.clear();
        clearInterval(liveId);
        Object.values(quickEls).forEach(q => cancelAnimationFrame(q.raf));
        root.innerHTML = '';
      }
    };
  }

  return { mount };
})();
