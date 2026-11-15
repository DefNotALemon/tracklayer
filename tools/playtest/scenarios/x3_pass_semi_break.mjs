// Beta 3.4b1 x 3.5a/3.5b2b1: a road-traffic SEMI held up by a parked sled / a walker pulls out round it, with its
// trailer swinging; does the trailer clip the obstacle, stay on the road bed, return to lane, and survive a reload.
import { boot, ev, sleep, done, shot, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(100); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
const si = await J(`TLXT.cars.map((c, i) => c.semi ? i : -1).filter(i => i >= 0)`);
console.log("semi car indices", JSON.stringify(si));
ok(si.length > 0, "traffic has semi drivers");
const SI = si[0];
const spot = await J(`(() => { const rs = TLXT.routes.slice().sort((a, b) => b.len - a.len);
  for (const r of rs) { for (let s = r.s0 + 200; s < r.s1 - 500; s += 20) { let good = true; for (let u = s; u < s + 400; u += 5) { let k = 0; while (k < r.cum.length - 2 && r.cum[k + 1] <= u) k++; if (r.vP[k] < 12.4 || r.vM[k] < 12.4 || r.street[k]) { good = false; break; } } if (good) return { id: r.id, s }; } }
  return null; })()`);
ok(!!spot, "400 m straight found"); const RID = spot.id, S0 = spot.s;
const away = `(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${RID}", ${S0} - 300, 1); P.x = p.cx + 70; P.z = p.cz + 70; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`;
const park = (dir, ahead) => `(() => { const p = TLXT.lanePt("${RID}", ${S0} + 200 + ${ahead} * ${dir}, ${dir}); P.x = p.x; P.z = p.z; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vz = 0; P.yaw = p.yaw; return true; })()`;
const stats = `(() => { const c = TLXT.cars[${SI}]; const q = TLXT.semiInfo(${SI}); let mn = 99; if (q && q.circ) for (const k of q.circ) { const d = Math.hypot(k[0] - (FOOT.on ? FOOT.x : P.x), k[1] - (FOOT.on ? FOOT.z : P.z)) - k[2]; if (d < mn) mn = d; }
  let tail = q ? TLXR.near(q.ax, q.az).d : 0; return { pass: c.pass ? c.pass.st : null, lane: +c.lane.toFixed(2), v: +c.v.toFixed(2), art: q ? +q.art.toFixed(2) : null, why: q && q.why, wait: q && q.waiting, mnClear: +mn.toFixed(2), tailD: +tail.toFixed(2), onRoad: TLXR.onRoad(c.x, c.z), err: TLXT.tickErr || null, fin: Number.isFinite(c.x + c.z) }; })()`;
async function trial(name, type, dir, walker) {
  await ev(away); await ev(`TLXT.place("${RID}", ${S0} + 200, ${dir}, ${SI}, "${type}"); true`);
  await ev(park(dir, 70));
  if (walker) await ev(`(() => { P.x += 400; P.z += 400; recenter(P.x, P.z, true); FOOT.on = true; const p = TLXT.lanePt("${RID}", ${S0} + 200 + 70 * ${dir}, ${dir}); FOOT.x = p.x; FOOT.z = p.z; FOOT.y = surf(p.x, p.z); return true; })()`);
  let minClear = 99, maxTail = 0, started = false, maxArt = 0, shotDone = false, offRoad = 0, last;
  const done_ = await waitGame(80, async () => {
    if (!walker) await ev(`P.vx = P.vz = 0; true`);
    const q = last = await J(stats); minClear = Math.min(minClear, q.mnClear); maxTail = Math.max(maxTail, q.tailD); maxArt = Math.max(maxArt, Math.abs(q.art || 0)); if (!q.onRoad) offRoad++;
    if (q.pass) started = true;
    if (!walker && q.pass === "out" && !shotDone) { shotDone = true; await shot("sp_" + name); }
    return started && !q.pass && Math.abs(q.lane - 1.6) < 0.25 && q.v > 2.5;
  });
  console.log(name, JSON.stringify(last), "minClear", minClear.toFixed(2), "maxTailD", maxTail.toFixed(2), "maxArt", maxArt.toFixed(2), "offRoadPolls", offRoad);
  ok(started, name + ": pull-out starts");
  ok(done_ && !last.err && last.fin, name + ": back in lane, driving on, no error");
  ok(minClear > 0.2, name + ": no trailer/tractor circle overlapped the obstacle (min gap " + minClear.toFixed(2) + " m)");
  ok(maxTail < 5.5, name + ": trailer tail stayed within 5.5 m of the route centre (" + maxTail.toFixed(2) + ")");
}
const types = await J(`Object.keys(window.TLXS ? (TLXS.TYPES || {}) : {})`).catch(() => []);
console.log("types", JSON.stringify(types));
await trial("A_default_dirP", undefined, 1, false);
await trial("B_dirMinus", undefined, -1, false);
await trial("C_walker", undefined, 1, true);
// D: reload while the semi is mid pull-out
await ev(`FOOT.on = false; true`); await ev(away); await ev(`TLXT.place("${RID}", ${S0} + 200, 1, ${SI}); true`); await ev(park(1, 70));
await waitGame(30, async () => { await ev(`P.vx = P.vz = 0; true`); return (await J(stats)).pass === "out"; });
console.log("D before reload", JSON.stringify(await J(stats)));
await reload();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1500);
const D = await J(`({ ready: TLXT.ready, err: TLXT.err || TLXT.tickErr || null, bad: TLXT.cars.filter(c => c.on && !Number.isFinite(c.x + c.z + c.v)).length, semis: TLXT.cars.filter(c => c.semi && c.on).length })`);
console.log("D after", JSON.stringify(D));
ok(D.ready && !D.err && D.bad === 0, "D: reload mid pull-out: no error, no NaN");
await waitGame(15); ok(!(await J(`TLXT.tickErr || null`)), "D: 15 s later no tick error");
console.log(fails ? `${fails} FAILED` : "all ok");
await done(fails ? 1 : 0);
