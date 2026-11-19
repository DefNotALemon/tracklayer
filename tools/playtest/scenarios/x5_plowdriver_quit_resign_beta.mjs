// Beta (tester 1) 5.4a1/5.4a2: road handed back (con.quit) with a driver out, plow switched off mid-run, re-sign after.
// (older header) 5.4a1 (tlx-plow v20, tlx-staff v6): two roads with two drivers, fired mid-run, huge sleeps, clock
// stepped backwards, a hired driver whose wage is unpaid on Monday, old save without pdr. Exit 1 on a failure.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; window.__mon = TLX.monday; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__hire = id => { const a = TLX.staff.post({ id: "plow:" + id, role: "plowdriver" }); a.kit = \"own\"; a.exp = GS.hour + 500; TLX.staff.hire(a.id); const m = TLX.staff.at("plow:" + id); m.tr.work = 1; m.tr.temper = 0; m.xpReal = 10; m.hap = 70; m.mood = 0; return m && m.id; };
  window.__snow = (id, i, v) => { TLXR.setSnow(id, v, i); TLXPL.con.step(); return true; };
  window.__mid = id => { const r = __rt(id); for (let i = 2; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && r.seg[i - 1].legs.length && (i + 1) * 400 + 40 <= r.len) return i; return -1; };
  return true; })()`;
await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; true`);
const ids = await J(`TLXPL.con.routes().map(r => r.id)`); const R = ids[0], r = JSON.stringify(R); let I = 0;
await ev(`GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(500);
const pageErr = [];
await section("A hand the road back with the driver out", async () => {
  await ev(`TLXPL.con.sign(${r}); TLX.staff.tick(); true`);
  ok(await ev(`__hire(${r})`), "hired");
  I = await ev(`__mid(${r})`);
  await ev(`__snow(${r}, ${I}, 0.6); __q(0.85, 0.05); true`);
  const q = await J(`__pdr(${r})`); ok(q && q.st === "out", "driver is out " + JSON.stringify(q));
  const c0 = await ev("GS.cash");
  const res = await J(`(() => { try { const x = TLXPL.con.quit(${r}); return { x: String(x) }; } catch (e) { return { err: e.message }; } })()`);
  console.log("  quit ->", JSON.stringify(res));
  await ev(`TLX.staff.tick(); TLXPL.tidy(); __q(3, 0.25); true`);
  const a = await J(`({ m: TLX.staff.at("plow:" + ${r}), q: __pdr(${r}), con: TLX.state("plow").con[${r}] || null, vac: TLX.staff.vacancies().map(v => v.id), cash: GS.cash, owed: TLX.state("staff").owed, apps: TLX.state("staff").apps.filter(x => x.place === "plow:" + ${r}).length })`);
  console.log("  ", JSON.stringify(a), "cash", a.cash - c0);
  ok(!res.err, "quit did not throw");
  ok(a.m === null && a.q === null && a.con === null, "no driver, no driver state, no contract left");
  ok(!a.vac.includes("plow:" + R) && a.apps === 0, "no job posted and no applicants for a road you no longer hold");
  ok(Number.isFinite(a.cash) && Number.isFinite(a.owed), "cash and owed finite");
});
await section("B re-sign the same road", async () => {
  await ev(`TLXPL.con.sign(${r}); TLX.staff.tick(); true`);
  const v = await J(`TLX.staff.vacancies().map(v => v.id)`);
  ok(v.includes("plow:" + R), "job posted again " + JSON.stringify(v));
  ok(await ev(`__hire(${r})`), "a fresh driver hired");
  await ev(`__snow(${r}, ${I}, 0.6); __q(3, 0.1); true`);
  const a = await J(`({ s: __rt(${r}).st.s[${I}], q: __pdr(${r}) })`);
  ok(a.s === 0 && a.q && a.q.st === "home", "new driver opened it and is home " + JSON.stringify(a));
});
await section("C plow system off mid-run, then back on", async () => {
  await ev(`__snow(${r}, ${I}, 0.6); __q(0.85, 0.05); true`);
  const q0 = await J(`__pdr(${r})`); ok(q0 && q0.st === "out", "out before switch " + JSON.stringify(q0));
  const c0 = await ev("GS.cash");
  const sw = await J(`(() => { const o = []; for (const id of ["plowtrip","plowdoors","plowheaps","plowstreets"]) TLX.setOn(id, false); try { __q(4, 0.25); } catch (e) { return e.message; } return "ok"; })()`);
  ok(sw === "ok", "options off + 4 h: no throw " + sw);
  const a = await J(`({ s: __rt(${r}).st.s[${I}], q: __pdr(${r}), cash: GS.cash })`);
  console.log("  ", JSON.stringify(a), "cash", a.cash - c0);
  ok(a.s === 0 && a.q.st === "home" && Number.isFinite(a.cash), "with every plow option off the driver still finishes and gets home");
  await ev(`for (const id of ["plowtrip","plowdoors","plowheaps","plowstreets"]) TLX.setOn(id, true); true`);
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const b = await J(`({ m: !!TLX.staff.at("plow:" + ${r}), q: __pdr(${r}) })`);
  ok(b.m && b.q, "reload after: driver still on the books " + JSON.stringify(b));
});
console.log(fails ? `x5_plowdriver_quit_resign_beta: ${fails} FAILED` : "x5_plowdriver_quit_resign_beta: all ok");
await done(fails ? 1 : 0);
