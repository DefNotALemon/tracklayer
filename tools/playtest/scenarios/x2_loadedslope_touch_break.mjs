// Beta break test 4 for slice 2.6a/2.6b (trailer with a strapped sled): loaded rig parked on a ~20% slope (does it creep?),
// save + reload on the slope (does the rig and strap come back, still still?), then TOUCH driving (GAS pedal) with the loaded rig.
// Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, reload, shot, send } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const R = () => J(`(() => { const h = TLXV.haul(); if (!h) return null; const T = TLX.state("vehicles"), r = T.owned[0], tp = T.cur === r.uid ? P : r, sp = T.cur == null ? P : (T.sled || VEH.sled);
  const L = TLXV.haulLocal(h, sp.x, sp.z); const c = TLXV.haulCoupler(h), b = h.on ? TLXV.ballOf(h.on) : null;
  return { on: h.on, strap: h.strap, hx: h.x, hz: h.z, tx: tp.x, tz: tp.z, sx: sp.x, sz: sp.z, lx: L.x, lz: L.z, cb: b ? Math.hypot(c[0] - b[0], c[1] - b[1]) : -1, cur: T.cur, v: Math.hypot(P.vx || 0, P.vz || 0), foot: FOOT.on, dev: INP.dev,
    nan: [h.x, h.z, h.yaw, tp.x, tp.z, sp.x, sp.z, camera.position.x, camera.quaternion.x].some(v => !isFinite(v)), hint: $("wnHint").textContent.slice(0, 70) }; })()`);
const drift = (a, b) => ({ truck: Math.hypot(b.tx - a.tx, b.tz - a.tz), trailer: Math.hypot(b.hx - a.hx, b.hz - a.hz), sled: Math.hypot(b.sx - a.sx, b.sz - a.sz) });

await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`);
await park(); await sleep(400);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); closeGarage(); true`); await sleep(400);
ok(!!(await ev(`TLXV.haul() ? 1 : 0`)), "bought truck + trailer");

const spot = await J(`(() => { for (let r = 60; r < 1800; r += 25) for (let a = 0; a < 6.28; a += 0.2) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r;
  if (isSea(x, z) || isWater(x, z) || obNear(x, z, 25)) continue; const s = slopeAt(x, z, 8); if (s > 0.16 && s < 0.26 && !isWater(x + 14, z) && !isWater(x - 14, z) && !isSea(x + 14, z) && !isSea(x - 14, z)) return { x, z, s }; } return null; })()`);
console.log("slope spot", JSON.stringify(spot));
if (!spot) { console.log("no slope"); await done(0); }
const yawDown = await J(`(() => { const g = (x, z) => surf(x, z), e = 2; const gx = (g(${spot.x} + e, ${spot.z}) - g(${spot.x} - e, ${spot.z})) / (2 * e), gz = (g(${spot.x}, ${spot.z} + e) - g(${spot.x}, ${spot.z} - e)) / (2 * e); return Math.atan2(-gx, -gz); })()`);
// hitch + strap a sled aboard on the slope, nose DOWNhill (worst case), truck active (walker gets in)
const setup = (yaw) => ev(`(() => { const r = TLX.state("vehicles").owned[0], ux = Math.sin(${yaw}), uz = Math.cos(${yaw}); r.x = ${spot.x}; r.z = ${spot.z}; r.yaw = ${yaw}; crashCancel(); FOOT.on = false;
  const bx = r.x - ux * 3.1, bz = r.z - uz * 3.1, cx = bx - ux * 0.9, cz = bz - uz * 0.9, h = TLXV.haul(); h.on = r.uid; h.x = cx - ux * TLXV.HAUL.L; h.z = cz - uz * TLXV.HAUL.L; h.yaw = ${yaw}; h.ramp = 0;
  const lim = 2.25 - 0.06 - 1.5, w = TLXV.haulWorld(h, 0, lim - 0.05); const s = TLX.state("vehicles"); const p = s.cur == null ? P : (s.sled || VEH.sled); p.x = w[0]; p.z = w[1]; p.yaw = h.yaw; if (s.cur == null) { P.vx = P.vz = P.vy = 0; P.yr = 0; } p.y = TLXV.deckAt(p.x, p.z, 99);
  recenter(r.x, r.z, true); return 1; })()`);
await setup(yawDown); await sleep(600);
await ev(`(() => { const h = TLXV.haul(), w = TLXV.haulWorld(h, TLXV.HAUL.deckW / 2 + 0.75, 0.7); FOOT.on = true; FOOT.x = w[0]; FOOT.z = w[1]; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await waitGame(0.8); await tap("KeyE"); await waitGame(0.6);
let a = await R(); ok(!!a.strap && a.on === "v1", `sled strapped on a hitched trailer on a ${(spot.s * 100).toFixed(0)}% slope, nose downhill`);
await waitGame(8); let b = await R(); let d = drift(a, b);
ok(!b.nan && d.truck < 1 && d.trailer < 1 && d.sled < 1, `parked loaded 8 s: drift truck ${d.truck.toFixed(1)}, trailer ${d.trailer.toFixed(1)}, sled ${d.sled.toFixed(1)} m, coupler ${b.cb.toFixed(2)}`);
await shot("x2ls_parked");

// save, reload on the slope
await ev(`save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
console.log("saved haul", JSON.stringify(sv.x.sys.vehicles.s.haul));
await reload(sv); await sleep(1500); await ev(`WX.at = () => 0; GS.storm = 0; true`); await waitGame(1);
a = await R(); ok(a && !a.nan && a.on === "v1" && !!a.strap, `after reload: rig ${a && a.on ? "still hitched" : "unhitched"}, strap ${a && a.strap ? "kept" : "LOST"}, coupler ${a && a.cb.toFixed(2)}`);
await waitGame(8); b = await R(); d = drift(a, b);
ok(!b.nan && d.truck < 1 && d.trailer < 1 && d.sled < 1, `reloaded rig 8 s: drift truck ${d.truck.toFixed(1)}, trailer ${d.trailer.toFixed(1)}, sled ${d.sled.toFixed(1)} m`);

// touch drive: move the whole rig to a plowed lane, get in, press the GAS pedal
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
const ux = (lane.x2 - lane.x) / lane.L, uz = (lane.z2 - lane.z) / lane.L;
spot.x = lane.x + ux * 14; spot.z = lane.z + uz * 14; await setup(Math.atan2(ux, uz)); await sleep(500);
// strap was kept by the reload, so the sled is on the deck already (setup() re-placed it). Walker to the truck.
await ev(`(() => { const r = TLX.state("vehicles").owned[0], p = TLX.state("vehicles").cur === r.uid ? P : r, fx = Math.sin(p.yaw), fz = Math.cos(p.yaw); FOOT.on = true; FOOT.x = p.x + fz * 3.2 - fx * 0.3; FOOT.z = p.z - fx * 3.2 - fz * 0.3; FOOT.yaw = p.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(1000);
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(300);
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(500);
const q = await J(`({ dev: INP.dev, on: !$("tcOn").hidden, qt: $("tcOn").textContent })`);
console.log("touch on-foot buttons", JSON.stringify(q));
await ev(`$("tcOn").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", pointerId: 7, isPrimary: true })); true`); await sleep(120);
await ev(`$("tcOn").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch", pointerId: 7, isPrimary: true })); true`);
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), `touch GET ON enters the truck (button said "${q.qt}")`);
const g0 = await R();
await ev(`$("tcGas").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", pointerId: 8, isPrimary: true, clientX: 0, clientY: 0 })); true`);
await waitGame(5); const g1 = await R();
await ev(`$("tcGas").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch", pointerId: 8, isPrimary: true })); true`);
const mv = Math.hypot(g1.tx - g0.tx, g1.tz - g0.tz);
ok(!g1.nan && mv > 5, `touch GAS 5 s with the loaded rig: truck moved ${mv.toFixed(1)} m, speed ${g1.v.toFixed(1)} m/s, coupler ${g1.cb.toFixed(2)}, dev ${g1.dev}`);
ok(g1.strap && Math.hypot(g1.lx - g1.strap.x, g1.lz - g1.strap.z) < 0.1, `sled still at its strap spot (lx ${g1.lx.toFixed(2)}, lz ${g1.lz.toFixed(2)})`);
await shot("x2ls_touch");
await ev(`$("tcBrk").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", pointerId: 9, isPrimary: true })); true`); await waitGame(5);
const g2 = await R(); await ev(`$("tcBrk").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch", pointerId: 9, isPrimary: true })); true`);
ok(g2.v < g1.v && g2.v < 2, `touch BRAKE stops it (${g1.v.toFixed(1)} -> ${g2.v.toFixed(1)} m/s)`);
await send("Emulation.setTouchEmulationEnabled", { enabled: false });
await done(fails ? 1 : 0);
