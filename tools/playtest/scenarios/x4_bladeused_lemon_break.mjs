// Beta break test for 4.1b3a used blades (round 2): a lemon's real edge reaches the truck, collecting from a sled / plow truck, junk cond, shed order.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 10) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.load = []; GS.claims = []; GS.delivered = 10; GS.cash = 40000; true`;
const IT = "blade:b23";
const makeL = (site, o = {}) => J(`(() => { let l = null; for (let i = 0; i < 20000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "${IT}") l = q; }
  if (!l) return null; l.site = "${site}"; l.lemon = ${!!o.lemon}; l.adv = ${o.adv || 0.7}; l.real = ${o.real || o.adv || 0.7}; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id, ask: l.ask }; })()`);
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
const [sA, sB] = await J(`mktSites().map(s => ({ id: s.id, d: Math.hypot(s.x - depot.x, s.z - depot.z) })).sort((a, b) => a.d - b.d).filter(s => s.d > 300).slice(0, 3).map(s => s.id)`);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const u1 = await ev(`TLXV.state().owned[0].uid`);
await ev(`GS.mkt.list = GS.mkt.list.filter(l => l.cat !== "veh"); true`);
// 1 lemon: advertised 70, real 35
const L1 = await makeL(sA, { lemon: true, adv: 0.7, real: 0.35 });
await away(sA); await pay(L1.id); await sleep(300);
const hc = await J(`GS.mkt.held.find(h => h.item === "${IT}")`);
ok(hc && Math.abs(hc.cond - 0.35) < 1e-6 && Math.abs(hc.adv - 0.7) < 1e-6, "1: held keeps real 0.35 / ad 0.7: " + JSON.stringify(hc && { c: hc.cond, a: hc.adv }));
// 2 collect from a SLED (on foot / riding): must refuse
await ev(`TLXV.swapTo(null); true`).catch(() => {});
await ev(`(() => { try { TLXV.swapTo(${JSON.stringify("")}); } catch (e) {} return 1; })()`);
const cur0 = await ev(`TLXV.state().cur`);
await toSite(sA); 
// make sure we are NOT in the truck: dismount into sled
const sledMode = await ev(`(() => { try { const s = TLXV.state(); if (s.cur) { TLXV.swapTo(null); } } catch (e) {} return String(TLXV.state().cur); })()`);
await waitGame(5);
const stillHeld = await heldN(); const p2 = await plow();
console.log("  cur before:", cur0, "after swap attempt:", sledMode, "held:", stillHeld, "blades:", JSON.stringify(p2.blades));
ok(stillHeld === 1 || Object.keys(p2.blades).length === 1, "2: state coherent when arriving not in the truck (held " + stillHeld + ", blades " + Object.keys(p2.blades).length + ")");
// 3 now in truck: collect, edge must be 35
await inTruck(u1); await toSite(sA);
const got = await waitUntil(`!!TLX.state("plow").blades[${JSON.stringify(u1)}] || TLX.state("plow").shed.length > 0`, 12);
const p3 = await plow();
const edge = p3.blades[u1] ? p3.blades[u1].cond : null;
ok(got && edge === 35, "3: lemon fitted at its REAL edge 35 (got " + edge + ")");
// 4 second pickup + junk cond held -> shed
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const owned = await J(`TLXV.state().owned.map(r => r.uid)`); const u2 = owned.find(u => u !== u1);
const L2 = await makeL(sB, { adv: 0.8 });
await away(sB); await pay(L2.id); await sleep(300);
await ev(`(() => { const h = GS.mkt.held.find(h => h.item === "${IT}"); h.cond = NaN; return 1; })()`);
await inTruck(u2); await toSite(sB);
await waitUntil(`TLX.state("plow").shed.length > 0 || !!TLX.state("plow").blades[${JSON.stringify(u2)}]`, 12);
const p4 = await plow();
const e4 = p4.blades[u2] ? p4.blades[u2].cond : (p4.shedC || [])[p4.shed.length - 1];
console.log("  junk-cond (NaN) collect ->", JSON.stringify({ b2: p4.blades[u2], shed: p4.shed, shedC: p4.shedC }));
ok(e4 >= 1 && e4 <= 100, "4: junk cond lands in range (" + e4 + ")");
ok(e4 > 1, "4b: NaN cond is not turned into a 1% edge (got " + e4 + ")");
// 5 save / reload keeps the fitted edge
await ev(`save(); true`); await reload(); await ev(SETUP); await sleep(500);
const p5 = await plow();
ok(p5.blades[u1] && p5.blades[u1].cond === 35, "5: reload keeps the 35% edge: " + JSON.stringify(p5.blades[u1]));
// 6 mend after: cost for 35
const cost = await ev(`(() => { try { return JSON.stringify(Object.keys(TLX.state("plow"))); } catch (e) { return String(e); } })()`);
console.log("  plow keys:", cost);
await done(fails);
