// Beta (0222): 4.1a1 plow blade x 2.6 sled trailer. Pickup with blade + Fjordhenger hitched: drop blade, drive in snow, reverse, E label, reload. Facts printed; exit 1 on hard FAIL.
import { boot, ev, sleep, done, tap, down, up, park, reload, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 30000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
console.log("parked", JSON.stringify(await park()));
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const U = JSON.stringify(await ev(`TLXV.state().owned[0].uid`));
await ev(`TLXV.swapTo(${U}); FOOT.on = false; true`); await sleep(600);
await ev(`TLXPL.fit(${U}, "b23"); true`);
const bt = await ev(`(() => { try { const f = TLXV.buyHaul || TLXV.buyTrailer; return f ? String(f()) : "none:" + Object.keys(TLXV).filter(k => /haul|trail/i.test(k)).join(","); } catch (e) { return "ERR " + e.message; } })()`);
console.log("buy trailer ->", bt);
const hs = await J(`(() => { const h = TLXV.haul(); return h ? { on: h.on, x: h.x, z: h.z } : null; })()`);
console.log("haul", JSON.stringify(hs));
// hitch it straight behind the truck
await ev(`(() => { const h = TLXV.haul(); if (!h) return 0; const b = TLXV.ballOf(h.on == null ? ${U} : h.on) || [P.x, P.z]; h.on = ${U}; h.ramp = 0; h.strap = null; h.yaw = P.yaw; h.x = P.x - Math.sin(P.yaw) * (3.1 + TLXV.HAUL.L); h.z = P.z - Math.cos(P.yaw) * (3.1 + TLXV.HAUL.L); return 1; })()`);
await waitGame(1);
const lbl0 = await ev(`VEH.cur && VEH.cur.useLabel ? VEH.cur.useLabel() : null`);
console.log("E label with trailer hitched, blade up:", lbl0);
// find real snow depth ahead
const d0 = await J(`(() => { const b = TLXPL.rt(${U}); return { depth: b.depth, cut: b.cut }; })()`);
console.log("snow ahead", JSON.stringify(d0));
await ev(`TLXPL.rt(${U}).down = true; true`);
const T0 = await J(`({ x: P.x, z: P.z, hx: TLXV.haul().x, hz: TLXV.haul().z })`);
await down("KeyW"); const samples = []; const t0 = await clock();
while ((await clock()) - t0 < 8) { samples.push(await J(`(() => { const b = TLXPL.rt(${U}), h = TLXV.haul(); return { sp: Math.hypot(P.vx, P.vz), drag: b.drag, cut: b.cut, d: Math.hypot(h.x - P.x, h.z - P.z), fin: [P.x, P.y, P.z, h.x, h.z].every(Number.isFinite), hint: WN.show ? WN.hint : "" }; })()`)); await sleep(250); }
await up("KeyW");
const mv = await J(`Math.hypot(P.x - ${T0.x}, P.z - ${T0.z})`);
console.log("moved", mv.toFixed(1), "m; last", JSON.stringify(samples[samples.length - 1]));
console.log("speeds", samples.filter((_, i) => i % 4 == 0).map(s => s.sp.toFixed(1) + "/" + s.drag.toFixed(0)).join(" "));
ok(samples.every(s => s.fin), "T1 all positions finite while plowing with the trailer");
const ds = samples.map(s => s.d); console.log("trailer distance range", Math.min(...ds).toFixed(2), Math.max(...ds).toFixed(2));
ok(Math.max(...ds) - Math.min(...ds) < 1.5, "T2 trailer stays at the ball (range " + (Math.max(...ds) - Math.min(...ds)).toFixed(2) + ")");
ok(mv > 5, "T3 truck moves with blade down + trailer (" + mv.toFixed(1) + " m)");
const dragWith = Math.max(...samples.map(s => s.drag));
const lbl1 = await ev(`VEH.cur && VEH.cur.useLabel ? VEH.cur.useLabel() : null`);
console.log("E label blade down:", lbl1);
// reverse with blade down + trailer
await down("KeyS"); await waitGame(3); await up("KeyS");
const rv = await J(`({ fin: [P.x, P.y, P.z].every(Number.isFinite), d: Math.hypot(TLXV.haul().x - P.x, TLXV.haul().z - P.z), jack: 0 })`);
ok(rv.fin && rv.d < 8, "T4 reversing with blade down + trailer stays sane (d " + rv.d.toFixed(2) + ")");
await shot("blade_trailer");
// reload
const sv = await J(`({ blade: !!TLXPL.bladeOf(${U}), on: TLXV.haul() && TLXV.haul().on })`);
await reload(); await sleep(1500);
const after = await J(`({ blade: !!TLXPL.bladeOf(${U}), on: TLXV.haul() && TLXV.haul().on, down: TLXPL.rt(${U}).down })`);
console.log("before reload", JSON.stringify(sv), "after", JSON.stringify(after));
ok(after.blade === sv.blade && after.on === sv.on, "T5 blade and hitch survive reload");
await done(fails ? 1 : 0);
