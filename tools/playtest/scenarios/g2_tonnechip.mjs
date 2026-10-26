// G2 late ladder: the chip on tonne-load cards. At 50 deliveries on a Matriarch with licence + flatbed, opens the
// Freight app at the depot, lists every card's chip text + colour, and shoots the board (tonne and fell cards side by side).
// Before v98 tonne loads wore the FELL chip; since v98 they wear their own TONNE chip.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_tonnechip.mjs
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; true");
const R = await ev(`(() => {
  GS.delivered = 50; GS.cash = 50000; GS.lic.freight = true; GS.apps.freight = true; GS.own.sleds = SLEDS.map(s => s.id);
  GS.own.partsOwned["hitch:flatbed"] = true; GS.own.parts.hitch = "flatbed";
  GS.own.partsOwned["recv:heavy"] = true; GS.own.parts.recv = "heavy";
  GS.own.sled = "matriarch"; restat(); applyLoadout();
  // re-roll until the board holds both a tonne and a fell card
  for (let i = 0; i < 60; i++) { makeContracts(depot); if (GS.contracts.some(c => c.tonne) && GS.contracts.some(c => c.fell && !c.tonne)) break; }
  const big = GS.contracts.filter(c => c.big);
  // put tonne/fell first so they're on screen
  GS.contracts.sort((a, b) => (b.fell ? 1 : 0) - (a.fell ? 1 : 0));
  return JSON.stringify(big.map(c => (c.tonne ? "tonne" : c.fell ? "fell" : c.clean ? "clean" : "big") + ":" + c.kg + "kg"));
})()`);
console.log("board", R);
await ev(`TABLET.toggle(true, "freight"); true`);
await sleep(1500);
const chips = await ev(`JSON.stringify([...document.querySelectorAll("#tabS .bchip")].map(e => e.textContent + "=" + getComputedStyle(e).color))`);
console.log("chips", chips);
await shot("01_freight_board");
await done();
