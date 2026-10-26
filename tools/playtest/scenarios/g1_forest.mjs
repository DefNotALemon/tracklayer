// G1 (follow-up to v142 round-obstacle sidestep): walking straight through a forest stand. Picks the densest flat
// tree stands on the map (most trees within 12 m), and for each walks 3 headings through the centre from 15 m out,
// holding W only (no steering), until 15 m past the centre or 40 game-s. Logs by gameClock: pass time, stall time
// (moving < 0.3 m/s), sidestep side flips (F.obSide sign changes: dithering between two trees), lateral drift off the
// line, and trees passed within body+0.6 m. Reference: the same 30 m in open powder ~19 s.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_forest.mjs [outdir]
import { boot, ev, done, sleep, down, up } from "../lib.mjs";
await boot();
await ev("GS.storm = 0; GS.hour = 12; true");

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
    if (out.length >= 4) break;
    if (out.some(s => Math.hypot(s.x - c.x, s.z - c.z) < 300)) continue;
    let wet = false; for (let a = 0; a < 6.28; a += 0.5) if (isSea(c.x + Math.sin(a) * 16, c.z + Math.cos(a) * 16) || isWater(c.x + Math.sin(a) * 16, c.z + Math.cos(a) * 16)) wet = true;
    if (wet) continue;
    out.push(c);
  }
  return JSON.stringify({ trees: trees.length, cand: cand.length, out });
})()`));
console.log("trees", stands.trees, "dense candidates", stands.cand, "stands", JSON.stringify(stands.out));

async function run(s, a) {
  const ax = s.x + Math.sin(a) * 15, az = s.z + Math.cos(a) * 15;
  const yaw = Math.atan2(-Math.sin(a), -Math.cos(a));
  const ok = await ev(`(() => {
    // nudge the start out of any trunk
    let x = ${ax}, z = ${az};
    for (let it = 0; it < 20; it++) { const g = obNear(x, z, 0.5); if (!g) break; x += Math.cos(${a}) * 0.6; z -= Math.sin(${a}) * 0.6; }
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = x; FOOT.z = z; FOOT.yaw = ${yaw};
    P.x = FOOT.x + Math.sin(FOOT.yaw) * -5; P.z = FOOT.z + Math.cos(FOOT.yaw) * -5; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true);
    FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.tired = 0; FOOT.wind = 0; FOOT.blown = false;
    FOOT.obSide = 0; FOOT.obT = 0; GS.warmth = 100; GS.coldWarned = false;   // 12 cold walks back to back black you out otherwise
    if (FOOT.g) FOOT.g.visible = true; camState.init = false; return true; })()`);
  await sleep(400);
  const t0 = await ev("gameClock"); let endAlong = null, last = t0, stall = 0, flips = 0, lastSide = 0, maxLat = 0, pass = null, lx = null, lz = null;
  const near = new Set();
  await down("KeyW");
  try {
    for (;;) {
      await sleep(110);
      const q = JSON.parse(await ev(`JSON.stringify({ t: gameClock, x: FOOT.x, z: FOOT.z, side: FOOT.obSide || 0,
        nb: (() => { const r = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const a = obGrid.get((Math.floor((FOOT.z + HALF) / OBC) + j) * OBW + Math.floor((FOOT.x + HALF) / OBC) + i); if (a) for (const o of a) if (!o.log && !o.down && Math.hypot(FOOT.x - o.x, FOOT.z - o.z) < o.r + 0.36 + 0.6) r.push(Math.round(o.x * 10) + ":" + Math.round(o.z * 10)); } return r; })() })`));
      const dt = q.t - last; last = q.t;
      if (lx !== null && dt > 0 && Math.hypot(q.x - lx, q.z - lz) / dt < 0.3) stall += dt;
      lx = q.x; lz = q.z;
      if (q.side && lastSide && q.side !== lastSide) flips++;
      if (q.side) lastSide = q.side;
      for (const k of q.nb) near.add(k);
      const along = -((q.x - s.x) * Math.sin(a) + (q.z - s.z) * Math.cos(a));
      const lat = (q.x - s.x) * Math.cos(a) - (q.z - s.z) * Math.sin(a);
      maxLat = Math.max(maxLat, Math.abs(lat));
      if (along > 15) { pass = q.t - t0; break; }
      if (q.t - t0 > 40) { endAlong = along; break; }
    }
  } finally { await up("KeyW"); }
  return { stand: `${s.x.toFixed(0)},${s.z.toFixed(0)}`, n: s.n, a: +a.toFixed(2), pass: pass === null ? "stuck" : +pass.toFixed(2),
    stall: +stall.toFixed(2), endAlong: endAlong === null ? undefined : +endAlong.toFixed(1), diag: endAlong === null ? undefined : await ev(`JSON.stringify({ sp: FOOT.sp, fwd: FOOT.fwd, dig: FOOT.dig, on: FOOT.on, sea: isSea(FOOT.x, FOOT.z), d: surf(FOOT.x, FOOT.z).d, slope: slopeAt(FOOT.x, FOOT.z, 2), tired: FOOT.tired, mnt: MNT.on })`), flips, trees: near.size, maxLat: +maxLat.toFixed(2) };
}

const rows = [];
for (const s of stands.out) for (const a of [0.3, 2.4, 4.5]) { const r = await run(s, a); rows.push(r); console.log(JSON.stringify(r)); }
const ok = rows.filter(r => r.pass !== "stuck");
const m = k => (rows.reduce((t, r) => t + r[k], 0) / Math.max(1, rows.length)).toFixed(2);
console.log(`SUMMARY runs ${rows.length} stuck ${rows.length - ok.length} meanPass ${(ok.reduce((t, r) => t + r.pass, 0) / Math.max(1, ok.length)).toFixed(2)} maxPass ${Math.max(0, ...ok.map(r => r.pass)).toFixed(2)} meanStall ${m("stall")} maxStall ${Math.max(...rows.map(r => r.stall)).toFixed(2)} flips ${rows.reduce((t, r) => t + r.flips, 0)} meanTrees ${m("trees")} meanMaxLat ${m("maxLat")}`);
await done();
