// G1: walking along a shoreline at an angle. footStep used to stop you dead (F.sp = 0) the moment a step would
// land in the sea, so a walker heading even slightly seaward along the quay/beach froze on the waterline instead
// of sliding along it. For several shore spots near the depot: stand 0.8 m inland, face 20° / 45° into the sea off
// the shore tangent (both ways), hold W for 5 game-s, report metres covered along the shore and whether you end
// in the sea. Run: tools/playtest/run.sh tools/playtest/scenarios/g1_shore.mjs
import { boot, ev, shot, sideCam, camOff, done, sleep, down, up } from "../lib.mjs";
await boot();
await ev(`(() => { if (!FOOT.on) { FOOT.on = true; } WX.at = () => 0; GS.storm = 0; P.x += 300; P.z += 300; true; })()`);

const spots = JSON.parse(await ev(`(() => {
  const cx = depot.seed[0], cz = depot.seed[1], out = [];
  for (let a = 0; a < 6.283 && out.length < 6; a += 0.13) {
    const dx = Math.sin(a), dz = Math.cos(a); let prev = null;
    for (let r = 2; r < 600; r += 0.5) { const x = cx + dx * r, z = cz + dz * r;
      if (isSea(x, z)) { if (prev) {
        let nx = 0, nz = 0; for (let k = 0; k < 24; k++) { const b = k / 24 * 6.283, sx = Math.sin(b), sz = Math.cos(b); if (isSea(prev[0] + sx * 3, prev[1] + sz * 3)) { nx += sx; nz += sz; } }
        const l = Math.hypot(nx, nz); if (l < 1) break; nx /= l; nz /= l;
        const px = prev[0] - nx * 0.8, pz = prev[1] - nz * 0.8;
        if (out.every(o => Math.hypot(o.x - px, o.z - pz) > 40) && !obNear(px, pz, 6)) out.push({ x: px, z: pz, nx, nz });
      } break; }
      prev = [x, z]; } }
  return JSON.stringify(out);
})()`));
console.log(`shore spots: ${spots.length}`);

async function walk(s, ang, side) {
  // tangent (side ±1) rotated ang toward the sea normal
  const tx = -s.nz * side, tz = s.nx * side, ca = Math.cos(ang), sa = Math.sin(ang);
  const dx = tx * ca + s.nx * sa, dz = tz * ca + s.nz * sa;
  await ev(`(() => { FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = ${s.x}; FOOT.z = ${s.z};
    FOOT.yaw = Math.atan2(${dx}, ${dz}); FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.jog = false;
    FOOT.tired = 0; FOOT.wind = 0; FOOT.blown = false; camState.init = false; true; })()`);
  await sleep(250);
  const t0 = +(await ev("gameClock"));
  await down("KeyW"); let t;
  try { for (;;) { await sleep(120); t = +(await ev("gameClock")); if (t - t0 >= 5) break; } } finally { await up("KeyW"); }
  const e = JSON.parse(await ev(`JSON.stringify({x: FOOT.x, z: FOOT.z, sea: isSea(FOOT.x, FOOT.z)})`));
  const along = (e.x - s.x) * tx + (e.z - s.z) * tz, moved = Math.hypot(e.x - s.x, e.z - s.z);
  return { along: +along.toFixed(1), moved: +moved.toFixed(1), secs: +(t - t0).toFixed(2), sea: e.sea };
}

const rows = [];
for (const [i, s] of spots.entries()) {
  for (const ang of [20, 45]) for (const side of [1, -1]) {
    const r = await walk(s, ang * Math.PI / 180, side);
    rows.push(r.along);
    console.log(`spot ${i} (${s.x.toFixed(0)},${s.z.toFixed(0)}) ${ang}° side ${side}: along ${r.along} m, moved ${r.moved} m in ${r.secs} s, sea ${r.sea}`);
    if (ang === 45 && side === 1 && i < 2) { await sideCam(); await shot(`shore_${i}_45`); await camOff(); }
  }
}
const avg = rows.reduce((a, b) => a + b, 0) / Math.max(1, rows.length);
console.log(`RESULT avg along-shore metres in 5 game-s: ${avg.toFixed(2)} over ${rows.length} walks; stuck (<1 m): ${rows.filter(v => v < 1).length}`);
await done();
