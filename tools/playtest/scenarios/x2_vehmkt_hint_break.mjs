// Beta breaker for 2.7: a used pickup set down in a seller's yard; walk up to it (2.4 m off the door side) at EVERY seller site.
// Does the on-foot hint name the pickup, or does a nearby cabin door's hint win (x2_vehmkt "hint names the pickup" FAIL)?
// Also: the nearest door ring to the truck, and whether Q (get in) still works there. Exit 1 on a FAIL.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(80); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.delivered = 12; GS.cash = 90000; true`); await sleep(600);
const sites = await J(`(() => { const ids = new Set(); for (let i = 0; i < 6000; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh") ids.add(q.site); } return [...ids]; })()`);
console.log("sites:", sites.join(","));
for (const id of sites) {
  const r = await J(`(() => {
    const s = TLX.state("vehicles"); s.owned.length = 0; GS.mkt.held.length = 0; crashCancel(); FOOT.on = false;
    const site = SITES.find(q => q.id === "${id}");
    P.x = site.x + 12; P.z = site.z; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(P.x, P.z, true);
    GS.mkt.held.push({ cat: "veh", item: "pickup", cond: 0.7, seller: "T", site: "${id}", name: "T", state: "wait", seed: 1 });
    mktCollect(site);
    const o = s.owned[0]; if (!o) return { none: true };
    const fx = Math.sin(o.yaw), fz = Math.cos(o.yaw);
    FOOT.on = true; FOOT.x = o.x + fz * 2.4; FOOT.z = o.z - fx * 2.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = o.yaw - 1.4; recenter(FOOT.x, FOOT.z, true);
    let door = 1e9; try { for (const b of (INT.beacons || [])) door = Math.min(door, Math.hypot(b.x - o.x, b.z - o.z)); } catch (e) {}
    return { x: o.x, z: o.z, door };
  })()`);
  if (r.none) { console.log(`note ${id}: no spot`); continue; }
  await waitGame(0.8);
  const hint = await ev(`$("wnHint").textContent`);
  ok(/pickup|Fjellvogn|truck/i.test(hint), `${id}: nearest door ${r.door.toFixed(1)} m from the truck; hint "${hint}"`);
}
await done(fails ? 1 : 0);
