// Expansion slice 2.1: btn(action) names every bound control for the device last touched. Asserts, exit 1 on a failure.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x2_btn.mjs
import { boot, ev, send, tap, sleep, done, padSet, padOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
await boot();
const all = async () => JSON.parse(await ev(`JSON.stringify({ dev: INP.dev, pad: INP.pad, b: Object.fromEntries(Object.keys(BTN).map(a => [a, btn(a)])), card: $("tut").hidden ? null : $("tuKeys").textContent })`));
const PADS = { xbox: undefined, ps: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", nin: "Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)" };
const WANT = { kbm: { mount: "Q", gas: "W", tablet: "Tab", pick: "Click" }, xbox: { mount: "LB", gas: "RT", pick: "A" }, ps: { mount: "L1", gas: "R2", pick: "✕" }, nin: { mount: "L", gas: "ZR", pick: "B" }, touch: { mount: "GET ON", dismount: "GET OFF", gas: "GAS", pick: "Tap" } };
const check = (nm, s) => {
  console.log(nm, JSON.stringify(s));
  ok(Object.values(s.b).every(v => typeof v === "string" && v.length), nm + ": every action has a name");
  for (const [a, w] of Object.entries(WANT[nm])) ok(s.b[a] === w, `${nm}: ${a} reads "${w}" (got "${s.b[a]}")`);
  ok(s.card && s.card.includes(s.b.walk), nm + ": the tutorial card uses the same names");
};
await tap("KeyH"); await sleep(400); check("kbm", await all());
for (const [nm, id] of Object.entries(PADS)) {
  await padSet({ 7: 1 }, [0, 0, 0, 0], id); await sleep(500); await padSet({}, [0, 0, 0, 0], id); await sleep(400);
  const s = await all(); ok(s.dev === "pad" && s.pad === nm, nm + " pad detected"); check(nm, s);
}
await padOff();
await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100);
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(500);
check("touch", await all());
await send("Emulation.setTouchEmulationEnabled", { enabled: false });
await tap("KeyH"); await sleep(400);
ok((await all()).dev === "kbm", "back to the keyboard on a key press");
ok(await ev(`btn("nonsense") === "nonsense" && TLX.api.btn === btn`), "unknown action falls back; the expansion api carries btn");
console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
