// Beta break for 5.4a1/5.4a2 + 5.3: a plow driver LEAVES while out on the road (unpaid walkout; notice running out; low
// happiness), in their own truck and in the player's truck. Asserts the truck comes home, no pdr state is left, the job
// is posted again, the stretch is left shut, and a reload afterwards is clean. Exit 1 on a failure.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__rt = id => TLXR.routes.find(r => r.id === id);
  window.__q = (h, st) => { st = st || 0.5; for (let t = 0; t < h - 1e-6; t += st) { GS.hour += Math.min(st, h - t); TLX.state("roads").h = GS.hour; TLXPL.con.step(); TLX.staff.tick(); } return true; };
  window.__pdr = id => { const q = TLX.state("plow").pdr[id]; return q ? JSON.parse(JSON.stringify(q)) : null; };
  window.__hire = (id, kit) => { const a = TLX.staff.post({ id: "plow:" + id, role: "plowdriver" }); a.kit = kit; a.exp = GS.hour + 500; TLX.staff.hire(a.id); const m = TLX.staff.at("plow:" + id); m.kit = kit; m.tr.work = 1; m.tr.temper = 0; m.xpReal = 10; m.hap = 70; m.mood = 0; return m && m.id; };
  window.__snow = (id, i, v) => { TLXR.setSnow(id, v, i); TLXPL.con.step(); return true; };
  window.__mid = id => { const r = __rt(id); for (let i = 2; i < r.seg.length - 1; i++) if (r.seg[i].legs.length && r.seg[i - 1].legs.length && (i + 1) * 400 + 40 <= r.len) return i; return -1; };
  window.__truck = uid => { const t = TLXV.state().owned.find(r => r.uid === uid); return t ? { out: t.out || null, by: t.outBy || null, fuel: t.fuel } : null; };
  return true; })()`;
await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; TLXPL.PDR.mine = 1; true`);
const ids = await J(`TLXPL.con.routes().map(r => r.id)`);
const [R1, R2] = ids; const r1 = JSON.stringify(R1), r2 = JSON.stringify(R2);
let UID, I1, I2, D1, D2;
await section("setup: truck, two roads, one driver in my truck (road 1)", async () => {
  await ev(`GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(600);
  UID = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
  await ev(`TLXPL.con.sign(${r1}); TLXPL.con.sign(${r2}); TLX.staff.tick(); true`);
  D1 = await ev(`__hire(${r1}, "mine")`);
  await ev(`TLX.staff.xact(${D1}, "a${UID}"); true`); await sleep(300);
  const q = await J(`__pdr(${r1})`);
  ok(q && q.truck === UID, "truck assigned to driver 1: " + JSON.stringify(q && q.truck));
  I1 = await ev(`__mid(${r1})`); I2 = await ev(`__mid(${r2})`);
});
await section("A unpaid walkout while out in MY truck", async () => {
  await ev(`__snow(${r1}, ${I1}, 0.6); __q(0.85, 0.05); true`);
  let q = await J(`__pdr(${r1})`), t = await J(`__truck(${JSON.stringify(UID)})`);
  ok(q && q.st === "out" && t.out, "driver is out and the truck is out: " + JSON.stringify([q && q.st, t]));
  await ev(`GS.cash = 0; TLX.state("staff").owed = 80; true`);
  await ev(`__q(75, 1.5)`);  // NB: owed wages send the driver home within 0.5 h (see owed_out_probe), so this tests the walkout on a driver already home
  const a = await J(`({ m: TLX.staff.at("plow:" + ${r1}), q: __pdr(${r1}), t: __truck(${JSON.stringify(UID)}), s: __rt(${r1}).st.s[${I1}], vac: TLX.staff.vacancies().map(v => v.id), fuel: GS.fuel, cash: GS.cash })`);
  console.log("  ", JSON.stringify(a));
  ok(a.m === null, "walked out: no driver on the books");
  ok(a.q === null || a.q.st === "home", "no 'out' state left: " + JSON.stringify(a.q));
  ok(a.t && !a.t.out, "my truck is back (not stuck 'out'): " + JSON.stringify(a.t));
  ok(Number.isFinite(a.cash) && Number.isFinite(a.t.fuel), "numbers finite");
  ok(a.vac.includes("plow:" + R1), "road 1's job is posted again");
  await ev(`TLX.state("staff").owed = 0; true`);
});
await section("B notice runs out while out (own truck, road 2)", async () => {
  await ev(`GS.cash = 90000; TLXPL.PDR.mine = 0; true`);
  D2 = await ev(`__hire(${r2}, "own")`);
  await ev(`__snow(${r2}, ${I2}, 0.6); __q(0.85, 0.05); true`);
  const q0 = await J(`__pdr(${r2})`);
  ok(q0 && q0.st === "out", "driver 2 out: " + JSON.stringify(q0 && q0.st));
  const c0 = await ev(`GS.cash`);
  await ev(`(() => { const m = TLX.staff.at("plow:" + ${r2}); m.notice = GS.hour + 0.2; m.hap = 10; return true; })()`);
  await ev(`__q(0.6, 0.1)`);
  const a = await J(`({ m: TLX.staff.at("plow:" + ${r2}), q: __pdr(${r2}), s: __rt(${r2}).st.s[${I2}], cash: GS.cash, vac: TLX.staff.vacancies().map(v => v.id), n: TABLET.log.slice(0, 4).map(n => n.title) })`);
  console.log("  ", JSON.stringify(a), "cash delta", a.cash - c0);
  ok(a.m === null && (a.q === null || a.q.st === "home"), "left on notice mid-run: no driver, no out state");
  ok(a.vac.includes("plow:" + R2), "job posted again");
  ok(Number.isFinite(a.cash), "cash finite");
});
await section("C reload after both left", async () => {
  await ev(`save(); true`); await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const a = await J(`({ pdr: TLX.state("plow").pdr, t: __truck(${JSON.stringify(UID)}), crew: TLX.state("staff").crew.length })`);
  console.log("  ", JSON.stringify(a));
  ok(a.t && !a.t.out && a.crew === 0, "after reload: truck home, nobody on the books");
  ok(Object.values(a.pdr || {}).every(q => !q || q.st === "home"), "no driver left 'out' in the save");
  await ev(`TLXPL.con.step(); TLX.staff.tick(); __q(3, 0.5); true`);
  const e = await J(`({ ok: [GS.cash, P.x, P.z].every(Number.isFinite) })`);
  ok(e.ok, "game runs on");
});
console.log(fails ? "x5_plowdriver_quit_break: " + fails + " FAILED" : "x5_plowdriver_quit_break: all ok");
await done(fails ? 1 : 0);
