// Slice 3.3b (G4): dig a buried car out by hand for pay (option "digcars"). Asserts, exit 1 on a failure.
//  A. on foot beside a buried car the use control offers "dig out <owner>'s car" (footUse DIG, hint through keyHint);
//     a clear car or one out of reach offers nothing.
//  B. keyboard E starts digging (FOOT.dig, crouched), the snow falls, E again stops with the car part dug; Xbox,
//     DualSense and Switch pads (stick click) and the touch button (DIG / STOP) do the same, each hint naming its control.
//  C. digging it clear takes the planned game time by its snow (20-40 s), pays $40-90 by the snow, the owner's name
//     is in the toast; the car's paid for this storm (no prompt if more snow falls before it eases), and pays again
//     once it has.
//  D. walking off stops it; the owner finishing first (their wait ran out) pays nothing; the option off = no prompt,
//     no dig, no pay.
//  E. saved: a part-dug car keeps its starting snow over a reload (same pay offered); the option's off-state saves.
import { boot, ev, tap, sleep, done, padSet, padOff, shot, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
const toasts = () => J(`(TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))`);
const S = () => J(`({ foot: FOOT.on, dig: !!FOOT.dig, use: footUse(), hint: $("wnHint").textContent, tE: $("tcUse").hidden ? null : $("tcUse").textContent, cd: TLXC.dig, cash: GS.cash })`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; TLXC.cars.forEach(c => { c.wait = 999; }); true`); await sleep(600);
await tap("KeyQ"); for (let i = 0; i < 40 && !(await ev("FOOT.on && !DMT.on")); i++) await sleep(200);
ok(await ev("FOOT.on"), "setup: on foot");
// two cars in town with room beside them
const picks = await J(`(() => { const out = []; const cars = TLXC.cars.slice().sort((a, b) => Math.hypot(a.x - depot.x, a.z - depot.z) - Math.hypot(b.x - depot.x, b.z - depot.z));
  const fx = FOOT.x, fz = FOOT.z, shop = (x, z) => { FOOT.x = x; FOOT.z = z; const l = FISH.ctxLabel(); FOOT.x = fx; FOOT.z = fz; return l; };
  for (const c of cars) for (const s of [1, -1]) { const rx = Math.cos(c.yaw) * s, rz = -Math.sin(c.yaw) * s, x = c.x + rx * 2.4, z = c.z + rz * 2.4;
    if (obstaclesNear(x, z, 3).some(o => o.top > -1e8 && Math.hypot(o.x - x, o.z - z) < o.r + 0.45)) continue; if (out.some(p => p.i === c.i)) continue;
    const sh = shop(x, z); if (sh) { if (!out.shop) out.shop = { i: c.i, x, z, sh }; continue; }
    out.push({ i: c.i, x, z, owner: c.owner }); break; }
  return { cars: out.slice(0, 3), shop: out.shop || null }; })()`);
console.log("cars:", JSON.stringify(picks));
ok(picks.cars.length >= 3, "setup: three town cars with room beside them");
const [A, B, Cc] = picks.cars;
const stand = p => ev(`(() => { FOOT.x = ${p.x}; FOOT.z = ${p.z}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = FOOT.fwd = FOOT.turn = 0; FOOT.dig = false; BOG.on = false; return true; })()`);
if (picks.shop) {   // a car parked by the tackle shop / fish buyer: their E wins, and the prompt says so (no DIG that E won't do)
  await stand(picks.shop); await ev(`TLXC.setSnow(${picks.shop.i}, 0.6); true`); await sleep(400);
  const s0 = await S(); ok(s0.use !== "DIG" && !/dig out/.test(s0.hint), "A: by the fish shop/buyer (" + picks.shop.sh + ") the shop keeps E: " + s0.hint);
  await ev(`TLXC.setSnow(${picks.shop.i}, 0); true`);
}

// ---- A
await stand(A); await ev(`TLXC.setSnow(null, 0); true`); await sleep(400);
let s = await S(); ok(s.use === null, "A: beside a clear car: nothing to use (" + s.use + ")");
await ev(`TLXC.setSnow(${A.i}, 0.6); true`); await sleep(400);
s = await S(); console.log("A:", JSON.stringify(s));
ok(s.use === "DIG", "A: beside a buried car: use is DIG");
ok(s.hint.includes("E: dig out " + A.owner) && /\$59/.test(s.hint), "A: hint names E, the owner and the pay: " + s.hint);
await ev(`FOOT.x += 30; true`); await sleep(400); s = await S(); ok(s.use === null, "A: 30 m off: nothing");
await stand(A); await sleep(300);

// ---- B: keyboard
await tap("KeyE"); await sleep(400); s = await S();
ok(s.dig && s.use === "STOP" && s.cd === A.i, "B: keyboard E starts digging");
ok(/E: stop/.test(s.hint) && /Digging out/.test(s.hint), "B: hint while digging: " + s.hint);
const b0 = await ev(`TLXC.cars[${A.i}].b`); await waitGame(5); const b1 = await ev(`TLXC.cars[${A.i}].b`);
ok(b1 < b0 - 0.05, `B: snow falls as you dig (${b0.toFixed(3)} -> ${b1.toFixed(3)} in 5 s)`);
const crouch = await ev("FOOT.crouch"); ok(crouch > 0.5, "B: crouched while digging (" + crouch.toFixed(2) + ")");
await tap("KeyE"); await sleep(300); s = await S(); const b2 = await ev(`TLXC.cars[${A.i}].b`);
ok(!s.dig && s.use === "DIG" && s.cd === -1, "B: E again stops; the part-dug car still offers DIG");
ok(/\$59/.test(s.hint), "B: the pay offered stays by the snow you started on: " + s.hint);
await waitGame(1.5); ok(Math.abs((await ev(`TLXC.cars[${A.i}].b`)) - b2) < 0.002, "B: stopped means stopped");
// pads
for (const [nm, id, lab] of [["xbox", undefined, "L3"], ["ps", "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", "L3"], ["nin", "Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)", "Left stick click"]]) {
  await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(350); await padSet({}, [0, 0, 0, 0], id); await sleep(450);
  s = await S(); console.log("hint " + nm + ":", s.hint);
  ok(s.dig && s.cd === A.i, nm + " pad: stick click starts digging"); ok(s.hint.includes(lab + ": stop"), nm + " hint names " + lab);
  await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(350); await padSet({}, [0, 0, 0, 0], id); await sleep(450);
  s = await S(); ok(!s.dig, nm + " pad: stick click stops"); ok(s.hint.includes(lab + ": dig out"), nm + " hint offers dig out");
}
await padOff();
// touch
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(600);
s = await S(); console.log("touch", JSON.stringify(s));
ok(s.tE === "DIG" && /tap DIG/.test(s.hint), "touch: the button reads DIG and the hint says tap DIG");
await shot("x3dc_touch");
const fire = `(() => { const b = $("tcUse"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`;
await ev(fire); await sleep(500); s = await S(); ok(s.dig && s.tE === "STOP", "touch: tapping it digs, and it reads STOP");
await ev(fire); await sleep(500); s = await S(); ok(!s.dig && s.tE === "DIG", "touch: tapping again stops");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(300);

// ---- C: dig car B clear from 0.6, timed
await stand(B); await ev(`TLXC.setSnow(${B.i}, 0.6); true`); await sleep(300);
const cash0 = await ev("GS.cash"), want = await ev(`TLXC.pay(0.6)`), wantT = await ev(`TLXC.digT(0.6)`);
await tap("KeyE"); const t0 = await clock(); await sleep(200);
ok((await S()).cd === B.i, "C: digging car B");
let tDone = 0;
for (let i = 0; i < 900; i++) { await sleep(100); const r = await J(`({ d: TLXC.dig, b: TLXC.cars[${B.i}].b, c: gameClock })`); if (r.d < 0) { tDone = r.c - t0; break; } if (i === 60) await shot("x3dc_digging"); }
const T = await toasts(), cash1 = await ev("GS.cash");
console.log("dug in", tDone.toFixed(1), "s game; planned", wantT.toFixed(1), "; paid", cash1 - cash0, "want", want);
ok(Math.abs(tDone - wantT) < 3, `C: dug clear in ${tDone.toFixed(1)} s game time (planned ${wantT.toFixed(1)})`);
ok(cash1 - cash0 === want && want >= 40 && want <= 90, `C: paid ${cash1 - cash0} (want ${want}, 40-90)`);
ok(T.some(t => t.includes(B.owner) && /Tusen takk/.test(t)), "C: the owner's name in the toast");
s = await S(); ok(!s.dig && s.use === null && (await ev(`TLXC.cars[${B.i}].b`)) === 0, "C: car clear, digging over, nothing to use");
ok(await ev(`TLXC.cars[${B.i}].paid`), "C: marked paid");
await ev(`WX.at = () => 1; TLXC.setSnow(${B.i}, 0.7); true`); await sleep(300);
s = await S(); ok(s.use === null, "C: snowed in again in the same storm: no second pay offered");
await ev(`WX.at = () => 0; GS.hour += 0.1; true`); await waitGame(0.5);
ok(!(await ev(`TLXC.cars[${B.i}].paid`)), "C: the storm eases: paid flag clears");
await ev(`TLXC.setSnow(${B.i}, 0.7); true`); await sleep(300); s = await S(); ok(s.use === "DIG", "C: next storm: DIG offered again");
// beside a full drift the pay and time are the top of the scale
ok((await ev("TLXC.pay(1)")) === 90 && (await ev("TLXC.digT(1)")) === 40 && (await ev("TLXC.pay(0.35)")) === 40 && (await ev("TLXC.digT(0.35)")) === 20, "C: scale: just buried $40 / 20 s, full drift $90 / 40 s");

// ---- D
await tap("KeyE"); await sleep(300); ok((await S()).cd === B.i, "D: digging B");
await ev(`FOOT.x += 6; true`); await sleep(500); s = await S(); ok(!s.dig && s.cd === -1, "D: walking off stops it");
await stand(B); await sleep(200);
const cashD = await ev("GS.cash");
await tap("KeyE"); await sleep(300);
await ev(`(() => { const c = TLXC.cars[${B.i}]; c.wt = c.wait - 0.01; GS.hour += 0.05; return true; })()`); await waitGame(0.6);
s = await S(); const TD = await toasts();
ok(!s.dig && s.cd === -1 && (await ev(`TLXC.cars[${B.i}].b`)) === 0, "D: the owner finished first: digging over, car clear");
ok(s.cash === cashD && TD.some(t => t.includes(B.owner) && /snowblower/.test(t)), "D: no pay, the owner's toast instead");
await stand(Cc); await ev(`TLXC.setSnow(${Cc.i}, 0.8); TLX.setOn("digcars", false); true`); await sleep(400);
const cashO = await ev("GS.cash");
s = await S(); ok(s.use === null && !/dig out/.test(s.hint), "D: option off: no prompt");
await tap("KeyE"); await sleep(400); await waitGame(2); s = await S();
ok(!s.dig && (await ev(`TLXC.cars[${Cc.i}].b`)) === 0.8 && s.cash === cashO, "D: option off: E digs nothing, pays nothing");
await ev(`TLX.setOn("digcars", true); true`); await sleep(300); ok((await S()).use === "DIG", "D: option back on: DIG");

// ---- E: save mid-dig
await tap("KeyE"); await waitGame(4); await tap("KeyE"); await sleep(300);
const pre = await J(`({ b: TLXC.cars[${Cc.i}].b, b0: TLXC.cars[${Cc.i}].b0 })`);
await ev(`TLX.setOn("digcars", false); save(); true`);
await reload(); await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(500);
const post = await J(`({ b: TLXC.cars[${Cc.i}].b, b0: TLXC.cars[${Cc.i}].b0, on: TLX.on("digcars") })`);
console.log("save:", JSON.stringify(pre), "->", JSON.stringify(post));
ok(Math.abs(post.b - pre.b) < 0.01 && Math.abs(post.b0 - pre.b0) < 0.01 && pre.b0 === 0.8, "E: part-dug car keeps its snow and starting snow over a reload");
ok(post.on === false, "E: the option's off-state saved");
await ev(`TLX.setOn("digcars", true); true`);
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
