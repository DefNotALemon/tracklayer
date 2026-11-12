// Beta 0146: try to break the v200 pad D-pad-down fix (bandage first, then help). Two wounds, window edge, fjord, on foot, prompt text on a pad.
import { boot, ev, sleep, done, padSet, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const W = () => J(`({ n: TLX.state("wounds").wounds.length, b: TLX.state("wounds").bandages, ages: TLX.state("wounds").wounds.map(w => +w.age.toFixed(1)), helpOn: !!HELP.on, called: !!HELP.called, kind: HELP.kind, foot: !!FOOT.on })`);
const dpad = async () => { await padSet({ 13: 1 }); await sleep(160); await padSet({}); await sleep(300); };
const farSpot = () => ev(`(() => { let best = null, bd = 0; for (let x = -WORLD/2 + 200; x < WORLD/2 - 200; x += 150) for (let z = -WORLD/2 + 200; z < WORLD/2 - 200; z += 150) { if (isSea(x, z) || isWater(x, z)) continue; const d = Math.min(...SITES.map(s => Math.hypot(x - s.x, z - s.z))); if (d > bd) { bd = d; best = [x, z]; } } crashCancel(); FOOT.on = false; P.x = best[0]; P.z = best[1]; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`);
const reset = (fuel) => ev(`(() => { HELP.on = false; HELP.phase = null; if (HELP.rs) HELP.rs.visible = false; HELP.called = false; const s = TLX.state("wounds"); s.wounds = []; s.health = 100; s.bandages = 3; s.cd = 9999; GS.fuel = ${fuel}; GS.outWarned = true; return 1; })()`);

await boot();
await ev(`tutSkip(); GS.hour = 34; true`); await sleep(500);
await farSpot(); await sleep(800);

// A: two fresh wounds, empty tank: how many presses until help is called?
await reset(0); await ev(`TLX.wounds.hit(); TLX.wounds.hit(); true`); await sleep(300);
await dpad(); let w = await W(); console.log("A press1", JSON.stringify(w));
await dpad(); w = await W(); console.log("A press2", JSON.stringify(w));
ok(w.n === 0 && !w.called, "A2 both fresh wounds dressed by two presses, still no help called");
await dpad(); w = await W(); ok(w.called || w.helpOn, "A3 third press calls help " + JSON.stringify(w));

// B: window edge: wound age 5.7 s, press -> dressed; age 6.4 -> help
await reset(0); await ev(`TLX.wounds.hit(); TLX.state("wounds").wounds[0].age = 5.7; true`);
await dpad(); w = await W(); console.log("B1 age 5.7 (+0.5 s pad press delay)", JSON.stringify(w));
await reset(0); await ev(`TLX.wounds.hit(); TLX.state("wounds").wounds[0].age = 6.5; true`);
await dpad(); w = await W(); console.log("B2 age 6.5", JSON.stringify(w));

// C: help already called (rescue en route) + fresh wound -> bandage, no second call
await reset(0); await ev(`gameKey({code:"KeyP"}); true`); await sleep(300);
await ev(`TLX.wounds.hit(); true`); await sleep(200); await dpad(); w = await W();
ok(w.n === 0 && w.b === 2, "C1 help already on the way: D-pad down dresses " + JSON.stringify(w));

// D: on foot, empty tank, fresh wound
await reset(0); await ev(`FOOT.on = true; FOOT.x = P.x + 3; FOOT.z = P.z; true`); await sleep(500);
await ev(`TLX.wounds.hit(); true`); await sleep(200); await dpad(); w = await W();
console.log("D on foot", JSON.stringify(w), "helpWanted", await ev(`helpWanted()`));
ok(w.n === 0 && w.b === 2 || w.called, "D1 on foot something sensible happened (dress or help)");
await ev(`FOOT.on = false; true`);

// E: fjord + fresh wound
await reset(8); await ev(`(() => { let t = null; for (let r = 100; r < 6000 && !t; r += 50) for (let a = 0; a < 6.28; a += 0.2) { const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r; if (isSea(x, z)) { t = [x, z]; break; } } if (!t) return 0; P.x = t[0]; P.z = t[1]; return 1; })()`);
await sleep(1500);
console.log("E at sea:", JSON.stringify(await J(`({ sea: isSea(P.x, P.z), hw: helpWanted(), kind: HELP.kind, on: !!HELP.on })`)));
await ev(`TLX.wounds.hit(); true`); await sleep(200); await dpad(); w = await W(); console.log("E1 fjord press1", JSON.stringify(w));
await dpad(); w = await W(); console.log("E2 fjord press2", JSON.stringify(w));

// F: prompt text on a pad session: does the out-of-fuel toast name a pad button?
await farSpot(); await reset(0); await ev(`GS.outWarned = false; true`);
await padSet({ 13: 0 }); await sleep(200); await padSet({ 0: 1 }); await sleep(100); await padSet({}); await sleep(1500);
const txt = await J(`({ dev: INP.dev, help: btn("help"), bandage: btn("bandage"), toasts: [...document.querySelectorAll("#toasts *")].map(e => e.textContent).filter(Boolean).slice(-4) })`);
console.log("F", JSON.stringify(txt));
await shot("f_pad_prompt");

console.log("fails:", fails);
await done(fails ? 1 : 0);
