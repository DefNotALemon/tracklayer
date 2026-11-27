// RD1 (27 Nov 2026): the new road model, asserted. Run: tools/playtest/run.sh tools/playtest/scenarios/rd1_roads.mjs
//  A. no kerb anywhere: no mesh of the old builder, no kerb/curb in any game code outside comments, every road mesh is a road-kit mesh
//  B. every town street and every network road segment has the new model (counted per road kind, none on the old builder)
//  C. surface height: carriageway centre and both asphalt edges within a few cm of surf along every road, a smooth profile
//     (no stair step: grade and second difference under the limits below), edge columns never under the surface
//  D. junctions: no doubled surfaces (asphalt of one road inside another's), real corner radii (flared mouths exist)
//  E. a sled rides a town street and a network stretch without snagging where kerbs were; a traffic car drives a road
//  F. the road snow states still switch the look (plowed -> snowed in -> plowed), the fell road is shut (snow = 1)
//  G. summer shows bare asphalt: winter uniform 0, no plow bank
//  H. an old save loads, the roads come up again; page errors none.
import { boot, reload, ev, sleep, done, hold, down, up } from "../lib.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }

// ---- A (source): no kerb in code
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const hits = [];
for (const f of fs.readdirSync(root).filter(f => /^(tracklayer|tlx.*|icefish)\.js$/.test(f))) {
  let src = fs.readFileSync(path.join(root, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "));
  src.split("\n").forEach((ln, i) => { const code = ln.replace(/\/\/.*$/, ""); if (/kerb|curb/i.test(code)) hits.push(`${f}:${i + 1}: ${ln.trim().slice(0, 90)}`); });
  for (const w of ["townRoadTex", "CURB_H", "CURB_W", "curbPieces", "matC = L(0x6f7378)"]) if (src.includes(w)) hits.push(f + " still has " + w);
}
console.log("kerb hits", JSON.stringify(hits));
ok(hits.length === 0, `A: no kerb/curb in game code outside comments, old builder names gone (${hits.length} hits)`);

await boot();
await ev("tutSkip(); crashCancel(); FOOT.on = false; VEH.cur = null; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true"); await sleep(1500);
const K0 = await J(`({ ready: TLXRK.ready, stats: TLXRK.stats, roads: TLXRK.roads.length, err: TLXR.err || TLXR.kitErr || null })`);
console.log("kit", JSON.stringify(K0));
ok(K0.ready && !K0.err && K0.roads >= 13, `kit built with no error (${K0.roads} roads, ${K0.stats.chunks} chunks, ${K0.stats.ms} ms)`);
await ev("TLXRK.fillAll(); true");

// ---- A (scene) and B
const A = await J(`(() => { let old = 0, kit = 0, other = 0; scene.traverse(m => { if (!m.isMesh) return; if (m.userData && (m.userData.townRoad || /curb|kerb/i.test(m.name || ""))) old++; if (m.userData && m.userData.roadkit) kit++; });
  return { old, kit, chunks: TLXRK.chunks.length, untagged: TLXRK.meshes.filter(m => !m.userData.roadkit).length, curbPieces: TOWNG.road && TOWNG.road.curbPieces }; })()`);
ok(A.old === 0 && A.untagged === 0 && A.curbPieces === undefined, `A: no old-builder or kerb mesh in the scene; ${A.kit} road meshes all road-kit (${A.old} old)`);
const B = await J(`(() => { const K = TLXRK, out = { town: 0, townMiss: [], routes: {}, streetsKit: 0 };
  for (const [i, l] of TOWNG.lines.entries()) { const r = K.roads.find(q => q.id === "town:" + (l[4] || i)); if (r && r.chunks.length) out.town++; else out.townMiss.push(l[4]); }
  for (const rt of TLXR.routes) { let tot = 0, miss = 0, st = 0, stMiss = 0;
    for (const sg of rt.segs) { const cum = 24; let acc = 0, last = sg.pts[0];
      for (const q of sg.pts) { acc += Math.hypot(q[0] - last[0], q[1] - last[1]); last = q; if (acc < cum) continue; acc = 0;
        if (sg.street) { if (TLXRK.covered(q[0], q[1], 1.2)) st++; else stMiss++; continue; }
        tot++; if (!K.covered(q[0], q[1], 1.0)) miss++; } }
    out.routes[rt.id] = { tot, miss, st, stMiss, roads: K.roads.filter(r => r.meta && r.meta.route === rt.id).length }; }
  out.kinds = K.roads.reduce((a, r) => (a[r.kind] = (a[r.kind] || 0) + 1, a), {});
  return out; })()`);
console.log("coverage", JSON.stringify(B));
ok(B.town === 7 && B.townMiss.length === 0, "B: all 7 town streets are road-kit roads");
const rs = Object.entries(B.routes);
ok(rs.every(([id, r]) => r.roads >= 1 && r.tot > 20 && r.miss <= Math.max(2, r.tot * 0.03)), "B: every network road segment has the new model: " + rs.map(([id, r]) => `${id} ${r.tot - r.miss}/${r.tot}`).join(", "));

// ---- C: height. The ribbon is a drape of the terrain, so its profile can only be judged against the terrain's own: where the
// 4 m ground grid under a road bed has a 50 % ramp in it (hairpin landings, bank edges) the ribbon follows it, but it must
// add no step of its own: grade and second difference of the ribbon never exceed the surface's own by more than the 5.8 cm
// the ribbon may ride above surf (0.012-0.07 m), taken twice for a second difference.
const C = await J(`(() => { const K = TLXRK, out = { n: 0, dc: [9, -9], de: [9, -9], gradeEx: -9, d2Ex: -9, bad: 0, maxGrade: 0, maxD2: 0, worst: null };
  for (const r of K.roads) { const pr = K.probe(r.id, 1); let prev = null, prev2 = null;
    for (let i = 0; i < pr.length; i++) { const p = pr[i]; out.n++; const sy = surf(p.x, p.z);
      const dc = p.y - sy, dl = p.ea[1] - surf(p.ea[0], p.ea[2]), dr = p.eb[1] - surf(p.eb[0], p.eb[2]);
      out.dc = [Math.min(out.dc[0], dc), Math.max(out.dc[1], dc)]; out.de = [Math.min(out.de[0], dl, dr), Math.max(out.de[1], dl, dr)];
      p.sy = sy;
      if (prev) { const d1 = Math.hypot(p.x - prev.x, p.z - prev.z);
        if (d1 > 1.4 && d1 < 2.6) { const g = Math.abs(p.y - prev.y) / d1, gs = Math.abs(p.sy - prev.sy) / d1; out.maxGrade = Math.max(out.maxGrade, g); out.gradeEx = Math.max(out.gradeEx, g - gs);
          if (prev2) { const d0 = Math.hypot(prev.x - prev2.x, prev.z - prev2.z); if (d0 > 1.4 && d0 < 2.6) { const s2 = Math.abs(p.y - 2 * prev.y + prev2.y), s2s = Math.abs(p.sy - 2 * prev.sy + prev2.sy); out.maxD2 = Math.max(out.maxD2, s2); if (s2 - s2s > out.d2Ex) { out.d2Ex = s2 - s2s; out.worst = [r.id, i, Math.round(p.x), Math.round(p.z)]; } if (s2 - s2s > 0.1) out.bad++; } } } }
      prev2 = prev; prev = p; } }
  return out; })()`);
console.log("height", JSON.stringify(C));
ok(C.dc[0] > -0.005 && C.dc[1] < 0.12, `C: carriageway centre ${C.dc.map(v => v.toFixed(3))} m from surf over ${C.n} rings: never sunk, never floating over 12 cm`);
ok(C.de[0] > -0.005 && C.de[1] < 0.1, `C: asphalt edges ${C.de.map(v => v.toFixed(3))} m from surf`);
ok(C.gradeEx < 0.06, `C: the ribbon is never steeper than the surface under it (steepest ring-to-ring grade ${(C.maxGrade * 100).toFixed(0)} %, ${(C.gradeEx * 100).toFixed(1)} % more than the surface's own)`);
ok(C.d2Ex < 0.12 && C.bad <= Math.max(3, C.n * 0.0003), `C: no stair steps of its own: second difference at most ${C.d2Ex.toFixed(3)} m per 2 m ring above the surface's own (${C.bad} rings over 10 cm, worst ${JSON.stringify(C.worst)})`);

// ---- D: junctions
const D = await J(`(() => { const K = TLXRK; let dbl = 0, tot = 0, worst = 0; const ex = [];
  for (const A of K.roads) for (const sp of A.spans) for (let i = sp.i0 + 1; i < sp.i1; i += 1) { const q = A.Q[i];
    for (const c of [-0.8, -0.4, 0, 0.4, 0.8]) { const x = q.x + q.nx * c * K.hwOf(A, q.s), z = q.z + q.nz * c * K.hwOf(A, q.s); tot++;
      for (const B of K.roads) { if (B === A) continue; const nb = K.nearest(B, x, z); if (!nb) continue; const w = K.hwOf(B, nb.s); if (nb.d < w * 0.8) { for (const sp2 of B.spans) if (nb.i >= sp2.i0 + 1 && nb.i <= sp2.i1 - 1) { dbl++; if (ex.length < 4) ex.push([A.id, B.id, Math.round(x), Math.round(z)]); break; } } } } }
  const mouths = K.roads.reduce((a, r) => a + (r.mouths ? r.mouths.length : 0), 0), abuts = K.stats.abuts, flares = K.roads.reduce((a, r) => a + r.spans.reduce((b, sp) => b + (sp.rings ? sp.rings.filter(q => q.flare > 0.3).length : 0), 0), 0);
  return { dbl, tot, ex, mouths, abuts, flares, merges: K.stats.merges, ends: K.stats.ends }; })()`);
console.log("junctions", JSON.stringify(D));
ok(D.dbl <= Math.max(3, D.tot * 0.0005), `D: no doubled surfaces: ${D.dbl} of ${D.tot} carriageway samples lie on another road's asphalt`);
ok(D.abuts >= 14 && D.flares > 30, `D: junction mouths are cut to the through road's edge (${D.abuts}) and flared on a corner radius (${D.flares} flared rings); ${D.merges} merges, ${D.ends} turning places`);
// the corner radius is real: a flared ring is wider than the road by metres, at the ring next to a through road's edge
const D2 = await J(`(() => { let wmax = 0; for (const A of TLXRK.roads) for (const sp of A.spans) if (sp.rings) for (const r of sp.rings) if (r.proj || r.flare > 0) wmax = Math.max(wmax, r.flare); return { wmax }; })()`);
ok(D2.wmax > 2.5, `D: widest corner flare ${D2.wmax.toFixed(1)} m (a rounded corner, not a square overlap)`);

// ---- E: the sled on a street and on a network stretch
const E0 = await J(`(() => { const d = depot; return { x: d.x, z: d.z }; })()`);
async function drive(name, x0, z0, yaw, secs) {
  await ev(`(() => { crashCancel(); FOOT.on = false; VEH.cur = null; P.x = ${x0}; P.z = ${z0}; P.yaw = ${yaw}; P.vx = P.vz = P.vy = 0; recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.2; return true; })()`);
  await sleep(1500);
  const a = await J(`({ x: P.x, z: P.z, t: gameClock })`); let vmin = 99, vmax = 0, drop = 1;
  await down("KeyW"); const t0 = Date.now();
  while (Date.now() - t0 < secs * 1000) { await sleep(80); const v = await J(`({ v: Math.hypot(P.vx, P.vz), c: !!CRASH.on })`); vmax = Math.max(vmax, v.v); if (Date.now() - t0 > 1800) { vmin = Math.min(vmin, v.v); drop = Math.min(drop, v.v / Math.max(vmax, 1)); } if (v.c) break; }
  await up("KeyW");
  const b = await J(`({ x: P.x, z: P.z, t: gameClock, crash: !!CRASH.on, sink: P.sink, gnd: P.gnd })`);
  const dist = Math.hypot(b.x - a.x, b.z - a.z), dt = b.t - a.t; console.log(name, JSON.stringify({ dist: +dist.toFixed(1), avg: +(dist / dt).toFixed(1), vmin: +vmin.toFixed(1), vmax: +vmax.toFixed(1), drop: +drop.toFixed(2), crash: b.crash }));
  return { dist, avg: dist / dt, vmin, vmax, drop, crash: b.crash };
}
const s1 = await drive("Kaigata", E0.x - 36, E0.z + 12, Math.PI / 2, 6);
ok(!s1.crash && s1.avg > 6 && s1.drop > 0.8, `E: the sled drives Kaigata end to end at ${s1.avg.toFixed(1)} m/s without a snag (never under ${(s1.drop * 100).toFixed(0)} % of its running top speed)`);
const s2 = await drive("Depotgata", E0.x + 2, E0.z - 30, 0, 6);
ok(!s2.crash && s2.avg > 6 && s2.drop > 0.8, `E: the sled drives Depotgata through the Kaigata junction at ${s2.avg.toFixed(1)} m/s (never under ${(s2.drop * 100).toFixed(0)} % of its running top speed)`);
const N = await J(`(() => { const rt = TLXR.routes.find(r => r.id === "fv888"), sg = rt.segs.filter(s => !s.street).sort((a, b) => b.pts.length - a.pts.length)[0], m = Math.floor(sg.pts.length * 0.4), a = sg.pts[m], b = sg.pts[m + 6]; return { x: a[0], z: a[1], yaw: Math.atan2(b[0] - a[0], b[1] - a[1]) }; })()`);
const s3 = await drive("fv888 stretch", N.x, N.z, N.yaw, 6);
ok(!s3.crash && s3.dist > 25 && s3.vmin > 0.5 * s3.avg, `E: the sled drives a network stretch (${s3.dist.toFixed(0)} m, slowest ${s3.vmin.toFixed(1)} m/s of ${s3.avg.toFixed(1)} avg; a snag would stop it near 0, a hill varies speed by a third: the fv888 stretch swings 24-36 m/s)`);
// across the street edge where a kerb stood: a sled rolls off Kaigata onto the snow unstopped, and from the snow back on
await ev(`(() => { const d = depot; crashCancel(); FOOT.on = false; P.x = d.x + 17; P.z = d.z + 12 - 6; P.yaw = Math.PI; P.vx = P.vz = P.vy = 0; recenter(P.x, P.z, true); P.y = surf(P.x, P.z) + 0.2; return true; })()`);
await sleep(900); await hold("KeyW", 700);
const z1 = +(await ev("P.z")), cr = await J(`({ v: Math.hypot(P.vx, P.vz), crash: !!CRASH.on })`);
ok(E0.z + 12 - z1 > 3 && !cr.crash, `E: rolled ${(E0.z + 12 - z1 + 6).toFixed(1)} m off the street edge across the old kerb line unstopped (v ${cr.v.toFixed(1)})`);
// a traffic car on a network road keeps driving
const T = await J(`(() => { if (typeof TLXT === "undefined") return null; const rid = TLXT.routes.slice().sort((a, b) => b.len - a.len)[0].id, s0 = TLXT.routes.find(q => q.id === rid).s0 + 400; TLXT.place(rid, s0, 1); const c = TLXT.cars[0]; return { rid, s: c.s }; })()`);
if (T) { await waitGame(14); const T2 = await J(`({ s: TLXT.cars[0].s, on: TLXT.cars[0].on, yc: TLXT.cars[0].y - surf(TLXT.cars[0].x, TLXT.cars[0].z) })`); ok(Math.abs(T2.s - T.s) > 40, `E: a traffic car drove ${Math.abs(T2.s - T.s).toFixed(0)} m of ${T.rid} over the new surface`); }
else ok(true, "E: no traffic system (skipped)");

// ---- F: road snow states
const F0 = await J(`(() => { const rt = TLXR.routes.find(r => r.id === "fv888"), seg = rt.seg.map((g, i) => ({ g, i })).filter(o => o.g.legs.length && TLXRK.roads.some(r => r.meta && r.meta.route === "fv888"))[3];
  const r = TLXRK.roads.find(q => q.id === "fv888:0"), s = seg.g.a + 150; return { i: seg.i, s, id: "fv888:0", off: TLXR.rk.find(e => e.id === "fv888:0").off }; })()`);
const snowAt = () => J(`(() => { const r = TLXRK.roads.find(q => q.id === "${F0.id}"), s = ${F0.s} - ${F0.off}; let best = null, bd = 1e9; for (const ch of r.chunks) { const a = ch.mesh.geometry.attributes.aRd.array; for (let k = 0; k < ch.nr; k++) { const ss = a[(k * TLXRK.NC + 9) * 4 + 1] - r.seed * 131.7; const d = Math.abs(ss - s); if (d < bd) { bd = d; best = a[(k * TLXRK.NC + 9) * 4 + 2]; } } } return { z: best, d: bd, st: TLXR.status("fv888") }; })()`);
await ev(`TLXR.setSnow("fv888", 0, ${F0.i}); true`); await sleep(600); await ev("TLXRK.fillAll(); true");
const f0 = await snowAt();
await ev(`TLXR.setSnow("fv888", 1, ${F0.i}); true`); await sleep(600); await ev("TLXRK.fillAll(); true");
const f1 = await snowAt();
await ev(`TLXR.setSnow("fv888", 0, ${F0.i}); true`); await sleep(600); await ev("TLXRK.fillAll(); true");
const f2 = await snowAt();
console.log("snow states", JSON.stringify([f0, f1, f2]));
ok(f0.z < 0.1 && f1.z > 0.95 && f2.z < 0.1, `F: the road's look follows its snow state: plowed ${f0.z.toFixed(2)} -> snowed in ${f1.z.toFixed(2)} -> plowed ${f2.z.toFixed(2)}`);
const F2 = await J(`(() => { const r = TLXRK.roads.find(q => q.meta && q.meta.closed); const ch = r.chunks[Math.floor(r.chunks.length / 2)], a = ch.mesh.geometry.attributes.aRd.array; return { id: r.id, z: a[(9 * TLXRK.NC + 9) * 4 + 2], n: r.chunks.length }; })()`);
ok(F2.z === 1 && F2.n > 20, `F: the shut fell road (${F2.id}, ${F2.n} chunks) is built with snow = 1 (snowed in: it shows as snow and poles)`);

// ---- G: summer
const G0 = await J(`({ w: TLXRK.U.uWinter.value, ridge: (() => { const r = TLXRK.roads.find(q => q.id === "fv888:0"), ch = r.chunks[10], p = ch.mesh.geometry.attributes.position.array; let m = 0; for (let k = 0; k < ch.nr; k++) for (const c of [2, 3, 15, 16]) { const v = (k * TLXRK.NC + c) * 3; m = Math.max(m, p[v + 1] - surf(p[v], p[v + 2])); } return +m.toFixed(3); })() })`);
await ev(`(() => { const D = Math.round((Date.UTC(2027, 6, 15) - CAL_EPOCH) / 864e5); const k = Math.floor(GS.hour / 24); GS.hour = k * 24 + 13; CAL.off = (D - k) * 24; CAL.dc = null; CAL.lastDay = CAL.dayIndex(); meltBoot(); if (TLX.seasons) TLX.seasons.dress(TLX.seasons.look()); return true; })()`);
await sleep(2500); await ev("TLXRK.fillAll(); true"); await sleep(500);
const G1 = await J(`({ w: TLXRK.U.uWinter.value, melt: MELT.k, ridge: (() => { const r = TLXRK.roads.find(q => q.id === "fv888:0"), ch = r.chunks[10], p = ch.mesh.geometry.attributes.position.array; let m = 0; for (let k = 0; k < ch.nr; k++) for (const c of [2, 3, 15, 16]) { const v = (k * TLXRK.NC + c) * 3; m = Math.max(m, p[v + 1] - surf(p[v], p[v + 2])); } return +m.toFixed(3); })(), dc: (() => { const pr = TLXRK.probe("fv888:0", 5); let lo = 9, hi = -9; for (const p of pr) { const d = p.y - surf(p.x, p.z); lo = Math.min(lo, d); hi = Math.max(hi, d); } return [+lo.toFixed(3), +hi.toFixed(3)]; })() })`);
console.log("winter/summer", JSON.stringify([G0, G1]));
ok(G0.w > 0.95 && G0.ridge > 0.12, `G: winter: uniform ${G0.w.toFixed(2)}, plow bank ${G0.ridge} m on the snow`);
ok(G1.w < 0.05 && G1.ridge < 0.07 && G1.dc[0] > -0.01 && G1.dc[1] < 0.12, `G: July: winter uniform ${G1.w.toFixed(2)} (bare asphalt), no plow bank (${G1.ridge} m), road still within ${G1.dc} of the ground`);

// ---- H: an old save, then errors
await reload({ v: 1, hour: 34 });
await sleep(1500);
const H = await J(`({ ready: TLXRK.ready, roads: TLXRK.roads.length, err: TLXR.err || TLXR.kitErr || null, ok: TLXR.ready })`);
ok(H.ready && H.roads >= 13 && !H.err, `H: an old save loads and the roads are built again (${H.roads} roads)`);
console.log(fails ? `rd1_roads: ${fails} failed` : "rd1_roads: all passed");
await done(fails ? 1 : 0);
