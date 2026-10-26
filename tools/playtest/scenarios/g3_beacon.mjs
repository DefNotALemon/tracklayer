// G3 guide beacons: the light pillar over the place you're heading (empty-handed: the quay depot). Report 0010 F1
// saw it at night from 0.35 km as a huge, flat, uniform grey band up the whole frame. Shoots the depot beacon from
// 120 m, 350 m and 1.2 km out, at midnight and at noon (weather pinned), camera 2 m up behind the sled.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_beacon.mjs  (then imgstats.py / sheet.py on the outdir)
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
await ev("WX.at = () => 0; GS.storm = 0; true");
const place = d => ev(`(() => {
  const s = SITES.find(s => s.type === "depot");
  for (let a = 0; a < 6.28; a += 0.15) {
    const x = s.x + Math.cos(a) * ${d}, z = s.z + Math.sin(a) * ${d};
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 12)) continue;
    if (groundAt(x, z) + 6 < groundAt(s.x, s.z)) continue;          // not down in a hollow under the quay
    P.x = x; P.z = z; P.y = surf(x, z) + 0.5; P.vx = P.vy = P.vz = 0; P.yaw = Math.atan2(s.x - x, s.z - z);
    P.safe = { x, z, yaw: P.yaw }; recenter(x, z, true); camState.init = false;
    window.camOv = c => { const dx = s.x - P.x, dz = s.z - P.z, L = Math.hypot(dx, dz);
      c.position.set(P.x - dx / L * 6, P.y + 2.2, P.z - dz / L * 6); c.lookAt(s.x, P.y + 2.2 + L * 0.12, s.z); };
    return JSON.stringify({ d: Math.round(Math.hypot(x - s.x, z - s.z)), beacon: s.beacon.visible });
  }
  return "no spot";
})()`);
const hour = h => ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h}; camState.init = false; true`);
for (const [tag, h] of [["night", 0.7], ["day", 12]]) {
  await hour(h);
  for (const d of [120, 350, 700, 1200]) {
    console.log(tag, d, await place(d));
    await sleep(1800);
    console.log("  beacon visible", await ev(`SITES.find(s => s.type === "depot").beacon.visible`), "shaded", await ev(`!!SITES.find(s => s.type === "depot").beacon.material.userData.shaded`));
    await shot(`${tag}_${String(d).padStart(4, "0")}`);
  }
}
await done();
