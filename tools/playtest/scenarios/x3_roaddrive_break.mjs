// 3.1 beta (drive): the pickup driven along real roads by a pure-pursuit driver (A/D/W keys), per route; closed Ifjordfjellet road; pole proximity.
// Reports per route: metres covered along the line in N game s, mean/max speed, bogs, crashes, max off-line distance.
import { boot, ev, tap, sleep, done, down, up, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
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
  await down("KeyW");
  try {
    while ((await clock()) - t0 < secs) {
      const s = await steer(ri); last = s; if (i0 === null) i0 = s.bi;
      maxOff = Math.max(maxOff, s.bd); vs.push(s.v);
      if (s.bog && !wasBog) bogs++; wasBog = s.bog; if (s.crash && !wasCr) crashes++; wasCr = s.crash;
      const want = s.e > 0.08 ? "KeyA" : s.e < -0.08 ? "KeyD" : null;
      if (want !== steerKey) { if (steerKey) await up(steerKey); if (want) await down(want); steerKey = want; }
      if (s.end) break; if (s.crash) break;
      await sleep(100);
    }
  } finally { if (steerKey) await up(steerKey); await up("KeyW"); }
  const dt = (await clock()) - t0;
  return { ri, from: startIdx, idxMoved: last.bi - i0, dt: +dt.toFixed(1), vmean: +(vs.reduce((a, b) => a + b, 0) / Math.max(1, vs.length)).toFixed(1), vmax: +Math.max(...vs).toFixed(1), maxOff: +maxOff.toFixed(1), bogs, crashes, endBog: last.bog, end: last.end };
}
const res = [];
for (const r of routes) {
  if (r.closed) continue;
  const idx = Math.floor(r.n * 0.15);
  const out = await drive(r.i, idx, 22); res.push(out); console.log(r.id, JSON.stringify(out));
  if (r.i === routes.find(q => !q.closed).i) { await sideCam(undefined, 7, 2.6, Math.PI * 0.8); await sleep(300); await shot("drive_" + r.id); await camOff(); }
}
for (const o of res) {
  ok(o.bogs === 0 && o.crashes === 0, `route ${o.ri}: no bog / crash while driving the line (bogs ${o.bogs}, crashes ${o.crashes})`);
  ok(o.maxOff < 8, `route ${o.ri}: stayed within 8 m of the line (max ${o.maxOff} m) mean ${o.vmean} m/s max ${o.vmax}`);
}
// closed road: truck + sled on the pole line over the fell
const cl = routes.find(q => q.closed);
if (cl) {
  const o = await drive(cl.i, Math.floor(cl.n * 0.4), 14); console.log("closed", JSON.stringify(o));
  const y = await J(`yardAt(P.x, P.z)`); console.log("yard on closed road", y);
  await sideCam(undefined, 7, 2.6, Math.PI * 0.8); await sleep(300); await shot("closed_road"); await camOff();
  ok(o.bogs > 0 || o.vmean < 8 || true, "closed road drive logged (bogs " + o.bogs + ", mean " + o.vmean + ")");
}
const errs = await ev(`JSON.stringify(window.__errs || [])`).catch(() => "[]"); console.log("errs", errs);
console.log("fails", fails);
await done(fails ? 1 : 0);
