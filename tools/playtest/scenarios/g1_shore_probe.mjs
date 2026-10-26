// G1 debug: find g1_shore's spot SPI (default 3), print an isSea/obstacle ASCII map round it (0.5 m cells), then
// walk it 45° seaward on side SIDE (default -1) and trace position/speed/what's ahead every ~0.25 game-s.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_shore_probe.mjs
import { boot, ev, done, sleep, down, up } from "../lib.mjs";
await boot();
await ev(`(() => { FOOT.on = true; WX.at = () => 0; GS.storm = 0; P.x += 300; P.z += 300; true; })()`);
const SPI = +(process.env.SPI || 3), SIDE = +(process.env.SIDE || -1), ANG = +(process.env.ANG || 45) * Math.PI / 180;
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
const s = spots[SPI];
console.log(`spot ${SPI}: ${JSON.stringify(s)}`);
const map = await ev(`(() => {
  const X = ${s.x}, Z = ${s.z}, rows = [];
  for (let j = 12; j >= -12; j--) { let r = "";
    for (let i = -20; i <= 20; i++) { const x = X + i * 0.5, z = Z + j * 0.5;
      r += (i === 0 && j === 0) ? "@" : isSea(x, z) ? "~" : obNear(x, z, 0.3) ? "#" : "."; }
    rows.push(r); }
  return rows.join("\\n");
})()`);
console.log("x→ +0.5 m per col, z↑ +0.5 m per row\n" + map);
const tx = -s.nz * SIDE, tz = s.nx * SIDE, dx = tx * Math.cos(ANG) + s.nx * Math.sin(ANG), dz = tz * Math.cos(ANG) + s.nz * Math.sin(ANG);
console.log(`heading dx ${dx.toFixed(2)} dz ${dz.toFixed(2)}`);
await ev(`(() => { FOOT.on = true; FOOT.ski = false; FOOT.x = ${s.x}; FOOT.z = ${s.z}; FOOT.yaw = Math.atan2(${dx}, ${dz});
  FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; camState.init = false; true; })()`);
await sleep(250);
const t0 = +(await ev("gameClock"));
await down("KeyW");
try { for (let k = 0; k < 24; k++) { await sleep(200);
  console.log(await ev(`(() => { const F = FOOT, fx = Math.sin(F.yaw), fz = Math.cos(F.yaw);
    return "t " + (gameClock - ${t0}).toFixed(2) + " x " + (F.x - ${s.x}).toFixed(2) + " z " + (F.z - ${s.z}).toFixed(2) + " sp " + F.sp.toFixed(2)
      + " yaw " + F.yaw.toFixed(2) + " ahead1 sea " + isSea(F.x + fx, F.z + fz) + " ob " + obNear(F.x + fx * 0.5, F.z + fz * 0.5, 0.4) + " dig " + F.dig + " fwd " + F.fwd; })()`)); } }
finally { await up("KeyW"); }
await done();
