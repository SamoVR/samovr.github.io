/* ════════════════════════════════════════════════
   HERO SHADER - raw WebGL, no libraries
   Two layers in one pass:
     1. a domain-warped fbm field in the site's accent colours that drifts
        slowly and leans toward the cursor
     2. an engine-style ground grid (like the RIFT viewport) seen through an
        orbit camera, with the red X and cyan Z axes running through the
        origin. The lens is shifted so the origin sits under my name, and
        the grid lines pick up the field's colour where it glows.
   Rendered at reduced resolution and paused whenever the hero is
   off-screen or the tab is hidden, so it costs nothing while you're
   reading the rest of the page.
   ════════════════════════════════════════════════ */

const HeroShader = (() => {
  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `
    #ifdef GL_OES_standard_derivatives
    #extension GL_OES_standard_derivatives : enable
    #endif
    precision highp float;
    uniform vec2  uRes;
    uniform float uTime;
    uniform vec2  uMouse;   // 0..1, eased in JS
    uniform float uScroll;  // 0 at top, 1 when the hero has scrolled away
    uniform vec2  uOrigin;  // where the grid origin lands on screen (centred, height-normalised)
    uniform float uIntro;   // 0..1, the camera settling in on load

    const vec3 LINE   = vec3(0.627, 0.667, 0.922);
    const vec3 AXIS_X = vec3(1.0, 0.365, 0.424);
    const vec3 AXIS_Z = vec3(0.22, 0.741, 0.973);
    const float FL = 1.7;

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

    // footprint of one pixel on the floor, in world units
    vec2 footprint(vec2 c, float t, float rdy) {
      #ifdef GL_OES_standard_derivatives
        return max(fwidth(c), vec2(1e-4));
      #else
        float px = t / (FL * uRes.y);
        return vec2(px, px / max(abs(rdy), 0.05));
      #endif
    }
    // 1 on a grid line, 0 between; fades once cells shrink to a few pixels
    float grid(vec2 c, vec2 fw, float width) {
      vec2 g = abs(fract(c - 0.5) - 0.5) / fw;
      float l = 1.0 - min(min(g.x, g.y) / width, 1.0);
      return l * (1.0 - smoothstep(0.18, 0.5, max(fw.x, fw.y)));
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 p  = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      vec2 m  = (uMouse - 0.5) * vec2(uRes.x / uRes.y, 1.0);
      float t = uTime * 0.035;

      // ── layer 1: the energy field (unchanged from the original hero) ──
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
      float glow = smoothstep(0.3, 0.9, f);

      // soft light that follows the cursor
      float d = length(p - m);
      col += violet * 0.13 * exp(-d * d * 4.0);

      // ── layer 2: the engine grid floor ──
      float ease = 1.0 - pow(1.0 - uIntro, 3.0);
      float yaw   = mix(1.05, 0.62, ease) + sin(uTime * 0.05) * 0.06 + (uMouse.x - 0.5) * 0.18;
      float pitch = mix(1.10, 0.42, ease) + (uMouse.y - 0.5) * 0.06 + uScroll * 0.25;
      float dist  = mix(26.0, 15.0, ease);
      vec2 qv = p - uOrigin;
      vec3 ro = vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * dist;
      vec3 fw = normalize(-ro);
      vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
      vec3 up = cross(rt, fw);
      vec3 rd = normalize(fw * FL + qv.x * rt + qv.y * up);
      if (rd.y < 0.0) {
        float tt = -ro.y / rd.y;
        vec2 g = (ro + rd * tt).xz;
        float fog = exp(-tt * 0.045);
        vec2 fwm = footprint(g, tt, rd.y);
        float minor = grid(g, fwm, 1.0);
        float major = grid(g / 5.0, fwm / 5.0, 1.15);
        float ax = 1.0 - min(abs(g.y) / fwm.y / 1.5, 1.0);
        float az = 1.0 - min(abs(g.x) / fwm.x / 1.5, 1.0);
        float axisFade = fog * (1.0 - smoothstep(0.25, 0.9, max(fwm.x, fwm.y)));
        // lines are faint in the dark and light up where the field glows
        vec3 lineCol = mix(LINE, violet * 1.25, glow);
        float lift = 0.6 + glow * 0.9;
        col = mix(col, lineCol, minor * 0.07 * fog * lift * ease);
        col = mix(col, lineCol, major * 0.14 * fog * lift * ease);
        col = mix(col, AXIS_X, ax * 0.5 * axisFade * ease);
        col = mix(col, AXIS_Z, az * 0.5 * axisFade * ease);
      }

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

  function init(canvas, opts) {
    const o = opts || {};
    if (!canvas) return null;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) return null; // CSS gradient on the canvas element stays as the fallback
    gl.getExtension('OES_standard_derivatives');

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

    const U = {};
    ['uRes', 'uTime', 'uMouse', 'uScroll', 'uOrigin', 'uIntro'].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mouse = { x: 0.62, y: 0.6, tx: 0.62, ty: 0.6 };
    const origin = { x: -0.35, y: 0.0 };
    let scroll = 0, visible = true, raf = 0, start = performance.now(), last = 0;
    // the grid settles in once, on the first frame after init (or instantly)
    let introStart = o.intro === false || reduced ? -1 : performance.now();

    // the grid is sharper than the soft field, so render a bit closer to native
    function resize() {
      const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.75;
      const w = Math.max(1, Math.floor(canvas.clientWidth * scale));
      const h = Math.max(1, Math.floor(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(U.uRes, w, h);
    }

    // put the grid origin under the anchor element (my name)
    function reaim() {
      const a = o.anchor, c = canvas.getBoundingClientRect();
      if (a && c.height) {
        const r = a.getBoundingClientRect();
        origin.x = (r.left + r.width * 0.5 - c.left - c.width / 2) / c.height;
        origin.y = (c.height / 2 - (r.bottom - c.top)) / c.height;
      }
      kick();
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      // ~40 fps cap keeps laptops cool; the motion is slow anyway
      if (now - last < 24) { raf = requestAnimationFrame(frame); return; }
      last = now;
      mouse.x += (mouse.tx - mouse.x) * 0.045;
      mouse.y += (mouse.ty - mouse.y) * 0.045;
      const intro = introStart < 0 ? 1 : Math.min(1, (now - introStart) / 1800);
      gl.uniform1f(U.uTime, (now - start) / 1000);
      gl.uniform2f(U.uMouse, mouse.x, mouse.y);
      gl.uniform1f(U.uScroll, scroll);
      gl.uniform2f(U.uOrigin, origin.x, origin.y);
      gl.uniform1f(U.uIntro, intro);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    resize();
    reaim();
    window.addEventListener('resize', () => { resize(); reaim(); }, { passive: true });
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
    return { kick, reaim, restartIntro() { if (!reduced) introStart = performance.now(); kick(); } };
  }

  return { init };
})();
