// G3 report 0081 F1/F2: the chase camera pokes into a pine's canopy when the sled passes close under its branches
// (a screenful of dark-green backfaces). Rides straight past a chosen pine at a lateral offset (so the camera, trailing
// on the sled's line, brushes that tree) in 3 dense stands, 2 headings, 2 offsets, and every rendered frame measures the
// camera's clearance from the nearest pine's canopy envelope (its own copy of the pineGeos tier cones, scaled per tree).
// Prints frames inside a canopy (clear < 0), frames closer than 0.3 m, and the min clearance; a still at the worst frame.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_camtree.mjs [outdir]
import { boot, ev, shot, sleep, down, up, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 1e6; true");
const VIEW = +(process.env.CT_VIEW || 0);
await ev(`camMode = ${VIEW}; camState.init = false; true`);

await ev(`(() => {
  const T = [[1.9, 3.0, 2.6], [1.5, 2.7, 4.1], [1.05, 2.3, 5.5], [0.6, 1.7, 6.7]];
  window.__envR = (o, yy) => {           // canopy radius (m) of pine o at world height yy
    const h = (yy - o.y) / o.sy; let R = 0;
    for (const [r, th, y] of T) {
      const b = y - th / 2; if (h >= b && h <= b + th) R = Math.max(R, r * (1 - (h - b) / th));
      const ch = th * 0.86, cb = y + th / 2 + 0.1 - ch; if (h >= cb && h <= cb + ch) R = Math.max(R, r * 0.97 * 1.15 * (1 - (h - cb) / ch));
    }
    return R * o.s;
  };
  window.__clear = (x, y, z) => { let m = 99;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const a = obGrid.get((Math.floor((z + HALF) / OBC) + j) * OBW + Math.floor((x + HALF) / OBC) + i); if (!a) continue;
      for (const o of a) { if (!o.pine || o.down) continue; const R = __envR(o, y); if (R <= 0) continue; m = Math.min(m, Math.hypot(o.x - x, o.z - z) - R); } }
    return m; };
  window.__ct = { on: false, n: 0, inside: 0, near: 0, min: 99 };
  const r0 = renderer.render.bind(renderer);
  renderer.render = (s, c) => { if (__ct.on && c === camera) { const k = __clear(c.position.x, c.position.y, c.position.z);
    __ct.n++; if (k < 0) __ct.inside++; if (k < 0.3) __ct.near++; if (k < __ct.min) { __ct.min = k; __ct.minT = gameClock; } } return r0(s, c); };
  return true; })()`);

const stands = JSON.parse(await ev(`(() => {
  const pines = []; for (const a of obGrid.values()) for (const o of a) if (o.pine && !o.down) pines.push(o);
  function near(x, z, R) { const r = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const a = obGrid.get((Math.floor((z + HALF) / OBC) + j) * OBW + Math.floor((x + HALF) / OBC) + i); if (a) for (const p of a) if (Math.hypot(p.x - x, p.z - z) < R) r.push(p); } return r; }
  const cand = [];
  for (let k = 0; k < pines.length; k += 3) { const o = pines[k]; if (o.s < 1) continue; const n = near(o.x, o.z, 10).filter(p => p.pine).length; if (n >= 5 && slopeAt(o.x, o.z, 10) < 0.15 && !isSea(o.x, o.z) && !isWater(o.x, o.z)) cand.push({ x: o.x, z: o.z, s: o.s, n }); }
  cand.sort((a, b) => b.n - a.n);
  const out = []; for (const c of cand) { if (out.length >= 3) break; if (out.some(s => Math.hypot(s.x - c.x, s.z - c.z) < 300)) continue; out.push(c); }
  return JSON.stringify(out); })()`));
console.log("stands", JSON.stringify(stands));
if (!stands.length) { console.log("NO STAND"); await done(1); }

async function run(s, a, off, tag) {
  const D = 55, px = -Math.cos(a), pz = Math.sin(a);         // perpendicular to the approach
  const ax = s.x + Math.sin(a) * D + px * off, az = s.z + Math.cos(a) * D + pz * off;
  const yaw = Math.atan2(-Math.sin(a), -Math.cos(a));
  await ev(`(() => { FOOT.on = false; if (FOOT.g) FOOT.g.visible = false;
    P.x = ${ax}; P.z = ${az}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = ${yaw};
    recenter(P.x, P.z, true); camState.init = false; return true; })()`);
  await sleep(1200);
  await ev(`Object.assign(__ct, { on: true, n: 0, inside: 0, near: 0, min: 99 }); true`);
  const t0 = await ev("gameClock"); let crashed = false, worstShot = 99, t = t0; const sh = {};
  await down("KeyW");
  try {
    for (;;) {
      await sleep(150);
      const q = JSON.parse(await ev(`JSON.stringify({ t: gameClock, x: P.x, z: P.z, crash: !!CRASH.on, k: __clear(camera.position.x, camera.position.y, camera.position.z) })`));
      t = q.t;
      if (q.crash) { crashed = true; break; }
      if (q.k < worstShot && q.k < 0.6) { worstShot = q.k; await shot(`${tag}_worst`); }
      const along = -((q.x - s.x) * Math.sin(a) + (q.z - s.z) * Math.cos(a));
      for (const m of [0, 7]) if (!sh[m] && along >= m) { sh[m] = 1; await shot(`${tag}_at${m}m`); }
      if (along > 22 || q.t - t0 > 30) break;
    }
  } finally { await up("KeyW"); }
  const c = JSON.parse(await ev(`(__ct.on = false, JSON.stringify(__ct))`));
  return { tag, a, off, gameS: +(t - t0).toFixed(1), crashed, frames: c.n, inside: c.inside, near03: c.near, min: +c.min.toFixed(2), shotAt: worstShot < 99 ? +worstShot.toFixed(2) : null };
}

const rows = []; let i = 0;
const NMAX = +(process.env.CT_N || 99);
for (const s of stands) for (const a of [0.4, 3.5]) for (const off of [1.5, -1.9]) { if (i >= NMAX) break;
  const r = await run(s, a, off, `r${i++}`); rows.push(r); console.log(JSON.stringify(r));
  await ev(`(() => { if (CRASH.on) crashGetUp(); return true; })()`);
}
const ok = rows.filter(r => !r.crashed), F = ok.reduce((a, r) => a + r.frames, 0);
console.log(`SUMMARY view ${VIEW} runs ${rows.length} crashed ${rows.length - ok.length} frames ${F} inside ${ok.reduce((a, r) => a + r.inside, 0)} near03 ${ok.reduce((a, r) => a + r.near03, 0)} runsInside ${ok.filter(r => r.inside > 0).length} min ${Math.min(...ok.map(r => r.min)).toFixed(2)}`);
await done();
