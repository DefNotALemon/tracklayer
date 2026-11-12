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
// A switchback's tip then swings out round a loop (bulbs) and no bend is left under ROADS.minR (widen); bends are
// plowed wider (beta 0127: the pickup couldn't follow the old 6 m hairpins and bogged in the berm).
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
  bed: 6.8,                 // the road bed: level across this far either side of the centre, m (road + shoulder)
  grade: 0.08,              // the steepest the bed is eased toward along the line
  bank: 14,                 // the widest the cut/fill bank eases back to the natural ground over, m
  cutMax: 8,                // the deepest cutting / highest embankment, m (a hairpin landing on a 40% hillside needs ~7)
  bulb: 16,                 // the loop a switchback turns on, m (radius; tried at minR + 0.5 where 16 does not fit)
  wide: 2.6, wideR: 26,     // bends tighter than wideR m are plowed wide m further out each side
  minR: 13,                 // the tightest bend an open road may turn, m (radius through points 12 m either side)
  pair: 18,                 // two roads closer than this share one bed height (hairpin legs, a branch off the trunk), m
  ease: 36,                 // how far from a road's end (a village edge, a forecourt) the bed eases back to the ground, m
  routes: [
    { id: "fv888", name: "Kjøllefjord–Mehamn road", via: ["depot", "@st_kjollefjord", "windfarm", "@st_mehamn", "mehamn"] },
    { id: "gamvik", name: "Gamvik road", via: ["mehamn", "gamvik", "relay"] },
    { id: "dyfjord", name: "Dyfjord road", via: ["depot", "dyfjord"] },
    { id: "skjanes", name: "Skjånes road", via: ["windfarm", "skjanes"] },
    { id: "lebesby", name: "Lebesby road", via: ["depot", "@st_lebesby", "lebesby"] },
    { id: "ifjordfjellet", name: "Ifjordfjellet road", via: ["lebesby", "ifjord"], closed: true }
  ],
  mapCol: "#c4692e", mapClosed: "rgba(196,105,46,.75)",
  // road snow (3.2): each open road is cut into seg m stretches, each with its own snow (0 = plowed, 1 = drifted level
  // with the snowpack either side). A storm fills a stretch at fill per game hour at full strength, ramping in from
  // weather fillA to fillB (a grey drizzle under ~0.5 leaves the roads alone: beta 0141 #1); at shut and over the
  // stretch is snowed in (the Map paints it mapSnow). The council plow sets out
  // from the route's first end once the route has plowAt of snow and the weather there has eased under plowWx for
  // plowWait game hours (it works through light snow, only a real storm keeps it in), and works along at plowV m per
  // game hour, clearing each stretch as it reaches it. A jump of
  // more than skip game hours (a night's sleep, the summer skip) finds every road plowed.
  seg: 400, fill: 0.16, fillA: 0.5, fillB: 0.95, shut: 0.35, plowAt: 0.12, plowWx: 0.6, plowWait: 0.75, plowV: 5000, skip: 2,
  mapSnow: "#6f9fd0"
};
let api = null;
const R = { routes: [], poles: 0, ms: 0, cleared: 0, bulbs: 0, wideN: 0, streets: 0, ready: false, ROADS };
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
    for (const o of W.obstaclesNear(x, z, 16)) {
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
    const anc = []; for (let q = from.get(k), m = 0; q !== undefined && m < 16; q = from.get(q), m++) anc.push(q % N, Math.floor(q / N));   // the path's last 16 cells (see doubling back)
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
      // no doubling back past itself: a cell next to one this path used 2-17 cells back (a V or a hairpin) costs 20 cells of road. Without
      // it a climb up a steep hillside zigzagged in legs 8-12 m apart and 3-5 m apart in height, which no road bed on
      // the 4 m ground grid can level (beta 0123); now a hairpin's legs stand at least two cells (32 m) apart
      for (let q = 0; q < anc.length; q += 2) if (Math.abs(anc[q] - ni) <= 1 && Math.abs(anc[q + 1] - nj) <= 1) { c += ROADS.grid * 20; break; }
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
  // (the last shove: a loop or a widened bend runs between checked points, and the 6 m resample can put one on a wall)
  return shove(widen(bulbs(line || shove(resample(shove(bare, W), 6), W), W), W), W);
}
// a switchback's turn, built the way a mountain road's is: the search climbs a hillside in V-shaped zigzags whose legs
// meet at a point, and rounding the V inside (drawing the tip back between the legs) cuts the climb short and steepens
// it (tried first: Lebesby lost 800 m of road and went to 18-24%). So each tip turning more than ~100 degrees gets a
// loop out past the point instead: a circle of ROADS.bulb m beyond the tip, joined to both legs where they leave it,
// the radius eased from the leg onto the circle and back. It adds road on the landing (which bed() levels, the legs
// standing side by side) and keeps the legs where the search put them. A loop that would reach the sea, a house or
// another stretch of the same road is tried smaller, then left to widen().
function bulbs(p, W) {
  const n = p.length, turn = new Float32Array(n);
  const dir = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; return [dx / L, dz / L]; };
  for (let i = 3; i < n - 3; i++) { const u = dir(p[i - 3], p[i]), v = dir(p[i], p[i + 3]); turn[i] = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1]))); }
  const tips = [];
  for (let i = 6; i < n - 6; i++) if (turn[i] > 1.75 && turn[i] >= turn[i - 1] && turn[i] > turn[i + 1] && (!tips.length || i - tips[tips.length - 1] > 8)) tips.push(i);
  if (!tips.length) return p;
  const out = []; let from = 0;
  for (const i of tips) {
    if (i - 4 < from) continue;
    const T = p[i], ui = dir(p[i - 4], T), uo = dir(T, p[i + 4]);
    let bx = ui[0] - uo[0], bz = ui[1] - uo[1]; const bl = Math.hypot(bx, bz); if (bl < 0.3) continue; bx /= bl; bz /= bl;
    let arc = null, j1 = 0, j2 = 0;
    for (const [Rb, off] of [[ROADS.bulb, 0.7], [ROADS.minR + 0.5, 0.5]]) {
      const C = [T[0] + bx * Rb * off, T[1] + bz * Rb * off], dC = q => Math.hypot(q[0] - C[0], q[1] - C[1]);
      j1 = i; while (j1 > from + 1 && dC(p[j1]) < Rb + 4) j1--;
      j2 = i; while (j2 < n - 2 && dC(p[j2]) < Rb + 4) j2++;
      if (j1 <= from + 1 || j2 >= n - 2 || j2 - j1 > 40) continue;
      const a1 = Math.atan2(p[j1][1] - C[1], p[j1][0] - C[0]), a2 = Math.atan2(p[j2][1] - C[1], p[j2][0] - C[0]), ab = Math.atan2(bz, bx);
      // the way round that passes the outward side (the bisector beyond the tip)
      const norm = a => { while (a < 0) a += Math.PI * 2; while (a >= Math.PI * 2) a -= Math.PI * 2; return a; };
      const ccw = norm(a2 - a1), passes = norm(ab - a1) < ccw, sweep = passes ? ccw : ccw - Math.PI * 2;
      const r1 = dC(p[j1]), r2 = dC(p[j2]), m = Math.max(4, Math.ceil(Math.abs(sweep) * Rb / 6)), pts = [];
      for (let k = 1; k < m; k++) { const t = k / m, a = a1 + sweep * t, e = t < 0.25 ? t / 0.25 : t > 0.75 ? (1 - t) / 0.25 : 1, s = e * e * (3 - 2 * e), r = (t < 0.5 ? r1 : r2) + (Rb - (t < 0.5 ? r1 : r2)) * s;
        pts.push([C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r]); }
      if (!lineOk(pts, W) || pts.some(q => W.isWater(q[0], q[1]))) continue;
      let clash = false;
      for (const q of pts) { for (let k = 0; k < n; k += 2) { if (k > j1 - 12 && k < j2 + 12) continue; if (Math.hypot(p[k][0] - q[0], p[k][1] - q[1]) < 14) { clash = true; break; } } if (clash) break; }
      if (clash) continue;
      arc = pts; break;
    }
    if (!arc) continue;
    for (let k = from; k <= j1; k++) out.push(p[k]);
    for (const q of arc) out.push(q);
    from = j2; R.bulbs++;
  }
  for (let k = from; k < n; k++) out.push(p[k]);
  return resample(out, 6);
}
// no bend tighter than ROADS.minR (beta 0127): the rounded A* line still turned its switchbacks on a 6 m radius,
// which a 3 m-wheelbase pickup can't follow at any speed, so it cut the inside onto unplowed snow and bogged. Each
// pass finds the points whose turning circle (through the points 2 back and 2 on, 12 m each way) is under the limit
// and draws them toward the chord's middle (their neighbours a little with them), a move dropped if it lands in the
// sea or on a house; then the line is resampled to 6 m again. A hairpin opens into a U as wide as its legs allow
// (the A* keeps the legs ~32 m apart), a bend becomes an arc; the ends (the village edge, the forecourt) stay put.
function turnR(p, i) {
  const a = p[i - 2], b = p[i], c = p[i + 2];
  const ab = Math.hypot(b[0] - a[0], b[1] - a[1]), bc = Math.hypot(c[0] - b[0], c[1] - b[1]), ca = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const cr = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return cr < 1e-6 ? 1e9 : ab * bc * ca / (2 * cr);
}
function widen(p, W) {
  const ok = (x, z) => lineOk([[x, z]], W);
  for (let it = 0; it < 80; it++) {
    let bad = 0;
    const q = p.map(v => v.slice());
    for (let i = 3; i < p.length - 3; i++) {
      if (turnR(p, i) >= ROADS.minR) continue;
      bad++;
      for (const [j, w] of [[i, 0.5], [i - 1, 0.25], [i + 1, 0.25]]) {
        const mx = (p[j - 2][0] + p[j + 2][0]) / 2, mz = (p[j - 2][1] + p[j + 2][1]) / 2;
        const nx = q[j][0] + (mx - q[j][0]) * w, nz = q[j][1] + (mz - q[j][1]) * w;
        if (ok(nx, nz)) { q[j][0] = nx; q[j][1] = nz; }
      }
    }
    if (!bad) break;
    p = resample(q, 6);
  }
  return p;
}
R.turnR = turnR;
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
  bed(W);
  // the corridor: trees out, snow plowed (not on a closed road; a village's streets are plowed whatever the road does)
  for (const rt of R.routes) {
    // road snow (3.2): the open road's plowed legs are filed by stretch (distance along the route), so a stretch's snow
    // can set how hard its legs are plowed; the map draws each stretch's own runs
    rt.seg = [];
    const segOf = d => { const i = Math.max(0, Math.floor(d / ROADS.seg)); while (rt.seg.length <= i) rt.seg.push({ i: rt.seg.length, a: rt.seg.length * ROADS.seg, legs: [], runs: [], q: 0, shut: false }); return rt.seg[i]; };
    let acc = 0, last = null;
    for (const sg of rt.segs) {
      const cum = sg.pts.map(q => { if (last) acc += Math.hypot(q[0] - last[0], q[1] - last[1]); last = q; return acc; });
      if (sg.street) { W.addLane(sg.pts, ROADS.street); continue; }
      for (const [x, z] of sg.pts) for (const o of W.obstaclesNear(x, z, ROADS.half + 3)) if (o.tree !== undefined && !o.down && Math.hypot(o.x - x, o.z - z) < ROADS.half + 1.6 + (o.r || 0)) { if (W.clearTree(o)) R.cleared++; }
      if (!rt.closed) {
        const legs = W.addLane(sg.pts, ROADS.half, ROADS.plow) || [];
        legs.forEach((Y, k) => segOf((cum[k] + cum[k + 1]) / 2).legs.push(Y));
        let cur = null, run = null;
        for (let k = 1; k < sg.pts.length; k++) { const g = segOf((cum[k - 1] + cum[k]) / 2); if (g !== cur) { cur = g; g.runs.push(run = [sg.pts[k - 1]]); } run.push(sg.pts[k]); }
      }
      // a bend is plowed wider, the way a plow swings round a hairpin: a driver who runs a little wide or cuts in on a
      // switchback's loop stays on hard pack instead of dropping a wheel into the berm (beta 0127 #2/#4)
      const p = sg.pts;
      for (let i = 2; i < p.length - 2; i++) {
        if (turnR(p, i) >= ROADS.wideR) continue;
        for (const o of W.obstaclesNear(p[i][0], p[i][1], ROADS.half + ROADS.wide + 3)) if (o.tree !== undefined && !o.down && Math.hypot(o.x - p[i][0], o.z - p[i][1]) < ROADS.half + ROADS.wide + 1.2 + (o.r || 0)) { if (W.clearTree(o)) R.cleared++; }
        if (!rt.closed) { segOf(cum[i]).legs.push(...(W.addLane([p[i - 1], p[i], p[i + 1]], ROADS.half + ROADS.wide, ROADS.plow) || [])); R.wideN++; }
      }
    }
    for (const g of rt.seg) { const r0 = g.runs[Math.floor(g.runs.length / 2)] || [[rt.pts[0][0], rt.pts[0][1]]], m = r0[Math.floor(r0.length / 2)]; g.mx = m[0]; g.mz = m[1]; }
  }
  streets(W);
  poles(W);
  paintMap(W);
  R.ms = Math.round(performance.now() - t0); R.ready = true;
}

// ---- the road bed: cut into the hillside and built up over the dips, level across, the grade eased along.
// The route search keeps a road under ~10% over its 16 m cells, but the ground between (the 110 m swells and the
// sidehills a contour-hugging road runs along) still tipped it 20-40% in places and the pickup sat there (beta 0123).
// A real road is graded: each open stretch's height is smoothed along the line (±30 m, three passes), its grade relaxed
// toward ROADS.grade, and the 4 m ground grid set to that height out to ROADS.bed either side, easing back to the
// natural ground over a bank ~1:1.6 (up to ROADS.bank). Never more than ROADS.cutMax of cut or fill; not under lake ice
// or the sea; the ground under a house, shed, turbine or boulder stays put (the bank fades out round it); the last
// ROADS.ease m into a village or a forecourt eases back to the ground it was built on. Trees the bank would bury or
// leave on a pedestal go with the corridor. The far terrain is re-read after; the near snow patch is built after boot.
function bed(W) {
  const T = W.terrain; if (!T) return;
  const { ground, bio, res, n } = T, H = W.half, Rf = ROADS.bed, Rb = Rf + ROADS.bank;
  const best = new Map(), trees = new Map(), S = [];
  for (const rt of R.routes) for (const sg of rt.segs) {
    if (sg.street || sg.pts.length < 3) continue;
    const p = sg.pts, N = p.length, h0 = p.map(([x, z]) => W.groundAt(x, z)), cum = [0];
    for (let i = 1; i < N; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    const h = h0.slice();
    for (let it = 0; it < 3; it++) { const o = h.slice(); for (let i = 0; i < N; i++) { let s = 0, c = 0; for (let k = Math.max(0, i - 5); k <= Math.min(N - 1, i + 5); k++) { s += o[k]; c++; } h[i] = s / c; } }
    S.push({ p, N, h0, h, cum });
  }
  // two stretches of road side by side (the legs of a hairpin, a branch leaving the trunk) share one bed: each point is
  // pulled toward the height of the other road within ROADS.pair m, so a hairpin's turn is a level landing instead of a
  // 3-5 m step between legs 10 m apart; the grade is relaxed along each line in between
  const PB = new Map(), pk = (x, z) => Math.floor(z / 16) * 100000 + Math.floor(x / 16);
  S.forEach((s, si) => s.p.forEach(([x, z], i) => { const k = pk(x, z); let a = PB.get(k); if (!a) PB.set(k, a = []); a.push(si, i); }));
  const pair = S.map((s, si) => s.p.map(([x, z], i) => {
    const out = [], cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const a = PB.get((cz + dz) * 100000 + cx + dx); if (a) for (let q = 0; q < a.length; q += 2) {
      const sj = a[q], j = a[q + 1], o = S[sj].p[j]; if (Math.hypot(o[0] - x, o[1] - z) > ROADS.pair) continue;
      if (sj === si && Math.abs(s.cum[j] - s.cum[i]) < ROADS.pair * 2) continue; out.push(sj, j); } }
    return out.length ? out : null;
  }));
  const relax = () => { for (const s of S) for (let it = 0; it < 8; it++) for (let i = 1; i < s.N; i++) {
    const lim = ROADS.grade * (s.cum[i] - s.cum[i - 1]), df = s.h[i] - s.h[i - 1];
    if (Math.abs(df) > lim) { const e = (Math.abs(df) - lim) / 2 * Math.sign(df); s.h[i] -= e; s.h[i - 1] += e; } } };
  relax();
  for (let it = 0; it < 30; it++) {
    const nh = S.map(s => s.h.slice());
    S.forEach((s, si) => { for (let i = 0; i < s.N; i++) { const pr = pair[si][i]; if (!pr) continue; let m = 0, c = 0; for (let q = 0; q < pr.length; q += 2) { m += S[pr[q]].h[pr[q + 1]]; c++; } nh[si][i] = s.h[i] * 0.4 + (m / c) * 0.6; } });
    S.forEach((s, si) => { for (let i = 0; i < s.N; i++) s.h[i] = nh[si][i]; });
    relax();
  }
  for (const { p, N, h0, h, cum } of S) {
    for (let i = 0; i < N; i++) {
      const e = Math.min(cum[i], cum[N - 1] - cum[i]), t = e >= ROADS.ease ? 1 : (e / ROADS.ease) * (e / ROADS.ease) * (3 - 2 * e / ROADS.ease);
      h[i] = h0[i] + Math.max(-ROADS.cutMax, Math.min(ROADS.cutMax, h[i] - h0[i])) * t;
    }
    for (let i = 1; i < N; i++) {
      const [ax, az] = p[i - 1], [bx, bz] = p[i], ux = bx - ax, uz = bz - az, uu = ux * ux + uz * uz || 1;
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - Rb + H) / res)), i1 = Math.min(n - 1, Math.ceil((Math.max(ax, bx) + Rb + H) / res));
      const j0 = Math.max(0, Math.floor((Math.min(az, bz) - Rb + H) / res)), j1 = Math.min(n - 1, Math.ceil((Math.max(az, bz) + Rb + H) / res));
      for (let jj = j0; jj <= j1; jj++) for (let ii = i0; ii <= i1; ii++) {
        const x = ii * res - H, z = jj * res - H, t = Math.max(0, Math.min(1, ((x - ax) * ux + (z - az) * uz) / uu));
        const d = Math.hypot(x - ax - ux * t, z - az - uz * t); if (d > Rb) continue;
        const k = jj * n + ii, b = best.get(k); if (!b || d < b[0]) best.set(k, [d, h[i - 1] + (h[i] - h[i - 1]) * t]);
      }
      for (const o of W.obstaclesNear(bx, bz, Rb + 2)) if (o.tree !== undefined && !o.down && !trees.has(o) && Math.hypot(o.x - bx, o.z - bz) < Rb + 2) trees.set(o, W.groundAt(o.x, o.z));
    }
  }
  let moved = 0, deep = 0;
  for (const [k, [d, tg]] of best) {
    if (bio[k] === 1 || bio[k] === 3) continue;
    const x = (k % n) * res - H, z = Math.floor(k / n) * res - H, g0 = ground[k], dh = tg - g0;
    if (Math.abs(dh) < 0.02) continue;
    const bank = Math.min(ROADS.bank, 2 + Math.abs(dh) * 1.6);
    let w = d <= Rf ? 1 : d >= Rf + bank ? 0 : 1 - (d - Rf) / bank;
    if (w > 0 && w < 1) w = w * w * (3 - 2 * w);
    if (w <= 0) continue;
    for (const o of W.obstaclesNear(x, z, 16)) {
      if (o.tree !== undefined || o.log || !(o.top > 0.3)) continue;
      const r = o.r || 0.5, od = Math.hypot(o.x - x, o.z - z), r0 = Math.max(r + 1.5, 5.7), f = od <= r0 ? 0 : od >= r0 + 5 ? 1 : (od - r0) / 5; if (f < w) w = f;
    }
    if (w <= 0) continue;
    ground[k] = g0 + dh * w; moved++; if (Math.abs(dh * w) > 2) deep++;
  }
  for (const [o, g] of trees) if (Math.abs(W.groundAt(o.x, o.z) - g) > 0.3 && W.clearTree(o)) R.cleared++;
  R.bed = { nodes: moved, deep };
  T.refresh();
}

// ---- nearest road: segments bucketed on a 64 m grid
const BK = 64; let BKT = null;
function index() {
  BKT = new Map();
  for (const rt of R.routes) { rt.cum = [0]; for (let i = 1; i < rt.pts.length; i++) rt.cum.push(rt.cum[i - 1] + Math.hypot(rt.pts[i][0] - rt.pts[i - 1][0], rt.pts[i][1] - rt.pts[i - 1][1])); }
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
      if (d < best.d) best = { d, route: rt, s: rt.cum[s - 1] + t * Math.sqrt(uu) };   // s: metres along the route
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

// ---- the chart: roads painted onto the relief under the Map app and the minimap. The dark casing goes on once and a
// copy of the chart is kept; the road colours are drawn over that copy again whenever a stretch snows in or is plowed
// (3.2): open roads orange, snowed-in stretches ice blue, the shut fell road dashed.
function paintMap(W) {
  const cv = W.map && W.map.canvas; if (!cv) return;
  const g = cv.getContext("2d"), k = W.map.scale;
  g.save(); g.lineCap = g.lineJoin = "round"; g.strokeStyle = "rgba(20,30,40,.35)"; g.lineWidth = 3.2;
  for (const rt of R.routes) for (const sg of rt.segs) if (!(rt.closed && !sg.street)) line(g, sg.pts, k, W.half);
  g.restore();
  R.mapBase = document.createElement("canvas"); R.mapBase.width = cv.width; R.mapBase.height = cv.height;
  R.mapBase.getContext("2d").drawImage(cv, 0, 0);
  paintRoads();
}
function line(g, pts, k, half) { g.beginPath(); pts.forEach(([x, z], i) => { const px = (x + half) * k, pz = (z + half) * k; if (i) g.lineTo(px, pz); else g.moveTo(px, pz); }); g.stroke(); }
function paintRoads() {
  const W = api && api.world, cv = W && W.map && W.map.canvas; if (!cv || !R.mapBase) return;
  const g = cv.getContext("2d"), k = W.map.scale, h = W.half;
  g.save(); g.globalCompositeOperation = "copy"; g.drawImage(R.mapBase, 0, 0); g.restore();
  g.save(); g.lineCap = g.lineJoin = "round"; g.lineWidth = 1.7;
  for (const rt of R.routes) {
    for (const sg of rt.segs) {
      if (rt.closed && !sg.street) { g.strokeStyle = ROADS.mapClosed; g.setLineDash([4, 3]); line(g, sg.pts, k, h); g.setLineDash([]); }
      else if (sg.street || rt.closed) { g.strokeStyle = ROADS.mapCol; line(g, sg.pts, k, h); }
    }
    if (!rt.closed) for (const s of rt.seg) { g.strokeStyle = s.shut ? ROADS.mapSnow : ROADS.mapCol; for (const r of s.runs) line(g, r, k, h); }
  }
  g.restore(); R.paints = (R.paints || 0) + 1;
}

/* ---- road snow (3.2): storms fill the roads, the council plow clears them, saved.
   State (save key x.sys.roads): { r: { routeId: { s: [snow per stretch 0..1], p: plow metres along the route or -1,
   w: hours the plow has been waiting for the weather } }, h: the game hour last settled, warned }. Each open road's
   stretch (ROADS.seg m) sets how hard its legs are plowed: k = ROADS.plow x (1 - snow), in steps of 0.05 so the snow
   field is re-read only when it has moved; the yard system then lets the snow drift back in (refill, at the storm's
   rate) or cuts it down at once when the plow comes through. Village streets, house yards and the quay stay plowed
   (they are separate legs, and the plow map takes the hardest plow over a cell). Nothing here touches the closed fell
   road. TLXR.status(id) -> "open" | "snowed in" | "closed"; TLXR.setSnow(id, v[, i]) for tests. */
const RS = () => TLX.state("roads");
function snowInit() {
  const st = RS(); if (!st) return;
  if (!st.r || typeof st.r !== "object") st.r = {};
  for (const rt of R.routes) {
    if (rt.closed) continue;
    let o = st.r[rt.id]; if (!o || typeof o !== "object" || !Array.isArray(o.s)) o = st.r[rt.id] = { s: [], p: -1, w: 0 };
    o.s = rt.seg.map((g, i) => Math.max(0, Math.min(1, +o.s[i] || 0)));     // a build with different stretches: pad / trim
    if (!(o.p >= 0 && o.p < rt.len)) o.p = -1; o.w = +o.w || 0;
    rt.st = o;
  }
  if (typeof st.h !== "number" || !isFinite(st.h)) st.h = -1;
  snowApply(true);
}
function snowStep(dh) {
  const WX = api.WX;
  for (const rt of R.routes) {
    const o = rt.st; if (!o) continue;
    let max = 0;
    rt.seg.forEach((g, i) => { if (!g.legs.length) return; const w = WX.at(g.mx, g.mz); o.s[i] = Math.min(1, o.s[i] + dh * ROADS.fill * api.sstep(ROADS.fillA, ROADS.fillB, w)); if (o.s[i] > max) max = o.s[i]; });
    if (o.p < 0) {
      if (max >= ROADS.plowAt && WX.at(rt.pts[0][0], rt.pts[0][1]) < ROADS.plowWx) { o.w += dh; if (o.w >= ROADS.plowWait) { o.p = 0; o.w = 0; } }
      else o.w = 0;
    }
    if (o.p >= 0) {
      const p0 = o.p; o.p += dh * ROADS.plowV;
      rt.seg.forEach((g, i) => { if (g.a >= p0 - 1e-6 && g.a < o.p) o.s[i] = 0; });
      if (o.p >= rt.len) o.p = -1;
    }
  }
}
function snowApply(all) {
  const legs = []; let paint = !!all;
  for (const rt of R.routes) {
    const o = rt.st; if (!o) continue;
    rt.seg.forEach((g, i) => {
      const q = Math.round(o.s[i] * 20) / 20;
      if (q !== g.q || (all && q > 0)) { g.q = q; const k = ROADS.plow * (1 - q); for (const Y of g.legs) Y.k = k; legs.push(...g.legs); }
      const shut = g.legs.length > 0 && o.s[i] >= ROADS.shut; if (shut !== g.shut) { g.shut = shut; paint = true; }
    });
  }
  if (legs.length) R.replowed = (R.replowed || 0) + api.world.replow(legs);
  if (paint) paintRoads();
  // a word when the roads drift shut, and when the plow has opened them again
  const st = RS(), shutR = R.routes.filter(rt => rt.seg.some(g => g.shut));
  if (!all && api.started()) {
    if (shutR.length && !st.warned) { st.warned = true; api.toast("The " + shutR[0].name + (shutR.length > 1 ? " and others are" : " is") + " drifting shut. The council plow goes out once the storm eases."); }
    else if (!shutR.length && st.warned && R.routes.every(rt => !rt.st || rt.st.p < 0)) { st.warned = false; api.toast("The plow's been round: the roads are open again."); }
  } else if (all) st.warned = shutR.length > 0;
}
function snowTick() {
  const st = RS(); if (!R.ready || !st || !st.r) return;
  const H = api.GS.hour;
  if (st.h < 0 || H < st.h) { st.h = H; return; }
  const dh = H - st.h; if (dh < 0.02) return;
  st.h = H;
  if (dh > ROADS.skip) { for (const rt of R.routes) if (rt.st) { rt.st.s.fill(0); rt.st.p = -1; rt.st.w = 0; } }
  else snowStep(dh);
  snowApply(false);
}
R.status = id => { const rt = R.routes.find(r => r.id === id); return !rt ? null : rt.closed ? "closed" : rt.seg.some(g => g.shut) ? "snowed in" : "open"; };
R.setSnow = (id, v, i) => { for (const rt of R.routes) if (rt.st && (id === null || rt.id === id)) rt.st.s.forEach((_, j) => { if (i === undefined || i === j) rt.st.s[j] = Math.max(0, Math.min(1, v)); }); snowApply(false); };
R.snowAt = (x, z) => { const n = R.near(x, z); if (!n.route || !n.route.st) return n.route && n.route.closed ? 1 : 0; let b = 0, bd = Infinity; n.route.seg.forEach((g, i) => { if (!g.legs.length) return; const d = Math.hypot(g.mx - x, g.mz - z); if (d < bd) { bd = d; b = i; } }); return n.route.st.s[b]; };

/* ---- 3.2b: what the roads mean for a trip. The road graph is the routes' waypoints (villages, the quay, the stations)
   joined by each route's stretch between them. A trip anchors each end to a waypoint within ROADS.node m (in a village,
   at a station), else to the road it stands on (within ROADS.anchor m, at its distance along that road), else to the
   nearest waypoint within ROADS.reach m (a farm off a village's street); anything
   further out is sled country and the roads don't come into it. The shortest way through the graph is checked stretch by
   stretch: a snowed-in stretch on it, or the shut fell road, is what the compass and the Jobs app warn about.
   TLXR.trip(x0, z0, tgt) -> { route, why: "snowed in" | "closed" } or null; TLXR.tripWarn(...) -> the short text.
   TLXR.drift(x, z) -> the pickup's stuck line when it sits on a drifted (or shut) road, else "". */
ROADS.anchor = 60; ROADS.reach = 350; ROADS.node = 150;
let RG = null;
function roadGraph() {
  if (RG) return RG;
  const W = api.world, E = [], nodes = new Map();
  for (const r of ROADS.routes) {
    const rt = R.routes.find(q => q.id === r.id); if (!rt || !rt.cum) continue;
    const st = [];
    for (const id of r.via) {
      const p = place(id, W); if (!p) continue;
      let bi = 0, bd = Infinity; rt.pts.forEach((q, i) => { const d = Math.hypot(q[0] - p.x, q[1] - p.z); if (d < bd) { bd = d; bi = i; } });
      st.push({ id, s: rt.cum[bi] }); if (!nodes.has(id)) nodes.set(id, { x: p.x, z: p.z });
    }
    for (let i = 1; i < st.length; i++) E.push({ u: st[i - 1].id, v: st[i].id, rt, s0: st[i - 1].s, s1: st[i].s });
  }
  return RG = { E, nodes };
}
function anchor(x, z, id) {
  const g = roadGraph();
  if (id && g.nodes.has(id)) return { node: id };
  let best = null, bd = ROADS.reach; for (const [k, p] of g.nodes) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = k; } }
  if (best && bd <= ROADS.node) return { node: best };                    // in a village (or at a station): its waypoint
  const n = R.near(x, z); if (n.route && n.d <= ROADS.anchor) return { rt: n.route, s: n.s };
  return best ? { node: best } : null;
}
function tripPath(A, B) {
  const g = roadGraph(), E = g.E.slice(), key = (a, nm) => a.node || nm;
  const ka = key(A, "@A"), kb = key(B, "@B");
  if (ka === kb) return [];
  const on = (e, a) => a.rt === e.rt && a.s >= Math.min(e.s0, e.s1) - 1 && a.s <= Math.max(e.s0, e.s1) + 1;
  for (const [a, k] of [[A, ka], [B, kb]]) if (!a.node) for (const e of g.E) if (on(e, a)) { E.push({ u: k, v: e.u, rt: e.rt, s0: a.s, s1: e.s0 }, { u: k, v: e.v, rt: e.rt, s0: a.s, s1: e.s1 }); }
  if (!A.node && !B.node && A.rt === B.rt && g.E.some(e => on(e, A) && on(e, B))) E.push({ u: ka, v: kb, rt: A.rt, s0: A.s, s1: B.s });
  const dist = new Map([[ka, 0]]), prev = new Map(), done = new Set();
  for (;;) {
    let u = null, du = Infinity; for (const [k, d] of dist) if (!done.has(k) && d < du) { du = d; u = k; }
    if (u === null) return null; if (u === kb) break; done.add(u);
    for (const e of E) { const w = e.u === u ? e.v : e.v === u ? e.u : null; if (w === null || done.has(w)) continue; const d = du + Math.abs(e.s1 - e.s0); if (d < (dist.has(w) ? dist.get(w) : Infinity)) { dist.set(w, d); prev.set(w, e); } }
  }
  const out = []; for (let k = kb; k !== ka;) { const e = prev.get(k); out.push(e); k = e.u === k ? e.v : e.u; }
  return out.reverse();
}
const TRIPC = new Map();
R.trip = (x0, z0, tgt) => {
  if (!R.ready || !tgt || tgt.x === undefined) return null;
  const k = Math.round(x0 / 30) + "," + Math.round(z0 / 30) + "|" + Math.round(tgt.x) + "," + Math.round(tgt.z) + "|" + (R.paints || 0);
  if (TRIPC.has(k)) return TRIPC.get(k);
  if (TRIPC.size > 64) TRIPC.clear();
  let res = null;
  const A = anchor(x0, z0), B = anchor(tgt.x, tgt.z, tgt.id === undefined ? null : tgt === api.world.depot ? "depot" : tgt.id);
  const path = A && B ? tripPath(A, B) : null;
  if (path) for (const e of path) {
    if (e.rt.closed) { res = { route: e.rt, why: "closed" }; break; }
    const lo = Math.min(e.s0, e.s1), hi = Math.max(e.s0, e.s1);
    if (e.rt.seg.some(g => g.shut && g.a < hi && g.a + ROADS.seg > lo)) { res = { route: e.rt, why: "snowed in" }; break; }
  }
  TRIPC.set(k, res); return res;
};
R.tripWarn = (x0, z0, tgt) => { const t = R.trip(x0, z0, tgt); return !t ? "" : t.why === "closed" ? `${t.route.name} shut for the winter` : `${t.route.name} snowed in`; };
R.drift = (x, z) => {
  const n = R.near(x, z); if (!n.route || n.d > ROADS.half + 2.5) return "";
  if (n.route.closed) return `The ${n.route.name} is shut for the winter and nobody plows it. Take the sled.`;
  const st = n.route.st, i = Math.min(n.route.seg.length - 1, Math.max(0, Math.floor(n.s / ROADS.seg)));
  return st && st.s[i] >= ROADS.shut ? "The road's drifted shut. Wait for the plow or take the sled." : "";
};
// the Map app's road legend: the three road colours, with how many roads are snowed in right now
R.legend = () => {
  if (!R.ready || !R.routes.length) return "";
  const n = R.routes.filter(rt => !rt.closed && rt.seg.some(g => g.shut)).length;
  const sw = (st, dash) => `<i class="trl" style="border-top:3px ${dash ? "dashed" : "solid"} ${st}"></i>`;
  return `<span>Roads</span><em>${sw(ROADS.mapCol)}open</em><em>${sw(ROADS.mapSnow)}snowed in${n ? ` <b>${n}</b>` : ""}</em><em>${sw(ROADS.mapClosed, 1)}closed</em>`;
};

TLX.register({
  id: "roads", v: 2,
  state0: () => ({ r: {}, h: -1, warned: false }),
  migrate: st => Object.assign({ r: {}, h: -1, warned: false }, st || {}),
  init(a) { api = a; try { build(a.world); snowInit(); } catch (e) { console.error("TLX roads", e); R.err = String(e); } },
  tick() { try { snowTick(); } catch (e) { if (!R.tickErr) console.error("TLX roads tick", e); R.tickErr = String(e); } },
  save() { const st = RS(); if (st && st.r) for (const k in st.r) { const o = st.r[k]; if (o && Array.isArray(o.s)) o.s = o.s.map(v => Math.round(v * 1000) / 1000); if (o && o.p >= 0) o.p = Math.round(o.p); } if (st && st.h >= 0) st.h = Math.round(st.h * 1000) / 1000; }
});
})();
