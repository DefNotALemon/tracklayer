// G1: plowed lanes in Kjøllefjord. Samples how much of the straight walk from the depot yard to each town door
// (garage forecourt, store, the shore-road houses, the church) is on plowed ground (yardAt > 0.5), then walks the
// routes players use most (depot yard -> three shore-road house doors, and report 0020/0023's shore-road point to the
// garage) by gameClock, and takes day + night stills over the town. (lot9 is left out of the walks: its straight
// route runs into the freight shed on the pier.)
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_lanes.mjs
import { boot, ev, shot, done, sleep, down, up } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; true");

// door targets: buildTown's lot table (offsets from the depot, depth d, yaw r), the apron spot out from each door
const lots = [[46, 26, 7, 0.2], [46, -12, 6, -0.15], [18, 40, 7, 1.5], [-16, 44, 6, 1.6], [-40, 20, 7, -1.5], [-38, -16, 6, -1.4],
  [10, -42, 7, 3.0], [-20, -40, 6, 2.9], [70, 8, 6, 0.4], [-66, 4, 6, -0.3], [30, 66, 6, 1.2], [-8, 70, 7, 1.7], [24, -34, 8, 0.1], [-58, 46, 16, -0.4]];
const res = JSON.parse(await ev(`(() => {
  const lots = ${JSON.stringify(lots)}, out = [], ax = depot.x - 5, az = depot.z;
  const T = lots.map(([ox, oz, d, r], i) => ({ n: i === 12 ? "store" : i === 13 ? "church" : "lot" + i, x: depot.x + ox + Math.sin(r) * (d / 2 + 5), z: depot.z + oz + Math.cos(r) * (d / 2 + 5) }));
  T.unshift({ n: "garage", x: garageSite.x - 5, z: garageSite.z });
  for (const t of T) {
    if (isSea(t.x, t.z)) continue;
    const L = Math.hypot(t.x - ax, t.z - az), n = Math.max(2, Math.round(L / 1));
    let on = 0, mn = 1;
    for (let k = 0; k <= n; k++) { const y = yardAt(ax + (t.x - ax) * k / n, az + (t.z - az) * k / n); if (y > 0.5) on++; mn = Math.min(mn, y); }
    out.push({ n: t.n, L: +L.toFixed(1), plowed: +(on / (n + 1)).toFixed(2), min: +mn.toFixed(2) });
  }
  return JSON.stringify(out);
})()`));
for (const r of res) console.log(`route depot->${r.n}: ${r.L} m, plowed ${Math.round(r.plowed * 100)}%, min yard ${r.min}`);
const mean = res.reduce((a, r) => a + r.plowed, 0) / res.length;
console.log(`mean plowed share of depot->door routes: ${Math.round(mean * 100)}%, routes with a gap (min < 0.5): ${res.filter(r => r.min < 0.5).length}/${res.length}`);

function setFoot(x, z, yawExpr) {
  return ev(`(() => {
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = ${x}; FOOT.z = ${z};
    FOOT.yaw = ${yawExpr}; P.x = depot.x + 6; P.z = depot.z + 8; P.y = surf(P.x, P.z) + 0.3; recenter(FOOT.x, FOOT.z, true);
    FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0;
    FOOT.tired = 0; FOOT.strain = 0.6; FOOT.step = 0; FOOT.half = 0; if (FOOT.g) FOOT.g.visible = true;
    camState.init = false; true;
  })()`);
}
// walk a path of waypoints by gameClock, steering at the next one; reports metres, seconds, avg m/s, mean pack underfoot
async function walkPath(pts, cap) {
  const s0 = JSON.parse(await ev("JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock})"));
  let s = s0, packs = [], wi = 0, m = 0, px = s0.x, pz = s0.z;
  await down("KeyW");
  try { for (;;) { await sleep(120); const [tx, tz] = pts[wi];
    s = JSON.parse(await ev(`(() => { FOOT.yaw = Math.atan2(${tx} - FOOT.x, ${tz} - FOOT.z); const ix = Math.round((FOOT.x + HALF) / CELL), iz = Math.round((FOOT.z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); return JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, pk: f > 0.02 ? Math.max(0, Math.min(1, 1 - d / f)) : 1}); })()`));
    packs.push(s.pk); m += Math.hypot(s.x - px, s.z - pz); px = s.x; pz = s.z;
    if (Math.hypot(tx - s.x, tz - s.z) < 2) { if (++wi >= pts.length) break; }
    if (s.t - s0.t > cap) break; } }
  finally { await up("KeyW"); }
  const dt = s.t - s0.t;
  return { reached: wi >= pts.length, m: +m.toFixed(1), secs: +dt.toFixed(1), avg: +(m / dt).toFixed(2), pack: +(packs.reduce((a, b) => a + b, 0) / packs.length).toFixed(2) };
}
// the walking route a player takes from the depot yard to a lot's door: straight to the apron, round the side when the
// door faces away from the quay (same geometry buildTown's lanes use, so before/after walk the identical line)
const route = (i) => ev(`(() => {
  const [ox, oz, d, r] = ${JSON.stringify(lots)}[${i}], w = [9, 8, 8, 9, 10, 8, 9, 8, 8, 9, 8, 9][${i}];
  const hx = depot.x + ox, hz = depot.z + oz, nx = Math.sin(r), nz = Math.cos(r), sx0 = depot.x - 5, sz0 = depot.z, rr = Math.max(w, d) / 2 + 3.5;
  const pts = [], tx = sx0 - hx, tz = sz0 - hz;
  if (nx * tx + nz * tz < 0) { const s = Math.sign(nz * tx - nx * tz) || 1; pts.push([hx + nz * s * rr, hz - nx * s * rr]); }
  pts.push([hx + nx * (d / 2 + 5), hz + nz * (d / 2 + 5)]);
  const ux = pts[0][0] - sx0, uz = pts[0][1] - sz0, ul = Math.hypot(ux, uz);
  return JSON.stringify({ start: [sx0 + ux / ul * 18, sz0 + uz / ul * 18], pts });
})()`).then(JSON.parse);
for (const i of [0, 11, 3]) {
  const R = await route(i);
  await setFoot(R.start[0].toFixed(2), R.start[1].toFixed(2), `Math.atan2(${R.pts[0][0]} - ${R.start[0]}, ${R.pts[0][1]} - ${R.start[1]})`); await sleep(400);
  const w = await walkPath(R.pts, 60);
  console.log(`walk depot yard edge -> lot${i} door: ${w.reached ? "reached" : "NOT reached"}, ${w.m} m in ${w.secs} s, avg ${w.avg} m/s, mean pack ${w.pack}`);
}
// report 0020/0023 shore-road point (-1250,-420) -> garage forecourt
const g = JSON.parse(await ev("JSON.stringify({gx: garageSite.x - 5, gz: garageSite.z})"));
await setFoot(-1250, -420, `0`); await sleep(400);
const w2 = await walkPath([[g.gx, g.gz]], 40);
console.log(`walk shore-road (-1250,-420) -> garage forecourt: ${w2.m} m in ${w2.secs} s, avg ${w2.avg} m/s, mean pack ${w2.pack}`);
// stills: high over the depot yard looking out over the shore-road houses, day and night
const cam = (h, ox, oz) => ev(`(() => { GS.hour = ${h}; const ex = depot.x - 20, ez = depot.z - 14, tx = depot.x + ${ox}, tz = depot.z + ${oz};
  FOOT.x = depot.x - 2; FOOT.z = depot.z; FOOT.y = surf(FOOT.x, FOOT.z) + 0.1;
  window.camOv = () => { camera.position.set(ex, surf(ex, ez) + 16, ez); camera.lookAt(tx, surf(tx, tz), tz); };
  if (!window.__wr) { window.__wr = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(); window.__wr(s, c); }; }
  true; })()`);
await cam(12, 30, 30); await sleep(1500); await shot("01_town_day");
await cam(12, -30, 30); await sleep(1500); await shot("02_town_day_w");
await cam(22, 30, 30); await sleep(1500); await shot("03_town_night");
await done();
