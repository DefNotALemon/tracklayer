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
      else for (const L of LAKES) {
        if (!L.ok) continue;
        const dx = x - L.x, dz = z - L.z, dd = Math.sqrt(dx * dx + dz * dz);
        if (dd > L.r * 1.7) continue;
        const t = dd / (L.r * (0.76 + 0.48 * fbm(x / 170 + L.x, z / 170, 3)));
        const mk = 1 - sstep(0.85, 2.1, t);
        h += (L.lv - h) * mk;
        if (t < 0.97) b = 1;
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
function freshCell(ix, iz) {
  const x = ix * CELL - HALF, z = iz * CELL - HALF;
  let d = sampleG(freshG, x, z);
  if (d > 0.1) d += (vn(x / 7 + 3, z / 7) - 0.5) * 0.34 * Math.min(1, d * 2) + (vn(x / 1.9, z / 1.9 + 5) - 0.5) * 0.07;
  else d += vn(x / 2.3, z / 2.3) * 0.025;
  return d < 0 ? 0 : d;
}
function getChunk(cx, cz) {
  const key = cz * CPR + cx;
  let c = chunks[key];
  if (!c) {
    c = { d: new Float32Array(CH * CH), f: new Float32Array(CH * CH) };
    for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) { const v = freshCell(cx * CH + i, cz * CH + j); c.f[j * CH + i] = v; c.d[j * CH + i] = v; }
    chunks[key] = c; c.key = key; c.cx = cx; c.cz = cz; c.t = gameClock; activeChunks.push(c);
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
const waterLine = () => SEA - 0.12 - P.sink * 0.5;               // the sled sits lower as it bogs
const rideSurf = (x, z) => { const s = surf(x, z); return bioAt(x, z) === 3 ? Math.max(s, waterLine()) : s; };
const smoothRide = (x, z) => { const s = smoothSurf(x, z); return bioAt(x, z) === 3 ? Math.max(s, waterLine()) : s; };

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
      // aurora: green curtains hanging across the northern half of the sky, drifting
      float az = atan(d.x, -d.z);
      float band = sin(az * 2.3 + uTime * 0.05) * 0.5 + sin(az * 5.1 - uTime * 0.09) * 0.25 + sin(az * 11.0 + uTime * 0.17) * 0.12;
      float ah = 0.42 + band * 0.18;
      float curtain = exp(-pow((h - ah) * 5.5, 2.0)) * (0.55 + 0.45 * sin(az * 23.0 + uTime * 0.6 + sin(az * 7.0) * 3.0));
      float rays = 0.6 + 0.4 * sin(az * 61.0 - uTime * 0.9 + h * 30.0);
      float au = curtain * rays * smoothstep(0.08, 0.3, h) * (1.0 - smoothstep(0.55, 0.95, h)) * smoothstep(-0.9, 0.4, -d.z);
      vec3 auC = mix(vec3(0.12, 0.85, 0.42), vec3(0.55, 0.25, 0.8), smoothstep(ah, ah + 0.14, h));
      c += auC * au * uAurora * (1.0 - uStorm) * 0.7;
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
const patchMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0 });
patchMat.onBeforeCompile = sh => {
  sh.uniforms.uSnow = { value: snowTex }; sh.uniforms.uTexel = { value: 1 / S };
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
  sh.fragmentShader = "varying float vPack; varying float vFresh; varying float vIce; varying float vSlopeY; varying vec3 vWP;\n" +
    sh.fragmentShader.replace("#include <color_fragment>", `
      vec3 powder = vec3(0.93,0.955,1.0), packedC = vec3(0.70,0.76,0.85), iceC = vec3(0.38,0.58,0.72), rockC = vec3(0.26,0.25,0.27);
      vec3 col = mix(powder, packedC, vPack);
      col = mix(col, iceC, vIce*(0.3 + 0.7*vPack));
      float rock = (1.0 - smoothstep(0.03,0.14,vFresh)) * (1.0 - vIce) * (1.0 - smoothstep(0.55,0.78,vSlopeY));
      col = mix(col, rockC, rock);
      vec2 cellp = floor(vWP.xz*9.0);
      float rnd = fract(sin(dot(cellp, vec2(12.9898,78.233)))*43758.5453);
      float tw = fract(rnd*37.0 + dot(normalize(vWP - cameraPosition), vec3(4.0,6.0,5.0)));
      col += step(0.985, rnd) * step(0.72, tw) * (1.0 - vPack) * (1.0 - rock) * 0.9;
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
  arr[o] = groundAt(x, z) + d; arr[o + 1] = packOf(d, f); arr[o + 2] = f; arr[o + 3] = bioAt(x, z) === 1 ? 1 : 0;
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
  pdata = dst; pdata2 = src; pox = cx; poz = cz;
  snowTex.image.data = pdata; snowTex.needsUpdate = true; snowFull = true; snowDirty = false; snowJ0 = 1e9; snowJ1 = -1;
  const wx = cx * CELL - HALF, wz = cz * CELL - HALF;
  patchMesh.position.set(wx, 0, wz);
  farU.uPatch.value.set(wx, wz, wx + (S - 1) * CELL, wz + (S - 1) * CELL);
}
function writeCell(ix, iz, oldD, newD, f) {
  const i = ix - pox, j = iz - poz;
  if (i < 0 || j < 0 || i >= S || j >= S) return;
  const o = (j * S + i) * 4;
  pdata[o] += newD - oldD; pdata[o + 1] = packOf(newD, f);
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
  const pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const gi = i * step, gj = j * step, k = gj * GN + gi, v = j * n + i;
    const d = freshG[k], b = bio[k];
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
  geo.setIndex(new THREE.BufferAttribute(buildGridIndex(n), 1));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, farU);
    sh.vertexShader = "uniform vec4 uPatch; varying vec2 vWxz;\n" + sh.vertexShader.replace("#include <begin_vertex>", `
      vec3 transformed = vec3(position); vWxz = position.xz;
      if (position.x > uPatch.x && position.x < uPatch.z && position.z > uPatch.y && position.z < uPatch.w) {
        bool deep = position.x > uPatch.x + 5.0 && position.x < uPatch.z - 5.0 && position.z > uPatch.y + 5.0 && position.z < uPatch.w - 5.0;
        transformed.y -= deep ? 30.0 : 1.3; }`);
    sh.fragmentShader = "uniform sampler2D uTrail; varying vec2 vWxz;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      float tr = texture2D(uTrail, (vWxz + ${HALF}.0) / ${WORLD}.0).r;
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.76,0.82,0.9), tr);`);
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
  V.torso = box(0.36, 0.38, 0.25, jacketMat, 0, 0.22, 0.0, 0, 0, 0, ub);
  V.chest = ball(0.22, jacketMat, 0, 0.36, 0.03, ub, 1.0, 0.75, 0.85);
  ball(0.14, jacketMat, 0, 0.47, 0.0, ub, 1.0, 0.6, 0.9);                                                   // collar
  V.furCollar = ball(0.17, fur, 0, 0.48, -0.02, ub, 1.15, 0.5, 1.05);
  box(0.22, 0.26, 0.11, packMat, 0, 0.26, -0.18, 0, 0, 0, ub);                                              // small pack
  box(0.24, 0.05, 0.12, packMat, 0, 0.4, -0.18, 0, 0, 0, ub);
  styleParts.sleeves = [];
  V.arms = []; V.shoulder = [];
  { const sg = new THREE.CylinderGeometry(0.095, 0.095, 0.4, 12); sg.rotateZ(Math.PI / 2); put(new THREE.Mesh(sg, jacketMat), 0, 0.39, 0.02, 0, 0, 0, ub); }   // shoulder line across the top of the jacket
  for (const sx of [-1, 1]) {
    ball(0.1, jacketMat, sx * 0.2, 0.39, 0.02, ub, 1, 1, 1);                                              // rounded shoulder cap the sleeve grows from
    V.shoulder.push(new THREE.Vector3(sx * 0.2, 0.39, 0.03));
    const ua = limbDyn(0.075, 0.065, jacketMat, ub), fa = limbDyn(0.065, 0.055, jacketMat, ub);
    V.arms.push(ua, fa);
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
  V.gloves = []; V.mitts = []; V.heatBand = []; V.wrist = [];
  const _XAX = new THREE.Vector3(1, 0, 0);
  for (const [i, sx] of [-1, 1].entries()) {
    const gp = V.grip[i], hand = new THREE.Group(); hand.position.copy(gp); barPivot.add(hand);
    // hand space: +x along the grip toward the machine's right, +y up, +z forward (a proper basis, so the
    // left hand isn't flipped upside down the way a 180°-ish setFromUnitVectors would do it)
    const hx = new THREE.Vector3(0.13, sx * 0.04, -sx * 0.04).normalize(), hz = new THREE.Vector3(0, 0, 1).cross(hx).cross(hx).negate().normalize(), hy = hz.clone().cross(hx);
    hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(hx, hy, hz));
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
}
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
const RIDER = { thigh: 0.44, shin: 0.43, upper: 0.3, fore: 0.29, hipX: 0.14, pitch: 0.4, legR: 0.105 };   // arm lengths are in ub space (× RIDER_SCALE)
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
  for (const [i, sx] of [-1, 1].entries()) {
    const footX = best.fx, footZ = best.fz;
    _pA.set(sx * RIDER.hipX, ud.seatTop + RIDER.legR + 0.005, hip.z + 0.06); _pB.set(sx * (footX + 0.025), 0.53, footZ - 0.03);
    ik2(_pA, _pB, RIDER.thigh, RIDER.shin, _pP.copy(best.pole).multiply(q.set(sx, 1, 1)), _pJ);
    V.legs[i * 2].userData.set(_pA, _pJ); V.legs[i * 2 + 1].userData.set(_pJ, _pB);
    V.kneePads[i].position.copy(_pJ).add(_pT.set(0, 0.02, 0.07)); aimZ(V.kneePads[i], _pJ, _pT.set(_pB.x, _pB.y - 0.4, _pB.z + 0.5));
    V.reflect[i].position.copy(_pJ).lerp(_pB, 0.55); aimZ(V.reflect[i], V.reflect[i].position, _pB);
    V.footPlain[i].position.set(sx * footX, 0.45, footZ); V.boots[i].position.set(sx * footX, 0.5, footZ - 0.01); V.bootCuff[i].position.set(sx * footX, 0.62, footZ - 0.04);
  }
  RIDER.legFit = best;
  poseArms();
}
// every frame: arms reach the grips wherever the bars have turned, torso rolls into the turn
function poseArms() {
  if (!V.arms || !V.machineOf) return;
  const steer = barPivot.rotation.y;
  ub.rotation.set(RIDER.pitch, steer * 0.18, -steer * 0.28);
  barPivot.updateWorldMatrix(true, false); ub.updateWorldMatrix(true, false);
  for (const [i, sx] of [-1, 1].entries()) {
    _pT.copy(V.wrist[i]); barPivot.localToWorld(_pT); ub.worldToLocal(_pT);
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
// Wipe: Z / pad D-pad left / the WIPE touch button. A gloved hand sweeps the visor in two strokes, the
//   frost stays gone for ~4 s, then creeps back. Getting warm (a cabin, the stove, the thermos) lowers the
//   target, and the frost thaws out with it.
const VZ = { level: 0, target: 0, hold: 0, sweep: -1, hinted: false, mesh: null, mat: null, ex: 0, brT: 1.5, fp: null, glove: null };
const VZ_SWEEP = 0.62, VZ_HOLD = 3.4, VZ_CREEP = 0.14, VZ_THAW = 1.3, VZ_ON = 60, VZ_FULL = 8;
const BR = { sp: [], n: 22, head: 0 }, _bm = new THREE.Vector3();

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
  if (!started || GS.dead || GS.boardOpen || GS.garageOpen || godOpen || !$("settings").hidden || !$("bigmap").hidden) return;
  if (VZ.sweep >= 0 || VZ.level < 0.04) return;       // nothing to wipe, or the glove is already on the visor
  VZ.sweep = 0; VZ.hold = 0;
}
function gloveAt(t) {
  // the glove follows the same two strokes the shader clears with; t is 0..1 over the whole wipe
  const g = VZ.glove || (VZ.glove = $("glove")); if (!g) return;
  if (t < 0 || t >= 1) { g.style.display = "none"; return; }
  const W = innerWidth, H = innerHeight, gw = Math.min(W, H) * 0.36, gh = gw * 1.25;
  const sA = t < 0.5, u = sA ? t * 2 : (t - 0.5) * 2, e = u * u * (3 - 2 * u);
  const px = sA ? lerp(-1.2, 1.2, e) : lerp(1.2, -1.2, e), py = sA ? 0.44 : -0.36;
  const sx = (px * 0.5 + 0.5) * W, sy = (0.5 - py * 0.5) * H, rot = (sA ? 82 : -82) + Math.sin(t * 22) * 5;
  g.style.display = "block"; g.style.width = gw + "px";
  g.style.transform = `translate3d(${(sx - gw / 2).toFixed(1)}px,${(sy - gh / 2).toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg)`;
  g.style.opacity = Math.min(1, t / 0.08, (1 - t) / 0.1).toFixed(2);
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
  if (!VZ.hinted && VZ.level > 0.3) { VZ.hinted = true; toast(TC.on ? "Your visor's icing over. Tap WIPE to clear it, or get warm." : "Your visor's icing over. Press Z (pad: D-pad left) to wipe it, or get warm.", "warn"); }
  const show = VZ.level > 0.012 || VZ.sweep >= 0;
  if (!show) { if (VZ.mesh && VZ.mesh.visible) VZ.mesh.visible = false; return; }
  const m = visorMesh(), U = VZ.mat.uniforms; m.visible = true;
  U.uLevel.value = VZ.level; U.uAsp.value = innerWidth / innerHeight; U.uTone.value = 0.38 + 0.62 * dayFactor();
  if (VZ.sweep >= 0) {
    const t = VZ.sweep / VZ_SWEEP, sA = t < 0.5, u = sA ? t * 2 : (t - 0.5) * 2, e = u * u * (3 - 2 * u);
    U.uWipe.value.set(sA ? lerp(-1.45, 1.45, e) : 1.45, sA ? 1.45 : lerp(1.45, -1.45, e)); gloveAt(t);
  } else { U.uWipe.value.set(-1.5, 1.5); if (VZ.glove && VZ.glove.style.display !== "none") gloveAt(-1); }
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
  if (started && GS.boardOpen && boardKey(e)) return;
  if (e.repeat) return;
  keys.add(e.code);
  if (!started) return;
  if (e.code === "Space" && !FOOT.on) input.hop = true;
  if (e.code === "KeyR") resetSled();
  if (e.code === "KeyV" || e.code === "KeyC") cycleView();
  if (e.code === "KeyM") toggleBigMap();
  if (e.code === "KeyH") $("help").hidden = !$("help").hidden;
  gameKey(e);
});
addEventListener("keyup", e => keys.delete(e.code));
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
let padHop = false, padReset = false, padView = false, padGod = false, padB = false, padMenu = false, padLB = false, padX = false, padWipe = false;

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
  const modal = GS.garageOpen || GS.boardOpen || !$("settings").hidden || !$("bigmap").hidden || godOpen || GS.dead;
  $("touch").classList.toggle("modal", modal);
  const lbl = GS.near === garageSite ? "GARAGE" : GS.near === depot ? "JOB BOARD" : null;
  const e = $("tE"); e.hidden = !lbl; if (lbl && e.textContent !== lbl) e.textContent = lbl;
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
      else if (k === "menu") gameKey({ code: "Escape" });
      else if (k === "e") gameKey({ code: "KeyE" });
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
    const ax = gp.axes[0] || 0; if (Math.abs(ax) > 0.12) analog = ax;
    thr = Math.max(thr, gp.buttons[7] ? gp.buttons[7].value : 0); brk = Math.max(brk, gp.buttons[6] ? gp.buttons[6].value : 0);
    if (gp.buttons[5] && gp.buttons[5].pressed) lean = 1;
    if (gp.buttons[2] && gp.buttons[2].pressed) wh = 1;
    const h = gp.buttons[0] && gp.buttons[0].pressed; if (h && !padHop && started && !godOpen && !GS.boardOpen && !FOOT.on) input.hop = true; padHop = h;
    if (h && FOOT.on) WN.padReel = true;
    const lb = gp.buttons[4] && gp.buttons[4].pressed; if (lb && !padLB && started && !godOpen && !GS.boardOpen && !GS.dead) gameKey({ code: "KeyQ" }); padLB = lb;
    const xb = gp.buttons[2] && gp.buttons[2].pressed; if (xb && !padX && started && FOOT.on && !godOpen && !GS.boardOpen) gameKey({ code: "KeyX" }); padX = xb;
    // B does what E does (job board, garage) or backs out of whatever's open; Menu is Esc
    const bb = gp.buttons[1] && gp.buttons[1].pressed;
    if (bb && !padB && started && !godOpen && !GS.dead) gameKey({ code: GS.boardOpen || GS.garageOpen || !$("settings").hidden || !$("bigmap").hidden ? "Escape" : "KeyE" });
    padB = bb;
    const mn = gp.buttons[9] && gp.buttons[9].pressed; if (mn && !padMenu && started && !godOpen && !GS.dead) gameKey({ code: "Escape" }); padMenu = mn;
    const y = gp.buttons[3] && gp.buttons[3].pressed; if (y && !padGod && started) toggleGod(); padGod = y;
    if (godOpen) { godPad(gp, dt); analog = null; }
    if (!started && TT.on) titlePad(gp, dt);
    if (started && GS.boardOpen && !godOpen) boardPad(gp, dt);
    const r = gp.buttons[8] && gp.buttons[8].pressed; if (r && !padReset && started) resetSled(); padReset = r;
    const v = gp.buttons[11] && gp.buttons[11].pressed; if (v && !padView && started) cycleView(); padView = v;
    const dl = gp.buttons[14] && gp.buttons[14].pressed; if (dl && !padWipe && started && !godOpen && !GS.boardOpen) wipeVisor(); padWipe = dl;   // D-pad left wipes the visor
    const wg = gp.buttons[4] && gp.buttons[4].pressed; if (wg && !TOW.padWing && started && !godOpen && !GS.boardOpen) toggleWings(); TOW.padWing = wg;
    break;
  }
  if (!started || GS.boardOpen) { thr = brk = st = lean = wh = 0; analog = null; }   // no riding off from a menu
  FOOT.fwd = 0; FOOT.turn = 0;
  if (FOOT.on) { FOOT.fwd = thr - brk * 0.6; FOOT.turn = analog !== null ? analog : st; thr = brk = lean = wh = 0; st = 0; analog = null; }   // on foot the same controls walk the rider
  input.wheelie = wh; if (wh) thr = Math.max(thr, 1);
  input.thr = thr; input.brk = brk; input.lean = lean;
  if (analog !== null) input.steer = analog;
  else input.steer += (st - input.steer) * (1 - Math.exp(-(st === 0 ? 9 : 5) * dt));
}

/* ---------------- physics ---------------- */
const MASS = 280; let G = 32.4;
const P = { x: SPAWN.x, y: 0, z: SPAWN.z, vx: 0, vy: 0, vz: 0, yaw: SPAWN.yaw, yr: 0, pitch: 0, roll: 0, odo: 0, rut: 0, airP: 0, airR: 0, airPV: 0, airRV: 0, airT: 0, airPeak: 0, launched: 0, wh: 0, whVis: 0, whRun: 0, whBest: 0, rock: 0, dumped: 0, gnd: true, pack: 0, ice: false, exc: 0, drag: 0, shake: 0, dist: 0, stuckT: 0, safe: null, rpm: 0.15, wet: false, sink: 0, wetT: 0 };
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
  flatbed: { len: 3.2, r: 0.95, mass: 125, w: 1.35, tip: 0.95 }
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
      const d = lerp(d0, f * 0.13, wc * 0.6);
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
  const cargoKg = bigLoads().reduce((a, j) => a + j.kg, 0);
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
  else if (H.tip < 50 && TOW.spd > 3 && TOW.score > H.tip + (cargoKg ? 0 : 0.35) && P.gnd && started) {
    TOW.tipT = 2.4; TOW.tipDir = Math.sign(TOW.roll + lat * 0.9) || 1;
    P.vx *= 0.5; P.vz *= 0.5; P.shake = Math.max(P.shake, 0.6); thud(1); whump(0.7);
    for (let k = 0; k < 60; k++) emit(tx + (Math.random() - 0.5) * 2, TOW.y + 0.3, tz + (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 3, 1 + Math.random() * 2.5, (Math.random() - 0.5) * 3, 0.8, 1.2);
    if (cargoKg) bigHit(22 + TOW.spd, "Trailer rolled!");
    else toast("Trailer rolled. Empty, luckily.", "warn");
    setTimeout(() => { if (TOW.tipT <= 0.2 && started && !GS.dead) toast("You heave the trailer back onto its runners."); }, 2500);
  }
  // it leaves its own mark on the snow
  if (moving && TOW.tipT <= 0) {
    if (isGroomer(kind)) {
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
    return L;
  };
  for (const k of ["trailer", "flatbed"]) V2[k].userData.looks = V2[k].userData.slots.map(looks);
  V2.flatbed.userData.bigLooks = looks(V2.flatbed.userData.big);
  // a hitch receiver on the sled's tail, only when something's hooked up
  V.hitchBar = new THREE.Group(); sledBody.add(V.hitchBar);
  box(V.hitchBar, 0.1, 0.08, 0.35, steel, 0, 0.32, -1.95); box(V.hitchBar, 0.35, 0.05, 0.06, steel, 0, 0.36, -1.8);
}
const _hw = new THREE.Vector3(), _hw2 = new THREE.Vector3();
function towVisual(dt) {
  const kind = PV.cat === "hitch" ? PV.id : GS.own.parts.hitch;
  for (const k in TOW.vis) TOW.vis[k].visible = k === kind;
  if (V.hitchBar) { V.hitchBar.visible = !!HITCH[kind]; V.hitchBar.position.z = -(hitchBack(PV.cat === "rack" ? PV.id : GS.own.parts.rack) - 2.1); }
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
  o.top = -Infinity; o.down = true; felled.push(o);                     // no longer an obstacle for anyone
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
  if (HELP.on && HELP.kind === "sea") { P.vx = P.vz = P.vy = 0; P.y = Math.max(rideSurf(P.x, P.z), SEA - 0.5); P.gnd = true; P.wet = true; return; }   // dunked, and waiting on the rescue sled
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), lx = fz, lz = -fx;
  const sea = isSea(P.x, P.z); if (!sea) P.sink = 0;
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
  if (wet && !P.wet) {                                                  // hitting the water: a sheet of spray off the nose
    const s0 = Math.hypot(vx, vz);
    for (let k = 0; k < 24 + s0 * 2; k++) emit(P.x + fx * 1.4 + lx * (Math.random() - 0.5) * 2, SEA + 0.1, P.z + fz * 1.4 + lz * (Math.random() - 0.5) * 2, vx * 0.5 + lx * (Math.random() - 0.5) * 8, 2 + Math.random() * s0 * 0.25, vz * 0.5 + lz * (Math.random() - 0.5) * 8, 1.5, 1.1);
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
    const share = (wet ? 0.5 : P.ice ? 0.35 : 0.9) * (1 - 0.7 * P.rock), a = dyaw * share, ca = Math.cos(a), sa = Math.sin(a);
    const nvx = vx * ca + vz * sa, nvz = vz * ca - vx * sa; vx = nvx; vz = nvz;
    const g2 = gx * gx + gz * gz; vx -= G * gx / (1 + g2) * dt; vz -= G * gz / (1 + g2) * dt;
    P.drag = 5600 * exc * ST.drag;
    const rolling = wet ? 420 : P.ice ? 140 : lerp(260, 60, P.rock);
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
    const Fs = P.drag + TOW.drag + rolling + 0.9 * sp * sp + (wet ? (2.2 + 9 * P.sink) * sp * sp + 3000 * P.sink : 0);
    if (sp > 0.01) { const dv = Math.min(sp, Fs / M * dt); vx -= vx / sp * dv; vz -= vz / sp * dv; }
    const grip = wet ? 1.6 + ST.grip * 0.2 : lerp(P.ice ? 1.2 + ST.grip * 0.35 : lerp(5.5, 9.5, P.pack) + ST.grip, 0.8, P.rock) * lerp(1, 0.75, P.wh);
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
      // the rooster tail
      sprayAcc += (1.5 + Math.abs(vl) * 0.5) * Math.min(spd, 30) * dt;
      while (sprayAcc > 1) {
        sprayAcc -= 1;
        const side = (Math.random() - 0.5) * 0.6;
        emit(P.x - fx * 1.7 + lx * side, SEA + 0.05, P.z - fz * 1.7 + lz * side, -fx * spd * 0.35 + vx * 0.2, 2.5 + spd * 0.22, -fz * spd * 0.35 + vz * 0.2, 1.2, 1.3);
      }
    } else
    sprayAcc += (exc * 60 + 0.4 + (P.ice ? 0 : Math.abs(vl) * 0.8)) * Math.min(spd, 30) * dt * (P.ice ? 0.3 : 1);
    while (sprayAcc > 1) {
      sprayAcc -= 1;
      const side = (Math.random() - 0.5) * 0.5;
      emit(P.x - fx * 1.6 + lx * side, P.y + 0.15, P.z - fz * 1.6 + lz * side, -fx * spd * 0.25 + vx * 0.3, 1.5 + spd * 0.12 + exc * 6, -fz * spd * 0.25 + vz * 0.3, 1.6 + exc * 4);
      if (exc > 0.05 && Math.random() < 0.5) { const s = Math.random() < 0.5 ? -0.6 : 0.6; emit(P.x + fx * 1.9 + lx * s, P.y + 0.1, P.z + fz * 1.9 + lz * s, vx * 0.6 + lx * s * 3, 1.2 + exc * 5, vz * 0.6 + lz * s * 3, 1.4); }
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
      if (isSea(P.x, P.z) && P.y <= waterLine() + 0.05) {
        // belly-flopping onto water: it's hard as concrete at speed, and it scrubs the speed off
        const bite = Math.min(0.35, impact * 0.025); vx *= 1 - bite; vz *= 1 - bite; P.vx = vx; P.vz = vz;
        const s0 = Math.hypot(vx, vz);
        for (let k = 0; k < 30 + impact * 6; k++) emit(P.x + (Math.random() - 0.5) * 2, SEA + 0.1, P.z + (Math.random() - 0.5) * 3, vx * 0.3 + (Math.random() - 0.5) * 9, 2 + Math.random() * (3 + impact * 0.4), vz * 0.3 + (Math.random() - 0.5) * 9, 1.5, 1.2);
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
  P.odo += Math.abs(vf) * dt; P.dist += Math.hypot(vx, vz) * dt;
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
function updAudio(spd) {
  if (!audio) return;
  const t = audio.AC.currentTime, r = P.rpm, f = 40 + r * 140;
  audio.o1.frequency.setTargetAtTime(f, t, 0.05); audio.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
  audio.o2g.gain.setTargetAtTime(0.55 + r * 0.5, t, 0.08);
  audio.lp.frequency.setTargetAtTime(300 + r * 2200, t, 0.06);
  audio.lp.Q.setTargetAtTime(2.5 + r * 5, t, 0.08);
  audio.eg.gain.setTargetAtTime(GS.fuel > 0 && !GS.dead ? 0.09 + r * 0.16 : 0, t, 0.15);
  audio.hiss.g.gain.setTargetAtTime(P.gnd ? Math.min(0.5, spd / 30 * (0.08 + P.exc * 1.6)) : 0, t, 0.08);
  audio.hiss.b.frequency.setTargetAtTime(P.wet ? 1700 : P.ice ? 2600 : 1000, t, 0.2);
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
  mctx.drawImage(mapBg, 0, 0); mctx.drawImage(mapTrail, 0, 0);
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
}
function toggleBigMap(force) {
  const open = force !== undefined ? force : $("bigmap").hidden;
  $("bigmap").hidden = !open;
  if (open) { closeBoard(); toggleSettings(false); drawBigMap(); }
}
function drawBigMap() {
  const c = $("bigmapC"), g = c.getContext("2d"), N = c.width, k = N / MB;
  g.fillStyle = "#0d1822"; g.fillRect(0, 0, N, N);
  g.imageSmoothingEnabled = true;
  g.drawImage(mapBg, 0, 0, N, N); g.drawImage(mapTrail, 0, 0, N, N);
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
  if (GS.rescueJob) for (const v of RJ.vs) {
    if (v.freed) continue;
    const [vx, vz] = w2(v.x, v.z);
    g.fillStyle = "#0d1822"; g.beginPath(); g.arc(vx, vz, 10, 0, 6.283); g.fill(); g.fillStyle = "#ff3a1a"; g.beginPath(); g.arc(vx, vz, 6.5, 0, 6.283); g.fill();
    g.strokeStyle = "#ff3a1a"; g.lineWidth = 3; g.beginPath(); g.arc(vx, vz, 16 + Math.sin(performance.now() * 0.008) * 3, 0, 6.283); g.stroke();
    g.font = "500 15px 'Barlow Semi Condensed', sans-serif"; const nm = v.name + " · stuck", w = g.measureText(nm).width + 10;
    g.fillStyle = "rgba(13,24,34,.75)"; g.fillRect(vx - w / 2, vz + 14, w, 20); g.fillStyle = "#ff6a4a"; g.fillText(nm, vx, vz + 29);
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
  let pT, rT;
  if (P.gnd) {
    const hF = rideSurf(P.x + fx * 1.3, P.z + fz * 1.3), hR = rideSurf(P.x - fx * 1.2, P.z - fz * 1.2);
    const hL = rideSurf(P.x + lx * 0.6 + fx * 0.4, P.z + lz * 0.6 + fz * 0.4), hRt = rideSurf(P.x - lx * 0.6 + fx * 0.4, P.z - lz * 0.6 + fz * 0.4);
    pT = Math.atan2(hF - hR, 2.5) + (P.wet ? 0.07 + P.sink * 0.5 : 0) + input.thr * 0.05 * (1 - clamp(spd / 20, 0, 1)) + P.exc * 0.25;
    rT = Math.atan2(hL - hRt, 1.2);
  } else { pT = Math.atan2(P.vy, Math.max(spd, 1)) * 0.35 + P.airP; rT = P.airR; }
  const whT = P.wh * (0.52 + Math.sin(performance.now() * 0.0061) * 0.05 + Math.sin(performance.now() * 0.017) * 0.02);
  P.whVis += (whT - P.whVis) * (1 - Math.exp(-(whT > P.whVis ? 6 : 9) * dt));
  pT += P.whVis + BOG.sink * 0.3;
  const k = 1 - Math.exp(-(P.gnd ? 12 : 3) * dt);
  P.pitch += (pT - P.pitch) * k; P.roll += (rT - P.roll) * k;
  const lean = input.steer * (0.1 + input.lean * 0.1) * clamp(spd / 15, 0, 1);
  sledRoot.position.set(P.x, P.y + 1.5 * Math.sin(Math.max(0, P.whVis)) - BOG.sink, P.z);
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
  const FXp = FOOT.on ? FOOT.x : P.x, FYp = FOOT.on ? FOOT.y : P.y, FZp = FOOT.on ? FOOT.z : P.z;   // what the camera follows: the sled, or the rider on foot
  camState.yaw = angLerp(camState.yaw, FOOT.on ? FOOT.yaw : angLerp(P.yaw, velYaw, 0.35), 1 - Math.exp(-(FOOT.on ? 2.2 : 3.5) * dt));
  const cfx = Math.sin(camState.yaw), cfz = Math.cos(camState.yaw);
  let look = null;
  if (view.fp) {
    // rider's eye: follows the sled's position and yaw, but the horizon stays mostly level
    sledRoot.updateMatrixWorld();
    const eye = sledRoot.localToWorld(_camEye.set(0, 1.66, -0.14));
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
  } else {
    // towing: back the chase cam off so the rig behind you is in the shot
    camState.tow = (camState.tow || 0) + ((TOW.kind ? HITCH[TOW.kind].len + 1.4 : 0) - (camState.tow || 0)) * (1 - Math.exp(-2 * dt));
    const td = camState.tow * (view.d < 10 ? 1 : 0.35);
    const want = _camWant.set(FXp - cfx * (view.d + td), FYp + view.h + td * 0.4, FZp - cfz * (view.d + td));
    want.y = Math.max(want.y, rideSurf(want.x, want.z) + 1.3);
    if (!camState.init) { camera.position.copy(want); camState.init = true; }
    else camera.position.lerp(want, 1 - Math.exp(-6 * dt));
    camera.position.y = Math.max(camera.position.y, rideSurf(camera.position.x, camera.position.z) + 1.0);
    look = _camAim.set(FXp + cfx * 4, FYp + 1.1, FZp + cfz * 4);
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
  const fov = view.f + Math.min(16, spd * 0.4);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * (1 - Math.exp(-3 * dt)); camera.updateProjectionMatrix(); }
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
    if (safeT > 2 && P.gnd && !P.wet && !isSea(P.x, P.z) && spd > 3 && !tipped) { P.safe = { x: P.x - fx * 4, z: P.z - fz * 4, yaw: P.yaw }; safeT = 0; }
  }
  return spd;
}
function updHud(spd) {
  $("spd").textContent = Math.round(spd * 2.237);
  const stt = P.wet ? "WATER" : P.ice ? "ICE" : (P.pack > 0.62 ? "PACKED" : "POWDER");
  const pill = $("pill"); if (pill.dataset.s !== stt) { pill.dataset.s = stt; pill.textContent = stt; }
  $("bonus").textContent = P.wet ? (P.sink > 0.08 ? "Sinking! Pin it!" : "Skipping water") : P.rut > 0.5 && P.pack > 0.5 && P.wh < 0.5 ? "In the groove" : P.wh > 0.7 ? "Wheelie " + Math.round(P.whRun) + " m" + (P.whBest > 5 ? " · best " + Math.round(P.whBest) : "") : P.dumped > 0 ? "Snow dump!" : stt === "PACKED" ? "On your tracks" : (stt === "ICE" ? "Low grip" : (P.exc > 0.2 ? "Breaking trail" : ""));
  $("dragFill").style.width = clamp((P.drag + TOW.drag) / 2600 * 100, 0, 100) + "%";
  $("dragN").textContent = Math.round(P.drag + TOW.drag) + " N";
  const b = bioAt(P.x, P.z), h = groundAt(P.x, P.z);
  $("zoneName").textContent = b === 3 ? "OPEN WATER" : b === 1 ? "FROZEN LAKE" : (h > 120 ? "HIGH COUNTRY" : (b === 2 ? "BOREAL FOREST" : "OPEN BACKCOUNTRY"));
  $("elev").textContent = "Elev " + Math.round(h * 3 + 180) + " m";
  $("dist").textContent = (P.dist / 1000).toFixed(1) + " km";
}

/* ---------------- courier survival layer ---------------- */
const GAMEHOUR = 30;                       // real seconds per in-game hour (a full day is 12 minutes)
const GS = {
  cash: 0, fuel: 18, cap: 18, warmth: 100, hour: 9.6, load: [], jobs: [], delivered: 0, rescues: 0, rescueJob: null,
  storm: 0, stormT: 170, stormPhase: "calm", warned: false, boardOpen: false, garageOpen: false, dead: false, near: null, own: null, kitWarned: false,
  outWarned: false, coldWarned: false, lowWarned: false, smokeT: 0, fadeT: 0
};
const GOD = { fuel: false, warm: false, turbo: false, lowg: false, freeze: false };
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
}
function nearSite(x, z, r) {
  return SITES.some(s => s.x !== undefined && (Math.hypot(x - s.x, z - s.z) < Math.max(r, s.clear || 0) || Math.hypot(x - s.x + 11, z - s.z) < r));
}

/* ---------------- building kit: shared by the villages and the town ---------------- */
const KIT = (() => {
  const L = c => new THREE.MeshLambertMaterial({ color: c });
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
const headlight = new THREE.SpotLight(0xfff0d0, 0.4, 80, 0.55, 0.55, 1.1);
headlight.position.set(0, 0.6, 1.3); headlight.target.position.set(0, -1.2, 14);
sledBody.add(headlight, headlight.target);

const C_STORMDAY = new THREE.Color(0xaab5c1), C_STORMNIGHT = new THREE.Color(0x1b2331), _c1 = new THREE.Color(), _c2 = new THREE.Color();
// Real sky geometry for Kjøllefjord (71°N) in late winter: the sun rises in the south-east around
// eight, crawls to about 10° at noon, sets south-west around four, then takes hours sliding through
// sunset, civil, nautical and astronomical twilight. The moon runs its own track and phase (a
// lunar month is ~29 game days), so some nights are bright blue moonlight and some are black.
const R2D = 180 / Math.PI, LAT = 71 / R2D, SDEC = -9 / R2D, MDEC = 16 / R2D;
const _sunV = new THREE.Vector3(), _moonV = new THREE.Vector3(), POLE = new THREE.Vector3(0, Math.sin(LAT), -Math.cos(LAT));
function skyDir(ha, dec, out) {                       // hour angle + declination -> world dir (x east, y up, -z north)
  const cd = Math.cos(dec), cl = Math.cos(LAT), sl = Math.sin(LAT);
  return out.set(-cd * Math.sin(ha), sl * Math.sin(dec) + cl * cd * Math.cos(ha), -(cl * Math.sin(dec) - sl * cd * Math.cos(ha)));
}
function sunEl(h) { return Math.asin(clamp(skyDir((h - 12) / 12 * Math.PI, SDEC, _sunV).y, -1, 1)) * R2D; }   // degrees
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
  [12, [.30, .46, .70], [.60, .72, .86], [.86, .85, .86], [.86, .85, .86], [.77, .83, .89], [.74, .83, .93], .62, [.6, .43, .27]]
];
const SUNK = [[-2, [1, .42, .22]], [1, [1, .55, .32]], [4, [1, .72, .5]], [10, [1, .86, .72]]];
function keyAt(K, e, i, out) {
  let j = 0; while (j < K.length - 2 && e > K[j + 1][0]) j++;
  const t = clamp((e - K[j][0]) / (K[j + 1][0] - K[j][0]), 0, 1), A = K[j][i], B = K[j + 1][i];
  if (typeof A === "number") return lerp(A, B, t);
  return out.setRGB(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
const C_MOON = new THREE.Color(0.6, 0.7, 1.0), C_AUR = new THREE.Color(0.35, 0.85, 0.55);
function updSky() {
  const H = GS.hour, h = H % 24, st = GS.storm, u = sky.material.uniforms;
  // sun
  skyDir((h - 12) / 12 * Math.PI, SDEC, _sunV); const e = Math.asin(clamp(_sunV.y, -1, 1)) * R2D;
  // moon: runs ~50 min later every day, so its phase and rise time drift through the month
  const lag = (H / 24 * 12.19 + 25) % 360 / R2D, illum = 0.5 * (1 + Math.cos(lag));
  skyDir((h - 12) / 12 * Math.PI + Math.PI - lag, MDEC, _moonV); const me = Math.asin(clamp(_moonV.y, -1, 1)) * R2D;
  const dayness = sstep(-10, 4, e), night = sstep(-4, -13, e);
  // aurora activity wanders: quiet some nights, a full storm on others
  const act = clamp(0.2 + 0.8 * (0.5 + 0.5 * Math.sin(H * 0.41 + 0.7) * Math.sin(H * 0.173 + 2.1)), 0, 1);
  const aur = sstep(-6, -15, e) * act * (1 - 0.45 * illum * sstep(0, 15, me));
  u.uTime.value = gameClock; u.uStorm.value = st; u.uAurora.value = aur;
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
  hemi.intensity = keyAt(SKYK, e, 7) + 0.1 * illum * moonUp * night * (1 - st);
  keyAt(SKYK, e, 6, hemi.color).lerp(C_AUR, 0.2 * aur);
  hemi.groundColor.setRGB(lerp(0.34, 0.91, dayness), lerp(0.40, 0.93, dayness), lerp(0.55, 0.96, dayness));
  renderer.toneMappingExposure = lerp(0.95, 1.05, dayness);
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
function makeJobs(from) {
  const shuf = a => a.sort(() => Math.random() - 0.5);
  const homes = shuf(SITES.filter(s => s.type === "home" && Math.hypot(s.x - from.x, s.z - from.z) < 1000));
  const far = shuf(SITES.filter(s => s.type !== "depot" && s.type !== "shop" && s.type !== "home"));
  const nL = Math.min(homes.length, localCount(GS.delivered));
  const hc = shuf(HOME_CARGO.slice()), fc = shuf(CARGO.slice());   // no two of the same thing on one board
  GS.jobs = [];
  for (let k = 0; k < 3; k++) {
    const local = k < nL, d = local ? homes[k] : far[k - nL], cg = local ? hc[k] : fc[k];
    const { dist, climb, est } = jobGeom(d, from), urgent = Math.random() < (local ? 0.3 : 0.4);
    const pay = Math.round(((local ? 30 : 35) + dist * 0.12 + climb * (local ? 0.25 : 0.5)) * cg[1] * (urgent ? 1.5 : 1) / 5) * 5;
    GS.jobs.push({ dest: d, cargo: cg[0], fragile: cg[2], pay, local, due: urgent ? GS.hour + est * 1.7 / GAMEHOUR : null });
  }
  if (steamerIn()) postSteamerFreight();
  makeContracts(from);
}
function makeContracts(from) {
  const lvl = GS.delivered, cabins = SITES.filter(s => s.type === "cabin").sort(() => Math.random() - 0.5), relay = SITES.find(s => s.type === "relay");
  const C = [];
  // grooming: drag a groomer down the line to a cabin and leave it set hard
  if (lvl >= 3) {
    const d = cabins[0], { dist, climb, est } = jobGeom(d, from);
    C.push({ groom: true, dest: d, cargo: `Groom the ${d.name.replace(/ (herder cabin|wind farm|lighthouse)$/, "")} trail`, pay: round5(140 + dist * 0.22 + climb * 0.6), due: GS.hour + est * 3.2 / GAMEHOUR, need: "groomer" });
  } else C.push({ locked: "Grooming contracts", sub: `Trail crew work — ${RANKS[1].at} deliveries` });
  // heavy freight: one or two on the trailer
  if (lvl >= 5) {
    const n = lvl >= 9 ? 2 : 1, menu = HEAVY.filter(x => x.lvl <= lvl).sort(() => Math.random() - 0.5);
    for (let k = 0; k < n; k++) {
      const d = cabins[1 + k], h = menu[k % menu.length], { dist, climb, est } = jobGeom(d, from), urgent = Math.random() < 0.3;
      const pay = round5((120 + dist * 0.3 + climb * 1.2) * h.mul * (urgent ? 1.35 : 1));
      C.push({ big: true, bays: 1, dest: d, cargo: h.cargo, kg: h.kg, fragile: h.fragile, look: h.look, pay, bond: round5(pay * 0.15), due: urgent ? GS.hour + est * 2.2 / GAMEHOUR : null, need: "trailer" });
    }
  } else C.push({ locked: "Heavy freight", sub: `Appliances, generators, solar kits — ${RANKS[2].at} deliveries and a trailer` });
  // priority: someone's in trouble, tonight
  if (lvl >= 12) {
    const d = cabins[3], p = pick(PRIORITY), { dist, climb, est } = jobGeom(d, from);
    const pay = round5((120 + dist * 0.3 + climb * 1.2) * (2.1 + GS.storm * 0.8));
    C.push({ big: true, bays: 1, priority: true, dest: d, cargo: p.cargo, kg: p.kg, fragile: p.fragile, look: p.look, why: p.why.replace("{s}", d.name), pay, bond: round5(pay * 0.25), due: GS.hour + est * 1.35 / GAMEHOUR, need: "trailer" });
  } else if (lvl >= 5) C.push({ locked: "Priority runs", sub: `Emergencies at the cabins — ${RANKS[3].at} deliveries` });
  // expedition: out to the lighthouse on the tip, on the flatbed
  if (lvl >= 20 && relay) {
    const e = pick(EXPEDITION), { dist, climb, est } = jobGeom(relay, from);
    const pay = round5((400 + dist * 0.5 + climb * 2.5) * (e.fragile ? 1.25 : 1.1));
    C.push({ big: true, bays: 2, expedition: true, dest: relay, cargo: e.cargo, kg: e.kg, fragile: e.fragile, look: e.look, why: e.why, pay, bond: round5(pay * 0.2), due: GS.hour + est * 2.6 / GAMEHOUR, need: "flatbed" });
  } else if (lvl >= 12) C.push({ locked: "Slettnes expeditions", sub: `Flatbed loads out to the lighthouse — ${RANKS[4].at} deliveries` });
  // recovery call-outs: a generated stuck rider, somewhere the ground would catch them
  if (ST && ST.winch) { const r = makeRescue(from); C.push(r || { locked: "Recovery call-outs", sub: "Nobody's stuck right now. Check back after the next storm." }); }
  else C.push({ locked: "Recovery call-outs", sub: "Stuck riders out on the fell pay well. Fit a winch at the garage." });
  GS.contracts = C; GS.contractsWinch = ST ? ST.winch : 0;
}
const smallLoads = () => GS.load.filter(j => !j.big);
const baysUsed = () => bigLoads().reduce((a, j) => a + j.bays, 0);
function acceptJob(k) {
  const j = GS.jobs[k]; if (!j) return;
  if (smallLoads().length >= ST.slots) { toast(ST.slots === 1 ? "Your rack holds one parcel. The garage sells longer decks." : `You're full at ${ST.slots} parcels.`, "warn"); return; }
  j.hits = 0; GS.load.push(j); GS.jobs.splice(k, 1);
  toast(`Loaded: ${j.cargo} for ${j.dest.name}. ${smallLoads().length}/${ST.slots} on the rack.`);
  renderBoard(); applyLoadout(); save();
}
const HITCH_NAME = { groomer: "a groomer drag", tiller: "a wing tiller", trailer: "a freight trailer", flatbed: "the heavy flatbed" };
function acceptContract(k) {
  const c = GS.contracts && GS.contracts[k]; if (!c || c.locked) return;
  if (c.rescue) {
    if (GS.rescueJob) { toast("Finish the call you're on first.", "warn"); return; }
    if (ST.winch < c.needTier) { toast(`That call needs a ${["", "hand", "electric", "heavy-duty"][c.needTier]} winch or better.`, "warn"); return; }
    GS.contracts.splice(k, 1); closeBoard(); rescueStart(c); save(); return;
  }
  const hitch = GS.own.parts.hitch;
  if (c.groom) {
    if (!isGroomer(hitch)) { toast("That's grooming work. Nordkinn Skuter & Service sells a groomer drag for the hitch.", "warn"); return; }
    if (GS.groomJob) { toast("Finish the line you're grooming first.", "warn"); return; }
    c.pts = groomLine(depot, c.dest); GS.groomJob = c; GS.contracts.splice(k, 1);
    toast(`Groom the line to ${c.dest.name}. The dots on the map are the stretches still to do.`);
    renderBoard(); save(); return;
  }
  const okHitch = c.need === "flatbed" ? hitch === "flatbed" : hitch === "trailer" || hitch === "flatbed";
  if (!okHitch) { toast(`That load needs ${HITCH_NAME[c.need]} on the hitch. The garage across the road sells them.`, "warn"); return; }
  if (baysUsed() + c.bays > ST.bays) { toast(ST.bays > 1 ? "The flatbed's full." : "The trailer's already loaded.", "warn"); return; }
  if (GS.cash < c.bond) { toast(`The shipper wants a $${c.bond} bond up front. You have $${GS.cash}.`, "warn"); return; }
  GS.cash -= c.bond; c.cond = 100; c.hits = 0; GS.load.push(c); GS.contracts.splice(k, 1);
  toast(`Strapped down: ${c.cargo} (${c.kg} kg) for ${c.dest.name}. $${c.bond} bond paid, back on delivery.${c.priority ? " Clock's running." : ""}`, c.priority || c.expedition ? "warn" : undefined);
  renderBoard(); applyLoadout(); save();
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
  p = Math.round(p); GS.cash += p; GS.groomJob = null; bumpDelivered();
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
  if (crates.length) {
    GS.load = GS.load.filter(j => !crates.includes(j));
    const sd = sledDef();
    for (const j of crates) {
      const p = j.crate, d = engDef(p.inst.eid);
      GS.own.pickups.splice(GS.own.pickups.indexOf(p), 1);
      if (isElectric(sd)) { GS.own.shelf.push(p.inst); toast(`The ${d.name} goes on the shelf. Nowhere to put it in a battery sled.`); }
      else { fitEngine(p.inst, sd); toast(`The shop drops the ${d.name} into the ${sd.name}: ${Math.round(p.inst.pwr * 100)}% power.`, "good"); }
    }
    applyLoadout(); save();
  }
  const here = GS.load.filter(j => j.dest === site);
  if (!here.length) return;
  GS.load = GS.load.filter(j => j.dest !== site);
  let total = 0, notes = [], clean = true, lost = 0;
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
    if (j.bond) { if (bondBack) p += j.bond; else lost += j.bond; }
    total += Math.round(p); bumpDelivered();
  }
  GS.cash += total;
  const what = here.length > 1 ? here.length + " loads" : here[0].cargo.toLowerCase();
  toast(`Delivered ${what} to ${site.name}: +$${total}${notes.length ? " (" + notes.join(", ") + ")" : ""}${lost ? ` · −$${lost} bond` : ""}`, total > 0 ? "good" : "bad");
  if (site.type !== "depot") {
    if (clean) GS.fuel = Math.min(GS.cap, GS.fuel + GS.cap * 0.35);
    if (smallLoads().length < ST.slots && Math.random() < 0.6) {
      const dist = Math.hypot(site.x - depot.x, site.z - depot.z);
      const back = { dest: depot, cargo: BACKHAUL[(Math.random() * BACKHAUL.length) | 0], fragile: false, pay: Math.round((20 + dist * 0.07) * 1.3 / 5) * 5, due: boatDue(site), boat: true, hits: 0 };
      setTimeout(() => {
        if (GS.dead || smallLoads().length >= ST.slots) return;   // the boxes came off; the backhaul goes on once they've handed it over
        GS.load.push(back); applyLoadout(); save();
        toast(`${clean ? "They topped off your tank and handed" : "They look over the dents, then hand"} you ${back.cargo.toLowerCase()} for the boat. She sails at ${fmtTime(back.due)}.`);
      }, 1400);
    } else setTimeout(() => toast(clean ? "They topped off your tank." : "No fuel for you after that."), 1400);
  } else if (!GS.load.length) setTimeout(() => toast("Press E for the job board."), 1400);
  applyLoadout(); save();
}
function blackout(kind) {
  if (GS.dead) return;
  GS.dead = true; closeBoard(); clearRecovery(); if (typeof rescueAbort === "function") rescueAbort();
  const tow = kind === "tow", wet = kind === "sea", fee = Math.round((tow ? 100 : wet ? 140 : 60) * (1 - (ST ? ST.rescue : 0)));
  const cargo = GS.load.length ? (GS.load.length > 1 ? GS.load.length + " loads" : GS.load[0].cargo.toLowerCase()) : "";
  const bonds = GS.load.reduce((a, j) => a + (j.bond || 0), 0);
  // a tow, a blackout or the fjord: whatever you were carrying is gone, and so are the bonds on it
  const lost = cargo ? (tow ? ` The tow crew only takes you and the sled — your ${cargo} stayed out there.` : ` The ${cargo} didn't make it.`) + (bonds ? ` The shippers keep your $${bonds} in bonds.` : "") : "";
  GS.cash = Math.max(0, GS.cash - fee);
  for (const j of GS.load) if (j.crate) j.crate.aboard = false;   // a paid-for engine isn't lost: it goes back to the seller's shed
  GS.load = [];
  GS.jobs = []; GS.contracts = null;
  applyLoadout();                                     // clear the boxes off the tail (the trailer reads GS.load on its own)
  $("blackMsg").innerHTML = (tow ? "<b>TOWED IN</b>The Red Cross snowmobile crew hauled you and your sled back to the quay. No room for freight." : wet ? "<b>INTO THE FJORD</b>A fishing boat fished you out. The sled came up on a winch, eventually. The fjord kept everything else." : "<b>YOU BLACKED OUT</b>The Red Cross crew found you half-buried in drift and dragged you back to the quay.") + `<span>−$${fee}.${lost}</span>`;
  $("black").hidden = false;
  setTimeout(() => {
    P.x = SPAWN.x; P.z = SPAWN.z; P.yaw = SPAWN.yaw; P.vx = P.vz = P.vy = 0; P.yr = 0; P.y = surf(P.x, P.z) + 0.3;
    recenter(P.x, P.z, false); camState.init = false; camState.yaw = P.yaw; towSnap();
    GS.warmth = 70; GS.fuel = Math.max(GS.fuel, GS.cap * 0.5); heatCool(); GS.outWarned = GS.coldWarned = GS.lowWarned = false;
  }, 1200);
  setTimeout(() => { $("black").hidden = true; GS.dead = false; save(); }, 3800);
}
function save() { try { localStorage.setItem("tracklayer.save.v2", JSON.stringify({ cash: GS.cash, delivered: GS.delivered, rescues: GS.rescues || 0, own: GS.own })); } catch (e) { } }
function load() {
  GS.own = OWN0();
  try {
    const d = JSON.parse(localStorage.getItem("tracklayer.save.v2") || "null");
    if (d) { GS.cash = d.cash || 0; GS.delivered = d.delivered || 0; GS.rescues = d.rescues || 0; if (d.own) { const parts0 = GS.own.parts; Object.assign(GS.own, d.own); GS.own.parts = Object.assign(parts0, d.own.parts || {}); } }
    else { const old = JSON.parse(localStorage.getItem("tracklayer.save.v1") || "null"); if (old) { GS.cash = old.cash || 0; GS.delivered = old.delivered || 0; } }
  } catch (e) { }
  migrateEngines();
  restat(); GS.fuel = GS.cap;
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
// one least-cost search out from the quay gives the line to every place on the map
function ctRoutes() {
  if (!CT.ready) return;
  const n = CT.RN, N2 = n * n, st = WORLD / (n - 1), h = CT.rh, mul = CT.rm, tf = CT.tf, dist = CT.dist, par = CT.par, hp = CT.hp, pos = CT.pos;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {        // packed trail (yours, or the other riders') is cheap going
    let v = 0;
    for (let dz = -4; dz < 4 && v <= 70; dz++) { const z = j * 8 + dz; if (z < 0 || z >= TR) continue; for (let dx = -4; dx < 4; dx++) { const x = i * 8 + dx; if (x < 0 || x >= TR) continue; const t = trailData[(z * TR + x) * 4]; if (t > v) v = t; } }
    tf[j * n + i] = v > 70 ? 0.55 : 1;
  }
  dist.fill(Infinity); par.fill(-1); pos.fill(-1);
  let hn = 0;
  const up = i => { const v = hp[i], k = dist[v]; while (i > 0) { const p = (i - 1) >> 1, pv = hp[p]; if (dist[pv] <= k) break; hp[i] = pv; pos[pv] = i; i = p; } hp[i] = v; pos[v] = i; };
  const down = i => { const v = hp[i], k = dist[v]; for (;;) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && dist[hp[c + 1]] < dist[hp[c]]) c++; if (dist[hp[c]] >= k) break; hp[i] = hp[c]; pos[hp[i]] = i; i = c; } hp[i] = v; pos[v] = i; };
  const s0 = ctNode(depot.x, depot.z); dist[s0] = 0; hp[hn] = s0; up(hn++);
  const DI = [-1, 0, 1, -1, 1, -1, 0, 1], DJ = [-1, -1, -1, 0, 0, 1, 1, 1];
  while (hn > 0) {
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
  for (const s of SITES) if (s.type !== "depot" && s.type !== "shop" && s.x !== undefined) CT.routes[s.id] = ctPath(s);
  for (const c of GS.contracts || []) if (c.rescue) CT.routes[c.dest.id] = ctPath(c.dest);
}
function ctPath(site) {
  const n = CT.RN, st = WORLD / (n - 1), end = ctNode(site.x, site.z);
  let P = [];
  if (CT.dist[end] < Infinity) for (let v = end; v >= 0; v = CT.par[v]) P.push([(v % n) * st - HALF, ((v / n) | 0) * st - HALF]);
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
  return { P, L };
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
// the fixed chart plus the trails on it right now, into the board's lower canvas
function ctPaintBase() {
  const cv = $("bMap"); if (!cv || !CT.ready || !BD.css) return;
  const S = cv.width, g = cv.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(ctStatic(S, BD.css), 0, 0);
  const t = CT.tint || (CT.tint = document.createElement("canvas")); t.width = t.height = MB;
  const tg = t.getContext("2d"); tg.clearRect(0, 0, MB, MB); tg.drawImage(mapTrail, 0, 0);
  tg.globalCompositeOperation = "source-in"; tg.fillStyle = "#8c3a1c"; tg.fillRect(0, 0, MB, MB); tg.globalCompositeOperation = "source-over";
  g.save(); g.beginPath(); const e = 6 * S / CT_REF; g.rect(e, e, S - 2 * e, S - 2 * e); g.clip();
  g.globalAlpha = 0.72; g.imageSmoothingEnabled = true; g.drawImage(t, 0, 0, S, S); g.restore();
}
// load the chart's faces before drawing it, and redraw once they arrive
function ctFonts() {
  if (!document.fonts || !document.fonts.load) return;
  Promise.all([`italic 500 16px ${CT_SERIF}`, `500 16px ${CT_SERIF}`, `600 12px ${CT_SANS}`, `700 12px ${CT_SANS}`].map(f => document.fonts.load(f).catch(() => null)))
    .then(() => { CT.fonts++; if (GS.boardOpen) ctPaintBase(); });
}

// a little grain for the board's paper, made once
function boardPaper() {
  const c = document.createElement("canvas"); c.width = c.height = 160;
  const g = c.getContext("2d"), img = g.createImageData(160, 160), D = img.data;
  for (let i = 0; i < D.length; i += 4) { const q = Math.random(); if (q < 0.035) { D[i] = 92; D[i + 1] = 70; D[i + 2] = 46; D[i + 3] = 12 + q * 900; } else if (q > 0.976) { D[i] = 255; D[i + 1] = 253; D[i + 2] = 246; D[i + 3] = 110; } }
  g.putImageData(img, 0, 0);
  $("bSheet").style.backgroundImage = `url(${c.toDataURL()})`;
}

/* the board itself: parcels and contracts on the left, the chart on the right */
const BD = { rows: [], sel: -1, selObj: null, ptr: "mouse", downT: -1e9, cur: null, prev: null, triA: -Math.PI / 2, nav: 0, navT: 0, padA: true, css: 0, land: true };
const shortName = s => s.name.replace(/ (herder cabin|wind farm|lighthouse)$/, "");
const fmtCash = v => "$" + Math.round(v).toLocaleString("en-US");
const HITCH_ON = { none: "Nothing on the hitch", groomer: "Groomer drag on the hitch", tiller: "Wing tiller on the hitch", trailer: "Freight trailer on the hitch", flatbed: "Heavy flatbed on the hitch" };
const gsCls = g => "gs" + (g > 0.8 ? 3 : g > 0.45 ? 2 : g > 0.15 ? 1 : 0);
const groomSay = g => g > 0.8 ? "Packed trail most of the way." : g > 0.45 ? "About half of it is packed trail." : g > 0.15 ? "Mostly unbroken snow." : "Unbroken snow the whole way.";
const routeKm = d => { const r = CT.routes[d.id]; return r ? r.L / 1000 : Math.hypot(d.x - depot.x, d.z - depot.z) / 1000; };
const climbOf = d => Math.round(Math.max(0, d.y - depot.y) * 3);
function boardLayout() {
  const W = innerWidth, H = innerHeight, sh = $("bSheet"), land = W >= 700 && W > H * 1.15;
  let S, col = 0;
  if (land) {
    S = Math.min(H - 24 - 30, 860); col = clamp(W - 24 - S - 16, 380, 470);   // the list keeps its width; the chart gives way
    if (W - 24 - 16 - col < S) S = Math.max(220, W - 24 - 16 - col);
  } else S = Math.min(W - 24 - 26, H * 0.5, 640);
  S = Math.floor(S);
  BD.land = land; BD.css = S;
  sh.classList.toggle("stack", !land);
  sh.style.setProperty("--bmap", S + "px"); sh.style.setProperty("--bcol", col + "px");
  const px = Math.round(S * Math.min(2, devicePixelRatio || 1));
  for (const id of ["bMap", "bOv"]) { const c = $(id); if (c.width !== px) c.width = c.height = px; c.style.width = c.style.height = S + "px"; }
}
function boardRow(r) {
  const b = document.createElement("button"); b.type = "button"; b.className = "brow " + r.kind + (r.cls ? " " + r.cls : "");
  b.innerHTML = `<span class="bk">${r.key !== undefined ? r.key : "·"}</span><span class="bc">${r.title}${r.chips || ""}</span><span class="bp">${r.pay}</span><span class="bm">${r.meta}</span>`;
  if (r.kind === "locked") { b.tabIndex = -1; b.setAttribute("aria-disabled", "true"); }
  else {
    const i = BD.rows.length;
    b.addEventListener("pointerdown", e => { BD.ptr = e.pointerType || "mouse"; BD.downT = performance.now(); });
    b.addEventListener("mouseenter", () => { if (BD.ptr === "mouse" && BD.sel !== i) boardSelect(i); });
    b.addEventListener("focus", () => { if (BD.sel !== i && performance.now() - BD.downT > 700) boardSelect(i); });   // a tap's focus is left to its click
    b.addEventListener("click", () => { if (BD.ptr !== "mouse" && BD.sel !== i) { boardSelect(i); return; } boardTake(i); });
  }
  r.el = b; BD.rows.push(r);
  return b;
}
function renderBoard() {
  const sm = smallLoads(), bg = bigLoads(), box = $("boardRows");
  $("boardCash").textContent = fmtCash(GS.cash);
  const rk = rankOf(GS.delivered), nx = RANKS[RANKS.indexOf(rk) + 1];
  $("boardRank").textContent = `${rk.name} · ${GS.delivered} delivered${nx ? ` · ${nx.name} at ${nx.at}` : ""}`;
  box.innerHTML = ""; BD.rows = [];
  const sec = (a, b) => { const d = document.createElement("div"); d.className = "bsx"; d.innerHTML = `<span>${a}</span><span>${b || ""}</span>`; box.appendChild(d); };
  const note = t => { const d = document.createElement("div"); d.className = "bnote"; d.textContent = t; box.appendChild(d); };
  const gTag = d => { const g = groom[d.id] || 0; return `<span class="${gsCls(g)}">${groomLabel(g)}</span>`; };
  sec("Parcels", `Rack ${sm.length}/${ST.slots}`);
  if (!GS.jobs.length) note(sm.length ? "Rack loaded: " + sm.map(j => j.cargo.toLowerCase() + " for " + shortName(j.dest)).join(", ") + "." : "No parcels posted.");
  GS.jobs.forEach((j, k) => box.appendChild(boardRow({
    kind: "job", k, key: k + 1, obj: j, dest: j.dest, title: j.cargo,
    chips: (j.steamer ? `<span class="bchip due">OFF THE STEAMER</span>` : "") + (j.local && !j.steamer ? `<span class="bchip">NEAR TOWN</span>` : "") + (j.fragile ? `<span class="bchip fragile">FRAGILE</span>` : "") + (j.due ? `<span class="bchip due">DUE ${fmtTime(j.due)}</span>` : ""),
    pay: fmtCash(j.pay), meta: `to ${shortName(j.dest)} · ${routeKm(j.dest).toFixed(1)} km · ${gTag(j.dest)}`
  })));
  sec("Contracts", HITCH_ON[GS.own.parts.hitch] + (ST.bays ? ` · ${baysUsed()}/${ST.bays}` : ""));
  if (bg.length) note("On the trailer: " + bg.map(j => `${j.cargo.toLowerCase()} (${Math.round(j.cond)}%)`).join(", ") + ".");
  if (GS.groomJob) note(`Grooming the line to ${shortName(GS.groomJob.dest)}: ${Math.round(groomFrac(GS.groomJob) * 100)}% done.`);
  let n = 4;
  (GS.contracts || []).forEach((c, k) => {
    if (c.locked) { box.appendChild(boardRow({ kind: "locked", title: c.locked, pay: "Locked", meta: c.sub })); return; }
    const hitch = GS.own.parts.hitch, fits = c.rescue ? ST.winch >= c.needTier : c.groom ? isGroomer(hitch) : c.need === "flatbed" ? hitch === "flatbed" : hitch === "trailer" || hitch === "flatbed";
    const tag = c.rescue ? "recovery" : c.groom ? "grooming" : c.expedition ? "expedition" : c.priority ? "priority" : "heavy";
    box.appendChild(boardRow({
      kind: "con", k, key: n++, obj: c, dest: c.dest, title: c.cargo, cls: fits ? "" : "nofit",
      chips: `<span class="bchip ${tag}">${tag.toUpperCase()}</span>` + (c.rescue ? c.comps.map(x => `<span class="bchip ${x === "short" || x === "hurt" ? "due" : ""}">${({ storm: "STORM", night: "NIGHT", hurt: "HURT", short: "COLD", two: "TWO STUCK" })[x]}</span>`).join("") : "") + (c.due ? `<span class="bchip due">${c.rescue ? "CLOCK" : "DUE"} ${fmtTime(c.due)}</span>` : ""),
      pay: fmtCash(c.pay),
      meta: c.rescue ? `${routeKm(c.dest).toFixed(1)} km by trail · ${["", "hand", "electric", "heavy"][c.needTier]} winch or better · ${TRAPS[c.trap].lvl >= 6 ? "hard" : TRAPS[c.trap].lvl >= 3 ? "tricky" : "easy"}` : c.groom ? `${(Math.hypot(c.dest.x - depot.x, c.dest.z - depot.z) / 1000).toFixed(1)} km of line to ${shortName(c.dest)} · ${gTag(c.dest)}` : `to ${shortName(c.dest)} · ${routeKm(c.dest).toFixed(1)} km · ${c.kg} kg${c.fragile ? " · fragile" : ""}`
    }));
  });
  sec("Garage", "across the road");
  box.appendChild(boardRow({ kind: "garage", key: "G", obj: "garage", dest: garageSite, title: "Nordkinn Skuter & Service", pay: `<small>${sledDef().name}</small>`, meta: "sleds, parts, rider kit and the hitch rigs" }));
  // keep the same line picked if it's still there, else the one that took its place
  let i = BD.rows.findIndex(r => r.obj === BD.selObj);
  if (i < 0) i = BD.rows.findIndex((r, q) => q >= Math.max(0, BD.sel) && r.kind !== "locked");
  if (i < 0) i = BD.rows.findIndex(r => r.kind !== "locked");
  BD.sel = -1; boardSelect(i, false);
}
function boardDetail(r) {
  const el = $("boardDetail"); if (!r) { el.innerHTML = ""; return; }
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let head = "", lines = [], warn = "", act = "", blocked = false;
  const d = r.dest, km = routeKm(d).toFixed(1), g = groom[d.id] || 0;
  if (r.kind === "job") {
    const j = r.obj;
    head = `To ${shortName(d)} · ≈ ${km} km by trail · climb ${climbOf(d)} m`;
    lines.push(`${groomSay(g)}${j.fragile ? ` Fragile: each hard knock costs ${ST.care ? "7.5" : "15"}% of the pay.` : ""}${j.due ? ` Due ${fmtTime(j.due)}, late pays half.` : ""}`);
    if (smallLoads().length >= ST.slots) { warn = ST.slots === 1 ? "Your rack holds one parcel. The garage sells longer decks." : `You're full at ${ST.slots} parcels.`; blocked = true; }
    act = `LOAD IT · ${fmtCash(j.pay)}`;
  } else if (r.kind === "con") {
    const c = r.obj, hitch = GS.own.parts.hitch;
    if (c.rescue) {
      head = `${c.dest.name} · ≈ ${km} km by trail · climb ${climbOf(d)} m`;
      lines.push(`<span class="why">${esc(c.why)}</span>`);
      lines.push(`Clock: ${fmtTime(c.due)}. Park on the rim, get off, walk the line out and hook on, strap your sled back to a tree and reel them out. Pays for getting them clear, more for being fast and gentle. About ${c.reach} m of line to do it in one pull.`);
      if (ST.winch < c.needTier) { warn = `Needs a ${["", "hand", "electric", "heavy-duty"][c.needTier]} winch or better. The garage across the road sells them.`; blocked = true; }
      else if (GS.rescueJob) { warn = "Finish the call you're on first."; blocked = true; }
      act = `TAKE THE CALL · ${fmtCash(c.pay)}`;
    } else if (c.groom) {
      head = `Groom the line to ${shortName(d)} · ${(Math.hypot(d.x - depot.x, d.z - depot.z) / 1000).toFixed(1)} km · climb ${climbOf(d)} m`;
      lines.push(`Drag a groomer down the straight line from the quay and leave it set hard. Pays for how much of it you groom, more for a clean line, and more again if the wing tiller lays it wide. Due ${fmtTime(c.due)}.`);
      if (!isGroomer(hitch)) { warn = "That's grooming work. You need a groomer drag on the hitch: the garage sells them."; blocked = true; }
      else if (GS.groomJob) { warn = "Finish the line you're grooming first."; blocked = true; }
      act = `TAKE THE LINE · ${fmtCash(c.pay)}`;
    } else {
      head = `To ${shortName(d)} · ≈ ${km} km by trail · climb ${climbOf(d)} m · ${c.kg} kg`;
      if (c.why) lines.push(`<span class="why">${esc(c.why)}</span>`);
      lines.push(`Pays by condition, refused below 30%.${c.fragile ? " Fragile." : ""} The $${c.bond} bond comes back if it arrives whole${c.priority ? " and on time" : ""}.${c.bays > 1 ? " Takes the whole flatbed." : ""}${c.due ? ` Due ${fmtTime(c.due)}${c.priority ? ", late and they keep the bond" : ", late pays half"}.` : ""}`);
      const okHitch = c.need === "flatbed" ? hitch === "flatbed" : hitch === "trailer" || hitch === "flatbed";
      if (!okHitch) { warn = `Needs ${HITCH_NAME[c.need]} on the hitch. The garage across the road sells them.`; blocked = true; }
      else if (baysUsed() + c.bays > ST.bays) { warn = ST.bays > 1 ? "The flatbed's full." : "The trailer's already loaded."; blocked = true; }
      else if (GS.cash < c.bond) { warn = `The shipper wants a $${c.bond} bond up front. You have $${GS.cash}.`; blocked = true; }
      act = `STRAP IT DOWN · ${fmtCash(c.pay)}`;
    }
  } else if (r.kind === "garage") {
    head = "Across the road, big roll door";
    lines.push(`Sleds, parts, rider kit, and the hitch: groomer drags and freight trailers. You're on the ${sledDef().name}.`);
    act = "RIDE OVER";
  }
  el.innerHTML = `<div class="dl">${esc(head)}</div>${lines.map(t => `<p>${t}</p>`).join("")}${warn ? `<p class="warn">${esc(warn)}</p>` : ""}<div class="bact"><button type="button" class="bgo${blocked ? " blocked" : ""}" id="boardGo">${esc(act)}</button><span class="kb"><kbd>ENTER</kbd></span></div>`;
  $("boardGo").addEventListener("click", () => boardTake(BD.sel));
}
function boardSelect(i, scroll = true) {
  const r = BD.rows[i]; if (!r || r.kind === "locked") return;
  const changed = i !== BD.sel; BD.sel = i; BD.selObj = r.obj;
  BD.rows.forEach((q, k) => q.el.classList.toggle("on", k === i));
  if (changed || !$("boardDetail").firstChild) boardDetail(r);   // first: the details can change the list's height
  if (scroll) r.el.scrollIntoView({ block: "nearest" });
}
function boardMove(d) {
  if (!BD.rows.length) return;
  let i = BD.sel;
  for (let t = 0; t < BD.rows.length; t++) { i = (i + d + BD.rows.length) % BD.rows.length; if (BD.rows[i].kind !== "locked") break; }
  boardSelect(i); const b = BD.rows[i] && BD.rows[i].el; if (b && document.activeElement && document.activeElement.closest && document.activeElement.closest("#board")) b.focus({ preventScroll: true });
}
function boardTake(i) {
  const r = BD.rows[i]; if (!r) return;
  if (i !== BD.sel) boardSelect(i);
  if (r.kind === "job") acceptJob(r.k);
  else if (r.kind === "con") acceptContract(r.k);
  else if (r.kind === "garage") { closeBoard(); toast(TC.on ? "The garage is the shed across the road. Ride over and tap GARAGE." : "The garage is the shed across the road. Ride over and press E."); }
}
function boardKey(e) {
  const c = e.code;
  if (c === "ArrowDown" || c === "KeyS") { e.preventDefault(); boardMove(1); return true; }
  if (c === "ArrowUp" || c === "KeyW") { e.preventDefault(); boardMove(-1); return true; }
  if (c === "Enter" || c === "NumpadEnter") { e.preventDefault(); if (!e.repeat) boardTake(BD.sel); return true; }
  if (c === "Space" || c === "ArrowLeft" || c === "ArrowRight") return true;
  if (/^Digit[1-9]$/.test(c)) { if (!e.repeat) { const i = BD.rows.findIndex(r => r.key === +c.slice(5)); if (i >= 0) boardTake(i); } return true; }
  return false;
}
function boardPad(gp, dt) {
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), ay = gp.axes[1] || 0;
  const nav = b(12) || ay < -0.6 ? -1 : b(13) || ay > 0.6 ? 1 : 0;
  BD.navT -= dt;
  if (nav !== BD.nav || (nav && BD.navT <= 0)) { if (nav) boardMove(nav); BD.navT = nav === BD.nav ? 0.12 : 0.38; }
  BD.nav = nav;
  const a = b(0); if (a && !BD.padA) boardTake(BD.sel); BD.padA = a;
}
function openBoard() {
  updGroom(); if (!GS.jobs.length) makeJobs(depot); else if (!GS.contracts || !GS.contracts.some(c => !c.locked) || (GS.contractsWinch || 0) !== ST.winch || (ST.winch && GS.contracts.some(c => c.locked === "Recovery call-outs"))) makeContracts(depot);   // a winch bought since the board was posted (or a quiet day) gets the call-outs a fresh look
  GS.boardOpen = true; $("board").hidden = false; BD.padA = true; BD.cur = BD.prev = null; BD.selObj = null; BD.sel = -1;
  boardLayout(); ctRoutes(); renderBoard(); ctPaintBase();
  const r = BD.rows[BD.sel]; if (r && !TC.on) r.el.focus({ preventScroll: true });
}
function closeBoard() {
  GS.boardOpen = false; $("board").hidden = true; $("bCall").classList.remove("on");
  if (document.activeElement && document.activeElement.closest && document.activeElement.closest("#board")) document.activeElement.blur();
}
let boardRT = 0;
addEventListener("resize", () => { clearTimeout(boardRT); boardRT = setTimeout(() => { if (GS.boardOpen) { boardLayout(); ctPaintBase(); BD.cur = null; } }, 120); });
$("bOv").addEventListener("click", e => {                         // tap a numbered tag on the chart to pick that job
  const rc = e.currentTarget.getBoundingClientRect(), k = CT_REF / rc.width, x = (e.clientX - rc.left) * k, y = (e.clientY - rc.top) * k;
  let best = -1, bd = 16 * k;
  BD.rows.forEach((r, i) => { if (!r.dest || r.kind === "locked" || !r.tag) return; const d = Math.hypot(r.tag[0] - x, r.tag[1] - y); if (d < bd) { bd = d; best = i; } });
  if (best >= 0) boardSelect(best);
});

/* the chart's moving parts, redrawn every frame the board is open */
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
function ctRouteFor(r) {                                           // the selected line, in chart units
  if (!r || !r.dest) return null;
  if (r.kind === "garage") return { P: [[ctX(depot.x), ctX(depot.z)], [ctX(garageSite.x), ctX(garageSite.z)]], short: true };
  if (r.kind === "con" && r.obj.groom) return { P: [[ctX(depot.x), ctX(depot.z)], [ctX(r.dest.x), ctX(r.dest.z)]], groom: true, pts: groomLine(depot, r.dest) };
  const w = CT.routes[r.dest.id]; if (!w) return null;
  return { P: w.P.map(p => [ctX(p[0]), ctX(p[1])]) };
}
function ctOverlay(now) {
  const cv = $("bOv"); if (!cv || !BD.css) return;
  const g = cv.getContext("2d"), S = cv.width, m = BD.css / CT_REF, LS = clamp(m, 0.84, 1.16), u = v => v * LS / m;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); g.setTransform(S / CT_REF, 0, 0, S / CT_REF, 0, 0);
  g.save(); g.beginPath(); g.rect(6, 6, CT_REF - 12, CT_REF - 12); g.clip();
  const sel = BD.rows[BD.sel], key = sel ? (sel.kind === "garage" ? "garage" : sel.dest.id + ":" + (sel.obj && sel.obj.groom ? "g" : "r") + BD.sel) : "";
  if (!BD.cur || BD.cur.key !== key) {                            // a new line: fade the old one out, draw the new one in
    const o = BD.cur;
    BD.prev = o && o.r ? Object.assign({}, o, { fadeT: now, head: o.r.cum ? u(9.5) + (o.r.L - u(18.5)) * ctEase(clamp((now - o.t0) / o.dur, 0, 1)) : 0 }) : null;
    const r = ctRouteFor(sel);
    if (r) { r.cum = [0]; for (let i = 1; i < r.P.length; i++) r.cum.push(r.cum[i - 1] + Math.hypot(r.P[i][0] - r.P[i - 1][0], r.P[i][1] - r.P[i - 1][1])); r.L = r.cum[r.cum.length - 1]; }
    BD.cur = { key, r, sel, t0: now, dur: r && !r.short ? 520 + r.L * 1.6 : 260, done: false, doneT: 0 };
    $("bCall").classList.remove("on");
  }
  const cur = BD.cur, p = clamp((now - cur.t0) / cur.dur, 0, 1), e = ctEase(p);
  if (!cur.done && p >= 1) { cur.done = true; cur.doneT = now; ctCallout(cur); }
  // the jobs on the board: numbered tags where they go
  const at = {};
  BD.rows.forEach((r, i) => {
    r.tag = null; if (!r.dest || (r.kind !== "job" && r.kind !== "con")) return;
    const n = at[r.dest.id] = (at[r.dest.id] || 0) + 1;
    r.tag = ctTagAt(r.dest, n, u);
  });
  // loads already aboard: a dashed ring where each one is going
  g.setLineDash([u(3), u(2.5)]); g.lineWidth = u(1.4); g.strokeStyle = "rgba(31,26,20,.8)";
  for (const j of GS.load) { g.beginPath(); g.arc(ctX(j.dest.x), ctX(j.dest.z), u(9), 0, 6.2832); g.stroke(); }
  g.setLineDash([]);
  if (GS.groomJob) for (const q of GS.groomJob.pts) { g.fillStyle = q.done ? "#2f7a4a" : CT_ACC; g.beginPath(); g.arc(ctX(q.x), ctX(q.z), u(2), 0, 6.2832); g.fill(); }
  // the line fading out
  if (BD.prev) {
    const fa = 1 - (now - BD.prev.fadeT) / 240;
    if (fa <= 0) BD.prev = null; else if (BD.prev.r && BD.prev.r.cum) ctStroke(g, BD.prev.r, u(9.5), BD.prev.head, fa, u, now, BD.prev.r.groom);
  }
  // the line being plotted, the sled riding it, and the quay's arrow turning to follow
  const qx = ctX(depot.x), qy = ctX(depot.z); let want = -Math.PI / 2;
  if (cur.r && !cur.r.short) {
    const s1 = cur.r.L - u(9), head = u(9.5) + (s1 - u(9.5)) * e;
    if (cur.r.groom) for (const q of cur.r.pts) { const d = Math.hypot(ctX(q.x) - qx, ctX(q.z) - qy); if (d < head) { g.fillStyle = CT_ACC; g.beginPath(); g.arc(ctX(q.x), ctX(q.z), u(2.2), 0, 6.2832); g.fill(); } }
    ctStroke(g, cur.r, u(9.5), head, 1, u, now, cur.r.groom);
    const lead = ctAt(cur.r, Math.min(cur.r.L, u(20))); want = Math.atan2(lead[1] - qy, lead[0] - qx);
  }
  let dA = want - BD.triA; while (dA > Math.PI) dA -= Math.PI * 2; while (dA < -Math.PI) dA += Math.PI * 2;
  BD.triA += dA * 0.18;
  g.save(); g.translate(qx, qy); g.rotate(BD.triA);
  g.beginPath(); for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3; if (k) g.lineTo(Math.cos(a) * u(10), Math.sin(a) * u(10)); else g.moveTo(u(10), 0); } g.closePath();
  g.lineJoin = "round"; g.strokeStyle = "rgba(237,230,211,0.9)"; g.lineWidth = u(4.6); g.stroke(); g.strokeStyle = CT_ACC; g.lineWidth = u(2); g.stroke();
  g.restore();
  if (cur.r && cur.sel) {
    const d = cur.sel.dest, x = ctX(d.x), y = ctX(d.z), f = cur.done ? 1 : clamp((e - 0.8) / 0.2, 0, 1);
    if (f > 0 && !cur.r.short) { g.globalAlpha = f; ctRing(g, x, y, u(7.4), u(1.9), u); g.globalAlpha = 1; }
    if (cur.done) for (let k = 0; k < 2; k++) {
      const ph = (((now - cur.doneT) / 2100) + k * 0.5) % 1;
      g.globalAlpha = 0.6 * Math.pow(1 - ph, 1.4); g.beginPath(); g.arc(x, y, u(cur.r.short ? 6 : 7.5) + u(15) * ph, 0, 6.2832);
      g.strokeStyle = CT_ACC; g.lineWidth = u(1.5); g.stroke(); g.globalAlpha = 1;
    }
    if (!cur.r.short) { const s1 = cur.r.L - u(9), pos = ctAt(cur.r, Math.min(u(9.5) + (s1 - u(9.5)) * e, s1 - u(8))); ctSled(g, pos[0], pos[1], pos[2], clamp(e * 6, 0, 1), u); }
  }
  // numbered tags last, on top of everything
  BD.rows.forEach((r, i) => {
    if (!r.tag) return;
    const on = i === BD.sel, [x, y] = r.tag;
    g.beginPath(); g.arc(x, y, u(7), 0, 6.2832); g.fillStyle = on ? CT_ACC : "#f4efe3"; g.fill();
    g.lineWidth = u(1.1); g.strokeStyle = on ? "#f4efe3" : CT_INK; g.stroke();
    ctText(g, String(r.key), x, y + u(3.4), `700 ${u(9.5)}px ${CT_SANS}`, on ? "#fff" : CT_INK, null, 0, "center");
  });
  g.restore();
}
// a job's number tag sits on the far side of the place from its name
function ctTagAt(d, n, u) {
  const L = CT_LBL[d.id] || {}, x = ctX(d.x), y = ctX(d.z), k = n - 1;
  if (L.al === "center") return [x + (k - 0.5) * u(15) + u(7.5), y + u(12)];
  if (L.al === "right") return [x + u(11) + k * u(15), y - u(3)];
  return [x - u(11) - k * u(15), y - u(3)];
}
// the paper tag by the destination: how far it is by trail, and what the climb is
function ctCallout(cur) {
  const el = $("bCall"), r = cur.sel; if (!r || !r.dest) return;
  const d = r.dest, g = groom[d.id] || 0;
  let t, sub;
  if (r.kind === "garage") { t = "0 km · garage"; sub = "across the road"; }
  else if (r.obj && r.obj.groom) { t = `${(Math.hypot(d.x - depot.x, d.z - depot.z) / 1000).toFixed(1)} km of line`; sub = `${Math.round((cur.r.pts || []).length)} stretches to groom`; }
  else { t = `≈ ${routeKm(d).toFixed(1)} km by trail`; sub = `climb ${climbOf(d)} m · ${groomLabel(g)}`; }
  el.innerHTML = `<b>${t}</b><i>${sub}</i>`;
  const k = BD.css / CT_REF, x = ctX(d.x) * k, y = ctX(d.z) * k, right = x > BD.css * 0.62, below = y < BD.css * 0.3;
  el.style.left = (x + (right ? -16 : 16)) + "px"; el.style.top = (y + (below ? 16 : -16)) + "px";
  el.style.transform = `translate(${right ? "-100%" : "0"}, ${below ? "0" : "-100%"})`;
  el.classList.add("on");
}

function gameKey(e) {
  if (GS.dead) return;
  if (e.code === "KeyQ") { if (FOOT.on) mount(); else dismount(); return; }
  if (e.code === "KeyX") { footAssess(); return; }
  if (e.code === "KeyE" && FOOT.on && !GS.boardOpen && !GS.garageOpen) { footAction(); return; }
  if (e.code === "KeyE") { if (GS.garageOpen) closeGarage(); else if (GS.boardOpen) closeBoard(); else if (GS.near === garageSite) openGarage(); else if (GS.near === depot) openBoard(); else toast("The job board is at the quay, the garage is across the road.", "warn"); }
  if (e.code === "Escape") { if (godOpen) toggleGod(false); else if (!$("bigmap").hidden) toggleBigMap(false); else if (GS.garageOpen) closeGarage(); else if (GS.boardOpen) closeBoard(); else toggleSettings(); }
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
  const L = sd.livery, o = SET.paint[sd.id] || {};
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
    styleParts.stripe.visible = st === "racer";
    styleParts.back.visible = st === "twotone" || st === "hivis";
    styleParts.chestPanel.visible = st === "twotone" || st === "hivis";
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
  $("closeBoard").addEventListener("click", closeBoard);
  $("closeMap").addEventListener("click", () => toggleBigMap(false));
  setTouchUI();
  applySettings();
}
function toggleSettings(force) {
  const open = force !== undefined ? force : $("settings").hidden;
  $("settings").hidden = !open;
  if (open) { $("viewBtn").textContent = "View: " + VIEWS[camMode].n; applySettings(); }
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
  hitch: {
    label: "Hitch — tow-behind", options: [
      { id: "none", name: "Empty hitch", cost: 0, tier: 0, stats: {}, note: "Nothing dragging behind you." },
      { id: "groomer", name: "Tow-behind groomer drag", cost: 700, tier: 1, stats: { burn: 0.1, groom: 1 }, note: "Steel pan and a corduroy comb. Leaves a trail two metres wide, flat and set hard, that the snow takes three times as long to bury. Takes grooming contracts." },
      { id: "tiller", name: "Wing tiller groomer", cost: 1850, tier: 2, stats: { burn: 0.16, groom: 1 }, note: "A heavy tractor-style tiller: spinning drum, finisher mat and hydraulic wings. Press G (pad LB) and the wings slide out to lay a trail almost six metres wide. Wide lines pay a bonus on grooming contracts. Heavy to drag, and the wings catch trees." },
      { id: "trailer", name: "Freight sled trailer", cost: 900, tier: 1, stats: { burn: 0.06, bays: 1 }, note: "Poly tub on steel runners with ratchet straps. One big load: stoves, freezers, generators, solar kits. Tips if you corner it hard." },
      { id: "flatbed", name: "Heavy flatbed trailer", cost: 2400, tier: 2, stats: { burn: 0.1, bays: 2 }, note: "Twin-ski steel flatbed with stake sides. Two big loads, or one expedition load for Slettnes. Sits lower, harder to roll." }
    ]
  }
};
const PART_ORDER = ["track", "skis", "clutch", "boost", "can", "cool", "susp", "bars", "grips", "shield", "tank", "tankL", "tankR", "rack", "guard", "lights", "survival", "recovery", "winch", "hitch"];

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
  parts: { track: "stock", skis: "stock", clutch: "stock", boost: "none", can: "stock", susp: "stock", bars: "stock", shield: "low", tank: "stock", tankL: "none", tankR: "none", rack: "stock", lights: "stock", hitch: "none", grips: "stock", guard: "none", survival: "none", recovery: "none", winch: "none", cool: "none" },
  partsOwned: {},
  gear: { head: "beanie", jacket: "shell", pants: "bib", boots: "pac", gloves: "leather" },
  gearOwned: {},
  engines: {},          // sled id -> swapped-in engine (missing = the one it came with)
  shelf: [],            // engines you own that aren't in a sled
  pickups: []           // engines paid for and waiting at the seller's
});
const sledDef = () => SLEDS.find(s => s.id === GS.own.sled) || SLEDS[0];

/* ---------------- engines: what's for sale up and down the coast ---------------- */
// Engines get swapped, not upgraded. Every morning the classifieds turn over: a few used motors
// sitting in sheds and boathouses round the Nordkinn, and only ever ones that beat what's in your
// sled. Have it brought round on the freight sled for a fee, or ride out and strap the crate on
// yourself. `power` is the same scale as a sled's own; used ones lose a little to their hours.
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
  return { inst: null, def: s0, name: s0 ? s0.name : "Battery pack", pwr: sd.power, burn: 1, turbo: !!(s0 && s0.turbo), stock: true, electric: !s0 };
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
const marketDay = () => Math.floor((GS.hour - 6) / 24);           // the listings turn over at 06:00
const freightFee = s => round5(40 + Math.hypot(s.x - garageSite.x, s.z - garageSite.z) * 0.04);
function makeMarket() {
  const sd = sledDef(), cur = engineOf(sd).pwr;
  GS.market = { day: marketDay(), base: cur, list: [] };
  if (isElectric(sd)) return;
  const spots = SITES.filter(s => s.type === "cabin" && s.x !== undefined);
  // mostly the next step or two up, now and then a leap; nothing silly for a first-week courier
  const pool = ENGINES.filter(e => e.power * 0.95 > cur + 0.05 && e.power <= cur + 1.0)
    .map(e => ({ e, k: (e.power - cur) + Math.random() * 0.6 })).sort((a, b) => a.k - b.k).map(x => x.e);
  const n = Math.min(pool.length, 3 + (Math.random() < 0.45 ? 1 : 0));
  for (let k = 0; k < n; k++) {
    const e = pool[k], wear = Math.random(), site = pick(spots);   // wear 0 = barely run, 1 = tired
    GS.market.list.push({
      eid: e.id, site: site.id, seller: pick(SELLERS), why: pick(WHY),
      hrs: Math.round(lerp(30, 950, wear) / 10) * 10,
      pwr: +(e.power * (1 - 0.05 * wear)).toFixed(3),
      price: round5(e.price * lerp(1.05, 0.72, wear) * (0.9 + Math.random() * 0.2))
    });
  }
}
function marketNow() {
  const cur = engineOf(sledDef()).pwr, better = () => GS.market.list.filter(l => l.pwr > cur + 0.02);
  // new day, a better engine than the listings were picked for, or nothing left worth showing: ask around again
  if (!GS.market || GS.market.day !== marketDay() || cur > GS.market.base + 0.01 || !better().length) makeMarket();
  return better();
}
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
function buyEngine(l, collect) {
  const sd = sledDef();
  if (isElectric(sd)) { toast("The Aurora runs on a battery. No engine goes in there.", "warn"); return; }
  const site = SITES.find(s => s.id === l.site), def = engDef(l.eid), fee = collect ? 0 : freightFee(site), cost = l.price + fee;
  if (GS.cash < cost) { toast(`That's $${cost}${fee ? ` with $${fee} freight` : ""}. You have $${GS.cash}.`, "warn"); return; }
  GS.cash -= cost; GS.market.list.splice(GS.market.list.indexOf(l), 1);
  const inst = { eid: l.eid, pwr: l.pwr, hrs: l.hrs, from: site.name, seller: l.seller };
  if (collect) {
    GS.own.pickups.push({ inst, site: site.id, aboard: false });
    toast(`Paid ${l.seller} $${l.price}. The crate's waiting in ${site.name}: stop at the door and it goes on the rack.`, "good");
  } else {
    fitEngine(inst, sd);
    toast(`The ${def.name} came round from ${site.name} on the freight sled. Fitted: ${Math.round(inst.pwr * 100)}% power.`, "good");
  }
  renderGarage(); save();
}
function shelfSwap(i) {
  const sd = sledDef(); if (isElectric(sd)) { toast("No engine goes in a battery sled.", "warn"); return; }
  const inst = GS.own.shelf.splice(i, 1)[0]; if (!inst) return;
  fitEngine(inst, sd); toast(`Swapped the ${engDef(inst.eid).name} into the ${sd.name}.`, "good"); renderGarage(); save();
}
function refitStock() {
  const sd = sledDef(); fitEngine(null, sd);
  toast(`Put the ${sd.name}'s own engine back in.`); renderGarage(); save();
}
const shelfValue = inst => round5(engDef(inst.eid).price * 0.45);
function shelfSell(i) {
  const inst = GS.own.shelf.splice(i, 1)[0]; if (!inst) return;
  const v = shelfValue(inst); GS.cash += v;
  toast(`Sold the ${engDef(inst.eid).name} to the shop for $${v}.`, "good"); renderGarage(); save();
}
// ride up to the seller's door slowly and the crate goes on the rack
function collectEngine(site) {
  const p = GS.own.pickups.find(q => !q.aboard && q.site === site.id); if (!p) return;
  const name = engDef(p.inst.eid).name;
  if (smallLoads().length >= ST.slots) {
    if (gameClock - (p.nagT || -99) > 10) { p.nagT = gameClock; toast(`The ${name} crate needs a spot on the rack. Drop a parcel off first.`, "warn"); }
    return;
  }
  p.aboard = true;
  GS.load.push({ dest: garageSite, cargo: name + " (crate)", crate: p, fragile: false, pay: 0, due: null, hits: 0 });
  toast(`${p.inst.seller} helps you strap the ${name} on the rack. Take it to Nordkinn Skuter & Service.`, "good");
  applyLoadout(); save();
}
function pendingPickup() { return GS.own.pickups.find(q => !q.aboard); }
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
  if (GS.own.partsOwned[ownKey(cat, id)] || o.cost === 0) { GS.own.parts[cat] = id; restat(); renderGarage(); save(); return; }
  if (!tierOK) { toast(`${o.name} doesn't fit this generation yet.`, "warn"); return; }
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
  } else if (garageTab === "parts") {
    PART_ORDER.filter(c => c !== "boost").forEach(cat => {
      const h = document.createElement("div"); h.className = "bsec"; h.textContent = PARTS[cat].label; body.appendChild(h);
      PARTS[cat].options.forEach(o => {
        const owned = GS.own.partsOwned[ownKey(cat, o.id)] || o.cost === 0, on = GS.own.parts[cat] === o.id, locked = !owned && sledTier() < o.tier;
        tryOn(row(o.name, [statLine(o), o.note].filter(Boolean).join(" · "),
          on ? "Fitted" : owned ? "Owned" : locked ? `Gen ${o.tier + 1}+` : o.needRescues && (GS.rescues || 0) < o.needRescues ? `${o.needRescues} recoveries` : "$" + o.cost,
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
  const pct = v => Math.round(v * 100) + "%";
  sec(`In the ${sd.name}`);
  if (eng.electric) {
    row(eng.name, "Electric drive. No engine swaps and nothing to boost.", "Fitted", "on", () => { });
  } else {
    row(eng.name, `${pct(eng.pwr)} power · ${burnTxt(eng.burn)}${eng.turbo ? " · factory turbo" : ""}${ST.boost ? ` · ${pct(ST.power)} with everything bolted on` : ""}\n${eng.inst ? `${eng.inst.hrs} h on it · bought off ${eng.inst.seller} in ${eng.inst.from}` : "The motor it left the factory with."}`, "Fitted", "on", () => { });
    if (!eng.stock) row(`Stock ${engDef(STOCK_ENGINE[sd.id]).name}`, `${pct(sd.power)} power · the ${sd.name}'s own motor, crated in the shop`, "Refit", "", refitStock);
  }
  // paid for and still out there
  for (const p of GS.own.pickups) {
    const site = SITES.find(s => s.id === p.site), d = engDef(p.inst.eid);
    row(d.name, `${pct(p.inst.pwr)} power · paid for · ${p.aboard ? "on your rack, bring it here" : `waiting at ${p.inst.seller}'s in ${site.name}, ${fmtMi(Math.hypot(site.x - garageSite.x, site.z - garageSite.z))} out`}`, p.aboard ? "Aboard" : "Collect", "locked", null, "PAID");
  }
  if (GS.own.shelf.length) {
    sec("On the shelf");
    GS.own.shelf.forEach((inst, i) => {
      const d = engDef(inst.eid);
      actRow(body, d.name, `${pct(inst.pwr)} power · ${burnTxt(d.burn)}${d.turbo ? " · factory turbo" : ""} · ${inst.hrs} h`,
        [{ label: "Swap in", fn: () => shelfSwap(i), dis: eng.electric }, { label: `Sell $${shelfValue(inst)}`, fn: () => shelfSell(i) }]);
    });
  }
  sec("For sale round the Nordkinn");
  const list = eng.electric ? [] : marketNow();
  if (eng.electric) foot("Nobody up here sells battery packs. The shop sends to Tromsø for those.");
  else if (!list.length) foot(`Nothing for sale on the peninsula today that beats the ${eng.name}. New listings every morning at 06:00.`);
  else {
    list.forEach(l => {
      const d = engDef(l.eid), site = SITES.find(s => s.id === l.site), fee = freightFee(site);
      const dist = fmtMi(Math.hypot(site.x - garageSite.x, site.z - garageSite.z));
      actRow(body, d.name, `${pct(l.pwr)} power (+${Math.round((l.pwr / eng.pwr - 1) * 100)}%) · ${burnTxt(d.burn)}${d.turbo ? " · factory turbo" : ""} · ${l.hrs} h\n${l.seller}, ${site.name} · ${dist} out\n“${l.why}”`,
        [{ label: `Ship $${l.price + fee}`, title: `$${l.price} + $${fee} on the freight sled, fitted today`, fn: () => buyEngine(l, false) },
         { label: `Collect $${l.price}`, title: `Ride to ${site.name} and bring the crate back yourself`, fn: () => buyEngine(l, true) }],
        d.turbo ? "TURBO" : "");
    });
    foot(`Ship it and the freight sled brings it round today, or pay the seller and collect the crate yourself (it takes a spot on the rack). Listings turn over at 06:00.`);
  }
  sec(PARTS.boost.label);
  PARTS.boost.options.forEach(o => {
    const owned = GS.own.partsOwned[ownKey("boost", o.id)] || o.cost === 0, on = (GS.own.parts.boost || "none") === o.id;
    const why = boostWhy(sd, o.id), locked = (!owned && sledTier() < o.tier) || !!why;
    tryOn(row(o.name, [statLine(o), why || o.note].filter(Boolean).join(" · "),
      on ? "Fitted" : why ? "Won't fit" : owned ? "Owned" : sledTier() < o.tier ? `Gen ${o.tier + 1}+` : "$" + o.cost,
      on ? "on" : locked ? "locked" : "", () => fitPart("boost", o.id)), { cat: "boost", id: o.id });
  });
}
function openGarage() { GS.garageOpen = true; $("garage").hidden = false; renderGarage(); }
function closeGarage() { GS.garageOpen = false; $("garage").hidden = true; PV.sled = PV.cat = PV.slot = null; applyLoadout(); }
function buildGarageTabs() {
  [["sleds", "Sleds"], ["engines", "Engines"], ["parts", "Parts"], ["gear", "Rider kit"]].forEach(([t, n]) => {
    const b = document.createElement("button"); b.className = "sbtn st"; b.dataset.t = t; b.textContent = n;
    b.addEventListener("click", () => { garageTab = t; renderGarage(); });
    $("garageTabs").appendChild(b);
  });
  $("closeGarage").addEventListener("click", closeGarage);
}

/* ---------------- Kjøllefjord ---------------- */
let steamer = null, QUAY = null;
/* ---- the coastal steamer's timetable ----
   She calls twice a day: northbound in the morning, southbound in the evening, three hours alongside each
   time, with an hour coming up the fjord and an hour going back out. Freight that comes off her goes on the
   board while she's in (and comes off the board when she sails), and anything handed to you "for the boat"
   has to be on the quay before she casts off. */
const STEAMER = { calls: [{ arr: 8, dep: 11, dir: "northbound" }, { arr: 17, dep: 20, dir: "southbound" }], sail: 1, state: null, call: null };
function steamerAt(H) {
  const h = ((H % 24) + 24) % 24;
  for (const c of STEAMER.calls) {
    if (h >= c.arr && h < c.dep) return { s: "in", c, p: (h - c.arr) / (c.dep - c.arr) };
    if (h >= c.arr - STEAMER.sail && h < c.arr) return { s: "arriving", c, p: (h - c.arr + STEAMER.sail) / STEAMER.sail };
    if (h >= c.dep && h < c.dep + STEAMER.sail) return { s: "leaving", c, p: (h - c.dep) / STEAMER.sail };
  }
  return { s: "away", c: null, p: 0 };
}
// absolute game hour of the next sailing (or arrival) at or after H
function steamerNext(H, key) {
  let best = Infinity;
  for (let d = Math.floor(H / 24) - 1; d <= Math.floor(H / 24) + 2; d++) for (const c of STEAMER.calls) { const t = d * 24 + c[key]; if (t >= H && t < best) best = t; }
  return best;
}
const steamerIn = () => steamerAt(GS.hour).s === "in";
// a boat backhaul from `site` makes the first sailing it reasonably can
function boatDue(site) { const est = jobGeom(depot, site).est * 1.25 / GAMEHOUR; return steamerNext(GS.hour + est, "dep"); }
const STEAMER_CARGO = [
  ["Post sacks off the steamer", 0.9, false], ["Crate of oranges from Tromsø", 1.0, true], ["Pharmacy crate off the boat", 1.3, true],
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
  if (GS.jobs.length >= 3) GS.jobs.splice(GS.jobs.length - 1, 1, j); else GS.jobs.push(j);
  return true;
}
function steamerHorn() {
  if (!audio) return;
  const { AC, master } = audio, t = AC.currentTime, d = Math.hypot(P.x - (steamer ? steamer.position.x : depot.x), P.z - (steamer ? steamer.position.z : depot.z));
  const v = 0.35 * clamp(1 - d / 2600, 0.08, 1);
  for (const [f, w] of [[98, 1], [147, 0.6], [196, 0.3]]) {
    const o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter();
    o.type = "sawtooth"; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = 520;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * w, t + 0.25); g.gain.setValueAtTime(v * w, t + 2.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t + 2.9);
  }
}
function updSteamer() {
  const st = steamerAt(GS.hour);
  if (steamer && steamer.userData.head) {
    const u = steamer.userData, ease = x => x * x * (3 - 2 * x), turn = (a, b, k) => a + (((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k;
    let off = 0, a = u.a;
    if (st.s === "leaving") { off = st.p * st.p; a = turn(u.a, u.headA, ease(clamp(st.p / 0.35, 0, 1))); }
    else if (st.s === "arriving") { const q = 1 - st.p; off = q * q; a = turn(u.headA + Math.PI, u.a, ease(clamp((st.p - 0.65) / 0.35, 0, 1))); }
    steamer.visible = st.s !== "away";
    steamer.position.set(u.x + u.hx * u.L * off, SEA, u.z + u.hz * u.L * off); steamer.rotation.y = a;
    const solid = st.s === "in";
    if (u.solid !== solid) { u.solid = solid; for (const o of u.obs) o.top = solid ? 1e9 : -Infinity; }
  }
  const prev = STEAMER.state; STEAMER.state = st.s;
  if (prev === null || !started) return;
  if (prev !== "in" && st.s === "in") {
    steamerHorn();
    const posted = postSteamerFreight(); if (posted && GS.boardOpen) renderBoard();
    toast(`The ${st.c.dir} steamer is alongside at Kjøllefjord until ${fmtTime(st.c.dep)}.${posted ? " Fresh freight on the board." : ""}`);
  }
  if (prev === "in" && st.s !== "in") {
    steamerHorn();
    const n = GS.jobs ? GS.jobs.filter(j => j.steamer).length : 0;
    if (n) { GS.jobs = GS.jobs.filter(j => !j.steamer); if (GS.boardOpen) renderBoard(); }
    const missed = GS.load.filter(j => j.boat && GS.hour > j.due).length;
    toast(`The steamer's cast off.${missed ? " Your load for the boat missed her: it goes on the next one, at half pay." : n ? " Her freight went into the shed." : ""}`, missed ? "warn" : undefined);
  }
  if (prev === "away" && st.s === "arriving" && GS.load.some(j => j.boat)) toast(`Steamer's coming up the fjord. She sails at ${fmtTime(st.c.dep)}.`);
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
    // the coastal steamer, alongside: black hull, white decks, the funnel
    const S = new THREE.Group(); S.position.set(qx + dirx * 30, SEA, qz + dirz * 30); S.rotation.y = -qa; scene.add(S); steamer = S;
    bx(S, 14, 6, 88, hull, 0, 1.5, 0);
    put(S, new THREE.CylinderGeometry(7, 7, 6, 3, 1, false, 0, Math.PI), hull, 0, 1.5, 44).rotation.set(Math.PI / 2, 0, 0);
    bx(S, 13.4, 0.5, 86, L(0xd9d5cc), 0, 4.7, 0);
    bx(S, 12.4, 3.2, 52, white, 0, 6.5, -4);
    bx(S, 10.8, 3.0, 36, white, 0, 9.6, -2);
    bx(S, 8.6, 2.8, 14, white, 0, 12.5, 8);
    put(S, new THREE.CylinderGeometry(1.6, 1.9, 5, 12), red, 0, 14.5, -8);
    put(S, new THREE.CylinderGeometry(1.7, 1.7, 1.2, 12), hull, 0, 17.0, -8);
    for (let v = -26; v <= 20; v += 3.2) for (const sd of [-1, 1]) bx(S, 0.1, 0.9, 1.6, glowM, sd * 6.25, 6.6, v);
    for (let v = -18; v <= 14; v += 3.2) for (const sd of [-1, 1]) bx(S, 0.1, 0.9, 1.6, glowM, sd * 5.45, 9.7, v);
    bx(S, 0.14, 8, 0.14, metal, 0, 18, 14); bx(S, 3, 0.1, 0.1, metal, 0, 21, 14);
    S.userData = { x: qx + dirx * 30, z: qz + dirz * 30, a: -qa, obs: [], solid: true };
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
      if (best > 300) { U.headA = bh; U.hx = Math.sin(bh); U.hz = Math.cos(bh); U.L = Math.min(best - 120, 1500); U.head = true; } }
    // fish racks along the shore either side of the pier
    for (const sd of [-1, 1]) { const rx = qx - dirx * 18 + ax * sd * 48, rz = qz - dirz * 18 + az * sd * 48; if (!isSea(rx, rz) && !isSea(rx + dirx * 6, rz + dirz * 6)) hjell(rx, rz, 14, -qa + Math.PI / 2); }
    lamp(qx - dirx * 4 + ax * 12, qz - dirz * 4 + az * 12); lamp(qx - dirx * 4 - ax * 12, qz - dirz * 4 - az * 12);
  }
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
  act: "stand", actT: 2, tgt: null, faceY: 0, stop: null, side: 1, keepSide: 1, armed: true, watchT: 0, sit: 0, sniff: 0, phase: 0,
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
  D.sit = 0; D.burst = 0; D.bark = 0; D.armed = true; D.placed = false; D.stuck = 0; D.jit = 0;
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
  if (sp > 0.12) D.phase += dt * Math.PI * 2 * (0.7 + sp * 0.46);
  const gal = sstep(5.5, 8, sp), amp = lerp(0.32, 0.85, clamp(sp / 9, 0, 1)) * clamp(sp / 0.8, 0, 1), ph = D.phase, L = D.legs;
  const sw = [Math.sin(ph), Math.sin(ph + Math.PI * (1 - gal)), Math.sin(ph + Math.PI * (1 - gal) - 0.9 * gal), Math.sin(ph - 0.9 * gal)];   // trot -> bound as it speeds up
  L[0].rotation.x = sw[0] * amp * (1 - D.sit); L[1].rotation.x = sw[1] * amp * (1 - D.sit);
  L[2].rotation.x = lerp(sw[2] * amp, -1.35, D.sit); L[3].rotation.x = lerp(sw[3] * amp, -1.35, D.sit);
  L[2].position.y = L[3].position.y = lerp(0.30, 0.13, D.sit);
  D.rig.position.y = 0.30 + (sp > 0.3 ? Math.abs(Math.sin(ph)) * 0.018 * clamp(sp / 4, 0, 1.5) : Math.sin(D.t * 2.2) * 0.003);
  D.rig.rotation.x = -0.62 * D.sit + Math.sin(ph) * 0.07 * gal;
  D.head.rotation.x = 0.42 * D.sit + 0.55 * D.sniff - 0.3 * D.bark - 0.08 + Math.sin(ph) * 0.05 * clamp(sp / 4, 0, 1);
  D.jaw.rotation.x = 0.55 * D.bark + (sp > 6 ? 0.14 : 0);
  D.tail.rotation.z = Math.sin(D.t * (9 + sp)) * 0.3 * wag;
  const gy = surf(D.x, D.z) - 0.015; D.y = D.placed && Math.abs(gy - D.y) < 2 ? D.y + (gy - D.y) * Math.min(1, dt * 14) : gy;
  const sy = Math.sin(D.yaw), cy = Math.cos(D.yaw), hF = surf(D.x + sy * 0.4, D.z + cy * 0.4), hR = surf(D.x - sy * 0.4, D.z - cy * 0.4);
  D.pitch += (-Math.atan2(hF - hR, 0.8) - D.pitch) * Math.min(1, dt * 10);
  D.g.position.set(D.x, D.y, D.z); D.g.rotation.set(D.pitch, D.yaw, 0, "YXZ");
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
  poseRider();
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
      else if (blocked || slope > 0.55 || sampleG(freshG, ax, az) < 0.1) { n.avoid = (Math.random() < 0.5 ? -1 : 1) * 0.9; n.avoidT = 0.9 + Math.random() * 0.8; }
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
  GS.stormT -= dt;
  if (GS.stormPhase === "calm" && GS.stormT < 45 && !GS.warned) { GS.warned = true; toast("Storm moving in. It'll get cold and hard to see.", "warn"); }
  if (GS.stormT <= 0) {
    if (GS.stormPhase === "calm") { GS.stormPhase = "storm"; GS.stormT = 90 + Math.random() * 90; }
    else { GS.stormPhase = "calm"; GS.stormT = 200 + Math.random() * 200; GS.warned = false; toast("The storm is breaking up."); }
  }
  GS.storm += ((GS.stormPhase === "storm" ? 1 : 0) - GS.storm) * (1 - Math.exp(-dt / 20));
  let near = null; for (const s of SITES) if (Math.hypot(P.x - s.x, P.z - s.z) < 22) near = s;
  if (near !== GS.near && near) toast(near === garageSite ? `Nordkinn Skuter & Service. ${TC.on ? "Tap GARAGE" : "Press E"} for sleds, parts and kit.` : near === depot ? `Kjøllefjord quay. Warm up, refuel, ${TC.on ? "tap JOB BOARD" : "press E"} for work.` : near.kind === "village" ? `${near.name}. The shop has coffee on.` : near.type === "relay" ? `${near.name}. The keeper waves you in.` : near.type === "home" ? `${near.name}. Someone's already at the window.` : `${near.name}. Warm stove inside.`);
  GS.near = near;
  const night = 1 - dayFactor(), elev = clamp((groundAt(P.x, P.z) - 110) / 220, 0, 1);
  const cold = (0.3 + 0.35 * night + 0.9 * GS.storm + 0.35 * elev) * ST.coldMul;
  if (elev > 0.5 && ST.warm < 7 && !GS.kitWarned) { GS.kitWarned = true; toast("You're under-dressed for the open fell. The garage sells warmer kit.", "warn"); }
  // a thermos or a stove: stop anywhere and you thaw out slowly, up to what the kit can manage
  const camping = !near && ST.camp > 0 && Math.hypot(P.vx, P.vz) < 0.8 && GS.warmth < ST.campCap;
  if (camping && !GS.camping && GS.warmth < ST.campCap - 8) toast(GS.own.parts.survival === "stove" ? "Stove's lit. Stay put and thaw out." : "Pouring a cup from the thermos. Stay put a minute.");
  GS.camping = camping;
  if (near && !HELP.on) { GS.warmth = Math.min(100, GS.warmth + 12 * dt); GS.coldWarned = false; }
  else if (camping) { GS.warmth = Math.min(ST.campCap, GS.warmth + ST.camp * (1 - 0.5 * GS.storm) * dt); if (GS.warmth > 40) GS.coldWarned = false; }
  else if (!near) GS.warmth -= cold * dt;
  if (GS.warmth < 30 && !GS.coldWarned) { GS.coldWarned = true; toast("You're freezing. Get indoors: a village, a cabin, the quay.", "bad"); }
  if (GS.warmth <= 0) { blackout(HELP.on && HELP.kind === "sea" ? "sea" : "cold"); return; }
  if (isSea(P.x, P.z) && P.y < SEA - 0.4 && !HELP.on) startDrown();
  if (near === depot || near === garageSite) { GS.fuel = Math.min(GS.cap, GS.fuel + 6 * dt); GS.outWarned = GS.lowWarned = false; }
  if (GS.fuel < GS.cap * 0.2 && !GS.lowWarned && GS.fuel > 0) { GS.lowWarned = true; toast("Fuel low. Stick to packed trail, it burns less.", "warn"); }
  if (GS.fuel <= 0 && !GS.outWarned) { GS.outWarned = true; toast(`Out of fuel. Press F for a fuel delivery ($${helpCost("fuel")}), or walk it off.`, "bad"); }
  if (near && spd < 4 && GS.load.some(j => j.dest === near)) deliver(near);
  if (near && spd < 4 && GS.own.pickups.length) collectEngine(near);
  if (GS.market && GS.market.day !== marketDay() && !isElectric(sledDef())) { makeMarket(); if (marketNow().length) toast("New engines in the classifieds. The garage has the list.", undefined); }
  if (near && spd < 4 && GS.groomJob && GS.groomJob.dest === near) finishGroom(near);
  // beacons stand over places you're carrying a package for; empty-handed, one beacon points you home to the quay
  const pend = !GS.load.length && !GS.groomJob && pendingPickup(), pendSite = pend && SITES.find(s => s.id === pend.site);
  for (const s of SITES) if (s.beacon) s.beacon.visible = GS.load.length ? GS.load.some(j => j.dest === s) : pendSite ? s === pendSite : (s === depot && near !== depot);
  const relay = SITES.find(s => s.type === "relay"); if (relay && relay.blink) { relay.blink.visible = (gameClock % 3.2) < 0.6; if (relay.beam) relay.beam.intensity = relay.blink.visible ? 2.4 * (1 - dayFactor()) : 0; }
  updTurbines(dt); updSteamer();

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
  const rjv = GS.rescueJob ? rjNearest(P.x, P.z) : null;
  if (rjv) tgt = rjv.v;
  else if (GS.load.length) {
    let best = 1e9;
    for (const j of GS.load) { const d = Math.hypot(j.dest.x - P.x, j.dest.z - P.z); if (d < best) { best = d; tgt = j.dest; } }
  } else if (GS.groomJob) tgt = groomTarget();
  const pend = !rjv && !GS.load.length && !GS.groomJob && pendingPickup();
  if (pend) tgt = SITES.find(s => s.id === pend.site) || tgt;
  const dx = tgt.x - P.x, dz = tgt.z - P.z, dist = Math.hypot(dx, dz);
  const rel = Math.atan2(dx, dz) - camState.yaw;
  $("arrow").style.transform = `rotate(${(-rel * 180 / Math.PI).toFixed(1)}deg)`;
  $("arrow").style.color = !SITES.includes(tgt) ? "#ff8a3a" : tgt !== depot ? "var(--signal)" : "var(--ice)";
  if (rjv) {
    const c = GS.rescueJob, left = c.due - GS.hour, n = RJ.vs.filter(v => !v.freed).length;
    $("jobTitle").textContent = `Recovery → ${rjv.v.name} (${rjv.v.vk.who})${n > 1 ? ` + ${n - 1} more` : ""}`;
    $("jobSub").textContent = `${fmtMi(rjv.d)} · $${c.pay} · ${left > 0 ? `clock runs out ${fmtTime(c.due)}` : "out of time"}${rjv.v.gentle ? " · go gently" : ""}${winchDef() ? "" : " · NO WINCH FITTED"}`;
  } else if (GS.load.length) {
    const j = GS.load.find(x => x.dest === tgt);
    $("jobTitle").textContent = `${j.cargo} → ${tgt.name}${GS.load.length > 1 ? "  (" + GS.load.length + " aboard)" : ""}`;
    const g = groom[tgt.id];
    $("jobSub").textContent = `${fmtMi(dist)} · $${j.pay}${j.big ? " · " + Math.round(j.cond) + "% condition" : ""}${g !== undefined ? " · " + groomLabel(g) : ""}${j.fragile ? " · fragile" : ""}${j.due ? (j.boat ? " · steamer sails " : " · due ") + fmtTime(j.due) + (GS.hour > j.due ? (j.priority ? " (late — bond lost)" : j.boat ? " (missed her)" : " (late)") : "") : ""}${GS.groomJob ? " · grooming " + Math.round(groomFrac(GS.groomJob) * 100) + "%" : ""}`;
  } else if (GS.groomJob) {
    const g = GS.groomJob, fr = groomFrac(g);
    $("jobTitle").textContent = `Grooming → ${g.dest.name}`;
    $("jobSub").textContent = `${Math.round(fr * 100)}% of the line · ${fr >= 0.9 ? "finish at the cabin" : fr >= 0.7 ? "enough to sign off, more pays more" : "arrow points at the next gap"} · $${g.pay} · due ${fmtTime(g.due)}${GS.hour > g.due ? " (late)" : ""}${!isGroomer(GS.own.parts.hitch) ? " · no groomer hitched!" : GS.own.parts.hitch === "tiller" && !TOW.wingOn ? " · G: wings out, wide pays more" : ""}`;
  } else if (pend) {
    $("jobTitle").textContent = `Collect: ${engDef(pend.inst.eid).name}`;
    $("jobSub").textContent = `Paid for · ${pend.inst.seller} in ${tgt.name} · ${fmtMi(dist)}`;
  } else if (GS.near === depot) { $("jobTitle").textContent = "Kjøllefjord quay"; $("jobSub").textContent = TC.on ? "Tap JOB BOARD for work" : "Press E for the job board"; }
  else { $("jobTitle").textContent = "No cargo"; $("jobSub").textContent = `Head back to the quay · ${fmtMi(dist)}`; }
  const wx = GS.stormPhase === "storm" ? "Storm" : GS.warned ? "Storm coming" : "Clear";
  const sh = steamerAt(GS.hour), shTxt = sh.s === "in" ? `Steamer in till ${fmtTime(sh.c.dep)}` : sh.s === "leaving" ? "Steamer sailing" : sh.s === "arriving" ? "Steamer arriving" : `Steamer ${fmtTime(steamerNext(GS.hour, "arr"))}`;
  $("clock").textContent = `${fmtTime(GS.hour)} · ${wx} · ${shTxt} · $${GS.cash}${godAny() ? " · GOD" : ""}`;
  $("rig").textContent = `${sledDef().name}${TOW.kind ? " + " + (TOW.kind === "groomer" ? "groomer" : TOW.kind === "tiller" ? (TOW.wing > 0.5 ? "wing tiller (wide)" : "wing tiller") : TOW.kind) : ""} · kit ${ST.warm.toFixed(1)}`;
  $("fuelFill").style.width = (GS.fuel / GS.cap * 100).toFixed(1) + "%"; $("fuelV").textContent = GS.fuel.toFixed(1) + " L";
  $("fuelFill").classList.toggle("low", GS.fuel < GS.cap * 0.2);
  $("warmFill").style.width = clamp(GS.warmth, 0, 100).toFixed(1) + "%"; $("warmV").textContent = Math.round(Math.max(0, GS.warmth)) + "%";
  $("warmFill").classList.toggle("low", GS.warmth < 30);
  $("heatFill").style.width = clamp((HEAT.t - 30) / (HEAT_LIMP + 3 - 30) * 100, 2, 100).toFixed(1) + "%"; $("heatV").textContent = HEAT.limp ? "LIMP" : Math.round(HEAT.t) + "°C";
  $("heatFill").classList.toggle("hot", HEAT.t >= HEAT_WARN && !HEAT.limp); $("heatFill").classList.toggle("low", HEAT.limp);
}

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
const TT_KB = [["W / S", "Throttle, brake"], ["A / D", "Steer"], ["Shift", "Lean"], ["Space", "Hop"], ["Ctrl", "Wheelie"], ["E", "Job board, garage"], ["F", "Call a rescue sled (fjord or empty tank)"], ["Q", "Get off / on the sled"], ["R", "Reset the sled"], ["Z", "Wipe frost off your visor"], ["V", "Camera"], ["M", "Map"], ["Esc", "Settings"], ["Y", "God menu"]];
const TT_PAD = [["RT / LT", "Throttle, brake"], ["Left stick", "Steer"], ["RB", "Lean"], ["A", "Hop"], ["X", "Wheelie"], ["B", "Job board, garage"], ["Menu", "Settings"], ["View", "Reset the sled"], ["D-pad left", "Wipe visor frost"], ["R3", "Camera"], ["Y", "God menu"]];
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
    const touchNote = `<p class="pnote">On a phone or tablet: the steer pad sits under your left thumb, gas, brake, hop, lean and wheelie under your right. JOB BOARD and GARAGE come up at the top when you're at the quay. When your visor ices over, a WIPE button shows up above HOP.</p>`;
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
  GS.cash = 0; GS.delivered = 0; GS.rescues = 0; GS.own = OWN0(); GS.load = []; GS.jobs = []; GS.contracts = null; GS.groomJob = null; rescueAbort();
  try { localStorage.removeItem("tracklayer.save.v1"); } catch (e) { }
  restat(); GS.fuel = GS.cap; applySettings(); save();
}
function titleWipe() {
  newGame();
  const p = $("tPanel"); p.className = "tpanel fresh"; p.innerHTML = `<p>New game. The boat's in at Kjøllefjord.</p>`;
  TT.mode = "fresh"; TT.sel = 0;
  setTimeout(() => { titleRender(); titleBack(); }, 1700);
}
function titleReady() {
  const h = GS.hour % 24, ph = clamp((h - 8.6) / 7.2, 0, 1);
  $("tClock").textContent = `${fmtTime(h)} · ${GS.stormPhase === "storm" ? "STORM" : "CLEAR"}`;
  const bx = (1 - ph) * (1 - ph) * 10 + 2 * (1 - ph) * ph * 59 + ph * ph * 108, by = (1 - ph) * (1 - ph) * 34 + 2 * (1 - ph) * ph * 12 + ph * ph * 34;
  for (const id of ["tSunG", "tSunD"]) { $(id).setAttribute("cx", bx.toFixed(1)); $(id).setAttribute("cy", by.toFixed(1)); }
  $("title").classList.remove("boot"); TT.mode = "menu";
  titleRender(); titleLayout(); titleSelect(TT.sel, !TC.on);
}
function startRide() {
  started = true;
  for (const id of ["zone", "speedo", "mapWrap", "help", "job"]) $(id).hidden = false;
  setTouchUI();
  makeJobs(depot);
  setTimeout(() => toast(TC.on ? "Welcome to Kjøllefjord. The boat's in. Tap JOB BOARD for work." : "Welcome to Kjøllefjord. The boat's in. Press E for the job board."), 1300);
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
  const g = new THREE.Group(), U = g.userData; U.arms = []; U.legs = [];
  const torso = new THREE.Group(); torso.position.y = 0.93; g.add(torso); U.torso = torso;
  box(0.44, 0.58, 0.27, m.jacket, 0, 0.3, 0, 0, 0, 0, torso);
  box(0.46, 0.09, 0.285, m.trim, 0, 0.12, 0, 0, 0, 0, torso);
  ball(0.12, m.skin, 0, 0.72, 0.01, torso);
  ball(0.165, m.helmet, 0, 0.75, 0, torso, 1, 1, 1.08);
  box(0.2, 0.07, 0.06, m.visor, 0, 0.74, 0.14, 0, 0, 0, torso);
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.29, 0.52, 0); torso.add(a);
    box(0.11, 0.5, 0.13, m.jacket, 0, -0.24, 0, 0, 0, 0, a); box(0.12, 0.12, 0.14, m.glove, 0, -0.54, 0, 0, 0, 0, a);
    U.arms.push(a);
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
}
function sledSide() { return [Math.cos(P.yaw), -Math.sin(P.yaw)]; }   // the sled's left
function dismount() {
  if (!started || GS.dead || FOOT.on || HELP.on) return;
  if (GS.boardOpen || GS.garageOpen || godOpen) return;
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
  // recovery calls take the line first
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
    for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12, px = x + Math.cos(a) * R, pz = z + Math.sin(a) * R; if (!isSea(px, pz) && Math.abs(px) < HALF - 60 && Math.abs(pz) < HALF - 60) { best = [px, pz, a]; break; } }
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
  if (FOOT.on) { FOOT.on = false; FOOT.dig = false; wnStow(false); }
  P.vx = P.vz = P.vy = 0; closeBoard(); toast("Through the ice and into the fjord! Press F to call for help: every second in that water costs you warmth.", "bad");
  whump(1);
  for (let k = 0; k < 60; k++) emit(P.x + (Math.random() - 0.5) * 3, SEA + 0.1, P.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 8, 3 + Math.random() * 5, (Math.random() - 0.5) * 8, 1.6, 1.4);
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
    const a = [rs.position.x + sx * 1.8, rs.position.y + 0.6, rs.position.z + sz * 1.8], tgt = sea ? [P.x, SEA + 0.3, P.z] : [P.x, P.y + 0.8, P.z], k = clamp(HELP.t / 2.2, 0, 1);
    HELP.cab.set(a, [lerp(a[0], tgt[0], k), lerp(a[1], tgt[1], k), lerp(a[2], tgt[2], k)], (1 - k) * 0.8);
    if (!sea) { rs.rotation.y = angLerp(rs.rotation.y, rs.userData.yaw, 0.1); }
    if (k >= 1) { HELP.phase = sea ? "pull" : "hand"; HELP.t = 0; HELP.pull = [P.x, P.z]; if (!sea) toast("Two jerry cans coming your way..."); }
  } else if (HELP.phase === "pull") {
    const to = [rs.position.x, rs.position.z], d = Math.hypot(P.x - to[0], P.z - to[1]) || 1, stepL = clamp(d / 13, 3.6, 9) * dt;
    if (d > 4.4) { P.x -= (P.x - to[0]) / d * stepL; P.z -= (P.z - to[1]) / d * stepL; P.yaw = angLerp(P.yaw, Math.atan2(to[0] - P.x, to[1] - P.z) + Math.PI, 0.02); }
    P.y = Math.max(rideSurf(P.x, P.z), SEA - 0.45) ; P.vx = P.vz = 0;
    const sx = Math.sin(rs.userData.yaw), sz = Math.cos(rs.userData.yaw);
    HELP.cab.set([rs.position.x + sx * 1.8, rs.position.y + 0.6, rs.position.z + sz * 1.8], [P.x, Math.max(P.y + 0.4, SEA + 0.3), P.z], 0.1);
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
    if (isSea(P.x, P.z)) { const sh = nearestShore(P.x, P.z); P.x = sh[0] + Math.cos(sh[2]) * 4; P.z = sh[1] + Math.sin(sh[2]) * 4; }   // never leave you in the water
    P.sink = 0; P.wet = false; P.vx = P.vz = P.vy = 0; P.y = surf(P.x, P.z) + 0.3; P.yr = 0;
    const r = HELP.rs, sx = Math.sin(r.userData.yaw), sz = Math.cos(r.userData.yaw);
    P.safe = { x: P.x, z: P.z, yaw: P.yaw }; towSnap();
    GS.warmth = Math.max(GS.warmth, 25); BOG.immune = 6;
    let wet = 0; for (const j of GS.load) { if (j.big) { j.cond = Math.max(0, j.cond - 40 * (j.fragile ? 1.3 : 1) * (1 - ST.armor)); wet++; } else { j.hits = (j.hits || 0) + 2; wet++; } }
    toast(`Winched out of the fjord: −$${fee}.${wet ? " Everything aboard is soaked and worth less." : ""}`, "warn");
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
    v.g.visible = v.vk.sled && !far; fig.visible = !far; if (v.vk.sled && v.left > 1.2) fig.visible = false;
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
  if (rider) rider.visible = !FOOT.on;
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
    if (typeof rescuePrompt === "function" && rescuePrompt()) h = WN.prompt;
    else if (WN.state === "hooked" && WN.mode === "self") {
      const a = WN.anchor, close = a && Math.hypot(FOOT.x - a.x, FOOT.z - a.z) < 2.8;
      h = `Hold SPACE to reel${wd && wd.block ? " · X at the strap: double the line" : ""}${close ? " · E: unhook" : ""} · Q: get on`;
    } else if (wd && WN.state === "out") {
      const cands = anchorsNear(FOOT.x, FOOT.z, 2.6), fl = fairlead(), reach = cands.find(c => Math.hypot(c.o.x - fl[0], c.o.z - fl[2]) <= wd.len - 0.4);
      h = reach ? `E: strap the ${anchorName(reach.o)} (${anchorTag(reach.o)})` : WN.tight ? `Line's at its end (${wd.len} m). Hook what you can reach, or go back.` : `Walk the line out to a tree or boulder · X: size it up${near ? " · Q: get on" : ""}`;
    } else if (BOG.on && near) h = FOOT.dig ? `Digging ${Math.round(BOG.dig * 100)}% · E: stop` : "E: dig her out (slow) · Q: get on";
    else h = near ? "Q: get on the sled" : "Walk back to the sled and press Q";
  } else if (BOG.on) { show = true; h = wd ? "BOGGED · Q: get off, wade to a tree and hook the winch (E) · R: reset" : "BOGGED · Q: get off and dig (hold E) · R: reset"; }
  else if (BOG.acc > 0.4) { show = true; h = "TRACK'S DIGGING IN · ease off the throttle"; }
  else if (RJ.on && rescueRideHint()) { show = true; h = rescueRideHint(); }
  if (HELP.on && HELP.kind === "fuel") { show = true; h = (h ? h + " · " : "") + (HELP.called ? `FUEL DELIVERY IN ${Math.max(0, Math.ceil(HELP.eta - HELP.t))} s` : ""); }
  WN.hint = h; WN.show = show;
}
function updWinchHud() {
  const el = $("wnHud"); if (!el) return;
  const wd = winchDef(), on = !!WN.show && !GS.dead && !showroomOn() && !GS.boardOpen;
  el.hidden = !on; if (!on) return;
  const hooked = WN.state === "hooked" && wd;
  el.classList.toggle("tense", hooked && WN.tens > 0.85);
  $("wnHint").textContent = WN.hint;
  $("wnGauge").hidden = !hooked;
  if (hooked) { $("wnTens").style.width = clamp(WN.tens * 100, 0, 100).toFixed(0) + "%"; $("wnRead").textContent = `${lbf(WN.need).toLocaleString("en-US")} / ${lbf(WN.cap).toLocaleString("en-US")} lb${WN.dbl ? " · doubled" : ""}${WN.hold ? ` · sled ${WN.slip > 0.05 ? "slipping" : "holding"}` : ""}`; }
}

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
  if (started) { acc += dt; let n = 0; while (acc >= H && n < 8) { physStep(H); acc -= H; n++; } if (n === 8) acc = 0; }
  const spd = updVisuals(dt);
  wnVisual(dt);
  dogTick(dt);
  if (started) updGame(dt, spd); else if (VZ.mesh && VZ.mesh.visible) VZ.mesh.visible = false;
  updSky(); seaU.uTime.value += dt;
  updSpray(dt); updSparks(dt); updFlakes(dt); updPending(dt); updWobble(dt); pineCull(dt); P.dumped = Math.max(0, P.dumped - dt);
  if (started) { updAudio(spd); markMap(); }
  flushSnow();
  trailClock += dt; if (trailDirty && trailClock > 0.25) { trailTex.needsUpdate = true; trailDirty = false; trailClock = 0; }
  hudT += dt; if (hudT > 0.066) { hudT = 0; if (started) { updHud(spd); updGameHud(); updWinchHud(); updTouch(); drawMap(); if (!$("bigmap").hidden) drawBigMap(); } }
  renderer.render(scene, camera);
  if (GS.boardOpen && (BD.tick = !BD.tick)) ctOverlay(t);          // the chart's moving parts, at half rate
  if (!live) { live = true; document.body.classList.add("live"); }
}
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

/* ---------------- god menu (gamepad Y, or the ` key) ---------------- */
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
  { id: "storm", label: "Weather", sub: () => GS.stormPhase === "storm" ? "Storm · A to clear" : "Clear · A for a storm", do: () => {
      if (GS.stormPhase === "storm") { GS.stormPhase = "calm"; GS.stormT = 400; GS.warned = false; toast("Sky's clearing."); }
      else { GS.stormPhase = "storm"; GS.stormT = 150; GS.warned = true; toast("Storm called in.", "warn"); }
    } },
  { id: "tp", label: "Teleport", sub: () => "◀ " + SITES[godTp].name + " ▶", adjust: d => { godTp = (godTp + d + SITES.length) % SITES.length; }, do: () => godTeleport(SITES[godTp]) },
  { id: "jobs", label: "Fresh jobs on the board", do: () => { makeJobs(depot); makeContracts(depot); if (GS.boardOpen) renderBoard(); toast("New work posted at the quay."); } },
  { id: "reset", label: "Reset sled", sub: "Also pad Back / R", do: () => resetSled() }
];
function godTeleport(s) {
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
  if (godOpen) renderGod();
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
  genWorld(); computeSites(); placeQuay();
  P.x = SPAWN.x; P.z = SPAWN.z; P.yaw = SPAWN.yaw; camState.yaw = SPAWN.yaw;
  buildFar(); buildProps(); buildSites(); buildTown(); buildTownSigns(); buildDog(); buildTow(); load(); buildMapBg(); ctBuild();
  buildNpcs(); buildWalker(); buildWinchGear();
  NPCS.forEach((n, i) => {                       // start them out on the map, not in your lap
    const s0 = SITES[2 + i * 2] || SITES[1];
    n.x = s0.x + 40; n.z = s0.z + 40; n.y = surf(n.x, n.z); n.yaw = Math.random() * 6.28; npcPickTarget(n);
  });
  P.y = surf(P.x, P.z);
  recenter(P.x, P.z, true);
  ready = true;
  loadSettings(); buildSettings(); buildGarageTabs(); boardPaper(); ctFonts();
  titleReady();
}
requestAnimationFrame(frame);
// let the title paint (and its faces arrive) before the world build blocks the page for a moment
(document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 800))]) : Promise.resolve())
  .then(() => requestAnimationFrame(() => setTimeout(boot, 0)));
})();
