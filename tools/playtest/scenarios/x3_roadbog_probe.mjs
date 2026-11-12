// 3.1 beta 0127 (v191): bog-onset probe on the road bed. ORIG: : the pickup driven along real roads by a pure-pursuit driver (A/D/W keys), per route; closed Ifjordfjellet road; pole proximity.
// Reports per route: metres covered along the line in N game s, mean/max speed, bogs, crashes, max off-line distance.
import { boot, ev, tap, sleep, done, down, up, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const SLOW = true;
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(600);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
const seat = async () => {
  await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
  await sleep(800); await tap("KeyQ"); return waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14);
};
ok(await seat(), "seated in the pickup");
const routes = await J(`TLXR.routes.map((r, i) => ({ i, id: r.id, closed: r.closed, len: Math.round(r.len), n: r.pts.length }))`);
console.log("routes", JSON.stringify(routes));
const place = (ri, idx) => ev(`(() => { const r = TLXR.routes[${ri}]; const a = r.pts[${idx}], b = r.pts[Math.min(r.pts.length - 1, ${idx} + 3)]; BOG.on = false; BOG.acc = 0; BOG.immune = 0; crashCancel(); P.x = a[0]; P.z = a[1]; P.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); P.vx = P.vz = P.vy = 0; P.y = surf(a[0], a[1]) + 0.2; recenter(a[0], a[1], true); return 1; })()`);
// pure pursuit: nearest point index, aim 14 m ahead along the polyline
const steer = (ri) => J(`(() => { const r = TLXR.routes[${ri}]; let bi = 0, bd = 1e9; for (let i = 0; i < r.pts.length; i++) { const d = Math.hypot(r.pts[i][0] - P.x, r.pts[i][1] - P.z); if (d < bd) { bd = d; bi = i; } }
  let j = bi, acc = 0; while (j < r.pts.length - 1 && acc < 14) { acc += Math.hypot(r.pts[j + 1][0] - r.pts[j][0], r.pts[j + 1][1] - r.pts[j][1]); j++; }
  const t = r.pts[j]; let e = Math.atan2(t[0] - P.x, t[1] - P.z) - P.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
  return { bi, bd, e, end: bi >= r.pts.length - 3, v: Math.hypot(P.vx, P.vz), bog: BOG.on, crash: !!(CRASH && CRASH.on), yard: yardAt(P.x, P.z) }; })()`);
async function drive(ri, startIdx, secs) {
  await place(ri, startIdx); await waitGame(1.2);
  const t0 = await clock(); let maxOff = 0, vs = [], bogs = 0, wasBog = false, crashes = 0, wasCr = false, last = null, steerKey = null, stuck = 0, i0 = null;
  await down("KeyW"); let wOn = true;
  try {
    while ((await clock()) - t0 < secs) {
      const s = await steer(ri); last = s; if (i0 === null) i0 = s.bi;
      maxOff = Math.max(maxOff, s.bd); vs.push(s.v);
      if (s.bog && !wasBog) { bogs++; console.log('  bog onset', JSON.stringify(await J(`({ x: Math.round(P.x), z: Math.round(P.z), v: +Math.hypot(P.vx,P.vz).toFixed(1), yard: yardAt(P.x,P.z), depth: +(depthAt?0:0), pitch: +(P.pitch||0).toFixed(2), roll: +(P.roll||0).toFixed(2), why: (BOG.why||BOG.msg||'') , clock: +gameClock.toFixed(1) })`)), 'idx', s.bi, 'off', s.bd.toFixed(1), 'e', s.e.toFixed(2)); } wasBog = s.bog; if (s.crash && !wasCr) crashes++; wasCr = s.crash;
      if (SLOW) { const wantW = !(s.v > 7 && Math.abs(s.e) > 0.2) && s.v < 14; if (wantW !== wOn) { if (wantW) await down('KeyW'); else await up('KeyW'); wOn = wantW; } }
      const want = s.e > 0.08 ? "KeyA" : s.e < -0.08 ? "KeyD" : null;
      if (want !== steerKey) { if (steerKey) await up(steerKey); if (want) await down(want); steerKey = want; }
      if (s.end) break; if (s.crash) break;
      await sleep(100);
    }
  } finally { if (steerKey) await up(steerKey); await up("KeyW"); }
  const dt = (await clock()) - t0;
  return { ri, from: startIdx, idxMoved: last.bi - i0, dt: +dt.toFixed(1), vmean: +(vs.reduce((a, b) => a + b, 0) / Math.max(1, vs.length)).toFixed(1), vmax: +Math.max(...vs).toFixed(1), maxOff: +maxOff.toFixed(1), bogs, crashes, endBog: last.bog, end: last.end };
}
for (const [id, f] of [["fv888", 0.15], ["fv888", 0.5], ["lebesby", 0.15], ["skjanes", 0.15]]) {
  const r = routes.find(q => q.id === id); const o = await drive(r.i, Math.floor(r.n * f), 30); console.log("SLOW", id, f, JSON.stringify(o));
}
const g = await J(`TLXR.routes[0].pts.slice(138,160).map(p=>[Math.round(p[0]),Math.round(p[1])])`); console.log("fv888 138-160", JSON.stringify(g));
await done(0);
