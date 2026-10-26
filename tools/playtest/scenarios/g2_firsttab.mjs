// G2 (report 0007 F2): what the first Tab press on a brand-new save opens. A new player with no work in hand
// should land on the Parcels board, not the Home icon grid. Also checks a veteran save (deliveries > 0) and a
// save with a job in hand still get Home / their last app, and that the second press closes it.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_firsttab.mjs
import { boot, ev, tap, shot, sleep, done } from "../lib.mjs";
await boot();
const where = () => ev(`JSON.stringify({ open: TABLET.open, app: TABLET.app, title: document.getElementById("tabTitle").textContent })`);
await tap("Tab"); await sleep(600);
console.log("new save, 1st Tab:", await where());
await shot("01_newsave_tab");
await tap("Tab"); await sleep(400);
console.log("new save, 2nd Tab:", await where());
await tap("Tab"); await sleep(400);
console.log("new save, 3rd Tab:", await where());
await tap("Tab"); await sleep(400);
// veteran: reset the tablet's session memory, give deliveries
await ev(`TABLET.app = null; TABLET.recents = []; GS.delivered = 5; true`);
await tap("Tab"); await sleep(400);
console.log("veteran (5 deliveries), 1st Tab:", await where());
await tap("Tab"); await sleep(400);
// new player with a job already in hand
await ev(`TABLET.app = null; TABLET.recents = []; GS.delivered = 0; takeParcel(0); true`);
await tap("Tab"); await sleep(400);
console.log("new save with a job taken (" + await ev(`GS.load.length + " aboard, " + GS.claims.length + " claimed"`) + "), 1st Tab:", await where());
await tap("Tab"); await sleep(400);
await done();
