// G1 follow-up to v145 (ski obstacle slide, report 0078/backlog top item). Three unjudged asks:
//  A) skiing into a trunk FAST DOWNHILL (thud threshold sq>0.55 at sp>3.5 m/s) — too forgiving/too harsh?
//  B) skis along a house wall (o.ax tangent slide, same path as g1_wallslide but FOOT.ski=true)
//  C) how the obSlide sidestep LOOKS from the normal chase camera at glide speed (sideways shuffle?)
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_ski_v145_verify.mjs [outdir]
import { boot, ev, done, sleep, down, up, shot, sideCam, camOff } from "../lib.mjs";
await boot();
await ev("GS.storm = 0; GS.hour = 12; GS.own.xc = { id: 'tur', cond: 1 }; true");

// ---------- A: fast downhill into a trunk ----------
console.log("=== A: downhill trunk hits ===");
const slopeTrees = JSON.parse(await ev(`(() => {
  const trees = []; for (const a of obGrid.values()) for (const o of a) if (o.tree !== undefined && !o.log && !o.down) trees.push(o);
  const cand = [];
  for (let k = 0; k < trees.length; k += 2) {
    const o = trees[k];
    const g = slopeAt(o.x, o.z, 8);
    if (g > 0.22 && g < 0.55 && !isSea(o.x, o.z) && !isWater(o.x, o.z)) cand.push({ x: o.x, z: o.z, g });
  }
  cand.sort((a, b) => b.g - a.g);
  const out = [];
  for (const c of cand) { if (out.length >= 4) break; if (out.some(s => Math.hypot(s.x - c.x, s.z - c.z) < 60)) continue; out.push(c); }
  return JSON.stringify(out);
})()`));
console.log("slope trees", JSON.stringify(slopeTrees));

async function downhillTrial(t, idx) {
  // start well uphill from the tree, aimed straight at it, so gravity + kick build speed before contact
  const setup = await ev(`(() => {
    const gx = groundAt(${t.x} + 0.01, ${t.z}) - groundAt(${t.x} - 0.01, ${t.z});
    const gz = groundAt(${t.x}, ${t.z} + 0.01) - groundAt(${t.x}, ${t.z} - 0.01);
    // uphill direction = +gradient (ascending); start 14 m uphill, face downhill toward the tree
    const ux = gx, uz = gz, ul = Math.hypot(ux, uz) || 1;
    const sx = ${t.x} + ux / ul * 14, sz = ${t.z} + uz / ul * 14;
    const yaw = Math.atan2(-ux / ul, -uz / ul);
    FOOT.on = true; FOOT.ski = true; FOOT.dig = false; FOOT.x = sx; FOOT.z = sz; FOOT.yaw = yaw;
    FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.fwd = 1; FOOT.turn = 0; FOOT.tired = 0; FOOT.grade = 0; FOOT.bumpT = 0;
    P.x = FOOT.x + Math.sin(FOOT.yaw) * -5; P.z = FOOT.z + Math.cos(FOOT.yaw) * -5; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true);
    GS.warmth = 100; GS.coldWarned = false;
    if (FOOT.g) FOOT.g.visible = true; camState.init = false;
    window.__thuds = 0; window.__maxSp = 0; window.__origThud = window.__origThud || thud;
    thud = (v) => { window.__thuds++; window.__lastThudSp = FOOT.sp; };
    return JSON.stringify({ x: sx, z: sz, t: gameClock }); })()`);
  const s0 = JSON.parse(setup);
  await sleep(300);
  if (idx === 0) { await sideCam(undefined, 3.2, 1.8); await shot("A_before"); }
  await down("KeyW");
  let maxSp = 0, lastX = s0.x, lastZ = s0.z, t0 = s0.t, stopped = false;
  try {
    for (;;) {
      await sleep(100);
      const q = JSON.parse(await ev(`JSON.stringify({ t: gameClock, sp: FOOT.sp, x: FOOT.x, z: FOOT.z, thuds: window.__thuds, lastThudSp: window.__lastThudSp })`));
      maxSp = Math.max(maxSp, Math.abs(q.sp));
      if (q.t - t0 > 10) { stopped = true; break; }
      if (Math.hypot(q.x - t.x, q.z - t.z) < 3 && q.t - t0 > 1) {
        // past the tree's vicinity or stuck on it; give it 2 more seconds then stop
        await sleep(2000); const q2 = JSON.parse(await ev(`JSON.stringify({ thuds: window.__thuds, lastThudSp: window.__lastThudSp })`));
        if (idx === 0) await shot("A_contact");
        return { tree: `${t.x.toFixed(0)},${t.z.toFixed(0)}`, grade: +t.g.toFixed(2), maxSp: +maxSp.toFixed(2), thuds: q2.thuds, lastThudSp: q2.lastThudSp === undefined ? null : +(+q2.lastThudSp).toFixed(2) };
      }
    }
  } finally { await up("KeyW"); if (idx === 0) await camOff(); }
  const qf = JSON.parse(await ev(`JSON.stringify({ thuds: window.__thuds, lastThudSp: window.__lastThudSp })`));
  return { tree: `${t.x.toFixed(0)},${t.z.toFixed(0)}`, grade: +t.g.toFixed(2), maxSp: +maxSp.toFixed(2), thuds: qf.thuds, lastThudSp: qf.lastThudSp === undefined ? null : +(+qf.lastThudSp).toFixed(2), note: "no-contact-in-10s" };
}
const aRows = [];
for (let i = 0; i < slopeTrees.length; i++) { const r = await downhillTrial(slopeTrees[i], i); aRows.push(r); console.log(JSON.stringify(r)); }
console.log("A_SUMMARY " + JSON.stringify(aRows));

// ---------- B: ski along a house wall ----------
console.log("=== B: ski along house wall ===");
async function wallTrial(deg) {
  const a = deg * Math.PI / 180;
  const setup = await ev(`(() => {
    const ry = 0.2, hx = depot.x + 46, hz = depot.z + 26;
    const nx = -Math.sin(ry), nz = -Math.cos(ry), tx = Math.cos(ry), tz = -Math.sin(ry);
    const sx = hx + nx * 9, sz = hz + nz * 9;
    const dx = -nx * Math.cos(${a}) + tx * Math.sin(${a}), dz = -nz * Math.cos(${a}) + tz * Math.sin(${a}), yaw = Math.atan2(dx, dz);
    FOOT.on = true; FOOT.ski = true; FOOT.dig = false; FOOT.x = sx; FOOT.z = sz; FOOT.yaw = yaw;
    FOOT.y = surf(sx, sz); FOOT.sp = 0; FOOT.fwd = 1; FOOT.turn = 0; FOOT.tired = 0; FOOT.grade = 0;
    P.x = sx - Math.sin(yaw) * 6; P.z = sz - Math.cos(yaw) * 6; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true);
    if (FOOT.g) FOOT.g.visible = true; camState.init = false; window.__wt = { tx, tz };
    return JSON.stringify({ x: sx, z: sz, t: gameClock }); })()`);
  const s0 = JSON.parse(setup);
  await sleep(300);
  if (deg === 20) { await sideCam(undefined, 3.2, 1.8); await shot("B_wall20_before"); }
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
  } finally { await up("KeyW"); if (deg === 20) { await shot("B_wall20_after"); await camOff(); } }
  const wt = JSON.parse(await ev("JSON.stringify(window.__wt)"));
  const dx = s.x - s0.x, dz = s.z - s0.z, along = dx * wt.tx + dz * wt.tz, tot = Math.hypot(dx, dz);
  return { deg, tot: +tot.toFixed(2), along: +along.toFixed(2), minPen: +minPen.toFixed(3), secs: +(s.t - s0.t).toFixed(2) };
}
const bRows = [];
for (const deg of [0, 20, 35, 50, 65]) { const r = await wallTrial(deg); bRows.push(r); console.log(JSON.stringify(r)); }
console.log("B_SUMMARY " + JSON.stringify(bRows));

// ---------- C: visual sidestep from chase camera, glide speed, in a stand ----------
console.log("=== C: chase-camera sidestep visual ===");
const stand = JSON.parse(await ev(`(() => {
  const trees = []; for (const a of obGrid.values()) for (const o of a) if (o.tree !== undefined && !o.log && !o.down) trees.push(o);
  let best = null, bestN = 0;
  for (let k = 0; k < trees.length; k += 3) {
    const o = trees[k]; let n = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const a = obGrid.get((Math.floor((o.z + HALF) / OBC) + j) * OBW + Math.floor((o.x + HALF) / OBC) + i); if (!a) continue;
      for (const p of a) if (p.tree !== undefined && Math.hypot(p.x - o.x, p.z - o.z) < 12) n++;
    }
    if (n > bestN && slopeAt(o.x, o.z, 10) < 0.15 && !isSea(o.x, o.z)) { bestN = n; best = { x: o.x, z: o.z }; }
  }
  return JSON.stringify(best);
})()`));
console.log("stand", JSON.stringify(stand));
await ev(`(() => {
  const a = 0.3, ax = ${stand.x} + Math.sin(a) * 15, az = ${stand.z} + Math.cos(a) * 15;
  const yaw = Math.atan2(-Math.sin(a), -Math.cos(a));
  FOOT.on = true; FOOT.ski = true; FOOT.dig = false; FOOT.x = ax; FOOT.z = az; FOOT.yaw = yaw;
  FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 3; FOOT.fwd = 1; FOOT.turn = 0; FOOT.tired = 0; FOOT.grade = 0;
  P.x = FOOT.x + Math.sin(FOOT.yaw) * -5; P.z = FOOT.z + Math.cos(FOOT.yaw) * -5; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true);
  GS.warmth = 100; if (FOOT.g) FOOT.g.visible = true; camState.init = false; return true; })()`);
await sleep(400);
// use the GAME's own chase camera (no override) so this matches what a player actually sees
await down("KeyW");
let shotN = 0; const t0c = await ev("gameClock"); let last = t0c;
try {
  for (;;) {
    await sleep(150);
    last = await ev("gameClock");
    if ((last - t0c) >= shotN * 2.5) { await shot(`C_chase_t${Math.round((last - t0c) * 10)}`); shotN++; }
    if (last - t0c > 15) break;
  }
} finally { await up("KeyW"); }
console.log("C done");

await done();
