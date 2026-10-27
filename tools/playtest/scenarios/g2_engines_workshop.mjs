// G2: the garage's Engines and Workshop tabs haven't had dedicated playtest coverage (unlike Sleds/
// Parts/gear). Does each tell a new/mid-game player what's going on: what engine is in, what a swap
// costs and where to get one, and (Workshop) what's worn and what restoring it buys back?
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_engines_workshop.mjs
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();

async function openTab(tab, label) {
  await ev(`document.querySelector("#garage").hidden = false; garageTab = "${tab}"; renderGarage(); true`);
  await sleep(500);
  await shot(label);
  const text = await ev(`[...document.querySelectorAll("#garageBody .bsec, #garageBody .row, #garageBody .bfoot, #garageBody .actrow")].map(e => e.innerText.replace(/\\n+/g, " | ")).join("\\n")`);
  console.log(`--- ${label} ---\n${text}\n`);
}

// Case 1: fresh save, stock Frontier, nothing worn — baseline legibility.
await ev(`GS.delivered = 2; GS.cash = 450; true`);
await openTab("engines", "01_engines_fresh");
await openTab("workshop", "02_workshop_fresh");

// Case 2: mid-game, own a few sleds, one engine worn via condition hit, a used engine on the shelf.
await ev(`(() => {
  GS.own.sleds = ["frontier", "woodsman", "ranger"]; GS.own.sled = "ranger"; GS.delivered = 10; GS.cash = 2200;
  GS.own.cond["sled:frontier"] = 0.7; GS.own.cond["sled:woodsman"] = 0.85;
  GS.own.shelf = GS.own.shelf || [];
  GS.own.shelf.push({ eid: STOCK_ENGINE["ranger"] || "stock", pwr: 1.1, cond: 0.78, hrs: 420 });
  restat(); return true;
})()`);
await openTab("engines", "03_engines_worn_shelf");
await openTab("workshop", "04_workshop_worn");

// Case 3: a boost part (supercharger/turbo) visible on a sled that doesn't support it (Won't fit check).
await ev(`(() => { GS.own.sled = "woodsman"; restat(); return true; })()`);
await openTab("engines", "05_engines_boost_wontfit_check");

await ev(`document.querySelector("#garage").hidden = true; true`);
await done();
