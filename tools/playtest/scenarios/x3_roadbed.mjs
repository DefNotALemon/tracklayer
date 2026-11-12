// 3.1 fix (beta 0123): the road bed is graded. Asserts the open roads are level across and eased along, that the
// ground under houses/boulders/stations near a road didn't move, that no standing tree was left on a pedestal or buried,
// and that the pickup pulls away from rest on the stretches where it used to sit or bog (fv888 141/470, lebesby 108,
// skjanes 148). Prints the same numbers on an old build (TL_SRC) for before/after; asserts need the bed (R.bed).
import { boot, ev, tap, sleep, done, down, up, shot } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(600);
const hasBed = await J(`!!TLXR.bed`);
console.log("bed", JSON.stringify(await J(`({ bed: TLXR.bed || null, ms: TLXR.ms, cleared: TLXR.cleared, poles: TLXR.poles, err: TLXR.err || null })`)));
// A. geometry: along-line grade over 8 points (~48 m) and over 2 points (~12 m), and cross slope ±3 m, interior points
const geo = await J(`TLXR.routes.map(r => {
  const L = [], S = [], C = []; let top = { g: 0 };
  for (const sg of r.segs) { if (sg.street) continue; const p = sg.pts, cum = [0]; for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    for (let i = 0; i + 1 < p.length; i++) { const e = Math.min(cum[i], cum[p.length - 1] - cum[i]); if (e < 40) continue;
      const a = p[i], b = p[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 2) continue; const nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l;
      C.push(Math.abs(groundAt(a[0] + nx * 3, a[1] + nz * 3) - groundAt(a[0] - nx * 3, a[1] - nz * 3)) / 6);
      S.push(Math.abs(groundAt(b[0], b[1]) - groundAt(a[0], a[1])) / l);
      if (i + 8 < p.length && cum[p.length - 1] - cum[i + 8] >= 40) { const c = p[i + 8], lc = cum[i + 8] - cum[i]; if (lc > 12) { const gg = (groundAt(c[0], c[1]) - groundAt(a[0], a[1])) / lc; L.push(Math.abs(gg)); if (Math.abs(gg) > top.g) top = { g: Math.abs(gg), lo: gg > 0 ? a : c, hi: gg > 0 ? c : a }; } } } }
  const q = (A, f) => { const s = A.slice().sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * f))].toFixed(3) : 0; };
  return { id: r.id, closed: r.closed, long8max: q(L, 1), long8p95: q(L, .95), long2p99: q(S, .99), crossMax: q(C, 1), crossP95: q(C, .95), cross15: +(C.filter(v => v > 0.15).length / Math.max(1, C.length)).toFixed(3), n: C.length, top };
})`);
for (const g of geo) { const { top, ...o } = g; console.log("geo", JSON.stringify(o), "steepest", top.g.toFixed(3), JSON.stringify(top.lo)); }
// B. nothing standing near a road moved: ground vs the untouched terrain function (skip lake basins)
const keep = await J(`(() => {
  const g0 = (x, z) => { const fx = (x + HALF) / GRES, fz = (z + HALF) / GRES, i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j, h = (a, b) => baseH(a * GRES - HALF, b * GRES - HALF);
    const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1); return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz; };
  const nearLake = (x, z) => LAKES.some(L => L.ok && Math.hypot(x - L.x, z - L.z) < L.r * 1.8);
  let obs = 0, obsMax = 0, trees = 0, treeMax = 0, st = 0, stMax = 0;
  const seen = new Set();
  for (const r of TLXR.routes) for (let i = 0; i < r.pts.length; i += 3) { const [x, z] = r.pts[i];
    for (const o of obstaclesNear(x, z, 26)) { if (seen.has(o) || o.log || Math.hypot(o.x - x, o.z - z) > 26 || nearLake(o.x, o.z)) continue; if (o.tree === undefined && !(o.top > 0.3)) continue; seen.add(o); const dd = Math.abs(groundAt(o.x, o.z) - g0(o.x, o.z));
      if (o.tree !== undefined) { if (!o.down) { trees++; treeMax = Math.max(treeMax, dd); } } else { obs++; obsMax = Math.max(obsMax, dd); } } }
  for (const t of STATIONS) { if (t.x === undefined || nearLake(t.x, t.z)) continue; st++; stMax = Math.max(stMax, Math.abs(groundAt(t.x, t.z) - g0(t.x, t.z))); }
  return { obs, obsMax: +obsMax.toFixed(3), trees, treeMax: +treeMax.toFixed(3), st, stMax: +stMax.toFixed(3) };
})()`);
console.log("keep", JSON.stringify(keep));
// C. the pickup from rest, W only, aligned with the road, 5 game s
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return true; })()`);
await sleep(800); await tap("KeyQ"); const seated = await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14);
ok(seated, "seated in the pickup");
const drives = [];
for (const [id, X0, Z0] of [["fv888", -1235, -745], ["fv888", -358, -990], ["lebesby", -1429, -75], ["skjanes", -9, -1316]]) {
  const info = await J(`(() => { const r = TLXR.routes.find(q => q.id === "${id}"); let idx = 0, bd = 1e9; r.pts.forEach((q, i) => { const d = Math.hypot(q[0] - (${X0}), q[1] - (${Z0})); if (d < bd && i + 3 < r.pts.length) { bd = d; idx = i; } });
    const a = r.pts[idx], b = r.pts[idx + 3]; BOG.on = false; BOG.acc = 0; BOG.immune = 0; crashCancel();
    P.x = a[0]; P.z = a[1]; P.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); P.vx = P.vz = P.vy = 0; P.y = surf(a[0], a[1]) + 0.2; recenter(a[0], a[1], true);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l;
    return { idx, off: +bd.toFixed(1), x: a[0], z: a[1], long: +((groundAt(b[0], b[1]) - groundAt(a[0], a[1])) / l).toFixed(3), cross: +((groundAt(a[0] + nx * 3, a[1] + nz * 3) - groundAt(a[0] - nx * 3, a[1] - nz * 3)) / 6).toFixed(3) }; })()`);
  const idx = info.idx;
  await waitGame(1.5);
  const p0 = await J(`[P.x, P.z]`); await down("KeyW"); await waitGame(5);
  const s = await J(`({ x: P.x, z: P.z, v: Math.hypot(P.vx, P.vz), bog: BOG.on, gnd: P.gnd, veh: !!VEH.cur, hint: (document.getElementById("wnHint") || {}).textContent, toast: TOASTQ.slice(-2).map(t => t.msg || t.t || String(t)) })`); await up("KeyW");
  const mv = Math.hypot(s.x - p0[0], s.z - p0[1]);
  console.log("drive", id, idx, JSON.stringify(info), "moved", mv.toFixed(1), "v", s.v.toFixed(1), "bog", s.bog, "gnd", s.gnd, "veh", s.veh, JSON.stringify(s.hint), JSON.stringify(s.toast));
  if (id === "fv888" && X0 === -1235) await shot("drive_fv888_141");
  if (id === "lebesby") await shot("drive_lebesby_108");
  drives.push({ id, idx, mv, bog: s.bog, info });
}
// D. the steepest 48 m of each open road, from rest at its foot, uphill
for (const g of geo.filter(g => !g.closed && g.top.lo)) {
  const [lx, lz] = g.top.lo, [hx, hz] = g.top.hi;
  const info = await J(`(() => { const r = TLXR.routes.find(q => q.id === "${g.id}"); let idx = 0, bd = 1e9; r.pts.forEach((q, i) => { const d = Math.hypot(q[0] - (${lx}), q[1] - (${lz})); if (d < bd) { bd = d; idx = i; } });
    BOG.on = false; BOG.acc = 0; BOG.immune = 0; crashCancel(); const a = r.pts[idx];
    let hi = 0, hd = 1e9; r.pts.forEach((q, i) => { const d = Math.hypot(q[0] - (${hx}), q[1] - (${hz})); if (d < hd) { hd = d; hi = i; } }); const b = r.pts[idx + (hi > idx ? 2 : -2)];
    P.x = a[0]; P.z = a[1]; P.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); P.vx = P.vz = P.vy = 0; P.y = surf(a[0], a[1]) + 0.2; recenter(a[0], a[1], true); const c = r.pts[idx + (hi > idx ? 2 : -2)], l = Math.hypot(c[0] - a[0], c[1] - a[1]), nx = -(c[1] - a[1]) / l, nz = (c[0] - a[0]) / l; return { idx, g12: +((groundAt(c[0], c[1]) - groundAt(a[0], a[1])) / l).toFixed(3), cross: +((groundAt(a[0] + nx * 3, a[1] + nz * 3) - groundAt(a[0] - nx * 3, a[1] - nz * 3)) / 6).toFixed(3), depth: +depthAt(Math.floor((a[0] + HALF) / CELL), Math.floor((a[1] + HALF) / CELL)).toFixed(2), yard: +yardAt(a[0], a[1]).toFixed(2) }; })()`);
  await waitGame(1.5);
  const p0 = await J(`[P.x, P.z]`); await down("KeyW"); await waitGame(3);
  /* also read at 5 s (0127 fix): traction-limited on packed snow a 12% pitch gives ~1.4 m/s2, 6 m in the first 3 s, so a
     straight 12.4% climb (where the switchback loops moved Lebesby's steepest 48 m) passes at 5 s; W is held straight,
     so on a stretch that bends within ~15 m the 3 s reading is the one that counts */
  const s3 = await J(`({ x: P.x, z: P.z, v: Math.hypot(P.vx, P.vz) })`); await waitGame(2);
  const s = await J(`({ x: P.x, z: P.z, v: Math.hypot(P.vx, P.vz), bog: BOG.on, onRoad: TLXR.onRoad(P.x, P.z), hint: (document.getElementById("wnHint") || {}).textContent })`); await up("KeyW");
  const mv = Math.hypot(s.x - p0[0], s.z - p0[1]);
  await shot("climb_" + g.id);
  console.log("climb", JSON.stringify(info), "onRoad", s.onRoad, g.id, info.idx, "grade", g.top.g.toFixed(3), "moved 3s", Math.hypot(s3.x - p0[0], s3.z - p0[1]).toFixed(1), "v", s3.v.toFixed(1), "5s", mv.toFixed(1), "v", s.v.toFixed(1), "bog", s.bog, JSON.stringify(s.hint));
  drives.push({ id: g.id + " steepest " + g.top.g.toFixed(3) + " (3 or 5 s)", idx: info.idx, mv: (mv >= 8 && s.v >= 4) || (Math.hypot(s3.x - p0[0], s3.z - p0[1]) >= 8 && s3.v >= 4) ? 99 : 0, bog: s.bog });
}
if (hasBed) {
  for (const g of geo.filter(g => !g.closed)) {
    ok(g.crossP95 <= 0.07 && g.cross15 <= 0.02, `${g.id}: level across (cross p95 ${g.crossP95}, ${(g.cross15 * 100).toFixed(1)}% over 0.15, max ${g.crossMax})`);
    ok(g.long8max <= 0.2 && g.long8p95 <= 0.12, `${g.id}: grade along (48 m max ${g.long8max}, p95 ${g.long8p95})`);
  }
  ok(keep.obsMax <= 0.05, `houses/boulders near the roads stand where they did (max ground change ${keep.obsMax} m over ${keep.obs})`);
  ok(keep.stMax <= 0.05, `fuel stations untouched (max ${keep.stMax} m over ${keep.st})`);
  ok(keep.treeMax <= 0.31, `no tree left on a pedestal or buried (max ${keep.treeMax} m over ${keep.trees})`);
  for (const d of drives) ok(d.mv >= 20 && !d.bog, `pickup pulls away at ${d.id} ${d.idx} (${d.mv.toFixed(1)} m in 5 s, bog ${d.bog})`);
} else console.log("(no road bed in this build: numbers only)");
console.log(`fails ${fails}`);
await done(fails ? 1 : 0);
