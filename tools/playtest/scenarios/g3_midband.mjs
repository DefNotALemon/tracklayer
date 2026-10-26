// G3 daylight: the 45-150 m band of open fell, where the snow patch's close sastrugi have faded and the far
// terrain's drift relief is still faint. Same backcountry pick as g3_day.mjs but searched from SPAWN (pinned, so
// runs compare), weather pinned clear. Shots: game camera Nov/March noon, plus two fixed cameras 2.2 m up looking
// at the ground 40-150 m ahead (across the sun and away from it). Pair with tools/playtest/imgstats.py and
// tools/playtest/bandstats.py <outdir> (local contrast per horizontal strip).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_midband.mjs
import { boot, ev, shot, sideCam, camOff, sleep, done } from "../lib.mjs";

await boot();
await ev("WX.at = () => 0; GS.storm = 0; true");
const noon = async (offDays = 0) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + ${offDays * 24}; camState.init = false; true`); await sleep(1500); };
await ev(`(() => {
  const x0 = SPAWN.x, z0 = SPAWN.z;
  for (let r = 1500; r < 5000; r += 100) for (let a = 0; a < 6.28; a += 0.3) {
    const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 60)) continue;
    if ([[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40]].some(([u, v]) => bioAt(x + u, z + v) !== 0)) continue;
    if (SITES.some(s => Math.hypot(s.x - x, s.z - z) < 600)) continue;
    if (Math.abs(groundAt(x + 20, z) - groundAt(x - 20, z)) > 2 || Math.abs(groundAt(x, z + 20) - groundAt(x, z - 20)) > 2) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.5; P.vx = P.vy = P.vz = 0; P.yaw = 0.7; P.safe = { x, z, yaw: P.yaw };
    recenter(x, z, true); camState.init = false; return true;
  }
  return false;
})()`);
console.log("spot", await ev("[P.x.toFixed(0), P.z.toFixed(0)].join(',')"));
await noon(0); await sleep(1500);
await shot("05_backcountry_day");
const look = async (name, ang) => {
  await sideCam();   // installs the render hook camOv rides on
  await ev(`(() => { const a = Math.atan2(sunDir.z, sunDir.x) + ${ang};
    window.camOv = c => { c.position.set(P.x, surf(P.x, P.z) + 2.2, P.z); c.lookAt(P.x + Math.cos(a) * 120, surf(P.x, P.z) - 6, P.z + Math.sin(a) * 120); }; return true; })()`);
  await sleep(700); await shot(name);
};
await look("07_mid_across", Math.PI / 2);
await look("08_mid_away", Math.PI);
await camOff();
await noon(120);
await shot("06_backcountry_march");
await look("09_mid_across_march", Math.PI / 2);
await camOff();
await done();
