// Slice 3.4b1 (G4): drivers pull out round something standing in their lane; wheels that turn; a hard stop when
// someone steps out close in front. Asserts, exit 1 on a failure.
//  A. the wheel mesh: its own instanced mesh, 4 instances a car on the road; a driving car's wheels turn by the
//     distance rolled (roll step ~ v dt / 0.33), a stopped car's don't.
//  B. late brake (beta 0159 #1): a walker put 45 m in front of a car at 12.5 m/s -> it stops, never closer than 6.5 m.
//  C. your sled parked in its lane: it stops, then (after ~3 s) moves into the other lane, creeps past at <= 5 m/s,
//     never closer than 2.6 m (sled to the car's circles), never pushes the sled, moves back into its own lane past it
//     and drives on. A pull-out is counted.
//  D. something coming the other way: a car behind your sled waits while an oncoming car is in the other lane ahead,
//     and pulls out only once it has gone by.
//  E. a walker standing in the lane is passed the same way, never pushed.
//  F. the end of the road: a sled parked too close to the route's end -> no pull-out (no room to get back in).
//  G. no tick error; draw calls for the traffic <= 9.
import { boot, ev, sleep, done, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const NOSTILLS = !!process.env.NOSTILLS;
let camHooked = false;
async function cam(expr) {   // expr: JS returning [px,py,pz, lx,ly,lz]
  if (!camHooked) { await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`); camHooked = true; }
  await ev(`(() => { window.camOv = c => { const v = (${expr}); c.position.set(v[0], v[1], v[2]); c.lookAt(v[3], v[4], v[5]); }; return true; })()`);
  await sleep(300);
}
const camOff = () => ev("window.camOv = null; true");

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
const base = await J(`(() => { const T = TLXT; return { ready: T.ready, err: T.err, routes: T.routes.length, wheels: !!T.wheels }; })()`);
ok(base.ready && !base.err && base.wheels, "traffic ready with a wheel mesh (" + JSON.stringify(base) + ")");

// a long straight stretch: 300 m where the car may do 12.5 both ways, on the longest road
const spot = await J(`(() => { const rs = TLXT.routes.slice().sort((a, b) => b.len - a.len);
  for (const r of rs) { for (let s = r.s0 + 200; s < r.s1 - 400; s += 20) { let good = true; for (let u = s; u < s + 300; u += 5) { let k = 0; while (k < r.cum.length - 2 && r.cum[k + 1] <= u) k++; if (r.vP[k] < 12.4 || r.vM[k] < 12.4 || r.street[k]) { good = false; break; } } if (good) return { id: r.id, s, s1: r.s1, s0: r.s0 }; } }
  return null; })()`);
console.log("spot:", JSON.stringify(spot));
ok(!!spot, "found a 300 m straight");
const RID = spot.id, S0 = spot.s;
// keep you (riding) well off the road unless a step puts the sled somewhere
const away = `(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${RID}", ${S0} - 300, 1); P.x = p.cx + 70; P.z = p.cz + 70; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`;
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(120); } return false; }

// ---- A + B: full speed, a walker steps out 45 m ahead
await ev(away);
await ev(`(() => { const c = TLXT.place("${RID}", ${S0}, 1); c.v = 12.5; return true; })()`);
await waitGame(0.6);
const A1 = await J(`({ roll: TLXT.cars[0].roll, s: TLXT.cars[0].s, v: TLXT.cars[0].v, n: TLXT.wheels.count, on: TLXT.cars.filter(c => c.on).length, m: Array.from(TLXT.wheels.instanceMatrix.array.slice(0, 16)) })`);
await waitGame(0.25);
const A2 = await J(`({ roll: TLXT.cars[0].roll, s: TLXT.cars[0].s, v: TLXT.cars[0].v, m: Array.from(TLXT.wheels.instanceMatrix.array.slice(0, 16)) })`);
const ds = A2.s - A1.s, want = (ds / 0.33) % (Math.PI * 2), got = ((A2.roll - A1.roll) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
const mdiff = A1.m.reduce((a, x, i) => a + Math.abs(x - A2.m[i]), 0);
console.log("A:", JSON.stringify({ ds, want, got, n: A1.n, on: A1.on, mdiff }));
ok(A1.n === 4 * A1.on, "A: " + A1.n + " wheels for " + A1.on + " car(s)");
ok(Math.abs(((want - got + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.15 && ds > 1 && mdiff > 0.05, "A: wheels turned by the distance rolled (" + ds.toFixed(2) + " m -> " + got.toFixed(2) + " rad, expect " + want.toFixed(2) + ")");
await ev(`(() => { const c = TLXT.cars[0], p = TLXT.lanePt("${RID}", c.s + 45, 1); window.__v0 = c.v; TLXT.TRAF.passWait = 1e9; FOOT.on = true; FOOT.x = p.x; FOOT.z = p.z; FOOT.y = surf(p.x, p.z); return true; })()`);
let Bmin = 1e9;
await waitGame(9, async () => { const d = await J(`Math.hypot(TLXT.cars[0].x - FOOT.x, TLXT.cars[0].z - FOOT.z)`); Bmin = Math.min(Bmin, d); return false; });
const B = await J(`({ v: TLXT.cars[0].v, why: TLXT.cars[0].why, v0: window.__v0, pass: !!TLXT.cars[0].pass })`);
console.log("B:", JSON.stringify(B), "closest", Bmin.toFixed(2));
ok(B.v0 > 12 && B.v < 0.3 && B.why === "walker" && Bmin >= 6.5, "B: from " + B.v0.toFixed(1) + " m/s, stopped for a walker 45 m ahead, closest " + Bmin.toFixed(2) + " m (gap 7.5)");
// the stopped car's wheels hold still
const r1 = await J(`TLXT.cars[0].roll`); await waitGame(0.4); const r2 = await J(`TLXT.cars[0].roll`);
ok(Math.abs(r2 - r1) < 1e-6 && !B.pass, "A: a stopped car's wheels hold still (" + (r2 - r1).toExponential(1) + ")");
// E: now let it pass the walker
await ev(`TLXT.TRAF.passWait = 3; window.__fx = FOOT.x; window.__fz = FOOT.z; true`);
let Emin = 1e9, Elane = 9, Ep = 0;
const Edone = await waitGame(30, async () => { const q = await J(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); let m = 1e9; for (const u of [-1.45, 0, 1.45]) m = Math.min(m, Math.hypot(FOOT.x - c.x - fx * u, FOOT.z - c.z - fz * u)); return { m, lane: c.lane, pass: c.pass ? c.pass.st : null, a: (FOOT.x - c.x) * fx + (FOOT.z - c.z) * fz, v: c.v }; })()`);
  Emin = Math.min(Emin, q.m); Elane = Math.min(Elane, q.lane); if (q.pass) Ep++;
  return !q.pass && q.a < -12 && q.lane > 1.5 && q.v > 2; });
const Epush = await J(`Math.hypot(FOOT.x - window.__fx, FOOT.z - window.__fz)`);
console.log("E:", JSON.stringify({ Edone, Emin, Elane, Ep, Epush }));
ok(Edone && Elane < -1.4, "E: pulled out round the walker (lane down to " + Elane.toFixed(2) + " m) and back in, driving on");
ok(Emin >= 2.4 && Epush < 0.05, "E: never closer than " + Emin.toFixed(2) + " m to the walker, never pushed (" + Epush.toFixed(3) + " m)");

// ---- C: your sled parked in the lane
await ev(`FOOT.on = false; true`);
await ev(away);
await ev(`(() => { TLXT.place("${RID}", ${S0}, 1); const p = TLXT.lanePt("${RID}", ${S0} + 70, 1); P.x = p.x; P.z = p.z; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vz = 0; P.yaw = p.yaw; window.__px = P.x; window.__pz = P.z; window.__p0 = TLXT.passes || 0; window.__h0 = TLXT.hits; return true; })()`);
let Cstop = null, Cout = null, Cmin = 1e9, Clane = 9, Cvmax = 0, CshotDone = false, Cmaxpush = 0;
const Cdone = await waitGame(45, async () => {
  await ev(`P.vx = P.vz = 0; true`);
  const q = await J(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); let m = 1e9; for (const u of [-1.45, 0, 1.45]) m = Math.min(m, Math.hypot(P.x - c.x - fx * u, P.z - c.z - fz * u)); return { m, lane: c.lane, pass: c.pass ? c.pass.st : null, a: (P.x - c.x) * fx + (P.z - c.z) * fz, v: c.v, why: c.why, t: gameClock, push: Math.hypot(P.x - window.__px, P.z - window.__pz) }; })()`);
  if (!Cstop && q.v < 0.3 && q.why === "you" && q.a < 10) Cstop = q;
  if (Cstop && !Cout && q.pass) Cout = q;
  Cmin = Math.min(Cmin, q.m); Clane = Math.min(Clane, q.lane); Cmaxpush = Math.max(Cmaxpush, q.push);
  if (q.pass && Math.abs(q.a) < 9) Cvmax = Math.max(Cvmax, q.v);
  if (!NOSTILLS && !CshotDone && q.pass && Math.abs(q.a) < 1.5) { CshotDone = true; await cam(`(() => { const c = TLXT.cars[0]; return [P.x + Math.sin(P.yaw + 2.2) * 13, P.y + 5, P.z + Math.cos(P.yaw + 2.2) * 13, (P.x + c.x) / 2, P.y + 0.6, (P.z + c.z) / 2]; })()`); await shot("x3p_c_passing"); await camOff(); }
  return Cout && !q.pass && q.a < -12 && q.lane > 1.5 && q.v > 2; });
const Cn = await J(`(TLXT.passes || 0) - window.__p0`), Ch = await J(`TLXT.hits - window.__h0`);
console.log("C:", JSON.stringify({ Cstop, Cout, Cdone, Cmin, Clane, Cvmax, Cmaxpush, Cn }));
ok(!!Cstop, "C: stopped for your sled first");
ok(!!Cout && Cout.t - Cstop.t >= 2.5 && Cout.t - Cstop.t < 8, "C: pulled out " + (Cout ? (Cout.t - Cstop.t).toFixed(1) : "-") + " game s after stopping");
ok(Cdone && Clane < -1.4, "C: went by in the other lane (lane " + Clane.toFixed(2) + " m) and moved back in past the sled, driving on");
ok(Cvmax <= 5.05, "C: crept past at " + Cvmax.toFixed(2) + " m/s (<= 5)");
ok(Cmin >= 2.6 && Ch === 0, "C: never closer than " + Cmin.toFixed(2) + " m to the sled, never touched it (bumps " + Ch + ")");
ok(Cn === 1, "C: one pull-out counted (" + Cn + ")");

// ---- D: an oncoming car keeps it in its lane
await ev(away);
await ev(`(() => { TLXT.place("${RID}", ${S0}, 1); const p = TLXT.lanePt("${RID}", ${S0} + 40, 1); P.x = p.x; P.z = p.z; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vz = 0; P.yaw = p.yaw; return true; })()`);
await waitGame(12, async () => { await ev(`P.vx = P.vz = 0; true`); return await J(`TLXT.cars[0].v < 0.3 && TLXT.cars[0].why === "you"`); });
await ev(`(() => { const c1 = TLXT.place("${RID}", TLXT.cars[0].s + 100, -1, 1); c1.v = 0; return true; })()`);
let Dearly = false, Dlater = null, Dgone = null;
const Ddone = await waitGame(50, async () => {
  await ev(`P.vx = P.vz = 0; true`);
  const q = await J(`(() => { const c = TLXT.cars[0], o = TLXT.cars[1], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); return { pass: !!c.pass, oa: (o.s - c.s) * c.dir, t: gameClock, ov: o.v }; })()`);
  if (q.pass && q.oa > -8) Dearly = true;
  if (!Dgone && q.oa < -8) Dgone = q;
  if (Dgone && q.pass) { Dlater = q; return true; }
  return false; });
console.log("D:", JSON.stringify({ Dearly, Dgone, Dlater }));
ok(!Dearly, "D: no pull-out while a car was coming the other way");
ok(Ddone && Dgone && Dlater.t - Dgone.t < 4, "D: pulled out " + (Dlater && Dgone ? (Dlater.t - Dgone.t).toFixed(1) : "-") + " game s after the oncoming car went by");

// ---- F: too near the end of the road
await ev(away);
const F0 = await J(`(() => { const r = TLXT.routes.find(q => q.id === "${RID}"), s = r.s1 - 30; let k = 0; while (k < r.cum.length - 2 && r.cum[k + 1] <= s - 60) k++; TLXT.place("${RID}", s - 60, 1); const p = TLXT.lanePt("${RID}", s, 1); P.x = p.x; P.z = p.z; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vz = 0; P.yaw = p.yaw; return { s, street: r.street[k] }; })()`);
let Fpass = false, Fstop = false;
await waitGame(14, async () => { await ev(`P.vx = P.vz = 0; true`); const q = await J(`({ p: !!TLXT.cars[0].pass, v: TLXT.cars[0].v, why: TLXT.cars[0].why })`); if (q.p) Fpass = true; if (q.v < 0.3 && q.why === "you") Fstop = true; return false; });
console.log("F:", JSON.stringify({ F0, Fpass, Fstop }));
ok(Fstop && !Fpass, "F: sled 30 m from the road's end: stopped, no pull-out (no room to get back in)");

// ---- G
await ev(`TLXT.hold = false; true`);
const dc = await J(`(() => { renderer.render(scene, camera); const on = renderer.info.render.calls; TLXT.group.visible = false; renderer.render(scene, camera); const off = renderer.info.render.calls; TLXT.group.visible = true; return { on, off }; })()`);
ok(dc.on - dc.off <= 9, "G: the traffic adds " + (dc.on - dc.off) + " draw calls");
if (!NOSTILLS) {
  await ev(away); await ev(`(() => { const c = TLXT.place("${RID}", ${S0}, 1); c.v = 8; c.col = 0x8d1f1c; return true; })()`); await waitGame(1);
  await cam(`(() => { const c = TLXT.cars[0], a = c.yaw + Math.PI / 2; return [c.x + Math.sin(a) * 5, c.y + 1.6, c.z + Math.cos(a) * 5, c.x, c.y + 0.45, c.z]; })()`); await shot("x3p_wheels_a"); await sleep(250); await shot("x3p_wheels_b"); await camOff();
}
const tErr = await J(`TLXT.tickErr || null`);
ok(!tErr, "G: no tick error (" + tErr + ")");
console.log(fails ? `${fails} FAILED` : "all ok");
await done(fails ? 1 : 0);
