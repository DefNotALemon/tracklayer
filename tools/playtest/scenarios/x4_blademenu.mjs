// 4.1b1 beta fix (0223 #1 BUG, #2): the plow blade's control rests while a menu or the tablet is up.
// Under Settings, the garage, the god panel or the tablet, a tap of the use control neither drops nor lifts the
// blade, a hold does not slew it, the horn stays silent, and a menu that comes up over a press still held cancels
// that press. Asserted on the keyboard (E), two pads (L3) and the touch pill. Exit 1 on any FAIL.
import { boot, ev, send, tap, sleep, done, down, up, padSet, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
const PADS = { xbox: "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)", ps: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)" };

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const QU = JSON.stringify(await ev(`TLXV.state().owned[0].uid`));
await ev(`TLXPL.fit(${QU}, "b23"); TLXV.swapTo(${QU}); FOOT.on = false; true`); await sleep(800);
await ev(`(() => { const h0 = horn; window.__horn = 0; horn = function () { window.__horn++; return h0.apply(this, arguments); }; return true; })()`);
const U = () => J(`(() => { const b = TLXPL.rt(${QU}); return { down: b.down, th: TLXPL.throwOf(${QU}), held: !!b.hold, horn: window.__horn, foot: FOOT.on, pill: $("tcE").hidden ? null : $("tcE").textContent }; })()`);
const set = (dn, th) => ev(`(() => { const b = TLXPL.rt(${QU}); b.down = ${dn}; b.hold = null; TLX.state("plow").blades[${QU}].throw = "${th}"; return true; })()`);
await park(); await sleep(500);                                                   // off the garage forecourt: there the touch pill reads GARAGE
ok(await ev(`!!VEH.cur && !FOOT.on && GS.near !== garageSite`), "seated in the bladed pickup, away from the garage");

// the ways to press the control
const kb = { name: "E", press: () => down("KeyE"), release: () => up("KeyE") };
const pad = k => ({ name: k + " L3", press: () => padSet({ 10: 1 }, [0, 0, 0, 0], PADS[k]), release: () => padSet({}, [0, 0, 0, 0], PADS[k]) });
const pill = { name: "the touch pill", press: () => ev(`$("tcE").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`),
  release: () => ev(`$("tcE").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`) };
const tapIt = async c => { await c.press(); await sleep(160); await c.release(); await waitGame(0.5); };
const holdIt = async c => { await c.press(); await sleep(950); const s = await U(); await c.release(); await waitGame(0.5); return s; };

// 0 the control works with nothing up (so the rest proves something)
let s;
await set(false, "r"); await tapIt(kb); s = await U(); ok(s.down, "nothing up: E drops the blade");
s = await holdIt(kb); ok(s.th === "l" && s.down, "nothing up: E held slews it (r -> " + s.th + ")");
await tapIt(kb); s = await U(); ok(!s.down, "nothing up: E tapped lifts it");

// the menus: [name, open, close]
const MENUS = [
  ["Settings", `$("settings").hidden = false`, `$("settings").hidden = true`],
  ["the tablet (Map)", `TABLET.toggle(true, "map")`, `TABLET.toggle(false)`],
  ["the garage", `GS.garageOpen = true`, `GS.garageOpen = false`],
  ["the god panel", `$("god").hidden = false`, `$("god").hidden = true`],
];
async function under(name, open, close, ctrls) {
  for (const c of ctrls) {
    // blade down, throw right: a hold must not slew, a tap must not lift
    await set(true, "r"); await ev(open + "; true"); await sleep(250);
    const h0 = (await U()).horn;
    const mid = await holdIt(c); s = await U();
    ok(mid.th === "r" && s.th === "r" && s.down && !s.held, `${name}: ${c.name} held does not slew the blade (${mid.th}, down ${s.down})`);
    await tapIt(c); s = await U();
    ok(s.down && s.th === "r" && !s.held, `${name}: ${c.name} tapped does not lift it`);
    // blade up: a tap must not drop it
    await set(false, "r"); await tapIt(c); s = await U();
    ok(!s.down, `${name}: ${c.name} tapped does not drop it`);
    ok(s.horn === h0, `${name}: ${c.name} sounds no horn in a bladed truck (${s.horn - h0})`);
    ok(!s.foot, `${name}: still seated`);
    await ev(close + "; true"); await sleep(250);
  }
}
for (const [name, open, close] of MENUS) await under(name, open, close, [kb, pad("xbox"), pad("ps")]);

// a menu coming up over a press that is still held: the press is dropped (no slew at half a second, no lift on release)
for (const [name, open, close] of MENUS.slice(0, 2)) {
  await set(true, "r");
  await down("KeyE"); await sleep(180); s = await U(); ok(s.held, `${name} over a held press: the press was pending`);
  await ev(open + "; true"); await sleep(900); const mid = await U(); await up("KeyE"); await waitGame(0.5); s = await U();
  ok(mid.th === "r" && !mid.held && s.th === "r" && s.down, `${name} over a held press: it neither slews nor lifts (${s.th}, down ${s.down})`);
  await ev(close + "; true"); await sleep(250);
  // closing the menu with the key long released: nothing fires late, and the control works again
  await waitGame(0.8); s = await U(); ok(s.down && s.th === "r", `${name} closed: nothing fires late`);
  s = await holdIt(kb); ok(s.th === "l", `${name} closed: a hold slews again (${s.th})`);
  await tapIt(kb); s = await U(); ok(!s.down, `${name} closed: a tap lifts again`);
}

// touch: the pill under Settings (a tap that got through the overlay must still do nothing); with the tablet up it has no label
await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(200);
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(600);
await set(false, "r"); await tapIt(pill); s = await U(); ok(s.down && s.pill === "BLADE UP", "touch, nothing up: the pill drops it (" + s.pill + ")");
await under("Settings", MENUS[0][1], MENUS[0][2], [pill]);
await under("the tablet (Map)", MENUS[1][1], MENUS[1][2], [pill]);
await set(true, "r"); s = await holdIt(pill); ok(s.th === "l" && s.down, "touch, menus shut: the pill held slews again (" + s.th + ")");
await ev(`SET.touch = "auto"; setTouchUI(); true`); await send("Emulation.setTouchEmulationEnabled", { enabled: false });

console.log(fails ? `FAILED: ${fails}` : "ALL PASSED");
await done(fails ? 1 : 0);
