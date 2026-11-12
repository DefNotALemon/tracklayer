// Slice 3.4b2a (G4): the drivers' headlight beams at night and the hum of a car going by. Asserts, exit 1 on a failure.
//  A. by day: the beam mesh is hidden and every car's beam brightness is 0.
//  B. at night: beams on (one instance per car on the road), the near car's brightness > 0.5, and a frame rendered from
//     behind the car is clearly brighter on the road ahead of it with the beams than without (luma of the pool box),
//     while the sky above barely changes.
//  C. a car 700 m from the camera: beam brightness 0 (additive light doesn't glow through the fog far away).
//  D. option "traffic" off: the whole group (beams too) is hidden.
//  E. the hum: a car driving 20 m away is heard (gain > 0.03, pitch 32 + 4.4 v Hz, the audio node follows); at 200 m
//     it isn't (gain 0); turning the option off fades the voice to silence within a second (watchdog).
//  F. a planted pre-3.4b2a save loads with traffic ready; no tick error; traffic draw calls <= 6 + 1.
import { boot, ev, sleep, done, shot, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const NOSTILLS = !!process.env.NOSTILLS;

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 36; true`); await sleep(1000);
const base = await J(`(() => ({ ready: TLXT.ready, err: TLXT.err, beams: !!TLXT.beams }))()`);
ok(base.ready && !base.err && base.beams, "traffic ready with a beam mesh (" + JSON.stringify(base) + ")");

// a straight on the longest road
const spot = await J(`(() => { const rs = TLXT.routes.slice().sort((a, b) => b.len - a.len);
  for (const r of rs) { for (let s = r.s0 + 200; s < r.s1 - 400; s += 20) { let good = true; for (let u = s; u < s + 120; u += 5) { let k = 0; while (k < r.cum.length - 2 && r.cum[k + 1] <= u) k++; if (r.vP[k] < 12.4 || r.vM[k] < 12.4 || r.street[k]) { good = false; break; } } if (good) return { id: r.id, s }; } }
  return null; })()`);
ok(!!spot, "found a straight " + JSON.stringify(spot));
const RID = spot.id, S0 = spot.s;
// park you 25 m off the road beside the car's spot, car 0 stopped there (the rest hidden)
const setup = (ds, hour) => ev(`(() => { crashCancel(); FOOT.on = false; GS.hour = ${hour}; const p = TLXT.lanePt("${RID}", ${S0}, 1); P.x = p.cx + 18; P.z = p.cz + 18; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true);
  const c = TLXT.place("${RID}", ${S0} + ${ds}, 1); c.v = 0; TLXT.TRAF.passWait = 1e9; TLXT.hold = true; c.hold = 1e9; return true; })()`);

// A. day
await setup(0, 36); await sleep(1500);
const day = await J(`(() => ({ df: dayFactor(), vis: TLXT.beams.visible, k: TLXT.beamK }))()`);
ok(day.df > 0.6 && !day.vis && day.k.every(k => k === 0), "day: beams hidden, brightness 0 (" + JSON.stringify(day) + ")");

// B. night + luma A/B from behind the car
let nightH = 46; for (let h = 40; h < 52; h++) { const df = await ev(`(() => { const o = GS.hour; GS.hour = ${h}; const d = dayFactor(); GS.hour = o; return d; })()`); if (df < 0.02) { nightH = h; break; } }
await setup(0, nightH); await sleep(1500);
const nt = await J(`(() => ({ df: dayFactor(), vis: TLXT.beams.visible, n: TLXT.beams.count, on: TLXT.cars.filter(c => c.on).length, k: TLXT.beamK }))()`);
ok(nt.vis && nt.n === nt.on && nt.k[0] > 0.5, "night: beams on, one per car, near car " + nt.k[0] + " (" + JSON.stringify(nt) + ")");
const luma = await J(`(() => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), cam = camera.clone();
  const rx = -fz, rz = fx; cam.position.set(c.x + fx * 11 + rx * 9, c.y + 7, c.z + fz * 11 + rz * 9); cam.lookAt(c.x + fx * 11, c.y, c.z + fz * 11); cam.updateMatrixWorld(); cam.aspect = 16 / 9; cam.updateProjectionMatrix();
  const W = 320, H = 180, rt = new THREE.WebGLRenderTarget(W, H), buf = new Uint8Array(W * H * 4);
  const meas = () => { renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf); renderer.setRenderTarget(null);
    const box = (x0, x1, y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const o = (y * W + x) * 4; s += 0.2126 * buf[o] + 0.7152 * buf[o + 1] + 0.0722 * buf[o + 2]; n++; } return s / n; };
    return { road: +box(130, 190, 65, 115).toFixed(2), sky: +box(0, 320, 160, 180).toFixed(2) }; };   // GL rows from the bottom
  const on = meas(); const I = TLXT.TRAF.beamI; TLXT.TRAF.beamI = 0; TLXT.cars[0].hold = 1e9; const d = window.__tl ? 0 : 0; 
  // redraw the instance colours with 0 brightness
  TLXT.beams.visible = false; TLXT.pool.visible = false; const off = meas(); TLXT.TRAF.beamI = I; TLXT.beams.visible = true; TLXT.pool.visible = true; rt.dispose();
  return { on, off }; })()`);
ok(luma.on.road - luma.off.road > 6 && Math.abs(luma.on.sky - luma.off.sky) < 3, "night: road ahead of the car brighter with beams " + JSON.stringify(luma));

// C. far car
await ev(`(() => { const c = TLXT.place("${RID}", ${S0}, 1); const p = TLXT.lanePt("${RID}", ${S0}, 1); P.x = p.cx + 500; P.z = p.cz + 500; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true); return true; })()`);
await sleep(1200);
const far = await J(`(() => { const c = TLXT.cars[0]; return { d: Math.round(Math.hypot(c.x - camera.position.x, c.z - camera.position.z)), k: TLXT.beamK[0] }; })()`);
ok(far.d > 600 && far.k === 0, "far car: no beam (" + JSON.stringify(far) + ")");

// D. option off
await ev(`TLX.setOn("traffic", false); true`); await sleep(400);
const off = await J(`(() => ({ g: TLXT.group.visible }))()`);
ok(!off.g, "option off hides the cars and beams");
await ev(`TLX.setOn("traffic", true); true`);

// stills: night from behind + from the side and the oncoming view
if (!NOSTILLS) {
  await setup(0, nightH); await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`);
  for (const [nm, b, sd, h, la] of [["behind", -8, 0, 3, 14], ["side", 6, 9, 1.6, 8], ["oncoming", 26, -1.5, 1.5, 0]]) {
    await ev(`window.camOv = cam => { const c = TLXT.cars[0], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx; cam.position.set(c.x + fx * ${b} + rx * ${sd}, c.y + ${h}, c.z + fz * ${b} + rz * ${sd}); cam.lookAt(c.x + fx * ${la}, c.y + 0.5, c.z + fz * ${la}); }; true`);
    await sleep(700); await shot("x3b_night_" + nm);
  }
  await ev(`window.camOv = null; true`);
}

// E. hum
await ev(`if (!audio) initAudio(); if (audio && audio.AC.state === "suspended") audio.AC.resume(); true`);
await setup(-40, 36);
await ev(`(() => { const c = TLXT.cars[0]; c.hold = 0; c.blocked = 0; c.v = 10; const p = TLXT.lanePt("${RID}", ${S0}, 1); P.x = p.cx + 14; P.z = p.cz + 14; P.y = surf(P.x, P.z) + 0.3; return true; })()`);
let best = null;
for (let i = 0; i < 30; i++) { await sleep(300); const h = await J(`(() => { const c = TLXT.cars[0], d = Math.hypot(c.x - P.x, c.z - P.z); return { d: +d.toFixed(1), v: +c.v.toFixed(2), g: TLXT.humGain, f: TLXT.humF, car: TLXT.humCar, node: TLXT.hum ? +TLXT.hum.g.gain.value.toFixed(4) : null, nf: TLXT.hum ? +TLXT.hum.o.frequency.value.toFixed(1) : null }; })()`); if (h.d < 25 && (!best || h.d < best.d)) best = h; }
ok(best && best.g > 0.03 && best.car === 0 && Math.abs(best.f - (32 + 4.4 * best.v)) < 0.6 && best.node > 0.01, "car going by ~20 m away is heard " + JSON.stringify(best));
await ev(`(() => { const p = TLXT.lanePt("${RID}", ${S0}, 1); P.x = p.cx + 150; P.z = p.cz + 150; P.y = surf(P.x, P.z) + 0.3; TLXT.place("${RID}", ${S0}, 1).hold = 1e9; return true; })()`);
await sleep(800);
const farH = await J(`(() => ({ g: TLXT.humGain, d: Math.round(Math.hypot(TLXT.cars[0].x - P.x, TLXT.cars[0].z - P.z)) }))()`);
ok(farH.g === 0 && farH.d > 150, "car 200 m off is silent " + JSON.stringify(farH));
await ev(`(() => { const p = TLXT.lanePt("${RID}", ${S0}, 1); P.x = p.cx + 10; P.z = p.cz + 10; P.y = surf(P.x, P.z) + 0.3; const c = TLXT.place("${RID}", ${S0} - 30, 1); c.hold = 0; return true; })()`);
await sleep(1500);
const pre = await J(`(() => ({ g: TLXT.hum ? TLXT.hum.gain : -1 }))()`);
await ev(`TLX.setOn("traffic", false); true`); await sleep(1500);
const post = await J(`(() => ({ g: TLXT.hum.gain, node: +TLXT.hum.g.gain.value.toFixed(4) }))()`);
ok(pre.g > 0.01 && post.g === 0 && post.node < 0.01, "option off fades the hum: " + JSON.stringify(pre) + " -> " + JSON.stringify(post));
await ev(`TLX.setOn("traffic", true); true`);

// F. an old save
const sv = await J(`(() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })()`).catch(() => null);
if (sv) { if (sv.x && sv.x.sys) delete sv.x.sys.traffic; await reload(sv); await sleep(1500); }
const fin = await J(`(() => ({ ready: TLXT.ready, err: TLXT.err, tick: TLXT.tickErr || null, beams: !!TLXT.beams, calls: TLXT.group.children.length }))()`);
ok(fin.ready && !fin.err && !fin.tick && fin.beams && fin.calls <= 7, "reloaded save: traffic ready, no tick error, " + fin.calls + " meshes " + JSON.stringify(fin) + (sv ? "" : " (no save read: SAVE_KEY?)"));
console.log(fails ? `x3_beams: ${fails} FAILED` : "x3_beams: all ok");
await done(fails ? 1 : 0);
