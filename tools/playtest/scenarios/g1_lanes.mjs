// G1: plowed lanes in Kjøllefjord (since v223 a street grid, TOWNG). Floods outward over plowed ground (yardAt > 0.5)
// from the depot yard and checks every in-town door's apron is reached, then walks the way a player does: down the
// depot street, along the door's own street, up its spur, for the store, the church and the farthest house, plus
// the shore-road point to the garage forecourt (reports 0020/0023); takes day + night stills over the town.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_lanes.mjs
import { boot, ev, shot, done, sleep, down, up } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; true");

const res = JSON.parse(await ev(`(() => {
  const d = depot, doors = KIT.doors.filter(D => Math.hypot(D.x - d.x, D.z - d.z) <= TOWN_R);
  const S = 1.5, R = 140, N = Math.ceil(2 * R / S), seen = new Uint8Array(N * N), cell = (x, z) => [Math.round((x - d.x + R) / S), Math.round((z - d.z + R) / S)];
  const q = [], [si, sj] = cell(d.x - 5, d.z); q.push(si, sj); seen[sj * N + si] = 1;
  while (q.length) { const i = q.shift(), j = q.shift(); for (const [a, b] of [[1,0],[-1,0],[0,1],[0,-1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= N || y >= N || seen[y * N + x] || yardAt(d.x - R + x * S, d.z - R + y * S) <= 0.5) continue; seen[y * N + x] = 1; q.push(x, y); } }
  const miss = doors.filter(D => { const [i, j] = cell(D.x + D.nx * (D.d / 2 + 5), D.z + D.nz * (D.d / 2 + 5)); return !seen[j * N + i]; });
  return JSON.stringify({ n: doors.length, miss: miss.length });
})()`));
console.log(`in-town doors ${res.n}, apron not reachable over plowed ground: ${res.miss}`);
if (res.miss) process.exitCode = 1;
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
// street route to a door: depot yard -> the depot street (x = depot.x + 2) -> the door's street -> its spur
const route = (pick) => ev(`(() => {
  const d = depot, doors = KIT.doors.filter(D => D.grid && Math.hypot(D.x - d.x, D.z - d.z) <= TOWN_R);
  const D = (${pick})(doors); const ap = [D.x + D.nx * (D.d / 2 + 5), D.z + D.nz * (D.d / 2 + 5)], cx = d.x + 2;
  return JSON.stringify({ pts: [[cx, d.z], [cx, D.grid[1]], [D.grid[0], D.grid[1]], ap], who: [Math.round(D.x - d.x), Math.round(D.z - d.z)] });
})()`).then(JSON.parse);
const picks = { store: "ds => ds.find(D => D.d === 8 && Math.abs(D.x - depot.x - 25) < 12) || ds[0]", church: "ds => ds.reduce((a, b) => (b.z > a.z ? b : a))", farEast: "ds => ds.reduce((a, b) => (b.x > a.x ? b : a))" };
let fails = 0;
for (const [name, pick] of Object.entries(picks)) {
  const R = await route(pick);
  await setFoot((R.pts[0][0] - 7).toFixed(2), R.pts[0][1].toFixed(2), `Math.atan2(${R.pts[0][0]} - FOOT.x, ${R.pts[0][1]} - FOOT.z)`); await sleep(400);
  const w = await walkPath(R.pts, 90);
  console.log(`walk depot yard -> ${name} door (${R.who}) by its streets: ${w.reached ? "reached" : "NOT reached"}, ${w.m} m in ${w.secs} s, avg ${w.avg} m/s, mean pack ${w.pack}`);
  if (!w.reached) fails++;
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
await done(fails || process.exitCode ? 1 : 0);
