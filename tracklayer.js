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

/* ---------------- world constants ---------------- */
const WORLD = 4096, HALF = 2048, GRES = 2, GN = WORLD / GRES + 1;   // coarse terrain grid (2 m)
const CELL = 0.25, FN = WORLD / CELL;   // 16384 fine cells per side                               // fine snow grid (25 cm)
const ground = new Float32Array(GN * GN), freshG = new Float32Array(GN * GN), bio = new Uint8Array(GN * GN); // bio: 0 open, 1 ice, 2 forest
const LAKES = [
  { x: 300, z: 860, r: 330 }, { x: -820, z: 300, r: 250 }, { x: 900, z: -80, r: 215 },
  { x: -340, z: 1320, r: 265 }, { x: -1080, z: -600, r: 150 }, { x: 1220, z: 1040, r: 190 },
  { x: 1500, z: 1560, r: 240 }, { x: -1560, z: 1180, r: 205 }, { x: 260, z: 1720, r: 180 },
  { x: -1420, z: -260, r: 130 }, { x: 1680, z: 420, r: 150 }
];
const SPAWN = { x: -30, z: 200, yaw: Math.PI * 0.92 };

function baseH(x, z) {
  let h = 18 + (fbm(x / 520 + 11, z / 520 - 7, 4) - 0.5) * 52 + (fbm(x / 120, z / 120, 3) - 0.5) * 14 + (fbm(x / 40, z / 40, 2) - 0.5) * 4;
  const m = sstep(240, -1080, z);
  if (m > 0) { const r = ridged(x / 700 + 3.1, z / 700 - 1.7, 5); h += m * (35 + Math.pow(r, 1.7) * 300); }
  const e = sstep(1560, 2010, Math.max(Math.abs(x), Math.abs(z)));
  if (e > 0) h += e * (70 + ridged(x / 320, z / 320, 3) * 190);
  return h;
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

function genWorld() {
  for (const L of LAKES) {
    let lv = baseH(L.x, L.z);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; lv = Math.min(lv, baseH(L.x + Math.cos(a) * L.r * 1.1, L.z + Math.sin(a) * L.r * 1.1)); }
    L.lv = lv - 2;
  }
  for (let j = 0; j < GN; j++) {
    const z = j * GRES - HALF;
    for (let i = 0; i < GN; i++) {
      const x = i * GRES - HALF;
      let h = baseH(x, z), ice = 0;
      for (const L of LAKES) {
        const dx = x - L.x, dz = z - L.z, dd = Math.sqrt(dx * dx + dz * dz);
        if (dd > L.r * 1.7) continue;
        const t = dd / (L.r * (0.76 + 0.48 * fbm(x / 170 + L.x, z / 170, 3)));
        const mk = 1 - sstep(0.92, 1.3, t);
        h += (L.lv - h) * mk;
        if (t < 0.97) ice = 1;
      }
      ground[j * GN + i] = h; bio[j * GN + i] = ice;
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
      if (bio[k] === 1) d = 0.05;
      else {
        d = 0.5 + 0.38 * sstep(50, 170, h);
        d *= 1 - sstep(0.62, 1.0, s);
        const fd = fbm(x / 300 + 40, z / 300 - 3, 3);
        if (fd > 0.5 && h < 175 && s < 0.5) { bio[k] = 2; d *= 0.86; }
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

/* ---------------- three.js setup ---------------- */
const canvas = $("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 500 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

// sky dome
const sky = new THREE.Mesh(new THREE.SphereGeometry(8000, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uSun: { value: sunDir }, uDay: { value: 1 }, uStorm: { value: 0 }, uFog: { value: new THREE.Color(0xc4d3e2) } },
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
  fragmentShader: `varying vec3 vD; uniform vec3 uSun; uniform float uDay; uniform float uStorm; uniform vec3 uFog;
    void main(){ float h = clamp(vD.y,0.0,1.0);
      vec3 hor = vec3(0.86,0.85,0.86), mid = vec3(0.60,0.72,0.86), top = vec3(0.30,0.46,0.70);
      vec3 c = mix(hor, mid, smoothstep(0.0,0.18,h)); c = mix(c, top, smoothstep(0.18,0.8,h));
      vec3 n = mix(vec3(0.09,0.12,0.19), vec3(0.015,0.025,0.06), smoothstep(0.0,0.6,h));
      float s = max(dot(normalize(vD), uSun), 0.0);
      c += vec3(1.0,0.72,0.45)*(pow(s,6.0)*0.3 + pow(s,90.0)*0.6)*(1.0 + (1.0-smoothstep(0.0,0.3,uSun.y))) + vec3(1.0,0.95,0.85)*smoothstep(0.9993,0.9997,s);
      c = mix(n, c, uDay);
      if (vD.y < 0.0) c = uFog;
      c = mix(c, uFog, clamp(uStorm*0.9 + (1.0 - smoothstep(0.0,0.08,h))*0.6, 0.0, 1.0));
      gl_FragColor = vec4(c,1.0); }`
}));
sky.renderOrder = -1; scene.add(sky);

/* ---------------- snow patch (fine deformable mesh around the sled) ---------------- */
const S = 401, PHALF = 200;
let pox = -99999, poz = -99999;
let pdata = new Float32Array(S * S * 4), pdata2 = new Float32Array(S * S * 4);
const snowTex = new THREE.DataTexture(pdata, S, S, THREE.RGBAFormat, THREE.FloatType);
snowTex.minFilter = snowTex.magFilter = THREE.NearestFilter; snowTex.generateMipmaps = false;
let snowDirty = false;

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
  let cx = Math.round(((px + HALF) / CELL - PHALF) / 16) * 16, cz = Math.round(((pz + HALF) / CELL - PHALF) / 16) * 16;
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
  snowTex.image.data = pdata; snowTex.needsUpdate = true;
  const wx = cx * CELL - HALF, wz = cz * CELL - HALF;
  patchMesh.position.set(wx, 0, wz);
  farU.uPatch.value.set(wx, wz, wx + (S - 1) * CELL, wz + (S - 1) * CELL);
}
function writeCell(ix, iz, oldD, newD, f) {
  const i = ix - pox, j = iz - poz;
  if (i < 0 || j < 0 || i >= S || j >= S) return;
  const o = (j * S + i) * 4;
  pdata[o] += newD - oldD; pdata[o + 1] = packOf(newD, f);
  snowDirty = true;
}

/* ---------------- trail map (far terrain tint + minimap) ---------------- */
const TR = 1024, trailData = new Uint8Array(TR * TR * 4);
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
let far, capMesh, treeMesh, cargoMesh = null, started = false, ready = false;
const obGrid = new Map(); const OBC = 16;
function addOb(o) { const k = Math.floor((o.z + HALF) / OBC) * 512 + Math.floor((o.x + HALF) / OBC); let a = obGrid.get(k); if (!a) obGrid.set(k, a = []); a.push(o); }

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
  const step = 4, n = (GN - 1) / step + 1;   // 8 m far-terrain grid
  const pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const gi = i * step, gj = j * step, k = gj * GN + gi, v = j * n + i;
    const d = freshG[k], b = bio[k];
    pos[v * 3] = gi * GRES - HALF; pos[v * 3 + 1] = ground[k] + d; pos[v * 3 + 2] = gj * GRES - HALF;
    let r = 0.93, g = 0.955, bl = 1.0;
    if (b === 1) { r = 0.62; g = 0.76; bl = 0.86; }
    else if (d < 0.12) { const t = 1 - d / 0.12; r = lerp(r, 0.27, t); g = lerp(g, 0.26, t); bl = lerp(bl, 0.28, t); }
    else if (b === 2) { r = 0.84; g = 0.87; bl = 0.92; }
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
      float tr = texture2D(uTrail, (vWxz + 2048.0) / 4096.0).r;
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.76,0.82,0.9), tr);`);
  };
  far = new THREE.Mesh(geo, mat); far.receiveShadow = false;
  scene.add(far);
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
function buildProps() {
  const rnd = mulberry32(90210);
  const green = [0.10, 0.20, 0.15], snowC = [0.92, 0.95, 1.0];
  const caps = [], parts = [paint(new THREE.CylinderGeometry(0.16, 0.24, 2.2, 6).translate(0, 1.1, 0), () => [0.25, 0.17, 0.12])];
  [[1.9, 3.0, 2.6], [1.5, 2.7, 4.1], [1.05, 2.3, 5.5], [0.6, 1.7, 6.7]].forEach(([r, h, y]) => {
    parts.push(paint(new THREE.ConeGeometry(r, h, 7).translate(0, y, 0), (x, py, z, ny) => {
      const t = clamp((py - (y - h / 2)) / h, 0, 1), s = ny < -0.5 ? 0 : 0.12 + t * 0.12;
      return [lerp(green[0], snowC[0], s), lerp(green[1], snowC[1], s), lerp(green[2], snowC[2], s)];
    }));
    const ch = h * 0.86, cr = r * 0.86 * 1.13, cy = y + h / 2 + 0.1 - ch / 2, bot = cy - ch / 2;
    const cg = new THREE.ConeGeometry(cr, ch, 16, 6, true).translate(0, cy, 0), cp = cg.attributes.position;
    for (let v = 0; v < cp.count; v++) {
      const vx = cp.getX(v), vy = cp.getY(v), vz = cp.getZ(v), t = clamp((vy - bot) / ch, 0, 1);
      if (t > 0.99) { cp.setY(v, vy + 0.12); continue; }
      const hsh = hash(Math.round(vx * 97) + 7 * Math.round(y * 10), Math.round(vz * 97) + Math.round(vy * 53));
      const ang = Math.atan2(vz, vx), lump = Math.sin(ang * 5 + y * 3) * 0.5 + Math.sin(ang * 9 - y * 2) * 0.3;
      let rs = 1 + 0.11 * Math.sin(Math.PI * Math.sqrt(t)) + lump * 0.05 * (1 - t) + (hsh - 0.5) * 0.06, dy = (hsh - 0.5) * 0.04;
      if (t < 0.01) { rs += 0.06 + lump * 0.03; dy = (0.5 + lump * 0.5) * 0.22 * ch; }   // soft scalloped overhang
      cp.setXYZ(v, vx * rs, vy + dy, vz * rs);
    }
    cg.computeVertexNormals();                       // smooth, pillowy shading (not faceted)
    const capPart = paint(cg, (x, py, z, ny) => {
      const t = clamp((py - bot) / ch, 0, 1), u = Math.pow(t, 0.35);
      return [lerp(0.8, 1.0, u), lerp(0.87, 1.0, u), 1.0];
    });
    caps.push(capPart);
  });
  const treeGeo = mergeGeos(parts), capGeo = mergeGeos(caps);
  const trees = [];
  for (let n = 0; n < 260000 && trees.length < 17000; n++) {
    const x = (rnd() * 2 - 1) * 2000, z = (rnd() * 2 - 1) * 2000;
    const b = bioAt(x, z); if (b === 1) continue;
    const h = groundAt(x, z); if (h > 185) continue;
    const s = Math.hypot(groundAt(x + 2, z) - groundAt(x - 2, z), groundAt(x, z + 2) - groundAt(x, z - 2)) / 4;
    if (s > 0.55) continue;
    const lake = LAKES.some(L => Math.hypot(x - L.x, z - L.z) < L.r * 1.02 && bioAt(x, z) !== 0);
    if (lake) continue;
    if (b === 2) { const fd = fbm(x / 300 + 40, z / 300 - 3, 3); if (rnd() > (fd - 0.5) * 7) continue; }
    else if (rnd() > 0.035) continue;
    if (nearSite(x, z, 24)) continue;
    trees.push([x, z, 0.75 + rnd() * 0.75]);
  }
  const tm = treeMesh = new THREE.InstancedMesh(treeGeo, breezeMat(), trees.length);
  capMesh = new THREE.InstancedMesh(capGeo, breezeMat(true), trees.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  trees.forEach(([x, z, s], i) => {
    const yaw = rnd() * 6.28, sy = s * (0.9 + rnd() * 0.3); q.setFromAxisAngle(up, yaw); sc.set(s, sy, s); p.set(x, groundAt(x, z) - 0.25, z);
    m4.compose(p, q, sc); tm.setMatrixAt(i, m4); capMesh.setMatrixAt(i, m4);
    const v = 0.85 + rnd() * 0.25; c.setRGB(v, v * (0.95 + rnd() * 0.1), v); tm.setColorAt(i, c);
    addOb({ x, z, r: 0.42 * s, top: 1e9, tree: i, s, sy, yaw, y: p.y, snowy: true, wob: null });
  });
  tm.castShadow = true; scene.add(tm);
  capMesh.castShadow = true; scene.add(capMesh);

  // rocks
  const rockGeo = paint(new THREE.IcosahedronGeometry(1, 0), (x, y, z, ny) => ny > 0.45 ? [0.9, 0.93, 0.98] : [0.32, 0.31, 0.33]);
  rockGeo.computeVertexNormals();
  const rocks = [];
  for (let n = 0; n < 90000 && rocks.length < 1600; n++) {
    const x = (rnd() * 2 - 1) * 2000, z = (rnd() * 2 - 1) * 2000;
    if (bioAt(x, z) === 1) continue;
    const h = groundAt(x, z), want = h > 70 ? 0.25 : 0.03;
    if (rnd() > want || nearSite(x, z, 24)) continue;
    rocks.push([x, z, 0.6 + Math.pow(rnd(), 2) * 2.4]);
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
  for (let n = 0; n < 120000 && logs.length < 420; n++) {
    const x = (rnd() * 2 - 1) * 1990, z = (rnd() * 2 - 1) * 1990;
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
const sledRoot = new THREE.Group(), sledBody = new THREE.Group(), skiPivots = [], barPivot = new THREE.Group();
let bodyMat = null, jacketMat = null, accentMat = null, pantsMat = null, riderHead = [], styleParts = {};
const V = {};   // swappable parts and rider kit, toggled by the garage
const SR = { on: false, a: 0, drag: false, lx: 0 };           // garage / settings showroom camera
const PV = { sled: null, cat: null, slot: null, id: null };   // what the mouse is trying on
function showroomOn() { return GS.garageOpen || !document.getElementById("settings").hidden; }
addEventListener("pointerdown", e => { if (SR.on && e.target.tagName === "CANVAS") { SR.drag = true; SR.lx = e.clientX; } });
addEventListener("pointermove", e => { if (SR.drag) { SR.a -= (e.clientX - SR.lx) * 0.008; SR.lx = e.clientX; } });
addEventListener("pointerup", () => { SR.drag = false; });
sledRoot.add(sledBody); scene.add(sledRoot);
sledRoot.rotation.order = "YXZ";
(function buildSled() {
  const std = (c, r = 0.6, m = 0.05, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, extra || {}));
  bodyMat = std(0xff5a1f, 0.38, 0.15);
  jacketMat = std(0x1d3f6e, 0.75); accentMat = std(0xeef2f5, 0.7); pantsMat = std(0x232a33, 0.85);
  const body = bodyMat, dark = std(0x1a2027, 0.8), black = std(0x0c0f12, 0.95), rubber = std(0x14181d, 0.98),
    steel = std(0x9aa6b2, 0.32, 0.7), chrome = std(0xc8d2dc, 0.2, 0.85), glove = std(0x11161c, 0.85),
    glass = std(0xbfe0f2, 0.05, 0.05, { transparent: true, opacity: 0.22, depthWrite: false }),
    lampMat = std(0xfff4d6, 0.25, 0, { emissive: 0xfff0c8, emissiveIntensity: 1.8 }),
    tailMat = std(0x8c1414, 0.4, 0, { emissive: 0xff2a1a, emissiveIntensity: 0.9 }),
    skin = std(0xc98a63, 0.85), boot = std(0x15191f, 0.9), helmetMat = std(0xf2f5f8, 0.25, 0.15), visorMat = std(0x0d141c, 0.08, 0.6);

  const put = (m, x, y, z, rx = 0, ry = 0, rz = 0, parent = sledBody) => {
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m;
  };
  const box = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = sledBody) =>
    put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z, rx, ry, rz, parent);
  const cyl = (rt, rb, h, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = sledBody, seg = 10) =>
    put(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat), x, y, z, rx, ry, rz, parent);
  const ball = (r, mat, x, y, z, parent = sledBody, sx = 1, sy = 1, sz = 1) => {
    const m = put(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat), x, y, z, 0, 0, 0, parent);
    m.scale.set(sx, sy, sz); return m;
  };
  // a limb: capsule from a to b
  const limb = (r, ax, ay, az, bx, by, bz, mat, parent) => {
    const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz);
    const g = new THREE.Group(); g.position.set(ax, ay, az); (parent || sledBody).add(g);
    g.lookAt(new THREE.Vector3(bx, by, bz).sub(new THREE.Vector3(ax, ay, az)).add(g.position));
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, len, 10), mat);
    m.rotation.x = Math.PI / 2; m.position.z = len / 2; m.castShadow = true; g.add(m);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.95, 10, 8), mat); cap.position.z = len; cap.castShadow = true; g.add(cap);
    return g;
  };

  /* ---- running gear ---- */
  // track: belt loop with lugs, on a slide rail
  const tr = new THREE.Group(); sledBody.add(tr); V.track = tr;
  // the belt carries a lug texture that scrolls with distance travelled
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
    box(0.56, 0.05, 0.07, rubber, 0, 0.015, -1.45 + i * 0.12, 0, 0, 0, tr);
    if (i % 2 === 0) { const st = box(0.44, 0.04, 0.03, chrome, 0, -0.015, -1.45 + i * 0.12, 0, 0, 0, tr); st.visible = false; V.studs.push(st); }
  }
  V.wheelA = cyl(0.19, 0.19, 0.5, rubber, 0, 0.19, -1.46, 0, 0, Math.PI / 2, tr, 14);   // rear idler
  V.wheelB = cyl(0.17, 0.17, 0.5, rubber, 0, 0.19, 0.34, 0, 0, Math.PI / 2, tr, 14);    // drive sprocket
  for (const s of [-0.16, 0.16]) cyl(0.09, 0.09, 0.05, steel, s, 0.1, -0.95, 0, 0, Math.PI / 2, tr, 10);
  box(0.06, 0.5, 0.06, steel, 0, 0.5, -1.0, 0.5, 0, 0, tr);                  // rear shock
  cyl(0.05, 0.05, 0.42, chrome, 0, 0.52, -0.55, 0.9, 0, 0, tr, 8);

  // tunnel + running boards + heat exchanger ribs
  box(0.6, 0.3, 1.9, dark, 0, 0.48, -0.5);
  cyl(0.16, 0.16, 0.6, dark, 0, 0.56, -1.44, 0, 0, Math.PI / 2, sledBody, 12);   // rounded tail
  box(0.66, 0.05, 2.0, body, 0, 0.64, -0.55);
  for (const s of [-1, 1]) {
    box(0.26, 0.04, 1.35, dark, s * 0.44, 0.35, -0.6, 0, 0, s * 0.18);        // running board
    for (let i = 0; i < 6; i++) box(0.02, 0.05, 0.16, steel, s * 0.31, 0.44, -1.2 + i * 0.28);
    box(0.03, 0.24, 1.2, dark, s * 0.31, 0.5, -0.62);                          // side panel
  }
  box(0.56, 0.07, 0.32, dark, 0, 0.66, -1.58, 0.18);                           // rear rack
  box(0.5, 0.04, 0.26, rubber, 0, 0.5, -1.72, 0.5);                            // snow flap
  box(0.2, 0.06, 0.04, tailMat, 0, 0.7, -1.72, 0.18).castShadow = false;     // tail light

  /* ---- chassis & body panels ---- */
  // hood: a rounded shell over the engine bay, tapering into the nose
  box(0.7, 0.3, 0.7, dark, 0, 0.8, 0.36);                                      // engine bay, tucked inside the shell
  V.hood = ball(0.52, body, 0, 0.84, 0.5, sledBody, 0.88, 0.55, 1.35);         // hood shell
  V.nose = ball(0.4, body, 0, 0.8, 1.05, sledBody, 0.82, 0.52, 1.05);          // nose
  V.noseTip = cyl(0.16, 0.3, 0.5, body, 0, 0.78, 1.2, Math.PI / 2 - 0.25, 0, 0, sledBody, 12);
  V.grille = box(0.5, 0.14, 0.06, black, 0, 0.78, 1.36, 0.35);                 // grille
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) box(0.02, 0.06, 0.2, dark, s * 0.44, 0.78 + i * 0.09, 0.85 + i * 0.03, 0, 0, 0);  // louvres
    box(0.02, 0.2, 0.5, dark, s * 0.45, 0.8, 0.45);                            // side panel accent
  }
  V.front = new THREE.Group(); sledBody.add(V.front);                          // everything that hangs off the nose
  box(0.66, 0.2, 0.18, black, 0, -0.12, 0.04, 0.3, 0, 0, V.front);              // nose cap
  cyl(0.035, 0.035, 0.72, chrome, 0, -0.32, 0.12, 0, 0, Math.PI / 2, V.front, 8);   // front bumper
  for (const s of [-1, 1]) cyl(0.03, 0.03, 0.3, chrome, s * 0.34, -0.24, 0.05, 0.9, 0, 0, V.front, 8);
  box(0.34, 0.12, 0.05, lampMat, 0, 0.02, -0.01, 0.3, 0, 0, V.front).castShadow = false;
  box(0.1, 0.05, 0.04, lampMat, 0.28, -0.04, -0.06, 0.3, 0, 0, V.front).castShadow = false;
  box(0.1, 0.05, 0.04, lampMat, -0.28, -0.04, -0.06, 0.3, 0, 0, V.front).castShadow = false;

  // windshield: three angled panes so it reads as curved
  const shield = new THREE.Group(); sledBody.add(shield); V.shield = shield;
  box(0.5, 0.4, 0.03, glass, 0, 1.3, 0.78, -0.5, 0, 0, shield);
  box(0.2, 0.36, 0.03, glass, 0.31, 1.28, 0.74, -0.5, -0.55, 0, shield);
  box(0.2, 0.36, 0.03, glass, -0.31, 1.28, 0.74, -0.5, 0.55, 0, shield);
  box(0.56, 0.05, 0.04, body, 0, 1.47, 0.7, -0.5, 0, 0, shield);

  // seat: bolster + tapered cushion
  V.seatBase = box(0.44, 0.14, 1.0, black, 0, 0.98, -0.42);
  V.seatPad = ball(0.3, dark, 0, 1.0, -0.4, sledBody, 0.72, 0.42, 1.7);        // rounded cushion
  V.seatBolster = ball(0.26, dark, 0, 1.04, -0.78, sledBody, 0.72, 0.52, 0.62);  // seat tail, tucked against the cushion
  cyl(0.02, 0.02, 0.3, chrome, 0, 1.12, -1.12, 0, 0, Math.PI / 2, sledBody, 8);   // grab handle

  /* ---- front suspension + skis ---- */
  for (const s of [-1, 1]) {
    limb(0.035, s * 0.24, 0.62, 0.92, s * 0.48, 0.44, 0.92, dark);              // upper A-arm
    limb(0.035, s * 0.24, 0.38, 0.86, s * 0.48, 0.26, 0.92, dark);              // lower A-arm
    limb(0.045, s * 0.26, 0.92, 0.8, s * 0.46, 0.34, 0.92, chrome);              // shock
    cyl(0.07, 0.07, 0.16, body, s * 0.3, 0.86, 0.83, 0.3, 0, s * 0.35, sledBody, 8);       // spring top
  }
  for (const s of [-0.5, 0.5]) {
    const pv = new THREE.Group(); pv.position.set(s, 0, 0.92); sledBody.add(pv); skiPivots.push(pv);
    box(0.16, 0.05, 1.25, steel, 0, 0.03, -0.05, 0, 0, 0, pv);                  // ski body
    (V.wideSki = V.wideSki || []).push(box(0.3, 0.05, 1.35, steel, 0, 0.02, -0.05, 0, 0, 0, pv));   // powder ski shell
    (V.carbide = V.carbide || []).push(box(0.05, 0.04, 1.0, chrome, 0, -0.03, -0.05, 0, 0, 0, pv)); // carbide runner
    box(0.16, 0.05, 0.3, steel, 0, 0.09, 0.66, -0.5, 0, 0, pv);                 // curled tip
    box(0.16, 0.05, 0.18, steel, 0, 0.2, 0.8, -0.95, 0, 0, pv);
    box(0.04, 0.05, 1.1, steel, 0, -0.01, -0.05, 0, 0, 0, pv);                  // keel
    box(0.2, 0.06, 0.24, dark, 0, 0.12, 0.05, 0, 0, 0, pv);                     // saddle
    cyl(0.03, 0.03, 0.34, steel, 0, 0.26, 0.02, 0, 0, 0, pv, 8);                // spindle
  }

  /* ---- bars ---- */
  barPivot.position.set(0, 1.44, 0.34); sledBody.add(barPivot);
  // steering column: a post from the chassis up to whatever height the bars sit at
  {
    const cg = new THREE.CylinderGeometry(0.035, 0.05, 1, 10); cg.translate(0, 0.5, 0);
    V.column = put(new THREE.Mesh(cg, dark), 0, 0.62, 0.34, -0.12);
    const pg = new THREE.BoxGeometry(0.16, 0.12, 0.16);
    V.columnFoot = put(new THREE.Mesh(pg, dark), 0, 0.62, 0.36);                // bracket where it meets the bulkhead
  }
  cyl(0.022, 0.022, 0.78, steel, 0, 0, 0, 0, 0, Math.PI / 2, barPivot, 8);      // cross bar
  box(0.2, 0.03, 0.03, steel, 0, 0.06, 0, 0, 0, 0, barPivot);                   // cross brace
  cyl(0.032, 0.032, 0.12, steel, 0, -0.06, 0, 0, 0, 0, barPivot, 8);            // clamp onto the column
  for (const s of [-1, 1]) {
    cyl(0.028, 0.028, 0.14, rubber, s * 0.32, 0, 0, 0, 0, Math.PI / 2, barPivot, 10);       // grip
    (V.guards = V.guards || []).push(box(0.16, 0.14, 0.03, dark, s * 0.34, 0.02, 0.06, -0.3, 0, 0, barPivot));   // handguard
  }
  box(0.09, 0.02, 0.05, steel, 0.3, 0.035, 0.03, 0, 0, 0, barPivot);            // throttle lever
  box(0.09, 0.02, 0.05, steel, -0.3, 0.035, 0.03, 0, 0, 0, barPivot);           // brake lever

  /* ---- cargo ---- */
  cargoMesh = new THREE.Group(); sledBody.add(cargoMesh); cargoMesh.visible = false;
  for (let i = 0; i < 3; i++) {           // up to three parcels on the deck
    box(0.46, 0.32, 0.38, std(i === 1 ? 0x7a6a52 : 0x8a6a42, 0.9), 0, 0.84, -1.5 - i * 0.44, 0.22, 0, 0, cargoMesh);
    box(0.5, 0.05, 0.06, body, 0, 1.0, -1.48 - i * 0.44, 0.22, 0, 0, cargoMesh);
  }
  V.deck = new THREE.Group(); sledBody.add(V.deck);
  box(0.62, 0.08, 1.0, dark, 0, 0.66, -1.95, 0.08, 0, 0, V.deck);       // stretched deck
  box(0.06, 0.24, 1.0, dark, 0.3, 0.78, -1.95, 0.08, 0, 0, V.deck);
  box(0.06, 0.24, 1.0, dark, -0.3, 0.78, -1.95, 0.08, 0, 0, V.deck);

  /* ---- rider ---- */
  const rider = new THREE.Group(); sledBody.add(rider);
  V.legs = [];
  for (const s of [-1, 1]) {
    box(0.15, 0.1, 0.32, boot, s * 0.3, 0.4, -0.3, 0.1, 0, 0, rider);                       // boot on the board
    V.legs.push(limb(0.085, s * 0.29, 0.5, -0.3, s * 0.27, 0.72, -0.1, pantsMat, rider));   // shin
    V.legs.push(limb(0.105, s * 0.19, 0.94, -0.46, s * 0.27, 0.74, -0.12, pantsMat, rider)); // thigh
  }
  V.hips = ball(0.26, pantsMat, 0, 0.98, -0.5, rider, 0.86, 0.72, 1.0);                     // hips
  const torso = box(0.42, 0.46, 0.34, jacketMat, 0, 1.3, -0.5, 0.22, 0, 0, rider);          // jacket
  V.chest = ball(0.25, jacketMat, 0, 1.42, -0.44, rider, 1.02, 0.92, 0.88);                  // chest volume
  V.torso = torso;
  ball(0.16, jacketMat, 0, 1.56, -0.44, rider, 1.0, 0.7, 0.9);                              // collar
  styleParts.shoulders = [];
  for (const s of [-1, 1]) {
    styleParts.shoulders.push(ball(0.135, accentMat, s * 0.21, 1.44, -0.44, rider, 1, 1, 1.1));
    limb(0.085, s * 0.22, 1.43, -0.42, s * 0.3, 1.34, 0.06, jacketMat, rider);              // upper arm
    limb(0.072, s * 0.3, 1.34, 0.02, s * 0.32, 1.43, 0.3, jacketMat, rider);                  // forearm up to the grip
    box(0.11, 0.11, 0.17, glove, s * 0.32, 1.44, 0.34, 0, 0, 0, rider);                       // glove on the grip
    styleParts["band" + s] = box(0.1, 0.07, 0.1, accentMat, s * 0.31, 1.38, 0.14, 0, 0, 0, rider);   // sleeve band
  }
  styleParts.stripe = box(0.08, 0.4, 0.05, accentMat, 0, 1.32, -0.33, 0.22, 0, 0, rider);   // chest stripe
  styleParts.back = box(0.28, 0.09, 0.05, accentMat, 0, 1.34, -0.67, 0.22, 0, 0, rider);    // back band
  box(0.24, 0.28, 0.14, std(0x2a3038, 0.9), 0, 1.36, -0.7, 0.22, 0, 0, rider);              // small pack
  const neck = cyl(0.07, 0.07, 0.09, glove, 0, 1.6, -0.42, 0, 0, 0, rider, 8);
  const helm = ball(0.2, helmetMat, 0, 1.72, -0.4, rider, 1, 1.05, 1.08);                   // helmet
  const chin = box(0.25, 0.13, 0.2, helmetMat, 0, 1.65, -0.28, 0.1, 0, 0, rider);
  const visor = box(0.29, 0.13, 0.11, visorMat, 0, 1.73, -0.25, 0.05, 0, 0, rider);
  const hstripe = box(0.07, 0.1, 0.34, accentMat, 0, 1.88, -0.41, 0, 0, 0, rider);
  riderHead = [helm, chin, visor, hstripe, neck, shield];
  V.helmetMat = helmetMat; V.visorMat = visorMat; V.neck = neck;

  /* ---- bolt-ons the garage can fit ---- */
  V.canMat = std(0xb3201a, 0.45, 0.35);
  V.tankL = new THREE.Group(); V.tankR = new THREE.Group(); sledBody.add(V.tankL, V.tankR);
  for (const [grp, sx] of [[V.tankL, 1], [V.tankR, -1]]) {   // the sled faces +z, so its left is +x
    // a jerry can standing on the running board, strapped to the tunnel
    const cx = sx * 0.45, cz = -0.68, cy = 0.56;
    box(0.13, 0.36, 0.28, V.canMat, cx, cy, cz, 0, 0, 0, grp);                     // body
    for (const d of [-1, 1]) {                                                     // the pressed X on the flank
      box(0.012, 0.36, 0.035, V.canMat, cx + sx * 0.066, cy, cz, d * 0.9, 0, 0, grp);
    }
    box(0.135, 0.03, 0.285, V.canMat, cx, cy + 0.12, cz, 0, 0, 0, grp);            // stiffening rib
    for (const hz of [-0.07, 0, 0.07]) box(0.03, 0.06, 0.025, V.canMat, cx, cy + 0.2, cz + hz, 0, 0, 0, grp);   // triple handle
    box(0.03, 0.02, 0.17, V.canMat, cx, cy + 0.235, cz, 0, 0, 0, grp);
    cyl(0.028, 0.028, 0.06, dark, cx, cy + 0.19, cz + 0.12, 0.5, 0, 0, grp, 8);     // spout cap
    box(0.05, 0.03, 0.03, chrome, cx, cy + 0.2, cz + 0.1, 0, 0, 0, grp);           // latch
    box(0.16, 0.035, 0.31, dark, cx - sx * 0.01, cy + 0.04, cz, 0, 0, 0, grp);     // strap round the can
    box(0.1, 0.035, 0.035, dark, sx * 0.35, cy + 0.04, cz, 0, 0, 0, grp);          // strap to the tunnel
  }
  V.lightBar = new THREE.Group(); sledBody.add(V.lightBar);
  box(0.66, 0.08, 0.1, dark, 0, 1.13, 0.98, 0.2, 0, 0, V.lightBar);
  box(0.6, 0.05, 0.04, lampMat, 0, 1.11, 1.03, 0.2, 0, 0, V.lightBar).castShadow = false;
  for (const sx of [-1, 1]) box(0.04, 0.26, 0.04, dark, sx * 0.26, 1.0, 0.94, 0.2, 0, 0, V.lightBar);   // struts to the hood
  V.raceCan = new THREE.Group(); sledBody.add(V.raceCan);
  cyl(0.09, 0.11, 0.6, chrome, 0.24, 0.6, -0.9, Math.PI / 2 - 0.1, 0, 0, V.raceCan, 12);
  cyl(0.06, 0.06, 0.12, dark, 0.24, 0.6, -1.22, Math.PI / 2 - 0.1, 0, 0, V.raceCan, 10);
  V.rackBox = new THREE.Group(); sledBody.add(V.rackBox);
  box(0.56, 0.3, 0.5, std(0x2e3742, 0.8), 0, 0.86, -1.56, 0.18, 0, 0, V.rackBox);
  box(0.58, 0.05, 0.52, body, 0, 1.02, -1.55, 0.18, 0, 0, V.rackBox);
  V.riser = new THREE.Group(); barPivot.add(V.riser);
  cyl(0.03, 0.03, 0.22, dark, 0, -0.12, 0, 0, 0, 0, V.riser, 8);
  for (const s of [-1, 1]) box(0.04, 0.16, 0.04, dark, s * 0.2, 0.08, -0.04, -0.4, 0, 0, V.riser);   // hooks

  /* ---- rider kit variants ---- */
  V.head = {};
  V.head.helmet = [helm, chin, visor, hstripe];
  const beanie = ball(0.19, accentMat, 0, 1.72, -0.4, rider, 1, 0.8, 1.0);
  const bobble = ball(0.06, accentMat, 0, 1.86, -0.4, rider);
  const face = ball(0.17, skin, 0, 1.68, -0.38, rider, 0.9, 1.0, 0.95);
  const mask = ball(0.18, std(0x1a1f26, 0.9), 0, 1.68, -0.38, rider, 0.95, 1.0, 1.0);
  const goggles = box(0.3, 0.1, 0.12, visorMat, 0, 1.73, -0.25, 0.05, 0, 0, rider);
  const gogStrap = box(0.34, 0.06, 0.3, accentMat, 0, 1.74, -0.4, 0, 0, 0, rider);
  V.head.beanie = [beanie, bobble, face, goggles, gogStrap];
  V.head.mask = [beanie, bobble, mask, goggles, gogStrap];
  V.head.heated = [helm, chin, visor, hstripe];
  V.visor = visor; V.goggles = goggles;
  V.boots = []; V.mitts = [];
  for (const s of [-1, 1]) {
    V.boots.push(box(0.18, 0.16, 0.38, std(0x2a3038, 0.85), s * 0.3, 0.44, -0.3, 0.1, 0, 0, rider));   // taller arctic boot
    V.mitts.push(box(0.15, 0.15, 0.22, glove, s * 0.32, 1.44, 0.34, 0, 0, 0, rider));                  // gauntlet mitt
  }
  /* ---- era bodywork ---- */
  const eraPart = (name, fn) => { const g = new THREE.Group(); sledBody.add(g); fn(g); g.visible = false; V[name] = g; };
  eraPart("bogies", g => {                                    // 1970s bogie wheels under an un-sprung belt
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1])
      cyl(0.13, 0.13, 0.08, dark, sx * 0.17, 0.14, -1.25 + i * 0.42, 0, 0, Math.PI / 2, g, 10);
    box(0.5, 0.05, 1.9, dark, 0, 0.3, -0.5, 0, 0, 0, g);
  });
  eraPart("chromeHoop", g => {                                // chrome hoop bumper and a round lamp pod
    cyl(0.03, 0.03, 0.9, chrome, 0, 0.72, 1.42, 0, 0, Math.PI / 2, g, 8);
    for (const sx of [-1, 1]) cyl(0.028, 0.028, 0.5, chrome, sx * 0.44, 0.6, 1.26, 1.0, 0, 0, g, 8);
    cyl(0.03, 0.03, 0.4, chrome, 0, 0.42, 1.3, Math.PI / 2, 0, 0, g, 8);
  });
  eraPart("roundLight", g => {
    cyl(0.16, 0.16, 0.1, chrome, 0, 0.92, 1.12, Math.PI / 2 - 0.2, 0, 0, g, 12);
    cyl(0.13, 0.13, 0.04, lampMat, 0, 0.93, 1.17, Math.PI / 2 - 0.2, 0, 0, g, 12).castShadow = false;
  });
  eraPart("dualLight", g => {
    for (const sx of [-1, 1]) {
      box(0.26, 0.12, 0.05, dark, sx * 0.19, 0.92, 1.1, 0.3, 0, 0, g);
      box(0.22, 0.09, 0.04, lampMat, sx * 0.19, 0.92, 1.13, 0.3, 0, 0, g).castShadow = false;
    }
  });
  eraPart("utilRack", g => {                                  // work rack over a wide tunnel
    box(0.86, 0.06, 1.0, dark, 0, 0.78, -1.3, 0, 0, 0, g);
    for (const sx of [-1, 1]) box(0.05, 0.22, 1.0, dark, sx * 0.42, 0.68, -1.3, 0, 0, 0, g);
    for (let i = 0; i < 4; i++) box(0.8, 0.04, 0.05, dark, 0, 0.82, -1.7 + i * 0.28, 0, 0, 0, g);
  });
  V.mirrors = new THREE.Group(); barPivot.add(V.mirrors); V.mirrors.visible = false;
  for (const sx of [-1, 1]) {                                  // stalks clamped to the bar ends
    cyl(0.018, 0.018, 0.26, steel, sx * 0.26, 0.12, 0.01, 0.1, 0, sx * 0.25, V.mirrors, 6);
    box(0.15, 0.11, 0.03, dark, sx * 0.31, 0.25, 0.02, 0.15, 0, 0, V.mirrors);
  }
  eraPart("twoUp", g => {                                     // touring bench with a backrest and grab rails
    box(0.46, 0.2, 1.5, black, 0, 1.0, -0.72, 0, 0, 0, g);
    ball(0.3, dark, 0, 1.06, -0.75, g, 0.74, 0.4, 2.3);
    box(0.44, 0.44, 0.12, dark, 0, 1.3, -1.35, -0.18, 0, 0, g);
    for (const sx of [-1, 1]) cyl(0.02, 0.02, 0.5, chrome, sx * 0.26, 1.12, -1.2, Math.PI / 2, 0, 0, g, 6);
  });
  eraPart("benchSeat", g => {                                 // flat vinyl bench, no bolsters
    box(0.5, 0.22, 1.4, black, 0, 1.0, -0.6, 0, 0, 0, g);
    box(0.52, 0.06, 1.42, dark, 0, 1.12, -0.6, 0, 0, 0, g);
  });
  eraPart("turboCan", g => {                                  // turbo plumbing down the right flank
    cyl(0.1, 0.12, 0.7, chrome, 0.3, 0.6, -0.7, Math.PI / 2 - 0.08, 0, 0, g, 12);
    box(0.14, 0.05, 0.1, dark, 0.28, 0.6, -0.95, 0, 0, 0, g);                    // tunnel bracket
    box(0.14, 0.05, 0.1, dark, 0.28, 0.6, -0.42, 0, 0, 0, g);
    cyl(0.07, 0.07, 0.62, dark, 0.3, 0.72, -0.14, Math.PI / 2 - 0.5, 0, 0, g, 10);  // downpipe up to the turbo
    ball(0.13, steel, 0.3, 0.86, 0.26, g, 1, 1, 1);
    cyl(0.05, 0.05, 0.3, dark, 0.22, 0.86, 0.4, Math.PI / 2 - 0.2, 0, 0, g, 8);
  });
  eraPart("spoiler", g => {
    box(0.66, 0.05, 0.22, dark, 0, 0.92, -1.5, -0.25, 0, 0, g);
    for (const sx of [-1, 1]) box(0.05, 0.3, 0.06, dark, sx * 0.3, 0.78, -1.52, -0.1, 0, 0, g);
  });
  eraPart("stripe", g => {                                    // race graphics down the hood and tunnel
    box(0.86, 0.02, 0.5, accentMat, 0, 1.06, 0.5, 0.06, 0, 0, g);
    for (const sx of [-1, 1]) box(0.02, 0.1, 0.9, accentMat, sx * 0.44, 0.78, 0.4, 0, 0, 0, g);
  });

  /* ---- what the garage and the settings change, made visible ---- */
  const fur = std(0x8a7358, 1.0), plastic = std(0x1a1f26, 0.5, 0.1),
    heatMat = std(0xff7a2a, 0.4, 0, { emissive: 0xff5a10, emissiveIntensity: 1.4 }),
    reflect = std(0xdde6ee, 0.3, 0.4, { emissive: 0x3a4652, emissiveIntensity: 0.4 }),
    springY = std(0xf2c230, 0.35, 0.6), springR = std(0xd8352a, 0.35, 0.6), gold = std(0xc9a227, 0.25, 0.8);
  V.seatMat = std(0x1a2027, 0.8);
  V.seatPad.material = V.seatMat; V.seatBolster.material = V.seatMat;
  for (const g of [V.twoUp, V.benchSeat]) if (g) g.traverse(m => { if (m.material === dark) m.material = V.seatMat; });
  // a coil spring wound round the line from a to b
  const spring = (ax, ay, az, bx, by, bz, r, turns, mat, parent) => {
    const len = Math.hypot(bx - ax, by - ay, bz - az), pts = [];
    for (let i = 0; i <= turns * 12; i++) { const t = i / (turns * 12), a = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, t * len)); }
    const g = new THREE.Group(); g.position.set(ax, ay, az); parent.add(g);
    g.lookAt(new THREE.Vector3(bx, by, bz).sub(new THREE.Vector3(ax, ay, az)).add(g.position));
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 12, 0.013, 5), mat); m.castShadow = true; g.add(m);
    return g;
  };
  const grp = (name, parent = sledBody) => { const g = new THREE.Group(); parent.add(g); g.visible = false; V[name] = g; return g; };
  // tall paddle lugs for the backcountry track
  const pad = grp("paddles", tr);
  for (let i = 0; i < 16; i++) box(0.54, 0.12, 0.045, rubber, 0, -0.02, -1.45 + i * 0.12, 0, 0, 0, pad);
  for (let i = 0; i < 5; i++) box(0.54, 0.045, 0.12, rubber, 0, 0.19 + Math.sin(i / 4 * Math.PI) * 0.2, -1.62 - Math.sin(i / 4 * Math.PI) * 0.02 + (i - 2) * 0.0, 0, 0, 0, pad);
  // hard-pack track: short sharp lugs with a chevron centre
  const hp = grp("hardpack", tr);
  for (let i = 0; i < 16; i++) for (const sx of [-1, 1]) box(0.24, 0.04, 0.05, rubber, sx * 0.12, 0.0, -1.43 + i * 0.12, 0, sx * 0.35, 0, hp);
  // suspension: coilovers front and rear
  for (const [name, mat, r, turns, res] of [["coilKit", springY, 0.075, 6, false], ["longKit", springR, 0.085, 8, true]]) {
    const g = grp(name);
    for (const s of [-1, 1]) {
      spring(s * 0.28, 0.84, 0.81, s * 0.43, 0.42, 0.91, r, turns, mat, g);
      if (res) { cyl(0.045, 0.045, 0.24, gold, s * 0.2, 0.86, 0.72, 0.4, 0, s * 0.4, g, 10); limb(0.012, s * 0.2, 0.9, 0.74, s * 0.28, 0.84, 0.81, dark, g); }
    }
    const rg = grp(name + "Rear", tr);
    spring(0, 0.33, -1.095, 0, 0.68, -0.905, r * 1.1, turns, mat, rg);
    if (res) cyl(0.05, 0.05, 0.3, gold, 0.1, 0.55, -1.02, 0.5, 0, 0, rg, 10);
  }
  // clutch cover on the left flank (helix kit shows its spring through the vent)
  const cl = grp("clutchKit");
  box(0.04, 0.34, 0.46, dark, -0.47, 0.72, 0.5, 0, 0, 0, cl);
  cyl(0.13, 0.13, 0.05, black, -0.49, 0.72, 0.5, 0, 0, Math.PI / 2, cl, 16);
  spring(-0.5, 0.72, 0.5, -0.56, 0.72, 0.5, 0.08, 3, springR, cl);
  // hood scoop that rides on whatever hood the sled has
  const hs = grp("hoodScoop");
  box(0.34, 0.08, 0.34, dark, 0, 0.03, 0, 0.12, 0, 0, hs);
  box(0.28, 0.05, 0.03, black, 0, 0.05, 0.17, 0.12, 0, 0, hs);
  for (let i = 0; i < 3; i++) box(0.24, 0.012, 0.012, chrome, 0, 0.035 + i * 0.018, 0.186, 0.12, 0, 0, hs);
  const tb = grp("turboScoop");
  box(0.52, 0.1, 0.4, black, 0, 0.04, 0, 0.1, 0, 0, tb);
  for (const sx of [-1, 1]) box(0.18, 0.06, 0.03, springR, sx * 0.13, 0.07, 0.2, 0.1, 0, 0, tb);
  box(0.4, 0.02, 0.3, std(0x2e3742, 0.4, 0.5), 0, 0.1, -0.02, 0.1, 0, 0, tb);   // intercooler grille
  // trail can: a short can with a chrome tip under the right running board
  const tc2 = grp("trailCan");
  cyl(0.075, 0.08, 0.34, dark, 0.26, 0.56, -0.75, Math.PI / 2 - 0.1, 0, 0, tc2, 12);
  cyl(0.045, 0.045, 0.08, chrome, 0.26, 0.54, -0.95, Math.PI / 2 - 0.1, 0, 0, tc2, 10);
  if (V.raceCan) { cyl(0.12, 0.12, 0.34, std(0x9a8a6a, 0.3, 0.7), 0.24, 0.62, -0.84, Math.PI / 2 - 0.1, 0, 0, V.raceCan, 12, ); }
  // rider kit extras
  V.furCollar = ball(0.19, fur, 0, 1.56, -0.5, rider, 1.15, 0.55, 1.05);
  V.reflect = [];
  for (const s of [-1, 1]) {
    V.reflect.push(box(0.2, 0.04, 0.2, reflect, s * 0.28, 0.62, -0.2, 0.6, 0, 0, rider));   // shin band
    V.reflect.push(box(0.1, 0.05, 0.12, reflect, s * 0.31, 1.3, 0.1, 0, 0, 0, rider));      // forearm band
  }
  V.kneePads = [];
  for (const s of [-1, 1]) V.kneePads.push(box(0.17, 0.2, 0.08, plastic, s * 0.27, 0.74, -0.03, -0.5, 0, 0, rider));
  V.bootCuff = [];
  for (const s of [-1, 1]) V.bootCuff.push(ball(0.12, fur, s * 0.3, 0.56, -0.26, rider, 1, 0.5, 1.1));
  V.heatBand = [];
  for (const s of [-1, 1]) V.heatBand.push(box(0.16, 0.04, 0.05, heatMat, s * 0.32, 1.44, 0.24, 0, 0, 0, rider));
  V.heatVisor = box(0.3, 0.015, 0.02, heatMat, 0, 1.79, -0.2, 0.05, 0, 0, rider);
  // sled graphics: bands laid on the hood shell (so they follow its shape) and side flashes
  const band = (off, w) => {
    const g = new THREE.SphereGeometry(0.528, 28, 2, 1.25, 2.75, Math.PI / 2 + off - w, 2 * w); g.rotateZ(Math.PI / 2);
    const m = new THREE.Mesh(g, accentMat); m.castShadow = false; V.hood.add(m); return m;
  };
  V.decal = { stripe: [band(0.13, 0.05), band(-0.13, 0.05)], wide: [band(0, 0.14)], flash: [] };
  for (const s of [-1, 1]) {
    V.decal.flash.push(box(0.012, 0.07, 1.3, accentMat, s * 0.338, 0.56, -0.6, 0, 0, 0));
    V.decal.flash.push(box(0.012, 0.035, 0.7, accentMat, s * 0.338, 0.47, -0.35, 0.12, 0, 0));
  }
  V.decal.wide.push(box(0.2, 0.012, 1.2, accentMat, 0, 0.67, -1.0, 0, 0, 0));
  V.headAll = [helm, chin, visor, hstripe, beanie, bobble, face, mask, goggles, gogStrap, V.heatVisor, neck];
  V.rider = rider;
})();

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

/* ---------------- input ---------------- */
const keys = new Set();
const input = { thr: 0, brk: 0, steer: 0, lean: 0, hop: false, wheelie: 0 };
let camMode = 0, muted = false;
const VIEWS = [{ n: "Chase", d: 7.8, h: 3.2, f: 60 }, { n: "Close chase", d: 4.6, h: 2.0, f: 62 }, { n: "First person", fp: true, f: 78 }, { n: "Drone", d: 16, h: 9, f: 52 }];
addEventListener("keydown", e => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code) || (started && e.ctrlKey && !e.metaKey)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (!started) return;
  if (e.code === "Space") input.hop = true;
  if (e.code === "KeyR") resetSled();
  if (e.code === "KeyV" || e.code === "KeyC") cycleView();
  if (e.code === "KeyM") toggleBigMap();
  if (e.code === "KeyH") $("help").hidden = !$("help").hidden;
  gameKey(e);
});
addEventListener("keyup", e => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
let padHop = false, padReset = false, padView = false, padGod = false;
function cycleView() { camMode = (camMode + 1) % VIEWS.length; camState.init = false; toast(VIEWS[camMode].n + " view"); }
function readInput(dt) {
  let thr = (keys.has("KeyW") || keys.has("ArrowUp")) ? 1 : 0, brk = (keys.has("KeyS") || keys.has("ArrowDown")) ? 1 : 0;
  let st = ((keys.has("KeyD") || keys.has("ArrowRight")) ? 1 : 0) - ((keys.has("KeyA") || keys.has("ArrowLeft")) ? 1 : 0);
  let lean = (keys.has("ShiftLeft") || keys.has("ShiftRight")) ? 1 : 0, analog = null, wh = (keys.has("ControlLeft") || keys.has("ControlRight")) ? 1 : 0;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp) continue;
    const ax = gp.axes[0] || 0; if (Math.abs(ax) > 0.12) analog = ax;
    thr = Math.max(thr, gp.buttons[7] ? gp.buttons[7].value : 0); brk = Math.max(brk, gp.buttons[6] ? gp.buttons[6].value : 0);
    if (gp.buttons[5] && gp.buttons[5].pressed) lean = 1;
    if (gp.buttons[2] && gp.buttons[2].pressed) wh = 1;
    const h = gp.buttons[0] && gp.buttons[0].pressed; if (h && !padHop && started && !godOpen) input.hop = true; padHop = h;
    const y = gp.buttons[3] && gp.buttons[3].pressed; if (y && !padGod && started) toggleGod(); padGod = y;
    if (godOpen) { godPad(gp, dt); analog = null; }
    const r = gp.buttons[8] && gp.buttons[8].pressed; if (r && !padReset && started) resetSled(); padReset = r;
    const v = gp.buttons[11] && gp.buttons[11].pressed; if (v && !padView && started) cycleView(); padView = v;
    break;
  }
  input.wheelie = wh; if (wh) thr = Math.max(thr, 1);
  input.thr = thr; input.brk = brk; input.lean = lean;
  if (analog !== null) input.steer = analog;
  else input.steer += (st - input.steer) * (1 - Math.exp(-(st === 0 ? 9 : 5) * dt));
}

/* ---------------- physics ---------------- */
const MASS = 280; let G = 15.5;
const P = { x: SPAWN.x, y: 0, z: SPAWN.z, vx: 0, vy: 0, vz: 0, yaw: SPAWN.yaw, yr: 0, pitch: 0, roll: 0, odo: 0, rut: 0, airP: 0, airR: 0, airPV: 0, airRV: 0, airT: 0, airPeak: 0, launched: 0, wh: 0, whVis: 0, whRun: 0, whBest: 0, rock: 0, dumped: 0, gnd: true, pack: 0, ice: false, exc: 0, drag: 0, shake: 0, dist: 0, stuckT: 0, safe: null, rpm: 0.15 };
function resetSled() {
  const s = P.safe || { x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw };
  P.x = s.x; P.z = s.z; P.yaw = s.yaw; P.vx = P.vy = P.vz = 0; P.yr = 0; P.pitch = P.roll = 0;
  P.y = surf(P.x, P.z) + 0.4; P.stuckT = 0; towSnap();
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
  trailer: { len: 2.75, r: 0.8, mass: 70, w: 1.05, tip: 0.8 },
  flatbed: { len: 3.2, r: 0.95, mass: 125, w: 1.35, tip: 0.95 }
};
const TOW = { kind: null, x: 0, z: 0, y: 0, yaw: 0, spd: 0, yr: 0, roll: 0, mass: 0, drag: 0, tipT: 0, tipDir: 1, hitT: 0, score: 0, maxScore: 0, vis: {}, vkind: null, pitchV: 0, rollV: 0 };
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
}
function towStep(dt) {
  const kind = GS.own.parts.hitch, H = HITCH[kind];
  if (!H) { TOW.kind = null; TOW.mass = 0; TOW.drag = 0; return; }
  if (TOW.kind !== kind) { TOW.kind = kind; towSnap(); }
  const [hx, hz] = hitchPt();
  let tx = TOW.x, tz = TOW.z;
  // side-hill: nothing brakes a trailer sideways, so it creeps downhill while it moves
  if (TOW.spd > 0.5) {
    const e = 1, gx = (smoothSurf(tx + e, tz) - smoothSurf(tx - e, tz)) / (2 * e), gz = (smoothSurf(tx, tz + e) - smoothSurf(tx, tz - e)) / (2 * e);
    const gm = Math.hypot(gx, gz), steep = Math.max(0, gm - 0.22) / (gm || 1);   // only a real side-hill
    const creep = (kind === "groomer" ? 0.8 : 2.2) * steep * Math.min(1, TOW.spd / 6);
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
  if (TOW.ghostT <= 0) for (let j = gzi - 1; j <= gzi + 1; j++) for (let i = gxi - 1; i <= gxi + 1; i++) {
    const a = obGrid.get(j * 512 + i); if (!a) continue;
    for (const o of a) {
      if (TOW.y > o.top - 0.1) continue;
      const ox = tx - o.x, oz = tz - o.z, o2 = ox * ox + oz * oz, rr = H.r + o.r;
      if (o2 >= rr * rr || o2 < 1e-6) continue;
      const od = Math.sqrt(o2), nx = ox / od, nz = oz / od;
      tx += nx * (rr - od); tz += nz * (rr - od); snag = true;
      const vin = -(vx0 * nx + vz0 * nz);
      if (o.tree !== undefined) { wobble(o, 0.05 + Math.max(0, vin) * 0.012, -ox, -oz); if (o.snowy && vin > 3) dropSnow(o, false); }
      if (vin > 3 && TOW.hitT <= 0) {
        TOW.hitT = 0.6; thud(Math.min(0.9, vin / 18)); P.shake = Math.max(P.shake, Math.min(0.5, vin / 24));
        P.vx *= 0.72; P.vz *= 0.72;
        bigHit(clamp((vin - 3) * 3.2, 3, 26), o.tree !== undefined ? (kind === "groomer" ? "Groomer clipped a tree." : "Trailer clipped a tree.") : (kind === "groomer" ? "Groomer hit rock." : "Trailer slammed into rock."));
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
  const fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, hw = H.w / 2;
  TOW.y = surf(tx, tz);
  const hL = surf(tx + lx * hw, tz + lz * hw), hR = surf(tx - lx * hw, tz - lz * hw);
  TOW.roll = Math.atan2(hL - hR, H.w);
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
  TOW.drag = moving * clamp(TOW.spd / 5, 0.25, 1) * (kind === "groomer" ? 260 + 1500 * loose : loose * (180 + TOW.mass * 1.6)) + (TOW.tipT > 0 ? 2600 : 0);
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
    if (kind === "groomer") {
      groomStamp(tx, tz, fx, fz, H.w);
      if (GS.groomJob) groomProgress(tx, tz);
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
  const fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, half = kind === "flatbed" ? 1.4 : kind === "trailer" ? 1.0 : 0.45, hw = H.w / 2;
  const pT = Math.atan2(surf(x + fx * half, z + fz * half) - surf(x - fx * half, z - fz * half), half * 2);
  let rT = Math.atan2(surf(x + lx * hw, z + lz * hw) - surf(x - lx * hw, z - lz * hw), H.w);
  const k = 1 - Math.exp(-12 * dt);
  TOW.pitchV += (pT - TOW.pitchV) * k; TOW.rollV += (rT - TOW.rollV) * k;
  let tipR = 0, tipY = 0;
  if (TOW.tipT > 0 && kind === TOW.kind) { const t = 2.4 - TOW.tipT, e = t < 0.25 ? t / 0.25 : TOW.tipT < 0.5 ? TOW.tipT / 0.5 : 1; tipR = TOW.tipDir * 1.45 * e; tipY = 0.35 * e; }
  g.position.set(x, surf(x, z) - 0.02 + tipY, z);
  g.rotation.set(-TOW.pitchV, yaw, TOW.rollV + tipR, "YXZ");
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
  treeMesh.setMatrixAt(o.tree, _m); if (o.snowy) capMesh.setMatrixAt(o.tree, _m);
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
  capMesh.setMatrixAt(o.tree, ZERO_M); capMesh.instanceMatrix.needsUpdate = true;
  const n = Math.round(160 + o.s * 180);
  for (let k = 0; k < n; k++) {
    const t = Math.random(), hh = o.y + (2.4 + t * 4.8) * o.s, rad = (1.8 - t * 1.25) * o.s * Math.sqrt(Math.random()), a = Math.random() * 6.283;
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
function collide(fx, fz) {
  const spdNow = Math.hypot(P.vx, P.vz);
  for (const [off, r] of [[1.15, 0.62], [-0.7, 0.7]]) {
    const cx = P.x + fx * off, cz = P.z + fz * off;
    const gx = Math.floor((cx + HALF) / OBC), gz = Math.floor((cz + HALF) / OBC);
    for (let j = gz - 1; j <= gz + 1; j++) for (let i = gx - 1; i <= gx + 1; i++) {
      const a = obGrid.get(j * 512 + i); if (!a) continue;
      for (const o of a) {
        if (P.y > o.top - 0.12) continue;
        const dx = cx - o.x, dz = cz - o.z, d2 = dx * dx + dz * dz, rr = r + o.r;
        if (o.tree !== undefined && spdNow > 4.5) { const br = r + 1.15 * o.s; if (d2 < br * br) { wobble(o, 0.05 + spdNow * 0.004, -dx, -dz); if (o.snowy) dropSnow(o, false); } }
        if (d2 >= rr * rr || d2 < 1e-6) continue;
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
  const lim = HALF - 24; P.x = clamp(P.x, -lim, lim); P.z = clamp(P.z, -lim, lim);
}
let sprayAcc = 0;
function physStep(dt) {
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), lx = fz, lz = -fx;
  const hs = surf(P.x, P.z), gnd = P.y <= hs + 0.12;
  const e = 0.8, gx = (smoothSurf(P.x + e, P.z) - smoothSurf(P.x - e, P.z)) / (2 * e), gz = (smoothSurf(P.x, P.z + e) - smoothSurf(P.x, P.z - e)) / (2 * e);
  let vx = P.vx, vz = P.vz;
  const vf = vx * fx + vz * fz;
  const exc = plough(fx, fz, lx, lz);
  const fr = freshAt(Math.round((P.x + HALF) / CELL), Math.round((P.z + HALF) / CELL));
  P.ice = bioAt(P.x, P.z) === 1 && fr < 0.12;
  // only very steep bare rock matters: the sled loses its footing and slides down the mountain
  P.rock = P.ice ? 0 : (1 - sstep(0.05, 0.16, fr)) * sstep(0.7, 0.95, Math.hypot(gx, gz));
  P.exc = exc;
  // steering
  const spf = clamp(Math.abs(vf) / 5, 0, 1) / (1 + Math.abs(vf) / 45);
  // wheelie: skis come up off the snow, track does all the work
  const thrE = GS.fuel > 0 && !GS.dead ? input.thr : 0;
  const M = MASS + TOW.mass;                                         // a loaded trailer is weight the engine has to haul
  if (started && !GS.dead) GS.fuel = Math.max(0, GS.fuel - (0.003 + thrE * (0.018 + 0.3 * exc + TOW.drag / 9000) * ST.burn * (1 + TOW.mass / 900)) * dt);
  const whOn = input.wheelie && GS.fuel > 0 && (gnd ? Math.abs(vf) > 2.5 : P.wh > 0.3);
  P.wh = clamp(P.wh + (whOn ? 2.4 : -3.2) * dt, 0, 1);
  if (P.wh > 0.7 && gnd) { P.whRun += Math.abs(vf) * dt; if (P.whRun > P.whBest) P.whBest = P.whRun; }
  else if (P.wh < 0.2) P.whRun = 0;
  const tgt = -input.steer * (1.7 + input.lean * 0.75) * lerp(1, 0.32, P.wh) * spf * (vf < -0.3 ? -1 : 1);
  if (gnd) P.yr += (tgt - P.yr) * (1 - Math.exp(-7 * dt));
  else P.yr *= Math.exp(-1.5 * dt);                                   // no steering in the air, spin just bleeds off
  const dyaw = P.yr * dt; P.yaw += dyaw;
  if (gnd) {
    const share = (P.ice ? 0.35 : 0.9) * (1 - 0.7 * P.rock), a = dyaw * share, ca = Math.cos(a), sa = Math.sin(a);
    const nvx = vx * ca + vz * sa, nvz = vz * ca - vx * sa; vx = nvx; vz = nvz;
    const g2 = gx * gx + gz * gz; vx -= G * gx / (1 + g2) * dt; vz -= G * gz / (1 + g2) * dt;
    let F = 0;
    const grade = clamp(gx * fx + gz * fz, 0, 0.7);              // uphill component under the skis
    const climb = Math.min(2.4, 1 + grade * 5.0);                              // low gear: grunt on a climb, same top speed on the flat
    if (thrE > 0) F += Math.min(3600 * ST.power * climb, 47000 * ST.power * climb / Math.max(Math.abs(vf), 1)) * thrE * (1 - 0.9 * P.rock);
    if (input.brk > 0) F -= (vf > 0.6 ? 4200 : 1100) * input.brk;
    vx += F / M * fx * dt; vz += F / M * fz * dt;
    const sp = Math.hypot(vx, vz);
    P.drag = 5600 * exc * ST.drag;
    const Fs = P.drag + TOW.drag + (P.ice ? 140 : lerp(260, 60, P.rock)) + 0.9 * sp * sp;
    if (sp > 0.01) { const dv = Math.min(sp, Fs / M * dt); vx -= vx / sp * dv; vz -= vz / sp * dv; }
    const grip = lerp(P.ice ? 1.2 + ST.grip * 0.35 : lerp(5.5, 9.5, P.pack) + ST.grip, 0.8, P.rock) * lerp(1, 0.75, P.wh);
    // ruts: a packed trail is a groove, and the sled settles into it unless you steer out
    let rut = 0;
    if (!P.ice) {
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
    sprayAcc += (exc * 60 + 0.4 + (P.ice ? 0 : Math.abs(vl) * 0.8)) * Math.min(spd, 30) * dt * (P.ice ? 0.3 : 1);
    while (sprayAcc > 1) {
      sprayAcc -= 1;
      const side = (Math.random() - 0.5) * 0.5;
      emit(P.x - fx * 1.6 + lx * side, P.y + 0.15, P.z - fz * 1.6 + lz * side, -fx * spd * 0.25 + vx * 0.3, 1.5 + spd * 0.12 + exc * 6, -fz * spd * 0.25 + vz * 0.3, 1.6 + exc * 4);
      if (exc > 0.05 && Math.random() < 0.5) { const s = Math.random() < 0.5 ? -0.6 : 0.6; emit(P.x + fx * 1.9 + lx * s, P.y + 0.1, P.z + fz * 1.9 + lz * s, vx * 0.6 + lx * s * 3, 1.2 + exc * 5, vz * 0.6 + lz * s * 3, 1.4); }
    }
  } else P.drag *= 0.9;
  if (gnd && input.hop) { P.vy = (vx * gx + vz * gz) + 6.5; P.y += 0.14; }
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
  if (gnd) { stamp(fx, fz, lx, lz, Math.min(1, Math.abs(P.yr) * Math.hypot(vx, vz) / 8)); markTrail(P.x, P.z); }
  const hs2 = surf(P.x, P.z), sv = vx * gx + vz * gz;
  const impact = Math.max(0, sv - P.vy);
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
      if (impact > 7) { cargoHit(impact * 0.7); crater(P.x, P.z, Math.min(0.45, impact * 0.04)); thud(Math.min(1, impact / 16)); }
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
    audio = { AC, master, o1, o2, o2g, lp, eg, hiss, wind, buf };
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
  audio.hiss.b.frequency.setTargetAtTime(P.ice ? 2600 : 1000, t, 0.2);
  audio.wind.g.gain.setTargetAtTime(0.05 + Math.min(0.3, spd / 45 * 0.3), t, 0.2);
}

/* ---------------- minimap: circular, heading-up, shaded relief ---------------- */
const mapC = $("map"), mctx = mapC.getContext("2d"), MS = mapC.width;
const MB = 768, MZOOM = 620;                       // relief canvas resolution, and metres across the dial
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
    const alt = clamp(h / 320, 0, 1);                 // valleys cool and dim, ridges bright white
    let r = lerp(198, 255, alt) * shade, gg = lerp(214, 255, alt) * shade, bl = lerp(236, 255, alt) * shade;
    if (b === 1) { r = 120 * shade; gg = 176 * shade; bl = 214 * shade; }
    else if (b === 2) { r *= 0.66; gg *= 0.82; bl *= 0.72; }
    else if (sampleG(freshG, x, z) < 0.12) { r *= 0.5; gg *= 0.49; bl *= 0.5; }
    const band = h % 40;                              // 40 m contour lines for depth
    if (band < st * Math.hypot(hx, hz) * 1.2 && h > 8 && b !== 1) { r *= 0.86; gg *= 0.86; bl *= 0.88; }
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
    mctx.fillStyle = "#0d1822"; mctx.fillRect(sx - 6, sz - 6, 12, 12);
    mctx.fillStyle = s === depot ? "#7fc8e0" : "#eaf2f8";
    if (edge) { mctx.globalAlpha = 0.65; mctx.fillRect(sx - 3, sz - 3, 6, 6); mctx.globalAlpha = 1; }
    else mctx.fillRect(sx - 4, sz - 4, 8, 8);
    if (tg) { mctx.strokeStyle = "#ff5a1f"; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(sx, sz, 11 + Math.sin(performance.now() * 0.006) * 2, 0, 6.283); mctx.stroke(); }
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
    const [sx, sz] = w2(s.x, s.z), tg = GS.load.some(j => j.dest === s) || (GS.groomJob && GS.groomJob.dest === s);
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
    const hF = surf(P.x + fx * 1.3, P.z + fz * 1.3), hR = surf(P.x - fx * 1.2, P.z - fz * 1.2);
    const hL = surf(P.x + lx * 0.6 + fx * 0.4, P.z + lz * 0.6 + fz * 0.4), hRt = surf(P.x - lx * 0.6 + fx * 0.4, P.z - lz * 0.6 + fz * 0.4);
    pT = Math.atan2(hF - hR, 2.5) + input.thr * 0.05 * (1 - clamp(spd / 20, 0, 1)) + P.exc * 0.25;
    rT = Math.atan2(hL - hRt, 1.2);
  } else { pT = Math.atan2(P.vy, Math.max(spd, 1)) * 0.35 + P.airP; rT = P.airR; }
  const whT = P.wh * (0.52 + Math.sin(performance.now() * 0.0061) * 0.05 + Math.sin(performance.now() * 0.017) * 0.02);
  P.whVis += (whT - P.whVis) * (1 - Math.exp(-(whT > P.whVis ? 6 : 9) * dt));
  pT += P.whVis;
  const k = 1 - Math.exp(-(P.gnd ? 12 : 3) * dt);
  P.pitch += (pT - P.pitch) * k; P.roll += (rT - P.roll) * k;
  const lean = input.steer * (0.1 + input.lean * 0.1) * clamp(spd / 15, 0, 1);
  sledRoot.position.set(P.x, P.y + 1.5 * Math.sin(Math.max(0, P.whVis)), P.z);
  sledRoot.rotation.set(-P.pitch, P.yaw, P.roll);
  sledBody.rotation.z += (lean - sledBody.rotation.z) * (1 - Math.exp(-8 * dt));
  const skiT = -input.steer * 0.36, kS = 1 - Math.exp(-14 * dt);
  for (const pv of skiPivots) pv.rotation.y += (skiT - pv.rotation.y) * kS;
  barPivot.rotation.y += (skiT * 0.7 - barPivot.rotation.y) * kS;
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
  const view = VIEWS[camMode];
  const velYaw = spd > 3 ? Math.atan2(P.vx, P.vz) : P.yaw;
  camState.yaw = angLerp(camState.yaw, angLerp(P.yaw, velYaw, 0.35), 1 - Math.exp(-3.5 * dt));
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
    camera.position.y = Math.max(camera.position.y, surf(camera.position.x, camera.position.z) + 0.45);
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
    const want = _camWant.set(P.x - cfx * (view.d + td), P.y + view.h + td * 0.4, P.z - cfz * (view.d + td));
    want.y = Math.max(want.y, surf(want.x, want.z) + 1.3);
    if (!camState.init) { camera.position.copy(want); camState.init = true; }
    else camera.position.lerp(want, 1 - Math.exp(-6 * dt));
    camera.position.y = Math.max(camera.position.y, surf(camera.position.x, camera.position.z) + 1.0);
    look = _camAim.set(P.x + cfx * 4, P.y + 1.1, P.z + cfz * 4);
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
    camera.position.set(cx, Math.max(P.y + 1.75 + SR.rig * 0.25, surf(cx, cz) + 1.0), cz);
    let fx2 = ox - cx, fz2 = oz - cz; const fl = Math.hypot(fx2, fz2) || 1; fx2 /= fl; fz2 /= fl;
    const push = innerWidth >= 900 ? 1.7 + SR.rig * 0.25 : 0;           // panel sits on the right, so frame the sled left of centre
    camera.lookAt(ox - fz2 * push, P.y + 0.85, oz + fx2 * push);
    if (Math.abs(camera.fov - 50) > 0.05) { camera.fov = 50; camera.updateProjectionMatrix(); }
  } else if (SR.on) { SR.on = false; camState.init = false; document.body.classList.remove("showroom"); $("srHint").hidden = true; PV.sled = PV.cat = PV.slot = null; applyLoadout(); }
  const fov = view.f + Math.min(16, spd * 0.4);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * (1 - Math.exp(-3 * dt)); camera.updateProjectionMatrix(); }
  sky.position.copy(camera.position);
  sun.position.set(P.x + sunDir.x * 200, P.y + sunDir.y * 200, P.z + sunDir.z * 200); sun.target.position.set(P.x, P.y, P.z);
  // recenter the fine snow patch
  const pcx = (pox + PHALF) * CELL - HALF, pcz = (poz + PHALF) * CELL - HALF;
  if (Math.abs(P.x - pcx) > 10 || Math.abs(P.z - pcz) > 10) recenter(P.x, P.z, false);
  // stuck/flip hint + safe spot
  if (started) {
    const tipped = Math.abs(P.roll) > 0.9 || Math.abs(P.pitch) > 1.0;
    P.stuckT = (tipped || (input.thr > 0 && spd < 0.6)) ? P.stuckT + dt : 0;
    $("flip").hidden = P.stuckT < 2.5;
    safeT += dt;
    if (safeT > 2 && P.gnd && spd > 3 && !tipped) { P.safe = { x: P.x - fx * 4, z: P.z - fz * 4, yaw: P.yaw }; safeT = 0; }
  }
  return spd;
}
function updHud(spd) {
  $("spd").textContent = Math.round(spd * 2.237);
  const stt = P.ice ? "ICE" : (P.pack > 0.62 ? "PACKED" : "POWDER");
  const pill = $("pill"); if (pill.dataset.s !== stt) { pill.dataset.s = stt; pill.textContent = stt; }
  $("bonus").textContent = P.rut > 0.5 && P.pack > 0.5 && P.wh < 0.5 ? "In the groove" : P.wh > 0.7 ? "Wheelie " + Math.round(P.whRun) + " m" + (P.whBest > 5 ? " · best " + Math.round(P.whBest) : "") : P.dumped > 0 ? "Snow dump!" : stt === "PACKED" ? "On your tracks" : (stt === "ICE" ? "Low grip" : (P.exc > 0.2 ? "Breaking trail" : ""));
  $("dragFill").style.width = clamp((P.drag + TOW.drag) / 2600 * 100, 0, 100) + "%";
  $("dragN").textContent = Math.round(P.drag + TOW.drag) + " N";
  const b = bioAt(P.x, P.z), h = groundAt(P.x, P.z);
  $("zoneName").textContent = b === 1 ? "FROZEN LAKE" : (h > 120 ? "HIGH COUNTRY" : (b === 2 ? "BOREAL FOREST" : "OPEN BACKCOUNTRY"));
  $("elev").textContent = "Elev " + Math.round(h * 3 + 180) + " m";
  $("dist").textContent = (P.dist / 1000).toFixed(1) + " km";
}

/* ---------------- courier survival layer ---------------- */
const GAMEHOUR = 30;                       // real seconds per in-game hour (a full day is 12 minutes)
const GS = {
  cash: 0, fuel: 18, cap: 18, warmth: 100, hour: 7.4, load: [], jobs: [], delivered: 0,
  storm: 0, stormT: 170, stormPhase: "calm", warned: false, boardOpen: false, garageOpen: false, dead: false, near: null, own: null, kitWarned: false,
  outWarned: false, coldWarned: false, lowWarned: false, smokeT: 0, fadeT: 0
};
const GOD = { fuel: false, warm: false, turbo: false, lowg: false, freeze: false };
const SITES = [
  { id: "depot", name: "Hollis Ranger Station", seed: [-40, 420], type: "depot" },
  { id: "garage", name: "Hollis Sled & Service", seed: null, type: "shop" },
  { id: "loon", name: "Loon Shore Cabin", seed: [760, 1080], type: "cabin" },
  { id: "deadfall", name: "Deadfall Cabin", seed: [-1300, 900], type: "cabin" },
  { id: "frost", name: "Frost Hollow Hut", seed: [1340, 260], type: "cabin" },
  { id: "ridge", name: "Ridgeback Hut", seed: [-560, -760], type: "cabin" },
  { id: "spruce", name: "Spruce Creek Camp", seed: [420, 1720], type: "cabin" },
  { id: "granite", name: "Granite Bend Cabin", seed: [-1680, -180], type: "cabin" },
  { id: "relay", name: "Summit Relay", seed: null, type: "relay" }
];
let depot = SITES[0], garageSite = SITES[1];
const CARGO = [
  ["Propane tanks", 1, false], ["Groceries", 0.9, false], ["Chainsaw parts", 1, false], ["Radio batteries", 1.05, false],
  ["First-aid kit", 1.25, true], ["Two dozen eggs", 0.85, true], ["Stove glass", 1.2, true], ["Mail sack", 0.8, false],
  ["Snowshoes", 0.9, false], ["Generator coil", 1.15, true]
];
const BACKHAUL = ["Outgoing mail", "Empty propane tanks", "Trail report", "Broken radio", "Pelts for trade"];
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
    if (Math.abs(x) > 1960 || Math.abs(z) > 1960) continue;
    if (bioAt(x, z) === 1 || bioAt(x - 11, z) === 1) continue;
    const sc = slopeAt(x, z, 6) + slopeAt(x - 11, z, 6) + r * 0.0015;
    if (sc < bs) { bs = sc; best = [x, z]; }
  }
  return best;
}
function computeSites() {
  for (const s of SITES) {
    if (s.type === "shop") continue;
    if (s.type === "relay") {
      let best = null, bh = -1e9;
      for (let z = -1500; z <= -880; z += 16) for (let x = -1300; x <= 1300; x += 16) {
        const h = groundAt(x, z); if (h < bh || slopeAt(x, z, 6) > 0.3 || slopeAt(x - 11, z, 6) > 0.35) continue;
        bh = h; best = [x, z];
      }
      s.x = best[0]; s.z = best[1];
    } else { const p = flatSpot(s.seed[0], s.seed[1], 80); s.x = p[0]; s.z = p[1]; }
    s.y = groundAt(s.x, s.z);
  }
  depot = SITES[0]; garageSite = SITES[1];
  const gp = flatSpot(depot.x + 34, depot.z + 4, 18);
  garageSite.x = gp[0]; garageSite.z = gp[1]; garageSite.y = groundAt(gp[0], gp[1]);
  SPAWN.x = depot.x; SPAWN.z = depot.z + 6; SPAWN.yaw = Math.PI;
}
function nearSite(x, z, r) {
  if (depot.x !== undefined && Math.hypot(x - depot.x, z - depot.z) < 78) return true;   // the town keeps its own clearing
  return SITES.some(s => s.x !== undefined && (Math.hypot(x - s.x, z - s.z) < r || Math.hypot(x - s.x + 11, z - s.z) < r));
}

const beaconGeo = new THREE.CylinderGeometry(2.2, 2.2, 1000, 16, 1, true);
function buildSites() {
  const L = c => new THREE.MeshLambertMaterial({ color: c });
  const wood = L(0x5b3d29), woodD = L(0x3a271b), snowM = L(0xf3f7fc), stone = L(0x6b6c70), doorM = L(0x2a1b12), pumpM = L(0xc23a22), metal = L(0x8d99a6);
  const glow = new THREE.MeshBasicMaterial({ color: 0xffc26b });
  const add = (g, geo, mat, x, y, z, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.z = rz; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  for (const s of SITES) {
    if (s.type === "shop") { s.beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ visible: false })); s.beacon.visible = false; continue; }
    const g = new THREE.Group(), bx = s.x - 11, bz = s.z;
    g.position.set(bx, groundAt(bx, bz) - 0.3, bz);
    if (s.type === "relay") {
      add(g, new THREE.BoxGeometry(3, 2.4, 3), metal, 0, 1.2, 0);
      add(g, new THREE.BoxGeometry(3.3, 0.35, 3.3), snowM, 0, 2.55, 0);
      for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) add(g, new THREE.BoxGeometry(0.12, 24, 0.12), metal, 4 + dx, 12, dz);
      for (let yy = 3; yy < 24; yy += 3) add(g, new THREE.BoxGeometry(1.1, 0.08, 1.1), metal, 4, yy, 0);
      s.blink = add(g, new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3020 }), 4, 24.3, 0);
      addOb({ x: bx, z: bz, r: 2.2, top: 1e9 }); addOb({ x: bx + 4, z: bz, r: 0.9, top: 1e9 });
    } else {
      const big = s.type === "depot", D = big ? 8 : 5.5, W = big ? 10 : 6.5, Hh = big ? 3.4 : 2.7, a = 0.58, hs = D / 2 + 0.5, Ls = hs / Math.cos(a);
      add(g, new THREE.BoxGeometry(D, Hh, W), wood, 0, Hh / 2, 0);
      for (let yy = 0.35; yy < Hh; yy += 0.45) add(g, new THREE.BoxGeometry(D + 0.08, 0.06, W + 0.08), woodD, 0, yy, 0);
      const tri = new THREE.Shape(); tri.moveTo(-D / 2, 0); tri.lineTo(D / 2, 0); tri.lineTo(0, (D / 2) * Math.tan(a)); tri.closePath();
      const gable = new THREE.ExtrudeGeometry(tri, { depth: W, bevelEnabled: false }); gable.translate(0, 0, -W / 2);
      add(g, gable, wood, 0, Hh, 0);
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
        add(g, new THREE.BoxGeometry(0.7, 1.7, 0.6), pumpM, D / 2 + 5.5, 0.85, W / 2 - 1);
        add(g, new THREE.BoxGeometry(0.8, 0.12, 0.7), snowM, D / 2 + 5.5, 1.76, W / 2 - 1);
        add(g, new THREE.BoxGeometry(0.15, 2.6, 0.15), woodD, D / 2 + 2.5, 1.3, -W / 2 - 1.5);
        add(g, new THREE.BoxGeometry(0.12, 1.0, 2.6), L(0x2f5a3a), D / 2 + 2.5, 2.4, -W / 2 - 1.5);
        addOb({ x: bx + D / 2 + 5.5, z: bz + W / 2 - 1, r: 0.6, top: 1e9 });
      }
      for (let u = -D / 2 + 1.3; u <= D / 2 - 1.2; u += 1.9) for (let v = -W / 2 + 1.3; v <= W / 2 - 1.2; v += 1.9) addOb({ x: bx + u, z: bz + v, r: 1.45, top: 1e9 });
    }
    scene.add(g);
    const bc = s.type === "depot" ? 0x7fc8e0 : 0xff5a1f;
    s.beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: bc, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    s.beacon.position.set(s.x, s.y + 480, s.z); s.beacon.visible = false; scene.add(s.beacon);
  }
}

/* night sky + headlight */
const starGeo = new THREE.BufferGeometry(); {
  const n = 1600, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = Math.random() * 6.283, v = Math.acos(Math.random() * 0.95); a[i * 3] = Math.sin(v) * Math.cos(u) * 7000; a[i * 3 + 1] = Math.cos(v) * 7000; a[i * 3 + 2] = Math.sin(v) * Math.sin(u) * 7000; }
  starGeo.setAttribute("position", new THREE.BufferAttribute(a, 3));
}
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0, fog: false, depthWrite: false }));
stars.frustumCulled = false; scene.add(stars);
const headlight = new THREE.SpotLight(0xfff0d0, 0.4, 80, 0.55, 0.55, 1.1);
headlight.position.set(0, 0.6, 1.3); headlight.target.position.set(0, -1.2, 14);
sledBody.add(headlight, headlight.target);

const C_DAYFOG = new THREE.Color(0xc4d3e2), C_NIGHTFOG = new THREE.Color(0x111b2a), C_STORMDAY = new THREE.Color(0xaab5c1), C_STORMNIGHT = new THREE.Color(0x1b2331);
const C_DAYSKY = new THREE.Color(0xbcd4ec), C_NIGHTSKY = new THREE.Color(0x33476e), _c1 = new THREE.Color(), _c2 = new THREE.Color();
function dayFactor() { const el = Math.sin(((GS.hour % 24) - 6) / 12 * Math.PI); return sstep(-0.1, 0.15, el); }
function updSky() {
  const h = GS.hour % 24, el = Math.sin((h - 6) / 12 * Math.PI), day = sstep(-0.1, 0.15, el), st = GS.storm;
  const az = (h - 6) / 12 * Math.PI, ce = Math.sqrt(Math.max(0, 1 - el * el));
  sunDir.set(-Math.cos(az) * ce, Math.max(el, 0.04), 0.7 * ce + 0.2).normalize();
  sun.intensity = 1.75 * sstep(0.0, 0.18, el) * (1 - 0.75 * st);
  sun.color.setHSL(0.08, 0.95, lerp(0.62, 0.88, sstep(0.05, 0.5, el)));
  hemi.intensity = lerp(0.2, 0.62, day);
  hemi.color.copy(C_NIGHTSKY).lerp(C_DAYSKY, day);
  _c1.copy(C_NIGHTFOG).lerp(C_DAYFOG, day); _c2.copy(C_STORMNIGHT).lerp(C_STORMDAY, day); _c1.lerp(_c2, st);
  scene.fog.color.copy(_c1);
  scene.fog.density = lerp(0.0017, 0.012, st) + (1 - day) * 0.001;
  sky.material.uniforms.uDay.value = day; sky.material.uniforms.uStorm.value = st; sky.material.uniforms.uFog.value.copy(_c1);
  renderer.toneMappingExposure = lerp(0.9, 1.05, day);
  stars.material.opacity = (1 - day) * (1 - st) * 0.9; stars.position.copy(camera.position);
  headlight.intensity = GS.fuel > 0 ? lerp(3.2, 0.3, day) * ST.light : 0;
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
const fmtMi = m => (m / 1609).toFixed(m < 1609 ? 2 : 1) + " mi";
// Courier rank is simply how much you've delivered. Each rank opens bigger, riskier work.
const RANKS = [
  { at: 0, name: "Trail runner" },
  { at: 3, name: "Trail crew", opens: "Grooming contracts are on the board. You'll want a groomer on the hitch." },
  { at: 5, name: "Freight hauler", opens: "Heavy freight is on the board: stoves, freezers, generators. Needs a trailer." },
  { at: 12, name: "Priority courier", opens: "Priority runs are on the board. Big money, a bond up front, and a clock that doesn't forgive." },
  { at: 20, name: "Expedition hauler", opens: "The Summit Relay is hiring. Expedition loads, flatbed only." }
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
  { cargo: "Satellite phone & batteries", kg: 45, fragile: true, look: "dish", why: "{s} has been off the radio for two days." },
  { cargo: "Heater & a week of food", kg: 120, fragile: false, look: "crate", why: "A crew is snowed in at {s} and running out." }
];
const EXPEDITION = [
  { cargo: "Relay battery bank", kg: 320, fragile: true, look: "bigcrate", why: "The tower's batteries died in the cold. The whole valley's radio goes through it." },
  { cargo: "Wind turbine nacelle & blades", kg: 260, fragile: true, look: "turbine", why: "A new turbine for the relay. Glass-fibre blades: don't drop it." },
  { cargo: "Tower generator & fuel", kg: 360, fragile: false, look: "bigcrate", why: "Standby power for the relay before the next big storm." }
];
function jobGeom(d, from) { const dist = Math.hypot(d.x - from.x, d.z - from.z), climb = Math.max(0, d.y - from.y); return { dist, climb, est: (dist / 9 + 45) * (1 + climb / 150) }; }
const pick = a => a[(Math.random() * a.length) | 0];
const round5 = v => Math.round(v / 5) * 5;
function makeJobs(from) {
  const pool = SITES.filter(s => s.type !== "depot" && s.type !== "shop").sort(() => Math.random() - 0.5);  // seven destinations, three posted
  GS.jobs = [];
  for (let k = 0; k < 3; k++) {
    const d = pool[k], cg = CARGO[(Math.random() * CARGO.length) | 0];
    const { dist, climb, est } = jobGeom(d, from), urgent = Math.random() < 0.4;
    const pay = Math.round((35 + dist * 0.12 + climb * 0.5) * cg[1] * (urgent ? 1.5 : 1) / 5) * 5;
    GS.jobs.push({ dest: d, cargo: cg[0], fragile: cg[2], pay, due: urgent ? GS.hour + est * 1.7 / GAMEHOUR : null });
  }
  makeContracts(from);
}
function makeContracts(from) {
  const lvl = GS.delivered, cabins = SITES.filter(s => s.type === "cabin").sort(() => Math.random() - 0.5), relay = SITES.find(s => s.type === "relay");
  const C = [];
  // grooming: drag a groomer down the line to a cabin and leave it set hard
  if (lvl >= 3) {
    const d = cabins[0], { dist, climb, est } = jobGeom(d, from);
    C.push({ groom: true, dest: d, cargo: `Groom the ${d.name.replace(/ (Cabin|Hut|Camp)$/, "")} trail`, pay: round5(140 + dist * 0.22 + climb * 0.6), due: GS.hour + est * 3.2 / GAMEHOUR, need: "groomer" });
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
  // expedition: the summit, on the flatbed
  if (lvl >= 20 && relay) {
    const e = pick(EXPEDITION), { dist, climb, est } = jobGeom(relay, from);
    const pay = round5((400 + dist * 0.5 + climb * 2.5) * (e.fragile ? 1.25 : 1.1));
    C.push({ big: true, bays: 2, expedition: true, dest: relay, cargo: e.cargo, kg: e.kg, fragile: e.fragile, look: e.look, why: e.why, pay, bond: round5(pay * 0.2), due: GS.hour + est * 2.6 / GAMEHOUR, need: "flatbed" });
  } else if (lvl >= 12) C.push({ locked: "Summit Relay expeditions", sub: `Flatbed loads up the mountain — ${RANKS[4].at} deliveries` });
  GS.contracts = C;
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
const HITCH_NAME = { groomer: "a groomer drag", trailer: "a freight trailer", flatbed: "the heavy flatbed" };
function acceptContract(k) {
  const c = GS.contracts && GS.contracts[k]; if (!c || c.locked) return;
  const hitch = GS.own.parts.hitch;
  if (c.groom) {
    if (hitch !== "groomer") { toast("That's grooming work. Hollis Sled & Service sells a groomer drag for the hitch.", "warn"); return; }
    if (GS.groomJob) { toast("Finish the line you're grooming first.", "warn"); return; }
    c.pts = groomLine(depot, c.dest); GS.groomJob = c; GS.contracts.splice(k, 1);
    toast(`Groom the line to ${c.dest.name}. The dots on the map are the stretches still to do.`);
    renderBoard(); save(); return;
  }
  const okHitch = c.need === "flatbed" ? hitch === "flatbed" : hitch === "trailer" || hitch === "flatbed";
  if (!okHitch) { toast(`That load needs ${HITCH_NAME[c.need]} on the hitch. The garage across the street sells them.`, "warn"); return; }
  if (baysUsed() + c.bays > ST.bays) { toast(ST.bays > 1 ? "The flatbed's full." : "The trailer's already loaded.", "warn"); return; }
  if (GS.cash < c.bond) { toast(`The shipper wants a $${c.bond} bond up front. You have $${GS.cash}.`, "warn"); return; }
  GS.cash -= c.bond; c.cond = 100; c.hits = 0; GS.load.push(c); GS.contracts.splice(k, 1);
  toast(`Strapped down: ${c.cargo} (${c.kg} kg) for ${c.dest.name}. $${c.bond} bond paid, back on delivery.${c.priority ? " Clock's running." : ""}`, c.priority || c.expedition ? "warn" : undefined);
  renderBoard(); applyLoadout(); save();
}
// grooming lines: points along the straight run from the station. Lake ice and cliff you can't groom are left out.
function groomLine(a, b) {
  const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(6, Math.round(L / 28)), pts = [];
  for (let i = 1; i < n; i++) {
    const t = i / n, x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t);
    if (Math.hypot(x - a.x, z - a.z) < 50 || Math.hypot(x - b.x, z - b.z) < 30) continue;
    if ((bioAt(x, z) === 1 && sampleG(freshG, x, z) < 0.1) || slopeAt(x, z, 4) > 0.7) continue;
    pts.push({ x, z, done: false });
  }
  return pts;
}
function groomProgress(x, z) {
  for (const p of GS.groomJob.pts) if (!p.done && Math.abs(p.x - x) < 11 && Math.abs(p.z - z) < 11 && Math.hypot(p.x - x, p.z - z) < 11) p.done = true;
}
const groomFrac = g => g.pts.length ? g.pts.filter(p => p.done).length / g.pts.length : 1;
function finishGroom(site) {
  const g = GS.groomJob; if (!g || g.dest !== site) return;
  const fr = groomFrac(g);
  if (fr < 0.7) { if (gameClock - (g.nagT || -99) > 12) { g.nagT = gameClock; toast(`Only ${Math.round(fr * 100)}% of the line is groomed. The orange dots on the map are the gaps.`, "warn"); } return; }
  let p = g.pay * (fr >= 0.9 ? 1 : fr / 0.9), notes = [];
  if (fr >= 0.97) { p *= 1.15; notes.push("clean line bonus"); }
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
  if (!GS.load.length || v < 6 + ST.soak) return;
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
      else { p *= 0.5; note("late"); }
    }
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
      const back = { dest: depot, cargo: BACKHAUL[(Math.random() * BACKHAUL.length) | 0], fragile: false, pay: Math.round((20 + dist * 0.07) / 5) * 5, due: null, hits: 0 };
      GS.load.push(back);
      setTimeout(() => toast(`${clean ? "They topped off your tank and handed" : "They look over the dents, then hand"} you ${back.cargo.toLowerCase()} for the station.`), 1400);
    } else setTimeout(() => toast(clean ? "They topped off your tank." : "No fuel for you after that."), 1400);
  } else if (!GS.load.length) setTimeout(() => toast("Press E for the job board."), 1400);
  applyLoadout(); save();
}
function blackout(kind) {
  if (GS.dead) return;
  GS.dead = true; closeBoard();
  const tow = kind === "tow", fee = tow ? 100 : 60;
  const cargo = GS.load.length ? (GS.load.length > 1 ? GS.load.length + " loads" : GS.load[0].cargo.toLowerCase()) : "";
  const bonds = GS.load.reduce((a, j) => a + (j.bond || 0), 0);
  // a tow brings the freight home with you; passing out in the drift does not
  const lost = tow
    ? (cargo ? ` Your ${cargo} rode back on the tow — the clock keeps running.` : "")
    : (cargo ? ` The ${cargo} didn't make it.${bonds ? ` The shippers keep your $${bonds} in bonds.` : ""}` : "");
  GS.cash = Math.max(0, GS.cash - fee);
  if (!tow) GS.load = [];
  GS.jobs = []; GS.contracts = null;
  $("blackMsg").innerHTML = (tow ? "<b>TOWED IN</b>A ranger hauled you, your sled and your load back to the station." : "<b>YOU BLACKED OUT</b>A ranger found you half-buried in drift and dragged you back to the station.") + `<span>−$${fee}.${lost}</span>`;
  $("black").hidden = false;
  setTimeout(() => {
    P.x = SPAWN.x; P.z = SPAWN.z; P.yaw = SPAWN.yaw; P.vx = P.vz = P.vy = 0; P.yr = 0; P.y = surf(P.x, P.z) + 0.3;
    recenter(P.x, P.z, false); camState.init = false; camState.yaw = P.yaw; towSnap();
    GS.warmth = 70; GS.fuel = Math.max(GS.fuel, GS.cap * 0.5); GS.outWarned = GS.coldWarned = GS.lowWarned = false;
  }, 1200);
  setTimeout(() => { $("black").hidden = true; GS.dead = false; save(); }, 3800);
}
function save() { try { localStorage.setItem("tracklayer.save.v2", JSON.stringify({ cash: GS.cash, delivered: GS.delivered, own: GS.own })); } catch (e) { } }
function load() {
  GS.own = OWN0();
  try {
    const d = JSON.parse(localStorage.getItem("tracklayer.save.v2") || "null");
    if (d) { GS.cash = d.cash || 0; GS.delivered = d.delivered || 0; if (d.own) { const parts0 = GS.own.parts; Object.assign(GS.own, d.own); GS.own.parts = Object.assign(parts0, d.own.parts || {}); } }
    else { const old = JSON.parse(localStorage.getItem("tracklayer.save.v1") || "null"); if (old) { GS.cash = old.cash || 0; GS.delivered = old.delivered || 0; } }
  } catch (e) { }
  restat(); GS.fuel = GS.cap;
}

/* ui */
function toast(msg, kind) {
  const el = document.createElement("div"); el.className = "toast" + (kind ? " " + kind : ""); el.textContent = msg;
  const box = $("toasts"); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 400); }, 4200);
}
function renderBoard() {
  const jl = $("jobList"); jl.innerHTML = "";
  const sm = smallLoads(), bg = bigLoads();
  $("boardSlots").textContent = `Rack ${sm.length}/${ST.slots}` + (ST.bays ? ` · Trailer ${baysUsed()}/${ST.bays}` : "");
  const gTag = d => { const g = groom[d.id] || 0; return `<span class="groom g${g > 0.8 ? 3 : g > 0.45 ? 2 : g > 0.15 ? 1 : 0}">${groomLabel(g)}</span>`; };
  if (!GS.jobs.length) jl.innerHTML = `<div class="empty">${sm.length ? "Rack loaded: " + sm.map(j => j.cargo.toLowerCase()).join(", ") + "." : "No parcels posted."}</div>`;
  GS.jobs.forEach((j, k) => {
    const b = document.createElement("button"); b.className = "row"; b.id = "jobBtn" + k;
    const dist = Math.hypot(j.dest.x - depot.x, j.dest.z - depot.z);
    b.innerHTML = `<kbd>${k + 1}</kbd><span class="main"><b>${j.cargo}</b><em>${j.dest.name} · ${fmtMi(dist)} · climb ${Math.round(Math.max(0, j.dest.y - depot.y) * 3)} m · ${gTag(j.dest)}${j.fragile ? " · fragile" : ""}${j.due ? " · due " + fmtTime(j.due) : ""}</em></span><span class="pay">$${j.pay}</span>`;
    b.addEventListener("click", () => acceptJob(k)); jl.appendChild(b);
  });
  // contracts: the big work, opened up by rank
  const cl = $("conList"); cl.innerHTML = "";
  const rk = rankOf(GS.delivered), nx = RANKS[RANKS.indexOf(rk) + 1];
  $("boardRank").textContent = `${rk.name} · ${GS.delivered} delivered${nx ? ` · ${nx.name} at ${nx.at}` : ""}`;
  if (bg.length) { const e = document.createElement("div"); e.className = "empty"; e.textContent = "On the trailer: " + bg.map(j => `${j.cargo.toLowerCase()} (${Math.round(j.cond)}%)`).join(", ") + "."; cl.appendChild(e); }
  if (GS.groomJob) { const e = document.createElement("div"); e.className = "empty"; e.textContent = `Grooming the line to ${GS.groomJob.dest.name}: ${Math.round(groomFrac(GS.groomJob) * 100)}% done.`; cl.appendChild(e); }
  let n = 4;
  (GS.contracts || []).forEach((c, k) => {
    const b = document.createElement("button");
    if (c.locked) {
      b.className = "row locked"; b.tabIndex = -1;
      b.innerHTML = `<kbd class="no">·</kbd><span class="main"><b>${c.locked}</b><em>${c.sub}</em></span><span class="pay lock">Locked</span>`;
      cl.appendChild(b); return;
    }
    const key = n++, dist = Math.hypot(c.dest.x - depot.x, c.dest.z - depot.z), climb = Math.round(Math.max(0, c.dest.y - depot.y) * 3);
    const hitch = GS.own.parts.hitch, fits = c.groom ? hitch === "groomer" : c.need === "flatbed" ? hitch === "flatbed" : hitch === "trailer" || hitch === "flatbed";
    const tag = c.groom ? "GROOMING" : c.expedition ? "EXPEDITION" : c.priority ? "PRIORITY" : "HEAVY";
    const bits = c.groom
      ? [`${fmtMi(dist)} of trail from the station`, `climb ${climb} m`, gTag(c.dest), "pays for how much of the line you groom", "due " + fmtTime(c.due)]
      : [c.dest.name, fmtMi(dist), `climb ${climb} m`, `${c.kg} kg`, c.bays > 1 ? "whole flatbed" : null, c.fragile ? "fragile" : null, c.due ? "due " + fmtTime(c.due) : null, `bond $${c.bond}`];
    b.className = "row con " + tag.toLowerCase() + (fits ? "" : " nofit"); b.id = "conBtn" + k;
    b.innerHTML = `<kbd>${key}</kbd><span class="main"><b>${c.cargo} <span class="ctag">${tag}</span></b>${c.why ? `<em class="why">${c.why}</em>` : ""}<em>${bits.filter(Boolean).join(" · ")}</em>${fits ? "" : `<em class="need">Needs ${HITCH_NAME[c.need]} on the hitch</em>`}</span><span class="pay">$${c.pay}</span>`;
    b.dataset.key = key;
    b.addEventListener("click", () => acceptContract(k)); cl.appendChild(b);
  });
  const ul = $("upgList"); ul.innerHTML = "";
  const g = document.createElement("button"); g.className = "row";
  g.innerHTML = `<kbd>G</kbd><span class="main"><b>Hollis Sled &amp; Service</b><em>Sleds, parts, rider kit, and the hitch: groomer drags and freight trailers. Across the street, big roll door. Ride over and press E.</em></span><span class="pay">${sledDef().name}</span>`;
  g.addEventListener("click", () => { closeBoard(); toast("The garage is the shed across the street. Ride over and press E."); });
  ul.appendChild(g);
  $("boardCash").textContent = "$" + GS.cash;
}
function openBoard() { updGroom(); if (!GS.jobs.length) makeJobs(depot); else if (!GS.contracts || !GS.contracts.some(c => !c.locked)) makeContracts(depot); GS.boardOpen = true; renderBoard(); $("board").hidden = false; }
function closeBoard() { GS.boardOpen = false; $("board").hidden = true; }
function gameKey(e) {
  if (GS.dead) return;
  if (e.code === "KeyE") { if (GS.garageOpen) closeGarage(); else if (GS.boardOpen) closeBoard(); else if (GS.near === garageSite) openGarage(); else if (GS.near === depot) openBoard(); else toast("The job board is at the station, the garage is across the street.", "warn"); }
  if (e.code === "Escape") { if (godOpen) toggleGod(false); else if (!$("bigmap").hidden) toggleBigMap(false); else if (GS.garageOpen) closeGarage(); else if (GS.boardOpen) closeBoard(); else toggleSettings(); }
  if (e.code === "KeyF") { if (GS.near === depot) toast("You're already at the station."); else blackout("tow"); }
  if (GS.boardOpen && /^Digit[1-3]$/.test(e.code)) acceptJob(+e.code.slice(5) - 1);
  if (GS.boardOpen && /^Digit[4-8]$/.test(e.code)) { const b = document.querySelector(`#conList .row[data-key="${e.code.slice(5)}"]`); if (b) b.click(); }
}

/* settings: sled colour, volume */
const SLED_COLORS = ["#ff5a1f", "#ffd23f", "#4fd06a", "#38b6ff", "#9b6bff", "#ff4d8d", "#f2f6fb", "#20262e", "#b5651d", "#00e0c6"];
const JACKET_COLORS = ["#1d3f6e", "#8c1f2f", "#1f6b4a", "#e0e6ec", "#c8541e", "#2b2f36", "#6b4ea8", "#d8c23a"];
const TRIM_COLORS = ["#eef2f5", "#ff5a1f", "#111820", "#d8e94a", "#7fc8e0", "#c9a227"];
const PANTS_COLORS = ["#232a33", "#3c4654", "#6b7683", "#1d3f6e", "#4a3b2c", "#111418"];
const STYLES = [["solid", "Solid"], ["twotone", "Two-tone"], ["racer", "Racing stripe"], ["hivis", "Hi-vis"]];
const SEAT_COLORS = ["#1a2027", "#5a3a24", "#8c1f2f", "#c9b48a", "#2f4a6b", "#eef2f5"];
const HELMET_COLORS = ["#f2f5f8", "#111820", "#ff5a1f", "#d8c23a", "#38b6ff", "#8c1f2f", "#4fd06a"];
const DECALS = [["none", "Clean"], ["stripe", "Twin stripes"], ["wide", "Wide stripe"], ["flash", "Side flash"]];
const SET = { color: "#ff5a1f", jacket: "#1d3f6e", trim: "#eef2f5", pants: "#232a33", style: "twotone", seat: "#1a2027", helmet: "#f2f5f8", decal: "none", canMatch: false, vol: 0.35, hud: true };
function loadSettings() { try { const d = JSON.parse(localStorage.getItem("tracklayer.set.v1") || "null"); if (d) Object.assign(SET, d); } catch (e) { } }
function saveSettings() { try { localStorage.setItem("tracklayer.set.v1", JSON.stringify(SET)); } catch (e) { } }
function applySettings() {
  if (bodyMat) bodyMat.color.set(SET.color);
  if (jacketMat) { jacketMat.color.set(SET.jacket); accentMat.color.set(SET.trim); pantsMat.color.set(SET.pants); }
  if (V.seatMat) V.seatMat.color.set(SET.seat);
  if (V.canMat) V.canMat.color.set(SET.canMatch ? SET.color : "#b3201a");
  const cb = $("canBtn"); if (cb) { cb.textContent = SET.canMatch ? "Jerry cans: match sled" : "Jerry cans: red"; cb.classList.toggle("on", SET.canMatch); }
  if (V.helmetMat) V.helmetMat.color.set(SET.helmet);
  if (V.decal) for (const [k, list] of Object.entries(V.decal)) list.forEach(m => m.visible = SET.decal === k);
  const db = $("decalBtns"); if (db) [...db.children].forEach(b => b.classList.toggle("on", b.dataset.s === SET.decal));
  if (styleParts.stripe) {
    const st = SET.style;
    styleParts.shoulders.forEach(m => m.visible = st === "twotone" || st === "hivis");
    styleParts.stripe.visible = st === "racer";
    styleParts.back.visible = st === "twotone" || st === "hivis";
    styleParts["band-1"].visible = styleParts["band1"].visible = st === "racer" || st === "hivis";
  }
  for (const [k, id] of [["color", "swatches"], ["jacket", "jacketSw"], ["trim", "trimSw"], ["pants", "pantsSw"], ["seat", "seatSw"], ["helmet", "helmetSw"]]) {
    const el = $(id); if (el) [...el.children].forEach(b => b.classList.toggle("on", b.dataset.c === SET[k]));
  }
  const sb = $("styleBtns"); if (sb) [...sb.children].forEach(b => b.classList.toggle("on", b.dataset.s === SET.style));
  if (audio) audio.master.gain.value = muted ? 0 : SET.vol;
  const sw = $("swatches"); if (sw) [...sw.children].forEach(b => b.classList.toggle("on", b.dataset.c === SET.color));
  const hue = $("hue"); if (hue) hue.value = Math.round(new THREE.Color(SET.color).getHSL({ h: 0, s: 0, l: 0 }).h * 360);
  const vol = $("vol"); if (vol) vol.value = Math.round(SET.vol * 100);
  const mb = $("muteBtn"); if (mb) mb.textContent = muted ? "Sound: off" : "Sound: on";
  const cs = $("colorSwatch"); if (cs) cs.style.background = SET.color;
}
function swatchRow(id, colors, key) {
  const box = $(id);
  colors.forEach(c => {
    const b = document.createElement("button"); b.className = "sw"; b.style.background = c; b.dataset.c = c; b.title = c;
    b.addEventListener("click", () => { SET[key] = c; applySettings(); saveSettings(); });
    box.appendChild(b);
  });
}
function buildSettings() {
  swatchRow("swatches", SLED_COLORS, "color");
  swatchRow("jacketSw", JACKET_COLORS, "jacket");
  swatchRow("trimSw", TRIM_COLORS, "trim");
  swatchRow("pantsSw", PANTS_COLORS, "pants");
  swatchRow("seatSw", SEAT_COLORS, "seat");
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
    SET.jacket = pick(JACKET_COLORS); SET.trim = pick(TRIM_COLORS); SET.pants = pick(PANTS_COLORS); SET.style = pick(STYLES)[0]; SET.color = pick(SLED_COLORS);
    SET.seat = pick(SEAT_COLORS); SET.helmet = pick(HELMET_COLORS); SET.decal = pick(DECALS)[0];
    applySettings(); saveSettings();
  });
  $("hue").addEventListener("input", e => { SET.color = "#" + new THREE.Color().setHSL(e.target.value / 360, 0.85, 0.55).getHexString(); applySettings(); saveSettings(); });
  $("vol").addEventListener("input", e => { SET.vol = e.target.value / 100; muted = SET.vol === 0; applySettings(); saveSettings(); });
  $("muteBtn").addEventListener("click", () => { muted = !muted; applySettings(); saveSettings(); });
  $("viewBtn").addEventListener("click", () => { cycleView(); $("viewBtn").textContent = "View: " + VIEWS[camMode].n; });
  $("closeSet").addEventListener("click", () => toggleSettings(false));
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
    power: 0.72, fuel: 16, drag: 1.25, grip: -0.6, hue: "#c8452b", trackLen: 1.0,
    shape: { hood: [0.82, 0.46, 1.15], hoodY: 0.78, nose: "round", tunnel: 0.95, seat: "bench", bars: 0, trackW: 0.86, extras: ["bogies", "chrome", "roundlight"] }
  },
  {
    id: "woodsman", name: "Woodsman 440 W/T", year: "1979", cost: 600, need: 4,
    era: "Wide-track workhorse — the Ski-Doo Alpine and Skandic idea",
    blurb: "Twin-cylinder plodder on a wide track, built to haul wood and drag sleds. Slow, unkillable.",
    power: 0.84, fuel: 22, drag: 1.0, grip: 0.4, hue: "#e2a32c", trackLen: 1.12,
    shape: { hood: [0.95, 0.52, 1.0], hoodY: 0.84, nose: "flat", tunnel: 1.12, seat: "bench", bars: 0.1, trackW: 1.3, extras: ["rack", "tallshield", "chrome"] }
  },
  {
    id: "ranger", name: "Ranger 500", year: "1989", cost: 900, need: 8,
    era: "Independent front suspension trail sled — the Polaris Indy generation",
    blurb: "Wedge hood, twin lamps, slide rail suspension. The first one that actually goes where you point it.",
    power: 0.96, fuel: 20, drag: 1.02, grip: 0.3, hue: "#2f6fb0", trackLen: 1.05,
    shape: { hood: [0.88, 0.42, 1.2], hoodY: 0.82, nose: "wedge", tunnel: 1.0, seat: "saddle", bars: 0.04, trackW: 1.0, extras: ["duallight"] }
  },
  {
    id: "sprint", name: "Sprint 580 SX", year: "1994", cost: 1700, need: 13,
    era: "Trail-racer years — Yamaha SRX, Ski-Doo MXZ, Cat ZR",
    blurb: "Low, loud and geared for the lake run. Terrible in deep snow, glorious on a groomed trail.",
    power: 1.06, fuel: 18, drag: 1.12, grip: 1.1, hue: "#8f1f3a", trackLen: 0.98,
    shape: { hood: [0.8, 0.34, 1.3], hoodY: 0.76, nose: "wedge", tunnel: 0.92, seat: "saddle", bars: 0, trackW: 0.94, extras: ["lowshield", "stripe", "duallight"] }
  },
  {
    id: "summit", name: "Summit 600", year: "2004", cost: 2400, need: 18,
    era: "Mountain sleds go long — Ski-Doo Summit, Polaris RMK",
    blurb: "Liquid twin, long track, proper mountain geometry. Floats where the Ranger digs.",
    power: 1.12, fuel: 24, drag: 0.88, grip: 0.8, hue: "#e8b230", trackLen: 1.18,
    shape: { hood: [0.82, 0.46, 1.15], hoodY: 0.86, nose: "round", tunnel: 1.05, seat: "saddle", bars: 0.12, trackW: 1.05, extras: ["lowshield"] }
  },
  {
    id: "trekker", name: "Trekker 550 Tour", year: "2009", cost: 3400, need: 24,
    era: "Two-up touring — Grand Touring and Yamaha Venture territory",
    blurb: "Heated grips, a passenger seat nobody uses, and a windshield like a garage door. Warm and heavy.",
    power: 1.08, fuel: 30, drag: 1.0, grip: 0.6, hue: "#2d6b52", trackLen: 1.1,
    shape: { hood: [0.92, 0.5, 1.1], hoodY: 0.86, nose: "round", tunnel: 1.15, seat: "twoup", bars: 0.06, trackW: 1.05, extras: ["tallshield", "mirrors", "rack", "duallight"] }
  },
  {
    id: "apex", name: "Apex 800", year: "2015", cost: 5200, need: 32,
    era: "Rider-forward chassis — the REV and ProCross school",
    blurb: "Light chassis, fuel injection, you stand over the skis instead of behind them. Climbs like it's annoyed.",
    power: 1.32, fuel: 26, drag: 0.78, grip: 1.3, hue: "#d8482f", trackLen: 1.22,
    shape: { hood: [0.74, 0.56, 0.95], hoodY: 0.95, nose: "wedge", tunnel: 0.92, seat: "saddle", bars: 0.2, trackW: 1.05, extras: ["lowshield", "spoiler"] }
  },
  {
    id: "matriarch", name: "Matriarch 850T", year: "2026", cost: 9800, need: 46,
    era: "Factory turbo mountain — Summit Turbo R, Patriot Boost",
    blurb: "Turbo, carbon tunnel, electric everything. The whole map gets smaller.",
    power: 1.6, fuel: 30, drag: 0.66, grip: 1.8, hue: "#1c2b3a", trackLen: 1.25,
    shape: { hood: [0.72, 0.58, 1.0], hoodY: 0.98, nose: "wedge", tunnel: 0.9, seat: "saddle", bars: 0.24, trackW: 1.12, extras: ["turbo", "lightbar", "spoiler"] }
  },
  {
    id: "aurora", name: "Aurora E", year: "2029", cost: 14500, need: 60,
    era: "Battery sleds — where Taiga and the electric prototypes are heading",
    blurb: "Silent, instant torque, and a battery gauge instead of a tank. You hear the snow instead of the engine.",
    power: 1.45, fuel: 34, drag: 0.72, grip: 1.6, hue: "#5ad2c8", trackLen: 1.2,
    shape: { hood: [0.78, 0.5, 1.05], hoodY: 0.92, nose: "round", tunnel: 0.95, seat: "saddle", bars: 0.16, trackW: 1.08, extras: ["lightbar", "smooth", "spoiler"] }
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
      { id: "stud", name: "Studded ice track", cost: 620, tier: 1, stats: { grip: 2.2, drag: 0.1 }, note: "Carbide studs. Lake runs become a straight line." }
    ]
  },
  skis: {
    label: "Skis", must: true, options: [
      { id: "stock", name: "Stock steel skis", cost: 0, tier: 0, stats: {} },
      { id: "carbide", name: "Dual-carbide trail skis", cost: 260, tier: 1, stats: { grip: 0.7 }, note: "Runners that hold a line." },
      { id: "powder", name: "Wide powder skis", cost: 540, tier: 2, stats: { drag: -0.12, grip: -0.2 }, note: "Keeps the nose up in the deep." }
    ]
  },
  clutch: {
    label: "Engine & clutch", must: true, options: [
      { id: "stock", name: "Stock clutching", cost: 0, tier: 0, stats: {} },
      { id: "helix", name: "Helix & spring kit", cost: 340, tier: 1, stats: { power: 0.1 }, note: "Backshifts instead of sulking." },
      { id: "bigbore", name: "Big-bore top end", cost: 980, tier: 2, stats: { power: 0.22, burn: 0.15 }, note: "More everything, including thirst." },
      { id: "turbo", name: "Bolt-on turbo", cost: 2600, tier: 3, stats: { power: 0.45, burn: 0.3 }, note: "Altitude stops mattering." }
    ]
  },
  can: {
    label: "Exhaust", options: [
      { id: "stock", name: "Stock silencer", cost: 0, tier: 0, stats: {} },
      { id: "trail", name: "Trail can", cost: 180, tier: 1, stats: { power: 0.05 }, note: "A little more bark." },
      { id: "race", name: "Race can", cost: 460, tier: 2, stats: { power: 0.12, burn: 0.05 }, note: "Everyone in the valley knows you're out." }
    ]
  },
  susp: {
    label: "Suspension", options: [
      { id: "stock", name: "Stock shocks", cost: 0, tier: 0, stats: {} },
      { id: "coil", name: "Rebuilt coilovers", cost: 300, tier: 1, stats: { soak: 1.5 }, note: "Landings stop hurting the cargo." },
      { id: "long", name: "Long-travel kit", cost: 720, tier: 2, stats: { soak: 3, grip: 0.3 }, note: "Moguls become suggestions." }
    ]
  },
  bars: {
    label: "Bars & risers", options: [
      { id: "stock", name: "Stock bars", cost: 0, tier: 0, stats: {} },
      { id: "riser", name: "6\" riser & hook bars", cost: 190, tier: 1, stats: { grip: 0.2, soak: 0.5 }, note: "Stand-up riding without the backache." },
      { id: "guards", name: "Riser, hooks & handguards", cost: 330, tier: 1, stats: { grip: 0.2, soak: 0.5, cold: 1 }, note: "Wind off your hands." }
    ]
  },
  shield: {
    label: "Windshield", options: [
      { id: "low", name: "Low race shield", cost: 0, tier: 0, stats: { cold: -0.5 }, note: "Looks fast. Is cold." },
      { id: "mid", name: "Mid trail shield", cost: 120, tier: 0, stats: { cold: 1 } },
      { id: "tall", name: "Tall touring shield", cost: 280, tier: 1, stats: { cold: 2.2, drag: 0.03 }, note: "A wall of quiet air." }
    ]
  },
  tankL: {
    label: "Left jerry can", options: [
      { id: "none", name: "No left can", cost: 0, tier: 0, stats: {} },
      { id: "fitted", name: "Left jerry can", cost: 240, tier: 1, stats: { fuel: 7 }, note: "+7 L jerry can strapped to the left running board." }
    ]
  },
  tankR: {
    label: "Right jerry can", options: [
      { id: "none", name: "No right can", cost: 0, tier: 0, stats: {} },
      { id: "fitted", name: "Right jerry can", cost: 240, tier: 1, stats: { fuel: 7 }, note: "+7 L jerry can strapped to the right running board." }
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
      { id: "bar", name: "LED light bar", cost: 150, tier: 1, stats: { light: 1.9 }, note: "Night rides stop being guesswork." }
    ]
  },
  hitch: {
    label: "Hitch — tow-behind", options: [
      { id: "none", name: "Empty hitch", cost: 0, tier: 0, stats: {}, note: "Nothing dragging behind you." },
      { id: "groomer", name: "Tow-behind groomer drag", cost: 700, tier: 1, stats: { burn: 0.1, groom: 1 }, note: "Steel pan and a corduroy comb. Leaves a trail two metres wide, flat and set hard, that the snow takes three times as long to bury. Takes grooming contracts." },
      { id: "trailer", name: "Freight sled trailer", cost: 900, tier: 1, stats: { burn: 0.06, bays: 1 }, note: "Poly tub on steel runners with ratchet straps. One big load: stoves, freezers, generators, solar kits. Tips if you corner it hard." },
      { id: "flatbed", name: "Heavy flatbed trailer", cost: 2400, tier: 2, stats: { burn: 0.1, bays: 2 }, note: "Twin-ski steel flatbed with stake sides. Two big loads, or one expedition load for the Summit Relay. Sits lower, harder to roll." }
    ]
  }
};
const PART_ORDER = ["track", "skis", "clutch", "can", "susp", "bars", "shield", "tankL", "tankR", "rack", "lights", "hitch"];

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
  parts: { track: "stock", skis: "stock", clutch: "stock", can: "stock", susp: "stock", bars: "stock", shield: "low", tankL: "none", tankR: "none", rack: "stock", lights: "stock", hitch: "none" },
  partsOwned: {},
  gear: { head: "beanie", jacket: "shell", pants: "bib", boots: "pac", gloves: "leather" },
  gearOwned: {}
});
const sledDef = () => SLEDS.find(s => s.id === GS.own.sled) || SLEDS[0];
const sledTier = () => SLEDS.indexOf(sledDef());
const partDef = (cat, id) => PARTS[cat].options.find(o => o.id === id) || PARTS[cat].options[0];
const gearDef = (slot, id) => GEAR[slot].options.find(o => o.id === id) || GEAR[slot].options[0];
const ownKey = (cat, id) => cat + ":" + id;

// everything the physics and the cold ask about, in one place
function stats() {
  const sd = sledDef();
  const st = { power: sd.power, fuel: sd.fuel, drag: sd.drag, grip: sd.grip, burn: 1, cold: 0, soak: 0, care: 0, light: 1, slots: 1, bays: 0, groom: 0 };
  for (const cat of PART_ORDER) {
    const o = partDef(cat, GS.own.parts[cat]).stats || {};
    st.power += o.power || 0; st.fuel += o.fuel || 0; st.drag += o.drag || 0; st.grip += o.grip || 0;
    st.burn += o.burn || 0; st.cold += o.cold || 0; st.soak += o.soak || 0; st.care += o.care || 0; st.slots += o.slots || 0; st.bays += o.bays || 0; st.groom += o.groom || 0;
    st.light = Math.max(st.light, o.light || 1);
  }
  let warm = 0;
  for (const slot of GEAR_ORDER) warm += gearDef(slot, GS.own.gear[slot]).warm;
  st.warm = warm + st.cold;                       // insulation, plus what the sled blocks
  st.coldMul = clamp(1.55 - st.warm * 0.11, 0.3, 1.6);
  st.drag = Math.max(0.35, st.drag);
  return st;
}
let ST = null;
function restat() { ST = stats(); if (GOD.turbo) ST.power *= 2.2; GS.cap = ST.fuel; GS.fuel = Math.min(GS.fuel, GS.cap); applyLoadout(); }

/* ---------------- the garage ---------------- */
let garageTab = "sleds";
function canBuySled(s) { return GS.delivered >= s.need; }
function buySled(id) {
  const s = SLEDS.find(x => x.id === id); if (!s) return;
  if (GS.own.sleds.includes(id)) { GS.own.sled = id; restat(); toast(`Rolled the ${s.name} out of the bay.`); renderGarage(); save(); return; }
  if (!canBuySled(s)) { toast(`${s.name} is for proven couriers — ${s.need} deliveries.`, "warn"); return; }
  if (GS.cash < s.cost) { toast(`${s.name} is $${s.cost}. You have $${GS.cash}.`, "warn"); return; }
  GS.cash -= s.cost; GS.own.sleds.push(id); GS.own.sled = id; restat();
  SET.color = s.hue; applySettings(); saveSettings();
  toast(`Bought the ${s.name}. Your parts move over with it.`, "good"); renderGarage(); save();
}
function fitPart(cat, id) {
  const o = partDef(cat, id), tierOK = sledTier() >= o.tier;
  if (GS.own.partsOwned[ownKey(cat, id)] || o.cost === 0) { GS.own.parts[cat] = id; restat(); renderGarage(); save(); return; }
  if (!tierOK) { toast(`${o.name} doesn't fit this generation yet.`, "warn"); return; }
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
  if (s.fuel) bits.push("+" + s.fuel + " L");
  if (s.drag) bits.push((s.drag < 0 ? "−" : "+") + Math.round(Math.abs(s.drag) * 100) + "% powder drag");
  if (s.grip) bits.push((s.grip > 0 ? "+" : "−") + "grip");
  if (s.burn) bits.push("+" + Math.round(s.burn * 100) + "% burn");
  if (s.cold) bits.push((s.cold > 0 ? "+" : "−") + Math.abs(s.cold) + " warmth");
  if (s.soak) bits.push("softer landings");
  if (s.care) bits.push("protects cargo");
  if (s.slots) bits.push("+" + s.slots + " parcel" + (s.slots > 1 ? "s" : ""));
  if (s.bays) bits.push(s.bays + " big load" + (s.bays > 1 ? "s" : ""));
  if (s.groom) bits.push("grooms trail");
  if (s.light) bits.push("brighter");
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
      const spec = `${s.year} · ${Math.round(s.power * 100)}% power · ${s.fuel} L · ${s.drag < 1 ? "floats" : "ploughs"} in powder`;
      tryOn(row(s.name, `${spec}\n${s.blurb}\n${s.era}`, on ? "Riding" : owned ? "Owned" : locked ? `${s.need} deliveries` : "$" + s.cost,
        on ? "on" : locked ? "locked" : "", () => buySled(s.id), s.year), { sled: s.id });
    });
    const note = document.createElement("div"); note.className = "bfoot";
    note.innerHTML = "Every part you own moves to whatever you ride. Deliveries unlock the newer generations.";
    body.appendChild(note);
  } else if (garageTab === "parts") {
    PART_ORDER.forEach(cat => {
      const h = document.createElement("div"); h.className = "bsec"; h.textContent = PARTS[cat].label; body.appendChild(h);
      PARTS[cat].options.forEach(o => {
        const owned = GS.own.partsOwned[ownKey(cat, o.id)] || o.cost === 0, on = GS.own.parts[cat] === o.id, locked = !owned && sledTier() < o.tier;
        tryOn(row(o.name, [statLine(o), o.note].filter(Boolean).join(" · "),
          on ? "Fitted" : owned ? "Owned" : locked ? `Gen ${o.tier + 1}+` : "$" + o.cost,
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
function openGarage() { GS.garageOpen = true; $("garage").hidden = false; renderGarage(); }
function closeGarage() { GS.garageOpen = false; $("garage").hidden = true; PV.sled = PV.cat = PV.slot = null; applyLoadout(); }
function buildGarageTabs() {
  [["sleds", "Sleds"], ["parts", "Parts"], ["gear", "Rider kit"]].forEach(([t, n]) => {
    const b = document.createElement("button"); b.className = "sbtn st"; b.dataset.t = t; b.textContent = n;
    b.addEventListener("click", () => { garageTab = t; renderGarage(); });
    $("garageTabs").appendChild(b);
  });
  $("closeGarage").addEventListener("click", closeGarage);
}

/* ---------------- Hollis town ---------------- */
function buildTown() {
  const L = c => new THREE.MeshLambertMaterial({ color: c });
  const wood = L(0x5b3d29), woodD = L(0x3a271b), snowM = L(0xf3f7fc), stone = L(0x6b6c70), metal = L(0x8d99a6),
    doorM = L(0x2a1b12), red = L(0xa8392a), green = L(0x2f5a3a), glowM = new THREE.MeshBasicMaterial({ color: 0xffc26b });
  const put = (g, geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const bx = (g, w, h, d, mat, x, y, z, ry = 0) => put(g, new THREE.BoxGeometry(w, h, d), mat, x, y, z, ry);

  // one building: walls, gabled roof with snow, lit windows
  function house(x, z, w, d, h, ry, mat, lit) {
    const g = new THREE.Group();
    g.position.set(x, groundAt(x, z) - 0.25, z); g.rotation.y = ry; scene.add(g);
    bx(g, w, h, d, mat, 0, h / 2, 0);
    const a = 0.55, hs = w / 2 + 0.4, Ls = hs / Math.cos(a);
    const tri = new THREE.Shape(); tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, (w / 2) * Math.tan(a)); tri.closePath();
    const gable = new THREE.ExtrudeGeometry(tri, { depth: d, bevelEnabled: false }); gable.translate(0, 0, -d / 2);
    put(g, gable, mat, 0, h, 0);
    for (const s of [-1, 1]) {
      bx(g, Ls, 0.2, d + 0.7, woodD, s * hs / 2, h + (hs / 2) * Math.tan(a) + 0.05, 0).rotation.z = -s * a;
      bx(g, Ls + 0.1, 0.3, d + 0.8, snowM, s * hs / 2, h + (hs / 2) * Math.tan(a) + 0.28, 0).rotation.z = -s * a;
    }
    bx(g, 0.7, 1.8, 0.7, stone, -w / 4, h + 1.1, d / 4);
    bx(g, 0.8, 0.18, 0.8, snowM, -w / 4, h + 2.05, d / 4);
    if (lit !== false) {
      for (const sx of [-w / 4, w / 4]) bx(g, 0.7, 0.6, 0.08, glowM, sx, 1.5, d / 2 + 0.04);
      bx(g, 0.9, 1.9, 0.1, doorM, 0, 0.95, d / 2 + 0.04);
    }
    for (let u = -w / 2 + 1.1; u <= w / 2 - 1; u += 1.9) for (let v = -d / 2 + 1.1; v <= d / 2 - 1; v += 1.9) {
      const wx = x + u * Math.cos(ry) + v * Math.sin(ry), wz = z - u * Math.sin(ry) + v * Math.cos(ry);
      addOb({ x: wx, z: wz, r: 1.35, top: 1e9 });
    }
    return g;
  }
  function lamp(x, z) {
    const g = new THREE.Group(); g.position.set(x, groundAt(x, z) - 0.2, z); scene.add(g);
    put(g, new THREE.CylinderGeometry(0.07, 0.09, 4, 8), metal, 0, 2, 0);
    put(g, new THREE.SphereGeometry(0.22, 10, 8), glowM, 0, 4.1, 0).castShadow = false;
    put(g, new THREE.ConeGeometry(0.34, 0.3, 10), metal, 0, 4.35, 0);
    addOb({ x, z, r: 0.3, top: 1e9 });
    return g;
  }

  const d0 = depot, ang = 0;
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
  // a couple of parts crates and a spare track leaning on the wall
  bx(gg, 1.0, 0.8, 1.0, wood, -4.2, 0.4, 4.6); bx(gg, 0.9, 0.7, 0.9, wood, -2.8, 0.35, 4.8);
  put(gg, new THREE.TorusGeometry(0.85, 0.16, 8, 18), L(0x14181d), 3.4, 1.0, 4.6).rotation.set(0.25, 0.4, 0);

  // houses and shops along a short street either side of the station
  const lots = [
    [46, 26, 9, 7, 3.0, 0.2, wood], [46, -12, 8, 6, 2.8, -0.15, L(0x6d4a33)],
    [18, 40, 8, 7, 2.9, 1.5, wood], [-16, 44, 9, 6, 3.0, 1.6, L(0x5a4b3c)],
    [-40, 20, 10, 7, 3.2, -1.5, red], [-38, -16, 8, 6, 2.8, -1.4, wood],
    [10, -42, 9, 7, 3.0, 3.0, L(0x4a5d54)], [-20, -40, 8, 6, 2.9, 2.9, wood]
  ];
  for (const [ox, oz, w, d, h, r, mat] of lots) house(d0.x + ox, d0.z + oz, w, d, h, r, mat);
  // general store with a porch and a sign
  const st = house(d0.x + 24, d0.z - 34, 10, 8, 3.4, 0.1, L(0x7a5a3a));
  bx(st, 10, 0.3, 2.4, woodD, 0, 3.5, 4.6); bx(st, 0.2, 1.1, 5, L(0xe8e2d4), 0, 4.3, 0.2);
  bx(st, 0.1, 0.3, 3.6, green, -0.12, 4.3, 0.2);
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
}

/* what you own, on the sled and on the rider */
function applyLoadout() {
  if (!V.track) return;
  const sd = (PV.sled && SLEDS.find(x => x.id === PV.sled)) || sledDef();
  const pr = PV.cat ? Object.assign({}, GS.own.parts, { [PV.cat]: PV.id }) : GS.own.parts;
  const gr = PV.slot ? Object.assign({}, GS.own.gear, { [PV.slot]: PV.id }) : GS.own.gear;
  if (bodyMat) bodyMat.color.set(PV.sled ? sd.hue : SET.color);
  if (V.canMat) V.canMat.color.set(SET.canMatch ? (PV.sled ? sd.hue : SET.color) : "#b3201a");
  const sh = sd.shape || {};
  const ex = sh.extras || [];
  if (V.hood) {
    V.hood.scale.set(sh.hood ? sh.hood[0] : 0.88, sh.hood ? sh.hood[1] : 0.55, sh.hood ? sh.hood[2] : 1.35);
    V.hood.position.y = sh.hoodY || 0.84;
    const hz0 = sh.hood ? sh.hood[2] : 1.35;
    V.nose.position.set(0, (sh.hoodY || 0.84) - 0.04, 0.5 + hz0 * 0.41);
    V.nose.visible = sh.nose !== "flat";
    V.noseTip.visible = sh.nose === "wedge";
    V.noseTip.position.set(0, (sh.hoodY || 0.84) - 0.06, 0.5 + hz0 * 0.52);
  }
  if (V.track) V.track.scale.x = (sh.trackW || 1) * (pr.track === "paddle" ? 1.22 : pr.track === "trail" ? 0.94 : 1);
  if (V.deck) { }
  barPivot.position.y = (pr.bars === "stock" ? 1.44 : 1.56) + (sh.bars || 0);
  if (V.column) {                                    // stretch the steering post to meet the bars
    const base = (sh.hoodY || 0.84) - 0.2;
    V.column.position.y = base; V.column.scale.y = Math.max(0.2, barPivot.position.y - base - 0.06);
    V.columnFoot.position.y = base + 0.02;
  }
  if (V.mirrors) V.mirrors.visible = ex.includes("mirrors");
  if (V.front) {                                     // bumper, lamps and grille ride on the nose
    const hz = sh.hood ? sh.hood[2] : 1.35, hy = sh.hoodY || 0.84;
    V.front.position.set(0, hy, 0.5 + hz * 0.58);
    V.grille.position.set(0, hy - 0.06, 0.5 + hz * 0.66);
    V.grille.visible = sh.nose !== "flat";
  }
  const era = { bogies: "bogies", chrome: "chromeHoop", roundlight: "roundLight", duallight: "dualLight", rack: "utilRack", turbo: "turboCan", spoiler: "spoiler", stripe: "stripe", mirrors: null, lightbar: null, tallshield: null, lowshield: null, smooth: null };
  for (const key of Object.values(era)) if (key && V[key]) V[key].visible = false;
  for (const e of ex) { const key = era[e]; if (key && V[key]) V[key].visible = true; }
  if (V.twoUp) V.twoUp.visible = sh.seat === "twoup";
  if (V.benchSeat) V.benchSeat.visible = sh.seat === "bench";
  const plainSeat = sh.seat !== "twoup" && sh.seat !== "bench";
  if (V.seatBase) {
    const tun = sh.tunnel || 1;
    V.seatBase.visible = plainSeat; V.seatPad.visible = plainSeat;
    V.seatBase.scale.z = tun; V.seatPad.scale.z = 1.7 * tun;
    V.seatBolster.visible = plainSeat;
    V.seatBolster.position.z = -0.78 * tun;                       // ride with the back of the seat
  }
  if (V.lightBar) V.lightBar.visible = pr.lights === "bar" || ex.includes("lightbar");
  V.track.scale.z = sd.trackLen;
  V.studs.forEach(m => m.visible = pr.track === "stud");
  V.wideSki.forEach(m => m.visible = pr.skis === "powder");
  V.carbide.forEach(m => m.visible = pr.skis === "carbide");
  const shieldKind = pr.shield !== "low" ? pr.shield : ex.includes("tallshield") ? "tall" : ex.includes("lowshield") ? "low" : "mid";
  V.shield.visible = !V.headHid;
  const shScale = shieldKind === "tall" ? 1.5 : shieldKind === "mid" ? 1.12 : 0.66;
  V.shield.scale.set(1, shScale, 1);
  V.shield.position.y = 1.06 * (1 - shScale);        // grow upward from the hood line, don't float off it
  V.guards.forEach(m => m.visible = pr.bars === "guards");
  V.riser.visible = pr.bars !== "stock";
  V.tankL.visible = pr.tankL === "fitted";
  V.tankR.visible = pr.tankR === "fitted";
  const turbo = ex.includes("turbo") || pr.clutch === "turbo";
  V.raceCan.visible = pr.can === "race" && !turbo;
  if (V.trailCan) V.trailCan.visible = pr.can === "trail" && !turbo;
  if (V.turboCan) V.turboCan.visible = turbo;
  if (V.paddles) { V.paddles.visible = pr.track === "paddle"; V.hardpack.visible = pr.track === "trail"; }
  if (V.coilKit) {
    V.coilKit.visible = V.coilKitRear.visible = pr.susp === "coil";
    V.longKit.visible = V.longKitRear.visible = pr.susp === "long";
    V.clutchKit.visible = pr.clutch !== "stock";
    const hz = sh.hood ? sh.hood[2] : 1.35, hyy = sh.hoodY || 0.84, hsy = sh.hood ? sh.hood[1] : 0.55;
    for (const g of [V.hoodScoop, V.turboScoop]) g.position.set(0, hyy + 0.52 * hsy * 0.83 - 0.02, 0.5 + 0.52 * hz * 0.55);
    V.hoodScoop.visible = pr.clutch === "bigbore";
    V.turboScoop.visible = pr.clutch === "turbo";
  }
  V.rackBox.visible = pr.rack === "box";
  for (const k of ["helmet", "beanie", "mask", "heated"]) (V.head[k] || []).forEach(m => m.visible = false);
  (V.head[gr.head] || V.head.helmet).forEach(m => m.visible = true);
  if (V.visor) V.visor.material = gr.head === "heated" ? (V.visorHeated || (V.visorHeated = new THREE.MeshStandardMaterial({ color: 0x1b3b4a, roughness: 0.05, metalness: 0.6, emissive: 0x0d2b38, emissiveIntensity: 0.6 }))) : V.visorMat;
  if (V.heatVisor) V.heatVisor.visible = gr.head === "heated";
  V.boots.forEach(m => m.visible = gr.boots !== "pac");
  V.mitts.forEach(m => m.visible = gr.gloves !== "leather");
  if (V.legs) {
    const mono = gr.jacket === "mono", thick = gr.pants === "insul" ? 1.2 : gr.pants === "shell" ? 1.08 : 1;
    const legMat = mono ? jacketMat : pantsMat;
    V.legs.forEach(g => { g.scale.set(thick, thick, 1); g.children.forEach(m => m.material = legMat); });
    V.hips.material = legMat; V.hips.scale.set(0.86 * thick, 0.72 * thick, 1.0);
    const puff = gr.jacket === "insul" ? 1.1 : mono ? 1.06 : 1;
    V.chest.scale.set(1.02 * puff, 0.92 * puff, 0.88 * puff); V.torso.scale.set(puff, 1, puff);
    V.furCollar.visible = gr.jacket === "insul" || mono;
    V.reflect.forEach(m => m.visible = mono);
    V.kneePads.forEach(m => m.visible = gr.pants === "shell");
    V.bootCuff.forEach(m => m.visible = gr.boots === "arctic");
    V.heatBand.forEach(m => m.visible = gr.gloves === "heated");
  }
  if (V.headHid && V.headAll) V.headAll.forEach(m => m.visible = false);
  else if (V.neck) V.neck.visible = true;
  if (V.headHid && V.furCollar) V.furCollar.visible = false;
  const deck = pr.rack === "stretch" || pr.rack === "freight";
  V.track.scale.z = sd.trackLen * (pr.rack === "freight" ? 1.24 : deck ? 1.12 : 1);
  if (V.deck) V.deck.visible = deck;
  const nSmall = GS.load.filter(j => !j.big).length;
  if (cargoMesh) { cargoMesh.visible = nSmall > 0 && pr.rack !== "box"; cargoMesh.children.forEach((m, i) => m.visible = i < Math.max(1, nSmall) * 2); }
  if (V.rackBox) V.rackBox.visible = pr.rack === "box" && nSmall > 0;
}

/* ---------------- other riders out on the trail ---------------- */
const NPCS = [];
function buildNpcs() {
  const std = (c, r = 0.6, m = 0.05) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const kits = [{ body: 0x2f6fb0, suit: 0x1f2a36 }, { body: 0xd8c23a, suit: 0x3a2f28 }];
  const names = ["Trail groomer", "Weekender"];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group(), body = std(kits[i].body, 0.45, 0.15), dark = std(0x1a2027, 0.85),
      steel = std(0x9aa6b2, 0.35, 0.6), suit = std(kits[i].suit, 0.8), helm = std(0xe8eef4, 0.3);
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
    add(new THREE.BoxGeometry(0.42, 0.5, 0.34), suit, 0, 1.3, -0.5, 0.2);      // rider
    add(new THREE.SphereGeometry(0.19, 10, 8), helm, 0, 1.7, -0.42);
    add(new THREE.BoxGeometry(0.2, 0.06, 0.04), std(0xff2a1a, 0.4), 0, 0.68, -1.5);   // tail light
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
        const arr = obGrid.get(j * 512 + i); if (!arr) continue;
        for (const o of arr) if (Math.hypot(ax - o.x, az - o.z) < o.r + 2.4) { blocked = 1; break; }
      }
      const slope = Math.hypot(groundAt(ax + 4, az) - groundAt(ax - 4, az), groundAt(ax, az + 4) - groundAt(ax, az - 4)) / 8;
      if (Math.abs(n.x) > 1850 || Math.abs(n.z) > 1850) { npcPickTarget(n); n.avoid = Math.PI * 0.6; n.avoidT = 2.5; }
      else if (blocked || slope > 0.55 || sampleG(freshG, ax, az) < 0.1) { n.avoid = (Math.random() < 0.5 ? -1 : 1) * 0.9; n.avoidT = 0.9 + Math.random() * 0.8; }
    }
    want += n.avoid;
    n.yaw = angLerp(n.yaw, want, 1 - Math.exp(-2.2 * dt));
    const fx = Math.sin(n.yaw), fz = Math.cos(n.yaw);
    const grade = (groundAt(n.x + fx * 6, n.z + fz * 6) - groundAt(n.x, n.z)) / 6;
    const pack = 1 - clamp((depthAt(Math.round((n.x + HALF) / CELL), Math.round((n.z + HALF) / CELL)) / Math.max(0.05, freshAt(Math.round((n.x + HALF) / CELL), Math.round((n.z + HALF) / CELL)))), 0, 1);
    const target = clamp(15 + pack * 6 - Math.max(0, grade) * 22, 4, 22);
    n.spd += (target - n.spd) * (1 - Math.exp(-1.2 * dt));
    n.x = clamp(n.x + fx * n.spd * dt, -1900, 1900);
    n.z = clamp(n.z + fz * n.spd * dt, -1900, 1900);
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
  if (near !== GS.near && near) toast(near === garageSite ? "Hollis Sled & Service. Press E for sleds, parts and kit." : near === depot ? "Hollis Ranger Station. Warm up, refuel, press E for work." : `${near.name}. Warm stove inside.`);
  GS.near = near;
  const night = 1 - dayFactor(), elev = clamp((groundAt(P.x, P.z) - 90) / 120, 0, 1);
  const cold = (0.3 + 0.35 * night + 0.9 * GS.storm + 0.35 * elev) * ST.coldMul;
  if (elev > 0.5 && ST.warm < 7 && !GS.kitWarned) { GS.kitWarned = true; toast("You're under-dressed for this altitude. The garage sells warmer kit.", "warn"); }
  if (near) { GS.warmth = Math.min(100, GS.warmth + 12 * dt); GS.coldWarned = false; } else GS.warmth -= cold * dt;
  if (GS.warmth < 30 && !GS.coldWarned) { GS.coldWarned = true; toast("You're freezing. Get to a cabin or the station.", "bad"); }
  if (GS.warmth <= 0) { blackout("cold"); return; }
  if (near === depot || near === garageSite) { GS.fuel = Math.min(GS.cap, GS.fuel + 6 * dt); GS.outWarned = GS.lowWarned = false; }
  if (GS.fuel < GS.cap * 0.2 && !GS.lowWarned && GS.fuel > 0) { GS.lowWarned = true; toast("Fuel low. Stick to packed trail, it burns less.", "warn"); }
  if (GS.fuel <= 0 && !GS.outWarned) { GS.outWarned = true; toast("Out of fuel. Press F to call a tow ($100).", "bad"); }
  if (near && spd < 4 && GS.load.some(j => j.dest === near)) deliver(near);
  if (near && spd < 4 && GS.groomJob && GS.groomJob.dest === near) finishGroom(near);
  const busy = GS.load.length || GS.groomJob;
  for (const s of SITES) if (s.beacon) s.beacon.visible = busy ? (GS.load.some(j => j.dest === s) || (GS.groomJob && GS.groomJob.dest === s)) : (s === depot && near !== depot);
  const relay = SITES[SITES.length - 1]; if (relay.blink) relay.blink.visible = (gameClock % 1.6) < 0.5;

  GS.smokeT += dt;
  if (GS.smokeT > 0.15) {
    GS.smokeT = 0;
    for (const s of SITES) if (s.chimney && Math.hypot(P.x - s.x, P.z - s.z) < 220) { const [x, y, z] = s.chimney; emit(x, y, z, windU.uWind.value.x * 0.8, 0.9, windU.uWind.value.y * 0.8, 0.35, 3.2); }
  }
  updNpcs(dt);
  groomT += dt; if (groomT > 2.5) { groomT = 0; updGroom(); }
  refill(); fadeTrails(dt);
  $("frost").style.opacity = (clamp((40 - GS.warmth) / 40, 0, 1) * 0.95).toFixed(3);
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
  if (GS.load.length) {
    let best = 1e9;
    for (const j of GS.load) { const d = Math.hypot(j.dest.x - P.x, j.dest.z - P.z); if (d < best) { best = d; tgt = j.dest; } }
  } else if (GS.groomJob) tgt = groomTarget();
  const dx = tgt.x - P.x, dz = tgt.z - P.z, dist = Math.hypot(dx, dz);
  const rel = Math.atan2(dx, dz) - camState.yaw;
  $("arrow").style.transform = `rotate(${(-rel * 180 / Math.PI).toFixed(1)}deg)`;
  $("arrow").style.color = !SITES.includes(tgt) ? "#ff8a3a" : tgt !== depot ? "var(--signal)" : "var(--ice)";
  if (GS.load.length) {
    const j = GS.load.find(x => x.dest === tgt);
    $("jobTitle").textContent = `${j.cargo} → ${tgt.name}${GS.load.length > 1 ? "  (" + GS.load.length + " aboard)" : ""}`;
    const g = groom[tgt.id];
    $("jobSub").textContent = `${fmtMi(dist)} · $${j.pay}${j.big ? " · " + Math.round(j.cond) + "% condition" : ""}${g !== undefined ? " · " + groomLabel(g) : ""}${j.fragile ? " · fragile" : ""}${j.due ? " · due " + fmtTime(j.due) + (GS.hour > j.due ? (j.priority ? " (late — bond lost)" : " (late)") : "") : ""}${GS.groomJob ? " · grooming " + Math.round(groomFrac(GS.groomJob) * 100) + "%" : ""}`;
  } else if (GS.groomJob) {
    const g = GS.groomJob, fr = groomFrac(g);
    $("jobTitle").textContent = `Grooming → ${g.dest.name}`;
    $("jobSub").textContent = `${Math.round(fr * 100)}% of the line · ${fr >= 0.9 ? "finish at the cabin" : fr >= 0.7 ? "enough to sign off, more pays more" : "arrow points at the next gap"} · $${g.pay} · due ${fmtTime(g.due)}${GS.hour > g.due ? " (late)" : ""}${GS.own.parts.hitch !== "groomer" ? " · no groomer hitched!" : ""}`;
  } else if (GS.near === depot) { $("jobTitle").textContent = "Hollis Ranger Station"; $("jobSub").textContent = "Press E for the job board"; }
  else { $("jobTitle").textContent = "No cargo"; $("jobSub").textContent = `Head back to the station · ${fmtMi(dist)}`; }
  const wx = GS.stormPhase === "storm" ? "Storm" : GS.warned ? "Storm coming" : "Clear";
  $("clock").textContent = `${fmtTime(GS.hour)} · ${wx} · $${GS.cash}${godAny() ? " · GOD" : ""}`;
  $("rig").textContent = `${sledDef().name}${TOW.kind ? " + " + (TOW.kind === "groomer" ? "groomer" : TOW.kind) : ""} · kit ${ST.warm.toFixed(1)}`;
  $("fuelFill").style.width = (GS.fuel / GS.cap * 100).toFixed(1) + "%"; $("fuelV").textContent = GS.fuel.toFixed(1) + " L";
  $("fuelFill").classList.toggle("low", GS.fuel < GS.cap * 0.2);
  $("warmFill").style.width = clamp(GS.warmth, 0, 100).toFixed(1) + "%"; $("warmV").textContent = Math.round(Math.max(0, GS.warmth)) + "%";
  $("warmFill").classList.toggle("low", GS.warmth < 30);
}

/* ---------------- loop ---------------- */
const H = 1 / 120;
let last = performance.now(), acc = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (!ready) return;
  readInput(dt);
  if (started) { acc += dt; let n = 0; while (acc >= H && n < 8) { physStep(H); acc -= H; n++; } if (n === 8) acc = 0; }
  const spd = updVisuals(dt);
  if (started) updGame(dt, spd);
  updSky();
  updSpray(dt); updSparks(dt); updFlakes(dt); updPending(dt); updWobble(dt); P.dumped = Math.max(0, P.dumped - dt);
  if (started) { updAudio(spd); markMap(); }
  if (snowDirty) { snowTex.needsUpdate = true; snowDirty = false; }
  trailClock += dt; if (trailDirty && trailClock > 0.25) { trailTex.needsUpdate = true; trailDirty = false; trailClock = 0; }
  hudT += dt; if (hudT > 0.066) { hudT = 0; if (started) { updHud(spd); updGameHud(); drawMap(); if (!$("bigmap").hidden) drawBigMap(); } }
  renderer.render(scene, camera);
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
      save(); toast("The whole garage is yours. Fit it at Hollis Sled & Service.", "good");
    } },
  { id: "time", label: "Skip 3 hours", sub: () => fmtTime(GS.hour), do: () => { GS.hour += 3; } },
  { id: "storm", label: "Weather", sub: () => GS.stormPhase === "storm" ? "Storm · A to clear" : "Clear · A for a storm", do: () => {
      if (GS.stormPhase === "storm") { GS.stormPhase = "calm"; GS.stormT = 400; GS.warned = false; toast("Sky's clearing."); }
      else { GS.stormPhase = "storm"; GS.stormT = 150; GS.warned = true; toast("Storm called in.", "warn"); }
    } },
  { id: "tp", label: "Teleport", sub: () => "◀ " + SITES[godTp].name + " ▶", adjust: d => { godTp = (godTp + d + SITES.length) % SITES.length; }, do: () => godTeleport(SITES[godTp]) },
  { id: "jobs", label: "Fresh jobs on the board", do: () => { makeJobs(depot); makeContracts(depot); if (GS.boardOpen) renderBoard(); toast("New work posted at the station."); } },
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
  if (id === "lowg") G = GOD.lowg ? 5.2 : 15.5;
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
  genWorld(); computeSites();
  P.x = SPAWN.x; P.z = SPAWN.z; P.yaw = SPAWN.yaw; camState.yaw = SPAWN.yaw;
  buildFar(); buildProps(); buildSites(); buildTown(); buildTow(); load(); buildMapBg();
  buildNpcs();
  NPCS.forEach((n, i) => {                       // start them out on the map, not in your lap
    const s0 = SITES[2 + i * 2] || SITES[1];
    n.x = s0.x + 40; n.z = s0.z + 40; n.y = surf(n.x, n.z); n.yaw = Math.random() * 6.28; npcPickTarget(n);
  });
  P.y = surf(P.x, P.z);
  recenter(P.x, P.z, true);
  ready = true;
  loadSettings(); buildSettings(); buildGarageTabs();
  const btn = $("start"); btn.disabled = false; btn.textContent = "START RIDING"; $("load").textContent = GS.delivered ? `Welcome back. ${GS.delivered} deliveries, $${GS.cash} in the bank.` : "Headphones on. Throttle is W.";
  btn.focus();
  btn.addEventListener("click", () => {
    started = true; $("overlay").hidden = true;
    for (const id of ["zone", "speedo", "mapWrap", "help", "job"]) $(id).hidden = false;
    makeJobs(depot); setTimeout(() => toast("Welcome to Hollis Ranger Station. Press E for the job board."), 600);
    if (innerWidth <= 640) $("help").hidden = true;
    initAudio(); if (audio && audio.AC.state === "suspended") audio.AC.resume();
    canvas.focus();
  });
}
requestAnimationFrame(frame);
setTimeout(boot, 60);
})();
