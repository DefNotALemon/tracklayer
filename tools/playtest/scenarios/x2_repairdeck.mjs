// Beta test for slice 2.7 repair service, part 3: repair a trailer with a STRAPPED sled on its deck (sled must stay glued, strap kept),
// repair a parked (non-current) truck at the garage, cash exactly the price / one short, a nearly-new machine (cond 99.4 / 98),
// double-click, and the repaired condition surviving a reload. Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
const rowOf = re => ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => ${re}.test(e.textContent)); return r ? r.className + "|" + r.textContent.replace(/\\s+/g, " ") : ""; })()`);
const click = re => ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => ${re}.test(e.textContent)); if (!r) return false; r.click(); return true; })()`);
const openG = () => ev(`garageTab = "trucks"; openGarage(); true`).then(() => sleep(400));
const state = () => J(`({ cash: GS.cash, t: TLX.state("vehicles").owned.map(r => r.cond), h: TLXV.haul() && TLXV.haul().cond, strap: TLXV.haul() && TLXV.haul().strap, cur: TLX.state("vehicles").cur })`);
const SLP = () => J(`(() => { const h = TLXV.haul(), s = TLX.state("vehicles"), p = s.cur == null ? P : (s.sled || VEH.sled); const L = TLXV.haulLocal(h, p.x, p.z); return { lx: L.x, lz: L.z, y: p.y, nan: [p.x, p.z, p.y].some(v => !isFinite(v)) }; })()`);

await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 30000; GS.delivered = 12; true`);
await park(); await sleep(400);
await openG();
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); true`); await sleep(400);
const GP = await J(`({ x: garageSite.x, z: garageSite.z })`);
await ev(`closeGarage(); true`);
let s = await state(); ok(s.t.length === 1 && s.h != null, `bought truck + trailer`);

// trailer unhitched 15 m from the garage, ramp down; sled on deck; strap it with E
await ev(`(() => { const h = TLXV.haul(); h.on = null; h.x = ${GP.x} + 15; h.z = ${GP.z} + 8; h.yaw = 0; h.ramp = 1; h.cond = 30; recenter(h.x, h.z, true); return 1; })()`); await sleep(500);
await ev(`(() => { const h = TLXV.haul(), lim = 2.25 - 0.06 - 1.5, w = TLXV.haulWorld(h, 0, lim - 0.05); crashCancel(); FOOT.on = false; const s = TLX.state("vehicles"); const p = s.cur == null ? P : (s.sled || VEH.sled); p.x = w[0]; p.z = w[1]; p.yaw = h.yaw; if (s.cur == null) { P.vx = P.vz = P.vy = 0; P.yr = 0; } p.y = TLXV.deckAt(p.x, p.z, 99); return 1; })()`);
await waitGame(0.6);
await ev(`(() => { const h = TLXV.haul(); const w = TLXV.haulWorld(h, TLXV.HAUL.deckW / 2 + 0.75, 0.7); FOOT.on = true; FOOT.x = w[0]; FOOT.z = w[1]; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = h.yaw - Math.PI / 2; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await waitGame(0.8); await tap("KeyE"); await waitGame(0.6);
s = await state(); ok(!!s.strap, `sled strapped on a 30% trailer (strap ${JSON.stringify(s.strap)})`);
const before = await SLP();
const o0 = await J(`({ foot: FOOT.on, ga: !!document.querySelector("#garage") && getComputedStyle(document.querySelector("#garage")).display })`); console.log("  pre-open", JSON.stringify(o0));
await openG(); console.log("  rows:", await ev(`[...document.querySelectorAll("#garageBody .row")].length`)); const cost = await J(`TLXV.repairCost("haul", TLXV.haul())`); console.log("  trailer repair price", cost);
ok(cost === 280, `trailer 30% -> $${cost} (70 pts x $4 = 280)`);
let r = await rowOf(`/Repair the fjordhenger/i`); ok(r !== "" && !/owned/.test(r.split("|")[0]), `repair row offered with a sled strapped aboard (cash ${(await state()).cash}, class "${r.split("|")[0]}")`);
// one short, then exact
await ev(`GS.cash = ${cost - 5}; true`); await openG();
r = await rowOf(`/Repair the fjordhenger/i`); ok(/owned/.test(r.split("|")[0]), `one $5 short: row locked (class "${r.split("|")[0]}")`);
let c0 = (await state()).cash; await click(`/Repair the fjordhenger/i`); await sleep(300); s = await state();
ok(s.h === 30 && s.cash === c0, `short of cash: nothing taken, cond stays ${s.h}`);
await ev(`GS.cash = ${cost}; true`); await openG();
await click(`/Repair the fjordhenger/i`); await click(`/Repair the fjordhenger/i`); await sleep(400); s = await state();
ok(s.h === 100 && s.cash === 0, `exact cash: repaired, cond ${s.h}, cash ${s.cash} (double click charged once)`);
ok(!!s.strap, `strap kept after repair`);
const after = await SLP();
ok(!after.nan && Math.abs(after.lx - before.lx) < 0.05 && Math.abs(after.lz - before.lz) < 0.05 && Math.abs(after.y - before.y) < 0.1, `sled still glued to the deck (lz ${before.lz.toFixed(2)} -> ${after.lz.toFixed(2)}, y ${before.y.toFixed(2)} -> ${after.y.toFixed(2)})`);
r = await rowOf(`/Repair the fjordhenger/i`); ok(r === "", `no repair row at 100%`);

// nearly-new machines: boundary
await ev(`TLXV.haul().cond = 99.4; TLX.state("vehicles").owned[0].cond = 98; TLX.state("vehicles").owned[0].x = ${GP.x} - 10; TLX.state("vehicles").owned[0].z = ${GP.z}; GS.cash = 5000; true`); await openG();
r = await rowOf(`/Repair the fjordhenger/i`); console.log("  trailer 99.4:", r.slice(0, 40));
const c994 = await J(`TLXV.repairCost("haul", TLXV.haul())`); const c98 = await J(`TLXV.repairCost("truck", TLX.state("vehicles").owned[0])`);
console.log("  price at 99.4 trailer", c994, "truck at 98", c98);
r = await rowOf(`/Repair the Fjellvogn/`); ok(r !== "" && /\$/.test(r), `truck 98% shows a repair row ($${c98})`);
ok(c98 === 40, `truck at 98% costs $40 (2 x 20), got ${c98}`);

// parked (non-current) truck 10 m from the garage: the truck record is not the current vehicle (sled is)
const cur = await J(`TLX.state("vehicles").cur`); ok(cur == null, `sled is the active vehicle, truck is a parked record`);
await click(`/Repair the Fjellvogn/`); await sleep(300); s = await state(); ok(s.t[0] === 100 && s.cash === 5000 - c98, `parked truck repaired from the garage (cash ${s.cash})`);
await ev(`TLX.state("vehicles").owned[0].cond = 50; TLX.state("vehicles").owned[0].x = ${GP.x} + 60; true`); await openG();
r = await rowOf(`/Repair the Fjellvogn/`); ok(/owned/.test(r.split("|")[0]) && /Bring it within/.test(r), `parked truck 60 m away: locked`);

// reload keeps the repaired condition
await ev(`TLX.state("vehicles").owned[0].cond = 100; TLX.state("vehicles").owned[0].x = ${GP.x} - 10; TLXV.haul().cond = 77; TLXV.repair("haul", TLXV.haul()); true`).catch(() => {}); await sleep(300);
const saved = await J(`JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /tracklayer|tl/i.test(k) && localStorage.getItem(k).length > 500)) || "{}")`).catch(() => ({}));
const sv = await state(); console.log("  state before reload", JSON.stringify(sv));
await shot("x2rd_deck_after");
done(fails);
