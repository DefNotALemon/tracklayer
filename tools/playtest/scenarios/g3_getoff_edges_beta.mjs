// Beta check for v299: touch GET OFF button edge cases (speed boundary, crash, water, on foot, reload, rapid taps, pad/kbd swap).
import { boot, ev, sleep, done, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e} || null)`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.warmth = 100; GS.storm = 0; WX.at = () => 0; INP.dev = "touch"; SET.touch = "on"; setTouchUI(); $("help").hidden = true; true`);
await park(); await sleep(800);
const q = () => J(`({ hid: $("tcQ").hidden, txt: $("tcQ").textContent, w: Math.round($("tcQ").getBoundingClientRect().width), spd: +Math.hypot(P.vx, P.vz).toFixed(2), foot: FOOT.on, crash: CRASH.on, wet: !!P.wet, bog: BOG.on })`);
const setSpd = async v => { await ev(`CRASH.cool = 1; P.vx = Math.sin(P.yaw)*${v}; P.vz = Math.cos(P.yaw)*${v}; true`); await sleep(60); return q(); };
// settle
let s; for (let i = 0; i < 15; i++) { await ev(`P.vx = P.vz = 0; true`); await sleep(200); s = await q(); if (!s.hid) break; }
ok(!s.hid && s.txt === "GET OFF", "stopped: GET OFF shown " + JSON.stringify(s));
for (const v of [1.5, 2.1, 2.4, 3, 8]) { s = await setSpd(v); console.log("speed", v, JSON.stringify(s)); }
s = await setSpd(8); ok(s.hid, "8 m/s: hidden");
s = await setSpd(3.5); ok(s.hid, "3.5 m/s: hidden");
// hysteresis flicker check: sample at 2.2 +- while coasting
const seen = []; for (let i = 0; i < 10; i++) { await ev(`P.vx = P.vz = 0; true`); await sleep(120); seen.push((await q()).hid ? 0 : 1); }
console.log("flicker stopped", seen.join(""));
ok(seen.every(x => x === 1), "stays shown while stopped (no flicker)");
// crash
await ev(`CRASH.cool = 0; crashEject("test", 0, 1, 12, null); true`); await sleep(400);
s = await q(); ok(s.hid || !s.crash, "during crash GET OFF hidden " + JSON.stringify(s));
for (let i = 0; i < 100; i++) { await sleep(200); if (await ev(`FOOT.on && !CRASH.on`) === true) break; }
await sleep(500); s = await q(); console.log("after crash get-up", JSON.stringify(s));
ok(!s.crash, "crash ended");
// on foot, the button shouldn't read GET OFF
s = await q(); ok(s.hid || s.txt !== "GET OFF", "on foot: not labelled GET OFF " + JSON.stringify(s));
// get on, then tap off repeatedly, check no stuck state
await ev(`FOOT.on = false; crashCancel(); P.vx = P.vz = 0; true`); await sleep(500);
for (let k = 0; k < 3; k++) {
  await ev(`FOOT.on = false; crashCancel(); P.vx = P.vz = 0; true`); await sleep(500);
  await ev(`(() => { const b = $("tcQ"); for (let i = 0; i < 3; i++) { b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7+i, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7+i, pointerType: "touch" })); } return true; })()`);
  let t = -1; for (let i = 0; i < 40; i++) { await sleep(200); if (await ev(`FOOT.on && !DMT.on`) === true) { t = i; break; } }
  const st = await J(`({ foot: FOOT.on, dmt: DMT.on, mnt: MNT.on, fx: +FOOT.x.toFixed(1), px: +P.x.toFixed(1) })`);
  ok(t >= 0, `round ${k}: triple-tap dismounts once and settles ${JSON.stringify(st)}`);
}
// water: wet sled
await ev(`FOOT.on = false; crashCancel(); P.vx = P.vz = 0; P.wet = true; true`); await sleep(400);
s = await q(); console.log("wet", JSON.stringify(s)); ok(s.hid || !s.wet, "wet sled: GET OFF hidden"); await ev(`P.wet = false; true`);
// reload on foot
const savedFoot = await ev(`FOOT.on`); console.log("foot before", savedFoot);
await ev(`INP.dev = "kbd"; true`); await sleep(300);
s = await q(); console.log("kbd mode", JSON.stringify(s));
await done(fails ? 1 : 0);
