// Probe 2: Q (get out) in the truck at stations: on the pump, then offsets from it; prints toasts and hint, also the sled at the pump.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x2_truckpump_q_probe2.mjs [outdir]
import { boot, ev, tap, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return (await clock()) - t0; await sleep(100); } return -1; }
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 20000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
const board = async () => { await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const x = VEH.cur ? P.x : r.x, z = VEH.cur ? P.z : r.z, yaw = VEH.cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw); crashCancel(); FOOT.on = true; FOOT.x = x + fz * 3; FOOT.z = z - fx * 3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`); await sleep(900); await tap("KeyQ"); return waitUntil(`!MNT.on && !FOOT.on && !!VEH.cur`); };
console.log("board", await board());
const info = await J(`(() => { const t = STATIONS.find(t => t.x !== undefined); return { x: t.x, z: t.z, reach: FUEL.reach, near: GS.near && GS.near.name }; })()`);
console.log(JSON.stringify(info));
for (const off of [0, 8, 16, 24, 40]) {
  await ev(`(() => { const t = STATIONS.find(t => t.x !== undefined); P.x = t.x + ${off}; P.z = t.z; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); GS.fuel = 10; GS.cash = 5000; return 1; })()`);
  await sleep(1800);
  const pre = await J(`({ fs: !!FS.spot, near: GS.near && GS.near.name, int: typeof INT !== "undefined" && INT.on, hint: [...document.querySelectorAll("#hint,#wnHint,#rideHint")].map(e => e.textContent).join("|").slice(0,120) })`);
  await tap("KeyQ");
  const t = await waitUntil("!DMT.on && FOOT.on", 8);
  console.log("off", off, "pre", JSON.stringify(pre), "got out in", t < 0 ? "never" : t.toFixed(1), "toasts", JSON.stringify(await J(`[...document.querySelectorAll("#toasts > *")].map(e => e.textContent)`)));
  if (await ev("FOOT.on")) await board();
}
await done(0);
