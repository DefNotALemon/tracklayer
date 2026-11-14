// Expansion slices 2.2 + 2.3: the vehicle core and the first pickup. Asserts, exit 1 on a failure.
//   no pickup owned: the sled mounts and rides as before; buying: cash down, the truck on the forecourt; walking nearer a
//   vehicle makes it the current one and the hint names it; Q gets in (the animation completes), W drives; speed by gameClock
//   on a plowed lane against deep unpacked powder (much slower, and the throttle ends bogged); ruts under the wheels and
//   reversing back along them; warmth in the cab against the sled; Q gets out; back to the sled; fuel and parcels stay with
//   their vehicle; save -> reload() restores both, and a reload while seated comes back seated; pad (LB) and touch paths.
// Headless Chrome runs ~0.6x real time: everything is measured by gameClock.
import { boot, ev, tap, sleep, done, park, padSet, padOff, reload, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(150); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const holdFor = async (code, secs, fn) => {                                   // hold a key for secs of GAME time, sampling fn
  await down(code); const t0 = await clock(), out = [];
  try { for (;;) { await sleep(250); const t = await clock(); out.push(await fn()); if (t - t0 >= secs) break; } } finally { await up(code); }
  return out;
};
const spd = () => J(`{ t: +gameClock.toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), x: P.x, z: P.z, bog: BOG.on, acc: +BOG.acc.toFixed(2) }`);
const owned = () => J(`TLX.state("vehicles").owned.map(r => ({ uid: r.uid, x: r.x, z: r.z, yaw: r.yaw, fuel: r.fuel, load: r.load.length }))`);
const truckAt = async () => (await J(`(() => { const c = TLX.state("vehicles"); const r = c.owned.find(r => r.uid === c.cur); return r ? { x: r.x, z: r.z } : null; })()`));
// stand the walker next to the truck's door side and let the nearest-vehicle rule pick it
const walkerBeside = (uidExpr, off = 3.0) => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(r => r.uid === ${uidExpr}); const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  FOOT.on = true; FOOT.x = x + fz * ${off} - fx * 0.3; FOOT.z = z - fx * ${off} - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);

// ---- 1. no pickup owned: the sled is untouched
let s = await J(`({ cur: !!VEH.cur, owned: TLX.state("vehicles").owned.length, tabs: VEH.tabs.map(t => t.name), board: VEH.board, tq: $("tcQ").hidden })`);
ok(!s.cur && s.owned === 0 && s.board === "get on the sled", "no pickup owned: the sled is the vehicle and nothing is parked");
ok(s.tabs.includes("Trucks"), "the garage has a Trucks tab");
console.log("parked", JSON.stringify(await park()));
await sleep(900); await tap("KeyQ"); await waitUntil(`FOOT.on && !MNT.on && !DMT.on`, 8); await sleep(300);   // poll, don't sleep: a dismount's length in wall time depends on the machine's load
s = await J(`({ foot: FOOT.on, mnt: MNT.on, dmt: DMT.on, hint: $("wnHint").textContent })`);
ok(s.foot && !s.mnt && !s.dmt, "Q gets off the sled (animation done)");
ok(/get on the sled/.test(s.hint), "on foot beside the sled the hint says get on the sled: " + s.hint);
await tap("KeyQ"); await waitUntil(`!FOOT.on && !MNT.on`, 10); await sleep(300);
s = await J(`({ foot: FOOT.on, cur: !!VEH.cur })`);
ok(!s.foot && !s.cur, "Q gets back on the sled");
{ const r = await holdFor("KeyW", 4, spd); const v = r[r.length - 1].v; ok(v > 8, `sled rides: ${v.toFixed(1)} m/s after 4 s of throttle`); }
await ev(`crashCancel(); FOOT.on = false; true`);

// ---- 2. buying
await ev(`GS.cash = 5000; GS.fuel = 11; P.vx = P.vz = 0; true`); await sleep(500);
const sledPose = await J(`({ x: P.x, z: P.z })`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(500);
s = await J(`({ rows: [...document.querySelectorAll("#garageBody .row")].map(b => b.textContent), tab: [...$("garageTabs").children].map(b => b.textContent) })`);
ok(s.tab.includes("Trucks") && s.rows.length >= 1 && /Fjellvogn/.test(s.rows[0]) && /\$4200/.test(s.rows[0]), "the Trucks tab lists the pickup new at $4200");
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(500);
await ev(`closeGarage(); true`);
const o1 = (await owned())[0];
const cash1 = await ev("GS.cash");
ok(cash1 === 800, `buying took $4200 (cash ${cash1})`);
const gar = await J(`({ x: garageSite.x, z: garageSite.z })`);
const near = await J(`({ water: isWater(${o1.x}, ${o1.z}), ob: obNear(${o1.x}, ${o1.z}, 2.4), yard: yardAt(${o1.x}, ${o1.z}) })`);
ok(Math.hypot(o1.x - gar.x, o1.z - gar.z) < 40 && !near.water && !near.ob && near.yard > 0.5, `the truck is parked on the plowed forecourt, clear of obstacles (${Math.hypot(o1.x - gar.x, o1.z - gar.z).toFixed(0)} m from the garage)`);
ok(Math.hypot(o1.x - sledPose.x, o1.z - sledPose.z) > 4, "clear of the sled");
ok(o1.fuel === 70, "it comes with a full 70 L tank");

// ---- 3. walking nearer makes it the current vehicle; the hint names it
await walkerBeside("'v1'", 3.2); await sleep(1200);
s = await J(`({ cur: TLX.state("vehicles").cur, hint: $("wnHint").textContent, sled: VEH.sled ? [VEH.sled.x, VEH.sled.z] : null })`);
ok(s.cur === "v1", "walking up to the truck makes it the current vehicle");
ok(/get in the pickup/.test(s.hint), "the hint names it: " + s.hint);
ok(s.sled && Math.hypot(s.sled[0] - sledPose.x, s.sled[1] - sledPose.z) < 0.5, "the sled stays where it was left");
// ... and walking back to the sled hands P back, no mount in between
await ev(`FOOT.x = ${sledPose.x} + 2; FOOT.z = ${sledPose.z}; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); true`); await sleep(1500);
s = await J(`({ cur: TLX.state("vehicles").cur, hint: $("wnHint").textContent })`);
ok(s.cur === null && /get on the sled/.test(s.hint), "next to the sled again the sled is current and the hint says so: " + s.hint);
await walkerBeside("'v1'", 3.2); await sleep(1200);

// ---- 4. get in
await tap("KeyQ"); await sleep(400);
s = await J(`({ mnt: MNT.on })`); ok(s.mnt, "Q starts the climb in");
const doneIn = await waitUntil("!MNT.on", 10);
await sleep(400);
s = await J(`({ foot: FOOT.on, cur: !!VEH.cur, door: TLXV.rt().door, drv: TLXV.rt().drvBody.visible, walker: FOOT.g.visible, fuel: GS.fuel, cap: GS.cap, slots: ST.slots })`);
ok(doneIn && !s.foot && s.cur && s.door === 0 && s.drv && !s.walker, "the animation completes: seated, door shut, the driver behind the glass, the walker gone");
ok(s.fuel === 70 && s.cap === 70 && s.slots === 8, `the truck's own tank (${s.fuel}/${s.cap} L) and bed (${s.slots} parcels)`);
const shot0 = await ev(`renderer.info.render.calls`);

// ---- 5. speed on a plowed lane against deep powder
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
console.log("lane", JSON.stringify(lane));
ok(lane && lane.L > 35, `a plowed lane to drive on (${lane ? lane.L.toFixed(0) : 0} m)`);
const ux = (lane.x2 - lane.x) / lane.L, uz = (lane.z2 - lane.z) / lane.L;
await ev(`(() => { const x = ${lane.x} + ${ux} * 3, z = ${lane.z} + ${uz} * 3; P.x = x; P.z = z; P.yaw = Math.atan2(${ux}, ${uz}); P.vx = P.vz = 0; recenter(x, z, true); camState.init = false; return 1; })()`);
await sleep(900);
let rl = await holdFor("KeyW", 5, spd);
const vLane = rl[rl.length - 1].v, dLane = Math.hypot(rl[rl.length - 1].x - rl[0].x, rl[rl.length - 1].z - rl[0].z);
console.log("lane run", rl.filter((_, i) => i % 4 === 0).map(r => r.v).join(" "), "m/s; covered", dLane.toFixed(0), "m");
ok(vLane > 7 && !rl.some(r => r.bog), `on the plowed lane it drives: ${vLane.toFixed(1)} m/s after 5 s, ${dLane.toFixed(0)} m, not bogged`);
await sleep(500);
// deep powder: find open, level ground, check it is >= 0.6 m of fresh snow, or lay it
await ev(`(() => { for (let r = 0; r < 1500; r += 20) for (let a = 0; a < 6.28; a += 0.5) { const x = P.x + 500 + Math.cos(a) * r, z = P.z + 300 + Math.sin(a) * r; if (isSea(x, z) || isWater(x, z)) continue; if (Math.abs(groundAt(x + 20, z) - groundAt(x - 20, z)) > 1.2 || Math.abs(groundAt(x, z + 20) - groundAt(x, z - 20)) > 1.2) continue; if (obNear(x, z, 30)) continue; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vz = 0; recenter(x, z, true); camState.init = false; return 1; } return 0; })()`);
await sleep(1000);
// lay 0.65 m of unpacked powder under and ahead of the truck
// (the snow field keeps only the chunks near you, so lay a short strip and re-lay it ahead as you go)
const lay = (d, len = 24, wid = 6, from = -6) => ev(`(() => { const cx = P.x, cz = P.z; for (let ix = Math.floor((cx - ${wid} + HALF) / CELL); ix <= Math.ceil((cx + ${wid} + HALF) / CELL); ix++) for (let iz = Math.floor((cz + ${from} + HALF) / CELL); iz <= Math.ceil((cz + ${len} + HALF) / CELL); iz++) { const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = ${d}; c.d[k] = ${d}; writeCell(ix, iz, d0, ${d}, ${d}); } recenter(P.x, P.z, true); return 1; })()`);
await lay(0.65, 20, 5);
await sleep(600);
const dp = await J(`{ d: depthAt(Math.round((P.x + HALF) / CELL), Math.round((P.z + HALF) / CELL)) }`);
ok(dp.d >= 0.6, `the test ground is ${dp.d.toFixed(2)} m of unpacked powder`);
await ev(`BOG.immune = 0; true`);
const rp = await holdFor("KeyW", 14, spd);
const vPow = Math.max(...rp.map(r => r.v)), dPow = Math.hypot(rp[rp.length - 1].x - rp[0].x, rp[rp.length - 1].z - rp[0].z);
console.log("powder run", rp.filter((_, i) => i % 4 === 0).map(r => r.v).join(" "), "m/s; bog", rp.some(r => r.bog), "moved", dPow.toFixed(1), "m");
ok(vPow < vLane / 3, `in 0.65 m of powder it is much slower: top ${vPow.toFixed(1)} m/s against ${vLane.toFixed(1)} on the lane`);
ok(rp.some(r => r.bog) && await ev("BOG.on"), "sustained throttle in the powder ends bogged (the game's own bog)");
s = await J(`({ hint: $("wnHint").textContent })`);
ok(/STUCK/.test(s.hint) && /Q/.test(s.hint), "the stuck line speaks of the truck and names the controls: " + s.hint);
// get out of the hole the cheap way (reset), then the ruts test on thinner snow
await ev(`BOG.on = false; BOG.acc = 0; BOG.immune = 30; true`);
await ev(`(() => { const x = P.x, z = P.z - 30; P.x = x; P.z = z; P.vx = P.vz = 0; P.yaw = 0; recenter(x, z, true); return 1; })()`);
await lay(0.15, 28, 5, -4); await sleep(600);
const w0 = await J(`(() => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), lx = fz, lz = -fx, x = P.x + lx * 0.83 + fx * 9, z = P.z + lz * 0.83 + fz * 9; return { x, z, d: depthAt(Math.round((x + HALF) / CELL), Math.round((z + HALF) / CELL)) }; })()`);
await ev(`BOG.immune = 30; true`);
await down("KeyW"); await sleep(200);
{ const t0 = await clock(); for (;;) { await sleep(300); if ((await clock()) - t0 > 5.5) break; await lay(0.15, 28, 5, 6); } }
await up("KeyW");
const w1 = await J(`depthAt(Math.round((${w0.x} + HALF) / CELL), Math.round((${w0.z} + HALF) / CELL))`);
const moved = await J(`({ z: P.z, v: Math.hypot(P.vx, P.vz) })`);
console.log("rut cell depth before", w0.d.toFixed(3), "after", w1.toFixed(3), "truck z", moved.z.toFixed(0));
ok(w0.d > 0.12 && w1 < w0.d * 0.6, `each wheel presses a rut: the cell under the left tyre went from ${w0.d.toFixed(2)} to ${w1.toFixed(2)} m`);
// reverse along the ruts: brake to a stop and keep holding S
await down("KeyS"); await sleep(250);
const t0r = await clock(); let vmin = 0;
for (let i = 0; i < 40; i++) { await sleep(250); const v = await ev(`P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)`); vmin = Math.min(vmin, v); if ((await clock()) - t0r > 7) break; }
await up("KeyS");
ok(vmin < -1.5, `holding S at a standstill backs it up along its own ruts (${vmin.toFixed(1)} m/s)`);
await sleep(600);

// ---- 6. warmth in the cab against the sled, same spot, night
await ev(`BOG.on = false; GS.hour = 22.5; GS.storm = 0; GOD.warm = false; true`);
await ev(`P.vx = P.vz = 0; true`); await sleep(500);
const dropOf = async secs => { await ev(`GS.warmth = 100; true`); const t0 = await clock(); await sleep(200); const w = await J(`({ t: gameClock, w: GS.warmth })`); await waitGame(secs); const w2 = await J(`({ t: gameClock, w: GS.warmth })`); return (w.w - w2.w) / (w2.t - w.t); };
const dTruck = await dropOf(6);
const spot = await J(`({ x: P.x, z: P.z, yaw: P.yaw })`);
ok(await ev("!!VEH.cur"), "(still in the truck for the warmth reading)");
// out, and onto the sled, which is moved to this very spot
await tap("KeyQ"); await sleep(400);
ok(await waitUntil("!DMT.on", 10), "Q gets out of the truck (animation completes)");
await sleep(300);
s = await J(`({ foot: FOOT.on, dmt: DMT.on, vis: FOOT.g.visible, door: TLXV.rt().door })`);
ok(s.foot && !s.dmt && s.vis, "standing beside the truck");
await ev(`(() => { const s = VEH.sled; s.x = ${spot.x} - Math.cos(${spot.yaw}) * 6; s.z = ${spot.z} + Math.sin(${spot.yaw}) * 6; return 1; })()`);
await ev(`(() => { const s = VEH.sled; FOOT.x = s.x + 1.8; FOOT.z = s.z; FOOT.y = surf(FOOT.x, FOOT.z); return 1; })()`); await sleep(1500);
ok((await J(`TLX.state("vehicles").cur`)) === null, "walking to the sled makes the sled current again");
const truckPark = (await owned())[0];
ok(Math.hypot(truckPark.x - spot.x, truckPark.z - spot.z) < 0.5, "the truck was left exactly where it was parked");
await tap("KeyQ"); await sleep(400); await waitUntil("!MNT.on", 8); await sleep(300);
s = await J(`({ foot: FOOT.on, cur: !!VEH.cur })`);
ok(!s.foot && !s.cur, "Q mounts the sled, with the truck left where it was parked");
const dSled = await dropOf(6);
console.log(`warmth drain at night: truck ${dTruck.toFixed(3)}/s, sled ${dSled.toFixed(3)}/s`);
ok(dTruck < dSled * 0.5, `warmth loss in the cab (${dTruck.toFixed(3)}/s) is well under the sled's (${dSled.toFixed(3)}/s)`);

// ---- 7. fuel and parcels stay with their vehicle
await ev(`GS.hour = 12; GS.fuel = 7.5; GS.load = []; true`);
await ev(`GS.load.push({ dest: depot, cargo: "Package", pay: 40, fragile: false, due: null, hits: 0 }); true`);   // a parcel on the SLED
const tFuel = (await owned())[0].fuel;
await walkerBeside("'v1'", 3.2); await ev(`GS.near = null; true`); await sleep(1500);
s = await J(`({ cur: TLX.state("vehicles").cur, fuel: GS.fuel, load: GS.load.length })`);
ok(s.cur === "v1" && Math.abs(s.fuel - tFuel) < 0.2 && s.load === 0, `in the truck: its own fuel (${s.fuel.toFixed(1)} L) and an empty bed (${s.load} parcels), the sled's parcel stayed on the sled`);
await ev(`GS.fuel = 33; GS.load.push({ dest: depot, cargo: "Crate", pay: 55, fragile: false, due: null, hits: 0 }, { dest: depot, cargo: "Box", pay: 30, fragile: false, due: null, hits: 0 }); true`);
await ev(`FOOT.x = VEH.sled.x + 0.9; FOOT.z = VEH.sled.z; FOOT.y = surf(FOOT.x, FOOT.z); true`); await sleep(1500);
s = await J(`({ cur: TLX.state("vehicles").cur, fuel: GS.fuel, load: GS.load.length })`);
ok(s.cur === null && Math.abs(s.fuel - 7.5) < 0.2 && s.load === 1, `back on the sled: ${s.fuel.toFixed(1)} L and ${s.load} parcel (the truck kept 33 L and 2 parcels)`);
const o2 = (await owned())[0];
ok(Math.abs(o2.fuel - 33) < 0.5, `the truck's record holds its fuel (${o2.fuel.toFixed(1)} L)`);

// ---- 8. save, reload: both vehicles come back
await ev(`TLX.state("vehicles").owned[0].cond = 91; save(); true`); await sleep(300);
const saved = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2")).x.sys.vehicles.s`);
ok(saved.owned.length === 1 && saved.owned[0].load.length === 2 && saved.owned[0].load[0].dest && saved.owned[0].load[0].dest.$s, "the save holds the truck with its two parcels as plain JSON (sites by id)");
await reload();
await ev(`tutSkip(); true`); await sleep(400);
let r2 = (await owned())[0];
ok(r2 && Math.abs(r2.x - o2.x) < 0.5 && Math.abs(r2.z - o2.z) < 0.5 && Math.abs(r2.fuel - 33) < 0.5 && r2.load === 2, `after reload the truck is where it was, ${r2 && r2.fuel.toFixed(0)} L, ${r2 && r2.load} parcels`);
s = await J(`({ cur: !!VEH.cur, cond: TLX.state("vehicles").owned[0].cond, d: Math.hypot(P.x - SPAWN.x, P.z - SPAWN.z), foot: FOOT.on, fuel: GS.fuel })`);
console.log("after reload", JSON.stringify(s));
ok(!s.cur && s.cond === 91 && s.d < 40, "after reload the sled is current at its spawn, condition kept (91%)");

// ---- 9. reload while seated in the truck: back in the truck
await ev(`crashCancel(); true`);
await walkerBeside("'v1'", 3.2); await sleep(1500);
await tap("KeyQ"); await sleep(400); await waitUntil("!MNT.on", 10); await sleep(500);
s = await J(`({ cur: !!VEH.cur, foot: FOOT.on, load: GS.load.length, fuel: GS.fuel })`);
ok(s.cur && !s.foot && s.load === 2, "seated in the truck with its parcels");
await ev(`P.x += 0; save(); true`); await sleep(300);
const seatedAt = await J(`({ x: P.x, z: P.z, yaw: P.yaw, sled: VEH.sled ? { x: VEH.sled.x, z: VEH.sled.z } : null })`);
await reload();
await sleep(500);
s = await J(`({ cur: !!VEH.cur, foot: FOOT.on, x: P.x, z: P.z, load: GS.load.length, fuel: GS.fuel, rid: TLX.state("vehicles").cur, sled: VEH.sled ? { x: VEH.sled.x, z: VEH.sled.z } : null, drv: TLXV.rt() && TLXV.rt().drvBody.visible })`);
ok(s.cur && !s.foot && s.rid === "v1" && Math.hypot(s.x - seatedAt.x, s.z - seatedAt.z) < 0.5 && s.load === 2 && s.drv, "a reload while seated comes back seated in the truck, same spot, same parcels");
ok(s.sled && seatedAt.sled && Math.hypot(s.sled.x - seatedAt.sled.x, s.sled.z - seatedAt.sled.z) < 0.5, "and the sled is where it was parked");
await ev(`tutSkip(); true`);
// it drives after a reload (the old spot was a drift: put it on the lane)
await ev(`(() => { const x = ${lane.x} + ${ux} * Math.min(45, ${lane.L} / 3), z = ${lane.z} + ${uz} * Math.min(45, ${lane.L} / 3); P.x = x; P.z = z; P.yaw = Math.atan2(${ux}, ${uz}); P.vx = P.vz = 0; BOG.on = false; recenter(x, z, true); camState.init = false; return 1; })()`); await sleep(900);
{ const r = await holdFor("KeyW", 3, spd); ok(r[r.length - 1].v > 2, `drives after the reload (${r[r.length - 1].v.toFixed(1)} m/s)`); }

// ---- 10. pad and touch
await sleep(300);
await ev(`P.vx = P.vz = 0; true`);
await padSet({ 4: 1 }); await sleep(250); await padSet(); await sleep(400);
ok(await waitUntil("!DMT.on && FOOT.on", 10), "pad: LB gets out of the truck");
await sleep(600);
await padSet({ 4: 1 }); await sleep(250); await padSet(); await sleep(400);
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 10), "pad: LB gets in");
await padOff(); await sleep(300);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(700);
const tapB = id => `(() => { const b = $("${id}"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`;
const tap1 = tapB("tcQ"), tap2 = tapB("tcOn");
s = await J(`({ hidden: $("tcQ").hidden, label: $("tcQ").textContent })`);
ok(!s.hidden && s.label === "GET OFF", "touch: in the truck the GET OFF button is there");
await ev(tap1); ok(await waitUntil("!DMT.on && FOOT.on", 10), "touch: GET OFF gets out");
await sleep(600);
s = await J(`({ label: $("tcOn").textContent, hint: $("wnHint").textContent })`);
ok(s.label === "GET ON" && /tap GET ON/.test(s.hint), "touch: on foot it reads GET ON and the hint says tap GET ON: " + s.hint);
await ev(tap2); ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 10), "touch: GET ON gets in");

console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
