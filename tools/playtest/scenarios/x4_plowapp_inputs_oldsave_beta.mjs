// 4.2a/4.2b1 Plow app beta: old save without the plow key, then TOUCH tap and PAD press on its sign/take-on buttons.
import { boot, ev, sleep, done, reload, send, padSet, padOff, raw } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
await boot();
await ev(SETUP); await sleep(600);
await ev(`GS.hour = 34; GS.cash = 40000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
await section("A old save: no plow key, no x at all", async () => {
  await ev(`save(); true`);
  const sv = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`));
  console.log("  plow key in save:", !!(sv.x && sv.x.sys && sv.x.sys.plow));
  const sv2 = JSON.parse(JSON.stringify(sv)); if (sv2.x && sv2.x.sys) delete sv2.x.sys.plow;
  await reload(sv2); await ev(SETUP); await sleep(800);
  const st = await J(`({ s: TLX.state("plow"), hidden: TABLET.byId.plow.hidden() })`);
  console.log("  state", JSON.stringify(st).slice(0, 200));
  ok(st.s && typeof st.s === "object", "plow state exists without the key");
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(400);
  ok(!/NaN|undefined/.test(await ev(`$("tabS").textContent`)), "app renders (owner of plow truck, old save)");
  await ev(`TABLET.toggle(false); true`);
  // wholly pre-expansion save
  const sv3 = JSON.parse(JSON.stringify(sv)); delete sv3.x;
  await reload(sv3); await ev(SETUP); await sleep(800);
  const s3 = await J(`({ s: TLX.state("plow"), hidden: TABLET.byId.plow.hidden() })`);
  ok(s3.s && s3.hidden === true, "pre-expansion save: plow state built, app hidden (no blade owned)");
  const errs = await ev(`(() => { try { TABLET.toggle(true, "plow"); TABLET.toggle(false); return "ok"; } catch (e) { return String(e); } })()`);
  ok(errs === "ok", "opening hidden app doesn't throw: " + errs);
});
await section("B touch tap + pad A on sign button", async () => {
  await reload(); await ev(SETUP); await sleep(800);
  await ev(`GS.cash = 40000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
  const u2 = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck") && TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
  await ev(`TLXV.swapTo(${JSON.stringify(u2)}); FOOT.on = false; true`); await sleep(600);
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await ev(`SET.touch = "on"; setTouchUI(); TABLET.toggle(true, "plow"); true`); await sleep(600);
  const rect = await J(`(() => { const b = document.querySelector("[data-act^='pls:']"); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, id: b.dataset.act }; })()`);
  console.log("  sign button", JSON.stringify(rect));
  ok(rect && rect.w >= 40 && rect.h >= 28, "sign button exists and is touch sized");
  if (rect) {
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: rect.x, y: rect.y }] }); await sleep(80);
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(500);
    const n = await ev(`Object.keys(TLX.state("plow").con).length`);
    ok(n === 1, "a touch tap signed one contract (" + n + ")");
    const q = await J(`(() => { const b = document.querySelector("[data-act^='plq:']"); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    ok(!!q, "quit button replaces sign after tap");
    // double tap must not double-sign / double-charge
    const cash = await ev(`GS.cash`);
    if (rect) { for (let i = 0; i < 2; i++) { await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: rect.x, y: rect.y }] }); await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); } }
    await sleep(400);
    ok(await ev(`GS.cash`) === cash, "extra taps on the same spot do not change cash");
  }
  // pad: back button B closes the tablet; D-pad / A navigation
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(300);
  await padSet({ 1: 1 }); await sleep(120); await padSet(); await sleep(400);
  ok(await ev(`TABLET.open`) === false, "pad B closes the tablet from the Plow app");
  await ev(`TABLET.toggle(true, "plow"); true`); await sleep(300);
  const before = await J(`({ con: Object.keys(TLX.state("plow").con).length, drv: Object.keys(TLX.state("plow").drv || {}).length, sel: document.querySelector(".tfocus,.tsel,[data-focus]") ? 1 : 0 })`);
  for (let i = 0; i < 4; i++) { await padSet({ 13: 1 }); await sleep(120); await padSet(); await sleep(250); }
  const foc = await J(`(() => { const e = document.activeElement; const f = document.querySelector(".tpad,.focus,.tfocus,.padf"); return { act: e && e.dataset ? e.dataset.act || e.className : null, f: f ? (f.dataset.act || f.className) : null }; })()`);
  console.log("  focus after 4 D-pad downs", JSON.stringify(foc), "before", JSON.stringify(before));
  await padSet({ 0: 1 }); await sleep(120); await padSet(); await sleep(500);
  const after = await J(`({ con: Object.keys(TLX.state("plow").con).length, drv: Object.keys(TLX.state("plow").drv || {}).length, open: TABLET.open })`);
  console.log("  after pad A", JSON.stringify(after));
  ok(foc.act || foc.f, "pad D-pad puts a focus on something in the Plow app");
  await padOff();
});
await done(fails ? 1 : 0);
