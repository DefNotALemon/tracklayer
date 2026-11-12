// Probe: does the night sky (stars, aurora, background) survive a cabin visit? before enter vs after exit, 2 s / 8 s.
import { boot, ev, sleep, done, shot, down, up } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); WX.at = () => 0; GS.storm = 0; GS.hour = 24 + 22; true`); await sleep(800);
const sky = () => J(`(() => { const c = camera; const d = new THREE.Vector3(); camera.getWorldDirection(d); return { bg: scene.background ? (scene.background.isColor ? scene.background.getHexString() : "tex") : null, fog: scene.fog ? scene.fog.color.getHexString() : null, camy: +d.y.toFixed(2), yaw: +FOOT.yaw.toFixed(2), foot: FOOT.on, int: INT.on, camPos: [c.position.x, c.position.y, c.position.z].map(v => +v.toFixed(1)), stars: (typeof stars !== "undefined" && stars) ? stars.visible : "n/a" }; })()`);
await ev(`(() => { const b = INT.beacons[0]; const fx = Math.sin(b.ry), fz = Math.cos(b.ry); FOOT.on = true; FOOT.x = b.x + fx * 7; FOOT.z = b.z + fz * 7; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = Math.atan2(-fx, -fz); recenter(FOOT.x, FOOT.z, true); return true; })()`); await sleep(2500);
console.log("before", JSON.stringify(await sky())); await shot("s0_before");
await down("KeyW"); let t = 0; while (t < 80 && !(await J(`INT.on`))) { await sleep(150); t++; } await up("KeyW"); await sleep(1500);
for (let i = 0; i < 90 && (await J(`INT.on`)); i++) {
  const g = await J(`(() => { const dx = INT.room.exit.x - INT.px, dz = INT.room.exit.z - INT.pz; let e = Math.atan2(dx, dz) - FOOT.yaw; e = Math.atan2(Math.sin(e), Math.cos(e)); return { e }; })()`);
  if (Math.abs(g.e) > 0.25) { const k = g.e > 0 ? "KeyA" : "KeyD"; await down(k); await sleep(Math.min(300, 80 + Math.abs(g.e) * 150)); await up(k); await sleep(120); }
  else { await down("KeyW"); await sleep(250); await up("KeyW"); await sleep(100); }
}
for (const w of [300, 2000, 6000]) { await sleep(w); console.log("after +" + w, JSON.stringify(await sky())); await shot("s1_after_" + w); }
// turn the walker around to face the door side and the open side, and look at the sky
await ev(`FOOT.yaw += Math.PI; true`); await sleep(1500); console.log("turned", JSON.stringify(await sky())); await shot("s2_turned");
await done(0);
