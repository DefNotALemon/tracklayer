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
    fuel: 70, burn: 1, slots: 8, cabCold: 0.12, hitchKg: 1500, hitchZ: -3.1, // litres, parcels in the bed, cold drained as fast as the sled's baseline; kg the receiver takes, where its ball sits
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
const BELLY = [0.6, -0.6, -1.6];                                               // where the chassis bottom ploughs, m along the centre line
// a point in the vehicle's frame -> world
const toWorld = (P, lx, lz, out) => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); out[0] = P.x + fz * lx + fx * lz; out[1] = P.z - fx * lx + fz * lz; return out; };

/* ---------------- the physics: core(dt) runs in place of physCore while you are in a vehicle ---------------- */
const GR = 9.81;
function core(R, dt) {
  const P = api.P, input = api.input, FOOT = api.FOOT, BOG = api.BOG, HELP = api.HELP, GS = api.GS, d = R.def, w = api.world, ST = api.ST();
  if (HELP.on && HELP.kind === "sea") { P.vx = P.vz = P.vy = 0; P.y = Math.max(w.rideSurf(P.x, P.z), P.wl - 0.5); P.gnd = true; P.wet = true; return; }   // dunked, waiting on the rescue sled
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), lx = fz, lz = -fx;
  const tw = api.towLive() ? api.tow : null;                                 // the rig on this truck's hitch (slice 2.5): its weight and its drag
  const hk = haulKg(R.rec.uid);                                              // the sled trailer on this ball (2.6a): inertia here, its rolling in Fres
  const M = R.mass = d.mass + 6 * Math.min(8, smallN(api.GS.load)) + (tw ? tw.mass : 0) + hk, W = (M - (tw ? tw.mass : 0) - hk) * GR, started = api.started();   // the rig adds inertia; its own drag stands for its rolling
  const wl0 = w.wlvAt(P.x, P.z), sea = wl0 !== null; if (sea) P.wl = wl0; else P.sink = 0;
  let vx = P.vx, vz = P.vz;
  const parked = FOOT.on || GS.dead;                                         // standing or climbing in/out: the brake is on
  // --- the four wheels: the snow in front of each sets its sink, rolling resistance and grip; its own cell sets where it sits
  // which way the tyres are about to roll: the way it's moving, or at a crawl the way the driver is asking (S held with no
  // throttle = reverse), so backing out reads the truck's own ruts behind it, not the unbroken bank it just braked into (0108 #1)
  const vf_ = vx * fx + vz * fz, wantRev = input.brk > 0 && !(input.thr > 0) && !FOOT.on && vf_ < 0.8;
  const sgn = Math.abs(vf_) < 0.5 ? (wantRev ? -1 : 1) : Math.sign(vf_), ahead = 0.42 * sgn;
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
    /* rolling resistance against the sink: about sink / tyre diameter in shallow snow (a 4x4 on winter tyres pulls away in
       a hand's depth to a boot's depth of fresh), steepening once the tyre is pushing a bank as tall as its radius, so past
       ~30 cm it is a crawl and past the clearance the belly finishes it (beta 0117 #1: was 0.95 * sk, stuck from ~20 cm) */
    const ex = Math.max(0, sk - 0.22), cr = 0.016 + 0.55 * sk + 2.2 * ex * ex + (wet ? 0.45 : 0) + (ice ? -0.004 : 0);
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
  // read at the chassis' leading edge (the way it is rolling): the belly ploughs a trench behind it (pressed below), so the
  // way back along it is clear and only fresh snow in front pushes back
  const bx = P.x + fx * 1.5 * sgn, bz = P.z + fz * 1.5 * sgn;   /* clear of the pressing (BELLY) going forward */
  const sc = gnd(bx, bz) + depthBi(bx, bz), emb = Math.max(0, sc - (Hc + d.clearance)), cb = 0.45 * Math.pow(Math.min(3, emb / 0.12), 1.2);
  const condK = 0.65 + 0.35 * R.rec.cond / 100;
  // --- longitudinal: engine, brake, reverse against traction and resistance
  let vf = vx * fx + vz * fz, vl = vx * lx + vz * lz;
  const T0 = muS * W, thrE = GS.fuel > 0 && !GS.dead && !parked ? input.thr : 0;
  const rev = input.brk > 0 && !(input.thr > 0) && GS.fuel > 0 && !GS.dead && !parked && vf < 0.8;
  api.GB.dir = rev ? -1 : 1;
  let Fe = 0;
  if (thrE > 0) { const gov = vf > d.top ? Math.max(0, 1 - (vf - d.top) / 2) : 1; Fe = thrE * Math.min(d.fmax, d.power / Math.max(vf, 2.2)) * condK * gov; }
  let Fx = 0, spin = 0;
  /* reverse is geared about as low as first: 0.8 of fmax (was 0.6, too weak to back a trailer out of soft snow, 0108) */
  /* a light pull on the pad trigger still backs up: an automatic creeps in reverse, so the pedal maps onto 0.35..1 of the
     pull past a small dead zone instead of 0..1 (beta 0116 #2: 30% LT made 2 kN against 1-2.7 kN of standing drag) */
  const brkR = input.brk > 0.08 ? 0.35 + 0.65 * input.brk : input.brk;
  if (rev) { const over = Math.max(0, -vf) / d.revTop; Fx = -Math.min(d.fmax * 0.8, T0) * brkR * (over > 1 ? Math.max(0, 1 - (over - 1) * 6) : 1); }
  else if (input.brk > 0 && !parked) Fx = -Math.min(9500, T0 * 0.98) * input.brk * (vf > 0.4 ? 1 : 0.25);
  if (Fe > 0) { Fx += Math.min(Fe, T0); spin = Math.max(0, Fe - T0) / Math.max(T0, 600); }
  const vfPrev = vf; vf += Fx / M * dt;
  if (!rev && input.brk > 0 && vfPrev >= 0 && vf < 0) vf = 0;                     // the brake stops you; only S held at a standstill backs you up
  const aero = 0.95 * vf * Math.abs(vf), Fres = W * (crS + cb) + Math.abs(aero) + (tw ? tw.drag : 0) + haulDrag(R.rec.uid);
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
  else if (BOG.on && !HELP.on && gndOK && Math.max(R.sink[0], R.sink[1], R.sink[2], R.sink[3]) < 0.05 && packS > 0.8) api.freeBog("");   // dragged or towed onto plowed/hard ground: nothing left to be stuck in (beta 0117 #2)
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
  const eff = thrE > 0 ? thrE : rev ? input.brk : 0;                         // S in reverse spins the wheels too (0108 #1)
  R.spinK = eff > 0.2 ? Math.min(1.6, spin + stuck * 0.8) : 0;
  if (!BOG.on && !parked && gndOK && !P.ice && P.wet === false && BOG.immune <= 0 && !HELP.on) {
    const dig = eff > 0.25 && spd0 < 3.5 && sinkS > 0.07 ? (spin * 0.6 + stuck * 0.55) * 0.2 * eff * clamp(sinkS / 0.3, 0.25, 1.5) : 0;
    if (dig > 0.01) {
      BOG.acc += dig * dt;
      if (BOG.acc > 0.45 && !BOG.warned) { BOG.warned = true; toastDig(rev); }
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
    // the belly ploughs: snow above the chassis bottom along the centre line is pushed down to it (0108 #1: the trench is
    // the way back out)
    if (spd0 > 0.2) for (const o of BELLY) {
      const x = P.x + fx2 * o, z = P.z + fz2 * o, fr = w.freshAt(Math.round((x + HALF) / CELL), Math.round((z + HALF) / CELL));
      if (fr < 0.05) continue;
      const lvl = Hc + d.clearance - gnd(x, z); if (lvl < fr) w.pressSnow(x, z, d.wid * 0.3, clamp(lvl / fr, 0.05, 1));
    }
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
function toastDig(rev) { api.toast(rev ? "The wheels spin in reverse and dig in. Ease off before it's stuck to the axles." : "The wheels are digging in. Ease off, or back out along your own ruts.", "warn"); }

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
  if (!to && Number.isFinite(src.y)) P.y = Math.max(P.y, src.y + 0.05);          // up on the sled trailer's deck (2.6b)
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
      ST.groom = 0;
      if (rigOn() === R.rec.uid) { const o = api.hitchStats(); ST.bays = o.bays || 0; ST.groom = o.groom || 0; ST.burn += o.burn || 0; }   // the rig on this truck's hitch
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
  const h = haulS();
  if (h) {                                                                       // the sled trailer: a box from its tail to its coupler
    const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw), zc = (HAUL.L + HAUL.deckZ0) / 2, dx = nx - h.x, dz = nz - h.z;
    let lx = dx * fz - dz * fx, lz = dx * fx + dz * fz - zc;
    const hx = HAUL.wid / 2 + d0, hz = (HAUL.L - HAUL.deckZ0) / 2 + d0;
    if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
      const ox = hx - Math.abs(lx), oz = hz - Math.abs(lz);
      if (ox < oz) lx = Math.sign(lx || 1) * hx; else lz = Math.sign(lz || 1) * hz;
      lz += zc; nx = h.x + fz * lx + fx * lz; nz = h.z - fx * lx + fz * lz;
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
    if (!j || j.crate || j.tut || j.school || j.boat) continue;              // big loads too: since 2.5 a trailer on a truck carries them
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
  const rg = rigS(), TOW = api.tow;
  if (rg.on !== "sled" && TOW.kind && TOW.kind === rg.kind) { rg.x = NUM(TOW.x); rg.z = NUM(TOW.z); rg.yaw = NUM(TOW.yaw); }
  const h = haulS();
  if (h) { h.x = NUM(h.x); h.z = NUM(h.z); h.yaw = NUM(h.yaw); h.ramp = h.ramp > 0.5 ? 1 : 0; h.cond = Number.isFinite(h.cond) ? clamp(h.cond, 0, 100) : 100; if (h.on != null && !rec(h.on)) h.on = null; }
  else s.haul = null;
  if (s.sled) { s.sled.fuel = NUM(s.sled.fuel); s.sled.x = NUM(s.sled.x); s.sled.z = NUM(s.sled.z); s.sled.yaw = NUM(s.sled.yaw); const live = LIVE.get("sled"); if (live) s.sled.load = serLoad(live); }
}

/* ---------------- buying: the garage's Trucks tab ---------------- */
function forecourtSpot(d) {
  const w = api.world, g = w.garage(), dep = w.depot, base = Math.atan2(dep.x - g.x, dep.z - g.z);
  return spotNear(g.x, g.z, d, true, () => base);
}
// a clear, level-enough spot 8-30 m from (cx, cz) for something d.len long: off the water, clear of obstacles, 7 m from you,
// your sled and every other vehicle. yard: only on plowed ground. yawOf(x, z) gives the way it faces.
function spotNear(cx, cz, d, yard, yawOf) {
  const w = api.world, P = api.P, FOOT = api.FOOT, s = S(), cands = [];
  for (let r = 8; r <= 30; r += 3) for (let a = 0; a < 6.283; a += 0.35) cands.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r, r]);
  cands.sort((a, b) => a[2] - b[2]);
  const others = [[P.x, P.z]]; if (FOOT.on) others.push([FOOT.x, FOOT.z]); for (const r of s.owned) others.push([r.x, r.z]); if (api.veh.sled) others.push([api.veh.sled.x, api.veh.sled.z]);
  if (s.haul && typeof s.haul === "object") others.push([s.haul.x, s.haul.z], haulCoupler(s.haul));
  for (const [x, z] of cands) {
    if (w.isWater(x, z) || (!yard && w.isSea(x, z)) || w.obNear(x, z, d.len / 2 + 0.6) ) continue;
    let ok = true; for (const [ox, oz] of others) if (Math.hypot(x - ox, z - oz) < 7) { ok = false; break; }
    if (!ok) continue;
    if (yard && w.yardAt(x, z) < 0.5) continue;                               // on the plowed forecourt, not the drift
    // room for the whole truck: no obstacle at nose or tail either, and the ground is level
    const yaw = yawOf(x, z);
    let clear = true;
    for (const off of [-2.4, 2.4]) { const px = x + Math.sin(yaw) * off, pz = z + Math.cos(yaw) * off; if (w.isWater(px, pz) || w.obNear(px, pz, 1.2)) clear = false; }
    if (!clear) continue;
    if (!yard && Math.abs(w.groundAt(x + Math.sin(yaw) * 2.4, z + Math.cos(yaw) * 2.4) - w.groundAt(x - Math.sin(yaw) * 2.4, z - Math.cos(yaw) * 2.4)) > 0.9) continue;   // not parked across a steep bank
    return { x, z, yaw };
  }
  return null;
}
function buy(id) {
  const s = S(), GS = api.GS, d = byId(id); if (!d) return;
  if (api.tutHidden()) { api.toast("Collect your first sled first.", "warn"); return; }
  if (s.owned.length >= MAX_OWNED) { api.toast(`That is enough trucks on the forecourt (${MAX_OWNED}).`, "warn"); return; }
  { const hp = heldVeh("pickup"); if (hp && usedTrucks(heldList()) >= MAX_OWNED) { api.toast(`That would be ${MAX_OWNED + 1} trucks: the pickup you paid for is waiting in ${heldWhere(hp)}.`, "warn"); return; } }   // report 0110: a paid-for pickup counts
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
  const full = usedTrucks(heldList()) >= MAX_OWNED, hp = heldVeh("pickup");          // report 0110: a pickup paid for at Bytteboden counts
  for (const d of VEHICLES) {
    const n = s.owned.filter(r => r.id === d.id).length;
    const spec = `${d.year} · ${d.fuel} L tank · carries ${d.slots} parcels · closed, heated cab · ${d.mass} kg`;
    const how = `Grips on plowed yards, lanes and hard pack. In deep powder it sinks, digs and bogs, so keep the fell for the sled.`;
    const wait = hp ? `\n<span style="color:#f0c674">You've paid for a used pickup: it's waiting in ${heldWhere(hp)}.${full ? ` That makes ${MAX_OWNED} trucks, the most the forecourt takes.` : ""}</span>` : "";
    row(d.name, `${spec}\n<span style="color:#9fd8a8">${how}</span>\n${d.blurb}${wait}`, n ? `Owned ×${n} · $${d.cost}` : "$" + d.cost, full || GS.cash < d.cost ? "locked" : "", () => buy(d.id), String(d.year));
  }
  for (const r of s.owned) {
    const d = byId(r.id); if (!d) continue;
    const e = document.createElement("div"); e.className = "bfoot"; e.textContent = `${d.name}: ${Math.round(r.cond)}% condition, ${r.fuel.toFixed(0)} of ${d.fuel} L, parked ${Math.round(Math.hypot(r.x - api.world.garage().x, r.z - api.world.garage().z))} m from the garage.`;
    body.appendChild(e);
  }
  {                                                                              // the sled trailer (2.6a): one per player
    const h = haulS(), hh = !h && heldVeh("haul"), spec = `Single axle · ${HAUL.mass} kg · 3.9 m wooden deck with a full-width ramp gate · hitches to a truck's ball, not to the sled`;
    const how = `Back a truck up to its coupler and use it on foot to hitch it; use at its tail to drop or raise the ramp. Drive the sled up the ramp, get off and use beside the deck to strap it down; then tow it anywhere.`;
    const wait = hh ? `\n<span style="color:#f0c674">You've paid for a used one: it's waiting in ${heldWhere(hh)}.</span>` : "";
    row(HAUL.name, `${spec}\n<span style="color:#9fd8a8">${how}</span>${wait}`, h ? `Owned · ${Math.round(h.cond)}%` : hh ? "Paid for" : "$" + HAUL.cost, hh || (!h && GS.cash < HAUL.cost) ? "locked" : "", () => buyHaul(), "trailer");
  }
  // the shop puts a worn truck or trailer right (2.7: dents from trees, or a used one off Bytteboden); it has to be here
  for (const r of s.owned) {
    const d = byId(r.id); if (!d || r.cond >= 99.5) continue;
    const c = repairCost("truck", r), here = nearGarage(s.cur === r.uid ? api.P : r);
    row(`Repair the ${d.name}`, here ? `${Math.round(r.cond)}% now. Panel beating, an alignment and a service: back to 100%.` : `${Math.round(r.cond)}%. Bring it within ${REPAIR_R} m of the garage first.`, "$" + c, !here || GS.cash < c ? "locked" : "", () => repair("truck", r), "service");
  }
  { const h = haulS(); if (h && h.cond < 99.5) {
    const c = repairCost("haul", h), here = nearGarage(h);
    row(`Repair the ${HAUL.name.toLowerCase()}`, here ? `${Math.round(h.cond)}% now: it rolls heavy. New bearings and a straight axle: back to 100%.` : `${Math.round(h.cond)}%. Bring it within ${REPAIR_R} m of the garage first.`, "$" + c, !here || GS.cash < c ? "locked" : "", () => repair("haul", h), "service");
  } }
  const note = document.createElement("div"); note.className = "bfoot"; note.textContent = "Walk up to a truck and get in. Your sled stays where you left it.";
  body.appendChild(note);
}

/* ---------------- the universal hitch (slice 2.5) ----------------
   One coupling for every machine. The rig you own (GS.own.parts.hitch: groomer, tiller, trailer, flatbed or akja) is hooked
   to exactly one vehicle, or stands free on its tongue: state.rig = { on: "sled" | truck uid | null, kind, x, z, yaw }.
   "sled" is the default and every save before 2.5, i.e. the game as it was. Receivers are weight ratings: the sled's receiver
   part (recvOk: the light one takes the trailer, drag and toboggan, the heavy one everything) or a truck's hitchKg against the
   rig plus what is on it. On foot at the tongue, use (E / L3 / the touch button) unhitches it, or hitches it to whichever
   machine has its ball within HITCH_REACH of the coupler: back up to it, get out, drop it on. Big loads ride on the trailer, so
   they go where it goes; you can't unhitch with one strapped on (or a casualty in the toboggan). Fitting a rig at the garage
   puts it on the sled. tracklayer.js asks VEH.rigOn / rigLive / rigAt / rigBall / rigFoot; towStep runs for whichever machine
   is P when the rig is on it, so the trailer tracks, tips and grooms behind a truck exactly as it does behind the sled. */
const HITCH_REACH = 1.6, TONGUE_REACH = 2.1;                                    // m: ball to coupler to drop it on; you to the coupler
const RIG_NOUN = { groomer: "groomer drag", tiller: "wing tiller", trailer: "trailer", flatbed: "flatbed", akja: "toboggan" };
const smallN = arr => (Array.isArray(arr) ? arr.filter(j => j && !j.big).length : 0);
function rigS() { const s = S(); if (!s.rig || typeof s.rig !== "object") s.rig = { on: "sled" }; if (s.rig.on === undefined) s.rig.on = "sled"; return s.rig; }
function rigOn() { return rigS().on; }
function rigLive() { const on = rigOn(), s = S(); return on === "sled" ? s.cur == null : on != null && s.cur === on; }
function hostPose(on) {                                                         // { x, z, yaw, back } of the machine with that key
  const s = S(), P = api.P;
  if (on === "sled") { const p = s.cur == null ? P : s.sled; return p ? { x: p.x, z: p.z, yaw: p.yaw, back: api.hitchBack(), kg: 1e9 } : null; }
  const r = rec(on); if (!r) return null; const d = byId(r.id), p = s.cur === on ? P : r;
  return { x: p.x, z: p.z, yaw: p.yaw, back: -d.hitchZ, kg: d.hitchKg };
}
function ballOf(on) { const h = hostPose(on); return h ? [h.x - Math.sin(h.yaw) * h.back, h.z - Math.cos(h.yaw) * h.back] : null; }
function tongueTip() {
  const TOW = api.tow, H = api.HITCH[TOW.kind]; if (!H) return null;
  return [TOW.x + Math.sin(TOW.yaw) * H.len, TOW.z + Math.cos(TOW.yaw) * H.len];
}
function rigAt() { const on = rigOn(); if (on === "sled") return null; return (on != null && ballOf(on)) || tongueTip(); }
function rigBall(v) {                                                           // world point the tongue reaches to; false = the sled's own ball
  const on = rigOn(); if (on === "sled") return false;
  if (on != null) { const r = rec(on), R = r && RT.get(on); if (R) { R.grp.updateMatrixWorld(true); R.grp.localToWorld(v.set(0, 0.42, R.def.hitchZ)); return true; } }
  const t = tongueTip(); if (!t) return false;
  v.set(t[0], api.world.rideSurf(t[0], t[1]) + 0.32, t[1]); return true;      // resting on its jack
}
function loadOf(key) {
  const s = S(), cur = key === "sled" ? s.cur == null : s.cur === key;
  if (cur) return api.GS.load;
  if (LIVE.has(key)) return LIVE.get(key);
  const r = key === "sled" ? s.sled : rec(key);
  return r && Array.isArray(r.load) ? r.load : [];
}
function hostName(on) { if (on === "sled") return "sled"; const r = rec(on); return r ? byId(r.id).kind : "truck"; }
function rigCands() {                                                           // machines whose ball is within reach of the coupler, nearest first
  const t = tongueTip(); if (!t) return [];
  const s = S(), out = [];
  for (const key of ["sled"].concat(s.owned.map(r => r.uid))) {
    if (key === "sled" && s.cur != null && !s.sled) continue;
    if (s.haul && s.haul.on === key) continue;                                  // that ball holds the sled trailer (2.6a)
    const b = ballOf(key); if (!b) continue;
    const dd = Math.hypot(b[0] - t[0], b[1] - t[1]); if (dd <= HITCH_REACH) out.push({ key, d: dd, b });
  }
  return out.sort((a, b) => a.d - b.d);
}
function rigFoot() {                                                            // what use does at the rig's tongue, or null
  const GS = api.GS, F = api.FOOT, kind = GS.own.parts.hitch, TOW = api.tow;
  if (!F.on || !api.HITCH[kind] || TOW.kind !== kind || api.tutHidden() || api.MNT.on || api.DMT.on) return null;
  const t = tongueTip(); if (!t || Math.hypot(F.x - t[0], F.z - t[1]) > TONGUE_REACH) return null;
  const on = rigOn(), noun = RIG_NOUN[kind] || "rig";
  if (on != null) return { label: "UNHITCH", what: `unhitch the ${noun} from the ${hostName(on)}`, act: unhitch };
  const c = rigCands()[0];
  if (!c) return { label: null, what: `The ${noun} stands on its jack · back the sled or a truck up to the tongue to hitch it` };
  return { label: "HITCH", what: `hitch the ${noun} to the ${hostName(c.key)}`, act: () => hitch(c) };
}
function unhitch() {
  const GS = api.GS, kind = GS.own.parts.hitch, on = rigOn(), noun = RIG_NOUN[kind] || "rig", TOW = api.tow;
  if (on == null) return;
  const big = loadOf(on).filter(j => j && j.big);
  if (big.length) { api.toast(`The ${big[0].cargo} is strapped down on the ${noun}. Deliver it before you unhitch.`, "warn"); return; }
  if (kind === "akja" && api.sarPatientKg() > 0) { api.toast("There's a casualty strapped into the toboggan. Get them to help first.", "warn"); return; }
  const rg = rigS(); rg.on = null; rg.kind = kind; rg.x = TOW.x; rg.z = TOW.z; rg.yaw = TOW.yaw;
  TOW.wingOn = false; TOW.spd = 0; TOW.yr = 0; TOW.tipT = 0; TOW.mass = 0; TOW.drag = 0;
  api.restat(); api.whump && api.whump(0.2);
  api.toast(`You lift the coupler off the ${hostName(on)}'s ball and wind the jack down. The ${noun} stands free.`);
  api.save();
}
function hitch(c) {
  const GS = api.GS, kind = GS.own.parts.hitch, H = api.HITCH[kind], noun = RIG_NOUN[kind] || "rig", TOW = api.tow;
  if (!H || rigOn() != null) return;
  if (c.key === "sled" && !api.recvOk(kind)) { api.toast(`The ${noun} needs ${api.recvNeed(kind)} on the sled (garage, Parts).`, "warn"); return; }
  const hp = hostPose(c.key), kg = H.mass + loadOf(c.key).filter(j => j && j.big).reduce((a, j) => a + (j.kg || 0), 0);
  if (hp && kg > hp.kg) { api.toast(`The ${hostName(c.key)}'s receiver is rated for ${hp.kg} kg. That's ${Math.round(kg)} kg.`, "warn"); return; }
  // lift the tongue onto the ball: it pivots round its runners until the coupler sits on it
  const dx = c.b[0] - TOW.x, dz = c.b[1] - TOW.z, dd = Math.hypot(dx, dz) || 1;
  TOW.x = c.b[0] - dx / dd * H.len; TOW.z = c.b[1] - dz / dd * H.len; TOW.yaw = Math.atan2(dx, dz);
  TOW.spd = 0; TOW.yr = 0; TOW.tipT = 0; TOW.ghostT = 1; TOW.snagT = 0;
  const rg = rigS(); rg.on = c.key; rg.kind = kind;
  api.restat(); api.whump && api.whump(0.3);
  api.toast(`Coupler down on the ${hostName(c.key)}'s ball, pin in, chains crossed. The ${noun} is hitched.`, "good");
  api.save();
}
function rigTick() {                                                            // every frame, trucks or not
  const rg = rigS(), kind = api.GS.own.parts.hitch;
  if (rg.kind !== kind) {                                                       // the garage (or a seller) put a different rig on: it goes on the sled
    const first = rg.kind === undefined; rg.kind = kind;
    if (rg.on !== "sled") { rg.on = "sled"; if (!first) api.tow.kind = null; api.restat(); }
    const h = haulS();                                                          // a sled with a rig can't ride strapped (strap() refuses it): the straps come off
    if (h && h.strap && api.HITCH[kind]) { h.strap = null; api.toast(`The ${RIG_NOUN[kind] || "rig"} went on the sled, so its straps on the trailer came off. Unhitch the ${RIG_NOUN[kind] || "rig"} to strap it down again.`, "warn"); api.save(); }
    return;
  }
  if (rg.on != null && rg.on !== "sled" && !rec(rg.on)) { rg.on = null; api.restat(); }   // the truck is gone: the rig stays where it stood
}
function rigRestore() {                                                         // after a load: put a rig that isn't on the sled back where it was
  const rg = rigS(), kind = api.GS.own.parts.hitch, TOW = api.tow, H = api.HITCH[kind];
  if (!H || rg.kind !== kind) { rg.on = "sled"; rg.kind = kind; return; }
  if (rg.on === "sled") return;
  if (rg.on != null && !rec(rg.on)) rg.on = null;
  const ok = [rg.x, rg.z, rg.yaw].every(v => typeof v === "number" && isFinite(v));
  if (ok) { TOW.x = rg.x; TOW.z = rg.z; TOW.yaw = rg.yaw; }
  else if (rg.on != null) { const b = ballOf(rg.on), h = hostPose(rg.on); TOW.x = b[0] - Math.sin(h.yaw) * H.len; TOW.z = b[1] - Math.cos(h.yaw) * H.len; TOW.yaw = h.yaw; }
  else { rg.on = "sled"; return; }
  TOW.kind = kind; TOW.y = api.world.surf(TOW.x, TOW.z); TOW.spd = 0; TOW.yr = 0; TOW.tipT = 0; TOW.ghostT = 1;
  api.restat();
}

/* ---------------- the sled trailer (slice 2.6a) ----------------
   A single-axle deck trailer that will carry a sled behind a truck (2.6b drives the sled up its ramp, 2.6c tows it strapped
   down). It is not a GS.own.parts.hitch rig: the sled can't tow its own carrier. So it is a second thing a truck's ball can
   hold, and a truck holds the rig OR the trailer, never both. Saved as state.haul = { on: truck uid | null, x, z, yaw, ramp }
   (null = not owned, every older save). x, z is the middle of the axle on the ground; the coupler sits HAUL.L ahead of it.
   Behind a truck it follows by single-axle kinematics: each frame the axle is pulled along the line to the ball so it stays
   HAUL.L from it (it cuts corners like a real trailer, and reversing pushes it round), with a jackknife stop at HAUL.jack.
   On foot: use at the coupler hitches / unhitches it (haulFoot, ahead of rigFoot in VEH.rigFoot), use at its tail lowers or
   raises the ramp. The truck carries its mass (inertia) and its rolling drag (its tyres' sink in the snow). */
const HAUL = { name: "Fjordhenger sled trailer", cost: 950, mass: 420, L: 3.6, deckY: 0.55, deckZ0: -1.65, deckZ1: 2.25, deckW: 1.56,
  wheelX: 0.98, tyreR: 0.3, wid: 2.16, cH: 0.42, rampL: 1.5, jack: 70 * Math.PI / 180, tailReach: 1.9 };
const wrapA = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
function haulS() { const h = S().haul; return h && typeof h === "object" ? h : null; }
/* Towing a sled on it (2.6c): a strapped sled is weight on the truck's ball (the sled, 6 kg a parcel in its rack), checked
   against the receiver's rating when you hitch or strap, carried as inertia and through the trailer's tyres as rolling drag.
   A ramp left down while towing drags its lip through the snow (RAMP_DRAG N) and a toast says so once per tow. */
const RAMP_DRAG = 2200;
function carriedKg(h) {
  if (!h || !h.strap) return 0;
  const s = S(), ld = s.cur == null ? api.GS.load : (LIVE.get("sled") || (s.sled && s.sled.load));
  return (api.sledKg || 280) + 6 * Math.min(8, smallN(ld));
}
function haulKg(uid) { const h = haulS(); return h && h.on != null && h.on === uid ? HAUL.mass + carriedKg(h) : 0; }
let HSINK = 0;                                                                  // the trailer tyres' mean sink, for its drag
function haulDrag(uid) { const k = haulKg(uid); return k ? k * GR * (0.02 + 0.95 * HSINK) * haulWear() + (haulS().ramp > 0.5 ? RAMP_DRAG : 0) : 0; }
// a worn trailer (a used one off Bytteboden, 2.7) rolls heavier: dry bearings, a bent axle. 100% = as built, 50% = +30% drag.
function haulWear() { const h = haulS(); return 1 + 0.6 * (1 - (h && Number.isFinite(h.cond) ? clamp(h.cond, 0, 100) : 100) / 100); }
function haulCoupler(h) { return [h.x + Math.sin(h.yaw) * HAUL.L, h.z + Math.cos(h.yaw) * HAUL.L]; }
function haulTail(h) { const k = HAUL.deckZ0 - 0.4; return [h.x + Math.sin(h.yaw) * k, h.z + Math.cos(h.yaw) * k]; }
function haulFollow() {
  const h = haulS(); if (!h) return;
  if (h.on != null && !rec(h.on)) h.on = null;                                  // the truck is gone: it stays where it stood
  if (h.on == null) return;
  const b = ballOf(h.on), hp = hostPose(h.on); if (!b || !hp) return;
  let a = Math.atan2(h.x - b[0], h.z - b[1]);                                   // ball -> axle
  const back = hp.yaw + Math.PI, rel = wrapA(a - back);
  if (Math.abs(rel) > HAUL.jack) a = back + Math.sign(rel) * HAUL.jack;          // jackknife stop: the tongue binds on the bumper
  h.x = b[0] + Math.sin(a) * HAUL.L; h.z = b[1] + Math.cos(a) * HAUL.L; h.yaw = Math.atan2(b[0] - h.x, b[1] - h.z);
}
function haulCands() {                                                          // trucks whose ball is within reach of the coupler
  const h = haulS(); if (!h) return [];
  const c = haulCoupler(h), s = S(), out = [];
  for (const r of s.owned) {
    if (rigOn() === r.uid) continue;                                            // that ball already holds the rig
    const b = ballOf(r.uid); if (!b) continue;
    const dd = Math.hypot(b[0] - c[0], b[1] - c[1]); if (dd <= HITCH_REACH) out.push({ key: r.uid, d: dd, b });
  }
  return out.sort((a, b) => a.d - b.d);
}
function haulFoot() {
  const h = haulS(), F = api.FOOT;
  if (!h || !F.on || api.tutHidden() || api.MNT.on || api.DMT.on) return null;
  const c = haulCoupler(h);
  if (Math.hypot(F.x - c[0], F.z - c[1]) <= TONGUE_REACH) {
    if (h.on != null) return { label: "UNHITCH", what: `unhitch the sled trailer from the ${hostName(h.on)}`, act: haulUnhitch };
    const k = haulCands()[0];
    if (!k) return { label: null, what: "The sled trailer stands on its jack · back a truck up to the coupler to hitch it" };
    return { label: "HITCH", what: `hitch the sled trailer to the ${hostName(k.key)}`, act: () => haulHitch(k) };
  }
  const sf = strapFoot(); if (sf) return sf;                                     // beside a sled up on the deck (2.6b)
  const t = haulTail(h);
  if (Math.hypot(F.x - t[0], F.z - t[1]) <= HAUL.tailReach) {
    const down = h.ramp > 0.5, sp = sledPose(), onR = sp && sledOnDeck(sp.x, sp.z, sp.y);
    if (down && onR && onR.ramp) return { label: null, what: "The sled is on the ramp · drive it up or back it off before raising it" };
    return { label: down ? "RAISE RAMP" : "LOWER RAMP", what: down ? "raise the trailer's ramp" : "lower the trailer's ramp", act: () => haulRamp(!down) };
  }
  return null;
}
function anyFoot() { return haulFoot() || rigFoot(); }                          // VEH.rigFoot: the trailer first, then the rig

/* ---------------- the sled on the trailer (slice 2.6b) ----------------
   With the ramp down the ramp gate and the deck are a ride surface for the sled: VEH.deck(x, z, yRef) gives their height (the
   deck plane comes from the trailer model's pose each frame, HR.pl; the ramp falls from the hinge at its own angle), and
   tracklayer.js takes the higher of it and the snow wherever the sled reads the ground (physCore, its pitch, a parked sled). A
   step more than DECK_STEP above yRef is not climbable: VEH.deckClamp(P), run after the sled's obstacle collision, pushes a
   sled that is low out of the trailer's box (sides, front, and the tail when the ramp is up) and holds a sled that is up on the
   deck behind the front stop rail. On foot beside a sled that sits on the deck, use STRAPs it down (state.haul.strap = its pose
   in the trailer's frame { x, z, yaw }) or UNSTRAPs it. Strapped: physCore gives it no throttle and no motion, and each frame
   its pose is glued to the deck, so it goes where the trailer goes (2.6c adds its weight on the truck). */
const DECK_STEP = 0.35, SLED_NOSE = 1.5, STRAP_REACH = 1.5;
function haulLocal(h, x, z) { const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw), dx = x - h.x, dz = z - h.z; return { x: dx * fz - dz * fx, z: dx * fx + dz * fz }; }
function haulWorld(h, lx, lz) { const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw); return [h.x + fz * lx + fx * lz, h.z - fx * lx + fz * lz]; }
function deckY(lx, lz) { const p = HR.pl; return p.y + p.dz * lz + p.dx * lx; }
function rampDown() { return HR && HR.ramp > 0.97; }
function deckAt(x, z, yRef) {
  const h = haulS(); if (!h) return null;
  if (!HR || !HR.pl) haulVisual(0);                                             // asked before the first frame drew it (a reload)
  if (!HR || !HR.pl || !HR.grp.visible) return null;
  if (h.strap) yRef = Infinity;                                                 // a strapped sled is on the deck, whatever height it was left at
  const L = haulLocal(h, x, z), hw = HAUL.deckW / 2;
  if (Math.abs(L.x) > hw) return null;
  let y;
  if (L.z >= HAUL.deckZ0 && L.z <= HAUL.deckZ1) y = deckY(L.x, L.z);
  else if (rampDown() && L.z < HAUL.deckZ0 && L.z >= HAUL.deckZ0 - HR.pl.run) y = deckY(L.x, HAUL.deckZ0) - (HAUL.deckZ0 - L.z) * HR.pl.tan;
  else return null;
  return y <= yRef + DECK_STEP ? y : null;
}
function sledOnDeck(x, z, y) {                                                  // is a sled at x, z, y up on the deck (or the ramp)?
  const h = haulS(); if (!h) return null;
  if (!HR || !HR.pl) haulVisual(0);
  if (!HR || !HR.pl) return null;
  const L = haulLocal(h, x, z), hw = HAUL.deckW / 2;
  if (Math.abs(L.x) > hw || L.z > HAUL.deckZ1 || L.z < HAUL.deckZ0 - (rampDown() ? HR.pl.run : 0)) return null;
  const top = L.z >= HAUL.deckZ0 ? deckY(L.x, L.z) : deckY(L.x, HAUL.deckZ0) - (HAUL.deckZ0 - L.z) * HR.pl.tan;
  return y >= top - 0.15 ? Object.assign(L, { top, ramp: L.z < HAUL.deckZ0 }) : null;
}
function deckClamp(P) {
  const h = haulS(); if (!h || !HR || !HR.pl || !HR.grp.visible) return false;
  if (h.strap) return false;                                                    // glued to the deck by strapTick
  const L = haulLocal(h, P.x, P.z), hw = HAUL.deckW / 2, fx = Math.sin(h.yaw), fz = Math.cos(h.yaw);
  const vL = P.vx * fz - P.vz * fx, vZ = P.vx * fx + P.vz * fz;               // velocity in the trailer's frame
  let nx = L.x, nz = L.z, nvL = vL, nvZ = vZ, hit = 0;
  if (sledOnDeck(P.x, P.z, P.y)) {                                              // up on it: the front stop rail
    const lim = HAUL.deckZ1 - 0.06 - SLED_NOSE;
    if (L.z > lim) { nz = lim; if (vZ > 0) { hit = vZ; nvZ = 0; } }
  } else {
    const deck = deckY(clamp(L.x, -hw, hw), clamp(L.z, HAUL.deckZ0, HAUL.deckZ1));
    if (P.y > deck - DECK_STEP) return false;                                  // it's over the top (coming off the side): let it fall
    const ex = HAUL.wid / 2 + 0.55, z0 = HAUL.deckZ0 - (rampDown() ? 0 : 0.1) - SLED_NOSE, z1 = HAUL.deckZ1 + 0.5;
    if (Math.abs(L.x) >= ex || L.z <= z0 || L.z >= z1) return false;
    if (rampDown() && L.z < HAUL.deckZ0 && Math.abs(L.x) < hw - 0.05) return false;   // lined up behind it: it climbs the ramp
    const ox = ex - Math.abs(L.x), oBack = L.z - z0, oFront = z1 - L.z;
    if (ox < Math.min(oBack, oFront)) { nx = Math.sign(L.x || 1) * ex; if (vL * Math.sign(nx) < 0) { hit = Math.abs(vL); nvL = 0; } }
    else if (oBack < oFront) { nz = z0; if (vZ > 0) { hit = vZ; nvZ = 0; } }
    else { nz = z1; if (vZ < 0) { hit = -vZ; nvZ = 0; } }
  }
  if (nx === L.x && nz === L.z) return false;
  const w = haulWorld(h, nx, nz); P.x = w[0]; P.z = w[1];
  P.vx = fz * nvL + fx * nvZ; P.vz = -fx * nvL + fz * nvZ;
  if (hit > 2) { api.thud && api.thud(Math.min(1, hit / 10)); api.P.shake = Math.max(api.P.shake || 0, Math.min(0.8, hit / 12)); }
  if (hit > 4) { api.cargoHit(hit * 0.9); if (hit > 6) api.toast("Bang: into the trailer's rail. Ease it on.", "warn"); }
  return true;
}
function sledPose() {                                                           // the sled's pose wherever it is: P, or its parked record
  const s = S(), P = api.P;
  if (s.cur == null) return { x: P.x, z: P.z, yaw: P.yaw, y: P.y, live: true };
  const sl = s.sled || api.veh.sled; if (!sl) return null;
  return { x: sl.x, z: sl.z, yaw: sl.yaw, y: Number.isFinite(sl.y) ? sl.y : -1e9, live: false, rec: sl };
}
function strapFoot() {                                                          // on foot beside a sled on the deck: strap / unstrap
  const h = haulS(), F = api.FOOT; if (!h || !HR || !HR.pl) return null;
  const sp = sledPose(); if (!sp) return null;
  const on = sledOnDeck(sp.x, sp.z, sp.y); if (!on && !h.strap) return null;
  const W = haulLocal(h, F.x, F.z), hw = HAUL.deckW / 2;
  if (Math.abs(W.x) < hw || Math.abs(W.x) > hw + STRAP_REACH || W.z < HAUL.deckZ0 - 0.2 || W.z > HAUL.deckZ1 + 0.4) return null;
  if (h.strap) return { label: "UNSTRAP", what: "unstrap the sled from the trailer", act: unstrap };
  const rk = sledRig(); if (rk) return { label: null, what: `Unhitch the ${rk} from the sled first: it can't ride on the trailer` };
  const dy = Math.abs(wrapA(sp.yaw - h.yaw)), lim = HAUL.deckZ1 - 0.06 - SLED_NOSE;
  if (on.ramp || on.z < HAUL.deckZ0 + 1.05 || dy > 0.35 || Math.abs(on.x) > 0.3 || on.z > lim + 0.05)
    return { label: null, what: "Drive the sled straight up onto the deck, nose to the front rail, to strap it down" };
  return { label: "STRAP", what: "strap the sled down to the trailer", act: strap };
}
function strap() {
  const h = haulS(), sp = sledPose(); if (!h || !sp || h.strap) return;
  if (sledRig()) return;
  const hp = h.on != null ? hostPose(h.on) : null;
  if (hp && HAUL.mass + carriedKg({ strap: 1 }) > hp.kg) { api.toast(`Trailer and sled together are more than the ${hostName(h.on)}'s receiver is rated for (${hp.kg} kg).`, "warn"); return; }
  const L = haulLocal(h, sp.x, sp.z);
  h.strap = { x: L.x, z: L.z, yaw: wrapA(sp.yaw - h.yaw) };
  if (sp.live) { const P = api.P; P.vx = P.vz = 0; P.yr = 0; }
  api.whump && api.whump(0.2);
  api.toast("Four ratchet straps over the skis and the rear bumper, cinched down. The sled is strapped to the trailer.", "good");
  api.save();
}
function unstrap() {
  const h = haulS(); if (!h || !h.strap) return;
  h.strap = null; api.whump && api.whump(0.15);
  api.toast(h.ramp > 0.5 ? "Straps off. Back the sled down the ramp." : "Straps off. Lower the ramp to back the sled down it.");
  api.save();
}
let strapWarnT = -99;
// the four yellow ratchet straps, drawn in the trailer's frame from its tie-down rings to the sled's spindles and rear bumper
function strapVisual(h) {
  if (!HR) return;
  const key = h && h.strap ? h.strap.x.toFixed(3) + "," + h.strap.z.toFixed(3) : "";
  if (HR.strapKey === key) return;
  HR.strapKey = key;
  if (HR.straps) { HR.grp.remove(HR.straps); HR.straps.geometry.dispose(); HR.straps = null; }
  if (!key) return;
  const st = h.strap, y = HAUL.deckY, hw = HAUL.deckW / 2 - 0.03, it = [];
  const strapBar = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
    it.push({ g: box(0.045, 0.006, L), c: 0xe0b020, m: _m4().compose(new T.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), new T.Quaternion().setFromEuler(new T.Euler(-Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), 0, "YXZ")), new T.Vector3(1, 1, 1)) }); };
  for (const sg of [1, -1]) {
    strapBar([sg * hw, y + 0.06, HAUL.deckZ1 - 0.2], [st.x + sg * 0.42, y + 0.22, st.z + 1.05]);      // front ring to the ski spindle
    strapBar([sg * hw, y + 0.06, HAUL.deckZ0 + 0.15], [st.x + sg * 0.34, y + 0.42, st.z - 1.2]);      // rear ring to the rear bumper
  }
  HR.straps = mesh(bake(it), mats().solid, true); HR.grp.add(HR.straps);
}
function strapTick() {                                                          // a strapped sled goes where the deck goes
  const h = haulS(); strapVisual(h); if (!h || !h.strap) return;
  const sp = sledPose(); if (!sp) return;
  const st = h.strap, w = haulWorld(h, st.x, st.z), yaw = h.yaw + st.yaw;
  if (sp.live) {
    const P = api.P; P.x = w[0]; P.z = w[1]; P.yaw = yaw; P.vx = P.vz = 0; P.yr = 0;
    if (!api.FOOT.on && api.input.thr > 0 && api.now() - strapWarnT > 4) {
      strapWarnT = api.now();
      api.toast("The sled is strapped to the trailer. Get off and unstrap it first.", "warn");
    }
  } else { sp.rec.x = w[0]; sp.rec.z = w[1]; sp.rec.yaw = yaw; }
}
// the sled's own rig, if one is hooked to it: a sled can't ride the trailer towing a drag (its noun, or null)
function sledRig() { const kind = api.GS.own.parts.hitch; return api.HITCH[kind] && rigOn() === "sled" ? (RIG_NOUN[kind] || "rig") : null; }
// towing with the ramp gate down: it drags (haulDrag), and a toast says so once until it's raised or the trailer unhitched
let rampWarned = false;
function rampDragTick() {
  const h = haulS(), s = S();
  if (!h || h.on == null || h.ramp < 0.5) { rampWarned = false; return; }
  if (rampWarned || s.cur !== h.on || api.FOOT.on || Math.hypot(api.P.vx, api.P.vz) < 1.5) return;
  rampWarned = true;
  api.toast(`The trailer's ramp is down and dragging in the snow. Stop, get out and raise it: ${api.INP.dev === "touch" ? "tap RAISE RAMP" : api.btn("use")} at the tail.`, "warn");
}
function haulRamp(down) {
  const h = haulS(); if (!h) return;
  h.ramp = down ? 1 : 0; api.whump && api.whump(0.15);
  api.toast(down ? "You pull the pins and swing the ramp gate down onto the snow." : "You swing the ramp gate up and pin it.");
  api.save();
}
function haulUnhitch() {
  const h = haulS(); if (!h || h.on == null) return;
  const who = hostName(h.on); h.on = null; api.whump && api.whump(0.2);
  api.toast(`You lift the trailer's coupler off the ${who}'s ball and wind the jack down. The sled trailer stands free.`);
  api.save();
}
function haulHitch(k) {
  const h = haulS(); if (!h || h.on != null) return;
  const kg = HAUL.mass + carriedKg(h), hp = hostPose(k.key);                    // the trailer and a sled strapped on it (2.6c)
  if (hp && kg > hp.kg) { api.toast(`The ${hostName(k.key)}'s receiver is rated for ${hp.kg} kg; the trailer${h.strap ? " with the sled on it" : ""} is ${Math.round(kg)} kg.`, "warn"); return; }
  const dx = k.b[0] - h.x, dz = k.b[1] - h.z, dd = Math.hypot(dx, dz) || 1;   // the trailer pivots on its wheels until the coupler is on the ball
  h.x = k.b[0] - dx / dd * HAUL.L; h.z = k.b[1] - dz / dd * HAUL.L; h.yaw = Math.atan2(dx, dz);
  h.on = k.key; api.whump && api.whump(0.3);
  api.toast(`Coupler down on the ${hostName(k.key)}'s ball, pin in, chains crossed. The sled trailer is hitched.`, "good");
  api.save();
}
function buyHaul() {
  const s = S(), GS = api.GS;
  if (haulS()) { api.toast("You already own the sled trailer. It's on the Map.", "warn"); return; }
  { const hh = heldVeh("haul"); if (hh) { api.toast(`You've already paid for a sled trailer: it's waiting in ${heldWhere(hh)}.`, "warn"); return; } }   // report 0110
  if (api.tutHidden()) { api.toast("Collect your first sled first.", "warn"); return; }
  if (GS.cash < HAUL.cost) { api.toast(`The sled trailer is ${api.fmtCash(HAUL.cost)}. You have ${api.fmtCash(GS.cash)}.`, "warn"); return; }
  const spot = forecourtSpot({ len: HAUL.L - HAUL.deckZ0 + 0.6 }); if (!spot) { api.toast("No room on the forecourt: move something first.", "warn"); return; }
  GS.cash -= HAUL.cost;
  const mid = (HAUL.L + HAUL.deckZ0) / 2;                                       // the spot is its middle; x, z is its axle
  s.haul = { on: null, x: spot.x - Math.sin(spot.yaw) * mid, z: spot.z - Math.cos(spot.yaw) * mid, yaw: spot.yaw, ramp: 0, cond: 100 };
  api.toast("Bought the sled trailer. It stands on its jack on the forecourt: back a truck up to the coupler to hitch it.", "good");
  api.save(); api.garageRefresh();
}

/* ---------------- wear and repair (slice 2.7) ----------------
   A truck's cond (0-100) already trims its power (condK in core) and drops when it hits trees; the trailer's cond makes it roll
   heavier (haulWear). Used ones off Bytteboden arrive at the seller's real condition. The shop puts either back to 100% for
   so much a point, with the machine within REPAIR_R m of the garage. */
const REPAIR_R = 40, REPAIR_PT = { truck: 20, haul: 4 };                            // $ per condition point
function nearGarage(p) { const g = api.world.garage(); return !!p && Math.hypot(p.x - g.x, p.z - g.z) <= REPAIR_R; }
function repairCost(kind, o) { return Math.max(5, Math.round((100 - clamp(o.cond, 0, 100)) * REPAIR_PT[kind] / 5) * 5); }
function repair(kind, o) {
  const GS = api.GS, c = repairCost(kind, o), name = kind === "truck" ? byId(o.id).name : HAUL.name.toLowerCase();
  if (!nearGarage(kind === "truck" && S().cur === o.uid ? api.P : o)) { api.toast(`Bring the ${name} to the garage first.`, "warn"); return; }
  if (GS.cash < c) { api.toast(`That repair is ${api.fmtCash(c)}. You have ${api.fmtCash(GS.cash)}.`, "warn"); return; }
  GS.cash -= c; o.cond = 100;
  api.toast(`The shop puts the ${name} right: 100% again, ${api.fmtCash(c)}.`, "good");
  api.save(); api.garageRefresh();
}

/* ---------------- Bytteboden's "Vehicles" category (slice 2.7) ----------------
   tracklayer.js owns the marketplace (listings, haggling, inspecting, lemons, paying); this answers for the two machines it
   can't know: a used Fjellvogn pickup and a used Fjordhenger sled trailer, through VEH.mkt. Wear, the seller's haggling and
   the 1-in-6 lemon come from the marketplace as for every category. A listing's condition is l.adv (the ad) and l.real (the
   truth, lower on a lemon); collected, the machine is set down in the seller's yard at the real condition (a pickup with the
   quarter tank they left in it) and you walk over and take it. The pool respects MAX_OWNED trucks (counting ones paid for and
   not yet collected) and one sled trailer per player. Pickups list from 6 deliveries on, so a new player's board stays
   sleds and gear. */
const MKT_V = {
  pickup: {
    why: ["Bought a new one when the dealer gave me a good trade. This has never let me down on the lane.", "Moving south. Down there it's a car country, they tell me.",
      "It's been the fish plant's yard truck. Winter tyres on, chains in the bed.", "Dad's. He can't get up into the cab any more.", "Got a side-by-side for the cabin, the wife says one truck is plenty."],
    tell: ["The transfer case grinds going into four-wheel drive.", "There's rust right through the cab floor under the mat.", "The head gasket weeps: it's losing coolant.", "It's been rolled and pulled straight. The doors don't line up."]
  },
  haul: {
    why: ["Sold the sled, so there's nothing to put on it.", "Built it for the cabin trips. We sold the cabin.", "Too long for my yard. The neighbour keeps complaining.", "Hauled the race sled on it two winters. Ramp's solid."],
    tell: ["The axle's bent: it crabs down the road.", "The deck boards are soft at the back, over the ramp hinge.", "The wheel bearings are dry and growl."]
  }
};
const usedTrucks = held => S().owned.length + held.filter(h => h.cat === "veh" && h.item === "pickup").length;
/* Report 0110: an order paid for and not yet collected counts as owned, so the garage won't sell a second trailer or a 4th
   truck over it (buy / buyHaul refuse, the rows say why). A save already stuck that way (held order that can never be
   collected) gets the seller's refund: heldRefund, every couple of seconds from tick. */
function heldList() { const m = api.GS.mkt; return (m && Array.isArray(m.held)) ? m.held : []; }
function heldVeh(item) { return heldList().find(h => h.cat === "veh" && h.item === item) || null; }
function heldWhere(h) { const st = api.world.SITES.find(q => q.id === h.site); return `${h.seller || "the seller"}'s yard${st ? " in " + st.name : ""}`; }
let refundT = 0;
function heldRefund(dt) {
  if ((refundT -= dt) > 0) return; refundT = 2;
  const m = api.GS.mkt; if (!m || !Array.isArray(m.held)) return;
  for (const h of m.held.slice()) {
    if (h.cat !== "veh") continue;
    const why = MKTV.blocked(h); if (!why) continue;
    m.held = m.held.filter(q => q !== h); api.GS.cash += h.paid || 0;
    api.toast(`${h.seller || "The seller"} refunds the ${api.fmtCash(h.paid || 0)} you paid for the ${h.item === "haul" ? "sled trailer" : "pickup"}: ${why.replace(/\.$/, "")}.`, "good");
    api.save();
  }
}
const MKTV = {
  pool(held) {
    const out = [];
    if (api.tutHidden()) return out;
    if (api.GS.delivered >= 6 && usedTrucks(held) < MAX_OWNED) out.push({ item: "pickup", w: S().owned.length ? 0.4 : 1 });
    if (!haulS() && !held.some(h => h.cat === "veh" && h.item === "haul")) out.push({ item: "haul", w: 0.9 });
    return out;
  },
  info(item, c) {
    const pct = Math.round(c * 100);
    if (item === "haul") return { name: HAUL.name, newP: HAUL.cost, stat: `Single axle · 3.9 m deck · ramp gate · ${c < 0.8 ? "rolls a bit heavy" : "rolls like new"}`, kind: "haul" };
    const d = byId("pickup");
    return { name: d.name + " pickup", newP: d.cost, stat: `${d.year} · ${Math.round((0.65 + 0.35 * c) * 100)}% power · ${d.fuel} L · heated cab · ${pct < 80 ? "dented" : "tidy"}`, kind: "pickup" };
  },
  why: item => MKT_V[item === "haul" ? "haul" : "pickup"].why,
  tell: item => MKT_V[item === "haul" ? "haul" : "pickup"].tell,
  howTo: (h, place) => h.item === "haul" ? `It stands in ${h.seller}'s yard in ${place}. Collect it there, then back a truck up to the coupler and hitch it.`
    : `It's parked in ${h.seller}'s yard in ${place}. Collect it there, walk over and drive it away; your sled waits where you left it.`,
  blocked(h) {
    if (h.item === "haul") return haulS() ? "You already own a sled trailer." : "";
    return S().owned.length >= MAX_OWNED ? `That's enough trucks (${MAX_OWNED}).` : "";
  },
  collect(h, site) {                                                             // "" = no room right now (the marketplace nags and retries)
    const s = S(), cx = site.x, cz = site.z, away = (x, z) => Math.atan2(x - cx, z - cz);
    if (h.item === "haul") {
      const spot = spotNear(cx, cz, { len: HAUL.L - HAUL.deckZ0 + 0.6 }, false, away); if (!spot) return "";
      const mid = (HAUL.L + HAUL.deckZ0) / 2;
      s.haul = { on: null, x: spot.x - Math.sin(spot.yaw) * mid, z: spot.z - Math.cos(spot.yaw) * mid, yaw: spot.yaw, ramp: 0, cond: Math.round(h.cond * 100) };
      return `${h.seller} wheels the sled trailer out of the yard. It's yours: ${Math.round(h.cond * 100)}% condition. Back a truck up to the coupler to hitch it.`;
    }
    const d = byId(h.item); if (!d) return "";
    const spot = spotNear(cx, cz, d, false, away); if (!spot) return "";
    const r = { uid: "v" + (++s.seq), id: d.id, x: spot.x, z: spot.z, yaw: spot.yaw, fuel: Math.round(d.fuel * 0.25), cond: Math.round(h.cond * 100), load: [] };
    s.owned.push(r);
    return `${h.seller} hands you the keys. The ${d.name} is parked in the yard: ${r.cond}% condition, a quarter tank. Walk over and get in.`;
  },
  pic(g, l, cx, cy, R) {                                                         // the listing's photo: side view, nose to the left
    const gy = cy + 8, wheel = (x, rr) => { g.fillStyle = "#14171a"; g.beginPath(); g.arc(x, gy, rr, 0, 6.283); g.fill(); g.fillStyle = "#8d99a6"; g.beginPath(); g.arc(x, gy, rr * 0.45, 0, 6.283); g.fill(); };
    if (l.item === "haul") {
      R(cx - 70, gy - 22, 140, 8, "#7a5a3a");                                     // deck
      R(cx - 70, gy - 14, 140, 4, "#2b2f34");                                     // frame
      g.strokeStyle = "#2b2f34"; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 70, gy - 12); g.lineTo(cx - 108, gy - 6); g.stroke();   // A-frame tongue
      R(cx - 106, gy - 8, 4, 16, "#3a4048");                                      // jack
      g.save(); g.translate(cx + 70, gy - 18); g.rotate(-1.35); R(0, -3, 34, 6, "#5c4630"); g.restore();   // ramp gate up
      g.fillStyle = "#30343a"; g.beginPath(); g.arc(cx + 6, gy - 10, 20, Math.PI, 0); g.fill();            // fender
      wheel(cx + 6, 14); R(cx + 64, gy - 22, 6, 4, "#c0221c");
      return;
    }
    const col = "#" + byId("pickup").paint.toString(16).padStart(6, "0");
    g.fillStyle = col; g.beginPath();
    g.moveTo(cx - 104, gy - 10); g.lineTo(cx - 104, gy - 34); g.lineTo(cx - 70, gy - 40); g.lineTo(cx - 46, gy - 70); g.lineTo(cx + 4, gy - 72);
    g.lineTo(cx + 12, gy - 40); g.lineTo(cx + 100, gy - 40); g.lineTo(cx + 100, gy - 10); g.closePath(); g.fill();          // body + cab
    g.fillStyle = "rgba(190,225,255,.6)"; g.beginPath(); g.moveTo(cx - 64, gy - 42); g.lineTo(cx - 44, gy - 66); g.lineTo(cx - 20, gy - 66); g.lineTo(cx - 20, gy - 42); g.closePath(); g.fill();
    R(cx - 16, gy - 66, 16, 24, "rgba(190,225,255,.6)");                                                                   // windows
    R(cx + 12, gy - 40, 88, 4, "#1d2024");                                                                                // bed rail
    R(cx - 106, gy - 22, 8, 10, "#1d2024"); R(cx - 102, gy - 32, 6, 6, "#f6f2d8"); R(cx + 96, gy - 34, 4, 8, "#c0221c");  // bumper, headlight, tail
    g.fillStyle = "#14171a"; for (const x of [cx - 70, cx + 64]) { g.beginPath(); g.arc(x, gy - 10, 22, Math.PI, 0); g.fill(); }   // wheel arches
    wheel(cx - 70, 18); wheel(cx + 64, 18);
  }
};
// the model: one merged body, two wheels, the ramp gate on its hinge, the jack's leg, tail lights that light with the truck's
let HR = null;
function haulRuntime() {
  if (HR) return HR;
  const M = mats(), it = [], gate = [], leg = [], lit = [];
  const B = (arr, w, h, d, x, y, z, c, rx = 0, ry = 0, rz = 0) => arr.push({ g: box(w, h, d), c, m: tf(x, y, z, rx, ry, rz) });
  const bar = (a, b, t, c) => { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
    it.push({ g: box(t, t, L), c, m: _m4().compose(new T.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), new T.Quaternion().setFromEuler(new T.Euler(-Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), 0, "YXZ")), new T.Vector3(1, 1, 1)) }); };
  const GALV = 0x8e959c, WOOD = 0x6e5b44, SEAM = 0x45392b, DARK = 0x24272b, YEL = 0xd8a21c;
  const z0 = HAUL.deckZ0, z1 = HAUL.deckZ1, zc = (z0 + z1) / 2, dl = z1 - z0, y = HAUL.deckY, hw = HAUL.deckW / 2, W = HAUL.wheelX;
  B(it, HAUL.deckW - 0.04, 0.04, dl - 0.02, 0, y - 0.02, zc, WOOD);                                    // deck boards
  for (let i = 1; i < 6; i++) B(it, 0.012, 0.004, dl - 0.04, -hw + i * HAUL.deckW / 6, y + 0.001, zc, SEAM);   // seams between them
  for (const sg of [1, -1]) {
    B(it, 0.07, 0.13, dl, sg * (hw + 0.01), y - 0.06, zc, GALV); B(it, 0.04, 0.05, dl, sg * (hw - 0.03), y + 0.025, zc, GALV);   // side rails, lip
    B(it, 0.06, 0.06, 0.95, sg * (hw - 0.12), y - 0.16, 0, DARK);                                      // leaf spring
    B(it, 0.32, 0.03, 0.84, sg * W, 0.72, 0, GALV); B(it, 0.32, 0.14, 0.03, sg * W, 0.65, 0.44, GALV, -0.45); B(it, 0.32, 0.14, 0.03, sg * W, 0.65, -0.44, GALV, 0.45);   // fender
    for (const zz of [z0 + 0.15, z1 - 0.2]) it.push({ g: new T.TorusGeometry(0.035, 0.009, 5, 10), c: YEL, m: tf(sg * (hw - 0.03), y + 0.06, zz, 0, Math.PI / 2, 0) });   // tie-down rings
    B(it, 0.16, 0.06, 0.03, sg * 0.66, y - 0.06, z0 - 0.03, DARK);                                     // light housings
    B(lit, 0.13, 0.045, 0.02, sg * 0.66, y - 0.06, z0 - 0.05, 0xff2a1a);
  }
  for (let i = 0; i < 6; i++) B(it, HAUL.deckW, 0.07, 0.06, 0, y - 0.09, z0 + 0.1 + i * (dl - 0.2) / 5, GALV);   // cross members
  B(it, HAUL.deckW, 0.06, 0.06, 0, y + 0.3, z1 - 0.03, GALV); for (const xx of [hw - 0.03, -hw + 0.03, 0]) B(it, 0.05, 0.32, 0.05, xx, y + 0.15, z1 - 0.03, GALV);   // front stop rail
  B(it, 2 * W - 0.12, 0.07, 0.07, 0, HAUL.tyreR, 0, DARK);                                             // axle
  // tongue: an A-frame to the coupler, a jack tube on its right
  for (const sg of [1, -1]) bar([sg * 0.72, y - 0.08, z1 - 0.5], [sg * 0.05, HAUL.cH + 0.02, HAUL.L - 0.28], 0.08, GALV);
  bar([0, y - 0.08, z1 - 0.1], [0, HAUL.cH + 0.02, HAUL.L - 0.28], 0.07, GALV);
  B(it, 0.13, 0.1, 0.36, 0, HAUL.cH + 0.03, HAUL.L - 0.12, DARK); B(it, 0.15, 0.04, 0.18, 0, HAUL.cH + 0.09, HAUL.L - 0.05, DARK);   // coupler head
  const jx = -0.22, jz = HAUL.L - 0.75, tube = new T.CylinderGeometry(0.035, 0.035, 0.46, 10);
  it.push({ g: tube, c: DARK, m: tf(jx, 0.55, jz) }); B(it, 0.2, 0.03, 0.03, jx + 0.1, 0.8, jz, DARK); B(it, 0.12, 0.05, 0.05, jx + 0.08, 0.46, jz, DARK);   // tube, crank, bracket
  leg.push({ g: new T.CylinderGeometry(0.026, 0.026, 0.42, 8), c: GALV, m: tf(jx, 0.23, jz) }); leg.push({ g: box(0.14, 0.02, 0.14), c: DARK, m: tf(jx, 0.01, jz) });
  // the ramp gate, built down its own -z from the hinge
  const rl = HAUL.rampL;
  B(gate, HAUL.deckW - 0.1, 0.03, rl, 0, 0, -rl / 2, GALV);
  for (const sg of [1, -1]) B(gate, 0.05, 0.07, rl, sg * (hw - 0.07), 0.02, -rl / 2, GALV);
  for (let k = 0.12; k < rl; k += 0.17) B(gate, HAUL.deckW - 0.16, 0.025, 0.03, 0, 0.025, -k, DARK);   // grip slats
  const grp = new T.Group(); grp.rotation.order = "YXZ";
  grp.add(mesh(bake(it), M.solid, true));
  const lm = new T.Mesh(bake(lit), M.tail.clone()); grp.add(lm);
  const hinge = new T.Group(); hinge.position.set(0, y, z0); hinge.add(mesh(bake(gate), M.solid, true)); grp.add(hinge);
  const jleg = mesh(bake(leg), M.solid, true); grp.add(jleg);
  // the wheels: tyre and steel rim, one geometry, axle along x
  const tyre = new T.CylinderGeometry(HAUL.tyreR, HAUL.tyreR, 0.19, 22); tyre.rotateZ(Math.PI / 2);
  const rim = new T.CylinderGeometry(0.17, 0.17, 0.2, 14); rim.rotateZ(Math.PI / 2);
  const lugs = []; for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; lugs.push({ g: box(0.21, 0.04, 0.04), c: 0x2a2d31, m: tf(0, Math.cos(a) * 0.1, Math.sin(a) * 0.1) }); }
  const wg = bake([{ g: tyre, c: 0x1b1d20 }, { g: rim, c: 0xb8bcc0 }].concat(lugs));
  const wheels = [W, -W].map(x => { const m = mesh(wg, M.solid, true); m.position.set(x, HAUL.tyreR, 0); grp.add(m); return m; });
  grp.visible = false; api.scene.add(grp);
  const h0 = haulS();
  return (HR = { grp, lm, hinge, jleg, wheels, ramp: h0 && h0.ramp > 0.5 ? 1 : 0, spin: 0, px: null, pz: 0 });   // the gate starts where the save left it
}
function haulVisual(dt) {
  const h = haulS(); if (!h) { if (HR) HR.grp.visible = false; return; }
  const R = haulRuntime(), w = api.world, cam = api.camera;
  if (Math.hypot(h.x - cam.position.x, h.z - cam.position.z) > 500) { R.grp.visible = false; return; }
  R.grp.visible = true;
  const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw), lx = fz, lz = -fx, W = HAUL.wheelX;
  const yl = w.rideSurf(h.x + lx * W, h.z + lz * W), yr = w.rideSurf(h.x - lx * W, h.z - lz * W), ya = (yl + yr) / 2;
  let sk = 0;                                                                   // tyre sink in the snow: its drag on the truck
  for (const sg of [1, -1]) { const x = h.x + lx * W * sg, z = h.z + lz * W * sg, db = depthBi(x, z), f = w.freshAt(Math.round((x + HALF) / CELL), Math.round((z + HALF) / CELL)), pk = f > 0.02 ? clamp(1 - db / f, 0, 1) : 1; sk += db * (0.35 + 0.65 * (1 - pk)) / 2; }
  HSINK = sk;
  const c = haulCoupler(h), T2 = h.on != null ? RT.get(h.on) : null; let yc;
  if (T2 && T2.grp.visible) { T2.grp.updateMatrixWorld(true); const v = T2.grp.localToWorld(new T.Vector3(0, 0.42, T2.def.hitchZ)); yc = v.y; }
  else yc = w.rideSurf(c[0], c[1]) + HAUL.cH;
  const pitch = Math.atan2(yc - (ya + HAUL.cH), HAUL.L), roll = Math.atan2(yl - yr, 2 * W);
  R.grp.position.set(h.x, ya - sk * 0.6, h.z); R.grp.rotation.set(-pitch, h.yaw, roll);
  {                                                                             // the deck plane in world height, for riding on it (2.6b)
    R.grp.updateMatrixWorld(true);
    const A = R.grp.localToWorld(new T.Vector3(0, HAUL.deckY, 0)).y, B = R.grp.localToWorld(new T.Vector3(0, HAUL.deckY, 1)).y, C = R.grp.localToWorld(new T.Vector3(1, HAUL.deckY, 0)).y;
    const ra = Math.asin(Math.min(0.95, (HAUL.deckY - 0.02) / HAUL.rampL));
    R.pl = { y: A, dz: B - A, dx: C - A, tan: Math.tan(ra), run: HAUL.rampL * Math.cos(ra) };
  }
  if (R.px !== null) { const mv = (h.x - R.px) * fx + (h.z - R.pz) * fz; R.spin += mv / HAUL.tyreR; }
  R.px = h.x; R.pz = h.z;
  for (const m of R.wheels) m.rotation.x = R.spin;
  R.ramp += (h.ramp - R.ramp) * (1 - Math.exp(-4 * dt));
  const e = R.ramp * R.ramp * (3 - 2 * R.ramp), down = -Math.asin(Math.min(0.95, (HAUL.deckY - 0.02) / HAUL.rampL));
  R.hinge.rotation.x = lerp(Math.PI / 2 + 0.08, down, e);
  R.jleg.position.y = h.on != null ? 0.27 : 0;
  const night = 1 - api.dayFactor(), s = S();
  R.lm.visible = h.on != null && s.cur === h.on && night > 0.35 && api.GS.fuel > 0 && !api.FOOT.on;
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
  rigTick(); heldRefund(dt);
  haulFollow(); haulVisual(dt); strapTick(); rampDragTick();                                   // the sled trailer (2.6a), owned with or without a truck; a sled strapped on it (2.6b)
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
    bedBoxes(R, isCur ? smallN(api.GS.load) : smallN(r.load));
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
  state0: () => ({ owned: [], cur: null, sled: null, seq: 0, haul: null }),
  migrate: st => st,
  init(a) {
    api = a; T = a.THREE; CELL = a.world.cell; HALF = a.world.half;
    _q1 = new T.Quaternion(); _q2 = new T.Quaternion(); _q3 = new T.Quaternion(); _Y = new T.Vector3(0, 1, 0); _X = new T.Vector3(1, 0, 0); _p = new T.Vector3(); _s = new T.Vector3(); _mm = new T.Matrix4();
    const s = S();
    s.owned = (Array.isArray(s.owned) ? s.owned : []).filter(r => r && byId(r.id)).map(r => Object.assign({ x: 0, z: 0, yaw: 0, fuel: byId(r.id).fuel, cond: 100, load: [] }, r, { load: Array.isArray(r.load) ? r.load : [] }));
    if (s.sled && !Array.isArray(s.sled.load)) s.sled.load = [];
    api.veh.block = blockWalker;
    api.veh.mkt = MKTV;                                                          // Bytteboden's Vehicles category (2.7)
    Object.assign(api.veh, { rigOn, rigLive, rigAt, rigBall, rigFoot: anyFoot });  // the universal hitch (2.5); the sled trailer's use comes first (2.6a)
    Object.assign(api.veh, { deck: deckAt, deckClamp, strapped: () => { const h = haulS(); return !!(h && h.strap); } });   // the sled on the trailer (2.6b)
    api.veh.camTow = () => { const h = haulS(); return h && h.on != null && S().cur === h.on && !api.FOOT.on ? HAUL.L - HAUL.deckZ0 + 1.4 : 0; };   // the chase cam backs off to show it
    if (s.haul && typeof s.haul === "object") {                                  // the sled trailer from the save
      const h = s.haul; h.x = NUM(h.x); h.z = NUM(h.z); h.yaw = NUM(h.yaw); h.ramp = h.ramp > 0.5 ? 1 : 0; h.cond = Number.isFinite(h.cond) ? clamp(h.cond, 0, 100) : 100;
      const st = h.strap; h.strap = st && typeof st === "object" && [st.x, st.z, st.yaw].every(Number.isFinite) ? { x: st.x, z: st.z, yaw: st.yaw } : null;
      if (h.strap) { const q = h.strap; q.x = clamp(q.x, -0.3, 0.3); q.z = clamp(q.z, HAUL.deckZ0 + 1.05, HAUL.deckZ1 - 0.06 - SLED_NOSE); q.yaw = clamp(wrapA(q.yaw), -0.35, 0.35); }   // a strap spot is always on the deck, nose forward (report 0100)
      if (h.on != null && (!rec(h.on) || rigOn() === h.on)) h.on = null;
    } else s.haul = null;
    api.veh.tabs.push({ id: "trucks", name: "Trucks", render: garageRows });
    // the tablet's Map: a pin on every vehicle you aren't in (the sled while you drive, the trucks while you ride the sled)
    a.TABLET.addLayer("vehicles", () => {
      const s = S(), out = [], noun = r => { const d = byId(r.id); return d.kind[0].toUpperCase() + d.kind.slice(1); };
      if (s.cur != null && s.sled) out.push({ x: s.sled.x, z: s.sled.z, name: "Sled", kind: "sled" });
      for (const r of s.owned) if (r.uid !== s.cur) out.push({ x: r.x, z: r.z, name: noun(r), kind: "truck" });
      const h = haulS(); if (h && (h.on == null || h.on !== s.cur || api.FOOT.on)) out.push({ x: h.x, z: h.z, name: "Sled trailer", kind: "truck" });
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
    rigRestore();
    { const h = haulS(); if (h && h.strap && sledRig()) h.strap = null; }        // a damaged save with a rig on the strapped sled: the strap goes (report 0102)
  },
  tick, save
});
window.TLXV = { VEHICLES, mkt: MKTV, buy, buyHaul, repair, repairCost, haulWear, swapTo: uid => swapTo(uid), state: S, rigOn, rigFoot, ballOf, tongueTip, HAUL, haul: () => haulS(), haulCoupler, haulTail, haulR: () => HR, deckAt, sledOnDeck, strapFoot, haulLocal, haulWorld, rt: () => { const c = curRec(); return c ? runtime(c) : null; } };   // for the playtests
})();
