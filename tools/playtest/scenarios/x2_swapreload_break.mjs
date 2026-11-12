// Beta break test for 2.2 (vehicle interface): reload while driving the truck, reload mid get-on / get-off, reload while on foot
// beside the truck, an old save with the vehicles key stripped, a corrupt x.vehicles (cur points at a uid that isn't owned), Q mashing.
// Prints ok/FAIL; exit 1 on a failure. Run: tools/playtest/run.sh tools/playtest/scenarios/x2_swapreload_break.mjs [outdir]
import { boot, ev, tap, sleep, done, reload, shot, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const st = () => J(`({ cur: TLX.state("vehicles").cur, vcur: !!VEH.cur, foot: FOOT.on, mnt: MNT.on, dmt: DMT.on, fuel: +GS.fuel.toFixed(1), px: +P.x.toFixed(1), pz: +P.z.toFixed(1), fx: +FOOT.x.toFixed(1), fz: +FOOT.z.toFixed(1), n: TLX.state("vehicles").owned.length, owned: TLX.state("vehicles").owned.map(r => ({ uid: r.uid, fuel: +(r.fuel || 0).toFixed(1), x: +(r.x || 0).toFixed(1), z: +(r.z || 0).toFixed(1) })), nan: [P.x, P.z, P.y, P.yaw, GS.fuel, camera.position.x, camera.position.y, camera.quaternion.w].some(v => !isFinite(v)), crash: typeof CRASH !== "undefined" ? !!CRASH.on : null })`);
const beside = uid => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(o => o.uid === "${uid}"); const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  crashCancel(); FOOT.on = true; FOOT.x = x + fz * 3 - fx * 0.3; FOOT.z = z - fx * 3 - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const save = () => ev(`(() => { try { save(); } catch (e) { return "ERR " + e; } return 1; })()`);
const planted = () => ev(`localStorage.getItem("tracklayer.save.v2")`).then(s => JSON.parse(s));

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 20000; true`);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
let s = await st(); ok(s.n === 1, "truck bought");
const A = s.owned[0].uid;
await ev(`GS.fuel = 33; true`);
await beside(A); await sleep(900); await tap("KeyQ");
ok(await waitUntil(`!MNT.on && !!VEH.cur`), "in the truck");
// 1. reload while driving the truck, W held through the reload
await ev(`P.x += 0; true`);
await ev(`window.__tl("0")`);
await tap("KeyW", 1500); await waitGame(1);
s = await st(); const before = s; console.log("  1 before reload:", JSON.stringify({ cur: s.cur, px: s.px, pz: s.pz, fuel: s.fuel }));
await save(); await reload();
await ev(`tutSkip(); true`); await sleep(800);
s = await st(); console.log("  1 after reload:", JSON.stringify({ cur: s.cur, vcur: s.vcur, foot: s.foot, px: s.px, pz: s.pz, fuel: s.fuel, n: s.n }));
ok(s.n === 1 && s.cur === A, "reload while driving: truck still current");
ok(s.vcur && !s.foot, "reload while driving: you are still in the truck, not on foot / on a phantom sled");
ok(Math.hypot(s.px - before.px, s.pz - before.pz) < 15, "reload while driving: truck within 15 m of where it was (" + Math.hypot(s.px - before.px, s.pz - before.pz).toFixed(1) + " m)");
ok(Math.abs(s.fuel - before.fuel) < 2, "reload while driving: fuel kept (" + before.fuel + " -> " + s.fuel + ")");
ok(!s.nan, "no NaN after reload");
await shot("x2sr_driving_reload");

// 2. reload mid get-off (DMT.on)
await tap("KeyQ"); await sleep(250);
s = await st(); console.log("  2 mid dismount:", JSON.stringify({ dmt: s.dmt, foot: s.foot, vcur: s.vcur, cur: s.cur }));
await save(); await reload();
await ev(`tutSkip(); true`); await sleep(800);
s = await st(); console.log("  2 after reload:", JSON.stringify({ cur: s.cur, vcur: s.vcur, foot: s.foot, mnt: s.mnt, dmt: s.dmt, n: s.n, px: s.px, pz: s.pz, fx: s.fx, fz: s.fz }));
ok(!s.mnt && !s.dmt, "reload mid get-off: no stuck mount/dismount animation");
ok(s.foot !== s.vcur || s.cur === null, "reload mid get-off: exactly one of 'on foot' / 'in vehicle' (foot " + s.foot + " vcur " + s.vcur + " cur " + s.cur + ")");
ok(!s.nan, "no NaN");
// can the player still get into the truck and out?
await ev(`crashCancel(); true`);
if (!s.foot) { await tap("KeyQ"); await waitUntil("!DMT.on && FOOT.on", 12); await sleep(500); }
s = await st(); ok(s.foot, "on foot to continue");
await beside(A); await sleep(900); await tap("KeyQ");
ok(await waitUntil(`!MNT.on && !FOOT.on && !!VEH.cur`), "after mid-get-off reload: can board the truck again");

// 3. reload mid get-on (MNT.on) from beside the truck
await tap("KeyQ"); await waitUntil("!DMT.on && FOOT.on", 12); await sleep(500);
await beside(A); await sleep(900); await tap("KeyQ"); await sleep(400);
s = await st(); console.log("  3 mid mount:", JSON.stringify({ mnt: s.mnt, foot: s.foot, vcur: s.vcur, cur: s.cur }));
await save(); await reload();
await ev(`tutSkip(); true`); await sleep(800);
s = await st(); console.log("  3 after reload:", JSON.stringify({ cur: s.cur, vcur: s.vcur, foot: s.foot, mnt: s.mnt, n: s.n, px: s.px, pz: s.pz, fx: s.fx, fz: s.fz }));
ok(!s.mnt, "reload mid get-on: no stuck mount");
ok(s.foot !== s.vcur, "reload mid get-on: exactly one of foot / vehicle (foot " + s.foot + " vcur " + s.vcur + ")");
ok(!s.nan, "no NaN");

// 4. save with the vehicles key stripped (an old save that never had a truck) while the player owns nothing
let sv = await planted(); const hadX = !!sv.x;
console.log("  4 save has x:", hadX, "keys:", sv.x ? Object.keys(sv.x).join(",") : "-");
if (sv.x) delete sv.x.vehicles; delete sv.x;
await reload(sv); await ev(`tutSkip(); true`); await sleep(800);
s = await st(); console.log("  4 after stripped load:", JSON.stringify({ cur: s.cur, vcur: s.vcur, foot: s.foot, n: s.n }));
ok(s.n === 0 && !s.vcur, "stripped save: no trucks, riding the sled");
ok(!s.nan, "no NaN");

// 5. corrupt: cur names a uid that is not owned (as if a refund/sale removed the record)
sv = await planted();
sv.x = sv.x || {}; sv.x.vehicles = { v: 1, owned: [], cur: "v9", next: 2 };
await reload(sv); await ev(`tutSkip(); true`); await sleep(1000);
s = await st(); console.log("  5 after dangling cur:", JSON.stringify({ cur: s.cur, vcur: s.vcur, foot: s.foot, n: s.n, nan: s.nan }));
ok(!s.nan, "dangling cur: no NaN / camera ok");
ok(!(s.cur && s.n === 0), "dangling cur: cleared, not left pointing at nothing (cur " + s.cur + ")");
await tap("KeyQ"); await sleep(2500); s = await st();
ok(!s.nan, "dangling cur: Q still works without NaN");
await shot("x2sr_dangling");

// 6. Q mashing beside a truck
await ev(`GS.cash = 20000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
s = await st(); const B = s.owned[s.owned.length - 1]?.uid;
if (B) {
  await ev(`crashCancel(); true`);
  if (!s.foot) { await tap("KeyQ"); await waitUntil("!DMT.on && FOOT.on", 12); await sleep(400); }
  await beside(B); await sleep(900);
  for (let i = 0; i < 6; i++) { await tap("KeyQ", 40); await sleep(120); }
  await waitGame(5); s = await st();
  console.log("  6 after mash:", JSON.stringify({ cur: s.cur, vcur: s.vcur, foot: s.foot, mnt: s.mnt, dmt: s.dmt }));
  ok(!s.mnt && !s.dmt, "Q mash: settles, no stuck animation");
  ok(s.foot !== s.vcur, "Q mash: exactly one of foot/vehicle (foot " + s.foot + " vcur " + s.vcur + ")");
  ok(!s.nan, "Q mash: no NaN");
}
console.log("page errors:", errors.length ? errors.join(" | ") : "none");
await done(fails ? 1 : 0);
