// beta of v219 footcam fix: the 0165 symptom itself (flat pale grey-blue upper frame at night) at the Sandfjorddalen door,
// 8 yaws, at 3 spots (2 m, 5 m, 9 m out), plus a walk with W straight at the cabin wall. Stills; flatness measured on the
// top third of each still by the caller (imgstats). Prints camera finite + height above ground.
import { boot, ev, sleep, shot, hold, done } from "../lib.mjs";
await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 24 + 22; true`); await sleep(800);
for (const d of [2, 5, 9]) {
  for (let k = 0; k < 8; k++) {
    const yaw = (k * Math.PI) / 4;
    await ev(`(() => { if (INT.on) intGoOut(); const b = INT.beacons[0]; FOOT.on = true; FOOT.x = b.x + Math.sin(b.ry) * ${d}; FOOT.z = b.z + Math.cos(b.ry) * ${d}; FOOT.y = surf(FOOT.x, FOOT.z) + 0.05; FOOT.yaw = ${yaw}; recenter(FOOT.x, FOOT.z, true); camState.init = false; camState.yaw = ${yaw}; return true; })()`);
    await sleep(1800);
    const q = JSON.parse(await ev(`JSON.stringify({ fin: isFinite(camera.quaternion.x) && isFinite(camera.position.y), up: +(camera.position.y - groundAt(camera.position.x, camera.position.z)).toFixed(2), int: !!INT.on })`));
    console.log(`d${d} yaw${k}`, JSON.stringify(q));
    await shot(`d${d}_y${k}`);
  }
}
// walk into the wall: face the cabin from 6 m, hold W 5 s of wall time, then look at where the camera ended up
await ev(`(() => { const b = INT.beacons[0]; FOOT.x = b.x + Math.sin(b.ry) * 6; FOOT.z = b.z + Math.cos(b.ry) * 6; FOOT.y = surf(FOOT.x, FOOT.z) + 0.05; FOOT.yaw = b.ry + Math.PI; recenter(FOOT.x, FOOT.z, true); camState.init = false; camState.yaw = FOOT.yaw; return true; })()`);
await sleep(1000);
await hold("KeyW", 5000);
const w = JSON.parse(await ev(`JSON.stringify({ int: !!(INT.on || INT.ph), fin: isFinite(camera.position.x), up: +(camera.position.y - groundAt(camera.position.x, camera.position.z)).toFixed(2) })`));
console.log("walk into door", JSON.stringify(w)); await shot("walkin");
await done(0);
