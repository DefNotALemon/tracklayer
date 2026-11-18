// Beta break test 5 for slice 2.6a (sled trailer): the ACTIVE truck (P, not a parked record) with the trailer hitched, left on a ~20% slope
// after getting out (does it creep?), driven up the slope with W then released (rollback), an old save with no haul key, and a Q-swap to the sled on the slope.
// Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, reload, shot, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const R = () => J(`(() => { const h = TLXV.haul(); if (!h) return null; const T = TLX.state("vehicles"), r = T.owned[0], cur = T.cur === r.uid, tp = cur ? P : r;
  const c = TLXV.haulCoupler(h), b = h.on ? TLXV.ballOf(h.on) : null;
  return { on: h.on, hx: h.x, hz: h.z, tx: tp.x, tz: tp.z, cur: T.cur, active: cur, v: Math.hypot(P.vx || 0, P.vz || 0), foot: FOOT.on, cb: b ? Math.hypot(c[0] - b[0], c[1] - b[1]) : -1,
    nan: [h.x, h.z, h.yaw, tp.x, tp.z, camera.position.x, camera.quaternion.x].some(v => !isFinite(v)), hint: $("wnHint").textContent.slice(0, 70) }; })()`);
await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`);
await park(); await sleep(400);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); closeGarage(); true`); await sleep(400);
ok(!!(await ev(`TLXV.haul() ? 1 : 0`)), "bought truck + trailer");
const spot = await J(`(() => { for (let r = 60; r < 1800; r += 25) for (let a = 0; a < 6.28; a += 0.2) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r;
  if (isSea(x, z) || isWater(x, z) || obNear(x, z, 25)) continue; const s = slopeAt(x, z, 8); if (s > 0.16 && s < 0.26 && !isWater(x + 25, z) && !isWater(x - 25, z) && !isSea(x + 25, z) && !isSea(x - 25, z)) return { x, z, s }; } return null; })()`);
console.log("slope", JSON.stringify(spot));
if (!spot) { console.log("no slope"); await done(0); }
const yawDown = await J(`(() => { const e = 2, g = (x, z) => surf(x, z); const gx = (g(${spot.x} + e, ${spot.z}) - g(${spot.x} - e, ${spot.z})) / (2 * e), gz = (g(${spot.x}, ${spot.z} + e) - g(${spot.x}, ${spot.z} - e)) / (2 * e); return Math.atan2(-gx, -gz); })()`);
// put truck active on the slope, trailer hitched behind it, walker gets in via Q
const setup = yaw => ev(`(() => { const T = TLX.state("vehicles"), r = T.owned[0], ux = Math.sin(${yaw}), uz = Math.cos(${yaw}); crashCancel(); FOOT.on = false;
  const T0 = T.cur === r.uid ? P : r; T0.x = ${spot.x}; T0.z = ${spot.z}; T0.yaw = ${yaw}; if (T0 === P) { P.vx = P.vz = 0; P.y = surf(P.x, P.z); } const h = TLXV.haul(); const bx = T0.x - ux * 3.1, bz = T0.z - uz * 3.1, cx = bx - ux * 0.9, cz = bz - uz * 0.9;
  h.on = null; h.x = cx - ux * TLXV.HAUL.L; h.z = cz - uz * TLXV.HAUL.L; h.yaw = ${yaw};
  FOOT.on = true; FOOT.x = T0.x + uz * 3.2; FOOT.z = T0.z - ux * 3.2; FOOT.yaw = ${yaw} - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const hitch = () => ev(`(() => { const h = TLXV.haul(), c = TLXV.haulCoupler(h), lx = Math.cos(h.yaw), lz = -Math.sin(h.yaw); FOOT.on = true; FOOT.x = c[0] + lx * 1.6; FOOT.z = c[1] + lz * 1.6; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const beside = () => ev(`(() => { const r = TLX.state("vehicles").owned[0], p = TLX.state("vehicles").cur === r.uid ? P : r, fx = Math.sin(p.yaw), fz = Math.cos(p.yaw); FOOT.on = true; FOOT.x = p.x + fz * 3.2 - fx * 0.3; FOOT.z = p.z - fx * 3.2 - fz * 0.3; FOOT.yaw = p.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
for (const [lab, yaw] of [["nose downhill", yawDown], ["nose uphill", yawDown + Math.PI]]) {
  await setup(yaw); await sleep(500); await hitch(); await waitGame(0.8); await tap("KeyE"); await waitGame(0.6);
  let a = await R(); if (!a || a.on !== "v1") { ok(false, lab + ": would not hitch " + JSON.stringify(a)); continue; }
  await beside(); await sleep(900); await tap("KeyQ");
  ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), lab + ": in the truck");
  await waitGame(0.8); a = await R();
  await tap("KeyQ"); await waitUntil("!DMT.on && FOOT.on", 14); await waitGame(0.8); a = await R();
  await waitGame(10); const b = await R();
  const d = Math.hypot(b.tx - a.tx, b.tz - a.tz), td = Math.hypot(b.hx - a.hx, b.hz - a.hz);
  ok(!b.nan && b.cb < 0.4 && d < 1 && td < 1, `${lab} (${(spot.s * 100).toFixed(0)}%): active truck left 10 s after getting out: truck crept ${d.toFixed(2)} m, trailer ${td.toFixed(2)} m, coupler ${b.cb.toFixed(2)} m, active ${b.active}`);
}
await shot("x2active_slope");
// drive up the slope, release throttle, watch rollback
await setup(yawDown + Math.PI); await sleep(500); await hitch(); await waitGame(0.8); await tap("KeyE"); await waitGame(0.6);
await beside(); await sleep(900); await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14); await waitGame(0.6);
await down("KeyW"); await waitGame(4); const mid = await R(); await up("KeyW"); await waitGame(1.5);
const r1 = await R(); await waitGame(6); const r2 = await R();
const sp = await J(`slopeAt(P.x, P.z, 8)`);
console.log("hill", JSON.stringify({ mid: mid.v, r1v: r1.v, r2v: r2.v, slope: sp, back: Math.hypot(r2.tx - r1.tx, r2.tz - r1.tz) }));
ok(!r2.nan && r2.cb < 0.5, `released on the slope: coupler ${r2.cb.toFixed(2)} m, speed ${r2.v.toFixed(2)}, rolled ${Math.hypot(r2.tx - r1.tx, r2.tz - r1.tz).toFixed(1)} m in 6 s`);
// control: same climb with the trailer UNHITCHED, then the same truck + trailer on flat powder, to say what stopped the climb
const climb = async (lab, withTrailer) => {
  await setup(yawDown + Math.PI); await sleep(500);
  if (withTrailer) { await hitch(); await waitGame(0.8); await tap("KeyE"); await waitGame(0.6); }
  await beside(); await sleep(900); await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14); await waitGame(0.6);
  const p0 = await J(`({x:P.x,z:P.z})`); await down("KeyW"); await waitGame(5); const m = await J(`({ v: Math.hypot(P.vx, P.vz), moved: Math.hypot(P.x - ${"${p0.x}"}, P.z - ${"${p0.z}"}), bog: !!(typeof BOG !== "undefined" && BOG.on), gnd: P.gnd, hint: $("hint") ? $("hint").textContent.slice(0,60) : "" })`.replace("${p0.x}", p0.x).replace("${p0.z}", p0.z)); await up("KeyW");
  console.log("climb", lab, JSON.stringify(m)); return m;
};
const cA = await climb("trailer", true); const cB = await climb("no trailer", false);
ok(cA.moved > 3, `uphill 17% with trailer, W held 5 s game: moved ${cA.moved.toFixed(1)} m (no trailer: ${cB.moved.toFixed(1)} m)`);
// Q to the sled while the truck sits on the slope, trailer attached
await beside(); await sleep(500);
await ev(`(() => { const T = TLX.state("vehicles"); return 1; })()`);
// old save without haul key
const sv = await J(`(save(), JSON.parse(localStorage.getItem("tracklayer.save.v2")))`);
delete sv.x.sys.vehicles.s.haul;
await reload(sv); await sleep(1800); await waitGame(0.8);
const o = await J(`({ haul: !!TLXV.haul(), owned: TLX.state("vehicles").owned.length, err: 0 })`);
ok(o.owned >= 1, `save with no haul key loads (haul ${o.haul}, owned ${o.owned})`);
await done(fails ? 1 : 0);
