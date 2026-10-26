// G3 sheds up close: the town's work buildings that aren't KIT.house (the garage, the pier freight shed, the fish
// buyer's shed on the pier), at Nov noon, March noon and 20:00. Each is shot 3/4 from its door side ~14 m out at
// 2.2 m eye height; logs renderer.info at the quay view so facade work can be costed.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_sheds.mjs [outdir]   then imgstats.py <outdir>
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; return true; })()`);
// targets: [name, centre x/z, camera x/z, look height above ground]
const T = JSON.parse(await ev(`(() => {
  const out = [], gx = garageSite.x - 12, gz = garageSite.z;
  out.push(["garage", gx, gz, gx + 13, gz + 8, 0]);
  if (QUAY) { const { qx, qz, qa, qy } = QUAY, w = (u, v) => [qx + u * Math.cos(-qa) + v * Math.sin(-qa), qz - u * Math.sin(-qa) + v * Math.cos(-qa)];
    const [fx, fz] = w(2, -20), [cx, cz] = w(10, -36); out.push(["freight", fx, fz, cx, cz, qy]);
    const [bx2, bz2] = w(1, 13), [kx, kz] = w(10, 7); out.push(["fishbuyer", bx2, bz2, kx, kz, qy]); }
  return JSON.stringify(out); })()`));
console.log("targets", JSON.stringify(T));
const setHour = async (h, day = 0) => { await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h} + ${day * 24}; true`); await sleep(1200); };
for (const [tag, h, day] of [["nov", 12, 0], ["mar", 12, 120], ["night", 20, 0]]) {
  await setHour(h, day);
  for (const [name, x, z, cx, cz, qy] of T) {
    await ev(`(() => { P.x = ${cx} + 30; P.z = ${cz} + 30; recenter(${x}, ${z}, true);
      const y0 = ${qy} || groundAt(${cx}, ${cz}), y1 = ${qy} || groundAt(${x}, ${z});
      window.camOv = c => { c.position.set(${cx}, y0 + 2.2, ${cz}); c.lookAt(${x}, y1 + 1.8, ${z}); }; return true; })()`);
    await sleep(900); await shot(`${tag}_${name}`);
    if (tag === "nov" && name === "freight") console.log("info_quay", await ev("JSON.stringify({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles })"));
  }
}
await done();
