// Slice 3.4a (G4): a few drivers on the open roads. Asserts, exit 1 on a failure.
//  A. built with no error: TLXT.n cars (6 on high), drivable routes, every placed car on an open road, 4 meshes,
//     a handful of draw calls; the bubble placed them 220-1300 m from you at boot.
//  B. one car driven on the longest road for 25 game s: it moves, keeps to the right-hand lane (within 0.4 m of the
//     lane line, right of the crown), never over 12.5 m/s, never over sqrt(1.9 R) + 0.5 in a bend.
//  C. your sled parked in its lane ahead: it stops 6-9 m short (centre to centre) and waits.
//  D. the stretch ahead snowed in: it stops before the drift (15-30 m short of the stretch), then turns round in the
//     road and drives back the other way in the other lane.
//  E. the sled ridden into the stopped car at ~9 m/s: pushed out (never inside the car's circles), loses its speed,
//     a bump counted and a toast, no crash.
//  F. a walker in its lane: it stops; a walker against its side is pushed clear.
//  G. option off: hidden and frozen; on again: back.
//  H. night: the lamps are brighter than by day.
//  I. the bubble: you far from every road car -> they turn up again 600-1400 m from you.
import { boot, ev, sleep, done, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const NOSTILLS = !!process.env.NOSTILLS;
let camHooked = false;
async function carCam(dist = 12, h = 4, yo = 0.9) {
  if (!camHooked) { await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`); camHooked = true; }
  await ev(`(() => { window.camOv = c => { const C = TLXT.cars[0]; const a = C.yaw + Math.PI + ${yo}; c.position.set(C.x + Math.sin(a) * ${dist}, C.y + ${h}, C.z + Math.cos(a) * ${dist}); c.lookAt(C.x, C.y + 0.8, C.z); }; return true; })()`);
  await sleep(300);
}
const camOff = () => ev("window.camOv = null; true");

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);

// ---- A
const A = await J(`(() => { const T = TLXT; return { ready: T.ready, err: T.err, tickErr: T.tickErr || null, ms: T.ms, n: T.n, cars: T.cars.length, routes: T.routes.map(r => r.id + ":" + Math.round(r.len)),
  on: T.cars.filter(c => c.on).length, offRoad: T.cars.filter(c => c.on && TLXR.near(c.x, c.z).d > 2.6).length,
  dist: T.cars.filter(c => c.on).map(c => Math.round(Math.hypot(c.x - P.x, c.z - P.z))), meshes: T.group ? T.group.children.length : 0 }; })()`);
console.log("traffic:", JSON.stringify(A));
ok(A.ready && !A.err && !A.tickErr, "A: traffic built with no error (" + A.ms + " ms)");
ok(A.n === 6 && A.cars === 6, "A: " + A.cars + " drivers on the high preset");
ok(A.routes.length >= 4, "A: " + A.routes.length + " drivable roads");
ok(A.on >= 4 && A.offRoad === 0, "A: " + A.on + " cars placed, " + A.offRoad + " off the road");
ok(A.dist.every(d => d >= 200 && d <= 1350), "A: placed round you at " + A.dist.join(", ") + " m");
ok(A.meshes === 4, "A: four instanced meshes (" + A.meshes + ")");

// ---- B: drive one car
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const s0 = await J(`(() => { const r = TLXT.routes.find(q => q.id === "${rid}"); return r.s0 + Math.min(900, r.len * 0.3); })()`);
await ev(`(() => { const c = TLXT.place("${rid}", ${s0}, 1); const p = TLXT.lanePt("${rid}", ${s0} - 400, 1); P.x = p.cx + 60; P.z = p.cz + 60; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); window.__ss = []; return true; })()`);
await waitGame(0.5);
let Bmax = 0, Blane = 0, Bside = 1e9, Bbend = 0;
const Bs0 = await J(`TLXT.cars[0].s`);
{ const t0 = await clock(); while ((await clock()) - t0 < 25) {
  const q = await J(`(() => { const c = TLXT.cars[0], lp = TLXT.lanePt("${rid}", c.s, c.dir), r = c.r, k = c.k;
    const R = (k >= 2 && k < r.pts.length - 2) ? TLXR.turnR(r.pts, k) : 1e9, fx = Math.sin(lp.yaw), fz = Math.cos(lp.yaw);
    return { v: c.v, st: c.st, lane: Math.hypot(c.x - lp.x, c.z - lp.z), side: (c.x - lp.cx) * -fz + (c.z - lp.cz) * fx, R, street: r.street[k] }; })()`);
  if (q.st === "drive" && !q.street) { Bmax = Math.max(Bmax, q.v); Blane = Math.max(Blane, q.lane); Bside = Math.min(Bside, q.side); if (q.R < 200) Bbend = Math.max(Bbend, q.v - Math.sqrt(1.9 * q.R)); }
  await sleep(150);
} }
const B = await J(`({ s: TLXT.cars[0].s, v: TLXT.cars[0].v, why: TLXT.cars[0].why })`);
console.log("B:", JSON.stringify({ ds: B.s - Bs0, Bmax, Blane, Bside, Bbend, why: B.why }));
ok(B.s - Bs0 > 120, "B: drove " + Math.round(B.s - Bs0) + " m in 25 game s");
ok(Bmax <= 12.55 && Bmax > 6, "B: top speed " + Bmax.toFixed(2) + " m/s (<= 12.5)");
ok(Blane < 0.4 && Bside > 1.0, "B: in the right-hand lane (off the lane line " + Blane.toFixed(2) + " m, right of the crown " + Bside.toFixed(2) + " m)");
ok(Bbend <= 0.5, "B: never faster than a bend holds (worst +" + Bbend.toFixed(2) + " m/s)");
if (!NOSTILLS) { await carCam(); await shot("x3t_b_driving"); await carCam(22, 9, 0.5); await shot("x3t_b_wide"); await camOff(); }

// ---- C: your sled in its lane ahead
await ev(`(() => { const c = TLXT.cars[0], p = TLXT.lanePt("${rid}", c.s + 70, 1); P.x = p.x; P.z = p.z; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vz = 0; P.yaw = p.yaw; return true; })()`);
let Cmin = 1e9; { const t0 = await clock(); while ((await clock()) - t0 < 16) { const d = await J(`Math.hypot(TLXT.cars[0].x - P.x, TLXT.cars[0].z - P.z)`); Cmin = Math.min(Cmin, d); await sleep(120); } }
const C = await J(`({ v: TLXT.cars[0].v, why: TLXT.cars[0].why, d: Math.hypot(TLXT.cars[0].x - P.x, TLXT.cars[0].z - P.z) })`);
console.log("C:", JSON.stringify(C), "closest", Cmin.toFixed(2));
ok(C.v < 0.3 && C.why === "you", "C: stopped for your sled (v " + C.v.toFixed(2) + ", why " + C.why + ")");
ok(C.d >= 6 && C.d <= 9.5 && Cmin >= 6, "C: stands " + C.d.toFixed(1) + " m short (closest " + Cmin.toFixed(1) + ")");
if (!NOSTILLS) { await carCam(14, 5, 1.6); await shot("x3t_c_stopped"); await camOff(); }

// ---- E: ride into it
await ev(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); P.x = c.x + fx * 16; P.z = c.z + fz * 16; P.y = surf(P.x, P.z) + 0.2; P.yaw = c.yaw + Math.PI; P.vx = -fx * 9; P.vz = -fz * 9; window.__h0 = TLXT.hits; window.__crash = false; window.__minD = 1e9; return true; })()`);
{ const t0 = await clock(); while ((await clock()) - t0 < 3) { await ev(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); if (Math.hypot(P.vx, P.vz) > 1) { P.vx = -fx * 9; P.vz = -fz * 9; } let m = 1e9; for (const u of [-1.45, 0, 1.45]) m = Math.min(m, Math.hypot(P.x + Math.sin(P.yaw) * 1.15 - c.x - fx * u, P.z + Math.cos(P.yaw) * 1.15 - c.z - fz * u)); window.__minD = Math.min(window.__minD, m); if (CRASH.on) window.__crash = true; return true; })()`); await sleep(40); if (await J(`TLXT.hits > window.__h0`)) break; } }
await waitGame(0.6);
const E = await J(`({ hits: TLXT.hits - window.__h0, v: Math.hypot(P.vx, P.vz), crash: window.__crash || CRASH.on, minD: window.__minD, toasts: [...document.querySelectorAll("#toasts > *")].map(e => e.textContent).filter(t => /car/.test(t)).length + TOASTQ.filter(t => /car/.test(t.msg || t.text || t)).length })`);
console.log("E:", JSON.stringify(E));
ok(E.hits >= 1 && E.toasts >= 1, "E: a bump counted, with a toast (" + E.hits + ", " + E.toasts + ")");
ok(E.v < 4.5 && !E.crash, "E: the sled lost over half its 9 m/s (bounced off at " + E.v.toFixed(2) + " m/s, as off a boulder), no crash");
ok(E.minD >= 1.4, "E: never inside the car (nose to circle " + E.minD.toFixed(2) + " m, touching at 1.57)");

// ---- F: a walker
await ev(`(() => { crashCancel(); P.vx = P.vz = 0; const c = TLXT.cars[0]; const p = TLXT.lanePt("${rid}", c.s - 400, 1); P.x = p.cx + 60; P.z = p.cz + 60; P.y = surf(P.x, P.z) + 0.3; return true; })()`);
await waitGame(4);   // the car pulls away
await ev(`(() => { const c = TLXT.cars[0], p = TLXT.lanePt("${rid}", c.s + 45 * c.dir, c.dir); FOOT.on = true; FOOT.x = p.x; FOOT.z = p.z; FOOT.y = surf(p.x, p.z); return true; })()`);
let Fmin = 1e9; { const t0 = await clock(); while ((await clock()) - t0 < 12) { await ev(`(() => { const c = TLXT.cars[0], p = TLXT.lanePt("${rid}", c.s + 0, c.dir); return true; })()`); const d = await J(`Math.hypot(TLXT.cars[0].x - FOOT.x, TLXT.cars[0].z - FOOT.z)`); Fmin = Math.min(Fmin, d); await sleep(120); } }
const F1 = await J(`({ v: TLXT.cars[0].v, why: TLXT.cars[0].why })`);
console.log("F:", JSON.stringify(F1), "closest", Fmin.toFixed(2));
ok(F1.v < 0.3 && F1.why === "walker" && Fmin >= 6, "F: stopped for a walker in the lane (" + F1.why + ", closest " + Fmin.toFixed(1) + " m)");
const F2 = await J(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); FOOT.x = c.x + fz * 0.5; FOOT.z = c.z - fx * 0.5; return true; })()`);
await waitGame(0.3);
const F3 = await J(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); let m = 1e9; for (const u of [-1.45, 0, 1.45]) m = Math.min(m, Math.hypot(FOOT.x - c.x - fx * u, FOOT.z - c.z - fz * u)); return m; })()`);
ok(F3 >= 1.25, "F: a walker inside the car's side is pushed clear (" + F3.toFixed(2) + " m from a circle, clear at 1.31)");

// ---- D: the road ahead snowed in
await ev(`(() => { FOOT.on = false; const c = TLXT.cars[0]; const p = TLXT.lanePt("${rid}", c.s - 400 * c.dir, 1); P.x = p.cx + 60; P.z = p.cz + 60; P.y = surf(P.x, P.z) + 0.3; return true; })()`);
const D0 = await J(`(() => { const c = TLXT.cars[0], seg = TLXR.ROADS.seg, gs = c.r.rt.seg; let gi = -1;
  for (const g of gs) { if (!g.legs.length) continue; if (c.dir > 0 ? g.a > c.s + 90 : g.a + seg < c.s - 90) { if (gi < 0 || (c.dir > 0 ? g.a < gs[gi].a : g.a > gs[gi].a)) gi = g.i; } }
  if (gi >= 0) TLXR.setSnow("${rid}", 1, gi); return { gi, dir: c.dir, s: c.s, edge: gi < 0 ? null : (c.dir > 0 ? gs[gi].a : gs[gi].a + seg), shut: gi >= 0 && gs[gi].shut }; })()`);
console.log("D0:", JSON.stringify(D0));
ok(D0.gi >= 0 && D0.shut, "D: stretch " + D0.gi + " ahead snowed in");
let Dstop = null, Dturn = false, Dback = null;
{ const t0 = await clock(); while ((await clock()) - t0 < 75) {
  const q = await J(`({ s: TLXT.cars[0].s, v: TLXT.cars[0].v, st: TLXT.cars[0].st, dir: TLXT.cars[0].dir, why: TLXT.cars[0].why })`);
  if (!Dstop && q.v < 0.2 && q.why === "shut" && q.st === "drive") Dstop = q;
  if (q.st === "turn") Dturn = true;
  if (Dturn && q.st === "drive" && q.dir !== D0.dir && q.v > 3) { Dback = q; break; }
  await sleep(150);
} }
console.log("D:", JSON.stringify({ Dstop, Dturn, Dback }));
const short = Dstop ? Math.abs(D0.edge - Dstop.s) : -1;
ok(!!Dstop && short >= 15 && short <= 30, "D: stopped " + short.toFixed(1) + " m short of the drift");
ok(Dturn && !!Dback, "D: turned round and drove back the other way");
if (Dback) { const lane = await J(`(() => { const c = TLXT.cars[0], lp = TLXT.lanePt("${rid}", c.s, c.dir); return Math.hypot(c.x - lp.x, c.z - lp.z); })()`); ok(lane < 0.6, "D: back in the right-hand lane for its new way (" + lane.toFixed(2) + " m off)"); }
await ev(`TLXR.setSnow(null, 0); true`);

// ---- G: option off
await ev(`TLX.setOn("traffic", false); window.__gs = TLXT.cars[0].s; true`); await waitGame(2);
const G = await J(`({ vis: TLXT.group.visible, ds: Math.abs(TLXT.cars[0].s - window.__gs) })`);
ok(!G.vis && G.ds < 0.01, "G: option off hides and freezes the traffic (" + JSON.stringify(G) + ")");
await ev(`TLX.setOn("traffic", true); true`); await waitGame(1);
ok(await J(`TLXT.group.visible`), "G: option on brings it back");

// ---- H: night lamps
const day = await J(`TLXT.lampMat.color.r`);
await ev(`GS.hour = 24 * 40 + 23; true`); await waitGame(1);
const night = await J(`TLXT.lampMat.color.r`);
ok(night > day + 0.8, "H: lamps by day " + day.toFixed(2) + ", at night " + night.toFixed(2));
if (!NOSTILLS) { await carCam(13, 4, 0.5); await shot("x3t_h_night"); await camOff(); }
await ev(`GS.hour = 24 * 41 + 12; true`);

// draw calls
const dc = await J(`(() => { renderer.render(scene, camera); const on = renderer.info.render.calls; TLXT.group.visible = false; renderer.render(scene, camera); const off = renderer.info.render.calls; TLXT.group.visible = true; return { on, off }; })()`);
ok(dc.on - dc.off <= 8, "draw calls: the traffic adds " + (dc.on - dc.off));

// ---- I: the bubble
await ev(`(() => { TLXT.hold = false; const r = TLXT.routes.find(q => q.id === "${rid}"); const far = TLXT.lanePt(r.id, r.s0 + 50, 1); P.x = far.cx + 40; P.z = far.cz + 40; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); for (const c of TLXT.cars) { c.x += 5000; } return true; })()`);
await waitGame(6);
const I = await J(`TLXT.cars.filter(c => c.on).map(c => Math.round(Math.hypot(c.x - P.x, c.z - P.z)))`);
console.log("I:", JSON.stringify(I));
ok(I.length >= 3 && I.every(d => d >= 500 && d <= 1500), "I: cars turned up again round you at " + I.join(", ") + " m");

const tErr = await J(`TLXT.tickErr || null`);
ok(!tErr, "no tick error (" + tErr + ")");
console.log(fails ? `${fails} FAILED` : "all ok");
await done(fails ? 1 : 0);
