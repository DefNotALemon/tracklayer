// G1 backlog: verify town/quay walking since v58 (pack~=1 plowed ground -> should be 2.9 m/s per footStep's
// `lerp(0.57, 1, pack) * 2.9` target) and check nothing snags on building corners or the quay edge.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_town_quay.mjs
import { boot, ev, st, shot, sideCam, camOff, done, sleep, down, up } from "../lib.mjs";
await boot();

function setFoot(x, z, yawExpr) {
  return ev(`(() => {
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = ${x}; FOOT.z = ${z};
    FOOT.yaw = ${yawExpr}; FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0;
    FOOT.tired = 0; FOOT.strain = 0.6; FOOT.step = 0; FOOT.half = 0; if (FOOT.g) FOOT.g.visible = true;
    camState.init = false; true;
  })()`);
}
async function walkTo(dist, capSecs) {
  const s0 = JSON.parse(await ev("JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, d: depthAt(Math.round((FOOT.x + HALF) / CELL), Math.round((FOOT.z + HALF) / CELL)), f: freshAt(Math.round((FOOT.x + HALF) / CELL), Math.round((FOOT.z + HALF) / CELL))})"));
  await down("KeyW"); let s;
  try { for (;;) { await sleep(150); s = JSON.parse(await ev("JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, tired: FOOT.tired})")); if (Math.hypot(s.x - s0.x, s.z - s0.z) >= dist || s.t - s0.t > capSecs) break; } }
  finally { await up("KeyW"); }
  const m = Math.hypot(s.x - s0.x, s.z - s0.z), dt = s.t - s0.t;
  const pack = s0.f > 0.02 ? Math.max(0, Math.min(1, 1 - s0.d / s0.f)) : 1;
  return { m: +m.toFixed(1), secs: +dt.toFixed(2), avg: +(m / dt).toFixed(2), tired: +s.tired.toFixed(2), depth: +s0.d.toFixed(2), pack: +pack.toFixed(2) };
}

// 1) Depot/quay core (seed -1300,-385), the most-plowed spot in the game.
await setFoot(-1300, -385, "0");
await sleep(300);
await sideCam(); await shot("00_quay_core"); await camOff();
const core = await walkTo(20, 25);
console.log(`quay core 20 m: ${core.secs}s, avg ${core.avg} m/s, pack ${core.pack}, depth ${core.depth}`);

// 2) Shore road a bit further out from the depot seed, still "town".
await setFoot(-1250, -420, "1.0");
await sleep(300);
const road = await walkTo(20, 25);
console.log(`shore road 20 m: ${road.secs}s, avg ${road.avg} m/s, pack ${road.pack}, depth ${road.depth}`);

// 3) Find the nearest obstacle (building/tree) to the depot and walk straight into it, measure stop distance.
const ob = await ev(`(() => {
  const cx = depot.seed[0], cz = depot.seed[1];
  const gi = Math.floor((cx + HALF) / OBC), gj = Math.floor((cz + HALF) / OBC);
  let best = null, bd = 1e9;
  for (let j = gj - 10; j <= gj + 10; j++) for (let i = gi - 10; i <= gi + 10; i++) {
    const a = obGrid.get(j * OBW + i); if (!a) continue;
    for (const o of a) { const d = Math.hypot(o.x - cx, o.z - cz); if (d < bd && d > 5) { bd = d; best = { x: +o.x.toFixed(1), z: +o.z.toFixed(1), r: o.r, log: !!o.log }; } }
  }
  return best;
})()`);
console.log("nearest obstacle to quay:", JSON.stringify(ob));
if (ob && !ob.log) {
  const yaw = `Math.atan2(${ob.x} - FOOT.x, ${ob.z} - FOOT.z)`;
  const dx = ob.x - (-1300), dz = ob.z - (-385), dist = Math.hypot(dx, dz);
  const startBack = Math.max(0, dist - 6);
  const sx = -1300 + dx / dist * startBack, sz = -385 + dz / dist * startBack;
  await setFoot(+sx.toFixed(1), +sz.toFixed(1), yaw);
  await sleep(200);
  await sideCam(`[${ob.x}, 1, ${ob.z}]`); await shot("01_corner_setup"); await camOff();
  await down("KeyW"); await sleep(5000); await up("KeyW");
  const after = JSON.parse(await ev(`JSON.stringify({x: FOOT.x, z: FOOT.z})`));
  const stopDist = Math.hypot(after.x - ob.x, after.z - ob.z);
  console.log(`walked at obstacle r=${ob.r}: stopped ${stopDist.toFixed(2)} m from center (expect ~${(ob.r + 0.36).toFixed(2)})`);
  await sideCam(`[${ob.x}, 1, ${ob.z}]`); await shot("02_corner_after"); await camOff();
} else {
  console.log("no non-log obstacle found near the quay within range");
}

// 4) Quay edge: walk straight toward the water from the depot seed, confirm a clean stop, not a snag/jitter.
await setFoot(-1300, -385, `Math.atan2(0 - FOOT.x, (${(-385)}) - FOOT.z)`);
const toSea = await ev(`(() => {
  let best = null, bd = 1e9;
  for (let a = 0; a < 6.28; a += 0.2) { const dx = Math.cos(a), dz = Math.sin(a);
    for (let r = 5; r < 200; r += 5) { const x = -1300 + dx * r, z = -385 + dz * r; if (isSea(x, z)) { if (r < bd) { bd = r; best = Math.atan2(dx, dz); } break; } } }
  return best;
})()`);
if (toSea != null) {
  await setFoot(-1300, -385, `${toSea}`);
  await sleep(200);
  await down("KeyW"); await sleep(6000); await up("KeyW");
  const edge = JSON.parse(await ev(`JSON.stringify({x: FOOT.x, z: FOOT.z, sp: FOOT.sp})`));
  console.log(`quay edge: ended at (${edge.x.toFixed(1)},${edge.z.toFixed(1)}) sp=${edge.sp.toFixed(2)} isSea=${await ev(`isSea(${edge.x}, ${edge.z})`)}`);
  await sideCam(); await shot("03_quay_edge"); await camOff();
} else {
  console.log("no nearby sea found from the quay seed within 200 m");
}

await done();
