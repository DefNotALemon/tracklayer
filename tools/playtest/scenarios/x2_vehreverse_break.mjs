// Beta break test of the 0108 reverse fix (v187): pad trigger (full + light pull), touch brake, night, slope, flip W<->S, full lock, reload.
import { boot, ev, sleep, done, park, shot, down, up, padSet, padOff, reload } from "../lib.mjs";
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
const lane = await J(`(() => { let best = null; for (const Y of YARDS) { if (Y.x2 === undefined || Y.r > 2) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { x: Y.x, z: Y.z, x2: Y.x2, z2: Y.z2, L }; } return best; })()`);
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
const stillNow = async () => { await down("KeyS"); await waitUntil("Math.hypot(P.vx, P.vz) < 0.3", 8); await up("KeyS"); await waitGame(1); };
let spotN = 0;
const fresh = async () => { spotN++; await ev(`(() => { TLXV.haul().on = null; BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; const cx = ${base0.x}, cz = ${base0.z}; for (let i = 0; i < 6000; i++) { const a = (i + ${spotN} * 37) * 2.39996, r = 60 + ${spotN} * 45 + i * 0.1, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (isSea(x, z) || isWater(x, z) || obNear(x, z, 25) || slopeAt(x, z, 8) > 0.04 || (yardAt && yardAt(x, z))) continue; const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL); if (depthAt(ix, iz) > 0.3) continue; P.x = x; P.z = z; P.yaw = a; P.vx = P.vz = 0; P.y = surf(x, z); recenter(x, z, true); return 1; } return 0; })()`); await waitGame(1.5); return pos(); };
const base0 = await pos();
const tel = () => J(`(() => { const R = TLXV.rt(); return { rev: R.rev, fx: R.fx | 0, drag: R.drag | 0, sink: R.sink.map(v => +v.toFixed(2)), acc: +BOG.acc.toFixed(2), d: +(surf(P.x, P.z) - 0).toFixed(2) }; })()`).catch(() => null);
const base = await fresh(); console.log("stopped", JSON.stringify(base));
// A: pad full pull of LT
await padSet({ 6: 1 }); await waitGame(4); await padSet();
let a = await pos(); ok(dist(a, base) >= 3 && a.fin, `A pad LT full: backs up ${dist(a, base).toFixed(1)} m (bog ${a.bog})`);
await stillNow();
// B: pad LT light pull 0.3
let b0 = await fresh(); await padSet({ 6: 0.3 }); await waitGame(5); console.log("B tel", JSON.stringify(await tel())); await padSet();
let b = await pos(); const bd = dist(b, b0); ok(bd >= 1 || b.bog, `B pad LT 30%: moved ${bd.toFixed(1)} m (bog ${b.bog})`);
await stillNow();
let b2 = await fresh(); await padSet({ 6: 0.6 }); await waitGame(4); await padSet(); let b3 = await pos(); console.log(`B2 pad LT 60%: moved ${dist(b3, b2).toFixed(1)} m`);
// C: touch brake via TC.sbrk
let c0 = await fresh(); await padOff(); await ev(`SET.touch = "on"; setTouchUI(); (() => { const e = document.getElementById("tcBrk"); e.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 7, bubbles: true, clientX: 50, clientY: 50, isPrimary: true, pointerType: "touch" })); return 1; })()`); await waitGame(4); console.log("C tel", JSON.stringify(await tel())); console.log("C brk", await ev(`TC.brk + "/" + input.brk + "/" + TC.on + "/" + INP.dev`)); await ev(`document.getElementById("tcBrk").dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, bubbles: true, pointerType: "touch" })); TC.brk = 0; true`);
let c = await pos(); ok(dist(c, c0) >= 2 || c.bog, `C touch stick down: moved ${dist(c, c0).toFixed(1)} m (bog ${c.bog})`);
await ev(`SET.touch = "auto"; setTouchUI(); true`);
await fresh();
// D: reverse with full lock each way, then flip straight to W while rolling backwards
{ const z0 = await pos(); await down("KeyS"); await waitGame(3); await up("KeyS"); const z1 = await pos(); console.log(`D0 S only at the same spot: ${dist(z1, z0).toFixed(1)} m`); }
await stillNow();
for (const k of ["KeyA", "KeyD"]) {
  { const y0 = await pos(); await down("KeyS"); await down(k); await waitGame(1.0); await up(k); await up("KeyS"); const y1 = await pos(); console.log(`D1 ${k} 1 s standstill: ${dist(y1, y0).toFixed(2)} m`); await stillNow(); }
  const d0 = await pos(); await ev(`BOG.warned=false; true`); await down("KeyS"); await down(k); await waitGame(4); const mid = await J(`({ vf: P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw) })`);
  console.log("D tel", k, JSON.stringify(await tel()), JSON.stringify(await toasts())); await up(k); await up("KeyS"); const d1 = await pos();
  ok(d1.fin && Math.hypot(d1.vx, d1.vz) < 12, `D ${k}: reverse w/ lock: ${dist(d1, d0).toFixed(1)} m, vf ${mid.vf.toFixed(1)} m/s, yaw turned ${(d1.yaw - d0.yaw).toFixed(2)}, finite ${d1.fin}`);
}
await down("KeyS"); await waitGame(2.5); await up("KeyS");
await down("KeyW"); await waitGame(2); const w = await J(`({ vf: P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw), fin: [P.x,P.y,P.z].every(Number.isFinite), n: TLXV.rt().rev })`); await up("KeyW");
ok(w.fin && w.vf > -0.5, `E flip S -> W: forward speed after 2 s ${w.vf.toFixed(1)} m/s (rev flag ${w.n})`);
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
  const g0 = await pos(); await down("KeyS"); await waitGame(5); await up("KeyS"); const g = await pos();
  const toasts1 = await toasts();
  ok(g.fin && (dist(g, g0) > 0.5 || g.bog || toasts1.some(t => /spin|stuck|dig/i.test(t))), `G uphill grade ${sl.g.toFixed(2)} in reverse: ${dist(g, g0).toFixed(1)} m, bog ${g.bog}, toasts ${JSON.stringify(toasts1)}`);
  await shot("x2vehrevB_slope");
}
// H: reload mid-bog / mid-reverse keeps a sane truck
await ev(`GS.hour = 12; true`);
const sv = await J(`({ n: TLX.state("vehicles").owned.length })`);
await reload(); await sleep(1500);
const after = await J(`({ n: TLX.state("vehicles").owned.length, cur: !!VEH.cur, fin: [P.x,P.y,P.z].every(Number.isFinite), bog: BOG.on })`);
ok(after.n === sv.n && after.fin, `H reload: truck still owned (${after.n}), finite ${after.fin}, cur ${after.cur}, bog ${after.bog}`);
await done(fails ? 1 : 0);
