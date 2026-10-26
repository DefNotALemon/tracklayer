// G1 follow-up to v111 (held-turn ramp 2.2 -> 3.6 rad/s over 0.12-0.45s): does it feel right with the REAL chase
// camera at a door (not the sideCam override), and is the same ramp twitchy for small stick deflections (TC.steer
// just over the 0.12 analog deadzone) vs a full stick push? Stands the rider just out from a lit town door, camera
// in normal chase mode (camMode=0), holds a 90 degree turn with D (keyboard) and separately with TC.steer at two
// magnitudes (touch-stick path shares FOOT.turn = analog with the keyboard path). Measures yaw rate over time by
// gameClock and shoots the real chase view before/mid/after.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_turn_door.mjs
import { boot, ev, sleep, shot, down, up, done } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; true");
const door = JSON.parse(await ev(`JSON.stringify(KIT.doors.filter(D => Math.hypot(D.x - depot.x, D.z - depot.z) < 140)[2])`));
console.log("door", JSON.stringify(door));
await ev(`(() => {
  const D = ${JSON.stringify(door)}, out = D.d / 2 + 1.5, x = D.x + D.nx * out, z = D.z + D.nz * out, yaw = Math.atan2(D.nx, D.nz);
  camMode = 0; FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = x; FOOT.z = z; FOOT.yaw = yaw;
  P.x = depot.x + 6; P.z = depot.z + 8; P.y = surf(P.x, P.z) + 0.3;
  FOOT.y = surf(x, z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; if (FOOT.g) FOOT.g.visible = true;
  recenter(x, z, true); camState.init = false; camState.yaw = yaw; return true;
})()`);
await sleep(1500);
await shot("00_at_door_before");

const S = "JSON.stringify({yaw: FOOT.yaw, t: gameClock, turnK: +(F? F.turnK||1 : 1)})";
const g = async () => JSON.parse(await ev(S).catch(() => ev("JSON.stringify({yaw: FOOT.yaw, t: gameClock})")));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// 1) keyboard held D at the door, camera follows live (real chase cam)
const s0 = await g();
await down("KeyD");
await sleep(600); await shot("01_mid_turn_keyboard");
let s = s0, turned = 0, prev = s0.yaw, samples = [];
for (;;) {
  await sleep(50); const n = await g();
  turned += Math.abs(wrap(n.yaw - prev)); prev = n.yaw; samples.push(+(n.t - s0.t).toFixed(2));
  if (turned >= Math.PI / 2 || n.t - s0.t > 4) { s = n; break; }
}
await up("KeyD");
await sleep(800); await shot("02_after_90_keyboard");
console.log("keyboard 90deg turn game-s", +(s.t - s0.t).toFixed(2), "camera-follow ok (see stills 01/02)");

// 2) touch-stick emulation at two magnitudes: TC.steer feeds `analog` the same way as gamepad axis, bypassing the
// need for a real pad. Deadzone is 0.12; try a bare-minimum deflection and a full push, same hold duration.
async function stickRun(val, label) {
  await ev(`FOOT.turn = 0; TC.on = true; TC.active = true; TC.steer = ${val}; true`);
  const a = await g();
  await sleep(500); // >0.45s ramp window
  const b = await g();
  await ev("TC.active = false; TC.steer = 0; FOOT.turn = 0; true");
  const dyaw = Math.abs(wrap(b.yaw - a.yaw)), dt = b.t - a.t;
  console.log(`stick ${label} steer=${val}: dyaw=${dyaw.toFixed(3)} rad over ${dt.toFixed(2)} game-s -> avg rate ${(dyaw/dt).toFixed(2)} rad/s`);
  return dyaw / dt;
}
await sleep(500);
const rateSmall = await stickRun(0.15, "small (just past deadzone)");
await sleep(500);
const rateBig = await stickRun(0.95, "full push");
console.log(`SUMMARY keyboard90=${(s.t - s0.t).toFixed(2)}s rateSmall=${rateSmall.toFixed(2)} rateBig=${rateBig.toFixed(2)} ratio(big/small)=${(rateBig/rateSmall).toFixed(2)} (expect ~${(0.95/0.15).toFixed(2)} if proportional/not-twitchy)`);
await done();
