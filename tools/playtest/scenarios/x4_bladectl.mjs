// Expansion slice 4.1a1: the blade on the Fjellvogn (tlx-plow.js). The control, the save, frame time, the stills.
//   A the use control drops and lifts it on a keyboard (E), an Xbox pad and a DualSense (L3) and the touch pill (which
//   reads BLADE DOWN / BLADE UP), the horn stays silent in a bladed truck, and the hint names the control for each;
//   B reload with it fitted and down: fitted and up, the model on the truck; a save with no x.sys.plow loads, and the
//   bladeless truck's use control is the horn again; C frame time cutting against driving, printed (low preset too);
//   D stills for the builder to look at (STILLS=0 skips them).
// x4_blade.mjs has the mechanics. Headless runs ~0.6x: all by gameClock.
import { boot, ev, raw, send, tap, sleep, done, down, up, reload, padSet, padOff, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const ONLY = process.env.ONLY;
const section = async (n, f) => { if (ONLY && !ONLY.includes(n[0])) return; console.log("--- " + n); try { await f(); } catch (e) { ok(false, n + " threw: " + String(e.message).slice(0, 300)); } };
const PS = "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)";
const kit = () => ev(`(() => {
  if (!window.__hornW) { const h0 = horn; window.__horn = 0; horn = function () { window.__horn++; return h0.apply(this, arguments); }; window.__hornW = true; }
  window.__put = (x, z, yaw) => { BOG.on = false; BOG.acc = 0; BOG.warned = false; BOG.immune = 0; P.x = x; P.z = z; P.yaw = yaw || 0; P.vx = P.vy = P.vz = 0; P.y = surf(x, z); recenter(x, z, true); camState.init = false; return true; };
  // a cleared pad to start from: the snow under the truck and 1.2 m past its blade cut to the yard level
  window.__pad = (x, z) => { for (let k = -7; k <= 4.5; k += 0.15) bladeSnow(x - 3, z + k, x + 3, z + k, 0.15); return true; };
  return true; })()`);
const B = () => J(`(() => { const u = TLXV.state().cur, b = TLXPL.rt(u); return { down: b.down, k: +b.k.toFixed(2), horn: window.__horn, hint: WN.show ? WN.hint : "", dev: INP.dev, pad: INP.pad, pill: $("tcE").hidden ? null : $("tcE").textContent, y: b.B ? +b.B.position.y.toFixed(2) : null }; })()`);

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; GS.cash = 9000; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);
await ev(`TLXV.buy("pickup"); true`); await sleep(300);
const uid = await ev(`TLXV.state().owned[0].uid`);
await ev(`TLXPL.fit(${JSON.stringify(uid)}, "b23"); true`);
// flat open snow, a boot deep or more, to stand in
const spot = await J(`(() => { for (let r = 150; r < 3600; r += 41) for (let a = 0; a < 6.28; a += 0.19) { const x = depot.x + Math.cos(a) * r, z = depot.z + Math.sin(a) * r; let bad = false;
  for (let k = -10; k <= 60 && !bad; k += 10) for (const sx of [-6, 0, 6]) if (isSea(x + sx, z + k) || isWater(x + sx, z + k) || obNear(x + sx, z + k, 7) || slopeAt(x + sx, z + k, 8) > 0.03 || yardAt(x + sx, z + k) > 0.02 || bioAt(x + sx, z + k) === 1) { bad = true; break; }
  const f = freshAt(Math.round((x + HALF) / CELL), Math.round((z + 4 + HALF) / CELL)); if (!bad && f > 0.25 && f < 0.5) return { x, z, f: +f.toFixed(2) }; } return null; })()`);
ok(!!spot, "flat open snow to stand in: " + JSON.stringify(spot));
if (!spot) await done(1);
await ev(`TLXV.swapTo(${JSON.stringify(uid)}); FOOT.on = false; true`); await sleep(600); await kit();
await ev(`__put(${spot.x}, ${spot.z}); true`); await waitGame(1);

await section("A the control on three schemes", async () => {
  // keyboard
  await tap("KeyE"); await waitGame(0.8); let s = await B(), s0 = s;
  ok(s.down && s.k > 0.9 && s.y < 0.05 && s.horn === 0, `E drops the blade (down ${s.down}, lowered ${s.k}, y ${s.y}) and the horn stays silent (${s.horn})`);
  ok(/^BLADE DOWN/.test(s.hint) && /E: lift it/.test(s.hint), "the hint, blade down, names E to lift it: " + s.hint);
  await tap("KeyE"); await waitGame(0.8); s = await B();
  ok(!s.down && s.k < 0.1 && Math.abs(s.y - 0.3) < 0.03 && s.horn === 0, `E again lifts it (y ${s.y})`);
  ok(/^E: drop the blade · \d+ cm of snow ahead/.test(s.hint), "the hint, blade up in snow, names E to drop it: " + s.hint);
  // pads: L3 is button 10
  for (const [name, id] of [["Xbox", undefined], ["DualSense", PS]]) {
    await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(350); await padSet({}, [0, 0, 0, 0], id); await waitGame(0.8); s = await B();
    ok(s.down && s.horn === 0 && s.dev === "pad", `${name}: L3 drops it, no horn (down ${s.down}, horn ${s.horn}, pad ${s.pad})`);
    ok(/L3: lift it/.test(s.hint), `${name}: the hint names L3: ` + s.hint);
    await padSet({ 10: 1 }, [0, 0, 0, 0], id); await sleep(350); await padSet({}, [0, 0, 0, 0], id); await waitGame(0.8); s = await B();
    ok(!s.down && /^L3: drop the blade/.test(s.hint), `${name}: L3 lifts it and the hint offers L3 to drop it: ` + s.hint);
  }
  await padOff(); await sleep(200);
  // touch: the pill wears the word and the hint says tap it
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 640, y: 200 }] }); await sleep(100);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(200);
  await ev(`SET.touch = "on"; setTouchUI(); true`); await sleep(600); s = await B();
  ok(s.dev === "touch" && s.pill === "BLADE DOWN", "touch: the pill reads BLADE DOWN (" + s.pill + ")");
  ok(/^tap BLADE DOWN/.test(s.hint), "touch: the hint says tap BLADE DOWN: " + s.hint);
  await ev(`$("tcE").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`); await sleep(200);
  await ev(`$("tcE").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 5, pointerType: "touch" })); true`); await waitGame(0.8); s = await B();
  ok(s.down && s.pill === "BLADE UP" && s.horn === 0, "touch: a press drops it and the pill now reads BLADE UP (" + s.pill + ")");
  ok(/tap BLADE UP/.test(s.hint), "touch: the hint says tap BLADE UP: " + s.hint);
  const box = await J(`(() => { const r = $("tcE").getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight }; })()`);
  ok(box.l >= 0 && box.r <= box.w && box.t >= 0 && box.b <= box.h && box.r - box.l >= 44, "touch: the pill is on screen and a thumb wide (" + Math.round(box.r - box.l) + " px)");
  await ev(`SET.touch = "auto"; setTouchUI(); true`); await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await tap("KeyH"); await sleep(150); await tap("KeyH"); await sleep(200);     // a key: back to the keyboard's names
});

await section("B the save", async () => {
  await ev(`TLXPL.rt(${JSON.stringify(uid)}).down = true; save(); true`); await sleep(200);
  await reload(); await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(500); await kit();
  let s = await J(`(() => { const u = TLXV.state().cur, p = TLX.state("plow"), b = u ? TLXPL.rt(u) : null; return { cur: u, seated: !!VEH.cur && !FOOT.on, has: !!p.blades[${JSON.stringify(uid)}], down: b && b.down, model: !!(b && b.grp && b.grp.parent === TLXV.runtimeOf(u).grp), y: b && b.B ? +b.B.position.y.toFixed(2) : null }; })()`);
  console.log("  reloaded", JSON.stringify(s));
  ok(s.cur === uid && s.seated && s.has, "reload with it fitted and down: back in the truck, the blade fitted");
  ok(s.down === false && s.model && Math.abs(s.y - 0.3) < 0.03, "and the blade is UP, its model on the truck");
  // a save from before the plow: no x.sys.plow
  const sv = JSON.parse(await raw(`localStorage.getItem("tracklayer.save.v2")`)); const had = !!(sv.x && sv.x.sys && sv.x.sys.plow); delete sv.x.sys.plow;
  await reload(sv); await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(500); await kit();
  s = await J(`(() => { const p = TLX.state("plow"), u = TLXV.state().cur; return { had: ${had}, st: p, cur: u, seated: !!VEH.cur && !FOOT.on, kids: u ? TLXV.runtimeOf(u).grp.children.filter(c => c.type === "Group" && c.children.length === 3 && c.children[2].type === "Group").length : -1, lbl: VEH.cur && VEH.cur.useLabel ? VEH.cur.useLabel() : "none" }; })()`);
  console.log("  no x.sys.plow", JSON.stringify(s));
  ok(had && s.st && Object.keys(s.st.blades).length === 0 && s.st.shed.length === 0, "a save with no x.sys.plow loads: fresh plow state, no blade");
  ok(s.seated && s.lbl === null, "still in the truck, and its use control has no blade label");
  const h0 = await ev("window.__horn"); await tap("KeyE"); await sleep(400);
  ok((await ev("window.__horn")) === h0 + 1, "a bladeless truck's E is the horn, as before");
  await padSet({ 10: 1 }); await sleep(350); await padSet(); await sleep(300); await padOff();
  ok((await ev("window.__horn")) === h0 + 2, "and so is L3");
  await ev(`TLX.state("plow").blades[${JSON.stringify(uid)}] = { id: "b23", cond: 100 }; true`); await sleep(300);
});

await section("C frame time", async () => {
  const meas = async (label, bladeDown, lx) => {
    await ev(`__pad(${spot.x + lx}, ${spot.z}); __put(${spot.x + lx}, ${spot.z}); TLXPL.rt(${JSON.stringify(uid)}).down = ${bladeDown}; true`); await waitGame(0.6);
    // the plow's own tick is timed by itself: whole-frame times in headless Chrome swing 2-3x with what else the Mac is running
    await ev(`(() => { const d = TLX.systems.find(s => s.id === "plow"); if (!d.__t0) { d.__t0 = d.tick; d.tick = dt => { const a = performance.now(); d.__t0(dt); const R = window.__ft; if (R && R.on) { R.ps += performance.now() - a; R.pn++; } }; } return true; })()`);
    await ev(`(() => { const R = window.__ft = { n: 0, s: 0, mx: 0, on: true, ps: 0, pn: 0 }; let l = performance.now(); const f = () => { if (!R.on) return; const t = performance.now(), d = t - l; l = t; R.n++; R.s += d; if (d > R.mx) R.mx = d; requestAnimationFrame(f); }; requestAnimationFrame(f); return true; })()`);
    await down("KeyW"); await waitGame(4); await up("KeyW");
    const r = await J(`(() => { const R = window.__ft; R.on = false; return { ms: +(R.s / R.n).toFixed(2), mx: +R.mx.toFixed(1), n: R.n, plow: +(R.ps / Math.max(1, R.pn)).toFixed(3), calls: renderer.info.render.calls, mv: +(P.z - ${spot.z}).toFixed(1) }; })()`);
    console.log(`  ${label}: ${JSON.stringify(r)}`); return r;
  };
  const d1 = await meas("blade down, cutting", true, 4), u1 = await meas("blade up, driving the lane it cut", false, 4);
  ok(d1.mv > 8 && u1.mv > 8, `both runs moved (${d1.mv} m cutting, ${u1.mv} m driving)`);
  ok(d1.plow < 1.5, `the plow's own work while cutting: ${d1.plow} ms a frame (${u1.plow} ms with the blade up); whole frames ${d1.ms} ms against ${u1.ms} ms, printed only`);
  await ev(`QG.on = false; QG.apply(3); true`); await sleep(600);
  const d2 = await meas("low preset, blade down, cutting", true, -3.5), u2 = await meas("low preset, blade up, driving the lane it cut", false, -3.5);
  ok(d2.plow < 1.5, `on the low preset too: ${d2.plow} ms a frame (whole frames ${d2.ms} ms against ${u2.ms} ms)`);
  await ev(`QG.apply(0); true`); await sleep(400);
});

await section("D stills", async () => {
  if (process.env.STILLS === "0") return;
  const vcam = async (yawOff, dist, h, ty = 0.9, fwd = 1.2) => { await sideCam(); await ev(`window.camOv = c => { const yaw = P.yaw + ${yawOff}, tx = P.x + Math.sin(P.yaw) * ${fwd}, tz = P.z + Math.cos(P.yaw) * ${fwd}; c.position.set(tx + Math.sin(yaw) * ${dist}, P.y + ${ty} + ${h}, tz + Math.cos(yaw) * ${dist}); c.lookAt(tx, P.y + ${ty}, tz); }; true`); await sleep(400); };
  // on a town street's hard pack, so the whole blade shows: the forecourt spot it was bought on
  await ev(`(() => { const g = garageSite; let best = null; for (const Y of YARDS) { if (Y.r < 3 || Y.r > 5 || Math.hypot(Y.x - depot.x, Y.z - depot.z) > TOWN_R) continue; const L = Math.hypot(Y.x2 - Y.x, Y.z2 - Y.z); if (!best || L > best.L) best = { Y, L }; }
    const Y = best.Y; __put((Y.x + Y.x2) / 2, (Y.z + Y.z2) / 2, Math.atan2(Y.x2 - Y.x, Y.z2 - Y.z)); TLXPL.rt(${JSON.stringify(uid)}).down = false; return true; })()`); await waitGame(1.2);
  await vcam(1.5708, 7.5, 0.5); await shot("b1_side_up");
  await vcam(0.6, 6.5, 1.0); await shot("b2_front34_up");
  await ev(`TLXPL.rt(${JSON.stringify(uid)}).down = true; true`); await waitGame(1);
  await vcam(1.5708, 7.5, 0.5); await shot("b3_side_down");
  await vcam(0.6, 6.5, 1.0); await shot("b4_front34_down");
  await vcam(-0.5, 5, 0.6, 0.7, 2.6); await shot("b5_close_right_down");
  await ev(`GS.hour = 23; true`); await waitGame(1.5);
  await vcam(0.6, 6.5, 1.0); await shot("b6_front34_night");
  await ev(`GS.hour = 12; true`); await waitGame(1.0);
  // the cut and its windrow: 30 m of it, then from behind and above, and from the cab
  await ev(`__pad(${spot.x + 4}, ${spot.z + 26}); __put(${spot.x + 4}, ${spot.z + 26}); TLXPL.rt(${JSON.stringify(uid)}).down = true; true`); await waitGame(0.8);
  await down("KeyW"); await waitGame(5.5); await vcam(Math.PI - 0.35, 13, 6.5, 0.5, -6); await shot("c1_cutting_behind_high"); await vcam(0.5, 8, 1.6, 0.8, 1); await shot("c2_cutting_front34");
  await camOff(); await ev(`camMode = 2; camState.init = false; true`); await waitGame(0.8); await shot("c3_cab");
  await up("KeyW"); await ev(`camMode = 0; camState.init = false; true`); await waitGame(1.2);
  await vcam(Math.PI + 0.9, 9, 3.2, 0.5, -8); await shot("c4_windrow_side");
  await camOff();
});

console.log(fails ? `${fails} FAILED` : "ALL PASSED");
await done(fails ? 1 : 0);
