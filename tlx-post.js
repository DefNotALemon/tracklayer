/* tlx-post.js: the post chain (goal G8, slice P1 "the picture"). Global TLXPOST. Owns no save state.
   The main frame (tracklayer.js frame()) asks TLXPOST.render(scene, camera); it returns false when the chain is off or
   unsupported and the caller then draws straight to the canvas exactly as before.

   Scene -> HDR half-float MULTISAMPLED target with a depth texture (three r128 resolves colour AND depth on the
   blit) -> contact shade (half-res SSAO from depth, normals rebuilt from depth, depth-aware blur) -> bloom (bright pass,
   5-level down/up chain) -> ONE composite: contact shade, bloom, grade, ACES tone map with the exposure updSky set, sRGB
   -> optional FXAA on the LDR result -> canvas.

   Tone mapping: r128 materials tone-map inside their own shaders (also into render targets) and fog is mixed AFTER that.
   While rendering into the HDR target we set renderer.toneMapping = NoToneMapping (materials compile a Linear-encoding
   program for targets, a separate one from the canvas', see setProgram's outputEncoding check) and restore it for every
   direct path (INT.scene, fishing, gramShot, low preset). Fog is NOT done by the materials in the chain
   (scene.fog is null while the HDR target is drawn): r128 mixes fog AFTER tone mapping, in display space, so the composite
   redoes it that way from the depth buffer (same FogExp2 curve and colour), which keeps the far fell fading to exactly the
   sky's colour and the picture equal to the direct path. The sky dome (display-referred, no chunks) writes
   alpha 0 into the target: alpha is the "already tone mapped" mask, the composite does not tone map those pixels.

   Offers the next slices: TLXPOST.fx (ao, bloom, grade, fxaa, vig, grain: 0..1 each; all 0 = a plain tone map, equal to
   the direct path), TLXPOST.light(o) (bloom threshold etc from updSky), TLXPOST.on(), TLXPOST.depthTex() (resolved scene
   depth, valid after render), TLXPOST.sceneTex(), TLXPOST.size(), TLXPOST.stats. */
(() => {
  "use strict";
  const T = window.TLXPOST = { v: 1, ready: false, broken: false, err: "", level: 0, size: [0, 0], stats: { ms: 0, passes: 0, calls: 0 } };
  T.fx = { ao: 1, bloom: 1, grade: 1, fxaa: 1, vig: 1, grain: 1 };       // what is switched on (0..1); QG and the presets set these
  T.lt = { thr: 3.4, knee: 1.2, bloomK: 0.55, aoK: 1, day: 1 };           // driven from updSky
  let C = null, THREE = null, R = null, rtS = null, rtAO = null, rtAO2 = null, rtL = null, bl = [], quad = null, qCam = null, qScene = null, mats = null, aoN = 12, fxaaRT = null, first = true;
  const v2 = () => new THREE.Vector2();

  const VERT = "varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }";
  const ACES = `
    vec3 acesFit(vec3 c, float ex){
      c *= ex / 0.6;
      c = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777) * c;
      vec3 a = c * (c + 0.0245786) - 0.000090537, b = c * (0.983729 * c + 0.4329510) + 0.238081;
      c = a / b;
      return mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602) * c;
    }
    vec3 toSRGB(vec3 v){ v = clamp(v, 0.0, 1.0); return mix(pow(v, vec3(0.41666)) * 1.055 - 0.055, v * 12.92, vec3(lessThanEqual(v, vec3(0.0031308)))); }`;
  const SHP = `
    float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
    vec3 viewPos(vec2 uv, float d){ vec4 p = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }`;

  const mk = (frag, uniforms, extra) => new THREE.ShaderMaterial(Object.assign({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, transparent: false }, extra || {}));
  const U = v => ({ value: v });

  function buildMats() {
    const m = {};
    // ---- contact shade: half-res, hemisphere kernel round a normal rebuilt from depth
    const kern = []; { let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 32; i++) { let x = rnd() * 2 - 1, y = rnd() * 2 - 1, z = rnd() * 0.92 + 0.08; const l = Math.hypot(x, y, z) || 1; const k = 0.18 + 0.82 * Math.pow(i / 32, 2); kern.push(new THREE.Vector3(x / l * k, y / l * k, z / l * k)); } }
    m.ao = mk(`varying vec2 vUv; uniform sampler2D tDepth; uniform mat4 uProj; uniform mat4 uInvProj; uniform vec2 uPx; uniform vec3 uK[32]; uniform int uN; uniform float uR; uniform float uFar; uniform float uSeed;
      ${SHP}
      void main(){
        float d = texture2D(tDepth, vUv).x;
        if (d >= 0.99999) { gl_FragColor = vec4(1.0); return; }
        vec3 P = viewPos(vUv, d);
        float dist = -P.z; if (dist > uFar) { gl_FragColor = vec4(1.0); return; }
        vec2 o = uPx * 1.5;
        vec3 pl = viewPos(vUv - vec2(o.x, 0.0), texture2D(tDepth, vUv - vec2(o.x, 0.0)).x), pr = viewPos(vUv + vec2(o.x, 0.0), texture2D(tDepth, vUv + vec2(o.x, 0.0)).x);
        vec3 pd = viewPos(vUv - vec2(0.0, o.y), texture2D(tDepth, vUv - vec2(0.0, o.y)).x), pu = viewPos(vUv + vec2(0.0, o.y), texture2D(tDepth, vUv + vec2(0.0, o.y)).x);
        vec3 dx = abs(pr.z - P.z) < abs(P.z - pl.z) ? pr - P : P - pl, dy = abs(pu.z - P.z) < abs(P.z - pd.z) ? pu - P : P - pd;
        vec3 N = normalize(cross(dx, dy)); if (dot(N, -P) < 0.0) N = -N;
        float ang = ign(gl_FragCoord.xy + uSeed) * 6.2831853;
        vec3 rv = vec3(cos(ang), sin(ang), 0.0);
        vec3 Tn = normalize(rv - N * dot(rv, N)), Bn = cross(N, Tn);
        float R = uR, occ = 0.0, bias = 0.02 + 0.002 * dist;
        for (int i = 0; i < 32; i++) {
          if (i >= uN) break;
          vec3 k = uK[i]; vec3 S = P + (Tn * k.x + Bn * k.y + N * k.z) * R;
          vec4 q = uProj * vec4(S, 1.0); vec2 suv = q.xy / q.w * 0.5 + 0.5;
          if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
          float sd = texture2D(tDepth, suv).x;
          float sz = sd >= 0.99999 ? -1e5 : viewPos(suv, sd).z;
          float rc = smoothstep(0.0, 1.0, R / max(abs(P.z - sz), 1e-3));
          occ += (sz >= S.z + bias ? 1.0 : 0.0) * rc;
        }
        occ /= float(uN);
        float fade = 1.0 - smoothstep(uFar * 0.5, uFar, dist);
        occ = clamp((occ - 0.06) * 2.2, 0.0, 1.0);     // the first few per cent are the 25 cm snow grid and depth noise, not shade: flat snow stays at exactly 1
        gl_FragColor = vec4(1.0 - 0.45 * occ * fade, 0.0, 0.0, 1.0);
      }`, { tDepth: U(null), uProj: U(new THREE.Matrix4()), uInvProj: U(new THREE.Matrix4()), uPx: U(v2()), uK: U(kern), uN: U(12), uR: U(0.7), uFar: U(60), uSeed: U(0) });
    // depth-aware blur (one direction per pass)
    m.blur = mk(`varying vec2 vUv; uniform sampler2D tAO; uniform sampler2D tDepth; uniform vec2 uDir; uniform mat4 uInvProj;
      ${SHP}
      void main(){
        float d0 = texture2D(tDepth, vUv).x; float z0 = d0 >= 0.99999 ? 1e5 : -viewPos(vUv, d0).z;
        float sum = texture2D(tAO, vUv).r, ws = 1.0;
        for (int i = 1; i <= 4; i++) {
          float fi = float(i);
          for (int s = -1; s <= 1; s += 2) {
            vec2 uv = vUv + uDir * fi * float(s);
            float d = texture2D(tDepth, uv).x; float z = d >= 0.99999 ? 1e5 : -viewPos(uv, d).z;
            float w = (1.0 - fi * 0.18) * exp(-abs(z - z0) / (0.05 + z0 * 0.02));
            sum += texture2D(tAO, uv).r * w; ws += w;
          }
        }
        gl_FragColor = vec4(sum / ws, 0.0, 0.0, 1.0);
      }`, { tAO: U(null), tDepth: U(null), uDir: U(v2()), uInvProj: U(new THREE.Matrix4()) });
    // ---- bloom
    m.pre = mk(`varying vec2 vUv; uniform sampler2D tScene; uniform vec2 uPx; uniform float uThr; uniform float uKnee; uniform float uEx;
      vec3 br(vec3 c){ c *= uEx; float l = max(c.r, max(c.g, c.b)); float rq = clamp(l - uThr + uKnee, 0.0, 2.0 * uKnee); rq = rq * rq / (4.0 * uKnee + 1e-4);
        float k = max(rq, l - uThr) / max(l, 1e-4); return min(c * k, vec3(24.0)); }
      void main(){
        vec3 a = br(texture2D(tScene, vUv + uPx * vec2(-1.0, -1.0)).rgb), b = br(texture2D(tScene, vUv + uPx * vec2(1.0, -1.0)).rgb),
             c = br(texture2D(tScene, vUv + uPx * vec2(-1.0, 1.0)).rgb), d = br(texture2D(tScene, vUv + uPx * vec2(1.0, 1.0)).rgb);
        gl_FragColor = vec4((a + b + c + d) * 0.25, 1.0);
      }`, { tScene: U(null), uPx: U(v2()), uThr: U(3.4), uKnee: U(1.2), uEx: U(1) });
    m.down = mk(`varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uPx;
      void main(){ vec3 c = texture2D(tSrc, vUv + uPx * vec2(-1.0, -1.0)).rgb + texture2D(tSrc, vUv + uPx * vec2(1.0, -1.0)).rgb + texture2D(tSrc, vUv + uPx * vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + uPx * vec2(1.0, 1.0)).rgb;
        gl_FragColor = vec4(c * 0.25, 1.0); }`, { tSrc: U(null), uPx: U(v2()) });
    m.up = mk(`varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uPx; uniform float uW;
      void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
        c += (texture2D(tSrc, vUv + uPx * vec2(-1.0, 0.0)).rgb + texture2D(tSrc, vUv + uPx * vec2(1.0, 0.0)).rgb + texture2D(tSrc, vUv + uPx * vec2(0.0, -1.0)).rgb + texture2D(tSrc, vUv + uPx * vec2(0.0, 1.0)).rgb) * 2.0;
        c += texture2D(tSrc, vUv + uPx * vec2(-1.0, -1.0)).rgb + texture2D(tSrc, vUv + uPx * vec2(1.0, -1.0)).rgb + texture2D(tSrc, vUv + uPx * vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + uPx * vec2(1.0, 1.0)).rgb;
        gl_FragColor = vec4(c / 16.0 * uW, 1.0); }`, { tSrc: U(null), uPx: U(v2()), uW: U(1) }, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
    // ---- composite
    m.comp = mk(`varying vec2 vUv; uniform sampler2D tScene; uniform sampler2D tDepth; uniform sampler2D tAO; uniform sampler2D tBloom; uniform vec2 uPx; uniform vec2 uAOpx; uniform float uAO; uniform float uBloom; uniform float uEx;
      uniform float uGrade; uniform float uVig; uniform float uGrain; uniform float uAsp; uniform float uTime; uniform vec3 uShade; uniform vec3 uSun; uniform mat4 uInvProj; uniform float uDay;
      uniform float uDbg; uniform float uHF; uniform float uHFh; uniform float uYb; uniform mat4 uCamW; uniform vec3 uFogDisp; uniform float uFogD;
      ${SHP}${ACES}
      float lin(float d){ return -viewPos(vec2(0.5), d).z; }
      void main(){
        vec4 s = texture2D(tScene, vUv); vec3 c = s.rgb; float a = clamp(s.a, 0.0, 1.0);
        float d = texture2D(tDepth, vUv).x; bool geo = d < 0.99999; vec3 pv = geo ? viewPos(vUv, d) : vec3(0.0, 0.0, -1e5); float z0 = -pv.z;
        if (uAO > 0.0 && geo) {   // depth-aware upsample of the half-res contact shade (no halo round the sled against the sky)
          vec2 hp = vUv / uAOpx - 0.5; vec2 f = fract(hp), i0 = (floor(hp) + 0.5) * uAOpx; float sum = 0.0, ws = 0.0;
          for (int j = 0; j < 4; j++) { vec2 o = vec2(float(j & 1), float(j >> 1)); vec2 uv = i0 + o * uAOpx;
            float dd = texture2D(tDepth, uv).x; float zz = dd >= 0.99999 ? 1e5 : -viewPos(uv, dd).z;
            float w = mix(1.0 - f.x, f.x, o.x) * mix(1.0 - f.y, f.y, o.y) * exp(-abs(zz - z0) / (0.04 + z0 * 0.015)) + 1e-4;
            sum += texture2D(tAO, uv).r * w; ws += w; }
          c *= mix(1.0, sum / ws, uAO);
        }
        c += texture2D(tBloom, vUv).rgb * uBloom;
        float L = dot(c, vec3(0.2126, 0.7152, 0.0722)) * uEx;
        // shade is a touch cool, sun a touch warm (in linear light, before the curve)
        c *= mix(vec3(1.0), mix(uShade, uSun, smoothstep(0.12, 1.3, L)), uGrade);
        vec3 tm = acesFit(c, uEx);
        // shoulder: the curve clips at 1; roll the last quarter off so sunlit snow keeps its texture
        vec3 sh = mix(tm, vec3(0.74) + 0.26 * (1.0 - exp(-(tm - 0.74) / 0.26)), step(0.74, tm));
        tm = mix(tm, sh * (1.0 + 0.045 * uGrade), uGrade);
        vec3 raw = c;                                  // alpha 0 = display-referred already (sky dome, frost): no curve
        vec3 o = mix(clamp(raw, 0.0, 1.0), toSRGB(tm), a);   // alpha 0 pixels (the sky dome) are display values already
        if (geo) {   // fog, in display space after the curve exactly as the materials do it outside the chain, plus low height fog at dawn and dusk
          float f = 1.0 - exp(-uFogD * uFogD * z0 * z0);
          if (uHF > 0.0) { vec3 wp = (uCamW * vec4(pv, 1.0)).xyz, cp = uCamW[3].xyz; float k = (wp.y - cp.y) / max(z0, 1e-3) / uHFh;
            float tau = uHF * exp(-max(cp.y - uYb, 0.0) / uHFh) * (abs(k) < 1e-5 ? length(pv) : (1.0 - exp(-k * length(pv))) / k); f = 1.0 - (1.0 - f) * (1.0 - 0.92 * (1.0 - exp(-tau))); }
          o = mix(o, uFogDisp, f);
        }
        // vignette and grain in display space
        vec2 q = (vUv - 0.5) * vec2(uAsp, 1.0);
        o *= 1.0 - uVig * 0.13 * smoothstep(0.36, 1.1, length(q));
        o += (ign(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.014 * uGrain * (0.45 + 0.55 * (1.0 - o.g));
        if (uDbg > 0.5 && uDbg < 1.5) o = vec3(mix(1.0, texture2D(tAO, vUv).r, 1.0));
        gl_FragColor = vec4(clamp(o, 0.0, 1.0), 1.0);
      }`, { tScene: U(null), tDepth: U(null), tAO: U(null), tBloom: U(null), uPx: U(v2()), uAOpx: U(v2()), uAO: U(1), uBloom: U(0.5), uEx: U(1), uGrade: U(1), uVig: U(1), uGrain: U(1), uAsp: U(1.78), uTime: U(0),
      uDbg: U(0), uHF: U(0), uHFh: U(38), uYb: U(0), uCamW: U(new THREE.Matrix4()), uFogDisp: U(new THREE.Color()), uFogD: U(0), uShade: U(new THREE.Vector3(0.95, 0.985, 1.05)), uSun: U(new THREE.Vector3(1.04, 1.005, 0.95)), uInvProj: U(new THREE.Matrix4()), uDay: U(1) });
    m.fxaa = mk(`varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uPx;
      float lm(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
      void main(){
        vec3 nw = texture2D(tSrc, vUv + uPx * vec2(-1.0, -1.0)).rgb, ne = texture2D(tSrc, vUv + uPx * vec2(1.0, -1.0)).rgb, sw = texture2D(tSrc, vUv + uPx * vec2(-1.0, 1.0)).rgb, se = texture2D(tSrc, vUv + uPx * vec2(1.0, 1.0)).rgb, mc = texture2D(tSrc, vUv).rgb;
        float lnw = lm(nw), lne = lm(ne), lsw = lm(sw), lse = lm(se), lmm = lm(mc);
        float lmin = min(lmm, min(min(lnw, lne), min(lsw, lse))), lmax = max(lmm, max(max(lnw, lne), max(lsw, lse)));
        if (lmax - lmin < max(0.0312, lmax * 0.125)) { gl_FragColor = vec4(mc, 1.0); return; }
        vec2 dir = vec2(-((lnw + lne) - (lsw + lse)), (lnw + lsw) - (lne + lse));
        float dr = max((lnw + lne + lsw + lse) * 0.03125, 1.0 / 128.0);
        dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + dr), -8.0, 8.0) * uPx;
        vec3 ra = 0.5 * (texture2D(tSrc, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tSrc, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
        vec3 rb = ra * 0.5 + 0.25 * (texture2D(tSrc, vUv + dir * -0.5).rgb + texture2D(tSrc, vUv + dir * 0.5).rgb);
        float lb = lm(rb); gl_FragColor = vec4((lb < lmin || lb > lmax) ? ra : rb, 1.0);
      }`, { tSrc: U(null), uPx: U(v2()) });
    return m;
  }

  function rtOpts(type, filter) { return { minFilter: filter || THREE.LinearFilter, magFilter: filter || THREE.LinearFilter, format: THREE.RGBAFormat, type: type || THREE.UnsignedByteType, depthBuffer: false, stencilBuffer: false, generateMipmaps: false }; }

  function build(w, h) {
    free();
    const gl = R.getContext(), ms = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 4);
    const dt = new THREE.DepthTexture(w, h); dt.type = THREE.UnsignedIntType; dt.format = THREE.DepthFormat; dt.minFilter = dt.magFilter = THREE.NearestFilter;
    rtS = new THREE.WebGLMultisampleRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false, depthTexture: dt, generateMipmaps: false });
    rtS.samples = ms;
    const hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1);
    rtAO = new THREE.WebGLRenderTarget(hw, hh, rtOpts()); rtAO2 = new THREE.WebGLRenderTarget(hw, hh, rtOpts());
    bl = []; for (let i = 0; i < 5; i++) bl.push(new THREE.WebGLRenderTarget(Math.max(2, w >> (i + 1)), Math.max(2, h >> (i + 1)), rtOpts(THREE.HalfFloatType)));
    fxaaRT = new THREE.WebGLRenderTarget(w, h, rtOpts());
    T.size = [w, h];
  }
  function free() { for (const r of [rtS, rtAO, rtAO2, fxaaRT, ...bl]) if (r) { if (r.depthTexture) r.depthTexture.dispose(); r.dispose(); } rtS = rtAO = rtAO2 = fxaaRT = null; bl = []; }

  T.init = ctx => {
    if (T.ready) return T;
    C = ctx; THREE = ctx.THREE; R = ctx.renderer;
    try {
      const gl = R.getContext();
      if (!R.capabilities.isWebGL2) throw new Error("no WebGL2");
      if (!(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"))) throw new Error("no float colour buffers");
      gl.getExtension("OES_texture_float_linear");
      mats = buildMats();
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
      quad = new THREE.Mesh(g, mats.comp); quad.frustumCulled = false; qScene = new THREE.Scene(); qScene.add(quad); qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      T.ready = true; T.fx0 = Object.assign({}, T.fx); T.setAO(aoN);
    } catch (e) { T.broken = true; T.err = String(e && e.message || e); console.warn("TLXPOST off:", T.err); }
    return T;
  };
  T.on = () => T.ready && !T.broken && T.level > 0;
  T.setLevel = n => { T.level = n | 0; if (C && C.scene) C.scene.environment = T.on() ? (T.envTex || null) : null; };   // sky light only while the chain is on
  T.depthTex = () => rtS && rtS.depthTexture; T.sceneTex = () => rtS && rtS.texture;
  T.light = o => Object.assign(T.lt, o);
  T.resize = () => { if (rtS) { const v = v2(); R.getDrawingBufferSize(v); if (v.x !== T.size[0] || v.y !== T.size[1]) build(v.x, v.y); } };

  const pass = (mat, target, clear) => {
    quad.material = mat; R.setRenderTarget(target); if (clear === false) R.autoClear = false; R.render(qScene, qCam); R.autoClear = true; T.stats.passes++;
  };

  // The frame. Returns true when it drew the scene (false: the caller draws directly).
  T.render = (scene, camera) => {
    if (!T.on()) return false;
    const t0 = performance.now(), v = v2(), tm0 = R.toneMapping; R.getDrawingBufferSize(v); const w = v.x | 0, h = v.y | 0;
    if (w < 16 || h < 16) return false;
    try {
      if (!rtS || w !== T.size[0] || h !== T.size[1]) build(w, h);
      const ex = R.toneMappingExposure, fx = T.fx, lt = T.lt, info = R.info, skyU = C.sky && C.sky.material.uniforms;
      // ---- scene into the HDR target, linear, no curve in the materials
      const fog = scene.fog; T._fog = fog; scene.fog = null;
      R.toneMapping = THREE.NoToneMapping; if (skyU) skyU.uChain.value = 1;
      R.setRenderTarget(rtS);
      if (first) { first = false; const gl = R.getContext(); const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER); if (st !== gl.FRAMEBUFFER_COMPLETE) { R.setRenderTarget(null); R.toneMapping = tm0; scene.fog = fog; if (skyU) skyU.uChain.value = 0; throw new Error("HDR target incomplete " + st); } }
      R.render(scene, camera);
      R.setRenderTarget(null); R.toneMapping = tm0; scene.fog = fog; if (skyU) skyU.uChain.value = 0;
      const sc = { calls: info.render.calls, triangles: info.render.triangles, points: info.render.points, lines: info.render.lines };
      info.autoReset = false; T.stats.passes = 0;
      const depth = rtS.depthTexture, src = rtS.texture;
      const proj = camera.projectionMatrix, inv = camera.projectionMatrixInverse;
      // ---- contact shade
      const useAO = fx.ao > 0 && lt.aoK > 0;
      if (useAO) {
        const m = mats.ao.uniforms; m.tDepth.value = depth; m.uProj.value.copy(proj); m.uInvProj.value.copy(inv); m.uPx.value.set(1 / rtAO.width, 1 / rtAO.height); m.uN.value = aoN; m.uSeed.value = 0;
        pass(mats.ao, rtAO);
        const b = mats.blur.uniforms; b.tDepth.value = depth; b.uInvProj.value.copy(inv);
        b.tAO.value = rtAO.texture; b.uDir.value.set(1 / rtAO.width, 0); pass(mats.blur, rtAO2);
        b.tAO.value = rtAO2.texture; b.uDir.value.set(0, 1 / rtAO.height); pass(mats.blur, rtAO);
      }
      // ---- bloom
      const useBl = fx.bloom > 0 && lt.bloomK > 0;
      if (useBl) {
        const p = mats.pre.uniforms; p.tScene.value = src; p.uPx.value.set(1 / w, 1 / h); p.uThr.value = lt.thr; p.uKnee.value = lt.knee; p.uEx.value = ex; pass(mats.pre, bl[0]);
        for (let i = 1; i < 5; i++) { const d = mats.down.uniforms; d.tSrc.value = bl[i - 1].texture; d.uPx.value.set(0.5 / bl[i - 1].width, 0.5 / bl[i - 1].height); pass(mats.down, bl[i]); }
        for (let i = 3; i >= 0; i--) { const u = mats.up.uniforms; u.tSrc.value = bl[i + 1].texture; u.uPx.value.set(1 / bl[i + 1].width, 1 / bl[i + 1].height); u.uW.value = 1; pass(mats.up, bl[i], false); }
      }
      // ---- composite (+ FXAA)
      const c = mats.comp.uniforms, useFx = fx.fxaa > 0;
      c.tScene.value = src; c.tDepth.value = depth; c.tAO.value = rtAO.texture; c.tBloom.value = bl[0].texture; c.uInvProj.value.copy(inv);
      c.uPx.value.set(1 / w, 1 / h); c.uAOpx.value.set(1 / rtAO.width, 1 / rtAO.height); c.uAO.value = useAO ? fx.ao : 0; c.uBloom.value = useBl ? fx.bloom * lt.bloomK : 0; c.uEx.value = ex;
      c.uDbg.value = T.dbg || 0; c.uGrade.value = fx.grade; c.uVig.value = fx.vig; c.uGrain.value = fx.grain; c.uAsp.value = w / h; c.uTime.value = performance.now() / 1000 % 100;
      c.uHF.value = (lt.hf || 0) * 0.0016; c.uYb.value = lt.yb || 0; c.uCamW.value.copy(camera.matrixWorld); c.uFogD.value = fog ? fog.density : 0; if (fog) c.uFogDisp.value.copy(fog.color);
      pass(mats.comp, useFx ? fxaaRT : null);
      if (useFx) { const f = mats.fxaa.uniforms; f.tSrc.value = fxaaRT.texture; f.uPx.value.set(1 / w, 1 / h); pass(mats.fxaa, null); }
      info.autoReset = true; info.render.calls = sc.calls; info.render.triangles = sc.triangles; info.render.points = sc.points; info.render.lines = sc.lines;
      T.stats.ms = performance.now() - t0; T.stats.calls = sc.calls; if (T.firstMs === undefined) { T.firstMs = T.stats.ms; }
      return true;
    } catch (e) {
      T.broken = true; T.err = String(e && e.message || e); console.warn("TLXPOST off:", T.err);
      try { R.setRenderTarget(null); R.autoClear = true; R.info.autoReset = true; R.toneMapping = tm0; if (scene.fog === null && T._fog) scene.fog = T._fog; } catch (e2) { }
      return false;
    }
  };
  // debug/test: mean and min of the contact-shade buffer (r channel), and of a pixel window
  T.readAO = () => { if (!rtAO) return null; const w = rtAO.width, h = rtAO.height, b = new Uint8Array(w * h * 4); R.readRenderTargetPixels(rtAO, 0, 0, w, h, b); let m = 0, mn = 255, n = 0, lo = 0; for (let i = 0; i < b.length; i += 4) { m += b[i]; n++; if (b[i] < mn) mn = b[i]; if (b[i] < 230) lo++; } return { w, h, mean: m / n / 255, min: mn / 255, darkFrac: lo / n }; };
  // hemisphere kernel for n taps: radii spread over 0.12..1 of the radius (so few taps still reach the full 0.6 m)
  T.setAO = n => {
    aoN = Math.max(4, Math.min(32, n | 0));
    if (!mats) return;
    let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647, K = mats.ao.uniforms.uK.value;
    for (let i = 0; i < 32; i++) { const x = rnd() * 2 - 1, y = rnd() * 2 - 1, z = rnd() * 0.9 + 0.1, l = Math.hypot(x, y, z) || 1, k = 0.25 + 0.75 * Math.pow(((i % aoN) + 0.5) / aoN, 1.0); K[i].set(x / l * k, y / l * k, z / l * k); }
    mats.ao.uniforms.uN.value = aoN;
  };
})();
