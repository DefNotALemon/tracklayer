// Slice 3.5c2a (G4): the plow truck at the head of the convoy. Asserts, exit 1 on a failure.
//  A. one plow truck per convoy road in TLXT.cars, after the semis, off the road while the roads are open.
//  B. two cars and one coming the other way queue at the lowered barriers of a snowed-in road; no truck yet, the
//     barrier reads CLOSED.
//  C. the council plow sets out (TLXR's own rule): the stretch outside the gates is cleared, the one between them is
//     left for the truck; the road goes to the next convoy time while still snowed in; the truck stands 16 m inside
//     the Kjøllefjord gate, beacons going, blade carried; the queue waits. A storm at the convoy time puts it back an hour.
//  D. convoy time: the truck leads, blade down, 7 m/s in the drift, the stretch cut as the blade reaches it (road open
//     again), 10 m/s after; the cars follow 30 m back, never pass it, never stop for the drift.
//  E. at the far gate it stops 16 m short of the boom, turns round across the road and stands facing back; the line
//     drives out past it; it leads the return convoy.
//  F. back at the first gate it turns again; the road opens; it drives off and is gone once you are far enough.
//  G. you at the Kjøllefjord gate when the next convoy is called: the truck is put at the far gate (out of sight), leads
//     from there alone though the queue is on your side; unseen it comes on at the council's pace (5 km a game hour)
//     but never to within 900 m of you; it cuts the drift, turns at your gate and takes the queue back.
//  H. after dark the beacons and lamps are lit; traffic off: no truck, TLXR plows the stretch itself again.
// Stills: the truck waiting inside the boom, leading with the blade down, turning at the far gate, at night.
import { boot, ev, sleep, done, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const NOSTILLS = !!process.env.NOSTILLS;
let camHooked = false;
async function cam(expr) {   // expr: JS returning [px,py,pz, lx,ly,lz]
  if (!camHooked) { await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`); camHooked = true; }
  await ev(`(() => { window.camOv = c => { const v = (${expr}); c.position.set(v[0], v[1], v[2]); c.lookAt(v[3], v[4], v[5]); }; return true; })()`);
  await sleep(350);
}
const camOff = () => ev("window.camOv = null; true");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(120); } return false; }
const toasts = () => J(`[...new Set((window.__tsaw || []).concat((TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))))]`);
const clearToasts = () => ev(`(() => { TOASTQ.length = 0; $("toasts").textContent = ""; window.__tsaw = [];
  if (!window.__tsawI) window.__tsawI = setInterval(() => { const a = window.__tsaw || (window.__tsaw = []); for (const m of (TOASTQ || []).map(t => t.msg).concat([...$("toasts").children].map(c => c.textContent))) if (!a.includes(m)) a.push(m); }, 80);
  return true; })()`);

await boot();
await ev(`GS.hour = 34; tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLXT.hold = true; TLX.setOn("police", false); for (const c of TLXT.cars) c.on = false; true`); await sleep(1000);

const RID = "lebesby";
const info = () => J(`TLXCV.info("${RID}")`);
const car = i => J(`(() => { const c = TLXT.cars[${i}]; return { on: c.on, s: c.s, v: c.v, dir: c.dir, st: c.st, why: c.why, gq: !!c.gq, cv: !!c.cv, pass: !!c.pass, x: c.x, z: c.z }; })()`);
const snow = () => J(`TLXR.routes.find(r => r.id === "${RID}").st.s.slice(0, 6)`);

// ---- A
const A = await J(`(() => { const C = TLXCV, T = TLXT; return { ready: C.ready, err: C.err, n: T.n, ns: T.nSemi, np: T.nPlow, total: T.cars.length, plow: C.CV.plow,
  pl: C.roads.map(G => ({ id: G.id, i: G.pl ? G.pl.i : -1, plow: !!(G.pl && G.pl.plow), on: !!(G.pl && G.pl.on), pst: G.pl && G.pl.pst })), q: C.info("${RID}") }; })()`);
console.log("A:", JSON.stringify(A));
ok(A.ready && !A.err && A.plow === 1 && A.np === 2 && A.total === A.n + A.ns + 2, "A: two plow trucks in the traffic list, after the " + A.n + " cars and " + A.ns + " lorries");
ok(A.pl.length === 2 && A.pl.every(p => p.plow && !p.on && p.pst === "off" && p.i >= A.n + A.ns) && A.pl[0].i !== A.pl[1].i, "A: one per convoy road, off the road while it is open");
const GA = A.q.gates[0].s, GB = A.q.gates[1].s, PI = A.pl.find(p => p.id === RID).i, SEG = 400;
const GI = Math.ceil((GA + 20) / SEG), E0 = GI * SEG, E1 = E0 + SEG;      // the first whole stretch inside the Kjøllefjord gate
console.log("gates", GA, GB, "plow car", PI, "drift stretch", GI, E0, E1);
ok(E0 - GA < 420 && E1 < GB - 400, "A: the test drift is the stretch " + E0 + "-" + E1 + " m, " + Math.round(E0 - GA) + " m inside the gate");
// you: 40 m to the side of the road, `back` m outside gate `side` (far: 700 m outside gate 1's side, well out of sight of both)
const you = (side, back = 30) => ev(`(() => { crashCancel(); FOOT.on = false; const q = TLXCV.info("${RID}").gates[${side}], p = TLXT.lanePt("${RID}", q.s ${side ? "+" : "-"} ${back}, 1), a = p.yaw + Math.PI / 2;
  P.x = p.cx + Math.sin(a) * 40; P.z = p.cz + Math.cos(a) * 40; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`);
const youMid = () => ev(`(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${RID}", ${(GA + GB) / 2}, 1), a = p.yaw + Math.PI / 2;
  P.x = p.cx + Math.sin(a) * 60; P.z = p.cz + Math.cos(a) * 60; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`);
const gateCam = (side, back = 24, lat = 5, up = 3.6) => cam(`(() => { const q = TLXCV.info("${RID}").gates[${side}], p = TLXT.lanePt("${RID}", q.s ${side ? "+" : "-"} ${back}, 1), a = p.yaw + Math.PI / 2;
  const x = p.cx + Math.sin(a) * ${lat}, z = p.cz + Math.cos(a) * ${lat}; return [x, surf(x, z) + ${up}, z, q.x, surf(q.x, q.z) + 1.3, q.z]; })()`);
// the camera on the truck: `fwd` m ahead of it, `lat` m to its left, `up` m above the snow
const plowCam = (fwd, lat, up) => cam(`(() => { const c = TLXT.cars[${PI}], fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); const x = c.x + fx * ${fwd} + fz * ${lat}, z = c.z + fz * ${fwd} - fx * ${lat};
  return [x, surf(x, z) + ${up}, z, c.x, c.y + 1.5, c.z]; })()`);

// ---- B: snowed in just inside the gate, and outside it; the queue
await youMid();
await ev(`TLXR.setSnow("${RID}", 1, ${GI}); TLXR.setSnow("${RID}", 0.2, 0); true`);
await waitGame(0.6);
let q = await info();
ok(q.st === "shut" && q.note === "barrier down, convoy once the storm eases" && !q.plow.on, "B: snowed in -> shut (\"" + q.note + "\"), no truck yet");
ok(await J(`TLXCV.keeps("${RID}", ${E0})`) && !(await J(`TLXCV.keeps("${RID}", 0)`)), "B: the stretch between the lowered gates is kept for the truck, the one outside is the council's");
await ev(`(() => { TLXT.put(TLXT.cars[0], "${RID}", ${GA} - 110, 1); TLXT.put(TLXT.cars[1], "${RID}", ${GA} - 160, 1); TLXT.put(TLXT.cars[3], "${RID}", ${GB} + 110, -1); return true; })()`);
await waitGame(60, async () => (await car(0)).gq && (await car(1)).gq && (await car(3)).gq);
let c0 = await car(0), c1 = await car(1), c3 = await car(3);
ok(c0.gq && c1.gq && c3.gq && GA - c0.s > 6 && GA - c0.s < 9, "B: two cars queue at the Kjøllefjord boom (" + (GA - c0.s).toFixed(1) + " m short), one at the Lebesby boom");
const sQ = [c0.s, c1.s, c3.s];

// ---- C: the council plow sets out
await clearToasts();
const passes0 = await J(`TLXT.passes || 0`);
await ev(`GS.hour += 0.8; true`); await waitGame(1.2);
q = await info(); let sn = await snow();
console.log("C:", JSON.stringify(q.plow), q.st, q.note, JSON.stringify(sn));
ok(sn[0] === 0 && sn[GI] === 1, "C: the council plow has cleared the stretch outside the gates (" + sn[0] + ") and left the one between them (" + sn[GI] + ")");
ok(q.st === "wait" && q.shut && q.at === Math.round(q.at), "C: still snowed in, and the next convoy is called: " + q.note);
ok(q.plow.on && q.plow.pst === "post" && q.plow.side === 0 && Math.abs(q.plow.s - (GA + 16)) < 0.5 && q.plow.dir === 1 && q.plow.v === 0, "C: the plow truck stands " + (q.plow.s - GA).toFixed(1) + " m inside the Kjøllefjord gate, facing in");
await waitGame(1);
q = await info();
ok(q.plow.vis && q.plow.beacon > 0.5 && q.plow.blade > 0.25, "C: drawn, beacons going (" + q.plow.beacon.toFixed(2) + "), blade carried " + q.plow.blade.toFixed(2) + " m up");
ok((await J(`TLXR.status("${RID}")`)) === "snowed in" && (await J(`TLXCV.barred("${RID}", ${E0 + 50})`)), "C: the Map still has the road snowed in, nobody turns up between the gates");
await you(0); await waitGame(1.5);
let ts = await toasts(); console.log("C toasts:", JSON.stringify(ts));
const tm = await J(`fmtTime(${q.at})`);
ok(ts.some(t => t.includes("next convoy leaves at " + tm) && /behind the plow truck: it opens the road as it goes/.test(t)), "C: at the gate: the next convoy leaves at " + tm + " behind the plow truck, which opens the road as it goes");
if (!NOSTILLS) { await gateCam(0, 40, 7.5, 4.4); await shot("c_wait"); await plowCam(9, 6, 2.6); await shot("c_truck_front"); await plowCam(-8, -6.5, 2.8); await shot("c_truck_rear"); await camOff(); }
// a storm at the convoy time: put back an hour
await ev(`WX.at = () => 0.9; GS.hour = ${q.at} - 0.003; TLX.state("roads").h = GS.hour; true`);   // (the roads' own clock moved with it: no hour of storm snow)
await waitGame(4, async () => (await info()).at > q.at);
let q2 = await info();
ok(q2.st === "wait" && q2.at === q.at + 1 && q2.put === 1 && q2.gates[0].text === (await J(`fmtTime(${q.at + 1})`)) + " / next convoy", "C: a storm on the fell at the convoy time: no convoy, the board now reads " + q2.gates[0].text);
await ev(`WX.at = () => 0; TLXR.setSnow(null, 0); TLXR.setSnow("${RID}", 1, ${GI}); true`);
c0 = await car(0); c1 = await car(1);
ok(c0.gq && c1.gq && Math.abs(c0.s - sQ[0]) < 0.3 && (await J(`TLXT.passes || 0`)) === passes0, "C: the queue has waited behind the truck all along, nobody pulled out");
q = q2;

// ---- D: convoy time
await clearToasts();
await ev(`GS.hour = ${q.at} - 0.003; true`);
await waitGame(5, async () => (await info()).st === "run");
q = await info(); let mem = await J(`TLXCV.members("${RID}")`);
console.log("D0:", JSON.stringify({ st: q.st, dir: q.dir, led: q.led, plow: q.plow, mem }));
ok(q.st === "run" && q.dir === 1 && q.led && q.plow.pst === "lead", "D: on the hour the convoy leaves from the Kjøllefjord gate, led by the plow truck");
ok(mem.length === 2 && mem.includes(0) && mem.includes(1), "D: the two cars that queued are the line behind it");
// through the drift: its speed, the cut, the followers
let vDrift = 0, cutAt = null, gapMin = 1e9, whyShut = false, bladeMin = 9, shotD = NOSTILLS, sn1 = null, going = false, vLow = 99;
await waitGame(90, async () => { const g = await info(), a = await car(0), b = await car(1);
  if (cutAt === null && (await snow())[GI] === 0) { cutAt = g.plow.s; sn1 = await J(`TLXR.status("${RID}")`); }
  if (g.plow.s > E0 + 10) { vDrift = Math.max(vDrift, g.plow.v); bladeMin = Math.min(bladeMin, g.plow.blade); }
  if (a.v > 1) gapMin = Math.min(gapMin, g.plow.s - a.s); if (a.v > 5) going = true; if (going) vLow = Math.min(vLow, a.v);
  if (going && ((a.why === "shut" && a.v < 0.5) || (b.why === "shut" && b.v < 0.5))) whyShut = true;   // (standing at the boom a car's furthest limit is the drift: that is not stopping for it)
  if (!shotD && g.plow.s > E0 + 30) { shotD = true; await plowCam(13, 7, 2.4); await shot("d_lead"); await plowCam(-34, -7, 5); await shot("d_line"); await camOff(); }
  return g.plow.s > E0 + 90; });
q = await info(); c0 = await car(0); c1 = await car(1);
console.log("D1:", JSON.stringify({ plow: q.plow, c0, c1, vDrift, cutAt, gapMin, sn1, bladeMin, whyShut, going, vLow }));
ok(cutAt !== null && cutAt >= E0 - 9 && cutAt < E0 + 12, "D: the drift is cut as the blade reaches it (truck at " + (cutAt === null ? "?" : (cutAt - E0).toFixed(1)) + " m from its edge)");
ok(sn1 === "open" && q.st === "run", "D: with that the road is open on the Map, the convoy still running");
ok(vDrift > 5.5 && vDrift <= 7.05 && q.plow.vcap === 7, "D: with the blade in the drift it does " + vDrift.toFixed(2) + " m/s (25 km/h)");
ok(bladeMin < 0.06, "D: blade down on the road (" + bladeMin.toFixed(2) + " m)");
ok(q.plow.s > E0 + 60 && c0.cv && c1.cv && c0.s > GA + 10 && !whyShut && going && vLow > 4, "D: the cars follow it in under the boom; neither stopped for the drift (the first never under " + vLow.toFixed(1) + " m/s once rolling)");
ok(gapMin > 27 && q.plow.s - c0.s < 75 && c0.s - c1.s > 25, "D: the first car keeps " + gapMin.toFixed(1) + " m or more behind the truck (" + (q.plow.s - c0.s).toFixed(1) + " m now), the second " + (c0.s - c1.s).toFixed(1) + " m behind that");
// out of the drift (moved up to its end): the line's 10 m/s
await ev(`(() => { const T = TLXT; T.cars[${PI}].s = ${E1} - 30; T.cars[0].s = ${E1} - 75; T.cars[1].s = ${E1} - 115; return true; })()`);
let vOpen = 0, vcapAfter = -1;
await waitGame(34, async () => { const g = await info(); if (g.plow.s > E1 + 5) { vOpen = Math.max(vOpen, g.plow.v); vcapAfter = g.plow.vcap; } return g.plow.s > E1 + 5 && g.plow.v > 9.6; });
q = await info(); c0 = await car(0);
console.log("D2:", JSON.stringify({ s: q.plow.s - E1, v: q.plow.v, vOpen, vcapAfter, gap: q.plow.s - c0.s }));
ok(vOpen > 7.4 && vOpen <= 10.05 && vcapAfter === 0, "D: on the cleared road it leads at the line's speed (" + vOpen.toFixed(2) + " m/s)");
ok((await J(`TLXT.passes || 0`)) === passes0 && q.plow.s > c0.s + 20, "D: nobody has passed the truck");
ts = await toasts();
ok(ts.some(t => /barrier lifts/.test(t) && /behind the plow truck/.test(t) && /36 km\/h/.test(t)), "D: at the gate: the barrier lifts, the convoy leaves behind the plow truck, 36 km/h");

// ---- E: the far gate (the line moved up to it)
await ev(`(() => { const T = TLXT; T.cars[${PI}].s = ${GB} - 95; T.cars[0].s = ${GB} - 135; T.cars[1].s = ${GB} - 175; return true; })()`);
await you(1);
let stopS = null, turned = false, shotE = NOSTILLS, yawMid = null;
await waitGame(70, async () => { const g = await info();
  if (g.plow.pst === "turn") { if (stopS === null) stopS = g.plow.s; if (!shotE) { await waitGame(3.5); shotE = true; await gateCam(1, -44, 8, 6.5); await shot("e_turn"); await camOff(); } }
  for (const i of [0, 1]) { const c = await car(i); if (c.on && c.s > GB + 16) await ev(`TLXT.cars[${i}].on = false; true`); }
  turned = g.plow.pst === "post" && g.plow.side === 1; return turned && g.st === "run" && g.dir === -1; });
q = await info(); mem = await J(`TLXCV.members("${RID}")`);
console.log("E:", JSON.stringify({ stopS: stopS === null ? null : GB - stopS, plow: q.plow, st: q.st, dir: q.dir, back: q.back, led: q.led, mem }));
ok(stopS !== null && Math.abs(GB - stopS - 16) < 1.2, "E: the truck stops " + (stopS === null ? "?" : (GB - stopS).toFixed(1)) + " m short of the Lebesby boom and turns round");
ok(!(await car(0)).on && !(await car(1)).on, "E: the line drives out past it");
ok(q.st === "run" && q.dir === -1 && q.back && q.led && mem.length === 1 && mem[0] === 3, "E: it leads the return convoy: the car that waited at Lebesby");
await waitGame(24, async () => (await car(3)).s < GB - 8);
q = await info(); c3 = await car(3);
ok(q.plow.dir === -1 && q.plow.pst === "lead" && q.plow.s < GB - 20 && c3.s < GB && c3.s - q.plow.s > 27, "E: heading back, the car " + (c3.s - q.plow.s).toFixed(1) + " m behind it");
if (!NOSTILLS) { await plowCam(12, -7, 2.6); await shot("e_return"); await camOff(); }

// ---- F: back at the first gate: open, the truck drives off
await ev(`(() => { const T = TLXT; T.cars[${PI}].s = ${GA} + 90; T.cars[3].s = ${GA} + 130; return true; })()`);
await you(0, 30);
await waitGame(70, async () => { const c = await car(3); if (c.on && c.s < GA - 16) await ev(`TLXT.cars[3].on = false; true`); return (await info()).st === "open"; });
await waitGame(6, async () => (await info()).plow.v > 2);
q = await info();
console.log("F:", JSON.stringify({ st: q.st, runs: q.runs, plow: q.plow }));
ok(q.st === "open" && q.runs >= 2 && q.gates.every(g => g.admits), "F: the return convoy through: the road is open");
ok(q.plow.on && q.plow.pst === "free" && q.plow.dir === 1 && q.plow.v > 2, "F: the truck turned at the gate and drives off along the road (" + q.plow.v.toFixed(1) + " m/s), you 50 m away");
await ev(`P.x += 900; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true); true`); await waitGame(1);
q = await info();
ok(!q.plow.on && q.plow.pst === "off" && !q.plow.vis, "F: once you are 300 m+ away it is gone");

// ---- G: called while you sit at the Kjøllefjord gate
await you(0, 30); await clearToasts();
await ev(`TLXR.setSnow("${RID}", 1, ${GI}); true`); await waitGame(0.6);
await ev(`TLXT.put(TLXT.cars[0], "${RID}", ${GA} - 70, 1); true`);
await waitGame(40, async () => (await car(0)).gq);
await ev(`GS.hour += 0.8; true`); await waitGame(1.2);
q = await info();
console.log("G0:", JSON.stringify({ st: q.st, plow: q.plow }));
ok(q.st === "wait" && q.plow.on && q.plow.pst === "post" && q.plow.side === 1 && Math.abs(q.plow.s - (GB - 16)) < 0.5, "G: with you at the Kjøllefjord gate the truck is put inside the Lebesby gate, out of sight");
await ev(`GS.hour = ${q.at} - 0.003; true`);
await waitGame(5, async () => (await info()).st === "run");
q = await info(); mem = await J(`TLXCV.members("${RID}")`);
ok(q.st === "run" && q.dir === -1 && q.led && mem.length === 0 && (await car(0)).gq, "G: the queue is on your side, but the truck leads from where it stands, alone; the car beside you waits");
// unseen: the council's pace by the clock (100 m a second of play), and it stops coming on 900 m from you
let dFF = 1e9, ffP = -1, tFF = 0; const tG = await clock();
await waitGame(26, async () => { const g = await J(`(() => { const q = TLXCV.info("${RID}"); return { ff: q.ff, d: Math.hypot(q.plow.x - P.x, q.plow.z - P.z) }; })()`);
  if (g.ff !== ffP) { ffP = g.ff; dFF = g.d; tFF = (await clock()) - tG; } return false; });
q = await info();
console.log("G ff:", JSON.stringify({ ff: q.ff, s: q.plow.s, from: GB - 16, v: q.plow.v, dFF, tFF, pst: q.plow.pst }));
ok(q.ff > 600 && q.ff / Math.max(1, tFF + 1.5) > 40, "G: unseen and leading nobody it comes on at the council's pace: " + q.ff + " m by the clock in about " + tFF.toFixed(0) + " s of play");
ok(dFF > 860 && q.plow.pst === "lead" && q.plow.v > 3 && GB - 16 - q.plow.s > q.ff + 20, "G: that stops " + Math.round(dFF) + " m from you; from there it is driven (" + q.plow.v.toFixed(1) + " m/s)");
await ev(`TLXT.cars[${PI}].s = ${E1} + 40; TLXR.setSnow("${RID}", 1, ${GI}); true`);
await waitGame(20, async () => (await snow())[GI] === 0);
ok((await snow())[GI] === 0 && (await info()).plow.s < E1 + 12, "G: it cuts the drift from the far side");
await ev(`TLXT.cars[${PI}].s = ${GA} + 70; true`);
let seenTurn = false;
await waitGame(60, async () => { const g = await info(); if (g.plow.pst === "turn") seenTurn = true; return g.st === "run" && g.dir === 1; });
q = await info(); mem = await J(`TLXCV.members("${RID}")`);
console.log("G1:", JSON.stringify({ st: q.st, dir: q.dir, back: q.back, led: q.led, plow: q.plow, mem }));
ok(seenTurn && q.st === "run" && q.dir === 1 && q.back && q.led && mem.length === 1 && mem[0] === 0, "G: it turns at your gate and takes the queue back as the return convoy");

// ---- H: after dark; traffic off
await ev(`GS.hour = Math.floor(GS.hour / 24) * 24 + 23.3; true`); await waitGame(6);
q = await info();
const lamps = await J(`(() => { const M = TLXCV.roads.find(r => r.id === "${RID}").pm; return { b: Math.max(M.beacons[0].color.r, M.beacons[1].color.r), dim: Math.min(M.beacons[0].color.r, M.beacons[1].color.r), head: M.head.color.r, beamK: TLXT.beamK }; })()`);
console.log("H:", JSON.stringify(lamps), JSON.stringify(q.plow));
ok(q.plow.pst === "lead" && lamps.b > 1.8 && lamps.dim < 0.15 && lamps.head > 1.5, "H: after dark one beacon lit at a time (" + lamps.b.toFixed(2) + " / " + lamps.dim.toFixed(2) + "), work lamps " + lamps.head.toFixed(2));
if (!NOSTILLS) { await plowCam(14, 7, 2.6); await shot("h_night"); await camOff(); }
await ev(`TLXR.setSnow("${RID}", 1, ${GI}); TLX.setOn("traffic", false); true`); await waitGame(1);
q = await info();
ok(!q.plow.on && !q.plow.vis && !(await J(`TLXCV.keeps("${RID}", ${E0})`)) && q.st === "shut", "H: traffic off: no truck, the barrier is CLOSED until the council has plowed, as in 3.5c1 (" + q.note + ")");
await ev(`TLX.setOn("traffic", true); TLXCV.CV.plow = 0; true`); await waitGame(1);
q = await info();
ok(!q.plow.on && q.note === "barrier down, convoys once plowed", "H: CV.plow 0: the same");
const errs = await J(`({ e: TLXCV.err, t: TLXCV.tickErr || null, te: TLXT.tickErr || null, re: TLXR.tickErr || null })`);
ok(!errs.e && !errs.t && !errs.te && !errs.re, "no convoy / traffic / roads tick error " + JSON.stringify(errs));

console.log(fails ? `\nFAILED: ${fails}` : "\nall passed");
await done(fails ? 1 : 0);
