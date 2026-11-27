// Owner note 13 Nov #2: beside someone you came to winch out, the hint names a "size it up" control. This checks
// that the control named is the one bound on the device in the player's hands (keyboard, Xbox / PlayStation /
// Nintendo pad, touch), that it is there to press (the touch button), and that pressing it reads the job out.
// Also the snatch-block doubling at the hooked victim, which rides the same control. Exit 1 on a failure.
import { boot, ev, tap, sleep, done, padSet, padOff, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const PADS = { xbox: undefined, ps: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", nin: "Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)" };
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return true; })()`);
const S = () => J(`{ foot: FOOT.on, hint: $("wnHint").textContent, dev: INP.dev, pad: INP.pad, wn: WN.state, dbl: !!WN.dbl, tcx: $("tcX").hidden ? null : $("tcX").textContent, rj: RJ.on, n: RJ.vs.length }`);
const pollHint = async re => { let s; for (let i = 0; i < 25; i++) { s = await S(); if (re.test(s.hint)) break; await sleep(200); } return s; };
const SIZED = /lb to start/;

await boot();
await ev(`tutSkip(); true`); await sleep(500);
// a heavy winch with a snatch block, a recovery call accepted the game's own way (makeRescue + rescueStart)
const made = await J(`(() => { crashCancel(); FOOT.on = false; GS.own.parts.winch = "heavy"; restat(); GS.warmth = 100; GS.storm = 0; WX.at = () => 0;
  let c = null; for (let i = 0; i < 40 && !c; i++) c = makeRescue(depot);
  if (!c) return { ok: false, winch: ST.winch };
  rescueStart(c); const v = RJ.vs[0];
  return { ok: true, block: !!(winchDef() || {}).block, len: winchDef().len, kind: v.kind, name: v.name, sled: !!v.vk.sled }; })()`);
console.log("rescue", JSON.stringify(made));
ok(made.ok, "a recovery call starts");
if (!made.ok) await done(1);

// stand the sled on the way out from them and the rider on foot 8 m from the victim, line still stowed
const place = d => ev(`(() => { const v = RJ.vs[0]; crashCancel(); P.x = v.x + v.ex * 16; P.z = v.z + v.ez * 16; P.vx = P.vz = 0; P.y = surf(P.x, P.z);
  FOOT.on = true; FOOT.x = v.x + v.ex * ${d}; FOOT.z = v.z + v.ez * ${d}; FOOT.sp = 0; GS.warmth = 100; CRASH.cool = 1; return true; })()`);
const hold = `(() => { const v = RJ.vs[0]; if (v) { v.left = 0; v.gone = false; } GS.warmth = 100; return true; })()`;

// ---- 1 keyboard
await place(8); await sleep(400); await tap("KeyH", 40); await sleep(100);
await ev(`$("help").hidden = true; INP.dev = "kbm"; true`);
let s = await pollHint(/size it up/i); console.log("kbm", JSON.stringify(s));
ok(s.foot && s.rj, "on foot at a live recovery");
ok(/^X: size it up/.test(s.hint), `keyboard hint names X: "${s.hint}"`);
await clearToasts(); await tap("KeyX"); await sleep(500);
let t = await toasts(); ok(t.some(m => SIZED.test(m)), `keyboard X reads the job out: ${JSON.stringify(t).slice(0, 160)}`);
await shot("sizeup_kbm");

// ---- 2 pads, each brand: the hint names that pad's button 2 and button 2 does it
for (const [brand, want] of [["xbox", "X"], ["ps", "□"], ["nin", "Y"]]) {
  await ev(hold); await place(8); await clearToasts();
  await padSet({ 5: 1 }, [0, 0, 0, 0], PADS[brand]); await sleep(350); await padSet({}, [0, 0, 0, 0], PADS[brand]); await sleep(350);
  s = await pollHint(/size it up/i); console.log(brand, JSON.stringify(s));
  ok(s.dev === "pad" && s.pad === brand, `${brand}: the game knows the pad (${s.dev}/${s.pad})`);
  ok(s.hint.startsWith(want + ": size it up"), `${brand}: hint names ${want}: "${s.hint}"`);
  await clearToasts(); await padSet({ 2: 1 }, [0, 0, 0, 0], PADS[brand]); await sleep(300); await padSet({}, [0, 0, 0, 0], PADS[brand]); await sleep(400);
  t = await toasts(); ok(t.some(m => SIZED.test(m)), `${brand}: button 2 reads the job out`);
  if (brand === "ps") await shot("sizeup_ps");
}
await padOff(); await sleep(300);

// ---- 3 touch: the hint names the button, the button is there, a tap on it reads the job out
await ev(hold); await place(8);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(700);
s = await pollHint(/size it up|SIZE UP/i); console.log("touch", JSON.stringify(s));
ok(s.tcx === "SIZE UP", `touch: the SIZE UP button shows beside them (${s.tcx})`);
ok(/tap SIZE UP/.test(s.hint) && !/\bX:/.test(s.hint), `touch: hint says tap SIZE UP, no key: "${s.hint}"`);
await clearToasts();
const tapped = await ev(`(() => { const b = $("tcX"); if (b.hidden) return false; b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);
await sleep(500);
t = await toasts(); ok(tapped && t.some(m => SIZED.test(m)), "touch: a tap on SIZE UP reads the job out");
await shot("sizeup_touch");
// 30 m off: no button, no promise
await place(30); await sleep(600); s = await S();
ok(s.tcx === null && !/size it up|SIZE UP/i.test(s.hint), `touch 30 m off: no SIZE UP button or line (${s.tcx} / "${s.hint}")`);

// ---- 4 hooked on, standing at them with a snatch block: the same control doubles the line, and says so per device
if (made.block) {
  await ev(hold);
  await ev(`(() => { const v = RJ.vs[0], e = rjEye(v); FOOT.x = e[0] + v.ex * 1.2; FOOT.z = e[2] + v.ez * 1.2; v.hooked = true; WN.state = "hooked"; WN.mode = "rescue"; WN.tgt = v; WN.tie = null; WN.dbl = false; WN.anchor = null; WN.stall = 0; return true; })()`);
  await sleep(600); s = await pollHint(/DOUBLE/); console.log("touch hooked", JSON.stringify(s));
  ok(s.tcx === "DOUBLE", `touch hooked at them: the button reads DOUBLE (${s.tcx})`);
  ok(/DOUBLE/.test(s.hint) && !/X at them|SPACE|E:/.test(s.hint), `touch hooked: no key names in the line: "${s.hint}"`);
  await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`); await sleep(500);
  s = await S(); console.log("kbm hooked", JSON.stringify(s));
  ok(/X at them: double/.test(s.hint) && /Hold Space/.test(s.hint), `keyboard hooked: X at them, Space to reel: "${s.hint}"`);
  await tap("KeyX"); await sleep(400); s = await S();
  ok(s.dbl, "keyboard X at them doubles the line");
  await padSet({ 5: 1 }, [0, 0, 0, 0], PADS.ps); await sleep(350); await padSet({}, [0, 0, 0, 0], PADS.ps); await sleep(400);
  s = await S(); console.log("ps hooked", JSON.stringify(s));
  ok(/□ at them/.test(s.hint) && !/SPACE|\bX at/.test(s.hint), `DualSense hooked: □ at them, no keyboard names: "${s.hint}"`);
  await padOff();
} else console.log("note: this winch has no snatch block, step 4 skipped");

console.log(fails ? `FAILS ${fails}` : "all ok");
await done(fails ? 1 : 0);
