// Beta test 2.5 round 4 (reload while hitched and driving, night, reverse, swap to sled, reload). Prelude copied from x2_hitchbreak.
// (old header:) Tries to break it: swap to the sled with the rig on the truck,
// reverse the truck with a trailer, swap the rig at the garage while it is on the truck, a free rig and a bad saved
// rig across reloads (NaN pose, truck gone), night, hitching with both balls in reach. Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, reload, shot, down, up, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
async function holdFor(code, s) { await down(code); await waitGame(s); await up(code); }
const rig = () => J(`({ on: TLXV.rigOn(), kind: TOW.kind, x: TOW.x, z: TOW.z, y: TOW.y, yaw: TOW.yaw, mass: TOW.mass, live: towLive(), use: footUse(), hint: $("wnHint").textContent, bays: ST.bays, cur: TLX.state("vehicles").cur, foot: FOOT.on, tip: TLXV.tongueTip(), nan: [TOW.x, TOW.z, TOW.y, TOW.yaw, camera.position.x, camera.quaternion.x].some(v => !isFinite(v)) })`);
const atTongue = (side = 0.8) => ev(`(() => { const t = TLXV.tongueTip(), lx = Math.cos(TOW.yaw), lz = -Math.sin(TOW.yaw); crashCancel(); FOOT.on = true; FOOT.x = t[0] + lx * ${side}; FOOT.z = t[1] + lz * ${side}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = TOW.yaw + Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const walkerBeside = (key, off = 3.2) => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const cur = ${key === "sled" ? "s.cur == null" : "s.cur === r.uid"}; const p = ${key === "sled" ? "(s.cur == null ? P : s.sled)" : "(cur ? P : r)"}; const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
  FOOT.on = true; FOOT.x = p.x + fz * ${off} - fx * 0.3; FOOT.z = p.z - fx * ${off} - fz * 0.3; FOOT.yaw = p.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);
await park(); await sleep(400);
await ev(`(() => { const o = GS.own; o.partsOwned["recv:ball"] = true; o.partsOwned["hitch:trailer"] = true; o.parts.recv = "ball"; o.parts.hitch = "trailer"; GS.cash = 9000; restat(); return 1; })()`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
// a plowed lane: truck on it facing along, trailer hitched straight to the truck by the same recipe the hitch test uses
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
ok(lane && lane.L > 35, "lane " + (lane && lane.L.toFixed(0)));
await ev(`(() => { const L = ${JSON.stringify(lane)}, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L, yaw = Math.atan2(ux, uz);
  const r = TLX.state("vehicles").owned[0]; r.x = L.x + ux * 9; r.z = L.z + uz * 9; r.yaw = yaw;
  const bx = r.x - ux * 3.1, bz = r.z - uz * 3.1, tx = bx - ux * 0.9, tz = bz - uz * 0.9;
  TOW.x = tx - ux * HITCH.trailer.len; TOW.z = tz - uz * HITCH.trailer.len; TOW.yaw = yaw; TOW.mass = 0;
  const rg = TLX.state("vehicles").rig; rg.on = null; rg.kind = "trailer"; rg.x = TOW.x; rg.z = TOW.z; rg.yaw = yaw; restat();   // standing free on its jack
  P.x = r.x + uz * 25; P.z = r.z - ux * 25; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(r.x, r.z, true); return 1; })()`);
await atTongue(); await waitGame(1.0);
await tap("KeyE"); await waitGame(0.5);
let s = await rig(); ok(s.on === "v1", "hitched to the truck: " + s.on);


const rel = () => J(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); const dx = TOW.x - P.x, dz = TOW.z - P.z; return { d: Math.hypot(dx, dz), behind: -(dx * fx + dz * fz), side: dx * fz - dz * fx, yawDiff: Math.atan2(Math.sin(TOW.yaw - P.yaw), Math.cos(TOW.yaw - P.yaw)), hitchedTo: TLXV.rigOn(), cur: TLX.state("vehicles").cur, rv: r.uid, px: P.x, pz: P.z, pyaw: P.yaw, spd: Math.hypot(P.vx||0,P.vz||0), nan: [TOW.x, TOW.z, TOW.yaw, P.x].some(v => !isFinite(v)) }; })()`);
// A. drive 6 s with the trailer on, reload mid-drive
await walkerBeside("v1", 3.2); await sleep(300);
await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "A in truck");
const p00 = await rel();
await holdFor("KeyW", 6);
let r0 = await rel(); console.log("A driving", JSON.stringify(r0));
ok(Math.hypot(r0.px - p00.px, r0.pz - p00.pz) > 15, "A the truck really drove (" + Math.hypot(r0.px - p00.px, r0.pz - p00.pz).toFixed(0) + " m)");
ok(r0.hitchedTo === "v1" && r0.behind > 2 && r0.behind < 9, "A trailer behind the ball while driving (" + r0.behind.toFixed(1) + " m, side " + r0.side.toFixed(1) + ")");
await down("KeyW"); await sleep(400);
await reload(); await up("KeyW"); await sleep(1500); await waitGame(1.5);
let r1 = await rel(); const s1 = await rig(); console.log("A after reload", JSON.stringify(r1), JSON.stringify({ foot: s1.foot, cur: s1.cur, live: s1.live, use: s1.use }));
ok(!r1.nan, "A finite after reload");
ok(r1.hitchedTo === "v1", "A rig still on the truck after reload (" + r1.hitchedTo + ")");
ok(r1.behind > 2 && r1.behind < 9 && Math.abs(r1.side) < 2.5, "A trailer still behind the ball after reload (" + r1.behind.toFixed(1) + ", side " + r1.side.toFixed(1) + ")");
await shot("x2h4_a_reload");
// B. reverse with the trailer, 4 s, then forward
await ev(`crashCancel(); true`);
const p20 = await rel(); await holdFor("KeyS", 1.5); await holdFor("KeyS", 3);
let r2 = await rel(); console.log("B reversing", JSON.stringify(r2));
ok(Math.hypot(r2.px - p20.px, r2.pz - p20.pz) > 3, "B truck reversed (" + Math.hypot(r2.px - p20.px, r2.pz - p20.pz).toFixed(1) + " m)");
ok(!r2.nan && Math.abs(r2.yawDiff) < 1.4, "B reverse: finite, no jackknife past 80 deg (" + (r2.yawDiff * 57.3).toFixed(0) + " deg)");
await holdFor("KeyW", 4);
let r3 = await rel(); console.log("B forward again", JSON.stringify(r3));
ok(!r3.nan && Math.abs(r3.yawDiff) < 0.6 && r3.d > 3, "B pulls straight again (" + (r3.yawDiff * 57.3).toFixed(0) + " deg, d " + r3.d.toFixed(1) + ")");
// C. night: stop, get out, unhitch, hint reads, hitch again
await ev(`GS.hour = 24 + 23; true`); await waitGame(1);
await tap("KeyQ"); await waitUntil("FOOT.on && !DMT.on", 14); await waitGame(0.8);
await atTongue(); await waitGame(0.8);
s = await rig(); console.log("C night hint:", s.use, "|", s.hint);
ok(/hitch|unhitch/i.test(s.hint || ""), "C night: hint names the hitch");
await sideCam("[TOW.x, TOW.y + 0.8, TOW.z]", 6, 2.2); await sleep(400); await shot("x2h4_c_night"); await camOff();
await tap("KeyE"); await waitGame(0.8); s = await rig(); ok(s.on === null, "C night unhitch (" + s.on + ")");
await tap("KeyE"); await waitGame(0.8); s = await rig(); ok(s.on === "v1", "C night hitch again (" + s.on + ")");
// D. swap to the sled with the rig on the truck, reload, swap back
await ev(`(() => { const sdl = TLX.state("vehicles").sled; return 1; })()`);
await walkerBeside("sled", 3.2); await sleep(400);
await tap("KeyQ"); const gotSled = await waitUntil("!MNT.on && !FOOT.on && !VEH.cur", 14); ok(gotSled, "D on the sled");
await sleep(600); await reload(); await sleep(1500); await waitGame(1);
let d1 = await J(`({ rig: TLXV.rigOn(), cur: TLX.state("vehicles").cur, foot: FOOT.on, nan: [TOW.x, TOW.z, P.x, camera.position.x].some(v => !isFinite(v)), tow: towLive() })`);
console.log("D after reload on sled", JSON.stringify(d1));
ok(!d1.nan && d1.rig === "v1" && d1.cur == null, "D sled current, rig still on the truck, finite");
await shot("x2h4_final");
await done(fails ? 1 : 0);
