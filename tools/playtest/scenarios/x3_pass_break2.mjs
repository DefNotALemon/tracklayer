// Beta 3.4b1 round 2: pull-out for a car driving the other way (dir -1), at night in a storm, round a walker,
// staying on the road bed, and a page reload mid pull-out.
import { boot, ev, sleep, done, shot, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(100); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
const spot = await J(`(() => { const rs = TLXT.routes.slice().sort((a, b) => b.len - a.len);
  for (const r of rs) { for (let s = r.s0 + 200; s < r.s1 - 500; s += 20) { let good = true; for (let u = s; u < s + 400; u += 5) { let k = 0; while (k < r.cum.length - 2 && r.cum[k + 1] <= u) k++; if (r.vP[k] < 12.4 || r.vM[k] < 12.4 || r.street[k]) { good = false; break; } } if (good) return { id: r.id, s }; } }
  return null; })()`);
console.log("spot", JSON.stringify(spot));
ok(!!spot, "400 m straight found");
const RID = spot.id, S0 = spot.s;
const away = `(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${RID}", ${S0} - 300, 1); P.x = p.cx + 70; P.z = p.cz + 70; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`;
// obstacle in the lane the car (heading dir) drives in
const park = (dir, ahead) => `(() => { const p = TLXT.lanePt("${RID}", ${S0} + 200 + ${ahead} * ${dir}, ${dir}); P.x = p.x; P.z = p.z; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vz = 0; P.yaw = p.yaw; return true; })()`;
const stats = `(() => { const c = TLXT.cars[0]; return { pass: c.pass ? c.pass.st : null, lane: +c.lane.toFixed(2), v: +c.v.toFixed(2), s: Math.round(c.s), d: +TLXR.near(c.x, c.z).d.toFixed(2), onRoad: TLXR.onRoad(c.x, c.z), err: TLXT.tickErr || null, fin: Number.isFinite(c.x + c.z) }; })()`;

async function trial(name, dir, hourSetup, walker) {
  await ev(away); await ev(hourSetup);
  await ev(`TLXT.place("${RID}", ${S0} + 200, ${dir}); true`);
  await ev(park(dir, 70));
  if (walker) await ev(`(() => { P.x += 400; P.z += 400; recenter(P.x, P.z, true); FOOT.on = true; const p = TLXT.lanePt("${RID}", ${S0} + 200 + 70 * ${dir}, ${dir}); FOOT.x = p.x; FOOT.z = p.z; FOOT.y = surf(p.x, p.z); return true; })()`);
  let maxD = 0, offRoad = 0, maxLane = 0, started = false, hold = false;
  const done_ = await waitGame(60, async () => {
    if (!walker) await ev(`P.vx = P.vz = 0; true`); else await ev(`FOOT.x = ${0} || FOOT.x; true`);
    const q = await J(stats); maxD = Math.max(maxD, q.d); if (!q.onRoad) offRoad++; maxLane = Math.max(maxLane, Math.abs(q.lane));
    if (q.pass) started = true;
    if (!walker && q.pass === "out" && !hold) { hold = true; await shot("pb2_" + name); }
    return started && !q.pass && Math.abs(q.lane - 1.6) < 0.2 && q.v > 3;
  });
  const q = await J(stats);
  console.log(name, JSON.stringify(q), "maxD", maxD.toFixed(2), "offRoad polls", offRoad, "maxLane", maxLane.toFixed(2));
  ok(started, name + ": pull-out starts");
  ok(done_ && !q.err && q.fin, name + ": back in lane and driving on, no tick error");
  ok(maxD < 5, name + ": car never further than 5 m from the route centre (" + maxD.toFixed(2) + ")");
  return q;
}
await trial("A_dirMinus", -1, `GS.hour = 34; true`);
await trial("B_nightStorm", 1, `GS.hour = 46; GS.storm = 1; WX.at = () => 1; true`);
await ev(`GS.storm = 0; WX.at = () => 0; GS.hour = 34; true`);
await trial("C_walker", -1, `GS.hour = 34; true`, true);

// D: reload mid pull-out
await ev(`FOOT.on = false; true`);
await ev(away); await ev(`TLXT.place("${RID}", ${S0} + 200, 1); true`); await ev(park(1, 70));
await waitGame(25, async () => { await ev(`P.vx = P.vz = 0; true`); return (await J(stats)).pass === "out"; });
console.log("D before reload", JSON.stringify(await J(stats)));
await reload();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1500);
const D = await J(`({ ready: TLXT.ready, err: TLXT.err || TLXT.tickErr || null, n: TLXT.cars.filter(c => c.on).length, bad: TLXT.cars.filter(c => c.on && !Number.isFinite(c.x + c.z + c.v)).length, pass: TLXT.cars.filter(c => c.pass).length })`);
console.log("D after reload", JSON.stringify(D));
ok(D.ready && !D.err && D.bad === 0, "D: reload mid pull-out: traffic ready, no error, no NaN cars");
await waitGame(15);
const D2 = await J(`({ err: TLXT.tickErr || null, n: TLXT.cars.filter(c => c.on).length })`);
ok(!D2.err, "D: 15 s after reload no tick error (" + D2.n + " cars)");
console.log(fails ? `${fails} FAILED` : "all ok");
await done(fails ? 1 : 0);
