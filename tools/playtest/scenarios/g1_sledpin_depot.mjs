// G1 quick follow-up: is the lifted sled-column pin ever near/behind the depot beacon pole itself (not a
// crest test — just: walk from the sled toward the depot with a load so the beacon is lit, check sledPin
// position/visibility close to the beacon).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_sledpin_depot.mjs
import fs from "node:fs";
import { boot, ev, shot, park, tap, down, up, sleep, done, OUT } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = 11; true");
// park the sled a good distance from the depot so the walk is long enough to see the column lift
await ev(`(() => { P.x = depot.x + 260; P.z = depot.z + 40; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0; recenter(P.x, P.z, true); return true; })()`);
await sleep(500);
await tap("KeyQ"); await sleep(2500);
if (!JSON.parse(await ev("JSON.stringify(FOOT.on)"))) { console.log("FAIL: not on foot"); await done(1); }
await ev(`(() => { FOOT.x = depot.x + 8; FOOT.z = depot.z + 8; FOOT.yaw = Math.atan2(P.x - FOOT.x, P.z - FOOT.z); camState.init = false; return true; })()`);
await sleep(2000);
console.log("depot:", JSON.stringify(await ev("JSON.stringify({x: depot.x, z: depot.z, beacon: !!depot.beacon})")));
await ev("if (depot.beacon) depot.beacon.visible = true; true"); // force the beacon lit for this check
const S = `JSON.stringify((() => { const gs = groundAt(P.x, P.z), d = Math.hypot(P.x - FOOT.x, P.z - FOOT.z);
  const v = new THREE.Vector3(P.x, V.sledPinB === undefined ? gs : V.sledPinB, P.z).project(camera);
  const bv = depot.beacon ? new THREE.Vector3(depot.beacon.position.x, depot.beacon.position.y, depot.beacon.position.z).project(camera) : null;
  return { t: +gameClock.toFixed(1), d: +d.toFixed(1), lift: V.sledPinB === undefined ? null : +(V.sledPinB - gs).toFixed(1),
    pinRow: Math.round((1 - v.y) / 2 * 720), pinCol: Math.round((1 + v.x) / 2 * 1280),
    beaconRow: bv ? Math.round((1 - bv.y) / 2 * 720) : null, beaconCol: bv ? Math.round((1 + bv.x) / 2 * 1280) : null,
    vis: !!(V.sledPin && V.sledPin.visible) }; })())`;
const rows = []; let n = 0;
const t0 = await ev("gameClock");
await down("KeyW");
try {
  for (;;) { await sleep(500); const r = JSON.parse(await ev(S)); rows.push(r);
    if (n++ % 4 === 0) await shot(String(rows.length).padStart(3, "0") + "_d" + Math.round(r.d));
    if (r.t - t0 > 45 || r.d < 10) break; }
} finally { await up("KeyW"); }
fs.writeFileSync(OUT + "/rows.json", JSON.stringify(rows));
for (const r of rows.filter((_, i) => i % 2 === 0)) console.log(JSON.stringify(r));
console.log(`SUMMARY walked ${rows[0]?.d}->${rows.at(-1)?.d} m toward depot in ${(rows.at(-1).t - t0).toFixed(1)} game-s`);
await done();
