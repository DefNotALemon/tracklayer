// G3 gas stations (buildStations): the Kjøllefjord station from the ride-in 3/4 (~26 m), from the forecourt edge
// looking under the canopy at the pumps, close on a pump, and the kiosk end; Nov noon and 21:00. Logs renderer.info
// at the 3/4 view. Local coords are the station's own (x along the forecourt, z across, kiosk at x = -8).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_stations.mjs [outdir]   then imgstats.py <outdir>
import { boot, ev, shot, sleep, done } from "../lib.mjs";

const ST = process.env.ST || "0";
await boot();
await ev(`(() => { WX.at = () => 0; GS.storm = 0;
  const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); };
  tabCull = () => {}; return true; })()`);
const VIEWS = [
  // tag, eye (lx, lz, up), look (lx, lz, up)
  ["q34", 22, 16, 2.4, 0, 0, 2.2],
  ["canopy", 10, 9, 1.8, 0, 0, 1.6],
  ["pump", 4.4, 4.2, 1.7, 3.2, 0, 1.3],
  ["kiosk", -2, 10, 1.8, -8, 0, 1.8],
  ["disp", 4.9, 1.9, 1.9, 4.4, 0.4, 1.75],   // a pump's display face from ~1.5 m (v127 LCD readout)
];
for (const [tag, h] of [["nov", 12], ["night", 21]]) {
  await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + ${h}; true`); await sleep(1200);
  for (const [v, ex, ez, eu, lx, lz, lu] of VIEWS) {
    await ev(`(() => { const t = STATIONS[${ST}], cr = Math.cos(t.ry), sr = Math.sin(t.ry);
      const W = (a, b) => [t.x + a * cr + b * sr, t.z - a * sr + b * cr];
      const gy = groundAt(t.x, t.z) - 0.2, [cx, cz] = W(${ex}, ${ez}), [lx, lz] = W(${lx}, ${lz});
      P.x = cx + 30; P.z = cz + 30; recenter(t.x, t.z, true);
      const ey = Math.max(gy + ${eu}, groundAt(cx, cz) + 1.5);
      window.camOv = c => { c.position.set(cx, ey, cz); c.lookAt(lx, gy + ${lu}, lz); }; return true; })()`);
    await sleep(900); await shot(`${tag}_${v}`);
    if (tag === "nov" && v === "q34") console.log("info_q34", await ev("JSON.stringify({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles })"));
  }
}
await done();
