// Kjøllefjord street grid: asserts. Every in-town door's apron is reachable from the depot yard over plowed ground
// (flood fill on yardAt), streets are clear of obstacles, houses face their street, the sled country is placed, the
// first ride's lane (SPAWN heading) is clear, and the draw-call count at the depot is reported.
// Run: tools/playtest/run.sh tools/playtest/scenarios/town3d_check.mjs
import { boot, ev, sleep, done } from "../lib.mjs";
await boot();
await ev(`tutSkip(); true`); await sleep(500);
const r = JSON.parse(await ev(`(() => {
  const out = {}, d = depot;
  const doors = KIT.doors.filter(D => Math.hypot(D.x - d.x, D.z - d.z) <= TOWN_R);
  out.doors = doors.length; out.grid = doors.filter(D => D.grid).length; out.foot = KIT.foot.filter(f => Math.hypot(f.x - d.x, f.z - d.z) <= TOWN_R + 40).length;
  // flood fill over plowed cells
  const S = 1.5, R = 140, N = Math.ceil(2 * R / S), seen = new Uint8Array(N * N), cell = (x, z) => [Math.round((x - d.x + R) / S), Math.round((z - d.z + R) / S)];
  const plow = (i, j) => yardAt(d.x - R + i * S, d.z - R + j * S) > 0.5;
  const q = [], [si, sj] = cell(d.x - 5, d.z); q.push(si, sj); seen[sj * N + si] = 1;
  while (q.length) { const i = q.shift(), j = q.shift(); for (const [a, b] of [[1,0],[-1,0],[0,1],[0,-1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= N || y >= N || seen[y * N + x] || !plow(x, y)) continue; seen[y * N + x] = 1; q.push(x, y); } }
  out.unreached = doors.filter(D => { const [i, j] = cell(D.x + D.nx * (D.d / 2 + 5), D.z + D.nz * (D.d / 2 + 5)); return !seen[j * N + i]; }).map(D => [Math.round(D.x - d.x), Math.round(D.z - d.z)]);
  // streets vs obstacles
  let hits = 0; for (const [ax, az, bx, bz] of TOWNG.lines) { const n = Math.ceil(Math.hypot(bx - ax, bz - az)); for (let k = 0; k <= n; k++) if (obNear(ax + (bx - ax) * k / n, az + (bz - az) * k / n, 0.4)) hits++; }
  out.streetHits = hits;
  // every lane leg in town (the spurs, the quay street, the hut's spur): sampled each 1 m, ends within 2.5 m of an apron left out
  let lh = 0, ln = 0; for (const Y of YARDS) { if (Y.f !== LANE_FALL || Math.hypot(Y.x - d.x, Y.z - d.z) > TOWN_R + 10) continue; ln++; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z), n = Math.max(1, Math.ceil(L)); for (let k = 0; k <= n; k++) { const x = Y.x + (Y.x2 - Y.x) * k / n, z = Y.z + (Y.z2 - Y.z) * k / n; if (Math.hypot(x - Y.x2, z - Y.z2) < 2.5 || Math.hypot(x - Y.x, z - Y.z) < 2.5) continue; if (obNear(x, z, 0.4)) lh++; } }
  out.laneLegs = ln; out.laneHits = lh;
  // houses face a street: the apron point sits within 3.5 m of a street line (door grid)
  out.apronOff = doors.filter(D => D.grid).filter(D => townStreetNear(D.x + D.nx * (D.d / 2 + 5), D.z + D.nz * (D.d / 2 + 5)) > 3.5).length;
  // the first ride: SPAWN heading, 90 m straight ahead
  let blocked = 0; for (let t = 0; t < 90; t += 1) if (obNear(SPAWN.x + Math.sin(SPAWN.yaw) * t, SPAWN.z + Math.cos(SPAWN.yaw) * t, 1.1)) blocked++;
  out.spawnBlocked = blocked;
  out.sc = sledCountry.at || null;
  out.calls = null; return JSON.stringify(out);
})()`));
console.log(JSON.stringify(r));
const calls = JSON.parse(await ev(`(async () => { await new Promise(r => setTimeout(r, 600)); return JSON.stringify({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles }); })()`).catch(() => "{}"));
console.log("render", JSON.stringify(calls));
let bad = 0; const chk = (ok, msg) => { console.log((ok ? "ok   " : "FAIL ") + msg); if (!ok) bad++; };
chk(r.doors >= 14, `doors in town ${r.doors} (was 14 lots+store+church+fish shop)`);
chk(r.unreached.length === 0, `every door apron reachable over plowed ground (${r.unreached.length} not: ${JSON.stringify(r.unreached)})`);
chk(r.streetHits === 0, `streets clear of obstacles (${r.streetHits} hits)`);
chk(r.laneHits === 0, `${r.laneLegs} lane legs in town clear of obstacles (${r.laneHits} hits)`);
chk(r.apronOff === 0, `every grid door's apron sits on its street (${r.apronOff} off)`);
chk(r.spawnBlocked === 0, `first-ride lane from the spawn is clear (${r.spawnBlocked} blocked samples)`);
chk(!!r.sc, `sled country placed ${JSON.stringify(r.sc)}`);
await done(bad ? 1 : 0);
