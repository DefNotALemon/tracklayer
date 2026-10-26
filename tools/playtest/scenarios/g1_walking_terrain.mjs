// G1 walking: does terrain (slope) and obstacles affect on-foot pace/feel the way powder depth does?
// Also measures turn-on-the-spot rate. Teleports FOOT directly (no need to ride off the sled each time).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_walking_terrain.mjs
import { boot, ev, st, timed, shot, sideCam, camOff, done, sleep } from "../lib.mjs";
await boot();

// Find a steep, dry spot and a flat, dry spot near spawn.
const spots = await ev(`(() => {
  const cx = P.x, cz = P.z; let steep = null, flat = null, bs = 0, bf = 1e9;
  for (let r = 40; r < 900; r += 20) for (let a = 0; a < 6.28; a += 0.4) {
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (isSea(x, z) || (typeof isWater === "function" && isWater(x, z))) continue;
    const sl = slopeAt(x, z, 6);
    if (sl > bs && !obNear(x, z, 10)) { bs = sl; steep = { x: Math.round(x), z: Math.round(z), sl: +sl.toFixed(2) }; }
    if (sl < bf && !obNear(x, z, 10) && sl < 0.03) { bf = sl; flat = { x: Math.round(x), z: Math.round(z), sl: +sl.toFixed(3) }; }
  }
  return { steep, flat };
})()`);
console.log("spots", JSON.stringify(spots));

function setFoot(x, z, yawExpr) {
  return ev(`(() => {
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = ${x}; FOOT.z = ${z};
    FOOT.yaw = ${yawExpr}; FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0;
    FOOT.tired = 0; FOOT.strain = 0.6; FOOT.step = 0; FOOT.half = 0; if (FOOT.g) FOOT.g.visible = true;
    camState.init = false; true;
  })()`);
}
function faceSlopeUp(x, z) { return `(() => { const e=6; const gx = groundAt(${x}+e,${z}) - groundAt(${x}-e,${z}), gz = groundAt(${x},${z}+e) - groundAt(${x},${z}-e); return Math.atan2(gx, gz); })()`; }

// --- Slope: uphill ---
if (spots.steep) {
  const { x, z, sl } = spots.steep;
  await setFoot(x, z, faceSlopeUp(x, z));
  await sleep(200);
  await sideCam(); await shot("00_slope_setup"); await camOff();
  const up = await timed("KeyW", 6);
  const a = up[0].foot, b = up.at(-1).foot, dt = up.at(-1).t - up[0].t;
  console.log(`slope ${sl} UPHILL speed: ${(Math.hypot(b.x - a.x, b.z - a.z) / dt).toFixed(2)} m/s over ${dt.toFixed(1)}s, tired ${b.tired}`);
  // face back downhill from where we ended up
  await ev("FOOT.yaw += Math.PI; FOOT.tired = 0; FOOT.strain = 0.6; true");
  await sleep(200);
  const down = await timed("KeyW", 6);
  const c = down[0].foot, d = down.at(-1).foot, dt2 = down.at(-1).t - down[0].t;
  console.log(`slope ${sl} DOWNHILL speed: ${(Math.hypot(d.x - c.x, d.z - c.z) / dt2).toFixed(2)} m/s over ${dt2.toFixed(1)}s, tired ${d.tired}`);
} else console.log("no steep spot found");

// --- Flat control, same method, for apples-to-apples ---
if (spots.flat) {
  const { x, z } = spots.flat;
  await setFoot(x, z, "0");
  await sleep(200);
  const flatW = await timed("KeyW", 6);
  const e = flatW[0].foot, f = flatW.at(-1).foot, dt3 = flatW.at(-1).t - flatW[0].t;
  console.log(`FLAT control speed: ${(Math.hypot(f.x - e.x, f.z - e.z) / dt3).toFixed(2)} m/s over ${dt3.toFixed(1)}s, tired ${f.tired}`);
}

// --- Obstacle snag: find a tree/rock near spawn and walk straight at it ---
const ob = await ev(`(() => {
  const cx = P.x, cz = P.z; let best = null, bd = 1e9;
  for (const [key, arr] of obGrid) for (const o of arr) {
    if (o.log || o.down) continue;
    const d = Math.hypot(o.x - cx, o.z - cz);
    if (d < bd && d > 20 && !isSea(o.x, o.z)) { bd = d; best = { x: +o.x.toFixed(1), z: +o.z.toFixed(1), r: +o.r.toFixed(2) }; }
  }
  return best;
})()`);
console.log("nearest obstacle", JSON.stringify(ob));
if (ob) {
  // stand 3m short of the obstacle, facing it, and walk straight at/past it
  const yaw = await ev(`Math.atan2(${ob.x} - P.x, ${ob.z} - P.z)`);
  const dist = 3 + ob.r;
  const sx = ob.x - Math.sin(yaw) * dist, sz = ob.z - Math.cos(yaw) * dist;
  await setFoot(sx, sz, String(yaw));
  await sleep(200);
  await sideCam(`[${ob.x}, surf(${ob.x},${ob.z}), ${ob.z}]`, 4, 2.2); await shot("01_obstacle_setup"); await camOff();
  const snag = await timed("KeyW", 5);
  const g = snag[0].foot, h = snag.at(-1).foot;
  console.log(`obstacle approach: start (${g.x},${g.z}) end (${h.x},${h.z}), target obstacle (${ob.x},${ob.z}) r=${ob.r}`);
  await shot("02_obstacle_after");
}

// --- Turn on the spot rate ---
await setFoot(await ev("P.x"), await ev("P.z"), "0");
await sleep(200);
const t0yaw = await ev("FOOT.yaw"), t0 = await ev("gameClock");
await timed("KeyD", 2, async () => ({ yaw: await ev("FOOT.yaw"), t: await ev("gameClock") }));
const t1yaw = await ev("FOOT.yaw"), t1 = await ev("gameClock");
console.log(`turn-on-spot rate: ${(Math.abs(t1yaw - t0yaw) / (t1 - t0)).toFixed(2)} rad/s over ${(t1 - t0).toFixed(1)}s`);

await done();
