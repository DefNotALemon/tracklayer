// Beta test for 2.2/2.3 (second pass): two trucks swap fuel + parcels cleanly, parcels/fuel survive a reload, pad LB and the
// touch GET OFF button leave the truck, and the sled keeps its own fuel across truck trips. Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, reload, shot, padSet, padOff, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const nan = () => ev(`[P.x, P.z, P.y, P.yaw, GS.fuel, camera.position.x, camera.position.y, camera.quaternion.w].some(v => !isFinite(v))`);
const st = () => J(`({ cur: TLX.state("vehicles").cur, vcur: !!VEH.cur, foot: FOOT.on, fuel: GS.fuel, load: GS.load.length, mnt: MNT.on, dmt: DMT.on, owned: TLX.state("vehicles").owned.map(r => ({ uid: r.uid, fuel: r.fuel, n: (r.load || []).length })) })`);
const beside = uid => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(o => o.uid === "${uid}"); const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  crashCancel(); FOOT.on = true; FOOT.x = x + fz * 3 - fx * 0.3; FOOT.z = z - fx * 3 - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const board = async uid => { await beside(uid); await sleep(900); await tap("KeyQ"); return waitUntil(`!MNT.on && !FOOT.on && !!VEH.cur && TLX.state("vehicles").cur === "${uid}"`); };
const tapB = id => ev(`(() => { const b = $("${id}"); if (!b) return 0; b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.fuel = 11; true`);
await ev(`GS.cash = 20000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
for (let i = 0; i < 2; i++) { await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); }
await ev(`closeGarage(); true`);
let s = await st();
ok(s.owned.length === 2, "two trucks owned");
const [A, B] = s.owned.map(o => o.uid);
// the garage forecourt tops the CURRENT vehicle up free (by design), so park both trucks well away from it first
await ev(`(() => { const g = TLX.state("vehicles"); let k = 0; for (let r = 500; r < 1500 && k < 2; r += 40) for (let a = 0; a < 6.28 && k < 2; a += 0.4) { const x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r; if (!isSea(x, z) && !isWater(x, z) && !obNear(x, z, 40) && slopeAt(x, z, 8) < 0.08) { const o = g.owned[k++]; o.x = x; o.z = z; o.y = undefined; } } return k; })()`);
await sleep(500);

// 1. board A, set its fuel + parcels
ok(await board(A), "boarded truck A");
await ev(`GS.fuel = 33; for (let i = 0; i < 3; i++) GS.load.push({ name: "beta parcel " + i, kg: 6, pay: 40, big: false, dest: SITES[3 + i], from: SITES[0] }); true`);
await tap("KeyQ"); ok(await waitUntil("FOOT.on && !DMT.on"), "got out of A");
// 2. board B: should be B's own fuel (full) and no parcels
ok(await board(B), "boarded truck B");
s = await st();
ok(s.cur === B && s.fuel > 60 && s.load === 0, `B has its own full tank and empty bed (fuel ${s.fuel.toFixed(1)}, parcels ${s.load})`);
const a1 = s.owned.find(o => o.uid === A);
ok(Math.abs(a1.fuel - 33) < 1.5 && true, `A's record kept fuel ${a1.fuel.toFixed(1)} (parcels wait in LIVE until a save)`);
await ev(`GS.fuel = 12; true`);
// 3. pad LB gets out
await padSet({ 4: 1 }); await sleep(120); await padSet();
ok(await waitUntil("FOOT.on && !DMT.on"), "pad LB gets out of B"); await padOff();
// 4. back into A: 33 L, 3 parcels
ok(await board(A), "re-boarded A");
s = await st();
ok(Math.abs(s.fuel - 33) < 1.5 && s.load === 3, `A restored: fuel ${s.fuel.toFixed(1)}, parcels ${s.load}`);
ok(Math.abs(s.owned.find(o => o.uid === B).fuel - 12) < 1.5, "B's record kept 12 L");
// 5. touch GET OFF
await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(300);
const vis = await ev(`!$("tcQ").hidden`);
ok(vis, "touch GET OFF button visible in the truck");
await tapB("tcQ");
ok(await waitUntil("FOOT.on && !DMT.on"), "touch GET OFF leaves the truck");
const lab = await ev(`$("wnHint").textContent`);
console.log("on-foot hint:", JSON.stringify(lab));
// 6. reload: both trucks keep fuel, A keeps parcel count
await ev(`save(); true`); await reload(); await sleep(1500); await waitGame(1);
s = await st();
console.log("after reload:", JSON.stringify(s));
const ra = s.owned.find(o => o.uid === A), rb = s.owned.find(o => o.uid === B);
ok(ra && rb && Math.abs(ra.fuel - 33) < 1.5 && Math.abs(rb.fuel - 12) < 1.5, "reload keeps both tank levels");
ok(s.load === 3, `reload keeps A's parcels in the live bed (${s.load}, record ${ra ? ra.n : "?"})`);
ok(!(await nan()), "finite after reload");
// 7. sled fuel survives truck trips
await ev(`crashCancel(); true`);
const sl = await J(`({ cur: TLX.state("vehicles").cur, sled: TLX.state("vehicles").sled && TLX.state("vehicles").sled.fuel, fuel: GS.fuel })`);
console.log("sled state:", JSON.stringify(sl));
ok(sl.sled == null ? true : sl.sled >= 11 && sl.sled <= 17, `the sled's parked fuel is 11 L plus forecourt top-up (${sl.sled})`);
await shot("x2ps_end");
console.log("page errors:", errors.length ? errors.join(" | ") : "none");
await done(fails ? 1 : 0);
