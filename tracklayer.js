// Tracklayer — game code. Loaded by index.html after three.js.
(() => {
"use strict";
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------------- noise ---------------- */
function hash(ix, iy) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vn(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vn(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= 0.5; f *= 2.03; } return s / n; }
function ridged(x, y, o) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { let r = 1 - Math.abs(vn(x * f + i * 5.7, y * f + i * 3.3) * 2 - 1); r *= r; s += a * r; n += a; a *= 0.5; f *= 2.1; } return s / n; }
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- world constants: the Nordkinn peninsula, Finnmark ---------------- */
// North is -z, east is +x. 8.2 km a side. Kjøllefjord sits at the head of its fjord on the west
// coast; the Barents Sea runs across the north, Laksefjorden down the west edge and Tanafjorden
// down the east. The interior is the bare Nordkinn plateau. Birch only grows in the sheltered
// valleys down south, around Lebesby and Ifjord.
const WORLD = 8192, HALF = 4096, GRES = 4, GN = WORLD / GRES + 1;   // coarse terrain grid (4 m)
const CELL = 0.25, FN = WORLD / CELL;   // 32768 fine cells per side                                // fine snow grid (25 cm)
const SEA = 0;                                                       // sea level: the fjords never freeze
const ground = new Float32Array(GN * GN), freshG = new Float32Array(GN * GN), bio = new Uint8Array(GN * GN); // bio: 0 open fell, 1 lake ice, 2 birch, 3 sea
// lake ice: which lake a cell belongs to (LAKES index + 1) and how far out from its middle it sits (0 centre .. 255 shore). The melt opens lakes from the shore in.
const lakeId = new Uint8Array(GN * GN), lakeT = new Uint8Array(GN * GN);
// where the peninsula pushes out into the sea beyond the main body
const LOBES = [
  { x: -350, z: -3500, r: 850, a: 0.5 },     // Kinnarodden, the north tip
  { x: 750, z: -3150, r: 700, a: 0.34 },     // the Mehamn headland
  { x: 2700, z: -3050, r: 820, a: 0.5 },     // the Gamvik / Slettnes corner
  { x: 3000, z: 700, r: 750, a: 0.34 },      // the Skjånes side
  { x: -1900, z: 2300, r: 700, a: 0.18 },    // the Lebesby shore
  { x: -2000, z: -2300, r: 800, a: 0.3 }     // the Dyfjord headland north of the fjord
];
// Kjøllefjorden, mouth to quay
const FJORD = [[-4200, -2900], [-3200, -2150], [-2250, -1250], [-1600, -560]];
// small bays scooped out of the coast so each village has a harbour in front of it
const BAYS = [[-2500, -2250, 260], [650, -3350, 240], [2050, -3650, 260], [3700, 650, 260], [-3600, 1450, 260], [-3250, 3800, 300]];
// the villages: a flat shelf at each so the houses sit on level ground near the water
const SHELF = [
  { x: -1180, z: -330, h: 9, r: 400 },    // Kjøllefjord
  { x: -2250, z: -2050, h: 8, r: 240 },   // Dyfjord
  { x: 650, z: -3150, h: 8, r: 300 },     // Mehamn
  { x: 2250, z: -3350, h: 7, r: 260 },    // Gamvik
  { x: 2750, z: -3560, h: 6, r: 200 },    // Slettnes
  { x: 3450, z: 650, h: 8, r: 240 },      // Skjånes
  { x: -3050, z: 1450, h: 9, r: 300 },    // Lebesby
  { x: -2450, z: 3500, h: 10, r: 320 }    // Ifjord
];
const LAKES = [
  { x: 300, z: -900, r: 330 }, { x: -700, z: -1500, r: 250 }, { x: 1500, z: -1800, r: 260 },
  { x: 900, z: 300, r: 300 }, { x: -300, z: 900, r: 220 }, { x: 2100, z: -500, r: 200 },
  { x: 1700, z: 1400, r: 260 }, { x: -1500, z: 900, r: 210 }, { x: 600, z: 2100, r: 240 },
  { x: -900, z: 2600, r: 170 }, { x: 2600, z: 1900, r: 180 }, { x: 1100, z: -2600, r: 190 },
  { x: -1500, z: -1100, r: 160 }, { x: 2200, z: 2800, r: 220 }, { x: -200, z: 3300, r: 200 }
];
const SPAWN = { x: -30, z: 200, yaw: Math.PI * 0.92 };

function segDist(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
  const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / L2, 0, 1);
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function fjordDist(x, z) { let d = 1e9; for (let i = 0; i < FJORD.length - 1; i++) d = Math.min(d, segDist(x, z, FJORD[i], FJORD[i + 1])); return d; }
// land field: above zero is land, below is sea. Roughly 1 in the middle of the plateau.
// the coastline is low-frequency, so it is sampled on a 16 m grid and interpolated
const LGRES = 16, LGN = WORLD / LGRES + 1, landG = new Float32Array(LGN * LGN * 2);
const LF = { lobe: 0 };
function landF(x, z) {
  const nx = x / HALF, nz = z / HALF;
  let b = 1.02 - Math.hypot((nx - 0.02) * 1.12, (nz - 0.28) * 0.92), lobe = 0;
  const wob = 0.75 + 0.5 * fbm(x / 520 + 7, z / 520 - 3, 2);
  for (const L of LOBES) { const d = Math.hypot(x - L.x, z - L.z); if (d < L.r * 1.4) lobe += L.a * (1 - sstep(0.35, 1.1, d / (L.r * wob))); }
  b += lobe + (fbm(x / 1100 + 3, z / 1100 - 8, 4) - 0.5) * 0.5 + (fbm(x / 260 - 5, z / 260 + 2, 2) - 0.5) * 0.14;
  const fd = fjordDist(x, z), fw = 150 + 130 * sstep(-600, -2800, z);     // the fjord widens toward its mouth
  b -= 0.7 * (1 - sstep(fw, fw + 330, fd));
  for (const B of BAYS) b -= 0.16 * (1 - sstep(B[2] * 0.6, B[2] * 2.0, Math.hypot(x - B[0], z - B[1])));
  LF.lobe = lobe;
  return b;
}
function landAt(x, z) {
  let gx = clamp((x + HALF) / LGRES, 0, LGN - 1.001), gz = clamp((z + HALF) / LGRES, 0, LGN - 1.001);
  const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz, i = (iz * LGN + ix) * 2, j = i + LGN * 2;
  const a = landG[i], b = landG[i + 2], c = landG[j], d = landG[j + 2];
  const la = landG[i + 1], lb = landG[i + 3], lc = landG[j + 1], ld = landG[j + 3];
  LF.lobe = la + (lb - la) * fx + (lc - la) * fz + (la - lb - lc + ld) * fx * fz;
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
function baseH(x, z) {
  const b = landAt(x, z);
  if (b <= 0) return -3 + b * 60;                                        // sea floor, sloping away from the shore
  // the fell: a plateau that climbs from the coast, rough on top. The lobes push the coast out but stay low.
  const hb = Math.max(b - 0.6 * LF.lobe, b * 0.3);
  let h = 440 * Math.pow(hb, 1.35) + (fbm(x / 420 + 11, z / 420 - 7, 4) - 0.5) * 70 * sstep(0.08, 0.5, hb) + (fbm(x / 110, z / 110, 3) - 0.5) * 13;
  // Ifjordfjellet: the ridge across the south-west that cuts Ifjord off from the coast
  const m = sstep(1300, 2200, z) * sstep(600, -600, x) * sstep(3900, 3000, z);
  if (m > 0) h += m * (50 + Math.pow(ridged(x / 620 + 3.1, z / 620 - 1.7, 5), 1.6) * 230);
  // sea cliffs where the coast is steep, softened where a village needs a beach
  const cliff = sstep(0.02, 0.09, b) * (1 - sstep(0.09, 0.2, b));
  if (cliff > 0) h += cliff * 18 * ridged(x / 200, z / 200, 3);
  for (const s of SHELF) { const d = Math.hypot(x - s.x, z - s.z); if (d < s.r * 1.7) h = lerp(s.h + (fbm(x / 60, z / 60, 2) - 0.5) * 2.5, h, sstep(s.r * 0.55, s.r * 1.7, d)); }
  return Math.max(h, 0.6);
}
function sampleG(arr, x, z) {
  let gx = (x + HALF) / GRES, gz = (z + HALF) / GRES;
  gx = clamp(gx, 0, GN - 1.001); gz = clamp(gz, 0, GN - 1.001);
  const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz, i = iz * GN + ix;
  const a = arr[i], b = arr[i + 1], c = arr[i + GN], d = arr[i + GN + 1];
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
const groundAt = (x, z) => sampleG(ground, x, z);
function bioAt(x, z) { const i = clamp(Math.round((x + HALF) / GRES), 0, GN - 1), j = clamp(Math.round((z + HALF) / GRES), 0, GN - 1); return bio[j * GN + i]; }
const isSea = (x, z) => bioAt(x, z) === 3;

function genWorld() {
  for (let j = 0; j < LGN; j++) for (let i = 0; i < LGN; i++) { const k = (j * LGN + i) * 2; landG[k] = landF(i * LGRES - HALF, j * LGRES - HALF); landG[k + 1] = LF.lobe; }
  for (const L of LAKES) {
    let lv = baseH(L.x, L.z);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; lv = Math.min(lv, baseH(L.x + Math.cos(a) * L.r * 1.1, L.z + Math.sin(a) * L.r * 1.1)); }
    L.lv = lv - 2; L.ok = lv > 14;                                     // a lake that would sit in the sea is skipped
  }
  for (let j = 0; j < GN; j++) {
    const z = j * GRES - HALF;
    for (let i = 0; i < GN; i++) {
      const x = i * GRES - HALF;
      let h = baseH(x, z), b = 0;
      if (h < SEA) b = 3;
      else for (let li = 0; li < LAKES.length; li++) {
        const L = LAKES[li];
        if (!L.ok) continue;
        const dx = x - L.x, dz = z - L.z, dd = Math.sqrt(dx * dx + dz * dz);
        if (dd > L.r * 1.7) continue;
        const t = dd / (L.r * (0.76 + 0.48 * fbm(x / 170 + L.x, z / 170, 3)));
        const mk = 1 - sstep(0.85, 2.1, t);
        h += (L.lv - h) * mk;
        if (t < 0.97) { b = 1; lakeId[j * GN + i] = li + 1; lakeT[j * GN + i] = Math.min(255, Math.round(t / 0.97 * 255)); }
      }
      ground[j * GN + i] = h; bio[j * GN + i] = b;
    }
  }
  for (let j = 0; j < GN; j++) {
    const z = j * GRES - HALF;
    for (let i = 0; i < GN; i++) {
      const x = i * GRES - HALF, k = j * GN + i;
      const i0 = Math.max(0, i - 1), i1 = Math.min(GN - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(GN - 1, j + 1);
      const gx = (ground[j * GN + i1] - ground[j * GN + i0]) / ((i1 - i0) * GRES);
      const gz = (ground[j1 * GN + i] - ground[j0 * GN + i]) / ((j1 - j0) * GRES);
      const s = Math.sqrt(gx * gx + gz * gz), h = ground[k];
      let d;
      if (bio[k] === 3) d = 0;
      else if (bio[k] === 1) d = 0.05;
      else {
        // deep in the sheltered valleys, scoured thin and hard up on the exposed fell
        const scour = sstep(120, 300, h) * (0.45 + 0.55 * fbm(x / 240 + 9, z / 240 + 4, 2));
        d = 0.42 + 0.5 * sstep(-2, 30, h) * (1 - scour) + 0.1 * sstep(40, 200, h);
        d *= 1 - sstep(0.62, 1.0, s);
        d *= sstep(0.5, 3.5, h);                                     // the tideline is bare rock and shingle
        const shelter = sstep(500, 1500, z) * sstep(2200, 600, x) * (1 - sstep(130, 200, h));
        if (shelter > 0.25 && s < 0.5) { const fd = fbm(x / 300 + 40, z / 300 - 3, 3); if (fd > 0.46 && fd * shelter > 0.28) { bio[k] = 2; d *= 0.9; } }
      }
      freshG[k] = d;
    }
  }
}

/* ---------------- deformable snow (sparse chunks of 32x32 cells) ---------------- */
const CH = 32, CPR = FN / CH;
const chunks = new Array(CPR * CPR);
const activeChunks = []; let refillIdx = 0, gameClock = 0;
// the winter snowpack at a fine cell, before any melt
function freshBase(ix, iz) {
  const x = ix * CELL - HALF, z = iz * CELL - HALF;
  let d = sampleG(freshG, x, z);
  if (d > 0.1) d += (vn(x / 7 + 3, z / 7) - 0.5) * 0.34 * Math.min(1, d * 2) + (vn(x / 1.9, z / 1.9 + 5) - 0.5) * 0.07;
  else d += vn(x / 2.3, z / 2.3) * 0.025;
  return d < 0 ? 0 : d;
}
// what's left of it today (the spring melt thins it and opens bare ground; see MELT)
function freshCell(ix, iz) { const d = freshBase(ix, iz); return MELT.kq > 0 && d > 0 ? d * meltMul(ix * CELL - HALF, iz * CELL - HALF) : d; }
function getChunk(cx, cz) {
  const key = cz * CPR + cx;
  let c = chunks[key];
  if (!c) {
    c = { d: new Float32Array(CH * CH), f: new Float32Array(CH * CH), b: new Float32Array(CH * CH) };
    const melt = MELT.kq > 0;
    for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) {
      const b = freshBase(cx * CH + i, cz * CH + j), v = melt && b > 0 ? b * meltMul((cx * CH + i) * CELL - HALF, (cz * CH + j) * CELL - HALF) : b;
      c.b[j * CH + i] = b; c.f[j * CH + i] = v; c.d[j * CH + i] = v;
    }
    chunks[key] = c; c.key = key; c.cx = cx; c.cz = cz; c.t = gameClock; c.mk = MELT.kq; activeChunks.push(c);
  }
  return c;
}
function depthAt(ix, iz) {
  ix = clamp(ix, 0, FN - 1); iz = clamp(iz, 0, FN - 1);
  const c = chunks[(iz >> 5) * CPR + (ix >> 5)];
  return c ? c.d[(iz & 31) * CH + (ix & 31)] : freshCell(ix, iz);
}
function freshAt(ix, iz) {
  ix = clamp(ix, 0, FN - 1); iz = clamp(iz, 0, FN - 1);
  const c = chunks[(iz >> 5) * CPR + (ix >> 5)];
  return c ? c.f[(iz & 31) * CH + (ix & 31)] : freshCell(ix, iz);
}
function surf(x, z) {
  const fx = (x + HALF) / CELL, fz = (z + HALF) / CELL;
  const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
  const a = depthAt(ix, iz), b = depthAt(ix + 1, iz), c = depthAt(ix, iz + 1), d = depthAt(ix + 1, iz + 1);
  return groundAt(x, z) + a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
}
const smoothSurf = (x, z) => groundAt(x, z) + sampleG(freshG, x, z) * 0.4;
// Open water. Carry enough speed and a sled planes across the fjord like a skipped stone: the track
// throws water back hard enough to hold the whole machine up. Drop under planing speed and it
// settles in, the drag climbs, it settles further. Pin it and you can claw back up; let off and it's gone.
const VPLANE = 12.5;                                                   // m/s, about 28 mph, to stay up
// The water under the sled: the sea, or (in the melt) a lake that has opened up. Its level lives in P.wl.
const waterLine = (w = P.wl) => w - 0.12 - P.sink * 0.5;             // the sled sits lower as it bogs
function wlvAt(x, z) {                                                 // water surface here, or null for dry land / ice
  const i = clamp(Math.round((x + HALF) / GRES), 0, GN - 1), j = clamp(Math.round((z + HALF) / GRES), 0, GN - 1), k = j * GN + i, b = bio[k];
  if (b === 3) return SEA;
  if (b === 1 && MELT.kq > 0) { const L = LKS[lakeId[k] - 1]; if (L && (lakeT[k] > L.thr || (MELT.holes.size && MELT.holes.has(k)))) return L.W; }
  return null;
}
const isWater = (x, z) => wlvAt(x, z) !== null;
const rideSurf = (x, z) => { const s = surf(x, z), w = wlvAt(x, z); return w === null ? s : Math.max(s, waterLine(w)); };
const smoothRide = (x, z) => { const s = smoothSurf(x, z), w = wlvAt(x, z); return w === null ? s : Math.max(s, waterLine(w)); };

/* ---------------- three.js setup ---------------- */
const canvas = $("gl");
// Graphics profile. Phones and tablets get "low" unless Settings says otherwise: no MSAA, a smaller
// hard-edged shadow map drawn every other frame, shorter tree and terrain draw distance behind a
// touch more fog, and a render scale that drops on its own when the frame rate does.
const GFX = (() => {
  let pick = "auto"; try { pick = (JSON.parse(localStorage.getItem("tracklayer.set.v1") || "{}").gfx) || "auto"; } catch (e) { }
  const touchy = (window.matchMedia && matchMedia("(pointer: coarse)").matches) || navigator.maxTouchPoints > 1;
  const q = /[?&]gfx=low\b/.test(location.search) ? "low" : /[?&]gfx=high\b/.test(location.search) ? "high" : pick === "auto" ? (touchy ? "low" : "high") : pick;
  const low = q === "low", dpr = window.devicePixelRatio || 1;
  return { pick, low, prMax: Math.min(dpr, low ? 1.25 : 1.5), prMin: low ? 0.55 : 0.75, pr: Math.min(dpr, low ? 1 : 1.5),
    treeR: low ? 750 : 1700, farR: low ? 1500 : 2600, fogK: low ? 1.3 : 1, shadowEvery: low ? 2 : 1, recStep: low ? 32 : 16 };
})();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !GFX.low, powerPreference: "high-performance" });
renderer.setPixelRatio(GFX.pr);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = GFX.low ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;

const scene = new THREE.Scene();
const FOG = new THREE.Color(0xc4d3e2);
scene.fog = new THREE.FogExp2(FOG, 0.0017);
scene.background = FOG;
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 12000);
camera.rotation.order = "YXZ";

const sunDir = new THREE.Vector3(-0.55, 0.3, 0.78).normalize();
const hemi = new THREE.HemisphereLight(0xbcd4ec, 0xe9eef5, 0.62); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd6ae, 1.75);
sun.castShadow = true;
sun.shadow.mapSize.set(GFX.low ? 1024 : 2048, GFX.low ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 500 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

// sky dome. Every colour here is fed per frame by updSky() from the sun's real elevation, so the sky
// walks through low winter sun, sunset, blue hour and night instead of flipping between two looks.
const sky = new THREE.Mesh(new THREE.SphereGeometry(8000, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uSun: { value: new THREE.Vector3(0, 0.2, 1) }, uMoon: { value: new THREE.Vector3(0, -1, 0) }, uMoonI: { value: 0 },
    uZen: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uHorA: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() }, uStorm: { value: 0 }, uFog: { value: new THREE.Color(0xc4d3e2) }, uTime: { value: 0 }, uAurora: { value: 0 } },
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
  fragmentShader: `varying vec3 vD; uniform vec3 uSun; uniform vec3 uMoon; uniform float uMoonI; uniform vec3 uZen; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uHorA;
    uniform vec3 uGlow; uniform float uStorm; uniform vec3 uFog; uniform float uTime; uniform float uAurora;
    void main(){ vec3 d = normalize(vD); float h = clamp(d.y,0.0,1.0);
      // the horizon is warm on the sun's side and pink-to-slate on the other (the belt of Venus at dusk)
      float toward = dot(normalize(d.xz + vec2(1e-5)), normalize(uSun.xz + vec2(1e-5))) * 0.5 + 0.5;
      vec3 hor = mix(uHorA, uHor, smoothstep(0.15, 1.0, toward));
      vec3 c = mix(hor, uMid, smoothstep(0.0,0.22,h)); c = mix(c, uZen, smoothstep(0.22,0.85,h));
      // glow round the sun, held down on the horizon for a while after it sets
      vec3 sg = normalize(vec3(uSun.x, max(uSun.y, -0.01), uSun.z));
      float s = max(dot(d, sg), 0.0);
      c += uGlow * (pow(s, 5.0)*0.35 + pow(s, 60.0)*0.55) * (1.0 - 0.6*smoothstep(0.0, 0.5, h));
      c += vec3(1.0,0.93,0.8) * smoothstep(0.9993,0.9997,max(dot(d, uSun),0.0)) * smoothstep(-0.02, 0.01, uSun.y);
      // the moon: disc, tight halo, faint wide glow
      float m = max(dot(d, uMoon), 0.0);
      c += vec3(0.86,0.9,1.0) * uMoonI * (smoothstep(0.99955,0.99965,m)*1.3 + pow(m, 500.0)*0.25 + pow(m, 25.0)*0.05) * smoothstep(-0.02,0.02,uMoon.y);
      // aurora: green curtains hanging across the northern half of the sky, drifting. No branches: measured,
      // an if() around this cost more than it saved
      float az = atan(d.x, -d.z);
      float band = sin(az * 2.3 + uTime * 0.05) * 0.5 + sin(az * 5.1 - uTime * 0.09) * 0.25 + sin(az * 11.0 + uTime * 0.17) * 0.12;
      float ah = 0.42 + band * 0.18;
      float curtain = exp(-pow((h - ah) * 5.5, 2.0)) * (0.55 + 0.45 * sin(az * 23.0 + uTime * 0.6 + sin(az * 7.0) * 3.0));
      float rays = 0.6 + 0.4 * sin(az * 61.0 - uTime * 0.9 + h * 30.0);
      float au = curtain * rays * smoothstep(0.08, 0.3, h) * (1.0 - smoothstep(0.55, 0.95, h)) * smoothstep(-0.9, 0.4, -d.z);
      vec3 auC = mix(vec3(0.12, 0.85, 0.42), vec3(0.55, 0.25, 0.8), smoothstep(ah, ah + 0.14, h));
      c += auC * au * uAurora * (1.0 - uStorm) * 0.7;
      // strong nights: the corona, faint rays converging overhead
      c += vec3(0.1, 0.62, 0.38) * smoothstep(0.9, 1.6, uAurora) * smoothstep(0.55, 0.95, h) * rays * (0.6 + 0.4 * sin(az * 9.0 + uTime * 0.3)) * 0.22 * (1.0 - uStorm);
      if (d.y < 0.0) c = uFog;
      c = mix(c, uFog, clamp(uStorm*0.9 + (1.0 - smoothstep(0.0,0.06,h))*0.45, 0.0, 1.0));
      gl_FragColor = vec4(c,1.0); }`
}));
sky.renderOrder = -1; scene.add(sky);

/* ---------------- snow patch (fine deformable mesh around the sled) ---------------- */
const S = 401, PHALF = 200;
let pox = -99999, poz = -99999;
let pdata = new Float32Array(S * S * 4), pdata2 = new Float32Array(S * S * 4);
const snowTex = new THREE.DataTexture(pdata, S, S, THREE.RGBAFormat, THREE.FloatType);
snowTex.minFilter = snowTex.magFilter = THREE.NearestFilter; snowTex.generateMipmaps = false;
let snowDirty = false, snowJ0 = 1e9, snowJ1 = -1, snowFull = true;
// Only the rows the sled actually dug get re-sent to the GPU (texSubImage2D), instead of the
// whole 2.5 MB float texture every frame. Recentering the patch still sends the lot.
function flushSnow() {
  if (!snowDirty) return;
  snowDirty = false;
  const j0 = snowJ0, j1 = snowJ1; snowJ0 = 1e9; snowJ1 = -1;
  const tp = renderer.properties.get(snowTex), gl = renderer.getContext();
  if (snowFull || !renderer.capabilities.isWebGL2 || !tp.__webglTexture || tp.__version !== snowTex.version || j1 < j0) { snowTex.needsUpdate = true; snowFull = false; return; }
  renderer.state.bindTexture(gl.TEXTURE_2D, tp.__webglTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, j0, S, j1 - j0 + 1, gl.RGBA, gl.FLOAT, pdata.subarray(j0 * S * 4, (j1 + 1) * S * 4));
}

function buildGridIndex(n) {
  const idx = new Uint32Array((n - 1) * (n - 1) * 6); let p = 0;
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    if ((i + j) & 1) { idx[p++] = a; idx[p++] = c; idx[p++] = d; idx[p++] = a; idx[p++] = d; idx[p++] = b; }
    else { idx[p++] = a; idx[p++] = c; idx[p++] = b; idx[p++] = b; idx[p++] = c; idx[p++] = d; }
  }
  return idx;
}
const patchGeo = new THREE.BufferGeometry();
{
  const pos = new Float32Array(S * S * 3), uv = new Float32Array(S * S * 2);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const k = j * S + i;
    pos[k * 3] = i * CELL; pos[k * 3 + 1] = (i === 0 || j === 0 || i === S - 1 || j === S - 1) ? 1 : 0; pos[k * 3 + 2] = j * CELL;
    uv[k * 2] = (i + 0.5) / S; uv[k * 2 + 1] = (j + 0.5) / S;
  }
  patchGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  patchGeo.setAttribute("aUv", new THREE.BufferAttribute(uv, 2));
  patchGeo.setIndex(new THREE.BufferAttribute(buildGridIndex(S), 1));
}
// melt uniforms shared by the snow patch, the far terrain and the lakes (MELT sets them)
const meltU = { uSpr: { value: 0 }, uWet: { value: 0 }, uMeltK: { value: 0 }, uThin: { value: 1 }, uLakeThr: { value: new Array(LAKES.length).fill(9) } };
const patchMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0 });
patchMat.onBeforeCompile = sh => {
  sh.uniforms.uSnow = { value: snowTex }; sh.uniforms.uTexel = { value: 1 / S }; sh.uniforms.uSpr = meltU.uSpr; sh.uniforms.uWet = meltU.uWet;
  sh.vertexShader = "uniform sampler2D uSnow; uniform float uTexel; attribute vec2 aUv; varying float vPack; varying float vFresh; varying float vIce; varying float vSlopeY; varying vec3 vWP;\n" +
    sh.vertexShader
      .replace("#include <beginnormal_vertex>", `
        vec2 tX = vec2(uTexel, 0.0), tY = vec2(0.0, uTexel);
        vec4 sC = texture2D(uSnow, aUv);
        vec4 sE = texture2D(uSnow, aUv + tX), sW = texture2D(uSnow, aUv - tX), sN = texture2D(uSnow, aUv + tY), sS = texture2D(uSnow, aUv - tY);
        vec4 sNE = texture2D(uSnow, aUv + tX + tY), sNW = texture2D(uSnow, aUv - tX + tY), sSE = texture2D(uSnow, aUv + tX - tY), sSW = texture2D(uSnow, aUv - tX - tY);
        float e2 = texture2D(uSnow, aUv + 2.0*tX).r, w2 = texture2D(uSnow, aUv - 2.0*tX).r, n2 = texture2D(uSnow, aUv + 2.0*tY).r, s2 = texture2D(uSnow, aUv - 2.0*tY).r;
        // gaussian-smoothed height & packing so the 25 cm grid never reads as steps
        vec2 blur = (sC.rg * 4.0 + (sE.rg + sW.rg + sN.rg + sS.rg) * 2.0 + sNE.rg + sNW.rg + sSE.rg + sSW.rg) / 16.0;
        float gx = 0.5 * ((sNE.r + 2.0*sE.r + sSE.r) - (sNW.r + 2.0*sW.r + sSW.r)) / ${(8 * CELL).toFixed(2)} + 0.5 * (e2 - w2) / ${(4 * CELL).toFixed(2)};
        float gz = 0.5 * ((sNE.r + 2.0*sN.r + sNW.r) - (sSE.r + 2.0*sS.r + sSW.r)) / ${(8 * CELL).toFixed(2)} + 0.5 * (n2 - s2) / ${(4 * CELL).toFixed(2)};
        vec3 objectNormal = normalize(vec3(-gx, 1.0, -gz));
        float hB = blur.x;
        vPack = blur.y; vFresh = sC.b; vIce = sC.a; vSlopeY = objectNormal.y;`)
      .replace("#include <begin_vertex>", `vec3 transformed = vec3(position.x, hB - position.y*1.4, position.z); vWP = (modelMatrix*vec4(transformed,1.0)).xyz;`);
  sh.fragmentShader = "uniform float uSpr; uniform float uWet; varying float vPack; varying float vFresh; varying float vIce; varying float vSlopeY; varying vec3 vWP;\n" +
    sh.fragmentShader.replace("#include <color_fragment>", `
      vec3 powder = vec3(0.93,0.955,1.0), packedC = vec3(0.70,0.76,0.85), iceC = vec3(0.38,0.58,0.72), rockC = vec3(0.26,0.25,0.27);
      float ice = min(vIce, 1.0), thin = clamp(vIce - 1.0, 0.0, 1.0);          // 1..2 is ice the melt is eating (dark, grey, wet)
      vec3 col = mix(powder, packedC, vPack);
      col = mix(col, iceC, ice*(0.3 + 0.7*vPack));
      col = mix(col, vec3(0.17,0.25,0.31), thin*0.8);
      // spring: wet snow goes grey, the edges of the drifts go dirty, and where it's gone there's earth and heather
      float lo = (1.0 - smoothstep(0.08,0.3,vFresh)) * (1.0 - ice) * uSpr;
      col *= mix(vec3(1.0), vec3(0.85,0.89,0.93), uWet * 0.8);
      col *= mix(vec3(1.0), vec3(0.83,0.8,0.76), lo * 0.7);
      vec2 ep = floor(vWP.xz*1.7);
      float en = fract(sin(dot(ep, vec2(41.31,17.83)))*43758.5453);
      vec3 earth = mix(mix(vec3(0.27,0.22,0.16), vec3(0.29,0.31,0.18), en), vec3(0.34,0.27,0.24), step(0.86, en));
      float bare = (1.0 - smoothstep(0.02,0.1,vFresh)) * (1.0 - ice) * uSpr;
      col = mix(col, earth, bare);
      float rock = (1.0 - smoothstep(0.03,0.14,vFresh)) * (1.0 - ice) * (1.0 - smoothstep(0.55,0.78,vSlopeY));
      col = mix(col, rockC, rock);
      vec2 cellp = floor(vWP.xz*9.0);
      float rnd = fract(sin(dot(cellp, vec2(12.9898,78.233)))*43758.5453);
      float tw = fract(rnd*37.0 + dot(normalize(vWP - cameraPosition), vec3(4.0,6.0,5.0)));
      col += step(0.985, rnd) * step(0.72, tw) * (1.0 - vPack) * (1.0 - rock) * (1.0 - bare) * (1.0 - 0.8*uWet) * 0.9;
      diffuseColor.rgb *= col;`);
};
const patchMesh = new THREE.Mesh(patchGeo, patchMat);
patchMesh.frustumCulled = false; patchMesh.receiveShadow = true;
scene.add(patchMesh);

function packOf(d, f) { return f > 0.01 ? clamp((f - d) / (f * 0.7), 0, 1) : 0; }
function fillCell(arr, i, j, ix, iz) {
  const x = ix * CELL - HALF, z = iz * CELL - HALF;
  const c = chunks[(iz >> 5) * CPR + (ix >> 5)];
  let d, f;
  if (c) { const k = (iz & 31) * CH + (ix & 31); d = c.d[k]; f = c.f[k]; } else { d = f = freshCell(ix, iz); }
  const o = (j * S + i) * 4;
  arr[o] = groundAt(x, z) + d; arr[o + 1] = packOf(d, f); arr[o + 2] = f; arr[o + 3] = bioAt(x, z) === 1 ? 1 + iceThin(x, z) : 0;
}
const farU = { uPatch: { value: new THREE.Vector4(-1e6, -1e6, -1e6, -1e6) }, uTrail: { value: null } };
function recenter(px, pz, force) {
  const rs = GFX.recStep;
  let cx = Math.round(((px + HALF) / CELL - PHALF) / rs) * rs, cz = Math.round(((pz + HALF) / CELL - PHALF) / rs) * rs;
  cx = clamp(cx, 0, FN - S); cz = clamp(cz, 0, FN - S);
  if (!force && cx === pox && cz === poz) return;
  const src = pdata, dst = pdata2, dx = cx - pox, dz = cz - poz;
  for (let j = 0; j < S; j++) {
    const sj = j + dz, rowOK = !force && sj >= 0 && sj < S;
    let i0 = 0, i1 = -1;
    if (rowOK) { i0 = Math.max(0, -dx); i1 = Math.min(S - 1, S - 1 - dx); }
    if (rowOK && i1 >= i0) dst.set(src.subarray((sj * S + i0 + dx) * 4, (sj * S + i1 + dx + 1) * 4), (j * S + i0) * 4);
    for (let i = 0; i < S; i++) { if (rowOK && i >= i0 && i <= i1) continue; fillCell(dst, i, j, cx + i, cz + j); }
  }
  pdata = dst; pdata2 = src; pox = cx; poz = cz; MELT.moved = true;
  snowTex.image.data = pdata; snowTex.needsUpdate = true; snowFull = true; snowDirty = false; snowJ0 = 1e9; snowJ1 = -1;
  const wx = cx * CELL - HALF, wz = cz * CELL - HALF;
  patchMesh.position.set(wx, 0, wz);
  farU.uPatch.value.set(wx, wz, wx + (S - 1) * CELL, wz + (S - 1) * CELL);
}
function writeCell(ix, iz, oldD, newD, f) {
  const i = ix - pox, j = iz - poz;
  if (i < 0 || j < 0 || i >= S || j >= S) return;
  const o = (j * S + i) * 4;
  pdata[o] += newD - oldD; pdata[o + 1] = packOf(newD, f); pdata[o + 2] = f;
  snowDirty = true; if (j < snowJ0) snowJ0 = j; if (j > snowJ1) snowJ1 = j;
}

/* ---------------- trail map (far terrain tint + minimap) ---------------- */
const TR = 2048, trailData = new Uint8Array(TR * TR * 4);
const trailTex = new THREE.DataTexture(trailData, TR, TR, THREE.RGBAFormat);
trailTex.magFilter = THREE.LinearFilter; trailTex.minFilter = THREE.LinearFilter;
farU.uTrail.value = trailTex;
let trailDirty = false, trailClock = 0;
function markTrail(x, z, faint) {
  const tx = clamp(((x + HALF) / (WORLD / TR)) | 0, 0, TR - 1), tz = clamp(((z + HALF) / (WORLD / TR)) | 0, 0, TR - 1), o = (tz * TR + tx) * 4;
  const v = faint ? 170 : 255;
  if (trailData[o] < v) { trailData[o] = v; trailDirty = true; }
}

/* ---------------- boot ---------------- */
let far, capMesh, treeMesh, pineCells = [], cargoMesh = null, started = false, ready = false;
let FISH = null, FISHSITES = {};                                       // ice fishing (icefish.js) and where its shop and buyer stand
const obGrid = new Map(); const OBC = 16, OBW = WORLD / OBC + 2;
function addOb(o) { const k = Math.floor((o.z + HALF) / OBC) * OBW + Math.floor((o.x + HALF) / OBC); let a = obGrid.get(k); if (!a) obGrid.set(k, a = []); a.push(o); }

function mergeGeos(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry();
  m.setAttribute("position", new THREE.BufferAttribute(pos, 3)); m.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); m.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return m;
}
function paint(geo, fn) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, nm = g.attributes.normal, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const rgb = fn(p.getX(i), p.getY(i), p.getZ(i), nm.getY(i)); c[i * 3] = rgb[0]; c[i * 3 + 1] = rgb[1]; c[i * 3 + 2] = rgb[2]; }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g;
}

function buildFar() {
  const step = 2, n = (GN - 1) / step + 1;   // 8 m far-terrain grid
  const pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3), mlt = new Float32Array(n * n * 3), mlT = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const gi = i * step, gj = j * step, k = gj * GN + gi, v = j * n + i;
    const d = freshG[k], b = bio[k];
    // the melt, done on the GPU out here: when this vertex melts out (the same 8 m grid as meltG), its snow, and its lake
    // (the threshold is filled in when meltG is built, just before the thaw; until then nothing melts)
    mlT[v] = b === 3 ? -1 : MELT.grid ? meltG[v] / 200 : 9; mlt[v * 3] = d; mlt[v * 3 + 1] = b === 1 ? lakeId[k] : 0; mlt[v * 3 + 2] = lakeT[k] / 255;
    pos[v * 3] = gi * GRES - HALF; pos[v * 3 + 1] = b === 3 ? Math.min(ground[k], SEA - 1.5) : ground[k] + d; pos[v * 3 + 2] = gj * GRES - HALF;
    let r = 0.93, g = 0.955, bl = 1.0;
    if (b === 3) { r = 0.07; g = 0.14; bl = 0.2; }
    else if (b === 1) { r = 0.62; g = 0.76; bl = 0.86; }
    else if (d < 0.12) { const t = 1 - d / 0.12; r = lerp(r, 0.27, t); g = lerp(g, 0.26, t); bl = lerp(bl, 0.28, t); }
    else if (b === 2) { r = 0.86; g = 0.85; bl = 0.86; }
    col[v * 3] = r; col[v * 3 + 1] = g; col[v * 3 + 2] = bl;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aMelt", new THREE.BufferAttribute(mlt, 3)); geo.setAttribute("aMeltT", new THREE.BufferAttribute(mlT, 1));
  geo.setIndex(new THREE.BufferAttribute(buildGridIndex(n), 1));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const NL = LAKES.length;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, farU, meltU);
    sh.vertexShader = `uniform vec4 uPatch; uniform float uMeltK; uniform float uThin; uniform float uLakeThr[${NL}]; attribute vec3 aMelt; attribute float aMeltT; varying vec2 vWxz; varying float vBare; varying float vOpen;\n` + sh.vertexShader.replace("#include <begin_vertex>", `
      vec3 transformed = vec3(position); vWxz = position.xz; vBare = 0.0; vOpen = 0.0;
      if (uMeltK > 0.0 && aMeltT >= 0.0) {
        if (aMelt.y > 0.5) {                                  // lake ice: open water from the shore in
          float thr = 9.0; int li = int(aMelt.y + 0.5) - 1;
          for (int q = 0; q < ${NL}; q++) if (q == li) thr = uLakeThr[q];
          if (aMelt.z > thr) { transformed.y -= ${LAKE_DROP.toFixed(2)}; vOpen = 1.0; }
        } else {
          float m = uThin * smoothstep(0.0, 0.16, aMeltT - uMeltK);
          transformed.y -= aMelt.x * (1.0 - m);
          vBare = 1.0 - clamp(aMelt.x * m / 0.12, 0.0, 1.0);
        }
      }
      if (position.x > uPatch.x && position.x < uPatch.z && position.z > uPatch.y && position.z < uPatch.w) {
        bool deep = position.x > uPatch.x + 5.0 && position.x < uPatch.z - 5.0 && position.z > uPatch.y + 5.0 && position.z < uPatch.w - 5.0;
        transformed.y -= deep ? 30.0 : 1.3; }`);
    sh.fragmentShader = "uniform sampler2D uTrail; uniform float uSpr; uniform float uWet; varying vec2 vWxz; varying float vBare; varying float vOpen;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      float tr = texture2D(uTrail, (vWxz + ${HALF}.0) / ${WORLD}.0).r;
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.76,0.82,0.9), tr);
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.86,0.89,0.93), uWet * 0.7);
      float en = fract(sin(dot(floor(vWxz / 9.0), vec2(41.31,17.83))) * 43758.5453);
      vec3 earth = mix(vec3(0.26,0.22,0.16), vec3(0.28,0.3,0.18), en);
      diffuseColor.rgb = mix(diffuseColor.rgb, earth, clamp(vBare, 0.0, 1.0) * uSpr);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.09,0.16,0.21), vOpen);`);
  };
  far = new THREE.Mesh(geo, mat); far.receiveShadow = false;
  scene.add(far);
  buildSea();
}

/* the sea: Kjøllefjorden, Laksefjorden and the Barents. Gulf Stream water, so it never freezes. */
let sea = null;
const seaU = { uTime: { value: 0 } };
function buildSea() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x1b3446, roughness: 0.32, metalness: 0.25 });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, seaU);
    sh.vertexShader = "uniform float uTime; varying vec3 vSW;\n" + sh.vertexShader.replace("#include <begin_vertex>", `
      vec3 transformed = vec3(position);
      vSW = (modelMatrix * vec4(position, 1.0)).xyz;
      transformed.y += sin(vSW.x * 0.11 + uTime * 0.9) * 0.12 + sin(vSW.z * 0.07 - uTime * 0.7) * 0.1;`);
    sh.fragmentShader = "uniform float uTime; varying vec3 vSW;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      float sw = sin(vSW.x * 0.35 + uTime * 1.3) * sin(vSW.z * 0.29 - uTime * 0.9);
      float sw2 = sin(vSW.x * 1.7 - uTime * 2.1 + vSW.z * 0.6) * 0.5 + 0.5;
      diffuseColor.rgb *= 0.9 + 0.2 * sw + 0.12 * sw2;`);
  };
  const geo = new THREE.PlaneGeometry(WORLD * 1.6, WORLD * 1.6, 96, 96);
  geo.rotateX(-Math.PI / 2);
  sea = new THREE.Mesh(geo, mat); sea.position.y = SEA; sea.receiveShadow = true; sea.frustumCulled = false;
  scene.add(sea);
}

const windU = { uTime: { value: 0 }, uWind: { value: new THREE.Vector2(1, 0) } };
function breezeMat(snowy) {
  const m = snowy ? new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x2b3a52 }) : new THREE.MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, windU);
    if (snowy) {
      sh.vertexShader = "varying vec3 vSW;\n" + sh.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vSW = (instanceMatrix * vec4(transformed,1.0)).xyz;");
      sh.fragmentShader = "varying vec3 vSW;\n" + sh.fragmentShader.replace("#include <dithering_fragment>", `#include <dithering_fragment>
        vec3 cq = floor(vSW * 11.0);
        float rn = fract(sin(dot(cq, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float tw = fract(rn * 31.0 + dot(normalize(vSW - cameraPosition), vec3(5.0, 7.0, 3.0)));
        gl_FragColor.rgb += step(0.975, rn) * step(0.7, tw) * 0.7;`);
    }
    sh.vertexShader = "uniform float uTime; uniform vec2 uWind;\n" + sh.vertexShader.replace("#include <project_vertex>", `
      vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
      vec2 ip = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
      float hgt = max(position.y - 0.8, 0.0);
      float gust = 0.7 + 0.6 * sin(uTime * 0.45 + ip.x * 0.004 + ip.y * 0.003) * sin(uTime * 0.27 + ip.y * 0.006);
      float sway = sin(uTime * 1.6 + ip.x * 0.21 + ip.y * 0.17) * 0.55 + sin(uTime * 3.7 + ip.x * 0.5 - ip.y * 0.3) * 0.3 + sin(uTime * 7.3 + position.y * 1.7 + ip.x) * 0.12;
      float bend = hgt * hgt * 0.0105 * gust;
      mvPosition.xz += uWind * bend * (1.0 + sway);
      mvPosition.y -= bend * 0.08 * length(uWind);
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  return m;
}
/* Scots pine: the snow-pillowed tiered conifer. Dense groves down in the low, sheltered forest
   pockets (the Stabbursdalen idea), a scatter of them through the birch, and a few lone pines out
   on the sheltered southern slopes. Split into 512 m cells so the GPU can skip the ones off-screen. */
const PINE_CELL = 512;
function pineGeos() {
  const green = [0.10, 0.20, 0.15], snowC = [0.92, 0.95, 1.0];
  const caps = [], parts = [paint(new THREE.CylinderGeometry(0.16, 0.24, 2.2, 6).translate(0, 1.1, 0), () => [0.33, 0.2, 0.13])];
  [[1.9, 3.0, 2.6], [1.5, 2.7, 4.1], [1.05, 2.3, 5.5], [0.6, 1.7, 6.7]].forEach(([r, h, y]) => {
    parts.push(paint(new THREE.ConeGeometry(r, h, 7).translate(0, y, 0), (x, py, z, ny) => {
      const t = clamp((py - (y - h / 2)) / h, 0, 1), s = ny < -0.5 ? 0 : 0.12 + t * 0.12;
      return [lerp(green[0], snowC[0], s), lerp(green[1], snowC[1], s), lerp(green[2], snowC[2], s)];
    }));
    const ch = h * 0.86, cr = r * 0.86 * 1.13, cy = y + h / 2 + 0.1 - ch / 2, bot = cy - ch / 2;
    const cg = new THREE.ConeGeometry(cr, ch, 11, 4, true).translate(0, cy, 0), cp = cg.attributes.position;
    for (let v = 0; v < cp.count; v++) {
      const vx = cp.getX(v), vy = cp.getY(v), vz = cp.getZ(v), t = clamp((vy - bot) / ch, 0, 1);
      if (t > 0.99) { cp.setY(v, vy + 0.12); continue; }
      const hsh = hash(Math.round(vx * 97) + 7 * Math.round(y * 10), Math.round(vz * 97) + Math.round(vy * 53));
      const ang = Math.atan2(vz, vx), lump = Math.sin(ang * 5 + y * 3) * 0.5 + Math.sin(ang * 9 - y * 2) * 0.3;
      let rs = 1 + 0.11 * Math.sin(Math.PI * Math.sqrt(t)) + lump * 0.05 * (1 - t) + (hsh - 0.5) * 0.06, dy = (hsh - 0.5) * 0.04;
      if (t < 0.01) { rs += 0.06 + lump * 0.03; dy = (0.5 + lump * 0.5) * 0.22 * ch; }   // soft scalloped overhang
      cp.setXYZ(v, vx * rs, vy + dy, vz * rs);
    }
    cg.computeVertexNormals();
    caps.push(paint(cg, (x, py, z, ny) => { const u = Math.pow(clamp((py - bot) / ch, 0, 1), 0.35); return [lerp(0.8, 1.0, u), lerp(0.87, 1.0, u), 1.0]; }));
  });
  return [mergeGeos(parts), mergeGeos(caps)];
}
function buildPines(birch) {
  const rnd = mulberry32(51770);
  const taken = new Set(); for (const [x, z] of birch) taken.add(Math.floor(x / 3) * 8192 + Math.floor(z / 3));
  const busy = (x, z) => { const i = Math.floor(x / 3), j = Math.floor(z / 3); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (taken.has((i + a) * 8192 + j + b)) return true; return false; };
  const pines = [];
  for (let n = 0; n < 1200000 && pines.length < 22000; n++) {        // the forest is all in the south, so only sample there
    const x = (rnd() * 2 - 1) * (HALF - 120), z = -800 + rnd() * (HALF - 120 + 800);
    const b = bioAt(x, z); if (b === 1 || b === 3) continue;
    const h = groundAt(x, z); if (h > 165 || h < 3) continue;
    const s = Math.hypot(groundAt(x + 2, z) - groundAt(x - 2, z), groundAt(x, z + 2) - groundAt(x, z - 2)) / 4;
    if (s > 0.5) continue;
    if (LAKES.some(L => L.ok && Math.hypot(x - L.x, z - L.z) < L.r * 1.02 && bioAt(x, z) !== 0)) continue;
    const pocket = fbm(x / 170 - 17, z / 170 + 9, 3);
    if (b === 2) {
      // groves where the pocket noise is high and the ground is low, a steady scatter everywhere else in the forest
      const grove = (pocket - 0.38) * 7 * (h < 130 ? 1 : 0.4);
      if (rnd() > Math.max(0.16, grove)) continue;
    } else if (z < 300 || h > 140 || rnd() > (pocket > 0.52 ? 0.03 : 0.006)) continue;
    if (nearSite(x, z, 24) || busy(x, z)) continue;
    taken.add(Math.floor(x / 3) * 8192 + Math.floor(z / 3));
    pines.push([x, z, 0.7 + rnd() * 0.65]);
  }
  const [trunkGeo, capGeo] = pineGeos(), cells = new Map(), NC = Math.ceil(WORLD / PINE_CELL);
  for (const t of pines) { const k = Math.floor((t[1] + HALF) / PINE_CELL) * NC + Math.floor((t[0] + HALF) / PINE_CELL); let a = cells.get(k); if (!a) cells.set(k, a = []); a.push(t); }
  const share = (g, cx, cz, r) => { const c = new THREE.BufferGeometry(); for (const k in g.attributes) c.setAttribute(k, g.attributes[k]); c.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 0, cz), r); c.boundingBox = null; return c; };
  const trunkMat = breezeMat(), capMat = breezeMat(true);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  for (const list of cells.values()) {
    let cx = 0, cz = 0, cy = 0; for (const [x, z] of list) { cx += x; cz += z; cy += groundAt(x, z); } cx /= list.length; cz /= list.length; cy /= list.length;
    let r = 0, lo = 1e9, hi = -1e9; for (const [x, z] of list) { r = Math.max(r, Math.hypot(x - cx, z - cz)); const g = groundAt(x, z); lo = Math.min(lo, g); hi = Math.max(hi, g); }
    r = Math.hypot(r + 4, (hi - lo) / 2 + 12);
    const tg = share(trunkGeo, cx, 0, r), cg = share(capGeo, cx, 0, r); tg.boundingSphere.center.set(cx, (lo + hi) / 2 + 5, cz); cg.boundingSphere.center.copy(tg.boundingSphere.center);
    const tm = new THREE.InstancedMesh(tg, trunkMat, list.length), cap = new THREE.InstancedMesh(cg, capMat, list.length), ci = pineCells.length;
    pineCells.push({ tm, cap, x: cx, z: cz });
    list.forEach(([x, z, s], i) => {
      const yaw = rnd() * 6.28, sy = s * (0.9 + rnd() * 0.3); q.setFromAxisAngle(up, yaw); sc.set(s, sy, s); p.set(x, groundAt(x, z) - 0.25, z);
      m4.compose(p, q, sc); tm.setMatrixAt(i, m4); cap.setMatrixAt(i, m4);
      const v = 0.8 + rnd() * 0.35; c.setRGB(v, v * (0.95 + rnd() * 0.12), v * (0.9 + rnd() * 0.1)); tm.setColorAt(i, c);
      addOb({ x, z, r: 0.42 * s, top: 1e9, tree: i, pine: true, cell: ci, s, sy, yaw, y: p.y, snowy: true, wob: null });
    });
    tm.castShadow = cap.castShadow = true; scene.add(tm, cap);
  }
  window.PINE_COUNT = pines.length;
}
// pines past the fog are hidden outright, not just culled by the frustum
let _pineT = 0;
function pineCull(dt) {
  if ((_pineT -= dt) > 0 || !pineCells.length) return; _pineT = 0.5;
  const R = 1900, cx = camera.position.x, cz = camera.position.z;
  for (const c of pineCells) { const on = Math.hypot(c.x - cx, c.z - cz) < R + 400; c.tm.visible = c.cap.visible = on; }
}
const trunkOf = o => o.pine ? pineCells[o.cell].tm : treeMesh, capOf = o => o.pine ? pineCells[o.cell].cap : capMesh;
function buildProps() {
  const rnd = mulberry32(90210);
  // mountain birch: a pale crooked trunk, a handful of bare limbs, and snow lying along the tops of them
  const bark = (x, py, z, ny) => { const t = clamp(py / 5, 0, 1), k = 0.46 + 0.32 * t; return [k * 0.96, k * 0.9, k * 0.84]; };
  const snowTop = (x, py, z, ny) => { const u = clamp(ny, 0, 1); return [lerp(0.82, 1.0, u), lerp(0.87, 1.0, u), 1.0]; };
  const parts = [paint(new THREE.CylinderGeometry(0.09, 0.2, 2.6, 6).translate(0, 1.3, 0), bark), paint(new THREE.CylinderGeometry(0.03, 0.09, 2.6, 5).translate(0, 3.8, 0).rotateZ(0.08), bark)];
  const caps = [paint(new THREE.SphereGeometry(0.16, 6, 4).scale(1, 0.55, 1).translate(0, 5.1, 0), snowTop)];
  const limbs = [[0.4, 2.2, 0.62, 2.1], [1.5, 2.6, 0.55, 1.9], [2.7, 2.9, 0.7, 2.3], [3.9, 3.4, 0.5, 1.7], [5.1, 3.9, 0.58, 1.5], [0.9, 4.3, 0.42, 1.2]];
  for (const [ang, y0, tilt, len] of limbs) {
    const lg = new THREE.CylinderGeometry(0.025, 0.07, len, 5).translate(0, len / 2, 0).rotateZ(-tilt).rotateY(ang).translate(0, y0, 0);
    parts.push(paint(lg, bark));
    const ex = Math.sin(tilt) * len, ey = Math.cos(tilt) * len;
    for (let k = 0.45; k <= 1.01; k += 0.55) {
      const bl = new THREE.SphereGeometry(0.13 + 0.07 * k, 6, 4).scale(1.9, 0.5, 1).rotateZ(-tilt * 0.4).rotateY(ang).translate(Math.cos(ang) * ex * k, y0 + ey * k + 0.06, -Math.sin(ang) * ex * k);
      caps.push(paint(bl, snowTop));
    }
  }
  const treeGeo = mergeGeos(parts), capGeo = mergeGeos(caps);
  // birch stands only in the sheltered south. A few stragglers reach up the valleys; the open fell has none.
  const trees = [];
  for (let n = 0; n < 900000 && trees.length < 26000; n++) {
    const x = (rnd() * 2 - 1) * (HALF - 120), z = (rnd() * 2 - 1) * (HALF - 120);
    const b = bioAt(x, z); if (b === 1 || b === 3) continue;
    const h = groundAt(x, z); if (h > 175) continue;
    const s = Math.hypot(groundAt(x + 2, z) - groundAt(x - 2, z), groundAt(x, z + 2) - groundAt(x, z - 2)) / 4;
    if (s > 0.55) continue;
    const lake = LAKES.some(L => L.ok && Math.hypot(x - L.x, z - L.z) < L.r * 1.02 && bioAt(x, z) !== 0);
    if (lake) continue;
    if (b === 2) { const fd = fbm(x / 300 + 40, z / 300 - 3, 3); if (rnd() > (fd - 0.44) * 5) continue; }
    else if (z < 400 || h > 150 || rnd() > 0.012) continue;
    if (nearSite(x, z, 24)) continue;
    trees.push([x, z, 0.7 + rnd() * 0.7]);
  }
  const tm = treeMesh = new THREE.InstancedMesh(treeGeo, breezeMat(), trees.length);
  capMesh = new THREE.InstancedMesh(capGeo, breezeMat(true), trees.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  trees.forEach(([x, z, s], i) => {
    const yaw = rnd() * 6.28, sy = s * (0.85 + rnd() * 0.35); q.setFromAxisAngle(up, yaw); sc.set(s, sy, s); p.set(x, groundAt(x, z) - 0.25, z);
    m4.compose(p, q, sc); tm.setMatrixAt(i, m4); capMesh.setMatrixAt(i, m4);
    const v = 0.85 + rnd() * 0.25; c.setRGB(v, v * (0.95 + rnd() * 0.1), v); tm.setColorAt(i, c);
    addOb({ x, z, r: 0.3 * s, top: 1e9, tree: i, s, sy, yaw, y: p.y, snowy: true, wob: null });
  });
  tm.castShadow = true; scene.add(tm);
  capMesh.castShadow = true; scene.add(capMesh);
  buildPines(trees);

  // rocks: boulder fields up on the fell, shingle and skerries along the tideline
  const rockGeo = paint(new THREE.IcosahedronGeometry(1, 0), (x, y, z, ny) => ny > 0.45 ? [0.9, 0.93, 0.98] : [0.32, 0.31, 0.33]);
  rockGeo.computeVertexNormals();
  const rocks = [];
  for (let n = 0; n < 400000 && rocks.length < 6500; n++) {
    const x = (rnd() * 2 - 1) * (HALF - 60), z = (rnd() * 2 - 1) * (HALF - 60);
    const b = bioAt(x, z); if (b === 1 || b === 3) continue;
    const h = groundAt(x, z), want = h > 160 ? 0.22 : h < 6 ? 0.45 : 0.03;
    if (rnd() > want || nearSite(x, z, 24)) continue;
    rocks.push([x, z, 0.6 + Math.pow(rnd(), 2) * 2.6]);
  }
  const rm = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }), rocks.length);
  rocks.forEach(([x, z, s], i) => {
    const fr = sampleG(freshG, x, z), y = groundAt(x, z) + fr * 0.3;
    q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)); sc.set(s * (0.8 + rnd() * 0.5), s * 0.7, s * (0.8 + rnd() * 0.5)); p.set(x, y, z);
    m4.compose(p, q, sc); rm.setMatrixAt(i, m4);
    addOb({ x, z, r: 0.85 * s, top: y + 0.62 * s });
  });
  rm.castShadow = true; rm.receiveShadow = true; scene.add(rm);

  // fallen logs
  const logGeo = paint(new THREE.CylinderGeometry(0.34, 0.38, 1, 8).rotateZ(Math.PI / 2), (x, y, z, ny) => ny > 0.55 ? [0.9, 0.93, 0.98] : [0.28, 0.2, 0.15]);
  const logs = [];
  for (let n = 0; n < 300000 && logs.length < 360; n++) {
    const x = (rnd() * 2 - 1) * (HALF - 100), z = (rnd() * 2 - 1) * (HALF - 100);
    if (bioAt(x, z) !== 2 || nearSite(x, z, 30)) continue;
    logs.push([x, z, 4 + rnd() * 5, rnd() * Math.PI]);
  }
  const lm = new THREE.InstancedMesh(logGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), logs.length);
  logs.forEach(([x, z, len, a], i) => {
    const y = groundAt(x, z) + sampleG(freshG, x, z) * 0.55;
    q.setFromAxisAngle(up, a); sc.set(len, 1, 1); p.set(x, y, z); m4.compose(p, q, sc); lm.setMatrixAt(i, m4);
    const dx = Math.cos(a), dz = -Math.sin(a);
    for (let t = -0.5; t <= 0.5; t += 1 / Math.ceil(len / 0.8)) addOb({ x: x + dx * t * len, z: z + dz * t * len, r: 0.42, top: y + 0.36, log: true });
  });
  lm.castShadow = true; scene.add(lm);
}

/* ---------------- sled + rider ---------------- */
// One chassis, nine bodies. Every machine in SLEDS gets its own bodywork built from a side
// profile that's extruded across the sled (hood, belly pan, seat, skis), so a 1970 bogie
// sled and a 2029 battery sled actually have different silhouettes instead of one scaled
// blob. The running gear, bolt-ons and the rider are shared and sit on top of whichever
// body is showing. Colours: the sled has body / panel / trim / seat materials (its livery),
// the rider has jacket / trim / pants / helmet materials — none of them shared.
const sledRoot = new THREE.Group(), sledBody = new THREE.Group(), skiPivots = [], barPivot = new THREE.Group();
let bodyMat = null, panelMat = null, sledTrimMat = null, jacketMat = null, riderTrimMat = null, pantsMat = null, riderHead = [], styleParts = {};
const V = {};   // swappable parts, machines and rider kit, toggled by the garage
const SR = { on: false, a: 0, drag: false, lx: 0 };           // garage / settings showroom camera
const PV = { sled: null, cat: null, slot: null, id: null };   // what the mouse is trying on
function showroomOn() { return GS.garageOpen || !document.getElementById("settings").hidden; }
addEventListener("pointerdown", e => { if (SR.on && e.target.tagName === "CANVAS") { SR.drag = true; SR.lx = e.clientX; } });
addEventListener("pointermove", e => { if (SR.drag) { SR.a -= (e.clientX - SR.lx) * 0.008; SR.lx = e.clientX; } });
addEventListener("pointerup", () => { SR.drag = false; });
sledRoot.add(sledBody); scene.add(sledRoot);
sledRoot.rotation.order = "YXZ";

/* ---- shared materials and mesh helpers ---- */
const std = (c, r = 0.6, m = 0.05, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, extra || {}));
const M = {};
bodyMat = std(0xf0bd2a, 0.35, 0.2); panelMat = std(0x1c1c1c, 0.55, 0.1); sledTrimMat = std(0xc8102e, 0.4, 0.15);
jacketMat = std(0x1d3f6e, 0.75); riderTrimMat = std(0xeef2f5, 0.7); pantsMat = std(0x232a33, 0.85);
M.dark = std(0x1a2027, 0.8); M.black = std(0x0c0f12, 0.95); M.rubber = std(0x14181d, 0.98);
M.alu = std(0xb9c2cb, 0.45, 0.6); M.steel = std(0x9aa6b2, 0.32, 0.7); M.chrome = std(0xd8e0e8, 0.15, 0.9);
M.glove = std(0x11161c, 0.85); M.skin = std(0xc98a63, 0.85); M.boot = std(0x15191f, 0.9);
M.glass = std(0xbfe0f2, 0.05, 0.05, { transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
M.tint = std(0x2a3a48, 0.05, 0.1, { transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
M.lamp = std(0xfff4d6, 0.25, 0, { emissive: 0xfff0c8, emissiveIntensity: 1.8 });
M.led = std(0xeaf6ff, 0.2, 0, { emissive: 0xd8f0ff, emissiveIntensity: 2.2 });
M.tail = std(0x8c1414, 0.4, 0, { emissive: 0xff2a1a, emissiveIntensity: 0.9 });
M.helmet = std(0xf2f5f8, 0.25, 0.15); M.visor = std(0x0d141c, 0.08, 0.6);
M.vinyl = std(0x1a2027, 0.8);                                 // seat, recoloured by the livery / settings
M.spring = std(0x3a4048, 0.4, 0.5); M.pad = std(0x1a1f26, 0.5, 0.1);
V.seatMat = M.vinyl; V.helmetMat = M.helmet; V.visorMat = M.visor;

const put = (m, x, y, z, rx = 0, ry = 0, rz = 0, parent = sledBody) => {
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m;
};
const box = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = sledBody) =>
  put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z, rx, ry, rz, parent);
const cyl = (rt, rb, h, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = sledBody, seg = 12) =>
  put(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat), x, y, z, rx, ry, rz, parent);
const ball = (r, mat, x, y, z, parent = sledBody, sx = 1, sy = 1, sz = 1) => {
  const m = put(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat), x, y, z, 0, 0, 0, parent);
  m.scale.set(sx, sy, sz); return m;
};
// a fixed limb: capsule from a to b
const limb = (r, ax, ay, az, bx, by, bz, mat, parent) => {
  const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz);
  const g = new THREE.Group(); g.position.set(ax, ay, az); (parent || sledBody).add(g);
  g.lookAt(new THREE.Vector3(bx, by, bz).sub(new THREE.Vector3(ax, ay, az)).add(g.position));
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, len, 10), mat);
  m.rotation.x = Math.PI / 2; m.position.z = len / 2; m.castShadow = true; g.add(m);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.95, 10, 8), mat); cap.position.z = len; cap.castShadow = true; g.add(cap);
  return g;
};
// a posable limb: same look, but re-aimed with .set(a, b) — the rider's arms and legs
const _la = new THREE.Vector3(), _lb = new THREE.Vector3(), _ZAX = new THREE.Vector3(0, 0, 1);
// aim an object's +z at a local-space direction (Object3D.lookAt wants world space, which the rider isn't in)
const aimZ = (o, from, to) => { _la.copy(to).sub(from); const l = _la.length(); if (l > 1e-6) { _la.multiplyScalar(1 / l); o.quaternion.setFromUnitVectors(_ZAX, _la); } return l; };
const limbDyn = (r1, r2, mat, parent) => {
  const g = new THREE.Group(); parent.add(g);
  const cg = new THREE.CylinderGeometry(r1, r2, 1, 10); cg.translate(0, 0.5, 0); cg.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(cg, mat); m.castShadow = true; g.add(m);
  const j = new THREE.Mesh(new THREE.SphereGeometry(r1 * 0.98, 10, 8), mat); j.castShadow = true; g.add(j);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r2 * 0.98, 10, 8), mat); cap.castShadow = true; g.add(cap);
  g.userData.set = (a, b) => {
    g.position.copy(a); const len = aimZ(g, a, b) || 0.001;
    m.scale.z = len; cap.position.z = len;
  };
  g.userData.mesh = m; g.userData.cap = cap; g.userData.joint = j;
  return g;
};
// a tube along a polyline
const tube = (pts, r, mat, parent = sledBody, seg = 6, closed = false) => {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), closed, "catmullrom", 0.2);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 6, r, seg, closed), mat);
  m.castShadow = true; parent.add(m); return m;
};
// a side profile [[z, y], ...] extruded across the sled (along x), rounded by a bevel
const extrudeZ = (pts, width, mat, opts = {}, parent = sledBody) => {
  const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  const bev = opts.bevel === undefined ? 0.04 : opts.bevel, depth = Math.max(0.01, width - 2 * bev);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: opts.segs || 4, steps: 1, curveSegments: 6 });
  g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.castShadow = opts.shadow !== false; m.position.set(opts.x || 0, opts.y || 0, opts.z || 0); parent.add(m); return m;
};
// clip a closed profile against y = yc, keeping the side below (or above)
const clipY = (pts, yc, below = true) => {
  const out = [], inside = p => below ? p[1] <= yc : p[1] >= yc;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const t = (yc - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, yc]); }
  }
  return out;
};
// push a closed clockwise profile outward by d (mitred, so overlays sit just proud of a bevelled shell)
const offsetPts = (pts, d) => {
  const n = pts.length, en = [];
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; en.push([-dy / l, dx / l]); }
  return pts.map((p, i) => {
    const e0 = en[(i - 1 + n) % n], e1 = en[i]; let nx = e0[0] + e1[0], ny = e0[1] + e1[1]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const k = d / Math.max(0.55, nx * e1[0] + ny * e1[1]);
    return [p[0] + nx * k, p[1] + ny * k];
  });
};
// hood height at a given z along the crown
const crownY = (pts, z) => { let y = pts[0][1]; for (let i = 1; i < pts.length; i++) { if (pts[i][0] < pts[i - 1][0]) break; if (pts[i][0] >= z) { const a = pts[i - 1], b = pts[i], t = (z - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * t; } y = pts[i][1]; } return y; };

/* ---- running gear: shared track on a slide rail ---- */
{
  const tr = new THREE.Group(); sledBody.add(tr); V.track = tr;
  const tc = document.createElement("canvas"); tc.width = 32; tc.height = 64;
  const tg2 = tc.getContext("2d");
  tg2.fillStyle = "#14181d"; tg2.fillRect(0, 0, 32, 64);
  for (let i = 0; i < 8; i++) { tg2.fillStyle = i % 2 ? "#22282f" : "#0c1014"; tg2.fillRect(0, i * 8, 32, 5); }
  tg2.fillStyle = "#2c333b"; tg2.fillRect(2, 0, 3, 64); tg2.fillRect(27, 0, 3, 64);
  const trackTex = new THREE.CanvasTexture(tc);
  trackTex.wrapS = trackTex.wrapT = THREE.RepeatWrapping; trackTex.repeat.set(1, 6);
  const beltMat = new THREE.MeshStandardMaterial({ map: trackTex, roughness: 0.95 });
  V.beltTex = trackTex;
  box(0.52, 0.34, 1.9, beltMat, 0, 0.19, -0.55, 0, 0, 0, tr);
  V.studs = [];
  for (let i = 0; i < 16; i++) {           // lugs along the bottom run
    box(0.56, 0.05, 0.07, M.rubber, 0, 0.015, -1.45 + i * 0.12, 0, 0, 0, tr);
    if (i % 2 === 0) { const st = box(0.44, 0.04, 0.03, M.chrome, 0, -0.015, -1.45 + i * 0.12, 0, 0, 0, tr); st.visible = false; V.studs.push(st); }
  }
  V.wheelA = cyl(0.19, 0.19, 0.5, M.rubber, 0, 0.19, -1.46, 0, 0, Math.PI / 2, tr, 14);   // rear idler
  V.wheelB = cyl(0.17, 0.17, 0.5, M.rubber, 0, 0.19, 0.34, 0, 0, Math.PI / 2, tr, 14);    // drive sprocket
  for (const s of [-0.19, 0.19]) { cyl(0.1, 0.1, 0.04, M.alu, s, 0.1, -0.95, 0, 0, Math.PI / 2, tr, 12); cyl(0.1, 0.1, 0.04, M.alu, s, 0.12, -0.35, 0, 0, Math.PI / 2, tr, 12); }
  for (const s of [-0.2, 0.2]) box(0.04, 0.05, 1.7, M.alu, s, 0.06, -0.55, 0, 0, 0, tr);   // slide rails
  box(0.06, 0.5, 0.06, M.steel, 0, 0.5, -1.0, 0.5, 0, 0, tr);                  // rear shock
  cyl(0.05, 0.05, 0.42, M.chrome, 0, 0.52, -0.55, 0.9, 0, 0, tr, 8);
}

/* ---- machines: one body per sled ---- */
// The hood is a quadratic curve over the crown from the bulkhead to the nose tip, then a
// near-vertical face down to the belly. The belly pan is the same profile clipped below
// the split line and pushed out a hair, so the two colours never fight.
function hoodProfile(s) {
  const z0 = 0.08, z1 = z0 + s.hoodL, zP = z0 + s.hoodL * s.zPeak, pts = [];
  const seg = (a, c, b, n) => { for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } };
  if (s.zPeak > 0.02) seg([z0, s.yTop], [z0 + (zP - z0) * 0.5, s.yPeak], [zP, s.yPeak], 5); else pts.push([z0, s.yTop]);
  if (s.style === "flat") { pts.push([z1 - 0.28, s.yPeak]); seg([z1 - 0.28, s.yPeak], [z1 - 0.02, s.yPeak - 0.02], [z1, s.yNose], 4); }
  else seg([zP, s.yPeak], [zP + (z1 - zP) * s.round, s.yPeak - (s.yPeak - s.yNose) * (1 - s.round) * 0.35], [z1, s.yNose], 9);
  pts.push([z1 + 0.03, s.yNose - 0.08], [z1 - 0.02, s.yBelly + 0.05], [z1 - 0.16, s.yBelly], [z0, s.yBelly]);
  return { pts, z0, z1, zP };
}
const SEAT_PROFILES = {                                 // sit on the tunnel deck (y 0.59); cushion tops around 0.74 before the bevel
  bench: (zr) => [[0.05, 0.59], [0.05, 0.74], [zr + 0.1, 0.74], [zr, 0.68], [zr, 0.59]],
  saddle: (zr) => [[0.05, 0.59], [0.05, 0.74], [-0.35, 0.76], [zr + 0.4, 0.75], [zr + 0.12, 0.84], [zr, 0.79], [zr, 0.59]],
  sport: (zr) => [[0.05, 0.59], [0.05, 0.72], [-0.45, 0.7], [zr + 0.3, 0.72], [zr + 0.1, 0.82], [zr, 0.76], [zr, 0.59]],
  twoup: (zr) => [[0.05, 0.59], [0.05, 0.74], [-0.8, 0.74], [-0.86, 0.79], [zr + 0.3, 0.81], [zr + 0.28, 1.06], [zr + 0.1, 1.08], [zr, 0.94], [zr, 0.59]]
};
const SKI_PROFILES = {
  steel: [[-0.62, 0], [0.46, 0], [0.62, 0.05], [0.74, 0.2], [0.72, 0.3], [0.64, 0.31], [0.58, 0.22], [0.5, 0.08], [0.44, 0.045], [-0.62, 0.045]],
  plastic: [[-0.6, 0], [0.44, 0], [0.62, 0.06], [0.76, 0.22], [0.74, 0.34], [0.66, 0.36], [0.6, 0.26], [0.52, 0.1], [0.44, 0.06], [-0.55, 0.07], [-0.6, 0.05]],
  powder: [[-0.66, 0], [0.5, 0], [0.7, 0.08], [0.84, 0.26], [0.8, 0.38], [0.7, 0.38], [0.64, 0.26], [0.54, 0.1], [0.46, 0.07], [-0.62, 0.07], [-0.66, 0.05]]
};
const SKI_W = { steel: 0.14, plastic: 0.17, powder: 0.28 };
function buildMachine(sd) {
  const s = sd.shape, m = new THREE.Group(), ud = m.userData; sledBody.add(m); m.visible = false;
  const tw = s.tunnelW, tl = s.tunnelL, zBack = 0.4 - tl, boardX = tw / 2 + 0.11;
  ud.boardX = boardX; ud.zBack = zBack; ud.tw = tw; ud.tl = tl;
  const H = hoodProfile(s), hp = H.pts, w = s.w, HB = 0.05;   // HB: the hood shell's bevel, which pushes its skin out by that much
  ud.barY = s.barY; ud.barZ = s.barZ || 0.34;

  /* tunnel: an aluminium extrusion with a top deck in the panel colour */
  box(tw, 0.2, tl, M.alu, 0, 0.46, 0.4 - tl / 2, 0, 0, 0, m);
  box(tw + 0.08, 0.035, tl + 0.06, panelMat, 0, 0.57, 0.4 - tl / 2, 0, 0, 0, m);          // deck
  box(tw * 0.5, 0.05, 0.24, M.dark, 0, 0.58, zBack + 0.18, 0, 0, 0, m);                     // rack / tail plate
  if (s.tailRound) cyl(0.11, 0.11, tw, M.alu, 0, 0.46, zBack + 0.02, 0, 0, Math.PI / 2, m, 12);
  else { box(tw, 0.08, 0.16, M.alu, 0, 0.52, zBack - 0.06, 0, 0, 0, m); box(tw, 0.04, 0.3, M.dark, 0, 0.36, zBack - 0.08, 0.35, 0, 0, m); }
  box(0.4, 0.05, 0.22, M.rubber, 0, 0.4, zBack - 0.2, 0.55, 0, 0, m);                      // snow flap
  box(0.24, 0.05, 0.04, M.tail, 0, 0.54, zBack - 0.16, 0, 0, 0, m).castShadow = false;      // tail light
  tube([[-tw / 2 - 0.02, 0.42, zBack + 0.1], [-tw / 2 - 0.02, 0.42, zBack - 0.16], [tw / 2 + 0.02, 0.42, zBack - 0.16], [tw / 2 + 0.02, 0.42, zBack + 0.1]], 0.02, s.chrome ? M.chrome : M.black, m);   // rear bumper
  for (const sx of [-1, 1]) {                                                                // running boards with traction strips
    box(0.24, 0.03, tl * 0.72, M.alu, sx * boardX, 0.36, 0.2 - tl * 0.4, 0, 0, 0, m);
    box(0.03, 0.05, tl * 0.72, M.dark, sx * (boardX + 0.11), 0.37, 0.2 - tl * 0.4, 0, 0, 0, m);   // lip
    for (let i = 0; i < 5; i++) box(0.16, 0.012, 0.03, M.dark, sx * boardX, 0.377, 0.2 - tl * 0.7 + i * tl * 0.15, 0, 0, 0, m);
    box(0.04, 0.12, tl * 0.6, M.alu, sx * (tw / 2 - 0.01), 0.41, 0.2 - tl * 0.4, 0, 0, sx * 0.5, m);   // board gusset
  }
  if (s.fins) for (let i = 0; i < 7; i++) box(tw * 0.8, 0.03, 0.02, M.steel, 0, 0.59, -0.5 - i * 0.14, 0, 0, 0, m);   // heat exchanger ribs
  if (s.bogies) {                                                                            // 1970s: bogie wheels under an un-sprung belt
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) { cyl(0.11, 0.11, 0.05, M.dark, sx * 0.31, 0.16, -1.3 + i * 0.4, 0, 0, Math.PI / 2, m, 12); cyl(0.04, 0.04, 0.07, M.steel, sx * 0.31, 0.16, -1.3 + i * 0.4, 0, 0, Math.PI / 2, m, 8); }
    for (let i = 0; i < 4; i++) box(0.66, 0.03, 0.04, M.steel, 0, 0.3, -1.3 + i * 0.4, 0, 0, 0, m);
  }

  /* hood, belly pan, pinstripe and the graphics the settings can switch on */
  const hood = extrudeZ(hp, w, bodyMat, { bevel: HB }, m); ud.hood = hood;
  const skinPan = offsetPts(hp, HB - 0.03 + 0.012), skinThin = offsetPts(hp, HB - 0.005 + 0.014);   // the shell's skin, pushed out for each overlay's own bevel
  extrudeZ(clipY(skinPan, s.pan, true), w + 0.03, panelMat, { bevel: 0.03 }, m);   // belly pan
  extrudeZ(clipY(clipY(skinThin, s.pan + 0.012, true), s.pan - 0.012, false), w + 0.05, sledTrimMat, { bevel: 0.005, segs: 1, shadow: false }, m);   // pinstripe on the split line
  const dec = ud.decal = { stripe: [], wide: [], flash: [] };
  const top = clipY(skinThin, s.pan + 0.03, false);
  const stripeAt = (x, sw, list) => list.push(extrudeZ(top, sw, sledTrimMat, { bevel: 0.005, segs: 1, shadow: false, x }, m));
  stripeAt(0.13, 0.07, dec.stripe); stripeAt(-0.13, 0.07, dec.stripe);
  stripeAt(0, 0.26, dec.wide);
  dec.flash.push(extrudeZ(clipY(clipY(skinThin, s.pan + 0.17, true), s.pan + 0.07, false), w + 0.05, sledTrimMat, { bevel: 0.005, segs: 1, shadow: false }, m));
  for (const sx of [-1, 1]) dec.flash.push(box(0.012, 0.06, tl * 0.6, sledTrimMat, sx * (tw / 2 + 0.005), 0.49, 0.2 - tl * 0.4, 0, 0, 0, m));
  for (const list of Object.values(dec)) list.forEach(x => x.visible = false);
  if (s.raceStripe) {                                                                        // factory race graphics: flank stripes in the trim colour
    for (const sx of [-1, 1]) { box(0.012, 0.04, tl * 0.5, sledTrimMat, sx * (tw / 2 + 0.005), 0.42, 0.2 - tl * 0.4, 0, 0, 0, m); box(0.012, 0.025, tl * 0.5, sledTrimMat, sx * (tw / 2 + 0.005), 0.53, 0.2 - tl * 0.4, 0, 0, 0, m); }
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) box(0.015, 0.05, 0.16, M.dark, sx * (w / 2 + 0.03), s.pan + 0.1 + i * 0.075, H.zP + 0.28 + i * 0.02, 0, 0, 0, m);   // louvres
  box(w - 0.02, s.yTop - 0.4, 0.03, M.dark, 0, (s.yTop + 0.4) / 2, H.z0 - HB - 0.02, 0, 0, 0, m).castShadow = false;   // bulkhead just behind the hood's back face

  /* nose: grille, lamps and a bumper that suits the decade */
  const yN = s.yNose, yB = s.yBelly, z1 = H.z1, fh = yN - yB - 0.05, tilt = 0.25;
  const grY = yB + 0.05 + fh * 0.2, lampY = yB + 0.05 + fh * 0.6, lampZ = z1 + HB + 0.01;
  box(w * 0.55, fh * 0.26, 0.05, M.black, 0, grY, lampZ - 0.015, tilt, 0, 0, m);             // grille
  for (let i = 0; i < 3; i++) box(w * 0.5, 0.01, 0.012, M.chrome, 0, grY - fh * 0.1 + i * fh * 0.1, lampZ + 0.012, tilt, 0, 0, m);
  if (s.lamp === "round") {
    cyl(0.14, 0.14, 0.12, M.chrome, 0, lampY, lampZ - 0.03, Math.PI / 2 - tilt, 0, 0, m, 16);
    cyl(0.115, 0.115, 0.03, M.lamp, 0, lampY, lampZ + 0.03, Math.PI / 2 - tilt, 0, 0, m, 16).castShadow = false;
  } else if (s.lamp === "rect") {
    box(0.34, 0.16, 0.06, M.chrome, 0, lampY, lampZ, tilt, 0, 0, m);
    box(0.28, 0.11, 0.03, M.lamp, 0, lampY, lampZ + 0.03, tilt, 0, 0, m).castShadow = false;
  } else if (s.lamp === "twin") {
    for (const sx of [-1, 1]) { box(0.22, 0.13, 0.06, M.dark, sx * 0.17, lampY, lampZ, tilt, 0, 0, m); box(0.18, 0.09, 0.03, M.lamp, sx * 0.17, lampY, lampZ + 0.03, tilt, 0, 0, m).castShadow = false; }
  } else if (s.lamp === "slit") {
    box(0.5, 0.1, 0.06, M.dark, 0, lampY, lampZ, tilt, 0, 0, m);
    box(0.46, 0.06, 0.03, M.lamp, 0, lampY, lampZ + 0.03, tilt, 0, 0, m).castShadow = false;
  } else if (s.lamp === "led") {
    for (const sx of [-1, 1]) {
      box(0.2, 0.08, 0.05, M.black, sx * 0.19, lampY, lampZ, tilt, 0, sx * 0.25, m);
      box(0.16, 0.035, 0.03, M.led, sx * 0.19, lampY, lampZ + 0.025, tilt, 0, sx * 0.25, m).castShadow = false;
    }
    box(0.44, 0.012, 0.02, M.led, 0, lampY + 0.09, lampZ + 0.02, tilt, 0, 0, m).castShadow = false;   // DRL bar
  } else if (s.lamp === "strip") {
    box(w * 0.7, 0.03, 0.03, M.black, 0, lampY + 0.02, lampZ, tilt, 0, 0, m);
    box(w * 0.66, 0.014, 0.02, M.led, 0, lampY + 0.02, lampZ + 0.02, tilt, 0, 0, m).castShadow = false;
  }
  const zN = z1 + HB, yBB = yB - HB;                                                          // where the shell's skin actually is
  if (s.bumper === "hoop") {
    tube([[-w / 2 - 0.06, yBB + 0.1, zN - 0.5], [-w / 2 - 0.04, yBB + 0.14, zN - 0.08], [-w * 0.22, yBB + 0.16, zN + 0.14], [w * 0.22, yBB + 0.16, zN + 0.14], [w / 2 + 0.04, yBB + 0.14, zN - 0.08], [w / 2 + 0.06, yBB + 0.1, zN - 0.5]], 0.028, M.chrome, m, 8);
    for (const sx of [-1, 1]) tube([[sx * (w / 2 - 0.12), yBB + 0.02, zN - 0.28], [sx * (w / 2 + 0.04), yBB + 0.13, zN - 0.08]], 0.02, M.chrome, m, 6);
  } else if (s.bumper === "bar") {
    box(w * 0.9, 0.07, 0.07, M.black, 0, yBB + 0.06, zN + 0.04, 0, 0, 0, m);
    for (const sx of [-1, 1]) box(0.06, 0.06, 0.25, M.black, sx * w * 0.4, yBB + 0.06, zN - 0.1, 0, 0, 0, m);
  } else if (s.bumper === "skid") {
    tube([[-w * 0.36, yBB + 0.02, zN - 0.24], [-w * 0.28, yBB + 0.03, zN + 0.06], [w * 0.28, yBB + 0.03, zN + 0.06], [w * 0.36, yBB + 0.02, zN - 0.24]], 0.024, M.black, m, 6);
  }
  ud.lightBar = [yN + 0.22, zN - 0.3]; ud.scoop = [s.yPeak + HB + 0.01, H.zP + 0.12];

  /* seat: a padded profile in the seat colour, on the tunnel */
  const zr = zBack + 0.16, seatW = s.seat === "bench" ? tw - 0.02 : s.seat === "twoup" ? tw - 0.04 : s.seat === "sport" ? 0.4 : 0.44;
  const seat = extrudeZ(SEAT_PROFILES[s.seat](zr), seatW, M.vinyl, { bevel: 0.05, segs: 5 }, m); ud.seat = seat;
  if (s.seat === "twoup") for (const sx of [-1, 1]) tube([[sx * (seatW / 2 + 0.02), 0.82, -0.9], [sx * (seatW / 2 + 0.06), 0.88, -1.0], [sx * (seatW / 2 + 0.06), 0.88, zr + 0.4], [sx * (seatW / 2 + 0.02), 0.82, zr + 0.5]], 0.016, M.chrome, m, 6);   // grab rails
  if (s.seat === "bench") for (let i = 0; i < 3; i++) box(seatW + 0.01, 0.01, 0.02, sledTrimMat, 0, 0.795, -0.86 - i * 0.2, 0, 0, 0, m);   // piping, behind where the rider sits
  tube([[-0.14, 0.76, zr + 0.04], [-0.14, 0.8, zr - 0.06], [0.14, 0.8, zr - 0.06], [0.14, 0.76, zr + 0.04]], 0.014, M.chrome, m, 6);   // grab strap
  // hips rest on top of the cushion: profile top + the seat's bevel + the hip ball's half height
  ud.hip = { y: (s.seat === "sport" ? 0.71 : 0.74) + 0.05 + 0.06, z: s.seat === "sport" ? -0.52 : s.seat === "twoup" ? -0.64 : s.seat === "bench" ? -0.62 : -0.58 };   // well back on the seat, so the legs stretch out to the boards instead of folding into a squat
  // what the rider has to stay out of: the hood envelope (profile + bevel) and the seat cushion
  { const sp = SEAT_PROFILES[s.seat](zr).filter(p => p[1] > 0.65);   // the cushion's top line
    ud.seatTopAt = z => hoodTopAt(sp, z) + 0.05;                      // + the seat's bevel
    let top = 0; for (let z = ud.hip.z - 0.2; z <= ud.hip.z + 0.2; z += 0.02) top = Math.max(top, ud.seatTopAt(z));   // under the whole seat of the pants
    ud.seatTop = top; ud.seatW = seatW; ud.hoodPts = hp; ud.hoodW = w; ud.hoodZ0 = H.z0 - HB - 0.04; }   // hoodZ0 includes the bulkhead plate behind the hood
  // footwells: a toe hold under each side panel, a dark recess flush with the panel and the bulkhead that
  // swallows the front of the boot, so the feet can go forward instead of folding the knees up to the chest.
  // Shown only when poseRider puts the boots there.
  ud.footwell = [-1, 1].map(sx => { const b = box(0.2, 0.245, 0.25, M.black, sx * (w / 2 + 0.056 - 0.1), 0.5075, ud.hoodZ0 - 0.006 + 0.125, 0, 0, 0, m); b.castShadow = false; b.visible = false; return b; });

  /* front end: suspension, spindles, skis */
  const skis = [];
  for (const sx of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(sx * 0.5, 0, 0.92); m.add(pv); skis.push(pv); skiPivots.push(pv);
    const kind = s.skis, sw = SKI_W[kind], skiMat = kind === "steel" ? M.steel : kind === "powder" ? panelMat : M.black;
    extrudeZ(SKI_PROFILES[kind], sw, skiMat, { bevel: 0.012, segs: 2 }, pv);
    box(0.03, 0.03, 1.0, M.steel, 0, -0.012, -0.08, 0, 0, 0, pv);                              // keel / wear bar
    if (kind !== "steel") { for (const d of [-1, 1]) box(0.02, 0.03, 0.9, skiMat, d * sw * 0.32, 0.075, -0.1, 0, 0, 0, pv); tube([[-0.05, 0.12, 0.6], [-0.05, 0.36, 0.78], [0.05, 0.36, 0.78], [0.05, 0.12, 0.6]], 0.012, M.black, pv, 5); }   // ridges and a ski loop
    box(0.18, 0.06, 0.26, M.dark, 0, 0.09, 0.02, 0, 0, 0, pv);                                  // saddle
    if (s.susp === "leaf") {                                                                     // leaf spring riding on the ski
      for (let i = 0; i < 3; i++) box(0.05, 0.016, 0.62 - i * 0.16, M.steel, 0, 0.13 + i * 0.018, 0.02, 0, 0, 0, pv);
      cyl(0.03, 0.03, 0.5, M.steel, 0, 0.42, 0.02, 0, 0, 0, pv, 8);                            // straight spindle up into the hood
      box(0.06, 0.06, 0.2, M.dark, 0, 0.62, 0.02, 0, 0, 0, pv);
    } else {
      cyl(0.03, 0.03, 0.3, M.steel, 0, 0.27, 0.02, 0, 0, 0, pv, 8);                            // spindle
    }
  }
  if (s.susp === "aarm") for (const sx of [-1, 1]) {
    limb(0.03, sx * 0.2, 0.56, 0.9, sx * 0.48, 0.42, 0.94, M.dark, m);                          // upper A-arm
    limb(0.03, sx * 0.2, 0.36, 0.84, sx * 0.48, 0.24, 0.94, M.dark, m);
    limb(0.028, sx * 0.2, 0.36, 1.0, sx * 0.48, 0.24, 0.94, M.dark, m);
    limb(0.04, sx * 0.24, s.yPeak - 0.12, 0.8, sx * 0.46, 0.3, 0.94, M.chrome, m);              // shock
    limb(0.06, sx * 0.26, s.yPeak - 0.16, 0.78, sx * 0.34, s.yPeak - 0.4, 0.84, M.spring, m);   // coil
  } else for (const sx of [-1, 1]) {
    limb(0.03, sx * 0.18, 0.4, 0.5, sx * 0.5, 0.68, 0.94, M.dark, m);                           // radius rod back to the chassis
  }

  /* bars and the column, at this machine's height */
  ud.columnBase = s.yTop - 0.28; ud.columnZ = H.z0 + 0.3;
  const pod = s.gauges === "round";
  const gz = ud.barZ + 0.14, gy = s.barY - 0.06;
  ud.pod = new THREE.Group(); m.add(ud.pod);
  if (pod) { for (const sx of [-1, 1]) { cyl(0.05, 0.05, 0.04, M.chrome, sx * 0.07, 0.02, 0.02, Math.PI / 2 - 0.5, 0, 0, ud.pod, 14); cyl(0.04, 0.04, 0.01, M.black, sx * 0.07, 0.03, 0.04, Math.PI / 2 - 0.5, 0, 0, ud.pod, 14); } }
  else { box(0.24, 0.1, 0.12, M.dark, 0, 0, 0, -0.5, 0, 0, ud.pod); box(0.2, 0.06, 0.005, std(0x18324a, 0.2, 0, { emissive: 0x1f5f8a, emissiveIntensity: 0.8 }), 0, 0.03, 0.06, -0.5, 0, 0, ud.pod).castShadow = false; }
  ud.pod.position.set(0, gy, gz);

  /* the shield stands on the hood just ahead of the bars */
  const zs = ud.barZ + 0.3, ys = crownY(hp, zs) + HB - 0.01;
  ud.shield = { y: ys, z: zs, w };
  if (s.shieldFrame) tube([[-w * 0.38, ys - 0.02, zs - 0.16], [-w * 0.3, ys + 0.01, zs - 0.04], [0, ys + 0.02, zs + 0.02], [w * 0.3, ys + 0.01, zs - 0.04], [w * 0.38, ys - 0.02, zs - 0.16]], 0.012, M.chrome, m, 6);   // chrome bead

  /* era extras */
  if (s.rack) {                                                                                // utility rack over the tail
    const rz = zBack + 0.5, rw = tw + 0.24;
    box(rw, 0.04, 0.9, M.dark, 0, 0.7, rz, 0, 0, 0, m);
    for (const sx of [-1, 1]) { box(0.04, 0.2, 0.9, M.dark, sx * rw / 2, 0.62, rz, 0, 0, 0, m); for (let i = 0; i < 3; i++) box(0.04, 0.16, 0.04, M.dark, sx * rw / 2, 0.62, rz - 0.4 + i * 0.4, 0, 0, 0, m); }
    for (let i = 0; i < 4; i++) box(rw, 0.03, 0.04, M.dark, 0, 0.73, rz - 0.4 + i * 0.27, 0, 0, 0, m);
  }
  if (s.spoiler) {
    box(tw + 0.1, 0.04, 0.2, panelMat, 0, 0.8, zBack + 0.12, -0.25, 0, 0, m);
    for (const sx of [-1, 1]) box(0.05, 0.24, 0.06, M.dark, sx * (tw / 2 - 0.02), 0.69, zBack + 0.1, -0.1, 0, 0, m);
  }
  if (s.charge) { box(0.14, 0.1, 0.02, M.dark, -w / 2 - 0.02, s.pan + 0.12, H.z0 + 0.5, 0, Math.PI / 2, 0, m); box(0.08, 0.05, 0.01, std(0x2be08a, 0.3, 0, { emissive: 0x1fbf6e, emissiveIntensity: 1.2 }), -w / 2 - 0.035, s.pan + 0.12, H.z0 + 0.5, 0, Math.PI / 2, 0, m).castShadow = false; }   // charge port
  if (s.exhaust) { cyl(0.05, 0.05, 0.24, M.steel, s.exhaust * (tw / 2 + 0.05), 0.46, zBack + 0.3, Math.PI / 2, 0, 0, m, 10); }
  ud.skis = skis;
  return m;
}
function buildMachines() {
  V.machines = {};
  for (const sd of SLEDS) V.machines[sd.id] = buildMachine(sd);
  V.machineOf = id => V.machines[id] || V.machines[SLEDS[0].id];
}

/* ---- shared steering, shield, bolt-ons ---- */
sledBody.add(barPivot); barPivot.position.set(0, 1.5, 0.34);
{
  const cg = new THREE.CylinderGeometry(0.035, 0.05, 1, 10); cg.translate(0, 0.5, 0);
  V.column = put(new THREE.Mesh(cg, M.dark), 0, 0.62, 0.34, -0.12);
  V.columnFoot = put(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.16), M.dark), 0, 0.62, 0.36);
}
tube([[-0.4, 0.06, -0.05], [-0.3, 0.03, -0.02], [-0.16, 0, 0], [0.16, 0, 0], [0.3, 0.03, -0.02], [0.4, 0.06, -0.05]], 0.02, M.steel, barPivot, 8);   // bent cross bar
box(0.24, 0.028, 0.028, M.steel, 0, 0.07, 0, 0, 0, 0, barPivot);                       // cross brace
cyl(0.034, 0.034, 0.12, M.steel, 0, -0.06, 0, 0, 0, 0, barPivot, 8);                    // clamp onto the column
V.grip = [];
for (const s of [-1, 1]) {
  limb(0.03, s * 0.29, 0.025, -0.015, s * 0.42, 0.065, -0.055, M.rubber, barPivot);    // grip on the bent end
  V.grip.push(new THREE.Vector3(s * 0.355, 0.045, -0.035));
  (V.guards = V.guards || []).push(box(0.15, 0.13, 0.025, M.dark, s * 0.36, 0.07, 0.07, -0.3, 0, 0, barPivot));   // handguard
}
box(0.1, 0.02, 0.05, M.steel, 0.3, 0.06, 0.03, 0, 0, 0, barPivot);                      // throttle lever
box(0.1, 0.02, 0.05, M.steel, -0.3, 0.06, 0.03, 0, 0, 0, barPivot);                     // brake lever
V.mirrors = new THREE.Group(); barPivot.add(V.mirrors); V.mirrors.visible = false;
for (const sx of [-1, 1]) {
  cyl(0.018, 0.018, 0.26, M.steel, sx * 0.3, 0.16, 0.0, 0.1, 0, sx * 0.25, V.mirrors, 6);
  box(0.15, 0.11, 0.03, M.dark, sx * 0.35, 0.3, 0.01, 0.15, 0, 0, V.mirrors);
}
V.riser = new THREE.Group(); barPivot.add(V.riser);
box(0.12, 0.03, 0.1, M.alu, 0, -0.13, 0, 0, 0, 0, V.riser);                              // riser block: base plate on the column
for (const s of [-1, 1]) box(0.035, 0.13, 0.05, M.alu, s * 0.04, -0.075, 0, 0, 0, 0, V.riser);   // twin posts
box(0.12, 0.03, 0.1, M.alu, 0, -0.03, 0, 0, 0, 0, V.riser);                              // top plate under the clamp
for (const s of [-1, 1]) box(0.04, 0.16, 0.04, M.dark, s * 0.2, 0.1, -0.04, -0.4, 0, 0, V.riser);   // hooks
// windshield: a curved pane (a slice of cylinder) growing up from the hood's back edge
{
  const sh = new THREE.Group(); sledBody.add(sh); V.shield = sh;
  const paneGeo = new THREE.CylinderGeometry(0.3, 0.44, 0.5, 18, 1, true, -1.0, 2.0); paneGeo.translate(0, 0.25, -0.44);
  V.pane = put(new THREE.Mesh(paneGeo, M.glass), 0, 0, 0, 0, 0, 0, sh); V.pane.castShadow = false;
  const bead = new THREE.CylinderGeometry(0.44, 0.452, 0.035, 18, 1, true, -1.0, 2.0); bead.translate(0, 0.0175, -0.44);
  V.paneBead = put(new THREE.Mesh(bead, sledTrimMat), 0, 0, 0, 0, 0, 0, sh); V.paneBead.castShadow = false;
}
// the dash tablet: a rugged 10-inch screen in a rubber cradle on a RAM-style arm off the bar clamp. Idle, it
// shows a live heading-up map (a small CanvasTexture, see TABLET.dash); dip your head to it (Tab) and the
// tablet OS is laid exactly over this glass. Built facing -z (the rider) and tilted back toward the eyes.
const TABHW = { W: 0.22, H: 0.1408, R: 0.012, tilt: 0.55 };
// a rounded rectangle, for the iPad-style frame and the glass inside it
function roundRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
{
  const T = new THREE.Group(); sledBody.add(T); V.tab = T; T.rotation.x = TABHW.tilt;
  const W = TABHW.W, H = TABHW.H, bz = 0.009;                                                      // bz: the bezel round the glass
  // no bezel: the glass is the whole front. From behind it reads as a plain dark panel, so the tablet still has a back in the chase view.
  const back = new THREE.Mesh(new THREE.ShapeGeometry(roundRect(W, H, TABHW.R), 10), std(0x1b1e22, 0.5, 0.4));
  back.position.z = -0.0068; T.add(back);
  box(0.06, 0.06, 0.01, M.alu, 0, 0, 0.012, 0, 0, 0, T);                                            // the mount plate on its back
  ball(0.016, M.dark, 0, 0, 0.022, T);
  const c = document.createElement("canvas"); c.width = 320; c.height = 205;
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  // the display: the same rounded rectangle, its UVs spread over the canvas
  const sg = new THREE.ShapeGeometry(roundRect(W, H, TABHW.R), 10), uv = sg.attributes.uv, ps = sg.attributes.position;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, ps.getX(k) / W + 0.5, ps.getY(k) / H + 0.5);
  const scr = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }));
  scr.rotation.y = Math.PI; scr.position.z = -0.0072; T.add(scr);
  V.tabScr = scr; V.tabCv = c; V.tabTex = tex;
  // the arm, from the bar clamp up to the ball: one tube re-aimed by applyLoadout for each machine's bar height
  const ag = new THREE.CylinderGeometry(0.012, 0.014, 1, 8); ag.translate(0, 0.5, 0);
  V.tabArm = put(new THREE.Mesh(ag, M.dark), 0, 0, 0); V.tabKnob = ball(0.02, M.dark, 0, 0, 0);
}
// cargo on the deck
cargoMesh = new THREE.Group(); sledBody.add(cargoMesh); cargoMesh.visible = false;
for (let i = 0; i < 3; i++) {
  box(0.46, 0.32, 0.38, std(i === 1 ? 0x7a6a52 : 0x8a6a42, 0.9), 0, 0.76, -1.5 - i * 0.44, 0.22, 0, 0, cargoMesh);
  box(0.5, 0.05, 0.06, sledTrimMat, 0, 0.92, -1.48 - i * 0.44, 0.22, 0, 0, cargoMesh);
}
V.deck = new THREE.Group(); sledBody.add(V.deck);
box(0.62, 0.08, 1.0, M.alu, 0, 0.58, -1.95, 0.08, 0, 0, V.deck);       // stretched deck
box(0.06, 0.2, 1.0, M.dark, 0.3, 0.68, -1.95, 0.08, 0, 0, V.deck);
box(0.06, 0.2, 1.0, M.dark, -0.3, 0.68, -1.95, 0.08, 0, 0, V.deck);
// jerry cans on the running boards
V.canMat = std(0xb3201a, 0.45, 0.35);
V.tankL = new THREE.Group(); V.tankR = new THREE.Group(); sledBody.add(V.tankL, V.tankR);
for (const [grp, sx] of [[V.tankL, 1], [V.tankR, -1]]) {   // the sled faces +z, so its left is +x
  const cx = sx * 0.38, cz = -0.68, cy = 0.56;
  box(0.13, 0.36, 0.28, V.canMat, cx, cy, cz, 0, 0, 0, grp);
  for (const d of [-1, 1]) box(0.012, 0.36, 0.035, V.canMat, cx + sx * 0.066, cy, cz, d * 0.9, 0, 0, grp);
  box(0.135, 0.03, 0.285, V.canMat, cx, cy + 0.12, cz, 0, 0, 0, grp);
  for (const hz of [-0.07, 0, 0.07]) box(0.03, 0.06, 0.025, V.canMat, cx, cy + 0.2, cz + hz, 0, 0, 0, grp);
  box(0.03, 0.02, 0.17, V.canMat, cx, cy + 0.235, cz, 0, 0, 0, grp);
  cyl(0.028, 0.028, 0.06, M.dark, cx, cy + 0.19, cz + 0.12, 0.5, 0, 0, grp, 8);
  box(0.05, 0.03, 0.03, M.chrome, cx, cy + 0.2, cz + 0.1, 0, 0, 0, grp);
  box(0.16, 0.035, 0.31, M.dark, cx - sx * 0.01, cy + 0.04, cz, 0, 0, 0, grp);
  box(0.1, 0.035, 0.035, M.dark, sx * 0.3, cy + 0.04, cz, 0, 0, 0, grp);
}
V.lightBar = new THREE.Group(); sledBody.add(V.lightBar);
box(0.66, 0.08, 0.1, M.dark, 0, 0, 0, 0.2, 0, 0, V.lightBar);
box(0.6, 0.05, 0.04, M.led, 0, -0.02, 0.05, 0.2, 0, 0, V.lightBar).castShadow = false;
for (const sx of [-1, 1]) box(0.04, 0.24, 0.04, M.dark, sx * 0.26, -0.12, -0.04, 0.2, 0, 0, V.lightBar);
V.raceCan = new THREE.Group(); sledBody.add(V.raceCan);
cyl(0.09, 0.11, 0.6, M.chrome, 0.26, 0.5, -0.9, Math.PI / 2 - 0.1, 0, 0, V.raceCan, 12);
cyl(0.06, 0.06, 0.12, M.dark, 0.26, 0.5, -1.22, Math.PI / 2 - 0.1, 0, 0, V.raceCan, 10);
cyl(0.12, 0.12, 0.34, std(0x9a8a6a, 0.3, 0.7), 0.26, 0.52, -0.84, Math.PI / 2 - 0.1, 0, 0, V.raceCan, 12);
V.rackBox = new THREE.Group(); sledBody.add(V.rackBox);
box(0.56, 0.3, 0.5, std(0x2e3742, 0.8), 0, 0.76, -1.56, 0.18, 0, 0, V.rackBox);
box(0.58, 0.05, 0.52, sledTrimMat, 0, 0.92, -1.55, 0.18, 0, 0, V.rackBox);
{
  const springY = std(0xf2c230, 0.35, 0.6), springR = std(0xd8352a, 0.35, 0.6), gold = std(0xc9a227, 0.25, 0.8);
  const spring = (ax, ay, az, bx, by, bz, r, turns, mat, parent) => {
    const len = Math.hypot(bx - ax, by - ay, bz - az), pts = [];
    for (let i = 0; i <= turns * 12; i++) { const t = i / (turns * 12), a = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, t * len)); }
    const g = new THREE.Group(); g.position.set(ax, ay, az); parent.add(g);
    g.lookAt(new THREE.Vector3(bx, by, bz).sub(new THREE.Vector3(ax, ay, az)).add(g.position));
    const mm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 12, 0.013, 5), mat); mm.castShadow = true; g.add(mm);
    return g;
  };
  const grp = (name, parent = sledBody) => { const g = new THREE.Group(); parent.add(g); g.visible = false; V[name] = g; return g; };
  const tr = V.track;
  const pad = grp("paddles", tr);
  for (let i = 0; i < 16; i++) box(0.54, 0.12, 0.045, M.rubber, 0, -0.02, -1.45 + i * 0.12, 0, 0, 0, pad);
  const hp = grp("hardpack", tr);
  for (let i = 0; i < 16; i++) for (const sx of [-1, 1]) box(0.24, 0.04, 0.05, M.rubber, sx * 0.12, 0.0, -1.43 + i * 0.12, 0, sx * 0.35, 0, hp);
  V.powderSki = []; V.carbide = [];
  for (const [name, mat, r, turns, res] of [["coilKit", springY, 0.075, 6, false], ["longKit", springR, 0.085, 8, true]]) {
    const g = grp(name);
    for (const s of [-1, 1]) {
      spring(s * 0.24, 0.84, 0.8, s * 0.46, 0.3, 0.94, r, turns, mat, g);
      if (res) { cyl(0.045, 0.045, 0.24, gold, s * 0.18, 0.86, 0.7, 0.4, 0, s * 0.4, g, 10); limb(0.012, s * 0.18, 0.9, 0.72, s * 0.24, 0.84, 0.8, M.dark, g); }
    }
    const rg = grp(name + "Rear", tr);
    spring(0, 0.33, -1.095, 0, 0.68, -0.905, r * 1.1, turns, mat, rg);
    if (res) cyl(0.05, 0.05, 0.3, gold, 0.1, 0.55, -1.02, 0.5, 0, 0, rg, 10);
  }
  const cl = grp("clutchKit");
  box(0.04, 0.3, 0.42, M.dark, -0.44, 0.62, 0.5, 0, 0, 0, cl);
  cyl(0.12, 0.12, 0.05, M.black, -0.46, 0.62, 0.5, 0, 0, Math.PI / 2, cl, 16);
  spring(-0.47, 0.62, 0.5, -0.53, 0.62, 0.5, 0.075, 3, springR, cl);
  const hs = grp("hoodScoop");
  box(0.34, 0.08, 0.34, M.dark, 0, 0.03, 0, 0.12, 0, 0, hs);
  box(0.28, 0.05, 0.03, M.black, 0, 0.05, 0.17, 0.12, 0, 0, hs);
  for (let i = 0; i < 3; i++) box(0.24, 0.012, 0.012, M.chrome, 0, 0.035 + i * 0.018, 0.186, 0.12, 0, 0, hs);
  const tb = grp("turboScoop");
  box(0.52, 0.1, 0.4, M.black, 0, 0.04, 0, 0.1, 0, 0, tb);
  for (const sx of [-1, 1]) box(0.18, 0.06, 0.03, springR, sx * 0.13, 0.07, 0.2, 0.1, 0, 0, tb);
  box(0.4, 0.02, 0.3, std(0x2e3742, 0.4, 0.5), 0, 0.1, -0.02, 0.1, 0, 0, tb);
  const tc2 = grp("trailCan");
  cyl(0.075, 0.08, 0.34, M.dark, 0.28, 0.48, -0.75, Math.PI / 2 - 0.1, 0, 0, tc2, 12);
  cyl(0.045, 0.045, 0.08, M.chrome, 0.28, 0.46, -0.95, Math.PI / 2 - 0.1, 0, 0, tc2, 10);
  const tcn = grp("turboCan");                                  // turbo plumbing down the right flank
  cyl(0.1, 0.12, 0.7, M.chrome, 0.32, 0.5, -0.7, Math.PI / 2 - 0.08, 0, 0, tcn, 12);
  box(0.14, 0.05, 0.1, M.dark, 0.3, 0.5, -0.95, 0, 0, 0, tcn);
  box(0.14, 0.05, 0.1, M.dark, 0.3, 0.5, -0.42, 0, 0, 0, tcn);
  cyl(0.07, 0.07, 0.62, M.dark, 0.32, 0.66, -0.14, Math.PI / 2 - 0.5, 0, 0, tcn, 10);
  ball(0.13, M.steel, 0.32, 0.86, 0.26, tcn);
  cyl(0.05, 0.05, 0.3, M.dark, 0.24, 0.86, 0.4, Math.PI / 2 - 0.2, 0, 0, tcn, 8);
  // aftermarket skis ride on the steering pivots of whichever machine is showing
  V.skiKits = new THREE.Group(); sledBody.add(V.skiKits);
  for (const sx of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(sx * 0.5, 0, 0.92); V.skiKits.add(pv); skiPivots.push(pv);
    const ps = extrudeZ(SKI_PROFILES.powder, 0.3, panelMat, { bevel: 0.012, segs: 2 }, pv); ps.visible = false; V.powderSki.push(ps);
    for (const d of [-1, 1]) { const rb = box(0.02, 0.03, 0.95, panelMat, d * 0.1, 0.075, -0.1, 0, 0, 0, pv); rb.visible = false; V.powderSki.push(rb); }
    const cb = box(0.05, 0.05, 1.0, M.chrome, 0, -0.03, -0.08, 0, 0, 0, pv); cb.visible = false; V.carbide.push(cb);
  }
}

/* ---- the rider: sat on the seat, boots on the boards, hands on the grips ---- */
// Everything above the hips lives in `ub`, which pitches forward to reach the bars and
// rolls into corners. Legs and arms are two-bone IK chains re-solved when the machine or
// kit changes (legs) and every frame (arms, since the bars turn).
// the rider is built at a ~1.75 m adult's proportions; RIDER_SCALE sizes everything above the hips
// the visor wipe's shared state (timeline in wipeTimeline, below with the frost): the rider's arm reads it every frame, so it must exist before the rider is posed
const WIPE = { w: 0, px: 0, py: 0, lean: 0, ts: 0, live: false, hand: false };
const _sm = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
const RIDER_SCALE = 1.14;
const rider = new THREE.Group(); sledBody.add(rider); V.rider = rider;
const ub = new THREE.Group(); rider.add(ub); V.ub = ub; ub.scale.setScalar(RIDER_SCALE);
{
  const fur = std(0x8a7358, 1.0), reflect = std(0xdde6ee, 0.3, 0.4, { emissive: 0x3a4652, emissiveIntensity: 0.4 }),
    heatMat = std(0xff7a2a, 0.4, 0, { emissive: 0xff5a10, emissiveIntensity: 1.4 }), packMat = std(0x2a3038, 0.9);
  V.footX = 0.27;
  V.boots = []; V.bootCuff = []; V.footPlain = []; V.legs = []; V.kneePads = []; V.reflect = [];
  for (const sx of [-1, 1]) {
    V.footPlain.push(box(0.15, 0.12, 0.34, M.boot, sx * V.footX, 0.445, 0, 0, 0, 0, rider));                 // pac boot on the board
    V.boots.push(box(0.17, 0.22, 0.36, std(0x2a3038, 0.85), sx * V.footX, 0.49, -0.01, 0, 0, 0, rider));    // taller arctic boot
    V.bootCuff.push(ball(0.125, fur, sx * V.footX, 0.6, -0.04, rider, 1, 0.5, 1.1));
    V.legs.push(limbDyn(0.11, 0.092, pantsMat, rider));                                                   // thigh
    V.legs.push(limbDyn(0.092, 0.075, pantsMat, rider));                                                   // shin
    V.kneePads.push(box(0.17, 0.2, 0.09, M.pad, 0, 0, 0, -0.4, 0, 0, rider));
    V.reflect.push(box(0.195, 0.04, 0.195, reflect, 0, 0, 0, 0, 0, 0, rider));                             // shin band, positioned in pose
  }
  // seat: a pelvis core plus two cheeks behind it (rear is -z); cheek bottoms stay at the old ball's
  // underside (y -0.14) so the rider still rests on ud.seatTop
  V.hips = new THREE.Group(); ub.add(V.hips);
  V.hipParts = [ball(0.17, pantsMat, 0, 0.0, 0.03, V.hips, 1.0, 0.65, 1.0)];
  for (const sx of [-1, 1]) V.hipParts.push(ball(0.125, pantsMat, sx * 0.085, -0.035, -0.07, V.hips, 0.95, 0.84, 1.0));
  V.fpHide = [];                                  // upper-body pieces that sit around the first-person eye: hidden there, or the near plane slices them open
  V.torso = box(0.36, 0.38, 0.25, jacketMat, 0, 0.22, 0.0, 0, 0, 0, ub);
  V.chest = ball(0.22, jacketMat, 0, 0.36, 0.03, ub, 1.0, 0.75, 0.85);
  V.fpHide.push(V.torso, V.chest, ball(0.14, jacketMat, 0, 0.47, 0.0, ub, 1.0, 0.6, 0.9));                                                   // collar
  V.furCollar = ball(0.17, fur, 0, 0.48, -0.02, ub, 1.15, 0.5, 1.05);
  V.fpHide.push(box(0.22, 0.26, 0.11, packMat, 0, 0.26, -0.18, 0, 0, 0, ub),                                // small pack
    box(0.24, 0.05, 0.12, packMat, 0, 0.4, -0.18, 0, 0, 0, ub));
  styleParts.sleeves = [];
  V.arms = []; V.shoulder = [];
  { const sg = new THREE.CylinderGeometry(0.095, 0.095, 0.4, 12); sg.rotateZ(Math.PI / 2); V.fpHide.push(put(new THREE.Mesh(sg, jacketMat), 0, 0.39, 0.02, 0, 0, 0, ub)); }   // shoulder line across the top of the jacket
  for (const sx of [-1, 1]) {
    V.fpHide.push(ball(0.1, jacketMat, sx * 0.2, 0.39, 0.02, ub, 1, 1, 1));                                              // rounded shoulder cap the sleeve grows from
    V.shoulder.push(new THREE.Vector3(sx * 0.2, 0.39, 0.03));
    const ua = limbDyn(0.075, 0.065, jacketMat, ub), fa = limbDyn(0.065, 0.055, jacketMat, ub);
    V.arms.push(ua, fa); V.fpHide.push(ua);                                                              // upper arm (and its band) goes with the shoulder
    const band = box(0.19, 0.06, 0.19, riderTrimMat, 0, 0, 0.2, 0, 0, 0, ua); styleParts.sleeves.push(band);   // sleeve band, rides the upper arm
    const rb = box(0.17, 0.05, 0.17, reflect, 0, 0, 0.16, 0, 0, 0, fa); V.reflect.push(rb);                      // forearm band
  }
  styleParts.stripe = box(0.08, 0.36, 0.04, riderTrimMat, 0, 0.24, 0.135, 0, 0, 0, ub);
  styleParts.back = box(0.3, 0.1, 0.03, riderTrimMat, 0, 0.3, -0.13, 0, 0, 0, ub);                        // back yoke
  styleParts.chestPanel = box(0.32, 0.1, 0.03, riderTrimMat, 0, 0.3, 0.13, 0, 0, 0, ub);                  // chest yoke
  const neck = cyl(0.06, 0.06, 0.1, M.glove, 0, 0.53, 0.02, 0, 0, 0, ub, 8); V.neck = neck;
  const head = new THREE.Group(); head.position.set(0, 0.6, 0.03); ub.add(head); V.head = { g: head };
  const helm = ball(0.19, M.helmet, 0, 0.06, 0, head, 1, 1.08, 1.1);
  const chin = box(0.24, 0.12, 0.2, M.helmet, 0, -0.03, 0.1, 0.1, 0, 0, head);
  const visor = box(0.28, 0.12, 0.1, M.visor, 0, 0.06, 0.16, 0.05, 0, 0, head);
  const hstripe = box(0.06, 0.09, 0.34, riderTrimMat, 0, 0.22, 0.0, 0, 0, 0, head);
  const beanie = ball(0.185, riderTrimMat, 0, 0.07, 0, head, 1, 0.82, 1.0);
  const bobble = ball(0.06, riderTrimMat, 0, 0.23, 0, head);
  const face = ball(0.165, M.skin, 0, 0.02, 0.02, head, 0.9, 1.0, 0.95);
  const mask = ball(0.175, std(0x1a1f26, 0.9), 0, 0.02, 0.02, head, 0.95, 1.0, 1.0);
  const goggles = box(0.29, 0.1, 0.11, M.visor, 0, 0.07, 0.15, 0.05, 0, 0, head);
  const gogStrap = box(0.33, 0.06, 0.3, riderTrimMat, 0, 0.08, 0.0, 0, 0, 0, head);
  V.heatVisor = box(0.29, 0.015, 0.02, heatMat, 0, 0.125, 0.2, 0.05, 0, 0, head);
  V.head.helmet = [helm, chin, visor, hstripe];
  V.head.beanie = [beanie, bobble, face, goggles, gogStrap];
  V.head.mask = [beanie, bobble, mask, goggles, gogStrap];
  V.head.heated = [helm, chin, visor, hstripe];
  V.visor = visor; V.goggles = goggles;
  riderHead = [helm, chin, visor, hstripe, neck];
  V.headAll = [helm, chin, visor, hstripe, beanie, bobble, face, mask, goggles, gogStrap, V.heatVisor, neck];
  // gloves are part of the bars, so they turn with them and the arms reach for them
  V.gloves = []; V.mitts = []; V.heatBand = []; V.wrist = []; V.hands = []; V.handRest = [];
  const _XAX = new THREE.Vector3(1, 0, 0);
  for (const [i, sx] of [-1, 1].entries()) {
    const gp = V.grip[i], hand = new THREE.Group(); hand.position.copy(gp); barPivot.add(hand);
    // hand space: +x along the grip toward the machine's right, +y up, +z forward (a proper basis, so the
    // left hand isn't flipped upside down the way a 180°-ish setFromUnitVectors would do it)
    const hx = new THREE.Vector3(0.13, sx * 0.04, -sx * 0.04).normalize(), hz = new THREE.Vector3(0, 0, 1).cross(hx).cross(hx).negate().normalize(), hy = hz.clone().cross(hx);
    hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(hx, hy, hz));
    V.hands.push(hand); V.handRest.push({ p: hand.position.clone(), q: hand.quaternion.clone() });
    // a closed fist: fingers curl over the top and round the front of the grip, palm behind it,
    // thumb hooked over the inboard end, back of the hand rising to the wrist behind the bar
    const fist = (k, g) => {
      const wrap = new THREE.CylinderGeometry(0.05 * k, 0.05 * k, 0.1 * k, 14, 1, false, 4.4, Math.PI * 2 - 1.4);   // open behind/below where the palm meets the grip
      wrap.rotateZ(Math.PI / 2); put(new THREE.Mesh(wrap, M.glove), 0, 0.002, 0.004, 0, 0, 0, g);
      for (const fx of [-0.036, -0.012, 0.012, 0.036]) ball(0.02 * k, M.glove, fx * k, 0.035 * k, 0.036 * k, g, 1.05, 0.9, 1);   // knuckles
      ball(0.05 * k, M.glove, 0, 0.012 * k, -0.03 * k, g, 1.0, 0.95, 0.8);                                           // palm heel behind the grip
      const th = limbDyn(0.017 * k, 0.015 * k, M.glove, g);                                                           // thumb over the inboard end
      th.userData.set(new THREE.Vector3(-sx * 0.045 * k, 0.03 * k, -0.035 * k), new THREE.Vector3(-sx * 0.05 * k, 0.048 * k, 0.03 * k));
      box(0.085 * k, 0.05 * k, 0.07 * k, M.glove, 0, 0.034 * k, -0.06 * k, 0.5, 0, 0, g);                              // back of the hand
      const cuff = new THREE.CylinderGeometry(0.052 * k, 0.047 * k, 0.07 * k, 12); cuff.rotateX(Math.PI / 2 - 0.35);
      put(new THREE.Mesh(cuff, M.glove), 0, 0.042 * k, -0.1 * k, 0, 0, 0, g);                                         // gauntlet over the sleeve end
    };
    const g = new THREE.Group(); hand.add(g); V.gloves.push(g); fist(1, g);
    const mt = new THREE.Group(); hand.add(mt); V.mitts.push(mt); fist(1.2, mt);
    V.heatBand.push(box(0.11, 0.025, 0.03, heatMat, 0, 0.078, -0.1, 0.35, 0, 0, hand));
    hand.updateMatrix();                                                                                   // the wrist in barPivot space (hand.matrixWorld isn't built yet)
    V.wrist.push(new THREE.Vector3(0, 0.05, -0.13).applyMatrix4(hand.matrix));                              // where the forearm meets the glove cuff
  }
  // the wipe hand: the rider's left hand comes off the bar, opens, and scrubs the visor (poseArms / placeWipeHand). Hand space
  // as the fist: wrist behind (-z), fingers ahead (+z), palm facing -y, back of the hand +y, thumb on +x. Gloves have four
  // fingers; mitts keep them together in one rounded block. Shown only during a wipe; the fist is hidden while it is up.
  {
    const hand = V.hands[1], flat = (k, mitt) => {
      const g = new THREE.Group(); g.visible = false; hand.add(g);
      box(0.092 * k, 0.034 * k, 0.1 * k, M.glove, 0, 0, -0.045 * k, 0, 0, 0, g);                                // palm
      box(0.07 * k, 0.03 * k, 0.05 * k, M.glove, 0, 0.004 * k, -0.098 * k, -0.25, 0, 0, g);                      // heel of the hand, rolling into the wrist
      if (mitt) { box(0.1 * k, 0.04 * k, 0.09 * k, M.glove, 0, 0, 0.045 * k, 0, 0, 0, g); ball(0.05 * k, M.glove, 0, 0, 0.09 * k, g, 1, 0.8, 0.7); }
      else for (const [fx, len] of [[-0.033, 0.074], [-0.011, 0.088], [0.011, 0.082], [0.033, 0.066]]) {
        box(0.021 * k, 0.026 * k, len * k, M.glove, fx * k, 0, (0.005 + len / 2) * k, 0, fx * 3, 0, g);          // finger, fanned a touch
        ball(0.0125 * k, M.glove, fx * k * 1.05, 0, (0.005 + len) * k, g, 1, 0.95, 1);                           // fingertip
      }
      // thumb: a rounded two-joint digit that grows out of a pad on the side of the palm and angles forward alongside the index finger
      ball(0.032 * k, M.glove, 0.044 * k, -0.004 * k, -0.07 * k, g, 1, 0.8, 1.15);                               // ball of the thumb, blends it into the palm
      { const tp = [[0.052, -0.008, -0.07], [0.078, -0.008, -0.03], [0.083, -0.006, 0.014]].map(a => new THREE.Vector3(a[0] * k, a[1] * k, a[2] * k)),
          t1 = limbDyn(0.02 * k, 0.017 * k, M.glove, g), t2 = limbDyn(0.017 * k, 0.014 * k, M.glove, g);
        t1.userData.set(tp[0], tp[1]); t2.userData.set(tp[1], tp[2]); }
      const cuff = new THREE.CylinderGeometry(0.052 * k, 0.047 * k, 0.07 * k, 12); cuff.rotateX(Math.PI / 2);
      put(new THREE.Mesh(cuff, M.glove), 0, 0, -0.118 * k, 0, 0, 0, g);                                          // gauntlet over the sleeve end
      return g;
    };
    V.wipeHand = { g: flat(1, false), m: flat(1.2, true) };
  }
}
const WRIST_FIST = new THREE.Vector3(0, 0.05, -0.13), WRIST_OPEN = new THREE.Vector3(0, 0, -0.14);
// two-bone IK: joint position for a chain root→joint→tip with lengths l1, l2, bent toward `pole`
const _ikd = new THREE.Vector3(), _ikp = new THREE.Vector3(), _ikj = new THREE.Vector3();
function ik2(root, tip, l1, l2, pole, out) {
  _ikd.copy(tip).sub(root); let d = _ikd.length(); if (d < 1e-4) { _ikd.set(0, -1, 0); d = 1e-4; }
  const dmax = (l1 + l2) * 0.995; if (d > dmax) d = dmax; _ikd.normalize();
  const a = clamp((l1 * l1 - l2 * l2 + d * d) / (2 * d), -l1, l1), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  _ikp.copy(pole).addScaledVector(_ikd, -pole.dot(_ikd)); if (_ikp.lengthSq() < 1e-6) _ikp.set(0, 0, 1); _ikp.normalize();
  return out.copy(root).addScaledVector(_ikd, a).addScaledVector(_ikp, h);
}
const _pA = new THREE.Vector3(), _pB = new THREE.Vector3(), _pJ = new THREE.Vector3(), _pP = new THREE.Vector3(), _pT = new THREE.Vector3();
const CLIMB = { v: 0, stand: 0 };   // 0..1 how hard the sled is going up a steep face: rider stands, nose lifts, chase cam rises
const RIDER = { thigh: 0.44, shin: 0.43, upper: 0.3, fore: 0.29, hipX: 0.14, pitch: 0.4, legR: 0.105, baseY: 0, lift: -1, legLift: 0, standH: 0.4 };   // arm lengths are in ub space (× RIDER_SCALE)
// how far a ball of radius r at p sinks into the machine's hood or seat (0 = clear)
// top of a [z, y] outline at z (the highest crossing); off either end, the nearest end's height
function hoodTopAt(pts, z) {
  let y = -1, near = pts[0];
  for (let i = 1; i < pts.length; i++) { const [za, ya] = pts[i - 1], [zb, yb] = pts[i]; if (za !== zb && (z - za) * (z - zb) <= 0) y = Math.max(y, ya + (yb - ya) * (z - za) / (zb - za)); }
  if (y > -1) return y;
  for (const p of pts) if (Math.abs(p[0] - z) < Math.abs(near[0] - z)) near = p;
  return near[1];
}
function sinkInto(ud, p, r) {
  let d = 0;
  const hy = hoodTopAt(ud.hoodPts, Math.max(p.z, ud.hoodPts[0][0]));
  if (hy > 0) d = Math.max(d, Math.min(ud.hoodW / 2 + 0.05 + r - Math.abs(p.x), hy + 0.05 + r - p.y, p.z - (ud.hoodZ0 - r)));
  d = Math.max(d, Math.min(ud.seatW / 2 + 0.05 + r - Math.abs(p.x), ud.seatTopAt(clamp(p.z, ud.zBack, 0.05)) + r - p.y, 0.1 + r - p.z, p.z - ud.zBack + r));
  return d;
}   // arm lengths are in ub space (× RIDER_SCALE)
// the seated pose: hips on this machine's seat, feet on its boards, torso pitched until the grips are in reach
function poseRider() {
  const mc = V.machineOf ? V.machineOf(PV.sled || GS.own.sled) : null; if (!mc) return;
  const ud = mc.userData, hip = ud.hip;
  rider.position.set(0, 0, 0);
  ub.position.set(0, ud.seatTop + 0.2 * 0.7 * RIDER_SCALE + 0.012, hip.z);   // hips sit on the cushion (and its piping), not in it
  RIDER.baseY = ub.position.y;
  // choose the torso pitch: lean forward until both grips are comfortably inside arm's reach
  barPivot.updateWorldMatrix(true, false);
  let pitch = 0.25, reach = RIDER.upper + RIDER.fore;
  for (let i = 0; i < 11; i++) {
    ub.rotation.set(pitch, 0, 0); ub.updateWorldMatrix(true, false);
    _pT.copy(V.wrist[1]); barPivot.localToWorld(_pT); ub.worldToLocal(_pT);
    if (_pT.distanceTo(V.shoulder[1]) < reach * 0.97) break;
    pitch += 0.05;
  }
  RIDER.pitch = pitch;
  V.head.g.rotation.x = -pitch;                       // eyes on the trail, not the hood
  // legs, in rider space: hip joint → knee → ankle above the boot. Search where the boot goes (back on the
  // board behind the hood, or forward with the toe in the footwell; inboard or out toward the board's edge)
  // and which way the knee points, for the leg that doesn't sink into the hood or seat and sits the way a
  // rider does: thighs forward rather than frogged out sideways, knees not hiked up to the chest.
  const q = new THREE.Vector3(), ax = new THREE.Vector3(), fw = new THREE.Vector3(), out = new THREE.Vector3(), F = new THREE.Vector3();
  const panel = ud.hoodW / 2 + 0.05, inHood = z => z + 0.18 > ud.hoodZ0 + 0.01;   // does the toe reach under the hood?
  let best = null;
  _pA.set(RIDER.hipX, ud.seatTop + RIDER.legR + 0.005, hip.z + 0.06);
  for (let fz = ud.hoodZ0 - 0.24; fz <= ud.hoodZ0 - 0.0299; fz += 0.03) {
    const well = inHood(fz), xMax = well ? Math.min(ud.boardX + 0.04, panel - 0.088) : ud.boardX + 0.01;   // inside the board's lip
    for (let fx = ud.boardX; fx <= xMax + 1e-4; fx += 0.02) {
      _pB.set(fx + 0.025, 0.53, fz - 0.03);                     // ankle over the outer half of the boot
      ax.copy(_pB).sub(_pA).normalize(); F.set(0.2, 0.15, 1);
      fw.copy(F).addScaledVector(ax, -F.dot(ax)).normalize(); out.crossVectors(ax, fw); if (out.x < 0) out.negate();
      for (let a = 0; a <= 1.6001; a += 0.08) {
        _pP.copy(fw).multiplyScalar(Math.cos(a)).addScaledVector(out, Math.sin(a));
        ik2(_pA, _pB, RIDER.thigh, RIDER.shin, _pP, _pJ);
        let sink = 0;
        for (const t of [0.35, 0.7, 1]) sink += sinkInto(ud, q.copy(_pA).lerp(_pJ, t), RIDER.legR);
        for (const t of [0.3, 0.6, 0.85]) sink += sinkInto(ud, q.copy(_pJ).lerp(_pB, t), RIDER.legR * 0.85);
        const splay = Math.atan2(_pJ.x - _pA.x, Math.max(1e-3, _pJ.z - _pA.z)),   // 0 = thigh straight ahead
          rise = Math.max(0, _pJ.y - _pA.y - 0.04);                               // knees about level with the hips: sat, not squatting
        const cost = sink * 6 + Math.max(0, splay - 0.35) * 0.12 + rise * 0.4 + (ud.hoodZ0 - 0.03 - fz) * 0.03 + (well ? 0.004 : 0);   // feet forward, legs out
        if (!best || cost < best.cost) best = { cost, fx, fz, well, pole: _pP.clone() };
      }
    }
  }
  ud.footwell.forEach(m => m.visible = best.well);
  RIDER.legFit = best; RIDER.legLift = -1; RIDER.lift = -1;
  poseLegs(CLIMB.stand);
  poseArms();
}
// hips and knees for a given stand height (0 = seated). The boots stay on the boards; the hips rise and the knees fold forward.
const _lq = new THREE.Vector3();
function poseLegs(lift) {
  const best = RIDER.legFit; if (!best || !V.legs) return;
  RIDER.legLift = lift;
  const mc = V.machineOf(PV.sled || GS.own.sled), ud = mc.userData, hip = ud.hip;
  for (const [i, sx] of [-1, 1].entries()) {
    const footX = best.fx, footZ = best.fz;
    _pA.set(sx * RIDER.hipX, ud.seatTop + RIDER.legR + 0.005 + lift, hip.z + 0.06 - lift * 0.25); _pB.set(sx * (footX + 0.025), 0.53, footZ - 0.03);
    ik2(_pA, _pB, RIDER.thigh, RIDER.shin, _pP.copy(best.pole).multiply(_lq.set(sx, 1, 1)), _pJ);
    V.legs[i * 2].userData.set(_pA, _pJ); V.legs[i * 2 + 1].userData.set(_pJ, _pB);
    V.kneePads[i].position.copy(_pJ).add(_pT.set(0, 0.02, 0.07)); aimZ(V.kneePads[i], _pJ, _pT.set(_pB.x, _pB.y - 0.4, _pB.z + 0.5));
    V.reflect[i].position.copy(_pJ).lerp(_pB, 0.55); aimZ(V.reflect[i], V.reflect[i].position, _pB);
    V.footPlain[i].position.set(sx * footX, 0.45, footZ); V.boots[i].position.set(sx * footX, 0.5, footZ - 0.01); V.bootCuff[i].position.set(sx * footX, 0.62, footZ - 0.04);
  }
}

// the wipe hand: swap the grip fist for the open hand (and back), by the gloves the rider is wearing
function wipeHandSet(on) {
  const mitt = GS.own.gear.gloves !== "leather", wh = V.wipeHand;
  if (on) { V.gloves[1].visible = V.mitts[1].visible = false; wh.g.visible = !mitt; wh.m.visible = mitt; }
  else { wh.g.visible = wh.m.visible = false; V.gloves[1].visible = !mitt; V.mitts[1].visible = mitt; }
  WIPE.hand = on;
}
const _wP = new THREE.Vector3(), _wX = new THREE.Vector3(), _wY = new THREE.Vector3(), _wZ = new THREE.Vector3(), _wM = new THREE.Matrix4(), _wQ = new THREE.Quaternion(), _wQ2 = new THREE.Quaternion();
// where the left hand goes: in front of the visor, palm to the helmet, fingers up and leaning with the stroke. Blends from the
// grip by w. Leaves the wrist (barPivot space) in _pT for the arm IK. Needs barPivot's world matrix current.
function placeWipeHand(w) {
  const hand = V.hands[1], rest = V.handRest[1], head = V.head.g;
  head.updateWorldMatrix(true, false);
  // in first person the camera sits ~0.25 m ahead of the (hidden) helmet, so the hand is held out in front of the lens instead of at the visor
  const fp = V.headHid;
  _wP.set(-WIPE.px / 1.2 * (fp ? 0.27 : 0.2), 0.06 + WIPE.py * 0.1, fp ? 0.46 : 0.25); head.localToWorld(_wP); barPivot.worldToLocal(_wP);
  _wZ.set(WIPE.lean, 1, 0).normalize(); _wY.set(0, 0, 1); _wX.crossVectors(_wY, _wZ).normalize(); _wY.crossVectors(_wZ, _wX);
  _wM.makeBasis(_wX, _wY, _wZ); _wQ.setFromRotationMatrix(_wM);
  head.getWorldQuaternion(_wQ2); _wQ.premultiply(_wQ2);
  barPivot.getWorldQuaternion(_wQ2).invert(); _wQ.premultiply(_wQ2);
  hand.position.lerpVectors(rest.p, _wP, w); hand.quaternion.slerpQuaternions(rest.q, _wQ, w); hand.updateMatrix();
  WIPE.live = true;
  const open = w > 0.3; if (open !== WIPE.hand) wipeHandSet(open);
  _pT.copy(open ? WRIST_OPEN : WRIST_FIST).applyMatrix4(hand.matrix);
  // out of reach (the far end of a stroke held out in first person)? pull the hand in along the line to the shoulder so the glove stays on the forearm
  _wP.copy(_pT); barPivot.localToWorld(_wP); ub.worldToLocal(_wP);
  const reach = (RIDER.upper + RIDER.fore) * 0.97, d = _wP.distanceTo(V.shoulder[1]);
  if (d > reach) {
    _wX.copy(V.shoulder[1]).sub(_wP).multiplyScalar((d - reach) / d); _wY.copy(_wP).add(_wX);
    ub.localToWorld(_wY); barPivot.worldToLocal(_wY); ub.localToWorld(_wP); barPivot.worldToLocal(_wP); _wY.sub(_wP);
    hand.position.add(_wY); hand.updateMatrix(); _pT.add(_wY);
  }
}
function restWipeHand() {
  const hand = V.hands[1], rest = V.handRest[1];
  hand.position.copy(rest.p); hand.quaternion.copy(rest.q); hand.updateMatrix();
  wipeHandSet(false); WIPE.live = false;
}

// every frame: arms reach the grips wherever the bars have turned, torso rolls into the turn
function poseArms() {
  if (!V.arms || !V.machineOf) return;
  const steer = barPivot.rotation.y, st = CLIMB.stand;
  let pitch = RIDER.pitch;
  if (st > 0.002) {
    // standing over the bars: hips rise, legs straighten, torso leans over until the grips are back in reach
    if (Math.abs(st - RIDER.legLift) > 0.002) poseLegs(st);
    RIDER.lift = st;
    ub.position.y = RIDER.baseY + st; ub.position.z = V.machineOf(PV.sled || GS.own.sled).userData.hip.z - st * 0.25;
    barPivot.updateWorldMatrix(true, false);
    const reach = (RIDER.upper + RIDER.fore) * 0.97; let lo = RIDER.pitch, hi = RIDER.pitch + 1.0;
    for (let n = 0; n < 7; n++) {
      const mid = (lo + hi) / 2; ub.rotation.set(mid, 0, 0); ub.updateWorldMatrix(true, false);
      _pT.copy(V.wrist[1]); barPivot.localToWorld(_pT); ub.worldToLocal(_pT);
      if (_pT.distanceTo(V.shoulder[1]) < reach) hi = mid; else lo = mid;
    }
    pitch = hi; if (V.head) V.head.g.rotation.x = -pitch * 0.55;   // eyes up the hill, not at the bars
  } else if (RIDER.lift !== 0) {
    RIDER.lift = 0; if (RIDER.legLift !== 0) poseLegs(0);
    ub.position.y = RIDER.baseY; ub.position.z = V.machineOf(PV.sled || GS.own.sled).userData.hip.z; if (V.head) V.head.g.rotation.x = -RIDER.pitch;
  }
  ub.rotation.set(pitch, steer * 0.18, -steer * 0.28);
  barPivot.updateWorldMatrix(true, false); ub.updateWorldMatrix(true, false);
  for (const [i, sx] of [-1, 1].entries()) {
    if (i === 1 && WIPE.w > 0.001 && rider.visible) placeWipeHand(WIPE.w);                            // the left hand is off the bar, scrubbing the visor
    else { if (i === 1 && WIPE.live) restWipeHand(); _pT.copy(V.wrist[i]); }
    barPivot.localToWorld(_pT); ub.worldToLocal(_pT);
    _pA.copy(V.shoulder[i]); _pP.set(sx * 1.0, -0.7, 0.1);
    ik2(_pA, _pT, RIDER.upper, RIDER.fore, _pP, _pJ);
    V.arms[i * 2].userData.set(_pA, _pJ); V.arms[i * 2 + 1].userData.set(_pJ, _pT);
  }
}

/* ---------------- particles ---------------- */
function softDot() {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
}
const dotTex = softDot();
const SPN = 4200, spPos = new Float32Array(SPN * 3), spVel = new Float32Array(SPN * 3), spLife = new Float32Array(SPN);
for (let i = 0; i < SPN; i++) spPos[i * 3 + 1] = -9999;
const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
const spray = new THREE.Points(spGeo, new THREE.PointsMaterial({ size: 0.42, map: dotTex, transparent: true, opacity: 0.85, depthWrite: false, color: 0xf4f8ff }));
spray.frustumCulled = false; scene.add(spray);
let spHead = 0;
function emit(x, y, z, vx, vy, vz, spread, life) {
  const i = spHead; spHead = (spHead + 1) % SPN;
  spPos[i * 3] = x; spPos[i * 3 + 1] = y; spPos[i * 3 + 2] = z;
  spVel[i * 3] = vx + (Math.random() - 0.5) * spread; spVel[i * 3 + 1] = vy + Math.random() * spread * 0.6; spVel[i * 3 + 2] = vz + (Math.random() - 0.5) * spread;
  spLife[i] = life ? life * (0.7 + Math.random() * 0.6) : 0.7 + Math.random() * 0.8;
}
function updSpray(dt) {
  for (let i = 0; i < SPN; i++) {
    if (spLife[i] <= 0) continue;
    spLife[i] -= dt;
    if (spLife[i] <= 0) { spPos[i * 3 + 1] = -9999; continue; }
    const k = Math.exp(-2.2 * dt);
    spVel[i * 3] *= k; spVel[i * 3 + 2] *= k; spVel[i * 3 + 1] = spVel[i * 3 + 1] * k - 9 * dt;
    spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] += spVel[i * 3 + 1] * dt; spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt;
  }
  spGeo.attributes.position.needsUpdate = true;
}
const FLN = 12000, flPos = new Float32Array(FLN * 3);
for (let i = 0; i < FLN; i++) { flPos[i * 3] = (Math.random() - 0.5) * 90; flPos[i * 3 + 1] = Math.random() * 40; flPos[i * 3 + 2] = (Math.random() - 0.5) * 90; }
const SKN = 600, skPos = new Float32Array(SKN * 3), skVel = new Float32Array(SKN * 3), skLife = new Float32Array(SKN);
for (let i = 0; i < SKN; i++) skPos[i * 3 + 1] = -9999;
const skGeo = new THREE.BufferGeometry(); skGeo.setAttribute("position", new THREE.BufferAttribute(skPos, 3));
const sparks = new THREE.Points(skGeo, new THREE.PointsMaterial({ size: 0.16, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffa040, fog: false }));
sparks.frustumCulled = false; scene.add(sparks);
let skHead = 0, sparkAcc = 0;
function spark(x, y, z, vx, vy, vz) {
  const i = skHead; skHead = (skHead + 1) % SKN;
  skPos[i * 3] = x; skPos[i * 3 + 1] = y; skPos[i * 3 + 2] = z; skVel[i * 3] = vx; skVel[i * 3 + 1] = vy; skVel[i * 3 + 2] = vz;
  skLife[i] = 0.25 + Math.random() * 0.35;
}
function updSparks(dt) {
  for (let i = 0; i < SKN; i++) {
    if (skLife[i] <= 0) continue;
    skLife[i] -= dt;
    if (skLife[i] <= 0) { skPos[i * 3 + 1] = -9999; continue; }
    skVel[i * 3 + 1] -= 12 * dt;
    skPos[i * 3] += skVel[i * 3] * dt; skPos[i * 3 + 1] += skVel[i * 3 + 1] * dt; skPos[i * 3 + 2] += skVel[i * 3 + 2] * dt;
  }
  skGeo.attributes.position.needsUpdate = true;
}
// spring muck: grey slush off wet snow, and grit and mud off bare ground. Its own small pool so the snow spray stays white.
const MKN = 1400, mkPos = new Float32Array(MKN * 3), mkVel = new Float32Array(MKN * 3), mkLife = new Float32Array(MKN), mkCol = new Float32Array(MKN * 3);
for (let i = 0; i < MKN; i++) mkPos[i * 3 + 1] = -9999;
const mkGeo = new THREE.BufferGeometry(); mkGeo.setAttribute("position", new THREE.BufferAttribute(mkPos, 3)); mkGeo.setAttribute("color", new THREE.BufferAttribute(mkCol, 3));
const muck = new THREE.Points(mkGeo, new THREE.PointsMaterial({ size: 0.3, map: dotTex, transparent: true, opacity: 0.9, depthWrite: false, vertexColors: true }));
muck.frustumCulled = false; scene.add(muck);
let mkHead = 0, mkLive = 0;
function emitMuck(x, y, z, vx, vy, vz, spread, dirt) {
  const i = mkHead; mkHead = (mkHead + 1) % MKN;
  mkPos[i * 3] = x; mkPos[i * 3 + 1] = y; mkPos[i * 3 + 2] = z;
  mkVel[i * 3] = vx + (Math.random() - 0.5) * spread; mkVel[i * 3 + 1] = vy + Math.random() * spread * 0.5; mkVel[i * 3 + 2] = vz + (Math.random() - 0.5) * spread;
  mkLife[i] = 0.5 + Math.random() * 0.6; mkLive = 1.2;
  const v = Math.random() * 0.08;
  if (dirt) { mkCol[i * 3] = 0.3 + v; mkCol[i * 3 + 1] = 0.25 + v; mkCol[i * 3 + 2] = 0.18 + v; }
  else { mkCol[i * 3] = 0.66 + v; mkCol[i * 3 + 1] = 0.72 + v; mkCol[i * 3 + 2] = 0.76 + v; }
  mkGeo.attributes.color.needsUpdate = true;
}
function updMuck(dt) {
  if (mkLive <= 0) return; mkLive -= dt;                          // nothing to move once the last clod has landed
  for (let i = 0; i < MKN; i++) {
    if (mkLife[i] <= 0) continue;
    mkLife[i] -= dt;
    if (mkLife[i] <= 0) { mkPos[i * 3 + 1] = -9999; continue; }
    const k = Math.exp(-1.6 * dt);
    mkVel[i * 3] *= k; mkVel[i * 3 + 2] *= k; mkVel[i * 3 + 1] = mkVel[i * 3 + 1] * k - 14 * dt;    // heavy and wet: it falls fast
    mkPos[i * 3] += mkVel[i * 3] * dt; mkPos[i * 3 + 1] += mkVel[i * 3 + 1] * dt; mkPos[i * 3 + 2] += mkVel[i * 3 + 2] * dt;
  }
  mkGeo.attributes.position.needsUpdate = true;
}
const flGeo = new THREE.BufferGeometry(); flGeo.setAttribute("position", new THREE.BufferAttribute(flPos, 3));
const flakes = new THREE.Points(flGeo, new THREE.PointsMaterial({ size: 0.13, map: dotTex, transparent: true, opacity: 0.9, depthWrite: false, color: 0xffffff }));
flakes.frustumCulled = false; scene.add(flakes);
let windT = 0;
function updFlakes(dt) {
  windT += dt;
  const stw = 1 + 1.6 * GS.storm, wx = (Math.sin(windT * 0.21) * 2.6 + 2.2) * stw, wz = Math.cos(windT * 0.17) * 2.0 * stw;
  const nFl = Math.round(5200 + 6800 * GS.storm); flGeo.setDrawRange(0, nFl);
  windU.uTime.value = windT; windU.uWind.value.set(wx * 0.42 / Math.sqrt(stw), wz * 0.42 / Math.sqrt(stw));
  // flakes rush past the camera, growing exponentially with speed
  const sp = Math.hypot(P.vx, P.vz), rush = Math.min(70, (Math.exp(sp / 12) - 1) * 2.4), rx = sp > 0.1 ? -P.vx / sp * rush : 0, rz = sp > 0.1 ? -P.vz / sp * rush : 0;
  flakes.material.size = 0.13 + Math.min(0.1, rush * 0.002);
  const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  for (let i = 0; i < nFl; i++) {
    let x = flPos[i * 3] + (wx + rx + Math.sin(i + windT) * 0.5) * dt, y = flPos[i * 3 + 1] - (1.2 + (i % 7) * 0.12) * dt, z = flPos[i * 3 + 2] + (wz + rz) * dt;
    x = cx + ((x - cx + 45) % 90 + 90) % 90 - 45; z = cz + ((z - cz + 45) % 90 + 90) % 90 - 45; y = cy + ((y - cy + 15) % 40 + 40) % 40 - 15;
    flPos[i * 3] = x; flPos[i * 3 + 1] = y; flPos[i * 3 + 2] = z;
  }
  flGeo.attributes.position.needsUpdate = true;
}

/* ---------------- breath fog + visor frost ---------------- */
// Two cheap effects, both driven by the warmth stat.
// Breath: a ring of 22 soft sprites puffed from the rider's mouth (a faint DOM puff at the foot of the
//   screen in first person). Puffs come faster as you work the throttle and fatter as it gets colder.
// Frost: ONE full-screen quad drawn last, its whole look decided in the fragment shader by a single
//   0..1 level. A rime ring creeps in from the rim of the screen and leaves a clear elliptical hole in the
//   middle that shrinks as warmth drops (at level 1 the ring covers about 60% of the screen). While there
//   is no frost the quad is not drawn at all, so a warm rider pays nothing.
// Wipe: Z / pad D-pad left / the WIPE touch button. The rider's own left arm comes up (a real 3D forearm and open
//   hand, see poseArms / placeWipeHand; the on-foot figure bends an elbow in poseFigure) and sweeps the visor in two
//   strokes while the frost clears behind it, then the frost stays gone for ~4 s and creeps back. Getting warm (a cabin, the stove, the thermos) lowers the
//   target, and the frost thaws out with it.
const VZ = { level: 0, target: 0, hold: 0, sweep: -1, hinted: false, mesh: null, mat: null, ex: 0, brT: 1.5, fp: null };
const VZ_SWEEP = 1.0, VZ_HOLD = 3.4, VZ_CREEP = 0.14, VZ_THAW = 1.3, VZ_ON = 60, VZ_FULL = 8;
const BR = { sp: [], n: 22, head: 0 }, _bm = new THREE.Vector3();
// the wipe's one timeline (t 0..1): the arm rises to the visor over 0-0.2, makes two strokes over 0.2-0.8 (the frost
// shader's clearing front follows ts), then drops away over 0.8-1. poseArms / poseFigure read WIPE every frame.
function wipeTimeline(t) {
  WIPE.w = _sm(t / 0.2) * _sm((1 - t) / 0.2);
  const ts = clamp((t - 0.2) / 0.6, 0, 1), sA = ts < 0.5, e = _sm(sA ? ts * 2 : (ts - 0.5) * 2);
  WIPE.ts = ts;
  WIPE.px = sA ? lerp(-1.2, 1.2, e) : lerp(1.2, -1.2, e);            // -1..1 is the screen; the hand's side-to-side follows it
  WIPE.py = lerp(0.44, -0.36, _sm((ts - 0.42) / 0.16));              // upper stroke, a hop down at the far edge, lower stroke
  WIPE.lean = -0.3 * clamp((0.5 - ts) * 12, -1, 1) + Math.sin(ts * 26) * 0.12 * _sm(ts * 8) * _sm((1 - ts) * 8);   // fingers trail the stroke, with a scrub
}

function frostNoise() {
  // four tiling, smoothed noise fields (one per RGBA channel) packed in one 128² texture: bilinear does the rest
  const N = 128, d = new Uint8Array(N * N * 4);
  let s = 0x9e3779b9; const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  for (let ch = 0; ch < 4; ch++) {
    const acc = new Float32Array(N * N); let amp = 1;
    for (const L of [4, 8, 16, 32]) {
      const lat = new Float32Array(L * L); for (let i = 0; i < lat.length; i++) lat[i] = rnd();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const fx = x / N * L, fy = y / N * L, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const a = lat[(y0 % L) * L + (x0 % L)], b = lat[(y0 % L) * L + ((x0 + 1) % L)], c = lat[((y0 + 1) % L) * L + (x0 % L)], e = lat[((y0 + 1) % L) * L + ((x0 + 1) % L)];
        acc[y * N + x] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + e) * sx * sy);
      }
      amp *= 0.55;
    }
    let lo = 1e9, hi = -1e9; for (let i = 0; i < acc.length; i++) { if (acc[i] < lo) lo = acc[i]; if (acc[i] > hi) hi = acc[i]; }
    for (let i = 0; i < acc.length; i++) d[i * 4 + ch] = Math.round((acc[i] - lo) / (hi - lo) * 255);
  }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
const VZ_VERT = "varying vec2 vP; void main(){ vP = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const VZ_FRAG = `
uniform sampler2D uNoise;
uniform float uLevel, uAsp, uTone;
uniform vec2 uWipe;
varying vec2 vP;
void main() {
  vec2 p = vP;                                   // -1..1 across the screen, so the clear hole is an ellipse the shape of the screen
  float r = length(p);
  float hole = mix(1.45, 0.76, uLevel);          // where the rime is half strength; 1.0 is the middle of each screen edge
  if (r < hole - 0.62) discard;
  float ang = atan(p.y, p.x) * 0.15915494 + 0.5;
  vec2 q = p * vec2(uAsp, 1.0) * 0.5;
  vec4 nA = texture2D(uNoise, q * 1.9);
  vec4 nB = texture2D(uNoise, q * 6.5 + 0.31);
  vec4 nC = texture2D(uNoise, vec2(ang * 5.0, 0.31));
  vec4 nD = texture2D(uNoise, vec2(ang * 14.0, 0.77));
  float spike = (1.0 - abs(2.0 * nC.r - 1.0)) * 0.6 + (1.0 - abs(2.0 * nD.g - 1.0)) * 0.4;   // pointed fingers of rime
  float rough = nA.r * 0.6 + nB.r * 0.4;
  float edge = hole + (spike - 0.78) * 0.5 * (0.3 + uLevel) + (rough - 0.5) * 0.24;
  float body = smoothstep(edge - 0.17, edge + 0.17, r);
  float a = body * (0.90 + 0.09 * nA.g);
  // the gloved wipe: stroke A clears the top half left to right, stroke B the bottom half right to left, with a ragged, streaky front
  float jit = (nA.b - 0.5) * 0.10 + (nB.b - 0.5) * 0.06;
  float topW = smoothstep(-0.10, 0.04, p.y + (nA.g - 0.5) * 0.10);
  float cA = 1.0 - smoothstep(uWipe.x - 0.07, uWipe.x + 0.07, p.x + jit);
  float cB = smoothstep(uWipe.y - 0.07, uWipe.y + 0.07, p.x + jit);
  a *= 1.0 - mix(cB, cA, topW);
  if (a < 0.004) discard;
  vec3 thin = vec3(0.60, 0.77, 0.90), rime = vec3(0.93, 0.97, 1.0);
  vec3 col = mix(thin, rime, smoothstep(0.15, 0.95, body * (0.55 + 0.45 * nA.g)));
  col += 0.05 * smoothstep(0.78, 0.96, nB.g * (0.45 + nA.b)) * body;
  gl_FragColor = vec4(col * uTone, a);
}`;
function visorMesh() {
  if (VZ.mesh) return VZ.mesh;
  VZ.mat = new THREE.ShaderMaterial({ uniforms: { uNoise: { value: frostNoise() }, uLevel: { value: 0 }, uAsp: { value: 1.7 }, uTone: { value: 1 }, uWipe: { value: new THREE.Vector2(-1.5, 1.5) } }, vertexShader: VZ_VERT, fragmentShader: VZ_FRAG, transparent: true, depthTest: false, depthWrite: false, fog: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), VZ.mat); m.frustumCulled = false; m.renderOrder = 10000; m.visible = false; scene.add(m);
  return VZ.mesh = m;
}
function wipeVisor() {
  if (!started || GS.dead || GS.garageOpen || godOpen || !$("settings").hidden || !$("bigmap").hidden) return;
  if (VZ.sweep >= 0 || VZ.level < 0.04) return;       // nothing to wipe, or the glove is already on the visor
  VZ.sweep = 0; VZ.hold = 0;
}
function updVisor(dt) {
  const gear = GS.own.gear, heatedHelmet = gear && gear.head === "heated";   // "Battery visor. No fog, no ice."
  const off = heatedHelmet || showroomOn() || GS.dead;
  VZ.target = off ? 0 : Math.pow(clamp((VZ_ON - GS.warmth) / (VZ_ON - VZ_FULL), 0, 1), 1.15);
  if (VZ.sweep >= 0) {
    VZ.sweep += dt;
    if (VZ.sweep >= VZ_SWEEP) { VZ.sweep = -1; VZ.level = 0; VZ.hold = VZ_HOLD; }       // the strokes have cleared everything: from here it just creeps back
  } else if (VZ.hold > 0) { VZ.hold -= dt; VZ.level = 0; }
  else if (VZ.level < VZ.target) VZ.level = Math.min(VZ.target, VZ.level + VZ_CREEP * dt);
  if (VZ.level > VZ.target) VZ.level = Math.max(VZ.target, VZ.level - VZ_THAW * dt);   // warming up lowers the target: the frost thaws out and stays gone
  if (VZ.target <= 0.001) VZ.hold = 0;
  if (VZ.sweep >= 0) wipeTimeline(VZ.sweep / VZ_SWEEP); else WIPE.w = 0;     // the arm (and, on foot, the figure's elbow) reads this
  if (!VZ.hinted && VZ.level > 0.3) { VZ.hinted = true; toast(TC.on ? "Your visor's icing over. Tap WIPE to clear it, or get warm." : "Your visor's icing over. Press Z (pad: D-pad left) to wipe it, or get warm.", "warn"); }
  const show = VZ.level > 0.012 || VZ.sweep >= 0;
  if (!show) { if (VZ.mesh && VZ.mesh.visible) VZ.mesh.visible = false; return; }
  const m = visorMesh(), U = VZ.mat.uniforms; m.visible = true;
  U.uLevel.value = VZ.level; U.uAsp.value = innerWidth / innerHeight; U.uTone.value = 0.38 + 0.62 * dayFactor();
  if (VZ.sweep >= 0) {
    const ts = WIPE.ts, sA = ts < 0.5, u = sA ? ts * 2 : (ts - 0.5) * 2, e = u * u * (3 - 2 * u);
    U.uWipe.value.set(sA ? lerp(-1.45, 1.45, e) : 1.45, sA ? 1.45 : lerp(1.45, -1.45, e));
  } else U.uWipe.value.set(-1.5, 1.5);
}
function puffFp(ci, ms) {
  const el = VZ.fp || (VZ.fp = $("breathFp")); if (!el || !el.animate) return;
  const peak = 0.10 + 0.30 * ci;
  el.animate([{ opacity: 0, transform: "translate(-50%,38%) scale(.55)" }, { opacity: peak, transform: "translate(-50%,10%) scale(.95)", offset: 0.28 }, { opacity: 0, transform: "translate(-50%,-22%) scale(1.5)" }], { duration: ms, easing: "ease-out" });
}
function puffWorld(ci, ex, foot) {
  if (!BR.sp.length) for (let i = 0; i < BR.n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s);
    BR.sp.push({ s, age: 1, life: 1, vx: 0, vy: 0, vz: 0, size: 1, peak: 0 });
  }
  let fx, fz;
  if (foot) { fx = Math.sin(FOOT.yaw); fz = Math.cos(FOOT.yaw); _bm.set(FOOT.x + fx * 0.22, FOOT.y + 1.58, FOOT.z + fz * 0.22); }
  else { fx = Math.sin(P.yaw); fz = Math.cos(P.yaw); V.head.g.updateWorldMatrix(true, false); V.head.g.localToWorld(_bm.set(0, -0.03, 0.26)); }
  const n = 1 + (ci > 0.4) + (ci > 0.75) + (ex > 0.7), tint = 0.5 + 0.5 * dayFactor();
  const vx0 = foot ? 0 : P.vx * 0.18, vz0 = foot ? 0 : P.vz * 0.18, wx = windU.uWind.value.x * 0.5, wz = windU.uWind.value.y * 0.5;
  for (let k = 0; k < n; k++) {
    const b = BR.sp[BR.head]; BR.head = (BR.head + 1) % BR.n;
    b.s.position.set(_bm.x + (Math.random() - 0.5) * 0.12, _bm.y + (Math.random() - 0.3) * 0.1, _bm.z + (Math.random() - 0.5) * 0.12);
    const out = 0.35 + 0.5 * ex + Math.random() * 0.25;
    b.vx = vx0 + wx + fx * out + (Math.random() - 0.5) * 0.3; b.vy = 0.28 + Math.random() * 0.25; b.vz = vz0 + wz + fz * out + (Math.random() - 0.5) * 0.3;
    b.age = -k * 0.07; b.life = 1.1 + Math.random() * 0.6 + ci * 0.5;
    b.size = 0.75 + 0.55 * ci + Math.random() * 0.25 + ex * 0.2; b.peak = 0.16 + 0.42 * ci;
    b.s.material.color.setScalar(tint);
  }
}
function updBreath(dt) {
  for (const b of BR.sp) {                       // puffs already in the air finish whatever the camera is doing
    if (b.age >= b.life) continue;
    b.age += dt;
    if (b.age < 0) continue;
    if (b.age >= b.life) { b.s.visible = false; continue; }
    const t = b.age / b.life, k = Math.exp(-1.7 * dt);
    b.vx *= k; b.vz *= k; b.vy = b.vy * k + 0.05 * dt;
    b.s.position.x += b.vx * dt; b.s.position.y += b.vy * dt; b.s.position.z += b.vz * dt;
    b.s.material.opacity = b.peak * (t < 0.14 ? t / 0.14 : Math.pow(1 - (t - 0.14) / 0.86, 1.6));
    b.s.scale.setScalar(b.size * (0.3 + 0.7 * Math.sqrt(t))); b.s.visible = true;
  }
  if (GS.dead || showroomOn()) return;
  const foot = FOOT.on, fp = VIEWS[camMode].fp && !foot;       // on foot the first-person view falls back to the chase cam
  VZ.ex += ((foot ? Math.min(1, Math.abs(FOOT.fwd)) * 0.7 : input.thr) - VZ.ex) * (1 - Math.exp(-2.2 * dt));
  if ((VZ.brT -= dt) > 0) return;
  // how cold it feels: mostly your warmth, plus the weather (night, storm, the open fell) that is draining it
  const night = 1 - dayFactor(), elev = clamp((groundAt(P.x, P.z) - 110) / 220, 0, 1), amb = clamp((0.3 + 0.35 * night + 0.9 * GS.storm + 0.35 * elev) / 1.9, 0, 1);
  const ci = clamp(0.65 * (1 - GS.warmth / 100) + 0.35 * amb, 0, 1), gap = lerp(3.1, 1.0, VZ.ex) * (0.85 + Math.random() * 0.3);
  VZ.brT = gap;
  if (fp) puffFp(ci, clamp(gap * 950, 700, 1700)); else puffWorld(ci, VZ.ex, foot);
}

/* ---------------- input ---------------- */
const keys = new Set();
const input = { thr: 0, brk: 0, steer: 0, lean: 0, hop: false, wheelie: 0 };
let camMode = 0, muted = false;
const VIEWS = [{ n: "Chase", d: 7.8, h: 3.2, f: 60 }, { n: "Close chase", d: 4.6, h: 2.0, f: 62 }, { n: "First person", fp: true, f: 78 }, { n: "Drone", d: 16, h: 9, f: 52 }];
addEventListener("keydown", e => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code) || (started && e.ctrlKey && !e.metaKey)) e.preventDefault();
  if (e.code === "Tab") { e.preventDefault(); if (started && !e.repeat) TABLET.toggle(); return; }
  if (started && TABLET.open && TABLET.key(e)) return;
  if (e.repeat) return;
  keys.add(e.code);
  if (!started) return;
  if (FISH && (FISH.on || FISH.panelOpen()) && FISH.key(e)) return;      // out on the ice, or in the tackle shop / at the fish buyer
  if (e.code === "Space" && !FOOT.on) input.hop = true;
  if (e.code === "KeyR") resetSled();
  if (e.code === "KeyV" || e.code === "KeyC") cycleView();
  if (e.code === "KeyM") toggleBigMap();
  if (e.code === "KeyH") $("help").hidden = !$("help").hidden;
  gameKey(e);
});
addEventListener("keyup", e => { keys.delete(e.code); if (FISH) FISH.keyup(e); });
addEventListener("blur", () => keys.clear());
// Android exposes some phone hardware (fingerprint readers, the touch panel itself) as "gamepads"
// with a non-standard mapping, and touching the screen can press their buttons, which read as Y
// and opened the god menu from the steer pad. On touch devices only real, standard-mapped pads count,
// and none of them while a thumb is on the steer pad or just after a finger lands.
let lastTouchT = -1e9;
addEventListener("pointerdown", e => { if (e.pointerType === "touch") lastTouchT = performance.now(); }, true);
function phantomPad(gp) {
  if (!TC.on) return false;
  return gp.mapping !== "standard" || /uinput|fpc|goodix|finger|touch|synaptics|gpio|keys/i.test(gp.id) || performance.now() - lastTouchT < 600 || TC.active;
}
let padWx = false, padHop = false, padReset = false, padView = false, padGod = false, padB = false, padMenu = false, padLB = false, padX = false, padWipe = false, padHorn = false, padTab = false;

/* ---------------- touch controls ---------------- */
// Steer pad under the left thumb, gas / brake / hop / lean / wheelie under the right, a
// contextual button at the top for the board and garage. Pointer events with capture, so
// a thumb can slide off a button without dropping it and two thumbs work at once.
const TC = { thr: 0, brk: 0, lean: 0, wh: 0, reel: 0, steer: 0, active: false, on: false };
const coarse = (matchMedia && matchMedia("(pointer: coarse)").matches) || navigator.maxTouchPoints > 1;
function touchWanted() { return SET.touch === "on" || (SET.touch !== "off" && (coarse || /[?&]touch\b/.test(location.search))); }
function setTouchUI() {
  TC.on = touchWanted(); document.body.classList.toggle("touch", TC.on); $("touch").hidden = !(TC.on && started);
  if (!TC.on) { TC.thr = TC.brk = TC.lean = TC.wh = TC.reel = TC.steer = 0; TC.active = false; }
}
function updTouch() {
  if (!TC.on) return;
  const modal = GS.garageOpen || !$("settings").hidden || !$("bigmap").hidden || godOpen || GS.dead;
  $("touch").classList.toggle("modal", modal);
  const lbl = GS.near === garageSite ? "GARAGE" : (FISH && !FISH.blocking() && FISH.ctxLabel()) || null;
  const e = $("tE"); e.hidden = !lbl; if (lbl && e.textContent !== lbl) e.textContent = lbl;
  const hb = $("tHorn"); if (hb) hb.hidden = FOOT.on;
  const w = $("tWing"); if (w) { w.hidden = GS.own.parts.hitch !== "tiller"; w.classList.toggle("lit", TOW.wingOn); }
  const wd = winchDef(), foot = FOOT.on;
  const q = $("tQ"); q.hidden = !(foot || (BOG.on && wd) || BOG.on); const ql = foot ? "GET ON" : "GET OFF"; if (q.textContent !== ql) q.textContent = ql;
  const x = $("tX"); x.hidden = !(wd && wd.block && WN.state === "hooked"); const xl = WN.dbl ? "SINGLE" : "DOUBLE"; if (x.textContent !== xl) x.textContent = xl;
  $("tF").hidden = !(HELP.on && HELP.kind === "sea" && !HELP.called) && !(GS.fuel <= 0 && !HELP.on);
  $("tReel").hidden = !(wd && WN.state === "hooked");
  $("tWipe").hidden = !(VZ.target > 0.12 || VZ.level > 0.08 || VZ.sweep >= 0);
}
{
  const HOLD = { gas: "thr", brake: "brk", lean: "lean", wh: "wh", reel: "reel" };
  for (const b of document.querySelectorAll("#touch .tb")) {
    const k = b.dataset.k;
    const up = () => { b.classList.remove("on"); if (HOLD[k]) TC[HOLD[k]] = 0; };
    b.addEventListener("pointerdown", e => {
      e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { } b.classList.add("on");
      if (HOLD[k]) { TC[HOLD[k]] = 1; return; }
      if (!started) return;
      if (k === "hop") { if (!GS.dead && !FOOT.on) input.hop = true; }
      else if (k === "reset") resetSled();
      else if (k === "view") cycleView();
      else if (k === "map") toggleBigMap();
      else if (k === "tablet") TABLET.toggle();
      else if (k === "menu") gameKey({ code: "Escape" });
      else if (k === "garage") { if (b.textContent === "GARAGE") gameKey({ code: "KeyT" }); else if (FISH) FISH.ctx(); }
      else if (k === "horn") horn();
      else if (k === "wings") toggleWings();
      else if (k === "q") gameKey({ code: "KeyQ" });
      else if (k === "x") gameKey({ code: "KeyX" });
      else if (k === "help") gameKey({ code: "KeyF" });
      else if (k === "wipe") wipeVisor();
    });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, up);
    b.addEventListener("touchend", e => e.preventDefault(), { passive: false });   // no synthetic click: a panel that just opened under the thumb must not get it
    b.addEventListener("contextmenu", e => e.preventDefault());
  }
  const sp = $("tSteer"), th = sp.querySelector("i"); let spId = null;
  const spSet = e => {
    const r = sp.getBoundingClientRect(), half = r.width / 2 - th.offsetWidth / 2 - 8;   // thumb size changes with the phone layout
    let v = clamp((e.clientX - (r.left + r.width / 2)) / half, -1, 1);
    th.style.transform = `translateX(${(v * half).toFixed(1)}px)`;
    TC.steer = Math.abs(v) < 0.06 ? 0 : Math.sign(v) * Math.pow(Math.abs(v), 1.35);   // gentle in the middle, full lock at the ends
  };
  sp.addEventListener("pointerdown", e => { e.preventDefault(); spId = e.pointerId; try { sp.setPointerCapture(e.pointerId); } catch (x) { } sp.classList.add("on"); TC.active = true; spSet(e); });
  sp.addEventListener("pointermove", e => { if (e.pointerId === spId) spSet(e); });
  const spEnd = e => { if (e.pointerId !== spId) return; spId = null; TC.active = false; TC.steer = 0; th.style.transform = ""; sp.classList.remove("on"); };
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) sp.addEventListener(ev, spEnd);
  sp.addEventListener("touchend", e => e.preventDefault(), { passive: false });
  sp.addEventListener("contextmenu", e => e.preventDefault());
}
function cycleView() { camMode = (camMode + 1) % VIEWS.length; camState.init = false; toast(VIEWS[camMode].n + " view"); }
function readInput(dt) {
  let thr = (keys.has("KeyW") || keys.has("ArrowUp")) ? 1 : 0, brk = (keys.has("KeyS") || keys.has("ArrowDown")) ? 1 : 0;
  let st = ((keys.has("KeyD") || keys.has("ArrowRight")) ? 1 : 0) - ((keys.has("KeyA") || keys.has("ArrowLeft")) ? 1 : 0);
  let lean = (keys.has("ShiftLeft") || keys.has("ShiftRight")) ? 1 : 0, analog = null, wh = (keys.has("ControlLeft") || keys.has("ControlRight")) ? 1 : 0;
  if (TC.on) { thr = Math.max(thr, TC.thr); brk = Math.max(brk, TC.brk); if (TC.lean) lean = 1; if (TC.wh) wh = 1; if (TC.active) analog = TC.steer; }
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  WN.held = keys.has("Space") || !!TC.reel; WN.padReel = false;
  for (const gp of pads) {
    if (!gp || phantomPad(gp)) continue;
    if (FISH && started && (FISH.on || FISH.panelOpen())) {                // on the ice (or in the shop): the fishing pad map
      const y = gp.buttons[3] && gp.buttons[3].pressed; if (y && !padGod) toggleGod(); padGod = y;
      if (godOpen) { godPad(gp, dt); break; }
      if (FISH.on) TABLET.pad(gp, dt);
      const du = gp.buttons[12] && gp.buttons[12].pressed; if (du && !padTab && FISH.on && !TABLET.open && !FISH.panelOpen()) TABLET.toggle(true); padTab = du;
      const mn = gp.buttons[9] && gp.buttons[9].pressed; if (mn && !padMenu && !GS.dead) gameKey({ code: "Escape" }); padMenu = mn;
      if (!TABLET.open) FISH.pad(gp, dt);
      break;
    }
    const ax = gp.axes[0] || 0; if (Math.abs(ax) > 0.12) analog = ax;
    thr = Math.max(thr, gp.buttons[7] ? gp.buttons[7].value : 0); brk = Math.max(brk, gp.buttons[6] ? gp.buttons[6].value : 0);
    if (gp.buttons[5] && gp.buttons[5].pressed) lean = 1;
    if (gp.buttons[2] && gp.buttons[2].pressed) wh = 1;
    const h = gp.buttons[0] && gp.buttons[0].pressed; if (h && !padHop && started && !godOpen && !TABLET.open && !FOOT.on) input.hop = true; padHop = h;
    if (h && FOOT.on) WN.padReel = true;
    const lb = gp.buttons[4] && gp.buttons[4].pressed; if (lb && !padLB && started && !godOpen && !GS.dead) gameKey({ code: "KeyQ" }); padLB = lb;
    const xb = gp.buttons[2] && gp.buttons[2].pressed; if (xb && !padX && started && FOOT.on && !godOpen) gameKey({ code: "KeyX" }); padX = xb;
    // B opens the garage (T) or backs out of whatever's open; Menu is Esc; L3 is the horn
    const bb = gp.buttons[1] && gp.buttons[1].pressed;
    if (bb && !padB && started && !godOpen && !GS.dead && !TABLET.open) gameKey({ code: GS.garageOpen || !$("settings").hidden || !$("bigmap").hidden ? "Escape" : "KeyT" });   // with the tablet up, B is its back button (TABLET.pad)
    padB = bb;
    const mn = gp.buttons[9] && gp.buttons[9].pressed; if (mn && !padMenu && started && !godOpen && !GS.dead) gameKey({ code: "Escape" }); padMenu = mn;
    const y = gp.buttons[3] && gp.buttons[3].pressed; if (y && !padGod && started) toggleGod(); padGod = y;
    if (godOpen) { godPad(gp, dt); analog = null; }
    if (!started && TT.on) titlePad(gp, dt);
    if (started && !godOpen) TABLET.pad(gp, dt);
    const r = gp.buttons[8] && gp.buttons[8].pressed; if (r && !padReset && started) resetSled(); padReset = r;
    const v = gp.buttons[11] && gp.buttons[11].pressed; if (v && !padView && started) cycleView(); padView = v;
    const dl = gp.buttons[14] && gp.buttons[14].pressed; if (dl && !padWipe && started && !godOpen && !TABLET.open) wipeVisor(); padWipe = dl;   // D-pad left wipes the visor
    const l3 = gp.buttons[10] && gp.buttons[10].pressed; if (l3 && !padHorn && started && !(FISH && FISH.ctx())) horn(); padHorn = l3;   // L3 is E: fish / shop / sell, else the horn
    const dr = gp.buttons[15] && gp.buttons[15].pressed; if (dr && !padWx && started && !godOpen && !GS.garageOpen && !TABLET.open) TABLET.toggle(true, "weather"); padWx = dr;   // d-pad right: straight into the Weather app
    const du = gp.buttons[12] && gp.buttons[12].pressed; if (du && !padTab && started && !godOpen && !GS.garageOpen && !TABLET.open) TABLET.toggle(true); padTab = du;   // d-pad up: the dash tablet
    const wg = gp.buttons[4] && gp.buttons[4].pressed; if (wg && !TOW.padWing && started && !godOpen) toggleWings(); TOW.padWing = wg;
    break;
  }
  if (!started) { thr = brk = st = lean = wh = 0; analog = null; }   // no riding off from a menu
  FOOT.fwd = 0; FOOT.turn = 0;
  if (FOOT.on) { FOOT.fwd = thr - brk * 0.6; FOOT.turn = analog !== null ? analog : st; thr = brk = lean = wh = 0; st = 0; analog = null; }   // on foot the same controls walk the rider
  if (FISH && FISH.blocking()) { FOOT.fwd = FOOT.turn = 0; thr = brk = lean = wh = 0; st = 0; analog = null; }                        // fishing, or in the shop: the sled stays parked
  input.wheelie = wh; if (wh) thr = Math.max(thr, 1);
  input.thr = thr; input.brk = brk; input.lean = lean;
  if (analog !== null) input.steer = analog;
  else input.steer += (st - input.steer) * (1 - Math.exp(-(st === 0 ? 9 : 5) * dt));
}

/* ---------------- physics ---------------- */
const MASS = 280; let G = 32.4;
// The Logbook tablet app's tallies (winter update S4). Saved in the save as `log`; deliveries, rescues, the
// date and days survived come from GS and the calendar. m = metres ridden, air = seconds in real jumps,
// jump = longest single jump (s), mail = pieces of post handed in at the quay (mailHandIn).
const LOG0 = () => ({ m: 0, trees: 0, air: 0, jump: 0, fjord: 0, mail: 0, sar: 0, sarLost: 0 });   // sar / sarLost: rescue callouts saved and lost (O5)
const LOG = LOG0();
// search and rescue (O5): duty, reputation and the record are saved; the rest is the live case (see the SAR block near the end)
var SAR = {
  duty: false, rep: 10, miss: 0, n: 0, lost: 0, ign: 0,
  cur: null, ping: null, coolT: -999, rollT: false, pill: null, foot: null, prints: null, glove: null, rope: null, seq: 0, odT: 0
};
const P = { x: SPAWN.x, y: 0, z: SPAWN.z, vx: 0, vy: 0, vz: 0, yaw: SPAWN.yaw, yr: 0, pitch: 0, roll: 0, odo: 0, rut: 0, airP: 0, airR: 0, airPV: 0, airRV: 0, airT: 0, airPeak: 0, launched: 0, wh: 0, whVis: 0, whRun: 0, whBest: 0, rock: 0, dumped: 0, gnd: true, pack: 0, ice: false, exc: 0, drag: 0, shake: 0, dist: 0, stuckT: 0, safe: null, rpm: 0.15, wet: false, sink: 0, wetT: 0, wl: SEA, bare: 0, slush: 0, thin: 0 };
function resetSled() {
  if (HELP.on && HELP.kind === "sea") { toast("Hang on: the rescue sled is your way out. Press F to call it.", "warn"); return; }
  if (BOG.on || FOOT.on) { BOG.on = false; BOG.acc = 0; BOG.immune = 6; FOOT.on = false; FOOT.dig = false; wnStow(false); }
  const s = P.safe || { x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw };
  P.x = s.x; P.z = s.z; P.yaw = s.yaw; P.vx = P.vy = P.vz = 0; P.yr = 0; P.pitch = P.roll = 0;
  P.sink = 0; P.wet = false; P.y = rideSurf(P.x, P.z) + 0.4; P.stuckT = 0; towSnap();
}
function plough(fx, fz, lx, lz) {
  let et = 0, es = 0, fm = 0;
  for (const o of [-0.18, 0, 0.18]) {
    const x = P.x + fx * 0.42 + lx * o, z = P.z + fz * 0.42 + lz * o, ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL);
    const d = depthAt(ix, iz), f = freshAt(ix, iz); et += Math.max(0, d - f * 0.22); fm += f;
  }
  for (const s of [-0.52, 0.52]) {
    const x = P.x + fx * 1.95 + lx * s, z = P.z + fz * 1.95 + lz * s, ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL);
    es += Math.max(0, depthAt(ix, iz) - freshAt(ix, iz) * 0.5);
  }
  et /= 3; es /= 2; fm /= 3;
  P.pack = fm > 0.02 ? clamp(1 - et / (fm * 0.78), 0, 1) : 1;
  return 0.54 * et + 0.4 * es * (1 - P.wh);
}
const bell = (x, c, w) => { const t = (x - c) / w; return Math.exp(-t * t); };
function stamp(fx, fz, lx, lz, carve) {
  const R = 2.3, x0 = Math.floor((P.x - R + HALF) / CELL), x1 = Math.ceil((P.x + R + HALF) / CELL), z0 = Math.floor((P.z - R + HALF) / CELL), z1 = Math.ceil((P.z + R + HALF) / CELL);
  const skis = P.wh > 0.45 ? 0 : 1, bh = 0.05 + 0.07 * carve;
  for (let iz = Math.max(0, z0); iz <= Math.min(FN - 1, z1); iz++) {
    const wz = iz * CELL - HALF - P.z;
    for (let ix = Math.max(0, x0); ix <= Math.min(FN - 1, x1); ix++) {
      const wx = ix * CELL - HALF - P.x, pl = wx * fx + wz * fz;
      if (pl < -1.8 || pl > 2.05) continue;
      const pa = Math.abs(wx * lx + wz * lz);
      if (pa > 1.0) continue;
      const wT = (1 - sstep(0.12, 0.36, pa)) * sstep(-1.7, -1.4, pl) * (1 - sstep(0.22, 0.45, pl));
      const wS = skis * (1 - sstep(0.02, 0.2, Math.abs(pa - 0.52))) * sstep(0.15, 0.4, pl) * (1 - sstep(1.75, 1.98, pl));
      const wB = Math.max(bell(pa, 0.78, 0.1) * sstep(-1.6, -1.2, pl) * (1 - sstep(1.6, 1.95, pl)) * (skis ? 1 : 0.2),
                          bell(pa, 0.4, 0.07) * sstep(-1.6, -1.2, pl) * (1 - sstep(0.1, 0.35, pl)) * (skis ? 0.5 : 1));
      if (wT < 0.002 && wS < 0.002 && wB < 0.02) continue;
      const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), f = c.f[k], d0 = c.d[k];
      let d = d0;
      if (wT > 0.002 || wS > 0.002) { const tg = Math.min(lerp(f, f * 0.22, wT), lerp(f, f * 0.5, wS)); if (tg < d) d = tg; }
      else if (d >= f * 0.85) { const b = f + bh * wB; if (d < b) d += (b - d) * 0.25; }
      if (d !== d0) { c.d[k] = d; writeCell(ix, iz, d0, d, f); }
    }
  }
}
// the same soft-profile packing the player's track does, for anything else on the snow
function stampAt(x, z, fx, fz) {
  const lx = fz, lz = -fx, R = 1.6;
  for (let iz = Math.max(0, Math.floor((z - R + HALF) / CELL)); iz <= Math.min(FN - 1, Math.ceil((z + R + HALF) / CELL)); iz++) {
    const wz = iz * CELL - HALF - z;
    for (let ix = Math.max(0, Math.floor((x - R + HALF) / CELL)); ix <= Math.min(FN - 1, Math.ceil((x + R + HALF) / CELL)); ix++) {
      const wx = ix * CELL - HALF - x, pl = wx * fx + wz * fz;
      if (pl < -1.1 || pl > 0.8) continue;
      const pa = Math.abs(wx * lx + wz * lz);
      const w = (1 - sstep(0.16, 0.42, pa)) * sstep(-1.05, -0.8, pl) * (1 - sstep(0.55, 0.78, pl));
      if (w < 0.01) continue;
      const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), f = c.f[k], d0 = c.d[k];
      const tg = lerp(f, f * 0.26, w);
      if (tg < d0) { c.d[k] = tg; writeCell(ix, iz, d0, tg, f); }
    }
  }
}
function crater(x, z, amt) {
  const R = 1.8, RR = R + 0.5;
  for (let iz = Math.floor((z - RR + HALF) / CELL); iz <= Math.ceil((z + RR + HALF) / CELL); iz++)
    for (let ix = Math.floor((x - RR + HALF) / CELL); ix <= Math.ceil((x + RR + HALF) / CELL); ix++) {
      if (ix < 0 || iz < 0 || ix >= FN || iz >= FN) continue;
      const r = Math.hypot(ix * CELL - HALF - x, iz * CELL - HALF - z); if (r > RR) continue;
      const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), f = c.f[k], d0 = c.d[k];
      const d = r < R ? Math.max(f * 0.12, d0 - amt * (0.4 + 0.6 * (1 - r / R))) : d0 + amt * 0.3 * (1 - (r - R) / 0.5);
      c.d[k] = d; writeCell(ix, iz, d0, d, f);
    }
}
/* ---------------- tow-behind: groomer drag and freight trailers ---------------- */
// Each rig rides on a rigid tongue from the sled's hitch. It follows your line (and cuts
// the inside of every corner), creeps downhill on a side-hill, snags on trees, and a loaded
// trailer rolls if you corner it too hard.
const HITCH = {
  groomer: { len: 2.0, r: 1.2, mass: 95, w: 2.4, tip: 99 },
  tiller: { len: 2.5, r: 1.3, mass: 240, w: 2.6, wide: 5.8, tip: 99 },
  trailer: { len: 2.75, r: 0.8, mass: 70, w: 1.05, tip: 0.8 },
  flatbed: { len: 3.2, r: 0.95, mass: 125, w: 1.35, tip: 0.95 },
  akja: { len: 2.3, r: 0.7, mass: 38, w: 0.85, tip: 0.85 }          // the rescue toboggan (O5): a patient in a bag, on rigid poles
};
const isGroomer = k => k === "groomer" || k === "tiller";
const TOW = { wing: 0, wingOn: false, kind: null, x: 0, z: 0, y: 0, yaw: 0, spd: 0, yr: 0, roll: 0, mass: 0, drag: 0, tipT: 0, tipDir: 1, hitT: 0, score: 0, maxScore: 0, vis: {}, vkind: null, pitchV: 0, rollV: 0 };
// the tiller's hydraulic wings: G / pad LB / the WINGS pad button slides them out to each side
const towWidth = H => H.wide ? H.w + (H.wide - H.w) * TOW.wing : H.w;
function toggleWings() {
  if (!started || GS.dead) return;
  if (GS.own.parts.hitch !== "tiller") { if (isGroomer(GS.own.parts.hitch)) toast("The drag has no wings. The wing tiller at the garage folds out to almost six metres.", "warn"); return; }
  TOW.wingOn = !TOW.wingOn; if (typeof whump === "function") whump(0.25);
  toast(TOW.wingOn ? "Wings out: grooming 5.8 m of trail. Mind the trees." : "Wings folded: back to 2.6 m.");
}
function hitchBack(rack) { return 2.1 + (rack === "freight" ? 0.3 : rack === "stretch" ? 0.15 : 0); }
function hitchPt() { const b = hitchBack(GS.own.parts.rack); return [P.x - Math.sin(P.yaw) * b, P.z - Math.cos(P.yaw) * b]; }
function towSnap() {
  const H = HITCH[TOW.kind]; if (!H) return;
  const [hx, hz] = hitchPt();
  TOW.x = hx - Math.sin(P.yaw) * H.len; TOW.z = hz - Math.cos(P.yaw) * H.len; TOW.yaw = P.yaw;
  TOW.y = surf(TOW.x, TOW.z); TOW.spd = 0; TOW.yr = 0; TOW.tipT = 0; TOW.ghostT = 1.5; TOW.snagT = 0;
}
function bigLoads() { return GS.load.filter(j => j.big); }
// used rigs (O6): a worn trailer rolls a little sooner, and so does one on a tired receiver; a worn groomer pan leaves lumps
const tipLim = (kind, H) => H.tip - (1 - condOf("hitch:" + kind)) * 0.25 - (1 - condOf("recv:" + (GS.own.parts.recv || "none"))) * 0.08;
let GROUGH = 0;
const lumpAt = (ix, iz) => (((Math.imul(ix >> 1, 73856093) ^ Math.imul(iz >> 2, 19349663)) >>> 0) % 997) / 997;
function bigHit(pct, why) {
  const big = bigLoads(); if (!big.length || !started || GS.dead) return;
  pct *= 1 - ST.armor;                                  // straps, foam and bumpers
  for (const j of big) j.cond = Math.max(0, j.cond - pct * (j.fragile ? 1.4 : 1));
  if (gameClock - (GS.bigToastT || -9) > 1.8) {
    GS.bigToastT = gameClock;
    const w = big.reduce((a, j) => j.cond < a.cond ? j : a);
    toast(`${why} ${w.cargo}: ${Math.round(w.cond)}% condition.${w.cond < 30 ? " Nobody will sign for that." : ""}`, w.cond < 30 ? "bad" : "warn");
  }
}
// the groomer: a flat pan levels ruts and berms, the comb leaves it set hard
function groomStamp(x, z, fx, fz, w) {
  const lx = fz, lz = -fx, hw = w / 2, R = hw + 0.4;
  for (let iz = Math.max(0, Math.floor((z - R + HALF) / CELL)); iz <= Math.min(FN - 1, Math.ceil((z + R + HALF) / CELL)); iz++) {
    const wz = iz * CELL - HALF - z;
    for (let ix = Math.max(0, Math.floor((x - R + HALF) / CELL)); ix <= Math.min(FN - 1, Math.ceil((x + R + HALF) / CELL)); ix++) {
      const wx = ix * CELL - HALF - x, pl = wx * fx + wz * fz;
      if (pl < -0.55 || pl > 0.55) continue;
      const pa = Math.abs(wx * lx + wz * lz);
      const wc = (1 - sstep(hw - 0.3, hw + 0.15, pa)) * (1 - sstep(0.3, 0.55, Math.abs(pl)));
      if (wc < 0.02) continue;
      const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), f = c.f[k], d0 = c.d[k];
      const d = lerp(d0, f * (0.13 + GROUGH * 0.55 * lumpAt(ix, iz)), wc * 0.6);
      if (wc > 0.5) { if (!c.g) c.g = new Uint8Array(CH * CH); c.g[k] = 1; }
      if (Math.abs(d - d0) > 1e-4) { c.d[k] = d; writeCell(ix, iz, d0, d, f); }
    }
  }
  markTrail(x, z); markTrail(x + lx * hw * 0.7, z + lz * hw * 0.7); markTrail(x - lx * hw * 0.7, z - lz * hw * 0.7);
  if (w > 3.5) { markTrail(x + lx * hw * 0.35, z + lz * hw * 0.35); markTrail(x - lx * hw * 0.35, z - lz * hw * 0.35); }
}
function towStep(dt) {
  const kind = GS.own.parts.hitch, H = HITCH[kind];
  if (!H) { TOW.kind = null; TOW.mass = 0; TOW.drag = 0; return; }
  if (TOW.kind !== kind) { TOW.kind = kind; towSnap(); }
  if (!H.wide) TOW.wingOn = false;
  TOW.wing += clamp((TOW.wingOn ? 1 : 0) - TOW.wing, -dt / 1.6, dt / 1.6);   // hydraulics take a moment
  const [hx, hz] = hitchPt();
  let tx = TOW.x, tz = TOW.z;
  // side-hill: nothing brakes a trailer sideways, so it creeps downhill while it moves
  if (TOW.spd > 0.5) {
    const e = 1, gx = (smoothSurf(tx + e, tz) - smoothSurf(tx - e, tz)) / (2 * e), gz = (smoothSurf(tx, tz + e) - smoothSurf(tx, tz - e)) / (2 * e);
    const gm = Math.hypot(gx, gz), steep = Math.max(0, gm - 0.22) / (gm || 1);   // only a real side-hill
    const creep = (isGroomer(kind) ? (kind === "tiller" ? 0.5 : 0.8) : 2.2) * steep * Math.min(1, TOW.spd / 6);
    tx -= gx * creep * dt; tz -= gz * creep * dt;
  }
  let dx = hx - tx, dz = hz - tz, d = Math.hypot(dx, dz) || 1;
  tx = hx - dx / d * H.len; tz = hz - dz / d * H.len;
  // snags: trees, rocks and buildings stop the trailer, and the tongue yanks the sled
  TOW.hitT = Math.max(0, TOW.hitT - dt);
  const vx0 = (tx - TOW.x) / dt, vz0 = (tz - TOW.z) / dt;
  const gxi = Math.floor((tx + HALF) / OBC), gzi = Math.floor((tz + HALF) / OBC);
  let snag = false;
  TOW.ghostT = Math.max(0, (TOW.ghostT || 0) - dt);
  // the body, plus each wing tip once the wings are out
  const probes = [[0, H.r]];
  if (H.wide && TOW.wing > 0.05) { const reach = towWidth(H) / 2 - 0.55; probes.push([reach, 0.6], [-reach, 0.6], [reach * 0.6, 0.6], [-reach * 0.6, 0.6]); }
  const ly0 = Math.cos(TOW.yaw), lz0 = -Math.sin(TOW.yaw);
  if (TOW.ghostT <= 0) for (const [po, pr] of probes) for (let j = gzi - 2; j <= gzi + 2; j++) for (let i = gxi - 2; i <= gxi + 2; i++) {
    const a = obGrid.get(j * OBW + i); if (!a) continue;
    for (const o of a) {
      if (TOW.y > o.top - 0.1) continue;
      const px = tx + ly0 * po, pz = tz + lz0 * po;
      const ox = px - o.x, oz = pz - o.z, o2 = ox * ox + oz * oz, rr = pr + o.r;
      if (o2 >= rr * rr || o2 < 1e-6) continue;
      const od = Math.sqrt(o2), nx = ox / od, nz = oz / od;
      tx += nx * (rr - od); tz += nz * (rr - od); snag = true;
      const vin = -(vx0 * nx + vz0 * nz);
      if (o.tree !== undefined) { wobble(o, 0.05 + Math.max(0, vin) * 0.012, -ox, -oz); if (o.snowy && vin > 3) dropSnow(o, false); }
      if (vin > 3 && TOW.hitT <= 0) {
        TOW.hitT = 0.6; thud(Math.min(0.9, vin / 18)); P.shake = Math.max(P.shake, Math.min(0.5, vin / 24));
        P.vx *= 0.72; P.vz *= 0.72;
        bigHit(clamp((vin - 3) * 3.2, 3, 26), o.tree !== undefined ? (isGroomer(kind) ? (TOW.wing > 0.3 ? "Groomer wing clipped a tree." : "Groomer clipped a tree.") : "Trailer clipped a tree.") : (isGroomer(kind) ? "Groomer hit rock." : "Trailer slammed into rock."));
      }
    }
  }
  if (snag) {
    dx = hx - tx; dz = hz - tz; d = Math.hypot(dx, dz) || 1;
    if (d > H.len) {
      const ux = dx / d, uz = dz / d, ex = d - H.len;
      P.x -= ux * ex * 0.7; P.z -= uz * ex * 0.7;
      const vu = P.vx * ux + P.vz * uz; if (vu > 0) { P.vx -= ux * vu * 0.85; P.vz -= uz * vu * 0.85; }
      tx += ux * ex * 0.3; tz += uz * ex * 0.3;
      // hung up and you're still on the gas: it wrenches free, and the load feels it
      if (input.thr > 0.3) TOW.snagT = (TOW.snagT || 0) + dt;
      if (TOW.snagT > 0.8) {
        TOW.snagT = 0; TOW.ghostT = 1.2; thud(0.7); P.shake = Math.max(P.shake, 0.4);
        if (bigLoads().length) bigHit(8, "You wrench the rig free."); else if (started && gameClock - (TOW.freeT || -9) > 6) { TOW.freeT = gameClock; toast("You wrench the rig free."); }
      }
    }
  } else TOW.snagT = Math.max(0, (TOW.snagT || 0) - dt);
  // motion, heading, and how hard it's being flung sideways
  const vx = (tx - TOW.x) / dt, vz = (tz - TOW.z) / dt;
  const yaw = Math.atan2(hx - tx, hz - tz);
  let dy = yaw - TOW.yaw; dy = ((dy + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  TOW.yr += (dy / dt - TOW.yr) * (1 - Math.exp(-5 * dt));
  TOW.x = tx; TOW.z = tz; TOW.yaw = yaw;
  TOW.spd += (Math.hypot(vx, vz) - TOW.spd) * (1 - Math.exp(-10 * dt));
  const W = towWidth(H), fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, hw = W / 2;
  TOW.y = rideSurf(tx, tz);
  const hL = rideSurf(tx + lx * hw, tz + lz * hw), hR = rideSurf(tx - lx * hw, tz - lz * hw);
  TOW.roll = Math.atan2(hL - hR, W);
  // load: what's aboard, and what the snow asks of it
  const cargoKg = bigLoads().reduce((a, j) => a + j.kg, 0) + (kind === "akja" ? sarPatientKg() : 0);
  TOW.mass = H.mass + cargoKg;
  let loose = 0;                                            // sample across its width, not just down your own track
  for (const o of [-0.7, 0, 0.7]) {
    const cx = Math.round((tx + lx * hw * o + HALF) / CELL), cz = Math.round((tz + lz * hw * o + HALF) / CELL), f = freshAt(cx, cz);
    loose += (1 - packOf(depthAt(cx, cz), f)) * Math.min(1, f / 0.3) / 3;
  }
  const moving = TOW.spd > 0.4 ? 1 : 0;
  // it bites harder the faster you drag it, so you can always crawl a load out of a standstill
  TOW.drag = moving * clamp(TOW.spd / 5, 0.25, 1) * (kind === "tiller" ? (380 + 1700 * loose) * (0.8 + 0.2 * W / H.w) : kind === "groomer" ? 260 + 1500 * loose : loose * (180 + TOW.mass * 1.6)) + (TOW.tipT > 0 ? 2600 : 0)
    + (isSea(tx, tz) ? moving * (300 + TOW.mass * 0.9 + 1.2 * TOW.spd * TOW.spd) : 0);   // a trailer on water is a sea anchor
  // rolling it: side slope plus how hard you're whipping it round a corner
  const lat = TOW.spd * TOW.yr / G;
  TOW.score = Math.abs(TOW.roll + lat * 0.9) ;
  if (TOW.score > TOW.maxScore) TOW.maxScore = TOW.score;
  if (TOW.tipT > 0) TOW.tipT -= dt;
  else if (H.tip < 50 && TOW.spd > 3 && TOW.score > tipLim(kind, H) + (cargoKg ? 0 : 0.35) && P.gnd && started) {
    TOW.tipT = 2.4; TOW.tipDir = Math.sign(TOW.roll + lat * 0.9) || 1;
    P.vx *= 0.5; P.vz *= 0.5; P.shake = Math.max(P.shake, 0.6); thud(1); whump(0.7);
    for (let k = 0; k < 60; k++) emit(tx + (Math.random() - 0.5) * 2, TOW.y + 0.3, tz + (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 3, 1 + Math.random() * 2.5, (Math.random() - 0.5) * 3, 0.8, 1.2);
    if (cargoKg) bigHit(22 + TOW.spd, "Trailer rolled!");
    else if (kind !== "akja") toast("Trailer rolled. Empty, luckily.", "warn");
    else if (!sarPatientKg()) toast("Toboggan rolled. Empty, luckily.", "warn");     // with someone in it, the rescue code says so
    setTimeout(() => { if (TOW.tipT <= 0.2 && started && !GS.dead) toast(kind === "akja" ? "You flip the toboggan back onto its keels." : "You heave the trailer back onto its runners."); }, 2500);
  }
  // it leaves its own mark on the snow
  if (moving && TOW.tipT <= 0) {
    if (isGroomer(kind)) {
      GROUGH = 1 - condOf("hitch:" + kind);
      groomStamp(tx, tz, fx, fz, W);
      if (GS.groomJob) groomProgress(tx, tz, W);
    } else {
      const o = hw * 0.8;
      stampAt(tx + lx * o, tz + lz * o, fx, fz); stampAt(tx - lx * o, tz - lz * o, fx, fz);
    }
    if (TOW.spd > 6 && Math.random() < dt * 30) emit(tx - fx * 1.2, TOW.y + 0.15, tz - fz * 1.2, -fx * 2, 1 + loose * 3, -fz * 2, 1.2, 1.0);
  }
}
function buildTow() {
  const std = (c, r = 0.6, m = 0.05, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, extra || {}));
  const steel = std(0x8d99a6, 0.35, 0.65), dark = std(0x1a2027, 0.8), yellow = std(0xe0a820, 0.45, 0.2), poly = std(0x27313c, 0.55, 0.05),
    strap = std(0xff6a1f, 0.7), wood = std(0x8a6a42, 0.9), white = std(0xe9eef2, 0.35, 0.1), black = std(0x15191e, 0.7, 0.2),
    blue = std(0x1c3f7a, 0.2, 0.5), red = std(0xb3201a, 0.5, 0.2), amber = std(0x6a3a00, 0.4, 0, { emissive: 0xffa020, emissiveIntensity: 1.2 }),
    tail = std(0x8c1414, 0.4, 0, { emissive: 0xff2a1a, emissiveIntensity: 0.9 }), tank = std(0xdfe5ea, 0.3, 0.4), olive = std(0x4a5a3a, 0.8);
  const box = (g, w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const cyl = (g, r, h, mat, x, y, z, rx = 0, ry = 0, rz = 0, seg = 12) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
  // an A-frame tongue of unit length along +Z, stretched to reach the hitch every frame
  const tongue = (g, frontZ, y, spread) => {
    const pv = new THREE.Group(); pv.position.set(0, y, frontZ); g.add(pv);
    const arm = new THREE.Group(); pv.add(arm);
    for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1), steel); m.position.set(s * spread * 0.5, 0, 0.5); m.rotation.y = -s * Math.atan2(spread * 0.5, 1); m.scale.z = Math.hypot(1, spread * 0.5); m.castShadow = true; arm.add(m); }
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 10), steel); eye.position.set(0, 0, 1); eye.rotation.x = Math.PI / 2; arm.add(eye);
    g.userData.tongue = pv; g.userData.arm = arm; return pv;
  };
  const runner = (g, x, len, y, w = 0.1) => { box(g, w, 0.04, len, steel, x, y, 0); box(g, w, 0.04, 0.35, steel, x, y + 0.1, len / 2 + 0.12, -0.6); };
  const V2 = TOW.vis;

  // groomer drag: wide steel pan, packing roller-bar, corduroy comb behind
  { const g = new THREE.Group(); g.visible = false; scene.add(g);
    box(g, 2.4, 0.08, 1.0, yellow, 0, 0.06, 0.05);                            // pan
    box(g, 2.4, 0.28, 0.08, yellow, 0, 0.18, 0.55, -0.5);                      // curved front lip
    for (const s of [-1, 1]) box(g, 0.08, 0.3, 1.0, yellow, s * 1.18, 0.2, 0.05);   // side plates
    box(g, 2.2, 0.1, 0.1, steel, 0, 0.36, 0.25);                               // crossbeam
    for (const s of [-1, 1]) box(g, 0.1, 0.34, 0.1, steel, s * 0.9, 0.2, 0.25);
    box(g, 2.3, 0.05, 0.3, black, 0, 0.05, -0.62, 0.35);                       // comb plate
    for (let i = 0; i < 16; i++) box(g, 0.05, 0.08, 0.14, black, -1.08 + i * 0.144, 0.0, -0.8);   // comb teeth
    box(g, 0.5, 0.08, 0.03, std(0xeef2f5, 0.5), -0.7, 0.3, -0.06); box(g, 0.5, 0.08, 0.03, std(0xeef2f5, 0.5), 0.7, 0.3, -0.06);
    for (const s of [-1, 1]) box(g, 0.1, 0.06, 0.03, amber, s * 1.1, 0.42, -0.1);
    tongue(g, 0.55, 0.36, 1.2);
    V2.groomer = g; }

  // wing tiller: a tractor-style implement. Red hood over a spinning tiller drum, finisher mat
  // behind, and two hydraulic wings hinged at the hood's edges that fold down and out.
  { const g = new THREE.Group(); g.visible = false; scene.add(g);
    const redT = std(0xb8261c, 0.45, 0.25), matB = std(0x202328, 0.9), drums = [];
    const hood = (par, w, x) => {
      box(par, w, 0.08, 0.95, redT, x, 0.62, 0);                           // hood top
      box(par, w, 0.5, 0.06, redT, x, 0.4, 0.46, 0.25);                     // front skirt
      box(par, w, 0.3, 0.06, redT, x, 0.5, -0.46);                          // back
      const d = cyl(par, 0.27, w - 0.08, steel, x, 0.3, 0, 0, 0, Math.PI / 2, 10); drums.push(d);
      for (let i = 0; i < 6; i++) { const t = cyl(d, 0.29, 0.03, dark, 0, -w / 2 + 0.2 + i * (w - 0.4) / 5, 0, 0, 0, 0, 10); t.castShadow = false; }
      box(par, w, 0.03, 0.9, matB, x, 0.04, -0.95, 0.12);                   // finisher mat
      const n = Math.round(w / 0.14); for (let i = 0; i < n; i++) box(par, 0.05, 0.06, 0.14, black, x - w / 2 + 0.07 + i * (w - 0.14) / (n - 1), 0.01, -1.42);
    };
    hood(g, 2.6, 0);
    for (const s of [-1, 1]) { box(g, 0.1, 0.62, 1.1, redT, s * 1.27, 0.34, 0); box(g, 0.14, 0.14, 0.14, steel, s * 1.3, 0.6, 0.3); }
    box(g, 1.2, 0.12, 0.12, steel, 0, 0.72, 0.35);                          // lift frame
    for (const s of [-1, 1]) box(g, 0.1, 0.35, 0.1, steel, s * 0.55, 0.62, 0.45, 0.4);
    box(g, 0.5, 0.35, 0.4, black, 0, 0.85, 0.1);                            // hydraulic pack
    cyl(g, 0.09, 0.3, std(0x2b3440, 0.5, 0.4), 0.15, 1.08, 0.1);
    box(g, 0.5, 0.1, 0.03, std(0xeef2f5, 0.5), -0.8, 0.62, 0.5, 0.25); box(g, 0.5, 0.1, 0.03, std(0xeef2f5, 0.5), 0.8, 0.62, 0.5, 0.25);
    const beacons = [], bMat = amber.clone();                               // its own, so the flashing stays on this rig
    for (const s of [-1, 1]) beacons.push(box(g, 0.12, 0.12, 0.12, bMat, s * 0.35, 1.08, 0.1));
    const wings = [];
    for (const s of [-1, 1]) {
      const pv = new THREE.Group(); pv.position.set(s * 1.32, 0.64, 0); g.add(pv);
      const w = new THREE.Group(); w.position.set(0, -0.64, 0); pv.add(w);
      hood(w, 1.6, s * 0.82);
      box(w, 0.08, 0.6, 1.0, redT, s * 1.62, 0.32, 0);                      // end plate
      box(w, 0.1, 0.06, 0.03, amber, s * 1.64, 0.5, 0.3);
      box(w, 0.04, 0.04, 1.4, std(0xffd23a, 0.5), s * 1.66, 0.64, -0.1);    // width marker rod
      const ram = cyl(g, 0.05, 0.7, std(0xc9d1d9, 0.25, 0.8), s * 0.95, 0.95, -0.1, 0, 0, 0, 8); ram.userData.s = s;
      wings.push({ pv, s, ram });
    }
    tongue(g, 0.55, 0.62, 1.6);
    g.userData.wings = wings; g.userData.drums = drums; g.userData.beacons = beacons;
    V2.tiller = g; }

  // freight sled trailer: poly tub on runners
  { const g = new THREE.Group(); g.visible = false; scene.add(g);
    box(g, 1.05, 0.08, 2.2, poly, 0, 0.18, 0);                                 // floor
    for (const s of [-1, 1]) box(g, 0.06, 0.34, 2.2, poly, s * 0.5, 0.36, 0);   // sides
    box(g, 1.05, 0.34, 0.06, poly, 0, 0.36, -1.08); box(g, 1.05, 0.3, 0.06, poly, 0, 0.32, 1.08, 0.35);
    for (const s of [-1, 1]) runner(g, s * 0.42, 2.3, 0.02);
    for (const s of [-1, 1]) for (const zz of [-0.7, 0.7]) box(g, 0.05, 0.16, 0.05, steel, s * 0.42, 0.1, zz);
    for (const s of [-1, 1]) box(g, 0.1, 0.06, 0.03, tail, s * 0.4, 0.44, -1.12);
    tongue(g, 1.1, 0.3, 0.8);
    const slot = new THREE.Group(); slot.position.set(0, 0.22, 0); g.add(slot);
    g.userData.slots = [slot];
    V2.trailer = g; }

  // heavy flatbed: steel deck, stake pockets, two wide skis
  { const g = new THREE.Group(); g.visible = false; scene.add(g);
    box(g, 1.35, 0.1, 3.1, steel, 0, 0.3, 0);
    for (let i = 0; i < 9; i++) box(g, 1.3, 0.02, 0.2, olive, 0, 0.36, -1.35 + i * 0.34);
    for (const s of [-1, 1]) for (const zz of [-1.4, -0.45, 0.45, 1.4]) box(g, 0.05, 0.5, 0.05, steel, s * 0.64, 0.58, zz);
    for (const s of [-1, 1]) box(g, 0.04, 0.06, 3.0, steel, s * 0.64, 0.8, 0);
    for (const s of [-1, 1]) { runner(g, s * 0.52, 3.0, 0.02, 0.22); for (const zz of [-1, 0, 1]) box(g, 0.06, 0.26, 0.06, steel, s * 0.52, 0.16, zz); }
    for (const s of [-1, 1]) { box(g, 0.1, 0.06, 0.03, tail, s * 0.6, 0.34, -1.57); box(g, 0.03, 0.06, 0.1, amber, s * 0.69, 0.34, 1.3); }
    tongue(g, 1.55, 0.36, 1.0);
    const s0 = new THREE.Group(); s0.position.set(0, 0.36, 0.76); g.add(s0);
    const s1 = new THREE.Group(); s1.position.set(0, 0.36, -0.76); g.add(s1);
    const sBig = new THREE.Group(); sBig.position.set(0, 0.36, 0); g.add(sBig);
    g.userData.slots = [s0, s1]; g.userData.big = sBig;
    V2.flatbed = g; }

  // rescue toboggan (akja): a red fibreglass hull on two keels, rigid pulling poles, a casualty bag strapped in
  { const g = new THREE.Group(); g.visible = false; scene.add(g);
    const hull = std(0xc8261c, 0.35, 0.15), bag = std(0xe06a1a, 0.8), blue2 = std(0x26476e, 0.7);
    box(g, 0.78, 0.06, 2.0, hull, 0, 0.1, 0);                                  // floor
    for (const s of [-1, 1]) box(g, 0.06, 0.26, 2.0, hull, s * 0.39, 0.22, 0, 0, 0, s * 0.18);   // flared sides
    box(g, 0.78, 0.26, 0.06, hull, 0, 0.22, -1.0); box(g, 0.74, 0.3, 0.5, hull, 0, 0.2, 1.08, 0.7);   // tail, upturned bow
    for (const s of [-1, 1]) box(g, 0.05, 0.05, 1.9, dark, s * 0.22, 0.04, 0);                // keels
    for (const s of [-1, 1]) box(g, 0.03, 0.03, 1.9, white, s * 0.42, 0.36, 0);               // grab lines
    tongue(g, 1.25, 0.3, 0.7);
    const pat = new THREE.Group(); pat.visible = false; g.add(pat);
    box(pat, 0.56, 0.24, 1.6, bag, 0, 0.27, -0.05);                            // the bag
    for (const zz of [-0.5, 0.15, 0.6]) box(pat, 0.6, 0.03, 0.06, strap, 0, 0.4, zz);
    { const hd = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), blue2); hd.position.set(0, 0.36, 0.78); hd.castShadow = true; pat.add(hd); }
    g.userData.patient = pat;
    V2.akja = g; }

  // what a big load looks like, strapped down. One of each per slot, shown as needed.
  const looks = parent => {
    const L = {}, mk = k => { const g = new THREE.Group(); g.visible = false; parent.add(g); L[k] = g; return g; };
    const straps = (g, w, h, d) => { for (const zz of [-d * 0.28, d * 0.28]) box(g, w + 0.04, 0.02, 0.06, strap, 0, h + 0.01, zz); };
    let g = mk("appliance"); box(g, 0.8, 0.75, 1.0, white, 0, 0.375, 0); box(g, 0.82, 0.04, 1.02, std(0xc7cfd6, 0.4), 0, 0.76, 0); straps(g, 0.8, 0.77, 1.0);
    g = mk("fridge"); box(g, 0.72, 1.45, 0.7, white, 0, 0.72, 0); box(g, 0.03, 0.35, 0.03, steel, 0.3, 1.1, 0.36); box(g, 0.03, 0.25, 0.03, steel, 0.3, 0.55, 0.36); straps(g, 0.72, 1.45, 0.7);
    g = mk("stove"); box(g, 0.62, 0.62, 0.7, black, 0, 0.36, 0); for (const s of [-1, 1]) for (const t of [-1, 1]) box(g, 0.05, 0.1, 0.05, black, s * 0.26, 0.03, t * 0.3); cyl(g, 0.08, 0.5, black, 0, 0.9, -0.15); box(g, 0.3, 0.25, 0.02, std(0x552210, 0.3, 0, { emissive: 0x220800 }), 0, 0.4, 0.36); straps(g, 0.62, 0.68, 0.7);
    g = mk("gen"); box(g, 0.7, 0.5, 0.9, black, 0, 0.28, 0); box(g, 0.66, 0.36, 0.5, std(0xd8b020, 0.45, 0.2), 0, 0.3, 0.1); for (const s of [-1, 1]) box(g, 0.04, 0.58, 0.04, steel, s * 0.36, 0.3, 0.44); box(g, 0.76, 0.04, 0.04, steel, 0, 0.6, 0.44); box(g, 0.76, 0.04, 0.04, steel, 0, 0.6, -0.44); straps(g, 0.7, 0.6, 0.9);
    g = mk("tanks"); for (const [x, z] of [[-0.2, -0.25], [0.2, -0.25], [-0.2, 0.25], [0.2, 0.25]]) { cyl(g, 0.18, 0.9, tank, x, 0.45, z); cyl(g, 0.07, 0.1, steel, x, 0.95, z); } straps(g, 0.8, 0.9, 0.9);
    g = mk("drum"); cyl(g, 0.3, 0.9, red, 0, 0.45, 0, 0, 0, 0, 16); for (const yy of [0.3, 0.6]) cyl(g, 0.31, 0.03, std(0x7a150f, 0.5), 0, yy, 0, 0, 0, 0, 16); straps(g, 0.6, 0.9, 0.6);
    g = mk("solar"); box(g, 0.9, 0.3, 1.5, wood, 0, 0.15, 0); for (let i = 0; i < 3; i++) { box(g, 0.95, 0.04, 1.6, steel, 0, 0.33 + i * 0.06, 0); box(g, 0.9, 0.012, 1.55, blue, 0, 0.356 + i * 0.06, 0); } straps(g, 0.95, 0.48, 1.6);
    g = mk("crate"); box(g, 0.85, 0.65, 0.95, wood, 0, 0.33, 0); for (const yy of [0.12, 0.54]) box(g, 0.87, 0.06, 0.97, std(0x6b5234, 0.9), 0, yy, 0); box(g, 0.3, 0.2, 0.01, std(0xeef2f5, 0.6), 0, 0.4, 0.48); straps(g, 0.85, 0.66, 0.95);
    g = mk("dish"); box(g, 0.7, 0.35, 0.7, wood, 0, 0.18, 0); { const d = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 8, 0, Math.PI * 2, 0, 0.9), std(0xdfe5ea, 0.4, 0.2, { side: THREE.DoubleSide })); d.position.set(0, 0.95, 0.2); d.rotation.x = -1.9; d.castShadow = true; g.add(d); } cyl(g, 0.03, 0.6, steel, 0, 0.6, 0); straps(g, 0.7, 0.36, 0.7);
    g = mk("bigcrate"); box(g, 1.2, 0.95, 2.5, wood, 0, 0.48, 0); for (const zz of [-1.1, 0, 1.1]) box(g, 1.22, 0.97, 0.08, std(0x6b5234, 0.9), 0, 0.48, zz); box(g, 0.5, 0.3, 0.01, std(0xff5a1f, 0.6), 0.2, 0.6, 1.26); for (const zz of [-0.8, 0.8]) box(g, 1.26, 0.02, 0.07, strap, 0, 0.97, zz);
    g = mk("turbine"); box(g, 1.0, 0.25, 2.4, wood, 0, 0.13, 0); cyl(g, 0.32, 1.2, std(0xeef2f5, 0.35, 0.2), 0, 0.6, 0.3, Math.PI / 2, 0, 0, 16); { const n = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 8), std(0xeef2f5, 0.35, 0.2)); n.position.set(0, 0.6, 0.95); g.add(n); } for (let i = 0; i < 3; i++) box(g, 0.2, 0.05, 1.3, std(0xeef2f5, 0.35, 0.2), -0.3 + i * 0.3, 0.3 + i * 0.05, -0.6); for (const zz of [-0.7, 0.6]) box(g, 1.04, 0.02, 0.07, strap, 0, 0.94, zz);
    g = mk("engine"); box(g, 0.9, 0.12, 0.8, wood, 0, 0.06, 0); box(g, 0.56, 0.36, 0.5, std(0x30353b, 0.55, 0.35), 0, 0.32, 0);
    for (const x of [-0.13, 0.13]) box(g, 0.22, 0.16, 0.4, std(0x3c4249, 0.5, 0.4), x, 0.58, 0);
    cyl(g, 0.13, 0.06, steel, -0.32, 0.32, 0.05, 0, 0, Math.PI / 2, 14); cyl(g, 0.045, 0.5, steel, 0.36, 0.38, -0.05, 0, 0, 0.6, 8); straps(g, 0.6, 0.66, 0.6);
    g.userData.engineLook = true;
    return L;
  };
  for (const k of ["trailer", "flatbed"]) V2[k].userData.looks = V2[k].userData.slots.map(looks);
  for (const k of ["trailer", "flatbed"]) { for (const sl of V2[k].userData.slots) sl.userData.noWear = true; if (V2[k].userData.big) V2[k].userData.big.userData.noWear = true; }
  // a used engine looks used: every engine look on the trailers gets a light wear pass of its own
  for (const k of ["trailer", "flatbed"]) for (const L of V2[k].userData.looks) if (L.engine) { L.engine.visible = true; WEAR.apply(L.engine, 0.38, 77, { maxDecals: 3, dents: false }); L.engine.visible = false; }
  V2.flatbed.userData.bigLooks = looks(V2.flatbed.userData.big);
  // a hitch receiver on the sled's tail, only when something's hooked up
  V.hitchBar = new THREE.Group(); sledBody.add(V.hitchBar);
  box(V.hitchBar, 0.1, 0.08, 0.35, steel, 0, 0.32, -1.95); box(V.hitchBar, 0.35, 0.05, 0.06, steel, 0, 0.36, -1.8);
}
const _hw = new THREE.Vector3(), _hw2 = new THREE.Vector3();
function towVisual(dt) {
  const kind = PV.cat === "hitch" ? PV.id : GS.own.parts.hitch;
  for (const k in TOW.vis) TOW.vis[k].visible = k === kind;
  if (V.hitchBar) { V.hitchBar.visible = !!HITCH[kind] || (PV.cat === "recv" ? PV.id : GS.own.parts.recv || "none") !== "none"; V.hitchBar.position.z = -(hitchBack(PV.cat === "rack" ? PV.id : GS.own.parts.rack) - 2.1); }
  const H = HITCH[kind], g = TOW.vis[kind]; if (!H || !g) return;
  let x = TOW.x, z = TOW.z, yaw = TOW.yaw;
  if (kind !== TOW.kind) {                                   // a garage preview: hang it straight off the back
    const b = hitchBack(GS.own.parts.rack) + H.len; x = P.x - Math.sin(P.yaw) * b; z = P.z - Math.cos(P.yaw) * b; yaw = P.yaw;
  }
  const fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, half = kind === "flatbed" ? 1.4 : kind === "trailer" ? 1.0 : kind === "tiller" ? 0.7 : 0.45, TW = towWidth(H), hw = TW / 2;
  const pT = Math.atan2(rideSurf(x + fx * half, z + fz * half) - rideSurf(x - fx * half, z - fz * half), half * 2);
  let rT = Math.atan2(rideSurf(x + lx * hw, z + lz * hw) - rideSurf(x - lx * hw, z - lz * hw), TW);
  const k = 1 - Math.exp(-12 * dt);
  TOW.pitchV += (pT - TOW.pitchV) * k; TOW.rollV += (rT - TOW.rollV) * k;
  let tipR = 0, tipY = 0;
  if (TOW.tipT > 0 && kind === TOW.kind) { const t = 2.4 - TOW.tipT, e = t < 0.25 ? t / 0.25 : TOW.tipT < 0.5 ? TOW.tipT / 0.5 : 1; tipR = TOW.tipDir * 1.45 * e; tipY = 0.35 * e; }
  g.position.set(x, rideSurf(x, z) - 0.02 + tipY, z);
  g.rotation.set(-TOW.pitchV, yaw, TOW.rollV + tipR, "YXZ");
  // the tiller's wings fold down and out, the drums spin with ground speed, the beacons flash
  if (g.userData.wings) {
    const w = kind === TOW.kind ? TOW.wing : 0, e = w * w * (3 - 2 * w);
    for (const W of g.userData.wings) {
      W.pv.rotation.z = W.s * (Math.PI / 2 + 0.12) * (1 - e);
      W.ram.rotation.z = W.s * (0.2 + 1.0 * e); W.ram.position.x = W.s * (0.95 + 0.25 * e); W.ram.position.y = 0.95 - 0.2 * e;
    }
    const spin = (kind === TOW.kind ? TOW.spd : 0) / 0.27 * dt;
    for (const d of g.userData.drums) d.rotation.x -= spin;
    const on = TOW.wingOn || (w > 0.02 && w < 0.98), lit = on && Math.sin(performance.now() / 110) > 0;
    g.userData.beacons[0].material.emissiveIntensity = lit ? 2.6 : on ? 0.4 : 0.9;
  }
  if (g.userData.patient) g.userData.patient.visible = kind === TOW.kind && sarPatientKg() > 0;
  // stretch the tongue to the ball on the sled
  const tg = g.userData.tongue, arm = g.userData.arm;
  sledRoot.updateMatrixWorld(); g.updateMatrixWorld();
  const back = hitchBack(PV.cat === "rack" ? PV.id : GS.own.parts.rack);
  sledBody.localToWorld(_hw.set(0, 0.36, -back));
  const d = tg.getWorldPosition(_hw2).distanceTo(_hw);
  tg.lookAt(_hw); arm.scale.set(1, 1, Math.max(0.3, d));
  // cargo
  const loads = bigLoads(), sl = g.userData.looks;
  if (sl) {
    const hugeJ = loads.find(j => j.bays > 1);
    sl.forEach((L, i) => { const j = hugeJ ? null : loads[i]; for (const n in L) L[n].visible = !!j && j.look === n; });
    if (g.userData.bigLooks) for (const n in g.userData.bigLooks) g.userData.bigLooks[n].visible = !!hugeJ && hugeJ.look === n;
  }
}
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0), pending = [], wobbling = [];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qt = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _ax = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function wobble(o, amp, px, pz) {
  amp = Math.min(0.32, amp);
  if (o.wob) { const cur = o.wob.amp * Math.exp(-2.4 * o.wob.t); if (o.wob.t < 0.45 || cur > amp * 0.8) return; }
  const d = Math.hypot(px, pz) || 1;
  o.wob = { t: 0, amp, ax: pz / d, az: -px / d };
  if (!wobbling.includes(o)) wobbling.push(o);
}
function setTree(o, tilt) {
  _q.setFromAxisAngle(_up, o.yaw); _ax.set(o.wob.ax, 0, o.wob.az); _qt.setFromAxisAngle(_ax, tilt).multiply(_q);
  _p.set(o.x, o.y, o.z); _s.set(o.s, o.sy, o.s); _m.compose(_p, _qt, _s);
  const tm = trunkOf(o); tm.setMatrixAt(o.tree, _m); tm.instanceMatrix.needsUpdate = true;
  if (o.snowy) { const cm = capOf(o); cm.setMatrixAt(o.tree, _m); cm.instanceMatrix.needsUpdate = true; }
}
function updWobble(dt) {
  if (!wobbling.length) return;
  for (let i = wobbling.length - 1; i >= 0; i--) {
    const o = wobbling[i], w = o.wob; w.t += dt;
    const env = Math.exp(-2.4 * w.t), tilt = w.amp * env * Math.sin(w.t * 8.5 / Math.sqrt(o.s));
    if (env < 0.01) { setTree(o, 0); o.wob = null; wobbling.splice(i, 1); } else setTree(o, tilt);
  }
  treeMesh.instanceMatrix.needsUpdate = true; capMesh.instanceMatrix.needsUpdate = true;
}
function pile(x, z, R, amt) {
  for (let iz = Math.floor((z - R + HALF) / CELL); iz <= Math.ceil((z + R + HALF) / CELL); iz++)
    for (let ix = Math.floor((x - R + HALF) / CELL); ix <= Math.ceil((x + R + HALF) / CELL); ix++) {
      if (ix < 0 || iz < 0 || ix >= FN || iz >= FN) continue;
      const r = Math.hypot(ix * CELL - HALF - x, iz * CELL - HALF - z); if (r > R) continue;
      const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k];
      const t = r / R, bump = amt * (r < 0.5 ? 0.4 : 1) * (1 - t * t) * (0.7 + Math.random() * 0.6);
      c.d[k] = d0 + bump; writeCell(ix, iz, d0, d0 + bump, c.f[k]);
    }
}
function dropSnow(o, hard) {
  o.snowy = false;
  const cm = capOf(o); cm.setMatrixAt(o.tree, ZERO_M); cm.instanceMatrix.needsUpdate = true;
  const n = Math.round(160 + o.s * 180);
  for (let k = 0; k < n; k++) {
    const t = Math.random(), hh = o.y + (1.8 + t * 3.6) * o.s, rad = (1.9 - t * 1.2) * o.s * Math.sqrt(Math.random()), a = Math.random() * 6.283;
    const out = 0.4 + Math.random() * (hard ? 1.6 : 0.8);
    emit(o.x + Math.cos(a) * rad, hh, o.z + Math.sin(a) * rad, Math.cos(a) * out + P.vx * 0.08, Math.random() * 0.6, Math.sin(a) * out + P.vz * 0.08, 0.6, 2.2);
  }
  pending.push({ t: 0.9, x: o.x, z: o.z, s: o.s });
  whump(hard ? 0.9 : 0.55);
  const dd = Math.hypot(P.x - o.x, P.z - o.z);
  if (dd < 2.6 * o.s) { P.shake = Math.max(P.shake, 0.25); P.dumped = 1.2; }
}
function updPending(dt) {
  for (let i = pending.length - 1; i >= 0; i--) {
    const e = pending[i]; e.t -= dt;
    if (e.t <= 0) {
      pile(e.x, e.z, 2.3 * e.s, 0.18);
      for (let k = 0; k < 40; k++) { const a = Math.random() * 6.283, r = (0.6 + Math.random() * 1.8) * e.s; emit(e.x + Math.cos(a) * r, groundAt(e.x, e.z) + 0.6, e.z + Math.sin(a) * r, Math.cos(a) * 1.5, 0.8 + Math.random(), Math.sin(a) * 1.5, 0.8, 0.9); }
      pending.splice(i, 1);
    }
  }
}
// a sled with 100% power or more doesn't glance off a mountain birch, it runs it down: the trunk
// snaps at the base, the snow load comes off, and the tree lies flat in the snow where it fell.
// (0.9, so a stock 100% Frontier still counts after a big tank or paddle nibbles a few % off it)
const FLATTEN_POWER = 0.9, FLATTEN_SPEED = 2.5, felled = [];
function crack(v) {
  if (!audio) return;
  const { AC, master, buf } = audio, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime;
  s.buffer = buf; f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 0.8;
  g.gain.setValueAtTime(1.1 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + 0.2);
}
function flattenTree(o) {
  const sp = Math.hypot(P.vx, P.vz) || 1, px = P.vx / sp, pz = P.vz / sp;
  if (o.snowy) dropSnow(o, true);
  const wi = wobbling.indexOf(o); if (wi >= 0) wobbling.splice(wi, 1);
  o.wob = { t: 0, amp: 0, ax: pz, az: -px };                            // tips over the way the sled was going
  o.y -= 0.18 * o.s; setTree(o, 1.5 + Math.random() * 0.06);
  treeMesh.instanceMatrix.needsUpdate = true; capMesh.instanceMatrix.needsUpdate = true;
  o.top = -Infinity; o.down = true; felled.push(o); LOG.trees++;         // no longer an obstacle for anyone
  for (let k = 0; k < 30; k++) emit(o.x, o.y + 0.4 + Math.random() * 0.6, o.z, P.vx * 0.3, 1 + Math.random() * 1.5, P.vz * 0.3, 2.2, 0.8);
  P.vx *= 0.93; P.vz *= 0.93;
  P.shake = Math.max(P.shake, 0.18); crack(0.7); thud(0.3);
}
function collide(fx, fz) {
  const spdNow = Math.hypot(P.vx, P.vz);
  const mower = ST.power >= FLATTEN_POWER && P.vx * fx + P.vz * fz > FLATTEN_SPEED;
  for (const [off, r] of [[1.15, 0.62], [-0.7, 0.7]]) {
    const cx = P.x + fx * off, cz = P.z + fz * off;
    const gx = Math.floor((cx + HALF) / OBC), gz = Math.floor((cz + HALF) / OBC);
    for (let j = gz - 1; j <= gz + 1; j++) for (let i = gx - 1; i <= gx + 1; i++) {
      const a = obGrid.get(j * OBW + i); if (!a) continue;
      for (const o of a) {
        if (P.y > o.top - 0.12) continue;
        const dx = cx - o.x, dz = cz - o.z, d2 = dx * dx + dz * dz, rr = r + o.r;
        if (o.tree !== undefined && spdNow > 4.5) { const br = r + 1.15 * o.s; if (d2 < br * br) { wobble(o, 0.05 + spdNow * 0.004, -dx, -dz); if (o.snowy) dropSnow(o, false); } }
        if (d2 >= rr * rr || d2 < 1e-6) continue;
        if (o.tree !== undefined && mower && !o.pine) { flattenTree(o); continue; }
        if (o.tree !== undefined) { wobble(o, 0.06 + Math.hypot(P.vx, P.vz) * 0.014, -dx, -dz); if (o.snowy) dropSnow(o, true); }
        // a fallen log is a ramp, not a wall: hit it with speed and it launches you
        if (o.log && spdNow > 4.5 && P.gnd) {
          P.vy = Math.max(P.vy, 2.2 + spdNow * 0.3);
          P.y += 0.2; P.vx *= 0.94; P.vz *= 0.94;
          P.airP = 0.22; P.airPV = 1.1;                    // the nose comes up off the log
          P.shake = Math.max(P.shake, 0.25); thud(0.45);
          P.launched = 1.2;
          continue;
        }
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, pen = rr - d;
        P.x += nx * (pen + 0.02); P.z += nz * (pen + 0.02);
        const vn = P.vx * nx + P.vz * nz;
        if (vn < 0) {
          const hitV = -vn, tx = -nz, tz = nx;
          let vt = P.vx * tx + P.vz * tz;
          if (o.tree !== undefined) {
            // glance off: drop the into-trunk speed, keep rolling past beside it
            if (Math.abs(vt) < 1.2 && hitV > 1.5) vt = (vt !== 0 ? Math.sign(vt) : (Math.sign(fx * tz - fz * tx) || 1)) * Math.min(3.5, hitV * 0.3);
            P.vx = tx * vt * 0.82; P.vz = tz * vt * 0.82;
            if (Math.hypot(P.vx, P.vz) > 1) P.yaw = angLerp(P.yaw, Math.atan2(P.vx, P.vz), 0.3);
            if (hitV > 4) { cargoHit(hitV); P.shake = Math.min(0.45, hitV / 26); thud(Math.min(0.8, hitV / 24)); }
          } else {
            P.vx -= 1.45 * vn * nx; P.vz -= 1.45 * vn * nz;
            if (hitV > 4) { cargoHit(hitV); P.shake = Math.min(1, hitV / 14); thud(Math.min(1, hitV / 20)); }
          }
        }
      }
    }
  }
  while (felled.length) {                                               // pull downed birches out of the obstacle grid
    const o = felled.pop(), a = obGrid.get(Math.floor((o.z + HALF) / OBC) * OBW + Math.floor((o.x + HALF) / OBC));
    const k = a ? a.indexOf(o) : -1; if (k >= 0) a.splice(k, 1);
  }
  const lim = HALF - 24; P.x = clamp(P.x, -lim, lim); P.z = clamp(P.z, -lim, lim);
}
let sprayAcc = 0;
/* ---- engine heat: a sled cools its engine with the snow its track throws up ----
   Loose snow packs the heat exchangers under the tunnel and keeps the motor happy. Hardpack, your own
   packed trail on the wind-scoured fell, lake ice and bare rock throw up nothing, so a long pull on the
   throttle cooks it. Lift off, or ride the loose stuff beside the trail. Ice scratchers (Cooling, at the
   garage) dig snow off hard surfaces and throw it in to keep the temperature down. */
const HEAT = { t: 52, mul: 1, feed: 1, limp: false, warned: false, toldKit: false, steamT: 0 };
const HEAT_WARN = 92, HEAT_DERATE = 97, HEAT_LIMP = 112, HEAT_OK = 80;
function heatStep(dt, thr, spd, fr, exc, wet, gnd) {
  if (!started || GS.dead) return;
  if (gnd) {
    const h = groundAt(P.x, P.z), hard = sstep(120, 300, h) * (0.45 + 0.55 * fbm(P.x / 240 + 9, P.z / 240 + 4, 2));
    let feed = clamp((fr - 0.1) / 0.35, 0, 1) * (1 - 0.45 * P.pack) * (1 - 0.7 * hard) + clamp(exc * 6, 0, 0.8);
    if (P.ice) feed = 0.15;
    if (P.rock > 0.3 || (fr < 0.05 && !P.ice)) feed = Math.min(feed, 0.05);
    if (ST.cool > 0 && (P.ice || fr > 0.05) && P.rock < 0.3) feed = Math.max(feed, ST.cool * 0.75);
    if (wet) feed = 2;                                                    // skipping water is the best coolant there is
    HEAT.feed += (feed - HEAT.feed) * (1 - Math.exp(-dt / 1.2));
  }
  const load = thr * (0.5 + 0.5 * Math.min(spd / 30, 1)) * (0.92 + 0.08 * ST.power) * (BOG.on ? 1.15 : 1);
  const teq = 38 + 62 * load / (0.45 + 1.4 * HEAT.feed);
  HEAT.t += (teq - HEAT.t) * (1 - Math.exp(-dt / (teq > HEAT.t ? 26 : 15)));
  const motor = isElectric(sledDef()) ? "Motor" : "Engine";
  if (!HEAT.limp && HEAT.t >= HEAT_LIMP) {
    HEAT.limp = true;
    toast(`${motor} overheated: limp mode until it cools. Back off, or find loose snow to throw into it.`, "bad");
    if (!ST.cool && !HEAT.toldKit) { HEAT.toldKit = true; setTimeout(() => toast("Ice scratchers at the garage keep it cool on hardpack and ice.", "warn"), 3200); }
  }
  if (HEAT.limp && HEAT.t < HEAT_OK) { HEAT.limp = false; toast(`${motor}'s cooled down. Full power back.`, "good"); }
  if (!HEAT.warned && HEAT.t >= HEAT_WARN && !HEAT.limp) { HEAT.warned = true; toast(`${motor}'s running hot. It needs loose snow to cool: get off the hardpack or lift off.`, "warn"); }
  if (HEAT.warned && HEAT.t < HEAT_OK) HEAT.warned = false;
  HEAT.mul = HEAT.limp ? 0.3 : 1 - 0.45 * clamp((HEAT.t - HEAT_DERATE) / (HEAT_LIMP - HEAT_DERATE), 0, 1);
  if (HEAT.t > 100) {                                                   // steam off the tunnel
    HEAT.steamT += dt * (HEAT.t - 98) * 0.9;
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
    while (HEAT.steamT > 1) { HEAT.steamT -= 1; emit(P.x + fx * 0.9, P.y + 0.8, P.z + fz * 0.9, P.vx * 0.6, 1.6, P.vz * 0.6, 0.5, 1.4); }
  }
}
function heatCool() { HEAT.t = 50; HEAT.limp = false; HEAT.warned = false; HEAT.mul = 1; HEAT.feed = 1; }
function physStep(dt) {
  if (HELP.on && HELP.kind === "sea") { P.vx = P.vz = P.vy = 0; P.y = Math.max(rideSurf(P.x, P.z), P.wl - 0.5); P.gnd = true; P.wet = true; return; }   // dunked, and waiting on the rescue sled
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), lx = fz, lz = -fx;
  const wl0 = wlvAt(P.x, P.z), sea = wl0 !== null; if (sea) P.wl = wl0; else P.sink = 0;   // the sea, or a lake the melt has opened
  const hs = rideSurf(P.x, P.z), gnd = P.y <= hs + 0.12;
  const wet = sea && gnd && waterLine() >= surf(P.x, P.z) - 0.02;         // riding on the water, not the seabed
  const e = 0.8, gx = (smoothRide(P.x + e, P.z) - smoothRide(P.x - e, P.z)) / (2 * e), gz = (smoothRide(P.x, P.z + e) - smoothRide(P.x, P.z - e)) / (2 * e);
  let vx = P.vx, vz = P.vz;
  const vf = vx * fx + vz * fz;
  const exc = plough(fx, fz, lx, lz);
  const fr = freshAt(Math.round((P.x + HALF) / CELL), Math.round((P.z + HALF) / CELL));
  P.ice = bioAt(P.x, P.z) === 1 && fr < 0.12;
  // only very steep bare rock matters: the sled loses its footing and slides down the mountain
  P.rock = P.ice || wet ? 0 : (1 - sstep(0.05, 0.16, fr)) * sstep(0.7, 0.95, Math.hypot(gx, gz));
  // the spring melt: slush (heavy, wet, sloppy) and ground the snow has gone off (scrapes, sparks, stops you)
  const bareFx = P.ice || wet ? 0 : 1 - sstep(0.03, 0.1, fr), bare = bareFx * MELT.spr;
  const slush = P.ice || wet ? 0 : MELT.wet * sstep(0.04, 0.25, fr);
  P.bare = bareFx; P.slush = slush;
  P.thin = !sea && gnd && P.ice ? iceThin(P.x, P.z) : 0;
  if (P.thin > 0 && started && !GS.dead) thinIceStep(dt, Math.hypot(vx, vz), MASS + TOW.mass, fx, fz);
  else MELT.crack = Math.max(0, MELT.crack - 0.8 * dt);
  if (wet && !P.wet) {                                                  // hitting the water: a sheet of spray off the nose
    const s0 = Math.hypot(vx, vz);
    for (let k = 0; k < 24 + s0 * 2; k++) emit(P.x + fx * 1.4 + lx * (Math.random() - 0.5) * 2, P.wl + 0.1, P.z + fz * 1.4 + lz * (Math.random() - 0.5) * 2, vx * 0.5 + lx * (Math.random() - 0.5) * 8, 2 + Math.random() * s0 * 0.25, vz * 0.5 + lz * (Math.random() - 0.5) * 8, 1.5, 1.1);
    if (started && !GS.dead && (P.wetT <= 0 || s0 < VPLANE)) toast(s0 >= VPLANE ? "Skipping water. Keep it pinned." : "Too slow for open water!", s0 >= VPLANE ? "good" : "bad");
  }
  P.wet = wet; if (wet) P.wetT = 6; else P.wetT = Math.max(0, P.wetT - dt);
  P.exc = exc;
  heatStep(dt, GS.fuel > 0 && !GS.dead ? input.thr : 0, Math.hypot(vx, vz), fr, exc, wet, gnd);
  const PWR = ST.power * HEAT.mul;
  // steering
  const spf = clamp(Math.abs(vf) / 5, 0, 1) / (1 + Math.abs(vf) / 45);
  // wheelie: skis come up off the snow, track does all the work
  const thrE = GS.fuel > 0 && !GS.dead ? input.thr : 0;
  bogStep(dt, Math.hypot(vx, vz), thrE, fr);
  const M = MASS + TOW.mass;                                         // a loaded trailer is weight the engine has to haul
  if (started && !GS.dead) GS.fuel = Math.max(0, GS.fuel - (0.003 + thrE * (0.018 + 0.3 * exc + (wet ? 0.05 : 0) + TOW.drag / 9000) * ST.burn * (1 + TOW.mass / 900)) * dt);
  const whOn = input.wheelie && GS.fuel > 0 && (gnd ? Math.abs(vf) > 2.5 : P.wh > 0.3);
  P.wh = clamp(P.wh + (whOn ? 2.4 : -3.2) * dt, 0, 1);
  if (P.wh > 0.7 && gnd) { P.whRun += Math.abs(vf) * dt; if (P.whRun > P.whBest) P.whBest = P.whRun; }
  else if (P.wh < 0.2) P.whRun = 0;
  const tgt = -input.steer * (1.7 + input.lean * 0.75) * lerp(1, 0.32, P.wh) * spf * (vf < -0.3 ? -1 : 1);
  if (gnd) P.yr += (tgt - P.yr) * (1 - Math.exp(-7 * dt));
  else P.yr *= Math.exp(-1.5 * dt);                                   // no steering in the air, spin just bleeds off
  const dyaw = P.yr * dt; P.yaw += dyaw;
  if (gnd) {
    const share = (wet ? 0.5 : P.ice ? 0.35 : 0.9 - 0.3 * slush) * (1 - 0.7 * P.rock), a = dyaw * share, ca = Math.cos(a), sa = Math.sin(a);
    const nvx = vx * ca + vz * sa, nvz = vz * ca - vx * sa; vx = nvx; vz = nvz;
    const g2 = gx * gx + gz * gz; vx -= G * gx / (1 + g2) * dt; vz -= G * gz / (1 + g2) * dt;
    P.drag = 5600 * exc * ST.drag;
    // bare ground: track and skis on heather and gravel. It rises with speed so a sled crawls across a melted-out
    // patch (a stock sled tops out near 16 mph on it) instead of stopping dead
    const rolling = (wet ? 420 : P.ice ? 140 : lerp(260, 60, P.rock)) + slush * 600 + bare * (1400 + 700 * Math.min(Math.hypot(vx, vz), 30));
    // Climbing. Power is power: a hill never makes a sled faster than the flat would. What a
    // climb gets is the clutch backshifting under load: the track pulls whatever the hill and the
    // snow ask for plus a little to spare (more on stronger sleds), so any sled can pull away
    // slowly while it has snow to bite. Bare rock still spits you back down. On a steep pitch you
    // can't dump the clutch or the skis come up, and some power goes into track slip, hardpack
    // worst. The stock Frontier holds about 15 mph up the steepest faces.
    const up = Math.max(0, gx * fx + gz * fz), steep = sstep(0.1, 0.85, up);     // uphill grade under the skis
    const hill = M * G * up / (1 + g2);                                         // what the climb takes
    const grunt = Math.max(3600 * PWR * (1 - 0.5 * steep), hill + P.drag + TOW.drag + rolling + 1.3 * PWR * M);
    const pw = 47000 * PWR * (1 - steep * lerp(0.24, 0.42, P.pack)) * (wet ? 0.8 : 1);   // a track slips in water
    let F = 0;
    if (thrE > 0) F += Math.min(grunt, pw / Math.max(Math.abs(vf), 1)) * thrE * (1 - 0.9 * P.rock);
    if (input.brk > 0) F -= (vf > 0.6 ? 4200 : 1100) * input.brk;
    vx += F / M * fx * dt; vz += F / M * fz * dt;
    const sp = Math.hypot(vx, vz);
    // on water: hull drag on top of the air, and it gets far worse the lower the sled sits
    const Fs = P.drag + TOW.drag + rolling + (0.9 + 1.6 * slush) * sp * sp + (wet ? (2.2 + 9 * P.sink) * sp * sp + 3000 * P.sink : 0);
    if (sp > 0.01) { const dv = Math.min(sp, Fs / M * dt); vx -= vx / sp * dv; vz -= vz / sp * dv; }
    const grip = (wet ? 1.6 + ST.grip * 0.2 : lerp(P.ice ? 1.2 + ST.grip * 0.35 : lerp(5.5, 9.5, P.pack) + ST.grip, 0.8, P.rock) * lerp(1, 0.75, P.wh)) * (1 - 0.35 * slush);
    // ruts: a packed trail is a groove, and the sled settles into it unless you steer out
    let rut = 0;
    if (!P.ice && !wet) {
      const sp0 = Math.hypot(vx, vz);
      if (sp0 > 2.5) {
        const o = 0.7, bx = P.x + fx * 1.1, bz = P.z + fz * 1.1;
        const hl = surf(bx + lx * o, bz + lz * o), hr = surf(bx - lx * o, bz - lz * o), hc = surf(bx, bz);
        const lo = Math.min(hl, hr, hc), hi = Math.max(hl, hr, hc);
        rut = clamp((hi - lo) / 0.2, 0, 1);                          // is there a groove within a sled width
        const fall = clamp((hl - hr) / (2 * o), -0.9, 0.9);          // downhill across the track = toward the trail
        const pull = fall * rut * 16 * (1 - Math.abs(input.steer) * 0.85) * clamp(sp0 / 10, 0, 1);
        vx -= lx * pull * dt; vz -= lz * pull * dt;
        // and the skis drop into the groove, gently swinging the nose to follow it (fades out while you steer)
        P.yr -= fall * rut * 3.2 * (1 - Math.abs(input.steer) * 0.9) * clamp(sp0 / 8, 0, 1) * dt * (vf < -0.3 ? -1 : 1);
      }
    }
    const gripR = grip * (1 + rut * 0.6);
    const vl = vx * lx + vz * lz, nvl = vl * Math.exp(-gripR * dt); vx += (nvl - vl) * lx; vz += (nvl - vl) * lz;
    P.rut = rut;
    // spray
    const spd = Math.hypot(vx, vz);
    if (wet) {
      // planing or settling: under planing speed the water stops holding you up
      if (spd < VPLANE) P.sink += ((1 - spd / VPLANE) * 1.2 + 0.1) * dt;
      else P.sink = Math.max(0, P.sink - 0.9 * dt);
      // the rooster tail: a big wall of water thrown up and back off the track, plus curtains off both sides (much heavier than the first pass)
      sprayAcc += (14 + Math.abs(vl) * 1.8) * Math.min(spd, 32) * dt;
      while (sprayAcc > 1) {
        sprayAcc -= 1;
        const side = (Math.random() - 0.5) * 1.5;
        emit(P.x - fx * 1.7 + lx * side, P.wl + 0.05, P.z - fz * 1.7 + lz * side, -fx * spd * 0.5 + vx * 0.2, 4 + spd * 0.4 + Math.random() * 3, -fz * spd * 0.5 + vz * 0.2, 2.6, 1.9);
        if (Math.random() < 0.45) { const s = Math.random() < 0.5 ? -1 : 1; emit(P.x - fx * 0.6 + lx * s * 0.7, P.wl + 0.05, P.z - fz * 0.6 + lz * s * 0.7, -fx * spd * 0.2 + vx * 0.3 + lx * s * (3 + spd * 0.2), 2 + spd * 0.15, -fz * spd * 0.2 + vz * 0.3 + lz * s * (3 + spd * 0.2), 1.6, 1.3); }
      }
    } else
    sprayAcc += (exc * 60 + 0.4 + (P.ice ? 0 : Math.abs(vl) * 0.8)) * Math.min(spd, 30) * dt * (P.ice ? 0.3 : 1);
    while (sprayAcc > 1) {
      sprayAcc -= 1;
      const side = (Math.random() - 0.5) * 0.5;
      if (Math.random() < Math.max(slush * 0.85, bareFx * 0.9)) {             // wet slush, or mud and grit off bare ground
        emitMuck(P.x - fx * 1.6 + lx * side, P.y + 0.12, P.z - fz * 1.6 + lz * side, -fx * spd * 0.22 + vx * 0.3, 1.2 + spd * 0.1 + exc * 4, -fz * spd * 0.22 + vz * 0.3, 1.3 + exc * 3, bareFx > slush);
        continue;
      }
      emit(P.x - fx * 1.6 + lx * side, P.y + 0.15, P.z - fz * 1.6 + lz * side, -fx * spd * 0.25 + vx * 0.3, 1.5 + spd * 0.12 + exc * 6, -fz * spd * 0.25 + vz * 0.3, 1.6 + exc * 4);
      if (exc > 0.05 && Math.random() < 0.5) { const s = Math.random() < 0.5 ? -0.6 : 0.6; emit(P.x + fx * 1.9 + lx * s, P.y + 0.1, P.z + fz * 1.9 + lz * s, vx * 0.6 + lx * s * 3, 1.2 + exc * 5, vz * 0.6 + lz * s * 3, 1.4); }
    }
    // carbides and the track's studs on rock and gravel
    if (bareFx > 0.4 && spd > 2) {
      sparkAcc += bareFx * Math.min(spd, 20) * 2.2 * dt;
      while (sparkAcc > 1) { sparkAcc -= 1; const s = Math.random() < 0.5 ? -0.55 : 0.55; spark(P.x + fx * (Math.random() * 2.6 - 1.6) + lx * s, P.y + 0.06, P.z + fz * (Math.random() * 2.6 - 1.6) + lz * s, -vx * 0.25 + lx * s * (2 + Math.random() * 3), 1 + Math.random() * 2.5, -vz * 0.25 + lz * s * (2 + Math.random() * 3)); }
    }
  } else P.drag *= 0.9;
  if (WN.pullV) { vx = WN.pullV.x; vz = WN.pullV.z; }                         // the winch has the sled
  else if (FOOT.on) { vx = vz = 0; }                                             // parked with the brake on
  else if (BOG.on) {                                                             // in a hole: whatever you do with the throttle, it digs deeper
    const k = Math.exp(-12 * dt); vx *= k; vz *= k;
    if (thrE > 0.2) {
      BOG.depth = Math.min(1, BOG.depth + 0.02 * thrE * dt); BOG.r0 = M * GR * (0.5 + 1.1 * BOG.depth); BOG.resist = BOG.r0 * clamp(1 - 0.75 * BOG.moved / BOG.r, 0.2, 1);
      if (Math.random() < 0.3) emit(P.x - fx * 1.6, P.y + 0.3, P.z - fz * 1.6, -fx * 3 + (Math.random() - 0.5) * 4, 3 + Math.random() * 3, -fz * 3 + (Math.random() - 0.5) * 4, 1.5, 1);
    }
  }
  if (gnd && input.hop && !FOOT.on && !BOG.on) { P.vy = (vx * gx + vz * gz) + 6.5; P.y += 0.14; }
  input.hop = false;
  if (P.airT > 0.12) {
    // no stick control in the air: the sled carries whatever kick the lip gave it,
    // and its weight settles it back toward flat so it comes down skis-first
    const damp = Math.exp(-2.5 * dt), lvl = Math.exp(-1.8 * dt);
    P.airPV *= damp; P.airRV *= damp;
    P.airP = clamp((P.airP + P.airPV * dt) * lvl, -0.6, 0.6);
    P.airR = clamp((P.airR + P.airRV * dt) * lvl, -0.6, 0.6);
    P.launched = Math.max(0, P.launched - dt);
  } else {
    const k = 1 - Math.exp(-9 * dt);
    P.airP -= P.airP * k; P.airR -= P.airR * k; P.airPV *= 1 - k; P.airRV *= 1 - k;
  }
  P.vy -= G * dt;
  P.x += vx * dt; P.z += vz * dt; P.y += P.vy * dt;
  P.vx = vx; P.vz = vz;
  if (gnd && !wet) { stamp(fx, fz, lx, lz, Math.min(1, Math.abs(P.yr) * Math.hypot(vx, vz) / 8)); markTrail(P.x, P.z); }
  const hs2 = rideSurf(P.x, P.z);
  let sv = vx * gx + vz * gz;
  const impact = Math.max(0, sv - P.vy);
  // coming down onto a rising face: the snow takes the speed you drove into it. It used to hand you the
  // climb for free (every bit of speed kept, plus the lift up the face), which is what fired you off the top
  // (the first metre a second is let off, so skis chattering through powder don't count as landings)
  if (!gnd && sv > 0 && sv - P.vy > 1 && P.y <= hs2 + 0.12) {
    const g2 = gx * gx + gz * gz, gm = Math.sqrt(g2);
    const cut = Math.min(sv / gm, (sv - P.vy - 1) * gm / (1 + g2));  // at most the uphill part of your speed
    vx -= gx / gm * cut; vz -= gz / gm * cut; P.vx = vx; P.vz = vz;
    sv = vx * gx + vz * gz;
  }
  if (P.y <= hs2) { P.y = hs2; if (P.vy < sv) P.vy = sv; }
  else { P.airT += dt; P.airPeak = Math.max(P.airPeak, P.y - hs2); }
  const wasAir = P.airT, peak = P.airPeak;
  P.gnd = P.y <= hs2 + 0.12;
  // a landing counts the moment the skis are back on the snow — deep powder swallows the
  // hard contact, so this can't wait for a clean surface hit
  if (P.gnd && wasAir > 0.3 && peak > 0.32) {      // a real jump, not a bump
    LOG.air += wasAir; if (wasAir > LOG.jump) LOG.jump = wasAir;                       // the Logbook's airtime and longest jump
    const att = Math.abs(P.airP) + Math.abs(P.airR) * 1.25;      // how far off flat you came down
    // forgiving touchdown: the sled snaps straight to the slope, the rider bleeds a little speed
    P.yr *= 0.3;
    if (P.vy < sv) P.vy = sv;
    if (att > 0.8) {
      const bite = Math.min(0.3, 0.08 + att * 0.18);
      vx *= 1 - bite; vz *= 1 - bite; P.vx = vx; P.vz = vz;
      P.shake = Math.max(P.shake, Math.min(0.7, 0.3 + att * 0.3));
      cargoHit(impact * 0.6 + att * 4);
      thud(Math.min(1, 0.4 + att * 0.3));
      if (started && !GS.dead) toast(att > 1 ? "Ugly landing. That hurt the load." : "Landed crooked.", "warn");
    } else {
      if (sea && P.y <= waterLine() + 0.05) {
        // belly-flopping onto water: it's hard as concrete at speed, and it scrubs the speed off
        const bite = Math.min(0.35, impact * 0.025); vx *= 1 - bite; vz *= 1 - bite; P.vx = vx; P.vz = vz;
        const s0 = Math.hypot(vx, vz);
        for (let k = 0; k < 30 + impact * 6; k++) emit(P.x + (Math.random() - 0.5) * 2, P.wl + 0.1, P.z + (Math.random() - 0.5) * 3, vx * 0.3 + (Math.random() - 0.5) * 9, 2 + Math.random() * (3 + impact * 0.4), vz * 0.3 + (Math.random() - 0.5) * 9, 1.5, 1.2);
        if (impact > 7) { cargoHit(impact * 0.7); thud(Math.min(1, impact / 16)); }
        if (s0 < VPLANE && started && !GS.dead) toast("Landed short. You're sinking!", "bad");
      } else if (impact > 7) { cargoHit(impact * 0.7); crater(P.x, P.z, Math.min(0.45, impact * 0.04)); thud(Math.min(1, impact / 16)); }
      P.shake = Math.max(P.shake, Math.min(0.8, impact / 16) * (ST.soak ? 0.6 : 1));
      if (P.launched > 0 && impact > 2.5 && started && !GS.dead) toast("Stuck the landing.", "good");
    }
    P.airPV = P.airRV = 0; P.airP *= 0.25; P.airR *= 0.25; P.launched = 0; P.airT = 0; P.airPeak = 0;
  } else if (P.gnd) { P.airT = 0; P.airPeak = 0; }
  collide(fx, fz);
  towStep(dt);
  sarTowStep(dt);                                     // a dead sled on a tow rope (rescue callouts)
  P.odo += Math.abs(vf) * dt; P.dist += Math.hypot(vx, vz) * dt; LOG.m += Math.hypot(vx, vz) * dt;
}

/* ---------------- audio ---------------- */
let audio = null;
function distCurve(amount) {
  const n = 256, curve = new Float32Array(n), k = amount;
  for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; curve[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
  return curve;
}
function initAudio() {
  try {
    const AC = new (window.AudioContext || window.webkitAudioContext)();
    const master = AC.createGain(); master.gain.value = muted ? 0 : SET.vol; master.connect(AC.destination);
    const o1 = AC.createOscillator(), o2 = AC.createOscillator(); o1.type = "sawtooth"; o2.type = "square";
    const mix = AC.createGain(); mix.gain.value = 1;
    const drive = AC.createWaveShaper(); drive.curve = distCurve(22); drive.oversample = "2x";
    const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500; lp.Q.value = 3.5;
    const eg = AC.createGain(); eg.gain.value = 0;
    const o2g = AC.createGain(); o2g.gain.value = 0.6;
    o1.connect(mix); o2.connect(o2g); o2g.connect(mix); mix.connect(drive); drive.connect(lp); lp.connect(eg); eg.connect(master); o1.start(); o2.start();
    const buf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), ch = buf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const mk = (type, f, q) => { const s = AC.createBufferSource(); s.buffer = buf; s.loop = true; const b = AC.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; const g = AC.createGain(); g.gain.value = 0; s.connect(b); b.connect(g); g.connect(master); s.start(); return { g, b }; };
    const hiss = mk("bandpass", 1100, 0.7), wind = mk("lowpass", 380, 0.4);
    const ow = AC.createOscillator(), wg = AC.createGain(), wf = AC.createBiquadFilter(); ow.type = "sawtooth"; ow.frequency.value = 95; wf.type = "lowpass"; wf.frequency.value = 600; wg.gain.value = 0;
    ow.connect(wf); wf.connect(wg); wg.connect(master); ow.start();
    audio = { AC, master, o1, o2, o2g, lp, eg, hiss, wind, buf, ow, wg };
  } catch (e) { audio = null; }
}
function thud(v) {
  if (!audio) return;
  const { AC, master, buf } = audio, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = buf; f.type = "lowpass"; f.frequency.value = 220; g.gain.setValueAtTime(0.9 * v, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.35);
  s.connect(f); f.connect(g); g.connect(master); s.start(); s.stop(AC.currentTime + 0.4);
}
function whump(v) {
  if (!audio) return;
  const { AC, master, buf } = audio, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime;
  s.buffer = buf; f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(160, t + 0.9);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7 * v, t + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + 1.2);
}
/* ---------------- horn ---------------- */
// Two-tone "meep-MEEP" on E (keyboard), L3 (gamepad) and the HORN touch button. It only makes a noise:
// no gameplay effect, no NPC or wildlife reaction, no score. That is on purpose, so keep it that way.
// It sits well above the engine (whose fundamental is 40-180 Hz) so it cuts through without ducking anything.
let hornBus = null;
function hornOk() { return started && !GS.dead && !FOOT.on && !GS.garageOpen && !godOpen && $("settings").hidden && $("bigmap").hidden; }
function horn() {
  if (!audio || !hornOk()) return;
  const { AC, master } = audio, t = AC.currentTime;
  if (AC.state === "suspended") AC.resume();
  if (hornBus) { const old = hornBus; old.g.gain.cancelScheduledValues(t); old.g.gain.setTargetAtTime(0.0001, t, 0.008); setTimeout(() => { try { old.g.disconnect(); } catch (e) { } }, 120); }
  const bus = AC.createGain(), hp = AC.createBiquadFilter(), lp = AC.createBiquadFilter(), sat = AC.createWaveShaper(), comp = AC.createDynamicsCompressor();
  hp.type = "highpass"; hp.frequency.value = 330; lp.type = "lowpass"; lp.frequency.value = 3200;
  sat.curve = distCurve(5); sat.oversample = "2x";
  comp.threshold.value = -16; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.1;
  bus.gain.value = 0.5; bus.connect(hp); hp.connect(sat); sat.connect(lp); lp.connect(comp);
  const out = AC.createGain(); out.gain.value = 0.64; comp.connect(out); out.connect(master);   // level is set here, after the saturator, so it stays under the engine's headroom
  hornBus = { g: bus };
  const note = (f, t0, dur) => {
    const env = AC.createGain(); env.connect(bus);
    env.gain.setValueAtTime(0.0001, t0); env.gain.exponentialRampToValueAtTime(1, t0 + 0.012); env.gain.setValueAtTime(1, t0 + dur - 0.05); env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    for (const [type, mul, w] of [["sawtooth", 1, 0.5], ["square", 1.006, 0.35], ["sawtooth", 2, 0.22]]) {
      const o = AC.createOscillator(), g = AC.createGain(); o.type = type; g.gain.value = w;
      o.frequency.setValueAtTime(f * mul * 0.93, t0); o.frequency.exponentialRampToValueAtTime(f * mul, t0 + 0.035);   // the little scoop up into each note is the silly part
      o.connect(g); g.connect(env); o.start(t0); o.stop(t0 + dur + 0.02);
    }
  };
  note(392, t, 0.12);          // G4: meep
  note(523.25, t + 0.135, 0.36); // C5: MEEEP
}
function updAudio(spd) {
  if (!audio) return;
  const t = audio.AC.currentTime, r = P.rpm, f = 40 + r * 140;
  audio.o1.frequency.setTargetAtTime(f, t, 0.05); audio.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
  audio.o2g.gain.setTargetAtTime(0.55 + r * 0.5, t, 0.08);
  audio.lp.frequency.setTargetAtTime(300 + r * 2200, t, 0.06);
  audio.lp.Q.setTargetAtTime(2.5 + r * 5, t, 0.08);
  audio.eg.gain.setTargetAtTime(GS.fuel > 0 && !GS.dead ? 0.09 + r * 0.16 : 0, t, 0.15);
  audio.hiss.g.gain.setTargetAtTime(P.gnd ? Math.min(0.5, spd / 30 * (0.08 + P.exc * 1.6)) : 0, t, 0.08);
  audio.hiss.b.frequency.setTargetAtTime(P.wet ? 1700 : P.ice ? 2600 : P.bare > 0.5 ? 3600 : P.slush > 0.35 ? 700 : 1000, t, 0.2);
  if (P.gnd && P.bare > 0.5) audio.hiss.g.gain.setTargetAtTime(Math.min(0.45, 0.06 + spd / 40), t, 0.06);   // the scrape of carbides on gravel
  if (P.wet) audio.hiss.g.gain.setTargetAtTime(Math.min(0.55, 0.12 + spd / 60), t, 0.08);
  audio.wind.g.gain.setTargetAtTime(0.05 + Math.min(0.3, spd / 45 * 0.3), t, 0.2);
}

/* ---------------- minimap: circular, heading-up, shaded relief ---------------- */
const mapC = $("map"), mctx = mapC.getContext("2d"), MS = mapC.width;
const MB = 1024, MZOOM = 620;                       // relief canvas resolution, and metres across the dial
const mapBg = document.createElement("canvas"), mapTrail = document.createElement("canvas");
mapBg.width = mapBg.height = mapTrail.width = mapTrail.height = MB;
const tctx = mapTrail.getContext("2d");
const M2SRC = MB / WORLD, M2DISP = MS / MZOOM;
function buildMapBg() {
  const g = mapBg.getContext("2d"), img = g.createImageData(MB, MB), st = WORLD / MB;
  for (let j = 0; j < MB; j++) for (let i = 0; i < MB; i++) {
    const x = (i + 0.5) * st - HALF, z = (j + 0.5) * st - HALF;
    const h = groundAt(x, z), b = bioAt(x, z), o = (j * MB + i) * 4;
    // hillshade from a sun in the north-west, so ridges and gullies read as relief
    const hx = (groundAt(x + st, z) - groundAt(x - st, z)) / (2 * st), hz = (groundAt(x, z + st) - groundAt(x, z - st)) / (2 * st);
    const shade = clamp(0.78 + (hx * 0.75 + hz * 0.75) / Math.sqrt(1 + hx * hx + hz * hz), 0.42, 1.3);
    const alt = clamp(h / 420, 0, 1);                 // valleys cool and dim, the high fell bright white
    let r = lerp(198, 255, alt) * shade, gg = lerp(214, 255, alt) * shade, bl = lerp(236, 255, alt) * shade;
    if (b === 3) { const dp = clamp(-h / 40, 0, 1); r = lerp(34, 16, dp); gg = lerp(66, 36, dp); bl = lerp(96, 60, dp); }
    else if (b === 1) { r = 120 * shade; gg = 176 * shade; bl = 214 * shade; }
    else if (b === 2) { r *= 0.74; gg *= 0.7; bl *= 0.64; }
    else if (sampleG(freshG, x, z) < 0.12) { r *= 0.5; gg *= 0.49; bl *= 0.5; }
    const band = h % 40;                              // 40 m contour lines for depth
    if (band < st * Math.hypot(hx, hz) * 1.2 && h > 8 && b !== 1 && b !== 3) { r *= 0.86; gg *= 0.86; bl *= 0.88; }
    img.data[o] = clamp(r, 0, 255); img.data[o + 1] = clamp(gg, 0, 255); img.data[o + 2] = clamp(bl, 0, 255); img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}
let lastMark = null;
function drawMap() {
  const R = MS / 2, k = M2DISP / M2SRC;
  mctx.save();
  mctx.beginPath(); mctx.arc(R, R, R, 0, 6.283); mctx.clip();
  mctx.fillStyle = "#0d1822"; mctx.fillRect(0, 0, MS, MS);
  mctx.save();
  const ang = P.yaw + Math.PI;                                          // heading-up
  mctx.translate(R, R); mctx.rotate(ang); mctx.scale(k, k);
  mctx.translate(-(P.x + HALF) * M2SRC, -(P.z + HALF) * M2SRC);
  mctx.drawImage(mapBg, 0, 0); if (MELT.ovOn && MELT.kq > 0) mctx.drawImage(MELT.ov, 0, 0, MB, MB); mctx.drawImage(mapTrail, 0, 0);
  if (GS.groomJob) { const r = 2.6 / k; for (const p of GS.groomJob.pts) { mctx.fillStyle = p.done ? "#6fd08c" : "#ff8a3a"; mctx.beginPath(); mctx.arc((p.x + HALF) * M2SRC, (p.z + HALF) * M2SRC, r, 0, 6.283); mctx.fill(); } }
  mctx.restore();
  // what's ahead: a soft cone up the middle
  const grd = mctx.createLinearGradient(R, R, R, 0);
  grd.addColorStop(0, "rgba(127,200,224,.22)"); grd.addColorStop(1, "rgba(127,200,224,0)");
  mctx.fillStyle = grd; mctx.beginPath(); mctx.moveTo(R, R); mctx.arc(R, R, R, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); mctx.closePath(); mctx.fill();
  // sites, placed in screen space so the labels stay upright
  const cy = Math.cos(ang), sy = Math.sin(ang);
  for (const s of SITES) {
    const dx = (s.x - P.x) * M2DISP, dz = (s.z - P.z) * M2DISP;
    let ux = dx * cy - dz * sy, uz = dx * sy + dz * cy, edge = false;
    const d = Math.hypot(ux, uz);
    if (d > R - 12) {                                   // off the dial: only the depot and your drop show on the rim
      if (s !== depot && !GS.load.some(j => j.dest === s) && !(GS.groomJob && GS.groomJob.dest === s)) continue;
      const f = (R - 12) / d; ux *= f; uz *= f; edge = true;
    }
    const sx = R + ux, sz = R + uz, tg = GS.load.some(j => j.dest === s) || (GS.groomJob && GS.groomJob.dest === s);
    const hm = s.type === "home" ? 2 : 0;
    mctx.fillStyle = "#0d1822"; mctx.fillRect(sx - 6 + hm, sz - 6 + hm, 12 - 2 * hm, 12 - 2 * hm);
    mctx.fillStyle = s === depot ? "#7fc8e0" : "#eaf2f8";
    if (edge) { mctx.globalAlpha = 0.65; mctx.fillRect(sx - 3, sz - 3, 6, 6); mctx.globalAlpha = 1; }
    else mctx.fillRect(sx - 4 + hm, sz - 4 + hm, 8 - 2 * hm, 8 - 2 * hm);
    if (tg) { mctx.strokeStyle = "#ff5a1f"; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(sx, sz, 11 + Math.sin(performance.now() * 0.006) * 2, 0, 6.283); mctx.stroke(); }
  }
  if (GS.rescueJob) for (const v of RJ.vs) {     // the people you're going to get out
    if (v.freed) continue;
    const dx = (v.x - P.x) * M2DISP, dz = (v.z - P.z) * M2DISP; let ux = dx * cy - dz * sy, uz = dx * sy + dz * cy, edge = false; const d = Math.hypot(ux, uz);
    if (d > R - 12) { const f = (R - 12) / d; ux *= f; uz *= f; edge = true; }
    const sx = R + ux, sz = R + uz;
    mctx.fillStyle = "#0d1822"; mctx.beginPath(); mctx.arc(sx, sz, 7.5, 0, 6.283); mctx.fill();
    mctx.fillStyle = "#ff3a1a"; mctx.beginPath(); mctx.arc(sx, sz, edge ? 3.6 : 5.2, 0, 6.283); mctx.fill();
    mctx.strokeStyle = "#ff3a1a"; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(sx, sz, 11 + Math.sin(performance.now() * 0.008) * 2.4, 0, 6.283); mctx.stroke();
  }
  for (const p of sarPts()) {                    // a rescue case: the search area, the casualty, or where you're taking them
    const dx = (p.x - P.x) * M2DISP, dz = (p.z - P.z) * M2DISP; let ux = dx * cy - dz * sy, uz = dx * sy + dz * cy, edge = false; const d = Math.hypot(ux, uz);
    if (d > R - 12) { const f = (R - 12) / d; ux *= f; uz *= f; edge = true; }
    const sx = R + ux, sz = R + uz;
    if (p.area && !edge) { mctx.strokeStyle = "rgba(255,58,26,.7)"; mctx.lineWidth = 2; mctx.setLineDash([5, 4]); mctx.beginPath(); mctx.arc(sx, sz, Math.max(8, p.area * M2DISP), 0, 6.283); mctx.stroke(); mctx.setLineDash([]); continue; }
    mctx.fillStyle = "#0d1822"; mctx.beginPath(); mctx.arc(sx, sz, 7.5, 0, 6.283); mctx.fill();
    mctx.fillStyle = p.kind === "sarw" ? "#7fc8e0" : "#ff3a1a"; mctx.beginPath(); mctx.arc(sx, sz, edge ? 3.6 : 5.2, 0, 6.283); mctx.fill();
  }
  for (const n of NPCS) {                        // other riders, if they're within the dial
    const dx = (n.x - P.x) * M2DISP, dz = (n.z - P.z) * M2DISP;
    const ux = dx * cy - dz * sy, uz = dx * sy + dz * cy;
    if (Math.hypot(ux, uz) > R - 8) continue;
    mctx.fillStyle = "#0d1822"; mctx.beginPath(); mctx.arc(R + ux, R + uz, 5, 0, 6.283); mctx.fill();
    mctx.fillStyle = n.colour; mctx.beginPath(); mctx.arc(R + ux, R + uz, 3.2, 0, 6.283); mctx.fill();
  }
  // the sled, always at the centre pointing up
  mctx.fillStyle = "#0d1822"; mctx.beginPath(); mctx.moveTo(R, R - 15); mctx.lineTo(R - 10, R + 10); mctx.lineTo(R + 10, R + 10); mctx.closePath(); mctx.fill();
  mctx.fillStyle = "#ff5a1f"; mctx.beginPath(); mctx.moveTo(R, R - 11); mctx.lineTo(R - 7, R + 7); mctx.lineTo(R + 7, R + 7); mctx.closePath(); mctx.fill();
  mctx.restore();
  // north pip and rim
  mctx.save();
  mctx.translate(R, R); mctx.rotate(ang);
  mctx.fillStyle = "#7fc8e0"; mctx.beginPath(); mctx.moveTo(0, -R + 4); mctx.lineTo(-7, -R + 17); mctx.lineTo(7, -R + 17); mctx.closePath(); mctx.fill();
  mctx.restore();
  mctx.strokeStyle = "rgba(234,242,248,.25)"; mctx.lineWidth = 3;
  mctx.beginPath(); mctx.arc(R, R, R - 1.5, 0, 6.283); mctx.stroke();
  // the ferry clock round the rim: a full ring is 12 game hours to her sailing; orange with post aboard, red when missing her costs you
  const fi = ferryInfo();
  if (fi.left !== null) {
    const fr = clamp(fi.left / 12, 0, 1), rk = GS.mail.length ? mailRisk() : null;
    mctx.strokeStyle = !rk ? "rgba(127,200,224,.75)" : rk.fine || rk.lose ? "#ff3a1a" : "#ff8a3a"; mctx.lineWidth = 5; mctx.lineCap = "round";
    mctx.beginPath(); mctx.arc(R, R, R - 3, -Math.PI / 2, -Math.PI / 2 + fr * 6.283); mctx.stroke(); mctx.lineCap = "butt";
  }
}
function toggleBigMap(force) {
  const open = force !== undefined ? force : $("bigmap").hidden;
  $("bigmap").hidden = !open;
  if (open) { TABLET.close(); toggleSettings(false); drawBigMap(); }
}
function drawBigMap() {
  const c = $("bigmapC"), g = c.getContext("2d"), N = c.width, k = N / MB;
  g.fillStyle = "#0d1822"; g.fillRect(0, 0, N, N);
  g.imageSmoothingEnabled = true;
  g.drawImage(mapBg, 0, 0, N, N); if (MELT.ovOn && MELT.kq > 0) g.drawImage(MELT.ov, 0, 0, N, N); g.drawImage(mapTrail, 0, 0, N, N);
  const w2 = (x, z) => [(x + HALF) * M2SRC * k, (z + HALF) * M2SRC * k];
  if (GS.groomJob) for (const p of GS.groomJob.pts) { const [gx, gz] = w2(p.x, p.z); g.fillStyle = "#0d1822"; g.beginPath(); g.arc(gx, gz, 5.5, 0, 6.283); g.fill(); g.fillStyle = p.done ? "#6fd08c" : "#ff8a3a"; g.beginPath(); g.arc(gx, gz, 3.8, 0, 6.283); g.fill(); }
  g.font = "500 17px 'Barlow Semi Condensed', sans-serif"; g.textAlign = "center";
  for (const s of SITES) {
    if (s.type === "shop") continue;                          // the garage is across the road from the quay; one label will do
    const [sx, sz] = w2(s.x, s.z), tg = GS.load.some(j => j.dest === s) || (GS.groomJob && GS.groomJob.dest === s);
    if (s.type === "home") {                                  // the homes round town: a small square, and a name once you're headed there
      g.fillStyle = "#0d1822"; g.fillRect(sx - 5, sz - 5, 10, 10); g.fillStyle = "#eaf2f8"; g.fillRect(sx - 3, sz - 3, 6, 6);
      if (tg) {
        g.strokeStyle = "#ff5a1f"; g.lineWidth = 3.5; g.beginPath(); g.arc(sx, sz, 13, 0, 6.283); g.stroke();
        g.font = "500 15px 'Barlow Semi Condensed', sans-serif"; const w = g.measureText(s.name).width + 10;
        g.fillStyle = "rgba(13,24,34,.75)"; g.fillRect(sx - w / 2, sz + 10, w, 20); g.fillStyle = "#ff5a1f"; g.fillText(s.name, sx, sz + 25);
        g.font = "500 17px 'Barlow Semi Condensed', sans-serif";
      }
      continue;
    }
    g.fillStyle = "#0d1822"; g.fillRect(sx - 8, sz - 8, 16, 16);
    g.fillStyle = s === depot ? "#7fc8e0" : "#eaf2f8"; g.fillRect(sx - 5, sz - 5, 10, 10);
    if (tg) { g.strokeStyle = "#ff5a1f"; g.lineWidth = 3.5; g.beginPath(); g.arc(sx, sz, 16, 0, 6.283); g.stroke(); }
    g.fillStyle = "rgba(13,24,34,.75)"; const w = g.measureText(s.name).width + 12;
    g.fillRect(sx - w / 2, sz + 12, w, 22);
    g.fillStyle = tg ? "#ff5a1f" : "#eaf2f8"; g.fillText(s.name, sx, sz + 28);
    if (s !== depot && groom[s.id] !== undefined) {
      const lab = groomLabel(groom[s.id]);
      g.font = "500 14px 'Barlow Semi Condensed', sans-serif";
      g.fillStyle = groom[s.id] > 0.8 ? "#6fd08c" : groom[s.id] > 0.45 ? "#ffc26b" : "#9fb0bf";
      g.fillText(lab, sx, sz + 46);
      g.font = "500 17px 'Barlow Semi Condensed', sans-serif";
    }
  }
  for (const v of LOOKOUTS) {                                     // aurora viewpoints: a small teal triangle, named when you're taking a tour there
    if (v.x === undefined) continue;
    const [vx, vz] = w2(v.x, v.z), tg = GS.tour && GS.tour.view === v;
    g.fillStyle = "#0d1822"; g.beginPath(); g.moveTo(vx, vz - 10); g.lineTo(vx - 9, vz + 7); g.lineTo(vx + 9, vz + 7); g.closePath(); g.fill();
    g.fillStyle = "#6ff0b8"; g.beginPath(); g.moveTo(vx, vz - 6); g.lineTo(vx - 5.5, vz + 4.5); g.lineTo(vx + 5.5, vz + 4.5); g.closePath(); g.fill();
    if (tg || AUR.v > 0.38) {
      if (tg) { g.strokeStyle = "#6ff0b8"; g.lineWidth = 3.5; g.beginPath(); g.arc(vx, vz, 16, 0, 6.283); g.stroke(); }
      g.font = "500 15px 'Barlow Semi Condensed', sans-serif"; const w = g.measureText(v.name).width + 10;
      g.fillStyle = "rgba(13,24,34,.75)"; g.fillRect(vx - w / 2, vz + 11, w, 20); g.fillStyle = "#6ff0b8"; g.fillText(v.name, vx, vz + 26);
      g.font = "500 17px 'Barlow Semi Condensed', sans-serif";
    }
  }
  for (const p of TABLET.layerPts("schools")) {                  // licence schools you've signed up for, and a course's checkpoints
    const [qx, qz] = w2(p.x, p.z);
    if (p.kind === "cp") { g.fillStyle = "#0d1822"; g.beginPath(); g.arc(qx, qz, p.next ? 9 : 7, 0, 6.283); g.fill(); g.fillStyle = p.next ? "#ff8a3a" : "#7fc8e0"; g.beginPath(); g.arc(qx, qz, p.next ? 6 : 4.5, 0, 6.283); g.fill(); continue; }
    g.fillStyle = "#0d1822"; g.fillRect(qx - 8, qz - 8, 16, 16); g.fillStyle = p.col; g.fillRect(qx - 5, qz - 5, 10, 10);
    g.font = "500 15px 'Barlow Semi Condensed', sans-serif"; const w = g.measureText(p.name).width + 10;
    g.fillStyle = "rgba(13,24,34,.75)"; g.fillRect(qx - w / 2, qz + 12, w, 20); g.fillStyle = p.col; g.fillText(p.name, qx, qz + 27);
    g.font = "500 17px 'Barlow Semi Condensed', sans-serif";
  }
  if (GS.rescueJob) for (const v of RJ.vs) {
    if (v.freed) continue;
    const [vx, vz] = w2(v.x, v.z);
    g.fillStyle = "#0d1822"; g.beginPath(); g.arc(vx, vz, 10, 0, 6.283); g.fill(); g.fillStyle = "#ff3a1a"; g.beginPath(); g.arc(vx, vz, 6.5, 0, 6.283); g.fill();
    g.strokeStyle = "#ff3a1a"; g.lineWidth = 3; g.beginPath(); g.arc(vx, vz, 16 + Math.sin(performance.now() * 0.008) * 3, 0, 6.283); g.stroke();
    g.font = "500 15px 'Barlow Semi Condensed', sans-serif"; const nm = v.name + " · stuck", w = g.measureText(nm).width + 10;
    g.fillStyle = "rgba(13,24,34,.75)"; g.fillRect(vx - w / 2, vz + 14, w, 20); g.fillStyle = "#ff6a4a"; g.fillText(nm, vx, vz + 29);
    g.font = "500 17px 'Barlow Semi Condensed', sans-serif";
  }
  for (const p of sarPts()) {                    // a rescue case: the search area, the casualty, or where you're taking them
    const [vx, vz] = w2(p.x, p.z);
    if (p.area) { const [ex] = w2(p.x + p.area, p.z); g.strokeStyle = "#ff3a1a"; g.lineWidth = 2.5; g.setLineDash([8, 6]); g.beginPath(); g.arc(vx, vz, Math.max(10, Math.abs(ex - vx)), 0, 6.283); g.stroke(); g.setLineDash([]); }
    else { g.fillStyle = "#0d1822"; g.beginPath(); g.arc(vx, vz, 10, 0, 6.283); g.fill(); g.fillStyle = p.kind === "sarw" ? "#7fc8e0" : "#ff3a1a"; g.beginPath(); g.arc(vx, vz, 6.5, 0, 6.283); g.fill(); }
    g.font = "500 15px 'Barlow Semi Condensed', sans-serif"; const w = g.measureText(p.name).width + 10;
    g.fillStyle = "rgba(13,24,34,.75)"; g.fillRect(vx - w / 2, vz + 14, w, 20); g.fillStyle = "#ff6a4a"; g.fillText(p.name, vx, vz + 29);
    g.font = "500 17px 'Barlow Semi Condensed', sans-serif";
  }
  const [px, pz] = w2(P.x, P.z);
  g.save(); g.translate(px, pz); g.rotate(Math.PI - P.yaw);   // north-up map: the arrow itself turns
  g.fillStyle = "#0d1822"; g.beginPath(); g.moveTo(0, -20); g.lineTo(-13, 13); g.lineTo(13, 13); g.closePath(); g.fill();
  g.fillStyle = "#ff5a1f"; g.beginPath(); g.moveTo(0, -15); g.lineTo(-9, 9); g.lineTo(9, 9); g.closePath(); g.fill();
  g.restore();
  g.fillStyle = "rgba(234,242,248,.6)"; g.textAlign = "left";
  g.fillText("N", 14, 28); g.fillText(Math.round(WORLD / 1000 * 10) / 10 + " km across", 14, N - 14);
}
function markMap() {
  const px = (P.x + HALF) * M2SRC, pz = (P.z + HALF) * M2SRC;
  if (lastMark && Math.hypot(px - lastMark[0], pz - lastMark[1]) < 0.6) return;
  if (lastMark && P.gnd) { tctx.strokeStyle = "#ff5a1f"; tctx.lineWidth = 2.2; tctx.lineCap = "round"; tctx.beginPath(); tctx.moveTo(lastMark[0], lastMark[1]); tctx.lineTo(px, pz); tctx.stroke(); }
  lastMark = [px, pz];
}
/* ---------------- visuals / camera / hud ---------------- */
const camState = { yaw: SPAWN.yaw, init: false, fpYaw: SPAWN.yaw, fpPitch: 0, fpRoll: 0 };
const _camEye = new THREE.Vector3(), _camAim = new THREE.Vector3(), _camWant = new THREE.Vector3();
let hudT = 0, safeT = 0;
function angLerp(a, b, t) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; }
function updVisuals(dt) {
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), lx = fz, lz = -fx;
  const spd = Math.hypot(P.vx, P.vz);
  let pT, rT, gr = 0;
  if (P.gnd) {
    const hF = rideSurf(P.x + fx * 1.3, P.z + fz * 1.3), hR = rideSurf(P.x - fx * 1.2, P.z - fz * 1.2);
    const hL = rideSurf(P.x + lx * 0.6 + fx * 0.4, P.z + lz * 0.6 + fz * 0.4), hRt = rideSurf(P.x - lx * 0.6 + fx * 0.4, P.z - lz * 0.6 + fz * 0.4);
    pT = Math.atan2(hF - hR, 2.5) + (P.wet ? 0.07 + P.sink * 0.5 : 0) + input.thr * 0.05 * (1 - clamp(spd / 20, 0, 1)) + P.exc * 0.25;
    rT = Math.atan2(hL - hRt, 1.2); gr = (hF - hR) / 2.5;
  } else { pT = Math.atan2(P.vy, Math.max(spd, 1)) * 0.35 + P.airP; rT = P.airR; }
  const whT = P.wh * (0.52 + Math.sin(performance.now() * 0.0061) * 0.05 + Math.sin(performance.now() * 0.017) * 0.02);
  P.whVis += (whT - P.whVis) * (1 - Math.exp(-(whT > P.whVis ? 6 : 9) * dt));
  // going up a steep face: stand on the pegs and lift the nose, so you (and the camera) can see over the crest
  const cT = P.gnd && !P.wet && !FOOT.on && GS.fuel > 0 && !GS.dead ? sstep(0.16, 0.46, gr) * clamp((spd - 1.5) / 3, 0, 1) : 0;
  CLIMB.v += (cT - CLIMB.v) * (1 - Math.exp(-(cT > CLIMB.v ? 3.2 : 2.2) * dt));
  CLIMB.stand = CLIMB.v * RIDER.standH;
  const cl = CLIMB.v * 0.26;
  pT += P.whVis + cl + BOG.sink * 0.3;
  const k = 1 - Math.exp(-(P.gnd ? 12 : 3) * dt);
  P.pitch += (pT - P.pitch) * k; P.roll += (rT - P.roll) * k;
  const lean = input.steer * (0.1 + input.lean * 0.1) * clamp(spd / 15, 0, 1);
  sledRoot.position.set(P.x, P.y + 1.5 * Math.sin(Math.max(0, P.whVis + cl)) - BOG.sink, P.z);
  sledRoot.rotation.set(-P.pitch, P.yaw, P.roll);
  sledBody.rotation.z += (lean - sledBody.rotation.z) * (1 - Math.exp(-8 * dt));
  const skiT = -input.steer * 0.36, kS = 1 - Math.exp(-14 * dt);
  for (const pv of skiPivots) pv.rotation.y += (skiT - pv.rotation.y) * kS;
  barPivot.rotation.y += (skiT * 0.7 - barPivot.rotation.y) * kS;
  poseArms();
  if (V.beltTex) {
    const roll = (P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)) * dt / 0.42;
    V.beltTex.offset.y -= roll;
    if (V.wheelA) { V.wheelA.rotation.x -= roll * 3.2; V.wheelB.rotation.x -= roll * 3.6; }
  }
  { const hid = VIEWS[camMode].fp && !showroomOn(); if (hid !== V.headHid) { V.headHid = hid; applyLoadout(); } }
  sledBody.position.y = P.gnd ? Math.sin(performance.now() * 0.05) * 0.006 * clamp(spd / 10, 0, 1) : 0;
  towVisual(dt);
  // engine rpm
  const rpmT = clamp(0.14 + input.thr * 0.35 + spd / 34 * 0.55 + (input.thr && !P.gnd ? 0.3 : 0), 0, 1.15);
  P.rpm += (rpmT - P.rpm) * (1 - Math.exp(-4 * dt));
  // camera
  const view = FOOT.on && VIEWS[camMode].fp ? VIEWS[1] : VIEWS[camMode];
  const velYaw = spd > 3 ? Math.atan2(P.vx, P.vz) : P.yaw;
  const fishing = FISH && FISH.on;
  const FXp = fishing ? FISH.wx : FOOT.on ? FOOT.x : P.x, FYp = fishing ? FISH.wy : FOOT.on ? FOOT.y : P.y, FZp = fishing ? FISH.wz : FOOT.on ? FOOT.z : P.z;   // what the camera follows: the sled, or the rider on foot
  camState.yaw = angLerp(camState.yaw, FOOT.on ? FOOT.yaw : angLerp(P.yaw, velYaw, 0.35), 1 - Math.exp(-(FOOT.on ? 2.2 : 3.5) * dt));
  const cfx = Math.sin(camState.yaw), cfz = Math.cos(camState.yaw);
  let look = null;
  if (view.fp) {
    // rider's eye: follows the sled's position and yaw, but the horizon stays mostly level
    sledRoot.updateMatrixWorld();
    const eye = sledRoot.localToWorld(_camEye.set(0, 1.66 + CLIMB.stand * 0.7, -0.14));
    if (!camState.init) { camera.position.copy(eye); camState.fpYaw = P.yaw + Math.PI; camState.fpPitch = -0.13; camState.fpRoll = 0; camState.fpBob = 0; camState.fpEyeY = eye.y; camState.init = true; }
    // the head sits exactly where the rider's head is — no smoothing along the ground, or
    // speed drags the camera back into the seat. Only vertical jolts are cushioned.
    const dEy = eye.y - camState.fpEyeY; camState.fpEyeY = eye.y;
    camState.fpBob = clamp(camState.fpBob * Math.exp(-11 * dt) - dEy * 0.4, -0.22, 0.22);
    camera.position.copy(eye); camera.position.y += camState.fpBob;
    camera.position.y = Math.max(camera.position.y, rideSurf(camera.position.x, camera.position.z) + 0.45);
    const pT = P.pitch * 0.3 + clamp(P.vy * 0.02, -0.25, 0.25) - 0.13;
    const rT = -P.roll * 0.22 - sledBody.rotation.z * 0.4;
    camState.fpYaw = angLerp(camState.fpYaw, P.yaw + Math.PI, 1 - Math.exp(-14 * dt));   // a camera looks down its own -Z
    camState.fpPitch += (pT - camState.fpPitch) * (1 - Math.exp(-7 * dt));
    camState.fpRoll += (rT - camState.fpRoll) * (1 - Math.exp(-5 * dt));
    camera.rotation.set(camState.fpPitch, camState.fpYaw, camState.fpRoll);
    if (TABLET.e > 0.001 && TABLET.mode === "dash") tabCamFP();          // the dip onto the dash tablet
  } else {
    // towing: back the chase cam off so the rig behind you is in the shot
    camState.tow = (camState.tow || 0) + ((TOW.kind ? HITCH[TOW.kind].len + 1.4 : 0) - (camState.tow || 0)) * (1 - Math.exp(-2 * dt));
    const td = camState.tow * (view.d < 10 ? 1 : 0.35);
    const want = _camWant.set(FXp - cfx * (view.d + td), FYp + view.h + td * 0.4 + CLIMB.v * 1.1, FZp - cfz * (view.d + td));
    want.y = Math.max(want.y, rideSurf(want.x, want.z) + 1.3);
    if (!camState.init) { camera.position.copy(want); camState.init = true; }
    else camera.position.lerp(want, 1 - Math.exp(-6 * dt));
    camera.position.y = Math.max(camera.position.y, rideSurf(camera.position.x, camera.position.z) + 1.0);
    look = _camAim.set(FXp + cfx * (4 + CLIMB.v * 4), FYp + 1.1 + CLIMB.v * 1.6, FZp + cfz * (4 + CLIMB.v * 4));
  }
  P.shake *= Math.exp(-4 * dt);
  const sh = (P.shake * 0.35 + (P.gnd ? clamp(spd / 40, 0, 1) * 0.015 * (1 - P.pack) : 0)) * (view.fp ? 0.5 : 1);
  camera.position.x += (Math.random() - 0.5) * sh; camera.position.y += (Math.random() - 0.5) * sh;
  if (look) camera.lookAt(look);
  if (showroomOn()) {
    if (!SR.on) { SR.on = true; SR.a = P.yaw + 0.9; document.body.classList.add("showroom"); $("srHint").hidden = false; }
    if (!SR.drag) SR.a += dt * 0.28;
    // with something on the hitch, pull back and frame the whole rig
    const hk = HITCH[PV.cat === "hitch" ? PV.id : GS.own.parts.hitch], rigL = hk ? hitchBack(GS.own.parts.rack) + hk.len + 1.2 : 0;
    SR.rig = (SR.rig || 0) + (rigL - (SR.rig || 0)) * (1 - Math.exp(-4 * dt));
    const ox = P.x - Math.sin(P.yaw) * SR.rig * 0.5, oz = P.z - Math.cos(P.yaw) * SR.rig * 0.5;
    const r = 4.9 + SR.rig * 0.75, cx = ox + Math.sin(SR.a) * r, cz = oz + Math.cos(SR.a) * r;
    camera.position.set(cx, Math.max(P.y + 1.75 + SR.rig * 0.25, rideSurf(cx, cz) + 1.0), cz);
    let fx2 = ox - cx, fz2 = oz - cz; const fl = Math.hypot(fx2, fz2) || 1; fx2 /= fl; fz2 /= fl;
    const push = innerWidth >= 900 ? 1.7 + SR.rig * 0.25 : 0;           // panel sits on the right, so frame the sled left of centre
    camera.lookAt(ox - fz2 * push, P.y + 0.85, oz + fx2 * push);
    if (Math.abs(camera.fov - 50) > 0.05) { camera.fov = 50; camera.updateProjectionMatrix(); }
  } else if (SR.on) { SR.on = false; camState.init = false; document.body.classList.remove("showroom"); $("srHint").hidden = true; PV.sled = PV.cat = PV.slot = null; applyLoadout(); }
  const fov = view.f + Math.min(16, spd * 0.4), dip = TABLET.e > 0.001 && TABLET.mode === "dash" && view.fp;
  // the base lens eases with speed as before; dipping to the tablet narrows it so the screen fills the view
  let fb = dip && camState.fovB !== undefined ? camState.fovB : camera.fov;
  if (Math.abs(fb - fov) > 0.05) fb += (fov - fb) * (1 - Math.exp(-3 * dt));
  camState.fovB = fb;
  const fw = dip ? lerp(fb, TABLET.fovT, TABLET.e) : fb;
  if (Math.abs(camera.fov - fw) > 0.01) { camera.fov = fw; camera.updateProjectionMatrix(); }
  if (!started || TCAM.launch) titleCam(dt);
  sky.position.copy(camera.position);
  sun.position.set(FXp + sunDir.x * 200, FYp + sunDir.y * 200, FZp + sunDir.z * 200); sun.target.position.set(FXp, FYp, FZp);
  // recenter the fine snow patch
  const pcx = (pox + PHALF) * CELL - HALF, pcz = (poz + PHALF) * CELL - HALF;
  if (Math.abs(FXp - pcx) > 10 || Math.abs(FZp - pcz) > 10) recenter(FXp, FZp, false);
  // stuck/flip hint + safe spot
  if (started) {
    const tipped = Math.abs(P.roll) > 0.9 || Math.abs(P.pitch) > 1.0;
    P.stuckT = (tipped || (input.thr > 0 && spd < 0.6)) ? P.stuckT + dt : 0;
    $("flip").hidden = P.stuckT < 2.5 || BOG.on || FOOT.on || HELP.on;
    safeT += dt;
    if (safeT > 2 && P.gnd && !P.wet && !isWater(P.x, P.z) && !P.thin && spd > 3 && !tipped) { P.safe = { x: P.x - fx * 4, z: P.z - fz * 4, yaw: P.yaw }; safeT = 0; }
  }
  return spd;
}
function updHud(spd) {
  $("spd").textContent = Math.round(spd * 2.237);
  const stt = P.wet ? "WATER" : P.thin > 0 ? "THIN ICE" : P.ice ? "ICE" : P.bare > 0.5 ? "BARE" : P.slush > 0.35 ? "SLUSH" : (P.pack > 0.62 ? "PACKED" : "POWDER");
  const pill = $("pill"); if (pill.dataset.s !== stt) { pill.dataset.s = stt; pill.textContent = stt; }
  $("bonus").textContent = P.wet ? (P.sink > 0.08 ? "Sinking! Pin it!" : "Skipping water") : stt === "THIN ICE" ? (MELT.crack > 0.3 ? "It's cracking! Go!" : "Keep moving") : stt === "BARE" ? "Scraping rock" : stt === "SLUSH" ? "Heavy slush" : P.rut > 0.5 && P.pack > 0.5 && P.wh < 0.5 ? "In the groove" : P.wh > 0.7 ? "Wheelie " + Math.round(P.whRun) + " m" + (P.whBest > 5 ? " · best " + Math.round(P.whBest) : "") : P.dumped > 0 ? "Snow dump!" : stt === "PACKED" ? "On your tracks" : (stt === "ICE" ? "Low grip" : (P.exc > 0.2 ? "Breaking trail" : ""));
  $("dragFill").style.width = clamp((P.drag + TOW.drag) / 2600 * 100, 0, 100) + "%";
  $("dragN").textContent = Math.round(P.drag + TOW.drag) + " N";
  const b = bioAt(P.x, P.z), h = groundAt(P.x, P.z);
  $("zoneName").textContent = b === 3 ? "OPEN WATER" : b === 1 ? "FROZEN LAKE" : (h > 120 ? "HIGH COUNTRY" : (b === 2 ? "BOREAL FOREST" : "OPEN BACKCOUNTRY"));
  $("elev").textContent = "Elev " + Math.round(h * 3 + 180) + " m";
  $("dist").textContent = (P.dist / 1000).toFixed(1) + " km";
}

/* ---------------- courier survival layer ---------------- */
const GAMEHOUR = 50;                       // real seconds per in-game hour (a full day is 20 minutes)
const GS = {
  cash: 0, fuel: 18, cap: 18, warmth: 100, hour: 9.6, load: [], jobs: [], claims: [], mail: [], mailT: {}, mailSeq: 0, delivered: 0, rescues: 0, rescueJob: null, apps: {}, lic: {}, signed: {}, sdone: {},
  storm: 0, stormT: 170, stormPhase: "calm", warned: false, garageOpen: false, dead: false, near: null, own: null, kitWarned: false,
  outWarned: false, coldWarned: false, lowWarned: false, smokeT: 0, fadeT: 0
};
const GOD = { fuel: false, warm: false, turbo: false, lowg: false, freeze: false };

/* ---------------- calendar, aurora and weather (winter systems update, phase 1) ----------------
   One game day is 20 real minutes. GS.hour is still the running game-hour counter (09:36 on day one is
   9.6), so GS.hour % 24 is always the time of day and everything keyed off it (the steamer, the classifieds,
   job deadlines) keeps working. The calendar date is 1 November 2026 + GS.hour + CAL.off: the summer skip
   adds whole days to CAL.off instead of touching the clock. Dates are real (weekdays, leap years); the
   clock is local solar time, so noon is when the sun is highest. */
const CAL_EPOCH = Date.UTC(2026, 10, 1), CAL_LAT = 70.9;
const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SEASONS = {
  early: { id: "early", name: "Early winter" }, deep: { id: "deep", name: "Polar night" }, late: { id: "late", name: "Late winter" },
  spring: { id: "spring", name: "Spring" }, melt: { id: "melt", name: "Melt" }, summer: { id: "summer", name: "Summer" }
};
const CAL = {
  off: 0, lastDay: null, cbs: [], dc: null, skipping: false,
  abs(H = GS.hour) { return H + this.off; },                       // calendar hours since 1 Nov 2026 00:00
  dayIndex(H = GS.hour) { return Math.floor(this.abs(H) / 24); },
  // the date part, cached per calendar day: this is called a few times a frame
  day(D = this.dayIndex()) {
    const M = this.dc || (this.dc = new Map()), c = M.get(D); if (c) return c;
    const dt = new Date(CAL_EPOCH + D * 864e5), y = dt.getUTCFullYear(), m = dt.getUTCMonth(), d = dt.getUTCDate();
    const doy = (Date.UTC(y, m, d) - Date.UTC(y, 0, 1)) / 864e5;
    if (M.size > 64) M.clear();
    const o = { D, y, m, d, dow: dt.getUTCDay(), doy }; M.set(D, o); return o;
  },
  now(H = GS.hour) { const c = this.day(this.dayIndex(H)), h = ((H % 24) + 24) % 24; return { y: c.y, m: c.m, d: c.d, dow: c.dow, doy: c.doy, day: c.D, h, time: fmtTime(h), label: `${DOW3[c.dow]} ${c.d} ${MON3[c.m]}`, long: `${DOW3[c.dow]} ${c.d} ${MONTHS[c.m]} ${c.y}` }; },
  // solar declination (radians) for the date and time
  dec(H = GS.hour) { const c = this.day(this.dayIndex(H)), f = (((H % 24) + 24) % 24) / 24; return -23.44 / R2D * Math.cos(2 * Math.PI * (c.doy + f + 10) / 365.24); },
  noonEl(H = GS.hour) { return 90 - CAL_LAT + this.dec(Math.floor(H / 24) * 24 + 12) * R2D; },
  midnightEl(H = GS.hour) { return CAL_LAT - 90 - this.dec(Math.floor(H / 24) * 24) * R2D; },
  // no sunrise at all today (the sun's centre stays below the refracted horizon at noon): ~21 Nov - 21 Jan
  isPolarNight(H = GS.hour) { return this.noonEl(H) < -0.83; },
  isMidnightSun(H = GS.hour) { return this.midnightEl(H) > -0.83; },
  sunTimes(H = GS.hour) {
    const d = this.dec(Math.floor(H / 24) * 24 + 12), L = CAL_LAT / R2D;
    const ch = (Math.sin(-0.83 / R2D) - Math.sin(L) * Math.sin(d)) / (Math.cos(L) * Math.cos(d));
    if (ch >= 1) return { polar: true }; if (ch <= -1) return { midnight: true };
    const h0 = Math.acos(ch) * 12 / Math.PI; return { up: 12 - h0, down: 12 + h0, len: 2 * h0 };
  },
  season(H = GS.hour) {
    const m = this.day(this.dayIndex(H)).m;
    if (m >= 5 && m <= 9) return SEASONS.summer;
    if (this.isPolarNight(H)) return SEASONS.deep;
    return m === 10 || m === 11 ? SEASONS.early : m <= 2 ? SEASONS.late : m === 3 ? SEASONS.spring : SEASONS.melt;
  },
  onDayChange(cb) { this.cbs.push(cb); return cb; },
  // called every frame from updGame: fires the day-change hooks and runs the summer skip
  tick() {
    const D = this.dayIndex();
    if (this.lastDay === null) { this.lastDay = D; return; }
    if (D === this.lastDay) return;
    const prev = this.lastDay; this.lastDay = D;
    const n = this.now();
    if (n.m >= 5 && n.m <= 9 && !this.skipping) { this.summerSkip(); return; }
    for (const cb of this.cbs) { try { cb(n, prev); } catch (e) { console.error(e); } }
  },
  // Jun-Oct: the summer skip (O7). Jumps the calendar to the next 1 November at the same time of day, settles the
  // summer's bills, refreezes the world and plays the montage. Everything you own is kept.
  summerSkip() {
    const c = this.day(), from = Date.UTC(c.y, c.m, c.d), to = Date.UTC(c.y, 10, 1), days = Math.round((to - from) / 864e5);
    this.skipping = true;
    this.off += days * 24; this.lastDay = this.dayIndex(); this.skipping = false;
    seasonTurn(c, days);
    const n = this.now();
    for (const cb of this.cbs) { try { cb(n, null); } catch (e) { console.error(e); } }
    save();
  },
  // god menu: jump to a date in this season (keeps the time of day)
  jumpTo(m, d) {
    const c = this.day(), sy = c.m >= 10 ? c.y : c.y - 1, ty = m >= 10 ? sy : sy + 1;
    const Dt = Math.round((Date.UTC(ty, m, d) - CAL_EPOCH) / 864e5);
    this.off += (Dt - c.D) * 24; this.lastDay = null; this.tick(); this.lastDay = this.dayIndex() - 1; this.tick();
  }
};
const payMul = () => CAL.isPolarNight() ? 1.5 : 1;
/* ---------------- the spring melt and the summer skip (winter update O7) ----------------
   No endgame: the melt is part of the yearly loop. Everything here is a pure function of the date, so nothing new
   is saved and a reload lands in the same spring.
   - MELT.k runs 0 -> 1 from 9 April to 31 May. meltG (8 m, built at boot) holds when each spot melts out: early on
     south-facing slopes, along the shore and low down, late in deep drifts and up on the high fell, with noise.
     Snow depth anywhere = winter depth x meltMul(): a general settling, then gone where k passes the threshold.
   - MELT.wet is the slush: it builds through April and swings with the sun, crust in the morning, slush by afternoon.
   - Terrain only changes in steps (kq, 1/200 of the melt, about every 6 game hours). A step rescales the chunks you've
     ridden (their unmelted snow is kept in c.b), refills the snow patch a slice of rows at a time and re-runs the
     route finder in slices, inside a per-frame time budget, so a phone never sees a hitch. The far terrain melts in
     its shader from the same numbers.
   - Lakes open from the shore in (low lakes first). Open cells drop LAKE_DROP under a water plane and ride by the
     same skip/sink rules as the fjord, at the lake's own level. A band of thin ice ahead of the open water cracks
     under a slow sled and gives way.
   - The summer skip at the end of May: a montage card, bills (SEASON.bills, for O6's depots) and the refreeze. */
const MTN = (GN - 1) / 2 + 1, MTR = GRES * 2;                       // melt-out threshold grid: 8 m, same as the far terrain
const meltG = new Uint8Array(MTN * MTN);                            // threshold x 200
const LAKE_DROP = 2.6, LAKE_THIN = 0.11, MELT_START = 8, MELT_LEN = 53;   // days after 1 April
const LKS = [];                                                     // per lake: opening state, cells, water plane
const MELT = { grid: false, gridG: null, k: 0, kq: 0, wet: 0, spr: 0, thin: 1, sy: null, dApr: 0, sweep: null, moved: false, holes: new Set(), crack: 0, crackT: 0,
  route: {}, ov: null, ovOn: false, said: {}, visT: 0 };

// the melt-out thresholds: built a slice a frame in late March (or all at once at boot if it's already spring), so a
// winter boot doesn't pay for them. Then the far terrain's copy goes up to the GPU in slices too.
function* meltGridG(slice) {
  for (let j = 0; j < MTN; j++) {
    const z = j * MTR - HALF, gj = j * 2, j0 = Math.max(0, gj - 2), j1 = Math.min(GN - 1, gj + 2);
    for (let i = 0; i < MTN; i++) {
      const x = i * MTR - HALF, gi = i * 2, k = gj * GN + gi, o = j * MTN + i;
      if (bio[k] === 3) { meltG[o] = 0; continue; }
      const i0 = Math.max(0, gi - 2), i1 = Math.min(GN - 1, gi + 2), h = ground[k];
      const gx = (ground[gj * GN + i1] - ground[gj * GN + i0]) / ((i1 - i0) * GRES), gz = (ground[j1 * GN + gi] - ground[j0 * GN + gi]) / ((j1 - j0) * GRES);
      const sl = Math.hypot(gx, gz), south = clamp(-gz / (sl + 0.02), -1, 1) * sstep(0.04, 0.3, sl);   // north is -z, so a south face drops toward +z
      const coast = 1 - sstep(0.02, 0.2, landAt(x, z)), low = 1 - sstep(12, 110, h);
      const T = 0.52 + 0.26 * sstep(0.3, 1.0, freshG[k]) - 0.24 * south - 0.2 * coast - 0.1 * low + 0.24 * sstep(170, 420, h)
        + (fbm(x / 150 + 31, z / 150 - 12, 2) - 0.5) * 0.6 + (vn(x / 40 + 7, z / 40) - 0.5) * 0.12;
      meltG[o] = Math.round(clamp(T, 0.17, 1.27) * 200);
    }
    if (slice && (j & 7) === 7) yield;
  }
  const at = far && far.geometry.attributes.aMeltT;
  if (at) {
    const a = at.array, N = a.length, step = 131072;
    for (let o = 0; o < N; o += step) {
      const e = Math.min(N, o + step);
      for (let v = o; v < e; v++) if (a[v] >= 0) a[v] = meltG[v] / 200;
      if (slice) { at.updateRange.offset = o; at.updateRange.count = e - o; at.needsUpdate = true; yield 1; }   // 1: one upload range per frame
    }
    if (!slice) { at.updateRange.count = -1; at.needsUpdate = true; }
  }
  MELT.grid = true;
}
function meltBuild() {
  for (let li = 0; li < LAKES.length; li++) {
    const L = LAKES[li]; LKS[li] = null; if (!L.ok) continue;
    const R = L.r * 1.3, cells = [];
    const a0 = clamp(Math.floor((L.x - R + HALF) / GRES), 0, GN - 1), a1 = clamp(Math.ceil((L.x + R + HALF) / GRES), 0, GN - 1);
    const b0 = clamp(Math.floor((L.z - R + HALF) / GRES), 0, GN - 1), b1 = clamp(Math.ceil((L.z + R + HALF) / GRES), 0, GN - 1);
    for (let gj = b0; gj <= b1; gj++) for (let gi = a0; gi <= a1; gi++) { const k = gj * GN + gi; if (lakeId[k] === li + 1) cells.push(k); }
    if (!cells.length) continue;
    const cnt = new Int32Array(257); for (const k of cells) cnt[255 - lakeT[k] + 1]++;   // shore first: a counting sort on lakeT
    for (let q = 1; q < 257; q++) cnt[q] += cnt[q - 1];
    const srt = new Int32Array(cells.length); for (const k of cells) srt[cnt[255 - lakeT[k]]++] = k;
    let near = depot, nd = 1e9; for (const s of SITES) if (s.x !== undefined && s.type !== "shop") { const d = Math.hypot(s.x - L.x, s.z - L.z); if (d < nd) { nd = d; near = s; } }
    LKS[li] = { L, li, W: L.lv - 0.1, R, k0: 0.3 + 0.32 * sstep(40, 380, L.lv) + (hash(li, 91) - 0.5) * 0.1, o: 0, n: 0, thr: 999, thrN: 9, thinN: 9,
      cells: srt, name: "the lake above " + near.name.replace(/ (herder cabin|wind farm|lighthouse|quay)$/, ""), mesh: null, u: null, tex: null, holes: false };
  }
}
// a flat sheet of water per lake, discarded wherever the lake is still frozen (a per-lake map of how far out from the
// middle each spot is, against the lake's opening line)
function buildLakeWater() {
  const N = 64;
  for (const L of LKS) {
    if (!L) continue;
    const data = new Uint8Array(N * N);
    L.tex = new THREE.DataTexture(data, N, N, THREE.LuminanceFormat, THREE.UnsignedByteType);
    L.tex.magFilter = L.tex.minFilter = THREE.LinearFilter; L.tex.generateMipmaps = false;
    lakeTexFill(L);
    L.u = { uTn: { value: L.tex }, uThr: { value: 9 }, uOrg: { value: new THREE.Vector3(L.L.x - L.R, L.L.z - L.R, 2 * L.R) }, uTime: seaU.uTime };
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a3442, roughness: 0.16, metalness: 0.3 });
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, L.u);
      sh.vertexShader = "varying vec2 vLw;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vLw = (modelMatrix * vec4(position, 1.0)).xz;");
      sh.fragmentShader = "uniform sampler2D uTn; uniform float uThr; uniform vec3 uOrg; uniform float uTime; varying vec2 vLw;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
        float tn = texture2D(uTn, (vLw - uOrg.xy) / uOrg.z).r;
        if (tn < uThr) discard;
        float rp = sin(vLw.x * 0.9 + uTime * 1.1) * sin(vLw.y * 0.7 - uTime * 0.8);
        diffuseColor.rgb *= 0.92 + 0.12 * rp + 0.25 * smoothstep(uThr, uThr + 0.04, tn) * (1.0 - smoothstep(uThr + 0.04, uThr + 0.1, tn));`);
    };
    const geo = new THREE.PlaneGeometry(2 * L.R, 2 * L.R, 1, 1); geo.rotateX(-Math.PI / 2);
    L.mesh = new THREE.Mesh(geo, mat); L.mesh.position.set(L.L.x, L.W, L.L.z); L.mesh.receiveShadow = true; L.mesh.visible = false;
    scene.add(L.mesh);
  }
}
function lakeTexFill(L) {
  const N = 64, data = L.tex.image.data, id = L.li + 1;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = L.L.x - L.R + (i + 0.5) / N * 2 * L.R, z = L.L.z - L.R + (j + 0.5) / N * 2 * L.R;
    const gi = clamp(Math.round((x + HALF) / GRES), 0, GN - 1), gj = clamp(Math.round((z + HALF) / GRES), 0, GN - 1), k = gj * GN + gi;
    data[j * N + i] = lakeId[k] === id ? lakeT[k] : 0;
  }
  L.tex.needsUpdate = true;
}
// how much of the winter's snow is left here, 0..1 (open water: none)
function meltMul(x, z) {
  const kq = MELT.kq; if (kq <= 0) return 1;
  const ci = clamp(Math.round((x + HALF) / GRES), 0, GN - 1), cj = clamp(Math.round((z + HALF) / GRES), 0, GN - 1), ck = cj * GN + ci;
  if (bio[ck] === 1) { const L = LKS[lakeId[ck] - 1]; if (L && (lakeT[ck] > L.thr || (MELT.holes.size && MELT.holes.has(ck)))) return 0; }
  const gx = clamp((x + HALF) / MTR, 0, MTN - 1.001), gz = clamp((z + HALF) / MTR, 0, MTN - 1.001);
  const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz, o = iz * MTN + ix;
  const a = meltG[o], b = meltG[o + 1], c = meltG[o + MTN], d = meltG[o + MTN + 1];
  const t = ((a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz) / 200 - kq) / 0.16;
  return t >= 1 ? MELT.thin : t <= 0 ? 0 : MELT.thin * t * t * (3 - 2 * t);
}
// lake ice the melt is eating, 0..1 (0 = sound ice, or not a lake, or already open water)
function iceThin(x, z) {
  if (MELT.kq <= 0) return 0;
  const i = clamp(Math.round((x + HALF) / GRES), 0, GN - 1), j = clamp(Math.round((z + HALF) / GRES), 0, GN - 1), k = j * GN + i;
  const L = LKS[lakeId[k] - 1]; if (!L || L.thinN > 1) return 0;
  const t = lakeT[k]; if (t > L.thr) return 0;
  return clamp((t / 255 - L.thinN) / (LAKE_THIN * 0.5), 0, 1);
}
const meltDay = () => CAL.abs() / 24;
function meltSeason() {
  const c = CAL.day(), sy = c.m >= 10 ? c.y : c.y - 1;
  if (MELT.sy !== sy) { MELT.sy = sy; MELT.dApr = Math.round((Date.UTC(sy + 1, 3, 1) - CAL_EPOCH) / 864e5); }
}
// every frame: the slush, and a terrain step when the melt has moved on
function meltTick(dt) {
  meltSeason();
  const day = meltDay(), se = CAL.season().id, k = se === "summer" ? 1 : clamp((day - MELT.dApr - MELT_START) / MELT_LEN, 0, 1);
  MELT.k = k;
  const h = ((GS.hour % 24) + 24) % 24, sunny = 0.5 + 0.5 * Math.sin((h - 9) / 24 * 2 * Math.PI);   // warmest about 15:00, a crust by 03:00
  const thaw = se === "summer" ? 1 : sstep(MELT.dApr, MELT.dApr + 22, day);
  MELT.wet = thaw * lerp(0.3 + 0.7 * sunny, 1, sstep(0.55, 0.9, k)) * (1 - 0.6 * GS.storm);
  MELT.spr = sstep(0, 0.03, k);
  meltU.uWet.value = MELT.wet; meltU.uSpr.value = MELT.spr;
  let kq = Math.floor(k * 200) / 200;
  if (!MELT.grid) {                                                   // late March: build the thresholds, a slice a frame
    if (day > MELT.dApr - 6 || kq > 0) {
      if (!MELT.gridG) MELT.gridG = meltGridG(true);
      const t0 = performance.now(), budget = GFX.low ? 2 : 3.5;
      do { const r = MELT.gridG.next(); if (r.done) { MELT.gridG = null; break; } if (r.value === 1) break; } while (performance.now() - t0 < budget);
    }
    if (!MELT.grid) kq = 0;
  }
  if (kq !== MELT.kq) meltStep(kq);
  if (MELT.sweep) {
    const t0 = performance.now(), budget = GFX.low ? 2 : 3.5;
    do { if (MELT.sweep.next().done) { MELT.sweep = null; break; } } while (performance.now() - t0 < budget);
  }
  MELT.visT -= dt;
  if (MELT.visT <= 0) {
    MELT.visT = 0.5;
    const cx = camera.position.x, cz = camera.position.z;
    for (const L of LKS) if (L && L.mesh) L.mesh.visible = (L.thrN < 1.5 || L.holes) && Math.hypot(cx - L.L.x, cz - L.L.z) < GFX.farR + L.R;
  }
}
function meltStep(kq) {
  const back = kq < MELT.kq;
  MELT.kq = kq; MELT.thin = 1 - 0.3 * sstep(0, 0.6, kq);
  meltU.uMeltK.value = kq; meltU.uThin.value = MELT.thin;
  if (kq <= 0 && MELT.holes.size) {                                   // the refreeze (or the god menu going back): fill the holes in
    for (const k of MELT.holes) ground[k] += LAKE_DROP;
    MELT.holes.clear(); for (const L of LKS) if (L && L.holes) { L.holes = false; lakeTexFill(L); }
  }
  let thinNow = null, openNow = null;
  LKS.forEach((L, i) => {
    if (!L) return;
    const o = kq > 0 ? sstep(L.k0, L.k0 + 0.45, kq) : 0, pre = sstep(L.k0 - 0.08, L.k0, kq);
    L.o = o; L.thrN = o > 0 ? 1 - o : 9; L.thr = o > 0 ? Math.floor((1 - o) * 255) : 999;
    L.thinN = kq > 0 && pre > 0 ? 1 - o - LAKE_THIN * pre : 9;
    meltU.uLakeThr.value[i] = L.thrN;
    if (L.u) L.u.uThr.value = L.thrN - 0.012;
    // open (or, going back, close) the shore cells past the line: they drop under the water
    while (L.n < L.cells.length && lakeT[L.cells[L.n]] > L.thr) { const k = L.cells[L.n++]; if (MELT.holes.has(k)) MELT.holes.delete(k); else ground[k] -= LAKE_DROP; }
    while (L.n > 0 && lakeT[L.cells[L.n - 1]] <= L.thr) ground[L.cells[--L.n]] += LAKE_DROP;
    if (L.thinN < 1 && !MELT.said["thin" + i]) { MELT.said["thin" + i] = true; thinNow = thinNow || L; }
    if (L.o > 0 && !MELT.said["open" + i]) { MELT.said["open" + i] = true; openNow = openNow || L; }
  });
  if (kq <= 0) { MELT.route = {}; if (CT.rm0) CT.rm.set(CT.rm0); MELT.ovOn = false; MELT.said = {}; }
  if (started && !back && kq > 0) {
    if (!MELT.said.bare) { MELT.said.bare = true; toast("First bare ground: the south-facing slopes and the shore are melting out. Sleds don't like rock.", "warn"); }
    else if (openNow) toast(`Open water at the edge of ${openNow.name}. Skip it flat out or go round.`, "warn");
    else if (thinNow) toast(`The ice on ${thinNow.name} has gone dark at the edges. Thin ice: keep off it, or keep moving.`, "warn");
  }
  MELT.sweep = meltSweep(kq);
}
// the slow part of a step, run a slice per frame inside meltTick's time budget
function* meltSweep(kq) {
  for (let i = 0; i < activeChunks.length; i++) { const c = activeChunks[i]; if (c && c.mk !== kq) { rescaleChunk(c); yield; } }
  for (let r = 0; r < S;) { if (MELT.moved) { MELT.moved = false; r = 0; } patchRows(r, Math.min(S, r + 6)); r += 6; yield; }
  if (!CT.ready) return;
  // the route grid: open water is impassable, melted-out ground is hard going
  if (!CT.rm0) CT.rm0 = CT.rm.slice();
  const n = CT.RN, rk = (GN - 1) / (n - 1);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const v = j * n + i, m0 = CT.rm0[v]; if (!m0 || kq <= 0) { CT.rm[v] = m0; continue; }
      const g = j * rk * GN + i * rk, x = i * rk * GRES - HALF, z = j * rk * GRES - HALF;
      const m = meltMul(x, z), base = freshG[g];
      CT.rm[v] = bio[g] === 1 && m === 0 ? 0 : base >= 0.12 && base * m < 0.07 ? m0 * 3.5 : m < 0.5 ? m0 * 1.4 : m0;
    }
    if ((j & 7) === 7) yield;
  }
  if (kq <= 0) return;
  yield* ctRoutesG(true);
  meltRoutes();
  yield;
  yield* meltOverlay();
}
function rescaleChunk(c) {
  for (let k = 0; k < CH * CH; k++) {
    const ix = c.cx * CH + (k & 31), iz = c.cz * CH + (k >> 5), b = c.b[k];
    const fNew = b > 0 ? b * meltMul(ix * CELL - HALF, iz * CELL - HALF) : 0, fOld = c.f[k];
    if (fNew === fOld) continue;
    const d0 = c.d[k], d = fOld > 1e-4 ? d0 * fNew / fOld : fNew;   // tracks and berms keep their shape as the snow under them goes
    c.f[k] = fNew; c.d[k] = d; writeCell(ix, iz, d0, d, fNew);
  }
  c.mk = MELT.kq;
}
function patchRows(r0, r1) {
  if (pox < -9000) return;
  for (let j = r0; j < r1; j++) for (let i = 0; i < S; i++) fillCell(pdata, i, j, pox + i, poz + j);
  snowDirty = true; if (r0 < snowJ0) snowJ0 = r0; if (r1 - 1 > snowJ1) snowJ1 = r1 - 1;
}
// each place's line from the quay: open, melting (bare stretches, pays a little extra), or closed until it freezes
const ROUTE_WORD = { open: "OPEN", melting: "MELTING", closed: "CLOSED" };
function routeStat(s) {
  const r = CT.routes[s.id]; if (!r) return "open";
  if (r.unreach) return "closed";
  let n = 0, bare = 0;
  const P0 = r.P;
  for (let i = 1; i < P0.length; i++) {
    const [ax, az] = P0[i - 1], [bx, bz] = P0[i], L = Math.hypot(bx - ax, bz - az), m = Math.max(1, Math.round(L / 40));
    for (let q = 0; q < m; q++) {
      const t = q / m, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      if (Math.hypot(x - depot.x, z - depot.z) < 260 || Math.hypot(x - s.x, z - s.z) < 260) continue;   // the streets of town are always slush
      if (bioAt(x, z) === 1 && isWater(x, z)) { n++; bare++; continue; }
      const base = sampleG(freshG, x, z); if (base < 0.12) continue;
      n++; if (base * meltMul(x, z) < 0.07) bare++;
    }
  }
  const f = n ? bare / n : 0;
  return f > 0.3 ? "closed" : f > 0.1 ? "melting" : "open";
}
function meltRoutes() {
  const closed = [], melting = [];
  for (const s of SITES) {
    if (s.type === "depot" || s.type === "shop" || s.x === undefined) continue;
    const was = MELT.route[s.id] || "open"; let st = routeStat(s);
    if (was === "closed") st = "closed";                               // once a trail's gone, it's gone till the freeze
    MELT.route[s.id] = st;
    if (st !== was) (st === "closed" ? closed : melting).push(s);
  }
  if (!started) return;
  const nm = a => { const v = a.filter(s => s.type !== "home").map(s => shortName(s)); return v.length > 2 ? v.slice(0, -1).join(", ") + " and " + v[v.length - 1] : v.join(" and "); };
  if (closed.length) {
    const t = nm(closed);
    toast(t ? `The ${t} trail${closed.filter(s => s.type !== "home").length > 1 ? "s have" : " has"} melted out. No work out there till it freezes.` : "Some of the round-town runs have melted out.", "warn");
    const drop = j => !j.claimed && MELT.route[j.dest.id] === "closed";
    if (GS.jobs && GS.jobs.some(drop)) { GS.jobs = GS.jobs.filter(j => !drop(j)); TABLET.refresh(); }
  } else if (melting.length && !MELT.said.melting) { MELT.said.melting = true; toast(`The trail to ${shortName(melting[0])} is melting out in places. It pays a little extra while it lasts.`); }
  if (!MELT.said.lastweek && MELT.k > 0.87) { MELT.said.lastweek = true; toast("Not long left. At the end of May the sled goes in the shed for the summer.", undefined); }
}
const routeOf = s => (s && MELT.kq > 0 && MELT.route[s.id]) || "open";
const siteOpen = s => routeOf(s) !== "closed";
const meltWork = () => MELT.kq > 0 ? 1 - 0.5 * sstep(0.15, 0.95, MELT.k) : 1;     // how much work there is, 1 in winter down to half
const slushPay = d => routeOf(d) === "melting" ? 1.15 : 1;                           // a melting trail pays a little extra while it lasts
// the Map app and the minimap: bare ground and open lakes over the chart (512 px across the map)
function* meltOverlay() {
  const N = 512, cv = MELT.ov || (MELT.ov = Object.assign(document.createElement("canvas"), { width: N, height: N })), g = cv.getContext("2d");
  const img = MELT.ovImg || (MELT.ovImg = g.createImageData(N, N)), D = img.data, st = WORLD / N;
  for (let j = 0; j < N; j++) {
    const z = (j + 0.5) * st - HALF;
    for (let i = 0; i < N; i++) {
      const x = (i + 0.5) * st - HALF, o = (j * N + i) * 4, b = bioAt(x, z);
      let r = 0, gg = 0, bl = 0, a = 0;
      if (b === 1 && isWater(x, z)) { r = 40; gg = 86; bl = 118; a = 220; }
      else if (b !== 3) {
        const base = sampleG(freshG, x, z), m = meltMul(x, z);
        if (base * m < 0.07 && base >= 0.05) { r = 122; gg = 98; bl = 66; a = 150; }
        else if (m < 0.5) { r = 150; gg = 132; bl = 106; a = 60; }
      }
      D[o] = r; D[o + 1] = gg; D[o + 2] = bl; D[o + 3] = a;
    }
    if ((j & 7) === 7) yield;
  }
  g.putImageData(img, 0, 0); MELT.ovOn = true;
}
// thin ice: a slow sled cracks it (heavier rigs faster), and enough cracking breaks it under you
function thinIceStep(dt, spd, M, fx, fz) {
  const rate = spd < 13 ? (1.4 - spd / 11) * (M / 320) * (0.5 + 0.5 * P.thin) : -0.7;
  MELT.crack = Math.max(0, MELT.crack + rate * dt);
  if (rate > 0) {
    MELT.crackT -= dt;
    if (MELT.crackT <= 0) {
      MELT.crackT = 0.25 + Math.random() * 0.45 * (1.2 - MELT.crack);
      iceCrackSnd(0.4 + MELT.crack * 0.6);
      for (let k = 0; k < 5; k++) emit(P.x + (Math.random() - 0.5) * 2.4, P.y + 0.04, P.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, 0.6 + Math.random(), (Math.random() - 0.5) * 2, 0.6, 0.5);
    }
    if (!MELT.said.crack) { MELT.said.crack = true; toast("The ice is cracking! Keep moving, or get off it.", "bad"); }
  }
  if (MELT.crack >= 1) { MELT.crack = 0; iceBreak(P.x, P.z); }
}
function iceBreak(x, z) {
  const ci = Math.round((x + HALF) / GRES), cj = Math.round((z + HALF) / GRES);
  for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
    if (di * di + dj * dj > 5) continue;
    const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= GN || j >= GN) continue;
    const k = j * GN + i, L = LKS[lakeId[k] - 1];
    if (bio[k] !== 1 || !L || lakeT[k] > L.thr || MELT.holes.has(k)) continue;
    ground[k] -= LAKE_DROP; MELT.holes.add(k); L.holes = true;
    const N = 64, ti = Math.round((i * GRES - HALF - (L.L.x - L.R)) / (2 * L.R) * N - 0.5), tj = Math.round((j * GRES - HALF - (L.L.z - L.R)) / (2 * L.R) * N - 0.5);
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const u = ti + a, v = tj + b; if (u >= 0 && v >= 0 && u < N && v < N) L.tex.image.data[v * N + u] = 255; }
    L.tex.needsUpdate = true; if (L.mesh) L.mesh.visible = true;
  }
  // the snow and the patch over the hole
  const R = 12;
  for (let cz = Math.floor((z - R + HALF) / (CH * CELL)); cz <= Math.floor((z + R + HALF) / (CH * CELL)); cz++)
    for (let cx = Math.floor((x - R + HALF) / (CH * CELL)); cx <= Math.floor((x + R + HALF) / (CH * CELL)); cx++) { const c = chunks[cz * CPR + cx]; if (c) rescaleChunk(c); }
  const r0 = clamp(Math.floor((z - R + HALF) / CELL) - poz, 0, S), r1 = clamp(Math.ceil((z + R + HALF) / CELL) - poz, 0, S);
  if (r1 > r0) patchRows(r0, r1);
  whump(0.9);
  for (let k = 0; k < 40; k++) emit(x + (Math.random() - 0.5) * 5, P.wl + 0.1, z + (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 6, 2 + Math.random() * 3, (Math.random() - 0.5) * 6, 1.2, 1.2);
  if (started && !GS.dead) toast("The ice gave way!", "bad");
}
function iceCrackSnd(v) {
  if (!audio) return;
  const { AC, master, buf } = audio, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime;
  s.buffer = buf; f.type = "bandpass"; f.frequency.setValueAtTime(2400 + Math.random() * 1800, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.25); f.Q.value = 2;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 1.5); s.stop(t + 0.32);
}
// the refreeze: a fresh snowpack, frozen lakes, no old tracks, every route open. Nothing you own is touched.
// at boot (or after a load): bring the world straight to today's melt, all at once, before the first frame
function meltBoot() {
  meltSeason();
  if (!MELT.grid && (meltDay() > MELT.dApr - 6 || CAL.season().id === "summer")) { for (const _ of meltGridG(false)); }
  meltTick(0);
  if (MELT.sweep) { while (!MELT.sweep.next().done); MELT.sweep = null; }
}
function meltRefreeze() {
  meltSeason(); meltStep(0); MELT.sweep = null; MELT.crack = 0;
  for (const c of activeChunks) chunks[c.key] = undefined;
  activeChunks.length = 0; refillIdx = 0;
  trailData.fill(0); trailTex.needsUpdate = true; tctx.clearRect(0, 0, MB, MB);
  for (const L of LKS) if (L && L.mesh) L.mesh.visible = false;
  recenter(P.x, P.z, true);
}

/* the summer: bills, the montage and the new winter */
const SEASON = {
  // O6 (depot cabins) registers here: { name, perWeek() } - positive for income (rent), negative for costs (the fuel cache)
  bills: [], card: false,
  addBill(b) { this.bills.push(b); return b; },
  year(c = CAL.day()) { return (c.m >= 10 ? c.y : c.y - 1) - 2026 + 1; },
  settle(days) {
    const weeks = days / 7, lines = [];
    for (const b of this.bills) { let v = 0; try { v = Math.round(b.perWeek() * weeks); } catch (e) { } if (v) lines.push({ name: b.name, v }); }
    const total = lines.reduce((a, l) => a + l.v, 0);
    GS.cash = Math.max(0, GS.cash + total);
    return { lines, total, weeks };
  }
};
const SUMMER_NOTES = [
  [5, 1, "June. The last ice goes out of the high lakes. The sled goes in the shed under a tarp."],
  [5, 21, "Midsummer. The sun goes round the sky and never sets. Nobody in Kjøllefjord sleeps."],
  [6, 10, "July. Cloudberries on the fell, reindeer down on the shore, tourists off every ferry."],
  [7, 8, "August. Somebody on the quay asks if you're the snowmobile courier. You say it depends."],
  [8, 6, "September. First frost on the heather. The birches go yellow overnight."],
  [9, 4, "October. Snow on the tops. The lakes skin over, then freeze right through."]
];
function summerCard(c, days, bill) {
  const el = $("summer"); if (!el) return;
  const t0 = Date.UTC(c.y, c.m, c.d), lbl = $("sumDate"), note = $("sumNote"), bl = $("sumBills"), yr = $("sumYear");
  const end = new Date(t0 + days * 864e5), Y = SEASON.year({ m: 10, y: end.getUTCFullYear() });
  el.hidden = false; el.classList.remove("out"); SEASON.card = true;
  bl.hidden = yr.hidden = true; yr.textContent = ""; note.classList.remove("on");
  const setNote = t => { if (note.textContent === t) return; note.classList.remove("on"); setTimeout(() => { note.textContent = t; note.classList.add("on"); }, 220); };
  let k = 0; const N = 72;
  const step = () => {
    const dt = new Date(t0 + Math.round(days * k / N) * 864e5), m = dt.getUTCMonth(), d = dt.getUTCDate();
    lbl.textContent = `${d} ${MONTHS[m]} ${dt.getUTCFullYear()}`;
    let t = SUMMER_NOTES[0][2]; for (const [nm, nd, tx] of SUMMER_NOTES) if (m > nm || (m === nm && d >= nd)) t = tx;
    if (k < N) setNote(t);
    if (k++ < N) { setTimeout(step, 70 + 30 * Math.sin(k / N * Math.PI)); return; }
    setNote(`1 November. A fresh snowpack on the whole peninsula, the lakes frozen hard and every trail open again.`);
    bl.innerHTML = `<div class="sbh">WHILE YOU WERE AWAY · ${Math.round(bill.weeks)} WEEKS</div>` + (bill.lines.length
      ? bill.lines.map(l => `<div class="sbr"><span>${l.name}</span><b class="${l.v < 0 ? "neg" : "pos"}">${l.v < 0 ? "−" : "+"}${fmtCash(Math.abs(l.v))}</b></div>`).join("") + `<div class="sbr tot"><span>All told</span><b>${bill.total < 0 ? "−" : "+"}${fmtCash(Math.abs(bill.total))}</b></div>`
      : `<p>Nothing owing. No depots to rent out or keep fuelled yet, so the summer cost you nothing.</p>`);
    yr.textContent = `YEAR ${Y} · WINTER ${end.getUTCFullYear()}–${String(end.getUTCFullYear() + 1).slice(2)}`;
    setTimeout(() => { bl.hidden = false; yr.hidden = false; }, 400);
    // it closes itself, or a tap / key / pad button closes it once the new year's up
    let done = false;
    const close = () => { if (done) return; done = true; removeEventListener("keydown", close); el.removeEventListener("pointerdown", close); clearInterval(pad); el.classList.add("out"); SEASON.card = false; setTimeout(() => el.hidden = true, 700); };
    const pad = setInterval(() => { const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g) : null; if (gp && gp.buttons.some(b => b && b.pressed)) close(); }, 100);
    setTimeout(() => { addEventListener("keydown", close); el.addEventListener("pointerdown", close); }, 900);
    setTimeout(close, 5600);
  };
  step();
}
function seasonTurn(c, days) {
  if (SCHOOL.on) schoolEnd("quiet");                 // nobody runs a course through the summer
  sarAbort("quiet");
  const bill = SEASON.settle(days);
  meltRefreeze();
  // the sled spent the summer in the shed at the quay: back there, full tank, warm
  P.x = SPAWN.x; P.z = SPAWN.z; P.yaw = SPAWN.yaw; P.vx = P.vz = P.vy = 0; P.yr = 0; P.sink = 0; P.wet = false;
  recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.3; P.safe = { x: P.x, z: P.z, yaw: P.yaw }; camState.init = false; camState.yaw = P.yaw; towSnap();
  GS.fuel = GS.cap; GS.warmth = 100; GS.outWarned = GS.lowWarned = GS.coldWarned = false;
  if (started) { GS.jobs = []; makeJobs(depot); }
  summerCard(c, days, bill);
}

// seeded hash -> rng, so fronts, forecasts and aurora nights are the same every time you look at a day
const wxRng = (...k) => { let h = 2166136261; for (const v of k) { h ^= (v | 0) + 0x9e3779b9; h = Math.imul(h, 16777619); h ^= h >>> 13; } return mulberry32(h); };
const gauss = r => { let s = 0; for (let i = 0; i < 4; i++) s += r(); return (s - 2) * 1.73; };   // ~N(0,1)
const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const compassOf = (x, z) => COMPASS[Math.round(((Math.atan2(x, -z) * R2D + 360) % 360) / 45) % 8];   // world dir -> compass (north is -z)

/* weather: fronts generated per calendar day from the seed. Each one has a direction of travel, a speed,
   a depth and a strength, and sweeps across the map, so the west coast gets it before the quay. Storm
   strength at any spot and time is the strongest front over it (leading edge sharper than the tail). */
const WX_MEAN = [1.45, 1.3, 1.1, 0.85, 0.55, 0, 0, 0, 0, 0, 1.1, 1.4];   // fronts per day, by month
const WX = {
  seed: 1, force: null, fronts: {}, fc: null, f: null,
  dayFronts(D) {
    const k = D, c = this.fronts[k]; if (c && c.seed === this.seed) return c.list;
    const r = wxRng(this.seed, D, 13), mean = WX_MEAN[CAL.day(D).m], list = [];
    const n = (r() < mean * 0.75 ? 1 : 0) + (r() < mean * 0.3 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const polar = r() < 0.25;                                 // a Barents polar low from the north, or an Atlantic low from the west
      const th = polar ? Math.PI / 2 + (r() - 0.4) * 1.0 : (r() - 0.6) * 1.5;
      const dx = Math.cos(th), dz = Math.sin(th);
      list.push({ t0: D * 24 + r() * 24, dx, dz, v: 1600 + r() * 2000, L: 4500 + r() * 6000, s: polar ? 0.6 + 0.4 * r() : 0.3 + 0.7 * Math.pow(r(), 0.8), from: compassOf(-dx, -dz), polar });
    }
    const keys = Object.keys(this.fronts); if (keys.length > 24) for (const q of keys) if (Math.abs(q - D) > 6) delete this.fronts[q];
    this.fronts[k] = { seed: this.seed, list }; return list;
  },
  frontAt(f, x, z, T) { const u = (x * f.dx + z * f.dz - f.v * (T - f.t0)) / f.L; return f.s * Math.exp(u > 0 ? -2.9 * u * u : -u * u); },
  // calendar-hour T version: strongest front over (x, z); WX.f is the front that won
  atT(x, z, T) {
    const D = Math.floor(T / 24); let v = 0; this.f = null;
    for (let d = D - 2; d <= D + 1; d++) for (const f of this.dayFronts(d)) { const q = this.frontAt(f, x, z, T); if (q > v) { v = q; this.f = f; } }
    return v;
  },
  at(x, z, H = GS.hour) {
    const v = this.atT(x, z, CAL.abs(H)), F = this.force;
    if (F && H < F.until) return F.v ? Math.max(v, 1) : 0;
    return v;
  },
  // the steamer's call at game hour H: what the weather at the quay does to it (O3 hooks the boat to this)
  ferryState(i) { return i > 0.85 ? { state: "cancelled", delay: 0 } : i > 0.5 ? { state: "delayed", delay: Math.max(1, Math.round((i - 0.4) * 6)) } : { state: "on time", delay: 0 }; },
  ferry(H) { const i = this.at(depot.x, depot.z, H); return Object.assign({ i }, this.ferryState(i)); },
  label(p) { return p < 0.2 ? "Clear" : p < 0.42 ? "Snow showers" : p < 0.7 ? "Storm" : "Severe storm"; },
  temp(m) { return [-11, -11, -8, -3, 2, 8, 11, 10, 6, 1, -4, -8][m]; },
  // the 3-day forecast, issued at midnight. Tomorrow is close to right; days 2 and 3 carry a confidence
  // figure and can be wrong (timing off, a storm that never comes, or one that wasn't forecast).
  forecast() {
    const D = CAL.dayIndex(); if (this.fc && this.fc.D === D && this.fc.seed === this.seed) return this.fc;
    const days = [], qx = depot.x, qz = depot.z;
    for (let k = 1; k <= 3; k++) {
      const Dk = D + k, base = Dk * 24, cal = CAL.day(Dk), r = wxRng(this.seed, Dk, 1000 + k);
      let peak = 0, ph = 12, from = null, s0 = null, s1 = null; const hr = [];
      for (let h = 0; h < 24; h++) { const i = this.atT(qx, qz, base + h + 0.5); hr.push(i); if (i > peak) { peak = i; ph = h; from = this.f && this.f.from; } if (i > 0.5) { if (s0 === null) s0 = h; s1 = h + 1; } }
      const nFr = this.dayFronts(Dk).length;
      let fp = clamp(peak + gauss(r) * [0, 0.07, 0.2, 0.3][k], 0, 1), sh = Math.round(gauss(r) * [0, 1, 2.5, 4][k]);
      const twist = r(); let phantom = false;
      if (k >= 2 && peak < 0.4 && twist < [0, 0, 0.12, 0.2][k]) { phantom = true; fp = 0.5 + 0.35 * r(); ph = 6 + Math.floor(r() * 12); s0 = ph - 2; s1 = ph + 3; from = from || ["W", "NW", "SW"][Math.floor(r() * 3)]; }
      else if (k >= 2 && peak > 0.5 && twist < [0, 0, 0.1, 0.18][k]) { fp = peak * 0.4; s0 = s1 = null; }
      if (fp <= 0.5) s0 = s1 = null; else if (s0 === null) { s0 = ph - 2; s1 = ph + 2; }
      const conf = Math.round(clamp([0, 92, 74, 56][k] - (nFr > 1 ? 8 : 0) - (fp > 0.3 && fp < 0.6 ? 6 : 0) + gauss(r) * 4, 30, 97));
      const ferry = STEAMER.calls.map(c => { const i = clamp(phantom || peak < 0.02 ? (s0 !== null && c.arr >= s0 && c.arr < s1 ? fp : 0) : hr[Math.floor(c.arr)] * fp / peak, 0, 1); return Object.assign({ dir: c.dir, arr: c.arr }, this.ferryState(i)); });
      const t = this.temp(cal.m), lo = Math.round(t - 4 + 3 * fp + gauss(r) * 1.5), hi = Math.round(t + 1 + 4 * fp + gauss(r) * 1.5);
      const aL = typeof AUR !== "undefined" ? AUR.night(Dk).L : 0, dark = !CAL.isMidnightSun(base + 12 - CAL.off);
      const cloud = clamp(this.atT(qx, qz, base + 21) * 1.4, 0, 1), aurora = dark && typeof AUR !== "undefined" ? clamp(aL * (1 - cloud) + gauss(r) * 0.1 * k, 0, 1) : null;
      days.push({ k, D: Dk, label: `${DOW3[cal.dow]} ${cal.d} ${MON3[cal.m]}`, dow: DOW3[cal.dow], peak: fp, word: this.label(fp), from: fp > 0.2 ? from : null, win: s0 !== null ? [clamp(s0 + sh, 0, 23), clamp(s1 + sh, 1, 24)] : null, conf, wind: Math.max(1, Math.round(3 + 20 * fp + gauss(r))), lo: Math.min(lo, hi - 1), hi, ferry, aurora, polar: CAL.isPolarNight(base + 12 - CAL.off) });
    }
    return (this.fc = { D, seed: this.seed, days, issued: CAL.now(D * 24 - CAL.off).label });
  },
  // what's happening at the quay now and when it next changes
  outlook() {
    const H = GS.hour, i0 = this.at(depot.x, depot.z, H), on = i0 > 0.5;
    for (let t = 0.5; t <= 36; t += 0.5) {
      const i = this.at(depot.x, depot.z, H + t);
      if ((i > 0.5) !== on) return { on, i: i0, at: H + t, from: this.f && this.f.from };
    }
    return { on, i: i0, at: null };
  }
};
/* aurora: each night (12:00 to 12:00) gets an activity level from the seed, with substorm bursts on top.
   Polar night is more often active and stronger. What you see is that, times darkness, times clear sky. */
const AUR = {
  v: 0, raw: 0, on: false,
  memo: new Map(),
  night(N) {
    const key = N * 1e10 + WX.seed, hit = this.memo.get(key); if (hit) return hit;
    if (this.memo.size > 64) this.memo.clear();
    const o = this._night(N); this.memo.set(key, o); return o;
  },
  _night(N) {
    const r = wxRng(WX.seed, N, 77), pn = CAL.isPolarNight(N * 24 + 24 - CAL.off);
    const act = r() < (pn ? 0.8 : 0.5), q = r();
    return { pn, act, L: act ? (pn ? 0.5 + 0.55 * q : 0.3 + 0.55 * q) : 0.06 + 0.12 * q, p1: r() * 6.283, p2: r() * 6.283 };
  },
  level(H = GS.hour) {
    const T = CAL.abs(H), n = this.night(Math.floor((T - 12) / 24));
    const b = 0.5 + 0.5 * Math.sin(T * 2.0 + n.p1), b2 = 0.5 + 0.5 * Math.sin(T * 4.7 + n.p2);
    return clamp(n.L * (0.22 + 0.78 * b * b * (0.65 + 0.35 * b2)) * 1.15, 0, 1);
  },
  update(sunE, storm) {
    this.raw = this.level();
    this.v = this.raw * sstep(-4, -10, sunE) * clamp(1 - storm * 1.4, 0, 1);
    return this.v;
  },
  strength() { return this.v; }, active() { return this.v > 0.35; }, strong() { return this.v > 0.6; },
  word(v) { return v > 0.75 ? "Strong" : v > 0.5 ? "Bright" : v > 0.3 ? "Active" : v > 0.12 ? "Faint" : "Quiet"; }
};

WX.seed = (Math.random() * 2 ** 31) | 0;
// the morning after: a toast when the sun stops (or starts) coming up, and a line of forecast
CAL.onDayChange((n, prev) => {
  WX.fc = null; if (typeof TABLET !== "undefined") TABLET.refresh("weather");
  if (prev === null) return;
  const pn = CAL.isPolarNight(), was = CAL.isPolarNight(GS.hour - 24);
  if (pn && !was) toast("The sun didn't come up today. Polar night: every job pays ×1.5 until it's back in January.", "good");
  else if (!pn && was) toast("A sliver of sun at noon today. Polar night is over, and so is the ×1.5.");
  const t = WX.forecast().days[0];
  setTimeout(() => TABLET.notify({ app: "weather", title: `${n.label} · met office`, body: `Tomorrow: ${t.word.toLowerCase()}${t.win ? ` from about ${fmtTime(t.win[0])}` : ""}. ${t.conf}% sure.`, ttl: 7 }), 2600);
});

/* the forecast: drawn into the tablet's Weather app (it was a temporary panel on B until the tablet landed) */
const wxGlyph = (p, night) => {
  const cloud = `<path d="M9 25h21a6 6 0 0 0 0-12 8.5 8.5 0 0 0-16.4 1.6A5.3 5.3 0 0 0 9 25z" fill="rgba(234,242,248,.16)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`;
  if (p < 0.2) return night ? `<path d="M26 8a11 11 0 1 0 8 17A9 9 0 0 1 26 8z" fill="rgba(158,201,255,.18)" stroke="#9ec9ff" stroke-width="1.6"/>` : `<circle cx="20" cy="18" r="7" fill="rgba(255,194,107,.25)" stroke="#ffc26b" stroke-width="1.6"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k * Math.PI / 4; return `<line x1="${20 + Math.cos(a) * 10.5}" y1="${18 + Math.sin(a) * 10.5}" x2="${20 + Math.cos(a) * 13.5}" y2="${18 + Math.sin(a) * 13.5}" stroke="#ffc26b" stroke-width="1.6" stroke-linecap="round"/>`; }).join("")}`;
  if (p < 0.42) return cloud + [[14, 30], [21, 33], [28, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="currentColor"/>`).join("");
  const n = p < 0.7 ? 4 : 7;
  return cloud + Array.from({ length: n }, (_, k) => { const x = 10 + k * (22 / (n - 1)); return `<line x1="${x + 3}" y1="28" x2="${x - 2}" y2="35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`; }).join("");
};
function renderWx(el) {
  const f = WX.forecast(), o = WX.outlook(), n = CAL.now();
  const here = WX.at(P.x, P.z), nowW = here > 0.55 ? "storm" : here > 0.2 ? "snow showers" : "clear";
  const day = h => { const d = Math.floor((CAL.abs(h)) / 24) - CAL.dayIndex(); return d <= 0 ? "" : d === 1 ? " tomorrow" : " " + CAL.now(h).label.split(" ")[0]; };
  let now = `It's ${nowW} where you are, ${WX.temp(n.m) + Math.round(3 * here)}°. `;
  now += o.on ? (o.at !== null ? `Storm at the quay, easing about ${fmtTime(o.at)}${day(o.at)}.` : "Storm at the quay, and no end to it on the charts.") : (o.at !== null ? `Next front${o.from ? " from the " + o.from : ""} reaches the quay about ${fmtTime(o.at)}${day(o.at)}.` : "Nothing on the charts for the next day and a half.");
  const st = CAL.sunTimes(), sun = st.polar ? "Polar night: no sunrise, blue twilight around noon." : st.midnight ? "Midnight sun." : `Sun up ${fmtTime(st.up)}, down ${fmtTime(st.down)}.`;
  const fchip = c => `<span class="bchip ${c.state === "cancelled" ? "due" : c.state === "delayed" ? "heavy" : "ok"}">${c.state === "delayed" ? "+" + c.delay + " H" : c.state.toUpperCase()}</span>`;
  const today = steamerCalls(GS.hour, Math.floor(GS.hour / 24) * 24 + 24, true).filter(c => c.dep >= GS.hour).map(c => `${c.dir} ${c.state === "cancelled" ? fmtTime(c.sArr) + " cancelled" : c.state === "delayed" ? `${fmtTime(c.sArr)} running ${c.delay} h late (sails ${fmtTime(c.dep)})` : `sails ${fmtTime(c.dep)} on time`}`);
  const ferryNow = today.length ? ` Ferry today: ${today.join("; ")}.` : "";
  el.innerHTML = `<div class="wxnow"><b>${n.long}</b> · ${CAL.season().name}${CAL.isPolarNight() ? ` <span class="bchip polar">POLAR NIGHT ×1.5</span>` : ""}<p>${now} ${sun}${ferryNow}</p></div>
    <div class="wxdays">${f.days.map(d => `<div class="wxd${d.peak > 0.55 ? " bad" : ""}">
      <div class="wxh"><span class="wxdow">${d.k === 1 ? "TOMORROW" : d.dow.toUpperCase()}</span><span class="wxdt">${d.label.slice(4)}</span><span class="bchip conf" title="Forecast confidence">${d.conf}%</span></div>
      <svg class="wxg" viewBox="0 0 40 38" aria-hidden="true">${wxGlyph(d.peak, d.polar)}</svg>
      <div class="wxw">${d.word}</div>
      <div class="wxm">${d.win ? `${d.from ? "from the " + d.from + " · " : ""}${fmtTime(d.win[0])}–${fmtTime(d.win[1] % 24)}` : d.from ? "showers from the " + d.from : "settled"}</div>
      <div class="wxm">${d.lo}° / ${d.hi}° · wind ${d.wind} m/s</div>
      <div class="wxf">${d.ferry.map(c => `<span>${c.dir === "northbound" ? "N" : "S"} ${fmtTime(c.arr)}</span>${fchip(c)}`).join("")}</div>
      ${d.aurora !== null && d.aurora !== undefined ? `<div class="wxa">Aurora: <b>${d.aurora > 0.6 ? "strong" : d.aurora > 0.35 ? "likely" : d.aurora > 0.15 ? "a chance" : "unlikely"}</b></div>` : ""}
    </div>`).join("")}</div>
    <p class="wxnote">Issued 00:00 ${f.issued} by the met office in Vardø. Tomorrow's is usually right. Days two and three are a guess with a percentage on it. Ferry times are her calls at Kjøllefjord.</p>`;
}

// Kjøllefjord is the hub: freight comes off the coastal steamer at the quay and goes out across the
// Nordkinn by sled, because the road over Ifjordfjellet is shut half the winter.
const SITES = [
  { id: "depot", name: "Kjøllefjord quay", seed: [-1300, -385], type: "depot", clear: 150 },
  { id: "garage", name: "Nordkinn Skuter & Service", seed: null, type: "shop" },
  { id: "dyfjord", name: "Dyfjord", seed: [-2250, -2050], type: "cabin", kind: "village", houses: 4, clear: 70 },
  { id: "mehamn", name: "Mehamn", seed: [650, -3150], type: "cabin", kind: "village", houses: 7, clear: 90 },
  { id: "gamvik", name: "Gamvik", seed: [2250, -3350], type: "cabin", kind: "village", houses: 5, clear: 80 },
  { id: "skjanes", name: "Skjånes", seed: [3450, 650], type: "cabin", kind: "village", houses: 3, clear: 60 },
  { id: "lebesby", name: "Lebesby", seed: [-3050, 1450], type: "cabin", kind: "village", houses: 5, clear: 80 },
  { id: "ifjord", name: "Ifjord", seed: [-2450, 3500], type: "cabin", kind: "village", houses: 3, clear: 60 },
  { id: "windfarm", name: "Gartefjellet wind farm", seed: [-500, -900], type: "cabin", kind: "farm", clear: 60 },
  { id: "sandfjord", name: "Sandfjorddalen herder cabin", seed: [1100, -1500], type: "cabin", kind: "cabin", clear: 40 },
  { id: "risfjord", name: "Risfjord herder cabin", seed: [2500, 1400], type: "cabin", kind: "cabin", clear: 40 },
  // homes within a kilometre of the quay: the first-week runs. Two on the shore road, the rest up the
  // hillsides and out along the fjord, so even a short run has a climb or a bit of open fell in it.
  { id: "strandbu", name: "Strandbu", seed: [-987, -318], type: "home", kind: "home", paint: "red", clear: 26 },
  { id: "naust", name: "Naustbakken", seed: [-1121, -120], type: "home", kind: "home", paint: "white", clear: 26 },
  { id: "solbakken", name: "Solbakken", seed: [-1703, 4], type: "home", kind: "home", paint: "yellow", clear: 26 },
  { id: "myrvang", name: "Myrvang", seed: [-1273, -1145], type: "home", kind: "home", paint: "blue", clear: 26 },
  { id: "fjellstua", name: "Fjellstua", seed: [-753, -913], type: "home", kind: "home", paint: "wood", clear: 26 },
  { id: "utsikten", name: "Utsikten", seed: [-1168, 363], type: "home", kind: "home", paint: "red", clear: 26 },
  { id: "brattli", name: "Brattli", seed: [-1494, 391], type: "home", kind: "home", paint: "white", clear: 26 },
  { id: "neset", name: "Neset", seed: [-2211, -257], type: "home", kind: "home", paint: "yellow", clear: 26 },
  { id: "relay", name: "Slettnes lighthouse", seed: [2750, -3560], type: "relay", clear: 60 }
];
let depot = SITES[0], garageSite = SITES[1];
const CARGO = [
  ["Propane tanks", 1, false], ["Groceries", 0.9, false], ["Chainsaw parts", 1, false], ["Radio batteries", 1.05, false],
  ["First-aid kit", 1.25, true], ["Two dozen eggs", 0.85, true], ["Stove glass", 1.2, true], ["Post sack", 0.8, false],
  ["Snowshoes", 0.9, false], ["Generator coil", 1.15, true], ["Pharmacy order", 1.3, true], ["Reindeer feed pellets", 0.95, false],
  ["Box of dried cod", 0.9, false], ["Boat engine parts", 1.1, false], ["School books", 0.85, false]
];
const BACKHAUL = ["Outgoing post", "Empty propane tanks", "Trail report", "Broken radio", "Reindeer hides for the boat", "A crate of stockfish"];
const UPG_OLD = [
  { id: "tank", name: "Long-range tank", desc: "Fuel 18 L → 28 L", cost: 170 },
  { id: "cans", name: "Strapped jerry cans", desc: "+12 L more (needs the tank)", cost: 240, needs: "tank" },
  { id: "suit", name: "Expedition suit", desc: "Cold drains 35% slower", cost: 150 },
  { id: "grips", name: "Heated grips & visor", desc: "Another 20% off the cold", cost: 120 },
  { id: "engine", name: "Big-bore engine", desc: "+25% power, a little thirstier", cost: 320 },
  { id: "paddle", name: "Deep-snow paddle track", desc: "25% less drag in powder, more bite", cost: 280 },
  { id: "susp", name: "Long-travel suspension", desc: "Soaks up landings, cargo survives hits", cost: 210 },
  { id: "lights", name: "LED light bar", desc: "Far brighter, wider night riding", cost: 90 },
  { id: "box", name: "Insulated cargo box", desc: "Fragile damage costs half as much", cost: 160 }
];

function slopeAt(x, z, e) { return Math.hypot(groundAt(x + e, z) - groundAt(x - e, z), groundAt(x, z + e) - groundAt(x, z - e)) / (2 * e); }
function flatSpot(sx, sz, R) {
  let best = [sx, sz], bs = 1e9;
  for (let k = 0; k < 500; k++) {
    const a = k * 2.399, r = Math.sqrt(k / 500) * R, x = sx + Math.cos(a) * r, z = sz + Math.sin(a) * r;
    if (Math.abs(x) > HALF - 140 || Math.abs(z) > HALF - 140) continue;
    if (bioAt(x, z) !== 0 || bioAt(x - 11, z) !== 0 || bioAt(x + 40, z) === 3 || bioAt(x - 40, z) === 3 || bioAt(x, z + 40) === 3 || bioAt(x, z - 40) === 3) continue;
    const sc = slopeAt(x, z, 6) + slopeAt(x - 11, z, 6) + r * 0.0015;
    if (sc < bs) { bs = sc; best = [x, z]; }
  }
  return best;
}
function computeSites() {
  for (const s of SITES) {
    if (s.type === "shop") continue;
    const p = flatSpot(s.seed[0], s.seed[1], s.type === "relay" ? 60 : s.type === "home" ? 30 : 90); s.x = p[0]; s.z = p[1];
    s.y = groundAt(s.x, s.z);
  }
  depot = SITES[0]; garageSite = SITES[1];
  const gp = flatSpot(depot.x + 34, depot.z + 4, 18);
  garageSite.x = gp[0]; garageSite.z = gp[1]; garageSite.y = groundAt(gp[0], gp[1]);
  SPAWN.x = depot.x; SPAWN.z = depot.z + 6; SPAWN.yaw = Math.PI;
  computeSchools(); computeRE();
}
function nearSite(x, z, r) {
  return SITES.some(s => s.x !== undefined && (Math.hypot(x - s.x, z - s.z) < Math.max(r, s.clear || 0) || Math.hypot(x - s.x + 11, z - s.z) < r))
    || STATIONS.some(t => t.x !== undefined && Math.hypot(x - t.x, z - t.z) < Math.max(r, 30))
    || schoolList().some(s => s.x !== undefined && Math.hypot(x - s.x, z - (s.z - 4)) < Math.max(r, s.clear))
    || RE_CABINS.some(c => c.built && c.x !== undefined && Math.hypot(x - c.x, z - (c.z - 3)) < Math.max(r, c.clear));
}

/* ---------------- fuel: gas stations, cabins that sell it, tips (winter update O3, section 6) ----------------
   Three stations at the mainstream spots: Kjøllefjord, Mehamn and Lebesby, each a few hundred metres' ride out of
   the village on the side the road would come in (there's no road on the map: it's shut half the winter), with
   normal prices. About a quarter of the remote cabins and villages with no station sell it from a jerry-can rack at
   FUEL.markup x the pump price. Stop at a pump (or a fuel cabin) and the tank fills at FUEL.rate L/s, charged by the
   litre as it goes. Some parcels pay part of the reward as fuel: j.tipL litres, shown as "+12 L" next to the cash. */
const FUEL = { price: 2.5, markup: 1.6, rate: 6, tipVal: 0.8, reach: 16, share: 0.25 };
const STATIONS = [
  { id: "st_kjollefjord", name: "Kjøllefjord Drivstoff", near: "depot", price: 2.45, r0: 130, dir: 0.35 },
  { id: "st_mehamn", name: "Mehamn Drivstoff", near: "mehamn", price: 2.6, r0: 100, dir: 2.2 },
  { id: "st_lebesby", name: "Lebesby Drivstoff", near: "lebesby", price: 2.55, r0: 100, dir: -0.6 }
];
const fuelFmt = v => "$" + v.toFixed(2) + "/L";
function computeStations() {
  const taken = [];
  for (const t of STATIONS) {
    const site = t.near === "depot" ? depot : SITES.find(q => q.id === t.near);
    let best = null, bs = 1e9;
    for (let ri = 0; ri < 9; ri++) for (let k = 0; k < 36; k++) {
      const r = t.r0 + ri * 12, a = k / 36 * Math.PI * 2, x = site.x + Math.cos(a) * r, z = site.z + Math.sin(a) * r;
      if (Math.abs(x) > HALF - 220 || Math.abs(z) > HALF - 220) continue;
      let ok = true;
      for (const [dx, dz] of [[0, 0], [14, 0], [-14, 0], [0, 10], [0, -10], [12, 8], [-12, -8], [12, -8], [-12, 8]]) {
        if (isSea(x + dx, z + dz) || bioAt(x + dx, z + dz) !== 0 || groundAt(x + dx, z + dz) < SEA + 4) { ok = false; break; }
      }
      if (!ok) continue;
      if (SITES.some(q => q.x !== undefined && q !== site && Math.hypot(q.x - x, q.z - z) < 70) || taken.some(q => Math.hypot(q.x - x, q.z - z) < 300)) continue;
      const sl = slopeAt(x, z, 8) + slopeAt(x - 8, z, 6) + slopeAt(x + 8, z, 6) + slopeAt(x, z + 6, 6) + slopeAt(x, z - 6, 6);
      const sc = sl * 40 + Math.abs(((a - t.dir + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 4 + ri * 0.5;
      if (sc < bs) { bs = sc; best = [x, z]; }
    }
    if (!best) best = flatSpot(site.x + Math.cos(t.dir) * t.r0, site.z + Math.sin(t.dir) * t.r0, 60);
    t.x = best[0]; t.z = best[1]; t.y = groundAt(t.x, t.z); t.site = site; t.fuelPrice = t.price; t.kind = "station";
    t.ry = Math.atan2(-(site.z - t.z), site.x - t.x);            // the forecourt's long axis points back at the village
    taken.push(t);
  }
}
// a quarter of the remote cabins (anything that's a cabin and hasn't got a station) sell fuel at ~1.6x: always the same ones
function computeFuelCabins() {
  const pool = SITES.filter(q => q.type === "cabin" && !STATIONS.some(t => t.near === q.id)).sort((a, b) => a.id < b.id ? -1 : 1), rnd = mulberry32(9161);
  for (let i = pool.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const n = Math.max(1, Math.round(pool.length * FUEL.share));
  for (const q of pool.slice(0, n)) { q.fuelMult = FUEL.markup; q.fuelPrice = Math.round(FUEL.price * FUEL.markup * 20) / 20; }
}
// every place that sells fuel, for the Map app and the low-fuel hint
function fuelPoints() {
  const out = STATIONS.filter(t => t.x !== undefined).map(t => ({ x: t.x, z: t.z, name: t.name, kind: "station", price: t.fuelPrice }));
  for (const q of SITES) if (q.fuelPrice) out.push({ x: q.x, z: q.z, name: shortName(q), kind: "cabin", price: q.fuelPrice });
  return out;
}
function nearestFuel() {
  let b = null, bd = 1e9;
  for (const p of fuelPoints()) { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < bd) { bd = d; b = p; } }
  return b ? { name: b.name, d: bd, price: b.price } : null;
}
function fuelSpot() {
  const rc = reFuelSpot(); if (rc) return rc;                // your own depot's cache comes first (Risfjord sells fuel too)
  for (const t of STATIONS) if (t.x !== undefined && Math.hypot(P.x - t.x, P.z - t.z) < FUEL.reach) return t;
  const n = GS.near; return n && n.fuelPrice ? n : null;
}
// stopped at a pump: the tank fills and the till rings, a litre at a time; toast when you're full, broke or gone
const FS = { spot: null, L: 0, cost: 0, paid: 0, broke: false };
function fuelEnd(why) {
  const sp = FS.spot; if (!sp) return;
  const owe = Math.round(FS.cost) - FS.paid; if (owe > 0) GS.cash = Math.max(0, GS.cash - owe);
  if (sp.cache) { if (FS.L >= 0.3) toast(`${why === "full" ? "Tank full" : "Pulled off the pump"}: ${FS.L.toFixed(1)} L from ${sp.name}. It goes on Monday's bill (${fuelFmt(RE_FUEL.perL)}).`, "good"); }
  else if (FS.L >= 0.3) toast(why === "broke" ? `Out of cash: ${FS.L.toFixed(1)} L at ${sp.name} (${fuelFmt(sp.fuelPrice)}), −${fmtCash(FS.cost)}.` : why === "full" ? `Tank full: ${FS.L.toFixed(1)} L at ${sp.name} (${fuelFmt(sp.fuelPrice)}), −${fmtCash(FS.cost)}.` : `Pulled off the pump: ${FS.L.toFixed(1)} L at ${sp.name}, −${fmtCash(FS.cost)}.`, why === "broke" ? "warn" : "good");
  else if (why === "broke" && !FS.broke) toast(`${sp.name}: ${fuelFmt(sp.fuelPrice)}. You can't afford a splash of it.`, "warn");
  FS.broke = why === "broke";
  FS.spot = null; FS.L = FS.cost = FS.paid = 0; save();
}
function fuelStep(dt, spd) {
  const sp = GS.dead || HELP.on || FOOT.on ? null : fuelSpot(), room = GS.cap - GS.fuel;
  if (sp && spd < 4 && room > 0.02) {
    if (FS.spot !== sp) { fuelEnd(); FS.spot = sp; if (room > 1 && !FS.broke && !sp.cache) toast(`${sp.name}: ${fuelFmt(sp.fuelPrice)}. Filling up.`); }
    if (sp.cache) { const l = Math.min(FUEL.rate * dt, room); GS.fuel += l; FS.L += l; GS.outWarned = GS.lowWarned = false; const o = GS.re.own[sp.cab.id]; if (o) o.L += l; return; }
    const want = Math.min(FUEL.rate * dt, room), afford = Math.max(0, (GS.cash - (FS.cost - FS.paid)) / sp.fuelPrice), l = Math.min(want, afford);
    if (l > 0) {
      GS.fuel += l; FS.L += l; FS.cost += l * sp.fuelPrice; GS.outWarned = GS.lowWarned = false; FS.broke = false;
      const due = Math.floor(FS.cost) - FS.paid; if (due > 0) { GS.cash -= due; FS.paid += due; }
    }
    if (l < want - 1e-6) fuelEnd("broke");
  } else if (FS.spot) fuelEnd(room <= 0.02 ? "full" : "left");
  else if (!sp || spd >= 4) FS.broke = false;
}
// tips: some parcels pay part of the reward as fuel. The cash comes down by the litres at ~0.8x the pump price.
const tipLiters = j => j.tipL ? Math.max(1, Math.round(j.tipL * payMul())) : 0;
const payTxt = j => fmtCash(j.pay * payMul()) + (j.tipL ? " +" + tipLiters(j) + " L" : "");
function fuelTip(j, chance, lo, hi) {
  if (Math.random() >= chance) return j;
  const L = lo + ((Math.random() * (hi - lo + 1)) | 0), cut = round5(L * FUEL.price * FUEL.tipVal);
  if (j.pay - cut < 15) return j;
  j.tipL = L; j.pay -= cut; return j;
}

/* ---------------- building kit: shared by the villages and the town ---------------- */
const KIT = (() => {
  // per-pixel (Standard at roughness 1 is the same diffuse as Lambert): r128's Lambert lights per vertex, and a box wall has four,
  // so a house the beam was shining on stayed dark unless a corner happened to sit inside the cone
  const L = c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, metalness: 0 });
  const K = {
    wood: L(0x5b3d29), woodD: L(0x3a271b), snowM: L(0xf3f7fc), stone: L(0x6b6c70), metal: L(0x8d99a6), doorM: L(0x2a1b12),
    red: L(0xa8392a), green: L(0x2f5a3a), white: L(0xe8e4dc), yellow: L(0xd9b95a), blue: L(0x3d5a7a), concrete: L(0x8c8f93), hull: L(0x1c2126),
    glowM: new THREE.MeshBasicMaterial({ color: 0xffc26b }), L
  };
  K.put = (g, geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  K.bx = (g, w, h, d, mat, x, y, z, ry = 0) => K.put(g, new THREE.BoxGeometry(w, h, d), mat, x, y, z, ry);
  // Finnmark house: painted timber, a gabled roof under a foot of snow, lit windows
  K.house = (x, z, w, d, h, ry, mat, lit) => {
    const g = new THREE.Group();
    g.position.set(x, groundAt(x, z) - 0.25, z); g.rotation.y = ry; scene.add(g);
    K.bx(g, w, h, d, mat, 0, h / 2, 0);
    const a = 0.55, hs = w / 2 + 0.4, Ls = hs / Math.cos(a);
    const tri = new THREE.Shape(); tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, (w / 2) * Math.tan(a)); tri.closePath();
    const gable = new THREE.ExtrudeGeometry(tri, { depth: d, bevelEnabled: false }); gable.translate(0, 0, -d / 2);
    K.put(g, gable, mat, 0, h, 0);
    for (const s of [-1, 1]) {
      K.bx(g, Ls, 0.2, d + 0.7, K.woodD, s * hs / 2, h + (hs / 2) * Math.tan(a) + 0.05, 0).rotation.z = -s * a;
      K.bx(g, Ls + 0.1, 0.3, d + 0.8, K.snowM, s * hs / 2, h + (hs / 2) * Math.tan(a) + 0.28, 0).rotation.z = -s * a;
    }
    K.bx(g, 0.7, 1.8, 0.7, K.stone, -w / 4, h + 1.1, d / 4);
    K.bx(g, 0.8, 0.18, 0.8, K.snowM, -w / 4, h + 2.05, d / 4);
    if (lit !== false) {
      for (const sx of [-w / 4, w / 4]) K.bx(g, 0.7, 0.6, 0.08, K.glowM, sx, 1.5, d / 2 + 0.04);
      K.bx(g, 0.9, 1.9, 0.1, K.doorM, 0, 0.95, d / 2 + 0.04);
    }
    for (let u = -w / 2 + 1.1; u <= w / 2 - 1; u += 1.9) for (let v = -d / 2 + 1.1; v <= d / 2 - 1; v += 1.9) {
      const wx = x + u * Math.cos(ry) + v * Math.sin(ry), wz = z - u * Math.sin(ry) + v * Math.cos(ry);
      addOb({ x: wx, z: wz, r: 1.35, top: 1e9 });
    }
    return g;
  };
  K.lamp = (x, z) => {
    const g = new THREE.Group(); g.position.set(x, groundAt(x, z) - 0.2, z); scene.add(g);
    K.put(g, new THREE.CylinderGeometry(0.07, 0.09, 4, 8), K.metal, 0, 2, 0);
    K.put(g, new THREE.SphereGeometry(0.22, 10, 8), K.glowM, 0, 4.1, 0).castShadow = false;
    K.put(g, new THREE.ConeGeometry(0.34, 0.3, 10), K.metal, 0, 4.35, 0);
    addOb({ x, z, r: 0.3, top: 1e9 });
    return g;
  };
  // hjell: the A-frame racks the cod hangs on to dry
  K.hjell = (x, z, len, ry) => {
    const g = new THREE.Group(); g.position.set(x, groundAt(x, z) - 0.2, z); g.rotation.y = ry; scene.add(g);
    const n = Math.max(2, Math.round(len / 3));
    for (let i = 0; i < n; i++) {
      const u = -len / 2 + i * len / (n - 1);
      for (const sd of [-1, 1]) { const pl = K.put(g, new THREE.CylinderGeometry(0.06, 0.08, 4.6, 6), K.woodD, u, 2.2, sd * 1.0); pl.rotation.x = -sd * 0.42; }
    }
    for (const yy of [2.0, 3.0, 4.0]) K.put(g, new THREE.CylinderGeometry(0.05, 0.05, len + 0.4, 6), K.woodD, 0, yy, 0).rotation.z = Math.PI / 2;
    K.bx(g, len + 0.4, 0.14, 0.7, K.snowM, 0, 4.12, 0);
    for (let u = -len / 2; u <= len / 2; u += 1.5) { const wx = x + u * Math.cos(ry), wz = z - u * Math.sin(ry); addOb({ x: wx, z: wz, r: 1.0, top: 1e9 }); }
    return g;
  };
  // a village: a shop on the flat, houses around it, a lamp or two, racks down by the shore
  K.village = (s, seed) => {
    const rnd = mulberry32(seed);
    const pal = [K.red, K.white, K.yellow, K.blue, K.wood, K.L(0x6d4a33), K.L(0x7a5a3a)];
    const n = s.houses || 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.8, r = 22 + rnd() * 22;
      const hx = s.x + Math.cos(a) * r, hz = s.z + Math.sin(a) * r;
      if (isSea(hx, hz) || slopeAt(hx, hz, 5) > 0.25) continue;
      K.house(hx, hz, 6 + rnd() * 3, 5 + rnd() * 2.5, 2.7 + rnd() * 0.5, rnd() * 6.28, pal[(rnd() * pal.length) | 0]);
    }
    K.lamp(s.x + 16, s.z - 8);
    if (n >= 4) K.lamp(s.x - 18, s.z + 12);
    // the racks stand on whichever side the water is
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2, rx = s.x + Math.cos(a) * 70, rz = s.z + Math.sin(a) * 70;
      if (isSea(rx, rz)) { const bx = s.x + Math.cos(a) * 46, bz = s.z + Math.sin(a) * 46; if (!isSea(bx, bz) && slopeAt(bx, bz, 4) < 0.25) K.hjell(bx, bz, 10, -a); break; }
    }
  };
  return K;
})();

/* wind turbines on the ridge above town: the blades turn with the storm */
const TURBINES = [];
function turbine(x, z) {
  const g = new THREE.Group(); g.position.set(x, groundAt(x, z) - 0.3, z); scene.add(g);
  KIT.put(g, new THREE.CylinderGeometry(1.0, 1.6, 42, 10), KIT.white, 0, 21, 0);
  KIT.bx(g, 2.6, 2.4, 5.2, KIT.white, 0, 42.6, 0);
  const hub = new THREE.Group(); hub.position.set(0, 42.6, 3.0); g.add(hub);
  KIT.put(hub, new THREE.SphereGeometry(1.0, 10, 8), KIT.L(0xd8d8d8), 0, 0, 0);
  for (let k = 0; k < 3; k++) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(1.1, 19, 0.3).translate(0, 9.5, 0), KIT.white); bl.rotation.z = k * Math.PI * 2 / 3; bl.castShadow = true; hub.add(bl);
  }
  TURBINES.push({ hub, g, x, z, ph: Math.random() * 6 });
  addOb({ x, z, r: 1.8, top: 1e9 });
  return g;
}
function updTurbines(dt) {
  const spin = (0.5 + 1.8 * GS.storm) * dt;
  for (const t of TURBINES) { t.hub.rotation.z += spin; t.g.rotation.y = Math.atan2(windU.uWind.value.x, windU.uWind.value.y); }
}

const beaconGeo = new THREE.CylinderGeometry(2.2, 2.2, 1000, 16, 1, true);
function buildSites() {
  const { wood, woodD, snowM, stone, doorM, metal, glowM: glow, L } = KIT, pumpM = L(0xc23a22), red = KIT.red, white = KIT.white;
  const add = (g, geo, mat, x, y, z, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.z = rz; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  for (const s of SITES) {
    if (s.type === "shop") { s.beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ visible: false })); s.beacon.visible = false; continue; }
    const g = new THREE.Group(), bx = s.x - 11, bz = s.z;
    g.position.set(bx, groundAt(bx, bz) - 0.3, bz);
    if (s.type === "relay") {
      // Slettnes: a cast-iron tower, red with white bands, the lamp room on top and a keeper's house at its foot
      const H = 30;
      add(g, new THREE.CylinderGeometry(1.7, 2.6, H, 14), red, 0, H / 2, 0);
      for (const yy of [H * 0.32, H * 0.64]) { const rt = 2.6 - 0.9 * (yy + 1.7) / H + 0.07, rb = 2.6 - 0.9 * (yy - 1.7) / H + 0.07; add(g, new THREE.CylinderGeometry(rt, rb, 3.4, 14), white, 0, yy, 0); }
      add(g, new THREE.CylinderGeometry(2.6, 2.6, 0.5, 14), metal, 0, H + 0.2, 0);
      add(g, new THREE.CylinderGeometry(1.5, 1.5, 3.2, 12), new THREE.MeshLambertMaterial({ color: 0xbfe0f2, transparent: true, opacity: 0.55 }), 0, H + 2.0, 0);
      add(g, new THREE.ConeGeometry(2.0, 1.6, 12), red, 0, H + 4.3, 0);
      s.blink = add(g, new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }), 0, H + 2.0, 0);
      s.beam = new THREE.PointLight(0xfff1c0, 0, 260, 1.4); s.beam.position.set(0, H + 2, 0); g.add(s.beam);
      addOb({ x: bx, z: bz, r: 2.8, top: 1e9 });
      KIT.house(bx + 14, bz + 4, 8, 6, 2.9, 0.2, white);
      KIT.lamp(bx + 6, bz - 6);
    } else {
      const big = s.type === "depot", D = big ? 9 : s.kind === "village" ? 7 : 5.5, W = big ? 12 : s.kind === "village" ? 8 : 6.5, Hh = big ? 3.6 : 2.7, a = 0.58, hs = D / 2 + 0.5, Ls = hs / Math.cos(a);
      const wall = big ? red : s.kind === "village" ? L(0x7a5a3a) : s.kind === "home" ? (KIT[s.paint] || wood) : wood;
      add(g, new THREE.BoxGeometry(D, Hh, W), wall, 0, Hh / 2, 0);
      for (let yy = 0.35; yy < Hh; yy += 0.45) add(g, new THREE.BoxGeometry(D + 0.08, 0.06, W + 0.08), woodD, 0, yy, 0);
      const tri = new THREE.Shape(); tri.moveTo(-D / 2, 0); tri.lineTo(D / 2, 0); tri.lineTo(0, (D / 2) * Math.tan(a)); tri.closePath();
      const gable = new THREE.ExtrudeGeometry(tri, { depth: W, bevelEnabled: false }); gable.translate(0, 0, -W / 2);
      add(g, gable, wall, 0, Hh, 0);
      for (const sd of [-1, 1]) {
        add(g, new THREE.BoxGeometry(Ls, 0.22, W + 1.0), woodD, sd * hs / 2, Hh + (hs / 2) * Math.tan(a) + 0.05, 0, -sd * a);
        add(g, new THREE.BoxGeometry(Ls + 0.1, 0.34, W + 1.1), snowM, sd * hs / 2 + sd * 0.1 * Math.sin(a), Hh + (hs / 2) * Math.tan(a) + 0.3, 0, -sd * a);
      }
      add(g, new THREE.BoxGeometry(0.8, 2.4, 0.8), stone, -D / 4, Hh + 1.4, W / 3);
      add(g, new THREE.BoxGeometry(0.9, 0.2, 0.9), snowM, -D / 4, Hh + 2.65, W / 3);
      s.chimney = [bx - D / 4, g.position.y + Hh + 2.8, bz + W / 3];
      add(g, new THREE.BoxGeometry(0.1, 2.0, 1.1), doorM, D / 2 + 0.03, 1.0, 0);
      for (const zz of [-W / 3.2, W / 3.2]) add(g, new THREE.BoxGeometry(0.08, 0.8, 1.1), glow, D / 2 + 0.04, 1.6, zz);
      add(g, new THREE.BoxGeometry(D * 0.7, 0.8, 0.08), glow, 0, 1.6, -W / 2 - 0.04);
      if (big) {
        // the fuel pump stands against the wall, clear of where the sled parks
        add(g, new THREE.BoxGeometry(0.7, 1.7, 0.6), pumpM, D / 2 + 2.2, 0.85, W / 2 - 1);
        add(g, new THREE.BoxGeometry(0.8, 0.12, 0.7), snowM, D / 2 + 2.2, 1.76, W / 2 - 1);
        add(g, new THREE.BoxGeometry(0.15, 2.6, 0.15), woodD, D / 2 + 2.5, 1.3, -W / 2 - 1.5);
        add(g, new THREE.BoxGeometry(0.12, 1.0, 2.6), L(0xd8d2c4), D / 2 + 2.5, 2.4, -W / 2 - 1.5);
        addOb({ x: bx + D / 2 + 2.2, z: bz + W / 2 - 1, r: 0.6, top: 1e9 });
      }
      for (let u = -D / 2 + 1.3; u <= D / 2 - 1.2; u += 1.9) for (let v = -W / 2 + 1.3; v <= W / 2 - 1.2; v += 1.9) addOb({ x: bx + u, z: bz + v, r: 1.45, top: 1e9 });
      if (s.kind === "village") KIT.village(s, 1000 + s.id.length * 77 + s.seed[0]);
      if (s.kind === "home") {
        // a stacked woodpile along the gable end and a mailbox post out by the track
        for (let k = 0; k < 3; k++) add(g, new THREE.BoxGeometry(0.9, 0.9, 3.2), woodD, -D / 2 - 0.7, 0.45 + k * 0.02, 0, 0);
        add(g, new THREE.BoxGeometry(1.0, 0.18, 3.4), snowM, -D / 2 - 0.7, 0.98, 0);
        addOb({ x: bx - D / 2 - 0.7, z: bz, r: 1.0, top: 1e9 });
        add(g, new THREE.BoxGeometry(0.12, 1.2, 0.12), woodD, D / 2 + 3.5, 0.6, W / 2 + 1.5);
        add(g, new THREE.BoxGeometry(0.35, 0.3, 0.5), red, D / 2 + 3.5, 1.3, W / 2 + 1.5);
      }
      if (s.kind === "farm") {
        // five turbines strung along the high ground, the service hut at their feet
        const rnd = mulberry32(4242);
        for (let k = 0; k < 5; k++) {
          let best = null, bh = -1e9;
          for (let t = 0; t < 40; t++) {
            const a = rnd() * 6.283, r = 90 + rnd() * 260, x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
            const h = groundAt(x, z); if (isSea(x, z) || slopeAt(x, z, 6) > 0.3 || TURBINES.some(q => Math.hypot(q.x - x, q.z - z) < 90)) continue;
            if (h > bh) { bh = h; best = [x, z]; }
          }
          if (best) turbine(best[0], best[1]);
        }
      }
      if (s.kind === "cabin") {
        // a herder's place: a lavvu beside the cabin, a sledge, a fence line of reindeer posts
        const lav = new THREE.Group(); lav.position.set(bx + 12, groundAt(bx + 12, bz + 5) - 0.2, bz + 5); scene.add(lav);
        add(lav, new THREE.ConeGeometry(2.6, 4.2, 9, 1, true), L(0x6f6259), 0, 2.1, 0);
        add(lav, new THREE.ConeGeometry(2.75, 1.3, 9, 1, true), snowM, 0, 3.45, 0);
        for (let k = 0; k < 5; k++) add(lav, new THREE.CylinderGeometry(0.03, 0.04, 5.4, 4), woodD, Math.cos(k * 1.256) * 0.4, 3.0, Math.sin(k * 1.256) * 0.4, (k % 2 ? 0.28 : -0.28));
        addOb({ x: bx + 12, z: bz + 5, r: 2.4, top: 1e9 });
        for (let k = 0; k < 7; k++) { const px = bx - 10 + k * 3.2, pz = bz - 9; add(g, new THREE.CylinderGeometry(0.06, 0.08, 1.4, 5), woodD, px - bx, 0.7, pz - bz); }
      }
    }
    scene.add(g);
    const bc = s.type === "depot" ? 0x7fc8e0 : 0xff5a1f;
    s.beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: bc, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    s.beacon.position.set(s.x, s.y + 480, s.z); s.beacon.visible = false; scene.add(s.beacon);
  }
}

/* ---- gas stations and fuel cabins: low-poly models ---- */
function fuelSignTex(price) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 224; const g = c.getContext("2d");
  g.fillStyle = "#16324a"; g.fillRect(0, 0, 256, 224);
  g.fillStyle = "#d98a14"; g.fillRect(0, 0, 256, 38); g.fillRect(0, 190, 256, 34);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#16324a"; g.font = "700 28px 'Barlow Semi Condensed', Arial, sans-serif"; g.fillText("DRIVSTOFF", 128, 20); g.fillText("$ PER LITRE", 128, 207);
  g.fillStyle = "#f4efe3"; g.font = "700 96px 'Barlow Semi Condensed', Arial, sans-serif"; g.fillText(price.toFixed(2), 128, 112);
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4; return tex;
}
function buildStations() {
  const { woodD, snowM, metal, glowM, L, white } = KIT;
  const redM = L(0xc23a22), navy = L(0x16324a), dark = L(0x1d2228), slab = L(0xaeb6bd), lightM = new THREE.MeshBasicMaterial({ color: 0xfff1cf }), amber = L(0xd98a14);
  for (const t of STATIONS) {
    if (t.x === undefined) continue;
    const g = new THREE.Group(), cr = Math.cos(t.ry), sr = Math.sin(t.ry);
    g.position.set(t.x, groundAt(t.x, t.z) - 0.2, t.z); g.rotation.y = t.ry; scene.add(g);
    const W = (lx, lz) => [t.x + lx * cr + lz * sr, t.z - lx * sr + lz * cr];
    const ob = (lx, lz, r) => { const [x, z] = W(lx, lz); addOb({ x, z, r, top: 1e9 }); };
    const bx = (w, h, d, m, x, y, z) => KIT.bx(g, w, h, d, m, x, y, z);
    bx(24, 1.0, 15, slab, 0, -0.3, 0);                                   // the forecourt, swept; thick so a sloping site doesn't leave a gap
    // the canopy: white roof with a red rim and snow on it, four posts, a light panel underneath
    for (const px of [-3.8, 7.8]) for (const pz of [-4.2, 4.2]) { bx(0.4, 4.4, 0.4, white, px, 2.4, pz); ob(px, pz, 0.45); }
    bx(12.6, 0.35, 10.2, white, 2, 4.78, 0); bx(12.8, 0.24, 10.4, redM, 2, 4.56, 0); bx(12.5, 0.28, 10.1, snowM, 2, 5.1, 0);
    bx(10.4, 0.05, 6.6, lightM, 2, 4.35, 0);
    // the pumps on a raised island between the two lanes
    bx(8.6, 0.25, 1.7, L(0x8c9399), 2, 0.32, 0);
    for (const px of [-0.4, 4.4]) {
      bx(0.9, 1.7, 0.7, redM, px, 1.3, 0); bx(0.98, 0.16, 0.78, white, px, 2.2, 0);
      for (const sd of [-1, 1]) {
        bx(0.6, 0.36, 0.05, glowM, px, 1.75, sd * 0.37); bx(0.14, 0.55, 0.14, dark, px + 0.62, 1.2, sd * 0.2);
        const hose = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 5, 8, Math.PI), dark); hose.position.set(px + 0.34, 0.72, sd * 0.4); hose.rotation.z = Math.PI; g.add(hose);
      }
      ob(px, 0, 0.85);
    }
    // the price pylon on the side the traffic comes from: the same panel facing both ways
    const sign = new THREE.MeshBasicMaterial({ map: fuelSignTex(t.fuelPrice) });
    bx(0.3, 6.4, 0.3, navy, 10.6, 3.4, 6.2); bx(0.2, 2.2, 2.4, [sign, sign, amber, amber, amber, amber], 10.6, 6.6, 6.2); ob(10.6, 6.2, 0.4);
    // the kiosk: a small painted shop at the back with its windows lit
    const [kx, kz] = W(-8, 0), k = KIT.house(kx, kz, 7, 5, 2.7, t.ry, KIT.yellow, true);
    bx(2.6, 0.12, 0.5, redM, -8, 3.1, 2.7);
    bx(1.0, 0.9, 0.7, metal, -10.6, 0.65, -5.0); ob(-10.6, -5.0, 0.7);   // a propane cage
    for (const [lx, lz] of [[-3.5, 6.4], [9.5, -6.4]]) { const [x, z] = W(lx, lz); KIT.lamp(x, z); }
  }
}
// a fuel cabin keeps its jerry cans on a pallet by the porch, under a painted board with the price on it
function buildFuelCabins() {
  const { woodD, L } = KIT, redM = L(0xc23a22), dark = L(0x1d2228), amber = L(0xd98a14);
  for (const s of SITES) {
    if (!s.fuelPrice || s.x === undefined) continue;
    let spot = null;
    for (let k = 0; k < 60 && !spot; k++) {
      const a = k * 2.4, r = 5 + (k % 10) * 1.8, x = s.x - 11 + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
      if (!isSea(x, z) && groundAt(x, z) > SEA + 1.5 && slopeAt(x, z, 2) < 0.25 && !solidNear(x, z, 3.2)) spot = [x, z, a];
    }
    if (!spot) spot = [s.x - 11, s.z - 8, 0];
    const [x, z, a] = spot, g = new THREE.Group(); g.position.set(x, groundAt(x, z) - 0.1, z); g.rotation.y = a; scene.add(g);
    const bx = (w, h, d, m, px, py, pz) => KIT.bx(g, w, h, d, m, px, py, pz);
    bx(1.7, 0.14, 1.1, woodD, 0, 0.07, 0);
    for (const [px, py, pz] of [[-0.55, 0.45, -0.25], [0, 0.45, -0.25], [0.55, 0.45, -0.25], [-0.3, 0.45, 0.28], [0.3, 0.45, 0.28], [0, 0.99, -0.25], [-0.55, 0.99, -0.25]]) {
      bx(0.42, 0.52, 0.22, redM, px, py, pz); bx(0.16, 0.07, 0.2, dark, px + 0.08, py + 0.3, pz);
    }
    const sign = new THREE.MeshBasicMaterial({ map: fuelSignTex(s.fuelPrice) });
    bx(0.12, 2.1, 0.12, woodD, 1.2, 1.05, 0.2); bx(1.1, 0.96, 0.08, [amber, amber, amber, amber, sign, sign], 1.2, 2.1, 0.2);
    addOb({ x, z, r: 1.0, top: 1e9 });
  }
}

/* night sky + headlight */
const starGeo = new THREE.BufferGeometry(); {
  // the whole celestial sphere, since it now turns round the pole; stars fade out at the horizon in the shader
  const n = 2600, a = new Float32Array(n * 3), m = new Float32Array(n);
  for (let i = 0; i < n; i++) { const u = Math.random() * 6.283, y = Math.random() * 2 - 1, r = Math.sqrt(1 - y * y); a[i * 3] = r * Math.cos(u) * 7000; a[i * 3 + 1] = y * 7000; a[i * 3 + 2] = r * Math.sin(u) * 7000; m[i] = Math.pow(Math.random(), 3); }
  starGeo.setAttribute("position", new THREE.BufferAttribute(a, 3)); starGeo.setAttribute("mag", new THREE.BufferAttribute(m, 1));
}
const stars = new THREE.Points(starGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
  uniforms: { uOp: { value: 0 }, uTime: { value: 0 } },
  vertexShader: `attribute float mag; uniform float uTime; varying float vA;
    void main(){ vec3 w = normalize(mat3(modelMatrix) * position);
      float tw = 0.75 + 0.25 * sin(uTime * (2.0 + mag * 5.0) + position.x * 0.013);
      vA = (0.35 + 0.65 * mag) * tw * smoothstep(0.02, 0.14, w.y);
      gl_PointSize = 1.3 + mag * 1.7; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uOp; varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float f = 1.0 - smoothstep(0.2, 0.5, length(q));
    gl_FragColor = vec4(vec3(0.92, 0.95, 1.0) * f * vA * uOp, 1.0); }`
}));
stars.frustumCulled = false; scene.add(stars);
const headlight = new THREE.SpotLight(0xffd596, 0.4, 80, 0.55, 0.55, 1.1);
headlight.position.set(0, 0.6, 1.3); headlight.target.position.set(0, -1.2, 14);
sledBody.add(headlight, headlight.target);

const C_STORMDAY = new THREE.Color(0xaab5c1), C_STORMNIGHT = new THREE.Color(0x1b2331), _c1 = new THREE.Color(), _c2 = new THREE.Color();
// Real sky geometry for Kjøllefjord (70.9°N) through the season: the declination follows the date, so on
// 1 November the sun manages ~4° at noon, from ~20 Nov to ~22 Jan it never rises (polar night: a dim blue
// civil twilight around noon, dark otherwise), by March it's 18° and the day is twelve hours, and from
// mid-May it never sets. Below the horizon it slides through civil, nautical and astronomical twilight. The moon runs its own track and phase (a
// lunar month is ~29 game days), so some nights are bright blue moonlight and some are black.
const R2D = 180 / Math.PI, LAT = 70.9 / R2D, MDEC = 16 / R2D;   // the sun's declination comes from the calendar: CAL.dec()
const _sunV = new THREE.Vector3(), _moonV = new THREE.Vector3(), POLE = new THREE.Vector3(0, Math.sin(LAT), -Math.cos(LAT));
function skyDir(ha, dec, out) {                       // hour angle + declination -> world dir (x east, y up, -z north)
  const cd = Math.cos(dec), cl = Math.cos(LAT), sl = Math.sin(LAT);
  return out.set(-cd * Math.sin(ha), sl * Math.sin(dec) + cl * cd * Math.cos(ha), -(cl * Math.sin(dec) - sl * cd * Math.cos(ha)));
}
function sunEl(h) { return Math.asin(clamp(skyDir((h - 12) / 12 * Math.PI, CAL.dec(), _sunV).y, -1, 1)) * R2D; }   // degrees
function dayFactor() { return sstep(-7, 3, sunEl(GS.hour % 24)); }
// sun elevation (deg): zenith, mid-sky, horizon toward the sun, horizon away, fog, hemi sky, hemi strength, sun glow
const SKYK = [
  [-30, [.010, .016, .045], [.025, .038, .085], [.055, .075, .13], [.05, .07, .12], [.062, .098, .155], [.20, .27, .45], .16, [0, 0, 0]],
  [-18, [.012, .020, .055], [.030, .045, .10], [.07, .09, .15], [.06, .08, .14], [.066, .105, .165], [.20, .27, .45], .17, [.02, .02, .04]],
  [-12, [.025, .045, .12], [.06, .09, .20], [.16, .16, .27], [.09, .12, .22], [.10, .14, .23], [.22, .30, .52], .20, [.14, .08, .12]],
  [-6, [.06, .10, .26], [.16, .22, .42], [.55, .36, .38], [.22, .24, .40], [.20, .24, .36], [.30, .38, .62], .28, [.5, .22, .14]],
  [-2, [.13, .20, .42], [.38, .38, .56], [.95, .52, .34], [.58, .44, .60], [.42, .40, .50], [.52, .52, .70], .38, [.9, .42, .2]],
  [1, [.20, .30, .54], [.52, .54, .68], [1.0, .66, .42], [.74, .64, .74], [.62, .58, .64], [.70, .68, .78], .48, [1.1, .55, .28]],
  [5, [.27, .41, .66], [.58, .66, .80], [.95, .82, .70], [.82, .80, .84], [.74, .77, .82], [.72, .80, .90], .56, [.9, .62, .38]],
  [12, [.30, .46, .70], [.60, .72, .86], [.86, .85, .86], [.86, .85, .86], [.77, .83, .89], [.74, .83, .93], .62, [.6, .43, .27]],
  [28, [.25, .43, .74], [.55, .71, .90], [.82, .87, .93], [.82, .87, .93], [.76, .84, .92], [.76, .85, .95], .68, [.4, .32, .22]]   // spring sun, higher than winter ever gets
];
const SUNK = [[-2, [1, .42, .22]], [1, [1, .55, .32]], [4, [1, .72, .5]], [10, [1, .86, .72]]];
function keyAt(K, e, i, out) {
  let j = 0; while (j < K.length - 2 && e > K[j + 1][0]) j++;
  const t = clamp((e - K[j][0]) / (K[j + 1][0] - K[j][0]), 0, 1), A = K[j][i], B = K[j + 1][i];
  if (typeof A === "number") return lerp(A, B, t);
  return out.setRGB(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
const C_MOON = new THREE.Color(0.6, 0.7, 1.0), C_AUR = new THREE.Color(0.3, 0.95, 0.68), C_AURG = new THREE.Color(0.32, 0.8, 0.62);
function updSky() {
  const H = GS.hour, h = H % 24, st = GS.storm, u = sky.material.uniforms;
  // sun
  skyDir((h - 12) / 12 * Math.PI, CAL.dec(), _sunV); const e = Math.asin(clamp(_sunV.y, -1, 1)) * R2D;
  // moon: runs ~50 min later every day, so its phase and rise time drift through the month
  const lag = (H / 24 * 12.19 + 25) % 360 / R2D, illum = 0.5 * (1 + Math.cos(lag));
  skyDir((h - 12) / 12 * Math.PI + Math.PI - lag, MDEC, _moonV); const me = Math.asin(clamp(_moonV.y, -1, 1)) * R2D;
  const dayness = sstep(-10, 4, e), night = sstep(-4, -13, e);
  // aurora: AUR decides tonight's activity and its bursts; darkness and cloud decide how much shows
  const aur = AUR.update(e, st), ak = sstep(0.4, 0.9, aur);          // ak: strong enough to light the snow
  u.uTime.value = gameClock; u.uStorm.value = st; u.uAurora.value = aur * 1.5 * (1 - 0.35 * illum * sstep(0, 15, me));
  u.uSun.value.copy(_sunV); u.uMoon.value.copy(_moonV); u.uMoonI.value = (0.25 + 0.75 * illum) * sstep(0, -8, e) * (1 - st);
  keyAt(SKYK, e, 1, u.uZen.value); keyAt(SKYK, e, 2, u.uMid.value); keyAt(SKYK, e, 3, u.uHor.value); keyAt(SKYK, e, 4, u.uHorA.value);
  keyAt(SKYK, e, 8, u.uGlow.value).multiplyScalar(1 - 0.85 * st);
  // fog tracks the horizon, greyed out by storms
  keyAt(SKYK, e, 5, _c1); _c2.copy(C_STORMNIGHT).lerp(C_STORMDAY, dayness); _c1.lerp(_c2, st);
  scene.fog.color.copy(_c1); u.uFog.value.copy(_c1);
  scene.fog.density = lerp(0.0017, 0.012, st) + (1 - dayness) * 0.001;
  // key light: the sun while it's up, handing over to the moon once it's well below (both are dark at
  // the crossover, so the shadow direction never snaps)
  const moonUp = sstep(0, 10, me), sunI = 1.9 * sstep(-1, 7, e) * (1 - 0.75 * st), moonI = 0.5 * illum * moonUp * night * (1 - 0.8 * st);
  if (sunI >= moonI) { sun.intensity = sunI; keyAt(SUNK, e, 1, sun.color); sunDir.copy(_sunV); }
  else { sun.intensity = moonI; sun.color.copy(C_MOON); sunDir.copy(_moonV); }
  if (sunDir.y < 0.05) { sunDir.y = 0.05; } sunDir.normalize();
  // sky fill: tinted by the sky, a little extra off moonlit snow, a green cast under a strong aurora
  // a strong aurora is bright enough to ride by: a green-teal fill off the whole northern sky
  hemi.intensity = keyAt(SKYK, e, 7) + 0.1 * illum * moonUp * night * (1 - st) + 0.42 * ak;
  keyAt(SKYK, e, 6, hemi.color).lerp(C_AUR, 0.15 * sstep(0.1, 0.5, aur) + 0.55 * ak);
  hemi.groundColor.setRGB(lerp(0.34, 0.91, dayness), lerp(0.40, 0.93, dayness), lerp(0.55, 0.96, dayness)).lerp(C_AURG, 0.45 * ak);
  renderer.toneMappingExposure = lerp(0.95, 1.05, dayness) + 0.06 * ak;
  stars.material.uniforms.uOp.value = night * (1 - st) * (0.95 - 0.35 * illum * moonUp); stars.position.copy(camera.position);
  stars.quaternion.setFromAxisAngle(POLE, -h / 24 * Math.PI * 2); stars.material.uniforms.uTime.value = gameClock;   // the sky wheels round the pole star
  const df = sstep(-7, 3, e);
  headlight.intensity = GS.fuel > 0 ? lerp(3.2, 0.3, df) * ST.light : 0;
  headlight.distance = ST.light > 1 ? 150 : 80; headlight.angle = ST.light > 1 ? 0.75 : 0.55;
}

/* snowfall fills old tracks back in */
function refill() {
  const rate = lerp(1 / 360, 1 / 45, GS.storm);
  const n = Math.min(activeChunks.length, 30);
  for (let m = 0; m < n; m++) {
    if (refillIdx >= activeChunks.length) refillIdx = 0;
    const c = activeChunks[refillIdx], dtc = gameClock - c.t; c.t = gameClock;
    const a = 1 - Math.exp(-rate * dtc), ag = 1 - Math.exp(-rate * dtc / 3); let done = true;
    for (let k = 0; k < CH * CH; k++) {
      const d0 = c.d[k], f = c.f[k], df = f - d0;
      if (df < 0.003 && df > -0.003) continue;
      const d = d0 + df * (c.g && c.g[k] ? ag : a); c.d[k] = d;
      if (Math.abs(f - d) >= 0.003) done = false;
      writeCell(c.cx * CH + (k & 31), c.cz * CH + (k >> 5), d0, d, f);
    }
    const far = Math.abs((c.cx + 0.5) * CH * CELL - HALF - P.x) > 12 || Math.abs((c.cz + 0.5) * CH * CELL - HALF - P.z) > 12;
    if (done && far) { chunks[c.key] = undefined; activeChunks[refillIdx] = activeChunks[activeChunks.length - 1]; activeChunks.pop(); }
    else refillIdx++;
  }
}
function fadeTrails(dt) {
  GS.fadeT += dt; if (GS.fadeT < 1) return;
  const e = Math.exp(-lerp(1 / 360, 1 / 45, GS.storm) * GS.fadeT); GS.fadeT = 0;
  for (let o = 0; o < trailData.length; o += 4) if (trailData[o]) trailData[o] = (trailData[o] * e) | 0;
  trailDirty = true;
  tctx.save(); tctx.globalCompositeOperation = "destination-out"; tctx.fillStyle = `rgba(0,0,0,${(1 - e).toFixed(4)})`; tctx.fillRect(0, 0, MB, MB); tctx.restore();
}

/* how much of a route is already packed down — yours or the other riders' */
const groom = {};             // site id -> 0..1, refreshed every couple of seconds
let groomT = 0;
function routeGroom(a, b) {
  const n = 36, px = WORLD / TR;
  let hit = 0;
  for (let i = 1; i < n; i++) {
    const t = i / n, x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t);
    const tx = clamp(((x + HALF) / px) | 0, 0, TR - 1), tz = clamp(((z + HALF) / px) | 0, 0, TR - 1);
    let v = 0;
    for (let j = -2; j <= 2 && v < 70; j++) for (let k = -2; k <= 2 && v < 70; k++) {
      const sx = clamp(tx + k, 0, TR - 1), sz = clamp(tz + j, 0, TR - 1);
      v = Math.max(v, trailData[(sz * TR + sx) * 4]);
    }
    if (v > 70) hit++;
  }
  return hit / (n - 1);
}
function updGroom() { for (const s of SITES) if (s.type !== "shop") groom[s.id] = routeGroom(depot, s); }
const groomLabel = g => g > 0.8 ? "groomed" : g > 0.45 ? "half groomed" : g > 0.15 ? "mostly unbroken" : "unbroken";

/* jobs */
const fmtTime = h => { const hh = Math.floor(h % 24), mm = Math.floor((h % 1) * 60); return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0"); };
const fmtMi = m => (m / 1000).toFixed(m < 1000 ? 2 : 1) + " km";
// Courier rank is simply how much you've delivered. Each rank opens bigger, riskier work.
const RANKS = [
  { at: 0, name: "Trail runner" },
  { at: 3, name: "Trail crew", opens: "Grooming contracts are on the board. You'll want a groomer on the hitch." },
  { at: 5, name: "Freight hauler", opens: "Heavy freight is on the board: stoves, freezers, generators. Needs a trailer." },
  { at: 12, name: "Priority courier", opens: "Priority runs are on the board. Big money, a bond up front, and a clock that doesn't forgive." },
  { at: 20, name: "Expedition hauler", opens: "Slettnes lighthouse is hiring. Expedition loads out to the tip, flatbed only." }
];
const rankOf = n => RANKS.reduce((r, x) => n >= x.at ? x : r, RANKS[0]);
// Big freight rides the trailer. Off-grid cabins run on stoves, solar, batteries and a backup generator,
// and every piece of it comes in by sled.
const HEAVY = [
  { cargo: "Chest freezer", kg: 85, fragile: true, mul: 1.0, look: "appliance", lvl: 5 },
  { cargo: "Cast-iron wood stove", kg: 150, fragile: false, mul: 1.05, look: "stove", lvl: 5 },
  { cargo: "Backup generator", kg: 140, fragile: false, mul: 1.15, look: "gen", lvl: 5 },
  { cargo: "Four 100-lb propane cylinders", kg: 190, fragile: false, mul: 1.1, look: "tanks", lvl: 5 },
  { cargo: "Chainsaw mill & bar oil", kg: 80, fragile: false, mul: 0.95, look: "crate", lvl: 5 },
  { cargo: "Solar panels & charge controller", kg: 95, fragile: true, mul: 1.3, look: "solar", lvl: 7 },
  { cargo: "Propane refrigerator", kg: 110, fragile: true, mul: 1.25, look: "fridge", lvl: 7 },
  { cargo: "Lithium battery bank", kg: 120, fragile: true, mul: 1.4, look: "crate", lvl: 9 },
  { cargo: "Satellite dish & modem", kg: 45, fragile: true, mul: 1.2, look: "dish", lvl: 9 },
  { cargo: "55-gallon fuel drum", kg: 190, fragile: false, mul: 1.1, look: "drum", lvl: 7 }
];
const PRIORITY = [
  { cargo: "Replacement generator", kg: 140, fragile: false, look: "gen", why: "{s} lost power. They're heating with the oven." },
  { cargo: "Furnace blower & parts", kg: 60, fragile: true, look: "crate", why: "{s}'s furnace quit. The pipes freeze by morning." },
  { cargo: "Emergency fuel drum", kg: 190, fragile: false, look: "drum", why: "{s} is down to its last jerry can." },
  { cargo: "Satellite phone & batteries", kg: 45, fragile: true, look: "dish", why: "{s} has been off the radio for two days. The Widerøe plane can't get in." },
  { cargo: "Heater & a week of food", kg: 120, fragile: false, look: "crate", why: "The road crew is snowed in at {s} and running out." }
];
const EXPEDITION = [
  { cargo: "Lighthouse battery bank", kg: 320, fragile: true, look: "bigcrate", why: "Slettnes's batteries died in the cold. Every boat off the tip steers by that light." },
  { cargo: "Wind turbine nacelle & blades", kg: 260, fragile: true, look: "turbine", why: "A new turbine for the keeper's house. Glass-fibre blades: don't drop it." },
  { cargo: "Standby generator & fuel", kg: 360, fragile: false, look: "bigcrate", why: "Standby power for the light before the next big storm off the Barents." }
];
function jobGeom(d, from) { const dist = Math.hypot(d.x - from.x, d.z - from.z), climb = Math.max(0, d.y - from.y); return { dist, climb, est: (dist / 9 + 45) * (1 + climb / 150) }; }
const pick = a => a[(Math.random() * a.length) | 0];
const round5 = v => Math.round(v / 5) * 5;
// Round-town parcels: the homes within a kilometre of the quay. A new courier's board is all of these;
// the long runs out to the villages and the fell come in as you deliver, and there's always one short
// one posted after that.
const HOME_CARGO = [
  ["Post and the Finnmarken", 0.8, false], ["Pharmacy order", 1.3, true], ["Fresh bread from the bakery", 0.9, false],
  ["A sack of dog food", 0.9, false], ["Lamp oil", 0.95, false], ["Replacement stovepipe", 1.0, false],
  ["Ice-fishing auger", 1.0, false], ["New winter boots", 0.9, false], ["Birthday cake", 1.25, true],
  ["Pane of window glass", 1.3, true], ["Knitting yarn order", 0.85, false], ["Two dozen eggs", 0.85, true],
  ["Snow shovel & roof rake", 0.9, false], ["Radio batteries", 1.05, false]
];
const localCount = lvl => lvl < 3 ? 3 : lvl < 6 ? 2 : 1;
/* ---- the roaming loop (winter update O3) ----
   From ROAM_AT deliveries on, work comes from wherever you are. Every drop-off posts a fresh list: nearby pickups
   (the place you're standing at first, then anywhere within ~3.2 km) going 0.5–3.5 km, plus long hauls across
   the map (4 km and up). You claim one, ride to its P, it loads, ride to its D. Below ROAM_AT the old quay board
   stays (round-town parcels within 1 km, at the existing 3 and 6 thresholds). Nothing in the jobs pulls you back
   to town any more: the mail and the ferry do that. */
const ROAM_AT = 6, ROAM_NEAR = 3200;
const roaming = () => GS.delivered >= ROAM_AT;
const workSites = () => SITES.filter(s => s.type !== "shop" && s.x !== undefined);
function nearestSite(x = P.x, z = P.z) { let b = depot, bd = 1e9; for (const s of workSites()) { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; b = s; } } return b; }
const jobKm = j => (j.from || depot) === depot && !j.roam ? routeKm(j.dest) : Math.hypot(j.dest.x - j.from.x, j.dest.z - j.from.z) * 1.15 / 1000;
const jobClimb = j => Math.round(Math.max(0, j.dest.y - (j.from || depot).y));
function roamJobs(here) {
  here = here && here.type !== "shop" ? here : nearestSite();
  // in the melt, work only goes where the trail still holds, and there's less of it as the snow goes
  const all = workSites().filter(s => s === here || siteOpen(s)), shuf = a => a.sort(() => Math.random() - 0.5), D2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const near = shuf(all.filter(s => D2(s, here) <= ROAM_NEAR));
  const thin = meltWork(), nLong = MELT.k > 0.75 ? 1 : GS.delivered >= 12 ? 2 : 1, nNear = Math.max(1, Math.round((5 - nLong) * thin)), jobs = [], used = new Set();
  const hc = shuf(HOME_CARGO.slice()), fc = shuf(CARGO.slice()); let hi = 0, fi = 0;
  const cargoFor = (f, d) => d.type === "home" || f.type === "home" ? hc[hi++ % hc.length] : fc[fi++ % fc.length];
  const toPickup = f => jobGeom(f, { x: P.x, z: P.z, y: groundAt(P.x, P.z) }).est;
  // nearby: the place you're at has the first one, the rest are within a few km
  for (let k = 0, tries = 0; jobs.length < nNear && tries < 40; tries++, k++) {
    const f = k === 0 ? here : near[(Math.random() * near.length) | 0];
    const ds = all.filter(d => d !== f && D2(d, f) >= 500 && D2(d, f) <= 3500 && !used.has(f.id + ">" + d.id)); if (!ds.length) continue;
    const d = pick(ds), cg = cargoFor(f, d), { dist, climb, est } = jobGeom(d, f), urgent = Math.random() < 0.3;
    used.add(f.id + ">" + d.id);
    jobs.push(fuelTip({ dest: d, from: f, cargo: cg[0], fragile: cg[2], roam: true, local: d.type === "home" && f.type === "home", soft: routeOf(d) === "melting",
      pay: round5((30 + dist * 0.09 + climb * 0.4) * cg[1] * (urgent ? 1.4 : 1) * slushPay(d)), due: urgent ? GS.hour + (toPickup(f) + est) * 1.7 / GAMEHOUR : null }, 0.22, 4, 9));
  }
  // long hauls: from round here to the far side of the map
  for (let k = 0, tries = 0; k < nLong && tries < 30; tries++) {
    const f = tries === 0 ? here : near[(Math.random() * near.length) | 0] || here;
    const ds = all.filter(d => d !== f && D2(d, f) >= 4000 && d.type !== "home" && !used.has(f.id + ">" + d.id)); if (!ds.length) continue;
    const d = pick(ds), cg = fc[fi++ % fc.length], { dist, climb } = jobGeom(d, f);
    used.add(f.id + ">" + d.id); k++;
    jobs.push(fuelTip({ dest: d, from: f, cargo: cg[0], fragile: cg[2], roam: true, long: true, soft: routeOf(d) === "melting", pay: round5((60 + dist * 0.11 + climb * 0.5) * cg[1] * slushPay(d)), due: null }, 0.45, 10, 18));
  }
  GS.jobs = jobs; GS.jobsAt = { x: here.x, z: here.z, site: here };
  if (steamerIn()) postSteamerFreight();
}
function makeJobs(from) {
  if (roaming()) { roamJobs(from === depot ? null : from); makeContracts(depot); return; }
  const shuf = a => a.sort(() => Math.random() - 0.5);
  const homes = shuf(SITES.filter(s => s.type === "home" && Math.hypot(s.x - from.x, s.z - from.z) < 1000 && siteOpen(s)));
  const far = shuf(SITES.filter(s => s.type !== "depot" && s.type !== "shop" && s.type !== "home" && siteOpen(s)));
  const nL = Math.min(homes.length, localCount(GS.delivered));
  const hc = shuf(HOME_CARGO.slice()), fc = shuf(CARGO.slice());   // no two of the same thing on one board
  GS.jobs = [];
  for (let k = 0, nJ = Math.max(1, Math.round(3 * meltWork())); k < nJ; k++) {
    const local = k < nL, d = local ? homes[k] : far[k - nL], cg = local ? hc[k] : fc[k];
    if (!d) continue;
    const { dist, climb, est } = jobGeom(d, from), urgent = Math.random() < (local ? 0.3 : 0.4);
    const pay = Math.round(((local ? 30 : 35) + dist * 0.12 + climb * (local ? 0.25 : 0.5)) * cg[1] * (urgent ? 1.5 : 1) * slushPay(d) / 5) * 5;
    GS.jobs.push(local ? { dest: d, cargo: cg[0], fragile: cg[2], pay, local, soft: routeOf(d) === "melting", due: urgent ? GS.hour + est * 1.7 / GAMEHOUR : null } : fuelTip({ dest: d, cargo: cg[0], fragile: cg[2], pay, local, soft: routeOf(d) === "melting", due: urgent ? GS.hour + est * 1.7 / GAMEHOUR : null }, 0.25, 6, 12));
  }
  if (steamerIn()) postSteamerFreight();
  makeContracts(depot);
}
function makeContracts(from) {
  const lvl = GS.delivered, cabins = SITES.filter(s => s.type === "cabin" && siteOpen(s)).sort(() => Math.random() - 0.5), relay0 = SITES.find(s => s.type === "relay"), relay = siteOpen(relay0) ? relay0 : null;
  const C = [];
  // grooming: drag a groomer down the line to a cabin and leave it set hard (not once the snow's going to slush)
  if (lvl >= 3 && MELT.k > 0.3) C.push({ locked: "Grooming contracts", sub: "Nothing left worth grooming. The trails are going to slush." });
  else if (lvl >= 3 && cabins[0]) {
    const d = cabins[0], { dist, climb, est } = jobGeom(d, from);
    C.push({ groom: true, dest: d, cargo: `Groom the ${d.name.replace(/ (herder cabin|wind farm|lighthouse)$/, "")} trail`, pay: round5(140 + dist * 0.22 + climb * 0.6), due: GS.hour + est * 3.2 / GAMEHOUR, need: "groomer" });
    // a second line once you're known on the trails
    if (lvl >= 8 && cabins[4]) { const d2 = cabins[4], q = jobGeom(d2, from); C.push({ groom: true, dest: d2, cargo: `Groom the ${shortName(d2)} trail`, pay: round5(140 + q.dist * 0.22 + q.climb * 0.6), due: GS.hour + q.est * 3.2 / GAMEHOUR, need: "groomer" }); }
  } else C.push({ locked: "Grooming contracts", sub: lvl >= 3 ? "Every cabin trail has melted out. Back when it freezes." : `Trail crew work — ${RANKS[1].at} deliveries and a groomer on the hitch` });
  // heavy freight: one or two on the trailer
  if (lvl >= 5) {
    const n = lvl >= 9 ? 2 : 1, menu = HEAVY.filter(x => x.lvl <= lvl).sort(() => Math.random() - 0.5);
    // half of it comes off the ferry at the quay; the rest waits on a village harbour
    const harbours = SITES.filter(s => s.kind === "village");
    for (let k = 0; k < n; k++) {
      const d = cabins[1 + k], h = menu[k % menu.length]; if (!d) continue;
      const hb = harbours.filter(s => s !== d && Math.hypot(s.x - d.x, s.z - d.z) > 900);
      const f = Math.random() < 0.5 && hb.length ? pick(hb) : depot, { dist, climb, est } = jobGeom(d, f), urgent = Math.random() < 0.3;
      const pay = round5((120 + dist * 0.3 + climb * 1.2) * h.mul * (urgent ? 1.35 : 1));
      C.push({ big: true, bays: 1, from: f, dest: d, cargo: h.cargo, kg: h.kg, fragile: h.fragile, look: h.look, pay, bond: round5(pay * 0.15), due: urgent ? GS.hour + (jobGeom(f, { x: P.x, z: P.z, y: groundAt(P.x, P.z) }).est + est) * 2.2 / GAMEHOUR : null, need: "trailer" });
    }
  } else C.push({ locked: "Heavy freight", sub: `Appliances, generators, solar kits — ${RANKS[2].at} deliveries and a trailer` });
  // priority: someone's in trouble, tonight
  if (lvl >= 12 && !cabins[3]) C.push({ locked: "Priority runs", sub: "Nobody's cut off: you can't get a sled out to the cabins in this melt." });
  else if (lvl >= 12) {
    const d = cabins[3], p = pick(PRIORITY), { dist, climb, est } = jobGeom(d, from);
    const pay = round5((120 + dist * 0.3 + climb * 1.2) * (2.1 + GS.storm * 0.8));
    C.push({ big: true, bays: 1, priority: true, from: depot, dest: d, cargo: p.cargo, kg: p.kg, fragile: p.fragile, look: p.look, why: p.why.replace("{s}", d.name), pay, bond: round5(pay * 0.25), due: GS.hour + est * 1.35 / GAMEHOUR, need: "trailer" });
  } else if (lvl >= 5) C.push({ locked: "Priority runs", sub: `Emergencies at the cabins — ${RANKS[3].at} deliveries` });
  // expedition: out to the lighthouse on the tip, on the flatbed
  if (lvl >= 20 && relay) {
    const e = pick(EXPEDITION), { dist, climb, est } = jobGeom(relay, from);
    const pay = round5((400 + dist * 0.5 + climb * 2.5) * (e.fragile ? 1.25 : 1.1));
    C.push({ big: true, bays: 2, expedition: true, from: depot, dest: relay, cargo: e.cargo, kg: e.kg, fragile: e.fragile, look: e.look, why: e.why, pay, bond: round5(pay * 0.2), due: GS.hour + est * 2.6 / GAMEHOUR, need: "flatbed" });
  } else if (lvl >= 12) C.push({ locked: "Slettnes expeditions", sub: lvl >= 20 ? "The trail out to Slettnes has melted out. The keeper waits for the boat now." : `Flatbed loads out to the lighthouse — ${RANKS[4].at} deliveries` });
  // recovery call-outs: a generated stuck rider, somewhere the ground would catch them
  if (ST && ST.winch) { const r = makeRescue(from); C.push(r || { locked: "Recovery call-outs", sub: "Nobody's stuck right now. Check back after the next storm." }); }
  else C.push({ locked: "Recovery call-outs", sub: "Stuck riders out on the fell pay well. Fit a winch at the garage." });
  GS.contracts = C; GS.contractsWinch = ST ? ST.winch : 0;
}

/* ---- aurora tours ----
   While an aurora is up, tourists off the steamer queue at the quay for a ride up to one of three high
   viewpoints. Pay is set by how strong the lights are when you get them there; if it fades first they pay
   less. Tourists ride on the seat behind you, not the rack, so a tour doesn't use a parcel slot. */
const LOOKOUTS = [
  { id: "v_finnkirka", name: "Finnkirka lookout", seed: [-1900, -1150], R: 450, why: "the headland over the fjord mouth, with the Finnkirka sea stack below" },
  { id: "v_stjerne", name: "Stjernevarden", seed: [600, -300], R: 900, why: "the old cairn on the high plateau, nothing between you and the whole northern sky" },
  { id: "v_ifjordfjellet", name: "Ifjordfjellet ridge", seed: [-1800, 2700], R: 900, why: "the top of the ridge above Ifjord, the long way round" }
];
function buildViews() {
  const rnd = mulberry32(7071), stone = new THREE.MeshLambertMaterial({ color: 0x6e6a64 }), snow = new THREE.MeshLambertMaterial({ color: 0xeef3f8 }), wood = new THREE.MeshLambertMaterial({ color: 0x5a4636 });
  for (const v of LOOKOUTS) {
    let best = null, bh = -1e9;
    for (let k = 0; k < 900; k++) {
      const a = rnd() * 6.283, r = Math.sqrt(rnd()) * v.R, x = v.seed[0] + Math.cos(a) * r, z = v.seed[1] + Math.sin(a) * r;
      if (Math.abs(x) > HALF - 250 || Math.abs(z) > HALF - 250 || isSea(x, z) || slopeAt(x, z, 6) > 0.3 || SITES.some(s => Math.hypot(s.x - x, s.z - z) < 160)) continue;
      const h = groundAt(x, z); if (h > bh) { bh = h; best = [x, z]; }
    }
    if (!best) best = v.seed;
    v.x = best[0]; v.z = best[1]; v.y = groundAt(v.x, v.z); v.type = "view";
    // a cairn with snow on it, and a bench somebody carried up here
    const g = new THREE.Group(); g.position.set(v.x, v.y - 0.15, v.z); scene.add(g);
    const st = [[0, 0.35, 0, 0.9], [0.2, 0.95, -0.1, 0.7], [-0.1, 1.45, 0.05, 0.5], [0.05, 1.8, 0, 0.32]];
    for (const [x, y, z, r] of st) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), stone); m.position.set(x, y, z); m.rotation.set(rnd() * 3, rnd() * 3, 0); g.add(m); }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 5, 0, 6.283, 0, 1.3), snow); cap.position.set(0.05, 1.95, 0); g.add(cap);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.42), wood); bench.position.set(2.6, 0.48, 0.8); bench.rotation.y = 0.4; g.add(bench);
    for (const sx of [-0.75, 0.75]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.38), wood); leg.position.set(2.6 + sx * Math.cos(0.4), 0.24, 0.8 - sx * Math.sin(0.4)); leg.rotation.y = 0.4; g.add(leg); }
    addOb({ x: v.x, z: v.z, r: 1.2, top: 1e9 });
    v.beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: 0x5ff0b0, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    v.beacon.position.set(v.x, v.y + 480, v.z); v.beacon.visible = false; scene.add(v.beacon);
  }
}
const tourBase = v => { const { dist, climb } = jobGeom(v, depot); return round5(40 + dist * 0.06 + climb * 0.2); };
const tourMul = a => a < 0.15 ? 0.35 : 0.45 + 0.9 * clamp(a / 0.8, 0, 1);       // ×0.45 to ×1.35; a faded sky pays about a third
const TOUR_PAX = ["a couple from Osaka", "three students from Tromsø", "a family from Hamburg", "two photographers from Madrid", "a honeymoon couple from Leeds", "four retirees from Ohio", "a film crew of two from Oslo"];
// keep the board's tour offers in step with the sky: posted while an aurora is up, gone when it fades
function tourSync() {
  if (!GS.contracts) return false;
  const has = GS.contracts.some(c => c.tour);
  if (!GS.tour && AUR.v > 0.38 && !has) {
    const vs = LOOKOUTS.slice().sort(() => Math.random() - 0.5).slice(0, 2);
    for (const v of vs) GS.contracts.unshift({ tour: true, dest: v, cargo: "Aurora tour", pax: pick(TOUR_PAX), pay: tourBase(v) });
    return true;
  }
  if (has && (GS.tour || AUR.v < 0.25)) { GS.contracts = GS.contracts.filter(c => !c.tour); return true; }
  return false;
}
function acceptTour(c) {
  if (GS.tour) { toast("You've already got tourists on the back.", "warn"); return; }
  GS.tour = { view: c.dest, pax: c.pax, base: c.pay, t0: GS.hour, best: AUR.v }; GS.tourHere = true;
  if (GS.contracts) GS.contracts = GS.contracts.filter(x => !x.tour);
  toast(`${c.pax[0].toUpperCase() + c.pax.slice(1)} climb on behind you, cameras out. Get them up to ${c.dest.name} while it's still dancing.`, "good");
  TABLET.refresh(); save();
}
function tourArrive() {
  const t = GS.tour, a = AUR.v, m = tourMul(a);
  let pay = t.base * m, notes = [];
  notes.push(a < 0.15 ? "the lights had faded" : a > 0.6 ? "a full display" : a > 0.35 ? "a good show" : "a faint show");
  if (payMul() > 1) { pay *= payMul(); notes.push("polar night ×1.5"); }
  pay = Math.round(pay); GS.cash += pay; GS.tour = null; bumpDelivered();
  toast(a < 0.15 ? `${t.view.name}. Nothing but stars by the time you got there. They pay $${pay} and photograph the cairn instead.` : `${t.view.name}. ${a > 0.6 ? "The whole sky's moving. Nobody says anything for a minute." : "They get their pictures."} +$${pay} (${notes.join(", ")}).`, a < 0.15 ? "warn" : "good");
  save();
}
const smallLoads = () => GS.load.filter(j => !j.big);
const baysUsed = () => bigLoads().reduce((a, j) => a + j.bays, 0);
function acceptJob(k) {
  const j = GS.jobs[k]; if (!j) return;
  if (smallLoads().length >= ST.slots) { toast(ST.slots === 1 ? "Your rack holds one parcel. The garage sells longer decks." : `You're full at ${ST.slots} parcels.`, "warn"); return; }
  j.hits = 0; GS.load.push(j); GS.jobs.splice(k, 1);
  toast(`Loaded: ${j.cargo} for ${j.dest.name}. ${smallLoads().length}/${ST.slots} on the rack.`);
  if (GS.near && GS.near !== depot) mailVisit(GS.near);
  TABLET.refresh(); applyLoadout(); save();
}
const HITCH_NAME = { groomer: "a groomer drag", tiller: "a wing tiller", trailer: "a freight trailer", flatbed: "the heavy flatbed", akja: "the rescue toboggan" };
function acceptContract(k) {
  const c = GS.contracts && GS.contracts[k]; if (!c || c.locked) return;
  if (c.tour) { acceptTour(c); return; }
  if (c.rescue) {
    if (GS.rescueJob || SAR.cur) { toast("Finish the call you're on first.", "warn"); return; }
    if (ST.winch < c.needTier) { toast(`That call needs a ${["", "hand", "electric", "heavy-duty"][c.needTier]} winch or better.`, "warn"); return; }
    GS.contracts.splice(k, 1); TABLET.close(); rescueStart(c); save(); return;
  }
  const hitch = GS.own.parts.hitch;
  if (c.groom) {
    if (!isGroomer(hitch)) { toast("That's grooming work. Nordkinn Skuter & Service sells a groomer drag for the hitch.", "warn"); return; }
    if (GS.groomJob) { toast("Finish the line you're grooming first.", "warn"); return; }
    c.pts = groomLine(depot, c.dest); GS.groomJob = c; GS.contracts.splice(k, 1);
    toast(`Groom the line to ${c.dest.name}. The dots on the map are the stretches still to do.`);
    TABLET.refresh(); save(); return;
  }
  if (!licensed("freight")) { toast("Trailer freight needs a Freight licence. The Freight app signs you up for school.", "warn"); return; }
  const okHitch = c.need === "flatbed" ? hitch === "flatbed" : hitch === "trailer" || hitch === "flatbed";
  if (!okHitch) { toast(`That load needs ${HITCH_NAME[c.need]} on the hitch. The garage across the road sells them.`, "warn"); return; }
  if (baysUsed() + c.bays > ST.bays) { toast(ST.bays > 1 ? "The flatbed's full." : "The trailer's already loaded.", "warn"); return; }
  if (GS.cash < c.bond) { toast(`The shipper wants a $${c.bond} bond up front. You have $${GS.cash}.`, "warn"); return; }
  GS.cash -= c.bond; c.cond = 100; c.hits = 0; GS.load.push(c); GS.contracts.splice(k, 1);
  toast(`Strapped down: ${c.cargo} (${c.kg} kg) for ${c.dest.name}. $${c.bond} bond paid, back on delivery.${c.priority ? " Clock's running." : ""}`, c.priority || c.expedition ? "warn" : undefined);
  TABLET.refresh(); applyLoadout(); save();
}
// grooming lines: points along the straight run from the quay. Lake ice and cliff you can't groom are left out.
function groomLine(a, b) {
  const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(6, Math.round(L / 28)), pts = [];
  for (let i = 1; i < n; i++) {
    const t = i / n, x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t);
    if (Math.hypot(x - a.x, z - a.z) < 50 || Math.hypot(x - b.x, z - b.z) < 30) continue;
    if (bioAt(x, z) === 3 || (bioAt(x, z) === 1 && sampleG(freshG, x, z) < 0.1) || slopeAt(x, z, 4) > 0.7) continue;
    pts.push({ x, z, done: false });
  }
  return pts;
}
function groomProgress(x, z, w = 2.4) {
  const R = 11 + Math.max(0, w - 2.4) * 0.5, wide = w > 4.5;
  for (const p of GS.groomJob.pts) if (Math.abs(p.x - x) < R && Math.abs(p.z - z) < R && Math.hypot(p.x - x, p.z - z) < R) {
    if (!p.done) p.done = true;
    if (wide) p.wide = true;
  }
}
const groomFrac = g => g.pts.length ? g.pts.filter(p => p.done).length / g.pts.length : 1;
function finishGroom(site) {
  const g = GS.groomJob; if (!g || g.dest !== site) return;
  const fr = groomFrac(g);
  if (fr < 0.7) { if (gameClock - (g.nagT || -99) > 12) { g.nagT = gameClock; toast(`Only ${Math.round(fr * 100)}% of the line is groomed. The orange dots on the map are the gaps.`, "warn"); } return; }
  let p = g.pay * (fr >= 0.9 ? 1 : fr / 0.9), notes = [];
  if (fr >= 0.97) { p *= 1.15; notes.push("clean line bonus"); }
  const wf = g.pts.length ? g.pts.filter(q => q.wide).length / g.pts.length : 0;
  if (wf >= 0.6) { p *= 1 + 0.35 * wf; notes.push("wide trail bonus"); }
  if (g.due && GS.hour > g.due) { p *= 0.5; notes.push("late"); }
  if (payMul() > 1) { p *= payMul(); notes.push("polar night ×1.5"); }
  p = Math.round(p); GS.cash += p; GS.groomJob = null; bumpDelivered(); mailVisit(site);
  toast(`Trail groomed to ${site.name}: +$${p} (${Math.round(fr * 100)}% of the line${notes.length ? ", " + notes.join(", ") : ""}).`, "good");
  updGroom(); save();
}
function bumpDelivered() {
  const before = rankOf(GS.delivered); GS.delivered++;
  const after = rankOf(GS.delivered);
  if (after !== before) { GS.contracts = null; setTimeout(() => toast(`New rank: ${after.name}. ${after.opens || ""}`, "good"), 2600); }
}

function applyUpg() { restat(); }
function cargoHit(v) {
  if (!GS.load.length || v < 6 + ST.soak + ST.armor * 4) return;
  const small = smallLoads();
  small.forEach(j => j.hits++);
  if (bigLoads().length) bigHit(clamp((v - 6 - ST.soak) * 2.2, 3, 22), "Load bounced on the trailer.");
  if (!small.length) return;
  const frag = small.some(j => j.fragile);
  toast(frag
    ? `Cargo rattled. Fragile pay −${ST.care ? "7.5" : "15"}% a hit.`
    : "Cargo took a knock. They won't be topping off your tank.", "warn");
}
function deliver(site) {
  const crates = GS.load.filter(j => j.crate && j.dest === site);
  if (crates.length) {                                   // Bytteboden buys: engines on the shelf, receivers bolted on
    GS.load = GS.load.filter(j => !crates.includes(j));
    for (const j of crates) mktDeliver(j);
    restat(); applyLoadout(); save();
  }
  const here = GS.load.filter(j => j.dest === site);
  if (!here.length) return;
  GS.load = GS.load.filter(j => j.dest !== site);
  let total = 0, notes = [], clean = true, lost = 0, fuelL = 0;
  const note = n => { if (!notes.includes(n)) notes.push(n); };
  for (const j of here) {
    let p = j.pay, bondBack = !!j.bond;
    if (j.big) {
      if (j.cond < 30) { p = 0; bondBack = false; note("refused, too damaged"); clean = false; }
      else if (j.cond < 99) { p *= j.cond / 100; note(Math.round(j.cond) + "% condition"); if (j.cond < 80) clean = false; }
    } else if (j.hits) { if (j.fragile) p *= Math.max(0.3, 1 - (ST.care ? 0.075 : 0.15) * j.hits); note("damaged"); clean = false; }
    if (j.due && GS.hour > j.due) {
      if (j.priority) { p *= 0.3; bondBack = false; note("too late"); }
      else { p *= 0.5; note(j.boat ? "missed the boat" : "late"); }
    } else if (j.boat) note("made the boat");
    const kf = j.pay > 0 ? clamp(p / j.pay, 0, 1) : 0;
    if (j.tipL && kf > 0) fuelL += Math.max(1, Math.round(j.tipL * kf * payMul()));
    if (payMul() > 1 && p > 0) { p *= payMul(); note("polar night ×1.5"); }
    if (j.bond) { if (bondBack) p += j.bond; else lost += j.bond; }
    total += Math.round(p); bumpDelivered();
  }
  GS.cash += total;
  if (fuelL > 0) {                                       // the fuel half of the pay goes straight in the tank; what won't fit is paid out at the pump price
    const add = Math.min(fuelL, Math.max(0, GS.cap - GS.fuel)), over = fuelL - add;
    GS.fuel += add; GS.outWarned = GS.lowWarned = false;
    if (over > 0.4) { const c = Math.round(over * FUEL.price); GS.cash += c; note(`tank full: ${Math.round(over)} L paid as $${c}`); }
  }
  const what = here.length > 1 ? here.length + " loads" : here[0].cargo.toLowerCase();
  toast(`Delivered ${what} to ${site.name}: +$${total}${fuelL ? ` +${fuelL} L` : ""}${notes.length ? " (" + notes.join(", ") + ")" : ""}${lost ? ` · −$${lost} bond` : ""}`, total > 0 || fuelL ? "good" : "bad");
  const wasRoam = GS.delivered - here.length >= ROAM_AT;
  if (site.type !== "depot") mailVisit(site);
  if (roaming()) {
    roamJobs(site); TABLET.refresh();
    setTimeout(() => { if (GS.dead) return; TABLET.notify({ app: "parcels", title: `New work around ${shortName(site)}`, body: wasRoam ? `${GS.jobs.length} parcels posted from here: pickups nearby and ${GS.jobs.filter(j => j.long).length > 1 ? "two long hauls" : "a long haul"}.` : "From now on work comes to you. Every drop-off posts parcels from wherever you are. The mail and the ferry are what bring you back to town.", ttl: wasRoam ? 6 : 12 }); }, wasRoam ? 4200 : 3000);
  }
  if (site.type !== "depot") {
    if (clean) GS.fuel = Math.min(GS.cap, GS.fuel + GS.cap * 0.35);
    if (!roaming() && smallLoads().length < ST.slots && Math.random() < 0.6) {
      const dist = Math.hypot(site.x - depot.x, site.z - depot.z);
      const back = { dest: depot, cargo: BACKHAUL[(Math.random() * BACKHAUL.length) | 0], fragile: false, pay: Math.round((20 + dist * 0.07) * 1.3 / 5) * 5, due: boatDue(site), boat: true, hits: 0 };
      setTimeout(() => {
        if (GS.dead || smallLoads().length >= ST.slots) return;   // the boxes came off; the backhaul goes on once they've handed it over
        GS.load.push(back); applyLoadout(); save();
        toast(`${clean ? "They topped off your tank and handed" : "They look over the dents, then hand"} you ${back.cargo.toLowerCase()} for the boat. She sails at ${fmtTime(back.due)}.`);
      }, 1400);
    } else setTimeout(() => toast(clean ? "They topped off your tank." : "No fuel for you after that."), 1400);
  }
  applyLoadout(); save();
}
function blackout(kind) {
  if (GS.dead) return;
  if (SCHOOL.on) { schoolBlackout(kind); return; }
  GS.dead = true; TABLET.close(); if (FISH) FISH.abort(); sarAbort("blackout"); clearRecovery(); if (typeof rescueAbort === "function") rescueAbort();
  if (GS.tour) { GS.tour = null; setTimeout(() => toast("Your tourists got a lift back to town with the rescue crew. No fare."), 4200); }
  const tow = kind === "tow", wet = kind === "sea", fee = Math.round((tow ? 100 : wet ? 140 : 60) * (1 - (ST ? ST.rescue : 0)));
  const cargo = GS.load.length ? (GS.load.length > 1 ? GS.load.length + " loads" : GS.load[0].cargo.toLowerCase()) : "";
  const bonds = GS.load.reduce((a, j) => a + (j.bond || 0), 0);
  // a tow, a blackout or the fjord: whatever you were carrying is gone, and so are the bonds on it
  const lost = cargo ? (tow ? ` The tow crew only takes you and the sled — your ${cargo} stayed out there.` : ` The ${cargo} didn't make it.`) + (bonds ? ` The shippers keep your $${bonds} in bonds.` : "") : "";
  GS.cash = Math.max(0, GS.cash - fee);
  for (const j of GS.load) if (j.crate) j.crate.state = "wait";   // something bought on Bytteboden isn't lost: it goes back to the seller's shed
  GS.load = [];
  GS.jobs = []; GS.contracts = null; GS.claims = [];
  applyLoadout();                                     // clear the boxes off the tail (the trailer reads GS.load on its own)
  $("blackMsg").innerHTML = (tow ? "<b>TOWED IN</b>The Red Cross snowmobile crew hauled you and your sled back to the quay. No room for freight." : wet ? (P.wl !== SEA ? "<b>THROUGH THE ICE</b>The Red Cross crew got a line on you from the shore. The sled came up on a winch, eventually. The lake kept everything else." : "<b>INTO THE FJORD</b>A fishing boat fished you out. The sled came up on a winch, eventually. The fjord kept everything else.") : "<b>YOU BLACKED OUT</b>The Red Cross crew found you half-buried in drift and dragged you back to the quay.") + `<span>−$${fee}.${lost}</span>`;
  $("black").hidden = false;
  setTimeout(() => {
    P.x = SPAWN.x; P.z = SPAWN.z; P.yaw = SPAWN.yaw; P.vx = P.vz = P.vy = 0; P.yr = 0; P.y = surf(P.x, P.z) + 0.3;
    recenter(P.x, P.z, false); camState.init = false; camState.yaw = P.yaw; towSnap();
    GS.warmth = 70; GS.fuel = Math.max(GS.fuel, GS.cap * 0.5); heatCool(); GS.outWarned = GS.coldWarned = GS.lowWarned = false;
  }, 1200);
  setTimeout(() => { $("black").hidden = true; GS.dead = false; save(); }, 3800);
}
function save() { try { localStorage.setItem("tracklayer.save.v2", JSON.stringify({ cash: GS.cash, delivered: GS.delivered, rescues: GS.rescues || 0, own: SCHOOL.saved || GS.own, hour: +GS.hour.toFixed(3), calOff: CAL.off, wx: WX.seed, log: { m: Math.round(LOG.m), trees: LOG.trees, air: +LOG.air.toFixed(2), jump: +LOG.jump.toFixed(2), fjord: LOG.fjord, mail: LOG.mail, sar: LOG.sar, sarLost: LOG.sarLost }, sar: { duty: SAR.duty, rep: +SAR.rep.toFixed(1), n: SAR.n, lost: SAR.lost, ign: SAR.ign }, mail: GS.mail, mailT: GS.mailT, mailSeq: GS.mailSeq, fish: GS.fish || null, apps: GS.apps, lic: GS.lic, signed: GS.signed, sdone: GS.sdone, mkt: GS.mkt || null, re: GS.re || null })); } catch (e) { } }
addEventListener("pagehide", () => { if (started) save(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && started) save(); });
function load() {
  GS.own = OWN0();
  let d0 = null;
  try {
    const d = d0 = JSON.parse(localStorage.getItem("tracklayer.save.v2") || "null");
    if (d) { GS.cash = d.cash || 0; GS.delivered = d.delivered || 0; GS.rescues = d.rescues || 0; if (typeof d.hour === "number" && isFinite(d.hour)) GS.hour = d.hour; CAL.off = d.calOff || 0; if (d.wx) WX.seed = d.wx; if (d.log) for (const k in LOG) { const v = +d.log[k]; LOG[k] = isFinite(v) && v > 0 ? v : 0; } if (Array.isArray(d.mail)) { GS.mail = d.mail; GS.mailT = d.mailT || {}; GS.mailSeq = d.mailSeq || 0; } GS.fish = d.fish || null; for (const k of ["apps", "lic", "signed", "sdone"]) GS[k] = d[k] && typeof d[k] === "object" ? d[k] : {}; if (d.sar && typeof d.sar === "object") { SAR.duty = !!d.sar.duty; SAR.rep = isFinite(+d.sar.rep) ? clamp(+d.sar.rep, 0, 100) : 10; SAR.n = d.sar.n | 0; SAR.lost = d.sar.lost | 0; SAR.ign = d.sar.ign | 0; } if (d.own) { const parts0 = GS.own.parts; Object.assign(GS.own, d.own); GS.own.parts = Object.assign(parts0, d.own.parts || {}); } }
    else { const old = JSON.parse(localStorage.getItem("tracklayer.save.v1") || "null"); if (old) { GS.cash = old.cash || 0; GS.delivered = old.delivered || 0; } }
  } catch (e) { }
  migrateEngines(); migrateO6(d0);
  restat(); GS.fuel = GS.cap;
}
// O6: Bytteboden and the depots. Old garage pickups become Bytteboden buys; anyone already towing gets a receiver free.
function migrateO6(d) {
  const o = GS.own; o.cond = o.cond || {}; o.wear = o.wear || {};
  mktInit(d && d.mkt); reInit(d && d.re);
  for (const p of o.pickups || []) { const e = engDef(p.inst.eid); if (e) GS.mkt.held.push({ lid: -(GS.mkt.held.length + 1), cat: "engine", item: e.id, site: p.site, seller: p.inst.seller || "the seller", name: e.name, cond: clamp(p.inst.pwr / e.power, 0.6, 1), adv: clamp(p.inst.pwr / e.power, 0.6, 1), lemon: false, insp: true, paid: 0, hrs: p.inst.hrs, seed: 1, state: "wait" }); }
  o.pickups = [];
  if (!o.parts.recv || o.parts.recv === "none") {
    const po = o.partsOwned, heavy = po["hitch:flatbed"] || po["hitch:tiller"], any = heavy || po["hitch:trailer"] || po["hitch:groomer"] || o.parts.hitch !== "none";
    if (any && !o.recvGift) { const id = heavy || HEAVY_RIG[o.parts.hitch] ? "heavy" : "ball"; po["recv:" + id] = true; o.parts.recv = id; o.recvGift = 1; }
  }
}
// saves from before engine swaps: the big-bore kit is refunded, the bolt-on turbo becomes the turbo kit
function migrateEngines() {
  const o = GS.own, po = o.partsOwned;
  o.engines = o.engines || {}; o.shelf = o.shelf || []; o.pickups = o.pickups || [];
  for (const p of o.pickups) p.aboard = false;                    // the rack isn't saved; crates wait at the seller's again
  if (!o.parts.boost) o.parts.boost = "none";
  // 2026-09-29 power rescale: the bottom sled went from 72% to 100%, the top from 160% to 250%
  if (!o.pwr2) {
    const up = v => +(1 + (v - 0.72) * 1.5 / 0.88).toFixed(3);
    for (const k in o.engines) if (o.engines[k]) o.engines[k].pwr = up(o.engines[k].pwr);
    for (const inst of o.shelf) inst.pwr = up(inst.pwr);
    for (const p of o.pickups) p.inst.pwr = up(p.inst.pwr);
    o.pwr2 = 1;
  }
  if (po["clutch:turbo"]) { delete po["clutch:turbo"]; po["boost:turbo"] = true; if (o.parts.clutch === "turbo") o.parts.boost = "turbo"; }
  if (po["clutch:stage3"]) { delete po["clutch:stage3"]; po["boost:stage3"] = true; if (o.parts.clutch === "stage3") o.parts.boost = "stage3"; }
  if (po["clutch:bigbore"]) { delete po["clutch:bigbore"]; GS.cash += 980; }
  if (!["stock", "helix", "efi"].includes(o.parts.clutch)) o.parts.clutch = po["clutch:efi"] ? "efi" : po["clutch:helix"] ? "helix" : "stock";
  if (boostWhy(sledDef(), o.parts.boost)) o.parts.boost = "none";
}

/* ui */
function toast(msg, kind) {
  const el = document.createElement("div"); el.className = "toast" + (kind ? " " + kind : ""); el.textContent = msg;
  const box = $("toasts"); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 400); }, 4200);
}
/* ---------------- the job board: a survey chart of the Nordkinn ---------------- */
// The board is a paper chart drawn from the real height field: 25 m contours, the coast and its
// waterlines, lake ice, birch, a 1 km grid. Every job on it is plotted as the line a courier would
// actually ride from the quay: round the fjords, easy on the climbs, and glad of any trail you've
// already packed. Pick a line on the left and the chart plots it on the right.
const CT = { N: 513, RN: 257, ready: false, lv: null, water: null, coast: null, lakes: null, rh: null, rm: null, tf: null, dist: null, par: null, hp: null, pos: null, routes: {}, base: null, baseKey: "", tint: null, fonts: 0 };
const CT_REF = 700, CT_KM = CT_REF * 1000 / WORLD, CT_INK = "#1f1a14", CT_PAPER = "#ede6d3", CT_ACC = "#e2531f";
const CT_SANS = "'Barlow Semi Condensed', 'Arial Narrow', sans-serif", CT_SERIF = "'Barlow Semi Condensed', 'Arial Narrow', sans-serif", CT_SEA_INK = "#2e4b63";
const CT_LEVELS = [], CT_WATER = [-27, -20, -14, -9, -5, 0];
for (let h = 25; h <= 450; h += 25) CT_LEVELS.push(h);
const ctX = v => (v + HALF) * CT_REF / WORLD;                     // world metres -> chart units (0..700)
// marching squares: every crossing of every level through an n x n field, as loose segments in grid units
function ctMarch(F, n, levels) {
  const out = levels.map(() => []), L = levels.length, bot = levels[0], top = levels[L - 1], q = new Float64Array(8);
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = F[j * n + i], b = F[j * n + i + 1], c = F[j * n + n + i + 1], d = F[j * n + n + i];
    let lo = a, hi = a;
    if (b < lo) lo = b; else if (b > hi) hi = b;
    if (c < lo) lo = c; else if (c > hi) hi = c;
    if (d < lo) lo = d; else if (d > hi) hi = d;
    if (hi < bot || lo >= top) continue;
    for (let k = 0; k < L; k++) {
      const v = levels[k]; if (v <= lo) continue; if (v > hi) break;
      const ta = a >= v, tb = b >= v, tc = c >= v, td = d >= v, o = out[k];
      let m = 0;
      if (ta !== tb) { q[m++] = i + (v - a) / (b - a); q[m++] = j; }
      if (tb !== tc) { q[m++] = i + 1; q[m++] = j + (v - b) / (c - b); }
      if (tc !== td) { q[m++] = i + (v - d) / (c - d); q[m++] = j + 1; }
      if (td !== ta) { q[m++] = i; q[m++] = j + (v - a) / (d - a); }
      if (m === 4) o.push(q[0], q[1], q[2], q[3]);
      else if (m === 8) {                                           // a saddle: the cell's centre decides which corners join
        if (ta === ((a + b + c + d) / 4 >= v)) o.push(q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7]);
        else o.push(q[6], q[7], q[0], q[1], q[2], q[3], q[4], q[5]);
      }
    }
  }
  return out.map(a => Float32Array.from(a));
}
function ctBuild() {
  const n = CT.N, sk = (GN - 1) / (n - 1), F = new Float32Array(n * n), LK = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const gi = i * sk, gj = j * sk, k = j * n + i;
    F[k] = ground[gj * GN + gi];
    let c = 0, t = 0;                                               // how much of this 16 m square is lake ice, for a smooth shore
    for (let dj = -2; dj <= 2; dj++) { const z = gj + dj; if (z < 0 || z >= GN) continue; for (let di = -2; di <= 2; di++) { const x = gi + di; if (x < 0 || x >= GN) continue; t++; if (bio[z * GN + x] === 1) c++; } }
    LK[k] = c / t;
  }
  CT.lv = ctMarch(F, n, CT_LEVELS);
  const w = ctMarch(F, n, CT_WATER); CT.coast = w.pop(); CT.water = w;
  CT.lakes = ctMarch(LK, n, [0.5])[0];
  // the route grid, 32 m: 0 is the sea, lake ice is quick going, birch is slow
  const rn = CT.RN, rk = (GN - 1) / (rn - 1);
  CT.rh = new Float32Array(rn * rn); CT.rm = new Float32Array(rn * rn); CT.tf = new Float32Array(rn * rn);
  CT.dist = new Float64Array(rn * rn); CT.par = new Int32Array(rn * rn); CT.hp = new Int32Array(rn * rn); CT.pos = new Int32Array(rn * rn);
  for (let j = 0; j < rn; j++) for (let i = 0; i < rn; i++) {
    const g = j * rk * GN + i * rk, b = bio[g], h = ground[g];
    CT.rh[j * rn + i] = h; CT.rm[j * rn + i] = b === 3 || h < 0.8 ? 0 : b === 1 ? 0.8 : b === 2 ? 1.7 : 1;
  }
  CT.ready = true;
}
function ctNode(x, z) {                                           // nearest route node on dry land
  const n = CT.RN, st = WORLD / (n - 1);
  const i0 = clamp(Math.round((x + HALF) / st), 0, n - 1), j0 = clamp(Math.round((z + HALF) / st), 0, n - 1);
  let best = j0 * n + i0, bd = 1e9;
  for (let r = 0; r <= 3 && bd === 1e9; r++) for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) {
    if (i < 0 || j < 0 || i >= n || j >= n || !CT.rm[j * n + i]) continue;
    const d = Math.hypot(i * st - HALF - x, j * st - HALF - z); if (d < bd) { bd = d; best = j * n + i; }
  }
  return best;
}
// one least-cost search out from the quay gives the line to every place on the map. The melt runs it a slice a
// frame (slice = true yields); the tablet still runs it in one go, which cancels any sliced run under way.
function ctRoutes() { for (const _ of ctRoutesG(false)); }
function* ctRoutesG(slice) {
  if (!CT.ready) return;
  const gen = CT.gen = (CT.gen || 0) + 1;
  const n = CT.RN, N2 = n * n, st = WORLD / (n - 1), h = CT.rh, mul = CT.rm, tf = CT.tf, dist = CT.dist, par = CT.par, hp = CT.hp, pos = CT.pos;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {        // packed trail (yours, or the other riders') is cheap going
      let v = 0;
      for (let dz = -4; dz < 4 && v <= 70; dz++) { const z = j * 8 + dz; if (z < 0 || z >= TR) continue; for (let dx = -4; dx < 4; dx++) { const x = i * 8 + dx; if (x < 0 || x >= TR) continue; const t = trailData[(z * TR + x) * 4]; if (t > v) v = t; } }
      tf[j * n + i] = v > 70 ? 0.55 : 1;
    }
    if (slice && (j & 3) === 3) { yield; if (CT.gen !== gen) return; }
  }
  dist.fill(Infinity); par.fill(-1); pos.fill(-1);
  if (slice) { yield; if (CT.gen !== gen) return; }
  let hn = 0;
  const up = i => { const v = hp[i], k = dist[v]; while (i > 0) { const p = (i - 1) >> 1, pv = hp[p]; if (dist[pv] <= k) break; hp[i] = pv; pos[pv] = i; i = p; } hp[i] = v; pos[v] = i; };
  const down = i => { const v = hp[i], k = dist[v]; for (;;) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && dist[hp[c + 1]] < dist[hp[c]]) c++; if (dist[hp[c]] >= k) break; hp[i] = hp[c]; pos[hp[i]] = i; i = c; } hp[i] = v; pos[v] = i; };
  const s0 = ctNode(depot.x, depot.z); dist[s0] = 0; hp[hn] = s0; up(hn++);
  const DI = [-1, 0, 1, -1, 1, -1, 0, 1], DJ = [-1, -1, -1, 0, 0, 1, 1, 1];
  let pops = 0;
  while (hn > 0) {
    if (slice && ++pops % 1000 === 0) { yield; if (CT.gen !== gen) return; }
    const u = hp[0]; pos[u] = -2; hn--; if (hn > 0) { hp[0] = hp[hn]; pos[hp[0]] = 0; down(0); }
    const ui = u % n, uj = (u / n) | 0, du = dist[u], mu = mul[u] * tf[u];
    for (let q = 0; q < 8; q++) {
      const vi = ui + DI[q], vj = uj + DJ[q];
      if (vi < 0 || vj < 0 || vi >= n || vj >= n) continue;
      const v = vj * n + vi; if (!mul[v] || pos[v] === -2) continue;
      const len = DI[q] && DJ[q] ? st * 1.4142 : st, dh = h[v] - h[u], s = Math.abs(dh) / len;
      const c = len * (1 + 4 * s + (s > 0.32 ? 36 * (s - 0.32) : 0)) * 0.5 * (mu + mul[v] * tf[v]) + (dh > 0 ? dh * 1.6 : 0);
      if (du + c < dist[v]) { dist[v] = du + c; par[v] = u; if (pos[v] < 0) { hp[hn] = v; up(hn++); } else up(pos[v]); }
    }
  }
  let np = 0;
  for (const s of SITES) if (s.type !== "depot" && s.type !== "shop" && s.x !== undefined) { CT.routes[s.id] = ctPath(s); if (slice && ++np % 4 === 0) { yield; if (CT.gen !== gen) return; } }
  for (const c of GS.contracts || []) if (c.rescue || c.tour) CT.routes[c.dest.id] = ctPath(c.dest);
  if (GS.tour) CT.routes[GS.tour.view.id] = ctPath(GS.tour.view);
}
function ctPath(site) {
  const n = CT.RN, st = WORLD / (n - 1), end = ctNode(site.x, site.z);
  let P = [];
  const unreach = !(CT.dist[end] < Infinity);
  if (!unreach) for (let v = end; v >= 0; v = CT.par[v]) P.push([(v % n) * st - HALF, ((v / n) | 0) * st - HALF]);
  P.reverse();
  if (P.length < 2) P = [[depot.x, depot.z], [site.x, site.z]];
  P[0] = [depot.x, depot.z]; P[P.length - 1] = [site.x, site.z];
  // straighten the grid's zig-zags, then round the corners off
  const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
  const rdp = (a, b) => {
    let md = 0, mi = -1; const [ax, az] = P[a], [bx, bz] = P[b], L = Math.hypot(bx - ax, bz - az) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (az - P[i][1]) - (ax - P[i][0]) * (bz - az)) / L; if (d > md) { md = d; mi = i; } }
    if (md > 14) { keep[mi] = 1; rdp(a, mi); rdp(mi, b); }
  };
  rdp(0, P.length - 1);
  P = P.filter((p, i) => keep[i]);
  for (let it = 0; it < 2; it++) {
    const Q = [P[0]];
    for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; Q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
    Q.push(P[P.length - 1]); P = Q;
  }
  let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  return { P, L, unreach };
}
// the paper: sea, lake ice, birch stipple and a little grain, one pixel at a time
function ctRaster(g, S) {
  const img = g.createImageData(S, S), D = img.data, k = WORLD / S, ref = CT_REF / S;
  let seed = 0x2545F491;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  for (let py = 0; py < S; py++) {
    const z = (py + 0.5) * k - HALF, j = clamp(Math.round((z + HALF) / GRES), 0, GN - 1), v = (py + 0.5) * ref, row = Math.floor(v / 3.1), sv = v - row * 3.1, off = (row & 1) * 1.55;
    for (let px = 0; px < S; px++) {
      const x = (px + 0.5) * k - HALF, i = clamp(Math.round((x + HALF) / GRES), 0, GN - 1), b = bio[j * GN + i], o = (py * S + px) * 4;
      let r, gg, bb;
      if (b === 3) { const dp = clamp(-ground[j * GN + i] / 70, 0, 1); r = 46 - 9 * dp; gg = 75 - 11 * dp; bb = 99 - 10 * dp; }
      else if (b === 1) { r = 201; gg = 221; bb = 230; }
      else {
        r = 237; gg = 230; bb = 211;
        if (b === 2) {
          r = 222; gg = 218; bb = 197;
          const u = (px + 0.5) * ref - off, su = u - Math.floor(u / 3.1) * 3.1;
          if (su < 0.95 && sv < 0.95) { r = 141; gg = 150; bb = 125; }
        }
        const q = rnd();
        if (q < 0.006) { const a = 0.06 + q * 18; r -= (r - 92) * a; gg -= (gg - 70) * a; bb -= (bb - 46) * a; }
        else if (q > 0.995) { r += (255 - r) * 0.5; gg += (253 - gg) * 0.5; bb += (246 - bb) * 0.5; }
      }
      D[o] = r; D[o + 1] = gg; D[o + 2] = bb; D[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
}
function ctText(g, t, x, y, font, fill, stroke, lw, align, ls, fit) {
  g.font = font; g.textAlign = align || "left"; g.textBaseline = "alphabetic";
  if ("letterSpacing" in g) g.letterSpacing = ls || "0px";
  if (fit) {                                                      // keep a label inside the neatline
    const w = g.measureText(t).width, lo = 8, hi = CT_REF - 8;
    if (align === "right") x = clamp(x, lo + w, hi); else if (align === "center") x = clamp(x, lo + w / 2, hi - w / 2); else x = clamp(x, lo, hi - w);
  }
  if (stroke) { g.lineJoin = "round"; g.strokeStyle = stroke; g.lineWidth = lw; g.strokeText(t, x, y); }
  g.fillStyle = fill; g.fillText(t, x, y);
}
const CT_LBL = {
  depot: { t: "KJØLLEFJORD QUAY", d: "Nordkinn Skuter & Service", dx: 15, dy: 14, key: 1 },
  dyfjord: { t: "DYFJORD", dx: 7.3, dy: 3.1 },
  mehamn: { t: "MEHAMN", dx: 0.8, dy: -9.1, al: "center", key: 1 },
  gamvik: { t: "GAMVIK", dx: -7.7, dy: 3.2, al: "right", key: 1, wet: 1 },
  skjanes: { t: "SKJÅNES", dx: -7.8, dy: 3.5, al: "right" },
  lebesby: { t: "LEBESBY", dx: 7.6, dy: 3.1 },
  ifjord: { t: "IFJORD", dx: 8, dy: 2.8 },
  windfarm: { t: "GARTEFJELLET", d: "wind farm", dx: 10.3, dy: 16.5, key: 1 },
  sandfjord: { t: "SANDFJORDDALEN", d: "herder cabin", dx: 9.6, dy: 3.2, key: 1 },
  risfjord: { t: "RISFJORD", dx: 8, dy: 3.1 },
  relay: { t: "SLETTNES FYR", dx: 15, dy: -9.8, key: 1, wet: 1 }
};
const CT_SEAS = [["Barentshavet", 131, 50, 0, 20, "0.3em"], ["Kjøllefjorden", 166.3, 259, 49, 15, "0.2em"], ["Laksefjorden", 25, 450, -90, 15, "0.22em"], ["Tanafjorden", 623.6, 183, 0, 15, "0.22em"]];
function ctDot(g, x, y, r, fill, lw) { g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.strokeStyle = CT_PAPER; g.lineWidth = lw; g.stroke(); g.fillStyle = fill; g.fill(); }
function ctSquare(g, x, y, s, lw) { g.strokeStyle = CT_PAPER; g.lineWidth = lw; g.strokeRect(x - s / 2, y - s / 2, s, s); g.fillStyle = CT_INK; g.fillRect(x - s / 2, y - s / 2, s, s); }
function ctSymbols(g, u, compact) {
  for (const [t, x, y, rot, sz, ls] of CT_SEAS) {
    if (compact && sz < 16) continue;
    g.save(); g.translate(x, y); if (rot) g.rotate(rot * Math.PI / 180);
    ctText(g, t, 0, 0, `italic 500 ${u(compact ? sz * 0.8 : sz)}px ${CT_SERIF}`, "#d6e4ee", CT_SEA_INK, u(4), "center", ls);
    g.restore();
  }
  for (const t of TURBINES) {
    const x = ctX(t.x), y = ctX(t.z);
    g.save(); g.translate(x, y);
    g.globalAlpha = 0.85; g.fillStyle = CT_PAPER; g.beginPath(); g.arc(0, 0, u(3.9), 0, 6.2832); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = CT_INK; g.lineWidth = u(0.9); g.lineCap = "round"; g.beginPath();
    for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * 2.0944; g.moveTo(0, 0); g.lineTo(Math.cos(a) * u(3.5), Math.sin(a) * u(3.5)); }
    g.stroke(); g.fillStyle = CT_INK; g.beginPath(); g.arc(0, 0, u(1), 0, 6.2832); g.fill();
    g.restore();
  }
  for (const s of SITES) {
    if (s.x === undefined) continue;
    const x = ctX(s.x), y = ctX(s.z);
    if (s.type === "depot") { ctDot(g, x, y, u(3.3), CT_INK, u(2.4)); ctSquare(g, ctX(garageSite.x), ctX(garageSite.z), u(4), u(2)); }
    else if (s.type === "relay") {
      g.save(); g.translate(x, y); g.fillStyle = CT_PAPER; g.globalAlpha = 0.9; g.beginPath(); g.arc(0, 0, u(6.8), 0, 6.2832); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = CT_INK; g.lineWidth = u(1); g.lineCap = "round"; g.beginPath();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.moveTo(Math.cos(a) * u(3.6), Math.sin(a) * u(3.6)); g.lineTo(Math.cos(a) * u(6), Math.sin(a) * u(6)); }
      g.stroke(); g.fillStyle = CT_INK; g.beginPath(); g.arc(0, 0, u(2.3), 0, 6.2832); g.fill(); g.restore();
    }
    else if (s.kind === "cabin") ctSquare(g, x, y, u(4.6), u(2.2));
    else if (s.kind === "home") ctSquare(g, x, y, u(3.2), u(1.6));
    else if (s.kind === "village") { const big = CT_LBL[s.id] && CT_LBL[s.id].key; ctDot(g, x, y, u(big ? 2.9 : 2.5), big ? CT_INK : "#5e4d3c", u(2.3)); }
  }
  for (const v of LOOKOUTS) {                                   // aurora viewpoints: a survey triangle and an italic name
    if (v.x === undefined) continue;
    const x = ctX(v.x), y = ctX(v.z);
    g.fillStyle = CT_INK; g.beginPath(); g.moveTo(x, y - u(4.2)); g.lineTo(x - u(3.8), y + u(2.8)); g.lineTo(x + u(3.8), y + u(2.8)); g.closePath(); g.fill();
    if (!compact) ctText(g, v.name, x + u(6), y + u(3.5), `italic 500 ${u(11)}px ${CT_SERIF}`, "#3d3024", CT_PAPER, u(3), "left", "0px", true);
  }
  for (const s of SITES) {
    const L = CT_LBL[s.id]; if (!L || s.x === undefined) continue;
    const x = ctX(s.x) + u(L.dx), y = ctX(s.z) + u(L.dy), wet = !!L.wet;
    const f = L.key ? `600 ${u(11)}px ${CT_SANS}` : `600 ${u(10)}px ${CT_SANS}`;
    ctText(g, L.t, x, y, f, wet ? CT_PAPER : L.key ? "#2a2119" : "#5e4d3c", wet ? CT_SEA_INK : CT_PAPER, u(3), L.al, L.key ? "0.14em" : "0.12em", true);
    if (L.d && !compact) ctText(g, L.d, x, y + u(12.5), `italic 500 ${u(13)}px ${CT_SERIF}`, "#3d3024", CT_PAPER, u(3), L.al, "0px", true);
  }
}
// the fixed part of the chart, cached per size: the raster, contours, water, labels and the frame
function ctStatic(S, css) {
  const key = S + ":" + Math.round(css) + ":" + CT.fonts;
  if (CT.base && CT.baseKey === key) return CT.base;
  const cv = CT.base || (CT.base = document.createElement("canvas")); cv.width = cv.height = S; CT.baseKey = key;
  const g = cv.getContext("2d");
  ctRaster(g, S);
  const m = css / CT_REF, LS = clamp(m, 0.84, 1.16), u = v => v * LS / m, px1 = 1 / m, G2R = CT_REF / (CT.N - 1);
  g.setTransform(S / CT_REF, 0, 0, S / CT_REF, 0, 0); g.lineCap = "round"; g.lineJoin = "round";
  g.save(); g.beginPath(); g.rect(6, 6, CT_REF - 12, CT_REF - 12); g.clip();
  const segs = (a, style, w) => { g.strokeStyle = style; g.lineWidth = w; g.beginPath(); for (let i = 0; i < a.length; i += 4) { g.moveTo(a[i] * G2R, a[i + 1] * G2R); g.lineTo(a[i + 2] * G2R, a[i + 3] * G2R); } g.stroke(); };
  CT.water.forEach((a, i) => segs(a, `rgba(182,210,230,${[0.15, 0.22, 0.3, 0.4, 0.52][i]})`, Math.max(0.8, 0.6 * px1)));
  CT.lv.forEach((a, i) => { const idx = CT_LEVELS[i] % 100 === 0; segs(a, idx ? "#8f5a34" : "#b67d51", idx ? Math.max(1.5, 1.1 * px1) : Math.max(0.7, 0.55 * px1)); });
  segs(CT.lakes, "rgba(58,98,132,.9)", Math.max(0.7, 0.6 * px1));
  segs(CT.coast, "rgba(22,40,58,.95)", Math.max(0.9, 0.8 * px1));
  g.strokeStyle = "rgba(48,102,150,.26)"; g.lineWidth = px1; g.beginPath();
  for (let q = 1; q * CT_KM < CT_REF; q++) { const p = q * CT_KM; g.moveTo(p, 0); g.lineTo(p, CT_REF); g.moveTo(0, p); g.lineTo(CT_REF, p); }
  g.stroke();
  ctSymbols(g, u, css < 480);
  // scale bar and north arrow, in a cartouche in the south-east corner
  {
    const bw = 2 * CT_KM, x0 = CT_REF - 14 - u(26) - bw - u(22), y0 = CT_REF - 14 - u(40);
    g.fillStyle = "rgba(244,239,227,.94)"; g.fillRect(x0 - u(10), y0 - u(8), bw + u(58), u(46)); g.strokeStyle = CT_INK; g.lineWidth = px1; g.strokeRect(x0 - u(10), y0 - u(8), bw + u(58), u(46));
    g.fillStyle = CT_INK;
    for (let q = 0; q < 4; q++) if (!(q & 1)) g.fillRect(x0 + q * bw / 4, y0 + u(14), bw / 4, u(5));
    g.strokeRect(x0, y0 + u(14), bw, u(5));
    for (let q = 0; q <= 2; q++) ctText(g, String(q), x0 + q * CT_KM, y0 + u(9), `600 ${u(10)}px ${CT_SANS}`, "#2a2119", null, 0, "center");
    ctText(g, "KM", x0 + bw + u(6), y0 + u(20), `600 ${u(9.5)}px ${CT_SANS}`, "#2a2119", null, 0, "left", "0.1em");
    ctText(g, "25 M CONTOURS", x0, y0 + u(32), `600 ${u(8.5)}px ${CT_SANS}`, "#4a3d30", null, 0, "left", "0.14em");
    const tx = x0 + u(80); g.strokeStyle = "rgba(140,58,28,.8)"; g.lineWidth = u(1.6); g.beginPath(); g.moveTo(tx, y0 + u(29)); g.lineTo(tx + u(12), y0 + u(29)); g.stroke();
    ctText(g, "YOUR TRAILS", tx + u(16), y0 + u(32), `600 ${u(8.5)}px ${CT_SANS}`, "#4a3d30", null, 0, "left", "0.14em");
    const nx = x0 + bw + u(34), ny = y0 + u(6);
    ctText(g, "N", nx, ny + u(2), `700 ${u(11)}px ${CT_SANS}`, CT_INK, null, 0, "center");
    g.beginPath(); g.moveTo(nx, ny + u(5)); g.lineTo(nx + u(5), ny + u(26)); g.lineTo(nx, ny + u(34)); g.closePath(); g.fillStyle = CT_PAPER; g.fill(); g.lineWidth = px1; g.stroke();
    g.beginPath(); g.moveTo(nx, ny + u(5)); g.lineTo(nx - u(5), ny + u(26)); g.lineTo(nx, ny + u(34)); g.closePath(); g.fillStyle = CT_INK; g.fill();
  }
  g.restore();
  // the neatline: a double rule, and alternating kilometre bars in the margin between
  g.fillStyle = CT_INK;
  for (let q = 0; q * CT_KM < CT_REF; q += 2) {
    const a = q * CT_KM, w = Math.min(CT_KM, CT_REF - a);
    g.fillRect(a, 0, w, 5); g.fillRect(a, CT_REF - 5, w, 5); g.fillRect(0, a, 5, w); g.fillRect(CT_REF - 5, a, 5, w);
  }
  g.strokeStyle = CT_INK; g.lineWidth = Math.max(px1, 1);
  g.strokeRect(0.5, 0.5, CT_REF - 1, CT_REF - 1); g.strokeRect(5.5, 5.5, CT_REF - 11, CT_REF - 11);
  return cv;
}
// load the chart's faces before drawing it, and redraw once they arrive
function ctFonts() {
  if (!document.fonts || !document.fonts.load) return;
  Promise.all([`italic 500 16px ${CT_SERIF}`, `500 16px ${CT_SERIF}`, `600 12px ${CT_SANS}`, `700 12px ${CT_SANS}`].map(f => document.fonts.load(f).catch(() => null)))
    .then(() => { CT.fonts++; TABLET.paper = null; });
}

/* chart helpers shared by the tablet's Map, Parcels, Freight and Trail Crew apps */
const shortName = s => s.name.replace(/ (herder cabin|wind farm|lighthouse)$/, "");
const fmtCash = v => "$" + Math.round(v).toLocaleString("en-US");
const HITCH_ON = { none: "Nothing on the hitch", groomer: "Groomer drag on the hitch", tiller: "Wing tiller on the hitch", trailer: "Freight trailer on the hitch", flatbed: "Heavy flatbed on the hitch", akja: "Rescue toboggan on the hitch" };
const gsCls = g => "gs" + (g > 0.8 ? 3 : g > 0.45 ? 2 : g > 0.15 ? 1 : 0);
const groomSay = g => g > 0.8 ? "Packed trail most of the way." : g > 0.45 ? "About half of it is packed trail." : g > 0.15 ? "Mostly unbroken snow." : "Unbroken snow the whole way.";
const routeKm = d => { const r = CT.routes[d.id]; return r ? r.L / 1000 : Math.hypot(d.x - depot.x, d.z - depot.z) / 1000; };
const climbOf = d => Math.round(Math.max(0, d.y - depot.y) * 3);
/* chart drawing helpers: a route as a dashed line, rings, the little sled glyph */
function ctEase(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function ctAt(r, s) {
  const P = r.P, cum = r.cum; let j = 1;
  while (j < P.length - 1 && cum[j] < s) j++;
  const a = P[j - 1], b = P[j], seg = cum[j] - cum[j - 1] || 1, t = clamp((s - cum[j - 1]) / seg, 0, 1);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
}
function ctTrace(g, r, s0, s1) {
  const p0 = ctAt(r, s0), p1 = ctAt(r, s1);
  g.beginPath(); g.moveTo(p0[0], p0[1]);
  for (let i = 1; i < r.P.length; i++) { if (r.cum[i] <= s0) continue; if (r.cum[i] >= s1) break; g.lineTo(r.P[i][0], r.P[i][1]); }
  g.lineTo(p1[0], p1[1]);
}
function ctStroke(g, r, s0, s1, alpha, u, now, dotted) {
  if (s1 - s0 < 0.5) return;
  g.save(); g.globalAlpha = alpha; g.lineJoin = "round";
  ctTrace(g, r, s0, s1);
  g.lineCap = "round"; g.setLineDash([]); g.strokeStyle = "rgba(237,230,211,0.9)"; g.lineWidth = u(6); g.stroke();
  g.lineCap = "butt"; g.setLineDash(dotted ? [u(2), u(3)] : [u(6), u(4)]); g.lineDashOffset = -((now * 0.014) % 10) * u(1);
  g.strokeStyle = CT_ACC; g.lineWidth = u(2.4); g.stroke();
  g.restore();
}
function ctRing(g, x, y, rad, lw, u) {
  g.beginPath(); g.arc(x, y, rad, 0, 6.2832);
  g.strokeStyle = "rgba(237,230,211,0.9)"; g.lineWidth = lw + u(2.6); g.stroke();
  g.strokeStyle = CT_ACC; g.lineWidth = lw; g.stroke();
}
function ctSled(g, x, y, ang, alpha, u) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(u(1), u(1)); g.globalAlpha = alpha;
  g.fillStyle = "rgba(237,230,211,0.95)"; g.beginPath(); g.ellipse(0.5, 0, 10.5, 6.6, 0, 0, 6.2832); g.fill();
  g.lineCap = "round"; g.strokeStyle = CT_INK; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(0, -4); g.lineTo(8, -4); g.quadraticCurveTo(9.6, -4, 9.6, -2.7); g.moveTo(0, 4); g.lineTo(8, 4); g.quadraticCurveTo(9.6, 4, 9.6, 2.7); g.stroke();
  g.fillStyle = CT_INK; g.fillRect(-8.5, -2.4, 5, 4.8);
  g.beginPath(); g.moveTo(-4.5, -3.1); g.lineTo(2.6, -3.1); g.lineTo(6.6, 0); g.lineTo(2.6, 3.1); g.lineTo(-4.5, 3.1); g.closePath();
  g.fillStyle = CT_ACC; g.fill(); g.lineWidth = 0.9; g.strokeStyle = CT_INK; g.stroke();
  g.beginPath(); g.arc(-1.9, 0, 1.7, 0, 6.2832); g.fillStyle = CT_INK; g.fill();
  g.restore();
}
/* ---------------- the dash tablet: OS, apps and notifications (winter update O2) ----------------
   The tablet replaces the job board. It's a screen on the dash (see TABHW / V.tab): idle it shows a live
   heading-up map; Tab (pad d-pad up, touch TABLET) dips the first-person camera onto it over ~0.3 s while the
   world keeps running. The OS itself is DOM (#tab / #tabS), laid over the 3D glass every frame with a CSS
   matrix3d homography so taps and clicks land where they look. In third person (and on foot) it's a big
   overlay instead.

   Adding an app:  TABLET.register({ id, name, icon, order, locked, hidden(), badge(), render(el), onOpen(), onClose(), tick(dt), live })
     hidden() true keeps it off the home screen (store apps until they're downloaded: see STORE / GS.apps).
     render(el) fills `el` (re-run by TABLET.refresh()). Give anything selectable data-tf="unique-key" so the
     d-pad / arrows can reach it; a [data-tf] that contains a .tbtn is activated through that button.
     `live` (seconds) re-renders while open; tick(dt) runs every frame the app is up (for canvases).
   Notifications:  TABLET.notify({ title, body, app, kind: "info"|"good"|"warn"|"alert", ttl, actions: [{ label, do(n) }], onExpire(n) })
     returns the note (n.dismiss()). Dash ping + a banner that shows even with the tablet down.
   Map layers:  TABLET.addLayer(id, () => [{ x, z, name, kind }])  ("rescue", "depots" and "fuel" exist; fuel is filled by the gas stations and fuel cabins).
   Map corner widget: TABLET.widget.ferry() / .mail() are the hooks O3 replaces. */
const TD2R = Math.PI / 180;
const TABLET = {
  apps: [], byId: {}, open: false, mode: null, z: 0, e: 0, app: null, w: 720, h: 461, focus: null,
  nav: 0, navT: 0, padA: true, padB: true, rs: 0, rsT: 0, notes: [], log: [], seq: 0, live: null, liveT: 0,
  plain: null, paper: null, paperT: -1e9, layers: { rescue: [], depots: [], fuel: [] }, dashT: 0, statT: 0, ptrDown: false, fovT: 60,
  register(def) {
    const a = Object.assign({ order: 50, badge: null, locked: false }, def);
    this.apps = this.apps.filter(x => x.id !== a.id); this.apps.push(a); this.apps.sort((p, q) => p.order - q.order);
    this.byId[a.id] = a; if (this.open && !this.app) this.render();
    return a;
  },
  addLayer(id, fn) { (this.layers[id] = this.layers[id] || []).push(fn); },
  layerPts(id) { const out = []; for (const fn of this.layers[id] || []) { try { out.push(...(fn() || [])); } catch (e) { console.error(e); } } return out; },
  widget: {
    ferry() { const f = ferryInfo(); return { label: f.st.s === "in" ? "Ferry sails" : "Next sailing", at: f.at, left: f.left, call: f.c, state: f.c ? f.c.state : null, cancelled: f.cancelled, alongside: f.st.s === "in" }; },
    mail() { return GS.mail.length ? Object.assign({ count: mailCount(), value: mailValue(), batches: GS.mail.length }, mailRisk()) : null; }
  },
  can() { return started && !GS.dead && !GS.garageOpen && !godOpen && $("settings").hidden && !TT.on && !(FISH && FISH.panelOpen()); },
  toggle(force, appId) {
    if (force === undefined && appId !== undefined && this.open && this.app !== appId) { this.go(appId); return; }   // B while the tablet's up on another app: go to Weather
    const want = force === undefined ? !this.open : force;
    if (want && !this.can()) return;
    if (want) {
      toggleBigMap(false);
      if (!this.open && appId === undefined && this.live && this.live.app) appId = this.live.app;   // a ping on the dash: open where it points
      if (!this.open) { this.open = true; $("tab").hidden = false; document.body.classList.add("tabOn"); tabWork(); this.layout(); tabPing("open"); }
      if (appId !== undefined) this.go(appId); else this.render();
    } else this.close();
  },
  close(now) {
    if (!this.open && !now) return;
    if (this.app && this.byId[this.app] && this.byId[this.app].onClose) this.byId[this.app].onClose();
    this.open = false; document.body.classList.remove("tabOn");
    if (now) { this.z = 0; this.e = 0; $("tab").hidden = true; }
    this.updBanner();
  },
  go(id) {
    const prev = this.app && this.byId[this.app];
    if (prev && prev.onClose) prev.onClose();
    let a = id && this.byId[id];
    if (a && a.hidden && a.hidden()) { toast(`${a.name} isn't installed. It's in the App Store.`, "warn"); id = "store"; a = this.byId.store; }
    if (a && a.locked) { toast(`${a.name} isn't installed yet.`, "warn"); return; }
    this.app = a ? id : null; this.focus = null; $("tabV").scrollTop = 0;
    if (a && a.onOpen) a.onOpen();
    this.render();
  },
  back() { if (this.app) this.go(null); else this.close(); },
  refresh(id) { if (!this.open) return; if (id && this.app !== id && this.app) return; this.render(); },
  render() {
    if (!this.open) return;
    const v = $("tabV"), a = this.app && this.byId[this.app], st = v.scrollTop;
    $("tabTitle").textContent = a ? a.name.toUpperCase() : "HOME";
    $("tabS").classList.toggle("inapp", !!a); $("tabS").dataset.app = a ? a.id : "home";
    v.innerHTML = "";
    try { if (a) a.render(v); else tabHome(v); } catch (e) { console.error(e); v.innerHTML = `<p class="tnote2">Something on this page crashed. Back to home and try again.</p>`; }
    v.scrollTop = st; this.liveT = 0;
    this.statusBar();
    const els = this.focusables();
    if (!els.some(el => el.dataset.tf === this.focus)) this.focus = els.length ? els.find(el => el.closest("#tabV"))?.dataset.tf || els[0].dataset.tf : null;
    this.paintFocus(false);
    this.updBanner();
  },
  statusBar() {
    const n = CAL.now();
    $("tabClock").textContent = n.time; $("tabDate").textContent = n.label.toUpperCase();
    $("tabCash").textContent = fmtCash(GS.cash);
    $("tabPN").hidden = !CAL.isPolarNight();
  },
  focusables() { return [...$("tabS").querySelectorAll("[data-tf]")].filter(el => el.offsetParent !== null && !el.closest("[hidden]")); },
  // layout position inside the screen (logical px), so the d-pad works the same whatever the 3D tilt is
  posOf(el) {
    const root = $("tabS"), v = $("tabV"); let x = 0, y = 0, n = el;
    while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    if (v.contains(el)) y -= v.scrollTop;
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  },
  paintFocus(scroll = true) {
    const els = this.focusables();
    for (const el of els) el.classList.toggle("tfoc", el.dataset.tf === this.focus);
    if (!scroll) return;
    const el = els.find(q => q.dataset.tf === this.focus); if (!el) return;
    const v = $("tabV"); if (!v.contains(el)) return;
    let top = 0, n = el; while (n && n !== v) { top += n.offsetTop; n = n.offsetParent; }
    if (n !== v) return;
    if (top < v.scrollTop + 8) v.scrollTop = top - 8; else if (top + el.offsetHeight > v.scrollTop + v.clientHeight - 8) v.scrollTop = top + el.offsetHeight - v.clientHeight + 8;
  },
  move(dx, dy) {
    const els = this.focusables(); if (!els.length) return;
    const cur = els.find(el => el.dataset.tf === this.focus);
    if (!cur) { this.focus = els[0].dataset.tf; this.paintFocus(); return; }
    const c = this.posOf(cur), cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    let best = null, bs = 1e9;
    for (const el of els) {
      if (el === cur) continue;
      const p = this.posOf(el), px = p.x + p.w / 2, py = p.y + p.h / 2, ex = px - cx, ey = py - cy;
      const along = ex * dx + ey * dy, across = Math.abs(ex * dy) + Math.abs(ey * dx);
      // overlapping rows/columns count as straight ahead
      const ov = dx ? (p.y < c.y + c.h && p.y + p.h > c.y) : (p.x < c.x + c.w && p.x + p.w > c.x);
      if (along <= 2) continue;
      const sc = along + (ov ? 0 : across * 2.2 + 40);
      if (sc < bs) { bs = sc; best = el; }
    }
    if (best) { this.focus = best.dataset.tf; this.paintFocus(); tabPing("tick"); }
  },
  activate() {
    const el = this.focusables().find(q => q.dataset.tf === this.focus); if (!el) return;
    const btn = el.matches("button,.tbtn") ? el : el.querySelector(".tbtn:not([disabled])");
    if (btn && !btn.disabled) btn.click();
  },
  key(e) {
    const c = e.code;
    const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[c];
    if (d) { e.preventDefault(); this.move(d[0], d[1]); return true; }
    if (c === "Enter" || c === "NumpadEnter") { e.preventDefault(); if (!e.repeat) this.activate(); return true; }
    if (c === "Backspace" || c === "Escape") { e.preventDefault(); if (!e.repeat) this.back(); return true; }
    if (c === "KeyB" && this.app === "weather") { if (!e.repeat) this.close(); return true; }
    return false;
  },
  // gamepad: while it's up the d-pad (and right stick) move, A selects, B backs out; the left stick and triggers still ride
  pad(gp, dt) {
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const rx = gp.axes[2] || 0, ry = gp.axes[3] || 0;
    const nav = b(12) ? 1 : b(13) ? 2 : b(14) ? 3 : b(15) ? 4 : ry < -0.6 ? 1 : ry > 0.6 ? 2 : rx < -0.6 ? 3 : rx > 0.6 ? 4 : 0;
    const a = b(0), bb = b(1);
    if (this.open) {
      this.navT -= dt;
      if (nav !== this.nav || (nav && this.navT <= 0)) {
        if (nav && !(nav === 1 && this.navOpen)) this.move(...[[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]][nav]);
        this.navT = nav === this.nav ? 0.13 : 0.4;
      }
      if (!nav) this.navOpen = false;
      if (a && !this.padA) this.activate();
      if (bb && !this.padB) this.back();
    } else this.navOpen = nav === 1;                             // the d-pad press that opened it doesn't also move the cursor
    this.nav = nav; this.padA = a; this.padB = bb;
  },
  /* ---- notifications ---- */
  notify(o) {
    const n = Object.assign({ kind: "info", ttl: o.actions && o.actions.length ? 30 : 6, body: "" }, o);
    n.id = ++this.seq; n.at = GS.hour; n.t0 = performance.now(); n.until = n.t0 + n.ttl * 1000; n.done = false;
    n.dismiss = () => { if (n.done) return; n.done = true; if (this.live === n) this.live = null; this.notes = this.notes.filter(q => q !== n); this.updBanner(); };
    this.notes.push(n); this.log.unshift(n); if (this.log.length > 12) this.log.pop();
    this.live = n; tabPing(n.kind === "alert" ? "alert" : "note");
    this.updBanner(); if (this.open && !this.app) this.render();
    return n;
  },
  noteTick() {
    const now = performance.now();
    for (const n of this.notes.slice()) if (now > n.until) { n.dismiss(); if (n.onExpire) try { n.onExpire(n); } catch (e) { console.error(e); } }
    if (!this.live && this.notes.length) { this.live = this.notes[this.notes.length - 1]; this.updBanner(); }
  },
  updBanner() {
    const n = this.live, inTab = this.open && this.e > 0.5, ban = $("tabBan"), tn = $("tabNote"), k = n ? n.id + (inTab ? "i" : "o") + (started ? 1 : 0) : "";
    if (ban.dataset.k === k) return; ban.dataset.k = k;
    ban.hidden = !n || inTab || !started; tn.hidden = !n || !inTab;
    ban.innerHTML = n && !inTab ? tabNoteHtml(n, true) : ""; tn.innerHTML = n && inTab ? tabNoteHtml(n, false) : "";
    if (n) tabBindNote(inTab ? tn : ban, n);
    if (inTab && this.open) this.paintFocus(false);
  },
  /* ---- layout: logical screen size, then where it goes on the page each frame ---- */
  layout() {
    const dash = this.modeNow() === "dash"; this.mode = dash ? "dash" : "overlay";
    const W = innerWidth, H = innerHeight, s = $("tabS");
    let w, h;
    if (dash) {
      const t = tabTarget(); const hf = 2 * Math.atan(Math.tan(t.fov / 2 * TD2R) * (W / H));
      const mnW = W >= 1100 ? 800 : W >= 700 ? 720 : 560;   // a bigger logical screen = more room per card = smaller type on the glass, so nothing runs out of its box
      w = clamp(Math.round(t.angW / hf * W), mnW, 1000); h = Math.round(w / (TABHW.W / TABHW.H));
    } else {
      // on a phone, keep clear of the riding buttons (they stay live on top): measure them rather than guess
      let top = 24, bot = 24, L = 24, R = 24;
      if (TC.on && !$("touch").hidden) {
        const rc = id => { const e = $(id); return e && !e.hidden ? e.getBoundingClientRect() : null; };
        const tt = rc("tTop"), st = rc("tSteer"), right = ["tWh", "tLean", "tHop", "tHorn", "tBrk", "tGas"].map(rc).filter(Boolean);
        top = (tt ? tt.bottom : 56) + 8;
        if (W > H) { L = (st ? st.right : 170) + 10; R = W - Math.min(...right.map(r => r.left), W - 220) + 10; bot = 10; }
        else { L = R = 10; bot = H - Math.min(...right.map(r => r.top), st ? st.top : H - 220) + 8; }
      }
      w = Math.min(W - L - R, 1000); h = Math.min(H - top - bot, W < H ? w * 1.55 : w / 1.5625, 680);
      if (W > H && h < w / 2.2) w = Math.round(h * 2.2);
      this.ox = Math.round(L + (W - L - R - w) / 2); this.oy = Math.round(top + (H - top - bot - h) / 2);
    }
    this.w = Math.round(w); this.h = Math.round(h); this.lastQ = null;
    s.style.width = this.w + "px"; s.style.height = this.h + "px";
    s.style.setProperty("--tr", (dash ? Math.round(TABHW.R / TABHW.W * this.w) : 24) + "px");   // the display's rounded corners, same as the 3D glass
    s.classList.toggle("port", this.h > this.w); s.classList.toggle("dash", dash); s.classList.toggle("small", this.w < 640);
    this.render();
  },
  modeNow() { return VIEWS[camMode].fp && !FOOT.on && !(FISH && FISH.on) && !showroomOn() ? "dash" : "overlay"; },
  // before the camera: ease the dip in or out (0.3 s, smoothstep), and keep the mode in step with the view
  step(dt) {
    if (this.open && !this.can()) this.close(true);
    if (this.open && this.modeNow() !== this.mode) { this.layout(); }
    this.z = clamp(this.z + (this.open ? dt : -dt) / 0.3, 0, 1);
    this.e = this.z * this.z * (3 - 2 * this.z);
    if (!this.open && this.z === 0 && !$("tab").hidden) { $("tab").hidden = true; this.updBanner(); }
    this.noteTick();
    if (this.open) {
      const a = this.app && this.byId[this.app];
      if (a && a.tick) try { a.tick(dt); } catch (e) { console.error(e); }
      this.statT += dt; if (this.statT > 1) { this.statT = 0; this.statusBar(); }
      if (a && a.live && (this.liveT += dt) > a.live && !this.ptrDown) this.render();
      if (!a && (this.liveT += dt) > 2 && !this.ptrDown) this.render();
    }
  },
  // after the camera: put the DOM screen on the glass (dash) or on the page (overlay)
  place() {
    const el = $("tabS"), wrap = $("tab");
    if (wrap.hidden) return;
    if (this.mode === "dash") {
      const q = tabCorners(); if (!q) { el.style.opacity = 0; return; }
      // once the dip has settled the glass is nearly still: skip sub-pixel changes so the browser isn't re-rasterising the text every frame
      const L = this.lastQ, still = this.e >= 0.999 && L && L.length === 8 && !q.some((v, i) => Math.abs(v - L[i]) > 0.25);
      if (!still) { el.style.transform = tabHomography(this.w, this.h, q); this.lastQ = q.slice(); }
      const op = clamp((this.e - 0.5) / 0.4, 0, 1).toFixed(3); if (el.style.opacity !== op) el.style.opacity = op;
    } else {
      const k = 0.94 + 0.06 * this.e;
      el.style.transform = `translate(${this.ox + this.w * (1 - k) / 2}px,${this.oy + this.h * (1 - k) / 2 + (1 - this.e) * 14}px) scale(${k})`;
      el.style.opacity = this.e.toFixed(3);
    }
    if (this.e > 0.5 !== this.bannerIn) { this.bannerIn = this.e > 0.5; this.updBanner(); }
  }
};
$("tabS").addEventListener("mousedown", e => e.preventDefault());          // no DOM focus: Space still hops, Enter is ours
$("tabS").addEventListener("pointerdown", () => { TABLET.ptrDown = true; });
addEventListener("pointerup", () => { TABLET.ptrDown = false; });
$("tabS").addEventListener("pointerover", e => { if (e.pointerType !== "mouse") return; const t = e.target.closest("[data-tf]"); if (t && t.dataset.tf !== TABLET.focus) { TABLET.focus = t.dataset.tf; TABLET.paintFocus(false); } });
$("tabBack").addEventListener("click", () => TABLET.back());
$("tabX").addEventListener("click", () => TABLET.close());
addEventListener("resize", () => { if (TABLET.open) TABLET.layout(); });

// the dip: where the camera wants to be to read the screen, and the lens that makes it fill the view
const _tC = new THREE.Vector3(), _tN = new THREE.Vector3(), _tU = new THREE.Vector3(), _tE = new THREE.Vector3(), _tF = new THREE.Vector3(), _tD = new THREE.Vector3(), _tR = new THREE.Vector3(), _tM = new THREE.Matrix4(), _tQ = new THREE.Quaternion();
const _tX = new THREE.Vector3(), _tY = new THREE.Vector3(), _tZ = new THREE.Vector3();
function tabTarget() {
  V.tabScr.updateWorldMatrix(true, false);
  V.tabScr.matrixWorld.extractBasis(_tX, _tY, _tZ); _tX.normalize(); _tY.normalize(); _tZ.normalize();   // the glass's right, up and outward normal
  V.tabScr.getWorldPosition(_tC);
  // how far to sit: as far from the glass as the rider's leaned-in eye is (the eye, 10 cm forward and 7 cm down, in the sled's own space)
  sledRoot.updateMatrixWorld(); _tE.set(0, 1.59, -0.04); sledRoot.localToWorld(_tE);
  const d = Math.max(0.3, _tE.distanceTo(_tC)), angH = 2 * Math.atan(TABHW.H / 2 / d), angW = 2 * Math.atan(TABHW.W / 2 / d), asp = innerWidth / innerHeight;
  // the camera goes on the glass's normal at that distance and looks straight down it: the glass is then an exact rectangle in the view,
  // so the DOM screen can sit flush on it with no frame, and the whole rig is rigid to the sled (the glass is still however the sled pitches or rolls)
  _tE.copy(_tC).addScaledVector(_tZ, d);
  const fv = Math.max(angH / 0.62, 2 * Math.atan(Math.tan(angW / 0.9 / 2) / asp));           // ~62% of the height, or 90% of the width on an upright phone
  return { fov: clamp(fv * R2D, 12, 70), angW, angH, d };
}
function tabCamFP() {
  const t = tabTarget(); TABLET.fovT = t.fov;
  _tM.makeBasis(_tX, _tY, _tZ); _tQ.setFromRotationMatrix(_tM);                                   // camera right/up = glass right/up, looking along -normal
  camera.position.lerp(_tE, TABLET.e); camera.quaternion.slerp(_tQ, TABLET.e);
}
const _tv = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], _tc = new THREE.Vector3();
function tabCorners() {
  camera.updateMatrixWorld(); V.tabScr.updateWorldMatrix(true, false);
  const W = TABHW.W / 2, H = TABHW.H / 2, cs = [[-W, H], [W, H], [W, -H], [-W, -H]], out = [];
  for (let i = 0; i < 4; i++) {
    const v = _tv[i].set(cs[i][0], cs[i][1], 0).applyMatrix4(V.tabScr.matrixWorld);
    _tc.copy(v).applyMatrix4(camera.matrixWorldInverse); if (_tc.z > -0.02) return null;   // behind the lens
    v.project(camera); out.push((v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight);
  }
  return out;
}
// CSS matrix3d that maps the w x h screen onto the quad (TL, TR, BR, BL)
const TAB_FLAT = /Firefox\//.test(navigator.userAgent) || /[?&]flat\b/.test(location.search);   // ?flat forces it for testing
function tabHomography(w, h, q) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3, den = dx1 * dy2 - dx2 * dy1;
  const g = den ? (sx * dy2 - dx2 * sy) / den : 0, hh = den ? (dx1 * sy - sx * dy1) / den : 0;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3;
  // Firefox draws small text on a matrix3d with perspective as dust (glyphs go missing while the transform moves). The tilt is gentle, so there it gets
  // the best flat fit instead: axes from the quad's opposite edges averaged, centred on the quad's centre, so the leftover error is split evenly
  if (TAB_FLAT) {
    let ux = ((x1 - x0) + (x2 - x3)) / 2 / w, uy = ((y1 - y0) + (y2 - y3)) / 2 / w, vx = ((x3 - x0) + (x2 - x1)) / 2 / h, vy = ((y3 - y0) + (y2 - y1)) / 2 / h;
    const cx = (x0 + x1 + x2 + x3) / 4, cy = (y0 + y1 + y2 + y3) / 4;
    // a flat fit can't follow the glass's slight taper, so grow it just enough that the glass's four corners all sit inside the screen: nothing of the 3D glass shows round the edges
    const det = ux * vy - uy * vx;
    if (Math.abs(det) > 1e-9) {
      let k = 1;
      for (const [px, py] of [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) {
        const dx = px - cx, dy = py - cy, a = (vy * dx - vx * dy) / det, b = (-uy * dx + ux * dy) / det;   // the corner in the screen's own pixels, from its centre
        k = Math.max(k, Math.abs(a) / (w / 2), Math.abs(b) / (h / 2));
      }
      k = Math.min(k, 1.05); ux *= k; uy *= k; vx *= k; vy *= k;
    }
    return "matrix(" + [ux, uy, vx, vy, cx - ux * w / 2 - vx * h / 2, cy - uy * w / 2 - vy * h / 2].map(v => +v.toFixed(5)).join(",") + ")";
  }
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, x0, y0, 0, 1];
  return "matrix3d(" + m.map(v => +v.toFixed(7)).join(",") + ")";
}

// first person gets the dash tablet, every other view (third person, on foot) gets the HUD minimap, never both
let tvFP = null;
function tabView_sync() {
  const fp = !!(VIEWS[camMode].fp && !FOOT.on);
  if (V.tab) V.tab.visible = fp;
  if (fp === tvFP) return;
  tvFP = fp; document.body.classList.toggle("fpv", fp);
}

// the dash screen when you're not looking at it: a live heading-up map, the clock, and a strip for pings
function tabDash(dt) {
  const fp = VIEWS[camMode].fp && !FOOT.on;
  TABLET.dashT += dt; if (TABLET.dashT < (fp ? 0.1 : 0.5) || (fp && TABLET.e > 0.95)) return;
  TABLET.dashT = 0;
  const c = V.tabCv, g = c.getContext("2d"), W = c.width, H = c.height, top = 22;
  g.save();
  g.fillStyle = "#0d1822"; g.fillRect(0, 0, W, H);
  g.beginPath(); g.rect(0, top, W, H - top); g.clip();
  const cx = W / 2, cy = top + (H - top) * 0.66, span = 520, k = W / span, ang = P.yaw + Math.PI;
  g.save(); g.translate(cx, cy); g.rotate(ang); g.scale(k / M2SRC, k / M2SRC); g.translate(-(P.x + HALF) * M2SRC, -(P.z + HALF) * M2SRC);
  g.drawImage(mapBg, 0, 0); if (MELT.ovOn && MELT.kq > 0) g.drawImage(MELT.ov, 0, 0, MB, MB); g.drawImage(mapTrail, 0, 0);
  if (GS.groomJob) { const r = 2.4 * M2SRC / k; for (const p of GS.groomJob.pts) { g.fillStyle = p.done ? "#6fd08c" : "#ff8a3a"; g.beginPath(); g.arc((p.x + HALF) * M2SRC, (p.z + HALF) * M2SRC, r, 0, 6.283); g.fill(); } }
  g.restore();
  const cA = Math.cos(ang), sA = Math.sin(ang), toS = (x, z) => { const dx = (x - P.x) * k, dz = (z - P.z) * k; return [cx + dx * cA - dz * sA, cy + dx * sA + dz * cA]; };
  const pin = (x, z, col, ring) => {
    let [sx, sy] = toS(x, z); const ex = clamp(sx, 10, W - 10), ey = clamp(sy, top + 10, H - 10), edge = ex !== sx || ey !== sy;
    g.fillStyle = "#0d1822"; g.beginPath(); g.arc(ex, ey, edge ? 5 : 7, 0, 6.283); g.fill();
    g.fillStyle = col; g.beginPath(); g.arc(ex, ey, edge ? 3.2 : 4.6, 0, 6.283); g.fill();
    if (ring && !edge) { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(ex, ey, 10 + Math.sin(performance.now() * 0.006) * 2, 0, 6.283); g.stroke(); }
  };
  for (const s of SITES) { if (s.type === "shop" || s.x === undefined) continue; const [sx, sy] = toS(s.x, s.z); if (sx > -10 && sx < W + 10 && sy > top - 10 && sy < H + 10) { g.fillStyle = "#0d1822"; g.fillRect(sx - 4, sy - 4, 8, 8); g.fillStyle = s === depot ? "#7fc8e0" : "#eaf2f8"; g.fillRect(sx - 2.5, sy - 2.5, 5, 5); } }
  for (const j of GS.claims) pin((j.from || depot).x, (j.from || depot).z, "#7fc8e0", true);
  for (const j of GS.load) pin(j.dest.x, j.dest.z, "#ff5a1f", true);
  if (GS.groomJob) pin(GS.groomJob.dest.x, GS.groomJob.dest.z, "#ff8a3a", false);
  if (GS.tour) pin(GS.tour.view.x, GS.tour.view.z, "#6ff0b8", true);
  for (const p of TABLET.layerPts("rescue")) pin(p.x, p.z, "#ff3a1a", true);
  g.fillStyle = "#0d1822"; g.beginPath(); g.moveTo(cx, cy - 13); g.lineTo(cx - 9, cy + 9); g.lineTo(cx + 9, cy + 9); g.closePath(); g.fill();
  g.fillStyle = "#ff5a1f"; g.beginPath(); g.moveTo(cx, cy - 9); g.lineTo(cx - 6, cy + 6); g.lineTo(cx + 6, cy + 6); g.closePath(); g.fill();
  g.restore();
  // the status strip, and a ping when there is one
  const n = TABLET.live, blink = n && Math.floor(performance.now() / 400) % 2 === 0;
  g.fillStyle = n ? (blink ? "#ff5a1f" : "#3a1a0e") : "#101c27"; g.fillRect(0, 0, W, top);
  g.font = "600 13px 'Barlow Semi Condensed', sans-serif"; g.textBaseline = "middle"; g.fillStyle = "#eaf2f8";
  if (n) { g.textAlign = "left"; g.fillText((n.title || "").toUpperCase().slice(0, 34), 8, top / 2 + 1); }
  else {
    const cn = CAL.now(); g.textAlign = "left"; g.fillText(cn.time + "  " + cn.label.toUpperCase(), 8, top / 2 + 1);
    g.textAlign = "right"; g.fillStyle = "#6fd08c"; g.fillText(fmtCash(GS.cash), W - 8, top / 2 + 1);
  }
  g.strokeStyle = "rgba(234,242,248,.18)"; g.lineWidth = 1; g.beginPath(); g.moveTo(0, top + 0.5); g.lineTo(W, top + 0.5); g.stroke();
  // the ferry and the mail sack, top left under the status strip
  { const fi = ferryInfo(), rk = GS.mail.length ? mailRisk() : null;
    const t = `FERRY ${fi.at !== null ? fmtTime(fi.at) + " " + fmtLeftS(fi.left) : "—"}  ·  MAIL ${GS.mail.length ? mailCount() + " " + fmtCash(mailValue() * payMul()) : "0"}`;
    g.font = "600 12px 'Barlow Semi Condensed', sans-serif"; const tw = g.measureText(t).width + 12;
    g.fillStyle = "rgba(13,24,34,.85)"; g.fillRect(6, top + 5, tw, 17); g.fillStyle = !rk ? "#7fc8e0" : rk.fine || rk.lose ? "#ff6a4a" : "#ffb25a"; g.textAlign = "left"; g.fillText(t, 12, top + 14); }
  // where the arrow's pointing
  const tg = GS.load[0] ? GS.load[0].dest : GS.claims[0] ? (GS.claims[0].from || depot) : GS.tour ? GS.tour.view : null;
  if (tg) {
    const t = `→ ${tg.name.replace(/ (herder cabin|wind farm|lighthouse)$/, "")} ${fmtMi(Math.hypot(tg.x - P.x, tg.z - P.z))}`;
    g.font = "600 12px 'Barlow Semi Condensed', sans-serif"; const tw = g.measureText(t).width + 12;
    g.fillStyle = "rgba(13,24,34,.85)"; g.fillRect(W - tw - 6, H - 22, tw, 17); g.fillStyle = "#ff8a3a"; g.textAlign = "left"; g.fillText(t, W - tw, H - 13);
  }
  g.font = "italic 500 11px 'Barlow Semi Condensed', sans-serif"; g.fillStyle = "rgba(234,242,248,.55)"; g.textAlign = "left"; g.fillText(TC.on ? "TABLET" : "Tab", 7, H - 12);
  V.tabTex.needsUpdate = true;
}

// pings on the dash: two soft sine blips (three low ones for an alert), and a tick for moving around
function tabPing(kind) {
  if (!audio || muted) return;
  const { AC, master } = audio, t = AC.currentTime;
  const seq = kind === "alert" ? [[880, 0], [880, 0.16], [880, 0.32]] : kind === "note" ? [[1320, 0], [1760, 0.1]] : kind === "open" ? [[990, 0], [1480, 0.06]] : [[2200, 0]];
  const v = kind === "tick" ? 0.02 : kind === "open" ? 0.04 : 0.07;
  for (const [f, d] of seq) {
    const o = AC.createOscillator(), gg = AC.createGain(); o.type = "sine"; o.frequency.value = f;
    gg.gain.setValueAtTime(0.0001, t + d); gg.gain.exponentialRampToValueAtTime(v, t + d + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, t + d + (kind === "tick" ? 0.03 : 0.11));
    o.connect(gg); gg.connect(master); o.start(t + d); o.stop(t + d + 0.14);
  }
}
const tabEsc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
function tabNoteHtml(n, banner) {
  if (!n || !n.id) return "";
  const a = n.app && TABLET.byId[n.app];
  const hint = banner ? `<span class="tnk">${TC.on ? "tap to open" : "<kbd>Tab</kbd> to open"}</span>` : "";
  return `<div class="tni">${a ? a.icon : TICON.ping}</div><div class="tnb"><div class="tne">${a ? a.name.toUpperCase() : "TABLET"} · ${fmtTime(n.at)}${hint}</div><div class="tnt">${tabEsc(n.title)}</div>${n.body ? `<div class="tnx">${tabEsc(n.body)}</div>` : ""}${n.actions ? `<div class="tna">${n.actions.map((x, i) => `<button type="button" class="tbtn${i ? " ghost" : ""}" data-na="${i}" data-tf="note:${n.id}:${i}">${tabEsc(x.label)}</button>`).join("")}</div>` : ""}</div><button type="button" class="tnc" data-nx="1" aria-label="Dismiss">✕</button>`;
}
function tabBindNote(el, n) {
  if (!el || !n) return;
  el.className = (el.id === "tabBan" ? "tban " : "tnote ") + (n.kind || "info");
  el.onclick = e => {
    const b = e.target.closest("[data-na]"), x = e.target.closest("[data-nx]");
    if (b) { const act = n.actions[+b.dataset.na]; n.dismiss(); if (act && act.do) act.do(n); return; }
    if (x) { n.dismiss(); return; }
    if (el.id === "tabBan") { TABLET.toggle(true, n.app || undefined); }
  };
}

/* ---- icons: line glyphs in the survey chart's hand ---- */
const svgI = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const TICON = {
  parcels: svgI(`<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9M7.8 5.2l8.5 4.6"/>`),
  map: svgI(`<path d="M3 6.5 8.5 4l7 2.5L21 4v13.5L15.5 20l-7-2.5L3 20z"/><path d="M8.5 4v13.5M15.5 6.5V20"/><circle cx="12" cy="10" r="1.3" fill="currentColor"/>`),
  weather: svgI(`<circle cx="8.5" cy="8.5" r="3"/><path d="M8.5 2.5v1.3M3.8 4l.9.9M2.5 8.5h1.3M13.2 4l-.9.9"/><path d="M8 19h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 8 19z"/>`),
  calendar: svgI(`<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2"/>`),
  crew: svgI(`<path d="M3 17.5h18"/><path d="M5 17.5V12h8l2.5 3v2.5"/><path d="M13 12V9h-3"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="13" cy="19" r="1.5"/><path d="M15.5 15H21v2.5M17 12.5l2-2M19 12.5l2-2"/>`),
  logbook: svgI(`<path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>`),
  store: svgI(`<path d="M4 8h16l-1.3 12H5.3z"/><path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3"/>`),
  freight: svgI(`<path d="M2.5 15h12V7h-12zM14.5 10h3.8l3.2 3.2V15h-7"/><circle cx="6.5" cy="17" r="1.8"/><circle cx="17.5" cy="17" r="1.8"/>`),
  rescue: svgI(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M7.5 12h9"/>`),
  realestate: svgI(`<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5M10 20v-5h4v5"/><path d="M16 6V4h2v3.6"/>`),
  ping: svgI(`<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>`)
};

/* ---- the home screen ---- */
function tabHome(v) {
  const n = CAL.now(), here = WX.at(P.x, P.z), wxw = here > 0.55 ? "storm" : here > 0.2 ? "snow showers" : "clear";
  const st = CAL.sunTimes(), sun = st.polar ? "no sunrise today" : st.midnight ? "midnight sun" : `sun up ${fmtTime(st.up)}, down ${fmtTime(st.down)}`;
  const rk = rankOf(GS.delivered);
  const tiles = TABLET.apps.filter(a => !(a.hidden && a.hidden())).map(a => {
    const bd = a.badge ? a.badge() : ""; return `<button type="button" class="ttile${a.locked ? " locked" : ""}" data-tf="app:${a.id}" data-app="${a.id}"><span class="tic">${a.icon}${bd ? `<b class="tbdg">${bd}</b>` : ""}</span><span class="tnm">${tabEsc(a.name)}</span></button>`;
  }).join("");
  const log = TABLET.log.slice(0, 4).map(q => `<div class="tlg"><span>${fmtTime(q.at)}</span><b>${tabEsc(q.title)}</b><i>${tabEsc(q.body)}</i></div>`).join("");
  v.innerHTML = `<div class="thome">
    <div class="thero"><div><div class="tey">NORDKINN · ${tabEsc(CAL.season().name.toUpperCase())}</div><div class="tbig">${n.time}</div><div class="tsml">${n.long}</div></div>
      <div class="tchips">${CAL.isPolarNight() ? `<span class="bchip polar">POLAR NIGHT ×1.5</span>` : ""}${AUR.v > 0.3 ? `<span class="bchip aurora">AURORA · ${AUR.word(AUR.v).toUpperCase()}</span>` : ""}<span class="bchip">${tabEsc(rk.name.toUpperCase())}</span></div></div>
    <p class="tnote2">It's ${wxw} out here, ${sun}. ${GS.load.length ? `${GS.load.length} load${GS.load.length > 1 ? "s" : ""} aboard.` : GS.claims.length ? `${GS.claims.length} waiting for you at the quay.` : "Nothing aboard."}</p>
    <div class="tgrid">${tiles}</div>
    ${log ? `<div class="tsec"><span>Dash pings</span><span></span></div><div class="tlog">${log}</div>` : ""}
  </div>`;
  for (const b of v.querySelectorAll(".ttile")) b.addEventListener("click", () => TABLET.go(b.dataset.app));
}

/* ---- work: the same refresh the board did when you opened it ---- */
function tabWork() {
  updGroom();
  const stale = roaming() && (!GS.jobsAt || Math.hypot(P.x - GS.jobsAt.x, P.z - GS.jobsAt.z) > ROAM_NEAR) && !GS.jobs.some(j => j.from === GS.near);
  if (!GS.jobs.length) makeJobs(roaming() ? (GS.near && GS.near !== garageSite ? GS.near : nearestSite()) : depot);
  else if (stale) roamJobs(GS.near && GS.near !== garageSite ? GS.near : nearestSite());
  if (!GS.contracts || !GS.contracts.some(c => !c.locked) || (GS.contractsWinch || 0) !== ST.winch || (ST.winch && GS.contracts.some(c => c.locked === "Recovery call-outs"))) makeContracts(depot);
  tourSync();
}
const claimSmall = () => GS.claims.filter(j => !j.big && !j.tour).length;
const claimBays = () => GS.claims.filter(j => j.big).reduce((a, j) => a + j.bays, 0);
const atQuay = () => GS.near === depot;
// Taking work from the tablet: at the quay it goes straight on the sled, the way the board did. Anywhere else
// it's claimed, and it loads when you stop at the pickup (the quay, for now: O3 brings pickups elsewhere).
const atPickup = j => GS.near === (j.from || depot);
function takeParcel(k) {
  const j = GS.jobs[k]; if (!j) return;
  if (atPickup(j)) { acceptJob(k); return; }
  if (smallLoads().length + claimSmall() >= ST.slots) { toast(`Your rack's spoken for: ${smallLoads().length} aboard and ${claimSmall()} claimed.`, "warn"); return; }
  j.from = j.from || depot; GS.claims.push(j); GS.jobs.splice(k, 1);
  toast(`Claimed: ${j.cargo} for ${shortName(j.dest)}. Pick it up at ${j.from.name}.`);
  TABLET.refresh(); save();
}
function contractBlock(c) {
  const hitch = GS.own.parts.hitch;
  if (c.tour) return GS.tour || GS.claims.some(x => x.tour) ? "You've already got tourists booked." : "";
  if (c.rescue) return ST.winch < c.needTier ? `Needs a ${["", "hand", "electric", "heavy-duty"][c.needTier]} winch or better. The garage across the road sells them.` : GS.rescueJob || SAR.cur ? "Finish the call you're on first." : "";
  if (c.groom) return !isGroomer(hitch) ? "That's grooming work. You need a groomer drag on the hitch: the garage sells them." : GS.groomJob ? "Finish the line you're grooming first." : "";
  if (c.big && !licensed("freight")) return "Needs your Freight licence. Sign up for Freight school above.";
  if (SCHOOL.on) return "Finish (or quit) the course first.";
  const okHitch = c.need === "flatbed" ? hitch === "flatbed" : hitch === "trailer" || hitch === "flatbed";
  if (!okHitch) return `Needs ${HITCH_NAME[c.need]} on the hitch. The garage across the road sells them.`;
  if (baysUsed() + claimBays() + c.bays > ST.bays) return ST.bays > 1 ? "The flatbed's full (or spoken for)." : "The trailer's already loaded (or spoken for).";
  if (GS.cash < c.bond) return `The shipper wants a $${c.bond} bond up front. You have $${GS.cash}.`;
  return "";
}
function takeContract(k) {
  const c = GS.contracts && GS.contracts[k]; if (!c || c.locked) return;
  if (SCHOOL.on) { toast("Finish (or quit) the course first.", "warn"); return; }
  const why = contractBlock(c);
  if (c.groom || c.rescue || GS.near === (c.from || depot)) { if (why && c.big) { toast(why, "warn"); return; } acceptContract(k); return; }
  if (why) { toast(why, "warn"); return; }
  c.from = c.from || depot; GS.claims.push(c); GS.contracts.splice(k, 1);
  toast(c.tour ? `Booked: ${c.pax} for ${c.dest.name}. They're waiting at the quay.` : `Claimed: ${c.cargo} for ${shortName(c.dest)}. It's waiting at ${c.from === depot ? "the quay" : c.from.name}; the $${c.bond} bond is paid when you strap it down.`);
  TABLET.refresh(); save();
}
// stopped at a pickup: load whatever's claimed there (each claim retries every few seconds if it can't go yet)
function collectClaims(site) {
  for (const j of GS.claims.slice()) {
    if ((j.from || depot) !== site || gameClock - (j.tryT || -99) < 6) continue;
    j.tryT = gameClock; GS.claims.splice(GS.claims.indexOf(j), 1);
    if (j.tour) { acceptTour(j); continue; }
    const list = j.big ? (GS.contracts = GS.contracts || []) : GS.jobs; list.push(j); const k = list.length - 1;
    if (j.big) acceptContract(k); else acceptJob(k);
    if (list[k] === j) { list.splice(k, 1); GS.claims.push(j); }      // couldn't load it (the toast said why): it waits
  }
}

/* ---- charts for the apps: a label-free survey chart (one raster, built once), with your trails tinted on ---- */
function tabChart() {
  if (TABLET.plain || !CT.ready) return TABLET.plain;
  const S = GFX.low ? 1536 : 2048, cv = document.createElement("canvas"); cv.width = cv.height = S;
  const g = cv.getContext("2d"); ctRaster(g, S);
  const px1 = CT_REF / S, G2R = CT_REF / (CT.N - 1);
  g.setTransform(S / CT_REF, 0, 0, S / CT_REF, 0, 0); g.lineCap = "round"; g.lineJoin = "round";
  const segs = (a, style, w) => { g.strokeStyle = style; g.lineWidth = w; g.beginPath(); for (let i = 0; i < a.length; i += 4) { g.moveTo(a[i] * G2R, a[i + 1] * G2R); g.lineTo(a[i + 2] * G2R, a[i + 3] * G2R); } g.stroke(); };
  CT.water.forEach((a, i) => segs(a, `rgba(182,210,230,${[0.15, 0.22, 0.3, 0.4, 0.52][i]})`, 0.6 * px1 * 2));
  CT.lv.forEach((a, i) => { const idx = CT_LEVELS[i] % 100 === 0; segs(a, idx ? "#8f5a34" : "#b67d51", (idx ? 1.6 : 0.8) * px1 * 2); });
  segs(CT.lakes, "rgba(58,98,132,.9)", px1 * 1.6);
  segs(CT.coast, "rgba(22,40,58,.95)", px1 * 2);
  g.strokeStyle = "rgba(48,102,150,.26)"; g.lineWidth = px1 * 1.5; g.beginPath();
  for (let q = 1; q * CT_KM < CT_REF; q++) { const p = q * CT_KM; g.moveTo(p, 0); g.lineTo(p, CT_REF); g.moveTo(0, p); g.lineTo(CT_REF, p); }
  g.stroke();
  return TABLET.plain = cv;
}
function tabPaper() {
  const base = tabChart(); if (!base) return null;
  if (TABLET.paper && performance.now() - TABLET.paperT < 4000) return TABLET.paper;
  const S = base.width, cv = TABLET.paper || (TABLET.paper = document.createElement("canvas")); if (cv.width !== S) cv.width = cv.height = S;
  const g = cv.getContext("2d"); g.drawImage(base, 0, 0);
  const t = CT.tint || (CT.tint = document.createElement("canvas")); t.width = t.height = MB;
  const tg = t.getContext("2d"); tg.clearRect(0, 0, MB, MB); tg.drawImage(mapTrail, 0, 0);
  tg.globalCompositeOperation = "source-in"; tg.fillStyle = "#8c3a1c"; tg.fillRect(0, 0, MB, MB); tg.globalCompositeOperation = "source-over";
  g.globalAlpha = 0.72; g.drawImage(t, 0, 0, S, S); g.globalAlpha = 1;
  TABLET.paperT = performance.now();
  return cv;
}
// a view of the chart: world box [x0, z0, span] onto a w x h canvas
function tabView(g, W, H, x0, z0, sx, sz) {
  const p = tabPaper(), k = p ? p.width / WORLD : 1;
  g.fillStyle = "#2e4b63"; g.fillRect(0, 0, W, H);
  if (p) { g.imageSmoothingEnabled = true; g.drawImage(p, (x0 + HALF) * k, (z0 + HALF) * k, sx * k, sz * k, 0, 0, W, H); }
  return (x, z) => [(x - x0) / sx * W, (z - z0) / sz * H];
}
function tabPin(g, x, y, col, glyph, r = 9) {
  g.save(); g.translate(x, y);
  g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-r * 0.35, -r * 0.9, -r, -r * 1.25, -r, -r * 1.9); g.arc(0, -r * 1.9, r, Math.PI, 0); g.bezierCurveTo(r, -r * 1.25, r * 0.35, -r * 0.9, 0, 0); g.closePath();
  g.fillStyle = col; g.fill(); g.lineWidth = 2; g.strokeStyle = "rgba(237,230,211,.95)"; g.stroke();
  if (glyph) { g.fillStyle = "#fff"; g.font = `700 ${Math.round(r * 1.15)}px 'Barlow Semi Condensed', sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(glyph, 0, -r * 1.86); }
  g.restore();
}
// the fuel icon: an amber badge with a little pump in it. A station stands alone; a cabin's sits on its corner.
function tabFuel(g, w2c, p, sc) {
  const [x0, y0] = w2c(p.x, p.z), st = p.kind === "station", r = st ? 10 : 8, x = st ? x0 : x0 + 11, y = st ? y0 : y0 - 9, col = "#d98a14";
  g.save(); g.translate(x, y);
  g.fillStyle = col; g.strokeStyle = "rgba(237,230,211,.95)"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill(); g.stroke();
  const s = r * 0.62; g.fillStyle = "#fff"; g.strokeStyle = "#fff"; g.lineWidth = Math.max(1.2, s * 0.24); g.lineCap = "round"; g.lineJoin = "round";
  g.fillRect(-s * 0.7, -s * 0.85, s * 0.9, s * 1.7); g.fillStyle = col; g.fillRect(-s * 0.5, -s * 0.62, s * 0.5, s * 0.46);
  g.beginPath(); g.moveTo(s * 0.3, -s * 0.4); g.lineTo(s * 0.72, -s * 0.2); g.lineTo(s * 0.72, s * 0.45); g.stroke();
  g.restore();
  tabLabel(g, (st && sc > 1.2 ? p.name + " · " : "") + "$" + p.price.toFixed(2), x, y + r + 12, 11, "#8a5a0a");
}
function tabLabel(g, t, x, y, size, col, italic) {
  g.font = `${italic ? "italic 500" : "600"} ${size}px 'Barlow Semi Condensed', sans-serif`; g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.lineJoin = "round"; g.strokeStyle = "rgba(237,230,211,.92)"; g.lineWidth = Math.max(3, size * 0.3); g.strokeText(t, x, y); g.fillStyle = col; g.fillText(t, x, y);
}
function tabSites(g, w2c, scale, hot) {
  for (const s of SITES) {
    if (s.x === undefined || s.type === "shop") continue;
    const [x, y] = w2c(s.x, s.z), home = s.type === "home", hz = hot.has(s);
    if (home && scale < 0.6 && !hz) { g.fillStyle = CT_INK; g.fillRect(x - 2, y - 2, 4, 4); continue; }
    g.fillStyle = "rgba(237,230,211,.95)"; g.fillRect(x - (home ? 4 : 5.5), y - (home ? 4 : 5.5), home ? 8 : 11, home ? 8 : 11);
    g.fillStyle = s === depot ? "#1f4a66" : CT_INK; g.fillRect(x - (home ? 2.5 : 3.8), y - (home ? 2.5 : 3.8), home ? 5 : 7.6, home ? 5 : 7.6);
    const nm = s === depot ? "KJØLLEFJORD QUAY" : (CT_LBL[s.id] ? CT_LBL[s.id].t : s.name);
    if (!home || hz || scale > 1.4) tabLabel(g, home ? s.name : nm, x, y - 10, home ? 12 : 13, hz ? CT_ACC : "#2a2119", home);
  }
}
function tabRoute(g, w2c, P, col = CT_ACC) {
  if (!P || P.length < 2) return;
  g.save(); g.lineJoin = "round"; g.beginPath(); for (let i = 0; i < P.length; i++) { const [x, y] = w2c(P[i][0], P[i][1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.lineCap = "round"; g.strokeStyle = "rgba(237,230,211,.9)"; g.lineWidth = 5.5; g.stroke();
  g.setLineDash([6, 4]); g.lineDashOffset = -((performance.now() * 0.014) % 10); g.lineCap = "butt"; g.strokeStyle = col; g.lineWidth = 2.4; g.stroke(); g.restore();
}
// the little map on a job card: pickup and drop-off pins with the trail line between them
function tabMini(cv, from, to, opt = {}) {
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.max(60, Math.round(cv.clientWidth * dpr)) || cv.width, H = Math.max(40, Math.round(cv.clientHeight * dpr)) || cv.height;
  if (cv.width !== W) cv.width = W; if (cv.height !== H) cv.height = H;
  const g = cv.getContext("2d");
  const route = opt.groom ? [[from.x, from.z], [to.x, to.z]] : from === depot && CT.routes[to.id] ? CT.routes[to.id].P : [[from.x, from.z], [to.x, to.z]];
  let x0 = Math.min(from.x, to.x), x1 = Math.max(from.x, to.x), z0 = Math.min(from.z, to.z), z1 = Math.max(from.z, to.z);
  for (const p of route) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  const pad = Math.max(160, 0.16 * Math.max(x1 - x0, z1 - z0)); x0 -= pad; x1 += pad; z0 -= pad * 1.3; z1 += pad * 0.8;
  let sx = x1 - x0, sz = z1 - z0; const asp = W / H;
  if (sx / sz < asp) { const n = sz * asp; x0 -= (n - sx) / 2; sx = n; } else { const n = sx / asp; z0 -= (n - sz) / 2; sz = n; }
  const w2c = tabView(g, W, H, x0, z0, sx, sz);
  g.save(); g.scale(dpr, dpr);
  const w2 = (x, z) => { const [a, b] = w2c(x, z); return [a / dpr, b / dpr]; };
  tabRoute(g, w2, route, opt.groom ? "#1f6a8a" : CT_ACC);
  const [ax, ay] = w2(from.x, from.z), [bx, by] = w2(to.x, to.z);
  tabPin(g, ax, ay, "#1f4a66", "P", 7.5); tabPin(g, bx, by, opt.col || CT_ACC, opt.glyph || "D", 7.5);
  g.restore();
}
function tabMinis(el) { for (const cv of el.querySelectorAll("canvas[data-mini]")) { const [f, t, kind] = cv.dataset.mini.split("|"); const F = SITES.find(s => s.id === f) || depot, T = SITES.find(s => s.id === t) || LOOKOUTS.find(s => s.id === t) || (TABLET.miniDest && TABLET.miniDest[t]); if (T) tabMini(cv, F, T, kind === "g" ? { groom: true, glyph: "G", col: "#1f6a8a" } : kind === "t" ? { glyph: "A", col: "#2f8f6a" } : kind === "r" ? { glyph: "!", col: "#b8321f" } : {}); } }

/* ---- the apps ---- */
const chip = (t, c) => `<span class="bchip${c ? " " + c : ""}">${t}</span>`;
function parcelChips(j) { return (j.soft ? chip("SLUSH +15%", "heavy") : "") + (j.steamer ? chip("OFF THE FERRY", "due") : "") + (j.long ? chip("LONG HAUL", "heavy") : "") + (j.tipL ? chip("FUEL TIP", "ok") : "") + (j.roam && GS.near && j.from === GS.near ? chip("PICKUP HERE", "ok") : "") + (j.local && !j.steamer && !j.roam ? chip("NEAR TOWN") : "") + (j.fragile ? chip("FRAGILE", "fragile") : "") + (j.boat ? chip("FOR THE BOAT", "due") : "") + (j.due ? chip(`${j.boat ? "SAILS" : "DUE"} ${fmtTime(j.due)}`, "due") : ""); }
function tabCard(o) {
  return `<div class="tcard${o.cls ? " " + o.cls : ""}"${o.tf ? ` data-tf="${o.tf}"` : ""}>
    ${o.mini ? `<canvas class="tmini" data-mini="${o.mini}"></canvas>` : ""}
    <div class="tcb"><div class="tct"><span>${tabEsc(o.title)}</span>${o.chips || ""}</div>
      <div class="tcm">${o.meta || ""}</div>${o.note ? `<div class="tcn">${o.note}</div>` : ""}${o.warn ? `<div class="tcw">${tabEsc(o.warn)}</div>` : ""}
      ${o.pay || o.act ? `<div class="tca"><span class="tpay">${o.pay || ""}</span>${o.act ? `<button type="button" class="tbtn${o.blocked ? " blocked" : ""}" data-act="${o.act}">${tabEsc(o.actLabel)}</button>` : ""}</div>` : ""}
    </div></div>`;
}
function tabHead(eye, title, right) { return `<div class="thd"><div><div class="tey">${eye}</div><div class="tti">${title}</div></div>${right ? `<div class="tmoney">${right}</div>` : ""}</div>`; }
const sec = (a, b) => `<div class="tsec"><span>${a}</span><span>${b || ""}</span></div>`;

TABLET.register({
  id: "parcels", name: "Parcels", icon: TICON.parcels, order: 1,
  badge: () => GS.load.filter(j => !j.big).length || GS.jobs.length || (GS.contracts || []).filter(c => c.tour).length || "",
  onOpen() { tabWork(); ctRoutes(); },
  render(el) {
    const sm = smallLoads(), rk = rankOf(GS.delivered), nx = RANKS[RANKS.indexOf(rk) + 1];
    const area = roaming() && GS.jobsAt ? shortName(GS.jobsAt.site).toUpperCase() : null;
    let h = tabHead(area ? `PARCELS · WORK AROUND ${area}` : "PARCELS · PICKUP KJØLLEFJORD QUAY", "Parcels", fmtCash(GS.cash));
    h += `<div class="tsub">${rk.name} · ${GS.delivered} delivered${nx ? ` · ${nx.name} at ${nx.at}` : ""}${CAL.isPolarNight() ? " " + chip("POLAR NIGHT ×1.5", "polar") : ""}</div>`;
    const aboard = sm.filter(j => !j.big);
    h += sec("Aboard", `Rack ${sm.length}/${ST.slots}${claimSmall() ? ` · ${claimSmall()} claimed` : ""}`);
    if (!aboard.length) h += `<p class="tnote2">Nothing on the rack.</p>`;
    aboard.forEach((j, i) => { h += tabCard({ tf: "ab:" + i, mini: `${(j.from || depot).id}|${j.dest.id}`, title: j.cargo, chips: parcelChips(j), meta: `to ${shortName(j.dest)} · ${fmtMi(Math.hypot(j.dest.x - P.x, j.dest.z - P.z))} from you${j.hits ? " · knocked about" : ""}`, pay: payTxt(j) }); });
    const cl = GS.claims.filter(j => !j.big && !j.tour);
    if (cl.length) { h += sec("Claimed · waiting at the pickup", ""); cl.forEach((j, i) => { h += tabCard({ tf: "cl:" + i, mini: `${(j.from || depot).id}|${j.dest.id}`, title: j.cargo, chips: parcelChips(j), meta: `pick up at ${(j.from || depot).name} (${fmtMi(Math.hypot((j.from || depot).x - P.x, (j.from || depot).z - P.z))} from you), then to ${shortName(j.dest)} · ${jobKm(j).toFixed(1)} km`, pay: payTxt(j) }); }); }
    if (FISH) h += FISH.parcelsHtml({ sec, tabCard, chip, fmtCash, fmtTime, esc: tabEsc });           // fresh-fish orders from the homes and cabins
    h += sec("Posted", roaming() ? "claim it, ride to the P, it loads; at the P it loads straight on" : atQuay() ? "you're at the pickup: it loads straight on" : "claim now, pick up at the quay");
    if (!GS.jobs.length) h += `<p class="tnote2">${MELT.k > 0.5 ? "Nothing posted. With the snow going, folk are waiting for the boat instead." : "No parcels posted. Check back after the next boat."}</p>`;
    else if (MELT.kq > 0 && meltWork() < 0.85) h += `<p class="tnote2">The melt's on: less work, and only where the trail still holds. Melting trails pay a little extra.</p>`;
    GS.jobs.forEach((j, k) => {
      const here = atPickup(j), full = smallLoads().length + claimSmall() >= ST.slots && !here || (here && smallLoads().length >= ST.slots);
      const f = j.from || depot, g = groom[j.dest.id] || 0, fromQ = f === depot && !j.roam;
      h += tabCard({ tf: "job:" + k, mini: `${f.id}|${j.dest.id}`, title: j.cargo, chips: parcelChips(j),
        meta: fromQ ? `Kjøllefjord quay → ${shortName(j.dest)} · ≈ ${routeKm(j.dest).toFixed(1)} km by trail · climb ${climbOf(j.dest)} m · <span class="${gsCls(g)}">${groomLabel(g)}</span>`
          : `${shortName(f)} → ${shortName(j.dest)} · ≈ ${jobKm(j).toFixed(1)} km · climb ${jobClimb(j)} m · ${here ? "pickup is here" : "pickup " + fmtMi(Math.hypot(f.x - P.x, f.z - P.z)) + " from you"}`,
        note: `${fromQ ? groomSay(g) : j.long ? "A long haul across the peninsula: good money, but it takes you a long way from the ferry." : ""}${j.tipL ? ` Part of the pay is fuel: ${tipLiters(j)} L straight into your tank (whatever won't fit is paid in cash).` : ""}${j.fragile ? ` Fragile: each hard knock costs ${ST.care ? "7.5" : "15"}% of the pay.` : ""}${j.due ? ` Due ${fmtTime(j.due)}, late pays half.` : ""}`,
        warn: full ? (ST.slots === 1 ? "Your rack holds one parcel. The garage sells longer decks." : `You're full at ${ST.slots} parcels.`) : "",
        pay: payTxt(j), act: "take:" + k, actLabel: here ? "LOAD IT" : "CLAIM", blocked: full });
    });
    // aurora tours: passengers off the ferry, so they live here with the parcels (they ride the seat, not the rack)
    const tours = conList(c => c.tour), ctour = GS.claims.filter(j => j.tour);
    if (GS.tour || ctour.length || tours.n) {
      h += sec("Aurora tours", AUR.v > 0.3 ? "the lights are up" : "");
      if (GS.tour) h += tabCard({ tf: "tr", mini: `depot|${GS.tour.view.id}|t`, title: "Aurora tour · under way", chips: chip("AURORA · " + AUR.word(AUR.v).toUpperCase(), "aurora"), meta: `${tabEsc(GS.tour.pax)} → ${GS.tour.view.name}`, pay: "~" + fmtCash(GS.tour.base * tourMul(AUR.v) * payMul()) });
      ctour.forEach((c, i) => { h += tabCard({ tf: "tcl:" + i, mini: `depot|${c.dest.id}|t`, title: "Aurora tour · booked", chips: chip("AURORA", "aurora"), meta: `${tabEsc(c.pax)} → ${c.dest.name} · waiting at the quay`, pay: "~" + fmtCash(c.pay * tourMul(AUR.v) * payMul()) }); });
      h += tours.h;
    }
    h += `<p class="tnote2">Pay shown is what lands on delivery. Late pays half; fragile loads lose pay with every knock. Trailer freight is in the Freight app, grooming in Trail Crew.</p>`;
    el.innerHTML = `<div class="tapp">${h}</div>`;
    for (const b of el.querySelectorAll("[data-act^=take]")) b.addEventListener("click", () => takeParcel(+b.dataset.act.split(":")[1]));
    conBind(el);
    if (FISH) FISH.parcelsBind(el);
  }
});

TABLET.register({
  id: "map", name: "Map", icon: TICON.map, order: 2,
  onOpen() { tabWork(); ctRoutes(); this.t = 0; this.zoom = this.zoom || 0; },
  layersOn: { del: true, pins: true, rescue: true, depots: true, routes: true, fuel: true },
  render(el) {
    const L = this.layersOn, ch = (id, t, n) => `<button type="button" class="tml${L[id] ? " on" : ""}" data-tf="lay:${id}" data-lay="${id}"><i class="k ${id}"></i>${t}${n !== undefined ? ` <b>${n}</b>` : ""}</button>`;
    const resc = TABLET.layerPts("rescue"), dep = TABLET.layerPts("depots"), fue = TABLET.layerPts("fuel");
    // the chart fills the page; the layer chips, the zoom button and the ferry/mail widget float on top of it
    el.innerHTML = `<div class="tmap"><div class="tmapc"><canvas id="tabMapC"></canvas></div>
      <div class="tmtop"><div class="tlays">${ch("del", "Deliveries", GS.load.length)}${ch("pins", "Pickup / drop-off", GS.claims.length + GS.jobs.length)}${ch("rescue", "Rescues", resc.length)}${ch("depots", "Depots", dep.length)}${ch("fuel", "Fuel", fue.length)}${MELT.kq > 0 ? ch("routes", "Trails · melt", Object.values(MELT.route).filter(v => v === "closed").length + " shut") : ""}</div>
        <button type="button" class="tbtn ghost" data-tf="zoom" id="tabZoom">${this.zoom ? "WHOLE MAP" : "AROUND ME"}</button></div>
      <div class="twid" id="tabWid"></div></div>`;
    for (const b of el.querySelectorAll("[data-lay]")) b.addEventListener("click", () => { L[b.dataset.lay] = !L[b.dataset.lay]; TABLET.render(); });
    $("tabZoom").addEventListener("click", () => { this.zoom = this.zoom ? 0 : 1; TABLET.render(); });
    this.cv = $("tabMapC"); this.t = 1; this.tick(0); this.widget();
  },
  widget() {
    const el = $("tabWid"); if (!el) return;
    const f = TABLET.widget.ferry(), m = TABLET.widget.mail(), c = f.call;
    const stTxt = !c ? "" : c.state === "delayed" ? ` · <em class="late">+${c.delay} h late</em>` : "";
    const risk = !m ? "hand in at the quay" : m.lose ? `<em class="bad">miss her: pay $${m.lose}</em>` : m.fine ? `<em class="late">miss her: $${m.fine} fine</em>` : m.worst ? "missed one boat · next is a fine" : "rides the next boat free";
    const rt = MELT.kq > 0 ? Object.values(MELT.route) : null;
    el.innerHTML = (rt ? `<div class="twr"><span>Trails · the melt</span><b>${rt.filter(v => v !== "closed").length}/${rt.length}</b><i>open · ${rt.filter(v => v === "melting").length} melting · <em class="bad">${rt.filter(v => v === "closed").length} closed</em></i></div>` : "") + `<div class="twr"><span>${f.label}${c ? " · " + c.dir : ""}</span><b>${f.at !== null ? fmtTime(f.at) : "—"}</b><i>${f.left !== null ? (f.alongside ? "alongside · " : "") + "in " + fmtLeft(f.left) : "no sailings"}${stTxt}${f.cancelled ? ` · <em class="bad">${fmtTime(f.cancelled.sDep)} cancelled</em>` : ""}</i></div><div class="twr"><span>Mail sack</span><b>${m ? m.count : 0}</b><i>${m ? `piece${m.count > 1 ? "s" : ""}${m.batches > 1 ? " · " + m.batches + " batches" : ""}` : "empty"}</i></div><div class="twr"><span>Mail value</span><b>${fmtCash(m ? m.value * payMul() : 0)}</b><i>${risk}</i></div>`;
  },
  tick(dt) {
    this.t += dt; if (this.t < 0.2 || !this.cv) return; this.t = 0;
    if ((this.wt = (this.wt || 0) + 0.2) > 1) { this.wt = 0; this.widget(); }
    const cv = this.cv, box = cv.parentElement, dpr = Math.min(2, devicePixelRatio || 1), W = box.clientWidth, H = box.clientHeight; if (W < 60 || H < 60) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px"; }
    const S = Math.min(W, H), sz = this.zoom ? 1800 : WORLD * 0.98 * Math.max(1, H / W * 1.02), sx = sz * W / H;   // the whole peninsula fits; around-me is 1.8 km tall
    const cx = this.zoom ? clamp(P.x, -HALF + sx / 2, HALF - sx / 2) : 0, cz = this.zoom ? clamp(P.z - sz * 0.05, -HALF + sz / 2, HALF - sz / 2) : 0;
    const g = cv.getContext("2d"), w2c0 = tabView(g, cv.width, cv.height, this.zoom && sx > WORLD ? -sx / 2 : cx - sx / 2, cz - sz / 2, sx, sz), span = sz;
    g.save(); g.scale(dpr, dpr); const w2c = (x, z) => { const [a, b] = w2c0(x, z); return [a / dpr, b / dpr]; }, sc = H / span * 10;   // px per 10 m
    const L = this.layersOn, hot = new Set();
    if (L.routes && MELT.kq > 0) tabMelt(g, w2c, sc);
    if (L.del) for (const j of GS.load) hot.add(j.dest);
    if (L.pins) for (const j of GS.claims.concat(GS.jobs)) hot.add(j.dest);
    if (GS.groomJob) for (const p of GS.groomJob.pts) { const [x, y] = w2c(p.x, p.z); g.fillStyle = p.done ? "#2f7a4a" : CT_ACC; g.beginPath(); g.arc(x, y, 2.4, 0, 6.283); g.fill(); }
    if (L.del) for (const j of GS.load) { const r = CT.routes[j.dest.id]; if (r && (j.from || depot) === depot) tabRoute(g, w2c, r.P); }
    tabSites(g, w2c, sc, hot);
    for (const v of LOOKOUTS) { if (v.x === undefined) continue; const [x, y] = w2c(v.x, v.z); g.fillStyle = "#2f8f6a"; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x - 5.5, y + 4); g.lineTo(x + 5.5, y + 4); g.closePath(); g.fill(); if (AUR.v > 0.38 || (GS.tour && GS.tour.view === v) || sc > 1.4) tabLabel(g, v.name, x, y + 16, 12, "#2f6a52", true); }
    if (L.pins) {
      for (const j of GS.jobs) { const [x, y] = w2c(j.dest.x, j.dest.z); g.globalAlpha = 0.6; tabPin(g, x, y, CT_ACC, "D", 7); g.globalAlpha = 1; }
      for (const j of GS.claims) { const [x, y] = w2c(j.dest.x, j.dest.z); tabPin(g, x, y, j.tour ? "#2f8f6a" : CT_ACC, j.tour ? "A" : "D", 8); }
      for (const f of new Set(GS.claims.concat(GS.jobs).map(j => j.from || depot))) { const [x, y] = w2c(f.x, f.z); tabPin(g, x, y, "#1f4a66", "P", 9); }
    }
    if (L.del) { for (const j of GS.load) { const [x, y] = w2c(j.dest.x, j.dest.z); tabPin(g, x, y, CT_ACC, "D", 10); } if (GS.tour) { const [x, y] = w2c(GS.tour.view.x, GS.tour.view.z); tabPin(g, x, y, "#2f8f6a", "A", 10); } if (GS.groomJob) { const [x, y] = w2c(GS.groomJob.dest.x, GS.groomJob.dest.z); tabPin(g, x, y, "#1f6a8a", "G", 9); } }
    if (L.rescue) for (const p of TABLET.layerPts("rescue")) if (p.area) tabSarArea(g, w2c, p, H / span);
    if (L.rescue) for (const p of TABLET.layerPts("rescue")) { if (p.area || p.kind === "ping") { const [x, y] = w2c(p.x, p.z); if (p.kind === "ping") { g.globalAlpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.01); tabPin(g, x, y, "#b8321f", "?", 9); g.globalAlpha = 1; } tabLabel(g, p.name, x, y + (p.area ? 0 : 14), 12, "#b8321f"); continue; } const [x, y] = w2c(p.x, p.z); g.strokeStyle = "#b8321f"; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 19, 13 + Math.sin(performance.now() * 0.008) * 2, 0, 6.283); g.stroke(); tabPin(g, x, y, "#b8321f", "!", 10); if (p.name) tabLabel(g, p.name, x, y + 14, 12, "#b8321f"); }
    if (L.fuel) for (const p of TABLET.layerPts("fuel")) tabFuel(g, w2c, p, sc);
    for (const p of TABLET.layerPts("schools")) {
      const [x, y] = w2c(p.x, p.z);
      if (p.kind === "cp") { g.fillStyle = p.next ? CT_ACC : "rgba(31,74,102,.85)"; g.strokeStyle = "rgba(237,230,211,.95)"; g.lineWidth = 2; g.beginPath(); g.arc(x, y, p.next ? 7 : 5, 0, 6.283); g.fill(); g.stroke(); if (p.name) { g.fillStyle = "#fff"; g.font = "700 9px 'Barlow Semi Condensed', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(p.name, x, y + 0.5); } continue; }
      tabPin(g, x, y, p.col, "S", 10); tabLabel(g, p.name, x, y + 14, 12, p.col);
    }
    if (L.depots) for (const p of TABLET.layerPts("depots")) { const [x, y] = w2c(p.x, p.z); tabPin(g, x, y, "#5b3fa0", "H", 9); if (p.name) tabLabel(g, p.name, x, y + 14, 12, "#5b3fa0"); }
    const [px, py] = w2c(P.x, P.z);
    g.save(); g.translate(px, py); g.rotate(Math.PI - P.yaw);
    g.fillStyle = "rgba(237,230,211,.95)"; g.beginPath(); g.moveTo(0, -14); g.lineTo(-10, 10); g.lineTo(10, 10); g.closePath(); g.fill();
    g.fillStyle = CT_ACC; g.beginPath(); g.moveTo(0, -10); g.lineTo(-6.5, 6.5); g.lineTo(6.5, 6.5); g.closePath(); g.fill(); g.restore();
    // scale bar
    const km = this.zoom ? 0.5 : 2, bw = km * 1000 / span * H;
    g.fillStyle = "rgba(244,239,227,.92)"; g.fillRect(W - bw - 58, H - 30, bw + 48, 20); g.fillStyle = CT_INK; g.fillRect(W - bw - 52, H - 18, bw, 3); g.font = "600 11px 'Barlow Semi Condensed', sans-serif"; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillText(km + " KM", W - 48, H - 14);
    g.restore();
  }
});
// a rescue search on the chart: the area (dashed ring), the expanding-square legs still to fly, the clues found
function tabSarArea(g, w2c, p, pxm) {
  const [x, y] = w2c(p.x, p.z), r = p.area * pxm;
  g.save(); g.fillStyle = "rgba(184,50,31,.08)"; g.strokeStyle = "#b8321f"; g.lineWidth = 2; g.setLineDash([6, 5]);
  g.beginPath(); g.arc(x, y, Math.max(6, r), 0, 6.283); g.fill(); g.stroke(); g.setLineDash([]);
  if (p.legs && p.legs.length) {
    g.strokeStyle = "rgba(184,50,31,.75)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y);
    p.legs.forEach(q => { const [a, b] = w2c(q.x, q.z); g.lineTo(a, b); }); g.stroke();
    const n = p.legs[p.li]; if (n) { const [a, b] = w2c(n.x, n.z); g.fillStyle = CT_ACC; g.beginPath(); g.arc(a, b, 5, 0, 6.283); g.fill(); }
  }
  for (const c of p.clues || []) { const [a, b] = w2c(c.x, c.z); g.fillStyle = "#b8321f"; g.beginPath(); g.arc(a, b, 3.5, 0, 6.283); g.fill(); }
  g.restore();
}
// the melt on the chart: bare ground and open lakes, then every place's line from the quay coloured by whether it
// still holds (ink), is melting out (orange, dashed) or is closed (red, crossed out at the far end)
const ROUTE_COL = { open: "#2f5a46", melting: "#d0731f", closed: "#b8321f" };
function tabMelt(g, w2c, sc) {
  if (MELT.ov && MELT.ovOn) { const [x0, y0] = w2c(-HALF, -HALF), [x1, y1] = w2c(HALF, HALF); g.save(); g.imageSmoothingEnabled = true; g.globalAlpha = 0.9; g.drawImage(MELT.ov, x0, y0, x1 - x0, y1 - y0); g.restore(); }
  for (const s of SITES) {
    const st = MELT.route[s.id], r = CT.routes[s.id]; if (!st || !r || (s.type === "home" && sc < 1.2)) continue;
    g.save(); g.strokeStyle = ROUTE_COL[st]; g.globalAlpha = st === "open" ? 0.55 : 0.9; g.lineWidth = st === "open" ? 1.4 : 2.2; g.setLineDash(st === "melting" ? [7, 5] : st === "closed" ? [2, 5] : []);
    g.beginPath(); r.P.forEach((p, i) => { const [x, y] = w2c(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.restore();
    if (st !== "open") {
      const [x, y] = w2c(s.x, s.z);
      if (st === "closed") { g.strokeStyle = ROUTE_COL.closed; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x - 7, y - 7); g.lineTo(x + 7, y + 7); g.moveTo(x + 7, y - 7); g.lineTo(x - 7, y + 7); g.stroke(); }
      if (s.type !== "home" || sc > 1.4) tabLabel(g, ROUTE_WORD[st], x, y - 14, 10, ROUTE_COL[st]);
    }
  }
}
// the call-out you're on goes on the map's rescue layer; O5's rescues will add their own
TABLET.addLayer("fuel", fuelPoints);
// the licence schools you've signed up for, and the course's checkpoints while you're on one
TABLET.addLayer("schools", () => {
  const out = schoolList().filter(s => s.x !== undefined && (GS.signed[s.id] || (SCHOOL.on && SCHOOL.sc === s))).map(s => ({ x: s.x, z: s.z, name: s.short.toUpperCase(), col: s.col, kind: "school" }));
  const c = SCHOOL.on && SCHOOL.ctx; if (c) c.pts.forEach((p, i) => { if (i >= c.wi) out.push({ x: p.x, z: p.z, kind: "cp", name: String(i + 1), next: i === c.wi }); });
  return out;
});
TABLET.addLayer("rescue", () => GS.rescueJob && typeof RJ !== "undefined" ? RJ.vs.filter(v => !v.freed).map(v => ({ x: v.x, z: v.z, name: v.name + " · stuck", kind: "recovery" })) : []);

TABLET.register({
  id: "weather", name: "Weather", icon: TICON.weather, order: 3, live: 5,
  render(el) { el.innerHTML = `<div class="tapp twx">${tabHead("MET · NORDKINN", "Forecast")}<div id="tabWx"></div></div>`; renderWx($("tabWx")); }
});

TABLET.register({
  id: "calendar", name: "Calendar", icon: TICON.calendar, order: 4, live: 10,
  onOpen() { this.view = null; },
  render(el) {
    const c = CAL.day(), sy = c.m >= 10 ? c.y : c.y - 1, D0 = Math.round((Date.UTC(sy, 10, 1) - CAL_EPOCH) / 864e5), N = Math.round((Date.UTC(sy + 1, 5, 1) - Date.UTC(sy, 10, 1)) / 864e5);
    const mD = Math.round((Date.UTC(sy + 1, 3, 1 + MELT_START) - CAL_EPOCH) / 864e5);   // the melt-out starts 9 April
    const pnAt = D => CAL.isPolarNight(D * 24 - CAL.off + 12), meltAt = D => D >= mD;
    // the season strip: polar night and the melt, months, and today
    let pn0 = null, pn1 = null; for (let D = D0; D < D0 + N; D++) if (pnAt(D)) { if (pn0 === null) pn0 = D; pn1 = D; }
    const today = c.D, pc = D => ((D - D0) / N * 100).toFixed(2) + "%";
    const fmtD = D => { const q = CAL.day(D); return `${q.d} ${MON3[q.m]}`; };
    let strip = `<div class="tstrip">`;
    if (pn0 !== null) strip += `<div class="tsg pn" style="left:${pc(pn0)};width:calc(${pc(pn1 + 1)} - ${pc(pn0)})"><span>POLAR NIGHT</span></div>`;
    strip += `<div class="tsg ml" style="left:${pc(mD)};right:0"><span>MELT</span></div>`;
    for (let m = 0; m < 7; m++) { const D = Math.round((Date.UTC(sy + (m >= 2 ? 1 : 0), (10 + m) % 12, 1) - CAL_EPOCH) / 864e5); strip += `<div class="tsm" style="left:${pc(D)}"><span>${MON3[(10 + m) % 12].toUpperCase()}</span></div>`; }
    if (today >= D0 && today < D0 + N) strip += `<div class="tsn" style="left:${pc(today + (GS.hour % 24) / 24)}"><b>TODAY</b></div>`;
    strip += `</div>`;
    // the month grid
    const vm = this.view || { y: c.y, m: c.m }, first = new Date(Date.UTC(vm.y, vm.m, 1)), days = new Date(Date.UTC(vm.y, vm.m + 1, 0)).getUTCDate(), lead = (first.getUTCDay() + 6) % 7;
    let grid = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(d => `<div class="tcw">${d}</div>`).join("") + "<div></div>".repeat(lead);
    for (let d = 1; d <= days; d++) {
      const D = Math.round((Date.UTC(vm.y, vm.m, d) - CAL_EPOCH) / 864e5), inS = D >= D0 && D < D0 + N;
      grid += `<div class="tcd${D === today ? " today" : ""}${D < today ? " past" : ""}${inS && pnAt(D) ? " pn" : ""}${inS && meltAt(D) ? " ml" : ""}${!inS ? " off" : ""}"><b>${d}</b>${inS && D >= today && D < today + 3 ? `<i class="fdot" title="Ferry calls"></i>` : ""}</div>`;
    }
    const canPrev = vm.m !== 10, canNext = vm.m !== 4;
    // the next sailings: the steamer's two calls a day, with what the forecast thinks of them
    const fc = WX.forecast(), sail = [];
    for (let k = 0; k < 3; k++) {
      const D = today + k, q = CAL.day(D);
      for (let ci = 0; ci < STEAMER.calls.length; ci++) {
        const s = STEAMER.calls[ci], c = steamerCall(Math.floor(GS.hour / 24) + k, ci); if (c.dep + 0.5 < GS.hour) continue;
        const fd = fc.days.find(x => x.D === D), fs = k === 0 ? c : fd && fd.ferry ? fd.ferry.find(x => x.dir === s.dir) : null;
        const times = k === 0 && c.state === "delayed" ? `${fmtTime(c.arr)}–${fmtTime(c.dep)}` : `${fmtTime(s.arr)}–${fmtTime(s.dep)}`;
        sail.push(`<div class="tfr"><span>${k === 0 ? "Today" : k === 1 ? "Tomorrow" : DOW3[q.dow]}</span><b>${times}</b><i>${s.dir}</i>${fs ? chip(fs.state === "delayed" ? "+" + fs.delay + " H" : fs.state.toUpperCase(), fs.state === "cancelled" ? "due" : fs.state === "delayed" ? "heavy" : "ok") : chip("NO FORECAST")}</div>`);
      }
    }
    const yr = SEASON.year(c), rt = MELT.kq > 0 ? Object.values(MELT.route) : [], shut = rt.filter(v => v === "closed").length;
    el.innerHTML = `<div class="tapp tcal">${tabHead("YEAR " + yr + " · THE SEASON " + sy + "–" + String(sy + 1).slice(2), "Calendar")}
      <div class="tsub">${chip("YEAR " + yr, "ok")} ${CAL.now().long} · ${CAL.season().name}${pn0 !== null ? ` · polar night ${fmtD(pn0)} to ${fmtD(pn1)}` : ""} · thaw from 1 Apr, melt-out from ${fmtD(mD)} · summer from 1 Jun${shut ? ` · ${shut} of ${rt.length} trails closed` : ""}</div>
      ${strip}
      <div class="tcal2"><div><div class="tmh"><button type="button" class="tbtn ghost sm"${canPrev ? ' data-tf="cal:prev"' : " disabled"} id="calPrev">‹</button><b>${MONTHS[vm.m].toUpperCase()} ${vm.y}</b><button type="button" class="tbtn ghost sm"${canNext ? ' data-tf="cal:next"' : " disabled"} id="calNext">›</button></div><div class="tcg">${grid}</div>
        <div class="tleg">${chip("POLAR NIGHT", "polar")}${chip("MELT", "heavy")}<span class="bchip">• FERRY</span></div></div>
      <div>${sec("Ferry days", "the coastal ferry at Kjøllefjord")}${sail.join("")}<p class="tnote2">The ferry calls twice a day: northbound sails 09:30, southbound 21:00. Storms can hold her up or cancel a call. Today's calls are posted at the quay; the rest is the forecast. Your mail goes out on her: hand the sack in at the quay before she sails.</p></div></div></div>`;
    const step = d => { let m = vm.m + d, y = vm.y; if (m > 11) { m = 0; y++; } if (m < 0) { m = 11; y--; } this.view = { y, m }; TABLET.render(); };
    $("calPrev").addEventListener("click", () => canPrev && step(-1)); $("calNext").addEventListener("click", () => canNext && step(1));
  }
});

/* ---- the Logbook: your winter in a field notebook (S4) ----
   Two ruled pages, an orange margin, italic serif figures and a pencilled remark per stat. The figures come
   from LOG (km, trees, air, jump, fjord, mail: saved as `log`), GS.delivered, GS.rescues, GS.hour and the
   calendar. The remarks are picked by value, never at random, so a live re-render doesn't reshuffle them. */
const lbFmt = n => Math.round(n).toLocaleString("en-GB");
// ascending [limit, remark] pairs: the first limit the value is under wins; a function gets the value
const lbPick = (v, tiers) => { for (const [lim, t] of tiers) if (v < lim) return typeof t === "function" ? t(v) : t; return ""; };
function lbRows() {
  const km = LOG.m / 1000, tr = LOG.trees, air = LOG.air, jp = LOG.jump, fj = LOG.fjord, dl = GS.delivered, ml = LOG.mail, rs = GS.rescues || 0;
  const days = Math.max(0, Math.floor((GS.hour - 9.6) / 24));          // whole days since the first morning; the summer skip adds to CAL.off, not here
  const c = CAL.day(), se = CAL.season(), sy = c.m >= 10 ? c.y : c.y - 1, summer = se.id === "summer";
  const winterNo = sy - 2026 + 1, ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
  const airV = air < 600 ? [air.toFixed(1), "sec"] : [(air / 60).toFixed(1), "min"];
  const I = Infinity;
  const ride = [
    { k: "km", label: "Kilometres ridden", v: km >= 100 ? lbFmt(km) : km.toFixed(1), u: "km", m: lbPick(km, [
      [0.05, "Not a metre on the clock. The snow is patient."], [3, "Warming up. Mostly in circles, by the look of the tracks."],
      [8.2, "Not even once across the whole map yet."], [40, v => `${(v / 8.2).toFixed(1)} times across the map, edge to edge.`],
      [120, "Out to the lighthouse and back, over and over."], [I, "The sled has stopped asking how far."]]) },
    { k: "trees", label: "Trees flattened", v: lbFmt(tr), u: tr === 1 ? "birch" : "birches", m: lbPick(tr, [
      [1, "Not a birch harmed. Yet."], [2, "One birch regrets meeting you."], [100, v => `${lbFmt(v)} birches regret meeting you.`],
      [300, v => `${lbFmt(v)} birches. The forestry office has noticed.`], [I, v => `${lbFmt(v)}. That's not a trail, that's a clearing.`]]) },
    { k: "air", label: "Time in the air", v: airV[0], u: airV[1], m: lbPick(air, [
      [0.1, "Both skis on the ground all winter. Sensible. Boring."], [10, "Barely long enough to say a prayer."],
      [60, "Long enough to look around. Not long enough to plan the landing."], [300, "Whole minutes of your life spent not touching anything."], [I, "Technically more aeroplane than snowmobile."]]) },
    { k: "jump", label: "Longest jump", v: jp.toFixed(1), u: "sec", m: lbPick(jp, [
      [0.1, "No proper jump yet. Find a lip."], [1, "A hop with ambitions."], [2, "Long enough to reconsider things."],
      [3.5, "Your stomach caught up somewhere around the landing."], [I, "Somebody at the quay saw that. They're still telling it."]]) },
    { k: "fjord", label: "Times in the fjord", v: lbFmt(fj), u: fj === 1 ? "time" : "times", m: lbPick(fj, [
      [1, "Dry as a bone. The fish are disappointed."], [2, "Once. The fishing boat remembers."], [4, "The fishing boat knows your name by now."], [I, "You and the fjord have an arrangement."]]) }
  ];
  const work = [
    { k: "deliv", label: "Deliveries made", chip: rankOf(dl).name, v: lbFmt(dl), u: dl === 1 ? "drop" : "drops", m: lbPick(dl, [
      [1, "Nothing's gone out yet. The boat's in."], [5, "Learning the roads, mostly by getting lost."], [20, "People have started waving from the windows."],
      [60, "The quay stopped asking where you were going."], [I, "Half the peninsula has your tracks on their step."]]) },
    { k: "mail", label: "Mail delivered", v: lbFmt(ml), u: ml === 1 ? "piece" : "pieces", m: ml > 0 ? lbPick(ml, [[20, "Letters, lottery tickets and one very small parcel."], [I, "The post office is thinking about a medal."]]) : "No sack yet. The ferry update brings the post." },
    { k: "resc", label: "Rescues", chip: licensed("rescue") ? sarRank(SAR.rep).name : "", v: lbFmt(rs), u: rs === 1 ? "rescue" : "rescues", m: lbPick(rs, [
      [1, "Nobody's needed pulling out yet."], [2, "One. They owe you a coffee."], [6, "Word's getting round that you stop."], [I, "The Red Cross has stopped calling you the new one."]]) +
      (LOG.sar ? ` ${lbFmt(LOG.sar)} on callouts, ${lbFmt(Math.max(0, rs - LOG.sar))} winched out${LOG.sarLost ? `; ${lbFmt(LOG.sarLost)} went to the helicopter` : ""}.` : "") },
    { k: "days", label: "Days survived", v: lbFmt(days), u: days === 1 ? "day" : "days", m: lbPick(days, [
      [1, "Day one. Still here."], [7, "Not even a week. It's early."], [30, "Learning when to turn back."], [100, "The winter's getting used to you."], [I, "Longer than most of the herders' dogs would bet on."]]) },
    { k: "season", label: "Season · " + se.name, v: summer ? String(c.y) : sy + "–" + String(sy + 1).slice(2), u: summer ? "summer" : "winter", txt: true,
      m: ({ early: "Snow's settled in. The sun's on its way out.", deep: "No sun. Headlights, aurora and hot coffee.", late: "The light's coming back. So are the tourists.",
        spring: "Crust in the morning, slush by lunch.", melt: "The lakes are thinking about it. Stay off them.", summer: "Boats on the fjord. The sled's in the shed." })[se.id] + (summer ? "" : ` Your ${ord(winterNo)} winter.`) }
  ];
  return { ride, work };
}
TABLET.register({
  id: "logbook", name: "Logbook", icon: TICON.logbook, order: 8.5, live: 3,
  render(el) {
    const { ride, work } = lbRows();
    const row = r => `<div class="tlr" data-tf="lb:${r.k}"><div class="tlv"><b${r.txt ? ' class="txt"' : ""}>${tabEsc(r.v)}</b><u>${tabEsc(r.u)}</u></div><div class="tlt"><span class="tll">${tabEsc(r.label)}${r.chip ? " " + chip(tabEsc(r.chip.toUpperCase())) : ""}</span><span class="tlm">${tabEsc(r.m)}</span></div></div>`;
    el.innerHTML = `<div class="tapp tlb">${tabHead("YOUR WINTER", "Logbook")}
      <p class="tlnote">Kept in pencil, on the back of a freight manifest. The figures are true. The remarks are the sled's.</p>
      <div class="tlk"><section class="tlp"><h3 class="tlh">The ride<span>OUT ON THE SNOW</span></h3>${ride.map(row).join("")}</section>
      <section class="tlp"><h3 class="tlh">The work<span>BACK AT THE QUAY</span></h3>${work.map(row).join("")}</section></div>
      ${FISH ? FISH.logbookHtml({ esc: tabEsc, fmtCash }) : ""}</div>`;
  }
});

/* ---------------- licence schools (winter update O4) ----------------
   Two schools, each a building of its own out on the map (not in SITES, so no parcels, mail or groom lines
   ever go there). Download Freight or Rescue from the App Store, sign up in the app, ride out. Stopping in the
   yard pings START COURSE. On the course you ride the school's sled (a Matriarch 850T in school colours with
   the full kit); your own sled is parked in the yard as a snapshot, cargo and all, and your loads are set
   aside until you finish or quit. A corridor round the current mission keeps you on the course.

   A school runs its `missions` in order; passed ones are saved (GS.sdone[id]) so quitting keeps them. The last
   one passed grants the licence (GS.lic[id] = true).

   Adding a mission (O5 writes the Rescue school's this way):
     SCHOOL.addMission("rescue", {
       id, name, kind,            // kind is the chip on the card ("HOOKUP", "CLIMB", ...)
       brief,                     // one or two sentences, shown on the card and pinged when it starts
       hitch: "none" | "trailer" | "flatbed" | "groomer" | "tiller",   // what the school sled tows for it
       plan(sc) -> { pts: [{ x, z, r, stop, label, onReach(ctx) }], ... },   // built once from the terrain round the yard
       setup(ctx), tick(dt, ctx) -> null | "pass" | { fail: "why" }, hud(ctx) -> string, cleanup(ctx)
     });
   The runner walks ctx.pts in order (reach within r; `stop` means under 3 m/s), counts trailer rolls in
   ctx.tips, times the attempt in ctx.t (seconds), and passes the mission once the last point is reached and
   tick() hasn't failed it. ctx.load(spec) straps a school load on the trailer (it lives in GS.load with
   school: true, so the trailer, bigHit and the condition % all work as they do on real freight). A fail runs you
   back to the yard and starts the same mission again. A mission that doesn't end at the yard is followed by a
   ride back to it, and the next one starts there. */
var SCHOOLS = {
  freight: { id: "freight", name: "Nordkinn Frakt training yard", short: "Freight school", seed: [-150, -1750], licence: "Freight licence", col: "#d9a520",
    sign: "NORDKINN FRAKT", sub: "SJÅFØRSKOLE · TRAINING YARD", paint: "yellow", missions: [], plans: {} },
  rescue: { id: "rescue", name: "Nordkinn Redning base", short: "Rescue school", seed: [-2350, 700], licence: "Rescue licence", col: "#c43a26",
    sign: "NORDKINN REDNING", sub: "REDNINGSSKOLE · RESCUE BASE", paint: "red", missions: [], plans: {} }
};
const SCHOOL_SLED = "matriarch";
const SCHOOL_LIVERY = {
  freight: { body: "#f2c230", panel: "#15191e", trim: "#15191e", seat: "#15191e", name: "School yellow, black panels" },
  rescue: { body: "#d8261c", panel: "#f2f5f8", trim: "#f2f5f8", seat: "#15191e", name: "Rescue red, white panels" }
};
const SCHOOL_PARTS = { shield: "heated", grips: "grips", tank: "long", lights: "hid", guard: "straps", cool: "pro", survival: "stove" };
const SCHOOL_CORRIDOR = 240, SCHOOL_HARD = 420;
var SCHOOL = {
  on: false, sc: null, mi: 0, m: null, ctx: null, phase: null, saved: null, savedLoad: null, savedFuel: 0, parked: null, park: null,
  outT: 0, outWarned: false, guide: null, here: null, pingT: {}, cw: [],
  addMission(id, def) { SCHOOLS[id].missions.push(def); }
};
const licensed = id => !!GS.lic[id];
const schoolDone = id => GS.sdone[id] || (GS.sdone[id] = []);
const schoolNext = sc => sc.missions.findIndex(m => !schoolDone(sc.id).includes(m.id));
// placed with the sites, before the trees go in (nearSite keeps the forest out of the yard)
function computeSchools() {
  for (const k in SCHOOLS) { const s = SCHOOLS[k], p = flatSpot(s.seed[0], s.seed[1], 160); s.x = p[0]; s.z = p[1]; s.y = groundAt(s.x, s.z); s.clear = 46; }
}
const schoolList = () => Object.values(SCHOOLS);
const okGround = (x, z, sl = 0.5) => Math.abs(x) < HALF - 220 && Math.abs(z) < HALF - 220 && bioAt(x, z) !== 3 && bioAt(x, z) !== 1 && slopeAt(x, z, 5) < sl;
// can a loaded sled get along the straight line a→b? (no sea, no lakes, nothing steeper than `sl`)
function lineOk(a, b, sl = 0.55) {
  const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(2, Math.ceil(L / 18));
  for (let i = 1; i < n; i++) { const t = i / n, x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t); if (!okGround(x, z, sl)) return false; }
  return true;
}

/* ---- the buildings ---- */
function schoolSign(s) {
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 192; const g = cv.getContext("2d");
  g.fillStyle = "#13202b"; g.fillRect(0, 0, 512, 192); g.fillStyle = s.col; g.fillRect(0, 0, 512, 22); g.fillRect(0, 170, 512, 22);
  g.fillStyle = "#f2efe6"; g.font = "700 64px 'Barlow Semi Condensed', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s.sign, 256, 84);
  g.font = "600 26px 'Barlow Semi Condensed', sans-serif"; g.fillStyle = s.col; g.fillText(s.sub, 256, 138);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return new THREE.MeshBasicMaterial({ map: t });
}
function buildSchools() {
  const K = KIT, cone = new THREE.MeshLambertMaterial({ color: 0xff6a1f }), band = new THREE.MeshLambertMaterial({ color: 0xf2f5f8 });
  const coneG = new THREE.ConeGeometry(0.22, 0.6, 10), bandG = new THREE.CylinderGeometry(0.12, 0.15, 0.1, 10);
  for (const s of schoolList()) {
    // the school: a long timber building with its door on the yard, a sign out front and a ring of cones
    K.house(s.x, s.z - 15, 16, 8, 4.6, 0, K[s.paint] || K.red, true);
    K.house(s.x + 13, s.z - 14, 7, 6, 3.4, 0, K.white, false);
    const g = new THREE.Group(); g.position.set(s.x - 9, groundAt(s.x - 9, s.z - 5) - 0.2, s.z - 5); g.rotation.y = 0.35; scene.add(g);
    for (const sx of [-1.4, 1.4]) K.bx(g, 0.14, 2.6, 0.14, K.woodD, sx, 1.3, 0);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), schoolSign(s)); sign.position.set(0, 2.1, 0.08); g.add(sign);
    K.bx(g, 3.3, 1.3, 0.1, K.woodD, 0, 2.1, -0.01);
    addOb({ x: s.x - 9, z: s.z - 5, r: 0.5, top: 1e9 });
    for (let k = 0; k < 14; k++) {
      const a = k / 14 * Math.PI * 2, x = s.x + Math.cos(a) * 30, z = s.z + 6 + Math.sin(a) * 22; if (z < s.z - 8) continue;
      const c = new THREE.Group(); c.position.set(x, groundAt(x, z) - 0.05, z); scene.add(c);
      K.put(c, coneG, cone, 0, 0.3, 0); K.put(c, bandG, band, 0, 0.36, 0);
    }
    K.lamp(s.x + 6, s.z - 9); K.lamp(s.x - 18, s.z - 8);
    s.beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(s.col), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    s.beacon.position.set(s.x, s.y + 480, s.z); s.beacon.visible = false; scene.add(s.beacon);
  }
  // one beacon for the course's next checkpoint
  SCHOOL.beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  SCHOOL.beacon.scale.set(0.8, 1, 0.8); SCHOOL.beacon.visible = false; scene.add(SCHOOL.beacon);
}
// the trailer waiting in the yard for the hookup mission: runners, a deck and a yellow frame
function schoolTrailerMesh(x, z, yaw) {
  const K = KIT, g = new THREE.Group(), y = surf(x, z); g.position.set(x, y, z); g.rotation.y = yaw; scene.add(g);
  const steel = new THREE.MeshLambertMaterial({ color: 0x8d99a6 }), yel = new THREE.MeshLambertMaterial({ color: 0xe0a820 });
  for (const sx of [-0.55, 0.55]) K.bx(g, 0.08, 0.08, 2.4, steel, sx, 0.06, 0);
  K.bx(g, 1.3, 0.1, 2.2, K.woodD, 0, 0.32, 0); K.bx(g, 1.34, 0.4, 0.06, yel, 0, 0.55, -1.08); K.bx(g, 0.06, 0.06, 1.3, yel, 0, 0.3, 1.75);
  for (const sx of [-0.62, 0.62]) K.bx(g, 0.06, 0.4, 2.2, yel, sx, 0.55, 0);
  return g;
}

/* ---- your own sled, parked in the yard while you're on the course ---- */
function parkSnapshot(x, z, yaw) {
  const snap = sledBody.clone(true);
  // the rider and the dash tablet aren't parked with it, and its lights would light the yard twice
  const skip = [V.rider, V.tab, SAR.pill].map(o => sledBody.children.indexOf(o)).filter(i => i >= 0).map(i => snap.children[i]);
  const lights = []; snap.traverse(o => { if (o.isLight) lights.push(o); });
  for (const o of skip.concat(lights)) if (o && o.parent) o.parent.remove(o);
  snap.position.set(0, 0, 0);
  snap.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); });
  const g = new THREE.Group(); g.add(snap); g.position.set(x, rideSurf(x, z), z); g.rotation.y = yaw; scene.add(g);
  addOb({ x, z, r: 0.9, top: rideSurf(x, z) + 1.1, parked: true });
  return g;
}
function unpark() {
  const g = SCHOOL.parked; if (!g) return;
  scene.remove(g); g.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
  SCHOOL.parked = null;
  // and take its collision post back out of the grid
  const p = SCHOOL.park, k = Math.floor((p.z + HALF) / OBC) * OBW + Math.floor((p.x + HALF) / OBC), a = obGrid.get(k);
  if (a) { const i = a.findIndex(o => o.parked); if (i >= 0) a.splice(i, 1); }
}
function schoolPut(x, z, yaw) {
  P.x = x; P.z = z; P.yaw = yaw; P.vx = P.vy = P.vz = 0; P.yr = 0; P.pitch = P.roll = 0; P.stuckT = 0;
  recenter(P.x, P.z, true); P.y = rideSurf(P.x, P.z) + 0.4; P.safe = { x, z, yaw };
  camState.init = false; camState.yaw = yaw; towSnap();
}
const yardStart = sc => ({ x: sc.x, z: sc.z + 10 });

/* ---- signing up, starting, finishing ---- */
function schoolSignUp(id) {
  const sc = SCHOOLS[id]; if (!GS.apps[id]) return;
  GS.signed[id] = true; SCHOOL.guide = id; save();
  toast(`You're signed up at ${sc.name}. It's pinned on the Map, and the arrow will take you there.`, "good");
  TABLET.refresh();
}
function schoolCanStart(sc) {
  if (SCHOOL.on) return "You're already on a course.";
  if (!GS.signed[sc.id]) return "Sign up in the app first.";
  if (licensed(sc.id)) return `You've got your ${sc.licence}.`;
  if (!sc.missions.length) return "The instructors are still writing this course. It opens with the rescue update.";
  if (SCHOOL.here !== sc) return `The course starts at ${sc.name}.`;
  if (GS.tour) return "Get your tourists up the hill first.";
  if (GS.rescueJob) return "Finish the call-out you're on first.";
  if (SAR.cur) return "Finish your rescue callout first.";
  if (FOOT.on) return "Get back on your sled first.";
  return "";
}
function schoolBegin(id) {
  const sc = SCHOOLS[id], why = schoolCanStart(sc); if (why) { toast(why, "warn"); return; }
  // park your sled where it stands, cargo and all
  SCHOOL.park = { x: P.x, z: P.z, yaw: P.yaw };
  SCHOOL.parked = parkSnapshot(P.x, P.z, P.yaw);
  SCHOOL.saved = GS.own; SCHOOL.savedLoad = GS.load; SCHOOL.savedFuel = GS.fuel; GS.load = [];
  SCHOOL.on = true; SCHOOL.sc = sc; SCHOOL.guide = null;
  GS.own = schoolOwn("none"); restat(); GS.fuel = GS.cap; applyLoadout();
  const st = yardStart(sc); schoolPut(st.x, st.z, 0);
  TABLET.close();
  toast(`You leave your ${(SLEDS.find(s => s.id === SCHOOL.saved.sled) || SLEDS[0]).name} by the door. The instructor tosses you the key to the school's Matriarch.`, "good");
  schoolMission(schoolNext(sc));
}
function schoolOwn(hitch) {
  const o = OWN0(); o.sled = SCHOOL_SLED; o.sleds = [SCHOOL_SLED];
  Object.assign(o.parts, SCHOOL_PARTS, { hitch: hitch || "none" });
  o.gear = Object.assign({}, (SCHOOL.saved || GS.own).gear);
  if (SCHOOL.sc && SCHOOL.sc.id === "rescue") o.parts.winch = "elec";          // the rescue school's sled carries an electric winch
  return o;
}
function schoolHitch(kind) {
  if (GS.own.parts.hitch === kind) return;
  GS.own.parts.hitch = kind; TOW.wingOn = false; restat(); GS.fuel = GS.cap; towSnap();
}
function schoolMission(i) {
  const sc = SCHOOL.sc, m = sc.missions[i]; if (!m) { schoolEnd("quiet"); return; }
  if (SCHOOL.ctx && SCHOOL.m && SCHOOL.m.cleanup) SCHOOL.m.cleanup(SCHOOL.ctx);
  GS.load = []; schoolHitch(m.hitch || "none");
  const plan = sc.plans[m.id] || (sc.plans[m.id] = m.plan(sc));
  const ctx = SCHOOL.ctx = { m, sc, plan, pts: plan.pts.map(p => Object.assign({}, p)), wi: 0, t: 0, tips: 0, tipOn: false,
    load(spec) { const j = Object.assign({ school: true, big: true, bays: 1, fragile: false, look: "crate", cond: 100, hits: 0, pay: 0, dest: { id: "school", name: sc.short, x: sc.x, z: sc.z, y: sc.y } }, spec); GS.load = [j]; applyLoadout(); return j; } };
  SCHOOL.mi = i; SCHOOL.m = m; SCHOOL.phase = "run"; SCHOOL.outT = 0; SCHOOL.outWarned = false;
  if (m.setup) m.setup(ctx);
  TABLET.notify({ app: sc.id, title: `${sc.short} · ${i + 1}/${sc.missions.length}: ${m.name}`, body: m.brief, kind: "info", ttl: 9 });
  save();
}
function schoolFail(why) {
  const sc = SCHOOL.sc, m = SCHOOL.m;
  toast(`${why} The instructor runs you back to the yard. Again.`, "bad");
  if (m && m.cleanup) m.cleanup(SCHOOL.ctx);
  SCHOOL.ctx = null;
  const st = yardStart(sc); schoolPut(st.x, st.z, 0); GS.warmth = Math.max(GS.warmth, 70); heatCool();
  SCHOOL.phase = "reset"; SCHOOL.retT = gameClock;      // schoolTick restarts it after a breath
}
function schoolPass() {
  const sc = SCHOOL.sc, m = SCHOOL.m, ctx = SCHOOL.ctx, d = schoolDone(sc.id);
  if (!d.includes(m.id)) d.push(m.id);
  if (m.cleanup) m.cleanup(ctx);
  const next = schoolNext(sc);
  if (next < 0) {
    GS.lic[sc.id] = true; GS.contracts = null; save();
    toast(`Passed: ${m.name}. That's the course. The instructor signs your ${sc.licence}.`, "good");
    SCHOOL.phase = "done"; SCHOOL.retT = gameClock; return;
  }
  toast(`Passed: ${m.name}. ${Math.round(ctx.t)} s.${atYard(sc) ? "" : " Ride back to the yard for the next one."}`, "good");
  GS.load = []; applyLoadout(); save();
  SCHOOL.phase = "return"; SCHOOL.retT = gameClock;
}
const atYard = sc => Math.hypot(P.x - sc.x, P.z - (sc.z + 6)) < 34;
// quit (or finish): back on your own sled, where you left it, with your loads
function schoolEnd(how) {
  if (!SCHOOL.on) return;
  const sc = SCHOOL.sc;
  if (SCHOOL.m && SCHOOL.m.cleanup && SCHOOL.ctx) SCHOOL.m.cleanup(SCHOOL.ctx);
  GS.own = SCHOOL.saved; GS.load = SCHOOL.savedLoad || []; SCHOOL.saved = null; SCHOOL.savedLoad = null;
  if (how === "licence" && sc.id === "rescue") { GS.own.partsOwned[ownKey("hitch", "akja")] = true; SAR.rep = Math.max(SAR.rep, 10); }
  SCHOOL.on = false; SCHOOL.m = null; SCHOOL.ctx = null; SCHOOL.phase = null;
  restat(); GS.fuel = Math.min(GS.cap, Math.max(SCHOOL.savedFuel, GS.cap * 0.5)); applyLoadout();
  const p = SCHOOL.park; unpark();
  if (p) schoolPut(p.x, p.z, p.yaw);
  if (SCHOOL.beacon) SCHOOL.beacon.visible = false;
  TABLET.refresh(); save();
  if (how === "licence") TABLET.notify({ app: sc.id, title: `${sc.licence} granted`, body: sc.id === "freight" ? "Trailer and flatbed work is open in the Freight app, as far as your rank goes." : "You're licensed, and the base has issued you a rescue toboggan (it's in the garage). Go on duty in the Rescue app.", kind: "good", ttl: 10 });
  else if (how === "quit") toast(`You hand the key back. Your ${schoolDone(sc.id).length}/${sc.missions.length} passed missions are on file.`);
}
// blacking out, or going in, on the course: the school fishes you out, no fees, and you go again
function schoolBlackout(kind) {
  schoolUnhelp();
  GS.warmth = 80; heatCool();
  schoolFail(kind === "sea" ? "Straight into the water." : "You froze up out there.");
}

function schoolUnhelp() {
  if (!HELP.on) return;
  HELP.on = false; HELP.called = false; P.wet = false; P.sink = 0;
  if (HELP.rs) HELP.rs.visible = false; if (HELP.cab) HELP.cab.hide();
}
/* ---- every frame on the course, and round the yards ---- */
function schoolSegDist(p, a, b) { const dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz || 1, t = clamp(((p.x - a.x) * dx + (p.z - a.z) * dz) / L, 0, 1); return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t); }
function schoolTick(dt, spd) {
  // the yards: warm inside, a ping offering the course, the guide beacon
  let here = null; for (const s of schoolList()) if (s.x !== undefined && Math.hypot(P.x - s.x, P.z - (s.z + 4)) < 36) here = s;
  if (here !== SCHOOL.here && here && !SCHOOL.on) {
    if (SCHOOL.guide === here.id) SCHOOL.guide = null;
    const st = GS.signed[here.id] ? schoolCanStart(here) : "";
    if (!GS.apps[here.id]) toast(`${here.name}. Download the ${here.id === "freight" ? "Freight" : "Rescue"} app to sign up.`);
    else if (!GS.signed[here.id]) toast(`${here.name}. Sign up in the ${here.id === "freight" ? "Freight" : "Rescue"} app.`);
    else if (licensed(here.id)) toast(`${here.name}. Your ${here.licence} is pinned up by the door.`);
    else if (!here.missions.length) toast(`${here.name}. ${st}`);
    else if (gameClock - (SCHOOL.pingT[here.id] || -99) > 20) {
      SCHOOL.pingT[here.id] = gameClock;
      const n = schoolDone(here.id).length;
      TABLET.notify({ app: here.id, title: here.name, body: n ? `${n}/${here.missions.length} missions passed. Pick up where you left off?` : `${here.missions.length} short missions on the school's sled, then your ${here.licence}.`, kind: "good", ttl: 20,
        actions: [{ label: n ? "RESUME COURSE" : "START COURSE", do: () => schoolBegin(here.id) }, { label: "Not now", do: () => { } }] });
    }
  }
  SCHOOL.here = here;
  if (here && !HELP.on) GS.warmth = Math.min(100, GS.warmth + 12 * dt);
  for (const s of schoolList()) if (s.beacon) s.beacon.visible = !SCHOOL.on && SCHOOL.guide === s.id;
  if (!SCHOOL.on) return;
  const sc = SCHOOL.sc, ctx = SCHOOL.ctx;
  if (atYard(sc)) GS.fuel = Math.min(GS.cap, GS.fuel + 6 * dt);
  if (SCHOOL.phase === "done") { if (gameClock - SCHOOL.retT > 2.4) schoolEnd("licence"); return; }
  if (SCHOOL.phase === "return" && atYard(sc) && spd < 4 && gameClock - SCHOOL.retT > 1.8) { SCHOOL.phase = "next"; schoolMission(schoolNext(sc)); return; }
  if (SCHOOL.phase === "reset" && gameClock - SCHOOL.retT > 1.6) { schoolMission(SCHOOL.mi); return; }
  if (HELP.on && HELP.kind === "sea" && SCHOOL.phase === "run") { schoolUnhelp(); GS.warmth = Math.max(GS.warmth, 70); schoolFail("Straight into the water."); return; }
  if (SCHOOL.phase !== "run" || !ctx || GS.dead) { if (SCHOOL.phase !== "reset" && SCHOOL.phase !== "done") schoolLock(dt); return; }
  ctx.t += dt;
  // trailer rolls: towStep sets TOW.tipT when it goes over
  if (TOW.tipT > 2 && !ctx.tipOn) { ctx.tipOn = true; ctx.tips++; } else if (TOW.tipT <= 0) ctx.tipOn = false;
  const p = ctx.pts[ctx.wi];
  if (p && Math.hypot(P.x - p.x, P.z - p.z) < (p.r || 14) && (!p.stop || spd < 3)) {
    ctx.wi++; if (p.onReach) p.onReach(ctx);
    if (ctx.wi < ctx.pts.length) { if (p.say) toast(p.say); else if (typeof whump === "function") whump(0.15); }
  }
  const r = ctx.m.tick ? ctx.m.tick(dt, ctx) : null;
  if (r && r.fail) { schoolFail(r.fail); return; }
  if (ctx.wi >= ctx.pts.length && r !== "hold") { schoolPass(); return; }
  schoolLock(dt);
}
// locked to the course: a corridor round the yard, the checkpoints and the way back
function schoolLock(dt) {
  const sc = SCHOOL.sc, ctx = SCHOOL.ctx, y = { x: sc.x, z: sc.z }, pts = [y].concat(ctx ? ctx.pts : []).concat([y]);
  let d = Math.hypot(P.x - y.x, P.z - y.z);
  for (let i = 0; i + 1 < pts.length; i++) d = Math.min(d, schoolSegDist(P, pts[i], pts[i + 1]));
  if (d < SCHOOL_CORRIDOR) { SCHOOL.outT = 0; SCHOOL.outWarned = false; return; }
  SCHOOL.outT += dt;
  if (!SCHOOL.outWarned) { SCHOOL.outWarned = true; toast("Instructor on the radio: \"That's off the course. Turn round.\"", "warn"); }
  if (SCHOOL.outT > 6 || d > SCHOOL_HARD) {
    SCHOOL.outT = 0; SCHOOL.outWarned = false;
    const back = ctx && ctx.wi > 0 ? ctx.pts[ctx.wi - 1] : yardStart(sc), nx = ctx && ctx.pts[ctx.wi] ? ctx.pts[ctx.wi] : y;
    schoolPut(back.x, back.z, Math.atan2(nx.x - back.x, nx.z - back.z));
    toast("The instructor comes out on the school's other sled and leads you back onto the course.", "warn");
  }
}
function schoolTarget() {
  if (SCHOOL.on) {
    const c = SCHOOL.ctx;
    if (SCHOOL.phase === "run" && SAR.cur && SAR.cur.school && !SAR.cur.res) return sarTarget(SAR.cur);   // a rescue mission: the case leads
    if (SCHOOL.phase === "run" && c && c.pts[c.wi]) return c.pts[c.wi]; return yardStart(SCHOOL.sc);
  }
  if (SCHOOL.guide && SCHOOLS[SCHOOL.guide]) return SCHOOLS[SCHOOL.guide];
  return null;
}
function schoolHud(tgt) {
  const sc = SCHOOL.sc, ctx = SCHOOL.ctx, m = SCHOOL.m, d = Math.hypot(tgt.x - P.x, tgt.z - P.z);
  $("jobTitle").textContent = `${sc.short} · ${SCHOOL.mi + 1}/${sc.missions.length}: ${m ? m.name : ""}`;
  if (SCHOOL.phase === "run" && ctx) {
    const p = ctx.pts[ctx.wi], big = GS.load[0];
    $("jobSub").textContent = `${p ? p.label || "Next checkpoint" : ""} · ${fmtMi(d)}${big ? " · " + Math.round(big.cond) + "% condition" : ""}${m.hud ? " · " + m.hud(ctx) : ""}`;
  } else if (SCHOOL.phase === "done") $("jobSub").textContent = "Course passed. Signing your licence.";
  else if (SCHOOL.phase === "reset") $("jobSub").textContent = "The instructor's setting the course up again";
  else $("jobSub").textContent = `Ride back to the yard for the next mission · ${fmtMi(d)}`;
  if (SCHOOL.beacon) {
    const show = SCHOOL.phase === "run" || SCHOOL.phase === "return";
    SCHOOL.beacon.visible = show; if (show) SCHOOL.beacon.position.set(tgt.x, groundAt(tgt.x, tgt.z) + 480, tgt.z);
  }
}

/* ---- the Freight school's course ---- */
// a side-hill near the yard: steep enough across to roll a trailer that's driven carelessly, not so steep you can't hold a line
function planSideHill(sc) {
  let best = null, bs = 1e9;
  for (let k = 0; k < 900; k++) {
    const a = k * 2.399, r = 160 + (k / 900) * 560, x = sc.x + Math.cos(a) * r, z = sc.z + Math.sin(a) * r;
    if (!okGround(x, z, 0.6)) continue;
    const e = 8, gx = (groundAt(x + e, z) - groundAt(x - e, z)) / (2 * e), gz = (groundAt(x, z + e) - groundAt(x, z - e)) / (2 * e), gm = Math.hypot(gx, gz);
    if (gm < 0.2 || gm > 0.42) continue;
    const ux = -gz / gm, uz = gx / gm, A = { x: x - ux * 85, z: z - uz * 85 }, B = { x: x + ux * 85, z: z + uz * 85 };
    if (!okGround(A.x, A.z) || !okGround(B.x, B.z) || !lineOk(A, B, 0.5)) continue;
    // how even the cross-slope is along the run
    let dev = 0; for (const t of [-0.6, -0.3, 0.3, 0.6]) { const qx = x + ux * 85 * t, qz = z + uz * 85 * t; dev += Math.abs(slopeAt(qx, qz, 8) - gm); }
    const near = Math.hypot(A.x - sc.x, A.z - sc.z) < Math.hypot(B.x - sc.x, B.z - sc.z) ? [A, B] : [B, A];
    const sc0 = dev * 2 + Math.abs(gm - 0.3) * 3 + r * 0.0008 + (lineOk(sc, near[0], 0.5) ? 0 : 1);
    if (sc0 < bs) { bs = sc0; best = { c: { x, z }, A: near[0], B: near[1], gm }; }
  }
  if (!best) { const A = { x: sc.x + 140, z: sc.z + 60 }, B = { x: sc.x + 300, z: sc.z + 60 }; best = { c: { x: (A.x + B.x) / 2, z: A.z }, A, B, gm: 0.2 }; }
  return best;
}
// the biggest climb within a kilometre that a loaded sled can actually get up
function planClimb(sc) {
  let best = null, bs = -1e9;
  for (let k = 0; k < 1200; k++) {
    const a = k * 2.399, r = 250 + (k / 1200) * 900, x = sc.x + Math.cos(a) * r, z = sc.z + Math.sin(a) * r;
    if (!okGround(x, z, 0.35)) continue;
    const climb = groundAt(x, z) - sc.y; if (climb < 25) continue;
    const mid = { x: lerp(sc.x, x, 0.45), z: lerp(sc.z, z, 0.45) };
    if (!lineOk(sc, mid, 0.5) || !lineOk(mid, { x, z }, 0.48)) continue;
    const s0 = Math.min(climb, 130) - r * 0.03;
    if (s0 > bs) { bs = s0; best = { top: { x, z }, mid, climb: Math.round(climb) }; }
  }
  if (!best) { const top = { x: sc.x + 400, z: sc.z }; best = { top, mid: { x: sc.x + 200, z: sc.z }, climb: Math.round(groundAt(top.x, top.z) - sc.y) }; }
  return best;
}
// a run out to somewhere 1.1 to 1.7 km off, with a clean enough line there and back
function planPriority(sc) {
  let best = null, bs = 1e9;
  for (let k = 0; k < 900; k++) {
    const a = k * 2.399, r = 1100 + (k / 900) * 600, x = sc.x + Math.cos(a) * r, z = sc.z + Math.sin(a) * r;
    if (!okGround(x, z, 0.3)) continue;
    const mid = { x: lerp(sc.x, x, 0.5), z: lerp(sc.z, z, 0.5) };
    if (!lineOk(sc, mid, 0.5) || !lineOk(mid, { x, z }, 0.5)) continue;
    const s0 = Math.abs(groundAt(x, z) - sc.y) * 0.4 + Math.abs(r - 1350) * 0.02;
    if (s0 < bs) { bs = s0; best = { to: { x, z }, mid, L: r }; }
  }
  if (!best) { const to = { x: sc.x - 1200, z: sc.z }; best = { to, mid: { x: sc.x - 600, z: sc.z }, L: 1200 }; }
  return best;
}
// the expedition loop: three checkpoints round the yard, the long way, and home
function planLoop(sc) {
  let best = null, bs = 1e9;
  for (let k = 0; k < 160; k++) {
    const a0 = (k / 160) * Math.PI * 2, pts = [];
    for (let i = 0; i < 3; i++) {
      const a = a0 + i * 1.6, r = 520 + ((k * 7 + i * 3) % 5) * 70, x = sc.x + Math.cos(a) * r, z = sc.z + Math.sin(a) * r;
      if (!okGround(x, z, 0.35)) break; pts.push({ x, z });
    }
    if (pts.length < 3) continue;
    const chain = [sc].concat(pts).concat([sc]);
    let ok = true, L = 0, rough = 0;
    for (let i = 0; i + 1 < chain.length; i++) { if (!lineOk(chain[i], chain[i + 1], 0.5)) { ok = false; break; } L += Math.hypot(chain[i + 1].x - chain[i].x, chain[i + 1].z - chain[i].z); rough += Math.abs(groundAt(chain[i + 1].x, chain[i + 1].z) - groundAt(chain[i].x, chain[i].z)); }
    if (!ok) continue;
    const s0 = Math.abs(L - 2600) * 0.01 - Math.min(rough, 160) * 0.05;
    if (s0 < bs) { bs = s0; best = { pts, L: Math.round(L) }; }
  }
  if (!best) best = { pts: [{ x: sc.x + 500, z: sc.z }, { x: sc.x + 500, z: sc.z + 500 }, { x: sc.x, z: sc.z + 500 }], L: 2000 };
  return best;
}
const yardPt = (sc, label) => ({ x: sc.x, z: sc.z + 6, r: 18, stop: true, label: label || "Park it in the yard" });
SCHOOL.addMission("freight", {
  id: "hookup", name: "Hook up and hold the side-hill", kind: "HOOKUP · SIDE-HILL",
  brief: "Back the school sled up to the trailer by the shed and stop to hook on. Then take it across the side-hill and bring it home. Roll it and you start again.",
  hitch: "none",
  plan(sc) {
    const h = planSideHill(sc), tx = sc.x + 16, tz = sc.z - 2;
    return { side: h, trailer: { x: tx, z: tz }, pts: [
      { x: tx, z: tz, r: 5.5, stop: true, label: "Stop at the trailer to hook up" },
      { x: h.A.x, z: h.A.z, r: 18, label: "To the side-hill" },
      { x: h.c.x, z: h.c.z, r: 20, label: "Across the side-hill, steady" },
      { x: h.B.x, z: h.B.z, r: 18, label: "Off the side-hill" },
      yardPt(sc)] };
  },
  setup(ctx) {
    const t = ctx.plan.trailer; ctx.mesh = schoolTrailerMesh(t.x, t.z, Math.PI);
    ctx.pts[0].onReach = c => {
      if (c.mesh) { scene.remove(c.mesh); c.mesh = null; }
      schoolHitch("trailer"); c.load({ cargo: "Two propane cylinders (training)", kg: 110, look: "tanks" });
      toast("Clunk. Hooked on, chains crossed, lights working. Now the side-hill: slow, and don't turn uphill sharp.", "good");
    };
  },
  tick(dt, ctx) { if (ctx.tips) return { fail: "You rolled the trailer." }; return null; },
  hud(ctx) { return ctx.wi === 0 ? "creep up to it" : ctx.wi < 4 ? `cross-slope ${Math.round(Math.atan(ctx.plan.side.gm) * 57.3)}°, don't roll it` : "home"; },
  cleanup(ctx) { if (ctx.mesh) { scene.remove(ctx.mesh); ctx.mesh = null; } }
});
SCHOOL.addMission("freight", {
  id: "climb", name: "Heavy load up the hill", kind: "HEAVY · CLIMB",
  brief: "Two full fuel drums on the trailer, 300 kg, and the biggest hill round the yard. Keep it moving: stall and dig in and you'll be there all day.",
  hitch: "trailer",
  plan(sc) { const c = planClimb(sc); return { climb: c, limit: Math.round(90 + Math.hypot(c.top.x - sc.x, c.top.z - sc.z) / 4 + c.climb * 1.5), pts: [
    { x: c.mid.x, z: c.mid.z, r: 22, label: "Up the lower slope" }, { x: c.top.x, z: c.top.z, r: 16, stop: true, label: `Stop on top (${c.climb} m up)` }] }; },
  setup(ctx) { ctx.load({ cargo: "Two fuel drums (training)", kg: 300, look: "drum" }); },
  tick(dt, ctx) {
    if (ctx.t > ctx.plan.limit) return { fail: "Out of time on the climb." };
    if (GS.load[0] && GS.load[0].cond < 30) return { fail: "The drums came off the trailer." };
    return null;
  },
  hud(ctx) { return `${Math.max(0, Math.ceil(ctx.plan.limit - ctx.t))} s of patience left`; }
});
SCHOOL.addMission("freight", {
  id: "priority", name: "Priority run against the clock", kind: "PRIORITY · TIMED",
  brief: "A furnace blower, fragile, to the marker and straight back before the instructor's stopwatch runs out. Late is a fail; so is breaking it.",
  hitch: "trailer",
  plan(sc) { const p = planPriority(sc), limit = Math.round(p.L * 2 * 1.1 / 10.5 + 35); return { run: p, limit, pts: [
    { x: p.mid.x, z: p.mid.z, r: 26, label: "Out to the marker" }, { x: p.to.x, z: p.to.z, r: 16, label: "Round the marker", say: "Round the marker. Clock's still running." },
    { x: p.mid.x, z: p.mid.z, r: 26, label: "Back to the yard" }, yardPt(sc, "Stop in the yard")] }; },
  setup(ctx) { ctx.load({ cargo: "Furnace blower & parts (training)", kg: 60, fragile: true, look: "crate" }); },
  tick(dt, ctx) {
    if (ctx.t > ctx.plan.limit) return { fail: "Too slow. The pipes froze." };
    if (GS.load[0] && GS.load[0].cond < 50) return { fail: "The blower's in pieces." };
    return null;
  },
  hud(ctx) { const l = ctx.plan.limit - ctx.t; return `${l > 0 ? Math.floor(l / 60) + ":" + String(Math.floor(l % 60)).padStart(2, "0") : "0:00"} on the clock`; }
});
SCHOOL.addMission("freight", {
  id: "expedition", name: "Flatbed expedition", kind: "FLATBED · EXPEDITION",
  brief: "The heavy flatbed with a 360 kg standby generator. Three checkpoints the long way round and back to the yard, with at least 60% of it left.",
  hitch: "flatbed",
  plan(sc) { const l = planLoop(sc); return { loop: l, pts: l.pts.map((p, i) => ({ x: p.x, z: p.z, r: 22, label: `Checkpoint ${i + 1} of 3` })).concat([yardPt(sc, "Home to the yard")]) }; },
  setup(ctx) { ctx.load({ cargo: "Standby generator (training)", kg: 360, bays: 2, look: "bigcrate" }); },
  tick(dt, ctx) { const j = GS.load[0]; if (j && j.cond < 60) return { fail: "Under 60%. Nobody signs for that." }; return null; },
  hud(ctx) { return `${(ctx.plan.loop.L / 1000).toFixed(1)} km loop`; }
});

/* ---- the App Store: Freight, Rescue and Real Estate are downloads; Trail Crew came with the tablet ---- */
const STORE = [
  { id: "freight", name: "Freight", by: "Nordkinn Frakt AS", price: 120, icon: TICON.freight, about: "Sign up for Freight school, earn your licence on the school's sleds, then take heavy, priority and expedition freight, each with its own pickup and drop-off." },
  { id: "rescue", name: "Rescue", by: "Nordkinn Redning", price: 90, icon: TICON.rescue, about: "Sign up for Rescue school: search, tow and hitch, getting people home. Once you're licensed, go on duty and callouts ping the dash." },
  { id: "realestate", name: "Real Estate", by: "Finnmark Eiendom", price: 50, icon: TICON.realestate, about: "Depot cabins round the peninsula. Tourists rent one while you're out, and it keeps a fuel cache topped up for you. No office: the app is the agent." },
  { id: "crew", name: "Trail Crew", by: "Nordkinn Løypelag", price: 0, icon: TICON.crew, about: "Grooming contracts and volunteer recovery call-outs. It came with the tablet.", builtin: true }
];
function storeGet(id) {
  const s = STORE.find(x => x.id === id); if (!s || s.builtin || GS.apps[id]) return;
  if (GS.cash < s.price) { toast(`${s.name} costs $${s.price}. You have $${GS.cash}.`, "warn"); return; }
  GS.cash -= s.price; GS.apps[id] = 1; tabPing("good"); save();
  toast(id === "realestate" ? `Real Estate installed. Four depot cabins on the books.` : `${s.name} installed. Open it to sign up for ${s.name} school.`, "good");
  TABLET.render();
}
TABLET.register({
  id: "store", name: "App Store", icon: TICON.store, order: 9,
  badge: () => STORE.filter(s => !s.builtin && !GS.apps[s.id]).length || "",
  render(el) {
    el.innerHTML = `<div class="tapp">${tabHead("APP STORE", "Get more work", fmtCash(GS.cash))}<div class="tstore">${STORE.map(s => {
      const have = s.builtin || GS.apps[s.id], poor = !have && GS.cash < s.price;
      return `<div class="tsto" data-tf="st:${s.id}"><span class="tic">${s.icon}</span><div><div class="tct"><span>${s.name}</span>${have ? chip("INSTALLED", "ok") : chip(s.price ? "$" + s.price : "FREE")}</div><div class="tcm">${s.by}</div><div class="tcn">${s.about}</div></div><button type="button" class="tbtn${have ? " ghost" : poor ? " blocked" : ""}" data-get="${s.id}">${have ? "OPEN" : "GET"}</button></div>`;
    }).join("")}</div><p class="tnote2">One-off prices, no subscriptions. Freight and Rescue each come with a sign-up for their licence school.</p></div>`;
    for (const b of el.querySelectorAll("[data-get]")) b.addEventListener("click", () => { const id = b.dataset.get; if (GS.apps[id] || id === "crew") TABLET.go(id); else storeGet(id); });
  }
});

/* ---- shared contract cards (Freight, Trail Crew, and the tours in Parcels) ---- */
const conFrom = c => c.from || depot;
const conKm = c => conFrom(c) === depot ? routeKm(c.dest) : Math.hypot(c.dest.x - conFrom(c).x, c.dest.z - conFrom(c).z) * 1.15 / 1000;
const conClimb = c => conFrom(c) === depot ? climbOf(c.dest) : Math.round(Math.max(0, c.dest.y - conFrom(c).y));
const bigTag = j => j.expedition ? "expedition" : j.priority ? "priority" : "heavy";
function conCard(c, k) {
  if (c.locked) return tabCard({ cls: "locked", title: c.locked, chips: chip("LOCKED"), meta: tabEsc(c.sub) });
  const why = contractBlock(c), d = c.dest, f = conFrom(c), km = conKm(c).toFixed(1), g = groom[d.id] || 0, here = GS.near === f;
  if (c.rescue) TABLET.miniDest[d.id] = d;
  const tag = c.tour ? "aurora" : c.rescue ? "recovery" : c.groom ? "grooming" : bigTag(c);
  let title = c.cargo, meta, note, pay = fmtCash(c.pay * payMul()), lbl, chips = chip(tag === "aurora" ? "AURORA · " + AUR.word(AUR.v).toUpperCase() : tag.toUpperCase(), tag);
  if (c.tour) {
    meta = `Kjøllefjord quay → ${c.dest.name} · ≈ ${km} km by trail · climb ${climbOf(d)} m`;
    note = `<span class="why">${tabEsc(c.pax[0].toUpperCase() + c.pax.slice(1))} off the ferry want the lights from ${tabEsc(c.dest.why)}.</span> They pay by how strong the aurora is when you get there, a third if it's faded. They ride behind you, not on the rack.`;
    pay = "~" + fmtCash(c.pay * tourMul(AUR.v) * payMul()); lbl = atQuay() ? "TAKE THEM UP" : "BOOK THEM";
  } else if (c.rescue) {
    chips += c.comps.map(x => chip(({ storm: "STORM", night: "NIGHT", hurt: "HURT", short: "COLD", two: "TWO STUCK" })[x], x === "short" || x === "hurt" ? "due" : "")).join("") + chip("CLOCK " + fmtTime(c.due), "due");
    meta = `${tabEsc(d.name)} · ≈ ${km} km by trail · ${["", "hand", "electric", "heavy"][c.needTier]} winch or better · ${TRAPS[c.trap].lvl >= 6 ? "hard" : TRAPS[c.trap].lvl >= 3 ? "tricky" : "easy"}`;
    note = `<span class="why">${tabEsc(c.why)}</span> Park on the rim, walk the line out and hook on, strap your sled back to a tree and reel them out. About ${c.reach} m of line to do it in one pull.`;
    lbl = "TAKE THE CALL";
  } else if (c.groom) {
    chips += chip("DUE " + fmtTime(c.due), "due") + (GS.own.parts.hitch === "tiller" ? chip("WIDE PAYS MORE", "ok") : "");
    meta = `${(Math.hypot(d.x - depot.x, d.z - depot.z) / 1000).toFixed(1)} km of line from the quay to ${shortName(d)} · climb ${climbOf(d)} m · <span class="${gsCls(g)}">${groomLabel(g)}</span>`;
    note = "Drag a groomer down the straight line from the quay and leave it set hard. Pays for how much you groom, more for a clean line, and up to a third more again if the wing tiller lays it wide (G for the wings).";
    lbl = "TAKE THE LINE";
  } else {
    if (c.due) chips += chip("DUE " + fmtTime(c.due), "due");
    if (f !== depot) chips += chip("PICKUP " + shortName(f).toUpperCase());
    meta = `${f === depot ? "Kjøllefjord quay" : shortName(f)} → ${shortName(d)} · ≈ ${km} km · climb ${conClimb(c)} m · ${c.kg} kg${c.fragile ? " · fragile" : ""}${here ? " · pickup is here" : " · pickup " + fmtMi(Math.hypot(f.x - P.x, f.z - P.z)) + " from you"}`;
    note = `${c.why ? `<span class="why">${tabEsc(c.why)}</span> ` : ""}Pays by condition, refused below 30%. The $${c.bond} bond comes back if it arrives whole${c.priority ? " and on time" : ""}.${c.bays > 1 ? " Takes the whole flatbed." : ""}${c.due ? ` Due ${fmtTime(c.due)}${c.priority ? ", late and they keep the bond" : ", late pays half"}.` : ""}`;
    lbl = here ? "STRAP IT DOWN" : "CLAIM";
  }
  return tabCard({ tf: "con:" + k, mini: `${c.tour || c.groom || c.rescue ? "depot" : f.id}|${d.id}|${c.groom ? "g" : c.tour ? "t" : c.rescue ? "r" : ""}`, title, chips, meta, note, warn: why, pay, act: "con:" + k, actLabel: lbl, blocked: !!why });
}
function conBind(el) {
  for (const b of el.querySelectorAll("[data-act^=con]")) b.addEventListener("click", () => takeContract(+b.dataset.act.split(":")[1]));
  tabMinis(el);
}
// GS.contracts holds every contract (indices are what takeContract wants); each app shows its own slice of it
function conList(test) { let h = "", n = 0; TABLET.miniDest = {}; (GS.contracts || []).forEach((c, k) => { if (test(c)) { h += conCard(c, k); n++; } }); return { h, n }; }
const isFreightCon = c => c.big || (c.locked && /freight|priority|expedition/i.test(c.locked));
const isCrewCon = c => c.groom || c.rescue || (c.locked && /groom|recovery/i.test(c.locked));

/* ---- the school card, shared by Freight and Rescue ---- */
function schoolCard(sc) {
  const sg = GS.signed[sc.id], lic = licensed(sc.id), done = schoolDone(sc.id), on = SCHOOL.on && SCHOOL.sc === sc, d = sc.x !== undefined ? Math.hypot(sc.x - P.x, sc.z - P.z) : 0;
  let h = sec(sc.short, lic ? "licensed" : !sc.missions.length ? "course coming" : sg ? `${done.length}/${sc.missions.length} passed` : "");
  if (lic) return h + `<p class="tnote2">${chip(sc.licence.toUpperCase(), "ok")} Signed at ${sc.name}. It's pinned up by the door.</p>`;
  const list = sc.missions.map((m, i) => `<div class="tsm2${done.includes(m.id) ? " ok" : on && SCHOOL.mi === i ? " now" : ""}"><b>${i + 1}</b><span>${tabEsc(m.name)}</span>${chip(done.includes(m.id) ? "PASSED" : on && SCHOOL.mi === i ? "NOW" : m.kind, done.includes(m.id) ? "ok" : on && SCHOOL.mi === i ? "due" : "")}</div>`).join("")
    || `<p class="tnote2">The instructors are still writing this course. Sign up now and it opens with the rescue update.</p>`;
  let act = "", lbl = "", note = "";
  if (on) { act = "sq"; lbl = "QUIT THE COURSE"; note = `On the course now: ${tabEsc(SCHOOL.m ? SCHOOL.m.name : "")}. ${tabEsc(SCHOOL.m ? SCHOOL.m.brief : "")} Quitting keeps what you've passed.`; }
  else if (!sg) { act = "su"; lbl = "SIGN UP FOR SCHOOL"; note = `Free with the app. ${sc.name} is ${fmtMi(d)} from you; signing up pins it on the Map and points the arrow there. On the course you ride the school's sled and your own waits in the yard.`; }
  else if (SCHOOL.here === sc && sc.missions.length) { act = "sb"; lbl = done.length ? "RESUME COURSE" : "START COURSE"; note = "You're in the yard. Your sled and anything on it stays parked here until you finish or quit."; }
  else { act = "sg"; lbl = SCHOOL.guide === sc.id ? "STOP GUIDING" : "GUIDE ME THERE"; note = `${sc.name}, ${fmtMi(d)} from you. Stop in the yard to start.`; }
  h += tabCard({ tf: "sch:" + sc.id, title: sc.name, chips: sg ? chip("SIGNED UP", "ok") : chip("SCHOOL"), meta: `${sc.missions.length ? sc.missions.length + " missions on the school's Matriarch 850T" : "course being written"} · licence at the end`, note, pay: "", act: "sch:" + act, actLabel: lbl, blocked: act === "sb" && !!schoolCanStart(sc) });
  return h + (sc.missions.length ? `<div class="tsml2">${list}</div>` : list);
}
function schoolBind(el, sc) {
  for (const b of el.querySelectorAll("[data-act^=sch]")) b.addEventListener("click", () => {
    const a = b.dataset.act.split(":")[1];
    if (a === "su") schoolSignUp(sc.id);
    else if (a === "sb") schoolBegin(sc.id);
    else if (a === "sq") schoolEnd("quit");
    else if (a === "sg") { SCHOOL.guide = SCHOOL.guide === sc.id ? null : sc.id; TABLET.render(); }
  });
}

/* ---- Freight: heavy, priority and expedition contracts, behind the licence and the ranks ---- */
TABLET.register({
  id: "freight", name: "Freight", icon: TICON.freight, order: 5,
  hidden: () => !GS.apps.freight,
  badge: () => licensed("freight") ? (GS.contracts || []).filter(c => c.big).length || "" : SCHOOL.on && SCHOOL.sc === SCHOOLS.freight ? "!" : "",
  onOpen() { tabWork(); ctRoutes(); },
  render(el) {
    const sc = SCHOOLS.freight, lic = licensed("freight"), bg = bigLoads().filter(j => !j.school);
    let h = tabHead("FREIGHT · NORDKINN FRAKT AS", "Freight", fmtCash(GS.cash));
    h += `<div class="tsub">${lic ? chip("FREIGHT LICENCE", "ok") + " " : ""}${rankOf(GS.delivered).name} · ${HITCH_ON[GS.own.parts.hitch]}${ST.bays ? ` · ${baysUsed()}/${ST.bays} bays` : ""}${claimBays() ? ` · ${claimBays()} claimed` : ""}</div>`;
    h += schoolCard(sc);
    if (bg.length) { h += sec("Under way", ""); for (const j of bg) h += tabCard({ tf: "bg:" + j.cargo, mini: `${conFrom(j).id}|${j.dest.id}`, title: j.cargo, chips: chip(bigTag(j).toUpperCase(), bigTag(j)) + (j.due ? chip("DUE " + fmtTime(j.due), "due") : ""), meta: `to ${shortName(j.dest)} · ${Math.round(j.cond)}% condition · ${j.kg} kg`, pay: fmtCash(j.pay * payMul()) }); }
    const cl = GS.claims.filter(j => j.big);
    if (cl.length) { h += sec("Claimed · waiting at the pickup", ""); cl.forEach((c, i) => { h += tabCard({ tf: "fcl:" + i, mini: `${conFrom(c).id}|${c.dest.id}`, title: c.cargo, chips: chip(bigTag(c).toUpperCase(), bigTag(c)), meta: `pick up at ${conFrom(c).name} (${fmtMi(Math.hypot(conFrom(c).x - P.x, conFrom(c).z - P.z))} from you), then to ${shortName(c.dest)} · $${c.bond} bond at pickup`, pay: fmtCash(c.pay * payMul()) }); }); }
    const { h: ph, n } = conList(isFreightCon);
    h += sec("Posted", lic ? "claim it, ride to the P, strap it down; at the P it loads straight on" : "your licence opens these");
    h += n ? ph : `<p class="tnote2">Nothing posted right now.</p>`;
    h += `<p class="tnote2">Trailer work pays by condition. A bond goes up front and comes back on a clean delivery. Ranks still open the bigger work: heavy at ${RANKS[2].at} deliveries, priority at ${RANKS[3].at}, expeditions at ${RANKS[4].at}.</p>`;
    el.innerHTML = `<div class="tapp">${h}</div>`;
    conBind(el); schoolBind(el, sc);
  }
});

/* ---- Trail Crew: grooming (and, until the Rescue career, volunteer recovery call-outs) ---- */
TABLET.register({
  id: "crew", name: "Trail Crew", icon: TICON.crew, order: 5.5,
  badge: () => (GS.contracts || []).filter(c => c.groom || c.rescue).length || "",
  onOpen() { tabWork(); ctRoutes(); updGroom(); },
  render(el) {
    let h = tabHead("TRAIL CREW · NORDKINN LØYPELAG", "Trail Crew", fmtCash(GS.cash));
    h += `<div class="tsub">${HITCH_ON[GS.own.parts.hitch]}${GS.own.parts.hitch === "tiller" ? ` · wings ${TOW.wingOn ? "out (5.8 m)" : "folded (2.6 m)"}` : ""} · ${ST.winch ? ["", "hand", "electric", "heavy-duty"][ST.winch] + " winch" : "no winch"}</div>`;
    if (GS.groomJob || GS.rescueJob) {
      h += sec("Under way", "");
      if (GS.groomJob) { const g = GS.groomJob, wf = g.pts.length ? g.pts.filter(q => q.wide).length / g.pts.length : 0; h += tabCard({ tf: "gj", mini: `depot|${g.dest.id}|g`, title: g.cargo, chips: chip("GROOMING", "grooming") + (wf >= 0.6 ? chip("WIDE TRAIL", "ok") : ""), meta: `${Math.round(groomFrac(g) * 100)}% of the line groomed · ${Math.round(wf * 100)}% of it wide · due ${fmtTime(g.due)}`, pay: fmtCash(g.pay * payMul()) }); }
      if (GS.rescueJob) h += tabCard({ tf: "rj", title: GS.rescueJob.cargo || "Recovery call-out", chips: chip("RECOVERY", "recovery"), meta: `clock runs out ${fmtTime(GS.rescueJob.due)}`, pay: fmtCash(GS.rescueJob.pay * payMul()) });
    }
    const gr = conList(c => c.groom || (c.locked && /groom/i.test(c.locked)));
    h += sec("Grooming", "lines out from the quay"); h += gr.n ? gr.h : `<p class="tnote2">No lines posted right now.</p>`;
    const rc = conList(c => c.rescue || (c.locked && /recovery/i.test(c.locked)));
    if (rc.n) { h += sec("Volunteer recovery", "stuck riders, no licence needed"); h += rc.h; }
    el.innerHTML = `<div class="tapp">${h}</div>`;
    // conList resets miniDest per call, so collect the rescue sites again before the minis draw
    TABLET.miniDest = {}; for (const c of GS.contracts || []) if (c.rescue) TABLET.miniDest[c.dest.id] = c.dest;
    conBind(el);
  }
});

/* ---- Rescue: the app is registered with the search-and-rescue block (O5), near the end of the file ---- */

function gameKey(e) {
  if (GS.dead) return;
  if (e.code === "KeyQ") { if (FOOT.on) mount(); else dismount(); return; }
  if (e.code === "KeyX") { footAssess(); return; }
  if (e.code === "KeyE" && FOOT.on && !GS.garageOpen) { if (FISH && FISH.ctx()) return; footAction(); return; }
  if (e.code === "KeyE") { if (!e.repeat && !(FISH && FISH.ctx())) horn(); return; }   // E: go fishing / tackle shop / fish buyer when you're stopped at one, the horn otherwise
  if (e.code === "KeyT") { if (GS.garageOpen) closeGarage(); else if (GS.near === garageSite) openGarage(); else toast("The garage is the shed across the road from the quay.", "warn"); }
  if (e.code === "KeyB") { TABLET.toggle(undefined, "weather"); return; }   // B for barometer: the tablet's Weather app
  if (e.code === "Escape") { if (godOpen) toggleGod(false); else if (!$("bigmap").hidden) toggleBigMap(false); else if (GS.garageOpen) closeGarage(); else toggleSettings(); }
  if (e.code === "KeyG") toggleWings();
  if (e.code === "KeyF") callForHelp();
  if (e.code === "KeyZ") wipeVisor();
}

/* settings: paint, rider kit, volume */
// Colour lives in two places that never touch: the sled's livery (body / panel / trim / seat,
// designed per machine, with the body and seat repaintable per machine) and the rider's kit
// (jacket / trim / pants / helmet, yours everywhere). Graphics on the hood use the sled's trim
// colour; the rider's shoulders use the rider's.
const SLED_COLORS = ["#ff5a1f", "#ffd23f", "#4fd06a", "#38b6ff", "#9b6bff", "#ff4d8d", "#f2f6fb", "#20262e", "#b5651d", "#00e0c6"];
const JACKET_COLORS = ["#1d3f6e", "#8c1f2f", "#1f6b4a", "#e0e6ec", "#c8541e", "#2b2f36", "#6b4ea8", "#d8c23a"];
const TRIM_COLORS = ["#eef2f5", "#ff5a1f", "#111820", "#d8e94a", "#7fc8e0", "#c9a227"];
const PANTS_COLORS = ["#232a33", "#3c4654", "#6b7683", "#1d3f6e", "#4a3b2c", "#111418"];
const STYLES = [["solid", "Solid"], ["twotone", "Two-tone"], ["racer", "Racing stripe"], ["hivis", "Hi-vis"]];
const SEAT_COLORS = ["stock", "#1a2027", "#5a3a24", "#8c1f2f", "#c9b48a", "#2f4a6b", "#eef2f5"];
const HELMET_COLORS = ["#f2f5f8", "#111820", "#ff5a1f", "#d8c23a", "#38b6ff", "#8c1f2f", "#4fd06a"];
const DECALS = [["none", "Clean"], ["stripe", "Twin stripes"], ["wide", "Wide stripe"], ["flash", "Side flash"]];
const SET = { paint: {}, jacket: "#1d3f6e", trim: "#eef2f5", pants: "#232a33", style: "twotone", helmet: "#f2f5f8", decal: "none", canMatch: false, vol: 0.35, hud: true, touch: "auto" };
function loadSettings() { try { const d = JSON.parse(localStorage.getItem("tracklayer.set.v1") || "null"); if (d) Object.assign(SET, d); } catch (e) { } if (!SET.paint || typeof SET.paint !== "object") SET.paint = {}; }
function saveSettings() { try { localStorage.setItem("tracklayer.set.v1", JSON.stringify(SET)); } catch (e) { } }
// the sled the settings are painting: whatever the garage is previewing, else the one you own
const paintSled = () => (PV.sled && SLEDS.find(x => x.id === PV.sled)) || sledDef();
function liveryOf(sd) {
  const sch = typeof SCHOOL !== "undefined" && SCHOOL.on && sd.id === SCHOOL_SLED && GS.own.sled === SCHOOL_SLED;   // the school sled wears the school's colours
  const L = sch ? SCHOOL_LIVERY[SCHOOL.sc.id] : sd.livery, o = sch ? {} : SET.paint[sd.id] || {};
  return { body: o.body || L.body, panel: L.panel, trim: L.trim, seat: o.seat || L.seat, stock: !o.body && !o.seat };
}
function setPaint(sd, key, val) {
  const o = SET.paint[sd.id] || (SET.paint[sd.id] = {});
  if (val === "stock" || val === null || val === undefined) delete o[key]; else o[key] = val;
  if (!Object.keys(o).length) delete SET.paint[sd.id];
}
function applyLivery(sd) {
  const L = liveryOf(sd);
  if (!bodyMat) return L;
  bodyMat.color.set(L.body); panelMat.color.set(L.panel); sledTrimMat.color.set(L.trim); V.seatMat.color.set(L.seat);
  V.canMat.color.set(SET.canMatch ? L.body : "#b3201a");
  return L;
}
function applySettings() {
  const sd = paintSled(), L = applyLivery(sd), o = SET.paint[sd.id] || {};
  if (jacketMat) { jacketMat.color.set(SET.jacket); riderTrimMat.color.set(SET.trim); pantsMat.color.set(SET.pants); }
  if (V.helmetMat) V.helmetMat.color.set(SET.helmet);
  const cb = $("canBtn"); if (cb) { cb.textContent = SET.canMatch ? "Jerry cans: match sled" : "Jerry cans: red"; cb.classList.toggle("on", SET.canMatch); }
  if (V.machines) for (const id in V.machines) for (const [k, list] of Object.entries(V.machines[id].userData.decal)) list.forEach(m => m.visible = SET.decal === k);
  const db = $("decalBtns"); if (db) [...db.children].forEach(b => b.classList.toggle("on", b.dataset.s === SET.decal));
  if (styleParts.stripe) {
    const st = SET.style;
    styleParts.stripe.visible = st === "racer" && !V.headHid;
    styleParts.back.visible = (st === "twotone" || st === "hivis") && !V.headHid;
    styleParts.chestPanel.visible = (st === "twotone" || st === "hivis") && !V.headHid;
    styleParts.sleeves.forEach(m => m.visible = st === "racer" || st === "hivis");
  }
  for (const [k, id] of [["jacket", "jacketSw"], ["trim", "trimSw"], ["pants", "pantsSw"], ["helmet", "helmetSw"]]) {
    const el = $(id); if (el) [...el.children].forEach(b => b.classList.toggle("on", b.dataset.c === SET[k]));
  }
  const sw = $("swatches"); if (sw) [...sw.children].forEach(b => b.classList.toggle("on", b.dataset.c === o.body));
  const ss = $("seatSw"); if (ss) [...ss.children].forEach(b => b.classList.toggle("on", o.seat ? b.dataset.c === o.seat : b.dataset.c === "stock"));
  const sb = $("styleBtns"); if (sb) [...sb.children].forEach(b => b.classList.toggle("on", b.dataset.s === SET.style));
  if (audio) audio.master.gain.value = muted ? 0 : SET.vol;
  const hue = $("hue"); if (hue) hue.value = Math.round(new THREE.Color(L.body).getHSL({ h: 0, s: 0, l: 0 }).h * 360);
  const vol = $("vol"); if (vol) vol.value = Math.round(SET.vol * 100);
  const mb = $("muteBtn"); if (mb) mb.textContent = muted ? "Sound: off" : "Sound: on";
  const cs = $("colorSwatch"); if (cs) { cs.style.background = `linear-gradient(135deg, ${L.body} 0 50%, ${L.panel} 50% 82%, ${L.trim} 82% 100%)`; cs.title = `${sd.name}: ${sd.livery.name}`; }
  const lb = $("liveryBtn"); if (lb) { lb.textContent = L.stock ? "Stock livery" : "Back to stock livery"; lb.disabled = L.stock; }
  const ln = $("liveryName"); if (ln) ln.innerHTML = `<b>${sd.name}</b> · ${L.stock ? sd.livery.name : "custom paint"}`;
}
function swatchRow(id, colors, key, onPick) {
  const box = $(id);
  colors.forEach(c => {
    const b = document.createElement("button"); b.className = "sw"; b.dataset.c = c; b.title = c === "stock" ? "Stock seat" : c;
    b.style.background = c === "stock" ? "repeating-linear-gradient(45deg, #2a3340 0 6px, #4a5566 6px 12px)" : c;
    b.addEventListener("click", () => { if (onPick) onPick(c); else SET[key] = c; applySettings(); saveSettings(); });
    box.appendChild(b);
  });
}
function buildSettings() {
  swatchRow("swatches", SLED_COLORS, null, c => setPaint(paintSled(), "body", c));
  swatchRow("jacketSw", JACKET_COLORS, "jacket");
  swatchRow("trimSw", TRIM_COLORS, "trim");
  swatchRow("pantsSw", PANTS_COLORS, "pants");
  swatchRow("seatSw", SEAT_COLORS, null, c => setPaint(paintSled(), "seat", c));
  $("liveryBtn").addEventListener("click", () => { delete SET.paint[paintSled().id]; applySettings(); saveSettings(); });
  $("canBtn").addEventListener("click", () => { SET.canMatch = !SET.canMatch; applySettings(); saveSettings(); });
  swatchRow("helmetSw", HELMET_COLORS, "helmet");
  DECALS.forEach(([id, name]) => {
    const b = document.createElement("button"); b.className = "sbtn st"; b.dataset.s = id; b.textContent = name;
    b.addEventListener("click", () => { SET.decal = id; applySettings(); saveSettings(); });
    $("decalBtns").appendChild(b);
  });
  STYLES.forEach(([id, name]) => {
    const b = document.createElement("button"); b.className = "sbtn st"; b.dataset.s = id; b.textContent = name;
    b.addEventListener("click", () => { SET.style = id; applySettings(); saveSettings(); });
    $("styleBtns").appendChild(b);
  });
  $("randomKit").addEventListener("click", () => {
    const pick = a => a[(Math.random() * a.length) | 0];
    SET.jacket = pick(JACKET_COLORS); SET.trim = pick(TRIM_COLORS); SET.pants = pick(PANTS_COLORS); SET.style = pick(STYLES)[0];
    SET.helmet = pick(HELMET_COLORS);
    applySettings(); saveSettings();
  });
  $("hue").addEventListener("input", e => { setPaint(paintSled(), "body", "#" + new THREE.Color().setHSL(e.target.value / 360, 0.85, 0.55).getHexString()); applySettings(); saveSettings(); });
  $("vol").addEventListener("input", e => { SET.vol = e.target.value / 100; muted = SET.vol === 0; applySettings(); saveSettings(); });
  $("muteBtn").addEventListener("click", () => { muted = !muted; applySettings(); saveSettings(); });
  $("viewBtn").addEventListener("click", () => { cycleView(); $("viewBtn").textContent = "View: " + VIEWS[camMode].n; });
  $("closeSet").addEventListener("click", () => toggleSettings(false));
  const TL = { auto: "Touch controls: auto", on: "Touch controls: on", off: "Touch controls: off" }, tb = $("touchBtn");
  if (!TL[SET.touch]) SET.touch = "auto";
  tb.textContent = TL[SET.touch];
  tb.addEventListener("click", () => { SET.touch = SET.touch === "auto" ? "on" : SET.touch === "on" ? "off" : "auto"; tb.textContent = TL[SET.touch]; saveSettings(); setTouchUI(); });
  $("godBtn").addEventListener("click", () => { if (!started || GS.dead) return; toggleSettings(false); toggleGod(true); });
  $("towBtn").addEventListener("click", () => { if (!started || GS.dead) return; toggleSettings(false); gameKey({ code: "KeyF" }); });
  $("closeMap").addEventListener("click", () => toggleBigMap(false));
  setTouchUI();
  applySettings();
}
function toggleSettings(force) {
  const open = force !== undefined ? force : $("settings").hidden;
  $("settings").hidden = !open;
  if (open) { TABLET.close(true); $("viewBtn").textContent = "View: " + VIEWS[camMode].n; applySettings(); }
}

/* ---------------- sleds, parts, gear ---------------- */
// Five generations of sled, the way they actually aged: heavy thirsty fan-cooled singles
// through modern light turbo mountain machines. Each one takes the parts below.
const SLEDS = [
  {
    id: "frontier", name: "Frontier 340", year: "1970", cost: 0, need: 0,
    era: "Bogie-wheel era — think Ski-Doo Olympique or Arctic Cat Panther",
    blurb: "Fan-cooled single, bogie wheels, a bench seat and a chrome hoop bumper. It starts. Most of the time.",
    power: 1, fuel: 16, drag: 1.25, grip: -0.6, trackLen: 1.0,
    livery: { body: "#f0bd2a", panel: "#1c1c1c", trim: "#c8102e", seat: "#1a1a1a", name: "Olympic yellow over black, red pinstripe" },
    shape: { style: "round", w: 0.78, hoodL: 1.22, zPeak: 0.42, round: 0.62, yTop: 0.86, yPeak: 0.94, yNose: 0.7, yBelly: 0.36, pan: 0.56, tunnelW: 0.56, tunnelL: 1.85, tailRound: true, chrome: true, seat: "bench", barY: 1.1, barZ: 0.3, lamp: "round", bumper: "hoop", skis: "steel", susp: "leaf", gauges: "round", shieldFrame: true, bogies: true, exhaust: -1, trackW: 0.86, extras: [] }
  },
  {
    id: "woodsman", name: "Woodsman 440 W/T", year: "1979", cost: 600, need: 4,
    era: "Wide-track workhorse — the Ski-Doo Alpine and Skandic idea",
    blurb: "Twin-cylinder plodder on a wide track, built to haul wood and drag sleds. Slow, unkillable.",
    power: 1.2, fuel: 22, drag: 1.0, grip: 0.4, trackLen: 1.12,
    livery: { body: "#2f5d3a", panel: "#d9cfa8", trim: "#e0a72d", seat: "#4a3626", name: "Forest green over cream, mustard stripe" },
    shape: { style: "flat", w: 0.92, hoodL: 1.08, zPeak: 0.3, round: 0.5, yTop: 0.9, yPeak: 0.93, yNose: 0.8, yBelly: 0.36, pan: 0.6, tunnelW: 0.72, tunnelL: 2.1, tailRound: true, chrome: true, seat: "bench", barY: 1.14, barZ: 0.3, lamp: "rect", bumper: "hoop", skis: "steel", susp: "leaf", gauges: "round", rack: true, fins: true, exhaust: 1, trackW: 1.3, extras: ["tallshield"] }
  },
  {
    id: "ranger", name: "Ranger 500", year: "1989", cost: 900, need: 8,
    era: "Independent front suspension trail sled — the Polaris Indy generation",
    blurb: "Wedge hood, twin lamps, slide rail suspension. The first one that actually goes where you point it.",
    power: 1.41, fuel: 20, drag: 1.02, grip: 0.3, trackLen: 1.05,
    livery: { body: "#1a3c8c", panel: "#e8ecef", trim: "#e8342a", seat: "#1a2027", name: "Indy blue over white, red flash" },
    shape: { style: "wedge", w: 0.84, hoodL: 1.3, zPeak: 0.04, round: 0.2, yTop: 0.96, yPeak: 0.96, yNose: 0.6, yBelly: 0.34, pan: 0.55, tunnelW: 0.56, tunnelL: 1.95, seat: "saddle", barY: 1.18, barZ: 0.32, lamp: "twin", bumper: "bar", skis: "steel", susp: "aarm", gauges: "round", fins: true, exhaust: 1, trackW: 1.0, extras: [] }
  },
  {
    id: "sprint", name: "Sprint 580 SX", year: "1994", cost: 1700, need: 13,
    era: "Trail-racer years — Yamaha SRX, Ski-Doo MXZ, Cat ZR",
    blurb: "Low, loud and geared for the lake run. Terrible in deep snow, glorious on a groomed trail.",
    power: 1.58, fuel: 18, drag: 1.12, grip: 1.1, trackLen: 0.98,
    livery: { body: "#7a1e9c", panel: "#12151a", trim: "#3ef0c8", seat: "#12151a", name: "Nineties purple over black, teal splash" },
    shape: { style: "wedge", w: 0.82, hoodL: 1.4, zPeak: 0.06, round: 0.15, yTop: 0.9, yPeak: 0.9, yNose: 0.56, yBelly: 0.32, pan: 0.5, tunnelW: 0.54, tunnelL: 1.9, seat: "sport", barY: 1.12, barZ: 0.32, lamp: "slit", bumper: "none", skis: "plastic", susp: "aarm", raceStripe: true, fins: true, exhaust: 1, trackW: 0.94, extras: ["lowshield"] }
  },
  {
    id: "summit", name: "Summit 600", year: "2004", cost: 2400, need: 18,
    era: "Mountain sleds go long — Ski-Doo Summit, Polaris RMK",
    blurb: "Liquid twin, long track, proper mountain geometry. Floats where the Ranger digs.",
    power: 1.68, fuel: 24, drag: 0.88, grip: 0.8, trackLen: 1.18,
    livery: { body: "#ff6a1a", panel: "#1e232b", trim: "#f4f6f8", seat: "#1e232b", name: "Mountain orange over charcoal, white stripe" },
    shape: { style: "round", w: 0.8, hoodL: 1.2, zPeak: 0.28, round: 0.55, yTop: 0.96, yPeak: 1.02, yNose: 0.68, yBelly: 0.38, pan: 0.6, tunnelW: 0.56, tunnelL: 2.05, seat: "saddle", barY: 1.16, barZ: 0.32, lamp: "slit", bumper: "none", skis: "powder", susp: "aarm", fins: true, exhaust: 1, trackW: 1.05, extras: ["lowshield"] }
  },
  {
    id: "trekker", name: "Trekker 550 Tour", year: "2009", cost: 3400, need: 24,
    era: "Two-up touring — Grand Touring and Yamaha Venture territory",
    blurb: "Heated grips, a passenger seat nobody uses, and a windshield like a garage door. Warm and heavy.",
    power: 1.61, fuel: 30, drag: 1.0, grip: 0.6, trackLen: 1.1,
    livery: { body: "#6b1f2a", panel: "#b5b8bd", trim: "#c9a227", seat: "#3b2a22", name: "Burgundy over silver, gold pinstripe" },
    shape: { style: "round", w: 0.94, hoodL: 1.25, zPeak: 0.36, round: 0.6, yTop: 1.0, yPeak: 1.05, yNose: 0.76, yBelly: 0.38, pan: 0.62, tunnelW: 0.62, tunnelL: 2.25, seat: "twoup", barY: 1.2, barZ: 0.32, lamp: "twin", bumper: "bar", skis: "plastic", susp: "aarm", rack: true, fins: true, exhaust: 1, trackW: 1.05, extras: ["tallshield", "mirrors"] }
  },
  {
    id: "apex", name: "Apex 800", year: "2015", cost: 5200, need: 32,
    era: "Rider-forward chassis — the REV and ProCross school",
    blurb: "Light chassis, fuel injection, you stand over the skis instead of behind them. Climbs like it's annoyed.",
    power: 2.02, fuel: 26, drag: 0.78, grip: 1.3, trackLen: 1.22,
    livery: { body: "#eef1f4", panel: "#d81e2c", trim: "#111418", seat: "#111418", name: "Race white over red, black graphics" },
    shape: { style: "riderfwd", w: 0.78, hoodL: 1.02, zPeak: 0.14, round: 0.3, yTop: 1.08, yPeak: 1.1, yNose: 0.62, yBelly: 0.36, pan: 0.66, tunnelW: 0.54, tunnelL: 2.0, seat: "sport", barY: 1.24, barZ: 0.38, lamp: "led", bumper: "none", skis: "plastic", susp: "aarm", spoiler: true, fins: true, exhaust: 1, trackW: 1.05, extras: ["lowshield"] }
  },
  {
    id: "matriarch", name: "Matriarch 850T", year: "2026", cost: 9800, need: 46,
    era: "Factory turbo mountain — Summit Turbo R, Patriot Boost",
    blurb: "Turbo, carbon tunnel, electric everything. The whole map gets smaller.",
    power: 2.5, fuel: 30, drag: 0.66, grip: 1.8, trackLen: 1.25,
    livery: { body: "#0d1117", panel: "#2a3140", trim: "#ff7a00", seat: "#0d1117", name: "Matte black over gunmetal, hi-vis orange" },
    shape: { style: "riderfwd", w: 0.78, hoodL: 1.06, zPeak: 0.1, round: 0.28, yTop: 1.12, yPeak: 1.13, yNose: 0.6, yBelly: 0.36, pan: 0.7, tunnelW: 0.54, tunnelL: 2.1, seat: "sport", barY: 1.27, barZ: 0.4, lamp: "led", bumper: "skid", skis: "powder", susp: "aarm", spoiler: true, fins: true, trackW: 1.12, extras: ["turbo", "lightbar"] }
  },
  {
    id: "aurora", name: "Aurora E", year: "2029", cost: 14500, need: 60,
    era: "Battery sleds — where Taiga and the electric prototypes are heading",
    blurb: "Silent, instant torque, and a battery gauge instead of a tank. You hear the snow instead of the engine.",
    power: 2.24, fuel: 34, drag: 0.72, grip: 1.6, trackLen: 1.2,
    livery: { body: "#c6e6ea", panel: "#1d3557", trim: "#7cf2a0", seat: "#1d3557", name: "Glacier ice over navy, mint accent" },
    shape: { style: "smooth", w: 0.8, hoodL: 1.18, zPeak: 0.32, round: 0.5, yTop: 1.0, yPeak: 1.02, yNose: 0.7, yBelly: 0.4, pan: 0.64, tunnelW: 0.56, tunnelL: 2.0, seat: "sport", barY: 1.2, barZ: 0.36, lamp: "strip", bumper: "none", skis: "plastic", susp: "aarm", spoiler: true, charge: true, trackW: 1.08, extras: ["lightbar"] }
  }
];

// Aftermarket catalogue. Everything fits every sled — that's the point.
// tier: the sled generation you need before the shop will order it in.
const PARTS = {
  track: {
    label: "Track", must: true, options: [
      { id: "stock", name: "Stock 1.25\" trail track", cost: 0, tier: 0, stats: {}, note: "What it came with." },
      { id: "trail", name: "1.35\" hard-pack trail track", cost: 320, tier: 1, stats: { grip: 0.9, drag: 0.04 }, note: "Bites packed trail, hates powder." },
      { id: "paddle", name: "2.6\" backcountry paddle", cost: 780, tier: 2, stats: { drag: -0.22, grip: 0.6, power: -0.03 }, note: "Floats in deep snow, drags on ice." },
      { id: "stud", name: "Studded ice track", cost: 620, tier: 1, stats: { grip: 2.2, drag: 0.1 }, note: "Carbide studs. Lake runs become a straight line." },
      { id: "hybrid", name: "1.75\" studded hybrid track", cost: 1150, tier: 3, look: "stud", stats: { grip: 1.7, drag: -0.08 }, note: "Studs on a mid-height lug. Holds on lake ice and still gets through the drifts." },
      { id: "mountain", name: "3.0\" mountain paddle", cost: 1600, tier: 4, look: "paddle", stats: { drag: -0.34, grip: 0.5, power: -0.05 }, note: "Tall lugs for the steep, deep stuff. Eats a little power, climbs anything with snow on it." }
    ]
  },
  skis: {
    label: "Skis", must: true, options: [
      { id: "stock", name: "Stock steel skis", cost: 0, tier: 0, stats: {} },
      { id: "carbide", name: "Dual-carbide trail skis", cost: 260, tier: 1, stats: { grip: 0.7 }, note: "Runners that hold a line." },
      { id: "powder", name: "Wide powder skis", cost: 540, tier: 2, stats: { drag: -0.12, grip: -0.2 }, note: "Keeps the nose up in the deep." },
      { id: "ice", name: "Ice-racing skis", cost: 420, tier: 2, look: "carbide", stats: { grip: 1.3, drag: 0.06 }, note: "Sharp carbides, stiff keel. On lake ice it goes exactly where you point it; in powder it digs." },
      { id: "mountain", name: "Mountain skis & keel runners", cost: 760, tier: 3, look: "powder", stats: { drag: -0.14, grip: 0.4 }, note: "Narrow waist, deep keel: floats in the deep and still holds a side-hill." }
    ]
  },
  clutch: {
    label: "Clutch & fuelling", must: true, options: [
      { id: "stock", name: "Stock clutching", cost: 0, tier: 0, stats: {} },
      { id: "helix", name: "Helix & spring kit", cost: 340, tier: 1, stats: { power: 0.1 }, note: "Backshifts instead of sulking." },
      { id: "efi", name: "EFI conversion & mapped ECU", cost: 1350, tier: 3, stats: { power: 0.08, burn: -0.2 }, note: "Fuel injection. A little sharper, a lot further on a tank." }
    ]
  },
  // bolted to whatever engine is in the sled; `boost` is a share of that engine's own power
  boost: {
    label: "Forced induction", options: [
      { id: "none", name: "Naturally aspirated", cost: 0, tier: 0, stats: {}, note: "Breathes whatever the fell gives it." },
      { id: "super", name: "Belt-driven supercharger", cost: 1400, tier: 1, na: true, stats: { boost: 0.16, burn: 0.1 }, note: "Instant shove off the bottom, no lag, a bit of whine." },
      { id: "turbo", name: "Bolt-on turbo kit", cost: 2400, tier: 2, na: true, stats: { boost: 0.28, burn: 0.18 }, note: "Wastegate, blow-off valve, a pipe that glows at night. Altitude stops mattering." },
      { id: "stage3", name: "Stage 3 turbo & intercooler", cost: 4200, tier: 4, na: true, look: "turbo", stats: { boost: 0.42, burn: 0.3 }, note: "Big snail, bigger boost. The fuel gauge moves while you watch it." },
      { id: "tune", name: "Boost controller & tune", cost: 900, tier: 1, fac: true, stats: { boost: 0.12, burn: 0.06 }, note: "Turns up a factory turbo. Only fits a turbo engine." }
    ]
  },
  can: {
    label: "Exhaust", options: [
      { id: "stock", name: "Stock silencer", cost: 0, tier: 0, stats: {} },
      { id: "trail", name: "Trail can", cost: 180, tier: 1, stats: { power: 0.05 }, note: "A little more bark." },
      { id: "race", name: "Race can", cost: 460, tier: 2, stats: { power: 0.12, burn: 0.05 }, note: "Everyone in the valley knows you're out." },
      { id: "quiet", name: "Quiet-core silencer", cost: 260, tier: 1, look: "trail", stats: { power: 0.02, burn: -0.05 }, note: "Hush can for riding through the villages. Runs a touch leaner, a touch kinder on the tank." },
      { id: "pipe", name: "Tuned single pipe", cost: 880, tier: 3, look: "race", stats: { power: 0.18, burn: 0.07 }, note: "A proper expansion chamber. Pulls hard from mid-range up." }
    ]
  },
  susp: {
    label: "Suspension", options: [
      { id: "stock", name: "Stock shocks", cost: 0, tier: 0, stats: {} },
      { id: "coil", name: "Rebuilt coilovers", cost: 300, tier: 1, stats: { soak: 1.5 }, note: "Landings stop hurting the cargo." },
      { id: "long", name: "Long-travel kit", cost: 720, tier: 2, stats: { soak: 3, grip: 0.3 }, note: "Moguls become suggestions." },
      { id: "air", name: "Remote-reservoir air shocks", cost: 1250, tier: 3, look: "long", stats: { soak: 4.5, grip: 0.45 }, note: "Adjustable on the fly. Big hits land like small ones." }
    ]
  },
  bars: {
    label: "Bars & risers", options: [
      { id: "stock", name: "Stock bars", cost: 0, tier: 0, stats: {} },
      { id: "riser", name: "6\" riser & hook bars", cost: 190, tier: 1, stats: { grip: 0.2, soak: 0.5 }, note: "Stand-up riding without the backache." },
      { id: "guards", name: "Riser, hooks & handguards", cost: 330, tier: 1, stats: { grip: 0.2, soak: 0.5, cold: 1 }, note: "Wind off your hands." },
      { id: "tall", name: "10\" mountain riser & strap", cost: 420, tier: 3, look: "guards", stats: { grip: 0.35, soak: 0.8, cold: 1 }, note: "Tall bars for riding stood up on a side-hill, with guards and a strap to haul the nose round." }
    ]
  },
  grips: {
    label: "Heated grips & seat", options: [
      { id: "stock", name: "Plain grips", cost: 0, tier: 0, stats: {}, note: "Rubber. Cold rubber." },
      { id: "grips", name: "Heated grips & thumb warmer", cost: 140, tier: 0, stats: { cold: 1.2 }, note: "Hot bars under your mitts." },
      { id: "full", name: "Heated grips, thumb & seat", cost: 380, tier: 2, stats: { cold: 2.4, burn: 0.02 }, note: "The stator works for a living. You'll last longer on the fell." }
    ]
  },
  shield: {
    label: "Windshield", options: [
      { id: "low", name: "Low race shield", cost: 0, tier: 0, stats: { cold: -0.5 }, note: "Looks fast. Is cold." },
      { id: "mid", name: "Mid trail shield", cost: 120, tier: 0, stats: { cold: 1 } },
      { id: "tall", name: "Tall touring shield", cost: 280, tier: 1, stats: { cold: 2.2, drag: 0.03 }, note: "A wall of quiet air." },
      { id: "heated", name: "Heated shield & knee deflectors", cost: 520, tier: 2, look: "tall", stats: { cold: 3.2, drag: 0.04 }, note: "A wire-heated screen that never ices over, and side deflectors for your knees." }
    ]
  },
  tank: {
    label: "Fuel tank", options: [
      { id: "stock", name: "Stock tank", cost: 0, tier: 0, stats: {}, note: "What the factory thought was enough. On the Aurora E, every tank here is a battery module instead." },
      { id: "ext", name: "Extended filler & baffles", cost: 220, tier: 0, stats: { fuel: 4 }, note: "Taller neck and a baffle kit: fill it right to the top and none of it sloshes out of reach." },
      { id: "long", name: "Long-range tank", cost: 540, tier: 1, stats: { fuel: 9, power: -0.01 }, note: "A bigger roto-moulded tank under the hood. Village to village without looking at the gauge." },
      { id: "cell", name: "Under-seat aux fuel cell", cost: 1050, tier: 2, stats: { fuel: 15, power: -0.02, drag: 0.01 }, note: "A second cell under the seat, plumbed to a crossover valve. Sits the sled a touch lower." },
      { id: "expd", name: "Expedition tank system", cost: 2100, tier: 4, stats: { fuel: 24, power: -0.04, drag: 0.03 }, note: "Main tank, seat cell and a tunnel bladder on one pump. Out to Slettnes and back on a fill, heavy as sin." }
    ]
  },
  tankL: {
    label: "Left jerry can", options: [
      { id: "none", name: "No left can", cost: 0, tier: 0, stats: {} },
      { id: "fitted", name: "Left jerry can", cost: 240, tier: 1, stats: { fuel: 7 }, note: "+7 L jerry can strapped to the left running board." },
      { id: "big", name: "Left 12 L fuel pack", cost: 420, tier: 2, look: "fitted", stats: { fuel: 12 }, note: "Moulded 12 L pack on the left running board. Heavier, but that's a lot of fell." }
    ]
  },
  tankR: {
    label: "Right jerry can", options: [
      { id: "none", name: "No right can", cost: 0, tier: 0, stats: {} },
      { id: "fitted", name: "Right jerry can", cost: 240, tier: 1, stats: { fuel: 7 }, note: "+7 L jerry can strapped to the right running board." },
      { id: "big", name: "Right 12 L fuel pack", cost: 420, tier: 2, look: "fitted", stats: { fuel: 12 }, note: "Moulded 12 L pack on the right running board. Heavier, but that's a lot of fell." }
    ]
  },
  rack: {
    label: "Rack, deck & load space", must: true, options: [
      { id: "stock", name: "Bare rack", cost: 0, tier: 0, stats: {}, note: "One parcel, strapped down." },
      { id: "box", name: "Insulated cargo box", cost: 260, tier: 1, stats: { care: 1 }, note: "One parcel, and it survives what you do to it." },
      { id: "stretch", name: "Stretch tunnel & long track", cost: 640, tier: 2, stats: { slots: 1, drag: 0.03, grip: 0.3 }, note: "Tunnel extension over a longer track: two parcels a run." },
      { id: "freight", name: "Freight deck & 174\" track", cost: 1500, tier: 3, stats: { slots: 2, drag: 0.06, grip: 0.5, care: 1, power: -0.04 }, note: "Three parcels. Handles like a loaded trailer, floats like a barge." }
    ]
  },
  lights: {
    label: "Lighting", options: [
      { id: "stock", name: "Stock headlight", cost: 0, tier: 0, stats: {} },
      { id: "pods", name: "Twin spot pods", cost: 80, tier: 0, look: "bar", stats: { light: 1.4 }, note: "Cheap and cheerful. Reaches past the headlight." },
      { id: "bar", name: "LED light bar", cost: 150, tier: 1, stats: { light: 1.9 }, note: "Night rides stop being guesswork." },
      { id: "hid", name: "Light bar & ditch floods", cost: 420, tier: 3, look: "bar", stats: { light: 2.5 }, note: "Turns the polar night into a car park." }
    ]
  },
  guard: {
    label: "Load protection", options: [
      { id: "none", name: "Bungee cords", cost: 0, tier: 0, stats: {}, note: "They mostly hold." },
      { id: "straps", name: "Ratchet straps & foam blocks", cost: 180, tier: 0, stats: { armor: 0.25 }, note: "Loads shift less, and hit softer when they do." },
      { id: "cage", name: "Load bars, foam & rock-guard bumpers", cost: 640, tier: 2, stats: { armor: 0.5 }, note: "Cargo rides in a padded cage, and the trailer shrugs off rock and birch." }
    ]
  },
  cool: {
    label: "Cooling", options: [
      { id: "none", name: "Stock heat exchangers", cost: 0, tier: 0, stats: {}, note: "Cools fine in loose snow. On hardpack, ice and your own packed trail it runs hot." },
      { id: "scratch", name: "Ice scratchers", cost: 90, tier: 0, stats: { cool: 0.8 }, note: "Spring-steel picks on the rails dig snow off hard surfaces and throw it at the heat exchangers." },
      { id: "pro", name: "Retractable scratchers & tunnel cooler", cost: 420, tier: 2, stats: { cool: 1.15, drag: 0.01 }, note: "Bigger scratchers that flip down on the hardpack, and an extra cooler in the tunnel. Lake ice and the scoured fell all day." }
    ]
  },
  survival: {
    label: "Survival kit", options: [
      { id: "none", name: "A chocolate bar", cost: 0, tier: 0, stats: {}, note: "Morale, not warmth." },
      { id: "thermos", name: "Thermos & bivvy bag", cost: 150, tier: 0, stats: { camp: 2, campCap: 55 }, note: "Stop and pour a cup: you warm up slowly wherever you are, up to about half." },
      { id: "stove", name: "Pack stove & reindeer-hide sit pad", cost: 420, tier: 1, stats: { camp: 4.5, campCap: 80 }, note: "Brew up out on the fell. Stop anywhere to thaw out, up to 80%." }
    ]
  },
  recovery: {
    label: "Recovery kit", options: [
      { id: "none", name: "Nothing", cost: 0, tier: 0, stats: {}, note: "Hope." },
      { id: "kit", name: "Shovel, strap & snowshoes", cost: 120, tier: 0, stats: { rescue: 0.3 }, note: "You've half dug yourself out by the time the crew shows up." },
      { id: "sat", name: "Satellite messenger", cost: 480, tier: 2, stats: { rescue: 0.6 }, note: "SOS with your exact position. F calls a rescue sled, and they come straight to you, faster and cheaper." }
    ]
  },
  winch: {
    label: "Winch", options: [
      { id: "none", name: "No winch", cost: 0, tier: 0, stats: {}, note: "Shovel and swearing." },
      { id: "hand", name: "Hand winch & 12 m of rope", cost: 260, tier: 0, stats: { winch: 1 }, note: "A come-along on the bumper. Wade out to a tree, hook on, crank. Slow and short, but it gets you out of a bog." },
      { id: "elec", name: "Electric winch, 26 m cable", cost: 950, tier: 1, stats: { winch: 2, burn: 0.02 }, note: "Fairlead and a drum on the front. Pulls a stuck sled or a stuck rider. Opens rescue jobs." },
      { id: "heavy", name: "Heavy-duty winch, 42 m + snatch block", cost: 2600, tier: 2, stats: { winch: 3, burn: 0.04 }, needRescues: 6, note: "Double the line for twice the pull. Reaches into crevasses. Needs a proven recovery record: 6 rescues." }
    ]
  },
  // the receiver on the tail that a rig hooks to (winter update O6): you need one to tow anything at all
  recv: {
    label: "Hitch receiver", options: [
      { id: "none", name: "No hitch receiver", cost: 0, tier: 0, stats: {}, note: "A bare tunnel. Nothing to hook a rig to." },
      { id: "ball", name: "Bolt-on hitch receiver", cost: 150, tier: 0, stats: {}, note: "A pintle and a pin on the rear bumper. Tows the freight trailer and the groomer drag." },
      { id: "heavy", name: "Heavy-duty hitch & safety chains", cost: 380, tier: 1, stats: {}, note: "A frame-mounted receiver with chains. Takes anything: the heavy flatbed and the wing tiller too." }
    ]
  },
  hitch: {
    label: "Hitch — tow-behind", options: [
      { id: "none", name: "Empty hitch", cost: 0, tier: 0, stats: {}, note: "Nothing dragging behind you." },
      { id: "groomer", name: "Tow-behind groomer drag", cost: 700, tier: 1, stats: { burn: 0.1, groom: 1 }, note: "Steel pan and a corduroy comb. Leaves a trail two metres wide, flat and set hard, that the snow takes three times as long to bury. Takes grooming contracts." },
      { id: "tiller", name: "Wing tiller groomer", cost: 1850, tier: 2, stats: { burn: 0.16, groom: 1 }, note: "A heavy tractor-style tiller: spinning drum, finisher mat and hydraulic wings. Press G (pad LB) and the wings slide out to lay a trail almost six metres wide. Wide lines pay a bonus on grooming contracts. Heavy to drag, and the wings catch trees." },
      { id: "trailer", name: "Freight sled trailer", cost: 900, tier: 1, stats: { burn: 0.06, bays: 1 }, note: "Poly tub on steel runners with ratchet straps. One big load: stoves, freezers, generators, solar kits. Tips if you corner it hard." },
      { id: "flatbed", name: "Heavy flatbed trailer", cost: 2400, tier: 2, stats: { burn: 0.1, bays: 2 }, note: "Twin-ski steel flatbed with stake sides. Two big loads, or one expedition load for Slettnes. Sits lower, harder to roll." },
      { id: "akja", name: "Rescue toboggan (akja)", cost: 650, tier: 0, stats: { burn: 0.02 }, needLic: "rescue", note: "A red fibreglass akja on rigid poles, with a casualty bag and straps. Carries a cold casualty lying down, out of the wind. Issued free with the Rescue licence. Rolls if you corner it hard." }
    ]
  }
};
const PART_ORDER = ["track", "skis", "clutch", "boost", "can", "cool", "susp", "bars", "grips", "shield", "tank", "tankL", "tankR", "rack", "guard", "lights", "survival", "recovery", "winch", "recv", "hitch"];

// Rider kit. `warm` is insulation — the high country and storms ask for more of it.
const GEAR = {
  head: {
    label: "Head", options: [
      { id: "beanie", name: "Wool beanie & goggles", cost: 0, warm: 1, note: "Fine for a mild afternoon down low." },
      { id: "mask", name: "Balaclava & goggles", cost: 90, warm: 2.5, note: "Nothing exposed." },
      { id: "helmet", name: "Full-face helmet", cost: 220, warm: 3.5, note: "Warm, and it keeps branches out of your teeth." },
      { id: "heated", name: "Heated-shield helmet", cost: 520, warm: 5, note: "Battery visor. No fog, no ice." }
    ]
  },
  jacket: {
    label: "Jacket", options: [
      { id: "shell", name: "Work shell", cost: 0, warm: 1.5 },
      { id: "insul", name: "Insulated trail jacket", cost: 180, warm: 3 },
      { id: "mono", name: "Expedition monosuit", cost: 460, warm: 4.5, note: "One piece, no drafts at the waist." }
    ]
  },
  pants: {
    label: "Snow pants", options: [
      { id: "bib", name: "Work bibs", cost: 0, warm: 1 },
      { id: "insul", name: "Insulated bibs", cost: 140, warm: 2.5 },
      { id: "shell", name: "Mountain shell bibs", cost: 320, warm: 3.5, note: "Vents for climbing, armour on the knees." }
    ]
  },
  boots: {
    label: "Boots", options: [
      { id: "pac", name: "Rubber pac boots", cost: 0, warm: 1 },
      { id: "tech", name: "Technical snow boots", cost: 130, warm: 2.2 },
      { id: "arctic", name: "Arctic-rated boots", cost: 290, warm: 3.2, note: "Rated well below anything you'll ride in." }
    ]
  },
  gloves: {
    label: "Gloves", options: [
      { id: "leather", name: "Leather choppers", cost: 0, warm: 1 },
      { id: "gaunt", name: "Gauntlet mitts", cost: 110, warm: 2.4 },
      { id: "heated", name: "Heated gloves", cost: 280, warm: 3.6 }
    ]
  }
};
const GEAR_ORDER = ["head", "jacket", "pants", "boots", "gloves"];

const OWN0 = () => ({
  sled: "frontier",
  sleds: ["frontier"],
  parts: { track: "stock", skis: "stock", clutch: "stock", boost: "none", can: "stock", susp: "stock", bars: "stock", shield: "low", tank: "stock", tankL: "none", tankR: "none", rack: "stock", lights: "stock", recv: "none", hitch: "none", grips: "stock", guard: "none", survival: "none", recovery: "none", winch: "none", cool: "none" },
  partsOwned: {},
  gear: { head: "beanie", jacket: "shell", pants: "bib", boots: "pac", gloves: "leather" },
  gearOwned: {},
  engines: {},          // sled id -> swapped-in engine (missing = the one it came with)
  shelf: [],            // engines you own that aren't in a sled
  pickups: [],          // (old saves) engines paid for in the garage classifieds; now Bytteboden's GS.mkt.held
  cond: {},             // "sled:id" / "hitch:id" / "recv:id" -> condition 0..1 (missing = 1, new)
  wear: {}              // same keys -> { s: seed, a: amount } for the used look (WEAR); it stays when the garage restores condition
});
const sledDef = () => SLEDS.find(s => s.id === GS.own.sled) || SLEDS[0];

/* ---------------- engines: what's for sale up and down the coast ---------------- */
// Engines get swapped, not upgraded. Since O6 they're bought used on Bytteboden (the marketplace app),
// hauled back on a trailer, and the garage fits them for labour. `power` is the same scale as a sled's
// own; a used one loses a little to its condition (condMul).
const ENGINES = [
  { id: "fan340", name: "340 fan-cooled single", power: 1, burn: 1.05, price: 250 },
  { id: "fan440", name: "440 fan-cooled twin", power: 1.2, burn: 1.05, price: 380 },
  { id: "lc500", name: "500 liquid-cooled twin", power: 1.41, burn: 1.0, price: 720 },
  { id: "lc580", name: "580 liquid twin, triple pipes", power: 1.58, burn: 1.12, price: 1050 },
  { id: "fan550", name: "550 fan twin, touring tune", power: 1.61, burn: 0.9, price: 1150 },
  { id: "lc600", name: "600 liquid twin", power: 1.68, burn: 1.0, price: 1400 },
  { id: "ho600", name: "600 H.O. semi-direct injection", power: 1.78, burn: 0.84, price: 2100 },
  { id: "tri700", name: "700 triple", power: 1.85, burn: 1.2, price: 1900 },
  { id: "fs1049", name: "1049 four-stroke triple", power: 1.95, burn: 0.78, price: 3000 },
  { id: "efi800", name: "800 twin, fuel injected", power: 2.02, burn: 1.04, price: 3300 },
  { id: "di850", name: "850 direct-injection twin", power: 2.19, burn: 0.98, price: 4400 },
  { id: "race900", name: "900 race twin, ported", power: 2.33, burn: 1.3, price: 5000 },
  { id: "t998", name: "998 four-stroke turbo triple", power: 2.41, burn: 0.95, price: 6200, turbo: true },
  { id: "t850", name: "850 turbo twin", power: 2.5, burn: 1.18, price: 6900, turbo: true }
];
const STOCK_ENGINE = { frontier: "fan340", woodsman: "fan440", ranger: "lc500", sprint: "lc580", summit: "lc600", trekker: "fan550", apex: "efi800", matriarch: "t850", aurora: null };
const engDef = id => ENGINES.find(e => e.id === id);
const isElectric = sd => STOCK_ENGINE[sd.id] === null;
// what is actually bolted into a sled right now
function engineOf(sd) {
  const inst = GS.own && GS.own.engines && GS.own.engines[sd.id], e = inst && engDef(inst.eid);
  if (e) return { inst, def: e, name: e.name, pwr: inst.pwr, burn: e.burn, turbo: !!e.turbo, stock: false };
  const s0 = engDef(STOCK_ENGINE[sd.id]);
  return { inst: null, def: s0, name: s0 ? s0.name : "Battery pack", pwr: sd.power * condMul(condOf("sled:" + sd.id)), burn: 1, turbo: !!(s0 && s0.turbo), stock: true, electric: !s0 };
}
// can this forced-induction option run on that engine?
function boostWhy(sd, id) {
  const o = partDef("boost", id), eng = engineOf(sd);
  if (id === "none") return "";
  if (eng.electric) return "Nothing to boost on a battery sled.";
  if (o.na && eng.turbo) return `The ${eng.name} already has a factory turbo.`;
  if (o.fac && !eng.turbo) return "Needs an engine with a factory turbo.";
  return "";
}
const SELLERS = ["Arne", "Sigrid", "Nils-Ole", "Berit", "Mathis", "Kari", "Johan Henrik", "Ellen Marie", "Trond", "Solveig", "Isak", "Randi", "Per Anders", "Marit"];
const WHY = [
  "Pulled it out of a sled that went through the lake ice. Dried out, runs sweet.",
  "Rebuilt last spring, bored and honed. Never been past half throttle, he swears.",
  "Came off a sled that got rolled on Gartefjellet. The motor was the only thing that wasn't bent.",
  "Spare from the herders' workshop. Too much motor for the old sleds they run.",
  "Estate sale. It's been in the boathouse under a tarp for years.",
  "Selling up and buying a boat.",
  "Had it shipped up from Alta, then the sled it was for broke first.",
  "Her son bought it for racing. She says it goes.",
  "Ran the post route on it for two winters. Oil changed every month.",
  "Traded for a season of stockfish. Doesn't need it."
];
function checkBoost() {
  const id = GS.own.parts.boost || "none", why = boostWhy(sledDef(), id);
  if (!why) return;
  GS.own.parts.boost = "none";
  toast(`${partDef("boost", id).name} is off for now. ${why}`, "warn");
}
// the engine coming out goes on the shelf; the one it came with just waits in the shop
function fitEngine(inst, sd) {
  const old = GS.own.engines[sd.id]; if (old) GS.own.shelf.push(old);
  if (inst) GS.own.engines[sd.id] = inst; else delete GS.own.engines[sd.id];
  checkBoost(); restat();
}
// the shop's labour for an engine swap (O6): engines come from Bytteboden now, the garage only fits them
const fitFee = inst => round5(60 + (engDef(inst.eid) ? engDef(inst.eid).price : 500) * 0.05);
function shelfSwap(i) {
  const sd = sledDef(); if (isElectric(sd)) { toast("No engine goes in a battery sled.", "warn"); return; }
  const inst = GS.own.shelf[i]; if (!inst) return;
  const fee = fitFee(inst); if (GS.cash < fee) { toast(`Fitting it is ${fmtCash(fee)} labour. You have ${fmtCash(GS.cash)}.`, "warn"); return; }
  GS.own.shelf.splice(i, 1); GS.cash -= fee;
  fitEngine(inst, sd); toast(`The shop swaps the ${engDef(inst.eid).name} into the ${sd.name}: ${Math.round(inst.pwr * 100)}% power, ${fmtCash(fee)} labour.`, "good"); renderGarage(); save();
}
function refitStock() {
  const sd = sledDef(), fee = fitFee({ eid: STOCK_ENGINE[sd.id] }); if (GS.cash < fee) { toast(`Refitting it is ${fmtCash(fee)} labour. You have ${fmtCash(GS.cash)}.`, "warn"); return; }
  GS.cash -= fee; fitEngine(null, sd);
  toast(`Put the ${sd.name}'s own engine back in: ${fmtCash(fee)} labour.`); renderGarage(); save();
}
const shelfValue = inst => round5(engDef(inst.eid).price * 0.45);
function shelfSell(i) {
  const inst = GS.own.shelf.splice(i, 1)[0]; if (!inst) return;
  const v = shelfValue(inst); GS.cash += v;
  toast(`Sold the ${engDef(inst.eid).name} to the shop for $${v}.`, "good"); renderGarage(); save();
}
const burnTxt = b => b < 0.97 ? `${Math.round((1 - b) * 100)}% thriftier` : b > 1.03 ? `${Math.round((b - 1) * 100)}% thirstier` : "average thirst";
const sledTier = () => SLEDS.indexOf(sledDef());
buildMachines();
const partDef = (cat, id) => PARTS[cat].options.find(o => o.id === id) || PARTS[cat].options[0];
const gearDef = (slot, id) => GEAR[slot].options.find(o => o.id === id) || GEAR[slot].options[0];
const ownKey = (cat, id) => cat + ":" + id;

// everything the physics and the cold ask about, in one place
function stats() {
  const sd = sledDef();
  const eng = engineOf(sd);
  const st = { boost: 0, power: eng.pwr, fuel: sd.fuel, drag: sd.drag, grip: sd.grip, burn: eng.burn, cold: 0, soak: 0, care: 0, light: 1, slots: 1, bays: 0, groom: 0, armor: 0, rescue: 0, camp: 0, campCap: 0, winch: 0, cool: 0 };
  for (const cat of PART_ORDER) {
    if (cat === "boost" && boostWhy(sd, GS.own.parts.boost || "none")) continue;
    const o = partDef(cat, GS.own.parts[cat]).stats || {};
    st.boost += o.boost || 0;
    st.power += o.power || 0; st.fuel += o.fuel || 0; st.drag += o.drag || 0; st.grip += o.grip || 0;
    st.burn += o.burn || 0; st.cold += o.cold || 0; st.soak += o.soak || 0; st.care += o.care || 0; st.slots += o.slots || 0; st.bays += o.bays || 0; st.groom += o.groom || 0;
    st.armor += o.armor || 0; st.rescue += o.rescue || 0; st.camp = Math.max(st.camp, o.camp || 0); st.campCap = Math.max(st.campCap, o.campCap || 0); st.winch = Math.max(st.winch, o.winch || 0); st.cool = Math.max(st.cool, o.cool || 0);
    st.light = Math.max(st.light, o.light || 1);
  }
  let warm = 0;
  for (const slot of GEAR_ORDER) warm += gearDef(slot, GS.own.gear[slot]).warm;
  st.warm = warm + st.cold;                       // insulation, plus what the sled blocks
  st.coldMul = clamp(1.55 - st.warm * 0.11, 0.3, 1.6);
  st.drag = Math.max(0.35, st.drag);
  st.power += eng.pwr * st.boost;
  st.burn = Math.max(0.5, st.burn); st.armor = Math.min(0.8, st.armor); st.rescue = Math.min(0.8, st.rescue);
  return st;
}
let ST = null;
function restat() { ST = stats(); if (GOD.turbo) ST.power *= 2.2; GS.cap = ST.fuel; GS.fuel = Math.min(GS.fuel, GS.cap); applyLoadout(); }

/* ---------------- the garage ---------------- */
let garageTab = "sleds";
function canBuySled(s) { return GS.delivered >= s.need; }
function buySled(id) {
  const s = SLEDS.find(x => x.id === id); if (!s) return;
  if (GS.own.sleds.includes(id)) { GS.own.sled = id; checkBoost(); restat(); toast(`Rolled the ${s.name} out of the bay.`); renderGarage(); save(); return; }
  if (!canBuySled(s)) { toast(`${s.name} is for proven couriers — ${s.need} deliveries.`, "warn"); return; }
  if (GS.cash < s.cost) { toast(`${s.name} is $${s.cost}. You have $${GS.cash}.`, "warn"); return; }
  GS.cash -= s.cost; GS.own.sleds.push(id); GS.own.sled = id; checkBoost(); restat();
  applySettings();
  toast(`Bought the ${s.name}. Your parts move over with it.`, "good"); renderGarage(); save();
}
function fitPart(cat, id) {
  const o = partDef(cat, id), tierOK = sledTier() >= o.tier;
  const bw = cat === "boost" ? boostWhy(sledDef(), id) : "";
  if (bw) { toast(bw, "warn"); return; }
  if (cat === "hitch" && id !== "none" && !recvOk(id)) { toast(`The ${o.name.toLowerCase()} needs ${recvNeed(id)} first (Hitch receiver, above).`, "warn"); return; }
  if (cat === "recv" && !recvOk(GS.own.parts.hitch, { parts: Object.assign({}, GS.own.parts, { recv: id }) })) { toast(`The ${partDef("hitch", GS.own.parts.hitch).name.toLowerCase()} needs ${recvNeed(GS.own.parts.hitch)}. Unhitch it first.`, "warn"); return; }
  if (GS.own.partsOwned[ownKey(cat, id)] || o.cost === 0) { GS.own.parts[cat] = id; restat(); renderGarage(); save(); return; }
  if (!tierOK) { toast(`${o.name} doesn't fit this generation yet.`, "warn"); return; }
  if (o.needLic && !licensed(o.needLic)) { toast(`${o.name}: Nordkinn Redning only sells these to licensed rescue crews.`, "warn"); return; }
  if (o.needRescues && (GS.rescues || 0) < o.needRescues) { toast(`${o.name}: the dealer wants to see ${o.needRescues} rescues first. You have ${GS.rescues || 0}.`, "warn"); return; }
  if (GS.cash < o.cost) { toast(`${o.name} is $${o.cost}. You have $${GS.cash}.`, "warn"); return; }
  GS.cash -= o.cost; GS.own.partsOwned[ownKey(cat, id)] = true; GS.own.parts[cat] = id; restat();
  toast(`Fitted: ${o.name}.`, "good"); renderGarage(); save();
}
function wearGear(slot, id) {
  const o = gearDef(slot, id);
  if (GS.own.gearOwned[ownKey(slot, id)] || o.cost === 0) { GS.own.gear[slot] = id; restat(); renderGarage(); save(); return; }
  if (GS.cash < o.cost) { toast(`${o.name} is $${o.cost}. You have $${GS.cash}.`, "warn"); return; }
  GS.cash -= o.cost; GS.own.gearOwned[ownKey(slot, id)] = true; GS.own.gear[slot] = id; restat();
  toast(`Wearing: ${o.name}.`, "good"); renderGarage(); save();
}
const statLine = o => {
  const s = o.stats || {}, bits = [];
  if (s.power) bits.push((s.power > 0 ? "+" : "") + Math.round(s.power * 100) + "% power");
  if (s.boost) bits.push("+" + Math.round(s.boost * 100) + "% engine power");
  if (s.fuel) bits.push("+" + s.fuel + " L");
  if (s.drag) bits.push((s.drag < 0 ? "−" : "+") + Math.round(Math.abs(s.drag) * 100) + "% powder drag");
  if (s.grip) bits.push((s.grip > 0 ? "+" : "−") + "grip");
  if (s.burn) bits.push((s.burn > 0 ? "+" : "−") + Math.round(Math.abs(s.burn) * 100) + "% burn");
  if (s.cold) bits.push((s.cold > 0 ? "+" : "−") + Math.abs(s.cold) + " warmth");
  if (s.soak) bits.push("softer landings");
  if (s.care) bits.push("protects cargo");
  if (s.slots) bits.push("+" + s.slots + " parcel" + (s.slots > 1 ? "s" : ""));
  if (s.bays) bits.push(s.bays + " big load" + (s.bays > 1 ? "s" : ""));
  if (s.groom) bits.push("grooms trail");
  if (s.light) bits.push("brighter");
  if (s.armor) bits.push("−" + Math.round(s.armor * 100) + "% cargo damage");
  if (s.camp) bits.push("warms you when stopped");
  if (s.cool) bits.push(s.cool > 1 ? "runs cool on ice and hardpack" : "cooler on hardpack");
  if (s.rescue) bits.push("−" + Math.round(s.rescue * 100) + "% rescue fees");
  if (s.winch) bits.push(["", "12 m line", "26 m line", "42 m line, double-line"][s.winch] + ", " + [0, 7, 13, 22][s.winch] + " kN pull".replace("kN", "kN"));
  if (o.warm) bits.push(o.warm + " warmth");
  return bits.join(" · ");
};
function renderGarage() {
  const body = $("garageBody"); body.innerHTML = "";
  PV.sled = PV.cat = PV.slot = null;
  $("garageCash").textContent = "$" + GS.cash;
  [...$("garageTabs").children].forEach(b => b.classList.toggle("on", b.dataset.t === garageTab));
  const row = (title, sub, price, state, onClick, tag) => {
    const b = document.createElement("button"); b.className = "row" + (state === "on" ? " fitted" : state === "locked" ? " owned" : "");
    b.innerHTML = `<span class="main"><b>${title}</b><em>${sub || ""}</em></span><span class="pay">${price}</span>`;
    if (tag) b.querySelector("b").insertAdjacentHTML("afterend", ` <span class="tag">${tag}</span>`);
    if (state !== "locked") b.addEventListener("click", onClick);
    body.appendChild(b); return b;
  };
  const tryOn = (b, pv) => {
    const on = () => { PV.sled = pv.sled || null; PV.cat = pv.cat || null; PV.slot = pv.slot || null; PV.id = pv.id || null; applyLoadout(); };
    const off = () => { PV.sled = PV.cat = PV.slot = null; applyLoadout(); };
    b.addEventListener("mouseenter", on); b.addEventListener("focus", on);
    b.addEventListener("mouseleave", off); b.addEventListener("blur", off);
  };
  if (garageTab === "sleds") {
    SLEDS.forEach(s => {
      const owned = GS.own.sleds.includes(s.id), on = GS.own.sled === s.id, locked = !owned && !canBuySled(s);
      const spec = `${s.year} · ${Math.round(engineOf(s).pwr * 100)}% power${engineOf(s).stock ? "" : " (swapped)"} · ${s.fuel} L · ${s.drag < 1 ? "floats" : "ploughs"} in powder`;
      tryOn(row(s.name, `${spec}\n${s.blurb}\n${s.era}`, on ? "Riding" : owned ? "Owned" : locked ? `${s.need} deliveries` : "$" + s.cost,
        on ? "on" : locked ? "locked" : "", () => buySled(s.id), s.year), { sled: s.id });
    });
    const note = document.createElement("div"); note.className = "bfoot";
    note.innerHTML = "Every part you own moves to whatever you ride. Deliveries unlock the newer generations.";
    body.appendChild(note);
  } else if (garageTab === "engines") {
    renderEngines(body, row, tryOn);
  } else if (garageTab === "workshop") {
    renderWorkshop(body);
  } else if (garageTab === "parts") {
    PART_ORDER.filter(c => c !== "boost").forEach(cat => {
      const h = document.createElement("div"); h.className = "bsec"; h.textContent = PARTS[cat].label; body.appendChild(h);
      PARTS[cat].options.forEach(o => {
        const owned = GS.own.partsOwned[ownKey(cat, o.id)] || o.cost === 0, on = GS.own.parts[cat] === o.id, locked = !owned && sledTier() < o.tier;
        tryOn(row(o.name, [statLine(o), o.note].filter(Boolean).join(" · "),
          on ? "Fitted" : owned ? "Owned" : locked ? `Gen ${o.tier + 1}+` : o.needLic && !licensed(o.needLic) ? "Rescue licence" : o.needRescues && (GS.rescues || 0) < o.needRescues ? `${o.needRescues} recoveries` : "$" + o.cost,
          on ? "on" : locked ? "locked" : "", () => fitPart(cat, o.id)), { cat, id: o.id });
      });
    });
  } else {
    const warnEl = document.createElement("div"); warnEl.className = "bfoot";
    warnEl.innerHTML = `Insulation <b>${ST.warm.toFixed(1)}</b> — ${ST.warm < 6 ? "fine in the valley, thin up high" : ST.warm < 9 ? "good for the high country" : "storm-proof"}. Cold drains ${Math.round(ST.coldMul * 100)}% as fast as bare.`;
    body.appendChild(warnEl);
    GEAR_ORDER.forEach(slot => {
      const h = document.createElement("div"); h.className = "bsec"; h.textContent = GEAR[slot].label; body.appendChild(h);
      GEAR[slot].options.forEach(o => {
        const owned = GS.own.gearOwned[ownKey(slot, o.id)] || o.cost === 0, on = GS.own.gear[slot] === o.id;
        tryOn(row(o.name, [statLine(o), o.note].filter(Boolean).join(" · "), on ? "Worn" : owned ? "Owned" : "$" + o.cost, on ? "on" : "", () => wearGear(slot, o.id)), { slot, id: o.id });
      });
    });
  }
}
// a row with its own buttons (buy two ways, swap or sell)
function actRow(body, title, sub, acts, tag) {
  const d = document.createElement("div"); d.className = "row ask";
  d.innerHTML = `<span class="main"><b>${title}</b><em>${sub || ""}</em></span><span class="acts"></span>`;
  if (tag) d.querySelector("b").insertAdjacentHTML("afterend", ` <span class="tag">${tag}</span>`);
  for (const a of acts) {
    const b = document.createElement("button"); b.textContent = a.label; if (a.title) b.title = a.title;
    if (a.dis) b.disabled = true; else b.addEventListener("click", a.fn);
    d.querySelector(".acts").appendChild(b);
  }
  body.appendChild(d); return d;
}
function renderEngines(body, row, tryOn) {
  const sd = sledDef(), eng = engineOf(sd), sec = t => { const h = document.createElement("div"); h.className = "bsec"; h.textContent = t; body.appendChild(h); };
  const foot = html => { const n = document.createElement("div"); n.className = "bfoot"; n.innerHTML = html; body.appendChild(n); };
  const pct = v => Math.round(v * 100) + "%", cnd = c => c !== undefined && c < 0.995 ? ` · ${pct(c)} condition` : "";
  sec(`In the ${sd.name}`);
  if (eng.electric) {
    row(eng.name, "Electric drive. No engine swaps and nothing to boost.", "Fitted", "on", () => { });
  } else {
    row(eng.name, `${pct(eng.pwr)} power · ${burnTxt(eng.burn)}${eng.turbo ? " · factory turbo" : ""}${eng.inst ? cnd(eng.inst.cond) : cnd(condOf("sled:" + sd.id))}${ST.boost ? ` · ${pct(ST.power)} with everything bolted on` : ""}\n${eng.inst ? `${eng.inst.hrs} h on it · bought off ${eng.inst.seller} in ${eng.inst.from}` : "The motor it left the factory with."}`, "Fitted", "on", () => { });
    if (!eng.stock) { const fee = fitFee({ eid: STOCK_ENGINE[sd.id] }); actRow(body, `Stock ${engDef(STOCK_ENGINE[sd.id]).name}`, `${pct(sd.power * condMul(condOf("sled:" + sd.id)))} power · the ${sd.name}'s own motor, crated in the shop`, [{ label: `Refit $${fee}`, title: "Labour to swap it back in", fn: refitStock }]); }
  }
  // paid for on Bytteboden and still out at the seller's (or on the trailer)
  const held = GS.mkt ? GS.mkt.held.filter(h => h.cat === "engine") : [];
  if (held.length) {
    sec("Bought on Bytteboden");
    for (const h of held) { const site = SITES.find(s => s.id === h.site); row(h.name, `${h.insp ? pct(h.cond) : pct(h.adv) + "?"} condition · paid ${fmtCash(h.paid)} · ${h.state === "aboard" ? "on your trailer, bring it here" : `waiting at ${h.seller}'s in ${shortName(site)}, ${fmtMi(Math.hypot(site.x - garageSite.x, site.z - garageSite.z))} out. Bring a trailer.`}`, h.state === "aboard" ? "Aboard" : "Collect", "locked", null, "PAID"); }
  }
  if (GS.own.shelf.length) {
    sec("On the shelf");
    GS.own.shelf.forEach((inst, i) => {
      const d = engDef(inst.eid);
      actRow(body, d.name, `${pct(inst.pwr)} power${cnd(inst.cond)} · ${burnTxt(d.burn)}${d.turbo ? " · factory turbo" : ""} · ${inst.hrs} h`,
        [{ label: `Fit $${fitFee(inst)}`, title: "Labour to swap it in", fn: () => shelfSwap(i), dis: eng.electric }, { label: `Sell $${shelfValue(inst)}`, fn: () => shelfSell(i) }]);
    });
  }
  sec("Buying an engine");
  foot(eng.electric ? "Nobody up here sells battery packs. The shop sends to Tromsø for those." : "The shop doesn't sell engines any more. Private sellers list used ones on <b>Bytteboden</b> (the tablet). Pay, haul the engine back here on a trailer, and we'll fit it for labour. Worn ones can be restored in the Workshop tab.");
  sec(PARTS.boost.label);
  PARTS.boost.options.forEach(o => {
    const owned = GS.own.partsOwned[ownKey("boost", o.id)] || o.cost === 0, on = (GS.own.parts.boost || "none") === o.id;
    const why = boostWhy(sd, o.id), locked = (!owned && sledTier() < o.tier) || !!why;
    tryOn(row(o.name, [statLine(o), why || o.note].filter(Boolean).join(" · "),
      on ? "Fitted" : why ? "Won't fit" : owned ? "Owned" : sledTier() < o.tier ? `Gen ${o.tier + 1}+` : "$" + o.cost,
      on ? "on" : locked ? "locked" : "", () => fitPart("boost", o.id)), { cat: "boost", id: o.id });
  });
}
// the Workshop (O6): restore a used machine's condition for a fee. The scuffs and the faded paint stay; fishing gear can't be restored.
function restoreList() {
  const o = GS.own, out = [];
  for (const id of o.sleds) { const c = condOf("sled:" + id); if (c < 0.995) { const s = SLEDS.find(x => x.id === id); out.push({ name: s.name, c, fee: round5((1 - c) * Math.max(s.cost, 800) * 0.55), sub: "the chassis, the track and its own motor", fix: () => { o.cond["sled:" + id] = 1; } }); } }
  const insts = []; for (const k in o.engines) if (o.engines[k]) insts.push([o.engines[k], "in the " + (SLEDS.find(s => s.id === k) || {}).name]); for (const q of o.shelf) insts.push([q, "on the shelf"]);
  for (const [q, where] of insts) { if (q.cond === undefined || q.cond >= 0.995) continue; const d = engDef(q.eid); out.push({ name: d.name, c: q.cond, fee: round5((1 - q.cond) * d.price * 0.7), sub: `rebuilt top end · ${where}`, fix: () => { q.cond = 1; q.pwr = +(q.base || d.power).toFixed(3); } }); }
  for (const cat of ["hitch", "recv"]) for (const op of PARTS[cat].options) { const k = cat + ":" + op.id, c = condOf(k); if (op.cost && o.partsOwned[k] && c < 0.995) out.push({ name: op.name, c, fee: round5((1 - c) * op.cost * 0.6), sub: cat === "hitch" ? (op.id === "groomer" || op.id === "tiller" ? "new comb and a flat pan" : "straightened runners, new tongue bushes") : "new pin and bushes", fix: () => { o.cond[k] = 1; } }); }
  return out;
}
function renderWorkshop(body) {
  const foot = html => { const n = document.createElement("div"); n.className = "bfoot"; n.innerHTML = html; body.appendChild(n); };
  const h = document.createElement("div"); h.className = "bsec"; h.textContent = "Restore condition"; body.appendChild(h);
  const list = restoreList();
  if (!list.length) foot("Everything you own is in good order. Used gear from Bytteboden comes in at 65–90%: bring it here to put it right.");
  for (const r of list) actRow(body, r.name, `${Math.round(r.c * 100)}% condition → 100% · ${r.sub}`, [{ label: `Restore $${r.fee}`, fn: () => {
    if (GS.cash < r.fee) { toast(`That's ${fmtCash(r.fee)}. You have ${fmtCash(GS.cash)}.`, "warn"); return; }
    GS.cash -= r.fee; r.fix(); restat(); renderGarage(); save(); toast(`${r.name} restored to full condition. The scuffs stay: it's had a life.`, "good");
  } }]);
  foot("Restoring buys back the performance. It doesn't repaint anything: the wear marks on used machines are there for good. Ice-fishing tackle can't be restored.");
}
function openGarage() { TABLET.close(true); GS.garageOpen = true; $("garage").hidden = false; renderGarage(); }
function closeGarage() { GS.garageOpen = false; $("garage").hidden = true; PV.sled = PV.cat = PV.slot = null; applyLoadout(); }
function buildGarageTabs() {
  [["sleds", "Sleds"], ["engines", "Engines"], ["parts", "Parts"], ["gear", "Rider kit"], ["workshop", "Workshop"]].forEach(([t, n]) => {
    const b = document.createElement("button"); b.className = "sbtn st"; b.dataset.t = t; b.textContent = n;
    b.addEventListener("click", () => { garageTab = t; renderGarage(); });
    $("garageTabs").appendChild(b);
  });
  $("closeGarage").addEventListener("click", closeGarage);
}

/* ---------------- wear: a used look for anything (winter update O6, the Marketplace) ----------------
   WEAR.apply(root, amt 0..1, seed, opt) gives any model a second-hand look without a second model:
   - every lit material under `root` is swapped for a clone with a small shader patch (WEAR_GLSL): the paint fades
     and goes blotchy, chips through to primer or dark metal here and there, picks up grime, and metal (and greyish
     paint) grows rust spots; the finish goes rougher. All of it is object-space noise, so it sits still on a moving sled.
   - a few decal-style scuff marks (scratches, a scrape, chips, a rust streak) are raycast onto the outside of the model
   - one or two dents are pushed into the biggest panel (a cloned geometry; the original is kept).
   amt 0 (or WEAR.remove) restores everything. Subtrees with userData.noWear are left alone (a trailer's cargo).
   The clones follow their source's colour every frame, so a livery repaint still shows through the wear.
   amt is what wearAmt(condition) gives: 65% condition is about 0.44, 90% about 0.12. Keep it subtle: used, not junk. */
const WEAR_GLSL = {
  head: `
uniform float uWear; uniform float uRust; uniform vec3 uWSeed; uniform vec3 uChipCol;
varying vec3 vWP;
float wh3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float wn3(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wh3(i), wh3(i + vec3(1, 0, 0)), f.x), mix(wh3(i + vec3(0, 1, 0)), wh3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(wh3(i + vec3(0, 0, 1)), wh3(i + vec3(1, 0, 1)), f.x), mix(wh3(i + vec3(0, 1, 1)), wh3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`,
  color: `
  vec3 wp = vWP + uWSeed;
  float wFade = wn3(wp * 2.2), wGrime = wn3(wp * 37.0), wChipN = wn3(wp * 19.0) * 0.6 + wn3(wp * 47.0) * 0.4;
  float wL = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(wL) * 1.04 + 0.02, uWear * (0.16 + 0.36 * wFade));       // sun-faded, a little blotchy
  diffuseColor.rgb *= 1.0 - uWear * 0.16 * wGrime;                                                      // grime in the grain
  float wChip = smoothstep(0.85 - uWear * 0.1, 0.87 - uWear * 0.1, wChipN);
  diffuseColor.rgb = mix(diffuseColor.rgb, uChipCol * (0.85 + 0.3 * wGrime), wChip * 0.85);             // small paint chips
  float wRust = smoothstep(0.8 - uWear * 0.12, 0.88 - uWear * 0.12, wn3(wp * 23.0 + 3.3) * 0.7 + wn3(wp * 6.0) * 0.3) * uRust * min(1.0, uWear * 2.5);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.43, 0.22, 0.1) * (0.75 + 0.5 * wGrime), wRust * 0.7);   // a bit of rust`,
  rough: `
  roughnessFactor = clamp(roughnessFactor + uWear * 0.18 + wRust * 0.3 + wChip * 0.1, 0.0, 1.0);`,
  metal: `
  metalnessFactor *= 1.0 - wRust * 0.9;`
};
const WEAR = (() => {
  const patch = sh => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvWP = position;");
    let f = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + WEAR_GLSL.head).replace("#include <color_fragment>", "#include <color_fragment>\n" + WEAR_GLSL.color);
    if (f.includes("#include <roughnessmap_fragment>")) f = f.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n" + WEAR_GLSL.rough);
    if (f.includes("#include <metalnessmap_fragment>")) f = f.replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\n" + WEAR_GLSL.metal);
    sh.fragmentShader = f;
  };
  const lit = m => m && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial) && !m.transparent;
  function wornMat(src, amt, seed) {
    const m = src.clone(), hsl = {}; src.color.getHSL(hsl);
    // metal rusts; grey and black paint shows a little; bright paint chips to primer, dark parts to bare steel
    const rust = src.metalness > 0.3 ? 1 : hsl.s < 0.18 ? 0.55 : 0.25;
    const u = { uWear: { value: amt }, uRust: { value: rust }, uWSeed: { value: new THREE.Vector3(seed * 3.1 % 97, seed * 7.3 % 89, seed * 1.7 % 83) },
      uChipCol: { value: new THREE.Color(hsl.l > 0.35 ? 0x8a8e90 : 0x5e6468) } };
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, u); patch(sh); };
    m.customProgramCacheKey = () => "wear1";
    m.userData = { wearU: u };
    return m;
  }
  function syncW() { const w = this.material, s = this.userData.wear0; if (w && s && w !== s) { w.color.copy(s.color); if (w.emissive && s.emissive) w.emissive.copy(s.emissive); } }
  // the scuff atlas: scratches, a scrape, a chip cluster, a rust streak (2 x 2 on one canvas)
  let decalMats = null;
  function atlas() {
    if (decalMats) return decalMats;
    const cv = document.createElement("canvas"); cv.width = cv.height = 256; const g = cv.getContext("2d"), r = mulberry32(4242);
    g.lineCap = "round";
    for (let i = 0; i < 9; i++) { const a = -0.5 + r() * 0.35, x = 14 + r() * 80, y = 20 + r() * 90, L = 30 + r() * 60; g.strokeStyle = `rgba(${200 + r() * 40},${200 + r() * 40},${205 + r() * 40},${0.35 + r() * 0.35})`; g.lineWidth = 0.6 + r() * 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
    { const gr = g.createRadialGradient(192, 64, 4, 192, 64, 54); gr.addColorStop(0, "rgba(70,62,52,.55)"); gr.addColorStop(1, "rgba(70,62,52,0)"); g.fillStyle = gr; g.fillRect(128, 0, 128, 128);
      for (let i = 0; i < 22; i++) { g.strokeStyle = `rgba(40,36,30,${0.2 + r() * 0.3})`; g.lineWidth = 1 + r() * 2; const y = 30 + r() * 70; g.beginPath(); g.moveTo(150 + r() * 10, y); g.lineTo(230 - r() * 10, y + (r() - 0.5) * 8); g.stroke(); } }
    for (let i = 0; i < 14; i++) { const x = 20 + r() * 88, y = 150 + r() * 88, s = 2 + r() * 7; g.fillStyle = r() < 0.5 ? "rgba(132,136,138,.9)" : "rgba(52,56,60,.9)"; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283, q = s * (0.5 + r() * 0.7); g[k ? "lineTo" : "moveTo"](x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fill(); }
    for (let i = 0; i < 7; i++) { const x = 170 + r() * 44, gr = g.createLinearGradient(0, 140, 0, 250); gr.addColorStop(0, "rgba(120,58,22,.75)"); gr.addColorStop(1, "rgba(120,58,22,0)"); g.fillStyle = gr; g.fillRect(x, 140 + r() * 20, 2 + r() * 5, 60 + r() * 50); }
    { const gr = g.createRadialGradient(192, 150, 2, 192, 150, 26); gr.addColorStop(0, "rgba(110,52,20,.85)"); gr.addColorStop(1, "rgba(110,52,20,0)"); g.fillStyle = gr; g.fillRect(150, 128, 90, 60); }
    const base = new THREE.CanvasTexture(cv);
    decalMats = [[0, 0.5], [0.5, 0.5], [0, 0], [0.5, 0]].map(([u, v]) => {
      const t = base.clone(); t.needsUpdate = true; t.repeat.set(0.5, 0.5); t.offset.set(u, v);
      return new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    });
    return decalMats;
  }
  const plane = new THREE.PlaneGeometry(1, 1), rc = new THREE.Raycaster(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Vector3(), _s = new THREE.Vector3();
  const shown = (o, root) => { for (let q = o; q && q !== root; q = q.parent) if (!q.visible) return false; return true; };
  function meshesOf(root) {
    const out = [];
    (function walk(o) { if (o.userData.noWear || o.userData.wearDecal) return; if (o.isMesh && !o.isInstancedMesh && lit(o.material)) out.push(o); for (const c of o.children) walk(c); })(root);
    return out;
  }
  function decals(root, meshes, amt, rnd, opt) {
    const vis = meshes.filter(m => shown(m, root)); if (!vis.length) return;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3(); for (const m of vis) box.expandByObject(m);
    box.getCenter(_c); box.getSize(_s); const diag = _s.length(); if (!(diag > 0.05)) return;
    const n = Math.min(opt.maxDecals || 6, Math.round(2 + amt * 9)), mats = atlas(), sz = clamp(diag / 3, 0.35, 1.4);
    let made = 0;
    for (let t = 0; t < n * 8 && made < n; t++) {
      const a = rnd() * 6.283, y = -0.15 + rnd() * 0.75, h = Math.sqrt(1 - y * y), dir = _v.set(Math.cos(a) * h, y, Math.sin(a) * h);
      rc.set(_n.copy(_c).addScaledVector(dir, diag), dir.clone().negate()); rc.far = diag * 2;
      const hit = rc.intersectObjects(vis, false)[0]; if (!hit || !hit.face) continue;
      const nw = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (nw.dot(dir) < 0.35) continue;
      const k = (rnd() * (amt > 0.3 ? 4 : 3)) | 0;                       // rust streaks only on the tireder ones
      const d = new THREE.Mesh(plane, mats[k]); d.userData.wearDecal = true; d.castShadow = false; d.renderOrder = 2;
      d.position.copy(hit.point).addScaledVector(nw, 0.004); d.lookAt(_n.copy(hit.point).add(nw)); d.rotateZ(rnd() * 6.283);
      d.scale.setScalar((0.07 + rnd() * 0.1) * sz * (k === 1 ? 1.4 : 1)); d.updateMatrix();
      root.attach(d); root.userData.wearDecals.push(d); made++;
    }
  }
  function dent(root, meshes, amt, rnd) {
    let best = null, bs = 0;
    for (const m of meshes) { const g = m.geometry; if (!g || !g.attributes.position || g.attributes.position.count < 24) continue; if (!g.boundingSphere) g.computeBoundingSphere(); const s = g.boundingSphere.radius * m.getWorldScale(_s).x; if (s > bs) { bs = s; best = m; } }
    if (!best) return;
    const g0 = best.geometry, g = g0.clone(); if (!g.attributes.normal) g.computeVertexNormals();
    const P = g.attributes.position, N = g.attributes.normal, R = g0.boundingSphere.radius * 0.22;
    for (let k = 0; k < (amt > 0.3 ? 2 : 1); k++) {
      const i = (rnd() * P.count) | 0, cx = P.getX(i), cy = P.getY(i), cz = P.getZ(i), depth = R * (0.07 + 0.08 * Math.min(1, amt * 2));
      for (let j = 0; j < P.count; j++) {
        const d = Math.hypot(P.getX(j) - cx, P.getY(j) - cy, P.getZ(j) - cz); if (d >= R) continue;
        const f = (1 - d / R) ** 2 * depth;
        P.setXYZ(j, P.getX(j) - N.getX(j) * f, P.getY(j) - N.getY(j) * f, P.getZ(j) - N.getZ(j) * f);
      }
    }
    P.needsUpdate = true; g.computeVertexNormals();
    best.userData.geo0 = g0; best.geometry = g; root.userData.wearDent = best;
  }
  function remove(root) {
    if (!root || !root.userData.wearKey) return;
    root.traverse(o => { if (o.userData.wear0) { o.material = o.userData.wear0; delete o.userData.wear0; delete o.onBeforeRender; } });
    for (const d of root.userData.wearDecals || []) if (d.parent) d.parent.remove(d);
    const dm = root.userData.wearDent; if (dm && dm.userData.geo0) { dm.geometry.dispose(); dm.geometry = dm.userData.geo0; delete dm.userData.geo0; }
    for (const m of root.userData.wearMats || []) m.dispose();
    root.userData.wearKey = null; root.userData.wearDecals = []; root.userData.wearMats = []; root.userData.wearDent = null;
  }
  function apply(root, amt, seed = 1, opt = {}) {
    if (!root) return;
    amt = clamp(+amt || 0, 0, 1);
    const key = amt > 0.005 ? amt.toFixed(3) + ":" + seed : null;
    if ((root.userData.wearKey || null) === key) return;
    remove(root); if (!key) return;
    const rnd = mulberry32((seed * 2654435761) | 0), meshes = meshesOf(root), cache = new Map();
    root.userData.wearKey = key; root.userData.wearDecals = [];
    for (const m of meshes) {
      const src = m.material; let w = cache.get(src);
      if (!w) { w = wornMat(src, amt, 1 + rnd() * 50); cache.set(src, w); }
      m.userData.wear0 = src; m.material = w; m.onBeforeRender = syncW;
    }
    root.userData.wearMats = [...cache.values()];
    if (opt.decals !== false) decals(root, meshes, amt, rnd, opt);
    if (opt.dents !== false && amt > 0.12) dent(root, meshes, amt, rnd);
  }
  return { apply, remove };
})();
// condition 0..1 → how hard the wear look goes on, and → power (an engine at 65% keeps about 91%)
const wearAmt = c => clamp((1 - c) * 1.25, 0, 0.7);
const condMul = c => 1 - (1 - clamp(c, 0, 1)) * 0.25;
// what you own, even while a school sled is under you
const myOwn = () => SCHOOL.saved || GS.own;
const condOf = (key, own = GS.own) => { const v = own && own.cond && own.cond[key]; return typeof v === "number" ? v : 1; };
const pctC = c => Math.round(c * 100) + "%";
// keep the wear on whatever's shown: the machines (one per sled model) and the tow rigs
function wearSync() {
  if (!V.machines) return;
  const w = (GS.own && GS.own.wear) || {};
  for (const id in V.machines) { const q = w["sled:" + id]; WEAR.apply(V.machines[id], q ? q.a : 0, q ? q.s : 1); }
  for (const k in TOW.vis) { const q = w["hitch:" + k]; WEAR.apply(TOW.vis[k], q ? q.a : 0, q ? q.s : 1, { maxDecals: 5 }); }
}

/* ---------------- Bytteboden: the marketplace app (winter update O6, phase 5) ----------------
   A parody of a classifieds marketplace: private sellers in the villages, cabins and homes list used gear. Each listing
   has its own lifespan (2-5 game days) and new ones trickle in one at a time off the game clock (GS.mkt.next), so the
   list never turns over all at once. Categories: engines, whole sleds, hitch receivers, trailers, grooming machines and
   ice-fishing rods, reels and augers (off icefish.js's tables).
   - Used is cheaper than new and SLIGHTLY worn: a condition (65-90%) that costs a little performance (condMul for
     engines and sleds, a lower tip limit for trailers, a rougher pan for groomers, icefish's own eff() for tackle) and
     the WEAR look on the model.
   - Haggling: offer 70/80/90% or pay the asking price. Sellers have a personality (SELLER_P): a hidden floor, how far
     they'll come down and how much patience they've got. Lowball one and they stop answering.
   - Lemons: about 1 in 6 is worse than the ad says. Stop at the seller's to INSPECT before you pay, or find out when
     you collect it.
   - Collecting (MKT.collect, stopped at the seller's): engines go on a trailer as a big load back to the garage (which
     shelves them; fitting is labour); hitch receivers go on the rack to the garage; trailers and groomers hook straight
     on if you have a receiver that'll take them; sleds are ridden away (the seller runs your old one back to the
     garage); rods, reels and augers go in your pack.
   Saved as `mkt` ({ list, held, seq, next, last }). */
const MKT_CATS = [
  { id: "all", name: "All" },
  { id: "engine", name: "Engines", w: 3 },
  { id: "sled", name: "Sleds", w: 1.5 },
  { id: "recv", name: "Hitches", w: 0.8 },
  { id: "trailer", name: "Trailers", w: 1 },
  { id: "groomer", name: "Groomers", w: 0.8 },
  { id: "fish", name: "Ice fishing", w: 2 }
];
const SELLER_P = {
  stubborn: { ask: 1.08, floor: 0.95, pat: 1, tag: "FIRM", w: 0.24 },
  fair: { ask: 1.0, floor: 0.87, pat: 2, tag: "", w: 0.36 },
  haggler: { ask: 1.15, floor: 0.8, pat: 3, tag: "OBO", w: 0.2 },
  desperate: { ask: 0.93, floor: 0.72, pat: 3, tag: "MUST GO", w: 0.2 }
};
const MKT_NAMES = SELLERS.concat(["Aslak", "Inga", "Hallvard", "Rune", "Gunhild", "Oddvar", "Tove", "Ánde", "Liv Karin", "Jon Mikkel", "Hilde", "Steinar"]);
const MKT_WHY = {
  engine: WHY,
  sled: ["Bought a side-by-side. The wife says one machine is enough.", "Runs great, just never use it since the knee op.", "Been the post sled for three winters. Serviced every autumn.", "Moving to Tromsø. Can't take it on the bus.", "Dad's old sled. He'd want it ridden, not looked at.", "Upgraded. This one still starts first pull, mostly.", "Hauled firewood with it. Seat's been re-stitched."],
  recv: ["Off my old Skandic. Pin and clip included.", "Came off a sled I parted out. Threads are good.", "Spare. Bought two by mistake.", "Took it off when I sold the trailer."],
  trailer: ["Hauled fish crates on it all last winter. Straps included.", "Too big for what I need now.", "Runners re-welded last year. Tracks straight.", "Selling with the sled gone. No use for it.", "Moved the cabin stuff in. Job done."],
  groomer: ["Did the lag's trails with it for years. They bought a proper one.", "Grooms fine. Takes some muscle to drag.", "My uncle's. He's 86 now and says he's retired.", "Comb's missing two teeth. Still leaves corduroy."],
  fish: ["Upgraded. This did me fine for years.", "Selling my late father's ice gear. He'd want it used.", "Bought it, used it twice, it's not for me.", "Spare from the hytte. Clearing out.", "Fished Røyevatnet with it every Easter."]
};
const MKT_TELL = {
  engine: ["Compression's low on one cylinder.", "There's a knock under load you can feel through the boards.", "It's been run lean. The piston's scored.", "Blue smoke at idle, and it's been mixed with the wrong oil."],
  sled: ["The frame's cracked under the seat and welded badly.", "The motor sounds like a bag of spanners.", "Track lugs are half gone and the bogies are seized.", "It's been through the lake ice. Everything's corroded."],
  recv: ["The pin hole's wallowed out oval.", "The mounting plate's cracked behind the weld."],
  trailer: ["One runner's bent and it crabs sideways.", "The tongue's been welded back together.", "The hitch eye's worn thin."],
  groomer: ["The pan's warped and the comb's half gone.", "The frame's cracked and bodged with fence wire."],
  fish: ["It's been dropped. Everything about it is a bit off.", "The bearings are full of grit.", "The blades are chipped and dull."]
};
const MKT_SAY = {
  stubborn: { ok: p => `Fine. ${p}. Not a krone less.`, counter: p => `${p}. It's worth every øre.`, insult: () => "Not for that. Don't message me again.", last: p => `${p}. That's final.`, insp0: () => "Look all you like. It's as the ad says.", insp1: p => `...Alright. It's been sitting. ${p}, and that's the last I'll drop.` },
  fair: { ok: p => `Deal at ${p}. Come by whenever.`, counter: p => `Meet me at ${p}?`, insult: () => "That's a bit low, sorry. Good luck with your search.", last: p => `Can't go under ${p}, sorry.`, insp0: () => "Have a good look. Kettle's on if you want coffee.", insp1: p => `You're right, I didn't notice that. Call it ${p}?` },
  haggler: { ok: p => `Ha! You drive a hard bargain. ${p}, done.`, counter: p => `${p}, and I'll throw in a cup of coffee.`, insult: () => "You're joking. Come back when you're serious.", last: p => `${p}. My final, final offer.`, insp0: () => "See? Clean as a whistle.", insp1: p => `Ah. Well. Everything's negotiable. ${p}?` },
  desperate: { ok: p => `Yes! ${p} is fine, honestly. When can you come?`, counter: p => `Could you do ${p}? I need it gone this week.`, insult: () => "Please... I can't go that low. I'll find someone else.", last: p => `${p} is the very lowest. Please.`, insp0: () => "It runs, I promise. Please take it.", insp1: p => `I'm sorry. I needed the money. ${p}?` }
};
const MKT_GEAR = { rods: "rod", reels: "reel", augers: "auger" };
const mktFishDef = item => { const [t, id] = item.split(":"); const T = window.TLFish && window.TLFish.GEAR[t]; return T ? T.find(g => g.id === id) : null; };
const mktHasFish = item => { const [t, id] = item.split(":"); const f = GS.fish && GS.fish.own && GS.fish.own[MKT_GEAR[t]]; return !!(f && f[id]); };
// does the receiver you have take this rig? Light rigs (trailer, drag) on any receiver; the flatbed and wing tiller need the heavy one.
// The rescue toboggan (O5) needs none: its poles pin straight to the bumper.
const HEAVY_RIG = { flatbed: true, tiller: true };
function recvOk(rig, own = GS.own) { if (!HITCH[rig] || rig === "akja") return true; const r = own.parts.recv || "none"; return r === "heavy" || (r === "ball" && !HEAVY_RIG[rig]); }
const recvNeed = rig => HEAVY_RIG[rig] ? "the heavy-duty hitch" : "a hitch receiver";

// what a listing is: name, what it'd cost new, a stats line at a given condition
function mktInfo(l, c = l.adv) {
  const pct = v => Math.round(v * 100) + "%";
  if (l.cat === "engine") { const d = engDef(l.item); return { name: d.name, newP: round5(d.price * 1.3), stat: `${pct(d.power * condMul(c))} power · ${burnTxt(d.burn)}${d.turbo ? " · factory turbo" : ""}`, pwr: d.power * condMul(c), kind: "engine" }; }
  if (l.cat === "sled") { const s = SLEDS.find(x => x.id === l.item); return { name: s.name, newP: Math.max(s.cost, 400), stat: `${s.year} · ${pct(s.power * condMul(c))} power · ${s.fuel} L · ${s.drag < 1 ? "floats" : "ploughs"} in powder`, pwr: s.power * condMul(c), kind: "sled", sd: s }; }
  if (l.cat === "recv") { const o = partDef("recv", l.item); return { name: o.name, newP: o.cost, stat: o.id === "heavy" ? "takes the flatbed and the wing tiller too" : "takes the freight trailer and the groomer drag", kind: "recv" }; }
  if (l.cat === "trailer" || l.cat === "groomer") { const o = partDef("hitch", l.item); return { name: o.name, newP: o.cost, stat: l.cat === "trailer" ? `${o.stats.bays} big load${o.stats.bays > 1 ? "s" : ""} · tips ${c < 0.8 ? "a touch sooner" : "about like new"}` : `${l.item === "tiller" ? "5.8 m wings" : "2.4 m pan"} · ${c < 0.8 ? "leaves it a bit lumpy" : "leaves good corduroy"}`, kind: l.item }; }
  const g = mktFishDef(l.item) || { name: "?", price: 10 }, t = l.item.split(":")[0];
  return { name: t === "augers" && !/auger/i.test(g.name) ? g.name + " auger" : g.name, newP: g.price, stat: t === "augers" ? `${Math.round(g.dia / 2.5)}″ hole · ${c < 0.8 ? "drills a bit slower" : "drills near new"}${g.start === "pull" ? (c < 0.8 ? " · fussy to start" : " · starts fine") : ""}` : t === "reels" ? `${c < 0.8 ? "drag slips a little" : "smooth drag"}` : `${c < 0.8 ? "tip's a little tired" : "tip's lively"}`, kind: t };
}
// who's selling and where: anywhere people live, not the quay or the garage
const mktSites = () => SITES.filter(s => s.x !== undefined && (s.type === "cabin" || s.type === "home" || s.type === "relay"));
// the candidates in a category that you don't already own
function mktPool(cat) {
  const o = myOwn(), cur = engineOf(SLEDS.find(s => s.id === o.sled) || SLEDS[0]).pwr;
  if (cat === "engine") return ENGINES.map(e => ({ item: e.id, w: Math.exp(-(((e.power - cur - 0.25) / 0.55) ** 2)) + 0.12 }));
  if (cat === "sled") return SLEDS.filter(s => s.id !== "frontier" && !o.sleds.includes(s.id) && s.need <= GS.delivered + 14).map(s => ({ item: s.id, w: 1 }));
  if (cat === "recv") return PARTS.recv.options.filter(x => x.id !== "none" && !o.partsOwned["recv:" + x.id]).map(x => ({ item: x.id, w: 1 }));
  if (cat === "trailer") return ["trailer", "flatbed"].filter(id => !o.partsOwned["hitch:" + id]).map(id => ({ item: id, w: id === "trailer" ? 1.4 : 1 }));
  if (cat === "groomer") return ["groomer", "tiller"].filter(id => !o.partsOwned["hitch:" + id]).map(id => ({ item: id, w: id === "groomer" ? 1.4 : 1 }));
  if (cat === "fish") { if (!window.TLFish) return []; const out = []; for (const t of ["rods", "reels", "augers"]) for (const g of window.TLFish.GEAR[t]) if (g.tier > 1 && !mktHasFish(t + ":" + g.id)) out.push({ item: t + ":" + g.id, w: t === "augers" ? 1.2 : 1 }); return out; }
  return [];
}
const mktRound = v => v < 100 ? Math.max(5, Math.round(v)) : round5(v);
function mktMake(now, age = 0) {
  const cats = MKT_CATS.filter(c => c.w).map(c => ({ c, pool: mktPool(c.id) })).filter(x => x.pool.length).map(x => ({ w: x.c.w, c: x.c, pool: x.pool }));
  if (!cats.length) return null;
  const pc = wpick(cats), cat = pc.c.id;
  // don't list the same thing twice at once (engines can turn up twice, but rarely)
  const listed = new Set(GS.mkt.list.filter(q => q.cat === cat).map(q => q.item)), pool = pc.pool.map(p => listed.has(p.item) ? Object.assign({}, p, { w: cat === "engine" ? p.w * 0.25 : 0 }) : p).filter(p => p.w > 0);
  if (!pool.length) return null;
  const it = wpick(pool);
  const lemon = Math.random() < 0.16, adv = 0.65 + Math.random() * 0.25, real = lemon ? clamp(adv - 0.2 - Math.random() * 0.16, 0.42, 0.6) : adv;
  const pers = lemon && Math.random() < 0.5 ? pick(["desperate", "haggler"]) : wpick(Object.entries(SELLER_P).map(([k, v]) => ({ k, w: v.w }))).k;
  const S = SELLER_P[pers], l = { id: ++GS.mkt.seq, cat, item: it.item, pers, lemon, adv: +adv.toFixed(3), real: +real.toFixed(3) };
  const newP = mktInfo(l).newP, ask = mktRound(newP * (0.38 + 0.42 * adv) * (0.92 + Math.random() * 0.16) * S.ask);
  return Object.assign(l, {
    site: pick(mktSites()).id, seller: pick(MKT_NAMES), t0: now - age, life: 48 + Math.random() * 72,
    ask, ask0: ask, floor: Math.round(ask * S.floor), pat: S.pat, thread: [], deal: null, insp: false, mute: false,
    why: pick(MKT_WHY[cat]), tell: pick(MKT_TELL[cat]), hrs: cat === "engine" || cat === "sled" ? Math.round(lerp(60, 1400, 1 - adv) / 10) * 10 : 0, seed: (Math.random() * 1e6) | 0
  });
}
// a fresh board: about ten listings of all ages, so they won't all expire together
function mktReseed(now) {
  GS.mkt.list = GS.mkt.list.filter(l => l.deal && now < l.t0 + l.life);
  while (GS.mkt.list.length < 10) { const l = mktMake(now, Math.random() * 60); if (!l) break; if (now < l.t0 + l.life) GS.mkt.list.push(l); }
  GS.mkt.next = now + 1 + Math.random() * 4;
}
const MKT = { view: null, cat: "all", typing: {}, nagT: 0, tickT: 0, guide: null, pingT: -99 };
function mktInit(d) {
  GS.mkt = d && typeof d === "object" ? Object.assign({ list: [], held: [], seq: 0, next: 0, last: null }, d) : { list: [], held: [], seq: 0, next: 0, last: null };
  GS.mkt.list = (GS.mkt.list || []).filter(l => l && MKT_CATS.some(c => c.id === l.cat));
  for (const h of GS.mkt.held) h.state = "wait";                 // nothing's on the trailer after a reload: it waits at the seller's again
  MKT.view = null; MKT.guide = null;
}
// every frame from updGame, but it only looks every half second
function mktTick(dt) {
  if (!GS.mkt) mktInit(null);
  if ((MKT.tickT += dt) < 0.5) return; MKT.tickT = 0;
  const now = CAL.abs(), M = GS.mkt;
  if (M.last === null || now - M.last > 36 || now < M.last) mktReseed(now);       // a new game, an old save, or the summer skip
  M.last = now;
  const gone = M.list.filter(l => now > l.t0 + l.life);
  if (gone.length) {
    M.list = M.list.filter(l => !gone.includes(l));
    for (const l of gone) { if (MKT.guide === l.site && !M.list.some(q => q.site === l.site)) MKT.guide = null; if (MKT.view === l.id || l.deal) { toast(`Bytteboden: ${l.seller}'s ${mktInfo(l).name} sold to someone else.`, "warn"); if (MKT.view === l.id) MKT.view = null; } }
    TABLET.refresh("market");
  }
  if (now >= M.next) {
    const n = M.list.length;
    if (n < 13) { const l = mktMake(now); if (l) { M.list.push(l); mktPing(l); TABLET.refresh("market"); } }
    M.next = now + (1.5 + Math.random() * 6) * (n < 7 ? 0.5 : n > 11 ? 1.8 : 1);
  }
}
// a ping now and then for something worth a look: an engine that beats yours, or anything cheap
function mktPing(l) {
  if (!started || GS.hour - MKT.pingT < 5) return;
  const inf = mktInfo(l), cur = engineOf(sledDef()).pwr;
  if ((l.cat === "engine" && inf.pwr > cur + 0.08) || l.ask < inf.newP * 0.5) {
    MKT.pingT = GS.hour;
    TABLET.notify({ app: "market", title: `Bytteboden · ${inf.name}`, body: `${fmtCash(l.ask)} · ${l.seller} in ${shortName(mktSite(l))}${l.cat === "engine" ? ` · ${Math.round(inf.pwr * 100)}% power` : ""}`, ttl: 7 });
  }
}
const mktSite = l => SITES.find(s => s.id === l.site) || depot;
const mktLeft = l => l.t0 + l.life - CAL.abs();
const mktHere = l => GS.near && GS.near.id === l.site && Math.hypot(P.vx, P.vz) < 4 && !FOOT.on;
const mktPrice = l => l.deal || l.ask;
const mktVisible = l => mktPool(l.cat).some(p => p.item === l.item);       // hide what you've bought elsewhere since

/* ---- haggling ---- */
function mktSay(l, me, t) { l.thread.push({ me, t }); if (l.thread.length > 14) l.thread.shift(); }
function mktOffer(l, frac) {
  if (SCHOOL.on) { toast("You're on a school course. Bytteboden can wait.", "warn"); return; }
  if (l.mute || l.deal || MKT.typing[l.id]) return;
  const amt = mktRound(l.ask * frac), S = SELLER_P[l.pers], say = MKT_SAY[l.pers];
  mktSay(l, true, `Would you take ${fmtCash(amt)}?`);
  MKT.typing[l.id] = true; TABLET.refresh("market");
  setTimeout(() => {
    delete MKT.typing[l.id];
    if (!GS.mkt.list.includes(l)) return;
    if (amt >= l.floor) { l.deal = amt; mktSay(l, false, say.ok(fmtCash(amt))); }
    else if (amt < l.floor * 0.8 && l.pers === "stubborn" || amt < l.floor * 0.7) {
      l.pat -= 2; if (l.pat <= 0) { l.mute = true; mktSay(l, false, say.insult()); } else { l.ask = Math.max(l.floor, mktRound(l.ask * 0.98)); mktSay(l, false, say.counter(fmtCash(l.ask))); }
    } else {
      l.pat -= 1;
      // how far they come down: stubborn barely, desperate most of the way to you
      const k = { stubborn: 0.15, fair: 0.45, haggler: 0.5, desperate: 0.65 }[l.pers];
      l.ask = Math.max(l.floor, mktRound(l.ask - (l.ask - amt) * k));
      if (l.pat <= 0) { l.mute = true; mktSay(l, false, say.last(fmtCash(l.ask))); }
      else mktSay(l, false, say.counter(fmtCash(l.ask)));
    }
    tabPing("note"); TABLET.refresh("market"); save();
  }, 900 + Math.random() * 1400);
}
// in person, before you pay: the truth about it
function mktInspect(l) {
  if (!mktHere(l)) { toast(`Stop at ${l.seller}'s in ${shortName(mktSite(l))} to look it over.`, "warn"); return; }
  if (l.insp) return;
  l.insp = true; const say = MKT_SAY[l.pers];
  if (l.lemon) {
    l.ask = mktRound(l.ask * 0.85); l.floor = Math.round(l.floor * 0.78); l.pat = Math.max(l.pat, 0) + 1; l.mute = false; if (l.deal) l.deal = Math.min(l.deal, l.ask);
    mktSay(l, true, `${l.tell} The ad said ${pctC(l.adv)}. This is more like ${pctC(l.real)}.`);
    mktSay(l, false, say.insp1(fmtCash(l.ask)));
    toast(`Not what the ad said: ${l.tell} About ${pctC(l.real)} condition, not ${pctC(l.adv)}.`, "warn");
  } else { mktSay(l, false, say.insp0()); toast(`You look it over: ${pctC(l.real)} condition, as advertised.`, "good"); }
  TABLET.refresh("market"); save();
}
function mktPay(l) {
  if (SCHOOL.on) { toast("You're on a school course. Bytteboden can wait.", "warn"); return; }
  const p = mktPrice(l), inf = mktInfo(l, l.real);
  if (GS.cash < p) { toast(`That's ${fmtCash(p)}. You have ${fmtCash(GS.cash)}.`, "warn"); return; }
  GS.cash -= p; GS.mkt.list = GS.mkt.list.filter(q => q !== l);
  const h = { lid: l.id, cat: l.cat, item: l.item, site: l.site, seller: l.seller, name: inf.name, cond: l.real, adv: l.adv, lemon: l.lemon, insp: l.insp, tell: l.tell, paid: p, hrs: l.hrs, seed: l.seed, state: "wait" };
  GS.mkt.held.push(h); if (MKT.view === l.id) MKT.view = null; if (MKT.guide === l.site) MKT.guide = null;
  const here = mktHere(l);
  toast(here ? `Paid ${l.seller} ${fmtCash(p)}.` : `Sent ${l.seller} ${fmtCash(p)}. ${mktHowTo(h)}`, "good");
  tabPing("good"); save();
  if (here) mktCollect(GS.near);
  TABLET.refresh("market");
}
const mktHowTo = h => h.cat === "engine" ? `Bring a trailer with a free bay to ${shortName(mktSite(h))} and it comes back to the garage as a load.`
  : h.cat === "recv" ? `It's waiting in ${shortName(mktSite(h))}: it rides home on the rack.`
  : h.cat === "sled" ? `It's in ${h.seller}'s shed in ${shortName(mktSite(h))}. Ride over and ride it home.`
  : h.cat === "fish" ? `Pick it up in ${shortName(mktSite(h))}: it goes in your pack.`
  : `It's waiting in ${shortName(mktSite(h))}: hook it up and tow it away. Needs ${recvNeed(h.item)}.`;
// why you can't take it away right now ("" = you can)
function heldWhy(h) {
  if (SCHOOL.on) return "You're on a school course.";
  if (h.cat === "engine") { const r = GS.own.parts.hitch; if (r !== "trailer" && r !== "flatbed") return "Needs a trailer or flatbed on the hitch."; if (ST.bays - baysUsed() < 1) return "Your trailer's full."; return ""; }
  if (h.cat === "recv") return smallLoads().length >= ST.slots ? "Needs a free spot on the rack." : "";
  if (h.cat === "trailer" || h.cat === "groomer") { if (!recvOk(h.item)) return `Needs ${recvNeed(h.item)} on the sled first (garage, Parts).`; if (GS.own.parts.hitch !== "none") return `Your hitch is taken by the ${partDef("hitch", GS.own.parts.hitch).name.toLowerCase()}. Leave it at the garage first.`; return ""; }
  return "";
}
function mktReveal(h) {
  if (!h.lemon || h.insp) return;
  h.insp = true;
  setTimeout(() => { toast(`Not what the ad said. ${h.tell} It's ${pctC(h.cond)}, not ${pctC(h.adv)}.`, "bad"); TABLET.notify({ app: "market", kind: "warn", title: `${h.seller} sold you a lemon`, body: `${h.name}: ${pctC(h.cond)} condition, not the ${pctC(h.adv)} in the ad. Inspect before you pay next time.`, ttl: 9 }); }, 1600);
}
// stopped at a seller's: take away whatever you've paid for there
function mktCollect(site) {
  if (!GS.mkt || !site) return;
  for (const h of GS.mkt.held.slice()) {
    if (h.state !== "wait" || h.site !== site.id) continue;
    const why = heldWhy(h);
    if (why) { if (gameClock - MKT.nagT > 10) { MKT.nagT = gameClock; toast(`${h.seller}: "${h.name}'s ready when you are." ${why}`, "warn"); } continue; }
    const o = GS.own, a = { s: h.seed || 1, a: wearAmt(h.cond) };
    o.cond = o.cond || {}; o.wear = o.wear || {};
    if (h.cat === "engine") {
      GS.load.push({ big: true, bays: 1, kg: 70 + Math.round(engDef(h.item).power * 30), look: "engine", cargo: h.name, dest: garageSite, cond: 100, hits: 0, pay: 0, fragile: false, crate: h });
      h.state = "aboard"; toast(`${h.seller} helps you strap the ${h.name} down on the trailer. Take it to Nordkinn Skuter & Service.`, "good");
    } else if (h.cat === "recv") {
      GS.load.push({ dest: garageSite, cargo: h.name, crate: h, fragile: false, pay: 0, due: null, hits: 0 });
      h.state = "aboard"; toast(`The ${h.name.toLowerCase()} goes on the rack. The garage will bolt it on.`, "good");
    } else if (h.cat === "trailer" || h.cat === "groomer") {
      const k = "hitch:" + h.item; o.partsOwned[k] = true; o.cond[k] = h.cond; o.wear[k] = a; o.parts.hitch = h.item; TOW.kind = null;
      GS.mkt.held = GS.mkt.held.filter(q => q !== h); restat();
      toast(`You hook up ${h.seller}'s ${h.name.toLowerCase()}. It's yours: ${pctC(h.cond)} condition.`, "good");
    } else if (h.cat === "sled") {
      const s = SLEDS.find(x => x.id === h.item), old = sledDef();
      o.sleds.push(s.id); o.sled = s.id; o.cond["sled:" + s.id] = h.cond; o.wear["sled:" + s.id] = a;
      GS.mkt.held = GS.mkt.held.filter(q => q !== h); checkBoost(); restat(); applySettings();
      toast(`You ride off on the ${s.name}. ${h.seller} runs your ${old.name} back to the garage for you.`, "good");
    } else if (h.cat === "fish") {
      const [t, id] = h.item.split(":"), c1 = MKT_GEAR[t];
      if (GS.fish && GS.fish.own && GS.fish.own[c1]) GS.fish.own[c1][id] = { c: +h.cond.toFixed(3) };
      GS.mkt.held = GS.mkt.held.filter(q => q !== h);
      toast(`The ${h.name.toLowerCase()} goes in your pack: ${pctC(h.cond)}. Pick it in the sled's tackle box when you fish.`, "good");
    }
    mktReveal(h); applyLoadout(); save(); TABLET.refresh("market");
  }
}
// at the garage: engines go on the shelf, receivers get bolted on
function mktDeliver(j) {
  const h = j.crate, o = GS.own; GS.mkt.held = GS.mkt.held.filter(q => q !== h);
  o.cond = o.cond || {}; o.wear = o.wear || {};
  if (h.cat === "engine") {
    const d = engDef(h.item), cond = clamp(h.cond - (100 - (j.cond === undefined ? 100 : j.cond)) / 100 * 0.35, 0.3, 1);
    const inst = { eid: h.item, base: d.power, cond: +cond.toFixed(3), pwr: +(d.power * condMul(cond)).toFixed(3), hrs: h.hrs || 300, from: shortName(mktSite(h)), seller: h.seller, wear: { s: h.seed || 1, a: wearAmt(cond) } };
    o.shelf.push(inst);
    toast(`The ${d.name} is on the shelf${cond < h.cond - 0.01 ? `, a bit worse for the trip (${pctC(cond)})` : ""}. Fit it in the garage's Engines tab: ${fmtCash(fitFee(inst))} labour.`, "good");
  } else if (h.cat === "recv") {
    const k = "recv:" + h.item, cur = o.parts.recv || "none"; o.partsOwned[k] = true; o.cond[k] = h.cond;
    if (cur === "none" || (cur === "ball" && h.item === "heavy")) { o.parts.recv = h.item; toast(`The shop bolts on the ${h.name.toLowerCase()}. No charge for that one.`, "good"); }
    else toast(`The ${h.name.toLowerCase()} goes on the shelf in the garage (Parts).`, "good");
  }
}
// where the arrow goes when you're empty-handed: something paid for that you can collect, or a listing you asked it to guide you to
function pendingPickup() {
  if (!GS.mkt) return null;
  const h = GS.mkt.held.find(q => q.state === "wait" && !heldWhy(q));
  if (h) return h;
  if (MKT.guide) { const l = GS.mkt.list.find(q => q.site === MKT.guide); if (l) return { site: l.site, name: mktInfo(l).name, seller: l.seller, guide: true }; MKT.guide = null; }
  return null;
}

/* ---- the "photo": a little snapshot of the thing on a snowy porch, drawn once per listing ---- */
const MKT_PIC = new Map();
function mktPic(l) {
  const k = l.id + ":" + (l.insp ? 1 : 0); if (MKT_PIC.has(k)) return MKT_PIC.get(k);
  if (MKT_PIC.size > 60) MKT_PIC.clear();
  const W = 240, H = 180, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d"), r = mulberry32(l.seed || 7);
  // the setting: a shed wall and snow, or the porch, slightly off level like a phone photo
  g.save(); g.translate(W / 2, H / 2); g.rotate((r() - 0.5) * 0.06); g.translate(-W / 2, -H / 2);
  const wall = ["#6b3b2a", "#5b4a3a", "#3f4a52", "#7a6a55", "#8a3528"][(r() * 5) | 0];
  g.fillStyle = wall; g.fillRect(-10, -10, W + 20, H * 0.62);
  g.strokeStyle = "rgba(0,0,0,.22)"; g.lineWidth = 2; for (let x = -10; x < W + 10; x += 16 + r() * 4) { g.beginPath(); g.moveTo(x, -10); g.lineTo(x, H * 0.62); g.stroke(); }
  if (r() < 0.6) { g.fillStyle = "rgba(255,214,150,.55)"; g.fillRect(W * (0.6 + r() * 0.2), 18, 40, 28); g.strokeStyle = "#e9e4d8"; g.lineWidth = 3; g.strokeRect(W * 0.6 + 0, 18, 40, 28); }
  const sg = g.createLinearGradient(0, H * 0.55, 0, H); sg.addColorStop(0, "#dfe7ee"); sg.addColorStop(1, "#b9c6d2"); g.fillStyle = sg; g.fillRect(-10, H * 0.58, W + 20, H);
  const inf = mktInfo(l), cx = W / 2, cy = H * 0.68;
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  if (l.cat === "engine") {
    R(cx - 58, cy + 6, 116, 12, "#7a5a3a"); R(cx - 46, cy - 40, 92, 48, "#30353b"); R(cx - 40, cy - 56, 36, 18, "#3c4249"); R(cx + 4, cy - 56, 36, 18, "#3c4249");
    for (let i = 0; i < 5; i++) R(cx - 40, cy - 52 + i * 3.4, 80, 1.4, "rgba(255,255,255,.12)");
    g.fillStyle = "#8d99a6"; g.beginPath(); g.arc(cx - 52, cy - 16, 14, 0, 6.283); g.fill(); g.fillStyle = "#30353b"; g.beginPath(); g.arc(cx - 52, cy - 16, 5, 0, 6.283); g.fill();
    g.strokeStyle = "#9aa3ab"; g.lineWidth = 6; g.beginPath(); g.moveTo(cx + 40, cy - 30); g.quadraticCurveTo(cx + 66, cy - 30, cx + 64, cy); g.stroke();
    if (engDef(l.item).turbo) { g.fillStyle = "#b8bec4"; g.beginPath(); g.arc(cx + 30, cy - 62, 11, 0, 6.283); g.fill(); }
  } else if (l.cat === "sled") {
    // side view, nose to the left: skis, the track under the tunnel, the hood, the seat, the windshield
    const lv = inf.sd.livery, gy = cy + 8;
    g.fillStyle = "#1c2126"; g.beginPath(); g.moveTo(cx - 30, gy - 14); g.lineTo(cx + 92, gy - 14); g.lineTo(cx + 98, gy - 2); g.lineTo(cx + 88, gy + 6); g.lineTo(cx - 20, gy + 6); g.closePath(); g.fill();        // track
    for (let i = 0; i < 12; i++) R(cx - 20 + i * 9.5, gy + 2, 4, 4, "#0d1014");
    R(cx - 104, gy + 4, 70, 4, "#3a4048"); g.strokeStyle = "#3a4048"; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 104, gy + 6); g.quadraticCurveTo(cx - 118, gy + 4, cx - 112, gy - 6); g.stroke();   // ski
    R(cx - 66, gy - 12, 5, 18, "#2a2f34");                                                                   // spindle
    g.fillStyle = lv.panel; g.beginPath(); g.moveTo(cx - 100, gy - 4); g.lineTo(cx - 10, gy - 10); g.lineTo(cx - 10, gy - 2); g.lineTo(cx - 92, gy + 2); g.closePath(); g.fill();   // belly pan
    g.fillStyle = lv.body; g.beginPath(); g.moveTo(cx - 100, gy - 4); g.quadraticCurveTo(cx - 96, gy - 40, cx - 44, gy - 46); g.lineTo(cx - 4, gy - 44); g.lineTo(cx - 6, gy - 10); g.closePath(); g.fill();   // hood
    g.fillStyle = lv.trim; g.beginPath(); g.moveTo(cx - 96, gy - 14); g.lineTo(cx - 8, gy - 20); g.lineTo(cx - 8, gy - 16); g.lineTo(cx - 97, gy - 10); g.closePath(); g.fill();       // stripe
    R(cx - 96, gy - 30, 10, 8, "#f6f2d8");                                                                  // headlight
    g.fillStyle = "rgba(190,225,255,.55)"; g.beginPath(); g.moveTo(cx - 40, gy - 46); g.lineTo(cx - 26, gy - 70); g.lineTo(cx - 14, gy - 68); g.lineTo(cx - 18, gy - 45); g.closePath(); g.fill();   // windshield
    R(cx - 16, gy - 62, 4, 18, "#2a2f34"); R(cx - 24, gy - 64, 18, 4, "#2a2f34");                           // bars
    g.fillStyle = lv.seat; g.beginPath(); g.moveTo(cx - 4, gy - 26); g.lineTo(cx + 74, gy - 26); g.quadraticCurveTo(cx + 84, gy - 26, cx + 84, gy - 16); g.lineTo(cx - 4, gy - 16); g.closePath(); g.fill();   // seat
    R(cx - 4, gy - 16, 96, 4, lv.panel);                                                                    // tunnel
  } else if (l.cat === "recv") {
    R(cx - 50, cy - 8, 100, 18, "#3a4048"); R(cx + 30, cy - 18, 26, 38, "#3a4048"); g.fillStyle = "#9aa3ab"; g.beginPath(); g.arc(cx - 50, cy + 1, 12, 0, 6.283); g.fill(); R(cx - 6, cy - 4, 8, 10, "#111");
  } else if (l.cat === "trailer") {
    const fb = l.item === "flatbed";
    R(cx - 90, cy + 2, 170, 6, "#8d99a6"); R(cx - 88, cy - (fb ? 14 : 34), 160, fb ? 14 : 36, fb ? "#6b7480" : "#27313c");
    if (fb) for (let i = 0; i < 4; i++) R(cx - 84 + i * 50, cy - 40, 4, 28, "#8d99a6");
    g.strokeStyle = "#8d99a6"; g.lineWidth = 4; g.beginPath(); g.moveTo(cx + 72, cy - 6); g.lineTo(cx + 108, cy - 2); g.stroke();
  } else if (l.cat === "groomer") {
    const t = l.item === "tiller", col = t ? "#b8261c" : "#e0a820";
    R(cx - 90, cy - 4, 160, 12, col); R(cx - 84, cy - (t ? 36 : 18), 148, t ? 32 : 14, col);
    for (let i = 0; i < 14; i++) R(cx - 86 + i * 11, cy + 8, 5, 8, "#15191e");
    if (t) { g.fillStyle = "#6a3a00"; g.fillRect(cx - 20, cy - 46, 10, 10); }
    g.strokeStyle = "#8d99a6"; g.lineWidth = 4; g.beginPath(); g.moveTo(cx + 70, cy - 10); g.lineTo(cx + 108, cy - 4); g.stroke();
  } else {
    const t = l.item.split(":")[0];
    if (t === "augers") { g.strokeStyle = "#9aa3ab"; g.lineWidth = 10; g.beginPath(); g.moveTo(cx, cy - 74); g.lineTo(cx, cy + 10); g.stroke(); for (let i = 0; i < 6; i++) { g.strokeStyle = "#c4ccd3"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 12, cy - 30 + i * 7); g.lineTo(cx + 12, cy - 26 + i * 7); g.stroke(); } R(cx - 26, cy - 92, 52, 26, mktFishDef(l.item) && mktFishDef(l.item).start === "pull" ? "#c23a22" : "#2a6a9a"); }
    else if (t === "reels") { g.fillStyle = "#2a2f34"; g.beginPath(); g.arc(cx, cy - 26, 32, 0, 6.283); g.fill(); g.fillStyle = "#b8c2c8"; g.beginPath(); g.arc(cx, cy - 26, 22, 0, 6.283); g.fill(); R(cx + 14, cy - 34, 30, 6, "#15191c"); }
    else { g.strokeStyle = "#2d2d2d"; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 80, cy + 4); g.lineTo(cx + 90, cy - 40); g.stroke(); R(cx - 84, cy - 4, 40, 12, "#b88a5a"); g.fillStyle = "#c9d0d6"; g.beginPath(); g.arc(cx - 34, cy - 6, 9, 0, 6.283); g.fill(); }
  }
  // wear specks, a little blur of grain, and the phone's flash glare
  const wa = wearAmt(l.insp ? l.real : l.adv);
  for (let i = 0; i < 40 * wa; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,60,25,.5)" : "rgba(230,230,230,.45)"; g.fillRect(cx - 80 + r() * 160, cy - 60 + r() * 70, 1 + r() * 3, 1 + r() * 2); }
  g.restore();
  const gl = g.createRadialGradient(W * 0.3, H * 0.25, 4, W * 0.3, H * 0.25, W * 0.5); gl.addColorStop(0, "rgba(255,255,255,.18)"); gl.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gl; g.fillRect(0, 0, W, H);
  const id = g.getImageData(0, 0, W, H), px = id.data; for (let i = 0; i < px.length; i += 4) { const n = (r() - 0.5) * 18; px[i] += n; px[i + 1] += n; px[i + 2] += n; } g.putImageData(id, 0, 0);
  const url = cv.toDataURL("image/jpeg", 0.72); MKT_PIC.set(k, url); return url;
}

/* ---- the app ---- */
TICON.market = svgI(`<path d="M3.5 9.5 5 4.5h14l1.5 5"/><path d="M3.5 9.5a2.8 2.8 0 0 0 5.6 0 2.9 2.9 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0"/><path d="M5 12v7.5h14V12M10 19.5v-4.5h4v4.5"/>`);
function mktCardHtml(l, i) {
  const inf = mktInfo(l, l.insp ? l.real : l.adv), site = mktSite(l), left = mktLeft(l), S = SELLER_P[l.pers];
  const chips = chip(pctC(l.insp ? l.real : l.adv), l.insp && l.lemon ? "due" : "") + (S.tag ? chip(S.tag, l.pers === "desperate" ? "ok" : "") : "") + (l.deal ? chip("DEAL " + fmtCash(l.deal), "ok") : "") + (l.insp ? chip(l.lemon ? "INSPECTED · WORSE" : "INSPECTED", l.lemon ? "due" : "ok") : "") + (left < 12 ? chip("ENDS IN " + Math.max(1, Math.round(left)) + " H", "due") : "");
  return `<div class="tmk" data-tf="mk:${l.id}"><img class="tmkp" alt="" src="${mktPic(l)}"><div class="tmkb"><div class="tmkr"><b class="tpay">${fmtCash(mktPrice(l))}</b>${l.ask < l.ask0 && !l.deal ? `<s>${fmtCash(l.ask0)}</s>` : ""}</div><div class="tmkt">${tabEsc(inf.name)}</div><div class="tcm">${tabEsc(inf.stat)}</div><div class="tmkc">${chips}</div><div class="tcm">${tabEsc(l.seller)} · ${tabEsc(shortName(site))} · ${fmtMi(Math.hypot(site.x - P.x, site.z - P.z))}</div><button type="button" class="tbtn ghost" data-mk="${l.id}">OPEN</button></div></div>`;
}
function mktHeldHtml(h) {
  const site = mktSite(h), why = h.state === "aboard" ? "" : heldWhy(h);
  const st = h.state === "aboard" ? "On the way to the garage" : why ? why : mktHere({ site: h.site }) ? "Stopped here: loading…" : `Ready. Stop at ${h.seller}'s in ${shortName(site)}.`;
  return tabCard({ tf: "mh:" + h.lid, mini: `depot|${h.site}`, title: h.name, chips: chip("PAID " + fmtCash(h.paid), "ok") + chip(h.insp ? pctC(h.cond) : pctC(h.adv) + "?", h.insp && h.lemon ? "due" : "") + (h.state === "aboard" ? chip("ABOARD", "due") : ""), meta: `${tabEsc(h.seller)} · ${tabEsc(shortName(site))} · ${fmtMi(Math.hypot(site.x - P.x, site.z - P.z))} from you`, note: tabEsc(st) });
}
function mktDetail(el, l) {
  const inf = mktInfo(l, l.insp ? l.real : l.adv), advI = mktInfo(l, l.adv), site = mktSite(l), here = mktHere(l), S = SELLER_P[l.pers];
  const cur = l.cat === "engine" ? engineOf(sledDef()).pwr : 0, typing = MKT.typing[l.id];
  let h = `<button type="button" class="tml" data-tf="mkback" data-mkback="1">‹ All listings</button>`;
  h += `<div class="tmkd"><img class="tmkp big" alt="" src="${mktPic(l)}"><div>
    <div class="tey">${tabEsc(MKT_CATS.find(c => c.id === l.cat).name.toUpperCase())} · LISTED ${Math.max(0, Math.round((CAL.abs() - l.t0) / 24))} DAY${Math.round((CAL.abs() - l.t0) / 24) === 1 ? "" : "S"} AGO</div>
    <div class="tti" style="font-size:24px">${tabEsc(inf.name)}</div>
    <div class="tmkr"><b class="tpay" style="font-size:26px">${fmtCash(mktPrice(l))}</b>${l.ask < l.ask0 && !l.deal ? `<s>${fmtCash(l.ask0)}</s>` : ""}<span class="tcm">new ≈ ${fmtCash(inf.newP)}</span></div>
    <div class="tcm">Advertised: ${pctC(l.adv)} condition · ${tabEsc(advI.stat)}${l.hrs ? ` · ${l.hrs} h` : ""}</div>
    ${l.insp ? `<div class="tcm" style="color:${l.lemon ? "var(--bad)" : "var(--pay)"}">Inspected: ${pctC(l.real)} condition · ${tabEsc(inf.stat)}</div>` : `<div class="tcn">Only the ad's word for it. Stop at the seller's to look it over before you pay.</div>`}
    ${l.cat === "engine" ? `<div class="tcm">Yours now: ${Math.round(cur * 100)}% power in the ${tabEsc(sledDef().name)}.</div>` : ""}
    <div class="tcm">${tabEsc(l.seller)} · ${tabEsc(site.name)} · ${fmtMi(Math.hypot(site.x - P.x, site.z - P.z))} from you · ${Math.max(1, Math.round(mktLeft(l)))} h left${S.tag ? " · " + chip(S.tag) : ""}</div>
  </div></div>`;
  h += `<div class="tmkth"><div class="tmkm them">${tabEsc(l.why)}</div>${l.thread.map(m => `<div class="tmkm ${m.me ? "me" : "them"}">${tabEsc(m.t)}</div>`).join("")}${typing ? `<div class="tmkm them typing">${tabEsc(l.seller)} is typing…</div>` : ""}</div>`;
  const offers = [0.7, 0.8, 0.9].map(f => `<button type="button" class="tbtn ghost" data-tf="mko:${f}" data-mko="${f}"${l.mute || l.deal || typing ? " disabled" : ""}>OFFER ${fmtCash(mktRound(l.ask * f))}</button>`).join("");
  const why = l.cat === "engine" ? (isElectric(sledDef()) ? "No engine goes in the Aurora; it'll sit on the shelf." : "") : "";
  h += `<div class="tmka">${offers}</div>`;
  h += `<div class="tmka"><button type="button" class="tbtn" data-tf="mkpay" data-mkpay="1">${here ? "PAY" : "SEND"} ${fmtCash(mktPrice(l))}${l.deal ? " (DEAL)" : ""}</button>
    <button type="button" class="tbtn ghost" data-tf="mkins" data-mkins="1"${l.insp || !here ? " disabled" : ""}>${l.insp ? "INSPECTED" : here ? "INSPECT IT" : "INSPECT (IN PERSON)"}</button>
    <button type="button" class="tbtn ghost" data-tf="mkgo" data-mkgo="1">${MKT.guide === l.site ? "STOP GUIDING" : "GUIDE ME THERE"}</button></div>`;
  h += `<p class="tnote2">${l.mute ? `${tabEsc(l.seller)} has stopped answering offers. The asking price still stands. ` : ""}${tabEsc(mktHowTo({ cat: l.cat, item: l.item, site: l.site, seller: l.seller }))}${why ? " " + why : ""} Paying from here sends the money now; you only see it for real when you collect.</p>`;
  el.innerHTML = `<div class="tapp">${h}</div>`;
  el.querySelector("[data-mkback]").addEventListener("click", () => { MKT.view = null; TABLET.render(); });
  for (const b of el.querySelectorAll("[data-mko]")) b.addEventListener("click", () => mktOffer(l, +b.dataset.mko));
  el.querySelector("[data-mkpay]").addEventListener("click", () => mktPay(l));
  el.querySelector("[data-mkins]").addEventListener("click", () => mktInspect(l));
  el.querySelector("[data-mkgo]").addEventListener("click", () => { MKT.guide = MKT.guide === l.site ? null : l.site; TABLET.render(); });
  const th = el.querySelector(".tmkth"); if (th) th.scrollTop = th.scrollHeight;
}
TABLET.register({
  id: "market", name: "Bytteboden", icon: TICON.market, order: 5.7, live: 4,
  badge: () => GS.mkt ? (GS.mkt.held.filter(h => h.state === "wait").length || "") : "",
  onOpen() { if (!GS.mkt) mktInit(null); },
  render(el) {
    const l = MKT.view && GS.mkt.list.find(q => q.id === MKT.view);
    if (l) { mktDetail(el, l); return; }
    MKT.view = null;
    let h = tabHead("BYTTEBODEN · KJØP, SALG, BYTTE · NORDKINN", "Bytteboden", fmtCash(GS.cash));
    h += `<div class="tsub">Used gear from private sellers round the peninsula · ${HITCH_ON[GS.own.parts.hitch]}${ST.bays ? ` · ${ST.bays - baysUsed()} free bay${ST.bays - baysUsed() === 1 ? "" : "s"}` : ""} · receiver: ${GS.own.parts.recv === "heavy" ? "heavy-duty" : GS.own.parts.recv === "ball" ? "light" : "none"}</div>`;
    const held = GS.mkt.held;
    if (held.length) { h += sec("Paid for · waiting", "collect in person"); for (const q of held) h += mktHeldHtml(q); }
    h += `<div class="tlays tmkcats">${MKT_CATS.map(c => { const n = c.id === "all" ? GS.mkt.list.filter(mktVisible).length : GS.mkt.list.filter(q => q.cat === c.id && mktVisible(q)).length; return `<button type="button" class="tml${MKT.cat === c.id ? " on" : ""}" data-tf="mkc:${c.id}" data-mkc="${c.id}">${c.name} <b>${n}</b></button>`; }).join("")}</div>`;
    const list = GS.mkt.list.filter(q => (MKT.cat === "all" || q.cat === MKT.cat) && mktVisible(q)).sort((a, b) => (b.t0 - a.t0));
    h += sec(MKT.cat === "all" ? "Near you and further out" : MKT_CATS.find(c => c.id === MKT.cat).name, `${list.length} listed · new ones come in all day`);
    h += list.length ? `<div class="tmkg">${list.map(mktCardHtml).join("")}</div>` : `<p class="tnote2">Nothing in this category right now. Check back in a few hours.</p>`;
    h += `<p class="tnote2">Private sales: used, a bit worn, cheaper than new. Engines come back to the garage on a trailer and the shop fits them for labour. Trailers and groomers hook straight on if you've a receiver for them. The ad isn't always the truth: look before you pay.</p>`;
    el.innerHTML = `<div class="tapp">${h}</div>`;
    for (const b of el.querySelectorAll("[data-mkc]")) b.addEventListener("click", () => { MKT.cat = b.dataset.mkc; TABLET.render(); });
    for (const b of el.querySelectorAll("[data-mk]")) b.addEventListener("click", () => { MKT.view = +b.dataset.mk; $("tabV").scrollTop = 0; TABLET.render(); });
    tabMinis(el);
  }
});

/* ---------------- Real Estate: depot cabins (winter update O6, phase 5) ----------------
   Bought through the Real Estate app (a $50 App Store download; no office, no school). Two of the existing herder cabins
   and two new lakeside cabins built for it (Fjellbu and Viddastua, off SITES so no parcels go there).
   - Rent: every night you're not there (more than RE.away m off at midnight) tourists may take it: occupancy is about
     55%, more in polar night and with upgrades. The nights add up and are paid every Monday (CAL.onDayChange).
   - Upgrades (sauna, insulation, a better stove) raise the nightly rent and the occupancy.
   - Fuel cache: a tank and pump by each cabin you own. It fills your tank free at the pump; every Monday the bill comes
     out of your money: a standing charge plus every litre you took that week. It never runs out. If the bill can't be
     paid it goes into arrears and the fuel boat won't fill the cache until you pay (Real Estate app).
   - The summer skip settles summer lets and the standing charges through SEASON.addBill.
   - Owned depots go on the Map app's Depots layer, and you warm up at them like at any cabin.
   Saved as `re` ({ own: { id: { up, acc, nights, L, since } }, arrears, last }). */
const RE_CABINS = [
  { id: "sandfjord", site: "sandfjord", name: "Sandfjorddalen herder cabin", price: 3800, rent: 42, blurb: "A turf-roofed herder's cabin in the valley, two bunks and a stove. Reindeer at the window in the morning." },
  { id: "risfjord", site: "risfjord", name: "Risfjord herder cabin", price: 4400, rent: 46, blurb: "Out on the east side over Risfjorden, with a jerry-can rack already on the porch. Long views of the fjord." },
  { id: "fjellbu", lake: 8, name: "Fjellbu", price: 5600, rent: 55, paint: "red", blurb: "A red lakeside hytte on the southern fell: ice fishing off the doorstep, and dark enough for the aurora." },
  { id: "viddastua", lake: 9, name: "Viddastua", price: 6800, rent: 62, paint: "yellow", blurb: "The plateau lodge: sleeps six, a long table, the lake below and nothing at all to the south." }
];
const RE_UPS = [
  { id: "stove", name: "Soapstone stove", cost: 700, rent: 10, occ: 0.04, note: "Holds the heat all night. Guests stop writing about the cold." },
  { id: "insul", name: "Insulation & triple glazing", cost: 950, rent: 12, occ: 0.06, note: "Warm in a storm. Books up through the dark months." },
  { id: "sauna", name: "Wood-fired sauna", cost: 2200, rent: 24, occ: 0.08, note: "A sauna hut on the shore, and a hole in the ice to jump in. The tourists' favourite thing in Finnmark." }
];
const RE_FUEL = { perL: 1.95, standing: 35 };
const RE = { away: 120, here: null, sync: 0 };
const reCab = id => RE_CABINS.find(c => c.id === id);
const reOwned = () => RE_CABINS.filter(c => GS.re && GS.re.own[c.id]);
const reNight = c => { const o = GS.re.own[c.id] || { up: {} }; return c.rent + RE_UPS.reduce((a, u) => a + (o.up[u.id] ? u.rent : 0), 0); };
const reOcc = c => { const o = GS.re.own[c.id] || { up: {} }; return clamp(0.52 + (CAL.isPolarNight() ? 0.12 : 0) + (AUR.v > 0.35 ? 0.06 : 0) + RE_UPS.reduce((a, u) => a + (o.up[u.id] ? u.occ : 0), 0), 0.15, 0.95); };
function reInit(d) {
  GS.re = d && typeof d === "object" ? { own: Object.assign({}, d.own || {}), arrears: +d.arrears || 0, last: Array.isArray(d.last) ? d.last.slice(0, 4) : [] } : { own: {}, arrears: 0, last: [] };
  for (const id in GS.re.own) { if (!reCab(id)) { delete GS.re.own[id]; continue; } GS.re.own[id] = Object.assign({ up: {}, acc: 0, nights: 0, rented: 0, L: 0 }, GS.re.own[id]); }
  reSync();
}
// where they are: the herder cabins are the sites themselves; the new ones go on a flat spot by their lake
function computeRE() {
  for (const c of RE_CABINS) {
    if (c.site) { const s = SITES.find(q => q.id === c.site); c.s = s; c.x = s.x; c.z = s.z; c.y = s.y; continue; }
    const L = LAKES[c.lake], a = c.lake === 8 ? 0 : -Math.PI / 2, p = flatSpot(L.x + Math.cos(a) * (L.r + 40), L.z + Math.sin(a) * (L.r + 40), 70);
    c.x = p[0]; c.z = p[1]; c.y = groundAt(c.x, c.z); c.built = true; c.clear = 34;
  }
}
const reNearCab = (x = P.x, z = P.z, r = 24) => RE_CABINS.find(c => c.x !== undefined && Math.hypot(x - c.x, z - c.z) < r) || null;
function reSignTex(c, sold) {
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const g = cv.getContext("2d");
  g.fillStyle = sold ? "#13202b" : "#f2efe6"; g.fillRect(0, 0, 256, 128); g.fillStyle = sold ? "#7fc8e0" : "#c23a22"; g.fillRect(0, 0, 256, 16);
  g.fillStyle = sold ? "#f2efe6" : "#1a1a1a"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "700 34px 'Barlow Semi Condensed', sans-serif";
  g.fillText(sold ? "DEPOT" : "TIL SALGS", 128, 56); g.font = "600 17px 'Barlow Semi Condensed', sans-serif"; g.fillStyle = sold ? "#7fc8e0" : "#c23a22";
  g.fillText(sold ? "fuel cache · private" : "FINNMARK EIENDOM · " + fmtCash(c.price), 128, 96);
  return new THREE.CanvasTexture(cv);
}
function buildRE() {
  const K = KIT, steel = K.L(0x8d99a6), green = K.L(0x2f5a3a), amber = K.L(0xd98a14), red = K.L(0xa8392a), dark = K.L(0x1d2228);
  for (const c of RE_CABINS) {
    if (c.x === undefined) continue;
    if (c.built) {                                               // the new cabins: a hytte, a woodshed, a lamp
      K.house(c.x, c.z - 6, 8, 6.5, 3.1, 0.2, K[c.paint] || K.red, true);
      K.house(c.x + 7.5, c.z - 8, 3.4, 2.6, 2.1, 0.2, K.wood, false);
      K.lamp(c.x - 5, c.z - 1);
    }
    // the yard kit, offset to the side of the cabin: a for-sale sign, and (once it's yours) a fuel cache, a pump and a sauna
    const bx = c.x + (c.built ? -7 : -9), bz = c.z + (c.built ? 3 : 6), g = new THREE.Group(); g.position.set(bx, groundAt(bx, bz) - 0.1, bz); scene.add(g);
    const sign = new THREE.Group(); g.add(sign);
    K.bx(sign, 0.1, 1.9, 0.1, K.woodD, -0.7, 0.95, 0); K.bx(sign, 0.1, 1.9, 0.1, K.woodD, 0.7, 0.95, 0);
    const sm = new THREE.MeshBasicMaterial({ map: reSignTex(c, false) }); const sp = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), sm); sp.position.set(0, 1.55, 0.07); sign.add(sp);
    const cache = new THREE.Group(); g.add(cache); cache.position.set(3.2, 0, -0.5);
    K.put(cache, new THREE.CylinderGeometry(0.75, 0.75, 2.6, 14), green, 0, 1.15, 0).rotation.z = Math.PI / 2;
    for (const sx of [-0.9, 0.9]) K.bx(cache, 0.14, 0.45, 1.2, steel, sx, 0.22, 0);
    K.bx(cache, 0.5, 1.3, 0.4, red, 1.8, 0.65, 0.6); K.bx(cache, 0.36, 0.3, 0.06, amber, 1.8, 1.05, 0.83); K.bx(cache, 0.08, 0.5, 0.08, dark, 2.1, 0.8, 0.8);
    const sauna = new THREE.Group(); g.add(sauna); sauna.position.set(-4.5, 0, -6);
    K.bx(sauna, 2.6, 2.1, 2.2, K.woodD, 0, 1.05, 0); K.bx(sauna, 3.0, 0.25, 2.6, K.snowM, 0, 2.25, 0); K.bx(sauna, 0.2, 0.9, 0.2, K.stone, 0.7, 2.6, 0.5); K.bx(sauna, 0.6, 1.5, 0.08, K.doorM, 0, 0.75, 1.11);
    addOb({ x: bx + 3.2, z: bz - 0.5, r: 1.4, top: 1e9 });
    c.vis = { sign, sm, cache, sauna, g };
    if (!c.built) c.pumpAt = { x: bx + 3.2, z: bz - 0.5 }; else c.pumpAt = { x: bx + 3.2, z: bz - 0.5 };
  }
  reSync();
}
// show what's owned: the sign comes down (well, turns into a DEPOT board), the cache goes up, the sauna if you built one
function reSync() {
  for (const c of RE_CABINS) {
    if (!c.vis) continue;
    const o = GS.re && GS.re.own[c.id], k = o ? "own" + (o.up.sauna ? "s" : "") : "sale";
    if (c.vis.k === k) continue; c.vis.k = k;
    c.vis.cache.visible = !!o; c.vis.sauna.visible = !!(o && o.up.sauna);
    c.vis.sm.map.dispose(); c.vis.sm.map = reSignTex(c, !!o); c.vis.sm.needsUpdate = true;
  }
}
// the fuel cache's pump, for fuelSpot()
function reFuelSpot() {
  const c = reNearCab(P.x, P.z, 26); if (!c || !GS.re || !GS.re.own[c.id] || GS.re.arrears > 0) return null;
  return c.pump || (c.pump = { name: `${shortName(c)} fuel cache`, fuelPrice: 0, cache: true, cab: c });
}
function reBuy(id) {
  const c = reCab(id); if (!c || GS.re.own[id]) return;
  if (SCHOOL.on) { toast("Finish the school course first.", "warn"); return; }
  if (GS.cash < c.price) { toast(`${c.name} is ${fmtCash(c.price)}. You have ${fmtCash(GS.cash)}.`, "warn"); return; }
  GS.cash -= c.price; GS.re.own[id] = { up: {}, acc: 0, nights: 0, rented: 0, L: 0, since: CAL.dayIndex() };
  reSync(); tabPing("good"); save(); TABLET.render();
  toast(`${c.name} is yours. The fuel boat fills the cache this week; tourists start booking tonight.`, "good");
}
function reUpgrade(id, uid) {
  const c = reCab(id), o = GS.re.own[id], u = RE_UPS.find(x => x.id === uid); if (!c || !o || !u || o.up[uid]) return;
  if (GS.cash < u.cost) { toast(`${u.name} is ${fmtCash(u.cost)}. You have ${fmtCash(GS.cash)}.`, "warn"); return; }
  GS.cash -= u.cost; o.up[uid] = 1; reSync(); save(); TABLET.render();
  toast(`${u.name} at ${shortName(c)}: +${fmtCash(u.rent)} a night from now on.`, "good");
}
function rePayArrears() {
  const a = GS.re.arrears; if (!a) return;
  const p = Math.min(a, GS.cash); GS.cash -= p; GS.re.arrears -= p; save(); TABLET.render();
  toast(GS.re.arrears ? `Paid ${fmtCash(p)} toward the fuel bill. ${fmtCash(GS.re.arrears)} still owing.` : `Fuel bill paid. The boat will fill the cache again.`, GS.re.arrears ? "warn" : "good");
}
// midnight: who stayed, and on Mondays the statement
CAL.onDayChange((n, prev) => {
  if (!GS.re || prev === null) return;
  const own = reOwned(); if (!own.length) return;
  for (const c of own) {
    const o = GS.re.own[c.id];
    if (Math.hypot(P.x - c.x, P.z - c.z) > RE.away && Math.random() < reOcc(c)) { o.acc += reNight(c); o.rented++; }
    o.nights++;
  }
  if (n.dow !== 1) return;
  // the week's statement: rent in, the fuel cache out (standing charge + litres), arrears first
  let rent = 0, bill = 0, L = 0, nights = 0, rented = 0;
  for (const c of own) { const o = GS.re.own[c.id]; rent += o.acc; L += o.L; bill += RE_FUEL.standing + o.L * RE_FUEL.perL; nights += o.nights; rented += o.rented; o.acc = 0; o.L = 0; o.nights = 0; o.rented = 0; }
  rent = Math.round(rent); bill = Math.round(bill);
  GS.cash += rent;
  const owe = bill + GS.re.arrears, paid = Math.min(owe, GS.cash); GS.cash -= paid; GS.re.arrears = owe - paid;
  GS.re.last.unshift({ d: n.label, rent, bill, L: Math.round(L), rented, nights, arrears: GS.re.arrears }); GS.re.last = GS.re.last.slice(0, 4);
  save(); TABLET.refresh("realestate");
  setTimeout(() => TABLET.notify({ app: "realestate", kind: GS.re.arrears ? "warn" : "good", title: `Depots · week to ${n.label}`, body: `Rent +${fmtCash(rent)} (${rented} of ${nights} nights let) · fuel cache −${fmtCash(bill)} (${Math.round(L)} L)${GS.re.arrears ? ` · ${fmtCash(GS.re.arrears)} unpaid: the cache is shut till you pay` : ""}`, ttl: 9 }), 4200);
});
// over the summer: summer lets in, standing charges out (O7's hook)
SEASON.addBill({ name: "Depot cabins: summer lets", perWeek: () => reOwned().reduce((a, c) => a + reNight(c) * 7 * 0.5, 0) });
SEASON.addBill({ name: "Fuel caches: standing charge", perWeek: () => -reOwned().length * RE_FUEL.standing });
TABLET.addLayer("depots", () => reOwned().map(c => ({ x: c.x, z: c.z, name: shortName(c).toUpperCase(), kind: "depot" })));

TABLET.register({
  id: "realestate", name: "Real Estate", icon: TICON.realestate, order: 8, live: 10,
  hidden: () => !GS.apps.realestate,
  badge: () => GS.re && GS.re.arrears ? "!" : "",
  render(el) {
    const own = reOwned(), sale = RE_CABINS.filter(c => !GS.re.own[c.id] && c.x !== undefined);
    const wkRent = own.reduce((a, c) => a + reNight(c) * 7 * reOcc(c), 0), wkL = own.reduce((a, c) => a + GS.re.own[c.id].L, 0);
    let h = tabHead("REAL ESTATE · FINNMARK EIENDOM", "Depot cabins", fmtCash(GS.cash));
    h += `<div class="tsub">${own.length ? `${own.length} depot${own.length > 1 ? "s" : ""} · rent about ${fmtCash(wkRent)} a week · fuel cache ${fmtCash(own.length * RE_FUEL.standing)} a week + ${fuelFmt(RE_FUEL.perL)}` : "No depots yet"}${GS.re.arrears ? " " + chip("ARREARS " + fmtCash(GS.re.arrears), "due") : ""}</div>`;
    TABLET.miniDest = {};
    const mini = c => { const k = c.site || "re_" + c.id; if (!c.site) TABLET.miniDest[k] = { id: k, x: c.x, z: c.z, y: c.y, name: c.name }; return `depot|${k}`; };
    if (GS.re.arrears) h += tabCard({ tf: "rearr", title: "Fuel bill owing", chips: chip("CACHE SHUT", "due"), meta: `The fuel boat won't fill the caches until it's paid.`, pay: fmtCash(GS.re.arrears), act: "rearr", actLabel: "PAY IT" });
    if (own.length) {
      h += sec("Your depots", "rent paid Mondays");
      for (const c of own) {
        const o = GS.re.own[c.id], ups = RE_UPS.filter(u => o.up[u.id]);
        h += tabCard({ tf: "reo:" + c.id, mini: mini(c), title: shortName(c), chips: chip("FUEL CACHE", "ok") + ups.map(u => chip(u.id === "insul" ? "INSULATED" : u.id.toUpperCase())).join(""),
          meta: `${fmtCash(reNight(c))} a night · about ${Math.round(reOcc(c) * 100)}% let · ${fmtMi(Math.hypot(c.x - P.x, c.z - P.z))} from you`,
          note: `This week: ${o.rented} of ${o.nights} nights let, ${fmtCash(o.acc)} in rent; ${o.L.toFixed(0)} L out of the cache (${fmtCash(RE_FUEL.standing + o.L * RE_FUEL.perL)} on Monday's bill).${Math.hypot(c.x - P.x, c.z - P.z) < RE.away ? " You're here, so nobody's renting it tonight." : ""}` });
        const todo = RE_UPS.filter(u => !o.up[u.id]);
        if (todo.length) h += `<div class="tsml2">${todo.map(u => `<div class="tsm2 treup" data-tf="reu:${c.id}:${u.id}"><b>+${fmtCash(u.rent)}</b><span>${tabEsc(u.name)} <i class="tcn">${tabEsc(u.note)}</i></span><button type="button" class="tbtn ghost${GS.cash < u.cost ? " blocked" : ""}" data-reu="${c.id}:${u.id}">${fmtCash(u.cost)}</button></div>`).join("")}</div>`;
      }
    }
    if (GS.re.last.length) {
      h += sec("Statements", "");
      h += `<div class="tsml2">${GS.re.last.map(s => `<div class="tsm2"><b>${tabEsc(s.d)}</b><span>Rent +${fmtCash(s.rent)} · ${s.rented}/${s.nights} nights · cache −${fmtCash(s.bill)} (${s.L} L)</span>${s.arrears ? chip("OWING " + fmtCash(s.arrears), "due") : chip("PAID", "ok")}</div>`).join("")}</div>`;
    }
    h += sec("For sale", sale.length ? "no agent, no fees" : "");
    if (!sale.length) h += `<p class="tnote2">You own every depot on the books. Finnmark Eiendom will be in touch if anything comes up.</p>`;
    for (const c of sale) {
      h += tabCard({ tf: "res:" + c.id, mini: mini(c), title: c.name, chips: chip(c.built ? "LAKESIDE" : "HERDER CABIN") + chip(fmtCash(c.rent) + "/NIGHT"),
        meta: `${fmtMi(Math.hypot(c.x - P.x, c.z - P.z))} from you · rents about ${fmtCash(c.rent * 7 * 0.55)} a week bare`, note: `${tabEsc(c.blurb)} Comes with a fuel cache: fill up free at its pump, the bill comes out every Monday.`,
        pay: fmtCash(c.price), act: "rebuy:" + c.id, actLabel: "BUY IT", blocked: GS.cash < c.price });
    }
    h += `<p class="tnote2">Tourists take a depot on nights you're not there (stay over and it's yours that night). Upgrades raise the rent and how often it's let. The cache never runs dry; you pay for what you take, plus ${fmtCash(RE_FUEL.standing)} a week to keep the tank there.</p>`;
    el.innerHTML = `<div class="tapp">${h}</div>`;
    for (const b of el.querySelectorAll("[data-act^=rebuy]")) b.addEventListener("click", () => reBuy(b.dataset.act.split(":")[1]));
    for (const b of el.querySelectorAll("[data-act=rearr]")) b.addEventListener("click", rePayArrears);
    for (const b of el.querySelectorAll("[data-reu]")) b.addEventListener("click", () => { const [a, u] = b.dataset.reu.split(":"); reUpgrade(a, u); });
    tabMinis(el);
  }
});

/* ---------------- Kjøllefjord ---------------- */
let steamer = null, QUAY = null;
/* ---- the coastal ferry's timetable ----
   She calls twice a day. Northbound: in the fjord mouth about 07:00, alongside 08:15, sails 09:30. Southbound:
   alongside 19:45, sails 21:00. About ten real minutes between sailings, so a day has two loops in it.
   Each call is decided by the weather at the quay at her scheduled arrival (WX.ferry): a strong front holds her
   up 1–3 h (both times shift), a severe one cancels the call. The forecast's chips are a forecast of exactly
   this. A call is frozen once she's within two hours of it, so a god-menu storm can't make her vanish mid-call. */
const STEAMER = { calls: [{ arr: 8.25, dep: 9.5, dir: "northbound" }, { arr: 19.75, dep: 21, dir: "southbound" }], sail: 1.25, horn: 1 / 6, state: null, call: null, memo: {}, memoK: "" };
function steamerCall(D, ci) {
  const fk = WX.seed + ":" + CAL.off + ":" + (WX.force ? WX.force.until + ":" + WX.force.v : "");
  if (STEAMER.memoK !== fk) { const keep = {}, same = STEAMER.memoK.split(":").slice(0, 2).join(":") === fk.split(":").slice(0, 2).join(":"); if (same) for (const k in STEAMER.memo) if (STEAMER.memo[k].fixed) keep[k] = STEAMER.memo[k]; STEAMER.memo = keep; STEAMER.memoK = fk; }
  const key = D * 4 + ci; let o = STEAMER.memo[key];
  if (!o) {
    const c = STEAMER.calls[ci], at = D * 24 + c.arr, f = WX.ferry(at);
    o = STEAMER.memo[key] = { id: key, D, ci, dir: c.dir, sArr: at, sDep: D * 24 + c.dep, state: f.state, delay: f.delay, arr: at + f.delay, dep: D * 24 + c.dep + f.delay };
    const ks = Object.keys(STEAMER.memo); if (ks.length > 60) for (const k of ks) if (Math.abs(STEAMER.memo[k].D - D) > 6) delete STEAMER.memo[k];
  }
  if (!o.fixed && GS.hour >= o.sArr - 2) o.fixed = true;
  return o;
}
// every call touching [H0, H1] (cancelled ones only if `all`), in timetable order
function steamerCalls(H0, H1, all) {
  const out = [];
  for (let D = Math.floor(H0 / 24) - 1; D <= Math.floor(H1 / 24) + 1; D++) for (let ci = 0; ci < STEAMER.calls.length; ci++) {
    const c = steamerCall(D, ci);
    if ((all || c.state !== "cancelled") && c.dep + STEAMER.sail >= H0 && c.arr - STEAMER.sail <= H1) out.push(c);
  }
  return out;
}
function steamerAt(H) {
  for (const c of steamerCalls(H, H)) {
    if (H >= c.arr && H < c.dep) return { s: "in", c, p: (H - c.arr) / (c.dep - c.arr) };
    if (H >= c.arr - STEAMER.sail && H < c.arr) return { s: "arriving", c, p: (H - c.arr + STEAMER.sail) / STEAMER.sail };
    if (H >= c.dep && H < c.dep + STEAMER.sail) return { s: "leaving", c, p: (H - c.dep) / STEAMER.sail };
  }
  return { s: "away", c: null, p: 0 };
}
// the next call whose `key` time ("arr" or "dep") is at or after H; cancelled calls are skipped unless `all`
function steamerNextCall(H, key = "dep", all) {
  for (let D = Math.floor(H / 24) - 1; D <= Math.floor(H / 24) + 4; D++) for (let ci = 0; ci < STEAMER.calls.length; ci++) {
    const c = steamerCall(D, ci); if ((all || c.state !== "cancelled") && c[key] >= H) return c;
  }
  return null;
}
function steamerNext(H, key) { const c = steamerNextCall(H, key); return c ? c[key] : Infinity; }
const ferryChip = c => c.state === "cancelled" ? chip("CANCELLED", "due") : c.state === "delayed" ? chip("+" + c.delay + " H", "heavy") : chip("ON TIME", "ok");

/* ---- the mail sack (winter update O3) ----
   Every cabin, home, village or the lighthouse you stop at for work (a pickup, a drop-off, a groomed line) hands you
   their post: a few pieces at a low price each, more at the villages, worth more the further out it comes from.
   A place only has post for you once every MAIL.cool game hours. It's only paid when you hand the sack in at the
   quay, any time before she sails. Mail is tracked in batches: everything picked up before a given sailing is one
   batch. Each real departure (a cancelled call doesn't count) adds a miss to every batch still in your sack:
   1st miss free (it rides the next boat), 2nd a 10% fine, 3rd you pay the batch's full value and the post office
   takes it back. The sack is strapped to you, so it survives blackouts and the fjord. Saved with the game. */
const MAIL = { cool: 6, per: 14, perKm: 4, warnAt: 1.5, pieces: { village: [3, 6], home: [1, 3], other: [2, 4] } };
const mailCount = () => GS.mail.reduce((a, b) => a + b.n, 0);
const mailValue = () => GS.mail.reduce((a, b) => a + b.v, 0);
// what the next sailing would cost you if the sack's still on you when she goes
function mailRisk() {
  let fine = 0, lose = 0;
  for (const b of GS.mail) { if (b.misses === 1) fine += Math.max(1, Math.round(b.v * 0.1)); else if (b.misses >= 2) lose += b.v; }
  return { fine, lose, worst: GS.mail.reduce((a, b) => Math.max(a, b.misses), 0) };
}
function mailVisit(site) {
  if (!site || site.type === "depot" || site.type === "shop" || site.x === undefined) return null;
  const last = GS.mailT[site.id]; if (last !== undefined && GS.hour - last < MAIL.cool && GS.hour >= last) return null;
  GS.mailT[site.id] = GS.hour;
  const [lo, hi] = site.kind === "village" ? MAIL.pieces.village : site.type === "home" ? MAIL.pieces.home : MAIL.pieces.other;
  const n = lo + Math.floor(Math.random() * (hi - lo + 1)), km = Math.hypot(site.x - depot.x, site.z - depot.z) / 1000;
  let v = 0; for (let i = 0; i < n; i++) v += (MAIL.per + MAIL.perKm * km) * (0.85 + Math.random() * 0.3);
  v = Math.round(v);
  const nx = steamerNextCall(GS.hour, "dep"), forId = nx ? nx.id : -1;
  let b = GS.mail[GS.mail.length - 1];
  if (!b || b.misses || b.forId !== forId) { b = { id: ++GS.mailSeq, n: 0, v: 0, misses: 0, forId, born: +GS.hour.toFixed(3), from: [] }; GS.mail.push(b); }
  b.n += n; b.v += v; if (!b.from.includes(site.name)) b.from.push(site.name);
  setTimeout(() => { if (!GS.dead) toast(`${n === 1 ? "A letter" : n + " pieces of post"} for the boat from ${shortName(site)} (+$${v} when it sails). Sack: ${mailCount()} · ${fmtCash(mailValue())}.`); }, 2700);
  return { n, v };
}
function mailHandIn() {
  if (!GS.mail.length) return;
  const n = mailCount(), v = mailValue(), late = GS.mail.some(b => b.misses), notes = [];
  let pay = v; if (payMul() > 1) { pay *= payMul(); notes.push("polar night ×1.5"); }
  pay = Math.round(pay); GS.cash += pay; GS.mail = []; LOG.mail += n;
  const nx = steamerNextCall(GS.hour, "dep");
  toast(`Mail sack in at the quay post: ${n} piece${n > 1 ? "s" : ""}, +$${pay}${notes.length ? " (" + notes.join(", ") + ")" : ""}.${late ? " The late ones are finally on their way." : ""} It goes out ${nx ? `on the ${fmtTime(nx.dep)} ${nx.dir}` : "on the next boat"}.`, "good");
  TABLET.refresh(); save();
}
// a sailing went: every batch picked up before she cast off takes a miss
function mailSailed(c) {
  if (!GS.mail.length) return;
  let fine = 0, lost = 0, free = 0, nl = 0;
  for (const b of GS.mail.slice()) {
    if (b.born > c.dep) continue;
    b.misses++;
    if (b.misses === 1) free += b.n;
    else if (b.misses === 2) { const f = Math.max(1, Math.round(b.v * 0.1)); fine += f; b.fined = f; }
    else { lost += b.v; nl += b.n; GS.mail.splice(GS.mail.indexOf(b), 1); }
  }
  const owe = fine + lost; if (!owe && !free) return;
  GS.cash = Math.max(0, GS.cash - owe);
  const bits = [];
  if (free) bits.push(`${free} piece${free > 1 ? "s ride" : " rides"} the next boat, no charge`);
  if (fine) bits.push(`A 10% late fine on mail that's missed two boats: −$${fine}`);
  if (lost) bits.push(`${nl} piece${nl > 1 ? "s" : ""} missed three boats. The post office takes ${nl > 1 ? "them" : "it"} back and you pay the full $${lost}`);
  TABLET.notify({ app: "map", kind: owe ? "alert" : "warn", ttl: 9, title: `The ${c.dir} ferry sailed without your mail`, body: bits.join(". ") + "." });
  TABLET.refresh(); save();
}
function mailTick(dt) {
  GS.mailTk = (GS.mailTk || 0) + dt; if (GS.mailTk < 0.25) return; GS.mailTk = 0;
  if (GS.mailH === undefined || GS.mailH > GS.hour || GS.hour - GS.mailH > 72) GS.mailH = GS.hour;
  const H0 = GS.mailH, H1 = GS.hour; GS.mailH = H1;
  if (H1 > H0) for (const c of steamerCalls(H0, H1)) if (c.dep > H0 && c.dep <= H1) mailSailed(c);
  // the pull back to town: a ping an hour and a half before she sails if you've got post on you
  const nx = steamerNextCall(GS.hour, "dep");
  if (nx && GS.mail.length && !nx.mailWarned && nx.dep - GS.hour < MAIL.warnAt && GS.near !== depot) {
    nx.mailWarned = true; const r = mailRisk(), km = Math.hypot(P.x - depot.x, P.z - depot.z) / 1000;
    TABLET.notify({ app: "map", kind: r.fine || r.lose ? "alert" : "info", ttl: 8, title: `Ferry sails ${fmtTime(nx.dep)} · ${mailCount()} pieces aboard`,
      body: `${fmtCash(mailValue())} of post on you, quay ${km.toFixed(1)} km. ${r.lose ? `Miss her and you pay $${r.lose} for mail that's missed three boats.` : r.fine ? `Miss her and it's a $${r.fine} late fine.` : "Miss her and it rides the next one free."}` });
  }
}
// what the Map widget, the minimap and the dash show
function ferryInfo() {
  const st = steamerAt(GS.hour), nx = st.s === "in" ? st.c : steamerNextCall(GS.hour, "dep");
  const skip = steamerNextCall(GS.hour, "dep", true);                       // a cancelled call ahead of the real one
  return { st, c: nx, at: nx ? nx.dep : null, left: nx ? nx.dep - GS.hour : null, cancelled: skip && skip !== nx && skip.state === "cancelled" ? skip : null };
}
const fmtLeft = h => h === null ? "" : h < 0.02 ? "now" : `${Math.floor(h) ? Math.floor(h) + " h " : ""}${Math.floor((h % 1) * 60)} min`;
const fmtLeftS = h => h === null ? "" : h < 0.02 ? "now" : `${Math.floor(h)}h${String(Math.floor((h % 1) * 60)).padStart(2, "0")}`;
// the minimap's ferry and mail line (under the dial; on phones too). Only touches the DOM when the text changes.
const MAILHUD = { k: "", t: 0 };
function updMailHud(dt) {
  if ((MAILHUD.t += dt) < 0.25) return; MAILHUD.t = 0;
  const f = ferryInfo(), r = GS.mail.length ? mailRisk() : null, c = f.c;
  const fer = c ? `<b>FERRY ${fmtTime(c.dep)}</b> ${f.st.s === "in" ? "in · " : ""}${fmtLeftS(f.left)}${c.state === "delayed" ? ` <em>+${c.delay}h</em>` : ""}` : "<b>NO FERRY</b>";
  const mail = GS.mail.length ? `<b>MAIL ${mailCount()}</b> ${fmtCash(mailValue() * payMul())}` : `<b>MAIL</b> empty`;
  const cls = !r ? "" : r.lose ? "bad" : r.fine ? "late" : "";
  const k = fer + mail + cls + (f.left !== null && f.left < MAIL.warnAt && GS.mail.length);
  if (k === MAILHUD.k) return; MAILHUD.k = k;
  const el = $("mailBar"); if (!el) return;
  el.innerHTML = `<span>${fer}</span><span>${mail}</span>`; el.className = cls + (f.left !== null && f.left < MAIL.warnAt && GS.mail.length ? " soon" : "");
}
const steamerIn = () => steamerAt(GS.hour).s === "in";
// a boat backhaul from `site` makes the first sailing it reasonably can
function boatDue(site) { const est = jobGeom(depot, site).est * 1.25 / GAMEHOUR; return steamerNext(GS.hour + est, "dep"); }
const STEAMER_CARGO = [
  ["Post sacks off the ferry", 0.9, false], ["Crate of oranges from Tromsø", 1.0, true], ["Pharmacy crate off the boat", 1.3, true],
  ["Outboard motor parts", 1.1, false], ["The Finnmarken and the post", 0.85, false], ["Boxed radio set from Hammerfest", 1.2, true],
  ["Coffee, flour and sugar for the shop", 0.95, false], ["Spare net floats & line", 0.9, false], ["Mail-order parcel from Oslo", 1.05, false]
];
function steamerJob(from) {
  const homes = SITES.filter(s => s.type === "home" && Math.hypot(s.x - from.x, s.z - from.z) < 1000);
  const far = SITES.filter(s => s.type !== "depot" && s.type !== "shop" && s.type !== "home" && s.type !== "relay");
  const d = GS.delivered < 3 || !far.length ? pick(homes) : pick(far), cg = pick(STEAMER_CARGO);
  const { dist, climb, est } = jobGeom(d, from), local = d.type === "home";
  const pay = Math.round(((local ? 30 : 35) + dist * 0.12 + climb * (local ? 0.25 : 0.5)) * cg[1] * 1.4 / 5) * 5;
  return { dest: d, cargo: cg[0], fragile: cg[2], pay, local, steamer: true, due: GS.hour + est * 1.8 / GAMEHOUR };
}
// put the steamer's freight on the board: it takes the last slot (the board holds three parcels)
function postSteamerFreight() {
  if (!GS.jobs || GS.jobs.some(j => j.steamer)) return false;
  const j = steamerJob(depot);
  if (GS.jobs.some(x => x.dest === j.dest && x.cargo === j.cargo)) return false;
  if (roaming()) { j.from = depot; GS.jobs.unshift(j); if (GS.jobs.length > 6) GS.jobs.pop(); }
  else if (GS.jobs.length >= 3) GS.jobs.splice(GS.jobs.length - 1, 1, j); else GS.jobs.push(j);
  return true;
}
function steamerHorn(long = true) {
  if (!audio) return;
  const { AC, master } = audio, t = AC.currentTime, d = Math.hypot(P.x - (steamer ? steamer.position.x : depot.x), P.z - (steamer ? steamer.position.z : depot.z));
  const v = 0.35 * clamp(1 - d / 2600, 0.08, 1), blasts = long ? [[0, 2.6]] : [[0, 0.9], [1.3, 0.9]];
  for (const [t0, len] of blasts) for (const [f, w] of [[98, 1], [147, 0.6], [196, 0.3]]) {
    const o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter(), s = t + t0;
    o.type = "sawtooth"; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = 520;
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v * w, s + 0.25); g.gain.setValueAtTime(v * w, s + len - 0.6); g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    o.connect(lp); lp.connect(g); g.connect(master); o.start(s); o.stop(s + len + 0.1);
  }
}
const callName = c => `${c.dir} ferry`, _fv = new THREE.Vector3();
function updSteamer(dt = 0) {
  const st = steamerAt(GS.hour);
  if (steamer && steamer.userData.head) {
    const u = steamer.userData, ease = x => x * x * (3 - 2 * x), turn = (a, b, k) => a + (((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k;
    let off = 0, a = u.a;
    if (st.s === "leaving") { off = st.p * st.p; a = turn(u.a, u.headA, ease(clamp(st.p / 0.3, 0, 1))); }
    else if (st.s === "arriving") { const q = 1 - st.p; off = q * q; a = turn(u.headA + Math.PI, u.a, ease(clamp((st.p - 0.7) / 0.3, 0, 1))); }
    steamer.visible = st.s !== "away";
    steamer.position.set(u.x + u.hx * u.L * off, SEA, u.z + u.hz * u.L * off); steamer.rotation.y = a;
    const solid = st.s === "in";
    if (u.solid !== solid) { u.solid = solid; for (const o of u.obs) o.top = solid ? 1e9 : -Infinity; }
    // lights: nav lights and the masthead show from anywhere at night; the deck floods only while she's alongside
    const night = 1 - dayFactor(), dist = Math.hypot(P.x - steamer.position.x, P.z - steamer.position.z);
    if (u.nav) for (const m of u.nav) m.material.opacity = clamp(0.25 + night, 0, 1) * (st.s === "away" ? 0 : 1);
    if (u.wake) { u.wake.visible = st.s === "arriving" || st.s === "leaving"; u.wake.material.opacity = 0.5 * Math.min(1, (st.s === "leaving" ? st.p : 1 - st.p) * 3); }
    // a smudge of exhaust off the funnel while you're near enough to see it
    u.smT = (u.smT || 0) + dt;
    if (st.s !== "away" && dist < 1600 && u.smT > (solid ? 0.5 : 0.2)) { u.smT = 0; const f = u.funnel.getWorldPosition(_fv); emit(f.x, f.y + 2, f.z, windU.uWind.value.x * 1.2, 2, windU.uWind.value.y * 1.2, 0.8, 6); }
  }
  const prev = STEAMER.state; STEAMER.state = st.s; STEAMER.call = st.c;
  if (prev === null || !started) return;
  // the day's notices: a delay or a cancellation is posted at the quay six hours ahead
  STEAMER.noteT = (STEAMER.noteT || 0) + dt;
  if (STEAMER.noteT > 1) {
    STEAMER.noteT = 0;
    for (const c of steamerCalls(GS.hour, GS.hour + 6, true)) {
      if (c.told || c.state === "on time" || GS.hour < c.sArr - 6 || GS.hour > c.sArr) continue;
      c.told = true;
      TABLET.notify({ app: "map", kind: c.state === "cancelled" ? "alert" : "warn", ttl: 9,
        title: c.state === "cancelled" ? `Ferry cancelled · ${c.dir} ${fmtTime(c.sArr)}` : `Ferry delayed +${c.delay} h · ${c.dir}`,
        body: c.state === "cancelled" ? `Weather. No call at Kjøllefjord, so no sailing at ${fmtTime(c.sDep)}. Mail waits for the next one, no miss counted.` : `Alongside about ${fmtTime(c.arr)} instead of ${fmtTime(c.sArr)}, sails ${fmtTime(c.dep)}.` });
    }
  }
  if (st.s === "in" && !st.c.horned && GS.hour >= st.c.dep - STEAMER.horn) { st.c.horned = true; steamerHorn(true); }
  if (prev !== "in" && st.s === "in") {
    steamerHorn(false);
    const posted = postSteamerFreight(); if (posted) { TABLET.refresh(); TABLET.notify({ app: "parcels", title: "Freight off the ferry", body: "A parcel off the boat is posted in Parcels. Pickup at the quay.", ttl: 7 }); }
    toast(`The ${callName(st.c)} is alongside at Kjøllefjord until ${fmtTime(st.c.dep)}.${posted ? " Fresh freight in Parcels." : ""}`);
  }
  if (prev === "in" && st.s !== "in") {
    steamerHorn(false);
    const n = GS.jobs ? GS.jobs.filter(j => j.steamer).length : 0;
    if (n) { GS.jobs = GS.jobs.filter(j => !j.steamer); GS.claims = GS.claims.filter(j => !j.steamer); TABLET.refresh(); }
    const missed = GS.load.filter(j => j.boat && GS.hour > j.due).length;
    toast(`The ferry's cast off.${missed ? " Your load for the boat missed her: it goes on the next one, at half pay." : n ? " Her freight went into the shed." : ""}`, missed ? "warn" : undefined);
  }
  if (prev === "away" && st.s === "arriving" && (GS.load.some(j => j.boat) || (typeof mailCount === "function" && mailCount()))) toast(`The ferry's coming up the fjord. She sails at ${fmtTime(st.c.dep)}.`);
}
// walk out from the depot until the water starts: that is where the pier goes. The pier is pressed
// into the height field so the sled can actually ride out along it (and off the end, if you insist).
function placeQuay() {
  let qa = 0, qd = 1e9;
  for (let k = 0; k < 72; k++) {
    const a = k / 72 * Math.PI * 2;
    for (let r = 20; r < 700; r += 4) if (isSea(depot.x + Math.cos(a) * r, depot.z + Math.sin(a) * r)) { if (r < qd) { qd = r; qa = a; } break; }
  }
  if (qd === 1e9) return;
  const dirx = Math.cos(qa), dirz = Math.sin(qa);
  const qx = depot.x + dirx * (qd - 6), qz = depot.z + dirz * (qd - 6), qy = Math.max(groundAt(qx, qz), SEA + 1.4);
  QUAY = { qx, qz, qa, qy };
  const R = 40;
  for (let j = Math.floor((qz - R + HALF) / GRES); j <= Math.ceil((qz + R + HALF) / GRES); j++) for (let i = Math.floor((qx - R + HALF) / GRES); i <= Math.ceil((qx + R + HALF) / GRES); i++) {
    if (i < 0 || j < 0 || i >= GN || j >= GN) continue;
    const x = i * GRES - HALF, z = j * GRES - HALF, dx = x - qx, dz = z - qz;
    const u = dx * dirx + dz * dirz, v = -dx * dirz + dz * dirx;                  // u: out toward the water, v: along the shore
    if (u < -6 || u > 21 || Math.abs(v) > 30.5) continue;
    const k = j * GN + i; ground[k] = qy; bio[k] = 0; freshG[k] = 0.16;
  }
}
function buildTown() {
  const { bx, put, house, lamp, hjell, L, snowM, metal, woodD, wood, red, white, concrete, hull, glowM } = KIT;
  const d0 = depot;
  // the garage: a long service shed with a roll door and a sign out front
  const gx = garageSite.x - 12, gz = garageSite.z;
  const gg = new THREE.Group(); gg.position.set(gx, groundAt(gx, gz) - 0.25, gz); scene.add(gg);
  bx(gg, 11, 4.2, 8, L(0x4a5058), 0, 2.1, 0);
  bx(gg, 11.6, 0.5, 8.6, snowM, 0, 4.35, 0);
  bx(gg, 11.6, 0.3, 1.2, metal, 0, 4.0, 0);
  bx(gg, 0.2, 3.2, 4.4, L(0x25313c), 5.5, 1.6, 0.4);            // roll door
  for (let i = 0; i < 6; i++) bx(gg, 0.24, 0.12, 4.4, metal, 5.55, 0.5 + i * 0.55, 0.4);
  bx(gg, 0.12, 1.1, 2.4, glowM, 5.48, 2.6, -2.6);               // lit service window
  bx(gg, 0.12, 1.1, 2.4, glowM, -5.48, 2.6, 0.6);
  bx(gg, 0.3, 2.6, 0.3, woodD, 7.4, 1.3, -3.2);                 // sign post
  bx(gg, 0.16, 1.5, 3.4, L(0xd8d2c4), 7.4, 3.2, -3.2);
  bx(gg, 0.06, 0.34, 2.6, red, 7.3, 3.4, -3.2);
  bx(gg, 0.06, 0.2, 2.2, L(0x1c2b3a), 7.3, 2.9, -3.2);
  for (let u = -4.5; u <= 4.5; u += 2.2) for (let v = -3; v <= 3; v += 2.2) addOb({ x: gx + u, z: gz + v, r: 1.5, top: 1e9 });
  bx(gg, 1.0, 0.8, 1.0, wood, -4.2, 0.4, 4.6); bx(gg, 0.9, 0.7, 0.9, wood, -2.8, 0.35, 4.8);
  put(gg, new THREE.TorusGeometry(0.85, 0.16, 8, 18), L(0x14181d), 3.4, 1.0, 4.6).rotation.set(0.25, 0.4, 0);

  // houses along the shore road, painted the way they are up here
  const lots = [
    [46, 26, 9, 7, 3.0, 0.2, red], [46, -12, 8, 6, 2.8, -0.15, white],
    [18, 40, 8, 7, 2.9, 1.5, KIT.yellow], [-16, 44, 9, 6, 3.0, 1.6, L(0x5a4b3c)],
    [-40, 20, 10, 7, 3.2, -1.5, red], [-38, -16, 8, 6, 2.8, -1.4, white],
    [10, -42, 9, 7, 3.0, 3.0, KIT.blue], [-20, -40, 8, 6, 2.9, 2.9, wood],
    [70, 8, 8, 6, 2.8, 0.4, white], [-66, 4, 9, 6, 3.0, -0.3, KIT.yellow], [30, 66, 8, 6, 2.8, 1.2, red], [-8, 70, 9, 7, 3.1, 1.7, white]
  ];
  for (const [ox, oz, w, d, h, r, mat] of lots) { const hx = d0.x + ox, hz = d0.z + oz; if (!isSea(hx, hz)) house(hx, hz, w, d, h, r, mat); }
  // the general store with a porch and a sign
  const st = house(d0.x + 24, d0.z - 34, 10, 8, 3.4, 0.1, L(0x7a5a3a));
  bx(st, 10, 0.3, 2.4, woodD, 0, 3.5, 4.6); bx(st, 0.2, 1.1, 5, L(0xe8e2d4), 0, 4.3, 0.2);
  bx(st, 0.1, 0.3, 3.6, KIT.green, -0.12, 4.3, 0.2);
  // the church: white timber, a tower with a spire
  const cx = d0.x - 58, cz = d0.z + 46;
  if (!isSea(cx, cz)) {
    const ch = house(cx, cz, 9, 16, 5, -0.4, white);
    bx(ch, 4, 9, 4, white, 0, 4.5, 6.5);
    bx(ch, 4.4, 0.3, 4.4, snowM, 0, 9.1, 6.5);
    put(ch, new THREE.ConeGeometry(2.6, 6, 4), L(0x2f3a44), 0, 12.1, 6.5).rotation.y = Math.PI / 4;
    bx(ch, 0.12, 1.2, 0.12, metal, 0, 15.6, 6.5); bx(ch, 0.7, 0.12, 0.12, metal, 0, 15.4, 6.5);
    for (const zz of [-4, 0, 4]) for (const sd of [-1, 1]) bx(ch, 0.08, 1.6, 0.9, glowM, sd * 4.55, 2.4, zz);
  }
  for (const lx of [-40, -14, 14, 40]) { lamp(d0.x + lx, d0.z + 14); lamp(d0.x + lx, d0.z - 20); }
  // firewood, fuel drums, a plough pile of snow
  for (let i = 0; i < 5; i++) {
    const wx = d0.x + 30 + i * 0.5, wz = d0.z + 6 + i * 0.4;
    const g = new THREE.Group(); g.position.set(wx, groundAt(wx, wz), wz); scene.add(g);
    for (let k = 0; k < 4; k++) put(g, new THREE.CylinderGeometry(0.16, 0.16, 1.6, 7), woodD, 0, 0.16 + k * 0.3, 0).rotation.z = Math.PI / 2;
    addOb({ x: wx, z: wz, r: 0.9, top: 1e9 });
  }
  for (const [dx, dz] of [[-8, -26], [-7.2, -26.6], [-8.4, -27]]) {
    const wx = d0.x + dx, wz = d0.z + dz;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.1, 12), L(0xb8432c));
    m.position.set(wx, groundAt(wx, wz) + 0.5, wz); m.castShadow = true; scene.add(m);
    addOb({ x: wx, z: wz, r: 0.5, top: 1e9 });
  }

  // the quay, where the freight comes ashore
  if (QUAY) {
    const { qx, qz, qa, qy } = QUAY, dirx = Math.cos(qa), dirz = Math.sin(qa), ax = -dirz, az = dirx;       // dir: toward the water; ax/az: along the shore
    const Q = new THREE.Group(); Q.position.set(qx, 0, qz); Q.rotation.y = -qa; scene.add(Q);
    bx(Q, 26, 2.2, 60, concrete, 8, qy - 1.1, 0);                                // the pier slab, sticking out over the water
    bx(Q, 26.4, 0.25, 60.4, snowM, 8, qy + 0.1, 0);
    for (let v = -26; v <= 26; v += 8) { put(Q, new THREE.CylinderGeometry(0.28, 0.32, 1.1, 8), L(0x2b2f33), 20, qy + 0.55, v); }
    bx(Q, 9, 3.6, 14, L(0x8d3b2f), 2, qy + 1.8, -20);                            // the freight shed on the pier
    bx(Q, 9.4, 0.4, 14.4, snowM, 2, qy + 3.8, -20);
    bx(Q, 0.1, 2.4, 3.2, L(0x25313c), 6.55, qy + 1.2, -20);
    put(Q, new THREE.CylinderGeometry(0.12, 0.14, 7, 8), metal, 12, qy + 3.5, 14);   // a crane
    bx(Q, 0.2, 0.2, 9, metal, 12, qy + 6.9, 18.4);
    for (let u = -4; u <= 20; u += 4) for (let v = -29; v <= 29; v += 4) {
      const wx = qx + u * Math.cos(-qa) + v * Math.sin(-qa), wz = qz - u * Math.sin(-qa) + v * Math.cos(-qa);
      if (u > 14 || Math.abs(v + 20) < 8 && u < 7) addOb({ x: wx, z: wz, r: 2.2, top: u > 14 ? qy + 0.4 : 1e9 });
    }
    // the coastal ferry, alongside: black hull with a red boot-top, white decks in tiers, the bridge, a black-and-red
    // funnel, orange lifeboats. Nav lights and the masthead are fog-free sprites so you see her in the fjord at night.
    const S = new THREE.Group(); S.position.set(qx + dirx * 30, SEA, qz + dirz * 30); S.rotation.y = -qa; scene.add(S); steamer = S;
    const bootM = L(0x8c2a22), winM = L(0x1d2a36), orange = L(0xe0742a);
    bx(S, 14, 6, 88, hull, 0, 1.5, 0);
    bx(S, 14.1, 0.9, 88.1, bootM, 0, -1.0, 0);
    put(S, new THREE.CylinderGeometry(7, 7, 6, 3, 1, false, 0, Math.PI), hull, 0, 1.5, 44).rotation.set(Math.PI / 2, 0, 0);
    put(S, new THREE.CylinderGeometry(7.05, 7.05, 0.9, 3, 1, false, 0, Math.PI), bootM, 0, -1.0, 44).rotation.set(Math.PI / 2, 0, 0);
    bx(S, 14.2, 0.35, 88.2, white, 0, 4.4, 0);                                   // the white rubbing strake
    bx(S, 13.4, 0.5, 86, L(0xd9d5cc), 0, 4.7, 0);
    bx(S, 12.4, 3.2, 52, white, 0, 6.5, -4);
    bx(S, 10.8, 3.0, 36, white, 0, 9.6, -2);
    bx(S, 8.6, 2.8, 14, white, 0, 12.5, 8);
    bx(S, 10.2, 1.0, 3.2, winM, 0, 12.8, 15.1);                                  // the bridge front, dark glass
    bx(S, 12.6, 0.4, 4, white, 0, 11.3, 15.4);                                   // bridge wings
    const fun = put(S, new THREE.CylinderGeometry(1.6, 1.9, 5, 12), hull, 0, 14.5, -8);
    put(S, new THREE.CylinderGeometry(1.66, 1.7, 1.4, 12), red, 0, 14.6, -8);
    put(S, new THREE.CylinderGeometry(1.7, 1.7, 1.2, 12), hull, 0, 17.0, -8);
    for (let v = -26; v <= 20; v += 3.2) for (const sd of [-1, 1]) bx(S, 0.1, 0.9, 1.6, glowM, sd * 6.25, 6.6, v);
    for (let v = -18; v <= 14; v += 3.2) for (const sd of [-1, 1]) bx(S, 0.1, 0.9, 1.6, glowM, sd * 5.45, 9.7, v);
    for (let v = -28; v <= 24; v += 2.2) for (const sd of [-1, 1]) bx(S, 0.1, 0.5, 0.7, glowM, sd * 7.05, 2.8, v);   // portholes
    for (const v of [-20, -12, 4, 12]) for (const sd of [-1, 1]) { const b = bx(S, 1.6, 1.1, 5.2, orange, sd * 6.0, 9.0, v); b.castShadow = false; }   // lifeboats
    bx(S, 0.14, 8, 0.14, metal, 0, 18, 14); bx(S, 3, 0.1, 0.1, metal, 0, 21, 14);
    bx(S, 0.12, 6, 0.12, metal, 0, 9, 40); bx(S, 0.12, 4, 0.12, metal, 0, 9, -42);
    for (const sd of [-1, 1]) bx(S, 3.2, 0.6, 2.6, metal, sd * 3.5, 5.4, 34);   // the cargo hatch and crane on the foredeck
    const navTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, "#fff"); r.addColorStop(0.25, "rgba(255,255,255,.85)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
    const nav = [];
    for (const [col, x, y, z, sc] of [[0xff3a2a, 7.3, 12.2, 15, 0.016], [0x3aff6a, -7.3, 12.2, 15, 0.016], [0xfff6e0, 0, 22.2, 14, 0.018], [0xfff6e0, 0, 12.2, 40, 0.013], [0xfff6e0, 0, 11.2, -42, 0.013]]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: navTex, color: col, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, sizeAttenuation: false }));
      sp.scale.set(sc, sc, 1); sp.position.set(x, y, z); S.add(sp); nav.push(sp);
    }
    const wake = new THREE.Mesh(new THREE.PlaneGeometry(16, 120), new THREE.MeshBasicMaterial({ color: 0xe8f0f6, transparent: true, opacity: 0.4, depthWrite: false }));
    wake.rotation.x = -Math.PI / 2; wake.position.set(0, 0.15, -100); wake.visible = false; S.add(wake);
    S.userData = { x: qx + dirx * 30, z: qz + dirz * 30, a: -qa, obs: [], solid: true, nav, wake, funnel: fun };
    for (let u = -6; u <= 6; u += 3) for (let v = -44; v <= 44; v += 3) {
      const wx = S.userData.x + u * Math.cos(-qa) + v * Math.sin(-qa), wz = S.userData.z - u * Math.sin(-qa) + v * Math.cos(-qa);
      const o = { x: wx, z: wz, r: 2.0, top: 1e9, ship: true }; addOb(o); S.userData.obs.push(o);
    }
    // the way out to the open sea: the heading with the longest run of open water
    { const U = S.userData; let best = 0, bh = 0;
      for (let k = 0; k < 72; k++) {
        const h = k / 72 * Math.PI * 2, hx = Math.sin(h), hz = Math.cos(h); let r = 60;
        for (; r < 2600; r += 25) { const x = U.x + hx * r, z = U.z + hz * r; if (!isSea(x, z) || !isSea(x + hz * 14, z - hx * 14) || !isSea(x - hz * 14, z + hx * 14)) break; }
        if (r > best) { best = r; bh = h; }
      }
      if (best > 300) { U.headA = bh; U.hx = Math.sin(bh); U.hz = Math.cos(bh); U.L = Math.min(best - 120, 2400); U.head = true; } }
    // fish racks along the shore either side of the pier
    for (const sd of [-1, 1]) { const rx = qx - dirx * 18 + ax * sd * 48, rz = qz - dirz * 18 + az * sd * 48; if (!isSea(rx, rz) && !isSea(rx + dirx * 6, rz + dirz * 6)) hjell(rx, rz, 14, -qa + Math.PI / 2); }
    lamp(qx - dirx * 4 + ax * 12, qz - dirz * 4 + az * 12); lamp(qx - dirx * 4 - ax * 12, qz - dirz * 4 - az * 12);
  }
}

/* ---------------- ice fishing: the tackle shop, the fish buyer, and the bridge to icefish.js ---------------- */
// a painted board with lettering, for the shop fronts
function signTex(t1, t2, bg, fg, w = 512, h = 160) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.globalAlpha = .55; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.globalAlpha = 1;
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `800 ${Math.round(h * .36)}px 'Barlow Semi Condensed', Arial, sans-serif`; g.fillText(t1, w / 2, t2 ? h * .4 : h / 2);
  if (t2) { g.font = `600 ${Math.round(h * .17)}px 'Barlow Semi Condensed', Arial, sans-serif`; g.fillText(t2, w / 2, h * .75); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
}
function obNear(x, z, R) {
  for (let j = Math.floor((z - R + HALF) / OBC); j <= Math.floor((z + R + HALF) / OBC); j++) for (let i = Math.floor((x - R + HALF) / OBC); i <= Math.floor((x + R + HALF) / OBC); i++) {
    const a = obGrid.get(j * OBW + i); if (!a) continue;
    for (const o of a) if (Math.hypot(o.x - x, o.z - z) < R + (o.r || 0)) return true;
  }
  return false;
}
// Nordkinn Fisk & Friluft: a small painted-timber tackle shop on the shore road by the quay, and the fiskemottak
// (the fish buyer) on the pier. Both open with E (pad L3, touch SHOP / SELL) when you stop by them, on the sled or on foot.
function buildFishShops() {
  const { bx, put, L, snowM, woodD, metal, glowM, white } = KIT, d0 = depot;
  const qa = QUAY ? QUAY.qa : Math.PI, dirx = Math.cos(qa), dirz = Math.sin(qa), ax = -dirz, az = dirx;
  let best = null, bs = 1e9;
  for (const along of [-28, 28, -36, 36, -20, 20, -46, 46, -58, 58]) for (const out of [8, 0, 16, -8, 24, -16]) {
    const x = d0.x + dirx * out + ax * along, z = d0.z + dirz * out + az * along;
    if ([[0, 0], [9, 0], [-9, 0], [0, 9], [0, -9]].some(([a, b]) => isSea(x + a, z + b))) continue;
    if (slopeAt(x, z, 5) > 0.2 || obNear(x, z, 9) || Math.hypot(x - d0.x, z - d0.z) < 30 || Math.hypot(x - garageSite.x, z - garageSite.z) < 24) continue;
    const sc = Math.abs(along) * 1.0 + Math.abs(out - 6) * 0.7; if (sc < bs) { bs = sc; best = [x, z]; }
  }
  if (best) {
    const [x, z] = best, ry = Math.atan2(d0.x - x, d0.z - z);            // the door faces the quay road
    const g = KIT.house(x, z, 7.5, 6, 3.0, ry, L(0x8a2f22));
    bx(g, 7.9, 0.12, 1.8, woodD, 0, 2.55, 3.85); bx(g, 8.1, 0.2, 2.0, snowM, 0, 2.7, 3.9);           // porch roof
    for (const sx of [-3.6, 3.6]) bx(g, 0.14, 2.55, 0.14, woodD, sx, 1.27, 4.7);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshBasicMaterial({ map: signTex("FISK & FRILUFT", "NORDKINN · TACKLE · BAIT · AUGERS", "#efe7d6", "#7a2418") }));
    sign.position.set(0, 3.45, 3.02); g.add(sign);
    for (let i = 0; i < 5; i++) { const r = put(g, new THREE.CylinderGeometry(0.012, 0.02, 0.75, 5), L(i % 2 ? 0x1a1d20 : 0x3e5a2c), 2.6 + i * 0.13, 0.45, 3.35); r.rotation.x = -0.18; }   // ice rods by the door
    const aug = new THREE.Group(); aug.position.set(-2.8, 0, 3.6); aug.rotation.z = 0.12; g.add(aug);
    put(aug, new THREE.CylinderGeometry(0.03, 0.03, 1.3, 8), metal, 0, 0.55, 0); put(aug, new THREE.BoxGeometry(0.3, 0.22, 0.26), L(0xc23a22), 0, 1.25, 0);
    put(aug, new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), metal, 0, 1.3, 0.16).rotation.z = Math.PI / 2;
    const pulk = bx(g, 0.7, 0.28, 1.6, L(0x2b6d8f), -1.6, 0.16, 4.1); pulk.rotation.y = 0.3;               // an ice-fishing pulk
    bx(g, 0.72, 0.06, 1.62, snowM, -1.6, 0.33, 4.1).rotation.y = 0.3;
    // the flag on its pole
    const fx = 4.6, fz = 3.4; put(g, new THREE.CylinderGeometry(0.05, 0.06, 7, 8), white, fx, 3.5, fz);
    const fc = document.createElement("canvas"); fc.width = 110; fc.height = 80; const fg = fc.getContext("2d");
    fg.fillStyle = "#ba0c2f"; fg.fillRect(0, 0, 110, 80); fg.fillStyle = "#fff"; fg.fillRect(30, 0, 20, 80); fg.fillRect(0, 30, 110, 20); fg.fillStyle = "#00205b"; fg.fillRect(35, 0, 10, 80); fg.fillRect(0, 35, 110, 10);
    const ft = new THREE.CanvasTexture(fc); ft.encoding = THREE.sRGBEncoding;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1, 6, 1), new THREE.MeshLambertMaterial({ map: ft, side: THREE.DoubleSide })); flag.position.set(fx + 0.78, 6.4, fz); g.add(flag);
    const dx = Math.sin(ry), dz = Math.cos(ry);
    FISHSITES.shop = { x: x + dx * 7, z: z + dz * 7, name: "Nordkinn Fisk & Friluft" };
  }
  if (QUAY) {
    // the fish buyer's shed on the pier: white boards, a blue door, a scale and a stack of fish boxes
    const { qx, qz, qy } = QUAY, Q = new THREE.Group(); Q.position.set(qx, 0, qz); Q.rotation.y = -qa; scene.add(Q);
    const u0 = 1, v0 = 13;
    bx(Q, 5, 2.8, 6.4, white, u0, qy + 1.4, v0); bx(Q, 5.4, 0.3, 6.8, snowM, u0, qy + 2.95, v0);
    bx(Q, 0.1, 2.0, 1.2, L(0x2d4f74), u0 + 2.55, qy + 1.0, v0 - 1.6); bx(Q, 0.1, 0.9, 1.6, glowM, u0 + 2.55, qy + 1.7, v0 + 1.4);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.95), new THREE.MeshBasicMaterial({ map: signTex("FISKEMOTTAK", "FISH BOUGHT · FERSK FISK", "#1f3f5f", "#f2efe6") }));
    sg.position.set(u0 + 2.62, qy + 3.4, v0); sg.rotation.y = Math.PI / 2; Q.add(sg);
    for (let i = 0; i < 6; i++) bx(Q, 0.9, 0.32, 0.6, L(i % 3 === 1 ? 0xe07a28 : 0x2b6fa8), u0 + 3.6 + (i % 2) * 0.95, qy + 0.16 + Math.floor(i / 2) * 0.33, v0 + 2.6);
    put(Q, new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), metal, u0 + 3.4, qy + 0.6, v0 - 3.0); bx(Q, 0.6, 0.06, 0.6, metal, u0 + 3.4, qy + 1.22, v0 - 3.0);
    const w = (u, v) => [qx + u * Math.cos(-qa) + v * Math.sin(-qa), qz - u * Math.sin(-qa) + v * Math.cos(-qa)];
    for (let u = -1; u <= 3; u += 2) for (let v = v0 - 2.5; v <= v0 + 2.5; v += 2.5) { const [ox, oz] = w(u0 + u - 1, v); addOb({ x: ox, z: oz, r: 1.4, top: 1e9 }); }
    const [ox, oz] = w(u0 + 4, v0 + 2.6); addOb({ x: ox, z: oz, r: 0.9, top: 1e9 });
    const [bx0, bz0] = w(u0 + 7, v0); FISHSITES.buyer = { x: bx0, z: bz0, name: "Fiskemottak" };
  }
}
function initFishing() {
  if (!window.TLFish || !window.TLFish.init) return;
  FISH = window.TLFish.init({
    THREE, scene, renderer, camera, P, GS, CAL, keys, FOOT, TABLET, GFX, LAKES, SITES, depot, hemi, sun, sunDir,
    mats: { jacket: jacketMat, pants: pantsMat, trim: riderTrimMat, helmet: M.helmet, visor: M.visor, glove: M.glove, boot: M.boot },
    fishSites: FISHSITES, toast, save, wear: (o, a, s, opt) => WEAR.apply(o, a, s, opt), surf, groundAt, bioAt, isSea, isWater, iceThin, fbm, dayFactor, payMul, bumpDelivered, mailVisit,
    started: () => started, busy: () => SCHOOL.on, touch: () => TC.on, showroom: showroomOn, settings: () => gameKey({ code: "Escape" }),
    onStart() { camState.init = false; TABLET.close(true); toggleBigMap(false); },
    onStop() { camState.init = false; camState.yaw = P.yaw; }
  });
  // the spring melt (O7) thins every lake's ice as it goes: the drill sees it too
  if (FISH) window.TLFish.ice.melt = (lake, date, cm) => MELT.kq > 0 ? Math.round(cm * (1 - 0.7 * MELT.kq)) : cm;
}

/* ---------------- the town dog ---------------- */
/* A scruffy spitz who lives by the quay. Come within ~25 m and it runs alongside you, barking, as far as the town
   sign at the edge of Kjøllefjord, where it gives up, sits, watches you leave and trots home.
   It is scenery, never a hazard: it has no obstacle in the physics (the sled can't hit it or be held up by it), it
   sidesteps out of your way, and it is deaf to the horn: nothing in here listens for one. */
const TOWN_R = 108;                                    // the town limit, metres from the depot: the last houses are ~75 m out
const SIGNS = [];
const DOG = {
  g: null, rig: null, head: null, jaw: null, tail: null, legs: null,
  x: 0, z: 0, y: 0, yaw: 0, vx: 0, vz: 0, pitch: 0, home: { x: 0, z: 0 }, state: "idle", t: 0,
  act: "stand", actT: 2, tgt: null, faceY: 0, stop: null, side: 1, keepSide: 1, armed: true, watchT: 0, sit: 0, sniff: 0, hop: 0, u: 0,
  bark: 0, burst: 0, burstT: 0, nextBark: 0, lastVi: 0, farewell: 0, probe: 0, sideT: 0, stall: 0, px: 0, pz: 0, stuck: 0, jit: 0, jx: 0, jz: 0, placed: false
};
const dAng = (a, b) => ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
// a solid obstacle (building, tree, post, boulder) within r of a point, or null
function solidNear(x, z, r) {
  const gx = Math.floor((x + HALF) / OBC), gz = Math.floor((z + HALF) / OBC);
  for (let j = gz - 1; j <= gz + 1; j++) for (let i = gx - 1; i <= gx + 1; i++) {
    const a = obGrid.get(j * OBW + i); if (!a) continue;
    for (const o of a) if (o.top > 1e8 && Math.hypot(x - o.x, z - o.z) < r + o.r) return o;
  }
  return null;
}
const dogLand = (x, z) => !isSea(x, z) && groundAt(x, z) > SEA + 0.1;

/* the town sign: white timber board on two posts, one face for people coming in and one for people leaving */
function signTexture(outward) {
  const c = document.createElement("canvas"); c.width = 640; c.height = 256;
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  const F = "'Barlow Semi Condensed','Arial Narrow',sans-serif";
  const paint = () => {
    const g = c.getContext("2d");
    g.fillStyle = "#ece6d8"; g.fillRect(0, 0, 640, 256);
    g.strokeStyle = "#26323b"; g.lineWidth = 10; g.strokeRect(12, 12, 616, 232);
    g.fillStyle = "#1d2830"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = outward ? `600 40px ${F}` : `italic 500 46px ${F}`;
    if (outward) { if ("letterSpacing" in g) g.letterSpacing = "6px"; g.fillText("VELKOMMEN TIL", 320, 72); if ("letterSpacing" in g) g.letterSpacing = "0px"; }
    let px = 118; g.font = `800 ${px}px ${F}`;
    const w = g.measureText("KJØLLEFJORD").width; if (w > 540) { px *= 540 / w; g.font = `800 ${px}px ${F}`; }
    g.fillText("KJØLLEFJORD", 320, outward ? 158 : 112);
    if (!outward) { g.font = `italic 500 46px ${F}`; g.fillText("Gode reiser", 320, 200); }
    tex.needsUpdate = true;
  };
  paint();
  if (document.fonts && document.fonts.load) document.fonts.load(`800 40px 'Barlow Semi Condensed'`).then(paint).catch(() => { });
  return tex;
}
function buildTownSigns() {
  const { put, bx, woodD, snowM, L } = KIT;
  const faceO = new THREE.MeshLambertMaterial({ map: signTexture(true) }), faceI = new THREE.MeshLambertMaterial({ map: signTexture(false) }), edge = L(0x26323b);
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), x = depot.x + ca * TOWN_R, z = depot.z + sa * TOWN_R;
    if (isSea(x, z) || isSea(x + ca * 8, z + sa * 8) || isSea(x - ca * 8, z - sa * 8) || groundAt(x, z) < SEA + 1.2 || slopeAt(x, z, 3) > 0.35 || solidNear(x, z, 4)) continue;
    const g = new THREE.Group(); g.position.set(x, groundAt(x, z) - 0.2, z); g.rotation.y = Math.PI / 2 - a; scene.add(g);   // local +z points out of town
    for (const sx of [-1.1, 1.1]) { put(g, new THREE.CylinderGeometry(0.07, 0.09, 2.9, 7), woodD, sx, 1.45, 0); addOb({ x: x + sx * Math.cos(g.rotation.y), z: z - sx * Math.sin(g.rotation.y), r: 0.3, top: 1e9 }); }
    bx(g, 2.7, 1.14, 0.1, edge, 0, 2.0, 0);
    bx(g, 2.9, 0.13, 0.3, snowM, 0, 2.64, 0);
    const fo = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.0), faceO); fo.position.set(0, 2.0, 0.056); g.add(fo);
    const fi = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.0), faceI); fi.position.set(0, 2.0, -0.056); fi.rotation.y = Math.PI; g.add(fi);
    SIGNS.push({ x, z, a });
  }
}

/* the dog itself: a low-poly Finnish-spitz type, ~45 cm at the shoulder. Cream with a grey saddle, a thick ruff, a plume
   of a tail curled over its back. Faceted fur (flat-shaded icospheres), same lean-realistic build as the sleds. */
function buildDog() {
  const std = (c, r = 0.95) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0, flatShading: true });
  const cream = std(0xd2bc8f), fluff = std(0xe4d6b4), grey = std(0x7f7c78), dark = std(0x15161a, 0.5), paw = std(0xc4ae82), tan = std(0xbfa97c);
  const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
  const add = (par, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; par.add(m); return m; };
  const g = new THREE.Group();
  const rig = new THREE.Group(); rig.position.set(0, 0.30, 0.16); g.add(rig);      // everything above the legs; it pitches back when the dog sits
  const R = (x, y, z) => [x, y - 0.30, z - 0.16];
  add(rig, ico(1), cream, ...R(0, 0.34, -0.04), 0.19, 0.19, 0.34);                // torso
  add(rig, ico(1), grey, ...R(0, 0.405, -0.09), 0.2, 0.125, 0.28);                  // the grey saddle
  add(rig, ico(1), fluff, ...R(0, 0.36, 0.2), 0.17, 0.2, 0.17);                      // chest ruff
  add(rig, ico(1), cream, ...R(0, 0.33, -0.3), 0.18, 0.17, 0.17);                    // fluffy rump
  const head = new THREE.Group(); head.position.set(...R(0, 0.47, 0.38)); rig.add(head);
  add(head, ico(0.1), cream, 0, 0, 0, 1, 0.92, 1.05);                                // skull
  add(head, ico(0.08), fluff, 0, -0.04, -0.01, 1.2, 0.8, 0.9);                       // cheek fluff
  const muz = add(head, new THREE.ConeGeometry(0.05, 0.17, 6), tan, 0, -0.015, 0.13); muz.rotation.x = Math.PI / 2;
  add(head, ico(0.022, 0), dark, 0, -0.012, 0.212);                                   // nose
  for (const s of [-1, 1]) {
    const ear = add(head, new THREE.ConeGeometry(0.04, 0.12, 4), cream, s * 0.057, 0.105, -0.015); ear.rotation.z = -s * 0.16;
    add(head, ico(0.011, 0), dark, s * 0.045, 0.025, 0.088);                         // eyes
  }
  const jaw = new THREE.Group(); jaw.position.set(0, -0.045, 0.07); head.add(jaw);   // opens when it barks
  add(jaw, new THREE.BoxGeometry(0.06, 0.02, 0.1), fluff, 0, -0.004, 0.05);
  const tail = new THREE.Group(); tail.position.set(...R(0, 0.45, -0.38)); rig.add(tail);
  const curl = add(tail, new THREE.TorusGeometry(0.095, 0.05, 5, 9, Math.PI * 1.15), cream, 0, 0, 0.095); curl.rotation.y = Math.PI / 2;
  add(tail, ico(0.09), fluff, 0, 0.115, 0.1, 0.8, 0.95, 1.5);                        // the plume
  const legs = [];
  for (const [x, z, rear] of [[-0.09, 0.2, false], [0.09, 0.2, false], [-0.1, -0.24, true], [0.1, -0.24, true]]) {
    const lg = new THREE.Group(); lg.position.set(x, 0.30, z); g.add(lg);
    add(lg, new THREE.CylinderGeometry(0.036, 0.027, 0.28, 6), cream, 0, -0.15, 0);
    add(lg, new THREE.BoxGeometry(0.07, 0.04, 0.1), paw, 0, -0.285, 0.016);
    add(lg, ico(0.07, 0), rear ? cream : fluff, 0, rear ? -0.07 : -0.05, rear ? -0.01 : 0.01, 0.8, rear ? 1.5 : 1.2, 1.15);   // trousers / feathering
    legs.push(lg);
  }
  g.visible = false; scene.add(g);
  Object.assign(DOG, { g, rig, head, jaw, tail, legs });
  // home: a patch of open ground just inland of the pier, off the shore road
  const q = QUAY || { qx: depot.x, qz: depot.z, qa: 0 }, dx = Math.cos(q.qa), dz = Math.sin(q.qa);
  const bx0 = q.qx - dx * 10 - dz * 9, bz0 = q.qz - dz * 10 + dx * 9;
  let hx = depot.x, hz = depot.z;
  for (let k = 0; k < 80; k++) {
    const a = k * 2.4, r = Math.sqrt(k) * 2.2, x = bx0 + Math.cos(a) * r, z = bz0 + Math.sin(a) * r;
    if (dogLand(x, z) && groundAt(x, z) > SEA + 0.8 && !solidNear(x, z, 2.5) && slopeAt(x, z, 2) < 0.3 && Math.hypot(x - depot.x, z - depot.z) < TOWN_R - 12) { hx = x; hz = z; break; }
  }
  DOG.home.x = hx; DOG.home.z = hz; dogReset();
}
function dogReset() {
  const D = DOG; D.x = D.home.x; D.z = D.home.z; D.vx = D.vz = 0; D.state = "idle"; D.act = "stand"; D.actT = 1.5; D.tgt = null; D.stop = null;
  D.sit = 0; D.hop = 0; D.u = 0; D.burst = 0; D.bark = 0; D.armed = true; D.placed = false; D.stuck = 0; D.jit = 0;
  D.yaw = Math.atan2(depot.x - D.x, depot.z - D.z); D.faceY = D.yaw;
}

/* barks, synthesised: a sawtooth with a falling pitch through two vocal-tract formants, a rasp of noise on top and a
   touch of drive. Four variants (a sharp yap, a rounder woof, a high yip, a deeper ruff) so it never sounds stamped out. */
const DOG_BARKS = [
  { f0: 880, f1: 520, dur: 0.15, form: [900, 1900], rough: 0.5, gain: 1.0 },
  { f0: 760, f1: 430, dur: 0.19, form: [750, 1500], rough: 0.7, gain: 1.0 },
  { f0: 990, f1: 620, dur: 0.12, form: [1050, 2300], rough: 0.4, gain: 0.8 },
  { f0: 640, f1: 360, dur: 0.24, form: [620, 1300], rough: 0.9, gain: 1.1 }
];
function dogBark(vi, soft) {
  const D = DOG; D.bark = 1;
  if (!audio) return;
  const { AC, master, buf } = audio, b = DOG_BARKS[vi], t = AC.currentTime + 0.005;
  const rx = D.x - P.x, rz = D.z - P.z, d = Math.hypot(rx, rz), fz = Math.cos(P.yaw), fx = Math.sin(P.yaw), left = rx * fz - rz * fx;     // left of the rider is positive
  const vol = 0.4 * clamp(1 - d / 80, 0.1, 1) * b.gain * (soft ? 0.6 : 1) * (0.88 + Math.random() * 0.24);
  const out = AC.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(vol, t + 0.012); out.gain.exponentialRampToValueAtTime(0.0001, t + b.dur * 1.35);
  if (AC.createStereoPanner) { const pn = AC.createStereoPanner(); pn.pan.value = clamp(-left / 14, -0.85, 0.85); out.connect(pn); pn.connect(master); } else out.connect(master);
  const k = 0.94 + Math.random() * 0.12, o = AC.createOscillator(), ws = AC.createWaveShaper(), vg = AC.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(b.f0 * k, t); o.frequency.exponentialRampToValueAtTime(b.f1 * k, t + b.dur);
  ws.curve = distCurve(6); vg.gain.value = 0.9; o.connect(ws);
  [[b.form[0], 1.0], [b.form[1], 0.55]].forEach(([f, w]) => { const bp = AC.createBiquadFilter(), fg = AC.createGain(); bp.type = "bandpass"; bp.frequency.value = f * k; bp.Q.value = 4.5; fg.gain.value = w; ws.connect(bp); bp.connect(fg); fg.connect(vg); });
  vg.connect(out); o.start(t); o.stop(t + b.dur * 1.5);
  const s = AC.createBufferSource(), hp = AC.createBiquadFilter(), ng = AC.createGain();       // the rasp and the breath at the front of it
  s.buffer = buf; hp.type = "highpass"; hp.frequency.value = 1500; ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(b.rough * 0.5, t + 0.008); ng.gain.exponentialRampToValueAtTime(0.0001, t + b.dur * 0.9);
  s.connect(hp); hp.connect(ng); ng.connect(out); s.start(t, Math.random() * 1.5); s.stop(t + b.dur * 1.1);
}

function dogGiveUp() {
  const D = DOG; D.state = "giveup"; D.t = 0; D.armed = false; D.burst = 0;
  let best = null, bd = 34;
  for (const s of SIGNS) { const d = Math.hypot(s.x - D.x, s.z - D.z); if (d < bd) { bd = d; best = s; } }
  D.stop = { x: D.x, z: D.z };
  if (best) {                                          // it settles just inside the sign, off to the side it came from
    const ca = Math.cos(best.a), sa = Math.sin(best.a), tx = -sa, tz = ca, sd = ((D.x - best.x) * tx + (D.z - best.z) * tz) >= 0 ? 1 : -1;
    const sx = best.x - ca * 3 + tx * sd * 2.2, sz = best.z - sa * 3 + tz * sd * 2.2;
    if (dogLand(sx, sz) && !solidNear(sx, sz, 0.5)) D.stop = { x: sx, z: sz };
  }
  D.lastVi = (D.lastVi + 1 + (Math.random() * 3 | 0)) % 4; D.farewell = 0.25;
}
function dogChase() {
  const D = DOG, l = (P.x - D.x) * Math.cos(P.yaw) - (P.z - D.z) * Math.sin(P.yaw);
  D.state = "chase"; D.t = 0; D.burst = 0; D.stall = 0; D.nextBark = 0.12; D.side = l > 0 ? -1 : 1;           // it takes whichever side of the sled it's already on
}

function dogTick(dt) {
  const D = DOG; if (!D.g) return;
  dt = Math.min(dt, 0.05);
  const rx = P.x - D.x, rz = P.z - D.z;
  let ds = Math.hypot(rx, rz);
  if (ds > 420) { if (D.placed) dogReset(); D.g.visible = false; return; }      // nobody about: it's at home and not worth simulating
  D.g.visible = true; D.placed = true; D.t += dt;
  const live = started && !GS.dead, sv = Math.hypot(P.vx, P.vz);
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), lx = fz, lz = -fx, vf = P.vx * fx + P.vz * fz;
  // the keep-clear zone: the sled, plus whatever it's towing, plus the ground it will cover in the next second or so
  const hasRig = !!TOW.kind, rigLen = hasRig ? Math.min(14, Math.hypot(TOW.x - P.x, TOW.z - P.z)) + 2.5 : 0;
  const half = Math.max(1.5, hasRig && TOW.kind === "tiller" ? 1.7 + 1.6 * TOW.wing : 1.5);
  const zBack = -(2.4 + rigLen), zFront = 3.0 + Math.max(0, vf) * 0.9;
  if (ds > 40) D.armed = true;
  if (D.state === "idle" || D.state === "sit" || D.state === "home") { if (live && D.armed && ds < 25) dogChase(); }
  else if (D.state === "chase" && (!live || ds > 150)) dogGiveUp();          // it keeps after you to the edge of town, however fast you go

  let gx = null, gz = null, maxSp = 3.4, faceYaw = null, sitT = 0, sniffT = 0, wag = 0.2, ff = 0;
  switch (D.state) {
    case "idle": {
      D.actT -= dt;
      if (D.actT <= 0) {
        const r = Math.random();
        if (r < 0.34) { D.act = "sit"; D.actT = 5 + Math.random() * 7; D.faceY = D.yaw + (Math.random() - 0.5) * 1.6; }
        else if (r < 0.6) { D.act = "stand"; D.actT = 2.5 + Math.random() * 3.5; D.faceY = D.yaw + (Math.random() - 0.5) * 2.4; }
        else {
          D.act = "mosey"; D.actT = 14; const a = Math.random() * 6.283, rr = 2 + Math.random() * 4.5, tx = D.home.x + Math.cos(a) * rr, tz = D.home.z + Math.sin(a) * rr;
          D.tgt = dogLand(tx, tz) && !solidNear(tx, tz, 0.6) ? { x: tx, z: tz } : null; if (!D.tgt) { D.act = "stand"; D.actT = 2; }
        }
      }
      if (D.act === "sit") { sitT = 1; faceYaw = D.faceY; wag = 0.3; }
      else if (D.act === "stand") { faceYaw = D.faceY; sniffT = Math.sin(D.t * 0.9) > 0.3 ? 1 : 0; wag = 0.3; }
      else if (D.tgt) {
        gx = D.tgt.x; gz = D.tgt.z; maxSp = 1.5; wag = 0.35;
        if (Math.hypot(gx - D.x, gz - D.z) < 0.7) { D.act = "stand"; D.actT = 3; D.tgt = null; }
      }
      break;
    }
    case "chase": {
      const lat = half + 1.6, still = sv < 1.5;
      if (D.sideT > 0) D.sideT -= dt;
      gx = P.x + fx * (still ? -0.2 : 0.5 + sv * 0.1) + lx * D.side * lat; gz = P.z + fz * (still ? -0.2 : 0.5 + sv * 0.1) + lz * D.side * lat;
      if ((!dogLand(gx, gz) || solidNear(gx, gz, 0.4)) && !(D.sideT > 0)) { D.side = -D.side; D.sideT = 1.5; gx = P.x + lx * D.side * lat; gz = P.z + lz * D.side * lat; }
      maxSp = 9.6; ff = 1; wag = 1;
      const dd = Math.hypot(gx - D.x, gz - D.z);
      if (sv > 2 && Math.hypot(D.vx, D.vz) < 1.2 && dd > 6) { if ((D.stall += dt) > 1.2) { dogGiveUp(); break; } } else D.stall = 0;     // boxed in by water or a wall
      if (still && dd < 0.9) { faceYaw = Math.atan2(rx, rz); if (D.t > 1.2) sitT = 1; wag = 0.7; }
      D.nextBark -= dt;                                  // a burst of one to three, every second or two while you're moving; one hello when you're parked
      if (D.nextBark <= 0 && D.burst <= 0) { D.burst = 1 + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < 0.2 ? 1 : 0); D.burstT = 0; D.nextBark = sv > 2.5 ? 1.4 + Math.random() * 1.6 : 12 + Math.random() * 6; D.lastVi = (D.lastVi + 1 + (Math.random() * 3 | 0)) % 4; }
      break;
    }
    case "giveup": {
      gx = D.stop.x; gz = D.stop.z; maxSp = 5.5; wag = 0;
      if ((Math.hypot(gx - D.x, gz - D.z) < 1.0 && Math.hypot(D.vx, D.vz) < 0.9) || D.t > 8) { D.state = "sit"; D.watchT = 0; }
      else if (Math.hypot(gx - D.x, gz - D.z) < 4) faceYaw = Math.atan2(rx, rz);
      break;
    }
    case "sit": {
      sitT = 1; faceYaw = Math.atan2(rx, rz); wag = 0.1; D.watchT += dt;
      if ((D.watchT > 5 && ds > 60) || D.watchT > 14) { D.state = "home"; D.t = 0; D.stuck = 0; }       // it watches until you're out of sight, or it gets bored
      break;
    }
    case "home": {
      gx = D.home.x; gz = D.home.z; maxSp = 3.4; wag = 0.3;
      if (Math.hypot(gx - D.x, gz - D.z) < 1.2) { D.state = "idle"; D.act = "stand"; D.actT = 2.5; D.faceY = D.yaw; }
      break;
    }
  }
  if (D.burst > 0 && live) { D.burstT -= dt; if (D.burstT <= 0) { dogBark(D.lastVi); D.burst--; D.burstT = 0.2 + Math.random() * 0.1; D.lastVi = (D.lastVi + 1 + (Math.random() * 2 | 0)) % 4; } }
  if (D.farewell > 0 && live) { D.farewell -= dt; if (D.farewell <= 0) dogBark(3, true); }     // a last, sulky ruff as it gives up
  D.bark = Math.max(0, D.bark - dt * 7);

  // steering: where it wants to go, matching your speed when it's alongside, easing off as it arrives
  let wx = 0, wz = 0;
  if (gx !== null && !(sitT > 0.5)) {
    const dx = gx - D.x, dz = gz - D.z, dd = Math.hypot(dx, dz) || 1, want = Math.min(maxSp, dd * (ff ? 2.6 : 2.0));
    wx = dx / dd * want; wz = dz / dd * want;
    if (ff) { const k = clamp(1 - dd / 9, 0, 1); wx += P.vx * k; wz += P.vz * k; const m = Math.hypot(wx, wz); if (m > maxSp) { wx *= maxSp / m; wz *= maxSp / m; } }
  }
  if (D.jit > 0) { D.jit -= dt; wx += D.jx * 3; wz += D.jz * 3; }
  const acc = Math.min(1, dt * (ff ? 7 : 4.5));
  D.vx += (wx - D.vx) * acc; D.vz += (wz - D.vz) * acc;

  // the sidestep: if it's in the sled's path (or where the sled will be a heartbeat from now) it bolts sideways, whatever it was doing
  {
    const rax = D.x - P.x, raz = D.z - P.z, along = rax * fx + raz * fz, lat = rax * lx + raz * lz, zone = half + 1.3;
    if (along > zBack - 1 && along < zFront + 1.5 && Math.abs(lat) < zone) {
      const s = Math.abs(lat) > 0.25 ? Math.sign(lat) : D.keepSide; D.keepSide = s;
      const k = 1 - Math.abs(lat) / zone, vl = s * (4 + 9 * k), cur = D.vx * lx + D.vz * lz;
      if (s * cur < s * vl) { const dv = (vl - cur) * Math.min(1, dt * 12); D.vx += lx * dv; D.vz += lz * dv; }
    }
  }
  // buildings, trees and posts: slide round them
  {
    const gcx = Math.floor((D.x + HALF) / OBC), gcz = Math.floor((D.z + HALF) / OBC);
    for (let j = gcz - 1; j <= gcz + 1; j++) for (let i = gcx - 1; i <= gcx + 1; i++) {
      const a = obGrid.get(j * OBW + i); if (!a) continue;
      for (const o of a) {
        if (o.top < 1e8) continue;
        const dx = D.x - o.x, dz = D.z - o.z, rr = o.r + 0.38, d2 = dx * dx + dz * dz; if (d2 >= (rr + 1) * (rr + 1)) continue;
        const d = Math.sqrt(d2) || 1e-3, nx = dx / d, nz = dz / d, ts = (D.vx * -nz + D.vz * nx) >= 0 ? 1 : -1, k = (1 - (d - rr) / 1) * dt * 22;
        D.vx += (nx * 0.5 - nz * ts * 0.9) * k; D.vz += (nz * 0.5 + nx * ts * 0.9) * k;
      }
    }
  }
  const m0 = Math.hypot(D.vx, D.vz), cap = D.state === "chase" ? 15 : 10.5;                 // chase speed plus the odd sidestep burst
  if (m0 > cap) { D.vx *= cap / m0; D.vz *= cap / m0; }
  // move, staying on dry land
  let nx = D.x + D.vx * dt, nz = D.z + D.vz * dt;
  if (!dogLand(nx, nz)) { if (dogLand(nx, D.z)) { nz = D.z; D.vz = 0; } else if (dogLand(D.x, nz)) { nx = D.x; D.vx = 0; } else { nx = D.x; nz = D.z; D.vx = D.vz = 0; } }
  D.x = nx; D.z = nz;
  // hard limits, applied last so nothing above can break them: out of buildings, out of the sled's way, inside the town limit
  {
    const gcx = Math.floor((D.x + HALF) / OBC), gcz = Math.floor((D.z + HALF) / OBC);
    for (let j = gcz - 1; j <= gcz + 1; j++) for (let i = gcx - 1; i <= gcx + 1; i++) {
      const a = obGrid.get(j * OBW + i); if (!a) continue;
      for (const o of a) {
        if (o.top < 1e8) continue;
        const dx = D.x - o.x, dz = D.z - o.z, rr = o.r + 0.3, d2 = dx * dx + dz * dz; if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 1e-3, px = dx / d, pz = dz / d; D.x += px * (rr - d); D.z += pz * (rr - d);
        const vn = D.vx * px + D.vz * pz; if (vn < 0) { D.vx -= vn * px; D.vz -= vn * pz; }
      }
    }
    const rax = D.x - P.x, raz = D.z - P.z, along = rax * fx + raz * fz, lat = rax * lx + raz * lz, hard = half - 0.1;
    if (along > zBack && along < Math.min(zFront, 3.6) && Math.abs(lat) < hard) {
      const s = Math.abs(lat) > 0.15 ? Math.sign(lat) : D.keepSide, push = s * hard - lat; D.x += lx * push; D.z += lz * push; D.keepSide = s;
      const vl = D.vx * lx + D.vz * lz; if (s * vl < 0) { D.vx -= lx * vl; D.vz -= lz * vl; }
    }
    const tx = D.x - depot.x, tz = D.z - depot.z, rT = Math.hypot(tx, tz), lim = TOWN_R - 2.2;
    if (rT > lim) {
      D.x = depot.x + tx / rT * lim; D.z = depot.z + tz / rT * lim;
      const vr = (D.vx * tx + D.vz * tz) / rT; if (vr > 0) { D.vx -= vr * tx / rT; D.vz -= vr * tz / rT; }
      if (D.state === "chase") dogGiveUp();           // the edge of town: that's as far as it goes
    }
  }
  // stuck behind something on the way home? a nudge sideways, and if you're well out of sight, home by magic
  if ((D.probe -= dt) <= 0) {
    D.probe = 2;
    if (gx !== null && (D.state === "home" || D.state === "giveup" || D.act === "mosey") && Math.hypot(gx - D.x, gz - D.z) > 2.5 && Math.hypot(D.x - D.px, D.z - D.pz) < 0.5) {
      D.jit = 0.7; const a = Math.random() * 6.283; D.jx = Math.cos(a); D.jz = Math.sin(a);
      if (++D.stuck >= 3 && D.state === "home" && ds > 90) { D.x = D.home.x; D.z = D.home.z; D.stuck = 0; }
    } else D.stuck = 0;
    D.px = D.x; D.pz = D.z;
  }

  // pose
  const sp = Math.hypot(D.vx, D.vz);
  if (sp > 0.6) sitT = 0;
  D.sit += (sitT - D.sit) * Math.min(1, dt * (sitT > D.sit ? 3.5 : 6));
  D.sniff += (sniffT - D.sniff) * Math.min(1, dt * 4);
  const ty = sp > 0.5 ? Math.atan2(D.vx, D.vz) : faceYaw !== null ? faceYaw : D.yaw;
  D.yaw += dAng(D.yaw, ty) * Math.min(1, dt * (sp > 1 ? 9 : 4));
  // deep snow: it can't run, it bounds. Each leap arcs up and over, plunges belly-deep on landing in a puff of powder, and pushes off again
  const hp0 = sp > 0.35 ? clamp(0.35 + sp / 9, 0.4, 1) : 0, L = D.legs;
  D.hop += (hp0 - D.hop) * Math.min(1, dt * 8);
  const hp = D.hop, AIR = 0.62, prevU = D.u;
  if (sp > 0.35) D.u = (D.u + dt * sp / (0.9 + sp * 0.2)) % 1;           // leap length grows with speed: ~1.2 m at a walk, ~2.8 m flat out
  const u = D.u, inAir = u < AIR, ai = inAir ? u / AIR : 0, gv = inAir ? 0 : (u - AIR) / (1 - AIR), ease = x => x * x * (3 - 2 * x);
  const lift = inAir ? (0.1 + 0.26 * hp) * hp * 4 * ai * (1 - ai) : 0;
  const plunge = inAir ? 0 : (0.08 + 0.07 * hp) * Math.sin(Math.PI * gv) * hp;
  if (hp > 0.2 && ds < 130) {
    const puff = (n, k) => { const y0 = surf(D.x, D.z); for (let i = 0; i < n; i++) emit(D.x + (Math.random() - 0.5) * 0.5, y0 + 0.1, D.z + (Math.random() - 0.5) * 0.5, D.vx * 0.2, 1.2 + Math.random() * 1.6 * k, D.vz * 0.2, 1.6 * k, 1.1); };
    if (prevU < AIR && u >= AIR) puff(7, 1); else if (u < prevU) puff(3, 0.6);        // the landing throws a lot up, the push-off a little
  }
  const fa = (inAir ? lerp(0.55, -0.9, ease(ai)) : lerp(-0.7, 0.55, gv)) * hp, ra = (inAir ? lerp(0.9, -0.75, ease(ai)) : lerp(-0.75, 0.9, gv)) * hp;   // forelegs reach forward, hind legs drive back
  L[0].rotation.x = fa * (1 - D.sit); L[1].rotation.x = (fa + 0.08 * hp) * (1 - D.sit);
  L[2].rotation.x = lerp(ra, -1.35, D.sit); L[3].rotation.x = lerp(ra - 0.08 * hp, -1.35, D.sit);
  L[2].position.y = L[3].position.y = lerp(0.30, 0.13, D.sit);
  const bp = (inAir ? lerp(-0.3, 0.3, ai) : lerp(0.3, -0.3, gv)) * hp;           // nose up on take-off, down on landing
  D.rig.position.y = 0.30 + (hp < 0.05 ? Math.sin(D.t * 2.2) * 0.003 : 0);
  D.rig.rotation.x = -0.62 * D.sit + bp;
  D.head.rotation.x = 0.42 * D.sit + 0.55 * D.sniff - 0.3 * D.bark - 0.08 - bp * 0.7;
  D.jaw.rotation.x = 0.55 * D.bark + (sp > 6 ? 0.14 : 0);
  D.tail.rotation.z = Math.sin(D.t * (9 + sp)) * 0.3 * wag;
  const gy = surf(D.x, D.z) - 0.015; D.y = D.placed && Math.abs(gy - D.y) < 2 ? D.y + (gy - D.y) * Math.min(1, dt * 14) : gy;
  const sy = Math.sin(D.yaw), cy = Math.cos(D.yaw), hF = surf(D.x + sy * 0.4, D.z + cy * 0.4), hR = surf(D.x - sy * 0.4, D.z - cy * 0.4);
  D.pitch += (-Math.atan2(hF - hR, 0.8) - D.pitch) * Math.min(1, dt * 10);
  const wade = clamp(surf(D.x, D.z) - groundAt(D.x, D.z), 0, 0.3) * 0.45 * hp;           // belly-deep powder drags it down even between leaps
  D.g.position.set(D.x, D.y + lift - plunge - wade, D.z); D.g.rotation.set(D.pitch, D.yaw, 0, "YXZ");
}

/* what you own, on the sled and on the rider */
function applyLoadout() {
  if (!V.track || !V.machines) return;
  const sd = (PV.sled && SLEDS.find(x => x.id === PV.sled)) || sledDef();
  const pr0 = PV.cat ? Object.assign({}, GS.own.parts, { [PV.cat]: PV.id }) : GS.own.parts;
  const pr = {};                                        // newer parts wear the nearest existing model (`look`)
  for (const c in pr0) { const o = PARTS[c] ? partDef(c, pr0[c]) : null; pr[c] = o ? o.look || o.id : pr0[c]; }
  const gr = PV.slot ? Object.assign({}, GS.own.gear, { [PV.slot]: PV.id }) : GS.own.gear;
  const sh = sd.shape || {}, ex = sh.extras || [];
  applyLivery(sd);
  for (const id in V.machines) V.machines[id].visible = id === sd.id;
  const mc = V.machineOf(sd.id), ud = mc.userData;
  for (const [k, list] of Object.entries(ud.decal)) list.forEach(m => m.visible = SET.decal === k);
  /* running gear */
  V.track.scale.x = (sh.trackW || 1) * (pr.track === "paddle" ? 1.22 : pr.track === "trail" ? 0.94 : 1);
  const deck = pr.rack === "stretch" || pr.rack === "freight";
  V.track.scale.z = sd.trackLen * (pr.rack === "freight" ? 1.24 : deck ? 1.12 : 1);
  V.studs.forEach(m => m.visible = pr.track === "stud");
  V.paddles.visible = pr.track === "paddle"; V.hardpack.visible = pr.track === "trail";
  const powder = pr.skis === "powder";                 // the machine's own skis, or an aftermarket set on the same pivots
  ud.skis.forEach(pv => pv.visible = !powder);
  V.powderSki.forEach(m => m.visible = powder);
  V.carbide.forEach(m => m.visible = pr.skis === "carbide");
  /* bars, column, gauges */
  barPivot.position.set(0, ud.barY + (pr.bars === "stock" ? 0 : 0.12), ud.barZ);
  {
    const dy = ud.barY - 0.06 - ud.columnBase, dz = ud.barZ - ud.columnZ;   // the column always ends at the stock clamp height; a riser fills the rest
    V.column.position.set(0, ud.columnBase, ud.columnZ); V.column.rotation.x = Math.atan2(dz, dy); V.column.scale.y = Math.max(0.2, Math.hypot(dy, dz));
    V.columnFoot.position.set(0, ud.columnBase + 0.02, ud.columnZ);
  }
  V.guards.forEach(m => m.visible = pr.bars === "guards");
  V.riser.visible = pr.bars !== "stock";
  V.mirrors.visible = ex.includes("mirrors");
  /* the dash tablet sits above the bar clamp, its arm running down to the clamp on the column */
  {
    const by = ud.barY + (pr.bars === "stock" ? 0 : 0.12), bz = ud.barZ;
    V.tab.position.set(0, by + 0.13, bz + 0.13);
    const k = V.tab.localToWorld ? new THREE.Vector3(0, 0, 0.022).applyEuler(V.tab.rotation).add(V.tab.position) : V.tab.position;
    const a = new THREE.Vector3(0, by - 0.02, bz + 0.02), d = k.clone().sub(a);
    V.tabArm.position.copy(a); V.tabArm.scale.set(1, d.length(), 1); V.tabArm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    V.tabKnob.position.copy(a);
  }
  /* shield: stands on this hood, sized by the part fitted (or the machine's own habit) */
  const shieldKind = pr.shield !== "low" ? pr.shield : ex.includes("tallshield") ? "tall" : ex.includes("lowshield") ? "low" : "mid";
  V.shield.visible = !V.headHid;
  V.shield.position.set(0, ud.shield.y, ud.shield.z);
  V.shield.scale.set(ud.shield.w / 0.8, shieldKind === "tall" ? 1.5 : shieldKind === "mid" ? 1.05 : 0.6, 1);
  V.pane.material = shieldKind === "low" ? M.tint : M.glass;
  /* bolt-ons */
  V.tankL.visible = pr.tankL === "fitted"; V.tankR.visible = pr.tankR === "fitted";
  for (const [g, k] of [[V.tankL, "tankL"], [V.tankR, "tankR"]]) {   // the 12 L pack: taller and longer, still sat on the board
    const big = pr0[k] === "big"; g.scale.set(big ? 1.1 : 1, big ? 1.3 : 1, big ? 1.2 : 1); g.position.y = big ? -0.56 * 0.3 : 0; g.position.z = big ? 0.68 * 0.2 : 0;
  }
  V.tankL.position.x = ud.boardX - 0.38; V.tankR.position.x = -(ud.boardX - 0.38);
  const eng = engineOf(sd), bst = boostWhy(sd, pr.boost || "none") ? "none" : (pr.boost || "none");
  const kitTurbo = bst === "turbo" || (eng.turbo && !eng.stock);
  const turbo = ex.includes("turbo") || kitTurbo;
  V.raceCan.visible = pr.can === "race" && !turbo;
  V.trailCan.visible = pr.can === "trail" && !turbo;
  V.turboCan.visible = turbo;
  V.coilKit.visible = V.coilKitRear.visible = pr.susp === "coil";
  V.longKit.visible = V.longKitRear.visible = pr.susp === "long";
  V.clutchKit.visible = pr.clutch !== "stock";
  for (const g of [V.hoodScoop, V.turboScoop]) g.position.set(0, ud.scoop[0], ud.scoop[1]);
  V.turboScoop.visible = kitTurbo;
  V.hoodScoop.visible = !kitTurbo && (bst === "super" || (!eng.stock && !eng.turbo));   // a swapped motor wants more air
  V.lightBar.visible = pr.lights === "bar" || ex.includes("lightbar");
  V.lightBar.position.set(0, ud.lightBar[0], ud.lightBar[1]);
  V.lightBar.scale.x = pr0.lights === "pods" && !ex.includes("lightbar") ? 0.45 : 1;
  V.deck.visible = deck;
  const nSmall = GS.load.filter(j => !j.big).length;
  if (cargoMesh) { cargoMesh.visible = nSmall > 0 && pr.rack !== "box"; cargoMesh.children.forEach((m, i) => m.visible = i < Math.max(1, nSmall) * 2); }
  cargoMesh.position.z = ud.zBack + 1.5 + 0.06;      // parcels sit on the tail whatever the tunnel length
  V.rackBox.visible = pr.rack === "box" && nSmall > 0;
  V.rackBox.position.z = ud.zBack + 1.5 + 0.1;
  /* rider kit */
  for (const k of ["helmet", "beanie", "mask", "heated"]) (V.head[k] || []).forEach(m => m.visible = false);
  (V.head[gr.head] || V.head.helmet).forEach(m => m.visible = true);
  if (V.visor) V.visor.material = gr.head === "heated" ? (V.visorHeated || (V.visorHeated = new THREE.MeshStandardMaterial({ color: 0x1b3b4a, roughness: 0.05, metalness: 0.6, emissive: 0x0d2b38, emissiveIntensity: 0.6 }))) : V.visorMat;
  V.heatVisor.visible = gr.head === "heated";
  V.footPlain.forEach(m => m.visible = gr.boots === "pac"); V.boots.forEach(m => m.visible = gr.boots !== "pac");
  V.gloves.forEach(m => m.visible = gr.gloves === "leather"); V.mitts.forEach(m => m.visible = gr.gloves !== "leather");
  const mono = gr.jacket === "mono", thick = gr.pants === "insul" ? 1.2 : gr.pants === "shell" ? 1.08 : 1;
  const legMat = mono ? jacketMat : pantsMat;
  V.legs.forEach(g => { g.userData.mesh.scale.x = g.userData.mesh.scale.y = thick; g.userData.mesh.material = g.userData.cap.material = g.userData.joint.material = legMat; });
  V.hipParts.forEach(m => m.material = legMat); V.hips.scale.set(thick, thick, 1.0);
  const puff = gr.jacket === "insul" ? 1.1 : mono ? 1.06 : 1;
  V.chest.scale.set(1.0 * puff, 0.8 * puff, 0.85 * puff); V.torso.scale.set(puff, 1, puff);
  V.arms.forEach(g => { g.userData.mesh.scale.x = g.userData.mesh.scale.y = puff; });
  V.furCollar.visible = gr.jacket === "insul" || mono;
  V.reflect.forEach(m => m.visible = mono);
  V.kneePads.forEach(m => m.visible = gr.pants === "shell");
  V.bootCuff.forEach(m => m.visible = gr.boots === "arctic");
  V.heatBand.forEach(m => m.visible = gr.gloves === "heated");
  if (V.headHid) { V.headAll.forEach(m => m.visible = false); V.furCollar.visible = false; }
  else V.neck.visible = true;
  // first person: the eye is right over the shoulders (more so on the low, forward-leaning fast sleds, and the lens widens with speed),
  // so the near plane cut the jacket, shoulders and upper arms open and showed their inner layers. Hide them, and draw the sleeves
  // and gloves two-sided so a forearm cut by the near plane reads as solid cloth, not a hollow shell.
  V.fpHide.forEach(o => o.visible = !V.headHid);
  for (const m of [styleParts.stripe, styleParts.back, styleParts.chestPanel]) if (V.headHid) m.visible = false;
  for (const m of [jacketMat, M.glove]) { const sd = V.headHid ? THREE.DoubleSide : THREE.FrontSide; if (m.side !== sd) { m.side = sd; m.needsUpdate = true; } }
  poseRider();
  wearSync();
}

/* ---------------- other riders out on the trail ---------------- */
const NPCS = [];
// a sled with a rider on it, for the other riders, the rescue crews and whoever's stuck
function npcSledMesh(bodyHex, suitHex, noRider) {
  const std = (c, r = 0.6, m = 0.05) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const g = new THREE.Group(), body = std(bodyHex, 0.45, 0.15), dark = std(0x1a2027, 0.85),
    steel = std(0x9aa6b2, 0.35, 0.6), suit = std(suitHex, 0.8), helm = std(0xe8eef4, 0.3);
  const add = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(0.52, 0.3, 1.9), dark, 0, 0.2, -0.5);            // track & tunnel
  add(new THREE.BoxGeometry(0.62, 0.26, 1.7), body, 0, 0.5, -0.45);
  add(new THREE.SphereGeometry(0.5, 12, 8), body, 0, 0.8, 0.5).scale.set(0.86, 0.5, 1.3);   // hood
  add(new THREE.BoxGeometry(0.44, 0.16, 0.9), dark, 0, 0.95, -0.45);         // seat
  add(new THREE.BoxGeometry(0.5, 0.36, 0.03), std(0xbfe0f2, 0.05), 0, 1.22, 0.72, -0.5);   // shield
  for (const s of [-0.5, 0.5]) {
    add(new THREE.BoxGeometry(0.16, 0.05, 1.3), steel, s, 0.03, 0.9);
    add(new THREE.BoxGeometry(0.16, 0.05, 0.3), steel, s, 0.1, 1.6, -0.5);
  }
  add(new THREE.CylinderGeometry(0.035, 0.05, 0.62, 8), dark, 0, 1.1, 0.36).rotation.x = -0.12;   // steering column
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), steel, 0, 1.4, 0.34).rotation.z = Math.PI / 2;
  if (!noRider) {
    add(new THREE.BoxGeometry(0.42, 0.5, 0.34), suit, 0, 1.3, -0.5, 0.2);      // rider
    add(new THREE.SphereGeometry(0.19, 10, 8), helm, 0, 1.7, -0.42);
  }
  add(new THREE.BoxGeometry(0.2, 0.06, 0.04), std(0xff2a1a, 0.4), 0, 0.68, -1.5);   // tail light
  return g;
}
function buildNpcs() {
  const kits = [{ body: 0x2f6fb0, suit: 0x1f2a36 }, { body: 0xd8c23a, suit: 0x3a2f28 }];
  const names = ["Trail groomer", "Weekender"];
  for (let i = 0; i < 2; i++) {
    const g = npcSledMesh(kits[i].body, kits[i].suit);
    scene.add(g);
    NPCS.push({ g, name: names[i], x: 0, z: 0, y: 0, yaw: 0, spd: 8, tgt: null, avoid: 0, avoidT: 0, mark: null, colour: i ? "#d8c23a" : "#7fc8e0" });
  }
}
function npcPickTarget(n) {
  const pool = SITES.filter(s => s.type !== "shop" && Math.hypot(s.x - n.x, s.z - n.z) > 220);
  n.tgt = pool.length ? pool[(Math.random() * pool.length) | 0] : SITES[1];
}
function updNpcs(dt) {
  if (!NPCS.length) return;
  for (const n of NPCS) {
    if (!n.tgt || Math.hypot(n.x - n.tgt.x, n.z - n.tgt.z) < 30) npcPickTarget(n);
    let want = Math.atan2(n.tgt.x - n.x, n.tgt.z - n.z);
    const fx0 = Math.sin(n.yaw), fz0 = Math.cos(n.yaw);
    // look ahead: trees, rocks, buildings, cliffs and the map edge all push the bars over
    n.avoidT -= dt;
    if (n.avoidT <= 0) {
      n.avoid = 0;
      const ax = n.x + fx0 * 9, az = n.z + fz0 * 9;
      const gx = Math.floor((ax + HALF) / OBC), gz = Math.floor((az + HALF) / OBC);
      let blocked = 0;
      for (let j = gz - 1; j <= gz + 1 && !blocked; j++) for (let i = gx - 1; i <= gx + 1 && !blocked; i++) {
        const arr = obGrid.get(j * OBW + i); if (!arr) continue;
        for (const o of arr) if (Math.hypot(ax - o.x, az - o.z) < o.r + 2.4) { blocked = 1; break; }
      }
      const slope = Math.hypot(groundAt(ax + 4, az) - groundAt(ax - 4, az), groundAt(ax, az + 4) - groundAt(ax, az - 4)) / 8;
      if (Math.abs(n.x) > HALF - 250 || Math.abs(n.z) > HALF - 250) { npcPickTarget(n); n.avoid = Math.PI * 0.6; n.avoidT = 2.5; }
      else if (blocked || slope > 0.55 || sampleG(freshG, ax, az) * (MELT.kq > 0 ? meltMul(ax, az) : 1) < 0.1 || isWater(ax, az)) { n.avoid = (Math.random() < 0.5 ? -1 : 1) * 0.9; n.avoidT = 0.9 + Math.random() * 0.8; }
    }
    want += n.avoid;
    n.yaw = angLerp(n.yaw, want, 1 - Math.exp(-2.2 * dt));
    const fx = Math.sin(n.yaw), fz = Math.cos(n.yaw);
    const grade = (groundAt(n.x + fx * 6, n.z + fz * 6) - groundAt(n.x, n.z)) / 6;
    const pack = 1 - clamp((depthAt(Math.round((n.x + HALF) / CELL), Math.round((n.z + HALF) / CELL)) / Math.max(0.05, freshAt(Math.round((n.x + HALF) / CELL), Math.round((n.z + HALF) / CELL)))), 0, 1);
    const target = clamp(15 + pack * 6 - Math.max(0, grade) * 22, 4, 22);
    n.spd += (target - n.spd) * (1 - Math.exp(-1.2 * dt));
    n.x = clamp(n.x + fx * n.spd * dt, -HALF + 200, HALF - 200);
    n.z = clamp(n.z + fz * n.spd * dt, -HALF + 200, HALF - 200);
    stampAt(n.x, n.z, fx, fz);
    markTrail(n.x, n.z, true);
    if (!n.mark || Math.hypot(n.x - n.mark[0], n.z - n.mark[1]) > 4) {
      const px = (n.x + HALF) * M2SRC, pz = (n.z + HALF) * M2SRC;
      if (n.mark) { tctx.strokeStyle = n.colour; tctx.globalAlpha = 0.6; tctx.lineWidth = 1.8; tctx.beginPath(); tctx.moveTo((n.mark[0] + HALF) * M2SRC, (n.mark[1] + HALF) * M2SRC); tctx.lineTo(px, pz); tctx.stroke(); tctx.globalAlpha = 1; }
      n.mark = [n.x, n.z];
    }
    n.y = surf(n.x, n.z);
    const hF = surf(n.x + fx * 1.2, n.z + fz * 1.2), hR = surf(n.x - fx * 1.2, n.z - fz * 1.2);
    n.g.position.set(n.x, n.y, n.z);
    n.g.rotation.set(-Math.atan2(hF - hR, 2.4), n.yaw, 0, "YXZ");
    const far = Math.hypot(n.x - camera.position.x, n.z - camera.position.z);
    n.g.visible = far < 420;
    if (far < 90 && Math.random() < dt * 12) emit(n.x - fx * 1.5, n.y + 0.2, n.z - fz * 1.5, -fx * n.spd * 0.2, 1.6, -fz * n.spd * 0.2, 1.4);
  }
}

/* per-frame game tick */
function updGame(dt, spd) {
  if (GS.dead) return;
  godTick(dt);
  GS.hour += dt / GAMEHOUR; gameClock += dt;
  if (FISH && FISH.paused()) GS.hour -= dt / GAMEHOUR;               // a fishing card or the tackle shop is open: the clock waits
  CAL.tick();
  GS.saveT = (GS.saveT || 0) + dt; if (GS.saveT > 15) { GS.saveT = 0; save(); }
  // weather: the fronts over where you are right now (WX), with a look an hour ahead for the warning
  const wxT = WX.at(P.x, P.z);
  if (GS.stormPhase === "calm" && wxT > 0.55) { GS.stormPhase = "storm"; GS.warned = true; }
  else if (GS.stormPhase === "storm" && wxT < 0.42) { GS.stormPhase = "calm"; GS.warned = false; toast("The storm is breaking up."); }
  GS.wxLook = (GS.wxLook || 0) + dt;
  if (GS.stormPhase === "calm" && GS.wxLook > 2) {
    GS.wxLook = 0; const ahead = WX.at(P.x, P.z, GS.hour + 1), from = WX.f ? WX.f.from : null;
    if (!GS.warned && ahead > 0.55) { GS.warned = true; toast(`Storm moving in${from ? " from the " + from : ""}. It'll get cold and hard to see.`, "warn"); }
    else if (GS.warned && ahead < 0.4 && wxT < 0.4) GS.warned = false;
  }
  GS.storm += (wxT - GS.storm) * (1 - Math.exp(-dt / 10));
  let near = null; for (const s of SITES) if (Math.hypot(P.x - s.x, P.z - s.z) < 22) near = s;
  if (near !== GS.near && near) toast(near === garageSite ? `Nordkinn Skuter & Service. ${TC.on ? "Tap GARAGE" : "Press T"} for sleds, parts and kit.` : near.fuelPrice ? `${near.name}. Warm stove inside, and jerry cans on the porch: fuel at ${fuelFmt(near.fuelPrice)}.` : near === depot ? `Kjøllefjord quay. Warm up and refuel.` : near.kind === "village" ? `${near.name}. The shop has coffee on.` : near.type === "relay" ? `${near.name}. The keeper waves you in.` : near.type === "home" ? `${near.name}. Someone's already at the window.` : `${near.name}. Warm stove inside.`);
  GS.near = near;
  // your own depot cabins (O6) warm you like any cabin; the new lakeside ones aren't in SITES
  const reC = reNearCab(P.x, P.z, 22), reHome = reC && GS.re && GS.re.own[reC.id] ? reC : null;
  if (reHome !== RE.here) { RE.here = reHome; if (reHome) toast(`${shortName(reHome)}: your depot. ${reHome.built ? "Warm stove inside. " : ""}The fuel cache pump fills you free; it goes on Monday's bill.`); }
  const night = 1 - dayFactor(), elev = clamp((groundAt(P.x, P.z) - 110) / 220, 0, 1);
  const cold = (0.3 + 0.35 * night + 0.9 * GS.storm + 0.35 * elev) * ST.coldMul;
  if (elev > 0.5 && ST.warm < 7 && !GS.kitWarned) { GS.kitWarned = true; toast("You're under-dressed for the open fell. The garage sells warmer kit.", "warn"); }
  // a thermos or a stove: stop anywhere and you thaw out slowly, up to what the kit can manage
  const camping = !near && ST.camp > 0 && Math.hypot(P.vx, P.vz) < 0.8 && GS.warmth < ST.campCap;
  if (camping && !GS.camping && GS.warmth < ST.campCap - 8) toast(GS.own.parts.survival === "stove" ? "Stove's lit. Stay put and thaw out." : "Pouring a cup from the thermos. Stay put a minute.");
  GS.camping = camping;
  if ((near || RE.here) && !HELP.on) { GS.warmth = Math.min(100, GS.warmth + 12 * dt); GS.coldWarned = false; }
  else if (camping) { GS.warmth = Math.min(ST.campCap, GS.warmth + ST.camp * (1 - 0.5 * GS.storm) * dt); if (GS.warmth > 40) GS.coldWarned = false; }
  else if (!near && !RE.here) GS.warmth -= cold * dt * (FISH && FISH.on ? 0.45 : 1);   // sat still on a bucket out of the wind, with the thermos
  if (GS.warmth < 30 && !GS.coldWarned) { GS.coldWarned = true; toast("You're freezing. Get indoors: a village, a cabin, the quay.", "bad"); }
  if (GS.warmth <= 0) { blackout(HELP.on && HELP.kind === "sea" ? "sea" : "cold"); return; }
  { const wl = wlvAt(P.x, P.z); if (wl !== null && P.y < wl - 0.4 && !HELP.on) startDrown(); }
  if (near === depot || near === garageSite) { GS.fuel = Math.min(GS.cap, GS.fuel + 6 * dt); GS.outWarned = GS.lowWarned = false; }
  fuelStep(dt, spd);
  if (GS.fuel < GS.cap * 0.2 && !GS.lowWarned && GS.fuel > 0 && !FS.spot && !fuelSpot()) { GS.lowWarned = true; const nf = nearestFuel(); toast(`Fuel low. ${nf ? `Nearest pumps: ${nf.name}, ${fmtMi(nf.d)}, ${fuelFmt(nf.price)}.` : "Stick to packed trail, it burns less."}`, "warn"); }
  if (GS.fuel <= 0 && !GS.outWarned) { GS.outWarned = true; toast(`Out of fuel. Press F for a fuel delivery ($${helpCost("fuel")}), or walk it off.`, "bad"); }
  schoolTick(dt, spd);
  sarTick(dt, spd);
  const work = near && spd < 4 && !SCHOOL.on;           // on a school course your own loads are parked in the yard
  if (work && GS.load.some(j => j.dest === near)) deliver(near);
  if (work && GS.claims.length) collectClaims(near);
  if (work && near === depot && GS.mail.length) mailHandIn();
  mailTick(dt); updMailHud(dt);
  if (FISH) FISH.tick(dt, near, spd);
  mktTick(dt);
  if (work && GS.mkt && GS.mkt.held.length) mktCollect(near);
  if (work && GS.groomJob && GS.groomJob.dest === near) finishGroom(near);
  if (GS.tour && spd < 5 && Math.hypot(P.x - GS.tour.view.x, P.z - GS.tour.view.z) < 26) tourArrive();
  // the job board has no key for now (the tablet replaces it), so tourists simply climb on when you stop at
  // the quay while an aurora is up; once per visit
  if (near !== depot) GS.tourHere = false;
  else if (!GS.tour && !GS.tourHere && spd < 4 && AUR.v > 0.38 && !GS.dead && !SCHOOL.on && !SAR.cur) {
    GS.tourHere = true; const v = pick(LOOKOUTS);
    acceptTour({ dest: v, pax: pick(TOUR_PAX), pay: tourBase(v) });
  }
  for (const v of LOOKOUTS) if (v.beacon) v.beacon.visible = !!GS.tour && GS.tour.view === v;
  GS.aurT = (GS.aurT || 0) + dt;
  if (GS.aurT > 2) {
    GS.aurT = 0;
    if (!AUR.on && AUR.v > 0.4) { AUR.on = true; if (!GS.tour) toast(`Aurora over the Nordkinn${AUR.v > 0.6 ? ", and a strong one" : ""}. Tourists are queueing at the quay for a ride up to the viewpoints.`, "good"); }
    else if (AUR.on && AUR.v < 0.2) { AUR.on = false; if (GS.tour) toast("The aurora's fading. Your tourists are getting anxious.", "warn"); }
    if (tourSync()) TABLET.refresh();
  }
  // beacons stand over places you're carrying a package for; empty-handed, one beacon points you home to the quay
  const pend = !GS.load.length && !GS.groomJob && pendingPickup(), pendSite = pend && SITES.find(s => s.id === pend.site);
  const clSites = !GS.load.length && GS.claims.length ? new Set(GS.claims.map(j => j.from || depot)) : null;
  for (const s of SITES) if (s.beacon) s.beacon.visible = (SCHOOL.on || SCHOOL.guide ? false : GS.load.length ? GS.load.some(j => j.dest === s) : pendSite ? s === pendSite : clSites ? clSites.has(s) : (s === depot && near !== depot && (!roaming() || GS.mail.length > 0))) || !!(FISH && !SCHOOL.on && FISH.beacon(s));
  const relay = SITES.find(s => s.type === "relay"); if (relay && relay.blink) { relay.blink.visible = (gameClock % 3.2) < 0.6; if (relay.beam) relay.beam.intensity = relay.blink.visible ? 2.4 * (1 - dayFactor()) : 0; }
  updTurbines(dt); updSteamer(dt);

  GS.smokeT += dt;
  if (GS.smokeT > 0.15) {
    GS.smokeT = 0;
    for (const s of SITES) if (s.chimney && Math.hypot(P.x - s.x, P.z - s.z) < 220) { const [x, y, z] = s.chimney; emit(x, y, z, windU.uWind.value.x * 0.8, 0.9, windU.uWind.value.y * 0.8, 0.35, 3.2); }
  }
  updNpcs(dt);
  groomT += dt; if (groomT > 2.5) { groomT = 0; updGroom(); }
  refill(); fadeTrails(dt);
  updVisor(dt); updBreath(dt);
}
function groomTarget() {
  // the next ungroomed stretch along the line, or the cabin once it's good enough
  const g = GS.groomJob; if (!g) return null;
  if (groomFrac(g) >= 0.9) return g.dest;
  let best = null, bd = 1e9;
  for (const p of g.pts) if (!p.done) { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < bd) { bd = d; best = p; } }
  return best || g.dest;
}
function updGameHud() {
  let tgt = depot;
  const sarT = SAR.cur && !SAR.cur.school && !SAR.cur.res ? sarTarget(SAR.cur) : null;
  const rjv = !sarT && GS.rescueJob ? rjNearest(P.x, P.z) : null;
  if (sarT) tgt = sarT;
  else if (rjv) tgt = rjv.v;
  else if (GS.tour) tgt = GS.tour.view;
  else if (GS.load.length) {
    let best = 1e9;
    for (const j of GS.load) { const d = Math.hypot(j.dest.x - P.x, j.dest.z - P.z); if (d < best) { best = d; tgt = j.dest; } }
  } else if (GS.groomJob) tgt = groomTarget();
  const pend = !sarT && !rjv && !GS.tour && !GS.load.length && !GS.groomJob && pendingPickup();
  if (pend) tgt = SITES.find(s => s.id === pend.site) || tgt;
  else if (!sarT && !rjv && !GS.tour && !GS.load.length && !GS.groomJob && GS.claims.length) { let bd = 1e9; for (const j of GS.claims) { const f = j.from || depot, d = Math.hypot(f.x - P.x, f.z - P.z); if (d < bd) { bd = d; tgt = f; } } }
  // the licence schools: on a course the arrow follows the checkpoints; signed up, it takes you to the yard when you're not carrying anything
  const stg = schoolTarget(), sGuide = !SCHOOL.on && stg && !sarT && !rjv && !GS.tour && !GS.load.length && !GS.groomJob && !pend && !GS.claims.length;
  if (SCHOOL.on || sGuide) tgt = stg;
  const dx = tgt.x - P.x, dz = tgt.z - P.z, dist = Math.hypot(dx, dz);
  const rel = Math.atan2(dx, dz) - camState.yaw;
  $("arrow").style.transform = `rotate(${(-rel * 180 / Math.PI).toFixed(1)}deg)`;
  $("arrow").style.color = GS.tour && tgt === GS.tour.view ? "#6ff0b8" : !SITES.includes(tgt) ? "#ff8a3a" : tgt !== depot ? "var(--signal)" : "var(--ice)";
  if (SCHOOL.on) schoolHud(tgt);
  else if (sGuide) { $("jobTitle").textContent = `To ${tgt.name}`; $("jobSub").textContent = `${tgt.short} · ${fmtMi(dist)} · stop in the yard to start`; }
  else if (sarT) { const hd = sarHud(SAR.cur, tgt); $("jobTitle").textContent = hd.title; $("jobSub").textContent = hd.sub; }
  else if (rjv) {
    const c = GS.rescueJob, left = c.due - GS.hour, n = RJ.vs.filter(v => !v.freed).length;
    $("jobTitle").textContent = `Recovery → ${rjv.v.name} (${rjv.v.vk.who})${n > 1 ? ` + ${n - 1} more` : ""}`;
    $("jobSub").textContent = `${fmtMi(rjv.d)} · $${Math.round(c.pay * payMul())} · ${left > 0 ? `clock runs out ${fmtTime(c.due)}` : "out of time"}${rjv.v.gentle ? " · go gently" : ""}${winchDef() ? "" : " · NO WINCH FITTED"}`;
  } else if (GS.tour) {
    const t = GS.tour;
    $("jobTitle").textContent = `Aurora tour → ${t.view.name}${GS.load.length ? "  (+" + GS.load.length + " aboard)" : ""}`;
    $("jobSub").textContent = `${fmtMi(dist)} · aurora ${AUR.word(AUR.v).toLowerCase()} · about $${Math.round(t.base * tourMul(AUR.v) * payMul())} if you got there now`;
  } else if (GS.load.length) {
    const j = GS.load.find(x => x.dest === tgt);
    $("jobTitle").textContent = `${j.cargo} → ${tgt.name}${GS.load.length > 1 ? "  (" + GS.load.length + " aboard)" : ""}`;
    const g = groom[tgt.id];
    $("jobSub").textContent = `${fmtMi(dist)} · $${Math.round(j.pay * payMul())}${j.tipL ? " +" + tipLiters(j) + " L" : ""}${j.big ? " · " + Math.round(j.cond) + "% condition" : ""}${g !== undefined ? " · " + groomLabel(g) : ""}${j.fragile ? " · fragile" : ""}${j.due ? (j.boat ? " · ferry sails " : " · due ") + fmtTime(j.due) + (GS.hour > j.due ? (j.priority ? " (late — bond lost)" : j.boat ? " (missed her)" : " (late)") : "") : ""}${GS.groomJob ? " · grooming " + Math.round(groomFrac(GS.groomJob) * 100) + "%" : ""}`;
  } else if (GS.groomJob) {
    const g = GS.groomJob, fr = groomFrac(g);
    $("jobTitle").textContent = `Grooming → ${g.dest.name}`;
    $("jobSub").textContent = `${Math.round(fr * 100)}% of the line · ${fr >= 0.9 ? "finish at the cabin" : fr >= 0.7 ? "enough to sign off, more pays more" : "arrow points at the next gap"} · $${Math.round(g.pay * payMul())} · due ${fmtTime(g.due)}${GS.hour > g.due ? " (late)" : ""}${!isGroomer(GS.own.parts.hitch) ? " · no groomer hitched!" : GS.own.parts.hitch === "tiller" && !TOW.wingOn ? " · G: wings out, wide pays more" : ""}`;
  } else if (pend) {
    $("jobTitle").textContent = pend.guide ? `Bytteboden: ${pend.name}` : `Collect: ${pend.name}`;
    $("jobSub").textContent = pend.guide ? `${pend.seller} in ${shortName(tgt)} · ${fmtMi(dist)} · stop at the door to look it over` : `Paid for · ${pend.seller} in ${shortName(tgt)} · ${fmtMi(dist)}`;
  } else if (GS.claims.length) {
    const c = GS.claims[0], f = c.from || depot;
    $("jobTitle").textContent = `Pick up: ${c.tour ? "tourists" : c.cargo}${GS.claims.length > 1 ? "  (+" + (GS.claims.length - 1) + " more)" : ""}`;
    $("jobSub").textContent = `Waiting at ${f.name} · ${fmtMi(dist)} · stop there to load`;
  } else if (GS.near === depot) { $("jobTitle").textContent = "Kjøllefjord quay"; $("jobSub").textContent = "Warm up and refuel"; }
  else { $("jobTitle").textContent = "No cargo"; $("jobSub").textContent = `${TC.on ? "TABLET" : "Tab"} for work · quay ${fmtMi(dist)}`; }
  const wx = GS.stormPhase === "storm" ? "Storm" : GS.warned ? "Storm coming" : GS.storm > 0.2 ? "Snow showers" : "Clear";
  const sh = steamerAt(GS.hour), shN = steamerNextCall(GS.hour, "arr"), shTxt = sh.s === "in" ? `Ferry in till ${fmtTime(sh.c.dep)}` : sh.s === "leaving" ? "Ferry sailing" : sh.s === "arriving" ? "Ferry arriving" : shN ? `Ferry ${fmtTime(shN.arr)}${shN.state === "delayed" ? " (late)" : ""}` : "No ferry";
  $("clock").textContent = `${wx} · ${shTxt} · $${GS.cash}${godAny() ? " · GOD" : ""}`;
  updCalHud();
  $("rig").textContent = `${sledDef().name}${TOW.kind ? " + " + (TOW.kind === "groomer" ? "groomer" : TOW.kind === "tiller" ? (TOW.wing > 0.5 ? "wing tiller (wide)" : "wing tiller") : TOW.kind === "akja" ? "rescue toboggan" : TOW.kind) : ""} · kit ${ST.warm.toFixed(1)}`;
  $("fuelFill").style.width = (GS.fuel / GS.cap * 100).toFixed(1) + "%"; $("fuelV").textContent = GS.fuel.toFixed(1) + " L";
  $("fuelFill").classList.toggle("low", GS.fuel < GS.cap * 0.2);
  $("warmFill").style.width = clamp(GS.warmth, 0, 100).toFixed(1) + "%"; $("warmV").textContent = Math.round(Math.max(0, GS.warmth)) + "%";
  $("warmFill").classList.toggle("low", GS.warmth < 30);
  $("heatFill").style.width = clamp((HEAT.t - 30) / (HEAT_LIMP + 3 - 30) * 100, 2, 100).toFixed(1) + "%"; $("heatV").textContent = HEAT.limp ? "LIMP" : Math.round(HEAT.t) + "°C";
  $("heatFill").classList.toggle("hot", HEAT.t >= HEAT_WARN && !HEAT.limp); $("heatFill").classList.toggle("low", HEAT.limp);
}

// the date-and-time block at the top of the HUD panel; only touches the DOM when something changes
const CALHUD = { k: "" };
function updCalHud() {
  const n = CAL.now(), pn = CAL.isPolarNight(), mw = MELT.wet < 0.06 ? "" : MELT.wet < 0.4 ? "THAW · CRUST" : MELT.k > 0.5 ? "MELT · SLUSH" : "THAW · SLUSH";
  const k = n.label + n.time + pn + mw + (typeof AUR !== "undefined" ? AUR.word(AUR.v) : "");
  if (k === CALHUD.k) return; CALHUD.k = k;
  $("calDate").textContent = n.label.toUpperCase(); $("calYear").textContent = n.y; $("calTime").textContent = n.time;
  $("calPN").hidden = !pn; $("calML").hidden = !mw; if (mw) $("calML").textContent = mw;
  if (typeof AUR !== "undefined") { const a = AUR.v > 0.3; $("calAU").hidden = !a; if (a) $("calAU").textContent = "AURORA · " + AUR.word(AUR.v).toUpperCase(); }
}
const fmtSun = () => { const s = CAL.sunTimes(); return s.polar ? "POLAR NIGHT · NO SUNRISE" : s.midnight ? "MIDNIGHT SUN" : `SUN UP ${fmtTime(s.up)} · DOWN ${fmtTime(s.down)}`; };

/* ---------------- title screen: First Light ---------------- */
// The menu sits over the live world: the sled parked at the quay in the low morning sun and the
// camera drifting slowly round it. Continue lays a strip of track across the screen and the camera
// swings in behind the sled to hand over to the chase cam. Garage and Settings open the real panels.
const TT = { on: true, mode: "boot", sel: 0, items: [], away: false, px: 0, py: 0, tx: 0, ty: 0, dust: null, glint: null, dpr: 1, padA: true, padB: true, nav: 0, navT: 0, still: false };
const TSHOT = { a: -0.58, r: 7.0, rp: 8.6, h: 1.25, fh: 0.85, fov: 40, fovp: 56 };   // the shot: angle round from the sled's nose, distance, height, lens
const TCAM = { t: 0, fx: 0.3, fy: -0.06, launch: null, blend: null, wasSR: false };
const _tw = new THREE.Vector3(), _tl = new THREE.Vector3(), _tp = { eye: new THREE.Vector3(), look: new THREE.Vector3(), fov: 60 };
TT.still = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const hasSave = () => GS.delivered > 0 || GS.cash > 0 || GS.own.sleds.length > 1 || Object.keys(GS.own.partsOwned).length > 0 || Object.keys(GS.own.gearOwned).length > 0;
function titleItems() {
  const ret = hasSave();
  return [
    ret ? { id: "go", label: "CONTINUE", sub: `${GS.delivered} deliver${GS.delivered === 1 ? "y" : "ies"} · ${fmtCash(GS.cash)} · ${rankOf(GS.delivered).name} · ${sledDef().name}` }
      : { id: "go", label: "RIDE", sub: "Freight's coming off the boat at Kjøllefjord quay" },
    ...(ret ? [{ id: "new", label: "NEW GAME", sub: "Start over at Kjøllefjord quay" }] : []),
    { id: "garage", label: "GARAGE", sub: "Nordkinn Skuter & Service" },
    { id: "settings", label: "SETTINGS", sub: "Sled paint, rider kit, sound, camera" },
    { id: "howto", label: "HOW TO PLAY", sub: TC.on ? "Touch, keyboard and gamepad" : "Keyboard, gamepad and touch" },
    { id: "credits", label: "CREDITS", sub: "Who made this" }
  ];
}
function titleLayout() {
  const W = innerWidth, H = innerHeight, portrait = H > W, el = $("title");
  const ts = portrait ? clamp(W / 430, 0.72, 1.3) : H <= 500 ? clamp(H / 600, 0.56, 0.82) : clamp(Math.min(H / 720, W / 1280), 0.62, 1.7);
  el.style.setProperty("--ts", ts.toFixed(3));
  // where the sled sits in the frame: in the open ground right of the menu, or between the logo and
  // the menu on a phone held upright
  if (portrait) {
    const top = $("tTag").getBoundingClientRect().bottom, bot = $("tMenu").getBoundingClientRect().top;
    TCAM.fx = 0; TCAM.fy = clamp(1 - (top + bot) / H, -0.4, 0.5);
  } else {
    const r = $("tCol").getBoundingClientRect().right;
    TCAM.fx = clamp(((r + W) / W - 1) * 0.82, 0.08, 0.56); TCAM.fy = -0.06;
  }
  const d = Math.min(1.5, devicePixelRatio || 1), c = $("tDust");
  c.width = Math.round(W * d); c.height = Math.round(H * d); TT.dpr = d;
}
function titleRender() {
  TT.items = titleItems();
  const m = $("tMenu"); m.querySelectorAll(".ti").forEach(b => b.remove());
  TT.items.forEach((it, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "ti"; b.style.animationDelay = (i * 55) + "ms";
    b.innerHTML = `<span class="tl">${it.label}</span><span class="ts">${it.sub}</span>`;
    b.setAttribute("aria-label", it.label + ". " + it.sub);
    b.addEventListener("mouseenter", () => { if (TT.mode === "menu") titleSelect(i, true); });
    b.addEventListener("focus", () => { if (TT.mode === "menu" && TT.sel !== i) titleSelect(i, false); });
    b.addEventListener("click", () => titleActivate(i));
    m.appendChild(b);
  });
  TT.sel = clamp(TT.sel, 0, TT.items.length - 1);
  titleSelect(TT.sel, false);
}
function titleSelect(i, focus) {
  const bs = $("tMenu").querySelectorAll(".ti"), b = bs[i]; if (!b) return;
  TT.sel = i;
  bs.forEach((q, k) => { q.classList.toggle("on", k === i); q.tabIndex = k === i ? 0 : -1; });
  if (focus && document.activeElement !== b) b.focus({ preventScroll: true });
  const tr = $("tTread"), lab = b.querySelector(".tl");
  tr.style.top = (b.offsetTop + (lab.offsetHeight - tr.offsetHeight) / 2) + "px";
}
function titleMove(d) { if (TT.items.length) titleSelect((TT.sel + d + TT.items.length) % TT.items.length, true); }
function titleActivate(i) {
  if (TT.mode !== "menu") return;
  const it = TT.items[i]; if (!it) return;
  if (i !== TT.sel) titleSelect(i, false);
  if (it.id === "go") titleLaunch();
  else if (it.id === "new") titlePanel("confirm");
  else if (it.id === "garage") openGarage();
  else if (it.id === "settings") toggleSettings(true);
  else titlePanel(it.id);
}
const TT_KB = [["W / S", "Throttle, brake"], ["A / D", "Steer"], ["Shift", "Lean"], ["Space", "Hop"], ["Ctrl", "Wheelie"], ["E", "Horn"], ["T", "Garage"], ["F", "Call a rescue sled (fjord or empty tank)"], ["Q", "Get off / on the sled"], ["R", "Reset the sled"], ["Z", "Wipe frost off your visor"], ["V", "Camera"], ["M", "Map"], ["Tab", "Dash tablet (arrows + Enter inside it)"], ["B", "Weather, on the tablet"], ["Esc", "Settings"], ["Y", "God menu"]];
const TT_PAD = [["RT / LT", "Throttle, brake"], ["Left stick", "Steer"], ["RB", "Lean"], ["A", "Hop"], ["X", "Wheelie"], ["B", "Garage, or back on the tablet"], ["D-pad up", "Dash tablet (d-pad + A inside it)"], ["L3", "Horn"], ["Menu", "Settings"], ["View", "Reset the sled"], ["D-pad left", "Wipe visor frost"], ["R3", "Camera"], ["D-pad right", "Weather, on the tablet"], ["Y", "God menu"]];
function titlePanel(kind) {
  const p = $("tPanel"), x = `<button type="button" class="tx" data-a="back" aria-label="Close">✕</button>`;
  let h = "", label = "";
  if (kind === "confirm") {
    const bits = [];
    if (GS.delivered) bits.push(`${GS.delivered} deliver${GS.delivered === 1 ? "y" : "ies"}`);
    if (GS.cash) bits.push(fmtCash(GS.cash));
    if (GS.own.sled !== "frontier") bits.push("the " + sledDef().name); else if (GS.own.sleds.length > 1) bits.push("your sleds");
    const list = bits.length > 1 ? bits.slice(0, -1).join(", ") + " and " + bits[bits.length - 1] : bits[0];
    const what = bits.length ? `Your ${list} ${bits.length > 1 || /ies|sleds/.test(list) ? "go" : "goes"} back to zero.` : "Everything you've bought goes back to the shop.";
    label = "Start over?";
    h = `<div class="pe">NEW GAME</div><div class="pt">Start over?</div><p>${what} You start again at Kjøllefjord quay on the Frontier 340. Your paint and rider colours stay.</p>
      <div class="pbtns"><button type="button" class="pbtn" data-a="back">KEEP MY SAVE</button><button type="button" class="pbtn go" data-a="wipe">START OVER</button></div>`;
  } else if (kind === "howto") {
    const col = (t, list) => `<div><div class="pl">${t}</div>${list.map(([k, a]) => `<div class="pk"><b>${k}</b><span>${a}</span></div>`).join("")}</div>`;
    const touchNote = `<p class="pnote">On a phone or tablet: the steer pad sits under your left thumb, gas, brake, hop, lean and wheelie under your right. TABLET at the top dips your head to the dash screen for parcels, the map and the weather (you can still steer). GARAGE comes up at the top when you're at the shop, and HORN sits beside BRAKE. When your visor ices over, a WIPE button shows up above HOP.</p>`;
    label = "How to play";
    h = `<div class="ph"><div><div class="pe">KJØLLEFJORD QUAY</div><div class="pt">How to play</div></div>${x}</div>
      <p>When the road over Ifjordfjellet shuts, everything the Nordkinn needs comes off the coastal steamer at the quay and goes out by sled: to Mehamn and Gamvik on the Barents coast, Lebesby and Ifjord down the fjord, the herders' cabins up on the fell, the light out at Slettnes. Fresh powder drags at your sled and burns fuel. Every trail you cut stays packed, fast and cheap, until new snow buries it. The sun barely clears the hills, the nights are long and the storms come straight off the sea. Keep your tank and your body warm enough to make it back.</p>
      ${TC.on ? touchNote : ""}<div class="pgrid">${col("KEYBOARD", TT_KB)}${col("GAMEPAD", TT_PAD)}</div>${TC.on ? "" : touchNote}`;
  } else if (kind === "credits") {
    label = "Credits";
    h = `<div class="ph"><div class="pt plogo">TRACK<span>LAYER</span></div>${x}</div>
      <div class="pby">A game by Lemon</div><div class="pco">Lemon Inc.</div><div class="prule"></div>
      <p>Built with three.js. Set on the Nordkinn peninsula, Finnmark, from Kjøllefjord quay out to the lighthouse at Slettnes.</p>
      <div class="pl">THANKS FOR RIDING</div>`;
  }
  p.className = "tpanel " + kind; p.innerHTML = h; p.hidden = false; p.setAttribute("aria-label", label);
  TT.mode = "panel"; $("title").classList.add("dim");
  p.querySelectorAll("[data-a]").forEach(b => b.addEventListener("click", () => { if (b.dataset.a === "wipe") titleWipe(); else titleBack(); }));
  const f = p.querySelector(".pbtn") || p.querySelector(".tx"); if (f && !TC.on) f.focus({ preventScroll: true });
}
function titleBack() {
  $("tPanel").hidden = true; $("title").classList.remove("dim");
  TT.mode = "menu"; titleSelect(TT.sel, true);
}
function newGame() {
  GS.cash = 0; GS.delivered = 0; GS.rescues = 0; GS.own = OWN0(); GS.load = []; GS.jobs = []; GS.claims = []; GS.contracts = null; GS.groomJob = null; GS.tour = null; rescueAbort();
  Object.assign(LOG, LOG0());
  GS.mail = []; GS.mailT = {}; GS.mailSeq = 0; GS.mailH = undefined;
  if (SCHOOL.on) schoolEnd("quiet"); GS.apps = {}; GS.lic = {}; GS.signed = {}; GS.sdone = {}; SCHOOL.guide = null;
  mktInit(null); reInit(null);
  if (FISH) { FISH.abort(); FISH.setData(null); }                       // starter tackle: hand auger, short rod, plastic reel, 4 lb mono, maggots
  sarAbort("quiet"); Object.assign(SAR, { duty: false, rep: 10, miss: 0, n: 0, lost: 0, ign: 0 });
  GS.hour = 9.6; CAL.off = 0; CAL.lastDay = null; WX.seed = (Math.random() * 2 ** 31) | 0; WX.fc = null; WX.force = null;                 // a new game starts at 09:36 on 1 November
  try { localStorage.removeItem("tracklayer.save.v1"); } catch (e) { }
  restat(); GS.fuel = GS.cap; applySettings(); save();
}
function titleWipe() {
  newGame();
  const p = $("tPanel"); p.className = "tpanel fresh"; p.innerHTML = `<p>New game. First of November at Kjøllefjord.</p>`;
  TT.mode = "fresh"; TT.sel = 0;
  setTimeout(() => { titleRender(); titleBack(); }, 1700);
}
function titleReady() {
  const h = GS.hour % 24, st = CAL.sunTimes(), ph = st.up !== undefined ? clamp((h - st.up) / st.len, 0, 1) : 0.5;
  $("tClock").textContent = `${CAL.now().label.toUpperCase()} · ${fmtTime(h)} · ${GS.stormPhase === "storm" ? "STORM" : "CLEAR"}`;
  $("tSun").textContent = fmtSun();
  const bx = (1 - ph) * (1 - ph) * 10 + 2 * (1 - ph) * ph * 59 + ph * ph * 108, by = (1 - ph) * (1 - ph) * 34 + 2 * (1 - ph) * ph * 12 + ph * ph * 34;
  for (const id of ["tSunG", "tSunD"]) { $(id).setAttribute("cx", bx.toFixed(1)); $(id).setAttribute("cy", st.polar ? "40" : by.toFixed(1)); $(id).style.opacity = st.polar ? 0.35 : 1; }
  $("title").classList.remove("boot"); TT.mode = "menu";
  titleRender(); titleLayout(); titleSelect(TT.sel, !TC.on);
}
function startRide() {
  started = true;
  for (const id of ["zone", "speedo", "mapWrap", "help", "job"]) $(id).hidden = false;
  setTouchUI();
  makeJobs(depot);
  setTimeout(() => { const f = ferryInfo(); toast(`Welcome to Kjøllefjord. ${f.st.s === "in" ? "The ferry's in." : f.c ? `Next ferry sails ${fmtTime(f.c.dep)}.` : ""}`); }, 1300);
  if (innerWidth <= 640 || TC.on) $("help").hidden = true;
  canvas.focus();
}
function titleLaunch() {
  if (TT.mode !== "menu") return;
  TT.mode = "launch";
  initAudio(); if (audio && audio.AC.state === "suspended") audio.AC.resume();
  const tr = $("tTread").getBoundingClientRect(), lay = document.createElement("div");
  lay.className = "tlay";
  lay.style.cssText = `left:${tr.left}px;top:${tr.top}px;width:${tr.width}px;height:${tr.height}px;--lay:${Math.ceil(innerWidth - tr.left + 40)}px`;
  $("title").appendChild(lay); $("tTread").style.opacity = "0";
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  setTimeout(() => { TCAM.launch = { t: 0, from: titleGrab() }; startRide(); $("title").classList.add("gone"); }, TT.still ? 0 : 420);
  setTimeout(() => { $("title").hidden = true; TT.on = false; TT.mode = "off"; }, TT.still ? 700 : 1500);
}
// camera: the drifting menu shot, the swing into the chase cam, and a soft return from the showroom
function titleMenuPose(dt) {
  if (!TT.still) TCAM.t += dt;
  const portrait = innerHeight > innerWidth, cyc = TCAM.t * 2 * Math.PI / 64;
  const ang = P.yaw + TSHOT.a + Math.sin(cyc) * 0.17 + TT.px * 0.035;
  const R = (portrait ? TSHOT.rp : TSHOT.r) * (1 + 0.035 * Math.cos(cyc * 0.5));
  const ex = P.x + Math.sin(ang) * R, ez = P.z + Math.cos(ang) * R;
  camera.position.set(ex, Math.max(P.y + TSHOT.h - TT.py * 0.12, surf(ex, ez) + 0.45), ez);
  camera.up.set(0, 1, 0);
  camera.lookAt(_tl.set(P.x, P.y + TSHOT.fh, P.z));
  const fov = portrait ? TSHOT.fovp : TSHOT.fov;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const tv = Math.tan(fov * Math.PI / 360);
  camera.rotateY(Math.atan(TCAM.fx * tv * camera.aspect));
  camera.rotateX(-Math.atan(TCAM.fy * tv));
}
function titleGrab() {                                            // the camera right now, as an eye, a look point and a lens
  const d = camera.getWorldDirection(_tw), dist = Math.max(4, camera.position.distanceTo(_tl.set(P.x, P.y + 1, P.z)));
  return { eye: camera.position.clone(), dy: camera.position.y - P.y, look: camera.position.clone().addScaledVector(d, dist), fov: camera.fov };
}
function titleChasePose(out) {                                    // where the ride's own camera wants to be this frame
  const view = VIEWS[camMode], cfx = Math.sin(camState.yaw), cfz = Math.cos(camState.yaw);
  if (view.fp) {
    sledRoot.updateMatrixWorld();
    out.eye.copy(sledRoot.localToWorld(_tw.set(0, 1.66, -0.14)));
    out.look.set(out.eye.x + Math.sin(P.yaw) * 10, out.eye.y - 1.3, out.eye.z + Math.cos(P.yaw) * 10);
  } else {
    const td = (camState.tow || 0) * (view.d < 10 ? 1 : 0.35);
    out.eye.set(P.x - cfx * (view.d + td), P.y + view.h + td * 0.4, P.z - cfz * (view.d + td));
    out.eye.y = Math.max(out.eye.y, surf(out.eye.x, out.eye.z) + 1.3);
    out.look.set(P.x + cfx * 4, P.y + 1.1, P.z + cfz * 4);
  }
  out.dy = out.eye.y - P.y;
  out.fov = view.f + Math.min(16, Math.hypot(P.vx, P.vz) * 0.4);
}
function camBlend(from, to, e) {                                  // swing round the sled rather than straight through it
  const a0 = Math.atan2(from.eye.x - P.x, from.eye.z - P.z), a1 = Math.atan2(to.eye.x - P.x, to.eye.z - P.z);
  const r = lerp(Math.hypot(from.eye.x - P.x, from.eye.z - P.z), Math.hypot(to.eye.x - P.x, to.eye.z - P.z), e), a = angLerp(a0, a1, e);
  const x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r;
  camera.position.set(x, Math.max(P.y + lerp(from.dy, to.dy, e), surf(x, z) + 0.5), z);
  camera.up.set(0, 1, 0);
  camera.lookAt(_tl.copy(from.look).lerp(to.look, e));
  const f = lerp(from.fov, to.fov, e); if (Math.abs(camera.fov - f) > 0.01) { camera.fov = f; camera.updateProjectionMatrix(); }
}
function titleCam(dt) {
  // the showroom has the camera: remember where it leaves it, so the menu can drift back from there
  if (showroomOn()) { TCAM.wasSR = !started; TCAM.blend = null; TCAM.launch = null; TCAM.srPose = titleGrab(); return; }
  if (TCAM.launch) {
    const L = TCAM.launch, D = TT.still ? 0.01 : 1.7;
    if (!L.from) L.from = titleGrab();
    L.t += dt;
    titleChasePose(_tp); camBlend(L.from, _tp, sstep(0, 1, L.t / D));
    if (L.t >= D) { TCAM.launch = null; camState.init = !VIEWS[camMode].fp; }
    return;
  }
  if (started) return;
  if (TCAM.wasSR) { TCAM.wasSR = false; TCAM.blend = TCAM.srPose ? { from: TCAM.srPose, t: 0 } : null; }
  titleMenuPose(dt);
  if (TCAM.blend) {
    const B = TCAM.blend; B.t += dt;
    camBlend(B.from, titleGrab(), sstep(0, 1, B.t / 1.1));
    if (B.t >= 1.1) TCAM.blend = null;
  }
}
// the menu's own frame tick: pointer parallax, drifting ice crystals and low-sun glints
function titleTick(dt, now) {
  const k = 1 - Math.exp(-4 * dt), el = $("title");
  TT.px += (TT.tx - TT.px) * k; TT.py += (TT.ty - TT.py) * k;
  $("tCol").style.transform = `translate(${(TT.px * 6).toFixed(2)}px,${(TT.py * 4).toFixed(2)}px)`;
  const away = GS.garageOpen || !$("settings").hidden;
  if (away !== TT.away) { TT.away = away; el.classList.toggle("away", away); if (!away && TT.mode === "menu") titleSelect(TT.sel, !TC.on); }
  const c = $("tDust"), g = c.getContext("2d"), W = c.width, H = c.height, s = TT.dpr;
  g.clearRect(0, 0, W, H);
  if (away || !TT.dust) return;
  for (const p of TT.dust) {
    if (!TT.still) { p.y += p.s * dt * s; p.x += (Math.sin(p.w + now * 0.0006) * 10 + 6) * dt * s; }
    if (p.y > H + 4) { p.y = -4; p.x = Math.random() * W; } if (p.x > W + 4) p.x = -4;
    g.fillStyle = `rgba(255,250,240,${p.a})`; g.beginPath(); g.arc(p.x - TT.px * 30 * p.r / 2 * s, p.y - TT.py * 14 * p.r / 2 * s, p.r * s, 0, 6.283); g.fill();
  }
  if (!TT.still && innerWidth > innerHeight) for (const q of TT.glint) {
    const a = Math.max(0, Math.sin(now * 0.001 * q.f + q.p)); if (a < 0.6) continue;
    const r = (a - 0.6) * 9 * s, x = q.x * W, y = q.y * H;
    g.strokeStyle = `rgba(255,236,200,${((a - 0.6) * 2).toFixed(3)})`; g.lineWidth = s;
    g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
  }
}
function titlePad(gp, dt) {
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), ay = gp.axes[1] || 0;
  const nav = b(12) || ay < -0.6 ? -1 : b(13) || ay > 0.6 ? 1 : 0;
  TT.navT -= dt;
  if (nav !== TT.nav || (nav && TT.navT <= 0)) {
    if (nav && !TT.away) {
      if (TT.mode === "menu") titleMove(nav);
      else if (TT.mode === "panel") { const bs = [...$("tPanel").querySelectorAll("button")], i = bs.indexOf(document.activeElement); if (bs.length) bs[(i + nav + bs.length) % bs.length].focus(); }
    }
    TT.navT = nav === TT.nav ? 0.14 : 0.4;
  }
  TT.nav = nav;
  const a = b(0), bb = b(1);
  if (a && !TT.padA && !TT.away) {
    if (TT.mode === "menu") titleActivate(TT.sel);
    else if (TT.mode === "panel") { const f = document.activeElement; if (f && f.closest && f.closest("#tPanel") && f.tagName === "BUTTON") f.click(); else titleBack(); }
  }
  if (bb && !TT.padB) { if (GS.garageOpen) closeGarage(); else if (!$("settings").hidden) toggleSettings(false); else if (TT.mode === "panel") titleBack(); }
  TT.padA = a; TT.padB = bb;
}
addEventListener("keydown", e => {
  if (!TT.on || started || TT.mode === "boot") return;
  const c = e.code;
  if (GS.garageOpen || !$("settings").hidden) { if (c === "Escape") { e.preventDefault(); if (GS.garageOpen) closeGarage(); else toggleSettings(false); } return; }
  if (TT.mode === "panel") {
    if (c === "Escape" || c === "Backspace") { e.preventDefault(); titleBack(); }
    else if (c === "Space") { const a = document.activeElement; if (a && a.closest && a.closest("#tPanel") && a.tagName === "BUTTON") { e.preventDefault(); a.click(); } }
    return;
  }
  if (TT.mode !== "menu") return;
  if (c === "ArrowDown" || c === "KeyS") { e.preventDefault(); titleMove(1); }
  else if (c === "ArrowUp" || c === "KeyW") { e.preventDefault(); titleMove(-1); }
  else if (c === "Home" || c === "End") { e.preventDefault(); titleSelect(c === "Home" ? 0 : TT.items.length - 1, true); }
  else if (!e.repeat && (c === "Space" || ((c === "Enter" || c === "NumpadEnter") && !(document.activeElement && document.activeElement.classList && document.activeElement.classList.contains("ti"))))) { e.preventDefault(); titleActivate(TT.sel); }
});
// a gamepad press doesn't count as a user gesture, so a ride started from the pad may have
// its sound held back: let the next key or tap wake it
for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => { if (audio && audio.AC.state === "suspended") audio.AC.resume(); });
addEventListener("pointermove", e => { if (TT.on && e.pointerType === "mouse") { TT.tx = (e.clientX / innerWidth - 0.5) * 2; TT.ty = (e.clientY / innerHeight - 0.5) * 2; } });
addEventListener("resize", () => { if (TT.on) { titleLayout(); if (TT.mode === "menu") titleSelect(TT.sel, false); } });
{
  const W = innerWidth, H = innerHeight;
  TT.dust = []; for (let i = 0; i < 150; i++) TT.dust.push({ x: Math.random() * W * 1.5, y: Math.random() * H * 1.5, r: 0.5 + Math.random() * 1.8, s: 8 + Math.random() * 26, w: Math.random() * 6.28, a: 0.25 + Math.random() * 0.55 });
  TT.glint = []; for (let i = 0; i < 26; i++) TT.glint.push({ x: 0.5 + Math.random() * 0.47, y: 0.6 + Math.random() * 0.36, p: Math.random() * 6.28, f: 0.6 + Math.random() * 1.6 });
  titleLayout();
}

/* ---------------- winch, bogging and recovery ---------------- */
// Stop with the track still spinning in deep powder and the sled digs itself in. Once it's bogged no
// amount of throttle gets it out. What does: a shovel (slow), a winch strapped round a tree (quick, and only
// as good as the tree), or R. Get off (Q), wade out, hook the line round something solid (E), hold Space to reel.
// The same winch pulls other people out of ditches, ice and worse: see "recovery calls" further down.
// F is no longer a free tow: it calls a rescue sled, and only for the two things you can't fix yourself, the
// fjord and an empty tank.
const GR = 9.81;
const WINCH = [null,
  { id: "hand", name: "hand winch", len: 12, pull: 7000, speed: 0.5, fuel: 0 },
  { id: "elec", name: "electric winch", len: 26, pull: 13000, speed: 0.9, fuel: 0.012 },
  { id: "heavy", name: "expedition winch", len: 42, pull: 22000, speed: 1.15, fuel: 0.018, block: true }
];
const winchDef = () => (ST && WINCH[ST.winch]) || null;
const lbf = n => Math.round(n / 4.448 / 10) * 10;
// what a strap round it will take, in newtons: a pine or a boulder is a proper anchor, a birch is a gamble
const anchorCap = o => o.tree === undefined ? 42000 : o.pine ? 30000 * Math.min(1.3, o.s) : 9500 * o.s * o.s;
const anchorName = o => o.tree === undefined ? "boulder" : o.pine ? "pine" : "birch";
const anchorTag = o => { const c = anchorCap(o); return c > 24000 ? "solid" : c > 11000 ? "decent" : c > 6500 ? "so-so" : "weak"; };
function anchorsNear(x, z, R) {
  const out = [], g0 = Math.floor((x - R + HALF) / OBC), g1 = Math.floor((x + R + HALF) / OBC), h0 = Math.floor((z - R + HALF) / OBC), h1 = Math.floor((z + R + HALF) / OBC);
  for (let j = h0; j <= h1; j++) for (let i = g0; i <= g1; i++) {
    const a = obGrid.get(j * OBW + i); if (!a) continue;
    for (const o of a) {
      if (o.log || o.down || o.top === -Infinity) continue;
      const tree = o.tree !== undefined; if (!tree && !(o.top < 1e8 && o.r >= 0.5)) continue;
      const d = Math.hypot(o.x - x, o.z - z); if (d <= R) out.push({ o, d });
    }
  }
  return out.sort((p, q) => p.d - q.d);
}
// a tree that won't hold comes out by the roots
function uproot(o, dx, dz) {
  if (o.tree === undefined || o.down) return;
  const d = Math.hypot(dx, dz) || 1;
  if (o.snowy) dropSnow(o, true);
  const wi = wobbling.indexOf(o); if (wi >= 0) wobbling.splice(wi, 1);
  o.wob = { t: 0, amp: 0, ax: dz / d, az: -dx / d };
  o.y -= 0.18 * o.s; setTree(o, 1.5 + Math.random() * 0.06);
  treeMesh.instanceMatrix.needsUpdate = true; capMesh.instanceMatrix.needsUpdate = true;
  o.top = -Infinity; o.down = true; felled.push(o);
  for (let k = 0; k < 30; k++) emit(o.x, o.y + 0.4 + Math.random() * 0.6, o.z, dx * 0.3, 1 + Math.random() * 1.5, dz * 0.3, 2.2, 0.8);
  crack(0.9); thud(0.4);
}

/* ---- bogging ---- */
const BOG = { on: false, acc: 0, depth: 0, x: 0, z: 0, r: 3.4, r0: 0, resist: 0, moved: 0, dig: 0, sink: 0, immune: 0, t: 0, hollow: 0, hx: 1e9, hz: 1e9, warned: false };
// how much of a bowl the ground is: the average of a ring 12 m out, minus the middle
function hollowAt(x, z) {
  let s = 0; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; s += groundAt(x + Math.cos(a) * 12, z + Math.sin(a) * 12); }
  return s / 8 - groundAt(x, z);
}
function enterBog(depth) {
  BOG.on = true; BOG.depth = depth; BOG.x = P.x; BOG.z = P.z; BOG.r = 2.6 + 2.4 * depth; BOG.moved = 0; BOG.dig = 0; BOG.t = 0; BOG.acc = 0; BOG.warned = false;
  BOG.r0 = (MASS + TOW.mass) * GR * (0.5 + 1.1 * depth); BOG.resist = BOG.r0;
  P.vx = P.vz = 0;
  for (let k = 0; k < 44; k++) emit(P.x + (Math.random() - 0.5) * 2, P.y + 0.3, P.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 7, 2 + Math.random() * 4, (Math.random() - 0.5) * 7, 1.6, 1.3);
  crater(P.x, P.z, 0.22); whump(0.9);
  const wd = winchDef();
  toast(wd ? "Bogged to the skis. Get off (Q), wade to a tree and hook your winch (E)." : "Bogged to the skis. Get off (Q) and dig (hold E), or press R.", "bad");
}
function freeBog(how) {
  if (!BOG.on) return;
  BOG.on = false; BOG.acc = 0; BOG.immune = 8; BOG.dig = 0;
  toast(how === "winch" ? "Free! Keep your speed up through the soft stuff." : how === "dug" ? "Dug out. Keep your speed up through the soft stuff." : "Free.", "good");
}
function bogStep(dt, spd, thrE, fr) {
  if (BOG.immune > 0) BOG.immune -= dt;
  if (BOG.on) { BOG.t += dt; return; }
  if (!P.gnd || P.wet || P.ice || GS.dead || FOOT.on || BOG.immune > 0 || HELP.on) { BOG.acc = Math.max(0, BOG.acc - 1.2 * dt); return; }
  if (Math.abs(P.x - BOG.hx) > 3 || Math.abs(P.z - BOG.hz) > 3) { BOG.hx = P.x; BOG.hz = P.z; BOG.hollow = hollowAt(P.x, P.z); }
  const risk = sstep(0.5, 1.8, BOG.hollow) * sstep(0.4, 0.72, fr) * (1 - sstep(0.3, 0.7, P.pack));
  const dig = thrE > 0.25 && spd < 6 ? risk * (1 - spd / 6) * thrE * (1 + TOW.mass / 500) : 0;
  if (dig > 0.02) {
    BOG.acc += dig * 0.45 * dt;
    if (BOG.acc > 0.45 && !BOG.warned) { BOG.warned = true; toast("The track's digging in. Ease off, or get moving!", "warn"); }
    if (BOG.acc >= 1) enterBog(clamp(0.3 + 0.55 * risk, 0.3, 0.85));
  } else { BOG.acc = Math.max(0, BOG.acc - 0.6 * dt); if (BOG.acc < 0.2) BOG.warned = false; }
}

/* ---- on foot ---- */
const FOOT = { on: false, x: 0, z: 0, y: 0, yaw: 0, sp: 0, step: 0, fwd: 0, turn: 0, g: null, dig: false, sink: 0, crouch: 0 };
function makeFigure(m) {
  const g = new THREE.Group(), U = g.userData; U.arms = []; U.fore = []; U.legs = [];
  const torso = new THREE.Group(); torso.position.y = 0.93; g.add(torso); U.torso = torso;
  box(0.44, 0.58, 0.27, m.jacket, 0, 0.3, 0, 0, 0, 0, torso);
  box(0.46, 0.09, 0.285, m.trim, 0, 0.12, 0, 0, 0, 0, torso);
  ball(0.12, m.skin, 0, 0.72, 0.01, torso);
  ball(0.165, m.helmet, 0, 0.75, 0, torso, 1, 1, 1.08);
  box(0.2, 0.07, 0.06, m.visor, 0, 0.74, 0.14, 0, 0, 0, torso);
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.rotation.order = "YXZ"; a.position.set(s * 0.29, 0.52, 0); torso.add(a);
    box(0.11, 0.28, 0.13, m.jacket, 0, -0.14, 0, 0, 0, 0, a);
    const fa = new THREE.Group(); fa.position.y = -0.28; a.add(fa);                                  // forearm on an elbow: straight unless the figure wipes its visor
    box(0.11, 0.22, 0.13, m.jacket, 0, -0.11, 0, 0, 0, 0, fa); box(0.12, 0.12, 0.14, m.glove, 0, -0.26, 0, 0, 0, 0, fa);
    U.arms.push(a); U.fore.push(fa);
    const l = new THREE.Group(); l.position.set(s * 0.11, 0.93, 0); g.add(l);
    box(0.17, 0.82, 0.2, m.pants, 0, -0.42, 0, 0, 0, 0, l); box(0.19, 0.14, 0.34, m.boot, 0, -0.88, 0.06, 0, 0, 0, l);
    U.legs.push(l);
  }
  return g;
}
function buildWalker() {
  FOOT.g = makeFigure({ jacket: jacketMat, pants: pantsMat, trim: riderTrimMat, helmet: M.helmet, visor: M.visor, glove: M.glove, boot: M.boot, skin: M.skin });
  FOOT.g.visible = false; scene.add(FOOT.g);
}
function poseFigure(g, sp, step, crouch, dt) {
  const U = g.userData, amt = clamp(Math.abs(sp) / 2.4, 0, 1), sw = Math.sin(step) * 0.75 * amt;
  U.legs[0].rotation.x = sw; U.legs[1].rotation.x = -sw;
  U.arms[0].rotation.x = -sw * 0.9 - crouch * 0.9; U.arms[1].rotation.x = sw * 0.9 - crouch * 0.9;
  U.torso.rotation.x = crouch * 0.55 + amt * 0.08; U.torso.position.y = 0.93 - crouch * 0.12;
  if (g === FOOT.g) {                                                // the walker wipes its visor with its left arm: lift, bend the elbow, sweep across the face
    const w = WIPE.w, a = U.arms[1], f = U.fore[1];
    if (w > 0.001) {
      a.rotation.x = lerp(a.rotation.x, -1.15, w);
      a.rotation.y = lerp(0, Math.asin(clamp((-WIPE.px / 1.2 * 0.2 - 0.29) / 0.36, -0.97, 0.97)), w);
      f.rotation.x = lerp(0, -1.55 - WIPE.py * 0.25, w);
    } else { a.rotation.y = 0; f.rotation.x = 0; }
  }
}
function sledSide() { return [Math.cos(P.yaw), -Math.sin(P.yaw)]; }   // the sled's left
function dismount() {
  if (!started || GS.dead || FOOT.on || HELP.on) return;
  if (GS.garageOpen || godOpen) return;
  if (Math.hypot(P.vx, P.vz) > 2.2 || !P.gnd || P.wet) { toast("Stop the sled first.", "warn"); return; }
  const [sx, sz] = sledSide(), fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  FOOT.x = P.x + sx * 1.05 - fx * 0.3; FOOT.z = P.z + sz * 1.05 - fz * 0.3; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = P.yaw; FOOT.sp = 0; FOOT.on = true;
  P.vx = P.vz = 0; camState.init = false;
  if (winchDef()) WN.state = "out";
}
function mount() {
  if (!FOOT.on) return;
  if (Math.hypot(FOOT.x - P.x, FOOT.z - P.z) > 3.6) { toast("Get back to the sled first.", "warn"); return; }
  FOOT.on = false; FOOT.dig = false; wnStow(true); camState.init = false; camState.yaw = P.yaw;
}
function clearRecovery() {
  BOG.on = false; BOG.acc = 0; BOG.immune = 4; BOG.sink = 0;
  FOOT.on = false; FOOT.dig = false; wnStow(false);
  if (typeof HELP !== "undefined" && HELP.on) helpEnd(true);
}
function footStep(dt) {
  const F = FOOT;
  F.yaw += -F.turn * 2.2 * dt;
  const fx = Math.sin(F.yaw), fz = Math.cos(F.yaw), ix = Math.round((F.x + HALF) / CELL), iz = Math.round((F.z + HALF) / CELL);
  const d = depthAt(ix, iz), f = freshAt(ix, iz), pack = f > 0.02 ? clamp(1 - d / f, 0, 1) : 1;
  const wade = lerp(0.42, 1, pack) * (1 - 0.25 * sstep(0.5, 0.95, d));
  const tgt = F.dig ? 0 : F.fwd > 0 ? 3.0 * wade * F.fwd : F.fwd < 0 ? 1.8 * wade * F.fwd : 0;
  F.sp += (tgt - F.sp) * (1 - Math.exp(-7 * dt));
  let nx = F.x + fx * F.sp * dt, nz = F.z + fz * F.sp * dt;
  // trees, rocks and buildings
  const gx = Math.floor((nx + HALF) / OBC), gz = Math.floor((nz + HALF) / OBC);
  for (let j = gz - 1; j <= gz + 1; j++) for (let i = gx - 1; i <= gx + 1; i++) {
    const a = obGrid.get(j * OBW + i); if (!a) continue;
    for (const o of a) {
      if (o.log || o.down) continue;
      const dx = nx - o.x, dz = nz - o.z, rr = o.r + 0.36, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) { const dd = Math.sqrt(d2); nx = o.x + dx / dd * rr; nz = o.z + dz / dd * rr; }
    }
  }
  [nx, nz] = rjWalls(nx, nz, 0.36);
  // the sled itself is a wall
  { const dx = nx - P.x, dz = nz - P.z, d2 = dx * dx + dz * dz; if (d2 < 0.7 * 0.7 && d2 > 1e-6) { const dd = Math.sqrt(d2); nx = P.x + dx / dd * 0.7; nz = P.z + dz / dd * 0.7; } }
  if (isSea(nx, nz)) { nx = F.x; nz = F.z; F.sp = 0; }
  // the line only pays out so far
  if (WN.state === "out") {
    const fl = fairlead(), L = winchDef() ? winchDef().len - 0.6 : 0, dd = Math.hypot(nx - fl[0], nz - fl[2]);
    if (dd > L) { WN.tight = true; const k = L / dd; nx = fl[0] + (nx - fl[0]) * k; nz = fl[2] + (nz - fl[2]) * k; } else WN.tight = false;
  }
  const lim = HALF - 24; F.x = clamp(nx, -lim, lim); F.z = clamp(nz, -lim, lim);
  F.sink = 0.5 * clamp(d / 0.85, 0, 1) * (1 - 0.6 * pack);
  F.y = surf(F.x, F.z) - F.sink * 0.6;
  F.step += Math.abs(F.sp) * dt * 2.3;
  F.crouch += ((F.dig ? 1 : 0) - F.crouch) * (1 - Math.exp(-8 * dt));
  if (Math.abs(F.sp) > 0.8 && d > 0.3 && Math.random() < dt * 14) emit(F.x - fx * 0.3, F.y + 0.3, F.z - fz * 0.3, -fx * F.sp * 0.3, 0.8 + Math.random(), -fz * F.sp * 0.3, 0.9, 0.7);
  const g = F.g; g.visible = true; g.position.set(F.x, F.y, F.z); g.rotation.y = F.yaw;
  poseFigure(g, F.sp, F.step, F.crouch, dt);
}

/* ---- the winch: line, strap and pull ---- */
const WN = { state: "stowed", mode: "self", anchor: null, tie: null, tgt: null, dbl: false, reel: false, held: false, padReel: false, tens: 0, need: 0, cap: 0, stall: 0, snapT: 0, sfx: 0, hint: "", pullV: null, tight: false, slip: 0, hold: 0, prompt: "" };
function fairlead() { return [P.x + Math.sin(P.yaw) * 1.85, P.y + 0.55 - BOG.sink, P.z + Math.cos(P.yaw) * 1.85]; }
function makeCable(n) {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const mat = std(0x2b3138, 0.5, 0.6), geo = new THREE.CylinderGeometry(0.016, 0.016, 1, 5), segs = [];
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m); segs.push(m); }
  const hook = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), std(0xe0a820, 0.4, 0.3)); g.add(hook);
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  return {
    g, segs, hook,
    set(a, b, sag) {
      g.visible = true; let px = a[0], py = a[1], pz = a[2];
      for (let i = 0; i < n; i++) {
        const t = (i + 1) / n, x = lerp(a[0], b[0], t), z = lerp(a[2], b[2], t), y = lerp(a[1], b[1], t) - 4 * t * (1 - t) * sag;
        va.set(px, py, pz); vb.set(x, y, z); vd.subVectors(vb, va); const len = vd.length() || 0.001;
        const m = segs[i]; m.position.copy(va).add(vb).multiplyScalar(0.5); m.scale.set(1, len, 1); m.quaternion.setFromUnitVectors(up, vd.multiplyScalar(1 / len));
        px = x; py = y; pz = z;
      }
      hook.position.set(b[0], b[1], b[2]);
    },
    hide() { g.visible = false; }
  };
}
let strapM = null;
function buildWinchGear() {
  WN.cab = makeCable(16);
  strapM = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 16), std(0xff6a1f, 0.7)); strapM.rotation.x = Math.PI / 2; strapM.visible = false; scene.add(strapM);
  WN.tieCab = makeCable(6);
  // the winch on the bumper: frame, drum, fairlead roller, hook
  const W = V.winch = new THREE.Group(); sledBody.add(W); W.visible = false;
  box(0.36, 0.2, 0.16, M.dark, 0, 0, 0, 0, 0, 0, W);
  const spin = new THREE.Group(); spin.position.set(0, 0.02, 0); W.add(spin); W.userData.spin = spin;
  cyl(0.085, 0.085, 0.3, M.steel, 0, 0, 0, 0, 0, Math.PI / 2, spin, 14);
  cyl(0.045, 0.045, 0.34, M.chrome, 0, -0.06, 0.1, 0, 0, Math.PI / 2, W, 10);
  box(0.06, 0.09, 0.05, std(0xe0a820, 0.4, 0.3), 0, -0.14, 0.11, 0, 0, 0, W);
  W.position.set(0, 0.44, 1.7);
}
function wnStow(mountAgain) {
  WN.state = "stowed"; WN.anchor = null; WN.tie = null; WN.tgt = null; WN.reel = false; WN.tens = 0; WN.stall = 0; WN.pullV = null; WN.tight = false; WN.dbl = false; WN.slip = 0;
  if (WN.cab) WN.cab.hide(); if (WN.tieCab) WN.tieCab.hide(); if (strapM) strapM.visible = false;
  if (FOOT.g && !FOOT.on) FOOT.g.visible = false;
  if (mountAgain && typeof rescueUnhook === "function") rescueUnhook();
}
const anchorPt = a => [a.x, surf(a.x, a.z) + 0.5, a.z];
// E on foot: hook, unhook, or start digging
function footAction() {
  if (!FOOT.on) return;
  const wd = winchDef(), near = () => Math.hypot(FOOT.x - P.x, FOOT.z - P.z) < 2.6;
  // a rescue case first (helping someone up, loading the toboggan, rigging a tow), then recovery calls take the line
  if (sarFootAction()) return;
  if (typeof rescueFootAction === "function" && rescueFootAction()) return;
  if (WN.state === "hooked" && WN.mode === "self") {
    const a = WN.anchor; if (a && Math.hypot(FOOT.x - a.x, FOOT.z - a.z) < 2.8) { WN.state = "out"; WN.anchor = null; if (strapM) strapM.visible = false; toast("Strap off. The line runs out behind you."); return; }
    toast("Walk up to the strap to take it off.", "warn"); return;
  }
  if (wd && WN.state === "out" && WN.snapT <= 0) {
    const fl = fairlead(), cands = anchorsNear(FOOT.x, FOOT.z, 2.6);
    const ok = cands.find(c => Math.hypot(c.o.x - fl[0], c.o.z - fl[2]) <= wd.len - 0.4);
    if (ok) {
      WN.anchor = ok.o; WN.state = "hooked"; WN.mode = "self"; WN.stall = 0; WN.dbl = false;
      toast(`Strap round the ${anchorName(ok.o)} (${anchorTag(ok.o)}, ${lbf(anchorCap(ok.o)).toLocaleString("en-US")} lb). ${BOG.on ? "Hold Space to reel." : "You're not stuck, but the line's on."}`);
      return;
    }
    if (cands.length) { toast(`The ${anchorName(cands[0].o)} is out of reach of your ${wd.len} m line.`, "warn"); return; }
  }
  if (BOG.on && near() && WN.state !== "hooked") { FOOT.dig = !FOOT.dig; toast(FOOT.dig ? "Digging. Hold still." : "Stopped digging."); return; }
  if (!wd && !BOG.on) { toast("Nothing to do out here. Press Q at the sled to get back on.", "warn"); return; }
  toast(wd ? "Walk up to a tree or a boulder and press E." : "Nothing to hook.", "warn");
}
// X: size the job up
function footAssess() {
  if (!FOOT.on) return;
  if (typeof rescueAssess === "function" && rescueAssess()) return;
  const wd = winchDef();
  if (wd && wd.block && WN.state === "hooked" && WN.mode === "self" && WN.anchor && Math.hypot(FOOT.x - WN.anchor.x, FOOT.z - WN.anchor.z) < 2.8) { WN.dbl = !WN.dbl; toast(WN.dbl ? "Snatch block on the strap, line doubled back to the sled. Twice the pull, half the speed." : "Back to a single line."); return; }
  if (!BOG.on) { toast("You're not stuck."); return; }
  const fl = fairlead(), list = anchorsNear(fl[0], fl[2], wd ? wd.len : 14).filter(c => c.d > 2.5).slice(0, 6);
  const need = `It'll take about ${lbf(BOG.resist * 1.2).toLocaleString("en-US")} lb to drag out.`;
  if (!wd) { toast(`${need} No winch: dig by the sled (hold E at it).`); return; }
  const best = list.filter(c => anchorCap(c.o) > BOG.resist * 1.4).sort((a, b) => a.d - b.d)[0];
  toast(`${need} ${best ? `The ${anchorName(best.o)} ${Math.round(best.d)} m out will hold.` : "Nothing in reach looks good enough: try a bigger tree."}`);
}
function wnUpdate(dt) {
  WN.pullV = null; WN.reel = false; WN.hold = 0;
  const wd = winchDef();
  if (!wd) { if (WN.state !== "stowed") wnStow(false); WN.sfx = 0; return; }
  if (WN.snapT > 0) { WN.snapT -= dt; if (WN.snapT <= 0) toast("Winch line's respooled."); }
  WN.cap = wd.pull * (WN.dbl ? 1.8 : 1);
  WN.sfx = 0;
  if (WN.state === "hooked" && WN.mode === "self") selfReel(dt, wd);
  else if (WN.state === "hooked" && WN.mode === "rescue" && typeof rescueReel === "function") rescueReel(dt, wd);
  else WN.tens += (0 - WN.tens) * (1 - Math.exp(-6 * dt));
}
function selfReel(dt, wd) {
  const a = WN.anchor; if (!a || a.down) { WN.state = "out"; WN.anchor = null; return; }
  const held = WN.held || WN.padReel, fl = fairlead();
  let dx = a.x - fl[0], dz = a.z - fl[2]; const dist = Math.hypot(dx, dz) || 1; dx /= dist; dz /= dist;
  if (dist > wd.len + 0.5) { WN.state = "out"; WN.anchor = null; toast("Line's too short for that.", "warn"); return; }
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), along = fx * dx + fz * dz;
  // dragged sideways it fights you: the skis want to go where they point
  const need = (BOG.on ? BOG.resist : (MASS + TOW.mass) * GR * 0.35) * (1 + 0.8 * (1 - Math.max(0, along)));
  WN.need = need; const ratio = need / WN.cap; WN.tens += (clamp(ratio, 0, 1.25) - WN.tens) * (1 - Math.exp(-7 * dt));
  if (!held || WN.snapT > 0) return;
  if (wd.fuel && GS.fuel <= 0) { if (gameClock - (WN.nagT || -9) > 4) { WN.nagT = gameClock; toast("No fuel to run the winch.", "warn"); } return; }
  if (!BOG.on && dist < 1.4) return;
  WN.reel = true;
  if (need > anchorCap(a)) {                                   // the tree loses
    uproot(a, -dx, -dz); WN.state = "out"; WN.anchor = null; if (strapM) strapM.visible = false;
    toast(`The ${anchorName(a)} came out by the roots. Find something bigger${WN.dbl ? "" : wd.block ? " or double the line (X at the strap)" : ""}.`, "bad"); return;
  }
  if (ratio > 1) {                                             // more than the winch can give
    WN.stall += dt; WN.sfx = 0.12; if (gameClock - (WN.nagT || -9) > 4) { WN.nagT = gameClock; toast(wd.block && !WN.dbl ? "The winch is stalling. Double the line with the snatch block (X at the strap), or find a better angle." : "The winch is stalling. Dig, or find a better angle.", "warn"); }
    if (WN.stall > 5 && Math.random() < dt * 0.3) { WN.state = "out"; WN.anchor = null; WN.snapT = 40; if (strapM) strapM.visible = false; crack(1); toast("The line parted! Respooling a new one (40 s). Shovel or R.", "bad"); }
    return;
  }
  WN.stall = Math.max(0, WN.stall - dt * 2);
  const v = wd.speed * (WN.dbl ? 0.55 : 1) * clamp(1.25 - 0.75 * ratio, 0.3, 1);
  WN.pullV = { x: dx * v, z: dz * v }; WN.sfx = 0.05 + 0.1 * ratio;
  P.yaw = angLerp(P.yaw, Math.atan2(dx, dz), 1 - Math.exp(-2.5 * dt));
  if (wd.fuel) GS.fuel = Math.max(0, GS.fuel - wd.fuel * dt);
  if (Math.random() < dt * 5) wobble(a, 0.03, dx, dz);
  if (BOG.on) {
    BOG.moved += v * dt; BOG.resist = BOG.r0 * clamp(1 - 0.75 * BOG.moved / BOG.r, 0.2, 1);
    if (Math.random() < dt * 30) emit(P.x, P.y + 0.3, P.z, 0, 1 + Math.random() * 2, 0, 1.5, 0.8);
    if (BOG.moved >= BOG.r) { freeBog("winch"); }
  }
}
// draws the line, the strap and the walker's end of it every frame
function wnVisual(dt) {
  if (!WN.cab) return;
  const wd = winchDef();
  if (V.winch) V.winch.visible = wd ? true : (PV.cat === "winch" && PV.id && PV.id !== "none");
  if (!wd || WN.state === "stowed") { WN.cab.hide(); if (strapM) strapM.visible = false; }
  else if (WN.state === "out") { const fl = fairlead(), h = [FOOT.x, FOOT.y + 1.0, FOOT.z]; const slack = Math.max(0, wd.len - Math.hypot(h[0] - fl[0], h[2] - fl[2])); WN.cab.set(fl, h, Math.min(1.6, slack * 0.12)); WN.cab.hook.visible = false; if (strapM) strapM.visible = false; }
  else if (WN.state === "hooked" && WN.mode === "self" && WN.anchor) {
    const a = WN.anchor, fl = fairlead(), ap = anchorPt(a);
    WN.cab.set(fl, ap, (1 - clamp(WN.tens * 1.6, 0, 1)) * 0.5); WN.cab.hook.visible = true;
    strapM.visible = true; strapM.position.set(a.x, ap[1] - 0.1, a.z); const r = (a.r || 0.3) + 0.05; strapM.scale.set(r, r, 1);
  } else if (WN.state === "hooked" && WN.mode === "rescue" && typeof rescueVisual === "function") rescueVisual();
  if (V.winch && V.winch.userData.spin && WN.reel) V.winch.userData.spin.rotation.x += WN.sfx * 40 * dt;
  // sounds
  if (audio && audio.wg) { const t = audio.AC.currentTime; audio.wg.gain.setTargetAtTime(WN.sfx, t, 0.08); audio.ow.frequency.setTargetAtTime(95 + WN.tens * 150, t, 0.1); }
}

/* ---- call for help: the fjord and an empty tank ---- */
// Everything else you can get out of yourself. Go through the ice on the fjord, or run dry a long way from
// anywhere, and you radio for a rescue sled. It comes from the nearest shore or village, winches you out and
// sends the bill. Wet freight is worth less; a fuel delivery costs less.
const HELP = { on: false, kind: "", called: false, phase: "", t: 0, eta: 0, fee: 0, rs: null, cab: null, from: null, to: null, shore: null, pull: null, vis: null, sx: 0, sz: 0 };
function nearestShore(x, z) {
  for (let R = 6; R <= 600; R += 6) {
    let best = null;
    for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12, px = x + Math.cos(a) * R, pz = z + Math.sin(a) * R; if (!isWater(px, pz) && Math.abs(px) < HALF - 60 && Math.abs(pz) < HALF - 60) { best = [px, pz, a]; break; } }
    if (best) return best;
  }
  return [SPAWN.x, SPAWN.z, 0];
}
function buildRescueSled() {
  const g = npcSledMesh(0xc8102e, 0xeef2f5); g.visible = false; scene.add(g);
  const amb = std(0x6a3a00, 0.4, 0, { emissive: 0xffa020, emissiveIntensity: 1.6 }), bl = [];
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.05), amb); m.position.set(s * 0.22, 1.02, 0.62); g.add(m); bl.push(m); }
  g.userData.beacons = bl;
  return g;
}
function helpCost(kind) { return Math.round((kind === "sea" ? 140 : 45) * (1 - (ST ? ST.rescue : 0))); }
function startDrown() {
  if (HELP.on) return;
  HELP.on = true; HELP.kind = "sea"; HELP.called = false; HELP.phase = "wait"; HELP.t = 0; HELP.fee = helpCost("sea");
  LOG.fjord++;                                                             // one dunking, however it ends (winched out, or blacked out first)
  if (FOOT.on) { FOOT.on = false; FOOT.dig = false; wnStow(false); }
  const lake = P.wl !== SEA;
  P.vx = P.vz = P.vy = 0; TABLET.close(); toast(lake ? "Through the ice! Press F to call for help: every second in that meltwater costs you warmth." : "Through the ice and into the fjord! Press F to call for help: every second in that water costs you warmth.", "bad");
  whump(1);
  for (let k = 0; k < 60; k++) emit(P.x + (Math.random() - 0.5) * 3, P.wl + 0.1, P.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 8, 3 + Math.random() * 5, (Math.random() - 0.5) * 8, 1.6, 1.4);
}
function callForHelp() {
  if (GS.dead) return;
  if (HELP.on) { if (HELP.called) { toast("They're on their way. Hang on."); return; } helpCall(); return; }
  if (GS.fuel <= 0) { HELP.on = true; HELP.kind = "fuel"; HELP.fee = helpCost("fuel"); HELP.phase = "wait"; HELP.t = 0; helpCall(); return; }
  toast(BOG.on ? "That's not a rescue job: get off (Q) and winch or dig, or press R." : "You're not in trouble. F calls a rescue sled, and only for the fjord or an empty tank. R resets a stuck sled.", "warn");
}
function helpCall() {
  HELP.called = true; HELP.t = 0;
  if (!HELP.rs) { HELP.rs = buildRescueSled(); HELP.cab = makeCable(14); }
  const sea = HELP.kind === "sea", base = sea ? 9 : 16;
  // where they come from: the nearest village or quay, but never more than a minute out, and less with the messenger
  let ns = 1e9; for (const s of SITES) if (s.type !== "shop") ns = Math.min(ns, Math.hypot(s.x - P.x, s.z - P.z));
  const speed = 17, eta = clamp(base + ns / 26, sea ? 12 : 20, sea ? 34 : 70) * (1 - ST.rescue * 0.55);
  HELP.eta = eta;
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  let to, from;
  if (sea) { const sh = nearestShore(P.x, P.z); HELP.shore = sh; const ix = Math.cos(sh[2]), iz = Math.sin(sh[2]); to = [sh[0] + ix * 9, sh[1] + iz * 9]; from = [to[0] + ix * speed * (eta - 7), to[1] + iz * speed * (eta - 7)]; }
  else { to = [P.x - fx * 12, P.z - fz * 12]; from = null; for (let k = 0; k < 12 && !from; k++) { const a = Math.random() * 6.28, d = speed * (eta - 5), px = to[0] + Math.cos(a) * d, pz = to[1] + Math.sin(a) * d; if (!isSea(px, pz) && Math.abs(px) < HALF - 100 && Math.abs(pz) < HALF - 100) from = [px, pz]; } if (!from) from = [to[0] + 60, to[1] + 60]; }
  if (isSea(from[0], from[1]) || Math.abs(from[0]) > HALF - 80 || Math.abs(from[1]) > HALF - 80) {      // never start them in the water or off the map
    const sh = nearestShore(to[0], to[1]); from = [sh[0] + Math.cos(sh[2]) * 25, sh[1] + Math.sin(sh[2]) * 25];
  }
  HELP.from = from; HELP.to = to; HELP.phase = "approach"; HELP.sx = from[0]; HELP.sz = from[1];
  const g = HELP.rs; g.visible = true; g.userData.yaw = Math.atan2(to[0] - from[0], to[1] - from[1]);
  toast(sea ? `Rescue sled is coming: about ${Math.round(eta)} s out. Hold on.` : `Fuel delivery is coming: about ${Math.round(eta)} s out.`, "good");
}
function helpEnd(silent) {
  if (HELP.rs) HELP.rs.visible = false; if (HELP.cab) HELP.cab.hide();
  HELP.on = false; HELP.called = false; HELP.phase = ""; HELP.kind = "";
}
function helpTick(dt) {
  if (!HELP.on && HELP.phase !== "leave") return;
  HELP.t += dt;
  const sea = HELP.kind === "sea", rs = HELP.rs;
  if (HELP.on && sea) { GS.warmth = Math.max(6, GS.warmth - 1.0 * dt); P.sink = 0.58; }   // cold and getting colder, but a called rescue never finishes you
  if (HELP.phase === "wait") return;
  if (!rs) return;
  const fx = (a, b, t) => a + (b - a) * t;
  if (HELP.phase === "approach") {
    const T = Math.max(1, HELP.eta - (sea ? 7 : 6)), k = clamp(HELP.t / T, 0, 1), e = k;
    const x = fx(HELP.from[0], HELP.to[0], e), z = fx(HELP.from[1], HELP.to[1], e);
    const yaw = rs.userData.yaw, sx = Math.sin(yaw), sz = Math.cos(yaw), y = surf(x, z);
    rs.position.set(x, y, z); rs.rotation.set(-Math.atan2(surf(x + sx * 1.2, z + sz * 1.2) - surf(x - sx * 1.2, z - sz * 1.2), 2.4), yaw, 0, "YXZ");
    stampAt(x, z, sx, sz); markTrail(x, z, true);
    if (Math.random() < dt * 14) emit(x - sx * 1.5, y + 0.2, z - sz * 1.5, -sx * 6, 1.6, -sz * 6, 1.4);
    if (k >= 1) { HELP.phase = "hook"; HELP.t = 0; if (!sea) rs.userData.yaw = Math.atan2(P.x - x, P.z - z); }
  } else if (HELP.phase === "hook") {
    const sx = Math.sin(rs.userData.yaw), sz = Math.cos(rs.userData.yaw);
    const a = [rs.position.x + sx * 1.8, rs.position.y + 0.6, rs.position.z + sz * 1.8], tgt = sea ? [P.x, P.wl + 0.3, P.z] : [P.x, P.y + 0.8, P.z], k = clamp(HELP.t / 2.2, 0, 1);
    HELP.cab.set(a, [lerp(a[0], tgt[0], k), lerp(a[1], tgt[1], k), lerp(a[2], tgt[2], k)], (1 - k) * 0.8);
    if (!sea) { rs.rotation.y = angLerp(rs.rotation.y, rs.userData.yaw, 0.1); }
    if (k >= 1) { HELP.phase = sea ? "pull" : "hand"; HELP.t = 0; HELP.pull = [P.x, P.z]; if (!sea) toast("Two jerry cans coming your way..."); }
  } else if (HELP.phase === "pull") {
    const to = [rs.position.x, rs.position.z], d = Math.hypot(P.x - to[0], P.z - to[1]) || 1, stepL = clamp(d / 13, 3.6, 9) * dt;
    if (d > 4.4) { P.x -= (P.x - to[0]) / d * stepL; P.z -= (P.z - to[1]) / d * stepL; P.yaw = angLerp(P.yaw, Math.atan2(to[0] - P.x, to[1] - P.z) + Math.PI, 0.02); }
    P.y = Math.max(rideSurf(P.x, P.z), P.wl - 0.45) ; P.vx = P.vz = 0;
    const sx = Math.sin(rs.userData.yaw), sz = Math.cos(rs.userData.yaw);
    HELP.cab.set([rs.position.x + sx * 1.8, rs.position.y + 0.6, rs.position.z + sz * 1.8], [P.x, Math.max(P.y + 0.4, P.wl + 0.3), P.z], 0.1);
    if (d <= 4.4 || HELP.t > 22) helpDone();
  } else if (HELP.phase === "hand") {
    if (HELP.t > 4.5) helpDone();
  } else if (HELP.phase === "leave") {
    const yaw = rs.userData.yaw + Math.PI, sx = Math.sin(yaw), sz = Math.cos(yaw);
    rs.position.x += sx * 12 * dt; rs.position.z += sz * 12 * dt; rs.position.y = surf(rs.position.x, rs.position.z); rs.rotation.y = angLerp(rs.rotation.y, yaw, 0.1);
    stampAt(rs.position.x, rs.position.z, sx, sz);
    if (HELP.t > 5) { rs.visible = false; HELP.phase = ""; }
  }
  if (rs && rs.userData.beacons) rs.userData.beacons.forEach((m, i) => m.visible = ((gameClock * 4 + i) % 2) < 1);
}
function helpDone() {
  const sea = HELP.kind === "sea", fee = HELP.fee;
  GS.cash = Math.max(0, GS.cash - fee);
  if (sea) {
    if (isWater(P.x, P.z)) { const sh = nearestShore(P.x, P.z); P.x = sh[0] + Math.cos(sh[2]) * 4; P.z = sh[1] + Math.sin(sh[2]) * 4; }   // never leave you in the water
    P.sink = 0; P.wet = false; P.vx = P.vz = P.vy = 0; P.y = surf(P.x, P.z) + 0.3; P.yr = 0;
    const r = HELP.rs, sx = Math.sin(r.userData.yaw), sz = Math.cos(r.userData.yaw);
    P.safe = { x: P.x, z: P.z, yaw: P.yaw }; towSnap();
    GS.warmth = Math.max(GS.warmth, 25); BOG.immune = 6;
    let wet = 0; for (const j of GS.load) { if (j.big) { j.cond = Math.max(0, j.cond - 40 * (j.fragile ? 1.3 : 1) * (1 - ST.armor)); wet++; } else { j.hits = (j.hits || 0) + 2; wet++; } }
    toast(`Winched out of the ${P.wl !== SEA ? "lake" : "fjord"}: −$${fee}.${wet ? " Everything aboard is soaked and worth less." : ""}`, "warn");
    HELP.cab.hide(); HELP.phase = "leave"; HELP.t = 0; HELP.on = false; HELP.called = true;
    r.userData.yaw = Math.atan2(sx, sz);
  } else {
    GS.fuel = Math.min(GS.cap, GS.fuel + Math.max(4, GS.cap * 0.4)); GS.outWarned = GS.lowWarned = false;
    toast(`They tip two jerry cans in and leave a bill: −$${fee}. Don't do that again.`, "warn");
    HELP.phase = "leave"; HELP.t = 0; HELP.on = false; HELP.called = true; HELP.rs.userData.yaw = Math.atan2(P.x - HELP.rs.position.x, P.z - HELP.rs.position.z);
  }
  HELP.kind = "";
  save();
}

/* ---- recovery call-outs: the generated mission ---- */
// A call-out is a trap, a victim and a twist, dropped somewhere the terrain really would catch someone. The trap
// is found in the ground, not placed on a list: a bowl of soft snow, a drainage cut, a steep sidehill, a gully,
// a stand of spruce, a lake. How hard the pull is comes from the same ground (mass x (friction + the slope out)),
// and so does how you park: you anchor on real trees, your sled is what you're pulling against, and whether
// a birch or a pine is in reach is what decides if the job is easy. A cold clock runs on the victim.
const RRANKS = [
  { at: 0, name: "Volunteer" },
  { at: 3, name: "Recovery crew", opens: "Sidehills, gullies and people on foot are on the board." },
  { at: 6, name: "Recovery lead", opens: "Spruce jams, lake ice and two-sled call-outs. The dealer will sell you the expedition winch." },
  { at: 10, name: "Mountain rescue", opens: "Tracked carriers stuck on the fell. Bring the big winch and a good tree." }
];
const rrank = n => RRANKS.reduce((r, x) => n >= x.at ? x : r, RRANKS[0]);
const TRAPS = {
  bog: { lvl: 0, mu: 0.8, dist: 4.6, decay: 0.75, dirK: 0.25, sink: 0.42, pitch: 0.16, roll: 0.05, base: 0, w: 5, say: "sunk to the skis in a soft hollow", sayF: "waist-deep in a soft hollow", diff: 1 },
  ditch: { lvl: 0, mu: 0.5, dist: 8, decay: 0.45, dirK: 1.5, sink: 0.05, pitch: 0.08, roll: 0.34, base: 15, w: 5, say: "nose-down in a drainage ditch", sayF: "slid down into a drainage ditch", diff: 1.2 },
  hill: { lvl: 3, mu: 0.5, dist: 9, decay: 0.3, dirK: 1.2, sink: 0.1, pitch: 0.12, roll: 0.5, base: 35, w: 4, say: "slid off a sidehill and wedged against the slope", sayF: "slid down a steep bank and can't climb back", diff: 1.5 },
  gully: { lvl: 3, mu: 0.45, dist: 12, decay: 0.35, dirK: 1.0, sink: 0.05, pitch: 0.3, roll: 0.1, base: 45, w: 4, say: "at the bottom of a gully, too steep to climb out", sayF: "at the bottom of a gully", diff: 1.7 },
  wood: { lvl: 6, mu: 0.6, dist: 8, decay: 0.5, dirK: 1.8, sink: 0.12, pitch: 0.1, roll: 0.2, base: 40, w: 3, say: "jammed between the spruce with the track chewing", sayF: "stuck in a tree well under the spruce", diff: 1.6 },
  ice: { lvl: 6, mu: 0.3, dist: 6, decay: 0.55, dirK: 0.7, sink: 0.35, pitch: 0.28, roll: 0.05, base: 60, w: 3, say: "through the lake ice with the back end in the water", sayF: "through the lake ice", diff: 2.0 }
};
const VICTIMS = [
  { id: "rider", who: "weekend rider", mass: 340, lvl: 0, w: 6, sled: true, gentle: false, kit: 0, tip: [10, 25] },
  { id: "herder", who: "reindeer herder with a loaded pulk", mass: 540, lvl: 0, w: 3, sled: true, gentle: false, kit: 1, tip: [15, 35] },
  { id: "tourist", who: "ski tourist", mass: 115, lvl: 3, w: 3, sled: false, gentle: true, kit: 0, tip: [10, 30] },
  { id: "crew", who: "road crew's tracked carrier", mass: 1150, lvl: 10, w: 2, sled: true, gentle: false, kit: 1, big: true, tip: [30, 60] }
];
const R_NAMES = ["Kåre", "Ragnhild", "Ole", "Siri", "Jonas", "Elin", "Nils", "Anja", "Tor", "Marit", "Hallvard", "Ingrid", "Sander", "Liv"];
const R_THANKS = {
  rider: ["Takk! I'd have been there till the spring thaw.", "That's the last time I follow somebody else's tracks.", "You're a legend. I owe you a coffee."],
  herder: ["Takk. The reindeer will hear about this.", "My brother said I'd never get her out. I'll tell him you did it.", "Good winch. Good tree. Good work."],
  tourist: ["Thank you... I can feel my feet again.", "I thought nobody was coming. Thank you.", "Next time I'm taking the road."],
  crew: ["Ha! The boss won't believe this. Well done.", "Five tonnes of snowcat and you dragged it out. Respect.", "We'll buy you a beer at the quay."]
};
const RJ = { on: false, vs: [], pool: null, hurt: 0, blown: 0, stall: 0, t0: 0, flare: null, nag: 0, crackT: 0, ended: null };

/* -- finding where it happens -- */
const gradAt = (x, z, e = 4) => [(groundAt(x + e, z) - groundAt(x - e, z)) / (2 * e), (groundAt(x, z + e) - groundAt(x, z - e)) / (2 * e)];
function treesIn(x, z, R) { return anchorsNear(x, z, R).filter(c => c.o.tree !== undefined); }
function trapProbe(kind, x, z) {
  if (isSea(x, z) || Math.abs(x) > HALF - 500 || Math.abs(z) > HALF - 500) return null;
  const bio0 = bioAt(x, z), g0 = groundAt(x, z);
  if (kind !== "ice" && bio0 === 1) return null;
  for (const s of SITES) if (Math.hypot(s.x - x, s.z - z) < 70) return null;
  const site = { kind, x, z, g0 }; let ex = 0, ez = 0, dist = TRAPS[kind].dist, rise = 0;
  if (kind === "bog") {
    if (hollowAt(x, z) < 1.3 || slopeAt(x, z, 4) > 0.3) return null;
    const gr = gradAt(x, z, 6), m = Math.hypot(gr[0], gr[1]);
    if (m > 0.04) { ex = gr[0] / m; ez = gr[1] / m; } else { const a = Math.random() * 6.28; ex = Math.cos(a); ez = Math.sin(a); }
    site.hollow = hollowAt(x, z);
  } else if (kind === "ditch") {
    let best = null;
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 4, ax = Math.cos(a), az = Math.sin(a), nx = -az, nz = ax;
      const gL = groundAt(x + nx * 6, z + nz * 6), gR = groundAt(x - nx * 6, z - nz * 6), rim = Math.min(gL, gR) - g0, run = Math.abs(groundAt(x + ax * 8, z + az * 8) - groundAt(x - ax * 8, z - az * 8));
      if (rim >= 0.9 && rim <= 4 && run < 2.4 && (!best || rim > best.rim)) best = { rim, nx, nz, side: gL < gR ? 1 : -1 };
    }
    if (!best) return null;
    ex = best.nx * best.side; ez = best.nz * best.side;
    let t = 2; while (t < 16 && groundAt(x + ex * t, z + ez * t) < g0 + best.rim - 0.3) t += 1;
    if (t >= 16) return null; dist = t + 1.8; rise = groundAt(x + ex * t, z + ez * t) - g0;
  } else if (kind === "hill") {
    const gr = gradAt(x, z, 4), m = Math.hypot(gr[0], gr[1]);
    if (m < 0.38 || m > 0.7) return null;
    ex = gr[0] / m; ez = gr[1] / m; rise = m * 9;
  } else if (kind === "gully") {
    if (hollowAt(x, z) < 1.9) return null;
    let bestA = null, bestR = 1e9;
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, r = groundAt(x + Math.cos(a) * 13, z + Math.sin(a) * 13) - g0; if (r < bestR) { bestR = r; bestA = a; } }
    if (bestR > 7.5 || bestR < 0.8) return null;
    ex = Math.cos(bestA); ez = Math.sin(bestA); rise = bestR; dist = 13;
  } else if (kind === "wood") {
    const T = treesIn(x, z, 7); if (T.length < 5 || slopeAt(x, z, 4) > 0.3) return null;
    let bestA = null;
    for (let k = 0; k < 16 && bestA === null; k++) {
      const a = (k + Math.random()) * Math.PI / 8, dx = Math.cos(a), dz = Math.sin(a); let ok = true;
      for (let t = 1.2; t <= 12 && ok; t += 1.2) for (const c of treesIn(x + dx * t, z + dz * t, 2.4)) if (Math.hypot(c.o.x - (x + dx * t), c.o.z - (z + dz * t)) < c.o.r + 1.2) { ok = false; break; }
      if (ok) bestA = a;
    }
    if (bestA === null) return null;
    ex = Math.cos(bestA); ez = Math.sin(bestA);
  } else if (kind === "ice") {
    if (bio0 !== 1) return null;
    let bestA = null, bestD = 1e9;
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8, dx = Math.cos(a), dz = Math.sin(a); let t = 3;
      while (t < 46 && bioAt(x + dx * t, z + dz * t) === 1) t += 1.5;
      if (t <= 34 && !isSea(x + dx * t, z + dz * t) && t < bestD && t >= 9) { bestD = t; bestA = a; }
    }
    if (bestA === null) return null;
    ex = Math.cos(bestA); ez = Math.sin(bestA); site.shore = bestD; site.hole = 7;
  }
  site.ex = ex; site.ez = ez; site.dist = dist; site.slope = clamp(rise / Math.max(4, dist), 0, 0.9);
  return site;
}
function findTrap(kinds, lvl, near, rMin, rMax) {
  const ks = kinds.slice().sort(() => Math.random() - 0.5);
  for (const kind of ks) {
    for (let i = 0; i < 3500; i++) {
      let x, z;
      if (near) { const a = Math.random() * 6.28, d = 35 + Math.random() * 80; x = near.x + Math.cos(a) * d; z = near.z + Math.sin(a) * d; }
      else { const a = Math.random() * 6.28, d = rMin + Math.random() * (rMax - rMin); x = depot.x + Math.cos(a) * d; z = depot.z + Math.sin(a) * d; }
      const s = trapProbe(kind, x, z); if (s) return s;
    }
  }
  return null;
}
const wpick = (list, key = "w") => { let t = list.reduce((a, o) => a + o[key], 0), r = Math.random() * t; for (const o of list) { r -= o[key]; if (r <= 0) return o; } return list[0]; };
function nearestSiteName(x, z) { let b = null, bd = 1e9; for (const s of SITES) { if (s.type === "shop") continue; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; b = s; } } return b ? shortName(b) : "the fell"; }
// the park-up spot that'd work: out along the exit line, far enough that the whole pull fits on the line
function rjParkSpot(v, len) { const L = Math.min(len - 2, v.dist + 6); return [v.x + v.ex * L, v.z + v.ez * L]; }

function makeRescue(from) {
  const n = GS.rescues || 0, rr = rrank(n), tier = ST.winch;
  if (!tier) return null;
  const kinds = Object.keys(TRAPS).filter(k => TRAPS[k].lvl <= n), vics = VICTIMS.filter(v => v.lvl <= n);
  const reach = Math.min(3000, 1300 + n * 180);
  const vk = wpick(vics), pool = kinds.map(k => ({ k, w: TRAPS[k].w }));
  // the trap: a few tries with different kinds, nearest-first for the early ones
  let site = null;
  for (let t = 0; t < 4 && !site; t++) { const k = wpick(pool, "w").k; site = findTrap([k], n, null, 300, reach); }
  if (!site) return null;
  const T = TRAPS[site.kind], vicPool = vk;
  const comps = [];
  const night = dayFactor() < 0.3, storm = GS.storm > 0.3;
  if (storm) comps.push("storm"); if (night) comps.push("night");
  if (n >= 3 && vk.id !== "tourist" && Math.random() < 0.25) comps.push("hurt");
  if (n >= 3 && Math.random() < 0.3) comps.push("short");
  if (vk.gentle && !comps.includes("hurt")) comps.push("hurt");
  let second = null;
  if (n >= 6 && Math.random() < 0.35) { const k2 = wpick(pool, "w").k; second = findTrap([k2], n, site); if (second) comps.push("two"); }
  const vics2 = [{ site, vk: vicPool }];
  if (second) vics2.push({ site: second, vk: wpick(vics.filter(v => v.id !== "crew")) });
  const dest = { id: "sos" + ((Math.random() * 1e6) | 0), type: "sos", x: site.x, z: site.z, y: site.g0 };
  dest.name = `${({ tourist: "Ski tourist", herder: "Herder", crew: "Road crew", rider: "Rider" })[vk.id]} near ${nearestSiteName(site.x, site.z)}`;
  const { dist, climb, est } = jobGeom(dest, from);
  // what the job asks of the winch: reach (your line has to span the pull) and enough pull, with an anchor
  let need = 1;
  const reachNeed = Math.max(...vics2.map(v => v.site.shore ? v.site.shore - 1 : v.site.dist * 0.7 + 3.5));
  const maxMass = Math.max(...vics2.map(v => v.vk.mass));
  const pull = maxMass * GR * (TRAPS[site.kind].mu + site.slope * 1.1);
  if (pull > WINCH[1].pull * 0.8 || reachNeed > WINCH[1].len - 0.6) need = 2;
  if (pull > WINCH[2].pull * 0.85 || reachNeed > WINCH[2].len - 0.6) need = 3;
  const cold = comps.includes("short") ? 1.15 : comps.includes("storm") ? 1.45 : 1.75;
  const due = GS.hour + (est * cold + 40) / GAMEHOUR;
  let pay = (70 + dist / 1000 * 55 + T.base + maxMass * 0.06) * (1 + (comps.includes("storm") ? 0.3 : 0) + (comps.includes("night") ? 0.15 : 0) + (comps.includes("short") ? 0.2 : 0) + (second ? 0.8 : 0));
  pay = round5(pay);
  const names = vics2.map(() => pick(R_NAMES));
  const vtxt = second ? `Two stuck: ${names[0]} (${vicPool.who}) and ${names[1]} (${vics2[1].vk.who})` : `${names[0]}, a ${vicPool.who}`;
  const sayOf = (s, vi) => vi.id === "tourist" ? TRAPS[s.kind].sayF : TRAPS[s.kind].say;
  const why = `${vtxt} radioed from near ${nearestSiteName(site.x, site.z)}: ${second ? `${sayOf(site, vicPool)}, and the other ${sayOf(second, vics2[1].vk)}` : sayOf(site, vicPool)}.` +
    (comps.includes("hurt") ? (vk.gentle ? " They're cold and shaky: ease them out." : " Somebody's hurt. Go gently.") : "") + (comps.includes("night") ? " It's dark: look for the flare." : "") + (comps.includes("storm") ? " The storm's on them." : "");
  return { rescue: true, dest, cargo: `Recovery: ${dest.name}`, why, pay, due, need: "winch", needTier: need, reach: Math.round(reachNeed), comps, names, vics: vics2, trap: site.kind, kmDist: dist };
}

/* -- the people and their sleds -- */
function rjBuildPool() {
  if (RJ.pool) return;
  RJ.pool = [];
  const kits = [{ body: 0xd6402a, suit: 0x2b3d5c }, { body: 0x2a8aa0, suit: 0x6a4a1f }];
  for (let i = 0; i < 2; i++) {
    const sled = npcSledMesh(kits[i].body, kits[i].suit, true); sled.visible = false; scene.add(sled);
    const pulk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 1.3), std(0x6a4a2a, 0.9)); pulk.position.set(0, 0.25, -2.0); pulk.visible = false; sled.add(pulk);
    const fig = makeFigure({ jacket: std(kits[i].suit, 0.8), pants: std(0x232a33, 0.85), trim: std(0xe0a820, 0.6), helmet: std(0xe8eef4, 0.3), visor: std(0x1a2027, 0.2), glove: std(0x111418, 0.9), boot: std(0x1a1a1a, 0.9), skin: std(0xd9a27e, 0.8) });
    fig.visible = false; scene.add(fig);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 44, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.4, depthWrite: false, fog: false }));
    col.visible = false; scene.add(col);
    RJ.pool.push({ sled, pulk, fig, col });
  }
}
const rjY = (x, z) => surf(x, z);
function rjSpawn(c, i) {
  const d = c.vics[i], s = d.site, vk = d.vk, T = TRAPS[s.kind], P0 = RJ.pool[i];
  const yaw0 = Math.atan2(s.ex, s.ez) + (s.kind === "wood" ? 1.2 : s.kind === "ditch" ? 0 : Math.PI);   // most of them face the wrong way to drive out
  const mass = vk.mass, r0 = mass * GR * (T.mu + s.slope * 1.1) * (s.kind === "bog" ? 0.7 + 0.6 * clamp((s.hollow - 1) / 2.5, 0, 1) : 1);
  const v = { kind: s.kind, vk, name: c.names[i], x: s.x, z: s.z, yaw: yaw0, ex: s.ex, ez: s.ez, dist: s.dist, r0, resist: r0, moved: 0, mass, gentle: vk.gentle || c.comps.includes("hurt"), hurt: false, freed: false, gone: false, left: 0, hooked: false,
    g: P0.sled, pulk: P0.pulk, fig: P0.fig, col: P0.col, sx: s.x, sz: s.z, hole: s.hole || 0, shore: s.shore || 0, wave: Math.random() * 6, T, stressT: 0 };
  v.g.visible = vk.sled; v.pulk.visible = vk.id === "herder"; v.g.scale.setScalar(vk.big ? 1.35 : 1);
  v.fig.visible = true; v.col.visible = true;
  // the rider stands a little clear of the machine, on the side that's away from where it has to go
  const sx = Math.cos(yaw0), sz = -Math.sin(yaw0);
  v.fx = s.x + sx * (vk.sled ? 2.6 : 0) - s.ex * 0.4 * (vk.sled ? 1 : 0); v.fz = s.z + sz * (vk.sled ? 2.6 : 0);
  return v;
}
function rescueStart(c) {
  rjBuildPool(); for (const p of RJ.pool) { p.sled.visible = false; p.fig.visible = false; p.col.visible = false; }
  GS.rescueJob = c; RJ.on = true; RJ.hurt = 0; RJ.blown = 0; RJ.stall = 0; RJ.t0 = GS.hour; RJ.ended = null;
  RJ.vs = c.vics.map((_, i) => rjSpawn(c, i));
  toast(c.why, "warn");
  setTimeout(() => { if (RJ.on) toast(`Clock: ${fmtTime(c.due)} at the latest. You need a ${["", "hand", "electric", "heavy-duty"][c.needTier]} winch or better. Park on the rim, get off (Q), walk the line to them and hook on (E).`); }, 2200);
}
function rescueAbort() {
  for (const p of RJ.pool || []) { p.sled.visible = false; p.fig.visible = false; p.col.visible = false; }
  RJ.on = false; RJ.vs = []; GS.rescueJob = null;
  if (WN.mode === "rescue" && WN.state !== "stowed") wnStow(false);
}
const rjVic = () => RJ.vs.find(v => v.hooked);
function rjEye(v) {
  // the tow eye on whichever end points the way out: you hook the side you're going to pull from
  if (!v.vk.sled) return [v.fx + v.ex * 0.3, v.g.position.y + 1.0, v.fz + v.ez * 0.3];
  let dx = v.ex, dz = v.ez;
  if (v.hooked) { const fl = fairlead(), d = Math.hypot(fl[0] - v.x, fl[2] - v.z) || 1; dx = (fl[0] - v.x) / d; dz = (fl[2] - v.z) / d; }
  const r = 1.3 * v.g.scale.x; return [v.x + dx * r, v.g.position.y + 0.5, v.z + dz * r];
}
function rjNearest(x, z) { let b = null, bd = 1e9; for (const v of RJ.vs) { if (v.freed) continue; const d = Math.hypot(v.x - x, v.z - z); if (d < bd) { bd = d; b = v; } } return b ? { v: b, d: bd } : null; }

/* -- on foot: hook, tie back, assess -- */
function rescueFootAction() {
  if (!RJ.on) return false;
  const wd = winchDef(); if (!wd) return false;
  const hooked = WN.state === "hooked" && WN.mode === "rescue";
  const nv = rjNearest(FOOT.x, FOOT.z), eye = nv && rjEye(nv.v), de = nv ? Math.hypot(eye[0] - FOOT.x, eye[2] - FOOT.z) : 99;
  if (hooked) {
    if (nv && nv.v.hooked && de < 2.6) { nv.v.hooked = false; WN.state = "out"; WN.tgt = null; WN.tie = null; toast("Hook's off them. The line runs back out."); return true; }
    const tr = treesIn(FOOT.x, FOOT.z, 2.6).concat(anchorsNear(FOOT.x, FOOT.z, 2.6).filter(c => c.o.tree === undefined));
    const pk = [...new Map(tr.map(c => [c.o, c])).values()].sort((a, b) => a.d - b.d)[0];
    if (pk) {
      if (WN.tie === pk.o) { WN.tie = null; toast("Strap off the " + anchorName(pk.o) + ". Sled's on its own weight again."); return true; }
      if (Math.hypot(pk.o.x - P.x, pk.o.z - P.z) > 9.5) { toast(`That ${anchorName(pk.o)} is too far from your sled for the tie-back strap (9 m). Park closer to it.`, "warn"); return true; }
      WN.tie = pk.o; toast(`Sled strapped back to the ${anchorName(pk.o)} (${anchorTag(pk.o)}, ${lbf(anchorCap(pk.o)).toLocaleString("en-US")} lb). It won't slide now.`, "good"); return true;
    }
    return false;
  }
  if (WN.state === "out" && WN.snapT <= 0 && nv && de < 2.6) {
    const fl = fairlead(), L = Math.hypot(eye[0] - fl[0], eye[2] - fl[2]);
    if (L > wd.len - 0.4) { toast(`Your line's ${wd.len} m and they're ${Math.round(L)} m from the fairlead. Go back, ride closer, and try again.`, "warn"); return true; }
    nv.v.hooked = true; WN.state = "hooked"; WN.mode = "rescue"; WN.tgt = nv.v; WN.tie = null; WN.stall = 0; WN.dbl = false; WN.anchor = null;
    toast(nv.v.vk.sled ? `Hooked on to ${nv.v.name}'s tow eye. Walk back, strap your sled to a tree, and hold SPACE to reel.` : `Strap round ${nv.v.name}'s chest harness. Go back, strap your sled to a tree, and reel slowly: SPACE.`, "good");
    return true;
  }
  return false;
}
function rescueAssess() {
  if (!RJ.on) return false;
  const wd = winchDef(); if (!wd) return false;
  const nv = rjNearest(FOOT.x, FOOT.z), eye = nv && rjEye(nv.v);
  if (WN.state === "hooked" && WN.mode === "rescue" && wd.block && nv && nv.v.hooked && Math.hypot(eye[0] - FOOT.x, eye[2] - FOOT.z) < 3) { WN.dbl = !WN.dbl; toast(WN.dbl ? "Snatch block on the tow eye, line doubled back to your sled. Twice the pull, half the speed." : "Back to a single line."); return true; }
  if (!nv || nv.d > 20) return false;
  const v = nv.v, fl = fairlead(), pk = rjParkSpot(v, wd.len), trees = anchorsNear(pk[0], pk[1], 10).filter(c => anchorCap(c.o) > v.resist * 1.3).sort((a, b) => Math.hypot(a.o.x - pk[0], a.o.z - pk[1]) - Math.hypot(b.o.x - pk[0], b.o.z - pk[1]));
  const T = v.T, bear = Math.round((Math.atan2(v.ex, v.ez) * 180 / Math.PI + 360) % 360), card = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(bear / 45) % 8];
  const need = v.resist * 1.2;
  toast(`${v.name}, ${v.vk.sled ? v.vk.who : "on foot"}: ${v.vk.id === "tourist" ? T.sayF : T.say}. Pull toward the ${card}. ${lbf(need).toLocaleString("en-US")} lb to start. ${trees.length ? `A ${anchorName(trees[0].o)} ${Math.round(Math.hypot(trees[0].o.x - pk[0], trees[0].o.z - pk[1]))} m from the good spot will hold your sled.` : "Nothing big near the good spot: tie back to the best you can find, or double the line."}${v.gentle ? " Ease them out: slow and steady." : ""}`);
  return true;
}
function rescuePrompt() {
  if (!RJ.on) return false;
  const wd = winchDef(), nv = rjNearest(FOOT.x, FOOT.z); if (!wd || !nv) return false;
  const v = nv.v, eye = rjEye(v), de = Math.hypot(eye[0] - FOOT.x, eye[2] - FOOT.z), hooked = WN.state === "hooked" && WN.mode === "rescue";
  let h = "";
  if (hooked) {
    const near = Math.hypot(FOOT.x - P.x, FOOT.z - P.z) < 4;
    h = `${WN.tie ? "Tied back" : "Sled's on its own weight"} · ${Math.round(v.moved / v.dist * 100)}% out · Hold SPACE to reel${v.gentle ? " SLOWLY" : ""}${!WN.tie ? " · E at a tree: tie back" : ""}${wd.block ? " · X at them: double" : ""}${de < 2.6 ? " · E: unhook" : ""}`;
    if (!near && !WN.tie && WN.slip > 0.05) h = "Your sled's sliding. Tie it back to a tree (E at the tree).";
  } else if (WN.state === "out" && de < 2.6) h = `E: hook on to ${v.name}`;
  else if (nv.d < 20) h = `X: size it up · walk the line to ${v.name}${WN.tight ? " (line's at its end: ride closer)" : ""}`;
  else return false;
  WN.prompt = h; return true;
}
function rescueRideHint() {
  if (!RJ.on) return "";
  const nv = rjNearest(P.x, P.z); if (!nv || nv.d > 140) return "";
  if (!winchDef()) return "";
  return FOOT.on ? "" : `${nv.v.name} ahead: park on the rim (line is ${winchDef().len} m), then Q to get off and walk the line out`;
}
function rescueUnhook() { const v = rjVic(); if (v) v.hooked = false; WN.tie = null; }

/* -- the pull -- */
function rescueReel(dt, wd) {
  const v = WN.tgt; if (!v || v.freed) { WN.state = "out"; WN.tgt = null; return; }
  const held = WN.held || WN.padReel, fl = fairlead(), eye = rjEye(v);
  let dx = fl[0] - v.x, dz = fl[2] - v.z; const dist = Math.hypot(dx, dz) || 1; dx /= dist; dz /= dist;
  const ed = Math.hypot(eye[0] - fl[0], eye[2] - fl[2]);
  if (ed > wd.len + 0.6) { v.hooked = false; WN.state = "out"; WN.tgt = null; WN.tie = null; toast("The line's run out. Ride closer.", "warn"); return; }
  const dotExit = dx * v.ex + dz * v.ez, pen = 1 + v.T.dirK * (1 - Math.max(0, dotExit));
  const pack = clamp(1 - depthAt(Math.round((P.x + HALF) / CELL), Math.round((P.z + HALF) / CELL)) / Math.max(0.05, freshAt(Math.round((P.x + HALF) / CELL), Math.round((P.z + HALF) / CELL))), 0, 1);
  const hold = WN.tie ? anchorCap(WN.tie) : (MASS + TOW.mass) * GR * (0.3 + 0.5 * pack);
  WN.hold = 1;
  const need = v.resist * pen; WN.need = need;
  const cap = WN.cap, ratio = need / cap;
  WN.tens += (clamp(ratio, 0, 1.25) - WN.tens) * (1 - Math.exp(-7 * dt));
  WN.slip = 0;
  if (!held || WN.snapT > 0) return;
  if (wd.fuel && GS.fuel <= 0) { if (gameClock - (WN.nagT || -9) > 4) { WN.nagT = gameClock; toast("No fuel to run the winch.", "warn"); } return; }
  if (dist < 1.7) { if (gameClock - (WN.nagT || -9) > 5) { WN.nagT = gameClock; toast(`They're at your bumper and still ${Math.round(v.dist - v.moved)} m short of clear. Unhook, back the sled off, and go again.`, "warn"); } return; }
  WN.reel = true;
  if (WN.tie && need > hold) {                                     // the tie-back tree loses
    const t = WN.tie; uproot(t, -(t.x - P.x), -(t.z - P.z)); WN.tie = null; RJ.blown++; toast(`The ${anchorName(t)} you tied back to came out by the roots! Use something bigger or double the line.`, "bad"); return;
  }
  if (ratio > 1) {
    WN.stall += dt; WN.sfx = 0.12; RJ.stall += dt;
    if (gameClock - (WN.nagT || -9) > 4) { WN.nagT = gameClock; toast(wd.block && !WN.dbl ? "Winch stalling. Double the line with the snatch block (X at them), or get a better angle." : "Winch stalling. Get a straighter pull, or a bigger winch.", "warn"); }
    if (WN.stall > 5 && Math.random() < dt * 0.3) { v.hooked = false; WN.state = "out"; WN.tgt = null; WN.tie = null; WN.snapT = 40; RJ.blown++; crack(1); toast("The line parted! Respooling a new one (40 s).", "bad"); }
    return;
  }
  WN.stall = Math.max(0, WN.stall - dt * 2);
  let vv = wd.speed * (WN.dbl ? 0.55 : 1) * clamp(1.25 - 0.75 * ratio, 0.3, 1);
  if (v.gentle) { vv = Math.min(vv, 0.42); if (WN.tens > 0.8) { v.stressT += dt; if (v.stressT > 2 && !v.hurt) { v.hurt = true; RJ.hurt++; toast(`${v.name} cries out: too hard. Ease off.`, "bad"); } } else v.stressT = Math.max(0, v.stressT - dt); }
  // your sled only holds so much: what it can't hold, it gives up as a slide toward them
  let slipF = 0;
  if (!WN.tie && need > hold) { slipF = clamp((need - hold) / need, 0, 0.75); WN.slip = slipF; }
  const adv = vv * dt * (1 - slipF);
  v.x += dx * adv; v.z += dz * adv; v.yaw = angLerp(v.yaw, Math.atan2(dx, dz) + (v.vk.sled ? Math.PI : 0), 1 - Math.exp(-1.6 * dt));
  v.moved += adv * (0.25 + 0.75 * Math.max(0, dotExit));
  v.resist = v.r0 * clamp(1 - v.T.decay * v.moved / v.dist, 0.25, 1);
  if (slipF > 0.05) WN.pullV = { x: -dx * vv * slipF, z: -dz * vv * slipF };
  WN.sfx = 0.05 + 0.1 * ratio;
  if (wd.fuel) GS.fuel = Math.max(0, GS.fuel - wd.fuel * dt);
  if (Math.random() < dt * 25) emit(v.x, v.g.position.y + 0.3, v.z, 0, 1 + Math.random() * 2, 0, 1.5, 0.8);
  if (Math.random() < dt * 6 && WN.tie) wobble(WN.tie, 0.03, dx, dz);
  if (v.moved >= v.dist) rjFreed(v);
}
function rescueVisual() {
  const v = WN.tgt, wd = winchDef(); if (!v || !wd) return;
  const fl = fairlead(), eye = rjEye(v);
  WN.cab.set(fl, eye, (1 - clamp(WN.tens * 1.6, 0, 1)) * 0.5); WN.cab.hook.visible = true;
  if (WN.tie && WN.tieCab) { const t = WN.tie, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); WN.tieCab.set([P.x - fx * 0.9, P.y + 0.5, P.z - fz * 0.9], anchorPt(t), 0.15); WN.tieCab.hook.visible = true; }
  else if (WN.tieCab) WN.tieCab.hide();
}

/* -- the ending -- */
function rjFreed(v) {
  v.freed = true; v.hooked = false; v.left = 0;
  if (WN.tgt === v) { WN.state = "out"; WN.tgt = null; WN.tie = null; WN.pullV = null; if (WN.tieCab) WN.tieCab.hide(); }
  crack(0.4); for (let k = 0; k < 40; k++) emit(v.x, v.g.position.y + 0.4, v.z, (Math.random() - 0.5) * 6, 2 + Math.random() * 3, (Math.random() - 0.5) * 6, 1.6, 1.2);
  if (GS.rescueJob && GS.rescueJob.sar) { sarFreed(v); return; }   // a rescue case: it gets towed, not paid here
  toast(`${v.name} is clear. "${pick(R_THANKS[v.vk.id])}"`, "good");
  if (RJ.vs.every(q => q.freed)) rjPay();
}
function rjPay() {
  const c = GS.rescueJob; if (!c) return;
  const left = c.due - GS.hour, total = c.due - RJ.t0, notes = [];
  let pay = c.pay;
  const tip = RJ.vs.reduce((a, v) => a + ((v.vk.tip[0] + Math.random() * (v.vk.tip[1] - v.vk.tip[0])) | 0), 0);
  if (left > total * 0.5) { pay *= 1.15; notes.push("fast"); }
  if (!RJ.hurt && !RJ.blown && RJ.stall < 2.5) { pay *= 1.15; notes.push("clean recovery"); }
  if (RJ.hurt) { pay *= 0.6; notes.push("somebody was hurt"); }
  if (payMul() > 1) { pay *= payMul(); notes.push("polar night ×1.5"); }
  pay = Math.round(pay) + round5(tip);
  GS.cash += pay;
  const before = rrank(GS.rescues || 0); GS.rescues = (GS.rescues || 0) + 1; const after = rrank(GS.rescues);
  toast(`Recovery done: +$${pay}${notes.length ? " (" + notes.join(", ") + ")" : ""}. ${GS.rescues} recover${GS.rescues === 1 ? "y" : "ies"}.`, "good");
  if (after !== before) setTimeout(() => toast(`New rescue rank: ${after.name}. ${after.opens || ""}`, "good"), 2600);
  RJ.ended = { t: 0 }; GS.rescueJob = null; GS.contracts = null;
  for (const v of RJ.vs) v.left = 0.001;
  save();
}
function rjTick(dt) {
  if (!RJ.on && !RJ.ended) return;
  const c = GS.rescueJob;
  // the cold clock
  if (RJ.on && c && !RJ.vs.every(v => v.freed) && GS.hour > c.due) {
    toast("Too late. A crew from the next village got there first. No pay, but they're alive.", "bad");
    for (const v of RJ.vs) v.left = 0.001; RJ.ended = { t: 0 }; GS.rescueJob = null; GS.contracts = null; if (WN.mode === "rescue") wnStow(false);
  }
  let any = false;
  for (const v of RJ.vs) {
    const far = Math.hypot(v.x - P.x, v.z - P.z) > 360;
    if (v.left > 0) {                                  // driving off, or walking off, after the thank-you
      v.left += dt;
      if (v.vk.sled) {
        const k = 1 - Math.exp(-0.7 * v.left), sp = 11 * Math.min(1, v.left / 2.5), yaw = Math.atan2(v.ex, v.ez); v.yaw = angLerp(v.yaw, yaw, 1 - Math.exp(-2 * dt));
        v.x += Math.sin(v.yaw) * sp * dt; v.z += Math.cos(v.yaw) * sp * dt; v.fx = v.x - Math.sin(v.yaw) * 0.3; v.fz = v.z; stampAt(v.x, v.z, Math.sin(v.yaw), Math.cos(v.yaw)); markTrail(v.x, v.z, true);
      }
      if (!v.vk.sled) { v.x += v.ex * 1.6 * dt; v.z += v.ez * 1.6 * dt; v.step = (v.step || 0) + dt * 3.6; }
      if (v.left > 7) { v.gone = true; v.g.visible = false; v.fig.visible = false; v.col.visible = false; continue; }
    }
    if (v.gone) continue;
    any = true;
    // pose
    const y = rjY(v.x, v.z), T = v.T, pr = clamp(v.moved / v.dist, 0, 1), k = 1 - pr, sink = v.freed ? 0 : T.sink * k;
    const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), hF = rjY(v.x + fx * 1.2, v.z + fz * 1.2), hR = rjY(v.x - fx * 1.2, v.z - fz * 1.2), lx = fz, lz = -fx, hL = rjY(v.x + lx * 0.7, v.z + lz * 0.7), hRt = rjY(v.x - lx * 0.7, v.z - lz * 0.7);
    const extraP = v.freed ? 0 : T.pitch * k, extraR = v.freed ? 0 : T.roll * k * (Math.sin(v.yaw * 3 + 1) > 0 ? 1 : -1);
    v.g.position.set(v.x, y - sink, v.z);
    v.g.rotation.set(-Math.atan2(hF - hR, 2.4) + extraP, v.yaw, Math.atan2(hL - hRt, 1.4) + extraR, "YXZ");
    if (v.freed && v.left <= 0) v.g.rotation.x = -Math.atan2(hF - hR, 2.4);
    // the person: waving, then standing by, then off
    v.wave += dt * 5; const fig = v.fig;
    if (v.vk.sled) { const sx = Math.cos(v.yaw), sz = -Math.sin(v.yaw); if (!(v.left > 0)) { v.fx = v.x + sx * 2.4 * v.g.scale.x + fx * 0.2; v.fz = v.z + sz * 2.4 * v.g.scale.x + fz * 0.2; } }
    else { v.fx = v.x; v.fz = v.z; }
    const fy = rjY(v.fx, v.fz) - (v.vk.sled ? 0.08 : (v.freed ? 0.1 : 0.55 * k + 0.1));
    fig.position.set(v.fx, fy, v.fz); fig.rotation.y = Math.atan2(P.x - v.fx, P.z - v.fz);
    const near = Math.hypot(P.x - v.x, P.z - v.z) < 90 && !v.freed;
    poseFigure(fig, v.left > 0 && !v.vk.sled ? 1.6 : 0, v.step || 0, 0, dt);
    const U = fig.userData; if (near) { U.arms[0].rotation.x = -2.6 + Math.sin(v.wave) * 0.4; U.arms[1].rotation.x = -2.6 + Math.cos(v.wave * 1.1) * 0.4; }
    v.g.visible = v.vk.sled && !far; fig.visible = !far && !v.towed; if (v.vk.sled && v.left > 1.2) fig.visible = false;
    // the flare: a column over the spot so you can find it in the dark or a whiteout
    v.col.visible = !v.freed && !v.gone; v.col.position.set(v.fx + 1.5, y + 22, v.fz); v.col.material.opacity = (0.25 + 0.2 * Math.sin(gameClock * 3)) * (0.5 + 0.5 * (1 - dayFactor()) + 0.4 * GS.storm);
    if (!v.freed && !far && Math.random() < dt * 4) emit(v.fx + 1.5, y + 0.3, v.fz, 0, 2, 0, 0.3, 1.6);
    // thin ice round the hole: walk out on it and it lets go
    if (v.kind === "ice" && !v.freed && FOOT.on && Math.hypot(FOOT.x - v.x, FOOT.z - v.z) < v.hole + 1.5 && Math.hypot(FOOT.x - v.x, FOOT.z - v.z) > 2.2) {
      RJ.crackT += dt; if (RJ.crackT > 0.4 && RJ.crackT - dt <= 0.4) { crack(0.7); toast("The ice is groaning round them. Back off!", "warn"); }
      if (RJ.crackT > 2.8) { RJ.crackT = 0; GS.warmth = Math.max(8, GS.warmth - 30); FOOT.x = P.x + 1.6; FOOT.z = P.z; whump(0.8); toast("You went through! You scramble back to the sled, soaked. Stay off the thin ice round the hole.", "bad"); }
    }
  }
  if (!any && RJ.ended && !RJ.vs.some(v => v.left > 0 && !v.gone)) { RJ.on = false; RJ.ended = null; for (const p of RJ.pool || []) { p.sled.visible = false; p.fig.visible = false; p.col.visible = false; } RJ.vs = []; }
}
// the victims' machines are walls to the walker
function rjWalls(nx, nz, r) {
  if (!RJ.on) return [nx, nz];
  for (const v of RJ.vs) { if (v.gone) continue; const rr = (v.vk.big ? 1.6 : v.vk.sled ? 0.95 : 0.5) + r, dx = nx - v.x, dz = nz - v.z, d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); nx = v.x + dx / d * rr; nz = v.z + dz / d * rr; } }
  return [nx, nz];
}

/* ---- the frame hooks ---- */
function rescueTick(dt) {
  if (!started) return;
  helpTick(dt); rjTick(dt);
  if (FOOT.on && !GS.dead) {
    FOOT.dig = FOOT.dig && BOG.on && WN.state !== "hooked" && Math.hypot(FOOT.x - P.x, FOOT.z - P.z) < 3.2;
    footStep(dt);
    if (FOOT.dig && BOG.on) {
      const rate = 1 / (80 * (1 - ST.rescue * 0.55)) * (1 - 0.3 * BOG.depth);
      BOG.dig += rate * dt; if (Math.random() < dt * 12) emit(P.x + (Math.random() - 0.5) * 2, P.y + 0.2, P.z + (Math.random() - 0.5) * 2, 0, 2, 0, 1.5, 0.8);
      if (BOG.dig >= 1) { FOOT.dig = false; freeBog("dug"); }
    }
  } else if (FOOT.g) FOOT.g.visible = false;
  if (rider) rider.visible = !FOOT.on && !(FISH && FISH.on);
  wnUpdate(dt);
  BOG.sink += ((BOG.on ? BOG.depth * 0.42 : 0) - BOG.sink) * (1 - Math.exp(-3 * dt));
  wnPrompt();
}
function wnPrompt() {
  let h = "", show = false;
  const wd = winchDef();
  if (HELP.on && HELP.kind === "sea") {
    show = true;
    h = HELP.called ? `RESCUE SLED INBOUND · ${Math.max(0, Math.ceil(HELP.eta - HELP.t))} s` : "IN THE WATER · F: CALL FOR HELP";
  } else if (FOOT.on) {
    show = true;
    const near = Math.hypot(FOOT.x - P.x, FOOT.z - P.z) < 3.0;
    if (sarPrompt()) h = sarPrompt();
    else if (typeof rescuePrompt === "function" && rescuePrompt()) h = WN.prompt;
    else if (WN.state === "hooked" && WN.mode === "self") {
      const a = WN.anchor, close = a && Math.hypot(FOOT.x - a.x, FOOT.z - a.z) < 2.8;
      h = `Hold SPACE to reel${wd && wd.block ? " · X at the strap: double the line" : ""}${close ? " · E: unhook" : ""} · Q: get on`;
    } else if (wd && WN.state === "out") {
      const cands = anchorsNear(FOOT.x, FOOT.z, 2.6), fl = fairlead(), reach = cands.find(c => Math.hypot(c.o.x - fl[0], c.o.z - fl[2]) <= wd.len - 0.4);
      h = reach ? `E: strap the ${anchorName(reach.o)} (${anchorTag(reach.o)})` : WN.tight ? `Line's at its end (${wd.len} m). Hook what you can reach, or go back.` : `Walk the line out to a tree or boulder · X: size it up${near ? " · Q: get on" : ""}`;
    } else if (BOG.on && near) h = FOOT.dig ? `Digging ${Math.round(BOG.dig * 100)}% · E: stop` : "E: dig her out (slow) · Q: get on";
    else h = (FISH && FISH.hint()) || (near ? "Q: get on the sled" : "Walk back to the sled and press Q");
  } else if (BOG.on) { show = true; h = wd ? "BOGGED · Q: get off, wade to a tree and hook the winch (E) · R: reset" : "BOGGED · Q: get off and dig (hold E) · R: reset"; }
  else if (BOG.acc > 0.4) { show = true; h = "TRACK'S DIGGING IN · ease off the throttle"; }
  else if (sarRideHint()) { show = true; h = sarRideHint(); }
  else if (RJ.on && rescueRideHint()) { show = true; h = rescueRideHint(); }
  else if (FISH && !FISH.on) { const fh = FISH.hint(); if (fh) { show = true; h = fh; } }
  if (HELP.on && HELP.kind === "fuel") { show = true; h = (h ? h + " · " : "") + (HELP.called ? `FUEL DELIVERY IN ${Math.max(0, Math.ceil(HELP.eta - HELP.t))} s` : ""); }
  WN.hint = h; WN.show = show;
}
function updWinchHud() {
  const el = $("wnHud"); if (!el) return;
  const wd = winchDef(), on = !!WN.show && !GS.dead && !showroomOn();
  el.hidden = !on; if (!on) return;
  const hooked = WN.state === "hooked" && wd;
  el.classList.toggle("tense", hooked && WN.tens > 0.85);
  $("wnHint").textContent = WN.hint;
  $("wnGauge").hidden = !hooked;
  if (hooked) { $("wnTens").style.width = clamp(WN.tens * 100, 0, 100).toFixed(0) + "%"; $("wnRead").textContent = `${lbf(WN.need).toLocaleString("en-US")} / ${lbf(WN.cap).toLocaleString("en-US")} lb${WN.dbl ? " · doubled" : ""}${WN.hold ? ` · sled ${WN.slip > 0.05 ? "slipping" : "holding"}` : ""}`; }
}

/* ---------------- search and rescue: the Rescue school's missions and the on-duty career (winter update O5) ----------------
   One engine, SAR, runs a "case": a person somewhere out there, how they got there, and a survival clock. The
   Rescue school's four missions are cases built round the yard; on duty, callouts are cases built round you.

   The clock is the victim's own core warmth, 100 → 0. It drains with the same cold your rider feels (night, storm,
   height: sarAmb), measured where THEY are, scaled so that at the conditions when the case opened it lasts T0 real
   seconds. A storm rolling over them shortens it live. Where they are changes the rate:
     out there ×1 · pillion behind you ×0.6 · strapped in the rescue toboggan ×0.25 ·
     your stove or thermos lit and you stopped with them: they WARM (+0.8 × your camp rate) ·
     you stopped at any warm place (a site, the rescue base, a school yard) with them aboard: SAVED.
   Zero and the Sea King from Banak lifts them off: no pay, reputation lost (or, at school, run it again).

   Kinds:  search  a lost hiker in the birch. Last-known point, an expanding-square search pattern, a line of boot
                   prints and a dropped glove that each shrink the search circle. Within ~30 m you find them.
           rescue  a rider stranded on a steep slope. Ride up, or walk up (Q) and E: they lean on you back to the sled.
           tow     a sled bogged or ditched. The existing recovery code (RJ) runs the winch job; when it comes free
                   you rig a tow rope (E at their sled) and haul the dead sled to a cabin, the rider pillion.
           save    a hypothermia case. Only the rescue toboggan (hitch "akja") will do: stop by them, or walk up and E,
                   and they're bagged and strapped in. Roll the toboggan and they lose a quarter of their time. */
const SAR_KINDS = {
  search: { name: "Search", chip: "SEARCH", base: 170, work: 240, slack: 1.75, back: 0.6, who: "hiker" },
  rescue: { name: "Rescue", chip: "RESCUE", base: 135, work: 90, slack: 1.8, back: 0.6, who: "rider" },
  tow: { name: "Tow", chip: "TOW · HITCH", base: 160, work: 210, slack: 1.9, back: 0.6, who: "rider" },
  save: { name: "Save", chip: "SAVE · COLD", base: 190, work: 45, slack: 1.5, back: 0.25, who: "casualty" }
};
// reputation 0..100: what dispatch thinks of you. Higher pays more, and sends you further and harder.
const SAR_RANKS = [
  { at: 0, name: "Probationer" }, { at: 15, name: "Crew member" }, { at: 35, name: "Team leader" }, { at: 60, name: "Duty officer" }, { at: 85, name: "Rescue coordinator" }
];
const sarRank = r => SAR_RANKS.reduce((a, x) => r >= x.at ? x : a, SAR_RANKS[0]);
const SAR_RATE = { pillion: 0.6, tow: 0.6, akja: 0.25 };
const SAR_PAX = 80;                                       // kg of person on the seat or in the toboggan
// SAR itself is declared up with LOG, because load() runs before this block
const sarLic = () => licensed("rescue");
const sarAboard = c => c && (c.v.state === "pillion" || c.v.state === "tow" || c.v.state === "akja");
function sarPatientKg() { return SAR.cur && SAR.cur.v.state === "akja" ? SAR_PAX : 0; }
// how cold it is where they are (the rider's own formula, without your kit)
function sarAmb(x, z) {
  const night = 1 - dayFactor(), elev = clamp((groundAt(x, z) - 110) / 220, 0, 1);
  return 0.3 + 0.35 * night + 0.9 * clamp(WX.at(x, z), 0, 1.2) + 0.35 * elev;
}
// the nearest place that's warm: a village, cabin, home, the quay, or the rescue base
function sarWarmest(x, z) {
  let b = null, bd = 1e9;
  for (const s of SITES) { if (s.x === undefined) continue; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; b = s; } }
  const rb = SCHOOLS.rescue; if (rb.x !== undefined) { const d = Math.hypot(rb.x - x, rb.z - z); if (d < bd) { bd = d; b = { name: rb.name, x: rb.x, z: rb.z + 6, base: true }; } }
  return { s: b, d: bd };
}
const sarCabin = (x, z) => { let b = null, bd = 1e9; for (const s of SITES) { if (s.x === undefined || s.type === "shop") continue; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; b = s; } } return { s: b, d: bd }; };
const sarCard = (x0, z0, x1, z1) => { const b = (Math.atan2(x1 - x0, z1 - z0) * 180 / Math.PI + 360) % 360; return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(b / 45) % 8]; };
const sarLeft = c => { const r = sarRateNow(c); return r > 0 ? c.v.core / r : Infinity; };
const fmtMS = s => !isFinite(s) ? "warming" : Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

/* -- finding places for them in the terrain -- */
const sarLand = (x, z) => Math.abs(x) < HALF - 400 && Math.abs(z) < HALF - 400 && bioAt(x, z) !== 3 && bioAt(x, z) !== 1;
const sarClearOfSites = (x, z, R) => { for (const s of SITES) if (s.x !== undefined && Math.hypot(s.x - x, s.z - z) < R) return false; for (const s of schoolList()) if (s.x !== undefined && Math.hypot(s.x - x, s.z - z) < R) return false; return true; };
function sarRing(cx, cz, rMin, rMax, ok, tries = 2500) {
  for (let i = 0; i < tries; i++) {
    const a = Math.random() * 6.283, d = rMin + Math.random() * (rMax - rMin), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (ok(x, z)) return { x, z };
  }
  return null;
}
// in the birch: a forest cell with trees round it, gentle enough to walk
const sarForestOk = (x, z) => sarLand(x, z) && bioAt(x, z) === 2 && slopeAt(x, z, 5) < 0.4 && treesIn(x, z, 14).length >= 3 && sarClearOfSites(x, z, 120);
const sarTreesOk = (x, z) => sarLand(x, z) && slopeAt(x, z, 5) < 0.4 && treesIn(x, z, 18).length >= 2 && sarClearOfSites(x, z, 120);
// steep: a slope a sled won't idle up, but a person can walk
const sarSteepOk = (x, z) => { if (!sarLand(x, z) || !sarClearOfSites(x, z, 120)) return false; const s = slopeAt(x, z, 5); return s > 0.42 && s < 0.72; };
// out on the open fell: wind, nothing to shelter behind
const sarOpenOk = (x, z) => sarLand(x, z) && bioAt(x, z) === 0 && slopeAt(x, z, 5) < 0.3 && sarClearOfSites(x, z, 200);
function sarTowSite(cx, cz, rMin, rMax) {
  for (let i = 0; i < 3000; i++) {
    const a = Math.random() * 6.283, d = rMin + Math.random() * (rMax - rMin), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (!sarClearOfSites(x, z, 100)) continue;
    const s = trapProbe(i % 3 ? "bog" : "ditch", x, z); if (s) return s;
  }
  return null;
}
// the search: hiker H, last-known point L, a line of prints toward H and a glove near it
function sarPlanSearch(hx, hz, offMin, offMax) {
  let L = null, tracks = null, glove = null;
  for (let i = 0; i < 60 && !L; i++) { const a = Math.random() * 6.283, d = offMin + Math.random() * (offMax - offMin), x = hx + Math.cos(a) * d, z = hz + Math.sin(a) * d; if (sarLand(x, z) && slopeAt(x, z, 5) < 0.5) L = { x, z }; }
  if (!L) L = { x: hx + offMin, z: hz };
  const dL = Math.hypot(L.x - hx, L.z - hz), ux = (L.x - hx) / dL, uz = (L.z - hz) / dL;
  // the prints start part way from L toward H, wander a little, and stop 12 m short of them
  for (let i = 0; i < 30 && !tracks; i++) {
    const t0 = 0.45 + Math.random() * 0.2, a = (Math.random() - 0.5) * 1.2, ca = Math.cos(a), sa = Math.sin(a), dx = ux * ca - uz * sa, dz = ux * sa + uz * ca;
    const sx = hx + dx * dL * t0, sz = hz + dz * dL * t0; if (!sarLand(sx, sz)) continue;
    const pts = [], n = Math.max(6, Math.round((dL * t0 - 12) / 0.75)), wob = Math.random() * 6;
    for (let k = 0; k <= n; k++) { const f = k / n, px = lerp(sx, hx + dx * 12, f), pz = lerp(sz, hz + dz * 12, f), w = Math.sin(f * 7 + wob) * 2.2; pts.push({ x: px - dz * w, z: pz + dx * w }); }
    tracks = { pts, x: sx, z: sz };
  }
  for (let i = 0; i < 40 && !glove; i++) { const a = Math.random() * 6.283, d = 40 + Math.random() * 30, x = hx + Math.cos(a) * d, z = hz + Math.sin(a) * d; if (sarLand(x, z)) glove = { x, z }; }
  if (!glove) glove = { x: hx + 45, z: hz };
  return { L, R: Math.ceil(dL + 55), tracks, glove };
}
// an expanding square from the centre: legs d, d, 2d, 2d, 3d, 3d ... turning right each time
function sarPattern(cx, cz, d, max) {
  const out = [], dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  let x = cx, z = cz;
  for (let i = 0; i < 14; i++) { const L = d * (1 + (i >> 1)); x += dirs[i % 4][0] * L; z += dirs[i % 4][1] * L; if (Math.hypot(x - cx, z - cz) > max * 1.45) break; out.push({ x, z }); }
  return out;
}

/* -- the people: one figure (reused), a crashed sled for the rescue kind, prints and a glove for the search -- */
function sarFigure() {
  if (SAR.foot) return SAR.foot;
  const kit = { jacket: std(0xd0441e, 0.8), pants: std(0x2a3340, 0.85), trim: std(0xe8eef4, 0.5), helmet: std(0x3a5a7a, 0.6), visor: std(0x1a2027, 0.3), glove: std(0x1a1d22, 0.9), boot: std(0x3a2a1a, 0.9), skin: std(0xd9a27e, 0.8) };
  const fig = makeFigure(kit); fig.visible = false; scene.add(fig);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 44, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.4, depthWrite: false, fog: false }));
  col.visible = false; scene.add(col);
  const sled = npcSledMesh(0x2a7ad0, 0x2b3d5c, true); sled.visible = false; scene.add(sled);
  // a lamp: a hiker's headtorch, so you can spot them at night once you're close
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff2c0 })); lamp.position.set(0, 1.72, 0.14); fig.add(lamp);
  SAR.foot = { fig, col, sled, lamp, kit }; return SAR.foot;
}
function sarPillion() {
  if (SAR.pill) return SAR.pill;
  const f = sarFigure(), fig = makeFigure(f.kit); fig.visible = false; sledBody.add(fig);
  SAR.pill = fig; return fig;
}
function sarPrints() {
  if (SAR.prints) return SAR.prints;
  const g = new THREE.PlaneGeometry(0.15, 0.3); g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshBasicMaterial({ color: 0x5a6a80, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const im = new THREE.InstancedMesh(g, m, 320); im.count = 0; im.frustumCulled = false; scene.add(im);
  const gl = new THREE.Group(), red = std(0xc81e1e, 0.85);
  { const a = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.2), red); a.position.y = 0.02; gl.add(a); const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.09), red); b.position.set(0.07, 0.02, 0.06); b.rotation.y = -0.6; gl.add(b); }
  gl.visible = false; scene.add(gl);
  SAR.prints = im; SAR.glove = gl; return im;
}
function sarPlacePrints(pts) {
  const im = sarPrints(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), Pp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let n = 0;
  for (let i = 0; i + 1 < pts.length && n < 320; i++) {
    const a = pts[i], b = pts[i + 1], yaw = Math.atan2(b.x - a.x, b.z - a.z), side = (i & 1) ? 0.13 : -0.13, lx = Math.cos(yaw), lz = -Math.sin(yaw);
    const x = a.x + lx * side, z = a.z + lz * side; Q.setFromAxisAngle(up, yaw); Pp.set(x, surf(x, z) + 0.04, z);
    im.setMatrixAt(n++, M4.compose(Pp, Q, S));
  }
  im.count = n; im.instanceMatrix.needsUpdate = true;
}
function sarHideProps() {
  if (SAR.foot) { SAR.foot.fig.visible = false; SAR.foot.col.visible = false; SAR.foot.sled.visible = false; }
  if (SAR.prints) SAR.prints.count = 0; if (SAR.glove) SAR.glove.visible = false;
  if (SAR.pill) SAR.pill.visible = false; if (SAR.rope) SAR.rope.visible = false;
}

/* -- building a case -- */
const SAR_HIKERS = ["day hiker", "cross-country skier", "photographer after the aurora", "ptarmigan hunter", "birdwatcher"];
// kind, where it's built round (cx, cz) and how far out; returns the case without anything in the world yet, or null
function sarMake(kind, o) {
  const K = SAR_KINDS[kind], name = pick(R_NAMES), c = { id: ++SAR.seq, kind, school: !!o.school, name, v: null, s: null, res: null };
  let at = null;
  if (kind === "search") {
    at = sarRing(o.cx, o.cz, o.rMin, o.rMax, sarForestOk) || sarRing(o.cx, o.cz, o.rMin, o.rMax, sarTreesOk);
    if (!at) return null;
    const pl = sarPlanSearch(at.x, at.z, o.school ? 80 : 110, o.school ? 130 : 210);
    c.s = { L: pl.L, tracks: pl.tracks, glove: pl.glove, area: { x: pl.L.x, z: pl.L.z, r: pl.R }, pat: null, pi: 0, clue: { tracks: false, glove: false }, heard: false };
    c.who = pick(SAR_HIKERS);
  } else if (kind === "rescue") {
    at = sarRing(o.cx, o.cz, o.rMin, o.rMax, sarSteepOk); if (!at) return null; c.who = "rider";
  } else if (kind === "save") {
    at = sarRing(o.cx, o.cz, o.rMin, o.rMax, sarOpenOk) || sarRing(o.cx, o.cz, o.rMin, o.rMax, (x, z) => sarLand(x, z) && slopeAt(x, z, 5) < 0.35 && sarClearOfSites(x, z, 150));
    if (!at) return null; c.who = pick(["walker", "herder", "skier", "ice fisherman"]);
  } else if (kind === "tow") {
    const site = sarTowSite(o.cx, o.cz, o.rMin, o.rMax); if (!site) return null;
    at = { x: site.x, z: site.z }; c.site = site; c.who = "rider";
    const vk = VICTIMS[0], pull = vk.mass * GR * (TRAPS[site.kind].mu + site.slope * 1.1), reach = site.dist * 0.7 + 3.5;
    c.needTier = pull > WINCH[2].pull * 0.85 || reach > WINCH[2].len - 0.6 ? 3 : pull > WINCH[1].pull * 0.8 || reach > WINCH[1].len - 0.6 ? 2 : 1;
    if (!o.school && ST.winch < c.needTier) return null;
  }
  c.x = at.x; c.z = at.z;
  const from = { x: o.fx === undefined ? o.cx : o.fx, z: o.fz === undefined ? o.cz : o.fz }, out = Math.hypot(c.x - from.x, c.z - from.z);
  const w = kind === "tow" ? sarCabin(c.x, c.z) : sarWarmest(c.x, c.z), back = o.school ? Math.hypot(c.x - o.cx, c.z - o.cz) : w.d;
  c.near = nearestSiteName(c.x, c.z); c.dest = w.s; c.out = out; c.back = back;
  const rep = SAR.rep, slack = o.school ? K.slack * 1.15 : K.slack * (1.12 - rep / 100 * 0.3);
  c.T0 = Math.round(o.T0 || (out / 11 + K.work + K.back * back / (kind === "tow" ? 7 : 10)) * slack);
  c.pay = o.school ? 0 : round5((K.base + 70 * out / 1000 + 30 * back / 1000) * (1 + rep / 125));
  const dir = sarCard(sarWarmest(c.x, c.z).s.x, sarWarmest(c.x, c.z).s.z, c.x, c.z);
  c.why = kind === "search" ? `${name}, a ${c.who}, hasn't come back. Last seen heading into the woods ${dir} of ${c.near}.`
    : kind === "rescue" ? `${name} rolled their sled on a steep slope near ${c.near} and can't get it back up. Cold, a bit banged up.`
    : kind === "tow" ? `${name}'s sled is ${TRAPS[c.site.kind].say} near ${c.near}, and the track's done for. Winch it out and tow it to ${c.dest ? shortName(c.dest) : "a cabin"}.`
    : `Someone found ${name}, a ${c.who}, on the open fell near ${c.near}: hypothermic, barely talking. Toboggan, and somewhere warm, fast.`;
  return c;
}
// the four school missions use the same thing with their spots fixed by the plan
function sarSchoolCase(kind, plan) {
  const c = { id: ++SAR.seq, kind, school: true, name: plan.name, who: kind === "search" ? "hiker" : kind === "save" ? "casualty" : "rider", x: plan.x, z: plan.z, s: null, res: null, near: "the base", T0: plan.T0, pay: 0 };
  if (kind === "search") c.s = { L: plan.L, tracks: plan.tracks, glove: plan.glove, area: { x: plan.L.x, z: plan.L.z, r: plan.R }, pat: null, pi: 0, clue: { tracks: false, glove: false }, heard: false };
  if (kind === "tow") { c.site = plan.site; c.needTier = 1; }
  c.dest = { name: SCHOOLS.rescue.name, x: SCHOOLS.rescue.x, z: SCHOOLS.rescue.z + 6, base: true };
  return c;
}
// put them in the world
function sarOpen(c) {
  sarHideProps();
  const f = sarFigure(), yaw = Math.random() * 6.283;
  c.v = { state: "waiting", core: 100, x: c.x, z: c.z, yaw, step: 0, wave: 0, boardT: 0, loadT: 0 };
  c.amb0 = Math.max(0.3, sarAmb(c.x, c.z)); c.ambN = c.amb0; c.ambT = 0; c.t = 0; c.warmT = 0;
  if (c.kind === "search") {
    c.v.state = "lost";
    const s = c.s; s.pat = sarPattern(s.area.x, s.area.z, 60, s.area.r); s.pi = 0;
    if (s.tracks) sarPlacePrints(s.tracks.pts);
    sarPrints(); SAR.glove.position.set(s.glove.x, surf(s.glove.x, s.glove.z) + 0.01, s.glove.z); SAR.glove.rotation.y = Math.random() * 6; SAR.glove.visible = true;
    f.fig.visible = true; f.lamp.visible = true;
  } else if (c.kind === "rescue") {
    f.fig.visible = true; f.lamp.visible = false; f.sled.visible = true;
    const gx = (groundAt(c.x + 3, c.z) - groundAt(c.x - 3, c.z)) / 6, gz = (groundAt(c.x, c.z + 3) - groundAt(c.x, c.z - 3)) / 6;
    c.sledYaw = Math.atan2(gx, gz) + Math.PI / 2;           // across the fall line, rolled onto its side
    f.sled.position.set(c.x, surf(c.x, c.z) + 0.15, c.z); f.sled.rotation.set(0, c.sledYaw, 1.25, "YXZ");
    c.v.x = c.x + Math.cos(c.sledYaw) * 2.2; c.v.z = c.z - Math.sin(c.sledYaw) * 2.2;
    f.col.visible = true;
  } else if (c.kind === "save") {
    f.fig.visible = true; f.lamp.visible = false; f.col.visible = true;
  } else if (c.kind === "tow") {
    c.v.state = "stuck"; f.fig.visible = false;
    sarRjStart(c);
  }
  SAR.cur = c; SAR.rollT = false;
}
// the tow kind runs the old recovery job for the winching part (rjTick, rescueReel, the prompts); the case owns the clock
function sarRjStart(c) {
  const vk = VICTIMS[0], dest = { id: "sar" + c.id, type: "sos", x: c.x, z: c.z, y: c.site.g0, name: c.name };
  const rj = { rescue: true, sar: c.id, dest, cargo: `Rescue: ${c.name}`, why: c.why, pay: 0, due: GS.hour + 1e6, need: "winch", needTier: c.needTier, reach: Math.round(c.site.dist * 0.7 + 3.5), comps: [], names: [c.name], vics: [{ site: c.site, vk }], trap: c.site.kind };
  rjBuildPool(); for (const p of RJ.pool) { p.sled.visible = false; p.fig.visible = false; p.col.visible = false; }
  GS.rescueJob = rj; RJ.on = true; RJ.hurt = 0; RJ.blown = 0; RJ.stall = 0; RJ.t0 = GS.hour; RJ.ended = null;
  RJ.vs = rj.vics.map((_, i) => rjSpawn(rj, i));
  c.rj = rj;
}
// called by rjFreed when the sled that came free belongs to a rescue case
function sarFreed(v) {
  const c = SAR.cur; if (!c || c.kind !== "tow") return;
  c.v.state = "rig"; c.rv = v;
  toast(`${c.name}'s sled is out. The track's in pieces: walk to it and press E to rig the tow rope to your hitch.`, "good");
}
function sarRig() {
  const c = SAR.cur, v = c.rv; if (!v) return;
  const [hx, hz] = sarTowAnchor(), L = 7;
  v.x = hx - Math.sin(P.yaw) * L; v.z = hz - Math.cos(P.yaw) * L; v.yaw = P.yaw; v.towed = true;
  if (WN.mode === "rescue" && WN.state !== "stowed") wnStow(true);
  c.v.state = "tow"; c.v.x = P.x; c.v.z = P.z;
  toast(`Rope rigged. ${c.name} climbs on behind you. Tow it to ${c.dest ? shortName(c.dest) : "a cabin"}: steady, it drags.`, "good");
}
// where the tow rope ties on: your hitch, or the back of whatever's already on it
function sarTowAnchor() {
  if (TOW.kind && HITCH[TOW.kind]) { const H = HITCH[TOW.kind], b = H.len * 0.9; return [TOW.x - Math.sin(TOW.yaw) * b, TOW.z - Math.cos(TOW.yaw) * b]; }
  return hitchPt();
}
// every physics step while towing: the dead sled follows on a 7 m rope, drags, and snags on trees
function sarTowStep(dt) {
  const c = SAR.cur; if (!c || c.v.state !== "tow" || !c.rv) return;
  const v = c.rv, [ax, az] = sarTowAnchor(), L = 7;
  let dx = ax - v.x, dz = az - v.z, d = Math.hypot(dx, dz) || 1;
  const x0 = v.x, z0 = v.z;
  if (d > L) { v.x = ax - dx / d * L; v.z = az - dz / d * L; }
  // trees and rocks: push it out, and it bites
  let snag = 0;
  const gxi = Math.floor((v.x + HALF) / OBC), gzi = Math.floor((v.z + HALF) / OBC);
  for (let j = gzi - 1; j <= gzi + 1; j++) for (let i = gxi - 1; i <= gxi + 1; i++) {
    const a = obGrid.get(j * OBW + i); if (!a) continue;
    for (const o of a) { if (o.parked) continue; const ox = v.x - o.x, oz = v.z - o.z, rr = o.r + 0.8, o2 = ox * ox + oz * oz; if (o2 < rr * rr && o2 > 1e-6) { const od = Math.sqrt(o2); v.x = o.x + ox / od * rr; v.z = o.z + oz / od * rr; snag = 1; } }
  }
  const sp = Math.hypot(v.x - x0, v.z - z0) / dt; c.towSp = sp;
  if (sp > 0.3) v.yaw = angLerp(v.yaw, Math.atan2(ax - v.x, az - v.z), 1 - Math.exp(-4 * dt));
  const taut = d > L - 0.05 ? 1 : 0;
  TOW.drag += taut * (clamp(sp / 5, 0.25, 1) * (260 + 1.15 * v.mass) + 4.5 * sp * sp + snag * 1900);   // a dead sled on a rope bucks and ploughs: fast gets expensive
  TOW.mass += taut * v.mass * 0.55;
  if (snag && sp > 3 && gameClock - (c.snagT || -9) > 4) { c.snagT = gameClock; thud(0.4); toast(`${c.name}'s sled snagged a tree. Ease off and pull it round.`, "warn"); }
}

/* -- the clock -- */
function sarRateNow(c) {
  const st = c.v.state, base = 100 / c.T0 * (c.ambN / c.amb0), mul = SAR_RATE[st] || 1;
  const withYou = sarAboard(c) || Math.hypot(c.v.x - P.x, c.v.z - P.z) < 6;
  if (GS.camping && withYou) return -0.8 * Math.max(0.6, ST.camp) * (1 - 0.5 * GS.storm);   // your stove or thermos does them good too
  if (sarAboard(c) && sarWarmHere(c)) return -2;
  return base * mul;
}
// a warm place you're stopped at: any site (cabin, village, home, the quay), the rescue base, or for school, the yard
function sarWarmHere(c) {
  if (c.school) return atYard(SCHOOLS.rescue);
  if (c.kind === "tow") return !!GS.near && GS.near.type !== "shop";
  return !!GS.near || SCHOOL.here === SCHOOLS.rescue;
}
function sarTick(dt, spd) {
  sarDispatch(dt);
  const c = SAR.cur; if (!c || c.res) { sarVisual(dt); return; }
  c.t += dt;
  c.ambT += dt; if (c.ambT > 0.5) { c.ambT = 0; const at = sarAboard(c) ? P : c.v; c.ambN = Math.max(0.25, sarAmb(at.x, at.z)); }
  const v = c.v, dP = Math.hypot(v.x - P.x, v.z - P.z), dF = FOOT.on ? Math.hypot(v.x - FOOT.x, v.z - FOOT.z) : 1e9;
  // the clock
  v.core = Math.min(100, v.core - sarRateNow(c) * dt);
  if (!c.warn && v.core < 25) { c.warn = true; toast(`${c.name} is fading. ${fmtMS(sarLeft(c))} left, roughly.`, "bad"); }
  if (v.core <= 0) { sarEnd(false, c.school ? `${c.name} would not have made it.` : `Too late for us. The Sea King from Banak lifted ${c.name} off; they'll pull through, no thanks to us.`); return; }
  // the toboggan rolled with them in it
  if (v.state === "akja") {
    if (TOW.tipT > 2 && !SAR.rollT) { SAR.rollT = true; v.core *= 0.75; toast(`The toboggan rolled with ${c.name} in it! They've lost a quarter of what they had left. Steady.`, "bad"); }
    else if (TOW.tipT <= 0) SAR.rollT = false;
    if (GS.own.parts.hitch !== "akja") { v.state = "waiting"; v.x = P.x + 2; v.z = P.z; toast(`${c.name} is back on the snow. The toboggan's off the hitch.`, "warn"); }
  }
  // the search: clues, the pattern, the whistle, then finding them
  if (v.state === "lost") {
    const s = c.s, me = FOOT.on ? FOOT : P;
    if (s.tracks && !s.clue.tracks) for (let i = 0; i < s.tracks.pts.length; i += 3) { const q = s.tracks.pts[i]; if (Math.hypot(q.x - me.x, q.z - me.z) < 9) { sarClue(c, "tracks"); break; } }
    if (!s.clue.glove && Math.hypot(s.glove.x - me.x, s.glove.z - me.z) < 12) sarClue(c, "glove");
    const wp = s.pat[s.pi]; if (wp && Math.hypot(wp.x - me.x, wp.z - me.z) < 28) { s.pi++; if (s.pi >= s.pat.length) { s.pat = sarPattern(s.area.x, s.area.z, 45, s.area.r + 60); s.pi = 0; toast("Pattern done. Dispatch widens it: round again, bigger."); } }
    const dH = Math.min(dP, dF), see = 32 * (1 - 0.35 * clamp(GS.storm, 0, 1)) * (dayFactor() < 0.3 ? 0.85 : 1);
    if (!s.heard && dH < 75) { s.heard = true; toast(`A whistle, three short blasts, somewhere to the ${sarCard(me.x, me.z, v.x, v.z)}.`, "warn"); }
    if (dH < see) { v.state = "waiting"; whump(0.2); toast(`Found! ${c.name} is under the trees, shaking and very glad to see you. ${FOOT.on ? "E to help them up." : "Stop beside them."}`, "good"); }
  }
  // picking them up: stop beside them on the sled, or walk up and press E (sarFootAction)
  if (v.state === "waiting" && !FOOT.on && dP < 7.5 && spd < 1.5) {
    if (c.kind === "save") {
      if (GS.own.parts.hitch === "akja" && Math.hypot(TOW.x - v.x, TOW.z - v.z) < 9) { v.state = "loading"; v.loadT = 0; toast(`Hold still. Bagging ${c.name} and strapping them into the toboggan.`); }
      else if (gameClock - (c.nagT || -9) > 6) { c.nagT = gameClock; toast(GS.own.parts.hitch === "akja" ? "Swing the toboggan in beside them." : `${c.name} can't hold on pillion like this. It's a job for the rescue toboggan.`, "warn"); }
    } else { v.boardT += dt; if (v.boardT > 1) sarBoard(c); }
  } else if (v.state === "waiting") v.boardT = 0;
  if (v.state === "loading") {
    v.loadT += dt;
    if (!FOOT.on && spd > 2) { v.state = "waiting"; toast("You moved off. They're not strapped in yet!", "warn"); }
    else if (v.loadT > 3.5) { v.state = "akja"; toast(`${c.name} is in the bag and strapped down. Get them somewhere warm.${c.dest && !c.school ? " Nearest: " + shortName(c.dest) + "." : ""}`, "good"); }
  }
  if (v.state === "follow") {
    const tx = FOOT.on ? FOOT.x : P.x, tz = FOOT.on ? FOOT.z : P.z, d = Math.hypot(tx - v.x, tz - v.z);
    const sp = d > 2.2 ? Math.min(1.7, d - 1.4) : 0;
    if (sp > 0) { v.x += (tx - v.x) / d * sp * dt; v.z += (tz - v.z) / d * sp * dt; v.yaw = Math.atan2(tx - v.x, tz - v.z); v.step += sp * dt * 3.6; }
    v.sp = sp;
    if (!FOOT.on && Math.hypot(v.x - P.x, v.z - P.z) < 4.5) sarBoard(c);
  }
  if (sarAboard(c)) { v.x = P.x; v.z = P.z; }
  // delivered
  if (sarAboard(c) && !FOOT.on && spd < 3 && sarWarmHere(c)) {
    c.warmT += dt; if (c.warmT > 0.8) { sarEnd(true); return; }
  } else c.warmT = 0;
  sarVisual(dt);
}
function sarBoard(c) {
  c.v.state = "pillion"; c.v.boardT = 0;
  toast(`${c.name} climbs on behind you and grabs hold. Get them somewhere warm.${c.dest && !c.school ? " Nearest: " + shortName(c.dest) + "." : ""}`, "good");
}
function sarClue(c, k) {
  const s = c.s; s.clue[k] = true;
  const ox = (Math.random() - 0.5) * 50, oz = (Math.random() - 0.5) * 50;
  if (k === "tracks") { s.area = { x: c.v.x + ox * 0.8, z: c.v.z + oz * 0.8, r: s.clue.glove ? 55 : 80 }; toast(`Boot prints, fresh, one person, heading ${sarCard(s.tracks.pts[0].x, s.tracks.pts[0].z, c.v.x, c.v.z)}. Search area narrowed.`, "good"); }
  else { s.area = { x: s.glove.x, z: s.glove.z, r: s.clue.tracks ? 55 : 78 }; toast(`A red glove in the snow, still a little warm inside. ${c.name} is close: within 80 m.`, "good"); }
  s.pat = sarPattern(s.area.x, s.area.z, 28, s.area.r); s.pi = 0;
}
// how it ends. School cases just record it; the course runner passes or fails the mission and cleans up.
function sarEnd(ok, why) {
  const c = SAR.cur; if (!c || c.res) return;
  c.res = ok ? "pass" : "fail"; c.why2 = why || "";
  if (c.school) { if (ok) toast(`${c.name} is inside and thawing. Instructor: "That'll do."`, "good"); return; }
  const left = c.v.core;
  if (ok) {
    const pay = Math.round(c.pay * (0.85 + 0.35 * left / 100) * payMul()), dr = Math.round(4 + 4 * left / 100);
    GS.cash += pay; SAR.n++; LOG.sar = (LOG.sar || 0) + 1;
    const before = rrank(GS.rescues || 0); GS.rescues = (GS.rescues || 0) + 1; const after = rrank(GS.rescues);
    const r0 = sarRank(SAR.rep); SAR.rep = clamp(SAR.rep + dr, 0, 100); const r1 = sarRank(SAR.rep);
    toast(`${c.name} is safe and thawing out${GS.near ? " at " + shortName(GS.near) : ""}. +$${pay}${payMul() > 1 ? " (polar night ×1.5)" : ""} · reputation +${dr} (${Math.round(SAR.rep)}).`, "good");
    if (r1 !== r0) setTimeout(() => toast(`Dispatch has you down as ${r1.name} now. Better calls, better money.`, "good"), 2400);
    else if (after !== before) setTimeout(() => toast(`New rescue rank: ${after.name}. ${after.opens || ""}`, "good"), 2400);
  } else {
    SAR.lost++; LOG.sarLost = (LOG.sarLost || 0) + 1; SAR.rep = clamp(SAR.rep - 6, 0, 100);
    toast(`${why} Reputation −6 (${Math.round(SAR.rep)}).`, "bad");
  }
  sarClear(); save(); TABLET.refresh("rescue");
}
// take everything back out of the world
function sarClear() {
  const c = SAR.cur;
  if (c && c.rj && GS.rescueJob === c.rj) rescueAbort();
  if (c && c.rv) c.rv.towed = false;
  sarHideProps(); SAR.cur = null; SAR.coolT = gameClock;
}
// blackout, a new game, the summer: the case goes to someone else
function sarAbort(why) {
  if (SAR.ping && SAR.ping.n) SAR.ping.n.dismiss(); SAR.ping = null;
  const c = SAR.cur; if (!c || c.school) return;
  if (why === "blackout") { SAR.lost++; LOG.sarLost = (LOG.sarLost || 0) + 1; SAR.rep = clamp(SAR.rep - 6, 0, 100); setTimeout(() => toast(`The Red Cross crew took ${c.name} in with you. Reputation −6.`, "bad"), 4600); }
  sarClear();
}
function sarHandOver() {
  const c = SAR.cur; if (!c || c.school) return;
  SAR.rep = clamp(SAR.rep - 4, 0, 100); SAR.lost++;
  toast(`You hand ${c.name} over to the next crew. Reputation −4 (${Math.round(SAR.rep)}).`, "warn");
  sarClear(); save(); TABLET.refresh("rescue");
}

/* -- on duty: dispatch -- */
// storm over you (or close by) and polar night raise the odds; one ping at a time, 30 s to answer it
function sarStormNear() { let s = WX.at(P.x, P.z); for (const [dx, dz] of [[1500, 0], [-1500, 0], [0, 1500], [0, -1500]]) s = Math.max(s, WX.at(P.x + dx, P.z + dz) * 0.8); return clamp(s, 0, 1.2); }
function sarOdds() { return (1 / 210) * (1 + 2 * sarStormNear()) * (CAL.isPolarNight() ? 1.25 : 1); }   // per real second
const sarPerHour = () => 1 - Math.pow(1 - sarOdds(), GAMEHOUR);
function sarBusy() { return !!(SAR.cur || SCHOOL.on || GS.tour || GS.rescueJob || GS.dead || HELP.on || (typeof SEASON !== "undefined" && SEASON.card)); }
function sarDispatch(dt) {
  if (!SAR.duty || !sarLic() || SAR.ping || sarBusy() || gameClock - SAR.coolT < 40) return;
  SAR.odT += dt; if (SAR.odT < 1) return;
  const p = 1 - Math.pow(1 - sarOdds(), SAR.odT); SAR.odT = 0;
  if (Math.random() < p) sarOffer();
}
function sarOffer(force) {
  const pool = [{ k: "search", w: 3 }, { k: "rescue", w: 3 }];
  if (ST.winch >= 1) pool.push({ k: "tow", w: 2.5 });
  if (GS.own.parts.hitch === "akja") pool.push({ k: "save", w: 3 });
  if (force && pool.some(q => q.k === force)) { for (const q of pool) q.w = q.k === force ? 1 : 0; }
  const rMax = 1500 + SAR.rep * 11;
  let c = null;
  for (let t = 0; t < 4 && !c; t++) { const k = wpick(pool).k; c = sarMake(k, { cx: P.x, cz: P.z, rMin: 600, rMax }); }
  if (!c) return null;
  const K = SAR_KINDS[c.kind], km = (c.out / 1000).toFixed(1), dir = sarCard(P.x, P.z, c.x, c.z), cx = c.kind === "search" ? c.s.L : c;
  const n = TABLET.notify({ app: "rescue", kind: "alert", ttl: 30,
    title: `CALLOUT · ${K.name.toUpperCase()} · ${km} km ${dir}`,
    body: `${c.why} About ${fmtMS(c.T0)} of survival time. ~${fmtCash(c.pay * payMul())}.${c.kind === "tow" ? ` Needs a ${["", "hand", "electric", "heavy-duty"][c.needTier]} winch or better.` : ""}`,
    actions: [{ label: "ACCEPT", do: () => sarAccept(c) }, { label: "Decline", do: () => sarMiss(c, true) }],
    onExpire: () => sarMiss(c, false) });
  SAR.ping = { c, n, x: cx.x, z: cx.z, t0: gameClock };
  return c;
}
function sarMiss(c, declined) {
  if (!SAR.ping || SAR.ping.c !== c) return;
  SAR.ping = null; SAR.miss++; SAR.ign++; SAR.coolT = gameClock - 15;
  if (SAR.miss >= 2) { SAR.rep = clamp(SAR.rep - 2, 0, 100); toast(`Dispatch: "That's ${SAR.miss} in a row from you." Another crew takes it. Reputation −2 (${Math.round(SAR.rep)}).`, "warn"); }
  else toast(declined ? "Declined. Another crew's taking it." : "No answer. Another crew's taking it.");
  save(); TABLET.refresh("rescue");
}
function sarAccept(c) {
  if (!SAR.ping || SAR.ping.c !== c) return;
  if (sarBusy()) { toast(GS.tour ? "Not with tourists on the back. Another crew's taking it." : "You're tied up. Another crew's taking it.", "warn"); SAR.ping = null; SAR.coolT = gameClock; return; }
  SAR.ping = null; SAR.miss = 0;
  sarOpen(c);
  toast(`Accepted. ${c.why}`, "warn");
  setTimeout(() => { if (SAR.cur === c) toast(c.kind === "search" ? "The search area and the pattern are on the Map. Follow the arrow round the legs, and watch for prints or anything they've dropped."
    : c.kind === "tow" ? "Park on the rim, Q off, walk the line out and hook on (E), tie back to a tree, hold SPACE to reel."
    : c.kind === "save" ? "Toboggan on the hitch: stop right beside them, or walk up and press E." : "If it's too steep to ride, stop below, Q off, walk up and press E."); }, 2400);
  save(); TABLET.refresh("rescue");
}
function sarSetDuty(on) {
  if (on && !sarLic()) { toast("You need your Rescue licence first.", "warn"); return; }
  SAR.duty = !!on; SAR.miss = 0; SAR.coolT = gameClock - 20;
  toast(on ? "On duty. Callouts will ping the dash: 30 seconds to take one." : "Off duty. Dispatch won't call you.", on ? "good" : undefined);
  save(); TABLET.refresh("rescue");
}

/* -- on foot: E, and the prompts -- */
function sarFootAction() {
  const c = SAR.cur; if (!c || c.res) return false;
  const v = c.v, dF = Math.hypot(v.x - FOOT.x, v.z - FOOT.z);
  if (v.state === "rig" && c.rv && Math.hypot(c.rv.x - FOOT.x, c.rv.z - FOOT.z) < 3.4) { sarRig(); return true; }
  if (v.state !== "waiting" || dF > 2.8) return false;
  if (c.kind === "save") {
    if (GS.own.parts.hitch !== "akja") { toast(`${c.name} needs the rescue toboggan. They can't sit a sled like this.`, "warn"); return true; }
    if (Math.hypot(TOW.x - v.x, TOW.z - v.z) > 12) { toast("Bring the toboggan closer (within 12 m) and try again.", "warn"); return true; }
    v.state = "loading"; v.loadT = 0; toast(`You get ${c.name} into the bag and drag them to the toboggan.`); return true;
  }
  v.state = "follow"; toast(`${c.name} gets an arm round your shoulders. Walk them back to the sled.`); return true;
}
function sarPrompt() {
  const c = SAR.cur; if (!c || c.res || !FOOT.on) return "";
  const v = c.v, dF = Math.hypot(v.x - FOOT.x, v.z - FOOT.z);
  if (v.state === "rig") return c.rv && Math.hypot(c.rv.x - FOOT.x, c.rv.z - FOOT.z) < 3.4 ? "E: rig the tow rope to your hitch" : `Walk to ${c.name}'s sled and rig the tow rope (E)`;
  if (v.state === "waiting" && dF < 2.8) return c.kind === "save" ? "E: bag them and load the toboggan" : `E: help ${c.name} up`;
  if (v.state === "waiting" && dF < 25) return `Walk up to ${c.name} and press E`;
  if (v.state === "follow") return "Walk back to the sled: they're with you. Q to get on.";
  if (v.state === "loading") return `Loading the toboggan… ${Math.min(100, Math.round(v.loadT / 3.5 * 100))}%`;
  if (v.state === "lost") return "Searching on foot. Watch for prints.";
  return "";
}
function sarRideHint() {
  const c = SAR.cur; if (!c || c.res || FOOT.on) return "";
  const v = c.v, d = Math.hypot(v.x - P.x, v.z - P.z);
  if (v.state === "waiting" && d < 80) return c.kind === "save" ? (GS.own.parts.hitch === "akja" ? `Stop with the toboggan beside ${c.name}` : `${c.name} needs the rescue toboggan`) : `Stop beside ${c.name}, or Q off and walk up (E)`;
  if (v.state === "loading") return `Hold still: loading ${Math.min(100, Math.round(v.loadT / 3.5 * 100))}%`;
  if (v.state === "rig") return `Q off and rig the tow rope at ${c.name}'s sled (E)`;
  return "";
}

/* -- where the arrow points, and the HUD lines -- */
function sarTarget(c) {
  const v = c.v;
  if (v.state === "lost") { const w = c.s.pat[c.s.pi]; return w ? { x: w.x, z: w.z } : { x: c.s.area.x, z: c.s.area.z }; }
  if (v.state === "stuck" || v.state === "rig") { const r = c.rv || (RJ.vs && RJ.vs[0]); return r ? { x: r.x, z: r.z } : { x: c.x, z: c.z }; }
  if (sarAboard(c)) {
    if (c.school) return { x: SCHOOLS.rescue.x, z: SCHOOLS.rescue.z + 6 };
    if (gameClock - (c.dT || -9) > 1) { c.dT = gameClock; c.dest = (c.kind === "tow" ? sarCabin(P.x, P.z) : sarWarmest(P.x, P.z)).s; }
    return c.dest || depot;
  }
  return { x: v.x, z: v.z };
}
function sarStatus(c) {
  const v = c.v, s = c.s;
  switch (v.state) {
    case "lost": return `search leg ${s.pi + 1}/${s.pat.length} · clues ${(s.clue.tracks ? 1 : 0) + (s.clue.glove ? 1 : 0)}/2`;
    case "waiting": return c.kind === "save" ? (GS.own.parts.hitch === "akja" ? "toboggan beside them" : "needs the toboggan") : "stop beside them, or walk up (E)";
    case "loading": return "loading the toboggan";
    case "follow": return "walk them to the sled";
    case "stuck": return "winch them out";
    case "rig": return "rig the tow rope (E at their sled)";
    case "tow": return `tow it to ${c.dest ? shortName(c.dest) : "a cabin"}`;
    default: return c.school ? "back to the yard" : `somewhere warm: ${c.dest ? shortName(c.dest) : "a cabin"}`;
  }
}
const sarClock = c => { const r = sarRateNow(c); return r < 0 ? "warming" : fmtMS(c.v.core / r) + " survival"; };
function sarHud(c, tgt) {
  const d = Math.hypot(tgt.x - P.x, tgt.z - P.z), K = SAR_KINDS[c.kind];
  return { title: `${K.name} → ${c.name} (${c.who})${c.v.state === "tow" ? " + their sled" : ""}`, sub: `${sarStatus(c)} · ${fmtMi(d)} · ${sarClock(c)}${c.pay ? " · ~$" + Math.round(c.pay * (0.85 + 0.35 * c.v.core / 100) * payMul()) : ""}` };
}
// the Map's rescue layer and the minimaps: the search area (never the hiker), the casualty once known, a ping waiting
function sarPts() {
  const out = [], c = SAR.cur;
  if (c && !c.res) {
    const lab = `${c.name} · ${sarClock(c)}`;
    if (c.v.state === "lost") out.push({ x: c.s.area.x, z: c.s.area.z, name: "Search area · " + sarClock(c), kind: "sar", area: c.s.area.r, legs: c.s.pat, li: c.s.pi, clues: [c.s.clue.tracks && c.s.tracks ? c.s.tracks : null, c.s.clue.glove ? c.s.glove : null].filter(Boolean) });
    else if (c.v.state !== "stuck" && !sarAboard(c)) out.push({ x: c.v.x, z: c.v.z, name: lab, kind: "sar" });
    else if (sarAboard(c)) { const t = sarTarget(c); out.push({ x: t.x, z: t.z, name: (t.name ? shortName(t) : "Warm") + " · " + sarClock(c), kind: "sarw" }); }
  }
  if (SAR.ping) out.push({ x: SAR.ping.x, z: SAR.ping.z, name: "Callout?", kind: "ping" });
  return out;
}

/* -- every frame: the person, the passenger behind you, the rope -- */
function sarVisual(dt) {
  const c = SAR.cur, f = SAR.foot;
  const pill = SAR.pill, aboard = c && !c.res && (c.v.state === "pillion" || c.v.state === "tow");
  if (aboard || pill) { const p = sarPillion(); p.visible = !!aboard; if (aboard) sarPosePillion(p); }
  if (SAR.rope) SAR.rope.visible = false;
  if (!c || c.res || !f) return;
  const v = c.v, fig = f.fig;
  fig.visible = !sarAboard(c) && v.state !== "stuck" && v.state !== "rig" && Math.hypot(v.x - P.x, v.z - P.z) < 500;
  if (v.state === "rig") fig.visible = false;
  if (fig.visible) {
    const y = surf(v.x, v.z), U = fig.userData;
    if (c.kind === "save" && (v.state === "waiting" || v.state === "loading")) {
      fig.position.set(v.x, y + 0.16, v.z); fig.rotation.set(-Math.PI / 2, v.yaw, 0, "YXZ"); poseFigure(fig, 0, 0, 0, dt);
      if (v.state === "loading" && v.loadT > 3.2) fig.visible = false;
    } else {
      fig.rotation.set(0, 0, 0, "YXZ");
      fig.position.set(v.x, y - 0.04, v.z);
      if (v.state === "follow") { fig.rotation.y = v.yaw; poseFigure(fig, v.sp || 0, v.step, 0.15, dt); }
      else {
        fig.rotation.y = Math.atan2(P.x - v.x, P.z - v.z);
        poseFigure(fig, 0, 0, v.state === "lost" ? 0.25 : 0, dt);
        v.wave += dt * 5;
        if (v.state === "waiting" && Math.hypot(v.x - P.x, v.z - P.z) < 90) { U.arms[0].rotation.x = -2.6 + Math.sin(v.wave) * 0.4; U.arms[1].rotation.x = -2.6 + Math.cos(v.wave * 1.1) * 0.4; }
      }
    }
  }
  f.lamp.visible = c.kind === "search" && dayFactor() < 0.5;
  // the flare a bystander set: a red column, brighter at night and in a storm
  if (f.col.visible) { const y = surf(c.x, c.z); f.col.position.set(c.x + 3, y + 22, c.z); f.col.material.opacity = (0.25 + 0.2 * Math.sin(gameClock * 3)) * (0.5 + 0.5 * (1 - dayFactor()) + 0.4 * GS.storm); if (sarAboard(c) || v.state === "follow") f.col.visible = false; }
  // the tow rope
  if (v.state === "tow" && c.rv) {
    if (!SAR.rope) { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]); SAR.rope = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffb020 })); SAR.rope.frustumCulled = false; scene.add(SAR.rope); }
    const [ax, az] = sarTowAnchor(), r = c.rv, a = SAR.rope.geometry.attributes.position;
    a.setXYZ(0, ax, rideSurf(ax, az) + 0.35, az); a.setXYZ(1, r.x + Math.sin(r.yaw) * 1.3, rideSurf(r.x, r.z) + 0.4, r.z + Math.cos(r.yaw) * 1.3); a.needsUpdate = true;
    SAR.rope.visible = true;
  }
}
// sat on the back of the seat, arms round your waist
function sarPosePillion(p) {
  const mc = V.machineOf ? V.machineOf(GS.own.sled) : null, ud = mc && mc.userData; if (!ud) return;
  const z = Math.max(ud.zBack + 0.22, ud.hip.z - 0.5), top = ud.seatTopAt ? ud.seatTopAt(clamp(z, ud.zBack, 0.05)) : ud.seatTop;
  p.position.set(0, top + 0.1 - 0.93 + 0.12, z); p.rotation.set(0, 0, 0);
  const U = p.userData; for (const l of U.legs) { l.rotation.x = -1.35; l.rotation.z = 0; }
  U.legs[0].rotation.z = 0.25; U.legs[1].rotation.z = -0.25;
  U.torso.rotation.x = 0.3; U.torso.position.y = 0.93;
  U.arms[0].rotation.x = -1.1; U.arms[1].rotation.x = -1.1; U.arms[0].rotation.z = 0.35; U.arms[1].rotation.z = -0.35;
}

/* -- the Rescue school's course: four cases round the Nordkinn Redning base -- */
function sarSchoolSpot(sc, rMin, rMax, ok) {
  return sarRing(sc.x, sc.z, rMin, rMax, ok, 4000) || sarRing(sc.x, sc.z, rMin, rMax + 250, (x, z) => sarLand(x, z) && slopeAt(x, z, 5) < 0.45, 4000) || { x: sc.x + rMin, z: sc.z };
}
function sarSchoolMission(id, kind, def) {
  SCHOOL.addMission("rescue", Object.assign({
    id, kind: def.chip,
    setup(ctx) { ctx.c = sarSchoolCase(kind, ctx.plan); sarOpen(ctx.c); },
    tick(dt, ctx) {
      const c = ctx.c; if (!c) return "hold";
      if (c.res === "fail") return { fail: c.why2 || `${c.name} would not have made it.` };
      if (c.res === "pass") { ctx.wi = ctx.pts.length; return null; }
      return "hold";
    },
    hud(ctx) { const c = ctx.c; return c && !c.res ? `${sarStatus(c)} · ${sarClock(c)}` : ""; },
    cleanup(ctx) { if (SAR.cur && SAR.cur === ctx.c) sarClear(); ctx.c = null; }
  }, def));
}
const sarYardPt = (sc, label) => ({ x: sc.x, z: sc.z + 6, r: 18, stop: true, label });
sarSchoolMission("search", "search", {
  name: "Find the lost hiker", chip: "SEARCH",
  brief: "Marit from the base has gone walkabout in the woods. Ride to the last-known point, fly the search pattern on the Map, read the clues (prints, anything dropped), and bring her back to the yard before she gets too cold.",
  hitch: "none",
  plan(sc) {
    const at = sarSchoolSpot(sc, 230, 480, sarForestOk), pl = sarPlanSearch(at.x, at.z, 80, 120), d = Math.hypot(at.x - sc.x, at.z - sc.z);
    return { name: "Marit", x: at.x, z: at.z, L: pl.L, R: pl.R, tracks: pl.tracks, glove: pl.glove, T0: Math.round(560 + d / 11 * 1.6),
      pts: [{ x: pl.L.x, z: pl.L.z, r: 200, label: "Out to the last-known point" }, sarYardPt(sc, "Bring her back to the yard")] };
  }
});
sarSchoolMission("slope", "rescue", {
  name: "Rider stranded on a steep slope", chip: "RESCUE · SLOPE",
  brief: "Tor has rolled his sled on a slope too steep to idle up. Reach him (stop below, Q off, walk up and press E if you have to), get him on behind you and back to the yard.",
  hitch: "none",
  plan(sc) {
    const at = sarSchoolSpot(sc, 180, 520, sarSteepOk), d = Math.hypot(at.x - sc.x, at.z - sc.z);
    return { name: "Tor", x: at.x, z: at.z, T0: Math.round(280 + 2.4 * d / 10), pts: [{ x: at.x, z: at.z, r: 14, label: "Reach the rider" }, sarYardPt(sc, "Bring him back to the yard")] };
  }
});
sarSchoolMission("tow", "tow", {
  name: "Winch it out, tow it home", chip: "TOW · HITCH",
  brief: "Siri's sled is bogged out past the cones with a dead track. Winch it out with the school sled's electric winch, rig a tow rope (E at her sled), and haul it back to the yard with Siri on behind you.",
  hitch: "none",
  plan(sc) {
    let site = sarTowSite(sc.x, sc.z, 170, 460) || sarTowSite(sc.x, sc.z, 170, 750);
    if (!site) { const p = sarSchoolSpot(sc, 200, 400, (x, z) => sarLand(x, z) && slopeAt(x, z, 5) < 0.2); site = { kind: "bog", x: p.x, z: p.z, g0: groundAt(p.x, p.z), ex: (sc.x - p.x) / Math.hypot(sc.x - p.x, sc.z - p.z), ez: (sc.z - p.z) / Math.hypot(sc.x - p.x, sc.z - p.z), dist: 4.6, slope: 0, hollow: 1.6 }; }
    return { name: "Siri", x: site.x, z: site.z, site, T0: 900, pts: [{ x: site.x, z: site.z, r: 30, label: "The stuck sled" }, sarYardPt(sc, "Tow it back to the yard")] };
  }
});
sarSchoolMission("save", "save", {
  name: "Cold casualty: the toboggan run", chip: "SAVE · COLD",
  brief: "Ole is down on the open fell, hypothermic, on a short clock. The school sled has the rescue toboggan on: stop with it beside him (or walk up and press E), then get him back to the warm before his time runs out. Roll the toboggan and it costs him.",
  hitch: "akja",
  plan(sc) {
    const at = sarSchoolSpot(sc, 300, 620, sarOpenOk), d = Math.hypot(at.x - sc.x, at.z - sc.z);
    return { name: "Ole", x: at.x, z: at.z, T0: Math.round(130 + 2.1 * d / 10), pts: [{ x: at.x, z: at.z, r: 12, label: "Reach the casualty" }, sarYardPt(sc, "Get him to the warm: the yard")] };
  }
});

/* -- the Rescue app: the school, then the duty roster -- */
TABLET.register({
  id: "rescue", name: "Rescue", icon: TICON.rescue, order: 7, live: 1,
  hidden: () => !GS.apps.rescue,
  badge: () => SAR.ping ? "!" : SAR.cur && !SAR.cur.school ? "1" : SCHOOL.on && SCHOOL.sc === SCHOOLS.rescue ? "!" : "",
  render(el) {
    const sc = SCHOOLS.rescue, lic = licensed("rescue"), rk = sarRank(SAR.rep), nx = SAR_RANKS[SAR_RANKS.indexOf(rk) + 1];
    let h = tabHead("RESCUE · NORDKINN REDNING", "Rescue", fmtCash(GS.cash));
    h += `<div class="tsub">${lic ? chip("RESCUE LICENCE", "ok") + " " : ""}${lic ? `${rk.name} · reputation ${Math.round(SAR.rep)}/100${nx ? ` · ${nx.name} at ${nx.at}` : ""}` : `${GS.rescues || 0} recoveries on file`}</div>`;
    if (!lic) { h += schoolCard(sc); h += sec("On duty", ""); h += `<p class="tnote2">Pass the school's four missions and you'll go on duty here: callouts ping the dash, and you've 30 seconds to take one. Until then, volunteer winch recoveries are posted in Trail Crew.</p>`; }
    else {
      const sd = sarStormNear(), ph = sarPerHour();
      h += sec("Duty", SAR.duty ? "on duty" : "off duty");
      h += tabCard({ tf: "duty", title: SAR.duty ? "You're on duty" : "Off duty", chips: SAR.duty ? chip("ON DUTY", "ok") : chip("OFF"),
        meta: `Dispatch odds ≈ ${Math.round(ph * 100)}% a game hour${sd > 0.3 ? " · storm close by, calls up" : ""}${CAL.isPolarNight() ? " · polar night, calls up a little" : ""}`,
        note: SAR.duty ? "Callouts ping the dash. You've 30 seconds to accept, then it goes to another crew. Let two in a row go and dispatch notices: reputation −2 each." : "Go on duty and nearby emergencies ping the dash: searches, stranded riders, tows and cold casualties, sent from where you are.",
        act: "sar:duty", actLabel: SAR.duty ? "GO OFF DUTY" : "GO ON DUTY" });
      if (SAR.ping) { const c = SAR.ping.c, left = Math.max(0, 30 - (gameClock - SAR.ping.t0));
        h += sec("Incoming", `${Math.ceil(left)} s to answer`);
        h += tabCard({ tf: "sping", title: `${SAR_KINDS[c.kind].name}: ${c.name}, ${c.who}`, chips: chip(SAR_KINDS[c.kind].chip, "recovery") + chip(`${fmtMS(c.T0)} SURVIVAL`, "due"),
          meta: `${(c.out / 1000).toFixed(1)} km ${sarCard(P.x, P.z, SAR.ping.x, SAR.ping.z)} · near ${tabEsc(c.near)}`, note: `<span class="why">${tabEsc(c.why)}</span>`, pay: "~" + fmtCash(c.pay * payMul()), act: "sar:acc", actLabel: "ACCEPT" }); }
      const c = SAR.cur;
      if (c && !c.school) {
        h += sec("Callout", sarClock(c));
        h += tabCard({ tf: "scur", title: `${SAR_KINDS[c.kind].name}: ${c.name}, ${c.who}`, chips: chip(SAR_KINDS[c.kind].chip, "recovery") + chip(sarClock(c).toUpperCase(), "due"),
          meta: `${sarStatus(c)} · ${fmtMi(Math.hypot(sarTarget(c).x - P.x, sarTarget(c).z - P.z))} to go`, note: `<span class="why">${tabEsc(c.why)}</span> It's on the Map's rescue layer${c.kind === "search" ? " as a search area with the pattern, not a pin: you have to find them" : ""}.`,
          pay: "~" + fmtCash(c.pay * (0.85 + 0.35 * c.v.core / 100) * payMul()), act: "sar:hand", actLabel: "HAND IT OVER" });
      }
      h += sec("Kit", "");
      h += `<p class="tnote2">${GS.own.parts.hitch === "akja" ? chip("TOBOGGAN ON", "ok") + " Cold casualties can come your way." : GS.own.partsOwned[ownKey("hitch", "akja")] ? "Your rescue toboggan is at the garage. Hitch it and dispatch will send you cold casualties too." : "No rescue toboggan: the garage sells one, and dispatch won't send you cold casualties without it."} ${ST.winch ? "Winch fitted: tows can come your way." : "No winch: no tows."}</p>`;
      h += sec("Record", "");
      h += `<p class="tnote2">${SAR.n} saved · ${SAR.lost} lost or handed over · ${SAR.ign} pings let go${SAR.miss ? ` (${SAR.miss} in a row)` : ""}. Saves pay more the higher your reputation (×${(1 + SAR.rep / 125).toFixed(2)} now) and go further out. A save adds 4 to 8 reputation, a lost one costs 6, handing over costs 4.</p>`;
      h += `<p class="tnote2">Volunteer winch recoveries are still posted in Trail Crew.</p>`;
    }
    el.innerHTML = `<div class="tapp">${h}</div>`;
    if (!lic) schoolBind(el, sc);
    for (const b of el.querySelectorAll("[data-act^=sar]")) b.addEventListener("click", () => {
      const a = b.dataset.act.split(":")[1];
      if (a === "duty") sarSetDuty(!SAR.duty);
      else if (a === "acc" && SAR.ping) { const n = SAR.ping.n, c = SAR.ping.c; if (n) n.dismiss(); sarAccept(c); }
      else if (a === "hand") sarHandOver();
    });
  }
});
TABLET.addLayer("rescue", sarPts);

/* ---------------- loop ---------------- */
const H = 1 / 120;
let last = performance.now(), acc = 0, live = false;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (TT.on) titleTick(dt, t);
  if (!ready) return;
  readInput(dt);
  rescueTick(dt);
  TABLET.step(dt);
  if (started && !SEASON.card) { acc += dt; let n = 0; while (acc >= H && n < 8) { physStep(H); acc -= H; n++; } if (n === 8) acc = 0; }
  const spd = updVisuals(dt);
  if (FISH && FISH.on) FISH.frame(dt);                                  // out on the ice: the walker, rod, line and the side-view camera
  wnVisual(dt);
  dogTick(dt);
  if (started && !SEASON.card) updGame(dt, spd); else if (!started && VZ.mesh && VZ.mesh.visible) VZ.mesh.visible = false;
  meltTick(dt);
  updSky(); seaU.uTime.value += dt;
  updSpray(dt); updMuck(dt); updSparks(dt); updFlakes(dt); updPending(dt); updWobble(dt); pineCull(dt); P.dumped = Math.max(0, P.dumped - dt);
  if (started) { updAudio(spd); markMap(); }
  flushSnow();
  trailClock += dt; if (trailDirty && trailClock > 0.25) { trailTex.needsUpdate = true; trailDirty = false; trailClock = 0; }
  hudT += dt; if (hudT > 0.066) { hudT = 0; if (started) { updHud(spd); updGameHud(); updWinchHud(); updTouch(); drawMap(); if (!$("bigmap").hidden) drawBigMap(); } }
  tabView_sync(); tabDash(dt); TABLET.place();
  if (FISH && FISH.on) FISH.render(); else renderer.render(scene, camera);   // fishing adds the under-ice pass through the scraped windows
  if (!live) { live = true; document.body.classList.add("live"); }
}
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

/* ---------------- god menu (gamepad Y, or the ` key) ---------------- */
const GOD_DATES = [[10, 1, "1 Nov"], [10, 20, "20 Nov"], [11, 21, "21 Dec (midwinter)"], [0, 21, "21 Jan"], [1, 15, "15 Feb"], [2, 20, "20 Mar"], [3, 25, "25 Apr"], [4, 31, "31 May (summer skip)"]];
let godDate = 0;
let godOpen = false, godSel = 0, godTp = 0, padGodA = false, padGodB = false, padGodNav = 0, godNavT = 0;
const GOD_ITEMS = [
  { id: "fuel", label: "Infinite fuel", toggle: true },
  { id: "warm", label: "Never cold", toggle: true },
  { id: "turbo", label: "Turbo engine", sub: "Power ×2.2", toggle: true },
  { id: "lowg", label: "Low gravity", sub: "Moon jumps", toggle: true },
  { id: "freeze", label: "Freeze the clock", toggle: true },
  { id: "cash", label: "+$1,000", do: () => { GS.cash += 1000; save(); toast("+$1,000. Don't spend it all on studs.", "good"); } },
  { id: "rank", label: "+5 deliveries", sub: () => rankOf(GS.delivered).name + " · " + GS.delivered, do: () => {
      const before = rankOf(GS.delivered); GS.delivered += 5; const after = rankOf(GS.delivered);
      if (after !== before) toast(`Rank up: ${after.name}. ${after.opens || ""}`, "good"); else toast(`${GS.delivered} deliveries on the books.`);
      if (GS.contracts) makeContracts(depot); save();
    } },
  { id: "unlock", label: "Unlock every sled, part & kit", do: () => {
      for (const s of SLEDS) if (!GS.own.sleds.includes(s.id)) GS.own.sleds.push(s.id);
      for (const cat of PART_ORDER) for (const o of PARTS[cat].options) GS.own.partsOwned[ownKey(cat, o.id)] = true;
      for (const slot of GEAR_ORDER) for (const o of GEAR[slot].options) GS.own.gearOwned[ownKey(slot, o.id)] = true;
      save(); toast("The whole garage is yours. Fit it at Nordkinn Skuter & Service.", "good");
    } },
  { id: "time", label: "Skip 3 hours", sub: () => fmtTime(GS.hour), do: () => { GS.hour += 3; } },
  { id: "day", label: "Skip a day", sub: () => CAL.now().label, do: () => { GS.hour += 24; } },
  { id: "date", label: "Jump to date", sub: () => "◀ " + GOD_DATES[godDate][2] + " ▶", adjust: d => { godDate = (godDate + d + GOD_DATES.length) % GOD_DATES.length; }, do: () => { const g = GOD_DATES[godDate]; CAL.jumpTo(g[0], g[1]); toast(`It's ${CAL.now().long}.`); } },
  { id: "storm", label: "Weather", sub: () => (WX.force && GS.hour < WX.force.until ? (WX.force.v ? "Storm called in" : "Held clear") : GS.stormPhase === "storm" ? "Storm (front)" : "Clear") + " · A to change", do: () => {
      if (GS.stormPhase === "storm" || (WX.force && WX.force.v && GS.hour < WX.force.until)) { WX.force = { v: 0, until: GS.hour + 4 }; toast("Sky's clearing for a few hours."); }
      else { WX.force = { v: 1, until: GS.hour + 3 }; toast("Storm called in for three hours.", "warn"); }
    } },
  { id: "tp", label: "Teleport", sub: () => "◀ " + SITES[godTp].name + " ▶", adjust: d => { godTp = (godTp + d + SITES.length) % SITES.length; }, do: () => godTeleport(SITES[godTp]) },
  { id: "jobs", label: "Fresh jobs in Parcels", do: () => { makeJobs(depot); makeContracts(depot); TABLET.refresh(); toast("New work posted in Parcels, Freight and Trail Crew."); } },
  { id: "mkt", label: "Bytteboden: new listings", sub: "reshuffle the marketplace", do: () => { GS.mkt.list = []; mktReseed(CAL.abs()); TABLET.refresh("market"); save(); toast("Bytteboden: a fresh batch of listings."); } },
  { id: "lic", label: "Grant both licences", sub: "and install the apps", do: () => { GS.apps.freight = GS.apps.rescue = GS.apps.realestate = 1; GS.signed.freight = GS.signed.rescue = true; GS.lic.freight = GS.lic.rescue = true; GS.own.partsOwned[ownKey("hitch", "akja")] = true; GS.contracts = null; TABLET.refresh(); save(); toast("Freight and Rescue licences granted, and the rescue toboggan."); } },
  { id: "sar", label: "Rescue callout now", sub: "on duty, licensed", do: () => { if (!licensed("rescue")) { toast("Grant the licences first.", "warn"); return; } if (SAR.cur || SAR.ping) { toast("Already on one.", "warn"); return; } SAR.duty = true; if (!sarOffer()) toast("No spot found for a callout here.", "warn"); } },
  { id: "reset", label: "Reset sled", sub: "Also pad Back / R", do: () => resetSled() }
];
function godTeleport(s) {
  if (FISH) FISH.abort();
  let x, z, yaw;
  if (s === depot) { x = SPAWN.x; z = SPAWN.z; yaw = SPAWN.yaw; }
  else {
    const dx = depot.x - s.x, dz = depot.z - s.z, d = Math.hypot(dx, dz) || 1;
    x = s.x + dx / d * 16; z = s.z + dz / d * 16; yaw = Math.atan2(-dx, -dz);
  }
  P.x = x; P.z = z; P.yaw = yaw; P.vx = P.vy = P.vz = 0; P.yr = 0; P.pitch = P.roll = 0; P.stuckT = 0;
  recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.4; P.safe = { x, z, yaw };
  camState.init = false; towSnap(); toast("Dropped at " + s.name + ".");
}
function godTick(dt) {
  if (GOD.fuel) { GS.fuel = GS.cap; GS.outWarned = GS.lowWarned = false; }
  if (GOD.warm) { GS.warmth = 100; GS.coldWarned = false; }
  if (GOD.freeze) GS.hour -= dt / GAMEHOUR;
}
const godAny = () => GOD.fuel || GOD.warm || GOD.turbo || GOD.lowg || GOD.freeze;
function godApply(id) {
  if (id === "turbo") restat();
  if (id === "lowg") G = GOD.lowg ? 5.2 : 32.4;
}
function renderGod() {
  const box = $("godList"); box.innerHTML = "";
  GOD_ITEMS.forEach((it, i) => {
    const b = document.createElement("button"); b.className = "row" + (i === godSel ? " sel" : "") + (it.toggle && GOD[it.id] ? " on" : "");
    const sub = typeof it.sub === "function" ? it.sub() : it.sub;
    const val = it.toggle ? (GOD[it.id] ? "ON" : "OFF") : it.adjust ? "GO" : "A";
    b.innerHTML = `<span class="main"><b>${it.label}</b>${sub ? `<em>${sub}</em>` : ""}</span><span class="val">${val}</span>`;
    b.addEventListener("click", () => { godSel = i; godActivate(); });
    b.addEventListener("mouseenter", () => { if (godSel !== i) { godSel = i; renderGod(); } });
    box.appendChild(b);
  });
  const sel = box.children[godSel]; if (sel) sel.scrollIntoView({ block: "nearest" });
}
function godActivate() {
  const it = GOD_ITEMS[godSel];
  if (it.toggle) { GOD[it.id] = !GOD[it.id]; godApply(it.id); toast(`${it.label}: ${GOD[it.id] ? "on" : "off"}`, GOD[it.id] ? "good" : undefined); }
  else it.do();
  renderGod();
}
function godMove(d) { godSel = (godSel + d + GOD_ITEMS.length) % GOD_ITEMS.length; renderGod(); }
function godAdjust(d) { const it = GOD_ITEMS[godSel]; if (it.adjust) { it.adjust(d); renderGod(); } }
function toggleGod(force) {
  godOpen = force !== undefined ? force : !godOpen;
  $("god").hidden = !godOpen;
  if (godOpen) { TABLET.close(true); renderGod(); }
}
function godPad(gp, dt) {
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), ay = gp.axes[1] || 0, ax = gp.axes[0] || 0;
  const nav = b(12) || ay < -0.6 ? -1 : b(13) || ay > 0.6 ? 1 : b(14) || ax < -0.6 ? -2 : b(15) || ax > 0.6 ? 2 : 0;
  godNavT -= dt;
  if (nav !== padGodNav || (nav && godNavT <= 0)) {
    if (nav === -1 || nav === 1) godMove(nav); else if (nav) godAdjust(nav / 2);
    godNavT = nav === padGodNav ? 0.12 : 0.38;
  }
  padGodNav = nav;
  const a = b(0); if (a && !padGodA) godActivate(); padGodA = a;
  const bb = b(1); if (bb && !padGodB) toggleGod(false); padGodB = bb;
}
$("godClose").addEventListener("click", () => toggleGod(false));
addEventListener("keydown", e => {
  if (!started || e.repeat) return;
  if (e.code === "KeyY" || e.code === "Backquote") { toggleGod(); return; }
  if (!godOpen) return;
  if (e.code === "PageUp" || e.code === "BracketLeft") godMove(-1);
  if (e.code === "PageDown" || e.code === "BracketRight") godMove(1);
  if (e.code === "Enter") godActivate();
});

function boot() {
  genWorld(); computeSites(); placeQuay(); computeStations(); computeFuelCabins(); meltBuild();
  P.x = SPAWN.x; P.z = SPAWN.z; P.yaw = SPAWN.yaw; camState.yaw = SPAWN.yaw;
  buildFar(); buildProps(); buildSites(); buildSchools(); buildRE(); buildViews(); buildTown(); buildTownSigns(); buildStations(); buildFuelCabins(); buildDog(); buildTow(); load(); buildMapBg(); ctBuild(); buildLakeWater(); meltBoot();
  buildNpcs(); buildWalker(); buildWinchGear();
  buildFishShops(); initFishing();
  NPCS.forEach((n, i) => {                       // start them out on the map, not in your lap
    const s0 = SITES[2 + i * 2] || SITES[1];
    n.x = s0.x + 40; n.z = s0.z + 40; n.y = surf(n.x, n.z); n.yaw = Math.random() * 6.28; npcPickTarget(n);
  });
  P.y = surf(P.x, P.z);
  recenter(P.x, P.z, true);
  ready = true;
  loadSettings(); buildSettings(); buildGarageTabs(); ctFonts(); setTimeout(() => tabChart(), 2500);
  titleReady();
}
requestAnimationFrame(frame);
// let the title paint (and its faces arrive) before the world build blocks the page for a moment
(document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 800))]) : Promise.resolve())
  .then(() => requestAnimationFrame(() => setTimeout(boot, 0)));
})();
