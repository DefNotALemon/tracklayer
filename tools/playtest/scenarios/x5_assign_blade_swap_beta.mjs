// Beta 5.4a2: assigned PICKUP whose blade is taken off / put back; hostile saves (one truck on two roads, ghost truck uid,
// driver "out" while the truck record is not out). Numbers only.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
// 5.4b2b: PDR.wayMax = 0 here: the truck is on the road at once, as when this was written (its drive from the spot has its own test, x5_plowdriver_way.mjs)
const SETUP = `TLXPL.PDR.bog.km = 0; /* 5.4c1: no driver bogs in this test (x5_plowdriver_stuck.mjs has that) */ TLXPL.PDR.wayMax = 0; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__drv = (id, work, xp, hap) => { const m = TLX.staff.at("plow:" + id); m.tr.work = work; m.tr.temper = 0; m.xpReal = xp; m.hap = hap; m.mood = 0; m.wage = TLX.staff.fair(m); return TLXPL.pdr.skill(m, id); };
  window.__tk = uid => { const r = TLXV.state().owned.find(q => q.uid === uid); return r ? { out: r.out || null, fuel: +r.fuel.toFixed(2) } : null; };
  return true; })()`;
await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; true`);
const pick = await J(`TLXPL.con.routes().map(r => { let b = -1; for (let i = 4; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && r.seg[i - 1].legs.length && r.seg[i + 1].legs.length && (i + 1) * 400 + 40 <= r.len) { b = i; if (i >= 5) break; } return { id: r.id, i: b }; }).filter(q => q.i >= 4)`);
const R0 = pick.find(q => q.id === "dyfjord") || pick[0], rid = JSON.stringify(R0.id), I = R0.i;
await ev(`TLXV.buy("pickup"); true`); await sleep(700);
const UID = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`), uid = JSON.stringify(UID);
// park the pickup next to the garage so fit/unfit are allowed
await ev(`GS.lic = GS.lic || {}; true`);
const fitted = await ev(`TLXPL.fit(${uid}, "b23")`);
await ev(`TLXPL.PDR.mine = 1; TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
console.log("fit result", fitted, "blade", JSON.stringify(await J(`TLX.state("plow").blades[${uid}] || null`)));
await ev(`TLX.staff.tick(); true`); await sleep(300);
console.log("con", await ev(`JSON.stringify(Object.keys(TLX.state("plow").con||{}))`), await ev(`JSON.stringify(TLX.state("staff").apps)`));
const DID = (await J(`TLX.state("staff").apps`))[0].id;
await ev(`TLXPL.PDR.mine = 1; TLX.staff.hire(${DID}); __drv(${rid}, 1, 10, 70); TLX.staff.xact(${DID}, "a" + ${uid}); true`);
const snow = (i, v) => ev(`TLXR.setSnow(${rid}, ${v}, ${i}); TLXPL.con.step(); true`);
await section("A blade off while the driver is home: they wait with a reason; back on: they go", async () => {
  const un = await ev(`TLXPL.unfit(${uid})`);
  ok(un === true, "unfit while home allowed: " + un);
  await snow(I - 1, 0.5); await snow(I, 0.6); await ev(`__q(1.5, 0.25); true`);
  let a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}), why: TLXPL.pdr.kitWhy(${rid}) })`);
  console.log("  ", JSON.stringify(a).slice(0, 220));
  ok(a.q.st === "home" && !a.t.out && /blade/.test(a.why), "bladeless pickup stays, why mentions blade");
  const f = await ev(`TLXPL.fit(${uid}, "b23")`);
  await ev(`__q(0.9, 0.3); __q(0.05, 0.05); true`);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}) })`);
  ok(f === true && a.q.st === "out" && a.t.out, "refitted: driver goes out: " + JSON.stringify(a.q).slice(0, 120));
  const un2 = await ev(`TLXPL.unfit(${uid})`);
  ok(un2 === false, "unfit while out is refused");
  await ev(`__q(3, 0.25); true`);
  a = await J(`({ q: __pdr(${rid}), t: __tk(${uid}) })`);
  ok(a.q.st === "home" && !a.t.out, "home again, truck back");
});
await section("B hostile save: ghost truck uid, two roads one truck, out flag mismatch", async () => {
  const s = await J(`TLX.state("plow").pdr`);
  const ids = Object.keys(s); console.log("  roads with drivers", ids);
  await ev(`TLX.state("plow").pdr[${rid}].truck = 99999; TLX.state("plow").pdr[${rid}].st = "out"; true`);
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const a = await J(`({ q: __pdr(${rid}) })`);
  console.log("  after ghost reload", JSON.stringify(a.q).slice(0, 200));
  ok(a.q && a.q.truck == null, "ghost truck uid cleared on load");
  const r = await ev(`(() => { try { TLX.staff.tick(); __q(2, 0.25); return "ok"; } catch (e) { return "THREW " + e.message; } })()`);
  ok(r === "ok", "ticking after ghost: " + r);
  const txt = await ev(`TABLET.toggle(true, "staff"); TABLET.render(); true`); await sleep(450);
  ok(!/undefined|NaN/.test(await ev(`$("tabS").textContent`)), "Staff card clean after ghost");
  // truck record marked out with no driver out
  await ev(`TLXV.setOut(${uid}, "with nobody", "plow"); true`);
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const t = await J(`__tk(${uid})`);
  console.log("  stuck out flag after reload", JSON.stringify(t));
  ok(!t || !t.out, "a plow-out truck with no driver out is freed on load (else it is gone for good)");
});
console.log(fails ? `x5_assign_blade_swap_beta: ${fails} FAILED` : "x5_assign_blade_swap_beta: all ok");
await done(fails ? 1 : 0);
