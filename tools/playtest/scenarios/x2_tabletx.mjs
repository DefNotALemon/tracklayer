// "Size it up" rests behind the tablet (builder v304 follow-up, lane A). On foot with the tablet open, X used to answer
// unseen under it: a "size it up" line nobody could read, and at a strap with a snatch block it changed the line to
// double or back. Asserts on keyboard, a pad and touch, exit 1 on a failure.
//   A bogged, on foot, tablet away: X sizes it up (a line with the pounds), the touch button reads SIZE UP.
//   B tablet up: X on the keyboard, X on a pad and the touch button say nothing; no label is offered.
//   C hooked to a tree with the expedition winch (snatch block), at the strap, tablet away: X doubles the line.
//   D tablet up at the strap: keyboard, pad and touch leave the line as it is; tablet away, X changes it again.
//   E Q is NOT rested: with the tablet up on foot beside the sled it still gets you on.
import { boot, ev, tap, sleep, done, park, padSet } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const S = () => J(`({ foot: FOOT.on, wn: WN.state, dbl: !!WN.dbl, bog: BOG.on, tab: TABLET.open, x: touchCtx().x, tc: $("tcX").hidden ? null : $("tcX").textContent })`);
const seen = () => J(`window.__ts`);
const clear = () => ev(`window.__ts = []; $("toasts").textContent = ""; if (typeof TOASTQ !== "undefined" && TOASTQ) TOASTQ.length = 0; window.__tsI = window.__tsI || setInterval(() => { for (const e of document.querySelectorAll("#toasts *")) if (!window.__ts.includes(e.textContent)) window.__ts.push(e.textContent); }, 60); true`);
const padX = async () => { await padSet({ 2: 1 }, [0, 0, 0, 0]); await sleep(300); await padSet({}, [0, 0, 0, 0]); await sleep(300); };
const touchX = async () => { await ev(`(() => { const b = $("tcX"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`); await sleep(300); };
const SIZED = /lb to drag out/;

await boot();
await ev(`tutSkip(); true`); await sleep(500);
await ev(`crashCancel(); FOOT.on = false; GS.own.parts.winch = "heavy"; restat(); true`);
await park(); await sleep(1200);
const found = JSON.parse(await ev(`(() => { for (const arr of obGrid.values()) for (const o of arr) { if (o.tree === undefined || o.log || o.down || o.top === -Infinity) continue; if (isSea(o.x, o.z) || isWater(o.x, o.z) || Math.hypot(o.x, o.z) < 300) continue; if (anchorsNear(o.x, o.z, 5).length !== 1) continue; return JSON.stringify({ x: o.x, z: o.z }); } return "null"; })()`));
ok(!!found, "found a tree anchor " + JSON.stringify(found));
if (!found) await done(1);
await ev(`P.x = ${found.x} + 6; P.z = ${found.z}; P.vx = 0; P.vz = 0; true`); await sleep(1500);
await tap("KeyQ"); for (let i = 0; i < 30 && !(await S()).foot; i++) await sleep(300);
for (let i = 0; i < 30 && await ev(`!!DMT.on`); i++) await sleep(300); await sleep(500);
await ev(`BOG.on = true; BOG.dig = 0; SET.touch = "on"; setTouchUI(); true`); await sleep(400);
let s = await S(); ok(s.foot && s.bog && !s.tab, "on foot beside a bogged sled, the tablet away " + JSON.stringify(s));

console.log("--- A tablet away");
await clear(); await tap("KeyX"); await sleep(400);
let t = await seen(); ok(t.some(m => SIZED.test(m)), "A X sizes it up: " + JSON.stringify(t));
s = await S(); ok(s.x === "SIZE UP" && s.tc === "SIZE UP", "A the touch button reads SIZE UP (" + s.x + " / " + s.tc + ")");

console.log("--- B tablet up");
await ev(`TABLET.toggle(true, "map"); true`); await sleep(600); await clear(); await sleep(200);
await tap("KeyX"); await sleep(400); t = await seen(); ok(!t.some(m => SIZED.test(m)) && t.length === 0, "B keyboard X says nothing behind the tablet: " + JSON.stringify(t));
await padX(); t = await seen(); ok(t.length === 0, "B a pad's X says nothing behind it: " + JSON.stringify(t));
await touchX(); t = await seen(); ok(t.length === 0, "B the touch button says nothing behind it: " + JSON.stringify(t));
s = await S(); ok(s.tab && s.x === "" && s.tc === null, "B no label is offered behind it (" + JSON.stringify(s.x) + " / " + s.tc + ")");
await ev(`TABLET.toggle(false); true`); await sleep(500); await clear(); await sleep(150);
await tap("KeyX"); await sleep(400); t = await seen(); ok(t.some(m => SIZED.test(m)), "B tablet away again: X sizes it up: " + JSON.stringify(t));

console.log("--- C at the strap, tablet away");
await ev(`(() => { const a = ${JSON.stringify(found)}; FOOT.x = a.x + 1.2; FOOT.z = a.z; WN.state = "out"; WN.snapT = 0; WN.dbl = false; return true; })()`); await sleep(500);
await tap("KeyE"); await sleep(500); s = await S();
ok(s.wn === "hooked" && !s.dbl, "C hooked to the tree, a single line (" + s.wn + ")");
ok(s.x === "DOUBLE", "C the touch button reads DOUBLE (" + s.x + ")");
await tap("KeyX"); await sleep(400); s = await S(); ok(s.dbl && s.x === "SINGLE", "C X doubles the line (dbl " + s.dbl + ", label " + s.x + ")");

console.log("--- D at the strap, tablet up");
await ev(`TABLET.toggle(true, "map"); true`); await sleep(600); await clear(); await sleep(150);
await tap("KeyX"); await sleep(400); s = await S(); ok(s.dbl, "D keyboard X leaves the line doubled behind the tablet");
await padX(); s = await S(); ok(s.dbl, "D a pad's X leaves it");
await touchX(); s = await S(); ok(s.dbl && s.wn === "hooked", "D the touch button leaves it (" + s.wn + ")");
t = await seen(); ok(t.length === 0 && s.x === "", "D nothing is said and no label is offered: " + JSON.stringify(t) + " / " + JSON.stringify(s.x));
await ev(`TABLET.toggle(false); true`); await sleep(500);
await padX(); s = await S(); ok(!s.dbl, "D tablet away: a pad's X puts it back to a single line");
await touchX(); s = await S(); ok(s.dbl, "D and the touch button doubles it again");

console.log("--- E Q still gets you on with the tablet up");
await ev(`(() => { wnStow(false); BOG.on = false; FOOT.x = P.x + 1.6; FOOT.z = P.z; TABLET.toggle(true, "map"); return true; })()`); await sleep(600);
s = await S(); ok(s.foot && s.tab, "E on foot beside the sled, the tablet up");
await tap("KeyQ"); for (let i = 0; i < 40 && (await S()).foot; i++) await sleep(300);
s = await S(); ok(!s.foot, "E Q gets you on with the tablet in hand");
await ev(`TABLET.toggle(false); SET.touch = "auto"; setTouchUI(); true`);
await done(fails ? 1 : 0);
