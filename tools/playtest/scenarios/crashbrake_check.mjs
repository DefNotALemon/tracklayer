import { boot, ev, sleep, done } from "../lib.mjs";
await boot();
await ev("tutSkip(); FOOT.on = false; true");

// 1) sled should brake to a stop after a crash eject, not coast
await ev(`(() => {
  P.x = 0; P.z = 0; P.y = surf(0,0) + 0.3; P.yaw = 0; P.vx = 0; P.vz = 25;
  crashEject('test', 0, 1, 25, null);
  return true;
})()`);
const t0 = await ev("gameClock");
let last = null;
for (let i = 0; i < 70; i++) {
  await sleep(150);
  const s = JSON.parse(await ev(`JSON.stringify({ t: gameClock, sledV: Math.hypot(P.vx, P.vz), crashSt: CRASH.st, crashV: Math.hypot(CRASH.vx, CRASH.vz), wx: CRASH.wx, gbdir: GB.dir })`));
  last = s;
}
console.log("brake check", JSON.stringify(last));
const sledStopped = last.sledV < 1.5;

// 2) get back on: brake should release and sled should respond to throttle again
await ev("(() => { if (CRASH.on) crashGetUp(); FOOT.on = false; return true; })()");
await sleep(500);
await ev("(() => { if (FOOT.on) resetSled(); return true; })()");
await sleep(300);

console.log("sled stopped under own brake:", sledStopped, "final sled mph:", (last.sledV*2.237).toFixed(1));
console.log("final crash wx (roll rate):", last.wx);
await done();
