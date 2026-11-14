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
// Slice 6.1b: property TYPES. The Real Estate app gets a strip of types (Depot cabins, Lighthouses; inns, the hotel and
// workshops add theirs with TLX.prop.addListing as they land) and a listings page per type. A listing is a place with
// several ROOMS: each room is its own walk-in interior (api.intAdd) with its own grit and dust, swept and dusted like a
// depot. The first: Slettnes lighthouse station (the keeper's house and the tower room). Its keeper's house is let to
// guests by the night like a depot (you away at midnight; dirt averaged over the rooms; a caretaker can be hired for
// it), paid on Mondays by this file's monday(). The lamp, its oil and the stipend are 6.2.
//
// SAVED under x.sys.prop: { cab: { roomKey: { grit, dust } } (a depot's key is its cabin id, a listing's room is
// "listing:room"), kit (cleans left), hT (game hour last stepped), own: { listingId: { since, acc, nights, rented } },
// dT (day index last settled), last: [weekly statements] }.
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
  tidy: 3,                       // under this, nothing to do
  empty: { grit: 12, dust: 34 }, // a listing has stood empty: how its rooms are when you get the keys
  polar: 0.12, nightsMax: 3      // more guests in the polar night (as the depots); a clock jump settles at most this many nights
};
// the Real Estate app's pages, in order. "depot" is tracklayer.js's own page (RE_CABINS); a type shows once it has a listing.
const TYPES = [
  { id: "depot", name: "Depot cabins" },
  { id: "light", name: "Lighthouses", sub: "Kystverket is selling off its keepers' stations. The light stays lit; the house is yours to let." },
  { id: "inn", name: "Inns" }, { id: "hotel", name: "Hotel" }, { id: "garage", name: "Workshops" }
];
// what's on the books beyond the depot cabins: { id, type, name, short, price, rent (a night), occ (share of nights let, bare),
// chip, blurb, rooms: [{ id, name, door (the outdoor hint's noun), jig, build(R, K), warm }], place(W) -> { x, z, rooms: { id: { x, z, ry } }, sign } }
const LISTINGS = [];
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
  for (const c of allRooms()) {
    const r = rec(c.key), away = awayFrom(c);
    r.grit += PROP.gritDay * dh / 24 * (away ? 1 : PROP.gritHere);
    r.dust += PROP.dustDay * dh / 24;
    if (c.w > 0) { const k = PROP.careDay * c.w * c.k * dh / 24; r.grit -= k; r.dust -= k; }
    r.grit = clamp(r.grit, 0, 100); r.dust = clamp(r.dust, 0, 100);
  }
  nights();
}
// every room that collects dirt: a depot is one room; a listing's rooms share its caretaker (k: their day spread over them)
function allRooms() {
  const out = [];
  for (const c of owned()) out.push({ key: c.id, x: c.x, z: c.z, w: careOf(c.id), k: 1 });
  for (const l of ownedP()) { const w = careP(l.id), k = l.rooms.length > 1 ? 1.7 / l.rooms.length : 1; for (const r of l.rooms) out.push({ key: keyOf(l, r), x: l.at ? l.at.x : undefined, z: l.at ? l.at.z : undefined, w, k, prop: l.id }); }
  return out;
}
// you're "away" from a place (so guests have it) unless you're inside one of its rooms or within PROP.away of it
function awayFrom(c) {
  const I = api.INT, me = here();
  if (I.on && I.cab && (I.cab.id === c.key || (c.prop && I.cab.prop === c.prop))) return false;
  return c.x === undefined || Math.hypot(me.x - c.x, me.z - c.z) > PROP.away;
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
function inMine() { const I = api.INT; if (!I.on || !I.cab) return false; if (I.cab.prop) return ownsP(I.cab.prop); return !I.cab.build && I.cab.id !== "sauna" && isOwned(I.cab.id); }

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
  const r = rec(id), w = careOf(id), o = Math.round(occ(id) * 100);
  return `<div class="tsml2"><div class="tsm2 tprow"><b>Upkeep</b><span>Floor ${word(r.grit, "g")} · shelves ${word(r.dust, "d")} · ${o >= 0 ? "+" : "−"}${Math.abs(o)}% let <i class="tcn">${w > 0 ? "the caretaker keeps it clean" : "sweep and dust it yourself, or hire a caretaker"}</i></span></div></div>`;
}
function kitRow() {
  const s = S(), full = s.kit + PROP.kit.uses > PROP.kit.max, poor = api.GS.cash < PROP.kit.cost;
  return `<div class="tsml2"><div class="tsm2 tprow"><b>${s.kit} left</b><span>Cleaning kit <i class="tcn">Broom, dustpan, cloths and soap: ${PROP.kit.uses} cleans (a swept floor or a dusted room each). Walk into a place of yours and sweep or dust it.</i></span><button type="button" class="tbtn ghost${full || poor ? " blocked" : ""}" data-tlxkit="1">${api.fmtCash(PROP.kit.cost)}</button></div></div>`;
}
function buyKit() {
  const s = S();
  if (s.kit + PROP.kit.uses > PROP.kit.max) { api.toast("You've got cleaning things enough for now.", "warn"); return false; }
  if (api.GS.cash < PROP.kit.cost) { api.toast(`A cleaning kit is ${api.fmtCash(PROP.kit.cost)}. You have ${api.fmtCash(api.GS.cash)}.`, "warn"); return false; }
  api.GS.cash -= PROP.kit.cost; s.kit += PROP.kit.uses; api.save(); api.toast(`Cleaning kit bought: ${s.kit} cleans.`, "good");
  try { if (api.TABLET && api.TABLET.open) api.TABLET.render(); } catch (e) { }
  return true;
}
function wire(el) {
  for (const b of el.querySelectorAll("[data-tlxkit]")) b.addEventListener("click", buyKit);
  for (const b of el.querySelectorAll("[data-pty]")) b.addEventListener("click", () => setTab(b.dataset.pty));
  for (const b of el.querySelectorAll("[data-act^=probuy]")) b.addEventListener("click", () => buy(b.dataset.act.split(":")[1]));
}

/* ---------------- 6.1b: property types, listings with rooms ---------------- */
let tab = "depot", placed = false;
const L = id => LISTINGS.find(l => l.id === id) || null;
const keyOf = (l, r) => l.id + ":" + r.id;
const ownsP = id => { const s = S(); return !!(s && s.own && s.own[id] && L(id)); };
const ownedP = () => LISTINGS.filter(l => ownsP(l.id));
const careP = id => (TLX.staff && TLX.staff.workAt ? TLX.staff.workAt("pr:" + id) : 0);
function addListing(l) { if (!l || typeof l.id !== "string" || L(l.id) || !Array.isArray(l.rooms) || !l.rooms.length) return null; LISTINGS.push(l); if (placed) placeOne(l); return l; }
// the places staff can work at (tlx-staff.js reads this at its own init, so it leans on ownership alone, never on l.at)
function places() { return ownedP().map(l => ({ id: l.id, name: l.short || l.name, x: l.at ? l.at.x : undefined, z: l.at ? l.at.z : undefined })); }
// share of nights let: bare + the polar night + clean or dirty (the rooms' average) + a caretaker
function occP(l) {
  const dirt = l.rooms.reduce((a, r) => a + occ(keyOf(l, r)), 0) / l.rooms.length;
  return clamp(l.occ + (api.CAL.isPolarNight() ? PROP.polar : 0) + dirt + (TLX.staff && TLX.staff.occAt ? TLX.staff.occAt("pr:" + l.id) : 0), 0.15, 0.95);
}
// midnight: who stayed (the day index moved on since the last look)
function nights() {
  const s = S(), D = api.CAL.dayIndex();
  if (s.dT === null || s.dT === undefined || !isFinite(s.dT) || s.dT > D) { s.dT = D; return; }
  const n = Math.min(PROP.nightsMax, D - s.dT); if (n <= 0) return; s.dT = D;
  for (const l of ownedP()) {
    const o = s.own[l.id], away = awayFrom({ key: null, prop: l.id, x: l.at ? l.at.x : undefined, z: l.at ? l.at.z : undefined });
    for (let i = 0; i < n; i++) { if (away && Math.random() < occP(l)) { o.acc += l.rent; o.rented++; } o.nights++; }
  }
}
function monday(week) {
  const s = S(), own = ownedP(); if (!own.length) return;
  let rent = 0, n = 0, let_ = 0;
  for (const l of own) { const o = s.own[l.id]; rent += o.acc; n += o.nights; let_ += o.rented; o.acc = 0; o.nights = 0; o.rented = 0; }
  rent = Math.round(rent); api.GS.cash += rent;
  const d = week && week.label || "";
  s.last.unshift({ d, rent, rented: let_, nights: n }); s.last = s.last.slice(0, 4);
  api.save(); try { api.TABLET.refresh("realestate"); } catch (e) { }
  setTimeout(() => { try { api.TABLET.notify({ app: "realestate", kind: "good", title: `Properties · week to ${d}`, body: `Lets +${api.fmtCash(rent)} (${let_} of ${n} nights let)`, ttl: 8 }); } catch (e) { } }, 6400);
}
function buy(id) {
  const l = L(id), s = S(); if (!l || !l.at || s.own[id]) return false;
  if (api.busy()) { api.toast("Finish the school course first.", "warn"); return false; }
  if (api.GS.cash < l.price) { api.toast(`${l.name} is ${api.fmtCash(l.price)}. You have ${api.fmtCash(api.GS.cash)}.`, "warn"); return false; }
  api.GS.cash -= l.price; s.own[id] = { since: hour(), acc: 0, nights: 0, rented: 0 };
  for (const r of l.rooms) { const q = rec(keyOf(l, r)); q.grit = PROP.empty.grit; q.dust = PROP.empty.dust; }
  signSync(l); api.ui.ping("good"); api.save(); render();
  api.toast(`${l.name} is yours. It's stood empty a while: the rooms want dusting before the guests come.`, "good");
  return true;
}
function render() { try { if (api.TABLET && api.TABLET.open) api.TABLET.render(); } catch (e) { } }
function setTab(id) { tab = TYPES.some(t => t.id === id) ? id : "depot"; try { const v = document.getElementById("tabV"); if (v) v.scrollTop = 0; } catch (e) { } render(); }
const typesOn = () => TYPES.filter(t => t.id === "depot" || LISTINGS.some(l => l.type === t.id && l.at));
// the strip of types on top of every Real Estate page (nothing while the depot cabins are all there is)
function reTabs() {
  const ts = typesOn(); if (ts.length < 2) return "";
  if (!ts.some(t => t.id === tab)) tab = "depot";
  return `<div class="tlays tmkcats">${ts.map(t => { const n = t.id === "depot" ? owned().length : ownedP().filter(l => l.type === t.id).length; return `<button type="button" class="tml${tab === t.id ? " on" : ""}" data-tf="pty:${t.id}" data-pty="${t.id}">${t.name}${n ? ` <b>${n}</b>` : ""}</button>`; }).join("")}</div>`;
}
// a type's page (the depot page is tracklayer.js's own: "" here)
function rePage() {
  const ts = typesOn(); if (!ts.some(t => t.id === tab)) tab = "depot";
  if (tab === "depot") return "";
  const U = api.ui, s = S(), T = TYPES.find(t => t.id === tab), ls = LISTINGS.filter(l => l.type === tab && l.at), own = ls.filter(l => ownsP(l.id)), sale = ls.filter(l => !ownsP(l.id)), me = here();
  const wk = own.reduce((a, l) => a + l.rent * 7 * occP(l), 0), dist = l => U.fmtMi(Math.hypot(l.at.x - me.x, l.at.z - me.z));
  api.TABLET.miniDest = {};
  const mini = l => { const k = "pr_" + l.id; api.TABLET.miniDest[k] = { id: k, x: l.at.x, z: l.at.z, y: l.at.y, name: l.name }; return "depot|" + k; };
  let h = U.tabHead("REAL ESTATE · FINNMARK EIENDOM", T.name, api.fmtCash(api.GS.cash));
  h += `<div class="tsub">${own.length ? `${own.length} of ${ls.length} yours · lets about ${api.fmtCash(wk)} a week` : "Nothing of yours here yet"}</div>` + reTabs();
  if (own.length) {
    h += U.sec("Yours", "lets paid Mondays");
    for (const l of own) {
      const o = s.own[l.id], w = careP(l.id), near = !awayFrom({ prop: l.id, x: l.at.x, z: l.at.z }), d = Math.round(100 * l.rooms.reduce((a, r) => a + occ(keyOf(l, r)), 0) / l.rooms.length);
      h += U.tabCard({ tf: "pro:" + l.id, mini: mini(l), title: l.short || l.name, chips: U.chip("LET TO GUESTS", "ok") + (w > 0 ? U.chip("CARETAKER") : ""),
        meta: `${api.fmtCash(l.rent)} a night · about ${Math.round(occP(l) * 100)}% let · ${dist(l)} from you`,
        note: `This week: ${o.rented} of ${o.nights} nights let, ${api.fmtCash(o.acc)} in lets.${near ? " You're here, so nobody's staying tonight." : ""}` });
      h += `<div class="tsml2">${l.rooms.map(r => { const q = rec(keyOf(l, r)); return `<div class="tsm2 tprow"><b>${U.esc(r.name)}</b><span>Floor ${word(q.grit, "g")} · shelves ${word(q.dust, "d")}</span></div>`; }).join("")}<div class="tsm2 tprow"><b>Upkeep</b><span>${d >= 0 ? "+" : "−"}${Math.abs(d)}% let, over the rooms <i class="tcn">${w > 0 ? "the caretaker keeps them clean" : "every room is swept and dusted on its own: do it yourself, or hire a caretaker (Staff app)"}</i></span></div></div>`;
    }
    h += kitRow();
  }
  if (s.last.length) h += U.sec("Statements", "") + `<div class="tsml2">${s.last.map(q => `<div class="tsm2 tprow"><b>${U.esc(q.d)}</b><span>Lets +${api.fmtCash(q.rent)} · ${q.rented}/${q.nights} nights</span>${U.chip("PAID", "ok")}</div>`).join("")}</div>`;
  h += U.sec("For sale", sale.length ? "no agent, no fees" : "");
  if (!sale.length) h += `<p class="tnote2">Nothing more of this kind on the books. Finnmark Eiendom will be in touch if anything comes up.</p>`;
  for (const l of sale) h += U.tabCard({ tf: "prs:" + l.id, mini: mini(l), title: l.name, chips: U.chip(l.chip || T.name.toUpperCase()) + U.chip(`${l.rooms.length} ROOMS`) + U.chip(api.fmtCash(l.rent) + "/NIGHT"),
    meta: `${dist(l)} from you · lets about ${api.fmtCash(l.rent * 7 * l.occ)} a week bare`, note: `${U.esc(l.blurb)} Walk in and have a look before you buy: ${l.rooms.map(r => r.name.toLowerCase()).join(", ")}.`,
    pay: api.fmtCash(l.price), act: "probuy:" + l.id, actLabel: "BUY IT", blocked: api.GS.cash < l.price });
  h += `<p class="tnote2">${T.sub ? T.sub + " " : ""}Guests take it on nights you're not there. Each room collects its own grit and dust, and a dirty room costs nights let.</p>`;
  return h;
}

// ---- in the world: where a listing stands, its doors (one walk-in room each), its sign ----
function signTex(l, sold) {
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const g = cv.getContext("2d");
  g.fillStyle = sold ? "#13202b" : "#f2efe6"; g.fillRect(0, 0, 256, 128); g.fillStyle = sold ? "#7fc8e0" : "#c23a22"; g.fillRect(0, 0, 256, 16);
  g.fillStyle = sold ? "#f2efe6" : "#1a1a1a"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "700 34px 'Barlow Semi Condensed', sans-serif";
  g.fillText(sold ? (l.sign || "PRIVAT") : "TIL SALGS", 128, 56); g.font = "600 17px 'Barlow Semi Condensed', sans-serif"; g.fillStyle = sold ? "#7fc8e0" : "#c23a22";
  g.fillText(sold ? "rooms to let · private" : "FINNMARK EIENDOM · " + api.fmtCash(l.price), 128, 96);
  const t = new api.THREE.CanvasTexture(cv); t.encoding = api.THREE.sRGBEncoding; return t;
}
function signSync(l) {
  if (!l.vis) return; const k = ownsP(l.id) ? "own" : "sale"; if (l.vis.k === k) return; l.vis.k = k;
  if (l.vis.mat.map) l.vis.mat.map.dispose(); l.vis.mat.map = signTex(l, k === "own"); l.vis.mat.needsUpdate = true;
}
function placeOne(l) {
  if (l.at || !api.intAdd) return;
  let at = null; try { at = l.place(api.world); } catch (e) { console.error("TLX prop place " + l.id, e); }
  if (!at) return; l.at = at;
  const T = api.THREE, W = api.world;
  for (const r of l.rooms) {
    const d = at.rooms[r.id]; if (!d) continue;
    r.beacon = api.intAdd({ id: keyOf(l, r), name: r.name, prop: l.id, room: r.id, x: d.x, z: d.z, ry: d.ry, jig: r.jig, door: r.door, build: (R, K) => r.build(R, K, l),
      hint: () => null,
      enter: () => api.toast(ownsP(l.id) ? `${r.name}: ${r.warm || "yours."} Walk back into the doorway to go out.` : `${r.name}: cold, and for sale with the rest of ${l.short || l.name} (Real Estate app). Walk back into the doorway to go out.`) });
  }
  if (at.sign) {
    const g = new T.Group(), y = W.groundAt(at.sign.x, at.sign.z) - 0.1; g.position.set(at.sign.x, y, at.sign.z); g.rotation.y = at.sign.ry || 0; api.scene.add(g);
    const post = api.mesh.std(0x4a3a2a, 0.9);
    api.mesh.box(0.1, 1.9, 0.1, post, -0.7, 0.95, 0, 0, 0, 0, g); api.mesh.box(0.1, 1.9, 0.1, post, 0.7, 0.95, 0, 0, 0, 0, g);
    const mat = new T.MeshLambertMaterial({ map: null }), sp = new T.Mesh(new T.PlaneGeometry(1.6, 0.8), mat); sp.position.set(0, 1.55, 0.075); g.add(sp);
    api.mesh.box(1.66, 0.86, 0.05, post, 0, 1.55, 0.045, 0, 0, 0, g);          /* the board behind it: the back reads as plain timber, not mirrored lettering */
    l.vis = { g, mat, k: "" }; signSync(l);
  }
  if (at.dress) try { at.dress(l); } catch (e) { console.error("TLX prop dress " + l.id, e); }
}
function placeAll() { placed = true; for (const l of LISTINGS) placeOne(l); }

// ---- Slettnes lighthouse station: the keeper's house and the foot of the tower ----
// (the tower and the white house are tracklayer.js's own, built at the site of type "relay"; nothing here moves them)
function placeSlettnes(W) {
  const s = (W.SITES || []).find(q => q.type === "relay" && q.x !== undefined); if (!s) return null;
  let D = null, bd = 30;                                                   // the keeper's house: the lit door nearest the light
  for (const q of W.doors || []) { const d = Math.hypot(q.x - s.x, q.z - s.z); if (d < bd) { bd = d; D = q; } }
  if (!D) return null;
  const hx = D.x + D.nx * (D.d / 2 + 1.25), hz = D.z + D.nz * (D.d / 2 + 1.25), tx = s.x - 11, tz = s.z;   // the tower stands 11 m west of the site's point
  return { x: s.x, z: s.z, y: s.y, rooms: { house: { x: hx, z: hz, ry: Math.atan2(D.nx, D.nz) }, tower: { x: tx + 3.85, z: tz, ry: Math.PI / 2 } },
    sign: { x: hx + D.nz * 3.4 + D.nx * 1.5, z: hz - D.nx * 3.4 + D.nz * 1.5, ry: Math.atan2(D.nx, D.nz) },
    dress() {                                                              // a door in the foot of the tower, facing the yard
      const T = api.THREE, g = new T.Group(); g.position.set(tx, W.groundAt(tx, tz) - 0.3, tz); api.scene.add(g);
      api.mesh.box(0.24, 2.3, 1.3, api.mesh.std(0xe9e6dc, 0.8), 2.5, 1.2, 0, 0, 0, 0, g); api.mesh.box(0.3, 2.0, 0.96, api.mesh.std(0x23303a, 0.7), 2.52, 1.1, 0, 0, 0, 0, g);
      api.mesh.box(0.06, 0.05, 0.14, api.mesh.std(0xc9a14a, 0.4, 0.8), 2.69, 1.08, -0.32, 0, 0, 0, g);
    } };
}
// the keeper's house: two beds, the kitchen along the back wall, a soapstone stove, the keeper's desk under the barometer
function houseRoom(R, K) {
  const IM = K.IM, box = api.mesh.box, cyl = api.mesh.cyl;
  K.shell(R, { plaster: true, doorX: -2.3, insul: true, wins: [["x", 2.88, 0.9, 1.4, 0.95, 1.85], ["z", 3.88, 0.3, 1.3, 0.95, 1.8], ["z", -3.88, 0.7, 1.2, 0.95, 1.75]] });
  K.rug(R, 0.0, 0.1, 2.4, 1.7, IM.cloth2);
  K.bed(R, 2.75, 2.2, 0); K.bed(R, 2.75, 0.75, 0);
  K.table(R, 0.0, 0.1, 1.3, 0.85, 0.74); K.chair(R, 0.0, 1.05, 0); K.chair(R, 0.0, -0.85, Math.PI);
  R.fire = K.stove(R, 3.2, -1.9, true, 0);
  K.counter(R, -2.6, 2.4, 1.9, 0); K.shelf(R, -2.6, 2.6, 1.6, 0);
  K.table(R, 0.9, -2.35, 1.2, 0.6, 0.76);                                   // the keeper's desk: the log, an inkwell, the barometer on the wall
  box(0.34, 0.03, 0.26, IM.cloth, 0.75, 0.81, -2.35, 0, 0.2, 0, R.g); cyl(0.03, 0.035, 0.06, IM.dark, 1.25, 0.82, -2.4, 0, 0, 0, R.g, 8);
  K.wallGear(R, 0.9, -2.72, Math.PI, "clock");
  K.lamp(R, 0.0, 0.1, "pendant", 1.95); K.lamp(R, -2.4, 1.7, "pendant", 1.95);
  K.hooks(R, -3.72, -0.3, Math.PI / 2, 3, true); K.wallGear(R, -3.72, 1.0, Math.PI / 2, "chart");
  K.crate(R, -3.35, -1.55, 0.6, 0.5, 0.5); K.wood(R, 2.0, -2.4, 6, 0);
}
// the foot of the tower: the oil store and the lamp bench, the iron stair winding up out of sight
function towerRoom(R, K) {
  const IM = K.IM, box = api.mesh.box, cyl = api.mesh.cyl, T = api.THREE;
  R.hx = 2.5; R.hz = 2.5; R.h = 2.9;
  K.shell(R, { plaster: true, doorX: 0, wins: [["z", -2.58, 1.2, 0.7, 1.15, 1.95]] });
  // the stair: a cast-iron newel and treads fanning up round it into the dark
  const sg = K.sub(R, 1.55, 1.55, 0); cyl(0.09, 0.09, R.h, IM.iron, 0, R.h / 2, 0, 0, 0, 0, sg, 10);
  for (let i = 0; i < 11; i++) { const a = Math.PI + i * 0.44, st = new T.Group(); st.rotation.y = a; st.position.y = 0.22 + i * 0.235; sg.add(st); box(0.3, 0.035, 0.82, IM.iron, 0, 0, 0.5, 0, 0, 0, st); box(0.025, 0.9, 0.025, IM.dark, 0, 0.45, 0.88, 0, 0, 0, st); }
  K.col(R, 1.55, 1.55, 1.9, 1.9, 0, 3);
  // paraffin drums on a rack, a hand pump on the nearest
  const dg = K.sub(R, -1.75, 1.75, 0);
  for (const [x, z, m] of [[-0.32, 0.3, IM.green], [0.34, 0.34, IM.iron], [-0.3, -0.36, IM.green]]) { cyl(0.28, 0.28, 0.88, m, x, 0.5, z, 0, 0, 0, dg, 14); cyl(0.29, 0.29, 0.03, IM.steel, x, 0.3, z, 0, 0, 0, dg, 14); cyl(0.29, 0.29, 0.03, IM.steel, x, 0.72, z, 0, 0, 0, dg, 14); }
  box(1.3, 0.06, 1.3, IM.wood, 0, 0.03, 0, 0, 0, 0, dg); cyl(0.02, 0.02, 0.5, IM.brass, 0.34, 1.18, 0.34, 0, 0, 0, dg, 6); box(0.18, 0.03, 0.03, IM.brass, 0.43, 1.42, 0.34, 0, 0, 0, dg);
  K.col(R, -1.75, 1.75, 1.35, 1.35, 0, 0.95);
  // the lamp bench: wicks, a spare chimney, the brass burner on a cloth
  K.table(R, -2.05, -0.5, 0.7, 1.5, 0.88);
  box(0.4, 0.012, 0.5, IM.cloth, -2.05, 0.922, -0.45, 0, 0, 0, R.g); cyl(0.07, 0.09, 0.16, IM.brass, -2.05, 1.0, -0.45, 0, 0, 0, R.g, 10); cyl(0.045, 0.05, 0.22, IM.steel, -2.1, 1.03, -0.95, 0, 0, 0, R.g, 10);
  K.shelf(R, -2.32, -0.5, 1.3, Math.PI / 2);
  K.crate(R, 2.05, -0.95, 0.7, 0.55, 0.6); K.crate(R, 2.1, -0.2, 0.5, 0.4, 0.5, IM.green);
  K.hooks(R, 2.42, -1.6, Math.PI / 2, 2, true);
  K.lamp(R, -0.3, 0.2, "kero", 2.1); K.lamp(R, -1.4, -0.6, "pendant", 2.2);
}
addListing({ id: "slettnes", type: "light", name: "Slettnes lighthouse station", short: "Slettnes station", sign: "SLETTNES FYR", chip: "LIGHTHOUSE", price: 12500, rent: 110, occ: 0.46,
  blurb: "The northernmost mainland light in the world: the cast-iron tower and the keeper's white house at its foot, on the tip beyond Gamvik. People pay to sleep under the lamp.",
  rooms: [{ id: "house", name: "Keeper's house", door: "The keeper's door", jig: [-30, 64], build: houseRoom, warm: "the soapstone stove is still warm." },
          { id: "tower", name: "Tower room", door: "The tower door", jig: [30, 64], build: towerRoom, warm: "paraffin and cold iron, and the stair winding up into the dark." }],
  place: placeSlettnes });

TLX.register({
  id: "prop", v: 1,
  state0: () => ({ cab: {}, kit: 0, hT: null, own: {}, dT: null, last: [] }),
  migrate(st) { return st; },
  init(a) {
    api = a; const s = S();
    if (!s.cab || typeof s.cab !== "object" || Array.isArray(s.cab)) s.cab = {};
    for (const k in s.cab) if (!s.cab[k] || typeof s.cab[k] !== "object") delete s.cab[k]; else rec(k);
    s.kit = clamp(Math.floor(+s.kit || 0), 0, PROP.kit.max);
    if (s.hT !== null && !isFinite(+s.hT)) s.hT = null;
    if (!s.own || typeof s.own !== "object" || Array.isArray(s.own)) s.own = {};
    for (const k in s.own) { const o = s.own[k]; if (!o || typeof o !== "object") { delete s.own[k]; continue; } o.acc = Math.max(0, +o.acc || 0); o.nights = Math.max(0, Math.floor(+o.nights || 0)); o.rented = Math.max(0, Math.floor(+o.rented || 0)); o.since = +o.since || 0; }
    if (s.dT !== null && !isFinite(+s.dT)) s.dT = null;
    s.last = Array.isArray(s.last) ? s.last.filter(q => q && typeof q === "object").slice(0, 4) : [];
    if (api.footx && !api.footx.includes(PROV)) api.footx.push(PROV);
    try { placeAll(); } catch (e) { console.error("TLX prop places", e); }
    if (api.TABLET && api.TABLET.addLayer) api.TABLET.addLayer("depots", () => ownedP().filter(l => l.at).map(l => ({ x: l.at.x, z: l.at.z, name: (l.short || l.name).toUpperCase(), kind: "depot" })));
    if (api.SEASON && api.SEASON.addBill) api.SEASON.addBill({ name: "Properties: summer lets", perWeek: () => ownedP().reduce((q, l) => q + l.rent * 7 * 0.5, 0) });
  },
  monday(week) { monday(week); },
  tick(dt) {
    if (!api || !api.started()) return;
    if (!placed || LISTINGS.some(l => !l.at && !l.tried)) { for (const l of LISTINGS) if (!l.at) { l.tried = true; } placeAll(); }
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
  SW, DU, get kit() { return S().kit; }, state: S, use: () => PROV.use(),
  // 6.1b: property types and listings
  TYPES, LISTINGS, addListing, listing: L, owns: ownsP, ownedP, places, occP, buy, monday, nights, rePage, reTabs, setTab, get tab() { return tab; }, key: keyOf, allRooms };
})();
