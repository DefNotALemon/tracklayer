// Beta break test for slice 2.1b (the on-foot "use" action on kbm / pad / touch): out-of-order and edge cases. Exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, padSet, padOff, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const S = async () => JSON.parse(await ev(`JSON.stringify({ foot: FOOT.on, dig: !!FOOT.dig, bog: BOG.on, use: footUse(), dev: INP.dev, hint: $("wnHint").textContent,
  tE: $("tcUse").hidden ? null : $("tcUse").textContent, tcShown: !$("tcUse").hidden, d: +Math.hypot(FOOT.x - P.x, FOOT.z - P.z).toFixed(2), dead: !!GS.dead, mnt: !!MNT.on, err: 0 })`));
const L3 = async (id) => { await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(350); await padSet({}, [0, 0, 0, 0], id); await sleep(400); };
await boot();
await ev(`tutSkip(); true`); await sleep(500);
await ev(`crashCancel(); FOOT.on = false; true`);
await park(); await sleep(1200);
// A: riding, bogged: L3 and E must not dig, touch button hidden
await ev(`BOG.on = true; BOG.dig = 0; true`); await sleep(300);
let s = await S(); ok(!s.foot && s.use === null, "A riding+bogged: footUse null");
await L3(); s = await S(); ok(!s.dig, "A riding: pad L3 does not start a dig");
await tap("KeyE"); await sleep(300); s = await S(); ok(!s.dig, "A riding: E does not start a dig");
// B: get off, dig, walk away mid-dig
await tap("KeyQ"); for (let i = 0; i < 30 && !(await S()).foot; i++) await sleep(300);
for (let i = 0; i < 30 && await ev(`!!DMT.on`); i++) await sleep(300); await sleep(500); s = await S(); ok(s.foot, "B on foot"); console.log("B", JSON.stringify(s));
await tap("KeyE"); await sleep(400); s = await S(); if (!s.dig) { console.log("B retry", await ev(`JSON.stringify({dmt:!!DMT.on,mnt:!!MNT.on,tablet:typeof TABLET!=="undefined"&&!!TABLET.open,toast:document.getElementById("toast")&&document.getElementById("toast").textContent})`)); await tap("KeyE"); await sleep(400); s = await S(); } ok(s.dig, "B digging");
await ev(`FOOT.x += 6; true`); await sleep(500); s = await S(); console.log("B far", JSON.stringify(s));
ok(s.use === null, "B 6 m away mid-dig: footUse null");
ok(!s.dig, "B 6 m away mid-dig: dig stops by itself (got dig=" + s.dig + ")");
await tap("KeyE"); await sleep(300); s = await S(); ok(!s.dig, "B E while far does not (re)start dig");
await ev(`FOOT.x -= 6; true`); await sleep(400);
// C: mash E 20x quickly: end state consistent with parity
await ev(`FOOT.dig = false; true`);
for (let i = 0; i < 20; i++) { await tap("KeyE", 25); await sleep(30); }
await sleep(400); s = await S(); ok(typeof s.dig === "boolean" && s.bog, "C mash E x20: still bogged, state sane (dig=" + s.dig + ")");
// D: freed while digging: dig flag must clear and button hide
await ev(`FOOT.dig = true; BOG.on = false; true`); await sleep(500); s = await S(); console.log("D", JSON.stringify(s));
ok(s.use === null, "D freed: use null");
await ev(`BOG.on = true; true`); await sleep(400); s = await S();
ok(!s.dig, "D bog again later: dig is not still on from last time (dig=" + s.dig + ")");
await ev(`BOG.on = false; FOOT.dig = false; true`);
// E: dead / garage open => null
await ev(`BOG.on = true; GS.dead = true; true`); await sleep(300); s = await S(); ok(s.use === null, "E dead: use null");
await ev(`GS.dead = false; GS.garageOpen = true; true`); await sleep(300); s = await S(); ok(s.use === null, "E garage open: use null");
await L3(); s = await S(); ok(!s.dig, "E garage open: pad L3 does not dig");
await ev(`GS.garageOpen = false; true`);
// F: tablet open: E / L3 shouldn't dig behind the tablet
await ev(`TABLET.toggle(true, "map"); true`); await sleep(500);
await tap("KeyE"); await sleep(300); s = await S(); console.log("F tablet", JSON.stringify(s));
ok(!s.dig, "F tablet open: E does not dig behind it (dig=" + s.dig + ")");
await ev(`TABLET.toggle(false); true`); await sleep(300);
// G: device flip mid-dig updates hint + button at once
await ev(`FOOT.dig = true; true`); await sleep(300);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(500); s = await S();
ok(s.tE === "STOP" && /tap STOP/.test(s.hint), "G touch while digging: button STOP, hint tap STOP (" + s.tE + " | " + s.hint + ")");
await ev(`INP.dev = "kbm"; true`); await tap("KeyH"); await sleep(500); s = await S(); console.log("G kbm", JSON.stringify(s));
ok(/E: stop/.test(s.hint), "G back to kbm mid-dig: hint reads E: stop (" + s.hint + ")");
await ev(`INP.dev = "touch"; true`); await sleep(300);
// H: touch button while mounting / riding hides
await ev(`FOOT.dig = false; BOG.on = false; true`); await tap("KeyQ"); await sleep(300);
for (let i = 0; i < 30 && (await S()).foot; i++) await sleep(300);
await sleep(600); s = await S(); ok(!s.foot && s.tE === null, "H riding on touch: use button hidden (" + s.tE + ")");
// I: reload mid-dig
await ev(`crashCancel(); FOOT.on = false; true`); await park(); await sleep(800);
await tap("KeyQ"); for (let i = 0; i < 30 && !(await S()).foot; i++) await sleep(300); await sleep(800);
await ev(`BOG.on = true; BOG.dig = 0; true`); await sleep(300); await tap("KeyE"); await sleep(300);
s = await S(); console.log("I before", JSON.stringify(s));
await reload(); await sleep(1500);
await ev(`tutSkip(); true`); await sleep(500); s = await S(); console.log("I after reload", JSON.stringify(s));
ok(!s.dig, "I after reload: not digging with nothing bogged"); ok(s.use === null || typeof s.use === "string", "I after reload: footUse fine");
await shot("x2_usebreak_end");
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
