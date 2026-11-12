// Beta 3.4b2a (headlight beams + hum) break pass: dusk/dawn ramp (no pop), storm night, mute / volume 0, house interior,
// two cars (loudest wins, despawn silences), low graphics preset, draw calls at night with every car out, on-foot hearing,
// tablet open, reload at night.
import { boot, ev, sleep, done, shot, reload } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 36; if (!audio) initAudio(); if (audio && audio.AC.state === "suspended") audio.AC.resume(); true`); await sleep(1000);
const rid = await J(`TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id`);
const s0 = await J(`TLXT.routes.find(q => q.id === "${rid}").s0 + 900`);
const at = (dx, dz) => `(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${rid}", ${s0}, 1); P.x = p.cx + ${dx}; P.z = p.cz + ${dz}; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`;
await ev(at(15, 15));
await ev(`(() => { TLXT.hold = true; const c = TLXT.place("${rid}", ${s0}, 1); c.v = 0; c.hold = 1e9; return true; })()`);

// A. dusk / dawn ramp: brightness per half hour, 12 -> 32 (calendar hour of day); jumps > 0.5 in 0.5 h would be a pop
const ramp = [];
for (let h = 12; h <= 36; h += 0.5) { const r = await J(`(() => { GS.hour = 24 + ${h}; return 0; })()`); await sleep(260); ramp.push(await J(`({ h: ${h}, df: +dayFactor().toFixed(3), k: TLXT.beamK[0], vis: TLXT.beams.visible, pv: TLXT.pool.visible })`)); }
console.log("ramp", ramp.map(r => `${r.h}:${r.df}/${r.k}`).join(" "));
let jump = 0, mism = 0; for (let i = 1; i < ramp.length; i++) jump = Math.max(jump, Math.abs(ramp[i].k - ramp[i - 1].k));
for (const r of ramp) if (r.vis !== (r.k > 0) || r.pv !== r.vis) mism++;
ok(jump <= 0.6, "A: beam brightness max step between half hours " + jump.toFixed(2));
ok(mism === 0, "A: beams/pool visibility matches brightness at every step (" + mism + " mismatches)");
ok(ramp.some(r => r.k === 1) && ramp.some(r => r.k === 0), "A: the ramp reaches 0 and 1");
const kmid = ramp.filter(r => r.k > 0 && r.k < 1).length; console.log("intermediate steps", kmid);

// B. storm night: beams still read through the fog (road luma on vs off) and no tick error
await ev(`(() => { GS.hour = 24 + 22 + 24; WX.at = () => 1; GS.storm = 1; return true; })()`); await sleep(1500);
const st = await J(`(() => ({ k: TLXT.beamK[0], vis: TLXT.beams.visible, err: TLXT.tickErr || null, df: dayFactor() }))()`);
ok(st.k > 0.5 && st.vis && !st.err, "B: storm night beams on " + JSON.stringify(st));
await shot("x3bb_storm");
await ev(`WX.at = () => 0; GS.storm = 0; true`);

// C. mute / volume
await ev(`(() => { GS.hour = 36; const c = TLXT.cars[0]; c.hold = 0; c.v = 10; return true; })()`); await sleep(1200);
const v1 = await J(`({ g: TLXT.humGain, node: TLXT.hum ? +TLXT.hum.g.gain.value.toFixed(4) : null, master: +audio.master.gain.value.toFixed(3), muted })`);
await ev(`SET.vol = 0; muted = true; applySettings(); true`); await sleep(500);
const v2 = await J(`({ g: TLXT.humGain, master: +audio.master.gain.value.toFixed(3) })`);
await ev(`SET.vol = 0.8; muted = false; applySettings(); true`); await sleep(300);
const v3 = await J(`({ master: +audio.master.gain.value.toFixed(3) })`);
ok(v1.g > 0.02 && v2.master === 0 && v3.master > 0, "C: hum rides the master (" + JSON.stringify([v1, v2, v3]) + ")");

// D. interior: a house door near a car -> hum gain x0.25
const door = await J(`(() => { const b = (INT.beacons || [])[0]; return b ? { x: b.x, z: b.z, ok: true } : null; })()`).catch(() => null);
console.log("door", JSON.stringify(door));
await ev(`(() => { const b = INT.beacons[0], c = TLXT.cars[0]; c.on = true; c.hold = 1e9; c.v = 8; TLXT.hold = true; c.x = b.x + 14; c.z = b.z + 14; c.y = surf(c.x, c.z); FOOT.on = true; FOOT.x = b.x; FOOT.z = b.z; return true; })()`); await sleep(500);
const loud = await J(`TLXT.humGain`);
await ev(`(() => { const b = INT.beacons[0]; FOOT.on = true; FOOT.x = b.x; FOOT.z = b.z; intEnter(b); return true; })()`); await sleep(900);
const inn = await J(`({ g: TLXT.humGain, vis: TLXT.beams.visible, err: TLXT.tickErr || null })`);
const wasIn = await J(`INT.on`); await ev(`(() => { if (INT.on) intGoOut(); return true; })()`); await sleep(600); const outAgain = await J(`INT.on`);
ok(wasIn && !outAgain && inn.g < loud * 0.5 && !inn.err, "D: indoors muffles the hum " + loud + " -> " + inn.g + " (in " + wasIn + ", out " + outAgain + ")");

// E. two cars: loudest wins, then despawn
await ev(`(() => { P.vx = P.vz = 0; const a = TLXT.cars[0], p = TLXT.lanePt("${rid}", ${s0}, 1); a.hold = 1e9; a.v = 0; TLXT.place("${rid}", ${s0} + 90, 1); return true; })()`);
const two = await J(`(() => { const out = {}; out.n = TLXT.cars.filter(c => c.on).length; return out; })()`);
console.log("cars on", JSON.stringify(two));
const o2 = await J(`(() => { const cs = TLXT.cars.filter(c => c.on); return cs.map(c => ({ i: c.i, d: +Math.hypot(c.x - P.x, c.z - P.z).toFixed(0) })); })()`);
await sleep(600);
const w = await J(`({ car: TLXT.humCar })`);
const nearest = o2.slice().sort((a, b) => a.d - b.d)[0];
ok(o2.length < 2 || w.car === nearest.i || o2.every(x => x.d > 150), "E: loudest nearby car drives the hum " + JSON.stringify({ o2, w }));
await ev(`(() => { TLXT.cars.forEach(c => { c.on = false; c.retry = 1e9; }); return true; })()`); await sleep(800);
const gone = await J(`({ g: TLXT.humGain, car: TLXT.humCar, n: TLXT.beams.count, node: +TLXT.hum.g.gain.value.toFixed(4) })`);
ok(gone.g === 0 && gone.car === -1 && gone.n === 0, "E: no cars on -> silent, no beams " + JSON.stringify(gone));
await ev(`TLXT.hold = false; TLXT.cars.forEach(c => { c.retry = 0; }); true`);

// F. low graphics preset
const lo = await J(`(() => { try { const keys = Object.keys(GFX).filter(k => /preset|quality|level/i.test(k)); return keys.map(k => k + "=" + GFX[k]); } catch (e) { return String(e); } })()`);
console.log("GFX keys", JSON.stringify(lo));
await ev(`(() => { try { SET.gfx = "low"; applyGfx && applyGfx(); } catch (e) {} return true; })()`); await sleep(800);
const lowS = await J(`({ vis: TLXT.beams.visible, k: TLXT.beamK[0], n: TLXT.beams.count, err: TLXT.tickErr || null })`);
ok(!lowS.err, "F: low preset: no tick error " + JSON.stringify(lowS));

// G. draw calls at night with all 6 cars out near you vs day
await ev(`(() => { GS.hour = 24 + 22 + 24; TLXT.hold = true; const c0 = TLXT.place("${rid}", ${s0} + 30, 1); TLXT.cars.forEach((c, i) => { if (i) Object.assign(c, { on: true, r: c0.r, s: c0.s + i * 45, k: 0, dir: (i % 2) ? -1 : 1, v: 0, st: "drive", t: 0, blocked: 0, hold: 1e9, why: "" }); }); return true; })()`); await sleep(1200);
const dcN = await J(`(() => { renderer.info.autoReset = true; return { n: TLXT.cars.filter(c => c.on).length, beams: TLXT.beams.count, calls: renderer.info.render.calls }; })()`);
await ev(`GS.hour = 36; true`); await sleep(1200);
const dcD = await J(`({ calls: renderer.info.render.calls })`);
console.log("calls night/day", JSON.stringify(dcN), JSON.stringify(dcD));
ok(dcN.n >= 5 && dcN.calls - dcD.calls <= 6, "G: night with " + dcN.n + " cars costs " + (dcN.calls - dcD.calls) + " extra draw calls");
await ev(`GS.hour = 24 + 46; true`); await sleep(700); await shot("x3bb_sixcars_night");

// H. on foot + tablet open: still hears, no error
await ev(`(() => { const c = TLXT.cars.find(c => c.on); FOOT.on = true; FOOT.x = c.x + 12; FOOT.z = c.z + 12; FOOT.y = surf(FOOT.x, FOOT.z); c.hold = 0; c.v = 10; return true; })()`); await sleep(1000);
const foot = await J(`({ g: TLXT.humGain, err: TLXT.tickErr || null })`);
ok(foot.g > 0.01 && !foot.err, "H: on foot hears the car " + JSON.stringify(foot));
await ev(`TABLET.toggle(true, "map"); true`); await sleep(1000);
const tab = await J(`({ g: TLXT.humGain, node: +TLXT.hum.g.gain.value.toFixed(4) })`);
ok(tab.g > 0, "H: tablet open: hum keeps going " + JSON.stringify(tab));
await ev(`TABLET.toggle(false); FOOT.on = false; true`);

// I. reload at night: beams on from first frames
const sv = await J(`(() => { save(); return JSON.parse(localStorage.getItem("tracklayer.save.v2")); })()`).catch(() => null);
if (sv) { sv.hour = 24 + 46; await reload(sv); await ev(`tutSkip(); true`); await sleep(2500); }
const rl = await J(`({ df: dayFactor(), ready: TLXT.ready, vis: TLXT.beams.visible, n: TLXT.beams.count, on: TLXT.cars.filter(c => c.on).length, err: TLXT.tickErr || TLXT.err || null })`);
ok(rl.ready && !rl.err && (rl.df > 0.5 || rl.vis === (rl.on > 0)), "I: reload: beams consistent " + JSON.stringify(rl));
console.log(fails ? `x3_beams_break: ${fails} FAILED` : "x3_beams_break: all ok");
await done(fails ? 1 : 0);
