// App Store beta (v216-218): try to break it. Pad/keyboard d-pad reach, Enter on cards, OPEN of installed apps from a product page,
// everything installed, broke, reload while on a product page, night, short landscape phone.
import { boot, ev, shot, sleep, done, tap, errors, reload, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev("tutSkip(); GS.cash = 1000; delete GS.apps.freight; delete GS.apps.rescue; delete GS.apps.realestate; TABLET.toggle(true, 'store'); true"); await sleep(1000);
// A. d-pad reach on the Today page
const keys = await J("TABLET.focusables().map(e => e.dataset.tf)");
console.log("focusables today:", keys.join(" "));
const reached = new Set(); await ev("TABLET.focus = null; true");
for (let i = 0; i < 40; i++) { await tap(i % 2 ? "ArrowDown" : "ArrowRight"); const f = await J("TABLET.focus"); if (f) reached.add(f); }
await ev("TABLET.focus = null; true");
for (let i = 0; i < 40; i++) { await tap("ArrowDown"); const f = await J("TABLET.focus"); if (f) reached.add(f); }
const need = keys.filter(k => /^st(c|g):|^st:/.test(k));
const miss = need.filter(k => !reached.has(k));
ok(miss.length === 0, "arrow keys reach every card/row/GET: missing " + JSON.stringify(miss));
// B. Enter on a card opens the product page; focus survives; Escape returns
await ev("TABLET.focus = 'stc:freight'; TABLET.paintFocus(); true"); await tap("Enter"); await sleep(300);
ok(await J(`STO.view === "detail" && STO.sel === "freight"`), "Enter on a card opens its page");
const f1 = await J("({ f: TABLET.focus, has: TABLET.focusables().map(e => e.dataset.tf) })");
console.log("detail focus:", JSON.stringify(f1));
await tap("ArrowDown"); await tap("ArrowDown"); await sleep(100);
ok(await J(`!!TABLET.focus && TABLET.focusables().some(e => e.dataset.tf === TABLET.focus)`), "detail: focus lands on a live control after arrows (" + await J("TABLET.focus") + ")");
await tap("Enter"); await sleep(400);
const bought = await J("({ f: GS.apps.freight, cash: GS.cash, view: STO.view })");
console.log("after Enter on detail focus:", JSON.stringify(bought));
await tap("Escape"); await sleep(300);
ok(await J(`TABLET.app === "store"`), "Escape from a page (or from Today after buying) leaves the store open or closes cleanly: app=" + await J("TABLET.app") + " view=" + await J("STO.view"));
// C. pad: d-pad down + A, B to back
await ev("TABLET.go('store'); true"); await sleep(300);
await padSet({ 13: 1 }); await sleep(250); await padSet(); await sleep(150);
await padSet({ 0: 1 }); await sleep(250); await padSet(); await sleep(400);
console.log("pad A:", await J("({ view: STO.view, sel: STO.sel, focus: TABLET.focus })"));
await padSet({ 1: 1 }); await sleep(250); await padSet(); await sleep(300);
console.log("pad B:", await J("({ view: STO.view, app: TABLET.app })"));
await padOff();
// D. everything installed: no START HERE, no crash, OPEN on all
await ev("GS.apps.freight = 1; GS.apps.rescue = 1; GS.apps.realestate = 1; TABLET.go('store'); TABLET.render(); true"); await sleep(400);
const all = await J(`({ next: document.querySelectorAll("#tabV .stcard.next").length, eyes: [...document.querySelectorAll("#tabV .stceye")].map(e => e.textContent), got: [...document.querySelectorAll("#tabV .stget")].map(e => e.textContent), badge: STORE.filter(s => !s.builtin && !GS.apps[s.id]).length })`);
console.log("all installed:", JSON.stringify(all));
ok(all.next === 0 && all.eyes.every(e => e === "INSTALLED"), "all installed: no START HERE, every card INSTALLED");
await shot("g7b_all_installed");
// open each installed app from its page
for (const id of ["crew", "freight", "realestate", "rescue"]) {
  await ev(`TABLET.go('store'); STO.view='detail'; STO.sel='${id}'; TABLET.render(); true`); await sleep(200);
  await ev(`document.querySelector('#tabV .stdet [data-get=${id}]').click(); true`); await sleep(300);
  ok(await J(`TABLET.app === "${id}"`), `OPEN on ${id}'s page goes to the ${id} app (app=${await J("TABLET.app")})`);
}
// E. broke + bad id
await ev("delete GS.apps.rescue; GS.cash = 0; TABLET.go('store'); STO.view='home'; TABLET.render(); true"); await sleep(300);
const poor = await J(`[...document.querySelectorAll("#tabV .stget")].map(e => e.textContent + (e.classList.contains("poor") ? "(poor)" : ""))`);
console.log("broke pills:", poor.join(" "));
await ev("STO.view='detail'; STO.sel='nonexistent'; TABLET.render(); true"); await sleep(200);
ok(await J(`document.querySelectorAll("#tabV .strow").length === 4`), "unknown STO.sel falls back to Today");
// F. reload while on a product page
await ev("STO.view='detail'; STO.sel='rescue'; TABLET.render(); save(); true"); await sleep(300);
await reload(); await sleep(800);
await ev("tutSkip(); TABLET.toggle(true, 'store'); true"); await sleep(600);
ok(await J(`STO.view === "home"`), "after reload the store opens on Today");
// G. night + short landscape phone
await ev("GS.hour = 22; GS.apps.rescue = 1; true");
await send2(844, 390);
await ev(`SET.touch='on'; setTouchUI(); TABLET.go('store'); STO.view='detail'; STO.sel='freight'; TABLET.render(); true`); await sleep(800);
const land = await J(`(() => { const v = document.querySelector("#tabV"), r = v.getBoundingClientRect(); return { hs: v.scrollWidth <= v.clientWidth + 1, vh: Math.round(r.height), sh: v.scrollHeight, bad: [...v.querySelectorAll(".stdet *")].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.left < r.left - 1); }).length }; })()`);
console.log("landscape phone detail:", JSON.stringify(land));
ok(land.hs && land.bad === 0, "landscape phone: detail no overflow");
await shot("g7b_phone_landscape_detail");
await ev(`STO.view='home'; TABLET.render(); true`); await sleep(500);
await shot("g7b_phone_landscape_home");
ok(errors.length === 0, "no page errors " + errors.join(" | "));
await done(fails ? 1 : 0);
async function send2(w, h) { const { send } = await import("../lib.mjs"); await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: true }); await ev(`dispatchEvent(new Event("resize")); true`); await sleep(800); }
