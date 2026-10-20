/* ════════════════════════════════════════════════
   FX - the motion layer for index.html
   Smooth scrolling (Lenis), scroll reveals, the intro, hero entrance,
   the self-typing code card, marquee, timeline progress and pointer
   effects. Everything here is optional polish: with JS off, reduced
   motion, or a missing library, the page still renders fully.
   ════════════════════════════════════════════════ */

(function () {
  const S = state.settings || {};
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const G = window.gsap && window.ScrollTrigger ? window.gsap : null;
  const EASE = 'cubic-bezier(.16,1,.3,1)';
  if (G) G.registerPlugin(ScrollTrigger);

  // ═══════════════ SMOOTH SCROLL ═══════════════
  if (window.Lenis && !reduced) {
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, touchMultiplier: 1.1 });
    SVR.lenis = lenis;
    if (SVR.locks) lenis.stop(); // a deep-linked project may already be open
    if (G) {
      lenis.on('scroll', ScrollTrigger.update);
      G.ticker.add(t => lenis.raf(t * 1000));
      G.ticker.lagSmoothing(0);
    } else {
      const loop = t => { lenis.raf(t); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
  }

  // ═══════════════ SCROLL REVEAL ═══════════════
  // Hidden by CSS until .in is added; the entrance itself is a WAAPI
  // animation, so nothing lingers in the element's own transitions afterwards.
  const revealOn = S.scrollReveal !== false;
  // reduced motion: fade only, no sliding
  const FROM = reduced ? { opacity: 0 } : { opacity: 0, transform: 'translateY(28px)' };
  root.classList.add('fx-ready');
  if (!revealOn) root.classList.remove('js-reveal');
  let revealIO = null;

  function revealed(el, i) {
    el.classList.add('in');
    if (revealOn) el.animate([FROM, { opacity: 1, transform: 'none' }],
      { duration: 900, delay: i * 70, easing: EASE, fill: 'backwards' });
    $$('.skill-meter i', el).forEach((seg, j) => setTimeout(() => seg.classList.add('on'), (revealOn ? 200 + i * 70 : 0) + j * 40));
  }
  function observeReveals() {
    const pending = $$('[data-reveal]:not(.in)');
    if (!revealOn) { pending.forEach(el => revealed(el, 0)); return; }
    if (!revealIO) {
      revealIO = new IntersectionObserver(entries => {
        entries.filter(e => e.isIntersecting).map(e => e.target)
          .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
          .forEach((el, i) => { revealIO.unobserve(el); revealed(el, i); });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    }
    pending.forEach(el => revealIO.observe(el));
  }

  // ═══════════════ TEXT EFFECTS ═══════════════
  const GLYPHS = '!<>-_\\/[]{}=+*^?#01ABCDEFXYZabcdef';
  function scramble(el, text, dur) {
    dur = dur || 900;
    const n = text.length;
    const at = Array.from({ length: n }, (_, i) => (i / n) * dur * 0.65 + Math.random() * dur * 0.35);
    const start = performance.now();
    const tick = now => {
      const t = now - start;
      let out = '';
      for (let i = 0; i < n; i++) out += (t >= at[i] || text[i] === ' ') ? text[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = out;
      if (t < dur) requestAnimationFrame(tick); else el.textContent = text;
    };
    requestAnimationFrame(tick);
  }

  function countUp() {
    $$('.hero-stats .count').forEach((el, i) => {
      const to = parseFloat(el.dataset.to);
      if (isNaN(to)) return;
      const dec = (String(el.dataset.to).split('.')[1] || '').length;
      const start = performance.now() + 250 + i * 90, dur = 1400;
      el.textContent = '0';
      const tick = now => {
        const k = Math.max(0, Math.min(1, (now - start) / dur));
        el.textContent = (to * (1 - Math.pow(1 - k, 4))).toFixed(dec);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  function roleLoop() {
    const roles = ((S.hero && S.hero.roles) || []).filter(Boolean);
    const el = $('#role-rotator');
    if (!el || roles.length < 2) return;
    let i = 0;
    const type = s => {
      let n = 0;
      const tick = () => { el.textContent = s.slice(0, ++n); if (n < s.length) setTimeout(tick, 42 + Math.random() * 45); else setTimeout(erase, 2600); };
      tick();
    };
    const erase = () => {
      const tick = () => {
        el.textContent = el.textContent.slice(0, -1);
        if (el.textContent.length) setTimeout(tick, 20);
        else { i = (i + 1) % roles.length; setTimeout(() => type(roles[i]), 220); }
      };
      tick();
    };
    setTimeout(erase, 3000);
  }

  // ═══════════════ HERO CODE CARD ═══════════════
  const KW = {
    lua: new Set('local function end if then else elseif for in do while return not and or nil true false repeat until break'.split(' ')),
    cpp: new Set('void const auto for if else return class struct public private this nullptr true false float int bool unsigned static new delete namespace using template typename'.split(' '))
  };
  const RE = {
    lua: /(--.*$)|("(?:[^"\\]|\\.)*"?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)|([{}()[\];,.<>=~#*+\-:]+)/g,
    cpp: /(\/\/.*$)|("(?:[^"\\]|\\.)*"?)|(\b\d+(?:\.\d+)?f?\b)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)|([{}()[\];,.<>=!&|*+\-:?]+)/g
  };
  function highlight(line, lang) {
    const kw = KW[lang] || KW.lua, re = RE[lang] || RE.lua;
    let out = '', last = 0;
    line.replace(re, (m, com, str, num, fn, id, punc, idx) => {
      out += esc(line.slice(last, idx));
      last = idx + m.length;
      const cls = com ? 'c' : str ? 's' : num ? 'n' : fn ? (kw.has(fn) ? 'k' : 'f')
        : id ? (kw.has(id) ? 'k' : (lang === 'cpp' && /^[A-Z]/.test(id) ? 't' : '')) : punc ? 'p' : '';
      out += cls ? `<span class="tok-${cls}">${esc(m)}</span>` : esc(m);
      return m;
    });
    return out + esc(line.slice(last));
  }

  function codeCard() {
    const snippets = (S.heroCode || []).filter(s => s && s.code);
    const visual = $('.hero-visual');
    if (!snippets.length) { if (visual) visual.hidden = true; return; }
    const tabs = $('#code-tabs'), body = $('#code-body'), langEl = $('#code-lang'), posEl = $('#code-pos');
    tabs.innerHTML = snippets.map(s => `<span class="code-tab" data-lang="${esc(s.lang)}"><i></i>${esc(s.file)}</span>`).join('');
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe($('#code-card'));

    const render = (code, lang, cursor) => {
      const lines = code.split('\n');
      body.innerHTML = lines.map((l, i) => `<span class="code-line">${highlight(l, lang) || ' '}${cursor && i === lines.length - 1 ? '<span class="code-cursor"></span>' : ''}</span>`).join('');
      posEl.textContent = `Ln ${lines.length}, Col ${lines[lines.length - 1].length + 1}`;
    };
    const show = si => {
      const s = snippets[si];
      $$('.code-tab', tabs).forEach((t, i) => t.classList.toggle('active', i === si));
      langEl.textContent = s.lang === 'cpp' ? 'C++' : 'Luau';
      const next = () => show((si + 1) % snippets.length);
      let n = 0;
      const tick = () => {
        if (!visible || document.hidden) { setTimeout(tick, 400); return; }
        n = Math.min(s.code.length, n + 1 + (Math.random() < 0.35 ? 1 : 0));
        render(s.code.slice(0, n), s.lang, true);
        if (n < s.code.length) setTimeout(tick, s.code[n - 1] === '\n' ? 110 : 16 + Math.random() * 28);
        else setTimeout(next, 3600);
      };
      tick();
    };
    show(0);
  }

  // ═══════════════ INTRO + HERO ENTRANCE ═══════════════
  function runIntro(done) {
    let skip = !S.heroReveal || reduced || SVR.deepLinked || S.lockdown;
    try { if (sessionStorage.getItem('svr_intro_done')) skip = true; } catch {}
    if (skip) return done(false);

    lockScroll();
    const el = document.createElement('div');
    el.className = 'intro';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <img class="intro-logo" src="images/logo.svg" width="64" height="64" alt="">
      <div class="intro-name"><span class="a">Samo</span><span class="b" style="color:var(--accent)">_VR</span></div>
      <div class="intro-bar"><i></i></div>
      <div class="intro-log"></div>
      <div class="intro-skip">click or press any key to skip</div>`;
    document.body.appendChild(el);
    scramble($('.a', el), 'Samo', 700);
    scramble($('.b', el), '_VR', 900);
    requestAnimationFrame(() => requestAnimationFrame(() => { $('.intro-bar i', el).style.transform = 'scaleX(1)'; }));
    const log = $('.intro-log', el);
    ['loading systems', 'compiling shaders', 'validating remotes'].forEach((s, i) =>
      setTimeout(() => { log.innerHTML = `&gt; ${s} <b>ok</b>`; }, 160 + i * 340));

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => window.removeEventListener(t, finish));
      el.classList.add('done');
      unlockScroll();
      try { sessionStorage.setItem('svr_intro_done', '1'); } catch {}
      setTimeout(() => el.remove(), 700);
      done(true);
    };
    const timer = setTimeout(finish, 1450);
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => window.addEventListener(t, finish, { passive: true }));
  }

  function heroEnter(animate) {
    root.classList.remove('js-hero');
    if (animate) {
      $$('[data-hero]').forEach((el, i) => el.animate(
        [reduced ? { opacity: 0 } : { opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }],
        { duration: 1000, delay: 60 + i * 85, easing: EASE, fill: 'backwards' }));
      const status = $('#hero-status');
      if (status && !status.hidden) status.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 800, easing: EASE, fill: 'backwards' });
      $$('[data-scramble]').forEach((el, i) => setTimeout(() => scramble(el, el.dataset.scramble, 950), 120 + i * 120));
      countUp();
    }
    roleLoop();
    codeCard();
  }

  // ═══════════════ MARQUEE (reacts to scroll speed and direction) ═══════════════
  function marquee() {
    const track = $('#marquee-track');
    if (!track || reduced) return;
    let x = 0, half = 0, vis = true, last = performance.now(), boost = 0, dir = -1;
    const measure = () => { half = track.firstElementChild ? track.firstElementChild.offsetWidth : 0; };
    measure();
    window.addEventListener('resize', measure, { passive: true });
    if (document.fonts) document.fonts.ready.then(measure);
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe(track);
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      if (dy) { dir = dy > 0 ? -1 : 1; boost = Math.min(boost + Math.abs(dy) * 0.02, 6); }
    }, { passive: true });
    const loop = now => {
      const dt = Math.min(64, now - last);
      last = now;
      if (vis && half) {
        x += dir * (0.035 + boost * 0.05) * dt;
        boost *= 0.94;
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    SVR.remeasureMarquee = measure;
  }

  // ═══════════════ SCROLL-LINKED (GSAP ScrollTrigger) ═══════════════
  let triggers = [];
  function scrollLinked() {
    triggers.forEach(t => t.kill());
    triggers = [];
    const fill = $('.timeline-fill');
    const items = $$('.exp-item');
    if (!G || reduced) {
      if (fill) fill.style.transform = 'scaleY(1)';
      items.forEach(i => i.classList.add('lit'));
      return;
    }
    if (fill) {
      const tw = G.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#experience-container', start: 'top 62%', end: 'bottom 62%', scrub: 0.4 } });
      triggers.push(tw.scrollTrigger);
    }
    items.forEach(item => triggers.push(ScrollTrigger.create({
      trigger: item, start: 'top 62%',
      onEnter: () => item.classList.add('lit'), onLeaveBack: () => item.classList.remove('lit')
    })));
  }
  function heroParallax() {
    if (!G || reduced) return;
    const st = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    G.to('.hero-copy', { yPercent: -10, opacity: 0.2, ease: 'none', scrollTrigger: st });
    G.to('.hero-visual', { yPercent: -22, ease: 'none', scrollTrigger: { ...st } });
  }

  // ═══════════════ PROGRESS BAR + BACK TO TOP ═══════════════
  function scrollUI() {
    const bar = $('#progress-bar'), top = $('#to-top'), ring = $('#to-top-ring');
    const showBar = S.progressBar !== false;
    bar.hidden = !showBar;
    let queued = false;
    const update = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (showBar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
      ring.style.strokeDashoffset = (100.53 * (1 - p)).toFixed(2);
      top.classList.toggle('show', window.scrollY > 700);
    };
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    update();
    top.addEventListener('click', () => scrollToId('top'));
  }

  // ═══════════════ POINTER EFFECTS ═══════════════
  function cursorGlow() {
    const g = $('#cursor-glow');
    if (!S.cursorEffect || !fine || reduced || !g) return;
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = 0;
    const loop = () => {
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      g.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      raf = (Math.abs(tx - x) + Math.abs(ty - y) > 0.5) ? requestAnimationFrame(loop) : 0;
    };
    window.addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY;
      g.classList.add('on');
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => g.classList.remove('on'));
  }

  // spotlight that follows the cursor + a gentle 3D tilt on project cards
  function cardFX() {
    if (!fine || reduced) return;
    $$('.project-card').forEach(card => {
      if (card._fx) return;
      card._fx = true;
      const max = card.classList.contains('featured') ? 1.6 : 4.5;
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        card.style.transform = `perspective(1000px) rotateX(${((0.5 - py) * max).toFixed(2)}deg) rotateY(${((px - 0.5) * max).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  function magnetic() {
    if (!fine || reduced) return;
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px,${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  // ═══════════════ BOOT ═══════════════
  if (typeof HeroShader !== 'undefined') HeroShader.init($('#hero-canvas'));
  observeReveals();
  scrollUI();
  cursorGlow();
  marquee();
  scrollLinked();
  heroParallax();
  cardFX();
  magnetic();
  runIntro(played => heroEnter(S.heroReveal !== false && (played || !SVR.deepLinked)));

  const refreshTriggers = () => { if (G) ScrollTrigger.refresh(); };
  if (document.fonts) document.fonts.ready.then(refreshTriggers);
  window.addEventListener('load', refreshTriggers);

  // called by portfolio.js after it re-renders (admin live preview)
  SVR.fx = {
    refresh() {
      observeReveals();
      cardFX();
      scrollLinked();
      if (SVR.remeasureMarquee) SVR.remeasureMarquee();
      refreshTriggers();
    }
  };
})();
