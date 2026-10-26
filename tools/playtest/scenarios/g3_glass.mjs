// G3 window glass by day: KIT.house fronts at 13 m (3/4) and 6 m (square-on, 2.5 m to the side so a window is in
// frame), Nov noon, March noon and night. Logs the mean RGB of glass pixels found by colour (dark, low-saturation) is
// not reliable, so judge with imgstats + vision. Weather pinned.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_glass.mjs [outdir]
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; return true; })()`);
const doors = JSON.parse(await ev(`(() => { const d0 = depot;
  const ds = KIT.doors.map(D => ({ ...D, r: Math.hypot(D.x - d0.x, D.z - d0.z) })).sort((a, b) => a.r - b.r);
  const out = []; for (const D of ds) { if (out.every(o => Math.hypot(o.x - D.x, o.z - D.z) > 25)) out.push(D); if (out.length >= 2) break; }
  return JSON.stringify(out.map(D => ({ x: +D.x.toFixed(1), z: +D.z.toFixed(1), nx: +D.nx.toFixed(3), nz: +D.nz.toFixed(3) }))); })()`));
console.log("doors", JSON.stringify(doors));
const setHour = async (h, day = 0) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h} + ${day * 24}; true`); await sleep(1200); };
const aim = async (D, out, side, up, lookSide) => {
  await ev(`(() => { const D = ${JSON.stringify(D)}, sx = -D.nz, sz = D.nx;
    const cx = D.x + D.nx * ${out} + sx * ${side}, cz = D.z + D.nz * ${out} + sz * ${side};
    const lx = D.x + sx * ${lookSide}, lz = D.z + sz * ${lookSide};
    P.x = cx + D.nx * 30; P.z = cz + D.nz * 30; recenter(D.x, D.z, true);
    window.camOv = c => { c.position.set(cx, groundAt(cx, cz) + ${up}, cz); c.lookAt(lx, groundAt(D.x, D.z) + 1.7, lz); };
    return true; })()`);
  await sleep(900);
};
for (const [tag, h, day] of [["nov", 12, 0], ["mar", 12, 120], ["night", 20, 0]]) {
  await setHour(h, day);
  for (let i = 0; i < doors.length; i++) {
    await aim(doors[i], 11, 6, 2.2, 0); await shot(`${tag}_${i}_front`);
    await aim(doors[i], 6, 2.5, 1.8, 2.5); await shot(`${tag}_${i}_closeR`);
    await aim(doors[i], 6, -2.5, 1.8, -2.5); await shot(`${tag}_${i}_closeL`);
  }
  if (tag === "nov") console.log("info", await ev("JSON.stringify({ calls: renderer.info.render.calls })"));
}
await done();
