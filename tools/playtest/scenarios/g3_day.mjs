// G3 daytime lighting: logs the light rig at noon on the first day of a new save (1 Nov, low winter sun ~4°)
// and at a spring noon, and shoots the views report 0004 scored flat: quay, looking toward the sun, backcountry,
// sled close-up. Pair with tools/playtest/imgstats.py <outdir> for per-still luminance/contrast numbers.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_day.mjs
import { boot, ev, shot, sideCam, camOff, sleep, done } from "../lib.mjs";

await boot();
await ev("WX.at = () => 0; GS.storm = 0; true");     // pin clear weather: a front drifting in fogs the comparison
const rig = async tag => console.log(tag, await ev(`JSON.stringify({ hour: GS.hour % 24, el: +sunEl(GS.hour % 24).toFixed(2), storm: +GS.storm.toFixed(2),
  sun: +sun.intensity.toFixed(3), sunC: sun.color.getHexString(), hemi: +hemi.intensity.toFixed(3), hemiC: hemi.color.getHexString(),
  ground: hemi.groundColor.getHexString(), exp: +renderer.toneMappingExposure.toFixed(3), fog: +scene.fog.density.toFixed(5), fogC: scene.fog.color.getHexString(),
  sunDirY: +sunDir.y.toFixed(3) })`));
const noon = async (offDays = 0) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + ${offDays * 24}; camState.init = false; true`); await sleep(1500); };

await noon(0); await rig("rig_nov1_noon");
await shot("01_quay_day");
// look toward the sun from the sled
await sideCam("[P.x, P.y + 1.2, P.z]", 0.01, 0.6, 0);
await ev(`window.camOv = c => { c.position.set(P.x - sunDir.x * 6, P.y + 2.2, P.z - sunDir.z * 6); c.lookAt(P.x + sunDir.x * 100, P.y + 2.2 + 6, P.z + sunDir.z * 100); }; true`);
await sleep(400); await shot("02_toward_sun");
await ev(`window.camOv = c => { c.position.set(P.x + sunDir.x * 9, P.y + 3, P.z + sunDir.z * 9); c.lookAt(P.x, P.y + 0.8, P.z); }; true`);
await sleep(400); await shot("03_sun_behind");
await camOff();
await sideCam("[P.x, P.y + 0.4, P.z]", 3.2, 1.9, 0.9); await shot("04_sled_closeup"); await camOff();

await ev(`(() => {
  for (let r = 300; r < 3000; r += 50) for (let a = 0; a < 6.28; a += 0.4) {
    const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
    if (isSea(x, z) || obNear(x, z, 60)) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.5; recenter(x, z, true); return true;
  }
  return false;
})()`);
await noon(0); await sleep(1500);
await shot("05_backcountry_day");
// spring: 1 March noon (sun ~12°) — 120 days on
await noon(120); await rig("rig_mar_noon");
await shot("06_backcountry_march");
await done();
