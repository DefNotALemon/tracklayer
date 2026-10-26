// G3 hospital up close: Kjøllefjord helsesenter (buildHospital) 3/4 from the entrance side, square-on from the front and
// from the ambulance end, at Nov noon, March noon and 20:00, 2.2 m eye height. Logs renderer.info at the front view so
// facade work can be costed.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_hospital.mjs [outdir]   then imgstats.py <outdir>
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; return true; })()`);
// views: [name, camera u (along the front), v (out from the front)]; hospital local frame from HOSP.x/z/ry
const T = JSON.parse(await ev(`(() => {
  const { x, z, ry } = HOSP, dx = Math.sin(ry), dz = Math.cos(ry), ax = Math.cos(ry), az = -Math.sin(ry);
  const w = (u, v) => [x + ax * u + dx * v, z + az * u + dz * v];
  return JSON.stringify([["q34", ...w(13, 17), x, z], ["front", ...w(0, 20), x, z], ["amb", ...w(-22, 11), ...w(-8, 0)]]); })()`));
console.log("hospital", await ev("JSON.stringify({ x: HOSP.x, z: HOSP.z, ry: HOSP.ry, built: HOSP.built })"));
const setHour = async (h, day = 0) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h} + ${day * 24}; true`); await sleep(1200); };
for (const [tag, h, day] of [["nov", 12, 0], ["mar", 12, 120], ["night", 20, 0]]) {
  await setHour(h, day);
  for (const [name, cx, cz, x, z] of T) {
    await ev(`(() => { P.x = ${cx} + 30; P.z = ${cz} + 30; recenter(${x}, ${z}, true);
      const y0 = groundAt(${cx}, ${cz}), y1 = groundAt(${x}, ${z});
      window.camOv = c => { c.position.set(${cx}, y0 + 2.2, ${cz}); c.lookAt(${x}, y1 + 3.2, ${z}); }; return true; })()`);
    await sleep(900); await shot(`${tag}_${name}`);
    if (tag === "nov" && name === "front") console.log("info_front", await ev("JSON.stringify({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles })"));
  }
}
await done();
