// G2 (report 0031 F2): warmth drain per game-second on a fresh save, riding vs standing on foot vs walking,
// weather pinned calm, away from any warm site. Prints warmth/s for each, plus the cold formula inputs.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_coldrate.mjs
import { boot, ev, tap, sleep, park, timed, done } from "../lib.mjs";
await boot();
const STORM = +(process.env.STORM || 0);
await ev(`WX.at = () => ${STORM}; GS.storm = ${STORM}; true`);
const pk = await park("P.x + 500", "P.z + 400");
console.log("park", JSON.stringify(pk));
await sleep(800);
const info = await ev(`JSON.stringify({ hour: +(GS.hour%24).toFixed(2), night: +(1-dayFactor()).toFixed(2), storm: +GS.storm.toFixed(2), warm: +ST.warm.toFixed(2), coldMul: +ST.coldMul.toFixed(2), camp: ST.camp, campCap: ST.campCap, sled: GS.own.sled })`);
console.log("inputs", info);
async function rate(label, keys, secs, prep) {
  await ev(`GS.warmth = 90; GS.coldWarned = false; true`); if (prep) await ev(prep);
  const t0 = await ev("gameClock"), w0 = await ev("GS.warmth");
  await timed(keys, secs, async () => 0);
  const t1 = await ev("gameClock"), w1 = await ev("GS.warmth");
  const extra = await ev(`JSON.stringify({ foot: !!FOOT.on, sp: FOOT.on ? +FOOT.sp.toFixed(2) : +Math.hypot(P.vx,P.vz).toFixed(1), camping: !!GS.camping })`);
  console.log(`${label}: ${((w1 - w0) / (t1 - t0)).toFixed(3)} warmth/s over ${(t1 - t0).toFixed(1)} s ${extra}`);
}
await rate("sled parked", [], 6);
await rate("sled riding W", ["KeyW"], 6);
await ev(`P.vx = P.vz = 0; true`); await sleep(500);
await tap("KeyQ"); await sleep(2500);
console.log("onFoot", await ev("FOOT.on"));
await rate("foot standing", [], 6);
await rate("foot walking W", ["KeyW"], 6);
// a crash eject at speed, then standing
await tap("KeyQ"); await sleep(2500);
await ev(`P.vx = Math.sin(P.yaw) * 30; P.vz = Math.cos(P.yaw) * 30; crashEject("test", P.vx, 2, P.vz); true`);
await sleep(4000);
console.log("after crash onFoot", await ev("FOOT.on"), await ev("JSON.stringify({crash: CRASH.on ? CRASH.st : null})"));
await rate("post-crash standing", [], 6);
await rate("post-crash walking W", ["KeyW"], 6);
await done();
