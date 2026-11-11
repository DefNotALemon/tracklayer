// Beta break test 2 for slice 2.6a: ramp left DOWN then hitched and driven, hard steer, reverse/jackknife, handbrake-ish stop, coupler/NaN checks.
// (older header follows) 2.6a Tries to break it: bad saved trailers (NaN, huge coords, string ramp, truck
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

// ---- ramp down, then hitch it, then drive
await atTail(); await waitGame(0.6); await tap("KeyE"); await waitGame(0.8);
h = await H(); ok(h.ramp === 1, "ramp lowered (ramp " + h.ramp + ")");
await atCoupler(); await waitGame(0.6); if (!process.env.NOHITCH) await tap("KeyE"); await waitGame(0.6);
h = await H(); ok(h.on === "v1" || !!process.env.NOHITCH, "hitched with the ramp down (on " + h.on + ", ramp " + h.ramp + ")");
await walkerBeside("truck"); await sleep(1200);
await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "in the truck");
const probe = async (label, lim = 0.35) => { const r = await H(); const sp = await J(`Math.hypot(P.vx, P.vz)`); ok(r && !r.nan && r.cb < lim, `${label}: coupler ${r ? r.cb.toFixed(3) : "-"} m off the ball, truck ${sp.toFixed(1)} m/s, ramp ${r && r.ramp}`); return r; };
await down("KeyW");
for (let i = 0; i < 6; i++) { await waitGame(1); console.log("t", i, JSON.stringify(await J(`({ sp: Math.hypot(P.vx, P.vz), bog: BOG.on, x: P.x|0, z: P.z|0, gear: GB.gear, fuel: GS.fuel, cur: !!VEH.cur, own: TLX.state("vehicles").cur })`))); }
await probe("driving, ramp down");
const trace = async n => { for (let i = 0; i < n; i++) { await waitGame(1); console.log("  tr", JSON.stringify(await J(`({ sp: +Math.hypot(P.vx, P.vz).toFixed(1), x: P.x|0, z: P.z|0, yaw: +P.yaw.toFixed(2), bog: BOG.on, steer: typeof P.steer == "number" ? +P.steer.toFixed(2) : null, near: obNear(P.x, P.z, 6) })`))); } };
await down("KeyA"); await trace(1); await probe("full left lock 4 s");
await up("KeyA"); await down("KeyD"); await waitGame(1.2); await probe("full right lock 4 s");
await up("KeyD"); await up("KeyW");
await shot("x2haulrev_turn");
// brake to a stop, then reverse (S) with full lock each way: jackknife attempt
await down("KeyS"); await waitGame(3); await up("KeyS");
console.log("after brake", JSON.stringify(await J(`({ sp: Math.hypot(P.vx, P.vz), bogOn: BOG.on })`)));
const p0 = await J(`({ x: P.x, z: P.z })`);
await down("KeyS"); await down("KeyD"); await waitGame(4); await probe("reversing, lock right 4 s", 0.5);
await up("KeyD"); await down("KeyA"); await waitGame(4); await probe("reversing, lock left 4 s", 0.5);
await up("KeyA"); await up("KeyS");
const p1 = await J(`({ x: P.x, z: P.z })`); const back = Math.hypot(p1.x - p0.x, p1.z - p0.z);
ok(back > 2, `S backs the truck + trailer up (${back.toFixed(1)} m)`);
await shot("x2haulrev_reverse");
const ang = await J(`(() => { const h = TLXV.haul(); let d = h.yaw - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); return { d, bog: BOG.on, hx: h.x, hz: h.z, px: P.x, pz: P.z, dist: Math.hypot(h.x - P.x, h.z - P.z) }; })()`);
console.log("fold angle", JSON.stringify(ang));
ok(Math.abs(ang.d) < 2.6, `trailer not folded back through the truck (angle ${ang.d.toFixed(2)} rad)`);
ok(ang.dist > 2 && ang.dist < 12, `trailer-truck distance sane (${ang.dist.toFixed(2)} m)`);
// brake then hop out, trailer settles
await waitGame(1);
await probe("after stopping", 0.35);
// get out, unhitch, walk away, ramp up
await tap("KeyQ"); ok(await waitUntil("!!FOOT.on && !DMT.on", 14), "got out");
for (const rr of [1, 0]) { await ev(`TLXV.haul().ramp = ${rr}; true`); await atCoupler(); await waitGame(0.5); console.log("dbg", JSON.stringify(await J(`(() => { const h = TLXV.haul(), c = TLXV.haulCoupler(h); return { d: Math.hypot(FOOT.x - c[0], FOOT.z - c[1]), on: FOOT.on, mnt: MNT.on, dmt: DMT.on, c, f: [FOOT.x, FOOT.z], tut: tutHidden() }; })()`))); console.log("ramp", rr, JSON.stringify(await J(`({ use: footUse(), hint: $("wnHint").textContent, hx: TLXV.haul().on })`))); }
await ev(`TLXV.haul().ramp = 1; true`);
console.log("foot", JSON.stringify(await J(`({ on: FOOT.on, use: footUse(), hint: $("wnHint").textContent, d: Math.hypot(FOOT.x - TLXV.haulCoupler(TLXV.haul())[0], FOOT.z - TLXV.haulCoupler(TLXV.haul())[1]) })`)));
await atCoupler(); await waitGame(0.6); console.log("foot2", JSON.stringify(await J(`({ use: footUse(), hint: $("wnHint").textContent })`))); await tap("KeyE"); await waitGame(0.6);
h = await H(); ok(h.on === null, "unhitched (on " + h.on + ")");
await atTail(); await waitGame(0.6); await tap("KeyE"); await waitGame(0.8);
h = await H(); ok(h.ramp === 0, "ramp raised (ramp " + h.ramp + ")");
await done(fails ? 1 : 0);
