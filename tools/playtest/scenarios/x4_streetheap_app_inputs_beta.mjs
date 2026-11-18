// 4.2c2b street heaps beta 2: the Plow app's Streets section on a phone (portrait + short landscape), touch tap, pad d-pad/A/B, reload with the app open.
import { boot, ev, sleep, done, reload, send, padSet, padOff, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const section = async (n, f) => { console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
const HEAP = `(() => { const L = TLXPL.str.list(); const q = L.find(q => Math.hypot(q.cx - depot.x, q.cz - depot.z) > 58) || L[0]; const p = heapSnow(q.cx, q.cz, 1.0, 2.5, 0.8); TLXPL.str.lay(q.cx, q.cz, 1.0, p); P.x = depot.x; P.z = depot.z; TLXPL.rt(TLXV.state().cur).last = null; TLXPL.str.step(); return q.key; })()`;
const open = async () => { await ev(`TABLET.toggle(true, "plow"); true`); await sleep(500); };
const rows = () => J(`(() => { const r = [...$("tabS").querySelectorAll("[data-tf^='pls:'].tprow, .tprow[data-tf^='pls:']")].filter(e => !e.querySelector('.tbtn')); const t = $("tabS").getBoundingClientRect(); return { n: r.length, text: r.map(e => e.textContent), over: r.map(e => { const b = e.getBoundingClientRect(); return b.right > t.right + 1 || e.scrollWidth > e.clientWidth + 1; }), h: r.map(e => Math.round(e.getBoundingClientRect().height)), tab: [Math.round(t.width), Math.round(t.height)] }; })()`);
await boot(); await ev(SETUP); await sleep(600);
await ev(`GS.hour = 46; TLX.state("roads").h = 46; GS.cash = 40000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); true`); await sleep(500);
const uid = await ev(`TLXV.state().owned.find(r => r.id === "plowtruck").uid`);
await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600);
const key = await ev(HEAP); await sleep(500);
await section("1 desktop: Streets section shows", async () => {
  await open(); const r = await rows(); console.log("  ", JSON.stringify(r));
  ok(r.n === 1 && /Streets|heap/i.test(await ev(`$("tabS").textContent`)), "one Streets row for key " + key);
  ok(!/NaN|undefined/.test(await ev(`$("tabS").textContent`)), "text clean");
});
for (const [nm, w, h] of [["portrait 390x844", 390, 844], ["landscape 667x375", 667, 375], ["embed 640x360", 640, 360]]) {
  await section("2 phone " + nm, async () => {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(500);
    await ev(`TABLET.toggle(false); true`); await sleep(200); await open(); await sleep(400);
    const r = await rows(); console.log("  ", JSON.stringify(r));
    ok(r.n === 1, "row present"); ok(r.over.every(x => !x), "row text not clipped/overflowing");
    // scroll the row into view and check it is on screen
    const vis = await J(`(() => { const e = document.querySelector("[data-tf^='pls:'].tprow"); if (!e) return null; e.scrollIntoView({block:"center"}); const b = e.getBoundingClientRect(); return { top: b.top, bot: b.bottom, vh: innerHeight, w: b.width, vw: innerWidth }; })()`);
    const kids = await J(`[...document.querySelector("[data-tf^='pls:'].tprow").children].map(c => ({ t: c.tagName + ":" + c.textContent.slice(0, 12), w: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height) }))`); console.log("   row children", JSON.stringify(kids));
    ok(kids.every(k => k.w >= 60), "every part of the row is at least 60 px wide (no letter-by-letter wrapping)");
    ok(vis && vis.top >= 0 && vis.bot <= vis.vh && vis.w <= vis.vw, "row reachable on screen " + JSON.stringify(vis));
    await shot("phone_" + w);
  });
}
await section("3 touch tap on the row", async () => {
  const b = await J(`(() => { const e = document.querySelector("[data-tf^='pls:'].tprow"); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  const before = await J(`({ sel: JOBT.sel && JOBT.sel.kind, open: TABLET.open, app: TABLET.app })`);
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] }); await sleep(80);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(500);
  const after = await J(`({ sel: JOBT.sel && JOBT.sel.kind, open: TABLET.open, app: TABLET.app, txt: $("tabS").textContent.length })`);
  console.log("  ", JSON.stringify({ before, after }));
  ok(after.open === true && !/NaN|undefined/.test(await ev(`$("tabS").textContent`)), "tap leaves the app open and clean");
});
await section("4 pad: d-pad reaches the row, A, B", async () => {
  await send("Emulation.clearDeviceMetricsOverride"); await sleep(300);
  await ev(`TABLET.toggle(false); true`); await sleep(200); await open();
  const f0 = await ev(`TABLET.focus`); console.log("   focus on open:", f0);
  ok(/^pls:/.test(f0), "pad focus starts on the Streets row (first in the list)");
  await padSet({ 0: 1 }); await sleep(120); await padSet(); await sleep(500);
  ok(await ev(`TABLET.open`) === true && !/NaN|undefined/.test(await ev(`$("tabS").textContent`)), "pad A on the row: nothing happens, app open, clean");
  await padSet({ 1: 1 }); await sleep(120); await padSet(); await sleep(400);
  ok(await ev(`TABLET.app`) === null || await ev(`TABLET.open`) === false, "pad B goes back to the home screen"); await padOff();
});
await section("5 reload with app open: complaint survives, app renders", async () => {
  await open(); await ev(`save(); true`);
  const sv = JSON.parse(await ev(`localStorage.getItem("tracklayer.save.v2")`));
  await reload(sv); await ev(SETUP); await sleep(900);
  const n = await J(`Object.keys(TLX.state("plow").str)`); ok(n.length === 1, "complaint kept " + n);
  await open(); const r = await rows(); ok(r.n === 1, "row back after reload"); ok(!/NaN|undefined/.test(await ev(`$("tabS").textContent`)), "clean");
});
console.log(fails ? `FAILED ${fails}` : "all ok");
await done(fails ? 1 : 0);
