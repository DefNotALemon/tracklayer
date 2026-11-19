// Probe: does the sled itself move on flat ground with a 15% trigger / W, after the truck was left? (beta 80c2d89)
import { boot, ev, tap, sleep, done, down, up, errors, padSet } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; VEH.cur = null; WX.at = () => 0; GS.storm = 0; P.vx = P.vz = 0; true`); await sleep(1500);
const s0 = await J(`{ x: P.x, z: P.z, fuel: GS.fuel, st: typeof started !== "undefined" ? started : null, cur: !!VEH.cur, foot: FOOT.on, hand: !!GS.hand }`); console.log("start", JSON.stringify(s0));
for (const [lab, f] of [["pad 15%", () => padSet({ 7: 0.15 }, [0, 0, 0, 0])], ["pad 100%", () => padSet({ 7: 1 }, [0, 0, 0, 0])], ["W", () => down("KeyW")]]) {
  const x0 = await J(`[P.x, P.z]`); await f(); await sleep(4000);
  const q = await J(`{ d: Math.hypot(P.x - ${x0[0]}, P.z - ${x0[1]}), v: Math.hypot(P.vx, P.vz), thr: input.thr }`); await padSet(); await up("KeyW"); await sleep(1500);
  console.log(lab, JSON.stringify(q));
}
console.log(errors.length ? errors.join("|") : "no errors"); await done(0);
