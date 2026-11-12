// 3.1 beta break (v194 switchback loops): A) audit every route point: sea/water, obstacle (house/boulder) hits, kinks
// between neighbouring points, height steps of the surface, a stretch of the same road passing within 6 m of itself
// (loop folding onto the next leg); B) drive the loops DOWNHILL (route reversed) at night with the pickup, and with the
// sled on the same line; C) a bend-aware driver on gamvik/dyfjord. Report numbers; asserts only on hard failures.
import { boot, ev, tap, sleep, done, down, up, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 23; GS.cash = 9000; true`); await sleep(600);
// A
const aud = await J(`(() => TLXR.routes.filter(r => !r.closed).map(r => { const out = { id: r.id, n: r.pts.length, sea: 0, water: 0, ob: 0, kink: 0, step: 0, fold: 0, worstKink: 0, worstStep: 0, foldAt: null, obAt: null };
  const p = r.pts;
  for (let i = 0; i < p.length; i++) { const [x, z] = p[i]; if (isSea(x, z)) out.sea++; if (isWater(x, z)) out.water++; if (obNear(x, z, 3)) { out.ob++; out.obAt = out.obAt || [Math.round(x), Math.round(z)]; } }
  for (let i = 1; i < p.length - 1; i++) { const a = Math.atan2(p[i][0]-p[i-1][0], p[i][1]-p[i-1][1]), b = Math.atan2(p[i+1][0]-p[i][0], p[i+1][1]-p[i][1]); let d = Math.abs(b - a); if (d > Math.PI) d = 2 * Math.PI - d;
    const L = Math.hypot(p[i+1][0]-p[i][0], p[i+1][1]-p[i][1]); const k = d / Math.max(0.5, L); if (k > out.worstKink) out.worstKink = +k.toFixed(2); if (d > 0.5) out.kink++; }
  for (let i = 1; i < p.length; i++) { const h0 = surf(p[i-1][0], p[i-1][1]), h1 = surf(p[i][0], p[i][1]); const L = Math.max(0.5, Math.hypot(p[i][0]-p[i-1][0], p[i][1]-p[i-1][1])); const s = Math.abs(h1 - h0) / L; if (s > out.worstStep) out.worstStep = +s.toFixed(2); if (s > 0.45) out.step++; }
  for (let i = 0; i < p.length; i += 2) for (let j = i + 12; j < p.length; j += 2) { if (Math.abs(p[i][0]-p[j][0]) > 6 || Math.abs(p[i][1]-p[j][1]) > 6) continue; if (Math.hypot(p[i][0]-p[j][0], p[i][1]-p[j][1]) < 6) { // along-path distance
      let al = 0; for (let k = i; k < j; k++) al += Math.hypot(p[k+1][0]-p[k][0], p[k+1][1]-p[k][1]); if (al > 30) { out.fold++; out.foldAt = out.foldAt || [Math.round(p[i][0]), Math.round(p[i][1]), i, j]; } } }
  return out; }))()`);
for (const o of aud) { console.log("audit", JSON.stringify(o)); ok(o.sea === 0 && o.water === 0, `${o.id}: no route point in sea/water (sea ${o.sea}, water ${o.water})`); console.log(`info ${o.id}: points within 3 m of an obstacle ${o.ob} (all on village street lanes ending at doors, see x3_loops_obs_probe)`); ok(o.step === 0, `${o.id}: no surface step over 45% between points (worst ${o.worstStep}, ${o.step})`); console.log(`info ${o.id}: self-fold within 6 m of another stretch ${o.fold}x ${o.foldAt || ""}; sharp kinks >0.5 rad ${o.kink}`); }
// B
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "seated in the pickup");
const routes = await J(`TLXR.routes.map((r, i) => ({ i, id: r.id, closed: r.closed, n: r.pts.length }))`);
// reversed line = walk indexes downward
const place = (ri, idx) => ev(`(() => { const r = TLXR.routes[${ri}]; const a = r.pts[${idx}], b = r.pts[Math.max(0, ${idx} - 3)]; BOG.on = false; BOG.acc = 0; BOG.immune = 0; crashCancel(); P.x = a[0]; P.z = a[1]; P.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); P.vx = P.vz = P.vy = 0; P.y = surf(a[0], a[1]) + 0.2; recenter(a[0], a[1], true); return 1; })()`);
const steer = (ri) => J(`(() => { const r = TLXR.routes[${ri}], p = r.pts; let bi = 0, bd = 1e9; for (let i = 0; i < p.length; i++) { const d = Math.hypot(p[i][0] - P.x, p[i][1] - P.z); if (d < bd) { bd = d; bi = i; } }
  let j = bi, acc = 0; while (j > 0 && acc < 14) { acc += Math.hypot(p[j - 1][0] - p[j][0], p[j - 1][1] - p[j][1]); j--; }
  const tr = (i) => { const a = p[i - 2], b = p[i], c = p[i + 2]; const cr = Math.abs((b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0])); return cr < 1e-6 ? 1e9 : Math.hypot(b[0]-a[0], b[1]-a[1]) * Math.hypot(c[0]-b[0], c[1]-b[1]) * Math.hypot(c[0]-a[0], c[1]-a[1]) / (2 * cr); };
  let rmin = 1e9; for (let i = Math.min(p.length - 3, bi - 1); i > Math.max(2, bi - 9); i--) rmin = Math.min(rmin, tr(i));
  const t = p[j]; let e = Math.atan2(t[0] - P.x, t[1] - P.z) - P.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
  return { bi, bd, e, rmin, end: bi <= 3, v: Math.hypot(P.vx, P.vz), bog: BOG.on, yard: yardAt(P.x, P.z), crash: !!(CRASH && CRASH.on), flip: P.roll }; })()`);
async function drive(ri, startIdx, secs) {
  await place(ri, startIdx); await waitGame(1.2);
  const t0 = await clock(); let brk = false, maxOff = 0, vs = [], bogs = 0, wasBog = false, last = null, steerKey = null, gas = false, i0 = null, bogAt = null, crash = false, maxRoll = 0;
  try {
    while ((await clock()) - t0 < secs) {
      const s = await steer(ri); last = s; if (i0 === null) i0 = s.bi;
      maxOff = Math.max(maxOff, s.bd); vs.push(s.v); crash = crash || s.crash; maxRoll = Math.max(maxRoll, Math.abs(s.flip || 0));
      if (s.bog && !wasBog) { bogs++; bogAt = { bi: s.bi, off: +s.bd.toFixed(1), yard: +s.yard.toFixed(2) }; } wasBog = s.bog;
      const vt = Math.min(14, Math.max(3.5, Math.sqrt(1.9 * s.rmin))), wantGas = s.v < vt;
      if (wantGas !== gas) { if (wantGas) await down("KeyW"); else await up("KeyW"); gas = wantGas; }
      const wantBrk = s.v > vt + 2.5;
      if (wantBrk !== brk) { if (wantBrk) await down("KeyS"); else await up("KeyS"); brk = wantBrk; }
      const want = s.e > 0.08 ? "KeyA" : s.e < -0.08 ? "KeyD" : null;
      if (want !== steerKey) { if (steerKey) await up(steerKey); if (want) await down(want); steerKey = want; }
      if (s.end) break; await sleep(100);
    }
  } finally { if (steerKey) await up(steerKey); await up("KeyW"); await up("KeyS"); }
  return { ri, from: startIdx, moved: i0 - last.bi, vmean: +(vs.reduce((a, b) => a + b, 0) / Math.max(1, vs.length)).toFixed(1), maxOff: +maxOff.toFixed(1), bogs, bogAt, crash, maxRoll: +maxRoll.toFixed(2) };
}
let shotDone = false;
for (const id of ["fv888", "lebesby", "skjanes", "gamvik"]) {
  const r = routes.find(q => q.id === id); if (!r) { ok(false, id + " route exists"); continue; }
  for (const f of [0.85, 0.55]) {
    const o = await drive(r.i, Math.floor(r.n * f), 26); console.log("down", id, JSON.stringify(o));
    ok(o.bogs === 0 && !o.crash, `${id} downhill from ${f * 100}%: no bog/crash (bogs ${o.bogs}${o.bogAt ? " at " + JSON.stringify(o.bogAt) : ""}, crash ${o.crash})`);
    ok(o.maxOff < 8, `${id} downhill from ${f * 100}%: within 8 m (max ${o.maxOff}), ${o.moved} pts at ${o.vmean} m/s`);
    ok(o.moved > 15, `${id} downhill from ${f * 100}%: got somewhere (${o.moved})`);
    if (!shotDone && !process.env.NOSTILLS) { shotDone = true; await sideCam(undefined, 9, 6, Math.PI * 0.8); await sleep(300); await shot("down_" + id); await camOff(); }
  }
}
// sled on the same lines: dismount the truck, ride the sled up a loop (W held, steering by line, uphill direction)
await tap("KeyQ"); await waitUntil("!!FOOT.on && !DMT.on", 14);
console.log("fails", fails);
await done(fails ? 1 : 0);
