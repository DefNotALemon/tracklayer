// Probe: rescue at the steep-shore sample points from x3_rescue_break (slope 0.4-1.0 landing). What happens to the sled after?
import { boot, ev, sleep, done, tap, shot } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(600);
for (const [x, z] of [[-2216, -745], [-1842, -469], [-3345, 1726]]) {
  await ev(`(() => { BOG.on = false; crashCancel(); HELP.dryT = 0; P.x = ${x}; P.z = ${z}; P.yaw = 0; P.vx = P.vz = P.vy = 0; P.y = 0.5; recenter(P.x, P.z, true); return 1; })()`);
  await waitGame(2); await tap("KeyP"); await sleep(300);
  let t = 0; while ((await ev("HELP.on")) && t < 90) { await waitGame(2); t += 2; }
  const a = await J(`({ x: P.x, z: P.z, slope: slopeAt(P.x, P.z, 3), wet: P.wet, bog: BOG.on, crash: !!(typeof CR !== "undefined" && CR && CR.on) })`);
  console.log(x, z, "landed", JSON.stringify(a));
  await shot(`cliff_${x}`);
  await waitGame(8);
  const b = await J(`({ moved: Math.hypot(P.x - ${a.x}, P.z - ${a.z}), wet: P.wet, bog: BOG.on, v: Math.hypot(P.vx, P.vz), y: P.y, ground: groundAt(P.x, P.z), cash: GS.cash, stuck: P.stuckT })`);
  console.log("  8 s later", JSON.stringify(b));
}
await done(0);
