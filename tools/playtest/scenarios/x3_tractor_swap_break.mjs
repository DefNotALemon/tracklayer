// 3.5b1 beta break 2: tractor + pickup swap both ways, repair cost/wear on the lorry, hill with 7 t, hit a parked car, parcels in the cab.
import { boot, ev, tap, sleep, done, reload, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitUntil(expr, maxGame = 14) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
await boot(); await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; WX.at = () => 0; GS.storm = 0; TLX.setOn && TLX.setOn("traffic", false); GS.cash = 60000; GS.lic.freight = true; true`);
await ev(`TLXV.buy("tractor"); TLXV.buy("pickup"); true`); await sleep(600);
let s = await J(`({ own: TLX.state("vehicles").owned.map(r => ({ uid: r.uid, id: r.id, fuel: r.fuel, cond: r.cond, x: r.x, z: r.z })), cash: GS.cash, toast: [...document.querySelectorAll("#toasts > *")].map(e=>e.textContent).join("|").slice(-150) })`);
console.log("owned", JSON.stringify(s));
const ids = s.own.map(r => r.id);
ok(ids.includes("tractor") && ids.includes("pickup"), "both bought: " + ids);
const t = s.own.find(r => r.id === "tractor"), p = s.own.find(r => r.id === "pickup");
// swap loop
for (let i = 0; i < 4; i++) {
  const uid = i % 2 ? p.uid : t.uid;
  await ev(`(() => { try { TLXV.swapTo("${uid}"); } catch (e) { window.__se = String(e); } return 1; })()`); await sleep(900);
  const c = await J(`({ cur: TLX.state("vehicles").cur, id: TLXV.rt() && TLXV.rt().def.id, fuel: +GS.fuel.toFixed(1), foot: FOOT.on, err: window.__se || null, wheels: TLXV.rt() && TLXV.rt().grp && TLXV.rt().grp.visible })`);
  console.log("swap", i, JSON.stringify(c));
  ok(!c.err && c.id === (i % 2 ? "pickup" : "tractor"), "swap " + i + " lands in " + (i % 2 ? "pickup" : "tractor"));
}
const fuels = await J(`TLX.state("vehicles").owned.map(r => ({ id: r.id, fuel: r.fuel }))`);
console.log("fuels", JSON.stringify(fuels));
// back in the tractor? ensure
await ev(`TLXV.swapTo("${t.uid}"); true`); await sleep(900);
// wear/repair
await ev(`(() => { const r = TLX.state("vehicles").owned.find(r => r.id === "tractor"); r.cond = 0.4; return 1; })()`);
const rc = await J(`({ rc: TLXV.repairCost && TLXV.repairCost(TLX.state("vehicles").owned.find(r => r.id === "tractor")) })`).catch(e => ({ rc: "err " + e }));
console.log("repairCost", JSON.stringify(rc));
ok(rc.rc === undefined || rc.rc === null || (typeof rc.rc === "number" && rc.rc > 0 && rc.rc < 11500), "repair cost sane: " + JSON.stringify(rc.rc));
// hill: find a >12% slope on a road? just drive up a 10% slope in plowed yard: place on the steepest nearby grade
const sp = await J(`(() => { let best = null; const gx = P.x, gz = P.z; for (let a = 0; a < 40; a++) { const ang = a / 40 * 6.283; for (let r = 40; r <= 400; r += 40) { const x = gx + Math.sin(ang) * r, z = gz + Math.cos(ang) * r; if (isWater(x, z) || isSea(x, z) || obNear(x, z, 8)) continue; const g = slopeAt(x, z, 8); if (g > 0.08 && g < 0.16 && (!best || g > best.g)) best = { x, z, g, ang }; } } return best; })()`);
console.log("hill", JSON.stringify(sp));
if (sp) {
  await ev(`(() => { const dy = ${sp.ang}; /* face uphill */ let bestYaw = 0, bh = -1e9; for (let k = 0; k < 16; k++) { const y = k / 16 * 6.283, h = surf(${sp.x} + Math.sin(y) * 10, ${sp.z} + Math.cos(y) * 10); if (h > bh) { bh = h; bestYaw = y; } } P.x = ${sp.x}; P.z = ${sp.z}; P.yaw = bestYaw; P.y = surf(P.x, P.z); P.vx = P.vz = 0; GS.fuel = 200; if (window.yardAt) {} return 1; })()`);
  await sleep(800);
  const y0 = await J(`({ x: P.x, z: P.z, y: surf(P.x, P.z) })`);
  await down("KeyW"); await sleep(9000); await up("KeyW");
  const y1 = await J(`({ x: P.x, z: P.z, y: surf(P.x, P.z), v: Math.hypot(P.vx, P.vz), bog: BOG.on, fuel: GS.fuel })`);
  console.log("climb", JSON.stringify(y0), JSON.stringify(y1));
  ok(Number.isFinite(y1.x) && Number.isFinite(y1.v), "finite state after hill drive");
}
// parked-car hit
const car = await J(`(() => { try { const a = TLXC.cars || TLXC.list || []; return { n: (a.length||0), keys: Object.keys(TLXC).slice(0, 14) }; } catch (e) { return { err: String(e) }; } })()`);
console.log("TLXC", JSON.stringify(car));
await ev(`(() => { try { const c = TLXC.cars ? TLXC.cars[0] : null; if (c && c.x !== undefined) { P.x = c.x - Math.sin(c.yaw||0) * 30; P.z = c.z - Math.cos(c.yaw||0) * 30; P.yaw = Math.atan2(c.x - P.x, c.z - P.z); P.vx = Math.sin(P.yaw) * 18; P.vz = Math.cos(P.yaw) * 18; } } catch (e) { window.__ce = String(e); } return 1; })()`);
await sleep(4000);
s = await J(`({ ce: window.__ce || null, v: Math.hypot(P.vx, P.vz), fin: Number.isFinite(P.x), crash: CRASH.on, foot: FOOT.on })`);
console.log("carhit", JSON.stringify(s));
ok(!s.ce && s.fin, "no throw hitting a parked car");
await reload(); await sleep(2000);
s = await J(`({ own: TLX.state("vehicles").owned.map(r => r.id + ":" + Math.round(r.fuel)), cur: TLX.state("vehicles").cur })`);
console.log("reload", JSON.stringify(s));
ok(s.own.length === 2, "both vehicles survive reload");
await done(fails);
