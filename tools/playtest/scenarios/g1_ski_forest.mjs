// G1 (follow-up to reports 0072/0074: "skiing has its own obstacle code, unchanged" left for the playtester).
// skiStep uses the plain radial footBlock snap-to-circle (no tangent sidestep, no obSide latch like footStep got
// in v141/v142), so it was never checked in a forest stand. Same stands/headings as g1_forest.mjs (densest flat
// tree stands, 3 headings each, 15 m out through the centre), but on cross-country skis (Turski) holding W only.
// Logs by gameClock: pass time, stall time (<0.3 m/s), speed collapses (sp drops >50% in one sample while F.fwd
// still held, i.e. the snap keeps re-clamping you), lateral drift off line, trees brushed within ski+0.6 m.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_ski_forest.mjs [outdir]
import { boot, ev, done, sleep, down, up, sideCam, shot, camOff } from "../lib.mjs";
await boot();
await ev("GS.storm = 0; GS.hour = 12; GS.own.xc = { id: 'tur', cond: 1 }; true");

const stands = JSON.parse(await ev(`(() => {
  const trees = []; for (const a of obGrid.values()) for (const o of a) if (o.tree !== undefined && !o.log && !o.down) trees.push(o);
  const cand = [];
  for (let k = 0; k < trees.length; k += 3) {
    const o = trees[k]; let n = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const a = obGrid.get((Math.floor((o.z + HALF) / OBC) + j) * OBW + Math.floor((o.x + HALF) / OBC) + i); if (!a) continue;
      for (const p of a) if (p.tree !== undefined && Math.hypot(p.x - o.x, p.z - o.z) < 12) n++;
    }
    if (n >= 6 && slopeAt(o.x, o.z, 10) < 0.15) cand.push({ x: o.x, z: o.z, n });
  }
  cand.sort((a, b) => b.n - a.n);
  const out = [];
  for (const c of cand) {
    if (out.length >= 3) break;
    if (out.some(s => Math.hypot(s.x - c.x, s.z - c.z) < 300)) continue;
    let wet = false; for (let a = 0; a < 6.28; a += 0.5) if (isSea(c.x + Math.sin(a) * 16, c.z + Math.cos(a) * 16) || isWater(c.x + Math.sin(a) * 16, c.z + Math.cos(a) * 16)) wet = true;
    if (wet) continue;
    out.push(c);
  }
  return JSON.stringify({ trees: trees.length, cand: cand.length, out });
})()`));
console.log("trees", stands.trees, "dense candidates", stands.cand, "stands", JSON.stringify(stands.out));

async function run(s, a, shots) {
  const ax = s.x + Math.sin(a) * 15, az = s.z + Math.cos(a) * 15;
  const yaw = Math.atan2(-Math.sin(a), -Math.cos(a));
  await ev(`(() => {
    let x = ${ax}, z = ${az};
    for (let it = 0; it < 20; it++) { const g = obNear(x, z, 0.5); if (!g) break; x += Math.cos(${a}) * 0.6; z -= Math.sin(${a}) * 0.6; }
    FOOT.on = true; FOOT.ski = true; FOOT.dig = false; FOOT.x = x; FOOT.z = z; FOOT.yaw = ${yaw};
    FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.fwd = 1; FOOT.turn = 0; FOOT.tired = 0; FOOT.grade = 0;
    P.x = FOOT.x + Math.sin(FOOT.yaw) * -5; P.z = FOOT.z + Math.cos(FOOT.yaw) * -5; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true);
    GS.warmth = 100; GS.coldWarned = false;
    if (FOOT.g) FOOT.g.visible = true; camState.init = false; return true; })()`);
  await sleep(400);
  if (shots) { await sideCam(); }
  const t0 = await ev("gameClock"); let endAlong = null, last = t0, stall = 0, pass = null, lx = null, lz = null, lastSp = null, collapses = 0, minSp = 99, shotN = 0;
  const near = new Set();
  await down("KeyW");
  try {
    for (;;) {
      await sleep(110);
      if (shots && (last - t0) >= shotN * 6) { await shot(`${shots}_t${Math.round(last - t0)}`); shotN++; }
      const q = JSON.parse(await ev(`JSON.stringify({ t: gameClock, x: FOOT.x, z: FOOT.z, sp: FOOT.sp,
        nb: (() => { const r = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const a = obGrid.get((Math.floor((FOOT.z + HALF) / OBC) + j) * OBW + Math.floor((FOOT.x + HALF) / OBC) + i); if (a) for (const o of a) if (!o.log && !o.down && Math.hypot(FOOT.x - o.x, FOOT.z - o.z) < o.r + 0.36 + 0.6) r.push(Math.round(o.x * 10) + ":" + Math.round(o.z * 10)); } return r; })() })`));
      const dt = q.t - last; last = q.t;
      if (lx !== null && dt > 0 && Math.hypot(q.x - lx, q.z - lz) / dt < 0.3) stall += dt;
      if (lastSp !== null && lastSp > 1.5 && q.sp < lastSp * 0.5) collapses++;
      lastSp = q.sp; minSp = Math.min(minSp, q.sp);
      lx = q.x; lz = q.z;
      for (const k of q.nb) near.add(k);
      const along = -((q.x - s.x) * Math.sin(a) + (q.z - s.z) * Math.cos(a));
      const lat = (q.x - s.x) * Math.cos(a) - (q.z - s.z) * Math.sin(a);
      if (along > 15) { pass = q.t - t0; break; }
      if (q.t - t0 > 40) { endAlong = along; break; }
      if (q.lat !== undefined) {}
    }
  } finally { await up("KeyW"); if (shots) { await shot(`${shots}_tEND`); await camOff(); } }
  return { stand: `${s.x.toFixed(0)},${s.z.toFixed(0)}`, n: s.n, a: +a.toFixed(2),
    pass: pass === null ? "stuck" : +pass.toFixed(2), stall: +stall.toFixed(2), collapses, minSp: +minSp.toFixed(2),
    endAlong: endAlong === null ? undefined : +endAlong.toFixed(1), trees: near.size };
}

const rows = [];
let first = true;
for (const s of stands.out) for (const a of [0.3, 2.4, 4.5]) { const r = await run(s, a, first && a === 0.3 ? "a" : undefined); if (a === 0.3) first = false; rows.push(r); console.log(JSON.stringify(r)); }
const ok = rows.filter(r => r.pass !== "stuck");
const m = k => (rows.reduce((t, r) => t + r[k], 0) / Math.max(1, rows.length)).toFixed(2);
console.log(`SUMMARY runs ${rows.length} stuck ${rows.length - ok.length} meanPass ${(ok.reduce((t, r) => t + r.pass, 0) / Math.max(1, ok.length)).toFixed(2)} meanStall ${m("stall")} maxStall ${Math.max(...rows.map(r => r.stall)).toFixed(2)} collapses ${rows.reduce((t, r) => t + r.collapses, 0)} meanTrees ${m("trees")}`);
await done();
