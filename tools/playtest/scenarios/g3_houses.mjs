// G3 houses up close: the painted Finnmark houses (KIT.house) in town, at Nov noon, March noon and night.
// Shoots 3 lit doors from KIT.doors (3/4 front view ~13 m out) + one back/side view + a wide town view, and logs
// renderer.info draw calls / triangles at the wide view so facade work can be costed.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_houses.mjs [outdir]
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; return true; })()`);
// lit doors nearest the depot, spread out
const doors = JSON.parse(await ev(`(() => { const d0 = depot;
  const ds = KIT.doors.map(D => ({ ...D, r: Math.hypot(D.x - d0.x, D.z - d0.z) })).sort((a, b) => a.r - b.r);
  const out = []; for (const D of ds) { if (out.every(o => Math.hypot(o.x - D.x, o.z - D.z) > 25)) out.push(D); if (out.length >= 3) break; }
  return JSON.stringify(out.map(D => ({ x: +D.x.toFixed(1), z: +D.z.toFixed(1), nx: +D.nx.toFixed(3), nz: +D.nz.toFixed(3), d: D.d }))); })()`));
console.log("doors", JSON.stringify(doors));
const setHour = async (h, day = 0) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h} + ${day * 24}; true`); await sleep(1200); };
const aim = async (D, mode) => {
  // mode front: 3/4 front 13 m out; back: behind-left corner 12 m out
  await ev(`(() => { const D = ${JSON.stringify(D)}, sx = -D.nz, sz = D.nx;           // sx,sz = the house's local +x
    const k = "${mode}" === "front" ? [11, 6] : [-9, -8];
    const cx = D.x + D.nx * k[0] + sx * k[1], cz = D.z + D.nz * k[0] + sz * k[1];
    P.x = cx + D.nx * 30; P.z = cz + D.nz * 30; recenter(D.x, D.z, true);
    window.camOv = c => { c.position.set(cx, groundAt(cx, cz) + 2.2, cz); c.lookAt(D.x, groundAt(D.x, D.z) + 2.2, D.z); };
    return true; })()`);
  await sleep(900);
};
for (const [tag, h, day] of [["nov", 12, 0], ["mar", 12, 120], ["night", 20, 0]]) {
  await setHour(h, day);
  for (let i = 0; i < doors.length; i++) { await aim(doors[i], "front"); await shot(`${tag}_${i}_front`); }
  await aim(doors[0], "back"); await shot(`${tag}_0_back`);
  // wide town view: 30 m up, 70 m back from the depot looking over it
  await ev(`(() => { const d0 = depot, a = Math.atan2(${doors[0].x} - d0.x, ${doors[0].z} - d0.z);
    const cx = d0.x - Math.sin(a) * 60, cz = d0.z - Math.cos(a) * 60;
    window.camOv = c => { c.position.set(cx, groundAt(cx, cz) + 25, cz); c.lookAt(d0.x + Math.sin(a) * 30, groundAt(d0.x, d0.z), d0.z + Math.cos(a) * 30); }; return true; })()`);
  await sleep(900); await shot(`${tag}_wide`);
  if (tag === "nov") console.log("info_wide", await ev("JSON.stringify({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures })"));
}
await done();
