// Expansion slice 2.6a: the sled trailer. Asserts, exit 1 on a failure.
//   Bought on the garage's Trucks tab (one per player, parked on the forecourt on its jack); on foot at its coupler, use
//   hitches it to a truck whose ball is in reach (pad L3 here) and unhitches it (touch); it follows the pickup on a single
//   axle (coupler stays on the ball, it lags through a turn, the jackknife stop holds when reversing), the truck carries its
//   420 kg; use at its tail lowers / raises the ramp (keyboard E); a truck's ball holds the rig or the trailer, not both; the
//   walker is stopped by it; the Map pins it; a reload keeps it hitched, or free with the ramp down, where it was.
// Headless Chrome runs ~0.6x real time: everything is measured by gameClock.
import { boot, ev, tap, sleep, done, park, padSet, padOff, shot, down, up, reload, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(150); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
async function holdFor(codes, secs) { codes = [].concat(codes); for (const c of codes) await down(c); await waitGame(secs); for (const c of codes) await up(c); }
const hookToasts = () => ev(`(() => { const o = toast; toast = (m, k) => { (window.__T = window.__T || []).push(m); return o(m, k); }; return 1; })()`);
const toasts = () => J(`(window.__T || []).concat((TOASTQ || []).map(t => t.msg), [...$("toasts").children].map(c => c.textContent))`);
const H = () => J(`(() => { const h = TLXV.haul(); if (!h) return null; const c = TLXV.haulCoupler(h), b = h.on ? TLXV.ballOf(h.on) : null, s = TLX.state("vehicles"), r = s.owned[0], ty = r ? (s.cur === r.uid ? P.yaw : r.yaw) : 0;
  let rel = ((h.yaw - ty + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return { on: h.on, x: h.x, z: h.z, yaw: h.yaw, ramp: h.ramp, cb: b ? Math.hypot(c[0] - b[0], c[1] - b[1]) : -1, rel, use: footUse(), hint: $("wnHint").textContent, cur: s.cur }; })()`);
// the walker 1.6 m to the side of the coupler (outside the trailer's box), or at its tail
const atCoupler = () => ev(`(() => { const h = TLXV.haul(), c = TLXV.haulCoupler(h), lx = Math.cos(h.yaw), lz = -Math.sin(h.yaw); crashCancel(); FOOT.on = true; FOOT.x = c[0] + lx * 1.6; FOOT.z = c[1] + lz * 1.6; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const atTail = () => ev(`(() => { const h = TLXV.haul(), t = TLXV.haulTail(h); crashCancel(); FOOT.on = true; FOOT.x = t[0] - Math.sin(h.yaw) * 0.3; FOOT.z = t[1] - Math.cos(h.yaw) * 0.3; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const walkerBeside = (off = 3.2) => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  FOOT.on = true; FOOT.x = x + fz * ${off} - fx * 0.3; FOOT.z = z - fx * ${off} - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const pressUseTouch = () => ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await hookToasts();
await ev(`crashCancel(); FOOT.on = false; true`);
console.log("parked", JSON.stringify(await park()));
ok((await ev(`TLX.state("vehicles").haul === null`)) === true, "a new save owns no sled trailer (state.haul null)");

// ---- 1. buy the pickup and the trailer on the Trucks tab
await ev(`GS.cash = 9000; true`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
const rowTxt = await ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)); return r ? r.textContent : ""; })()`);
ok(/\$950/.test(rowTxt) && /not to the sled/.test(rowTxt), "the Trucks tab sells the Fjordhenger sled trailer for $950 (a truck's trailer, not the sled's)");
const cash0 = await ev("GS.cash");
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); true`); await sleep(400);
let h = await H();
ok(h && h.on === null && h.ramp === 0 && cash0 - (await ev("GS.cash")) === 950, `bought: it stands free with the ramp up, $950 paid (on ${h && h.on})`);
ok(await ev(`(() => { const h = TLXV.haul(); return yardAt(h.x, h.z) > 0.3 || yardAt(...TLXV.haulCoupler(h)) > 0.3; })()`), "it is parked on the plowed forecourt");
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); true`); await sleep(300);
ok((await toasts()).some(t => /already own the sled trailer/.test(t)) && cash0 - (await ev("GS.cash")) === 950, "a second click doesn't buy a second one");
await ev(`closeGarage(); true`); await sleep(300);

// ---- 2. truck on a plowed lane, the trailer behind it with the coupler 0.9 m short of the ball
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Y.r > 2) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
ok(lane && lane.L > 35, `a plowed lane to drive on (${lane ? lane.L.toFixed(0) : 0} m)`);
await ev(`(() => { const L = ${JSON.stringify(lane)}, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L, yaw = Math.atan2(ux, uz);
  const r = TLX.state("vehicles").owned[0]; r.x = L.x + ux * 12; r.z = L.z + uz * 12; r.yaw = yaw;
  const bx = r.x - ux * 3.1, bz = r.z - uz * 3.1, cx = bx - ux * 0.9, cz = bz - uz * 0.9, h = TLXV.haul();
  h.x = cx - ux * TLXV.HAUL.L; h.z = cz - uz * TLXV.HAUL.L; h.yaw = yaw;
  P.x = r.x + uz * 25; P.z = r.z - ux * 25; P.vx = P.vz = 0; P.y = surf(P.x, P.z);
  recenter(r.x, r.z, true); return 1; })()`);
await atCoupler(); await waitGame(1.2);
h = await H();
ok(h.use === "HITCH" && /hitch the sled trailer to the pickup/.test(h.hint), `in reach of the pickup's ball: use would hitch (${h.use}; "${h.hint}")`);
await shot("x2haul_free");

// ---- 3. a truck's ball holds the rig or the trailer, never both: with the trailer on, the rig's tongue can't take that ball
await padSet({ 10: 1 }); await sleep(350); await padSet(); await sleep(450); await padOff();
h = await H();
ok(h.on === "v1" && h.cb < 0.1, `pad L3 hitches it to the pickup (on ${h.on}, coupler ${h.cb.toFixed(3)} m from the ball)`);
ok((await toasts()).some(t => /sled trailer is hitched/.test(t)), "a toast says it's hitched");
const rigTest = await J(`(() => { const o = GS.own; o.partsOwned["recv:ball"] = true; o.partsOwned["hitch:trailer"] = true; o.parts.recv = "ball"; o.parts.hitch = "trailer"; restat();
  const s = TLX.state("vehicles"); s.rig = { on: null, kind: "trailer" }; const b = TLXV.ballOf("v1"), r = s.owned[0];
  TOW.kind = "trailer"; TOW.yaw = r.yaw + 1.2; TOW.x = b[0] - Math.sin(TOW.yaw) * (HITCH.trailer.len + 0.3); TOW.z = b[1] - Math.cos(TOW.yaw) * (HITCH.trailer.len + 0.3);
  const t = TLXV.tongueTip(); FOOT.x = t[0] + 0.5; FOOT.z = t[1]; const f = TLXV.rigFoot(); return { label: f ? f.label : "none", what: f ? f.what : "" }; })()`);
ok(rigTest.label === null, `the rig's tongue at that same ball finds no free ball (label ${rigTest.label}: "${rigTest.what}")`);
await ev(`(() => { const s = TLX.state("vehicles"); s.rig = { on: "sled", kind: "trailer" }; GS.own.parts.hitch = PARTS.hitch.options[0].id; restat(); return 1; })()`); await waitGame(0.4);

// ---- 4. the pickup pulls it
await walkerBeside(3.2); await sleep(1200);
await tap("KeyQ"); await sleep(300);
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 12), "Q gets in the truck");
await waitGame(0.5);
const h0 = await H(), p0 = await J(`({ x: P.x, z: P.z })`);
await holdFor("KeyW", 4);
const run = await J(`({ x: P.x, z: P.z, mass: TLXV.rt().mass, bog: BOG.on })`); h = await H();
const dT = Math.hypot(run.x - p0.x, run.z - p0.z), dR = Math.hypot(h.x - h0.x, h.z - h0.z);
console.log("tow run", JSON.stringify(run), JSON.stringify(h), "truck", dT.toFixed(1), "trailer", dR.toFixed(1));
ok(dT > 8 && dR > 6 && !run.bog, `the pickup tows it down the lane: truck ${dT.toFixed(1)} m, trailer ${dR.toFixed(1)} m`);
ok(h.cb >= 0 && h.cb < 0.15, `the coupler stays on the ball (${h.cb.toFixed(3)} m)`);
ok(run.mass >= 1900 + 420, `the truck carries its weight (${run.mass.toFixed(0)} kg)`);
await shot("x2haul_tow_chase");
await holdFor(["KeyW", "KeyA"], 2.2);
h = await H();
ok(Math.abs(h.rel) > 0.05 && Math.abs(h.rel) < 1.23 && h.cb < 0.2, `through a turn it trails the truck at an angle (${(h.rel * 57.3).toFixed(0)}°), coupler on the ball`);
await shot("x2haul_turn");
await ev(`P.vx = P.vz = 0; true`); await waitGame(0.5);
// reversing with the wheel hard over: the jackknife stop holds at 70°
await holdFor(["KeyS", "KeyD"], 5);
h = await H();
console.log("reverse", JSON.stringify(h));
ok(Math.abs(h.rel) <= 1.23 && h.cb < 0.2, `reversing hard over, it never folds past the jackknife stop (${(h.rel * 57.3).toFixed(0)}°)`);
await ev(`P.vx = P.vz = 0; true`); await waitGame(0.3);
// the truck slewed 100° round on the spot (as a hard reverse would fold it): the tongue binds at 70°
await ev(`P.yaw += 1.75; true`); await waitGame(0.4);
h = await H();
ok(Math.abs(Math.abs(h.rel) - 1.2217) < 0.03 && h.cb < 0.05, `folded past it, the trailer is held at the stop (${(h.rel * 57.3).toFixed(1)}°, coupler ${h.cb.toFixed(3)} m)`);
await ev(`P.yaw -= 1.75; true`); await waitGame(0.3);
await ev(`(() => { const h = TLXV.haul(), b = TLXV.ballOf("v1"); h.yaw = P.yaw; h.x = b[0] - Math.sin(P.yaw) * TLXV.HAUL.L; h.z = b[1] - Math.cos(P.yaw) * TLXV.HAUL.L; return 1; })()`); await waitGame(0.3);
await ev(`P.vx = P.vz = 0; true`); await waitGame(0.6);
await sideCam("[TLXV.haul().x, P.y + 0.6, TLXV.haul().z]", 8, 2.4); await sleep(500);
await shot("x2haul_side"); await camOff();

// ---- 5. out of the truck: the ramp (keyboard E at the tail)
await tap("KeyQ"); await sleep(300);
ok(await waitUntil("FOOT.on && !DMT.on", 12), "Q gets out");
await atTail(); await waitGame(0.6);
h = await H();
ok(h.use === "LOWER RAMP" && /E: lower the trailer's ramp/.test(h.hint), `at the tail: "${h.hint}" (${h.use})`);
await tap("KeyE"); await waitGame(1.6);
h = await H(); const hx = await ev("TLXV.haulR().hinge.rotation.x");
ok(h.ramp === 1 && hx < -0.2, `E lowers the ramp (ramp ${h.ramp}, gate at ${(hx * 57.3).toFixed(0)}°)`);
await sideCam("[TLXV.haulTail(TLXV.haul())[0], P.y + 0.5, TLXV.haulTail(TLXV.haul())[1]]", 5.5, 1.8); await sleep(500);
await shot("x2haul_ramp"); await camOff();

// ---- 6. the walker is stopped by it; the Map pins it while you aren't driving it
const blk = await J(`(() => { const h = TLXV.haul(), fx = Math.sin(h.yaw), fz = Math.cos(h.yaw); const x = h.x + fx * 0.8 + fz * 0.3, z = h.z + fz * 0.8 - fx * 0.3; const [nx, nz] = VEH.block(x, z), dx = nx - h.x, dz = nz - h.z;
  return { lx: dx * fz - dz * fx, lz: dx * fx + dz * fz }; })()`);
ok(Math.abs(blk.lx) >= 1.08 + 0.3 || blk.lz < -1.65 - 0.3 || blk.lz > 3.6 + 0.3, `a step onto the deck is pushed off the trailer (lx ${blk.lx.toFixed(2)}, lz ${blk.lz.toFixed(2)})`);
const pins = await J(`TABLET.layers.vehicles.flatMap(f => f()).map(p => p.name)`);
ok(pins.includes("Sled trailer"), "the Map pins the sled trailer: " + pins.join(", "));

// ---- 7. touch: UNHITCH at the coupler; it stays put when the truck moves
await atCoupler(); await waitGame(0.4);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await waitGame(0.6);
let t = await J(`({ t: $("tcUse").hidden ? null : $("tcUse").textContent, hint: $("wnHint").textContent })`);
ok(t.t === "UNHITCH" && /tap UNHITCH/.test(t.hint), `touch: the use button reads ${t.t}; "${t.hint}"`);
await pressUseTouch(); await waitGame(0.4);
h = await H(); ok(h.on === null && (await toasts()).some(t => /sled trailer stands free/.test(t)), `touch UNHITCH takes it off the truck (on ${h.on})`);
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(300);
const free = await H();
await ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; if (s.cur === r.uid) { P.x += Math.sin(P.yaw) * 10; P.z += Math.cos(P.yaw) * 10; } else { r.x += Math.sin(r.yaw) * 10; r.z += Math.cos(r.yaw) * 10; } return 1; })()`);
await waitGame(0.5);
h = await H(); ok(Math.hypot(h.x - free.x, h.z - free.z) < 0.01, `the truck pulls away; the trailer stays where it stood (moved ${Math.hypot(h.x - free.x, h.z - free.z).toFixed(3)} m)`);

// ---- 8. reload: free with the ramp down, where it was
await reload(); await sleep(1500); await hookToasts(); await waitGame(0.6);
h = await H();
ok(h && h.on === null && h.ramp === 1 && Math.hypot(h.x - free.x, h.z - free.z) < 0.05, `after a reload it is free, ramp down, where it stood (moved ${h ? Math.hypot(h.x - free.x, h.z - free.z).toFixed(3) : "-"} m)`);
// back the truck up to it, hitch with keyboard E, reload: still hitched
await ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0], h = TLXV.haul(), c = TLXV.haulCoupler(h), fx = Math.sin(h.yaw), fz = Math.cos(h.yaw);
  const x = c[0] + fx * (3.1 + 0.5), z = c[1] + fz * (3.1 + 0.5); if (s.cur === r.uid) { P.x = x; P.z = z; P.yaw = h.yaw; P.vx = P.vz = 0; } else { r.x = x; r.z = z; r.yaw = h.yaw; } return 1; })()`);
await atCoupler(); await waitGame(1.0);
h = await H(); ok(h.use === "HITCH" && /E: hitch the sled trailer/.test(h.hint), `backed up again: "${h.hint}"`);
await tap("KeyE"); await waitGame(0.4);
h = await H(); ok(h.on === "v1", `E hitches it (on ${h.on})`);
await reload(); await sleep(1500); await waitGame(0.6);
h = await H();
ok(h && h.on === "v1" && h.cb < 0.2, `after a reload it is still on the pickup (on ${h && h.on}, coupler ${h ? h.cb.toFixed(3) : "-"} m from the ball)`);

await done(fails ? 1 : 0);
