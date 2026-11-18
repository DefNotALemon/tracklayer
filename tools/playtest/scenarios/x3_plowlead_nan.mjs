// Probe: which traffic cars have non-finite x/z/s on a fresh boot vs after a reload (plow trucks parked off-road?).
import { boot, ev, sleep, done, reload } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const dump = `TLXT.cars.map((c, i) => ({ i, on: c.on, plow: !!c.plow, x: String(c.x), z: String(c.z), s: String(c.s) })).filter(c => !isFinite(+c.x + +c.z + +c.s))`;
await boot(); await ev(`tutSkip(); true`); await sleep(2500);
console.log("fresh:", JSON.stringify(await J(dump)));
await reload(); await ev(`tutSkip(); true`); await sleep(3500);
console.log("reload:", JSON.stringify(await J(dump)));
await done(0);
