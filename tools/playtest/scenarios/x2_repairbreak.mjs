// Beta break test for slice 2.7 wear and repair (garage Trucks tab). Tries: the 40 m boundary, cash one short / exact,
// min price near 100%, the hide threshold (99.5), a stale row clicked twice, bad saved conds (NaN, negative, >100, string),
// repair while the truck is the one being driven. Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, sleep, done, park, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const rowOf = re => ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => ${re}.test(e.textContent)); return r ? r.className + "|" + r.textContent.replace(/\\s+/g, " ") : ""; })()`);
const click = re => ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => ${re}.test(e.textContent)); if (!r) return false; r.click(); return true; })()`);
const openG = () => ev(`garageTab = "trucks"; openGarage(); true`).then(() => sleep(400));
const state = () => J(`({ cash: GS.cash, t: TLX.state("vehicles").owned.map(r => r.cond), h: TLXV.haul() && TLXV.haul().cond, cur: TLX.state("vehicles").cur })`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 20000; GS.delivered = 12; true`); await sleep(600);
await park(); await sleep(300);
await openG();
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);     // truck
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); true`); await sleep(400); // trailer
let s = await state(); ok(s.t.length === 1 && s.h != null, `bought truck + trailer (${JSON.stringify(s)})`);
const GP = await J(`({ x: garageSite.x, z: garageSite.z })`);

// helper: place the truck (whatever holds it) d metres from the garage
const placeTruck = d => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0], T = s.cur === r.uid ? P : r; T.x = ${GP.x} + ${d}; T.z = ${GP.z}; if (s.cur === r.uid) { P.vx = P.vz = 0; } return 1; })()`);
const setCond = (t, h) => ev(`(() => { const s = TLX.state("vehicles"); s.owned[0].cond = ${t}; if (TLXV.haul()) TLXV.haul().cond = ${h}; return 1; })()`);

// A. boundary
await setCond(30, 30); await ev(`GS.cash = 20000; true`);
await placeTruck(41); await openG();
let r = await rowOf(`/Repair the Fjellvogn/`); ok(/owned/.test(r) && /Bring it within/.test(r), `A: 41 m: locked ("${r.slice(0, 60)}")`);
let c0 = (await state()).cash; await click(`/Repair the Fjellvogn/`); await sleep(300); s = await state();
ok(s.cash === c0 && s.t[0] === 30, `A: clicking the locked row at 41 m changes nothing (cash ${s.cash}, cond ${s.t[0]})`);
await placeTruck(39); await openG();
r = await rowOf(`/Repair the Fjellvogn/`); ok(!/owned/.test(r) && /\$1400/.test(r), `A: 39 m: offered for $1400 ("${r.slice(0, 60)}")`);

// B. one short, exact
await ev(`GS.cash = 1395; true`); await openG();
r = await rowOf(`/Repair the Fjellvogn/`); ok(/owned/.test(r), `B: cash 1395 vs 1400: row locked`);
c0 = 1395; await click(`/Repair the Fjellvogn/`); await sleep(300); s = await state();
ok(s.cash === 1395 && s.t[0] === 30, `B: clicking it repairs nothing (cash ${s.cash}, cond ${s.t[0]})`);
await ev(`GS.cash = 1400; true`); await openG();
await click(`/Repair the Fjellvogn/`); await sleep(300); s = await state();
ok(s.cash === 0 && s.t[0] === 100, `B: exactly 1400 repairs it to 100, cash ${s.cash}, cond ${s.t[0]}`);
r = await rowOf(`/Repair the Fjellvogn/`); ok(r === "", `B: the row is gone at 100%`);

// C. thresholds and the minimum price
for (const [cond, want] of [[99.4, 10], [99.6, null], [99.5, null], [99, 20], [0, 2000]]) {
  await setCond(cond, 100); await ev(`GS.cash = 5000; true`); await openG();
  r = await rowOf(`/Repair the Fjellvogn/`); const m = r.match(/\$(\d+)/);
  if (want === null) ok(r === "", `C: truck at ${cond}%: no repair row`);
  else ok(m && +m[1] === want, `C: truck at ${cond}%: price ${m && m[1]} (want ${want})`);
}
await setCond(100, 99.4); await openG(); r = await rowOf(`/Repair the fjordhenger/i`); { const m = r.match(/\$(\d+)/); ok(m && +m[1] >= 5 && +m[1] <= 10, `C: trailer at 99.4%: price $${m && m[1]}`); }

// D. a stale row clicked twice (double click before the garage redraws)
await setCond(60, 100); await ev(`GS.cash = 3000; true`); await openG();
const dbl = await J(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => /Repair the Fjellvogn/.test(e.textContent)); const c0 = GS.cash; r.click(); r.click(); r.click(); return { paid: c0 - GS.cash, cond: TLX.state("vehicles").owned[0].cond }; })()`);
ok(dbl.paid === 800 && dbl.cond === 100, `D: triple click on one row charges once: paid $${dbl.paid} (want 800)`);

// E. repair the truck while it is the one being driven
await ev(`(() => { const s = TLX.state("vehicles"); return s.cur; })()`);
const cur = await ev(`TLX.state("vehicles").cur`);
ok(true, `E: current vehicle is ${cur === null ? "the sled" : cur} (truck is parked; the driven case needs a swap)`);
await ev(`(() => { const s = TLX.state("vehicles"); TLXV.swapTo(s.owned[0].uid); return 1; })()`); await sleep(800);
s = await state(); ok(s.cur != null, `E: swapped into the truck (cur ${s.cur})`);
await placeTruck(20); await setCond(40, 100); await ev(`GS.cash = 2000; true`); await openG();
r = await rowOf(`/Repair the Fjellvogn/`); ok(!/owned/.test(r) && /\$1200/.test(r), `E: driving it 20 m away: offered $1200 ("${r.slice(0, 60)}")`);
await click(`/Repair the Fjellvogn/`); await sleep(300); s = await state(); ok(s.t[0] === 100 && s.cash === 800, `E: repaired while driven (cond ${s.t[0]}, cash ${s.cash})`);
const rt = await J(`TLXV.rt() && { cond: TLXV.rt().cond }`);
ok(rt && rt.cond === 100, `E: the live runtime sees ${rt && rt.cond}% (its own cached cond field)`);
await placeTruck(60); await setCond(40, 100); await openG();
r = await rowOf(`/Repair the Fjellvogn/`); ok(/owned/.test(r), `E: driving it 60 m away: locked`);

// F. bad saved conds
for (const bad of ["NaN", "-50", "250", "\"abc\"", "null"]) {
  await ev(`(() => { const s = TLX.state("vehicles"); s.owned[0].cond = ${bad === "NaN" ? "NaN" : bad}; if (TLXV.haul()) TLXV.haul().cond = ${bad === "NaN" ? "NaN" : bad}; GS.cash = 3000; return 1; })()`);
  await ev(`save(); true`); await sleep(300);
  await reload(); await sleep(1500);
  s = await state(); const errs = await J(`window.__errs || []`);
  ok(s.t.length === 1 && Number.isFinite(s.t[0]) && s.t[0] >= 0 && s.t[0] <= 100 && (s.h == null || (Number.isFinite(s.h) && s.h >= 0 && s.h <= 100)), `F: saved cond ${bad}: truck ${s.t[0]}, trailer ${s.h}`);
  await ev(`tutSkip(); crashCancel(); true`); await openG();
  const dd = await J(`(() => { const r = [...document.querySelectorAll("#garageBody .row")]; return r.filter(e => /Repair|NaN|undefined/.test(e.textContent)).map(e => e.textContent.replace(/\\s+/g, " ").slice(0, 70)); })()`);
  ok(!dd.some(t => /NaN|undefined/.test(t)), `F: ${bad}: garage rows have no NaN/undefined (${dd.length} repair rows)`);
}
done(fails);
