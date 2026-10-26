// G1: snowshoes from the recovery kit. Same walk twice on fresh powder (30 m out from a standstill, 25 m back along the
// trench), first without the kit, then (at a fresh spot) with "Shovel, strap & snowshoes" bought. Also 20 m along a
// plowed town lane each way so hard pack isn't made quicker. Prints game-s and m/s by gameClock; stills of the walker.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_snowshoe.mjs
import { boot, ev, st, shot, sideCam, camOff, park, tap, sleep, down, up, done } from "../lib.mjs";
await boot();
async function walkTo(dist, capSecs) {
  const s0 = JSON.parse(await ev("JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, d: depthAt(Math.round((FOOT.x + HALF) / CELL), Math.round((FOOT.z + HALF) / CELL))})"));
  await down("KeyW"); let s;
  try { for (;;) { await sleep(150); s = JSON.parse(await ev("JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, tired: FOOT.tired, sink: FOOT.sink})")); if (Math.hypot(s.x - s0.x, s.z - s0.z) >= dist || s.t - s0.t > capSecs) break; } }
  finally { await up("KeyW"); }
  const m = Math.hypot(s.x - s0.x, s.z - s0.z), dt = s.t - s0.t;
  return { m: +m.toFixed(1), secs: +dt.toFixed(1), avg: +(m / dt).toFixed(2), tired: +s.tired.toFixed(2), sink: +s.sink.toFixed(2), depth: +s0.d.toFixed(2) };
}
async function offAt(cx, cz) {
  console.log("parked at", JSON.stringify(await park(cx, cz)));
  await sleep(1500); await tap("KeyQ"); await sleep(2500);
  if (!(await st()).onFoot) { console.log("FAIL: not on foot"); await done(1); }
  await ev("FOOT.yaw = Math.PI / 2; true");
}
const res = {};
for (const kit of [false, true]) {
  const tag = kit ? "kit" : "none";
  await ev(kit ? `GS.own.partsOwned["recovery:kit"] = true; GS.own.parts.recovery = "kit"; restat(); true` : `GS.own.parts.recovery = "none"; restat(); true`);
  await offAt(kit ? "SPAWN.x + 520" : "SPAWN.x + 400", kit ? "SPAWN.z + 420" : "SPAWN.z + 300");
  console.log(tag, "FOOT.shoe =", await ev("String(!!FOOT.shoe)"));
  const p = await walkTo(30, 60);
  console.log(`${tag} powder 30 m: ${p.secs} s game, avg ${p.avg} m/s, tired ${p.tired}, sink ${p.sink}, depth ${p.depth}`);
  await sideCam(); await shot(`${kit ? "2" : "1"}1_${tag}_powder_side`); await camOff(); await shot(`${kit ? "2" : "1"}2_${tag}_chase`);
  await sleep(2000);
  await ev("FOOT.yaw += Math.PI; true"); await sleep(400);
  const b = await walkTo(25, 60);
  console.log(`${tag} trench 25 m: ${b.secs} s game, avg ${b.avg} m/s, tired ${b.tired}, sink ${b.sink}`);
  res[tag] = { powder: p.avg, trench: b.avg, t30: p.secs };
  // hard pack: the wade factor at pack 1, which the shoes must leave alone
  res[tag].wadePack1 = await ev(`typeof footWade === "function" ? footWade(0, 1) : "n/a"`);
  await ev("P.x = FOOT.x + 1; P.z = FOOT.z; P.y = surf(P.x, P.z) + 0.3; true"); await tap("KeyQ"); await sleep(1800);
}
console.log("SUMMARY", JSON.stringify(res));
await done();
