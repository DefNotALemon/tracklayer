// Probe: how long does getting out of the truck take at a pump vs on open snow, and is FOOT.on/DMT state sane. 
// Run: tools/playtest/run.sh tools/playtest/scenarios/x2_truckpump_dismount_probe.mjs [outdir]
import { boot, ev, tap, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return (await clock()) - t0; await sleep(100); } return -1; }
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 20000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
const U = await J(`TLX.state("vehicles").owned[0].uid`);
await ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3; FOOT.z = r.z - fx * 3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(900); await tap("KeyQ");
console.log("board s", await waitUntil(`!MNT.on && !FOOT.on && !!VEH.cur`));
for (const where of ["open", "pump"]) {
  await ev(`(() => { ${where === "pump" ? `const t = STATIONS.find(t => t.x !== undefined); P.x = t.x; P.z = t.z;` : `for (let r = 600; r < 1500; r += 25) for (let k = 0; k < 40; k++) { const x = P.x + Math.sin(k * 0.157) * r, z = P.z + Math.cos(k * 0.157) * r; if (!isSea(x, z) && !isWater(x, z) && !obNear(x, z, 40) && slopeAt(x, z, 8) < 0.06) { P.x = x; P.z = z; return 1; } }`} P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); GS.fuel = 5; GS.cash = 5000; return 1; })()`);
  await sleep(2500);
  await tap("KeyQ");
  const t = await waitUntil("!DMT.on && FOOT.on", 20);
  console.log(where, "dismount game-s:", t, JSON.stringify(await J(`({ foot: FOOT.on, dmt: DMT.on, veh: !!VEH.cur, fuel: GS.fuel })`)));
  await ev(`(() => { const s = TLX.state("vehicles"); return 1; })()`);
  // get back in
  await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const x = r.x, z = r.z, yaw = r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw); FOOT.x = x + fz * 3; FOOT.z = z - fx * 3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); return 1; })()`);
  await sleep(900); await tap("KeyQ");
  console.log(" reboard s", await waitUntil(`!MNT.on && !FOOT.on && !!VEH.cur`));
}
await done(0);
