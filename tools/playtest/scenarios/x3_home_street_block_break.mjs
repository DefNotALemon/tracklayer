// Beta 3.4b2b round 5 (cars drive home): the sled stopped IN THE STREET on the car's route (not in the spot).
// A car stops short of the sled (>= 1 m clear, never pushes it, P unmoved); B sled leaves -> car carries on and parks;
// C sled on the street while the car is homing and you are ON FOOT beside it; D save+reload mid-drive keeps spot/owner sane.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(150); } return false; }
process.env.TL_AWAY = "1";
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34.5; true`); await sleep(1200);
const HI = 0;
// put the sled on the street, 60% along the home path
const S = await J(`(() => { const T = TLXT, p = T.homePath(${HI}); const k = Math.floor(p.length * 0.6), x = p[k][0], z = p[k][1];
  crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = 0; recenter(x, z, true); return { x, z, n: p.length }; })()`);
console.log("S:", JSON.stringify(S)); await sleep(800);
const px0 = await J(`({x:P.x,z:P.z})`);
await ev(`(() => { const T = TLXT, c = T.sendHome(${HI}, 200); window.__hd = T.homesDone; return true; })()`);
let minGap = 1e9, stopped = 0, done1 = false, pushed = 0;
await waitGame(70, async () => {
  const q = await J(`(() => { const c = TLXT.cars[0]; return c.on ? { st: c.st, v: c.v, d: Math.hypot(c.x - P.x, c.z - P.z), why: c.why, px: P.x, pz: P.z } : { off: true }; })()`);
  if (q.off) { done1 = true; return true; }
  minGap = Math.min(minGap, q.d); pushed = Math.max(pushed, Math.hypot(q.px - px0.x, q.pz - px0.z));
  if (q.v < 0.05 && q.st === "home") stopped++;
  return stopped > 12;
});
const mid = await J(`(() => { const c = TLXT.cars[0]; return { on: c.on, st: c.st, v: c.v, why: c.why, err: TLXT.tickErr || TLXC.tickErr || null }; })()`);
console.log("A:", JSON.stringify(mid), "minGap", minGap.toFixed(2), "pushed", pushed.toFixed(2));
ok(!done1 && stopped > 12, "A: car stopped behind the sled (did not drive through it or park on it)");
ok(minGap >= 1.5, `A: closest centre distance ${minGap.toFixed(2)} m (car centre to sled centre)`);
ok(pushed < 0.3, `A: sled not pushed (${pushed.toFixed(2)} m)`);
ok(!mid.err, "A: no tick error");
// B: sled leaves
await ev(`(() => { const c = TLXT.cars[0], h = TLXT.homes[${HI}]; const a = Math.atan2(c.x - h.x, c.z - h.z); crashCancel(); FOOT.on = false; P.x += 40; P.z += 40; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true); return true; })()`);
const Bd = await waitGame(70, async () => (await J(`({ off: !TLXT.cars[0].on })`)).off);
const B = await J(`(() => { const h = TLXT.homes[${HI}], pc = TLXC.cars[h.ci]; return { done: TLXT.homesDone - window.__hd, away: !!pc.away, hid: !!pc.hid, circ: obstaclesNear(pc.x, pc.z, 5).filter(o => o.car === pc.i).length, err: TLXT.tickErr || TLXC.tickErr || null }; })()`);
console.log("B:", JSON.stringify(B));
ok(Bd && B.done === 1 && !B.away && !B.hid && B.circ === 3 && !B.err, "B: sled gone, car carried on and parked (3 circles)");
// D: sled in street again, reload mid-drive
await ev(`(() => { const T = TLXT, p = T.homePath(${HI}), k = Math.floor(p.length * 0.6); P.x = p[k][0]; P.z = p[k][1]; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true); T.sendHome(${HI}, 200); return true; })()`);
await sleep(4000);
await reload();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; true`); await sleep(1500);
const D = await J(`(() => { const T = TLXT; const owners = TLXC.cars.map(c => !!c.away); return { ready: T.ready, err: T.err || T.tickErr || TLXC.tickErr || null, homing: T.cars.filter(c => c.on && c.st === \"home\").length, away: owners.filter(Boolean).length, spot0: (() => { const pc = TLXC.cars[T.homes[${HI}].ci]; return { away: !!pc.away, hid: !!pc.hid, circ: obstaclesNear(pc.x, pc.z, 5).filter(o => o.car === pc.i).length }; })() }; })()`);
console.log("D:", JSON.stringify(D));
ok(D.ready && !D.err && D.homing === 0, "D: reload mid-drive: no homing car left over, no error");
ok(D.spot0.away ? (D.spot0.circ === 0) : (D.spot0.circ === 3 && !D.spot0.hid), "D: spot 0 is either an empty spot with no circles, or a parked car with 3");
await done(fails);
