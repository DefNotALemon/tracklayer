// G1 target check: from a standstill, how long (game s) to wade 30 m of fresh powder, and how fast back along
// the trench you just made. LOOP.md target: 30 m of powder in under ~20 s, trench clearly faster than powder.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_walk30.mjs
import { boot, ev, st, shot, sideCam, camOff, park, tap, sleep, down, up, done } from "../lib.mjs";
await boot();
console.log("parked at", JSON.stringify(await park()));
await sleep(1500);
await tap("KeyQ"); await sleep(2500);
if (!(await st()).onFoot) { console.log("FAIL: not on foot"); await done(1); }
await ev("FOOT.yaw = Math.PI / 2; true");
// walk until 30 m from the start point, by game clock
async function walkTo(dist, capSecs) {
  const s0 = JSON.parse(await ev("JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, d: depthAt(Math.round((FOOT.x + HALF) / CELL), Math.round((FOOT.z + HALF) / CELL))})"));
  await down("KeyW"); let s;
  try { for (;;) { await sleep(150); s = JSON.parse(await ev("JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, tired: FOOT.tired})")); if (Math.hypot(s.x - s0.x, s.z - s0.z) >= dist || s.t - s0.t > capSecs) break; } }
  finally { await up("KeyW"); }
  const m = Math.hypot(s.x - s0.x, s.z - s0.z), dt = s.t - s0.t;
  return { m: +m.toFixed(1), secs: +dt.toFixed(1), avg: +(m / dt).toFixed(2), tired: +s.tired.toFixed(2), depth: +s0.d.toFixed(2) };
}
const p = await walkTo(30, 60);
console.log(`powder 30 m: ${p.secs} s game, avg ${p.avg} m/s, tired ${p.tired}, depth at start ${p.depth} m`);
await sideCam(); await shot("01_powder_side"); await camOff(); await shot("02_powder_chase");
await sleep(2000);
await ev("FOOT.yaw += Math.PI; true"); await sleep(400);
const b = await walkTo(25, 60);
console.log(`trench 25 m: ${b.secs} s game, avg ${b.avg} m/s, tired ${b.tired}`);
console.log(`ratio trench/powder: ${(b.avg / p.avg).toFixed(2)}`);
await done();
