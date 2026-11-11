// Expansion slice 2.6c: towing a strapped sled on the sled trailer behind the pickup. Asserts, exit 1 on a failure.
//   The strapped sled is weight on the truck (its mass goes up by the sled's 280 kg, it pulls away slower than with the
//   trailer empty); towed down a lane the sled stays glued to its strap point; the Map's Sled pin follows it; a reload while
//   driving keeps the truck, the hitch and the strap; a ramp left down drags and says so once; the receiver's rating counts
//   the sled when hitching; a sled towing its own rig can't be strapped (hint says why); unstrap on keyboard, pad and touch
//   (hint per scheme); unstrapped, the sled backs down the ramp off the hitched trailer. Headless ~0.6x: gameClock throughout.
import { boot, ev, tap, sleep, done, park, padSet, padOff, shot, down, up, reload, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(120); } return false; }
async function holdFor(codes, secs) { codes = [].concat(codes); for (const c of codes) await down(c); await waitGame(secs); for (const c of codes) await up(c); }
const hookToasts = () => ev(`(() => { const o = toast; toast = (m, k) => { (window.__T = window.__T || []).push(m); return o(m, k); }; return 1; })()`);
const toasts = () => J(`(window.__T || []).concat((typeof TOASTQ !== "undefined" ? TOASTQ : []).map(t => t.msg), [...$("toasts").children].map(c => c.textContent))`);
const clearToasts = () => ev(`window.__T = []; if (typeof TOASTQ !== "undefined") TOASTQ.length = 0; $("toasts").textContent = ""; true`);
const LIM = 2.25 - 0.06 - 1.5;
// where the sled is (P or its parked record) in the trailer's frame
const SL = () => J(`(() => { const s = TLX.state("vehicles"), h = TLXV.haul(), p = s.cur == null ? P : s.sled, L = TLXV.haulLocal(h, p.x, p.z);
  return { lx: L.x, lz: L.z, yaw: ((p.yaw - h.yaw + 3 * Math.PI) % (2 * Math.PI)) - Math.PI, x: p.x, z: p.z, cur: s.cur, on: h.on, strap: h.strap, ramp: h.ramp, hx: h.x, hz: h.z,
    mass: TLXV.rt() ? TLXV.rt().mass : null, sp: Math.hypot(P.vx, P.vz), foot: FOOT.on, use: FOOT.on ? footUse() : null, hint: $("wnHint").textContent, fin: [P.x, P.y, P.z, P.yaw].every(Number.isFinite) }; })()`);
const pressUseTouch = () => ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);
const walkerBeside = (side = 1) => ev(`(() => { const h = TLXV.haul(), w = TLXV.haulWorld(h, ${side} * (TLXV.HAUL.deckW / 2 + 0.75), ${LIM});
  crashCancel(); FOOT.on = true; FOOT.x = w[0]; FOOT.z = w[1]; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - ${side} * Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const atCoupler = () => ev(`(() => { const h = TLXV.haul(), c = TLXV.haulCoupler(h), lx = Math.cos(h.yaw), lz = -Math.sin(h.yaw); crashCancel(); FOOT.on = true; FOOT.x = c[0] + lx * 1.6; FOOT.z = c[1] + lz * 1.6; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await hookToasts();
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`);
console.log("parked", JSON.stringify(await park()));
// buy the pickup and the trailer on the Trucks tab
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); true`); await sleep(400);
const how = await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).textContent`);
ok(/strap it down; then tow it/.test(how), "the Trucks tab's trailer row says how to load and tow a sled");
await ev(`closeGarage(); true`); await sleep(300);
ok(await ev(`TLX.state("vehicles").owned.length === 1 && !!TLXV.haul()`), "own the pickup and the sled trailer");

// the pickup at the start of a long plowed lane, the trailer hitched behind it, ramp up, empty
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Y.r > 2.5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
ok(lane && lane.L > 35, `a plowed lane to tow on (${lane ? lane.L.toFixed(0) : 0} m)`);
await ev(`window.__LANE = ${JSON.stringify(lane)}; (() => { const L = __LANE, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L, yaw = Math.atan2(ux, uz);
  const r = TLX.state("vehicles").owned[0]; r.x = L.x + ux * 11; r.z = L.z + uz * 11; r.yaw = yaw;
  const h = TLXV.haul(), bx = r.x - ux * 3.1, bz = r.z - uz * 3.1; h.on = r.uid; h.ramp = 0; h.strap = null; h.yaw = yaw; h.x = bx - ux * TLXV.HAUL.L; h.z = bz - uz * TLXV.HAUL.L;
  recenter(r.x, r.z, true); return 1; })()`);
// get in: walker beside the cab, Q
await ev(`(() => { const r = TLX.state("vehicles").owned[0], fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.on = true; FOOT.x = r.x + fz * 3.2 - fx * 0.3; FOOT.z = r.z - fx * 3.2 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(1200); await tap("KeyQ"); await sleep(300);
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "Q gets in the pickup");
await waitGame(0.6);
// put the truck back at the lane start, still, with the trailer straight behind it
const resetRig = () => ev(`(() => { const L = __LANE, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L, yaw = Math.atan2(ux, uz);
  P.x = L.x + ux * 11; P.z = L.z + uz * 11; P.yaw = yaw; P.vx = P.vz = P.vy = 0; P.yr = 0; P.y = surf(P.x, P.z);
  const h = TLXV.haul(), b = TLXV.ballOf(h.on); h.yaw = yaw; h.x = b[0] - ux * TLXV.HAUL.L; h.z = b[1] - uz * TLXV.HAUL.L; recenter(P.x, P.z, true); return 1; })()`);
async function pull(secs) { await resetRig(); await waitGame(0.8); await resetRig(); await waitGame(0.2); const p0 = await J(`({ x: P.x, z: P.z })`);
  const drift = []; const t0 = await clock(); await down("KeyW");
  while ((await clock()) - t0 < secs) { const s = await SL(); if (s.strap) drift.push(Math.hypot(s.lx - s.strap.x, s.lz - s.strap.z)); await sleep(100); }
  await up("KeyW"); const p1 = await J(`({ x: P.x, z: P.z, bog: BOG.on })`); const s = await SL();
  return { d: Math.hypot(p1.x - p0.x, p1.z - p0.z), bog: p1.bog, drift, s }; }

// ---- 1. empty trailer: baseline mass and pull
let s = await SL(); const m0 = s.mass;
const A = await pull(3.0);
console.log("empty pull", A.d.toFixed(2), "mass", m0);
ok(A.d > 5 && !A.bog, `the pickup pulls the empty trailer ${A.d.toFixed(1)} m in 3 s`);

// ---- 2. the sled strapped on: weight on the truck
await ev(`(() => { TLXV.haul().strap = { x: 0, z: ${LIM}, yaw: 0 }; return 1; })()`); await waitGame(0.4);
s = await SL(); const m1 = s.mass;
ok(m1 - m0 > 250 && m1 - m0 < 340, `strapped, the truck carries the sled too (mass ${m0.toFixed(0)} -> ${m1.toFixed(0)} kg)`);
ok(Math.abs(s.lx) < 0.02 && Math.abs(s.lz - LIM) < 0.02, `the sled sits at its strap point on the deck (lx ${s.lx.toFixed(3)}, lz ${s.lz.toFixed(2)})`);
await sideCam("[TLXV.haul().x, P.y + 0.6, TLXV.haul().z]", 8, 2.4); await sleep(500); await shot("x2tow_0_loaded"); await camOff();
const B = await pull(3.0);
console.log("loaded pull", B.d.toFixed(2), "max drift", Math.max(0, ...B.drift).toFixed(4));
ok(B.d < A.d - 0.15 && B.d > 3, `loaded, it pulls away slower: ${B.d.toFixed(1)} m vs ${A.d.toFixed(1)} m empty in 3 s`);
ok(B.drift.length > 5 && Math.max(...B.drift) < 0.05, `towed, the sled stays on its strap point (max drift ${Math.max(0, ...B.drift).toFixed(3)} m over ${B.drift.length} samples)`);
// a turn too
await holdFor(["KeyW", "KeyA"], 2.0); s = await SL();
ok(Math.hypot(s.lx - s.strap.x, s.lz - s.strap.z) < 0.05 && Math.abs(s.yaw) < 0.02 && s.fin, `through a turn it stays strapped in place (yaw off the deck ${s.yaw.toFixed(3)})`);
await shot("x2tow_1_chase");
// the Map's Sled pin is where the sled is (on the trailer): read pin, sled and trailer in one frame
const pin = await J(`(() => { const s = TLX.state("vehicles"), h = TLXV.haul(), p = TABLET.layers.vehicles.flatMap(f => f()).find(q => q.name === "Sled");
  return p ? { toSled: Math.hypot(p.x - s.sled.x, p.z - s.sled.z), toTrailer: Math.hypot(p.x - h.x, p.z - h.z) } : null; })()`);
ok(pin && pin.toSled < 0.05 && pin.toTrailer < 2.5, `the Map's Sled pin rides with it on the trailer (${pin ? pin.toTrailer.toFixed(2) : "none"} m from the trailer's axle)`);
await ev(`P.vx = P.vz = 0; if (BOG.on) freeBog(); true`); await waitGame(0.4); await resetRig(); await waitGame(0.6);

// ---- 3. reload while driving it: truck, hitch and strap all come back
const before = await SL();
await reload(); await sleep(1500); await hookToasts(); await ev(`WX.at = () => 0; GS.storm = 0; true`); await waitGame(1.2);
s = await SL();
console.log("after reload", JSON.stringify(s));
ok(s.cur === "v1" && s.on === "v1" && !!s.strap && !s.foot, `after a reload: in the pickup, trailer hitched, sled strapped (cur ${s.cur}, on ${s.on})`);
ok(Math.hypot(s.lx - s.strap.x, s.lz - s.strap.z) < 0.05 && Math.hypot(s.hx - before.hx, s.hz - before.hz) < 0.5 && s.mass - m0 > 250 && s.fin, `the sled is still on its strap point, the trailer where it was, weight still on the truck (${s.mass.toFixed(0)} kg)`);

// ---- 4. towing with the ramp down drags, and says so once
await ev(`TLXV.haul().ramp = 1; true`); await waitGame(1.2);
await clearToasts();
const d0 = await ev(`TLXV.rt().drag`);
await holdFor("KeyW", 3.0);
let tl = await toasts(); const rampT = tl.filter(t => /ramp is down and dragging/.test(t));
const dRamp = await ev(`TLXV.rt().drag`), spR = await ev(`Math.hypot(P.vx, P.vz)`);
console.log("ramp down: speed", spR.toFixed(2), "bog", await ev("BOG.on"));
ok(rampT.length >= 1 && /E at the tail/.test(rampT[0]), `towing with the ramp down: "${rampT[0] || "no toast"}"`);
await clearToasts(); await holdFor("KeyW", 1.5); tl = await toasts();
ok(!tl.some(t => /ramp is down and dragging/.test(t)), "the warning comes once, not every frame");
await down("KeyW"); await waitGame(0.6);
const dDown = await ev(`TLXV.rt().drag`); await ev(`TLXV.haul().ramp = 0; true`); await waitGame(0.15); const dUp = await ev(`TLXV.rt().drag`);
await up("KeyW");
ok(dDown - dUp > 1700 && dDown - dUp < 2700, `the ramp's lip drags: ${dDown.toFixed(0)} N with it down, ${dUp.toFixed(0)} N the moment it's up`);
await ev(`P.vx = P.vz = 0; TLXV.haul().ramp = 0; true`); await waitGame(1.2);

// ---- 5. the receiver's rating counts the sled: a 600 kg ball refuses trailer + sled, 1500 kg takes it
await tap("KeyQ"); ok(await waitUntil("FOOT.on && !DMT.on", 12), "Q gets out");
await ev(`TLXV.haul().on = null; TLXV.VEHICLES[0].hitchKg = 600; true`);
await atCoupler(); await waitGame(0.6);
s = await SL(); ok(s.use === "HITCH", `at the coupler: use would hitch (${s.use}; "${s.hint}")`);
await clearToasts(); await tap("KeyE"); await waitGame(0.4);
s = await SL(); tl = await toasts();
ok(s.on === null && tl.some(t => /rated for 600 kg; the trailer with the sled on it is 7\d\d kg/.test(t)), `a 600 kg receiver refuses it: "${tl.find(t => /rated/.test(t)) || "none"}"`);
await ev(`TLXV.VEHICLES[0].hitchKg = 1500; true`); await tap("KeyE"); await waitGame(0.4);
s = await SL(); ok(s.on === "v1", `the pickup's 1500 kg receiver takes it (on ${s.on})`);

// ---- 6. beside the deck: unstrap on keyboard; a sled towing a rig can't be strapped; pad and touch prompts
await walkerBeside(1); await waitGame(0.8);
s = await SL(); console.log("beside", JSON.stringify(s));
ok(s.use === "UNSTRAP" && /E: unstrap the sled/.test(s.hint), `keyboard beside the deck: "${s.hint}"`);
await tap("KeyE"); await waitGame(0.4); s = await SL(); ok(!s.strap, "E unstraps it");
await ev(`(() => { const o = GS.own; o.partsOwned["recv:ball"] = true; o.partsOwned["hitch:trailer"] = true; o.parts.recv = "ball"; o.parts.hitch = "trailer"; restat(); TLX.state("vehicles").rig = { on: "sled", kind: "trailer" }; return 1; })()`);
await waitGame(0.6); s = await SL();
ok(s.use === null && /Unhitch the trailer from the sled first/.test(s.hint), `with a rig on the sled it won't strap: "${s.hint}"`);
await ev(`(() => { TLX.state("vehicles").rig = { on: "sled", kind: "none" }; GS.own.parts.hitch = PARTS.hitch.options[0].id; restat(); return 1; })()`); await waitGame(0.6);
s = await SL(); ok(s.use === "STRAP", `rig gone, use reads ${s.use}`);
await padSet({ 10: 1 }); await sleep(350); await padSet(); await sleep(450);
s = await SL(); ok(!!s.strap && /L3: unstrap the sled/.test(s.hint), `Xbox pad L3 straps it; hint "${s.hint}"`);
await padOff();
const PS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";
await padSet({ 10: 1 }, [0, 0, 0, 0], PS); await sleep(350); await padSet({}, [0, 0, 0, 0], PS); await sleep(450);
s = await SL(); ok(!s.strap && /L3: strap the sled/.test(s.hint), `DualSense L3 unstraps it; hint "${s.hint}"`);
await padOff();
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await waitGame(0.6);
let t = await J(`({ t: $("tcUse").hidden ? null : $("tcUse").textContent, hint: $("wnHint").textContent })`);
ok(t.t === "STRAP" && /tap STRAP/.test(t.hint), `touch: the use button reads ${t.t}; "${t.hint}"`);
await pressUseTouch(); await waitGame(0.4); s = await SL(); ok(!!s.strap, "touch STRAP straps it");
await pressUseTouch(); await waitGame(0.4); s = await SL(); ok(!s.strap, "touch UNSTRAP unstraps it");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(300);

// ---- 7. unstrapped, the sled backs down the ramp off the hitched trailer
await ev(`TLXV.haul().ramp = 1; true`); await waitGame(1.4);
ok(await waitUntil(`TLX.state("vehicles").cur == null`, 4), "beside the deck the sled is the nearest machine (cur sled)");
await ev(`crashCancel(); FOOT.on = false; MNT.on = DMT.on = false; true`); await waitGame(0.3);
await down("KeyS"); const tb = await clock(); const back = [];
while ((await clock()) - tb < 10) { s = await SL(); back.push(s); if (s.lz < -3.2 - 1.5) break; await sleep(100); }
await up("KeyS"); await waitGame(1.2);
s = await SL(); const onDeck = await ev(`!!TLXV.sledOnDeck(P.x, P.z, P.y)`);
console.log("backed off", JSON.stringify(s), back.length);
ok(!onDeck && s.lz < -3.05 && s.fin && s.on === "v1", `reversing takes it down the ramp off the hitched trailer (lz ${s.lz.toFixed(2)})`);
await sideCam("[TLXV.haulTail(TLXV.haul())[0], P.y + 0.5, TLXV.haulTail(TLXV.haul())[1]]", 6, 2.2); await sleep(500); await shot("x2tow_2_unloaded"); await camOff();

// ---- 8. a corrupt saved strap spot (40 m ahead, facing backwards) loads clamped onto the deck (report 0100)
await ev(`save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
sv.x.sys.vehicles.s.haul.strap = { x: 0.9, z: 40, yaw: 3.0 };
await reload(sv); await sleep(1500); await waitGame(0.8);
const cs = await J(`TLXV.haul().strap`);
ok(cs && Math.abs(cs.x) <= 0.3 && cs.z <= 0.7 && cs.z >= -0.6 && Math.abs(cs.yaw) <= 0.35, `a corrupt strap spot loads clamped onto the deck (${JSON.stringify(cs)})`);

console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
