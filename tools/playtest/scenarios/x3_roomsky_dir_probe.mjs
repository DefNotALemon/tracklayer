// Probe: is the black night sky when facing yaw 1.57 (east) at the Sandfjorddalen cabin caused by the cabin visit, or just the view direction?
import { boot, ev, sleep, done, shot } from "../lib.mjs";
await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 24 + 22; true`); await sleep(800);
await ev(`(() => { const b = INT.beacons[0]; const fx = Math.sin(b.ry), fz = Math.cos(b.ry); FOOT.on = true; FOOT.x = b.x + fx * 2; FOOT.z = b.z + fz * 2; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return true; })()`);
for (const yaw of [1.57, -1.57, 0, 3.14, 1.57]) { await ev(`FOOT.yaw = ${yaw}; true`); await sleep(2500); await shot("v_" + yaw + "_" + Math.floor(Math.random() * 1000)); console.log("shot yaw", yaw); }
await done(0);
