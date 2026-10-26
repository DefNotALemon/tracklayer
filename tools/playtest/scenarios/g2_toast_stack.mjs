// G2 (backlog, follow-up to v135 sled-ready toast): on a real delivery that crosses a sled-unlock threshold,
// does the "Delivered..." toast, the "they topped off your tank" toast and the "garage will sell you the
// Woodsman" toast (bumpDelivered's setTimeout cascade: fuel +1400ms, sled-ready +2600ms, each shown 4.2s,
// 3-toast cap) overlap and stay readable, or does the cap evict one before it's read? Uses the real
// deliver()/bumpDelivered() code path (not a synthetic toast), one small parcel dropped at the depot,
// GS.delivered set to 3 so the drop is the 4th delivery (Woodsman unlock, no rank-up at this count).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_toast_stack.mjs
import { boot, ev, shot, sleep, done } from "../lib.mjs";
await boot();
await ev("WX.at = () => 0; GS.storm = 0; true");

// one small clean parcel already "aboard", destined for the depot itself so deliver(depot) fires for real
// a HOME site (not the depot) so the "topped off your tank" / backhaul toast also fires, giving the
// full 3-toast cascade the backlog item is worried about (Delivered + fuel/backhaul + sled-ready).
const setup = await ev(`(() => {
  GS.delivered = 3; GS.cash = 150;
  const site = SITES.find(s => s.id === "strandbu");
  GS.load = [{ dest: site, cargo: "Mail parcel", pay: 80, bond: 0, hits: 0, fragile: false, big: false, soaked: false }];
  P.x = site.seed[0]; P.z = site.seed[1];
  return JSON.stringify({ delivered: GS.delivered, rank: rankOf(GS.delivered).name, site: site.name });
})()`);
console.log("setup", setup);

await ev(`(() => { window.__toasts = []; window.__t0 = performance.now();
  new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => {
    if (!n.textContent) return;
    window.__toasts.push({ t: +((performance.now() - window.__t0) / 1000).toFixed(2), msg: n.textContent });
  }))).observe(document.getElementById("toasts"), { childList: true });
  return true; })()`);

await ev(`deliver(SITES.find(s => s.id === "strandbu")); true`);

// sample the toast box's visible children count + text at the moments each new toast should land
const checkpoints = [500, 1200, 1900, 2900, 4300, 5800, 7000, 8600];
for (const ms of checkpoints) {
  await sleep(ms === checkpoints[0] ? ms : ms - checkpoints[checkpoints.indexOf(ms) - 1]);
  const boxState = await ev(`JSON.stringify(Array.from(document.getElementById("toasts").children).map(c => c.textContent))`);
  console.log(`t=${(ms / 1000).toFixed(1)}s toasts on screen:`, boxState);
  await shot(`t${ms}`);
}

const all = JSON.parse(await ev("JSON.stringify(window.__toasts)"));
console.log("all toast events (relative s):", JSON.stringify(all));
const deliveredIdx = all.findIndex(x => x.msg.startsWith("Delivered"));
const sledIdx = all.findIndex(x => x.msg.includes("garage will sell"));
const fuelIdx = all.findIndex(x => x.msg.includes("topped off") || x.msg.includes("handed"));
console.log("order check: delivered<fuel<sled =", deliveredIdx, fuelIdx, sledIdx,
  (deliveredIdx >= 0 && fuelIdx >= 0 && sledIdx >= 0 && deliveredIdx < fuelIdx && fuelIdx < sledIdx));
await done();
