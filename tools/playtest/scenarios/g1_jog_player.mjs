// G1 playtest follow-up to v96 (Shift jog): play it like a player, not just isolated 20 m reps.
// Jog from the depot yard to a shore-road door (mixed powder + plowed lane), then jog up a town-adjacent
// slope. Tracks: toast repetition (does "Out of breath" nag?), whether the walker's jog pose reads as a
// jog in stills, and whether 20 m of fresh powder blowing you in ~11 s (v96's number) feels harsh in a real
// walk with turns, not a straight 20 m line.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_jog_player.mjs
import { boot, ev, shot, sideCam, camOff, sleep, down, up, tap, done } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; true");

// pick a shore-road door (same lot table as g1_lanes.mjs) and a nearby town-adjacent slope
const info = JSON.parse(await ev(`JSON.stringify((() => {
  const lots = [[46, 26, 7, 0.2], [46, -12, 6, -0.15], [18, 40, 7, 1.5], [-16, 44, 6, 1.6], [-40, 20, 7, -1.5], [-38, -16, 6, -1.4]];
  const [ox, oz, d, r] = lots[2]; // a shore-road door a real walk away, not right at the depot
  const door = { x: depot.x + ox + Math.sin(r) * (d / 2 + 5), z: depot.z + oz + Math.cos(r) * (d / 2 + 5) };
  const start = { x: depot.x - 5, z: depot.z };
  let slope = null, bs = 0;
  for (let rr = 40; rr < 400; rr += 20) for (let a = 0; a < 6.28; a += 0.3) {
    const x = depot.x + Math.cos(a) * rr, z = depot.z + Math.sin(a) * rr;
    if (isSea(x, z) || obNear(x, z, 15)) continue;
    const s = slopeAt(x, z, 10);
    if (s > 0.12 && s < 0.3) { const sc = 1 - Math.abs(s - 0.2); if (sc > bs) { bs = sc; slope = { x: Math.round(x), z: Math.round(z), sl: +s.toFixed(3) }; } }
  }
  return { door: { x: +door.x.toFixed(1), z: +door.z.toFixed(1) }, start, slope };
})())`));
console.log("route info", JSON.stringify(info));
if (!info.slope) console.log("WARN: no town-adjacent slope found in range, skipping slope leg");

await ev(`P.x = ${info.start.x} + 6; P.z = ${info.start.z} + 8; P.y = surf(P.x, P.z) + 0.3; true`);
await sleep(600); await tap("KeyQ"); await sleep(2500);
if (!(await ev("!!FOOT.on"))) { console.log("FAIL: not on foot"); await done(1); }
await ev(`FOOT.x = ${info.start.x}; FOOT.z = ${info.start.z}; FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; camState.init = false; true`);
await sleep(300);

const S = () => ev(`JSON.stringify({x: FOOT.x, z: FOOT.z, t: gameClock, sp: +FOOT.sp.toFixed(2), wind: +(FOOT.wind||0).toFixed(2), blown: !!FOOT.blown, tired: +FOOT.tired.toFixed(2)})`);
let toastLog = [];
await ev(`(() => { window.__toastLog = []; const _t = toast; window.toast = (msg, kind) => { window.__toastLog.push([+gameClock.toFixed(1), msg]); return _t(msg, kind); }; true; })()`);

// walk-to-door leg: steer toward the door each tick, Shift held the whole way (a player holding jog on the stick)
async function jogTo(tx, tz, capSecs, label) {
  const s0 = JSON.parse(await S()); let s = s0, blownAt = null, samples = [];
  await down("KeyW"); await down("ShiftLeft");
  try {
    for (;;) {
      await sleep(150);
      await ev(`FOOT.yaw = Math.atan2(${tx} - FOOT.x, ${tz} - FOOT.z); true`);
      s = JSON.parse(await S());
      if (s.blown && !blownAt) blownAt = [+(s.t - s0.t).toFixed(1)];
      samples.push([+(s.t - s0.t).toFixed(1), s.sp, s.wind]);
      const d = Math.hypot(tx - s.x, tz - s.z);
      if (d < 2.5 || s.t - s0.t > capSecs) break;
    }
  } finally { await up("KeyW"); await up("ShiftLeft"); }
  const m = Math.hypot(s.x - s0.x, s.z - s0.z), dt = s.t - s0.t;
  const r = { label, m: +m.toFixed(1), secs: +dt.toFixed(1), avg: +(m / dt).toFixed(2), reached: Math.hypot(tx - s.x, tz - s.z) < 2.5, blownAt, finalWind: s.wind };
  console.log(label, JSON.stringify(r), "samples(every4th)", JSON.stringify(samples.filter((_, i) => i % 4 === 0)));
  return r;
}

await sideCam(); await shot("00_start_depot"); await camOff();
const leg1 = await jogTo(info.door.x, info.door.z, 60, "depot->door jog");
await sideCam(); await shot("01_at_door"); await camOff();

// rest a little (as a player would at a door) then jog the slope
await ev(`FOOT.wind = Math.max(0, FOOT.wind - 0.3); FOOT.blown = false; true`);
await sleep(500);

let legSlope = null;
if (info.slope) {
  await ev(`FOOT.x = ${info.slope.x} - 8; FOOT.z = ${info.slope.z} - 8; FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; FOOT.yaw = Math.atan2(${info.slope.x} - FOOT.x, ${info.slope.z} - FOOT.z); FOOT.wind = 0; FOOT.blown = false; FOOT.tired = 0; camState.init = false; true`);
  await sleep(400);
  await sideCam(); await shot("02_slope_before"); await camOff();
  legSlope = await jogTo(info.slope.x, info.slope.z, 20, "slope jog (grade " + info.slope.sl + ")");
  await sideCam(); await shot("03_slope_after"); await camOff();
}

// touch-lean path: the touch control sets the same `lean` var readInput feeds into FOOT.jog; confirm it's wired
// (can't press the DOM touch button headless, so check the variable path directly)
const leanWired = await ev("typeof FOOT.jog === 'number' || typeof FOOT.jog === 'boolean'");
console.log("FOOT.jog variable present (touch lean target):", leanWired);

toastLog = JSON.parse(await ev("JSON.stringify(window.__toastLog || [])"));
console.log("toast log [t, msg]:", JSON.stringify(toastLog));
console.log(`SUMMARY leg1 ${JSON.stringify(leg1)}`);
if (legSlope) console.log(`SUMMARY slope ${JSON.stringify(legSlope)}`);
console.log(`toast count: ${toastLog.length}`);
await done();
