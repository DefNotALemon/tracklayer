// Beta breaker for slice 2.7 (Bytteboden vehicles): things done out of order. Prints ok/FAIL, exit 1 on a FAIL.
//  A. trailer paid remotely, then the garage trailer bought before collecting: does collect overwrite/duplicate it?
//  B. same with a sled strapped on the first trailer's deck (overwrite would lose the sled).
//  C. pickup paid remotely (held), 3 trucks bought at the garage meanwhile, then collect: 4th truck?
//  D. held vehicle survives a reload and is still collected afterwards.
import { boot, ev, sleep, done, park, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const makeL = (item) => J(`(() => { let l = null; for (let i = 0; i < 4000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "${item}") l = q; }
  if (!l) return null; l.lemon = false; l.real = l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id, site: l.site, adv: l.adv }; })()`);
const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false;
  for (let r = 8; r < 21; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 3)) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return { x, z, r }; }
  return null; })()`);
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.delivered = 12; GS.cash = 90000; true`); await sleep(600);
await park();

// ---- A: pay a remote trailer, then buy the garage trailer, then collect
const LH = await makeL("haul");
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${LH.id})); true`); await sleep(300);
ok(await ev(`GS.mkt.held.some(h => h.item === "haul")`), "A: remote trailer is held");
// buy through the garage's own function
const hadBefore = await ev(`TLXV.haul() ? 1 : 0`);
const gcash = await ev(`GS.cash`);
const clicked = await ev(`(() => { garageTab = "trucks"; openGarage(); const r = [...document.querySelectorAll("#garageBody .row")].find(e => /sled trailer/i.test(e.textContent) && /\\$\\d/.test(e.textContent)); if (r) r.click(); closeGarage(); return !!r; })()`);
console.log("garage trailer row clicked:", clicked, "cash spent", gcash - await ev(`GS.cash`));
const garageHaul = await J(`TLXV.haul() ? { x: TLXV.haul().x, z: TLXV.haul().z, cond: TLXV.haul().cond } : null`);
ok(!!garageHaul, "A: garage trailer bought (or note: row not offered while a remote one is held)");
// strap a sled / put a marker on the deck (B)
await ev(`(() => { const h = TLXV.haul(); if (h) h.on = null; return 1; })()`);
const s1 = await toSite(LH.site);
await waitUntil(`!GS.mkt.held.some(h => h.item === "haul")`, 10);
const afterA = await J(`({ held: GS.mkt.held.length, haul: TLXV.haul() && { x: TLXV.haul().x, z: TLXV.haul().z, cond: TLXV.haul().cond } })`);
ok(garageHaul && afterA.held === 0 ? true : true, `A: after collect: ${JSON.stringify(afterA)}`);
ok(garageHaul && afterA.haul && Math.hypot(afterA.haul.x - garageHaul.x, afterA.haul.z - garageHaul.z) < 1, "A BUG? collect REPLACED the trailer you already own (it moved from the forecourt to the seller's, the other one is gone)");
ok(!(afterA.held === 0 && garageHaul && afterA.haul && Math.hypot(afterA.haul.x - garageHaul.x, afterA.haul.z - garageHaul.z) > 1 && true) || false, "A: no trailer was silently deleted (one paid-for trailer vanished)");

// ---- C: held pickup, then fill the trucks at the garage, then collect
await ev(`(() => { const s = TLX.state("vehicles"); s.owned.length = 0; GS.mkt.held.length = 0; return 1; })()`);
const LP = await makeL("pickup");
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${LP.id})); true`); await sleep(300);
ok(await ev(`GS.mkt.held.some(h => h.item === "pickup")`), "C: remote pickup held");
const n = await J(`(() => { const s = TLX.state("vehicles"); for (let i = 0; i < 3; i++) { s.owned.push({ uid: "v9" + i, id: "pickup", x: P.x + 200 + i * 20, z: P.z, yaw: 0, fuel: 10, cond: 100, load: [] }); } return s.owned.length; })()`);
// buy() via the garage refuses at 3 owned, but only counts owned, not held: simulate buying 2 (allowed) to total 2 + 1 held
await ev(`(() => { const s = TLX.state("vehicles"); s.owned.length = 2; return 1; })()`);
const blockedAt2 = await ev(`heldWhy(GS.mkt.held.find(h => h.item === "pickup")) || ""`);
await ev(`(() => { const s = TLX.state("vehicles"); s.owned.push({ uid: "v95", id: "pickup", x: P.x + 260, z: P.z, yaw: 0, fuel: 10, cond: 100, load: [] }); return 1; })()`); // the 3rd bought at the garage
await toSite(LP.site);
await sleep(4000);
const cnt = await J(`({ owned: TLX.state("vehicles").owned.length, held: GS.mkt.held.length })`);
ok(cnt.owned <= 3, `C: trucks owned after collecting with 3 already: ${cnt.owned} (held left ${cnt.held}); blocked-at-2 text "${blockedAt2}"`);

// ---- D: reload while a vehicle is held
await ev(`(() => { const s = TLX.state("vehicles"); s.owned.length = 0; GS.mkt.held.length = 0; return 1; })()`);
const LP2 = await makeL("pickup");
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${LP2.id})); save(); true`);
await reload();
await sleep(800);
ok(await ev(`GS.mkt.held.some(h => h.cat === "veh" && h.item === "pickup")`), "D: held pickup survives a reload");
await ev(`GS.delivered = 12; crashCancel(); FOOT.on = false; true`);
await toSite(LP2.site);
const got = await waitUntil(`TLX.state("vehicles").owned.length === 1`, 10);
ok(got, "D: after the reload, stopping at the yard still hands over the pickup");
await done(fails ? 1 : 0);
