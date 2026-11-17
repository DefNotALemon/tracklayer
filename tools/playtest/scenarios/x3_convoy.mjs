// Slice 3.5c1 (G4): storm closures and convoys, the barriers. Asserts, exit 1 on a failure.
//  A. tlx-convoy.js loaded: each convoy road has two gates, in from its ends, 800 m+ apart, clear of other roads and of
//     the lay-bys; everything open, booms up, nothing on the Map legend.
//  B. a stretch between the gates snows in: both booms come down; a car, a second car and a lorry heading in stop at the
//     boom and queue (not at the drift), and after 32 game s none has turned round or pulled out; a car inside leaves
//     past the boom, which lifts for it; you are told why at the gate; the Map legend says so.
//  C. the plow has been: the booms stay down, the next convoy is on the hour, the board, the legend, the trip warning
//     and a toast all give the time.
//  D. convoy time: the longer queue goes first, its boom up and the far one down; the line keeps to 10 m/s and opens out
//     to 25 m+ apart; the car waiting at the far gate stays put.
//  E. the line through: the return convoy leaves from the far side; when that is through the road is open, booms up.
//  F. option off: no gates, a car drives up to the drift as before; on again: the gates are back.
//  G. after dark the lamps of a lowered boom flash; a reload with the road snowed in finds the barrier down.
// Stills: the queue at the lowered boom, the convoy leaving, the open gate, the gate at night.
import { boot, ev, sleep, done, shot, reload } from "../lib.mjs";
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
const setup = `tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; TLXR.ROADS.plowAt = 2; true`;

await boot();
await ev(`GS.hour = 34; ${setup}`); await sleep(1000);

// ---- A
const A = await J(`(() => { const C = window.TLXCV, T = TLXT; if (!C) return null; const bays = window.TLXRIG ? TLXRIG.bays() : [];
  return { ready: C.ready, err: C.err, tickErr: C.tickErr || null, opt: TLX.on("convoy"), n: T.n, ns: T.nSemi, legend: C.legend(),
    roads: C.roads.map(G => { const q = C.info(G.id), r = G.r; return { id: q.id, name: q.name, st: q.st, ends: q.ends, s0: r.s0, s1: r.s1,
      g: q.gates.map(g => ({ s: +g.s.toFixed(0), up: g.up, vMin: g.vMin, street: r.street[Math.max(0, r.cum.findIndex(c => c > g.s) - 1)],
        other: Math.round(Math.min(...TLXR.routes.filter(rt => rt !== G.rt).map(rt => Math.min(...rt.pts.map(p => Math.hypot(p[0] - g.x, p[1] - g.z)))))),
        bay: bays.length ? Math.round(Math.min(...bays.map(b => Math.hypot(b.x - g.x, b.z - g.z)))) : 9999 })) }; }) }; })()`);
console.log("A:", JSON.stringify(A));
ok(A && A.ready && !A.err && !A.tickErr && A.opt, "A: TLXCV ready, option convoy on");
ok(A.roads.length >= 2 && A.roads.some(r => r.id === "lebesby") && A.roads.some(r => r.id === "fv888"), "A: gates on " + A.roads.map(r => r.id).join(", "));
for (const r of A.roads) {
  ok(r.g[0].s - r.s0 >= 419 && r.s1 - r.g[1].s >= 419 && r.g[1].s - r.g[0].s >= 800, `A: ${r.id} gates ${Math.round(r.g[0].s - r.s0)} m and ${Math.round(r.s1 - r.g[1].s)} m in from its ends, ${r.g[1].s - r.g[0].s} m apart`);
  ok(r.g.every(g => !g.street && g.other >= 45 && g.bay >= 70), `A: ${r.id} gates off the streets, ${r.g.map(g => g.other).join(" / ")} m from another road, ${r.g.map(g => g.bay).join(" / ")} m from a lay-by`);
  ok(r.st === "open" && r.g.every(g => g.up === 1), `A: ${r.id} open, booms up`);
}
ok(A.legend === "", "A: nothing about barriers in the Map legend while the roads are open");

const RID = "lebesby", RD = A.roads.find(r => r.id === RID), GA = RD.g[0].s, GB = RD.g[1].s, SI = A.n;
const info = () => J(`TLXCV.info("${RID}")`);
const car = i => J(`(() => { const c = TLXT.cars[${i}]; return { on: c.on, s: c.s, v: c.v, dir: c.dir, st: c.st, why: c.why, gq: !!c.gq, cv: !!c.cv, pass: !!c.pass, waiting: !!c.waiting, x: c.x, z: c.z }; })()`);
// you: parked 40 m to the side of the road, `back` m outside gate `side`
const you = (side, back = 30) => ev(`(() => { crashCancel(); FOOT.on = false; const q = TLXCV.info("${RID}").gates[${side}], p = TLXT.lanePt("${RID}", q.s ${side ? "+" : "-"} ${back}, 1), a = p.yaw + Math.PI / 2;
  P.x = p.cx + Math.sin(a) * 40; P.z = p.cz + Math.cos(a) * 40; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`);
// the camera: `back` m outside gate `side`, a little to one side, looking at the boom
const gateCam = (side, back = 24, lat = 5, up = 3.6) => cam(`(() => { const q = TLXCV.info("${RID}").gates[${side}], p = TLXT.lanePt("${RID}", q.s ${side ? "+" : "-"} ${back}, 1), a = p.yaw + Math.PI / 2;
  const x = p.cx + Math.sin(a) * ${lat}, z = p.cz + Math.cos(a) * ${lat}; return [x, surf(x, z) + ${up}, z, q.x, surf(q.x, q.z) + 1.1, q.z]; })()`);

// ---- B: snowed in between the gates
await you(0); await clearToasts();
const GI = await J(`(() => { const seg = TLXR.ROADS.seg, gi = Math.floor(${(GA + GB) / 2} / seg); TLXR.setSnow("${RID}", 1, gi); return gi; })()`);
await waitGame(0.6);
let q = await info();
console.log("B0:", JSON.stringify(q));
ok(q.st === "shut" && q.shut && q.gates.every(g => !g.admits), "B: stretch " + GI + " snowed in -> the road is shut at both barriers");
ok(await J(`TLXR.status("${RID}")`) === "snowed in" && await J(`TLXCV.barred("${RID}", ${(GA + GB) / 2})`) && !(await J(`TLXCV.barred("${RID}", ${GA - 300})`)), "B: nobody turns up between the gates; outside them they still do");
const passes0 = await J(`TLXT.passes || 0`);
await ev(`(() => { TLXT.place("${RID}", ${GA} - 150, 1); TLXT.place("${RID}", ${GA} - 210, 1, 1); TLXT.place("${RID}", ${GA} - 250, 1, ${SI}, "dist"); TLXT.place("${RID}", ${GA} + 110, -1, 2); return true; })()`);
let upMax = 0, c2out = false;
await waitGame(75, async () => { const g = (await info()).gates[0], c2 = await car(2); if (c2.on && c2.s > GA - 25) upMax = Math.max(upMax, g.up); if (c2.on && c2.s < GA - 25) { c2out = true; await ev(`TLXT.cars[2].on = false; true`); }
  const a = await car(0), b = await car(1), s = await car(SI); return c2out && a.gq && b.gq && s.gq; });
let c0 = await car(0), c1 = await car(1), cs = await car(SI);
console.log("B1:", JSON.stringify({ c0, c1, cs, upMax, c2out }));
ok(c0.gq && c0.why === "gate" && c0.v < 0.05 && c0.s > GA - 9 && c0.s < GA - 6, "B: the first car stands " + (GA - c0.s).toFixed(1) + " m short of the boom (not at the drift " + Math.round(GI * 400 - GA) + " m on)");
ok(c1.gq && c1.v < 0.05 && c0.s - c1.s > 6.5 && c0.s - c1.s < 9.5, "B: the second queues " + (c0.s - c1.s).toFixed(1) + " m behind it");
ok(cs.gq && cs.v < 0.05 && cs.s < c1.s - 8 && cs.s > c1.s - 11, "B: the lorry queues behind them (its cab's middle " + (c1.s - cs.s).toFixed(1) + " m back)");
ok(c2out && upMax > 0.6, "B: a car inside drives out past the barrier, the boom lifting for it (" + upMax.toFixed(2) + ")");
const sB = [c0.s, c1.s, cs.s];
await waitGame(32);
c0 = await car(0); c1 = await car(1); cs = await car(SI); q = await info();
ok([c0, c1, cs].every((c, i) => c.on && c.st === "drive" && c.dir === 1 && !c.pass && Math.abs(c.s - sB[i]) < 0.3) && (await J(`TLXT.passes || 0`)) === passes0, "B: 32 s on, all three still wait in line: nobody turned round or pulled out");
ok(q.gates[0].up < 0.02 && q.gates[1].up < 0.02 && q.gates[0].vis, "B: both booms down (" + q.gates.map(g => g.up.toFixed(2)).join(", ") + "), the near gate drawn");
ok((await J(`TLXCV.queue("${RID}", 0)`)).length === 3, "B: the queue at the Kjøllefjord gate is three");
let ts = await toasts();
ok(ts.some(t => /barrier is down/.test(t) && /closed for the storm/.test(t) && /on the hour/.test(t)), "B: at the gate you are told the road is closed and convoys leave on the hour once plowed");
let lg = await J(`TLXR.legend()`);
ok(/Lebesby road: barrier down/.test(lg), "B: the Map legend: Lebesby road: barrier down, convoys once plowed");
if (!NOSTILLS) { await gateCam(0, 46, 7.5, 4.2); await shot("b_queue"); await gateCam(0, 12, -6, 2.4); await shot("b_boom"); await camOff(); }

// ---- C: the plow has been
await clearToasts();
const H0 = await J(`GS.hour`);
await ev(`TLXR.setSnow("${RID}", 0); true`); await waitGame(0.6);
q = await info();
console.log("C:", JSON.stringify(q));
ok(q.st === "wait" && q.at === Math.round(q.at) && q.at > H0 && q.at - H0 <= 1.21, "C: plowed -> waiting for the convoy at " + q.note + " (now " + (await J(`fmtTime(GS.hour)`)) + ")");
const tm = await J(`fmtTime(${q.at})`);
ok(q.gates.every(g => !g.admits && g.text === tm + " / next convoy"), "C: both boards read " + q.gates[0].text);
const trip = await J(`(() => { const t = TLXR.trip(P.x, P.z, SITES.find(s => s.id === "lebesby")); return t ? { why: t.why, note: t.note, w: TLXR.tripWarn(P.x, P.z, SITES.find(s => s.id === "lebesby")) } : null; })()`);
ok(trip && trip.why === "convoy" && trip.w === "Lebesby road: convoy " + tm, "C: a trip to Lebesby warns \"" + (trip && trip.w) + "\"");
lg = await J(`TLXR.legend()`);
ok(lg.includes("Lebesby road: convoy " + tm), "C: the Map legend gives the convoy time");
await waitGame(1.2); ts = await toasts();
ok(ts.some(t => t.includes("next convoy leaves at " + tm)), "C: a toast at the gate gives the time");
c0 = await car(0);
ok(c0.gq && Math.abs(c0.s - sB[0]) < 0.3, "C: the queue waits on");
const paint = await J(`(() => { const cv = mapBg, g = cv.getContext("2d"), q = TLXCV.info("${RID}").gates[0], d = g.getImageData(Math.round((q.x + HALF) * M2SRC), Math.round((q.z + HALF) * M2SRC), 1, 1).data; return [d[0], d[1], d[2]]; })()`);
ok(paint[0] > 180 && paint[1] < 90 && paint[2] < 90, "C: a red dot on the Map's chart at the gate (" + paint.join(",") + ")");

// ---- D: convoy time
await ev(`TLXT.place("${RID}", ${GB} + 140, -1, 3); true`);
await waitGame(30, async () => (await car(3)).gq);
const c3s = (await car(3)).s;
ok((await car(3)).gq && c3s > GB + 6 && c3s < GB + 9, "D: a car heading the other way waits at the Lebesby gate (" + (c3s - GB).toFixed(1) + " m out)");
await clearToasts();
await ev(`GS.hour = ${q.at} - 0.004; true`);
await waitGame(4, async () => (await info()).st === "run");
q = await info();
console.log("D0:", JSON.stringify(q), JSON.stringify(await J(`TLXCV.members("${RID}")`)));
ok(q.st === "run" && q.dir === 1 && q.gates[0].admits && !q.gates[1].admits, "D: on the hour the convoy leaves from the longer queue's side (Kjøllefjord), the far boom stays down");
const mem = await J(`TLXCV.members("${RID}")`);
ok(mem.length === 3 && [0, 1, SI].every(i => mem.includes(i)), "D: the three that queued are the line");
ok(q.gates[0].text === "NOW / convoy leaving" && q.gates[1].text === "WAIT / convoy coming", "D: the boards: " + q.gates.map(g => g.text).join(" | "));
let vMax = 0, vFol = 0, shotDone = NOSTILLS;
await waitGame(30, async () => { vMax = Math.max(vMax, (await car(0)).v); for (const i of [1, SI]) vFol = Math.max(vFol, (await car(i)).v);
  if (!shotDone && (await car(1)).s > GA + 4) { shotDone = true; await gateCam(0, 30, 7, 4.2); await shot("d_leaving"); await camOff(); } return false; });
c0 = await car(0); c1 = await car(1); cs = await car(SI); const c3 = await car(3); q = await info();
console.log("D1:", JSON.stringify({ s: [c0.s - GA, c1.s - GA, cs.s - GA], v: [c0.v, c1.v, cs.v], vMax, c3 }));
ok(vMax > 8 && vMax <= 10.05 && vFol <= 12.05, "D: the line keeps to 36 km/h (the lead's fastest " + vMax.toFixed(2) + " m/s; one closing up behind " + vFol.toFixed(2) + ")");
ok(c0.s - c1.s >= 25 && c0.s - c1.s < 62, "D: the second car is " + (c0.s - c1.s).toFixed(1) + " m behind the first");
// a minute on, through the bends below the fell (everyone slows for them in turn): never closer than the gap, still one line
await waitGame(26);
{ const a = await car(0), b = await car(1), s = await car(SI); console.log("D2:", JSON.stringify({ gap1: a.s - b.s, gap2: b.s - s.s, v: [a.v, b.v, s.v] }));
  ok(a.s - b.s > 27 && a.s - b.s < 62, "D: a minute on the second car is " + (a.s - b.s).toFixed(1) + " m behind the first");
  ok(b.s - s.s > 28 && b.s - s.s < 130 && s.cv, "D: the lorry (slower out of every bend) has its cab " + (b.s - s.s).toFixed(1) + " m behind the second car, still in the line"); }
ok(c0.s > GA + 100 && c0.cv && c1.cv, "D: the line is through the gate and away (lead " + (c0.s - GA).toFixed(0) + " m in)");
ok(c3.gq && Math.abs(c3.s - c3s) < 0.3, "D: the car at the far gate has not moved");
ts = await toasts(); console.log("D toasts:", JSON.stringify(ts));
ok(ts.some(t => /barrier lifts/.test(t) && /convoy for Lebesby/.test(t) && /36 km\/h/.test(t)), "D: at the gate: the barrier lifts, the convoy for Lebesby, 36 km/h, 30 metres apart");

// ---- E: the line arrives (moved up to the far gate to save ten minutes), the return convoy, open
await ev(`(() => { const T = TLXT; T.cars[0].s = ${GB} - 70; T.cars[1].s = ${GB} - 105; T.cars[${SI}].s = ${GB} - 150; return true; })()`);
await you(1);
let back = false;
await waitGame(60, async () => { for (const i of [0, 1, SI]) { const c = await car(i); if (c.on && c.s > GB + 16) await ev(`TLXT.cars[${i}].on = false; true`); } const g = await info(); back = g.st === "run" && g.dir === -1; return back; });
q = await info(); const mem2 = await J(`TLXCV.members("${RID}")`);
console.log("E0:", JSON.stringify(q), JSON.stringify(mem2));
ok(back && q.back && q.gates[1].admits && !q.gates[0].admits && mem2.length === 1 && mem2[0] === 3, "E: the line through, the return convoy leaves from Lebesby with the car that waited");
await waitGame(8, async () => (await car(3)).v > 2);
ok((await car(3)).v > 2 && (await car(3)).s < c3s - 1, "E: it drives in under the raised boom");
if (!NOSTILLS) { await gateCam(1, 26, 7, 4); await shot("e_return"); await camOff(); }
await clearToasts();
await you(0);
await ev(`TLXT.cars[3].s = ${GA} + 50; true`);
await waitGame(30, async () => (await info()).st === "open");
await waitGame(2.5);
q = await info();
console.log("E1:", JSON.stringify(q));
ok(q.st === "open" && q.runs >= 2 && q.gates.every(g => g.admits && g.up > 0.95 && g.text === "OPEN"), "E: the return convoy through -> the road is open, both booms up, boards read OPEN");
ok(!/barrier|convoy/.test(await J(`TLXR.legend()`)) && (await J(`TLXR.trip(P.x, P.z, SITES.find(s => s.id === "lebesby"))`)) === null, "E: legend and trip warning clear");
ts = await toasts();
ok(ts.some(t => /barrier is up/.test(t)), "E: at the gate: the barrier is up, the road is open");
if (!NOSTILLS) { await gateCam(0, 24, 6, 3.6); await shot("e_open"); await camOff(); }

// ---- F: the option off
await ev(`(() => { TLX.setOn("convoy", false); for (const c of TLXT.cars) c.on = false; return true; })()`);
const GI2 = await J(`(() => { const seg = TLXR.ROADS.seg, gi = Math.ceil(${GA} / seg); TLXR.setSnow("${RID}", 1, gi); return gi; })()`);
await ev(`TLXT.place("${RID}", ${GA} - 60, 1); true`);
let Fstop = null;
await waitGame(60, async () => { const c = await car(0); if (c.s > GA && c.v < 0.2 && c.why === "shut") Fstop = c; return !!Fstop; });
q = await info();
console.log("F:", JSON.stringify({ q: q.st, vis: q.gates.map(g => g.vis), Fstop, edge: GI2 * 400 }));
ok(q.st === "open" && q.gates.every(g => !g.vis) && (await J(`TLXCV.stopFor("${RID}", ${GA} - 60, 1)`)) === null && (await J(`TLXCV.legend()`)) === "", "F: option off: no barrier, no gates drawn, nothing in the legend");
ok(Fstop && Fstop.s > GA && Math.abs(GI2 * 400 - 22 - Fstop.s) < 3, "F: the car drives past where the gate was and stops at the drift as before (" + (Fstop ? (GI2 * 400 - Fstop.s).toFixed(1) : "?") + " m short)");
await ev(`TLX.setOn("convoy", true); true`); await waitGame(0.8);
q = await info();
ok(q.st === "shut" && q.gates[0].vis, "F: on again: the barrier is down, the gate drawn");

// ---- G: night lamps, and a reload
await ev(`(() => { for (const c of TLXT.cars) c.on = false; GS.hour = Math.floor(GS.hour / 24) * 24 + 23.2; return true; })()`); await waitGame(1.5);
await ev(`TLXR.setSnow("${RID}", 1, ${GI}); true`); await waitGame(2.5);
const lampSeen = new Set(); let lampK = 0;
await waitGame(3, async () => { const g = await J(`(() => { const G = TLXCV.roads.find(r => r.id === "${RID}").gates[0]; return { on: G.lampOn, k: Math.max(G.lamps[0].color.r, G.lamps[1].color.r), dim: Math.min(G.lamps[0].color.r, G.lamps[1].color.r) }; })()`); lampSeen.add(g.on); lampK = Math.max(lampK, g.k); return false; });
q = await info();
ok(q.st === "shut" && lampSeen.has(0) && lampSeen.has(1) && lampK > 1.5, "G: after dark the two red lamps flash in turn (brightness " + lampK.toFixed(2) + ")");
if (!NOSTILLS) { await gateCam(0, 16, 4, 2.6); await shot("g_night"); await camOff(); }
const errs0 = await J(`({ e: TLXCV.err, t: TLXCV.tickErr || null, te: TLXT.tickErr || null, re: TLXR.tickErr || null })`);
ok(!errs0.e && !errs0.t && !errs0.te && !errs0.re, "no convoy / traffic / roads tick error through A-G " + JSON.stringify(errs0));
await reload();
await ev(setup); await sleep(1500);
q = await info();
const errs = await J(`({ e: TLXCV.err, t: TLXCV.tickErr || null, te: TLXT.tickErr || null, re: TLXR.tickErr || null })`);
console.log("G:", JSON.stringify(q.st), JSON.stringify(errs));
ok(q.st === "shut" && q.gates.every(g => !g.admits), "G: reloaded with the road snowed in: the barrier is down again");
ok(!errs.e && !errs.t && !errs.te && !errs.re, "no convoy / traffic / roads tick error");

console.log(fails ? `\nFAILED: ${fails}` : "\nall passed");
await done(fails ? 1 : 0);
