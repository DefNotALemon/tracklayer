// Beta 3.3b: dig a buried car under pad + touch prompts, option switched off mid-dig, owner beats you (snowblower), paid-once per storm, car sent away mid-dig.
import { boot, ev, tap, sleep, done, shot, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; TLXC.cars.forEach(c => { c.wait = 999; }); true`); await sleep(600);
await tap("KeyQ"); for (let i = 0; i < 40 && !(await ev("FOOT.on && !DMT.on")); i++) await sleep(200);
const picks = await J(`(() => { const out = []; const cars = TLXC.cars.slice().sort((a, b) => Math.hypot(a.x - depot.x, a.z - depot.z) - Math.hypot(b.x - depot.x, b.z - depot.z));
  for (const c of cars) { const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), x = c.x + rx * 2.4, z = c.z + rz * 2.4;
    if (obstaclesNear(x, z, 3).some(o => o.top > -1e8 && Math.hypot(o.x - x, o.z - z) < o.r + 0.45)) continue; out.push({ i: c.i, x, z }); }
  return out.slice(0, 3); })()`);
ok(picks.length >= 3, "setup: 3 cars");
const [A, B, C3] = picks;
const stand = p => ev(`(() => { FOOT.x = ${p.x}; FOOT.z = ${p.z}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = FOOT.fwd = FOOT.turn = 0; FOOT.dig = false; BOG.on = false; return true; })()`);
const S = () => J(`({ dig: !!FOOT.dig, cd: TLXC.dig, cash: GS.cash, hint: $("wnHint").textContent, use: footUse(), dev: INP.dev, b: TLXC.cars.map(c => c.b) })`);
// 1 pad: prompt names the pad button, pad press digs
await stand(A); await ev(`TLXC.setSnow(${A.i}, 0.7); TLXC.cars[${A.i}].paid = false; true`); await sleep(300);
await padSet({ 3: 1 }); await sleep(250); await padSet({}, [0.6, 0, 0, 0]); await sleep(250); await padSet(); await sleep(500);
let s = await S(); console.log("pad idle:", JSON.stringify({ hint: s.hint, use: s.use, dev: s.dev }));
ok(/DualSense|Xbox|L3|[A-Z]\b|stick/i.test(s.hint) && !/\bE\b:|press E/i.test(s.hint), "1: pad hint has no keyboard key: '" + s.hint + "'");
// 2 option off mid-dig
await tap("KeyE"); await sleep(300); s = await S(); ok(s.dig, "2: digging (key)"); const b0 = s.b[A.i];
const optOff = await ev(`(() => { try { TLX.setOn("digcars", false); } catch (e) { return "noset:" + e.message; } return TLX.on("digcars"); })()`);
console.log("option off ->", optOff); await waitGame(2); s = await S();
ok(!s.dig && s.cd === -1, "2: option off stops the dig (dig=" + s.dig + " cd=" + s.cd + ")");
const cashOff = s.cash; await tap("KeyE"); await sleep(300); s = await S(); ok(!s.dig, "2: E does nothing with option off");
await ev(`TLX.setOn("digcars", true); true`);
// 3 owner beats you: calm weather, wait expires while digging
await stand(B); await ev(`TLXC.setSnow(${B.i}, 0.8); TLXC.cars[${B.i}].paid = false; TLXC.cars[${B.i}].wait = 3; true`); await sleep(300);
await tap("KeyE"); await sleep(300); s = await S(); ok(s.dig, "3: digging B");
await ev(`TLXC.cars[${B.i}].wt = 0; true`);
const cash3 = (await S()).cash; await waitGame(1);
await ev(`TLXC.step(4); true`); await sleep(500); s = await S();
console.log("after beaten:", JSON.stringify({ dig: s.dig, cd: s.cd, b: s.b[B.i], cash: s.cash - cash3 }));
ok(!s.dig && s.cd === -1 && s.b[B.i] === 0, "3: beaten: dig cleared, car clear");
ok(s.cash === cash3, "3: no pay when beaten");
// 4 paid once: finish a car, storm again w/out calm, not diggable
await stand(C3); await ev(`TLXC.setSnow(${C3.i}, 0.5); TLXC.cars[${C3.i}].paid = false; TLXC.cars[${C3.i}].b0 = 0; true`); await sleep(300);
await tap("KeyE"); await sleep(300);
{ const t0 = await clock(); for (let i = 0; i < 400 && (await S()).dig && (await clock()) - t0 < 90; i++) await sleep(300); }
s = await S(); const cashDone = s.cash; ok(cashDone > cash3, "4: paid on finish (+" + (cashDone - cash3) + ")");
await ev(`TLXC.setSnow(${C3.i}, 0.9); true`); await sleep(300); s = await S();
console.log("re-buried same storm use:", JSON.stringify(s.use), "hint:", s.hint);
await tap("KeyE"); await sleep(300); s = await S(); ok(!s.dig, "4: no second pay in same storm");
// 5 car sent away mid-dig
await stand(A); await ev(`TLXC.setSnow(${A.i}, 0.9); TLXC.cars[${A.i}].paid = false; true`); await sleep(300);
await tap("KeyE"); await sleep(300); s = await S(); ok(s.dig, "5: digging A");
await ev(`TLXC.setAway(${A.i}, true); true`); await sleep(500); s = await S();
ok(!s.dig && s.cd === -1, "5: away car ends the dig");
await ev(`TLXC.setAway(${A.i}, false); true`);
// 6 touch prompt
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(300); await padOff(); await (await import("../lib.mjs")).send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:5}); await (await import("../lib.mjs")).send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:900,y:300}]}); await (await import("../lib.mjs")).send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]}); await sleep(300);
await stand(A); await ev(`TLXC.setSnow(${A.i}, 0.8); TLXC.cars[${A.i}].paid = false; true`); await sleep(500);
const t = await J(`({ lab: ($("tcE") && $("tcE").textContent) || null, hint: $("wnHint").textContent })`);
console.log("touch:", JSON.stringify(t));
await shot("x3dco_touch");
const errs = await ev(`0`);
console.log(fails ? `${fails} FAILED` : "all passed");
await padOff();
await done(fails ? 1 : 0);
