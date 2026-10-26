// G1 slope on foot: on an inland hillside (grade ~0.15-0.35, away from the sea and obstacles), walk 8 game-s
// uphill, downhill and across the slope (contour) on three parallel lines of fresh powder, so depth is about the
// same on each. Reports avg speed, start depth and the grade actually walked. Before the slope term, up/down/
// across all came out the same (depth only). Run: tools/playtest/run.sh tools/playtest/scenarios/g1_slope.mjs
import { boot, ev, shot, sideCam, camOff, sleep, down, up, tap, done } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; true");
const spot = JSON.parse(await ev(`JSON.stringify((() => {
  const cx = P.x, cz = P.z; let best = null, bs = 0;
  for (let r = 150; r < 2400; r += 25) for (let a = 0; a < 6.28; a += 0.25) {
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (isSea(x, z) || (typeof isWater === "function" && isWater(x, z)) || obNear(x, z, 25)) continue;
    let wet = false; for (let k = 0; k < 8 && !wet; k++) { const b = k * 0.785; if (isSea(x + Math.cos(b) * 80, z + Math.sin(b) * 80)) wet = true; } if (wet) continue;
    const s = slopeAt(x, z, 10), s2 = slopeAt(x, z, 4);
    if (s > 0.15 && s < 0.35 && Math.abs(s - s2) < 0.05) { const sc = 1 - Math.abs(s - 0.25); if (sc > bs) { bs = sc; best = { x: Math.round(x), z: Math.round(z), sl: +s.toFixed(3) }; } }
  }
  if (!best) return null;
  const e = 6, gx = groundAt(best.x + e, best.z) - groundAt(best.x - e, best.z), gz = groundAt(best.x, best.z + e) - groundAt(best.x, best.z - e);
  best.upYaw = Math.atan2(gx, gz); return best;
})())`));
console.log("spot", JSON.stringify(spot));
if (!spot) { console.log("FAIL: no hillside"); await done(1); }
// put the sled well away so it is not in the way
await ev(`P.x = ${spot.x} + 60; P.z = ${spot.z} + 60; P.y = surf(P.x, P.z) + 0.5; true`);
await sleep(800); await tap("KeyQ"); await sleep(2500);
function setFoot(x, z, yaw) {
  return ev(`(() => { FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = ${x}; FOOT.z = ${z}; FOOT.yaw = ${yaw};
    FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.tired = 0; FOOT.strain = 0.6; FOOT.grade = 0;
    if (FOOT.g) FOOT.g.visible = true; camState.init = false; return true; })()`);
}
async function walk(label, x, z, yaw, secs = 8) {
  await setFoot(x, z, yaw); await sleep(300);
  const s0 = JSON.parse(await ev(`JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, g: groundAt(FOOT.x, FOOT.z), d: depthAt(Math.round((FOOT.x + HALF) / CELL), Math.round((FOOT.z + HALF) / CELL))})`));
  await down("KeyW"); let s;
  try { for (;;) { await sleep(150); s = JSON.parse(await ev(`JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, g: groundAt(FOOT.x, FOOT.z), tired: FOOT.tired, sp: FOOT.sp})`)); if (s.t - s0.t >= secs) break; } }
  finally { await up("KeyW"); }
  const m = Math.hypot(s.x - s0.x, s.z - s0.z), dt = s.t - s0.t;
  const r = { m: +m.toFixed(1), avg: +(m / dt).toFixed(2), end: +s.sp.toFixed(2), grade: +((s.g - s0.g) / Math.max(m, 0.1)).toFixed(3), depth: +s0.d.toFixed(2), tired: +s.tired.toFixed(2) };
  console.log(`${label}: ${r.m} m in ${dt.toFixed(1)} s -> avg ${r.avg} m/s, end ${r.end}, grade ${r.grade}, depth ${r.depth}, tired ${r.tired}`);
  return r;
}
const Y = spot.upYaw, fx = Math.sin(Y), fz = Math.cos(Y), lx = Math.cos(Y), lz = -Math.sin(Y);
// three parallel lines 4 m apart, centred on the spot, each starting 7 m off its middle
const U = await walk("UPHILL", spot.x - fx * 7, spot.z - fz * 7, Y);
await sideCam(); await shot("01_uphill"); await camOff();
const D = await walk("DOWNHILL", spot.x + lx * 4 + fx * 7, spot.z + lz * 4 + fz * 7, Y + Math.PI);
await sideCam(); await shot("02_downhill"); await camOff();
const C = await walk("ACROSS", spot.x - lx * 4 - lx * 7 * 0, spot.z - lz * 4, Y + Math.PI / 2);
await shot("03_across_chase");
console.log(`ratio up/across ${(U.avg / C.avg).toFixed(2)}  down/across ${(D.avg / C.avg).toFixed(2)}`);
await done();
