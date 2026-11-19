// beta fix 0325 #1: the week's pay on a drive or lot handed back (or lost) before Monday is still on the Monday statement.
// A: a drive really plowed for pay, dropped, Monday. B: held + dropped drives sum, a second Monday adds nothing.
// C: a drive lost on its second miss. D: a lot dropped; a lot lost. E: the carry-over through a save and reload, junk tidied.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__dv = k => TLXPL.drv.list().find(c => c.key === k);
  window.__dput = (k, t) => { const c = __dv(k), d = TLXPL.bladeOf(TLXV.state().cur), yaw = Math.atan2(c.ux, c.uz), x = c.a[0] + c.ux * (t - d.z), z = c.a[1] + c.uz * (t - d.z);
    BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; crashCancel(); P.x = x; P.z = z; P.yaw = yaw; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); return true; };
  window.__foot = () => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); for (let k = -5; k <= 3; k += 0.15) bladeSnow(P.x + fx * k + fz * 1.6, P.z + fz * k - fx * 1.6, P.x + fx * k - fz * 1.6, P.z + fz * k + fx * 1.6, 0.15); P.y = surf(P.x, P.z); return true; };
  window.__dpup = (k, t0, t1) => { const dir = t1 >= t0 ? 1 : -1; let t = t0; window.__pupOn = true; __dput(k, t0); __foot();
    const step = () => { t += dir * 0.07; if ((t - t1) * dir >= 0) { P.vx = P.vz = 0; window.__pupOn = false; return; } const c = __dv(k), d = TLXPL.bladeOf(TLXV.state().cur) || { z: 3.25 }, yaw = Math.atan2(c.ux, c.uz);
      P.x = c.a[0] + c.ux * (t - d.z); P.z = c.a[1] + c.uz * (t - d.z); P.yaw = yaw; P.y = surf(P.x, P.z); P.vx = c.ux * 2.5 * dir; P.vz = c.uz * 2.5 * dir;
      requestAnimationFrame(step); };
    requestAnimationFrame(step); return true; };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.drv.step(); TLXPL.lot.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  window.__rows = name => TLX.state("plow").conLast.filter(r => r.road === name);
  window.__clr = () => { const s = TLX.state("plow"); s.conLast = []; return true; };
  return true; })()`;
const pup = async (k, t0, t1) => { await ev(`__dpup(${JSON.stringify(k)}, ${t0}, ${t1})`); for (let i = 0; i < 400 && (await ev("window.__pupOn")); i++) await sleep(100); await sleep(250); };
const blade = dn => ev(`TLXPL.rt(TLXV.state().cur).down = ${dn}; TLXPL.rt(TLXV.state().cur).k = ${dn ? 1 : 0}; TLXPL.rt(TLXV.state().cur).last = null; true`);
const q = JSON.stringify;

await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 60000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${q(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${q(uid)}); FOOT.on = false; true`); await sleep(600);
const L = await J(`TLXPL.drv.list().map(c => ({ key: c.key, L: c.L, name: c.name }))`);
const K = L.map(c => c.key);
const LOTS = await J(`TLXPL.lot.list().map(c => c.id)`);
ok(K.length >= 4 && LOTS.length >= 2, `${K.length} drives, ${LOTS.length} lots to test with`);

await section("A a drive plowed for pay, handed back, Monday", async () => {
  await ev(`TLXPL.drv.take(${q(K[0])}); __storm(3); __hrs(1); true`);
  await blade(true); const c0 = await ev("GS.cash"); await pup(K[0], -0.4, L[0].L + 0.3); await blade(false);
  const paid = (await ev("GS.cash")) - c0;
  ok(paid > 0, `the drive paid $${paid}`);
  await ev(`TLXPL.drv.drop(${q(K[0])}); true`);
  const car = await J(`({ p: TLX.state("plow").drvWk, n: TLX.state("plow").drvWkN })`);
  ok(car.p === paid && car.n === 1, `handed back: the week keeps $${car.p} from ${car.n} drive`);
  const c1 = await ev("GS.cash");
  await ev(`TLXPL.drv.monday({ label: "week one" }); true`);
  const rows = await J(`__rows("Driveways")`);
  ok(rows.length === 1 && rows[0].pay === paid && rows[0].n === 1 && rows[0].d === "week one", `Monday's statement has the Driveways line: ${q(rows)}`);
  ok((await ev("GS.cash")) === c1, "the statement pays nothing a second time");
  const car2 = await J(`({ p: TLX.state("plow").drvWk, n: TLX.state("plow").drvWkN })`);
  ok(car2.p === 0 && car2.n === 0, "the carried week is cleared by Monday");
  await ev(`TLXPL.drv.monday({ label: "week two" }); true`);
  ok((await J(`__rows("Driveways").length`)) === 1, "an empty week after it writes no line");
});
await section("B one drive kept, one handed back: one line for both", async () => {
  await ev(`__clr(); TLXPL.drv.take(${q(K[0])}); TLXPL.drv.take(${q(K[1])}); const s = TLX.state("plow"); s.drv[${q(K[0])}].wk = 30; s.drv[${q(K[0])}].n = 1; s.drv[${q(K[1])}].wk = 42; s.drv[${q(K[1])}].n = 2; TLXPL.drv.drop(${q(K[1])}); TLXPL.drv.monday({ label: "w" }); true`);
  const r = await J(`({ rows: __rows("Driveways"), kept: TLX.state("plow").drv[${q(K[0])}] })`);
  ok(r.rows.length === 1 && r.rows[0].pay === 72 && r.rows[0].n === 3, `line sums both: ${q(r.rows)}`);
  ok(r.kept && r.kept.wk === 0 && r.kept.n === 0, "the kept drive starts its new week at nothing");
  await ev(`TLXPL.drv.drop(${q(K[0])}); true`);
});
await section("C a customer lost on the second miss keeps the week's pay on the statement", async () => {
  const k = K[2];
  await ev(`__clr(); TLXPL.drv.take(${q(k)}); const st = TLX.state("plow").drv[${q(k)}]; st.wk = 36; st.n = 1; __storm(3); __hrs(13); true`);
  const mid = await J(`TLX.state("plow").drv[${q(k)}] || null`);
  ok(mid && mid.miss === 1 && mid.wk === 36, "one miss: still the customer, the week's $36 on the record");
  await ev(`__storm(3); __hrs(13); true`);
  const r = await J(`({ st: TLX.state("plow").drv[${q(k)}] || null, off: TLX.state("plow").drvOff[${q(k)}] || 0, h: GS.hour, p: TLX.state("plow").drvWk, n: TLX.state("plow").drvWkN })`);
  ok(!r.st && r.off > r.h, "second miss: the customer is lost");
  ok(r.p === 36 && r.n === 1, `the week keeps $${r.p} from ${r.n} drive`);
  await ev(`TLXPL.drv.monday({ label: "w" }); true`);
  const rows = await J(`__rows("Driveways")`);
  ok(rows.length === 1 && rows[0].pay === 36 && rows[0].n === 1, `Monday's line: ${q(rows)}`);
});
await section("D lots: handed back, and lost", async () => {
  await ev(`__clr(); TLXPL.lot.take(${q(LOTS[0])}); const st = TLX.state("plow").lot[${q(LOTS[0])}]; st.wk = 148; st.n = 1; TLXPL.lot.drop(${q(LOTS[0])}); TLXPL.lot.monday({ label: "w" }); true`);
  let rows = await J(`__rows("Lots")`);
  ok(rows.length === 1 && rows[0].pay === 148 && rows[0].n === 1, `a lot handed back: ${q(rows)}`);
  const took = await J(`(() => { __clr(); const t = TLXPL.lot.take(${q(LOTS[1])}); const st = TLX.state("plow").lot[${q(LOTS[1])}]; if (st) { st.wk = 86; st.n = 1; } return t; })()`);
  ok(took === true, "second lot taken on");
  let lost = false;
  for (let i = 0; i < 4 && !lost; i++) { await ev(`__storm(3); __hrs(13); true`); lost = !(await J(`!!TLX.state("plow").lot[${q(LOTS[1])}]`)); }
  ok(lost, "the lot is lost after its misses");
  await ev(`TLXPL.lot.monday({ label: "w" }); true`);
  rows = await J(`__rows("Lots")`);
  ok(rows.length === 1 && rows[0].pay === 86 && rows[0].n === 1, `a lot lost: ${q(rows)}`);
  ok((await J(`__rows("Driveways").length`)) === 0, "no Driveways line from the lots");
});
await section("E the carried week through a save and reload; junk tidied", async () => {
  const k = K[3];
  await ev(`__clr(); TLXPL.drv.take(${q(k)}); const st = TLX.state("plow").drv[${q(k)}]; st.wk = 40; st.n = 1; TLXPL.drv.drop(${q(k)}); save(); true`);
  await reload(); await ev(SETUP); await sleep(600); await ev(KIT);
  const car = await J(`({ p: TLX.state("plow").drvWk, n: TLX.state("plow").drvWkN })`);
  ok(car.p === 40 && car.n === 1, `after the reload the week still holds $${car.p} from ${car.n} drive`);
  await ev(`TLXPL.drv.monday({ label: "after reload" }); true`);
  const rows = await J(`__rows("Driveways")`);
  ok(rows.length >= 1 && rows[0].pay === 40 && rows[0].n === 1 && rows[0].d === "after reload", `Monday's line after the reload: ${q(rows[0])}`);
  await ev(`const s = TLX.state("plow"); s.drvWk = NaN; s.drvWkN = -3; s.lotWk = "x"; delete s.lotWkN; TLXPL.tidy(); true`);
  const t = await J(`(() => { const s = TLX.state("plow"); return [s.drvWk, s.drvWkN, s.lotWk, s.lotWkN]; })()`);
  ok(t.every(v => v === 0), `junk carry-over tidied to zeros: ${q(t)}`);
  const n0 = await J(`TLX.state("plow").conLast.length`);
  await ev(`const s = TLX.state("plow"); s.drvWk = NaN; s.drvWkN = 2; TLXPL.drv.monday({ label: "j" }); s.lotWk = 50; s.lotWkN = NaN; TLXPL.lot.monday({ label: "j" }); true`);
  const r = await J(`({ rows: TLX.state("plow").conLast.slice(0, 2), n: TLX.state("plow").conLast.length, cash: GS.cash })`);
  ok(Number.isFinite(r.cash) && r.rows.every(x => Number.isFinite(x.pay) && Number.isFinite(x.n)), `a junk week never puts NaN on a statement: ${q(r.rows)} (${n0} -> ${r.n} rows)`);
});
const pe = await ev(`(window.__tlerr || []).length`).catch(() => 0);
ok(!pe, "no page errors recorded");
console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
