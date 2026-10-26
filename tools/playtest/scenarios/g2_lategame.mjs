// G2 progression audit, late game: do the top three sleds (Apex 32d, Matriarch 46d, Aurora 60d) ever get
// something NEW on the job board (not just bigger numbers on what's already there), and does the garage
// explain why you'd buy them when they open no parts? Companion to g2_ladder.mjs, which stops sampling at 30.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_lategame.mjs
import { boot, ev, shot, done } from "../lib.mjs";
await boot();
const out = JSON.parse(await ev(`(() => {
  const R = { boards: [], garage: {} };
  for (const lvl of [20, 32, 40, 46, 55, 60, 75]) {
    GS.delivered = lvl; const pays = [], ests = [], con = [];
    for (let i = 0; i < 40; i++) {
      makeJobs(depot);
      for (const j of GS.jobs) { if (j.steamer || j.tour) continue; const f = j.from || depot; const g = jobGeom(j.dest, f); pays.push(j.pay); ests.push(g.est); }
      for (const c of GS.contracts || []) if (!c.locked && c.pay) con.push((c.groom ? "groom" : c.expedition ? "exped" : c.priority ? "prio" : c.big ? "heavy" : c.rescue ? "rescue" : "other") + ":" + c.pay);
    }
    const avg = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : 0;
    const ck = {}; for (const c of con) { const [k, v] = c.split(":"); (ck[k] = ck[k] || []).push(+v); }
    const cs = {}; for (const k in ck) cs[k] = avg(ck[k]);
    const kinds = [...new Set(con.map(c => c.split(":")[0]))].sort();
    R.boards.push({ lvl, n: pays.length, pay: avg(pays), min: Math.min(...pays), max: Math.max(...pays), estMin: avg(ests.map(e => e / 60)), contracts: cs, kinds });
  }
  GS.delivered = 60; GS.cash = 100000; GS.own.sleds = SLEDS.map(x => x.id); GS.own.sled = "matriarch"; restat();
  makeJobs(depot);
  document.querySelector("#garage").hidden = false; garageTab = "sleds";
  const sb = document.querySelector("#garage"); sb.scrollTop = sb.scrollHeight; renderGarage();
  sb.scrollTop = sb.scrollHeight * 0.55;
  R.garage.sledsText = (document.querySelector("#garage") ? document.querySelector("#garage").innerText : "").slice(1500, 3200);
  return JSON.stringify(R);
})()`));
await shot("01_garage_lvl60");
await ev(`document.querySelector("#garage").hidden = true; TABLET.toggle(undefined, "jobs"); document.querySelector("#tablet") && (document.querySelector("#tablet").hidden = false); true`);
await shot("02_board_lvl60");
console.log("BOARDS lvl n avgPay [min-max] estMin contract-kinds contracts");
for (const b of out.boards) console.log(`  ${String(b.lvl).padStart(2)}  n${b.n}  $${b.pay} [${b.min}-${b.max}]  ${b.estMin} min  kinds=${JSON.stringify(b.kinds)}  ${JSON.stringify(b.contracts)}`);
console.log("GARAGE sleds tab (Apex/Matriarch/Aurora section):\n" + out.garage.sledsText);
await done();
