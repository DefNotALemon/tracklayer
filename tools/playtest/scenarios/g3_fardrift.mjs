// G3 far drift shadows (v101): open backcountry (spot pinned from SPAWN, weather pinned calm) at noon on 1 Nov
// (true sun 4°) and 1 March (~11°). Eye 1.8 m and 9 m up looking at ground 60-250 m out, toward / across / away from
// the sun: past the snow patch's 34-50 m the far terrain's swells should throw lee shadows under the low sun.
// Pair with tools/playtest/bandstats.py <outdir> (strips) and imgstats.py.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_fardrift.mjs
import { boot, ev, shot, sideCam, sleep, done } from "../lib.mjs";

await boot();
await ev("WX.at = () => 0; GS.storm = 0; true");
await ev(`(() => {
  const x0 = SPAWN.x, z0 = SPAWN.z;
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
console.log("spot", await ev("[P.x.toFixed(0), P.z.toFixed(0)].join(',')"));
const noon = async d => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + ${d * 24}; camState.init = false; true`); await sleep(1800); };
await sideCam("[P.x, P.y, P.z]", 1, 1, 0);
const look = async (name, rel, up, dist) => {
  await ev(`window.camOv = c => { const a = Math.atan2(_sunV.x, _sunV.z) + ${rel}, ex = P.x, ez = P.z, ey = surf(ex, ez) + ${up};
    const lx = ex + Math.sin(a) * ${dist}, lz = ez + Math.cos(a) * ${dist};
    c.position.set(ex, ey, ez); c.lookAt(lx, surf(lx, lz), lz); }; true`);
  await sleep(600); await shot(name);
};
await noon(0);
console.log("sun", await ev("[_sunV.x.toFixed(2), _sunV.y.toFixed(3), _sunV.z.toFixed(2), skyRefU.uMicroK.value.toFixed(2)].join(',')"));
await look("01_nov_toward", 0.35, 1.8, 150); await look("02_nov_across_l", 1.57, 1.8, 150);
await look("03_nov_across_r", -1.57, 1.8, 150); await look("04_nov_away", 3.14, 1.8, 150);
await look("05_nov_high_across", 1.57, 9, 120); await look("06_nov_high_toward", 0.35, 9, 120);
await noon(120);
await look("07_mar_across_l", 1.57, 1.8, 150); await look("08_mar_high_across", 1.57, 9, 120);
await done();
