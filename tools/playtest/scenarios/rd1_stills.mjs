// RD1 stills: the rider's chase view, ground level along the road and overhead, in town and on the open road, winter at
// noon / dusk / night and summer at noon, plus a town junction close-up. One scenario, one set of files (OUT dir):
//   tools/playtest/run.sh tools/playtest/scenarios/rd1_stills.mjs <outdir>
// ONLY='<regex on the shot name>' limits the set (e.g. ONLY='^town_winter_noon'). Not an assert scenario: exit 0 unless the
// page threw. Names: <place>_<season>_<tod>_<view>.jpg, place town|road, view chase|ground|over, and junction_<season>_<tod>.
import { boot, ev, shot, sleep, done } from "../lib.mjs";
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
await boot();
await ev("tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; WX.at = () => 0; GS.storm = 0; QG.on = false; QG.apply && QG.apply(0); renderer.setPixelRatio(1.5); true");
await sleep(800);
await ev(`(() => { if (!window.__camHk) { window.__camHk = 1; const rr = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv && s === scene) window.camOv(c); rr(s, c); }; } return true; })()`);
const date = (y, m, d) => ev(`(() => { const D = Math.round((Date.UTC(${y}, ${m}, ${d}) - CAL_EPOCH) / 864e5); const k = Math.floor(GS.hour / 24); GS.hour = k * 24 + 12; CAL.off = (D - k) * 24; CAL.dc = null; CAL.lastDay = CAL.dayIndex(); meltBoot(); if (TLX.seasons) TLX.seasons.dress(TLX.seasons.look()); return CAL.now().label; })()`);
const hour = h => ev(`(() => { const k = Math.floor(GS.hour / 24); GS.hour = k * 24 + ${h}; return true; })()`);
// where to stand: a town street (the east-west street at TOWNG.Z[1], heading east) and a stretch of open fv888 well away from places
const spots = JSON.parse(await ev(`(() => {
  const d = depot, G = TOWNG, town = { x: d.x + G.X[0] + 12, z: d.z + G.Z[1], dx: 1, dz: 0 };
  let best = null;
  for (const rt of TLXR.routes) for (const sg of rt.segs) { if (rt.closed || sg.street || sg.pts.length < 40) continue; const p = sg.pts, m = Math.floor(p.length / 2), a = p[m - 8], b = p[m + 8];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!best || sg.pts.length > best.n) best = { n: sg.pts.length, id: rt.id, x: p[m - 8][0], z: p[m - 8][1], dx: (b[0] - a[0]) / L, dz: (b[1] - a[1]) / L }; }
  const jn = { x: d.x + G.X[1], z: d.z + G.Z[1] };
  return JSON.stringify({ town, road: best, jn });
})()`));
console.log("spots", JSON.stringify(spots));
const stand = async (s, back = 0) => { await ev(`(() => { crashCancel(); FOOT.on = false; VEH.cur = null; const x = ${s.x - s.dx * back}, z = ${s.z - s.dz * back}; P.x = x; P.z = z; P.y = surf(x, z); P.vx = P.vz = 0; P.yaw = Math.atan2(${s.dx}, ${s.dz}); window.camOv = null; camMode = 0; camState.init = false; return true; })()`); await sleep(900); await ev("TLXRK.fillAll(); true"); await sleep(900); };
const cam = (s, eye, look) => ev(`window.camOv = c => { const ex = ${s.x}, ez = ${s.z}, dx = ${s.dx}, dz = ${s.dz}, nx = -dz, nz = dx;
  const px = ex + dx * (${eye[0]}) + nx * (${eye[1]}), pz = ez + dz * (${eye[0]}) + nz * (${eye[1]}), qx = ex + dx * (${look[0]}) + nx * (${look[1]}), qz = ez + dz * (${look[0]}) + nz * (${look[1]});
  c.position.set(px, surf(px, pz) + ${eye[2]}, pz); c.lookAt(qx, surf(qx, qz) + ${look[2]}, qz); }; true`);
const take = async (name, fn) => { if (only && !only.test(name)) return; await fn(); await sleep(700); await shot(name); };
const views = async (tag, place, s) => {
  await take(`${place}_${tag}_chase`, async () => { await stand(s, 14); await ev("window.camOv = null; true"); await sleep(600); });
  await take(`${place}_${tag}_ground`, async () => { await cam(s, [0, 0.7, 1.55], [70, -0.4, 0.9]); await sleep(400); });
  await take(`${place}_${tag}_over`, async () => { await cam(s, [-26, 0, 42], [12, 0, 0]); await sleep(400); });
};
for (const [season, y, m, d, tods] of [["winter", 2027, 2, 1, [["noon", 12], ["dusk", 17.6], ["night", 22.5]]], ["summer", 2027, 6, 15, [["noon", 13]]]]) {
  await date(y, m, d); await sleep(2500);
  for (const [tod, h] of tods) {
    await hour(h); await sleep(1500);
    const tag = `${season}_${tod}`;
    await views(tag, "town", spots.town);
    if (spots.road) await views(tag, "road", spots.road);
    if (spots.road && season === "winter" && (tod === "noon" || tod === "night")) {      // a snow pole close up, and (night) its reflector in the headlight
      await take(`pole_${season}_${tod}`, async () => {                                // the chase camera, a pole pair 20 m ahead in the beam
        const pl = JSON.parse(await ev(`JSON.stringify((() => { const s = ${JSON.stringify(spots.road)}; let b = null; for (const [x, z] of TLXR.poleList) { const ax = x - s.x, az = z - s.z, f = ax * s.dx + az * s.dz, d = Math.abs(ax * -s.dz + az * s.dx); if (f < 30 || f > 120 || d > 6) continue; if (!b || f < b.f) b = { x, z, f }; } return b; })())`));
        const back = pl ? pl.f - 20 : 0;
        await stand({ x: spots.road.x + spots.road.dx * back, z: spots.road.z + spots.road.dz * back, dx: spots.road.dx, dz: spots.road.dz }, 8);
        await ev("window.camOv = null; true"); await sleep(900); });
    }
    if (!(only && !only.test(`junction_${season}_${tod}`)) && (season === "winter" || tod === "noon")) {
      await take(`junction_${season}_${tod}`, async () => { await stand(spots.town, 14); await ev("window.camOv = null; true"); await cam({ x: spots.jn.x, z: spots.jn.z, dx: 0.7071, dz: 0.7071 }, [-11, 0, 4.5], [0, 0, 0]); await sleep(300); });
    }
  }
}
await ev("window.camOv = null; true");
await done();
