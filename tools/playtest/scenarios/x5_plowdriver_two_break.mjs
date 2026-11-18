// Beta break for 5.4a1 (tlx-plow v20, tlx-staff v6): two roads with two drivers, fired mid-run, huge sleeps, clock
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
  window.__hire = id => { const a = TLX.staff.post({ id: "plow:" + id, role: "plowdriver" }); a.exp = GS.hour + 500; TLX.staff.hire(a.id); const m = TLX.staff.at("plow:" + id); m.tr.work = 1; m.tr.temper = 0; m.xpReal = 10; m.hap = 70; m.mood = 0; return m && m.id; };
  window.__snow = (id, i, v) => { TLXR.setSnow(id, v, i); TLXPL.con.step(); return true; };
  window.__mid = id => { const r = __rt(id); for (let i = 2; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && r.seg[i - 1].legs.length && (i + 1) * 400 + 40 <= r.len) return i; return -1; };
  return true; })()`;
await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; true`);
const ids = await J(`TLXPL.con.routes().map(r => r.id)`);
console.log("  roads", JSON.stringify(ids));
const [R1, R2] = ids; const r1 = JSON.stringify(R1), r2 = JSON.stringify(R2);
let I1 = 0, I2 = 0;
await section("A two roads, two drivers", async () => {
  ok(ids.length >= 2, "at least two contract roads");
  await ev(`GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
  const uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
  await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(500);
  await ev(`TLXPL.con.sign(${r1}); TLXPL.con.sign(${r2}); TLX.staff.tick(); true`);
  const a = await J(`TLX.staff.vacancies().map(v => v.id)`);
  ok(a.includes("plow:" + R1) && a.includes("plow:" + R2), "both roads post a job: " + JSON.stringify(a));
  const h1 = await ev(`__hire(${r1})`), h2 = await ev(`__hire(${r2})`);
  ok(h1 && h2 && h1 !== h2, "two drivers hired");
  const n = await J(`TLX.staff.at("plow:" + ${r1}).name !== TLX.staff.at("plow:" + ${r2}).name`);
  I1 = await ev(`__mid(${r1})`); I2 = await ev(`__mid(${r2})`);
  await ev(`__snow(${r1}, ${I1}, 0.6); __snow(${r2}, ${I2}, 0.6); true`);
  const c0 = await ev("GS.cash");
  await ev(`__q(${(I1 * 400 / 12000 + I2 * 400 / 12000 + 3).toFixed(2)}, 0.1)`);
  const a2 = await J(`({ s1: __rt(${r1}).st.s[${I1}], s2: __rt(${r2}).st.s[${I2}], q1: __pdr(${r1}), q2: __pdr(${r2}), cash: GS.cash })`);
  console.log("  ", JSON.stringify(a2), "cash+", a2.cash - c0);
  ok(a2.s1 === 0 && a2.s2 === 0, "both roads opened by their own driver");
  ok(a2.cash - c0 > 0 && a2.q1.st === "home" && a2.q2.st === "home", "paid and both home");
});
await section("B fired while out", async () => {
  await ev(`__snow(${r1}, ${I1}, 0.6); __q(0.85, 0.05); true`);
  const q = await J(`__pdr(${r1})`);
  ok(q && q.st === "out", "driver 1 is out: " + JSON.stringify(q));
  const c0 = await ev("GS.cash");
  const id = await ev(`TLX.staff.at("plow:" + ${r1}).id`);
  await ev(`TLX.staff.letGo(${id}); TLX.staff.tick(); TLXPL.tidy(); __q(0.5, 0.25); true`);
  const a = await J(`({ m: TLX.staff.at("plow:" + ${r1}), q: __pdr(${r1}), s: __rt(${r1}).st.s[${I1}], vac: TLX.staff.vacancies().map(v => v.id), cash: GS.cash })`);
  console.log("  ", JSON.stringify(a), "cash+", a.cash - c0);
  ok(a.m === null && a.q === null, "let go while out: no driver, no leftover state");
  ok(a.s > 0.4, "the stretch is left under snow (nobody opens it)");
  ok(a.vac.includes("plow:" + R1), "the job is posted again");
  const a2 = await J(`({ q2: __pdr(${r2}), m2: !!TLX.staff.at("plow:" + ${r2}) })`);
  ok(a2.m2 && a2.q2, "the other road's driver is untouched");
});
await section("C huge sleep and clock back", async () => {
  await ev(`__snow(${r2}, ${I2}, 0.6); true`);
  const c0 = await ev("GS.cash");
  await ev(`GS.hour += 300; TLX.state("roads").h = GS.hour; TLXPL.con.step(); true`);
  let a = await J(`({ q: __pdr(${r2}), cash: GS.cash, strikes: (TLX.state("plow").con[${r2}] || {}).strikes })`);
  ok(a.q && a.q.st === "home" && Number.isFinite(a.cash), "300 h sleep: driver home, cash finite " + JSON.stringify(a));
  await ev(`__snow(${r2}, ${I2}, 0.6); GS.hour -= 20; TLX.state("roads").h = GS.hour; TLXPL.con.step(); __q(0.5, 0.25); true`);
  a = await J(`({ q: __pdr(${r2}), cash: GS.cash })`);
  ok(a.q && Number.isFinite(a.q.p) && Number.isFinite(a.cash), "clock back 20 h: no NaN " + JSON.stringify(a.q));
  await ev(`__q(6, 0.25); true`);
});
await section("D Monday with the wage unpaid", async () => {
  await ev(`__snow(${r2}, ${I2}, 0.6); GS.cash = 0; __mon({ label: "Mon 4 Jan" }); true`);
  const a = await J(`({ owed: TLX.state("staff").owed, q: __pdr(${r2}) })`);
  ok(a.owed > 0, "wage owed after Monday with $0: " + a.owed);
  await ev(`__q(2, 0.25); true`);
  const b = await J(`({ s: __rt(${r2}).st.s[${I2}], q: __pdr(${r2}) })`);
  ok(b.s > 0.4 && b.q.st === "home", "owed: driver does not go out, snow stays " + JSON.stringify(b));
  await ev(`GS.cash = 5000; TLX.staff.payOwed(); __q(3, 0.25); true`);
  const c = await J(`({ s: __rt(${r2}).st.s[${I2}], owed: TLX.state("staff").owed })`);
  ok(c.owed === 0 && c.s === 0, "paid: they go back to work and open it " + JSON.stringify(c));
});
await section("E old save without pdr", async () => {
  await ev(`(() => { delete TLX.state("plow").pdr; save(); return true; })()`);
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const a = await J(`({ m: !!TLX.staff.at("plow:" + ${r2}), q: __pdr(${r2}), where: TLXPL.pdr.where(${r2}) })`);
  ok(a.m && typeof a.where === "string", "loads, driver still on the books: " + JSON.stringify(a));
});
console.log(fails ? `x5_plowdriver_two_break: ${fails} FAILED` : "x5_plowdriver_two_break: all ok");
await done(fails ? 1 : 0);
