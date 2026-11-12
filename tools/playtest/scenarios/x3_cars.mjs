// Slice 3.3a (G4): parked cars, some buried after a storm. Asserts, exit 1 on a failure.
//  A. cars stand in front of houses in Kjøllefjord and the villages: 15-90 of them, each within 12 m of a lit door,
//     on plowed ground, clear of the roads, the sea, trees and walls; three obstacle circles each; built with no error,
//     in six draw calls whatever the count.
//  B. a storm (pinned, game hours stepped) buries them: 3 h -> drifts round most cars, 6 h -> 90 %+ buried, drift
//     instances grown; the snow at a car shows on its roof first.
//  C. the storm eases: owners dig out one by one: some cars clear within 6 h but not all; every car clear by 72 h.
//  D. saved: buried cars stay buried over a reload; a save without car state loads with every car clear.
//  E. a sled ridden at a parked car stops short of it (it's solid), and a night's sleep in a storm steps through.
import { boot, ev, sleep, done, shot, camOff, reload, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
const NOSTILLS = !!process.env.NOSTILLS;
let camHooked = false;
async function carCam(i, dist = 11, h = 4.5, yo = 0.7) {
  if (!camHooked) { await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`); camHooked = true; }
  await ev(`(() => { const C = TLXC.cars[${i}]; window.camOv = c => { const a = C.yaw + Math.PI + ${yo}; c.position.set(C.x + Math.sin(a) * ${dist}, C.y + ${h}, C.z + Math.cos(a) * ${dist}); c.lookAt(C.x, C.y + 0.8, C.z); }; return true; })()`);
  await sleep(300);
}

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(800);

// ---- A
const A = await J(`(() => { const C = TLXC, cars = C.cars, R = TLXR;
  const bad = { door: 0, yard: 0, road: 0, sea: 0, ob: 0, obs: 0 };
  for (const c of cars) {
    if (!KIT.doors.some(D => Math.hypot(D.x - c.x, D.z - c.z) < D.d / 2 + 12)) bad.door++;
    if (yardAt(c.x, c.z) < 0.3) bad.yard++;
    if (R.near(c.x, c.z).d < 5) bad.road++;
    if (isSea(c.x, c.z) || isWater(c.x, c.z)) bad.sea++;
    const mine = obstaclesNear(c.x, c.z, 4).filter(o => o.car === c.i);
    if (mine.length !== 3) bad.obs++;
    if (obstaclesNear(c.x, c.z, 5).some(o => o.car !== c.i && o.top > -1e8 && Math.hypot(o.x - c.x, o.z - c.z) < o.r + 0.9)) bad.ob++;
  }
  const towns = new Set(cars.map(c => { let b = null, bd = 1e9; for (const s of [{ id: "kjollefjord", x: depot.x, z: depot.z }, ...SITES]) { const d = Math.hypot(s.x - c.x, s.z - c.z); if (d < bd) { bd = d; b = s.id; } } return b; }));
  return { n: cars.length, doors: KIT.doors.length, bad, towns: [...towns], err: C.err, ms: C.ms, ready: C.ready, meshes: C.group ? C.group.children.length : 0 }; })()`);
console.log("cars:", JSON.stringify(A));
ok(A.ready && !A.err, "A: cars built with no error (" + A.ms + " ms)");
ok(A.n >= 15 && A.n <= 90, "A: " + A.n + " parked cars for " + A.doors + " lit doors");
ok(A.towns.length >= 3, "A: cars in " + A.towns.length + " places (" + A.towns.join(", ") + ")");
ok(A.bad.door === 0 && A.bad.yard === 0 && A.bad.road === 0 && A.bad.sea === 0, "A: every car by a door, on plowed ground, off the roads, out of the sea " + JSON.stringify(A.bad));
ok(A.bad.ob === 0 && A.bad.obs === 0, "A: three obstacle circles each, nothing else under a car");
ok(A.meshes === 6, "A: six instanced meshes for all of them (" + A.meshes + ")");
// a car in town to look at: the one nearest the depot
const ci = await J(`(() => { let b = 0, bd = 1e9; TLXC.cars.forEach((c, i) => { const d = Math.hypot(c.x - depot.x, c.z - depot.z); if (d < bd) { bd = d; b = i; } }); return b; })()`);
await ev(`(() => { const c = TLXC.cars[${ci}]; P.x = c.x + Math.sin(c.yaw) * -14; P.z = c.z + Math.cos(c.yaw) * -14; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`);
await waitGame(1.5);
const dc = await J(`(() => { renderer.render(scene, camera); const on = renderer.info.render.calls; TLXC.group.visible = false; renderer.render(scene, camera); const off = renderer.info.render.calls; TLXC.group.visible = true; return { on, off }; })()`);
console.log("draw calls with/without cars:", dc.on, dc.off);
ok(dc.on - dc.off <= 12, "A: the cars add " + (dc.on - dc.off) + " draw calls (main + shadow passes)");
if (!NOSTILLS) { await carCam(ci); await shot("x3c_a_clear"); await carCam(ci, 30, 14, 0.4); await shot("x3c_a_street"); }

// ---- B: the storm
await ev(`WX.at = () => 1; GS.storm = 1; GS.stormPhase = "storm"; true`);
for (let k = 0; k < 2; k++) { await ev(`GS.hour += 0.25; true`); await waitGame(0.4); }
const B0 = await J(`({ b: TLXC.cars[${ci}].b, cap: (() => { const m = new THREE.Matrix4(); TLXC.group.children.find(o => o.name === "car_cap").getMatrixAt(${ci} * 2, m); return new THREE.Vector3().setFromMatrixScale(m).y; })(), mound: (() => { const m = new THREE.Matrix4(); TLXC.group.children.find(o => o.name === "car_mound").getMatrixAt(${ci}, m); return new THREE.Vector3().setFromMatrixScale(m).y; })() })`);
console.log("half an hour in:", JSON.stringify(B0));
ok(B0.b > 0.03 && B0.cap > 0.05 && B0.mound === 0, "B: half an hour of storm puts snow on the roof (b " + B0.b.toFixed(2) + ", cap " + B0.cap.toFixed(2) + "), no drift yet");
for (let k = 0; k < 10; k++) { await ev(`GS.hour += 0.25; true`); await waitGame(0.3); }
const B1 = await J(`({ b: TLXC.cars[${ci}].b, buried: TLXC.buried(), n: TLXC.cars.length })`);
console.log("3 h:", JSON.stringify(B1));
ok(B1.b > 0.3 && B1.b < 0.6, "B: 3 h of storm: a drift halfway up (b " + B1.b.toFixed(2) + ")");
if (!NOSTILLS) { await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(300); await carCam(ci); await shot("x3c_b_3h"); await ev(`WX.at = () => 1; GS.storm = 1; true`); }
for (let k = 0; k < 12; k++) { await ev(`GS.hour += 0.25; true`); await waitGame(0.3); }
const B2 = await J(`({ b: TLXC.cars[${ci}].b, buried: TLXC.buried(), n: TLXC.cars.length, mound: (() => { const m = new THREE.Matrix4(); TLXC.group.children.find(o => o.name === "car_mound").getMatrixAt(${ci}, m); return new THREE.Vector3().setFromMatrixScale(m).y; })() })`);
console.log("6 h:", JSON.stringify(B2));
ok(B2.buried >= B2.n * 0.9, "B: 6 h of storm: " + B2.buried + "/" + B2.n + " cars buried");
ok(B2.mound > 1.4, "B: the drift over the town car is " + B2.mound.toFixed(2) + " m high");
if (!NOSTILLS) { await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(300); await carCam(ci); await shot("x3c_b_6h"); await carCam(ci, 30, 14, 0.4); await shot("x3c_b_street"); }

// ---- C: the storm eases
await ev(`WX.at = () => 0; GS.storm = 0; GS.stormPhase = "calm"; true`);
for (let k = 0; k < 24; k++) { await ev(`GS.hour += 0.25; true`); await waitGame(0.25); }
const C1 = await J(`({ buried: TLXC.buried(), n: TLXC.cars.length })`);
console.log("6 h after:", JSON.stringify(C1));
ok(C1.buried < B2.buried && C1.buried > 0, "C: 6 h after the storm some cars are dug out, some still buried (" + C1.buried + "/" + C1.n + ")");
if (!NOSTILLS) { await carCam(ci, 30, 14, 0.4); await shot("x3c_c_after"); }

// ---- D: saved
await ev(`save(); true`);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2")).x.sys.cars`);
ok(sv && sv.v === 1 && Object.keys(sv.s.c).length === C1.buried || Object.keys(sv.s.c).length >= C1.buried, "D: the save carries " + Object.keys(sv.s.c).length + " snowed cars");
const keep = await J(`TLXC.cars.filter(c => c.b >= 0.35).map(c => c.key).sort()`);
await reload();
await ev(`WX.at = () => 0; GS.storm = 0; true`); await sleep(300);
const D1 = await J(`({ keys: TLXC.cars.filter(c => c.b >= 0.35).map(c => c.key).sort(), err: TLXC.err || TLXC.tickErr || null })`);
ok(!D1.err && JSON.stringify(D1.keys) === JSON.stringify(keep), "D: after a reload the same " + D1.keys.length + " cars are buried");
const old = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); delete s.x.sys.cars; return s; })()`);
await reload(old);
const D2 = await J(`({ b: TLXC.buried(), n: TLXC.cars.length, err: TLXC.err || TLXC.tickErr || null })`);
ok(!D2.err && D2.b === 0 && D2.n === A.n, "D: a save with no car state loads with all " + D2.n + " cars clear");

// ---- E: solid, and a sleep through a storm
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; true`);
const E = await J(`(() => { const c = TLXC.cars[${ci}], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  // come at its side, square on
  const sx = c.x + fz * 14, sz = c.z - fx * 14; P.x = sx; P.z = sz; P.y = surf(sx, sz) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = Math.atan2(c.x - sx, c.z - sz); recenter(sx, sz, true);
  return { x: c.x, z: c.z }; })()`);
await waitGame(1);
await down("KeyW"); let minD = 99;
for (let k = 0; k < 30; k++) { await waitGame(0.15); const d = await J(`Math.hypot(P.x - ${E.x}, P.z - ${E.z})`); minD = Math.min(minD, d); }
await up("KeyW");
console.log("closest the sled got to the car's middle:", minD.toFixed(2), "m");
ok(minD > 0.95 && minD < 5, "E: the sled rides up to the car and stops against it (closest " + minD.toFixed(2) + " m to its middle, from 14 m)");
await ev(`TLXC.setSnow(null, 0); WX.at = () => 1; true`);
await ev(`GS.hour += 8; true`); await waitGame(1);
const E2 = await J(`({ buried: TLXC.buried(), n: TLXC.cars.length })`);
ok(E2.buried >= E2.n * 0.9, "E: 8 h slept through a storm: " + E2.buried + "/" + E2.n + " buried");
await ev(`WX.at = () => 0; true`); await ev(`GS.hour += 80; true`); await waitGame(1);
const E3 = await J(`TLXC.buried()`);
ok(E3 === 0, "C: 72 h+ after the storm every car is dug out (" + E3 + " left)");
if (!NOSTILLS) await camOff();
console.log(fails ? `${fails} FAILED` : "all asserts passed");
await done(fails ? 1 : 0);
