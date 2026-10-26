// G3 drift shadows (v100): open backcountry at noon on 1 Nov (true sun 4°) and 1 March (~11°), eye 1.8 m up looking
// 25 m out toward the sun, across it (both sides) and away. Before v100 the foreground was evenly lit; lee sides of
// ripples/swells should now go blue when you look toward or across the sun. Pair with tools/playtest/imgstats.py.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_driftshadow.mjs
import { boot, ev, shot, sideCam, sleep, done } from "../lib.mjs";

await boot();
await ev("WX.at = () => 0; GS.storm = 0; true");
await ev(`(() => {
  const x0 = P.x, z0 = P.z;
  for (let r = 1500; r < 5000; r += 100) for (let a = 0; a < 6.28; a += 0.3) {
    const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 60)) continue;
    if ([[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40]].some(([u, v]) => bioAt(x + u, z + v) !== 0)) continue;
    if (SITES.some(s => Math.hypot(s.x - x, s.z - z) < 600)) continue;
    if (Math.abs(groundAt(x + 20, z) - groundAt(x - 20, z)) > 2 || Math.abs(groundAt(x, z + 20) - groundAt(x, z - 20)) > 2) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.5; P.vx = P.vy = P.vz = 0; P.safe = { x, z, yaw: P.yaw };
    recenter(x, z, true); camState.init = false; return true;
  }
  return false;
})()`);
const noon = async d => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + ${d * 24}; camState.init = false; true`); await sleep(1800); };
await sideCam("[P.x, P.y, P.z]", 1, 1, 0);   // hooks the render wrapper
const look = async (name, rel) => {
  // rel = angle from the sun's azimuth; eye 6 m to the side of the sled so it isn't in frame
  await ev(`window.camOv = c => { const a = Math.atan2(_sunV.x, _sunV.z) + ${rel}, ex = P.x + Math.cos(a) * 6, ez = P.z - Math.sin(a) * 6, ey = surf(ex, ez) + 1.8;
    c.position.set(ex, ey, ez); c.lookAt(ex + Math.sin(a) * 25, surf(ex + Math.sin(a) * 25, ez + Math.cos(a) * 25) + 0.2, ez + Math.cos(a) * 25); }; true`);
  await sleep(500); await shot(name);
};
await noon(0);
await look("01_nov_toward_sun", 0.35); await look("02_nov_across_l", 1.57); await look("03_nov_across_r", -1.57); await look("04_nov_away", 3.14);
await noon(120);
await look("05_mar_toward_sun", 0.35); await look("06_mar_across_l", 1.57);
await done();
