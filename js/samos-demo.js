/* ════════════════════════════════════════════════
   SAM-OS TERMINAL - interactive web replica
   A browser re-creation of the amber CRT terminal from The Backrooms,
   following the rules in its documentation:
     • the terminal only displays text; a CMDR-like dispatcher validates
       every command and its arguments before anything runs
     • doors are found by Codename; each Type has its own handler
       (Heavy, PPR, EmergencyBlast) and shows a live progress line
     • `lockdown *` targets every door; busy / already-set / Broken doors
       are skipped and summarised
     • protocols: one active at a time; the operator must pass the
       whitelist AND the protocol's own minimum rank
   Travel times are shortened so the demo stays snappy.
   ════════════════════════════════════════════════ */

const SamosDemo = (() => {
  const OPERATOR_RANK = 7; // the visitor plays a whitelisted operator with group rank 7

  const PROTOCOLS = [
    { name: 'Green', num: 0, minRank: 6, color: '#4ade80' },
    { name: 'Yellow', num: 1, minRank: 6, color: '#ffd23f' },
    { name: 'Red', num: 2, minRank: 7, color: '#ff5a3c' },
    { name: 'Danger', num: 3, minRank: 8, color: '#ff2d55' },
    { name: 'Contingency', num: 4, minRank: 13, color: '#c084fc', screen: 'THETA' }
  ];

  // seconds are scaled down from the real thing (EmergencyBlast is 20 s in game)
  const TYPES = { Heavy: 2.4, PPR: 3.2, EmergencyBlast: 6 };

  const COMMANDS = {
    help: { aliases: [], usage: 'help [command]', desc: 'Lists commands, or details for one command.' },
    lockdown: { aliases: ['ld'], usage: 'lockdown <DoorName|*> <Boolean>', desc: 'Locks (true) or releases (false) a door by Codename. * targets every door.' },
    protocol: { aliases: ['pcl'], usage: 'protocol <ProtocolType> <Boolean>', desc: 'Activates or deactivates a facility protocol.' },
    clear: { aliases: ['cls'], usage: 'clear', desc: 'Clears the output log.' },
    exit: { aliases: ['logout', 'x'], usage: 'exit', desc: 'Closes the terminal.' }
  };
  const resolve = name => {
    const n = String(name || '').toLowerCase();
    return Object.keys(COMMANDS).find(k => k === n || COMMANDS[k].aliases.includes(n));
  };

  function mount(root) {
    if (!root) return null;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
    const intervals = new Set();

    // ── the "storeroom": doors + protocol level live here, not in the terminal ──
    const doors = [
      { code: 'TBD-1', type: 'Heavy', open: true },
      { code: 'TBD-2', type: 'PPR', open: true },
      { code: 'TBD-3', type: 'EmergencyBlast', open: true },
      { code: 'GATE-A', type: 'PPR', open: false },
      { code: 'MAINT-4', type: 'Heavy', open: true, broken: true }
    ];
    doors.forEach(d => { d.busy = false; d.progress = d.open ? 1 : 0; });
    let level = 0;

    root.innerHTML = `
      <div class="sm">
        <div class="sm-bezel">
          <div class="sm-screen">
            <div class="sm-head">
              <div><span class="sm-title">SAM-OS</span><span class="sm-sub">A-SYNC Internal Terminal</span></div>
              <div class="sm-status"><i class="sm-dot"></i><span class="sm-status-text">ONLINE</span></div>
            </div>
            <div class="sm-body">
              <div class="sm-log" data-lenis-prevent></div>
              <div class="sm-side">
                <div class="sm-side-label">// DOORS</div>
                <div class="sm-doors"></div>
                <div class="sm-side-label">// DIRECTIVE</div>
                <div class="sm-directive"></div>
                <div class="sm-side-label">// OPERATOR</div>
                <div class="sm-op">whitelisted · rank ${OPERATOR_RANK}</div>
              </div>
            </div>
            <div class="sm-input-wrap">
              <div class="sm-ac" hidden></div>
              <div class="sm-input-row"><span class="sm-prompt">&gt;</span><input class="sm-input" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="SAM-OS command"></div>
            </div>
            <div class="sm-scan" aria-hidden="true"></div>
          </div>
        </div>
        <div class="sm-try">Try: <button type="button" data-cmd="help">help</button><button type="button" data-cmd="lockdown TBD-2 true">lockdown TBD-2 true</button><button type="button" data-cmd="lockdown * true">lockdown * true</button><button type="button" data-cmd="protocol Red true">protocol Red true</button><button type="button" data-cmd="protocol Contingency true">protocol Contingency true</button></div>
      </div>`;

    const $ = s => root.querySelector(s);
    const log = $('.sm-log'), input = $('.sm-input'), ac = $('.sm-ac');
    const history = [];
    let hIdx = 0, closed = false;

    function line(text, cls) {
      const el = document.createElement('div');
      el.className = 'sm-line' + (cls ? ' ' + cls : '');
      el.textContent = text;
      log.appendChild(el);
      while (log.children.length > 120) log.firstChild.remove();
      log.scrollTop = log.scrollHeight;
      return el;
    }
    const err = t => line(t, 'sm-err');

    // ── right-hand panel ──
    function renderSide() {
      $('.sm-doors').innerHTML = doors.map(d => {
        const state = d.broken ? 'BROKEN' : d.busy ? (d.target ? 'SEALING' : 'OPENING') : d.open ? 'OPEN' : 'SEALED';
        const cls = d.broken ? 'b' : d.busy ? 'm' : d.open ? 'o' : 's';
        return `<div class="sm-door sm-door-${cls}"><span>${d.code}</span><span class="sm-door-type">${d.type}</span><span class="sm-door-state">${state}</span><i style="transform:scaleX(${(1 - d.progress).toFixed(3)})"></i></div>`;
      }).join('');
      const p = PROTOCOLS.find(x => x.num === level);
      $('.sm-directive').innerHTML = `<span style="color:${p.color}">■ ${p.screen || p.name.toUpperCase()}</span> <span class="sm-dim">LEVEL ${p.num}</span>`;
      // full facility lockdown (every reachable door sealed) flips the status to LOCKDOWN
      setAlert(doors.filter(d => !d.broken).every(d => !d.open && !d.busy));
    }
    // SetAlert(true): red LOCKDOWN status; SetAlert(false) always reverts to ONLINE
    function setAlert(on) {
      root.querySelector('.sm-status').classList.toggle('alert', on);
      $('.sm-status-text').textContent = on ? 'LOCKDOWN' : 'ONLINE';
    }

    // ── door handlers: one per Type, all sharing Open/Close(door, onComplete) ──
    function moveDoor(d, close) {
      d.busy = true; d.target = close;
      const dur = TYPES[d.type] * 1000;
      const bar = line('', 'sm-progress');
      const verb = close ? 'Sealing' : 'Releasing';
      const from = d.progress, to = close ? 0 : 1, start = performance.now();
      if (d.type === 'EmergencyBlast') line(`  ${d.code}: bell, prelocks, alarm lights engaged`, 'sm-dim');
      const id = setInterval(() => {
        const k = Math.min(1, (performance.now() - start) / dur);
        d.progress = from + (to - from) * k;
        const pct = Math.round(k * 100), filled = Math.round(k * 20);
        bar.textContent = `  [${'█'.repeat(filled)}${'░'.repeat(20 - filled)}] ${String(pct).padStart(3)}%  ${verb} ${d.code}…`;
        renderSide();
        if (k >= 1) {
          clearInterval(id); intervals.delete(id);
          d.busy = false; d.open = !close;
          line(`${d.code} has been ${close ? 'sealed' : 'released'}.`, close ? 'sm-warn' : 'sm-ok');
          renderSide();
        }
      }, 80);
      intervals.add(id);
    }

    function cmdLockdown(args) {
      if (args.length < 2) return err('Usage: lockdown <DoorName|*> <Boolean>');
      const bool = parseBool(args[1]);
      if (bool === null) return err(`"${args[1]}" is not a valid Boolean (true / false).`);
      if (args[0] === '*') {
        const moved = [], skipped = [];
        doors.forEach(d => {
          if (d.broken) skipped.push(`${d.code} (unreachable)`);
          else if (d.busy) skipped.push(`${d.code} (busy)`);
          else if (d.open === !bool) skipped.push(`${d.code} (already ${bool ? 'sealed' : 'open'})`);
          else { moved.push(d.code); moveDoor(d, bool); }
        });
        line(`${bool ? 'Facility lockdown' : 'Facility release'}: ${moved.length} door${moved.length === 1 ? '' : 's'} moving.`, 'sm-dim');
        if (skipped.length) line('Skipped: ' + skipped.join(', '), 'sm-dim');
        return;
      }
      const d = doors.find(x => x.code.toLowerCase() === args[0].toLowerCase());
      if (!d) return err(`"${args[0]}" is not a valid DoorName. Press Tab to see codenames.`);
      if (d.broken) return err(`${d.code} is unreachable (Broken).`);
      if (d.busy) return err(`${d.code} is busy (mid-animation). Try again in a moment.`);
      if (d.open === !bool) return line(`${d.code} is already ${bool ? 'sealed' : 'open'}.`, 'sm-dim');
      moveDoor(d, bool);
    }

    function cmdProtocol(args) {
      if (args.length < 2) return err('Usage: protocol <ProtocolType> <Boolean>');
      const p = PROTOCOLS.find(x => x.name.toLowerCase() === args[0].toLowerCase());
      if (!p) return err(`"${args[0]}" is not a valid ProtocolType (${PROTOCOLS.map(x => x.name).join(', ')}).`);
      const bool = parseBool(args[1]);
      if (bool === null) return err(`"${args[1]}" is not a valid Boolean (true / false).`);
      // gate 1 passed: the visitor is whitelisted. gate 2: per-protocol rank floor
      if (OPERATOR_RANK < p.minRank) return err(`Insufficient access for this protocol (requires rank ${p.minRank}, you are ${OPERATOR_RANK}).`);
      if (bool) {
        const prev = PROTOCOLS.find(x => x.num === level);
        level = p.num;
        line(`Protocol ${p.name.toUpperCase()} activated${prev.num !== p.num && prev.num !== 0 ? ` (replaces ${prev.name})` : ''}. Broadcasting to directive screens…`, 'sm-ok');
      } else {
        if (level !== p.num) return line(`Protocol ${p.name} is not active.`, 'sm-dim');
        level = 0;
        line(`Protocol ${p.name.toUpperCase()} deactivated. Returning to GREEN.`, 'sm-ok');
      }
      renderSide();
    }

    function parseBool(v) {
      const s = String(v || '').toLowerCase();
      if (['true', 't', 'yes', 'y', '1', 'on'].includes(s)) return true;
      if (['false', 'f', 'no', 'n', '0', 'off'].includes(s)) return false;
      return null;
    }

    function run(raw) {
      const text = raw.trim();
      if (!text) return;
      history.push(text); hIdx = history.length;
      line('> ' + text, 'sm-echo');
      const [name, ...args] = text.split(/\s+/);
      const cmd = resolve(name);
      if (!cmd) return err(`"${name}" is not a valid command name. Type "help".`);
      if (cmd === 'help') {
        if (args[0]) {
          const c = resolve(args[0]);
          if (!c) return err(`No command named "${args[0]}".`);
          line(COMMANDS[c].usage); line('  ' + COMMANDS[c].desc, 'sm-dim');
          if (COMMANDS[c].aliases.length) line('  aliases: ' + COMMANDS[c].aliases.join(', '), 'sm-dim');
          return;
        }
        line('COMMANDS');
        Object.values(COMMANDS).forEach(c => line(`  ${c.usage.padEnd(36)} ${c.aliases.length ? '(' + c.aliases.join(', ') + ')' : ''}`, 'sm-dim'));
        line('Shorthand: * = all doors. Tab autocompletes.', 'sm-dim');
        return;
      }
      if (cmd === 'lockdown') return cmdLockdown(args);
      if (cmd === 'protocol') return cmdProtocol(args);
      if (cmd === 'clear') { log.innerHTML = ''; return; }
      if (cmd === 'exit') {
        closed = true;
        line('Session closed. Click the screen to log back in.', 'sm-dim');
        root.querySelector('.sm-screen').classList.add('off');
      }
    }

    // ── autocomplete: commands first, then door codenames / protocols / booleans ──
    function suggestions() {
      const parts = input.value.split(/\s+/);
      const last = (parts[parts.length - 1] || '').toLowerCase();
      let pool = [];
      if (parts.length === 1) pool = Object.keys(COMMANDS).concat(...Object.values(COMMANDS).map(c => c.aliases));
      else {
        const cmd = resolve(parts[0]);
        if (cmd === 'lockdown' && parts.length === 2) pool = ['*', ...doors.map(d => d.code)];
        else if (cmd === 'protocol' && parts.length === 2) pool = PROTOCOLS.map(p => p.name);
        else if ((cmd === 'lockdown' || cmd === 'protocol') && parts.length === 3) pool = ['true', 'false'];
        else if (cmd === 'help' && parts.length === 2) pool = Object.keys(COMMANDS);
      }
      return pool.filter(x => x.toLowerCase().startsWith(last) && x.toLowerCase() !== last).slice(0, 6);
    }
    function renderAC() {
      const s = input.value ? suggestions() : [];
      ac.hidden = !s.length;
      ac.innerHTML = s.map((x, i) => `<div class="${i === 0 ? 'on' : ''}">${x}</div>`).join('');
    }
    function accept() {
      const s = suggestions();
      if (!s.length) return;
      const parts = input.value.split(/\s+/);
      parts[parts.length - 1] = s[0];
      input.value = parts.join(' ') + ' ';
      renderAC();
    }

    input.addEventListener('input', renderAC);
    input.addEventListener('keydown', e => {
      e.stopPropagation(); // keep the page's shortcuts out of the terminal
      if (e.key === 'Enter') { const v = input.value; input.value = ''; ac.hidden = true; run(v); }
      else if (e.key === 'Tab') { e.preventDefault(); accept(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (hIdx > 0) input.value = history[--hIdx]; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ''; }
      else if (e.key === 'Escape') { ac.hidden = true; }
    });
    root.querySelector('.sm-screen').addEventListener('click', () => {
      if (closed) { closed = false; root.querySelector('.sm-screen').classList.remove('off'); line('SAM-OS session resumed.', 'sm-ok'); }
      if (!window.getSelection().toString()) input.focus({ preventScroll: true });
    });
    root.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('click', () => {
      if (closed) { closed = false; root.querySelector('.sm-screen').classList.remove('off'); }
      run(b.dataset.cmd);
    }));

    // boot text, typed quickly line by line
    ['SAM-OS v3 · A-SYNC INTERNAL TERMINAL', 'Linking CMDR… ok', `Registry: ${doors.length} RemoteDoor(s), ${PROTOCOLS.length} protocols`, 'Type "help" or press a suggestion below.']
      .forEach((t, i) => later(() => line(t, i === 3 ? 'sm-dim' : ''), 140 * i));
    renderSide();

    return {
      destroy() {
        timers.forEach(clearTimeout); timers.clear();
        intervals.forEach(clearInterval); intervals.clear();
        root.innerHTML = '';
      }
    };
  }

  return { mount };
})();
