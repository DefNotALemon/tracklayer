// Beta fix 0108 #1: S at a standstill off the lane backs the pickup up (it used to read the bank in FRONT of the tyres and the
// untouched snow under the belly, and sat at 0.002 m/s with no word). Asserts:
//  A. truck + sled trailer (ramp up), driven off the lane, braked to a stop, S held: it backs up >= 3 m.
//  B. same with the trailer unhitched and left on the lane: >= 3 m.
//  C. the belly ploughs: after driving through deep powder the snow along the centre line behind the truck is pressed.
//  D. a truck sitting dead still in deep untouched powder never ignores S silently: it moves, or the dig warning comes
//     (reverse wording) and then the game's own bog.
// Prints ok/FAIL; exit 1 on a failure.
import { boot, ev, sleep, done, park, shot, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const toasts = () => J(`[...document.querySelectorAll("#toasts > *")].map(e => e.textContent).concat((TOASTQ || []).map(t => t.msg || t.text || String(t)))`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);
await park(); await sleep(400);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); closeGarage(); true`); await sleep(400);
ok(await J(`!!TLXV.haul() && TLX.state("vehicles").owned.length === 1`), "bought the pickup and a sled trailer");
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R || Y.r > 2) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
// truck on the lane, trailer hitched (or left behind it), ramp up
const setup = hitch => ev(`(() => { const L = ${JSON.stringify(lane)}, ux = (L.x2 - L.x) / L.L, uz = (L.z2 - L.z) / L.L, yaw = Math.atan2(ux, uz);
  const s = TLX.state("vehicles"), r = s.owned[0], cur = s.cur === r.uid, T0 = cur ? P : r; T0.x = L.x + ux * 12; T0.z = L.z + uz * 12; T0.yaw = yaw; if (cur) { P.vx = P.vz = 0; }
  const bx = T0.x - ux * 3.1, bz = T0.z - uz * 3.1, cx = bx - ux * 0.9, cz = bz - uz * 0.9, h = TLXV.haul();
  h.on = ${hitch ? "r.uid" : "null"}; h.ramp = 0; h.x = cx - ux * TLXV.HAUL.L; h.z = cz - uz * TLXV.HAUL.L; h.yaw = yaw; recenter(T0.x, T0.z, true); return 1; })()`);
const getIn = async () => {
  if (await ev(`!!VEH.cur && !FOOT.on`)) return true;
  await ev(`(() => { const r = TLX.state("vehicles").owned[0], fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3.2; FOOT.z = r.z - fx * 3.2; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; FOOT.yaw = r.yaw - 1.4; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
  await sleep(800); await down("KeyQ"); await sleep(120); await up("KeyQ");
  return waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14);
};
async function offLaneAndBack(label) {
  await down("KeyW"); await waitGame(5); await down("KeyA"); await waitGame(0.8); await up("KeyA"); await waitGame(1.5); await up("KeyW");
  await down("KeyS"); await waitUntil("Math.hypot(P.vx, P.vz) < 0.6", 8); await up("KeyS"); await waitGame(1.2);
  const p0 = await J(`({ x: P.x, z: P.z, sp: Math.hypot(P.vx, P.vz), lane: yardAt ? !!yardAt(P.x, P.z) : null })`);
  console.log(label, "stopped at", p0.x.toFixed(0), p0.z.toFixed(0), "speed", p0.sp.toFixed(3), "on lane", p0.lane);
  ok(p0.sp < 0.05 && !p0.lane, `${label}: braked to a standstill off the lane (${p0.sp.toFixed(3)} m/s)`);
  await down("KeyS"); for (let i = 0; i < 4; i++) { await waitGame(1); if (process.env.DBG) console.log("  rd", JSON.stringify(await J(`(() => { const R = TLXV.rt(); return { drag: R.drag | 0, fx: R.fx | 0, rev: R.rev, sink: R.sink.map(v => +v.toFixed(2)), acc: +BOG.acc.toFixed(2), sp: +Math.hypot(P.vx, P.vz).toFixed(3), y: +(P.y - surf(P.x, P.z)).toFixed(2), gnd: P.gnd, haul: TLXV.haul().on }; })()`))); } await up("KeyS");
  const p1 = await J(`({ x: P.x, z: P.z, bog: BOG.on })`), back = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  ok(back >= 3, `${label}: S at a standstill backs it up ${back.toFixed(1)} m in 4 s (bog ${p1.bog})`);
  await down("KeyS"); await waitGame(1); await up("KeyS");
  return back;
}

// ---- A: with the trailer
await setup(true); ok(await getIn(), "in the pickup");
await offLaneAndBack("A truck + trailer");
await shot("x2vehrev_A");
// ---- B: trailer left behind on the lane
await setup(false); await ev(`P.vx = P.vz = 0; BOG.on = false; BOG.acc = 0; true`); await waitGame(0.5);
await offLaneAndBack("B truck alone");

// ---- C/D: deep untouched powder, flat, clear of everything
const find = (LO, HI) => J(`(() => { const LO = ${LO}, HI = ${HI}; let best = null; const cx = P.x, cz = P.z;
  for (let i = 0; i < 4000; i++) { const a = i * 2.39996, r = 40 + i * 0.12, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (isSea(x, z) || isWater(x, z) || obNear(x, z, 25) || slopeAt(x, z, 8) > 0.06 || (yardAt && yardAt(x, z))) continue;
    let mn = 9; for (let k = -10; k <= 10; k++) { const xx = x + k * 0.6, ix = Math.round((xx + HALF) / CELL), iz = Math.round((z + HALF) / CELL); mn = Math.min(mn, freshAt(ix, iz), depthAt(ix, iz)); }
    if (mn > LO && mn < HI) return { x, z, d: mn, hit: 1 }; if (!best || Math.abs(mn - (LO + HI) / 2) < Math.abs(best.d - (LO + HI) / 2)) best = { x, z, d: mn }; }
  return best; })()`);
// C: powder deeper than the chassis clearance but drivable: run through it at 9 m/s, then look at the centre line behind
const mid = await find(0.34, 0.46);
console.log("mid spot", JSON.stringify(mid));
ok(mid && mid.hit, `found powder over the clearance (${mid && mid.d.toFixed(2)} m)`);
await ev(`(() => { TLXV.haul().on = null; P.x = ${mid.x} - 8; P.z = ${mid.z}; P.yaw = Math.PI / 2; P.vx = 9; P.vz = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; BOG.immune = 0; recenter(P.x, P.z, true); return 1; })()`);
const spot = mid;
await down("KeyW"); await waitGame(2); await up("KeyW"); await waitGame(1.5);
const tr = await J(`(() => { const out = []; const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), R = TLXV.rt(), hc = (R.H[0] + R.H[1] + R.H[2] + R.H[3]) / 4;
  for (const b of [1.5, 2, 2.5]) { const x = P.x - fx * b, z = P.z - fz * b, ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL); out.push({ b, f: +freshAt(ix, iz).toFixed(2), d: +depthAt(ix, iz).toFixed(2) }); }
  return { out, moved: Math.hypot(P.x - (${spot.x} - 8), P.z - ${spot.z}), hc: +(hc - surf(P.x, P.z)).toFixed(2) }; })()`).catch(() => null);
console.log("trench", JSON.stringify(tr));
ok(tr && tr.moved > 2.5, `ploughed ${tr && tr.moved.toFixed(1)} m into the powder`);
ok(tr && tr.out.every(c => c.d < c.f * 0.85), `the belly pressed a trench along the centre line behind (depth/fresh ${tr && tr.out.map(c => c.d + "/" + c.f).join(", ")})`);
await shot("x2vehrev_C");
// C2: and S backs it out along that trench (or, if it can't, says so)
{ const q0 = await J(`({ x: P.x, z: P.z })`); await ev(`BOG.warned = false; true`);
  await down("KeyS"); await waitGame(4); await up("KeyS");
  const q1 = await J(`({ x: P.x, z: P.z, bog: BOG.on, warned: BOG.warned })`), mv = Math.hypot(q1.x - q0.x, q1.z - q0.z);
  ok(mv >= 1, `S backs it out along its own trench: ${mv.toFixed(1)} m in 4 s (bog ${q1.bog})`); }
// D: dead still in deep untouched powder, S held 14 s: never silent
const deep = await find(0.55, 3);
console.log("deep spot", JSON.stringify(deep));
ok(deep && deep.d > 0.5, `found deep untouched powder (${deep && deep.d.toFixed(2)} m)`);
await ev(`(() => { P.x = ${deep.x}; P.z = ${deep.z}; P.yaw = -Math.PI / 2; P.vx = P.vz = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; recenter(P.x, P.z, true); if (TOASTQ) TOASTQ.length = 0; document.querySelectorAll("#toasts > *").forEach(e => e.remove()); return 1; })()`);
await waitGame(0.6);
const d0 = await J(`({ x: P.x, z: P.z })`);
let seen = [], t0 = await clock(); await down("KeyS");
while ((await clock()) - t0 < 14) { await sleep(300); for (const t of await toasts()) if (!seen.includes(t)) seen.push(t); if (await ev("BOG.on")) break; }
await up("KeyS");
const d1 = await J(`({ x: P.x, z: P.z, bog: BOG.on, warned: BOG.warned, acc: BOG.acc })`), mv = Math.hypot(d1.x - d0.x, d1.z - d0.z);
console.log("D", JSON.stringify(d1), "moved", mv.toFixed(2), "toasts", JSON.stringify(seen));
const warnRev = seen.some(t => /spin in reverse/.test(t));
ok(mv >= 1 || (warnRev && (d1.bog || d1.warned)), `S in deep powder is never silent: moved ${mv.toFixed(1)} m, reverse dig warning ${warnRev}, bogged ${d1.bog}`);
if (mv < 1) ok(d1.bog, "held long enough, it bogs (the game's STUCK path with its own hint)");
await shot("x2vehrev_D");
await done(fails ? 1 : 0);
