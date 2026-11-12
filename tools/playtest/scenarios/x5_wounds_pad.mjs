// Beta fix 0143 #1: on a pad, D-pad down is both "bandage" and "call for help" (empty tank / fjord). While a wound can
// still be dressed (inside BANDAGE_WINDOW, a bandage in the kit) it must bandage first; a second press then calls help.
// A soaked wound, an empty kit or no wound at all leaves D-pad down calling help as before. Keyboard U / P unchanged.
import { boot, ev, tap, sleep, done, padSet } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
const W = () => J(`({ n: TLX.state("wounds").wounds.length, b: TLX.state("wounds").bandages, fuel: GS.fuel, helpOn: !!HELP.on, called: !!HELP.called })`);
const dpad = async () => { await padSet({ 13: 1 }); await sleep(160); await padSet({}); await sleep(300); };
const farSpot = () => ev(`(() => { let best = null, bd = 0; for (let x = -WORLD/2 + 200; x < WORLD/2 - 200; x += 150) for (let z = -WORLD/2 + 200; z < WORLD/2 - 200; z += 150) { if (isSea(x, z) || isWater(x, z)) continue; const d = Math.min(...SITES.map(s => Math.hypot(x - s.x, z - s.z))); if (d > bd) { bd = d; best = [x, z]; } } crashCancel(); FOOT.on = false; P.x = best[0]; P.z = best[1]; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`);
const reset = (fuel) => ev(`(() => { HELP.on = false; HELP.phase = null; if (HELP.rs) HELP.rs.visible = false; HELP.called = false; const s = TLX.state("wounds"); s.wounds = []; s.health = 100; s.bandages = 3; s.cd = 9999; GS.fuel = ${fuel}; GS.outWarned = true; return 1; })()`);

await boot();
await ev(`tutSkip(); GS.hour = 34; true`); await sleep(500);
await farSpot(); await sleep(800);

// A: empty tank + fresh wound: first press bandages, no help call; second press calls help
await reset(0); await ev(`TLX.wounds.hit(); true`); await waitGame(1);
ok(await ev(`helpWanted()`) === true && await ev(`TLX.wounds.dressable()`) === true, "A0 setup: help wanted and the wound is dressable");
await dpad(); let w = await W();
ok(w.n === 0 && w.b === 2 && !w.called, "A1 D-pad down dresses the fresh wound on an empty tank, no help called " + JSON.stringify(w));
await dpad(); w = await W();
ok(w.called || w.helpOn, "A2 a second D-pad down (wound dressed) calls the fuel delivery " + JSON.stringify(w));

// B: empty tank + soaked wound: nothing to dress, so D-pad down calls help (bandage not wasted)
await reset(0); await ev(`TLX.wounds.hit(); TLX.state("wounds").wounds[0].age = 7; true`); await sleep(200);
ok(await ev(`TLX.wounds.dressable()`) === false, "B0 a soaked wound is not dressable");
await dpad(); w = await W();
ok((w.called || w.helpOn) && w.b === 3, "B1 soaked wound + empty tank: D-pad down calls help, kit untouched " + JSON.stringify(w));

// C: empty tank + fresh wound + empty kit: calls help
await reset(0); await ev(`TLX.wounds.hit(); TLX.state("wounds").bandages = 0; true`); await waitGame(0.5);
await dpad(); w = await W();
ok((w.called || w.helpOn) && w.n === 1, "C1 no bandages left: D-pad down calls help " + JSON.stringify(w));

// D: empty tank, no wound: calls help (old behaviour)
await reset(0); await sleep(200);
await dpad(); w = await W();
ok(w.called || w.helpOn, "D1 empty tank, not hurt: D-pad down calls help " + JSON.stringify(w));

// E: fuel in the tank + fresh wound: bandages (old behaviour)
await reset(8); await ev(`TLX.wounds.hit(); true`); await waitGame(0.5);
await dpad(); w = await W();
ok(w.n === 0 && w.b === 2 && !w.called && !w.helpOn, "E1 fuel in tank: D-pad down bandages " + JSON.stringify(w));

// F: option off: wounds never dressable, D-pad down on an empty tank calls help
await reset(0); await ev(`TLX.wounds.hit(); TLX.setOn("wounds", false); true`);
const offOk = await ev(`TLX.on("wounds")`) === false;
if (offOk) { await dpad(); w = await W(); ok((w.called || w.helpOn), "F1 wounds option off: D-pad down calls help " + JSON.stringify(w)); }
else console.log("skip F (no TLX.setOption)");

// G: keyboard unchanged: U bandages, P calls help, on an empty tank with a fresh wound
await reset(0); await ev(`TLX.setOn("wounds", true); TLX.wounds.hit(); true`); await waitGame(0.5);
await tap("KeyU"); await sleep(300); w = await W();
ok(w.n === 0 && !w.called, "G1 U bandages " + JSON.stringify(w));
await tap("KeyP"); await sleep(300); w = await W();
ok(w.called || w.helpOn, "G2 P calls help " + JSON.stringify(w));

console.log("fails:", fails);
await done(fails ? 1 : 0);
