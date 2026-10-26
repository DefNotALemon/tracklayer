// G2: what each sled gives you beyond raw power, as the physics and the garage see it (stock parts):
// power/drag, fuel, burn, range (L ÷ burn, relative to the Summit), parcel slots, warmth, and the garage
// Sleds-tab card text for the Trekker and Aurora E. Then rides the Trekker 20 s full throttle and logs
// litres used vs the Summit over the same ride (by gameClock), and tries to load two parcels on each.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_sledperks.mjs
import { boot, ev, done, hold } from "../lib.mjs";
await boot();
const out = JSON.parse(await ev(`(() => {
  const R = { sleds: [] }, keep = GS.own.sled;
  GS.own.sleds = SLEDS.map(x => x.id);
  let ref = 0;
  for (const s of SLEDS) {
    GS.own.sled = s.id; restat();
    const range = ST.fuel / ST.burn; if (s.id === "summit") ref = range;
    R.sleds.push({ id: s.id, pd: +(ST.power / ST.drag).toFixed(2), fuel: ST.fuel, burn: +ST.burn.toFixed(2), range: +range.toFixed(1), slots: ST.slots, warm: +ST.warm.toFixed(1), coldMul: +ST.coldMul.toFixed(2) });
  }
  for (const r of R.sleds) r.rangeVsSummit = +(r.range / ref).toFixed(2);
  GS.own.sleds = ["frontier"]; GS.delivered = 30; GS.own.sled = keep; restat();
  document.querySelector("#garage").hidden = false; garageTab = "sleds"; renderGarage();
  const rows = [...document.querySelectorAll("#garageBody .row")].map(b => b.innerText.replace(/\\n+/g, " | "));
  R.cards = rows.filter(t => /Trekker|Aurora E|Summit 600/.test(t));
  document.querySelector("#garage").hidden = true; GS.delivered = 0;
  return JSON.stringify(R);
})()`));
console.log("SLED       p/d   fuel burn range xSummit slots warm coldMul");
for (const s of out.sleds) console.log(`  ${s.id.padEnd(10)} ${String(s.pd).padEnd(5)} ${String(s.fuel).padEnd(4)} ${String(s.burn).padEnd(4)} ${String(s.range).padEnd(5)} ${String(s.rangeVsSummit).padEnd(7)} ${s.slots}     ${s.warm}  ${s.coldMul}`);
console.log("CARDS (at 30 deliveries, only Frontier owned):");
for (const c of out.cards) console.log("  " + c);
// fuel used on the same 20 s full-throttle ride
for (const id of ["summit", "trekker"]) {
  await ev(`(() => { GS.own.sleds = SLEDS.map(x => x.id); GS.own.sled = "${id}"; restat(); GS.fuel = GS.cap; P.x = SPAWN.x; P.z = SPAWN.z; P.yaw = SPAWN.yaw !== undefined ? SPAWN.yaw : Math.PI; P.vx = P.vz = 0; if (P.v !== undefined) P.v = 0; window.__f0 = GS.fuel; window.__t0 = gameClock; return 1; })()`);
  await hold("KeyW", 20000);
  const r = JSON.parse(await ev(`JSON.stringify({ used: +(window.__f0 - GS.fuel).toFixed(3), t: +(gameClock - window.__t0).toFixed(1), d: +Math.hypot(P.x - SPAWN.x, P.z - SPAWN.z).toFixed(0) })`));
  console.log(`RIDE ${id}: ${r.used} L in ${r.t} s game, ${r.d} m`);
}
const slots = JSON.parse(await ev(`(() => { const o = {}; for (const id of ["summit", "trekker"]) { GS.own.sled = id; restat(); o[id] = ST.slots; } return JSON.stringify(o); })()`));
console.log("SLOTS", JSON.stringify(slots));
await done();
