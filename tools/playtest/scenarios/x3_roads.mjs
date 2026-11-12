// Slice 3.1 (G4): the road network, static. Asserts, exit 1 on a failure; stills of a road from the rider's view.
//  A. the network builds at boot: 6 routes, no error, sensible length against the straight line, boot cost.
//  B. it keeps to land and to road grades: no point in the sea (away from the quays and greens it starts at), the
//     grade over 30 m stays under 18% for 95% of the way.
//  C. (open road, not the village streets) it goes round houses (no building within the road's half-width + 0.3 m beyond 16 m of a waypoint) and through the
//     woods (no standing tree left inside the corridor).
//  D. open roads are plowed hard (yardAt >= 0.75 along 90%), the closed Ifjordfjellet road isn't (< 0.2).
//  E. snow poles: hundreds, each 3.8-5.5 m off a centreline, on the closed road too; the roads are on the Map chart.
//  F. village streets: lanes from each village's road end to its doors (yardAt along them).
//  G. the pickup drives the road: 4 game seconds of throttle on the plowed road from a standstill goes further than the
//     same in the powder 40 m beside it.
import { boot, ev, sleep, done, shot, down, up, sideCam, camOff } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
async function waitGame(s) { const t0 = await clock(); while ((await clock()) - t0 < s) await sleep(120); }

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 12; true`); await sleep(600);

// ---- A
const A = await J(`({ ready: TLXR.ready, err: TLXR.err || null, ms: TLXR.ms, ids: TLXR.routes.map(r => r.id),
  r: TLXR.routes.map(r => ({ id: r.id, len: r.len, st: Math.hypot(r.pts[0][0] - r.pts[r.pts.length - 1][0], r.pts[0][1] - r.pts[r.pts.length - 1][1]), closed: r.closed })) })`);
console.log("boot ms", A.ms, A.r.map(r => `${r.id} ${Math.round(r.len)} m (x${(r.len / r.st).toFixed(2)})`).join(", "));
ok(A.ready && !A.err, "A: roads built at boot with no error");
ok(A.ids.length === 6, "A: all 6 routes found a way (" + A.ids.join(" ") + ")");
ok(A.r.every(r => r.len > r.st * 0.98 && r.len < r.st * (r.closed ? 3.2 : 2.4)), "A: every route under 2.4x its straight line (the shut fell road 3.2x)");
ok(A.ms < 2500, "A: boot cost " + A.ms + " ms (< 2500 headless)");

// ---- B, C
const BC = await J(`(() => {
  const way = []; for (const r of TLXR.ROADS.routes) for (const id of r.via) { const p = id[0] === "@" ? STATIONS.find(s => s.id === id.slice(1)) : id === "depot" ? depot : SITES.find(s => s.id === id); if (p) way.push(p); }
  const far = (x, z, R) => !way.some(p => Math.hypot(x - p.x, z - p.z) < R);
  let seaAt = [], sea = 0, n = 0, gr = [], bld = [], tree = 0, H = TLXR.ROADS.half;
  for (const r of TLXR.routes) for (const sg of r.segs) {
    if (sg.street) continue;                                          // village streets are the lanes' own routing (1.1 m clear of walls)
    for (let i = 0; i < sg.pts.length; i++) {
      const [x, z] = sg.pts[i]; n++;
      if (far(x, z, 34) && isSea(x, z)) { sea++; if (sea < 6) seaAt.push([Math.round(x), Math.round(z), r.id, i, sg.pts.length]); }

      for (const o of obstaclesNear(x, z, 10)) {
        const d = Math.hypot(o.x - x, o.z - z);
        if (o.tree !== undefined) { if (!o.down && d < H + 0.5) tree++; }
        else if (!o.log && o.top > 0.3 && d < (o.r || 0.5) + H + 0.3 && far(x, z, 16)) bld.push([Math.round(x), Math.round(z), r.id]);
      }
    }
  }
  for (const r of TLXR.routes) for (const sg of r.segs) if (!sg.street && !r.closed) gr.push(...TLXR.grades(sg.pts));   // grade over each 30 m of open road
  gr.sort((a, b) => a - b);
  return { seaAt, n, sea, g95: gr[Math.floor(gr.length * 0.95)], gmax: gr[gr.length - 1], bld: bld.slice(0, 5), nb: bld.length, tree, cleared: TLXR.cleared };
})()`);
console.log("points", BC.n, "grade p95", BC.g95.toFixed(3), "max", BC.gmax.toFixed(3), "trees cleared", BC.cleared, "buildings hit", BC.nb, JSON.stringify(BC.bld));
ok(BC.sea === 0, "B: no road point in the sea (" + BC.sea + ") " + JSON.stringify(BC.seaAt));
console.log("grade p95/max per route", JSON.stringify(await J(`TLXR.routes.map(r => { const g = []; for (const sg of r.segs) if (!sg.street) g.push(...TLXR.grades(sg.pts)); g.sort((a, b) => a - b); return [r.id, +g[Math.floor(g.length * .95)].toFixed(3), +g[g.length - 1].toFixed(3)]; })`)));
ok(BC.g95 < 0.18, "B: grade over 30 m under 18% for 95% of the way (p95 " + (BC.g95 * 100).toFixed(1) + "%)");
ok(BC.nb === 0, "C: no building inside a road (" + BC.nb + ")");
ok(BC.tree === 0, "C: no standing tree inside a road corridor (" + BC.tree + ")");

// ---- D
const D = await J(`(() => {
  const way = [depot, ...SITES, ...STATIONS].filter(p => p && p.x !== undefined), far = (x, z) => !way.some(p => Math.hypot(x - p.x, z - p.z) < 60);
  const out = {};
  for (const r of TLXR.routes) { let n = 0, hard = 0, soft = 0; for (let i = 3; i < r.pts.length; i += 7) { const [x, z] = r.pts[i]; if (!far(x, z)) continue; n++; const y = yardAt(x, z); if (y >= 0.75) hard++; if (y < 0.2) soft++; } out[r.id] = { n, hard, soft, closed: r.closed }; }
  return out; })()`);
console.log("plow", JSON.stringify(D));
ok(Object.values(D).filter(r => !r.closed).every(r => r.n > 5 && r.hard >= r.n * 0.9), "D: every open road plowed hard along 90%+ of its length");
ok(Object.values(D).filter(r => r.closed).every(r => r.n > 5 && r.soft >= r.n * 0.9), "D: the Ifjordfjellet road is shut: not plowed");

// ---- E
const E = await J(`(() => { const L = TLXR.poleList, d = L.map(([x, z]) => TLXR.near(x, z).d), cl = TLXR.routes.find(r => r.closed);
  let onClosed = 0; for (const [x, z] of L) if (TLXR.near(x, z).route === cl) onClosed++;
  const r = TLXR.routes.find(r => r.id === "fv888"), [x, z] = r.pts[Math.floor(r.pts.length * 0.6)], k = TLXR.ROADS && mapBg.getContext("2d").getImageData(Math.floor((x + HALF) * M2SRC), Math.floor((z + HALF) * M2SRC), 1, 1).data;
  return { n: L.length, dmin: Math.min(...d), dmax: Math.max(...d), onClosed, px: [...k], vis: TLXR.poleMesh.parent === scene && TLXR.poleMesh.count === L.length }; })()`);
console.log("poles", E.n, "off centre", E.dmin.toFixed(2), "-", E.dmax.toFixed(2), "on the closed road", E.onClosed, "map px", E.px);
ok(E.n >= 300 && E.vis, "E: " + E.n + " snow poles in the scene");
ok(E.dmin > 3.8 && E.dmax < 5.5, "E: every pole 3.8-5.5 m off its road's centreline");
ok(E.onClosed > 20, "E: the closed road still has its poles (" + E.onClosed + ")");
ok(E.px[0] > E.px[1] + 25 && E.px[0] > E.px[2] + 40, "E: the road is drawn on the Map chart (orange pixel on fv888)");

// ---- F
const F = await J(`(() => { const out = []; for (const s of SITES) { if (s.kind !== "village") continue; let n = 0, ok = 0;
  for (const D of KIT.doors) { if (Math.hypot(D.x - s.x, D.z - s.z) > (s.clear || 70) + 30) continue; n++; const x = (s.x + D.x + D.nx * 6) / 2, z = (s.z + D.z + D.nz * 6) / 2; if (yardAt(x, z) > 0.4 || TLXR.onRoad(x, z)) ok++; }
  out.push([s.id, n, ok]); } return { v: out, streets: TLXR.streets }; })()`);
console.log("villages [id, doors, plowed halfway]", JSON.stringify(F.v));
ok(F.streets >= 15 && F.v.every(([, n, k]) => k >= n * 0.8), "F: village streets plowed to the doors (" + F.streets + " lanes)");

// ---- G: the pickup on the road vs in the powder beside it
await ev(`GS.cash = 9000; garageTab = "trucks"; openGarage(); true`); await sleep(400);
await ev(`document.querySelector("#garageBody .row").click(); closeGarage(); true`); await sleep(400);
const uid = await ev(`TLX.state("vehicles").owned[0] && TLX.state("vehicles").owned[0].uid`);
await ev(`TLXV.swapTo(${JSON.stringify(uid)}); true`); await sleep(400);
ok(await ev(`!!(VEH.cur)`), "G: driving the pickup");
// a straight, gentle stretch of open road on the fell
const seg = await J(`(() => { for (const r of TLXR.routes) { if (r.closed) continue; for (let i = 20; i < r.pts.length - 20; i++) { const a = r.pts[i], b = r.pts[i + 10];
  const ux = b[0] - a[0], uz = b[1] - a[1], L = Math.hypot(ux, uz); if (L < 58) continue; if (Math.abs(groundAt(b[0], b[1]) - groundAt(a[0], a[1])) > 1.2) continue;
  const nx = -uz / L, nz = ux / L, ox = a[0] + nx * 40, oz = a[1] + nz * 40, ox2 = b[0] + nx * 40, oz2 = b[1] + nz * 40;
  if (isSea(ox, oz) || isWater(ox, oz) || obNear(ox, oz, 12) || obNear(ox2, oz2, 12) || TLXR.near(ox, oz).d < 30 || Math.abs(groundAt(ox2, oz2) - groundAt(ox, oz)) > 1.2 || freshAt(Math.round((ox + HALF) / 0.25), Math.round((oz + HALF) / 0.25)) < 0.3) continue;
  if ([...SITES, ...STATIONS].some(s => s.x !== undefined && Math.hypot(a[0] - s.x, a[1] - s.z) < 150)) continue;
  return { x: a[0], z: a[1], ux: ux / L, uz: uz / L, nx, nz, id: r.id }; } } return null; })()`);
ok(!!seg, "G: found a straight gentle stretch with open powder beside it" + (seg ? " (" + seg.id + ")" : ""));
async function run(off) {
  await ev(`(() => { const s = ${JSON.stringify(seg)}; P.x = s.x + s.nx * ${off}; P.z = s.z + s.nz * ${off}; P.yaw = Math.atan2(s.ux, s.uz); P.vx = P.vz = P.vy = 0; P.y = surf(P.x, P.z) + 0.3; BOG.on = false; BOG.acc = 0; recenter(P.x, P.z, true); return 1; })()`);
  await waitGame(1.2);
  const p0 = await J(`[P.x, P.z]`);
  await down("KeyW"); await waitGame(4); await up("KeyW");
  const p1 = await J(`[P.x, P.z, Math.hypot(P.vx, P.vz), BOG.on, yardAt(P.x, P.z)]`);
  return { d: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), v: p1[2], bog: p1[3], y: p1[4] };
}
if (seg) {
  const road = await run(0);
  await sideCam(undefined, 9, 3.2, Math.PI * 0.82); await sleep(400); await shot("x3_road_truck");
  await camOff();
  const snow = await run(40);
  console.log("pickup 4 s from rest: road", road.d.toFixed(1), "m (", road.v.toFixed(1), "m/s, yard", road.y.toFixed(2), ") powder", snow.d.toFixed(1), "m (", snow.v.toFixed(1), "m/s, bog", snow.bog, ")");
  ok(road.d > 8 && road.d > snow.d * 1.25, "G: the pickup goes further on the road than in the powder beside it");
}

// ---- stills: the road from a rider's height, by day and at dusk
if (seg && !process.env.NOSTILLS) {
  await ev(`(() => { const s = ${JSON.stringify(seg)}; if (VEH.cur) TLXV.swapTo(null); return 1; })()`); await sleep(300);
  await ev(`(() => { const s = ${JSON.stringify(seg)}; crashCancel(); FOOT.on = false; P.x = s.x + s.nx * 1.5; P.z = s.z + s.nz * 1.5; P.yaw = Math.atan2(s.ux, s.uz); P.vx = P.vz = 0; P.y = surf(P.x, P.z) + 0.3; recenter(P.x, P.z, true); return 1; })()`);
  await sleep(1500); await shot("x3_road_day");
  await sideCam(`[P.x, P.y + 1, P.z]`, 30, 18, Math.PI); await sleep(600); await shot("x3_road_air"); await camOff();
  await ev(`GS.hour = 16.2; true`); await sleep(1500); await shot("x3_road_dusk");
}
await done(fails ? 1 : 0);
