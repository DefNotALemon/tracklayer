// 4.2b2 doors with the factory plow truck, tester 1: heap at a door raised on leaving, Jobs row, reload with complaint standing,
// truck swapped to a sled / pickup (blade-less) while it stands, kommune hours, option off with complaint standing.
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
const jobs = () => J(`jobsList().filter(r => r.kind === "plowwin").map(r => ({ title: r.title, x: r.tgt.x, z: r.tgt.z }))`);
await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); TLXV.buy("pickup"); true`); await sleep(600);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
const uidP = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLXPL.tidy(); TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(700);
const Z = await J(`TLXPL.win.list().filter(q => q.kind !== "lot").slice(0, 3).map(q => ({ key: q.key, kind: q.kind, name: q.name }))`);
console.log("  windows:", JSON.stringify(Z));
ok(Z.length >= 2, "door windows listed " + Z.length);
const k0 = Z[0].key, k1 = Z[1].key;
await section("A plow truck: windrow at a door, drive away, complaint + Jobs row", async () => {
  await ev(`__heap(${JSON.stringify(k0)}, 1.4); true`); await sleep(300);
  console.log("   near hint:", JSON.stringify(await ev(`TLXPL.hint()`)));
  await ev(`__away(); true`); await sleep(500);
  const e = await J(`__e(${JSON.stringify(k0)})`), j = await jobs();
  console.log("   ", JSON.stringify({ e, j }));
  ok(!!e, "complaint raised after leaving with the plow truck");
  ok(j.length >= 1, "Jobs row exists for it");
});
await section("B reload with complaint standing", async () => {
  await reload(); await ev(SETUP); await sleep(500); await ev(KIT);
  const e = await J(`__e(${JSON.stringify(k0)})`), j = await jobs();
  console.log("   ", JSON.stringify({ e, j }));
  ok(!!e, "complaint survives reload"); ok(j.length >= 1, "Jobs row survives reload");
});
await section("C swap to the blade-less pickup, then hours pass", async () => {
  await ev(`TLXV.swapTo(${JSON.stringify(uidP)}); FOOT.on = false; true`); await sleep(600);
  await ev(`__hrs(2.5); true`);
  const e = await J(`__e(${JSON.stringify(k0)})`); console.log("   after 2.5h:", JSON.stringify(e));
  const r = await ev(`(() => { try { TABLET.toggle(true, "plow"); return "ok"; } catch (e) { return String(e); } })()`); await sleep(400);
  const t = await ev(`$("tabS").textContent`); await ev(`TABLET.toggle(false); true`);
  ok(r === "ok" && !/NaN|undefined/.test(t), "plow app renders with pickup, no NaN");
  await ev(`__hrs(1.5); true`);
  const e2 = await J(`({ e: __e(${JSON.stringify(k0)}), c: TLX.state("plow").winC })`);
  console.log("   after 4h:", JSON.stringify(e2));
  ok(e2.e === null && e2.c >= 1, "kommune cleared it past the clock, one complaint counted");
});
await section("D option off with a second complaint standing", async () => {
  await ev(`__heap(${JSON.stringify(k1)}, 1.4); __away(); true`); await sleep(400);
  const a = await J(`__e(${JSON.stringify(k1)})`);
  await ev(`TLX.setOn("plowdoors", false); TLXPL.win.step(); true`); await sleep(300);
  const j = await jobs();
  console.log("   ", JSON.stringify({ a, j }));
  ok(j.length === 0, "option off: no Jobs row for a standing complaint");
  await ev(`TLX.setOn("plowdoors", true); TLXPL.win.step(); true`);
});
console.log(fails ? `FAILED ${fails}` : "all ok");
await done(fails ? 1 : 0);
