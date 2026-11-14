// Tracklayer — road traffic (slice 3.4a of the Four Seasons & Enterprise expansion, loop/EXPANSION.md).
//
// A few local drivers out on the open roads (3.1). Slow and predictable on purpose: a car keeps to the right-hand lane
// TRAF.lane m off the crown at no more than TRAF.vmax (45 km/h), slows for every bend to what packed snow holds
// (v = sqrt(TRAF.ay x radius), braking at TRAF.dec ahead of it), and stops for anything in its lane ahead (another
// car, the player's sled or truck, a parked vehicle, a person on foot) TRAF.gap m short, centre to centre. Where the
// road is snowed in (3.2: a stretch at TLXR's shut level) it stops TRAF.shutGap m before the drift, waits, and turns
// round; at a route's end (a village edge) it turns round too, or, out of the player's sight, drives on into the
// village (it leaves and another car turns up somewhere else). A car held up TRAF.blockT s by something that won't
// move turns round as well. Through a street hop in the middle of a route it keeps to the middle at street speed.
//
// THE BUBBLE. The roads run 60+ km; a handful of cars spread over them would never be seen. So the drivers live round
// the player: each is placed on an open, plowed stretch TRAF.spawn[0]..[1] m away (closer at boot so the first minutes
// have some), and one that ends up past TRAF.drop m away leaves and turns up again elsewhere. Counts per preset:
// TRAF.n.low on the low preset (phones), TRAF.n.high otherwise. Nothing is saved: a reload places them afresh.
//
// SOLID. Each car is three circles along its length (the parked cars' shape). The sled or the truck you drive is pushed
// out of a car and loses the speed it drove into it (a thud, the cargo knocked as at a boulder; the car's driver stops
// a moment); a walker is pushed aside. The game's own obstacle grid is static, so this runs here in tick().
//
// PULLING OUT (3.4b1). Something standing in the lane (your parked sled, a walker, a parked truck, a stopped car) no
// longer just holds a car up until it gives up and turns round: after TRAF.passWait s the driver looks down the other
// lane, and if it's empty TRAF.passLook m ahead (nothing coming, nothing in it) and there's road enough before the end
// or a drift, it moves over at a crawl, creeps past at TRAF.passV and moves back in TRAF.passBy m beyond it once its
// own lane is clear. Met by something in the other lane mid-pass it stops, and after 6 s moves back in. A car that has
// to stop short (a walker stepping out close in front) brakes as hard as it takes, up to 2.5x the profile.
//
// WHAT IT COSTS. Five instanced meshes for all the cars (paint with per-car colour, glass, trim, lamps, and the wheels,
// four instances a car, turned by the distance rolled): +5
// draw calls (+ the shadow pass on high). The body shapes are the parked cars' (TLXC.geo, built by tlx-cars.js). Lamps
// are unlit, brightened after dark from dayFactor (headlights and tail lights), so they don't glow by day.
//
// AFTER DARK AND IN THE EAR (3.4b2a). Headlight beams: two soft additive cones per car (a sixth instanced mesh) and a
// pool of light laid on the snow ahead (one shared mesh, re-laid on surf() each night frame), faded by darkness and by
// distance from the camera, hidden by day. The hum: the loudest car within TRAF.humR m drives one engine + tyre voice on
// the game's audio master; TLXT.humGain / humF / humCar report it.
//
// GOING HOME (3.4b2b). About a third of the parked cars a driver can reach are out at boot (their spots empty); now and
// then a car leaves the road at its end or on a street hop, drives the village street to one of those doors and parks
// there as that owner's car (see the block above homesPrep). TLXT.homes / homesDone / sendHome / homePath report it.
//
// SEMIS (3.5a). TRAF.semi.n more drivers are articulated lorries (tlx-semis.js: a distribution box, a long-haul
// curtainsider, a fuel tanker), driven by the same road driver: slower (TRAF.semi.vmax, bends at vk x the car speed),
// pulling away gently, stopping with their bumper (not their middle) the gap short. The trailer swings on the
// coupling: each frame its axle point is pulled straight toward the kingpin on the tractor until it is the trailer's
// wheelbase behind it (c.ax/az; the kingpin c.hx/hz, trailer heading c.tyaw, articulation c.art in radians), so it
// cuts inside every bend and straightens after. A semi is solid along its whole length (c.circ), and drivers behind
// one stop short of its TAIL (c.pts: the points others see). A semi never U-turns on a two-lane road: at the road's
// end, a drift or anything that won't move it waits, engine idling, and has gone (turned at a lay-by) once you're
// TRAF.semi.gone m off. It pulls out round something standing in the lane like a car, moving back in only once its
// trailer is past. Semis never drive home to a parked spot.
//
// Option "traffic" (Settings > Options, on): off hides every car and stops all of it (and every owner is home).
//
// TLXT (window, for later slices and scenarios): cars [{ rt, s, dir, v, st, x, z, y, yaw, why, lane, pass, roll }],
// ready, err, ms, routes (the drivable routes), n (cars for this preset), place(routeId, s, dir, i) -> car (puts car i,
// default 0, there and holds the bubble; car 0 hides the rest), hold (true = no despawn/respawn), stopAhead(car) ->
// { d, why, a, mv }, startTurn(car), hits (bumps so far), passes (pull-outs so far), wheels (the wheel mesh).
(() => {
"use strict";
const TRAF = {
  n: { low: 3, high: 6 },     // drivers round the player per graphics preset
  vmax: 12.5,                 // m/s on a straight (45 km/h)
  vst: 6,                     // m/s through a street hop
  ay: 1.9,                    // m/s^2 sideways a car holds on packed snow (the road tests' driver rule)
  acc: 1.1, dec: 1.6,         // m/s^2 pulling away / easing off for a bend
  brake: 3.2,                 // m/s^2 stopping for something ahead (hard stop up to 2x when it's close)
  lane: 1.6,                  // m right of the crown
  laneW: 2.3,                 // something within this of the car's line, ahead, holds it up
  gap: 7.5,                   // stops this far behind it, centre to centre, m
  look: 160,                  // how far ahead a driver looks, m
  shutGap: 22, endGap: 6,     // stops this short of a drifted stretch / the end of the road, m
  waitShut: 10, waitEnd: 4,   // game s waiting before turning round
  blockT: 25,                 // held up this long by something that doesn't move: turn round
  turnT: 7, bulge: 5.5,       // a U-turn's time (s) and how far forward it swings, m
  spawn: [600, 1400], spawn0: [220, 1300], drop: 1800, gapCars: 90,
  r: 0.95, off: 1.45,         // the three circles: radius, spacing along the car
  // pulling out round something that stands in the lane (3.4b1): after passWait s stopped behind it, if the other
  // lane is empty passLook m ahead, the car moves over at laneRate m/s, creeps past at passV and moves back once it's
  // passBy m beyond it with the lane clear
  passWait: 3, passLook: 110, passV: 5, passBy: 9, laneRate: 1.4,
  wheelR: 0.33, wheels: [[0.8, 1.38], [-0.8, 1.38], [0.8, -1.38], [-0.8, -1.38]],   // tyre faces flush with the body side, so the rims show
  // the beams and the hum (3.4b2a): cone length m, brightness, faded out between beamFar[0] and [1] m from the camera;
  // a car is heard within humR m, at most humG loud (the sled's own engine idles at 0.09)
  beamLen: 17, beamI: 0.32, beamFar: [260, 520], humR: 150, humG: 0.11,
  // going home (3.4b2b): share of the parked cars whose owner is out at boot; a car for one of them turns up on the road
  // into the player's village every every[0..1] game s (player within near m of the empty spot), from[0..1] m back along
  // the route; a car at a road's end or on a street hop takes a free spot there with chance P; the street leg may be at
  // most reach m from the route's street to the door; it stops gap m behind someone on the street, ignores things past
  // the spot; held up give s with you out of sight, it parks (or gives up if the spot itself is taken); a spot is only
  // used if the whole drive keeps the three r 0.95 circles at least sweep m clear (0.95 - 0.88 half width = 0.07 slack)
  home: { share: 0.3, every: [110, 220], near: 420, from: [170, 300], P: 0.5, reach: 140, gap: 5.5, look: 25, give: 30, sweep: -0.06, dec: 1.0 },
  // semis (3.5a): how many per preset, top speed m/s, share of the car's bend speed, pull-away m/s^2, body circle radius,
  // how far off you must be before one that is waiting (end, drift, blocked) is gone
  semi: { n: { low: 1, high: 2 }, vmax: 11, vk: 0.88, acc: 0.6, r: 1.27, gone: 250 },
  cols: [0xe9ebee, 0xb9bec4, 0x4a4f55, 0x1d2024, 0x1f2f4f, 0x8d1f1c, 0x2d4635, 0x6d7a86, 0x9a8a6c, 0xe9ebee]
};
let api = null, M = null;
const T = window.TLXT = { cars: [], ready: false, err: null, ms: 0, routes: [], n: 0, hold: false, hits: 0, homes: [], homesDone: 0, TRAF };

// ---- the drivable routes: the open roads with their speed profile both ways and which points are street
function prep() {
  const R = window.TLXR; if (!R || !R.ready) return [];
  const out = [];
  for (const rt of R.routes) {
    if (rt.closed || !rt.st) continue;
    const pts = [], street = [];
    for (const sg of rt.segs) for (const q of sg.pts) { const l = pts[pts.length - 1]; if (!l || Math.hypot(q[0] - l[0], q[1] - l[1]) > 0.5) { pts.push(q); street.push(!!sg.street); } }
    if (pts.length !== rt.pts.length) { street.length = 0; for (let i = 0; i < rt.pts.length; i++) street.push(false); }
    const P = rt.pts, n = P.length, cum = rt.cum;
    let i0 = 0, i1 = n - 1;                                                  // the road part: first to last non-street point
    while (i0 < n - 1 && street[i0]) i0++;
    while (i1 > 0 && street[i1]) i1--;
    if (cum[i1] - cum[i0] < 200) continue;
    const cap = new Float32Array(n);
    for (let i = 0; i < n; i++) cap[i] = street[i] ? TRAF.vst : (i >= 2 && i < n - 2 ? Math.min(TRAF.vmax, Math.sqrt(TRAF.ay * R.turnR(P, i))) : TRAF.vmax);
    const vP = new Float32Array(cap), vM = new Float32Array(cap);
    for (let i = n - 2; i >= 0; i--) vP[i] = Math.min(vP[i], Math.sqrt(vP[i + 1] * vP[i + 1] + 2 * TRAF.dec * (cum[i + 1] - cum[i])));
    for (let i = 1; i < n; i++) vM[i] = Math.min(vM[i], Math.sqrt(vM[i - 1] * vM[i - 1] + 2 * TRAF.dec * (cum[i] - cum[i - 1])));
    out.push({ rt, id: rt.id, pts: P, cum, street, vP, vM, s0: cum[i0], s1: cum[i1], len: cum[i1] - cum[i0], i0, i1 });
  }
  return out;
}
function idxAt(r, s, k) {                                                    // index k with cum[k] <= s < cum[k+1], from a hint
  const c = r.cum, n = c.length;
  k = Math.max(0, Math.min(n - 2, k | 0));
  while (k > 0 && c[k] > s) k--;
  while (k < n - 2 && c[k + 1] <= s) k++;
  return k;
}
function at(r, s, k) {                                                       // centreline point and unit tangent at s
  k = idxAt(r, s, k);
  const a = r.pts[k], b = r.pts[k + 1], L = (r.cum[k + 1] - r.cum[k]) || 1, t = Math.max(0, Math.min(1, (s - r.cum[k]) / L));
  return { k, x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / L, tz: (b[1] - a[1]) / L, t };
}
const vProf = (r, s, k, dir) => { k = idxAt(r, s, k); const a = dir > 0 ? r.vP : r.vM; return Math.min(a[k], a[k + 1]); };   // the slower of the two points it's between

// ---- the player and the things a driver stops for
function bodies() {
  const P = api.P, F = api.FOOT, out = [{ x: P.x, z: P.z, vx: P.vx || 0, vz: P.vz || 0, who: "you", y: P.y }];
  if (F.on) out.push({ x: F.x, z: F.z, vx: 0, vz: 0, who: "walker", y: api.world.surf(F.x, F.z) });
  const V = window.TLXV;
  if (V && V.state) {
    const s = V.state();
    if (s && Array.isArray(s.owned)) for (const r of s.owned) if (s.cur !== r.uid && Number.isFinite(r.x)) out.push({ x: r.x, z: r.z, vx: 0, vz: 0, who: "parked" });
    if (s && s.cur != null && s.sled && Number.isFinite(s.sled.x)) out.push({ x: s.sled.x, z: s.sled.z, vx: 0, vz: 0, who: "parked" });
  }
  return out;
}
const youPos = () => { const F = api.FOOT, P = api.P; return F.on ? { x: F.x, z: F.z } : { x: P.x, z: P.z }; };

// how far this car can drive before it must stand, and why
function stopAhead(c, B, sh0) {
  const r = c.r, R = window.TLXR, seg = R.ROADS.seg;
  let d = c.dir > 0 ? r.s1 - TRAF.endGap - c.s : c.s - (r.s0 + TRAF.endGap), why = "end";
  for (const g of r.rt.seg) {
    if (!g.shut) continue;
    const a = g.a, b = g.a + seg;
    if (c.s >= a && c.s < b) continue;                                       // drifted in round it while it drove: it crawls on
    const dd = c.dir > 0 ? a - c.s - TRAF.shutGap : c.s - b - TRAF.shutGap;
    if (dd > -TRAF.shutGap && dd < d) { d = dd; why = "shut"; }
  }
  // the line it checks is the lane it's heading for (sh m right of where it is now: moving over to pass, it looks down
  // the other lane, not at the thing it's pulling out round)
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), sh = sh0 != null ? sh0 : (c.r.street[c.k] ? 0 : (c.laneT ?? TRAF.lane)) - (c.lane ?? TRAF.lane);
  let a0 = 0, mv = false;
  const each = (x, z, who, v) => {
    const dx = x - c.x, dz = z - c.z, a = dx * fx + dz * fz;
    if (a <= 0 || a > TRAF.look) return;
    if (Math.abs(dz * fx - dx * fz - sh) > TRAF.laneW) return;
    const dd = a - TRAF.gap - (c.fro || 0); if (dd < d) { d = dd; why = who; a0 = a; mv = v > 0.5; }
  };
  for (const o of T.cars) if (o !== c && o.on) { const v = o.st === "turn" ? 1 : o.v; if (o.semi && o.pts) for (const p of o.pts) each(p[0], p[1], "car", v); else each(o.x, o.z, "car", v); }
  if (B) for (const b of B) each(b.x, b.z, b.who, Math.hypot(b.vx, b.vz));
  return { d, why, a: a0, mv };
}
T.stopAhead = c => stopAhead(c, bodies());
// is the other lane empty from just behind to `look` m ahead (cars either way, you, a walker, anything parked)?
function laneClear(c, B, look) {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), sh = -TRAF.lane - (c.lane ?? TRAF.lane);
  const bad = (x, z) => { const dx = x - c.x, dz = z - c.z, a = dx * fx + dz * fz; return a > -8 && a < look && Math.abs(dz * fx - dx * fz - sh) < TRAF.laneW; };
  for (const o of T.cars) if (o !== c && o.on) { if (o.semi && o.pts) { if (o.pts.some(p => bad(p[0], p[1]))) return false; } else if (bad(o.x, o.z)) return false; }
  if (B) for (const b of B) if (bad(b.x, b.z)) return false;
  return true;
}

// ---- placing a car on the road
function setPose(c, dt) {
  const r = c.r, p = at(r, c.s, c.k); c.k = p.k;
  const want = r.street[p.k] ? 0 : (c.laneT ?? TRAF.lane), l0 = c.lane;
  c.lane = dt ? (c.pass ? c.lane + Math.max(-TRAF.laneRate * dt, Math.min(TRAF.laneRate * dt, want - c.lane)) : c.lane + (want - c.lane) * Math.min(1, dt * 0.8)) : want;
  c.lv = dt ? (c.lane - l0) / dt : 0;                                         // m/s to the right, for the heading
  const fx = p.tx * c.dir, fz = p.tz * c.dir;                                 // forward; the right is (-fz, fx)
  c.x = p.x - fz * c.lane; c.z = p.z + fx * c.lane;
  // heading from the line a little either side, so a bend doesn't snap it point to point; moving over, it angles in
  const q0 = at(r, c.s - 2.5 * c.dir, c.k), q1 = at(r, c.s + 2.5 * c.dir, c.k);
  c.yaw = Math.atan2(q1.x - q0.x, q1.z - q0.z) - Math.atan2(c.lv, Math.max(3, c.v || 0));
}
function ground(c) {
  const W = api.world, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), h = c.semi ? 2.2 : 1.4;
  const yf = W.surf(c.x + fx * h, c.z + fz * h), yb = W.surf(c.x - fx * h, c.z - fz * h);
  c.y = (yf + yb) / 2; c.pitch = -Math.atan2(yf - yb, 2 * h);
}
// ---- semis (3.5a): the trailer on the coupling
const SEMI = TRAF.semi;
function semiSetup(c, type) {
  const TY = window.TLXS.TYPES, ks = Object.keys(TY);
  c.semiK = TY[type] ? type : ks[Math.floor(Math.random() * ks.length)];
  const t = c.T = TY[c.semiK];
  c.fro = t.tr.front + 0.3 - 2.15;                                            // bumper ahead of a car's
  c.colCab = t.cabs[Math.floor(Math.random() * t.cabs.length)]; c.colTl = t.tl.cols[Math.floor(Math.random() * t.tl.cols.length)];
  c.yawP = c.yaw; c.steer = 0;
  // the trailer's axles on the lane behind the kingpin (so a lorry put on a bend starts on the road, not cutting across)
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), hx = c.x + fx * t.tr.fifth, hz = c.z + fz * t.tr.fifth;
  let ax = hx - fx * t.tl.L, az = hz - fz * t.tl.L;
  if (c.r) {
    const p = at(c.r, c.s + c.dir * (t.tr.fifth - t.tl.L), c.k), gx = p.tx * c.dir, gz = p.tz * c.dir, lx = p.x - gz * c.lane, lz = p.z + gx * c.lane;
    const d = Math.hypot(hx - lx, hz - lz); if (d > 1) { ax = hx - (hx - lx) / d * t.tl.L; az = hz - (hz - lz) / d * t.tl.L; }
  }
  c.ax = ax; c.az = az; semiTrail(c, 0);
}
function semiTrail(c, dt) {
  const t = c.T, L = t.tl.L, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), hx = c.x + fx * t.tr.fifth, hz = c.z + fz * t.tr.fifth;
  const dx = hx - c.ax, dz = hz - c.az, d = Math.hypot(dx, dz);
  if (!(d > 0.5) || Math.abs(d - L) > 6) { c.ax = hx - fx * L; c.az = hz - fz * L; }    // a jump (spawned elsewhere): straight behind
  else { c.ax = hx - dx / d * L; c.az = hz - dz / d * L; }                    // pulled toward the kingpin: the tractrix
  c.hx = hx; c.hz = hz; c.tyaw = Math.atan2(hx - c.ax, hz - c.az);
  let a = c.yaw - c.tyaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; c.art = a;
  const W = api.world, yh = W.surf(hx, hz), ya = W.surf(c.ax, c.az); c.ty = yh; c.tpitch = -Math.atan2(yh - ya, L);
  // the front wheels' angle from how fast it turns (Ackermann: tan(steer) = wheelbase x yaw rate / v), eased
  if (dt > 0) {
    let w = c.yaw - (c.yawP ?? c.yaw); while (w > Math.PI) w -= 2 * Math.PI; while (w < -Math.PI) w += 2 * Math.PI;
    const wb = t.tr.axles[0].z - (t.tr.axles.length > 2 ? (t.tr.axles[1].z + t.tr.axles[2].z) / 2 : t.tr.axles[1].z);
    const want = c.v > 0.5 ? Math.max(-0.6, Math.min(0.6, Math.atan(wb * (w / dt) / c.v))) : (c.steer || 0);
    c.steer = (c.steer || 0) + (want - (c.steer || 0)) * Math.min(1, dt * 4);
  }
  c.yawP = c.yaw;
  // what others see (tractor middle, trailer middle, and a "car" just ahead of the tail) and the solid circles
  const gx = Math.sin(c.tyaw), gz = Math.cos(c.tyaw), rear = -(L + t.tl.over);
  c.pts = [[c.x, c.z], [hx + gx * rear / 2, hz + gz * rear / 2], [hx + gx * (rear + 2.15), hz + gz * (rear + 2.15)]];
  const circ = [];
  for (let u = t.tr.end + 1.0; u <= t.tr.front - 0.9; u += 1.9) circ.push([c.x + fx * u, c.z + fz * u, SEMI.r]);
  circ.push([c.x + fx * (t.tr.front - 0.9), c.z + fz * (t.tr.front - 0.9), SEMI.r]);
  for (let u = t.tl.front - 1.2; u >= rear + 1.2; u -= 2.3) circ.push([hx + gx * u, hz + gz * u, SEMI.r]);
  circ.push([hx + gx * (rear + 1.2), hz + gz * (rear + 1.2), SEMI.r]);
  c.circ = circ;
}
// a semi that would turn round (road's end, a drift, held up) waits instead, and goes once you are far off
function turnOr(c, you) {
  if (!c.semi) { startTurn(c); return; }
  c.waiting = true;
  if (!T.hold && Math.hypot(c.x - you.x, c.z - you.z) > SEMI.gone) spawn(c, false);
}
T.semiInfo = i => { const c = T.cars[i]; if (!c || !c.semi) return null; return { i, on: c.on, type: c.semiK, x: c.x, z: c.z, yaw: c.yaw, hx: c.hx, hz: c.hz, ax: c.ax, az: c.az, tyaw: c.tyaw, art: c.art, L: c.T.tl.L, len: c.T.len, v: c.v, why: c.why, waiting: !!c.waiting, steer: c.steer, pts: c.pts, circ: c.circ }; };
function spawn(c, first) {
  const you = youPos(), [lo, hi] = first ? TRAF.spawn0 : TRAF.spawn, rs = T.routes;
  release(c); c.on = false; c.retry = 3; c.tried = {};
  if (!rs.length) return false;
  const tot = rs.reduce((a, r) => a + r.len, 0), seg = window.TLXR.ROADS.seg;
  for (let k = 0; k < 60; k++) {
    let u = Math.random() * tot, r = rs[0]; for (const q of rs) { if (u < q.len) { r = q; break; } u -= q.len; }
    const s = r.s0 + 30 + Math.random() * Math.max(1, r.len - 60), p = at(r, s, 0), d = Math.hypot(p.x - you.x, p.z - you.z);
    if (d < lo || d > hi || r.street[p.k]) continue;
    if (r.rt.seg.some(g => g.shut && s > g.a - 60 && s < g.a + seg + 60)) continue;
    if (T.cars.some(o => o !== c && o.on && Math.hypot(o.x - p.x, o.z - p.z) < TRAF.gapCars)) continue;
    Object.assign(c, { on: true, r, s, k: p.k, dir: Math.random() < 0.5 ? 1 : -1, v: 0, st: "drive", t: 0, blocked: 0, hold: 0, why: "", laneT: TRAF.lane, pass: null, lv: 0, waiting: false });
    c.lane = TRAF.lane; setPose(c, 0); c.v = Math.min(c.semi ? SEMI.vmax : TRAF.vmax, vProf(r, s, c.k, c.dir)) * 0.8; ground(c);
    if (c.semi) semiSetup(c);
    return true;
  }
  return false;
}
T.lanePt = (id, s, dir) => { const r = T.routes.find(q => q.id === id); if (!r) return null; const p = at(r, s, 0), d = dir < 0 ? -1 : 1, fx = p.tx * d, fz = p.tz * d; return { x: p.x - fz * TRAF.lane, z: p.z + fx * TRAF.lane, cx: p.x, cz: p.z, yaw: Math.atan2(fx, fz) }; };
T.place = (id, s, dir, i, type) => {                                      // i (default 0): which car; car 0 hides the rest; type: a semi's size
  const r = T.routes.find(q => q.id === id), c = T.cars[i | 0]; if (!r || !c) return null;
  T.hold = true; release(c);
  Object.assign(c, { on: true, r, s: Math.max(r.s0, Math.min(r.s1, s)), k: 0, dir: dir < 0 ? -1 : 1, v: 0, st: "drive", t: 0, blocked: 0, hold: 0, why: "", laneT: TRAF.lane, pass: null, lv: 0, waiting: false });
  c.lane = TRAF.lane; setPose(c, 0); ground(c);
  if (c.semi) semiSetup(c, type);
  if (!(i | 0)) for (const o of T.cars) if (o !== c) o.on = false;
  return c;
};

// ---- driving
function startTurn(c) {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), p = at(c.r, c.s, c.k);
  release(c);                                                                  // turning back: not going home after all
  c.st = "turn"; c.t = 0; c.v = 0;
  c.tu = { cx: p.x, cz: p.z, fx: p.tx * c.dir, fz: p.tz * c.dir, yaw0: c.yaw, fx0: fx, fz0: fz };
}
function turnStep(c, dt) {
  c.t += dt;
  const u0 = Math.min(1, c.t / TRAF.turnT), u = u0 * u0 * (3 - 2 * u0), U = c.tu, a = Math.PI * u;
  // across the road on a half ellipse: from the right lane, swinging forward, into the other lane facing back
  const lat = TRAF.lane * Math.cos(a), fwd = TRAF.bulge * Math.sin(a);       // lat: m to the right of the crown
  c.x = U.cx + U.fx * fwd - U.fz * lat; c.z = U.cz + U.fz * fwd + U.fx * lat;
  const dl = -Math.sin(a), df = Math.cos(a) * TRAF.bulge / TRAF.lane;         // the path's direction in (right, forward)
  const wx = U.fx * df - U.fz * dl, wz = U.fz * df + U.fx * dl;
  c.yaw = Math.atan2(wx, wz);
  if (u0 >= 1) { c.dir = -c.dir; c.st = "drive"; c.t = 0; c.blocked = 0; c.lane = c.laneT = TRAF.lane; c.pass = null; setPose(c, 0); }
}
function driveStep(c, dt, B, you) {
  const r = c.r; c.dtLast = dt;
  if (c.hold > 0) { c.hold -= dt; c.v = 0; return; }                         // just bumped: the driver sits a moment
  const sa = stopAhead(c, B); c.why = sa.why; c.ahead = sa.d;
  const prof = vProf(r, c.s, c.k, c.dir) * (c.semi ? SEMI.vk : 1), seg = window.TLXR.ROADS.seg;
  let vt = Math.min(prof, c.semi ? SEMI.vmax : 1e9, Math.sqrt(2 * TRAF.brake * Math.max(0, sa.d)));
  if (r.rt.seg.some(g => g.shut && c.s >= g.a && c.s < g.a + seg)) vt = Math.min(vt, 3);   // ploughing through a fresh drift
  if (c.pass) vt = Math.min(vt, Math.abs(c.lane - c.laneT) > 0.8 ? 1.5 : TRAF.passV);       // moving over at a crawl, past at a creep
  // braking: the profile's 3.2 m/s^2, or as hard as it takes to stand by the gap when something turns up close in
  // front of a car at speed (a walker stepping out 45 m ahead of a car at 12.5 m/s), up to 2.5x
  const need = c.v * c.v / (2 * Math.max(0.4, sa.d));
  const brk = vt < c.v ? Math.min(TRAF.brake * 2.5, Math.max(TRAF.brake, need * 1.15, sa.d < 12 ? TRAF.brake * 2 : 0)) : TRAF.brake;
  c.v += Math.max(-brk * dt, Math.min((c.semi ? SEMI.acc : TRAF.acc) * dt, vt - c.v));
  if (c.v < 0) c.v = 0;
  c.s += c.dir * c.v * dt;
  c.s = Math.max(r.s0, Math.min(r.s1, c.s));
  setPose(c, dt);
  passStep(c, sa, B);
  if (!c.semi) { homeCheck(c, r); if (c.st === "home") return; }               // off the road to a door (3.4b2b)
  if (sa.d < 0.6 && c.v < 0.3) {
    if (sa.why === "end") {
      // the end of the road: out of sight it drives on into the village (another car turns up elsewhere); in sight it turns
      if (!T.hold && Math.hypot(c.x - you.x, c.z - you.z) > 300) { spawn(c, false); return; }
      c.t += dt; if (c.t > TRAF.waitEnd && !c.pass) turnOr(c, you);
    } else if (sa.why === "shut") { c.t += dt; if (c.t > TRAF.waitShut && !c.pass) turnOr(c, you); }
    else { c.blocked += dt; if (c.blocked > TRAF.blockT && !c.pass) turnOr(c, you); }
  } else { c.t = 0; c.waiting = false; if (c.v > 1) c.blocked = 0; }
}
// pulling out round a thing standing in the lane, and back in once past it
function passStep(c, sa, B) {
  const r = c.r;
  if (!c.pass) {
    const stuck = sa.d < 0.6 && c.v < 0.3 && !sa.mv && sa.why !== "end" && sa.why !== "shut" && !r.street[c.k];
    c.pw = stuck ? (c.pw || 0) + (c.dtLast || 0) : 0;
    if (c.pw < TRAF.passWait) return;
    const tail = c.semi ? c.T.len - c.T.tr.front : 0;                          // a semi moves back in once its trailer is past
    const lim = stopAhead(c, null, 99);                                        // the road's own limits only (end, drift)
    if (lim.d < sa.a + TRAF.passBy + 12 + tail) return;                         // no room to get past and back in
    if (!laneClear(c, B, TRAF.passLook + tail)) return;                        // something coming or in the other lane
    c.pass = { st: "out", by: c.s + c.dir * (sa.a + TRAF.passBy + tail), who: sa.why }; c.laneT = -TRAF.lane; c.pw = 0; T.passes = (T.passes || 0) + 1;
    return;
  }
  const P = c.pass;
  if (P.st === "out") {
    if (sa.d < 0.6 && c.v < 0.3 && sa.why !== "end" && sa.why !== "shut") { P.held = (P.held || 0) + (c.dtLast || 0); if (P.held > 6) { P.st = "back"; c.laneT = TRAF.lane; } return; }
    P.held = 0;
    if ((c.s - P.by) * c.dir < 0) return;                                      // not past it yet
    const back = stopAhead(c, B, TRAF.lane - c.lane);                           // the own lane ahead must be clear to move back in
    if (back.why !== "end" && back.why !== "shut" && back.a > 0 && back.a < TRAF.gap + TRAF.passBy) { P.by = c.s + c.dir * (back.a + TRAF.passBy); return; }
    P.st = "back"; c.laneT = TRAF.lane;
  } else if (Math.abs(c.lane - c.laneT) < 0.02) { c.lane = c.laneT; c.pass = null; c.blocked = 0; }
}
T.startTurn = c => startTurn(c || T.cars[0]);

// ---- going home (3.4b2b): a car now and then drives a village street to a door and parks there, as one of 3.3a's cars.
// At boot about TRAF.home.share of the parked cars (those a car can reach: a clear street leg from the route's street to
// in front of the spot) are out, their spots empty (TLXC.setAway). A car on the road into the village, at the road's end
// or on a street hop through it, may take one: it leaves the road along the route's street, follows the lane the plow
// keeps to the door (W.laneRoute, the same one 3.1's streets() plowed) and noses in where the parked car stood, at
// street speed and slower round the corners; then the traffic car is gone and the parked one is back, in its colour.
// Now and then (TRAF.home.every) a car for an empty spot near you is put on the road out of sight, already bound there.
const HOME = TRAF.home;
function chaikin(p, n) {
  for (let it = 0; it < n; it++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
    q.push(p[p.length - 1]); p = q;
  }
  return p;
}
function homesPrep() {
  const C = window.TLXC, W = api.world, out = [];
  if (!C || !C.ready || !W.laneRoute) return out;
  for (const pc of C.cars) {
    const fx = Math.sin(pc.yaw), fz = Math.cos(pc.yaw), Ax = pc.x - fx * 5.5 * pc.sx, Az = pc.z - fz * 5.5 * pc.sx;
    // the route street points nearest in front of the spot, a few of them (the nearest may make a corner too tight)
    const cand = [];
    for (const r of T.routes) for (let j = 0; j < r.pts.length; j++) {
      if (!r.street[j]) continue;
      const d = Math.hypot(r.pts[j][0] - Ax, r.pts[j][1] - Az); if (d < HOME.reach) cand.push({ r, j, d });
    }
    cand.sort((a, b) => a.d - b.d);
    let tries = 0;
    for (const { r, j } of cand) {
      if (tries >= 4) break;
      if (out.length && out[out.length - 1].ci === pc.i) break;
      tries++;
      const s = r.pts[j], lane = W.laneRoute(s[0], s[1], Ax, Az);
      const tail = [[s[0], s[1]]]; for (const q of lane.slice(1)) tail.push([q[0], q[1]]);
      tail.push([pc.x, pc.z]);
      let len = 0, ok = true;
      for (let i = 1; i < tail.length && ok; i++) {
        const a = tail[i - 1], b = tail[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); len += L;
        for (let u = 0; u <= L; u += 0.5) { const x = a[0] + (b[0] - a[0]) * u / L, z = a[1] + (b[1] - a[1]) * u / L; if (W.isSea(x, z) || W.isWater(x, z)) { ok = false; break; } }
      }
      if (!ok || len > HOME.reach * 1.8) continue;
      const h = { i: out.length, ci: pc.i, r, j, tail, len, side: j > r.i1 ? 1 : j < r.i0 ? -1 : 0, taken: -1, x: pc.x, z: pc.z };
      // the whole drive as the car's three circles (radius 0.95, the body's half width 0.88) must miss every house,
      // shed, tree and other parked car: from the road's end, or both ways along a street hop
      h.clr = Math.min(...(h.side ? [h.side] : [1, -1]).map(d => sweep(pathOf(h, d), pc.i)));
      if (h.clr < HOME.sweep) continue;
      out.push(h);
    }
  }
  return out;
}
// the path a car would drive to home h coming dir along the route: from the road's end (or 25 m up a street hop)
function pathOf(h, dir) {
  const r = h.r, s = h.side > 0 ? r.s1 - 8 : h.side < 0 ? r.s0 + 8 : r.cum[h.j] - dir * 25;
  const f = { i: -1, r, dir, s, k: idxAt(r, s, 0), v: TRAF.vst, lane: TRAF.lane, laneT: TRAF.lane, col: 0, sx: 1, sy: 1 };
  f.lane = r.street[f.k] ? 0 : TRAF.lane; setPose(f, 0);
  const tk = h.taken, hn = T.homing; startHome(f, h); h.taken = tk; T.homing = hn;
  return f.H.pts;
}
// the least clearance (m, circle edge to obstacle edge) of the car's three circles driven along p, its own spot excepted
function sweep(p, ci) {
  const W = api.world, cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const L = cum[cum.length - 1];
  let k = 0;
  const pt = s => { while (k > 0 && cum[k] > s) k--; while (k < p.length - 2 && cum[k + 1] <= s) k++; const t = (s - cum[k]) / ((cum[k + 1] - cum[k]) || 1); return [p[k][0] + (p[k + 1][0] - p[k][0]) * t, p[k][1] + (p[k + 1][1] - p[k][1]) * t]; };
  let m = 1e9;
  for (let s = 6; s <= L; s += 0.5) {
    const a = pt(Math.max(0, s - 1.6)), b = pt(Math.min(L, s + 1.6)), c = pt(s), yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
    for (const u of [-1.45, 0, 1.45]) {
      const x = c[0] + Math.sin(yaw) * u, z = c[1] + Math.cos(yaw) * u;
      for (const o of W.obstaclesNear(x, z, 5)) { if (o.top < -1e8 || o.car === ci) continue; const d = Math.hypot(o.x - x, o.z - z) - (o.r || 0.5) - TRAF.r; if (d < m) m = d; }
    }
  }
  return m;
}
const homeFree = h => { const pc = window.TLXC.cars[h.ci]; return !!(pc && pc.away) && h.taken < 0; };
function release(c) { if (c.homeI != null) { const h = T.homes[c.homeI]; if (h && h.taken === c.i) h.taken = -1; } c.homeI = null; c.H = null; c.col = c.col0 ?? c.col; c.sx = c.sx0 ?? c.sx; c.sy = c.sy0 ?? c.sy; }
// the path from where the car is: along the route to the street point, then the lane to the door
function startHome(c, h) {
  const r = c.r, P = [[c.x, c.z]], push = q => { const l = P[P.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) > 1.5) P.push([q[0], q[1]]); };
  if (c.dir > 0) for (let i = c.k + 1; i <= h.j; i++) push(r.pts[i]);
  else for (let i = c.k; i >= h.j; i--) push(r.pts[i]);
  for (let i = 1; i < h.tail.length - 1; i++) push(h.tail[i]);
  const last = h.tail[h.tail.length - 1];
  P.push([last[0], last[1]]);
  // round the corners, keeping the nose-in leg straight: smooth all but the last leg, then add it back
  let pts = chaikin(P.slice(0, -1), 3); pts.push([last[0], last[1]]);
  const n = pts.length, cum = new Float32Array(n), v = new Float32Array(n);
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 2)], b = pts[i], q = pts[Math.min(n - 1, i + 2)];
    const ab = Math.hypot(b[0] - a[0], b[1] - a[1]), bc = Math.hypot(q[0] - b[0], q[1] - b[1]), ca = Math.hypot(q[0] - a[0], q[1] - a[1]);
    const cr = Math.abs((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])), R = cr < 1e-6 ? 1e9 : ab * bc * ca / (2 * cr);
    v[i] = Math.max(1.6, Math.min(i < 3 ? Math.max(TRAF.vst, c.v) : TRAF.vst, Math.sqrt(TRAF.ay * R)));
  }
  v[n - 1] = 0;
  for (let i = n - 2; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * HOME.dec * (cum[i + 1] - cum[i])));
  const pc = window.TLXC.cars[h.ci];
  c.col0 = c.col0 ?? c.col; c.sx0 = c.sx0 ?? c.sx; c.sy0 = c.sy0 ?? c.sy;
  c.col = pc.col; c.sx = pc.sx; c.sy = pc.sy;                                 // it's that owner's car
  c.H = { pts, cum, v, L: cum[n - 1], k: 0 }; c.hs = 0; c.st = "home"; c.homeI = h.i; h.taken = c.i; c.blocked = 0; c.pass = null; c.lane = 0;
  c.why = "home"; T.homing = (T.homing || 0) + 1;
}
function hAt(H, s) {
  let k = H.k; const c = H.cum, n = c.length;
  while (k > 0 && c[k] > s) k--; while (k < n - 2 && c[k + 1] <= s) k++; H.k = k;
  const a = H.pts[k], b = H.pts[k + 1], L = (c[k + 1] - c[k]) || 1, t = Math.max(0, Math.min(1, (s - c[k]) / L));
  return { k, x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, v: H.v[k] + (H.v[k + 1] - H.v[k]) * t };
}
function homeAhead(c, B) {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), left = c.H.L - c.hs;
  let d = 1e9, why = "";
  const each = (x, z, who) => { const dx = x - c.x, dz = z - c.z, a = dx * fx + dz * fz; if (a <= 0 || a > HOME.look || a > left + 3.2) return; if (Math.abs(dz * fx - dx * fz) > 1.9) return; const dd = a - HOME.gap; if (dd < d) { d = dd; why = who; } };
  for (const o of T.cars) if (o !== c && o.on) each(o.x, o.z, "car");
  for (const b of B) each(b.x, b.z, b.who);
  return { d, why };
}
function homeStep(c, dt, B, you) {
  const H = c.H; c.dtLast = dt;
  if (c.hold > 0) { c.hold -= dt; c.v = 0; return; }
  const sa = homeAhead(c, B); c.ahead = sa.d; c.why = sa.why || "home";
  const p0 = hAt(H, c.hs);
  const vt = Math.min(p0.v, Math.sqrt(2 * TRAF.brake * Math.max(0, sa.d)), Math.sqrt(2 * HOME.dec * Math.max(0, H.L - c.hs)) + 0.3);
  const brk = vt < c.v ? Math.min(TRAF.brake * 2.5, Math.max(TRAF.brake, c.v * c.v / (2 * Math.max(0.4, sa.d)) * 1.15)) : TRAF.brake;
  c.v += Math.max(-brk * dt, Math.min(TRAF.acc * dt, vt - c.v)); if (c.v < 0) c.v = 0;
  c.hs = Math.min(H.L, c.hs + c.v * dt);
  const p = hAt(H, c.hs), q0 = hAt(H, Math.max(0, c.hs - 1.6)), q1 = hAt(H, Math.min(H.L, c.hs + 1.6)); H.k = p.k;
  c.x = p.x; c.z = p.z;
  if (Math.hypot(q1.x - q0.x, q1.z - q0.z) > 0.05) c.yaw = Math.atan2(q1.x - q0.x, q1.z - q0.z);
  if (c.hs >= H.L - 0.03) { arrive(c); return; }
  if (sa.d < 0.6 && c.v < 0.3) {
    c.blocked += dt;
    if (c.blocked > HOME.give && Math.hypot(c.x - you.x, c.z - you.z) > 120) {
      const h = T.homes[c.homeI], spotTaken = B.some(b => Math.hypot(b.x - h.x, b.z - h.z) < 3.2);
      if (spotTaken) { release(c); spawn(c, false); } else arrive(c);
    }
  } else if (c.v > 0.5) c.blocked = 0;
}
function arrive(c) {
  const h = T.homes[c.homeI];
  if (h) window.TLXC.setAway(h.ci, false);
  T.homesDone = (T.homesDone || 0) + 1; T.lastHome = h ? { ci: h.ci, home: h.i, car: c.i, x: c.x, z: c.z, yaw: c.yaw } : null;
  release(c); c.on = false; c.st = "drive"; c.retry = 20; c.v = 0;
}
// a car at the road's end, or on a street hop, may take a free spot it's passing (or the one it was sent to)
function homeCheck(c, r) {
  if (c.pass || !T.homes.length) return;
  const toEnd = c.dir > 0 ? r.s1 - c.s : c.s - r.s0, slow = c.v <= TRAF.vst + 0.5 || toEnd < 12;   // eased down to street speed at the road's end first
  if (c.homeI != null) {
    const h = T.homes[c.homeI];
    if (!h || h.r !== r || !homeFree2(h, c)) { release(c); return; }
    const ahead = (r.cum[h.j] - c.s) * c.dir;
    if ((h.side === c.dir && toEnd < 40 && slow) || (h.side === 0 && ahead > 0 && ahead < 30)) startHome(c, h);
    return;
  }
  c.tried = c.tried || {};
  for (const h of T.homes) {
    if (h.r !== r || c.tried[h.i] || !homeFree(h)) continue;
    const ahead = (r.cum[h.j] - c.s) * c.dir;
    const near = (h.side === c.dir && toEnd < 40 && slow) || (h.side === 0 && r.street[c.k] && ahead > 8 && ahead < 30);
    if (!near) continue;
    c.tried[h.i] = 1;
    if (Math.random() < HOME.P) { startHome(c, h); return; }
  }
}
const homeFree2 = (h, c) => { const pc = window.TLXC.cars[h.ci]; return !!(pc && pc.away) && (h.taken < 0 || h.taken === c.i); };
// now and then: a car bound for an empty spot near you turns up on the road in, out of sight
function sendHome(h, D, c) {
  const r = h.r, dir = h.side !== 0 ? h.side : (Math.random() < 0.5 ? 1 : -1);
  let s = h.side > 0 ? r.s1 - D : h.side < 0 ? r.s0 + D : r.cum[h.j] - dir * D;
  s = Math.max(r.s0 + 5, Math.min(r.s1 - 5, s));
  release(c);
  Object.assign(c, { on: true, r, s, k: 0, dir, v: 0, st: "drive", t: 0, blocked: 0, hold: 0, why: "", laneT: TRAF.lane, pass: null, lv: 0, tried: {} });
  c.k = idxAt(r, s, 0); c.lane = r.street[c.k] ? 0 : TRAF.lane; setPose(c, 0); ground(c);
  c.v = Math.min(TRAF.vmax, vProf(r, s, c.k, dir)) * 0.8;
  c.homeI = h.i; h.taken = c.i;
  return c;
}
function homeTick(dt, you) {
  if (T.hold || !T.homes.length) return;
  T.homeT = (T.homeT ?? HOME.every[0] * 0.5) - dt;
  if (T.homeT > 0) return;
  T.homeT = HOME.every[0] + Math.random() * (HOME.every[1] - HOME.every[0]);
  const free = T.homes.filter(h => homeFree(h) && Math.hypot(h.x - you.x, h.z - you.z) < HOME.near);
  if (!free.length) return;
  const h = free[Math.floor(Math.random() * free.length)], seg = window.TLXR.ROADS.seg;
  const cand = T.cars.filter(c => !c.semi && (!c.on || (c.st === "drive" && c.homeI == null && Math.hypot(c.x - you.x, c.z - you.z) > 500))).sort((a, b) => (a.on - b.on));
  const c = cand[0]; if (!c) return;
  for (let k = 0; k < 6; k++) {
    const D = HOME.from[0] + Math.random() * (HOME.from[1] - HOME.from[0]), r = h.r, dir = h.side !== 0 ? h.side : 1;
    const s = Math.max(r.s0 + 5, Math.min(r.s1 - 5, h.side > 0 ? r.s1 - D : h.side < 0 ? r.s0 + D : r.cum[h.j] - dir * D)), p = at(r, s, 0);
    if (Math.hypot(p.x - you.x, p.z - you.z) < 160) continue;
    const lo = Math.min(s, r.cum[h.j]), hi = Math.max(s, r.cum[h.j]);
    if (r.rt.seg.some(g => g.shut && g.a + seg > lo && g.a < hi)) return;      // the road in is drifted shut: nobody comes
    if (T.cars.some(o => o !== c && o.on && Math.hypot(o.x - p.x, o.z - p.z) < 40)) continue;
    sendHome(h, D, c); T.sent = (T.sent || 0) + 1; return;
  }
}
T.sendHome = (hi, D, i) => { const h = T.homes[hi], c = T.cars[i | 0]; if (!h || !c) return null; T.hold = true; if (!(i | 0)) for (const o of T.cars) if (o !== c) { release(o); o.on = false; } return sendHome(h, D || 200, c); };
T.homeTick = (dt, you) => homeTick(dt, you || youPos());
T.homePath = (hi, dir) => { const h = T.homes[hi]; return h ? pathOf(h, h.side || dir || 1) : null; };   // for tests: changes nothing

// ---- solid: the body you drive and the walker against every car
function collide(c, dt) {
  const P = api.P, F = api.FOOT, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const cvx = c.st === "drive" ? fx * c.v : 0, cvz = c.st === "drive" ? fz * c.v : 0;
  const circ = c.semi && c.circ ? c.circ : [-TRAF.off, 0, TRAF.off].map(u => [c.x + fx * u, c.z + fz * u, TRAF.r]);
  if (F.on) {
    for (const [x, z, cr] of circ) {
      const dx = F.x - x, dz = F.z - z, d = Math.hypot(dx, dz), rr = cr + 0.36;
      if (d < rr && d > 1e-6) { F.x = x + dx / d * rr; F.z = z + dz / d * rr; if (c.v > 1.5) { c.v = 0; c.hold = Math.max(c.hold, 2); } }
    }
    return;
  }
  if (P.y > c.y + (c.semi ? 4.2 : 1.5)) return;                              // over the roof
  const pf = [Math.sin(P.yaw), Math.cos(P.yaw)], veh = api.veh && api.veh.cur;
  const mine = veh ? [[1.6, 1.0], [0, 1.0], [-1.6, 1.0]] : [[1.15, 0.62], [-0.7, 0.7]];
  for (const [off, pr] of mine) for (const [x, z, cr] of circ) {
    const px = P.x + pf[0] * off, pz = P.z + pf[1] * off, dx = px - x, dz = pz - z, d = Math.hypot(dx, dz), rr = cr + pr;
    if (d >= rr || d < 1e-6) continue;
    const nx = dx / d, nz = dz / d, pen = rr - d;
    P.x += nx * (pen + 0.02); P.z += nz * (pen + 0.02);
    const vn = (P.vx - cvx) * nx + (P.vz - cvz) * nz;
    if (vn < 0) {
      const hit = -vn;
      P.vx -= 1.45 * vn * nx; P.vz -= 1.45 * vn * nz;
      if (hit > 2) { if (api.thud) api.thud(Math.min(1, hit / 20)); P.shake = Math.max(P.shake || 0, Math.min(1, hit / 14)); }
      if (hit > 4) { api.cargoHit(hit); if (!c.bumpT || api.now() - c.bumpT > 6) { c.bumpT = api.now(); T.hits++; api.toast(c.semi ? (hit > 9 ? "Crunch: straight into a lorry. The driver climbs down to look and shakes their head." : "Bump: into a lorry. The driver leans out and waves you off, not amused.") : (hit > 9 ? "Crunch: straight into a car. The driver gets out to look at the dent and shakes their head." : "Bump: into a car. The driver waves you on, not amused."), "warn"); } }
      c.v = 0; c.hold = Math.max(c.hold, 3);
    }
  }
}

// ---- the meshes
function build(a) {
  const TT = a.THREE, G = window.TLXC && window.TLXC.geo;
  if (!G) throw new Error("no car shapes (tlx-cars.js)");
  const n = T.cars.length, low = a.GFX && a.GFX.low;
  T.lampMat = new TT.MeshBasicMaterial({ vertexColors: true });
  M = {
    paint: new TT.InstancedMesh(G.paint, a.mesh.std(0xffffff, 0.45, 0.35), n),
    glass: new TT.InstancedMesh(G.glass, a.mesh.std(0x1a2129, 0.15, 0.6), n),
    dark: new TT.InstancedMesh(G.trim || G.dark, a.mesh.std(0x16181b, 0.85, 0.05), n),
    lamps: new TT.InstancedMesh(G.lamps, T.lampMat, n)
  };
  const grp = T.group = new TT.Group(); grp.name = "traffic";
  const col = new TT.Color();
  T.cars.forEach((c, i) => { col.setHex(c.col); M.paint.setColorAt(i, col); });
  for (const k in M) { const o = M[k]; o.frustumCulled = false; o.castShadow = !low && k !== "lamps"; o.receiveShadow = true; o.name = "traffic_" + k; o.count = 0; grp.add(o); }
  if (M.paint.instanceColor) M.paint.instanceColor.needsUpdate = true;
  a.scene.add(grp);
  // the wheels on their own (4 per car), so they turn as the car rolls: one more draw call
  T.wheels = new TT.InstancedMesh(G.wheel, new TT.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.1 }), n * 4);
  T.wheels.frustumCulled = false; T.wheels.castShadow = !low; T.wheels.receiveShadow = true; T.wheels.name = "traffic_wheels"; T.wheels.count = 0; grp.add(T.wheels);
  // semis (3.5a): each lorry's two groups are built on first use per size (tlx-semis.js); their wheels are one more
  // instanced mesh (up to 6 axles x 2 a lorry; a twin-tyre pair is one wide wheel)
  const ns = T.cars.filter(c => c.semi).length;
  T.swheels = new TT.InstancedMesh(G.wheel, T.wheels.material, Math.max(1, ns * 12));
  T.swheels.frustumCulled = false; T.swheels.castShadow = !low; T.swheels.receiveShadow = true; T.swheels.name = "traffic_semi_wheels"; T.swheels.count = 0; grp.add(T.swheels);
  T.low = low;
  // the headlight beams (3.4b2a): additive, no depth write, no fog (faded by distance in draw()), drawn after the snow
  T.beams = new TT.InstancedMesh(beamGeo(TT), new TT.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: TT.AdditiveBlending, depthWrite: false, fog: false, side: TT.FrontSide }), n);
  T.beams.setColorAt(n - 1, col.setScalar(0));   // before count = 0: setColorAt sizes the colour buffer by count
  T.beams.frustumCulled = false; T.beams.castShadow = T.beams.receiveShadow = false; T.beams.name = "traffic_beams"; T.beams.count = 0; T.beams.renderOrder = 3; T.beams.visible = false;
  grp.add(T.beams);
  T.pool = poolBuild(TT, n); grp.add(T.pool);
  T.q = { m: new TT.Matrix4(), q: new TT.Quaternion(), e: new TT.Euler(0, 0, 0, "YXZ"), p: new TT.Vector3(), s: new TT.Vector3(), col, w: new TT.Matrix4(), wr: new TT.Matrix4() };
}
function draw() {
  const { m, q, e, p, s, col, w, wr } = T.q;
  let j = 0;
  for (const c of T.cars) {
    if (!c.on || c.semi) continue;
    e.set(c.pitch || 0, c.yaw, 0); q.setFromEuler(e); p.set(c.x, c.y - 0.04, c.z); s.set(1, c.sy, c.sx); m.compose(p, q, s);
    for (const k in M) M[k].setMatrixAt(j, m);
    col.setHex(c.col); M.paint.setColorAt(j, col);
    wr.makeRotationX(c.roll || 0);
    for (let i = 0; i < 4; i++) { const W = TRAF.wheels[i]; w.makeTranslation(W[0], TRAF.wheelR, W[1]).multiply(wr).premultiply(m); T.wheels.setMatrixAt(j * 4 + i, w); }
    j++;
  }
  for (const k in M) { M[k].count = j; M[k].instanceMatrix.needsUpdate = true; }
  T.wheels.count = j * 4; T.wheels.instanceMatrix.needsUpdate = true;
  if (M.paint.instanceColor) M.paint.instanceColor.needsUpdate = true;
  drawSemis();
  const night = 1 - (api.dayFactor ? api.dayFactor() : 1);
  T.lampMat.color.setScalar(0.55 + 1.6 * night);
  // the beams (3.4b2a): each car's brightness = how dark it is x how close to the camera (additive light glows through
  // fog, so it fades out by TRAF.beamFar instead), 0 by day
  const B = T.beams; if (!B) return;
  const cam = api.camera, bk = Math.max(0, Math.min(1, (night - 0.25) / 0.45));
  T.beamK = [];
  let jb = 0;
  for (const c of T.cars) {
    if (!c.on) continue;
    const d = cam ? Math.hypot(c.x - cam.position.x, c.z - cam.position.z) : 0;
    const k = bk * Math.max(0, Math.min(1, (TRAF.beamFar[1] - d) / (TRAF.beamFar[1] - TRAF.beamFar[0])));
    T.beamK.push(+k.toFixed(3));
    // the car's own frame (a semi's: its tractor, the cones moved out to its bumper)
    e.set(c.pitch || 0, c.yaw, 0); q.setFromEuler(e); p.set(c.x, c.y - 0.04, c.z); s.set(1, c.semi ? 1 : c.sy, c.semi ? 1 : c.sx); m.compose(p, q, s);
    if (c.semi) m.multiply(w.makeTranslation(0, 0.02, c.fro));
    B.setMatrixAt(jb, m); col.setScalar(k * TRAF.beamI); B.setColorAt(jb, col);
    if (bk > 0) poolDraw(c, jb, k);
    jb++;
  }
  B.count = bk > 0 ? jb : 0; B.visible = bk > 0; B.instanceMatrix.needsUpdate = true; if (B.instanceColor) B.instanceColor.needsUpdate = true;
  const PG = T.pool.geometry; T.pool.visible = bk > 0;
  if (bk > 0) { PG.setDrawRange(0, jb * (POOL.nx - 1) * (POOL.nz - 1) * 6); PG.attributes.position.needsUpdate = true; PG.attributes.color.needsUpdate = true; }
}
// the semis (3.5a): place the tractor and trailer groups, and their wheels (rolled, the steer axle turned)
function semiMeshes(c) {
  c.ms = c.ms || {};
  if (!c.ms[c.semiK]) {
    const o = c.ms[c.semiK] = window.TLXS.make(api.THREE, api.mesh.std, T.lampMat, c.semiK, T.low);
    for (const g of [o.tractor, o.trailer]) { g.matrixAutoUpdate = false; g.visible = false; T.group.add(g); }
  }
  for (const k in c.ms) if (k !== c.semiK) c.ms[k].tractor.visible = c.ms[k].trailer.visible = false;
  return c.ms[c.semiK];
}
function drawSemis() {
  const { m, q, e, p, w, wr } = T.q, sv = T.q.sv || (T.q.sv = new api.THREE.Vector3()), mt = T.q.mt || (T.q.mt = new api.THREE.Matrix4()), ws = T.q.ws || (T.q.ws = new api.THREE.Matrix4());
  let j = 0;
  for (const c of T.cars) {
    if (!c.semi) continue;
    if (!c.on || c.hx == null) { if (c.ms) for (const k in c.ms) c.ms[k].tractor.visible = c.ms[k].trailer.visible = false; continue; }
    const o = semiMeshes(c), t = c.T, R = t.wheelR, roll = (c.roll || 0) * TRAF.wheelR / R;
    o.paint[0].color.setHex(c.colCab); o.paint[1].color.setHex(c.colTl);
    e.set(c.pitch || 0, c.yaw, 0); q.setFromEuler(e); p.set(c.x, c.y - 0.04, c.z); sv.set(1, 1, 1); mt.compose(p, q, sv);
    o.tractor.matrix.copy(mt); o.tractor.matrixWorldNeedsUpdate = true; o.tractor.visible = true;
    e.set(c.tpitch || 0, c.tyaw, 0); q.setFromEuler(e); p.set(c.hx, c.ty - 0.04, c.hz); m.compose(p, q, sv);
    o.trailer.matrix.copy(m); o.trailer.matrixWorldNeedsUpdate = true; o.trailer.visible = true;
    wr.makeRotationX(roll);
    const wheel = (base, x, z, wid, steer) => {
      ws.makeScale(wid / 0.24, R / 0.33, R / 0.33);
      w.makeTranslation(x, R, z); if (steer) w.multiply(T.q.st.makeRotationY(steer)); w.multiply(wr).multiply(ws).premultiply(base);
      T.swheels.setMatrixAt(j++, w);
    };
    T.q.st = T.q.st || new api.THREE.Matrix4();
    for (const a of t.tr.axles) for (const sd of [-1, 1]) wheel(mt, sd * (a.steer ? 1.04 : 0.93), a.z, a.steer ? 0.32 : 0.62, a.steer ? c.steer || 0 : 0);
    for (const a of t.tl.axles) for (const sd of [-1, 1]) wheel(m, sd * 0.93, -t.tl.L + a, 0.62, 0);
  }
  T.swheels.count = j; T.swheels.instanceMatrix.needsUpdate = true;
}

// ---- the beams (3.4b2a): two soft cones from the headlamps, one additive
// instanced mesh (one draw call, nothing lit by it: the game's lights stay the sled's own). Vertex colours carry the
// fall-off, so the geometry is drawn black at its far ends and blends into the night without a hard edge.
function beamGeo(TT) {
  const L = (window.TLXC && TLXC.CARS ? TLXC.CARS.len : 4.3) / 2, pos = [], colr = [], idx = [];
  const add = (g, fade) => {
    const p = g.attributes.position, base = pos.length / 3, ix = g.index;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); pos.push(x, y, z); const k = fade(x, y, z); colr.push(k, k * 0.95, k * 0.82); }
    for (let i = 0; i < ix.count; i++) idx.push(base + ix.getX(i));
  };
  const H = TRAF.beamLen;
  for (const sx of [1, -1]) {
    const g = new TT.CylinderGeometry(0.07, 1.9, H, 14, 8, true).rotateX(-Math.PI / 2).translate(0, 0, H / 2);
    g.scale(1, 0.5, 1); g.rotateX(0.045); g.translate(0.62 * sx, 0.78, L + 0.04);
    add(g, (x, y, z) => { const t = Math.max(0, Math.min(1, (z - L) / H)); return 0.24 * Math.min(1, t / 0.15) * Math.pow(1 - t, 1.8);   /* faint at the lamp, a haze a few m out */ });
  }
  const g = new TT.BufferGeometry();
  g.setAttribute("position", new TT.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new TT.Float32BufferAttribute(colr, 3)); g.setIndex(idx);
  return g;
}
// the pool of light on the snow ahead of each car: one mesh for all the cars, a POOL.nx x POOL.nz grid per car laid on
// the snow (surf) every frame at night, so it follows a rise or a dip in the road instead of sinking into it. Its
// vertex colours are the fall-off (brightest 5-11 m out, gone at the edges) times that car's beam brightness.
const POOL = { nx: 11, nz: 15, w: 5.2, z0: 1.2, len: 19, lift: 0.12, I: 0.3 };
function poolBuild(TT, n) {
  const per = POOL.nx * POOL.nz, pos = new Float32Array(n * per * 3), colr = new Float32Array(n * per * 3), idx = [], fall = new Float32Array(per);
  for (let j = 0; j < POOL.nz; j++) for (let i = 0; i < POOL.nx; i++) {
    const t = j / (POOL.nz - 1), x = (i / (POOL.nx - 1) - 0.5) * POOL.w;
    const a = Math.sin(Math.PI * Math.pow(t, 0.7)), s = Math.max(0, 1 - Math.pow(Math.abs(x) / (1.1 + 1.5 * t), 2));
    fall[j * POOL.nx + i] = a * s;
  }
  for (let c = 0; c < n; c++) for (let j = 0; j < POOL.nz - 1; j++) for (let i = 0; i < POOL.nx - 1; i++) {
    const a = c * per + j * POOL.nx + i, b = a + 1, d = a + POOL.nx, e = d + 1; idx.push(a, d, b, b, d, e);
  }
  const g = new TT.BufferGeometry();
  g.setAttribute("position", new TT.BufferAttribute(pos, 3)); g.setAttribute("color", new TT.BufferAttribute(colr, 3)); g.setIndex(idx);
  g.attributes.position.setUsage(TT.DynamicDrawUsage); g.attributes.color.setUsage(TT.DynamicDrawUsage);
  const mesh = new TT.Mesh(g, new TT.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: TT.AdditiveBlending, depthWrite: false, fog: false, side: TT.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  mesh.frustumCulled = false; mesh.name = "traffic_pool"; mesh.renderOrder = 3; mesh.visible = false; mesh.userData.fall = fall;
  return mesh;
}
function poolDraw(c, slot, k) {
  const g = T.pool.geometry, P = g.attributes.position.array, C = g.attributes.color.array, fall = T.pool.userData.fall, per = POOL.nx * POOL.nz;
  const L = (window.TLXC && TLXC.CARS ? TLXC.CARS.len : 4.3) / 2 * (c.semi ? 1 : c.sx || 1) + (c.fro || 0), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx, surf = api.world.surf;
  for (let j = 0; j < POOL.nz; j++) for (let i = 0; i < POOL.nx; i++) {
    const v = j * POOL.nx + i, o = (slot * per + v) * 3, along = L + POOL.z0 + (j / (POOL.nz - 1)) * POOL.len, side = (i / (POOL.nx - 1) - 0.5) * POOL.w;
    const x = c.x + fx * along + rx * side, z = c.z + fz * along + rz * side;
    P[o] = x; P[o + 1] = k > 0 ? surf(x, z) + POOL.lift : c.y - 50; P[o + 2] = z;
    const b = fall[v] * k * POOL.I; C[o] = b; C[o + 1] = b * 0.95; C[o + 2] = b * 0.82;
  }
}

// ---- the hum (3.4b2a): the nearest car you can hear, one voice on the game's own audio (so mute and volume apply):
// a low engine note rising with its speed and the crunch of tyres on packed snow, louder as it nears, muffled indoors.
// Built on first need (the audio context only exists after a key or tap). A watchdog fades it if the game stops ticking.
function humVoice() {
  const au = api.audio && api.audio(); if (!au) return null;
  if (T.hum && T.hum.au === au) return T.hum;
  const AC = au.AC, o = AC.createOscillator(), o2 = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
  o.type = "sawtooth"; o2.type = "triangle"; lp.type = "lowpass"; lp.frequency.value = 240; lp.Q.value = 1.2; g.gain.value = 0;
  o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(au.master); o.start(); o2.start();
  const s = AC.createBufferSource(), b = AC.createBiquadFilter(), tg = AC.createGain(); s.buffer = au.buf; s.loop = true;
  b.type = "bandpass"; b.frequency.value = 650; b.Q.value = 0.9; tg.gain.value = 0; s.connect(b); b.connect(tg); tg.connect(au.master); s.start(0, Math.random());
  T.hum = { au, o, o2, lp, g, tg, last: performance.now(), gain: 0, f: 0 };
  setInterval(() => { const h = T.hum; if (h && performance.now() - h.last > 300 && h.gain > 0) { const t = h.au.AC.currentTime; h.g.gain.setTargetAtTime(0, t, 0.1); h.tg.gain.setTargetAtTime(0, t, 0.1); h.gain = 0; } }, 250);
  return T.hum;
}
function humTick(you) {
  let best = null, bg = 0;
  for (const c of T.cars) {
    if (!c.on) continue;
    const d = Math.hypot(c.x - you.x, c.z - you.z); if (d > TRAF.humR) continue;
    const near = Math.pow(1 - d / TRAF.humR, 2), g = near * (0.45 + 0.55 * Math.min(1, Math.abs(c.v) / TRAF.vmax)) * (c.semi ? 1.5 : 1);
    if (g > bg) { bg = g; best = c; }
  }
  // a lorry's diesel sits lower and turns slower than a car's petrol engine
  const inside = api.INT && api.INT.on ? 0.25 : 1, gain = TRAF.humG * Math.min(1.3, bg) * inside, f = best ? (best.semi ? 24 + Math.abs(best.v) * 2.6 : 32 + Math.abs(best.v) * 4.4) : 32;
  T.humGain = +gain.toFixed(4); T.humF = +f.toFixed(1); T.humCar = best ? best.i : -1;
  const h = humVoice(); if (!h) return;
  const t = h.au.AC.currentTime; h.last = performance.now(); h.gain = gain; h.f = f;
  h.o.frequency.setTargetAtTime(f, t, 0.12); h.o2.frequency.setTargetAtTime(f * 2.02, t, 0.12);
  h.lp.frequency.setTargetAtTime(inside < 1 ? 140 : 200 + f * 2.5, t, 0.2);
  h.g.gain.setTargetAtTime(gain, t, 0.15);
  h.tg.gain.setTargetAtTime(best ? gain * 0.9 * Math.min(1, Math.abs(best.v) / 8) : 0, t, 0.15);
}

function tick(dt) {
  if (!T.ready) return;
  const on = TLX.on("traffic");
  T.group.visible = on;
  if (!on) {
    // no traffic, nobody out: every parked car is home, any car on its way there is gone
    if (T.homes.length && window.TLXC.awayN()) { for (const c of T.cars) if (c.st === "home") { release(c); c.st = "drive"; c.on = false; } for (const h of T.homes) { window.TLXC.setAway(h.ci, false); h.taken = -1; } }
    return;
  }
  dt = Math.min(0.1, dt || 0);
  const you = youPos(), B = bodies();
  homeTick(dt, you);
  for (const c of T.cars) {
    if (!c.on) { if (T.hold) continue; c.retry -= dt; if (c.retry <= 0) spawn(c, false); continue; }
    if (!T.hold && Math.hypot(c.x - you.x, c.z - you.z) > TRAF.drop) { spawn(c, false); continue; }
    const x0 = c.x, z0 = c.z;
    if (c.st === "turn") turnStep(c, dt); else if (c.st === "home") homeStep(c, dt, B, you); else driveStep(c, dt, B, you);
    if (!c.on) continue;
    { const dx = c.x - x0, dz = c.z - z0, d = Math.hypot(dx, dz); if (d < 5) c.roll = ((c.roll || 0) + Math.sign(dx * Math.sin(c.yaw) + dz * Math.cos(c.yaw)) * d / TRAF.wheelR) % (Math.PI * 2); }
    ground(c);
    if (c.semi) semiTrail(c, dt);
    if (!(api.INT && api.INT.on)) collide(c, dt);
  }
  draw();
  humTick(you);
}

TLX.option({ id: "traffic", name: "Road traffic", hint: "A few local drivers on the open roads: slow, careful, they stop for you and turn back at a snowed-in road. Off = empty roads.", sys: "traffic",
  change: v => { if (T.group) T.group.visible = v; } });
TLX.register({
  id: "traffic", v: 2,
  state0: () => ({}),
  migrate: st => (st && typeof st === "object" ? st : {}),
  init(a) {
    api = a; const t0 = performance.now();
    try {
      T.routes = prep();
      T.n = a.GFX && a.GFX.low ? TRAF.n.low : TRAF.n.high;
      T.cars = [];
      for (let i = 0; i < T.n; i++) T.cars.push({ i, on: false, retry: 0, col: TRAF.cols[(i * 7 + 3) % TRAF.cols.length], sx: i % 3 === 2 ? 1.08 : 1, sy: i % 3 === 2 ? 1.12 : 1, lane: TRAF.lane, k: 0, hold: 0, blocked: 0 });
      // the semis (3.5a) come after the cars, so car indices (tests, homes) are unchanged
      T.nSemi = window.TLXS ? (a.GFX && a.GFX.low ? SEMI.n.low : SEMI.n.high) : 0;
      for (let i = 0; i < T.nSemi; i++) T.cars.push({ i: T.n + i, semi: true, on: false, retry: 0, col: 0xffffff, sx: 1, sy: 1, lane: TRAF.lane, k: 0, hold: 0, blocked: 0 });
      build(a);
      // going home (3.4b2b): which parked cars a car can drive to, and the owners who are out right now
      const th = performance.now();
      T.homes = homesPrep(); T.homeMs = Math.round(performance.now() - th);
      if (TLX.on("traffic")) for (const h of T.homes) { const pc = window.TLXC.cars[h.ci]; if (pc.b < 0.005 && !pc.paid && Math.random() < HOME.share) window.TLXC.setAway(h.ci, true); }   // a car under snow (saved) is not out driving
      for (const c of T.cars) spawn(c, true);
      T.ready = true; draw();
    } catch (e) { console.error("TLX traffic", e); T.err = String(e); }
    T.ms = Math.round(performance.now() - t0);
  },
  tick(dt) { try { tick(dt); } catch (e) { if (!T.tickErr) console.error("TLX traffic tick", e); T.tickErr = String(e); } }
});
})();
