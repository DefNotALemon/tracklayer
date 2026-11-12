// Expansion slice 2.5: the universal hitch. Asserts, exit 1 on a failure.
//   The rig (here the freight trailer) rides behind the sled as before; on foot at its tongue, use unhitches it (keyboard E),
//   it stands where it was left while the sled drives off; backed up to the pickup's ball, use hitches it there (pad L3); the
//   pickup then pulls it (the trailer follows, the truck carries its weight, the trailer's bay is the truck's); you can't
//   unhitch with a big load strapped on; a reload keeps it on the truck; touch UNHITCH takes it off; the sled's receiver is a
//   rating (no receiver: refused, with a toast; light receiver: hitched); a different rig fitted goes on the sled.
// Headless Chrome runs ~0.6x real time: everything is measured by gameClock.
import { boot, ev, tap, sleep, done, park, padSet, padOff, shot, down, up, reload, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(150); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
async function holdFor(code, secs) { await down(code); await waitGame(secs); await up(code); }
const toasts = () => J(`(window.__T || []).concat((TOASTQ || []).map(t => t.msg), [...$("toasts").children].map(c => c.textContent))`);   // tlx toasts go through the api's own reference, so read the queue and the screen too
const rig = () => J(`({ on: TLXV.rigOn(), kind: TOW.kind, x: TOW.x, z: TOW.z, mass: TOW.mass, use: footUse(), hint: $("wnHint").textContent, bays: ST.bays, sledBays: stats().bays, cur: TLX.state("vehicles").cur, tip: TLXV.tongueTip() })`);
// stand the walker at the tongue's coupler, a little to one side
const atTongue = (side = 0.8) => ev(`(() => { const t = TLXV.tongueTip(), lx = Math.cos(TOW.yaw), lz = -Math.sin(TOW.yaw); crashCancel(); FOOT.on = true; FOOT.x = t[0] + lx * ${side}; FOOT.z = t[1] + lz * ${side}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = TOW.yaw + Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const walkerBeside = (off = 3.2) => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  FOOT.on = true; FOOT.x = x + fz * ${off} - fx * 0.3; FOOT.z = z - fx * ${off} - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const tipToBall = () => ev(`(() => { const t = TLXV.tongueTip(), b = TLXV.ballOf(TLXV.rigOn()); return b ? Math.hypot(t[0] - b[0], t[1] - b[1]) : -1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`(() => { const o = toast; toast = (m, k) => { (window.__T = window.__T || []).push(m); return o(m, k); }; return 1; })()`);
await ev(`crashCancel(); FOOT.on = false; true`);
console.log("parked", JSON.stringify(await park()));
await ev(`(() => { const o = GS.own; o.partsOwned["recv:ball"] = true; o.partsOwned["hitch:trailer"] = true; o.parts.recv = "ball"; o.parts.hitch = "trailer"; restat(); return 1; })()`);
await waitGame(0.8);

// ---- 1. the sled baseline: the trailer rides behind it, its bay is the sled's
let s = await rig();
ok(s.on === "sled" && s.kind === "trailer" && s.sledBays === 1 && s.bays === 1, `a fitted trailer is on the sled (on ${s.on}, bays ${s.bays})`);
await holdFor("KeyW", 2.5); await ev(`P.vx = P.vz = 0; true`); await waitGame(0.6);
s = await J(`({ d: Math.hypot(TOW.x - P.x, TOW.z - P.z), want: hitchBack(GS.own.parts.rack) + HITCH.trailer.len, m: TOW.mass })`);
ok(Math.abs(s.d - s.want) < 0.6 && s.m >= 70, `it follows the sled on its tongue (${s.d.toFixed(2)} m behind, ${s.want.toFixed(2)} expected; ${s.m} kg)`);

// ---- 2. keyboard: E at the tongue unhitches it
await atTongue(); await waitGame(0.5);
s = await rig();
ok(s.use === "UNHITCH", `at the tongue, use would unhitch (footUse ${s.use})`);
ok(/E: unhitch the trailer from the sled/.test(s.hint), "the hint names the control and the rig: " + s.hint);
await tap("KeyE"); await waitGame(0.4);
s = await rig();
ok(s.on === null && s.sledBays === 0 && s.bays === 0, `E unhitches it: on ${s.on}, sled bays ${s.sledBays}`);
ok((await toasts()).some(t => /stands free/.test(t)), "a toast says it stands free");
const free = { x: s.x, z: s.z };
await ev(`FOOT.on = false; true`); await sleep(300);
await holdFor("KeyW", 2); await ev(`P.vx = P.vz = 0; true`); await waitGame(0.4);
s = await J(`({ x: TOW.x, z: TOW.z, m: TOW.mass, sled: Math.hypot(P.x - ${free.x}, P.z - ${free.z}) })`);
ok(Math.hypot(s.x - free.x, s.z - free.z) < 0.05 && s.m === 0 && s.sled > 8, `the sled drives off (${s.sled.toFixed(1)} m), the trailer stays where it stood, weighing nothing on the sled`);
await shot("x2hitch_free");

// ---- 3. buy the pickup, put it on a plowed lane, back the free trailer up to its ball
await ev(`GS.cash = 6000; true`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`closeGarage(); true`); await sleep(300);
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 2) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
ok(lane && lane.L > 35, `a plowed lane to drive on (${lane ? lane.L.toFixed(0) : 0} m)`);
// the truck 9 m along the lane facing along it; the trailer stands behind it with the coupler 0.9 m short of the ball
await ev(`(() => { const L = ${JSON.stringify(lane)}, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L, yaw = Math.atan2(ux, uz);
  const r = TLX.state("vehicles").owned[0]; r.x = L.x + ux * 9; r.z = L.z + uz * 9; r.yaw = yaw;
  const bx = r.x - ux * 3.1, bz = r.z - uz * 3.1, tx = bx - ux * 0.9, tz = bz - uz * 0.9;
  TOW.x = tx - ux * HITCH.trailer.len; TOW.z = tz - uz * HITCH.trailer.len; TOW.yaw = yaw;
  P.x = r.x + uz * 25; P.z = r.z - ux * 25; P.vx = P.vz = 0; P.y = surf(P.x, P.z);   // the sled out of the way
  recenter(r.x, r.z, true); return 1; })()`);
await atTongue(); await waitGame(1.2);
s = await rig();
ok(s.use === "HITCH" && /hitch the trailer to the pickup/.test(s.hint), `the coupler in reach of the pickup's ball: use would hitch it (${s.use}; ${s.hint})`);
// pad: L3 hitches it
await padSet({ 10: 1 }); await sleep(350); await padSet(); await sleep(450); await padOff();
s = await rig();
ok(s.on === "v1", `pad L3 hitches it to the pickup (on ${s.on})`);
ok(await tipToBall() < 0.1, `the coupler sits on the ball (${(await tipToBall()).toFixed(3)} m)`);
ok((await toasts()).some(t => /is hitched/.test(t)), "a toast says it's hitched");

// ---- 4. the pickup pulls it
await walkerBeside(3.2); await sleep(1200);
await tap("KeyQ"); await sleep(300);
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 12), "Q gets in the truck");
await waitGame(0.5);
s = await J(`({ bays: ST.bays, live: towLive(), slots: ST.slots })`);
ok(s.bays === 1 && s.live && s.slots === 8, `in the truck the trailer's bay is the truck's (bays ${s.bays}, live ${s.live})`);
const p0 = await J(`({ x: P.x, z: P.z, tx: TOW.x, tz: TOW.z })`);
await holdFor("KeyW", 4);
const p1 = await J(`({ x: P.x, z: P.z, tx: TOW.x, tz: TOW.z, v: Math.hypot(P.vx, P.vz), mass: TLXV.rt().mass, tm: TOW.mass, bog: BOG.on })`);
const dT = Math.hypot(p1.x - p0.x, p1.z - p0.z), dR = Math.hypot(p1.tx - p0.tx, p1.tz - p0.tz);
console.log("tow run", JSON.stringify(p1), "truck", dT.toFixed(1), "trailer", dR.toFixed(1));
ok(dT > 8 && dR > 6 && !p1.bog, `the pickup tows it down the lane: truck ${dT.toFixed(1)} m, trailer ${dR.toFixed(1)} m`);
ok(await tipToBall() < 0.3, `the coupler stays on the truck's ball (${(await tipToBall()).toFixed(3)} m)`);
ok(p1.tm >= 70 && p1.mass >= 1900 + 70, `the truck carries its weight (${p1.mass.toFixed(0)} kg with ${p1.tm} kg of trailer)`);
await shot("x2hitch_tow_chase");
await ev(`P.vx = P.vz = 0; true`); await waitGame(0.6);
await sideCam("[TOW.x * 0.5 + P.x * 0.5, TOW.y + 0.6, TOW.z * 0.5 + P.z * 0.5]", 7.5, 2.2); await sleep(500);
await shot("x2hitch_tow_side"); await camOff();

// ---- 5. a big load strapped on: no unhitching
await ev(`GS.load.push({ big: true, bays: 1, kg: 90, cargo: "Wood stove", look: "stove", cond: 100, pay: 300, dest: SITES.find(x => x !== depot), from: depot }); true`);
await tap("KeyQ"); await sleep(300);
ok(await waitUntil("FOOT.on && !DMT.on", 12), "Q gets out");
await atTongue(); await waitGame(0.5);
s = await rig(); ok(s.use === "UNHITCH", `at the tongue behind the truck: ${s.use}`);
await tap("KeyE"); await waitGame(0.3);
s = await rig();
ok(s.on === "v1" && (await toasts()).some(t => /strapped down/.test(t)), `with a stove strapped on it stays hitched (on ${s.on})`);
await ev(`(() => { const s = TLX.state("vehicles"); if (s.cur === "v1") GS.load = GS.load.filter(j => !j.big); return 1; })()`);

// ---- 6. reload: still on the truck, where it was
const pre = await J(`({ x: TOW.x, z: TOW.z })`);
await reload(); await sleep(1500);
await ev(`(() => { const o = toast; toast = (m, k) => { (window.__T = window.__T || []).push(m); return o(m, k); }; return 1; })()`);
await waitGame(0.6);
s = await rig();
ok(s.on === "v1" && s.kind === "trailer" && Math.hypot(s.x - pre.x, s.z - pre.z) < 0.6, `after a reload it is still on the pickup, where it was (on ${s.on}, moved ${Math.hypot(s.x - pre.x, s.z - pre.z).toFixed(2)} m)`);
ok(await tipToBall() < 0.5, `... coupler on the ball (${(await tipToBall()).toFixed(3)} m)`);

// ---- 7. touch: UNHITCH
if (!(await ev("FOOT.on"))) { await tap("KeyQ"); await waitUntil("FOOT.on && !DMT.on", 12); }
await atTongue(); await waitGame(0.4);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await waitGame(0.6);
s = await J(`({ t: $("tcUse").hidden ? null : $("tcUse").textContent, hint: $("wnHint").textContent })`);
ok(s.t === "UNHITCH" && /tap UNHITCH/.test(s.hint), `touch: the use button reads ${s.t}; hint "${s.hint}"`);
await ev(`(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);
await waitGame(0.4);
s = await rig(); ok(s.on === null, `touch UNHITCH takes it off the truck (on ${s.on})`);
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(300);

// ---- 8. the sled's receiver is a rating
await ev(`(() => { const s = TLX.state("vehicles"), fx = Math.sin(TOW.yaw), fz = Math.cos(TOW.yaw), t = TLXV.tongueTip();
  if (s.cur === "v1") { P.x += fz * 14; P.z -= fx * 14; } else { const r = s.owned[0]; r.x += fz * 14; r.z -= fx * 14; }
  const sl = s.cur == null ? P : s.sled, bx = t[0] + fx * 0.8, bz = t[1] + fz * 0.8, b = hitchBack(GS.own.parts.rack);
  sl.x = bx + fx * b; sl.z = bz + fz * b; sl.yaw = TOW.yaw; if (s.cur == null) { P.vx = P.vz = 0; P.y = surf(P.x, P.z); }
  GS.own.parts.recv = "none"; return 1; })()`);
await atTongue(); await waitGame(1.2);
s = await rig();
ok(s.use === "HITCH" && /to the sled/.test(s.hint), `the sled's ball in reach: ${s.use}; ${s.hint}`);
await tap("KeyE"); await waitGame(0.3);
s = await rig();
ok(s.on === null && (await toasts()).some(t => /needs a hitch receiver/.test(t)), `no receiver on the sled: refused (on ${s.on})`);
await ev(`GS.own.parts.recv = "ball"; true`);
await tap("KeyE"); await waitGame(0.4);
s = await rig();
ok(s.on === "sled" && s.sledBays === 1, `light receiver: hitched to the sled, its bay is the sled's again (on ${s.on}, bays ${s.sledBays})`);

// ---- 9. a different rig fitted at the garage goes on the sled
await atTongue(); await waitGame(0.3); await tap("KeyE"); await waitGame(0.3);
ok((await rig()).on === null, "unhitched again");
await ev(`GS.own.partsOwned["hitch:groomer"] = true; GS.own.parts.hitch = "groomer"; restat(); true`); await waitGame(0.5);
s = await rig();
ok(s.on === "sled", `fitting the groomer puts it on the sled (on ${s.on})`);

await done(fails ? 1 : 0);
