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
// WHAT IT COSTS. Four instanced meshes for all the cars (paint with per-car colour, glass, trim + wheels, lamps): +4
// draw calls (+ the shadow pass on high). The body shapes are the parked cars' (TLXC.geo, built by tlx-cars.js). Lamps
// are unlit, brightened after dark from dayFactor (headlights and tail lights), so they don't glow by day.
//
// Option "traffic" (Settings > Options, on): off hides every car and stops all of it.
//
// TLXT (window, for later slices and scenarios): cars [{ rt, s, dir, v, st, x, z, y, yaw, why }], ready, err, ms,
// routes (the drivable routes), n (cars for this preset), place(routeId, s, dir) -> car (puts car 0 there and holds the
// bubble), hold (true = no despawn/respawn), stopAhead(car) -> { d, why }, hits (bumps so far).
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
  cols: [0xe9ebee, 0xb9bec4, 0x4a4f55, 0x1d2024, 0x1f2f4f, 0x8d1f1c, 0x2d4635, 0x6d7a86, 0x9a8a6c, 0xe9ebee]
};
let api = null, M = null;
const T = window.TLXT = { cars: [], ready: false, err: null, ms: 0, routes: [], n: 0, hold: false, hits: 0, TRAF };

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
    out.push({ rt, id: rt.id, pts: P, cum, street, vP, vM, s0: cum[i0], s1: cum[i1], len: cum[i1] - cum[i0] });
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
function stopAhead(c, B) {
  const r = c.r, R = window.TLXR, seg = R.ROADS.seg;
  let d = c.dir > 0 ? r.s1 - TRAF.endGap - c.s : c.s - (r.s0 + TRAF.endGap), why = "end";
  for (const g of r.rt.seg) {
    if (!g.shut) continue;
    const a = g.a, b = g.a + seg;
    if (c.s >= a && c.s < b) continue;                                       // drifted in round it while it drove: it crawls on
    const dd = c.dir > 0 ? a - c.s - TRAF.shutGap : c.s - b - TRAF.shutGap;
    if (dd > -TRAF.shutGap && dd < d) { d = dd; why = "shut"; }
  }
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const each = (x, z, who) => {
    const dx = x - c.x, dz = z - c.z, a = dx * fx + dz * fz;
    if (a <= 0 || a > TRAF.look) return;
    if (Math.abs(dx * fz - dz * fx) > TRAF.laneW) return;
    const dd = a - TRAF.gap; if (dd < d) { d = dd; why = who; }
  };
  for (const o of T.cars) if (o !== c && o.on) each(o.x, o.z, "car");
  if (B) for (const b of B) each(b.x, b.z, b.who);
  return { d, why };
}
T.stopAhead = c => stopAhead(c, bodies());

// ---- placing a car on the road
function setPose(c, dt) {
  const r = c.r, p = at(r, c.s, c.k); c.k = p.k;
  const want = r.street[p.k] ? 0 : TRAF.lane;
  c.lane = dt ? c.lane + (want - c.lane) * Math.min(1, dt * 0.8) : want;
  const fx = p.tx * c.dir, fz = p.tz * c.dir;                                 // forward; the right is (-fz, fx)
  c.x = p.x - fz * c.lane; c.z = p.z + fx * c.lane;
  // heading from the line a little either side, so a bend doesn't snap it point to point
  const q0 = at(r, c.s - 2.5 * c.dir, c.k), q1 = at(r, c.s + 2.5 * c.dir, c.k);
  c.yaw = Math.atan2(q1.x - q0.x, q1.z - q0.z);
}
function ground(c) {
  const W = api.world, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const yf = W.surf(c.x + fx * 1.4, c.z + fz * 1.4), yb = W.surf(c.x - fx * 1.4, c.z - fz * 1.4);
  c.y = (yf + yb) / 2; c.pitch = -Math.atan2(yf - yb, 2.8);
}
function spawn(c, first) {
  const you = youPos(), [lo, hi] = first ? TRAF.spawn0 : TRAF.spawn, rs = T.routes;
  c.on = false; c.retry = 3;
  if (!rs.length) return false;
  const tot = rs.reduce((a, r) => a + r.len, 0), seg = window.TLXR.ROADS.seg;
  for (let k = 0; k < 60; k++) {
    let u = Math.random() * tot, r = rs[0]; for (const q of rs) { if (u < q.len) { r = q; break; } u -= q.len; }
    const s = r.s0 + 30 + Math.random() * Math.max(1, r.len - 60), p = at(r, s, 0), d = Math.hypot(p.x - you.x, p.z - you.z);
    if (d < lo || d > hi || r.street[p.k]) continue;
    if (r.rt.seg.some(g => g.shut && s > g.a - 60 && s < g.a + seg + 60)) continue;
    if (T.cars.some(o => o !== c && o.on && Math.hypot(o.x - p.x, o.z - p.z) < TRAF.gapCars)) continue;
    Object.assign(c, { on: true, r, s, k: p.k, dir: Math.random() < 0.5 ? 1 : -1, v: 0, st: "drive", t: 0, blocked: 0, hold: 0, why: "" });
    c.lane = TRAF.lane; setPose(c, 0); c.v = Math.min(TRAF.vmax, vProf(r, s, c.k, c.dir)) * 0.8; ground(c);
    return true;
  }
  return false;
}
T.lanePt = (id, s, dir) => { const r = T.routes.find(q => q.id === id); if (!r) return null; const p = at(r, s, 0), d = dir < 0 ? -1 : 1, fx = p.tx * d, fz = p.tz * d; return { x: p.x - fz * TRAF.lane, z: p.z + fx * TRAF.lane, cx: p.x, cz: p.z, yaw: Math.atan2(fx, fz) }; };
T.place = (id, s, dir) => {
  const r = T.routes.find(q => q.id === id), c = T.cars[0]; if (!r || !c) return null;
  T.hold = true;
  Object.assign(c, { on: true, r, s: Math.max(r.s0, Math.min(r.s1, s)), k: 0, dir: dir < 0 ? -1 : 1, v: 0, st: "drive", t: 0, blocked: 0, hold: 0, why: "" });
  c.lane = TRAF.lane; setPose(c, 0); ground(c);
  for (const o of T.cars) if (o !== c) o.on = false;
  return c;
};

// ---- driving
function startTurn(c) {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), p = at(c.r, c.s, c.k);
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
  if (u0 >= 1) { c.dir = -c.dir; c.st = "drive"; c.t = 0; c.blocked = 0; c.lane = TRAF.lane; setPose(c, 0); }
}
function driveStep(c, dt, B, you) {
  const r = c.r;
  if (c.hold > 0) { c.hold -= dt; c.v = 0; return; }                         // just bumped: the driver sits a moment
  const sa = stopAhead(c, B); c.why = sa.why; c.ahead = sa.d;
  const prof = vProf(r, c.s, c.k, c.dir), seg = window.TLXR.ROADS.seg;
  let vt = Math.min(prof, Math.sqrt(2 * TRAF.brake * Math.max(0, sa.d)));
  if (r.rt.seg.some(g => g.shut && c.s >= g.a && c.s < g.a + seg)) vt = Math.min(vt, 3);   // ploughing through a fresh drift
  const brk = sa.d < 12 && vt < c.v ? TRAF.brake * 2 : TRAF.brake;
  c.v += Math.max(-brk * dt, Math.min(TRAF.acc * dt, vt - c.v));
  if (c.v < 0) c.v = 0;
  c.s += c.dir * c.v * dt;
  c.s = Math.max(r.s0, Math.min(r.s1, c.s));
  setPose(c, dt);
  if (sa.d < 0.6 && c.v < 0.3) {
    if (sa.why === "end") {
      // the end of the road: out of sight it drives on into the village (another car turns up elsewhere); in sight it turns
      if (!T.hold && Math.hypot(c.x - you.x, c.z - you.z) > 300) { spawn(c, false); return; }
      c.t += dt; if (c.t > TRAF.waitEnd) startTurn(c);
    } else if (sa.why === "shut") { c.t += dt; if (c.t > TRAF.waitShut) startTurn(c); }
    else { c.blocked += dt; if (c.blocked > TRAF.blockT) startTurn(c); }
  } else { c.t = 0; if (c.v > 1) c.blocked = 0; }
}

// ---- solid: the body you drive and the walker against every car
function collide(c, dt) {
  const P = api.P, F = api.FOOT, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const cvx = c.st === "drive" ? fx * c.v : 0, cvz = c.st === "drive" ? fz * c.v : 0;
  const circ = [-TRAF.off, 0, TRAF.off].map(u => [c.x + fx * u, c.z + fz * u]);
  if (F.on) {
    for (const [x, z] of circ) {
      const dx = F.x - x, dz = F.z - z, d = Math.hypot(dx, dz), rr = TRAF.r + 0.36;
      if (d < rr && d > 1e-6) { F.x = x + dx / d * rr; F.z = z + dz / d * rr; if (c.v > 1.5) { c.v = 0; c.hold = Math.max(c.hold, 2); } }
    }
    return;
  }
  if (P.y > c.y + 1.5) return;                                               // over the roof
  const pf = [Math.sin(P.yaw), Math.cos(P.yaw)], veh = api.veh && api.veh.cur;
  const mine = veh ? [[1.6, 1.0], [0, 1.0], [-1.6, 1.0]] : [[1.15, 0.62], [-0.7, 0.7]];
  for (const [off, pr] of mine) for (const [x, z] of circ) {
    const px = P.x + pf[0] * off, pz = P.z + pf[1] * off, dx = px - x, dz = pz - z, d = Math.hypot(dx, dz), rr = TRAF.r + pr;
    if (d >= rr || d < 1e-6) continue;
    const nx = dx / d, nz = dz / d, pen = rr - d;
    P.x += nx * (pen + 0.02); P.z += nz * (pen + 0.02);
    const vn = (P.vx - cvx) * nx + (P.vz - cvz) * nz;
    if (vn < 0) {
      const hit = -vn;
      P.vx -= 1.45 * vn * nx; P.vz -= 1.45 * vn * nz;
      if (hit > 2) { if (api.thud) api.thud(Math.min(1, hit / 20)); P.shake = Math.max(P.shake || 0, Math.min(1, hit / 14)); }
      if (hit > 4) { api.cargoHit(hit); if (!c.bumpT || api.now() - c.bumpT > 6) { c.bumpT = api.now(); T.hits++; api.toast(hit > 9 ? "Crunch: straight into a car. The driver gets out to look at the dent and shakes their head." : "Bump: into a car. The driver waves you on, not amused.", "warn"); } }
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
    dark: new TT.InstancedMesh(G.dark, a.mesh.std(0x16181b, 0.85, 0.05), n),
    lamps: new TT.InstancedMesh(G.lamps, T.lampMat, n)
  };
  const grp = T.group = new TT.Group(); grp.name = "traffic";
  const col = new TT.Color();
  T.cars.forEach((c, i) => { col.setHex(c.col); M.paint.setColorAt(i, col); });
  for (const k in M) { const o = M[k]; o.frustumCulled = false; o.castShadow = !low && k !== "lamps"; o.receiveShadow = true; o.name = "traffic_" + k; o.count = 0; grp.add(o); }
  if (M.paint.instanceColor) M.paint.instanceColor.needsUpdate = true;
  a.scene.add(grp);
  T.q = { m: new TT.Matrix4(), q: new TT.Quaternion(), e: new TT.Euler(0, 0, 0, "YXZ"), p: new TT.Vector3(), s: new TT.Vector3(), col };
}
function draw() {
  const { m, q, e, p, s, col } = T.q;
  let j = 0;
  for (const c of T.cars) {
    if (!c.on) continue;
    e.set(c.pitch || 0, c.yaw, 0); q.setFromEuler(e); p.set(c.x, c.y - 0.04, c.z); s.set(1, c.sy, c.sx); m.compose(p, q, s);
    for (const k in M) M[k].setMatrixAt(j, m);
    col.setHex(c.col); M.paint.setColorAt(j, col);
    j++;
  }
  for (const k in M) { M[k].count = j; M[k].instanceMatrix.needsUpdate = true; }
  if (M.paint.instanceColor) M.paint.instanceColor.needsUpdate = true;
  const night = 1 - (api.dayFactor ? api.dayFactor() : 1);
  T.lampMat.color.setScalar(0.55 + 1.6 * night);
}

function tick(dt) {
  if (!T.ready) return;
  const on = TLX.on("traffic");
  T.group.visible = on;
  if (!on) return;
  dt = Math.min(0.1, dt || 0);
  const you = youPos(), B = bodies();
  for (const c of T.cars) {
    if (!c.on) { if (T.hold) continue; c.retry -= dt; if (c.retry <= 0) spawn(c, false); continue; }
    if (!T.hold && Math.hypot(c.x - you.x, c.z - you.z) > TRAF.drop) { spawn(c, false); continue; }
    if (c.st === "turn") turnStep(c, dt); else driveStep(c, dt, B, you);
    if (!c.on) continue;
    ground(c);
    if (!(api.INT && api.INT.on)) collide(c, dt);
  }
  draw();
}

TLX.option({ id: "traffic", name: "Road traffic", hint: "A few local drivers on the open roads: slow, careful, they stop for you and turn back at a snowed-in road. Off = empty roads.", sys: "traffic",
  change: v => { if (T.group) T.group.visible = v; } });
TLX.register({
  id: "traffic", v: 1,
  state0: () => ({}),
  migrate: st => (st && typeof st === "object" ? st : {}),
  init(a) {
    api = a; const t0 = performance.now();
    try {
      T.routes = prep();
      T.n = a.GFX && a.GFX.low ? TRAF.n.low : TRAF.n.high;
      T.cars = [];
      for (let i = 0; i < T.n; i++) T.cars.push({ i, on: false, retry: 0, col: TRAF.cols[(i * 7 + 3) % TRAF.cols.length], sx: i % 3 === 2 ? 1.08 : 1, sy: i % 3 === 2 ? 1.12 : 1, lane: TRAF.lane, k: 0, hold: 0, blocked: 0 });
      build(a);
      for (const c of T.cars) spawn(c, true);
      T.ready = true; draw();
    } catch (e) { console.error("TLX traffic", e); T.err = String(e); }
    T.ms = Math.round(performance.now() - t0);
  },
  tick(dt) { try { tick(dt); } catch (e) { if (!T.tickErr) console.error("TLX traffic tick", e); T.tickErr = String(e); } }
});
})();
