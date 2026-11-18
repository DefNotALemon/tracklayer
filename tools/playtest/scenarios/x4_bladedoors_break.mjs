// 4.2b2 doors, beta break test: old save, heap far from doors, drop/take with a standing complaint,
// Monday with a complaint standing, option off then on across a reload, on-foot walk past, double-sleep.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => {
  window.__z = k => TLXPL.win.list().find(q => q.key === k);
  window.__e = k => { const e = TLX.state("plow").win[k]; return e ? JSON.parse(JSON.stringify(e)) : null; };
  window.__pose = (x, z, yaw) => { BOG.on = false; crashCancel(); FOOT.on = false; P.x = x; P.z = z; P.yaw = yaw; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); return true; };
  window.__heap = (k, v) => { const q = __z(k), p = heapSnow(q.cx, q.cz, 0.9, v, 0.8); TLXPL.win.lay(q.cx, q.cz, 0.9, p); return p; };
  window.__away = () => { __pose(depot.x, depot.z, 0); TLXPL.rt(TLXV.state().cur).last = null; TLXPL.win.step(); return true; };
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.drv.step(); TLXPL.win.step(); } return true; };
  return true; })()`;
await boot();
await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
const DR = await J(`TLXPL.drv.list().map(c => ({ key: c.key, name: c.name }))`);
const wk = DR[0].key + ":w", mk = DR[1].key + ":m";

await section("A heap in open ground, far from any door", async () => {
  await ev(`(() => { const x = depot.x + 60, z = depot.z - 60; heapSnow(x, z, 1.2, 1.5, 0.8); __away(); return true; })()`); await sleep(500);
  ok((await J(`Object.keys(TLX.state("plow").win).length`)) === 0, "a heap nowhere near a door: no complaint");
});
await section("B on foot beside the heap on a walk, then walks away", async () => {
  await ev(`__heap(${JSON.stringify(wk)}, 0.9); FOOT.on = true; FOOT.x = __z(${JSON.stringify(wk)}).cx; FOOT.z = __z(${JSON.stringify(wk)}).cz; true`); await sleep(800);
  const h = await ev(`TLXPL.hint()`);
  console.log("   foot hint:", JSON.stringify(h));
  await ev(`FOOT.x = depot.x; FOOT.z = depot.z; TLXPL.win.step(); true`); await sleep(500);
  const e = await J(`__e(${JSON.stringify(wk)})`);
  console.log("   on foot away:", JSON.stringify(e));
  ok(true, "(info) on-foot leaving with truck parked next to door; complaint is " + (e ? "raised" : "not raised"));
  await ev(`FOOT.on = false; __away(); true`); await sleep(300);
});
await section("C complaint stands: DROP/TAKE the household, Monday", async () => {
  await ev(`TLXPL.drv.take(${JSON.stringify(DR[0].key)}); true`);
  const e0 = await J(`__e(${JSON.stringify(wk)})`);
  await ev(`TLXPL.drv.drop(${JSON.stringify(DR[0].key)}); TLXPL.win.step(); true`);
  const e1 = await J(`__e(${JSON.stringify(wk)})`);
  ok(!!e0 && !!e1, "drop with a complaint standing keeps the complaint " + JSON.stringify({ e0, e1 }));
  await ev(`TLXPL.win.monday(); true`);
  const e2 = await J(`({ e: __e(${JSON.stringify(wk)}), c: TLX.state("plow").winC })`);
  ok(!!e2.e && e2.c === 0, "Monday with a complaint standing: complaint stays, count resets " + JSON.stringify(e2));
  await ev(`__hrs(3.2); true`);
  const e3 = await J(`({ e: __e(${JSON.stringify(wk)}), c: TLX.state("plow").winC, n: TLX.state("plow").winN })`);
  ok(e3.e === null && e3.c === 1, "dug out after Monday: one complaint " + JSON.stringify(e3));
});
await section("D option off, reload, option on", async () => {
  await ev(`__heap(${JSON.stringify(mk)}, 1.2); __away(); true`); await sleep(300);
  await ev(`TLX.setOn("plowdoors", false); TLXPL.win.step(); true`);
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const off = await J(`({ on: TLX.on("plowdoors"), n: Object.keys(TLX.state("plow").win).length })`);
  ok(off.on === false && off.n === 0, "option stays off across reload, no complaints " + JSON.stringify(off));
  await ev(`TLX.setOn("plowdoors", true); TLXPL.win.step(); true`); await sleep(300);
  const heap = await J(`({ over: TLXPL.win.measure(__z(${JSON.stringify(mk)})), e: __e(${JSON.stringify(mk)}) })`);
  console.log("   after re-enable:", JSON.stringify(heap));
  ok(true, "(info) re-enabled with old heap standing: complaint " + (heap.e ? "returns" : "needs new laying"));
});
await section("E old save without plow win keys", async () => {
  await ev(`(() => { const s = TLX.state("plow"); delete s.win; delete s.winC; delete s.winN; delete s.winH; return true; })()`);
  const r = await ev(`(() => { try { TLXPL.tidy(); TLXPL.win.step(); TABLET.toggle(true, "plow"); const t = $("tabS").textContent; TABLET.toggle(false); return /NaN|undefined/.test(t) ? "bad:" + t.slice(0, 80) : "fine"; } catch (e) { return String(e); } })()`);
  ok(r === "fine", "old save: tidy + app render " + r);
});
console.log(fails ? `FAILED ${fails}` : "all ok");
await done(fails ? 1 : 0);
