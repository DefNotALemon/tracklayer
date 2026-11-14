// 3.5b1 beta break: tractor unit out of order. Real mount, empty tank, night, licence revoked + reload (seated),
// crash eject in the cab, cancel, sled state.
import { boot, ev, tap, sleep, done, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitUntil(expr, maxGame = 14) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; WX.at = () => 0; GS.storm = 0; TLX.setOn && TLX.setOn("traffic", false); GS.cash = 30000; GS.lic.freight = true; true`);
await ev(`TLXV.buy("tractor"); true`); await sleep(500);
const beside = () => ev(`(() => { const r = TLX.state("vehicles").owned[0], fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.on = true; FOOT.x = r.x + fz * 3.4 + fx * 1.6; FOOT.z = r.z - fx * 3.4 + fz * 1.6; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await beside(); await sleep(1300);
await tap("KeyQ"); await waitUntil("!MNT.on && !!VEH.cur", 14); await sleep(500);
let s = await J(`({ cur: !!VEH.cur, id: TLXV.rt() && TLXV.rt().def.id, fuel: GS.fuel, sledVis: V.machineOf(GS.own.sled).visible, rider: V.rider.visible })`);
console.log("seated", JSON.stringify(s));
ok(s.cur && s.id === "tractor", "seated in tractor");
ok(!s.sledVis, "the sled mesh is hidden while in the lorry");
// night
await ev(`GS.hour = 23.5; true`); await sleep(1500);
// empty tank
await ev(`GS.fuel = 0.3; P.vx = Math.sin(P.yaw) * 10; P.vz = Math.cos(P.yaw) * 10; true`); await sleep(5000);
s = await J(`({ fuel: GS.fuel, v: Math.hypot(P.vx, P.vz), toast: [...document.querySelectorAll("#toasts > *")].map(e => e.textContent).join("|"), hint: $("wnHint").textContent })`);
console.log("empty", JSON.stringify(s));
ok(s.fuel >= 0 && Number.isFinite(s.fuel), "fuel not negative: " + s.fuel);
// W held with empty tank: does it move
await ev(`GS.fuel = 0; P.vx = P.vz = 0; true`);
await (async () => { const { down, up } = await import("../lib.mjs"); await down("KeyW"); await sleep(4000); await up("KeyW"); })();
s = await J(`({ v: Math.hypot(P.vx, P.vz), fuel: GS.fuel, toast: [...document.querySelectorAll("#toasts > *")].map(e => e.textContent).join("|") })`);
console.log("W at empty", JSON.stringify(s));
ok(s.v < 1.5, "empty tank: no drive (" + s.v.toFixed(2) + " m/s), toast: " + s.toast.slice(-90));
// crash in the cab
await ev(`GS.fuel = 100; (() => { try { crashEject("test", 0, 1, 20, null); } catch (e) { window.__ce = String(e); } return 1; })()`); await sleep(3000);
s = await J(`({ ce: window.__ce || null, crash: CRASH.on, st: CRASH.st, foot: FOOT.on, cur: !!VEH.cur, rider: V.rider.visible, sledVis: V.machineOf(GS.own.sled).visible })`);
console.log("crash in cab", JSON.stringify(s));
ok(!s.ce, "crashEject in the lorry throws nothing");
ok(!(s.sledVis && s.cur), "no sled mesh shown during a lorry crash: " + JSON.stringify(s));
for (let i = 0; i < 20 && s.crash; i++) { await sleep(1000); s = await J(`({ crash: CRASH.on, st: CRASH.st, foot: FOOT.on, cur: !!VEH.cur, sledVis: V.machineOf(GS.own.sled).visible, rv: TLXV.rt() && TLXV.rt().grp.visible })`); }
console.log("after crash", JSON.stringify(s));
// licence revoked, reload seated
await ev(`GS.lic.freight = false; true`); await reload(); await sleep(2000);
s = await J(`({ own: TLX.state("vehicles").owned.map(r => r.id), cur: TLX.state("vehicles").cur, lic: GS.lic.freight, foot: FOOT.on, fuel: GS.fuel })`);
console.log("reload", JSON.stringify(s));
ok(s.own.includes("tractor"), "tractor survives reload without the licence flag");
await done(fails);
