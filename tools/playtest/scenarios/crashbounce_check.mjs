import { boot, ev, sleep, done } from "../lib.mjs";
await boot();
await ev("tutSkip(); FOOT.on = false; true");

// high-speed crash: expect one real bounce (vy upward on first ground hit) then settle, with a tamer roll rate
await ev(`(() => {
  P.x = 0; P.z = 0; P.y = surf(0,0) + 0.3; P.yaw = 0; P.vx = 0; P.vz = 25;
  crashEject('test', 0, 1, 25, null);
  return true;
})()`);
let sawBounce = false, maxWx = 0, downAt = null, sledStoppedAt = null;
for (let i = 0; i < 160; i++) {
  await sleep(100);
  const s = JSON.parse(await ev(`JSON.stringify({ t: gameClock, st: CRASH.on ? CRASH.st : 'off', vy: CRASH.vy, wx: CRASH.wx, gnd: CRASH.gnd, bounce: CRASH.bounce, sledV: Math.hypot(P.vx,P.vz) })`));
  if (s.gnd && s.vy > 1.2) sawBounce = true;
  if (Math.abs(s.wx) > maxWx) maxWx = Math.abs(s.wx);
  if (s.st === "down" && downAt === null) downAt = s.t;
  if (s.sledV < 0.3 && sledStoppedAt === null) sledStoppedAt = s.t;
  if (s.st === "off" && downAt !== null) break;
}
console.log("sawBounce(after ground impact, vy kicked back up):", sawBounce);
console.log("max roll rate (wx):", maxWx.toFixed(2));
console.log("time to 'down' (lying still):", downAt);
console.log("time sled stopped under brake:", sledStoppedAt);
await done();
