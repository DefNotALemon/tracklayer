// G3 daylight macro check: the far-terrain dune scoops (v88 `near` term) seen close, 20-60 m out, from a standing
// eye and from a little higher, to judge whether they read as uniform oval hollows. Same pinned backcountry spot as
// g3_midband.mjs (searched from SPAWN), weather pinned clear, Nov + March noon.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_macro.mjs ; then imgstats.py / bandstats.py <outdir>
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
await ev("V.rider.visible = false; true");
// up = camera height, dist = look-at distance, ang = offset from the sun's azimuth
const look = async (name, ang, up, dist) => {
  await sideCam();
  await ev(`(() => { const a = Math.atan2(sunDir.z, sunDir.x) + ${ang};
    window.camOv = c => { c.position.set(P.x, surf(P.x, P.z) + ${up}, P.z); c.lookAt(P.x + Math.cos(a) * ${dist}, surf(P.x + Math.cos(a) * ${dist}, P.z + Math.sin(a) * ${dist}), P.z + Math.sin(a) * ${dist}); }; return true; })()`);
  await sleep(700); await shot(name);
};
await look("01_eye_across_30", Math.PI / 2, 1.8, 30);
await look("02_eye_toward_30", 0, 1.8, 30);
await look("03_high_across_40", Math.PI / 2, 9, 40);
await look("04_high_away_40", Math.PI, 9, 40);
await look("05_high_cross2_40", -Math.PI / 2, 9, 40);
await camOff();
await noon(120);
await look("06_march_high_across_40", Math.PI / 2, 9, 40);
await look("07_march_eye_across_30", Math.PI / 2, 1.8, 30);
await camOff();
await done();
