// G3 fuel cabins (buildFuelCabins): the jerry-can pallet + price board by a remote cabin's porch, up close.
// Finds the pallet groups by userData.fuelCans (v139+) or the old 1.7 x 0.14 x 1.1 m pallet board (pre-v139 builds),
// then shoots the first two from walk-up distance (6 m), close 3/4 (2.4 m) and at the cans (1.3 m), Nov noon and 21:00.
// Logs renderer.info at the 6 m view. Run: tools/playtest/run.sh tools/playtest/scenarios/g3_fuelcabin.mjs [outdir]
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {};
  window.__pal = [];
  scene.traverse(o => { if (o.isGroup && o.userData.fuelCans) { window.__pal.push(o); return; } if (!o.isMesh || !o.geometry || !o.geometry.parameters) return; const p = o.geometry.parameters;
    if (Math.abs(p.width - 1.7) < 1e-3 && Math.abs(p.height - 0.14) < 1e-3 && Math.abs(p.depth - 1.1) < 1e-3 && o.parent && o.parent.isGroup) window.__pal.push(o.parent); });
  return window.__pal.length; })()`).then(n => console.log("pallets", n));
const VIEWS = [
  // tag, eye (lx, lz, up), look (lx, lz, up) in the pallet group's local frame
  ["walk", 3.5, 5.0, 1.8, 0.3, 0, 0.9],
  ["q34", 1.6, 1.9, 1.5, 0.1, 0, 0.6],
  ["cans", 0.5, 1.25, 1.15, 0, 0, 0.6],
];
for (const [tag, h] of [["nov", 12], ["night", 21]]) {
  await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h}; true`); await sleep(1200);
  for (const i of [0, 1]) for (const [v, ex, ez, eu, lx, lz, lu] of VIEWS) {
    const ok = await ev(`(() => { const g = window.__pal[${i}]; if (!g) return false; const cr = Math.cos(g.rotation.y), sr = Math.sin(g.rotation.y);
      const W = (a, b) => [g.position.x + a * cr + b * sr, g.position.z - a * sr + b * cr];
      const gy = g.position.y, [cx, cz] = W(${ex}, ${ez}), [lx, lz] = W(${lx}, ${lz});
      P.x = cx + 30; P.z = cz + 30; recenter(g.position.x, g.position.z, true);
      const ey = Math.max(gy + ${eu}, groundAt(cx, cz) + 0.6);
      window.camOv = c => { c.position.set(cx, ey, cz); c.lookAt(lx, gy + ${lu}, lz); }; return true; })()`);
    if (!ok) continue;
    await sleep(900); await shot(`${tag}_${i}_${v}`);
    if (tag === "nov" && v === "walk") console.log("info_walk", i, await ev("JSON.stringify({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles })"));
  }
}
await done();
