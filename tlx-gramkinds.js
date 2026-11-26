// Tracklayer: Gram's moments (goal G7, loop/HOME.md H2R). The table of kinds of post and the stagecraft that makes each one a picture.
//
// A KIND is one row of TLXGK.kinds: when it can happen (w), where and with whom (anchor), the scene it stages (plan), and the words that go with
// it (cap lines, comment pools). plan(rec, E) returns the same kind of scene script the reels play (tlx-reelscenes.js): { dur, need, hour, storm,
// frame(t, E) } plus `still` (the clip time of the peak: a photo is that one frame) and `light` (the shot's light plan). So one row can carry both
// a still and, in H2R-b, a clip. The recipe a post saves is only { k, w (people ids), x, z, a, h, s, sd, v } and plan() rebuilds the scene from it.
//
// The stagecraft is here too: people dressed from their ids (jacket, beanie, skin), poses (a selfie arm, two hands holding a catch, a grin, a snowball
// throw), small props built from boxes and cylinders (fish, thermos, sausage stick, fire, snowman, snow lantern, kicksled...), and the places a kind
// can be set (a lookout, the coast, a door, a slope, a trail, a road, a gapahuk) found from the world.
(() => {
"use strict";
const K = window.TLXGK = { kinds: {}, FAMS: ["people", "action", "animals", "sea", "weather", "cosy", "funny"], ready: false, err: "" };
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, sstep = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const hashS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulb = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
K.mulb = mulb;
const GH = () => window.TLXGR.H, A = () => GH().A, W = () => GH().A.world, T = () => GH().A.THREE, E_ = () => window.TLXRL.E;
const surf = (x, z) => W().surf(x, z);
const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);                                      // a game yaw: forward = (sin, cos)
const landOk = (x, z) => !W().isSea(x, z) && !W().isWater(x, z) && W().groundAt(x, z) > 1;
const openOk = (x, z, r) => landOk(x, z) && !W().obNear(x, z, r === undefined ? 2 : r);
const sunEl = h => A().sunEl(((h % 24) + 24) % 24);
const pickR = (r, a) => a[Math.floor(r() * a.length)];

/* ================= people: dressed from their ids, posed ================= */
const JACKETS = [0xc8322a, 0x2a6fb8, 0xe0a030, 0x2f8f5a, 0x7a3fa0, 0xd9622b, 0x1f9ba8, 0xb83a6a, 0x4a7a3a, 0x3a4a8a, 0xd8d8d0, 0xe06a2a, 0x8a2a2a, 0x2a8a8a];
const PANTS = [0x20262e, 0x2a2f3a, 0x3a3226, 0x1c2a3a, 0x2c2c2c];
const BEANIES = [0xb0302a, 0xe8e0d0, 0x2a5a9a, 0xe0a52a, 0x3c6a3a, 0x6a3a7a, 0xd8602a, 0x1f1f24, 0xc84a7a, 0x3a8a9a];
const SKINS = [0xf0c8b0, 0xe8b898, 0xdcab8c, 0xd09a7a, 0xc88a6a, 0xf2d0b8, 0xe0b090];
const lookOf = p => { const h = hashS(p.id || "x"), kid = p.age < 16; return { jk: JACKETS[h % JACKETS.length], pn: PANTS[(h >>> 4) % PANTS.length], bn: BEANIES[(h >>> 7) % BEANIES.length], tr: JACKETS[(h >>> 11) % JACKETS.length], sk: SKINS[(h >>> 14) % SKINS.length], warm: !!((h >>> 18) & 1), sc: kid ? clamp(0.5 + 0.026 * p.age, 0.6, 0.85) : (0.84 + 0.05 * ((h >>> 20) % 5) / 4) * (p.age > 75 ? 0.96 : 1) }; };
K.lookOf = lookOf;
const _col = new Map();
function recolor(root, hex) { const seen = new Set(); root.traverse(o => { if (o.isMesh && o.material && !seen.has(o.material)) { seen.add(o.material); o.material.color.setHex(hex); } }); }
let _skk = null; const SKINK = () => _skk || (_skk = new (T().Color)(0.76, 0.58, 0.47));
function dress(w, p, o) {
  const L = lookOf(p), M = w.mats, U = w.U; o = o || {};
  M.jacket.color.setHex(o.jk || L.jk); M.pants.color.setHex(L.pn); M.trim.color.setHex(L.tr);
  const all = U.headParts.all; for (const g of all) g.visible = false;                                   // [helmet, goggles, goggM, faceBase, face, beanie, mask, warm]
  all[4].visible = true; all[5].visible = true; all[7].visible = !!o.warm;
  const bk = w.bnKey !== L.bn + (o.bn || 0); if (bk) { w.bnKey = L.bn + (o.bn || 0); recolor(all[5], o.bn || L.bn); if (all[7]) recolor(all[7], 0x3a3f48); }
  if (M.skin) { M.skin.color.setHex(L.sk).multiply(SKINK()); if (!M.skin.emissive) M.skin.emissive = new (T().Color)(); M.skin.emissive.setHex(L.sk).multiplyScalar(0.03); }       // the kit's skin map is pale: tint it to the person's real tone, nothing self-lit
  if (!w.nocull) { w.nocull = 1; w.g.traverse(o => { o.frustumCulled = false; }); w.skinStale = 1; }
  w.look = L; w.kid = p.age < 14; return L;
}
function stand(w, o) {                                                                                 // a relaxed standing figure: arms down a little, head level
  const U = w.U; o = o || {};
  U.torso.rotation.set(o.lean || 0, o.turn || 0, 0); U.head.rotation.set(o.nod || 0, o.look || 0, o.tilt || 0);
  for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1; U.arms[i].rotation.set(0.04, 0, sd * 0.1); U.fore[i].rotation.set(-0.18, 0, 0); }
  w.phone.visible = false;
}
// a face laid on the head for the frame: eyes with brows, cold-red cheeks and a smile (a laugh, wide, with teeth and squinting eyes). The kit's face is plain, and at feed size a selfie needs these.
// Unlit flat shapes just off the head's surface (they stay readable at night); k is the smile (0..1.4), the laugh squints the eyes.
function grin(w, k) {
  if (!w.smile) { const t = T(), g = new t.Group(), lipM = new t.MeshBasicMaterial({ color: 0x74383a, side: t.DoubleSide }), dk = new t.MeshBasicMaterial({ color: 0x4a1c1e }), tt = new t.MeshBasicMaterial({ color: 0xf0ece4 });
    const Z = 0.0975, line = new t.Mesh(new t.RingGeometry(0.0235, 0.0275, 20, 1, Math.PI * 1.13, Math.PI * 0.74), lipM); line.position.set(0, -0.034, Z); g.add(line);                 // [0] the smile line
    const teeth = new t.Mesh(new t.PlaneGeometry(0.026, 0.0052), tt); teeth.position.set(0, -0.0522, 0.0988); g.add(teeth);                                             // [1] teeth of a slightly open smile
    const open = new t.Mesh(new t.CircleGeometry(0.0195, 14, Math.PI * 1.09, Math.PI * 0.82), dk); open.position.set(0, -0.0455, 0.0982); g.add(open); open.visible = false; const rim = new t.Mesh(new t.RingGeometry(0.0195, 0.0228, 14, 1, Math.PI * 1.09, Math.PI * 0.82), lipM); rim.position.set(0, -0.0455, 0.0983); open.add(rim); rim.position.set(0, 0, 0.0001); open.userData.rim = 1;      // slightly open mouth, rimmed by the lip
    const wide = new t.Mesh(new t.CircleGeometry(0.024, 16, Math.PI, Math.PI), dk); wide.position.set(0, -0.0485, 0.0985); g.add(wide); wide.visible = false;                 // a kid's laugh
    const tng = new t.Mesh(new t.CircleGeometry(0.0125, 12, Math.PI, Math.PI), new t.MeshBasicMaterial({ color: 0xcf6a78 })); tng.position.set(0, -0.0575, 0.099); g.add(tng); tng.visible = false;
    const lt = new t.Mesh(new t.PlaneGeometry(0.036, 0.0066), tt); lt.position.set(0, -0.0475, 0.0992); g.add(lt); lt.visible = false;
    g.userData.open = open; g.userData.wide = wide; g.userData.tng = tng; g.userData.lt = lt; w.smile = g; w.U.headParts.all[4].parent.add(g);
    if (!K._cheek) { const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d"), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(206,104,98,0.9)"); gr.addColorStop(0.55, "rgba(206,104,98,0.35)"); gr.addColorStop(1, "rgba(206,104,98,0)"); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); K._cheek = new t.CanvasTexture(c); }
    const f = new t.Group(), wh = new t.MeshBasicMaterial({ color: 0xeeece6 }), ir = new t.MeshBasicMaterial({ color: 0x3a2618 }), pu = new t.MeshBasicMaterial({ color: 0x120a08 }), bw = new t.MeshBasicMaterial({ color: 0x3a2a20 }), ch = new t.MeshBasicMaterial({ map: K._cheek, transparent: true, opacity: 0.4, depthWrite: false });
    f.userData.eyes = [];
    for (const s of [-1, 1]) {
      const eg = new t.Group(); eg.position.set(s * 0.036, 0.016, 0.0985); eg.rotation.y = s * 0.34; const e1 = new t.Mesh(new t.CircleGeometry(0.0155, 14), wh), e2 = new t.Mesh(new t.CircleGeometry(0.0098, 12), ir), e3 = new t.Mesh(new t.CircleGeometry(0.0052, 10), pu); e2.position.set(0, -0.001, 0.0007); e3.position.set(0, -0.001, 0.0012); eg.add(e1, e2, e3); f.add(eg); f.userData.eyes.push(eg);
      const br = new t.Mesh(new t.PlaneGeometry(0.034, 0.0075), bw); br.position.set(s * 0.038, 0.0405, 0.0955); br.rotation.set(0, s * 0.4, -s * 0.16); f.add(br);
      const c = new t.Mesh(new t.CircleGeometry(0.03, 14), ch); c.position.set(s * 0.057, -0.021, 0.0895); c.rotation.y = s * 0.72; f.add(c);
    }
    w.faceFx = f; w.U.headParts.all[4].parent.add(f); }
  if (!w.kid && k > 1.1) k = 1.1;                                                                       // only a child laughs open-mouthed; grown-ups smile
  const laugh = k > 1.15, u = w.smile.userData, opn = !laugh && k > 0.78; w.smile.visible = k > 0; w.smile.children[0].visible = !laugh && !opn; w.smile.children[1].visible = opn; u.open.visible = opn; u.wide.visible = laugh; u.tng.visible = laugh; u.lt.visible = laugh;
  w.smile.scale.set(0.9 + 0.2 * Math.min(k, 1.1), 0.8 + 0.3 * Math.min(k, 1.1), 1);
  w.faceFx.visible = true; for (const e of w.faceFx.userData.eyes) e.scale.set(1, laugh ? 0.4 : 1, 1);
}
K.faceOff = w => { if (w.faceFx) w.faceFx.visible = false; if (w.smile) w.smile.visible = false; };
K.grin = grin;
// an arm to a point in torso space (x right-to-left of the figure's own x axis, y up, z forward), by two-bone IK like the riders' (shoulder at x = +-0.21, y = 0.53)
function armTo(w, i, tx, ty, tz) {
  const U = w.U, sd = i ? 1 : -1, dx = tx - sd * 0.21, dy = ty - 0.53, dz = tz, l1 = 0.25, l2 = 0.24, L = Math.min(0.485, Math.hypot(dx, dy, dz));
  const p = Math.atan2(Math.hypot(dx, dz), -dy), al = Math.acos(clamp((l1 * l1 + L * L - l2 * l2) / (2 * l1 * L), -1, 1)), ga = Math.acos(clamp((l1 * l1 + l2 * l2 - L * L) / (2 * l1 * l2), -1, 1));
  U.arms[i].rotation.set(-(p - al), Math.atan2(dx, dz), 0); U.fore[i].rotation.set(-(Math.PI - ga), 0, 0);
}
K.armTo = armTo; K.stand = stand; K.dress = dress;
function sit(w, seatTop, o) {                                                                         // seated: thighs forward, shins down, pelvis on the seat
  const U = w.U, sc = w.g.scale.x; o = o || {};
  w.g.position.y = seatTop - 0.83 * sc + (o.dy || 0);
  U.legs[0].rotation.set(-1.45, 0, -0.14); U.legs[1].rotation.set(-1.45, 0, 0.14); for (const s of U.shins) s.rotation.set(1.5, 0, 0); for (const a of U.ank) a.rotation.set(0.1, 0, 0);
  U.torso.rotation.set(o.lean || 0.06, 0, 0);
}
K.sit = sit;
const _v1 = () => new (T().Vector3)();
function headPos(w, out) { w.g.updateMatrixWorld(true); out.set(0, 0.1, 0.02); w.U.head.localToWorld(out); return out; }
K.headPos = headPos;
function person(E, slot, p, x, z, yaw, o) {
  const w = E.walkers[slot]; o = o || {}; const L = dress(w, p, o); const rs = E.reset, dt = E.dt; w.o.px = undefined; w.o.sp = 0; w.o.hgV = 0; E.reset = false; E.dt = 0.05; E.walk(w, x, z, yaw, o.sc || L.sc); E.walk(w, x, z, yaw, o.sc || L.sc); E.reset = rs; E.dt = dt; stand(w, o); w.g.position.y += o.dy || 0; grin(w, o.smile === undefined ? 0.5 : o.smile); return w;
}
K.person = person;
// mark what the shot is of, for the composition check: head top and feet of a figure, a point, and the faces that must be to the camera
function markFig(E, w, face) {
  const L = headPos(w, _v1()); const s = w.g.scale.x; const m = E.marks; m.push([L.x, L.y + 0.13 * s, L.z], [w.g.position.x, w.g.position.y + 0.02, w.g.position.z]);
  if (face !== false) E.faces.push({ x: L.x, y: L.y, z: L.z, yaw: w.o.yaw });
}
K.markFig = markFig;
function begin(E) { E.marks = []; E.faces = []; E.needH = 0.25; E.moonDir = null; E.forceAur = false; }
K.begin = begin;

/* ================= props: small things built from boxes, cylinders and balls ================= */
const MAT = {};
function mat(key, c, r, m, extra) { return MAT[key] || (MAT[key] = A().mesh.std(c, r === undefined ? 0.7 : r, m === undefined ? 0 : m, extra)); }
function glowMat(key, col, op) { if (MAT[key]) return MAT[key]; const t = T(); return (MAT[key] = new t.SpriteMaterial({ map: E_().tex().glow, color: col, transparent: true, depthWrite: false, blending: t.AdditiveBlending, fog: false, opacity: op === undefined ? 1 : op })); }
function ell(g, mt, rx, ry, rz, x, y, z, rot) { const t = T(), m = new t.Mesh(new t.SphereGeometry(1, 14, 10), mt); m.scale.set(rx, ry, rz); m.position.set(x, y, z); if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0); g.add(m); return m; }
function bx(g, mt, w, h, d, x, y, z, rot) { const t = T(), m = new t.Mesh(new t.BoxGeometry(w, h, d), mt); m.position.set(x, y, z); if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0); g.add(m); return m; }
function cy(g, mt, rt, rb, h, x, y, z, rot, seg) { const t = T(), m = new t.Mesh(new t.CylinderGeometry(rt, rb, h, seg || 10), mt); m.position.set(x, y, z); if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0); g.add(m); return m; }
function glow(g, key, col, size, x, y, z, op) { const t = T(), s = new t.Sprite(glowMat(key, col, op)); s.scale.set(size, size, 1); s.position.set(x, y, z); g.add(s); return s; }
const PB = {};                                                                                           // prop builders: each returns a Group; the origin is on the ground, +z forward
PB.fish = (o) => { const g = new (T().Group)(), sk = mat("fishB", 0x7a8a6a, 0.45, 0.1), bel = mat("fishW", 0xe6e2d0, 0.5, 0), fin = mat("fishF", 0x5a6a4a, 0.6, 0), eye = mat("fishE", 0x0c0c0c, 0.3, 0.2);
  ell(g, sk, 0.075, 0.09, 0.3, 0, 0, 0); ell(g, bel, 0.062, 0.05, 0.27, 0, -0.045, 0.01); const tl = bx(g, fin, 0.016, 0.17, 0.12, 0, 0, -0.34, [0.2, 0, 0]); tl.scale.set(1, 1, 1);
  bx(g, fin, 0.012, 0.06, 0.1, 0, 0.09, -0.04, [0.3, 0, 0]); bx(g, fin, 0.01, 0.05, 0.09, 0, -0.085, -0.1, [-0.3, 0, 0]);
  for (const s of [-1, 1]) { ell(g, eye, 0.012, 0.012, 0.012, s * 0.062, 0.02, 0.2); bx(g, fin, 0.07, 0.01, 0.05, s * 0.08, -0.04, 0.11, [0, s * 0.5, s * 0.3]); }
  bx(g, mat("fishM", 0x2a1010, 0.5, 0, {}), 0.05, 0.01, 0.03, 0, -0.03, 0.29); g.scale.setScalar(o && o.s || 1); return g; };
PB.thermos = () => { const g = new (T().Group)(); cy(g, mat("thB", 0x2a6a9a, 0.4, 0.5), 0.045, 0.045, 0.24, 0, 0.12, 0, null, 14); cy(g, mat("thC", 0xc8c8c8, 0.3, 0.8), 0.046, 0.046, 0.05, 0, 0.265, 0, null, 14); cy(g, mat("thS", 0xb8b8b8, 0.3, 0.8), 0.048, 0.048, 0.02, 0, 0.04, 0, null, 14); return g; };
PB.cup = () => { const g = new (T().Group)(); cy(g, mat("cupB", 0xe8e4da, 0.45, 0), 0.04, 0.032, 0.07, 0, 0.035, 0, null, 14); cy(g, mat("cupC", 0x4a2a14, 0.6, 0), 0.036, 0.036, 0.004, 0, 0.068, 0, null, 14); bx(g, mat("cupB", 0xe8e4da), 0.012, 0.04, 0.012, 0.05, 0.04, 0); return g; };
PB.stick = () => { const g = new (T().Group)(); cy(g, mat("stickW", 0x8a6a3a, 0.9, 0), 0.007, 0.006, 0.9, 0, 0, 0.45, [Math.PI / 2, 0, 0], 6); ell(g, mat("sausage", 0xb8503a, 0.6, 0), 0.017, 0.017, 0.075, 0, 0, 0.8); return g; };
PB.fire = () => { const t = T(), g = new t.Group(), lg = mat("logB", 0x3a2616, 0.95, 0), fl = ["fireA", "fireB", "fireC"].map((k, i) => new t.MeshBasicMaterial({ color: [0xff7a18, 0xffb02e, 0xfff0a0][i], transparent: true, opacity: [0.85, 0.9, 0.95][i], depthWrite: false, fog: false }));
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; cy(g, lg, 0.045, 0.05, 0.7, Math.cos(a) * 0.16, 0.1, Math.sin(a) * 0.16, [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9], 7); }
  if (!K._flame) { const c = document.createElement("canvas"); c.width = 64; c.height = 128; const x = c.getContext("2d"); x.beginPath(); x.moveTo(32, 126); x.bezierCurveTo(2, 118, 6, 70, 30, 40); x.bezierCurveTo(30, 28, 34, 16, 36, 3); x.bezierCurveTo(40, 22, 44, 34, 48, 52); x.bezierCurveTo(62, 76, 62, 118, 32, 126); x.closePath();
    const gr = x.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, "rgba(255,244,180,0.98)"); gr.addColorStop(0.35, "rgba(255,176,60,0.92)"); gr.addColorStop(0.75, "rgba(255,96,24,0.7)"); gr.addColorStop(1, "rgba(220,50,10,0)"); x.fillStyle = gr; x.fill(); K._flame = new t.CanvasTexture(c); }
  [[0.5, 1.0, 0, 0xff6a1a, 0.9], [0.4, 0.82, 0.06, 0xff9a2a, 0.92], [0.34, 0.7, -0.07, 0xffb43a, 0.95], [0.26, 0.5, 0.02, 0xffe27a, 0.95], [0.16, 0.3, 0, 0xfff6c8, 0.95]].forEach(([w, h, dx, col, op], i) => { const sp = new t.Sprite(new t.SpriteMaterial({ map: K._flame, color: col, transparent: true, opacity: op, depthWrite: false, fog: false })); sp.scale.set(w, h, 1); sp.position.set(dx, 0.18 + h / 2, 0); sp.userData.b = [w, h, dx]; g.add(sp); });
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; ell(g, mat("stone", 0x6a6e72, 0.95, 0), 0.1, 0.07, 0.1, Math.cos(a) * 0.42, 0.04, Math.sin(a) * 0.42); }
  glow(g, "fireG", 0xff9a3a, 3.0, 0, 0.7, 0, 0.5); const pool = new t.Mesh(E_().blobGeo, new t.MeshBasicMaterial({ map: E_().tex().glow, color: 0xff8a2a, transparent: true, depthWrite: false, blending: t.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, fog: false, opacity: 0.8 })); pool.scale.set(5, 1, 5); pool.position.y = 0.08; g.add(pool); return g; };
PB.tail = () => { const g = new (T().Group)(); bx(g, mat("carDk", 0x20262e, 0.8, 0), 1.7, 0.75, 4, 0, 0.7, 0); bx(g, mat("carDk", 0x20262e, 0.8, 0), 1.5, 0.5, 2, 0, 1.25, 0.3); for (const s of [-1, 1]) { glow(g, "tailG", 0xff2a1a, 1.5, s * 0.65, 0.85, -2.05, 0.95); glow(g, "tailH", 0xff3a24, 4.2, s * 0.65, 0.85, -2.1, 0.35); } return g; };
PB.logseat = () => { const g = new (T().Group)(), lg = mat("logS", 0x5a3c22, 0.95, 0); cy(g, lg, 0.2, 0.2, 1.1, 0, 0.2, 0, [0, 0, Math.PI / 2], 10); cy(g, mat("logE", 0xc8a070, 0.9, 0), 0.19, 0.19, 0.01, 0.56, 0.2, 0, [0, 0, Math.PI / 2], 10); return g; };
PB.plasticSled = (o) => { const g = new (T().Group)(), m = mat("psl" + ((o && o.c) || 0), (o && o.c) || 0xd8352a, 0.5, 0.05); const b = bx(g, m, 0.5, 0.05, 0.85, 0, 0.08, 0, [0, 0, 0]); bx(g, m, 0.5, 0.14, 0.05, 0, 0.14, 0.43, [-0.3, 0, 0]); for (const s of [-1, 1]) bx(g, m, 0.04, 0.1, 0.8, s * 0.26, 0.12, 0); cy(g, mat("rope", 0x2a2a2a, 0.9), 0.006, 0.006, 0.6, 0, 0.18, 0.7, [1.2, 0, 0], 5); return g; };
PB.kicksled = () => { const g = new (T().Group)(), wd = mat("ksW", 0x7a4a2a, 0.7, 0), sl = mat("ksS", 0xb8b8b8, 0.4, 0.7), seat = mat("ksT", 0x2a5a8a, 0.6, 0);
  for (const s of [-1, 1]) { bx(g, sl, 0.025, 0.02, 1.1, s * 0.2, 0.03, 0.05); bx(g, wd, 0.03, 0.4, 0.03, s * 0.2, 0.22, -0.3, [0.1, 0, 0]); bx(g, wd, 0.03, 0.45, 0.03, s * 0.2, 0.25, 0.3, [-0.1, 0, 0]); bx(g, sl, 0.025, 0.02, 0.2, s * 0.2, 0.03, 0.62, [-0.5, 0, 0]); }
  bx(g, seat, 0.44, 0.04, 0.42, 0, 0.42, 0.08); bx(g, wd, 0.5, 0.025, 0.025, 0, 0.98, -0.35); for (const s of [-1, 1]) bx(g, wd, 0.025, 0.58, 0.025, s * 0.24, 0.71, -0.35); bx(g, wd, 0.44, 0.03, 0.2, 0, 0.12, -0.5); return g; };
PB.skis = () => { const g = new (T().Group)(), sk = mat("skiB", 0xd8d8d0, 0.5, 0.1), tp = mat("skiT", 0xc8322a, 0.5, 0.1);
  for (const s of [-1, 1]) { bx(g, sk, 0.05, 1.7, 0.012, s * 0.07, 0.8, 0, [0, 0, s * 0.03]); bx(g, tp, 0.05, 0.3, 0.014, s * 0.07, 1.58, 0, [0, 0, s * 0.03]); } for (const s of [-1, 1]) cy(g, mat("pole", 0x2a2a2a, 0.5, 0.4), 0.007, 0.007, 1.3, s * 0.3, 0.62, 0.05, [0.05, 0, s * 0.08], 5); return g; };
PB.snowman = (o) => { const g = new (T().Group)(), sm = mat("snow", 0xf2f6fa, 0.95, 0), s = o && o.s || 1, car = mat("carrot", 0xe07a1a, 0.6, 0), coal = mat("coal", 0x151515, 0.9, 0);
  ell(g, sm, 0.34 * s, 0.3 * s, 0.34 * s, 0, 0.27 * s, 0); ell(g, sm, 0.25 * s, 0.23 * s, 0.25 * s, 0, 0.7 * s, 0); ell(g, sm, 0.18 * s, 0.17 * s, 0.18 * s, 0, 1.05 * s, 0);
  cy(g, car, 0, 0.022 * s, 0.14 * s, 0, 1.05 * s, 0.2 * s, [Math.PI / 2, 0, 0], 6); for (const x of [-1, 1]) ell(g, coal, 0.018 * s, 0.018 * s, 0.018 * s, x * 0.065 * s, 1.1 * s, 0.155 * s); for (let i = 0; i < 4; i++) ell(g, coal, 0.016 * s, 0.016 * s, 0.016 * s, (i - 1.5) * 0.035 * s, 0.995 * s + Math.abs(i - 1.5) * 0.008 * s, 0.168 * s);
  const hat = o && o.hat; if (hat) { cy(g, mat("hatB", hat, 0.8, 0), 0.12 * s, 0.14 * s, 0.1 * s, 0, 1.2 * s, 0, null, 12); cy(g, mat("hatB", hat, 0.8, 0), 0.17 * s, 0.17 * s, 0.012 * s, 0, 1.15 * s, 0, null, 12); }
  const sc = o && o.scarf; if (sc) { cy(g, mat("scf" + sc, sc, 0.9, 0), 0.19 * s, 0.19 * s, 0.05 * s, 0, 0.91 * s, 0, null, 12); }
  for (const x of [-1, 1]) cy(g, mat("twig", 0x4a3420, 0.9, 0), 0.008, 0.008, 0.4 * s, x * 0.34 * s, 0.72 * s, 0, [0, 0, x * 1.0], 4); return g; };
PB.lantern = () => { const t = T(), g = new t.Group(), sm = mat("snowLw", 0xd8dde6, 0.95, 0), tiers = [[9, 0.30, 0.10], [8, 0.27, 0.28], [7, 0.22, 0.45], [5, 0.15, 0.60], [1, 0, 0.72]];                 // a cone of snowballs with gaps between them and a candle inside: the light comes out through the gaps
  for (let k = 0; k < tiers.length; k++) { const [n, rr, y] = tiers[k]; for (let i = 0; i < n; i++) { const a = i / n * TAU + k * 0.35; ell(g, sm, 0.105, 0.1, 0.105, Math.cos(a) * rr, y, Math.sin(a) * rr); } }
  ell(g, new t.MeshBasicMaterial({ color: 0xffb040, fog: false }), 0.2, 0.3, 0.2, 0, 0.3, 0); const gm = new t.SpriteMaterial({ map: E_().tex().glow, color: 0xffa040, transparent: true, depthWrite: false, depthTest: false, blending: t.AdditiveBlending, fog: false, opacity: 0.85 });
  for (const [sz, y, op] of [[0.8, 0.32, 0.4], [2.0, 0.3, 0.1]]) { const sp = new t.Sprite(gm.clone()); sp.material.opacity = op; sp.scale.set(sz, sz, 1); sp.position.set(0, y, 0); g.add(sp); } return g; };
PB.woodpile = () => { const t = T(), g = new t.Group(), bark = [mat("wood", 0x6e5234, 0.95, 0), mat("wood2", 0xcfc8ba, 0.9, 0)], end = [mat("woodE", 0xd9b77c, 0.9, 0), mat("woodE2", 0xc79f62, 0.9, 0)], post = mat("wpR", 0x4a4036, 0.9, 0), snow = mat("snowL", 0xe8f0f8, 0.95, 0);   // split birch stacked between two posts, the ends to the lens (+z), a plank roof with snow on it
  const R = 0.085; for (let r = 0; r < 8; r++) for (let c = 0; c < 14 - (r % 2); c++) { const k = (r * 7 + c * 3) % 5, m = new t.Mesh(new t.CylinderGeometry(R * (0.86 + 0.05 * (k % 3)), R * (0.86 + 0.05 * (k % 3)), 0.6, 7), [bark[k % 2 ? 0 : 1], end[k % 2], end[(k + 1) % 2]]); m.rotation.set(Math.PI / 2, 0, k * 0.9); m.position.set((c - 6.5 + (r % 2) * 0.5) * R * 2.02, R + r * R * 1.76, 0.02 * ((k % 3) - 1)); g.add(m); }
  bx(g, post, 0.09, 1.65, 0.09, -1.28, 0.82, 0); bx(g, post, 0.09, 1.65, 0.09, 1.28, 0.82, 0); bx(g, post, 2.9, 0.05, 0.95, 0, 1.62, 0.05, [0.16, 0, 0]); bx(g, snow, 2.8, 0.16, 0.9, 0, 1.72, 0.04, [0.16, 0, 0]); ell(g, snow, 1.5, 0.12, 0.5, 0, 0.02, 0.45); return g; };
PB.glove = () => { const g = new (T().Group)(), gm = mat("gloveR", 0xd8352a, 0.9, 0); bx(g, gm, 0.1, 0.12, 0.035, 0, 0.1, 0); for (let i = 0; i < 4; i++) bx(g, gm, 0.022, 0.08, 0.03, (i - 1.5) * 0.026, 0.2, 0, [0, 0, (i - 1.5) * 0.08]); bx(g, gm, 0.025, 0.07, 0.03, 0.07, 0.12, 0, [0, 0, -0.9]); return g; };
PB.post = (o) => { const g = new (T().Group)(), w = mat("fenceW", 0x7a6a58, 0.95, 0); const h = o && o.h || 1.2; bx(g, w, 0.1, h, 0.1, 0, h / 2, 0); bx(g, mat("fenceCap", 0xe8eef2, 0.95, 0), 0.12, 0.05, 0.12, 0, h + 0.02, 0); return g; };
PB.rail = (o) => { const g = new (T().Group)(), m = mat("railM", 0x8a9099, 0.45, 0.6), n = o && o.n || 6; for (let i = 0; i < n; i++) bx(g, m, 0.05, 1.0, 0.05, (i - (n - 1) / 2) * 0.9, 0.5, 0); bx(g, m, n * 0.9, 0.06, 0.06, 0, 1.0, 0); bx(g, m, n * 0.9, 0.04, 0.04, 0, 0.55, 0); return g; };
PB.table = () => { const g = new (T().Group)(), w = mat("tblW", 0x9a7a4a, 0.85, 0), cl = mat("tblC", 0xe8e0d0, 0.9, 0); bx(g, w, 1.6, 0.05, 0.7, 0, 0.78, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, w, 0.06, 0.78, 0.06, sx * 0.74, 0.39, sz * 0.3); bx(g, cl, 1.62, 0.015, 0.72, 0, 0.81, 0);
  for (let i = 0; i < 3; i++) cy(g, mat("plate" + i, [0xe8e8e0, 0xd8b068, 0xc8a050][i], 0.6, 0), 0.16, 0.14, 0.03 + i * 0.012, -0.5 + i * 0.5, 0.84 + i * 0.01, 0.05, null, 14); cy(g, mat("jam", 0xa01830, 0.5, 0), 0.05, 0.05, 0.07, 0.62, 0.86, 0.1, null, 10); cy(g, mat("thB", 0x2a6a9a, 0.4, 0.5), 0.045, 0.045, 0.24, -0.7, 0.93, -0.12, null, 10); return g; };
PB.snowball = () => { const g = new (T().Group)(); ell(g, mat("snow", 0xf2f6fa, 0.95, 0), 0.055, 0.055, 0.055, 0, 0, 0); return g; };
PB.carMound = (o) => {                                                                                    // a car under a night's snow: the body lines still show as a long mound, with a cleared windscreen, a wing mirror, a wheel, a bumper and the aerial (origin on the ground, +z the bonnet)
  const t = T(), g = new t.Group(), sm = mat("snowM", 0xeef3f8, 0.97, 0), body = mat("carMB" + ((o && o.c) || 0), (o && o.c) || 0x9a2a2a, 0.45, 0.25), dark = mat("carMD", 0x15181c, 0.5, 0.2), glass = mat("carMG", 0x0e1a26, 0.12, 0.6), pale = new t.MeshBasicMaterial({ color: 0xfff4d0, fog: false });
  ell(g, sm, 1.0, 0.52, 2.2, 0, 0.5, 0); ell(g, sm, 0.86, 0.4, 1.3, 0, 1.0, -0.4); ell(g, sm, 0.84, 0.28, 0.95, 0, 0.82, 1.4); ell(g, sm, 0.8, 0.26, 0.65, 0, 0.84, -1.75);
  bx(g, body, 0.04, 0.34, 1.15, 0.97, 0.52, 0.15); bx(g, body, 0.04, 0.34, 1.15, -0.97, 0.52, 0.15);                // a door's paint where the snow slid off
  const gl = bx(g, glass, 1.25, 0.03, 0.62, 0, 1.2, 0.78, [0.82, 0, 0]); bx(g, dark, 1.3, 0.04, 0.05, 0, 1.0, 1.0, [0.82, 0, 0]); bx(g, dark, 0.03, 0.04, 0.55, 0.2, 1.215, 0.77, [0.82, 0, 0.1]);   // windscreen cleared, a wiper laid across it
  bx(g, dark, 1.45, 0.17, 0.2, 0, 0.34, 2.12); bx(g, body, 1.4, 0.13, 0.12, 0, 0.5, 2.1); for (const s of [-1, 1]) { bx(g, pale, 0.28, 0.12, 0.04, s * 0.58, 0.6, 2.2); cy(g, dark, 0.34, 0.34, 0.22, s * 0.98, 0.3, 1.3, [0, 0, Math.PI / 2], 14); }
  for (const s of [-1, 1]) { bx(g, dark, 0.2, 0.025, 0.025, s * 1.06, 1.08, 0.62); bx(g, body, 0.13, 0.14, 0.2, s * 1.2, 1.1, 0.62, [0, 0, s * 0.1]); }      // wing mirrors
  cy(g, mat("aer", 0x222222, 0.5, 0.5), 0.007, 0.007, 1.1, -0.55, 1.75, -1.25, [0.12, 0, -0.1], 4); ell(g, dark, 0.025, 0.025, 0.025, -0.5, 2.3, -1.3);
  return g; };
PB.shovelStuck = () => { const g = new (T().Group)(), wd = mat("shvH", 0x8a6a3a, 0.9, 0), st = mat("shvB", 0xc8322a, 0.5, 0.3); const a = new (T().Group)(); a.position.y = 0.0; a.rotation.set(0.14, 0, -0.12); g.add(a);
  cy(a, wd, 0.018, 0.018, 1.15, 0, 0.85, 0, null, 6); bx(a, wd, 0.2, 0.03, 0.03, 0, 1.43, 0); bx(a, st, 0.24, 0.34, 0.018, 0, 0.18, 0); bx(a, wd, 0.05, 0.1, 0.03, 0, 0.4, 0); return g; };
PB.sign = (o) => { const g = new (T().Group)(); cy(g, mat("signP", 0x5a5a60, 0.6, 0.4), 0.03, 0.03, 2.2, 0, 1.1, 0, null, 6); const m = mat("sign" + (o && o.c || 0), o && o.c || 0xf0d020, 0.5, 0); bx(g, m, 0.7, 0.5, 0.025, 0, 2.0, 0.03); return g; };
PB.pole = () => { const g = new (T().Group)(); cy(g, mat("polR", 0xd02020, 0.6, 0), 0.025, 0.025, 2.4, 0, 1.2, 0, null, 6); cy(g, mat("polW", 0xf0f0f0, 0.6, 0), 0.026, 0.026, 0.5, 0, 1.0, 0, null, 6); return g; };
K.PB = PB;

/* ================= set dressing: thrown snow, a trailhead board, corduroy, a window to shoot through, street lamps behind ================= */
PB.berm = (o) => { const g = new (T().Group)(), m = mat("snowB", 0xf0f5fa, 0.97, 0), s = o && o.s || 1; for (const [x, z, r, h] of [[0, 0, 1.0, 0.3], [0.8, 0.35, 0.7, 0.22], [-0.7, -0.25, 0.8, 0.26], [0.1, 0.6, 0.55, 0.18]]) ell(g, m, r * s, h * s, r * s * 0.8, x * s, 0.02, z * s); return g; };
PB.board = () => { const g = new (T().Group)(), wd = mat("brdW", 0x6a4a2c, 0.9, 0), pn = mat("brdP", 0x2e5a4a, 0.7, 0), wh = mat("brdL", 0xe8eef2, 0.8, 0), rf = mat("brdR", 0x4a3a2c, 0.9, 0);
  for (const sx of [-1, 1]) bx(g, wd, 0.1, 2.0, 0.1, sx * 0.62, 1.0, 0); bx(g, pn, 1.3, 0.95, 0.05, 0, 1.45, 0.02); bx(g, wd, 1.4, 0.06, 0.07, 0, 1.97, 0); bx(g, rf, 1.5, 0.05, 0.42, 0, 2.08, 0.1, [-0.35, 0, 0]);
  for (let i = 0; i < 4; i++) bx(g, wh, 0.9 - i * 0.12, 0.025, 0.012, -0.05 + i * 0.03, 1.8 - i * 0.2, 0.052, [0, 0, (i - 1.5) * 0.12]); bx(g, mat("brdT", 0xd8352a, 0.6, 0), 0.1, 0.1, 0.012, 0.3, 1.2, 0.052); return g; };
PB.lamp = () => { const t = T(), g = new t.Group(); cy(g, mat("lampP", 0x2a2d32, 0.6, 0.4), 0.05, 0.07, 5.0, 0, 2.5, 0, null, 7); bx(g, mat("lampA", 0x2a2d32, 0.6, 0.4), 0.9, 0.06, 0.06, 0.4, 5.0, 0); ell(g, new t.MeshBasicMaterial({ color: 0xfff0c0, fog: false }), 0.16, 0.08, 0.16, 0.8, 4.92, 0); glow(g, "lampG", 0xffd890, 1.7, 0.8, 4.9, 0, 0.9); return g; };
K.lampsBehind = (E, rec, night) => {                                                                       // street lamps and a lit window behind the subject of a night picture
  if (night < 0.35) return; if (!W().doors.some(d => Math.hypot(d.x - (E.marks[0] || [1e9, 0, 1e9])[0], d.z - (E.marks[0] || [1e9, 0, 1e9])[2]) < 130)) return; const m = E.marks && E.marks.length ? E.marks[0] : null; if (!m) return; const c = E.cam.position, dx = m[0] - c.x, dz = m[2] - c.z, dl = Math.hypot(dx, dz) || 1, fx = dx / dl, fz = dz / dl, lx = fz, lz = -fx, r = mulb((rec.sd | 0) + 31);
  for (let i = 0; i < 2; i++) { const d = dl + 8 + i * 9 + r() * 4, side = (i ? -1 : 1) * (4 + r() * 5), x = c.x + fx * d + lx * side, z = c.z + fz * d + lz * side; if (!landOk(x, z) || W().obNear(x, z, 1.2)) continue; prop(E, "lamp", i, x, z, Math.atan2(-lx, -lz) * 0 + (side > 0 ? Math.PI : 0), {}); lampPool(E, "lp" + i, x + (side > 0 ? 0.0 : 0), z, 9, 0xffd890, 0.5 * night); }
};
// corduroy: a ribbon of ground-hugging stripes laid along a trail from (x, z) heading yaw, len metres, width metres; the ribbon is rebuilt from the terrain each frame (a few dozen vertices)
let CORD = null;
function cordTex() { if (CORD) return CORD; const c = document.createElement("canvas"); c.width = 128; c.height = 128; const g = c.getContext("2d"); g.clearRect(0, 0, 128, 128); const n = 8; for (let i = 0; i < n; i++) { const x = i * 128 / n, e = Math.sin((i + 0.5) / n * Math.PI), a = Math.min(1, e * 2.2); g.fillStyle = i % 2 ? `rgba(196,212,236,${0.95 * a})` : `rgba(250,252,255,${0.95 * a})`; g.fillRect(x, 0, 128 / n, 128); g.fillStyle = `rgba(86,118,176,${0.85 * a})`; g.fillRect(x, 0, 3.5, 128); g.fillStyle = `rgba(255,255,255,${0.7 * a})`; g.fillRect(x + 5, 0, 2, 128); }
  const t = new (T().CanvasTexture)(c); t.wrapS = t.wrapT = T().RepeatWrapping; t.anisotropy = 4; return (CORD = t); }
K.corduroy = (E, x, z, yaw, len, width, back) => {
  const t = T(), n = 28, e = E.extraOf("gp:cord", () => { const geo = new t.BufferGeometry(); geo.setAttribute("position", new t.BufferAttribute(new Float32Array((n + 1) * 6), 3)); const uv = new Float32Array((n + 1) * 4), idx = []; for (let i = 0; i <= n; i++) { uv[i * 4] = 0; uv[i * 4 + 1] = i * len / n / 3; uv[i * 4 + 2] = 1; uv[i * 4 + 3] = i * len / n / 3; } for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    geo.setAttribute("uv", new t.BufferAttribute(uv, 2)); { const nm = new Float32Array((n + 1) * 6); for (let i = 0; i < nm.length; i += 3) nm[i + 1] = 1; geo.setAttribute("normal", new t.BufferAttribute(nm, 3)); } geo.setIndex(idx); const m = new t.Mesh(geo, new t.MeshStandardMaterial({ map: cordTex(), transparent: true, depthWrite: false, roughness: 0.95, side: t.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); m.frustumCulled = false; m.renderOrder = 3; return m; });
  const geo = e.m.geometry, P = geo.attributes.position, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, hw = width / 2;
  for (let i = 0; i <= n; i++) { const s = -(back || 0) + (len + (back || 0)) * i / n, cx = x + fx * s, cz = z + fz * s, jx = Math.sin(s * 0.05) * 0.25, ax = cx + lx * jx, az = cz + lz * jx; for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1, px = ax + lx * hw * sd, pz = az + lz * hw * sd; P.setXYZ(i * 2 + k, px, surf(px, pz) + 0.05, pz); } }
  P.needsUpdate = true; e.m.position.set(0, 0, 0); e.m.visible = true; e.on = true; return e;
};
// a window to shoot through: a frame, a sill, a curtain's edge and a mullion laid just in front of the lens; the world is seen through it
K.windowFrame = (E, night, o) => {
  const t = T(), e = E.extraOf("gp:winframe", () => { const g = new t.Group(), mk = (c) => new t.MeshBasicMaterial({ color: c, fog: false }), parts = {};
    parts.frame = mk(0xdad4c8); parts.dark = mk(0x7a6a58); parts.cur = mk(0xb8463a); parts.cur2 = mk(0x963a30); parts.glass = new t.MeshBasicMaterial({ color: 0xa8c4e0, transparent: true, opacity: 0.06, fog: false, depthWrite: false });
    const box = (m) => { const b = new t.Mesh(new t.BoxGeometry(1, 1, 1), m); g.add(b); return b; };
    g.userData.b = { top: box(parts.frame), bot: box(parts.frame), l: box(parts.frame), r: box(parts.frame), mull: box(parts.frame), sill: box(parts.dark), cur: box(parts.cur), cur2: box(parts.cur2), cur3: box(parts.cur), glass: box(parts.glass), warm: box(new t.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.0, fog: false, depthWrite: false })), fog: box(new t.MeshBasicMaterial({ map: E_().tex().glow, color: 0xe8f0fa, transparent: true, opacity: 0.0, fog: false, depthWrite: false })) }; g.userData.parts = parts; g.traverse(q => { q.frustumCulled = false; q.renderOrder = 20; }); return g; }), g = e.m, B = g.userData.b, cam = E.cam;
  const d = 0.42, hh = Math.tan(cam.fov * Math.PI / 360) * d, hw = hh * cam.aspect, bar = 0.1 * hw, k = 1 - 0.55 * night; g.userData.parts.frame.color.setRGB(0.86 * k, 0.83 * k, 0.78 * k); g.userData.parts.dark.color.setRGB(0.5 * k, 0.42 * k, 0.34 * k); g.userData.parts.cur.color.setRGB(0.72 * k, 0.27 * k, 0.23 * k); g.userData.parts.cur2.color.setRGB(0.58 * k, 0.2 * k, 0.18 * k);
  const dp = 0.012, set = (b, x, y, w, h, z) => { b.position.set(x, y, -d + (z || 0)); b.scale.set(w, h, dp); };
  set(B.top, 0, hh - bar * 0.5, 2 * hw, bar); set(B.bot, 0, -hh + bar * 0.5, 2 * hw, bar); set(B.l, -hw + bar * 0.5, 0, bar, 2 * hh); set(B.r, hw - bar * 0.5, 0, bar, 2 * hh); set(B.mull, (o && o.mull || 0.12) * hw, 0, bar * 0.4, 2 * hh, 0.001);
  B.sill.position.set(0, -hh + bar * 1.1, -d + 0.05); B.sill.scale.set(2 * hw, bar * 0.28, 0.08);
  set(B.cur, -hw + bar + hw * 0.1, 0.12 * hh, hw * 0.22, 2 * hh, 0.003); set(B.cur2, -hw + bar + hw * 0.04, 0.12 * hh, hw * 0.08, 2 * hh, 0.006); set(B.cur3, -hw + bar + hw * 0.17, 0.12 * hh, hw * 0.04, 2 * hh, 0.004);
  set(B.glass, 0, 0, 2 * hw, 2 * hh, 0.0005); if (o && o.fog) set(B.fog, o.fog.x * hw, o.fog.y * hh, o.fog.s * hh * 2 * 1.3, o.fog.s * hh * 2, 0.0009); B.fog.material.opacity = o && o.fog ? o.fog.a : 0; B.fog.visible = !!(o && o.fog); set(B.warm, 0, 0, 2 * hw, 2 * hh, 0.0007); B.warm.material.opacity = 0.0;
  g.position.copy(cam.position); g.quaternion.copy(cam.quaternion); g.scale.setScalar(1); g.visible = true; e.on = true; return e;
};
// a pooled prop: built once per key and index, placed for the frame (the engine hides it after the shot)
function prop(E, name, i, x, z, yaw, o) {
  o = o || {}; const key = "gp:" + name + (i || 0) + (o.key || ""), e = E.extraOf(key, () => { const g = PB[name](o), r = new (T().Group)(); r.add(g); r.traverse(q => { q.frustumCulled = false; }); return r; }); const m = e.m;
  m.position.set(x, o.y !== undefined ? o.y : surf(x, z) + (o.dy || 0), z); m.rotation.set(o.rx || 0, yaw || 0, o.rz || 0); m.scale.setScalar(o.s || 1); m.visible = true; e.on = true; return m;
}
K.prop = prop;
// a prop carried by a figure: parented to its torso for the frame
function carry(E, w, name, x, y, z, rot, o) {
  const e = E.extraOf("gc:" + name + (o && o.key || ""), () => { const g = PB[name](o || {}), r = new (T().Group)(); r.add(g); r.traverse(q => { q.frustumCulled = false; }); return r; }), m = e.m;
  if (m.parent !== w.U.torso) w.U.torso.add(m); m.position.set(x, y, z); m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0); m.scale.setScalar(o && o.s || 1); m.visible = true; e.on = true; e.carried = w; return m;
}
K.carry = carry;
// animals: a pooled rig per kind
const RIGS = {};
function animal(E, kind, i, x, z, yaw, o) {
  o = o || {}; const Q = A().gram.quad, key = kind + (i || 0); let q = RIGS[key]; if (!q) { q = RIGS[key] = Q.make(kind, ""); }
  q.g.traverse(n => { n.frustumCulled = false; }); const e = E.extraOf("ga:" + key, () => q.g); e.q = q; const y = surf(x, z);
  q.g.position.set(x, y - 0.05 + (o.dy || 0), z); q.g.rotation.set(0, yaw, 0); q.g.scale.setScalar(o.s || 1); q.graze = o.graze || 0; Q.pose(q, o.dt === undefined ? 0.04 : o.dt, o.v || 0, q.graze, 0); q.g.visible = true; e.on = true; if (kind === "fox") foxCoat(q); return q;
}
K.animal = animal;
// the fox's coat: the game's winter fox is a white blank; for a picture it is a red fox with a pale belly, dark legs and a white tail tip (own materials: the game's fox is untouched)
function foxCoat(q) {
  if (q.coated) return; q.coated = 1; const t = T(), seen = new Map(), cl = (m, hex, rough) => { if (!seen.has(m)) { const c = m.clone(); c.color.setHex(hex); if (rough !== undefined) c.roughness = rough; seen.set(m, c); } return seen.get(m); };
  const cols = [0xc4642a, 0xe9dcc4, 0x7c3c1c, 0xb05620]; let i = 0;
  q.g.traverse(o => { if (o.isMesh && o.material && o.material.color) { const h = o.material.color.getHex(); if (h === 0xeceef0) o.material = cl(o.material, 0xc4632a); else if (h === 0xc9ccd0) o.material = cl(o.material, 0xe4d6bc); else if (h === 0x141414) o.material = cl(o.material, 0x1a1210); } });
}
K.foxCoat = foxCoat;
// the figure kit's dead ground: set a sprite's glow pool on the snow for a lamp
function lampPool(E, key, x, z, r, col, op) { const t = T(), e = E.extraOf("gl:" + key, () => { const m = new t.Mesh(E.blobGeo, new t.MeshBasicMaterial({ map: E.tex().glow, color: col, transparent: true, depthWrite: false, blending: t.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, fog: false })); return m; }); const m = e.m; m.position.set(x, surf(x, z) + 0.1, z); m.scale.set(r, 1, r); m.material.opacity = op === undefined ? 0.6 : op; m.material.color.setHex(col); m.visible = true; e.on = true; return m; }
K.lampPool = lampPool;

/* ================= places: found from the world ================= */
const SP = K.spot = {};
// a point on land with room, on a ring round (x, z)
SP.ring = (rng, x, z, r0, r1, room, tries) => { for (let k = 0; k < (tries || 40); k++) { const a = rng() * TAU, r = r0 + rng() * (r1 - r0), px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (openOk(px, pz, room || 3)) return [px, pz]; } return null; };
// the nearest house door of a village that has room in front of it: { x, z (door), nx, nz (out), yaw (game yaw facing out) }
SP.door = (rng, v, minD) => { const ds = W().doors.filter(d => Math.hypot(d.x - v.x, d.z - v.z) < 520 && openOk(d.x + d.nx * 4, d.z + d.nz * 4, 1.2)); if (!ds.length) return null; const d = ds[Math.floor(rng() * ds.length)], f = (d.d || 6) / 2;                // KIT.doors gives the house's CENTRE and its depth d: the front wall is d/2 out along the normal, and the picture is laid out from that wall
  return { x: d.x + d.nx * f, z: d.z + d.nz * f, nx: d.nx, nz: d.nz, yaw: Math.atan2(d.nx, d.nz), d }; };
// how interesting the view is from (x, z, eye height) along a trig azimuth: relief of the skyline, sea, and nothing close in the way
function viewScore(x, z, ey, az) {
  const dx = Math.cos(az), dz = Math.sin(az); let mn = 9, mx = -9, wall = 0, sea = 0, near = 0;
  for (let i = -3; i <= 3; i++) { const a = az + i * 0.14, ax = Math.cos(a), az2 = Math.sin(a); let top = -9; for (let d = 30; d <= 4500; d *= 1.3) { const e = (surf(x + ax * d, z + az2 * d) - ey - surf(x, z)) / d; if (e > top) top = e; if (d < 400 && W().isSea(x + ax * d, z + az2 * d)) sea++; } mn = Math.min(mn, top); mx = Math.max(mx, top); }
  for (let d = 4; d <= 36; d += 4) { if (W().obNear(x + dx * d, z + dz * d, 1.6)) near += 1; const e = (surf(x + dx * d, z + dz * d) - surf(x, z) - ey) / d; if (e > 0.3) wall++; }
  return (mx - mn) * 2 - (mx > 0.3 ? 1.5 : 0) + (mx > 0.02 ? 0.25 : 0) + sea * 0.025 - near * 0.6 - wall * 0.8 + (mn > -0.5 ? 0.2 : -0.8);
}
SP.bestView = (rng, x, z, ey, n) => { let best = null, bs = -1e9; const a0 = rng() * TAU; n = n || 16; for (let k = 0; k < n; k++) { const a = a0 + k / n * TAU, s = viewScore(x, z, ey, a); if (s > bs) { bs = s; best = a; } } return best === null ? null : { az: best, score: bs }; };
SP.viewScore = viewScore;
// the nearest lookout of a village, with an open spot on top
SP.lookout = (rng, v) => { const lk = GH().lookoutFor(v); if (!lk || lk.d > 7500) return null; const L = lk.L, sp = GH().openSpot(L.x, L.z, 2.5); if (!sp) return null; return { x: sp[0], z: sp[1], L, name: L.name }; };
SP.coast = (v) => GH().coastOf(v);
SP.slope = (v) => GH().slopeOf(v);
SP.lake = (v) => GH().lakeNear(v);
// the trail of a village: a point along it with its heading (game yaw), or its start
SP.trail = (rng, v, atStart) => {
  const X = window.TLXSK; if (!X || !X.ready) return null; const ts = X.list.filter(t => !t.closed && t.pts && t.pts.length > 4 && Math.hypot(t.pts[0][0] - v.x, t.pts[0][1] - v.z) < 1400 || (t.vil && t.vil === v.id)); if (!ts.length) return null; const t = ts[Math.floor(rng() * ts.length)];
  const n = t.pts.length, i = atStart ? 2 : 3 + Math.floor(rng() * (n - 7)), p = t.pts[i], q = t.pts[i + 1]; if (!p || !q || !openOk(p[0], p[1], 1)) return null; return { x: p[0], z: p[1], yaw: Math.atan2(q[0] - p[0], q[1] - p[1]), t, name: t.name, i };
};
SP.road = (rng, v) => {
  const R = window.TLXR; if (!R || !R.ready) return null; let best = null, bd = 1e9; for (const r of R.routes) { for (let i = 0; i < r.pts.length; i += 6) { const p = r.pts[i], d = Math.hypot(p[0] - v.x, p[1] - v.z); if (d > 150 && d < 1500 && d < bd + rng() * 400) { const q = r.pts[Math.min(i + 3, r.pts.length - 1)]; if (openOk(p[0], p[1], 0.5) || true) { bd = d; best = { x: p[0], z: p[1], yaw: Math.atan2(q[0] - p[0], q[1] - p[1]), name: r.name, r }; } } } }
  return best;
};
SP.gapahuk = (v) => { const X = window.TLXSK; if (!X || !X.FU) return null; let best = null, bd = 2200; for (const g of X.FU.gaps) { const d = Math.hypot(g.x - v.x, g.z - v.z); if (d < bd) { bd = d; best = g; } } return best; };
SP.quay = () => { try { const q = A().steamer.quay(); return q && Number.isFinite(q.qx) ? q : null; } catch (e) { return null; } };

/* ================= camera ================= */
// a portrait camera: from `dist` metres out along game yaw `cy` from a figure's head, a little above, looking at the face
function camFace(E, w, cyaw, dist, fov, up, side, aimDy) {
  const h = headPos(w, _v1()), sx = Math.cos(cyaw) * (side || 0), sz = -Math.sin(cyaw) * (side || 0), x = h.x + Math.sin(cyaw) * dist + sx, z = h.z + Math.cos(cyaw) * dist + sz, y = h.y + (up || 0.08);
  E.look(x, y, z, h.x, h.y + (aimDy === undefined ? -0.03 : aimDy), h.z, fov, 0); return [x, y, z];
}
K.camFace = camFace;
// the camera stands at (x, z) eye height ey looking at a point
const look = (E, x, z, ey, tx, ty, tz, fov, roll) => E.look(x, surf(x, z) + ey, z, tx, ty, tz, fov, roll);
K.look = look;

K.hoursWord = h => h < 4 ? "in the small hours" : h < 9 ? "this morning" : h < 12 ? "mid-morning" : h < 15 ? "at lunch" : h < 18 ? "this afternoon" : h < 22 ? "this evening" : "late";

/* ================= the kinds ================= */
K.offs = {}; K.add = row => { if (row.off) K.offs[row.id] = row; else K.kinds[row.id] = row; return row; };
K.ready = true;
})();
