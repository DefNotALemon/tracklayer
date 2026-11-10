// Expansion slice 2.1b: the on-foot use action (E: dig, hook, help someone up) works on a pad (L3) and on touch (the
// orange button wears the verb), and the on-foot hint line names the right control. Asserts, exit 1 on a failure.
import { boot, ev, tap, sleep, done, park, padSet, padOff, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const S = async () => JSON.parse(await ev(`JSON.stringify({ foot: FOOT.on, dig: !!FOOT.dig, bog: BOG.on, use: footUse(), dev: INP.dev, hint: $("wnHint").textContent,
  tE: $("tcUse").hidden ? null : $("tcUse").textContent, d: +Math.hypot(FOOT.x - P.x, FOOT.z - P.z).toFixed(2) })`));
await boot();
await ev(`tutSkip(); true`); await sleep(500);
await ev(`crashCancel(); FOOT.on = false; true`);
console.log("parked", JSON.stringify(await park()));
await sleep(1200); await tap("KeyQ"); await sleep(2600);
let s = await S(); console.log("off", JSON.stringify(s));
ok(s.foot && s.use === null, "on foot beside a free sled: nothing to use");
await ev(`BOG.on = true; BOG.dig = 0; true`); await sleep(300);
s = await S(); console.log("bogged", JSON.stringify(s));
ok(s.use === "DIG", "bogged sled within reach: use is DIG");
// keyboard
await tap("KeyE"); await sleep(400); s = await S(); ok(s.dig && s.use === "STOP", "keyboard E starts digging"); console.log("hint kbm:", s.hint);
ok(/E: stop/.test(s.hint), "keyboard hint names E");
await tap("KeyE"); await sleep(300); s = await S(); ok(!s.dig, "keyboard E stops");
// pads
for (const [nm, id, lab] of [["xbox", undefined, "L3"], ["ps", "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", "L3"], ["nin", "Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)", "Left stick click"]]) {
  await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(350); await padSet({}, [0, 0, 0, 0], id); await sleep(450);
  s = await S(); console.log("hint " + nm + ":", s.hint);
  ok(s.dig, nm + " pad: stick click starts digging"); ok(s.hint.includes(lab + ": stop"), nm + " hint names " + lab);
  await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(350); await padSet({}, [0, 0, 0, 0], id); await sleep(450);
  s = await S(); ok(!s.dig, nm + " pad: stick click stops"); ok(s.hint.includes(lab + ": dig"), nm + " hint offers dig");
}
await padOff();
// touch
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(600);
s = await S(); console.log("touch", JSON.stringify(s));
ok(s.tE === "DIG", "touch: the orange button reads DIG"); ok(/tap DIG/.test(s.hint) && /tap GET ON/.test(s.hint), "touch hint says tap DIG and tap GET ON");
await shot("x2_use_touch");
const fire = `(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`;
await ev(fire); await sleep(500); s = await S(); ok(s.dig && s.tE === "STOP", "touch: tapping it digs, and it reads STOP");
await ev(fire); await sleep(500); s = await S(); ok(!s.dig && s.tE === "DIG", "touch: tapping again stops");
await ev(`BOG.on = false; true`); await sleep(400); s = await S(); ok(s.tE === null && s.use === null, "freed: the button goes away");
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
