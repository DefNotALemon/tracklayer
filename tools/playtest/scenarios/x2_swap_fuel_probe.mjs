// Probe: does a parked/idle truck's fuel creep up near the depot? Run via run.sh.
import { boot, ev, tap, sleep, done } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 20000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
const f = () => J(`({ fuel: +GS.fuel.toFixed(2), cur: TLX.state("vehicles").cur, rec: TLX.state("vehicles").owned.map(r=>+(r.fuel||0).toFixed(2)), foot: FOOT.on, vcur: !!VEH.cur, clock: +gameClock.toFixed(1) })`);
console.log("after buy", JSON.stringify(await f()));
await ev(`GS.fuel = 12; true`);
for (let i = 0; i < 6; i++) { await sleep(1000); console.log("t" + i, JSON.stringify(await f())); }
const u = await ev(`TLX.state("vehicles").owned[0].uid`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const cur = TLX.state("vehicles").cur === r.uid; const x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw); crashCancel(); FOOT.on = true; FOOT.x = x + fz*3 - fx*0.3; FOOT.z = z - fx*3 - fz*0.3; FOOT.yaw = yaw-1.4; FOOT.y = surf(FOOT.x,FOOT.z); FOOT.sp=0; recenter(FOOT.x,FOOT.z,true); return 1; })()`);
await sleep(900); console.log("on foot", JSON.stringify(await f()));
await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur"); await sleep(300);
console.log("boarded", JSON.stringify(await f()));
await ev(`GS.fuel = 12; true`);
for (let i = 0; i < 4; i++) { await sleep(1000); console.log("t" + i, JSON.stringify(await f())); }
await done(0);
