// G1 follow-up to v103 (report 0040 backlog item): does the sledWhere() hint stay correct
// through a normal A/D turn-in-place (not a scripted yaw snap), where the trailing camera
// could make "straight ahead" read wrong for a beat?
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_sledhint_turn.mjs
import { boot, ev, shot, park, tap, sleep, down, up, done } from "../lib.mjs";
await boot();
console.log("parked at", JSON.stringify(await park()));
await ev("WX.at = () => 0; GS.storm = 0; true");
await sleep(1500);
await tap("KeyQ"); await sleep(2500);
const S = `JSON.stringify((() => { const dx = P.x - FOOT.x, dz = P.z - FOOT.z; let r = Math.atan2(dx, dz) - FOOT.yaw; r = Math.atan2(Math.sin(r), Math.cos(r));
  return { d: +Math.hypot(dx, dz).toFixed(1), relDeg: Math.round(r * 180 / Math.PI), hint: WN.hint, t: +gameClock.toFixed(1) }; })())`;
// walk out ~25 m facing away from the sled
await ev("FOOT.yaw = Math.atan2(P.x - FOOT.x, P.z - FOOT.z) + Math.PI; true"); await sleep(300);
await down("KeyW");
try { for (let i = 0; i < 200; i++) { await sleep(200); if (JSON.parse(await ev(S)).d > 25) break; } } finally { await up("KeyW"); }
await sleep(500);
const r0 = JSON.parse(await ev(S)); console.log("facing away, 25m out:", JSON.stringify(r0));
await shot("00_before_turn");
// now turn in place with real D (turn right) key taps until roughly facing the sled, reading the hint as we go
let last;
await down("KeyD");
for (let i = 0; i < 40; i++) {
  await sleep(150);
  last = JSON.parse(await ev(S));
  if (Math.abs(last.relDeg) < 15) break;
}
await up("KeyD");
await sleep(300);
const r1 = JSON.parse(await ev(S));
console.log("mid-turn last sample:", JSON.stringify(last));
console.log("settled after turn:", JSON.stringify(r1));
await shot("01_after_turn_facing_sled");
// keep turning past it to rel ~ -90 (sled now on the right) and read again
await down("KeyD");
for (let i = 0; i < 40; i++) {
  await sleep(150);
  last = JSON.parse(await ev(S));
  if (last.relDeg <= -80 && last.relDeg >= -100) break;
}
await up("KeyD");
await sleep(300);
const r2 = JSON.parse(await ev(S));
console.log("settled past, sled on right:", JSON.stringify(r2));
await shot("02_after_turn_sled_right");
const okNear0 = Math.abs(r1.relDeg) <= 20 && /ahead/i.test(r1.hint);
const okRight = r2.relDeg < -60 && /right/i.test(r2.hint);
console.log(`SUMMARY turn-in-place hint tracks real facing: facing-sled case ${okNear0 ? "OK" : "MISMATCH"} (relDeg ${r1.relDeg}, hint "${r1.hint}"); sled-on-right case ${okRight ? "OK" : "MISMATCH"} (relDeg ${r2.relDeg}, hint "${r2.hint}")`);
await done();
