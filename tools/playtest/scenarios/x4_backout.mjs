// 4.1b1 follow-up (beta 0224 #1/#2, lane A): backing out of a drift with the blade down, a skin of snow under a
// back-drag, and a bladeful when you get out of the cab. Asserts; exit 1 on a FAIL. ONLY=<letters> runs sections.
//   A  blade down IN a 1 m drift: the reverse control backs the truck out (keyboard, pad, touch); forward still holds it
//   B  back-dragging over 6 cm on a cleared field pulls nothing and leaves the snow as it was; 30 cm is still pulled
//   C  out of the cab with a bladeful: it is left on the ground, none of it lost
import { boot, ev, sleep, done, down, up, tap, padSet, padOff } from "../lib.mjs";
let fails = 0; const bad = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) { fails++; bad.push(m); } };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(100); }
const ONLY = process.env.ONLY;
const section = async (n, f) => { if (ONLY && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const kit = () => ev(`(() => {
  if (!window.__F) { const fb0 = freshBase; window.__F = []; freshBase = (ix, iz) => { const F = window.__F, x = ix * CELL - HALF, z = iz * CELL - HALF; for (let i = F.length - 1; i >= 0; i--) { const q = F[i]; if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3]) return q[4]; } return fb0(ix, iz); }; }
  window.__field = (x0, x1, z0, z1, dep) => { window.__F.push([x0 - 0.01, x1 + 0.01, z0 - 0.01, z1 + 0.01, dep]); for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) {
    const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = dep; c.d[k] = dep; if (c.g) c.g[k] = 0; writeCell(ix, iz, d0, dep, dep); } return true; };
  window.__put = (x, z) => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; CRASH.cool = 1; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); recenter(x, z, true); camState.init = false; window.__t0 = [x, z, gameClock]; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; B.volCut = 0; B.volLaid = 0; B.full = false; B.back = false; B.hold = null; return true; };
  window.__vol = (x0, x1, z0, z1) => { let v = 0, n = 0, mx = 0; for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) { const d = depthAt(ix, iz); v += d * CELL * CELL; n++; if (d > mx) mx = d; } return { v, n, mx }; };
  return true; })()`);
const moved = () => J(`(() => { const u = TLXV.state().cur, B = TLXPL.rt(u), R = TLXV.runtimeOf(u); return { mv: +(P.z - __t0[1]).toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), bog: BOG.on, drag: Math.round(B.drag), carry: +B.carry.toFixed(3), cut: +B.volCut.toFixed(3), laid: +B.volLaid.toFixed(3), back: !!B.back, rev: R ? R.rev : null, why: B.why || "", foot: FOOT.on }; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; GS.warmth = 100; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const uid = await ev(`TLXV.state().owned[0].uid`), QU = JSON.stringify(uid);
await ev(`TLXPL.fit(${QU}, "b23"); true`);
const spot = await J(`(() => { for (let r = 150; r < 3600; r += 41) for (let a = 0; a < 6.28; a += 0.19) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; let bad = false;
  for (let k = -10; k <= 70 && !bad; k += 10) for (const sx of [-6, 0, 6]) if (isSea(x + sx, z + k) || isWater(x + sx, z + k) || obNear(x + sx, z + k, 7) || slopeAt(x + sx, z + k, 8) > 0.03 || yardAt(x + sx, z + k) > 0.02 || bioAt(x + sx, z + k) === 1) { bad = true; break; }
  if (!bad && Math.abs(groundAt(x, z) - groundAt(x, z + 60)) < 1.0 && (!window.TLXR || TLXR.near(x, z + 30).d > 70)) return { x, z }; } return null; })()`);
ok(!!spot, "a flat open strip for the fields: " + JSON.stringify(spot));
if (!spot) await done(1);
const X = spot.x, Z = spot.z;
await ev(`TLXV.swapTo(${QU}); FOOT.on = false; true`); await sleep(600); await kit();
ok(await ev(`!!VEH.cur && !FOOT.on`), "seated in the bladed pickup");
// `depth` of snow everywhere, a cleared pad under the truck from 10 m behind it to `padTo` m ahead of its middle
const lane = (depth, padTo) => ev(`__F.length = 0; __field(${X - 7}, ${X + 7}, ${Z - 10}, ${Z + 70}, ${depth}); __field(${X - 7}, ${X + 7}, ${Z - 10}, ${Z + padTo}, 0.06); __put(${X}, ${Z}); true`);
const settle = async () => { await ev(`TLXPL.rt(${QU}).down = true; true`); await waitGame(1.0); await ev(`window.__t0 = [P.x, P.z, gameClock]; true`); };
// hold a control until the truck has gone m metres back, or `secs` of game time
const until = async (m, secs) => { const t0 = await clock(); let r = await moved(), revSeen = 0, dragStill = null; while (r.mv > -m && (await clock()) - t0 < secs) { await sleep(80); r = await moved(); if (r.rev) revSeen++; if (dragStill === null && r.rev && r.v < 0.2) dragStill = r.drag; } r.revSeen = revSeen; r.dragStill = dragStill; return r; };

await section("A backing out of a 1 m drift, blade down", async () => {
  // forward first: the drift still holds the truck and says why (nothing about that changed)
  await lane(1.0, 2); await settle();
  await down("KeyW"); await waitGame(2.5); const f = await moved(); await up("KeyW");
  console.log("  forward", JSON.stringify(f));
  ok(f.mv < 1 && f.drag > 6000 && /more snow than the truck can push/.test(f.why), `forward the drift holds it and says why (moved ${f.mv} m, ${f.drag} N)`);
  // keyboard
  await lane(1.0, 2); await settle(); const s0 = await moved();
  ok(s0.drag > 6000, `standing in it, no control held: the blade is into the drift (${s0.drag} N)`);
  await down("KeyS"); const k = await until(3, 6); await up("KeyS");
  console.log("  keyboard", JSON.stringify(k));
  ok(k.mv <= -3, `keyboard: the reverse key backs it out (${k.mv} m; it stood at 0 before)`);
  ok(k.dragStill !== null && k.dragStill < 3000, `standing with reverse held the blade pulls like a back-drag (${k.dragStill} N, was 11 kN)`);
  ok(!k.bog, "not bogged on the way out");
  await waitGame(2.5);
  // pad: the left trigger
  await lane(1.0, 2); await settle();
  await padSet({ 6: 1 }); const p = await until(3, 6); await padSet({}); await padOff();
  console.log("  pad", JSON.stringify(p));
  ok(p.revSeen > 0, "pad: the left trigger asks for reverse"); ok(p.mv <= -3, `pad: it backs out (${p.mv} m)`);
  await waitGame(2.5);
  // touch: the BRAKE / REVERSE pedal
  await lane(1.0, 2); await settle();
  await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(300);
  const pe = t => ev(`(() => { const e = $("tcBrk"); if (!e) return false; const r = e.getBoundingClientRect(); e.dispatchEvent(new PointerEvent("${t}", { bubbles: true, cancelable: true, pointerId: 7, pointerType: "touch", isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); return true; })()`);
  ok(await pe("pointerdown"), "touch: the brake pedal is on screen"); const t = await until(3, 6); await pe("pointerup"); await pe("pointercancel");
  console.log("  touch", JSON.stringify(t));
  ok(t.revSeen > 0, "touch: the pedal asks for reverse"); ok(t.mv <= -3, `touch: it backs out (${t.mv} m)`);
  await ev(`SET.touch = "auto"; setTouchUI(); true`); await sleep(300);
  await waitGame(2.5);
});

await section("B a skin of snow under a back-drag", async () => {
  await ev(`__F.length = 0; __field(${X - 7}, ${X + 7}, ${Z - 10}, ${Z + 70}, 0.06); __put(${X}, ${Z + 20}); true`); await settle();
  const strip = `__vol(${X - 0.4}, ${X + 0.4}, ${Z + 16}, ${Z + 22.5})`;       // under the blade's middle, between the wheel tracks (the tyres press their own ruts)
  const v0 = await J(strip);
  await down("KeyS"); const r = await until(7, 8); const h = await ev(`TLXPL.hint()`); await up("KeyS"); await waitGame(3);
  const s = await moved(), v1 = await J(strip);
  console.log("  6 cm", JSON.stringify(r), "|", h, "| snow", v0.v.toFixed(3), "->", v1.v.toFixed(3), "deepest", v1.mx.toFixed(3));
  ok(r.mv <= -6, `it reversed over the field (${r.mv} m)`);
  ok(r.carry < 0.02 && r.cut < 0.02, `nothing pulled off 6 cm (carry ${r.carry}, cut ${r.cut}; was 0.3 m3)`);
  ok(/back-dragging/.test(h) && /nothing to pull/.test(h), "the hint says so: " + h);
  ok(Math.abs(v1.v - v0.v) < 0.01 && v1.mx < 0.07, `the field is as it was: no groove, no heap (deepest ${v1.mx.toFixed(3)} m)`);
  ok(s.laid < 0.02, `nothing heaped where it stopped (${s.laid} m3)`);
  // 30 cm is still a back-drag's work
  await lane(0.3, 2); await ev(`__put(${X}, ${Z + 20}); true`); await settle();
  await down("KeyS"); const q = await until(7, 8); const h2 = await ev(`TLXPL.hint()`); await up("KeyS");
  console.log("  30 cm", JSON.stringify(q), "|", h2);
  ok(q.carry > 0.3, `30 cm is pulled as before (${q.carry} m3 on the blade)`); ok(/pulling|all it can pull/.test(h2), "and the hint counts it: " + h2);
  await waitGame(3); const e = await moved();
  ok(e.carry === 0 && e.laid >= 0.9 * e.cut, `stopped: the heap is left, ${e.laid} of ${e.cut} m3`);
});

await section("C out of the cab with a bladeful", async () => {
  await lane(0.3, 2); await settle();
  await down("KeyS"); let r = await until(0.3, 6), n = 0;                        // barely rolling: the door opens only on a truck that is nearly still
  ok(r.carry > 0.05 && r.back, `back-dragging with ${r.carry} m3 on the blade`);
  await tap("KeyQ"); await up("KeyS");
  while (!(r = await moved()).foot && n++ < 80) { await sleep(100); if (n === 40 && r.v < 0.3 && r.carry > 0) await tap("KeyQ"); }
  console.log("  on foot at once", JSON.stringify(r)); const c0 = r.carry;
  await sleep(400); r = await moved(); console.log("  on foot", JSON.stringify(r));
  ok(r.foot, "out of the cab");
  ok(r.carry === 0 && !r.back, `the bladeful is on the ground, not on the blade (carry ${r.carry}, ${c0} as the door opened; it stayed on for good before)`);
  ok(r.laid >= 0.9 * r.cut && r.cut > 0.05, `none of it lost: ${r.laid} laid of ${r.cut} m3 cut`);
  ok([r.carry, r.cut, r.laid, r.drag].every(Number.isFinite), "numbers finite");
  await ev(`FOOT.on = false; TLXV.swapTo(${QU}); true`); await sleep(600);
});

if (bad.length) console.log("FAILED: " + bad.join(" | "));
await done(fails ? 1 : 0);
