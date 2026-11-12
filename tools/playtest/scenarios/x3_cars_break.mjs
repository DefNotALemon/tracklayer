// Beta break test for 3.3a parked cars (v204). Prints findings; exit 0 unless the page errors.
//  A. a parked car offers itself as a winch anchor ("boulder"); B. doorstep clearance; C. car height vs snow surface after a storm;
//  D. partial weather (0.7) fill rate and no dig-out under a lingering 0.5; E. walker blocked by a car, buried car still solid,
//  jump over; F. mid-storm reload keeps b and wait timers; G. same cars every boot; H. night still.
import { boot, ev, sleep, done, shot, camOff, reload, down, up } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const say = (tag, m) => console.log(tag + " " + m);
let camHooked = false;
async function carCam(i, dist = 9, h = 3.5, yo = 0.7) {
  if (!camHooked) { await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`); camHooked = true; }
  await ev(`(() => { const C = TLXC.cars[${i}]; window.camOv = c => { const a = C.yaw + Math.PI + ${yo}; c.position.set(C.x + Math.sin(a) * ${dist}, C.y + ${h}, C.z + Math.cos(a) * ${dist}); c.lookAt(C.x, C.y + 0.8, C.z); }; return true; })()`);
  await sleep(300);
}
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(800);
const keys0 = await J(`TLXC.cars.map(c => c.key + ":" + c.x.toFixed(1) + "," + c.z.toFixed(1))`);
const ci = await J(`(() => { let b = 0, bd = 1e9; TLXC.cars.forEach((c, i) => { const d = Math.hypot(c.x - depot.x, c.z - depot.z); if (d < bd) { bd = d; b = i; } }); return b; })()`);

// A. winch anchors
const A = await J(`(() => { let n = 0, tags = {}; for (const c of TLXC.cars) for (const a of anchorsNear(c.x, c.z, 1.6)) if (a.o.car === c.i) { n++; tags[anchorName(a.o) + "/" + anchorTag(a.o)] = 1; } return { n, tags: Object.keys(tags) }; })()`);
say(A.n ? "FINDING" : "ok", "A winch anchors that are parked-car circles: " + A.n + " " + JSON.stringify(A.tags));

// B. doorstep: car circle within 1.6 m of the walking line from the door out to 5 m
const B = await J(`(() => { let blocked = 0, ex = []; for (const c of TLXC.cars) { const D = KIT.doors.map(D => ({ D, d: Math.hypot(D.x - c.x, D.z - c.z) })).sort((a, b) => a.d - b.d)[0].D;
  let hit = false; for (let t = D.d / 2 + 0.6; t <= D.d / 2 + 5; t += 0.4) { const x = D.x + D.nx * t, z = D.z + D.nz * t; for (const o of obstaclesNear(x, z, 3)) if (o.car === c.i && Math.hypot(o.x - x, o.z - z) < o.r + 0.5) hit = true; }
  if (hit) { blocked++; ex.push(Math.round(D.x) + "," + Math.round(D.z)); } } return { blocked, ex, n: TLXC.cars.length }; })()`);
say(B.blocked ? "FINDING" : "ok", "B doors whose straight path out is blocked by their car: " + B.blocked + "/" + B.n + " " + JSON.stringify(B.ex));

// E1. walker into a car (side-on) and into a buried car
await ev(`TLXC.setSnow(null, 0); true`);
async function walkAt(buried) {
  const E = await J(`(() => { const c = TLXC.cars[${ci}], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); const sx = c.x + fz * 8, sz = c.z - fx * 8; FOOT.on = true; FOOT.x = sx; FOOT.z = sz; FOOT.y = surf(sx, sz); FOOT.yaw = Math.atan2(c.x - sx, c.z - sz); P.x = sx + 30; P.z = sz + 30; recenter(sx, sz, true); return { x: c.x, z: c.z }; })()`);
  await waitGame(1); await down("KeyW"); let minD = 99;
  for (let k = 0; k < 40; k++) { await waitGame(0.15); const d = await J(`Math.hypot(FOOT.x - ${E.x}, FOOT.z - ${E.z})`); minD = Math.min(minD, d); }
  await up("KeyW"); return minD;
}
const wClear = await walkAt(false);
say(wClear > 0.9 ? "ok" : "FINDING", "E walker toward a clear car stops at " + wClear.toFixed(2) + " m from its middle");
await ev(`TLXC.setSnow(${ci}, 1); true`); await sleep(300);
const wBur = await walkAt(true);
say(wBur > 0.9 ? "ok" : "FINDING", "E walker toward a buried car stops at " + wBur.toFixed(2) + " m from its middle");
await ev(`FOOT.on = false; true`);

// E2. sled: buried car still solid? jump over?
async function ride(sy, over) {
  const E = await J(`(() => { const c = TLXC.cars[${ci}], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); const sx = c.x + fz * 14, sz = c.z - fx * 14; P.x = sx; P.z = sz; P.y = surf(sx, sz) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = Math.atan2(c.x - sx, c.z - sz); recenter(sx, sz, true); return { x: c.x, z: c.z }; })()`);
  await waitGame(1); await down("KeyW"); let minD = 99;
  for (let k = 0; k < 36; k++) { await waitGame(0.15); if (over) await ev(`P.y = Math.max(P.y, TLXC.cars[${ci}].y + 4); true`); const d = await J(`Math.hypot(P.x - ${E.x}, P.z - ${E.z})`); minD = Math.min(minD, d); }
  await up("KeyW"); return minD;
}
const sBur = await ride(1, false);
say(sBur > 0.95 ? "ok" : "FINDING", "E sled into a BURIED car: closest " + sBur.toFixed(2) + " m");
await ev(`TLXC.setSnow(${ci}, 0); true`);
const sJump = await ride(0, true);
say(sJump < 1.5 ? "ok" : "FINDING", "E sled held 4 m above the roof passes over the car: closest " + sJump.toFixed(2) + " m");

// D. partial weather
await ev(`TLXC.setSnow(null, 0); WX.at = () => 0.7; GS.storm = 1; true`);
for (let k = 0; k < 24; k++) { await ev(`GS.hour += 0.25; true`); await waitGame(0.2); }
const D1 = await J(`({ b: TLXC.cars[${ci}].b, buried: TLXC.buried(), n: TLXC.cars.length })`);
say("info", "D 6 h at weather 0.7: b " + D1.b.toFixed(2) + ", buried " + D1.buried + "/" + D1.n);
await ev(`WX.at = () => 0.5; true`);
for (let k = 0; k < 40; k++) { await ev(`GS.hour += 0.25; true`); await waitGame(0.15); }
const D2 = await J(`({ b: TLXC.cars[${ci}].b, buried: TLXC.buried() })`);
say("info", "D then 10 h at weather 0.5 (no new fill, no dig): b " + D2.b.toFixed(2) + ", buried " + D2.buried + " (a lingering grey day leaves every owner indoors)");

// C. height vs surface after a real storm on the ground
await ev(`TLXC.setSnow(null, 0); WX.at = () => 1; GS.storm = 1; GS.stormPhase = "storm"; true`);
for (let k = 0; k < 24; k++) { await ev(`GS.hour += 0.25; true`); await waitGame(0.25); }
const C = await J(`(() => { let mx = -9, mn = 9, ws = 0; for (const c of TLXC.cars) { const d = surf(c.x, c.z) - c.y; mx = Math.max(mx, d); mn = Math.min(mn, d); } return { mx, mn }; })()`);
say(Math.abs(C.mx) > 0.25 || Math.abs(C.mn) > 0.25 ? "FINDING" : "ok", "C after a 6 h storm surf - car.y ranges " + C.mn.toFixed(2) + " .. " + C.mx.toFixed(2) + " m (car rides at its boot-time ground)");
await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(300);
await carCam(ci, 9, 3.5); await shot("x3cb_buried_close");

// F. mid-dig reload
await ev(`GS.hour += 0.25; true`);
for (let k = 0; k < 6; k++) { await ev(`GS.hour += 0.25; true`); await waitGame(0.2); }
const F0 = await J(`TLXC.cars.map(c => [c.key, +c.b.toFixed(3), +c.wt.toFixed(2)]).filter(a => a[1] > 0.005)`);
await ev(`save(); true`);
await reload(); await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(300);
const F1 = await J(`TLXC.cars.map(c => [c.key, +c.b.toFixed(3), +c.wt.toFixed(2)]).filter(a => a[1] > 0.005)`);
const same = JSON.stringify(F0) === JSON.stringify(F1);
say(same ? "ok" : "FINDING", "F mid-dig reload: " + F0.length + " snowed cars before, " + F1.length + " after; identical=" + same + (same ? "" : " e.g. " + JSON.stringify(F0[0]) + " vs " + JSON.stringify(F1[0])));

// G. determinism
const keys1 = await J(`TLXC.cars.map(c => c.key + ":" + c.x.toFixed(1) + "," + c.z.toFixed(1))`);
say(JSON.stringify(keys0) === JSON.stringify(keys1) ? "ok" : "FINDING", "G same " + keys1.length + " cars in the same places after a reload");

// H. night
await ev(`TLXC.setSnow(null, 0); GS.hour = 24 * 3 + 23; WX.at = () => 0; true`); await sleep(1500);
await carCam(ci, 8, 3, 0.6); await shot("x3cb_night");
await ev(`TLXC.setSnow(${ci}, 0.2); true`); await sleep(500); await shot("x3cb_night_dusting");
await camOff();
await done(0);
