// Kjøllefjord's streets as roads (v238): no picket fences left, an asphalt ribbon + curbs on the streets, curb gaps at spurs,
// the sled still drives the streets and crosses into a house spur. Run: tools/playtest/run.sh tools/playtest/scenarios/x_townroads.mjs [outdir]
// NOSTILLS=1 skips the stills.
import { boot, ev, shot, done, sleep, hold, down, up, sideCam, camOff } from "../lib.mjs";
await boot();
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
await ev("GS.hour = 12; WX.at = () => 0; GS.storm = 0; tutSkip(); FOOT.on = false; VEH.cur = null; crashCancel(); true");
await sleep(800);

// ---- 1. fences gone: no fence obstacles along the lot lines, no fence-coloured merged mesh in the scene
const f = JSON.parse(await ev(`(() => {
  const d = depot, G = TOWNG, out = { fenceObs: 0, fenceMeshes: 0, road: !!G.road };
  for (const o of obGrid.values()) for (const b of o) if (Math.abs(b.r - 0.5) < 1e-6 && b.top < 1e8 && Math.hypot(b.x - d.x, b.z - d.z) < 130 && Math.abs(b.top - groundAt(b.x, b.z) - 1.1) < 0.01) out.fenceObs++;
  scene.traverse(m => { if (m.isMesh && m.material && m.material.color && m.material.color.getHex() === 0xd9d3c5 && m.parent === scene) out.fenceMeshes++; });
  return JSON.stringify(out); })()`));
ok(f.fenceObs === 0, "no fence colliders (r 0.5, top ground+1.1) near town: " + f.fenceObs);
ok(f.fenceMeshes === 0, "no fence mesh (0xd9d3c5) on the scene root: " + f.fenceMeshes);

// ---- 2. road mesh exists, spans the streets, curbs have gaps at spurs and junctions
const r = JSON.parse(await ev(`(() => {
  const d = depot, G = TOWNG, R = G.road; if (!R) return JSON.stringify({ none: true });
  const meshes = R.meshes.map(m => ({ k: m.userData.townRoad || "other", tris: m.geometry.index.count / 3, vis: m.visible, bb: (m.geometry.computeBoundingBox(), m.geometry.boundingBox) }));
  const a = meshes.find(m => m.k === "asphalt").bb, nonSea = [];
  // bounds relative to the depot vs TOWNG extents
  const out = { segs: R.segs.length, junctions: R.junctions.length, curbPieces: R.curbPieces, gaps: R.gaps, lines: R.lines,
    asphalt: [a.min.x - d.x, a.max.x - d.x, a.min.z - d.z, a.max.z - d.z].map(v => +v.toFixed(1)), meshes: meshes.map(m => [m.k, m.tris, m.vis]),
    draws: R.meshes.length };
  // every street centre-line sample lies under asphalt (on a ribbon seg or a junction square)
  let miss = 0, tot = 0;
  for (const [ax, az, bx, bz] of G.lines) { const L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / 2);
    for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; if (isSea(x, z)) continue; tot++;
      const onSeg = R.segs.some(s => { const ux = s.b[0] - s.a[0], uz = s.b[1] - s.a[1], uu = ux * ux + uz * uz, t = clamp(((x - s.a[0]) * ux + (z - s.a[1]) * uz) / uu, 0, 1); return Math.hypot(x - s.a[0] - ux * t, z - s.a[1] - uz * t) < s.hw + 0.05; })
        || R.junctions.some(j => Math.abs(x - j[0]) <= G.HW + 0.05 && Math.abs(z - j[1]) <= G.HW + 0.05); if (!onSeg) miss++; } }
  out.miss = miss; out.tot = tot;
  // asphalt sits on the snow: ribbon vertices vs surf along the depot street
  const pos = R.meshes[0].geometry.attributes.position; let lo = 9, hi = -9;
  for (let i = 0; i < pos.count; i += 7) { const dy = pos.getY(i) - surf(pos.getX(i), pos.getZ(i)); lo = Math.min(lo, dy); hi = Math.max(hi, dy); }
  out.lift = [+lo.toFixed(3), +hi.toFixed(3)];
  return JSON.stringify(out); })()`));
console.log("road", JSON.stringify(r));
ok(!r.none, "TOWNG.road exists");
ok(r.lines === 7 && r.junctions >= 10, `7 street lines, junction squares: ${r.junctions}`);
ok(r.miss === 0, `every street centre-line sample is under asphalt (${r.miss}/${r.tot} missing)`);
ok(r.curbPieces > 300 && r.gaps > 20, `curbs laid (${r.curbPieces}) with gaps at spurs/yards (${r.gaps})`);
ok(r.draws <= 4, `merged: ${r.draws} meshes`);
ok(r.lift[0] > 0 && r.lift[1] < 0.12, `ribbon rides just above surf: ${r.lift}`);
// curb gap at each house spur: no curb piece sits on a spur's mouth, but curbs exist right beside it
const g = JSON.parse(await ev(`(() => {
  const d = depot, R = TOWNG.road, pos = R.meshes.find(m => m.userData.townRoad === "curb").geometry.attributes.position, pts = [];
  for (let i = 0; i < pos.count; i += 8) pts.push([pos.getX(i), pos.getZ(i)]);
  const spurs = YARDS.filter(Y => Y.r <= 2.2 && Y.r >= 1.4 && Math.hypot(Y.x - d.x, Y.z - d.z) < 108 && Math.abs(Y.x2 - Y.x) < 0.01 && Y.z2 !== Y.z);
  let withCurbNear = 0, blocked = 0; const n = spurs.length;
  for (const Y of spurs) {                                               // the spur's street end is (x2, z2); a street is at G.Z lines
    const sx = Y.x2, sz = Y.z2, sd = Math.sign(Y.z - Y.z2);
    const on = pts.some(([x, z]) => Math.abs(x - sx) < 1.0 && Math.abs(z - (sz + sd * (TOWNG.HW + 0.13))) < 0.5);
    const beside = pts.some(([x, z]) => Math.abs(x - sx) > 2 && Math.abs(x - sx) < 6 && Math.abs(z - (sz + sd * (TOWNG.HW + 0.13))) < 0.5);
    if (on) blocked++; if (beside) withCurbNear++;
  }
  return JSON.stringify({ n, blocked, withCurbNear }); })()`));
console.log("spurs", JSON.stringify(g));
ok(g.n > 8 && g.blocked === 0, `curb open at all ${g.n} house spurs (blocked ${g.blocked})`);
ok(g.withCurbNear > g.n * 0.6, `curb present beside spurs: ${g.withCurbNear}/${g.n}`);

// ---- 3. no colliders for curbs: the obstacle count along a street edge didn't grow (no addOb with a curb signature)
// ---- 4. the sled drives a street and crosses into a house spur
const drive = async (name, x0, z0, yaw, secs) => {
  await ev(`(() => { crashCancel(); FOOT.on = false; VEH.cur = null; P.x = ${x0}; P.z = ${z0}; P.yaw = ${yaw}; P.vx = P.vz = P.vy = 0; recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.2; return true; })()`);
  await sleep(1200);
  const a = JSON.parse(await ev("JSON.stringify({ x: P.x, z: P.z, t: gameClock })"));
  await hold("KeyW", secs * 1000);
  const b = JSON.parse(await ev("JSON.stringify({ x: P.x, z: P.z, t: gameClock, v: Math.hypot(P.vx, P.vz) })"));
  const dist = Math.hypot(b.x - a.x, b.z - a.z), dt = b.t - a.t;
  console.log(name, JSON.stringify({ dist: +dist.toFixed(1), dt: +dt.toFixed(2), v: +b.v.toFixed(1), avg: +(dist / dt).toFixed(1) }));
  return { dist, dt, v: b.v, avg: dist / dt, a, b };
};
// along Kaigata (z = 12, E-W), heading east (yaw pi/2 in this game: +x)
const d = JSON.parse(await ev("JSON.stringify({ x: depot.x, z: depot.z })"));
const s1 = await drive("kaigata", d.x - 30, d.z + 12, 1.5708, 6);
ok(s1.avg > 4 && Math.abs(s1.b.z - (d.z + 12)) < 6, `sled drives along Kaigata at ${s1.avg.toFixed(1)} m/s`);
const s2 = await drive("depot street (x=2)", d.x + 2, d.z - 30, 0, 6);
ok(s2.avg > 4, `sled drives the depot street at ${s2.avg.toFixed(1)} m/s`);
// into a spur: from a street point opposite a spur, drive straight into the yard (no stop at the curb gap)
const sp = JSON.parse(await ev(`(() => { const d = depot; for (const Y of YARDS) if (Y.r >= 1.4 && Y.r <= 1.6 && Math.abs(Y.x2 - Y.x) < 0.01 && Math.abs(Y.z - Y.z2) > 1 && Math.abs(Y.z - Y.z2) < 3 && Math.hypot(Y.x - d.x, Y.z - d.z) < 100 && Math.abs(Y.z2 - d.z - 12) < 0.1 && Math.abs(Y.x - d.x - 25) < 1) return JSON.stringify({ sx: Y.x2, sz: Y.z2, hx: Y.x, hz: Y.z }); return "null"; })()`));
if (sp) {
  // ride from 6 m up the street straight over the curb line into the spur: it must keep its speed (the curb is not a wall)
  const dir = Math.sign(sp.hz - sp.sz), yaw = dir > 0 ? 0 : Math.PI;
  await ev(`(() => { crashCancel(); FOOT.on = false; VEH.cur = null; P.x = ${sp.sx}; P.z = ${sp.sz - dir * 10}; P.yaw = ${yaw}; P.vx = P.vz = P.vy = 0; recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.2; return true; })()`);
  await sleep(1000);
  await down("KeyW");
  let vBefore = null, vAt = null, maxInto = 0;
  for (let i = 0; i < 60; i++) {                                         // poll the ride: speed on the approach vs the first sample past the curb line (2.55 m)
    await sleep(40);
    const s = JSON.parse(await ev("JSON.stringify({ x: P.x, z: P.z, v: Math.hypot(P.vx, P.vz) })")), into = (s.z - sp.sz) * dir;
    maxInto = Math.max(maxInto, into);
    if (into < -2.6 && into > -8) vBefore = s.v;
    if (into > 1.5) { vAt = s.v; break; }
  }
  await up("KeyW");
  console.log("spur ride", JSON.stringify({ maxInto: +maxInto.toFixed(1), vBefore, vAt }));
  ok(vBefore !== null && vAt !== null && vAt >= vBefore * 0.9, `sled crossed the curb line into the spur without slowing (${vBefore && vBefore.toFixed(1)} -> ${vAt && vAt.toFixed(1)} m/s)`);
} else ok(false, "found a house spur off Kaigata");
// the same ride over a curb with NO gap would also not stop it (curbs have no collider): ride across mid-block onto the snow
{
  const gz = d.z + 12;
  await ev(`(() => { crashCancel(); FOOT.on = false; VEH.cur = null; P.x = ${d.x + 17}; P.z = ${gz - 5}; P.yaw = Math.PI; P.vx = P.vz = P.vy = 0; recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.2; return true; })()`);
  await sleep(800); await hold("KeyW", 600);
  const z1 = +(await ev("P.z")), n = JSON.parse(await ev("JSON.stringify({ v: Math.hypot(P.vx, P.vz), crash: !!CRASH.on })"));
  ok(gz - z1 > 3 && !n.crash, `a curb is no wall: sled rolled ${(gz - z1 + 5).toFixed(1)} m off the street edge across the curb line unstopped (v ${n.v.toFixed(1)})`);
}

// ---- stills
if (!process.env.NOSTILLS) {
  const cam = (tx, tz, back, up, yaw) => ev(`window.camOv = c => { const T = [${tx}, surf(${tx}, ${tz}), ${tz}]; c.position.set(T[0] + Math.sin(${yaw}) * ${back}, T[1] + ${up}, T[2] + Math.cos(${yaw}) * ${back}); c.lookAt(T[0], T[1] + 0.3, T[2]); c.updateMatrixWorld(); }; true`);
  await sideCam();
  const place = (x, z, yaw) => ev(`(() => { crashCancel(); FOOT.on = false; VEH.cur = null; P.x = ${x}; P.z = ${z}; P.yaw = ${yaw}; P.vx = P.vz = 0; recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.2; camState.init = false; window.camOv = null; return true; })()`);
  await place(d.x + 2, d.z - 6, 0); await sleep(2500); await shot("01_ride_noon");
  await place(d.x + 2, d.z + 30, 0); await sleep(2000); await shot("02_ride_noon_b");
  await ev("GS.hour = 22.5; true"); await sleep(2500); await shot("03_ride_night");
  await ev("GS.hour = 12; true");
  await ev(`(() => { crashCancel(); FOOT.on = true; FOOT.x = depot.x + 2; FOOT.z = depot.z + 22; FOOT.yaw = 0; recenter(FOOT.x, FOOT.z, true); FOOT.y = surf(FOOT.x, FOOT.z) + 0.1; camState.init = false; return true; })()`);
  await sleep(2500); await shot("04_foot_noon");
  await ev("FOOT.on = false; true");
  await cam(d.x + 2, d.z + 12, 30, 24, 3.1416); await sleep(1500); await shot("05_junction_noon_38deg");
  await cam(d.x + 2, d.z + 12, 22, 14, 0.8); await sleep(800); await shot("06_junction_low");
  await cam(d.x + 2, d.z + 12, 90, 70, 3.1416); await sleep(1200); await shot("07_far_overview");
  await ev("GS.hour = 22.5; true"); await cam(d.x + 2, d.z + 12, 30, 24, 3.1416); await sleep(1500); await shot("08_junction_night");
  await camOff();
}
await done(fails ? 1 : 0);
