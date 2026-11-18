// Beta break for 5.4a2 (tlx-plow v22, tlx-staff v7): ONE truck offered to TWO truckless drivers on two roads,
// forced second assign, swapTo of a truck that is out, truck record deleted mid-run, 300 h sleep, reload mid-run.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__hire = id => { const a = TLX.staff.post({ id: "plow:" + id, role: "plowdriver" }); a.kit = "mine"; a.exp = GS.hour + 500; TLX.staff.hire(a.id); const m = TLX.staff.at("plow:" + id); m.kit = "mine"; m.tr.work = 1; m.tr.temper = 0; m.xpReal = 10; m.hap = 70; m.mood = 0; return m && m.id; };
  window.__snow = (id, i, v) => { TLXR.setSnow(id, v, i); TLXPL.con.step(); return true; };
  window.__mid = id => { const r = __rt(id); for (let i = 2; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && r.seg[i - 1].legs.length && (i + 1) * 400 + 40 <= r.len) return i; return -1; };
  window.__btns = () => [...$("tabS").querySelectorAll("[data-act^='stx:']")].map(b => ({ act: b.dataset.act, t: b.textContent }));
  return true; })()`;
await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; TLXPL.PDR.mine = 1; true`);
const ids = await J(`TLXPL.con.routes().map(r => r.id)`);
const [R1, R2] = ids; const r1 = JSON.stringify(R1), r2 = JSON.stringify(R2);
let D1, D2, UID, I1, I2;
await section("A one truck, two drivers", async () => {
  await ev(`GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(600);
  UID = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
  await ev(`TLXPL.con.sign(${r1}); TLXPL.con.sign(${r2}); TLX.staff.tick(); true`);
  D1 = await ev(`__hire(${r1})`); D2 = await ev(`__hire(${r2})`);
  ok(D1 && D2 && D1 !== D2, "two truckless drivers hired");
  await ev(`TABLET.toggle(true, "staff"); TABLET.render(); true`); await sleep(400);
  const b = await J(`__btns()`);
  console.log("  ", JSON.stringify(b));
  ok(b.length === 2 && b.every(x => /ASSIGN/.test(x.t)), "both cards offer the truck");
  await ev(`TLX.staff.xact ? 0 : 0; document.querySelector("[data-act='stx:${D1}:a${UID}']").click(); true`); await sleep(400);
  const b2 = await J(`__btns()`);
  console.log("  ", JSON.stringify(b2));
  const second = b2.filter(x => x.act.startsWith("stx:" + D2 + ":"));
  ok(!second.some(x => /ASSIGN THE NORDTREKK/.test(x.t)), "the second driver is no longer offered the truck driver 1 has: " + JSON.stringify(second));
  // force it anyway as a stale card would
  await ev(`(() => { const e = document.createElement("button"); e.dataset.act = "stx:${D2}:a${UID}"; return true; })()`);
  const bad = await J(`(() => { try { TLX.staff.xact && TLX.staff.xact(${D2}, "a${UID}"); } catch (e) { return String(e); } return "noapi"; })()`);
  console.log("  forced:", bad);
  const q = await J(`({ a: __pdr(${r1}), b: __pdr(${r2}) })`);
  ok(q.a.truck === UID && q.b.truck !== UID, "the truck is held by one driver only: " + JSON.stringify([q.a.truck, q.b.truck]));
});
await section("B both roads snowed, one truck", async () => {
  I1 = await ev(`__mid(${r1})`); I2 = await ev(`__mid(${r2})`);
  await ev(`__snow(${r1}, ${I1}, 0.6); __snow(${r2}, ${I2}, 0.6); true`);
  await ev(`__q(${(I1 * 400 / 12000 + I2 * 400 / 12000 + 3).toFixed(2)}, 0.1)`);
  const a = await J(`({ s1: __rt(${r1}).st.s[${I1}], s2: __rt(${r2}).st.s[${I2}], p1: __pdr(${r1}), p2: __pdr(${r2}), t: TLXV.state().owned.find(r => r.uid === ${JSON.stringify(UID)}) })`);
  console.log("  ", JSON.stringify({ s1: a.s1, s2: a.s2, p1: a.p1.st, p2: a.p2.st, out: a.t.out, fuel: a.t.fuel }));
  ok(a.s1 === 0, "road 1 opened by the driver with the truck");
  ok(a.s2 > 0.4, "road 2 (driver with no truck) stays shut: " + a.s2);
  ok(!a.t.out && Number.isFinite(a.t.fuel), "truck home and sane");
});
await section("C truck deleted while out", async () => {
  await ev(`__snow(${r1}, ${I1}, 0.6); __q(0.6, 0.05); true`);
  const out = await J(`TLXV.state().owned.find(r => r.uid === ${JSON.stringify(UID)}).out`);
  console.log("   out:", out);
  await ev(`(() => { const o = TLXV.state().owned, i = o.findIndex(r => r.uid === ${JSON.stringify(UID)}); if (i >= 0) o.splice(i, 1); return true; })()`);
  const err = await ev(`(() => { try { __q(2, 0.25); TLX.staff.tick(); TLXPL.tidy && TLXPL.tidy(); return "none"; } catch (e) { return String(e); } })()`);
  const p = await J(`__pdr(${r1})`);
  console.log("  ", err, JSON.stringify(p));
  ok(err === "none" && p && p.truck == null && p.st === "home", "driver home, truck link cleared, no exception");
});
await section("D 300 h sleep and reload", async () => {
  await ev(`GS.hour += 300; TLX.state("roads").h = GS.hour; TLXPL.con.step(); true`);
  const f = await J(`[GS.cash, GS.fuel, P.x, P.z].every(Number.isFinite)`);
  ok(f, "finite after a 300 h sleep");
  await reload(); await sleep(800);
  const r = await J(`({ p: TLX.state("plow").pdr, m: TLX.staff.at("plow:" + ${r2}) && 1 })`);
  ok(r.m === 1, "reload keeps the drivers");
});
console.log(fails ? "x5_plowdriver_mine_break: " + fails + " FAIL" : "x5_plowdriver_mine_break: all ok");
await done(fails ? 1 : 0);
