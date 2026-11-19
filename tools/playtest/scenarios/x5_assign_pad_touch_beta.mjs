// Beta: 5.4a2 ASSIGN THE ... button on the Staff card with pad (d-pad reach + A) and touch (tap) at 1280x720 and 640x360; two trucks
import { boot, ev, sleep, done, padSet } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const app = async id => { await ev(`TABLET.toggle(true, ${JSON.stringify(id)}); TABLET.render(); true`); await sleep(450); };
const btns = () => J(`[...$("tabS").querySelectorAll("[data-act^='stx:']")].map(b => ({ f: b.dataset.tf, t: b.textContent, off: b.disabled, w: b.offsetWidth, pw: b.closest(".tapp,#tabS").offsetWidth }))`);
const pad = async (n) => { await padSet({ [n]: 1 }); await sleep(160); await padSet({}); await sleep(350); };
const SETUP = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLX.monday = () => { }; TLX.setOn("police", false); TLX.setOn("traffic", false); if (window.TLXT) { TLXT.hold = true; for (const c of TLXT.cars) c.on = false; } true`;
await boot();
await ev(SETUP); await sleep(600);
await ev(`GS.hour = 34; TLX.state("roads").h = 34; GS.cash = 90000; GS.lic = GS.lic || {}; GS.lic.freight = true; TLXV.buy("plowtruck"); TLXV.buy("plowtruck"); true`); await sleep(700);
const trucks = await J(`TLXV.state().owned.filter(r => r.id === "plowtruck").map(r => r.uid)`);
const rid = JSON.stringify(await J(`TLXPL.con.routes()[0].id`));
await ev(`TLXPL.PDR.mine = 1; TLXPL.con.sign(${rid}); TLX.staff.tick(); true`); await sleep(300);
const DID = (await J(`TLX.state("staff").apps`))[0].id;
await ev(`TLX.staff.hire(${DID}); true`);
const truck = () => J(`(TLX.state("plow").pdr[${rid}] || {}).truck || null`);
ok((await truck()) === null, "no truck assigned at start");
await app("staff");
let b = await btns(); console.log(JSON.stringify(b));
ok(b.length >= 2 && b.every(x => /^ASSIGN THE/.test(x.t)), "two ASSIGN buttons on the card: " + b.map(x => x.t).join(" / "));
ok(new Set(b.map(x => x.t)).size === b.length, "labels tell the two trucks apart");

// pad: reach the button with d-pad only from the default focus, then A
await ev(`TABLET.focus = null; TABLET.paintFocus && TABLET.paintFocus(false); true`);
let reached = false, steps = 0;
for (const dir of [13, 15, 15, 15, 15, 15, 15, 15]) {
  await pad(dir); steps++;
  const f = await ev(`TABLET.focus`);
  if (f && f === b[0].f) { reached = true; break; }
}
console.log("  focus after", steps, "d-pad downs:", await ev(`TABLET.focus`));
ok(reached, "d-pad down alone reaches the first ASSIGN button (" + steps + " presses)");
if (!reached) await ev(`TABLET.focus = ${JSON.stringify(b[0].f)}; TABLET.paintFocus(false); true`);
await pad(0);
let t = await truck();
ok(t === trucks[0], "pad A on the focused ASSIGN assigns truck 1 (got " + t + ")");
await app("staff"); b = await btns(); console.log(JSON.stringify(b));
const txt = await ev(`$("tabS").textContent.replace(/\\s+/g," ")`);
ok(!/undefined|NaN/.test(txt), "card clean after assign");
console.log("  card:", txt.slice(0, 400));
// touch: a click on the other truck's button (touch UI on)
await ev(`SET.touch = "on"; setTouchUI(); TLX.staff.xact(${DID}, "u"); true`); await app("staff"); b = await btns();
ok((await truck()) === null && b.length === 2, "TAKE THE TRUCK BACK frees it, both ASSIGN buttons return");
const other = b.find(x => /ASSIGN/.test(x.t));
if (other) {
  await ev(`(() => { const e = $("tabS").querySelector("[data-tf='${other.f}']"); e.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" })); e.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" })); e.click(); return true; })()`);
  await sleep(400);
  t = await truck();
  ok(t === trucks[1] || t === trucks[0], "touch tap on ASSIGN runs (truck now " + t + ")");
  ok(t === trucks[0], "touch tap on the first ASSIGN gives truck 1 (got " + t + ")");
}
// narrow viewport row bounds
await ev(`(() => { window.__tlr = 1; return true; })()`);
for (const [w, h] of [[640, 360], [390, 844]]) {
  await (await import("../lib.mjs")).send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: true });
  await sleep(600); await app("staff");
  const r = await J(`[...$("tabS").querySelectorAll("[data-act^='stx:']")].map(b => ({ w: b.offsetWidth, h: b.offsetHeight, right: b.getBoundingClientRect().right, pr: $("tabS").getBoundingClientRect().right, sw: $("tabS").scrollWidth, cw: $("tabS").clientWidth }))`);
  console.log("  " + w + "x" + h, JSON.stringify(r));
  ok(r.length > 0 && r.every(x => x.w >= 80 && x.sw <= x.cw + 2), w + "x" + h + ": buttons readable, pane doesn't scroll sideways");
}
console.log(fails ? `x5_assign_pad_touch_beta: ${fails} FAILED` : "x5_assign_pad_touch_beta: all ok");
await done(fails ? 1 : 0);
