// The first ride of a brand-new save: where the sled spawns, what's in front of it, and how far 8 s of throttle
// gets you before anything stops you. Logs the spawn, the helsesenter, the nearest obstacles in the spawn's
// forward lane, and the ride (distance, top speed, where it ends). Run: tools/playtest/run.sh <this>
import { boot, ev, st, timed, shot, sleep, done } from "../lib.mjs";
await boot();
console.log("geom", await ev(`JSON.stringify((() => {
  const fx = Math.sin(SPAWN.yaw), fz = Math.cos(SPAWN.yaw), lane = [];
  for (let s = 2; s <= 120; s += 2) { const x = SPAWN.x + fx * s, z = SPAWN.z + fz * s;
    if (obNear(x, z, 1.6)) { lane.push(s); if (lane.length > 3) break; } }
  const hd = HOSP.built ? Math.hypot(HOSP.x - SPAWN.x, HOSP.z - SPAWN.z) : -1;
  const ha = HOSP.built ? Math.atan2(HOSP.x - SPAWN.x, HOSP.z - SPAWN.z) : 0;
  let off = ha - SPAWN.yaw; off = Math.atan2(Math.sin(off), Math.cos(off));
  return { spawn: [+SPAWN.x.toFixed(1), +SPAWN.z.toFixed(1), +SPAWN.yaw.toFixed(2)], depot: [+depot.x.toFixed(1), +depot.z.toFixed(1)],
    hosp: HOSP.built ? [+HOSP.x.toFixed(1), +HOSP.z.toFixed(1)] : null, hospDist: +hd.toFixed(1), hospOffDeg: Math.round(off * 57.3),
    laneHits: lane };
})())`));
const s0 = await st(); console.log("start", JSON.stringify(s0));
await shot("00_start");
const ride = await timed("KeyW", 12);
const e = ride.at(-1).sled, top = Math.max(...ride.map(r => r.sled.mph));
console.log(`ride 12 s: ${Math.hypot(e.x - s0.sled.x, e.z - s0.sled.z).toFixed(1)} m, top ${top} mph, end ${e.mph} mph at ${e.x},${e.z}`);
console.log("mph trace", ride.map(r => r.sled.mph).join(" "));
for (let i = 1; i < ride.length; i++) if (ride[i - 1].sled.mph - ride[i].sled.mph > 15) {
  const p = ride[i].sled;
  console.log(`HIT at t=${ride[i].t} ${ride[i - 1].sled.mph}→${p.mph} mph at ${p.x},${p.z}`, await ev(`JSON.stringify((() => { const out = [];
    for (const a of obGrid.values()) for (const o of a) { const d = Math.hypot(o.x - ${p.x}, o.z - ${p.z}); if (d < 8) out.push({ x: +o.x.toFixed(1), z: +o.z.toFixed(1), r: o.r, d: +d.toFixed(1), k: o.kind || o.type || '' }); }
    return out.sort((a, b) => a.d - b.d).slice(0, 4); })())`));
}
await shot("01_after8s");
await done();
