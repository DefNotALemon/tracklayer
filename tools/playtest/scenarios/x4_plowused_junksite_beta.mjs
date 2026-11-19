// Beta 4.1c3: a paid-for used plow truck whose held record has a junk/missing site, junk seller, junk paid.
// Calls mktCollect directly and lets the tick run (heldRefund). Exit 1 on FAIL.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const setup = () => ev(`crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; TLX.setOn("traffic", false); TLX.setOn("police", false); GS.load = []; GS.claims = []; GS.apps.freight = 1; GS.signed.freight = true; GS.lic.freight = true; GS.delivered = 10; GS.cash = 90000; { const s = TLX.state("vehicles"); s.owned = s.owned.filter(r => r.id !== "plowtruck"); } true`);
const makeL = () => J(`(() => { GS.mkt.list = GS.mkt.list.filter(q => q.item !== "plowtruck"); GS.mkt.held.length = 0; let l = null; for (let i = 0; i < 20000 && !l; i++) { const q = mktMake(CAL.abs()); if (q && q.cat === "veh" && q.item === "plowtruck") l = q; }
  if (!l) return null; l.lemon = false; l.real = l.adv; l.life = 200; l.mute = false; l.deal = null; GS.mkt.list.push(l); return { id: l.id, site: l.site }; })()`);
const sec = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
await boot(); await ev(`tutSkip(); true`); await sleep(600); await setup();
await ev(`window.__err = []; addEventListener("error", e => window.__err.push(String(e.message))); true`);
for (const [name, patch] of [["site nowhere", `h.site = "nowhere"`], ["site undefined", `delete h.site`], ["seller undefined", `h.seller = undefined`], ["paid NaN", `h.paid = NaN`], ["cond NaN", `h.cond = NaN`]]) {
  await sec(name, async () => {
    await setup(); const L = await makeL(); if (!L) { ok(false, "no listing"); return; }
    await ev(`mktPay(GS.mkt.list.find(l => l.id === ${L.id})); true`);
    const h0 = await J(`GS.mkt.held.length`); ok(h0 === 1, "held after pay: " + h0);
    const r = await J(`(() => { const h = GS.mkt.held[0]; ${patch}; const out = {}; try { const st = SITES.find(q => q.id === h.site); out.siteFound = !!st; mktCollect(st || { id: "nowhere", x: P.x, z: P.z }); out.state = h.state; out.stillHeld = GS.mkt.held.includes(h); } catch (e) { out.err = String(e).slice(0, 160); } out.cash = GS.cash; out.held = GS.mkt.held.length; out.trucks = TLX.state("vehicles").owned.filter(r => r.id === "plowtruck").map(r => ({ x: r.x, z: r.z, cond: r.cond })); return out; })()`);
    console.log("  ", JSON.stringify(r));
    ok(!r.err, "no throw collecting");
    ok(r.cash === null || Number.isFinite(r.cash), "cash finite");
    for (const t of r.trucks) ok(Number.isFinite(t.x) && Number.isFinite(t.z) && Number.isFinite(t.cond), "truck pose/cond finite");
    await sleep(3500);
    const s = await J(`({ cash: GS.cash, held: GS.mkt.held.length, errs: window.__err })`);
    console.log("   after tick", JSON.stringify(s));
    ok(Number.isFinite(s.cash), "cash finite after tick (refund)"); ok(s.errs.length === 0, "page errors none: " + s.errs.join("|"));
    await ev(`TABLET.toggle(true, "market"); true`); await sleep(500);
    ok((await J(`window.__err.length`)) === 0, "market renders with record");
    await ev(`TABLET.toggle(false); true`);
  });
}
await sec("reload with junk-site held truck", async () => {
  await setup(); const L = await makeL(); await ev(`mktPay(GS.mkt.list.find(l => l.id === ${L.id})); GS.mkt.held[0].site = "nowhere"; save(); true`); await sleep(300);
  await reload(); await sleep(800);
  const s = await J(`({ held: GS.mkt.held.length, cash: GS.cash })`); console.log("  ", JSON.stringify(s)); ok(Number.isFinite(s.cash), "cash finite after reload");
});
await done(fails ? 1 : 0);
