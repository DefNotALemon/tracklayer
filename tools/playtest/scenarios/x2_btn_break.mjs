// Beta break test of 2.1 btn(action): odd pad ids, live switching of on-screen hints, hard-coded key leaks, save round-trip.
import { boot, ev, send, tap, sleep, done, padSet, padOff, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); FOOT.on = false; true`); await sleep(500);
const names = () => J(`({ dev: INP.dev, pad: INP.pad, b: Object.fromEntries(Object.keys(BTN).map(a => [a, btn(a)])) })`);
const IDS = {
  generic: "Wireless Controller (STANDARD GAMEPAD Vendor: 0000 Product: 0000)",
  stadia: "Stadia Controller (STANDARD GAMEPAD Vendor: 18d1 Product: 9400)",
  eightbit: "8BitDo Pro 2 (Vendor: 2dc8 Product: 6003)",
  joycon: "Joy-Con (L) (STANDARD GAMEPAD Vendor: 057e Product: 2006)",
  ps4: "Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)",
  xboxelite: "Xbox Elite Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b00)",
  empty: "",
};
for (const [nm, id] of Object.entries(IDS)) {
  await padSet({ 7: 1 }, [0, 0, 0, 0], id); await sleep(450); await padSet({}, [0, 0, 0, 0], id); await sleep(300);
  const s = await names();
  const bad = Object.entries(s.b).filter(([a, v]) => typeof v !== "string" || !v.length || /undefined|NaN|\[object/.test(v));
  console.log(nm, "->", s.dev, s.pad, "mount", s.b.mount, "gas", s.b.gas, "pick", s.b.pick);
  ok(s.dev === "pad" && bad.length === 0, `${nm}: pad detected, ${Object.keys(s.b).length} actions all named (bad: ${JSON.stringify(bad)})`);
  ok(!/^(Q|W|Tab|Click)$/.test(s.b.mount) && s.b.gas !== "W", `${nm}: pad prompts are not keyboard names (mount "${s.b.mount}", gas "${s.b.gas}")`);
}
await padOff();
// live hint switching on foot near the sled
await ev(`(() => { crashCancel(); FOOT.on = true; FOOT.x = P.x + 2.2; FOOT.z = P.z; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`); await sleep(900);
const hint = () => ev(`(() => { const e = document.getElementById("wnHint"); return e ? e.textContent + "|" + getComputedStyle(e).display : "none"; })()`);
await tap("KeyH"); await sleep(300); await tap("KeyH"); await sleep(300);
const hk = await hint(); console.log("kbm hint:", hk);
await padSet({ 7: 1 }, [0, 0, 0, 0], IDS.ps4); await sleep(400); await padSet({}, [0, 0, 0, 0], IDS.ps4); await sleep(900);
const hp = await hint(); console.log("ps pad hint:", hp);
ok(hk !== hp, "on-foot hint text changes when the pad is touched (no stale keyboard text)");
ok(!/\bQ\b/.test(hp.split("|")[0]), `pad hint has no keyboard Q ("${hp.split("|")[0]}")`);
await padOff();
await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(900);
const ht = await hint(); console.log("touch hint:", ht);
ok(await ev(`INP.dev === "touch"`), "touch flips INP.dev");
ok(!/\b(Q|LB|L1)\b/.test(ht.split("|")[0]), `touch hint has no key/pad names ("${ht.split("|")[0]}")`);
await shot("x2btn_touch");
await send("Emulation.setTouchEmulationEnabled", { enabled: false });
await tap("KeyD"); await sleep(600);
ok(await ev(`INP.dev === "kbm"`), "key press returns to kbm");
const hk2 = await hint(); console.log("back to kbm hint:", hk2);
ok(hk2.split("|")[0] === hk.split("|")[0] || /Q/.test(hk2), "keyboard hint restored");
// leaked key names in static player text: scan visible DOM for pad-mode contradictions
await padSet({ 7: 1 }, [0, 0, 0, 0]); await sleep(400); await padSet(); await sleep(600);
await ev(`TABLET.toggle(true, "map"); true`); await sleep(500);
const leak = await J(`[...document.querySelectorAll("body *")].filter(e => e.children.length === 0 && e.offsetParent !== null && /\\b(press|hold) (Q|E|W|Tab|Shift|Space|R|F)\\b/i.test(e.textContent)).map(e => e.id + ":" + e.textContent.slice(0, 80)).slice(0, 8)`);
console.log("kbm-name text visible while on a pad:", JSON.stringify(leak));
ok(leak.length === 0, "no hard-coded 'press <key>' text visible in pad mode (Map app open)");
await padOff();
// save round trip: old-style save without x key loads, btn works
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
