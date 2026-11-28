// G3 snow LOD line, RIDING verification (owner note 26 Oct 23:40, builder v152/33557bf fine-footprint fade).
// g3_snowlod.mjs judged static stills; this one judges the same open-fell spot from the RIDER'S NORMAL
// (chase) camera while actually moving, at noon / 15:00 / night, plus a low along-the-snow camera fixed to
// actually take (the old scenario set window.camOv without installing the render hook first via sideCam()).
// Also widens the distance probe to 34/40/45/50 m to look at the patch->far-terrain handover the owner asked
// to re-check.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_snowlod_ride.mjs <outdir>
import { boot, ev, shot, sideCam, camOff, sleep, down, up, done } from "../lib.mjs";

await boot();
await ev("WX.at = () => 0; GS.storm = 0; true");
const spot = await ev(`(() => {
  const x0 = SPAWN.x, z0 = SPAWN.z;
  for (let r = 1500; r < 5000; r += 100) for (let a = 0; a < 6.28; a += 0.3) {
    const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 80)) continue;
    if ([[0, 0], [60, 0], [-60, 0], [0, 60], [0, -60]].some(([u, v]) => bioAt(x + u, z + v) !== 0)) continue;
    if (SITES.some(s => Math.hypot(s.x - x, s.z - z) < 700)) continue;
    if (Math.abs(groundAt(x + 20, z) - groundAt(x - 20, z)) > 1.0 || Math.abs(groundAt(x, z + 20) - groundAt(x, z - 20)) > 1.0) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.5; P.vx = P.vy = P.vz = 0; P.yaw = 0.6; P.safe = { x, z, yaw: P.yaw };
    recenter(x, z, true); camState.init = false; return JSON.stringify({ x: Math.round(x), z: Math.round(z) });
  }
  return "none";
})()`);
console.log("spot", spot);

const setHour = async h => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h}; P.vx = P.vy = P.vz = 0; camState.init = false; true`); await sleep(1500); };
const rows = async tag => console.log(tag, await ev(`(() => { const c = camera, f = new THREE.Vector3(); c.getWorldDirection(f); f.y = 0; f.normalize();
  const out = {}; for (const d of [6, 9, 12, 15, 25, 34, 40, 45, 50, 60]) { const x = c.position.x + f.x * d, z = c.position.z + f.z * d;
    const v = new THREE.Vector3(x, surf(x, z), z).project(c); out[d] = Math.round((1 - v.y) / 2 * innerHeight); }
  return JSON.stringify({ camY: +(c.position.y - surf(c.position.x, c.position.z)).toFixed(2), rows: out }); })()`));

// Ride a bit (normal chase cam, moving) and shoot a few stills mid-ride so the band has to read in motion.
async function rideShots(tag) {
  await down("KeyW");
  for (const t of [1200, 1200, 1200, 1200]) { await sleep(t); await shot(`${tag}_${t}`); }
  await up("KeyW");
  await sleep(300);
}

for (const [h, tag] of [[12, "noon"], [15, "h15"], [21, "night"]]) {
  await setHour(h);
  await shot(`${tag}_still`);
  if (h === 12) await rows("rows_" + tag);
  await rideShots(`${tag}_ride`);
  if (h === 21) await rows("rows_" + tag + "_after");
}

// Low along-the-snow camera, fixed: install the render hook via sideCam() first so window.camOv actually
// gets called, then point it along the ground ahead of the sled while riding.
await setHour(12);
await sideCam(); // installs the renderer.render hook (target/args here don't matter, overwritten next line)
await ev(`window.camOv = c => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), x = P.x - fx * 3, z = P.z - fz * 3;
  c.position.set(x, surf(x, z) + 1.0, z); c.lookAt(P.x + fx * 40, surf(P.x + fx * 40, P.z + fz * 40) + 0.2, P.z + fz * 40); }; true`);
await sleep(400);
await shot("noon_low_still");
await down("KeyW"); await sleep(1800); await shot("noon_low_ride"); await up("KeyW");
await camOff();

await done();
