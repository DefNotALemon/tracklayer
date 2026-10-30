// G1: walking on ground with no snow (Owner notes 30 Oct). Measures, by gameClock:
//  - walking speed on the quay's concrete, the plowed depot yard, the garage forecourt, and open fresh powder
//    (10 m from a standstill, then the steady pace over the next ~8 s), plus a held jog on the quay and in powder;
//  - on the quay, a deterministic capture (the game's rAF loop is taken over and stepped 1/60 s at a time):
//    foot slide while planted (heel / ball contact points within 5 mm of the floor, metres of horizontal travel
//    per stance), the pelvis bob, cadence, knee range;
//  - still strips of one gait cycle, side-on and front-on, every 0.1 s of game time (sheet.py them).
// Works on old builds (no ankle joint: the boot's heel/ball are read off the shin) for before/after numbers.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_hardwalk.mjs [outdir]
import { boot, ev, raw, shot, done, sleep, down, up, OUT } from "../lib.mjs";
import fs from "node:fs";
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; true");

const has = await ev("JSON.stringify({ quayTop: typeof quayTop === 'function', hg: typeof hgPose === 'function', walkFloor: typeof walkFloor === 'function' })");
console.log("build:", has);
function setFoot(x, z, yawExpr) {
  return ev(`(() => {
    FOOT.on = true; FOOT.ski = false; FOOT.shoe = false; FOOT.dig = false; FOOT.x = ${x}; FOOT.z = ${z};
    FOOT.yaw = ${yawExpr}; P.x = garageSite.x + 14; P.z = garageSite.z + 14; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(FOOT.x, FOOT.z, true);   // the sled parked out of the way, on land
    FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; FOOT.sp = 0; FOOT.go = 0; FOOT.fwd = 0; FOOT.turn = 0; FOOT.runW = 0; FOOT.wind = 0; FOOT.blown = false;
    FOOT.tired = 0; FOOT.strain = 0.6; FOOT.step = 0; FOOT.half = 0; if ('brisk' in FOOT) { FOOT.brisk = 0; FOOT.hgV = 0; FOOT.hardW = 0; } if (FOOT.g) FOOT.g.visible = true;
    camState.init = false; true;
  })()`);
}
const pos = async () => JSON.parse(await ev("JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock})"));
async function walk(dist, capSecs, keys = ["KeyW"]) {
  const s0 = await pos(); for (const k of keys) await down(k); let s, marks = [];
  try { for (;;) { await sleep(100); s = await pos(); const m = Math.hypot(s.x - s0.x, s.z - s0.z); marks.push([s.t - s0.t, m]); if ((dist && m >= dist) || s.t - s0.t > capSecs) break; } }
  finally { for (const k of keys) await up(k); }
  const m = Math.hypot(s.x - s0.x, s.z - s0.z), dt = s.t - s0.t;
  // steady pace: metres over the last 60% of the time
  const t1 = dt * 0.4, a = marks.find(q => q[0] >= t1) || marks[0], b = marks[marks.length - 1];
  return { m: +m.toFixed(1), secs: +dt.toFixed(2), avg: +(m / dt).toFixed(2), steady: +((b[1] - a[1]) / Math.max(0.01, b[0] - a[0])).toFixed(2) };
}
// a cell probe: depth, pack under a point
const cell = (x, z) => ev(`(() => { const ix = Math.round((${x} + HALF) / CELL), iz = Math.round((${z} + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); return JSON.stringify({ d: +d.toFixed(3), pack: +(f > 0.02 ? Math.max(0, Math.min(1, 1 - d / f)) : 1).toFixed(2) }); })()`).then(JSON.parse);

// the quay: along the shore (v axis) on the concrete, 4 m in from the water edge row of bollards
const Q = JSON.parse(await ev(`(() => { const q = QUAY, dx = Math.cos(q.qa), dz = Math.sin(q.qa), ax = -dz, az = dx;
  const at = (u, v) => [q.qx + dx * u + ax * v, q.qz + dz * u + az * v];
  // the clearest straight 24 m along the quay (nothing within 3 m of the line), for the gait capture
  let best = null; for (let u = 8; u <= 12.5; u += 0.5) for (let v0 = -27; v0 <= 2; v0 += 1) { let cl = 9; for (let v = v0; v <= v0 + 24; v += 0.5) { const p = at(u, v); for (let r = 0.5; r < 9 && r < cl; r += 0.25) if (obNear(p[0], p[1], r)) { cl = r; break; } } if (!best || cl > best.cl) best = { cl, u, v0 }; }
  return JSON.stringify({ start: at(11.5, -26), end: at(11.5, 26), yaw: Math.atan2(ax, az), across: at(-2, 12), yawIn: Math.atan2(dx, dz), clear: at(best.u, best.v0), clearM: best.cl }); })()`));
const spots = JSON.parse(await ev(`(() => {
  const out = [];
  out.push({ name: "depot yard", x: depot.x - 10, z: depot.z - 6, yaw: Math.atan2(1, 0.4) });
  out.push({ name: "garage forecourt", x: garageSite.x - 8, z: garageSite.z - 9, yaw: Math.atan2(0.2, 1) });
  return JSON.stringify(out); })()`));
const rows = [];
async function row(name, x, z, yaw, keys = ["KeyW"], dist = 0, cap = 9) {
  await setFoot(x, z, yaw); await sleep(500);
  const c = await cell(x, z);
  const w = await walk(dist, cap, keys);
  const hw = await ev("typeof FOOT.hardW === 'number' ? +FOOT.hardW.toFixed(2) : null");
  const r = { name, d: c.d, pack: c.pack, hardW: hw, ...w }; rows.push(r);
  console.log(`${name.padEnd(22)} d ${c.d} pack ${c.pack} hardW ${hw} · ${w.m} m in ${w.secs}s avg ${w.avg} m/s, steady ${w.steady} m/s`);
}
await row("quay walk", Q.start[0], Q.start[1], Q.yaw, ["KeyW"], 0, 10);
await row("quay jog", Q.start[0], Q.start[1], Q.yaw, ["KeyW", "ShiftLeft"], 0, 6);
for (const p of spots) await row(p.name, p.x, p.z, p.yaw, ["KeyW"], 0, 8);
const pw = JSON.parse(await ev(`(() => { for (let r = 300; r < 900; r += 40) for (let a = 0; a < 6.28; a += 0.4) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r;
  if (isSea(x, z) || isWater(x, z) || obNear(x, z, 25) || Math.abs(groundAt(x + 10, z) - groundAt(x - 10, z)) > 0.6 || Math.abs(groundAt(x, z + 10) - groundAt(x, z - 10)) > 0.6) continue;
  const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL); if (depthAt(ix, iz) < 0.45) continue; return JSON.stringify([x, z]); } return JSON.stringify([depot.x + 400, depot.z + 400]); })()`));
await row("open powder walk", pw[0], pw[1], 0, ["KeyW"], 0, 9);
await row("open powder jog", pw[0] + 30, pw[1], 0, ["KeyW", "ShiftLeft"], 0, 6);
// from the quay concrete into the yard snow: gait blend over distance
{
  await setFoot(Q.across[0], Q.across[1], Q.yawIn + Math.PI); await sleep(400);
  const tr = []; await down("KeyW");
  for (let i = 0; i < 40; i++) { await sleep(150); tr.push(JSON.parse(await ev(`JSON.stringify({ t: +gameClock.toFixed(2), x: +FOOT.x.toFixed(2), z: +FOOT.z.toFixed(2), sp: +FOOT.sp.toFixed(2), hw: typeof FOOT.hardW === 'number' ? +FOOT.hardW.toFixed(2) : null, d: +depthAt(Math.round((FOOT.x + HALF) / CELL), Math.round((FOOT.z + HALF) / CELL)).toFixed(2) })`))); }
  await up("KeyW");
  console.log("QUAY->LAND " + JSON.stringify(tr.filter((_, i) => i % 3 === 0)));
}

// ---- deterministic capture on the quay ----
console.log("capture line clearance m", Q.clearM);
await setFoot(Q.clear[0], Q.clear[1], Q.yaw); await sleep(300);
await raw(`(() => { window.__rq = null; window.__origRAF = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => { window.__rq = cb; return 1; }; return true; })()`);
await sleep(300);
// each step runs the game's frame inside a real animation frame (so the canvas is presented for screenshots) with a
// fake clock ms later: game time advances exactly ms per step whatever the machine's load
await raw(`(() => { window.__T = window.__tl('last'); window.__adv = (n, ms) => new Promise(res => { let k = 0; const go = () => { window.__T += ms; const cb = window.__rq; window.__rq = null; if (cb) cb(window.__T); if (++k >= n) res(true); else window.__origRAF(go); }; window.__origRAF(go); }); return true; })()`);
// the probe: both boots' heel and ball in world space + the floor under each
await ev(`(() => { window.__gp = () => { const U = FOOT.g.userData, o = []; FOOT.g.updateMatrixWorld(true);
  for (let i = 0; i < 2; i++) { const a = U.ank && U.ank[i], par = a || U.shins[i], dy = a ? -0.075 : -0.505;
    for (const z of [-0.07, 0.12]) { const v = new THREE.Vector3(0, dy, z); par.localToWorld(v); const fl = typeof walkFloor === 'function' ? walkFloor(v.x, v.z) : surf(v.x, v.z); o.push([v.x, v.y, v.z, fl]); } }
  const r = FOOT.g.position; return { t: gameClock, f: o, ry: r.y, fy: FOOT.y, x: FOOT.x, z: FOOT.z, yaw: FOOT.yaw, S: FOOT.hgS, hw: FOOT.hardW, k: [U.shins[0].rotation.x, U.shins[1].rotation.x], step: FOOT.step, sp: FOOT.go }; }; return true; })()`);
await down("KeyW");
await raw("window.__adv(240, 1000 / 60)");       // 4 s to settle into the walk
const fr = [];
for (let i = 0; i < 150; i++) { await raw("window.__adv(1, 1000 / 60)"); fr.push(JSON.parse(await ev("JSON.stringify(window.__gp())"))); }
// slide while planted
const stances = [[], [], [], []]; let cur = [0, 0, 0, 0], inC = [false, false, false, false];
for (let i = 1; i < fr.length; i++) for (let p = 0; p < 4; p++) {
  const a = fr[i - 1].f[p], b = fr[i].f[p], c0 = a[1] - a[3] < 0.005, c1 = b[1] - b[3] < 0.005;
  if (c0 && c1) { cur[p] += Math.hypot(b[0] - a[0], b[2] - a[2]); inC[p] = true; }
  else if (inC[p]) { stances[p].push(cur[p]); cur[p] = 0; inC[p] = false; }
}
const allS = stances.flat(); const mean = allS.length ? allS.reduce((a, b) => a + b, 0) / allS.length : null;
const ry = fr.map(q => q.ry - q.fy), kn = fr.flatMap(q => q.k);
const dur = fr[fr.length - 1].t - fr[0].t, cyc = (fr[fr.length - 1].step - fr[0].step) / (2 * Math.PI);
const contactFrac = [0, 1, 2, 3].map(p => fr.filter(q => q.f[p][1] - q.f[p][3] < 0.005).length / fr.length);
const res = { slideMeanM: mean === null ? null : +mean.toFixed(4), slideMaxM: allS.length ? +Math.max(...allS).toFixed(4) : null, stances: allS.length,
  contactFrac: contactFrac.map(x => +x.toFixed(2)), bobCm: +((Math.max(...ry) - Math.min(...ry)) * 100).toFixed(1),
  cadenceSpm: +(cyc * 2 / dur * 60).toFixed(0), strideM: +(fr.reduce((a, q) => a + q.sp, 0) / fr.length / (cyc / dur)).toFixed(2), kneeDeg: [Math.round(Math.min(...kn) * 57.3), Math.round(Math.max(...kn) * 57.3)], speed: +(fr.reduce((a, q) => a + q.sp, 0) / fr.length).toFixed(2) };
console.log("GAIT " + JSON.stringify(res));
fs.writeFileSync(`${OUT}/gait_frames.json`, JSON.stringify(fr));
// still strips: one gait cycle, every 0.1 s of game time, side-on then front-on
await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; for (const el of document.body.children) if (el !== renderer.domElement && !el.contains(renderer.domElement)) el.style.visibility = 'hidden'; return true; })()`);
for (const [tag, off, dist, h] of [["side", Math.PI / 2, 3.2, 0.25], ["front", 0, 3.6, 0.3]]) {
  await ev(`window.camOv = c => { const T = [FOOT.x, FOOT.y + 0.75, FOOT.z], yaw = FOOT.yaw + ${off}; c.position.set(T[0] + Math.sin(yaw) * ${dist}, T[1] + ${h}, T[2] + Math.cos(yaw) * ${dist}); c.lookAt(T[0], T[1] - 0.05, T[2]); c.fov = 40; c.updateProjectionMatrix(); }; true`);
  for (let i = 0; i < 13; i++) { await raw("window.__adv(2, 50)"); await shot(`${tag}_${String(i).padStart(2, "0")}`); }
}
await up("KeyW");
console.log("ROWS " + JSON.stringify(rows));
await done();
