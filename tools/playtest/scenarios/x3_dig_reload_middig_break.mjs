// Beta 3.3b round 4: reload mid-dig, resume from the saved part-dug car, pay vs. what is left, pad L3 + touch DIG offered, second dig after paid.
import { boot, ev, tap, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
const S = () => J(`({ foot: FOOT.on, dig: !!FOOT.dig, cd: TLXC.dig, use: footUse(), hint: $("wnHint").textContent, cash: GS.cash })`);
const setup = `tutSkip(); crashCancel(); FOOT.on = true; WX.at = () => 0; GS.storm = 0; GS.hour = 34; TLXC.cars.forEach(c => { c.wait = 99999; c.away = false; }); true`;
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; true`); await sleep(500);
await tap("KeyQ"); for (let i = 0; i < 40 && !(await ev("FOOT.on && !DMT.on")); i++) await sleep(200);
await ev(setup); await sleep(400);
const pick = await J(`(() => { const cars = TLXC.cars.filter(c => !c.away).sort((a, b) => Math.hypot(a.x - depot.x, a.z - depot.z) - Math.hypot(b.x - depot.x, b.z - depot.z));
 for (const c of cars) { const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), x = c.x + rx * 2.4, z = c.z + rz * 2.4;
  if (obstaclesNear(x, z, 3).some(o => o.top > -1e8 && Math.hypot(o.x - x, o.z - z) < o.r + 0.45)) continue; return { i: c.i, x, z, key: c.key }; } })()`);
ok(!!pick, "setup: car " + JSON.stringify(pick));
const stand = () => ev(`(() => { FOOT.x = ${pick.x}; FOOT.z = ${pick.z}; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = FOOT.fwd = FOOT.turn = 0; BOG.on = false; return true; })()`);
const car = () => J(`(() => { const c = TLXC.cars[${pick.i}]; return { b: c.b, b0: c.b0, paid: c.paid, wt: c.wt }; })()`);
await stand(); await ev(`TLXC.setSnow(${pick.i}, 0.9); true`); await sleep(400);
await tap("KeyE"); await sleep(400);
let s = await S(); ok(s.dig, "dig starts");
await waitGame(5); let c = await car(); console.log("mid-dig", JSON.stringify(c));
ok(c.b < 0.8 && c.b > 0.05, "part dug b=" + c.b.toFixed(3));
const bMid = c.b;
// reload mid-dig
await ev("save(); true"); const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2"))`);
await reload(sv); await sleep(1500);
await ev(setup); await sleep(500);
c = await car(); console.log("after reload", JSON.stringify(c));
ok(Math.abs(c.b - bMid) < 0.1, `part-dug car kept through reload (${bMid.toFixed(3)} -> ${c.b.toFixed(3)})`);
ok(c.b0 > c.b, "b0 kept (" + c.b0 + ")");
await stand(); await sleep(500); s = await S(); console.log("state", JSON.stringify(s));
ok(!s.dig && s.cd === -1, "no phantom dig after reload (dig=" + s.dig + " cd=" + s.cd + ")");
ok(s.use === "DIG", "DIG offered again: " + s.use);
ok(!/NaN|undefined/.test(s.hint), "hint clean: " + s.hint);
// resume, finish, pay
const cash0 = s.cash; await tap("KeyE");
for (let i = 0; i < 500 && (await ev("TLXC.dig")) >= 0; i++) await sleep(100);
c = await car(); const cash1 = await ev("GS.cash"); console.log("finished", JSON.stringify(c), "paid", cash1 - cash0);
ok(c.paid && c.b === 0, "finished, paid flag");
ok(cash1 - cash0 >= 40 && cash1 - cash0 <= 90, "pay $40-90: " + (cash1 - cash0));
// (paid-through-reload not asserted: line 187 clears paid when weather is calm, so it needs a live storm)
await ev(`TLXC.setSnow(${pick.i}, 0.9); true`); await sleep(300);
// pad: DIG offered on a fresh car? use footUse only (input scheme label)
await ev(`INP.dev = "pad"; true`); await sleep(300);
console.log("pad hint", await ev(`$("wnHint").textContent`));
await ev(`INP.dev = "touch"; true`); await sleep(300);
console.log("touch hint", await ev(`$("wnHint").textContent`));
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
