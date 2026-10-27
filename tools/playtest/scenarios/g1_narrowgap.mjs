// G1 (report 0074 F1): two trunks closer than the walker's body (gap < 0.72 m). Hold W straight at the gap
// (head-on, 0.3 m and 0.6 m off-centre, both sides) and check you go round the pair and resume your line
// instead of sliding sideways through the woods. Picks the narrowest flat tree pairs (gap 0.3-0.7 m).
// Per run: pass time (along > 2 m beyond the pair, game-s), final lateral offset, max lateral drift, hug.
// TL_NG_PATH=1 prints the path (along/lateral every 120 ms) and the obstacles within 6 m.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_narrowgap.mjs [outdir]
import { boot, ev, done, sleep, down, up } from "../lib.mjs";
await boot();
await ev("GS.storm = 0; GS.hour = 12; true");

const data = JSON.parse(await ev(`(() => {
  const all = []; for (const a of obGrid.values()) for (const o of a) all.push(o);
  const trees = all.filter(o => o.tree !== undefined && !o.log);
  const pairs = [];
  for (let i = 0; i < trees.length && pairs.length < 3; i++) {
    const t1 = trees[i];
    for (let j = i + 1; j < trees.length; j++) {
      const t2 = trees[j], d = Math.hypot(t1.x - t2.x, t1.z - t2.z), gap = d - t1.r - t2.r;
      if (gap < 0.3 || gap > 0.7) continue;
      const mx = (t1.x + t2.x) / 2, mz = (t1.z + t2.z) / 2;
      if (slopeAt(mx, mz, 8) > 0.15 || isSea(mx, mz) || isWater(mx, mz)) continue;
      const dx = t2.x - t1.x, dz = t2.z - t1.z, len = Math.hypot(dx, dz);
      const a = Math.atan2(dx / len, dz / len) + Math.PI / 2;
      if (isSea(mx - Math.sin(a) * 8, mz - Math.cos(a) * 8) || isSea(mx + Math.sin(a) * 8, mz + Math.cos(a) * 8)) continue;
      const near = all.filter(o => Math.hypot(o.x - mx, o.z - mz) < 6).map(o => ({ x: +(o.x - mx).toFixed(2), z: +(o.z - mz).toFixed(2), r: o.r, tree: o.tree !== undefined }));
      pairs.push({ gap: +gap.toFixed(2), x: mx, z: mz, a, t1: { x: t1.x, z: t1.z, r: t1.r }, t2: { x: t2.x, z: t2.z, r: t2.r }, near: near.length });
      break;
    }
  }
  return JSON.stringify(pairs);
})()`));
console.log("pairs", data.map(p => "gap" + p.gap + " near" + p.near));
const PATH = process.env.TL_NG_PATH === "1";

async function run(o, lat) {
  const ax = o.x + Math.sin(o.a) * 8 + Math.cos(o.a) * lat, az = o.z + Math.cos(o.a) * 8 - Math.sin(o.a) * lat;
  const yaw = Math.atan2(-Math.sin(o.a), -Math.cos(o.a));
  await ev(`(() => {
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = ${ax}; FOOT.z = ${az}; FOOT.yaw = ${yaw};
    P.x = FOOT.x + Math.sin(FOOT.yaw) * -5; P.z = FOOT.z + Math.cos(FOOT.yaw) * -5; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true);
    FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.tired = 0; FOOT.wind = 0; FOOT.blown = false;
    GS.warmth = 100; if (FOOT.g) FOOT.g.visible = true; camState.init = false; true; })()`);
  await sleep(400);
  const t0 = await ev("gameClock");
  let near = 0, last = t0, pass = null, maxLat = 0, lat1 = 0, minD = 99;
  const path = [];
  await down("KeyW");
  try {
    for (;;) {
      await sleep(120);
      const s = JSON.parse(await ev(`JSON.stringify({ t: gameClock, x: FOOT.x, z: FOOT.z, side: FOOT.obSide || 0 })`));
      const d1 = Math.hypot(s.x - o.t1.x, s.z - o.t1.z) - o.t1.r, d2 = Math.hypot(s.x - o.t2.x, s.z - o.t2.z) - o.t2.r;
      minD = Math.min(minD, d1, d2);
      const along = -((s.x - o.x) * Math.sin(o.a) + (s.z - o.z) * Math.cos(o.a));
      const lateral = (s.x - o.x) * Math.cos(o.a) - (s.z - o.z) * Math.sin(o.a);
      maxLat = Math.max(maxLat, Math.abs(lateral - lat)); lat1 = lateral;
      if (PATH) path.push(`${(s.t - t0).toFixed(1)}:${along.toFixed(1)},${lateral.toFixed(1)}${s.side ? "s" + s.side : ""}`);
      if (Math.min(d1, d2) < 0.6) near += s.t - last;
      last = s.t;
      if (along > 2) { pass = s.t - t0; break; }
      if (s.t - t0 > 14) break;
    }
  } finally { await up("KeyW"); }
  if (PATH) console.log("  path", path.join(" "));
  return { gap: o.gap, lat, pass: pass === null ? "stuck" : +pass.toFixed(2), latEnd: +lat1.toFixed(2), maxDrift: +maxLat.toFixed(2), hug: +near.toFixed(2), minSurf: +minD.toFixed(2) };
}

const rows = [];
for (const o of data) for (const lat of [0, 0.3, -0.3, 0.6]) { const r = await run(o, lat); rows.push(r); console.log(JSON.stringify(r)); }
const ok = rows.filter(r => r.pass !== "stuck");
const mean = (a) => a.length ? (a.reduce((s, v) => s + v, 0) / a.length).toFixed(2) : "-";
console.log(`SUMMARY runs ${rows.length} stuck ${rows.length - ok.length} meanPass ${mean(ok.map(r => r.pass))} meanDrift ${mean(rows.map(r => r.maxDrift))} maxDrift ${Math.max(...rows.map(r => r.maxDrift)).toFixed(2)} meanHug ${mean(rows.map(r => r.hug))}`);
await done();
