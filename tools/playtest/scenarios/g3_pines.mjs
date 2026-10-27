// G3 pine shape (report 0084 F3: pines read as boxy stacked cones up close). Finds the densest flat pine stand,
// parks the sled out of shot and shoots a big pine from 7 m and 14 m at eye height plus a 30 m stand view, at Nov noon
// and 21:00, weather pinned. Logs draw calls + triangles in the 30 m view (pines are instanced: watch the tri count).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_pines.mjs [outdir]; then sheet.py + imgstats.py on the outdir.
import { boot, ev, shot, sideCam, camOff, sleep, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; true");
const s = JSON.parse(await ev(`(() => {
  const pines = []; for (const a of obGrid.values()) for (const o of a) if (o.pine && !o.down) pines.push(o);
  let best = null;
  for (let k = 0; k < pines.length; k += 7) { const o = pines[k]; if (o.s < 1.15) continue;
    if (slopeAt(o.x, o.z, 10) > 0.12 || isSea(o.x, o.z) || isWater(o.x, o.z)) continue;
    let n = 0; for (const p of pines) if (Math.abs(p.x - o.x) < 30 && Math.abs(p.z - o.z) < 30) n++;
    if (!best || n > best.n) best = { x: o.x, z: o.z, y: o.y, s: o.s, sy: o.sy, n };
    if (k > 4000) break; }
  P.x = best.x + 60; P.z = best.z + 60; P.y = surf(P.x, P.z) + 0.5; P.vx = P.vy = P.vz = 0; recenter(best.x, best.z, true);
  return JSON.stringify(best); })()`));
console.log("tree", JSON.stringify(s));
await sideCam(); // installs the render hook
const views = [["close7", 7, 1.7, 3.2], ["mid14", 14, 1.8, 4.0], ["stand30", 30, 2.5, 3.0]];
for (const [hr, tag] of [[12, "noon"], [21, "night"]]) {
  await ev(`GS.hour = Math.floor(GS.hour / 24) * 24 + ${hr}; GS.storm = 0; true`);
  await sleep(1200);
  for (const [name, d, h, look] of views) {
    await ev(`window.camOv = c => { const a = 0.7; const x = ${s.x} + Math.sin(a) * ${d}, z = ${s.z} + Math.cos(a) * ${d};
      c.position.set(x, surf(x, z) + ${h}, z); c.lookAt(${s.x}, ${s.y} + ${look}, ${s.z}); }; true`);
    await sleep(900);
    if (name === "stand30" && tag === "noon") console.log("render", await ev("JSON.stringify({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles })"));
    await shot(`${tag}_${name}`);
  }
}
await camOff();
await done();
