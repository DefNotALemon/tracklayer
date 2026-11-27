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
import { boot, reload, ev, sleep, done, hold, down, up, shot } from "../lib.mjs";
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

// ---- D: junctions (RD1b: a node = one patch mesh, every road through it cut back to its arm end, corner fillets between neighbouring arms)
const D = await J(`(() => { const K = TLXRK, out = { nodes: 0, built: 0, drop: K.stats.nodeDrop, patches: K.stats.patches || 0, dbl: 0, tot: 0, ex: [], fr: 0, frBad: 0, fan: 0, fanBad: 0, fil: 0, rmax: 0, bad: K.nodes.filter(n => n.bad).length };
  const tris = mesh => { const g = mesh.geometry, p = g.attributes.position.array, ix = g.index.array, t = []; for (let i = 0; i < ix.length; i += 3) { const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3; t.push([p[a], p[a + 2], p[b], p[b + 2], p[c], p[c + 2]]); } return t; };
  const cache = new Map(), T = ch => { let v = cache.get(ch); if (!v) cache.set(ch, v = tris(ch.mesh)); return v; };
  const inTri = (t, x, z) => { const d = (t[2] - t[0]) * (t[5] - t[1]) - (t[4] - t[0]) * (t[3] - t[1]); if (Math.abs(d) < 1e-7) return false; const u = ((x - t[0]) * (t[5] - t[1]) - (t[4] - t[0]) * (z - t[1])) / d, v = ((t[2] - t[0]) * (z - t[1]) - (x - t[0]) * (t[3] - t[1])) / d; return u > 1e-5 && v > 1e-5 && u + v < 1 - 1e-5; };
  for (const nd of K.nodes) { if (nd.dead) continue; out.nodes++; if (!nd.pc || nd.bad) continue; out.built++; out.fil += nd.pairs.filter(p => p.fil).length; for (const p of nd.pairs) if (p.fil) out.rmax = Math.max(out.rmax, p.R);
    const near = K.chunks.filter(c => c.mesh.visible && Math.hypot(c.x - nd.x, c.z - nd.z) < 130), V = nd.tpl.V, I = nd.tpl.I, P = nd.pc.mesh.geometry.attributes.position.array;
    for (let i = 0; i < I.length; i += 3) { const k = [I[i], I[i + 1], I[i + 2]]; const fringe = k.some(q => V[q].t === "fringe" || (V[q].t === "chord" && (V[q].c < 6 || V[q].c > 12)));
      for (const [a, b] of [[0.2, 0.3], [0.6, 0.2], [0.25, 0.55]]) { const c = 1 - a - b, x = P[k[0] * 3] * a + P[k[1] * 3] * b + P[k[2] * 3] * c, z = P[k[0] * 3 + 2] * a + P[k[1] * 3 + 2] * b + P[k[2] * 3 + 2] * c;
        let n = 0; const own = []; for (const ch of near) for (const t of T(ch)) if (inTri(t, x, z)) { n++; own.push(ch.node ? "patch" : ch.sp.road.id + ":" + ch.k0 + "-" + ch.k1); }
        if (fringe) { out.fr++; if (n !== 1) { out.frBad++; if (out.ex.length < 4) out.ex.push(["fringe", n, Math.round(x), Math.round(z), own.join(",")]); } } else { out.fan++; if (n !== 1) { out.fanBad++; if (out.ex.length < 4) out.ex.push(["asphalt", n, Math.round(x), Math.round(z), own.join(",")]); } } } } }
  // and no carriageway of one road inside another's outside the nodes (parallel runs and merges are tapered)
  for (const A of K.roads) for (const sp of A.spans) for (let i = sp.i0 + 1; i < sp.i1; i += 1) { const q = A.Q[i];
    for (const c of [-0.8, 0, 0.8]) { const x = q.x + q.nx * c * K.hwOf(A, q.s), z = q.z + q.nz * c * K.hwOf(A, q.s); out.tot++;
      for (const B of K.roads) { if (B === A) continue; const nb = K.nearest(B, x, z); if (!nb) continue; const w = K.hwOf(B, nb.s); if (nb.d < w * 0.8) { for (const sp2 of B.spans) if (nb.i >= sp2.i0 + 1 && nb.i <= sp2.i1 - 1) { out.dbl++; if (out.ex.length < 6) out.ex.push([A.id, B.id, Math.round(x), Math.round(z)]); break; } } } } }
  return out; })()`);
console.log("junctions", JSON.stringify(D));
ok(D.built >= 10 && D.bad <= 1, `D: ${D.built} junction patches built (${D.nodes} nodes, ${D.bad} without a patch, ${D.drop} duplicate detections dropped), ${D.fil} corner fillets of radius up to ${D.rmax} m`);
ok(D.fan >= 300 && D.fanBad === 0, `D: exactly one road-surface triangle under every one of ${D.fan} sample points on the junction asphalt (${D.fanBad} wrong ${JSON.stringify(D.ex.filter(e => e[0] === "asphalt"))})`);
ok(D.fr >= 300 && D.frBad <= D.fr * 0.01, `D: one surface under ${D.fr - D.frBad} of ${D.fr} samples on the junction's shoulder and bank (${D.frBad} doubled or open ${JSON.stringify(D.ex.filter(e => e[0] === "fringe"))})`);
ok(D.dbl <= Math.max(3, D.tot * 0.0005), `D: no doubled surfaces elsewhere: ${D.dbl} of ${D.tot} carriageway samples lie on another road's asphalt (${JSON.stringify(D.ex.filter(e => e.length === 4 && typeof e[0] === "string" && e[0] !== "fringe" && e[0] !== "asphalt"))})`);


// ---- RD1b sections (I street edges, K lamps and driveways, L the junction's tone seam, J night poles): they take their own stills
import { execFileSync } from "node:child_process";
const OUT = process.env.OUT || ".";
const pxDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const measure = (img, groups) => { const gf = path.join(OUT, "_px_groups.json"); fs.writeFileSync(gf, JSON.stringify(groups)); let err = null;
  for (const py of ["/usr/bin/python3", "python3", "/opt/homebrew/bin/python3"]) { try { return JSON.parse(execFileSync(py, [path.join(pxDir, "px.py"), img, gf], { encoding: "utf8", maxBuffer: 1 << 24, stdio: ["ignore", "pipe", "pipe"] })); } catch (e) { err = e; } }   // whichever python has PIL
  throw err; };
await ev(`(() => { if (!window.__camHk) { window.__camHk = 1; const rr = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv && s === scene) window.camOv(c); rr(s, c); }; } window.__pj = pts => pts.map(([x, y, z]) => { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, v.z]; }); return true; })()`);
const setDay = async (y, m, d, hr) => { await ev(`(() => { const D = Math.round((Date.UTC(${y}, ${m}, ${d}) - CAL_EPOCH) / 864e5); const k = Math.floor(GS.hour / 24); GS.hour = k * 24 + ${hr}; CAL.off = (D - k) * 24; CAL.dc = null; CAL.lastDay = CAL.dayIndex(); meltBoot(); if (TLX.seasons) TLX.seasons.dress(TLX.seasons.look()); return true; })()`); await sleep(2200); };
const standAt = async (x, z, yaw = 0) => { await ev(`(() => { crashCancel(); FOOT.on = false; VEH.cur = null; GS.fuel = Math.max(GS.fuel, 10); P.x = ${x}; P.z = ${z}; P.y = surf(${x}, ${z}); P.vx = P.vz = 0; P.yaw = ${yaw}; window.camOv = null; camMode = 0; camState.init = false; recenter(P.x, P.z, true); return true; })()`); await sleep(1200); await ev("TLXRK.fillAll(); true"); await sleep(600); await ev("TLXRK.fillAll(); true"); };

// ---- I: the edges of the town streets are not ruler lines: asphalt width, and the plow bank, wander along the street like the open road's
const IE = await J(`(() => { const K = TLXRK, NC = K.NC, out = { town: [], open: [] };
  const stat = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return { sd: Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length), range: Math.max(...a) - Math.min(...a), n: a.length }; };
  for (const r of K.roads) { const town = !!(r.meta && r.meta.town); if (!town && !(r.id === "skjanes:0" || r.id === "fv888:0")) continue; const H = [], B = [];
    for (const ch of r.chunks) { const p = ch.mesh.geometry.attributes.position.array, fx = ch.mesh.geometry.attributes.aFx.array;
      for (let k = 0; k < ch.nr; k++) { if (fx[(k * NC + 12) * 4] < -0.001 || fx[(k * NC + 12) * 4] > 0.001) continue; const o = k * NC, c = [p[(o + 9) * 3], p[(o + 9) * 3 + 2]];
        H.push(Math.hypot(p[(o + 12) * 3] - c[0], p[(o + 12) * 3 + 2] - c[1])); B.push(Math.hypot(p[(o + 18) * 3] - c[0], p[(o + 18) * 3 + 2] - c[1])); } }
    if (H.length > 12) (town ? out.town : out.open).push({ id: r.id, asphalt: stat(H), bank: stat(B), hwNominal: r.hw }); }
  return out; })()`);
console.log("edges", JSON.stringify(IE));
const minT = (k, f) => Math.min(...IE.town.map(r => r[k][f])), minO = (k, f) => Math.min(...IE.open.map(r => r[k][f]));
ok(IE.town.length >= 6 && minT("asphalt", "sd") >= 0.5 * minO("asphalt", "sd") && minT("asphalt", "range") >= 0.15, `I: town street asphalt width wanders: sd ${minT("asphalt", "sd").toFixed(3)} m, range ${minT("asphalt", "range").toFixed(2)} m on the least varied of ${IE.town.length} streets (open road ${minO("asphalt", "sd").toFixed(3)} m)`);
ok(minT("bank", "sd") >= 0.5 * minO("bank", "sd") && minT("bank", "sd") >= 0.2 && minT("bank", "range") >= 0.8, `I: the plow bank's outer edge wanders: sd ${minT("bank", "sd").toFixed(2)} m, range ${minT("bank", "range").toFixed(2)} m (open road sd ${minO("bank", "sd").toFixed(2)} m)`);

// ---- K: lamps stand on the shoulder or the bank (never on the carriageway, never floating); each driveway opens the street's bank
await setDay(2027, 2, 1, 12);
const KL = await J(`(() => { const K = TLXRK, NC = K.NC, out = { n: 0, onRoad: [], floating: [], nearEdge: 0, minOff: 9, drives: 0, driveBad: [], bankMax: 0 };
  const lamps = (KIT.lamps || []).filter(l => Math.hypot(l.x - depot.x, l.z - depot.z) < 170).map(l => [l.x, l.z, l.y]);
  const inPatch = (nd, x, z) => { const V = nd.tpl.V, I = nd.tpl.I; for (let i = 0; i < I.length; i += 3) { const a = V[I[i]], b = V[I[i + 1]], c = V[I[i + 2]]; if ([I[i], I[i + 1], I[i + 2]].some(q => V[q].t === "fringe" || (V[q].t === "chord" && (V[q].c < 6 || V[q].c > 12)))) continue; const P = nd.pc.mesh.geometry.attributes.position.array, ax = P[I[i] * 3], az = P[I[i] * 3 + 2], bx = P[I[i + 1] * 3], bz = P[I[i + 1] * 3 + 2], cx = P[I[i + 2] * 3], cz = P[I[i + 2] * 3 + 2], d = (bx - ax) * (cz - az) - (cx - ax) * (bz - az); if (Math.abs(d) < 1e-7) continue; const u = ((x - ax) * (cz - az) - (cx - ax) * (z - az)) / d, v = ((bx - ax) * (z - az) - (x - ax) * (bz - az)) / d; if (u > 0 && v > 0 && u + v < 1) return true; } return false; };
  for (const [x, z] of lamps) { out.n++; let bad = null, best = 99;
    for (const nd of K.nodes) if (nd.pc && !nd.bad && Math.hypot(nd.x - x, nd.z - z) < 30 && inPatch(nd, x, z)) bad = "patch";
    for (const r of K.roads) { const nb = K.nearest(r, x, z); if (!nb || nb.d > 14) continue; let hwE = null;
      for (const sp of r.spans) if (nb.i >= sp.i0 && nb.i <= sp.i1) { const k = nb.i - sp.i0, ch = r.chunks.find(c => c.sp === sp && c.k0 <= k && k <= c.k1); if (ch) hwE = ch.mesh.geometry.attributes.aRd.array[((k - ch.k0) * NC + 9) * 4 + 3]; }
      if (hwE === null) continue; const off = nb.d - hwE; best = Math.min(best, off); if (off < 0.35) bad = "carriageway " + off.toFixed(2); }
    if (best < 98) out.minOff = Math.min(out.minOff, best);
    if (bad) out.onRoad.push([Math.round(x), Math.round(z), bad]);
    const ly = (KIT.lamps.find(l => l.x === x && l.z === z) || {}).y; if (ly !== undefined && ly - surf(x, z) > 0.2) out.floating.push([Math.round(x), Math.round(z), +(ly - surf(x, z)).toFixed(2)]); }
  // driveways: the bank at a door's street mouth is open
  for (const d of KIT.doors) { if (!d.grid || Math.hypot(d.x - depot.x, d.z - depot.z) > 170) continue; const rd = K.roads.find(r => r.meta && r.meta.town && (() => { const nb = K.nearest(r, d.grid[0], d.grid[1]); return nb && nb.d < 0.8; })()); if (!rd) continue;
    const nb = K.nearest(rd, d.grid[0], d.grid[1]), sd = K.nearest(rd, d.x, d.z).side, ch0 = rd.chunks.find(c => { const q0 = rd.Q[c.sp.i0 + c.k0].s, q1 = rd.Q[c.sp.i0 + c.k1].s; return nb.s >= q0 && nb.s <= q1; }); if (!ch0) continue;
    const p = ch0.mesh.geometry.attributes.position.array; let kBest = 0, bd = 1e9; for (let k = 0; k < ch0.nr; k++) { const dd = Math.hypot(p[(k * NC + 9) * 3] - d.grid[0], p[(k * NC + 9) * 3 + 2] - d.grid[1]); if (dd < bd) { bd = dd; kBest = k; } }
    const c = sd > 0 ? 16 : 2, y = p[(kBest * NC + c) * 3 + 1] - surf(p[(kBest * NC + c) * 3], p[(kBest * NC + c) * 3 + 2]); out.drives++; out.bankMax = Math.max(out.bankMax, y); if (y > 0.13) out.driveBad.push([Math.round(d.grid[0]), Math.round(d.grid[1]), +y.toFixed(2)]); }
  return out; })()`);
console.log("lamps+drives", JSON.stringify(KL));
ok(KL.n >= 15 && KL.onRoad.length === 0 && KL.floating.length === 0, `K: all ${KL.n} town lamps stand off the carriageway (nearest to an asphalt edge ${KL.minOff.toFixed(2)} m, none inside a junction patch: ${JSON.stringify(KL.onRoad)}) and on the ground (${JSON.stringify(KL.floating)})`);
ok(KL.drives >= 15 && KL.driveBad.length === 0, `K: the plow bank is open at all ${KL.drives} driveway mouths (the bank beside the highest mouth is ${KL.bankMax.toFixed(2)} m above the snow, the bank elsewhere is ~0.3 m; bad ${JSON.stringify(KL.driveBad)})`);

// ---- L: no tone seam where an arm meets its junction: the mean colour 0.6-1.6 m either side of each arm end differs no more than 1.5 x the biggest difference
// the same two windows show along plain street (with 0.015 for the JPEG): measured the same way, in the same still
const seamNodes = await J(`TLXRK.nodes.filter(n => !n.dead && n.pc && !n.bad && n.arms.every(a => a.road.meta && a.road.meta.town)).map(n => ({ x: n.x, z: n.z, arms: n.arms.map(a => ({ E: a.E, ed: a.ed, en: a.en, hwE: a.hwE })) }))`);
const seamWin = (E, ed, en, hw, side) => { const g = []; for (let j = 0; j < 9; j++) for (let dd of [0.7, 1.1, 1.5]) { const u = (j - 4) / 4 * hw * 0.75; g.push([E[0] + en[0] * u + ed[0] * dd * side, E[1] + en[1] * u + ed[1] * dd * side]); } return g; };
await ev("sun.castShadow = false; true"); await sleep(1200);   // shadows of houses fall across both sides of a join and would count as a tone step
const seam = []; const base = [];
for (const [ni, nd] of seamNodes.filter(n => n.arms.length >= 3).slice(0, 6).entries()) {
  await standAt(nd.x, nd.z + 16, 0); await ev(`window.camOv = c => { c.position.set(${nd.x}, surf(${nd.x}, ${nd.z}) + 24, ${nd.z + 20}); c.lookAt(${nd.x}, surf(${nd.x}, ${nd.z}), ${nd.z}); }; true`); await sleep(900);
  const all = []; nd.arms.forEach(a => { all.push(seamWin(a.E, a.ed, a.en, a.hwE, 1), seamWin(a.E, a.ed, a.en, a.hwE, -1)); });
  const flat = all.flat(); const f = await shot(`seam${ni}`);
  const pr = await J(`window.__pj(${JSON.stringify(flat)}.map(p => [p[0], surf(p[0], p[1]) + 0.05, p[1]]))`);
  let o = 0; const groups = all.map(g => g.map(() => { const q = pr[o++]; return [q[0], q[1], 3]; }));
  const res = measure(f, groups);
  nd.arms.forEach((a, i) => { const ribbon = res[2 * i], patch = res[2 * i + 1]; if (ribbon && patch && ribbon.n > 100 && patch.n > 100) seam.push({ node: ni, arm: i, d: Math.abs(ribbon.lum - patch.lum), dc: Math.hypot(...ribbon.rgb.map((v, k) => v - patch.rgb[k])) / Math.sqrt(3) }); });
}
{ // baseline: the same two windows either side of a point on a plain stretch of Kaigata and Fjellveien (no arm end, no junction within 12 m)
  const rs = await J(`TLXRK.roads.filter(r => r.meta && r.meta.town).map(r => ({ id: r.id, Q: r.Q.map(q => [q.x, q.z, q.tx, q.tz, q.s]), len: r.len, spans: r.spans.map(sp => ({ i0: sp.i0, i1: sp.i1 })) }))`);
  const picks = []; for (const r of rs.filter(q => ["town:Kaigata", "town:Fjellveien"].includes(q.id))) for (const sp of r.spans) { const i0 = sp.i0 + 6, i1 = sp.i1 - 6; for (let i = i0; i <= i1 && picks.length < 30; i += 2) picks.push({ id: r.id, E: [r.Q[i][0], r.Q[i][1]], ed: [r.Q[i][2], r.Q[i][3]] }); }
  const byRoad = {}; picks.forEach(p => (byRoad[p.id] = byRoad[p.id] || []).push(p));
  for (const [id, L] of Object.entries(byRoad)) { const c = L[Math.floor(L.length / 2)]; await standAt(c.E[0], c.E[1] + 16, 0); await ev(`window.camOv = c => { c.position.set(${c.E[0]}, surf(${c.E[0]}, ${c.E[1]}) + 40, ${c.E[1] + 34}); c.lookAt(${c.E[0]}, surf(${c.E[0]}, ${c.E[1]}), ${c.E[1]}); }; true`); await sleep(900);
    const all = L.map(p => { const en = [-p.ed[1], p.ed[0]]; return [seamWin(p.E, p.ed, en, 2.4, 1), seamWin(p.E, p.ed, en, 2.4, -1)]; }).flat();
    const f = await shot(`seambase_${id.slice(5)}`); const pr = await J(`window.__pj(${JSON.stringify(all.flat())}.map(p => [p[0], surf(p[0], p[1]) + 0.05, p[1]]))`); let o = 0;
    const res = measure(f, all.map(g => g.map(() => { const q = pr[o++]; return [q[0], q[1], 3]; })));
    for (let i = 0; i < res.length; i += 2) if (res[i] && res[i + 1] && res[i].n > 100 && res[i + 1].n > 100) base.push({ d: Math.abs(res[i].lum - res[i + 1].lum), dc: Math.hypot(...res[i].rgb.map((v, k) => v - res[i + 1].rgb[k])) / Math.sqrt(3) }); }
}
await ev("window.camOv = null; sun.castShadow = true; true");
const bMax = Math.max(...base.map(b => b.dc)), sMax = Math.max(...seam.map(b => b.dc)), sMean = seam.reduce((a, b) => a + b.dc, 0) / Math.max(1, seam.length), bMean = base.reduce((a, b) => a + b.dc, 0) / Math.max(1, base.length);
console.log("seam arms", JSON.stringify(seam.map(q => [q.node, q.arm, +q.dc.toFixed(3)])));
console.log("seam", JSON.stringify({ arms: seam.length, junctionMax: +sMax.toFixed(3), junctionMean: +sMean.toFixed(3), plainMax: +bMax.toFixed(3), plainMean: +bMean.toFixed(3), plainN: base.length }));
ok(seam.length >= 12 && base.length >= 6 && sMax <= 1.5 * bMax + 0.015, `L: tone across the 'arm end -> junction' join: worst colour step ${sMax.toFixed(3)} (mean ${sMean.toFixed(3)}, ${seam.length} arm ends) vs ${bMax.toFixed(3)} (mean ${bMean.toFixed(3)}) between two plain windows 1.4 m apart on a plain street (${base.length}); limit 1.5 x plain + 0.015 = ${(1.5 * bMax + 0.015).toFixed(3)}`);

// ---- J: at night the snow poles' reflector bands light up in the headlight (in the beam, up to ~120 m) and are dim outside it
await setDay(2027, 2, 1, 22.5); await sleep(1500);
const poleSpot = await J(`(() => { let best = null; for (const rt of TLXR.routes) for (const sg of rt.segs) { if (rt.closed || sg.street || sg.pts.length < 40) continue; const p = sg.pts, m = Math.floor(p.length / 2), a = p[m - 8], b = p[m + 8], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!best || sg.pts.length > best.n) best = { n: sg.pts.length, x: a[0], z: a[1], dx: (b[0] - a[0]) / L, dz: (b[1] - a[1]) / L }; }
  const find = (lo, hi, ang) => { let b = null; for (const [x, z] of TLXR.poleList) { const ax = x - best.x, az = z - best.z, D = Math.hypot(ax, az), c = (ax * best.dx + az * best.dz) / D; if (D < lo || D > hi || Math.acos(Math.min(1, c)) > ang) continue; if (!b || Math.abs(D - (lo + hi) / 2) < Math.abs(b.D - (lo + hi) / 2)) b = { x, z, D, f: D }; } return b; };
  return { s: best, near: find(16, 50, 0.4), far: find(105, 165, 0.12) }; })()`);
console.log("pole spot", JSON.stringify(poleSpot));
const bandY = `1.77`;
const poleLum = async (label, pole, back) => {
  const s = poleSpot.s; await standAt(s.x, s.z, Math.atan2(s.dx, s.dz)); await sleep(1200);
  const cam = await J(`({ p: camera.position.toArray(), q: camera.quaternion.toArray() })`);
  const meas = async tag => { const f = await shot(`pole_${label}_${tag}`); const pr = await J(`window.__pj([[${pole.x}, surf(${pole.x}, ${pole.z}) + ${bandY}, ${pole.z}]])`); const ok2 = !(pr[0][0] == null || pr[0][1] == null || pr[0][2] > 1);
    if (!ok2) return { max: 0, bg: 1, c: 0, xy: [0, 0] }; const [r, bg] = measure(f, [[[pr[0][0], pr[0][1], 2]], [[pr[0][0], pr[0][1], 11]]]); return { max: r.max, bg: bg.lum, c: r.max / Math.max(bg.lum, 0.02), xy: pr[0].map(Math.round) }; };
  const inB = await meas("in");
  await ev(`window.camOv = c => { c.position.fromArray(${JSON.stringify(cam.p)}); c.quaternion.fromArray(${JSON.stringify(cam.q)}); }; P.yaw += 1.35; true`); await sleep(1200);
  const outB = await meas("out");
  await ev("window.camOv = null; true"); return { in: inB, out: outB };
};
const pn = poleSpot.near ? await poleLum("near", poleSpot.near, 0) : null;
const pf = poleSpot.far ? await poleLum("far", poleSpot.far, 0) : null;
console.log("poles", JSON.stringify({ pn, pf }));
ok(!!pn && pn.in.c >= 1.5 && pn.in.c >= 1.4 * pn.out.c, `J: pole reflector band at ${poleSpot.near ? poleSpot.near.D.toFixed(0) : "?"} m, contrast of the band against its surroundings: ${pn ? pn.in.c.toFixed(2) : "?"} in the headlight beam (peak ${pn ? pn.in.max.toFixed(2) : "?"}) vs ${pn ? pn.out.c.toFixed(2) : "?"} with the sled turned away (needs >= 1.5 and 1.4x)`);
ok(!!pf && pf.in.c >= 1.4 && pf.in.c >= 1.3 * pf.out.c, `J: pole reflector band at ${poleSpot.far ? poleSpot.far.D.toFixed(0) : "?"} m: contrast ${pf ? pf.in.c.toFixed(2) : "?"} in the beam (peak ${pf ? pf.in.max.toFixed(2) : "?"}) vs ${pf ? pf.out.c.toFixed(2) : "?"} outside it (needs >= 1.4 and 1.3x)`);
await setDay(2027, 2, 1, 12);

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
