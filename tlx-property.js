// Tracklayer — property upkeep (G4 milestone 6, loop/EXPANSION.md "6. Upkeep and lighthouses"). Slice 6.1a: dust and
// grit at the depot cabins you own, sweeping and dusting by hand, cleaning kits, caretakers who clean.
//
// Every depot cabin you own (Real Estate, tracklayer.js RE_CABINS) collects GRIT on the floor (guests track it in on
// nights you're away; a little while you're there) and DUST on every surface, both 0-100, stepped by the game clock.
// A dirty cabin lets less often: +3% while both are under 15, falling to -12% at 100 (TLX.prop.occ, read by reOcc in
// tracklayer.js beside the caretaker's lift). A caretaker (tlx-staff.js) cleans every day, as hard as they work
// (TLX.staff.work: their work trait x their happiness factor, nothing while they're owed wages).
//
// By hand: walk into your cabin with a cleaning kit (bought from the Real Estate app, good for a few cleans; a finished
// sweep or a finished dusting uses one).
//  - SWEEP: a broom in both hands, the walk slowed to a sweeping pace (INT.slow, read by intStep). The floor is a grid
//    of free cells, each showing grit specks; the cells under the broom head and under your feet get swept. Grit falls
//    with the share swept; most of the floor done = clean.
//  - DUST: face a piece of furniture up close and wipe it down (a couple of game seconds standing still, one arm
//    working). Each piece takes its share of the dust off; all of them = clean.
// The use control (api.footx provider: footUse / footAction / touch / pad L3) and the in-room hint read the same
// provider. Walking off, the use control again, or going out of the door stops either job.
//
// SAVED under x.sys.prop: { cab: { cabinId: { grit, dust } }, kit (cleans left), hT (game hour last stepped) }.
(() => {
"use strict";
// ---- tunables ----
const PROP = {
  gritDay: 6, gritHere: 0.4,     // grit a game day with the place let (you away), x this while you're there
  dustDay: 4,                    // dust a game day, always
  careDay: 11,                   // a caretaker's cleaning a game day at work factor 1 (comes off grit and dust both)
  skipH: 24 * 60,                // a clock jump over this many game hours counts as this many
  away: 120,                     // m: further than this from the cabin = it's let (RE.away)
  occClean: 0.03, occDirty: -0.12, cleanBelow: 15,
  cell: 0.6, sweepDone: 0.85,    // floor grid (m); share of the free cells that makes a clean floor
  dustT: 2.6, dustR: 0.55,       // game seconds of wiping per piece; reach to it (m), facing it
  slow: 0.45,                    // walk speed x while sweeping
  kit: { cost: 40, uses: 8, max: 24 },
  tidy: 3                        // under this, nothing to do
};
let api = null, stepT = 0;
const S = () => TLX.state("prop");
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const hour = () => (api && api.GS ? +api.GS.hour || 0 : 0);
const owned = () => (api && api.re ? api.re.owned() : []);
const isOwned = id => owned().some(c => c.id === id);
function rec(id) { const s = S(); if (!s.cab[id] || typeof s.cab[id] !== "object") s.cab[id] = { grit: 0, dust: 0 }; const r = s.cab[id]; r.grit = clamp(+r.grit || 0, 0, 100); r.dust = clamp(+r.dust || 0, 0, 100); return r; }
const word = (v, kind) => v < 10 ? "clean" : v < 35 ? (kind === "g" ? "a bit gritty" : "a bit dusty") : v < 65 ? (kind === "g" ? "gritty" : "dusty") : "filthy";
function occ(id) {
  const s = S(); if (!s || !s.cab[id]) return PROP.occClean;
  const r = s.cab[id], m = Math.max(r.grit, r.dust);
  return PROP.occClean + (PROP.occDirty - PROP.occClean) * clamp((m - PROP.cleanBelow) / (100 - PROP.cleanBelow), 0, 1);
}
const careOf = id => (TLX.staff && TLX.staff.work ? TLX.staff.work(id) : 0);
function here() { const F = api.FOOT, P = api.P; return F && F.on ? { x: F.x, z: F.z } : { x: P.x, z: P.z }; }

// ---- the clock: dirt piles up, caretakers clean ----
function step() {
  const s = S(), h = hour();
  if (s.hT === null || s.hT === undefined || !isFinite(s.hT) || s.hT > h) { s.hT = h; return; }
  const dh = Math.min(PROP.skipH, h - s.hT); if (dh < 0.05) return; s.hT = h;
  const me = here();
  for (const c of owned()) {
    const r = rec(c.id), mine = !!(api.INT.on && api.INT.cab && api.INT.cab.id === c.id);
    const away = !mine && (c.x === undefined || Math.hypot(me.x - c.x, me.z - c.z) > PROP.away);
    r.grit += PROP.gritDay * dh / 24 * (away ? 1 : PROP.gritHere);
    r.dust += PROP.dustDay * dh / 24;
    const w = careOf(c.id); if (w > 0) { const k = PROP.careDay * w * dh / 24; r.grit -= k; r.dust -= k; }
    r.grit = clamp(r.grit, 0, 100); r.dust = clamp(r.dust, 0, 100);
  }
}

// ---- the room: free floor cells, grit decals, the furniture to dust ----
const SW = { on: false, cab: null, cells: [], swept: null, n: 0, got: 0, grit0: 0 };
const DU = { cab: null, done: new Set(), dust0: 0, cur: -1, t: 0, pieces: [] };
let speck = null, broom = null, cloth = null;
function speckTex() {
  if (speck) return speck;
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  for (let i = 0; i < 70; i++) { const r = Math.random() * 1.6 + 0.4, x = 4 + Math.random() * 56, y = 4 + Math.random() * 56; g.fillStyle = `rgba(${40 + Math.random() * 40 | 0},${30 + Math.random() * 30 | 0},${22 + Math.random() * 20 | 0},${0.5 + Math.random() * 0.5})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(90,80,70,0.18)"; g.beginPath(); g.ellipse(10 + Math.random() * 44, 10 + Math.random() * 44, 6 + Math.random() * 8, 3 + Math.random() * 5, Math.random() * 3, 0, 7); g.fill(); }
  speck = new api.THREE.CanvasTexture(c); return speck;
}
function freeCells(R) {
  const out = [], lim = 0.3, cs = PROP.cell;
  for (let x = -R.hx + cs / 2; x < R.hx; x += cs) for (let z = -R.hz + cs / 2; z < R.hz; z += cs) {
    if (Math.abs(x) > R.hx - lim || Math.abs(z) > R.hz - lim) continue;
    if (R.cols.some(c => x > c.x0 - lim && x < c.x1 + lim && z > c.z0 - lim && z < c.z1 + lim)) continue;
    if (R.exit && Math.hypot(x - R.exit.x, z - R.exit.z) < 0.85) continue;   // the way-out ring (0.5 m) and a step round it
    out.push([x, z]);
  }
  return out;
}
function decals(R) {
  if (R._grit) return R._grit;
  const T = api.THREE, cells = freeCells(R);
  const mat = new T.MeshLambertMaterial({ map: speckTex(), transparent: true, depthWrite: false, opacity: 0 });
  const im = new T.InstancedMesh(new T.PlaneGeometry(PROP.cell * 1.05, PROP.cell * 1.05), mat, Math.max(1, cells.length));
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3(1, 1, 1);
  cells.forEach(([x, z], i) => { e.set(-Math.PI / 2, 0, Math.random() * 6.28); q.setFromEuler(e); p.set(x, 0.008 + (i % 3) * 0.001, z); m.compose(p, q, sc); im.setMatrixAt(i, m); });
  im.count = cells.length; im.renderOrder = 1; R.g.add(im);
  R._grit = { im, cells, mat, hidden: new Uint8Array(cells.length), m, q, p, e };
  return R._grit;
}
function decalShow(R, gr, swept) {
  const D = decals(R); D.mat.opacity = clamp(gr / 100 * 1.1, 0, 0.92); D.im.visible = gr > 0.5;
  let ch = false; const T = api.THREE, z0 = new T.Vector3(0, 0, 0), one = new T.Vector3(1, 1, 1);
  for (let i = 0; i < D.cells.length; i++) {
    const want = swept && swept[i] ? 1 : 0; if (D.hidden[i] === want) continue; D.hidden[i] = want; ch = true;
    D.im.getMatrixAt(i, D.m); D.m.decompose(D.p, D.q, one.set(1, 1, 1)); D.m.compose(D.p, D.q, want ? z0.set(0.0001, 0.0001, 0.0001) : one.set(1, 1, 1)); D.im.setMatrixAt(i, D.m);
  }
  if (ch) D.im.instanceMatrix.needsUpdate = true;
}
// a free spot to stand at in front of a piece (inside the walls, clear of every collider), or null
function standAt(R, c) {
  const lim = 0.34, o = 0.4, mx = (c.x0 + c.x1) / 2, mz = (c.z0 + c.z1) / 2;
  const free = (x, z) => Math.abs(x) <= R.hx - lim && Math.abs(z) <= R.hz - lim && !R.cols.some(q => x > q.x0 - lim && x < q.x1 + lim && z > q.z0 - lim && z < q.z1 + lim);
  for (const f of [0.5, 0.25, 0.75, 0.1, 0.9]) {
    const cand = [[c.x0 + (c.x1 - c.x0) * f, c.z0 - o, 0], [c.x0 + (c.x1 - c.x0) * f, c.z1 + o, Math.PI], [c.x0 - o, c.z0 + (c.z1 - c.z0) * f, Math.PI / 2], [c.x1 + o, c.z0 + (c.z1 - c.z0) * f, -Math.PI / 2]];
    for (const [x, z, yaw] of cand) if (free(x, z)) return { x, z, yaw, mx, mz };
  }
  return null;
}
// what there is to dust: furniture you can stand at, waist height or so and up
function piecesOf(R) { return R.cols.filter(c => (c.x1 - c.x0) * (c.z1 - c.z0) > 0.05 && (c.y1 === undefined || c.y1 > 0.3) && standAt(R, c)); }
const boxD = (c, x, z) => Math.hypot(Math.max(c.x0 - x, 0, x - c.x1), Math.max(c.z0 - z, 0, z - c.z1));
function facing(c) { const I = api.INT, F = api.FOOT, cx = clamp(I.px, c.x0, c.x1) - I.px, cz = clamp(I.pz, c.z0, c.z1) - I.pz, d = Math.hypot(cx, cz); return d < 0.05 || (Math.sin(F.yaw) * cx + Math.cos(F.yaw) * cz) / d > 0.45; }
function nearPiece() {
  const I = api.INT, R = I.room; if (!R) return -1; roomFor();
  let best = -1, bd = PROP.dustR;
  DU.pieces.forEach((c, i) => { if (DU.done.has(i)) return; const d = boxD(c, I.px, I.pz); if (d < bd && facing(c)) { bd = d; best = i; } });
  return best;
}
// the visit's bookkeeping: a new room (or a new visit) starts the dusting list over
function roomFor() {
  const I = api.INT; if (!I.on || !I.cab) return null;
  if (DU.cab !== I.cab.id || DU.room !== I.room) { DU.cab = I.cab.id; DU.room = I.room; DU.done = new Set(); DU.pieces = piecesOf(I.room); DU.dust0 = rec(I.cab.id).dust; DU.cur = -1; DU.t = 0; }
  return I.room;
}
function inMine() { const I = api.INT; return !!(I.on && I.cab && !I.cab.build && I.cab.id !== "sauna" && isOwned(I.cab.id)); }

// ---- sweeping ----
function startSweep() {
  const s = S(), I = api.INT, R = roomFor(); if (!R) return;
  if (s.kit <= 0) { api.toast("You need a cleaning kit: the Real Estate app sells them.", "warn"); return; }
  stopDust();
  const D = decals(R), r = rec(I.cab.id);
  SW.on = true; SW.cab = I.cab.id; SW.cells = D.cells; SW.swept = new Uint8Array(D.cells.length); SW.n = D.cells.length; SW.got = 0; SW.grit0 = r.grit;
  I.slow = PROP.slow;
  api.toast(`Sweeping: walk the floor slowly, broom first. ${api.keyHint("use", "stop")}.`);
}
function stopSweep(msg) {
  if (!SW.on) return; SW.on = false; if (api.INT) api.INT.slow = 1;
  if (broom) broom.visible = false;
  const R = api.INT.room; if (R && R._grit && SW.cab && api.INT.cab && api.INT.cab.id === SW.cab) decalShow(R, rec(SW.cab).grit, null);
  if (msg) api.toast(msg);
}
function sweepAt(x, z) {
  const cs = PROP.cell; let got = 0;
  for (let i = 0; i < SW.n; i++) { if (SW.swept[i]) continue; const c = SW.cells[i]; if (Math.abs(c[0] - x) < cs * 0.55 && Math.abs(c[1] - z) < cs * 0.55) { SW.swept[i] = 1; got++; } }
  return got;
}
function sweepTick() {
  const I = api.INT, R = I.room; if (!I.on || !R || !I.cab || I.cab.id !== SW.cab) { stopSweep(); return; }
  I.slow = PROP.slow;
  const F = api.FOOT, fx = Math.sin(F.yaw), fz = Math.cos(F.yaw);
  let got = sweepAt(I.px, I.pz);
  if (SW.head) got += sweepAt(SW.head.x - R.g.position.x, SW.head.z - R.g.position.z);
  if (!SW.head) got += sweepAt(I.px + fx * 0.7, I.pz + fz * 0.7);
  if (got) { SW.got += got; const r = rec(SW.cab), need = Math.max(1, SW.n * PROP.sweepDone); r.grit = Math.min(r.grit, SW.grit0 * (1 - Math.min(1, SW.got / need))); }
  decalShow(R, rec(SW.cab).grit, SW.swept);
  if (SW.got >= SW.n * PROP.sweepDone) {
    const s = S(); rec(SW.cab).grit = 0; s.kit = Math.max(0, s.kit - 1);
    stopSweep(`Floor swept. ${s.kit ? `${s.kit} clean${s.kit > 1 ? "s" : ""} left in the kit.` : "That was the last of the cleaning kit."}`); api.save();
  }
}
// ---- dusting ----
function startDust(i) {
  const s = S(); if (s.kit <= 0) { api.toast("You need a cleaning kit: the Real Estate app sells them.", "warn"); return; }
  if (SW.on) stopSweep();
  DU.cur = i; DU.t = 0; api.INT.slow = 0;
}
function stopDust(msg) { if (DU.cur < 0) return; DU.cur = -1; DU.t = 0; if (api.INT) api.INT.slow = 1; if (cloth) cloth.visible = false; if (msg) api.toast(msg); }
function dustTick(dt) {
  const I = api.INT; if (!I.on || !I.cab || I.cab.id !== DU.cab) { stopDust(); return; }
  const c = DU.pieces[DU.cur]; if (!c || boxD(c, I.px, I.pz) > PROP.dustR + 0.35) { stopDust("Stopped dusting."); return; }
  I.slow = 0; DU.t += dt;
  if (DU.t >= PROP.dustT) {
    DU.done.add(DU.cur); const r = rec(DU.cab), n = DU.pieces.length, left = n - DU.done.size;
    r.dust = Math.min(r.dust, DU.dust0 * left / Math.max(1, n));
    stopDust();
    if (!left || r.dust < 0.5) { const s = S(); r.dust = 0; s.kit = Math.max(0, s.kit - 1); api.toast(`Everything's dusted. ${s.kit ? `${s.kit} clean${s.kit > 1 ? "s" : ""} left in the kit.` : "That was the last of the cleaning kit."}`, "good"); api.save(); }
    else api.toast(`Wiped down. ${left} more to dust.`);
  }
}

// ---- the poses: contacts carry the tool (both hands on the broom, its head on the floor; a cloth in the hand) ----
const V = {}, BROOM_L = 1.45;                                                       // a yard broom, head to the end of the shaft (m)
function tools() {
  if (broom) return;
  const T = api.THREE, wood = api.mesh.std(0x9a7448, 0.8), bri = api.mesh.std(0xb8913a, 1), band = api.mesh.std(0x2c3e5a, 0.7);
  broom = new T.Group(); const shaft = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 1, 8), wood); shaft.position.y = 0.5; broom.add(shaft);
  broom.userData.shaft = shaft;
  const head = new T.Group(); broom.add(head); broom.userData.head = head;
  const hb = new T.Mesh(new T.BoxGeometry(0.34, 0.05, 0.07), band); head.add(hb);
  const br = new T.Mesh(new T.BoxGeometry(0.32, 0.09, 0.06), bri); br.position.y = -0.06; head.add(br);
  broom.visible = false; api.INT.scene.add(broom);
  cloth = new T.Mesh(new T.BoxGeometry(0.13, 0.03, 0.1), api.mesh.std(0xd9d2b8, 1)); cloth.visible = false; api.INT.scene.add(cloth);
  for (const k of ["a", "b", "c", "d", "e", "f"]) V[k] = new T.Vector3();
}
const UP = () => V.u || (V.u = new api.THREE.Vector3(0, 1, 0));
// a two-bone arm reaching for a point (world): shoulder aimed in the vertical plane through the target, elbow bent so
// the hand lands on it (out of reach: the arm straightens toward it). Upper arm 0.25 m, forearm to the mitt 0.24 m.
function armTo(U, i, wp) {
  const a = U.arms[i], f = U.fore[i], L1 = 0.25, L2 = 0.24;
  const t = U.torso.worldToLocal(V.e.copy(wp)).sub(a.position), D = clamp(t.length(), 0.08, L1 + L2 - 0.002);
  const hz = Math.hypot(t.x, t.z), th = -Math.atan2(hz, -t.y), ph = Math.atan2(t.x, t.z);
  const al = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1)), be = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));
  a.rotation.set(th + al, ph, 0); f.rotation.set(-be, 0, 0);
}
// the stretch of the shaft [near, far] (m from p0 along d) within reach r of the shoulder s; out of reach: the closest point twice
function reachOn(p0, d, s, r) {
  const m = V.f.copy(p0).sub(s), bq = m.dot(d), disc = bq * bq - (m.lengthSq() - r * r), q = disc > 0 ? Math.sqrt(disc) : 0;
  return [-bq - q, -bq + q];
}
function poseSweep() {
  const g = api.FOOT.g; if (!g) return; tools();
  if (broom.parent !== api.INT.scene) api.INT.scene.add(broom);
  const U = g.userData, ph = api.now() * Math.PI * 2 * 0.85, sw = Math.sin(ph), F = api.FOOT;
  const fx = Math.sin(F.yaw), fz = Math.cos(F.yaw), floor = api.INT.py || 0;
  // the trunk leans in a little and turns with the stroke
  U.torso.rotation.y = 0.16 * sw; U.torso.rotation.x = Math.max(U.torso.rotation.x, 0.2);
  g.updateMatrixWorld(true);
  // the broom head sweeps an arc on the floor ahead; the shaft leans back up to the chest
  const gp = g.position, side = 0.28 * sw;
  const end = V.a.set(gp.x + fx * 0.78 + fz * side * -1, floor + 0.11, gp.z + fz * 0.78 + fx * side);
  const chest = U.torso.localToWorld(V.b.set(-0.06, 0.42, 0.2));
  const d = V.c.copy(chest).sub(end).normalize();                                  // head -> up the shaft
  const sR = U.torso.localToWorld(V.d.set(U.arms[0].position.x, U.arms[0].position.y, U.arms[0].position.z)).clone();
  const sL = U.torso.localToWorld(V.d.set(U.arms[1].position.x, U.arms[1].position.y, U.arms[1].position.z)).clone();
  // a broom is one length (BROOM_L): the top hand holds it near the top wherever its arm reaches the shaft, the low
  // hand a forearm or more below it. (Beta 0186 #1: the shaft used to end 14 cm above the top hand's FAR reach, so
  // it stretched from 1.5 to 1.9 m and back with every stroke.)
  // Each arm reaches a stretch of the shaft (reachOn); the hands go where both stretches allow, a forearm apart.
  const rL = reachOn(end, d, sL, 0.45), rR = reachOn(end, d, sR, 0.46), topMax = Math.min(rL[1], BROOM_L - 0.04);
  let kHi = clamp(BROOM_L - 0.1, rL[0], topMax);
  const kLo = clamp(kHi - 0.36, rR[0], Math.min(rR[1], kHi - 0.1));
  if (kHi - kLo < 0.32) kHi = clamp(kLo + 0.32, rL[0], topMax);                    /* the low arm can't get that far down: the top hand slides up */
  const lo = end.clone().addScaledVector(d, kLo), hi = end.clone().addScaledVector(d, kHi);
  armTo(U, 0, lo); armTo(U, 1, hi);
  g.updateMatrixWorld(true);
  const loH = U.fore[0].localToWorld(V.e.set(0, -0.24, 0.01)).clone(), hiH = U.fore[1].localToWorld(V.e.set(0, -0.24, 0.01)).clone();
  const top = end.clone().addScaledVector(d, BROOM_L), len = BROOM_L;
  // the broom group stands at the head end, +y up the shaft
  const sh = broom.userData.shaft; sh.scale.y = len; sh.position.y = len / 2;
  broom.position.copy(end); broom.quaternion.setFromUnitVectors(UP(), d);
  const hd = broom.userData.head; hd.position.set(0, 0, 0);
  hd.quaternion.copy(broom.quaternion).invert().multiply(V.q || (V.q = new api.THREE.Quaternion()).setFromAxisAngle(UP(), F.yaw));
  broom.visible = true;
  SW.head = { x: end.x, z: end.z, y: end.y };
  SW.hands = { lo: loH, hi: hiH, end: end.clone(), top };
}
function poseDust() {
  const g = api.FOOT.g; if (!g) return; tools();
  const U = g.userData, ph = api.now() * Math.PI * 2 * 1.3;
  U.arms[1].rotation.set(-1.05 + 0.1 * Math.cos(ph), 0.3 * Math.sin(ph), -0.1); U.fore[1].rotation.set(-0.55 + 0.12 * Math.sin(ph), 0, 0);
  U.arms[0].rotation.set(-0.15, 0, 0.12); U.fore[0].rotation.set(-0.35, 0, 0);
  g.updateMatrixWorld(true);
  const h = U.fore[1].localToWorld(V.a.set(0, -0.27, 0.03));
  cloth.position.copy(h); cloth.rotation.set(0, api.FOOT.yaw, 0); cloth.visible = true;
  DU.hand = { x: h.x, y: h.y, z: h.z };
}

// ---- the use control ----
const PROV = {
  use() {
    if (!inMine()) return null;
    const I = api.INT, s = S(), r = rec(I.cab.id), kh = api.keyHint;
    if (SW.on) return { label: "STOP", hint: () => `Sweeping: ${Math.round(100 * Math.min(1, SW.got / Math.max(1, SW.n * PROP.sweepDone)))}% of the floor · walk it slowly · ${kh("use", "stop")}`, act: () => stopSweep("Stopped sweeping.") };
    if (DU.cur >= 0) return { label: "STOP", hint: () => `Dusting ${Math.round(100 * DU.t / PROP.dustT)}% · ${kh("use", "stop")}`, act: () => stopDust("Stopped dusting.") };
    if (r.grit < PROP.tidy && r.dust < PROP.tidy) return null;
    const state = `floor ${word(r.grit, "g")}, shelves ${word(r.dust, "d")}`;
    if (s.kit <= 0) return { label: "CLEAN", hint: () => `${state[0].toUpperCase() + state.slice(1)} · no cleaning kit (the Real Estate app sells them)`, act: () => api.toast("You need a cleaning kit: the Real Estate app sells them.", "warn") };
    const i = r.dust >= PROP.tidy ? nearPiece() : -1;
    if (i >= 0) return { label: "DUST", hint: () => `${kh("use", "dust this")} · ${state} · kit: ${s.kit}`, act: () => startDust(i) };
    if (r.grit >= PROP.tidy) return { label: "SWEEP", hint: () => `${kh("use", "sweep the floor")} · ${state} · kit: ${s.kit}`, act: startSweep };
    return { label: "DUST", hint: () => `Shelves ${word(r.dust, "d")}: face the furniture up close to dust it · kit: ${s.kit}`, act: () => api.toast("Walk up to a piece of furniture and face it to dust it.") };
  },
  digging: () => false
};

// ---- the Real Estate app's rows (tracklayer.js calls reRow / kitRow / wire) ----
function reRow(id) {
  const r = rec(id), w = careOf(id), o = occ(id);
  return `<div class="tsml2"><div class="tsm2"><b>Upkeep</b><span>Floor ${word(r.grit, "g")} · shelves ${word(r.dust, "d")} · ${o >= 0 ? "+" : "−"}${Math.abs(Math.round(o * 100))}% let <i class="tcn">${w > 0 ? "the caretaker keeps it clean" : "sweep and dust it yourself, or hire a caretaker"}</i></span></div></div>`;
}
function kitRow() {
  const s = S(), full = s.kit + PROP.kit.uses > PROP.kit.max, poor = api.GS.cash < PROP.kit.cost;
  return `<div class="tsml2"><div class="tsm2"><b>${s.kit} left</b><span>Cleaning kit <i class="tcn">Broom, dustpan, cloths and soap: ${PROP.kit.uses} cleans (a swept floor or a dusted cabin each). Walk into a depot and sweep or dust it.</i></span><button type="button" class="tbtn ghost${full || poor ? " blocked" : ""}" data-tlxkit="1">${api.fmtCash(PROP.kit.cost)}</button></div></div>`;
}
function buyKit() {
  const s = S();
  if (s.kit + PROP.kit.uses > PROP.kit.max) { api.toast("You've got cleaning things enough for now.", "warn"); return false; }
  if (api.GS.cash < PROP.kit.cost) { api.toast(`A cleaning kit is ${api.fmtCash(PROP.kit.cost)}. You have ${api.fmtCash(api.GS.cash)}.`, "warn"); return false; }
  api.GS.cash -= PROP.kit.cost; s.kit += PROP.kit.uses; api.save(); api.toast(`Cleaning kit bought: ${s.kit} cleans.`, "good");
  try { if (api.TABLET && api.TABLET.open) api.TABLET.render(); } catch (e) { }
  return true;
}
function wire(el) { for (const b of el.querySelectorAll("[data-tlxkit]")) b.addEventListener("click", buyKit); }

TLX.register({
  id: "prop", v: 1,
  state0: () => ({ cab: {}, kit: 0, hT: null }),
  migrate(st) { return st; },
  init(a) {
    api = a; const s = S();
    if (!s.cab || typeof s.cab !== "object" || Array.isArray(s.cab)) s.cab = {};
    for (const k in s.cab) if (!s.cab[k] || typeof s.cab[k] !== "object") delete s.cab[k]; else rec(k);
    s.kit = clamp(Math.floor(+s.kit || 0), 0, PROP.kit.max);
    if (s.hT !== null && !isFinite(+s.hT)) s.hT = null;
    if (api.footx && !api.footx.includes(PROV)) api.footx.push(PROV);
  },
  tick(dt) {
    if (!api || !api.started()) return;
    stepT += dt; if (stepT >= 1) { stepT = 0; step(); }
    const I = api.INT;
    if (SW.on) { sweepTick(); if (SW.on) poseSweep(); }
    if (DU.cur >= 0) { dustTick(dt); if (DU.cur >= 0) poseDust(); }
    if (!SW.on && broom && broom.visible) broom.visible = false;
    if (DU.cur < 0 && cloth && cloth.visible) cloth.visible = false;
    if (!SW.on && DU.cur < 0 && I && I.slow !== undefined && I.slow !== 1) I.slow = 1;
    // in your own cabin, the floor shows its grit
    if (I && I.on && I.room && inMine() && !SW.on) decalShow(I.room, rec(I.cab.id).grit, null);
  }
});
TLX.prop = { PROP, occ, rec, word, step, buyKit, reRow, kitRow, wire, startSweep, stopSweep, startDust, stopDust, nearPiece, freeCells, standAt, piecesOf,
  SW, DU, get kit() { return S().kit; }, state: S, use: () => PROV.use() };
})();
