// G2 fell gate in physics terms: can a Summit actually haul a 500 kg flatbed load up a fell-grade slope,
// or does the Apex-only insurance rule track a real physical wall? Finds a steep hillside (grade 0.3-0.45,
// like Gartefjellet's 433 m/1.0 km climb), fits a flatbed + 500 kg cargo (TOW.mass), holds W for 10 game-s
// up the slope on Summit then Apex, measures climb rate and whether BOG (bogging/traction) ever engages.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_fell_tow.mjs
import { boot, ev, shot, sideCam, camOff, sleep, down, up, done } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; GS.cash = 50000; true");
const spot = JSON.parse(await ev(`JSON.stringify((() => {
  const cx = P.x, cz = P.z; let best = null, bs = 0;
  for (let r = 150; r < 2400; r += 25) for (let a = 0; a < 6.28; a += 0.25) {
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (isSea(x, z) || (typeof isWater === "function" && isWater(x, z)) || obNear(x, z, 25)) continue;
    const s = slopeAt(x, z, 10), s2 = slopeAt(x, z, 4);
    if (s > 0.3 && s < 0.45 && Math.abs(s - s2) < 0.08) { const sc = 1 - Math.abs(s - 0.38); if (sc > bs) { bs = sc; best = { x: Math.round(x), z: Math.round(z), sl: +s.toFixed(3) }; } }
  }
  if (!best) return null;
  const e = 6, gx = groundAt(best.x + e, best.z) - groundAt(best.x - e, best.z), gz = groundAt(best.x, best.z + e) - groundAt(best.x, best.z - e);
  best.upYaw = Math.atan2(gx, gz); return best;
})())`));
console.log("spot", JSON.stringify(spot));
if (!spot) { console.log("FAIL: no fell-grade hillside found"); await done(1); }
async function tow(id) {
  await ev(`(() => { GS.own.sleds = SLEDS.map(s=>s.id); GS.own.sled = "${id}"; GS.lic.freight = true;
    GS.own.partsOwned["hitch:flatbed"] = true; GS.own.parts.hitch = "flatbed"; restat(); applyLoadout();
    const Y = ${spot.upYaw}; P.x = ${spot.x} - Math.sin(Y)*8; P.z = ${spot.z} - Math.cos(Y)*8; P.y = surf(P.x,P.z)+0.5;
    P.yaw = Y; P.vx = P.vz = P.vy = 0; camState.init = false; recenter(P.x, P.z, true);
    TOW.kind = "flatbed"; TOW.mass = 125 + 500; return true; })()`);
  await sleep(600);
  const s0 = JSON.parse(await ev(`JSON.stringify({x:P.x, z:P.z, t:gameClock, g:groundAt(P.x,P.z)})`));
  await down("KeyW");
  let s, bogSeen = false, minSpd = 99;
  try {
    for (;;) {
      await sleep(250);
      s = JSON.parse(await ev(`JSON.stringify({x:P.x,z:P.z,t:gameClock,g:groundAt(P.x,P.z),spd:Math.hypot(P.vx||0,P.vz||0),bog: !!(BOG && BOG.on)})`));
      if (s.bog) bogSeen = true; if (s.spd < minSpd) minSpd = s.spd;
      if (s.t - s0.t >= 10) break;
    }
  } finally { await up("KeyW"); }
  const m = Math.hypot(s.x - s0.x, s.z - s0.z), dt = s.t - s0.t, climb = s.g - s0.g;
  const r = { id, m: +m.toFixed(1), dt: +dt.toFixed(1), avgMps: +(m / dt).toFixed(2), climb: +climb.toFixed(1), endMph: +(s.spd * 2.237).toFixed(1), minMph: +(minSpd * 2.237).toFixed(1), bogSeen };
  console.log(`${id}: ${r.m} m in ${r.dt} s -> ${r.avgMps} m/s, climbed ${r.climb} m, end ${r.endMph} mph, min ${r.minMph} mph, bog=${r.bogSeen}`);
  return r;
}
const S = await tow("summit");
await sideCam(undefined, 3.2, 2.1); await shot("01_summit_towing"); await camOff();
const A = await tow("apex");
await sideCam(undefined, 3.2, 2.1); await shot("02_apex_towing"); await camOff();
console.log(`ratio apex/summit climb-rate: ${(A.climb / A.dt / (S.climb / S.dt || 0.001)).toFixed(2)}, speed: ${(A.avgMps / S.avgMps).toFixed(2)}`);
await done();
