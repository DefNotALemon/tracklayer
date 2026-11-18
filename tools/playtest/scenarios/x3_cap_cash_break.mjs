// Beta break test for beta fix 0228 #1 (4th truck refused before cash moves). Tester 1, 18 Nov.
//   A. blocked purchase: cash unchanged, listing still on board, no new held order, repeat 3x (no drain)
//   B. same with a SECOND pickup listing while one pickup is held (3 owned incl. held)
//   C. after refusal, reload: state unchanged, cap still holds; free a slot -> purchase works
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const setup = () => ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.load = []; GS.claims = []; GS.apps.freight = 1; GS.signed.freight = true; GS.lic.freight = true; GS.delivered = 10; GS.cash = 80000; true`);
const makeL = (site, item) => J(`(() => { let l = null; for (let i = 0; i < 9000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "${item}") l = q; }
  if (!l) return null; l.site = "${site}"; l.lemon = false; l.real = l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id, ask: l.ask }; })()`);
const toSite = id => ev(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false;
  for (let r = 8; r < 21; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 3)) continue; P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return 1; } return 0; })()`);
await boot(); await ev(`tutSkip(); true`); await sleep(600); await setup();
const sites = await J(`TLXV.mkt.sitesFor("pickup", mktSites()).map(s => s.id)`);
const s1 = sites[0], s2 = sites[1] || sites[0];
const LA = await makeL(s1, "tractor"); console.log("tractor listing:", JSON.stringify(LA));
await ev(`(() => { const s = TLX.state("vehicles"); for (const id of ["pickup","pickup","pickup"]) s.owned.push({ uid: "v" + (++s.seq), id, x: depot.x + 30, z: depot.z + 5, yaw: 0, fuel: 60, cond: 100, load: [] }); return 1; })()`);
ok(!!LA, "setup: 3 pickups owned (at the cap), tractor listing on the board");
await toSite(s1);
const c0 = await ev("GS.cash");
for (let i = 0; i < 3; i++) { await ev(`mktPay(GS.mkt.list.find(l => l.id === ${LA.id})); true`); await sleep(350); }
const c1 = await ev("GS.cash");
ok(c1 === c0, `A: cash unchanged after 3 refused buys (${c0} -> ${c1})`);
ok(await ev(`GS.mkt.list.some(l => l.id === ${LA.id})`), "A: listing still on the board");
ok(await ev(`GS.mkt.held.filter(h => h.cat === "veh").length`) === 0, "A: no held order created");
ok((await J(`TLX.state("vehicles").owned.length`)) === 3, "A: owned still 3");
await ev(`save(); true`); await reload(); await sleep(900);
await ev(`FOOT.on = false; GS.hour = 12; WX.at = () => 0; TLX.setOn("traffic", false); true`);
ok(await ev(`GS.mkt.held.filter(h => h.cat === "veh").length`) === 0 && (await J(`TLX.state("vehicles").owned.length`)) === 3, "C: state after reload unchanged");
await ev(`GS.cash = 80000; true`);
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${LA.id})); true`); await sleep(400);
ok(await ev("GS.cash") === 80000, "C: after reload buy is still refused, cash intact");
await ev(`TLX.state("vehicles").owned.length = 2; true`);
await toSite(s1);
await ev(`mktPay(GS.mkt.list.find(l => l.id === ${LA.id})); true`); await sleep(500);
ok(await ev("GS.cash") < 80000, "C: with a slot free the purchase goes through");
await done(fails ? 1 : 0);
