// G3 chimney smoke: town/village roofs at Nov noon, March 15:00 and Nov 20:00, weather pinned. Each view lets the smoke
// build for ~8 game-s before the still. Views: the quay town from 45 m (roof height), Mehamn village from 60 m, the
// Strandbu home from 30 m. Logs chimney counts, live smoke puffs and draw calls, and the per-frame smoke update cost.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_chimney.mjs [outdir]; then sheet.py + imgstats.py on the outdir.
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; return true; })()`);
console.log("chimneys", await ev(`JSON.stringify({ sites: SITES.filter(s => s.chimney).length, houses: (KIT.chimneys || []).length, doors: KIT.doors.length })`));
const waitGame = async (secs) => { const t0 = await ev("gameClock"); for (let i = 0; i < 80; i++) { await sleep(400); if ((await ev("gameClock")) - t0 >= secs) break; } };
// camera: from (target + offset) looking at target + look-up; P parked 40 m behind the camera so the sled is out of shot
const VIEWS = [
  ["town", `(() => { const d = SITES.find(s => s.id === "depot"); let best = null; for (const k of KIT.doors) { const r = Math.hypot(k.x - d.x, k.z - d.z); if (r < 160 && (!best || r < best.r)) best = { x: k.x, z: k.z, r }; } return best || { x: d.x, z: d.z }; })()`, 32, 26, 5.5, 4],
  ["mehamn", `(() => { const s = SITES.find(q => q.id === "mehamn"); return { x: s.x, z: s.z }; })()`, 52, 34, 6, 5],
  ["strandbu", `(() => { const s = SITES.find(q => q.id === "strandbu"); return { x: s.x - 11, z: s.z }; })()`, 22, 20, 3.5, 4],
  ["house", `(() => { const d = SITES.find(s => s.id === "depot"); const k = KIT.doors.slice().sort((a, b) => Math.hypot(a.x - d.x, a.z - d.z) - Math.hypot(b.x - d.x, b.z - d.z))[2]; return { x: k.x, z: k.z }; })()`, 13, 11, 2.2, 5],
];
for (const [tag, hr, day] of [["nov", 12, 0], ["mar", 15, 120], ["night", 20, 0]]) {
  await ev(`GS.storm = 0; GS.hour = (Math.floor(GS.hour / 24) + ${day}) * 24 + ${hr}; true`);
  for (const [name, tgt, ox, oz, h, look] of VIEWS) {
    await ev(`(() => { const t = ${tgt}; const cx = t.x + ${ox}, cz = t.z + ${oz};
      P.x = cx + 30; P.z = cz + 30; P.y = surf(P.x, P.z) + 0.5; P.vx = P.vy = P.vz = 0; recenter(t.x, t.z, true);
      window.camOv = c => { c.position.set(cx, groundAt(cx, cz) + ${h}, cz); c.lookAt(t.x, groundAt(t.x, t.z) + ${look} + 4, t.z); }; return true; })()`);
    await waitGame(8);
    if (tag === "nov") console.log("render", name, await ev(`JSON.stringify({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, puffs: typeof CSMK !== "undefined" ? CSMK.live : -1 })`));
    await shot(`${tag}_${name}`);
  }
}
console.log("cost", await ev(`(() => { if (typeof updChimSmoke !== "function") return "none"; const t = performance.now(); for (let i = 0; i < 200; i++) updChimSmoke(0.016); return ((performance.now() - t) / 200).toFixed(3) + " ms/frame"; })()`));
await done();
