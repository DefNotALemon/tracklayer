// Slice 6.3b2a (G4): the oil driver seen in the world (tlx-lights.js v5). The run is a real line over the ground,
// the driver's sled (a touring sled in their own colour, a freight sledge with the drums, the driver in the saddle)
// rides it at a sled's honest pace, and stands parked beside the quay between trips.
// Asserts, exit 1 on a failure. NOSTILLS=1 skips the stills.
//  A. the run to each of the three lights: by land all the way (no point in the sea or inside anything standing),
//     starts at the quay spot, ends at the light, no kink, a sane length; the quay spot is clear ground off the streets.
//  B. no driver, no sled. Hired: the sled stands at the quay, nobody on it, no drums, solid, on the snow.
//  C. loading: the drums stand on the sledge.
//  D. out: the driver is in the saddle, the drums ride behind, the sled moves at DRV.vOut (a game hour = 50 s) with no
//     jumps or stalls frame to frame, on the snow, on the run, the Map pin with it, a pressed track behind it.
//  E. far from you it is not drawn; back near it, it is.
//  F. a storm over them: it stops where it is, the driver still on it.
//  G. the drums land: it turns for home empty; back at the quay it is parked with nobody on it.
//  H. a reload mid-trip puts it back on the run where it was.
//  I. let go: the sled is gone and so is its place at the quay.
import { boot, reload, ev, sleep, shot, done, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const STILLS = !process.env.NOSTILLS;
const still = async n => { if (STILLS) await shot(n); };
const pass = (hours, st = 0.25) => ev(`(() => { for (let t = 0; t < ${hours} - 1e-9; t += ${st}) { GS.hour += ${st}; TLX.state("staff").crew.forEach(q => q.hap = 70); TLX.lights.step(); } return true; })()`);
const warm = () => ev(`window.__warm = window.__warm || setInterval(() => { GS.warmth = 100; if (TLX.state("staff")) TLX.state("staff").crew.forEach(q => q.hap = 70); }, 300); true`);
const calm = () => ev(`WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; true`);
const D = () => J(`Object.assign({}, TLX.lights.drv(), { pins: TLX.lights.drvPins() })`);
// the sled as drawn
const V = () => J(`(() => { const d = TLX.lights.sled(), g = d.g, sg = d.sg; if (!g) return { built: false, vis: false };
  return { built: true, vis: g.visible, x: g.position.x, y: g.position.y, z: g.position.z, yaw: g.rotation.y, surf: surf(g.position.x, g.position.z), rider: d.rider.visible, n: d.drums.filter(q => q.visible).length,
    sx: sg.position.x, sy: sg.position.y, sz: sg.position.z, ssurf: surf(sg.position.x, sg.position.z), svis: sg.visible, moving: d.moving, v: d.v, obs: d.obs ? d.obs.length : 0, glow: d.glow.visible, lamp: d.lamp.visible }; })()`);
// stand the player (on foot) at a point; the sled out of the way
const stand = (x, z) => ev(`(() => { if (INT.on) intGoOut(); crashCancel(); FOOT.on = true; FOOT.x = ${x}; FOOT.z = ${z}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.vx = FOOT.vz = 0; recenter(FOOT.x, FOOT.z, true); return true; })()`);
// a camera of our own (lib's sideCam orbits the player; reload drops its hook)
const cam = (expr) => ev(`(() => { if (!window.__camHk) { window.__camHk = 1; const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.__cam) window.__cam(c); _r(s, c); }; } window.__cam = ${expr}; return true; })()`);
const sledCam = (side, back, up) => cam(`c => { const g = TLX.lights.sled().g; if (!g || !g.visible) return; const y = g.rotation.y, fx = Math.sin(y), fz = Math.cos(y), lx = Math.cos(y), lz = -Math.sin(y), tx = g.position.x - fx * 1.2, tz = g.position.z - fz * 1.2; c.position.set(tx + lx * ${side} - fx * ${back}, Math.max(surf(tx + lx * ${side} - fx * ${back}, tz + lz * ${side} - fz * ${back}) + 0.6, g.position.y + ${up}), tz + lz * ${side} - fz * ${back}); c.lookAt(tx, g.position.y + 0.8, tz); }`);

await boot(); await warm(); await calm();
await ev(`tutSkip(); crashCancel(); GS.hour = 34; GS.cash = 90000; GS.apps.realestate = 1; TLX.state("staff").apps = []; TLX.state("staff").next = 1e9; true`);
await sleep(1200); await park();

// ---- A: the runs
await ev(`TLX.prop.buy("slettnes"); TLX.prop.buy("finnkirka"); TLX.prop.buy("kinnarodden"); TLX.lights.step(); TLX.staff.tick(); true`); await sleep(500);
const A = await J(`(() => { const out = {}, L = TLX.lights, q = L.quaySpot();
  out.quay = { d: Math.hypot(q.x - depot.x, q.z - depot.z), sea: isSea(q.x, q.z), ob: obNear(q.x, q.z, 2.5), slope: slopeAt(q.x, q.z, 3) };
  for (const lp of L.LAMPS) { const t0 = performance.now(), R = L.route(lp.id), ms = performance.now() - t0, to = lp.site(TLX.api.world); if (!R) { out[lp.id] = null; continue; }
    let sea = 0, ob = 0, turn = 0, steep = 0, ti = 0; const P = R.pts;
    for (let i = 0; i < P.length; i++) { if (isSea(P[i][0], P[i][1])) sea++; if (i > 1 && obNear(P[i][0], P[i][1], 2.2)) ob++; if (slopeAt(P[i][0], P[i][1], 6) > 0.6) steep++;
      if (i > 5 && i < P.length - 1) { const a = Math.atan2(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]), b = Math.atan2(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); const tt = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))); if (tt > turn) { turn = tt; ti = i; } } }
    out[lp.id] = { n: P.length, len: Math.round(R.len), line: Math.round(Math.hypot(to.x - q.x, to.z - q.z)), sea, ob, steep, turn: +turn.toFixed(2), ti, tsea: [3, 6, 9, 14].map(r => { let n = 0; for (let k = 0; k < 8; k++) if (isSea(P[ti][0] + Math.cos(k * 0.785) * r, P[ti][1] + Math.sin(k * 0.785) * r) || obNear(P[ti][0] + Math.cos(k * 0.785) * r, P[ti][1] + Math.sin(k * 0.785) * r, 2.4)) n++; return n; }), bad: R.bad, ms: Math.round(ms),
      d0: Math.hypot(P[0][0] - q.x, P[0][1] - q.z), d1: Math.round(Math.hypot(P[P.length - 1][0] - to.x, P[P.length - 1][1] - to.z)) }; }
  return out; })()`);
console.log("A", JSON.stringify(A));
ok(A.quay.d >= 10 && A.quay.d <= 24 && !A.quay.sea && !A.quay.ob && A.quay.slope < 0.25, "A: the sled's place at the quay is clear, dry, near-flat ground 10-24 m from the depot: " + JSON.stringify(A.quay));
for (const id of ["slettnes", "finnkirka", "kinnarodden"]) {
  const r = A[id];
  ok(r && r.sea === 0 && r.ob === 0 && r.bad === 0, `A: the run to ${id} is by land all the way and touches nothing standing: ` + JSON.stringify(r));
  ok(r && r.d0 < 0.5 && r.d1 <= 40 && r.len > r.line * 0.98 && r.len < r.line * 2.6 && r.turn < 0.6 && r.steep < r.n * 0.03, `A: ${id}: from the quay to the light, ${r && r.len} m for ${r && r.line} m in a line, sharpest turn ${r && r.turn} rad in 6 m (past the pull-out from its place at the quay)`);
}

// ---- B: nobody hired, nothing drawn; hired, it stands at the quay
const q0 = await J(`TLX.lights.quaySpot()`);
await stand(q0.x + 14, q0.z + 9); await sleep(600);
let v = await V();
ok(!v.vis && !v.obs, "B: no driver: no sled at the quay");
for (const id of ["slettnes", "finnkirka", "kinnarodden"]) await ev(`(() => { const r = TLX.lights.rec("${id}"); r.oil = TLX.lights.num("${id}", "tank"); r.store = 0; r.q = 0; r.on = true; TLX.state("lights").hT = GS.hour; return true; })()`);
const did = await ev(`(() => { const a = TLX.staff.post({ id: "oil:quay", role: "oildriver" }); Object.assign(a, { name: "Mikkel Utsi", xp: 6, xpReal: 6, wage: 98 }); a.tr = Object.assign(a.tr || {}, { honest: true, temper: 0.2, work: 1 }); TLX.staff.hire(a.id); TLX.lights.drv().so = false; return a.id; })()`);
await sleep(1900);   // (the trip record is theirs from the next step of the clock, once a game second)
await sleep(700); v = await V();
const b1 = await J(`(() => { const q = TLX.lights.quaySpot(); return { ob: obNear(q.x, q.z, 0.2), w: TLX.lights.driverWork() }; })()`);
ok(v.vis && v.svis && !v.rider && v.n === 0 && v.obs === 2 && b1.ob && Math.hypot(v.x - q0.x, v.z - q0.z) < 0.3, "B: hired: the sled stands at the quay with its sledge, nobody on it, no drums, solid: " + JSON.stringify([v.vis, v.rider, v.n, v.obs, b1]));
ok(Math.abs(v.y - v.surf) < 0.2 && Math.abs(v.sy - v.ssurf) < 0.2 && Math.hypot(v.sx - v.x, v.sz - v.z) > 3 && Math.hypot(v.sx - v.x, v.sz - v.z) < 5, `B: sled and sledge sit on the snow (${(v.y - v.surf).toFixed(2)} / ${(v.sy - v.ssurf).toFixed(2)} m), the sledge ${Math.hypot(v.sx - v.x, v.sz - v.z).toFixed(1)} m behind`);
await sledCam(4.2, -0.6, 1.5); await sleep(400); await still("x6s_b_parked");

// ---- C: loading
await ev(`(() => { TLX.lights.rec("finnkirka").oil = 10; GS.cash += 0; TLX.lights.order("finnkirka"); TLX.lights.order("finnkirka"); return true; })()`);
await pass(0.25); await sleep(500); v = await V(); let d = await D();
ok(d.st === "quay" && d.w > 0 && v.n === 2 && !v.rider, "C: loading: two drums stand on the sledge at the quay: " + JSON.stringify([d.st, d.w, v.n]));
await still("x6s_c_loading");

// ---- D: out on the run
await pass(0.5); d = await D();
ok(d.st === "out" && d.lamp === "finnkirka" && d.n === 2 && Math.abs(d.d - A.finnkirka.len) < 2, `D: away with two drums; the trip is the run's own length (${Math.round(d.d)} m)`);
// stand beside the run 260 m out and let the game's own clock carry them past
await pass(0.25); d = await D();
const ahead = await J(`(() => { const R = TLX.lights.route("finnkirka"), a = TLX.lights.posAt(R, ${d.p} + 150); return { x: a.x + a.tz * 16, z: a.z - a.tx * 16 }; })()`);
await stand(ahead.x, ahead.z); await sleep(800);
await ev(`(() => { window.__tr = []; if (!window.__trH) { window.__trH = 1; const f = () => { const s = TLX.lights.sled(); if (s.g && s.g.visible && window.__tr) window.__tr.push([gameClock, s.g.position.x, s.g.position.z, s.g.position.y, surf(s.g.position.x, s.g.position.z)]); requestAnimationFrame(f); }; requestAnimationFrame(f); } return true; })()`);
await sledCam(3.6, -0.2, 1.5);
const t0 = await ev("gameClock"); let shotN = 0;
while ((await ev("gameClock")) - t0 < 7) { await sleep(500); if (shotN < 3 && (await ev("gameClock")) - t0 > 2 + shotN * 1.2) { await still("x6s_d_out" + (++shotN)); } }
const tr = await J(`window.__tr`); await ev(`window.__tr = null; true`);
v = await V(); d = await D();
// speed over the whole window, and frame to frame (after the first 1.5 s: the first step sets the pace)
const T = tr.filter(q => q[0] - tr[0][0] > 1.5);
let dist = 0, vmax = 0, vmin = 1e9, off = 0; const W8 = [];
for (let i = 1; i < T.length; i++) { const dd = Math.hypot(T[i][1] - T[i - 1][1], T[i][2] - T[i - 1][2]); dist += dd; off = Math.max(off, Math.abs(T[i][3] - T[i][4])); }
// pace over half-second windows (frame steps are too short to divide cleanly)
for (let i = 0; i < T.length; i++) { let j = i; while (j < T.length && T[j][0] - T[i][0] < 0.5) j++; if (j >= T.length) break; let dd = 0; for (let k = i + 1; k <= j; k++) dd += Math.hypot(T[k][1] - T[k - 1][1], T[k][2] - T[k - 1][2]); W8.push(dd / (T[j][0] - T[i][0])); }
for (const w of W8) { vmax = Math.max(vmax, w); vmin = Math.min(vmin, w); }
const vAvg = dist / (T[T.length - 1][0] - T[0][0]), want = (await ev("TLX.lights.DRV.vOut")) / 50;
console.log("D pace", JSON.stringify({ frames: T.length, vAvg: +vAvg.toFixed(2), want, vmin: +vmin.toFixed(2), vmax: +vmax.toFixed(2), off: +off.toFixed(2) }));
ok(v.vis && v.rider && v.n === 2 && v.moving && v.lamp, "D: the driver is in the saddle and two drums ride on the sledge: " + JSON.stringify([v.vis, v.rider, v.n, v.moving]));
ok(Math.abs(vAvg - want) < want * 0.15, `D: it rides at ${vAvg.toFixed(1)} m/s (the haul's own pace is ${want.toFixed(1)} m/s: ${(want * 3.6).toFixed(0)} km/h)`);
ok(vmin > want * 0.55 && vmax < want * 1.6, `D: no stalls and no jumps: half-second pace ${vmin.toFixed(1)}-${vmax.toFixed(1)} m/s`);
ok(off < 0.45, `D: it stays on the snow (${off.toFixed(2)} m off the surface at most)`);   // (the sled bridges the snow nose to tail: on the hummocks 300-450 m out that alone is up to 0.43 m from the snow under its middle, measured along the run)
const pin = d.pins[0] || { x: 1e9, z: 1e9 };
const onRun = await J(`(() => { const R = TLX.lights.route("finnkirka"), g = TLX.lights.sled().g; let b = 1e9; for (const p of R.pts) b = Math.min(b, Math.hypot(p[0] - g.position.x, p[1] - g.position.z)); return b; })()`);
ok(onRun < 4 && Math.hypot(pin.x - v.x, pin.z - v.z) < 40, `D: on the run (${onRun.toFixed(1)} m off its line) and the Map pin is with it (${Math.hypot(pin.x - v.x, pin.z - v.z).toFixed(0)} m)`);
// the track it pressed: the cells along the line it rode, about 12 m back
const pk = await J(`(() => { const s = TLX.lights.sled(), g = s.g, y = g.rotation.y; let best = 0; for (let b = 8; b < 20; b += 0.5) for (const o of [-0.3, 0, 0.3]) { const x = g.position.x - Math.sin(y) * b + Math.cos(y) * o, z = g.position.z - Math.cos(y) * b - Math.sin(y) * o, ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL); best = Math.max(best, packOf(depthAt(ix, iz), freshAt(ix, iz))); } return best; })()`);
ok(pk > 0.2, `D: it leaves a pressed track (pack ${pk.toFixed(2)} behind it)`);
await sledCam(-3.2, -4.5, 1.7); await sleep(300); await still("x6s_d_front");
await sledCam(1.2, 6.5, 2.2); await sleep(300); await still("x6s_d_behind");
// draw calls with it in view, and without
const calls = async () => { await sleep(250); return ev("renderer.info.render.calls"); };
const c1 = await calls(); await ev(`TLX.lights.sled().g.visible = false; TLX.lights.sled().sg.visible = false; true`);
const c0 = await J(`(() => { const s = TLX.lights.sled(); s.g.visible = s.sg.visible = false; renderer.render(scene, camera); return renderer.info.render.calls; })()`);
console.log("draw calls with / without the oil sled:", c1, c0);
ok(c1 - c0 < 420, `D: the sled costs ${c1 - c0} draw calls in view`);

// ---- F: a storm sits them down where they are
await ev(`WX.at = () => 1; true`); await sleep(4200);   // (beta 0334 #2: it coasts to its stop; on a loaded machine 2.6 s caught the end of that)
const f0 = await V(); await sleep(1500); const f1 = await V(); d = await D();
ok(d.held && f1.vis && f1.rider && !f1.moving && Math.hypot(f1.x - f0.x, f1.z - f0.z) < 0.5, `F: a storm over them: stopped where they are, still on the sled (moved ${Math.hypot(f1.x - f0.x, f1.z - f0.z).toFixed(2)} m in 1.5 s)`);
await ev(`WX.at = () => 0; true`);
// night: the headlamp glows
await ev(`GS.hour = Math.floor(GS.hour / 24) * 24 + 23.5; TLX.state("lights").hT = GS.hour; true`); await sleep(1500);
v = await V(); ok(v.glow, "F: in the dark the headlamp shows");
await sledCam(-3.5, -6, 1.6); await sleep(300); await still("x6s_f_night");

// ---- E: far off it is not drawn
await stand(ahead.x + 1500, ahead.z + 900); await sleep(700); v = await V();
const far = await J(`(() => { const g = TLX.lights.sled().g, a = TLX.lights.sled().at; return Math.hypot(FOOT.x - a.x, FOOT.z - a.z); })()`);
ok(!v.vis && !v.svis && far > 900, `E: ${Math.round(far)} m from you it is not drawn`);

// ---- G: the drums land; home empty; parked
let h = 0; while (h < 14 && ["out", "unload"].includes((await D()).st)) { await pass(0.25); h += 0.25; }   // (6.3b2b: the stop at the light, the drums carried in, is part of the trip)
d = await D(); const fk = await J(`TLX.lights.rec("finnkirka")`);
ok(d.st === "back" && fk.store === 120 && h > 2, `G: ${h} game hours out at a sled's pace and the two drums are in Finnkirka's store`);
await pass(1); d = await D();
const back = await J(`(() => { const R = TLX.lights.route("finnkirka"), q = TLX.lights.drv(), a = TLX.lights.posAt(R, (1 - q.p / q.d) * R.len - 120); return { x: a.x - a.tz * 14, z: a.z + a.tx * 14, tx: a.tx, tz: a.tz }; })()`);
await stand(back.x, back.z); await sleep(2600); v = await V();
const hd = Math.sin(v.yaw) * back.tx + Math.cos(v.yaw) * back.tz;
ok(d.st === "back" && v.vis && v.rider && v.n === 0 && hd < -0.7, `G: on the way home: the driver aboard, the sledge empty, heading back down the run (${hd.toFixed(2)})`);
await sledCam(4.2, -0.4, 1.6); await sleep(300); await still("x6s_g_back");
h = 0; while (h < 12 && (await D()).st !== "quay") { await pass(0.25); h += 0.25; }
await stand(q0.x + 14, q0.z + 9); await sleep(900); v = await V(); d = await D();
ok(d.st === "quay" && v.vis && !v.rider && v.n === 0 && v.obs === 2 && Math.hypot(v.x - q0.x, v.z - q0.z) < 0.3, "G: back at the quay: parked in its place, nobody on it");

// ---- H: a reload mid-trip
await ev(`(() => { TLX.lights.rec("kinnarodden").oil = 8; TLX.lights.order("kinnarodden"); return true; })()`);
await pass(2.5); d = await D();
const before = await J(`TLX.lights.drvPos()`);
await ev(`save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(sv); await warm(); await calm(); await sleep(1500);
await ev(`tutSkip(); true`); await sleep(400);
await stand(before.x + 20, before.z + 12); await sleep(1800);
v = await V(); const d2 = await D();
ok(d.st === "out" && d2.st === "out" && d2.lamp === "kinnarodden" && v.vis && v.rider && v.n === 1 && Math.hypot(v.x - before.x, v.z - before.z) < 80, `H: a reload mid-trip: on the run to Kinnarodden where it was (${Math.hypot(v.x - before.x, v.z - before.z).toFixed(0)} m on), one drum aboard`);
await sledCam(4.2, -0.4, 1.6); await sleep(300); await still("x6s_h_reload");

// ---- J: at a sled's pace the run still keeps three lights: keepers, the driver, the standing order, ten days, no input
await ev(`(() => { for (const id of ["slettnes", "finnkirka", "kinnarodden"]) { const a = TLX.staff.post({ id: "lt:" + id, role: "keeper" }); Object.assign(a, { xp: 6, xpReal: 6, wage: 60 }); a.tr = Object.assign(a.tr || {}, { honest: true, temper: 0.2, work: 1 }); TLX.staff.hire(a.id); } TLX.lights.drv().so = true; GS.cash = 90000; return true; })()`);
const jr = await J(`(() => { const L = TLX.lights, ids = ["slettnes", "finnkirka", "kinnarodden"], darkH = { slettnes: 0, finnkirka: 0, kinnarodden: 0 }; let trips = 0, last = L.drv().st, late0 = 0;
  for (let t = 0; t < 240 - 1e-9; t += 0.25) { GS.hour += 0.25; TLX.state("staff").crew.forEach(q => q.hap = 70); L.step(); for (const id of ids) if (L.out(id)) darkH[id] += 0.25; const st = L.drv().st; if (st === "out" && last !== "out") trips++; last = st; }
  return { darkH, trips, cash: Math.round(90000 - GS.cash), drums: ids.map(id => Math.round(L.rec(id).store / 60)), oil: ids.map(id => Math.round(L.rec(id).oil)) }; })()`);
console.log("J", JSON.stringify(jr));
ok(jr.darkH.slettnes === 0 && jr.darkH.finnkirka === 0 && jr.darkH.kinnarodden === 0 && jr.trips >= 6, `J: ten days at a sled's pace, three kept lights, one driver, the standing order: never dark, ${jr.trips} trips, $${jr.cash} of paraffin`);

// ---- I: let go
await ev(`TLX.staff.letGo(${did}); true`); await sleep(1500); v = await V();
const i1 = await J(`(() => { const q = TLX.lights.quaySpot(); return obNear(q.x, q.z, 0.2); })()`);
ok(!v.vis && !v.svis && v.obs === 0 && !i1, "I: let go: the sled is gone, and nothing stands in its place at the quay");
await done(fails ? 1 : 0);
