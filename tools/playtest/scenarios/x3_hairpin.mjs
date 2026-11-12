// Beta fix 0127 #2/#3: no bend on an open road tighter than ~10 m, and a pickup driven along fv888 / lebesby / skjanes
// by a driver who slows for bends doesn't bog. Asserting (exit 1 on a failure).
// A: geometry per open route, ROAD segments only (village streets are lanes, slow anyway): min turning radius through
//    points 2 back / 2 on (same measure as x3_roadhairpin_probe), windows under 8 m and under 10 m; boot cost.
// B: drive: pure pursuit 14 m ahead, throttle eased for the bend ahead (target speed from the radius 12-30 m on), 26 game
//    s per route from 15% and from 45% of the line; target speed sqrt(1.9 R) (5.3 m/s on a 15 m loop: what packed snow holds). No bog, within 8 m of the line.
import { boot, ev, tap, sleep, done, down, up, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(600);
// A
const geo = await J(`(() => { const R = (p, i) => { const a = p[i - 2], b = p[i], c = p[i + 2];
    const ab = Math.hypot(b[0]-a[0], b[1]-a[1]), bc = Math.hypot(c[0]-b[0], c[1]-b[1]), ca = Math.hypot(c[0]-a[0], c[1]-a[1]);
    const cr = Math.abs((b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0])); return cr < 1e-6 ? 1e9 : ab*bc*ca/(2*cr); };
  return { ms: TLXR.ms, bulbs: TLXR.bulbs, routes: TLXR.routes.filter(r => !r.closed).map(r => { let mn = 1e9, n8 = 0, n10 = 0, at = null, len = 0;
    for (const sg of r.segs) { if (sg.street) continue; const p = sg.pts; for (let i = 1; i < p.length; i++) len += Math.hypot(p[i][0]-p[i-1][0], p[i][1]-p[i-1][1]);
      for (let i = 2; i < p.length - 2; i++) { const v = R(p, i); if (v < 8) n8++; if (v < 10) n10++; if (v < mn) { mn = v; at = p[i].map(Math.round); } } }
    return { id: r.id, len: Math.round(len), minR: +mn.toFixed(1), at, n8, n10 }; }) }; })()`);
console.log("boot ms", geo.ms, "bulbs", geo.bulbs);
for (const r of geo.routes) { console.log("geo", JSON.stringify(r)); ok(r.minR >= 10, `${r.id}: tightest road bend ${r.minR} m >= 10 (under 8: ${r.n8}, under 10: ${r.n10}) at ${r.at}`); }
ok(geo.ms < 6000, `roads built in ${geo.ms} ms`);
// B
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "seated in the pickup");
const routes = await J(`TLXR.routes.map((r, i) => ({ i, id: r.id, closed: r.closed, n: r.pts.length }))`);
const place = (ri, idx) => ev(`(() => { const r = TLXR.routes[${ri}]; const a = r.pts[${idx}], b = r.pts[Math.min(r.pts.length - 1, ${idx} + 3)]; BOG.on = false; BOG.acc = 0; BOG.immune = 0; crashCancel(); P.x = a[0]; P.z = a[1]; P.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); P.vx = P.vz = P.vy = 0; P.y = surf(a[0], a[1]) + 0.2; recenter(a[0], a[1], true); return 1; })()`);
const steer = (ri) => J(`(() => { const r = TLXR.routes[${ri}], p = r.pts; let bi = 0, bd = 1e9; for (let i = 0; i < p.length; i++) { const d = Math.hypot(p[i][0] - P.x, p[i][1] - P.z); if (d < bd) { bd = d; bi = i; } }
  let j = bi, acc = 0; while (j < p.length - 1 && acc < 14) { acc += Math.hypot(p[j + 1][0] - p[j][0], p[j + 1][1] - p[j][1]); j++; }
  const tr = (i) => { const a = p[i - 2], b = p[i], c = p[i + 2]; const cr = Math.abs((b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0])); return cr < 1e-6 ? 1e9 : Math.hypot(b[0]-a[0], b[1]-a[1]) * Math.hypot(c[0]-b[0], c[1]-b[1]) * Math.hypot(c[0]-a[0], c[1]-a[1]) / (2 * cr); };
  let rmin = 1e9; for (let i = Math.max(2, bi + 1); i < Math.min(p.length - 2, bi + 9); i++) rmin = Math.min(rmin, tr(i));
  const t = p[j]; let e = Math.atan2(t[0] - P.x, t[1] - P.z) - P.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
  return { bi, bd, e, rmin, end: bi >= p.length - 3, v: Math.hypot(P.vx, P.vz), bog: BOG.on, yard: yardAt(P.x, P.z) }; })()`);
async function drive(ri, startIdx, secs) {
  await place(ri, startIdx); await waitGame(1.2);
  const t0 = await clock(); let brk = false, maxOff = 0, vs = [], bogs = 0, wasBog = false, last = null, steerKey = null, gas = false, i0 = null, bogAt = null;
  try {
    while ((await clock()) - t0 < secs) {
      const s = await steer(ri); last = s; if (i0 === null) i0 = s.bi;
      maxOff = Math.max(maxOff, s.bd); vs.push(s.v);
      if (s.bog && !wasBog) { bogs++; bogAt = { bi: s.bi, off: +s.bd.toFixed(1), yard: +s.yard.toFixed(2) }; } wasBog = s.bog;
      const vt = Math.min(14, Math.max(3.5, Math.sqrt(1.9 * s.rmin))), wantGas = s.v < vt;
      if (wantGas !== gas) { if (wantGas) await down("KeyW"); else await up("KeyW"); gas = wantGas; }
      const wantBrk = s.v > vt + 2.5;
      if (wantBrk !== brk) { if (wantBrk) await down("KeyS"); else await up("KeyS"); brk = wantBrk; }
      const want = s.e > 0.08 ? "KeyA" : s.e < -0.08 ? "KeyD" : null;
      if (want !== steerKey) { if (steerKey) await up(steerKey); if (want) await down(want); steerKey = want; }
      if (s.end) break;
      await sleep(100);
    }
  } finally { if (steerKey) await up(steerKey); await up("KeyW"); await up("KeyS"); }
  return { ri, from: startIdx, moved: last.bi - i0, vmean: +(vs.reduce((a, b) => a + b, 0) / Math.max(1, vs.length)).toFixed(1), maxOff: +maxOff.toFixed(1), bogs, bogAt };
}
let shotDone = false;
for (const id of ["fv888", "lebesby", "skjanes"]) {
  const r = routes.find(q => q.id === id); if (!r) { ok(false, id + " route exists"); continue; }
  for (const f of [0.15, 0.45]) {
    const o = await drive(r.i, Math.floor(r.n * f), 26); console.log("drive", id, JSON.stringify(o));
    ok(o.bogs === 0, `${id} from ${f * 100}%: no bog driving the line (bogs ${o.bogs}${o.bogAt ? " at " + JSON.stringify(o.bogAt) : ""})`);
    ok(o.maxOff < 8, `${id} from ${f * 100}%: within 8 m of the line (max ${o.maxOff} m), ${o.moved} points at mean ${o.vmean} m/s`);
    ok(o.moved > 20, `${id} from ${f * 100}%: got somewhere (${o.moved} points)`);
    if (!shotDone && !process.env.NOSTILLS) { shotDone = true; await sideCam(undefined, 9, 6, Math.PI * 0.8); await sleep(300); await shot("drive_" + id); await camOff(); }
  }
}
console.log("fails", fails);
await done(fails ? 1 : 0);
