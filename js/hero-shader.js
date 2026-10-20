/* ════════════════════════════════════════════════
   HERO SHADER - raw WebGL, no libraries
   A domain-warped fbm field in the site's accent colours that drifts slowly
   and leans toward the cursor. Rendered at reduced resolution and paused
   whenever the hero is off-screen or the tab is hidden, so it costs nothing
   while you're reading the rest of the page.
   ════════════════════════════════════════════════ */

const HeroShader = (() => {
  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `
    precision mediump float;
    uniform vec2  uRes;
    uniform float uTime;
    uniform vec2  uMouse;   // 0..1, eased in JS
    uniform float uScroll;  // 0 at top, 1 when the hero has scrolled away

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 p  = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      vec2 m  = (uMouse - 0.5) * vec2(uRes.x / uRes.y, 1.0);
      float t = uTime * 0.035;

      // two levels of domain warping, nudged by the cursor
      vec2 q = vec2(fbm(p * 1.5 + t + m * 0.15), fbm(p * 1.5 - t + vec2(3.1, 1.7)));
      vec2 r = vec2(fbm(p * 1.3 + 2.0 * q + vec2(1.7, 9.2) + t * 1.4),
                    fbm(p * 1.3 + 2.0 * q + vec2(8.3, 2.8) - t));
      float f = fbm(p * 1.1 + 2.3 * r + uScroll * 0.6);

      vec3 base   = vec3(0.031, 0.031, 0.043);
      vec3 violet = vec3(0.545, 0.518, 1.0);
      vec3 cyan   = vec3(0.220, 0.741, 0.973);
      vec3 rose   = vec3(0.898, 0.282, 0.302);

      vec3 col = base;
      col = mix(col, violet * 0.55, smoothstep(0.32, 0.95, f) * 0.78);
      col = mix(col, cyan * 0.42,   smoothstep(0.50, 1.00, r.x) * 0.38);
      col = mix(col, rose * 0.38,   smoothstep(0.62, 1.05, q.y * f * 1.6) * 0.22);

      // soft light that follows the cursor
      float d = length(p - m);
      col += violet * 0.13 * exp(-d * d * 4.0);

      // fine contour lines: a nod to height maps / iso lines
      float iso = abs(fract(f * 9.0) - 0.5);
      col += violet * 0.06 * smoothstep(0.07, 0.0, iso) * smoothstep(0.25, 0.75, f);

      // vignette, fade into the page at the bottom, dim as you scroll away
      col *= smoothstep(1.55, 0.2, length(p * vec2(0.8, 1.1)));
      col  = mix(base, col, smoothstep(0.0, 0.38, uv.y));
      col  = mix(col, base, uScroll * 0.7);

      // a touch of grain so gradients don't band
      col += (hash(gl_FragCoord.xy + fract(uTime * 7.0)) - 0.5) * 0.018;
      gl_FragColor = vec4(col, 1.0);
    }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[hero-shader]', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function init(canvas) {
    if (!canvas) return null;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) return null; // CSS gradient on the canvas element stays as the fallback

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    // one oversized triangle covers the whole viewport
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uMouse = gl.getUniformLocation(prog, 'uMouse');
    const uScroll = gl.getUniformLocation(prog, 'uScroll');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mouse = { x: 0.62, y: 0.6, tx: 0.62, ty: 0.6 };
    let scroll = 0, visible = true, raf = 0, start = performance.now(), last = 0;

    // render below native resolution: the field is soft, nobody can tell
    function resize() {
      const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
      const w = Math.max(1, Math.floor(canvas.clientWidth * scale));
      const h = Math.max(1, Math.floor(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      // ~40 fps cap keeps laptops cool; the motion is slow anyway
      if (now - last < 24) { raf = requestAnimationFrame(frame); return; }
      last = now;
      mouse.x += (mouse.tx - mouse.x) * 0.045;
      mouse.y += (mouse.ty - mouse.y) * 0.045;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uScroll, scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    resize();
    kick();
    window.addEventListener('resize', () => { resize(); kick(); }, { passive: true });
    window.addEventListener('pointermove', e => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = 1 - e.clientY / window.innerHeight;
    }, { passive: true });
    window.addEventListener('scroll', () => {
      scroll = Math.min(1, window.scrollY / Math.max(1, canvas.clientHeight));
      if (reduced) kick();
    }, { passive: true });
    document.addEventListener('visibilitychange', kick);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(canvas);

    canvas.classList.add('gl-on');
    return { kick };
  }

  return { init };
})();
