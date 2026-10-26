// G3 site buildings up close (buildSites: the quay depot, a village shop, a herder cabin, two homes). Each is viewed 3/4
// from the door side (+x) and from the long-window end (-z), at Nov noon and 20:00, 2.2 m eye height. Logs renderer.info
// at the depot door view so facade work can be costed.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_sites.mjs [outdir]   then imgstats.py <outdir>
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; return true; })()`);
const IDS = (process.env.SITES || "depot,mehamn,sandfjord,strandbu,naust").split(",");
const setHour = async (h) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h}; true`); await sleep(1200); };
for (const [tag, h] of [["nov", 12], ["night", 20]]) {
  await setHour(h);
  for (const id of IDS) {
    for (const [view, du, dv] of [["door", 14, -9], ["end", -5, -17]]) {
      const ok = await ev(`(() => { const s = SITES.find(q => q.id === "${id}"); if (!s) return false;
        const bx = s.x - 11, bz = s.z, cx = bx + ${du}, cz = bz + ${dv};
        P.x = cx + 30; P.z = cz + 30; recenter(bx, bz, true);
        const y0 = groundAt(cx, cz), y1 = groundAt(bx, bz);
        window.camOv = c => { c.position.set(cx, y0 + 2.2, cz); c.lookAt(bx, y1 + 2.2, bz); }; return true; })()`);
      if (!ok) { console.log("no site", id); continue; }
      await sleep(900); await shot(`${tag}_${id}_${view}`);
      if (tag === "nov" && id === "depot" && view === "door") console.log("info_depot", await ev("JSON.stringify({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles })"));
    }
  }
}
await done();
