// Beta test for 2.2 (vehicle swap): two trucks + the sled, board in turn, fuel/pose per vehicle, swap with tablet open, at night, after reload.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x2_swap_twotrucks_beta.mjs [outdir]
import { boot, ev, tap, sleep, done, reload, shot, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const st = () => J(`({ cur: TLX.state("vehicles").cur, vcur: !!VEH.cur, foot: FOOT.on, mnt: MNT.on, dmt: DMT.on, fuel: +GS.fuel.toFixed(1), px: +P.x.toFixed(1), pz: +P.z.toFixed(1), sled: GS.own.sled, owned: TLX.state("vehicles").owned.map(r => ({ uid: r.uid, fuel: +(r.fuel || 0).toFixed(1), x: +(r.x || 0).toFixed(1), z: +(r.z || 0).toFixed(1) })), nan: [P.x, P.z, P.y, P.yaw, GS.fuel, camera.position.x, camera.position.y, camera.quaternion.w].some(v => !isFinite(v)) })`);
const beside = uid => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(o => o.uid === "${uid}"); const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  crashCancel(); FOOT.on = true; FOOT.x = x + fz * 3 - fx * 0.3; FOOT.z = z - fx * 3 - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const buy = async () => { await ev(`GS.cash = 20000; garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500); };
async function board(uid) {
  await beside(uid); await sleep(900); await tap("KeyQ");
  return waitUntil(`!MNT.on && !FOOT.on && !!VEH.cur && TLX.state("vehicles").cur === "${uid}"`);
}
async function leave() { await tap("KeyQ"); const r = await waitUntil("!DMT.on && FOOT.on", 14); await sleep(500); return r; }

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);
await buy();
let s = await st(); ok(s.owned.length === 1, "truck 1 bought");
const A = s.owned[0].uid;
await buy(); s = await st(); ok(s.owned.length === 2, "truck 2 bought (" + s.owned.length + ")");
const B = s.owned[1]?.uid; ok(B && B !== A, "distinct uids " + A + " " + B);
console.log("  start:", JSON.stringify(s.owned));
// separate the trucks and give them different fuel
// move both records well away from the depot pump (parked fuel creeps up beside it, see x2_swap_fuel_probe)
await ev(`(() => { const o = TLX.state("vehicles").owned; const sp = (x, z) => !isSea(x, z) && !isWater(x, z) && !obNear(x, z, 20) && slopeAt(x, z, 8) < 0.08;
  let ox = 0, oz = 0; for (let k = 0; k < 400; k++) { const a = k * 2.4, r = 250 + k * 3; const x = o[0].x + Math.cos(a) * r, z = o[0].z + Math.sin(a) * r; if (sp(x, z) && sp(x + 12, z)) { ox = x; oz = z; break; } }
  o[0].x = ox; o[0].z = oz; o[1].x = ox + 12; o[1].z = oz; o[0].y = o[1].y = surf(ox, oz); o[0].fuel = 20; o[1].fuel = 55; window.__far = [ox, oz]; return 1; })()`);
console.log("  far spot", await ev("JSON.stringify(window.__far)"));
// 1. board A, fuel must be A's
await ev(`crashCancel(); FOOT.on = true; true`);
ok(await board(A), "board A"); s = await st();
console.log("  A boarded:", JSON.stringify({ fuel: s.fuel, sled: s.sled }));
ok(Math.abs(s.fuel - 20) < 3, "in A: GS.fuel is A's fuel (" + s.fuel + ")");
await ev(`GS.fuel = 12; true`);
ok(await leave(), "leave A"); s = await st();
const a1 = s.owned.find(r => r.uid === A);
console.log("  A parked:", JSON.stringify(a1));
ok(Math.abs(a1.fuel - 12) < 1.5, "A parked record kept fuel 12 (" + a1.fuel + ")");
// 2. board B
ok(await board(B), "board B"); s = await st();
ok(Math.abs(s.fuel - 55) < 3, "in B: fuel is B's, not A's (" + s.fuel + ")");
ok(!s.nan, "no NaN");
// 3. tablet open during dismount/board
await ev(`TABLET.toggle(true, "map"); true`); await sleep(500);
await tap("KeyQ"); await sleep(1500);
s = await st(); console.log("  Q with tablet open:", JSON.stringify({ foot: s.foot, vcur: s.vcur, mnt: s.mnt, dmt: s.dmt }));
await ev(`TABLET.toggle(false); true`); await sleep(400);
if (!s.foot) { await waitUntil("!DMT.on && FOOT.on", 14); if (!(await st()).foot) await leave(); }
await ev(`TABLET.toggle(false); true`);
s = await st(); ok(s.foot && !s.dmt, "after tablet-open Q settles: on foot, no stuck dismount");
if (!s.foot) await leave();
// 4. night swap A<->B x3, fuel stays attached
await ev(`GS.hour = 23; true`); await sleep(500);
for (let i = 0; i < 3; i++) {
  const u = i % 2 ? B : A;
  const okb = await board(u); s = await st();
  ok(okb && s.cur === u, "night swap " + i + " boarded " + u);
  const want = u === A ? 12 : 55;
  ok(Math.abs(s.fuel - want) < 4, "night swap " + i + ": fuel " + s.fuel + " ~ " + want);
  await leave();
}
await shot("x2sw_night");
// 5. reload with A current-ish (on foot), then board the other
await ev(`save(); true`); await reload();
await ev(`tutSkip(); true`); await sleep(900);
s = await st(); console.log("  after reload:", JSON.stringify({ cur: s.cur, foot: s.foot, owned: s.owned }));
ok(s.owned.length === 2, "reload: both trucks kept");
const ra = s.owned.find(r => r.uid === A), rb = s.owned.find(r => r.uid === B);
ok(Math.abs(ra.fuel - 12) < 4 && Math.abs(rb.fuel - 55) < 4, "reload: per-truck fuel kept (" + ra.fuel + ", " + rb.fuel + ")");
ok(Math.hypot(ra.x - rb.x, ra.z - rb.z) > 1.5, "reload: trucks not stacked on one spot");
ok(!s.nan, "reload: no NaN");
ok(await board(B), "reload: board B"); s = await st();
ok(Math.abs(s.fuel - rb.fuel) < 3, "reload: B fuel after boarding " + s.fuel);
console.log("page errors:", errors.length ? errors.join(" | ") : "none");
await done(fails ? 1 : 0);
