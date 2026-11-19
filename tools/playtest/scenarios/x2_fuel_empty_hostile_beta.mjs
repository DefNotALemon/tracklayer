// Beta test for 2.2/2.3 truck fuel: run the pickup dry on open snow, and hostile parked-truck fuel values in the save (null/-5/9999/"abc"/missing).
// Run: tools/playtest/run.sh tools/playtest/scenarios/x2_fuel_empty_hostile_beta.mjs [outdir]
import { boot, ev, tap, down, up, sleep, done, reload, errors } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const nan = () => ev(`[P.x, P.z, P.y, P.yaw, P.vx, P.vz, GS.fuel, camera.position.x, camera.position.y].some(v => !isFinite(v))`);
const beside = uid => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(o => o.uid === "${uid}"); const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  crashCancel(); FOOT.on = true; FOOT.x = x + fz * 3 - fx * 0.3; FOOT.z = z - fx * 3 - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
async function board(uid) { await beside(uid); await sleep(900); await tap("KeyQ"); return waitUntil(`!MNT.on && !FOOT.on && !!VEH.cur && TLX.state("vehicles").cur === "${uid}"`); }
const unseat = async () => { await tap("KeyQ"); const r = await waitUntil("!DMT.on && FOOT.on", 14); await sleep(400); return r; };
const toasts = () => J(`[...document.querySelectorAll("#toasts > *")].map(e => e.textContent).concat((TOASTQ || []).map(t => t.msg || t.text || String(t)))`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 20000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
const U = await J(`TLX.state("vehicles").owned[0].uid`);
ok(await board(U), "seated in the truck");
await ev(`(() => { for (let r = 600; r < 1500; r += 25) for (let k = 0; k < 40; k++) { const x = P.x + Math.sin(k * 0.157) * r, z = P.z + Math.cos(k * 0.157) * r; if (!isSea(x, z) && !isWater(x, z) && !obNear(x, z, 40) && slopeAt(x, z, 8) < 0.06) { P.x = x; P.z = z; P.y = surf(x, z); recenter(x, z, true); return 1; } } return 0; })()`);
await waitGame(2);
const sx = await ev("P.x"), sz = await ev("P.z");
await ev(`GS.fuel = 1.0; true`);
await down("KeyW"); await waitGame(4);
console.log("  4 s W on 1 L: fuel", await ev("GS.fuel"), "moved", Math.hypot((await ev("P.x")) - sx, (await ev("P.z")) - sz).toFixed(1), "m, speed", await J(`Math.hypot(P.vx, P.vz)`));
await waitGame(8);
const f1 = await ev("GS.fuel"); const mv = Math.hypot((await ev("P.x")) - sx, (await ev("P.z")) - sz);
console.log("  12 s W: fuel", f1, "moved", mv.toFixed(1), "speed", await J(`Math.hypot(P.vx, P.vz)`));
ok(mv > 5, "it drove before running dry (" + mv.toFixed(1) + " m)");
ok(f1 >= 0 && isFinite(f1), "fuel never negative / NaN (" + f1 + ")");
const t = await toasts(); console.log("  toasts:", JSON.stringify(t.slice(-4)));
ok(f1 > 0.01 || t.some(x => /fuel|empty|dry|tank/i.test(x)), "dry tank is announced");
await waitGame(4);
const v2 = await J(`Math.hypot(P.vx, P.vz)`); const f2 = await ev("GS.fuel");
console.log("  after 4 more s: fuel", f2, "speed", v2);
if (f2 <= 0.01) ok(v2 < 1.5, "dry truck does not keep driving under throttle (" + v2.toFixed(2) + ")");
await up("KeyW");
ok(!(await nan()), "no NaN");
ok(await unseat(), "can get out of the truck");
const keys = await J(`(() => { save(); const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); return { x: Object.keys(s.x || {}), v: JSON.stringify(s.x && (s.x.vehicles || s.x.sys && s.x.sys.vehicles) || null).slice(0, 300) }; })()`);
console.log("  save keys:", JSON.stringify(keys));
const vals = [["null", null], ["-5", -5], ["9999", 9999], ["abc", "abc"], ["missing", undefined]];
for (const [label, val] of vals) {
  const save = await J(`(() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })()`);
  const find = o => { const st = o.x && (o.x.vehicles || (o.x.sys && o.x.sys.vehicles)); return st && (st.s || st).owned; };
  const own = find(save); if (!own || !own[0]) { ok(false, label + ": found owned record in save"); continue; }
  if (val === undefined) delete own[0].fuel; else own[0].fuel = val;
  await reload(save); await sleep(800);
  await ev(`tutSkip(); crashCancel(); true`);
  const pre = await J(`TLX.state("vehicles").owned[0].fuel === undefined ? "undef" : TLX.state("vehicles").owned[0].fuel`);
  const ok1 = await board(U);
  const f = await J(`({ fuel: GS.fuel, cap: GS.cap })`);
  console.log("  hostile", label, "record after load:", JSON.stringify(pre), "-> cab", JSON.stringify(f), "boarded", ok1);
  ok(ok1, label + ": still boards");
  ok(typeof f.fuel === "number" && isFinite(f.fuel) && f.fuel >= 0 && f.fuel <= f.cap + 0.01, label + ": GS.fuel sane in cab (" + f.fuel + " / cap " + f.cap + ")");
  ok(!(await nan()), label + ": no NaN");
  await unseat();
}
ok(errors.length === 0, "page errors: " + (errors.length ? JSON.stringify(errors.slice(0, 3)) : "none"));
console.log(fails ? "FAILS " + fails : "ALL OK");
await done(fails ? 1 : 0);
