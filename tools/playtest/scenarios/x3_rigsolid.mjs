// Expansion slice 3.5b2b1: the semitrailer as a solid thing, the jackknife, straight reversing (tlx-rig.js v2).
// Asserts, exit 1 on a failure.
//   A. a standing trailer is circles in the obstacle grid along its whole body; a walker held into its side stays outside
//   B. the sled ridden at its side is stopped short of it
//   C. the tractor driven at its side is stopped too, but backing in along its line it still runs under the front and couples
//   D. the walker can still reach the legs (LEGS UP) with the body solid
//   E. coupled, the circles travel with the trailer (none left in the lay-by), and the tractor is not stopped by its own trailer
//   F. straight reversing: 20 m back along the road with small steering corrections, the articulation staying small
//   G. jackknife: backing with the rig bent, the articulation stops at 60 deg, the tractor is HELD (no more ground gained
//      with reverse held) and a toast says to pull forward; forward frees it and the trailer straightens
//   H. a road driver coming up behind the coupled rig stops behind the trailer's tail, never inside the trailer
//   I. after a reload the trailer is solid where it stands
// Stills (OUT): walker against the trailer's side, the jackknifed rig from above.
import { boot, ev, tap, sleep, done, reload, down, up, shot, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(secs) { const t0 = await clock(); while ((await clock()) - t0 < secs) await sleep(120); }
const NOSTILLS = !!process.env.NOSTILLS;
const still = async name => { if (!NOSTILLS) await shot(name); };
const toasts = () => J(`(TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; return 1; })()`);
const tr = id => J(`TLXRIG.list().find(t => t.id === "${id}")`);
const spd = () => J(`({ t: +gameClock.toFixed(2), v: +Math.hypot(P.vx, P.vz).toFixed(2), vf: +(P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)).toFixed(2), x: P.x, z: P.z, yaw: P.yaw })`);
// where a point is against trailer id: along its line from the kingpin (+ ahead), and sideways from its centre line
const rel = (id, px, pz) => J(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), tx = Math.sin(t.yaw), tz = Math.cos(t.yaw), ex = ${px} - t.kx, ez = ${pz} - t.kz; return { along: ex * tx + ez * tz, side: ex * tz - ez * tx }; })()`);
// a spot `side` m off the middle of trailer id's body, on the road's side of it, facing the trailer; who = "P" or "FOOT"
const beside = (id, side, who, v = 0) => ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), tx = Math.sin(t.yaw), tz = Math.cos(t.yaw), u = -(t.L + t.over - t.front) / 2;
  const mx = t.kx + tx * u, mz = t.kz + tz * u; let sg = 1; if (TLXR.near(mx + tz * 5, mz - tx * 5).d > TLXR.near(mx - tz * 5, mz + tx * 5).d) sg = -1;
  const x = mx + tz * sg * ${side}, z = mz - tx * sg * ${side}, yaw = Math.atan2(mx - x, mz - z);
  if ("${who}" === "FOOT") { P.vx = P.vz = 0; FOOT.on = true; FOOT.g.visible = true; FOOT.x = x; FOOT.z = z; FOOT.yaw = yaw; FOOT.y = surf(x, z); FOOT.sp = 0; recenter(x, z, true); }
  else { crashCancel(); FOOT.on = false; FOOT.g.visible = false; P.x = x; P.z = z; P.yaw = yaw; P.vx = Math.sin(yaw) * ${v}; P.vz = Math.cos(yaw) * ${v}; P.vy = 0; P.y = surf(x, z); BOG.on = false; BOG.acc = 0; recenter(x, z, true); camState.init = false; }
  return 1; })()`);
const place = (id, ahead, yawOff = 0, vf = 0) => ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), yaw = t.yaw + ${yawOff}, fz = TLXV.rt().def.fifthZ;
  const fx = t.kx + Math.sin(t.yaw) * ${ahead}, fzz = t.kz + Math.cos(t.yaw) * ${ahead};
  P.x = fx - Math.sin(yaw) * fz; P.z = fzz - Math.cos(yaw) * fz; P.yaw = yaw; P.vx = Math.sin(yaw) * ${vf}; P.vz = Math.cos(yaw) * ${vf}; P.vy = 0; P.y = surf(P.x, P.z); BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(P.x, P.z, true); camState.init = false; return 1; })()`);
const atLegs = (id, side = 1.9) => ev(`(() => { const t = TLXRIG.list().find(t => t.id === "${id}"), l = TLXRIG.legsPt("${id}"); P.vx = P.vz = 0; FOOT.on = true; FOOT.g.visible = true; FOOT.x = l[0] + Math.cos(t.yaw) * ${side}; FOOT.z = l[1] - Math.sin(t.yaw) * ${side}; FOOT.yaw = t.yaw - 1.57; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.sp = 0; return 1; })()`);
const vcam = async (yawOff, dist, h, ty = 1.6, back = 0) => { await sideCam(); await ev(`window.camOv = c => { const yaw = P.yaw + ${yawOff}, tx = P.x - Math.sin(P.yaw) * ${back}, tz = P.z - Math.cos(P.yaw) * ${back}; c.position.set(tx + Math.sin(yaw) * ${dist}, P.y + ${ty} + ${h}, tz + Math.cos(yaw) * ${dist}); c.lookAt(tx, P.y + ${ty}, tz); }; true`); await sleep(350); };
const rigObs = (x, z, R = 2) => J(`obstaclesNear(${x}, ${z}, ${R}).filter(o => o.rig && Math.hypot(o.x - (${x}), o.z - (${z})) < ${R} + o.r).length`);

await boot();
await ev(`tutSkip(); true`); await sleep(600);
await ev(`crashCancel(); FOOT.on = false; GS.hour = 12; GS.storm = 0; WX.at = () => 0; true`);
await ev(`TLX.setOn("traffic", false); true`);

// ---- A. the standing trailers are solid along their whole length
const L = await J(`TLXRIG.list()`);
for (const t of L) {
  const c = await J(`TLXRIG.circles("${t.id}")`), len = t.front + t.L + t.over;
  const us = c.map(o => o.u), gaps = us.slice(1).map((u, i) => us[i] - u), inGrid = await rigObs(t.x, t.z, 12);
  ok(c.length >= 5 && Math.abs(us[0] + c[0].r - t.front) < 0.3 && Math.abs(us[us.length - 1] - c[0].r + t.L + t.over) < 0.3 && Math.max(...gaps) <= 1.95 && inGrid === c.length,
    `${t.id}: ${c.length} circles (r ${c[0].r}) cover its ${len.toFixed(1)} m from nose to tail, no gap over ${Math.max(...gaps).toFixed(2)} m, all ${inGrid} in the obstacle grid`);
}
await beside("lb", 4, "FOOT"); await sleep(700);
{ await down("KeyW"); let mn = 99; const t0 = await clock(); while ((await clock()) - t0 < 5) { await sleep(150); const f = await J(`({ x: FOOT.x, z: FOOT.z })`), q = await rel("lb", f.x, f.z); mn = Math.min(mn, Math.abs(q.side)); if (mn < 1) break; }
  await sideCam(); await sleep(300); await still("s1_walker_side"); await camOff();
  await up("KeyW");
  ok(mn > 1.28 && mn < 2.2, `a walker held into the tanker's side for 5 s gets no nearer than ${mn.toFixed(2)} m to its centre line (the body is 1.28 m either side)`); }

// ---- B. the sled ridden at its side
await beside("lb", 13, "P", 7); await sleep(200);
{ await down("KeyW"); let mn = 99, vEnd = 0; const t0 = await clock(); while ((await clock()) - t0 < 3.2) { await sleep(120); const p = await spd(), q = await rel("lb", p.x, p.z); mn = Math.min(mn, Math.abs(q.side)); vEnd = p.v; }
  await up("KeyW");
  ok(mn > 2.0 && mn < 5, `the sled ridden at the tanker's side at 7 m/s is stopped ${mn.toFixed(2)} m from its centre line (never inside it)`); }
await ev(`crashCancel(); FOOT.on = false; P.vx = P.vz = 0; true`); await sleep(400);

// ---- C. the tractor: stopped by the side, let in under the front
await ev(`GS.cash = 12000; GS.lic.freight = true; TLXV.buy("tractor"); true`); await sleep(400);
const uid = await ev(`TLX.state("vehicles").owned[0].uid`);
await ev(`TLXV.swapTo("${uid}"); FOOT.on = false; FOOT.g.visible = false; true`); await sleep(600);
ok(await ev(`!!VEH.cur && TLX.state("vehicles").cur === "${uid}" && !FOOT.on`), "in the tractor");
await beside("kj", 11, "P", 3); await sleep(200);
{ await down("KeyW"); let mn = 99; const t0 = await clock(); while ((await clock()) - t0 < 4) { await sleep(120); const p = await spd(), q = await rel("kj", p.x, p.z); mn = Math.min(mn, Math.abs(q.side)); }
  await up("KeyW");
  ok(mn > 3.6 && mn < 6.5, `the tractor driven at the box trailer's side is stopped with its centre ${mn.toFixed(2)} m off the trailer's line (nose against the body)`); }
await ev(`P.vx = P.vz = 0; true`);
await place("kj", 1.6, 0.03); await waitGame(0.6); await clearToasts();
{ const t0 = await clock(); while ((await clock()) - t0 < 25) { if ((await tr("kj")).on) break; const v = (await spd()).vf; if (v > -1.0) { await down("KeyS"); await sleep(120); await up("KeyS"); } await sleep(120); } }
let t = await tr("kj");
ok(t.on === uid, "backing in along its line the tractor still runs under the trailer's front and couples");

// ---- D. the legs are still in reach
await atLegs("kj"); await sleep(900);
let s = await J(`({ use: footUse(), hint: $("wnHint").textContent, x: FOOT.x, z: FOOT.z })`);
ok(s.use === "LEGS UP", `on foot beside the solid trailer the legs are in reach: "${s.hint}"`);
await tap("KeyE"); await sleep(500);
t = await tr("kj"); ok(t.on === uid && t.legs === 0, "the use key winds the legs up");
await ev(`FOOT.on = false; FOOT.g.visible = false; P.vx = P.vz = 0; true`); await sleep(300);

// ---- E. on the road: the circles travel with the trailer, the tractor is not held by its own trailer
const road = await J(`(() => { let best = null; for (const rt of TLXR.routes) { if (!rt.cum || rt.closed) continue; const p = rt.pts, c = rt.cum;
    for (let i = 4; i < p.length - 4; i += 3) { if (Math.hypot(p[i][0] - depot.x, p[i][1] - depot.z) < TOWN_R + 150) continue; let j = i; while (j < p.length - 1 && c[j] - c[i] < 260) j++; if (c[j] - c[i] < 260) break;
      const L = c[j] - c[i], str = Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1]) / L; let gmax = 0, off = 0; for (let k = i; k < j; k++) { gmax = Math.max(gmax, Math.abs(groundAt(p[k + 1][0], p[k + 1][1]) - groundAt(p[k][0], p[k][1])) / Math.max(0.5, c[k + 1] - c[k]));
        const ux = (p[j][0] - p[i][0]) / (L * str), uz = (p[j][1] - p[i][1]) / (L * str), dx = p[k][0] - p[i][0], dz = p[k][1] - p[i][1]; off = Math.max(off, Math.abs(dx * uz - dz * ux)); }
      if (isWater(p[i][0], p[i][1])) continue; const sc = off + gmax * 60; if (!best || sc < best.sc) best = { sc, id: rt.id, s: c[i], x: p[i][0], z: p[i][1], x2: p[j][0], z2: p[j][1], L, off: +off.toFixed(2), gmax: +gmax.toFixed(3) }; } }
  return best; })()`);
console.log("road", JSON.stringify(road));
const rl = Math.hypot(road.x2 - road.x, road.z2 - road.z), ux = (road.x2 - road.x) / rl, uz = (road.z2 - road.z) / rl;
const toRoad = (along = 20) => ev(`(() => { TLXR.setPlowed && TLXR.setPlowed(null, 0); const x = ${road.x} + ${ux} * ${along}, z = ${road.z} + ${uz} * ${along}; P.x = x; P.z = z; P.yaw = Math.atan2(${ux}, ${uz}); P.vx = P.vz = P.vy = 0; BOG.on = false; BOG.acc = 0; FOOT.on = false; FOOT.g.visible = false; recenter(x, z, true); P.y = surf(x, z); camState.init = false; return 1; })()`);
await toRoad(60); await sleep(1300);
t = await tr("kj");
{ const home = await rigObs(L[0].x, L[0].z, 14), c = await J(`TLXRIG.circles("kj")`), here = await rigObs(t.x, t.z, 12);
  const q0 = await rel("kj", c[0].x, c[0].z), q1 = await rel("kj", c[c.length - 1].x, c[c.length - 1].z);
  ok(home === 0 && here === c.length && Math.abs(q0.side) < 0.02 && Math.abs(q1.side) < 0.02 && Math.abs(q1.along + t.L + t.over - c[0].r) < 0.3, `the circles went with the trailer: ${home} left in the lay-by, ${here} round it on the road, on its line`); }
{ const a = await spd(); await down("KeyW"); await waitGame(4); await up("KeyW"); const b = await spd();
  ok(Math.hypot(b.x - a.x, b.z - a.z) > 4 && b.v > 2.3, `the lorry pulls its own trailer away as before (${Math.hypot(b.x - a.x, b.z - a.z).toFixed(1)} m in 4 s, ${b.v} m/s)`); }
{ await down("KeyS"); for (let i = 0; i < 150; i++) { await sleep(100); if ((await spd()).vf < 0.3) break; } await up("KeyS"); }
await sleep(300); await ev(`P.vx = P.vz = 0; true`);

// ---- F. straight reversing over 20 m with small corrections
await toRoad(150); await sleep(1200);
await ev(`(() => { const s = TLX.state("rig").t.kj, f = TLXRIG.fifth("${uid}"), t = TLXRIG.list()[0], a = P.yaw + Math.PI + 4 * Math.PI / 180; s.x = f[0] + Math.sin(a) * t.L; s.z = f[1] + Math.cos(a) * t.L; return 1; })()`); await sleep(300);   // not dead straight: 4 deg off, as after any bend
{ const a = await tr("kj"); let amax = 0, n = 0, back = 0, nA = 0, nD = 0; const t0 = await clock();
  await down("KeyS");
  while ((await clock()) - t0 < 40) {
    const q = await tr("kj"), deg = q.art * 57.2958; amax = Math.max(amax, Math.abs(deg)); n++;
    back = -((q.x - a.x) * ux + (q.z - a.z) * uz); if (back >= 20) break;
    if (Math.abs(deg) > 0.8) { const k = deg > 0 ? "KeyD" : "KeyA"; if (deg > 0) nD++; else nA++; await down(k); await sleep(Math.min(160, 50 + Math.abs(deg) * 25)); await up(k); }
    await sleep(60);
  }
  await up("KeyS");
  const b = await tr("kj"), dt = (await clock()) - t0, yawCh = Math.abs(Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw))) * 57.2958, side = Math.abs((b.x - a.x) * uz - (b.z - a.z) * ux);
  console.log("reverse", JSON.stringify({ back: +back.toFixed(1), amax: +amax.toFixed(1), n, nA, nD, dt: +dt.toFixed(1), yawCh: +yawCh.toFixed(1), side: +side.toFixed(2), jk: b.jk }));
  ok(back >= 20 && amax < 15 && yawCh < 15 && side < 3.2, `backing up straight: ${back.toFixed(1)} m in ${dt.toFixed(0)} s with ${nA + nD} taps of steering, the articulation never past ${amax.toFixed(1)} deg, the trailer ${side.toFixed(1)} m off its line and ${yawCh.toFixed(1)} deg off its heading at the end`); }
{ await down("KeyW"); await sleep(500); await up("KeyW"); } await sleep(400); await ev(`P.vx = P.vz = 0; true`);

// ---- G. jackknife (on a wide plowed pad: bent 50 deg the trailer's axles are 5.6 m off the road's line, in the deep snow)
await toRoad(100); await sleep(1200);
await ev(`(() => { const cx = P.x, cz = P.z, R = 26, d = 0.04; for (let ix = Math.floor((cx - R + HALF) / CELL); ix <= Math.ceil((cx + R + HALF) / CELL); ix++) for (let iz = Math.floor((cz - R + HALF) / CELL); iz <= Math.ceil((cz + R + HALF) / CELL); iz++) { const c = getChunk(ix >> 5, iz >> 5), k = (iz & 31) * CH + (ix & 31), d0 = c.d[k]; c.f[k] = d; c.d[k] = d; writeCell(ix, iz, d0, d, d); } recenter(P.x, P.z, true); return 1; })()`); await sleep(500);
await ev(`(() => { const s = TLX.state("rig").t.kj, f = TLXRIG.fifth("${uid}"), t = TLXRIG.list()[0], a = P.yaw + Math.PI + 50 * Math.PI / 180; s.x = f[0] + Math.sin(a) * t.L; s.z = f[1] + Math.cos(a) * t.L; return 1; })()`); await sleep(400);
t = await tr("kj");
ok(Math.abs(Math.abs(t.art) * 57.2958 - 50) < 1.5, `set up: the rig bent ${(t.art * 57.2958).toFixed(1)} deg`);
await clearToasts();
{ await down("KeyS"); let hit = null, amax = 0; const t0 = await clock();
  while ((await clock()) - t0 < 14) { await sleep(120); const q = await tr("kj"); amax = Math.max(amax, Math.abs(q.art) * 57.2958); if (q.jk) { hit = await spd(); break; } }
  ok(!!hit, `backing up bent, the trailer swings on until it jackknifes (${amax.toFixed(1)} deg)`);
  if (hit) {
    let mv = 0, vb = 0; const t1 = await clock();
    while ((await clock()) - t1 < 2.5) { await sleep(150); const p = await spd(), q = await tr("kj"); mv = Math.max(mv, Math.hypot(p.x - hit.x, p.z - hit.z)); vb = Math.min(vb, p.vf); amax = Math.max(amax, Math.abs(q.art) * 57.2958); }
    const ts = await toasts(), msg = ts.find(x => /Jackknifed/.test(x)) || "";
    await vcam(1.5708, 13, 17, 1.0, 4); await still("s2_jackknife_above"); await vcam(2.6, 14, 4, 1.4, 4); await still("s3_jackknife_rear34"); await camOff();
    ok(mv < 0.25 && amax <= 60.1 && amax > 59, `the tractor is held: ${mv.toFixed(2)} m more in 2.5 s of reverse held, the articulation stops at ${amax.toFixed(1)} deg`);
    ok(/Pull forward/.test(msg) && !ts.some(x => /find grip|Something solid/.test(x)), `and it says so, once, with no second guess from the lorry: "${msg}"${ts.length > 1 ? " (+ " + ts.filter(x => x !== msg).join(" | ") + ")" : ""}`);
  }
  await up("KeyS"); }
{ const a = await spd(), a0 = Math.abs((await tr("kj")).art) * 57.2958; await down("KeyW"); await waitGame(4.5); await up("KeyW"); const b = await spd(), q = await tr("kj"), a1 = Math.abs(q.art) * 57.2958;
  ok(Math.hypot(b.x - a.x, b.z - a.z) > 2 && a1 < a0 - 8 && !q.jk, `pulling forward frees it: ${Math.hypot(b.x - a.x, b.z - a.z).toFixed(1)} m in 4.5 s, the trailer straightening from ${a0.toFixed(0)} to ${a1.toFixed(0)} deg`); }
{ await down("KeyS"); for (let i = 0; i < 100; i++) { await sleep(100); if ((await spd()).vf < 0.3) break; } await up("KeyS"); }
await sleep(300); await ev(`P.vx = P.vz = 0; true`);

// ---- H. a driver coming up behind the rig stops behind the trailer's tail
await toRoad(100); await sleep(600);
await ev(`(() => { const s = TLX.state("rig").t.kj, f = TLXRIG.fifth("${uid}"), t = TLXRIG.list()[0], a = P.yaw + Math.PI; s.x = f[0] + Math.sin(a) * t.L; s.z = f[1] + Math.cos(a) * t.L; return 1; })()`); await sleep(600);
await ev(`(() => { TLX.setOn("traffic", true); return 1; })()`); await sleep(600);
{ const ready = await ev(`TLXT.ready && TLXT.cars.length > 0 && !!TLXT.routes.find(r => r.id === "${road.id}")`);
  ok(ready, "traffic is on with the test road among its routes");
  if (ready) {
    await ev(`(() => { const c = TLXT.place("${road.id}", ${road.s} + 100 - 11.1 - 75, 1); window.__c = c; return 1; })()`);
    let mn = 99, stopA = null, vmax = 0; const t0 = await clock();
    while ((await clock()) - t0 < 22) {
      await sleep(150);
      const q = await J(`(() => { const c = window.__c, t = TLXRIG.list()[0], tx = Math.sin(t.yaw), tz = Math.cos(t.yaw), ex = c.x - t.kx, ez = c.z - t.kz, al = ex * tx + ez * tz, sd = ex * tz - ez * tx, lo = -(t.L + t.over), hi = t.front, ca = Math.max(lo, Math.min(hi, al));
        return { on: c.on, v: c.v, why: c.why, al, sd, d: Math.hypot(al - ca, sd), tail: lo - al }; })()`);
      if (!q.on) break; mn = Math.min(mn, q.d); vmax = Math.max(vmax, q.v);
      if (q.v < 0.2 && vmax > 3 && q.tail > 0 && stopA === null) { stopA = q.tail; console.log("car stopped", JSON.stringify(q)); break; }
    }
    ok(vmax > 3 && stopA !== null && stopA > 2.5 && stopA < 14 && mn > 2.2, `a car coming up behind the standing rig at ${vmax.toFixed(1)} m/s stops ${stopA === null ? "nowhere" : stopA.toFixed(1) + " m"} behind the trailer's tail (nearest it ever was to the body's centre line: ${mn.toFixed(1)} m)`);
  }
}
await ev(`TLX.setOn("traffic", false); true`);

// ---- I. reload: solid where it stands
await ev(`save(); true`); await sleep(300);
const sv = await tr("kj");
await reload(); await sleep(700);
await ev(`tutSkip(); GS.storm = 0; WX.at = () => 0; TLX.setOn("traffic", false); true`);
t = await tr("kj");
{ const here = await rigObs(t.x, t.z, 12), n = (await J(`TLXRIG.circles("kj")`)).length, home = await rigObs(L[0].x, L[0].z, 14);
  ok(t.on === uid && Math.hypot(t.x - sv.x, t.z - sv.z) < 0.3 && here === n && home === 0, `after a reload the coupled trailer is solid where it stands (${here} circles there, ${home} in its old lay-by)`); }
ok(!(await ev("TLXRIG.err")), "no rig errors: " + (await ev("TLXRIG.err")));

console.log(fails ? `${fails} FAILED` : "all passed");
await done(fails ? 1 : 0);
