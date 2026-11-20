// Probe 3: is Q blocked next to the Kjøllefjord pump because of a collider? Truck at several yaws and offsets near the pump; also the sled; prints dismount result + colliders near.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x2_truckpump_q_probe3.mjs [outdir]
import { boot, ev, tap, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return (await clock()) - t0; await sleep(100); } return -1; }
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 20000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
const board = async () => { await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const x = VEH.cur ? P.x : r.x, z = VEH.cur ? P.z : r.z, yaw = VEH.cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw); crashCancel(); FOOT.on = true; FOOT.x = x + fz * 3; FOOT.z = z - fx * 3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`); await sleep(900); await tap("KeyQ"); return waitUntil(`!MNT.on && !FOOT.on && !!VEH.cur`); };
await board();
const out = [];
for (const [dx, dz, yaw] of [[0, 0, 0], [0, 0, 1.57], [0, 0, 3.14], [8, 0, 0], [8, 0, 1.57], [-8, 0, 0], [0, 8, 1.57], [0, -8, 1.57], [12, 0, 1.57]]) {
  await ev(`(() => { const t = STATIONS.find(t => t.x !== undefined); P.x = t.x + ${dx}; P.z = t.z + ${dz}; P.yaw = ${yaw}; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); GS.fuel = 69; return 1; })()`);
  await sleep(1500);
  await tap("KeyQ");
  const t = await waitUntil("!DMT.on && FOOT.on", 5);
  const r = `d(${dx},${dz}) yaw ${yaw}: ${t < 0 ? "BLOCKED" : "out " + t.toFixed(1) + "s"}`;
  console.log(r);
  if (await ev("FOOT.on")) await board();
}
// sled at the pump
await ev(`(() => { if (!FOOT.on) { } return 1; })()`);
await done(0);
