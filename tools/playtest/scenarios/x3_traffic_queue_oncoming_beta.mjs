// Beta 3.4a: a queue of two cars behind a parked sled, then a sled passing in the oncoming lane, then a sled
// driven head-on at speed in the car's own lane. Asserts, exit 1 on a failure.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
await ev(`TLXT.TRAF.passWait = 1e9; true`);
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const s0 = await J(`(() => { const r = TLXT.routes.find(q => q.id === "${rid}"); return r.s0 + Math.min(900, r.len * 0.3); })()`);
// two cars in one lane, 40 m apart, others parked away; park sled 70 m ahead of the lead car
const setup = await J(`(() => { const a = TLXT.place("${rid}", ${s0}, 1, 0), b = TLXT.place("${rid}", ${s0} - 40, 1, 1);
  const n = TLXT.cars.filter(c => c.on).length;
  const ids = TLXT.cars.map((c, i) => c.on ? i : -1).filter(i => i >= 0);
  const p = TLXT.lanePt("${rid}", ${s0} + 90, 1); P.x = p.x; P.z = p.z; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vz = 0; P.yaw = p.yaw; recenter(P.x, P.z, true);
  return { n, ids, a: !!a, b: !!b }; })()`);
console.log("setup", JSON.stringify(setup));
// pick the two nearest on-cars to the route position
const pair = async () => J(`(() => { const L = TLXT.cars.filter(c => c.on && c.r && c.r.id === "${rid}").sort((x, y) => y.s - x.s); return L.slice(0, 2).map(c => ({ s: c.s, v: c.v, why: c.why, x: c.x, z: c.z, st: c.st })); })()`);
await waitGame(25);
const Q = await pair();
console.log("Q", JSON.stringify(Q));
const gap = Q.length === 2 ? Math.hypot(Q[0].x - Q[1].x, Q[0].z - Q[1].z) : -1;
ok(Q.length === 2, "A: two cars on the road in one lane");
ok(Q.length === 2 && Q[0].v < 0.3 && Q[1].v < 0.3, "A: both stopped (" + Q.map(q => q.v.toFixed(2) + "/" + q.why).join(", ") + ")");
ok(gap >= 5.5, "A: the queue keeps its gap (" + gap.toFixed(1) + " m, wants 7.5)");
const hits0 = await J(`TLXT.hits`);
// B: sled passes in the oncoming lane at speed past the stopped lead car
const B = await J(`(() => { const c = TLXT.cars.filter(c => c.on && c.r && c.r.id === "${rid}").sort((x, y) => y.s - x.s)[0];
  const p = TLXT.lanePt("${rid}", c.s + 60, -1), q = TLXT.lanePt("${rid}", c.s - 60, -1); const dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz);
  P.x = p.x; P.z = p.z; P.y = surf(P.x, P.z) + 0.2; P.yaw = Math.atan2(dx, dz); window.__bd = [dx / L * 14, dz / L * 14]; P.vx = window.__bd[0]; P.vz = window.__bd[1]; window.__bmin = 1e9; window.__cid = TLXT.cars.indexOf(c); return { L }; })()`);
{ const t0 = await clock(); while ((await clock()) - t0 < 8) { await ev(`(() => { P.vx = window.__bd[0]; P.vz = window.__bd[1]; const c = TLXT.cars[window.__cid]; window.__bmin = Math.min(window.__bmin, Math.hypot(P.x - c.x, P.z - c.z)); return 1; })()`); await sleep(60); } }
const B2 = await J(`({ min: window.__bmin, hits: TLXT.hits, crash: CRASH.on })`);
console.log("B", JSON.stringify(B2));
ok(B2.hits === hits0 && !B2.crash, "B: oncoming-lane pass at 14 m/s is not a collision (hits " + (B2.hits - hits0) + ", closest " + B2.min.toFixed(1) + " m)");
// C0: re-form the queue behind a walker standing in the lane, so the sled is free to ride
await ev(`(() => { crashCancel(); P.vx = P.vz = 0; TLXT.place("${rid}", ${s0}, 1, 0); TLXT.place("${rid}", ${s0} - 40, 1, 1); const w = TLXT.lanePt("${rid}", ${s0} + 60, 1); FOOT.on = true; FOOT.x = w.x; FOOT.z = w.z; FOOT.y = surf(w.x, w.z); P.x = w.cx - 200; P.z = w.cz - 200; P.y = surf(P.x, P.z) + 0.3; return 1; })()`);
await waitGame(22);
const Q2 = await pair(); console.log("Q2", JSON.stringify(Q2));
ok(Q2.length === 2 && Q2[0].v < 0.3 && Q2[1].v < 0.3, "C0: queue re-formed behind the walker (" + Q2.map(q => q.v.toFixed(2) + "/" + q.why).join(", ") + ")");
// C: sled rear-ends the stopped queue at 15 m/s
await ev(`(() => { crashCancel(); const c = TLXT.cars.filter(c => c.on && c.r && c.r.id === "${rid}").sort((x, y) => y.s - x.s)[1];
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); P.x = c.x - fx * 30; P.z = c.z - fz * 30; P.y = surf(P.x, P.z) + 0.2; FOOT.on = false; P.yaw = c.yaw; window.__cv = [fx * 15, fz * 15]; P.vx = fx * 15; P.vz = fz * 15; window.__cid2 = TLXT.cars.indexOf(c); window.__cmin = 1e9; window.__h1 = TLXT.hits; return 1; })()`);
{ const t0 = await clock(); while ((await clock()) - t0 < 3) { await ev(`(() => { const c = TLXT.cars[window.__cid2]; let m = 1e9; for (const u of [-1.45, 0, 1.45]) m = Math.min(m, Math.hypot(P.x - c.x - Math.sin(c.yaw) * u, P.z - c.z - Math.cos(c.yaw) * u)); window.__cmin = Math.min(window.__cmin, m); if (!window.__done && Math.hypot(P.vx, P.vz) > 6 && !CRASH.on && window.__cmin > 3) { P.vx = window.__cv[0]; P.vz = window.__cv[1]; } return 1; })()`); await sleep(50); } }
await waitGame(0.5);
const C = await J(`({ hits: TLXT.hits - window.__h1, min: window.__cmin, v: Math.hypot(P.vx, P.vz), crash: CRASH.on, cx: TLXT.cars[window.__cid2].x, err: TLXT.tickErr || null })`);
console.log("C", JSON.stringify(C));
ok(C.hits >= 1, "C: rear-ending the queue at 15 m/s counts a bump (" + C.hits + ")");
ok(C.min >= 1.2, "C: never inside the car (" + C.min.toFixed(2) + " m from a circle)");
ok(!C.err, "C: no traffic tick error");
const pe = await J(`TLXT.err || null`);
ok(!pe, "no TLXT error");
await done(fails);
