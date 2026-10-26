// G2 verify (v75): visual check of the Aurora E plug-in charging — garage card perk line, the
// "Plugged in" toast at a village, and the known quay false "Battery low" warning (filed on the backlog).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_aurora_plug_visual.mjs
import { boot, ev, shot, done, sleep } from "../lib.mjs";
await boot();
await ev(`(() => { GS.own.sleds = SLEDS.map(x => x.id); GS.own.sled = "aurora"; restat(); GS.cash = 5000; GS.delivered = 70; WX.at = () => 0; GS.storm = 0; return 1; })()`);

// 1. Garage card
await ev(`(() => { document.querySelector("#garage").hidden = false; garageTab = "sleds"; renderGarage(); return 1; })()`);
await sleep(300);
await shot("01_garage_card");
await ev(`(() => { document.querySelector("#garage").hidden = true; return 1; })()`);

// 2. Plug in at a village
const village = JSON.parse(await ev(`(() => { const v = SITES.find(s => s.kind === "village"); return JSON.stringify({ x: v.x, z: v.z, name: v.name }); })()`));
await ev(`(() => { P.x = ${village.x} + 4; P.z = ${village.z} + 4; P.vx = P.vz = 0; recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.3; GS.fuel = 3; GS.cash = 5000; window.__t0 = gameClock; return 1; })()`);
let t = 0;
while (t < 6) { await sleep(400); t = +(await ev(`gameClock - window.__t0`)); }
await shot("02_plugged_in_village");

// 3. Quay false "Battery low" (known issue)
await ev(`(() => { if (FS.spot) fuelEnd("left"); P.x = depot.x + 4; P.z = depot.z + 4; P.vx = P.vz = 0; recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.3; GS.fuel = GS.cap * 0.15; GS.lowWarned = false; window.__t0 = gameClock; return 1; })()`);
t = 0;
while (t < 4) { await sleep(400); t = +(await ev(`gameClock - window.__t0`)); }
await shot("03_quay_false_lowbatt");

await done();
