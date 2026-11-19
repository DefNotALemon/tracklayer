// Beta (0302): pickup with blade down parked in uncut snow: does holding S back it out (the hint says to)? Compare blade up. Exit 1 on FAIL.
import { boot, ev, sleep, done, down, up, tap, park } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(100); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 60000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const U = JSON.stringify(await ev(`TLXV.state().owned[0].uid`));
await ev(`TLXPL.fit(${U}, "b23"); TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(800);
for (const dn of [false, true]) {
  await ev(`crashCancel(); FOOT.on = false; true`); await park(); await sleep(500);
  await ev(`TLXPL.rt(${U}).down = ${dn}; true`); await sleep(300);
  const p0 = await J(`({ x: P.x, z: P.z, gnd: P.gnd, hint: String(TLXPL.hint() || "").slice(0, 60) })`);
  await down("KeyS"); await waitGame(4); await up("KeyS");
  const p1 = await J(`({ x: P.x, z: P.z, v: Math.hypot(P.vx, P.vz), gear: GB.gear, dir: GB.dir })`);
  const d = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  console.log("  blade", dn ? "down" : "up", JSON.stringify(p0), JSON.stringify(p1), "moved", d.toFixed(2));
  ok(d > 2, `S backs out with blade ${dn ? "down" : "up"} (${d.toFixed(2)} m in 4 s)`);
  await down("KeyW"); await waitGame(5); await up("KeyW");
  const p2 = await J(`({ x: P.x, z: P.z })`); const d2 = Math.hypot(p2.x - p1.x, p2.z - p1.z);
  console.log("   then W 5 s moved", d2.toFixed(2));
}
await done(fails ? 1 : 0);
