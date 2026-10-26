// Smoke test + baseline numbers: boots a fresh game, rides, gets off, walks in fresh powder and back along
// its own trench, takes stills. Run: tools/playtest/run.sh tools/playtest/scenarios/smoke.mjs
// Every builder pass runs this before landing; it must print "page errors: none" and exit 0.
import { boot, ev, st, timed, shot, sideCam, camOff, park, tap, sleep, done } from "../lib.mjs";
await boot();
console.log("start", JSON.stringify(await st()));
await shot("00_start");
await timed("KeyW", 6);                                  // ride off from the depot
console.log("after 6 s throttle", JSON.stringify(await st()));
await shot("01_riding");
console.log("parked at", JSON.stringify(await park()));
await sleep(1500);
await tap("KeyQ"); await sleep(2500);                    // climb off (animated)
const s0 = await st();
if (!s0.onFoot) { console.log("FAIL: Q did not put the rider on foot", JSON.stringify(s0)); await done(1); }
await ev("FOOT.yaw = Math.PI / 2; true");
const walk = await timed("KeyW", 8);
const a = walk[0].foot, b = walk.at(-1).foot, dt = walk.at(-1).t - walk[0].t;
console.log(`walk fresh powder: ${(Math.hypot(b.x - a.x, b.z - a.z) / dt).toFixed(2)} m/s over ${dt.toFixed(1)} s game, tired ${b.tired}`);
await sideCam(); await shot("02_walking_side"); await camOff(); await shot("03_walking_chase");
await ev("FOOT.yaw += Math.PI; true"); await sleep(300);
const back = await timed("KeyW", 6);
const c = back[0].foot, d = back.at(-1).foot, dt2 = back.at(-1).t - back[0].t;
console.log(`walk back along own trench: ${(Math.hypot(d.x - c.x, d.z - c.z) / dt2).toFixed(2)} m/s`);
await done();
