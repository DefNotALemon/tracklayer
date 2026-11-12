// Beta 3.4b2a round 2 (loose ends of 0164): A. walk in and out of a house door by keys at night (is the world drawn after?),
// B. low graphics preset (settings gfx=low, reload): beams/pool/hum at night, C. two cars driving: the hum follows the loudest.
import { boot, ev, sleep, done, shot, reload, down, up } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 24 + 22; if (!audio) initAudio(); if (audio && audio.AC.state === "suspended") audio.AC.resume(); true`); await sleep(1000);

// A. real door walk, night
const b = await J(`(() => { const b = INT.beacons[0]; return { x: b.x, z: b.z, ry: b.ry }; })()`);
await ev(`(() => { const b = INT.beacons[0]; const fx = Math.sin(b.ry), fz = Math.cos(b.ry); FOOT.on = true; FOOT.x = b.x + fx * 7; FOOT.z = b.z + fz * 7; FOOT.y = surf(FOOT.x, FOOT.z); FOOT.yaw = Math.atan2(-fx, -fz); recenter(FOOT.x, FOOT.z, true); return true; })()`); await sleep(800);
await down("KeyW"); let t = 0; while (t < 80 && !(await J(`INT.on`))) { await sleep(150); t++; } await up("KeyW");
const inside = await J(`INT.on`); ok(inside, "A: walked into the door by keys (" + t + " polls)");
await sleep(1500);
// walk to the way-out ring: aim the on-screen walker at it with held keys (W forward, A/D turn) until INT leaves
const ex = await J(`({ ex: INT.room.exit.x, ez: INT.room.exit.z, px: INT.px, pz: INT.pz, yaw: INT.yaw ?? null })`); console.log("room", JSON.stringify(ex));
let left = false;
// the room steers like the street: A/D turn, W walks the way you face. You come in facing away from the door, so turn round
for (let i = 0; i < 90 && (await J(`INT.on`)); i++) {
  const g = await J(`(() => { const dx = INT.room.exit.x - INT.px, dz = INT.room.exit.z - INT.pz; let e = Math.atan2(dx, dz) - FOOT.yaw; e = Math.atan2(Math.sin(e), Math.cos(e)); return { e, d: Math.hypot(dx, dz) }; })()`);
  if (Math.abs(g.e) > 0.25) { const k = g.e > 0 ? "KeyA" : "KeyD"; await down(k); await sleep(Math.min(300, 80 + Math.abs(g.e) * 150)); await up(k); await sleep(120); }
  else { await down("KeyW"); await sleep(250); await up("KeyW"); await sleep(100); }
}
t = 0;
left = !(await J(`INT.on`)); console.log("turn+walk out polls", t, JSON.stringify(await J(`({ px: +INT.px.toFixed(2), pz: +INT.pz.toFixed(2), yaw: +FOOT.yaw.toFixed(2), on: INT.on })`)));
ok(left, "A: the way-out ring lets you out by keys");
await sleep(2500); await shot("r2_door_out");
const fr = await J(`(() => { const c = camera.position; return { fin: isFinite(c.x + c.y + c.z), q: isFinite(camera.quaternion.x + camera.quaternion.w), fog: !!scene.fog, int: INT.on, foot: FOOT.on }; })()`);
ok(fr.fin && fr.q && !fr.int, "A: after walking out the camera is finite " + JSON.stringify(fr));

// B. low preset
const sv = await J(`(() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })()`); sv.hour = 24 + 22;
await ev(`save = function () { }; localStorage.setItem("tracklayer.set.v1", JSON.stringify(Object.assign(JSON.parse(localStorage.getItem("tracklayer.set.v1") || "{}"), { gfx: "low" }))); true`);
await reload(sv); await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 24 + 22; true`); await sleep(1500);
const low = await J(`({ low: GFX.low, pick: GFX.pick })`); ok(low.low === true, "B: the low preset is active " + JSON.stringify(low));
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const s0 = await J(`TLXT.routes.find(q => q.id === "${rid}").s0 + 900`);
await ev(`(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${rid}", ${s0}, 1); P.x = p.cx + 15; P.z = p.cz + 15; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); TLXT.hold = true; const c = TLXT.place("${rid}", ${s0}, 1); c.v = 0; c.hold = 1e9; return true; })()`); await sleep(1500);
const lo = await J(`({ k: TLXT.beamK[0], vis: TLXT.beams.visible, pv: TLXT.pool.visible, n: TLXT.beams.count, err: TLXT.tickErr || null, calls: renderer.info.render.calls })`);
ok(lo.vis && lo.k > 0.5 && !lo.err, "B: low preset night: beams on " + JSON.stringify(lo));
await ev(`(() => { const c = TLXT.cars[0]; c.hold = 0; c.v = 10; return true; })()`); await sleep(1200);
const lh = await J(`({ g: TLXT.humGain, car: TLXT.humCar })`); ok(lh.g > 0.01, "B: low preset hum " + JSON.stringify(lh));
await shot("r2_low_night");

// C. two moving cars: the hum is the nearest/loudest one while both drive past
await ev(`(() => { TLXT.hold = true; const a = TLXT.cars[0]; const c0 = TLXT.place("${rid}", ${s0} + 70, -1); Object.assign(a, { v: 12, hold: 0 }); const c2 = TLXT.cars[1]; Object.assign(c2, { on: true, r: c0.r, s: c0.s - 160, k: 0, dir: 1, v: 12, st: "drive", t: 0, blocked: 0, hold: 0, why: "" }); return true; })()`);
let bad = 0, samples = 0; console.log("C start", JSON.stringify(await J(`TLXT.cars.map(c => ({ i: c.i, on: c.on, d: +Math.hypot(c.x - P.x, c.z - P.z).toFixed(0), v: c.v }))`)));
for (let i = 0; i < 24; i++) { await sleep(500);
  const r = await J(`(() => { const cs = TLXT.cars.filter(c => c.on).map(c => ({ i: c.i, d: Math.hypot(c.x - P.x, c.z - P.z) })).sort((a, b) => a.d - b.d); return { cs, car: TLXT.humCar, g: TLXT.humGain, err: TLXT.tickErr || null }; })()`);
  if (r.cs.length && r.cs[0].d < 140) { samples++; if (r.car !== r.cs[0].i && r.cs.length > 1 && r.cs[1].d - r.cs[0].d > 25) bad++; }
  if (r.err) { bad++; console.log("err", r.err); }
}
ok(samples > 4 && bad === 0, "C: hum voice = nearest car over " + samples + " samples (" + bad + " disagreements)");
console.log("page errors check via done()");
console.log(fails ? `x3_beams_round2: ${fails} FAILED` : "x3_beams_round2: all ok");
await done(fails ? 1 : 0);
