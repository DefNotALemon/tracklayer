// Expansion slice 3.5b1: the tractor unit you own and drive (the lorry without its trailer). Asserts, exit 1 on a failure.
//   the garage's Trucks tab lists it at $11,500 and asks for the Freight licence (locked row, TLXV.buy refused, no cash
//   taken); licensed: bought, parked on the plowed forecourt with 300 L; walking up names it ("get in the lorry"); the
//   mount key climbs the steps (hips rise ~0.9 m) and seats you; its own tank and two cab parcels; six wheels (twin rears);
//   no tow ball; on a plowed road it pulls away, tops out near its limiter well below the pickup's pace off the line, steers
//   and brakes to a stop; S at a standstill reverses; in half a metre of powder it goes nowhere and digs in; getting out
//   stands you on the snow beside the door; save / reload (parked, and seated); pad LB and touch GET ON / GET OFF; the
//   pickup still buys, sits and drives beside it (four wheels, its own seat).
// Stills (OUT): side, front three-quarter, rear, first person, night.
import { boot, ev, tap, sleep, done, padSet, padOff, reload, down, up, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(150); }
async function waitUntil(expr, maxGame = 14) { const t0 = await clock(); while ((await clock()) - t0 < maxGame) { if (await ev(expr)) return true; await sleep(150); } return false; }
const spd = () => J(`{ t: +gameClock.toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), vf: +(P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)).toFixed(2), x: P.x, z: P.z, yaw: P.yaw, bog: BOG.on, acc: +BOG.acc.toFixed(2) }`);
const holdFor = async (codes, secs, fn = spd) => {
  codes = [].concat(codes); for (const c of codes) await down(c); const t0 = await clock(), out = [];
  try { for (;;) { await sleep(250); const t = await clock(); out.push(await fn()); if (t - t0 >= secs) break; } } finally { for (const c of codes) await up(c); }
  return out;
};
const NOSTILLS = !!process.env.NOSTILLS;
const still = async name => { if (!NOSTILLS) await shot(name); };
const rec = uid => J(`(() => { const r = TLX.state("vehicles").owned.find(r => r.uid === "${uid}"); return r ? { id: r.id, x: r.x, z: r.z, yaw: r.yaw, fuel: r.fuel, cond: r.cond } : null; })()`);
// stand the walker out from the door side and let the nearest-vehicle rule pick it
const walkerBeside = (uid, off = 3.4, along = 1.6) => ev(`(() => { const s = TLX.state("vehicles"), r = s.owned.find(r => r.uid === "${uid}"); const cur = s.cur === r.uid, x = cur ? P.x : r.x, z = cur ? P.z : r.z, yaw = cur ? P.yaw : r.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
  FOOT.on = true; FOOT.x = x + fz * ${off} + fx * ${along}; FOOT.z = z - fx * ${off} + fz * ${along}; FOOT.yaw = yaw - 1.4; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; recenter(FOOT.x, FOOT.z, true); return 1; })()`);
const rows = () => J(`[...document.querySelectorAll("#garageBody .row")].map(b => ({ t: b.textContent, locked: b.classList.contains("owned") }))`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; true`);
if (await ev(`!!(window.TLX && TLX.setOn)`)) await ev(`TLX.setOn("traffic", false); true`);

// ---- A. the garage row and the licence
await ev(`GS.cash = 12000; GS.lic.freight = false; P.vx = P.vz = 0; true`); await sleep(300);
await ev(`garageTab = "trucks"; openGarage(); true`); await sleep(500);
let rw = await rows();
let tr = rw.find(r => /Nordtrekk/.test(r.t)), pk = rw.find(r => /Fjellvogn/.test(r.t));
ok(tr && /\$11500/.test(tr.t) && /tractor unit/.test(tr.t) && /7200 kg/.test(tr.t), "the Trucks tab lists the tractor unit at $11500: " + (tr ? tr.t.slice(0, 90) : "missing"));
ok(tr && tr.locked && /Needs your Freight licence/.test(tr.t), "without the Freight licence its row is locked and says why");
ok(pk && !pk.locked && !/licence/.test(pk.t), "the pickup's row is as it was (no licence asked)");
await ev(`TLXV.buy("tractor"); true`); await sleep(300);
let s = await J(`({ cash: GS.cash, n: TLX.state("vehicles").owned.length, toast: [...document.querySelectorAll("#toasts > *")].map(e => e.textContent).join(" | ") })`);
ok(s.cash === 12000 && s.n === 0 && /Freight licence/.test(s.toast), "buying it unlicensed is refused, no cash taken: " + s.toast.slice(-110));
await ev(`closeGarage(); GS.lic.freight = true; garageTab = "trucks"; openGarage(); true`); await sleep(500);
rw = await rows(); tr = rw.find(r => /Nordtrekk/.test(r.t));
ok(tr && !tr.locked && !/Needs your/.test(tr.t), "with the licence the row is open");
const sledPose = await J(`({ x: P.x, z: P.z })`);
await ev(`[...document.querySelectorAll("#garageBody .row")].find(b => /Nordtrekk/.test(b.textContent)).click(); true`); await sleep(500);
await ev(`closeGarage(); true`);
s = await J(`({ cash: GS.cash, own: TLX.state("vehicles").owned.map(r => ({ uid: r.uid, id: r.id, x: r.x, z: r.z, fuel: r.fuel })) })`);
ok(s.cash === 500 && s.own.length === 1 && s.own[0].id === "tractor", `bought: $11500 down (cash ${s.cash})`);
const o1 = s.own[0];
{ const gar = await J(`({ x: garageSite.x, z: garageSite.z })`), nr = await J(`({ water: isWater(${o1.x}, ${o1.z}), ob: obNear(${o1.x}, ${o1.z}, 2.6), yard: yardAt(${o1.x}, ${o1.z}) })`);
  ok(Math.hypot(o1.x - gar.x, o1.z - gar.z) < 40 && !nr.water && !nr.ob && nr.yard > 0.5, `parked on the plowed forecourt, clear of obstacles (${Math.hypot(o1.x - gar.x, o1.z - gar.z).toFixed(0)} m from the garage)`);
  ok(Math.hypot(o1.x - sledPose.x, o1.z - sledPose.z) > 4 && o1.fuel === 300, "clear of the sled, with a full 300 L tank"); }

// ---- B. walk up, the hint, the climb
await walkerBeside("v1"); await sleep(1300);
s = await J(`({ cur: TLX.state("vehicles").cur, hint: $("wnHint").textContent, board: VEH.board })`);
ok(s.cur === "v1" && /get in the lorry/.test(s.hint), "walking up makes it the current vehicle and the hint names it: " + s.hint);
ok((await J(`TLXV.ballOf("v1")`)) === null, "it has no tow ball: nothing hitches to it");
// parked stills are taken out on the road (section E), where nothing stands in the camera's way
const vcam = async (yawOff, dist, h, ty = 1.3, fwd = 0) => { await sideCam(); await ev(`window.camOv = c => { const yaw = P.yaw + ${yawOff}, tx = P.x + Math.sin(P.yaw) * ${fwd}, tz = P.z + Math.cos(P.yaw) * ${fwd}; c.position.set(tx + Math.sin(yaw) * ${dist}, P.y + ${ty} + ${h}, tz + Math.cos(yaw) * ${dist}); c.lookAt(tx, P.y + ${ty} + 0.2, tz); }; true`); await sleep(350); };
const y0 = await J(`({ fy: FOOT.y, py: P.y })`);
await tap("KeyQ"); await sleep(300);
ok(await ev("MNT.on"), "the mount key starts the climb in");
let hi = -9, doorMax = 0, midShot = false;
{ const t0 = await clock(); while ((await clock()) - t0 < 14) { const q = await J(`({ m: MNT.on, fy: FOOT.y, py: P.y, door: TLXV.rt().door, ph: TLXV.rt().A ? TLXV.rt().A.ph : -1 })`); if (!q.m) break; hi = Math.max(hi, q.fy - q.py); doorMax = Math.max(doorMax, q.door);
    if (!midShot && q.ph === 2 && q.fy - q.py > 0.3) { midShot = true; }
    await sleep(120); } }
await sleep(400);
s = await J(`({ foot: FOOT.on, mnt: MNT.on, cur: !!VEH.cur, id: TLXV.rt().def.id, door: TLXV.rt().door, drv: TLXV.rt().drvBody.visible, drvY: TLXV.rt().drvBody.position.y, walker: FOOT.g.visible, fuel: GS.fuel, cap: GS.cap, slots: ST.slots, nW: TLXV.rt().wheels.count, noun: VEH.noun })`);
ok(!s.foot && !s.mnt && s.cur && s.id === "tractor" && s.door === 0 && s.drv && !s.walker, "the climb completes: seated, door shut, the driver in the cab, the walker gone");
ok(hi > 0.7 && hi < 1.1 && doorMax > 0.9, `the hips rise ${hi.toFixed(2)} m up the steps (the pickup's seat is a step-in) and the door swung open (${doorMax.toFixed(2)})`);
ok(s.fuel === 300 && s.cap === 300 && s.slots === 2, `its own tank (${s.fuel}/${s.cap} L) and two parcels in the cab (${s.slots})`);
ok(s.nW === 6 && Math.abs(s.drvY - 0.9) < 1e-6 && s.noun === "Lorry", "six wheels (twin rears), the driver sits 0.9 m higher than in the pickup");
{ const w = await J(`(() => { const R = TLXV.rt(), m = new THREE.Matrix4(), v = new THREE.Vector3(), out = []; for (let i = 0; i < R.wheels.count; i++) { R.wheels.getMatrixAt(i, m); v.setFromMatrixPosition(m); out.push([+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]); } return out; })()`);
  console.log("wheels", JSON.stringify(w));
  ok(w[0][0] === 1 && w[1][0] === -1 && w[2][0] === 0.76 && w[4][0] === 1.1 && w[5][0] === -1.1 && w[4][2] === -2.1 && w.every(q => q[1] > 0.35 && q[1] < 0.65), "front singles at +-1.0, twin rears at +-0.76 and +-1.1 on the drive axle, all sitting on the ground"); }

// ---- C. on a plowed road: pull away, top speed, brake, steer, reverse
const road = await J(`(() => { let best = null; for (const rt of TLXR.routes) { if (!rt.cum || rt.closed) continue; const p = rt.pts, c = rt.cum;
    for (let i = 4; i < p.length - 4; i += 3) { if (Math.hypot(p[i][0] - depot.x, p[i][1] - depot.z) < TOWN_R + 150) continue; let j = i; while (j < p.length - 1 && c[j] - c[i] < 260) j++; if (c[j] - c[i] < 260) break;
      const L = c[j] - c[i], str = Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1]) / L; let gmax = 0, off = 0; for (let k = i; k < j; k++) { gmax = Math.max(gmax, Math.abs(groundAt(p[k + 1][0], p[k + 1][1]) - groundAt(p[k][0], p[k][1])) / Math.max(0.5, c[k + 1] - c[k]));
        const ux = (p[j][0] - p[i][0]) / (L * str), uz = (p[j][1] - p[i][1]) / (L * str), dx = p[k][0] - p[i][0], dz = p[k][1] - p[i][1]; off = Math.max(off, Math.abs(dx * uz - dz * ux)); }
      if (isWater(p[i][0], p[i][1])) continue; const sc = off + gmax * 60; if (!best || sc < best.sc) best = { sc, id: rt.id, x: p[i][0], z: p[i][1], x2: p[j][0], z2: p[j][1], L, off: +off.toFixed(2), gmax: +gmax.toFixed(3) }; } }
  return best; })()`);
console.log("road", JSON.stringify(road));
ok(road && road.off < 1.6 && road.gmax < 0.05, `a straight, level 260 m of road to test on (${road ? road.id : "none"}: ${road ? road.off : "?"} m off the line, grade ${road ? road.gmax : "?"})`);
const ux = (road.x2 - road.x) / Math.hypot(road.x2 - road.x, road.z2 - road.z), uz = (road.z2 - road.z) / Math.hypot(road.x2 - road.x, road.z2 - road.z);
const toRoad = () => ev(`(() => { TLXR.setPlowed && TLXR.setPlowed(null, 0); const x = ${road.x}, z = ${road.z}; P.x = x; P.z = z; P.yaw = Math.atan2(${ux}, ${uz}); P.vx = P.vz = P.vy = 0; BOG.on = false; BOG.acc = 0; recenter(x, z, true); P.y = surf(x, z); camState.init = false; return 1; })()`);
await toRoad(); await sleep(1200);
s = await J(`({ yard: yardAt(P.x, P.z), d: depthAt(Math.round((P.x + HALF) / CELL), Math.round((P.z + HALF) / CELL)) })`);
console.log("road surface", JSON.stringify(s));
let r = await holdFor("KeyW", 4);
const v4 = r[r.length - 1].v, t4 = r[r.length - 1].t - r[0].t + 0.25;
ok(v4 > 5 && v4 < 13 && !r.some(q => q.bog), `it pulls away on the plowed road: ${v4.toFixed(1)} m/s after 4 s (a pickup makes ~12), not bogged`);
await still("t6_chase_road");
// first person from the driver's seat
{ const cm = await ev("camMode"); await ev(`(() => { for (let i = 0; i < VIEWS.length; i++) if (VIEWS[i].fp) { camMode = i; break; } camState.init = false; return 1; })()`); await sleep(700);
  const e = await J(`(() => { const R = TLXV.rt(); R.grp.updateMatrixWorld(true); const v = R.grp.worldToLocal(camera.position.clone()); return { x: +v.x.toFixed(2), y: +v.y.toFixed(2), z: +v.z.toFixed(2), drv: R.drvBody.visible, q: [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w].every(Number.isFinite) }; })()`);
  console.log("fp eye in the cab frame", JSON.stringify(e));
  ok(e.q && Math.abs(e.x - 0.62) < 0.2 && e.y > 2.2 && e.y < 2.85 && e.z > 1.2 && e.z < 2.2 && !e.drv, `first person looks out from the driver's seat (${e.x}, ${e.y}, ${e.z} in the cab), 0.9 m above the pickup's eye`);
  await still("t7_fp"); await ev(`camMode = ${cm}; camState.init = false; true`); await sleep(400); }
await toRoad(); await sleep(900);
r = await holdFor("KeyW", 12);
const vTop = Math.max(...r.map(q => q.v)), dist = Math.hypot(r[r.length - 1].x - r[0].x, r[r.length - 1].z - r[0].z);
console.log("road run", r.filter((_, i) => i % 4 === 0).map(q => q.v).join(" "), "m/s;", dist.toFixed(0), "m");
ok(vTop > 14 && vTop <= 26.5, `it runs up to ${vTop.toFixed(1)} m/s in 12 s (limited to 25 m/s, 90 km/h)`);
// brake to a stop from speed
{ const b0 = await spd(); await down("KeyS"); let b1 = b0; for (let i = 0; i < 200; i++) { await sleep(100); b1 = await spd(); if (b1.vf < 0.3) break; } await up("KeyS");
  const dec = (b0.v - b1.v) / Math.max(0.1, b1.t - b0.t), dS = Math.hypot(b1.x - b0.x, b1.z - b0.z);
  console.log(`brake: ${b0.v} -> ${b1.v} m/s in ${(b1.t - b0.t).toFixed(1)} s, ${dS.toFixed(0)} m`);
  ok(b1.vf < 0.6 && dec > 2 && dec < 6.5, `the brakes stop it from ${b0.v.toFixed(0)} m/s in ${dS.toFixed(0)} m (${dec.toFixed(1)} m/s2: seven tonnes on packed snow)`); }
await sleep(700); await ev(`P.vx = P.vz = 0; true`);
// steer: half a second of throttle then W + A
await toRoad(); await sleep(800);
{ const a0 = await spd(); const rr = await holdFor(["KeyW", "KeyA"], 2.5); const a1 = rr[rr.length - 1]; let dy = a1.yaw - a0.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const st = await J(`TLXV.rt().steer`);
  ok(Math.abs(dy) > 0.25, `it steers: ${(dy * 57.3).toFixed(0)} deg of heading in 2.5 s at up to ${a1.v.toFixed(1)} m/s`); void st; }
await ev(`P.vx = P.vz = 0; true`); await toRoad(); await sleep(900);
{ await down("KeyS"); let vmin = 0; const t0 = await clock(); for (let i = 0; i < 60; i++) { await sleep(200); vmin = Math.min(vmin, (await spd()).vf); if ((await clock()) - t0 > 5) break; } await up("KeyS");
  ok(vmin < -1.2 && vmin > -4.2, `holding the brake at a standstill reverses it (${vmin.toFixed(1)} m/s, capped near 3.4)`); }
await sleep(600); await ev(`P.vx = P.vz = 0; true`);

// ---- D. half a metre of powder: nowhere
await ev(`(() => { for (let r = 0; r < 1500; r += 20) for (let a = 0; a < 6.28; a += 0.5) { const x = ${road.x} + 300 + Math.cos(a) * r, z = ${road.z} + 200 + Math.sin(a) * r; if (isSea(x, z) || isWater(x, z)) continue; if (Math.abs(groundAt(x + 20, z) - groundAt(x - 20, z)) > 1.0 || Math.abs(groundAt(x, z + 20) - groundAt(x, z - 20)) > 1.0) continue; if (obNear(x, z, 30) || yardAt(x, z) > 0.05) continue; P.x = x; P.z = z; P.yaw = 0; P.vx = P.vz = P.vy = 0; recenter(x, z, true); P.y = surf(x, z); camState.init = false; return 1; } return 0; })()`);
await sleep(1000);
await ev(`(() => { const cx = P.x, cz = P.z; for (let ix = Math.floor((cx - 5 + HALF) / CELL); ix <= Math.ceil((cx + 5 + HALF) / CELL); ix++) for (let iz = Math.floor((cz - 6 + HALF) / CELL); iz <= Math.ceil((cz + 22 + HALF) / CELL); iz++) { const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = 0.5; c.d[k] = 0.5; writeCell(ix, iz, d0, 0.5, 0.5); } recenter(P.x, P.z, true); return 1; })()`);
await sleep(500);
const dp = await J(`{ d: depthAt(Math.round((P.x + HALF) / CELL), Math.round((P.z + 3 + HALF) / CELL)), f: freshAt(Math.round((P.x + HALF) / CELL), Math.round((P.z + 3 + HALF) / CELL)) }`);
console.log("powder", JSON.stringify(dp));
await ev(`BOG.immune = 0; BOG.on = false; BOG.acc = 0; true`);
r = await holdFor("KeyW", 12);
{ const vP = Math.max(...r.map(q => q.v)), dP = Math.hypot(r[r.length - 1].x - r[0].x, r[r.length - 1].z - r[0].z), hint = await ev(`$("wnHint").textContent`);
  console.log("powder run", r.filter((_, i) => i % 4 === 0).map(q => q.v).join(" "), "m/s; moved", dP.toFixed(1), "m; bog", r.some(q => q.bog), "| hint:", hint);
  ok(dp.d >= 0.35, `the test ground is ${dp.d.toFixed(2)} m of snow`);
  ok(vP < vTop / 4 && dP < 25, `off the road it is hopeless: top ${vP.toFixed(1)} m/s, ${dP.toFixed(1)} m in 12 s of full throttle`);
  ok(r.some(q => q.bog) || r[r.length - 1].acc > 0.3 || dP < 6, `and it digs in or sits (bogged ${r.some(q => q.bog)}, dig ${r[r.length - 1].acc})`);
  await still("t8_powder"); }
await ev(`BOG.on = false; BOG.acc = 0; BOG.immune = 30; P.vx = P.vz = 0; true`);

// ---- E. getting out; night stills; save and reload
await toRoad(); await sleep(900);
await tap("KeyQ"); await sleep(400);
ok(await waitUntil("!DMT.on && FOOT.on", 12), "the mount key gets out (animation completes)");
await sleep(500);
s = await J(`(() => { const R = TLXV.rt(), fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), dx = FOOT.x - P.x, dz = FOOT.z - P.z; return { lx: +(dx * fz - dz * fx).toFixed(2), lz: +(dx * fx + dz * fz).toFixed(2), dy: +(FOOT.y - surf(FOOT.x, FOOT.z)).toFixed(2), vis: FOOT.g.visible, hint: $("wnHint").textContent }; })()`);
console.log("out", JSON.stringify(s));
ok(Math.abs(s.lx - 1.82) < 0.25 && Math.abs(s.lz - 1.82) < 0.3 && Math.abs(s.dy) < 0.25 && s.vis, `standing on the snow beside the door (${s.lx} m out, ${s.lz} m ahead of the middle, ${s.dy} m off the surface)`);
ok(/get in the lorry/.test(s.hint), "and the hint offers the way back in: " + s.hint);
await vcam(1.5708, 9.5, 0.6); await still("t1_side");
await vcam(0.65, 9, 1.2); await still("t2_front34");
await vcam(2.7, 8.5, 2.6, 1.0); await still("t3_rear34");
await vcam(-1.5708, 9.5, 0.6); await still("t4_offside");
await vcam(3.14159, 6.5, 4.2, 0.8); await still("t4b_fifthwheel");
await ev(`GS.hour = 23; true`); await sleep(900);
await vcam(0.6, 10, 1.4); await still("t9_night_parked");
await ev(`GS.hour = 12; true`); await sleep(500);
// the climb, frame by frame from the front quarter (0.25 s of game time apart)
await vcam(2.25, 5.2, 0.5, 1.5, 1.8);
await tap("KeyQ"); await sleep(200);
{ let n = 0, last = -1; const t0 = await clock(); while ((await clock()) - t0 < 14) { const q = await J(`({ m: MNT.on, t: gameClock, ph: TLXV.rt().A ? TLXV.rt().A.ph : -1 })`); if (!q.m) break; if (q.ph >= 1 && q.t - last >= 0.25 && n < 9) { last = q.t; await still("t5_climb" + (n++)); } else await sleep(60); } }
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "back in");
await ev(`GS.hour = 23; true`); await sleep(900);
await vcam(0.6, 10, 1.4); await still("t10_night_lit"); await camOff();
await ev(`GS.hour = 12; true`);
// seated save -> reload
await ev(`TLX.state("vehicles").owned[0].cond = 88; GS.fuel = 211; save(); true`); await sleep(300);
const seatedAt = await J(`({ x: P.x, z: P.z })`);
await reload(); await sleep(600);
s = await J(`({ cur: !!VEH.cur, foot: FOOT.on, rid: TLX.state("vehicles").cur, id: TLXV.rt() && TLXV.rt().def.id, x: P.x, z: P.z, fuel: GS.fuel, cap: GS.cap, cond: TLX.state("vehicles").owned[0].cond, drv: TLXV.rt() && TLXV.rt().drvBody.visible, nW: TLXV.rt() && TLXV.rt().wheels.count })`);
ok(s.cur && !s.foot && s.rid === "v1" && s.id === "tractor" && Math.hypot(s.x - seatedAt.x, s.z - seatedAt.z) < 0.5 && Math.abs(s.fuel - 211) < 1 && s.cap === 300 && s.cond === 88 && s.drv && s.nW === 6, `a reload while seated comes back seated in the lorry: same spot, ${s.fuel && s.fuel.toFixed(0)} L, 88%`);
await ev(`tutSkip(); GS.storm = 0; WX.at = () => 0; true`);
if (await ev(`!!(window.TLX && TLX.setOn)`)) await ev(`TLX.setOn("traffic", false); true`);
await toRoad(); await sleep(900);
r = await holdFor("KeyW", 3); ok(r[r.length - 1].v > 3, `it drives after the reload (${r[r.length - 1].v.toFixed(1)} m/s)`);
await sleep(300); await ev(`P.vx = P.vz = 0; true`); await sleep(400);

// ---- F. pad and touch
await padSet({ 4: 1 }); await sleep(250); await padSet(); await sleep(400);
ok(await waitUntil("!DMT.on && FOOT.on", 12), "pad: LB gets out of the lorry");
await sleep(600);
s = await J(`({ hint: $("wnHint").textContent })`); ok(/get in the lorry/.test(s.hint) && !/\bQ\b/.test(s.hint), "pad: the hint names the pad's button, not a key: " + s.hint);
await padSet({ 4: 1 }); await sleep(250); await padSet(); await sleep(400);
ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "pad: LB gets in");
await padSet({ 7: 1 }); { const t0 = await clock(); while ((await clock()) - t0 < 3) await sleep(150); } const vPad = (await spd()).v; await padSet(); await padOff(); await sleep(300);
ok(vPad > 3, `pad: the right trigger drives it (${vPad.toFixed(1)} m/s after 3 s)`);
await ev(`P.vx = P.vz = 0; true`); await sleep(500);
await ev(`SET.touch = "on"; setTouchUI(); INP.dev = "touch"; true`); await sleep(700);
const tapB = id => `(() => { const b = $("${id}"); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" })); return 1; })()`;
s = await J(`({ hidden: $("tcQ").hidden, label: $("tcQ").textContent })`);
ok(!s.hidden && s.label === "GET OFF", "touch: in the lorry the GET OFF button is there");
await ev(tapB("tcQ")); ok(await waitUntil("!DMT.on && FOOT.on", 12), "touch: GET OFF gets out");
await sleep(600);
s = await J(`({ label: $("tcOn").textContent, hint: $("wnHint").textContent })`);
ok(s.label === "GET ON" && /tap GET ON/.test(s.hint), "touch: on foot it reads GET ON and the hint says tap GET ON: " + s.hint);
await ev(tapB("tcOn")); ok(await waitUntil("!MNT.on && !FOOT.on && !!VEH.cur", 14), "touch: GET ON gets in");
await ev(`SET.touch = "off"; setTouchUI(); INP.dev = "kbm"; true`).catch(() => 0);

// ---- G. the pickup beside it is unchanged
await tap("KeyQ"); await sleep(300); await waitUntil("!DMT.on && FOOT.on", 12); await sleep(400);
await ev(`GS.cash = 5000; TLXV.buy("pickup"); true`); await sleep(400);
s = await J(`({ cash: GS.cash, own: TLX.state("vehicles").owned.map(r => r.id + ":" + r.uid) })`);
ok(s.cash === 800 && s.own.length === 2 && s.own[1] === "pickup:v2", "the pickup still buys for $4200 beside it: " + s.own.join(", "));
await walkerBeside("v2", 3.2, -0.3); await sleep(1500);
s = await J(`({ cur: TLX.state("vehicles").cur, hint: $("wnHint").textContent })`);
ok(s.cur === "v2" && /get in the pickup/.test(s.hint), "next to the pickup the pickup is current: " + s.hint);
await tap("KeyQ"); await sleep(300); let hiP = -9;
{ const t0 = await clock(); while ((await clock()) - t0 < 12) { const q = await J(`({ m: MNT.on, d: FOOT.y - P.y })`); if (!q.m) break; hiP = Math.max(hiP, q.d); await sleep(120); } }
await sleep(400);
s = await J(`({ foot: FOOT.on, id: TLXV.rt().def.id, nW: TLXV.rt().wheels.count, drvY: TLXV.rt().drvBody.position.y, slots: ST.slots, cap: GS.cap, sw: TLXV.rt().swheel.position.toArray() })`);
ok(!s.foot && s.id === "pickup" && s.nW === 4 && s.drvY === 0 && s.slots === 8 && s.cap === 70 && Math.abs(s.sw[1] - 1.12) < 1e-6 && hiP < 0.35, `seated in the pickup as before: four wheels, its own seat and wheel, 8 parcels, 70 L (hips rose ${hiP.toFixed(2)} m)`);
{ await toRoad(); await sleep(900); const rr = await holdFor("KeyW", 4); ok(rr[rr.length - 1].v > 8, `and it drives as before: ${rr[rr.length - 1].v.toFixed(1)} m/s after 4 s on the same road (the lorry made ${v4.toFixed(1)})`); }
// both come back from a save; the lorry parked
await ev(`P.vx = P.vz = 0; save(); true`); await sleep(300);
const sv = await J(`JSON.parse(localStorage.getItem("tracklayer.save.v2")).x.sys.vehicles.s.owned.map(r => r.id)`);
ok(sv.join() === "tractor,pickup", "the save holds both trucks: " + sv.join());
await reload(); await sleep(600);
s = await J(`({ own: TLX.state("vehicles").owned.map(r => r.id).join(), rid: TLX.state("vehicles").cur, id: TLXV.rt() && TLXV.rt().def.id })`);
ok(s.own === "tractor,pickup" && s.rid === "v2" && s.id === "pickup", "after the reload both are there and you are in the pickup");

console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
