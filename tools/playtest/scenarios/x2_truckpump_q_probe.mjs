// Probe: Q (get out) in the truck parked at a pump: while filling, when full, and on a plain spot. Prints state each 0.5 s.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x2_truckpump_q_probe.mjs [outdir]
import { boot, ev, tap, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return (await clock()) - t0; await sleep(100); } return -1; }
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 20000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3; FOOT.z = r.z - fx * 3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(900); await tap("KeyQ");
console.log("board s", await waitUntil(`!MNT.on && !FOOT.on && !!VEH.cur`));
const S = () => J(`({ foot: FOOT.on, dmt: DMT.on, mnt: MNT.on, veh: !!VEH.cur, fuel: +GS.fuel.toFixed(1), fs: !!FS.spot, spd: +Math.hypot(P.vx, P.vz).toFixed(2), hint: (document.querySelector("#hint")||{}).textContent })`);
for (const [label, fuel] of [["filling", 5], ["full", 70]]) {
  await ev(`(() => { const t = STATIONS.find(t => t.x !== undefined); P.x = t.x; P.z = t.z; P.y = surf(t.x, t.z); P.vx = P.vz = 0; recenter(t.x, t.z, true); GS.fuel = ${fuel}; GS.cash = 5000; return 1; })()`);
  await sleep(2000);
  console.log(label, "before Q", JSON.stringify(await S()));
  await tap("KeyQ");
  for (let i = 0; i < 6; i++) { await sleep(700); console.log("  +", i, JSON.stringify(await S())); }
  if (await ev("FOOT.on")) { await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.x = r.x + fz * 3; FOOT.z = r.z - fx * 3; FOOT.yaw = r.yaw - 1.4; return 1; })()`); await sleep(900); await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur"); }
}
await done(0);
