// 4.1b1 beta 0225: tries to break the blade-rests-under-menus fix (tlx-plow v4) with the REAL ways a menu comes up:
// Escape key, toggleGod(true), garage via its own opener, GS.dead, and E released while a menu is up (stuck press?).
import { boot, ev, tap, sleep, done, down, up, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const QU = JSON.stringify(await ev(`TLXV.state().owned[0].uid`));
await ev(`TLXPL.fit(${QU}, "b23"); TLXV.swapTo(${QU}); FOOT.on = false; true`); await sleep(800);
await park(); await sleep(500);
const U = () => J(`(() => { const b = TLXPL.rt(${QU}); return { down: b.down, th: TLXPL.throwOf(${QU}), held: !!b.hold, foot: FOOT.on, set: !$("settings").hidden, god: !$("god").hidden, gar: !!GS.garageOpen, dead: !!GS.dead }; })()`);
const set = (dn, th) => ev(`(() => { const b = TLXPL.rt(${QU}); b.down = ${dn}; b.hold = null; TLX.state("plow").blades[${QU}].throw = "${th}"; return true; })()`);
let s;
// A: real Escape opens Settings, E held through it
await set(true, "r");
await tap("Escape"); await sleep(400); s = await U(); ok(s.set, "A Escape opens Settings");
await down("KeyE"); await sleep(1000); await up("KeyE"); await waitGame(0.4); s = await U();
ok(s.th === "r" && s.down, `A hold under real Settings: blade untouched (${s.th}, down ${s.down})`);
await tap("Escape"); await sleep(400); s = await U(); ok(!s.set, "A Escape closes Settings");
// B: E pressed BEFORE the menu, menu opened by Escape key while held, released after close (stuck-press / late lift?)
await set(true, "r");
await down("KeyE"); await sleep(150); await tap("Escape"); await sleep(300); await tap("Escape"); await sleep(300);
await sleep(700); s = await U(); ok(s.th === "r" && s.down, `B menu opened+closed during a held press, key still down: no slew (${s.th}, down ${s.down})`);
await up("KeyE"); await waitGame(0.5); s = await U(); ok(s.down && s.th === "r", `B release after menu closed: no lift (down ${s.down})`);
// C: real god panel
await set(true, "r");
await ev(`toggleGod(true); true`); await sleep(300); s = await U(); ok(s.god, "C god panel up");
await down("KeyE"); await sleep(1000); await up("KeyE"); await waitGame(0.4); s = await U();
ok(s.th === "r" && s.down, `C hold under real god panel: untouched (${s.th}, ${s.down})`);
await ev(`toggleGod(false); true`); await sleep(300);
// D: real garage opener
const gopen = await ev(`typeof openGarage === "function"`);
if (gopen) {
  await set(true, "r"); await ev(`openGarage(); true`); await sleep(400); s = await U();
  ok(s.gar, "D garage up");
  await down("KeyE"); await sleep(1000); await up("KeyE"); await waitGame(0.4); s = await U();
  ok(s.th === "r" && s.down, `D hold under garage: untouched (${s.th}, ${s.down})`);
  await ev(`closeGarage(); true`); await sleep(300);
} else console.log("skip D (no openGarage)");
// E: dead card
await set(true, "r"); await ev(`GS.dead = true; true`); await sleep(200);
await down("KeyE"); await sleep(1000); await up("KeyE"); await sleep(600); s = await U();
ok(s.th === "r" && s.down, `E hold while dead: untouched (${s.th}, ${s.down})`);
await ev(`GS.dead = false; true`); await sleep(200);
// F: after all of it, blade works normally
await down("KeyE"); await sleep(1000); await up("KeyE"); await waitGame(0.4); s = await U();
ok(s.th === "l" && s.down, `F afterwards a hold slews again (${s.th})`);
await tap("KeyE"); await waitGame(0.5); s = await U(); ok(!s.down, "F afterwards a tap lifts");
console.log(fails ? `FAILED: ${fails}` : "ALL PASSED");
await done(fails ? 1 : 0);
