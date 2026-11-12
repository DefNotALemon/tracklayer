// Beta of 3.4b2b (village cars drive home). Tries to break it: A reload keeps/rerolls owners-out, reload mid-drive;
// B your sled parked IN the empty spot when the owner comes home; C the sled leaves -> car parks; D walker standing on the spot.
import { boot, ev, sleep, done, shot, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(150); } return false; }
process.env.TL_AWAY = "1";
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34.5; true`); await sleep(1200);

// ---- A: reload
const a0 = await J(`TLXC.cars.filter(c => c.away).map(c => c.i)`);
await ev(`(() => { for (const c of TLXC.cars) TLXC.setAway(c.i, false); for (const h of TLXT.homes.slice(0, 3)) TLXC.setAway(h.ci, true); return true; })()`);
const a1 = await J(`TLXC.cars.filter(c => c.away).map(c => c.i)`);
await reload();
await sleep(1500);
const a2 = await J(`({ away: TLXC.cars.filter(c => c.away).map(c => c.i), err: TLXT.tickErr || TLXC.tickErr || null, homes: TLXT.homes.length })`);
console.log("A:", JSON.stringify({ boot: a0, set: a1, afterReload: a2 }));
ok(!a2.err && a2.homes >= 3, `A: reload ok, no tick error, ${a2.homes} homes`);
console.log("   owners-out after reload:", JSON.stringify(a2.away), a1.join() === a2.away.join() ? "(same as before reload)" : "(re-rolled)");
// reload mid-drive
await ev(`(() => { const T = TLXT; for (const c of TLXC.cars) TLXC.setAway(c.i, false); for (const h of T.homes.slice(0, 3)) TLXC.setAway(h.ci, true); return true; })()`);
await ev(`(() => { const h = TLXT.homes[0]; const x = h.x + 50, z = h.z + 40; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = 0; recenter(x, z, true); TLXT.sendHome(0, 200); return true; })()`);
await waitGame(8, null);
const m0 = await J(`({ st: TLXT.cars[0].st, on: TLXT.cars[0].on, away: TLXC.awayN() })`);
await reload();
await sleep(1500);
const m1 = await J(`({ on: TLXT.cars[0].on, st: TLXT.cars[0].st, away: TLXC.awayN(), awayList: TLXC.cars.filter(c => c.away).map(c => c.i), taken: TLXT.homes.filter(h => h.taken >= 0).length, err: TLXT.tickErr || TLXC.tickErr || null, hid: TLXC.cars.filter(c => c.hid && !c.away).length })`);
console.log("A mid-drive:", JSON.stringify({ m0, m1 }));
ok(!m1.err && m1.hid === 0, `A: after reload mid-drive no error, no non-away car hidden (hid ${m1.hid}), taken=${m1.taken}`);
ok(m1.taken === 0 || m1.on, `A: no home stuck "taken" by a car that no longer exists (${m1.taken} taken, car0 on=${m1.on})`);

// ---- B: your sled sits in the empty spot
await ev(`(() => { const T = TLXT; for (const c of TLXC.cars) TLXC.setAway(c.i, false); T.hold = false; for (const c of T.cars) { c.on = false; } for (const h of T.homes) h.taken = -1; for (const h of T.homes.slice(0, 3)) TLXC.setAway(h.ci, true); return true; })()`);
const HI = 1;
await ev(`(() => { const h = TLXT.homes[${HI}]; crashCancel(); FOOT.on = false; P.x = h.x; P.z = h.z; P.y = surf(h.x, h.z) + 0.3; P.vx = P.vz = 0; recenter(h.x, h.z, true); window.__hd = TLXT.homesDone; TLXT.sendHome(${HI}, 120); return true; })()`);
let Bmin = 1e9, Bpass = false;
await waitGame(70, async () => { const q = await J(`(() => { const c = TLXT.cars[0], h = TLXT.homes[${HI}]; return { on: c.on, d: Math.hypot(c.x - P.x, c.z - P.z), done: TLXT.homesDone - window.__hd, st: c.st, why: c.why }; })()`); if (q.on) Bmin = Math.min(Bmin, q.d); return q.done > 0; });
const B = await J(`(() => { const c = TLXT.cars[0], h = TLXT.homes[${HI}], pc = TLXC.cars[h.ci]; return { done: TLXT.homesDone - window.__hd, on: c.on, st: c.st, why: c.why, v: c.v, away: !!pc.away, d: Math.hypot(pc.x - P.x, pc.z - P.z), dc: Math.hypot(c.x - P.x, c.z - P.z) }; })()`);
console.log("B:", JSON.stringify({ B, Bmin }));
ok(Bmin > 2.5, `B: the car never came within ${Bmin.toFixed(2)} m of the sled parked in its spot (done=${B.done}, away=${B.away}, sled-to-spot ${B.d.toFixed(1)} m)`);
ok(B.done === 0 ? (B.on && B.v < 0.3) : true, `B: while you sit there it waits (on=${B.on}, v=${B.v.toFixed(2)}, why=${B.why})`);
// ---- C: sled leaves
await ev(`(() => { const h = TLXT.homes[${HI}]; const x = h.x + 45, z = h.z + 20; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; recenter(x, z, true); return true; })()`);
const Cdone = await waitGame(60, async () => (await J(`TLXT.homesDone - window.__hd`)) > 0);
const C = await J(`(() => { const c = TLXT.cars[0], h = TLXT.homes[${HI}], pc = TLXC.cars[h.ci]; return { done: TLXT.homesDone - window.__hd, away: !!pc.away, hid: !!pc.hid, circ: obstaclesNear(pc.x, pc.z, 5).filter(o => o.car === pc.i).length, on: c.on, st: c.st, why: c.why, v: c.v, d: Math.hypot(c.x - pc.x, c.z - pc.z) }; })()`);
console.log("C:", JSON.stringify({ Cdone, C }));
ok(Cdone && !C.away && !C.hid && C.circ === 3, `C: sled gone -> the car parked (away=${C.away}, circles ${C.circ})`);

// ---- D: walker standing exactly on the spot
await ev(`(() => { const h = TLXT.homes[${HI}]; TLXC.setAway(h.ci, true); TLXT.hold = false; for (const c of TLXT.cars) c.on = false; h.taken = -1; const x = h.x + 60, z = h.z + 30; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; recenter(x, z, true);
  window.__hd = TLXT.homesDone; TLXT.sendHome(${HI}, 120); return true; })()`);
await waitGame(5, null);
await ev(`(() => { const h = TLXT.homes[${HI}]; FOOT.on = true; FOOT.x = h.x; FOOT.z = h.z; FOOT.y = surf(h.x, h.z); return true; })()`);
let Dmin = 1e9;
await waitGame(60, async () => { const q = await J(`(() => { const c = TLXT.cars[0]; return { on: c.on, d: Math.hypot(c.x - FOOT.x, c.z - FOOT.z), done: TLXT.homesDone - window.__hd }; })()`); if (q.on) Dmin = Math.min(Dmin, q.d); return false; });
const D = await J(`({ done: TLXT.homesDone - window.__hd, on: TLXT.cars[0].on, why: TLXT.cars[0].why, v: TLXT.cars[0].v })`);
console.log("D:", JSON.stringify({ D, Dmin }));
ok(Dmin > 2.0, `D: car never within ${Dmin.toFixed(2)} m of the walker standing on its spot (done=${D.done}, why=${D.why})`);
await ev(`FOOT.on = false; true`);
console.log(fails ? `${fails} FAILED` : "all ok");
await done(fails ? 1 : 0);
