/* ════════════════════════════════════════════════
   TERMINAL - the "Poking Around" easter egg
   Plays the scripted lines from settings.terminalLines (editable in admin),
   then hands over a working prompt. Commands read from the same state the
   rest of the page renders, so they never go stale.
   ════════════════════════════════════════════════ */

const Terminal = (() => {
  let ctx = null;          // { state, openProject, glitch }
  let body = null, inputRow = null, input = null;
  let timer = null, introDone = false, started = false;
  const history = [];
  let histIdx = 0;

  const strip = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.replace(/\s+/g, ' ').trim(); };
  const scroll = () => { body.scrollTop = body.scrollHeight; };

  // ── output helpers ──
  function line(html, cls) {
    const row = document.createElement('div');
    row.className = 'term-line';
    const span = document.createElement('span');
    span.className = cls || 'term-text';
    span.innerHTML = html;
    row.appendChild(span);
    body.insertBefore(row, inputRow);
    scroll();
    return row;
  }
  const text = (t, cls) => line(esc(t), cls);
  function echoCmd(cmd) {
    const row = document.createElement('div');
    row.className = 'term-line';
    row.innerHTML = `<span class="term-prompt"><b>guest</b>:~$</span><span class="term-text"></span>`;
    row.lastChild.textContent = cmd;
    body.insertBefore(row, inputRow);
  }

  // ── fake filesystem ──
  function files() {
    const s = ctx.state;
    return {
      'about.txt': () => s.about.map(a => `<span class="term-acc">## ${esc(a.label)}</span>\n${esc(strip(a.content))}`).join('\n\n'),
      'skills.txt': () => s.skills.map(g => g.skills.map(k => esc(k.name)).join(' · ')).join(' · '),
      'contact.txt': () => s.contact.map(c => `${esc(c.label.padEnd(8))} ${esc(c.value)}`).join('\n'),
      'projects/': null
    };
  }

  const project = q => {
    const ps = ctx.state.projects;
    const n = parseInt(q, 10);
    if (!isNaN(n) && ps[n - 1]) return n - 1;
    const needle = String(q || '').toLowerCase();
    if (!needle) return -1;
    return ps.findIndex(p => p.name.toLowerCase().includes(needle) || projectSlug(p).includes(needle));
  };

  const COMMANDS = {
    help: {
      desc: 'list commands',
      run() {
        const rows = Object.entries(COMMANDS).filter(([, c]) => c.desc)
          .map(([k, c]) => `  <span class="term-acc">${(k + (c.args ? ' ' + c.args : '')).padEnd(16)}</span><span class="term-dim">${esc(c.desc)}</span>`);
        line('Available commands:\n' + rows.join('\n') + '\n<span class="term-dim">Tip: ↑/↓ for history, Tab to autocomplete.</span>');
      }
    },
    whoami: { desc: 'who is this', run() { line(esc(strip(ctx.state.settings.hero && ctx.state.settings.hero.bio) || 'Samo_VR - Programmer.')); } },
    about: { desc: 'a bit more about me', run() { line(files()['about.txt']()); } },
    ls: {
      desc: 'list files',
      args: '[dir]',
      run(a) {
        if ((a[0] || '').replace(/\/$/, '') === 'projects') return COMMANDS.projects.run();
        line(Object.keys(files()).map(f => f.endsWith('/') ? `<span class="term-acc">${f}</span>` : f).join('   '));
      }
    },
    cat: {
      args: '<file>',
      desc: 'print a file',
      run(a) {
        const f = files()[a[0]];
        if (!a[0]) return text('usage: cat <file>', 'term-err');
        if (f === null) return text(`cat: ${a[0]}: Is a directory`, 'term-err');
        if (!f) return text(`cat: ${a[0]}: No such file or directory`, 'term-err');
        line(f());
      }
    },
    projects: {
      desc: 'list my projects',
      run() {
        ctx.state.projects.forEach((p, i) => {
          const st = p.status === 'complete' ? '<span class="term-ok">done</span>' : '<span class="term-warn">wip </span>';
          line(`<span class="term-dim">[${i + 1}]</span> ${st}  <button type="button" class="term-link" data-open="${i}">${esc(p.name)}</button> <span class="term-dim">· ${esc(p.langs || '')}</span>`);
        });
        text('Type "open <number>" or click a name.', 'term-dim');
      }
    },
    open: {
      args: '<n|name>',
      desc: 'open a project',
      run(a) {
        const i = project(a.join(' '));
        if (i < 0) return text(`open: no project matches "${a.join(' ')}". Try "projects".`, 'term-err');
        text(`Opening ${ctx.state.projects[i].name}…`, 'term-ok');
        setTimeout(() => ctx.openProject(i), 250);
      }
    },
    skills: {
      desc: 'what I work with',
      run() {
        ctx.state.skills.forEach(g => {
          line(`<span class="term-acc">${esc(g.title)}</span>`);
          g.skills.forEach(s => {
            const n = Math.round((s.level || 0) / 10);
            line(`  ${esc(s.name.padEnd(16))}<span class="term-acc">${'█'.repeat(n)}</span><span class="term-dim">${'░'.repeat(10 - n)}</span>`);
          });
        });
      }
    },
    experience: {
      desc: "where I've worked",
      run() {
        ctx.state.experience.forEach(e => line(`<span class="term-dim">${esc(e.years.padEnd(20))}</span><span class="term-acc">${esc(e.company)}</span> <span class="term-dim">· ${esc(e.role)}</span>`));
      }
    },
    contact: { desc: 'how to reach me', run() { line(files()['contact.txt']()); } },
    email: {
      desc: 'copy my email',
      run() {
        const c = ctx.state.contact.find(x => /@/.test(x.value));
        if (!c) return text('No email on file.', 'term-err');
        copyText(c.value, 'Email');
        text(`${c.value} → clipboard`, 'term-ok');
      }
    },
    github: {
      desc: 'open my GitHub',
      run() {
        const c = ctx.state.contact.find(x => /github\.com/i.test(x.value));
        if (!c) return text('No GitHub on file.', 'term-err');
        window.open(c.value, '_blank', 'noopener');
        text(`Opening ${c.value}`, 'term-ok');
      }
    },
    neofetch: {
      desc: 'system info, but it\'s me',
      run() {
        const s = ctx.state;
        const langs = (s.skills[0] && s.skills[0].skills.map(k => k.name).join(', ')) || '';
        const wip = s.projects.filter(p => p.status !== 'complete').length;
        const art = ['  ██████╗ ', ' ██╔════╝ ', ' ╚█████╗  ', '  ╚═══██╗ ', ' ██████╔╝ ', ' ╚═════╝  ', '          ', '          '];
        const info = [
          '<span class="term-acc">guest</span>@<span class="term-acc">samo_vr</span>',
          '<span class="term-dim">-------------</span>',
          `<span class="term-acc">Role</span>      ${esc((s.settings.hero && s.settings.hero.eyebrow) || 'Programmer')}`,
          `<span class="term-acc">Languages</span> ${esc(langs)}`,
          `<span class="term-acc">Projects</span>  ${s.projects.length} (${wip} in progress)`,
          '<span class="term-acc">Uptime</span>    4+ years',
          '<span class="term-acc">Shell</span>     samo-sh 2.0',
          '<span class="term-acc">Theme</span>     violet <span style="color:#8b84ff">███</span><span style="color:#38bdf8">███</span><span style="color:#e5484d">███</span>'
        ];
        line(art.map((a, i) => `<span class="term-ascii">${a}</span>  ${info[i] || ''}`).join('\n'));
      }
    },
    history: { desc: 'previous commands', run() { line(history.map((h, i) => `<span class="term-dim">${String(i + 1).padStart(3)}</span>  ${esc(h)}`).join('\n') || '<span class="term-dim">(empty)</span>'); } },
    echo: { args: '<text>', run(a) { text(a.join(' ')); } },
    date: { run() { text(new Date().toString()); } },
    pwd: { run() { text('/home/guest'); } },
    cd: { run(a) { text(a[0] && a[0] !== '~' ? `cd: permission denied: ${a[0]} (guests stay home)` : '', a[0] ? 'term-err' : 'term-text'); } },
    clear: { desc: 'clear the screen', run() { clear(); } },
    cls: { run() { clear(); } },
    coffee: { desc: '☕', run() { line('<span class="term-warn">      ( (\n       ) )\n    ........\n    |      |]\n    \\      /\n     `----\'</span>\n<span class="term-ok">Coffee located. Productivity restored.</span>'); } },
    sudo: { desc: 'try it', run(a) { text(a.length ? `guest is not in the sudoers file. This incident will be reported to Samo_VR.` : 'usage: sudo <command>', 'term-err'); } },
    rm: { run(a) { if (a.join(' ').includes('-rf')) { text('Nice try. Everything here is static anyway. 🙂', 'term-warn'); ctx.glitch(); } else text('rm: missing operand', 'term-err'); } },
    './build.sh': {
      run(a) {
        const steps = ['[1/4] Resolving modules', '[2/4] Compiling shaders', '[3/4] Linking systems', '[4/4] Packaging' + (a.includes('--release') ? ' (release)' : ' (debug)')];
        input.disabled = true;
        steps.forEach((s, i) => setTimeout(() => {
          text(s + '… ok', 'term-dim');
          if (i === steps.length - 1) { text('Compiled & Released!', 'term-ok'); input.disabled = false; input.focus({ preventScroll: true }); }
        }, 260 * (i + 1)));
      }
    },
    glitch: { run() { ctx.glitch(); text('// reality.exe has stopped responding', 'term-comment'); } },
    konami: { run() { COMMANDS.glitch.run(); } },
    vim: { run() { text("You're now stuck in vim. Just kidding. Type :q to... oh wait.", 'term-warn'); } },
    exit: { desc: 'leave the terminal', run() { text('There is no escape. (Scroll down instead 😉)', 'term-dim'); } },
    hello: { run() { text('Hey! 👋 Type "help" to see what I can do.', 'term-ok'); } }
  };
  COMMANDS.exp = { run: COMMANDS.experience.run };
  COMMANDS.hi = COMMANDS.hello;

  function clear() {
    Array.from(body.children).forEach(c => { if (c !== inputRow) c.remove(); });
  }

  function run(raw) {
    const cmd = raw.trim();
    echoCmd(raw);
    if (!cmd) return scroll();
    history.push(cmd);
    histIdx = history.length;
    const [name, ...args] = cmd.split(/\s+/);
    const c = COMMANDS[name.toLowerCase()] || COMMANDS[name];
    if (c) c.run(args);
    else text(`command not found: ${name}. Type "help" for a list.`, 'term-err');
    scroll();
  }

  function complete() {
    const v = input.value;
    const parts = v.split(/\s+/);
    let pool, prefix;
    if (parts.length <= 1) { pool = Object.keys(COMMANDS); prefix = parts[0]; }
    else if (/^(cat|ls)$/.test(parts[0])) { pool = Object.keys(files()); prefix = parts[parts.length - 1]; }
    else if (parts[0] === 'open') { pool = ctx.state.projects.map(p => projectSlug(p)); prefix = parts[parts.length - 1]; }
    else return;
    const hits = pool.filter(k => k.startsWith(prefix.toLowerCase()));
    if (hits.length === 1) { parts[parts.length - 1] = hits[0]; input.value = parts.join(' ') + (parts.length === 1 ? ' ' : ''); }
    else if (hits.length > 1) { echoCmd(v); line(hits.join('   '), 'term-dim'); }
  }

  function buildInput() {
    inputRow = document.createElement('div');
    inputRow.className = 'term-line term-input-row';
    inputRow.innerHTML = `<span class="term-prompt"><b>guest</b>:~$</span>`;
    input = document.createElement('input');
    input.className = 'term-input';
    input.type = 'text';
    input.setAttribute('aria-label', 'Terminal input');
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    inputRow.appendChild(input);
    body.appendChild(inputRow);
    inputRow.hidden = true;

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const v = input.value; input.value = ''; run(v); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (histIdx > 0) input.value = history[--histIdx]; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); histIdx = Math.min(history.length, histIdx + 1); input.value = history[histIdx] || ''; }
      else if (e.key === 'Tab') { e.preventDefault(); complete(); }
      else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); clear(); }
      else if (e.key === 'c' && e.ctrlKey && !window.getSelection().toString()) { echoCmd(input.value + '^C'); input.value = ''; }
      e.stopPropagation(); // keep the page's own shortcuts (Ctrl K, /) out of the shell
    });
    body.addEventListener('click', e => {
      const open = e.target.closest('[data-open]');
      if (open) { ctx.openProject(parseInt(open.dataset.open, 10)); return; }
      if (window.getSelection().toString()) return; // let people copy text
      skipIntro();
      input.focus({ preventScroll: true });
    });
  }

  // ── scripted intro: commands are typed, output appears instantly ──
  function typeSequence(lines, i) {
    if (introDone) return;
    if (i >= lines.length) return finishIntro();
    const l = lines[i];
    if (l.type === 'cmd') {
      const row = document.createElement('div');
      row.className = 'term-line';
      row.innerHTML = `<span class="term-prompt"><b>guest</b>:~$</span><span class="term-text"></span><span class="term-cursor"></span>`;
      body.insertBefore(row, inputRow);
      const span = row.children[1], cur = row.children[2];
      const txt = l.text || '';
      let n = 0;
      const tick = () => {
        span.textContent = txt.slice(0, n++);
        if (n <= txt.length) timer = setTimeout(tick, 34 + Math.random() * 40);
        else { cur.remove(); timer = setTimeout(() => typeSequence(lines, i + 1), 360); }
      };
      tick();
    } else {
      text(l.text || '', l.type === 'comment' ? 'term-comment' : 'term-text');
      timer = setTimeout(() => typeSequence(lines, i + 1), 420);
    }
    scroll();
  }
  function finishIntro() {
    if (introDone) return;
    introDone = true;
    clearTimeout(timer);
    text('Type "help" to look around.', 'term-dim');
    inputRow.hidden = false;
    scroll();
  }
  function skipIntro() {
    if (introDone) return;
    started = true;
    clearTimeout(timer);
    clear();
    introLines().forEach(l => {
      if (l.type === 'cmd') echoCmd(l.text || '');
      else text(l.text || '', l.type === 'comment' ? 'term-comment' : 'term-text');
    });
    finishIntro();
  }
  const introLines = () => {
    const s = ctx.state.settings || {};
    return (s.terminalLines && s.terminalLines.length) ? s.terminalLines : DEFAULT.settings.terminalLines;
  };

  function init(c) {
    ctx = c;
    const section = document.getElementById('terminal-section');
    const s = ctx.state.settings || {};
    section.hidden = !s.terminalEnabled;
    const menuLink = document.getElementById('mobile-terminal-link');
    if (menuLink) menuLink.hidden = !s.terminalEnabled;
    if (!s.terminalEnabled) { clearTimeout(timer); return; }
    document.getElementById('term-title-label').textContent = s.terminalTitle || 'guest@samo_vr: ~';
    body = document.getElementById('term-body');
    if (!inputRow) buildInput();
    if (started) return;
    // start typing once the terminal is actually on screen
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (started || introDone) return; // visitor already clicked in and skipped it
      started = true;
      typeSequence(introLines(), 0);
    }, { threshold: 0.35 });
    io.observe(body);
  }

  // re-run after admin preview changes the lines
  function reset(c) {
    ctx = c;
    clearTimeout(timer);
    if (body && inputRow) { clear(); introDone = false; inputRow.hidden = true; started = false; }
    init(c);
  }

  function focus() {
    if (!input) return;
    skipIntro();
    input.focus({ preventScroll: true });
  }

  return { init, reset, focus };
})();
