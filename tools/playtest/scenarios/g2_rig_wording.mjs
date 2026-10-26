// G2: what the game tells you about the groomer / trailer gates at each step of the ladder.
// Reads contractBlock() on the board's groom + heavy cards, the locked-card subs, the accept toast
// and the rank-up toast text directly (the board lives on the 3D dash tablet, so DOM reads miss it).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_rig_wording.mjs
import { boot, ev, sleep, done } from "../lib.mjs";
await boot();
const read = label => ev(`(() => {
  GS.contracts = null; makeContracts(depot); const C = GS.contracts;
  const g = C.find(c => c.groom), h = C.find(c => c.big), lk = C.filter(c => c.locked).map(c => c.locked + ": " + c.sub);
  const r3 = RANKS.find(r => r.at === 3), r5 = RANKS.find(r => r.at === 5);
  const rk = r => typeof rankOpens === "function" ? rankOpens(r) : r.opens;
  return JSON.stringify({ label: ${JSON.stringify(label)}, sled: GS.own.sled, del: GS.delivered,
    groomCard: g ? contractBlock(g) : null, heavyCard: h ? contractBlock(h) : null, locked: lk,
    rank3: rk(r3), rank5: rk(r5) }, null, 1);
})()`);
await ev(`GS.delivered = 3; GS.cash = 500; true`);
console.log(await read("3 deliveries, Frontier, nothing bought"));
await ev(`GS.delivered = 5; GS.cash = 500; GS.lic.freight = true; true`);
console.log(await read("5 deliveries, Frontier"));
await ev(`GS.delivered = 5; GS.cash = 9000; buySled("woodsman"); true`); await sleep(200);
console.log(await read("5 deliveries, Woodsman, no receiver"));
await ev(`fitPart("recv", "ball"); true`); await sleep(200);
console.log(await read("Woodsman + receiver"));
await ev(`fitPart("hitch", "groomer"); true`); await sleep(200);
console.log(await read("Woodsman + receiver + groomer fitted"));
await ev(`fitPart("hitch", "none"); true`); await sleep(200);
console.log(await read("Woodsman + receiver, groomer owned but unhitched"));
await ev(`GS.delivered = 2; true`); console.log(await read("2 deliveries (locked cards)"));
await done();
