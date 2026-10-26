// G1 (report 0072 F1): walking dead-square into a lone round obstacle (the fuel-cabin pallet, a lone tree or rock)
// used to orbit the disc at body radius for ~3 game-s. For each obstacle: stand 8 m out, hold W straight at its
// centre (and once 0.3 m off-centre), and time by gameClock how long the walker hugs the disc (d < r + 0.6) and
// how long until it's 2 m past the centre along the walk line. Cap 12 game-s ("stuck" if it never gets past).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_obround.mjs [outdir]
import { boot, ev, done, sleep, down, up } from "../lib.mjs";
await boot();
await ev("GS.storm = 0; GS.hour = 12; true");

const obs = JSON.parse(await ev(`(() => {
  const all = []; for (const a of obGrid.values()) for (const o of a) all.push(o);
  const out = [];
  // fuel-cabin pallets first
  scene.traverse(g => { if (g.isGroup && g.userData.fuelCans) {
    let best = null, bd = 1e9; for (const o of all) { const d = Math.hypot(o.x - g.position.x, o.z - g.position.z); if (d < bd) { bd = d; best = o; } }
    if (best && bd < 1) out.push({ kind: "pallet", x: best.x, z: best.z, r: best.r, a: g.rotation.y });
  } });
  // lone round obstacles near spawn: nothing else within 9 m, flat, dry approach
  const lone = all.filter(o => !o.log && !o.down && o.ax === undefined && o.r >= 0.25 && o.r <= 1.5)
    .map(o => ({ o, d: Math.hypot(o.x - P.x, o.z - P.z) })).sort((a, b) => a.d - b.d);
  let n = 0;
  for (const { o } of lone) {
    if (n >= 4) break;
    if (all.some(p => p !== o && Math.hypot(p.x - o.x, p.z - o.z) < 9 + p.r)) continue;
    if (slopeAt(o.x, o.z, 8) > 0.12) continue;
    const a = 0.7 + n * 1.3, ax = o.x + Math.sin(a) * 8, az = o.z + Math.cos(a) * 8;
    if (isSea(ax, az) || isWater(ax, az) || isSea(o.x - Math.sin(a) * 4, o.z - Math.cos(a) * 4)) continue;
    out.push({ kind: "lone r" + o.r.toFixed(2), x: o.x, z: o.z, r: o.r, a }); n++;
  }
  return JSON.stringify(out);
})()`));
console.log("obstacles", obs.length, obs.map(o => o.kind));

async function run(o, lat) {
  const ax = o.x + Math.sin(o.a) * 8 + Math.cos(o.a) * lat, az = o.z + Math.cos(o.a) * 8 - Math.sin(o.a) * lat;
  const yaw = Math.atan2(-Math.sin(o.a), -Math.cos(o.a));
  await ev(`(() => {
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = ${ax}; FOOT.z = ${az}; FOOT.yaw = ${yaw};
    P.x = FOOT.x + Math.sin(FOOT.yaw) * -5; P.z = FOOT.z + Math.cos(FOOT.yaw) * -5; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true);
    FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.tired = 0; FOOT.wind = 0; FOOT.blown = false;
    if (FOOT.g) FOOT.g.visible = true; camState.init = false; true; })()`);
  await sleep(400);
  const t0 = await ev("gameClock"); let near = 0, last = t0, pass = null, minD = 99;
  await down("KeyW");
  try {
    for (;;) {
      await sleep(120);
      const s = JSON.parse(await ev(`JSON.stringify({ t: gameClock, x: FOOT.x, z: FOOT.z })`));
      const d = Math.hypot(s.x - o.x, s.z - o.z), along = -((s.x - o.x) * Math.sin(o.a) + (s.z - o.z) * Math.cos(o.a));
      minD = Math.min(minD, d);
      if (d < o.r + 0.6) near += s.t - last;
      last = s.t;
      if (along > 2) { pass = s.t - t0; break; }
      if (s.t - t0 > 12) break;
    }
  } finally { await up("KeyW"); }
  return { kind: o.kind, lat, hug: +near.toFixed(2), pass: pass === null ? "stuck" : +pass.toFixed(2), minD: +minD.toFixed(2) };
}

const rows = [];
for (const o of obs) for (const lat of [0, 0.3]) { const r = await run(o, lat); rows.push(r); console.log(JSON.stringify(r)); }
const ok = rows.filter(r => r.pass !== "stuck");
console.log(`SUMMARY runs ${rows.length} stuck ${rows.length - ok.length} meanHug ${(rows.reduce((s, r) => s + r.hug, 0) / rows.length).toFixed(2)} maxHug ${Math.max(...rows.map(r => r.hug)).toFixed(2)} meanPass ${(ok.reduce((s, r) => s + r.pass, 0) / Math.max(1, ok.length)).toFixed(2)}`);
await done();
