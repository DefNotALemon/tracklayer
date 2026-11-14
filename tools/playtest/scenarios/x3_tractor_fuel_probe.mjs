// probe: tractor empty tank far from a pump; sled mesh world visibility while in the lorry
import { boot, ev, tap, sleep, done, down, up } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitUntil(expr, maxGame = 14) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; WX.at = () => 0; GS.storm = 0; TLX.setOn && TLX.setOn("traffic", false); GS.cash = 30000; GS.lic.freight = true; TLXV.buy("tractor"); true`); await sleep(500);
await ev(`(() => { const r = TLX.state("vehicles").owned[0], fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); FOOT.on = true; FOOT.x = r.x + fz * 3.4 + fx * 1.6; FOOT.z = r.z - fx * 3.4 + fz * 1.6; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`); await sleep(1300);
await tap("KeyQ"); await waitUntil("!MNT.on && !!VEH.cur", 14); await sleep(500);
console.log(await ev(`JSON.stringify((() => { const m = V.machineOf(GS.own.sled); let vis = true, o = m; while (o) { if (!o.visible) vis = false; o = o.parent; } return { selfVis: m.visible, worldVis: vis, id: GS.own.sled }; })())`));
// far from depot
const far = await J(`(() => { const p = TLXR.routes.find(r => r.cum && !r.closed).pts; let q = p[0]; for (const a of p) if (Math.hypot(a[0] - depot.x, a[1] - depot.z) > 1500) { q = a; break; } return { x: q[0], z: q[1], d: Math.hypot(q[0] - depot.x, q[1] - depot.z) }; })()`);
console.log("far", JSON.stringify(far));
await ev(`P.x = ${far.x}; P.z = ${far.z}; P.vx = P.vz = 0; recenter(P.x, P.z, true); P.y = surf(P.x, P.z); camState.init = false; GS.fuel = 0; true`); await sleep(1500);
console.log("at empty", await ev(`JSON.stringify({ fuel: GS.fuel, hint: $("wnHint").textContent })`));
await down("KeyW"); await sleep(4000); await up("KeyW");
const s = await J(`({ v: Math.hypot(P.vx, P.vz), fuel: GS.fuel, toast: [...document.querySelectorAll("#toasts > *")].map(e => e.textContent).join("|"), hint: $("wnHint").textContent, out: GS.outOfFuel })`);
console.log("W empty", JSON.stringify(s));
ok(s.v < 1, "empty tank, no drive: " + s.v.toFixed(2));
await done(fails);
