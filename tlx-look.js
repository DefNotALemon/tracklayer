/* ---------------------------------------------------------------------------------------------------------
   tlx-look.js : TLXL, the shared look kit for goal G8 (the realistic look). Loaded after tlx.js and before the other
   tlx-*.js and tracklayer.js. It owns no save state and registers nothing with TLX. Every slice of loop/REALISM.md
   extends this file instead of writing another noise function or another material in place.

   1. Textures. Everything is drawn on a canvas at load (no image files), cached by key, with mipmaps and the
      renderer's anisotropy once TLXL.init(renderer) has run. Normal maps come from a height field (TLXL.height) through a
      Sobel filter, so a stamped seam or zip line is just a groove in the height field before it becomes a normal map.
        TLXL.height(w, h)               height field {w, h, d: Float32Array}, 0..1
        H.noise(cell, amp, seed)        add periodic value noise;  H.weave(period, amp, rip)  woven cloth (rip = ripstop grid)
        H.grain(amp, seed)              per pixel speckle;  H.bumps(n, r, amp, seed)  dimples / orange peel
        H.seam(u0,v0,u1,v1,o)           stitched groove between two UV points (o: w, depth, stitch)
        H.zip(u0,v0,u1,v1,o)            a toothed ridge;  H.panel(u0,v0,u1,v1,o)  a rectangle of seams;  H.ridge(...)  raised strip
        H.toNormal(k)  -> canvas        Sobel normal map;  H.toGray(lo, hi) -> canvas;  H.toTone(base, amp) -> canvas
      UV rectangles use v up (v = 0 is the bottom of the image, as three.js samples it).
        TLXL.fabric(kind, o)            {map, normalMap, roughnessMap} for 'shell' 'fleece' 'knit' 'leather' 'rubber'
                                        'plastic' 'gloss' 'skin' 'lens'; o.size (power of two), o.repeat, o.key, o.stamp(H)
        TLXL.dressMat(mat, kind, o)     assign those maps to a MeshStandardMaterial (idempotent), returns mat
   2. Shapes, all returning BufferGeometry with UVs and smooth normals:
        TLXL.loft(sections, o)          elliptical cross-sections along y (or z with o.axis='z'): {y, rx, rz, cx, cz, n}
                                        (n = superellipse exponent, 2 = ellipse, 4 = rounded square); o.seg, o.uv [u0,v0,u1,v1],
                                        o.a0/o.a1 arc range (a patch), o.roundTop / o.roundBottom (dome length), o.cap, o.inflate
        TLXL.rbox(w, h, d, r, seg)      bevelled box;  TLXL.ell(rx, ry, rz, seg)  ellipsoid;  TLXL.lathe(profile, seg, uv)
        TLXL.tube(points, r, o)         tube along a Catmull-Rom curve with round ends
        TLXL.xf(geo, {x,y,z,rx,ry,rz,sx,sy,sz})  transform in place;  TLXL.merge(items) / TLXL.build(items, parent, o)
          items are {g: geometry, m: material}; build makes ONE mesh per material (the draw-call budget).
   3. TLXL.fig: the human figure kit (body, clothes, heads, hands, boots) used by every person in the game (see below).
   --------------------------------------------------------------------------------------------------------- */
(function () {
  "use strict";
  const T = window.THREE; if (!T) return;
  const TLXL = window.TLXL = { v: 1, renderer: null, aniso: 1, srgb: false, lite: false, ms: 0 };
  const cache = {}, texList = [];
  const PI = Math.PI, TAU = Math.PI * 2;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  TLXL.rng = rng;
  TLXL.init = function (renderer) {
    TLXL.renderer = renderer; TLXL.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    TLXL.srgb = renderer.outputEncoding === T.sRGBEncoding;
    for (const t of texList) { t.anisotropy = TLXL.aniso; if (t.tlSrgb && TLXL.srgb) t.encoding = T.sRGBEncoding; t.needsUpdate = true; }
  };
  function mkTex(c, o) {
    o = o || {};
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = o.repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping;
    t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter;
    t.anisotropy = TLXL.aniso; t.tlSrgb = !!o.srgb; if (o.srgb && TLXL.srgb) t.encoding = T.sRGBEncoding;
    texList.push(t); return t;
  }

  /* ---------------- height fields ---------------- */
  function vnoise(w, h, cell, seed) {              // periodic value noise 0..1
    const gx = Math.max(1, Math.ceil(w / cell)), gy = Math.max(1, Math.ceil(h / cell)), r = rng(seed), g = new Float32Array(gx * gy), out = new Float32Array(w * h);
    for (let i = 0; i < g.length; i++) g[i] = r();
    const xa = new Int32Array(w), xb = new Int32Array(w), tx = new Float32Array(w);
    for (let x = 0; x < w; x++) { const fx = x / cell, x0 = Math.floor(fx), t = fx - x0; tx[x] = t * t * (3 - 2 * t); xa[x] = x0 % gx; xb[x] = (x0 + 1) % gx; }
    for (let y = 0; y < h; y++) {
      const fy = y / cell, y0 = Math.floor(fy), ty0 = fy - y0, ty = ty0 * ty0 * (3 - 2 * ty0), ya = (y0 % gy) * gx, yb = ((y0 + 1) % gy) * gx, o = y * w;
      for (let x = 0; x < w; x++) { const a = g[ya + xa[x]], b = g[yb + xa[x]]; out[o + x] = (a + (g[ya + xb[x]] - a) * tx[x]) * (1 - ty) + (b + (g[yb + xb[x]] - b) * tx[x]) * ty; }
    }
    return out;
  }
  TLXL.height = function (w, h) {
    h = h || w;
    const H = { w, h, d: new Float32Array(w * h) }, d = H.d;
    const row = v => clamp(Math.round((1 - v) * (h - 1)), 0, h - 1), col = u => clamp(Math.round(u * (w - 1)), 0, w - 1);
    H.fill = v => { d.fill(v); return H; };
    H.noise = (cell, amp, seed) => { const n = vnoise(w, h, cell, seed || 1); for (let i = 0; i < d.length; i++) d[i] += (n[i] - 0.5) * amp; return H; };
    H.grain = (amp, seed) => { const r = rng(seed || 7); for (let i = 0; i < d.length; i++) d[i] += (r() - 0.5) * amp; return H; };
    H.weave = (p, amp, rip) => {
      const sx = new Float32Array(w), sy = new Float32Array(h), sx2 = new Float32Array(w), g = rip ? rip * p : 0;
      for (let x = 0; x < w; x++) { sx[x] = Math.sin(TAU * x / p); sx2[x] = 0.15 * Math.sin(TAU * (x + p * 0.5) / (p * 2)); }
      for (let y = 0; y < h; y++) sy[y] = Math.sin(TAU * y / p) * 0.5;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = sx[x] * sy[y] + sx2[x]; if (g && (x % g < 1 || y % g < 1)) v += 0.8; d[y * w + x] += v * amp; }
      return H;
    };
    H.bumps = (n, r, amp, seed) => {                // soft dimples (orange peel, leather pores)
      const rn = rng(seed || 3);
      for (let i = 0; i < n; i++) { const cx = rn() * w, cy = rn() * h, rr = r * (0.5 + rn()); for (let y = Math.floor(cy - rr); y <= cy + rr; y++) for (let x = Math.floor(cx - rr); x <= cx + rr; x++) { const dd = Math.hypot(x - cx, y - cy) / rr; if (dd < 1) d[((y + h) % h) * w + ((x + w) % w)] -= amp * (1 - dd * dd); } }
      return H;
    };
    // a line of pixels between two UV points, stamped by profile fn(t across -1..1, along 0..1) -> height delta
    const stroke = (u0, v0, u1, v1, wd, fn) => {
      const x0 = u0 * (w - 1), y0 = (1 - v0) * (h - 1), x1 = u1 * (w - 1), y1 = (1 - v1) * (h - 1), L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
      const steps = Math.ceil(L * 1.5);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
        for (let s = -wd; s <= wd; s += 0.5) {
          const x = Math.round(px + nx * s), y = Math.round(py + ny * s); if (x < 0 || y < 0 || x >= w || y >= h) continue;
          d[y * w + x] += fn(s / wd, t * L);
        }
      }
    };
    H.seam = (u0, v0, u1, v1, o) => {               // sunken seam, optional stitches along it
      o = o || {}; const wd = o.w || 1.6, dp = (o.depth || 0.5) * 1.7, st = o.stitch === undefined ? 5 : o.stitch;
      stroke(u0, v0, u1, v1, wd, (s, l) => { let v = -dp * Math.max(0, 1 - Math.abs(s)); if (st) { v *= 0.55; if (Math.abs(s) > 0.55 && ((l / st) | 0) % 2 === 0) v -= dp * 0.5; } return v * 0.45; });
      return H;
    };
    H.ridge = (u0, v0, u1, v1, o) => { o = o || {}; const wd = o.w || 3, dp = o.depth || 0.6; stroke(u0, v0, u1, v1, wd, (s) => dp * 0.25 * Math.max(0, 1 - s * s)); return H; };
    H.zip = (u0, v0, u1, v1, o) => { o = o || {}; const wd = o.w || 2.4, dp = (o.depth || 0.6) * 0.4, pitch = o.pitch || 3; stroke(u0, v0, u1, v1, wd, (s, l) => (((l / pitch) | 0) % 2 === 0 ? 0.3 : 0.12) * dp * Math.max(0, 1 - Math.abs(s * 1.3)) - 0.12 * dp * (Math.abs(s) > 0.8 ? 1 : 0)); return H; };
    H.panel = (u0, v0, u1, v1, o) => { H.seam(u0, v0, u1, v0, o); H.seam(u1, v0, u1, v1, o); H.seam(u1, v1, u0, v1, o); H.seam(u0, v1, u0, v0, o); return H; };
    H.toNormal = k => {
      const c = cv(w, h), g = c.getContext("2d"), im = g.createImageData(w, h), o = im.data;
      for (let y = 0; y < h; y++) {
        const ya = Math.max(0, y - 1) * w, yb = Math.min(h - 1, y + 1) * w, yc = y * w;
        for (let x = 0; x < w; x++) {
          const xa = Math.max(0, x - 1), xb = Math.min(w - 1, x + 1);
          const dx = (d[yc + xb] - d[yc + xa]) * 0.5 * k, dy = (d[yb + x] - d[ya + x]) * 0.5 * k;
          const l = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (yc + x) * 4;
          o[i] = (-dx * l * 0.5 + 0.5) * 255; o[i + 1] = (dy * l * 0.5 + 0.5) * 255; o[i + 2] = (l * 0.5 + 0.5) * 255; o[i + 3] = 255;
        }
      }
      g.putImageData(im, 0, 0); return c;
    };
    const norm = () => { let lo = 1e9, hi = -1e9; for (let i = 0; i < d.length; i++) { if (d[i] < lo) lo = d[i]; if (d[i] > hi) hi = d[i]; } return [lo, hi - lo || 1]; };
    H.toGray = (lo, hi) => {
      const c = cv(w, h), g = c.getContext("2d"), im = g.createImageData(w, h), o = im.data, [a, s] = norm();
      for (let i = 0; i < d.length; i++) { const v = (lo + (hi - lo) * (d[i] - a) / s) * 255; o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = v; o[i * 4 + 3] = 255; }
      g.putImageData(im, 0, 0); return c;
    };
    H.toTone = (base, amp) => H.toGray(base - amp, base + amp);
    H._row = row; H._col = col;
    return H;
  };

  /* ---------------- fabrics ---------------- */
  // Maps are neutral (near white, near mid grey roughness): the material's colour tints them, so a recoloured jacket stays recoloured.
  TLXL.fabric = function (kind, o) {
    o = o || {}; const size = o.size || (kind === "shell" ? 256 : 128), key = "fab:" + kind + ":" + size + ":" + (o.key || "") + (o.base || ""); if (cache[key]) return cache[key];
    const t0 = performance.now(), H = TLXL.height(size), sz2 = size > 256 ? size >> 1 : size, R = TLXL.height(sz2), Tn = TLXL.height(sz2), S = size / 256, S2 = sz2 / 256, seed = (kind.length * 977 + size) | 0;
    let nk = 3, base = 0.9, amp = 0.16, rlo = 0.8, rhi = 1;
    switch (kind) {
      case "shell": H.weave(2, 0.05, 0).noise(30 * S, 0.1, seed).grain(0.03, seed + 2); R.noise(10 * S2, 0.3, seed + 3); nk = 1.0; base = 0.86; amp = 0.04; break;
      case "fleece": H.grain(0.9, seed).noise(2 * S, 0.8, seed + 1).noise(6 * S, 0.4, seed + 2); R.noise(4 * S, 0.2, seed + 4); nk = 1.6; rlo = 0.92; rhi = 1; amp = 0.2; break;
      case "knit": {
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const p = 8 * S, cx = (x % p) / p, cy = ((y + (((x / p) | 0) & 1) * p * 0.5) % (p * 1.0)) / p; H.d[y * size + x] = Math.sin(PI * cx) * 0.6 + Math.sin(PI * cy) * 0.5; }
        H.noise(3, 0.3, seed); R.noise(8, 0.2, seed + 5); nk = 4; rlo = 0.9; amp = 0.22; break; }
      case "leather": H.bumps(Math.round(500 * S * S), 2.2 * S, 0.22, seed).noise(20 * S, 0.2, seed + 1).grain(0.04, seed + 2); R.noise(8 * S, 0.4, seed + 3); nk = 1.1; rlo = 0.55; rhi = 0.85; base = 0.8; amp = 0.18; break;
      case "rubber": H.grain(0.5, seed).noise(5 * S, 0.5, seed + 1).bumps(Math.round(400 * S * S), 1.6 * S, 0.5, seed + 2); R.noise(6, 0.2, seed + 9); nk = 2; rlo = 0.88; rhi = 1; break;
      case "plastic": H.grain(0.28, seed).noise(3 * S, 0.45, seed + 1).noise(24 * S, 0.3, seed + 2); R.noise(12 * S, 0.35, seed + 3); nk = 1.6; rlo = 0.55; rhi = 0.9; base = 0.92; amp = 0.08; break;
      case "gloss": H.bumps(Math.round(500 * S * S), 3 * S, 0.22, seed).noise(30 * S, 0.12, seed + 1); R.bumps(Math.round(120 * S * S), 3, 0.5, seed + 2).noise(20, 0.2, seed + 3); nk = 0.8; rlo = 0.55; rhi = 1; base = 0.96; amp = 0.05; break;
      case "skin": H.bumps(Math.round(1400 * S * S), 1.6 * S, 0.5, seed).noise(10 * S, 0.3, seed + 1).grain(0.06, seed + 2); R.noise(12 * S, 0.2, seed + 3); nk = 1.1; rlo = 0.7; rhi = 0.9; base = 0.94; amp = 0.1; break;
      case "lens": H.noise(40 * S, 0.05, seed); for (let i = 0; i < 26; i++) { const r = rng(seed + i), x = r(), y = r(); H.seam(x, y, clamp(x + (r() - 0.5) * 0.3, 0, 1), clamp(y + (r() - 0.5) * 0.3, 0, 1), { w: 0.8, depth: 0.15, stitch: 0 }); } R.noise(30, 0.2, seed + 3); nk = 1; rlo = 0.8; rhi = 1; break;
      // R2 (sleds): metals, belts, wood, vinyl
      case "brushed": { const g = rng(seed); let v = 0; for (let y = 0; y < size; y++) { v = v * 0.55 + g() * 0.45; for (let x = 0; x < size; x++) H.d[y * size + x] = v; } H.grain(0.1, seed + 1).noise(14 * S, 0.1, seed + 2); for (let y = 0; y < sz2; y++) { const q = g(); for (let x = 0; x < sz2; x++) R.d[y * sz2 + x] = q; } nk = 0.9; rlo = 0.3; rhi = 0.58; base = 0.9; amp = 0.1; break; }
      case "cast": H.bumps(Math.round(900 * S * S), 1.8 * S, 0.35, seed).grain(0.3, seed + 1).noise(6 * S, 0.4, seed + 2); R.noise(5, 0.3, seed + 3); nk = 1.5; rlo = 0.5; rhi = 0.9; base = 0.84; amp = 0.14; break;
      case "tread": H.weave(3, 0.2, 0).grain(0.4, seed).noise(4 * S, 0.5, seed + 1); R.noise(6, 0.2, seed + 9); nk = 2.2; rlo = 0.9; rhi = 1; base = 0.78; amp = 0.1; break;
      case "wood": { const g = rng(seed); for (let y = 0; y < size; y++) { const f = Math.sin(y / size * 46 + Math.sin(y * 0.11) * 2.2) * 0.5 + 0.5 + (g() - 0.5) * 0.25; for (let x = 0; x < size; x++) H.d[y * size + x] = f + 0.18 * Math.sin(x / size * 9 + y * 0.013); } H.grain(0.06, seed + 1); R.noise(9, 0.3, seed + 3); nk = 1.3; rlo = 0.5; rhi = 0.8; base = 0.78; amp = 0.2; break; }
      case "vinyl": H.bumps(Math.round(700 * S * S), 1.6 * S, 0.3, seed).grain(0.05, seed + 2).noise(16 * S, 0.15, seed + 1); R.noise(10 * S, 0.3, seed + 3); nk = 1.3; rlo = 0.42; rhi = 0.7; base = 0.8; amp = 0.15; break;
      default: H.grain(0.2, seed);
    }
    if (o.base) base = o.base;
    if (o.stamp) o.stamp(H, R);
    if (o.cvs) { /* reserved */ }
    const to = Object.assign({ repeat: !o.stamp }, o), set = { normalMap: mkTex(H.toNormal(nk * (o.k || 1)), to), roughnessMap: mkTex(R.toGray(rlo, rhi), to), map: mkTex(Tn.noise(9 * S2, 0.6, seed + 11).grain(0.3, seed + 12).toTone(base, amp), Object.assign({ srgb: true }, to)) };
    TLXL.ms += performance.now() - t0; (TLXL.log = TLXL.log || []).push([key, +(performance.now() - t0).toFixed(1)]); return cache[key] = set;
  };
  TLXL.dressMat = function (m, kind, o) {
    if (!m || m.userData.dressed) return m;
    const f = TLXL.fabric(kind, o); m.map = f.map; m.normalMap = f.normalMap; m.roughnessMap = f.roughnessMap;
    if (o && o.ns) m.normalScale = new T.Vector2(o.ns, o.ns);
    m.userData.dressed = kind; m.needsUpdate = true; return m;
  };

  /* ---------------- geometry ---------------- */
  // loft: sections [{y, rx, rz, cx, cz, n}] in ascending order along the axis. Ring angle a: x = rx sin a, w = rz cos a, so a = 0 is
  // the FRONT (+z for axis 'y'; +y for axis 'z'). The default arc starts at the back (a = -PI) so the UV seam is behind the figure.
  TLXL.loft = function (secs, o) {
    o = o || {};
    const lite = TLXL.lite, seg = o.seg || (lite ? 10 : 16), uvr = o.uv || [0, 0, 1, 1], a0 = o.a0 === undefined ? -PI : o.a0, a1 = o.a1 === undefined ? PI : o.a1, axisZ = o.axis === "z", infl = o.inflate || 0;
    let S = secs.map(s => Object.assign({ cx: 0, cz: 0, n: 2 }, s));
    const dome = (end, len, k) => {                 // rounded end: rings that shrink like a hemisphere (length len)
      if (!len) return; const e = end > 0 ? S[S.length - 1] : S[0], add = [];
      for (let i = 1; i <= k; i++) { const th = (i / k) * PI / 2, sc = Math.max(0.04, Math.cos(th)); add.push(Object.assign({}, e, { y: e.y + end * len * Math.sin(th), rx: e.rx * sc, rz: e.rz * sc })); }
      if (end > 0) S = S.concat(add); else S = add.reverse().concat(S);
    };
    const k = lite ? 3 : 5; dome(1, o.roundTop, k); dome(-1, o.roundBottom, k);
    const rows = S.length, cols = seg + 1, pos = new Float32Array(rows * cols * 3), uv = new Float32Array(rows * cols * 2), idx = [];
    for (let i = 0; i < rows; i++) {
      const s = S[i];
      for (let j = 0; j < cols; j++) {
        const a = a0 + (a1 - a0) * j / seg, sn = Math.sin(a), cs = Math.cos(a), e = 2 / s.n;
        const mk = o.mod ? o.mod(s.y, a) : 1;       // o.mod(y, ringAngle) -> radius multiplier: folds and bunching in the cloth
        const px = (s.rx + infl) * mk * Math.sign(sn) * Math.pow(Math.abs(sn), e) + s.cx, pw = (s.rz + infl) * mk * Math.sign(cs) * Math.pow(Math.abs(cs), e) + s.cz, p = (i * cols + j) * 3;
        if (axisZ) { pos[p] = px; pos[p + 1] = pw; pos[p + 2] = s.y; } else { pos[p] = px; pos[p + 1] = s.y; pos[p + 2] = pw; }
        uv[(i * cols + j) * 2] = uvr[0] + (uvr[2] - uvr[0]) * j / seg; uv[(i * cols + j) * 2 + 1] = uvr[1] + (uvr[3] - uvr[1]) * i / Math.max(1, rows - 1);
      }
    }
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < seg; j++) {
      const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
      if (axisZ) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
    const vc = rows * cols;
    const g = new T.BufferGeometry();
    let P = pos, UV = uv;
    if (o.cap) {                                     // append centre vertices for flat caps
      const extra = [], extraUv = [], ci = [];
      for (const end of (o.cap === true ? ["b", "t"] : [o.cap])) {
        const i = end === "b" ? 0 : rows - 1, s = S[i], c = vc + extra.length / 3;
        extra.push(axisZ ? s.cx : s.cx, axisZ ? s.cz : s.y, axisZ ? s.y : s.cz); extraUv.push(uvr[0], uvr[1] + (uvr[3] - uvr[1]) * i / Math.max(1, rows - 1));
        for (let j = 0; j < seg; j++) { const a = i * cols + j, b = a + 1; if ((end === "t") !== !!axisZ) ci.push(a, b, c); else ci.push(b, a, c); }
      }
      P = new Float32Array(pos.length + extra.length); P.set(pos); P.set(extra, pos.length);
      UV = new Float32Array(uv.length + extraUv.length); UV.set(uv); UV.set(extraUv, uv.length); idx.push(...ci);
    }
    g.setAttribute("position", new T.BufferAttribute(P, 3)); g.setAttribute("uv", new T.BufferAttribute(UV, 2)); g.setIndex(idx);
    g.computeVertexNormals();
    if (a1 - a0 > TAU - 1e-3) {                      // close the seam: average the first and last column's normals
      const nr = g.attributes.normal;
      for (let i = 0; i < rows; i++) { const A = i * cols, B = A + seg; const x = nr.getX(A) + nr.getX(B), y = nr.getY(A) + nr.getY(B), z = nr.getZ(A) + nr.getZ(B), l = Math.hypot(x, y, z) || 1; nr.setXYZ(A, x / l, y / l, z / l); nr.setXYZ(B, x / l, y / l, z / l); }
    }
    return g;
  };
  // smooth(table, n, o): resample a table of rows [y, rx, rz, cz, n?] into n sections with a Catmull-Rom curve through the rows.
  TLXL.smooth = function (tab, n, o) {
    o = o || {}; const m = tab.length, out = [];
    const cr = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1) * (m - 1), i = Math.min(m - 2, Math.floor(u)), t = u - i, r = [0, 1, 2, 3, 4].map(c => {
        const f = j => { const q = tab[clamp(j, 0, m - 1)]; return q[c] === undefined ? (c === 4 ? 2 : 0) : q[c]; };
        return c === 0 ? f(i) + (f(i + 1) - f(i)) * t : cr(f(i - 1), f(i), f(i + 1), f(i + 2), t);
      });
      out.push({ y: r[0], rx: Math.max(0.002, r[1]), rz: Math.max(0.002, r[2]), cz: r[3], n: r[4] || 2, cx: 0 });
    }
    return out;
  };
  TLXL.rbox = function (w, h, d, r, seg) {
    seg = seg || ((TLXL.lite || Math.max(w, h, d) < 0.09) ? 1 : 2); r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const g = new T.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2), p = g.attributes.position, n = g.attributes.normal, hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ix = clamp(x, -hw, hw), iy = clamp(y, -hh, hh), iz = clamp(z, -hd, hd), dx = x - ix, dy = y - iy, dz = z - iz, l = Math.hypot(dx, dy, dz);
      if (l > 1e-6) { p.setXYZ(i, ix + dx / l * r, iy + dy / l * r, iz + dz / l * r); n.setXYZ(i, dx / l, dy / l, dz / l); }
    }
    return g;
  };
  TLXL.ell = function (rx, ry, rz, seg) { seg = seg || (TLXL.lite ? 6 : 8); const g = new T.SphereGeometry(1, seg, Math.max(4, seg * 0.7 | 0)); g.scale(rx, ry, rz); g.computeVertexNormals(); return g; };
  TLXL.lathe = function (profile, seg, uvr) {
    const g = new T.LatheGeometry(profile.map(p => new T.Vector2(p[0], p[1])), seg || (TLXL.lite ? 12 : 20)); g.computeVertexNormals();
    if (uvr) { const u = g.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, uvr[0] + (uvr[2] - uvr[0]) * u.getX(i), uvr[1] + (uvr[3] - uvr[1]) * u.getY(i)); }
    return g;
  };
  TLXL.tube = function (pts, r, o) {                // tube along a curve, ends closed by a small dome
    o = o || {}; const cur = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], p[1], p[2])), false, "catmullrom", 0.3), n = o.n || Math.max(4, pts.length * 3);
    const g = new T.TubeGeometry(cur, n, r, o.seg || (TLXL.lite ? 5 : 7), false); g.computeVertexNormals();
    const caps = [], ends = [[0, 1], [1, 1]];
    for (const [t] of ends) { const c = cur.getPoint(t), s = new T.SphereGeometry(r, 5, 3); s.translate(c.x, c.y, c.z); caps.push(s); }
    return TLXL.mergeGeo([g].concat(caps));
  };
  TLXL.xf = function (g, o) {
    o = o || {}; const m = new T.Matrix4(), q = new T.Quaternion().setFromEuler(new T.Euler(o.rx || 0, o.ry || 0, o.rz || 0, "YXZ"));
    m.compose(new T.Vector3(o.x || 0, o.y || 0, o.z || 0), q, new T.Vector3(o.sx === undefined ? (o.s || 1) : o.sx, o.sy === undefined ? (o.s || 1) : o.sy, o.sz === undefined ? (o.s || 1) : o.sz));
    g.applyMatrix4(m); return g;
  };
  TLXL.mergeGeo = function (list) {                 // concatenate geometries (position, normal, uv) into one indexed geometry
    let nv = 0, ni = 0; for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const g of list) {
      const c = g.attributes.position.count; P.set(g.attributes.position.array, vo * 3);
      if (g.attributes.normal) N.set(g.attributes.normal.array, vo * 3);
      if (g.attributes.uv) U.set(g.attributes.uv.array, vo * 2);
      if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) I[io + i] = a[i] + vo; io += a.length; } else { for (let i = 0; i < c; i++) I[io + i] = vo + i; io += c; }
      vo += c;
    }
    const o = new T.BufferGeometry(); o.setAttribute("position", new T.BufferAttribute(P, 3)); o.setAttribute("normal", new T.BufferAttribute(N, 3)); o.setAttribute("uv", new T.BufferAttribute(U, 2)); o.setIndex(new T.BufferAttribute(I, 1)); return o;
  };
  TLXL.merge = function (items) {                   // items [{g, m}] -> [{m, g}] one merged geometry per material
    const by = new Map(); for (const it of items) { if (!it || !it.g) continue; if (!by.has(it.m)) by.set(it.m, []); by.get(it.m).push(it.g); }
    return [...by].map(([m, gs]) => ({ m, g: TLXL.mergeGeo(gs) }));
  };
  TLXL.build = function (items, parent, o) {        // merged meshes, one per material, added to parent; returns the meshes
    o = o || {}; const out = [];
    for (const { m, g } of TLXL.merge(items)) { const me = new T.Mesh(g, m); me.castShadow = o.cast !== false && !(m.userData && m.userData.noShadow); if (o.name) me.name = o.name; if (parent) parent.add(me); out.push(me); }
    return out;
  };
})();

/* ---------------------------------------------------------------------------------------------------------
   TLXL.fig: the human figure kit (slices R1 and R1b). One body for every person: the walker, the seated rider, passengers, villagers,
   staff, drivers, anglers and the crash body. All geometry is built in WALKER space: metres, hip pivot at y 0 for the torso,
   +y up, +z the way the figure faces. Limbs are loft meshes along +z (hanging limbs are rotated by the assembler).
   Skeleton numbers the rigs depend on (do not change them here): hip pivot y 0.93, thigh 0.42, shin pivot to ankle 0.43, ankle
   0.075 over the sole, shoulder (+-0.21, 0.53), upper arm 0.25, forearm to the grip point 0.24.
     TLXL.fig.dress(base, env)   textures + extra materials for the shared set {jacket, pants, trim, glove, skin, boot, helmet, visor}
                                 returns K (also TLXL.fig.K); TLXL.fig.kitFor(m) does the same for a custom-colour figure;
                                 TLXL.fig.sync() re-derives the second-tone panels from the jacket colour (call when it changes)
     torso(K) pelvis(K) thigh(K,L) shin(K,L) upper(K,L,s) fore(K,L,s)    -> items for TLXL.build   (s = -1 / +1, the side)
     hand(K, kind, sx, k)        kind 'fist' (on a grip) | 'mitt' | 'open' (wipe) | 'relaxed' | 'relaxedMitt'
     boot(K, kind, ankH)         kind 'pac' | 'arctic', origin: sole under the ankle axis, +z toe
     helmet / goggles / beanie / balaclava / face / liner (K) head-centre origin items; pack(K); torsoPatch(K, kind)
   --------------------------------------------------------------------------------------------------------- */
(function () {
  "use strict";
  const T = window.THREE; if (!T) return;
  const TLXL = window.TLXL, PI = Math.PI, TAU = PI * 2, F = TLXL.fig = {}, L = () => TLXL.lite;
  const R_T = [0, 0.5, 1, 1], R_UP = [0, 0.25, 0.5, 0.5], R_FO = [0.5, 0.25, 1, 0.5];
  const reg = (r, u, v) => [r[0] + (r[2] - r[0]) * u, r[1] + (r[3] - r[1]) * v];
  const JY0 = -0.1, JY1 = 0.612, tv = y => 0.5 + 0.5 * Math.min(1, Math.max(0, (y - JY0) / (JY1 - JY0)));
  const PY0 = -0.2, PY1 = 0.1, pv = y => 0.5 + 0.5 * (y - PY0) / (PY1 - PY0);
  const S = (y, rx, rz, cz, n, cx) => ({ y, rx, rz, cz: cz || 0, n: n || 2, cx: cx || 0 });
  const gauss = x => Math.exp(-x * x);
  // a soft bunching of cloth: rings of folds around y = cy, strongest on the ring angle `side`, `spread` how far round it goes
  const fold = (cy, w, amp, side, freq, spread) => (y, a) => 1 + amp * gauss((y - cy) / w) * (0.5 + 0.5 * Math.cos((y - cy) * freq)) * (spread === 0 ? 1 : Math.pow(Math.max(0, Math.cos(a - side)), spread || 1.5));
  const mods = (...f) => (y, a) => { let m = 1; for (const g of f) m *= g(y, a); return m; };
  const ar = (x, y) => ({ a0: Math.min(x, y), a1: Math.max(x, y) });      // an arc range always runs low to high (the other way round the loft is inside out)
  const ln = (H, a, b, o) => H.seam(a[0], a[1], b[0], b[1], o);
  // a stitched seam with a second stitch line beside it (double needle), off = offset in UV
  const ln2 = (H, a, b, o, off) => { ln(H, a, b, o); const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ox = -dy / l * off, oy = dx / l * off; ln(H, [a[0] + ox, a[1] + oy], [b[0] + ox, b[1] + oy], { w: 0.8, depth: 0.45, stitch: 4 }); };
  function stampJacket(H) {
    const z = 0.5, D = { w: 1.5, depth: 0.7, stitch: 0 };
    H.zip(z, tv(0.6), z, tv(-0.085), { w: 2.2 }); ln2(H, [z + 0.03, tv(0.58)], [z + 0.03, tv(-0.085)], D, 0.006);        // zip, storm flap edge
    for (const s of [-1, 1]) {
      ln(H, [z + s * 0.043, tv(0.31)], [z + s * 0.1, tv(0.355)], { w: 1.5, depth: 0.8, stitch: 0 }); ln(H, [z + s * 0.046, tv(0.3)], [z + s * 0.103, tv(0.345)], { w: 0.9, depth: 0.5 });   // chest pocket welt
      ln2(H, [z + s * 0.083, tv(0.1)], [z + s * 0.132, tv(-0.01)], { w: 1.5, depth: 0.8, stitch: 0 }, 0.007);   // hand pocket
    }
    for (const x of [0.25, 0.75]) ln2(H, [x, tv(-0.085)], [x, tv(0.47)], D, 0.006);
    ln(H, [0.002, tv(-0.085)], [0.002, tv(0.5)], D); ln(H, [0.998, tv(-0.085)], [0.998, tv(0.5)], D);
    ln2(H, [0, tv(0.44)], [1, tv(0.44)], D, 0.006); ln2(H, [0, tv(-0.07)], [1, tv(-0.07)], { w: 1.4, depth: 0.8, stitch: 0 }, 0.006);
    for (const r of [R_UP, R_FO]) { ln2(H, reg(r, 0.25, 0), reg(r, 0.25, 1), D, 0.02); ln2(H, reg(r, 0.75, 0), reg(r, 0.75, 1), D, 0.02); }
    ln2(H, reg(R_UP, 0, 0.78), reg(R_UP, 1, 0.78), D, 0.02); ln2(H, reg(R_FO, 0, 0.9), reg(R_FO, 1, 0.9), D, 0.02); ln2(H, reg(R_FO, 0, 0.12), reg(R_FO, 1, 0.12), D, 0.02);
  }
  function stampPants(H) {
    const z = 0.5, D = { w: 1.5, depth: 0.7, stitch: 0 };
    ln2(H, [0, pv(0.06)], [1, pv(0.06)], { w: 1.6, depth: 0.8, stitch: 0 }, 0.01); H.zip(z, pv(0.06), z, pv(-0.04), { w: 2 });
    for (const x of [0.25, 0.75]) ln2(H, [x, pv(-0.2)], [x, pv(0.08)], D, 0.008); ln(H, [0.002, pv(-0.2)], [0.002, pv(0.08)], D);
    for (const s of [-1, 1]) ln(H, [z + s * 0.1, pv(0.06)], [z + s * 0.15, pv(-0.14)], D);
    for (const r of [R_UP, R_FO]) { ln2(H, reg(r, 0.25, 0), reg(r, 0.25, 1), D, 0.02); ln2(H, reg(r, 0.75, 0), reg(r, 0.75, 1), D, 0.02); }
    H.panel(...reg(R_UP, 0.56, 0.26), ...reg(R_UP, 0.74, 0.5), { w: 1.2, depth: 0.7 });        // cargo pocket on the outer thigh
    ln2(H, reg(R_FO, 0, 0.3), reg(R_FO, 1, 0.3), D, 0.02); ln2(H, reg(R_FO, 0, 0.9), reg(R_FO, 1, 0.9), { w: 1.4, depth: 0.8, stitch: 0 }, 0.02);
  }
  const grad = (stops, w, h, vertical) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"), gr = vertical ? g.createLinearGradient(0, 0, 0, h) : g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, w, h); return c; };
  F.dress = function (b, env) {
    if (F.K) return F.K; const t0 = performance.now();
    const m = (c, r, mt, ex) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: mt || 0 }, ex || {}));
    const D = TLXL.dressMat, K = F.K = { jacket: b.jacket, pants: b.pants, trim: b.trim, glove: b.glove, skin: b.skin, boot: b.boot, helmet: b.helmet, visor: b.visor };
    // cloth is matt: roughness 1 and no metal, or the low sun washes a blue jacket out to grey from behind
    for (const x of [b.jacket, b.pants, b.trim, b.glove]) { x.roughness = 1; x.metalness = 0; }
    D(b.jacket, "shell", { size: 512, key: "jacket", stamp: stampJacket, ns: 0.8, base: 0.72 }); D(b.pants, "shell", { size: 512, key: "pants", stamp: stampPants, ns: 0.8, base: 0.62 });
    D(b.trim, "shell"); D(b.glove, "shell", { ns: 1.0 }); D(b.skin, "skin"); D(b.boot, "leather");
    D(b.helmet, "gloss", { ns: 0.4 }); D(b.visor, "lens", { ns: 0.12 });
    for (const x of [b.helmet, b.visor]) if (env) { x.envMap = env; x.envMapIntensity = x === b.visor ? 0.75 : 1.1; }
    K.panel = D(m(0x1a2a44, 1), "shell", { ns: 1.0 }); K.dark = D(m(0x16191d, 0.7), "plastic");
    K.foam = D(m(0x1c1d20, 1), "fleece"); K.pantsP = D(m(0x1a1e24, 1), "shell", { ns: 1.0 });
    K.sole = D(m(0x0d0f11, 0.96), "rubber", { key: "tread", ns: 1.4, stamp: H => { for (let v = 0.04; v < 0.98; v += 0.06) { H.seam(0.0, v, 0.22, v, { w: 2, depth: 1.4, stitch: 0 }); H.seam(0.78, v, 1.0, v, { w: 2, depth: 1.4, stitch: 0 }); } H.seam(0.25, 0, 0.25, 1, { w: 1.5, depth: 1, stitch: 0 }); H.seam(0.75, 0, 0.75, 1, { w: 1.5, depth: 1, stitch: 0 }); } });
    K.reflect = D(m(0x98a3ad, 0.4, 0.3), "shell", { ns: 1.4 }); if (env) { K.reflect.envMap = env; K.reflect.envMapIntensity = 0.8; }
    K.metal = D(m(0x9aa4ae, 0.35, 0.8), "plastic", { ns: 0.6 }); if (env) { K.metal.envMap = env; K.metal.envMapIntensity = 0.8; }
    K.fur = D(m(0x8a7358, 1), "fleece"); K.pack = D(m(0x2e3a34, 1), "shell", { ns: 1.3 }); K.packL = D(m(0x1f2622, 1), "shell", { ns: 1.3 });
    K.beanie = D(m(b.trim.color.getHex(), 1), "knit", { ns: 1.4 }); K.mask = D(m(0x1a1f26, 1), "knit", { ns: 1.2 });
    K.bootA = D(m(0x4a443c, 0.85), "leather"); K.bootB = D(m(0x4d4136, 0.85), "leather"); K.eye = D(m(0xe8e8e2, 0.35), "skin"); K.feat = D(m(0x3a1c14, 0.6), "skin"); K.lip = D(m(0xa8584c, 0.55), "skin");
    // one-piece goggle lens: dark amber at the top into blue, mirroring the sky cube (the cube is dimmed at night by updSledEnv, so it cannot glow)
    const gm = new T.CanvasTexture(grad([[0, "#5a3410"], [0.45, "#3a3a44"], [1, "#143a64"]], 8, 64, true)); gm.tlSrgb = true; if (TLXL.srgb) gm.encoding = T.sRGBEncoding;
    K.gog = m(0xffffff, 0.06, 0.8, { map: gm }); if (env) { K.gog.envMap = env; K.gog.envMapIntensity = 0.85; }
    // a cold flush on the cheeks and nose tip: a soft transparent disc, nothing glows
    const am = new T.CanvasTexture(grad([[0, "#fff"], [0.5, "#777"], [1, "#000"]], 32, 32, false));
    K.blush = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, alphaMap: am, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); K.blush.userData.noShadow = true; K.blush.userData.flush = true;
    K.strap = K.dark; F.sync(); TLXL.figMs = performance.now() - t0; return K;
  };
  // second-tone panels and the helmet / hat accents follow the player's colours (jacketMat, riderTrimMat)
  F.sync = function (K) {
    K = K || F.K; if (!K) return; const j = K.jacket.color, p = K.pants.color;
    K.panel.color.setRGB(j.r * 0.4, j.g * 0.4, j.b * 0.42); K.pantsP.color.setRGB(p.r * 0.55, p.g * 0.55, p.b * 0.55); K.beanie.color.copy(K.trim.color);
    K.blush.color.copy(K.skin.color).multiplyScalar(0.85); K.blush.color.r = Math.min(1, K.blush.color.r * 1.25);
  };
  F.kitFor = function (b) {                          // a figure with its own jacket/pants colours (rescue casualties, staff): own base, shared extras
    const K = Object.assign({}, F.K), D = TLXL.dressMat;
    for (const k of ["jacket", "pants", "trim", "glove", "skin", "boot", "helmet", "visor"]) if (b[k]) K[k] = b[k];
    for (const x of [K.jacket, K.pants, K.trim, K.glove]) { x.roughness = 1; x.metalness = 0; }
    D(K.jacket, "shell", { size: 512, key: "jacket", stamp: stampJacket, ns: 0.8, base: 0.72 }); D(K.pants, "shell", { size: 512, key: "pants", stamp: stampPants, ns: 0.8, base: 0.62 }); D(K.trim, "shell"); D(K.glove, "shell", { ns: 1.0 });
    D(K.skin, "skin"); D(K.boot, "leather"); D(K.helmet, "gloss", { ns: 0.4 }); D(K.visor, "lens", { ns: 0.12 });
    for (const x of [K.helmet, K.visor]) if (F.K.helmet.envMap && !x.envMap) { x.envMap = F.K.helmet.envMap; x.envMapIntensity = 1.0; }
    K.panel = F.K.panel.clone(); K.pantsP = F.K.pantsP.clone(); K.beanie = F.K.beanie.clone(); K.blush = F.K.blush.clone(); K.blush.userData.noShadow = true;
    F.sync(K); return K;
  };

  /* ---------------- torso, pelvis ---------------- */
  // the jacket body, y up from the hem (-0.085, a level band a hand's width below the belt) to the collar. Chest deeper than the waist, a blouse over the belt.
  const TORSO_TAB = [[-0.1, 0.2, 0.147, 0], [-0.07, 0.212, 0.152, 0.002], [-0.02, 0.208, 0.15, 0.002], [0.05, 0.198, 0.144, 0.002], [0.13, 0.194, 0.142, 0.002], [0.24, 0.202, 0.15, 0.004], [0.35, 0.214, 0.162, 0.01], [0.43, 0.228, 0.158, 0.008, 2.3],
    [0.485, 0.228, 0.14, 0.004, 2.4], [0.52, 0.2, 0.118, 0], [0.55, 0.15, 0.104, 0], [0.58, 0.108, 0.092, 0], [0.605, 0.076, 0.08, 0], [0.62, 0.062, 0.07, 0]];
  let _tp = null;
  const torsoSecs = () => (_tp && _tp.l === L()) ? _tp.s : (_tp = { l: L(), s: TLXL.smooth(TORSO_TAB, L() ? 14 : 26) }).s;
  const secRange = (y0, y1, n) => { n = n || 6; const all = torsoSecs(), out = [], at = y => { for (let i = 1; i < all.length; i++) if (y <= all[i].y) { const a = all[i - 1], b = all[i], t = (y - a.y) / (b.y - a.y); return S(y, a.rx + (b.rx - a.rx) * t, a.rz + (b.rz - a.rz) * t, a.cz + (b.cz - a.cz) * t, 2); } return all[all.length - 1]; };
    for (let i = 0; i <= n; i++) out.push(at(y0 + (y1 - y0) * i / n)); return out; };
  const torsoMod = mods(fold(0.06, 0.07, 0.05, 0, 70, 0), fold(-0.05, 0.03, 0.03, 0, 80, 0), fold(0.4, 0.06, 0.02, 0, 60, 0));
  F.torso = function (K, o) {
    o = o || {}; const it = [], lite = L(), sg = lite ? 12 : 18, J = K.jacket;
    it.push({ m: J, g: TLXL.loft(torsoSecs(), { uv: R_T, cap: "t", seg: sg, mod: torsoMod }) });
    // rolled hem: a level band standing proud of the trousers, same height front, sides and back
    it.push({ m: J, g: TLXL.loft([S(-0.112, 0.196, 0.15), S(-0.105, 0.22, 0.168), S(-0.09, 0.2285, 0.176), S(-0.066, 0.222, 0.168), S(-0.05, 0.214, 0.158)], { uv: [0, 0.42, 1, 0.5], roundBottom: 0.004, seg: sg }) });
    // stand collar, a double wall rolled over at the top, a dark lining showing inside
    it.push({ m: J, g: TLXL.loft([S(0.55, 0.115, 0.104), S(0.6, 0.1, 0.094), S(0.655, 0.1, 0.096), S(0.67, 0.094, 0.09), S(0.655, 0.08, 0.076), S(0.6, 0.08, 0.076), S(0.56, 0.086, 0.082)], { uv: [0, 0.94, 1, 1], seg: lite ? 12 : 18 }) });
    it.push({ m: K.dark, g: TLXL.loft([S(0.6, 0.082, 0.078), S(0.64, 0.078, 0.074), S(0.665, 0.078, 0.074)], { seg: 10, uv: [0, 0, 1, 0.1] }) });
    // colour blocking, keyed to the player's colours: dark yoke over the shoulders, side panels, accent piping
    it.push({ m: K.panel, g: TLXL.loft(secRange(0.44, 0.585, 10), { mod: torsoMod, inflate: 0.004, uv: [0, 0.9, 1, 1], seg: sg, a0: -PI * 0.78, a1: PI * 0.78 }) });                               // front yoke
    it.push({ m: K.panel, g: TLXL.loft(secRange(0.44, 0.585, 10), { mod: torsoMod, inflate: 0.004, uv: [0, 0.9, 1, 1], seg: lite ? 6 : 10, a0: PI * 0.78, a1: PI * 1.22 }) });                  // back yoke
    for (const s of [-1, 1]) it.push({ m: K.panel, g: TLXL.loft(secRange(-0.06, 0.4, 24), { mod: torsoMod, inflate: 0.004, uv: [0.4, 0.2, 0.6, 0.8], seg: 4, a0: s * PI / 2 - 0.28, a1: s * PI / 2 + 0.28 }) });   // side panels
    it.push({ m: K.trim, g: TLXL.loft(secRange(0.425, 0.44, 2), { mod: torsoMod, inflate: 0.0055, uv: [0, 0.6, 1, 0.62], seg: sg }) });                                                                 // accent piping under the yoke
    it.push({ m: K.reflect, g: TLXL.loft(secRange(0.2, 0.208, 2), { mod: torsoMod, inflate: 0.0055, uv: [0, 0.6, 1, 0.62], seg: sg }) });                                                         // reflective band round the chest
    // storm flap over the zip, chest pockets and hand-pocket welts with flaps
    it.push({ m: J, g: TLXL.loft(secRange(-0.085, 0.585, 36), { mod: torsoMod, inflate: 0.008, uv: [0.5, 0.2, 0.56, 0.8], seg: 3, a0: 0.015, a1: 0.2 }) });
    for (const s of [-1, 1]) {
      it.push({ m: J, g: TLXL.loft(secRange(0.255, 0.34, 8), { mod: torsoMod, inflate: 0.006, uv: [0.52, 0.5, 0.56, 0.55], seg: 3, ...ar(s * 0.3, s * 0.56) }) });
      it.push({ m: J, g: TLXL.loft(secRange(-0.03, 0.115, 14), { mod: torsoMod, inflate: 0.006, uv: [0.52, 0.5, 0.56, 0.55], seg: 3, ...ar(s * 0.52, s * 0.86) }) });
      it.push({ m: K.dark, g: TLXL.loft(secRange(0.317, 0.327, 1), { mod: torsoMod, inflate: 0.0075, uv: [0, 0, 1, 1], seg: 2, ...ar(s * 0.33, s * 0.54) }) });
    }
    if (!lite) {
      it.push({ m: K.dark, g: TLXL.tube(Array.from({ length: 17 }, (_, i) => { const a = i / 16 * TAU; return [Math.sin(a) * 0.222, -0.07, Math.cos(a) * 0.164]; }), 0.0045, { n: 24, seg: 3 }) });   // hem drawcord
      for (const s of [-1, 1]) {
        it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.014, 0.026, 0.009, 0.004), { x: s * 0.014, y: 0.57, z: 0.101 }) });                         // zip puller
        it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.012, 0.02, 0.012, 0.004), { x: s * 0.07, y: -0.1, z: 0.166, rx: 0.15 }) });                 // drawcord toggles
      }
      it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.016, 0.07, 0.008, 0.003), { y: 0.5, z: 0.1, rx: 0.2 }) });
    }
    return it;
  };
  F.torsoPatch = function (K, kind) {               // the rider style stripes (SET.style): trim colour, hugging the jacket
    const sc = kind === "stripe" ? secRange(-0.06, 0.4) : kind === "chest" ? secRange(0.26, 0.4) : secRange(0.24, 0.37);
    const a = kind === "stripe" ? [-0.18, 0.18] : kind === "chest" ? [-0.95, 0.95] : [PI - 0.95, PI + 0.95];
    return [{ m: K.trim, g: TLXL.loft(sc, { mod: torsoMod, a0: a[0], a1: a[1], inflate: 0.0065, uv: [0.3, 0.55, 0.7, 0.9], seg: 8 }) }];
  };
  // the small day pack: a shaped body with a lid, a front pocket, side compression straps with buckles, shoulder straps over the shoulders
  F.pack = function (K) {
    const it = [], lite = L(), P = K.pack, Z = -0.215;
    it.push({ m: P, g: TLXL.loft([S(0.1, 0.1, 0.05, -0.012, 3), S(0.18, 0.125, 0.07, -0.004, 3), S(0.32, 0.128, 0.075, 0.002, 3), S(0.42, 0.115, 0.065, 0, 3)], { seg: lite ? 10 : 16, roundTop: 0.03, roundBottom: 0.03, uv: [0, 0, 2, 1], cap: false }) });
    TLXL.xf(it[0].g, { z: Z });
    it.push({ m: K.pack, g: TLXL.xf(TLXL.loft([S(0.4, 0.122, 0.074, 0.002, 3), S(0.45, 0.118, 0.07, 0.0, 3), S(0.48, 0.1, 0.055, -0.01, 3)], { seg: lite ? 10 : 14, roundTop: 0.016, roundBottom: 0.006, uv: [0, 0, 2, 1] }), { z: Z }) });   // lid
    it.push({ m: K.pack, g: TLXL.xf(TLXL.rbox(0.19, 0.17, 0.05, 0.02), { y: 0.25, z: Z - 0.09 }) });                                                                     // rear pocket
    it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.2, 0.012, 0.012, 0.004), { y: 0.405, z: Z - 0.077 }) });
    if (!lite) {
      for (const s of [-1, 1]) {
        it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.02, 0.03, 0.15, 0.006), { x: s * 0.132, y: 0.28, z: Z }) });                                                            // side compression straps
        it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.02, 0.03, 0.15, 0.006), { x: s * 0.126, y: 0.2, z: Z }) });
        it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.014, 0.022, 0.012, 0.003), { x: s * 0.142, y: 0.28, z: Z - 0.06 }) }); it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.014, 0.022, 0.012, 0.003), { x: s * 0.136, y: 0.2, z: Z - 0.06 }) });
        it.push({ m: K.dark, g: TLXL.loft(secRange(0.2, 0.585, 10), { ...ar(s * 0.58, s * 0.76), inflate: 0.01, uv: [0.5, 0.9, 0.9, 1], seg: 2 }) });                       // shoulder straps, front
        it.push({ m: K.dark, g: TLXL.loft(secRange(0.2, 0.585, 10), { ...ar(PI - s * 0.58, PI - s * 0.76), inflate: 0.01, uv: [0.5, 0.9, 0.9, 1], seg: 2 }) });                // and back
        it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.03, 0.018, 0.01, 0.003), { x: s * 0.1, y: 0.33, z: 0.172, rx: 0.35 }) });                                               // sternum clip
      }
      it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.19, 0.012, 0.01, 0.004), { y: 0.33, z: 0.171, rx: 0.3 }) });                                                              // sternum strap
    }
    return it;
  };
  F.pelvis = function (K) {
    const it = [{ m: K.pants, g: TLXL.loft([S(-0.2, 0.15, 0.115), S(-0.12, 0.192, 0.135, -0.006), S(-0.04, 0.2, 0.138, -0.004), S(0.05, 0.19, 0.13), S(0.1, 0.17, 0.12)], { uv: R_T.map((v, i) => i === 1 ? 0.5 : i === 3 ? 1 : v), roundTop: 0.02, seg: L() ? 12 : 20, cap: "b" }) }];
    it.push({ m: K.pantsP, g: TLXL.loft([S(-0.19, 0.17, 0.112), S(-0.14, 0.195, 0.132, -0.01), S(-0.1, 0.199, 0.137, -0.008)], { uv: [0, 0.5, 1, 0.55], seg: L() ? 6 : 10, a0: PI * 0.72, a1: PI * 1.28, inflate: 0.004 }) });      // seat panel
    return it;
  };

  /* ---------------- limbs ---------------- */
  // tab rows: [t along the limb (0..1.1), rx, rz, cz]; L0 the real length; f optional fold function; sections are smoothed
  const limb = (tab, L0, o, uv, f) => TLXL.loft(TLXL.smooth(tab.map(r => [r[0] * L0, r[1], r[2], r[3] || 0]), L() ? 8 : 12), Object.assign({ axis: "z", uv, seg: L() ? 9 : 14, mod: f }, o));
  F.thigh = function (K, L0) {
    const f = mods(fold(L0 * 0.97, 0.05, 0.05, PI, 55, 1), fold(L0 * 0.06, 0.06, 0.04, 0, 50, 1));
    return [{ m: K.pants, g: limb([[0, 0.08, 0.086], [0.1, 0.086, 0.094], [0.22, 0.098, 0.106], [0.4, 0.106, 0.114], [0.6, 0.098, 0.105], [0.85, 0.088, 0.094], [1, 0.086, 0.09]], L0, { roundBottom: 0.07, roundTop: 0.04 }, R_UP, f) }];
  };
  F.shin = function (K, L0) {                       // knee to ankle, the trouser gaiter flaring over the boot top 3.5 cm below the ankle
    const f = mods(fold(L0 * 0.04, 0.05, 0.05, PI, 55, 1), fold(L0 * 1.0, 0.04, 0.03, 0, 80, 0));
    return [{ m: K.pants, g: limb([[0, 0.086, 0.09], [0.1, 0.092, 0.1], [0.3, 0.088, 0.1, -0.008], [0.55, 0.08, 0.088], [0.8, 0.074, 0.078], [0.93, 0.076, 0.08], [1, 0.088, 0.092], [1.045, 0.093, 0.097]], L0, { roundBottom: 0.012, cap: "t" }, R_FO, f) }];
  };
  F.upper = function (K, L0, s) {
    s = s || 1; const inner = -s * PI / 2, f = mods(fold(L0 * 0.86, 0.05, 0.05, 0, 55, 1), fold(L0 * 0.07, 0.04, 0.05, inner, 70, 2));
    return [{ m: K.jacket, g: limb([[0, 0.074, 0.078], [0.07, 0.082, 0.086], [0.2, 0.076, 0.08], [0.5, 0.071, 0.074], [0.82, 0.068, 0.07], [1, 0.064, 0.066]], L0, { roundBottom: 0.07, roundTop: 0.03 }, R_UP, f) }];
  };
  F.fore = function (K, L0, s) {
    s = s || 1; const f = mods(fold(L0 * 0.04, 0.045, 0.06, 0, 60, 1));
    const it = [{ m: K.jacket, g: limb([[0, 0.066, 0.068], [0.15, 0.07, 0.073], [0.5, 0.062, 0.064], [0.85, 0.058, 0.06], [1, 0.063, 0.064]], L0, { roundBottom: 0.04, cap: "t" }, R_FO, f) }];
    if (!L()) it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.014, 0.04, 0.052, 0.005), { x: s * 0.068, z: L0 * 0.8, y: 0.0 }) });             // cuff tab, velcro
    return it;
  };
  // second-tone elbow / knee patches and trim bands, built to ride on a limb (same axis, same L0)
  F.elbow = function (K, L0, upper, s) {
    const tab = upper ? [[0.62, 0.07, 0.072], [0.82, 0.07, 0.072], [1, 0.066, 0.068]] : [[0, 0.07, 0.072], [0.15, 0.072, 0.075], [0.3, 0.066, 0.068]];
    const it = [{ m: K.panel, g: limb(tab, L0, { a0: PI * 0.6, a1: PI * 1.4, inflate: 0.004, roundBottom: 0.0, uv: upper ? R_UP : R_FO, seg: 6 }, upper ? R_UP : R_FO) }];
    if (upper) it.push({ m: K.panel, g: limb([[0.04, 0.084, 0.088], [0.12, 0.086, 0.09], [0.3, 0.079, 0.083]], L0, { a0: s * PI / 2 - 0.55, a1: s * PI / 2 + 0.55, inflate: 0.004, uv: R_UP, seg: 6 }, R_UP) });   // deltoid cap panel
    else it.push({ m: K.trim, g: limb([[0.52, 0.062, 0.064], [0.56, 0.062, 0.064]], L0, { inflate: 0.004, uv: R_FO, seg: L() ? 10 : 16 }, R_FO) });
    return it;
  };
  F.kneePad = function (K, L0) { return [{ m: K.panel, g: limb([[0.02, 0.09, 0.102], [0.1, 0.1, 0.114], [0.2, 0.094, 0.108], [0.33, 0.078, 0.098]], L0, { a0: -1.05, a1: 1.05, inflate: 0.006, roundBottom: 0.02, roundTop: 0.02, uv: R_FO, seg: 8 }, R_FO) }]; };
  F.band = function (K, r, w, mat) { return [{ m: mat || K.reflect, g: TLXL.xf(TLXL.lathe([[r, -w / 2], [r + 0.004, -w / 2 + 0.002], [r + 0.004, w / 2 - 0.002], [r, w / 2]], L() ? 12 : 18), { rx: PI / 2 }) }]; };   // ring round a z-axis limb
  F.furCollar = function (K) { return [{ m: K.fur, g: TLXL.loft([S(0.5, 0.13, 0.115), S(0.55, 0.15, 0.13), S(0.6, 0.145, 0.125), S(0.64, 0.12, 0.105), S(0.62, 0.1, 0.09)], { uv: [0, 0, 2, 1], seg: L() ? 12 : 18 }) }]; };
  F.neck = function (K) { return [{ m: K.mask, g: TLXL.loft([S(0.53, 0.066, 0.07), S(0.6, 0.06, 0.064), S(0.67, 0.058, 0.064, 0.004)], { uv: [0, 0, 2, 1], cap: "t", seg: 10 }) }]; };

  /* ---------------- hands ---------------- */
  // hand frame: wrist at -z, fingers +z, the back of the hand +y, the thumb on -sx (+x for 'open'); the grip axis through the origin.
  // Insulated gloves: a thick palm and back, a gauntlet that flares over the sleeve, fingers packed side by side, a thumb of its own.
  F.hand = function (K, kind, sx, k) {
    k = k || 1; sx = sx || 1; const M = K.glove, it = [], mitt = /itt/.test(kind), fist = kind === "fist" || kind === "mitt", rel = kind.indexOf("relaxed") === 0, lite = L();
    const sec = (z, rx, rz, cz) => S(z * k, rx * k, rz * k, (cz || 0) * k), tb = (pts, r) => TLXL.tube(pts.map(p => [p[0] * k, p[1] * k, p[2] * k]), r * k, { n: 5, seg: lite ? 4 : 5 });
    const palm = fist ? [sec(-0.105, 0.042, 0.026, 0.054), sec(-0.07, 0.049, 0.029, 0.038), sec(-0.035, 0.05, 0.028, 0.02)] : [sec(-0.115, 0.044, 0.024), sec(-0.07, 0.05, 0.028), sec(-0.02, 0.052, 0.025), sec(0.0, 0.05, 0.02)];
    it.push({ m: M, g: TLXL.loft(palm, { axis: "z", roundBottom: 0.015 * k, roundTop: fist ? 0.01 : 0.012 * k, seg: lite ? 8 : 12 }) });
    const gt = fist ? [sec(-0.15, 0.068, 0.066, 0.06), sec(-0.125, 0.074, 0.068, 0.058), sec(-0.095, 0.076, 0.066, 0.05), sec(-0.07, 0.064, 0.046, 0.04)] : [sec(-0.155, 0.068, 0.066), sec(-0.13, 0.074, 0.068), sec(-0.1, 0.076, 0.066), sec(-0.07, 0.064, 0.046)];
    it.push({ m: M, g: TLXL.loft(gt, { axis: "z", roundBottom: 0.01, seg: lite ? 8 : 14 }) });                                  // gauntlet over the sleeve
    const lens = [0.082, 0.088, 0.078, 0.062], xs = [0.0345, 0.0115, -0.0115, -0.0345].map(x => -sx * x), fr = 0.0128;
    if (fist && !mitt) lens.forEach((len, i) => {
      const rr = 0.038, a0 = -1.22, a1 = a0 + len * 1.35 / rr, pts = []; for (let j = 0; j <= 5; j++) { const a = a0 + (a1 - a0) * j / 5; pts.push([xs[i], rr * Math.cos(a), rr * Math.sin(a)]); }
      it.push({ m: M, g: tb(pts, fr) });
    });
    else if (fist) for (const x of [-0.023, 0.023]) { const rr = 0.04, pts = []; for (let j = 0; j <= 5; j++) { const a = -1.15 + j * 0.62; pts.push([x, rr * Math.cos(a), rr * Math.sin(a)]); } it.push({ m: M, g: tb(pts, 0.026) }); }
    else if (rel && !mitt) lens.forEach((len, i) => it.push({ m: M, g: tb([[xs[i], 0.002, 0], [xs[i], -0.004, len * 0.4], [xs[i], -0.02, len * 0.75], [xs[i], -0.046, len * 0.9], [xs[i], -0.062, len * 0.78]], fr) }));
    else if (rel) for (const x of [-0.023, 0.023]) it.push({ m: M, g: tb([[x, 0.002, 0], [x, -0.008, 0.045], [x, -0.03, 0.075], [x, -0.056, 0.074]], 0.026) });
    else if (!mitt) lens.forEach((len, i) => it.push({ m: M, g: tb([[xs[i], 0, 0], [xs[i] * 1.05, 0, len * 0.5], [xs[i] * 1.1, 0, len]], fr) }));
    else { it.push({ m: M, g: TLXL.loft([sec(0.0, 0.052, 0.02), sec(0.05, 0.054, 0.02), sec(0.1, 0.046, 0.018)], { axis: "z", roundTop: 0.02, seg: 10 }) }); }
    if (kind.indexOf("open") === 0) it.push({ m: M, g: tb([[0.05, -0.008, -0.07], [0.078, -0.008, -0.03], [0.083, -0.006, 0.014]], 0.0195) });
    else if (fist) it.push({ m: M, g: tb([[-sx * 0.04, 0.02, -0.05], [-sx * 0.049, 0.036, -0.01], [-sx * 0.05, 0.046, 0.03]], mitt ? 0.022 : 0.0185) });
    else it.push({ m: M, g: tb([[-sx * 0.038, -0.004, -0.06], [-sx * 0.056, -0.012, -0.02], [-sx * 0.058, -0.026, 0.024]], mitt ? 0.022 : 0.0185) });
    return it;
  };

  /* ---------------- boots ---------------- */
  // a snowmobile boot: lugged 3 cm sole with a heel step, a blunt toe box with a rubber rand, a laced tongue panel and a padded shaft to mid-calf
  // (the trouser gaiter drapes over its top). origin: sole under the ankle axis, +z the toe; ankH = the ankle axis above the sole.
  F.boot = function (K, kind, ankH) {
    const arc = kind === "arctic", up = arc ? K.bootB : K.bootA, w = arc ? 1.1 : 1, wx = arc ? 1.0 : 0.94, it = [], lite = L(), sec = (z, rx, rz, cz) => S(z, rx * wx, rz * w, cz);
    const foot = [sec(-0.108, 0.044, 0.042, 0.072), sec(-0.075, 0.058, 0.054, 0.082), sec(-0.02, 0.064, 0.05, 0.088), sec(0.05, 0.065, 0.042, 0.081), sec(0.12, 0.064, 0.038, 0.073), sec(0.185, 0.056, 0.036, 0.068), sec(0.225, 0.04, 0.033, 0.064), sec(0.248, 0.018, 0.026, 0.06)];
    foot.forEach(s => s.n = 2.5);
    it.push({ m: up, g: TLXL.loft(foot, { axis: "z", seg: lite ? 10 : 16, roundBottom: 0.01, roundTop: 0.012, uv: [0, 0.2, 1, 1] }) });
    // sole: 3.8 cm at the heel, thinner under the arch, lugs from the stamped tread map
    const so = (z, rx, h) => S(z, rx * w, h / 2, h / 2, 3);
    it.push({ m: K.sole, g: TLXL.loft([so(-0.112, 0.048, 0.038), so(-0.085, 0.062, 0.038), so(-0.04, 0.066, 0.036), so(0.0, 0.066, 0.026), so(0.06, 0.068, 0.028), so(0.12, 0.068, 0.034), so(0.19, 0.06, 0.036), so(0.238, 0.04, 0.034)], { axis: "z", seg: lite ? 10 : 16, roundBottom: 0.014, roundTop: 0.016, uv: [0, 0, 1, 1] }) });
    it.push({ m: K.sole, g: TLXL.loft(foot.slice(0, 7).map(s => Object.assign({}, s)), { axis: "z", a0: PI - 0.9, a1: PI + 0.9, inflate: 0.004, seg: 8, roundTop: 0.0, uv: [0.3, 0.1, 0.7, 0.3] }) });     // rubber rand round the lower foot
    it.push({ m: K.sole, g: TLXL.loft(foot.slice(5).map(s => Object.assign({}, s)), { axis: "z", a0: -1.5, a1: 1.5, inflate: 0.004, seg: 8, roundTop: 0.012, uv: [0.3, 0.2, 0.7, 0.3] }) });    // toe cap
    // shaft: from the foot up past the ankle axis to mid-calf
    const top = ankH + (arc ? 0.115 : 0.04), y0 = 0.08, sh = [S(y0, 0.066 * wx, 0.082 * w, -0.012), S(ankH - 0.02, 0.067 * wx, 0.078 * w, -0.008), S(ankH + 0.03, 0.069 * wx, 0.078 * w, -0.004), S(top, 0.072 * wx, 0.081 * w, -0.002)];
    it.push({ m: up, g: TLXL.loft(sh, { seg: lite ? 10 : 16, uv: [0, 0.4, 1, 1], cap: "t" }) });
    it.push({ m: K.boot, g: TLXL.loft([S(top - 0.03, 0.074 * wx, 0.083 * w, -0.002), S(top - 0.012, 0.079 * wx, 0.089 * w, -0.002), S(top + 0.004, 0.077 * wx, 0.087 * w, -0.002)], { seg: lite ? 10 : 14, uv: [0, 0, 2, 1], roundTop: 0.006 }) });   // padded collar
    // laced tongue panel up the instep and shaft, laces across it, a strap with a buckle round the shaft
    const lace = foot.slice(1, 5).map(s => Object.assign({}, s));
    it.push({ m: K.boot, g: TLXL.loft(lace, { axis: "z", a0: -0.5, a1: 0.5, inflate: 0.005, seg: 5, uv: [0.4, 0.5, 0.6, 0.7] }) });
    it.push({ m: K.boot, g: TLXL.loft([S(0.1, 0.066 * wx, 0.082 * w, -0.012), S(ankH + 0.03, 0.069 * wx, 0.079 * w, -0.004), S(top - 0.01, 0.072 * wx, 0.082 * w, -0.002)], { a0: -0.5, a1: 0.5, inflate: 0.005, seg: 5, uv: [0.4, 0.5, 0.6, 0.7] }) });
    if (!lite) {
      for (let i = 0; i < 6; i++) { const t = i / 5, z = 0.11 - t * 0.14, yy = 0.118 - t * 0.0 + 0; if (z > -0.03) it.push({ m: K.eye, g: TLXL.xf(TLXL.rbox(0.062 * wx, 0.007, 0.007, 0.0025, 1), { y: 0.1 + (0.11 - z) * 0.1 - (z > 0.03 ? (z - 0.03) * 0.2 : 0), z, rx: -0.2 }) }); }
      for (let i = 0; i < 3; i++) { const yy = ankH + 0.03 + i * 0.03; if (yy < top - 0.01) it.push({ m: K.eye, g: TLXL.xf(TLXL.rbox(0.062 * wx, 0.007, 0.007, 0.0025, 1), { y: yy, z: 0.078 * w - 0.005 }) }); }
      it.push({ m: K.boot, g: TLXL.loft([S(ankH - 0.045, 0.0715 * wx, 0.083 * w, -0.008), S(ankH - 0.025, 0.0715 * wx, 0.083 * w, -0.008)], { seg: lite ? 10 : 14, uv: [0, 0, 1, 0.1] }) });          // strap round the shaft
      it.push({ m: K.eye, g: TLXL.xf(TLXL.rbox(0.03, 0.026, 0.01, 0.003), { x: 0.0, y: ankH - 0.035, z: 0.078 * w + 0.001 }) });
      it.push({ m: K.boot, g: TLXL.xf(TLXL.rbox(0.04 * wx, 0.034, 0.012, 0.005, 1), { y: ankH * 0.75 + 0.03, z: -0.092 * w, rx: 0.1 }) });                                                       // heel pull tab
    }
    return it;
  };

  /* ---------------- heads ---------------- */
  // head-centre origin, +z the way the face points. Crown at +0.115, chin at -0.118, face front about +0.105.
  const nose = (K, it) => {
    const E = TLXL.ell, X = TLXL.xf;
    it.push({ m: K.skin, g: X(E(0.0075, 0.026, 0.017), { y: 0.006, z: 0.096, rx: 0.18 }) });                           // bridge
    it.push({ m: K.skin, g: X(E(0.0105, 0.0095, 0.012), { y: -0.026, z: 0.106 }) });                                  // tip
    for (const s of [-1, 1]) it.push({ m: K.skin, g: X(E(0.0065, 0.008, 0.008), { x: s * 0.0095, y: -0.03, z: 0.1 }) });  // wings
    it.push({ m: K.blush, g: X(new T.CircleGeometry(0.0105, 10), { y: -0.027, z: 0.1175, rx: -0.2 }) });             // cold-red tip
  };
  F.face = function (K, o) {
    o = o || {}; const it = [], lite = L(), E = TLXL.ell, X = TLXL.xf;
    it.push({ m: K.skin, g: TLXL.loft([S(-0.118, 0.016, 0.026, 0.06), S(-0.108, 0.034, 0.04, 0.052), S(-0.088, 0.054, 0.06, 0.036), S(-0.062, 0.066, 0.08, 0.02), S(-0.028, 0.075, 0.092, 0.006), S(0.01, 0.076, 0.096, 0), S(0.06, 0.075, 0.095, -0.003), S(0.095, 0.066, 0.086, -0.01), S(0.115, 0.04, 0.06, -0.012)], { roundTop: 0.018, seg: lite ? 10 : 16, uv: [0, 0, 1, 1] }) });
    nose(K, it);
    it.push({ m: K.skin, g: X(E(0.062, 0.013, 0.022), { y: 0.034, z: 0.083 }) });                                           // brow
    it.push({ m: K.skin, g: X(E(0.027, 0.021, 0.022), { y: -0.094, z: 0.062 }) });                                          // chin
    for (const s of [-1, 1]) {
      it.push({ m: K.skin, g: X(E(0.023, 0.018, 0.024), { x: s * 0.05, y: -0.027, z: 0.068 }) });                             // cheeks
      it.push({ m: K.skin, g: X(E(0.008, 0.03, 0.02), { x: s * 0.077, y: -0.012, z: -0.006, rz: s * 0.12 }) });             // ears
      it.push({ m: K.blush, g: X(new T.CircleGeometry(0.02, 12), { x: s * 0.052, y: -0.03, z: 0.087, ry: s * 0.5, rx: -0.12 }) });    // cheek flush
    }
    if (o.features !== false) {
      for (const s of [-1, 1]) {
        it.push({ m: K.eye, g: X(E(0.0105, 0.0075, 0.008), { x: s * 0.032, y: 0.016, z: 0.087 }) }); it.push({ m: K.feat, g: X(E(0.0052, 0.0052, 0.004), { x: s * 0.032, y: 0.016, z: 0.0945 }) });
        it.push({ m: K.feat, g: X(E(0.022, 0.004, 0.007), { x: s * 0.034, y: 0.037, z: 0.091, rz: s * -0.15 }) });
      }
      it.push({ m: K.lip, g: X(E(0.021, 0.0055, 0.008), { y: -0.062, z: 0.088 }) });                                         // lips
      it.push({ m: K.lip, g: X(E(0.018, 0.0065, 0.0085), { y: -0.0725, z: 0.0865 }) });
      it.push({ m: K.feat, g: X(E(0.0185, 0.0014, 0.004), { y: -0.0672, z: 0.092 }) });
    }
    return it;
  };
  F.neckWarmer = function (K) {                       // a knit neck warmer under the chin, pulled up over it
    return [{ m: K.mask, g: TLXL.loft([S(-0.19, 0.074, 0.084, -0.004), S(-0.15, 0.078, 0.09, 0.0), S(-0.115, 0.078, 0.095, 0.01), S(-0.092, 0.074, 0.098, 0.018), S(-0.082, 0.066, 0.09, 0.02)], { seg: L() ? 12 : 18, uv: [0, 0, 2, 1], roundTop: 0.006, mod: fold(-0.13, 0.03, 0.035, 0, 90, 0) }) }];
  };
  F.liner = function (K) {                           // the dark inside of a helmet: nothing of the face shows through the visor
    return [{ m: K.dark, g: TLXL.loft([S(-0.118, 0.018, 0.028, 0.062), S(-0.1, 0.04, 0.048, 0.05), S(-0.07, 0.06, 0.073, 0.028), S(-0.03, 0.072, 0.09, 0.008), S(0.01, 0.074, 0.094, 0), S(0.06, 0.073, 0.093, -0.003), S(0.095, 0.064, 0.084, -0.01), S(0.115, 0.04, 0.06, -0.012)], { roundTop: 0.018, seg: L() ? 10 : 14 }) }];
  };
  const hs = (y, rx, rz, cz) => S(y, rx, rz, cz === undefined ? -0.014 : cz);
  // full-face shell: crown, a band round the back and sides, chin bar and cheeks, an eye port with a curved tinted visor behind a rim, a peak, a vent, a dark neck roll
  F.helmet = function (K) {
    const lite = L(), it = [], vis = [], sg = lite ? 14 : 22, H = K.helmet, E = 1.16, X = TLXL.xf;
    const col = (y0, y1, n) => { const o = []; for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n; o.push(hs(y, 0.105 - Math.max(0, y - 0.05) * 0.5 - Math.max(0, -0.05 - y) * 0.48, 0.128 - Math.max(0, y - 0.05) * 0.58 - Math.max(0, -0.05 - y) * 0.6)); } return o; };
    it.push({ m: H, g: TLXL.loft(col(0.045, 0.1, 3).concat([hs(0.12, 0.074, 0.098), hs(0.138, 0.044, 0.066)]), { seg: sg, roundTop: 0.014, uv: [0, 0.5, 1, 1] }) });                                          // crown
    it.push({ m: H, g: TLXL.loft(col(-0.036, 0.047, 3), { seg: sg, a0: E, a1: TAU - E, uv: [0, 0.3, 1, 0.5] }) });                                                                                 // band round the back and sides
    it.push({ m: H, g: TLXL.loft(col(-0.118, -0.034, 3), { seg: sg, uv: [0, 0, 1, 0.3] }) });                                                                                                      // cheeks and lower shell
    it.push({ m: H, g: TLXL.loft([hs(-0.134, 0.036, 0.05, 0.074), hs(-0.112, 0.064, 0.08, 0.05), hs(-0.082, 0.086, 0.108, 0.016), hs(-0.05, 0.1, 0.126, -0.004), hs(-0.034, 0.103, 0.13)], { seg: 12, a0: -1.0, a1: 1.0, inflate: 0.003, uv: [0, 0, 1, 0.3] }) });     // chin bar
    it.push({ m: K.dark, g: TLXL.loft(col(-0.136, -0.092, 2), { seg: sg, inflate: 0.004, uv: [0, 0, 2, 0.1], a0: 0.9, a1: TAU - 0.9 }) });                                                         // neck roll, dark
    // graphics in the trim colour: a crown stripe and a swoosh down each side
    it.push({ m: K.trim, g: TLXL.loft(col(0.045, 0.1, 3).concat([hs(0.12, 0.074, 0.098), hs(0.138, 0.044, 0.066)]), { seg: 2, a0: -0.12, a1: 0.12, inflate: 0.004, roundTop: 0.014, uv: [0.2, 0, 0.8, 1] }) });
    it.push({ m: K.trim, g: TLXL.loft(col(0.045, 0.1, 3).concat([hs(0.12, 0.074, 0.098), hs(0.138, 0.044, 0.066)]), { seg: 2, a0: PI - 0.12, a1: PI + 0.12, inflate: 0.004, roundTop: 0.014, uv: [0.2, 0, 0.8, 1] }) });
    for (const s of [-1, 1]) it.push({ m: K.trim, g: TLXL.loft(col(0.0, 0.1, 4), { seg: 3, a0: s * PI / 2 - 0.2, a1: s * PI / 2 + 0.2, inflate: 0.004, uv: [0.2, 0.3, 0.4, 0.5] }) });
    // eye port rim and the tinted curved visor behind it
    it.push({ m: K.dark, g: TLXL.loft(col(0.043, 0.054, 1), { seg: 12, a0: -E - 0.06, a1: E + 0.06, inflate: 0.005, uv: [0, 0, 1, 0.1] }) });
    it.push({ m: K.dark, g: TLXL.loft(col(-0.04, -0.03, 1), { seg: 12, a0: -E - 0.06, a1: E + 0.06, inflate: 0.005, uv: [0, 0, 1, 0.1] }) });
    for (const s of [-1, 1]) it.push({ m: K.dark, g: TLXL.loft(col(-0.036, 0.047, 2), { seg: 2, a0: s * E - 0.05, a1: s * E + 0.05, inflate: 0.005, uv: [0, 0, 0.1, 1] }) });
    vis.push({ m: K.visor, g: TLXL.loft(col(-0.036, 0.047, 3), { seg: 14, a0: -E - 0.03, a1: E + 0.03, inflate: 0.0035, uv: [0, 0, 1, 1] }) });
    it.push({ m: H, g: TLXL.loft([hs(0.05, 0.108, 0.128), hs(0.062, 0.12, 0.158), hs(0.07, 0.118, 0.162), hs(0.066, 0.112, 0.15)], { seg: 10, a0: -1.05, a1: 1.05, uv: [0.2, 0.5, 0.8, 0.6] }) });                    // peak
    it.push({ m: K.dark, g: TLXL.loft([hs(-0.1, 0.07, 0.092, 0.03), hs(-0.088, 0.078, 0.102, 0.02), hs(-0.078, 0.084, 0.11, 0.01)], { seg: 4, a0: -0.3, a1: 0.3, inflate: 0.005, uv: [0, 0, 1, 1] }) });     // chin-bar vent
    if (!lite) {
      for (let i = 0; i < 4; i++) it.push({ m: K.helmet, g: X(TLXL.rbox(0.05, 0.003, 0.006, 0.0012, 1), { y: -0.088 - i * 0.006 + 0.006, z: 0.118 - i * 0.008 + 0.004, rx: 0.55 }) });
      for (const s of [-1, 1]) {
        it.push({ m: K.dark, g: X(TLXL.ell(0.012, 0.012, 0.007), { x: s * 0.1, y: 0.006, z: 0.0 }) });                                                                                       // visor pivot
        for (let i = 0; i < 2; i++) it.push({ m: K.dark, g: X(TLXL.rbox(0.012, 0.004, 0.05, 0.0015, 1), { x: s * (0.018 + i * 0.016), y: 0.132 - i * 0.004, z: 0.025, rx: 0.5 }) });          // crown vents
      }
      it.push({ m: K.dark, g: X(TLXL.rbox(0.048, 0.016, 0.012, 0.004), { y: -0.125, z: 0.075, rx: -0.4 }) });                                                                       // breath guard
    }
    return { shell: it, visor: vis };
  };
  // goggles: a curved one-piece lens in a foam-backed frame with vents, on a wide strap round the hat. kit: 'beanie' or 'mask'
  F.goggles = function (K, kit) {
    const lite = L(), it = [], lens = [], mask = kit === "mask", r = mask ? 0 : 0.007, p = (y, rx, rz, cz) => S(y, rx + r, rz + r, cz === undefined ? -0.011 : cz), E = 1.15;
    lens.push({ m: K.gog, g: TLXL.loft([p(-0.004, 0.113, 0.134), p(0.014, 0.117, 0.139), p(0.034, 0.118, 0.14), p(0.054, 0.114, 0.135)], { seg: 14, a0: -E + 0.06, a1: E - 0.06, uv: [0, 0, 1, 1] }) });
    it.push({ m: K.foam, g: TLXL.loft([p(-0.02, 0.1, 0.12), p(0.0, 0.104, 0.126), p(0.044, 0.106, 0.128), p(0.07, 0.1, 0.12)], { seg: 14, a0: -E, a1: E, uv: [0, 0, 2, 1] }) });                      // foam backing
    for (const y of [-0.012, 0.062]) it.push({ m: K.dark, g: TLXL.loft([p(y - 0.0065, 0.114, 0.136), p(y + 0.0065, 0.114, 0.136)], { seg: 14, a0: -E - 0.02, a1: E + 0.02, uv: [0, 0, 1, 0.1] }) });
    for (const s of [-1, 1]) it.push({ m: K.dark, g: TLXL.loft([p(-0.012, 0.114, 0.136), p(0.03, 0.118, 0.14), p(0.062, 0.114, 0.136)], { seg: 3, a0: s * E - 0.06, a1: s * E + 0.06, uv: [0, 0, 0.1, 1] }) });
    const sr = mask ? [0.087, 0.105] : [0.095, 0.115];
    it.push({ m: K.dark, g: TLXL.loft([S(0.004, sr[0] + 0.004, sr[1] + 0.004, -0.012), S(0.056, sr[0] + 0.004, sr[1] + 0.004, -0.012)], { seg: lite ? 14 : 22, a0: E + 0.1, a1: TAU - E - 0.1, uv: [0, 0, 1, 1] }) });   // wide strap round the hat
    it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.032, 0.03, 0.02, 0.008), { y: 0.012, z: 0.123 }) });                                                                   // nose cut-out and bridge
    if (!lite) for (let i = -2; i <= 2; i++) { const a = i * 0.34; it.push({ m: K.foam, g: TLXL.xf(TLXL.rbox(0.018, 0.004, 0.006, 0.0015, 1), { x: Math.sin(a) * 0.12, y: 0.063, z: -0.011 + Math.cos(a) * 0.142, ry: a }) }); }   // vents
    return { frame: it, lens };
  };
  F.beanie = function (K) {
    const lite = L(), p = (y, rx, rz, cz) => S(y, rx, rz, cz), it = [];
    it.push({ m: K.beanie, g: TLXL.loft([p(0.01, 0.091, 0.108, -0.012), p(0.026, 0.096, 0.113, -0.012), p(0.04, 0.094, 0.11, -0.012), p(0.045, 0.09, 0.106, -0.012), p(0.08, 0.085, 0.102, -0.012), p(0.115, 0.07, 0.088, -0.012), p(0.135, 0.04, 0.056, -0.012)], { seg: lite ? 14 : 22, roundTop: 0.016, uv: [0, 0, 2, 2] }) });
    it.push({ m: K.beanie, g: TLXL.xf(TLXL.ell(0.034, 0.03, 0.034), { y: 0.165, z: -0.012 }) });
    return it;
  };
  F.balaclava = function (K) {
    const lite = L(), p = (y, rx, rz, cz) => S(y, rx, rz, cz), it = [];
    it.push({ m: K.mask, g: TLXL.loft([p(-0.15, 0.06, 0.066, -0.01), p(-0.118, 0.052, 0.062, 0.03), p(-0.09, 0.068, 0.088, 0.03), p(-0.05, 0.08, 0.1, 0.006), p(0.01, 0.083, 0.102, -0.002), p(0.06, 0.081, 0.1, -0.004), p(0.095, 0.072, 0.09, -0.01), p(0.118, 0.045, 0.062, -0.012)], { seg: lite ? 14 : 22, roundTop: 0.02, uv: [0, 0, 2, 2] }) });
    it.push({ m: K.mask, g: TLXL.xf(TLXL.ell(0.011, 0.026, 0.026), { y: -0.026, z: 0.099, rx: 0.3 }) });
    return it;
  };
})();

/* ---------------------------------------------------------------------------------------------------------
   TLXL.sled: the sled kit (slice R2). Everything a machine is made of, as geometry items {g, m} for TLXL.build (one mesh per
   material). The game (buildMachine in tracklayer.js) passes each machine's SHAPE numbers and the live livery materials; nothing
   here owns state except the shared material set.
     S.mats(ctx)                   the shared material set S.M (paint materials come from ctx and are dressed here)
     S.hood(shape, H, HB, ctx)     lofted hood + belly pan + shut line + stripes + nose lamp bucket + vents + latches + badge
                                   -> { items, decal: {stripe, wide, flash: [geometry]}, topAt, frontZ, sideX, info }
     S.chassis(shape, ctx, ud)     tunnel, running boards, rolled edges, snow flap, tail lamp, bumper, bogies, rack, spoiler, exhaust
     S.seat(profile, zr, w, kind)  moulded vinyl cushion with stitched seams, piping, grab strap
     S.ski(kind, sw)               items for one ski pivot: swept ski, keel, carbide, loop handle, saddle, spindle, bolts
     S.front(shape, ctx, yPeak)    front suspension of the machine's era in sled space (leaf radius rods or A-arms + coil-overs)
     S.track(ctx)                  the belt (path shader: lugs move with the animation), lugs by kind, wheels, skid frame
     S.bars(), S.shield(), S.pod(kind), S.column()   the shared steering parts
     S.rod S.bolt S.spring S.sweep S.plate S.orient   small builders (see below)
   --------------------------------------------------------------------------------------------------------- */
(function () {
  "use strict";
  const T = window.THREE, TLXL = window.TLXL; if (!T || !TLXL) return;
  const S = TLXL.sled = { ms: 0, M: null }, PI = Math.PI, TAU = PI * 2, L = () => TLXL.lite;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t, sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const cvs = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; };
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const mkTex = (c, srgb, repeat) => { const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = repeat === false ? T.ClampToEdgeWrapping : T.RepeatWrapping; t.anisotropy = TLXL.aniso; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.tlSrgb = srgb !== false; if (srgb !== false && TLXL.srgb) t.encoding = T.sRGBEncoding; return t; };

  /* ---------------- small builders ---------------- */
  const UP = V3(0, 1, 0);
  // rotate a geometry built along +y so +y points along n, then move it to p
  S.orient = (g, p, n) => { g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(UP, V3(n[0], n[1], n[2]).normalize()))); g.translate(p[0], p[1], p[2]); return g; };
  // a round rod from a to b (capped)
  S.rod = (a, b, r, seg) => { const d = V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(), g = new T.CylinderGeometry(r, r, len, seg || (L() ? 6 : 9), 1); g.translate(0, len / 2, 0); return S.orient(g, a, [d.x, d.y, d.z]); };
  S.taper = (a, b, r0, r1, seg) => { const d = V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(), g = new T.CylinderGeometry(r1, r0, len, seg || (L() ? 6 : 9), 1); g.translate(0, len / 2, 0); return S.orient(g, a, [d.x, d.y, d.z]); };
  // a hex bolt head sitting on a surface at p with outward normal n
  S.bolt = (p, n, r) => S.orient(new T.CylinderGeometry(r, r, r * 0.9, 6), [p[0] + n[0] * r * 0.4, p[1] + n[1] * r * 0.4, p[2] + n[2] * r * 0.4], n);
  // world-aligned UVs in metres (k tiles per metre) so a map keeps its scale on a box of any size
  S.uvm = (g, k) => { const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; for (let i = 0; i < P.count; i++) { const ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i)), az = Math.abs(N.getZ(i)); let u, v; if (ay >= ax && ay >= az) { u = P.getX(i); v = P.getZ(i); } else if (ax >= az) { u = P.getZ(i); v = P.getY(i); } else { u = P.getX(i); v = P.getY(i); } U.setXY(i, u * k, v * k); } return g; };
  S.plate = (w, h, d, r, k) => S.uvm(TLXL.rbox(w, h, d, r), k || 4);
  const at = (g, x, y, z, rx, ry, rz) => TLXL.xf(g, { x, y, z, rx, ry, rz });
  // tube along a path with an extra seg count (TLXL.tube already closes the ends)
  const tb = (pts, r, seg) => TLXL.tube(pts, r, { seg: seg || (L() ? 5 : 7) });
  // a coil spring between a and b: a helix of wire r_w, coil radius r
  S.spring = (a, b, r, turns, wire) => { const pts = [], n = Math.max(8, turns * (L() ? 7 : 11)); for (let i = 0; i <= n; i++) { const t = i / n, ang = t * turns * TAU; pts.push(V3(Math.cos(ang) * r, t, Math.sin(ang) * r)); }
    const g = new T.TubeGeometry(new T.CatmullRomCurve3(pts), n * 2, wire || 0.007, 5, false); g.computeVertexNormals(); const d = V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); g.scale(1, len, 1); return S.orient(g, a, [d.x, d.y, d.z]); };
  // a swept ribbon: path [[z, y]] (side view, dense), half width wFn(u), half thickness tFn(u), superellipse exponent n; off = offset along the path normal
  S.sweep = (path, wFn, tFn, o) => { o = o || {}; const m = path.length, K = o.K || (L() ? 8 : 12), e = 2 / (o.n || 4), cols = K + 1, pos = new Float32Array(m * cols * 3), uv = new Float32Array(m * cols * 2), idx = [];
    for (let i = 0; i < m; i++) { const a = path[Math.max(0, i - 1)], b = path[Math.min(m - 1, i + 1)], dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy) || 1, nz = -dy / l, ny = dz / l, u = i / (m - 1), w = wFn(u), h = tFn(u), off = o.off || 0, cx = o.cx || 0;
      for (let j = 0; j <= K; j++) { const an = -PI + TAU * j / K, sn = Math.sin(an), cs = Math.cos(an), x = w * Math.sign(sn) * Math.pow(Math.abs(sn), e) + cx, hh = h * Math.sign(cs) * Math.pow(Math.abs(cs), e) + off, p = (i * cols + j) * 3;
        pos[p] = x; pos[p + 1] = path[i][1] + ny * hh; pos[p + 2] = path[i][0] + nz * hh; uv[(i * cols + j) * 2] = j / K; uv[(i * cols + j) * 2 + 1] = u * (o.len || 1); } }
    for (let i = 0; i < m - 1; i++) for (let j = 0; j < K; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("uv", new T.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };

  /* ---------------- textures drawn for the sleds ---------------- */
  const lensCanvas = (core, mid, edge) => {      // headlight lens seen head on: a hot bulb, reflector rings, a dark rim
    const c = cvs(128), g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    gr.addColorStop(0, core); gr.addColorStop(0.16, core); gr.addColorStop(0.26, mid); gr.addColorStop(0.7, edge); gr.addColorStop(1, "#3a352a"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = "rgba(40,36,24,0.35)"; g.lineWidth = 1.2; for (let r = 18; r < 62; r += 9) { g.beginPath(); g.arc(64, 64, r, 0, TAU); g.stroke(); }
    for (let a = 0; a < 16; a++) { g.beginPath(); g.moveTo(64 + Math.cos(a * TAU / 16) * 14, 64 + Math.sin(a * TAU / 16) * 14); g.lineTo(64 + Math.cos(a * TAU / 16) * 60, 64 + Math.sin(a * TAU / 16) * 60); g.stroke(); }
    return c; };
  const dialCanvas = (kind) => {                 // a gauge face: ticks, numerals, a needle
    const c = cvs(128), g = c.getContext("2d"); g.fillStyle = "#101418"; g.fillRect(0, 0, 128, 128); g.translate(64, 64);
    g.strokeStyle = "#e8e4d8"; g.fillStyle = "#e8e4d8"; g.lineWidth = 2;
    for (let i = 0; i <= 10; i++) { const a = PI * 0.75 + i / 10 * PI * 1.5, r0 = i % 5 === 0 ? 44 : 50; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * 56, Math.sin(a) * 56); g.stroke(); }
    g.font = "bold 11px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; for (let i = 0; i <= 5; i++) { const a = PI * 0.75 + i / 5 * PI * 1.5; g.fillText(String(kind === "rpm" ? i : i * 20), Math.cos(a) * 34, Math.sin(a) * 34); }
    g.fillStyle = "#e8742a"; g.save(); g.rotate(PI * 0.75 + (kind === "rpm" ? 0.3 : 0.14) * PI * 1.5); g.beginPath(); g.moveTo(-6, -1.5); g.lineTo(46, -0.8); g.lineTo(46, 0.8); g.lineTo(-6, 1.5); g.fill(); g.restore();
    g.fillStyle = "#222"; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill(); return c; };
  const screenCanvas = () => { const c = cvs(128, 64), g = c.getContext("2d"); g.fillStyle = "#0b1118"; g.fillRect(0, 0, 128, 64);
    g.fillStyle = "#3a8fc0"; for (let i = 0; i < 18; i++) g.fillRect(8 + i * 5.4, 40 - Math.min(30, i * 1.6 + 4), 3.6, Math.min(30, i * 1.6 + 4)); g.fillStyle = "#d8e6ee"; g.font = "bold 14px sans-serif"; g.fillText("0", 10, 14); g.fillStyle = "#e8742a"; g.fillRect(8, 50, 40, 4); return c; };
  const holesCanvas = () => {                    // punched traction holes in sheet aluminium: alpha 0 in the holes
    const c = cvs(128), g = c.getContext("2d"); g.fillStyle = "#c9d0d7"; g.fillRect(0, 0, 128, 128); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000";
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.ellipse(16 + x * 32 + (y & 1) * 16, 16 + y * 32, 9, 5.5, 0, 0, TAU); g.fill(); } return c; };
  const beltCanvas = () => {                     // inside and outside of the belt: drive windows, reinforcement ribs, wear
    const c = cvs(64, 128), g = c.getContext("2d"); g.fillStyle = "#2a2e33"; g.fillRect(0, 0, 64, 128);
    g.fillStyle = "#34393f"; for (let i = 0; i < 4; i++) g.fillRect(0, i * 32 + 4, 64, 3);
    g.fillStyle = "#14171a"; for (const x of [10, 54]) g.fillRect(x - 4, 0, 8, 128);                 // the guide-clip rows
    g.fillStyle = "#0a0c0e"; for (const x of [20, 44]) for (let i = 0; i < 4; i++) g.fillRect(x - 5, i * 32 + 8, 10, 14);   // drive windows
    return c; };
  const decalCanvas = (text) => { const c = cvs(256, 64), g = c.getContext("2d"); g.clearRect(0, 0, 256, 64); g.fillStyle = "#fff"; g.font = "italic bold 34px Arial Narrow, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text.toUpperCase(), 128, 34, 240);
    g.fillRect(14, 54, 228, 3); return c; };
  S.decalCanvas = decalCanvas;
  const gradCanvas = (a, b) => { const c = cvs(8, 64), g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 8, 64); return c; };

  /* ---------------- materials ---------------- */
  S.mats = function (ctx) {
    if (S.M) return S.M; const t0 = performance.now(), ms0 = TLXL.ms, M = S.M = {}, env = ctx.env;
    const mat = (color, r, m, kind, o, extra) => { const x = new T.MeshStandardMaterial(Object.assign({ color, roughness: r, metalness: m }, extra || {})); if (kind) TLXL.dressMat(x, kind, o); if (env && m > 0.3) { x.envMap = env; x.envMapIntensity = 1.15; } return x; };
    // the livery materials keep their identity (the game recolours them); they get the clear-coat texture set
    for (const [k, m] of [["body", ctx.body], ["panel", ctx.panel], ["trim", ctx.trim]]) { m.bumpMap = null; TLXL.dressMat(m, "gloss", { size: 128, key: "paint" }); m.normalScale = new T.Vector2(0.03, 0.03); M[k] = m; }
    if (ctx.seat) { TLXL.dressMat(ctx.seat, "vinyl", { size: 128, key: "seat", base: 0.7, stamp: H => { H.seam(0.2, 0, 0.2, 1, { w: 2.4, depth: 0.9 }); H.seam(0.8, 0, 0.8, 1, { w: 2.4, depth: 0.9 }); H.seam(0.5, 0.18, 0.5, 0.92, { w: 1.6, depth: 0.5, stitch: 3 }); } }); ctx.seat.envMap = env; ctx.seat.envMapIntensity = 0.35; M.seat = ctx.seat; }
    M.alu = mat(0x8f98a1, 0.5, 0.85, "brushed", { size: 128 }); M.alu.normalScale = new T.Vector2(0.2, 0.2); M.alu.envMapIntensity = 0.85;
    M.cast = mat(0xa3acb6, 0.62, 0.75, "cast", { size: 128 });
    M.steel = mat(0x7d8791, 0.4, 0.85, "brushed", { size: 128, key: "s" }); M.steel.normalScale = new T.Vector2(0.3, 0.3); M.steel.envMapIntensity = 0.85;
    M.chrome = mat(0xb4bcc6, 0.1, 1, "gloss", { size: 128, key: "chrome" }); M.chrome.envMapIntensity = 0.8; M.chrome.normalScale = new T.Vector2(0.2, 0.2);
    M.black = mat(0x24292f, 0.62, 0.05, "plastic", { size: 128, base: 0.7, key: "blk" });
    M.dark = mat(0x33393f, 0.55, 0.15, "plastic", { size: 128, base: 0.72, key: "dk" });
    M.rubber = mat(0x2c3238, 1, 0, "rubber", { size: 128, base: 0.68, key: "rub" });
    M.pad = mat(0x2a2f36, 0.7, 0, "vinyl", { size: 128, base: 0.7, key: "pad" });
    M.springDark = mat(0x4b525a, 0.45, 0.6, "cast", { size: 128, key: "sp" });
    const bt = mkTex(beltCanvas()); bt.repeat.set(1, 1); const tr = TLXL.fabric("tread", { size: 128 });
    M.belt = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, map: bt, normalMap: tr.normalMap, roughnessMap: tr.roughnessMap }); M.belt.userData.noShadow = true;
    M.lug = mat(0x2c3238, 1, 0, "tread", { size: 128, base: 0.7, key: "lug" }); M.lug.userData.noShadow = true;
    M.stud = mat(0xd5dde5, 0.2, 1, "cast", { size: 128, key: "stud" }); M.stud.userData.noShadow = true;
    M.glass = new T.MeshStandardMaterial({ color: 0xcfe6f4, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.26, depthWrite: false, side: T.DoubleSide, map: mkTex(gradCanvas("#9fb6c4", "#f2f8fc")), envMap: env, envMapIntensity: 1.1 });
    TLXL.dressMat(M.glass, "lens", { size: 128, key: "pc" }); M.glass.map = mkTex(gradCanvas("#9fb6c4", "#f2f8fc")); M.glass.normalScale = new T.Vector2(0.15, 0.15);
    M.tint = new T.MeshStandardMaterial({ color: 0x3a5064, roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.46, depthWrite: false, side: T.DoubleSide, envMap: env, envMapIntensity: 1.1 });
    TLXL.dressMat(M.tint, "lens", { size: 128, key: "pc" }); M.tint.map = mkTex(gradCanvas("#2e4152", "#8aa4b6")); M.tint.normalScale = new T.Vector2(0.15, 0.15);
    const lensMat = (core, mid, edge, em, key) => { const t = mkTex(lensCanvas(core, mid, edge), true, false), ln = TLXL.fabric("lens", { size: 128, key: "ln" + key }); const x = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.1, map: t, emissive: new T.Color(em), emissiveMap: t, emissiveIntensity: 1.2, normalMap: ln.normalMap, roughnessMap: ln.roughnessMap }); x.normalScale = new T.Vector2(0.1, 0.1); x.userData.lens = true; return x; };
    M.lamp = lensMat("#fffbe8", "#e9dca8", "#9a8e68", 0xfff0c8, "w"); M.led = lensMat("#f4fbff", "#c4dcec", "#788a98", 0xd8f0ff, "c"); M.tail = lensMat("#ff8f80", "#c42218", "#6a0e0a", 0xff2a1a, "r"); M.tail.emissiveIntensity = 0.9;
    M.refl = mat(0xe0e7ee, 0.14, 1, "lens", { size: 128, key: "refl" });
    M.board = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.8, map: mkTex(holesCanvas()), alphaTest: 0.5, side: T.DoubleSide, envMap: env, envMapIntensity: 1.1 }); M.board.map.repeat.set(1, 1);
    const bm = TLXL.fabric("brushed", { size: 128 }); M.board.normalMap = bm.normalMap; M.board.roughnessMap = bm.roughnessMap;
    M.dial = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0, map: mkTex(dialCanvas("spd"), true, false), envMap: env, envMapIntensity: 0.4 });
    M.dialR = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0, map: mkTex(dialCanvas("rpm"), true, false), envMap: env, envMapIntensity: 0.4 });
    M.screen = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0, map: mkTex(screenCanvas(), true, false), envMap: env, envMapIntensity: 0.5 });
    M.brass = mat(0xcaa24a, 0.3, 0.9, "cast", { size: 128, key: "cast" });
    M.leather = mat(0x5a3220, 0.7, 0, "leather", { size: 128, key: "lth" }); M.paintRed = mat(0xa3101a, 0.28, 0.2, "gloss", { size: 128, key: "pr" }); M.paintRed.envMap = env; M.paintRed.envMapIntensity = 1;
    S.ms = performance.now() - t0; S.texMs = TLXL.ms - ms0; return M;
  };

  /* ---------------- the hood and belly pan: lofted, crowned, with the nose ---------------- */
  const STYLE = {   // plan taper to the nose (1 = full width), side-wall squareness (superellipse n), nose dome length
    round: { kn: 0.72, n: 2.4, dome: 0.15 }, flat: { kn: 0.88, n: 4.2, dome: 0.08 }, wedge: { kn: 0.5, n: 4.6, dome: 0.07 },
    riderfwd: { kn: 0.54, n: 4.1, dome: 0.07 }, smooth: { kn: 0.64, n: 2.6, dome: 0.12 } };
  const crownAt = (pts, z) => { let y = pts[0][1]; for (let i = 1; i < pts.length; i++) { if (pts[i][0] < pts[i - 1][0]) break; if (pts[i][0] >= z) { const a = pts[i - 1], b = pts[i], t = (z - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * t; } y = pts[i][1]; } return y; };
  const ringPt = (sc, a, infl) => { const e = 2 / sc.n, sn = Math.sin(a), cs = Math.cos(a); return [(sc.rx + infl) * Math.sign(sn) * Math.pow(Math.abs(sn), e), sc.cy + (sc.ry + infl) * Math.sign(cs) * Math.pow(Math.abs(cs), e)]; };
  const angleAtY = (sc, y) => { if (y >= sc.cy + sc.ry) return 0; if (y <= sc.cy - sc.ry) return PI; let lo = 0, hi = PI; for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (ringPt(sc, mid, 0)[1] > y) lo = mid; else hi = mid; } return (lo + hi) / 2; };
  const angleAtX = (sc, x) => { const q = clamp(x / sc.rx, 0, 1); return Math.asin(Math.pow(q, sc.n / 2)); };
  // a patch of the lofted body: ranges(sc, i) -> [a0, a1] (a1 >= a0) or null, pushed out by infl
  const patch = (secs, ranges, infl, kt) => {
    const K = L() ? 10 : 16, rows = secs.length, cols = K + 1, pos = new Float32Array(rows * cols * 3), uv = new Float32Array(rows * cols * 2), idx = [];
    for (let i = 0; i < rows; i++) { const sc = secs[i], r = ranges(sc, i) || [0, 0], a0 = r[0], a1 = Math.max(r[0], r[1]), arc = (a1 - a0) * (sc.rx + sc.ry) * 0.5;
      for (let j = 0; j < cols; j++) { const a = a0 + (a1 - a0) * j / K, pt = ringPt(sc, a, infl), p = (i * cols + j) * 3; pos[p] = pt[0]; pos[p + 1] = pt[1]; pos[p + 2] = sc.z; uv[(i * cols + j) * 2] = (j / K * arc + sc.rx) * kt; uv[(i * cols + j) * 2 + 1] = sc.z * kt; } }
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < K; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("uv", new T.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  // a rear-facing disc closing the hood's back (the firewall)
  const disc = (sc, z, infl) => { const K = 20, pos = [sc.cx || 0, sc.cy, z], uv = [0.5, 0.5], idx = []; for (let j = 0; j <= K; j++) { const pt = ringPt(sc, -PI + TAU * j / K, infl); pos.push(pt[0], pt[1], z); uv.push(0.5 + pt[0], 0.5 + pt[1]); } for (let j = 0; j < K; j++) idx.push(0, 2 + j, 1 + j);
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute("uv", new T.BufferAttribute(new Float32Array(uv), 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };

  S.hood = function (s, H, HB, ctx) {
    const M = S.mats(ctx), st = STYLE[s.style] || STYLE.round, z0 = H.z0, z1 = H.z1, hp = H.pts, w = s.w, yB = s.yBelly, topAt = z => crownAt(hp, z) + HB;
    const nS = L() ? 14 : 24, zE = z1 - 0.1, secs = [], sec = z => { const u = (z - z0) / (z1 - z0), top = topAt(z), bot = yB + 0.05 * sstep(z1 - 0.22, z1, z), kw = 1 - (1 - st.kn) * sstep(0.22, 1, u);
      return { z, cx: 0, cy: (top + bot) / 2, ry: Math.max(0.04, (top - bot) / 2), rx: w / 2 * kw * (0.985 + 0.015 * Math.cos(u * 6)), n: st.n }; };
    for (let i = 0; i < nS; i++) secs.push(sec(z0 + (zE - z0) * i / (nS - 1)));
    const e = secs[secs.length - 1], dk = L() ? 3 : 6;                       // the nose cap: sections shrinking round the last one's centre
    for (let i = 1; i <= dk; i++) { const th = i / dk * PI / 2 * 0.93, sc = Math.pow(Math.cos(th), 0.85); secs.push({ z: zE + (st.dome + 0.02) * Math.sin(th), cx: 0, cy: e.cy - (e.ry * (1 - sc)) * 0.15, ry: Math.max(0.012, e.ry * sc), rx: Math.max(0.015, e.rx * sc), n: e.n }); }
    const pan = s.pan, items = [], decal = { stripe: [], wide: [], flash: [] };
    const bandY = (ya, yb) => (sc) => { const a = angleAtY(sc, yb), b = angleAtY(sc, ya); return [a, b]; };      // between heights, +x side (a: upper edge)
    const both = (g1, g2, m, list) => { const r = []; r.push(g1, g2); return r; };
    const side = (ya, yb, infl, m, arr) => { arr.push({ g: patch(secs, bandY(ya, yb), infl, 3), m }); arr.push({ g: patch(secs, (sc, i) => { const r = bandY(ya, yb)(sc); return [-r[1], -r[0]]; }, infl, 3), m }); };
    // hood: from the shut line over the crown and down the other side; pan: round the belly
    const aHood = sc => angleAtY(sc, pan + 0.006), aPan = sc => angleAtY(sc, pan - 0.006);
    items.push({ g: patch(secs, sc => { const a = aHood(sc); return [-a, a]; }, 0.004, 3), m: M.body });
    items.push({ g: patch(secs, sc => { const a = aPan(sc); return [a, TAU - a]; }, 0.0, 3), m: M.panel });
    items.push({ g: patch(secs, sc => { const a = aPan(sc), b = aHood(sc); return [b, a]; }, -0.006, 3), m: M.black });                // the shut line, recessed
    items.push({ g: patch(secs, sc => { const a = aPan(sc), b = aHood(sc); return [-a, -b]; }, -0.006, 3), m: M.black });
    side(pan + 0.016, pan + 0.03, 0.0055, M.trim, items);                                                                           // pinstripe over the shut line
    items.push({ g: disc(secs[0], z0 - 0.01, 0), m: M.black });                                                                      // firewall
    // livery graphics that follow the hood (toggled by SET.decal)
    const band = (xc, sw, list) => decal[list].push(patch(secs, (sc, i) => { if (i >= secs.length - dk) { const a = angleAtX(sc, Math.min(sc.rx * 0.9, xc)); return [a, a]; } const xa = Math.max(0, xc - sw / 2), xb = xc + sw / 2; if (xb > sc.rx * 0.97) { const a = angleAtX(sc, sc.rx * 0.97); return [a, a]; } return [angleAtX(sc, xa), angleAtX(sc, xb)]; }, 0.006, 3));
    for (const sx of [-1, 1]) { const g = patch(secs, (sc, i) => { const xa = 0.13 - 0.035, xb = 0.13 + 0.035; if (xb > sc.rx * 0.97) { const a = angleAtX(sc, sc.rx * 0.97); return sx > 0 ? [a, a] : [-a, -a]; } const a = angleAtX(sc, xa), b = angleAtX(sc, xb); return sx > 0 ? [a, b] : [-b, -a]; }, 0.006, 3); decal.stripe.push(g); }
    decal.wide.push(patch(secs, (sc, i) => { const xb = 0.13; if (xb > sc.rx * 0.97) { const a = angleAtX(sc, sc.rx * 0.97); return [-a, -a]; } const b = angleAtX(sc, xb); return [-b, b]; }, 0.006, 3));
    for (const sx of [-1, 1]) decal.flash.push(patch(secs, (sc) => { const r = bandY(pan + 0.07, pan + 0.17)(sc); return sx > 0 ? r : [-r[1], -r[0]]; }, 0.006, 3));
    // helpers for things that sit on the skin
    const poly = []; for (const sc of secs) poly.push([sc.z, sc.cy + sc.ry]); for (let i = secs.length - 1; i >= 0; i--) poly.push([secs[i].z, secs[i].cy - secs[i].ry]);
    const frontZ = y => { let best = -9; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if ((y - a[1]) * (y - b[1]) <= 0 && a[1] !== b[1]) best = Math.max(best, a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])); } return best; };
    const secAt = z => z <= zE ? sec(z) : secs[secs.length - 1];
    const sideX = (z, y) => { const sc = secAt(z), a = angleAtY(sc, y); return ringPt(sc, a, 0)[0]; };
    const info = { frontZ, sideX, secAt, zE, topAt };
    // ---- the nose: lamp bucket, intake, bumper brackets ----
    const yN = s.yNose, fh = yN - yB - 0.05, lampY = yB + 0.05 + fh * 0.6, grY = yB + 0.05 + fh * 0.2;
    const tilt = y => Math.atan((frontZ(y + 0.03) - frontZ(y - 0.03)) / 0.06);
    const lampAt = (x, y, build, yaw) => { const z = frontZ(y), g = build(); TLXL.xf(g.g, { rx: tilt(y), ry: yaw || 0 }); TLXL.xf(g.g, { x, y, z: z - 0.004 }); return g; };
    const face = g => TLXL.xf(g, { rx: PI / 2 });                                      // a lathe built round +y now looks along +z
    const planar = (g, r) => { const P = g.attributes.position, U = g.attributes.uv; for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i) / (2 * r) + 0.5, P.getZ(i) / (2 * r) + 0.5); return g; };
    const round = (x, y, r, m, bezelM) => {   // a round headlamp: bezel ring, reflector bowl, domed lens
      const it = [], s0 = L() ? 12 : 22;
      it.push({ m: bezelM, g: face(TLXL.lathe([[r * 1.02, -0.03], [r * 1.12, -0.02], [r * 1.14, 0.004], [r * 1.08, 0.016], [r * 1.0, 0.012], [r * 0.99, -0.03]], s0)) });
      it.push({ m: M.refl, g: face(TLXL.lathe([[0.004, -0.075], [r * 0.3, -0.07], [r * 0.58, -0.05], [r * 0.82, -0.025], [r * 0.97, 0.0], [r * 0.97, -0.03]], s0)) });
      it.push({ m: m, g: face(planar(TLXL.lathe([[0, 0.0105], [r * 0.4, 0.0098], [r * 0.75, 0.007], [r * 0.95, 0.0015], [r * 0.95, -0.004], [0, -0.004]], s0), r * 0.95)) });
      it.push({ m: M.black, g: face(TLXL.lathe([[r * 1.0, -0.2], [r * 1.0, -0.03], [0.001, -0.03]], s0)) });
      return it; };
    const rectLamp = (w2, h2, m, bz) => { const it = []; it.push({ m: bz, g: TLXL.rbox(w2 + 0.04, h2 + 0.04, 0.05, 0.016) }); it.push({ m: M.refl, g: at(TLXL.rbox(w2 + 0.005, h2 + 0.005, 0.02, 0.01), 0, 0, 0.012) }); it.push({ m: m, g: at(TLXL.rbox(w2 - 0.012, h2 - 0.012, 0.012, 0.006), 0, 0, 0.026) }); return it; };
    const place = (items2, x, y, yaw) => { const z = frontZ(y) + 0.002, tl = tilt(y); for (const it of items2) { TLXL.xf(it.g, { rx: tl, ry: yaw || 0 }); TLXL.xf(it.g, { x, y, z }); items.push(it); } };
    if (s.lamp === "round") place(round(0, lampY, 0.115, M.lamp, M.chrome), 0, lampY);
    else if (s.lamp === "rect") place(rectLamp(0.3, 0.14, M.lamp, M.chrome), 0, lampY);
    else if (s.lamp === "twin") for (const sx of [-1, 1]) place(round(0, lampY, 0.075, M.lamp, M.black), sx * 0.19, lampY, sx * 0.14);
    else if (s.lamp === "slit") for (const sx of [-1, 1]) place(rectLamp(0.2, 0.06, M.lamp, M.black), sx * 0.15, lampY + 0.01, sx * 0.3);
    else if (s.lamp === "led") { for (const sx of [-1, 1]) { place(round(0, lampY, 0.05, M.led, M.black), sx * 0.19, lampY, sx * 0.22); place(rectLamp(0.17, 0.016, M.led, M.black), sx * 0.17, lampY + 0.07, sx * 0.25); } }
    else if (s.lamp === "strip") place(rectLamp(w * 0.62, 0.028, M.led, M.black), 0, lampY + 0.03, 0);
    // intake / grille under the lamp: a dark recess with slats
    if (s.style !== "round" || s.lamp !== "round") {
      const gw = w * (s.style === "flat" ? 0.5 : 0.36), gh = Math.max(0.05, fh * 0.2), z = frontZ(grY) - 0.012, tl = tilt(grY), it = [];
      it.push({ m: M.black, g: TLXL.rbox(gw, gh, 0.04, 0.012) }); const n = 4; for (let i = 0; i < n; i++) it.push({ m: M.dark, g: at(TLXL.rbox(gw * 0.92, 0.008, 0.02, 0.003, 1), 0, -gh * 0.36 + i * gh * 0.24, 0.018) });
      for (const x of it) { TLXL.xf(x.g, { rx: tl }); TLXL.xf(x.g, { y: grY, z }); items.push(x); }
    }
    // louvres cut into the flanks: a dark recess with slats, at the back of the pan
    const lz = H.zP + 0.28, nl = s.style === "flat" || s.style === "round" ? 3 : 4;
    for (const sx of [-1, 1]) { const y0 = pan + 0.1, x = sideX(lz, y0 + 0.05) * sx; const pocket = TLXL.rbox(0.016, 0.04 + nl * 0.05, 0.2, 0.007); TLXL.xf(pocket, { x: x - sx * 0.003, y: y0 + nl * 0.025 - 0.02, z: lz }); items.push({ m: M.black, g: pocket });
      for (let i = 0; i < nl; i++) { const sl = TLXL.rbox(0.014, 0.012, 0.17, 0.004, 1); TLXL.xf(sl, { x: x + sx * 0.002, y: y0 + i * 0.05 - 0.01, z: lz, rx: 0.4 }); items.push({ m: M.dark, g: sl }); } }
    // a slotted intake on the crown of the sporting hoods: a dark recess with slats set inside it
    if (s.style === "wedge" || s.style === "riderfwd" || s.style === "smooth") { const zz = H.zP + 0.35, y0 = topAt(zz + 0.09);
      const rec = TLXL.rbox(0.23, 0.012, 0.25, 0.005, 1); TLXL.xf(rec, { x: 0.2, y: y0 - 0.002, z: zz + 0.09, rx: -0.12 }); items.push({ m: M.black, g: rec });
      for (let i = 0; i < 4; i++) { const g = TLXL.rbox(0.19 - i * 0.012, 0.006, 0.014, 0.0025, 1); TLXL.xf(g, { x: 0.2, y: topAt(zz + 0.02 + i * 0.05) + 0.004, z: zz + 0.02 + i * 0.05, rx: -0.12 }); items.push({ m: M.dark, g }); } }
    // hood latches (a draw latch each side at the shut line) and the badge
    for (const sx of [-1, 1]) { const z = z0 + 0.5 * (z1 - z0), x = sideX(z, pan + 0.012) * sx;
      const base = TLXL.rbox(0.014, 0.05, 0.075, 0.005, 1); TLXL.xf(base, { x: x + sx * 0.005, y: pan + 0.012, z }); items.push({ m: M.cast, g: base });
      const lev = TLXL.rbox(0.012, 0.03, 0.05, 0.005, 1); TLXL.xf(lev, { x: x + sx * 0.014, y: pan + 0.03, z, rx: 0.2 }); items.push({ m: M.black, g: lev });
      items.push({ m: M.steel, g: S.bolt([x + sx * 0.012, pan - 0.01, z - 0.025], [sx, 0, 0], 0.007) }); items.push({ m: M.steel, g: S.bolt([x + sx * 0.012, pan - 0.01, z + 0.025], [sx, 0, 0], 0.007) }); }
    { const zb = z1 - 0.2, yb = topAt(zb) - 0.004; const g = TLXL.rbox(0.13, 0.01, 0.045, 0.004, 1); TLXL.xf(g, { y: yb, z: zb, rx: Math.atan2(topAt(zb - 0.02) - topAt(zb + 0.02), 0.04) * -1 }); items.push({ m: M.chrome, g }); }
    // nose bumper and its brackets
    const zN = frontZ(yB + 0.12) + 0.01, yBB = yB - HB;
    const brk = (x, y, z) => { items.push({ m: M.cast, g: at(TLXL.rbox(0.04, 0.05, 0.03, 0.01), x, y, z) }); items.push({ m: M.steel, g: S.bolt([x, y, z + 0.015], [0, 0, 1], 0.009) }); };
    if (s.bumper === "hoop") {
      items.push({ m: M.chrome, g: tb([[-w * 0.47, yBB + 0.11, zN - 0.5], [-w * 0.45, yBB + 0.14, zN - 0.1], [-w * 0.3, yBB + 0.165, zN + 0.07], [0, yBB + 0.17, zN + 0.1], [w * 0.3, yBB + 0.165, zN + 0.07], [w * 0.45, yBB + 0.14, zN - 0.1], [w * 0.47, yBB + 0.11, zN - 0.5]], 0.021, 9) });
      for (const sx of [-1, 1]) { items.push({ m: M.chrome, g: S.rod([sx * (w / 2 - 0.12), yBB + 0.04, zN - 0.26], [sx * (w * 0.45), yBB + 0.14, zN - 0.1], 0.018) }); brk(sx * (w / 2 - 0.12), yBB + 0.04, zN - 0.27); }
    } else if (s.bumper === "bar") {
      items.push({ m: M.black, g: tb([[-w * 0.44, yBB + 0.07, zN - 0.08], [-w * 0.36, yBB + 0.07, zN + 0.05], [w * 0.36, yBB + 0.07, zN + 0.05], [w * 0.44, yBB + 0.07, zN - 0.08]], 0.032, 8) });
      for (const sx of [-1, 1]) { items.push({ m: M.black, g: S.rod([sx * w * 0.4, yBB + 0.07, zN - 0.2], [sx * w * 0.4, yBB + 0.07, zN + 0.03], 0.026) }); brk(sx * w * 0.4, yBB + 0.07, zN - 0.2); }
    } else if (s.bumper === "skid") {
      items.push({ m: M.steel, g: tb([[-w * 0.36, yBB + 0.02, zN - 0.24], [-w * 0.3, yBB + 0.03, zN + 0.04], [0, yBB + 0.035, zN + 0.1], [w * 0.3, yBB + 0.03, zN + 0.04], [w * 0.36, yBB + 0.02, zN - 0.24]], 0.024, 8) });
    }
    // the nose wear strip under the belly: a dark skid plate
    items.push({ m: M.dark, g: S.plate(w * 0.5, 0.015, 0.4, 0.006, 3).translate(0, yB - 0.012, z1 - 0.3) });
    info.zN = zN; info.lampY = lampY;
    return { items, decal, info, secs };
  };

  /* ---------------- tunnel, boards, tail ---------------- */
  S.chassis = function (s, ctx, ud) {
    const M = S.mats(ctx), tw = ud.tw, tl = ud.tl, zB = ud.zBack, bx = ud.boardX, zc = 0.4 - tl / 2, items = [], decal = { flash: [] }, rail = s.chrome ? M.chrome : M.black;
    const tun = TLXL.loft([{ y: zB, rx: tw / 2, rz: 0.105, cz: 0.465, n: 7 }, { y: 0.4, rx: tw / 2, rz: 0.105, cz: 0.465, n: 7 }], { axis: "z", seg: L() ? 12 : 20, cap: true, uv: [0, 0, Math.max(1, tw * 2.5), Math.max(1, tl * 2.5)] });
    items.push({ m: M.alu, g: tun });
    items.push({ m: M.panel, g: S.plate(tw + 0.06, 0.03, tl + 0.05, 0.012, 4).translate(0, 0.575, zc) });                      // the deck, in the panel colour
    for (let z = zB + 0.1; z < 0.35; z += 0.14) for (const sx of [-1, 1]) items.push({ m: M.steel, g: S.bolt([sx * tw / 2, 0.435, z], [sx, 0, 0], 0.0075) });      // rivet line down each flank
    if (s.tailRound) items.push({ m: M.alu, g: at(new T.CylinderGeometry(0.11, 0.11, tw, L() ? 12 : 18), 0, 0.46, zB + 0.02, 0, 0, PI / 2) });
    else { items.push({ m: M.alu, g: S.plate(tw, 0.08, 0.16, 0.014).translate(0, 0.52, zB - 0.06) }); items.push({ m: M.dark, g: at(S.plate(tw, 0.04, 0.3, 0.012), 0, 0.36, zB - 0.08, 0.35) }); }
    // snow flap: a rubber flap hanging off the tail on a steel strip
    items.push({ m: M.rubber, g: at(S.plate(tw * 0.78, 0.01, 0.26, 0.004, 3), 0, 0.36, zB - 0.2, -0.5) });
    items.push({ m: M.trim, g: at(S.plate(tw * 0.5, 0.012, 0.035, 0.004, 3), 0, 0.357, zB - 0.215, -0.5) });
    items.push({ m: M.steel, g: S.plate(tw * 0.8, 0.02, 0.03, 0.006, 4).translate(0, 0.45, zB - 0.075) });
    for (let i = 0; i < 4; i++) items.push({ m: M.steel, g: S.bolt([(i - 1.5) * tw * 0.2, 0.461, zB - 0.075], [0, 1, 0], 0.008) });
    // tail lamp: housing and a red lens facing back
    items.push({ m: M.black, g: at(S.plate(0.17, 0.065, 0.055, 0.02), 0, 0.545, zB - 0.17) });
    items.push({ m: M.tail, g: at(TLXL.rbox(0.14, 0.04, 0.012, 0.012, 1), 0, 0.545, zB - 0.2, 0, PI) });
    // rear bumper / grab bar on brackets
    items.push({ m: rail, g: tb([[-tw / 2 - 0.02, 0.42, zB + 0.1], [-tw / 2 - 0.03, 0.42, zB - 0.12], [-tw / 2 - 0.0, 0.42, zB - 0.17], [tw / 2 + 0.0, 0.42, zB - 0.17], [tw / 2 + 0.03, 0.42, zB - 0.12], [tw / 2 + 0.02, 0.42, zB + 0.1]], 0.02, 8) });
    for (const sx of [-1, 1]) { items.push({ m: M.cast, g: at(S.plate(0.03, 0.06, 0.05, 0.01), sx * (tw / 2 + 0.01), 0.42, zB + 0.08) }); items.push({ m: M.steel, g: S.bolt([sx * (tw / 2 + 0.026), 0.42, zB + 0.08], [sx, 0, 0], 0.009) }); }
    // running boards: punched sheet with a serrated outer rail and gussets
    const bl = tl * 0.72, bz = 0.2 - tl * 0.4;
    for (const sx of [-1, 1]) {
      items.push({ m: M.board, g: S.plate(0.24, 0.03, bl, 0.008, 4).translate(sx * bx, 0.36, bz) });
      items.push({ m: M.alu, g: S.plate(0.03, 0.055, bl, 0.01, 4).translate(sx * (bx + 0.12), 0.375, bz) });
      for (let z = bz - bl / 2 + 0.03; z < bz + bl / 2 - 0.02; z += 0.055) items.push({ m: M.steel, g: new T.BoxGeometry(0.012, 0.016, 0.026).translate(sx * (bx + 0.12), 0.41, z) });
      for (let i = 0; i < 4; i++) { const z = bz - bl / 2 + 0.1 + i * (bl - 0.2) / 3; items.push({ m: M.cast, g: at(S.plate(0.016, 0.1, 0.05, 0.006), sx * (tw / 2 + 0.035), 0.405, z, 0, 0, sx * 0.55) }); }
    }
    if (s.raceStripe) for (const sx of [-1, 1]) for (const [y, hh] of [[0.425, 0.04], [0.52, 0.025]]) items.push({ m: M.trim, g: S.plate(0.006, hh, tl * 0.5, 0.002, 3).translate(sx * (tw / 2 + 0.003), y, 0.2 - tl * 0.4) });
    for (const sx of [-1, 1]) decal.flash.push(S.plate(0.008, 0.06, tl * 0.6, 0.002, 3).translate(sx * (tw / 2 + 0.005), 0.49, 0.2 - tl * 0.4));
    // 1970s bogies: wheel pairs on cross axles under an unsprung belt
    if (s.bogies) for (let i = 0; i < 4; i++) { const z = -1.3 + i * 0.4;
      for (const sx of [-1, 1]) { items.push({ m: M.rubber, g: at(TLXL.lathe([[0.11, -0.027], [0.116, -0.016], [0.116, 0.016], [0.11, 0.027], [0.06, 0.027], [0.06, -0.027]], L() ? 12 : 18), sx * 0.31, 0.16, z, 0, 0, PI / 2) }); items.push({ m: M.cast, g: at(new T.CylinderGeometry(0.052, 0.052, 0.062, 10), sx * 0.31, 0.16, z, 0, 0, PI / 2) }); items.push({ m: M.steel, g: S.bolt([sx * 0.345, 0.16, z], [sx, 0, 0], 0.012) }); }
      items.push({ m: M.steel, g: S.rod([-0.33, 0.16, z], [0.33, 0.16, z], 0.011) }); items.push({ m: M.cast, g: at(S.plate(0.66, 0.03, 0.045, 0.01), 0, 0.3, z) }); }
    // tail rack: a tube frame
    if (s.rack) { const rz = zB + 0.5, rw = tw + 0.24, y = 0.72;
      for (const sx of [-1, 1]) { items.push({ m: M.dark, g: S.rod([sx * rw / 2, y, rz - 0.45], [sx * rw / 2, y, rz + 0.45], 0.016) }); for (const dz of [-0.4, 0, 0.4]) items.push({ m: M.dark, g: S.rod([sx * rw / 2, y, rz + dz], [sx * rw / 2, 0.58, rz + dz], 0.014) }); items.push({ m: M.dark, g: S.rod([sx * rw / 2, 0.6, rz - 0.4], [sx * rw / 2, 0.6, rz + 0.4], 0.012) }); }
      for (let i = 0; i < 5; i++) items.push({ m: M.dark, g: S.rod([-rw / 2, y + 0.002, rz - 0.4 + i * 0.2], [rw / 2, y + 0.002, rz - 0.4 + i * 0.2], 0.012) });
      for (const sx of [-1, 1]) for (const dz of [-0.4, 0.4]) items.push({ m: M.steel, g: S.bolt([sx * rw / 2, 0.58, rz + dz], [0, -1, 0], 0.01) }); }
    if (s.spoiler) { items.push({ m: M.panel, g: at(S.plate(tw + 0.1, 0.035, 0.2, 0.014), 0, 0.8, zB + 0.12, -0.25) }); for (const sx of [-1, 1]) items.push({ m: M.dark, g: S.rod([sx * (tw / 2 - 0.02), 0.58, zB + 0.12], [sx * (tw / 2 - 0.02), 0.79, zB + 0.1], 0.02) }); }
    if (s.charge) { const z = ud.chargeZ, y = s.pan + 0.12; items.push({ m: M.dark, g: S.plate(0.016, 0.1, 0.14, 0.012).translate(-ud.hoodW / 2 - 0.0, y, z) }); items.push({ m: M.rubber, g: TLXL.xf(TLXL.lathe([[0.034, 0], [0.04, 0.006], [0.04, 0.012], [0.03, 0.012], [0.03, 0]], 16), { rz: PI / 2, x: -ud.hoodW / 2 - 0.008, y, z }) }); items.push({ m: M.black, g: TLXL.xf(TLXL.lathe([[0.026, 0], [0.026, 0.01]], 12), { rz: PI / 2, x: -ud.hoodW / 2 - 0.004, y, z }) }); }
    if (s.exhaust) { const x = s.exhaust * (tw / 2 + 0.05), z = zB + 0.3; items.push({ m: M.steel, g: TLXL.xf(TLXL.lathe([[0.02, -0.15], [0.045, -0.13], [0.06, -0.07], [0.062, 0.08], [0.045, 0.14], [0.028, 0.17], [0.026, 0.2]], L() ? 10 : 16), { rx: PI / 2, x, y: 0.46, z }) }); items.push({ m: M.cast, g: TLXL.xf(TLXL.lathe([[0.066, -0.01], [0.066, 0.01]], 12), { rx: PI / 2, x, y: 0.46, z: z - 0.03 }) }); items.push({ m: M.cast, g: TLXL.xf(TLXL.lathe([[0.066, -0.01], [0.066, 0.01]], 12), { rx: PI / 2, x, y: 0.46, z: z + 0.07 }) }); }
    return { items, decal };
  };

  /* ---------------- the seat ---------------- */
  const topOf = (poly, z) => { let y = -1; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if (a[0] !== b[0] && (z - a[0]) * (z - b[0]) <= 0) y = Math.max(y, a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0])); } return y; };
  S.seat = function (poly, zr, w, kind, ctx) {
    const M = S.mats(ctx), items = [], zA = zr - 0.04, zF = 0.09, n = L() ? 14 : 26, secs = [];
    for (let i = 0; i < n; i++) { const z = zA + (zF - zA) * i / (n - 1), top = Math.max(0.64, topOf(poly, clamp(z, zr, 0.05))) + 0.05, bot = 0.59, f = kind === "bench" || kind === "twoup" ? 1 : 0.72 + 0.28 * sstep(zr + 0.9, -0.3, z) * (1 - sstep(-0.1, 0.09, z) * 0.3);
      secs.push({ y: z, rx: w / 2 * f, rz: Math.max(0.03, (top - bot) / 2), cx: 0, cz: (top + bot) / 2, n: 3.4 }); }
    items.push({ m: M.seat, g: TLXL.loft(secs, { axis: "z", seg: L() ? 12 : 22, roundTop: 0.04, roundBottom: 0.03, uv: [0, 0, 1, 1] }) });
    // piping along both top edges
    for (const sx of [-1, 1]) { const pts = []; for (let i = 2; i < n - 2; i += 3) { const sc = secs[i], a = 1.1, e = 2 / sc.n; pts.push([sx * (sc.rx * Math.pow(Math.sin(a), e) + 0.004), sc.cz + sc.rz * Math.pow(Math.cos(a), e) + 0.003, sc.y]); } items.push({ m: M.trim, g: tb(pts, 0.0065, 5) }); }
    items.push({ m: M.rubber, g: tb([[-0.14, 0.77, zr + 0.04], [-0.14, 0.81, zr - 0.05], [0.14, 0.81, zr - 0.05], [0.14, 0.77, zr + 0.04]], 0.016, 6) });
    for (const sx of [-1, 1]) items.push({ m: M.steel, g: S.bolt([sx * 0.14, 0.775, zr + 0.04], [0, 1, 0], 0.012) });
    if (kind === "twoup") for (const sx of [-1, 1]) { items.push({ m: M.chrome, g: tb([[sx * (w / 2 + 0.02), 0.82, -0.9], [sx * (w / 2 + 0.06), 0.88, -1.0], [sx * (w / 2 + 0.06), 0.88, zr + 0.4], [sx * (w / 2 + 0.02), 0.82, zr + 0.5]], 0.016, 7) }); for (const z of [-0.92, zr + 0.45]) items.push({ m: M.cast, g: at(S.plate(0.03, 0.05, 0.04, 0.01), sx * (w / 2 + 0.02), 0.8, z) }); }
    return items;
  };

  /* ---------------- skis and spindles ---------------- */
  const SKI = { steel: { z0: -0.62, zk: 0.46, R: 0.32, ph: 1.15, w: 0.07, t: 0.014 }, plastic: { z0: -0.6, zk: 0.44, R: 0.34, ph: 1.2, w: 0.085, t: 0.017 }, powder: { z0: -0.66, zk: 0.44, R: 0.4, ph: 1.1, w: 0.14, t: 0.015 } };
  const skiPath = k => { const p = [], d = SKI[k], nf = 10, nc = 9; for (let i = 0; i <= nf; i++) p.push([lerp(d.z0, d.zk, i / nf), d.t]); for (let i = 1; i <= nc; i++) { const f = i / nc * d.ph; p.push([d.zk + d.R * Math.sin(f), d.t + d.R * (1 - Math.cos(f))]); } return p; };
  S.ski = function (kind, s, ctx) {
    const M = S.mats(ctx), d = SKI[kind], items = [], path = skiPath(kind), m = path.length, mat = kind === "steel" ? M.alu : kind === "powder" ? M.panel : M.black;
    const pf = u => Math.min(1, u / 0.035, (1 - u) / 0.05);
    const wF = u => d.w * (0.84 + 0.16 * sstep(0, 0.14, u)) * (1 - 0.42 * sstep(0.8, 1, u)) * Math.sqrt(Math.max(0.02, pf(u))), tF = u => d.t * (1 + 0.45 * sstep(0.4, 0.5, u) * (1 - sstep(0.5, 0.7, u))) * Math.max(0.1, pf(u));
    items.push({ m: mat, g: S.sweep(path, wF, tF, { n: kind === "powder" ? 3 : 4, len: 3 }) });
    items.push({ m: M.steel, g: S.sweep(path.slice(0, m - 4), u => 0.011 * Math.min(1, u * 20), u => 0.011, { off: -d.t - 0.008, n: 2.4 }) });     // keel
    items.push({ m: mat === M.black ? M.dark : mat, g: S.sweep(path.slice(2, m - 3), u => 0.018, u => 0.008, { off: d.t + 0.004, n: 3 }) });     // top spine
    if (kind !== "steel") for (const sx of [-1, 1]) items.push({ m: M.dark, g: S.sweep(path.slice(3, m - 5), u => 0.008, u => 0.005, { off: d.t + 0.002, cx: sx * d.w * 0.5, n: 3 }) });
    const tip = path[m - 1]; items.push({ m: M.black, g: tb([[-0.04, tip[1] - 0.01, tip[0] - 0.09], [-0.04, tip[1] + 0.065, tip[0] - 0.05], [0.04, tip[1] + 0.065, tip[0] - 0.05], [0.04, tip[1] - 0.01, tip[0] - 0.09]], 0.009, 6) });
    items.push({ m: M.cast, g: at(S.plate(0.11, 0.05, 0.2, 0.012), 0, 0.06, 0.02) });                                 // saddle casting
    for (const sx of [-1, 1]) for (const dz of [-0.07, 0.11]) items.push({ m: M.steel, g: S.bolt([sx * 0.035, 0.086, 0.02 + dz * 0.6], [0, 1, 0], 0.011) });
    // spindle: era by era
    if (s.susp === "leaf") {
      for (let i = 0; i < 4; i++) { const hl = 0.3 - 0.055 * i, lp = []; for (let k = 0; k <= 8; k++) { const z = lerp(-hl, hl, k / 8); lp.push([z + 0.02, 0.135 + i * 0.012 + 0.045 * (1 - Math.pow(z / hl, 2)) * (1 - 0.1 * i)]); }
        items.push({ m: M.springDark, g: S.sweep(lp, u => 0.026, u => 0.0052, { n: 4 }) }); }
      items.push({ m: M.cast, g: at(S.plate(0.07, 0.035, 0.05, 0.01), 0, 0.2, 0.02) });
      for (const sx of [-1, 1]) items.push({ m: M.steel, g: S.rod([sx * 0.03, 0.12, 0.0], [sx * 0.03, 0.222, 0.0], 0.006) }), items.push({ m: M.steel, g: S.rod([sx * 0.03, 0.12, 0.04], [sx * 0.03, 0.222, 0.04], 0.006) });
      items.push({ m: M.steel, g: S.rod([0, 0.07, 0.02], [0, 0.64, 0.02], 0.0155) });
      items.push({ m: M.cast, g: TLXL.xf(TLXL.lathe([[0.032, 0.07], [0.034, 0.1], [0.026, 0.13], [0.02, 0.15]], 10), { z: 0.02 }) });
      items.push({ m: M.rubber, g: TLXL.xf(TLXL.lathe([[0.022, 0.44], [0.034, 0.46], [0.022, 0.48], [0.034, 0.5], [0.022, 0.52], [0.034, 0.54], [0.02, 0.56]], 10), { z: 0.02 }) });
      items.push({ m: M.cast, g: at(S.plate(0.06, 0.05, 0.12, 0.012), 0, 0.62, 0.02) });
      items.push({ m: M.steel, g: S.bolt([0, 0.648, 0.02], [0, 1, 0], 0.012) });
    } else {
      items.push({ m: M.steel, g: S.rod([0, 0.08, 0.02], [0, 0.31, 0.02], 0.0175) });
      items.push({ m: M.cast, g: TLXL.xf(TLXL.lathe([[0.034, 0.07], [0.036, 0.1], [0.03, 0.14], [0.022, 0.17]], 10), { z: 0.02 }) });
      items.push({ m: M.cast, g: TLXL.xf(TLXL.ell(0.03, 0.026, 0.03), { y: 0.3, z: 0.02 }) });
      items.push({ m: M.steel, g: S.rod([0, 0.24, 0.02], [0.0, 0.24, -0.1], 0.007) });                                 // the steering arm
    }
    return items;
  };

  /* ---------------- front suspension in sled space ---------------- */
  S.front = function (s, ctx, yPeak) {
    const M = S.mats(ctx), it = [];
    for (const sx of [-1, 1]) {
      if (s.susp === "aarm") {
        const U0 = [sx * 0.2, 0.56, 0.9], U1 = [sx * 0.48, 0.42, 0.94], L0 = [sx * 0.2, 0.36, 0.84], L1 = [sx * 0.2, 0.36, 1.0], L2 = [sx * 0.48, 0.24, 0.94];
        for (const [a, b, r] of [[U0, U1, 0.0165], [L0, L2, 0.0165], [L1, L2, 0.015]]) { it.push({ m: M.dark, g: S.rod(a, b, r) }); it.push({ m: M.cast, g: TLXL.xf(TLXL.ell(r * 1.25, r * 1.25, r * 1.25), { x: a[0], y: a[1], z: a[2] }) }); it.push({ m: M.cast, g: TLXL.xf(TLXL.ell(r * 1.4, r * 1.4, r * 1.4), { x: b[0], y: b[1], z: b[2] }) }); }
        const lo = [sx * 0.46, 0.3, 0.94], hi = [sx * 0.24, yPeak - 0.12, 0.8], v = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], P = f => [lo[0] + v[0] * f, lo[1] + v[1] * f, lo[2] + v[2] * f];
        it.push({ m: M.chrome, g: S.rod(P(0.1), P(0.62), 0.018) }); it.push({ m: M.alu, g: S.rod(P(0.5), P(1), 0.026) }); it.push({ m: M.cast, g: TLXL.xf(TLXL.ell(0.03, 0.03, 0.03), { x: lo[0], y: lo[1], z: lo[2] }) }); it.push({ m: M.cast, g: TLXL.xf(TLXL.ell(0.03, 0.03, 0.03), { x: hi[0], y: hi[1], z: hi[2] }) });
        it.push({ m: s.style === "wedge" ? M.springY : s.style === "riderfwd" ? M.springR : s.style === "smooth" ? M.springB : M.springR, g: S.spring(P(0.18), P(0.84), 0.046, 8, 0.0085) });
      } else {
        const a = [sx * 0.18, 0.4, 0.5], b = [sx * 0.5, 0.68, 0.94];
        it.push({ m: M.dark, g: S.rod(a, b, 0.017) }); it.push({ m: M.cast, g: at(S.plate(0.05, 0.05, 0.05, 0.012), a[0], a[1], a[2]) }); it.push({ m: M.cast, g: TLXL.xf(TLXL.ell(0.03, 0.03, 0.03), { x: b[0], y: b[1], z: b[2] }) });
        it.push({ m: M.steel, g: S.bolt([a[0], a[1], a[2] - 0.026], [0, 0, -1], 0.012) });
      }
    }
    return it;
  };

  /* ---------------- the belt: lugs ride a path in the vertex shader, so the track animation moves real geometry ---------------- */
  const TR = { R: 0.17, Ls: 1.8, zf: 0.34, zr: -1.46, yc: 0.19, w: 0.26 }; TR.arc = PI * TR.R; TR.len = 2 * TR.Ls + 2 * TR.arc;
  S.beltU = { value: 0 };
  const GLSL = `
    uniform float uOff; attribute vec3 aPath;
    void tpath(float s, out vec2 p, out vec2 n, out vec2 t) {
      float R = ${TR.R.toFixed(4)}, LS = ${TR.Ls.toFixed(4)}, ARC = ${TR.arc.toFixed(5)}, ZF = ${TR.zf.toFixed(4)}, ZR = ${TR.zr.toFixed(4)}, YC = ${TR.yc.toFixed(4)}, LT = ${TR.len.toFixed(5)};
      s = mod(s, LT);
      if (s < LS) { p = vec2(ZF - s, YC - R); n = vec2(0.0, -1.0); t = vec2(-1.0, 0.0); }
      else if (s < LS + ARC) { float f = (s - LS) / R; vec2 d = vec2(-sin(f), -cos(f)); p = vec2(ZR, YC) + R * d; n = d; t = vec2(-cos(f), sin(f)); }
      else if (s < 2.0 * LS + ARC) { p = vec2(ZR + (s - LS - ARC), YC + R); n = vec2(0.0, 1.0); t = vec2(1.0, 0.0); }
      else { float f = (s - 2.0 * LS - ARC) / R; vec2 d = vec2(sin(f), cos(f)); p = vec2(ZF, YC) + R * d; n = d; t = vec2(cos(f), -sin(f)); }
    }`;
  const pathify = m => {
    m.onBeforeCompile = sh => {
      sh.uniforms.uOff = S.beltU;
      sh.vertexShader = sh.vertexShader.replace("void main() {", GLSL + "\nvoid main() {")
        .replace("#include <beginnormal_vertex>", "vec2 _pp, _pn, _pt; tpath(aPath.x + uOff, _pp, _pn, _pt);\nvec3 objectNormal = vec3(normal.x, _pn.y * normal.y + _pt.y * normal.z, _pn.x * normal.y + _pt.x * normal.z);")
        .replace("#include <begin_vertex>", "vec3 transformed = vec3(aPath.z, _pp.y + _pn.y * aPath.y, _pp.x + _pn.x * aPath.y);");
    };
    m.customProgramCacheKey = () => "tlxtrack"; return m; };
  // geometry in path space: a box from s0..s1, h0..h1 (h out of the belt), x0..x1; shear slants it along s with x
  const pathBox = (s0, s1, h0, h1, x0, x1, shear, topK) => {
    const tk = topK === undefined ? 1 : topK, ms = (s0 + s1) / 2, hs = (s1 - s0) / 2, pos = [], nor = [], uv = [], idx = [], P = (h, x, k) => [ms + (x * (shear || 0)) + (k) * hs, h, x];
    const quad = (a, b, c, d, n) => { const i = pos.length / 3; for (const v of [a, b, c, d]) { pos.push(...[v[0], v[1], v[2]]); nor.push(...n); uv.push(v[2] * 8, v[0] * 8); } idx.push(i, i + 2, i + 1, i, i + 3, i + 2); };
    const A = [P(h0, x0, -1), P(h0, x1, -1), P(h0, x1, 1), P(h0, x0, 1)], B = [P(h1, x0, -tk), P(h1, x1, -tk), P(h1, x1, tk), P(h1, x0, tk)];
    quad(B[0], B[3], B[2], B[1], [0, 1, 0]); quad(A[0], A[1], A[2], A[3], [0, -1, 0]);
    quad(A[1], B[1], B[2], A[2], [1, 0, 0]); quad(A[3], B[3], B[0], A[0], [-1, 0, 0]);
    quad(A[2], B[2], B[3], A[3], [0, 0, 1]); quad(A[0], B[0], B[1], A[1], [0, 0, -1]);
    return { pos, nor, uv, idx }; };
  const pathGeo = parts => { let pos = [], nor = [], uv = [], idx = []; for (const p of parts) { const o = pos.length / 3; pos = pos.concat(p.pos); nor = nor.concat(p.nor); uv = uv.concat(p.uv); for (const i of p.idx) idx.push(i + o); }
    const g = new T.BufferGeometry(), aP = new Float32Array(pos); const lat = new Float32Array(pos.length); for (let i = 0; i < pos.length / 3; i++) { lat[i * 3] = pos[i * 3 + 2]; }   // position.x = lateral (for the bounding box)
    g.setAttribute("position", new T.BufferAttribute(lat, 3)); g.setAttribute("aPath", new T.BufferAttribute(aP, 3)); g.setAttribute("normal", new T.BufferAttribute(new Float32Array(nor), 3)); g.setAttribute("uv", new T.BufferAttribute(new Float32Array(uv), 2)); g.setIndex(idx); return g; };
  S.track = function (ctx) {
    const M = S.mats(ctx); pathify(M.belt); pathify(M.lug); pathify(M.stud);
    const res = { beltGeo: null, lugs: {}, items: {}, wheelA: [], wheelB: [], rig: [], rear: [] };
    // the belt body: a rectangular ring along the path
    const N = L() ? 100 : 190, parts = [], W = TR.w, th = 0.02;
    for (let i = 0; i < N; i++) { const s0 = TR.len * i / N, s1 = TR.len * (i + 1) / N, sp = { pos: [], nor: [], uv: [], idx: [] }, f0 = i / N * 47, f1 = (i + 1) / N * 47;
      const face = (a, b, c, d, n, ua, ub) => { const k = sp.pos.length / 3; for (const [v, u, vv] of [[a, ua, f0], [b, ub, f0], [c, ub, f1], [d, ua, f1]]) { sp.pos.push(v[0], v[1], v[2]); sp.nor.push(...n); sp.uv.push(u, vv); } sp.idx.push(k, k + 2, k + 1, k, k + 3, k + 2); };
      const O = (s, x) => [s, 0, x], I = (s, x) => [s, -th, x];
      face(O(s0, -W), O(s0, W), O(s1, W), O(s1, -W), [0, 1, 0], 0, 1); face(I(s0, W), I(s0, -W), I(s1, -W), I(s1, W), [0, -1, 0], 1, 0);
      face(O(s0, W), I(s0, W), I(s1, W), O(s1, W), [1, 0, 0], 0, 0.05); face(I(s0, -W), O(s0, -W), O(s1, -W), I(s1, -W), [-1, 0, 0], 0, 0.05);
      parts.push(sp); }
    res.beltGeo = pathGeo(parts);
    const lugRow = (pitch, sw, h, x0, x1, shear, topK, off) => { const out = [], n = Math.round(TR.len / pitch), p = TR.len / n; for (let i = 0; i < n; i++) { const c = (i + (off || 0)) * p; out.push(pathBox(c - sw / 2, c + sw / 2, 0, h, x0, x1, shear, topK)); } return out; };
    const xs = 0.245;
    res.lugs.stock = pathGeo([].concat(lugRow(0.1, 0.03, 0.026, -xs, -0.03, 0, 0.7, 0), lugRow(0.1, 0.03, 0.026, 0.03, xs, 0, 0.7, 0.5)));            // staggered bars, a gap down the middle
    res.lugs.hard = pathGeo([].concat(lugRow(0.1, 0.026, 0.022, -xs, -0.01, 0.9, 0.8, 0), lugRow(0.1, 0.026, 0.022, 0.01, xs, -0.9, 0.8, 0)));        // chevrons
    res.lugs.paddle = pathGeo(lugRow(0.1, 0.034, 0.062, -xs, xs, 0, 0.55, 0));                                                                        // tall paddles
    const studs = []; { const n = Math.round(TR.len / 0.2), p = TR.len / n; for (let i = 0; i < n; i++) for (const x of [-0.13, 0.13]) studs.push(pathBox(i * p - 0.005, i * p + 0.005, 0.022, 0.032, x - 0.006, x + 0.006, 0, 1)); }
    res.lugs.stud = pathGeo(studs);
    // wheels: rear idler pair and the drive sprocket (both rotate round x in the game's animation)
    const tyre = (r, w, rg) => TLXL.lathe([[r, -w / 2], [r + 0.004, -w / 2 + 0.004], [r + 0.004, w / 2 - 0.004], [r, w / 2], [rg, w / 2], [rg, -w / 2]], L() ? 14 : 22);
    for (const sx of [-1, 1]) { res.wheelA.push({ m: M.rubber, g: TLXL.xf(tyre(0.15, 0.065, 0.06), { x: sx * 0.2, rz: PI / 2 }) }); res.wheelA.push({ m: M.cast, g: TLXL.xf(new T.CylinderGeometry(0.058, 0.058, 0.07, 10), { x: sx * 0.2, rz: PI / 2 }) }); res.wheelA.push({ m: M.steel, g: S.bolt([sx * 0.238, 0, 0], [sx, 0, 0], 0.014) }); }
    res.wheelA.push({ m: M.steel, g: S.rod([-0.24, 0, 0], [0.24, 0, 0], 0.014) });
    for (const sx of [-1, 1]) { res.wheelB.push({ m: M.cast, g: TLXL.xf(TLXL.lathe([[0.138, -0.012], [0.138, 0.012], [0.05, 0.012], [0.05, -0.012]], 18), { x: sx * 0.1, rz: PI / 2 }) });
      for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; res.wheelB.push({ m: M.cast, g: TLXL.xf(new T.BoxGeometry(0.022, 0.03, 0.034), { x: sx * 0.1, y: Math.cos(a) * 0.15, z: Math.sin(a) * 0.15, rx: -a }) }); }
      res.wheelB.push({ m: M.steel, g: S.bolt([sx * 0.114, 0, 0], [sx, 0, 0], 0.016) }); }
    res.wheelB.push({ m: M.steel, g: S.rod([-0.24, 0, 0], [0.24, 0, 0], 0.016) });
    // skid frame: slide rails with rubber slides, idler wheels, rear arm and a coil-over
    for (const sx of [-1, 1]) {
      res.rig.push({ m: M.steel, g: S.plate(0.04, 0.045, 1.5, 0.012).translate(sx * 0.18, 0.075, -0.6) });
      res.rig.push({ m: M.black, g: S.plate(0.032, 0.012, 1.46, 0.004).translate(sx * 0.18, 0.047, -0.6) });
      for (const z of [-1.2, -0.55, 0.0]) { res.rig.push({ m: M.rubber, g: TLXL.xf(TLXL.lathe([[0.055, -0.016], [0.057, -0.01], [0.057, 0.01], [0.055, 0.016], [0.03, 0.016], [0.03, -0.016]], 14), { x: sx * 0.18, y: 0.11, z, rz: PI / 2 }) }); res.rig.push({ m: M.cast, g: TLXL.xf(new T.CylinderGeometry(0.028, 0.028, 0.044, 8), { x: sx * 0.18, y: 0.11, z, rz: PI / 2 }) }); }
      res.rig.push({ m: M.dark, g: S.rod([sx * 0.18, 0.1, -1.15], [sx * 0.18, 0.33, -0.78], 0.017) });                          // rear arm
      res.rig.push({ m: M.dark, g: S.rod([sx * 0.18, 0.1, -0.05], [sx * 0.18, 0.34, -0.3], 0.017) });                           // front arm
    }
    res.rig.push({ m: M.steel, g: S.rod([-0.18, 0.1, -1.15], [0.18, 0.1, -1.15], 0.015) }); res.rig.push({ m: M.steel, g: S.rod([-0.18, 0.09, -0.4], [0.18, 0.09, -0.4], 0.013) });
    res.rig.push({ m: M.chrome, g: S.rod([0, 0.12, -1.1], [0, 0.26, -0.99], 0.016) }); res.rig.push({ m: M.alu, g: S.rod([0, 0.24, -1.0], [0, 0.34, -0.9], 0.024) }); res.rig.push({ m: M.trim, g: S.spring([0, 0.14, -1.08], [0, 0.32, -0.92], 0.042, 7, 0.007) });
    return res;
  };

  /* ---------------- bars, controls, windshield, pod, column ---------------- */
  S.bars = function (ctx) {
    const M = S.mats(ctx), main = [], guards = [[], []], riser = [], mirrors = [];
    main.push({ m: M.steel, g: tb([[-0.42, 0.065, -0.058], [-0.3, 0.03, -0.02], [-0.16, 0, 0], [0.16, 0, 0], [0.3, 0.03, -0.02], [0.42, 0.065, -0.058]], 0.0115, 8) });
    main.push({ m: M.pad, g: TLXL.xf(TLXL.ell(0.11, 0.03, 0.03), { y: 0.052, z: -0.004 }) });
    main.push({ m: M.cast, g: TLXL.xf(TLXL.rbox(0.1, 0.05, 0.07, 0.014), { y: -0.012 }) });
    main.push({ m: M.cast, g: TLXL.xf(new T.CylinderGeometry(0.034, 0.034, 0.1, 12), { y: -0.065 }) });
    for (const sx of [-1, 1]) for (const dz of [-1, 1]) main.push({ m: M.steel, g: S.bolt([sx * 0.032, 0.014, dz * 0.022], [0, 1, 0], 0.009) });
    for (const sx of [-1, 1]) {
      const a = [sx * 0.29, 0.025, -0.015], b = [sx * 0.42, 0.065, -0.055];
      main.push({ m: M.rubber, g: S.taper(a, b, 0.0185, 0.0175, 10) });
      main.push({ m: M.black, g: S.taper([sx * 0.288, 0.0245, -0.0146], [sx * 0.282, 0.0225, -0.0127], 0.027, 0.027, 12) });
      main.push({ m: M.black, g: S.taper([sx * 0.415, 0.0635, -0.0535], [sx * 0.43, 0.0685, -0.0585], 0.0185, 0.015, 10) });
      const lev = sx > 0 ? [[0.285, 0.008, 0.0], [0.27, -0.002, 0.06], [0.256, -0.014, 0.1], [0.245, -0.035, 0.115]] : [[-0.285, 0.008, 0.0], [-0.27, -0.002, 0.065], [-0.256, -0.012, 0.11], [-0.246, -0.028, 0.13]];
      main.push({ m: M.alu, g: tb(lev, 0.0065, 6) }); main.push({ m: M.black, g: TLXL.xf(TLXL.rbox(0.07, 0.034, 0.045, 0.012), { x: sx * 0.272, y: 0.004, z: 0.0 }) });
    }
    main.push({ m: M.black, g: TLXL.xf(TLXL.lathe([[0.016, 0], [0.018, 0.02], [0.016, 0.045], [0.0, 0.045]], 12), { x: 0.255, y: 0.012, z: 0.02 }) });      // master cylinder
    main.push({ m: M.alu, g: TLXL.xf(new T.CylinderGeometry(0.014, 0.014, 0.01, 10), { x: 0.255, y: 0.062, z: 0.02 }) });
    main.push({ m: M.black, g: TLXL.xf(TLXL.rbox(0.03, 0.022, 0.03, 0.008), { x: -0.225, y: 0.02, z: -0.005 }) });                                      // kill switch and its red button
    main.push({ m: M.paintRed, g: TLXL.xf(new T.CylinderGeometry(0.008, 0.008, 0.012, 10), { x: -0.225, y: 0.036, z: -0.005 }) });
    for (const [i, sx] of [[0, -1], [1, 1]]) { guards[i].push({ m: M.dark, g: TLXL.xf(TLXL.loft([{ y: -0.065, rx: 0.003, rz: 0.075, cz: 0, n: 3 }, { y: 0.0, rx: 0.006, rz: 0.08, cz: 0.0, n: 3 }, { y: 0.065, rx: 0.003, rz: 0.075, cz: 0, n: 3 }], { axis: "z", seg: 10 }), { x: sx * 0.372, y: 0.07, z: 0.08, ry: sx * 0.25, rx: -0.35 }) });
      guards[i].push({ m: M.alu, g: S.rod([sx * 0.3, 0.035, 0.015], [sx * 0.345, 0.075, 0.07], 0.006) }); guards[i].push({ m: M.alu, g: S.rod([sx * 0.4, 0.07, -0.04], [sx * 0.388, 0.085, 0.07], 0.006) }); }
    riser.push({ m: M.cast, g: S.plate(0.12, 0.03, 0.1, 0.008).translate(0, -0.13, 0) }); riser.push({ m: M.cast, g: S.plate(0.12, 0.03, 0.1, 0.008).translate(0, -0.03, 0) });
    for (const sx of [-1, 1]) { riser.push({ m: M.alu, g: S.rod([sx * 0.04, -0.13, 0], [sx * 0.04, -0.03, 0], 0.017) }); riser.push({ m: M.steel, g: S.bolt([sx * 0.04, -0.012, 0], [0, 1, 0], 0.011) }); riser.push({ m: M.dark, g: S.rod([sx * 0.2, 0.02, -0.04], [sx * 0.2, 0.14, -0.05], 0.011) }); riser.push({ m: M.dark, g: TLXL.xf(TLXL.ell(0.016, 0.012, 0.016), { x: sx * 0.2, y: 0.145, z: -0.05 }) }); }
    for (const sx of [-1, 1]) { mirrors.push({ m: M.alu, g: S.rod([sx * 0.3, 0.04, 0.0], [sx * 0.34, 0.2, 0.0], 0.009) }); mirrors.push({ m: M.black, g: TLXL.xf(TLXL.ell(0.075, 0.052, 0.02), { x: sx * 0.35, y: 0.255, z: 0.01, rx: 0.15 }) }); mirrors.push({ m: M.refl, g: TLXL.xf(TLXL.ell(0.062, 0.042, 0.006), { x: sx * 0.35, y: 0.255, z: -0.007, rx: 0.15 }) }); }
    return { main, guards, riser, mirrors };
  };
  S.shield = function (ctx) {
    const M = S.mats(ctx), trim = [], rub = [], arc = (r, y, t0, t1, n) => { const p = []; for (let i = 0; i <= n; i++) { const t = lerp(t0, t1, i / n); p.push([r * Math.sin(t), y, r * Math.cos(t) - 0.44]); } return p; };
    const pane = new T.CylinderGeometry(0.3, 0.44, 0.5, 24, 1, true, -1.0, 2.0); pane.translate(0, 0.25, -0.44);
    const top = arc(0.3, 0.5, -1.0, 1.0, 12), bot = arc(0.44, 0, -1.0, 1.0, 14);
    const bead = tb(top, 0.0075, 6), edgeL = tb([bot[0], [0.3 * Math.sin(-1) * 0.5 + bot[0][0] * 0.5, 0.25, (bot[0][2] + top[0][2]) / 2], top[0]], 0.006, 6), edgeR = tb([bot[14], [bot[14][0] * 0.5 + top[12][0] * 0.5, 0.25, (bot[14][2] + top[12][2]) / 2], top[12]], 0.006, 6);
    rub.push({ m: M.rubber, g: tb(bot, 0.011, 6) }); rub.push({ m: M.rubber, g: edgeL }); rub.push({ m: M.rubber, g: edgeR });
    for (const t of [-0.62, 0.62]) { const p = [0.44 * Math.sin(t), -0.004, 0.44 * Math.cos(t) - 0.44]; rub.push({ m: M.cast, g: TLXL.xf(TLXL.rbox(0.05, 0.036, 0.03, 0.01), { x: p[0], y: 0.006, z: p[2] - 0.004 }) }); rub.push({ m: M.steel, g: S.bolt([p[0], 0.026, p[2] - 0.004], [0, 1, 0], 0.01) }); }
    for (let i = -2; i <= 2; i++) { const t = i * 0.3, x = 0.44 * Math.sin(t), z = 0.44 * Math.cos(t) - 0.44; rub.push({ m: M.steel, g: S.bolt([x * 0.99, 0.045, z * 1.0 - 0.001], [-Math.sin(t) * 0 , 0, 1], 0.006) }); }
    return { pane, bead, rub };
  };
  S.pod = function (kind, ctx) {
    const M = S.mats(ctx), it = [];
    const toRider = (g, x, y, z) => { TLXL.xf(g, { rx: -(PI / 2 - 0.5) * 0 - 0.9 }); return TLXL.xf(g, { x, y, z }); };
    if (kind === "round") for (const sx of [-1, 1]) {
      const dial = TLXL.lathe([[0, 0.0], [0.04, 0.0]], 16); const cyl = TLXL.lathe([[0.056, -0.04], [0.056, 0.0], [0.05, 0.012], [0.0, 0.012]], 18);
      it.push({ m: M.black, g: toRider(cyl, sx * 0.07, 0.02, 0.02) });
      const bz = TLXL.lathe([[0.056, 0.0], [0.06, 0.006], [0.06, 0.014], [0.052, 0.016], [0.05, 0.01]], 18); it.push({ m: M.chrome, g: toRider(bz, sx * 0.07, 0.02, 0.02) });
      const face = new T.CircleGeometry(0.048, 18); face.rotateX(-PI / 2); const fp = face.attributes.position, fu = face.attributes.uv; for (let i = 0; i < fp.count; i++) fu.setXY(i, fp.getX(i) / 0.096 + 0.5, -fp.getZ(i) / 0.096 + 0.5);
      it.push({ m: sx > 0 ? M.dial : M.dialR, g: toRider(TLXL.xf(face, { y: 0.0125 }), sx * 0.07, 0.02, 0.02) });
    } else {
      it.push({ m: M.dark, g: TLXL.xf(TLXL.rbox(0.24, 0.07, 0.11, 0.022), { rx: -0.45 }) });
      const f = TLXL.rbox(0.2, 0.006, 0.075, 0.002, 1); const fp = f.attributes.position, fu = f.attributes.uv; for (let i = 0; i < fp.count; i++) fu.setXY(i, fp.getX(i) / 0.2 + 0.5, fp.getZ(i) / 0.075 + 0.5);
      it.push({ m: M.screen, g: TLXL.xf(f, { y: 0.036, z: -0.01, rx: -0.45 }) });
    }
    return it;
  };
  S.carbide = function (ctx) { const M = S.mats(ctx), p = skiPath("steel").slice(0, 11); return [{ m: M.chrome, g: S.sweep(p, u => 0.026, u => 0.012, { off: -0.032, n: 3 }) }, { m: M.steel, g: S.sweep(p, u => 0.034, u => 0.004, { off: -0.018, n: 4 }) }]; };

  /* ---------------- bolt-on parts (the PARTS options), as item lists per group ---------------- */
  S.parts = function (ctx) {
    const M = S.mats(ctx), P = {}, V3b = V3, L2 = () => (L() ? 6 : 10), ac = (m, g) => ({ m, g });
    const mkSpr = (hex, key) => { const x = new T.MeshStandardMaterial({ color: hex, roughness: 0.35, metalness: 0.6, envMap: ctx.env, envMapIntensity: 0.9 }); TLXL.dressMat(x, "cast", { size: 128, key: "spr" }); return x; };
    M.springY = mkSpr(0xf2c230); M.springR = mkSpr(0xd8352a); M.springB = mkSpr(0x2f6bdf);
    // jerry can, origin at its centre, standing; sx = which side (the can leans its strap to the outside)
    P.can = (cm, sx) => [ac(cm, TLXL.rbox(0.13, 0.36, 0.28, 0.026)), ac(cm, at(TLXL.rbox(0.134, 0.03, 0.286, 0.012), 0, 0.12, 0)), ac(cm, at(TLXL.rbox(0.134, 0.03, 0.286, 0.012), 0, -0.12, 0)),
      ...[-1, 1].map(d => ac(cm, TLXL.xf(TLXL.rbox(0.012, 0.4, 0.03, 0.005, 1), { x: sx * 0.066, rx: d * 0.9 }))), ac(M.black, TLXL.xf(TLXL.lathe([[0.03, 0], [0.03, 0.03], [0.022, 0.034], [0, 0.034]], 10), { y: 0.19, z: 0.1, rx: 0.5 })), ac(M.chrome, TLXL.xf(TLXL.lathe([[0.034, 0], [0.034, 0.008]], 10), { y: 0.19, z: 0.1, rx: 0.5 })),
      ac(M.black, tb([[0, 0.185, -0.1], [0, 0.235, -0.07], [0, 0.235, 0.04], [0, 0.19, 0.06]], 0.011, 5)), ac(M.dark, S.plate(0.16, 0.04, 0.31, 0.012).translate(-sx * 0.01, -0.2, 0)), ac(M.dark, S.plate(0.11, 0.035, 0.04, 0.01).translate(sx * 0.1, -0.2, 0)),
      ac(M.rubber, S.plate(0.142, 0.025, 0.05, 0.008).translate(0, 0.05, 0))];
    P.lightBar = [ac(M.black, at(S.plate(0.66, 0.08, 0.1, 0.03), 0, 0, 0, 0.2)), ac(M.led, at(TLXL.rbox(0.6, 0.044, 0.014, 0.014, 1), 0, -0.012, 0.052, 0.2)), ac(M.refl, at(TLXL.rbox(0.62, 0.052, 0.01, 0.014, 1), 0, -0.012, 0.045, 0.2))];
    for (const sx of [-1, 1]) { P.lightBar.push(ac(M.dark, S.rod([sx * 0.26, 0.0, -0.02], [sx * 0.26, -0.2, -0.06], 0.014))); P.lightBar.push(ac(M.cast, at(S.plate(0.05, 0.03, 0.05, 0.01), sx * 0.26, -0.01, -0.025))); P.lightBar.push(ac(M.steel, S.bolt([sx * 0.26, -0.01, 0.0], [0, 0, 1], 0.01))); }
    const can = (r, len, m, tip) => [ac(m, TLXL.xf(TLXL.lathe([[0.02, -len / 2], [r * 0.7, -len / 2 + 0.03], [r, -len / 2 + 0.08], [r, len / 2 - 0.08], [r * 0.7, len / 2 - 0.03], [tip, len / 2 + 0.02]], L2() + 4), { rx: PI / 2 })), ac(M.steel, TLXL.xf(TLXL.lathe([[r + 0.004, -0.012], [r + 0.004, 0.012]], 12), { rx: PI / 2, z: -len * 0.28 })), ac(M.steel, TLXL.xf(TLXL.lathe([[r + 0.004, -0.012], [r + 0.004, 0.012]], 12), { rx: PI / 2, z: len * 0.28 }))];
    P.raceCan = can(0.11, 0.62, M.chrome, 0.04); P.trailCan = can(0.07, 0.36, M.black, 0.04);
    P.turboCan = can(0.1, 0.7, M.chrome, 0.05).concat([ac(M.dark, S.rod([0.32, 0.5, -0.14], [0.32, 0.72, 0.22], 0.036)), ac(M.cast, TLXL.xf(TLXL.ell(0.13, 0.13, 0.11), { x: 0.32, y: 0.86, z: 0.26 })), ac(M.dark, S.rod([0.24, 0.86, 0.4], [0.3, 0.86, 0.2], 0.026)), ac(M.cast, at(S.plate(0.14, 0.05, 0.1, 0.014), 0.3, 0.5, -0.95)), ac(M.cast, at(S.plate(0.14, 0.05, 0.1, 0.014), 0.3, 0.5, -0.42))]);
    P.rackBox = [ac(M.black, at(S.plate(0.56, 0.3, 0.5, 0.04), 0, 0, 0, 0.18)), ac(M.trim, at(S.plate(0.58, 0.05, 0.52, 0.02), 0, 0.16, 0.01, 0.18)), ...[-1, 1].map(sx => ac(M.chrome, at(TLXL.rbox(0.05, 0.03, 0.02, 0.008, 1), sx * 0.18, 0.12, 0.27, 0.18))), ac(M.steel, S.rod([-0.25, 0.14, -0.26], [0.25, 0.14, -0.26], 0.009))];
    P.deck = [ac(M.alu, at(S.plate(0.62, 0.05, 1.0, 0.014), 0, 0, 0, 0.08)), ...[-1, 1].map(sx => ac(M.black, at(S.plate(0.05, 0.16, 1.0, 0.014), sx * 0.3, 0.1, 0, 0.08))), ...[0.25, 0, -0.25, -0.5].map(z => ac(M.steel, at(S.plate(0.58, 0.012, 0.025, 0.004), 0, 0.03, z, 0.08)))];
    // aftermarket suspension springs
    const sprFront = (m, r, turns) => [-1, 1].flatMap(sx => [ac(m, S.spring([sx * 0.24, 0.84, 0.8], [sx * 0.46, 0.3, 0.94], r, turns, 0.012)), ac(M.chrome, S.rod([sx * 0.26, 0.8, 0.82], [sx * 0.44, 0.34, 0.93], 0.02))]);
    P.coilKit = sprFront(M.springY, 0.07, 6); P.longKit = sprFront(M.springR, 0.075, 8).concat([-1, 1].map(sx => ac(M.brass, S.rod([sx * 0.18, 0.7, 0.72], [sx * 0.22, 0.88, 0.78], 0.04))));
    P.coilKitRear = [ac(M.springY, S.spring([0, 0.33, -1.095], [0, 0.68, -0.905], 0.07, 6, 0.012)), ac(M.chrome, S.rod([0, 0.36, -1.08], [0, 0.65, -0.92], 0.02))];
    P.longKitRear = [ac(M.springR, S.spring([0, 0.33, -1.095], [0, 0.68, -0.905], 0.075, 8, 0.012)), ac(M.brass, S.rod([0.1, 0.45, -1.1], [0.1, 0.65, -0.96], 0.045))];
    P.clutchKit = [ac(M.black, at(S.plate(0.03, 0.3, 0.42, 0.012), -0.44, 0.62, 0.5)), ac(M.steel, TLXL.xf(TLXL.lathe([[0.12, 0], [0.12, 0.012], [0.05, 0.028], [0.02, 0.03], [0.02, 0]], 18), { x: -0.46, y: 0.62, z: 0.5, rz: -PI / 2 })), ac(M.springR, S.spring([-0.47, 0.62, 0.5], [-0.54, 0.62, 0.5], 0.07, 3, 0.011))];
    for (let i = 0; i < 4; i++) P.clutchKit.push(ac(M.dark, at(TLXL.rbox(0.012, 0.014, 0.14, 0.004, 1), -0.462, 0.7 - i * 0.032, 0.5)));
    const scoop = (w2, red) => { const it = [ac(M.black, TLXL.loft([{ y: -0.17, rx: w2 * 0.36, rz: 0.012, cz: 0.012, n: 3 }, { y: 0.0, rx: w2 * 0.5, rz: 0.04, cz: 0.04, n: 3 }, { y: 0.16, rx: w2 * 0.46, rz: 0.012, cz: 0.012, n: 3 }], { axis: "z", seg: 14, cap: true }))]; for (let i = 0; i < 3; i++) it.push(ac(red ? M.springR : M.chrome, at(TLXL.rbox(w2 * 0.8, 0.008, 0.012, 0.003, 1), 0, 0.044 + i * 0.012, 0.18 - i * 0.05, 0.05))); return it; };
    P.hoodScoop = scoop(0.5, false); P.turboScoop = scoop(0.8, true);
    // parts that had no model before
    P.winch = [-1, 1].flatMap(sx => [ac(M.cast, at(S.plate(0.04, 0.14, 0.1, 0.012), sx * 0.15, 0, 0))]).concat([ac(M.dark, TLXL.xf(TLXL.lathe([[0.055, -0.13], [0.055, 0.13], [0.0, 0.13], [0.0, -0.13]], 16), { rz: PI / 2 })), ac(M.steel, TLXL.xf(TLXL.lathe([[0.062, -0.14], [0.062, -0.12], [0.036, -0.12]], 16), { rz: PI / 2 })), ac(M.steel, TLXL.xf(TLXL.lathe([[0.062, 0.12], [0.062, 0.14], [0.036, 0.12]], 16), { rz: PI / 2 })), ac(M.rubber, tb([[-0.1, 0.0, 0.05], [0, 0.0, 0.08], [0.1, 0.0, 0.05], [0.12, -0.04, 0.12]], 0.012, 5)), ac(M.chrome, at(S.plate(0.16, 0.03, 0.03, 0.01), 0, -0.05, 0.14))]);
    P.winchMotor = [ac(M.black, TLXL.xf(TLXL.lathe([[0.045, 0], [0.045, 0.14], [0.0, 0.14]], 14), { rz: -PI / 2, x: 0.22 })), ac(M.alu, TLXL.xf(TLXL.lathe([[0.048, 0.0], [0.048, 0.012]], 14), { rz: -PI / 2, x: 0.16 }))];
    P.recv = [ac(M.dark, S.plate(0.07, 0.07, 0.34, 0.012).translate(0, 0, -0.1)), ac(M.cast, at(S.plate(0.2, 0.05, 0.05, 0.012), 0, 0.04, 0.05)), ac(M.chrome, S.rod([0, 0, -0.27], [0, 0.05, -0.27], 0.012)), ac(M.chrome, TLXL.xf(TLXL.ell(0.026, 0.026, 0.026), { y: 0.075, z: -0.27 })), ac(M.steel, S.bolt([0, 0.036, -0.1], [0, 1, 0], 0.012))];
    P.recvHeavy = [ac(M.dark, S.plate(0.2, 0.025, 0.12, 0.01).translate(0, -0.05, -0.2)), ac(M.steel, S.bolt([0.07, -0.036, -0.2], [0, 1, 0], 0.014)), ac(M.steel, S.bolt([-0.07, -0.036, -0.2], [0, 1, 0], 0.014))];
    P.hitchPin = [ac(M.steel, tb([[0, 0, -0.15], [0, 0.02, -0.3], [0, 0.04, -0.4], [0, 0.0, -0.45], [0, -0.03, -0.4]], 0.014, 6)), ac(M.cast, at(S.plate(0.07, 0.03, 0.06, 0.01), 0, 0.0, -0.2))];
    P.hitchChain = [ac(M.steel, tb([[0.1, 0.0, -0.1], [0.12, -0.08, -0.22], [0.06, -0.1, -0.3]], 0.006, 4)), ac(M.steel, tb([[-0.1, 0.0, -0.1], [-0.12, -0.08, -0.22], [-0.06, -0.1, -0.3]], 0.006, 4))];
    P.scratch = [-1, 1].flatMap(sx => [ac(M.steel, at(S.plate(0.04, 0.012, 0.3, 0.004), sx * 0.28, 0.0, 0, -0.5)), ac(M.cast, at(S.plate(0.06, 0.03, 0.05, 0.01), sx * 0.28, 0.06, 0.14))]);
    P.coolPro = [ac(M.black, TLXL.xf(TLXL.lathe([[0.04, 0], [0.042, 0.02], [0.042, 0.13], [0.03, 0.14], [0.0, 0.14]], 12), { x: 0.25, y: 0.0, z: 0 })), ac(M.alu, TLXL.xf(TLXL.lathe([[0.03, 0.14], [0.03, 0.17], [0.0, 0.17]], 10), { x: 0.25 })), ac(M.rubber, tb([[0.25, 0.04, 0.0], [0.2, -0.06, 0.1], [0.1, -0.1, 0.18]], 0.01, 5))];
    P.gripHeat = [ac(M.black, TLXL.xf(TLXL.rbox(0.045, 0.02, 0.03, 0.008), { x: -0.17, y: 0.022, z: -0.01 })), ac(M.paintRed, TLXL.xf(new T.CylinderGeometry(0.008, 0.008, 0.01, 10), { x: -0.17, y: 0.035, z: -0.01 })), ac(M.rubber, tb([[-0.17, 0.02, -0.01], [-0.1, -0.03, -0.03], [0, -0.06, -0.04]], 0.0045, 4))];
    for (const sx of [-1, 1]) P.gripFull = (P.gripFull || []).concat([ac(M.rubber, TLXL.xf(TLXL.loft([{ y: -0.01, rx: 0.052, rz: 0.058, n: 2.6 }, { y: 0.08, rx: 0.062, rz: 0.066, n: 2.6 }, { y: 0.17, rx: 0.056, rz: 0.06, n: 2.6 }], { axis: "z", seg: 14, roundTop: 0.03, roundBottom: 0 }), { x: sx * 0.36, y: 0.045, z: -0.1 }))]);
    P.tether = [ac(M.paintRed, tb([[-0.225, 0.02, -0.005], [-0.2, -0.05, -0.02], [-0.24, -0.1, -0.03], [-0.2, -0.15, -0.04], [-0.24, -0.2, -0.05]], 0.0055, 4)), ac(M.chrome, at(TLXL.rbox(0.03, 0.014, 0.012, 0.004, 1), -0.24, -0.215, -0.05))];
    P.tankPod = [ac(M.black, TLXL.ell(0.06, 0.07, 0.62)), ac(M.chrome, TLXL.xf(TLXL.lathe([[0.034, 0], [0.034, 0.014], [0.018, 0.02], [0, 0.02]], 12), { y: 0.06, z: 0.3 })), ac(M.steel, S.bolt([0, 0.0, 0.0], [0, 1, 0], 0.001))];
    P.strap = [-1, 1].map(z => ac(M.trim, tb([[-0.3, 0.7, z * 0.3], [-0.3, 0.9, z * 0.3], [0.3, 0.9, z * 0.3], [0.3, 0.7, z * 0.3]], 0.011, 5))).concat([ac(M.chrome, at(TLXL.rbox(0.05, 0.03, 0.025, 0.006, 1), 0, 0.91, 0.3)), ac(M.chrome, at(TLXL.rbox(0.05, 0.03, 0.025, 0.006, 1), 0, 0.91, -0.3))]);
    P.cage = []; for (const sx of [-1, 1]) { P.cage.push(ac(M.black, S.rod([sx * 0.34, 0.6, 0.38], [sx * 0.34, 0.98, 0.38], 0.013))); P.cage.push(ac(M.black, S.rod([sx * 0.34, 0.6, -0.38], [sx * 0.34, 0.98, -0.38], 0.013))); P.cage.push(ac(M.black, S.rod([sx * 0.34, 0.98, -0.38], [sx * 0.34, 0.98, 0.38], 0.013))); } P.cage.push(ac(M.black, S.rod([-0.34, 0.98, 0], [0.34, 0.98, 0], 0.013))); P.cage.push(ac(M.black, S.rod([-0.34, 0.98, 0.38], [0.34, 0.98, 0.38], 0.013)));
    P.thermos = [ac(M.paintRed, TLXL.xf(TLXL.lathe([[0.001, 0], [0.04, 0.0], [0.042, 0.02], [0.042, 0.26], [0.034, 0.27], [0.034, 0.3], [0.0, 0.3]], 14), { rx: PI / 2, x: -0.13 })), ac(M.chrome, TLXL.xf(TLXL.lathe([[0.034, 0.3], [0.034, 0.34], [0.0, 0.34]], 12), { rx: PI / 2, x: -0.13 }))];
    P.stove = [ac(M.steel, at(S.plate(0.2, 0.09, 0.16, 0.02), 0.1, 0.06, 0)), ac(M.black, TLXL.xf(TLXL.lathe([[0.001, 0], [0.032, 0], [0.034, 0.1], [0.0, 0.1]], 12), { x: 0.2, y: 0.01, z: 0, rz: PI / 2 })), ac(M.chrome, at(TLXL.rbox(0.07, 0.012, 0.07, 0.004, 1), 0.1, 0.108, 0))];
    P.shovel = [ac(M.steel, S.rod([0, 0, -0.5], [0, 0, 0.5], 0.011)), ac(M.alu, at(S.plate(0.22, 0.012, 0.26, 0.006), 0, 0, 0.48)), ac(M.black, at(S.plate(0.05, 0.03, 0.04, 0.01), 0, 0, -0.5))];
    P.beacon = [ac(M.black, at(S.plate(0.1, 0.05, 0.14, 0.02), 0, 0, 0)), ac(M.paintRed, at(S.plate(0.07, 0.01, 0.1, 0.004), 0, 0.03, 0)), ac(M.black, S.rod([0.04, 0.02, 0.05], [0.05, 0.2, 0.08], 0.006))];
    return P;
  };
  /* ---------------- Santa's sleigh bodywork: lacquered wood, brass, leather, cloth ---------------- */
  S.sleigh = function (ud, ctx) {
    const M = S.mats(ctx), it = [], ac = (m, g) => ({ m, g }), tw = ud.tw, zB = ud.zBack, z0 = -0.05, z1 = zB + 0.25, zc = (z0 + z1) / 2, Ln = z0 - z1;
    if (!M.sack) { M.sack = new T.MeshStandardMaterial({ color: 0x7a2418, roughness: 1 }); TLXL.dressMat(M.sack, "fleece", { size: 128, base: 0.7, key: "sack" }); M.gift1 = new T.MeshStandardMaterial({ color: 0x1f6b3a, roughness: 0.6 }); TLXL.dressMat(M.gift1, "shell", { size: 128, base: 0.75, key: "gift" }); M.gift2 = new T.MeshStandardMaterial({ color: 0xf2eee4, roughness: 0.6 }); TLXL.dressMat(M.gift2, "shell", { size: 128, base: 0.9, key: "gift2" }); }
    for (const sx of [-1, 1]) {
      const X = sx * (tw / 2 + 0.26);
      const side = TLXL.loft([{ y: z1, rx: 0.016, rz: 0.12, cz: 0.66, n: 3 }, { y: zc, rx: 0.02, rz: 0.17, cz: 0.64, n: 3 }, { y: z0 - 0.04, rx: 0.016, rz: 0.2, cz: 0.66, n: 3 }, { y: z0 + 0.08, rx: 0.012, rz: 0.12, cz: 0.78, n: 3 }], { axis: "z", seg: 14, roundTop: 0.05, roundBottom: 0.04, uv: [0, 0, 1, Math.abs(Ln) * 2] });
      it.push(ac(M.paintRed, TLXL.xf(side, { x: X })));
      it.push(ac(M.brass, tb([[X, 0.52, z0 - 0.02], [X, 0.5, zc], [X, 0.5, z1]], 0.014, 7)));
      it.push(ac(M.brass, tb([[X, 0.82, z0 + 0.1], [X, 0.84, zc], [X, 0.9, z1 + 0.05], [X, 1.06, zB + 0.04], [X, 1.14, zB + 0.2], [X, 1.04, zB + 0.28], [X, 0.98, zB + 0.24]], 0.02, 8)));
      it.push(ac(M.brass, tb([[X, 0.48, z0 - 0.02], [X, 0.6, z0 + 0.18], [X, 0.76, z0 + 0.2], [X, 0.84, z0 + 0.08]], 0.018, 7)));
      it.push(ac(M.leather, tb([[X + sx * 0.03, 0.74, z1 + 0.1], [X + sx * 0.03, 0.7, zc], [X + sx * 0.03, 0.74, z0 - 0.05]], 0.012, 5)));
      for (let k = 0; k < 4; k++) { const z = z1 + 0.15 + k * Ln / 4; it.push(ac(M.brass, TLXL.xf(TLXL.lathe([[0.0, 0.05], [0.012, 0.045], [0.03, 0.01], [0.04, -0.03], [0.036, -0.036], [0.014, -0.03], [0.0, -0.02]], 12), { x: X + sx * 0.04, y: 0.69, z }))); }
    }
    it.push(ac(M.brass, tb([[-(tw / 2 + 0.26), 0.86, z0 + 0.02], [-0.1, 0.9, z0 + 0.14], [0.1, 0.9, z0 + 0.14], [tw / 2 + 0.26, 0.86, z0 + 0.02]], 0.017, 7)));      // the dash rail
    for (let k = 0; k < 6; k++) it.push(ac(M.brass, TLXL.xf(TLXL.ell(0.014, 0.014, 0.01), { x: (k % 3 - 1) * 0.16, y: 0.9 + (k > 2 ? 0.1 : 0.04), z: zB + 0.36 })));   // tufting buttons on the backrest
    it.push(ac(M.sack, TLXL.xf(TLXL.ell(0.3, 0.345, 0.3), { y: 0.98, z: zB + 0.42 })));
    it.push(ac(M.sack, TLXL.xf(TLXL.lathe([[0.05, 0], [0.1, 0.16], [0.0, 0.16]], 10), { y: 1.28, z: zB + 0.42 })));
    it.push(ac(M.leather, tb([[-0.1, 1.27, zB + 0.42], [0, 1.31, zB + 0.5], [0.1, 1.27, zB + 0.42], [0, 1.25, zB + 0.34]], 0.012, 5)));
    for (const [m, x, y, z, ry, w2, h2] of [[M.gift1, -0.17, 0.72, zB + 0.12, 0.3, 0.24, 0.2], [M.gift2, 0.19, 0.7, zB + 0.1, -0.2, 0.18, 0.16]]) { it.push(ac(m, TLXL.xf(S.plate(w2, h2, w2, 0.012, 3), { x, y, z, ry }))); it.push(ac(M.paintRed, TLXL.xf(S.plate(0.032, h2 + 0.004, w2 + 0.004, 0.006, 3), { x, y, z, ry }))); it.push(ac(M.paintRed, TLXL.xf(S.plate(w2 + 0.004, h2 + 0.004, 0.032, 0.006, 3), { x, y, z, ry }))); it.push(ac(M.paintRed, TLXL.xf(TLXL.ell(0.04, 0.025, 0.03), { x, y: y + h2 / 2 + 0.01, z, ry }))); }
    return it;
  };
  S.column = function () { const g = TLXL.lathe([[0.02, 0], [0.058, 0.0], [0.06, 0.02], [0.052, 0.04], [0.058, 0.06], [0.05, 0.08], [0.04, 0.1], [0.036, 0.12]], 14); return g; };
})();
