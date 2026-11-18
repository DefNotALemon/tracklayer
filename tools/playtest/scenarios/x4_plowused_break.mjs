// Beta break test for 4.1c3 used plow truck: reload while one waits, collecting while riding another truck / on a sled at night,
// the mend, junk in the saved `used` mark, sell-off of the truck. Prints findings; exit 1 on a FAIL.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 10) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const setup = () => ev(`crashCancel(); FOOT.on = false; GS.hour = 23.5; GS.storm = 1; TLX.setOn("traffic", false); GS.load = []; GS.claims = []; GS.apps.freight = 1; GS.signed.freight = true; GS.lic.freight = true; GS.delivered = 10; GS.cash = 90000; true`);
const makeL = (site, lemon, real) => J(`(() => { let l = null; for (let i = 0; i < 20000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "plowtruck") l = q; }
  if (!l) return null; l.site = "${site}"; l.lemon = ${lemon}; l.real = ${lemon} ? ${real} : l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id, ask: l.ask, seller: l.seller }; })()`);
const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false; if (TLX.state("vehicles").cur != null) TLXV.swapTo(null);
  for (let r = 8; r < 21; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 3)) continue; P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return 1; } return null; })()`);
const plows = () => J(`TLX.state("vehicles").owned.filter(r => r.id === "plowtruck").map(r => ({ uid: r.uid, cond: r.cond, used: r.used === undefined ? null : r.used, blade: TLX.state("plow").blades[r.uid] || null }))`);

await boot(); await ev(`tutSkip(); true`); await sleep(600); await setup();
const ms = await J(`TLXV.mkt.sitesFor("plowtruck", mktSites()).map(s => s.id)`);
const site = ms[0];
// 1. pay a lemon, reload while it waits, then collect
const L = await makeL(site, true, 0.4);
await ev(`P.x += 900; recenter(P.x, P.z, true); mktPay(GS.mkt.list.find(l => l.id === ${L.id})); save(); true`); await sleep(300);
await reload(); await sleep(800); await setup();
ok(await ev(`GS.mkt.held.some(h => h.item === "plowtruck")`), "paid truck still waiting after a reload");
await toSite(site);
ok(await waitUntil(`TLX.state("vehicles").owned.some(r => r.id === "plowtruck")`, 10), "collected after the reload, at night in a storm");
await waitGame(0.8);
let ls = await plows(); const A = ls[0];
console.log("A", JSON.stringify(A));
ok(A && A.blade && A.blade.cond === A.cond, `edge matches truck after reload-collect (${A && A.blade && A.blade.cond} vs ${A && A.cond})`);
ok(A && A.cond <= 45, `lemon's real condition kept (${A && A.cond}%)`);
// 2. collect a second while driving ANOTHER truck (the pickup) and check edge goes to the new truck only
await ev(`(() => { const s = TLX.state("vehicles"); s.owned.push({ uid: "v" + (++s.seq), id: "pickup", x: depot.x + 30, z: depot.z + 6, yaw: 0, fuel: 60, cond: 100, load: [] }); return 1; })()`);
const pk = await J(`TLX.state("vehicles").owned.find(r => r.id === "pickup").uid`);
await ev(`TLXV.swapTo(${JSON.stringify(pk)}); true`); await sleep(1200);
const L2 = await makeL(site, true, 0.6);
await ev(`P.x += 900; recenter(P.x, P.z, true); mktPay(GS.mkt.list.find(l => l.id === ${L2.id})); true`); await sleep(300);
const held2 = await ev(`GS.mkt.held.some(h => h.item === "plowtruck")`);
console.log("second paid while at wheel of pickup:", held2);
await toSite(site); // swaps to null
await waitUntil(`TLX.state("vehicles").owned.filter(r => r.id === "plowtruck").length === 2`, 10);
await waitGame(0.8);
ls = await plows(); console.log("after second", JSON.stringify(ls));
const B = ls.find(q => q.uid !== A.uid);
ok(ls.length === 2 && B && B.blade && B.blade.cond === B.cond, `second truck's edge = its condition (${B && B.blade && B.blade.cond} vs ${B && B.cond})`);
ok(ls.find(q => q.uid === A.uid).blade.cond === A.cond, "first truck's edge untouched by the second hand-over");
// 3. junk used mark
const r3 = await J(`(() => { try { const r = TLX.state("vehicles").owned.find(q => q.id === "plowtruck"); r.used = NaN; TLXPL.tidy(); r.used = "x"; TLXPL.tidy(); r.used = -5; TLXPL.tidy(); return { ok: true, b: TLX.state("plow").blades[r.uid] }; } catch (e) { return { err: String(e) }; } })()`);
ok(r3.ok, `junk 'used' mark: no throw ${JSON.stringify(r3)}`);
// 4. mend
const m = await J(`(() => { const u = TLX.state("vehicles").owned.filter(r => r.id === "plowtruck")[0].uid; const c0 = GS.cash, e0 = TLXPL.condOf(u); const cost = TLXPL.mendCost(u); return { u, e0, cost, c0 }; })()`);
console.log("mend", JSON.stringify(m));
ok(m.cost === (100 - m.e0) * 6, "mend cost formula holds");
// 5. page errors via done
await done(fails ? 1 : 0);
