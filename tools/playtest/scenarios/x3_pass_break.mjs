// Beta 3.4b1 (pull-out round an obstacle): try to break it.
//  A. sled leaves mid pull-out (teleported far): car must come back to its lane, pass cleared, drives on.
//  B. sled drives INTO the other lane toward the passing car mid pull-out: no contact beyond bounce, no tick error, pass resolves.
//  C. a queue: two cars behind a parked sled. Never closer than 1.5 m between the two cars' circles, no error.
//  D. option off mid pull-out: no tick error; option on again: cars return.
//  E. you step on/off (mount) next to the stopped car while it waits: no error.
import { boot, ev, sleep, done } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(100); } return false; }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);
const spot = await J(`(() => { const rs = TLXT.routes.slice().sort((a, b) => b.len - a.len);
  for (const r of rs) { for (let s = r.s0 + 200; s < r.s1 - 500; s += 20) { let good = true; for (let u = s; u < s + 400; u += 5) { let k = 0; while (k < r.cum.length - 2 && r.cum[k + 1] <= u) k++; if (r.vP[k] < 12.4 || r.vM[k] < 12.4 || r.street[k]) { good = false; break; } } if (good) return { id: r.id, s }; } }
  return null; })()`);
console.log("spot", JSON.stringify(spot));
ok(!!spot, "400 m straight found");
const RID = spot.id, S0 = spot.s;
const away = `(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${RID}", ${S0} - 300, 1); P.x = p.cx + 70; P.z = p.cz + 70; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`;
const park = (ahead) => `(() => { const p = TLXT.lanePt("${RID}", ${S0} + ${ahead}, 1); P.x = p.x; P.z = p.z; P.y = surf(P.x, P.z) + 0.2; P.vx = P.vz = 0; P.yaw = p.yaw; return true; })()`;

// A
await ev(away); await ev(`TLXT.place("${RID}", ${S0}, 1); true`); await ev(park(70));
await waitGame(20, async () => { await ev(`P.vx = P.vz = 0; true`); return await J(`!!(TLXT.cars[0].pass && TLXT.cars[0].pass.st)`); });
await waitGame(1.5, async () => { await ev(`P.vx = P.vz = 0; true`); return false; });
const A0 = await J(`({ pass: TLXT.cars[0].pass, lane: TLXT.cars[0].lane, v: TLXT.cars[0].v })`);
console.log("A before leave", JSON.stringify(A0));
ok(!!A0.pass, "A: a pull-out in progress");
await ev(`P.x += 400; P.z += 400; recenter(P.x, P.z, true); true`);
const Aok = await waitGame(25, async () => J(`(() => { const c = TLXT.cars[0]; return !c.pass && c.lane > 1.4 && c.v > 3; })()`));
const A1 = await J(`({ pass: TLXT.cars[0].pass, lane: TLXT.cars[0].lane, v: TLXT.cars[0].v, st: TLXT.cars[0].st, why: TLXT.cars[0].why, err: TLXT.tickErr || null })`);
console.log("A after", JSON.stringify(A1));
ok(Aok && !A1.err, "A: sled gone mid pull-out: car back in its lane and driving on");

// B
await ev(away); await ev(`TLXT.place("${RID}", ${S0}, 1); true`); await ev(park(70));
await waitGame(20, async () => { await ev(`P.vx = P.vz = 0; true`); return await J(`!!TLXT.cars[0].pass`); });
await waitGame(1.0, async () => { await ev(`P.vx = P.vz = 0; true`); return false; });
// now the sled drives down the other lane toward the car at 10 m/s
await ev(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = fz, rz = -fx; const L = c.lane; const p = TLXT.lanePt("${RID}", c.s + 60, -1); P.x = p.x; P.z = p.z; P.y = surf(P.x, P.z) + 0.2; P.yaw = Math.atan2(-fx, -fz); P.vx = -fx * 10; P.vz = -fz * 10; window.__h0 = TLXT.hits; return true; })()`);
let Bmin = 1e9, Bfin = true;
await waitGame(12, async () => { const q = await J(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); let m = 1e9; for (const u of [-1.45, 0, 1.45]) m = Math.min(m, Math.hypot(P.x - c.x - fx * u, P.z - c.z - fz * u)); return { m, fin: Number.isFinite(P.x + P.z + c.x + c.z) }; })()`); Bmin = Math.min(Bmin, q.m); if (!q.fin) Bfin = false; return false; });
const B = await J(`({ hits: TLXT.hits - window.__h0, err: TLXT.tickErr || null, pass: !!TLXT.cars[0].pass, v: TLXT.cars[0].v, lane: TLXT.cars[0].lane })`);
console.log("B", JSON.stringify(B), "closest", Bmin.toFixed(2));
ok(Bfin && !B.err, "B: oncoming sled mid pull-out: finite, no tick error");
ok(B.hits === 0, "B: car stopped / avoided the oncoming sled without a hit (hits " + B.hits + ", closest " + Bmin.toFixed(2) + " m)");

// C: queue of two behind the parked sled
await ev(away); await ev(`(() => { TLXT.place("${RID}", ${S0}, 1); TLXT.place("${RID}", ${S0} - 22, 1, 1); return true; })()`); await ev(park(80));
let Cmin = 1e9, Cpasses = 0, Cstill = 0;
await waitGame(60, async () => { await ev(`P.vx = P.vz = 0; true`); const q = await J(`(() => { const a = TLXT.cars[0], b = TLXT.cars[1]; let m = 1e9; const ca = [-1.45, 0, 1.45].map(u => [a.x + Math.sin(a.yaw) * u, a.z + Math.cos(a.yaw) * u]), cb = [-1.45, 0, 1.45].map(u => [b.x + Math.sin(b.yaw) * u, b.z + Math.cos(b.yaw) * u]); for (const x of ca) for (const y of cb) m = Math.min(m, Math.hypot(x[0] - y[0], x[1] - y[1])); return { m, pa: !!a.pass, pb: !!b.pass, sa: a.s, sb: b.s, va: a.v, vb: b.v, ea: a.on, eb: b.on }; })()`); if (q.ea && q.eb) Cmin = Math.min(Cmin, q.m); return false; });
const C = await J(`({ passes: TLXT.passes, hits: TLXT.hits, err: TLXT.tickErr || null, a: [TLXT.cars[0].s, TLXT.cars[0].v, TLXT.cars[0].st, TLXT.cars[0].dir], b: [TLXT.cars[1].s, TLXT.cars[1].v, TLXT.cars[1].st, TLXT.cars[1].dir] })`);
console.log("C", JSON.stringify(C), "closest circle gap", Cmin.toFixed(2));
ok(!C.err, "C: queue of two: no tick error");
ok(Cmin > 1.5, "C: the two queued cars never overlap (closest circle gap " + Cmin.toFixed(2) + " m between centres)");

// D: option off mid pull-out
await ev(away); await ev(`TLXT.place("${RID}", ${S0}, 1); true`); await ev(park(70));
await waitGame(20, async () => { await ev(`P.vx = P.vz = 0; true`); return await J(`!!TLXT.cars[0].pass`); });
const d1 = await J(`(() => { window.__c0 = TLXT.cars[0].s; TLX.setOn("traffic", false); return TLX.on("traffic") + " grp " + TLXT.group.visible; })()`);
console.log("option off:", d1);
await waitGame(3);
const D = await J(`({ err: TLXT.tickErr || null, on: TLXT.cars.filter(c => c.on).length, grp: TLXT.group.visible, moved: TLXT.cars[0].s - window.__c0, v: TLXT.cars[0].v })`);
console.log("D", JSON.stringify(D));
ok(!D.err, "D: option off mid pull-out: no tick error");
await ev(`(() => { TLX.setOn("traffic", true); return true; })()`);
await ev(`P.x += 5; P.vx = P.vz = 0; true`);
await waitGame(5);
const D2 = await J(`({ err: TLXT.tickErr || null, on: TLXT.cars.filter(c => c.on).length })`);
console.log("D2", JSON.stringify(D2));
ok(!D2.err, "D: option back on: no tick error (" + D2.on + " cars)");

// E: step off beside a waiting car then back on
await ev(away); await ev(`TLXT.place("${RID}", ${S0}, 1); true`); await ev(park(40));
await waitGame(5, async () => { await ev(`P.vx = P.vz = 0; true`); return false; });
await ev(`dismount(); true`);
await waitGame(5);
const E = await J(`({ foot: FOOT.on, err: TLXT.tickErr || null, pass: !!TLXT.cars[0].pass, v: TLXT.cars[0].v, why: TLXT.cars[0].why })`);
console.log("E", JSON.stringify(E));
ok(!E.err, "E: dismount beside a waiting car: no tick error (foot " + E.foot + ", why " + E.why + ")");

// F: option off: invisible cars must not still bump you
await ev(away); await ev(`(() => { TLX.setOn("traffic", false); const c = TLXT.place("${RID}", ${S0}, 1); c.v = 0; c.hold = 60; const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); P.x = c.x + fx * 20; P.z = c.z + fz * 20; P.y = surf(P.x, P.z) + 0.2; P.yaw = c.yaw + Math.PI; P.vx = -fx * 15; P.vz = -fz * 15; window.__h0 = TLXT.hits; return true; })()`);
await waitGame(3);
const F = await J(`({ hits: TLXT.hits - window.__h0, grp: TLXT.group.visible, on: TLX.on("traffic"), v: Math.hypot(P.vx, P.vz) })`);
console.log("F", JSON.stringify(F));
ok(F.hits === 0, "F: option off: sled through where a car stands, hits " + F.hits + " (ghost car if > 0)");
await ev(`TLX.setOn("traffic", true); true`);

console.log(fails ? `${fails} FAILED` : "all ok");
await done(fails ? 1 : 0);
