// Beta for v292 (0364 #2/#3): pump fills the machine after you step out; "Tank full" on foot; Q at the pump point yaw 0; sled+truck at one pump.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x2_pumpfill_foot_beta.mjs
import { boot, ev, tap, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(100); } return false; }
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return 1; })()`);
const beside = uid => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(o => o.uid === "${uid}"); const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  crashCancel(); FOOT.on = true; FOOT.x = x + fz * 3 - fx * 0.3; FOOT.z = z - fx * 3 - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
async function board(uid) { await beside(uid); await sleep(900); await tap("KeyQ"); return waitUntil(`!MNT.on && !FOOT.on && !!VEH.cur && TLX.state("vehicles").cur === "${uid}"`); }
const put = (dx, dz, yaw, fuel, cash) => ev(`(() => { const t = STATIONS.find(t => t.x !== undefined); P.x = t.x + ${dx}; P.z = t.z + ${dz}; P.yaw = ${yaw}; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); GS.fuel = ${fuel}; GS.cash = ${cash}; return 1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 20000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
const U = await J(`TLX.state("vehicles").owned[0].uid`);
ok(await board(U), "seated");
// A: yaw 1.57 so Q works; get out right after the fill starts, wait for full on foot
await put(0, 0, 1.57, 5, 500); await sleep(800); await clearToasts();
const c0 = 500;
await tap("KeyQ"); ok(await waitUntil("!DMT.on && FOOT.on", 14), "got out at pump");
const f0 = await ev("GS.fuel");
const full = await waitUntil("GS.fuel >= GS.cap - 0.05", 25); await waitGame(1.5);
const ts = await toasts(); console.log("  toasts", JSON.stringify(ts));
const cap = await ev("GS.cap"), c1 = await ev("GS.cash");
ok(full, "fills to full while on foot (from " + f0.toFixed(1) + ")");
const full_t = ts.find(t => /Tank full/.test(t));
ok(!!full_t, "'Tank full' toast fires on foot");
const m = full_t && full_t.match(/([\d.]+) L/); if (m) ok(+m[1] <= cap + 0.5, `toast litres ${m[1]} <= cap ${cap}`);
ok(!ts.some(t => /Pulled off the pump/.test(t)), "no 'Pulled off' toast after stepping out");
ok(Math.abs((c0 - c1) - (cap - 5) * 2.45) < 3.5, `billed ${(c0 - c1).toFixed(1)} for ~${(cap - 5).toFixed(0)} L`);
// B: Q at the exact pump point, yaw 0 (0364 #1)
ok(await board(U), "re-boarded");
await put(0, 0, 0, 69, 500); await sleep(1500); await tap("KeyQ");
const q0 = await waitUntil("!DMT.on && FOOT.on", 6); ok(q0, "Q works at pump point yaw 0 (0364 #1)");
// C: drive off mid-fill: toast says litres <= cap
if (!(await ev("FOOT.on"))) { }
await board(U); await put(0, 0, 1.57, 20, 500); await sleep(500); await clearToasts(); await waitGame(3);
await ev("(() => { P.x += 40; return 1; })()"); await waitGame(1.5);
const t2 = await toasts(); console.log("  toasts C", JSON.stringify(t2));
ok(t2.some(t => /Pulled off the pump/.test(t)), "driving off says pulled off");
console.log(fails ? "FAILS " + fails : "ALL OK");
await done(fails ? 1 : 0);
