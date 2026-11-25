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
