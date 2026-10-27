// G1/G3 follow-up to v146 tree wells (builder's own "next"): ride the sled through a dense pine stand on the
// normal chase camera (no overrides) and look at the wells as a player actually sees them -- pop-in as the near
// snow patch hands over to the far one (~40 m out, per the tracklayer skill), whether the dishes read as easier
// footing or a stumble/bump, and crash rate through the stand. Approaches 3 headings per stand from 70 m out,
// straight line (no steering help), holding W only; stills at 60/40/25/12/5 m out and one after passing through.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_treewell_ride.mjs [outdir]
import { boot, ev, shot, sleep, down, up, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 1e6; true");

const stands = JSON.parse(await ev(`(() => {
  const pines = []; for (const a of obGrid.values()) for (const o of a) if (o.pine && !o.down) pines.push(o);
  function obNearAll(x, z, R) { const r = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const a = obGrid.get((Math.floor((z + HALF) / OBC) + j) * OBW + Math.floor((x + HALF) / OBC) + i); if (a) for (const p of a) if (Math.hypot(p.x - x, p.z - z) < R) r.push(p); } return r; }
  const cand = [];
  for (let k = 0; k < pines.length; k += 3) { const o = pines[k]; const n = obNearAll(o.x, o.z, 10).filter(p => p.pine).length; if (n >= 6 && slopeAt(o.x, o.z, 10) < 0.15 && !isSea(o.x, o.z) && !isWater(o.x, o.z)) cand.push({ x: o.x, z: o.z, n }); }
  cand.sort((a, b) => b.n - a.n);
  const out = [];
  for (const c of cand) { if (out.length >= 2) break; if (out.some(s => Math.hypot(s.x - c.x, s.z - c.z) < 300)) continue; out.push(c); }
  return JSON.stringify(out);
})()`));
console.log("stands", JSON.stringify(stands));
if (!stands.length) { console.log("NO STAND FOUND"); await done(1); }

async function run(s, a, tag) {
  const D = 70;
  const ax = s.x + Math.sin(a) * D, az = s.z + Math.cos(a) * D;
  const yaw = Math.atan2(-Math.sin(a), -Math.cos(a));   // face the stand centre
  await ev(`(() => {
    FOOT.on = false; if (FOOT.g) FOOT.g.visible = false;
    P.x = ${ax}; P.z = ${az}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = ${yaw};
    recenter(P.x, P.z, true); camState.init = false; camState.yaw = ${yaw};
    return true; })()`);
  await sleep(1200);
  const t0 = await ev("gameClock");
  let shots = { 60: 0, 40: 0, 25: 0, 12: 0, 5: 0 }, crashed = false, stalledAt = null, maxMph = 0, last = { t: t0, x: ax, z: az }, stallT = 0;
  await down("KeyW");
  try {
    for (;;) {
      await sleep(250);
      const q = JSON.parse(await ev(`JSON.stringify({ t: gameClock, x: P.x, z: P.z, mph: Math.hypot(P.vx, P.vz) * 2.237, crash: !!CRASH.on })`));
      const along = -((q.x - s.x) * Math.sin(a) + (q.z - s.z) * Math.cos(a));
      const distToCentre = Math.hypot(q.x - s.x, q.z - s.z);
      maxMph = Math.max(maxMph, q.mph);
      const dt = q.t - last.t; if (dt > 0 && Math.hypot(q.x - last.x, q.z - last.z) / dt < 0.4) stallT += dt; else stallT = 0;
      last = { t: q.t, x: q.x, z: q.z };
      if (q.crash) { crashed = true; break; }
      if (stallT > 4 && stalledAt === null) stalledAt = +along.toFixed(1);
      for (const d of [60, 40, 25, 12, 5]) if (!shots[d] && distToCentre <= d) { shots[d] = 1; await shot(`${tag}_${d}m`); }
      if (along > 25 || q.t - t0 > 35) break;
    }
  } finally { await up("KeyW"); }
  if (!crashed) { await sleep(600); await shot(`${tag}_past`); }
  return { stand: `${s.x.toFixed(0)},${s.z.toFixed(0)}`, n: s.n, a: +a.toFixed(2), gameS: +(last.t - t0).toFixed(1), crashed, stalledAt, maxMph: Math.round(maxMph), shots: Object.keys(shots).filter(k => shots[k]).join(",") };
}

const rows = [];
let i = 0;
for (const s of stands) for (const a of [0.2, 3.0]) {
  const r = await run(s, a, `s${i++}`);
  rows.push(r); console.log(JSON.stringify(r));
  await ev(`(() => { if (CRASH.on) crashGetUp(); return true; })()`);
}
console.log(`SUMMARY runs ${rows.length} crashed ${rows.filter(r => r.crashed).length} stalled ${rows.filter(r => r.stalledAt !== null).length} maxMph ${Math.max(...rows.map(r => r.maxMph))}`);
await done();
