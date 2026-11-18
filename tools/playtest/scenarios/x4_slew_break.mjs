// Beta (0223): try to break 4.1b1 (blade slew by holding use). Facts printed; exit 1 on a FAIL.
import { boot, ev, sleep, done, tap, down, up, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 20000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const U = JSON.stringify(await ev(`TLXV.state().owned[0].uid`));
await ev(`TLXPL.fit(${U}, "b23"); TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(800);
const S = () => J(`(() => { const b = TLXPL.rt(${U}); return { down: b.down, th: TLXPL.throwOf(${U}), held: !!b.hold, foot: FOOT.on, carry: b.carry }; })()`);
const errs = [];
// A rapid taps x6 ends in a consistent state, never slews
for (let i = 0; i < 6; i++) { await tap("KeyE"); await sleep(120); }
await waitGame(0.8); let s = await S();
console.log("  after 6 quick taps", JSON.stringify(s));
ok(s.th === "r" && !s.held, "A quick taps never slew (" + s.th + ")");
// B press while up, keep holding 1.5 s: drops, must NOT also slew
await ev(`TLXPL.rt(${U}).down = false; true`); await sleep(200);
await down("KeyE"); await sleep(1500); s = await S(); await up("KeyE"); await sleep(300);
console.log("  hold from blade-up 1.5 s", JSON.stringify(s));
ok(s.down && s.th === "r", "B a hold that starts with blade UP drops it and does not slew (" + s.th + ")");
// C hold, dismount mid-hold (Q)
await down("KeyE"); await sleep(250); await tap("KeyQ"); await sleep(900); s = await S(); await up("KeyE"); await waitGame(2.5); const s2 = await S();
console.log("  hold + Q", JSON.stringify(s), JSON.stringify(s2));
ok(s2.th === "r" || s2.th === "l", "C throw still valid after hold+dismount: " + s2.th);
ok(!(s.foot && s.th === "l" && !s.down), "C no slew-while-lifted state");
// back in the truck
await ev(`FOOT.on = false; TLXV.swapTo(${U}); true`); await sleep(800);
// D hold with the tablet open
await ev(`TLXPL.rt(${U}).down = true; TABLET.toggle(true, "map"); true`); await sleep(300);
const th0 = await ev(`TLXPL.throwOf(${U})`);
await down("KeyE"); await sleep(900); await up("KeyE"); await sleep(200);
const th1 = await ev(`TLXPL.throwOf(${U})`);
console.log("  tablet open: hold E ->", th0, "->", th1);
await ev(`TABLET.toggle(false); true`); await sleep(300);
// E hold under Settings
await ev(`document.getElementById("settings").hidden = false; true`); await sleep(200);
const th2 = await ev(`TLXPL.throwOf(${U})`);
await down("KeyE"); await sleep(900); await up("KeyE"); await sleep(200);
const th3 = await ev(`TLXPL.throwOf(${U})`);
console.log("  settings open: hold E ->", th2, "->", th3);
ok(th2 === th3, "E settings open: hold does not slew behind the menu (" + th2 + "->" + th3 + ")");
await ev(`document.getElementById("settings").hidden = true; true`); await sleep(200);
// F hold while driving at speed, release
await ev(`TLXPL.rt(${U}).down = true; true`);
await down("KeyW"); await waitGame(4);
const v0 = await ev(`Math.hypot(P.vx,P.vz)`);
await down("KeyE"); await sleep(900); const th4 = await ev(`TLXPL.throwOf(${U})`); await up("KeyE"); await waitGame(1);
await up("KeyW");
console.log("  slew at speed v", v0, "throw", th4);
ok(Number.isFinite(await ev(`P.x + P.z`)), "F finite position after slew at speed");
// G bad saved throw value
await ev(`TLX.state("plow").blades[${U}].throw = "zzz"; true`); await sleep(300);
const g = await J(`(() => { try { return { th: TLXPL.throwOf(${U}), hint: TLXPL.hint() }; } catch (e) { return { err: String(e) }; } })()`);
console.log("  garbage throw", JSON.stringify(g));
ok(!g.err, "G a garbage saved throw does not throw: " + JSON.stringify(g));
await ev(`TLX.state("plow").blades[${U}].throw = "l"; TLXPL.rt(${U}).down = true; true`); await sleep(300);
// H reload mid-hold
await down("KeyE"); await sleep(200);
await reload(); await sleep(1500); await up("KeyE");
await ev(`tutSkip(); true`); await sleep(500);
const h = await J(`(() => { const u = TLXV.state().owned[0].uid; return { th: TLXPL.throwOf(u), down: TLXPL.rt(u).down, hold: !!TLXPL.rt(u).hold }; })()`);
console.log("  after reload mid-hold", JSON.stringify(h));
ok(!h.hold, "H no stuck hold after reload");
const pe = await ev(`window.__pe ? JSON.stringify(window.__pe) : "n/a"`);
await done(fails ? 1 : 0);
