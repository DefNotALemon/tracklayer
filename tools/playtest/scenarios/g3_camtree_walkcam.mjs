// G3 follow-up to v147 (camTreeClip): the chase camera ON FOOT walking through a dense pine stand. On foot the camera
// rides low (~2–3 m), right in the widest bottom tier of a pine skirt, so it is pushed out of canopies far more often
// than behind a sled. Walks 3 dense pine stands × 2 headings × 2 lateral offsets holding W, and every rendered frame
// logs the camera's clearance from the nearest canopy envelope (inside < 0, near < 0.3 m) and how far the camera
// jumped since the previous frame beyond what the walker moved (jerk: a camera shoved from tree to tree jitters).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_camtree_walkcam.mjs [outdir]   (CT_N limits runs)
// Also counts frames with a canopy within 1.6 m of the lens (dith1.6: deep in breezeMat's screen-door band) and frames
// whose sight line camera -> walker's head runs > 0.3 m inside a canopy (occluded). Stills: FOOT.on is set directly, so
// the walker figure (FOOT.g, built on a real dismount) isn't drawn; dismount with Q first if you need it in shot.
import { boot, ev, shot, sleep, down, up, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = 12; true");
await ev(`camMode = 0; camState.init = false; true`);

await ev(`(() => {
  const T = [[1.9, 3.0, 2.6], [1.5, 2.7, 4.1], [1.05, 2.3, 5.5], [0.6, 1.7, 6.7]];
  window.__envR = (o, yy) => {
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
  window.__ct = { on: false, n: 0, inside: 0, near: 0, min: 99, jerk: 0, jmax: 0, jn: 0 };
  const r0 = renderer.render.bind(renderer);
  renderer.render = (s, c) => { if (__ct.on && c === camera) { const k = __clear(c.position.x, c.position.y, c.position.z);
    __ct.n++; if (k < 0) __ct.inside++; if (k < 0.3) __ct.near++; if (k < __ct.min) __ct.min = k;
    if (k < 1.6) __ct.dith = (__ct.dith || 0) + 1;                     // a canopy well inside breezeMat's 2.6 m screen-door band
    { let occ = false; const hx = FOOT.x, hy = FOOT.y + 1.5, hz = FOOT.z;   // sight line camera -> walker's head through a canopy?
      for (let s = 1; s < 12 && !occ; s++) { const f = s / 12; if (__clear(c.position.x + (hx - c.position.x) * f, c.position.y + (hy - c.position.y) * f, c.position.z + (hz - c.position.z) * f) < -0.3) occ = true; }
      if (occ) __ct.occ = (__ct.occ || 0) + 1; }
    // camera motion relative to the walker (the follow offset): a sudden change = a visible jump
    const ox = c.position.x - FOOT.x, oz = c.position.z - FOOT.z;
    if (__ct.lx !== undefined) { const j = Math.hypot(ox - __ct.lx, oz - __ct.lz); if (j > __ct.jmax) __ct.jmax = j; if (j > 0.15) __ct.jn++; __ct.jerk += j; }
    __ct.lx = ox; __ct.lz = oz; }
    return r0(s, c); };
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
  const D = 12, px = -Math.cos(a), pz = Math.sin(a);
  const ax = s.x + Math.sin(a) * D + px * off, az = s.z + Math.cos(a) * D + pz * off;
  const yaw = Math.atan2(-Math.sin(a), -Math.cos(a));
  await ev(`(() => { let x = ${ax}, z = ${az};
    for (let it = 0; it < 20; it++) { if (!obNear(x, z, 0.5)) break; x += Math.cos(${a}) * 0.6; z -= Math.sin(${a}) * 0.6; }
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = x; FOOT.z = z; FOOT.yaw = ${yaw};
    P.x = x - Math.sin(${yaw}) * 6; P.z = z - Math.cos(${yaw}) * 6; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0; recenter(P.x, P.z, true);
    FOOT.y = surf(x, z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.tired = 0; FOOT.wind = 0; FOOT.blown = false;
    FOOT.obSide = 0; FOOT.obT = 0; GS.warmth = 100; GS.coldWarned = false;
    if (FOOT.g) FOOT.g.visible = true; camState.yaw = ${yaw}; camState.init = false; return true; })()`);
  await sleep(900);
  await ev(`Object.assign(__ct, { on: true, n: 0, inside: 0, near: 0, min: 99, jerk: 0, jmax: 0, jn: 0, dith: 0, occ: 0, lx: undefined }); true`);
  const t0 = await ev("gameClock"); let t = t0, worst = 99; const sh = {};
  await down("KeyW");
  try {
    for (;;) {
      await sleep(150);
      const q = JSON.parse(await ev(`JSON.stringify({ t: gameClock, x: FOOT.x, z: FOOT.z, k: __clear(camera.position.x, camera.position.y, camera.position.z) })`));
      t = q.t;
      if (q.k < worst && q.k < 0.4) { worst = q.k; await shot(`${tag}_worst`); }
      const along = -((q.x - s.x) * Math.sin(a) + (q.z - s.z) * Math.cos(a)) + D - D;
      if (!sh.mid && along >= 0) { sh.mid = 1; await shot(`${tag}_mid`); }
      if (along > 12 || q.t - t0 > 30) break;
    }
  } finally { await up("KeyW"); }
  const c = JSON.parse(await ev(`(__ct.on = false, JSON.stringify(__ct))`));
  return { tag, a, off, gameS: +(t - t0).toFixed(1), frames: c.n, inside: c.inside, near03: c.near, min: +c.min.toFixed(2), jumps015: c.jn, dith: c.dith, occ: c.occ, jmax: +c.jmax.toFixed(2), jerkPerF: +(c.jerk / Math.max(1, c.n)).toFixed(3) };
}

const rows = []; let i = 0;
const NMAX = +(process.env.CT_N || 99);
for (const s of stands) for (const a of [0.4, 3.5]) for (const off of [1.2, -1.6]) { if (i >= NMAX) break;
  const r = await run(s, a, off, `f${i++}`); rows.push(r); console.log(JSON.stringify(r));
}
const F = rows.reduce((a, r) => a + r.frames, 0);
console.log(`SUMMARY foot runs ${rows.length} frames ${F} inside ${rows.reduce((a, r) => a + r.inside, 0)} near03 ${rows.reduce((a, r) => a + r.near03, 0)} runsInside ${rows.filter(r => r.inside > 0).length} min ${Math.min(...rows.map(r => r.min)).toFixed(2)} jumps>0.15 ${rows.reduce((a, r) => a + r.jumps015, 0)} jmax ${Math.max(...rows.map(r => r.jmax)).toFixed(2)} dith1.6 ${rows.reduce((a, r) => a + r.dith, 0)} occluded ${rows.reduce((a, r) => a + r.occ, 0)}`);
await done();
