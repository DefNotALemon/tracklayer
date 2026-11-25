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
    o = o || {}; const size = o.size || (kind === "shell" ? 256 : 128), key = "fab:" + kind + ":" + size + ":" + (o.key || ""); if (cache[key]) return cache[key];
    const t0 = performance.now(), H = TLXL.height(size), sz2 = size > 256 ? size >> 1 : size, R = TLXL.height(sz2), Tn = TLXL.height(sz2), S = size / 256, S2 = sz2 / 256, seed = (kind.length * 977 + size) | 0;
    let nk = 3, base = 0.9, amp = 0.16, rlo = 0.8, rhi = 1;
    switch (kind) {
      case "shell": H.weave(Math.max(2, 3 * S), 0.1, 8).noise(14 * S, 0.22, seed).noise(5 * S, 0.08, seed + 1).grain(0.05, seed + 2); R.noise(10 * S2, 0.3, seed + 3); nk = 1.3; break;
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
        const px = (s.rx + infl) * Math.sign(sn) * Math.pow(Math.abs(sn), e) + s.cx, pw = (s.rz + infl) * Math.sign(cs) * Math.pow(Math.abs(cs), e) + s.cz, p = (i * cols + j) * 3;
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
  TLXL.rbox = function (w, h, d, r, seg) {
    seg = seg || (TLXL.lite ? 2 : 3); r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const g = new T.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2), p = g.attributes.position, n = g.attributes.normal, hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ix = clamp(x, -hw, hw), iy = clamp(y, -hh, hh), iz = clamp(z, -hd, hd), dx = x - ix, dy = y - iy, dz = z - iz, l = Math.hypot(dx, dy, dz);
      if (l > 1e-6) { p.setXYZ(i, ix + dx / l * r, iy + dy / l * r, iz + dz / l * r); n.setXYZ(i, dx / l, dy / l, dz / l); }
    }
    return g;
  };
  TLXL.ell = function (rx, ry, rz, seg) { seg = seg || (TLXL.lite ? 8 : 12); const g = new T.SphereGeometry(1, seg, Math.max(5, seg * 0.7 | 0)); g.scale(rx, ry, rz); g.computeVertexNormals(); return g; };
  TLXL.lathe = function (profile, seg, uvr) {
    const g = new T.LatheGeometry(profile.map(p => new T.Vector2(p[0], p[1])), seg || (TLXL.lite ? 12 : 20)); g.computeVertexNormals();
    if (uvr) { const u = g.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, uvr[0] + (uvr[2] - uvr[0]) * u.getX(i), uvr[1] + (uvr[3] - uvr[1]) * u.getY(i)); }
    return g;
  };
  TLXL.tube = function (pts, r, o) {                // tube along a curve, ends closed by a small dome
    o = o || {}; const cur = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], p[1], p[2])), false, "catmullrom", 0.3), n = o.n || Math.max(4, pts.length * 3);
    const g = new T.TubeGeometry(cur, n, r, o.seg || (TLXL.lite ? 5 : 7), false); g.computeVertexNormals();
    const caps = [], ends = [[0, 1], [1, 1]];
    for (const [t] of ends) { const c = cur.getPoint(t), s = new T.SphereGeometry(r, 6, 4); s.translate(c.x, c.y, c.z); caps.push(s); }
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
   TLXL.fig: the human figure kit (slice R1). One body for every person: the walker, the seated rider, passengers, villagers,
   staff, drivers, anglers and the crash body. All geometry is built in WALKER space: metres, hip pivot at y 0 for the torso,
   +y up, +z the way the figure faces. Limbs are loft meshes along +z (hanging limbs are rotated by the assembler).
   Skeleton numbers the rigs depend on (do not change them here): hip pivot y 0.93, thigh 0.42, shin pivot to ankle 0.43, ankle
   0.075 over the sole, shoulder (+-0.22, 0.53), upper arm 0.25, forearm to the grip point 0.24.
     TLXL.fig.dress(base, env)   textures + extra materials for the shared set {jacket, pants, trim, glove, skin, boot, helmet, visor}
                                 returns K (also TLXL.fig.K); TLXL.fig.kitFor(m) does the same for a custom-colour figure
     torso(K) pelvis(K) thigh(K,L) shin(K,L) upper(K,L) fore(K,L)      -> items for TLXL.build
     hand(K, kind, sx, k)        kind 'fist' (on a grip) | 'mitt' | 'open' (wipe) | 'relaxed' | 'relaxedMitt'
     boot(K, kind, ankH)         kind 'pac' | 'arctic', origin: sole under the ankle axis, +z toe
     head(K, kit, o)             kit 'helmet' | 'beanie' | 'mask' -> {skin, shell, visor, ...} item lists, head-centre origin
   --------------------------------------------------------------------------------------------------------- */
(function () {
  "use strict";
  const T = window.THREE; if (!T) return;
  const TLXL = window.TLXL, PI = Math.PI, TAU = PI * 2, F = TLXL.fig = {}, L = () => TLXL.lite;
  const R_T = [0, 0.5, 1, 1], R_UP = [0, 0.25, 0.5, 0.5], R_FO = [0.5, 0.25, 1, 0.5];
  const reg = (r, u, v) => [r[0] + (r[2] - r[0]) * u, r[1] + (r[3] - r[1]) * v];
  const JY0 = -0.17, JY1 = 0.612, tv = y => 0.5 + 0.5 * Math.min(1, (y - JY0) / (JY1 - JY0));
  const PY0 = -0.2, PY1 = 0.1, pv = y => 0.5 + 0.5 * (y - PY0) / (PY1 - PY0);
  const S = (y, rx, rz, cz, n, cx) => ({ y, rx, rz, cz: cz || 0, n: n || 2, cx: cx || 0 });
  const ln = (H, a, b, o) => H.seam(a[0], a[1], b[0], b[1], o);
  function stampJacket(H) {
    const z = 0.5;
    H.zip(z, tv(0.6), z, tv(-0.165), { w: 2.2 }); H.seam(z + 0.024, tv(0.58), z + 0.024, tv(-0.16), { w: 1.4, depth: 0.7 }); H.ridge(z + 0.012, tv(0.58), z + 0.012, tv(-0.16), { w: 3, depth: 0.7 });
    for (const s of [-1, 1]) {
      ln(H, [z + s * 0.043, tv(0.31)], [z + s * 0.1, tv(0.355)], { w: 1.5, depth: 0.8, stitch: 0 }); ln(H, [z + s * 0.046, tv(0.3)], [z + s * 0.103, tv(0.345)], { w: 0.9, depth: 0.5 });   // chest pocket zip
      ln(H, [z + s * 0.083, tv(0.1)], [z + s * 0.132, tv(-0.01)], { w: 1.5, depth: 0.8, stitch: 0 }); ln(H, [z + s * 0.095, tv(0.11)], [z + s * 0.145, tv(0.0)], { w: 0.9, depth: 0.5 });   // hand pocket
    }
    ln(H, [0.25, tv(-0.16)], [0.25, tv(0.47)], { w: 1.5, depth: 0.7 }); ln(H, [0.75, tv(-0.16)], [0.75, tv(0.47)], { w: 1.5, depth: 0.7 });
    ln(H, [0.002, tv(-0.16)], [0.002, tv(0.5)], { w: 1.5, depth: 0.6 }); ln(H, [0.998, tv(-0.16)], [0.998, tv(0.5)], { w: 1.5, depth: 0.6 });
    ln(H, [0, tv(0.45)], [1, tv(0.45)], { w: 1.4, depth: 0.7 }); ln(H, [0, tv(-0.125)], [1, tv(-0.125)], { w: 1.4, depth: 0.8 }); ln(H, [0, tv(-0.14)], [1, tv(-0.14)], { w: 0.9, depth: 0.5 });
    // sleeves: a side seam each, an elbow seam, the cuff seam
    for (const r of [R_UP, R_FO]) { ln(H, reg(r, 0.25, 0), reg(r, 0.25, 1), { w: 1.2, depth: 0.7 }); ln(H, reg(r, 0.75, 0), reg(r, 0.75, 1), { w: 1.2, depth: 0.7 }); }
    ln(H, reg(R_UP, 0, 0.78), reg(R_UP, 1, 0.78), { w: 1.2, depth: 0.7 }); ln(H, reg(R_FO, 0, 0.9), reg(R_FO, 1, 0.9), { w: 1.4, depth: 0.8 }); ln(H, reg(R_FO, 0, 0.12), reg(R_FO, 1, 0.12), { w: 1.2, depth: 0.6 });
  }
  function stampPants(H) {
    const z = 0.5;
    ln(H, [0, pv(0.06)], [1, pv(0.06)], { w: 1.6, depth: 0.8 }); H.zip(z, pv(0.06), z, pv(-0.04), { w: 2 });
    ln(H, [0.25, pv(-0.2)], [0.25, pv(0.08)], { w: 1.5, depth: 0.7 }); ln(H, [0.75, pv(-0.2)], [0.75, pv(0.08)], { w: 1.5, depth: 0.7 }); ln(H, [0.002, pv(-0.2)], [0.002, pv(0.08)], { w: 1.5, depth: 0.7 });
    for (const s of [-1, 1]) ln(H, [z + s * 0.1, pv(0.06)], [z + s * 0.15, pv(-0.14)], { w: 1.4, depth: 0.7 });
    for (const r of [R_UP, R_FO]) { ln(H, reg(r, 0.25, 0), reg(r, 0.25, 1), { w: 1.3, depth: 0.7 }); ln(H, reg(r, 0.75, 0), reg(r, 0.75, 1), { w: 1.3, depth: 0.7 }); }
    H.panel(...reg(R_UP, 0.56, 0.26), ...reg(R_UP, 0.74, 0.5), { w: 1.2, depth: 0.7 });        // cargo pocket on the outer thigh
    ln(H, reg(R_FO, 0, 0.3), reg(R_FO, 1, 0.3), { w: 1.4, depth: 0.7 }); ln(H, reg(R_FO, 0, 0.9), reg(R_FO, 1, 0.9), { w: 1.4, depth: 0.8 });
  }
  F.dress = function (b, env) {
    if (F.K) return F.K; const t0 = performance.now();
    const m = (c, r, mt, ex) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: mt || 0 }, ex || {}));
    const D = TLXL.dressMat, K = F.K = { jacket: b.jacket, pants: b.pants, trim: b.trim, glove: b.glove, skin: b.skin, boot: b.boot, helmet: b.helmet, visor: b.visor };
    D(b.jacket, "shell", { size: 512, key: "jacket", stamp: stampJacket, ns: 0.9 }); D(b.pants, "shell", { size: 512, key: "pants", stamp: stampPants, ns: 0.9 });
    D(b.trim, "shell"); D(b.glove, "shell", { ns: 1.2 }); D(b.skin, "skin"); D(b.boot, "leather");
    D(b.helmet, "gloss"); D(b.visor, "lens");
    for (const x of [b.helmet, b.visor]) if (env) { x.envMap = env; x.envMapIntensity = x === b.visor ? 0.75 : 1.1; }
    K.panel = D(m(0x232a31, 0.85), "shell", { ns: 1.2 }); K.dark = D(m(0x16191d, 0.68), "plastic");
    K.sole = D(m(0x0d0f11, 0.96), "rubber", { key: "tread", ns: 1.4, stamp: H => { for (let v = 0.04; v < 0.98; v += 0.06) { H.seam(0.0, v, 0.22, v, { w: 2, depth: 1.4, stitch: 0 }); H.seam(0.78, v, 1.0, v, { w: 2, depth: 1.4, stitch: 0 }); } H.seam(0.25, 0, 0.25, 1, { w: 1.5, depth: 1, stitch: 0 }); H.seam(0.75, 0, 0.75, 1, { w: 1.5, depth: 1, stitch: 0 }); } });
    K.reflect = D(m(0xb4c0cb, 0.38, 0.4), "shell", { ns: 1.4 }); if (env) { K.reflect.envMap = env; K.reflect.envMapIntensity = 1.0; }
    K.fur = D(m(0x8a7358, 1), "fleece"); K.pack = D(m(0x2a3038, 0.9), "shell", { ns: 1.3 });
    K.beanie = D(m(b.trim.color.getHex(), 0.95), "knit", { ns: 1.4 }); K.mask = D(m(0x1a1f26, 0.95), "knit", { ns: 1.2 });
    K.bootA = D(m(0x2a3038, 0.85), "leather"); K.eye = D(m(0xe8e8e2, 0.35), "skin"); K.feat = D(m(0x2a1c14, 0.6), "skin");
    K.gog = D(m(0x3f6a8c, 0.06, 0.7), "lens"); if (env) { K.gog.envMap = env; K.gog.envMapIntensity = 0.9; }
    K.strap = K.dark; TLXL.figMs = performance.now() - t0; return K;
  };
  F.kitFor = function (b) {                          // a figure with its own jacket/pants colours (rescue casualties, staff): own base, shared extras
    const K = Object.assign({}, F.K), D = TLXL.dressMat;
    for (const k of ["jacket", "pants", "trim", "glove", "skin", "boot", "helmet", "visor"]) if (b[k]) K[k] = b[k];
    D(K.jacket, "shell", { size: 512, key: "jacket", stamp: stampJacket, ns: 0.9 }); D(K.pants, "shell", { size: 512, key: "pants", stamp: stampPants, ns: 0.9 }); D(K.trim, "shell"); D(K.glove, "shell", { ns: 1.2 });
    D(K.skin, "skin"); D(K.boot, "leather"); D(K.helmet, "gloss"); D(K.visor, "lens");
    for (const x of [K.helmet, K.visor]) if (F.K.helmet.envMap && !x.envMap) { x.envMap = F.K.helmet.envMap; x.envMapIntensity = 1.2; }
    return K;
  };

  /* ---------------- torso, pelvis, limbs ---------------- */
  const torsoSecs = () => [S(-0.17, 0.196, 0.126), S(-0.12, 0.205, 0.134), S(-0.02, 0.195, 0.128), S(0.1, 0.188, 0.122), S(0.24, 0.212, 0.135, 0.004), S(0.37, 0.232, 0.145, 0.01),
    S(0.46, 0.236, 0.132, 0.003, 2.3), S(0.52, 0.21, 0.114), S(0.565, 0.145, 0.098), S(0.595, 0.098, 0.085), S(0.612, 0.07, 0.074)];
  const secRange = (y0, y1) => { const out = [], all = torsoSecs(), at = y => { for (let i = 1; i < all.length; i++) if (y <= all[i].y) { const a = all[i - 1], b = all[i], t = (y - a.y) / (b.y - a.y); return S(y, a.rx + (b.rx - a.rx) * t, a.rz + (b.rz - a.rz) * t, a.cz + (b.cz - a.cz) * t, 2); } return all[all.length - 1]; };
    for (let i = 0; i <= 5; i++) out.push(at(y0 + (y1 - y0) * i / 5)); return out; };
  F.torso = function (K, o) {
    o = o || {}; const it = [], uvT = R_T, lite = L();
    it.push({ m: K.jacket, g: TLXL.loft(torsoSecs(), { uv: uvT, cap: "t", seg: lite ? 12 : 20 }) });
    it.push({ m: K.jacket, g: TLXL.loft([S(-0.172, 0.198, 0.128), S(-0.16, 0.214, 0.142), S(-0.145, 0.217, 0.146), S(-0.12, 0.207, 0.137)], { uv: [0, 0.5, 1, 0.56], roundBottom: 0.01, seg: lite ? 12 : 20 }) });   // rolled hem lip
    // stand collar: a double wall, rolled over at the top
    it.push({ m: K.jacket, g: TLXL.loft([S(0.55, 0.108, 0.1, 0.0), S(0.6, 0.094, 0.09), S(0.655, 0.094, 0.092), S(0.668, 0.088, 0.086), S(0.655, 0.075, 0.072), S(0.6, 0.076, 0.072), S(0.56, 0.082, 0.078)], { uv: [0, 0.94, 1, 1], seg: lite ? 12 : 18 }) });
    // second-tone shoulder panels (on the slope of the shoulder) and the yoke
    for (const [a0, a1] of [[0.75, 1.75], [-1.75, -0.75]]) it.push({ m: K.panel, g: TLXL.loft(secRange(0.47, 0.585), { a0, a1, inflate: 0.004, uv: [0.5, 0.9, 0.9, 1], seg: 6 }) });
    // reflective piping: a band round the chest and one over each shoulder seam. Reflects, never glows.
    it.push({ m: K.reflect, g: TLXL.loft(secRange(0.208, 0.2155), { inflate: 0.003, uv: [0, 0.6, 1, 0.62], seg: lite ? 12 : 20 }) });
    if (!lite) {
      it.push({ m: K.dark, g: TLXL.tube(Array.from({ length: 16 }, (_, i) => { const a = i / 16 * TAU; return [Math.sin(a) * 0.209, -0.118, Math.cos(a) * 0.137]; }).concat([[0, -0.118, 0.137]]), 0.0045, { n: 40, seg: 4 }) });   // hem drawcord
      for (const s of [-1, 1]) {
        it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.014, 0.03, 0.012, 0.005), { x: s * 0.012, y: 0.585, z: 0.082 }) });   // zip pull + toggles
        it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.012, 0.02, 0.012, 0.004), { x: s * 0.06, y: -0.15, z: 0.128 }) });
      }
    }
    return it;
  };
  F.torsoPatch = function (K, kind) {               // the rider style stripes (SET.style): trim colour, hugging the jacket
    const sc = kind === "stripe" ? secRange(-0.1, 0.36) : kind === "chest" ? secRange(0.26, 0.4) : secRange(0.24, 0.37);
    const a = kind === "stripe" ? [-0.18, 0.18] : kind === "chest" ? [-0.95, 0.95] : [PI - 0.95, PI + 0.95];
    return [{ m: K.trim, g: TLXL.loft(sc, { a0: a[0], a1: a[1], inflate: 0.005, uv: [0.3, 0.55, 0.7, 0.9], seg: 8 }) }];
  };
  F.pack = function (K) {
    const it = [];
    it.push({ m: K.pack, g: TLXL.xf(TLXL.rbox(0.25, 0.3, 0.13, 0.045), { y: 0.27, z: -0.2 }) }); it.push({ m: K.pack, g: TLXL.xf(TLXL.rbox(0.27, 0.07, 0.14, 0.03), { y: 0.43, z: -0.2 }) });
    it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.2, 0.02, 0.01, 0.006), { y: 0.36, z: -0.134 }) }); it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.03, 0.04, 0.012, 0.006), { y: 0.36, z: -0.136 }) });
    if (!L()) for (const s of [-1, 1]) it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.025, 0.22, 0.01, 0.005), { x: s * 0.07, y: 0.24, z: -0.13 }) });
    return it;
  };
  F.pelvis = function (K) {
    return [{ m: K.pants, g: TLXL.loft([S(-0.2, 0.15, 0.11), S(-0.12, 0.19, 0.13, -0.008), S(-0.02, 0.195, 0.128, -0.006), S(0.08, 0.18, 0.12)], { uv: R_T.map((v, i) => i === 1 ? 0.5 : i === 3 ? 1 : v), roundTop: 0.03, seg: L() ? 12 : 20, cap: "b" }) }];
  };
  // limbs: loft along +z from the joint end (t 0) to the far end (t L). rx = half width, rz = half depth (front is +y of the ring).
  const limbSecs = (L0, tab, o) => tab.map(r => Object.assign(S(r[0] * L0, r[1], r[2], r[3] || 0), o || {}));
  F.thigh = function (K, L0) { return [{ m: K.pants, g: TLXL.loft(limbSecs(L0, [[0, 0.1, 0.105], [0.12, 0.108, 0.115], [0.3, 0.1, 0.108], [0.5, 0.088, 0.095], [0.85, 0.078, 0.082], [1, 0.074, 0.076]]), { axis: "z", uv: R_UP, roundBottom: 0.07, roundTop: 0.04, seg: L() ? 10 : 16 }) }]; };
  F.shin = function (K, L0) { return [{ m: K.pants, g: TLXL.loft(limbSecs(L0, [[0, 0.078, 0.082], [0.12, 0.084, 0.09], [0.3, 0.082, 0.092, -0.006], [0.55, 0.07, 0.076], [0.8, 0.06, 0.064], [0.9, 0.062, 0.066], [0.955, 0.088, 0.09], [1, 0.085, 0.087]]), { axis: "z", uv: R_FO, roundBottom: 0.05, cap: "t", seg: L() ? 10 : 16 }) }]; };
  F.upper = function (K, L0) { return [{ m: K.jacket, g: TLXL.loft(limbSecs(L0, [[0, 0.064, 0.066], [0.1, 0.069, 0.071], [0.5, 0.062, 0.064], [0.9, 0.056, 0.058], [1, 0.054, 0.056]]), { axis: "z", uv: R_UP, roundBottom: 0.05, roundTop: 0.03, seg: L() ? 10 : 16 }) }]; };
  F.fore = function (K, L0) { return [{ m: K.jacket, g: TLXL.loft(limbSecs(L0, [[0, 0.058, 0.06], [0.15, 0.063, 0.066], [0.5, 0.057, 0.059], [0.85, 0.052, 0.054], [1, 0.057, 0.058]]), { axis: "z", uv: R_FO, roundBottom: 0.04, cap: "t", seg: L() ? 10 : 16 }) }]; };
  // second-tone elbow / knee patches and trim bands, built to ride on a limb (same axis, same L0)
  F.elbow = function (K, L0, upper) { const f = upper ? [0.72, 1] : [0, 0.22], tab = upper ? [[0.72, 0.062, 0.064], [1, 0.058, 0.06]] : [[0, 0.058, 0.06], [0.22, 0.063, 0.066]];
    return [{ m: K.panel, g: TLXL.loft(limbSecs(L0, tab), { axis: "z", a0: PI * 0.62, a1: PI * 1.38, inflate: 0.004, uv: upper ? R_UP : R_FO, seg: 6 }) }]; };
  F.kneePad = function (K, L0) { return [{ m: K.panel, g: TLXL.loft(limbSecs(L0, [[0.02, 0.07, 0.08], [0.1, 0.082, 0.095], [0.2, 0.075, 0.09], [0.3, 0.06, 0.082]]), { axis: "z", a0: -1.0, a1: 1.0, inflate: 0.006, uv: R_FO, seg: 8, roundBottom: 0.02, roundTop: 0.02 }) }]; };
  F.band = function (K, r, w, mat) { return [{ m: mat || K.reflect, g: TLXL.xf(TLXL.lathe([[r, -w / 2], [r + 0.004, -w / 2 + 0.002], [r + 0.004, w / 2 - 0.002], [r, w / 2]], L() ? 12 : 18), { rx: PI / 2 }) }]; };   // ring round a z-axis limb
  F.furCollar = function (K) { return [{ m: K.fur, g: TLXL.loft([S(0.5, 0.13, 0.115), S(0.55, 0.15, 0.13), S(0.6, 0.145, 0.125), S(0.64, 0.12, 0.105), S(0.62, 0.1, 0.09)], { uv: [0, 0, 2, 1], seg: L() ? 12 : 18 }) }]; };
  F.neck = function (K) { return [{ m: K.mask, g: TLXL.loft([S(0.53, 0.062, 0.066), S(0.6, 0.056, 0.06), S(0.66, 0.054, 0.06, 0.004)], { uv: [0, 0, 2, 1], cap: "t", seg: 10 }) }]; };

  /* ---------------- hands ---------------- */
  // hand frame: wrist at -z, fingers +z, the back of the hand +y, the thumb on -sx (+x for 'open'); the grip axis through the origin.
  F.hand = function (K, kind, sx, k) {
    k = k || 1; sx = sx || 1; const M = K.glove, it = [], mitt = /itt/.test(kind), fist = kind === "fist" || kind === "mitt", rel = kind.indexOf("relaxed") === 0, lite = L();
    const sec = (z, rx, rz, cz) => S(z * k, rx * k, rz * k, (cz || 0) * k), tb = (pts, r) => TLXL.tube(pts.map(p => [p[0] * k, p[1] * k, p[2] * k]), r * k, { n: 8, seg: lite ? 4 : 6 });
    const palm = fist ? [sec(-0.105, 0.04, 0.022, 0.054), sec(-0.07, 0.046, 0.025, 0.038), sec(-0.035, 0.048, 0.024, 0.02)] : [sec(-0.115, 0.042, 0.02), sec(-0.07, 0.047, 0.024), sec(-0.02, 0.049, 0.021), sec(0.0, 0.047, 0.017)];
    it.push({ m: M, g: TLXL.loft(palm, { axis: "z", roundBottom: 0.015 * k, roundTop: fist ? 0.01 : 0.012 * k, seg: lite ? 8 : 12 }) });
    const gt = fist ? [sec(-0.175, 0.058, 0.056, 0.068), sec(-0.14, 0.066, 0.062, 0.06), sec(-0.1, 0.07, 0.06, 0.05), sec(-0.075, 0.06, 0.044, 0.04)] : [sec(-0.18, 0.058, 0.056), sec(-0.145, 0.066, 0.062), sec(-0.105, 0.07, 0.06), sec(-0.075, 0.06, 0.044)];
    it.push({ m: M, g: TLXL.loft(gt, { axis: "z", roundBottom: 0.01, seg: lite ? 8 : 14 }) });                                  // gauntlet over the sleeve
    const lens = [0.082, 0.088, 0.078, 0.062], xs = [0.033, 0.011, -0.011, -0.033].map(x => -sx * x);
    if (fist && !mitt) lens.forEach((len, i) => {
      const rr = 0.036, a0 = -1.22, a1 = a0 + len * 1.35 / rr, pts = []; for (let j = 0; j <= 5; j++) { const a = a0 + (a1 - a0) * j / 5; pts.push([xs[i], rr * Math.cos(a), rr * Math.sin(a)]); }
      it.push({ m: M, g: tb(pts, 0.0113) });
    });
    else if (fist) for (const x of [-0.021, 0.021]) { const rr = 0.04, pts = []; for (let j = 0; j <= 5; j++) { const a = -1.15 + j * 0.62; pts.push([x, rr * Math.cos(a), rr * Math.sin(a)]); } it.push({ m: M, g: tb(pts, 0.0245) }); }
    else if (rel && !mitt) lens.forEach((len, i) => it.push({ m: M, g: tb([[xs[i], 0.002, 0], [xs[i], -0.006, len * 0.5], [xs[i], -0.024, len * 0.86], [xs[i], -0.046, len * 0.95]], 0.0115) }));
    else if (rel) for (const x of [-0.021, 0.021]) it.push({ m: M, g: tb([[x, 0.002, 0], [x, -0.008, 0.045], [x, -0.03, 0.075], [x, -0.052, 0.078]], 0.0245) });
    else if (!mitt) lens.forEach((len, i) => it.push({ m: M, g: tb([[xs[i] * 1.0, 0, 0], [xs[i] * 1.05, 0, len * 0.5], [xs[i] * 1.1, 0, len]], 0.0115) }));
    else { it.push({ m: M, g: TLXL.loft([sec(0.0, 0.05, 0.018), sec(0.05, 0.052, 0.018), sec(0.1, 0.044, 0.016)], { axis: "z", roundTop: 0.02, seg: 10 }) }); }
    if (kind.indexOf("open") === 0) it.push({ m: M, g: tb([[0.05, -0.008, -0.07], [0.078, -0.008, -0.03], [0.083, -0.006, 0.014]], 0.0185) });
    else if (fist) it.push({ m: M, g: tb([[-sx * 0.04, 0.02, -0.05], [-sx * 0.049, 0.036, -0.01], [-sx * 0.05, 0.046, 0.03]], mitt ? 0.021 : 0.0175) });
    else it.push({ m: M, g: tb([[-sx * 0.036, -0.004, -0.06], [-sx * 0.052, -0.012, -0.02], [-sx * 0.054, -0.024, 0.02]], mitt ? 0.021 : 0.0175) });
    return it;
  };

  /* ---------------- boots ---------------- */
  F.boot = function (K, kind, ankH) {
    const arc = kind === "arctic", up = arc ? K.bootA : K.boot, w = arc ? 1.1 : 1, wx = arc ? 1.0 : 0.88, it = [], lite = L(), sec = (z, rx, rz, cz) => S(z, rx * wx, rz * w, cz);
    const foot = [sec(-0.105, 0.047, 0.045, 0.06), sec(-0.07, 0.06, 0.062, 0.066), sec(0.0, 0.062, 0.05, 0.062), sec(0.08, 0.058, 0.046, 0.06), sec(0.15, 0.054, 0.04, 0.054), sec(0.21, 0.04, 0.03, 0.047), sec(0.235, 0.022, 0.02, 0.042)];
    foot.forEach(s => s.n = 2.6);
    it.push({ m: up, g: TLXL.loft(foot, { axis: "z", seg: lite ? 10 : 16, roundBottom: 0.012, roundTop: 0.01 }) });
    const top = ankH + (arc ? 0.1 : 0.045);
    it.push({ m: up, g: TLXL.loft([S(0.05, 0.068 * wx, 0.082 * w, -0.004), S(ankH, 0.067 * wx, 0.077 * w, -0.006), S(top, 0.07 * wx, 0.079 * w, -0.006)], { uv: [0, 0, 1, 1], seg: lite ? 10 : 16, cap: "t" }) });
    it.push({ m: K.sole, g: TLXL.loft([S(-0.108, 0.05 * w, 0.019, 0.019, 3), S(-0.08, 0.061 * w, 0.019, 0.019, 3), S(0.0, 0.064 * w, 0.019, 0.019, 3), S(0.12, 0.06 * w, 0.019, 0.019, 3), S(0.19, 0.054 * w, 0.019, 0.019, 3), S(0.232, 0.04 * w, 0.019, 0.019, 3)], { axis: "z", seg: lite ? 10 : 16, roundBottom: 0.012, roundTop: 0.012, uv: [0, 0, 1, 1] }) });
    it.push({ m: K.sole, g: TLXL.xf(TLXL.rbox(0.1 * w, 0.034, 0.07, 0.012, 2), { y: 0.017, z: -0.07 }) });                                             // heel step
    it.push({ m: K.sole, g: TLXL.loft(foot.slice(4).map(s => Object.assign({}, s)), { axis: "z", a0: -1.6, a1: 1.6, inflate: 0.005, seg: 8, roundTop: 0.01, uv: [0.3, 0, 0.7, 0.2] }) });      // toe cap
    if (!lite) {
      it.push({ m: K.dark, g: TLXL.loft(foot.slice(1, 4).map(s => Object.assign({}, s)), { axis: "z", a0: -0.42, a1: 0.42, inflate: 0.006, seg: 5, uv: [0.4, 0.2, 0.6, 0.4] }) });   // lace panel
      for (let i = 0; i < 5; i++) { const z = -0.015 + i * 0.026; it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.07 * w, 0.005, 0.008, 0.002, 1), { y: 0.104 - Math.max(0, z) * 0.12 + 0.008, z, rx: -0.1 }) }); }
      it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.04 * w, 0.03, 0.012, 0.005, 1), { y: ankH * 0.8, z: -0.082 }) });                                  // heel pull tab
    }
    return it;
  };

  /* ---------------- heads ---------------- */
  // head-centre origin, +z the way the face points. Crown at +0.115, chin at -0.118, face front about +0.105.
  F.face = function (K, o) {
    o = o || {}; const it = [], lite = L(), E = TLXL.ell;
    it.push({ m: K.skin, g: TLXL.loft([S(-0.108, 0.018, 0.028, 0.062), S(-0.092, 0.042, 0.05, 0.05), S(-0.065, 0.062, 0.075, 0.028), S(-0.028, 0.074, 0.092, 0.008), S(0.01, 0.076, 0.096, 0), S(0.06, 0.075, 0.095, -0.003), S(0.095, 0.066, 0.086, -0.01), S(0.115, 0.04, 0.06, -0.012)], { roundTop: 0.018, seg: lite ? 12 : 20, uv: [0, 0, 1, 1] }) });
    it.push({ m: K.skin, g: TLXL.xf(E(0.0135, 0.026, 0.03), { y: -0.026, z: 0.1, rx: 0.35 }) });                                   // nose
    it.push({ m: K.skin, g: TLXL.xf(E(0.062, 0.013, 0.022), { y: 0.034, z: 0.083 }) });                                           // brow
    for (const s of [-1, 1]) { it.push({ m: K.skin, g: TLXL.xf(E(0.022, 0.017, 0.024), { x: s * 0.05, y: -0.025, z: 0.068 }) }); it.push({ m: K.skin, g: TLXL.xf(E(0.008, 0.03, 0.02), { x: s * 0.077, y: -0.012, z: -0.006, rz: s * 0.12 }) }); }   // cheeks, ears
    if (o.features !== false) {
      for (const s of [-1, 1]) {
        it.push({ m: K.eye, g: TLXL.xf(E(0.0105, 0.0075, 0.008), { x: s * 0.032, y: 0.016, z: 0.087 }) }); it.push({ m: K.feat, g: TLXL.xf(E(0.0052, 0.0052, 0.004), { x: s * 0.032, y: 0.016, z: 0.0945 }) });
        it.push({ m: K.feat, g: TLXL.xf(E(0.022, 0.004, 0.007), { x: s * 0.034, y: 0.037, z: 0.091, rz: s * -0.15 }) });
      }
      it.push({ m: K.feat, g: TLXL.tube([[-0.024, -0.063, 0.082], [0, -0.067, 0.092], [0.024, -0.063, 0.082]], 0.0042, { n: 6, seg: 4 }) });    // mouth line
    }
    return it;
  };
  F.liner = function (K) {                           // the dark inside of a helmet: nothing of the face shows through the visor
    return [{ m: K.dark, g: TLXL.loft([S(-0.118, 0.018, 0.028, 0.062), S(-0.1, 0.04, 0.048, 0.05), S(-0.07, 0.06, 0.073, 0.028), S(-0.03, 0.072, 0.09, 0.008), S(0.01, 0.074, 0.094, 0), S(0.06, 0.073, 0.093, -0.003), S(0.095, 0.064, 0.084, -0.01), S(0.115, 0.04, 0.06, -0.012)], { roundTop: 0.018, seg: L() ? 10 : 14 }) }];
  };
  F.helmet = function (K) {
    const lite = L(), it = [], vis = [], sg = lite ? 12 : 18, pk = (y, rx, rz, cz) => S(y, rx, rz, cz);
    const dome = [pk(-0.05, 0.099, 0.122, -0.012), pk(0.0, 0.104, 0.126, -0.014), pk(0.06, 0.1, 0.122, -0.012), pk(0.105, 0.082, 0.104, -0.01), pk(0.135, 0.052, 0.072, -0.008)];
    it.push({ m: K.helmet, g: TLXL.loft(dome, { seg: sg, roundTop: 0.016, uv: [0, 0, 1, 1] }) });
    it.push({ m: K.helmet, g: TLXL.loft([pk(-0.112, 0.07, 0.092, -0.014), pk(-0.085, 0.088, 0.112, -0.014), pk(-0.05, 0.099, 0.122, -0.012)], { seg: sg, a0: 0.55, a1: TAU - 0.55, uv: [0, 0, 1, 1] }) });          // cheeks and neck roll
    it.push({ m: K.helmet, g: TLXL.loft([pk(-0.128, 0.04, 0.06, 0.082), pk(-0.105, 0.07, 0.092, 0.05), pk(-0.075, 0.088, 0.115, 0.012), pk(-0.045, 0.098, 0.124, -0.008)], { seg: 10, a0: -0.95, a1: 0.95, uv: [0, 0, 1, 1] }) });   // chin bar
    it.push({ m: K.trim, g: TLXL.loft(dome.concat([pk(0.151, 0.02, 0.03, -0.006)]), { seg: 2, a0: -0.13, a1: 0.13, inflate: 0.004, uv: [0.2, 0, 0.8, 1] }) });
    it.push({ m: K.trim, g: TLXL.loft(dome.concat([pk(0.151, 0.02, 0.03, -0.006)]), { seg: 2, a0: PI - 0.13, a1: PI + 0.13, inflate: 0.004, uv: [0.2, 0, 0.8, 1] }) });
    vis.push({ m: K.visor, g: TLXL.loft([pk(-0.042, 0.1065, 0.1295, -0.014), pk(0.0, 0.1085, 0.1305, -0.014), pk(0.045, 0.1075, 0.1285, -0.013), pk(0.082, 0.1, 0.12, -0.012)], { seg: 12, a0: -1.2, a1: 1.2, uv: [0, 0, 1, 1] }) });
    for (const y of [-0.052, 0.082]) it.push({ m: K.dark, g: TLXL.loft([pk(y - 0.007, 0.104, 0.1285, -0.014), pk(y + 0.007, 0.104, 0.1285, -0.014)], { seg: 10, a0: -1.3, a1: 1.3, inflate: 0.003, uv: [0, 0, 1, 0.1] }) });   // visor frame
    it.push({ m: K.helmet, g: TLXL.xf(TLXL.rbox(0.15, 0.008, 0.06, 0.004), { y: 0.104, z: 0.108, rx: -0.22 }) });                                                                              // peak
    if (!lite) {
      for (const s of [-1, 1]) {
        it.push({ m: K.dark, g: TLXL.xf(TLXL.ell(0.011, 0.011, 0.007), { x: s * 0.108, y: 0.02, z: 0.0 }) });                                                                                // visor pivot
        for (let i = 0; i < 3; i++) it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.022, 0.004, 0.006, 0.0015, 1), { x: s * 0.03, y: -0.094 - i * 0.008, z: 0.1 - i * 0.016, rx: 0.5 }) });             // chin vents
        it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.012, 0.006, 0.05, 0.003, 1), { x: s * 0.03, y: 0.14, z: 0.03, rx: 0.5 }) });
      }
      it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.05, 0.008, 0.012, 0.003, 1), { y: -0.13, z: 0.07, rx: -0.4 }) });                                                                       // breath guard
    }
    return { shell: it, visor: vis };
  };
  F.goggles = function (K) {
    const lite = L(), it = [], lens = [], p = (y, rx, rz, cz) => S(y, rx, rz, cz);
    lens.push({ m: K.gog, g: TLXL.loft([p(-0.004, 0.0955, 0.1155, -0.011), p(0.026, 0.0975, 0.1185, -0.011), p(0.056, 0.0955, 0.1155, -0.011)], { seg: 12, a0: -1.0, a1: 1.0, uv: [0, 0, 1, 1] }) });
    for (const y of [-0.01, 0.062]) it.push({ m: K.dark, g: TLXL.loft([p(y - 0.0055, 0.095, 0.1145, -0.011), p(y + 0.0055, 0.095, 0.1145, -0.011)], { seg: 10, a0: -1.1, a1: 1.1, inflate: 0.004, uv: [0, 0, 1, 0.1] }) });
    for (const s of [-1, 1]) it.push({ m: K.dark, g: TLXL.loft([p(-0.0055, 0.095, 0.1145, -0.011), p(0.058, 0.095, 0.1145, -0.011)], { seg: 3, a0: s * 1.0 - 0.06, a1: s * 1.0 + 0.06, inflate: 0.004, uv: [0, 0, 0.1, 1] }) });
    it.push({ m: K.dark, g: TLXL.loft([p(0.004, 0.098, 0.118, -0.011), p(0.05, 0.098, 0.118, -0.011)], { seg: lite ? 14 : 22, a0: 1.05, a1: TAU - 1.05, inflate: 0.004, uv: [0, 0, 1, 1] }) });   // strap round the head
    it.push({ m: K.dark, g: TLXL.xf(TLXL.rbox(0.03, 0.026, 0.02, 0.008), { y: 0.0, z: 0.11 }) });                                                                                 // nose bridge
    return { frame: it, lens };
  };
  F.beanie = function (K) {
    const lite = L(), p = (y, rx, rz, cz) => S(y, rx, rz, cz), it = [];
    it.push({ m: K.beanie, g: TLXL.loft([p(0.01, 0.089, 0.106, -0.012), p(0.026, 0.093, 0.11, -0.012), p(0.045, 0.09, 0.106, -0.012), p(0.08, 0.084, 0.101, -0.012), p(0.115, 0.07, 0.088, -0.012), p(0.135, 0.04, 0.056, -0.012)], { seg: lite ? 14 : 22, roundTop: 0.016, uv: [0, 0, 2, 2] }) });
    it.push({ m: K.beanie, g: TLXL.xf(TLXL.ell(0.034, 0.03, 0.034), { y: 0.165, z: -0.012 }) });
    return it;
  };
  F.balaclava = function (K) {
    const lite = L(), p = (y, rx, rz, cz) => S(y, rx, rz, cz), it = [];
    it.push({ m: K.mask, g: TLXL.loft([p(-0.15, 0.06, 0.066, -0.01), p(-0.118, 0.052, 0.062, 0.03), p(-0.09, 0.068, 0.088, 0.03), p(-0.05, 0.08, 0.1, 0.006), p(0.01, 0.083, 0.102, -0.002), p(0.06, 0.081, 0.1, -0.004), p(0.095, 0.072, 0.09, -0.01), p(0.118, 0.045, 0.062, -0.012)], { seg: lite ? 14 : 22, roundTop: 0.02, uv: [0, 0, 2, 2] }) });
    it.push({ m: K.mask, g: TLXL.xf(TLXL.ell(0.015, 0.026, 0.03), { y: -0.028, z: 0.1, rx: 0.35 }) });
    return it;
  };
})();
