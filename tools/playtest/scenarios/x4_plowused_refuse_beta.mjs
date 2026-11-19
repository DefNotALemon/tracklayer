// Beta 4.1c3: used plow truck listing refusals + hostile listing fields. No licence, 3 trucks owned, two paid at once,
// junk ask/adv/real/life, page render of the listing. Exit 1 on FAIL.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const setup = () => ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLX.setOn("traffic", false); TLX.setOn("police", false); GS.load = []; GS.claims = []; GS.apps.freight = 1; GS.signed.freight = true; GS.delivered = 10; GS.cash = 90000; true`);
const makeL = (patch = "") => J(`(() => { const lic = GS.lic.freight; GS.lic.freight = true; GS.mkt.list = GS.mkt.list.filter(q => q.item !== "plowtruck"); const nT = TLX.state("vehicles").owned.length; let l = null; for (let i = 0; i < 20000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "plowtruck") l = q; }
  GS.lic.freight = lic; if (!l) return null; l.lemon = false; l.real = l.adv; l.life = 200; l.mute = false; l.deal = null; ${patch}; GS.mkt.list.push(l); return { id: l.id, ask: l.ask }; })()`);
const sec = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
await boot(); await ev(`tutSkip(); true`); await sleep(600); await setup();
const why = id => J(`mktPayWhy(GS.mkt.list.find(l => l.id === ${id})) `);
const trucks = () => J(`TLX.state("vehicles").owned.filter(r => r.id !== "pickup" || true).length`);

await sec("A no Freight licence", async () => {
  await ev(`GS.lic.freight = false; true`);
  const L = await makeL(); const w = await why(L.id); console.log("  why:", w);
  ok(typeof w === "string" && w.length > 0, "refused without the licence: " + w);
  const r = await J(`(() => { const c0 = GS.cash, h0 = GS.mkt.held.length; try { mktPay(GS.mkt.list.find(l => l.id === ${L.id})); } catch (e) { return { err: String(e) }; } return { dc: c0 - GS.cash, dh: GS.mkt.held.length - h0 }; })()`);
  console.log("  pay", JSON.stringify(r)); ok(!r.err && r.dc === 0 && r.dh === 0, "no cash moves, nothing held");
});
await sec("B three trucks owned", async () => {
  await ev(`GS.lic.freight = true; true`);
  const L = await makeL();
  await ev(`const s = TLX.state("vehicles"); for (let k = 0; k < 3; k++) s.owned.push({ uid: "v" + (++s.seq), id: "tractor", x: depot.x + 30 + k * 8, z: depot.z + 6, yaw: 0, fuel: 60, cond: 100, load: [] }); true`);
  const w = await why(L.id); console.log("  why:", w);
  ok(w.length > 0, "refused at three trucks: " + w);
  const r = await J(`(() => { const c0 = GS.cash; mktPay(GS.mkt.list.find(l => l.id === ${L.id})); return GS.cash - c0; })()`);
  ok(r === 0, "no cash moves: " + r);
});
await sec("C two paid back to back with 1 truck slot", async () => {
  await ev(`const s = TLX.state("vehicles"); s.owned = s.owned.filter(r => r.id !== "tractor"); GS.mkt.held.length = 0; true`);
  const a = await makeL();
  await ev(`(() => { const l = GS.mkt.list.find(q => q.id === ${a.id}); GS.mkt.list.push(Object.assign({}, l, { id: 99001 })); mktPay(l); mktPay(GS.mkt.list.find(q => q.id === 99001)); return 1; })()`);
  const h = await J(`GS.mkt.held.filter(x => x.item === "plowtruck").length`);
  const c = await J(`GS.cash`); console.log("  held", h, "cash", c);
  ok(h <= 1, "only one waiting plow truck at a time: " + h);
  ok(c >= 90000 - 17000 * 1.5, "second one's cash not taken: " + c);
});
await sec("D junk listing fields", async () => {
  for (const p of ["l.ask = NaN", "l.ask = -100", "l.adv = undefined; l.real = undefined", "l.life = NaN", "l.ask = 1e12", "l.site = 'nowhere'"]) {
    await ev(`GS.mkt.held.length = 0; GS.cash = 90000; true`);
    const L = await makeL(p);
    const r = await J(`(() => { try { const l = GS.mkt.list.find(q => q.id === ${L.id}); const w = mktPayWhy(l); const c0 = GS.cash; mktPay(l); return { w, dc: c0 - GS.cash, held: GS.mkt.held.length, cashOk: Number.isFinite(GS.cash) }; } catch (e) { return { err: String(e) }; } })()`);
    console.log("  ", p, JSON.stringify(r));
    ok(!r.err, "no throw: " + p); ok(r.cashOk, "cash stays finite: " + p);
    ok(!(r.dc < 0), "cash never goes UP from a purchase: " + p + " dc=" + r.dc);
  }
});
await sec("E listing page renders", async () => {
  const L = await makeL();
  const r = await J(`(() => { try { TABLET.toggle(true, "market"); return { ok: true }; } catch (e) { return { err: String(e) }; } })()`);
  await sleep(500); ok(!r.err, "market opens");
});
await done(fails ? 1 : 0);
