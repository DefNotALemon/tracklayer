// G3 street lamps (KIT.lamp, lampPools): stills of lamps at night (21:00) and Nov noon from 9 m out, 2 m up, looking at
// the lamp's foot, plus a ride-height view from 22 m. Finds lamps by their glow sphere (works on builds before v124).
// LAMPS=0,3 picks which lamps (indices into the found list, sorted by x). Logs the lamp count, draw calls, and the mean
// luma of a crop at the lamp foot vs a crop 10 m beside it (shot names carry the index).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_lamps.mjs [outdir]   then imgstats.py <outdir>
import { boot, ev, shot, sleep, done } from "../lib.mjs";

const PICK = (process.env.LAMPS || "0,4,9").split(",").map(Number);
await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; return true; })()`);
const n = await ev(`(() => { const L = [];
  scene.children.forEach(g => { if (g.isGroup && g.children.length === 3 && g.children[0].geometry?.type === "CylinderGeometry" && g.children[1].geometry?.type === "SphereGeometry" && g.children[2].geometry?.type === "ConeGeometry") L.push([g.position.x, g.position.z]); });
  L.sort((a, b) => a[0] - b[0]); window.__lamps = L; return L.length; })()`);
console.log("lamps", n);
for (const [tag, h] of [["night", 21], ["nov", 12]]) {
  await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h}; true`); await sleep(1200);
  for (const k of PICK) {
    if (k >= n) continue;
    for (const [v, d, up, ly] of [["near", 9, 2.0, 0.6], ["ride", 22, 2.2, 0.6], ["head", 5, 2.4, 3.9]]) {
      await ev(`(() => { const [x, z] = window.__lamps[${k}];
        let best = null; for (let a = 0; a < 6.28; a += 0.39) { const cx = x + Math.cos(a) * ${d}, cz = z + Math.sin(a) * ${d};
          if (isSea(cx, cz) || obNear(cx, cz, 2)) continue; const s = Math.abs(groundAt(cx, cz) - groundAt(x, z)); if (!best || s < best[2]) best = [cx, cz, s]; }
        if (!best) best = [x + ${d}, z, 0];
        const [cx, cz] = best; P.x = cx + 30; P.z = cz + 30; recenter(x, z, true);
        const ey = surf(cx, cz) + ${up}, gy = surf(x, z);
        window.camOv = c => { c.position.set(cx, ey, cz); c.lookAt(x, gy + ${ly}, z); }; return true; })()`);
      await sleep(900); await shot(`${tag}_${k}_${v}`);
    }
  }
  if (tag === "night") console.log("info", await ev("JSON.stringify({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles })"));
}
await done();
