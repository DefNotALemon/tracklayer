// Beta test for slice 2.7 repair service, part 2: trailer repair while HITCHED and towed to the garage, trailer stranded far
// away while the truck is at the garage, the trailer's repair vs a truck driven there, haulWear effect after repair, and
// the repair rows on a phone-size screen (390x844 touch). Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, sleep, done, park, shot, send } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const rowOf = re => ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => ${re}.test(e.textContent)); return r ? r.className + "|" + r.textContent.replace(/\\s+/g, " ") : ""; })()`);
const click = re => ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => ${re}.test(e.textContent)); if (!r) return false; r.click(); return true; })()`);
const openG = () => ev(`garageTab = "trucks"; openGarage(); true`).then(() => sleep(400));
const state = () => J(`({ cash: GS.cash, t: TLX.state("vehicles").owned.map(r => r.cond), h: TLXV.haul() && TLXV.haul().cond, on: TLXV.haul() && TLXV.haul().on, cur: TLX.state("vehicles").cur })`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 30000; GS.delivered = 12; true`); await sleep(600);
await park(); await sleep(300);
await openG();
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); true`); await sleep(400);
let s = await state(); ok(s.t.length === 1 && s.h != null, `bought truck + trailer (${JSON.stringify(s)})`);
const GP = await J(`({ x: garageSite.x, z: garageSite.z })`);
await ev(`closeGarage && closeGarage(); true`).catch(() => {});

// hitch: put the truck's ball on the trailer's coupler by moving the truck, then set h.on
await ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0], h = TLXV.haul(); TLXV.swapTo(r.uid); return 1; })()`); await sleep(900);
await ev(`(() => { const h = TLXV.haul(), s = TLX.state("vehicles"), r = s.owned[0], c = TLXV.haulCoupler(h), fx = Math.sin(h.yaw), fz = Math.cos(h.yaw); crashCancel(); FOOT.on = false;
  P.yaw = h.yaw; P.x = c[0] - fx * 4; P.z = c[1] - fz * 4; P.vx = P.vz = 0; h.on = r.uid; return 1; })()`); await sleep(1500);
s = await state(); ok(s.on != null, `trailer hitched to the truck (on ${s.on})`);

// drive (teleport at speed 0) the rig to 20 m from the garage; let the trailer follow
await ev(`(() => { const s = TLX.state("vehicles"); P.x = ${GP.x} + 20; P.z = ${GP.z}; P.vx = P.vz = 0; s.owned[0].cond = 50; TLXV.haul().cond = 50; GS.cash = 5000; return 1; })()`); await sleep(1500);
const pose = await J(`(() => { const h = TLXV.haul(); return { hx: h.x, hz: h.z, px: P.x, pz: P.z, d: Math.hypot(h.x - ${GP.x}, h.z - ${GP.z}), dp: Math.hypot(P.x - ${GP.x}, P.z - ${GP.z}), on: h.on }; })()`);
console.log("  rig pose", JSON.stringify(pose));
ok(pose.on != null && pose.d <= 40, `hitched trailer follows the truck to the garage (trailer ${pose.d.toFixed(1)} m, truck ${pose.dp.toFixed(1)} m, on ${pose.on})`);
await openG();
let r = await rowOf(`/Repair the sled trailer|Repair the fjordhenger/i`); console.log("  trailer row:", r.slice(0, 120));
ok(r !== "" && !/owned/.test(r.split("|")[0]), `trailer repair row offered while hitched at 20 m`);
const c0 = (await state()).cash; await click(`/Repair the sled trailer|Repair the fjordhenger/i`); await sleep(300); s = await state();
ok(s.h === 100 && s.cash < c0, `trailer repaired while hitched (cond ${s.h}, paid ${c0 - s.cash})`);
ok(s.on != null, `still hitched after the repair (on ${s.on})`);
r = await rowOf(`/Repair the Fjellvogn/`); ok(r !== "", `truck row still there (cond ${s.t[0]})`);
await click(`/Repair the Fjellvogn/`); await sleep(300); s = await state(); ok(s.t[0] === 100, `truck repaired too (${s.t[0]})`);

// haulWear before/after
const w = await J(`({ w100: TLXV.haulWear() })`); ok(Math.abs(w.w100 - 1) < 0.001, `haulWear at 100% = ${w.w100}`);
await ev(`TLXV.haul().cond = 0; true`); const w0 = await J(`TLXV.haulWear()`); ok(Math.abs(w0 - 1.6) < 0.001, `haulWear at 0% = ${w0}`);

// trailer stranded far from the garage while the truck sits at the garage (unhitched)
await ev(`(() => { const h = TLXV.haul(); TLX.state("vehicles").owned[0].cond = 40; h.cond = 40; h.on = null; h.x = ${GP.x} + 300; h.z = ${GP.z}; P.x = ${GP.x} + 10; P.z = ${GP.z}; P.vx = P.vz = 0; GS.cash = 5000; return 1; })()`); await sleep(600);
await openG();
r = await rowOf(`/Repair the sled trailer|Repair the fjordhenger/i`); ok(/owned/.test(r.split("|")[0]) && /Bring it within/.test(r), `trailer 300 m away: locked ("${r.slice(0, 80)}")`);
r = await rowOf(`/Repair the Fjellvogn/`); ok(r !== "" && !/owned/.test(r.split("|")[0]), `truck at 10 m: offered`);

// phone layout
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(500);
await openG(); await sleep(500);
const lay = await J(`(() => { const body = document.querySelector("#garageBody"), g = document.querySelector("#garage") || body.parentElement; const W = innerWidth, H = innerHeight;
  const rows = [...body.querySelectorAll(".row")].filter(e => /Repair/.test(e.textContent)).map(e => { const b = e.getBoundingClientRect(); const btn = e.querySelector("button, .pr, .price, .buy"); return { t: e.textContent.replace(/\\s+/g, " ").slice(0, 40), l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height), scrollW: e.scrollWidth, clientW: e.clientWidth }; });
  const gb = g.getBoundingClientRect(); return { W, H, g: [Math.round(gb.left), Math.round(gb.right)], bodyScroll: [body.scrollWidth, body.clientWidth], rows }; })()`);
console.log("  phone layout", JSON.stringify(lay));
ok(lay.rows.length >= 2, `phone: ${lay.rows.length} repair rows shown`);
ok(lay.rows.every(x => x.l >= 0 && x.r <= lay.W && x.scrollW <= x.clientW + 1), `phone: rows inside the ${lay.W}px screen with no horizontal overflow`);
ok(lay.rows.every(x => x.h >= 44), `phone: rows tall enough to tap (min ${Math.min(...lay.rows.map(x => x.h))} px)`);
await ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => /Repair/.test(e.textContent)); r && r.scrollIntoView({ block: "center" }); return 1; })()`); await sleep(300);
await shot("x2rh_phone_repair");
const errs = await J(`window.__errs || []`);
done(fails);
