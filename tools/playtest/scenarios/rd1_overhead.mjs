// RD1: overhead stills of the places and of two stretches between them (for the "RD plan: roads re-placed" section of
// loop/REALISM.md), plus a data dump (plan.json): what runs where today. Not an assert scenario.
//   tools/playtest/run.sh tools/playtest/scenarios/rd1_overhead.mjs <outdir>
import { boot, ev, shot, sleep, done } from "../lib.mjs";
import fs from "node:fs";
await boot();
await ev("tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; WX.at = () => 0; GS.storm = 0; QG.on = false; QG.apply && QG.apply(0); renderer.setPixelRatio(1.5); true");
await sleep(800);
await ev(`(() => { if (!window.__camHk) { window.__camHk = 1; const rr = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv && s === scene) window.camOv(c); rr(s, c); }; } return true; })()`);
await ev(`(() => { const D = Math.round((Date.UTC(2027, 2, 1) - CAL_EPOCH) / 864e5); const k = Math.floor(GS.hour / 24); GS.hour = k * 24 + 12; CAL.off = (D - k) * 24; CAL.dc = null; CAL.lastDay = CAL.dayIndex(); meltBoot(); return true; })()`);
await sleep(2500);
const plan = JSON.parse(await ev(`JSON.stringify((() => {
  const place = id => id === "depot" ? depot : SITES.find(s => s.id === id);
  const near = (p, r) => KIT.doors.filter(d => Math.hypot(d.x - p.x, d.z - p.z) < r).length;
  const out = { places: {}, routes: [], stations: STATIONS.map(s => ({ id: s.id, x: Math.round(s.x), z: Math.round(s.z) })) };
  for (const id of ["depot", "mehamn", "gamvik", "dyfjord", "lebesby", "skjanes", "ifjord", "windfarm", "relay"]) { const p = place(id); if (!p) continue;
    const cl = p.clear || 40, rs = TLXR.routes.map(r => { let md = 1e9; for (const q of r.pts) md = Math.min(md, Math.hypot(q[0] - p.x, q[1] - p.z)); return [r.id, Math.round(md)]; }).filter(a => a[1] < 400);
    out.places[id] = { x: Math.round(p.x), z: Math.round(p.z), name: p.name, kind: p.kind, clear: p.clear, doors: near(p, cl + 40), routes: rs, sea: [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => { for (let d = 10; d < 400; d += 10) if (isSea(p.x + a * d, p.z + b * d)) return d; return null; }) }; }
  for (const r of TLXR.routes) { const g = TLXR.grades(r.pts).sort((a, b) => a - b); out.routes.push({ id: r.id, name: r.name, len: Math.round(r.len), closed: r.closed, ends: r.ends, p50: +g[Math.floor(g.length / 2)].toFixed(3), p95: +g[Math.floor(g.length * 0.95)].toFixed(3), max: +g[g.length - 1].toFixed(3), segs: r.segs.map(s => [s.street ? "street" : "road", s.pts.length * 6]), start: r.pts[0].map(Math.round), end: r.pts[r.pts.length - 1].map(Math.round) }); }
  out.town = { lines: TOWNG.lines, X: TOWNG.X, Z: TOWNG.Z, HW: TOWNG.HW, depot: [depot.x, depot.z], doors: KIT.doors.filter(d => Math.hypot(d.x - depot.x, d.z - depot.z) < 160).length };
  out.sites = SITES.filter(s => s.x !== undefined).map(s => [s.id, s.kind, Math.round(s.x), Math.round(s.z)]);
  return out; })())`));
fs.writeFileSync(process.env.OUT + "/plan.json", JSON.stringify(plan, null, 1));
console.log("places", Object.keys(plan.places).join(","));
const eye = async (name, cx, cz, back, up, lookAhead = 0) => { await ev(`window.camOv = c => { const x = ${cx}, z = ${cz + back}; c.position.set(x, surf(${cx}, ${cz}) + ${up}, z); c.lookAt(${cx}, surf(${cx}, ${cz}) + 0, ${cz + lookAhead}); }; true`); await sleep(2600); await shot(name); };
// park the sled at each place so the chunks and the snow around it are live
const go = async (x, z) => { await ev(`(() => { crashCancel(); FOOT.on = false; VEH.cur = null; P.x = ${x}; P.z = ${z}; P.y = surf(${x}, ${z}) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); window.camOv = null; camState.init = false; return true; })()`); await sleep(2500); await ev("TLXRK.fillAll && TLXRK.fillAll(); true"); await sleep(600); };
for (const [id, p] of Object.entries(plan.places)) {
  if (!["depot", "mehamn", "gamvik", "dyfjord", "lebesby"].includes(id)) continue;
  await go(p.x, p.z);
  await eye("place_" + id + "_wide", p.x, p.z, 230, 260, -40);
  await eye("place_" + id + "_close", p.x, p.z, 110, 120, -20);
}
// two stretches between places: the middle of fv888 on the coast side and the Lebesby road's switchbacks
const st = JSON.parse(await ev(`JSON.stringify((() => { const out = {}; const mid = (id, f) => { const r = TLXR.routes.find(q => q.id === id), p = r.pts[Math.floor(r.pts.length * f)]; return [Math.round(p[0]), Math.round(p[1])]; };
  out.fv888 = mid("fv888", 0.5); out.lebesby = mid("lebesby", 0.55); out.skjanes = mid("skjanes", 0.5);
  // the tightest bend of the lebesby road
  const r = TLXR.routes.find(q => q.id === "lebesby"); let bi = 0, br = 1e9; for (let i = 3; i < r.pts.length - 3; i++) { const t = TLXR.turnR ? TLXR.turnR(r.pts, i) : 1e9; if (t < br) { br = t; bi = i; } } out.lebesbyBend = [Math.round(r.pts[bi][0]), Math.round(r.pts[bi][1]), Math.round(br)];
  return out; })())`));
console.log("stretches", JSON.stringify(st));
plan.stretches = st; fs.writeFileSync(process.env.OUT + "/plan.json", JSON.stringify(plan, null, 1));
for (const [n, p] of [["fv888", st.fv888], ["lebesby", st.lebesby], ["lebesbyBend", st.lebesbyBend], ["skjanes", st.skjanes]]) { await go(p[0], p[1]); await eye("stretch_" + n + "_wide", p[0], p[1], 210, 240, -30); await eye("stretch_" + n + "_close", p[0], p[1], 70, 80, -10); }
await ev("window.camOv = null; true");
await done();
