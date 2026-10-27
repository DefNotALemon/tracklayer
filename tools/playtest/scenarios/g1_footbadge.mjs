// G1 (report 0085 F3): does the snow-condition badge (#pill + #bonus) describe the snow under the WALKER's boots?
// Two walks, W held, sampled every ~0.25 s: (A) sled left in the depot yard, walk 40 m straight out into powder;
// (B) sled parked out in powder, walk 25 m away, then turn and walk back to the depot yard edge (if near) — here just
// 25 m away in powder. Truth = the walker's own cell: pack > 0.62 → PACKED else POWDER (ice: lake biome, f < 0.12).
// Prints the mismatch share per walk + overall, and the badge text at a few points.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_footbadge.mjs [outdir]
import { boot, ev, shot, sleep, tap, down, up, park, sideCam, camOff, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = 12; true");
await sleep(1500);

const truthExpr = `(() => { const ix = Math.round((FOOT.x + HALF) / CELL), iz = Math.round((FOOT.z + HALF) / CELL);
  const d = depthAt(ix, iz), f = freshAt(ix, iz), pk = f > 0.02 ? Math.min(1, Math.max(0, 1 - d / f)) : 1;
  const ice = bioAt(FOOT.x, FOOT.z) === 1 && f < 0.12;
  return JSON.stringify({ t: gameClock, x: FOOT.x, z: FOOT.z, on: FOOT.on, pk: +pk.toFixed(2), d: +d.toFixed(2), yard: +yardAt(FOOT.x, FOOT.z).toFixed(2),
    truth: ice ? "ICE" : pk > 0.62 ? "PACKED" : "POWDER", pill: document.getElementById("pill").textContent, bonus: document.getElementById("bonus").textContent,
    sledPk: +P.pack.toFixed(2) }); })()`;

async function walk(tag, dist, yawExpr) {
  await tap("KeyQ"); await sleep(2500);
  if (!JSON.parse(await ev(truthExpr)).on) { console.log(tag, "FAIL: not on foot"); return null; }
  await ev(`FOOT.yaw = ${yawExpr}; true`); await sleep(300);
  const s0 = JSON.parse(await ev(truthExpr));
  let n = 0, bad = 0, samples = [], s = s0, shots = 0;
  await down("KeyW");
  try {
    for (;;) {
      await sleep(250);
      s = JSON.parse(await ev(truthExpr)); n++;
      if (s.pill !== s.truth) bad++;
      const m = Math.hypot(s.x - s0.x, s.z - s0.z);
      if (samples.length < 12 && n % 12 === 0) samples.push(`${m.toFixed(0)}m ${s.truth}/${s.pill} "${s.bonus}" pk${s.pk} d${s.d} yard${s.yard}`);
      if (shots === 0 && m > dist * 0.75) { shots = 1; await sideCam(); await sleep(300); await shot(`${tag}_walk`); await camOff(); }
      if (m >= dist || s.t - s0.t > 80) break;
    }
  } finally { await up("KeyW"); }
  const r = { tag, n, bad, badPct: +(100 * bad / Math.max(1, n)).toFixed(0), m: +Math.hypot(s.x - s0.x, s.z - s0.z).toFixed(1), end: `${s.truth}/${s.pill} "${s.bonus}"` };
  console.log(JSON.stringify(r)); for (const l of samples) console.log("  ", l);
  return r;
}

// A: from spawn (depot yard), walk straight away from the depot
const a = await walk("A_depot", 110, "Math.atan2(FOOT.x - depot.x, FOOT.z - depot.z)");
// back on the sled, park out in powder, walk away from it
await ev("FOOT.x = P.x + 1.2; FOOT.z = P.z; FOOT.y = surf(FOOT.x, FOOT.z); true"); await sleep(300);
await tap("KeyQ"); await sleep(2500);
console.log("remounted", await ev("!FOOT.on"));
console.log("parked at", JSON.stringify(await park()));
await sleep(1500);
const b = await walk("B_powder", 25, "P.yaw + Math.PI / 2");
const rows = [a, b].filter(Boolean);
console.log("SUMMARY", JSON.stringify({ walks: rows.length, samples: rows.reduce((t, r) => t + r.n, 0), mismatched: rows.reduce((t, r) => t + r.bad, 0) }));
await done();
