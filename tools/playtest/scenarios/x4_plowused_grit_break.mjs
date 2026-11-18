// Beta test 4.1c3 x 4.1c2: a USED plow truck's gritter. Hopper empty on hand-over, fill cost, spin on a road, reload with
// spinner on, junk hopper, selling the truck. Exit 1 on FAIL.
import { boot, ev, sleep, done, reload, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 10) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const setup = () => ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLX.setOn("traffic", false); TLX.setOn("police", false); GS.load = []; GS.claims = []; GS.apps.freight = 1; GS.signed.freight = true; GS.lic.freight = true; GS.delivered = 10; GS.cash = 90000; true`);
const makeL = (site) => J(`(() => { let l = null; for (let i = 0; i < 20000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "plowtruck") l = q; }
  if (!l) return null; l.site = "${site}"; l.lemon = false; l.real = l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id }; })()`);
const toSite = id => J(`(() => { const s = SITES.find(q => q.id === "${id}"); crashCancel(); FOOT.on = false; if (TLX.state("vehicles").cur != null) TLXV.swapTo(null);
  for (let r = 8; r < 21; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 3)) continue; P.x = x; P.z = z; P.y = surf(x, z) + 0.2; P.vx = P.vy = P.vz = 0; recenter(x, z, true); return 1; } return null; })()`);
const sec = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };

await boot(); await ev(`tutSkip(); true`); await sleep(600); await setup();
const site = (await J(`TLXV.mkt.sitesFor("plowtruck", mktSites()).map(s => s.id)`))[0];
const L = await makeL(site);
await ev(`P.x += 900; recenter(P.x, P.z, true); mktPay(GS.mkt.list.find(l => l.id === ${L.id})); true`); await sleep(300);
await toSite(site);
ok(await waitUntil(`TLX.state("vehicles").owned.some(r => r.id === "plowtruck")`, 10), "used truck collected");
await waitGame(0.8);
const uid = await ev(`TLX.state("vehicles").owned.find(r => r.id === "plowtruck").uid`);
const U = JSON.stringify(uid);
const st = () => J(`(() => ({ grit: !!TLXPL.rt(${U}).grit, hop: Math.round(TLXPL.hopOf(${U})), cash: GS.cash, hint: TLXPL.hint(), cur: TLXV.state().cur }))()`);
await sec("A hopper on hand-over", async () => {
  const s = await st(); console.log("  ", JSON.stringify(s));
  ok(s.hop === 0, "used truck's hopper is empty (" + s.hop + ")");
  const far = await J(`(() => { const c0 = GS.cash; const ok = TLXPL.fill(${U}); return { ok, dc: c0 - GS.cash, hop: Math.round(TLXPL.hopOf(${U})) }; })()`);
  ok(!far.ok && far.dc === 0 && far.hop === 0, "fill refused at the lay-by, no cash taken: " + JSON.stringify(far));
  await ev(`TLXV.swapTo(null); FOOT.on = false; GS.cash += 20000; TLXV.buy("pickup"); true`); await sleep(500);
  const g = await J(`(() => { const o = TLX.state("vehicles").owned.find(q => q.id === "pickup"); return o ? { x: o.x, z: o.z } : null; })()`);
  console.log("  garage forecourt", JSON.stringify(g));
  await ev(`(() => { const r = TLX.state("vehicles").owned.find(q => q.uid === ${U}); r.x = ${g.x} + 12; r.z = ${g.z} + 12; return 1; })()`); await sleep(300);
  const r = await J(`(() => { const c0 = GS.cash; TLXPL.fill(${U}); return { dc: c0 - GS.cash, hop: Math.round(TLXPL.hopOf(${U})) }; })()`);
  console.log("  fill", JSON.stringify(r));
  ok(r.hop === 3000 || r.hop > 2900, "fill makes a 3 t hopper: " + r.hop);
  ok(r.dc === Math.round(r.hop / 1000 * 50), "fill costs $50 a tonne: $" + r.dc);
  const r2 = await J(`(() => { const c0 = GS.cash; TLXPL.fill(${U}); return { dc: c0 - GS.cash }; })()`);
  ok(r2.dc === 0, "filling a full hopper is free: $" + r2.dc);
});
await sec("B spin on a road", async () => {
  await ev(`TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(800);
  await ev(`if (!TLXPL.rt(${U}).grit) TLXPL.gritToggle(${U}); true`);
  await ev(`(() => { const r = TLXR.routes.find(x => !x.convoy) || TLXR.routes[0]; const p = r.pts ? r.pts[Math.floor(r.pts.length / 2)] : null; if (p) { P.x = p[0]; P.z = p[1]; P.y = surf(p[0], p[1]) + 0.3; recenter(P.x, P.z, true); } P.vx = 0; P.vz = 0; return 1; })()`);
  await sleep(500);
  const a = await st(); await down("KeyW"); await waitGame(5); await up("KeyW"); const b = await st();
  console.log("  ", JSON.stringify([a, b]));
  ok(b.hop < a.hop, "hopper sinks while rolling: " + a.hop + " -> " + b.hop);
  ok(b.hop >= 0 && Number.isFinite(b.hop), "hopper sane");
});
await sec("C reload with spinner on", async () => {
  const a = await st(); await ev(`save(); true`); await sleep(300);
  await reload(); await sleep(800); await setup();
  const own = await J(`TLX.state("vehicles").owned.filter(r => r.id === "plowtruck").length`);
  const hop = await J(`Math.round(TLXPL.hopOf(${U}))`);
  console.log("  after reload", own, hop, "before", a.hop);
  ok(own === 1, "truck still owned");
  ok(Math.abs(hop - a.hop) <= 60, "hopper kept over reload: " + a.hop + " -> " + hop);
  const g = await J(`!!TLXPL.rt(${U}).grit`); ok(!g, "spinner is off after reload (was on): " + g);
});
await sec("D junk hopper", async () => {
  const r = await J(`(() => { try { const b = TLX.state("plow").blades[${U}]; b.hop = NaN; TLXPL.tidy(); const a = TLXPL.hopOf(${U}); b.hop = 1e9; TLXPL.tidy(); const c = TLXPL.hopOf(${U}); b.hop = "x"; TLXPL.tidy(); return { a, c, d: TLXPL.hopOf(${U}) }; } catch (e) { return { err: String(e) }; } })()`);
  console.log("  ", JSON.stringify(r)); ok(!r.err, "no throw"); ok(r.c <= 3000 && Number.isFinite(r.a) && Number.isFinite(r.d), "hopper clamped to the 3 t cap: " + JSON.stringify(r));
});
await sec("E sell the truck, keys left", async () => {
  const r = await J(`(() => { try { const k0 = Object.keys(TLX.state("plow").blades).length; const f = TLXV.sell || TLXV.sellTruck; if (!f) return { nosell: true }; f(${U}); const s = TLX.state("plow"); return { k0, k1: Object.keys(s.blades).length, has: !!s.blades[${U}], err: window.__err || null }; } catch (e) { return { err: String(e) }; } })()`);
  console.log("  ", JSON.stringify(r)); if (!r.nosell) { ok(!r.err, "sell no throw"); ok(!r.has, "blade/hopper record dropped with the truck"); }
});
await done(fails ? 1 : 0);
