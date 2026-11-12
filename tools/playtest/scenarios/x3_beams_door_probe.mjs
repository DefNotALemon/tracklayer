// Probe: walk into a house door at night and out again; is the camera sane afterwards (flat pale-blue frame in 0.. sixcars still)?
import { boot, ev, sleep, done, shot } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 24 + 22; true`); await sleep(800);
const cam = () => J(`({ cp: camera.position.toArray().map(v => +v.toFixed(1)), q: camera.quaternion.toArray().map(v => +v.toFixed(2)), foot: FOOT.on, fx: +FOOT.x.toFixed(1), fz: +FOOT.z.toFixed(1), int: INT.on, ph: INT.ph, mode: camMode })`);
console.log("before", JSON.stringify(await cam()));
await ev(`(() => { const b = INT.beacons[0]; FOOT.on = true; FOOT.x = b.x + 4; FOOT.z = b.z + 4; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return true; })()`); await sleep(2500); console.log("settled", JSON.stringify(await cam()), await J(`({ fy: FOOT.y, sy: surf(FOOT.x, FOOT.z) })`)); await shot("probe_pre");
await ev(`(() => { const b = INT.beacons[0]; FOOT.on = true; FOOT.x = b.x; FOOT.z = b.z; FOOT.y = surf(b.x, b.z); recenter(b.x, b.z, true); intEnter(b); return true; })()`); await sleep(1500);
console.log("inside", JSON.stringify(await cam())); await shot("probe_inside");
await ev(`intGoOut(); true`); await sleep(2500);
console.log("after", JSON.stringify(await cam())); await shot("probe_after");
await done(0);
