// G1 turning on foot: how quickly the walker comes round with the keyboard. Measures by gameClock:
// turn 180° on the spot (hold D), a short tap of A (fine aim: degrees per tap), and a practical "door off to the
// side" test: a marker 15 m away at 90° off your heading; hold W, hold D until you face it within 5°, then W only
// until you're within 1.5 m. Also stills mid-turn (legs stepping round).
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_turn.mjs
import { boot, ev, st, shot, sideCam, camOff, park, tap, sleep, down, up, done } from "../lib.mjs";
await boot();
console.log("parked at", JSON.stringify(await park()));
await ev("WX.at = () => 0; GS.storm = 0; true");
await sleep(1500);
await tap("KeyQ"); await sleep(2500);
if (!(await st()).onFoot) { console.log("FAIL: not on foot"); await done(1); }
const S = "JSON.stringify({x: FOOT.x, z: FOOT.z, yaw: FOOT.yaw, t: gameClock})";
const g = async () => JSON.parse(await ev(S));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const deg = r => +(r * 180 / Math.PI).toFixed(1);

// 1) 180° on the spot, three tries
const spins = [];
for (let i = 0; i < 3; i++) {
  await sleep(800);
  const s0 = await g(); let s, turned = 0, prev = s0.yaw;
  await down("KeyD");
  try { for (;;) { await sleep(40); s = await g(); turned += Math.abs(wrap(s.yaw - prev)); prev = s.yaw; if (turned >= Math.PI || s.t - s0.t > 5) break; } }
  finally { await up("KeyD"); }
  spins.push(+(s.t - s0.t).toFixed(2));
  if (i === 1) { await sideCam(); await shot("01_after_spin"); await camOff(); }
}
console.log("180 on the spot game-s", JSON.stringify(spins));

// 2) taps: degrees per short tap (wall 70 ms; headless frame pacing varies, so report game time too)
const taps = [];
for (let i = 0; i < 4; i++) {
  await sleep(600);
  const s0 = await g(); await tap("KeyA", 70); await sleep(300); const s1 = await g();
  taps.push(deg(Math.abs(wrap(s1.yaw - s0.yaw))));
}
console.log("tap A degrees", JSON.stringify(taps));

// 3) door off to the side: target 15 m at 90° right of heading
const doors = [];
for (const side of [1, -1]) {
  await sleep(1000);
  const s0 = await g();
  // FOOT.yaw: forward = (sin yaw, cos yaw); D turns yaw negative (right)
  const ty = s0.yaw - side * Math.PI / 2, tx = s0.x + Math.sin(ty) * 15, tz = s0.z + Math.cos(ty) * 15;
  const turnKey = side > 0 ? "KeyD" : "KeyA";
  let s = s0, turning = true, faced = null;
  await down("KeyW"); await down(turnKey);
  try {
    for (;;) {
      await sleep(40); s = await g();
      const want = Math.atan2(tx - s.x, tz - s.z), err = wrap(want - s.yaw);
      if (turning && Math.abs(err) < 5 * Math.PI / 180) { await up(turnKey); turning = false; faced = +(s.t - s0.t).toFixed(2); }
      if (Math.hypot(tx - s.x, tz - s.z) < 1.5 || s.t - s0.t > 30) break;
    }
  } finally { await up("KeyW"); if (turning) await up(turnKey); }
  doors.push({ side, faced, arrived: +(s.t - s0.t).toFixed(2), miss: +Math.hypot(tx - s.x, tz - s.z).toFixed(2) });
}
console.log("door 15 m at 90deg", JSON.stringify(doors));

// still mid-turn on the spot
await sideCam(); await down("KeyD"); await sleep(500); await shot("02_mid_turn"); await up("KeyD"); await camOff();
const avg = a => +(a.reduce((p, c) => p + c, 0) / a.length).toFixed(2);
console.log(`SUMMARY spin180 ${avg(spins)} s; tap ${avg(taps)} deg; door faced ${avg(doors.map(d => d.faced ?? 99))} s arrived ${avg(doors.map(d => d.arrived))} s`);
await done();
