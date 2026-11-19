// Beta test for 2.3 (Fjellvogn pickup): short cash, old-save buy, reload mid-mount / mid-drive / mid-dismount, night.
import { boot, ev, tap, hold, sleep, done, reload, shot, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(100); } return false; }
const st = () => J(`({ cur: TLX.state("vehicles").cur, vcur: !!VEH.cur, foot: FOOT.on, mnt: MNT.on, dmt: DMT.on, fuel: GS.fuel, n: TLX.state("vehicles").owned.length, cash: GS.cash,
  fin: [P.x, P.z, P.y, P.yaw, FOOT.x, FOOT.z, camera.position.x, camera.position.y, camera.quaternion.w].every(isFinite), tabs: !!document.querySelector("#garageBody") })`);
const buy = async () => { await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`); };
const beside = uid => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(o => o.uid === "${uid}"); const x = s.cur === r.uid ? P.x : r.x, z = s.cur === r.uid ? P.z : r.z, yaw = s.cur === r.uid ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  crashCancel(); FOOT.on = true; FOOT.x = x + fz * 3 - fx * 0.3; FOOT.z = z - fx * 3 - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; true`); await sleep(500);
// A. short cash: the price is refused, nothing owned, no cash taken
await ev(`GS.cash = 100; true`); await buy();
let s = await st();
ok(s.n === 0 && s.cash === 100, `short of cash: refused (owned ${s.n}, cash ${s.cash})`);
// B. buy it
await ev(`GS.cash = 5000; true`); await buy(); s = await st();
ok(s.n === 1 && s.cash < 5000 && s.cash >= 0, `bought one truck (owned ${s.n}, cash ${s.cash})`);
// buying again quickly (double click) must not make a 2nd for the same row unless affordable
await ev(`GS.cash = 5000; true`);
const uid = (await J(`TLX.state("vehicles").owned[0].uid`));
await ev(`(() => { const g = TLX.state("vehicles"); for (let r = 500; r < 1500; r += 40) for (let a = 0; a < 6.28; a += 0.4) { const x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r; if (!isSea(x, z) && !isWater(x, z) && !obNear(x, z, 40) && slopeAt(x, z, 8) < 0.08) { const o = g.owned[0]; o.x = x; o.z = z; o.y = undefined; return 1; } } return 0; })()`);
// C. reload in the middle of the mount swing
await beside(uid); await sleep(900); await tap("KeyQ");
const mid = await waitUntil("MNT.on", 6);
await sleep(300);
await ev("save(); true"); await reload(); await sleep(1500);
s = await st(); console.log("after mid-mount reload:", JSON.stringify(s));
ok(mid, "mount swing started"); ok(s.fin, "finite after mid-mount reload");
ok(!s.mnt && (s.foot || s.vcur) && (s.foot !== s.vcur), `a consistent body after mid-mount reload (foot ${s.foot}, truck ${s.vcur})`);
// D. board for real, night, drive, reload while moving
await ev(`crashCancel(); true`);
if (!(await st()).vcur) { await beside(uid); await sleep(900); await tap("KeyQ"); ok(await waitUntil(`!MNT.on && !FOOT.on && !!VEH.cur`), "boarded after reload"); }
await ev(`GS.hour = 23; true`); await sleep(1500);
await hold("KeyW", 4000);
await shot("pk_night_drive");
const sp = await ev(`Math.hypot(P.vx, P.vz)`); console.log("speed", sp);
await ev("save(); true"); await reload(); await sleep(1500);
s = await st(); console.log("after mid-drive reload:", JSON.stringify(s));
ok(s.fin, "finite after mid-drive reload");
ok(s.foot !== s.vcur, "one body after mid-drive reload");
const sp2 = await ev(`Math.hypot(P.vx, P.vz)`); ok(sp2 < 3, `no phantom speed after reload (${(+sp2).toFixed(1)} m/s)`);
await shot("pk_after_reload");
// E. get out, mid-dismount reload
if (s.vcur) {
  await tap("KeyQ"); await waitUntil("DMT.on", 4); await sleep(250); await ev("save(); true"); await reload(); await sleep(1500);
  s = await st(); console.log("after mid-dismount reload:", JSON.stringify(s));
  ok(s.fin && !s.dmt && s.foot !== s.vcur, `consistent after mid-dismount reload (foot ${s.foot}, truck ${s.vcur})`);
}
// F. old save (no x key) with a truck bought afterwards
const old = JSON.parse(await ev(`JSON.stringify((() => { const o = JSON.parse(localStorage.getItem("tracklayer.save.v2")); delete o.x; o.cash = 9000; return o; })())`));
await reload(old); await sleep(1200);
s = await st(); ok(s.n === 0 && s.fin, `old save loads with no trucks (owned ${s.n})`);
await buy(); s = await st(); ok(s.n === 1, `old save can buy the truck (owned ${s.n})`);
console.log("page errors:", errors.length ? errors.join(" | ") : "none");
await done(fails ? 1 : 0);
