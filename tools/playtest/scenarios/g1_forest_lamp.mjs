// G1 follow-up to v142 round-obstacle sidestep (report 0072 F1, backlog item 1): the lone-obstacle test
// (g1_obround.mjs) only ever faced ONE disc at a time. Two things it never covered:
//   1. A forest STAND: two trunks close enough together that sidestepping one may dither or walk you
//      into the other.
//   2. Lamp posts beside a lane/building (excluded from g1_obround's "nothing else within 9 m" filter,
//      so v142's fix was never exercised on them at all).
// For each case: walk straight at the gap from 8 m out (and once 0.3 m off-centre), track FOOT every
// 120 ms wall-time, record hug time (dist to EITHER target < r+0.6), min distance to each target, a
// "dither" count (lateral-offset direction reversals > 0.08 m, i.e. zig-zag), and pass/stuck by gameClock.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_forest_lamp.mjs [outdir]
import { boot, ev, done, sleep, down, up } from "../lib.mjs";
await boot();
await ev("GS.storm = 0; GS.hour = 12; true");

const data = JSON.parse(await ev(`(() => {
  const all = []; for (const a of obGrid.values()) for (const o of a) all.push(o);
  const trees = all.filter(o => o.tree !== undefined && !o.log);
  // forest stands: trunk pairs 1.0-3.0 m apart (gap tight enough to matter), on flat dry ground
  const clusters = [];
  for (let i = 0; i < trees.length && clusters.length < 3; i++) {
    const t1 = trees[i];
    for (let j = i + 1; j < trees.length; j++) {
      const t2 = trees[j], d = Math.hypot(t1.x - t2.x, t1.z - t2.z);
      const gap = d - t1.r - t2.r;
      if (gap < 0.3 || gap > 2.2) continue;
      const mx = (t1.x + t2.x) / 2, mz = (t1.z + t2.z) / 2;
      if (slopeAt(mx, mz, 8) > 0.15 || isSea(mx, mz) || isWater(mx, mz)) continue;
      // approach axis: perpendicular to the line joining the two trunks, so the walker faces the gap
      const dx = t2.x - t1.x, dz = t2.z - t1.z, len = Math.hypot(dx, dz);
      const a = Math.atan2(dx / len, dz / len) + Math.PI / 2;
      if (isSea(mx - Math.sin(a) * 8, mz - Math.cos(a) * 8)) continue;
      clusters.push({ kind: "stand gap" + gap.toFixed(2), x: mx, z: mz, r: Math.max(t1.r, t2.r), a, t1: { x: t1.x, z: t1.z, r: t1.r }, t2: { x: t2.x, z: t2.z, r: t2.r } });
      break;
    }
  }
  // real lamp posts: r 0.3, no tree/log/ax tag, top 1e9 (K.lamp's addOb), not filtered for isolation
  // (lampPools.at is a drained per-site buffer, usually empty by the time we probe; obGrid keeps them)
  const lampCand = all.filter(o => o.r === 0.3 && o.tree === undefined && !o.log && o.ax === undefined && o.top === 1e9)
    .map(o => ({ o, d: Math.hypot(o.x - P.x, o.z - P.z) })).sort((a, b) => a.d - b.d);
  const lamps = [];
  for (const { o } of lampCand) {
    if (lamps.length >= 3) break;
    const { x, z } = o;
    if (slopeAt(x, z, 8) > 0.15 || isSea(x, z) || isWater(x, z)) continue;
    const a = 0.9;
    if (isSea(x - Math.sin(a) * 8, z - Math.cos(a) * 8)) continue;
    lamps.push({ kind: "lamp", x, z, r: 0.3, a, t1: { x, z, r: 0.3 }, t2: null });
  }
  return JSON.stringify({ clusters, lamps });
})()`));
console.log("clusters", data.clusters.length, data.clusters.map(c => c.kind), "lamps", data.lamps.length);

async function run(o, lat) {
  const ax = o.x + Math.sin(o.a) * 8 + Math.cos(o.a) * lat, az = o.z + Math.cos(o.a) * 8 - Math.sin(o.a) * lat;
  const yaw = Math.atan2(-Math.sin(o.a), -Math.cos(o.a));
  await ev(`(() => {
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = ${ax}; FOOT.z = ${az}; FOOT.yaw = ${yaw};
    P.x = FOOT.x + Math.sin(FOOT.yaw) * -5; P.z = FOOT.z + Math.cos(FOOT.yaw) * -5; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true);
    FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.tired = 0; FOOT.wind = 0; FOOT.blown = false;
    if (FOOT.g) FOOT.g.visible = true; camState.init = false; true; })()`);
  await sleep(400);
  const t0 = await ev("gameClock");
  let near = 0, last = t0, pass = null, minD1 = 99, minD2 = 99, dither = 0, lastLat = 0, lastSign = 0;
  await down("KeyW");
  try {
    for (;;) {
      await sleep(120);
      const s = JSON.parse(await ev(`JSON.stringify({ t: gameClock, x: FOOT.x, z: FOOT.z })`));
      const d1 = Math.hypot(s.x - o.t1.x, s.z - o.t1.z);
      const d2 = o.t2 ? Math.hypot(s.x - o.t2.x, s.z - o.t2.z) : 99;
      minD1 = Math.min(minD1, d1); minD2 = Math.min(minD2, d2);
      const along = -((s.x - o.x) * Math.sin(o.a) + (s.z - o.z) * Math.cos(o.a));
      const lateral = (s.x - o.x) * Math.cos(o.a) - (s.z - o.z) * Math.sin(o.a);
      const dLat = lateral - lastLat, sign = dLat > 0.02 ? 1 : dLat < -0.02 ? -1 : lastSign;
      if (Math.abs(dLat) > 0.08 && sign !== 0 && lastSign !== 0 && sign !== lastSign) dither++;
      if (sign !== 0) lastSign = sign; lastLat = lateral;
      if (d1 < o.t1.r + 0.6 || d2 < o.t2?.r + 0.6) near += s.t - last;
      last = s.t;
      if (along > 2) { pass = s.t - t0; break; }
      if (s.t - t0 > 12) break;
    }
  } finally { await up("KeyW"); }
  return { kind: o.kind, lat, hug: +near.toFixed(2), pass: pass === null ? "stuck" : +pass.toFixed(2), minD1: +minD1.toFixed(2), minD2: o.t2 ? +minD2.toFixed(2) : null, dither };
}

const rows = [];
for (const o of data.clusters) for (const lat of [0, 0.3]) { const r = await run(o, lat); rows.push(r); console.log(JSON.stringify(r)); }
for (const o of data.lamps) for (const lat of [0, 0.3]) { const r = await run(o, lat); rows.push(r); console.log(JSON.stringify(r)); }
const ok = rows.filter(r => r.pass !== "stuck");
console.log(`SUMMARY runs ${rows.length} stuck ${rows.length - ok.length} meanHug ${(rows.reduce((s, r) => s + r.hug, 0) / rows.length).toFixed(2)} maxHug ${Math.max(...rows.map(r => r.hug)).toFixed(2)} meanDither ${(rows.reduce((s, r) => s + r.dither, 0) / rows.length).toFixed(2)} maxDither ${Math.max(...rows.map(r => r.dither))}`);
await done();
