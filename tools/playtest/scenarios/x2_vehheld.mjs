// Beta fix 0110 (slice 2.7): a vehicle paid for at Bytteboden and not yet collected counts as owned. Asserts, exit 1 on a failure.
//  A. used trailer paid remotely: the garage's trailer row reads "Paid for", is locked and says where it waits; buyHaul refuses
//     (no money taken, no trailer); stopping at the seller's yard still hands it over; then the row reads Owned.
//  B. used pickup paid remotely with 2 trucks owned: the truck rows lock and say so; buy refuses a 3rd (no money taken);
//     collecting makes 3. With 1 owned + 1 held, buying a 2nd still works.
//  C. a save already stuck (trailer owned + a held used trailer; 3 trucks + a held pickup): the seller refunds what was paid
//     within a few game seconds and the orders are gone.
import { boot, ev, sleep, done, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const toasts = () => J(`(TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))`);
const makeL = item => J(`(() => { let l = null; for (let i = 0; i < 4000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "${item}") l = q; }
  if (!l) return null; l.lemon = false; l.real = l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id, site: l.site }; })()`);
const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false;
  for (let r = 8; r < 21; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 3)) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return { x, z, r }; }
  return null; })()`);
const rows = () => J(`(() => { garageTab = "trucks"; openGarage(); const r = [...document.querySelectorAll("#garageBody .row")].map(e => ({ t: e.textContent, locked: e.classList.contains("owned") })); closeGarage(); return r; })()`);
const home = () => ev(`(() => { const g = SITES.find(s => s.type === "depot"); crashCancel(); FOOT.on = false; park && 0; return 1; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.delivered = 12; GS.cash = 90000; true`); await sleep(600);
await park();
const P0 = await J(`({ x: P.x, z: P.z })`);
const back = () => ev(`(() => { crashCancel(); FOOT.on = false; P.x = ${P0.x}; P.z = ${P0.z}; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`);

// ---- A: trailer
const LH = await makeL("haul"); ok(!!LH, "A: a used trailer listing");
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${LH.id})); true`); await sleep(300);
ok(await ev(`GS.mkt.held.some(h => h.cat === "veh" && h.item === "haul")`), "A: paid remotely, the trailer is held");
let r = (await rows()).find(x => /Fjordhenger|sled trailer/i.test(x.t) && !/^Repair/.test(x.t));
console.log("trailer row:", r && r.t.slice(-160));
ok(r && /Paid for/.test(r.t) && r.locked && /waiting in .*yard/.test(r.t), "A: garage trailer row reads Paid for, locked, says where it waits");
let cash0 = await ev(`GS.cash`);
await ev(`TLXV.buyHaul(); true`); await sleep(200);
ok(!(await ev(`!!TLXV.haul()`)) && (await ev(`GS.cash`)) === cash0, "A: buyHaul refuses (no trailer, no money taken)");
ok((await toasts()).some(t => /already paid for a sled trailer/.test(t)), "A: the refusal toast names the paid-for trailer");
await toSite(LH.site);
ok(await waitUntil(`!!TLXV.haul() && !GS.mkt.held.some(h => h.item === "haul")`, 10), "A: stopping at the yard still hands the trailer over");
await back();
r = (await rows()).find(x => /Fjordhenger|sled trailer/i.test(x.t) && !/^Repair/.test(x.t));
ok(r && /Owned/.test(r.t) && !/Paid for/.test(r.t), "A: afterwards the row reads Owned");

// ---- B: pickup
await ev(`(() => { const s = TLX.state("vehicles"); s.owned.length = 0; GS.mkt.held.length = 0; return 1; })()`);
const LP = await makeL("pickup"); ok(!!LP, "B: a used pickup listing");
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${LP.id})); true`); await sleep(300);
cash0 = await ev(`GS.cash`);
await ev(`TLXV.buy("pickup"); true`); await sleep(200);
ok((await ev(`TLX.state("vehicles").owned.length`)) === 1 && (await ev(`GS.cash`)) < cash0, "B: 1 held + 0 owned: buying a truck at the garage still works");
await ev(`TLXV.buy("pickup"); true`); await sleep(200);
const n2 = await ev(`TLX.state("vehicles").owned.length`);
ok(n2 === 2, `B: 1 held + 1 owned: a 2nd still sells (owned ${n2})`);
r = (await rows()).filter(x => /Owned ×|\$/.test(x.t) && /tank/.test(x.t));
console.log("truck rows:", r.map(x => x.locked + " " + x.t.slice(-120)).join(" | "));
ok(r.length && r.every(x => x.locked && /paid for a used pickup/.test(x.t) && /3 trucks/.test(x.t)), "B: with 2 owned + 1 held the truck rows lock and say why");
cash0 = await ev(`GS.cash`);
await ev(`TLXV.buy("pickup"); true`); await sleep(200);
ok((await ev(`TLX.state("vehicles").owned.length`)) === 2 && (await ev(`GS.cash`)) === cash0, "B: buy refuses a 3rd over the held pickup (no money taken)");
ok((await toasts()).some(t => /pickup you paid for is waiting/.test(t)), "B: the refusal toast says the paid-for pickup is waiting");
await toSite(LP.site);
ok(await waitUntil(`TLX.state("vehicles").owned.length === 3 && !GS.mkt.held.some(h => h.item === "pickup")`, 10), "B: collecting it makes 3 trucks");
await back();

// ---- C: saves already stuck get refunds
await ev(`(() => { GS.mkt.held.length = 0;
  GS.mkt.held.push({ lid: -901, cat: "veh", item: "haul", site: "${LH.site}", seller: "Test Seller", name: "Fjordhenger", cond: 0.8, adv: 0.8, lemon: false, insp: false, paid: 500, hrs: 0, seed: 1, state: "wait" });
  GS.mkt.held.push({ lid: -902, cat: "veh", item: "pickup", site: "${LP.site}", seller: "Other Seller", name: "Fjellvogn pickup", cond: 0.8, adv: 0.8, lemon: false, insp: false, paid: 2500, hrs: 0, seed: 1, state: "wait" });
  window.__c0 = GS.cash; return 1; })()`);
ok(await waitUntil(`!GS.mkt.held.some(h => h.cat === "veh")`, 6), "C: stuck orders (trailer owned / 3 trucks) are cleared");
const dc = await ev(`GS.cash - window.__c0`);
ok(dc === 3000, `C: both sellers refund what was paid (+${dc}, want +3000)`);
ok((await toasts()).some(t => /refunds/.test(t)), "C: a refund toast");
ok((await ev(`TLX.state("vehicles").owned.length`)) === 3 && (await ev(`!!TLXV.haul()`)), "C: nothing owned was taken away");
await done(fails ? 1 : 0);
