// Slice 3.5c2b (G4): you in the convoy's line. Asserts, exit 1 on a failure.
// You are moved along the road by a puppet (placed on the lane each 16 ms with the speed of the one you follow):
// the slice is about who counts as in the line, not about steering.
//  A. a car queues at the lowered Kjøllefjord boom, you stand on the road behind it, one car waits at the Lebesby boom;
//     nothing says "convoy" in the riding hint yet.
//  B. convoy time: the truck leads, the car follows, you fall in behind the car (toast, counted); the riding hint gives
//     your speed, the gap and what to do about it (drop back / hold it there / close up / close up or lose the line).
//  C. dropping 95 m back outside the gate: out of the line, no flag (you never were between the barriers); closing up
//     to 30 m: in again.
//  D. the far gate: the truck turns, the car drives out; you hold back inside: the run does NOT end, the far boom does
//     not admit the car waiting there, the hint says to drive on out. You drive out: the boom lifts for you, "through",
//     and only then does the return convoy leave.
//  E. the return convoy: you fall in behind its car; 12 m off the road for 3 s between the gates: left, a flag on the
//     Map where you left it (legend line, the flag painted on the chart); back in behind the car: the flag is gone;
//     past the truck at the head: left again, flagged; the road opens with the flag still up; out past a gate: gone.
//  F. alone at the Lebesby boom of a snowed-in road: you count as its queue. The truck comes through from the far
//     side, turns, and leads the return convoy for you alone; it does not end while you follow.
//  G. the option off: no flag, no hint, nothing counted.
// Stills: in the line behind the car (the hint line), the Map with the flag.
import { boot, ev, sleep, done, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const NOSTILLS = !!process.env.NOSTILLS;
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(120); } return false; }
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return true; })()`);

await boot();
await ev(`GS.hour = 34; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLXT.hold = true; for (const c of TLXT.cars) c.on = false; true`); await sleep(1000);

const RID = "lebesby";
const info = () => J(`TLXCV.info("${RID}")`);
const car = i => J(`(() => { const c = TLXT.cars[${i}]; return { on: c.on, s: c.s, v: c.v, dir: c.dir, st: c.st, why: c.why, gq: !!c.gq, cv: !!c.cv, x: c.x, z: c.z }; })()`);
const hint = () => J(`({ t: $("wnHint").textContent, show: !$("wnHud").hidden })`);

// the puppet: { of: car index, gap, dir } follows that car; { s, v, dir } drives by itself; lat = m off the lane
await ev(`(() => { window.__pup = null; window.__pupI = setInterval(() => { const u = window.__pup; if (!u) return; try {
  const now = gameClock, dt = Math.max(0, Math.min(0.2, now - (u.tP ?? now))); u.tP = now;
  let s, v;
  if (u.of != null) { const c = TLXT.cars[u.of]; s = c.s - u.dir * u.gap; v = c.v; } else { u.s += u.dir * (u.v || 0) * dt; s = u.s; v = u.v || 0; }
  const p = TLXT.lanePt("${RID}", s, u.dir), a = p.yaw + Math.PI / 2, lat = u.lat || 0;
  P.x = p.x + Math.sin(a) * lat; P.z = p.z + Math.cos(a) * lat; P.y = surf(P.x, P.z) + 0.3; P.yaw = p.yaw; P.vx = Math.sin(p.yaw) * v; P.vz = Math.cos(p.yaw) * v;
  if (CRASH.on) crashCancel(); FOOT.on = false; u.n = (u.n || 0) + 1;
} catch (e) { window.__pupErr = String(e); } }, 16); return true; })()`);
const pup = async o => { await ev(`(() => { window.__pup = ${JSON.stringify(o)}; return true; })()`); await sleep(120); await ev(`recenter(P.x, P.z, true); true`); };
const pupSet = o => ev(`(() => { Object.assign(window.__pup, ${JSON.stringify(o)}); return true; })()`);

const q0 = await info();
ok(q0 && q0.you === null || (q0.you && !q0.you.in && !q0.you.flag), "A: roads open: nobody in a line, no flag");
const GA = q0.gates[0].s, GB = q0.gates[1].s, SEG = 400, PI = await J(`TLXCV.roads.find(G => G.id === "${RID}").pl.i`);
const GI = Math.ceil((GA + 20) / SEG);
console.log("gates", GA, GB, "plow car", PI, "drift stretch", GI);
// off to the side in the middle while things are set up (the truck is then posted at the Kjøllefjord gate)
const youMid = () => ev(`(() => { window.__pup = null; crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${RID}", ${(GA + GB) / 2}, 1), a = p.yaw + Math.PI / 2;
  P.x = p.cx + Math.sin(a) * 60; P.z = p.cz + Math.cos(a) * 60; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`);

// ---- A: the queue, the convoy called, you behind the car
await youMid();
await ev(`TLXR.setSnow("${RID}", 1, ${GI}); TLXR.setSnow("${RID}", 0.2, 0); true`); await waitGame(0.6);
await ev(`(() => { TLXT.put(TLXT.cars[0], "${RID}", ${GA} - 110, 1); TLXT.put(TLXT.cars[3], "${RID}", ${GB} + 110, -1); return true; })()`);
await waitGame(60, async () => (await car(0)).gq && (await car(3)).gq);
await ev(`GS.hour += 0.8; true`); await waitGame(1.2);
let q = await info();
ok(q.st === "wait" && q.plow.pst === "post" && q.plow.side === 0 && (await car(0)).gq && (await car(3)).gq, "A: a car at each boom, the convoy called for " + q.note + ", the truck inside the Kjøllefjord gate");
let c0 = await car(0);
await pup({ s: c0.s - 14, v: 0, dir: 1 }); await waitGame(1);
q = await info(); let h = await hint();
console.log("A you:", JSON.stringify(q.you), JSON.stringify(h));
ok(q.you.live && q.you.ok && q.you.d < 3.3 && Math.abs(q.you.s - (c0.s - 14)) < 1 && !q.you.in, "A: you stand on the road 14 m behind the car (" + q.you.d.toFixed(1) + " m off the centre line), not in any line yet");
ok(!/CONVOY/.test(h.t), "A: no convoy line in the riding hint while waiting (\"" + h.t + "\")");

// ---- B: convoy time: fall in
await clearToasts();
await ev(`GS.hour = ${q.at} - 0.003; true`);
await waitGame(5, async () => (await info()).st === "run");
await pupSet({ of: 0, gap: 30, s: null });
await waitGame(8, async () => (await info()).you.in);
q = await info();
let ts = await toasts(); console.log("B toasts:", JSON.stringify(ts));
ok(q.st === "run" && q.dir === 1 && q.led && q.you.in && q.you.fell === 1 && q.you.who === "the car", "B: the boom lifts and you are in the line behind the car");
ok(ts.some(t => /You fall in behind the car: the convoy for Lebesby/.test(t) && /30 metres/.test(t) && /36 km\/h/.test(t)), "B: told so: fall in behind the car, 30 metres, 36 km/h");
await waitGame(30, async () => (await car(0)).v > 5);
await waitGame(1.5);
q = await info(); h = await hint(); c0 = await car(0);
console.log("B hint:", JSON.stringify(h), JSON.stringify(q.you));
ok(h.show && /^CONVOY to Lebesby · \d+ km\/h \(the line: 36\) · (29|30|31) m behind the car · hold it there$/.test(h.t), "B: the riding hint: \"" + h.t + "\"");
ok(Math.abs(q.you.v - c0.v) < 1.5 && Math.abs(q.you.gap - 30) < 1.5, "B: speed along the road " + q.you.v.toFixed(1) + " m/s (the car " + c0.v.toFixed(1) + "), gap " + q.you.gap.toFixed(1) + " m");
if (!NOSTILLS) await shot("b_inline");
await pupSet({ gap: 12 }); await waitGame(0.6); h = await hint();
ok(/12 m behind the car · drop back$/.test(h.t), "B: 12 m behind: \"" + h.t.split(" · ").slice(-2).join(" · ") + "\"");
await pupSet({ gap: 50 }); await waitGame(0.6); h = await hint();
ok(/50 m behind the car · close up$/.test(h.t), "B: 50 m behind: \"" + h.t.split(" · ").slice(-2).join(" · ") + "\"");
await pupSet({ gap: 66 }); await waitGame(0.6); h = await hint();
ok(/6[5-7] m behind the car · close up or lose the line$/.test(h.t) && (await info()).you.in, "B: 66 m behind: \"" + h.t.split(" · ").slice(-2).join(" · ") + "\", still in");

// ---- C: dropped back before the gate: out, no flag; close up: in again
await clearToasts();
c0 = await car(0);
const outside = c0.s - 95 < GA;
await pupSet({ gap: 95 });
await waitGame(8, async () => !(await info()).you.in);
await waitGame(0.5);                                                         // (the hint line is redrawn a frame or two later)
q = await info(); ts = await toasts(); h = await hint(); console.log("C:", JSON.stringify(q.you), JSON.stringify(ts));
ok(!q.you.in && q.you.left === 1, "C: 95 m behind for 3 s: out of the line");
ok(outside ? !q.you.flag && ts.some(t => /dropped more than 80 metres behind the car\. You are out of the convoy's line\./.test(t)) : !!q.you.flag, "C: " + (outside ? "still outside the gate: no flag, \"You are out of the convoy's line\"" : "between the gates: flagged"));
ok(!/CONVOY/.test(h.t) && q.st === "run", "C: the hint line is gone, the convoy goes on");
await pupSet({ gap: 30 });
await waitGame(6, async () => (await info()).you.in);
q = await info();
ok(q.you.in && q.you.fell === 2 && !q.you.flag, "C: closed up to 30 m: in the line again");

// ---- D: the far gate (the line moved up to it)
await ev(`(() => { const T = TLXT; T.cars[${PI}].s = ${GB} - 95; T.cars[0].s = ${GB} - 135; TLXR.setSnow("${RID}", 0, ${GI}); return true; })()`);
await sleep(150); await ev(`recenter(P.x, P.z, true); true`);
await waitGame(3);
ok((await info()).you.in, "D: (moved up with the line, still in it)");
let sawTurn = false, held = false;                                           // you follow the car up to the boom, then stop 26 m inside it
await waitGame(90, async () => { const g = await info(); if (g.plow.pst === "turn") sawTurn = true;
  const c = await car(0);
  if (!held && c.s > GB + 4) { held = true; await ev(`(() => { window.__pup = { s: TLXT.cars[0].s - 30, v: 0, dir: 1 }; return true; })()`); }
  if (c.on && c.s > GB + 16) await ev(`TLXT.cars[0].on = false; true`);
  return held && !c.on && g.plow.pst === "post" && g.plow.side === 1; });
await waitGame(9);                                                           // minRun long past, the car out, the truck posted
q = await info(); h = await hint(); let c3 = await car(3);
console.log("D hold:", JSON.stringify({ st: q.st, dir: q.dir, n: q.n, t: q.t, you: q.you, plow: q.plow.pst, g1: q.gates[1], c3 }));
ok(sawTurn && q.plow.pst === "post" && q.n === 0, "D: the truck has turned at the Lebesby gate, the car is out");
ok(q.st === "run" && q.dir === 1 && q.you.in && q.you.gap === null, "D: with you still between the gates the run has not ended (" + q.t.toFixed(0) + " s in)");
ok(!q.gates[1].admits && c3.gq && c3.s > GB, "D: the far boom does not admit the car waiting there");
ok(/^CONVOY · the line is through: drive on out past the barrier$/.test(h.t), "D: the hint: \"" + h.t + "\"");
await clearToasts();
await pupSet({ v: 8 });
let upMax = 0;
await waitGame(30, async () => { const g = await info(); if (g.you.s > GB - 12 && g.you.s < GB + 12) upMax = Math.max(upMax, g.gates[1].up); return !g.you.in; });
q = await info(); ts = await toasts(); console.log("D out:", JSON.stringify(q.you), upMax, JSON.stringify(ts));
ok(!q.you.in && q.you.thru === 1 && q.you.s > GB + 14 && !q.you.flag, "D: out " + (q.you.s - GB).toFixed(0) + " m past the boom you are through, no flag");
ok(upMax > 0.6, "D: the boom lifted for you as you drove out (" + upMax.toFixed(2) + ")");
ok(ts.some(t => /You are through with the convoy: the barrier is behind you, Lebesby ahead\./.test(t)), "D: told so");
await pupSet({ v: 0 }); await ev(`(() => { const u = window.__pup; u.lat = -30; return true; })()`);   // off the road, out of the return convoy's way
await waitGame(8, async () => { const g = await info(); return g.st === "run" && g.dir === -1; });
q = await info();
ok(q.st === "run" && q.dir === -1 && q.back && q.led, "D: only now does the return convoy leave, behind the truck");

// ---- E: in the return convoy; off the road; back; past the head
await waitGame(40, async () => (await car(3)).s < GB - 60);
await clearToasts();
await pup({ of: 3, gap: 30, dir: -1 });
await waitGame(8, async () => (await info()).you.in);
q = await info();
ok(q.you.in && q.you.who === "the car" && q.you.s < GB, "E: you fall in behind the return convoy's car, inside the Lebesby gate");
h = await hint(); ok(/^CONVOY to Kjøllefjord · /.test(h.t), "E: the hint: \"" + h.t + "\"");
await pupSet({ lat: 12 });
await waitGame(8, async () => !(await info()).you.in);
q = await info(); ts = await toasts(); console.log("E off:", JSON.stringify(q.you), JSON.stringify(ts));
const flag1 = q.you.flag;
ok(!q.you.in && !!flag1 && q.you.d > 8, "E: " + q.you.d.toFixed(0) + " m off the road for 3 s between the gates: you have left the line, and it is flagged");
ok(ts.some(t => /You are off the road\. You have left the convoy between the barriers: the spot is flagged on your Map/.test(t)), "E: told so");
const leg = await J(`TLXR.legend()`);
ok(/Lebesby road: you left the convoy|: you left the convoy/.test(leg), "E: the Map's road legend has the line \"you left the convoy\"");
const pix = async f => J(`TABLET.layerPts("marks").filter(p => Math.abs(p.x - (${f.x})) < 0.01 && Math.abs(p.z - (${f.z})) < 0.01 && p.name === "left the convoy").length`);
if (flag1) ok((await pix(flag1)) === 1, "E: the Map app has a flag pin \"left the convoy\" at that spot"); else ok(false, "E: no flag to look for on the Map");
await pupSet({ lat: 0 });
await waitGame(6, async () => (await info()).you.in);
q = await info();
ok(q.you.in && !q.you.flag && !/you left the convoy/.test(await J(`TLXR.legend()`)), "E: back on the road 30 m behind the car: in the line, the flag is off");
if (flag1) ok((await J(`TABLET.layerPts("marks").length`)) === 0, "E: and off the Map");
// past everyone: 25 m ahead of the truck
await clearToasts();
await pup({ of: PI, gap: -25, dir: -1 });
await waitGame(6, async () => !(await info()).you.in);
q = await info(); ts = await toasts(); console.log("E pass:", JSON.stringify(q.you), JSON.stringify(ts));
ok(!q.you.in && !!q.you.flag && ts.some(t => /You have passed the plow truck\. You have left the convoy between the barriers/.test(t)), "E: past the plow truck at the head: you have left the line, flagged");
await waitGame(4);
ok(!(await info()).you.in, "E: ahead of the head there is nobody to fall in behind");
// the convoy comes in (moved up to the Kjøllefjord gate), you off to the side between the gates
const fl = (await info()).you.flag, sNear = Math.min(GB - 40, (await info()).you.s + 120);
await ev(`(() => { window.__pup = { s: ${sNear}, v: 0, dir: -1, lat: 40 }; return true; })()`); await sleep(150); await ev(`recenter(P.x, P.z, true); true`);
await ev(`(() => { const T = TLXT; T.cars[${PI}].s = ${GA} + 90; T.cars[3].s = ${GA} + 130; return true; })()`);
await waitGame(80, async () => { const c = await car(3); if (c.on && c.s < GA - 16) await ev(`TLXT.cars[3].on = false; true`); return (await info()).st === "open"; });
await waitGame(1.5);
q = await info();
ok(q.st === "open" && !!q.you.flag && Math.abs(q.you.flag.x - fl.x) < 0.01 && /you left the convoy/.test(await J(`TLXR.legend()`)), "E: the road is open again; between the gates the flag stays where you left the line");
if (!NOSTILLS) { await ev(`TABLET.toggle(true, "map"); true`); await sleep(700); for (let i = 0; i < 5; i++) { await ev(`$("tabZoomIn").click(); true`); await sleep(120); } await sleep(1800); await shot("e_map_flag"); await ev(`TABLET.toggle(false); true`); await sleep(300); }
await clearToasts();
await pup({ s: GA - 30, v: 0, dir: -1 }); await waitGame(1.5);
q = await info(); ts = await toasts();
ok(!q.you.flag && !/you left the convoy/.test(await J(`TLXR.legend()`)) && ts.some(t => /Out past the barrier: the .* convoy flag is off your Map\./.test(t)), "E: out past the Kjøllefjord gate: the flag is off the Map, and you are told");

// ---- F: alone at the Lebesby boom of a snowed-in road
await ev(`(() => { window.__pup = null; for (const c of TLXT.cars) if (!c.plow) c.on = false; return true; })()`);
await waitGame(1);
await ev(`(() => { const pl = TLXT.cars[${PI}]; pl.on = false; pl.pst = "off"; return true; })()`);
await youMid(); await waitGame(0.6);
await ev(`TLXR.setSnow("${RID}", 1, ${GI}); true`); await waitGame(0.6);
await ev(`GS.hour += 0.8; true`); await waitGame(1.5);
q = await info();
ok(q.st === "wait" && q.plow.pst === "post" && q.plow.side === 0, "F: snowed in again, the convoy called, the truck inside the Kjøllefjord gate, nobody queued");
await pup({ s: GB + 25, v: 0, dir: -1 }); await waitGame(1);
await clearToasts();
await ev(`GS.hour = ${q.at} - 0.003; true`);
await waitGame(5, async () => (await info()).st === "run");
q = await info();
ok(q.st === "run" && q.dir === 1 && q.led && !q.back && q.n === 0, "F: convoy time: the truck sets off from the Kjøllefjord side with nobody behind it");
await ev(`(() => { TLXT.cars[${PI}].s = ${GB} - 80; TLXR.setSnow("${RID}", 0, ${GI}); return true; })()`);
await waitGame(60, async () => { const g = await info(); return g.st === "run" && g.dir === -1; });
q = await info();
ok(q.st === "run" && q.dir === -1 && q.back && q.led && q.n === 0, "F: it turns at your gate and a return convoy is called for you alone (no car in it)");
await pupSet({ of: PI, gap: 28, s: null });
await waitGame(8, async () => (await info()).you.in);
ts = await toasts(); q = await info();
ok(q.you.in && q.you.who === "the plow truck" && ts.some(t => /You fall in behind the plow truck: the convoy for Kjøllefjord/.test(t)), "F: you fall in behind the plow truck");
await waitGame(14);
q = await info(); h = await hint();
ok(q.st === "run" && q.you.in && q.n === 0 && q.plow.pst === "lead" && q.plow.s < GB - 30, "F: 14 s on the convoy is still running with only you in it, " + (GB - q.plow.s).toFixed(0) + " m inside the gate");
ok(/^CONVOY to Kjøllefjord · \d+ km\/h \(the line: 36\) · 2[5-9] m behind the plow truck · hold it there$/.test(h.t), "F: the hint: \"" + h.t + "\"");

// ---- G: the option off
await pupSet({ lat: 14 }); await waitGame(5, async () => !!(await info()).you.flag);
ok(!!(await info()).you.flag, "G: (left the line off the road: flagged)");
await ev(`TLX.setOn("convoy", false); true`); await waitGame(1);
q = await info(); h = await hint();
ok(!q.you.flag && !q.you.in && q.st === "open" && !/CONVOY/.test(h.t) && (await J(`TLXR.legend()`)).indexOf("you left the convoy") < 0, "G: option off: no flag, no line in the hint, no legend line");
const errs = await J(`({ e: TLXCV.err, t: TLXCV.tickErr || null, te: TLXT.tickErr || null, re: TLXR.tickErr || null, pup: window.__pupErr || null })`);
ok(!errs.e && !errs.t && !errs.te && !errs.re && !errs.pup, "no convoy / traffic / roads tick error " + JSON.stringify(errs));

console.log(fails ? `\nFAILED: ${fails}` : "\nall passed");
await done(fails ? 1 : 0);
