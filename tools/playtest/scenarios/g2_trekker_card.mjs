// G2: verify v66's Trekker touring-kit garage card renders cleanly (the new perk line is long:
// "Touring kit built in: heated grips & seat behind a tall shield (+2.5 warmth), a rack that carries
// a second parcel, and a frugal tune (10% thriftier)."). Own all sleds, open the Sleds tab, screenshot
// the Trekker card at a few deliveries counts (card text can change at ownership/lock thresholds).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_trekker_card.mjs
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();
await ev(`(() => { GS.own.sleds = SLEDS.map(x => x.id); GS.delivered = 30; GS.cash = 5000;
  document.querySelector("#garage").hidden = false; garageTab = "sleds"; renderGarage(); return 1; })()`);
await sleep(600);
console.log("CARD HEIGHTS: " + await ev(`[...document.querySelectorAll("#garageBody .row")].map(r => Math.round(r.getBoundingClientRect().height)).join(",")`));
await shot("01_sleds_owned");
// scroll to the Trekker card specifically for a close crop
const idx = JSON.parse(await ev(`(() => { const rows = [...document.querySelectorAll("#garageBody .row")]; const i = rows.findIndex(r => /Trekker/.test(r.innerText)); if (i < 0) return "-1"; rows[i].scrollIntoView({block:"center"}); return String(i); })()`));
await sleep(400);
await shot("02_trekker_card");
console.log("TREKKER ROW idx=" + idx);
console.log("TREKKER TEXT: " + await ev(`(document.querySelectorAll("#garageBody .row")[${idx}] || {}).innerText || "NOT FOUND"`));
await ev(`document.querySelector("#garage").hidden = true; GS.delivered = 0; true`);
await done();
