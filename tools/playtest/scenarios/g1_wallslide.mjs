// G1: walking into a house wall at an angle should slide you along it, not wedge you in place.
// Puts the walker 4 m off the long (-z) wall of the red shore-road house (lot depot+46,+26, ry 0.2), facing the
// wall at 0/20/35/50/65° off square, holds W for 6 game-s, and reports metres slid along the wall, the closest
// the walker's centre got to any obstacle disc edge (negative = inside a wall), and the same into a lone tree.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_wallslide.mjs
import { boot, ev, done, sleep, down, up } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; true");
async function trial(name, setup) {
  const s0 = JSON.parse(await ev(`(() => { ${setup}
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = sx; FOOT.z = sz; FOOT.yaw = yaw;
    P.x = sx - Math.sin(yaw) * 6; P.z = sz - Math.cos(yaw) * 6; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true);
    FOOT.y = surf(sx, sz) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.tired = 0; FOOT.strain = 0.6; FOOT.step = 0; FOOT.half = 0;
    if (FOOT.g) FOOT.g.visible = true; camState.init = false; window.__ws = { tx, tz };
    return JSON.stringify({ x: sx, z: sz, t: gameClock }); })()`));
  await sleep(300);
  await down("KeyW"); let minPen = 9, s;
  try {
    for (;;) {
      await sleep(100);
      s = JSON.parse(await ev(`(() => { let m = 9; const gx = Math.floor((FOOT.x + HALF) / OBC), gz = Math.floor((FOOT.z + HALF) / OBC);
        for (let j = gz - 1; j <= gz + 1; j++) for (let i = gx - 1; i <= gx + 1; i++) for (const o of obGrid.get(j * OBW + i) || []) { if (o.log || o.down) continue; m = Math.min(m, Math.hypot(FOOT.x - o.x, FOOT.z - o.z) - o.r - 0.36); }
        return JSON.stringify({ x: FOOT.x, z: FOOT.z, t: gameClock, m }); })()`));
      minPen = Math.min(minPen, s.m);
      if (s.t - s0.t > 6) break;
    }
  } finally { await up("KeyW"); }
  const ws = JSON.parse(await ev("JSON.stringify(window.__ws)"));
  const dx = s.x - s0.x, dz = s.z - s0.z, along = dx * ws.tx + dz * ws.tz, tot = Math.hypot(dx, dz);
  console.log(`${name.padEnd(22)} moved ${tot.toFixed(2)} m, along wall ${along.toFixed(2)} m in ${(s.t - s0.t).toFixed(2)} s · closest ${minPen.toFixed(3)} m`);
  return { name, tot, along, minPen };
}
const rows = [];
for (const deg of [0, 20, 35, 50, 65]) {
  const a = deg * Math.PI / 180;
  rows.push(await trial(`house wall ${deg}°`, `const ry = 0.2, hx = depot.x + 46, hz = depot.z + 26;
    const nx = -Math.sin(ry), nz = -Math.cos(ry), tx = Math.cos(ry), tz = -Math.sin(ry);
    const sx = hx + nx * 7.5, sz = hz + nz * 7.5;
    const dx = -nx * Math.cos(${a}) + tx * Math.sin(${a}), dz = -nz * Math.cos(${a}) + tz * Math.sin(${a}), yaw = Math.atan2(dx, dz);`));
}
// a lone tree, walked at 0.3 m off its centre line: you should step round it, never through it
rows.push(await trial("lone tree", `let tr = null; const all = []; for (const a of obGrid.values()) for (const t of a) if (Math.hypot(t.x - depot.x, t.z - depot.z) < 2500) all.push(t);
  for (const t of all) { if (t.tree === undefined || t.down || Math.hypot(t.x - depot.x, t.z - depot.z) > 2500) continue;
    if (all.some(u => u !== t && Math.hypot(u.x - t.x, u.z - t.z) < 4.5)) continue; tr = t; break; }
  const tx = 1, tz = 0, sx = tr ? tr.x + 0.3 : FOOT.x, sz = tr ? tr.z - 4 : FOOT.z, yaw = 0;`));
console.log("ROWS " + JSON.stringify(rows));
await done();
