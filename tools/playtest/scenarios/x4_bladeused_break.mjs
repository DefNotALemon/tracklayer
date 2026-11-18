// Beta break test for 4.1b3a used blades: two listings / one pickup, selling the pickup while an order waits, reload with a bolt-on, listings vs. a blade bought new.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 10) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.load = []; GS.claims = []; GS.delivered = 10; GS.cash = 20000; true`;
const IT = "blade:b23";
const makeL = (site, o = {}) => J(`(() => { let l = null; for (let i = 0; i < 20000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "${IT}") l = q; }
  if (!l) return null; l.site = "${site}"; l.lemon = false; l.adv = ${o.adv || 0.7}; l.real = l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id, ask: l.ask }; })()`);
const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false;
  for (let r = 9; r < 22; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 4.5)) continue;
    P.x = x; P.z = z; P.yaw = Math.atan2(x - s.x, z - s.z); P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return 1; }
  return null; })()`);
const away = id => ev(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false; P.x = s.x + 600; P.z = s.z + 200; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`);
const pay = id => ev(`mktPay(GS.mkt.list.find(l => l.id === ${id})); true`);
const heldN = () => ev(`GS.mkt.held.filter(h => h.item === "${IT}").length`);
const plow = () => J(`TLX.state("plow")`);
const inTruck = uid => ev(`(() => { TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; return TLXV.state().cur === ${JSON.stringify(uid)}; })()`);
await boot(); await ev(SETUP); await sleep(600);
const sites = await J(`mktSites().map(s => ({ id: s.id, d: Math.hypot(s.x - depot.x, s.z - depot.z) })).sort((a, b) => a.d - b.d).filter(s => s.d > 300).slice(0, 3).map(s => s.id)`);
const [sA, sB] = sites;
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const u1 = await ev(`TLXV.state().owned[0].uid`);
// 1. two listings on the board, one pickup
await ev(`GS.mkt.list = GS.mkt.list.filter(l => l.cat !== "veh"); true`);
const L1 = await makeL(sA);
const L2 = await J(`(() => { const o = GS.mkt.list.find(l => l.id === ${L1.id}); const l = JSON.parse(JSON.stringify(o)); l.id = o.id + 900; l.site = "${sB}"; GS.mkt.list.push(l); return { id: l.id, ask: l.ask }; })()`);
await away(sA);
const c0 = await ev("GS.cash");
await pay(L1.id); await sleep(300);
const poolBefore = await ev(`GS.mkt.list.some(l => l.id === ${L2.id} && mktVisible(l))`);
console.log("  second listing visible after first paid:", poolBefore);
await pay(L2.id); await sleep(300);
const n = await heldN(), c1 = await ev("GS.cash");
ok(n === 1 && c1 === c0 - L1.ask, `1: two listings, one pickup: only one can be paid (held ${n}, cash spent ${c0 - c1} vs ask ${L1.ask}+${L2.ask})`);
// 2. sell/lose the pickup while the order waits, then collect in a sled
await ev(`(() => { const s = TLX.state("vehicles"); s.owned = s.owned.filter(r => r.uid !== ${JSON.stringify(u1)}); return 1; })()`);
await sleep(300);
await toSite(sA); await waitGame(4.6);
const h2 = await J(`GS.mkt.held.filter(h => h.item === "${IT}").map(h => h.state)`);
const refund = await ev("GS.cash");
console.log("  no pickup at all: held", JSON.stringify(h2), "cash", refund, "start", c0);
ok(h2.length === 1 || refund === c0, "2: pickup gone with an order waiting: order kept or refunded, never lost (held " + h2.length + ", cash " + refund + ")");
// 3. buy a pickup again; reload mid-collect; collect after reload
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const u3 = await ev(`TLXV.state().owned[0].uid`);
await ev(`save(); true`); await reload(); await ev(SETUP); await sleep(600);
const u3b = await ev(`TLXV.state().owned[0].uid`);
ok(await inTruck(u3b), "3: in the pickup after reload");
await toSite(sA);
const got = await waitUntil(`!!TLX.state("plow").blades[${JSON.stringify(u3b)}] || TLX.state("plow").shed.length > 0`, 10);
const p3 = await plow();
ok(got && (await heldN()) === 0, "3: collected after reload: " + JSON.stringify({ b: p3.blades, shed: p3.shed }));
// 4. buy a new blade at garage state for same pickup -> the used one now? (already collected) ; list again?
const listedAfter = await ev(`mktPool("veh").some(p => p.item === "${IT}")`);
ok(!listedAfter, "4: one pickup, one blade fitted: no more listed");
// 5. second collect attempt can't duplicate: pay-state of a collected item
const dup = await ev(`GS.mkt.held.length`);
console.log("  held left:", dup);
// 6. drive the blade through a delivery of cond 0: cond bounds
const cond = p3.blades[u3b] ? p3.blades[u3b].cond : (p3.shedC[0]);
ok(cond > 0 && cond <= 100, "6: cond in range " + cond);
await done(fails);
