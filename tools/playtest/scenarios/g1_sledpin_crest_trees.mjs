// G1 follow-up to v106/v134 (0044, PROGRESS "Still unchecked: in trees, next to a delivery/depot beacon"):
// same continuous crest-walk-toward-sled test as g1_sledpin_crestcont.mjs, but the search now scores rises
// by how many trees sit within 15 m of the walking line AND how close the line passes to the depot beacon,
// so we land on a crest that also has line-of-sight obstructions, not just open ground.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_sledpin_crest_trees.mjs
import fs from "node:fs";
import { boot, ev, shot, park, tap, down, up, sleep, done, OUT } from "../lib.mjs";
await boot();
const p0 = await park();
console.log("parked at", JSON.stringify(p0));
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = Math.floor(GS.hour / 24) * 24; true");
await sleep(1500);
await tap("KeyQ"); await sleep(2500);
if (!JSON.parse(await ev("JSON.stringify(FOOT.on)"))) { console.log("FAIL: not on foot"); await done(1); }
// search rises like g1_sledpin_crestcont, but score by tree count near the line + depot proximity
const spot = JSON.parse(await ev(`(() => {
  const sx = P.x, sz = P.z, sy = groundAt(sx, sz); let best = null, bestScore = -1;
  for (let a = 0; a < 24; a++) { const ang = a / 24 * Math.PI * 2;
    for (const dist of [220, 300, 450, 600]) {
      const fx = sx + Math.sin(ang) * dist, fz = sz + Math.cos(ang) * dist, fy = groundAt(fx, fz) + 1.6;
      let maxOver = 0, ct = 0, trees = 0, minDepot = Infinity, wet = false;
      for (let t = 0.15; t < 0.95; t += 0.02) { const mx = sx + (fx - sx) * t, mz = sz + (fz - sz) * t;
        if (isSea(mx, mz) || (typeof isWater === "function" && isWater(mx, mz))) { wet = true; break; }
        const o = groundAt(mx, mz) - (sy + 1 + (fy - (sy + 1)) * t); if (o > maxOver) { maxOver = o; ct = t; }
        trees += anchorsNear(mx, mz, 15).filter(c => c.o.tree !== undefined).length;
        minDepot = Math.min(minDepot, Math.hypot(mx - depot.x, mz - depot.z)); }
      if (wet || maxOver <= 0) continue;
      if (isSea(fx, fz) || (typeof isWater === "function" && isWater(fx, fz))) continue;
      const score = trees * 10 + (minDepot < 150 ? 200 - minDepot : 0) + maxOver;
      if (score > bestScore) { bestScore = score; best = { ang, dist, fx, fz, maxOver, ct, trees, minDepot: +minDepot.toFixed(0) }; }
    } }
  return JSON.stringify(best); })()`));
console.log("rise:", JSON.stringify(spot));
if (!spot) { console.log("NOTE: no rise found"); await done(1); }
const ux = (spot.fx - p0.x) / spot.dist, uz = (spot.fz - p0.z) / spot.dist, cd = spot.ct * spot.dist;
const sd = Math.min(spot.dist, cd + 70);
await ev(`(() => { FOOT.x = ${p0.x + ux * sd}; FOOT.z = ${p0.z + uz * sd}; FOOT.yaw = Math.atan2(P.x - FOOT.x, P.z - FOOT.z); camState.init = false; return true; })()`);
await sleep(2500);
const wetStart = JSON.parse(await ev(`JSON.stringify(isSea(FOOT.x, FOOT.z) || (typeof isWater === "function" && isWater(FOOT.x, FOOT.z)))`));
if (wetStart) { console.log("FAIL: start spot is water"); await done(1); }
const S = `JSON.stringify((() => { const gs = groundAt(P.x, P.z), d = Math.hypot(P.x - FOOT.x, P.z - FOOT.z);
  FOOT.yaw = Math.atan2(P.x - FOOT.x, P.z - FOOT.z);
  const cxz = Math.hypot(camera.position.x - ${p0.x + ux * cd}, camera.position.z - ${p0.z + uz * cd});
  const v = new THREE.Vector3(P.x, V.sledPinB === undefined ? gs : V.sledPinB, P.z).project(camera);
  return { t: +gameClock.toFixed(1), d: +d.toFixed(1), crestCam: +cxz.toFixed(1),
    lift: V.sledPinB === undefined ? null : +(V.sledPinB - gs).toFixed(1), row: Math.round((1 - v.y) / 2 * 720), vis: !!(V.sledPin && V.sledPin.visible),
    nearTrees: anchorsNear(FOOT.x, FOOT.z, 15).filter(c => c.o.tree !== undefined).length,
    depotDist: +Math.hypot(FOOT.x - depot.x, FOOT.z - depot.z).toFixed(0) }; })())`;
const rows = []; let n = 0;
const t0 = await ev("gameClock");
await down("KeyW");
try {
  for (;;) { await sleep(500); const r = JSON.parse(await ev(S)); rows.push(r);
    if (n++ % 6 === 0) await shot(String(rows.length).padStart(3, "0") + "_d" + Math.round(r.d) + "_c" + Math.round(r.crestCam) + "_tr" + r.nearTrees);
    if (r.t - t0 > 75 || r.d < cd - 60) break; }
} finally { await up("KeyW"); }
let maxJ = 0, maxR = 0, at = null;
for (let i = 1; i < rows.length; i++) { const a = rows[i - 1], b = rows[i]; if (a.lift == null || b.lift == null) continue;
  const dt = Math.max(0.1, b.t - a.t), j = Math.abs(b.lift - a.lift) / dt, rj = Math.abs(b.row - a.row) / dt;
  if (j > maxJ) { maxJ = j; at = b; } maxR = Math.max(maxR, rj); }
fs.writeFileSync(OUT + "/rows.json", JSON.stringify(rows));
for (const r of rows.filter((_, i) => i % 4 === 0)) console.log(JSON.stringify(r));
console.log(`SUMMARY crest at ${cd.toFixed(0)} m (over ${spot.maxOver.toFixed(1)} m, ${spot.trees} tree-hits near line, depot min ${spot.minDepot} m); walked ${rows[0].d}->${rows.at(-1).d} m in ${(rows.at(-1).t - t0).toFixed(1)} game-s; max lift change ${maxJ.toFixed(1)} m/game-s at ${JSON.stringify(at)}; max foot row change ${maxR.toFixed(0)} px/game-s`);
await done();
