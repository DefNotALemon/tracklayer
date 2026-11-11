// Beta break test for slice 2.6a (sled trailer). Tries to break it: bad saved trailers (NaN, huge coords, string ramp, truck
// gone, rig and trailer both claiming one truck), reload while driving with it hitched, truck teleported far away, swap to the
// sled with the trailer on the truck, touch HITCH label, pad L3 at the tail, night, rig + trailer fighting for one ball.
// Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, reload, shot, down, up, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
async function holdFor(code, s) { await down(code); await waitGame(s); await up(code); }
const H = () => J(`(() => { const h = TLXV.haul(); if (!h) return null; const c = TLXV.haulCoupler(h), b = h.on ? TLXV.ballOf(h.on) : null; return { on: h.on, x: h.x, z: h.z, yaw: h.yaw, ramp: h.ramp, cb: b ? Math.hypot(c[0] - b[0], c[1] - b[1]) : -1, use: footUse(), hint: $("wnHint").textContent, cur: TLX.state("vehicles").cur, nan: [h.x, h.z, h.yaw, camera.position.x, camera.quaternion.x].some(v => !isFinite(v)) }; })()`);
const atCoupler = () => ev(`(() => { const h = TLXV.haul(), c = TLXV.haulCoupler(h), lx = Math.cos(h.yaw), lz = -Math.sin(h.yaw); crashCancel(); FOOT.on = true; FOOT.x = c[0] + lx * 1.6; FOOT.z = c[1] + lz * 1.6; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const atTail = () => ev(`(() => { const h = TLXV.haul(), t = TLXV.haulTail(h); crashCancel(); FOOT.on = true; FOOT.x = t[0] - Math.sin(h.yaw) * 0.3; FOOT.z = t[1] - Math.cos(h.yaw) * 0.3; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const walkerBeside = key => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const p = ${key === "sled" ? "(s.cur == null ? P : s.sled)" : "(s.cur === r.uid ? P : r)"}; const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
  FOOT.on = true; FOOT.x = p.x + fz * 3.2 - fx * 0.3; FOOT.z = p.z - fx * 3.2 - fz * 0.3; FOOT.yaw = p.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);
await park(); await sleep(400);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); closeGarage(); true`); await sleep(400);
let h = await H(); ok(h && h.on === null, "bought truck + trailer");
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Y.r > 2) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
const setup = () => ev(`(() => { const L = ${JSON.stringify(lane)}, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L, yaw = Math.atan2(ux, uz);
  const r = TLX.state("vehicles").owned[0]; const cur = TLX.state("vehicles").cur === r.uid; const T0 = cur ? P : r; T0.x = L.x + ux * 12; T0.z = L.z + uz * 12; T0.yaw = yaw; if (cur) { P.vx = P.vz = 0; }
  const bx = T0.x - ux * 3.1, bz = T0.z - uz * 3.1, cx = bx - ux * 0.9, cz = bz - uz * 0.9, h = TLXV.haul();
  h.on = null; h.x = cx - ux * TLXV.HAUL.L; h.z = cz - uz * TLXV.HAUL.L; h.yaw = yaw; recenter(T0.x, T0.z, true); return 1; })()`);
await setup(); await atCoupler(); await waitGame(1);

// ---- 1. touch HITCH label (the existing test only covers UNHITCH)
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await waitGame(0.6);
let t = await J(`({ t: $("tcUse").hidden ? null : $("tcUse").textContent, hint: $("wnHint").textContent })`);
ok(t.t === "HITCH" && /tap HITCH/.test(t.hint), `touch: use button reads ${t.t}; "${t.hint}"`);
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`);

// ---- 2. pad L3 at the tail lowers the ramp, and again raises it
await atTail(); await waitGame(0.6);
await padSet({ 10: 1 }); await sleep(350); await padSet(); await sleep(450); await padOff();
h = await H(); ok(h.ramp === 1, `pad L3 at the tail lowers the ramp (ramp ${h.ramp})`);
await padSet({ 10: 1 }); await sleep(350); await padSet(); await sleep(450); await padOff();
h = await H(); ok(h.ramp === 0, `pad L3 again raises it (ramp ${h.ramp})`);

// ---- 3. hitch it, swap to the sled with the truck parked on it, ride off: the trailer stays at the ball
await atCoupler(); await waitGame(0.6); await tap("KeyE"); await waitGame(0.5);
h = await H(); ok(h.on === "v1", "hitched (on " + h.on + ")");
await walkerBeside("sled"); await sleep(1200);
await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on", 14), "Q onto the sled (truck parked, trailer on it)");
await waitGame(0.5);
const before = await H();
await down("KeyW"); await waitGame(3); await up("KeyW");
h = await H(); ok(Math.hypot(h.x - before.x, h.z - before.z) < 0.05 && h.cb < 0.05 && !h.nan, `riding the sled, the parked trailer stays on the truck's ball (moved ${Math.hypot(h.x - before.x, h.z - before.z).toFixed(3)} m, cb ${h.cb.toFixed(3)})`);
const pins = await J(`TABLET.layers.vehicles.flatMap(f => f()).map(p => p.name)`);
ok(pins.includes("Sled trailer"), "Map pins the trailer while riding the sled: " + pins.join(","));

// ---- 4. rig + trailer: a truck holds one. Put the rig on the same truck as the trailer and see which wins on save/load.
await ev(`(() => { const o = GS.own; o.partsOwned["recv:ball"] = true; o.partsOwned["hitch:trailer"] = true; o.parts.recv = "ball"; o.parts.hitch = "trailer"; restat(); const s = TLX.state("vehicles"); s.rig = { on: "v1", kind: "trailer", x: 0, z: 0, yaw: 0 }; s.haul.on = "v1"; return 1; })()`);
await ev(`save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
sv.x.sys.vehicles.s.rig = { on: "v1", kind: "trailer", x: 0, z: 0, yaw: 0 }; sv.x.sys.vehicles.s.haul.on = "v1";
await reload(sv); await sleep(1500); await waitGame(0.8);
const both = await J(`({ rig: TLXV.rigOn(), haul: TLXV.haul() && TLXV.haul().on, errs: 0 })`);
ok(!(both.rig === "v1" && both.haul === "v1"), `saved rig and trailer both on one truck: not both after load (rig ${both.rig}, trailer ${both.haul})`);

// ---- 5. bad saved trailers
const bad = async (name, mut, chk) => {
  const s2 = JSON.parse(JSON.stringify(sv)); const hh = s2.x.sys.vehicles.s; hh.rig = null; mut(hh);
  await reload(s2); await sleep(1500); await waitGame(0.6);
  const r = await J(`(() => { const h = TLXV.haul(); return h ? { on: h.on, x: h.x, z: h.z, ramp: h.ramp, nan: [h.x, h.z, h.yaw, camera.position.x, camera.quaternion.x].some(v => !isFinite(v)), dist: Math.hypot(h.x - FOOT.x, h.z - FOOT.z) } : null; })()`);
  ok(r && !r.nan && chk(r), `${name}: ${JSON.stringify(r)}`);
};
await bad("NaN pose, string ramp", hh => { hh.haul = { on: null, x: "abc", z: null, yaw: {}, ramp: "yes" }; }, r => r.ramp === 0 || r.ramp === 1);
await bad("huge coordinates", hh => { hh.haul = { on: null, x: 1e9, z: -1e9, yaw: 99, ramp: 0 }; }, r => true);
await bad("truck gone (on v99)", hh => { hh.haul = { on: "v99", x: 0, z: 0, yaw: 0, ramp: 0 }; }, r => r.on === null);
await bad("haul = true / 5 / []", hh => { hh.haul = [1]; }, r => true).catch(e => ok(false, "array haul threw " + e));

// ---- 6. reload while driving with it hitched, truck moving
const good = JSON.parse(JSON.stringify(sv)); good.x.sys.vehicles.s.rig = null;
await reload(good); await sleep(1500);
await ev(`tutSkip(); crashCancel(); FOOT.on = false; true`); await sleep(500);
await setup(); await atCoupler(); await waitGame(0.8); await tap("KeyE"); await waitGame(0.5);
await walkerBeside("truck"); await sleep(1200);
await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "in the truck");
await down("KeyW"); await waitGame(3);
await ev(`save(); true`);
const mv = await J(`({ x: P.x, z: P.z, sp: Math.hypot(P.vx, P.vz) })`);
await up("KeyW");
await reload(); await sleep(1800); await waitGame(1);
h = await H();
const pp = await J(`({ x: P.x, z: P.z, veh: !!VEH.cur })`);
ok(h && h.on === "v1" && h.cb < 0.3 && !h.nan, `reloaded mid-drive: still on the truck, coupler ${h ? h.cb.toFixed(3) : "-"} m off the ball, in truck ${pp.veh}`);
console.log("moved", JSON.stringify(mv), JSON.stringify(pp));

// ---- 7. teleport the truck 600 m: the trailer comes with it, no stretch
await ev(`(() => { P.x += 600; P.z += 400; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`); await waitGame(1.2);
h = await H(); ok(h.cb < 0.3 && !h.nan, `truck teleported 720 m: trailer follows (coupler ${h.cb.toFixed(3)} m)`);

// ---- 8. night: hitch use and tail lights (lm visible)
await ev(`GS.hour = 23; true`); await waitGame(1.5);
await shot("x2haulbreak_night");
const nl = await J(`({ vis: TLXV.haulR ? TLXV.haulR().grp.visible : null, hour: GS.hour })`);
ok(nl.vis === true, `trailer drawn at night (hour ${nl.hour})`);

await done(fails ? 1 : 0);
