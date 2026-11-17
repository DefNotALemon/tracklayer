// Tracklayer — semitrailers and the fifth-wheel coupling (slice 3.5b2a of the Four Seasons & Enterprise expansion,
// loop/EXPANSION.md). Loaded after tlx-traffic.js (it needs tlx-vehicles.js, tlx-roads.js and tlx-semis.js), before tracklayer.js.
//
// WHAT IT IS. Semitrailers for the tractor unit (3.5b1). Each stands on its landing legs in a plowed lay-by beside a road
// (RIG.spots: a box trailer on the Mehamn road just outside Kjøllefjord, a tanker outside Lebesby). The lay-by is found at
// boot: the first straight, level, clear stretch of that road's shoulder, then plowed as a lane beside the road.
//
// THE COUPLING. Back the tractor's fifth wheel (VEHICLES row `fifthZ`) under the trailer's kingpin: within RIG.catchR of it,
// under RIG.vMax and within RIG.catchA of the trailer's line, the jaws lock (a thud, the tractor stops). Too fast or too
// crooked it does not lock and a toast says which; the trailer's front stops the cab running on underneath. A coupled trailer
// with its legs down holds the tractor (TLXV.addLoad -> hold): get out and use the legs (an api.footx provider, so the
// keyboard's use key, a pad's L3 and the touch button all do it) to wind them up. Use at the legs again winds them down and
// pulls the fifth wheel's handle in one go: the trailer stands where it is, anywhere level enough (RIG.grade), and the
// tractor drives out from under it. It will not lock again until the fifth wheel has been 1.2 m clear of the kingpin.
//
// HOW IT FOLLOWS. The same rule as 3.5a's traffic semis: each frame the trailer's axle point is pulled straight toward the
// kingpin until it is the trailer's wheelbase behind it (a tractrix), so it cuts inside a bend, straightens after, and swings
// the other way in reverse. Past RIG.jack of articulation the trailer binds against the cab: backing up, the tractor is held
// there with a toast until it pulls forward (3.5b2b1). Its whole mass is inertia on the tractor, RIG.pin of it rests on the tractor's tyres (more grip and
// more rolling), its own axles add rolling drag by their sink in the snow and their own braking.
//
// SAVED (state id "rig"): t: { <spot id>: { x, z, yaw (the axle point and heading), on (uid of the tractor it is coupled to,
// or null), legs (1 down, 0 up) } }. A trailer the save lacks stands in its lay-by. Place comes from api.world and TLXR.
//
// LEFT STANDING (3.5b2b2). A trailer that stands anywhere but its own lay-by with nobody at its lorry's wheel (uncoupled on
// its legs, or coupled to a lorry you swapped away from) has a warning triangle out RIG.triBack behind its tail, and a toast
// says so when you leave a coupled rig. A lorry that is gone from the save (sold) leaves its trailer on its legs and says so.
// The marker lamps are unlit geometry driven from dayFactor: reflector-dull by day, lit after dark while the trailer is
// coupled (it has the lorry's power), near-black after dark on its legs.
//
// TRAILER RUNS (3.5b3a): paid work for the rig, posted in the Freight app; see the "trailer runs" block below. Saved in the
// same state: run { id, to, cargo, kg, m, pay } | null, done, told.
//
// TLXRIG (window, for later slices and scenarios): RIG, TRAILERS, list() -> [{ id, type, x, z, yaw, kx, kz, on, legs, art,
// kg, home }], kingpin(id), fifth(uid), legsPt(id), err.
(() => {
"use strict";
const D2R = Math.PI / 180;
const RIG = {
  spots: [                                                           // route: a TLXR route id; end 0 = from its first end, 1 = from its last
    { id: "kj", type: "dist", route: "fv888", end: 0, bay: "Kjøllefjord lay-by" },
    { id: "lb", type: "tank", route: "lebesby", end: 1, bay: "Lebesby lay-by" },
    { id: "mh", type: "haul", route: "fv888", end: 1, bay: "Mehamn lay-by" }   // the curtainsider, outside Mehamn (3.5b2b2)
  ],
  off: 5.9,                 // the lay-by's centre line from the road's, m (a 6.4 m road: the trailer's side is 1.4 m off the plowed edge)
  approach: 22,             // straight plowed room in front of the kingpin, m
  skip: 60, skipEnd: 150,   // how far outside the town radius (end 0) / from the road's last point (end 1) the search starts, m
  maxS: 2600,               // and how far along it gives up, m
  catchR: 0.45, catchA: 10 * D2R, vMax: 2.0,                         // m, rad, m/s: the fifth wheel on the kingpin
  rearm: 1.2,               // m clear before it can lock again
  jack: 60 * D2R,           // articulation at which the trailer binds on the cab
  pin: 0.24,                // share of the trailer's weight on the fifth wheel
  cr: 0.012, brakeAxle: 16000, mu: 0.4,                              // rolling coefficient on hard ground, N per axle of brake, grip its brakes can use
  reach: 2.9, legsZ: -1.6,  // m: you to the legs; the legs behind the kingpin
  grade: 0.08,              // the steepest ground a trailer may be stood on
  bayGrade: 0.05,           // and the steepest a lay-by may be along the trailer (3.5b2b2)
  stop: 0.75,               // m: how far past the kingpin the fifth wheel can run before the trailer's front plate stops the cab
  far: 600,
  solidR: 1.3, solidStep: 1.9,                                       // the body as obstacle circles: radius (half its 2.55 m width), spacing along it, m
  frontPass: 3.6,           // m behind the kingpin: the part of the body a tractor backing in along its line runs under
  triBack: 12, triHome: 4   // the warning triangle: m behind the tail; a trailer within triHome of its lay-by needs none
};
const TRAILERS = {                                                   // by TLXS type: empty mass kg, what it is called, its colour
  dist: { name: "box trailer", kg: 7200, col: 0xeef0f2 },
  haul: { name: "curtainsider", kg: 6800, col: 0x1f3f73 },
  tank: { name: "tanker trailer", kg: 6400, col: 0xd4d7db }
};
// trailer runs (3.5b3a): pay = base + perTKm x tonnes of cargo x km of road, to the nearest $5; a trailer counts as delivered
// standing on its legs within dropR of the far lay-by's middle, and pays `bonus` more with both ends `clear` m off the road's
// centre line; a run is never posted to a lay-by nearer than minD. CARGO: what each kind of trailer carries, kg.
const RUN = { base: 150, perTKm: 26, dropR: 40, minD: 300, clear: 4.3, bonus: 0.1 };
const CARGO = {
  dist: [["fish boxes on pallets", 3200], ["groceries and dairy", 2600], ["frozen bait", 3000]],
  haul: [["building timber", 4000], ["insulation and plasterboard", 2800], ["fence posts and netting", 3400]],
  tank: [["heating oil", 3600], ["diesel for the pumps", 3800]]
};
let api = null, TH = null;
const S = () => TLX.state("rig");
const LIST = [];                                                     // runtimes: { sp, s, def, q, L, grp, wheels, legG, legK, spin, arm, sink, art, saidT, load, home }
const G = { RIG, TRAILERS, RUN, CARGO, err: null, miss: [] };
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const wrapA = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const NUM = Number.isFinite;

/* ---------------- where things are ---------------- */
function fifth(h) { const z = h.def.fifthZ; return [h.x + Math.sin(h.yaw) * z, h.z + Math.cos(h.yaw) * z]; }
function kingpin(T) { const s = T.s; return [s.x + Math.sin(s.yaw) * T.L, s.z + Math.cos(s.yaw) * T.L]; }
function legsPt(T) { const s = T.s, u = T.L + RIG.legsZ; return [s.x + Math.sin(s.yaw) * u, s.z + Math.cos(s.yaw) * u]; }
function hostOf(T) { const h = T.s.on != null && window.TLXV ? TLXV.pose(T.s.on) : null; return h && h.def.fifthZ != null ? h : null; }

/* ---------------- the lay-by: a straight, level, clear stretch of shoulder ---------------- */
function findBay(sp) {
  const W = api.world, rt = window.TLXR && TLXR.routes.find(r => r.id === sp.route); if (!rt || !rt.cum || rt.pts.length < 6) return null;
  const p = rt.pts, c = rt.cum, n = p.length, q = TLXS.TYPES[sp.type].tl, need = 1.5 + q.over + q.L + RIG.approach, tot = c[n - 1];
  const at = i => sp.end ? n - 1 - i : i, sAt = i => sp.end ? tot - c[at(i)] : c[at(i)];
  for (let i = 1; i < n - 2; i++) {
    const a = p[at(i)], s0 = sAt(i);
    if (s0 > RIG.maxS) break;
    if (sp.end ? s0 < RIG.skipEnd : Math.hypot(a[0] - W.depot.x, a[1] - W.depot.z) < api.townR + RIG.skip) continue;
    let j = i; while (j < n - 1 && sAt(j) - s0 < need) j++;
    if (sAt(j) - s0 < need) break;
    const b = p[at(j)], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < need * 0.98) continue;
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    let dev = 0; for (let k = i; k <= j; k++) { const e = p[at(k)]; dev = Math.max(dev, Math.abs((e[0] - a[0]) * uz - (e[1] - a[1]) * ux)); }
    if (dev > 0.6) continue;
    for (const sd of [1, -1]) {
      const nx = uz * sd, nz = -ux * sd; let ok = true;
      for (let u = -1; u <= need && ok; u += 2) {
        const gc = W.groundAt(a[0] + ux * u, a[1] + uz * u);
        for (const l of [-1.3, 1.3]) {
          const x = a[0] + ux * u + nx * (RIG.off + l), z = a[1] + uz * u + nz * (RIG.off + l);
          if (W.isSea(x, z) || W.isWater(x, z) || W.obNear(x, z, 1.5) || Math.abs(W.groundAt(x, z) - gc) > 0.35 || TLXR.near(x, z).d < RIG.off + l - 0.9) { ok = false; break; }
        }
      }
      if (!ok) continue;
      const bx = a[0] + nx * RIG.off, bz = a[1] + nz * RIG.off, ua = 1.5 + q.over;
      if (Math.abs(W.groundAt(bx + ux * (ua + q.L), bz + uz * (ua + q.L)) - W.groundAt(bx + ux * ua, bz + uz * ua)) / q.L > RIG.bayGrade) continue;   // level enough along its length to stand on its legs and be coupled
      return { x: bx + ux * ua, z: bz + uz * ua, yaw: Math.atan2(ux, uz), lane: [[bx - ux, bz - uz], [bx + ux * need, bz + uz * need]], s: Math.round(s0) };
    }
  }
  return null;
}

/* ---------------- the model: TLXS's trailer, its wheels, the inner legs that wind down ---------------- */
function build(T) {
  const lampMat = T.lampMat = new TH.MeshBasicMaterial({ vertexColors: true });   // unlit, driven from dayFactor in pose(): lit after dark only while coupled
  const o = TLXS.make(TH, api.mesh.std, lampMat, T.sp.type, !!(api.GFX && api.GFX.low)), grp = o.trailer, WR = TLXS.WR;
  o.paint[1].color.setHex(T.def.col);
  grp.rotation.order = "YXZ"; grp.name = "rig_" + T.sp.id;
  const wg = window.TLXC && TLXC.geo && TLXC.geo.wheel, wm = new TH.MeshStandardMaterial({ vertexColors: !!wg, color: wg ? 0xffffff : 0x16181b, roughness: 0.85 });
  const geo = wg || new TH.CylinderGeometry(0.33, 0.33, 0.24, 14).rotateZ(Math.PI / 2);
  T.wheels = [];
  for (const a of T.q.axles) for (const sd of [-1, 1]) {
    const m = new TH.Mesh(geo, wm); m.scale.set(0.62 / 0.24, WR / 0.33, WR / 0.33); m.position.set(sd * 0.93, WR, -T.L + a); m.castShadow = true; grp.add(m); T.wheels.push(m);
  }
  const lm = api.mesh.std(0x3a3e44, 0.6, 0.4), legG = new TH.Group();
  for (const sd of [-1, 1]) {
    const leg = new TH.Mesh(new TH.BoxGeometry(0.07, 0.5, 0.09), lm); leg.position.set(sd * 0.9, 0.27, RIG.legsZ); legG.add(leg);
    const pad = new TH.Mesh(new TH.BoxGeometry(0.26, 0.04, 0.26), lm); pad.position.set(sd * 0.9, 0.02, RIG.legsZ); legG.add(pad);
  }
  grp.add(legG); T.legG = legG; T.legK = T.s.legs ? 1 : 0;
  grp.visible = false; api.scene.add(grp); T.grp = grp;
  // the warning triangle (3.5b2b2): a red reflective triangle on a wire foot, stood on the road behind a rig left standing
  const tri = new TH.Group(), tm = T.triMat = new TH.MeshBasicMaterial({ color: 0xd8261c }), side = 0.5, w = 0.06, hh = side * 0.866;
  for (const [x, y, rz] of [[0, 0.03, Math.PI / 2], [-side / 4, hh / 2 + 0.03, -Math.PI / 6], [side / 4, hh / 2 + 0.03, Math.PI / 6]]) {
    const b = new TH.Mesh(new TH.BoxGeometry(w, side, 0.012), tm); b.position.set(x, y + 0.1, 0); b.rotation.z = rz; tri.add(b);
  }
  for (const sd of [-1, 1]) { const f = new TH.Mesh(new TH.BoxGeometry(0.012, 0.012, 0.34), lm); f.position.set(sd * 0.2, 0.1, 0); tri.add(f); const g = new TH.Mesh(new TH.BoxGeometry(0.012, 0.1, 0.012), lm); g.position.set(sd * 0.2, 0.05, 0); tri.add(g); }
  tri.name = "rigtri_" + T.sp.id; tri.visible = false; api.scene.add(tri); T.tri = tri;
}
// is this trailer left standing where a triangle belongs: away from its lay-by, and nobody's current lorry
function left(T) {
  const s = T.s, hm = T.home;
  if (hm && Math.hypot(s.x - hm.x, s.z - hm.z) < RIG.triHome) return false;
  if (inBay(T)) return false;                                        // stood clear of the road in any lay-by (3.5b3a: a delivered trailer)
  if (s.on == null) return true;
  const h = hostOf(T); return !(h && h.cur);
}
// where its triangle stands: behind the tail on its own line, nearer if that is water or inside something
function triPt(T) {
  const s = T.s, W = api.world, fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
  for (const b of [RIG.triBack, 8, 4, 2]) { const u = T.q.over + b, x = s.x - fx * u, z = s.z - fz * u; if (!W.isSea(x, z) && !W.isWater(x, z) && !W.obNear(x, z, 0.4)) return [x, z]; }
  return [s.x - fx * (T.q.over + 2), s.z - fz * (T.q.over + 2)];
}

/* ---------------- following the fifth wheel ---------------- */
function drop(T) { T.s.on = null; T.s.legs = 1; T.art = 0; }
function follow(T) {
  const s = T.s; if (s.on == null) { T.hp = null; return; }
  let h = hostOf(T);
  if (!h) {                                                          // the tractor is gone (sold): it stands where it stood
    drop(T); T.wasCur = false;
    if (api.started()) { api.toast(`The lorry is gone: the ${T.def.name} it was pulling stands on its legs where it was. It is on the Map.`, "warn"); api.save(); }
    return;
  }
  let f = fifth(h), dx = s.x - f[0], dz = s.z - f[1], d = Math.hypot(dx, dz), back = h.yaw + Math.PI;
  let a = d > 40 || d < 0.01 ? back : Math.atan2(dx, dz);            // a jump (a rescue, a reset): straight behind
  let rel = wrapA(a - back);
  if (Math.abs(rel) > RIG.jack) {
    // jackknifed (3.5b2b1). Backing up, the trailer's corner is against the cab and nothing more gives: the tractor is put
    // back where it stood a frame ago and loses its rearward speed, until it pulls forward. Going forward the trailer can
    // only be dragged round (its tyres scrub), so there it stays the clamp.
    const P = api.P, live = h.cur && !api.FOOT.on, vf = live ? P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw) : 0;
    if (live && vf < -0.03 && T.hp && Math.hypot(P.x - T.hp[0], P.z - T.hp[1]) < 2) {
      P.x = T.hp[0]; P.z = T.hp[1]; P.yaw = T.hp[2]; P.yr = 0;
      const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), v = P.vx * sy + P.vz * cy; if (v < 0) { P.vx -= v * sy; P.vz -= v * cy; }
      T.jkT = api.now();
      say(T, "Jackknifed: the trailer is hard against the cab and will not go back any further. Pull forward to straighten it out.");
      h = hostOf(T); f = fifth(h); dx = s.x - f[0]; dz = s.z - f[1]; d = Math.hypot(dx, dz); back = h.yaw + Math.PI;
      a = d < 0.01 ? back : Math.atan2(dx, dz); rel = wrapA(a - back);
    }
    if (Math.abs(rel) > RIG.jack) a = back + Math.sign(rel) * RIG.jack;
  }
  s.x = f[0] + Math.sin(a) * T.L; s.z = f[1] + Math.cos(a) * T.L; s.yaw = Math.atan2(f[0] - s.x, f[1] - s.z); T.art = wrapA(s.yaw - h.yaw);
  if (h.cur) { const P = api.P; (T.hp || (T.hp = [0, 0, 0]))[0] = P.x; T.hp[1] = P.z; T.hp[2] = P.yaw; } else T.hp = null;
}

/* ---------------- solid (3.5b2b1): the body as circles in the game's obstacle grid ----------------
   The walker, the sled, the pickup and anything else that reads the grid is stopped by a trailer, standing or coupled. The
   circles are moved with it (dropped at the old place, added at the new) whenever it has moved. The lorry it is coupled to
   passes through all of them (the jackknife rule above keeps its cab off the trailer); any other tractor unit passes only the
   front ones, and only while it is in line ahead of the kingpin, backing in (TLXRIG.pass, asked by tlx-vehicles.js collide). */
function solidInit(T) {
  const q = T.q, a = q.front - 1.05, b = -(T.L + q.over) + 1.05, n = Math.max(2, Math.ceil((a - b) / RIG.solidStep) + 1);
  T.obs = []; T.gx = NaN;
  for (let i = 0; i < n; i++) { const u = a + (b - a) * i / (n - 1); T.obs.push({ x: 0, z: 0, r: RIG.solidR, top: 1e9, rig: T.sp.id, u, front: u > -RIG.frontPass, ax: 0 }); }
}
function grid(T) {
  const s = T.s, W = api.world; if (!T.obs || !W.addOb || !W.dropOb) return;
  if (Math.abs(s.x - T.gx) < 0.03 && Math.abs(s.z - T.gz) < 0.03 && Math.abs(wrapA(s.yaw - T.gyaw)) < 0.004) return;
  const k = kingpin(T), fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), had = T.gx === T.gx;
  for (const o of T.obs) { if (had) W.dropOb(o); o.x = k[0] + fx * o.u; o.z = k[1] + fz * o.u; o.ax = s.yaw; W.addOb(o); }
  T.gx = s.x; T.gz = s.z; T.gyaw = s.yaw;
}
function pass(o, uid, def) {
  const T = LIST.find(T => T.sp.id === o.rig); if (!T) return true;
  if (T.s.on === uid) return true;
  if (!o.front || !def || def.fifthZ == null) return false;
  const h = TLXV.pose(uid); if (!h) return false;
  const s = T.s, k = kingpin(T), tx = Math.sin(s.yaw), tz = Math.cos(s.yaw), ex = h.x - k[0], ez = h.z - k[1];
  return ex * tx + ez * tz > 0.2 && Math.abs(ex * tz - ez * tx) < 2.2 && Math.abs(wrapA(h.yaw - s.yaw)) < 0.7;
}
// what a road driver stops for (tlx-traffic.js bodies()): the middle of the body and a point just ahead of its tail
function bodies(out) {
  if (!api) return out;
  const P = api.P;
  for (const T of LIST) {
    const s = T.s, fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), h = s.on != null ? hostOf(T) : null, mv = !!(h && h.cur && !api.FOOT.on);
    for (const u of [T.L * 0.5, 1.5 - T.q.over]) out.push({ x: s.x + fx * u, z: s.z + fz * u, vx: mv ? P.vx || 0 : 0, vz: mv ? P.vz || 0 : 0, who: "parked" });
  }
  return out;
}
function say(T, msg, kind) { const t = api.now(); if (t - (T.saidT || -99) < 5) return; T.saidT = t; api.toast(msg, kind || "warn"); }
function couple(T, uid) {
  const P = api.P; T.s.on = uid; T.s.legs = 1; T.arm = false; follow(T);
  P.vx = P.vz = 0; api.thud(0.55); T.saidT = api.now();
  api.toast(`Coupled: the kingpin is locked in the fifth wheel. The ${T.def.name}'s legs are still down: get out and wind them up, at its front.`, "good");
  api.save();
}
function coupleTick() {
  const st = TLXV.state(), uid = st.cur; if (uid == null) return;
  const h = TLXV.pose(uid); if (!h || h.def.fifthZ == null) return;
  if (LIST.some(T => T.s.on === uid)) return;
  const f = fifth(h), P = api.P, sy = Math.sin(h.yaw), cy = Math.cos(h.yaw), vf = P.vx * sy + P.vz * cy;
  const seated = !api.FOOT.on && !api.MNT.on && !api.DMT.on;
  for (const T of LIST) {
    const s = T.s; if (s.on != null) continue;
    const k = kingpin(T), ex = f[0] - k[0], ez = f[1] - k[1], d = Math.hypot(ex, ez);
    if (d > 4) { T.arm = true; continue; }
    if (d > RIG.rearm) T.arm = true;
    if (!seated) continue;
    const tx = Math.sin(s.yaw), tz = Math.cos(s.yaw), along = ex * tx + ez * tz, side = ex * tz - ez * tx, rel = Math.abs(wrapA(h.yaw - s.yaw));
    if (T.arm && d <= RIG.catchR && vf < -0.05) {
      if (-vf > RIG.vMax) say(T, "Too fast to couple: back under the kingpin at a crawl.");
      else if (rel > RIG.catchA) say(T, "Not lined up: the fifth wheel has to come in along the trailer's line. Pull forward and straighten up.");
      else { couple(T, uid); return; }
    }
    // the trailer's front plate stops a cab that ran on under it
    if (along < -RIG.stop && along > -3 && Math.abs(side) < 1.4 && rel < 1.2) {
      const push = -RIG.stop - along; P.x += tx * push; P.z += tz * push;
      const vn = P.vx * tx + P.vz * tz; if (vn < 0) { P.vx -= vn * tx; P.vz -= vn * tz; if (vn < -1) api.thud(Math.min(1, -vn / 6)); }
    }
  }
}
function holdTick() {
  const uid = TLXV.state().cur; if (uid == null || api.FOOT.on) return;
  const T = LIST.find(T => T.s.on === uid); if (!T || !T.s.legs) return;
  if (api.input.thr > 0.2 || api.input.brk > 0.2) say(T, `The ${T.def.name}'s legs are still down. Get out and wind them up, at its front.`);
}

/* ---------------- on foot at the legs ---------------- */
function legsUp(T) { T.s.legs = 0; api.toast(`Legs up. The ${T.def.name} is on the lorry: ${((T.def.kg + cargoKg(T)) / 1000).toFixed(1)} t behind you, and it cuts inside every bend.`, "good"); api.save(); }
function uncouple(T) {
  const W = api.world, k = kingpin(T), s = T.s;
  if (Math.abs(W.rideSurf(k[0], k[1]) - W.rideSurf(s.x, s.z)) / T.L > RIG.grade) { api.toast("Too steep to stand a trailer here: it would roll off its legs. Find level ground.", "warn"); return; }
  s.on = null; s.legs = 1; T.arm = false; T.art = 0;
  api.toast(`Legs down, fifth wheel released. The ${T.def.name} stands here: pull the lorry out from under it.`, "good"); api.save();
}
const PROV = {
  use() {
    const F = api.FOOT; if (!F.on || api.MNT.on || api.DMT.on || (api.INT && api.INT.on)) return null;
    let best = null, bd = RIG.reach;
    for (const T of LIST) { if (T.s.on == null) continue; const l = legsPt(T), d = Math.hypot(F.x - l[0], F.z - l[1]); if (d < bd) { bd = d; best = T; } }
    if (!best) return null;
    const T = best;
    if (T.s.legs) return { label: "LEGS UP", hint: () => api.keyHint("use", `wind the ${T.def.name}'s legs up`), act: () => legsUp(T) };
    return { label: "UNCOUPLE", hint: () => api.keyHint("use", `wind the legs down and uncouple the ${T.def.name}`), act: () => uncouple(T) };
  }
};

/* ---------------- trailer runs (3.5b3a): a loaded trailer hauled from where it stands to another lay-by ----------------
   Once you own a tractor unit, the Freight app has a "Trailer runs" section (api.appx): one posted run per trailer, a cargo
   for its kind (CARGO) to a lay-by at least RUN.minD away, picked by the day, paid by tonnes of cargo and metres of road
   (TLXR.tripDist). TAKE needs the Freight licence; one run at a time. The cargo's weight is on the trailer from then on
   (loadOf). The Jobs app lists the run and the compass follows it by itself when nothing else is on (api.jobx, `auto`):
   to the trailer's kingpin until it is on your lorry with its legs up, then to the far lay-by. It is delivered when the
   trailer stands there uncoupled on its legs; stood clear of the road it pays RUN.bonus more. GIVE UP costs nothing.
   Saved in state "rig": run { id, to, cargo, kg, m, pay } or null, done (runs delivered), told (the one-time notice). */
function hsh(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
function midOf(T) { const s = T.s, u = (T.L + T.q.front - T.q.over) / 2; return [s.x + Math.sin(s.yaw) * u, s.z + Math.cos(s.yaw) * u]; }
function runOf() { const r = S().run; return r && typeof r === "object" ? r : null; }
function cargoKg(T) { const r = runOf(); return r && r.id === T.sp.id ? r.kg : 0; }
function bayOf(id) { const T = LIST.find(T => T.sp.id === id); return T ? T.bay : null; }
function nearBay(T, R) { const m = midOf(T); let best = null, bd = R; for (const B of LIST) if (B.bay) { const d = Math.hypot(B.bay.x - m[0], B.bay.z - m[1]); if (d < bd) { bd = d; best = B.bay; } } return best; }
function clearOf(T) { const s = T.s, k = kingpin(T), fx = Math.sin(s.yaw), fz = Math.cos(s.yaw); return TLXR.near(k[0], k[1]).d >= RUN.clear && TLXR.near(s.x - fx * T.q.over, s.z - fz * T.q.over).d >= RUN.clear; }
function inBay(T) {
  const s = T.s, key = s.x + s.z * 1.37 + s.yaw * 7.1;
  if (T.bayK !== key) { T.bayK = key; T.bayIn = !!nearBay(T, RUN.dropR) && clearOf(T); }
  return T.bayIn;
}
function ownsTractor() { const o = window.TLXV && TLXV.state().owned; return Array.isArray(o) && o.some(r => { const p = r && TLXV.pose(r.uid); return !!(p && p.def.fifthZ != null); }); }
function offerFor(T) {
  const m = midOf(T), c = LIST.filter(B => B.bay && Math.hypot(B.bay.x - m[0], B.bay.z - m[1]) > RUN.minD); if (!c.length) return null;
  const h = hsh(T.sp.id + ":" + Math.floor(api.GS.hour / 24) + ":" + (S().done | 0)), to = c[h % c.length].bay, list = CARGO[T.sp.type], cg = list[(h >>> 9) % list.length];
  const air = Math.hypot(to.x - m[0], to.z - m[1]); let d = TLXR.tripDist ? TLXR.tripDist(m[0], m[1], to.x, to.z) : null; if (!(d > air * 0.9)) d = air * 1.3;
  return { id: T.sp.id, to: to.id, cargo: cg[0], kg: cg[1], m: Math.round(d), pay: Math.round((RUN.base + RUN.perTKm * cg[1] / 1000 * d / 1000) / 5) * 5 };
}
function offers() { return runOf() ? [] : LIST.map(offerFor).filter(Boolean); }
function runRefresh() { api.TABLET.refresh("freight"); api.TABLET.refresh("jobs"); }
function take(id) {
  const T = LIST.find(T => T.sp.id === id), o = T && !runOf() ? offerFor(T) : null; if (!o) return false;
  if (!api.licensed("freight")) { api.toast("Trailer runs need the Freight licence.", "warn"); return false; }
  if (!ownsTractor()) { api.toast("Trailer runs need a tractor unit of your own.", "warn"); return false; }
  S().run = o; T.bayK = NaN;
  api.toast(`Trailer run taken: ${o.cargo}, ${(o.kg / 1000).toFixed(1)} t in the ${T.def.name}, for the ${bayOf(o.to).name}. Couple it, wind the legs up, and stand it in that lay-by.`, "good");
  api.save(); runRefresh(); return true;
}
function giveUp() {
  const r = runOf(); if (!r) return false; const T = LIST.find(T => T.sp.id === r.id);
  S().run = null;
  api.toast(`Run given up: the ${r.cargo} will go on someone else's lorry. The ${T ? T.def.name : "trailer"} stays where it stands, empty.`, "warn");
  api.save(); runRefresh(); return true;
}
function runTick() {
  const st = S(), r = runOf();
  if (!r) {
    if (!st.told && api.now() - (runTick.t || 0) > 3) { runTick.t = api.now(); if (ownsTractor() && api.licensed("freight") && api.GS.apps && api.GS.apps.freight && offers().length) { st.told = 1; api.TABLET.notify({ app: "freight", title: "Trailer runs for your lorry", body: "Loaded semitrailers are posted in Freight, under Trailer runs: couple one in its lay-by and stand it in another.", ttl: 9 }); } }
    return;
  }
  const T = LIST.find(T => T.sp.id === r.id), B = bayOf(r.to); if (!T || !B) { st.run = null; return; }
  if (T.s.on != null) return;
  const m = midOf(T); if (Math.hypot(B.x - m[0], B.z - m[1]) > RUN.dropR) return;
  const clear = clearOf(T), pay = Math.round(r.pay * api.payMul() * (clear ? 1 + RUN.bonus : 1));
  api.GS.cash += pay; st.run = null; st.done = (st.done | 0) + 1; T.bayK = NaN;
  api.toast(`Trailer run delivered to the ${B.name}: ${r.cargo}. ${api.fmtCash(pay)}${clear ? `, ${Math.round(RUN.bonus * 100)}% of it for standing the trailer clear of the road` : `. Stood clear of the road it would have paid ${Math.round(RUN.bonus * 100)}% more`}.`, "good");
  api.save(); runRefresh();
}
// where the run stands: what the compass points at and what is left to do
function runPhase(r, T, B) {
  const h = T.s.on != null ? hostOf(T) : null, mine = !!(h && h.cur), k = kingpin(T), m = midOf(T);
  if (!mine) return { ph: "fetch", tgt: { x: k[0], z: k[1] }, todo: T.s.on != null ? "get back in the lorry it is coupled to" : "back the fifth wheel under its kingpin" };
  if (T.s.legs) return { ph: "legs", tgt: { x: k[0], z: k[1] }, todo: "get out and wind its legs up, at its front" };
  const at = Math.hypot(B.x - m[0], B.z - m[1]) <= RUN.dropR;
  return { ph: at ? "drop" : "haul", tgt: { x: B.x, z: B.z }, todo: at ? "here: stand it clear of the road, get out and uncouple at its legs" : "haul it to the " + B.name };
}
function jobRow() {
  const r = runOf(); if (!r) return null; const T = LIST.find(T => T.sp.id === r.id), B = bayOf(r.to); if (!T || !B) return null;
  const U = api.ui, p = runPhase(r, T, B), cg = r.cargo[0].toUpperCase() + r.cargo.slice(1), pay = api.fmtCash(r.pay * api.payMul()), tons = (r.kg / 1000).toFixed(1);
  const title = p.ph === "fetch" || p.ph === "legs" ? `Trailer run: the ${T.def.name}` : `${cg} → ${B.name}`;
  return { obj: r, kind: "rigrun", auto: true, tgt: p.tgt, col: "var(--signal)", title: `${cg} → ${B.name}`, chips: U.chip("TRAILER RUN"), meta: `${tons} t in the ${T.def.name} · ${p.todo}`, pay,
    hud: d => ({ title, sub: p.ph === "drop" ? `${pay} · ${p.todo}` : p.ph === "haul" ? `${U.fmtMi(d)} · ${pay} · ${tons} t aboard · stand it in the lay-by, uncoupled` : `${U.fmtMi(d)} · ${p.todo} · ${r.cargo} for the ${B.name}` }) };
}
const SECT = {
  html() {
    if (!LIST.length || !api.licensed("freight")) return "";
    const U = api.ui, r = runOf(), P = api.FOOT.on ? api.FOOT : api.P, mi = (x, z) => U.fmtMi(Math.hypot(x - P.x, z - P.z));
    if (!ownsTractor() && !r) return U.sec("Trailer runs", "by lorry") + `<p class="tnote2">Semitrailers stand in lay-bys outside Kjøllefjord, Lebesby and Mehamn. With a tractor unit of your own, loaded ones are posted here to be hauled from one lay-by to another. The garage sells one new; a used one turns up on Bytteboden, under Vehicles, now and then.</p>`;
    let h = U.sec("Trailer runs", r ? "one run at a time" : "couple it, haul it, stand it in the far lay-by");
    if (r) {
      const T = LIST.find(T => T.sp.id === r.id), B = bayOf(r.to); if (!T || !B) return "";
      const p = runPhase(r, T, B);
      h += U.tabCard({ tf: "rr:run", title: `${r.cargo[0].toUpperCase() + r.cargo.slice(1)} → ${B.name}`, chips: U.chip("UNDER WAY", "ok"), meta: `${(r.kg / 1000).toFixed(1)} t in the ${U.esc(T.def.name)} · ${U.esc(p.todo)} · ${mi(p.tgt.x, p.tgt.z)} from you`, pay: api.fmtCash(r.pay * api.payMul()), act: "rigrun:x", actLabel: "GIVE UP" });
    } else {
      const L = offers();
      for (const o of L) {
        const T = LIST.find(T => T.sp.id === o.id), B = bayOf(o.to), m = midOf(T), nb = nearBay(T, 60), mine = T.s.on != null && hostOf(T);
        h += U.tabCard({ tf: "rr:" + o.id, title: `${o.cargo[0].toUpperCase() + o.cargo.slice(1)} → ${B.name}`, chips: U.chip(T.def.name.toUpperCase()), meta: `${(o.kg / 1000).toFixed(1)} t · the ${U.esc(T.def.name)} ${mine ? "is on your lorry" : nb ? "stands in the " + U.esc(nb.name) : "stands where it was left"}, ${mi(m[0], m[1])} from you · ${U.fmtMi(o.m)} by road`, pay: api.fmtCash(o.pay * api.payMul()), act: "rigrun:" + o.id, actLabel: "TAKE" });
      }
      if (!L.length) h += `<p class="tnote2">No trailer runs posted right now.</p>`;
    }
    return h + `<p class="tnote2">A trailer run pays by the tonne and by the road. Stood clear of the road in the far lay-by it pays ${Math.round(RUN.bonus * 100)}% more.</p>`;
  },
  bind(el) { for (const b of el.querySelectorAll("[data-act^=rigrun]")) b.addEventListener("click", () => { const a = b.dataset.act.split(":")[1]; if (a === "x") giveUp(); else take(a); }); }
};

/* ---------------- each frame ---------------- */
function pose(T, dt) {
  const s = T.s, W = api.world, cam = api.camera;
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), lx = fz, lz = -fx, kx = s.x + fx * T.L, kz = s.z + fz * T.L;
  // the axles' sink in the snow: their rolling drag on the tractor
  let sk = 0;
  for (const sg of [1, -1]) {
    const x = s.x + lx * 0.93 * sg, z = s.z + lz * 0.93 * sg, ix = Math.round((x + W.half) / W.cell), iz = Math.round((z + W.half) / W.cell);
    const d = W.depthAt(ix, iz), f = W.freshAt(ix, iz), pk = f > 0.02 ? clamp(1 - d / f, 0, 1) : 1; sk += d * (0.35 + 0.65 * (1 - pk)) / 2;
  }
  T.sink = sk;
  if (T.px !== undefined) T.spin += ((s.x - T.px) * fx + (s.z - T.pz) * fz) / TLXS.WR;
  T.px = s.x; T.pz = s.z;
  if (Math.hypot(kx - cam.position.x, kz - cam.position.z) > RIG.far) { if (T.grp) { T.grp.visible = false; T.tri.visible = false; } return; }
  if (!T.grp) build(T);
  const yl = W.rideSurf(s.x + lx * 0.93, s.z + lz * 0.93), yr = W.rideSurf(s.x - lx * 0.93, s.z - lz * 0.93), ya = (yl + yr) / 2 - sk * 0.6;
  const yk = W.rideSurf(kx, kz) + (s.on != null ? 0.05 : 0);
  T.grp.visible = true;
  T.grp.position.set(kx, yk, kz); T.grp.rotation.set(-Math.atan2(yk - ya, T.L), s.yaw, Math.atan2(yl - yr, 1.86));
  for (const m of T.wheels) m.rotation.x = T.spin;
  T.legK += ((s.legs ? 1 : 0) - T.legK) * (1 - Math.exp(-3 * dt));
  T.legG.position.y = (1 - T.legK) * 0.42;
  const night = 1 - (api.dayFactor ? api.dayFactor() : 1);
  T.lampMat.color.setScalar(s.on != null ? 0.55 + 1.6 * night : 0.55 - 0.43 * night);
  const lf = left(T); T.tri.visible = lf;
  if (lf) {
    if (T.triS !== s.x + s.z + s.yaw) { T.triS = s.x + s.z + s.yaw; T.triP = triPt(T); }
    const q = T.triP; T.tri.position.set(q[0], W.rideSurf(q[0], q[1]), q[1]); T.tri.rotation.y = s.yaw;
    T.triMat.color.setHex(0xd8261c).multiplyScalar(0.4 + 0.6 * (1 - night));
  }
}
// you have left a coupled rig standing (swapped to the sled or another truck): say so, once per leaving
function leftTick() {
  for (const T of LIST) {
    if (T.s.on == null) { T.wasCur = false; continue; }
    const h = hostOf(T), cur = !!(h && h.cur);
    if (T.wasCur && !cur && left(T)) api.toast(`The lorry and its ${T.def.name} stay here, coupled${T.s.legs ? ", the legs down" : ""}. A warning triangle stands on the road behind the trailer; the rig is on the Map.`, "warn");
    T.wasCur = cur;
  }
}
function tick(dt) {
  if (!api || !LIST.length || !window.TLXV) return;
  try {
    for (const T of LIST) follow(T);
    if (api.started()) { coupleTick(); holdTick(); leftTick(); runTick(); }
    for (const T of LIST) { grid(T); pose(T, dt); }
  } catch (e) { if (!G.err) console.error("TLX rig tick", e); G.err = String(e); }
}
// what the tractor carries (TLXV.addLoad): one object per trailer, refilled in place
function loadOf(uid) {
  for (const T of LIST) if (T.s.on === uid) {
    const o = T.load, kg = T.def.kg, ax = kg * (1 - RIG.pin);
    const ex = Math.max(0, T.sink - 0.22);                           // the truck tyres' own rolling rule (tlx-vehicles.js core), less the bow wave
    o.kg = kg + cargoKg(T); o.pin = o.kg * RIG.pin; o.drag = (ax + cargoKg(T) * (1 - RIG.pin)) * 9.81 * (RIG.cr + 0.55 * Math.min(T.sink, 0.22) + 0.25 * ex + 0.4 * ex * ex); o.brakeN = Math.min(T.q.axles.length * RIG.brakeAxle, RIG.mu * (ax + cargoKg(T) * (1 - RIG.pin)) * 9.81); o.hold = !!T.s.legs; o.held = api.now() - (T.jkT ?? -99) < 0.5;
    return o;
  }
  return null;
}
const view = T => { const k = kingpin(T); return { id: T.sp.id, type: T.sp.type, name: T.def.name, x: T.s.x, z: T.s.z, yaw: T.s.yaw, kx: k[0], kz: k[1], on: T.s.on, legs: T.s.legs, art: T.art || 0, kg: T.def.kg, cargoKg: cargoKg(T), inBay: inBay(T), clear: clearOf(T), L: T.L, over: T.q.over, front: T.q.front, jk: api.now() - (T.jkT ?? -99) < 0.4, sink: T.sink, home: T.home, arm: T.arm, said: T.saidT, drag: T.load.drag, vis: !!(T.grp && T.grp.visible), legY: T.legG ? T.legG.position.y : null, nW: T.wheels ? T.wheels.length : 0, left: left(T), tri: !!(T.tri && T.tri.visible), triP: T.tri && T.tri.visible ? [T.tri.position.x, T.tri.position.y, T.tri.position.z] : null, lamp: T.lampMat ? T.lampMat.color.r : null }; };
Object.assign(G, {
  list: () => LIST.map(view),
  kingpin: id => { const T = LIST.find(T => T.sp.id === id); return T ? kingpin(T) : null; },
  legsPt: id => { const T = LIST.find(T => T.sp.id === id); return T ? legsPt(T) : null; },
  fifth: uid => { const h = window.TLXV && TLXV.pose(uid); return h && h.def.fifthZ != null ? fifth(h) : null; },
  grp: id => { const T = LIST.find(T => T.sp.id === id); return T ? T.grp : null; },
  pass, bodies,
  offers, run: () => runOf(), take, giveUp, bays: () => LIST.filter(T => T.bay).map(T => T.bay), row: jobRow, ownsTractor,
  circles: id => { const T = LIST.find(T => T.sp.id === id); return T && T.obs ? T.obs.map(o => ({ x: o.x, z: o.z, r: o.r, u: o.u, front: o.front })) : null; }
});
window.TLXRIG = G;

TLX.register({
  id: "rig", v: 1,
  state0: () => ({ t: {}, run: null, done: 0, told: 0 }),
  migrate: st => st,
  init(a) {
    api = a; TH = a.THREE;
    try {
      if (!window.TLXV || !window.TLXS || !window.TLXR) { G.err = "needs vehicles, semis and roads"; return; }
      const st = S(), W = a.world; if (!st.t || typeof st.t !== "object" || Array.isArray(st.t)) st.t = {};
      const taken = new Set(), lim = W.half - 30;
      for (const sp of RIG.spots) {
        const def = TRAILERS[sp.type], q = TLXS.TYPES[sp.type].tl, home = findBay(sp);
        if (home) W.addLane(home.lane, 2.6, 0.9); else G.miss.push(sp.id);
        let s = st.t[sp.id];
        if (!s || typeof s !== "object" || ![s.x, s.z, s.yaw].every(NUM) || Math.abs(s.x) > lim || Math.abs(s.z) > lim) s = home ? { x: home.x, z: home.z, yaw: home.yaw, on: null, legs: 1 } : null;
        if (!s) { delete st.t[sp.id]; continue; }
        const h = typeof s.on === "string" || typeof s.on === "number" ? TLXV.pose(s.on) : null;
        if (!h || h.def.fifthZ == null || taken.has(s.on)) { s.on = null; s.legs = 1; } else { taken.add(s.on); s.legs = s.legs ? 1 : 0; }
        st.t[sp.id] = s;
        const T = { sp, s, def, q, L: q.L, spin: 0, arm: true, sink: 0, art: 0, home: home ? { x: home.x, z: home.z, yaw: home.yaw, s: home.s } : null, load: { kg: 0, pin: 0, drag: 0, brakeN: 0, hold: false } };
        // the lay-by as a place to bring a trailer to (3.5b3a): the middle of the plowed room in front of its own trailer
        if (home) { const u = q.L + RIG.approach / 2; T.bay = { id: sp.id, name: sp.bay, x: home.x + Math.sin(home.yaw) * u, z: home.z + Math.cos(home.yaw) * u, yaw: home.yaw }; }
        LIST.push(T); follow(T); solidInit(T); grid(T);
      }
      { const r = st.run, ok = r && typeof r === "object" && LIST.some(T => T.sp.id === r.id) && bayOf(r.to) && typeof r.cargo === "string" && r.cargo && r.kg > 0 && r.kg < 30000 && r.pay >= 0 && NUM(r.pay); if (!ok) st.run = null; st.done = NUM(st.done) ? st.done | 0 : 0; }
      if (a.jobx && !a.jobx.includes(jobRow)) a.jobx.push(jobRow);
      if (a.appx) { const L = a.appx("freight"); if (!L.includes(SECT)) L.push(SECT); }
      TLXV.addLoad(loadOf);
      if (a.footx && !a.footx.includes(PROV)) a.footx.push(PROV);
      const prev = a.veh.camTow;                                     // the chase camera backs off to show the trailer
      a.veh.camTow = () => { const p = prev ? prev() : 0, uid = TLXV.state().cur; if (uid == null || a.FOOT.on) return p; const T = LIST.find(T => T.s.on === uid); return T ? Math.max(p, T.L + T.q.over + 1.4) : p; };
      a.TABLET.addLayer("vehicles", () => { const cur = TLXV.state().cur, out = []; for (const T of LIST) if (T.s.on == null || T.s.on !== cur || a.FOOT.on) { const k = kingpin(T); out.push({ x: (T.s.x + k[0]) / 2, z: (T.s.z + k[1]) / 2, name: T.def.name[0].toUpperCase() + T.def.name.slice(1), kind: "truck" }); } const r = runOf(), B = r && bayOf(r.to); if (B) out.push({ x: B.x, z: B.z, name: B.name + " · trailer run", kind: "truck" }); return out; });
    } catch (e) { console.error("TLX rig", e); G.err = String(e); }
  },
  tick,
  save() { for (const T of LIST) { const s = T.s; s.x = Math.round(s.x * 100) / 100; s.z = Math.round(s.z * 100) / 100; s.yaw = Math.round(s.yaw * 1e4) / 1e4; } }
});
})();
