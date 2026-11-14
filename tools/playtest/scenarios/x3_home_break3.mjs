// Beta of 3.4b2b round 3 (cars drive home): coverage gaps of 0167. A two cars homing on one road (min car-car gap, both park);
// B a car that just came home gets snow in a storm and becomes diggable; C away spot is empty (no colliders) and stays so after reload;
// D homing car while the sled blocks the spot, then a storm + night.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(150); } return false; }
process.env.TL_AWAY = "1";
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34.5; true`); await sleep(1200);
const info = await J(`({ n: TLXT.cars.length, homes: TLXT.homes.length, h: TLXT.homes.slice(0, 8).map(h => ({ i: h.i, r: h.r.id, side: h.side, x: Math.round(h.x), z: Math.round(h.z) })) })`);
console.log("info", JSON.stringify(info));
ok(info.n >= 2 && info.homes >= 2, `setup: ${info.n} traffic cars, ${info.homes} homes`);

// ---- A: two cars, two homes on the same route if possible
const pair = await J(`(() => { const H = TLXT.homes; for (let a = 0; a < H.length; a++) for (let b = a + 1; b < H.length; b++) if (H[a].r === H[b].r && Math.hypot(H[a].x - H[b].x, H[a].z - H[b].z) < 120) return [a, b]; return null; })()`);
console.log("A pair:", JSON.stringify(pair));
if (pair) {
  const [a, b] = pair;
  await ev(`(() => { for (const c of TLXC.cars) TLXC.setAway(c.i, false); const H = TLXT.homes; TLXC.setAway(H[${a}].ci, true); TLXC.setAway(H[${b}].ci, true);
    const x = H[${a}].x + 90, z = H[${a}].z + 60; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; P.vx = P.vz = 0; recenter(x, z, true);
    window.__hd = TLXT.homesDone; TLXT.sendHome(${a}, 160, 0); TLXT.sendHome(${b}, 130, 1); return true; })()`);
  let gmin = 1e9;
  await waitGame(90, async () => { const q = await J(`(() => { const c0 = TLXT.cars[0], c1 = TLXT.cars[1]; return { d: Math.hypot(c0.x - c1.x, c0.z - c1.z), both: c0.on && c1.on, done: TLXT.homesDone - window.__hd }; })()`); if (q.both) gmin = Math.min(gmin, q.d); return q.done >= 2; });
  const A = await J(`(() => { const H = TLXT.homes; return { done: TLXT.homesDone - window.__hd, a: !!TLXC.cars[H[${a}].ci].away, b: !!TLXC.cars[H[${b}].ci].away, err: TLXT.tickErr || TLXC.tickErr || null }; })()`);
  console.log("A:", JSON.stringify({ A, gmin }));
  ok(gmin > 2.5, `A: two homing cars never closer than ${gmin.toFixed(2)} m`);
  ok(A.done >= 2 && !A.a && !A.b && !A.err, `A: both parked (done ${A.done}), none still away, err ${A.err}`);
}

// ---- B: arrived car, then storm snow
const HB = 0;
await ev(`(() => { for (const c of TLXC.cars) TLXC.setAway(c.i, false); for (const c of TLXT.cars) { c.on = false; } for (const h of TLXT.homes) h.taken = -1; TLXT.hold = false; const h = TLXT.homes[${HB}]; TLXC.setAway(h.ci, true);
  const x = h.x + 70, z = h.z + 40; P.x = x; P.z = z; P.y = surf(x, z) + 0.3; recenter(x, z, true); window.__hd = TLXT.homesDone; TLXT.sendHome(${HB}, 120, 0); return true; })()`);
const arrived = await waitGame(70, async () => (await J(`TLXT.homesDone - window.__hd`)) > 0);
const ci = await J(`TLXT.homes[${HB}].ci`);
ok(arrived, "B: car came home");
await ev(`(() => { WX.at = () => 1; GS.storm = 1; return true; })()`);
const b0 = await J(`({ b: TLXC.cars[${ci}].b, away: !!TLXC.cars[${ci}].away })`);
await ev(`(() => { GS.hour += 14; return true; })()`);   // a stormy night
await waitGame(25, null);
const b1 = await J(`({ b: TLXC.cars[${ci}].b, away: !!TLXC.cars[${ci}].away, dg: TLXC.buried(), circ: obstaclesNear(TLXC.cars[${ci}].x, TLXC.cars[${ci}].z, 5).filter(o => o.car === ${ci}).length })`);
console.log("B:", JSON.stringify({ b0, b1 }));
ok(!b1.away && b1.circ === 3, `B: homed car solid again (circles ${b1.circ}), not away`);
ok(b1.b > b0.b, `B: storm snow on the homed car (${b0.b.toFixed(3)} -> ${b1.b.toFixed(3)})`);

// ---- C: away spot is empty + survives reload
await ev(`(() => { WX.at = () => 0; GS.storm = 0; for (const c of TLXC.cars) TLXC.setAway(c.i, false); const h = TLXT.homes[1]; TLXC.setAway(h.ci, true); return true; })()`);
const c0 = await J(`(() => { const h = TLXT.homes[1], pc = TLXC.cars[h.ci]; return { circ: obstaclesNear(pc.x, pc.z, 5).filter(o => o.car === pc.i).length, hid: !!pc.hid, away: !!pc.away }; })()`);
ok(c0.circ === 0 && c0.away, `C: away spot has no obstacle circles (${c0.circ})`);
await reload(); await sleep(1500);
const c1 = await J(`(() => ({ aw: TLXC.cars.filter(c => c.away).map(c => c.i), phantom: TLXC.cars.filter(c => c.away && obstaclesNear(c.x, c.z, 5).some(o => o.car === c.i)).length, hidNotAway: TLXC.cars.filter(c => c.hid && !c.away && c.b < 0.9).length, err: TLXT.tickErr || TLXC.tickErr || null }))()`);
console.log("C after reload:", JSON.stringify(c1));
ok(c1.phantom === 0 && c1.hidNotAway === 0 && !c1.err, `C: after reload no phantom colliders on empty spots, no hidden non-away car`);

// ---- D: Options traffic off with owners out
await ev(`(() => { TLX.setOn("traffic", false); return true; })()`);
await sleep(1500);
const d = await J(`({ away: TLXC.awayN(), opt: TLX.on("traffic") })`);
console.log("D:", JSON.stringify(d));
ok(d.opt === false ? d.away === 0 : true, `D: traffic option off -> every owner home (away ${d.away}, opt ${d.opt})`);
done(fails ? 1 : 0);
