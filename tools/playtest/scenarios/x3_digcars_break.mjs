// Beta 3.3b break attempts: mount mid-dig, hour skip mid-dig, reload mid-dig, walking away + back, stop/restart pay, tablet open, repeated E spam.
import { boot, ev, tap, sleep, done, shot, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
const S = () => J(`({ foot: FOOT.on, dig: !!FOOT.dig, use: footUse(), hint: $("wnHint").textContent, cd: TLXC.dig, cash: GS.cash, mnt: MNT.on, crouch: FOOT.crouch })`);
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; TLXC.cars.forEach(c => { c.wait = 999; }); true`); await sleep(600);
await tap("KeyQ"); for (let i = 0; i < 40 && !(await ev("FOOT.on && !DMT.on")); i++) await sleep(200);
const picks = await J(`(() => { const out = []; const cars = TLXC.cars.slice().sort((a, b) => Math.hypot(a.x - depot.x, a.z - depot.z) - Math.hypot(b.x - depot.x, b.z - depot.z));
  for (const c of cars) { const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), x = c.x + rx * 2.4, z = c.z + rz * 2.4;
    if (obstaclesNear(x, z, 3).some(o => o.top > -1e8 && Math.hypot(o.x - x, o.z - z) < o.r + 0.45)) continue; if (FISH.ctxLabel && (() => { const fx = FOOT.x, fz = FOOT.z; FOOT.x = x; FOOT.z = z; const l = FISH.ctxLabel(); FOOT.x = fx; FOOT.z = fz; return l; })()) continue; out.push({ i: c.i, x, z, owner: c.owner }); }
  return out.slice(0, 3); })()`);
ok(picks.length >= 3, "setup: 3 cars");
const [A, B, C3] = picks;
const stand = p => ev(`(() => { FOOT.x = ${p.x}; FOOT.z = ${p.z}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = FOOT.fwd = FOOT.turn = 0; FOOT.dig = false; BOG.on = false; return true; })()`);
const bOf = i => ev(`TLXC.cars[${i}].b`);
// 1 mount mid-dig
await stand(A); await ev(`TLXC.setSnow(${A.i}, 0.6); true`); await sleep(300);
await tap("KeyE"); await sleep(400); let s = await S(); ok(s.dig, "1: digging");
await ev(`FOOT.x = P.x + 0.5; FOOT.z = P.z + 1; true`);   // can't place; instead try Q where we are
await stand(A); await tap("KeyE"); await sleep(300); s = await S(); if (!s.dig) { await tap("KeyE"); await sleep(300); }
await tap("KeyQ"); await sleep(1500); s = await S();
console.log("after Q mid-dig:", JSON.stringify(s), "TLXC.dig", await ev("TLXC.dig"));
ok(!(s.dig && !s.foot), "1: no dig flag left on while not on foot (dig=" + s.dig + " foot=" + s.foot + ")");
await waitGame(3);
const b1 = await bOf(A.i); await sleep(500); const b2 = await bOf(A.i);
ok((await ev("TLXC.dig")) === -1 || s.foot, "1: C.dig reset after leaving foot (" + await ev("TLXC.dig") + ")");
// get back on foot if still riding
await ev(`crashCancel(); true`); if (!(await ev("FOOT.on"))) { await ev("FOOT.on = false; true"); await tap("KeyQ"); for (let i = 0; i < 40 && !(await ev("FOOT.on && !DMT.on")); i++) await sleep(200); }
// 2 hour skip mid-dig (sleep / skip to morning)
await stand(B); await ev(`TLXC.setSnow(${B.i}, 0.9); true`); await sleep(300);
await tap("KeyE"); await sleep(300); s = await S(); ok(s.dig, "2: digging B");
await ev(`GS.hour += 9; true`); await sleep(1200); s = await S();
console.log("after +9h:", JSON.stringify(s), "b", await bOf(B.i), "b0", await ev(`TLXC.cars[${B.i}].b0`));
const nan = await J(`TLXC.cars.some(c => !isFinite(c.b) || !isFinite(c.b0) || !isFinite(c.wt))`); ok(!nan, "2: no NaN car state after hour skip");
// 3 open the tablet while digging
await stand(C3); await ev(`TLXC.setSnow(${C3.i}, 0.7); true`); await sleep(300);
await tap("KeyE"); await sleep(300); await ev(`TABLET.toggle(true, "map"); true`); await sleep(1500); s = await S();
console.log("tablet open:", JSON.stringify(s)); const bt0 = await bOf(C3.i); await waitGame(3); const bt1 = await bOf(C3.i);
console.log("digging with tablet open:", bt0, "->", bt1);
await ev(`TABLET.toggle(false); true`); await sleep(400);
// 4 E spam
await stand(C3); await sleep(300); const cashE = await ev("GS.cash");
for (let i = 0; i < 12; i++) { await tap("KeyE"); await sleep(60); }
s = await S(); console.log("after 12 E taps:", JSON.stringify(s)); ok(s.cash === cashE, "4: E spam pays nothing");
// 5 stop/restart pay exploit: dig to near clear then lower b0 trick
await ev(`TLXC.setSnow(${C3.i}, 0.9); TLXC.cars[${C3.i}].b0 = 0; TLXC.cars[${C3.i}].paid = false; true`); await stand(C3); await sleep(300);
if ((await S()).dig) await tap("KeyE"); await sleep(300);
await tap("KeyE"); await waitGame(10); await tap("KeyE"); await sleep(300);
const bm = await bOf(C3.i); const b0m = await ev(`TLXC.cars[${C3.i}].b0`);
await ev(`TLXC.setSnow(${C3.i}, 0.4); true`); await sleep(200); // storm eases, b below b0, then dig again: pay by b0 still 0.9?
const pay = await ev(`TLXC.pay(Math.max(TLXC.cars[${C3.i}].b0, TLXC.cars[${C3.i}].b))`);
console.log("part-dug b", bm, "b0", b0m, "after b set .4 offered pay", pay);
await tap("KeyE"); await sleep(300); const cs = await ev("GS.cash"); await waitGame(25); const ce = await ev("GS.cash");
console.log("paid for a car that only had 0.4 left but b0 .9:", ce - cs);
// 6 reload mid-dig
await stand(A); await ev(`TLXC.setSnow(${A.i}, 0.8); TLXC.cars[${A.i}].paid = false; true`); await sleep(300);
await tap("KeyE"); await waitGame(3); await ev("save(); true");
await reload(); await sleep(800); s = await S(); console.log("after reload mid-dig:", JSON.stringify(s));
ok(!s.dig && (await ev("TLXC.dig")) === -1, "6: reload mid-dig leaves no stuck dig state");
await shot("x3dcb_end");
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
