// G2: what a brand-new courier sees in the garage (Sleds + Parts tabs): are the locks readable?
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_garage.mjs
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();
await ev(`GS.delivered = 2; GS.cash = 450; document.querySelector("#garage").hidden = false; garageTab = "sleds"; renderGarage(); true`);
await sleep(600); await shot("01_sleds");
console.log("SLEDS:\n" + await ev(`[...document.querySelectorAll("#garageBody .brow, #garageBody button")].slice(0, 6).map(b => b.innerText.replace(/\\n+/g, " | ")).join("\\n")`));
await ev(`garageTab = "parts"; renderGarage(); true`);
await sleep(600); await shot("02_parts");
console.log("PART LOCK LABELS: " + await ev(`[...new Set([...document.querySelectorAll("#garageBody .row .pay")].map(b => b.innerText.trim()).filter(t => !t.startsWith("$")))].join(", ")`));
await ev(`fitPart("hitch", "trailer"); true`); await sleep(300);
console.log("TOAST: " + await ev(`(document.querySelector("#toast") || {}).innerText || [...document.querySelectorAll(".toast")].map(t => t.innerText).join(" / ")`));
await done();
