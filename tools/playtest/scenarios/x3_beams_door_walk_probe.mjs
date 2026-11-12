// Probe: a real walk through a house door at night and back out (keys), is the world still drawn afterwards?
import { boot, ev, sleep, done, shot, hold, down, up } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 24 + 22; true`); await sleep(800);
const info = () => J(`({ int: INT.on, ph: INT.ph, foot: FOOT.on, fx: +FOOT.x.toFixed(1), fz: +FOOT.z.toFixed(1), fog: !!scene.fog, bg: scene.background ? scene.background.isColor ? scene.background.getHexString() : "tex" : null, vis: [scene.visible], err: window.__err || null })`);
const b = await J(`(() => { const b = INT.beacons[0]; return { x: b.x, z: b.z, ry: b.ry }; })()`);
console.log("door", JSON.stringify(b));
// stand 7 m out along the door's facing, look at it
await ev(`(() => { const b = INT.beacons[0]; const fx = Math.sin(b.ry), fz = Math.cos(b.ry); FOOT.on = true; FOOT.x = b.x + fx * 7; FOOT.z = b.z + fz * 7; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = Math.atan2(-fx, -fz); recenter(FOOT.x, FOOT.z, true); return true; })()`); await sleep(2500);
await shot("walk_0pre"); console.log("pre", JSON.stringify(await info()));
await down("KeyW"); let t = 0; while (t < 80 && !(await J(`INT.on`))) { await sleep(150); t++; } await up("KeyW");
console.log("entered after polls", t, JSON.stringify(await info())); await sleep(1500); await shot("walk_1inside");
await down("KeyS"); t = 0; while (t < 100 && (await J(`INT.on`))) { await sleep(150); t++; } await up("KeyS");
console.log("left after polls", t, JSON.stringify(await info())); await sleep(2500); await shot("walk_2out");
await done(0);
