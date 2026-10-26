// G3 far view: does the land 0.5-2.5 km out keep its shape on a clear day, or wash into the haze? Weather pinned
// clear, Nov 1 noon (sun 4°) and 1 March noon. From the quay and from a pinned backcountry spot (searched from SPAWN
// like g3_midband) a camera 25 m up looks level across the sun, toward it and away from it. Pair with
// tools/playtest/imgstats.py and bandstats.py <outdir> (the top strips hold the far land).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_vista.mjs
import { boot, ev, shot, sideCam, sleep, done } from "../lib.mjs";

await boot(); await sideCam();   // installs the camOv render hook
await ev("WX.at = () => 0; GS.storm = 0; true");
const noon = async (offDays = 0) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + ${offDays * 24}; camState.init = false; true`); await sleep(1500); };
// a: angle from the sun's azimuth (0 toward, 90 across, 180 away)
const aim = a => ev(`(() => { const s = Math.atan2(sunDir.z, sunDir.x) + ${a} * Math.PI / 180, dx = Math.cos(s), dz = Math.sin(s);
  window.camOv = c => { c.position.set(P.x, surf(P.x, P.z) + 25, P.z); c.lookAt(P.x + dx * 1000, surf(P.x, P.z) + 25 - 40, P.z + dz * 1000); };
  return true; })()`);
const fogLog = async tag => console.log(tag, await ev(`JSON.stringify({ fog: +scene.fog.density.toFixed(5), at1km: +(1 - Math.exp(-Math.pow(scene.fog.density * 1000, 2))).toFixed(2) })`));
const set3 = async tag => { for (const [n, a] of [["across", 90], ["toward", 0], ["away", 180]]) { await aim(a); await sleep(1200); await shot(`${tag}_${n}`); } };

await noon(0); await fogLog("fog_nov");
await set3("01_quay_nov");
await ev(`(() => {
  const x0 = SPAWN.x, z0 = SPAWN.z;
  for (let r = 1500; r < 5000; r += 100) for (let a = 0; a < 6.28; a += 0.3) {
    const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 60)) continue;
    if ([[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40]].some(([u, v]) => bioAt(x + u, z + v) !== 0)) continue;
    if (SITES.some(s => Math.hypot(s.x - x, s.z - z) < 600)) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.5; P.vx = P.vy = P.vz = 0; P.safe = { x, z, yaw: P.yaw };
    recenter(x, z, true); camState.init = false; return true;
  }
  return false;
})()`);
await noon(0); await sleep(2500);
await set3("02_back_nov");
await noon(120); await fogLog("fog_mar");
await set3("03_back_mar");
await ev("window.camOv = null; true");
await done();
