// G3/G1 follow-up to v112 (over-the-shoulder camera on foot near a wall, camState.shK): the static check
// (g3_camshoulder.mjs) only sampled the settled slide standing still. This drives two dynamics the backlog
// flagged as unchecked: (1) walking AWAY from the door after the slide has settled -- does shK ease back to 0
// smoothly as wallK rises, or does it swing/pop? (2) turning on the spot at a door with the slide on -- does the
// shoulder offset hold steady through a 180 degree turn, or does it jump/overshoot?
// Env: CD_N (doors sampled, default 4). Run: tools/playtest/run.sh tools/playtest/scenarios/g3_camshoulder_dynamic.mjs
import { boot, ev, sleep, tap, shot, done, send } from "../lib.mjs";
const N = +(process.env.CD_N || 4);
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; true");
const doors = JSON.parse(await ev(`JSON.stringify(KIT.doors.filter(D => Math.hypot(D.x - depot.x, D.z - depot.z) < 140).slice(0, ${N}))`));
console.log("doors", doors.length);

async function place(D) {
  await ev(`(() => {
    const D = ${JSON.stringify(D)}, x = D.x + D.nx * (D.d / 2 + 1.5), z = D.z + D.nz * (D.d / 2 + 1.5), yaw = Math.atan2(D.nx, D.nz);
    camMode = 0;
    FOOT.on = true; FOOT.ski = false; FOOT.dig = false; FOOT.x = x; FOOT.z = z; FOOT.yaw = yaw;
    P.x = depot.x + 6; P.z = depot.z + 8; P.y = surf(P.x, P.z) + 0.3; recenter(x, z, true);
    FOOT.y = surf(x, z) + 0.1; FOOT.sp = 0; FOOT.fwd = 0; FOOT.turn = 0; if (FOOT.g) FOOT.g.visible = true;
    camState.init = false; camState.yaw = yaw; return 1;
  })()`);
}
const sample = () => ev(`(() => JSON.stringify({ t: +gameClock.toFixed(2), shK: +(camState.shK ?? 0).toFixed(3), wallK: +(camState.wallK ?? 1).toFixed(2), yaw: +FOOT.yaw.toFixed(2) }))()`);

// --- Phase A: walking away from one door after the slide settles ---
const Dw = doors[0];
await place(Dw);
await sleep(1800);
console.log("WALK-AWAY door0 settled:", await sample());
await shot("00_walkaway_settled");
const walkSamples = [];
// drive forward with W while sampling shK/wallK every ~0.35 game-s
async function keyDown(code) { await send("Input.dispatchKeyEvent", { type: "keyDown", code, key: "w", windowsVirtualKeyCode: 87 }); }
async function keyUp(code) { await send("Input.dispatchKeyEvent", { type: "keyUp", code, key: "w", windowsVirtualKeyCode: 87 }); }
await keyDown("KeyW");
const t0 = await ev("gameClock");
for (let i = 0; i < 12; i++) {
  await sleep(350);
  const s = JSON.parse(await sample());
  walkSamples.push(s);
  const tnow = await ev("gameClock");
  if (tnow - t0 > 6) break;
}
await keyUp("KeyW");
await shot("01_walkaway_after6s");
console.log("WALK-AWAY samples:", JSON.stringify(walkSamples));
const shkSeries = walkSamples.map(s => s.shK);
const maxJump = Math.max(...shkSeries.slice(1).map((v, i) => Math.abs(v - shkSeries[i])));
console.log(`RESULT walk-away: shK ${shkSeries[0]} -> ${shkSeries[shkSeries.length - 1]}, max step-to-step jump ${maxJump.toFixed(3)}, wallK end ${walkSamples[walkSamples.length - 1].wallK}`);

// --- Phase B: turning on the spot at a door with the slide on ---
const Dt = doors[Math.min(1, doors.length - 1)];
await place(Dt);
await sleep(1800);
const before = JSON.parse(await sample());
await shot("02_turn_before");
async function keyDownA() { await send("Input.dispatchKeyEvent", { type: "keyDown", code: "KeyD", key: "d", windowsVirtualKeyCode: 68 }); }
async function keyUpA() { await send("Input.dispatchKeyEvent", { type: "keyUp", code: "KeyD", key: "d", windowsVirtualKeyCode: 68 }); }
await keyDownA();
const turnSamples = [];
const tt0 = await ev("gameClock");
for (let i = 0; i < 10; i++) {
  await sleep(250);
  turnSamples.push(JSON.parse(await sample()));
  const tnow = await ev("gameClock");
  if (Math.abs(tnow - tt0) > 2.5) break;
}
await keyUpA();
await sleep(400);
const after = JSON.parse(await sample());
await shot("03_turn_after");
console.log("TURN samples:", JSON.stringify(turnSamples));
const turnShk = turnSamples.map(s => s.shK);
const turnMaxJump = Math.max(...turnShk.slice(1).map((v, i) => Math.abs(v - turnShk[i])));
console.log(`RESULT turn-on-spot: yaw ${before.yaw} -> ${after.yaw}, shK ${before.shK} -> steady ${turnShk[Math.floor(turnShk.length/2)]} -> ${after.shK}, max step jump ${turnMaxJump.toFixed(3)}`);

await done();
