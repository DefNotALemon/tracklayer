// Beta: Kjøllefjord street grid (v228) - parked cars vs the new lots, a sled driven down every street, a storm refill, reload.
// Run: tools/playtest/run.sh tools/playtest/scenarios/g1_towngrid_cars_drive.mjs <out>
import { boot, ev, shot, done, sleep, reload, hold, down, up } from "../lib.mjs";
await boot();
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; tutSkip(); FOOT.on = false; VEH.cur = null; true");
await sleep(800);
const cars = JSON.parse(await ev(`(() => {
  const d = depot, C = window.TLXC ? TLXC.cars : [], out = { n: C.length, inTown: 0, hitOb: [], hitCar: [], sea: [], steep: [], onStreet: 0, offYard: [] };
  const T = C.filter(c => Math.hypot(c.x - d.x, c.z - d.z) <= TOWN_R + 10);
  out.inTown = T.length;
  for (const c of T) {
    const rel = [Math.round(c.x - d.x), Math.round(c.z - d.z)];
    if (obNear(c.x, c.z, 1.6)) out.hitOb.push(rel);
    if (isSea(c.x, c.z) || isWater(c.x, c.z)) out.sea.push(rel);
    if (slopeAt(c.x, c.z, 4) > 0.3) out.steep.push(rel);
    if (yardAt(c.x, c.z) < 0.3) out.offYard.push(rel);
  }
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) if (Math.hypot(T[i].x - T[j].x, T[i].z - T[j].z) < 2.5) out.hitCar.push([Math.round(T[i].x - d.x), Math.round(T[i].z - d.z)]);
  return JSON.stringify(out);
})()`));
console.log("cars", JSON.stringify(cars));
// drive the sled along each TOWNL street leg with a simple steer-to-point driver
const legs = JSON.parse(await ev(`JSON.stringify((typeof TOWNL !== "undefined" ? TOWNL : []).slice(0, 14).map(l => l.map(p => [Math.round(p[0]), Math.round(p[1])])))`));
console.log("TOWNL legs", legs.length);
const res = [];
for (let i = 0; i < legs.length; i++) {
  const [a, b] = [legs[i][0], legs[i][legs[i].length - 1]];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 8) continue;
  await ev(`crashCancel(); FOOT.on = false; P.x = ${a[0]}; P.z = ${a[1]}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = P.vy = 0; P.yaw = Math.atan2(${b[0] - a[0]}, ${b[1] - a[1]}); recenter(P.x, P.z, true); true`);
  await sleep(300);
  // physics: set throttle through input via keys, steer by yaw nudging toward target
  await down("KeyW");
  let stuck = 0, last = 0, t0 = Date.now(), minV = 99, reached = false, crashed = false;
  while (Date.now() - t0 < 14000) {
    const s = JSON.parse(await ev(`JSON.stringify({x:P.x,z:P.z,v:Math.hypot(P.vx,P.vz),crash:CRASH.on,d:Math.hypot(${b[0]}-P.x,${b[1]}-P.z)})`));
    if (s.crash) { crashed = true; break; }
    if (s.d < 4) { reached = true; break; }
    minV = Math.min(minV, s.v);
    await ev(`(() => { const dx = ${b[0]} - P.x, dz = ${b[1]} - P.z; P.yaw = Math.atan2(dx, dz); return 1; })()`);
    await sleep(250);
  }
  await up("KeyW");
  const e = JSON.parse(await ev(`JSON.stringify({x:Math.round(P.x),z:Math.round(P.z),ob:obNear(P.x,P.z,1.2),v:+Math.hypot(P.vx,P.vz).toFixed(1)})`));
  res.push({ i, a, b, len: Math.round(len), reached, crashed, end: e });
}
console.log("drive", JSON.stringify(res));
// storm: dump snow, check street still plowed and a depth sample
await ev("GS.storm = 1; for (let k = 0; k < 400; k++) { try { WX.at = () => 1; } catch (e) {} } true");
await sleep(1500);
const st = JSON.parse(await ev("JSON.stringify({a: yardAt(depot.x + 2, depot.z + 30), b: yardAt(depot.x + 2, depot.z - 20)})"));
console.log("yard in storm", JSON.stringify(st));
await ev(`WX.at = () => 0; GS.storm = 0; P.x = depot.x + 2; P.z = depot.z - 50; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; P.yaw = 0; recenter(P.x, P.z, true); camState.init = false; true`);
await sleep(1500);
await shot("sled_street");
const cars2 = await ev("window.TLXC ? TLXC.cars.length : -1");
await reload(); await sleep(1500);
const cars3 = await ev("window.TLXC ? TLXC.cars.length : -1");
console.log("cars before/after reload", cars2, cars3);
await done();
