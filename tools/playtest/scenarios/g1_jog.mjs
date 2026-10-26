// G1 jog: holding Shift (gamepad RB, touch lean) on foot breaks into a jog. Measures by gameClock:
// 20 m of fresh powder walking vs jogging (two fresh directions), 20 m back along each trench walking vs jogging,
// and a long jog on hard pack: how far / how long until you're blown, and the pace after.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_jog.mjs
import { boot, ev, st, shot, sideCam, camOff, park, tap, sleep, down, up, done } from "../lib.mjs";
await boot();
console.log("parked at", JSON.stringify(await park()));
await ev("WX.at = () => 0; GS.storm = 0; true");
await sleep(1500);
await tap("KeyQ"); await sleep(2500);
if (!(await st()).onFoot) { console.log("FAIL: not on foot"); await done(1); }
const S = "JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, tired: FOOT.tired, wind: FOOT.wind || 0, sp: FOOT.sp})";
async function go(keys, dist, capSecs) {
  const s0 = JSON.parse(await ev(S)); let s, peak = 0;
  for (const k of keys) await down(k);
  try { for (;;) { await sleep(150); s = JSON.parse(await ev(S)); peak = Math.max(peak, s.sp); if (Math.hypot(s.x - s0.x, s.z - s0.z) >= dist || s.t - s0.t > capSecs) break; } }
  finally { for (const k of keys) await up(k); }
  const m = Math.hypot(s.x - s0.x, s.z - s0.z), dt = s.t - s0.t;
  return { m: +m.toFixed(1), secs: +dt.toFixed(1), avg: +(m / dt).toFixed(2), peak: +peak.toFixed(2), tired: +s.tired.toFixed(2), wind: +s.wind.toFixed(2) };
}
async function rest(s) { const t0 = JSON.parse(await ev(S)).t; for (;;) { await sleep(300); if (JSON.parse(await ev(S)).t - t0 > s) break; } }
async function face(yaw) { await ev(`FOOT.yaw = ${yaw}; true`); await sleep(300); }
// powder walk east, back along it
await face(Math.PI / 2);
const pw = await go(["KeyW"], 20, 40); console.log("powder walk 20 m", JSON.stringify(pw));
await rest(12); await face(-Math.PI / 2);
const tw = await go(["KeyW"], 20, 40); console.log("trench walk 20 m", JSON.stringify(tw));
await rest(12);
// powder jog north (fresh), back along it jogging
await face(0);
const pj = await go(["KeyW", "ShiftLeft"], 20, 40); console.log("powder jog 20 m", JSON.stringify(pj));
await sideCam(); await shot("01_jog_powder"); await camOff();
await rest(15); await face(Math.PI);
const tj = await go(["KeyW", "ShiftLeft"], 20, 40); console.log("trench jog 20 m", JSON.stringify(tj));
// long jog on hard pack: pack a 60 m strip and jog it
await ev(`(() => { addLane([[FOOT.x - 3, FOOT.z], [FOOT.x + 130, FOOT.z]], 3); return true; })()`);
await sleep(500);
console.log("hard pack check d/f:", await ev(`(() => { const ix = Math.round((FOOT.x + 10 + HALF) / CELL), iz = Math.round((FOOT.z + HALF) / CELL); return depthAt(ix, iz).toFixed(2) + "/" + freshAt(ix, iz).toFixed(2); })()`));
await rest(15); await face(Math.PI / 2);
const s0 = JSON.parse(await ev(S)); const log = []; let blownAt = null;
await down("KeyW"); await down("ShiftLeft");
try { for (;;) { await sleep(300); const s = JSON.parse(await ev(S)); const m = Math.hypot(s.x - s0.x, s.z - s0.z); log.push([+(s.t - s0.t).toFixed(1), +m.toFixed(1), +s.sp.toFixed(2), +s.wind.toFixed(2)]); if (blownAt === null && (await ev("FOOT.blown ? 1 : 0")) == 1) blownAt = [+(s.t - s0.t).toFixed(1), +m.toFixed(1)]; if (s.t - s0.t > 30 || m > 110) break; } }
finally { await up("KeyW"); await up("ShiftLeft"); }
console.log("long jog samples [t, m, sp, wind]:", JSON.stringify(log.filter((_, i) => i % 4 === 0)));
console.log("blown at [t, m]:", JSON.stringify(blownAt));
console.log(`SUMMARY powder walk ${pw.avg} jog ${pj.avg} (x${(pj.avg / pw.avg).toFixed(2)}); trench walk ${tw.avg} jog ${tj.avg} (x${(tj.avg / tw.avg).toFixed(2)})`);
await done();
