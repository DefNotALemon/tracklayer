// Beta follow-up for the swing: why did Q refuse to get off Santa's sled right after a swap? Waits for settling, reports speed/ground.
import { boot, ev, tap, sleep, done, park } from "../lib.mjs";
await boot(); await ev("tutSkip(); GS.hour = 12; WX.at = () => 0; GS.storm = 0; true"); await park(); await sleep(1500);
const S = () => ev(`JSON.stringify({ foot: FOOT.on, dmt: DMT.on, v: Math.hypot(P.vx, P.vz), gnd: P.gnd, wet: P.wet, toast: (document.getElementById('toast') || {}).textContent })`);
let fails = 0;
for (const wait of [500, 4000]) {
  await ev(`GS.own.sled = "santa"; restat(); crashCancel(); FOOT.on = false; MNT.on = DMT.on = false; true`); await park(); await sleep(wait);
  console.log("wait", wait, "before Q:", await S()); await tap("KeyQ"); await sleep(3500); const s = JSON.parse(await S()); console.log("after Q:", JSON.stringify(s));
  if (!s.foot) fails++;
}
console.log(fails ? "FAIL: Q did not get off" : "ALL OK"); await done(fails ? 1 : 0);
