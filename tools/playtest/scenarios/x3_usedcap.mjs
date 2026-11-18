// Beta fix 0228 #1 (lane A): the three-truck limit holds at Bytteboden's till.
// A used truck listing that is already on the board when you reach the limit another way (a new truck from the garage,
// or a used one paid for and still waiting at its seller's) can no longer be paid for: the marketplace asks
// TLXV.mkt.payWhy BEFORE the cash moves. Before the fix the lorry was handed over (2 owned + 1 waiting + 1 = 4) and
// heldRefund then quietly gave back the pickup the player had paid for first.
//   A. 2 trucks + a pickup paid for and waiting: a lorry listing in person is refused (cash, board, order untouched), the
//      listing's page says why, and the pickup still collects -> 3 trucks, nothing refunded
//   B. 3 trucks on the ground: a pickup listing left on the board is refused, by SEND and in person
//   C. 2 trucks: the same listing sells (the check refuses nothing it should not)
//   D. a sled trailer owned, or one paid for and waiting: a second trailer listing is refused
//   E. a tractor listing with the Freight licence gone: refused
//   F. 2 trucks + a boat + a pickup waiting: the boat is not a truck, the order is not refunded
//   G. other categories are never asked
// Asserts, exit 1 on a failure; no stills (state and money test).
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return 1; })()`);
const makeL = (site, item) => J(`(() => { let l = null; for (let i = 0; i < 20000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "${item}") l = q; }
  if (!l) return null; l.site = "${site}"; l.lemon = false; l.real = l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id, site: l.site, ask: l.ask, seller: l.seller }; })()`);
const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false;
  for (let r = 8; r < 21; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 3)) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return { x, z, r }; }
  return null; })()`);
const away = id => ev(`(() => { const s = SITES.find(q => q.id === "${id}"); P.x = s.x + 900; P.z = s.z; P.vx = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`);
const nTrucks = () => ev(`TLX.state("vehicles").owned.filter(r => !TLXV.kinds[r.id]).length`);
const nHeld = () => ev(`GS.mkt.held.filter(h => h.cat === "veh" && h.item !== "haul").length`);
const onBoard = id => ev(`GS.mkt.list.some(l => l.id === ${id})`);
const pay = id => ev(`mktPay(GS.mkt.list.find(l => l.id === ${id})); true`);
const addTruck = (id, dx) => ev(`(() => { const s = TLX.state("vehicles"); s.owned.push({ uid: "v" + (++s.seq), id: "${id}", x: depot.x + ${dx}, z: depot.z + 6, yaw: 0, fuel: 40, cond: 100, load: [] }); return 1; })()`);
const wipe = () => ev(`(() => { const s = TLX.state("vehicles"); s.owned.length = 0; s.haul = null; GS.mkt.held = []; GS.mkt.list = GS.mkt.list.filter(l => l.cat !== "veh"); GS.cash = 80000; GS.lic.freight = true; return 1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.load = []; GS.claims = []; GS.apps.freight = 1; GS.signed.freight = true; GS.lic.freight = true; GS.delivered = 10; GS.cash = 80000; true`);
ok(await ev(`typeof TLXV.mkt.payWhy === "function"`), "the Vehicles category answers payWhy");
const ms = await J(`(() => { const ms = mktSites(), ok = TLXV.mkt.sitesFor("tractor", ms), bs = TLXRIG.bays(); return ok.map(s => ({ id: s.id, d: Math.min(...bs.map(b => Math.hypot(b.x - s.x, b.z - s.z))) })).sort((a, b) => a.d - b.d); })()`);
const site = ms[0].id, site2 = (ms[1] || ms[0]).id;
console.log("seller sites:", site, site2);

// ---- A. 2 trucks + a pickup paid for and waiting; a lorry listing bought in person
await wipe(); await addTruck("pickup", 30); await addTruck("pickup", 40);
const LT = await makeL(site, "tractor"), LP = await makeL(site2, "pickup");
ok(LT && LP, "A: a tractor and a pickup listing on the board");
await away(site2); await pay(LP.id); await sleep(300);
ok(await nHeld() === 1 && await nTrucks() === 2, "A: the pickup is paid for by SEND and waits (2 owned + 1 waiting)");
await toSite(site); await waitGame(0.6);
await clearToasts();
const cA = await ev("GS.cash");
await pay(LT.id); await sleep(500); await waitGame(2.6);           // 2.6 s: past heldRefund's 2 s round
const tA = await toasts();
ok(await ev("GS.cash") === cA, `A: the lorry is refused before the cash moves (cash ${cA} -> ${await ev("GS.cash")})`);
ok(await nTrucks() === 2 && await nHeld() === 1, `A: still 2 owned + 1 waiting (owned ${await nTrucks()}, waiting ${await nHeld()})`);
ok(await ev(`GS.mkt.held.some(h => h.item === "pickup")`), "A: the pickup order is still the one waiting");
ok(await onBoard(LT.id), "A: the lorry listing stays on the board");
ok(tA.some(t => /That would be 4 trucks/.test(t) && /pickup you paid for/.test(t)), "A: a line says why, naming the pickup: " + JSON.stringify(tA.filter(t => /trucks/.test(t)).slice(0, 1)));
ok(!tA.some(t => /refunds/.test(t)), "A: nobody refunds anything");
await ev(`MKT.view = ${LT.id}; TABLET.toggle(true, "market"); true`); await sleep(500);
const page = await ev(`(document.querySelector(".tnote2") || {}).textContent || ""`);
ok(/Not for you yet: That would be 4 trucks/.test(page), "A: the listing's page says it too: " + page.slice(-150));
await ev(`MKT.view = null; TABLET.toggle(false); true`); await sleep(300);
await toSite(site2);
ok(await waitUntil(`TLX.state("vehicles").owned.length === 3`, 8), "A: the pickup you paid for still collects");
ok(await nTrucks() === 3 && await nHeld() === 0, "A: 3 trucks on the ground, nothing waiting");

// ---- B. 3 trucks on the ground; the lorry listing is still there, and a pickup listing too
const LP2 = await J(`(() => { const s = TLX.state("vehicles"), keep = s.owned.splice(0); window.__keepO = keep; return 1; })()`).then(() => makeL(site2, "pickup"));   // the pool lists no pickup to a player with 3 trucks: it was listed before
await ev(`TLX.state("vehicles").owned.push(...window.__keepO); true`);
ok(LP2 && await nTrucks() === 3, "B: a pickup listing from before, 3 trucks on the ground");
for (const [where, go] of [["by SEND", () => away(site2)], ["in person", () => toSite(site2)]]) {
  await go(); await waitGame(0.5); await clearToasts();
  const c = await ev("GS.cash");
  await pay(LP2.id); await sleep(400);
  const t = await toasts();
  ok(await ev("GS.cash") === c && await nHeld() === 0 && await nTrucks() === 3 && await onBoard(LP2.id), `B: with 3 trucks a pickup listing is refused ${where}`);
  ok(t.some(x => /enough trucks on the forecourt \(3\)/.test(x)), `B: and a line says so ${where}: ` + JSON.stringify(t.filter(x => /trucks/.test(x)).slice(0, 1)));
}

// ---- C. 2 trucks: the same listing sells
await ev(`TLX.state("vehicles").owned.length = 2; true`);
await toSite(site2); await waitGame(0.5);
const cC = await ev("GS.cash");
await pay(LP2.id);
ok(await waitUntil(`TLX.state("vehicles").owned.length === 3`, 8), "C: with 2 trucks the pickup listing sells and is handed over");
ok(await ev("GS.cash") < cC, `C: and it is paid for (${cC} -> ${await ev("GS.cash")})`);

// ---- D. sled trailers: one owned, or one waiting
await wipe();
const LH1 = await makeL(site, "haul");
await ev(`window.__keepL = GS.mkt.list.filter(l => l.cat === "veh"); GS.mkt.list = GS.mkt.list.filter(l => l.cat !== "veh"); true`);   // the board never lists one thing twice: the second is made with the first off it
const LH2 = await makeL(site2, "haul");
await ev(`GS.mkt.list.push(...window.__keepL); true`);
ok(LH1 && LH2, "D: two sled trailer listings on the board");
await away(site); await pay(LH1.id); await sleep(300);
ok(await ev(`GS.mkt.held.some(h => h.item === "haul")`), "D: the first trailer is paid for and waits");
await clearToasts();
const cD = await ev("GS.cash");
await pay(LH2.id); await sleep(400);
let tD = await toasts();
ok(await ev("GS.cash") === cD && await onBoard(LH2.id) && await ev(`GS.mkt.held.filter(h => h.item === "haul").length === 1`), "D: a second trailer is refused while the first waits");
ok(tD.some(t => /already paid for a sled trailer/.test(t)), "D: a line says so: " + JSON.stringify(tD.filter(t => /trailer/.test(t)).slice(0, 1)));
await toSite(site);
ok(await waitUntil(`!!TLXV.haul()`, 8), "D: the first trailer collects");
await away(site2); await clearToasts();
const cD2 = await ev("GS.cash");
await pay(LH2.id); await sleep(400); tD = await toasts();
ok(await ev("GS.cash") === cD2 && await onBoard(LH2.id), "D: and with a trailer owned the second is refused");
ok(tD.some(t => /already own a sled trailer/.test(t)), "D: a line says so");

// ---- E. a tractor listing, the Freight licence gone
await wipe();
const LT2 = await makeL(site, "tractor");
await ev(`GS.lic.freight = false; true`);
await away(site); await clearToasts();
const cE = await ev("GS.cash");
await pay(LT2.id); await sleep(400);
ok(await ev("GS.cash") === cE && await nHeld() === 0 && await onBoard(LT2.id), "E: no Freight licence: the tractor listing is refused");
ok((await toasts()).some(t => /Freight licence/.test(t)), "E: a line says so");
await ev(`GS.lic.freight = true; true`);
await pay(LT2.id); await sleep(300);
ok(await nHeld() === 1, "E: with the licence back it sells");

// ---- F. 2 trucks + a boat + a pickup waiting: the boat is not a truck
await wipe(); await addTruck("pickup", 30); await addTruck("pickup", 40);
const kind = await ev(`Object.keys(TLXV.kinds)[0] || ""`);
if (kind) {
  await ev(`(() => { const s = TLX.state("vehicles"); s.owned.push({ uid: "v" + (++s.seq), id: "${kind}", x: P.x + 4000, z: P.z, yaw: 0, fuel: 10, cond: 100, load: [] }); return 1; })()`);
  const LP3 = await makeL(site2, "pickup");
  await away(site2); await clearToasts();
  await pay(LP3.id); await sleep(300);
  ok(await nHeld() === 1, `F: 2 trucks and a ${kind}: a pickup can be paid for`);
  await waitGame(4.5);
  ok(await nHeld() === 1 && !(await toasts()).some(t => /refunds/.test(t)), `F: and the order is not refunded for the ${kind}'s sake`);
  ok(await ev(`TLXV.mkt.blocked(GS.mkt.held.find(h => h.item === "pickup")) === ""`), "F: collecting it is not blocked");
} else console.log("F: skipped, no non-truck kind registered");

// ---- G. other categories are never asked
ok(await ev(`mktPayWhy({ cat: "sled", item: "x" }) === "" && mktPayWhy({ cat: "engine", item: "x" }) === ""`), "G: sleds and engines are not asked");

await done(fails ? 1 : 0);
