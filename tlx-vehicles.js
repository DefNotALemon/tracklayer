// Tracklayer — vehicles (expansion slices 2.2 and 2.3, loop/EXPANSION.md). Loaded after tlx.js, before tracklayer.js.
//
// WHAT IT IS. The sled is still the game's body: P (position, velocity, pose) is "the vehicle you are using", and the whole
// game reads P (camera, HUD, site checks, warmth, deliveries, bog, minimap). So a second vehicle does not get a body of its own.
// The ACTIVE vehicle owns P; every other owned vehicle is a parked record { uid, id, x, z, yaw, fuel, cond, load } in the saved
// state. Swapping vehicles writes P's pose, GS.fuel and GS.load into the record of the one you leave and reads the other's in
// (swapTo, the only place that happens). While you are on foot the one nearest you becomes P, so the mount key, the on-foot
// hint, digging and the locator pin all talk about the nearest vehicle with no other change.
//
// tracklayer.js has a small bridge, VEH, and every hook in it sits behind `if (VEH.cur)`. VEH.cur is null on the sled (the sled
// then behaves exactly as it did before this file existed) or the driver object of the vehicle you are in:
//   core(dt) physics for P, restat(ST) stat overrides, visual(dt) place the model, eye(v) first-person eye,
//   mount() / dismount() / mountTick(dt) / dismountTick(dt) the walk-up, door and climb in or out, nearMount(), mass.
//
// THE WHEELED PHYSICS (one table row per vehicle, VEHICLES below). Each wheel reads the snow field in front of it: the depth d
// and the fresh depth f of its cell, pack = 1 - d/f. A wheel sinks d * (0.35 + 0.65 * (1 - pack)) and rolling resistance climbs
// with the sink; past the ground clearance the belly drags. Traction is mu * M * g per wheel, mu about 0.42 on plowed or hard
// ground, 0.22 loose, 0.12 ice. Engine force beyond traction is wheelspin: it digs, and enough of it calls the game's own
// enterBog, so digging (use), reset and the stuck UI work unchanged. Steering is Ackermann from the wheelbase and the lateral
// grip is capped by mu, so it understeers on ice. Each wheel presses a rut as it goes. The sled keeps the open fell: a truck
// that cannot float on powder cannot out-climb or out-run it there.
//
// SAVED: state.owned (the parked records), state.cur (uid you are in, or null), state.sled (the sled's pose while you are in
// something else), state.seq. Parcels are saved as plain JSON (sites by id). Nothing here reads a Nordkinn constant: place
// comes from api.world.
(() => {
"use strict";

/* ---------------- tunables: one row per vehicle, laid out like SLEDS ---------------- */
const VEHICLES = [
  { id: "pickup", name: "Fjellvogn", kind: "pickup", year: 2019, cost: 4200,
    blurb: "A four-wheel-drive pickup with a heated cab. Good on plowed ground and hard pack, hopeless in fresh powder: it floats on nothing.",
    mass: 1900, power: 105000, fmax: 8200, top: 30, revTop: 4.8,           // W, N at the wheels in first, m/s
    fuel: 70, burn: 1, slots: 8, cabCold: 0.12, hitchKg: 1500,              // litres, parcels in the bed, cold drained as fast as the sled's baseline
    zf: 1.5, zr: -1.55, track: 1.66, tyreR: 0.38, tyreW: 0.27, clearance: 0.26, len: 5.3, wid: 1.96,
    mu: { hard: 0.42, loose: 0.22, ice: 0.12, wet: 0.06 },
    paint: 0x244f69, eye: [0.4, 1.63, -0.1], door: { x: 0.925, z: 0.7 } }
];
const byId = id => VEHICLES.find(v => v.id === id) || null;
const MAX_OWNED = 3;

let api = null, T = null;                                                   // T: THREE
const S = () => TLX.state("vehicles");
const RT = new Map();                                                       // uid -> runtime (model, wheels, door, dynamics)
const clamp = (x, a, b) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rec = uid => S().owned.find(r => r.uid === uid) || null;

/* ---------------- geometry kit: everything is merged and vertex-coloured, so a vehicle is a handful of draw calls ---------------- */
const _m4 = () => new T.Matrix4();
function tf(x, y, z, rx = 0, ry = 0, rz = 0, s = 1) {
  return _m4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(s, s, s));
}
// items: [{ g: BufferGeometry, c: hex, m?: Matrix4 }] -> one BufferGeometry with position, normal, colour
function bake(items) {
  const parts = []; let n = 0;
  for (const it of items) {
    let g = it.g.index ? it.g.toNonIndexed() : it.g.clone();
    if (it.m) g.applyMatrix4(it.m);
    parts.push([g, new T.Color(it.c)]); n += g.attributes.position.count;
  }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const [g, c] of parts) {
    const k = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    for (let i = 0; i < k; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
    o += k;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.BufferAttribute(pos, 3)); geo.setAttribute("normal", new T.BufferAttribute(nor, 3)); geo.setAttribute("color", new T.BufferAttribute(col, 3));
  geo.computeBoundingSphere(); geo.computeBoundingBox();
  return geo;
}
// a side silhouette (shape x = forward z, shape y = up) pushed across the width, bevelled; centred on x = 0
function extr(shape, depth, bev, x0 = 0) {
  const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 10, steps: 1 });
  g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2); if (x0) g.translate(x0, 0, 0);
  return g;
}
function poly(pts) { const s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s; }
// a flat pane from side-view points, standing in the plane x = x0
function pane(pts, x0) { const g = new T.ShapeGeometry(poly(pts)); g.rotateY(-Math.PI / 2); g.translate(x0, 0, 0); return g; }
const box = (w, h, d) => new T.BoxGeometry(w, h, d);

const TRIM = 0x17191c, STEEL = 0x30343a, CHROME = 0xaab0b6, SEAT = 0x2a2e34, DASH = 0x1b1e22, FLOOR = 0x363a3f, LINER = 0x22252a, ROOF = 0xb9bdc1;

// the pickup: body, glass, driver's door, lights, wheels, interior
function buildPickup(d) {
  const P0 = d.paint, body = [], glass = [], doorB = [], doorG = [], head = [], tail = [];
  const B = (w, h, dp, x, y, z, c, rx = 0, ry = 0, rz = 0) => body.push({ g: box(w, h, dp), c, m: tf(x, y, z, rx, ry, rz) });
  const AR = 0.47, AY = 0.38, ay = 0.34, adz = Math.sqrt(AR * AR - (AY - ay) * (AY - ay)), a0 = Math.atan2(ay - AY, adz);
  const arch = (s, zc) => { s.lineTo(zc + adz, ay); s.absarc(zc, AY, AR, a0, Math.PI - a0, false); };
  // front half: hood, fenders, nose, sills and the cab's rear wall; the cab is a notch (the doors close it) so the inside shows through the glass
  const S1 = new T.Shape();
  S1.moveTo(2.62, 0.44); S1.lineTo(2.4, ay); arch(S1, d.zf); S1.lineTo(-0.88, ay); S1.lineTo(-0.88, 1.08); S1.lineTo(-0.76, 1.08);
  S1.lineTo(-0.76, 0.55); S1.lineTo(0.72, 0.55); S1.lineTo(0.72, 1.08); S1.lineTo(0.8, 1.1); S1.lineTo(1.4, 1.09); S1.lineTo(2.5, 1.03); S1.lineTo(2.65, 0.93); S1.lineTo(2.66, 0.55); S1.closePath();
  body.push({ g: extr(S1, 1.86, 0.04), c: P0 });
  // bed sides (a bevelled panel each), floor, headboard, tailgate, wheel-well humps
  const S2 = new T.Shape();
  S2.moveTo(-0.9, ay); S2.lineTo(d.zr + adz, ay); S2.absarc(d.zr, AY, AR, a0, Math.PI - a0, false); S2.lineTo(-2.6, ay); S2.lineTo(-2.6, 1.17); S2.lineTo(-0.9, 1.17); S2.closePath();
  for (const sg of [1, -1]) body.push({ g: extr(S2, 0.07, 0.025, sg * 0.91), c: P0 });
  B(1.78, 0.06, 1.72, 0, 0.88, -1.74, LINER);                                   // bed floor
  for (const sg of [1, -1]) { B(0.3, 0.1, 1.0, sg * 0.74, 0.97, d.zr, LINER); B(0.1, 0.03, 1.72, sg * 0.94, 1.19, -1.74, STEEL); }   // wheel wells, rail caps
  B(1.8, 0.42, 0.07, 0, 1.12, -0.93, P0);                                       // headboard
  B(1.82, 0.62, 0.06, 0, 0.82, -2.64, P0); B(0.3, 0.05, 0.04, 0, 1.06, -2.68, CHROME);   // tailgate, handle
  // underbody and arches' backing so nothing is see-through
  B(1.72, 0.18, 5.2, 0, 0.42, -0.05, TRIM);
  for (const zc of [d.zf, d.zr]) B(1.8, 0.56, 1.0, 0, 0.6, zc, TRIM);
  // bumpers, grille, valance
  B(1.98, 0.22, 0.2, 0, 0.55, 2.74, STEEL); B(1.0, 0.3, 0.04, 0, 0.82, 2.705, TRIM); B(0.9, 0.04, 0.05, 0, 0.99, 2.71, CHROME);
  B(1.98, 0.2, 0.2, 0, 0.52, -2.72, STEEL); B(1.0, 0.08, 0.06, 0, 0.64, -2.84, TRIM);
  // fender flares
  for (const sg of [1, -1]) for (const zc of [d.zf, d.zr]) {
    const fl = new T.TorusGeometry(AR + 0.03, 0.028, 6, 24, Math.PI + 0.3); fl.rotateZ(-0.15); fl.rotateY(Math.PI / 2);
    body.push({ g: fl, c: TRIM, m: tf(sg * 0.975, AY, zc) });
  }
  const wsA = Math.atan2(0.7, 0.76), wsL = Math.hypot(0.7, 0.76);
  // cab: floor, dash, seats, wheel column, headliner, roof, pillars, rear wall
  B(1.8, 0.05, 1.7, 0, 0.44, 0, FLOOR);
  B(1.78, 0.28, 0.4, 0, 0.98, 0.62, DASH); B(0.62, 0.11, 0.2, 0.4, 1.14, 0.55, DASH, -0.2); B(0.34, 0.3, 0.9, 0, 0.62, -0.1, LINER);
  B(0.05, 0.05, 0.5, 0.4, 1.04, 0.42, TRIM, 0.55);                              // steering column
  for (const sg of [1, -1]) {
    B(0.5, 0.15, 0.55, sg * 0.4, 0.6, -0.2, SEAT); B(0.5, 0.62, 0.13, sg * 0.4, 0.98, -0.5, SEAT, -0.17); B(0.27, 0.2, 0.1, sg * 0.4, 1.42, -0.56, SEAT, -0.17);
  }
  B(1.78, 0.05, 1.7, 0, 1.91, -0.35, ROOF);                                     // headliner, seen from inside
  body.push({ g: extr(poly([[0.1, 1.94], [-0.8, 1.96], [-0.86, 1.92], [-0.86, 1.88], [0.2, 1.9]]), 1.78, 0.03), c: P0 });   // roof slab
  B(1.8, 0.4, 0.06, 0, 1.15, -0.84, P0);                                        // rear wall under the window
  for (const sg of [1, -1]) {
    B(0.1, 0.78, 0.1, sg * 0.86, 1.52, -0.83, P0);                              // C pillars (solid, body colour)
    B(0.055, 1.05, 0.055, sg * 0.89, 1.48, 0.45, TRIM, -wsA);                       // A pillars, raked with the glass
  }
  // windshield + rear glass + the passenger side (the driver's is the door's)
  glass.push({ g: new T.PlaneGeometry(1.72, wsL - 0.04), c: 0xffffff, m: tf(0, 1.48, 0.45, -wsA, 0, 0) });
  glass.push({ g: new T.PlaneGeometry(1.5, 0.6), c: 0xffffff, m: tf(0, 1.58, -0.865, 0, Math.PI, 0) });
  const WIN = [[0.74, 1.12], [0.14, 1.86], [-0.76, 1.86], [-0.76, 1.12]];
  glass.push({ g: pane(WIN, -0.935), c: 0xffffff });
  // passenger door skin (static) and frame bars
  body.push({ g: extr(poly([[0.7, 0.55], [0.7, 1.08], [-0.76, 1.08], [-0.76, 0.55]]), 0.06, 0.02, -0.925), c: P0 });
  B(0.05, 0.05, 0.9, -0.925, 1.87, -0.31, TRIM); B(0.05, 0.05, 1.46, -0.925, 1.1, -0.03, TRIM); B(0.05, 0.96, 0.06, -0.925, 1.49, 0.44, TRIM, -0.68); B(0.05, 0.76, 0.06, -0.925, 1.49, -0.76, TRIM);
  B(0.04, 0.06, 0.25, -0.985, 0.98, -0.45, CHROME);
  // mirrors
  for (const sg of [1, -1]) { B(0.16, 0.025, 0.03, sg * 1.04, 1.28, 0.7, TRIM); B(0.06, 0.17, 0.22, sg * 1.13, 1.3, 0.68, TRIM); }
  // tow hitch receiver stub and a fuel flap
  B(0.1, 0.1, 0.3, 0, 0.42, -2.95, STEEL); B(0.02, 0.2, 0.2, 0.975, 0.95, -1.05, TRIM);
  // driver's door: hinged at the front edge (x = door.x, z = door.z), built in door space: z runs back from the hinge
  const dz = d.door.z, DB = (w, h, dp, x, y, z, c, rx = 0, ry = 0, rz = 0) => doorB.push({ g: box(w, h, dp), c, m: tf(x, y, z, rx, ry, rz) });
  doorB.push({ g: extr(poly([[0, 0.55], [0, 1.08], [-1.46, 1.08], [-1.46, 0.55]]), 0.07, 0.025), c: P0 });
  DB(0.05, 0.05, 0.9, 0, 1.87, -1.01, TRIM); DB(0.05, 0.05, 1.46, 0, 1.1, -0.73, TRIM); DB(0.05, 0.76, 0.06, 0, 1.49, -1.46, TRIM); DB(0.05, 0.96, 0.06, 0, 1.49, -0.26, TRIM, -0.68);
  DB(0.04, 0.06, 0.25, 0.05, 0.98, -1.15, CHROME);
  const WD = WIN.map(([z, y]) => [z - dz, y]);
  doorG.push({ g: pane(WD, 0), c: 0xffffff });
  // lights: heads and tails are separate meshes so the brake lights can brighten on their own
  for (const sg of [1, -1]) {
    head.push({ g: box(0.36, 0.14, 0.05), c: 0xfff0c8, m: tf(sg * 0.67, 0.9, 2.71) });
    head.push({ g: box(0.1, 0.07, 0.05), c: 0xffb030, m: tf(sg * 0.9, 0.76, 2.71) });
    tail.push({ g: box(0.12, 0.3, 0.05), c: 0xff2a1a, m: tf(sg * 0.89, 1.0, -2.7) });
    tail.push({ g: box(0.1, 0.06, 0.05), c: 0xffe8d0, m: tf(sg * 0.89, 0.8, -2.7) });
  }
  return { body: bake(body), glass: bake(glass), doorB: bake(doorB), doorG: bake(doorG), head: bake(head), tail: bake(tail) };
}

// one wheel: tyre, rim with spokes and lugs, all one geometry; the axle is x
function buildWheel(d) {
  const it = [], R = d.tyreR, W = d.tyreW / 2;
  const prof = [[0.23, -W * 0.9], [0.30, -W], [R - 0.025, -W * 0.92], [R - 0.004, -W * 0.5], [R, -W * 0.2], [R, W * 0.2], [R - 0.004, W * 0.5], [R - 0.025, W * 0.92], [0.30, W], [0.23, W * 0.9]]
    .map(([r, y]) => new T.Vector2(r, y));
  const lg = new T.LatheGeometry(prof, 28); lg.rotateZ(Math.PI / 2);
  it.push({ g: lg, c: 0x1b1d20 });
  const hub = new T.CylinderGeometry(0.235, 0.235, W * 1.8, 20); hub.rotateZ(Math.PI / 2); it.push({ g: hub, c: 0x4a4f56 });
  const face = new T.CylinderGeometry(0.2, 0.2, 0.02, 20); face.rotateZ(Math.PI / 2); it.push({ g: face, c: 0x9aa1a8, m: tf(W * 0.9, 0, 0) });
  const cap = new T.CylinderGeometry(0.06, 0.06, 0.03, 12); cap.rotateZ(Math.PI / 2); it.push({ g: cap, c: 0x20242a, m: tf(W * 0.9 + 0.01, 0, 0) });
  for (let i = 0; i < 5; i++) {                                                // spokes, dark gaps between them show the spin
    const a = i / 5 * Math.PI * 2, sp = box(0.025, 0.16, 0.05);
    it.push({ g: sp, c: 0x1a1d21, m: tf(W * 0.9 + 0.005, 0, 0, a, 0, 0).multiply(tf(0, 0.12, 0)) });
    const lug = new T.CylinderGeometry(0.014, 0.014, 0.03, 6); lug.rotateZ(Math.PI / 2);
    it.push({ g: lug, c: 0xc9ced3, m: tf(W * 0.9 + 0.02, Math.cos(a) * 0.09, Math.sin(a) * 0.09) });
  }
  for (let i = 0; i < 22; i++) {                                               // tread blocks, a shade lighter than the carcass
    const a = i / 22 * Math.PI * 2;
    it.push({ g: box(W * 1.7, 0.03, 0.07), c: 0x2d3035, m: tf(0, 0, 0, a, 0, 0).multiply(tf(0, R - 0.005, 0)) });
  }
  return bake(it);
}

// the driver, baked once from the real walker in the seated pose: 2 draw calls (body, arms) instead of 30
const SEAT_POSE = { x: 0.4, z: -0.22, hip: 0.83, thigh: -1.48, knee: 0.57, ank: 0.8, tor: -0.05, arm: -1.0, fore: -0.7, armZ: 0.12 };
function seatWalker(g, K) {
  const U = g.userData, S0 = SEAT_POSE;
  g.position.set(K.x, K.hip - 0.93, K.z); g.rotation.set(0, 0, 0, "YXZ");
  U.torso.rotation.set(K.tor, 0, 0); U.torso.position.y = 0.93; U.head.rotation.x = -U.torso.rotation.x * 0.55;
  for (let i = 0; i < 2; i++) {
    U.legs[i].rotation.set(K.th[i], 0, (i ? 1 : -1) * 0.05); U.shins[i].rotation.x = K.kn[i]; U.ank[i].rotation.x = K.an[i];
    U.arms[i].rotation.set(K.ar[i], 0, (i ? 1 : -1) * K.az[i]); U.fore[i].rotation.x = K.fo[i];
  }
}
function seatedKeys() {
  const S0 = SEAT_POSE;
  return { x: S0.x, z: S0.z, hip: S0.hip, tor: S0.tor, th: [S0.thigh, S0.thigh], kn: [S0.knee, S0.knee], an: [S0.ank, S0.ank], ar: [S0.arm, S0.arm], az: [S0.armZ, S0.armZ], fo: [S0.fore, S0.fore] };
}
function bakeDriver() {
  const g = api.newWalker(); g.visible = true;
  seatWalker(g, seatedKeys());
  g.updateMatrixWorld(true);
  const armOf = new Set(); for (const a of g.userData.arms) a.traverse(o => armOf.add(o));
  const A = [], Bd = [];
  g.traverse(o => {
    if (!o.isMesh || !o.visible) return;
    const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld);
    const c = o.material.color ? o.material.color.getHex() : 0x888888;
    (armOf.has(o) ? A : Bd).push({ g: geo, c });
  });
  return { body: bake(Bd), arms: bake(A) };
}

/* ---------------- runtime: one model per owned vehicle ---------------- */
let MAT = null;                                                              // shared materials, built once
function mats() {
  if (MAT) return MAT;
  MAT = {
    solid: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 }),
    glass: new T.MeshStandardMaterial({ color: 0x1c2b36, roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.32, depthWrite: false, side: T.DoubleSide }),
    head: new T.MeshBasicMaterial({ vertexColors: true }), tail: new T.MeshBasicMaterial({ vertexColors: true }),
    parcel: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 })
  };
  return MAT;
}
let SHARED = null;                                                           // geometry shared by every vehicle of a kind
function geos(d) {
  if (SHARED && SHARED.id === d.id) return SHARED;
  SHARED = Object.assign({ id: d.id, wheel: buildWheel(d), driver: bakeDriver() }, buildPickup(d));
  return SHARED;
}
function mesh(geo, mat, shadow) { const m = new T.Mesh(geo, mat); m.castShadow = !!shadow; m.receiveShadow = !!shadow; return m; }

function runtime(r) {
  let R = RT.get(r.uid); if (R) return R;
  const d = byId(r.id), G = geos(d), M = mats();
  R = { rec: r, def: d, G, steer: 0, yr: 0, spin: [0, 0, 0, 0], H: [0, 0, 0, 0], dy: [0, 0, 0, 0], sink: [0, 0, 0, 0], acc: 0, door: 0, A: null, sprayAcc: 0, hitT: 0, bodyP: 0, bodyR: 0, bodyPV: 0, bodyRV: 0, sY: 0, sV: 0, lastVf: 0, air: 0,
    bodyPT: 0, bodyRT: 0, axl: 0, ax: 0, ay: 0, brake: 0, rev: 0, baseCold: 1, lastLoad: -1, mass: d.mass, mu: 0.3, spinK: 0, cond: r.cond };
  const grp = R.grp = new T.Group(); grp.rotation.order = "YXZ"; grp.visible = false;
  const body = R.body = mesh(G.body, M.solid, true); grp.add(body);
  grp.add(mesh(G.glass, M.glass, false));
  grp.add(R.headM = new T.Mesh(G.head, M.head)); grp.add(R.tailM = new T.Mesh(G.tail, M.tail));
  R.tailMat = M.tail.clone(); R.tailM.material = R.tailMat; R.headMat = M.head.clone(); R.headM.material = R.headMat;
  R.glassMesh = grp.children[1];
  const dr = R.doorPivot = new T.Group(); dr.position.set(d.door.x, 0, d.door.z); grp.add(dr);
  dr.add(mesh(G.doorB, M.solid, true)); dr.add(mesh(G.doorG, M.glass, false));
  R.wheels = new T.InstancedMesh(G.wheel, M.solid, 4); R.wheels.castShadow = true; R.wheels.frustumCulled = false; R.wheels.instanceMatrix.setUsage(T.DynamicDrawUsage); grp.add(R.wheels);
  R.drvBody = mesh(G.driver.body, M.solid, false); R.drvArms = mesh(G.driver.arms, M.solid, false);
  R.drvArms.position.set(0, 0, 0); grp.add(R.drvBody, R.drvArms); R.drvBody.visible = R.drvArms.visible = false;
  // steering wheel: a ring on the column, turning with the road wheels
  const sw = R.swheel = new T.Group(); sw.position.set(0.4, 1.12, 0.22); sw.rotation.x = -(Math.PI / 2 - 0.62);
  const ring = new T.TorusGeometry(0.19, 0.022, 8, 22), spoke = box(0.36, 0.025, 0.03), hubG = new T.CylinderGeometry(0.05, 0.05, 0.04, 10); hubG.rotateX(Math.PI / 2);
  sw.add(mesh(bake([{ g: ring, c: 0x15171a }, { g: spoke, c: 0x15171a }, { g: hubG, c: 0x15171a }]), M.solid, false)); grp.add(sw);
  R.bed = null;
  api.scene.add(grp);
  RT.set(r.uid, R); return R;
}
function dropRuntime(uid) { const R = RT.get(uid); if (!R) return; api.scene.remove(R.grp); RT.delete(uid); }

// parcels in the bed: one merged mesh, rebuilt when the count changes
function bedBoxes(R, n) {
  n = Math.min(n, R.def.slots);
  if (R.lastLoad === n) return; R.lastLoad = n;
  if (R.bed) { R.grp.remove(R.bed); R.bed.geometry.dispose(); R.bed = null; }
  if (!n) return;
  const it = [], cols = [0xb98a55, 0xa97b49, 0xc79a63, 0x9c6f41];
  for (let i = 0; i < n; i++) {
    const row = i % 2, col = (i / 2) | 0, w = 0.5, h = 0.3 + (i % 3) * 0.05, dpt = 0.42;
    const x = row ? -0.42 : 0.42, z = -1.2 - col * 0.5 - (col > 1 ? 0.05 : 0);
    it.push({ g: box(w, h, dpt), c: cols[i % 4], m: tf(x, 0.91 + h / 2, z, 0, ((i * 37) % 11 - 5) * 0.012, 0) });
    it.push({ g: box(w * 0.2, h + 0.004, dpt + 0.004), c: 0xd8c9a6, m: tf(x, 0.91 + h / 2, z) });
  }
  R.bed = mesh(bake(it), mats().parcel, true); R.grp.add(R.bed);
}

/* ---------------- world helpers ---------------- */
let CELL = 0.25, HALF = 0;
function depthBi(x, z) {                                                     // snow depth, bilinear like surf()
  const fx = (x + HALF) / CELL, fz = (z + HALF) / CELL, ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz, w = api.world;
  const a = w.depthAt(ix, iz), b = w.depthAt(ix + 1, iz), c = w.depthAt(ix, iz + 1), d = w.depthAt(ix + 1, iz + 1);
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
}
const gnd = (x, z) => api.world.groundAt(x, z);
const wheelXZ = (R, i, P, out) => {                                          // i: 0 FL 1 FR 2 RL 3 RR; local +x is the vehicle's left
  const d = R.def, sx = (i & 1) ? -d.track / 2 : d.track / 2, az = i < 2 ? d.zf : d.zr, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  out[0] = P.x + fz * sx + fx * az; out[1] = P.z - fx * sx + fz * az; return out;
};
const _w = [0, 0];
// a point in the vehicle's frame -> world
const toWorld = (P, lx, lz, out) => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); out[0] = P.x + fz * lx + fx * lz; out[1] = P.z - fx * lx + fz * lz; return out; };

/* ---------------- the physics: core(dt) runs in place of physCore while you are in a vehicle ---------------- */
const GR = 9.81;
function core(R, dt) {
  const P = api.P, input = api.input, FOOT = api.FOOT, BOG = api.BOG, HELP = api.HELP, GS = api.GS, d = R.def, w = api.world, ST = api.ST();
  if (HELP.on && HELP.kind === "sea") { P.vx = P.vz = P.vy = 0; P.y = Math.max(w.rideSurf(P.x, P.z), P.wl - 0.5); P.gnd = true; P.wet = true; return; }   // dunked, waiting on the rescue sled
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), lx = fz, lz = -fx;
  const M = R.mass = d.mass + 6 * Math.min(8, api.GS.load.length), W = M * GR, started = api.started();
  const wl0 = w.wlvAt(P.x, P.z), sea = wl0 !== null; if (sea) P.wl = wl0; else P.sink = 0;
  let vx = P.vx, vz = P.vz;
  const parked = FOOT.on || GS.dead;                                         // standing or climbing in/out: the brake is on
  // --- the four wheels: the snow in front of each sets its sink, rolling resistance and grip; its own cell sets where it sits
  const sgn = Math.sign(vx * fx + vz * fz) || 1, ahead = 0.42 * sgn;
  let sinkS = 0, packS = 0, muS = 0, crS = 0, wetN = 0;
  for (let i = 0; i < 4; i++) {
    wheelXZ(R, i, P, _w); const x = _w[0], z = _w[1], g = gnd(x, z), db = depthBi(x, z), ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL);
    // the cell the tyre is about to meet (the one under it is already pressed by its own weight)
    const xa = x + fx * ahead, za = z + fz * ahead, ixa = Math.round((xa + HALF) / CELL), iza = Math.round((za + HALF) / CELL);
    const dA = w.depthAt(ixa, iza), fA = w.freshAt(ixa, iza), packA = fA > 0.02 ? clamp(1 - dA / fA, 0, 1) : 1;
    const sk = dA * (0.35 + 0.65 * (1 - packA));
    const fC = w.freshAt(ix, iz), packC = fC > 0.02 ? clamp(1 - db / fC, 0, 1) : 1, skC = db * (0.35 + 0.65 * (1 - packC));
    R.H[i] = g + db - skC;                                                   // where the tyre bottom sits right now
    const wl = w.wlvAt(x, z), wet = wl !== null && g + db < wl - 0.05; if (wet) wetN++;
    const ice = w.bioAt(x, z) === 1 && fA < 0.12;
    const mu = wet ? d.mu.wet : ice ? d.mu.ice : lerp(d.mu.loose, d.mu.hard, sstep(0.35, 0.8, packA));
    const cr = 0.016 + 0.95 * sk + 5 * Math.max(0, sk - 0.2) * Math.max(0, sk - 0.2) + (wet ? 0.45 : 0) + (ice ? -0.004 : 0);
    R.sink[i] = sk; sinkS += sk; packS += packA; muS += mu; crS += cr;
  }
  sinkS /= 4; packS /= 4; muS /= 4; crS /= 4;
  const Hf = (R.H[0] + R.H[1]) / 2, Hr = (R.H[2] + R.H[3]) / 2, Hl = (R.H[0] + R.H[2]) / 2, Hrt = (R.H[1] + R.H[3]) / 2, Hc = (Hf + Hr) / 2;
  const sf = (Hf - Hr) / (d.zf - d.zr), sl = (Hl - Hrt) / d.track, gx = sf * fx + sl * lx, gz = sf * fz + sl * lz, g2 = gx * gx + gz * gz;
  P.pack = packS; P.ice = !sea && w.bioAt(P.x, P.z) === 1 && w.freshAt(Math.round((P.x + HALF) / CELL), Math.round((P.z + HALF) / CELL)) < 0.12;
  P.wet = wetN >= 2; P.bare = 0; P.slush = 0;
  P.thin = !sea && P.gnd && P.ice ? w.iceThin(P.x, P.z) : 0;
  if (P.thin > 0 && started && !GS.dead) api.thinIceStep(dt, Math.hypot(vx, vz), M, fx, fz);
  else api.MELT.crack = Math.max(0, api.MELT.crack - 0.8 * dt);
  // belly drag: the snow the chassis has to push once it is past the clearance
  const sc = gnd(P.x, P.z) + depthBi(P.x, P.z), emb = Math.max(0, sc - (Hc + d.clearance)), cb = 0.45 * Math.pow(Math.min(3, emb / 0.12), 1.2);
  const condK = 0.65 + 0.35 * R.rec.cond / 100;
  // --- longitudinal: engine, brake, reverse against traction and resistance
  let vf = vx * fx + vz * fz, vl = vx * lx + vz * lz;
  const T0 = muS * W, thrE = GS.fuel > 0 && !GS.dead && !parked ? input.thr : 0;
  const rev = input.brk > 0 && !(input.thr > 0) && GS.fuel > 0 && !GS.dead && !parked && vf < 0.8;
  api.GB.dir = rev ? -1 : 1;
  let Fe = 0;
  if (thrE > 0) { const gov = vf > d.top ? Math.max(0, 1 - (vf - d.top) / 2) : 1; Fe = thrE * Math.min(d.fmax, d.power / Math.max(vf, 2.2)) * condK * gov; }
  let Fx = 0, spin = 0;
  if (rev) { const over = Math.max(0, -vf) / d.revTop; Fx = -Math.min(d.fmax * 0.6, T0) * input.brk * (over > 1 ? Math.max(0, 1 - (over - 1) * 6) : 1); }
  else if (input.brk > 0 && !parked) Fx = -Math.min(9500, T0 * 0.98) * input.brk * (vf > 0.4 ? 1 : 0.25);
  if (Fe > 0) { Fx += Math.min(Fe, T0); spin = Math.max(0, Fe - T0) / Math.max(T0, 600); }
  const vfPrev = vf; vf += Fx / M * dt;
  if (!rev && input.brk > 0 && vfPrev >= 0 && vf < 0) vf = 0;                     // the brake stops you; only S held at a standstill backs you up
  const aero = 0.95 * vf * Math.abs(vf), Fres = W * (crS + cb) + Math.abs(aero);
  const dv = Fres / M * dt; if (Math.abs(vf) <= dv) vf = 0; else vf -= Math.sign(vf) * dv;
  R.drag = Fres; R.fx = Fx;
  // --- steering: Ackermann from the wheelbase, lateral grip capped by what the tyres have left after the engine took its share
  const sp = Math.abs(vf), dmax = 0.52 / Math.sqrt(1 + (sp / 10) * (sp / 10));
  R.steer += (-input.steer * dmax - R.steer) * (1 - Math.exp(-7 * dt));
  const use = Math.min(0.75, 0.7 * Math.abs(Fx) / Math.max(T0, 1)), latCap = muS * GR * Math.sqrt(1 - use * use) * 0.95;
  let yrT = vf * Math.tan(R.steer) / (d.zf - d.zr);
  const need = Math.abs(vf * yrT); if (need > latCap) yrT *= latCap / need;       // understeer
  R.yr += (yrT - R.yr) * (1 - Math.exp(-9 * dt));
  const gndOK = P.y <= Hc + 0.12;
  if (gndOK) { P.yr = R.yr; const dyaw = R.yr * dt; P.yaw += dyaw; const a = dyaw, ca = Math.cos(a), sa = Math.sin(a); const nx = vx * ca + vz * sa, nz = vz * ca - vx * sa; vx = nx; vz = nz; }
  else { R.yr *= Math.exp(-1.5 * dt); P.yr = R.yr; }
  const fx2 = Math.sin(P.yaw), fz2 = Math.cos(P.yaw), lx2 = fz2, lz2 = -fx2;
  // back into world velocity from the (new) longitudinal speed, keeping the sideways part that grip has not killed
  const vf0 = vx * fx2 + vz * fz2, vl0 = vx * lx2 + vz * lz2;
  vx += (vf - vf0) * fx2; vz += (vf - vf0) * fz2;
  if (gndOK) {
    // gravity along the slope (real g: a truck climbs what its tyres can hold, not what the sled's game gravity allows)
    vx -= GR * gx / (1 + g2) * dt; vz -= GR * gz / (1 + g2) * dt;
    const vl1 = vx * lx2 + vz * lz2, cut = Math.min(Math.abs(vl1) / dt, latCap + 0.4 * sinkS * GR) * Math.sign(vl1);
    vx -= cut * dt * lx2; vz -= cut * dt * lz2;
  }
  if (parked) { vx = vz = 0; }
  else if (BOG.on) {                                                          // in a hole: whatever you do with the throttle it digs deeper
    const k = Math.exp(-12 * dt); vx *= k; vz *= k;
    if (thrE > 0.2) {
      BOG.depth = Math.min(1, BOG.depth + 0.02 * thrE * dt); BOG.r0 = M * GR * (0.5 + 1.1 * BOG.depth); BOG.resist = BOG.r0 * clamp(1 - 0.75 * BOG.moved / BOG.r, 0.2, 1);
      if (Math.random() < 0.3) api.emit(P.x - fx * 2.4, P.y + 0.3, P.z - fz * 2.4, -fx * 3 + (Math.random() - 0.5) * 4, 3 + Math.random() * 3, -fz * 3 + (Math.random() - 0.5) * 4, 1.5, 1);
    }
  }
  // --- wheelspin digs: spin in the soft stuff, or a truck that cannot move at all, builds toward the game's own bog
  if (BOG.immune > 0) BOG.immune -= dt;
  const stuck = Fres > T0 * 0.92 ? 1 : 0, spd0 = Math.hypot(vx, vz);
  R.spinK = thrE > 0.2 ? Math.min(1.6, spin + stuck * 0.8) : 0;
  if (!BOG.on && !parked && gndOK && !P.ice && P.wet === false && BOG.immune <= 0 && !HELP.on) {
    const dig = thrE > 0.25 && spd0 < 3.5 && sinkS > 0.07 ? (spin * 0.6 + stuck * 0.55) * 0.2 * thrE * clamp(sinkS / 0.3, 0.25, 1.5) : 0;
    if (dig > 0.01) {
      BOG.acc += dig * dt;
      if (BOG.acc > 0.45 && !BOG.warned) { BOG.warned = true; toastDig(); }
      if (BOG.acc >= 1) api.enterBog(clamp(0.3 + 0.9 * sinkS, 0.3, 0.85));
    } else { BOG.acc = Math.max(0, BOG.acc - 0.6 * dt); if (BOG.acc < 0.2) BOG.warned = false; }
  } else if (!BOG.on) BOG.acc = Math.max(0, BOG.acc - 1.2 * dt);
  // --- fuel: a quiet idle, and the throttle against the load
  if (started && !GS.dead) GS.fuel = Math.max(0, GS.fuel - (0.0012 + thrE * (0.010 + 0.014 * clamp(Fres / 6000, 0, 2))) * d.burn * dt);
  // --- vertical: follow the four contact heights, leave the ground over a crest, land with a thump
  P.vy -= api.getG() * dt;
  const sv = vx * gx + vz * gz;
  let impact = 0;
  const x1 = P.x + vx * dt, z1 = P.z + vz * dt; P.x = x1; P.z = z1; P.y += P.vy * dt;
  if (P.y <= Hc) { impact = Math.max(0, sv - P.vy); P.y = Hc; if (P.vy < sv) P.vy = sv; }
  P.gnd = P.y <= Hc + 0.12;
  if (P.gnd) {
    if (R.air > 0.25 && impact > 4) { landing(R, impact); }
    R.air = 0; P.airT = 0;
  } else { R.air += dt; P.airT = R.air; }
  P.vx = vx; P.vz = vz;
  // body on its springs, reacting to the drive and the corners
  const axl = (vf - R.lastVf) / Math.max(dt, 1e-4); R.lastVf = vf; R.axl = lerp(R.axl || 0, axl, 1 - Math.exp(-6 * dt));
  const lat = vf * R.yr;
  R.bodyPT = clamp(-R.axl * 0.011, -0.06, 0.06); R.bodyRT = clamp(lat * 0.013, -0.09, 0.09);
  R.sV += (-150 * R.sY - 9 * R.sV) * dt; R.sY = clamp(R.sY + R.sV * dt, -0.18, 0.12);
  // ruts: every tyre presses the snow it rolls on (or spins in)
  if (gndOK && wetN === 0 && !P.ice) {
    const kp = 0.3 + 0.1 * Math.min(1, sinkS / 0.3);
    for (let i = 0; i < 4; i++) { wheelXZ(R, i, P, _w); w.pressSnow(_w[0], _w[1], d.tyreW * 0.62, kp); if (spd0 > 1) w.markTrail(_w[0], _w[1], true); }
  }
  // spray off the tyres: powder when it is deep or when they spin, a little dust of snow otherwise
  if (gndOK && wetN === 0) {
    R.sprayAcc += (sinkS * 70 + R.spinK * 30 + 0.5) * Math.min(spd0, 22) * dt * (P.ice ? 0.2 : 0.7);
    while (R.sprayAcc > 1) {
      R.sprayAcc -= 1; const i = 2 + ((Math.random() * 2) | 0); wheelXZ(R, i, P, _w);
      api.emit(_w[0] - fx2 * 0.4, P.y + 0.25, _w[1] - fz2 * 0.4, -fx2 * spd0 * 0.2 + vx * 0.3 + (Math.random() - 0.5) * 2, 1.2 + spd0 * 0.08 + sinkS * 5, -fz2 * spd0 * 0.2 + vz * 0.3 + (Math.random() - 0.5) * 2, 1.4 + sinkS * 3);
    }
  }
  P.exc = clamp(sinkS * 0.9, 0, 0.8); P.drag = Fres; P.rut = 0;
  // water: the shore is a slope the truck drives down; deep enough and updGame calls it a dunking (startDrown, the rescue sled)
  if (wetN >= 2) { const spd = Math.hypot(vx, vz); P.sink = clamp(P.sink + 0.2 * dt, 0, 0.6); if (Math.random() < dt * spd * 2) api.emit(P.x + fx * 2.4, P.wl + 0.1, P.z + fz * 2.4, vx * 0.4 + (Math.random() - 0.5) * 3, 2 + Math.random() * 2, vz * 0.4 + (Math.random() - 0.5) * 3, 1.4, 1.1); }
  collide(R, dt, fx2, fz2);
  const lim = HALF - 24; P.x = clamp(P.x, -lim, lim); P.z = clamp(P.z, -lim, lim);
  api.LOG.m += Math.hypot(vx, vz) * dt; P.odo += Math.abs(vf) * dt; P.dist += Math.hypot(vx, vz) * dt;
  // wheels turn with the ground speed under them (and spin up with the engine when they have no grip)
  const roll = vf / d.tyreR * dt; for (let i = 0; i < 4; i++) R.spin[i] += roll + (i < 2 && !(R.spinK > 0) ? 0 : R.spinK * 18 * dt);
  R.brake = input.brk > 0 && vf > 0.5 ? 1 : 0; R.rev = rev ? 1 : 0;
}
function toastDig() { api.toast("The wheels are digging in. Ease off, or back out along your own ruts.", "warn"); }

// trees, buildings and boulders stop it: no ejection from a cab, a dent in the paint and a thud instead
function collide(R, dt, fx, fz) {
  const P = api.P, d = R.def, w = api.world, list = w.obstaclesNear(P.x, P.z, 6);
  const circles = [[2.0, 0.98], [0.0, 1.05], [-2.0, 0.98]];
  const s = VEH_SLED(); if (s) list.push({ x: s.x, z: s.z, r: 0.8, top: 99, sled: 1 });
  for (const [off, r] of circles) {
    const cx = P.x + fx * off, cz = P.z + fz * off;
    for (const o of list) {
      if (o.down || o.top === -Infinity || P.y > o.top - 0.12) continue;
      const dx = cx - o.x, dz = cz - o.z, d2 = dx * dx + dz * dz, rr = r + (o.r || 0);
      if (d2 >= rr * rr || d2 < 1e-6) continue;
      const dist = Math.sqrt(d2), nx = dx / dist, nz = dz / dist, pen = rr - dist;
      P.x += nx * (pen + 0.02); P.z += nz * (pen + 0.02);
      const vn = P.vx * nx + P.vz * nz;
      if (vn < 0) {
        const hit = -vn;
        P.vx -= 1.12 * vn * nx; P.vz -= 1.12 * vn * nz;
        const tx = -nz, tz = nx, vt = P.vx * tx + P.vz * tz; P.vx -= vt * tx * 0.04; P.vz -= vt * tz * 0.04;
        if (o.tree !== undefined) { api.wobble(o, 0.06 + hit * 0.014, -dx, -dz); if (o.snowy && hit > 1.5) api.dropSnow(o, true); }
        if (hit > 1.5 && R.hitT <= 0) { R.hitT = 0.25; bump(R, hit, o); }
      }
    }
  }
  if (R.hitT > 0) R.hitT -= dt;
}
function VEH_SLED() { return api.veh.sled; }
function bump(R, hit, o) {
  const P = api.P;
  P.shake = Math.max(P.shake, Math.min(0.9, hit / 12)); api.thud(Math.min(1, hit / 14));
  if (hit > 4) api.cargoHit(hit * 0.9);
  if (hit > 3.5 && !o.sled) {
    const dmg = Math.min(30, hit * hit * 0.07); R.rec.cond = Math.max(0, R.rec.cond - dmg);
    if (api.now() - (R.dentT || -9) > 2.5) { R.dentT = api.now(); api.toast(`${o.tree !== undefined ? "Hit a tree" : "Hit something solid"}: the ${R.def.name} is at ${Math.round(R.rec.cond)}%.`, hit > 8 ? "bad" : "warn"); }
  }
}
function landing(R, impact) {
  const P = api.P; R.sV -= Math.min(5, impact * 0.3);
  P.shake = Math.max(P.shake, Math.min(0.8, impact / 14)); api.thud(Math.min(1, impact / 14));
  if (impact > 8) { api.cargoHit(impact * 0.7); R.rec.cond = Math.max(0, R.rec.cond - Math.min(20, (impact - 8) * 1.4)); }
}

/* ---------------- the model each frame ---------------- */
const _v = [0, 0];
function place(R, P, dt, isCur) {
  const d = R.def, grp = R.grp;
  grp.visible = true;
  if (isCur) {
    R.bodyP += (R.bodyPT - R.bodyP) * (1 - Math.exp(-7 * dt)); R.bodyR += (R.bodyRT - R.bodyR) * (1 - Math.exp(-7 * dt));
  }
  const Hf = (R.H[0] + R.H[1]) / 2, Hr = (R.H[2] + R.H[3]) / 2, Hl = (R.H[0] + R.H[2]) / 2, Hrt = (R.H[1] + R.H[3]) / 2;
  const pitch = Math.atan2(Hf - Hr, d.zf - d.zr), roll = Math.atan2(Hl - Hrt, d.track);
  const k = 1 - Math.exp(-(P.gnd ? 14 : 3) * dt);
  P.pitch += (pitch - P.pitch) * k; P.roll += (roll - P.roll) * k;
  const sy = isCur ? R.sY - api.BOG.sink : 0;
  grp.position.set(P.x, P.y + sy, P.z);
  grp.rotation.set(-P.pitch - R.bodyP, P.yaw, P.roll + R.bodyR);
  // each wheel: its own contact height against the plane the body sits on (suspension travel), steered at the front, spinning
  const hw = d.track / 2, c = (Hf + Hr) / 2;
  R.wheels.visible = true;
  for (let i = 0; i < 4; i++) {
    const x = (i & 1) ? -hw : hw, z = i < 2 ? d.zf : d.zr;
    const plane = c + (z * (Hf - Hr) / (d.zf - d.zr)) + x * ((Hl - Hrt) / d.track);
    const tgt = clamp(R.H[i] - plane, -0.14, 0.1);
    R.dy[i] += (tgt - R.dy[i]) * (1 - Math.exp(-16 * dt));
    _q1.setFromAxisAngle(_Y, i < 2 ? R.steer : 0); _q2.setFromAxisAngle(_X, R.spin[i]); _q1.multiply(_q2);
    if (i & 1) { _q3.setFromAxisAngle(_Y, Math.PI); _q1.multiply(_q3); }       // the right-hand wheels face the other way
    _s.set(1, 1, 1); _p.set(x, d.tyreR + R.dy[i], z);
    _mm.compose(_p, _q1, _s); R.wheels.setMatrixAt(i, _mm);
  }
  R.wheels.instanceMatrix.needsUpdate = true;
  R.swheel.rotation.z = -R.steer * 7.5;
}
let _q1, _q2, _q3, _Y, _X, _p, _s, _mm;
function lights(R, on, brake, rev) {
  const k = on ? 1 : 0.34;
  R.headMat.color.setScalar(on ? 1 : 0.85); R.tailMat.color.setScalar(on ? (brake ? 1 : 0.62) : brake ? 0.95 : 0.4);
  void k; void rev;
}

/* ---------------- getting in and out: walk up, door, step in, sit, door shut ---------------- */
// keyframes in the vehicle's frame: x left, z forward, hip = height of the hip joint above the ground, yaw relative to the truck
// (-PI/2 = facing the cab), leg / arm angles as the walker's own joints (negative x swings forward)
const KF = [
  { u: 0.00, x: 1.46, z: 0.10, hip: 0.93, yaw: -1.571, tor: 0.08, th: [0.0, 0.0], kn: [0.08, 0.08], an: [0, 0], ar: [-0.15, -0.35], az: [0.1, 0.12], fo: [-0.2, -0.5] },
  { u: 0.24, x: 1.28, z: 0.10, hip: 0.99, yaw: -1.47, tor: 0.42, th: [0.12, -1.05], kn: [0.25, 1.4], an: [0, 0.3], ar: [-0.7, -0.9], az: [0.1, 0.2], fo: [-0.5, -0.7] },
  { u: 0.46, x: 0.97, z: 0.02, hip: 1.12, yaw: -1.25, tor: 0.82, th: [0.38, -0.78], kn: [0.55, 0.95], an: [0, 0.25], ar: [-0.8, -0.6], az: [0.1, 0.25], fo: [-0.7, -0.5] },
  { u: 0.70, x: 0.58, z: -0.12, hip: 1.0, yaw: -0.72, tor: 0.58, th: [-0.8, -1.2], kn: [1.2, 0.85], an: [0.3, 0.5], ar: [-0.9, -0.5], az: [0.12, 0.2], fo: [-0.9, -0.5] },
  { u: 0.88, x: 0.44, z: -0.2, hip: 0.89, yaw: -0.16, tor: 0.16, th: [-1.38, -1.45], kn: [0.8, 0.62], an: [0.6, 0.78], ar: [-0.95, -0.95], az: [0.12, 0.12], fo: [-0.8, -0.75] },
  { u: 1.00, x: SEAT_POSE.x, z: SEAT_POSE.z, hip: SEAT_POSE.hip, yaw: 0, tor: SEAT_POSE.tor, th: [SEAT_POSE.thigh, SEAT_POSE.thigh], kn: [SEAT_POSE.knee, SEAT_POSE.knee], an: [SEAT_POSE.ank, SEAT_POSE.ank], ar: [SEAT_POSE.arm, SEAT_POSE.arm], az: [SEAT_POSE.armZ, SEAT_POSE.armZ], fo: [SEAT_POSE.fore, SEAT_POSE.fore] }
];
const _kf = { x: 0, z: 0, hip: 0, yaw: 0, tor: 0, th: [0, 0], kn: [0, 0], an: [0, 0], ar: [0, 0], az: [0, 0], fo: [0, 0] };
function keyAt(u) {
  u = clamp(u, 0, 1); let i = 0; while (i < KF.length - 2 && u > KF[i + 1].u) i++;
  const a = KF[i], b = KF[i + 1], t = api.sm((u - a.u) / (b.u - a.u)), o = _kf;
  for (const f of ["x", "z", "hip", "yaw", "tor"]) o[f] = lerp(a[f], b[f], t);
  for (const f of ["th", "kn", "an", "ar", "az", "fo"]) for (let j = 0; j < 2; j++) o[f][j] = lerp(a[f][j], b[f][j], t);
  return o;
}
const DOOR_OPEN = 1.0;
const STAND = { x: 1.46, z: 0.1 };                                            // where you stand to use the door
// the door's handle in the vehicle frame while it is shut
function doorSpot(P, out) { return toWorld(P, STAND.x, STAND.z, out); }
function nearMount(R) {
  const FOOT = api.FOOT, P = api.P; doorSpot(P, _v); const dd = Math.hypot(FOOT.x - _v[0], FOOT.z - _v[1]), dc = Math.hypot(FOOT.x - P.x, FOOT.z - P.z);
  return Math.min(dd, dc - 1.1) < 3.0;
}
function mountOK(R) {
  const FOOT = api.FOOT, P = api.P; doorSpot(P, _v); const dd = Math.hypot(FOOT.x - _v[0], FOOT.z - _v[1]), dc = Math.hypot(FOOT.x - P.x, FOOT.z - P.z);
  return Math.min(dd, dc - 1.1) < 3.6;
}
function worldPose(R, P, k) {                                                  // the walker's world position and yaw for a vehicle-frame key
  toWorld(P, k.x, k.z, _v); return [_v[0], _v[1], P.yaw + k.yaw];
}
function setWalker(R, k, P, dt) {
  const FOOT = api.FOOT, g = FOOT.g, U = g.userData, S0 = worldPose(R, P, k);
  FOOT.x = S0[0]; FOOT.z = S0[1]; FOOT.yaw = S0[2];
  const gy = P.y;                                                               // vehicle-frame heights ride on the truck's ground plane
  FOOT.y = gy + k.hip - 0.93;
  g.visible = true;
  g.position.set(FOOT.x, FOOT.y, FOOT.z); g.rotation.set(0, FOOT.yaw, 0, "YXZ");
  U.torso.rotation.set(k.tor, 0, 0); U.torso.position.y = 0.93; U.head.rotation.x = -k.tor * 0.55; U.head.rotation.y = 0;
  for (let i = 0; i < 2; i++) {
    U.legs[i].rotation.set(k.th[i], 0, (i ? 1 : -1) * 0.04); U.legs[i].position.set(i ? 0.1 : -0.1, 0.93, 0); U.shins[i].rotation.x = k.kn[i]; U.ank[i].rotation.x = k.an[i];
    U.arms[i].rotation.set(k.ar[i], 0, (i ? 1 : -1) * k.az[i]); U.fore[i].rotation.x = k.fo[i];
  }
}
function walkTo(R, dt, tx, tz, spd) {                                           // one step of walking toward a world point, gait included
  const FOOT = api.FOOT, g = FOOT.g, dx = tx - FOOT.x, dz = tz - FOOT.z, dist = Math.hypot(dx, dz);
  const st = Math.min(dist, spd * dt);
  if (dist > 1e-4) { FOOT.x += dx / dist * st; FOOT.z += dz / dist * st; FOOT.yaw = angTo(FOOT.yaw, Math.atan2(dx, dz), 1 - Math.exp(-9 * dt)); }
  FOOT.sp = FOOT.go = st / dt; FOOT.crouch = 0; FOOT.strain = 0.35; FOOT.turn = 0; FOOT.tired = 0;
  FOOT.step += FOOT.sp * dt * 3.2;
  FOOT.y = api.world.surf(FOOT.x, FOOT.z);
  g.visible = true;
  const bob = api.poseWalker(g, dt); g.position.set(FOOT.x, FOOT.y + bob, FOOT.z); g.rotation.y = FOOT.yaw;
  return dist - st;
}
function angTo(a, b, t) { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; }

// the way round to the door: straight in if you are on its side, round the nose or tail if you are on the far side
function routeToDoor(R, P) {
  const FOOT = api.FOOT, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), dx = FOOT.x - P.x, dz = FOOT.z - P.z;
  const lx = dx * fz - dz * fx, lz = dx * fx + dz * fz, pts = [];
  if (lx < 0.2 && Math.abs(lz) < 3.4) {
    const e = lz >= 0 ? 1 : -1; toWorld(P, -1.7, e * 3.7, _v); pts.push([_v[0], _v[1]]); toWorld(P, 1.7, e * 3.7, _v); pts.push([_v[0], _v[1]]);
  } else if (lx >= 0.2 && lx < 1.4 && Math.abs(lz) < 3.2) { toWorld(P, 1.9, lz, _v); pts.push([_v[0], _v[1]]); }
  doorSpot(P, _v); pts.push([_v[0], _v[1]]);
  return pts;
}

function doMount(R) {
  const FOOT = api.FOOT, MNT = api.MNT, P = api.P;
  if (!mountOK(R)) { api.toast(`Get back to the ${R.def.kind} first.`, "warn"); return; }
  if (Math.hypot(P.vx, P.vz) > 1) return;
  MNT.on = true; MNT.t = 0; MNT.stepped = false; MNT.dur = 99; FOOT.ski = false; FOOT.dig = false; FOOT.fwd = FOOT.turn = FOOT.sp = 0;
  R.A = { dir: "in", ph: 0, t: 0, route: routeToDoor(R, P), leg: 0, snd: 0, u: 0 };
  api.snowStep(0.5);
}
function doDismount(R) {
  const FOOT = api.FOOT, DMT = api.DMT, P = api.P, w = api.world;
  if (Math.hypot(P.vx, P.vz) > 1.4 || !P.gnd || P.wet) { api.toast(`Stop the ${R.def.kind} first.`, "warn"); return; }
  doorSpot(P, _v);
  if (w.isWater(_v[0], _v[1]) || w.obNear(_v[0], _v[1], 0.5)) { api.toast("No room to open the door here.", "warn"); return; }
  DMT.on = true; DMT.t = 0; DMT.stepped = false; DMT.dur = 99;
  FOOT.dig = false; FOOT.sp = FOOT.fwd = FOOT.turn = FOOT.go = 0; FOOT.crouch = 0; FOOT.ski = false; FOOT.shoe = false; FOOT.on = true;
  FOOT.g.userData.shoes && FOOT.g.userData.shoes.forEach(s => s.visible = false);
  P.vx = P.vz = 0; api.camState.init = false;
  R.A = { dir: "out", ph: 0, t: 0, u: 1 };
  R.drvBody.visible = R.drvArms.visible = false;
  setWalker(R, keyAt(1), P, 0);
}
const T_OPEN = 0.55, T_IN = 1.2, T_SHUT = 0.6, T_GET_OUT_DOOR = 0.5;
function mountTick(R, dt) {
  const FOOT = api.FOOT, MNT = api.MNT, P = api.P, A = R.A;
  if (!A || A.dir !== "in") { MNT.on = false; return; }
  A.t += dt; MNT.t = A.t;
  if (A.ph === 0) {                                                             // walk to the door (round the end of the truck if need be)
    const wp = A.route[0]; const left = walkTo(R, dt, wp[0], wp[1], 1.9);
    if (left < 0.05) { A.route.shift(); if (!A.route.length) { A.ph = 1; A.t = 0; A.snd = 0; A.face = FOOT.yaw; } }
    return;
  }
  const g = FOOT.g, U = g.userData;
  if (A.ph === 1) {                                                             // stand, turn square to the cab, reach for the handle, door swings open
    const u = clamp(A.t / T_OPEN, 0, 1), e = api.sm(u);
    const k0 = keyAt(0); toWorld(P, STAND.x, STAND.z, _v);
    FOOT.x = lerp(FOOT.x, _v[0], 1 - Math.exp(-12 * dt)); FOOT.z = lerp(FOOT.z, _v[1], 1 - Math.exp(-12 * dt));
    const tgtYaw = P.yaw + k0.yaw; FOOT.yaw = angTo(FOOT.yaw, tgtYaw, 1 - Math.exp(-10 * dt));
    FOOT.sp = FOOT.go = 0; FOOT.step = 0; FOOT.y = api.world.surf(FOOT.x, FOOT.z);
    const bob = api.poseWalker(g, dt); g.position.set(FOOT.x, FOOT.y + bob, FOOT.z); g.rotation.y = FOOT.yaw;
    const reach = Math.sin(Math.PI * Math.min(1, u * 1.1)) * (1 - u * 0.4);
    U.arms[1].rotation.set(-0.5 - 0.5 * reach, 0, 0.3 + 0.35 * reach); U.fore[1].rotation.x = -0.35 - 0.4 * reach;  // the left (door side) hand to the handle
    R.door = e * 0.999; if (u > 0.2 && !A.snd) { A.snd = 1; api.thud(0.15); }
    if (u >= 1) { A.ph = 2; A.t = 0; A.snd = 0; }
    return;
  }
  if (A.ph === 2) {                                                             // step in and sit
    const u = clamp(A.t / T_IN, 0, 1); A.u = u; R.door = 1;
    setWalker(R, keyAt(u), P, dt);
    if (!A.snd && u > 0.4) { A.snd = 1; api.snowStep(0.5); }
    if (u >= 1) { A.ph = 3; A.t = 0; A.snd = 0; }
    return;
  }
  if (A.ph === 3) {                                                             // reach out, pull the door shut
    const u = clamp(A.t / T_SHUT, 0, 1), e = api.sm(u);
    const k = keyAt(1); setWalker(R, k, P, dt);
    const reach = Math.sin(Math.PI * Math.min(1, u * 1.15));
    U.arms[1].rotation.set(-0.55 - 0.1 * reach, 0, 0.12 + 0.95 * reach * (1 - e * 0.6)); U.fore[1].rotation.x = -0.25 - 0.35 * reach;
    R.door = 1 - Math.pow(e, 1.6);
    if (u >= 1) { R.door = 0; api.thud(0.4); finishMount(R); }
  }
}
function finishMount(R) {
  const FOOT = api.FOOT, MNT = api.MNT, P = api.P;
  MNT.on = false; FOOT.on = false; FOOT.dig = false; FOOT.crouch = 0; FOOT.g.visible = false; R.A = null;
  R.drvBody.visible = R.drvArms.visible = true;
  api.camState.init = false; api.camState.yaw = P.yaw;
}
function dismountTick(R, dt) {
  const FOOT = api.FOOT, DMT = api.DMT, P = api.P, A = R.A;
  if (!A || A.dir !== "out") { DMT.on = false; return; }
  A.t += dt; DMT.t = A.t;
  const g = FOOT.g, U = g.userData;
  if (A.ph === 0) {                                                             // reach to the handle, door swings open
    const u = clamp(A.t / T_GET_OUT_DOOR, 0, 1), e = api.sm(u);
    setWalker(R, keyAt(1), P, dt);
    const reach = Math.sin(Math.PI * Math.min(1, u * 1.1)) ;
    U.arms[1].rotation.set(-0.55 - 0.1 * reach, 0, 0.12 + 0.95 * reach); U.fore[1].rotation.x = -0.25 - 0.35 * reach;
    R.door = e; if (u > 0.15 && !A.snd) { A.snd = 1; api.thud(0.15); }
    if (u >= 1) { A.ph = 1; A.t = 0; A.snd = 0; }
    return;
  }
  if (A.ph === 1) {                                                             // climb out: the mirror of getting in
    const u = clamp(A.t / (T_IN * 0.95), 0, 1); A.u = 1 - u; R.door = 1;
    setWalker(R, keyAt(1 - u), P, dt);
    if (!A.snd && u > 0.8) { A.snd = 1; api.snowStep(0.6); }
    if (u >= 1) {
      FOOT.x = FOOT.x; FOOT.crouch = 0; DMT.on = false; R.A = { dir: "shut", t: 0 };
      FOOT.step = 0; FOOT.sp = 0; api.thud(0.2); api.camState.init = false;
    }
  }
}
// the door closes by itself once you are out
function idleDoor(R, dt) {
  const A = R.A;
  if (A && A.dir === "shut") { A.t += dt; R.door = Math.max(0, R.door - dt / 0.7); if (R.door <= 0) { R.door = 0; api.thud(0.3); R.A = null; } return; }
  if (!A && R.door > 0) { R.door = Math.max(0, R.door - dt / 0.5); }
}

/* ---------------- swapping the active vehicle ---------------- */
// Parcels are live job objects (they point at sites), which cannot go in the save. The vehicle you are in uses GS.load; a
// parked one's live array waits in LIVE (key: uid, or "sled"); save() writes plain JSON copies into the state.
const LIVE = new Map();
function bogSnap() { const B = api.BOG; return B.on ? { depth: B.depth, r: B.r, r0: B.r0, resist: B.resist, moved: B.moved, dig: B.dig } : null; }
function bogRestore(s, x, z) {
  const B = api.BOG;
  if (!s) { B.on = false; B.acc = 0; B.dig = 0; B.warned = false; return; }
  B.on = true; B.depth = s.depth; B.r = s.r; B.r0 = s.r0; B.resist = s.resist; B.moved = s.moved; B.dig = s.dig; B.x = x; B.z = z; B.t = 0; B.acc = 0;
}
function curRec() { const s = S(); return s.cur == null ? null : rec(s.cur); }
function swapTo(uid) {                                                          // uid null = the sled
  const s = S(), P = api.P, GS = api.GS, veh = api.veh, FOOT = api.FOOT;
  if ((s.cur == null && uid == null) || s.cur === uid) return;
  const from = curRec(), to = uid == null ? null : rec(uid);
  if (uid != null && !to) return;
  const snap = { x: P.x, z: P.z, yaw: P.yaw, y: P.y, fuel: GS.fuel, bog: bogSnap(), safe: P.safe, load: [] };
  LIVE.set(from ? from.uid : "sled", GS.load);
  if (from) Object.assign(from, snap, { load: from.load }); else s.sled = snap;
  const src = to || s.sled, key = to ? to.uid : "sled";
  P.x = src.x; P.z = src.z; P.yaw = src.yaw; P.vx = P.vy = P.vz = 0; P.yr = 0; P.pitch = P.roll = 0; P.sink = 0; P.wet = false; P.sY = P.sV = 0; P.comp = 0; P.wh = 0; P.whVis = 0; P.airT = 0; P.airP = P.airR = 0; P.stuckT = 0;
  P.safe = src.safe || { x: src.x, z: src.z, yaw: src.yaw };
  P.y = api.world.surf(src.x, src.z) + (to ? 0 : 0.3);
  GS.fuel = src.fuel; GS.load = LIVE.has(key) ? LIVE.get(key) : desLoad(src.load); LIVE.delete(key);
  bogRestore(src.bog, src.x, src.z);
  if (to) { s.cur = to.uid; } else { s.cur = null; s.sled = null; }
  veh.sled = s.cur == null ? null : s.sled;
  setCur(to);
  api.restat();
  if (to) { const R = runtime(to); R.rec = to; R.drag = 0; for (let i = 0; i < 4; i++) { R.H[i] = P.y; R.dy[i] = 0; } R.A = null; R.door = 0; R.yr = 0; R.steer = 0; R.sY = R.sV = 0; R.drvBody.visible = R.drvArms.visible = !FOOT.on; }
  api.camState.init = false;
  GS.outWarned = GS.lowWarned = false;
}
let driverObj = null;
function setCur(r) {
  const veh = api.veh, hl = api.sled.headlight;
  if (!r) {
    veh.cur = null; veh.board = "get on the sled"; veh.noun = "Sled";
    if (hl.parent !== api.sled.body) { api.sled.body.add(hl, hl.target); hl.position.set(0, 0.6, 1.3); hl.target.position.set(0, -1.2, 14); }
    return;
  }
  const R = runtime(r);
  veh.cur = R.driver || (R.driver = makeDriver(R));
  veh.board = "get in the " + R.def.kind; veh.noun = R.def.kind[0].toUpperCase() + R.def.kind.slice(1);
  if (hl.parent !== R.grp) { R.grp.add(hl, hl.target); hl.position.set(0, 0.95, 2.5); hl.target.position.set(0, -0.6, 18); }
}
function makeDriver(R) {
  const d = R.def;
  return {
    get mass() { return R.mass || d.mass; },
    core: dt => core(R, dt),
    restat(ST) {
      R.baseCold = ST.coldMul;
      ST.fuel = d.fuel; ST.slots = d.slots; ST.bays = 0; ST.winch = 0; ST.camp = 0; ST.campCap = 0; ST.burn = d.burn; ST.power = 1; ST.light = Math.max(ST.light, 1.4);
      ST.coldMul = d.cabCold; ST.armor = Math.max(ST.armor, 0.1); ST.cool = 0;
    },
    visual(dt) { place(R, api.P, dt, true); },
    eye(v) { R.grp.updateMatrixWorld(true); return R.grp.localToWorld(v.set(d.eye[0], d.eye[1], d.eye[2])); },
    mount: () => doMount(R), dismount: () => doDismount(R),
    mountTick: dt => mountTick(R, dt), dismountTick: dt => dismountTick(R, dt),
    nearMount: () => nearMount(R)
  };
}

/* ---------------- the walker is stopped by every parked vehicle ---------------- */
function blockWalker(nx, nz) {
  const s = S(), P = api.P, d0 = 0.36;
  for (const r of s.owned) {
    const d = byId(r.id); if (!d) continue;
    const cur = s.cur === r.uid, px = cur ? P.x : r.x, pz = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw;
    const fx = Math.sin(yaw), fz = Math.cos(yaw), dx = nx - px, dz = nz - pz;
    let lx = dx * fz - dz * fx, lz = dx * fx + dz * fz;                        // into the vehicle's frame (x left, z forward)
    const hx = d.wid / 2 + d0, hz = d.len / 2 + d0;
    if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
      const ox = hx - Math.abs(lx), oz = hz - Math.abs(lz);
      if (ox < oz) lx = Math.sign(lx || 1) * hx; else lz = Math.sign(lz || 1) * hz;
      nx = px + fz * lx + fx * lz; nz = pz - fx * lx + fz * lz;
    }
  }
  const sl = S().cur != null ? api.veh.sled : null;
  if (sl) { const dx = nx - sl.x, dz = nz - sl.z, d2 = dx * dx + dz * dz; if (d2 < 0.7 * 0.7 && d2 > 1e-6) { const dd = Math.sqrt(d2); nx = sl.x + dx / dd * 0.7; nz = sl.z + dz / dd * 0.7; } }
  return [nx, nz];
}

/* ---------------- parcels and the save ---------------- */
function serLoad(arr) {
  const out = [], SITES = api.world.SITES;
  for (const j of arr || []) {
    if (!j || j.crate || j.tut || j.school || j.boat || j.big) continue;
    const o = {};
    for (const k in j) {
      const v = j[k];
      if (v === null || typeof v === "number" || typeof v === "string" || typeof v === "boolean") o[k] = v;
      else if (v && typeof v === "object" && typeof v.id === "string" && SITES.includes(v)) o[k] = { $s: v.id };
    }
    out.push(o);
  }
  return out;
}
function desLoad(arr) {
  const out = [], SITES = api.world.SITES;
  for (const o of Array.isArray(arr) ? arr : []) {
    if (!o || typeof o !== "object") continue;
    const j = {}; let ok = true;
    for (const k in o) { const v = o[k]; if (v && typeof v === "object" && typeof v.$s === "string") { const s = SITES.find(x => x.id === v.$s); if (s) j[k] = s; else if (k === "dest") ok = false; } else j[k] = v; }
    if (ok && j.dest) out.push(j);
  }
  return out;
}
function syncRecords() {
  const P = api.P, GS = api.GS, c = curRec();
  if (c) { c.x = P.x; c.z = P.z; c.yaw = P.yaw; c.fuel = GS.fuel; c.bog = bogSnap(); c.safe = P.safe ? { x: P.safe.x, z: P.safe.z, yaw: P.safe.yaw } : null; }
}
const NUM = v => (typeof v === "number" && isFinite(v) ? v : 0);
function save() {
  const s = S(); syncRecords();
  s.owned = s.owned.filter(r => byId(r.id));
  for (const r of s.owned) {
    r.x = NUM(r.x); r.z = NUM(r.z); r.yaw = NUM(r.yaw); r.fuel = NUM(r.fuel); r.cond = clamp(NUM(r.cond), 0, 100);
    const live = s.cur === r.uid ? api.GS.load : LIVE.get(r.uid);
    if (live) r.load = serLoad(live);
  }
  if (s.sled) { s.sled.fuel = NUM(s.sled.fuel); s.sled.x = NUM(s.sled.x); s.sled.z = NUM(s.sled.z); s.sled.yaw = NUM(s.sled.yaw); const live = LIVE.get("sled"); if (live) s.sled.load = serLoad(live); }
}

/* ---------------- buying: the garage's Trucks tab ---------------- */
function forecourtSpot(d) {
  const w = api.world, g = w.garage(), P = api.P, FOOT = api.FOOT, s = S();
  const dep = w.depot, base = Math.atan2(dep.x - g.x, dep.z - g.z), cands = [];
  for (let r = 8; r <= 30; r += 3) for (let a = 0; a < 6.283; a += 0.35) cands.push([g.x + Math.cos(a) * r, g.z + Math.sin(a) * r, r]);
  cands.sort((a, b) => a[2] - b[2]);
  const others = [[P.x, P.z]]; if (FOOT.on) others.push([FOOT.x, FOOT.z]); for (const r of s.owned) others.push([r.x, r.z]); if (api.veh.sled) others.push([api.veh.sled.x, api.veh.sled.z]);
  for (const [x, z] of cands) {
    if (w.isWater(x, z) || w.obNear(x, z, d.len / 2 + 0.6) ) continue;
    let ok = true; for (const [ox, oz] of others) if (Math.hypot(x - ox, z - oz) < 7) { ok = false; break; }
    if (!ok) continue;
    if (w.yardAt(x, z) < 0.5) continue;                                       // on the plowed forecourt, not the drift
    // room for the whole truck: no obstacle at nose or tail either, and the ground is level
    let clear = true;
    for (const yaw of [base, base + 0.0]) for (const off of [-2.4, 2.4]) { const px = x + Math.sin(yaw) * off, pz = z + Math.cos(yaw) * off; if (w.isWater(px, pz) || w.obNear(px, pz, 1.2)) clear = false; }
    if (!clear) continue;
    return { x, z, yaw: base };
  }
  return null;
}
function buy(id) {
  const s = S(), GS = api.GS, d = byId(id); if (!d) return;
  if (api.tutHidden()) { api.toast("Collect your first sled first.", "warn"); return; }
  if (s.owned.length >= MAX_OWNED) { api.toast(`That is enough trucks on the forecourt (${MAX_OWNED}).`, "warn"); return; }
  if (GS.cash < d.cost) { api.toast(`The ${d.name} is ${api.fmtCash(d.cost)}. You have ${api.fmtCash(GS.cash)}.`, "warn"); return; }
  const spot = forecourtSpot(d); if (!spot) { api.toast("No room on the forecourt: move something first.", "warn"); return; }
  GS.cash -= d.cost;
  const r = { uid: "v" + (++s.seq), id: d.id, x: spot.x, z: spot.z, yaw: spot.yaw, fuel: d.fuel, cond: 100, load: [] };
  s.owned.push(r);
  api.toast(`Bought the ${d.name}. It is parked on the forecourt with a full tank.`, "good");
  api.save(); api.garageRefresh();
}
function garageRows(body, row) {
  const s = S(), GS = api.GS;
  for (const d of VEHICLES) {
    const n = s.owned.filter(r => r.id === d.id).length;
    const spec = `${d.year} · ${d.fuel} L tank · carries ${d.slots} parcels · closed, heated cab · ${d.mass} kg`;
    const how = `Grips on plowed yards, lanes and hard pack. In deep powder it sinks, digs and bogs, so keep the fell for the sled.`;
    row(d.name, `${spec}\n<span style="color:#9fd8a8">${how}</span>\n${d.blurb}`, n ? `Owned ×${n} · $${d.cost}` : "$" + d.cost, GS.cash < d.cost ? "locked" : "", () => buy(d.id), String(d.year));
  }
  for (const r of s.owned) {
    const d = byId(r.id); if (!d) continue;
    const e = document.createElement("div"); e.className = "bfoot"; e.textContent = `${d.name}: ${Math.round(r.cond)}% condition, ${r.fuel.toFixed(0)} of ${d.fuel} L, parked ${Math.round(Math.hypot(r.x - api.world.garage().x, r.z - api.world.garage().z))} m from the garage.`;
    body.appendChild(e);
  }
  const note = document.createElement("div"); note.className = "bfoot"; note.textContent = "Walk up to a truck and get in. Your sled stays where you left it.";
  body.appendChild(note);
}

/* ---------------- the frame hooks ---------------- */
function nearestTick() {
  const s = S(), FOOT = api.FOOT, P = api.P;
  if (!s.owned.length || !FOOT.on || !api.swapOk()) return;
  const sl = s.cur == null ? P : api.veh.sled;
  const cands = [{ key: null, d: Math.hypot(FOOT.x - sl.x, FOOT.z - sl.z) }];
  for (const r of s.owned) {                                                    // a truck's distance: to its door, or to its middle less its half-width
    const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw, fx = Math.sin(yaw), fz = Math.cos(yaw);
    const dx = x + fz * STAND.x + fx * STAND.z, dz = z - fx * STAND.x + fz * STAND.z;
    cands.push({ key: r.uid, d: Math.min(Math.hypot(FOOT.x - dx, FOOT.z - dz), Math.hypot(FOOT.x - x, FOOT.z - z) - 1.4) });
  }
  const cur = cands.find(c => c.key === s.cur) || cands[0]; let best = cur;
  for (const c of cands) if (c.d < best.d) best = c;
  if (best !== cur && best.d + 1 < cur.d) swapTo(best.key);                      // 1 m of hysteresis so standing between two does not flip them
}
function parkedPose(R, r, dt) {
  if (R.pt !== undefined && parkClock - R.pt < 0.4 && R.px === r.x && R.pz === r.z) { return; }
  R.pt = parkClock; R.px = r.x; R.pz = r.z; R.bodyP = R.bodyR = 0;
  const P = tmpP; P.x = r.x; P.z = r.z; P.yaw = r.yaw; P.pitch = R.pp || 0; P.roll = R.pr || 0; P.gnd = true;
  const d = R.def;
  for (let i = 0; i < 4; i++) { wheelXZ(R, i, P, _w); const x = _w[0], z = _w[1], g = gnd(x, z), db = depthBi(x, z), f = api.world.freshAt(Math.round((x + HALF) / CELL), Math.round((z + HALF) / CELL)), pk = f > 0.02 ? clamp(1 - db / f, 0, 1) : 1; R.H[i] = g + db - db * (0.35 + 0.65 * (1 - pk)); }
  P.y = (R.H[0] + R.H[1] + R.H[2] + R.H[3]) / 4;
  place(R, P, 1 / 30, false); R.pp = P.pitch; R.pr = P.roll;
}
const tmpP = { x: 0, z: 0, yaw: 0, y: 0, pitch: 0, roll: 0, gnd: true };
let parkClock = 0;
function tick(dt) {
  if (!api) return;
  const s = S(), P = api.P, ST = api.ST(), FOOT = api.FOOT, cam = api.camera;
  if (!s.owned.length) return;
  nearestTick();
  syncRecords();
  const night = 1 - api.dayFactor(), cr = curRec();
  parkClock += dt;
  for (const r of s.owned) {
    const R = runtime(r), isCur = cr && cr.uid === r.uid, far = !isCur && Math.hypot(r.x - cam.position.x, r.z - cam.position.z) > 500;
    R.rec = r;
    if (far) { R.grp.visible = false; continue; }
    R.grp.visible = true;
    if (!isCur) { R.moved = R.moved || 0; parkedPose(R, r, dt); R.door = Math.max(0, R.door - dt / 0.5); R.steer *= 0.9; }
    else { if (R.A && R.A.dir !== "shut" && !api.MNT.on && !api.DMT.on) R.A = null; idleDoor(R, dt); }
    R.doorPivot.rotation.y = -R.door * DOOR_OPEN;
    const on = night > 0.35 && (isCur ? GSfuel() : false);
    lights(R, on, isCur && R.brake, isCur && R.rev);
    bedBoxes(R, isCur ? api.GS.load.length : (r.load ? r.load.length : 0));
    if (isCur) {
      const seated = !FOOT.on, fp = api.fp();
      R.drvBody.visible = R.drvArms.visible = seated && !fp;
      R.drvArms.rotation.z = -R.steer * 0.35; R.drvArms.position.x = 0;
      // the heated cab keeps you warm only while you are in it
      if (ST) ST.coldMul = seated ? R.def.cabCold : R.baseCold;
    } else { R.drvBody.visible = R.drvArms.visible = false; }
  }
  // the sled's headlight goes back onto the sled if nothing is driving
  if (!cr) { setCur(null); }
}
const GSfuel = () => api.GS.fuel > 0;

TLX.register({
  id: "vehicles", v: 1,
  state0: () => ({ owned: [], cur: null, sled: null, seq: 0 }),
  migrate: st => st,
  init(a) {
    api = a; T = a.THREE; CELL = a.world.cell; HALF = a.world.half;
    _q1 = new T.Quaternion(); _q2 = new T.Quaternion(); _q3 = new T.Quaternion(); _Y = new T.Vector3(0, 1, 0); _X = new T.Vector3(1, 0, 0); _p = new T.Vector3(); _s = new T.Vector3(); _mm = new T.Matrix4();
    const s = S();
    s.owned = (Array.isArray(s.owned) ? s.owned : []).filter(r => r && byId(r.id)).map(r => Object.assign({ x: 0, z: 0, yaw: 0, fuel: byId(r.id).fuel, cond: 100, load: [] }, r, { load: Array.isArray(r.load) ? r.load : [] }));
    if (s.sled && !Array.isArray(s.sled.load)) s.sled.load = [];
    api.veh.block = blockWalker;
    api.veh.tabs.push({ id: "trucks", name: "Trucks", render: garageRows });
    // the tablet's Map: a pin on every vehicle you aren't in (the sled while you drive, the trucks while you ride the sled)
    a.TABLET.addLayer("vehicles", () => {
      const s = S(), out = [], noun = r => { const d = byId(r.id); return d.kind[0].toUpperCase() + d.kind.slice(1); };
      if (s.cur != null && s.sled) out.push({ x: s.sled.x, z: s.sled.z, name: "Sled", kind: "sled" });
      for (const r of s.owned) if (r.uid !== s.cur) out.push({ x: r.x, z: r.z, name: noun(r), kind: "truck" });
      return out;
    });
    if (s.cur != null && (!rec(s.cur) || !s.sled || a.tutHidden())) { s.cur = null; s.sled = null; }
    if (s.cur != null) {                                                       // reloaded while in a vehicle: back in it, the sled where it was left
      const to = rec(s.cur), sl = s.sled, P = a.P, GS = a.GS;
      sl.y = 0; sl.safe = null; LIVE.set("sled", desLoad(sl.load));
      P.x = to.x; P.z = to.z; P.yaw = to.yaw; P.vx = P.vy = P.vz = 0; P.y = a.world.surf(to.x, to.z); P.safe = to.safe || { x: to.x, z: to.z, yaw: to.yaw };
      GS.fuel = to.fuel; GS.load = desLoad(to.load);
      a.veh.sled = s.sled;
      setCur(to); a.restat();
      const R = runtime(to); R.drvBody.visible = R.drvArms.visible = true;
      bogRestore(to.bog, to.x, to.z);
    }
  },
  tick, save
});
window.TLXV = { VEHICLES, swapTo: uid => swapTo(uid), state: S, rt: () => { const c = curRec(); return c ? runtime(c) : null; } };   // for the playtests
})();
