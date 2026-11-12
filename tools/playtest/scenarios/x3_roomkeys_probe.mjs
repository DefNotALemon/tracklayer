// Probe: inside a room, which way does each key move you, and can you reach the way-out ring by keys alone?
import { boot, ev, sleep, done, shot, down, up } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 24 + 10; true`); await sleep(800);
await ev(`(() => { const b = INT.beacons[0]; const fx = Math.sin(b.ry), fz = Math.cos(b.ry); FOOT.on = true; FOOT.x = b.x + fx * 7; FOOT.z = b.z + fz * 7; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = Math.atan2(-fx, -fz); recenter(FOOT.x, FOOT.z, true); return true; })()`); await sleep(800);
await down("KeyW"); let t = 0; while (t < 80 && !(await J(`INT.on`))) { await sleep(150); t++; } await up("KeyW");
await sleep(2000);
const pos = () => J(`({ px: +INT.px.toFixed(2), pz: +INT.pz.toFixed(2), ph: INT.ph, on: INT.on, ex: +INT.room.exit.x.toFixed(2), ez: +INT.room.exit.z.toFixed(2), hx: INT.room.hx, hz: INT.room.hz, keys: Object.keys(INT).join(",") })`);
console.log("start", JSON.stringify(await pos())); await shot("p_in");
for (const k of ["KeyW", "KeyS", "KeyA", "KeyD", "ArrowUp", "ArrowDown"]) { const a = await pos(); await down(k); await sleep(900); await up(k); await sleep(300); const c = await pos(); console.log(k, "dx", (c.px - a.px).toFixed(2), "dz", (c.pz - a.pz).toFixed(2), "ph", c.ph, "on", c.on); if (!c.on) break; }
await shot("p_after");
await done(0);
