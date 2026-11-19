// Beta test 2.2: board/leave a bought truck and the sled by pad (LB) and touch (GET ON / GET OFF pill), hint text per scheme.
import { boot, ev, sleep, done, errors, tap, padSet, padOff, raw } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);
await ev(`GS.cash = 30000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
const s0 = await J(`(() => { const s = TLX.state("vehicles"); return { n: s.owned.length, cur: s.cur, veh: !!VEH.cur }; })()`);
console.log("after buy", JSON.stringify(s0));
const state = () => J(`({ foot: FOOT.on, mnt: MNT.on, dmt: DMT.on, veh: VEH.cur ? VEH.cur.id || VEH.noun : null, cur: TLX.state("vehicles").cur, hint: (document.getElementById("wnHint") || {}).textContent, tcOn: !document.getElementById("tcOn").hidden, tcQ: !document.getElementById("tcQ").hidden, tcQt: document.getElementById("tcQ").textContent, tcOnt: document.getElementById("tcOn").textContent, nan: [P.x,P.z,P.y,camera.position.x,GS.fuel].some(v=>!isFinite(v)) })`);
const wait = async (f, ms = 7000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await J(f)) return true; await sleep(200); } return false; };
// pad
await padSet({}, [0, 0]); await sleep(300);
let a = await state(); console.log("start", JSON.stringify(a));
if (!a.foot) { await padSet({ 4: 1 }); await sleep(150); await padSet(); await wait(`!MNT.on && !DMT.on && FOOT.on`, 20000); }
a = await state(); ok(a.foot, "pad: LB leaves vehicle -> on foot " + JSON.stringify(a));
ok(/LB/.test(a.hint || ""), `pad: foot hint names LB: "${a.hint}"`);
await ev(`(() => { const o = (TLX.state("vehicles").owned||[]); const q = o.find(r => r.uid === TLX.state("vehicles").cur) || o[0]; return 1; })()`);
await padSet({ 4: 1 }); await sleep(150); await padSet();
await wait(`FOOT.on === false && !MNT.on`, 20000); await sleep(500);
let b = await state(); ok(!b.foot && !b.nan, "pad: LB boards again " + JSON.stringify(b));
// board the parked truck by pad
await padSet({ 4: 1 }); await sleep(150); await padSet(); await wait(`FOOT.on && !DMT.on`, 20000);
await ev(`(() => { const q = TLX.state("vehicles").owned[0]; crashCancel(); FOOT.on = true; FOOT.x = q.x + 3; FOOT.z = q.z; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(900);
a = await state(); console.log("by truck", JSON.stringify(a));
await padSet({ 4: 1 }); await sleep(150); await padSet(); await wait(`FOOT.on === false && !MNT.on`, 20000); await sleep(500);
a = await state(); ok(!a.foot && !!a.veh && !a.nan, "pad: LB boards the truck " + JSON.stringify(a));
await padSet({ 4: 1 }); await sleep(150); await padSet(); await wait(`FOOT.on && !DMT.on`, 20000); await sleep(500);
a = await state(); ok(a.foot, "pad: LB leaves the truck " + JSON.stringify(a));
// touch
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(500);
await raw(`document.getElementById("tcOn").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, pointerType: "touch" })); document.getElementById("tcOn").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, pointerType: "touch" })); true`);
await wait(`FOOT.on === false && !MNT.on`, 20000); await sleep(500);
b = await state(); console.log("touch riding", JSON.stringify(b));
ok(b.tcQ && /GET OFF/i.test(b.tcQt), `touch: riding shows GET OFF pill ("${b.tcQt}")`);
await raw(`document.getElementById("tcQ").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, pointerType: "touch" })); document.getElementById("tcQ").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, pointerType: "touch" })); true`);
await wait(`FOOT.on && !DMT.on`, 20000); await sleep(400);
b = await state(); ok(b.foot, "touch: GET OFF puts rider on foot " + JSON.stringify(b));
ok(b.tcOn && /GET ON/i.test(b.tcOnt), `touch: foot shows GET ON pill ("${b.tcOnt}")`);
ok(!/\bQ\b|\bLB\b/.test(b.hint || ""), `touch: hint has no key/pad name: "${b.hint}"`);
await raw(`document.getElementById("tcOn").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, pointerType: "touch" })); document.getElementById("tcOn").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, pointerType: "touch" })); true`);
await wait(`FOOT.on === false && !MNT.on`, 20000); await sleep(400);
b = await state(); ok(!b.foot && !b.nan, "touch: GET ON boards " + JSON.stringify(b));
// swap by garage to the other vehicle with pad open
await ev(`crashCancel(); true`);
console.log("page errors:", errors.length ? errors.join(" | ").slice(0, 600) : "none");
await done(fails ? 1 : 0);
