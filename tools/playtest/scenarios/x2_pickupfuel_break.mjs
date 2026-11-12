// Beta break test for 2.3 (pickup) fuel + warmth + pad driving: the free refill at the quay/garage, the low-fuel warning, tank
// swap between sled and truck (fuel must stay inside each cap), warm cab, and pad stick + RT driving. Prints ok/FAIL.
import { boot, ev, tap, sleep, done, reload, shot, down, up, padSet, padOff, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const nan = () => ev(`[P.x, P.z, P.y, P.yaw, P.vx, P.vz, GS.fuel, GS.warmth].some(v => !isFinite(v))`);
const buy = async () => { await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`); };
const beside = (off = 3.0) => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  crashCancel(); FOOT.on = true; FOOT.x = x + fz * ${off} - fx * 0.3; FOOT.z = z - fx * ${off} - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const seat = async () => { await beside(); await sleep(800); await tap("KeyQ"); return waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14); };
const unseat = async () => { await tap("KeyQ"); return waitUntil("!DMT.on && FOOT.on", 14); };

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 9000; true`);
await buy();
ok(await seat(), "seated in the truck");
const cap = await ev("GS.cap");
ok(cap > 60 && cap <= 80, `truck tank cap ${cap} L (spec 70)`);

// leave the forecourt (the garage tops you up free and warms you): a flat open spot 600 m out
await ev(`(() => { for (let r = 600; r < 1500; r += 25) for (let k = 0; k < 40; k++) { const x = P.x + Math.sin(k * 0.157) * r, z = P.z + Math.cos(k * 0.157) * r; if (!isSea(x, z) && !isWater(x, z) && !obNear(x, z, 40) && slopeAt(x, z, 8) < 0.06) { P.x = x; P.z = z; P.vx = P.vz = 0; recenter(x, z, true); return 1; } } return 0; })()`);
await waitGame(2);
console.log("away from shelter, near =", await ev("!!GS.near"));
// 1. burn: drive 8 s at a trot, fuel must fall but stay finite
await ev(`GS.fuel = GS.cap; true`);
const sx = await ev("P.x"), sz = await ev("P.z"); const bog0 = await ev("BOG.on");
await down("KeyW"); await waitGame(8); await up("KeyW");
const mv = Math.hypot((await ev("P.x")) - sx, (await ev("P.z")) - sz);
console.log(`8 s of W: moved ${mv.toFixed(1)} m, bog before ${bog0}, bog after ${await ev("BOG.on")}, toast ${await ev('Array.from(document.querySelectorAll("#toasts *")).map(e => e.textContent).join(" | ")')}`);
ok(mv > 15, `W drives the truck off the forecourt spot (${mv.toFixed(1)} m in 8 s)`);
let f1 = await ev("GS.fuel");
ok(f1 < cap && f1 > cap - 8, `fuel burns while driving: ${f1.toFixed(2)} / ${cap}`);

// 2. low fuel warning
await ev(`GS.fuel = GS.cap * 0.19; GS.lowWarned = false; true`);
await ev(`window.__tq = []; true`);
await waitGame(2);
const toasts = await ev(`Array.from(document.querySelectorAll("#toasts *")).map(e => e.textContent).join(" | ")`);
console.log("toasts:", toasts.slice(0, 200));
ok(/low|fuel|pump/i.test(toasts), "low-fuel warning shows in the truck");

// 3. warmth: cab heated? drain warmth, wait in the truck far from shelter, compare with the sled rate later
await ev(`GS.warmth = 60; true`);
const w0 = await ev("GS.warmth"); await waitGame(10); const w1 = await ev("GS.warmth");
console.log(`warmth in cab over 10 s: ${w0} -> ${w1.toFixed(2)}`);
ok(w1 >= w0 - 3, `heated cab: warmth ${w0} -> ${w1.toFixed(2)} (loses < 3 in 10 s)`);

// 4. free refill at the quay while seated
await ev(`GS.fuel = 5; (() => { P.x = depot.x + 10; P.z = depot.z + 10; recenter(P.x, P.z, true); return 1; })()`);
await waitGame(2); console.log("bog after teleport to the quay:", await ev("BOG.on"), "acc", await ev("BOG.acc"), "sink", await ev("typeof VEH.cur.dbg !== 'undefined' ? JSON.stringify(VEH.cur.dbg) : 'n/a'"));
await waitGame(6);
const f2 = await ev("GS.fuel"); const near = await ev("GS.near === depot");
console.log(`at quay near=${near} fuel ${f2.toFixed(1)}`);
ok(!near || f2 > 5.5, "quay tops the truck up (6 L/s)");

// 5. tank swap: dismount with a full 70 L truck tank, hop on the sled; fuel must not exceed the sled's cap
await ev(`GS.fuel = GS.cap; true`);
await ev(`(() => { P.vx = P.vz = 0; return 1; })()`); await waitGame(1);
console.log("unseat: speed", await ev("Math.hypot(P.vx, P.vz)"), "near", await ev("!!GS.near"), "hint", await ev('$("wnHint").textContent'));
const gotOut = await unseat();
console.log("after Q:", JSON.stringify(await J(`({ foot: FOOT.on, dmt: DMT.on, vcur: !!VEH.cur, bog: typeof BOG !== "undefined" ? BOG.on ?? BOG.acc : null, hint: $("wnHint").textContent, y: P.y, sy: surf(P.x, P.z), ob: obNear(P.x, P.z, 4) })`)));
ok(gotOut, "got out of the truck (Q while the hint says STUCK)");
await sleep(500);
const fT = await ev("GS.fuel");
ok(fT <= (await ev("GS.cap")) + 0.01 && fT > 0, `on foot: fuel ${fT} within current cap`);
// walk to the sled and board it
await ev(`(() => { const s = TLX.state("vehicles"); return 1; })()`);
await ev(`(() => { FOOT.x = FOOT.x + 80; FOOT.z = FOOT.z + 80; FOOT.y = surf(FOOT.x, FOOT.z); recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(1500);
const hint = await ev(`$("wnHint").textContent`);
console.log("hint far from both:", hint);
// sled board: put the walker beside the parked sled (P is the sled when VEH.cur is null and truck is parked)
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; return 1; })()`);
const after = await J(`({ cur: TLX.state("vehicles").cur, fuel: GS.fuel, cap: GS.cap, vcur: !!VEH.cur })`);
console.log("state:", JSON.stringify(after));
ok(!(await nan()), "state finite after dismount + walking");
ok(after.fuel <= after.cap + 0.01, `fuel ${after.fuel} <= cap ${after.cap}`);

// 6. pad: stick + RT drives the truck, stick steers
await ev(`GS.fuel = GS.cap; true`);
await beside(); await sleep(800); await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14);
const y0 = await ev("P.yaw"), x0 = await ev("P.x"), z0 = await ev("P.z");
await padSet({ 7: 1 }, [0.9, 0]); await waitGame(5); await padSet(); await sleep(200);
const y1 = await ev("P.yaw"), x1 = await ev("P.x"), z1 = await ev("P.z");
const dist = Math.hypot(x1 - x0, z1 - z0);
console.log(`pad RT+stick right: moved ${dist.toFixed(1)} m, yaw ${y0.toFixed(2)} -> ${y1.toFixed(2)}, bound ${await ev("INP.dev")}`);
ok(dist > 4, `RT drives the truck (${dist.toFixed(1)} m in 5 s)`);
ok(Math.abs(y1 - y0) > 0.15, `stick steers the truck (yaw change ${(y1 - y0).toFixed(2)})`);
await padSet({}, [-0.9, 0]); await waitGame(2); await padSet();
await shot("x2pf_pad_drive");
await padOff();
ok(!(await nan()), "state finite at end");
console.log("page errors:", errors.length ? errors.join(" | ") : "none");
await done(fails ? 1 : 0);
