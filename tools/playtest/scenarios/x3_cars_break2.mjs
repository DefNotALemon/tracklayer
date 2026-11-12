// Beta break test 2 for 3.3a parked cars (v204): A. the pickup driven into a parked car (stops? passes through? how far);
// B. sled at speed into a car (impact: crash/damage?), C. old save without x.sys.cars loads with 0 buried, D. night + dusting stills (camera hook re-applied after reload),
// E. a real sled jump (P.vy kick) over a car, F. car vs the plowed yard / road check (cars on a road leg?).
import { boot, ev, sleep, done, shot, reload, down, up, tap } from "../lib.mjs";
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }
async function waitUntil(expr, m = 12) { const t0 = await clock(); while ((await clock()) - t0 < m) { if (await ev(expr)) return true; await sleep(150); } return false; }
const say = (tag, m) => console.log(tag + " " + m);
async function hook() { await ev(`(() => { if (!window.__camHooked) { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; window.__camHooked = true; } return true; })()`); }
async function carCam(i, dist = 9, h = 3.5, yo = 0.7) { await hook(); await ev(`(() => { const C = TLXC.cars[${i}]; window.camOv = c => { const a = C.yaw + Math.PI + ${yo}; c.position.set(C.x + Math.sin(a) * ${dist}, C.y + ${h}, C.z + Math.cos(a) * ${dist}); c.lookAt(C.x, C.y + 0.8, C.z); }; return true; })()`); await sleep(400); }
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; GS.cash = 9000; true`); await sleep(800);
const ci = await J(`(() => { let b = 0, bd = 1e9; TLXC.cars.forEach((c, i) => { const d = Math.hypot(c.x - depot.x, c.z - depot.z); if (d < bd) { bd = d; b = i; } }); return b; })()`);
const carXZ = () => J(`({ x: TLXC.cars[${ci}].x, z: TLXC.cars[${ci}].z, yaw: TLXC.cars[${ci}].yaw })`);

// B. sled at speed into the car, side-on approach
async function sledRun(label, kick) {
  const E = await J(`(() => { const c = TLXC.cars[${ci}], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); const sx = c.x + fz * 40, sz = c.z - fx * 40; crashCancel(); BOG.on = false; P.x = sx; P.z = sz; P.y = surf(sx, sz) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = Math.atan2(c.x - sx, c.z - sz); recenter(sx, sz, true); return { x: c.x, z: c.z }; })()`);
  await waitGame(1); await down("KeyW"); let minD = 99, vmax = 0, crashed = false, vAtMin = 0, ymax = 0;
  for (let k = 0; k < 70; k++) {
    await waitGame(0.15);
    if (kick && k === 12) { const dd = await J(`Math.hypot(P.x - ${E.x}, P.z - ${E.z})`); }
    const s = await J(`({ d: Math.hypot(P.x - ${E.x}, P.z - ${E.z}), v: Math.hypot(P.vx, P.vz), cr: !!(CRASH && CRASH.on), y: P.y - TLXC.cars[${ci}].y })`);
    if (kick && s.d < 14 && s.d > 6 && !kick.done) { await ev(`P.vy = 5; true`); kick.done = 1; }
    if (s.d < minD) { minD = s.d; vAtMin = s.v; } vmax = Math.max(vmax, s.v); crashed = crashed || s.cr; ymax = Math.max(ymax, s.y);
  }
  await up("KeyW");
  say("info", `${label}: closest ${minD.toFixed(2)} m, speed at closest ${vAtMin.toFixed(1)}, top speed ${vmax.toFixed(1)}, crashed ${crashed}, max height over roof base ${ymax.toFixed(2)}`);
  return { minD, crashed, vmax };
}
const B = await sledRun("B sled full throttle into car", null);
say(B.minD > 0.9 ? "ok" : "FINDING", "B sled does not pass through the car");
const E = await sledRun("E sled with a P.vy=5 hop 6-14 m out", {});
say("info", "E jump result closest " + E.minD.toFixed(2));

// A. pickup
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(400); await ev(`document.querySelector("#garageBody .row").click(); true`); await sleep(400); await ev(`closeGarage(); true`);
await ev(`(() => { const r = TLX.state("vehicles").owned[0]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); crashCancel(); FOOT.on = true; FOOT.x = r.x + fz * 3 - fx * 0.3; FOOT.z = r.z - fx * 3 - fz * 0.3; FOOT.yaw = r.yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
await sleep(800); await tap("KeyQ");
const seated = await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14);
say(seated ? "ok" : "FINDING", "seated in pickup: " + seated);
if (seated) {
  const A = await J(`(() => { const c = TLXC.cars[${ci}], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); const sx = c.x + fz * 30, sz = c.z - fx * 30; crashCancel(); BOG.on = false; P.x = sx; P.z = sz; P.y = surf(sx, sz) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = Math.atan2(c.x - sx, c.z - sz); recenter(sx, sz, true); return { x: c.x, z: c.z }; })()`);
  await waitGame(1); await down("KeyW"); let minD = 99, vm = 0;
  for (let k = 0; k < 60; k++) { await waitGame(0.2); const s = await J(`({ d: Math.hypot(P.x - ${A.x}, P.z - ${A.z}), v: Math.hypot(P.vx, P.vz) })`); minD = Math.min(minD, s.d); vm = Math.max(vm, s.v); }
  await up("KeyW");
  say(minD > 1.0 ? "ok" : "FINDING", `A pickup into car: closest ${minD.toFixed(2)} m from car middle (top speed ${vm.toFixed(1)})`);
  await shot("x3cb2_pickup_hit");
  await tap("KeyQ"); await waitUntil("FOOT.on", 10);
}

// D. night + dusting stills
await ev(`crashCancel(); BOG.on = false; WX.at = () => 0.6; GS.storm = 1; true`);
await ev(`TLXC.setSnow(null, 0); true`);
for (let k = 0; k < 6; k++) { await ev(`GS.hour += 0.25; true`); await waitGame(0.2); }
await ev(`WX.at = () => 0; GS.storm = 0; GS.hour = 34.5; true`); await sleep(1500);
const dust = await J(`TLXC.cars.map(c => c.b).filter(b => b > 0).length`);
say("info", "D cars with some snow after 1.5 h of weather 0.6: " + dust);
await carCam(ci, 8, 3, 0.7); await shot("x3cb2_night_dust");
await ev(`TLXC.setSnow(${ci}, 0.55); true`); await sleep(500); await shot("x3cb2_night_mound");

// C. old save without cars key
const save = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); return s && s.x ? { has: !!(s.x.sys && s.x.sys.cars), keys: Object.keys(s.x.sys || {}) } : { none: 1 }; })()`);
say("info", "C save x.sys keys " + JSON.stringify(save));
await ev(`save && save(); true`);
const obj = await J(`(() => { const s = JSON.parse(localStorage.getItem("tracklayer.save.v2")); if (s.x && s.x.sys) delete s.x.sys.cars; return s; })()`);
await reload(obj); await sleep(1500);
await ev(`tutSkip(); true`);
const C = await J(`({ n: TLXC.cars.length, buried: TLXC.buried(), ready: TLXC.ready, err: TLXC.err })`);
say(C.n > 0 && C.buried === 0 && !C.err ? "ok" : "FINDING", "C old save (no cars key): " + JSON.stringify(C));
// junk cars key
const obj2 = JSON.parse(JSON.stringify(obj)); obj2.x = obj2.x || {}; obj2.x.sys = obj2.x.sys || {}; obj2.x.sys.cars = { h: "x", c: { "1_1": "junk", [await J(`TLXC.cars[0].key`)]: [9, -3] } };
await reload(obj2); await sleep(1500);
const C2 = await J(`({ n: TLXC.cars.length, b0: TLXC.cars[0].b, wt0: TLXC.cars[0].wt, err: TLXC.err })`);
say(C2.n > 0 && C2.b0 <= 1 && C2.b0 >= 0 && C2.wt0 >= 0 && !C2.err ? "ok" : "FINDING", "C2 junk cars key: " + JSON.stringify(C2));
await done(0);
