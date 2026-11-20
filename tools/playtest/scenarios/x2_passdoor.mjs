// Beta fix 0364 #1: the passenger door. A truck stopped with a fuel pump (a wall, a rock, the water) beside the driver's
// door used to keep you in the cab ("No room to open the door here."). Now you slide over and get out by the other door,
// and get back in the same way. Asserts, exit 1 on a failure.
//   A  in the open: out and in by the driver's door as before (the passenger door never moves, no slide)
//   B  pump abeam on the driver's side (a pose the truck's own hull allows): Q slides you across the seats (no jump, hips
//      lift a little), the passenger door opens, you stand on clear snow on that side, both doors shut again, no toast
//   C  Q from there: in by the passenger door, slide behind the wheel, seated and driving
//   D  from out on the driver's side: the walk goes round to the passenger door
//   E  something beside both doors: "No room to open either door", still seated; cleared, out again
//   F  a pad's LB and the touch pill do the same; a reload in the cab at the pump too
//   G  the lorry (tall cab) at the pump: out and in by its passenger door, the climb down its steps
//   H  the model: each truck has a second, mirrored door on its own hinge
// Stills (OUT), taken in the open with a test obstacle beside the driver's door (at the pumps the second pump hides the
// passenger side): the closed passenger side of both trucks, strips of the slide and the climb out and back in.
import { boot, ev, tap, sleep, done, padSet, padOff, reload, shot, sideCam } from "../lib.mjs";
let fails = 0; const failed = []; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) { fails++; failed.push(m); } };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
async function waitUntil(expr, maxGame = 14) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return (await clock()) - t0; await sleep(100); } return -1; }
const NOSTILLS = !!process.env.NOSTILLS;
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return 1; })()`);
// a per-frame record of the walker in the truck's own frame, the two doors and the phase
const kit = () => ev(`(() => { if (window.__rec) return 1; window.__rec = { on: false, a: [] };
  (function loop() { requestAnimationFrame(loop); const K = window.__rec; if (!K.on) return; const R = TLXV.runtimeOf(TLX.state("vehicles").cur); if (!R) return;
    const dx = FOOT.x - P.x, dz = FOOT.z - P.z, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
    K.a.push([gameClock, dx * fz - dz * fx, dx * fx + dz * fz, FOOT.y - P.y, R.door, R.door2, R.A ? R.A.ph : 9, R.A ? R.A.dir : "", FOOT.x, FOOT.z, FOOT.on ? 1 : 0, MNT.on || DMT.on ? 1 : 0]); })();
  return 1; })()`);
const recStart = () => ev(`window.__rec.a = []; window.__rec.on = true; true`);
const recStop = async () => { await ev(`window.__rec.on = false; true`); return J(`window.__rec.a`); };
const sum = a => {                                                              // what one get-in / get-out looked like
  const mv = a.filter(r => r[11] && r[10]);                                     // frames of the move itself
  let step = 0; for (let i = 1; i < mv.length; i++) step = Math.max(step, Math.hypot(mv[i][8] - mv[i - 1][8], mv[i][9] - mv[i - 1][9]));
  const sl = mv.filter(r => r[6] === -1 || r[6] === 4), last = a[a.length - 1];
  let mono = 0; for (let i = 1; i < sl.length; i++) mono = Math.max(mono, (sl[i][1] - sl[i - 1][1]) * (sl[0][6] === 4 ? -1 : 1));   // > 0: the slide went backwards
  return { n: mv.length, dur: mv.length ? mv[mv.length - 1][0] - mv[0][0] : 0, door: Math.max(0, ...a.map(r => r[4])), door2: Math.max(0, ...a.map(r => r[5])), step, slideN: sl.length,
    slX: sl.length ? [sl[0][1], sl[sl.length - 1][1]] : null, slHip: sl.length ? Math.max(...sl.map(r => r[3])) - Math.min(sl[0][3], sl[sl.length - 1][3]) : 0, mono,
    hip: [Math.min(...mv.map(r => r[3])), Math.max(...mv.map(r => r[3]))], end: last ? { lx: last[1], lz: last[2], x: last[8], z: last[9] } : null };
};
const walkerAt = (lx, lz) => ev(`(() => { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); FOOT.on = true; FOOT.x = P.x + fz * ${lx} + fx * ${lz}; FOOT.z = P.z - fx * ${lx} + fz * ${lz}; FOOT.yaw = P.yaw; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; return 1; })()`);
const walkerBeside = uid => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(r => r.uid === "${uid}"); const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  FOOT.on = true; FOOT.x = x + fz * 3.4 + fx * 1.6; FOOT.z = z - fx * 3.4 + fz * 1.6; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const seated = "!MNT.on && !FOOT.on && !!VEH.cur", outside = "!DMT.on && FOOT.on";
// the pump: the station's own obstacle. The truck stands `off` m west of it, nose north: the pump is beside the driver's door
const atPump = (off, back = 0) => ev(`(() => { const t = STATIONS.find(t => t.x !== undefined); let b = null, bd = 9; for (const a of obGrid.values()) for (const o of a) { const d = Math.hypot(o.x - t.x, o.z - t.z); if (d < bd) { bd = d; b = o; } }
  window.__pump = b; crashCancel(); P.x = b.x - ${off}; P.z = b.z - ${back}; P.yaw = 0; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); GS.fuel = 60; return 1; })()`);
const pose = () => J(`({ x: P.x, z: P.z, yaw: P.yaw, gnd: P.gnd, px: window.__pump.x, pz: window.__pump.z, pr: window.__pump.r, veh: !!VEH.cur, foot: FOOT.on })`);
const doors = () => J(`(() => { const R = TLXV.runtimeOf(TLX.state("vehicles").cur); return { d: R.door, d2: R.door2, r1: R.doorPivot.rotation.y, r2: R.doorPivot2.rotation.y, drv: R.drvBody.visible, walker: FOOT.g.visible }; })()`);
const vcam = async (yawOff, dist, h, ty = 1.2, fwd = 0) => { await sideCam(); await ev(`window.camOv = c => { const yaw = P.yaw + ${yawOff}, tx = P.x + Math.sin(P.yaw) * ${fwd}, tz = P.z + Math.cos(P.yaw) * ${fwd}; c.position.set(tx + Math.sin(yaw) * ${dist}, P.y + ${ty} + ${h}, tz + Math.cos(yaw) * ${dist}); c.lookAt(tx, P.y + ${ty} + 0.2, tz); }; true`); await sleep(300); };
const strip = async (name, until) => { if (NOSTILLS) return; for (let i = 0; i < 40; i++) { await shot(`${name}_${String(i).padStart(2, "0")}`); if (await ev(until)) break; } };
const out = async (how = () => tap("KeyQ")) => { await clearToasts(); await recStart(); await how(); const t = await waitUntil(outside, 9); await waitGame(0.2); return { t, ...sum(await recStop()), toasts: await toasts() }; };
const inn = async (how = () => tap("KeyQ")) => { await clearToasts(); await recStart(); await how(); const t = await waitUntil(seated, 14); await waitGame(0.2); return { t, ...sum(await recStop()), toasts: await toasts() }; };
const f2 = v => (+v).toFixed(2);
// stills: block the driver's door with a test obstacle, shoot the way out from behind the passenger side and the way in from ahead of it
const fob = on => ev(on ? `(() => { const d = TLXV.runtimeOf(TLX.state("vehicles").cur).def, sx = 1.46 + (d.cab ? d.cab.sx : 0), sz = 0.1 + (d.cab ? d.cab.dz : 0), fz = Math.cos(P.yaw), fx = Math.sin(P.yaw);
  const o = { x: P.x + fz * sx + fx * sz, z: P.z - fx * sx + fz * sz, r: 0.3 }; window.__fob = o; addOb(o); return 1; })()` : `(() => { for (const a of obGrid.values()) { const i = a.indexOf(window.__fob); if (i >= 0) a.splice(i, 1); } return 1; })()`);
const stills = async (tag, dist, ty, fwd) => {
  if (NOSTILLS) return;
  await fob(true);
  await vcam(-1.5708, dist + 1.5, 0.5, ty, fwd); await shot(`${tag}0_pass_side_closed`);
  await vcam(-2.35, dist, 1.2, ty, fwd); await tap("KeyQ"); await strip(`${tag}1_out`, outside); await waitUntil(outside, 9); await waitGame(1.5);
  await vcam(-0.75, dist, 0.9, ty, fwd); await tap("KeyQ"); await strip(`${tag}2_in`, seated); await waitUntil(seated, 14);
  await fob(false); await ev("window.camOv = null; true");
};

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; GS.cash = 40000; GS.lic.freight = true; true`);
if (await ev(`!!(window.TLX && TLX.setOn)`)) await ev(`TLX.setOn("traffic", false); true`);
await ev(`TLXV.buy("pickup"); true`); await sleep(400);
await kit();
const uidP = await ev(`TLX.state("vehicles").owned[0].uid`);

// ---- H (first: it needs nothing else). The model
{ const m = await J(`(() => { const R = TLXV.runtimeOf("${uidP}"), d = R.def; return { n: R.doorPivot2.children.length, sx: R.doorPivot2.scale.x, px: R.doorPivot2.position.x, pz: R.doorPivot2.position.z, dx: d.door.x, dz: d.door.z, same: R.doorPivot2.children[0].geometry === R.doorPivot.children[0].geometry }; })()`);
  ok(m.n === 2 && m.sx === -1 && Math.abs(m.px + m.dx) < 1e-6 && m.pz === m.dz && m.same, `the pickup has a second door, the driver's mirrored, hinged at x ${f2(m.px)} (the driver's at ${f2(m.dx)})`); }

// ---- A. in the open: the driver's door, as before
await walkerBeside(uidP); await sleep(1200);
let r = await inn();
ok(r.t > 0 && r.door > 0.95 && r.door2 === 0 && r.slideN === 0, `A in the open: in by the driver's door in ${f2(r.t)} s (door ${f2(r.door)}, passenger door ${r.door2}, no slide)`);
const stepIn = r.step;
r = await out();
ok(r.t > 0 && r.door > 0.95 && r.door2 === 0 && r.slideN === 0 && r.end.lx > 1.3 && r.end.lx < 1.6, `A out by the driver's door in ${f2(r.t)} s, standing ${f2(r.end.lx)} m out on the left`);
const tDrv = r.t, stepOut = r.step;
console.log(`     biggest move of the walker between two frames: in ${f2(stepIn)} m, out ${f2(stepOut)} m`);
await tap("KeyQ"); ok(await waitUntil(seated) > 0, "A back in");

// ---- B. the pump beside the driver's door
await atPump(2.2); await waitGame(1.2);
let p = await pose();
ok(p.veh && p.gnd && Math.hypot(p.x - (p.px - 2.2), p.z - p.pz) < 0.2, `B the truck stands 2.2 m from the pump's centre, pump abeam on the driver's side (pushed ${f2(Math.hypot(p.x - (p.px - 2.2), p.z - p.pz))} m by its hull: a pose you can park in)`);
{ const b = await J(`(() => { const fz = Math.cos(P.yaw), fx = Math.sin(P.yaw); const s = sd => [P.x + fz * sd * 1.46 + fx * 0.1, P.z - fx * sd * 1.46 + fz * 0.1]; const a = s(1), c = s(-1); return { drv: obNear(a[0], a[1], 0.5), pas: obNear(c[0], c[1], 0.5) }; })()`);
  ok(b.drv && !b.pas, "B no room to stand at the driver's door, room at the passenger's"); }
r = await out();
ok(r.t !== -1, "B the get-off control gets you out of the truck at the pump");
ok(!r.toasts.some(t => /No room/.test(t)), "B no \"No room\" toast: " + (r.toasts.filter(t => /room/i.test(t)).join(" | ") || "none"));
ok(r.door2 > 0.95 && r.door === 0, `B the passenger door opens (${f2(r.door2)}), the driver's stays shut (${r.door})`);
ok(r.end && r.end.lx < -1.3 && r.end.lx > -1.6 && Math.abs(r.end.lz - 0.1) < 0.25, `B you stand beside the passenger door (${r.end ? f2(r.end.lx) + ", " + f2(r.end.lz) : "?"} in the truck's frame)`);
ok(r.slideN > 5 && r.slX[0] > 0.3 && r.slX[1] < -0.3 && r.mono < 0.004, `B the slide runs from the driver's seat (${r.slX ? f2(r.slX[0]) : "?"}) to the passenger's (${r.slX ? f2(r.slX[1]) : "?"}) without going back (${r.slideN} frames)`);
ok(r.slHip > 0.02 && r.slHip < 0.16, `B the hips lift off the cushion on the way over (${f2(r.slHip)} m)`);
ok(r.step < Math.max(stepOut, stepIn) * 1.5 + 0.02, `B no jump: the walker never moves more than ${f2(r.step)} m between two frames (the driver's door: ${f2(Math.max(stepOut, stepIn))} m)`);
{ const e = await J(`({ ob: obNear(FOOT.x, FOOT.z, 0.3), water: isWater(FOOT.x, FOOT.z), dy: FOOT.y - surf(FOOT.x, FOOT.z), hint: $("wnHint").textContent })`);
  ok(!e.ob && !e.water && Math.abs(e.dy) < 0.15, `B on clear snow, feet on the ground (${f2(e.dy)} m)`);
  ok(/get in the pickup/.test(e.hint), "B the on-foot line offers the truck: " + e.hint); }
ok(r.dur > tDrv + 0.6 && r.dur < tDrv + 2.2, `B it takes ${f2(r.dur)} s (the driver's door: ${f2(tDrv)} s; the slide is the difference)`);
await waitGame(1.6);
{ const d = await doors(); ok(d.d === 0 && d.d2 === 0 && d.r1 === 0 && d.r2 === 0, "B both doors are shut again"); }

// ---- C. back in by the passenger door
r = await inn();
ok(r.t !== -1 && r.door2 > 0.95 && r.door === 0, `C in by the passenger door in ${f2(r.dur)} s (passenger door ${f2(r.door2)}, driver's ${r.door})`);
ok(r.slideN > 5 && r.slX[0] < -0.3 && r.slX[1] > 0.3 && r.mono < 0.004, `C then the slide behind the wheel (${r.slX ? f2(r.slX[0]) + " to " + f2(r.slX[1]) : "?"})`);
ok(r.step < Math.max(stepOut, stepIn) * 1.5 + 0.02, `C no jump (${f2(r.step)} m between two frames at most)`);
{ const d = await doors(); ok(d.drv && !d.walker && d.d2 === 0, "C seated: the driver is at the wheel, the door is shut"); }

// ---- D. from the driver's side: the walk goes round
await tap("KeyQ"); ok(await waitUntil(outside, 9) > 0, "D out again");
await walkerAt(3.0, -2.4); await sleep(900);
r = await inn();
ok(r.t !== -1 && r.door2 > 0.95 && r.door === 0, `D from the pump's side the walk goes round the truck to the passenger door (${f2(r.t)} s)`);

// ---- E. something beside both doors
await ev(`(() => { const fz = Math.cos(P.yaw), fx = Math.sin(P.yaw); const o = { x: P.x - fz * 1.46 + fx * 0.1, z: P.z + fx * 1.46 + fz * 0.1, r: 0.3 }; window.__fob = o; addOb(o); return 1; })()`);
await clearToasts(); await tap("KeyQ"); await waitGame(1.0);
{ const t = await toasts(), s = await J(`({ dmt: DMT.on, foot: FOOT.on, veh: !!VEH.cur })`);
  ok(t.some(m => /No room to open either door/.test(m)) && !s.dmt && !s.foot && s.veh, "E both doors blocked: you stay in the cab and are told why: " + (t.find(m => /room/i.test(m)) || "no toast")); }
await ev(`(() => { for (const a of obGrid.values()) { const i = a.indexOf(window.__fob); if (i >= 0) a.splice(i, 1); } return 1; })()`);

// ---- F. pad, touch, a reload in the cab
const lb = async () => { await padSet({ 4: 1 }); await sleep(180); await padSet(); };
r = await out(lb); ok(r.t !== -1 && r.door2 > 0.95 && r.end.lx < -1.3, `F pad: LB gets you out by the passenger door (${f2(r.t)} s)`);
r = await inn(lb); ok(r.t !== -1 && r.door2 > 0.95, "F pad: LB gets you back in by it");
await padOff(); await sleep(300);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(700);
const tapB = id => `(() => { const b = $("${id}"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`;
{ const s = await J(`({ hidden: $("tcQ").hidden, label: $("tcQ").textContent })`); ok(!s.hidden, "F touch: the pill is there in the cab at the pump: " + s.label); }
r = await out(() => ev(tapB("tcQ"))); ok(r.t !== -1 && r.door2 > 0.95 && r.end.lx < -1.3, `F touch: the pill gets you out by the passenger door (${f2(r.t)} s)`);
await sleep(500);
r = await inn(() => ev(tapB("tcQ"))); ok(r.t !== -1 && r.door2 > 0.95, "F touch: and back in");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`).catch(() => 0);
await reload(); await sleep(800); await ev(`GS.hour = 12; GS.storm = 0; WX.at = () => 0; true`); await kit();
if (await ev(`!!(window.TLX && TLX.setOn)`)) await ev(`TLX.setOn("traffic", false); true`);
p = await J(`({ veh: !!VEH.cur, foot: FOOT.on })`);
if (!p.veh || p.foot) { await atPump(2.2); await walkerAt(-3.2, 0.1); await sleep(900); await tap("KeyQ"); await waitUntil(seated); }
await atPump(2.2); await waitGame(1.0);
r = await out(); ok(r.t !== -1 && r.door2 > 0.95 && r.door === 0 && r.end.lx < -1.3, `F after a reload the same: out by the passenger door (${f2(r.t)} s)`);

// ---- G. the lorry
await tap("KeyQ"); await waitUntil(seated);
await ev(`(() => { P.x = garageSite.x + 30; P.z = garageSite.z + 34; let k = 0; while ((obNear(P.x, P.z, 5) || isWater(P.x, P.z)) && k++ < 40) P.x += 6; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`); await waitGame(0.8);
await stills("p", 5.2, 1.1, 0.2);
await tap("KeyQ"); await waitUntil(outside, 9);
await ev(`TLXV.buy("tractor"); true`); await sleep(500);
const uidT = await ev(`(TLX.state("vehicles").owned.find(r => r.id === "tractor") || {}).uid || ""`);
ok(!!uidT, "G the lorry is bought");
await walkerBeside(uidT); await sleep(1300);
ok(await ev(`TLX.state("vehicles").cur === "${uidT}"`), "G beside it, it is the current vehicle");
r = await inn(); ok(r.t !== -1 && r.door > 0.95 && r.door2 === 0, `G in the open the lorry is climbed by the driver's door (${f2(r.t)} s)`);
const climb = r.hip[1] - r.hip[0];
await ev(`(() => { P.x = garageSite.x + 30; P.z = garageSite.z + 60; let k = 0; while ((obNear(P.x, P.z, 6) || isWater(P.x, P.z)) && k++ < 40) P.x += 6; P.y = surf(P.x, P.z); P.vx = P.vz = 0; recenter(P.x, P.z, true); return 1; })()`); await waitGame(0.8);
await stills("t", 7, 1.7, 1.6);
await atPump(2.5, 1.8); await waitGame(1.2);                                    // its door is 1.8 m ahead of its middle
p = await pose();
ok(p.veh && Math.hypot(p.x - (p.px - 2.5), p.z - (p.pz - 1.8)) < 0.25, `G the lorry stands 2.5 m from the pump, the pump beside its driver's door (pushed ${f2(Math.hypot(p.x - (p.px - 2.5), p.z - (p.pz - 1.8)))} m)`);
r = await out();
ok(r.t !== -1 && r.door2 > 0.95 && r.door === 0 && !r.toasts.some(t => /No room/.test(t)), `G out by the lorry's passenger door (${f2(r.dur)} s)`);
ok(r.end && r.end.lx < -1.65 && r.end.lx > -2.0, `G standing ${r.end ? f2(r.end.lx) : "?"} m out on the right`);
ok(Math.abs((r.hip[1] - r.hip[0]) - climb) < 0.12 && climb > 0.7, `G the climb down its steps is the driver's side's (${f2(r.hip[1] - r.hip[0])} m of hip travel, ${f2(climb)} m going in)`);
ok(r.slideN > 5 && r.slX[0] > 0.5 && r.slX[1] < -0.5 && r.mono < 0.004, `G the slide over the engine tunnel (${r.slX ? f2(r.slX[0]) + " to " + f2(r.slX[1]) : "?"})`);
{ const e = await J(`({ ob: obNear(FOOT.x, FOOT.z, 0.3), dy: FOOT.y - surf(FOOT.x, FOOT.z) })`); ok(!e.ob && Math.abs(e.dy) < 0.15, `G on clear snow, feet on the ground (${f2(e.dy)} m)`); }
r = await inn(); ok(r.t !== -1 && r.door2 > 0.95 && r.door === 0 && r.slideN > 5, `G and back in by it (${f2(r.t)} s)`);
{ const m = await J(`(() => { const R = TLXV.runtimeOf("${uidT}"); return { n: R.doorPivot2.children.length, sx: R.doorPivot2.scale.x, px: R.doorPivot2.position.x, dx: R.def.door.x }; })()`);
  ok(m.n === 2 && m.sx === -1 && Math.abs(m.px + m.dx) < 1e-6, "H the lorry has its mirrored passenger door too"); }

console.log(fails ? `\n${fails} FAILED:\n  ` + failed.join("\n  ") : "\nALL OK");
await done(fails ? 1 : 0);
