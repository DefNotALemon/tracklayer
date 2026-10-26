// G2: verify v114 Sprint 580 SX trail gearing BY HAND, follow-up to the backlog item after report 0045/g2_sprint.mjs
// (which rode yaw-pinned). Two checks:
//   A) steering feel: hold W + tap A/D periodically (simulates a player correcting line) on a cut trail and on
//      lake ice, for Sprint vs Summit. If the trail perk makes the Sprint twitchy/over-fast it should show as
//      more crashes or wider lateral wander than the Summit under the SAME input.
//   B) ice top-speed sanity (b58 note: every sled hit 121-137 mph on ice from rest in 14s): widen the sled list
//      (ranger/sprint/summit/apex) and report top mph on ice to see how close together they really are.
// Env: FS_SECS=10
// Run: tools/playtest/run.sh tools/playtest/scenarios/g2_sprint_feel.mjs
import { boot, ev, sleep, down, up, shot, done, park } from "../lib.mjs";
const SECS = +(process.env.FS_SECS || 10);
await boot();
await ev(`(() => { WX.at = () => 0; if (WX.atT) WX.atT = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 1e6;
  GS.own.sleds = SLEDS.map(s => s.id); return true; })()`);

async function setupAt(sled, x, z, yaw) {
  await ev(`(() => { P.x = ${x}; P.z = ${z}; P.y = surf(${x}, ${z}) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = ${yaw};
    recenter(${x}, ${z}, true); GS.own.sled = "${sled}"; restat(); applyLoadout(); GS.fuel = 99; GS.warmth = 100;
    window.__sp = { x: P.x, z: P.z, yaw: ${yaw} }; return true; })()`);
}

// Cut a straight trail by riding it once, then come back for the steering test on the packed groove.
async function cutTrail(sled, x, z, yaw) {
  await setupAt(sled, x, z, yaw);
  await sleep(600);
  await down("KeyW");
  const t0 = await ev("gameClock");
  for (;;) { await sleep(250); const t = await ev("gameClock"); if (t - t0 >= 8) break; }
  await up("KeyW");
  await ev("P.vx = P.vz = 0; true"); await sleep(400);
}

// Hold W, tap A/D on a fixed cadence (simulates mild correction), track crashes + lateral wander off the start line.
async function steerTest(label, sled, surf, x, z, yaw) {
  await setupAt(sled, x, z, yaw);
  await sleep(500);
  const t0 = await ev("gameClock");
  let maxOff = 0, crashed = false, taps = 0, n = 0;
  await down("KeyW");
  try {
    for (;;) {
      // alternate a quick A then D tap every ~1.5 game-s of wall time to simulate correction
      if (taps % 2 === 0) { await down("KeyA"); await sleep(90); await up("KeyA"); } else { await down("KeyD"); await sleep(90); await up("KeyD"); }
      taps++;
      await sleep(700);
      const q = JSON.parse(await ev(`(() => { const c = window.__sp;
        const along = (P.x - c.x) * Math.sin(c.yaw) + (P.z - c.z) * Math.cos(c.yaw);
        const side = (P.x - c.x) * Math.cos(c.yaw) - (P.z - c.z) * Math.sin(c.yaw);
        return JSON.stringify({ t: gameClock, side, mph: Math.hypot(P.vx, P.vz) * 2.237, crash: !!(CRASH.on || FOOT.on) }); })()`));
      maxOff = Math.max(maxOff, Math.abs(q.side)); n++;
      if (q.crash) { crashed = true; break; }
      if (q.t - t0 >= SECS) break;
    }
  } finally { await up("KeyW"); await up("KeyA"); await up("KeyD"); }
  const row = { sled, surf, label, maxSideM: +maxOff.toFixed(2), crashed, taps };
  console.log("STEER " + JSON.stringify(row));
  return row;
}

async function iceTopSpeed(sled, x, z, yaw) {
  await setupAt(sled, x, z, yaw);
  await sleep(500);
  const t0 = await ev("gameClock"); let maxMph = 0;
  await down("KeyW");
  try {
    for (;;) {
      await sleep(250);
      const q = JSON.parse(await ev(`JSON.stringify({ t: gameClock, mph: Math.hypot(P.vx, P.vz) * 2.237, crash: !!(CRASH.on || FOOT.on) })`));
      maxMph = Math.max(maxMph, q.mph);
      if (q.crash || q.t - t0 >= 14) break;
    }
  } finally { await up("KeyW"); }
  const row = { sled, topMph: Math.round(maxMph) };
  console.log("ICETOP " + JSON.stringify(row));
  return row;
}

const rows = [];

// --- A) steering feel on trail: Sprint vs Summit, same cadence of A/D taps ---
let park1 = JSON.parse(JSON.stringify(await park("SPAWN.x + 700", "SPAWN.z - 400")));
for (const sled of ["sprint", "summit"]) {
  const x = park1.x, z = park1.z;
  await cutTrail(sled, x, z, 0);
  rows.push(await steerTest("trail", sled, "trail", x, z, 0));
}
await shot("01_trail_steer_end");

// --- A2) steering feel on lake ice: Sprint vs Summit ---
const lakeInfo = JSON.parse(await ev("JSON.stringify({ x: LAKES[0].x, z: LAKES[0].z })"));
for (const sled of ["sprint", "summit"]) {
  const a = 0.4, x = lakeInfo.x - Math.sin(a) * 200, z = lakeInfo.z - Math.cos(a) * 200;
  rows.push(await steerTest("ice", sled, "ice", x, z, a));
}
await shot("02_ice_steer_end");

// --- B) ice top speed sanity across the ladder ---
const topRows = [];
for (const sled of ["ranger", "sprint", "summit", "apex"]) {
  const a = 1.1, x = lakeInfo.x - Math.sin(a) * 220, z = lakeInfo.z - Math.cos(a) * 220;
  topRows.push(await iceTopSpeed(sled, x, z, a));
}

console.log("SUMMARY-STEER " + JSON.stringify(rows));
console.log("SUMMARY-ICETOP " + JSON.stringify(topRows));
await done();
