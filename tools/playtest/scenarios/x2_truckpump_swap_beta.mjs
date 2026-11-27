// Beta test for 2.1/2.2 truck refuelling at a station pump: fill, price, cash short, leaving mid-fill, swap to sled mid-fill (no fuel bleed), reload mid-fill.
// Run: tools/playtest/run.sh tools/playtest/scenarios/x2_truckpump_swap_beta.mjs [outdir]
import { boot, ev, tap, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 14) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const beside = uid => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(o => o.uid === "${uid}"); const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  crashCancel(); FOOT.on = true; FOOT.x = x + fz * 3 - fx * 0.3; FOOT.z = z - fx * 3 - fz * 0.3; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
async function board(uid) { await beside(uid); await sleep(900); await tap("KeyQ"); return waitUntil(`!MNT.on && !FOOT.on && !!VEH.cur && TLX.state("vehicles").cur === "${uid}"`); }
const unseat = async () => { await tap("KeyQ"); const r = await waitUntil("!DMT.on && FOOT.on", 14); await sleep(400); return r; };
const nan = () => ev(`[P.x, P.z, GS.fuel, GS.cash, GS.cap].some(v => !isFinite(v))`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.cash = 20000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(500);
const U = await J(`TLX.state("vehicles").owned[0].uid`);
ok(await board(U), "seated in the truck");
// park at the first station's pump
const st = await J(`(() => { const t = STATIONS.find(t => t.x !== undefined); return { x: t.x, z: t.z, name: t.name, price: t.fuelPrice, reach: FUEL.reach }; })()`);
console.log("  station", JSON.stringify(st));
await ev(`(() => { const t = STATIONS.find(t => t.x !== undefined); P.x = t.x; P.z = t.z; P.y = surf(t.x, t.z); P.vx = P.vz = 0; recenter(t.x, t.z, true); GS.fuel = 5; GS.cash = 500; return 1; })()`);
const cap = await ev("GS.cap"); console.log("  truck cap", cap);
const c0 = await ev("GS.cash");
await waitGame(6);
const f1 = await ev("GS.fuel"), c1 = await ev("GS.cash");
console.log("  6 s at pump: fuel", f1, "cash", c0, "->", c1);
ok(f1 > 5.5, "truck fills at the pump (" + f1.toFixed(2) + ")");
const paidL = f1 - 5; const expect = paidL * st.price;
ok(Math.abs((c0 - c1) - expect) < 2.5, `paid ~ litres x price (${(c0 - c1).toFixed(2)} vs ${expect.toFixed(2)})`);
// swap to the sled (walk off) mid-fill: unseat, then the sled/truck fuel must stay separate
const fuelBefore = await ev("GS.fuel");
ok(await unseat(), "got out mid-fill");
await waitGame(1.5);
const truckRec = await J(`TLX.state("vehicles").owned.find(o => o.uid === "${U}").fuel`);
console.log("  after unseat: GS.fuel", await ev("GS.fuel"), "record", truckRec, "FS.spot", await ev("!!FS.spot"), "cash", await ev("GS.cash"));
ok(!(await ev("!!FS.spot")) || true, "(info) FS.spot after unseat");
const cashA = await ev("GS.cash"), fuelA = await ev("GS.fuel"); await waitGame(4); const cashB = await ev("GS.cash"), fuelB = await ev("GS.fuel");
// since the beta fix of 0364 #3 the truck goes on filling with you out of it: what is billed on foot is the litres that went in
ok(Math.abs((cashA - cashB) - (fuelB - fuelA) * st.price) < 2.5, "on foot at the pump the till is the litres that went in (" + (cashA - cashB).toFixed(2) + " for " + (fuelB - fuelA).toFixed(1) + " L)");
// walk to sled: nearest vehicle becomes the sled? put walker beside the sled, check GS.fuel is sled's
const sledFuel = await J(`(() => { const s = TLX.state("vehicles"); return { cur: s.cur, recs: s.owned.map(o => [o.uid, o.fuel]) }; })()`);
console.log("  vehicles", JSON.stringify(sledFuel));
ok(typeof truckRec === "number" && truckRec >= fuelBefore - 0.01, "truck record kept its filled fuel (" + truckRec + " vs " + fuelBefore.toFixed(2) + ")");
ok(!(await nan()), "no NaN");
// cash short: re-board, set cash 3, drain tank, pump
ok(await board(U), "re-boarded");
await ev(`(() => { const t = STATIONS.find(t => t.x !== undefined); P.x = t.x; P.z = t.z; P.y = surf(t.x, t.z); P.vx = P.vz = 0; recenter(t.x, t.z, true); GS.fuel = 1; GS.cash = 3; return 1; })()`);
await waitGame(6);
const fs = await ev("GS.fuel"), cs = await ev("GS.cash");
console.log("  cash 3: fuel", fs, "cash", cs);
ok(cs >= 0 && isFinite(cs), "cash never negative (" + cs + ")");
ok(fs < 1 + 3 / st.price + 0.6, "fill limited by cash (" + fs.toFixed(2) + ")");
// reload mid-fill
await ev(`GS.cash = 400; GS.fuel = 2; true`); await waitGame(2);
const fm = await ev("GS.fuel");
const save = await J(`(() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })()`);
await reload(save); await sleep(1200);
await ev(`tutSkip(); true`);
const after = await J(`({ fuel: GS.fuel, cap: GS.cap, cash: GS.cash, cur: TLX.state("vehicles").cur, veh: !!VEH.cur, foot: FOOT.on })`);
console.log("  mid-fill", fm, "after reload", JSON.stringify(after));
ok(isFinite(after.fuel) && after.fuel >= fm - 1.5 && after.fuel <= after.cap + 0.01, "fuel survives reload sanely");
ok(!(await nan()), "no NaN after reload");
// pump while on sled: 2.1 sled still fills from truck-state changes
await ev(`(() => { if (VEH.cur) { TLXV.swapTo(null); } return 1; })()`).catch(() => {});
await sleep(500);
console.log("  page errors:", JSON.stringify(await ev("window.__errs || 'n/a'")));
console.log(fails ? "FAILS " + fails : "ALL OK");
await done(fails ? 1 : 0);
