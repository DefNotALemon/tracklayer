// G3 follow-up to v147 (chase cam vs pine canopies, report 0081/PROGRESS note): judge the breezeMat screen-door
// dither near the camera at NIGHT (does the dithered skirt stay legible, or go to mush/flicker in the dark?) and
// take a short burst of consecutive-frame stills close to the tree to eyeball shimmer/crawl between frames.
// Reuses g3_camtree's stand-finding + clearance instrumentation but at GS.hour = 0 (polar night) and fires stills
// every ~130 ms for 1.2 s while the camera sits inside the 2.6 m dither band, instead of one worst-frame still.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g3_camtree_night.mjs [outdir]
import { boot, ev, shot, sleep, down, up, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; GS.hour = 0; GS.cash = 1e6; true");
await ev("camMode = 0; camState.init = false; true");

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

async function run(s, a, off, tag) {
  const D = 55, px = -Math.cos(a), pz = Math.sin(a);
  const ax = s.x + Math.sin(a) * D + px * off, az = s.z + Math.cos(a) * D + pz * off;
  const yaw = Math.atan2(-Math.sin(a), -Math.cos(a));
  await ev(`(() => { FOOT.on = false; if (FOOT.g) FOOT.g.visible = false;
    P.x = ${ax}; P.z = ${az}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = ${yaw};
    recenter(P.x, P.z, true); camState.init = false; return true; })()`);
  await sleep(1200);
  let burstOn = false, n = 0;
  const t0 = await ev("gameClock"); let t = t0, crashed = false;
  await down("KeyW");
  try {
    for (;;) {
      await sleep(130);
      const q = JSON.parse(await ev(`JSON.stringify({ t: gameClock, x: P.x, z: P.z, crash: !!CRASH.on, k: __clear(camera.position.x, camera.position.y, camera.position.z) })`));
      t = q.t;
      if (q.crash) { crashed = true; break; }
      if (q.k < 2.0 && !burstOn) burstOn = true;
      if (burstOn && n < 6) { await shot(`${tag}_b${n}`); n++; }
      const along = -((q.x - s.x) * Math.sin(a) + (q.z - s.z) * Math.cos(a));
      if (along > 22 || q.t - t0 > 30) break;
    }
  } finally { await up("KeyW"); }
  return { tag, a, off, gameS: +(t - t0).toFixed(1), crashed, burstShots: n };
}

const rows = []; let i = 0;
for (const s of stands) for (const a of [0.4]) for (const off of [1.5, -1.9]) {
  const r = await run(s, a, off, `n${i++}`); rows.push(r); console.log(JSON.stringify(r));
  await ev(`(() => { if (CRASH.on) crashGetUp(); return true; })()`);
}
console.log(`SUMMARY night runs ${rows.length} crashed ${rows.filter(r=>r.crashed).length} shots ${rows.reduce((a,r)=>a+r.burstShots,0)}`);
await done();
