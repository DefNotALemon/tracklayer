// G3 far-terrain sawtooth: hillsides 150-450 m away showed a comb of bright/dark teeth. Cause (v68 fix): each lake's
// basin carve stopped dead at 1.7 r with its pull still ~0.5, leaving a ring of 20-40 m cliff steps round every lake.
// Finds the spot 1.2-3 km out (gentle low ground or lake ice) whose view holds the most snow/rock boundary vertices
// 150-450 m off, aims at them at noon, shoots a wide still plus telephoto close-ups, and logs `cliffs` (4 m grid
// edges rising >10 m, world-wide) and `lakeCliffs` (those within 2 r of a lake). TL_SPOT="x,z,dir" pins the spot.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_ridge.mjs   (pair with imgstats.py)
import { boot, ev, shot, sleep, done } from "../lib.mjs";

await boot();
const PIN = process.env.TL_SPOT || "";            // "x,z,dirBin" re-shoots a spot from an earlier run (before/after)
await ev("WX.at = () => 0; GS.storm = 0; true");
const r = JSON.parse(await ev(`(() => {
  const n = (GN - 1) / 2 + 1, rockAt = (i, j) => { const k = (j * 2) * GN + i * 2; return bio[k] !== 1 && bio[k] !== 3 && freshG[k] < 0.12; };
  let best = null;
  for (let rr = 1200; rr <= 3000; rr += 300) for (let a = 0; a < 6.28; a += 0.26) {
    const x = SPAWN.x + Math.cos(a) * rr, z = SPAWN.z + Math.sin(a) * rr;
    if (isSea(x, z) || obNear(x, z, 30) || Math.abs(x) > HALF - 600 || Math.abs(z) > HALF - 600) continue;
    if (slopeAt(x, z, 8) > 0.08 || groundAt(x, z) > 600) continue;            // stand on gentle low ground (the sled must not slide)
    const bins = new Array(16).fill(0);
    const ci = Math.round((x + HALF) / 8), cj = Math.round((z + HALF) / 8);
    for (let dj = -56; dj <= 56; dj++) for (let di = -56; di <= 56; di++) {
      const d = Math.hypot(di, dj) * 8; if (d < 150 || d > 450) continue;
      const i = ci + di, j = cj + dj; if (i < 1 || j < 1 || i >= n - 1 || j >= n - 1) continue;
      const rk = rockAt(i, j); if (rk === rockAt(i + 1, j) && rk === rockAt(i, j + 1)) continue;
      bins[((Math.round(Math.atan2(dj, di) / (Math.PI / 8)) % 16) + 16) % 16]++;
    }
    for (let b = 0; b < 16; b++) if (!best || bins[b] > best.cnt) best = { x, z, b, cnt: bins[b] };
  }
  if ("${PIN}") { const [px, pz, pb] = "${PIN}".split(",").map(Number); best = { x: px, z: pz, b: pb, cnt: -1 }; }
  const { x, z } = best, ang = best.b * Math.PI / 8;
  // cliff steps: 4 m grid edges on land rising more than 10 m (slope 2.5), world-wide and within 2 r of a lake
  let cliffs = 0, lakeCliffs = 0;
  for (let j = 1; j < GN - 1; j++) for (let i = 1; i < GN - 1; i++) { const k = j * GN + i; if (bio[k] === 3) continue;
    if (Math.abs(ground[k + 1] - ground[k]) > 10 || Math.abs(ground[k + GN] - ground[k]) > 10) { cliffs++; const wx = i * GRES - HALF, wz = j * GRES - HALF; if (LAKES.some(L => Math.hypot(wx - L.x, wz - L.z) < L.r * 2)) lakeCliffs++; } }
  P.x = x; P.z = z; P.y = surf(x, z) + 0.5; P.vx = P.vy = P.vz = 0; P.safe = { x, z, yaw: P.yaw };
  recenter(x, z, true); camState.init = false;
  window.__aim = { x, z, y: surf(x, z) + 6, dx: Math.cos(ang), dz: Math.sin(ang) };
  return JSON.stringify({ spot: Math.round(x) + "," + Math.round(z) + "," + best.b, cliffs, lakeCliffs, km: +(Math.hypot(x - SPAWN.x, z - SPAWN.z) / 1000).toFixed(2), boundaryVerts: best.cnt, dir: best.b, bio: bioAt(x, z) });
})()`));
console.log("ridge_spot", JSON.stringify(r));
await ev(`GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24 + 12; camState.init = false; true`);
await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`);
const aim = async (fov, dist, side) => {
  await ev(`window.camOv = c => { const A = window.__aim; P.x = A.x; P.z = A.z; P.vx = P.vy = P.vz = 0; const sx = -A.dz * ${side}, sz = A.dx * ${side};
    c.fov = ${fov}; c.updateProjectionMatrix(); c.position.set(A.x, A.y, A.z);
    const tx = A.x + A.dx * ${dist} + sx * ${dist}, tz = A.z + A.dz * ${dist} + sz * ${dist};
    c.lookAt(tx, groundAt(tx, tz) + 4, tz); }; true`);
  await sleep(1800);
};
await aim(60, 300, 0); await shot("01_wide");
await aim(18, 260, -0.12); await shot("02_tele_left");
await aim(18, 260, 0.12); await shot("03_tele_right");
await ev(`GS.hour = Math.floor(GS.hour / 24) * 24 + 12 + 120 * 24; true`); await sleep(1500);
await aim(18, 260, 0); await shot("04_tele_march");
await ev("window.camOv = null; camera.fov = 62; camera.updateProjectionMatrix(); true");
await done();
