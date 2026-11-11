// Beta break test for slices 2.2 + 2.3 (vehicle core, pickup). Tries to break it: buy with too little cash, buy twice,
// double-tap Q mid-mount, reload mid-mount, empty tank, ram a building / the sea at speed, garage open while seated,
// save with `cur` pointing at a truck that doesn't exist, a pad (LB) and a touch-less night entry. Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, tap, sleep, done, reload, shot, down, up, padSet, padOff, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
async function holdFor(code, s) { await down(code); await waitGame(s); await up(code); }
const nan = () => ev(`[P.x, P.z, P.y, P.yaw, P.vx, P.vz, GS.fuel, camera.position.x, camera.position.y, camera.quaternion.x, camera.quaternion.w].some(v => !isFinite(v))`);
const veh = () => J(`({ cur: TLX.state("vehicles").cur, n: TLX.state("vehicles").owned.length, vcur: !!VEH.cur, foot: FOOT.on, mnt: MNT.on, dmt: DMT.on, cash: GS.cash, fuel: GS.fuel, hint: $("wnHint").textContent })`);
const beside = (off = 3.0) => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned[0]; const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  crashCancel(); FOOT.on = true; FOOT.x = x + fz * ${off} - fx * 0.3; FOOT.z = z - fx * ${off} - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const buy = async () => { await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); };

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);

// ---- 1. buy with too little cash
await ev(`GS.cash = 1000; true`); await buy(); await ev(`closeGarage(); true`);
let s = await veh();
ok(s.n === 0 && s.cash === 1000, `can't afford: no truck (${s.n}), cash untouched (${s.cash})`);
// ---- 2. buy twice
await ev(`GS.cash = 9000; true`); await buy(); await buy(); await ev(`closeGarage(); true`);
s = await veh();
ok(s.n === 2 && s.cash === 600, `a second Fjellvogn can be bought (garage row says Owned x1): owned ${s.n}, cash ${s.cash}`);

// ---- 3. double-tap Q mid-mount
await beside(); await sleep(1200);
await tap("KeyQ"); await sleep(500); await tap("KeyQ"); await sleep(300); await tap("KeyQ");
await waitGame(8); await sleep(500);
s = await veh();
console.log("after triple Q:", JSON.stringify(s));
ok(!s.mnt && !s.dmt, "no mount/dismount flag stuck after Q spam");
ok(!(await nan()), "poses and camera finite after Q spam");
// settle into the seat
if (s.foot) { await beside(); await sleep(800); await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14); }
s = await veh(); ok(s.vcur && !s.foot, "in the truck");

// ---- 4. reload mid-mount
await tap("KeyQ"); await waitUntil("FOOT.on && !DMT.on", 12);
await beside(); await sleep(800); await tap("KeyQ"); await sleep(700);
const midMount = await ev("MNT.on");
await reload(); await sleep(1500); await waitGame(1);
s = await veh();
console.log("reload mid-mount (mnt was " + midMount + "):", JSON.stringify(s));
ok(!s.mnt && !s.dmt && !(await nan()), "reload mid-mount leaves no stuck flag and finite state");
ok(s.n >= 1 && (s.vcur || s.foot), `truck still owned (${s.n}); you are ${s.vcur ? "seated" : "on foot"}`);
if (!s.vcur) { await beside(); await sleep(800); await tap("KeyQ"); await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14); }

// ---- 5. empty tank
await ev(`GS.fuel = 0; true`); await holdFor("KeyW", 3);
let v = await J(`({ v: Math.hypot(P.vx, P.vz), fuel: GS.fuel })`);
ok(v.v < 3, `empty tank: no drive (${v.v.toFixed(1)} m/s)`);
ok(v.fuel >= 0, `fuel never negative (${v.fuel})`);
await ev(`GS.fuel = 40; true`);

// ---- 6. garage open while seated, then close
await ev(`openGarage(); true`); await sleep(500); await ev(`closeGarage(); true`); await sleep(300);
s = await veh(); ok(s.vcur && !(await nan()), "garage open/close while seated keeps the truck current");

// ---- 7. ram the sea / a building at speed
const rams = await J(`(() => { let o = null; for (const b of (typeof BLD !== "undefined" ? BLD : [])) { o = b; break; } return o ? { x: o.x, z: o.z } : null; })()`).catch(() => null);
await ev(`(() => { const a = Math.PI; let best = null; for (let r = 30; r < 900 && !best; r += 15) for (let k = 0; k < 24; k++) { const x = P.x + Math.sin(k * 0.26) * r, z = P.z + Math.cos(k * 0.26) * r; if (isSea(x, z)) { best = [x, z]; break; } } window.__sea = best; return 1; })()`);
const sea = await J(`window.__sea`);
console.log("sea target", JSON.stringify(sea));
if (sea) {
  await ev(`(() => { const t = window.__sea; const dx = t[0] - P.x, dz = t[1] - P.z, L = Math.hypot(dx, dz); P.yaw = Math.atan2(dx, dz); recenter(P.x, P.z, true); return 1; })()`);
  await holdFor("KeyW", 12);
  s = await J(`({ sea: isSea(P.x, P.z), water: isWater(P.x, P.z), v: Math.hypot(P.vx, P.vz), y: P.y, x: P.x, z: P.z })`);
  console.log("after sea run:", JSON.stringify(s), "foot", await ev("FOOT.on"), "crash", await ev("typeof CR !== 'undefined' ? JSON.stringify(CR) : 'n/a'"));
  ok(!(await nan()), "driving at the sea keeps finite state");
  ok(!s.sea, "the truck isn't driving on the open sea (sea " + s.sea + ")");
}

// ---- 8. saved `cur` pointing at a truck that doesn't exist, and a record with bad numbers
await ev(`(() => { const st = TLX.state("vehicles"); st.cur = "v99"; st.owned[0].x = NaN; st.owned[0].fuel = "lots"; return 1; })()`);
await reload(); await sleep(1500); await waitGame(1);
s = await veh();
console.log("bad save:", JSON.stringify(s));
ok(!(await nan()), "bad vehicle record loads with finite state");
ok(!s.mnt && !s.dmt && (s.vcur === false || s.cur === null || s.n >= 0), "bad cur does not wedge the mount flags");
const rec = await J(`(() => { const r = TLX.state("vehicles").owned[0]; return r ? { x: r.x, z: r.z, fuel: r.fuel } : null; })()`);
ok(rec && isFinite(rec.x) && isFinite(rec.z) && typeof rec.fuel === "number" && isFinite(rec.fuel), "the truck record is repaired: " + JSON.stringify(rec));

// ---- 9. pad LB gets in at night
await ev(`GS.hour = 23; crashCancel(); true`);
if (rec) { await beside(); await sleep(1200); }
await padSet({ 4: 1 }); await sleep(120); await padSet();
const ent = await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14);
ok(ent, "LB (pad) gets into the pickup at night");
await sleep(400); await shot("x2pb_night_cab"); await padOff();

console.log("page errors:", (await import("../lib.mjs")).errors.length ? (await import("../lib.mjs")).errors.join(" | ") : "none");
await done(fails ? 1 : 0);
