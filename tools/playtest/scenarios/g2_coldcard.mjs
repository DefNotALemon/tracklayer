// G2: does the freight board warn about hauls the rider's kit can't survive? (report 0027 F3: a 4.9 km clean-air run
// in stock kit blacked out, -$2,155.) Samples the board for several sled / level / kit / hour combos, renders each
// freight card with conCard and prints km, the COLD RUN chip + text (if any), and coldRun()'s estimate when it exists.
// Then opens the Freight app on the 0027 setup (Aurora, stock kit, 09:40) for a still.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_coldcard.mjs
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; WX.atT && (WX.atT = () => 0); GS.storm = 0; true");
const combos = [
  { name: "woodsman lvl6 stock 12:00", sled: "woodsman", lvl: 6, kit: "stock", hour: 12 },
  { name: "ranger lvl21 stock 12:00", sled: "ranger", lvl: 21, kit: "stock", hour: 12 },
  { name: "aurora lvl62 stock 09:40 (0027)", sled: "aurora", lvl: 62, kit: "stock", hour: 9.67 },
  { name: "aurora lvl62 stock 20:00", sled: "aurora", lvl: 62, kit: "stock", hour: 20 },
  { name: "aurora lvl62 full kit 09:40", sled: "aurora", lvl: 62, kit: "full", hour: 9.67 },
  { name: "apex lvl34 mid kit 12:00", sled: "apex", lvl: 34, kit: "mid", hour: 12 },
];
for (const c of combos) {
  const R = JSON.parse(await ev(`(() => {
    GS.cash = 50000; GS.lic.freight = true; GS.own.sleds = SLEDS.map(s => s.id); GS.own.sled = ${JSON.stringify(c.sled)};
    GS.own.partsOwned["hitch:trailer"] = true; GS.own.parts.hitch = "trailer"; GS.delivered = ${c.lvl}; GS.hour = ${c.hour};
    for (const slot of GEAR_ORDER) { const o = GEAR[slot].options || GEAR[slot]; const k = ${JSON.stringify(c.kit)}; GS.own.gear[slot] = (k === "stock" ? o[0] : k === "full" ? o[o.length - 1] : o[1]).id; }
    restat();
    const rows = [], seen = new Set();
    for (let i = 0; i < 12; i++) { makeContracts(depot);
      GS.contracts.forEach((x, k) => { if (x.locked || !x.big) return; const key = x.dest.id + (x.clean ? "c" : x.tonne ? "t" : x.fell ? "f" : x.expedition ? "e" : x.priority ? "p" : "h"); if (seen.has(key)) return; seen.add(key);
        const h = conCard(x, k), dv = document.createElement("div"); dv.innerHTML = h; const nt = (dv.querySelector(".tcn") || dv).textContent, ci = nt.indexOf("Cold run:"), m = ci >= 0 ? [0, nt.slice(ci + 9)] : null; const cr = typeof coldRun === "function" ? coldRun(conFrom(x), x.dest, +conKm(x).toFixed(1)) : null;
        rows.push({ kind: bigTag(x), dest: shortName(x.dest), km: +conKm(x).toFixed(1), chip: /COLD RUN/.test(h), loss: cr ? Math.round(cr.loss) : null, stop: cr && cr.stop ? shortName(cr.stop) : "", txt: m ? m[1].replace(/<[^>]+>/g, "").trim() : "" }); }); }
    rows.sort((a, b) => b.km - a.km);
    return JSON.stringify({ warm: ST.warm, coldMul: ST.coldMul, rows });
  })()`));
  const n = R.rows.length, w = R.rows.filter(r => r.chip).length, over = R.rows.filter(r => r.loss >= 100).length;
  console.log(`\n== ${c.name}: kit ${R.warm.toFixed(1)} coldMul ${R.coldMul.toFixed(2)} · ${n} freight cards, ${w} COLD RUN chips, ${over} est ≥100%`);
  for (const r of R.rows.slice(0, 8)) console.log(`  ${r.kind.padEnd(10)} ${r.dest.padEnd(16)} ${String(r.km).padStart(4)} km  est ${r.loss ?? "-"}%  ${r.chip ? "COLD: " + r.txt : ""}`);
}
await ev(`(() => { GS.own.sled = "aurora"; GS.delivered = 62; GS.hour = 9.67; for (const slot of GEAR_ORDER) { const o = GEAR[slot].options || GEAR[slot]; GS.own.gear[slot] = o[0].id; } restat(); applyLoadout(); makeContracts(depot); GS.apps.freight = true;
  GS.contracts.sort((a, b) => (b.clean ? 1 : 0) - (a.clean ? 1 : 0)); TABLET.toggle(true, "freight"); return true; })()`);
await sleep(1500);
await ev(`(() => { if (!TABLET.open) TABLET.toggle(true, "freight"); else TABLET.go("freight"); return true; })()`);
await sleep(800);
console.log("\nFREIGHT APP:", (await ev(`(document.querySelector("#tabS") || document.body).innerText.slice(0, 900)`)).replace(/\n+/g, " | "));
await shot("01_freight_coldrun");
await done();
