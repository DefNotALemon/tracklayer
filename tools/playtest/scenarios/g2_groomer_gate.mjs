// G2: verify builder's v59 lock-label landing, and check the backlog item "rank 3 announces grooming but
// the groomer/receiver are Woodsman-tier (4 deliveries)" — is the chain clear to a player who hits rank 3
// (Trail crew) before they can actually buy a groomer?
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_groomer_gate.mjs
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();

// Step 1: delivered=3 (just hit "Trail crew" rank), cash=500, no groomer yet. Open the Trail Crew board.
await ev(`GS.delivered = 3; GS.cash = 500; TABLET.go("crew"); true`);
await sleep(600); await shot("01_crew_board_at_3");
console.log("CREW BOARD CARDS:\n" + await ev(`[...document.querySelectorAll("#tablet .tcard, #tablet .card")].slice(0,4).map(c=>c.innerText.replace(/\\n+/g," | ")).join("\\n---\\n")`));

// Step 2: same state, open the garage Parts tab and read the groomer's locked line (v59 landing).
await ev(`TABLET.close(true); GS.garageOpen = true; document.getElementById("garage").hidden = false; garageTab = "parts"; renderGarage(); true`);
await sleep(600); await shot("02_garage_parts_at_3");
console.log("PART LOCK LINES:\n" + await ev(`[...document.querySelectorAll("#garageBody .row")].filter(r=>/groomer|receiver/i.test(r.innerText)).map(r=>r.innerText.replace(/\\n+/g," | ")).join("\\n---\\n")`));

// Step 3: same state, Sleds tab — does the Woodsman card say the deliveries-remaining + price clearly?
await ev(`garageTab = "sleds"; renderGarage(); true`);
await sleep(600); await shot("03_garage_sleds_at_3");
console.log("WOODSMAN CARD:\n" + await ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row, #garageBody .card")].find(r=>/woodsman/i.test(r.innerText)); return r ? r.innerText.replace(/\\n+/g," | ") : "NOT FOUND"; })()`));

// Step 4: delivered=4, cash=600 — buy the Woodsman, then the groomer+receiver, then recheck the crew board.
await ev(`GS.delivered = 4; GS.cash = 5000; true`);
await ev(`buySled("woodsman"); true`);
console.log("OWN SLED AFTER BUY ATTEMPT: " + await ev(`GS.own.sled`));
await sleep(300); await shot("04_garage_sleds_at_4");
await done();
