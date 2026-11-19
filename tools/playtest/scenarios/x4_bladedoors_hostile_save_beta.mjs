// 4.2b2 doors, beta: hostile saved state (junk win entries, winC/winN/winH junk, drvSulk junk) through step,
// app render, Jobs, Monday, Map pins, save + reload. Page must not throw and no NaN may reach the screen.
import { boot, ev, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
await boot();
await ev(SETUP); await sleep(600);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 40000; TLXV.buy("pickup"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "pickup").uid`);
await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100, throw: "r" }; TLXPL.tidy(); TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
const keys = await J(`TLXPL.win.list().slice(0, 8).map(q => q.key)`);
console.log("   zones:", keys.length);
const JUNK = [{ v: "abc", h: 3 }, { v: 1e9, h: 1e9 }, { v: -4, h: -9 }, { v: null, h: null }, { v: NaN, h: NaN }, "str", 7, [1, 2]];
const plant = () => ev(`(() => { const s = TLX.state("plow"); const J = ${JSON.stringify(JUNK)}; const ks = ${JSON.stringify(keys)};
  s.win = {}; ks.forEach((k, i) => { s.win[k] = J[i]; });
  s.win["nonsense_key"] = { v: 2, h: 1 };
  s.winC = "x"; s.winN = Infinity; s.winH = "never"; s.drvSulk = { "a": NaN, "b": "q", "c": -1e9, "d": null }; return true; })()`);
await section("A plant junk, step, render", async () => {
  await plant();
  const r = await ev(`(() => { try { TLXPL.tidy(); TLXPL.win.step(); TLXPL.win.step(); TABLET.toggle(true, "plow"); return "fine"; } catch (e) { return "THROW " + e; } })()`);
  ok(r === "fine", "tidy + step + open Plow app: " + r);
  await sleep(500);
  const t = await ev(`$("tabS").textContent`);
  ok(!/NaN|undefined|Infinity|\[object/.test(t), "Plow app text has no NaN/undefined/Infinity");
  const s = await J(`(() => { const s = TLX.state("plow"); return { c: s.winC, n: s.winN, h: s.winH, nk: Object.keys(s.win).length, sulk: s.drvSulk }; })()`);
  console.log("   after tidy:", JSON.stringify(s));
  ok(Number.isFinite(s.c) && Number.isFinite(s.n) && s.c >= 0 && s.n >= 0, "winC/winN are finite and non-negative after tidy");
  ok(true, "(info) unknown zone key " + ("nonsense_key" in (await J(`TLX.state("plow").win`)) ? "survives tidy (POLISH, harmless, never expires)" : "dropped"));
  const sk = Object.values(s.sulk || {}); ok(sk.every(v => Number.isFinite(v)), "drvSulk values finite after tidy " + JSON.stringify(s.sulk));
  await ev(`TABLET.toggle(false); true`);
});
await section("B Jobs, pins, hint, Monday with junk", async () => {
  await plant();
  const r = await ev(`(() => { try { const j = jobsList().filter(r => /door|walk|plow/i.test(r.kind + r.title)); TABLET.layerPts("marks"); TLXPL.hint(); TLXPL.win.monday(); TLXPL.win.step(); return "fine " + j.length; } catch (e) { return "THROW " + e; } })()`);
  ok(/^fine/.test(r), "Jobs + Map pins + hint + Monday: " + r);
  const j = await J(`jobsList().map(r => r.title + " " + (r.meta || "") + " " + (r.pay || ""))`);
  ok(!j.some(t => /NaN|undefined|Infinity/.test(t)), "no NaN in any Jobs row");
});
await section("C a clock of 1e9 / negative hours then a sleep", async () => {
  await plant();
  const r = await ev(`(() => { try { TLXPL.tidy(); for (let i = 0; i < 4; i++) { GS.hour += 1.5; TLX.state("roads").h = GS.hour; TLXPL.drv.step(); TLXPL.win.step(); } return "fine"; } catch (e) { return "THROW " + e; } })()`);
  ok(r === "fine", "sleep 6 h over junk: " + r);
  const s = await J(`(() => { const s = TLX.state("plow"); return { c: s.winC, n: s.winN, h: s.winH }; })()`);
  console.log("   after sleep:", JSON.stringify(s));
  ok(Number.isFinite(s.c) && Number.isFinite(s.n) && Number.isFinite(s.h), "counters finite after sleep");
});
await section("D reload with junk", async () => {
  await plant();
  await reload(); await ev(SETUP); await sleep(800);
  const r = await ev(`(() => { try { TLXPL.tidy(); TLXPL.win.step(); TABLET.toggle(true, "plow"); return "fine"; } catch (e) { return "THROW " + e; } })()`);
  ok(r === "fine", "reload: tidy/step/app " + r);
  await sleep(500);
  ok(!/NaN|undefined|Infinity/.test(await ev(`$("tabS").textContent`)), "app text clean after reload");
  const s = await J(`(() => { const s = TLX.state("plow"); return { c: s.winC, n: s.winN, h: s.winH }; })()`);
  ok(Number.isFinite(s.c) && Number.isFinite(s.n), "counters finite after reload " + JSON.stringify(s));
});
console.log(fails ? `FAILED ${fails}` : "all ok");
await done(fails ? 1 : 0);
