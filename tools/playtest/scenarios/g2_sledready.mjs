// G2: does the game tell you when a new sled opens at the garage? For every sled on the ladder, sets the delivery
// count one short of its `need`, then bumps it through bumpDelivered() (the same call every real delivery makes) and
// records every toast for the next 7 s (MutationObserver on #toasts). Shoots the toast at the Woodsman (4 deliveries).
// Before v135 no toast named the sled; since v135 "N deliveries: the garage will sell you the X now ...".
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_sledready.mjs
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; true");
await ev(`(() => { window.__toasts = []; new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => n.textContent && window.__toasts.push(n.textContent))))
  .observe(document.getElementById("toasts"), { childList: true }); return true; })()`);
const ids = JSON.parse(await ev(`JSON.stringify(SLEDS.filter(s => s.need > 0).map(s => [s.id, s.need, s.cost]))`));
let hits = 0;
for (const [id, need, cost] of ids) {
  // cash: half the price on odd sleds (shows "you have $X"), plenty on even
  const cash = ids.findIndex(q => q[0] === id) % 2 ? cost + 500 : Math.round(cost / 2);
  await ev(`(() => { window.__toasts = []; GS.delivered = ${need - 1}; GS.cash = ${cash}; bumpDelivered(); return true; })()`);
  await sleep(id === "woodsman" ? 3200 : 6600);
  if (id === "woodsman") { await shot("01_woodsman_toast"); await sleep(3400); }
  const t = JSON.parse(await ev("JSON.stringify(window.__toasts)"));
  const named = t.filter(x => x.includes("garage will sell"));
  if (named.length) hits++;
  console.log(`${id} need ${need} cash ${cash}:`, JSON.stringify(t));
}
// owned sled at its threshold: must stay quiet
await ev(`(() => { window.__toasts = []; GS.own.sleds.push("ranger"); GS.delivered = 7; bumpDelivered(); return true; })()`);
await sleep(3200);
console.log("owned ranger at 8:", await ev("JSON.stringify(window.__toasts)"));
console.log(`sled-ready toasts: ${hits}/${ids.length}`);
await done();
