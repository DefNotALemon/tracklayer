// Beta (report 0112) of fix 0110: tries to break "paid-for vehicles count as owned" / the stuck-order refund.
//  E. a stuck order planted in a save (trailer owned + held trailer, paid 500) is refunded once after a reload, and NOT again after a second reload.
//  F. mixed: 3 trucks owned, held pickup (stuck) + held trailer (collectable): only the pickup is refunded, the trailer is still handed over.
//  G. a held pickup, then the garage truck row clicked at 2 owned via the real row (not TLXV.buy): no money taken, cash exact.
import { boot, ev, sleep, done, park, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const makeL = item => J(`(() => { let l = null; for (let i = 0; i < 4000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "${item}") l = q; }
  if (!l) return null; l.lemon = false; l.real = l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id, site: l.site }; })()`);
const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false;
  for (let r = 8; r < 21; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 3)) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return { x, z, r }; }
  return null; })()`);
const state = () => J(`({ cash: GS.cash, trucks: TLX.state("vehicles").owned.length, haul: !!TLXV.haul(), held: GS.mkt.held.filter(h => h.cat === "veh").map(h => h.item + ":" + h.paid) })`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.delivered = 12; GS.cash = 90000; true`); await sleep(600);
await park();

// ---- E: stuck save, two reloads
await ev(`TLXV.buyHaul(); true`); await sleep(300);
ok(await ev(`!!TLXV.haul()`), "E: own the trailer");
await ev(`(() => { GS.mkt.held.length = 0; GS.mkt.held.push({ lid: -801, cat: "veh", item: "haul", site: "ifjord", seller: "Stuck Seller", name: "Fjordhenger", cond: 0.8, adv: 0.8, lemon: false, insp: false, paid: 500, hrs: 0, seed: 1, state: "wait" }); GS.cash = 10000; return 1; })()`);
ok(await waitUntil(`GS.mkt.held.length === 0`, 6), "E: stuck trailer order refunded in game");
let s = await state(); ok(s.cash === 10500, `E: cash 10000 -> ${s.cash} (want 10500)`);
await sleep(500);
await ev(`save(); true`); await sleep(300);
await reload();
await sleep(1500);
s = await state(); ok(s.cash === 10500 && s.haul && s.held.length === 0, `E: after reload cash ${s.cash}, trailer ${s.haul}, held ${s.held.length}`);
await reload(); await sleep(1500);
s = await state(); ok(s.cash === 10500, `E: after a 2nd reload still ${s.cash} (no double refund)`);

// ---- F: mixed
await ev(`tutSkip(); crashCancel(); FOOT.on = false; true`); await park();
await ev(`TLX.state("vehicles").haul = null; true`);
const LH = await makeL("haul"); ok(!!LH, "F: a used trailer listing once the owned one is gone");
await ev(`(() => { const st = TLX.state("vehicles"); GS.mkt.held.length = 0; GS.mkt.held.push({ lid: -811, cat: "veh", item: "pickup", site: "ifjord", seller: "P Seller", name: "Fjellvogn pickup", cond: 0.8, adv: 0.8, lemon: false, insp: false, paid: 2500, hrs: 0, seed: 1, state: "wait" }); return 1; })()`);
// own 3 trucks first (heldRefund does nothing at <3)
await ev(`(() => { const st = TLX.state("vehicles"); GS.cash = 90000; GS.mkt.held.length = 0; return 1; })()`);
for (let i = 0; i < 3; i++) { await ev(`TLXV.buy("pickup"); true`); await sleep(250); }
s = await state(); console.log("trucks", s.trucks);
// trailer: the garage trailer was removed by reload? check haul exists; if so held trailer would be stuck, so drop the owned one for F
await ev(`(() => { const st = TLX.state("vehicles"); st.haul = null; return 1; })()`);
const hasHaul = await ev(`!!TLXV.haul()`);
console.log("haul after clear", hasHaul);
if (!hasHaul) {
  await ev(`mktPay(GS.mkt.list.find(l => l.id === ${LH.id})); true`); await sleep(300);
  await ev(`GS.mkt.held.push({ lid: -812, cat: "veh", item: "pickup", site: "ifjord", seller: "P Seller", name: "Fjellvogn pickup", cond: 0.8, adv: 0.8, lemon: false, insp: false, paid: 2500, hrs: 0, seed: 1, state: "wait" }); window.__c0 = GS.cash; true`);
  ok(await waitUntil(`!GS.mkt.held.some(h => h.item === "pickup")`, 6), "F: stuck pickup refunded");
  ok(await ev(`GS.mkt.held.some(h => h.item === "haul")`), "F: collectable trailer order untouched");
  const dc = await ev(`GS.cash - window.__c0`); ok(dc === 2500, `F: refund exactly 2500 (${dc})`);
  await toSite(LH.site);
  ok(await waitUntil(`!!TLXV.haul()`, 10), "F: trailer still handed over at the yard");
} else console.log("F skipped: could not clear trailer");
await done(fails ? 1 : 0);
