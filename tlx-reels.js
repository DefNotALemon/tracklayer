// Tracklayer: Gram reels (goal G7, loop/HOME.md H2b). The Reels tab of tlx-gram.js: short looping clips, rendered live while the tab is up.
//
// A REEL is a saved recipe (type, seed, place, hour, storm, who posted, caption), a few dozen bytes. When it is on screen the engine PLANS it into a scene script (tlx-reelscenes.js: a camera path and
// actors that move as closed-form functions of clip time), builds a small POOLED CAST (sleds with riders, figures, a reindeer, a skier: made once, hidden except for the instant of a frame), and then
// renders one frame of the clip per displayed frame through the Gram picture machinery (tracklayer.js gramShot: the world from the clip's camera at the clip's hour and storm into a 270x480 corner of
// the drawing buffer, copied out to a 2D canvas in the same task; sky, fog, sun and shadow flags are put back, so the main view is exactly as it was). Rate capped (20 fps, 12 when slow), the main
// scene runs on behind the tablet; nothing renders unless the tablet is up on the Reels tab. Snow spray, roost and driving flakes are closed-form particle fields (no state, so a clip loops exactly
// and nothing is allocated per frame). The low preset (or a weak device) plays an animated painted card instead: layered 2D silhouettes that move.
//
// SAVED (inside x.sys.gram): reels = { seq, list: [ { id, t, who, vid, place, ty, sd, x, z, a, k, h, s, cap, lk, cm, sn } ... newest 40 ] }, recipes only.
(() => {
"use strict";
const CAPN = 40;
const R = window.TLXRL = { ready: false, err: "", types: {}, ms: [], calls: [], renders: 0, painted: 0, live: 0, maxLive: 0, cur: 0, play: null, E: null, fpsCap: 20, lastShot: null };
let A = null, W = null, T = null, G = null, Hh = null, scene = null;
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const frac = x => x - Math.floor(x), hashS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulb = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
R.mulb = mulb; R.hashS = hashS; R.ease = ease; R.clamp = clamp; R.lerp = lerp;
const S = () => { const g = TLX.state("gram"); return g ? g.reels : null; };
const DIM = () => A.GFX.low || A.GFX.mobile ? [180, 320] : [270, 480];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

/* ---------------- textures and materials ---------------- */
let TEX = null;
function tex() {
  if (TEX) return TEX; const mk = (n, f) => { const c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"); f(g, n); const t = new T.CanvasTexture(c); return t; };
  return (TEX = {
    soft: mk(64, (g, n) => { const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.45, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, n, n); }),
    blob: mk(64, (g, n) => { const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); r.addColorStop(0, "rgba(10,14,22,.62)"); r.addColorStop(0.55, "rgba(10,14,22,.3)"); r.addColorStop(1, "rgba(10,14,22,0)"); g.fillStyle = r; g.fillRect(0, 0, n, n); }),
    glow: mk(64, (g, n) => { const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.2, "rgba(255,255,255,.7)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, n, n); }),
    beam: mk(64, (g, n) => { const r = g.createLinearGradient(0, 0, 0, n); r.addColorStop(0, "rgba(255,255,255,.9)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, n, n); const h = g.createLinearGradient(0, 0, n, 0); h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(0.5, "rgba(0,0,0,0)"); h.addColorStop(1, "rgba(0,0,0,1)"); g.globalCompositeOperation = "destination-out"; g.fillStyle = h; g.fillRect(0, 0, n, n); })
  });
}
// a point field: position + alpha + size per point, one draw call, fogged like the world; sizes are in metres and scale with the viewport (uScale set per shot)
function pointsMat(t) {
  const u = T.UniformsUtils.merge([T.UniformsLib.fog, { uScale: { value: 300 }, uCol: { value: new T.Color(1, 1, 1) }, uMap: { value: t }, uGlow: { value: 0 } }]);
  return new T.ShaderMaterial({
    uniforms: u, fog: true, transparent: true, depthWrite: false,
    vertexShader: "attribute float aA; attribute float aS; varying float vA; uniform float uScale;\n#include <fog_pars_vertex>\nvoid main(){ vA = aA; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition; gl_PointSize = clamp(aS * uScale / max(0.1, -mvPosition.z), 0.0, 90.0);\n#include <fog_vertex>\n}",
    fragmentShader: "uniform vec3 uCol; uniform sampler2D uMap; varying float vA;\n#include <fog_pars_fragment>\nvoid main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(uCol, t.a * vA);\n#include <fog_fragment>\n}"
  });
}
function pointField(n, t) {
  const geo = new T.BufferGeometry(), pos = new Float32Array(n * 3), aA = new Float32Array(n), aS = new Float32Array(n);
  geo.setAttribute("position", new T.BufferAttribute(pos, 3)); geo.setAttribute("aA", new T.BufferAttribute(aA, 1)); geo.setAttribute("aS", new T.BufferAttribute(aS, 1));
  const m = new T.Points(geo, pointsMat(t)); m.frustumCulled = false; m.renderOrder = 9; m.visible = false; scene.add(m);
  return { m, geo, pos, aA, aS, n, u: m.material.uniforms };
}

/* ---------------- the engine: camera, effects, the cast ---------------- */
const E = R.E = {
  cam: null, t: 0, dt: 0, reset: true, tPrev: -1, em: [], nem: 0, fx: null, fl: null, flOn: false, flWind: [0, 0, 0], flBox: [14, 9, 14], flFwd: 4, sleds: [], walkers: [], deer: [], skier: null, extra: [], blobs: [], belt: 0, hide: [], ctx: null
};
const _v = () => new T.Vector3();
function engInit() {
  if (E.cam) return; const t = tex();
  E.cam = new T.PerspectiveCamera(60, 9 / 16, 0.12, 9000); E.cam.rotation.order = "YXZ";
  E.fx = pointField(1100, t.soft); E.fl = pointField(520, t.soft);
  E.rnd = new Float32Array(1100 * 4); const r = mulb(77); for (let i = 0; i < E.rnd.length; i++) E.rnd[i] = r() * 2 - 1;
  E.flb = new Float32Array(520 * 3); const r2 = mulb(91); for (let i = 0; i < E.flb.length; i++) E.flb[i] = r2();
  E.v1 = _v(); E.v2 = _v(); E.v3 = _v(); E.q1 = new T.Quaternion(); E.dn = new T.Vector3(0, -1, 0);
  E.blobGeo = new T.PlaneGeometry(1, 1); E.blobGeo.rotateX(-Math.PI / 2); E.blobMat = new T.MeshBasicMaterial({ map: t.blob, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: false });
  E.tmpO = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, on: 0, y0: 0 };
}
// the camera: eye (x, y, z) looking at (tx, ty, tz) with a vertical lens in degrees and a roll in radians
E.look = (x, y, z, tx, ty, tz, fov, roll) => { const c = E.cam; c.position.set(x, y, z); c.up.set(0, 1, 0); c.lookAt(tx, ty, tz); if (roll) c.rotateZ(roll); if (fov && Math.abs(c.fov - fov) > 1e-3) { c.fov = fov; c.updateProjectionMatrix(); } c.updateMatrixWorld(true); };
E.surf = (x, z) => W.surf(x, z);
E.nightAt = h => clamp((4 - A.sunEl(((h % 24) + 24) % 24)) / 14, 0, 1);
// the snow spray / roost / mist: an emitter is a function of its emission time te that writes where it throws from and how hard (closed form: no state, so a loop is exact and nothing is allocated)
//   spec: { n particles, life s, size0, size1 (m), a (alpha), g (gravity), drag, spread, fn(te, o) -> o.on 0..1, o.x/y/z, o.vx/vy/vz }
E.emitter = spec => { E.em[E.nem++] = spec; return spec; };
E.clearFx = () => { E.nem = 0; E.flOn = false; };
function fxUpdate(t) {
  const F = E.fx, o = E.tmpO; let k = 0;
  for (let e = 0; e < E.nem; e++) {
    const s = E.em[e], n = s.n, life = s.life, dr = s.drag || 1.6, gr = s.g === undefined ? 7 : s.g, sp = s.spread === undefined ? 1.2 : s.spread;
    for (let j = 0; j < n && k < F.n; j++, k++) {
      const age = ((((j + 0.5) / n * life - t) % life) + life) % life, te = t - age, b = (k % 275) * 4;
      if (te < 0) { F.aA[k] = 0; F.aS[k] = 0; continue; }
      o.on = 0; s.fn(te, o);
      if (o.on <= 0.001) { F.aA[k] = 0; F.aS[k] = 0; continue; }
      const f = (1 - Math.exp(-dr * age)) / dr, u = age / life, rx = E.rnd[b] * sp, ry = (E.rnd[b + 1] * 0.5 + 0.5) * sp, rz = E.rnd[b + 2] * sp;
      F.pos[k * 3] = o.x + (o.vx + rx) * f; F.pos[k * 3 + 1] = Math.max(o.y - 0.3, o.y + (o.vy + ry) * f - 0.25 * gr * age * age); F.pos[k * 3 + 2] = o.z + (o.vz + rz) * f;
      F.aA[k] = (s.a === undefined ? 0.55 : s.a) * o.on * (1 - u) * Math.min(1, age * 8); F.aS[k] = lerp(s.size0 || 0.25, s.size1 || 0.9, u) * (0.7 + 0.3 * Math.abs(E.rnd[b + 3]));
    }
  }
  for (; k < F.n; k++) { F.aA[k] = 0; F.aS[k] = 0; }
  F.geo.attributes.position.needsUpdate = true; F.geo.attributes.aA.needsUpdate = true; F.geo.attributes.aS.needsUpdate = true;
  // driving snow: a box of flakes that follows the camera, blown along the wind, in the camera's own frame (so it fills the lens at any camera path)
  const L = E.fl;
  if (E.flOn) {
    const c = E.cam.position, fw = E.v1; E.cam.getWorldDirection(fw); const bx = E.flBox[0], by = E.flBox[1], bz = E.flBox[2], w = E.flWind, cx = c.x + fw.x * E.flFwd, cy = c.y + fw.y * E.flFwd * 0.5, cz = c.z + fw.z * E.flFwd;
    const md = (v, m) => ((v % m) + m) % m;                                                               // the flakes are fixed in the world and blown by the wind; the box of them follows the camera
    for (let i = 0; i < L.n; i++) {
      const a = E.flb[i * 3], b = E.flb[i * 3 + 1], d = E.flb[i * 3 + 2];
      L.pos[i * 3] = cx + md(a * bx + w[0] * t - cx + bx / 2, bx) - bx / 2; L.pos[i * 3 + 1] = cy + md(b * by + w[1] * t - cy + by / 2, by) - by / 2; L.pos[i * 3 + 2] = cz + md(d * bz + w[2] * t - cz + bz / 2, bz) - bz / 2;
      L.aA[i] = E.flA; L.aS[i] = E.flS * (0.6 + 0.8 * b);
    }
    L.geo.attributes.position.needsUpdate = true; L.geo.attributes.aA.needsUpdate = true; L.geo.attributes.aS.needsUpdate = true;
  }
  L.m.visible = E.flOn; F.m.visible = E.nem > 0;
}
E.flakes = (wx, wy, wz, a, s, box, fwd) => { E.flOn = true; E.flWind[0] = wx; E.flWind[1] = wy; E.flWind[2] = wz; E.flA = a === undefined ? 0.7 : a; E.flS = s === undefined ? 0.05 : s; if (box) { E.flBox[0] = box[0]; E.flBox[1] = box[1]; E.flBox[2] = box[2]; } E.flFwd = fwd === undefined ? 4 : fwd; };

/* ---------- the cast ---------- */
const JK = [0xc8322a, 0x2a6fb8, 0xe0a030, 0x2f8f5a, 0x7a3fa0, 0xd9622b, 0x1f9ba8, 0xb83a6a, 0x5a8a3a, 0x3a4a6a, 0xd8d8d0, 0xe06a2a, 0x2a2a30, 0x8a2a2a, 0x2a8a8a, 0xa08a2a];
const SLC = [0xc23a2a, 0x2a5fb0, 0xe0b020, 0x2fa05a];
function blob(sx, sz) { const m = new T.Mesh(E.blobGeo, E.blobMat); m.scale.set(sx, 1, sz); m.visible = false; m.renderOrder = 2; scene.add(m); return m; }
function buildSled(i) {
  const std = A.mesh.std, cyl = A.mesh.cyl, id = A.GS.own.sled || "scout", C = A.sledCopy(id, { body: SLC[i % SLC.length] });
  const g = new T.Group(); g.rotation.order = "YXZ"; g.visible = false; g.scale.setScalar(0.9); scene.add(g); const body = new T.Group(); g.add(body); body.add(C.g);
  const dark = std(0x1b1d20, 0.6, 0.3), rubber = std(0x101112, 0.95, 0);
  cyl(0.022, 0.026, 0.5, dark, 0, C.barY - 0.22, C.barZ + 0.075, -0.33, 0, 0, body, 8); cyl(0.015, 0.015, 0.74, dark, 0, C.barY, C.barZ, 0, 0, Math.PI / 2, body, 8);
  for (const sx of [-1, 1]) cyl(0.021, 0.021, 0.13, rubber, sx * 0.325, C.barY, C.barZ, 0, 0, Math.PI / 2, body, 8);
  const mk = (col, sz, y, z, x) => { const s = new T.Sprite(new T.SpriteMaterial({ map: tex().glow, color: col, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false })); s.position.set(x || 0, y, z); s.scale.set(sz, sz, 1); s.visible = false; body.add(s); return s; };
  const head = mk(0xfff1c0, 1.4, 0.86, 1.25), tails = [mk(0xff2a1a, 0.34, 0.7, C.zBack - 0.5 - 0.0, -0.18), mk(0xff2a1a, 0.34, 0.7, C.zBack - 0.5, 0.18)];
  const cg = new T.ConeGeometry(2.6, 16, 18, 1, true); cg.translate(0, -7.5, 0); cg.rotateX(-Math.PI / 2);
  const cone = new T.Mesh(cg, new T.MeshBasicMaterial({ map: tex().beam, color: 0xfff0c8, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false, opacity: 0.0 }));
  cone.position.set(0, 0.9, 1.3); cone.rotation.x = 0.06; cone.visible = false; body.add(cone);
  const pool = new T.Mesh(E.blobGeo, new T.MeshBasicMaterial({ map: tex().glow, color: 0xfff2d0, transparent: true, depthWrite: false, blending: T.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, fog: false })); pool.visible = false; scene.add(pool);
  const jk = JK[(i * 3 + 1) % JK.length], r = A.newWalker({ jacket: std(jk, 0.85, 0), pants: std(0x202328, 0.9, 0), trim: std(0xd8b23a, 0.7, 0) }), U = r.userData, hz = -0.24;
  r.position.set(0, C.seatAt(hz) + 0.1 - 0.93, hz); body.add(r);
  U.legs[0].rotation.set(-1.27, 0, -0.16); U.legs[1].rotation.set(-1.27, 0, 0.16); for (const s of U.shins) s.rotation.set(1.22, 0, 0); for (const a of U.ank) a.rotation.set(0.05, 0, 0);
  const a = { g, body, C, rider: r, U, hz, head, tails, cone, pool, blob: blob(1.3, 3.0), on: false, lights: 0, st: 0, lean: 0, ph: i * 1.7, x: 0, z: 0, yaw: 0, speed: 0, pitch: 0, roll: 0 };
  return a;
}
// the rider: lean forward (rad), a glance back (rad), a hand off the bar (0..1), standing on the pegs (0..1)
function poseRider(a, lean, glance, wave) {
  const U = a.U, C = a.C, r = a.rider, hz = a.hz;
  U.torso.rotation.set(lean, glance * 0.45, 0); U.head.rotation.set(-lean * 0.7 - 0.12, glance * 0.8, 0);
  for (let i = 0; i < 2; i++) {
    const sx = i ? 1 : -1, ar = U.arms[i], f = U.fore[i], wy = C.barY + 0.03 - r.position.y - 0.93, wz = C.barZ - 0.02 - hz, ly = wy * Math.cos(lean) + wz * Math.sin(lean), lz = -wy * Math.sin(lean) + wz * Math.cos(lean);
    const dx = sx * 0.325 - sx * 0.25, dy = ly - 0.53, dz = lz, L = Math.min(0.485, Math.hypot(dx, dy, dz)), l1 = 0.25, l2 = 0.24;
    const p = Math.atan2(Math.hypot(dx, dz), -dy), al = Math.acos(clamp((l1 * l1 + L * L - l2 * l2) / (2 * l1 * L), -1, 1)), ga = Math.acos(clamp((l1 * l1 + l2 * l2 - L * L) / (2 * l1 * l2), -1, 1));
    ar.rotation.set(-(p - al), Math.atan2(dx, dz), 0); f.rotation.set(-(Math.PI - ga), 0, 0);
    if (wave && i === 0) { ar.rotation.set(-2.3 - 0.35 * Math.sin(a.ph * 9), 0, 0.25); f.rotation.set(-0.5 - 0.35 * Math.sin(a.ph * 9), 0, 0); }
  }
}
// the sled: where it stands (x, z), its heading (game yaw: forward = sin, cos), its speed, its cornering lean; the track runs from the distance covered
E.sled = i => E.sleds[i];
E.placeSled = (a, x, z, yaw, speed, turn, bump, o) => {
  const fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw), y0 = W.surf(x, z), yF = W.surf(x + fx * 1.2, z + fz * 1.2), yR = W.surf(x - fx * 1.2, z - fz * 1.2), yL = W.surf(x + lx * 0.5, z + lz * 0.5), yRt = W.surf(x - lx * 0.5, z - lz * 0.5);
  const pitch = Math.atan2(yF - yR, 2.4), roll = Math.atan2(yL - yRt, 1.0), v = clamp(speed / 20, 0, 1), ph = a.ph;
  const bob = bump ? (Math.sin(E.t * 17 + ph) * 0.012 + Math.sin(E.t * 29 + ph * 2) * 0.008) * v : 0;
  a.g.position.set(x, (y0 + yF + yR) / 3 + 0.03 + bob, z); a.g.rotation.set(-pitch - (bump ? 0.012 * Math.sin(E.t * 13 + ph) * v : 0), yaw, roll);
  a.lean += (-turn * 0.28 - a.lean) * 0.35; a.body.rotation.z = a.lean; a.x = x; a.z = z; a.yaw = yaw; a.speed = speed; a.on = true;
  a.blob.position.set(x, y0 + 0.07, z); a.blob.rotation.y = yaw; a.blob.visible = true; a.blobOn = true;
  poseRider(a, 0.3 + 0.35 * v + (o && o.lean || 0), o && o.glance || 0, o && o.wave);
  a.rider.visible = !(o && o.noRider);
};
E.sledLights = (a, head, tail, night, own) => { if (head && night > 0) { const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), sp = Math.max(a.speed, 3); a.pool.position.set(a.x + fx * (4 + sp * 0.25), W.surf(a.x + fx * 5, a.z + fz * 5) + 0.1, a.z + fz * (4 + sp * 0.25)); a.pool.scale.set(4.2, 1, 9); a.pool.rotation.y = a.yaw; }
  a.head.visible = head && !own; a.head.material.opacity = 0.9; a.tails[0].visible = a.tails[1].visible = tail; a.cone.visible = !!head && night > 0; a.cone.material.opacity = 0.2 * night; a.pool.visible = !!head && night > 0; a.pool.material.opacity = 0.7 * night; };
function buildWalker(i) {
  const std = A.mesh.std, jk = std(JK[i % JK.length], 0.85, 0), pn = std([0x20262e, 0x2a2f3a, 0x3a3226, 0x1c2a3a][i % 4], 0.9, 0), tr = std(JK[(i * 5 + 3) % JK.length], 0.7, 0), sk = std(0xd9a98c, 0.7, 0);
  const g = A.newWalker({ jacket: jk, pants: pn, trim: tr, skin: sk }), U = g.userData; g.visible = false; scene.add(g);
  const ph = new T.Mesh(new T.BoxGeometry(0.075, 0.015, 0.15), new T.MeshBasicMaterial({ color: 0x0a0c10 })), sc = new T.Mesh(new T.PlaneGeometry(0.062, 0.135), new T.MeshBasicMaterial({ color: 0xcfe8ff })); sc.rotation.x = -Math.PI / 2; sc.position.y = 0.0085; ph.add(sc); ph.visible = false; U.fore[1].userData.hand.add(ph); ph.position.set(0, 0.0, 0.04);
  return { g, U, o: { x: 0, z: 0, yaw: 0, quiet: true, vol: 0 }, phone: ph, blob: blob(0.7, 0.7), on: false, ph: i * 0.77, sc: 0.85, mats: { jacket: jk, pants: pn, trim: tr, skin: sk } };
}
// a walking or standing figure at (x, z) facing game yaw `yaw`; its gait comes from the ground it really covers
E.walk = (w, x, z, yaw, scale) => {
  const o = w.o; o.x = x; o.z = z; o.yaw = yaw; if (E.reset) o.px = undefined;
  A.walkAs(w.g, o, E.reset ? 0 : E.dt || 0.04); const s = scale || w.sc; w.g.scale.setScalar(s); w.on = true;
  w.blob.position.set(x, W.surf(x, z) + 0.07, z); w.blob.visible = true; w.blobOn = true; w.phone.visible = false;
  const U = w.U; U.torso.rotation.order = "XYZ";
};
// arms up and a jump: a cheering figure (k 0..1 how high, ph the beat), a phone held up in the right hand
E.cheer = (w, k, ph, phone) => {
  const U = w.U, b = Math.sin(ph * TAU), up = k * (0.75 + 0.25 * b);
  for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1, sw = Math.sin(ph * TAU + i * 1.9) * 0.18 * k; U.arms[i].rotation.set(-(0.35 + 2.5 * up) + sw, 0, sd * (0.18 + 0.25 * up)); U.fore[i].rotation.x = -(0.25 + 0.55 * (1 - up)) - 0.3 * k * Math.abs(Math.sin(ph * TAU * 0.5)); }
  if (phone) { U.arms[1].rotation.set(-1.75, 0, 0.12); U.fore[1].rotation.x = -1.35; w.phone.visible = true; w.phone.rotation.set(-0.15, 0, 0); }
  U.torso.rotation.x = -0.05 * k + 0.03 * b; U.head.rotation.x = 0.1 * k; w.g.position.y += Math.max(0, Math.sin(ph * TAU * 2)) * 0.12 * k;
};
function buildDeer(i) {
  const Q = A.gram.quad, q = Q.make("reindeer", ""); q.g.visible = false; q.graze = 0; const tg = new T.Mesh(new T.CylinderGeometry(0.035, 0.03, 0.3, 8), new T.MeshStandardMaterial({ color: 0xd8607a, roughness: 0.5 }));
  tg.visible = false; q.head.add(tg); return { q, tongue: tg, blob: blob(1.1, 2.0), on: false };
}
E.deerPlace = (d, x, z, yaw, v, graze, dt) => { const q = d.q, y = W.surf(x, z); q.g.position.set(x, y - 0.05, z); q.g.rotation.set(0, yaw, 0); A.gram.quad.pose(q, dt === undefined ? E.dt || 0.04 : dt, v, graze || 0, 0); d.on = true; d.blob.position.set(x, y + 0.07, z); d.blob.rotation.y = yaw; d.blob.visible = true; d.blobOn = true; };
E.buildWalker = buildWalker; E.blob = blob; E.buildSled = buildSled; E.poseRider = poseRider; E.actorsShow = actorsShow; E.tex = tex;
E.prepare = need => {
  engInit(); need = need || {};
  while (E.sleds.length < (need.sled || 0)) E.sleds.push(buildSled(E.sleds.length));
  while (E.walkers.length < (need.walker || 0)) E.walkers.push(buildWalker(E.walkers.length));
  while (E.deer.length < (need.deer || 0)) E.deer.push(buildDeer(E.deer.length));
};
function actorsShow(on) {
  for (const a of E.sleds) { if (a.on) { a.g.visible = on; a.blob.visible = on && a.blobOn; a.pool.visible = on && a.pool.visible; } }
  for (const w of E.walkers) if (w.on) { w.g.visible = on; w.blob.visible = on && w.blobOn; }
  for (const d of E.deer) if (d.on) { d.q.g.visible = on; d.blob.visible = on && d.blobOn; }
  for (const o of E.extra) if (o.on) { o.m.visible = on; }
  if (!on) { for (const a of E.sleds) { a.on = false; a.blobOn = false; a.pool.visible = false; a.blob.visible = false; a.cone.visible = false; } for (const w of E.walkers) { w.on = false; w.blobOn = false; w.blob.visible = false; w.phone.visible = false; } for (const d of E.deer) { d.on = false; d.blobOn = false; d.blob.visible = false; d.tongue.visible = false; } for (const o of E.extra) { o.on = false; o.m.visible = false; } if (E.skierOn) { E.skierOn = false; if (window.TLXSK && TLXSK.shotDone) TLXSK.shotDone(); } E.fx && (E.fx.m.visible = false, E.fl.m.visible = false); }
}
// a misc mesh that exists only for the frame (a skiff, a plow, a sledge, a lighthouse beam): E.extraOf(key, build) builds it once; the scene sets o.m.position etc. and o.on = true
E.extraOf = (key, build) => { let o = E.extra.find(q => q.key === key); if (!o) { const m = build(); m.visible = false; scene.add(m); o = { key, m, on: false }; E.extra.push(o); } o.on = true; return o; };
E.ext = (o) => { o.on = true; return o; };

/* ---------------- one frame of a clip ---------------- */
let _stamp = 0;
function pre(bw, bh) {  if (E.lit) E.lit(bw, bh);                                                                                  // inside the shot: the spray's scale for this viewport, its colour from the sky's fog
  const k = bh / (2 * Math.tan(E.cam.fov * Math.PI / 360)), f = A.scene.fog, c = f && f.color ? f.color : null; if (E.fogD && f) f.density = E.fogD;
  for (const P of [E.fx, E.fl]) { P.u.uScale.value = k; if (c) { const dl = A.dayFactor(); P.u.uCol.value.setRGB(lerp(c.r, 1, 0.4) * (0.5 + 0.4 * dl), lerp(c.g, 1, 0.4) * (0.5 + 0.4 * dl), lerp(c.b, 1, 0.4) * (0.52 + 0.42 * dl)); } }
}
function renderAt(Sc, t, cv, g) {
  const t0 = performance.now(); engInit();
  E.dt = E.tPrev >= 0 && t >= E.tPrev && t - E.tPrev < 0.3 ? t - E.tPrev : 0; E.reset = E.tPrev < 0 || t < E.tPrev || t - E.tPrev >= 0.3; E.tPrev = t; E.t = t;
  E.clearFx(); const belt0 = window.TLXL && TLXL.sled && TLXL.sled.beltU ? TLXL.sled.beltU.value : null;
  E.fogD = Sc.fog || 0; Sc.frame(t, E);
  if (belt0 !== null) TLXL.sled.beltU.value = E.belt;
  fxUpdate(t); actorsShow(true);
  const c0 = A.renderer.info.render.calls; let ok = false;
  try { ok = A.gram.shot({ cam: E.cam, hour: Sc.hour, storm: Sc.storm, w: cv.width, h: cv.height, ctx: g, noShadow: true, pre }); }
  finally { actorsShow(false); if (E.litOff) E.litOff(); if (belt0 !== null) TLXL.sled.beltU.value = belt0; }
  E.reset = false; R.calls.push(A.renderer.info.render.calls); if (R.calls.length > 60) R.calls.shift();
  if (ok) { if (Sc.post) Sc.post(g, t, cv.width, cv.height, E); vignette(g, cv.width, cv.height, Sc); }
  const ms = performance.now() - t0; R.ms.push(ms); if (R.ms.length > 90) R.ms.shift(); R.renders++;
  return ok;
}
function vignette(g, w, h, Sc) {
  const r = g.createRadialGradient(w / 2, h * 0.5, h * 0.3, w / 2, h * 0.5, h * 0.78); r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(4,8,14," + (Sc && Sc.vig !== undefined ? Sc.vig : 0.38) + ")"); g.fillStyle = r; g.fillRect(0, 0, w, h);
}
R.renderAt = renderAt;
// a still of a reel at clip time t (the tests': plans once, then draws; consecutive times (under 0.3 s apart) keep the walkers' gait going)
R.shotAt = (rec, t) => {
  const key = rec.id + ":" + rec.ty + ":" + rec.sd + ":" + rec.x; if (!R._sa || R._sa.key !== key) { const Sc = planOf(rec); if (!Sc) return null; E.prepare(Sc.need); if (Sc.setup) Sc.setup(E); R._sa = { key, Sc }; E.tPrev = -1; }
  const cv = R.canvas(); return renderAt(R._sa.Sc, t, cv, R.g) ? cv : null;
};
// n frames across the clip, stepping the clip 0.05 s at a time so motion is continuous; returns jpeg data URLs
R.strip = (rec, n, stepS) => {
  R._sa = null; const first = R.shotAt(rec, 0); if (!first) return null; const Sc = R._sa.Sc, step = stepS || 0.05, out = [], marks = []; for (let i = 0; i < n; i++) marks.push(Math.round(i / (n - 1) * (Sc.dur - step) / step) * step);
  let k = 0; for (let t = 0; t < Sc.dur - 1e-6 && k < n; t += step) { const cv = R.shotAt(rec, t); if (cv && Math.abs(t - marks[k]) < step / 2) { out.push(cv.toDataURL("image/jpeg", 0.88)); k++; } }
  return out;
};
R.beamTex = () => tex().beam;
R.canvas = () => { const d = DIM(); if (!R.cv || R.cv.width !== d[0] || R.cv.height !== d[1]) { R.cv = document.createElement("canvas"); R.cv.width = d[0]; R.cv.height = d[1]; R.g = R.cv.getContext("2d"); } return R.cv; };

/* ---------------- the painted card: layered silhouettes that move (the low preset and a weak device) ---------------- */
function paintCard(rec, t, cv, g) {
  const w = cv.width, h = cv.height, ty = R.types[rec.ty] || {}, hr = ((rec.h % 24) + 24) % 24, el = (() => { try { return A.sunEl(hr); } catch (e) { return 5; } })(), day = clamp((el + 8) / 14, 0, 1), st = rec.s || 0;
  const mix = (a, b, k) => Math.round(a + (b - a) * k), night = 1 - day;
  const top = [mix(14, 90, day), mix(22, 130, day), mix(54, 190, day)], bot = [mix(40, 200, day), mix(52, 190, day), mix(86, 210, day)], gr = g.createLinearGradient(0, 0, 0, h * 0.62);
  const sf = 1 - st * 0.35; gr.addColorStop(0, `rgb(${top[0] * sf | 0},${top[1] * sf | 0},${top[2] * sf | 0})`); gr.addColorStop(1, el > -4 && el < 6 ? `rgb(${230 * day + 25 | 0},${150 * day + 40 | 0},${120 * day + 50 | 0})` : `rgb(${bot[0] * sf | 0},${bot[1] * sf | 0},${bot[2] * sf | 0})`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const rd = mulb(hashS(rec.ty + rec.id)), sp = (ty.pspeed || 14);
  if (night > 0.4) { g.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 40; i++) g.fillRect(rd() * w, rd() * h * 0.5, 1.2, 1.2); }
  if (ty.pk === "aurora" || (night > 0.6 && rec.ty === "aurora")) for (let i = 0; i < 3; i++) { const ag = g.createLinearGradient(0, 0, 0, h * 0.5); ag.addColorStop(0, "rgba(80,255,170,0)"); ag.addColorStop(0.5, `rgba(80,255,170,${0.3 - i * 0.06})`); ag.addColorStop(1, "rgba(80,255,170,0)"); g.fillStyle = ag; g.beginPath(); g.moveTo(0, h * 0.1); for (let x = 0; x <= w; x += 10) g.lineTo(x, h * (0.2 + 0.04 * i) + Math.sin(x * 0.035 + i + t * 0.7) * 18); g.lineTo(w, h * 0.5); g.lineTo(0, h * 0.5); g.fill(); }
  for (let L = 0; L < 3; L++) { const hz = h * (0.5 + 0.04 * L), off = (t * sp * (0.15 + 0.2 * L)) % 200, c = [60 + 30 * L, 80 + 30 * L, 110 + 25 * L].map(v => Math.round(v * (0.3 + 0.7 * day) * (1 - 0.1 * st))); g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.beginPath(); g.moveTo(0, h); for (let x = -20; x <= w + 20; x += 12) g.lineTo(x, hz - 30 - 26 * Math.sin((x + off) * 0.021 + L * 2) - 18 * Math.sin((x + off) * 0.057 + L)); g.lineTo(w, h); g.fill(); }
  g.fillStyle = `rgb(${mix(70, 235, day)},${mix(80, 240, day)},${mix(105, 250, day)})`; g.fillRect(0, h * 0.64, w, h * 0.36);
  g.strokeStyle = `rgba(${mix(40, 160, day)},${mix(50, 170, day)},${mix(70, 190, day)},.45)`; g.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const y = h * (0.67 + 0.055 * i), off = (t * sp * (1 + i * 0.5)) % 40; g.beginPath(); for (let x = -40; x <= w + 40; x += 40) { g.moveTo(x - off, y); g.lineTo(x - off + 22, y); } g.stroke(); }
  const ink = `rgba(${mix(8, 20, day)},${mix(12, 28, day)},${mix(20, 40, day)},.9)`; g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 3;
  const k = h / 480, tt = t % (ty.dur || 6), bobY = Math.sin(t * 9) * 2 * k;
  const sled = (x, y, s, dir) => { g.save(); g.translate(x, y); g.scale(dir * s, s); g.beginPath(); g.moveTo(-34, 0); g.lineTo(30, 0); g.lineTo(36, -9); g.lineTo(10, -14); g.lineTo(-4, -22); g.lineTo(-10, -12); g.lineTo(-34, -10); g.fill(); g.beginPath(); g.arc(-8, -32, 6, 0, TAU); g.fill(); g.fillRect(-14, -28, 12, 18); g.restore(); g.fillStyle = "rgba(255,255,255,.7)"; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(x - dir * (40 + i * 11 * s) , y - 4 * s - ((tt * 30 + i * 9) % 18) * s * 0.7, 3 + i * 0.8, 0, TAU); g.fill(); } g.fillStyle = ink; };
  const fig = (x, y, s, up) => { g.beginPath(); g.arc(x, y - 30 * s, 7 * s, 0, TAU); g.fill(); g.fillRect(x - 6 * s, y - 24 * s, 12 * s, 24 * s); g.fillRect(x - 6 * s, y, 5 * s, 14 * s); g.fillRect(x + 1 * s, y, 5 * s, 14 * s); g.lineWidth = 4 * s; g.beginPath(); g.moveTo(x - 6 * s, y - 20 * s); g.lineTo(x - 14 * s, y - (up ? 40 : 8) * s); g.moveTo(x + 6 * s, y - 20 * s); g.lineTo(x + 14 * s, y - (up ? 40 : 8) * s); g.stroke(); };
  const pk = ty.pk || rec.ty;
  if (pk === "summit" || pk === "nightski" || pk === "kids" || pk === "plow") fig(w * 0.5 + Math.sin(t * 0.9) * 8, h * 0.9 + bobY, 2.4 * k, pk === "kids");
  else if (pk === "stormride" || pk === "race" || pk === "watch" || pk === "skip" || pk === "powder") { const x = ((tt / (ty.dur || 6)) * (w + 140)) - 70; sled(pk === "stormride" ? w * 0.5 : x, h * (pk === "stormride" ? 0.84 : 0.8 + 0.03 * Math.sin(t)), 1.5 * k, 1); if (pk === "race") sled(x - 30, h * 0.9, 1.6 * k, 1); }
  else if (pk === "deer") { g.beginPath(); g.ellipse(w * 0.5, h * 0.92, 70 * k, 38 * k, 0, 0, TAU); g.fill(); const hy = h * 0.66 + Math.sin(t * 2) * 6; g.beginPath(); g.arc(w * 0.5, hy, 26 * k, 0, TAU); g.fill(); g.beginPath(); g.moveTo(w * 0.5 - 8, hy - 20 * k); g.lineTo(w * 0.5 - 24, hy - 70 * k); g.moveTo(w * 0.5 + 8, hy - 20 * k); g.lineTo(w * 0.5 + 24, hy - 70 * k); g.stroke(); g.fillStyle = "rgba(220,110,130,.9)"; g.beginPath(); g.ellipse(w * 0.5, hy + 22 * k + Math.sin(t * 6) * 6, 8 * k, 16 * k, 0, 0, TAU); g.fill(); }
  else if (pk === "light") { g.fillRect(w * 0.45, h * 0.46, w * 0.1, h * 0.2); g.beginPath(); g.moveTo(w * 0.43, h * 0.46); g.lineTo(w * 0.5, h * 0.4); g.lineTo(w * 0.57, h * 0.46); g.fill(); g.fillStyle = "rgba(255,244,190,.55)"; const a = Math.sin(t * 1.4); g.beginPath(); g.moveTo(w * 0.5, h * 0.43); g.lineTo(w * (0.5 + 0.8 * a), h * 0.38); g.lineTo(w * (0.5 + 0.8 * a), h * 0.48); g.fill(); }
  else if (pk === "sea") { g.fillStyle = `rgb(${mix(20, 40, day)},${mix(40, 90, day)},${mix(70, 130, day)})`; g.fillRect(0, h * 0.62, w, h * 0.38); g.fillStyle = ink; g.save(); g.translate(w * 0.5, h * 0.84 + Math.sin(t * 2.2) * 8); g.rotate(Math.sin(t * 2.2 + 1) * 0.08); g.beginPath(); g.moveTo(-70, -12); g.lineTo(90, -28); g.lineTo(70, 6); g.lineTo(-60, 10); g.fill(); g.restore(); }
  if (st > 0.25) { g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 1.4; g.beginPath(); for (let i = 0; i < 80 * st; i++) { const x = (rd() * w + t * 160) % w, y = (rd() * h + t * 190) % h; g.moveTo(x, y); g.lineTo(x - 9, y + 12); } g.stroke(); }
  vignette(g, w, h, { vig: 0.3 });
}
R.paintCard = paintCard;

/* ---------------- the store: recipes only ---------------- */
function sane(gs) {
  const num = Number.isFinite; let r = gs.reels; if (!r || typeof r !== "object" || Array.isArray(r)) r = gs.reels = { seq: 0, list: [] };
  if (!Array.isArray(r.list)) r.list = []; if (!num(r.seq)) r.seq = 0;
  r.list = r.list.filter(q => q && typeof q === "object" && num(q.id) && num(q.t) && typeof q.ty === "string" && R.types[q.ty] && num(q.x) && num(q.z) && num(q.h) && typeof q.cap === "string").slice(-CAPN);
  for (const q of r.list) { if (!num(q.a)) q.a = 0; if (!num(q.sd)) q.sd = 1; if (!num(q.s)) q.s = 0; if (!Array.isArray(q.cm)) q.cm = []; q.cm = q.cm.filter(c => Array.isArray(c) && typeof c[1] === "string").slice(0, 4); if (!num(q.lk)) q.lk = 3; q.place = String(q.place || ""); q.sn = q.sn ? 1 : 0; if (q.k !== undefined && typeof q.k !== "string" && !num(q.k)) delete q.k; }
  r.seq = Math.max(r.seq, ...r.list.map(q => q.id), 0); return r;
}
R.sane = sane;
const list = () => { const s = S(); return s ? s.list : []; };
R.list = () => list().slice().reverse();     // every land's reels, newest first (Reels is the whole world; Local asks for one region)
R.landName = rg => ({ nordkinn: "The Nordkinn" })[rg || "nordkinn"] || String(rg).replace(/^./, c => c.toUpperCase());                                                                  // newest first
R.unseen = () => list().filter(q => !q.sn && q.who !== "you").length;
function add(o) {
  const s = S(), ty = R.types[o.ty]; if (!s || !ty) return null;
  const p = o.who && o.who !== "you" ? Hh.who(o.who) : null;
  const rec = { id: ++s.seq, t: Math.round((o.t === undefined ? A.GS.hour : o.t) * 100) / 100, who: o.who || null, vid: o.vid || (p ? p.vid : null), place: o.place || "", ty: o.ty, sd: o.sd || 1, rg: o.rg || (window.TLX ? TLX.region() : "nordkinn"), x: Math.round(o.x * 10) / 10, z: Math.round(o.z * 10) / 10, a: Math.round((o.a || 0) * 100) / 100, h: Math.round(o.h * 100) / 100, s: Math.round(clamp(o.s || 0, 0, 1) * 100) / 100, cap: o.cap, sn: 0 };
  if (o.k !== undefined) rec.k = o.k; if (o.ev) rec.ev = o.ev;
  rec.cm = o.cm || (p ? Hh.comments({ place: rec.place, n: 0 }, p, "reel") : []); rec.lk = Math.round(Hh.likesOf({ id: rec.id + 5000, cm: rec.cm }, p) * 1.4);
  s.list.push(rec); if (s.list.length > CAPN) s.list.splice(0, s.list.length - CAPN);
  R.last = rec; R.log.push({ id: rec.id, ty: rec.ty, who: rec.who, t: rec.t, cap: rec.cap }); if (R.log.length > 300) R.log.splice(0, 100);
  if (R.active() && R.cur > 0) R.cur++;                                                                  // a new reel on top does not move the one you are watching
  if (G.view.tab === "reels" && A.TABLET.open && A.TABLET.app === "gram") A.TABLET.refresh("gram");
  return rec;
}
R.log = []; R.add = add;

/* ---------------- planning and the generator ---------------- */
const planOf = rec => { const ty = R.types[rec.ty]; if (!ty) return null; try { engInit(); E.prepare(ty.need); const Sc = ty.plan(rec, E); return Sc; } catch (e) { console.error("TLX reel plan", e); R.err = String(e && e.stack || e); return null; } };
R.plan = planOf;
// a reel for this person at this hour, of the type that fits (weights by interests and conditions), at a place that passes the type's own composition check
function genOne(H, p, only) {
  const c = Hh.ctxFor(p, H), keys = only ? [only] : Object.keys(R.types), ws = keys.map(k => R.types[k].fit && !R.types[k].fit(p) ? 0 : Math.max(0, (R.types[k].weight(c) || 0)));
  const tot = ws.reduce((a, b) => a + b, 0); if (tot <= 0) return null;
  for (let tr = 0; tr < 4; tr++) {
    let r = Hh.rnd() * tot, ki = 0; for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) { ki = i; break; } }
    const key = keys[ki], ty = R.types[key], sd = 1 + Math.floor(Hh.rnd() * 2147483000), an = ty.anchor(c, mulb(sd));
    if (!an) { ws[ki] = 0; if (ws.reduce((a, b) => a + b, 0) <= 0) return null; continue; }
    const vars = Hh.varsFor(key, c, p), rec0 = { ty: key, sd, x: an.x, z: an.z, a: an.a || 0, k: an.k, h: an.h !== undefined ? an.h : H, s: an.s !== undefined ? an.s : c.storm, id: 0, t: H };
    if (ty.check) { const sc = planOf(Object.assign({ id: 1 }, rec0)); if (!sc || (ty.check(sc, rec0) === false)) continue; }
    const recent = list().slice(-12).map(q => q.cap); let cap = ""; for (let k2 = 0; k2 < 8; k2++) { cap = Hh.flavor(p, ty.cap(c, vars, mulb(sd + k2)), true); if (!recent.includes(cap)) break; }
    return add({ who: p.id, t: H, vid: p.vid, place: an.place || p.village, ty: key, sd, x: an.x, z: an.z, a: an.a, k: an.k, h: rec0.h, s: rec0.s, cap, ev: an.ev });
  }
  return null;
}
R.genOne = genOne;
// each game hour: now and then somebody posts a reel
function genHour(H) {
  const el = A.sunEl(((H % 24) + 24) % 24), day = el > -10, n = Hh.rnd() < (day ? 0.5 : 0.3) ? 1 : 0;
  for (let i = 0; i < n; i++) { const p = Hh.pickPerson(H); if (p) { try { genOne(H, p); } catch (e) { console.error("TLX reel gen", e); R.err = String(e && e.stack || e); } } }
}
R.genHour = genHour;
// the bus: a storm sets the sled people out, a herd draws a camera, a night ski, a plowed road, the polar night's first dark
function fromBus(ev, b) {
  try {
    const s = S(); if (!s) return; const k = ev.kind, d = ev.data || {}; let only = null, p = null, prob = 0;
    if (k === "storm" && d.what === "start") { only = "stormride"; prob = 0.6; }
    else if (k === "wildlife" && d.kind === "reindeer") { only = "reindeer"; prob = 0.5; }
    else if (k === "ski" && A.sunEl(((ev.t % 24) + 24) % 24) < -6) { only = "nightski"; prob = 0.5; p = ev.who && ev.who !== "you" ? Hh.who(ev.who) : null; }
    else if (k === "road" && d.sys === "plow") { only = "plowwall"; prob = 0.7; }
    else if (k === "sky") { only = "aurora"; prob = 0.3; }
    if (!only || Hh.rnd() > prob) return;
    const vid = b.vid, ppl = TLXN.peopleIn(vid).filter(q => q.age > 14 && q.age < 80 && (!only || R.types[only].fit(q)));
    p = p || (ppl.length ? Hh.pick(ppl) : null); if (!p) return; genOne(ev.t, p, only);
  } catch (e) { console.error("TLX reel bus", e); R.err = String(e && e.stack || e); }
}
R.fromBus = fromBus;

/* ---------------- playing ---------------- */
const tabOpen = () => A.TABLET.open && A.TABLET.app === "gram" && G.view.tab === "reels";
R.active = () => !!R.play;
R.wantPlay = tabOpen;
R.current = () => { const L = R.list(); return L[clamp(R.cur, 0, Math.max(0, L.length - 1))] || null; };
function stop() { if (R.play) { R.play = null; } actorsShow(false); E.tPrev = -1; R.live = 0; }
R.stop = stop;
function start(rec) {
  stop(); if (!rec) return false; R.live = 1; R.planned = (R.planned || 0) + 1; R.maxLive = Math.max(R.maxLive, R.live);
  const Sc = planOf(rec); if (!Sc) { R.play = { rec, Sc: null, fail: true, t0: performance.now(), last: 0 }; return false; }
  try { E.prepare(Sc.need); if (Sc.setup) Sc.setup(E); } catch (e) { console.error("TLX reel setup", e); R.err = String(e && e.stack || e); R.play = { rec, Sc: null, fail: true, t0: performance.now(), last: 0 }; return false; }
  R.play = { rec, Sc, t0: performance.now(), last: 0, frames: 0, t: 0 }; E.tPrev = -1; R.cv = null;
  if (!rec.sn) { rec.sn = 1; }
  return true;
}
R.start = start;
const cost = () => { const a = R.ms.slice(-24); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; };
R.cost = cost;
R.paintedNow = () => A.GFX.low || A.GFX.mobile || R.force === "paint" || (R.slow >= 3 && R.force !== "real");
function blitTo(cv) { const el = document.getElementById("rlCv"); if (!el) return; if (el.width !== cv.width || el.height !== cv.height) { el.width = cv.width; el.height = cv.height; } el.getContext("2d").drawImage(cv, 0, 0); }
R.frameNow = () => {                                                                                      // draw the playing reel's frame for this moment (the tick's job, callable by a test)
  const P = R.play; if (!P) return false; const cv = R.canvas(), g = R.g, now = performance.now(), dur = P.Sc ? P.Sc.dur : 6, t = ((now - P.t0) / 1000) % dur;
  P.t = t; let real = false;
  if (P.Sc && !R.paintedNow()) real = renderAt(P.Sc, t, cv, g);
  if (!real) { paintCard(P.rec, t, cv, g); R.painted++; R.lastKind = "paint"; } else R.lastKind = "real";
  blitTo(cv); P.frames++; P.last = now; return real;
};
R.tick = dt => {
  if (!R.ready) return; if (!tabOpen() || G.view.reelHold) { if (R.play) stop(); return; }
  const L = R.list(); if (!L.length) { if (R.play) stop(); return; }
  const rec = R.current(); if (!R.play || R.play.rec.id !== rec.id) { start(rec); }
  const P = R.play; if (!P) return; const now = performance.now();
  if (!A.started() || !document.getElementById("rlCv")) return;
  const fps = R.paintedNow() ? 12 : (R.slow >= 1 ? 12 : R.fpsCap);
  if (now - P.last < 1000 / fps - 2) return;
  if (G.fpsOk === false && !R.force) return;
  R.frameNow();
  if (R.lastKind === "real") { const c = cost(); if (R.ms.length >= 20) { if (c > 34) R.slow = (R.slow || 0) + 0.08; else if (c > 18) R.slow = Math.max(R.slow || 0, 1); else R.slow = Math.max(0, (R.slow || 0) - 0.02); } }
};
R.go = n => {                                                                                              // next (+1: older) and previous (-1) reel
  const L = R.list(); if (!L.length) return false; const i = clamp(R.cur + n, 0, L.length - 1); if (i === R.cur) return false;
  R.cur = i; stop(); G.view.reelHold = false; A.TABLET.refresh("gram"); return true;
};
R.slow = 0;

/* ---------------- the tab ---------------- */
const SHOWN = { tag: "Seen on the Nordkinn" };
function renderTab(el, ui) {
  const L = R.list(); const H = ui.height || 420;
  if (!L.length) { el.innerHTML = `<div class="gcol" style="height:${H}px">${ui.tabs}<p class="tnote2" style="padding:18px">No reels yet. People post them now and then; give the day a few hours.</p></div>`; return; }
  R.cur = clamp(R.cur, 0, L.length - 1); const rec = L[R.cur], ty = R.types[rec.ty], p = rec.who === "you" ? null : Hh.who(rec.who), handle = p ? "@" + p.handle : "@nordkinn", D = DIM();
  const bh = H - ui.tabsH, bw = Math.min(el.clientWidth || 360, Math.floor(bh * 9 / 16));
  const cms = rec.cm.slice(0, 2).map(([pid, t]) => { const c = Hh.who(pid); return `<div class="gcm"><b>${esc(c ? c.first : "?")}</b> ${esc(t)}</div>`; }).join("");
  el.innerHTML = `<div class="gcol" style="height:${H}px">${ui.tabs}<div class="rlbox" style="height:${bh}px"><button type="button" class="rlv" data-tf="rl:v" data-rlv="1" style="width:${bw}px;height:${bh}px" aria-label="Reel ${R.cur + 1} of ${L.length}"><canvas id="rlCv" width="${D[0]}" height="${D[1]}"></canvas>
    <span class="rlc">${R.cur + 1} / ${L.length}</span><span class="rlland">${esc(R.landName(rec.rg))}</span>
    <div class="rlov rlt"><div class="gph">${ui.avatar(p)}<div class="gwho"><b>${esc(handle)}<i class="gchip">${esc(ty.chip)}</i></b><span>${esc(rec.place || "")} · ${ui.ago(rec.t)}</span></div></div></div>
    <div class="rlov rlb"><div class="gcap">${esc(rec.cap)}</div><div class="gmeta">${rec.lk || 0} likes${rec.cm.length ? " · " + rec.cm.length + " comment" + (rec.cm.length > 1 ? "s" : "") : ""}</div>${cms}</div></button></div></div>`;
  const v = el.querySelector(".rlv"); if (v) {
    let y0 = null, x0 = 0; v.addEventListener("pointerdown", e => { y0 = e.clientY; x0 = e.clientX; });
    v.addEventListener("pointerup", e => { if (y0 === null) return; const dy = e.clientY - y0, dx = e.clientX - x0; y0 = null; if (Math.abs(dy) > 36 && Math.abs(dy) > Math.abs(dx) * 1.2) R.go(dy < 0 ? 1 : -1); });
    v.addEventListener("wheel", e => { e.preventDefault(); if (!R.wheelT || performance.now() - R.wheelT > 350) { R.wheelT = performance.now(); R.go(e.deltaY > 0 ? 1 : -1); } }, { passive: false });
  }
  const s = S(); if (s) rec.sn = 1;
}
R.renderTab = renderTab;
R.css = `#tabS .rlbox{display:flex;justify-content:center;background:#04080e}#tabS .rlv{position:relative;display:block;padding:0;border:0;background:#06101a;cursor:pointer;touch-action:none;overflow:hidden}#tabS .rlv.tfoc{outline:2px solid var(--bandline);outline-offset:-2px}
#tabS .rlv canvas{display:block;width:100%;height:100%;object-fit:cover}#tabS .rlc{position:absolute;right:8px;top:8px;font-size:11px;padding:2px 7px;border-radius:99px;background:rgba(0,0,0,.55);color:#dfe9f2}#tabS .rlland{position:absolute;right:8px;top:30px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:rgba(20,60,90,.7);color:#bfe2ff}
#tabS .rlov{position:absolute;left:0;right:0;text-align:left;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.8)}#tabS .rlt{top:0;padding:8px 10px 24px;background:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,0))}#tabS .rlb{bottom:0;padding:26px 10px 10px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.7))}#tabS .rlb .gcap{font-size:13px;line-height:1.3}#tabS .rlb .gmeta,#tabS .rlb .gcm{font-size:11px;opacity:.9}#tabS .rlov .gwho span{color:#d8e6f2}`;
// keyboard, d-pad and the right stick all arrive as TABLET.move(dx, dy): on the reel, up and down are previous and next; anywhere else the tablet moves its cursor as always
function hookMove() {
  const TB = A.TABLET; if (TB.__reelMove) return; const mv = TB.move; TB.__reelMove = true;
  TB.move = function (dx, dy) { try { if (tabOpen() && this.focus === "rl:v" && dy) { const n = R.list().length; if (dy > 0 && R.cur < n - 1) { R.go(1); this.focus = "rl:v"; return; } if (dy < 0 && R.cur > 0) { R.go(-1); this.focus = "rl:v"; return; } } } catch (e) { console.error("TLX reel nav", e); } return mv.call(this, dx, dy); };
}
R.init = (api, gram, helpers) => {
  A = api; W = api.world; T = api.THREE; G = gram; Hh = helpers; R.H = helpers; R.A = api; scene = api.scene; R.ready = false; R.err = ""; R.play = null; R.cur = 0; R.slow = 0;
  try {
    if (!document.getElementById("reelCss")) { const st = document.createElement("style"); st.id = "reelCss"; st.textContent = R.css; document.head.appendChild(st); }
    hookMove(); R.ready = true;
  } catch (e) { R.err = String(e && e.stack || e); console.error("TLX reels", e); }
};
})();
