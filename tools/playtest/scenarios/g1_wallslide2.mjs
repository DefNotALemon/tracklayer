// G1: wall slide on the buildings that aren't K.house / depot / garage: the hospital's back wall, the pier freight
// shed's landward wall and the fish buyer's shed. Same measure as g1_wallslide.mjs: walker starts 4 m off the
// face, heading in at 0/35/50/65° off square, holds W for 6 game-s; prints metres slid along the face and the
// closest the walker's centre got to any disc edge. A rounded-post wall stalls in the notches between discs.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_wallslide2.mjs
import { boot, ev, done, sleep, down, up } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; true");
// face: building centre (cx,cz), yaw ry, which local axis the face is across ('u' or 'v'), side (±1), face offset
// from the centre along that axis (disc edge), and the along-face coordinate to start at.
const faces = {
  hospital: `const ry = HOSP.ry, cx = HOSP.x, cz = HOSP.z, axis = 'v', side = -1, off = 5.8, at = 0;`,
  freight: `const ry = -QUAY.qa, U = (u, v) => [QUAY.qx + u * Math.cos(ry) + v * Math.sin(ry), QUAY.qz - u * Math.sin(ry) + v * Math.cos(ry)];
    const [cx, cz] = U(0, -19), axis = 'u', side = -1, off = 6.2, at = 0;`,
  buyer: `const ry = -QUAY.qa, U = (u, v) => [QUAY.qx + u * Math.cos(ry) + v * Math.sin(ry), QUAY.qz - u * Math.sin(ry) + v * Math.cos(ry)];
    const [cx, cz] = U(1, 13), axis = 'v', side = 1, off = 3.9, at = 0;`,
};
async function trial(name, face, deg) {
  const a = deg * Math.PI / 180;
  const s0 = JSON.parse(await ev(`(() => { ${face}
    const ux = Math.cos(ry), uz = -Math.sin(ry), vx = Math.sin(ry), vz = Math.cos(ry);
    const nx = (axis === 'u' ? ux : vx) * side, nz = (axis === 'u' ? uz : vz) * side, tx = axis === 'u' ? vx : ux, tz = axis === 'u' ? vz : uz;
    const sx = cx + nx * (off + 4) + tx * at, sz = cz + nz * (off + 4) + tz * at;
    const dx = -nx * Math.cos(${a}) + tx * Math.sin(${a}), dz = -nz * Math.cos(${a}) + tz * Math.sin(${a}), yaw = Math.atan2(dx, dz);
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = sx; FOOT.z = sz; FOOT.yaw = yaw;
    P.x = sx + nx * 6; P.z = sz + nz * 6; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true);
    FOOT.y = surf(sx, sz) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.tired = 0; FOOT.strain = 0.6; FOOT.step = 0; FOOT.half = 0;
    if (FOOT.g) FOOT.g.visible = true; camState.init = false; window.__ws = { tx, tz };
    return JSON.stringify({ x: sx, z: sz, t: gameClock, sea: isSea(sx, sz) }); })()`));
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
  const dx = s.x - s0.x, dz = s.z - s0.z, along = Math.abs(dx * ws.tx + dz * ws.tz), tot = Math.hypot(dx, dz);
  console.log(`${(name + " " + deg + "°").padEnd(16)} moved ${tot.toFixed(2)} m, along face ${along.toFixed(2)} m in ${(s.t - s0.t).toFixed(2)} s · closest ${minPen.toFixed(3)} m${s0.sea ? " (start on sea!)" : ""}`);
  return { name, deg, tot, along, minPen };
}
const rows = [];
for (const [name, face] of Object.entries(faces)) for (const deg of [0, 10, 20, 35, 50]) rows.push(await trial(name, face, deg));
console.log("ROWS " + JSON.stringify(rows));
await done();
