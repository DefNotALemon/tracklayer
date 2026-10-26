// G2 late ladder: fell freight (rank 32, Apex 800 or bigger). Samples the contract board at 20/32/46/60
// deliveries (kinds + average pay per kind, fell's dest/kg/pay range), checks the gate on Summit vs Apex
// (contractBlock text with licence + flatbed fitted), reads the Apex garage card while it's still locked, and
// times a 500 kg flatbed up toward the fell dest behind a Summit vs an Apex (by gameClock).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_fell.mjs
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();
const R = JSON.parse(await ev(`(() => {
  const R = { boards: [], gate: {}, card: "" };
  const has = typeof FELL !== "undefined";
  for (const lvl of [20, 32, 46, 60]) {
    GS.delivered = lvl; const ck = {}, dests = {}, locked = new Set();
    for (let i = 0; i < 40; i++) {
      makeContracts(depot);
      for (const c of GS.contracts) {
        if (c.locked) { locked.add(c.locked); continue; }
        const k = c.fell ? "fell" : c.groom ? "groom" : c.expedition ? "exped" : c.priority ? "prio" : c.big ? "heavy" : c.rescue ? "rescue" : "other";
        (ck[k] = ck[k] || []).push(c.pay);
        if (c.fell) dests[c.dest.id + " " + c.kg + "kg"] = (dests[c.dest.id + " " + c.kg + "kg"] || 0) + 1;
      }
    }
    const cs = {}; for (const k in ck) cs[k] = Math.round(ck[k].reduce((a, b) => a + b, 0) / ck[k].length) + " [" + Math.min(...ck[k]) + "-" + Math.max(...ck[k]) + "]";
    R.boards.push({ lvl, cs, locked: [...locked], dests });
  }
  // gate: licence + flatbed, Summit vs Apex
  GS.delivered = 40; GS.cash = 50000; GS.lic.freight = true; GS.own.sleds = SLEDS.map(s => s.id);
  GS.own.partsOwned["hitch:flatbed"] = true; GS.own.parts.hitch = "flatbed";
  GS.own.partsOwned["recv:heavy"] = true; GS.own.parts.recv = "heavy";
  for (const id of ["summit", "trekker", "apex", "aurora"]) {
    GS.own.sled = id; restat(); makeContracts(depot);
    const c = GS.contracts.find(x => x.fell) || GS.contracts.find(x => x.expedition);
    R.gate[id] = c ? (c.fell ? "fell: " : "exped: ") + (contractBlock(c) || "OK") : "none";
  }
  // Apex card while locked (20 deliveries, own up to Summit)
  GS.delivered = 20; GS.own.sleds = ["frontier", "woodsman", "ranger", "sprint", "summit"]; GS.own.sled = "summit"; restat();
  document.querySelector("#garage").hidden = false; garageTab = "sleds"; renderGarage();
  const t = document.querySelector("#garage").innerText, i = t.indexOf("Apex 800");
  R.card = t.slice(i, i + 420); const el = [...document.querySelectorAll("#garage *")].find(e => e.children.length === 0 && /^Apex 800$/.test(e.textContent.trim())); el && el.scrollIntoView({ block: "center" });
  return JSON.stringify(R);
})()`));
console.log("BOARDS");
for (const b of R.boards) console.log(`  ${b.lvl}: ${JSON.stringify(b.cs)}\n      locked=${JSON.stringify(b.locked)}\n      fell dests=${JSON.stringify(b.dests)}`);
console.log("GATE (licence + flatbed, 40 deliveries):"); for (const k in R.gate) console.log(`  ${k}: ${R.gate[k]}`);
console.log("APEX CARD @20 deliveries:\n" + R.card);
await shot("01_garage_apex_locked");
// Freight app board at 40 deliveries on the Apex, flatbed + licence
await ev(`(() => { document.querySelector("#garage").hidden = true; GS.delivered = 40; GS.own.sleds = SLEDS.map(s => s.id); GS.own.sled = "apex"; restat(); applyLoadout(); makeContracts(depot); GS.apps.freight = true; GS.contracts.sort((a, b) => (b.fell ? 1 : 0) - (a.fell ? 1 : 0)); TABLET.toggle(undefined, "freight"); return true; })()`);
await sleep(1500);
await ev(`(() => { if (!TABLET.open) TABLET.toggle(true, "freight"); else TABLET.go("freight"); return TABLET.open + " " + TABLET.app; })()`);
await sleep(800);
console.log("FREIGHT APP:", (await ev(`(document.querySelector("#tabS") || document.body).innerText.slice(0, 900)`)).replace(/\n+/g, " | "));
await shot("02_freight_app_apex");
await done();
