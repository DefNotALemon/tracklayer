// Lane A, 27 Nov: a bogged truck set on plowed ground is free of the bog (beta 0117 #2), on EVERY plowed town street and yard.
// The rule's limits dated from before the street grid ("every tyre under 5 cm, pack over 0.8") and five of seven plowed
// spots kept the truck bogged. Asserts: on each of the longest town streets and the biggest yards a truck flagged bogged
// is freed within 1.5 s and then drives off; a truck really bogged in deep powder stays bogged through 5 s of throttle,
// 4 s of reverse and 3 s of waiting (the rule must not let it out of a real hole).
import { boot, ev, sleep, done, down, up, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(120); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; GS.warmth = 100; WX.at = () => 0; GS.storm = 0; TLXV.buy("pickup"); true`); await sleep(500);
await ev(`TLXV.swapTo(TLX.state("vehicles").owned[0].uid); true`); await sleep(700);
ok(await ev(`!!VEH.cur && !FOOT.on`), "in the pickup");
const read = () => J(`(() => { const R = TLXV.rt(); return { bog: BOG.on, pack: +P.pack.toFixed(2), sink: R.sink.map(v => +v.toFixed(3)), yard: +yardAt(P.x, P.z).toFixed(2) }; })()`);
// the plowed places: the longest streets (r <= 5), the widest yards, clear of anything solid
const lanes = await J(`YARDS.filter(Y => Math.hypot(Y.x - depot.x, Y.z - depot.z) < TOWN_R && !isSea(Y.x, Y.z)).map(Y => { const two = Y.x2 !== undefined, L = two ? Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z) : 0; return { x: two ? (Y.x + Y.x2) / 2 : Y.x, z: two ? (Y.z + Y.z2) / 2 : Y.z, yaw: two && L > 1 ? Math.atan2(Y.x2 - Y.x, Y.z2 - Y.z) : 0, L: +L.toFixed(1), r: +Y.r.toFixed(1), k: Y.k === undefined ? 1 : Y.k }; }).filter(l => !obNear(l.x, l.z, 4.5) && yardAt(l.x, l.z) >= 0.85)`);
const streets = lanes.filter(l => l.r <= 5 && l.L >= 40).sort((a, b) => b.L - a.L), yards = lanes.filter(l => l.r >= 6).sort((a, b) => b.r - a.r);
const pick = [], far = l => pick.every(q => Math.hypot(q.x - l.x, q.z - l.z) > 25);
for (const l of streets) { if (pick.length >= 6) break; if (far(l)) pick.push(l); }
const nS = pick.length; for (const l of yards) { if (pick.length >= nS + 4) break; if (far(l)) pick.push(l); }
ok(nS >= 4 && pick.length >= nS + 2, `plowed places to try: ${nS} streets and ${pick.length - nS} yards (of ${streets.length} / ${yards.length})`);
let freed = 0; const worst = { sink: 0, mean: 0, pack: 1 };
for (const l of pick) {
  await ev(`(() => { BOG.on = false; BOG.acc = 0; P.x = ${l.x}; P.z = ${l.z}; P.yaw = ${l.yaw}; P.vx = P.vy = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`);
  await waitGame(0.8);
  await ev(`enterBog(0.6); true`);
  const was = await ev(`BOG.on`);                                   // read in the frame it is set (the rule may clear it in the next)
  const out = await waitUntil("!BOG.on", 1.5), r = await read();
  const mean = r.sink.reduce((a, b) => a + b, 0) / 4; worst.sink = Math.max(worst.sink, ...r.sink); worst.mean = Math.max(worst.mean, mean); worst.pack = Math.min(worst.pack, r.pack);
  if (out) freed++;
  ok(out, `${l.r <= 5 ? "street" : "yard"} (r ${l.r}, ${l.L} m, plowed ${r.yard}): the bog clears (set ${was}; sink ${JSON.stringify(r.sink)}, pack ${r.pack})`);
}
console.log(`freed on ${freed} of ${pick.length}; worst tyre ${worst.sink.toFixed(3)} m, worst mean ${worst.mean.toFixed(3)} m, lowest pack ${worst.pack}`);
ok(worst.mean < 0.085 && worst.sink < 0.12 && worst.pack > 0.74, `room under the rule's limits (mean < 0.1, tyre < 0.14, pack > 0.7): mean ${worst.mean.toFixed(3)}, tyre ${worst.sink.toFixed(3)}, pack ${worst.pack}`);
// and it drives off the last one
{ await ev(`window.__t0 = [P.x, P.z]; true`); await down("KeyW"); await waitGame(3); await up("KeyW"); const mv = await J(`Math.hypot(P.x - __t0[0], P.z - __t0[1])`); ok(mv > 6, `then W drives off (${mv.toFixed(1)} m in 3 s)`); await down("KeyS"); await waitUntil("Math.hypot(P.vx, P.vz) < 0.5", 6); await up("KeyS"); }
// a real hole stays a hole: deep open powder, W until it bogs, then everything a driver might try from the seat
const deep = await J(`(() => { const fr = (x, z) => freshAt(Math.round((x + HALF) / CELL), Math.round((z + HALF) / CELL));
  for (let r = 120; r < 3600; r += 37) for (let a = 0; a < 6.28; a += 0.21) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 25) || slopeAt(x, z, 10) > 0.035 || yardAt(x, z) > 0.05 || bioAt(x, z) === 1) continue;
    let s = 0; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) s += fr(x + i * 2, z + j * 3); if (s / 9 >= 0.5) return { x, z, m: +(s / 9).toFixed(2) }; } return null; })()`);
ok(!!deep, `a deep open spot (${JSON.stringify(deep)})`);
if (deep) {
  await ev(`(() => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; P.x = ${deep.x}; P.z = ${deep.z}; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(P.x, P.z); recenter(P.x, P.z, true); return 1; })()`);
  await waitGame(0.8);
  await down("KeyW"); const bogged = await waitUntil("BOG.on", 9);
  ok(bogged, `${deep.m} m of powder: W digs it in (bog ${bogged})`);
  let lost = 0; const watch = async s => { const t0 = await clock(); while ((await clock()) - t0 < s) { if (!(await ev("BOG.on"))) lost++; await sleep(100); } };
  await watch(5); await up("KeyW");
  const r1 = await read(); console.log("  after 5 s of throttle:", JSON.stringify(r1));
  await down("KeyS"); await watch(4); await up("KeyS");
  await watch(3);
  const r2 = await read(); console.log("  after reverse and a wait:", JSON.stringify(r2));
  ok(lost === 0 && r2.bog, `it stays bogged through 5 s of W, 4 s of S and 3 s of nothing (frames read free: ${lost})`);
}
ok(errors.length === 0, "no page errors");
await done(fails ? 1 : 0);
