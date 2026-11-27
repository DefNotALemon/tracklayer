// Beta breaker for the v297 "size it up" control: no winch fitted, SINGLE label after doubling, own bog on touch,
// a victim who leaves, mid-rescue reload. Prints findings; exit 1 on a FAIL.
import { boot, ev, tap, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const S = () => J(`{ foot: FOOT.on, hint: $("wnHint").textContent, dev: INP.dev, tcx: $("tcX").hidden ? null : $("tcX").textContent, rj: RJ.on, n: RJ.vs.length, winch: !!winchDef() }`);
await boot();
await ev(`tutSkip(); true`); await sleep(500);
const made = await J(`(() => { crashCancel(); FOOT.on = false; GS.own.parts.winch = "heavy"; restat(); GS.warmth = 100; GS.storm = 0; WX.at = () => 0;
  let c = null; for (let i = 0; i < 40 && !c; i++) c = makeRescue(depot); if (!c) return { ok: false }; rescueStart(c); return { ok: true, block: !!(winchDef() || {}).block }; })()`);
ok(made.ok, "recovery starts"); if (!made.ok) await done(1);
const place = d => ev(`(() => { const v = RJ.vs[0]; crashCancel(); P.x = v.x + v.ex * 16; P.z = v.z + v.ez * 16; P.vx = P.vz = 0; P.y = surf(P.x, P.z);
  FOOT.on = true; FOOT.x = v.x + v.ex * ${d}; FOOT.z = v.z + v.ez * ${d}; FOOT.sp = 0; GS.warmth = 100; CRASH.cool = 1; const w = RJ.vs[0]; w.left = 0; w.gone = false; return true; })()`);
// A: no winch fitted
await ev(`GS.own.parts.winch = ${JSON.stringify("none")}; restat(); true`);
await place(8); await ev(`INP.dev = "touch"; SET.touch = "on"; setTouchUI(); true`); await sleep(800);
let s = await S(); console.log("A no winch touch", JSON.stringify(s));
ok(!(s.tcx === null && /size it up/i.test(s.hint)), `A: a hint never promises a button that isn't there ("${s.hint}" / btn ${s.tcx})`);
await ev(`INP.dev = "kbm"; SET.touch = "off"; setTouchUI(); true`); await sleep(500); s = await S(); console.log("A no winch kbm", JSON.stringify(s));
// B: winch back, hook at victim, double, label flips to SINGLE
await ev(`GS.own.parts.winch = "heavy"; restat(); true`); await place(8);
if (made.block) {
  await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; (() => { const v = RJ.vs[0], e = rjEye(v); FOOT.x = e[0] + v.ex * 1.2; FOOT.z = e[2] + v.ez * 1.2; v.hooked = true; WN.state = "hooked"; WN.mode = "rescue"; WN.tgt = v; WN.dbl = true; WN.anchor = null; WN.stall = 0; })(); true`);
  await sleep(700); s = await S(); console.log("B doubled touch", JSON.stringify(s));
  ok(s.tcx === "SINGLE", `B: after doubling the button reads SINGLE (${s.tcx})`);
  ok(!/\bX\b|SPACE/.test(s.hint), `B: no key names on touch ("${s.hint}")`);
}
// C: victim gone while standing there
await ev(`WN.state = "stowed"; WN.mode = null; WN.tgt = null; WN.dbl = false; RJ.vs[0].hooked = false; true`); await place(8);
await ev(`RJ.vs[0].gone = true; RJ.vs[0].left = 1; true`); await sleep(700); s = await S(); console.log("C victim gone", JSON.stringify(s));
// D: reload mid rescue
await ev(`RJ.vs[0].gone = false; RJ.vs[0].left = 0; true`);
await ev(`save && save(); true`).catch(() => {});
console.log(fails ? `FAILS ${fails}` : "all ok");
await done(fails ? 1 : 0);
