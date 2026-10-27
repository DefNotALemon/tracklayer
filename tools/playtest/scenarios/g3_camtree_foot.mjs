// G3 follow-up to report 0083 (v147 chase-cam canopy clip, 627a385). That pass verified the clip for the SLED
// chase cam only (close chase + night). This scenario checks the on-foot path: the chase camera follows
// FOOT.x/y/z through the same camTreeClip() call, but a walker is far narrower than a sled and can walk much
// closer to a trunk (here offsets 0.3/-0.6 m vs the sled test's 1.5/-1.9 m, approach distance 16 m vs 55 m).
// Also checks tracklayer.js:3494 — selecting "First person" while FOOT.on falls back to VIEWS[1] Close chase;
// there is no true first-person view on foot at all.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_camtree_foot.mjs [outdir]
import { boot, ev, shot, sleep, down, up, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 1e6; true");

await ev(`(() => {
  const T = [[1.9, 3.0, 2.6], [1.5, 2.7, 4.1], [1.05, 2.3, 5.5], [0.6, 1.7, 6.7]];
  window.__envR = (o, yy) => { const h = (yy - o.y) / o.sy; let R = 0;
    for (const [r, th, y] of T) { const b = y - th / 2; if (h >= b && h <= b + th) R = Math.max(R, r * (1 - (h - b) / th));
      const ch = th * 0.86, cb = y + th / 2 + 0.1 - ch; if (h >= cb && h <= cb + ch) R = Math.max(R, r * 0.97 * 1.15 * (1 - (h - cb) / ch)); }
    return R * o.s; };
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
  const out = []; for (const c of cand) { if (out.length >= 2) break; if (out.some(s => Math.hypot(s.x - c.x, s.z - c.z) < 300)) continue; out.push(c); }
  return JSON.stringify(out); })()`));
console.log("stands", JSON.stringify(stands));
if (!stands.length) { console.log("NO STAND"); await done(1); }

async function run(viewIdx, s, a, off, tag) {
  await ev(`camMode = ${viewIdx}; camState.init = false; true`);
  const D = 16, px = -Math.cos(a), pz = Math.sin(a);          // a walker starts much closer to the stand than the sled test
  const ax = s.x + Math.sin(a) * D + px * off, az = s.z + Math.cos(a) * D + pz * off;
  const yaw = Math.atan2(-Math.sin(a), -Math.cos(a));
  await ev(`(() => {
    FOOT.x = ${ax}; FOOT.z = ${az}; FOOT.y = surf(${ax}, ${az}); FOOT.yaw = ${yaw};
    FOOT.on = true; FOOT.ski = false; FOOT.shoe = false; FOOT.sp = FOOT.fwd = FOOT.turn = 0; FOOT.dig = false; FOOT.crouch = 1;
    P.vx = P.vz = 0; recenter(FOOT.x, FOOT.z, true); camState.init = false; return true; })()`);
  await sleep(1200);
  await ev(`Object.assign(__ct, { on: true, n: 0, inside: 0, near: 0, min: 99 }); true`);
  const t0 = await ev("gameClock"); let t = t0, worstShot = 99; const sh = {};
  await down("KeyW");
  try {
    for (;;) {
      await sleep(150);
      const q = JSON.parse(await ev(`JSON.stringify({ t: gameClock, x: FOOT.x, z: FOOT.z, k: __clear(camera.position.x, camera.position.y, camera.position.z) })`));
      t = q.t;
      if (q.k < worstShot && q.k < 0.6) { worstShot = q.k; await shot(`${tag}_worst`); }
      const along = -((q.x - s.x) * Math.sin(a) + (q.z - s.z) * Math.cos(a));
      for (const m of [0, 6]) if (!sh[m] && along >= m) { sh[m] = 1; await shot(`${tag}_at${m}m`); }
      if (along > 19 || q.t - t0 > 35) break;
    }
  } finally { await up("KeyW"); }
  const c = JSON.parse(await ev(`(__ct.on = false, JSON.stringify(__ct))`));
  return { tag, view: VIEWNAMES[viewIdx], a, off, gameS: +(t - t0).toFixed(1), frames: c.n, inside: c.inside, near03: c.near, min: +c.min.toFixed(2), shotAt: worstShot < 99 ? +worstShot.toFixed(2) : null };
}
globalThis.VIEWNAMES = ["Chase", "Close chase", "First person", "Drone"];

const rows = []; let i = 0;
for (const viewIdx of [0, 1]) for (const s of stands) for (const off of [0.3, -0.6]) {
  const r = await run(viewIdx, s, 0.4, off, `v${viewIdx}_r${i++}`); rows.push(r); console.log(JSON.stringify(r));
}
const F = rows.reduce((a, r) => a + r.frames, 0);
console.log(`SUMMARY runs ${rows.length} frames ${F} inside ${rows.reduce((a, r) => a + r.inside, 0)} near03 ${rows.reduce((a, r) => a + r.near03, 0)} runsInside ${rows.filter(r => r.inside > 0).length} min ${Math.min(...rows.map(r => r.min)).toFixed(2)}`);
await done();
