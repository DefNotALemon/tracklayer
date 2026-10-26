// G3 the garage's name boards (Nordkinn Skuter & Service, buildTown): the forecourt sign on its post and the name
// board over the roll door. Shot from the forecourt 3/4, square-on to the post sign, square-on to the roll door and
// from the ride-in approach ~30 m out, at Nov noon and 21:00. Logs renderer.info at the forecourt view.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_garage_sign.mjs [outdir]   then imgstats.py <outdir>
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; return true; })()`);
const VIEWS = [
  // tag, eye (dx, dz, up) from the shed centre, look (dx, dz, up)
  ["fore", 17, -9, 2.2, 5, -1, 2.4],
  ["post", 13.5, -3.2, 3.0, 7.4, -3.2, 3.2],
  ["door", 14, 0.4, 2.4, 5.5, 0.4, 2.6],
  ["ride", 34, 8, 2.0, 5, -1, 2.4],
];
for (const [tag, h] of [["nov", 12], ["night", 21]]) {
  await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h}; true`); await sleep(1200);
  for (const [v, ex, ez, eu, lx, lz, lu] of VIEWS) {
    await ev(`(() => { const gx = garageSite.x - 12, gz = garageSite.z, gy = groundAt(gx, gz) - 0.25;
      const cx = gx + ${ex}, cz = gz + ${ez};
      P.x = cx + 30; P.z = cz + 30; recenter(gx, gz, true);
      const ey = Math.max(gy + ${eu}, groundAt(cx, cz) + 1.6);
      window.camOv = c => { c.position.set(cx, ey, cz); c.lookAt(gx + ${lx}, gy + ${lu}, gz + ${lz}); }; return true; })()`);
    await sleep(900); await shot(`${tag}_${v}`);
    if (tag === "nov" && v === "fore") console.log("info_fore", await ev("JSON.stringify({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles })"));
  }
}
await done();
