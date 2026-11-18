// Expansion slice 4.1b1: the blade's throw and the back-drag (tlx-plow.js). Asserts, exit 1 on a failure.
//   A the HOLD on three schemes: with the blade down, holding the use control (E, L3 on an Xbox pad and a DualSense,
//   the touch pill) half a second slews it right -> left -> square -> right and does NOT lift it; a tap still lifts
//   it; the hint names the hold and the next throw; the mouldboard swings on its pivot;
//   B throw LEFT: the lane is cut, the windrow stands on the left, the right is untouched, volume kept;
//   C SQUARE: nothing thrown while the blade fills, then it spills off both ends; stopping stacks a heap ahead;
//   D BACK-DRAG: reversing with it down takes the top of the snow behind the blade (to about half the pack), pulls it
//   along, and leaves it as a heap under the blade when the truck stops; a full blade pulls no more;
//   E the save: the throw is kept through a reload, a blade saved before 4.1b1 (no throw) throws right;
//   F stills for the builder (STILLS=0 skips them).
// Fields are built by the test (one depth of unpacked snow on flat open ground). Headless runs ~0.6x: by gameClock,
// except the hold itself, which is wall time (BL.holdT).   ONLY=BCD... runs some sections.
import { boot, ev, raw, send, tap, sleep, done, down, up, reload, padSet, padOff, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const ONLY = process.env.ONLY;
const section = async (n, f) => { if (ONLY && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const PS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80); return true; })()`);
const kit = () => ev(`(() => {
  if (!window.__F) { const fb0 = freshBase; window.__F = []; freshBase = (ix, iz) => { const F = window.__F, x = ix * CELL - HALF, z = iz * CELL - HALF; for (let i = F.length - 1; i >= 0; i--) { const q = F[i]; if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3]) return q[4]; } return fb0(ix, iz); }; }
  if (!window.__hornW) { const h0 = horn; window.__horn = 0; horn = function () { window.__horn++; return h0.apply(this, arguments); }; window.__hornW = true; }
  window.__field = (x0, x1, z0, z1, dep) => { window.__F.push([x0 - 0.01, x1 + 0.01, z0 - 0.01, z1 + 0.01, dep]); for (let iz = Math.ceil((z0 + HALF) / CELL); iz <= Math.floor((z1 + HALF) / CELL); iz++) for (let ix = Math.ceil((x0 + HALF) / CELL); ix <= Math.floor((x1 + HALF) / CELL); ix++) {
    const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = dep; c.d[k] = dep; if (c.g) c.g[k] = 0; writeCell(ix, iz, d0, dep, dep); } return true; };
  window.__put = (x, z) => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); recenter(x, z, true); camState.init = false; window.__t0 = [x, z, gameClock]; const B = TLXPL.rt(TLXV.state().cur); B.last = null; B.carry = 0; B.volCut = 0; B.volLaid = 0; B.full = false; B.back = false; B.hold = null; return true; };
  window.__cell = (x, z) => { const ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL), d = depthAt(ix, iz), f = freshAt(ix, iz); return { d, f }; };
  window.__thr = th => { const u = TLXV.state().cur, B = TLXPL.rt(u), d = TLXPL.bladeOf(u); TLX.state("plow").blades[u].throw = th; B.a = d.ang * TLXPL.THROWS[th].sign; return true; };
  return true; })()`);
const U = () => J(`(() => { const u = TLXV.state().cur, b = TLXPL.rt(u); return { down: b.down, th: TLXPL.throwOf(u), a: +b.a.toFixed(2), ry: b.S ? +b.S.rotation.y.toFixed(2) : null, horn: window.__horn, hint: TLXPL.hint(), dev: INP.dev, pill: $("tcE").hidden ? null : $("tcE").textContent, held: !!b.hold }; })()`);
const moved = () => J(`(() => { const B = TLXPL.rt(TLXV.state().cur); return { mv: +(P.z - __t0[1]).toFixed(1), dx: +(P.x - __t0[0]).toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), bog: BOG.on, drag: Math.round(B.drag), carry: +B.carry.toFixed(2), cut: +B.volCut.toFixed(2), laid: +B.volLaid.toFixed(2), back: !!B.back, full: !!B.full, z: P.z }; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
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
ok(await ev(`!!VEH.cur && !FOOT.on && typeof TLXPL.slew === "function"`), "seated in the bladed pickup");
// the lane: `depth` of snow, a cleared pad under the truck reaching `padTo` m ahead of its middle
const lane = (depth, padTo = 5) => ev(`__F.length = 0; __field(${X - 7}, ${X + 7}, ${Z - 10}, ${Z + 70}, ${depth}); __field(${X - 7}, ${X + 7}, ${Z - 10}, ${Z + padTo}, 0.06); __put(${X}, ${Z}); true`);
const fresh = await J(`({ th: TLXPL.throwOf(${QU}), rec: TLX.state("plow").blades[${QU}] })`);
ok(fresh.th === "r" && fresh.rec.throw === "r", "a newly fitted blade throws right (" + JSON.stringify(fresh.rec) + ")");

await section("A the hold on three schemes", async () => {
  await lane(0.3); await waitGame(0.6);
  // keyboard
  await tap("KeyE"); await waitGame(0.7); let s = await U();
  ok(s.down && s.th === "r" && Math.abs(s.ry + 0.49) < 0.02, `E drops it; it is slewed to throw right (pivot ${s.ry} rad)`);
  ok(/E: lift it · hold it: throw left/.test(s.hint), "the hint names E to lift and the hold for the next throw: " + s.hint);
  await clearToasts(); await down("KeyE"); await sleep(950); s = await U(); const t = await toasts();
  ok(s.down && s.th === "l", `E HELD 0.95 s: the blade stays down and now throws left (${s.th})`);
  ok(t.some(m => /slewed to throw left/.test(m)), "and a line says so: " + JSON.stringify(t));
  await sleep(700); s = await U(); ok(s.th === "l", "still held: it slews once, not again (" + s.th + ")");
  await up("KeyE"); await waitGame(1.0); s = await U();
  ok(s.down && s.th === "l" && !s.held && Math.abs(s.ry - 0.49) < 0.02, `let go: still down, the mouldboard has swung to the other side (pivot ${s.ry} rad)`);
  ok(/throwing left/.test(s.hint) && /hold it: square it/.test(s.hint), "the hint says throwing left and offers square next: " + s.hint);
  await tap("KeyE"); await waitGame(0.8); s = await U();
  ok(!s.down && s.th === "l" && s.horn === 0, "a TAP still lifts it, the throw kept, the horn silent");
  // pads: L3 is button 10
  const want = { Xbox: "s", DualSense: "r" };
  for (const [name, id] of [["Xbox", undefined], ["DualSense", PS]]) {
    await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(200); await padSet({}, [0, 0, 0, 0], id); await waitGame(0.7); s = await U();
    ok(s.down && s.dev === "pad", `${name}: a short L3 drops it`);
    ok(/L3: lift it · hold it: /.test(s.hint), `${name}: the hint names L3 and the hold: ` + s.hint);
    await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(950); s = await U();
    ok(s.down && s.th === want[name], `${name}: L3 HELD slews it to ${want[name] === "s" ? "square" : "throw right"} (${s.th}) and leaves it down`);
    await padSet({}, [0, 0, 0, 0], id); await waitGame(0.9); s = await U();
    ok(s.down && Math.abs(s.a - (want[name] === "s" ? 0 : 0.49)) < 0.02, `${name}: let go, still down, swung to ${s.a} rad`);
    if (name === "Xbox") ok(/square: it carries/.test(s.hint) && /hold it: throw right/.test(s.hint), "square: the hint says it carries and offers throw right next: " + s.hint);
    await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(200); await padSet({}, [0, 0, 0, 0], id); await waitGame(0.7); s = await U();
    ok(!s.down && s.th === want[name], `${name}: a short L3 lifts it`);
  }
  await padOff(); await sleep(200);
  // touch: the pill
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(200);
  await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(600);
  const press = () => ev(`$("tcE").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`);
  const release = () => ev(`$("tcE").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`);
  await press(); await sleep(200); await release(); await waitGame(0.7); s = await U();
  ok(s.down && s.dev === "touch" && s.pill === "BLADE UP", "touch: a tap on the pill drops it (pill " + s.pill + ")");
  ok(/tap BLADE UP · hold it: throw left/.test(s.hint), "touch: the hint says tap BLADE UP, hold it to throw left: " + s.hint);
  await press(); await sleep(950); s = await U();
  ok(s.down && s.th === "l" && s.pill === "BLADE UP", `touch: the pill HELD slews it to throw left (${s.th}), the blade stays down`);
  await release(); await waitGame(0.5); s = await U(); ok(s.down, "touch: let go, still down");
  await press(); await sleep(200); await release(); await waitGame(0.7); s = await U();
  ok(!s.down && s.pill === "BLADE DOWN", "touch: a tap lifts it (pill " + s.pill + ")");
  await ev(`SET.touch = "auto"; setTouchUI(); true`); await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await tap("KeyH"); await sleep(150); await tap("KeyH"); await sleep(200);
  // a press that comes with nothing held (a script, a missed key-up) is a tap
  await ev(`TLXPL.rt(${QU}).down = true; VEH.cur.use(); true`); await waitGame(0.5); s = await U();
  ok(!s.down, "a use() with nothing held lifts it");
  ok(s.horn === 0, "the horn never sounded through all of it (" + s.horn + ")");
});

const cross = (z, lo, hi, sign) => J(`(() => { const o = []; for (let x = ${lo}; x <= ${hi} + 0.001; x += 0.25) o.push(__cell(${X} + ${sign} * x, ${z})); return o; })()`);
const over = a => a.map(c => +(c.d - c.f).toFixed(2));

await section("B throw left", async () => {
  await lane(0.3); await ev(`__thr("l"); TLXPL.rt(${QU}).down = true; true`); await waitGame(0.8); await ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
  await down("KeyW"); await waitGame(8); const r = await moved(); await up("KeyW"); await waitGame(0.3);
  console.log("  throw left", JSON.stringify(r));
  ok(r.mv >= 25 && !r.bog && Math.abs(r.dx) < 1.5, `30 cm, throw left, W for 8 s: ${r.mv} m at ${r.v} m/s, on its line`);
  const zc = Z + 16, ln = await cross(zc, -0.95, 0.95, 1), L = over(await cross(zc, 1.2, 2.2, 1)), Rt = over(await cross(zc, 1.5, 2.5, -1));
  console.log("  lane d/f", ln.map(c => (c.d / c.f).toFixed(2)).join(" "), "| left d-f", L.join(" "), "| right d-f", Rt.join(" "));
  ok(ln.every(c => c.d / c.f <= 0.2), "the lane is cut to the yard level across 1.9 m");
  ok(Math.max(...L) >= 0.3 && L.reduce((a, b) => a + b, 0) / L.length >= 0.1, "the windrow stands on the LEFT, 1.2 to 2.2 m off the line: " + Math.max(...L) + " m over the pack at its crest");
  ok(Rt.every(v => Math.abs(v) <= 0.02), "the snow on the right is as it was");
  ok(r.cut > 5 && Math.abs(r.laid + r.carry - r.cut) / r.cut < 0.25, `the snow cut is the snow laid: ${r.cut} m3 cut, ${r.laid} laid, ${r.carry} on the blade`);
});

await section("C square: it carries, then stacks", async () => {
  await lane(0.3); await ev(`__thr("s"); TLXPL.rt(${QU}).down = true; true`); await waitGame(0.8); await ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
  // 1: a short push, under a bladeful: nothing is thrown either side
  await down("KeyW"); let r = await moved(); while (r.cut < 1.2 && r.mv < 12) { await sleep(60); r = await moved(); } await up("KeyW");
  console.log("  short push", JSON.stringify(r));
  ok(r.carry > 0.9 && r.laid < 0.05, `a short push: ${r.carry} m3 rides on the blade, ${r.laid} m3 laid anywhere`);
  await waitGame(3.2); let s = await moved();
  ok(s.v < 0.2 && s.carry === 0 && s.laid > 0.9, `stopped: the blade is empty and ${s.laid} m3 stands in front of it`);
  const zs = s.z + 3.25 + 1.0, heap = over(await cross(zs, -0.5, 0.5, 1)), sideL = over(await cross(s.z + 1.5, 1.5, 2.5, 1)), sideR = over(await cross(s.z + 1.5, 1.5, 2.5, -1));
  console.log("  heap d-f", heap.join(" "), "| left", sideL.join(" "), "| right", sideR.join(" "));
  ok(Math.max(...heap) >= 0.25, "a heap a metre ahead of the blade: " + Math.max(...heap) + " m over the pack");
  ok(sideL.concat(sideR).every(v => Math.abs(v) <= 0.02), "and no windrow on either side of the cut");
  // 2: a long push: it fills, then spills off both ends; the hint says so
  await lane(0.3); await ev(`__thr("s"); TLXPL.rt(${QU}).down = true; true`); await waitGame(0.8); await ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
  await down("KeyW"); await waitGame(7); r = await moved(); const h = await ev(`TLXPL.hint()`); await up("KeyW");
  console.log("  long push", JSON.stringify(r), "|", h);
  ok(r.mv >= 14 && !r.bog, `a long push: ${r.mv} m at ${r.v} m/s, not bogged`);
  ok(r.carry >= 2.2 && r.carry <= 2.41 && r.full, `the blade is full at ${r.carry} m3 (2.4)`);
  ok(/square and full: it spills off both ends/.test(h), "the hint says it is full and spilling: " + h);
  const zb = Z + 5 + (r.mv - 5) * 0.75, bl = over(await cross(zb, 1.4, 2.2, 1)), br = over(await cross(zb, 1.4, 2.2, -1));
  console.log("  spilled off the ends: left", bl.join(" "), "| right", br.join(" "));
  ok(Math.max(...bl) >= 0.08 && Math.max(...br) >= 0.08, `what it can't hold spills off BOTH ends (${Math.max(...bl)} m left, ${Math.max(...br)} m right)`);
  await waitGame(3.5); s = await moved();
  const st = over(await cross(s.z + 3.25 + 1.0, -0.5, 0.5, 1));
  console.log("  stack d-f", st.join(" "), JSON.stringify(s));
  ok(s.carry === 0 && Math.max(...st) >= 0.6, `stopped: the bladeful is stacked ahead, ${Math.max(...st)} m over the pack`);
  ok(Math.abs(s.laid - s.cut) / s.cut < 0.25, `the snow cut is the snow laid: ${s.cut} m3 cut, ${s.laid} laid`);
  // 3: lifting it stacks too
  await lane(0.3); await ev(`__thr("s"); TLXPL.rt(${QU}).down = true; true`); await waitGame(0.8);
  await down("KeyW"); r = await moved(); while (r.cut < 1.0 && r.mv < 12) { await sleep(60); r = await moved(); }
  await tap("KeyE"); await waitGame(0.4); s = await moved(); await up("KeyW");
  ok(s.carry === 0 && s.laid > 0.8 && !(await U()).down, `lifted on the move: ${s.laid} m3 left as a heap, the blade up and empty`);
});

await section("D back-drag", async () => {
  // a cleared pad to 2 m ahead of the truck's middle; the blade (3.25 m ahead) is dropped onto 30 cm of snow, 1.25 m of it behind the blade
  await lane(0.3, 2); await ev(`__thr("r"); TLXPL.rt(${QU}).down = true; true`); await waitGame(0.9);
  const z0 = Z, before = await cross(z0 + 2.6, -0.75, 0.75, 1);
  await ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
  await down("KeyS"); let r = await moved(), n = 0, seen = null, hint = "";
  while (r.mv > -5 && n++ < 200) { await sleep(60); r = await moved(); if (r.back && r.carry > 0.05 && !seen) { seen = r; hint = await ev(`TLXPL.hint()`); } }
  await up("KeyS");
  console.log("  reversing", JSON.stringify(seen), "|", hint); console.log("  after 5 m", JSON.stringify(r));
  ok(r.mv <= -5, `S with the blade down: the truck backs ${(-r.mv).toFixed(1)} m`);
  ok(!!seen && seen.back && seen.drag > 300, `it is back-dragging: ${seen ? seen.carry : 0} m3 behind the blade, ${seen ? seen.drag : 0} N on the truck`);
  ok(/BLADE DOWN · back-dragging · \d+ km\/h · pulling \d\.\d m3/.test(hint), "the hint says back-dragging and what it pulls: " + hint);
  const after = await cross(z0 + 2.6, -0.75, 0.75, 1), share = after.map(c => +(c.d / c.f).toFixed(2));
  console.log("  behind where the blade stood: d/f before", before.map(c => (c.d / c.f).toFixed(2)).join(" "), "| after", share.join(" "));
  ok(before.every(c => c.d / c.f > 0.95) && share.every(v => v >= 0.42 && v <= 0.52), "the snow behind where the blade dropped is taken down to about half the pack (0.49), not to the yard level");
  const ahead = (await cross(z0 + 4.2, -0.5, 0.5, 1)).map(c => +(c.d / c.f).toFixed(2));
  ok(ahead.every(v => v > 0.95), "the snow ahead of where it dropped is untouched (" + ahead.join(" ") + ")");
  await waitGame(3.2); const s = await moved();
  const heap = over(await cross(s.z + 3.25 + 0.45, -0.5, 0.5, 1)).map((v, i) => v), hb = await cross(s.z + 3.25 + 0.45, -0.5, 0.5, 1);
  console.log("  stopped", JSON.stringify(s), "| under the blade d (m)", hb.map(c => c.d.toFixed(2)).join(" "));
  ok(s.carry === 0 && !s.back && s.laid > 0.15, `stopped: what it pulled (${s.laid} m3) is left as a heap`);
  ok(Math.max(...hb.map(c => c.d)) >= 0.12 && Math.abs(s.laid - s.cut) / s.cut < 0.25, `under the blade, ${Math.max(...hb.map(c => c.d)).toFixed(2)} m deep where the pad was bare; ${s.cut} m3 taken, ${s.laid} left`);
  // a full blade pulls no more: the snow it backs over stays
  await lane(0.3, 2); await ev(`__thr("r"); const B = TLXPL.rt(${QU}); B.down = true; true`); await waitGame(0.6);
  await ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
  await down("KeyS"); r = await moved(); n = 0; let fullHint = "";
  while (r.mv > -1.2 && n++ < 200) { await sleep(40); r = await moved(); if (r.back && !fullHint) { await ev(`TLXPL.rt(${QU}).carry = TLXPL.BL.carryMax; true`); await sleep(120); fullHint = await ev(`TLXPL.hint()`); } }
  await up("KeyS");
  ok(/it has all it can pull/.test(fullHint), "with a bladeful behind it the hint says it has all it can pull: " + fullHint);
  // forward again: what it pulled is left behind under the blade, and the blade pushes on empty
  await lane(0.3, 2); await ev(`__thr("r"); TLXPL.rt(${QU}).down = true; true`); await waitGame(0.6); await ev(`window.__t0 = [P.x, P.z, gameClock]; true`);
  await down("KeyS"); r = await moved(); n = 0; while (r.mv > -3 && n++ < 200) { await sleep(60); r = await moved(); } await up("KeyS");
  const pulled = r.carry; await down("KeyW"); n = 0; while (n++ < 200) { await sleep(60); r = await moved(); if (r.v > 0.5 && !r.back && r.mv > -2.5) break; } await up("KeyW");
  console.log("  forward again", JSON.stringify(r), "pulled", pulled);
  ok(pulled > 0.05 && !r.back, `back ${pulled} m3, then forward: no longer back-dragging, the pulled snow dropped (${r.laid} m3 laid)`);
});

await section("E the save", async () => {
  await ev(`__thr("s"); TLXPL.rt(${QU}).down = true; save(); true`); await sleep(200);
  await reload(); await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(500); await kit();
  let s = await J(`(() => { const u = TLXV.state().cur, b = TLXPL.rt(u); return { th: TLXPL.throwOf(u), rec: TLX.state("plow").blades[u], down: b.down, a: b.a, ry: b.S ? b.S.rotation.y : null }; })()`);
  console.log("  reloaded", JSON.stringify(s));
  ok(s.th === "s" && s.down === false && Math.abs(s.a) < 0.01 && Math.abs(s.ry) < 0.01, "reload with it square and down: square still, up, the mouldboard square on its pivot");
  const sv = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`)); delete sv.x.sys.plow.s.blades[uid].throw;
  await reload(sv); await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(500); await kit();
  s = await J(`(() => { const u = TLXV.state().cur, b = TLXPL.rt(u); return { th: TLXPL.throwOf(u), a: +b.a.toFixed(2), has: !!TLX.state("plow").blades[${QU}] }; })()`);
  ok(s.has && s.th === "r" && Math.abs(s.a - 0.49) < 0.01, "a blade saved before 4.1b1 (no throw) loads and throws right (" + JSON.stringify(s) + ")");
});

await section("F stills", async () => {
  if (process.env.STILLS === "0") return;
  const vcam = async (yawOff, dist, h, ty = 0.9, fwd = 1.2) => { await sideCam(); await ev(`window.camOv = c => { const yaw = P.yaw + ${yawOff}, tx = P.x + Math.sin(P.yaw) * ${fwd}, tz = P.z + Math.cos(P.yaw) * ${fwd}; c.position.set(tx + Math.sin(yaw) * ${dist}, P.y + ${ty} + ${h}, tz + Math.cos(yaw) * ${dist}); c.lookAt(tx, P.y + ${ty}, tz); }; true`); await sleep(400); };
  await ev(`GS.hour = 12; true`);
  for (const th of ["r", "l", "s"]) {
    await lane(0.3); await ev(`__thr("${th}"); TLXPL.rt(${QU}).down = true; true`); await waitGame(1.0);
    await vcam(0.25, 6.5, 3.2, 0.5, 2.6); await shot(`f1_${th}_front_high`);
    await down("KeyW"); await waitGame(5.5); await up("KeyW"); await waitGame(3);
    await vcam(Math.PI - 0.3, 13, 7, 0.5, -3); await shot(`f2_${th}_cut_behind_high`);
  }
  // the back-drag: before, and the heap after
  await lane(0.3, 2); await ev(`__thr("r"); TLXPL.rt(${QU}).down = true; true`); await waitGame(0.9);
  await vcam(1.2, 8, 3.5, 0.5, 2.5); await shot("f3_backdrag_before");
  await down("KeyS"); let r = await moved(), n = 0; while (r.mv > -5 && n++ < 200) { await sleep(60); r = await moved(); } await up("KeyS"); await waitGame(3);
  await vcam(1.2, 9, 4, 0.5, 4); await shot("f4_backdrag_after");
  await camOff();
});

console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await done(fails ? 1 : 0);
