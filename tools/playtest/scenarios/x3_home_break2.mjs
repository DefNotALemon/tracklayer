// Beta round 2 of 3.4b2b (cars drive home). A: Road traffic switched OFF while a car is homing; B: switched back ON (no stuck
// state, a new send works); C: a storm hits while a car is homing; D: two homing cars on one street, the first held by your sled
// in its spot: does the second stack up behind it without overlapping; E: a car driven home during night.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(150); } return false; }
process.env.TL_AWAY = "1";
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34.5; true`); await sleep(1200);
const reset = n => ev(`(() => { const T = TLXT; T.hold = false; for (const c of T.cars) { release_(c); } for (const h of T.homes) h.taken = -1; for (const c of TLXC.cars) TLXC.setAway(c.i, false); for (const h of T.homes.slice(0, ${n})) TLXC.setAway(h.ci, true); return true; function release_(c) { c.on = false; c.st = "drive"; c.homeI = null; } })()`);
const goNear = (hi, dx, dz) => ev(`(() => { const h = TLXT.homes[${hi}]; const x = h.x + ${dx}, z = h.z + ${dz}; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = 0; recenter(x, z, true); return true; })()`);
const homes0 = await J(`TLXT.homes.length`);
console.log("homes", homes0);

// ---- A: option off mid-homing
await reset(3); await goNear(0, 50, 40);
await ev(`TLXT.sendHome(0, 200); true`); await waitGame(6, null);
const a0 = await J(`({ st: TLXT.cars[0].st, on: TLXT.cars[0].on, away: TLXC.awayN(), taken: TLXT.homes.filter(h => h.taken >= 0).length })`);
await ev(`TLX.setOn("traffic", false); true`); await waitGame(3, null);
const a1 = await J(`({ on: TLXT.cars[0].on, st: TLXT.cars[0].st, away: TLXC.awayN(), taken: TLXT.homes.filter(h => h.taken >= 0).length, hid: TLXC.cars.filter(c => c.hid && !c.away).length, vis: TLXT.cars.filter(c => c.on).length, err: TLXT.tickErr || TLXC.tickErr || null, circ: TLXC.cars.filter(c => !c.away).every(c => obstaclesNear(c.x, c.z, 5).filter(o => o.car === c.i).length === 3) })`);
console.log("A:", JSON.stringify({ a0, a1 }));
ok(a0.on && a0.st === "home" && a0.away === 3, `A0: car was homing (st ${a0.st}), 3 owners out`);
ok(a1.away === 0 && a1.taken === 0 && a1.hid === 0 && !a1.err, `A: option off mid-drive: everyone home (away ${a1.away}), taken ${a1.taken}, hidden ${a1.hid}, err ${a1.err}`);
ok(a1.vis === 0 || !a1.on, `A: no traffic car still on (${a1.vis}); car0 on=${a1.on} st=${a1.st}`);
ok(a1.circ, "A: every parked car has its 3 obstacle circles after everyone came home");

// ---- B: option back on
await ev(`TLX.setOn("traffic", true); true`); await waitGame(4, null);
const b0 = await J(`({ away: TLXC.awayN(), on: TLXT.cars.filter(c => c.on).length, err: TLXT.tickErr || TLXC.tickErr || null })`);
ok(!b0.err && b0.away === 0, `B: back on: no error, owners stay home (away ${b0.away}, cars on ${b0.on})`);
await reset(2); await goNear(1, 50, 40);
await ev(`window.__hd = TLXT.homesDone; TLXT.sendHome(1, 200); true`);
const bdone = await waitGame(60, async () => (await J(`TLXT.homesDone - window.__hd`)) > 0);
const b1 = await J(`(() => { const h = TLXT.homes[1], pc = TLXC.cars[h.ci]; return { away: pc.away, hid: !!pc.hid, circ: obstaclesNear(pc.x, pc.z, 5).filter(o => o.car === pc.i).length, err: TLXT.tickErr || TLXC.tickErr || null }; })()`);
console.log("B:", JSON.stringify({ bdone, b1 }));
ok(bdone && !b1.away && !b1.hid && b1.circ === 3 && !b1.err, `B: after off/on a new send parks (done ${bdone}, circles ${b1.circ})`);

// ---- C: storm while homing
await reset(3); await goNear(0, 50, 40);
await ev(`window.__hd = TLXT.homesDone; TLXT.sendHome(0, 200); true`); await waitGame(5, null);
await ev(`WX.at = () => 1; GS.storm = 1; true`);
const cdone = await waitGame(90, async () => (await J(`TLXT.homesDone - window.__hd`)) > 0);
const c1 = await J(`(() => { const h = TLXT.homes[0], pc = TLXC.cars[h.ci], c = TLXT.cars[0]; return { away: pc.away, b: pc.b, hid: !!pc.hid, circ: obstaclesNear(pc.x, pc.z, 5).filter(o => o.car === pc.i).length, on: c.on, st: c.st, v: c.v, why: c.why, err: TLXT.tickErr || TLXC.tickErr || null, buried: TLXC.buried() }; })()`);
console.log("C:", JSON.stringify({ cdone, c1 }));
ok(cdone && !c1.away && c1.circ === 3 && !c1.err, `C: storm during the drive: the car still parks (done ${cdone}, circles ${c1.circ}, st ${c1.st}, why ${c1.why})`);
await waitGame(30, null);
const c2 = await J(`({ b: TLXC.cars[TLXT.homes[0].ci].b, err: TLXT.tickErr || TLXC.tickErr || null })`);
ok(!c2.err, `C: then it sits in the storm, snow on it ${c2.b.toFixed(3)} (info), no error`);
await ev(`WX.at = () => 0; GS.storm = 0; true`);

// ---- D: two homing cars, one held by your sled in its spot
await reset(3);
// choose two homes on the same route
const pair = await J(`(() => { const H = TLXT.homes; for (let i = 0; i < Math.min(H.length, 8); i++) for (let j = 0; j < Math.min(H.length, 8); j++) if (i !== j && H[i].r === H[j].r && Math.hypot(H[i].x - H[j].x, H[i].z - H[j].z) < 90) return [i, j]; return null; })()`);
console.log("D pair", JSON.stringify(pair));
if (!pair) { console.log("D: no two homes share a route within 90 m; skipped"); } else {
  const [i, j] = pair;
  await ev(`(() => { for (const h of TLXT.homes) h.taken = -1; for (const c of TLXC.cars) TLXC.setAway(c.i, false); TLXC.setAway(TLXT.homes[${i}].ci, true); TLXC.setAway(TLXT.homes[${j}].ci, true); return true; })()`);
  await goNear(i, 0, 0);
  await ev(`(() => { const T = TLXT; T.hold = true; for (const c of T.cars) { c.on = false; c.homeI = null; } return true; })()`);
  await ev(`(() => { const T = TLXT; window.__hd = T.homesDone; T.sendHome(${i}, 120, 0); T.sendHome(${j}, 135, 1); return true; })()`);
  let gmin = 1e9, onmin = 1e9;
  await waitGame(80, async () => { const q = await J(`(() => { const a = TLXT.cars[0], b = TLXT.cars[1]; return { d: Math.hypot(a.x - b.x, a.z - b.z), on: a.on && b.on, v0: a.v, v1: b.v, w: [a.why, b.why] }; })()`); if (q.on) gmin = Math.min(gmin, q.d); return false; });
  const d1 = await J(`(() => { const a = TLXT.cars[0], b = TLXT.cars[1]; return { done: TLXT.homesDone - window.__hd, a: [a.on, a.st, a.why, +a.v.toFixed(2)], b: [b.on, b.st, b.why, +b.v.toFixed(2)], err: TLXT.tickErr || TLXC.tickErr || null }; })()`);
  console.log("D:", JSON.stringify({ gmin, d1 }));
  ok(gmin > 2.8, `D: the two homing cars never closer than ${gmin.toFixed(2)} m (car length ~4.5, circles)`);
  ok(!d1.err, "D: no tick error");
  ok(d1.done === 2 || (d1.a[0] && d1.a[2] === "you") , `D: sled sat in spot ${i}: done ${d1.done} (info: a ${d1.a}, b ${d1.b})`);
  // ride away so they park
  await goNear(i, 70, 40);
  await waitGame(50, async () => (await J(`TLXT.homesDone - window.__hd`)) >= 2);
  const d2 = await J(`({ done: TLXT.homesDone - window.__hd, away: TLXC.awayN(), err: TLXT.tickErr || TLXC.tickErr || null })`);
  ok(d2.done === 2 && d2.away === 1 && !d2.err, `D: sled leaves: both parked (done ${d2.done}, still away ${d2.away} expected 1)`);
}

// ---- E: night
await reset(3); await ev(`GS.hour = 43.5; true`); await goNear(0, 50, 40);
await ev(`window.__hd = TLXT.homesDone; TLXT.sendHome(0, 200); true`);
const edone = await waitGame(70, async () => (await J(`TLXT.homesDone - window.__hd`)) > 0);
const e1 = await J(`(() => { const pc = TLXC.cars[TLXT.homes[0].ci]; return { away: pc.away, circ: obstaclesNear(pc.x, pc.z, 5).filter(o => o.car === pc.i).length, err: TLXT.tickErr || TLXC.tickErr || null }; })()`);
ok(edone && e1.circ === 3 && !e1.err, `E: night drive home parks (done ${edone}, circles ${e1.circ})`);
console.log(fails ? `${fails} FAILED` : "all ok");
await done(fails ? 1 : 0);
