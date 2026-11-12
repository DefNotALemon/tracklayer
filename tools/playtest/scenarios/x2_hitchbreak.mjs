// Beta break test for slice 2.5 (universal hitch). Tries to break it: swap to the sled with the rig on the truck,
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

// ---- 1. leave the truck on its trailer, walk to the sled, ride it away: the trailer must stay at the truck's ball
await walkerBeside("sled", 3.2); await sleep(1200);
await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on", 14), "Q onto the sled (truck parked with the trailer)");
await waitGame(0.6);
s = await rig();
const keep = { x: s.x, z: s.z };
ok(s.bays === 0 && !s.live && s.on === "v1", `on the sled: its bays ${s.bays}, trailer not live (${s.live}), still on ${s.on}`);
await holdFor("KeyW", 3); await ev(`P.vx = P.vz = 0; true`); await waitGame(0.5);
s = await rig();
ok(Math.hypot(s.x - keep.x, s.z - keep.z) < 0.3 && !s.nan, `the trailer stayed with the parked truck (moved ${Math.hypot(s.x - keep.x, s.z - keep.z).toFixed(2)} m)`);
const tb = await J(`(() => { const b = TLXV.ballOf("v1"), t = TLXV.tongueTip(); return Math.hypot(b[0] - t[0], b[1] - t[1]); })()`);
ok(tb < 0.3, `coupler on the parked truck's ball (${tb.toFixed(3)} m)`);

// ---- 2. a sled stood next to a free trailer at the same time as the truck: nearest ball wins, no double hitch
await ev(`FOOT.on = false; true`);
// ---- 3. back in the truck: reverse 3 s with the trailer (jackknife, NaN, bog)
await walkerBeside("v1", 3.2); await sleep(1200);
await tap("KeyQ"); ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "Q into the truck");
await waitGame(0.5);
await holdFor("KeyW", 2.5);
await down("KeyS"); await waitGame(0.3); await up("KeyS");   // brake
await ev(`GS.gear = 0; GB.gear = 0; true`);
await down("KeyS"); await down("KeyA"); await waitGame(4); await up("KeyA"); await up("KeyS");
s = await rig();
const sp = await J(`({ v: Math.hypot(P.vx, P.vz), bog: BOG.on, tip: TOW.tipT, d: Math.hypot(TOW.x - P.x, TOW.z - P.z) })`);
console.log("reverse:", JSON.stringify(sp), "nan", s.nan);
ok(!s.nan, "reversing with the trailer keeps every pose finite");
ok(sp.d > 2 && sp.d < 12, `trailer stays attached while reversing (${sp.d.toFixed(1)} m behind)`);
await ev(`P.vx = P.vz = 0; GB.gear = 1; true`);
await sideCam("[TOW.x * 0.5 + P.x * 0.5, TOW.y + 0.6, TOW.z * 0.5 + P.z * 0.5]", 8, 2.5); await sleep(400);
await shot("x2hb_reverse"); await camOff();

// ---- 4. a different rig at the garage while the trailer is on the truck
await ev(`GS.own.partsOwned["hitch:groomer"] = true; GS.own.parts.hitch = "groomer"; restat(); true`); await waitGame(0.8);
s = await rig();
const t = await J(`({ on: TLXV.rigOn(), kind: TOW.kind, bays: ST.bays })`);
console.log("after swap rig:", JSON.stringify(t));
ok(t.on === "sled", `fitting the groomer moves the rig to the sled (on ${t.on})`);
ok(t.kind === "groomer" && !s.nan, `... and the groomer is the live kind (${t.kind}) with the truck not towing a ghost trailer (live ${s.live}, mass ${s.mass})`);
await ev(`GS.own.parts.hitch = "trailer"; restat(); true`); await waitGame(0.8);

// ---- 5. night: unhitch hint readable, E works
await ev(`FOOT.on = false; true`);
await tap("KeyQ"); await waitUntil("FOOT.on && !DMT.on", 12);
await ev(`GS.hour = 23; true`);
s = await rig(); console.log("rig now on", s.on, "cur", s.cur);

// ---- 6. reload with a free rig, then with bad saved pose and a gone truck
await ev(`(() => { const rg = TLX.state("vehicles").rig; rg.on = null; rg.kind = "trailer"; rg.x = TOW.x; rg.z = TOW.z; rg.yaw = TOW.yaw; TOW.mass = 0; restat(); return 1; })()`);
const free = await J(`({ x: TOW.x, z: TOW.z })`);
await reload(); await sleep(1500); await waitGame(0.8);
s = await rig();
ok(s.on === null && Math.hypot(s.x - free.x, s.z - free.z) < 0.3 && !s.nan, `a free trailer is still where it stood after a reload (on ${s.on}, moved ${Math.hypot(s.x - free.x, s.z - free.z).toFixed(2)} m)`);
await ev(`(() => { const rg = TLX.state("vehicles").rig; rg.on = null; rg.x = null; rg.z = "x"; rg.yaw = NaN; return 1; })()`);
await reload(); await sleep(1500); await waitGame(0.8);
s = await rig();
ok(!s.nan && (s.on === "sled" || s.on === null), `a free rig with a broken saved pose loads sanely (on ${s.on}, nan ${s.nan})`);
await ev(`(() => { const rg = TLX.state("vehicles").rig; rg.on = "v99"; rg.kind = GS.own.parts.hitch; rg.x = P.x + 5; rg.z = P.z + 5; rg.yaw = 0; return 1; })()`);
await reload(); await sleep(1500); await waitGame(1.0);
s = await rig();
ok(!s.nan && s.on !== "v99", `a rig saved on a truck that doesn't exist doesn't crash (on ${s.on})`);
const bad = await J(`({ live: towLive(), bays: ST.bays, kind: TOW.kind })`);
console.log("after gone truck:", JSON.stringify(bad));
await shot("x2hb_final");
await done(fails ? 1 : 0);
