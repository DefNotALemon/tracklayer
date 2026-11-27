// The search-and-rescue block's "what to press" lines name the control of the device in the player's hands
// (keyboard, Xbox / PlayStation / Nintendo pad, touch) instead of typed keyboard keys ("Q off", "(E)", "press E",
// "hold SPACE", "Shovel or R"). Part 1 reads every such line under each device in one synchronous step (a stand-in
// case object, nothing left behind) and checks that the word a touch line promises is the word the use button
// really wears at that spot. Part 2 takes a real callout with a DualSense and then on touch and reads what is on
// screen. Exit 1 on a failure.
import { boot, ev, sleep, done, padSet, padOff, shot, park } from "../lib.mjs";
let fails = 0; const bad = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) { fails++; bad.push(m); } };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e} || null)`));
const PS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";

await boot();
await ev(`tutSkip(); true`); await sleep(500);
await ev(`crashCancel(); FOOT.on = false; GS.warmth = 100; GS.storm = 0; WX.at = () => 0; true`);
await park(); await sleep(600);
await ev(`$("help").hidden = true; true`);

await ev(`window.__sarLines = (dev, pad) => {
  const keep = { dev: INP.dev, pad: INP.pad, cur: SAR.cur, foot: FOOT.on, fx: FOOT.x, fz: FOOT.z, bog: BOG.on, res: BOG.resist, winch: ST.winch, dig: FOOT.dig };
  const o = {};
  try {
    INP.dev = dev; if (pad) INP.pad = pad;
    const mk = (kind, state) => ({ kind, name: "Tor", res: null, v: { state, x: P.x + 20, z: P.z, loadT: 0 }, rv: { x: P.x + 20, z: P.z } });
    o.btn = { dismount: btn("dismount"), reel: btn("reel"), reset: btn("reset") };
    o.howSearch = sarHowTo({ kind: "search" }); o.howTow = sarHowTo({ kind: "tow" }); o.howSave = sarHowTo({ kind: "save" }); o.howRescue = sarHowTo({ kind: "rescue" });
    FOOT.on = false;
    SAR.cur = mk("rescue", "waiting"); o.rideWait = sarRideHint(); o.statWait = sarStatus(SAR.cur);
    SAR.cur = mk("tow", "rig"); o.rideRig = sarRideHint(); o.statRig = sarStatus(SAR.cur);
    o.out = sarOutLine({ name: "Siri" }); o.foundRide = sarFoundLine({ name: "Marit" });
    FOOT.on = true; FOOT.x = P.x + 21; FOOT.z = P.z;
    o.foundFoot = sarFoundLine({ name: "Marit" });
    SAR.cur = mk("rescue", "waiting"); o.useHelp = footUse(); o.promptHelp = sarPrompt();
    SAR.cur = mk("save", "waiting"); o.useLoad = footUse();
    SAR.cur = mk("tow", "rig"); o.useRig = footUse();
    SAR.cur = null;
    FOOT.x = P.x + 1.5; FOOT.z = P.z; FOOT.dig = false; BOG.on = true; BOG.resist = 3000; ST.winch = "__none";
    o.useDig = footUse();
    TOASTQ.length = 0; $("toasts").textContent = ""; footAssess();
    o.noWinch = TOASTQ.map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent)).join(" | ");
    TOASTQ.length = 0; $("toasts").textContent = "";
    o.parted = winchPartedLine();
    o.briefs = SCHOOLS.rescue.missions.map(m => schoolBrief(m));
    o.rawBriefs = SCHOOLS.rescue.missions.map(m => typeof m.brief);
  } catch (e) { o.err = String(e && e.stack || e); }
  INP.dev = keep.dev; INP.pad = keep.pad; SAR.cur = keep.cur; FOOT.on = keep.foot; FOOT.x = keep.fx; FOOT.z = keep.fz; BOG.on = keep.bog; BOG.resist = keep.res; ST.winch = keep.winch; FOOT.dig = keep.dig;
  return o;
}; true`);

// ---- 1 every line, every device
const WANT = {
  kbm: { off: "get off (Q)", hook: "hook on (E)", reel: "hold Space to reel", press: "press E", reset: "press N" },
  xbox: { off: "get off (LB)", hook: "hook on (L3)", reel: "hold A to reel", press: "press L3", reset: "press View" },
  ps: { off: "get off (L1)", hook: "hook on (L3)", reel: "hold ✕ to reel", press: "press L3", reset: "press Create" },
  nin: { off: "get off (L)", hook: "hook on (Left stick click)", reel: "hold B to reel", press: "press Left stick click", reset: "press −" },
  touch: { off: "tap GET OFF", hook: "tap HOOK", reel: "hold REEL to reel", press: null, reset: "tap ↺" }
};
const OLD = /\bQ off\b|\(E\)|\bhold E\b|\bSPACE\b|Shovel or R|\(E at |\bE to help/, OLDK = /\bQ off\b|\bhold E\b|\bSPACE\b|Shovel or R|\(E at |\. E to help/;
for (const dev of ["kbm", "xbox", "ps", "nin", "touch"]) {
  const pad = dev === "kbm" || dev === "touch" ? null : dev, o = await J(`window.__sarLines(${JSON.stringify(pad ? "pad" : dev)}, ${JSON.stringify(pad)})`), w = WANT[dev];
  console.log(dev, JSON.stringify(o));
  ok(o && !o.err, `${dev}: the lines build (${o && o.err || "no error"})`);
  if (!o || o.err) continue;
  const all = [o.howSearch, o.howTow, o.howSave, o.howRescue, o.rideWait, o.statWait, o.rideRig, o.statRig, o.out, o.foundRide, o.foundFoot, o.promptHelp, o.noWinch, o.parted, ...o.briefs];
  ok(all.every(s => typeof s === "string" && s.length > 8 && !/undefined|\[object|=>|null/.test(s)), `${dev}: every line is whole text`);
  const old = all.filter(s => (dev === "kbm" ? OLDK : OLD).test(s));
  ok(!old.length, `${dev}: no typed keyboard wording left (${JSON.stringify(old).slice(0, 200)})`);
  if (dev !== "kbm") { const k = all.filter(s => /\bpress E\b|\(Q\)|\bpress N\b|\bSpace\b/.test(s)); ok(!k.length, `${dev}: no keyboard key named (${JSON.stringify(k).slice(0, 200)})`); }
  if (dev === "touch") { const k = all.filter(s => /\bpress\b/i.test(s)); ok(!k.length, `touch: nothing says "press" (${JSON.stringify(k).slice(0, 200)})`); }
  ok(o.howTow.includes(w.off) && o.howTow.includes(w.hook) && o.howTow.includes(w.reel), `${dev}: the tow call's how-to names ${w.off}, ${w.hook}, ${w.reel}: "${o.howTow}"`);
  const pHelp = w.press || "tap HELP UP", pLoad = w.press || "tap LOAD", pRig = w.press || "tap RIG TOW", pDig = w.press || "tap DIG";
  ok(o.howRescue.includes(w.off) && o.howRescue.includes(pHelp), `${dev}: the slope call's how-to: "${o.howRescue}"`);
  ok(o.howSave.includes(pLoad), `${dev}: the toboggan call's how-to: "${o.howSave}"`);
  ok(o.rideWait === `Stop beside Tor, or ${w.off} and walk up`, `${dev}: riding up to them: "${o.rideWait}"`);
  ok(o.rideRig === `${w.off[0].toUpperCase() + w.off.slice(1)} and rig the tow rope at Tor's sled`, `${dev}: riding at a freed sled: "${o.rideRig}"`);
  ok(o.out.includes(`walk to it and ${pRig} to rig`), `${dev}: sled out: "${o.out}"`);
  ok(o.foundFoot.includes(`Walk up and ${pHelp} to help them up.`) && /Stop beside them\.$/.test(o.foundRide), `${dev}: found on foot / riding: "${o.foundFoot.slice(-44)}" / "${o.foundRide.slice(-18)}"`);
  ok(o.noWinch.includes(`dig by the sled (${pDig} at it)`), `${dev}: no winch: "${o.noWinch.slice(-60)}"`);
  ok(o.parted.endsWith(`Dig, or ${w.reset} to reset.`), `${dev}: line parted names the reset control: "${o.parted}"`);
  ok(o.briefs.length === 4 && o.briefs[1].includes(w.off) && o.briefs[1].includes(pHelp) && o.briefs[2].includes(`(${pRig} at her sled)`) && o.briefs[3].includes(`or walk up and ${pLoad})`), `${dev}: the school's briefs: "${o.briefs[1].slice(40, 130)}"`);
  // the words a touch line promises are the words the use button wears there, and the on-foot prompt agrees
  ok(o.useHelp === "HELP UP" && o.useLoad === "LOAD" && o.useRig === "RIG TOW" && o.useDig === "DIG", `${dev}: the use button wears HELP UP / LOAD / RIG TOW / DIG there (${[o.useHelp, o.useLoad, o.useRig, o.useDig]})`);
  ok(dev === "touch" ? o.promptHelp === "tap HELP UP" : o.promptHelp.startsWith(w.press.slice(6) + ": help Tor up"), `${dev}: beside them the prompt is "${o.promptHelp}"`);
}

// ---- 2 a real callout taken with a DualSense in hand, then on touch: what is on screen
const tsaw = () => J(`[...new Set((window.__tsaw || []))]`);
await ev(`(() => { window.__tsaw = []; if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw; for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
await padSet({ 5: 1 }, [0, 0, 0, 0], PS); await sleep(350); await padSet({}, [0, 0, 0, 0], PS); await sleep(350);
const call = await J(`(() => { let c = null; for (let i = 0; i < 8 && !c; i++) { if (SAR.ping && SAR.ping.n) SAR.ping.n.dismiss(); SAR.ping = null; c = sarOffer("rescue"); if (c && c.kind !== "rescue") c = null; }
  if (!c) return { ok: false }; sarAccept(c); return { ok: SAR.cur === c, kind: c.kind, name: c.name, dev: INP.dev, pad: INP.pad }; })()`);
console.log("call", JSON.stringify(call));
ok(call && call.ok, "a real slope callout is offered and taken");
if (call && call.ok) {
  ok(call.dev === "pad" && call.pad === "ps", `the game knows the DualSense (${call.dev}/${call.pad})`);
  let t = []; for (let i = 0; i < 30; i++) { t = await tsaw(); if (t.some(m => /too steep to ride/.test(m))) break; await padSet({}, [0, 0, 0, 0], PS); await sleep(200); }
  const how = t.find(m => /too steep to ride/.test(m)) || "";
  ok(how === "If it's too steep to ride, stop below, get off (L1), walk up and press L3.", `DualSense: the how-to after ACCEPT: "${how}"`);
  // ride to 30 m from them: the riding hint on screen
  const hint = async re => { let h = ""; for (let i = 0; i < 30; i++) { h = await ev(`(() => { const c = SAR.cur; if (!c) return "no case"; crashCancel(); CRASH.cool = 1; FOOT.on = false; P.x = c.v.x + 30; P.z = c.v.z; P.vx = P.vz = 0; P.y = surf(P.x, P.z); GS.warmth = 100; c.t = 0; c.v.core = 100; return $("wnHint").textContent; })()`); if (re.test(h)) break; await sleep(200); } return h; };
  let h = await hint(/walk up/);
  ok(h === `Stop beside ${call.name}, or get off (L1) and walk up`, `DualSense: the riding hint on screen: "${h}"`);
  await shot("sarbtn_ps");
  await padOff(); await sleep(300);
  await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(500);
  h = await hint(/GET OFF/);
  ok(h === `Stop beside ${call.name}, or tap GET OFF and walk up`, `touch: the riding hint on screen: "${h}"`);
  // the button the line names is there to tap on a stopped sled (it showed only when bogged or in a cab), goes away at speed, and gets you off
  // (the case is closed and the sled stood on flat ground first: the slope a casualty lies on slides a parked sled away)
  await ev(`sarClear(); crashCancel(); FOOT.on = false; true`); await park(); await sleep(700);
  let q1 = null; for (let i = 0; i < 20; i++) { q1 = await J(`({ hidden: $("tcQ").hidden, w: $("tcQ").getBoundingClientRect().width, txt: $("tcQ").textContent, spd: +Math.hypot(P.vx, P.vz).toFixed(2), wet: !!P.wet })`); if (q1 && !q1.hidden) break; await sleep(200); }
  ok(q1 && !q1.hidden && q1.w > 20 && q1.txt === "GET OFF", `touch: a GET OFF button is on screen on the stopped sled (${JSON.stringify(q1)})`);
  await shot("sarbtn_touch");
  await ev(`(() => { const f = [Math.sin(P.yaw), Math.cos(P.yaw)]; P.vx = f[0] * 9; P.vz = f[1] * 9; CRASH.cool = 1; return true; })()`); await sleep(160);
  const q2 = await J(`({ hidden: $("tcQ").hidden, spd: Math.hypot(P.vx, P.vz) })`);
  ok(q2 && (q2.spd <= 2.2 || q2.hidden), `touch: no GET OFF while the sled is moving (${JSON.stringify(q2)})`);
  await ev(`P.vx = P.vz = 0; CRASH.cool = 1; true`);
  let offT = -1; for (let i = 0; i < 20; i++) { const s = await J(`({ hidden: $("tcQ").hidden, spd: Math.hypot(P.vx, P.vz), gnd: P.gnd })`); if (!s.hidden && s.spd < 1 && s.gnd) break; await ev(`P.vx = P.vz = 0; true`); await sleep(200); }
  await ev(`(() => { const b = $("tcQ"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return true; })()`);
  for (let i = 0; i < 60; i++) { const s = await J(`({ foot: FOOT.on, dmt: DMT.on })`); if (s.foot && !s.dmt) { offT = i; break; } await sleep(250); }
  ok(offT >= 0, `touch: a tap on GET OFF puts you on your feet (after ${offT} polls)`);
  const q3 = await J(`({ on: !$("tcOn").hidden, txt: $("tcOn").textContent, toasts: (window.__tsaw || []).filter(m => /Stop the sled/.test(m)) })`);
  ok(q3 && q3.on && q3.txt === "GET ON" && !q3.toasts.length, `touch: and GET ON is there to get back on (${JSON.stringify(q3)})`);
  await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`);
}
if (bad.length) console.log("FAILED CHECKS:\n  " + bad.join("\n  "));
console.log(fails ? `FAILS ${fails}` : "all ok");
await done(fails ? 1 : 0);
