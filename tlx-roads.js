// Tracklayer — roads (milestone 3.1 of the Four Seasons & Enterprise expansion, loop/EXPANSION.md).
//
// The Nordkinn gets its road network: Kjøllefjord to Dyfjord, up past the wind farm to Mehamn and on to Gamvik and the
// Slettnes lighthouse, a branch east to Skjånes, and south to Lebesby and over Ifjordfjellet to Ifjord. Static for now:
// the network is worked out at boot from the terrain (same map, same roads, every time; nothing is saved) and the
// winter state is fixed: the council keeps every road plowed except the fell road over Ifjordfjellet, which is shut
// for the winter (the game's old line about it), so it is a line of snow poles across the fell and nothing more.
// 3.2 makes the road snow live (storms fill it, the Map shows open / snowed in / closed).
//
// HOW A ROAD IS MADE. Each route is a list of waypoints (site ids, "@station" for a fuel station, which the road
// passes the way the stations were always placed: "on the side the road would come in"). Each leg between two
// waypoints is an A* search over a 16 m grid of the whole map: cost per metre grows with the grade (a road keeps under
// ~10%; 16 directions so a climb can wind), the sea is out (no cutting its corners either), houses, sheds, turbines and
// boulders are out (a leg with no other way squeezes past one and is pushed clear), lakes cost a lot, woods a little (it
// clears its own corridor), and cells an earlier road already uses are cheap, so routes share a trunk and branch at
// junctions instead of running side by side. The cell path is simplified, rounded with Chaikin passes and resampled
// every 6 m; a rounding that would cut into the sea or a house, or steepen a hairpin, is dropped for a plainer one.
// A road stops at the edge of a village (a ring at 3/4 of its clear radius, on the side it comes in and leaves by) or
// beside a station's forecourt, and a street (the lanes' fine routing) threads between the houses from there.
//
// WHAT THE PLAYER GETS. A plowed road (the yard system's hard pack, a lane ROADS.half m either side of the centre,
// plowed ROADS.plow hard), trees cleared from the corridor, an orange snow pole every ROADS.poleGap m on both sides
// (what you steer by up here when the snow's flat and white), the streets in each village (a plowed lane from the
// road's end to every lit door, like Kjøllefjord's), and the roads drawn on the Map app and the minimap (the closed
// one dashed). The pickup (2.3) now has somewhere to drive.
//
// TLXR (window, for later slices and scenarios): routes [{ id, name, closed, pts: [[x, z], ...], len }], poles,
// near(x, z) -> { d, route } the distance to the nearest road centreline, onRoad(x, z), ms (boot cost).
(() => {
"use strict";
const ROADS = {
  grid: 16,                 // A* cell, m
  half: 3.2,                // plowed half-width, m (a 6.4 m road, plus the yard system's easing at the edges)
  plow: 0.9,                // how hard it's plowed: 1 = a house yard, so a road is a touch softer than the quay
  poleGap: 50, poleOff: 4.6, poleH: 2.3,
  street: 1.5,              // village street lanes (Kjøllefjord's own lanes are 1.5)
  pad: 520,                 // how far a leg's search may stray outside the box round its two ends, m
  routes: [
    { id: "fv888", name: "Kjøllefjord–Mehamn road", via: ["depot", "@st_kjollefjord", "windfarm", "@st_mehamn", "mehamn"] },
    { id: "gamvik", name: "Gamvik road", via: ["mehamn", "gamvik", "relay"] },
    { id: "dyfjord", name: "Dyfjord road", via: ["depot", "dyfjord"] },
    { id: "skjanes", name: "Skjånes road", via: ["windfarm", "skjanes"] },
    { id: "lebesby", name: "Lebesby road", via: ["depot", "@st_lebesby", "lebesby"] },
    { id: "ifjordfjellet", name: "Ifjordfjellet road", via: ["lebesby", "ifjord"], closed: true }
  ],
  mapCol: "#c4692e", mapClosed: "rgba(196,105,46,.75)"
};
let api = null;
const R = { routes: [], poles: 0, ms: 0, cleared: 0, streets: 0, ready: false, ROADS };
window.TLXR = R;

function place(id, W) {
  if (id[0] === "@") { const t = W.STATIONS.find(s => s.id === id.slice(1)); return t && t.x !== undefined ? { x: t.x, z: t.z, st: t } : null; }
  const s = id === "depot" ? W.depot : W.SITES.find(q => q.id === id);
  return s && s.x !== undefined ? { x: s.x, z: s.z, site: s } : null;
}

// ---- the grid: one cell per 16 m across the whole map, attributes read lazily and kept for every leg
let G = null;
function grid(W) {
  const n = Math.ceil(W.size / ROADS.grid) + 1;
  G = { n, h: new Float32Array(n * n).fill(NaN), f: new Int8Array(n * n).fill(-1), used: new Uint8Array(n * n), near: [] };
}
const cx = (x, W) => Math.round((x + W.half) / ROADS.grid), wx = (i, W) => i * ROADS.grid - W.half;
// flags: 1 sea, 2 lake, 4 house/building near, 8 woods
function cellF(k, W) {
  let f = G.f[k]; if (f >= 0) return f;
  const x = wx(k % G.n, W), z = wx(Math.floor(k / G.n), W);
  f = 0;
  if (W.isSea(x, z)) f |= 1;
  else {
    if (W.isWater(x, z)) f |= 2;
    let trees = 0;
    for (const o of W.obstaclesNear(x, z, 12)) {
      const d = Math.hypot(o.x - x, o.z - z);
      if (o.tree !== undefined) { if (!o.down && d < 7) trees++; }
      else if (!o.log && o.top > 0.3 && d < (o.r || 0.5) + 9) f |= 4;
    }
    if (trees) f |= 8;
  }
  G.f[k] = f; return f;
}
function cellH(k, W) { let h = G.h[k]; if (h !== h) h = G.h[k] = W.groundAt(wx(k % G.n, W), wx(Math.floor(k / G.n), W)); return h; }
// 16 directions (the 8 neighbours and the knight's moves), so a climb can wind at 27 degrees as well as 45 and 90
const MOVES = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
// near a waypoint the search may touch the sea's edge
const exempt = (x, z, r = 34) => G.near.some(p => Math.hypot(x - p.x, z - p.z) < r);   // a quay may sit right on the sea's edge

function leg(a, b, W, soft) {
  const N = G.n, s = cx(a.z, W) * N + cx(a.x, W), t = cx(b.z, W) * N + cx(b.x, W);
  const pad = Math.ceil(ROADS.pad / ROADS.grid);
  const i0 = Math.max(0, Math.min(s % N, t % N) - pad), i1 = Math.min(N - 1, Math.max(s % N, t % N) + pad);
  const j0 = Math.max(0, Math.min(Math.floor(s / N), Math.floor(t / N)) - pad), j1 = Math.min(N - 1, Math.max(Math.floor(s / N), Math.floor(t / N)) + pad);
  const g = new Map(), from = new Map(), shut = new Set(), tx = t % N, tz = Math.floor(t / N);
  const hq = [], hk = [];
  const push = (f, k) => { let i = hq.length; hq.push(f); hk.push(k); while (i > 0) { const p = (i - 1) >> 1; if (hq[p] <= hq[i]) break; [hq[p], hq[i]] = [hq[i], hq[p]]; [hk[p], hk[i]] = [hk[i], hk[p]]; i = p; } };
  const pop = () => { const k = hk[0], lf = hq.pop(), lk = hk.pop(); if (hq.length) { hq[0] = lf; hk[0] = lk; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hq.length && hq[l] < hq[m]) m = l; if (r < hq.length && hq[r] < hq[m]) m = r; if (m === i) break; [hq[m], hq[i]] = [hq[i], hq[m]]; [hk[m], hk[i]] = [hk[i], hk[m]]; i = m; } } return k; };
  g.set(s, 0); push(0, s);
  while (hq.length) {
    const k = pop(); if (shut.has(k)) continue; shut.add(k); if (k === t) break;
    const ki = k % N, kj = Math.floor(k / N), hk0 = cellH(k, W), gk = g.get(k);
    for (const [di, dj] of MOVES) {
      const ni = ki + di, nj = kj + dj; if (ni < i0 || nj < j0 || ni > i1 || nj > j1) continue;
      const n = nj * N + ni; if (shut.has(n)) continue;
      const x = wx(ni, W), z = wx(nj, W), ex = exempt(x, z), f = cellF(n, W);
      if ((f & 1) && !ex) continue;                                   // no roads across the sea
      if ((f & 4) && !soft && n !== t) continue;                       // nor through anyone's house, turbine, shed or boulder
      if (!ex && (di && dj)) {                                        // no cutting a corner of the sea: the cells it passes over are land too
        let wet = false;
        if (Math.abs(di) + Math.abs(dj) === 3) for (const [a, b] of [[Math.trunc(di / 2), Math.trunc(dj / 2)], [Math.round(di / 2), Math.round(dj / 2)], [di - Math.trunc(di / 2), dj - Math.trunc(dj / 2)]]) { if (cellF((kj + b) * N + ki + a, W) & 1) wet = true; }
        else wet = !!(cellF(kj * N + ki + di, W) & 1) || !!(cellF((kj + dj) * N + ki, W) & 1);
        if (wet) continue;
      }
      const L = Math.hypot(di, dj) * ROADS.grid, gr = Math.abs(cellH(n, W) - hk0) / L;
      let c = L * (1 + (gr / 0.06) * (gr / 0.06));                     // the grade is what shapes a road: it winds to keep under ~10%
      if (gr > 0.11) c *= 8; if (gr > 0.16) c *= 12; if (gr > 0.22) c *= 30;
      if (!ex) { if (f & 2) c *= 25; if (f & 8) c *= 1.35; }
      if (f & 4) c *= 40;                                             // (soft: a squeeze past one, pushed clear by shove)
      if (G.used[n]) c *= 0.35;
      const ng = gk + c, og = g.get(n);
      if (og === undefined || ng < og) { g.set(n, ng); from.set(n, k); push(ng + 0.35 * ROADS.grid * Math.hypot(ni - tx, nj - tz), n); }
    }
  }
  if (!from.has(t)) return null;
  const cells = []; for (let k = t; k !== undefined; k = from.get(k)) { cells.unshift(k); if (k === s) break; }
  return cells;
}

// Douglas-Peucker on [x, z] points
function simplify(p, tol) {
  if (p.length < 3) return p.slice();
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const st = [[0, p.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const ux = p[b][0] - p[a][0], uz = p[b][1] - p[a][1], L = Math.hypot(ux, uz) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((p[i][0] - p[a][0]) * uz - (p[i][1] - p[a][1]) * ux) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return p.filter((_, i) => keep[i]);
}
function chaikin(p, n) {
  for (let it = 0; it < n; it++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) { const [ax, az] = p[i], [bx, bz] = p[i + 1]; q.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]); }
    q.push(p[p.length - 1]); p = q;
  }
  return p;
}
function resample(p, step) {
  const out = [p[0].slice()]; let carry = 0;
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i], L = Math.hypot(bx - ax, bz - az);
    let t = step - carry;
    while (t <= L) { out.push([ax + (bx - ax) * t / L, az + (bz - az) * t / L]); t += step; }
    carry = L - (t - step);
  }
  const e = p[p.length - 1], l = out[out.length - 1]; if (Math.hypot(e[0] - l[0], e[1] - l[1]) > 1) out.push(e.slice());
  return out;
}
// the 95th-percentile grade over 30 m along a resampled line
function steep(p, W) { const g = grades(p, W); if (!g.length) return 0; g.sort((a, b) => a - b); return g[Math.floor(g.length * 0.95)]; }
// the grade over each 30 m of road (by distance along it, so bunched points don't read as a wall)
function grades(p, W) {
  const g = []; let j = 0, s = 0; const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  for (let i = 1; i < p.length; i++) { while (cum[i] - cum[j] > 30) j++; if (j > 0 && cum[i] - cum[j - 1] >= 30) { const k = j - 1; g.push(Math.abs(W.groundAt(p[i][0], p[i][1]) - W.groundAt(p[k][0], p[k][1])) / (cum[i] - cum[k])); } }
  return g;
}
R.grades = (p) => grades(p, api.world);
// a rounded line that keeps out of the sea and off houses (beyond the waypoints' own ground)
function lineOk(p, W) {
  for (const [x, z] of p) {
    if (!exempt(x, z) && W.isSea(x, z)) return false;
    for (const o of W.obstaclesNear(x, z, 8)) if (o.tree === undefined && !o.log && o.top > 0.3 && Math.hypot(o.x - x, o.z - z) < (o.r || 0.5) + ROADS.half + 0.6) return false;
  }
  return true;
}

// one leg of open road between two points: the A* path, rounded as far as it safely can be
function roadLeg(a, b, W) {
  const cells = leg(a, b, W) || leg(a, b, W, true); if (!cells) return null;
  const raw = cells.map(k => [wx(k % G.n, W), wx(Math.floor(k / G.n), W)]);
  raw[0] = [a.x, a.z]; raw[raw.length - 1] = [b.x, b.z];
  // the roundest line that stays on land, off houses and no steeper than the search's own (rounding must not cut a
  // hairpin into a ramp); the bare cell path if none does
  const bare = resample(raw, 6), lim = steep(bare, W) + 0.02;
  const line = [resample(chaikin(simplify(raw, 5), 3), 6), resample(chaikin(raw, 2), 6), resample(chaikin(raw, 1), 6)].find(l => lineOk(l, W) && steep(l, W) <= lim);
  return line || shove(resample(shove(bare, W), 6), W);
}
// the bare cell path can still pass a corner of a shed between two cells: push those points out to the road's clearance
function shove(p, W) {
  p = p.map(q => q.slice());
  for (let it = 0; it < 4; it++) for (const q of p) {
    for (const o of W.obstaclesNear(q[0], q[1], 10)) {
      if (o.tree !== undefined || o.log || !(o.top > 0.3)) continue;
      const C = (o.r || 0.5) + ROADS.half + 0.8, dx = q[0] - o.x, dz = q[1] - o.z, d = Math.hypot(dx, dz);
      if (d < C && d > 1e-3) { const nx = o.x + dx / d * C, nz = o.z + dz / d * C; if (!W.isSea(nx, nz)) { q[0] = nx; q[1] = nz; } }
    }
  }
  return p;
}
// where a road meets a place: on a ring round it (3/4 of its clear radius, 20-90 m), clear of houses, nearest the way
// the road goes
function ring(p, toward, W) {
  const s = p.site, rr = Math.max(20, Math.min(90, ((s && s.clear) || 40) * 0.75));
  let best = null, bs = Infinity;
  for (let k = 0; k < 36; k++) {
    const a = k / 36 * Math.PI * 2, x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr;
    if (W.isSea(x, z) || W.isWater(x, z)) continue;
    if (W.obstaclesNear(x, z, 12).some(o => o.tree === undefined && !o.log && o.top > 0.3 && Math.hypot(o.x - x, o.z - z) < (o.r || 0.5) + 8)) continue;
    const d = Math.hypot(toward.x - x, toward.z - z); if (d < bs) { bs = d; best = { x, z }; }
  }
  return best || { x: p.x, z: p.z };
}

function build(W) {
  const t0 = performance.now();
  grid(W);
  const waypoints = [];
  for (const r of ROADS.routes) for (const id of r.via) { const p = place(id, W); if (p) waypoints.push(p); }
  G.near = waypoints;
  for (const r of ROADS.routes) {
    const segs = [], stops = r.via.map(id => place(id, W)).filter(Boolean);
    // a fuel station: the road runs along the side of its forecourt (24 x 15 m, long axis back at the village), not
    // through the pumps; the side nearer the stops either way
    stops.forEach((p, i) => { if (!p.st) return; const t = p.st, c = Math.cos(t.ry), s = Math.sin(t.ry), A = stops[i - 1] || p, B = stops[i + 1] || p;
      const side = [12.5, -12.5].map(lz => ({ x: t.x + lz * s, z: t.z + lz * c })).filter(q => !W.isSea(q.x, q.z));
      side.sort((a, b) => Math.hypot(a.x - A.x, a.z - A.z) + Math.hypot(a.x - B.x, a.z - B.z) - Math.hypot(b.x - A.x, b.z - A.z) - Math.hypot(b.x - B.x, b.z - B.z));
      const q = side[0] || p; p.in = p.out = { x: q.x, z: q.z }; });
    // a village, the quay, the wind farm, the lighthouse: the road stops at the edge, on the side it comes in (and leaves
    // by), and a street threads between the houses to the middle (or across, to where the road goes on)
    stops.forEach((p, i) => { if (p.st) return; const A = stops[i - 1], B = stops[i + 1];
      p.in = A ? ring(p, A, W) : null; p.out = B ? ring(p, B, W) : null; });
    const street = (a, b) => { if (Math.hypot(b.x - a.x, b.z - a.z) > 2) segs.push({ street: true, pts: resample(W.laneRoute(a.x, a.z, b.x, b.z), 6) }); };
    for (let i = 0; i < stops.length; i++) {
      const p = stops[i];
      if (i > 0) {
        const a = stops[i - 1].out, b = p.in;
        if (Math.hypot(b.x - a.x, b.z - a.z) < 200) street(a, b);    // a short hop (the quay's edge to the town's fuel station) is a street too
        else { const line = roadLeg(a, b, W); if (line) segs.push({ street: false, pts: line }); }
      }
      if (!p.st) { if (i === 0) street(p, p.out); else if (i === stops.length - 1) street(p.in, p); else street(p.in, p.out); }
    }
    for (const sg of segs) for (const [x, z] of sg.pts) G.used[cx(z, W) * G.n + cx(x, W)] = 1;   // later routes share this one's trunk
    const pts = []; for (const sg of segs) { for (const q of sg.pts) { const l = pts[pts.length - 1]; if (!l || Math.hypot(q[0] - l[0], q[1] - l[1]) > 0.5) pts.push(q); } }
    if (pts.length < 2 || !segs.some(sg => !sg.street)) continue;
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    R.routes.push({ id: r.id, name: r.name, closed: !!r.closed, pts, segs, len, ends: [r.via[0], r.via[r.via.length - 1]] });
  }
  index();
  // the corridor: trees out, snow plowed (not on a closed road; a village's streets are plowed whatever the road does)
  for (const rt of R.routes) for (const sg of rt.segs) {
    if (sg.street) { W.addLane(sg.pts, ROADS.street); continue; }
    for (const [x, z] of sg.pts) for (const o of W.obstaclesNear(x, z, ROADS.half + 3)) if (o.tree !== undefined && !o.down && Math.hypot(o.x - x, o.z - z) < ROADS.half + 1.6 + (o.r || 0)) { if (W.clearTree(o)) R.cleared++; }
    if (!rt.closed) W.addLane(sg.pts, ROADS.half, ROADS.plow);
  }
  streets(W);
  poles(W);
  paintMap(W);
  R.ms = Math.round(performance.now() - t0); R.ready = true;
}

// ---- nearest road: segments bucketed on a 64 m grid
const BK = 64; let BKT = null;
function index() {
  BKT = new Map();
  for (const rt of R.routes) for (let i = 1; i < rt.pts.length; i++) {
    const [ax, az] = rt.pts[i - 1], [bx, bz] = rt.pts[i];
    for (const [x, z] of [[ax, az], [bx, bz]]) { const k = Math.floor(z / BK) * 100000 + Math.floor(x / BK); let a = BKT.get(k); if (!a) BKT.set(k, a = []); if (!a.length || a[a.length - 1].i !== i || a[a.length - 1].rt !== rt) a.push({ rt, i }); }
  }
}
R.near = (x, z) => {
  let best = { d: Infinity, route: null };
  if (!BKT) return best;
  const i0 = Math.floor(x / BK), j0 = Math.floor(z / BK);
  for (let j = j0 - 1; j <= j0 + 1; j++) for (let i = i0 - 1; i <= i0 + 1; i++) {
    const a = BKT.get(j * 100000 + i); if (!a) continue;
    for (const { rt, i: s } of a) {
      const [ax, az] = rt.pts[s - 1], [bx, bz] = rt.pts[s], ux = bx - ax, uz = bz - az, uu = ux * ux + uz * uz;
      const t = uu ? Math.max(0, Math.min(1, ((x - ax) * ux + (z - az) * uz) / uu)) : 0, d = Math.hypot(x - ax - ux * t, z - az - uz * t);
      if (d < best.d) best = { d, route: rt };
    }
  }
  return best;
};
R.onRoad = (x, z) => R.near(x, z).d <= ROADS.half;

// ---- village streets: a plowed lane from the road's end in each village to every lit door (Kjøllefjord has its own)
function streets(W) {
  for (const s of W.SITES) {
    if (s.kind !== "village" || s.x === undefined) continue;
    for (const D of W.doors) {
      if (Math.hypot(D.x - s.x, D.z - s.z) > (s.clear || 70) + 30) continue;
      W.addLane(W.laneRoute(s.x, s.z, D.x + D.nx * (D.d / 2 + 5), D.z + D.nz * (D.d / 2 + 5)), ROADS.street); R.streets++;
    }
  }
}

// ---- snow poles (brøytestikker): orange, a reflector band near the top, leaning a little, both sides of the road
function poles(W) {
  const T = api.THREE, list = [], hash = new Set(), near = (x, z) => W.SITES.some(s => s.x !== undefined && Math.hypot(x - s.x, z - s.z) < Math.max(28, (s.clear || 0) * 0.5)) || W.STATIONS.some(t => t.x !== undefined && Math.hypot(x - t.x, z - t.z) < 26);
  let rnd = 9127; const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
  for (const rt of R.routes) for (const sg of rt.segs) {
    if (sg.street) continue;                                          // none in the villages
    let acc = ROADS.poleGap * 0.5;
    for (let i = 1; i < sg.pts.length; i++) {
      const [ax, az] = sg.pts[i - 1], [bx, bz] = sg.pts[i], L = Math.hypot(bx - ax, bz - az); acc += L;
      if (acc < ROADS.poleGap) continue; acc = 0;
      const nx = -(bz - az) / L, nz = (bx - ax) / L;
      for (const sd of [-1, 1]) {
        const x = bx + nx * ROADS.poleOff * sd, z = bz + nz * ROADS.poleOff * sd, k = Math.round(x / 9) * 100000 + Math.round(z / 9);
        if (hash.has(k) || near(x, z) || W.isSea(x, z) || W.isWater(x, z)) continue;
        if (R.near(x, z).d < ROADS.poleOff - 0.8) continue;           // a pole that would stand in another road at a junction
        hash.add(k); list.push([x, z, rand() * 6.28, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.08]);
      }
    }
  }
  const shaft = new T.CylinderGeometry(0.022, 0.028, ROADS.poleH, 5).translate(0, ROADS.poleH / 2, 0);
  const col = [], c1 = new T.Color(0xd8561c), c2 = new T.Color(0xf2e9c8), pos = shaft.attributes.position;
  for (let v = 0; v < pos.count; v++) { const y = pos.getY(v), band = y > ROADS.poleH - 0.32 && y < ROADS.poleH - 0.12; const c = band ? c2 : c1; col.push(c.r, c.g, c.b); }
  shaft.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  const mesh = new T.InstancedMesh(shaft, new T.MeshLambertMaterial({ vertexColors: true }), Math.max(1, list.length));
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3(1, 1, 1);
  list.forEach(([x, z, yaw, lx, lz], i) => { e.set(lx, yaw, lz); q.setFromEuler(e); p.set(x, W.groundAt(x, z) - 0.15, z); m.compose(p, q, sc); mesh.setMatrixAt(i, m); });
  mesh.count = list.length; mesh.frustumCulled = false; mesh.name = "roadPoles";
  api.scene.add(mesh);
  R.poles = list.length; R.poleList = list; R.poleMesh = mesh;
}

// ---- the chart: roads painted onto the relief under the Map app and the minimap
function paintMap(W) {
  const cv = W.map && W.map.canvas; if (!cv) return;
  const g = cv.getContext("2d"), k = W.map.scale;
  g.save(); g.lineCap = g.lineJoin = "round";
  for (const pass of [0, 1]) for (const rt of R.routes) for (const sg of rt.segs) {
    const closed = rt.closed && !sg.street;
    g.beginPath();
    sg.pts.forEach(([x, z], i) => { const px = (x + W.half) * k, pz = (z + W.half) * k; if (i) g.lineTo(px, pz); else g.moveTo(px, pz); });
    if (pass === 0) { g.strokeStyle = "rgba(20,30,40,.35)"; g.lineWidth = 3.2; g.setLineDash([]); }
    else { g.strokeStyle = closed ? ROADS.mapClosed : ROADS.mapCol; g.lineWidth = 1.7; g.setLineDash(closed ? [4, 3] : []); }
    if (!(pass === 0 && closed)) g.stroke();
  }
  g.restore();
}

TLX.register({
  id: "roads", v: 1,
  state0: () => ({}),
  init(a) { api = a; try { build(a.world); } catch (e) { console.error("TLX roads", e); R.err = String(e); } }
});
})();
