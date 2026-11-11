// Expansion slice 2.7: Bytteboden's "Vehicles" category (used pickups and the sled trailer), wear and repair. Asserts, exit 1 on a failure.
//   The pool lists the sled trailer for anyone without one, the pickup from 6 deliveries on (up to 3 trucks, counting paid-for
//   ones); the Vehicles tab shows both with a photo; haggling and in-person inspection work as for any category; a lemon's
//   inspection drops the price; paid remotely (SEND) the trailer waits at the seller's and is set down in their yard when you
//   stop there; paid in person the pickup is parked in the yard at its real condition with a quarter tank; you walk over and
//   get in; a worn truck has less power, a worn trailer rolls heavier; the garage repairs either for $/point only when it is
//   within 40 m; a reload keeps conditions; three trucks block a fourth.
import { boot, ev, tap, sleep, done, park, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(150); }
async function waitUntil(expr, maxGame = 12) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const toasts = () => J(`(TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent), window.__T || [])`);
const hookToasts = () => ev(`(() => { const o = toast; toast = (m, k) => { (window.__T = window.__T || []).push(m); return o(m, k); }; return 1; })()`);
const clearT = () => ev(`window.__T = []; true`);
// a listing of the vehicles category for item, forced to lemon/real as asked, put on the board
const makeL = (item, lemon, real) => J(`(() => { let l = null; for (let i = 0; i < 4000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "${item}") l = q; }
  if (!l) return null; l.lemon = ${lemon}; l.real = ${real}; if (!${lemon}) l.real = l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id, site: l.site, ask: l.ask, adv: l.adv, real: l.real, pers: l.pers }; })()`);
// stop the sled 8-20 m from a site, clear of buildings
const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false;
  for (let r = 8; r < 21; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 3)) continue;
    P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return { x, z, r }; }
  return null; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await hookToasts();
await ev(`crashCancel(); FOOT.on = false; true`);
console.log("parked", JSON.stringify(await park()));

// ---- 1. the pool
await ev(`GS.delivered = 0; true`);
let pool = await J(`mktPool("veh").map(p => p.item)`);
ok(pool.includes("haul") && !pool.includes("pickup"), `a new player's pool: the sled trailer, no pickup yet (${pool})`);
await ev(`GS.delivered = 10; true`);
pool = await J(`mktPool("veh").map(p => p.item)`);
ok(pool.includes("haul") && pool.includes("pickup"), `from 6 deliveries: pickup and trailer (${pool})`);
ok(await ev(`MKT_CATS.some(c => c.id === "veh" && c.name === "Vehicles")`), "Bytteboden has a Vehicles category");

// ---- 2. listings, the tab, the photos
const LH = await makeL("haul", false, 0);
const LP = await makeL("pickup", true, 0.5);
ok(LH && LP, `listings made: trailer #${LH && LH.id} ask $${LH && LH.ask}, pickup #${LP && LP.id} ask $${LP && LP.ask} (${LP && LP.pers})`);
ok(LP.ask >= 2000 && LP.ask <= 4200 && LH.ask >= 300 && LH.ask <= 1100, `used prices under new: pickup $${LP.ask} (new $4,200), trailer $${LH.ask} (new $950)`);
await ev(`TABLET.toggle(true, "market"); MKT.view = null; MKT.cat = "veh"; TABLET.render(); true`); await sleep(500);
const tabTxt = await ev(`$("tabV").textContent`);
ok(/Fjellvogn pickup/.test(tabTxt) && /Fjordhenger sled trailer/.test(tabTxt), "the Vehicles tab lists the Fjellvogn pickup and the Fjordhenger sled trailer");
const pics = await J(`GS.mkt.list.filter(l => l.cat === "veh").map(l => mktPic(l).length)`);
ok(pics.length >= 2 && pics.every(n => n > 3000), `each vehicle listing has a drawn photo (${pics} bytes)`);
await shot("vehtab");
await ev(`MKT.view = ${LP.id}; TABLET.render(); true`); await sleep(400);
const det = await ev(`$("tabV").textContent`);
ok(/new ≈ \$4,200/.test(det) && /walk over and drive it away/.test(det), "the pickup's detail page: new price and how you collect it");
await shot("vehdetail");

// ---- 3. haggling
await ev(`mktOffer(GS.mkt.list.find(l => l.id === ${LP.id}), 0.9); true`);
await sleep(3000);
const th = await J(`(() => { const l = GS.mkt.list.find(q => q.id === ${LP.id}); return { n: l.thread.length, ask: l.ask, deal: l.deal, mute: l.mute }; })()`);
ok(th.n === 2 && (th.deal || th.ask < LP.ask || th.mute), `offer 90%: the seller answers (thread ${th.n}, ask $${LP.ask} -> $${th.ask}, deal ${th.deal})`);
await ev(`TABLET.toggle(false); true`);

// ---- 4. the trailer, paid remotely, collected at the seller's
await clearT();
await ev(`GS.cash = 20000; mktPay(GS.mkt.list.find(l => l.id === ${LH.id})); true`); await sleep(300);
ok(await ev(`GS.mkt.held.some(h => h.cat === "veh" && h.item === "haul" && h.state === "wait")`) && (await toasts()).some(t => /stands in .*yard/.test(t)), "SEND: the trailer is paid for and waits in the seller's yard");
pool = await J(`mktPool("veh").map(p => p.item)`);
ok(!pool.includes("haul"), "a paid-for trailer leaves the pool (one per player)");
ok(await ev(`TLX.state("vehicles").haul === null`), "nothing on the ground until you collect");
const s1 = await toSite(LH.site);
ok(!!s1, `stopped ${s1 && s1.r} m from the trailer seller (${LH.site})`);
ok(await waitUntil(`!!TLXV.haul()`, 8), "stopped there: the trailer is set down in the yard");
let hs = await J(`(() => { const h = TLXV.haul(), s = SITES.find(q => q.id === "${LH.site}"); return { on: h.on, cond: h.cond, d: Math.hypot(h.x - s.x, h.z - s.z), water: isWater(h.x, h.z) || isSea(h.x, h.z), wear: TLXV.haulWear(), held: GS.mkt.held.length }; })()`);
ok(hs.on === null && hs.cond === Math.round(LH.real * 100) && hs.d < 40 && !hs.water && hs.held === 0, `it stands free at ${hs.cond}% (ad ${Math.round(LH.adv * 100)}%), ${hs.d.toFixed(1)} m from the seller, dry ground`);
ok(Math.abs(hs.wear - (1 + 0.6 * (1 - hs.cond / 100))) < 1e-6 && hs.wear > 1, `a worn trailer rolls heavier: drag x${hs.wear.toFixed(2)}`);
ok((await toasts()).some(t => /wheels the sled trailer out/.test(t)), "a toast says so");

// ---- 5. the pickup: inspect (a lemon), pay in person, walk over, get in
await clearT();
await ev(`mktInspect(GS.mkt.list.find(l => l.id === ${LP.id})); true`); await sleep(200);
ok((await toasts()).some(t => /Stop at .* to look it over/.test(t)), "inspecting from afar is refused");
const s2 = await toSite(LP.site);
await waitGame(0.8);
const askB = await ev(`GS.mkt.list.find(l => l.id === ${LP.id}).ask`);
await clearT();
await ev(`mktInspect(GS.mkt.list.find(l => l.id === ${LP.id})); true`); await sleep(200);
const askA = await ev(`GS.mkt.list.find(l => l.id === ${LP.id}).ask`);
ok((await toasts()).some(t => /Not what the ad said/.test(t)) && askA < askB, `in person the lemon shows: "Not what the ad said", ask $${askB} -> $${askA}`);
const cashB = await ev("GS.cash"), price = await ev(`mktPrice(GS.mkt.list.find(l => l.id === ${LP.id}))`);
await clearT();
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${LP.id})); true`); await sleep(300);
let tr = await J(`(() => { const s = TLX.state("vehicles"), r = s.owned[0], st = SITES.find(q => q.id === "${LP.site}"); return r ? { n: s.owned.length, cond: r.cond, fuel: r.fuel, d: Math.hypot(r.x - st.x, r.z - st.z), dP: Math.hypot(r.x - P.x, r.z - P.z), water: isWater(r.x, r.z) || isSea(r.x, r.z), ob: obNear(r.x, r.z, 2.2) } : null; })()`);
ok(tr && tr.n === 1 && tr.cond === 50 && tr.fuel === 18, `paid $${price} in person: the pickup is yours at ${tr && tr.cond}% with ${tr && tr.fuel} L`);
ok(cashB - (await ev("GS.cash")) === price, "the price came off your cash");
ok(tr && tr.d < 40 && tr.dP >= 6.9 && !tr.water && !tr.ob, `parked in the yard: ${tr && tr.d.toFixed(1)} m from the seller, ${tr && tr.dP.toFixed(1)} m from your sled, clear and dry`);
ok((await toasts()).some(t => /hands you the keys/.test(t)), "toast: the seller hands you the keys");
pool = await J(`mktPool("veh").map(p => p.item)`);
ok(pool.includes("pickup"), `with one truck the pickup still lists (${pool})`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0], fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.on = true; FOOT.x = r.x + fz * 2.4; FOOT.z = r.z - fx * 2.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = r.yaw - 1.4; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await waitGame(0.8);
const hint = await ev(`$("wnHint").textContent`);
ok(/pickup/.test(hint), `walking up to it, the hint names the pickup ("${hint}")`);
await tap("KeyQ");
ok(await waitUntil(`!FOOT.on && TLX.state("vehicles").cur === TLX.state("vehicles").owned[0].uid`, 10), "Q: you get in and it is the vehicle you drive");
await shot("pickupyard");
const inf = await J(`mktInfo({ cat: "veh", item: "pickup" }, 0.5).stat`);
ok(/83% power/.test(inf), `a 50% truck has 83% of its power (${inf})`);

// ---- 6. repair at the garage
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
let row = await ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => /Repair the Fjellvogn/.test(e.textContent)); return r ? r.className + "|" + r.textContent : ""; })()`);
ok(/owned/.test(row) && /Bring it within 40 m/.test(row), `away from the garage the repair is locked ("${row.slice(0, 90)}")`);
await ev(`closeGarage(); true`);
await ev(`(() => { const g = garageSite, r = TLX.state("vehicles").owned[0]; for (let a = 0; a < 6.28; a += 0.3) { const x = g.x + Math.cos(a) * 18, z = g.z + Math.sin(a) * 18; if (!obNear(x, z, 3) && !isWater(x, z) && !isSea(x, z)) { P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vz = 0; recenter(x, z, true); return 1; } } return 0; })()`);
await waitGame(0.5);
const cashR = await ev("GS.cash");
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
row = await ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => /Repair the Fjellvogn/.test(e.textContent)); return r ? r.className + "|" + r.textContent : ""; })()`);
ok(!/owned/.test(row) && /\$1000/.test(row), `at the garage: repair offered for $1000 (50 points x $20) ("${row.slice(0, 90)}")`);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Repair the Fjellvogn/.test(e.textContent)).click(); true`); await sleep(300);
ok((await ev(`TLX.state("vehicles").owned[0].cond`)) === 100 && cashR - (await ev("GS.cash")) === 1000, "repaired: 100%, $1,000 paid");
const trow = await ev(`(() => { const r = [...document.querySelectorAll("#garageBody .row")].find(e => /Repair the fjordhenger/i.test(e.textContent)); return r ? r.className + "|" + r.textContent : ""; })()`);
ok(hs.cond >= 99.5 ? trow === "" : (/owned/.test(trow) && /Bring it within/.test(trow)), `the trailer (left at the seller's) can't be repaired from here ("${trow.slice(0, 80)}")`);
await ev(`closeGarage(); true`);

// ---- 7. reload keeps the conditions
await ev(`TLXV.haul().cond = 61; save(); true`);
await reload();
await sleep(800);
const rl = await J(`({ t: TLX.state("vehicles").owned.map(r => r.cond), h: TLXV.haul() && TLXV.haul().cond, wear: TLXV.haulWear() })`);
ok(rl.t.length === 1 && rl.t[0] === 100 && rl.h === 61 && Math.abs(rl.wear - 1.234) < 1e-6, `after a reload: truck ${rl.t}%, trailer ${rl.h}% (drag x${rl.wear.toFixed(3)})`);

// ---- 8. an old trailer without cond, and three trucks block a fourth
const old = await ev(`(() => { const h = TLXV.haul(); delete h.cond; TLX.state("vehicles"); return 1; })()`);
const w0 = await ev(`TLXV.haulWear()`);
ok(w0 === 1, `a trailer from an older save (no cond) rolls as built (x${w0})`);
await ev(`(() => { const s = TLX.state("vehicles"); s.owned.push({ uid: "v90", id: "pickup", x: P.x + 300, z: P.z, yaw: 0, fuel: 10, cond: 80, load: [] }, { uid: "v91", id: "pickup", x: P.x + 330, z: P.z, yaw: 0, fuel: 10, cond: 80, load: [] }); return 1; })()`);
pool = await J(`mktPool("veh").map(p => p.item)`);
const blk = await ev(`heldWhy({ cat: "veh", item: "pickup" })`);
ok(!pool.includes("pickup") && /enough trucks/.test(blk), `three trucks: no pickup in the pool, a paid one waits ("${blk}")`);

await done(fails ? 1 : 0);
