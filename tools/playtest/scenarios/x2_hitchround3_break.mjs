// Beta test 2.5 round 3 (hitch spam, bogged truck, slope, water, old save). Prelude copied from x2_hitchbreak.
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
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 2) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
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


// ---- A. mash E at the tongue: end state must be consistent, no double hitch, no NaN
await walkerBeside("v1", 3.2); await sleep(300);
await atTongue(); await waitGame(0.6);
let n0 = 0;
for (let i = 0; i < 11; i++) { await tap("KeyE", 25); await sleep(60); }
await waitGame(1.0);
s = await rig();
console.log("A after 11 E:", JSON.stringify({ on: s.on, live: s.live, nan: s.nan, use: s.use }));
ok(!s.nan, "A mash E x11: finite");
ok(s.on === null || s.on === "v1", "A mash E x11: rig is on the truck or free (" + s.on + ")");
const ge = await J(`({ gb: TOW.mass, hitchedUse: footUse() })`); console.log("A", JSON.stringify(ge));
// make it hitched for next
if (s.on !== "v1") { await atTongue(); await waitGame(0.6); await tap("KeyE"); await waitGame(0.6); s = await rig(); }
ok(s.on === "v1", "A hitched again: " + s.on);

// ---- B. truck bogged with trailer on: unhitch while the truck is bogged, and drive off
await walkerBeside("v1", 3.2); await sleep(500);
await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "B in truck");
await ev(`BOG.on = true; BOG.dig = 0; true`); await waitGame(0.8);
const b1 = await J(`({ bog: BOG.on, cur: !!VEH.cur, foot: FOOT.on })`);
console.log("B bogged", JSON.stringify(b1));
await tap("KeyQ"); await waitUntil("FOOT.on && !DMT.on", 14); await waitGame(0.8);
s = await rig(); console.log("B on foot bogged truck:", JSON.stringify({ on: s.on, foot: s.foot, use: s.use, hint: s.hint }));
await atTongue(); await waitGame(0.8);
s = await rig(); console.log("B at tongue (bogged truck):", s.use, "|", s.hint);
await tap("KeyE"); await waitGame(0.8); s = await rig();
console.log("B after E at tongue:", JSON.stringify({ on: s.on, use: s.use, nan: s.nan }));
ok(!s.nan, "B finite after unhitch from bogged truck");
ok(s.on === null, "B E at the tongue unhitches even though the truck is bogged (on " + s.on + ")");
await tap("KeyE"); await waitGame(0.8); s = await rig();
console.log("B E again:", s.on); 
ok(s.on === "v1", "B hitch back onto a bogged truck works (on " + s.on + ")");
await ev(`BOG.on = false; true`);

// ---- D. free trailer left on a slope (rig placed by the hitch recipe, then unhitched with E by a walker): sits on the ground?
const sl = await J(`(() => { for (let i = 0; i < 6000; i++) { const x = depot.x + (Math.random() - .5) * 700, z = depot.z + (Math.random() - .5) * 700; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 40)) continue; const g = slopeAt(x, z, 8); if (g > 0.2 && g < 0.4) return { x, z, g }; } return null; })()`);
console.log("D slope", JSON.stringify(sl));
if (sl) {
  await ev(`(() => { const st = TLX.state("vehicles"); const r = st.owned[0]; r.x = ${sl.x}; r.z = ${sl.z}; r.yaw = 0; FOOT.on = false; crashCancel(); P.x = ${sl.x} + 30; P.z = ${sl.z}; P.vx = P.vz = 0; P.y = surf(P.x, P.z); recenter(${sl.x}, ${sl.z}, true); return 1; })()`);
  await waitGame(1.5);
  const g0 = await J(`({ on: TLXV.rigOn(), ty: TOW.y, tx: TOW.x, tz: TOW.z, ground: surf(TOW.x, TOW.z), live: towLive() })`);
  console.log("D rig before:", JSON.stringify(g0));
  // unhitch by hand
  await atTongue(); await waitGame(0.8); await tap("KeyE"); await waitGame(1.0);
  await waitGame(6);
  const g1 = await J(`({ on: TLXV.rigOn(), ty: TOW.y, tx: TOW.x, tz: TOW.z, ground: surf(TOW.x, TOW.z), live: towLive() })`);
  console.log("D rig after unhitch +6 s:", JSON.stringify(g1));
  ok(g1.on === null, "D unhitched on a slope");
  ok(Math.abs(g1.ty - g1.ground) < 1.2, "D free trailer sits on the ground (y " + g1.ty.toFixed(2) + ", ground " + g1.ground.toFixed(2) + ")");
  await sideCam("[TOW.x, TOW.y + 0.6, TOW.z]", 7, 2.5); await sleep(400); await shot("x2h3_slope"); await camOff();
}
// ---- C. old save: no rig field in vehicles state at all, hitch part fitted
await ev(`(() => { const st = TLX.state("vehicles"); delete st.rig; return 1; })()`);
await reload(); await sleep(1500); await waitGame(1.0);
s = await rig();
console.log("C old save:", JSON.stringify({ on: s.on, kind: s.kind, live: s.live, bays: s.bays, part: await ev("GS.own.parts.hitch"), cur: s.cur, nan: s.nan }));
ok(!s.nan && (s.on === "sled" || s.on === null), "C vehicles state without a rig loads (on " + s.on + ")");

await shot("x2h3_final");
await done(fails ? 1 : 0);
