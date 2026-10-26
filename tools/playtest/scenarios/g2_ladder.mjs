// G2 progression audit: what each sled really is (stats as the physics sees them), what a job board pays at
// each delivery count, how long those jobs take by the game's own estimate, and what the garage shows a new
// player. No riding: it samples makeJobs/makeContracts many times per level and summarises.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_ladder.mjs
import { boot, ev, done } from "../lib.mjs";
await boot();
const out = JSON.parse(await ev(`(() => {
  const R = { sleds: [], boards: [], garage: {} };
  const keep = GS.own.sled;
  for (const s of SLEDS) {
    GS.own.sleds = SLEDS.map(x => x.id); GS.own.sled = s.id; restat();
    R.sleds.push({ id: s.id, cost: s.cost, need: s.need, power: +ST.power.toFixed(2), drag: ST.drag, grip: ST.grip, fuel: ST.fuel, burn: ST.burn, zip: ST.zip, pd: +(ST.power / ST.drag).toFixed(2) });
  }
  GS.own.sleds = ["frontier"]; GS.own.sled = keep; restat();
  for (const lvl of [0, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 30]) {
    GS.delivered = lvl; const pays = [], ests = [], kms = [], con = [];
    for (let i = 0; i < 40; i++) {
      makeJobs(depot);
      for (const j of GS.jobs) { if (j.steamer || j.tour) continue; const f = j.from || depot; const g = jobGeom(j.dest, f); pays.push(j.pay); ests.push(g.est); kms.push(g.dist / 1000); }
      for (const c of GS.contracts || []) if (!c.locked && c.pay) con.push((c.groom ? "groom" : c.expedition ? "exped" : c.priority ? "prio" : c.big ? "heavy" : c.rescue ? "rescue" : "other") + ":" + c.pay);
    }
    const avg = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : 0;
    const perMin = avg(pays.map((p, i) => p / (ests[i] / 60)));
    const ck = {}; for (const c of con) { const [k, v] = c.split(":"); (ck[k] = ck[k] || []).push(+v); }
    const cs = {}; for (const k in ck) cs[k] = avg(ck[k]);
    R.boards.push({ lvl, n: pays.length, pay: avg(pays), min: Math.min(...pays), max: Math.max(...pays), km: avg(kms), estMin: avg(ests.map(e => e / 60)), perEstMin: perMin, contracts: cs });
  }
  GS.delivered = 0; makeJobs(depot);
  document.querySelector("#garage").hidden = false; garageTab = "sleds"; renderGarage();
  const gb = document.querySelector("#garage") || document.querySelector("#gbody") || document.body;
  R.garage.sledsText = (document.querySelector("#garage") ? document.querySelector("#garage").innerText : "").slice(0, 1500);
  garageTab = "parts"; renderGarage();
  R.garage.partsText = (document.querySelector("#garage") ? document.querySelector("#garage").innerText : "").slice(0, 1200);
  document.querySelector("#garage").hidden = true; R.ranks = RANKS;
  R.fuel = SITES.filter(s => s.fuelPrice).map(s => s.name + ":" + s.fuelPrice);
  return JSON.stringify(R);
})()`));
console.log("SLEDS id cost need power drag grip fuel burn power/drag");
for (const s of out.sleds) console.log(`  ${s.id.padEnd(10)} $${String(s.cost).padStart(5)} ${String(s.need).padStart(3)}d  pw ${s.power}  dr ${s.drag}  gr ${s.grip}  ${s.fuel}L  burn ${s.burn}  p/d ${s.pd}${s.zip > 1 ? "  zip " + s.zip : ""}`);
console.log("BOARDS lvl n avgPay [min-max] avgKm estMin $/estMin contracts");
for (const b of out.boards) console.log(`  ${String(b.lvl).padStart(2)}  n${b.n}  $${b.pay} [${b.min}-${b.max}]  ${b.km} km  ${b.estMin} min  $${b.perEstMin}/min  ${JSON.stringify(b.contracts)}`);
console.log("FUEL", out.fuel.join(", "));
console.log("GARAGE sleds tab:\n" + out.garage.sledsText);
console.log("GARAGE parts tab (head):\n" + out.garage.partsText);
await done();
