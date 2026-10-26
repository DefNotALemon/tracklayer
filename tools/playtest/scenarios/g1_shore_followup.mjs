// G1 follow-up to v136 (shore slide, report 0068 backlog item): three things the builder flagged as unchecked.
// 1) spot 3 (-1409,-326) 45 side -1 which 0068's own g1_shore.mjs run reported still stuck (<1 m) -- re-walk it
//    with shoreSlide's own diagnostics (ring taps, normal, slid point) to see WHY it stops.
// 2) skiing (FOOT.ski = true) along the same shore spots at the same angles, since shoreSlide feeds skiStep too
//    but only footStep was exercised before.
// 3) walking the quay/pier edge itself (QUAY, not a natural beach) toward the freight shed door.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_shore_followup.mjs
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
console.log(`shore spots found: ${spots.length}`);
for (const [i, s] of spots.entries()) console.log(`  spot ${i}: (${s.x.toFixed(0)},${s.z.toFixed(0)}) normal (${s.nx.toFixed(2)},${s.nz.toFixed(2)})`);

async function place(s, ang, side, ski) {
  const tx = -s.nz * side, tz = s.nx * side, ca = Math.cos(ang), sa = Math.sin(ang);
  const dx = tx * ca + s.nx * sa, dz = tz * ca + s.nz * sa;
  await ev(`(() => { FOOT.on = true; FOOT.ski = ${ski}; FOOT.dig = false; FOOT.x = ${s.x}; FOOT.z = ${s.z};
    FOOT.yaw = Math.atan2(${dx}, ${dz}); FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.jog = false;
    FOOT.tired = 0; FOOT.wind = 0; FOOT.blown = false; camState.init = false; true; })()`);
  await sleep(250);
  return { tx, tz };
}
async function walk5s() {
  const t0 = +(await ev("gameClock"));
  await down("KeyW"); let t;
  try { for (;;) { await sleep(120); t = +(await ev("gameClock")); if (t - t0 >= 5) break; } } finally { await up("KeyW"); }
  return t - t0;
}

// --- 1. diagnose the stuck spot 3, 45 side -1 ---
const s3 = spots[3];
if (s3) {
  console.log(`\n--- spot 3 diagnosis (-1409,-326 in 0068) actual (${s3.x.toFixed(0)},${s3.z.toFixed(0)}) ---`);
  const { tx, tz } = await place(s3, 45 * Math.PI / 180, -1, false);
  const diag = JSON.parse(await ev(`JSON.stringify((() => {
    const F = FOOT, nx0 = ${tx}, nz0 = ${tz};
    const fx = Math.sin(F.yaw), fz = Math.cos(F.yaw);
    const nx = F.x + fx * 0.2, nz = F.z + fz * 0.2;   // one small step worth
    let sx = 0, sz = 0, taps = [];
    for (let k = 0; k < 12; k++) { const b = k * Math.PI / 6, cx = Math.sin(b), cz = Math.cos(b); const wet = isSea(F.x + cx * 1.5, F.z + cz * 1.5); taps.push(wet ? 1 : 0); if (wet) { sx += cx; sz += cz; } }
    const sl = Math.hypot(sx, sz);
    let slid = null, slidWet = null, into = null;
    if (sl >= 1e-6) { const nsx = sx / sl, nsz = sz / sl; into = (nx - F.x) * nsx + (nz - F.z) * nsz;
      if (into > 0) { const ax = nx - into * nsx, az = nz - into * nsz; slid = [+ax.toFixed(2), +az.toFixed(2)]; slidWet = isSea(ax, az); } }
    return { startSea: isSea(F.x, F.z), stepSea: isSea(nx, nz), ringWetCount: taps.reduce((a,b)=>a+b,0), taps, normLen: +sl.toFixed(2), into, slid, slidWet };
  })())`));
  console.log(`diag: ${JSON.stringify(diag)}`);
  const secs = await walk5s();
  const e = JSON.parse(await ev(`JSON.stringify({x: +FOOT.x.toFixed(1), z: +FOOT.z.toFixed(1), sea: isSea(FOOT.x, FOOT.z)})`));
  const along = (e.x - s3.x) * tx + (e.z - s3.z) * tz, moved = Math.hypot(e.x - s3.x, e.z - s3.z);
  console.log(`RESULT spot3 45 side-1: along ${along.toFixed(2)} m, moved ${moved.toFixed(2)} m in ${secs.toFixed(2)} s, end sea ${e.sea}`);
  await sideCam(); await shot("a_spot3_stuck"); await camOff();
}

// --- 2. skiing along the shore at the same angles on two spots ---
console.log(`\n--- skiing along shore ---`);
for (const [i, s] of spots.slice(0, 2).entries()) {
  for (const [ang, side] of [[45, 1], [45, -1]]) {
    const { tx, tz } = await place(s, ang * Math.PI / 180, side, true);
    const secs = await walk5s();
    const e = JSON.parse(await ev(`JSON.stringify({x: +FOOT.x.toFixed(1), z: +FOOT.z.toFixed(1), sea: isSea(FOOT.x, FOOT.z), ski: !!FOOT.ski})`));
    const along = (e.x - s.x) * tx + (e.z - s.z) * tz, moved = Math.hypot(e.x - s.x, e.z - s.z);
    console.log(`ski spot ${i} ${ang} side ${side}: along ${along.toFixed(2)} m, moved ${moved.toFixed(2)} m in ${secs.toFixed(2)} s, sea ${e.sea}, still skiing ${e.ski}`);
    if (i === 0 && side === 1) { await sideCam(); await shot(`b_ski_spot${i}`); await camOff(); }
  }
}

// --- 3. walk the quay/pier edge toward the freight shed door ---
console.log(`\n--- quay edge walk ---`);
const quayInfo = JSON.parse(await ev(`JSON.stringify(QUAY ? { qx: QUAY.qx, qz: QUAY.qz, qa: QUAY.qa, qy: QUAY.qy } : null)`));
console.log(`QUAY: ${JSON.stringify(quayInfo)}`);
if (quayInfo) {
  // the pier slab sticks "out" along dir (qa); its EDGE (the long side, toward the water) is at ax = +13 from
  // the slab center in local coords, i.e. perpendicular to dir. Stand near that edge and walk along the pier
  // (perpendicular to dir, i.e. along the shore-facing long axis) toward the freight shed at local (2,-20).
  await ev(`(() => {
    const { qx, qz, qa } = QUAY, dirx = Math.cos(qa), dirz = Math.sin(qa), ax = -dirz, az = dirx;
    // local point (u=8 along dir i.e. mid-pier, v=22, near one long edge) converted to world, walking toward v=-20 (shed)
    const u = 8, v = 22;
    FOOT.on = true; FOOT.ski = false; FOOT.x = qx + dirx * u + ax * v; FOOT.z = qz + dirz * u + az * v;
    FOOT.yaw = Math.atan2(-ax, -az); FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.jog = false;
    FOOT.tired = 0; camState.init = false; window.__qdir = { ax, az }; true;
  })()`);
  await sleep(250);
  const start = JSON.parse(await ev(`JSON.stringify({x: +FOOT.x.toFixed(1), z: +FOOT.z.toFixed(1), sea: isSea(FOOT.x, FOOT.z)})`));
  console.log(`quay start: ${JSON.stringify(start)}`);
  const t0 = +(await ev("gameClock"));
  await down("KeyW"); let t;
  try { for (;;) { await sleep(120); t = +(await ev("gameClock")); if (t - t0 >= 8) break; } } finally { await up("KeyW"); }
  const end = JSON.parse(await ev(`JSON.stringify({x: +FOOT.x.toFixed(1), z: +FOOT.z.toFixed(1), sea: isSea(FOOT.x, FOOT.z)})`));
  const moved = Math.hypot(end.x - start.x, end.z - start.z);
  console.log(`RESULT quay edge walk: moved ${moved.toFixed(2)} m in ${(t - t0).toFixed(2)} s, end sea ${end.sea}`);
  await sideCam(); await shot("c_quay_edge"); await camOff();
}

await done();
