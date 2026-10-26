// G1 cross-country skis: on Turski touring skis, kick 10 game-s across flat open fresh powder, then 8 game-s up,
// down and across an inland hillside (grade ~0.15-0.35). Reports avg speed, end speed, the mean F.grade the skis
// felt vs the real ground grade. Before v80 skiStep read the grade off the snow top, so its own groove behind the
// skis read as a climb on the flat. Run: tools/playtest/run.sh tools/playtest/scenarios/g1_ski.mjs
import { boot, ev, shot, sideCam, camOff, sleep, down, up, tap, done } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; GS.own.xc = { id: 'tur', cond: 1 }; true");
const find = (lo, hi) => ev(`JSON.stringify((() => {
  const cx = P.x, cz = P.z; let best = null, bs = 0;
  for (let r = 150; r < 2400; r += 25) for (let a = 0; a < 6.28; a += 0.25) {
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (isSea(x, z) || (typeof isWater === "function" && isWater(x, z)) || obNear(x, z, 30)) continue;
    let wet = false; for (let k = 0; k < 8 && !wet; k++) { const b = k * 0.785; if (isSea(x + Math.cos(b) * 80, z + Math.sin(b) * 80)) wet = true; } if (wet) continue;
    const s = slopeAt(x, z, 10), s2 = slopeAt(x, z, 4), mid = (${lo} + ${hi}) / 2;
    if (s > ${lo} && s < ${hi} && Math.abs(s - s2) < 0.05) { const sc = 1 - Math.abs(s - mid); if (sc > bs) { bs = sc; best = { x: Math.round(x), z: Math.round(z), sl: +s.toFixed(3) }; } }
  }
  if (!best) return null;
  const e = 6, gx = groundAt(best.x + e, best.z) - groundAt(best.x - e, best.z), gz = groundAt(best.x, best.z + e) - groundAt(best.x, best.z - e);
  best.upYaw = Math.atan2(gx, gz); return best;
})())`).then(JSON.parse);
const flat = await find(0, 0.03), hill = await find(0.15, 0.35);
console.log("flat", JSON.stringify(flat), "hill", JSON.stringify(hill));
if (!flat || !hill) { console.log("FAIL: no spot"); await done(1); }
await ev(`P.x = ${hill.x} + 80; P.z = ${hill.z} + 80; P.y = surf(P.x, P.z) + 0.5; true`);
await sleep(800); await tap("KeyQ"); await sleep(2500);
console.log("on skis:", await ev("FOOT.on && FOOT.ski"));
function setFoot(x, z, yaw) {
  return ev(`(() => { FOOT.on = true; FOOT.ski = true; FOOT.dig = false; FOOT.x = ${x}; FOOT.z = ${z}; FOOT.yaw = ${yaw};
    FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.tired = 0; FOOT.grade = 0;
    if (FOOT.g) FOOT.g.visible = true; camState.init = false; return true; })()`);
}
async function ski(label, x, z, yaw, secs) {
  await setFoot(x, z, yaw); await sleep(300);
  const s0 = JSON.parse(await ev(`JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, g: groundAt(FOOT.x, FOOT.z), d: depthAt(Math.round((FOOT.x + HALF) / CELL), Math.round((FOOT.z + HALF) / CELL))})`));
  await down("KeyW"); let s, gs = 0, n = 0;
  try { for (;;) { await sleep(150); s = JSON.parse(await ev(`JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, g: groundAt(FOOT.x, FOOT.z), sp: FOOT.sp, gr: FOOT.grade})`)); if (s.t - s0.t > 2) { gs += s.gr; n++; } if (s.t - s0.t >= secs) break; } }
  finally { await up("KeyW"); }
  const m = Math.hypot(s.x - s0.x, s.z - s0.z), dt = s.t - s0.t;
  const r = { m: +m.toFixed(1), avg: +(m / dt).toFixed(2), end: +s.sp.toFixed(2), felt: +(gs / Math.max(n, 1)).toFixed(3), grade: +((s.g - s0.g) / Math.max(m, 0.1)).toFixed(3), depth: +s0.d.toFixed(2) };
  console.log(`${label}: ${r.m} m in ${dt.toFixed(1)} s -> avg ${r.avg} m/s, end ${r.end}, felt grade ${r.felt}, ground grade ${r.grade}, depth ${r.depth}`);
  return r;
}
await ski("FLAT", flat.x, flat.z, flat.upYaw + Math.PI / 2, 10);
await sideCam(); await shot("01_flat"); await camOff();
const Y = hill.upYaw, fx = Math.sin(Y), fz = Math.cos(Y), lx = Math.cos(Y), lz = -Math.sin(Y);
await ski("UPHILL", hill.x - fx * 7, hill.z - fz * 7, Y, 8);
await ski("DOWNHILL", hill.x + lx * 4 + fx * 7, hill.z + lz * 4 + fz * 7, Y + Math.PI, 8);
await ski("ACROSS", hill.x - lx * 4, hill.z - lz * 4, Y + Math.PI / 2, 8);
await shot("02_across_chase");
await done();
