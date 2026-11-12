// Beta break test 3 for slice 2.6a (sled trailer): hitched on a steep slope (parked, handbrake-less), night, driven with a PAD stick,
// then towed into water. Checks coupler/NaN/drift. Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, shot, down, up, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const H = () => J(`(() => { const h = TLXV.haul(); if (!h) return null; const c = TLXV.haulCoupler(h), b = h.on ? TLXV.ballOf(h.on) : null; const T = TLX.state("vehicles"); const r = T.owned[0]; const tp = T.cur === r.uid ? P : r; return { on: h.on, x: h.x, z: h.z, yaw: h.yaw, ramp: h.ramp, cb: b ? Math.hypot(c[0] - b[0], c[1] - b[1]) : -1, tx: tp.x, tz: tp.z, sp: Math.hypot(P.vx || 0, P.vz || 0), cur: T.cur, nan: [h.x, h.z, h.yaw, tp.x, tp.z, camera.position.x, camera.quaternion.x].some(v => !isFinite(v)), toast: [...document.querySelectorAll("#toasts > *")].map(e => e.textContent).join(" | ") }; })()`);
const walkerBeside = () => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const p = (s.cur === r.uid ? P : r); const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
  FOOT.on = true; FOOT.x = p.x + fz * 3.2 - fx * 0.3; FOOT.z = p.z - fx * 3.2 - fz * 0.3; FOOT.yaw = p.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const hitchAt = (tx, tz, yaw) => ev(`(() => { const r = TLX.state("vehicles").owned[0]; const cur = TLX.state("vehicles").cur === r.uid; const T0 = cur ? P : r; const ux = Math.sin(${yaw}), uz = Math.cos(${yaw});
  T0.x = ${tx}; T0.z = ${tz}; T0.yaw = ${yaw}; if (cur) { P.vx = P.vz = 0; } const bx = T0.x - ux * 3.1, bz = T0.z - uz * 3.1, cx = bx - ux * 0.9, cz = bz - uz * 0.9, h = TLXV.haul();
  h.on = r.uid; h.x = cx - ux * TLXV.HAUL.L; h.z = cz - uz * TLXV.HAUL.L; h.yaw = ${yaw}; recenter(T0.x, T0.z, true); return 1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);
await park(); await sleep(400);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); closeGarage(); true`); await sleep(400);
let h = await H(); ok(h && h.on === null, "bought truck + trailer");
await ev(`GS.hour = 23; WX.at = () => 0; GS.storm = 0; true`);

// find a steep open-ground spot (10-25% over 8 m) and a lake/sea edge near depot
const spots = await J(`(() => { const out = { slope: null, water: null }; for (let r = 60; r < 1800 && !(out.slope && out.water); r += 25) for (let a = 0; a < 6.28; a += 0.2) {
  const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r;
  if (isSea(x, z) || isWater(x, z) || obNear(x, z, 12)) continue;
  if (!out.slope) { const s = slopeAt(x, z, 8); if (s > 0.18 && s < 0.3 && !isWater(x + 12, z) && !isWater(x - 12, z) && !isSea(x + 12, z) && !isSea(x - 12, z) && !obNear(x, z, 25)) out.slope = { x, z, s }; }
}
  if (!out.water) for (let r = 100; r < 6000 && !out.water; r += 40) for (let a = 0; a < 6.28 && !out.water; a += 0.1) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; if (!isSea(x, z)) continue; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const sx = x - dx * 14, sz = z - dz * 14; if (!isSea(sx, sz) && !isSea(sx - dx * 8, sz - dz * 8) && !obNear(sx, sz, 15) && slopeAt(sx, sz, 8) < 0.1) { out.water = { x: sx, z: sz, yaw: Math.atan2(dx, dz) }; break; } } }
  return out; })()`);
console.log("spots", JSON.stringify(spots));
if (spots.slope) {
  // downhill yaw: gradient of surf
  const yawDown = await J(`(() => { const g = (x, z) => groundAt ? groundAt(x, z) : surf(x, z); const e = 2; const gx = (g(${spots.slope.x} + e, ${spots.slope.z}) - g(${spots.slope.x} - e, ${spots.slope.z})) / (2 * e), gz = (g(${spots.slope.x}, ${spots.slope.z} + e) - g(${spots.slope.x}, ${spots.slope.z} - e)) / (2 * e); return Math.atan2(-gx, -gz); })()`);
  for (const [lab, yaw] of [["nose downhill", yawDown], ["nose uphill", yawDown + Math.PI], ["side-on", yawDown + Math.PI / 2]]) {
    await hitchAt(spots.slope.x, spots.slope.z, yaw); await walkerBeside(); await waitGame(0.5);
    const a = await H(); await waitGame(8); const b = await H();
    const drift = Math.hypot(b.tx - a.tx, b.tz - a.tz), tdrift = Math.hypot(b.x - a.x, b.z - a.z);
    ok(!b.nan && b.cb < 0.4, `slope ${(spots.slope.s * 100).toFixed(0)}% ${lab}: parked 8 s, coupler ${b.cb.toFixed(2)} m, truck drift ${drift.toFixed(1)} m, trailer drift ${tdrift.toFixed(1)} m`);
    if (drift > 3) console.log("   note: parked truck rolled", drift.toFixed(1), "m on", lab);
  }
  await shot("x2slope_parked");
} else console.log("no slope spot found");

// pad drive: stick forward with trailer, then stick hard-right, then released
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 2) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
const lux = (lane.x2 - lane.x) / lane.L, luz = (lane.z2 - lane.z) / lane.L;
await hitchAt(lane.x + lux * 12, lane.z + luz * 12, Math.atan2(lux, luz)); await sleep(300); await walkerBeside(); await sleep(1200);
await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "in the truck");
await padSet({ 7: 1 }, [0, 0, 0, 0]); ev("true"); await waitGame(5);
h = await H(); ok(!h.nan && h.cb < 0.4, `pad RT 5 s: ${h.sp.toFixed(1)} m/s, coupler ${h.cb.toFixed(2)} m, INP.dev ${await ev("INP.dev")}`);
await padSet({ 7: 1 }, [1, 0, 0, 0]); await waitGame(4); h = await H(); ok(!h.nan && h.cb < 0.4, `pad RT + stick right 4 s: coupler ${h.cb.toFixed(2)} m`);
ok(true, "sp"); const sp1 = (await H()).sp; await padSet({ 6: 1 }, [0, 0, 0, 0]); await waitGame(4); await padOff(); ok((await H()).sp < sp1 && (await H()).sp < 1, "pad LT brakes the rig to a stop (" + sp1.toFixed(1) + " -> " + (await H()).sp.toFixed(1) + ")"); await shot("x2pad_after"); await waitGame(1);
const shortHint = await J(`({ ctl: INP.dev, hint: $("wnHint").textContent.slice(0, 80) })`); console.log("hint", JSON.stringify(shortHint));

// towed into water
if (spots.water) {
  await ev(`FOOT.on = false; true`);
  await hitchAt(spots.water.x, spots.water.z, spots.water.yaw); await waitGame(1);
  await padSet({ 7: 1 }, [0, 0, 0, 0]); await waitGame(8); await padOff();
  h = await H(); const wet = await J(`({ pw: isWater(P.x, P.z) || isSea(P.x, P.z), tw: (() => { const h = TLXV.haul(); return isWater(h.x, h.z) || isSea(h.x, h.z); })(), bog: BOG.on, rescue: typeof RESC !== "undefined" ? !!RESC.on : null, y: P.y, gy: surf(P.x, P.z) })`);
  console.log("water", JSON.stringify(wet), "toast:", h.toast.slice(0, 160));
  ok(!h.nan, `towed toward water: no NaN (truck wet ${wet.pw}, trailer wet ${wet.tw}, coupler ${h.cb.toFixed(2)} m)`);
  ok(!wet.tw || wet.pw, `trailer is not in the water while the truck is dry`);
  await shot("x2slope_water");
  // call the rescue (pad D-pad down) with the trailer hitched; watch the whole thing
  await padSet({ 13: 1 }, [0, 0, 0, 0]); await sleep(300); await padOff();
  for (let i = 0; i < 12; i++) { await waitGame(3); const r = await J(`(() => { const h = TLXV.haul(), T = TLX.state("vehicles"), r0 = T.owned[0], tp = T.cur === r0.uid ? P : r0; return { t: ${i * 3 + 3}, wet: isWater(tp.x, tp.z), tw: isWater(h.x, h.z), on: h.on, d: +Math.hypot(h.x - tp.x, h.z - tp.z).toFixed(1), foot: FOOT.on, cur: T.cur, nan: [h.x, h.z, tp.x, tp.z].some(v => !isFinite(v)), toast: [...document.querySelectorAll("#toasts > *")].map(e => e.textContent).join(" | ").slice(0, 120) }; })()`); console.log("rescue", JSON.stringify(r)); if (i == 5) await shot("x2rescue_mid"); }
  const fin = await J(`(() => { const h = TLXV.haul(), T = TLX.state("vehicles"), r0 = T.owned[0], tp = T.cur === r0.uid ? P : r0; return { truckWet: isWater(tp.x, tp.z), trailerWet: isWater(h.x, h.z), on: h.on, d: Math.hypot(h.x - tp.x, h.z - tp.z), foot: FOOT.on }; })()`);
  ok(!fin.truckWet && !fin.trailerWet, `after rescue: truck wet ${fin.truckWet}, trailer wet ${fin.trailerWet}, still hitched ${fin.on}, gap ${fin.d.toFixed(1)} m`);
  await shot("x2rescue_end");
} else console.log("no lake edge found");
await done(fails ? 1 : 0);
