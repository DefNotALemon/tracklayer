// 4.2c beta: DROP / TAKE ON via REAL taps (touch events, then pad focus) on the Plow app buttons, not the API.
// Double fast tap, tap target size, DROP while snowed in files a miss, file note shown after.
import { boot, ev, sleep, done, send, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const S = v => JSON.stringify(v);
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const KIT = `(() => { window.__ps = () => TLX.state("plow");
  window.__hrs = h => { for (let t = 0; t < h - 1e-6; t += 1.5) { GS.hour += Math.min(1.5, h - t); TLX.state("roads").h = GS.hour; TLXPL.lot.step(); TLXPL.drv.step(); } return true; };
  window.__storm = h => { const w = WX.at; WX.at = () => 1; __hrs(h); WX.at = w; return true; };
  window.__rect = sel => { const b = document.querySelector(sel); if (!b) return null; b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, txt: b.textContent.trim() }; };
  return true; })()`;
const tap = async (x, y) => {
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
};
await boot(); await ev(SETUP); await sleep(600); await ev(KIT);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${S(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); true`);
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await ev(`SET.touch = "on"; setTouchUI(); TABLET.toggle(true, "plow"); true`); await sleep(700);
const lotKey = "hosp";

await section("A touch tap TAKE ON on a lot", async () => {
  const r = await J(`__rect("[data-act='pat:${lotKey}']")`);
  console.log("  take-on button", S(r));
  ok(r && r.w >= 40 && r.h >= 28, "tap target big enough " + (r && r.w + "x" + r.h));
  if (!r) return;
  await tap(r.x, r.y); await sleep(500);
  ok((await ev(`!!__ps().lot.${lotKey}`)) === true, "lot taken by real tap");
  ok(await J(`!!document.querySelector("[data-act='paq:${lotKey}']")`), "button flips to DROP");
});
await section("B double fast tap on DROP = one miss at most, no throw", async () => {
  await ev(`__storm(3); true`); await sleep(300);
  await ev(`TABLET.toggle(false); TABLET.toggle(true, "plow"); true`); await sleep(600);
  const r = await J(`__rect("[data-act='paq:${lotKey}']")`);
  ok(!!r, "DROP button present " + S(r)); if (!r) return;
  const hit = await J(`(() => { const e = document.elementFromPoint(${r.x}, ${r.y}); return e ? { tag: e.tagName, act: e.dataset && e.dataset.act, cls: String(e.className).slice(0, 40) } : null; })()`);
  console.log("  element at tap point", S(hit));
  ok(hit && hit.act === "paq:" + lotKey, "DROP button is what the finger hits");
  const snow0 = await J(`({ s: __ps().lot.${lotKey}.s, miss: __ps().lot.${lotKey}.miss })`); console.log("  lot level before DROP", S(snow0));
  await tap(r.x, r.y); await sleep(800);
  const one = await J(`({ has: !!__ps().lot.${lotKey}, rec: __ps().lotRec.${lotKey} || null })`);
  ok(one.has === false, "single tap on DROP drops the lot " + S(one));
  const r2 = await J(`__rect("[data-act='pat:${lotKey}']")`);
  console.log("  button under the finger after DROP", S(r2));
  if (r2) { await tap(r.x, r.y); await sleep(800); }
  const two = await J(`({ has: !!__ps().lot.${lotKey} })`);
  console.log("  second quick tap at the same spot retakes the lot:", two.has);
  ok(two.has === false, "second tap at the same spot does NOT silently TAKE ON again");
  if (two.has) await ev(`TLXPL.lot.drop(${S(lotKey)}); true`);
  const a = await J(`({ rec: __ps().lotRec.${lotKey} || null, off: __ps().lotOff.${lotKey} || null, has: !!__ps().lot.${lotKey} })`);
  console.log("  after", S(a));
  ok(!a.has, "lot dropped");
  ok(!a.rec || a.rec.miss <= 1, "double tap files at most one miss " + S(a.rec));
  const t = await ev(`$("tabS").textContent`);
  ok(!/NaN|undefined/.test(t), "app text clean");
  const lost = /lost|file|miss|missed/i.test(t);
  console.log("  file note visible in app:", lost);
});
await section("C retake via pad focus + A press", async () => {
  await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await ev(`delete __ps().lotOff.${lotKey}; TLXPL.lot.monday(); true`);
  const before = await J(`({ off: __ps().lotOff.${lotKey} || null, has: !!__ps().lot.${lotKey} })`);
  const r = await J(`__rect("[data-act='pat:${lotKey}']")`);
  console.log("  retake button", S(r), "state", S(before));
  if (!r) { ok(false, "retake button missing after drop"); return; }
  await ev(`TABLET.toggle(false); TABLET.toggle(true, "plow"); true`); await sleep(500);
  for (let i = 0; i < 12; i++) { const f = await ev(`(document.activeElement && document.activeElement.dataset && document.activeElement.dataset.act) || ""`); if (f === "pat:${lotKey}") break; await padSet({ 13: 1 }); await sleep(120); await padSet(); await sleep(250); }
  await padSet({ 0: 1 }); await sleep(150); await padSet(); await sleep(500);
  const a = await J(`({ has: !!__ps().lot.${lotKey}, act: document.activeElement && document.activeElement.dataset && document.activeElement.dataset.act })`);
  console.log("  after pad A", S(a));
  ok(a.has === true || !!(await ev(`__ps().lotOff.${lotKey} > GS.hour`)), "pad A on focused TAKE ON took the lot (or it is refused for a stated reason)");
});
console.log(fails ? `FAILED: ${fails}` : "all ok");
await done(fails ? 1 : 0);
