// Beta 11.2 wheel, second try at breaking it: riding the sled (R is also the gear key), the wheel opened while driving,
// held keys, crash, tablet, the sled's own 1-5 keys, a corrupt-ish part list, mid-wheel reload.
import { boot, ev, tap, down, up, sleep, done, shot, reload, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function until(expr, secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) { if (await ev(expr)) return true; await sleep(80); } return !!(await ev(expr)); }
const W = () => J(`({ open: TLXWHEEL.W.open, stage: TLXWHEEL.W.stage, hidden: $("gnWheel").hidden })`);
const S = () => J(`({ gear: GB.gear, dir: GB.dir, v: Math.hypot(P.vx, P.vz), thr: input.thr, brk: input.brk, foot: FOOT.on, crash: CRASH.on, tab: !!TABLET.open, settings: !$("settings").hidden, garage: GS.garageOpen, pg: (P.x|0)+","+(P.z|0) })`);
await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 36; WILD.max = 0; GS.cash = 9000; TLXGUN.takeCourse(); TLXGUN.buyRifle("bolt308"); for (const p of ["barrel:carb18","barrel:heavy24","magazine:det10"]) TLXGUN.buyPart(...p.split(":")); TLXGUN.buyAmmo(); true`);
await sleep(400);
// ride on open ground
await ev(`(() => { FOOT.on = false; VEH.cur = null; camState.init = false; P.x = -767; P.z = -1278; P.vx = P.vz = 0; GB.gear = 1; GB.dir = 1; return true; })()`); await sleep(600);
console.log("riding", JSON.stringify(await S()));
// 1. hold W, get to speed, then HOLD R
await down("KeyW"); await sleep(3000);
const s1 = await S(); console.log("cruising", JSON.stringify(s1));
await down("KeyR"); await until("TLXWHEEL.W.open", 4); const sOpen = await S(); await up("KeyR"); await sleep(300);
let w = await W(); console.log("wheel", JSON.stringify(w), "state", JSON.stringify(sOpen));
ok(w.open, "1: hold R while riding opens the wheel");
ok(sOpen.gear === s1.gear && sOpen.dir === s1.dir, `1: holding R did not shift gear (${s1.gear}/${s1.dir} -> ${sOpen.gear}/${sOpen.dir})`);
await shot("wheel_riding");
// 2. W still held: does the sled keep going / does the wheel's 1-5 also hit the sled?
await sleep(1500); const s2 = await S(); console.log("wheel open, W held", JSON.stringify(s2));
ok(s2.v > 3, `2: sled still moves with the wheel open and W held (${s2.v.toFixed(1)} m/s) -- note: driving blind under a wheel`);
await tap("Digit3"); await sleep(250); w = await W(); ok(w.stage === "part", "2: 3 picks the grip slot (no hotkey side effects)");
const sA = await S();
await tap("Escape"); await sleep(300); const sB = await S(); w = await W();
ok(!w.open && !sB.settings && !sB.garage, "2: Esc closed wheel only");
// 3. tap R while riding still does its old job (back to forward)
await up("KeyW"); await sleep(2500);
// 4. crash with the wheel open
await down("KeyR"); await until("TLXWHEEL.W.open", 4); await up("KeyR"); await sleep(200);
await ev(`crashEject('test', 0, 1, 15, null); true`); await sleep(800);
w = await W(); const sc = await S(); console.log("crash with wheel", JSON.stringify(w), JSON.stringify(sc));
ok(!w.open && !w.hidden === false, "4: a crash closes the wheel");
// try to open during crash
await down("KeyR"); await sleep(700); await up("KeyR"); w = await W(); ok(!w.open, "4: wheel won't open while crashed/down");
await ev(`crashCancel(); true`); await sleep(500);
// 5. tablet opened while wheel is open
await ev(`FOOT.on = false; true`);
await down("KeyR"); await until("TLXWHEEL.W.open", 4); await up("KeyR"); await sleep(200);
await tap("Tab"); await sleep(400); await tap("KeyT"); await sleep(400);
const sT = await S(); w = await W(); console.log("tablet w/ wheel", JSON.stringify(sT), JSON.stringify(w));
ok(!(sT.tab && w.open), `5: wheel and tablet never up together (tab ${sT.tab}, wheel ${w.open})`);
await ev(`TABLET.toggle(false); TLXWHEEL.close(); true`); await sleep(300);
// 6. reload with the wheel open: comes back shut
await down("KeyR"); await until("TLXWHEEL.W.open", 4); await up("KeyR"); await sleep(200);
const planted = await J(`(() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })()`);
await reload(planted); await sleep(1500);
for (let i = 0; i < 60; i++) { try { if (await ev(`typeof TLXWHEEL !== "undefined" && started`)) break; } catch (e) {} await sleep(200); }
w = await W(); ok(!w.open && w.hidden, "6: after a reload the wheel is shut");
// 7. on foot, hold R, then walk with WASD while the wheel's open
await ev(`tutSkip(); crashCancel(); FOOT.on = true; true`); await sleep(500);
await down("KeyR"); await until("TLXWHEEL.W.open", 4); await up("KeyR"); await sleep(200);
const p0 = await J(`({x:FOOT.x,z:FOOT.z})`); await down("KeyW"); await sleep(1500); await up("KeyW");
const p1 = await J(`({x:FOOT.x,z:FOOT.z})`); console.log("walk under wheel moved", Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2), "m");
await shot("wheel_foot_walk");
await tap("Escape"); await sleep(200);
console.log("errors via done");
await done(fails ? 1 : 0);
