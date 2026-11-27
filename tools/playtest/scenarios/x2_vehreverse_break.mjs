// Beta break test of the 0108 reverse fix (v187): pad trigger (full + light pull), touch brake, night, slope, flip W<->S, full lock, reload.
// 27 Nov (lane A): the spots. `fresh()` looked for snow under 30 cm off the plowed ground within ~300 m of the stop, in
// town; since the street grid there is none (it returned 0 unchecked), so every step after A backed the same truck
// further into the same 55-70 cm powder and "failed". It now takes a flat open spot anywhere on the map, lays 20 cm of
// loose snow round it (the depth the steps were written for) and the run stops if it finds none. Toasts are recorded
// as they appear (they live 4.2 s of wall time), and the touch pedal is pressed after the touch buttons are up.
import { boot, ev, sleep, done, park, shot, down, up, padSet, padOff, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(150); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg || t.text || String(t))).concat([...document.querySelectorAll("#toasts > *")].map(e => e.textContent)))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; document.getElementById("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg || t.text || String(t)).concat([...document.querySelectorAll("#toasts > *")].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return 1; })()`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; true`);
await park(); await sleep(400);
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(500);
await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(e => /Fjordhenger/.test(e.textContent)).click(); closeGarage(); true`); await sleep(400);
ok(await J(`!!TLXV.haul() && TLX.state("vehicles").owned.length === 1`), "bought the pickup and a sled trailer");
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Y.r > 5) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
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

await setup(true); ok(await getIn(), "in the pickup");
// drive off the lane and stop
await down("KeyW"); await waitGame(5); await down("KeyA"); await waitGame(0.8); await up("KeyA"); await waitGame(1.5); await up("KeyW");
await down("KeyS"); await waitUntil("Math.hypot(P.vx, P.vz) < 0.6", 8); await up("KeyS"); await waitGame(1.2);
const pos = () => J(`({ x: P.x, z: P.z, yaw: P.yaw, vx: P.vx, vz: P.vz, bog: BOG.on, fin: [P.x,P.y,P.z,P.yaw].every(Number.isFinite) })`);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// stop it whichever way it rolls (S held on a truck already backing up is more reverse, not a brake: the old stop backed it out of the spot)
const VF = "(P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw))";
const stillNow = async () => { await padSet(); if (await ev(`${VF} < -0.4`)) { await down("KeyW"); await waitUntil(`${VF} > -0.4`, 8); await up("KeyW"); } if (await ev(`${VF} > 0.4`)) { await down("KeyS"); await waitUntil(`${VF} < 0.4`, 8); await up("KeyS"); } await waitUntil("Math.hypot(P.vx, P.vz) < 0.3", 6); await waitGame(0.6); };
let spotN = 0;
const LAY = 0.2;   // m of loose snow laid round each spot
const fresh = async (lay = LAY) => { spotN++; const got = await J(`(() => { TLXV.haul().on = null; BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; WX.at = () => 0; GS.storm = 0;
  for (let i = 0; i < 9000; i++) { const a = (i + ${spotN} * 37) * 2.39996, r = 150 + ${spotN} * 140 + i * 0.35, x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r;
    if (Math.abs(x) > HALF - 200 || Math.abs(z) > HALF - 200 || isSea(x, z) || isWater(x, z) || bioAt(x, z) === 1 || obNear(x, z, 25) || slopeAt(x, z, 8) > 0.03 || slopeAt(x, z, 20) > 0.04 || yardAt(x, z) > 0.05) continue;
    if (window.TLXR && TLXR.near && TLXR.near(x, z).d < 40) continue;
    P.x = x; P.z = z; P.yaw = a; P.vx = P.vy = P.vz = 0; recenter(x, z, true);
    for (let ix = Math.floor((x - 30 + HALF) / CELL); ix <= Math.ceil((x + 30 + HALF) / CELL); ix++) for (let iz = Math.floor((z - 30 + HALF) / CELL); iz <= Math.ceil((z + 30 + HALF) / CELL); iz++) { const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = ${lay}; c.d[k] = ${lay}; writeCell(ix, iz, d0, ${lay}, ${lay}); }
    recenter(x, z, true); P.y = surf(x, z); return { x: Math.round(x), z: Math.round(z), r: Math.round(r), slope: +slopeAt(x, z, 8).toFixed(3) }; } return null; })()`);
  ok(!!got, `spot ${spotN}: a flat open spot with ${Math.round(lay * 100)} cm of loose snow laid (${JSON.stringify(got)})`); if (!got) { await done(1); }
  await waitGame(1.5); return pos(); };
const base0 = await pos();
const tel = () => J(`(() => { const R = TLXV.rt(); return { rev: R.rev, fx: R.fx | 0, drag: R.drag | 0, sink: R.sink.map(v => +v.toFixed(2)), acc: +BOG.acc.toFixed(2), d: +(surf(P.x, P.z) - 0).toFixed(2) }; })()`).catch(() => null);
const base = await fresh(); console.log("stopped", JSON.stringify(base));
// A: pad full pull of LT
await padSet({ 6: 1 }); await waitGame(4); await padSet();
let a = await pos(); ok(dist(a, base) >= 3 && a.fin, `A pad LT full: backs up ${dist(a, base).toFixed(1)} m (bog ${a.bog})`);
await stillNow();
// B: pad LT light pull 0.3
let b0 = await fresh(); await padSet({ 6: 0.3 }); await waitGame(5); console.log("B tel", JSON.stringify(await tel())); await padSet();
let b = await pos(); const bd = dist(b, b0); ok(bd >= 2 && !b.bog, `B pad LT 30% in 20 cm: backs up ${bd.toFixed(1)} m (bog ${b.bog}; 0.0 m before the 27 Nov fix)`);
await stillNow();
let b2 = await fresh(); await padSet({ 6: 0.6 }); await waitGame(4); await padSet(); let b3 = await pos(); ok(dist(b3, b2) >= 3, `B2 pad LT 60% in 20 cm: backs up ${dist(b3, b2).toFixed(1)} m`);
await stillNow();
// B3: a tenth of the trigger in 20 cm
{ const q0 = await fresh(); await padSet({ 6: 0.12 }); await waitGame(5); await padSet(); const q1 = await pos(); ok(dist(q1, q0) >= 0.8 && !q1.bog, `B3 pad LT 12% in 20 cm: creeps back ${dist(q1, q0).toFixed(1)} m (bog ${q1.bog})`); await stillNow(); }
// B4: a light pull in snow it cannot back through on that pull: it is told to give more (not "too much snow behind"), and more does it
{ let told = null, q0 = null, mv = 0, depth = 0;
  for (const dd of [0.3, 0.34, 0.38]) { q0 = await fresh(dd); await clearToasts(); await padSet({ 6: 0.1 }); await waitGame(4.5); const t = await toasts(); const line = await ev(`TLXV.rt().stuckWhy || ""`); await padSet(); const q1 = await pos(); mv = dist(q1, q0); depth = dd; console.log(`B4 LT 10% in ${dd * 100} cm: ${mv.toFixed(2)} m, why "${line}", toasts ${JSON.stringify(t)}`); if (mv < 0.4) { told = { t, line }; break; } await stillNow(); }
  ok(!!told, `B4 found a depth a tenth of the trigger cannot back through (${Math.round(depth * 100)} cm, ${mv.toFixed(2)} m)`);
  if (told) { ok(told.t.some(m => /Not enough pedal to back through/.test(m)) && told.line === "pull", `B4 it says to give it more (why "${told.line}", ${JSON.stringify(told.t)})`);
    ok(!told.t.some(m => /Too much snow behind/.test(m)), "B4 and not that there is too much snow behind");
    const h0 = await pos(); await padSet({ 6: 1 }); await waitGame(4); await padSet(); const h1 = await pos(); ok(dist(h1, h0) >= 2, `B4 the full trigger from the same place backs out ${dist(h1, h0).toFixed(1)} m (the advice is true)`); } }
await stillNow();
// C: touch brake via TC.sbrk
let c0 = await fresh(); await padOff(); await ev(`SET.touch = "on"; setTouchUI(); true`); await waitGame(0.8);   // the buttons first: the frame they come up on lets go of every pedal
await ev(`(() => { const e = document.getElementById("tcBrk"); e.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 7, bubbles: true, clientX: 50, clientY: 50, isPrimary: true, pointerType: "touch" })); return 1; })()`); await waitGame(4); console.log("C tel", JSON.stringify(await tel())); const cb = await ev(`TC.brk + "/" + input.brk + "/" + TC.on`); console.log("C brk", cb); await ev(`document.getElementById("tcBrk").dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, bubbles: true, pointerType: "touch" })); TC.brk = 0; true`);
ok(/^1\/1\/true$/.test(cb), `C the BRAKE pedal is held down for the whole pull (TC.brk / input.brk / TC.on = ${cb})`);
let c = await pos(); ok(dist(c, c0) >= 2 || c.bog, `C touch BRAKE pedal: backs up ${dist(c, c0).toFixed(1)} m (bog ${c.bog})`);
await ev(`SET.touch = "auto"; setTouchUI(); true`);
await fresh();
// D: reverse with full lock each way, then flip straight to W while rolling backwards
{ const z0 = await pos(); await down("KeyS"); await waitGame(3); await up("KeyS"); const z1 = await pos(); console.log(`D0 S only at the same spot: ${dist(z1, z0).toFixed(1)} m`); }
await stillNow();
for (const k of ["KeyA", "KeyD"]) {
  await fresh();
  { const y0 = await pos(); await down("KeyS"); await down(k); await waitGame(1.0); await up(k); await up("KeyS"); const y1 = await pos(); console.log(`D1 ${k} 1 s standstill: ${dist(y1, y0).toFixed(2)} m`); await stillNow(); }
  const d0 = await pos(); await clearToasts(); await ev(`BOG.warned=false; true`); await down("KeyS"); await down(k); await waitGame(4); const mid = await J(`({ vf: P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw) })`);
  const dts = await toasts(); console.log("D tel", k, JSON.stringify(await tel()), JSON.stringify(dts)); await up(k); await up("KeyS"); const d1 = await pos();
  ok(!dts.some(m => /Not enough pedal/.test(m)), `D ${k}: the whole pedal (a key) is never told to give it more`);
  await stillNow();
  ok(d1.fin && Math.hypot(d1.vx, d1.vz) < 12 && dist(d1, d0) > 2 && Math.abs(d1.yaw - d0.yaw) > 0.1, `D ${k}: reverse w/ lock: ${dist(d1, d0).toFixed(1)} m, vf ${mid.vf.toFixed(1)} m/s, yaw turned ${(d1.yaw - d0.yaw).toFixed(2)}, finite ${d1.fin}`);
}
await fresh();
await down("KeyS"); await waitGame(2.5); await up("KeyS"); const e0 = await J(VF); console.log(`E rolling back at ${e0.toFixed(1)} m/s`);
await down("KeyW"); await waitGame(2.5); const w = await J(`({ vf: P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw), fin: [P.x,P.y,P.z].every(Number.isFinite), n: TLXV.rt().rev })`); await up("KeyW");
ok(w.fin && e0 < -1 && w.vf > 0.5, `E flip S -> W: forward speed after 2.5 s ${w.vf.toFixed(1)} m/s (rev flag ${w.n})`);
await stillNow();
// F: night
await ev(`GS.hour = 23.5; true`); await waitGame(1);
let f0 = await fresh(); await down("KeyS"); await waitGame(4); console.log("F tel", JSON.stringify(await tel())); await up("KeyS"); let f = await pos();
ok(dist(f, f0) >= 2 || f.bog, `F night: reverse ${dist(f, f0).toFixed(1)} m (bog ${f.bog})`);
await shot("x2vehrevB_night");
await stillNow();
// G: reverse UP a slope: find a ~0.10-0.2 grade spot, face downhill so back is uphill
const sl = await J(`(() => { const cx = P.x, cz = P.z; for (let i = 0; i < 6000; i++) { const a = i * 2.39996, r = 30 + i * 0.2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 20)) continue; const g = slopeAt(x, z, 8); if (g > 0.10 && g < 0.2) { const e = 1, gx = (surf(x + e, z) - surf(x - e, z)) / 2, gz = (surf(x, z + e) - surf(x, z - e)) / 2; return { x, z, g, yaw: Math.atan2(-gx, -gz) }; } } return null; })()`);
console.log("slope", JSON.stringify(sl));
if (sl) {
  await ev(`(() => { TLXV.haul().on = null; P.x = ${sl.x}; P.z = ${sl.z}; P.yaw = ${sl.yaw}; P.vx = P.vz = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; BOG.immune = 0; recenter(P.x, P.z, true); return 1; })()`); await waitGame(1);
  const g0 = await pos(); await clearToasts(); await down("KeyS"); await waitGame(5); await up("KeyS"); const g = await pos();
  const toasts1 = await toasts();
  ok(g.fin && (dist(g, g0) > 0.5 || g.bog || toasts1.some(t => /spin|stuck|dig|steep|snow|grip/i.test(t))), `G uphill grade ${sl.g.toFixed(2)} in reverse: ${dist(g, g0).toFixed(1)} m, bog ${g.bog}, toasts ${JSON.stringify(toasts1)}`);
  await shot("x2vehrevB_slope");
}
// H: reload mid-bog / mid-reverse keeps a sane truck
await ev(`GS.hour = 12; true`);
const sv = await J(`({ n: TLX.state("vehicles").owned.length })`);
await reload(); await sleep(1500);
const after = await J(`({ n: TLX.state("vehicles").owned.length, cur: !!VEH.cur, fin: [P.x,P.y,P.z].every(Number.isFinite), bog: BOG.on })`);
ok(after.n === sv.n && after.fin, `H reload: truck still owned (${after.n}), finite ${after.fin}, cur ${after.cur}, bog ${after.bog}`);
await done(fails ? 1 : 0);
