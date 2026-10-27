// G1 follow-up to v146 tree wells (backlog: "walking round a trunk by hand" unjudged by report 0081, which
// only rode the sled through). Puts the walker on foot approaching the same kind of dense pine stand used by
// g1_treewell.mjs/g1_forest.mjs, holding W only (no manual steering -- the game's own obSlide wall-slide/notch-lock
// is what's meant to carry a walker round a trunk, same as on skis/sled) through 2 stands x 2 headings, and
// measures stuck time, snag count and tiredness, plus stills from the normal chase-style side camera.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_treewell_foot.mjs [outdir]
import { boot, ev, shot, sleep, down, up, sideCam, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = 12; true");

const stands = JSON.parse(await ev(`(() => {
  const pines = []; for (const a of obGrid.values()) for (const o of a) if (o.pine && !o.down) pines.push(o);
  function obNearAll(x, z, R) { const r = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const a = obGrid.get((Math.floor((z + HALF) / OBC) + j) * OBW + Math.floor((x + HALF) / OBC) + i); if (a) for (const p of a) if (Math.hypot(p.x - x, p.z - z) < R) r.push(p); } return r; }
  const cand = [];
  for (let k = 0; k < pines.length; k += 3) { const o = pines[k]; const n = obNearAll(o.x, o.z, 9).filter(p => p.pine).length; if (n >= 6 && slopeAt(o.x, o.z, 9) < 0.15 && !isSea(o.x, o.z) && !isWater(o.x, o.z)) cand.push({ x: o.x, z: o.z, n }); }
  cand.sort((a, b) => b.n - a.n);
  const out = [];
  for (const c of cand) { if (out.length >= 2) break; if (out.some(s => Math.hypot(s.x - c.x, s.z - c.z) < 300)) continue; out.push(c); }
  return JSON.stringify(out);
})()`));
console.log("stands", JSON.stringify(stands));
if (!stands.length) { console.log("NO STAND FOUND"); await done(1); }

async function run(s, a, tag) {
  const D = 16; // closer approach than the sled test: a walker fits gaps a sled can't
  const ax = s.x + Math.sin(a) * D, az = s.z + Math.cos(a) * D;
  const yaw = Math.atan2(-Math.sin(a), -Math.cos(a));
  await ev(`(() => {
    FOOT.on = true; FOOT.x = ${ax}; FOOT.z = ${az}; FOOT.y = surf(${ax}, ${az}); FOOT.yaw = ${yaw}; FOOT.sp = 0; FOOT.tired = 0; FOOT.strain = 0;
    camState.init = false; camState.yaw = ${yaw};
    return true; })()`);
  await sideCam();
  await sleep(1000);
  const t0 = await ev("gameClock");
  let shots = { 10: 0, 6: 0, 3: 0, 1: 0 }, stalledAt = null, stallT = 0, maxTired = 0;
  let last = { t: t0, x: ax, z: az };
  await down("KeyW");
  try {
    for (;;) {
      await sleep(250);
      const q = JSON.parse(await ev(`JSON.stringify({ t: gameClock, x: FOOT.x, z: FOOT.z, sp: FOOT.sp, tired: FOOT.tired||0 })`));
      const along = -((q.x - s.x) * Math.sin(a) + (q.z - s.z) * Math.cos(a));
      const distToCentre = Math.hypot(q.x - s.x, q.z - s.z);
      maxTired = Math.max(maxTired, q.tired);
      const dt = q.t - last.t; if (dt > 0 && Math.hypot(q.x - last.x, q.z - last.z) / dt < 0.25) stallT += dt; else stallT = 0;
      last = { t: q.t, x: q.x, z: q.z };
      if (stallT > 3 && stalledAt === null) stalledAt = +along.toFixed(1);
      for (const d of [10, 6, 3, 1]) if (!shots[d] && distToCentre <= d) { shots[d] = 1; await shot(`${tag}_${d}m`); }
      if (along > 14 || q.t - t0 > 30) break;
    }
  } finally { await up("KeyW"); }
  await sleep(500); await shot(`${tag}_past`);
  await ev("window.camOv = null; true");
  return { stand: `${s.x.toFixed(0)},${s.z.toFixed(0)}`, n: s.n, a: +a.toFixed(2), gameS: +(last.t - t0).toFixed(1), stalledAt, maxTired: +maxTired.toFixed(2), shots: Object.keys(shots).filter(k => shots[k]).join(",") };
}

const rows = [];
let i = 0;
for (const s of stands) for (const a of [0.2, 3.0]) {
  const r = await run(s, a, `s${i++}`);
  rows.push(r); console.log(JSON.stringify(r));
}
console.log("SUMMARY", JSON.stringify({ runs: rows.length, stuck: rows.filter(r => r.stalledAt !== null).length, meanGameS: +(rows.reduce((t, r) => t + r.gameS, 0) / rows.length).toFixed(1), meanTired: +(rows.reduce((t, r) => t + r.maxTired, 0) / rows.length).toFixed(2) }));
await done();
