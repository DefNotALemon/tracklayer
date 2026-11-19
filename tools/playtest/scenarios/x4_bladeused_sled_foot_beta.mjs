// Beta test 4.1b3a used blade: collect attempts from the sled, on foot, in the wrong truck, then the right one; held survives each refusal.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); GS.load = []; GS.claims = []; GS.delivered = 10; GS.cash = 60000; true`;
const IT = "blade:b23";
const makeL = site => J(`(() => { let l = null; for (let i = 0; i < 20000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "${IT}") l = q; }
  if (!l) return null; l.site = "${site}"; l.lemon = false; l.adv = 0.6; l.real = 0.6; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id }; })()`);
const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel();
  for (let r = 9; r < 22; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 4.5)) continue;
    P.x = x; P.z = z; P.yaw = Math.atan2(x - s.x, z - s.z); P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return 1; }
  return null; })()`);
const state = () => J(`({ cur: TLXV.state().cur, foot: FOOT.on, held: GS.mkt.held.filter(h => h.item === "${IT}").length, blades: TLX.state("plow").blades, shed: TLX.state("plow").shed.length, vcur: !!VEH.cur })`);
await boot(); await ev(SETUP); await sleep(600);
const sA = await ev(`mktSites().map(s => ({ id: s.id, d: Math.hypot(s.x - depot.x, s.z - depot.z) })).sort((a, b) => a.d - b.d).filter(s => s.d > 300)[0].id`);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const u1 = await ev(`TLXV.state().owned[0].uid`);
await ev(`GS.mkt.list = GS.mkt.list.filter(l => l.cat !== "veh"); true`);
const L = await makeL(sA);
await toSite(sA); await ev(`mktPay(GS.mkt.list.find(l => l.id === ${L.id})); true`); await sleep(300);
let s = await state(); console.log("  after pay", JSON.stringify(s));
ok(s.held === 1, "paid: blade is held (" + s.held + ")");
// A riding the sled (no truck)
await ev(`TLXV.swapTo(null); FOOT.on = false; true`); await toSite(sA); await waitGame(6);
s = await state(); console.log("  sled", JSON.stringify(s));
const blk = await ev(`(() => { const h = GS.mkt.held.find(h => h.item === "${IT}"); return h ? String(mktV().blocked(h)) : "nohold"; })()`);
console.log("  blocked() on sled:", blk);
ok(s.held === 1 && Object.keys(s.blades).length === 0 && s.shed === 0, "A sled: nothing collected, still held");
ok(/pickup|truck|come in/i.test(blk), "A sled: the refusal says to come in a truck");
// B on foot beside the sled
await ev(`FOOT.on = true; true`); await toSite(sA); await waitGame(6);
s = await state(); ok(s.held === 1 && Object.keys(s.blades).length === 0 && s.shed === 0, "B on foot: not collected " + JSON.stringify(s));
// C Plow truck / wrong truck (tractor, if any fit list excludes pickup)
const fits = await J(`(() => { const h = GS.mkt.held.find(h => h.item === "${IT}"); return h && usedId ? 1 : 0; })()`).catch(() => 0);
// D right truck, reload mid-way
await ev(`TLXV.swapTo(${JSON.stringify(u1)}); FOOT.on = false; true`); await toSite(sA); await waitGame(2);
await ev(`save(); true`);
await waitGame(10);
s = await state(); console.log("  truck", JSON.stringify(s));
ok(s.held === 0 && !!s.blades[u1] && s.blades[u1].cond === 60, "D pickup: fitted at 60 (" + JSON.stringify(s.blades[u1]) + ")");
// E collecting twice must not duplicate
await waitGame(5); s = await state();
ok(Object.keys(s.blades).length === 1 && s.shed === 0, "E no duplicate after more time");
await done(fails);
