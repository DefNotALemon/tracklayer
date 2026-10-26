// G3 house roofs up close: the gable ends and eaves of KIT.house (barge boards, fascia, the roof/gable join).
// Shoots 2 lit houses near the depot from the door-gable corner (gables face front/back, eaves run along ±x) (~11 m out, eye 2.2 m, looking at the roofline),
// square-on to a gable end, and up under an eave, at Nov noon (4° sun), March 15:00 (low sun) and 21:00.
// Logs draw calls at the first corner view so roof work can be costed.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_roofs.mjs [outdir]
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; return true; })()`);
const doors = JSON.parse(await ev(`(() => { const d0 = depot;
  const ds = KIT.doors.map(D => ({ ...D, r: Math.hypot(D.x - d0.x, D.z - d0.z) })).sort((a, b) => a.r - b.r);
  const out = []; for (const D of ds) { if (out.every(o => Math.hypot(o.x - D.x, o.z - D.z) > 25)) out.push(D); if (out.length >= 2) break; }
  return JSON.stringify(out.map(D => ({ x: +D.x.toFixed(1), z: +D.z.toFixed(1), nx: +D.nx.toFixed(3), nz: +D.nz.toFixed(3), d: D.d }))); })()`));
console.log("doors", JSON.stringify(doors));
const setHour = async (h, day = 0) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h} + ${day * 24}; true`); await sleep(1200); };
// k = [out along door normal, along house +x], up = eye height, ly = look height above ground
const aim = async (D, k, up, ly) => {
  await ev(`(() => { const D = ${JSON.stringify(D)}, sx = -D.nz, sz = D.nx;
    const cx = D.x + D.nx * ${k[0]} + sx * ${k[1]}, cz = D.z + D.nz * ${k[0]} + sz * ${k[1]};
    P.x = cx + D.nx * 30; P.z = cz + D.nz * 30; recenter(D.x, D.z, true);
    window.camOv = c => { c.position.set(cx, groundAt(cx, cz) + ${up}, cz); c.lookAt(D.x, groundAt(D.x, D.z) + ${ly}, D.z); };
    return true; })()`);
  await sleep(900);
};
for (const [tag, h, day] of [["nov", 12, 0], ["mar", 15, 120], ["night", 21, 0]]) {
  await setHour(h, day);
  for (let i = 0; i < doors.length; i++) {
    await aim(doors[i], [7, 9], 2.2, 3.4); await shot(`${tag}_${i}_corner`);
    if (i === 0 && tag === "nov") console.log("info_corner", await ev("JSON.stringify({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles })"));
  }
  await aim(doors[0], [11, 0.5], 1.8, 3.6); await shot(`${tag}_0_gable`);
  await aim(doors[0], [2, 8], 1.6, 3.6); await shot(`${tag}_0_eave`);
}
await done();
