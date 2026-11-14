// Tracklayer — boats (expansion slices 14.1-14.3, loop/EXPANSION.md milestone 14; the handline is tlx-seafish.js, through TLXB.addOn). Loaded after tlx-vehicles.js, before tracklayer.js.
//
// WHAT IT IS. A 4.6 m aluminium skiff with a 20 hp tiller outboard, bought at the garage (Boats tab) and moored at a timber
// jetty on piles (the småbåthavn) off the lowest bit of shore near the quay: the concrete quay stands ~9 m above the water,
// and nobody climbs into a skiff from that. The skiff is a vehicle like the pickup: tlx-vehicles.js owns the records, the
// swap of P, the save, the nearest-vehicle rule and the mount key; this file plugs in through TLXV.addKind with the parts
// that differ (model, water physics, getting in and out). It saves nothing of its own: the boat is a record in x.vehicles.
//
// THE WATER. Displacement hull with a planing hump: thrust is power-limited (20 hp through a prop, ~55% of it), drag ~ k v^2
// plus a hump round 4-5 m/s, so it struggles onto the plane and tops out near 10-11 m/s with one aboard. The keel kills most
// sideways slip; the tiller needs flow (thrust or way on) to turn the boat; reverse is 40%. Waves come from the weather
// (GS.storm, WX): the hull heaves, pitches and rolls over the swell and slams at speed in a sea. The shallows ground it
// (the draft, 0.32 m, against the depth at the bow / stern): it stops with a scrape, dents above 2.5 m/s, and backs off
// in reverse. Land and lake ice are land. If anything (a reset, a bad save) leaves it out of the water, it goes back to
// the last water it floated on.
//
// GETTING IN AND OUT. From the jetty's planks or any low shore (dry, unblocked ground within ~1.1 m of the gunwale, no
// more than 1.4 m above the water): walk to the gunwale, step down in with one foot, weight across (the boat heels),
// the other foot, turn and sit at the tiller. Getting out is the same backwards onto the nearest such spot.
//
// tracklayer.js hooks for this file: VEH.floor (the jetty planks in walkFloor and past the sea wall in footStep) and the
// "B" pin on the Map. Place comes from api.world (depot, sea mask, ground), never a Nordkinn constant.
(() => {
"use strict";

const ROW = { id: "skiff", name: "Fjordsnekka 460", kind: "skiff", boat: true, year: 2021, cost: 2600,
  blurb: "A 4.6 m welded aluminium skiff with a 20 hp tiller outboard. Open to the weather, light, quick on flat water.",
  mass: 330, power: 14700, fmax: 1500, top: 10.8, fuel: 25, burn: 1, slots: 4, cold: 1.25,
  len: 4.6, wid: 1.72, draft: 0.32, hitchKg: 0, hitchZ: 0,
  eye: [-0.22, 1.08, -1.42], seat: { x: -0.22, z: -1.55, y: 0.30 } };
const HB = 0.85, HL = 2.3;                                                     // half beam, half length (m)
const FLOOR = -0.14, GUN = 0.48;                                               // the floor inside, the gunwale amidships (boat frame, waterline = 0)
const MAX_BOATS = 2;
// things you do from the boat that live in their own file (14.3: tlx-seafish.js, the handline) plug in with TLXB.addOn:
// { init(api, kit), tick(R, r, isCur, dt), use(R), useLabel(R), useHint(R), grab(R, thr, brk), stop(R), pose(R, fig) }
const ADDONS = [];
function addon(fn, ...a) { for (const o of ADDONS) if (o[fn]) { const v = o[fn](...a); if (v) return v; } return null; }

let api = null, T = null;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrapA = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const S = () => TLXV.state();

/* ---------------- docks: the jetty you walk out on and moor at ----------------
   { x, z (root on the shore), yaw (out to sea), len, wid, y (deck height), gy (ground at the root) }. Built at boot from the
   world (same terrain, same jetty): nothing saved. */
const DOCKS = [];
const ROOT_BACK = 2.5;                                                         // the deck starts this far up the shore
function dockLocal(D, x, z) { const fx = Math.sin(D.yaw), fz = Math.cos(D.yaw), dx = x - D.x, dz = z - D.z; return { v: dx * fz - dz * fx, u: dx * fx + dz * fz }; }
function dockWorld(D, u, v) { const fx = Math.sin(D.yaw), fz = Math.cos(D.yaw); return [D.x + fz * v + fx * u, D.z - fx * v + fz * u]; }
// the root is a gangway from the shore (the coast here stands 1-4 m above the water) down to the level deck, about 1:3
function rampEnd(D) { return Math.max(2, (D.gy - D.y) * 3.2 - ROOT_BACK); }
function deckY(D, u) { const e = rampEnd(D); return u < e ? lerp(D.gy + 0.04, D.y, sstep(-ROOT_BACK, e, u)) : D.y; }
function floorAt(x, z) {                                                       // VEH.floor: jetty planks here, or null
  for (const D of DOCKS) { const q = dockLocal(D, x, z); if (q.u > -ROOT_BACK && q.u < D.len && Math.abs(q.v) < D.wid / 2) return deckY(D, q.u); }
  return null;
}
function depthAt(x, z) {                                                       // water under a point: m, or -1 on land / ice
  const w = api.world, wl = w.wlvAt(x, z); if (wl === null) return -1;
  return wl - w.groundAt(x, z);
}
function shoreNormal(x, z) {                                                   // unit vector toward the sea from (x, z)
  const w = api.world; let sx = 0, sz = 0;
  for (let k = 0; k < 16; k++) { const b = k * Math.PI / 8, cx = Math.sin(b), cz = Math.cos(b); for (const r of [3, 6]) if (w.isSea(x + cx * r, z + cz * r)) { sx += cx; sz += cz; } }
  const l = Math.hypot(sx, sz); return l < 1e-6 ? null : [sx / l, sz / l];
}
function siteDock(cx, cz, avoid, r0 = 30, r1 = 260) {                           // the best jetty near (cx, cz): low shore, deep water close in
  const w = api.world; let best = null, bs = 1e9;
  for (let r = r0; r <= r1; r += 4) for (let a = 0; a < 6.283; a += 0.05) {
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (w.isSea(x, z) || w.isWater(x, z)) continue;
    const g = w.groundAt(x, z); if (g < 0.25 || g > 4.5) continue;
    const n = shoreNormal(x, z); if (!n) continue;
    if (w.obNear(x, z, 2.5)) continue;
    if (avoid.some(p => Math.hypot(p[0] - x, p[1] - z) < p[2])) continue;
    // run out to sea along n: a straight line of sea, deep enough at the end
    const yaw = Math.atan2(n[0], n[1]); let len = 0, ok = true;
    for (let u = 1; u <= 30; u += 1) {
      const px = x + n[0] * u, pz = z + n[1] * u;
      if (!w.isSea(px, pz)) { if (u > 4) { ok = false; break; } continue; }
      if (u >= Math.max(9, rampEnd({ gy: g, y: 0.95 }) + 6) && depthAt(px, pz) >= 1.6) { len = u; break; }
    }
    if (!ok || !len) continue;
    const D = { x, z, yaw, len: len + 1, wid: 2.0, y: 0.95, gy: g };
    // a berth each side of the outer end: the whole hull in deep enough water
    let berths = 0; for (const sd of [-1, 1]) if (berthOK(D, sd)) berths++;
    if (berths < 2) continue;
    const sc = r + len * 3 + Math.abs(g - 1) * 12;
    if (sc < bs) { bs = sc; best = D; }
  }
  return best;
}
function berthPose(D, side) { const v = side * (D.wid / 2 + HB + 0.25), u = D.len - HL - 0.8, p = dockWorld(D, u, v); return { x: p[0], z: p[1], yaw: D.yaw }; }
function berthOK(D, side) {
  const b = berthPose(D, side), fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
  for (const lz of [-HL, 0, HL]) for (const lx of [-HB, HB]) { const x = b.x + fz * lx + fx * lz, z = b.z - fx * lx + fz * lz; if (!api.world.isSea(x, z) || depthAt(x, z) < 0.9) return false; }
  return true;
}
function buildDock(D) {
  const g = new T.Group(); g.position.set(D.x, 0, D.z); g.rotation.y = D.yaw;
  const plank = new T.MeshStandardMaterial({ color: 0x6b5a48, roughness: 0.92 }), pile = new T.MeshStandardMaterial({ color: 0x3b332b, roughness: 0.95 });
  const snow = new T.MeshStandardMaterial({ color: 0xeef3f8, roughness: 0.95 }), steel = new T.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.6, metalness: 0.4 });
  const fender = new T.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.8 });
  const add = (geo, mat, x, y, z, rx = 0, sh = true) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = sh; m.receiveShadow = true; g.add(m); return m; };
  // the deck in 1.2 m bays: the root ones slope up from the shore, the rest level
  for (let u = -ROOT_BACK; u < D.len - 0.01; u += 1.2) {
    const u1 = Math.min(D.len, u + 1.2), y0 = deckY(D, u), y1 = deckY(D, u1), L = Math.hypot(u1 - u, y1 - y0);
    add(new T.BoxGeometry(D.wid, 0.08, L + 0.02), plank, 0, (y0 + y1) / 2 - 0.04, (u + u1) / 2, -Math.atan2(y1 - y0, u1 - u));
    for (const sd of [-1, 1]) add(new T.BoxGeometry(0.18, 0.05, L), snow, sd * (D.wid / 2 - 0.12), (y0 + y1) / 2 + 0.01, (u + u1) / 2, -Math.atan2(y1 - y0, u1 - u), false);   // what the boots left on the edges
    if (u < rampEnd(D) + 0.6) for (const sd of [-1, 1]) {                        // the gangway's handrail: a post each bay, a rail along the slope
      add(new T.BoxGeometry(0.05, 0.05, L + 0.02), steel, sd * (D.wid / 2 - 0.04), (y0 + y1) / 2 + 0.92, (u + u1) / 2, -Math.atan2(y1 - y0, u1 - u), false);
      add(new T.BoxGeometry(0.05, 0.92, 0.05), steel, sd * (D.wid / 2 - 0.04), y0 + 0.46, u, 0, false);
    }
  }
  // stringers under the deck and piles down to the sea bed
  { const e = Math.max(1.5, rampEnd(D)); for (const sd of [-1, 1]) add(new T.BoxGeometry(0.16, 0.22, D.len - e), pile, sd * (D.wid / 2 - 0.1), D.y - 0.19, (D.len + e) / 2, 0, false); }
  for (let u = 1.5; u <= D.len; u += 3) for (const sd of [-1, 1]) {
    const p = dockWorld(D, u, sd * (D.wid / 2 + 0.05)), dy = deckY(D, u), bed = Math.min(api.world.groundAt(p[0], p[1]), dy - 0.6), h = dy + 0.25 - bed;
    add(new T.CylinderGeometry(0.13, 0.15, h, 8), pile, sd * (D.wid / 2 + 0.05), bed + h / 2, u);
    if (u > D.len - 7) add(new T.CylinderGeometry(0.12, 0.12, 0.5, 8), fender, sd * (D.wid / 2 + 0.2), 0.45, u, 0, false);     // tyres on the berth piles
  }
  for (const sd of [-1, 1]) for (const u of [D.len - 1.2, D.len - 5.4]) add(new T.CylinderGeometry(0.07, 0.09, 0.22, 8), steel, sd * (D.wid / 2 - 0.25), D.y + 0.11, u);   // cleats
  api.scene.add(g); D.mesh = g;
}
// the skiff pushes off the jetty: its piles are a wall
function dockPush(P, vx, vz) {
  for (const D of DOCKS) {
    const q = dockLocal(D, P.x, P.z), hw = D.wid / 2 + HB * 0.92, fx = Math.sin(D.yaw), fz = Math.cos(D.yaw);
    if (q.u < -1 || q.u > D.len + HL * 0.6 || Math.abs(q.v) >= hw) continue;
    const ox = hw - Math.abs(q.v), oz = D.len + HL * 0.6 - q.u;
    if (ox < oz) { const s = Math.sign(q.v || 1), nv = s * hw, p = dockWorld(D, q.u, nv); P.x = p[0]; P.z = p[1]; const nX = fz * s, nZ = -fx * s, into = vx * nX + vz * nZ; if (into < 0) { vx -= into * nX * 1.3; vz -= into * nZ * 1.3; } }
    else { const p = dockWorld(D, D.len + HL * 0.6, q.v); P.x = p[0]; P.z = p[1]; const into = vx * fx + vz * fz; if (into < 0) { vx -= into * fx * 1.3; vz -= into * fz * 1.3; } }
    return [vx, vz, true];
  }
  return [vx, vz, false];
}
// which water joins which: one flood fill of the sea from the quay jetty's end (16 m cells, 4-connected), so a village
// jetty is only built where the skiff can actually get to it
const SEA_C = 16;
let SEA = null;
function seaFill(x0, z0) {
  const w = api.world, H = w.half, N = Math.ceil(w.size / SEA_C), seen = new Uint8Array(N * N), q = new Int32Array(N * N);
  const cell = (x, z) => { const i = Math.floor((x + H) / SEA_C), j = Math.floor((z + H) / SEA_C); return i < 0 || j < 0 || i >= N || j >= N ? -1 : j * N + i; };
  const wet = k => { const i = k % N, j = (k / N) | 0; return w.isSea(-H + (i + 0.5) * SEA_C, -H + (j + 0.5) * SEA_C); };
  const s = cell(x0, z0); if (s < 0) return null;
  let h = 0, t = 0; seen[s] = 1; q[t++] = s;
  while (h < t) {
    const k = q[h++], i = k % N, j = (k / N) | 0;
    for (const n of [i > 0 ? k - 1 : -1, i < N - 1 ? k + 1 : -1, j > 0 ? k - N : -1, j < N - 1 ? k + N : -1]) if (n >= 0 && !seen[n]) { seen[n] = 2; if (wet(n)) { seen[n] = 1; q[t++] = n; } }
  }
  return { seen, cell, cells: t, N };
}
function dockEnd(D) { const p = dockWorld(D, D.len + 2, 0); return { x: p[0], z: p[1] }; }
function seaLinked(x, z) {
  if (!SEA) return true;
  for (const [dx, dz] of [[0, 0], [SEA_C, 0], [-SEA_C, 0], [0, SEA_C], [0, -SEA_C]]) { const k = SEA.cell(x + dx, z + dz); if (k >= 0 && SEA.seen[k] === 1) return true; }
  return false;
}
// the jetties of the villages and the lighthouse: the same jetty the quay has, sited the same way
function siteVillageDocks() {
  const W = api.world, quay = DOCKS[0]; if (!quay) return;
  const e = dockEnd(quay); SEA = seaFill(e.x, e.z);
  for (const s of W.SITES) {
    if (!(s.kind === "village" || s.type === "relay") || s.x === undefined) continue;
    const avoid = DOCKS.map(D => [D.x, D.z, 60]);
    const D = siteDock(s.x, s.z, avoid) || siteDock(s.x, s.z, avoid, 264, 520);
    if (!D || !seaLinked(dockEnd(D).x, dockEnd(D).z)) continue;
    D.site = s; D.name = shortSite(s) + " jetty"; DOCKS.push(D); buildDock(D);
  }
}
function shortSite(s) { return s.type === "relay" ? "Slettnes" : s.type === "depot" ? "Quay" : String(s.name).split(" ")[0]; }
function dockFor(site) { return DOCKS.find(D => D.site === site) || null; }
// alongside a jetty: from its root to 4 m past the end, within ~4 m of the planks
function dockAt(x, z) {
  for (const D of DOCKS) { const q = dockLocal(D, x, z); if (q.u > -1 && q.u < D.len + 4 && Math.abs(q.v) < D.wid / 2 + 2 * HB + 1.6) return D; }
  return null;
}
// where the compass points for a site when you're in the boat: the outer end of its jetty
function aimFor(site) { const D = site && dockFor(site); return D ? dockEnd(D) : null; }
// tied up (or idling) alongside a jetty, the jetty works as its village: parcels for it hand over, pickups there load
function dockWork(R) {
  const P = api.P, GS = api.GS, v = Math.hypot(P.vx, P.vz);
  const D = v < 2.5 && !api.busy() ? dockAt(P.x, P.z) : null, site = D ? D.site : null;
  if (site !== R.atSite) {
    const first = R.atSite === undefined; R.atSite = site;
    if (site && !first && !GS.load.some(j => j.dest === site) && !GS.claims.some(j => (j.from || api.world.depot) === site)) api.toast(`${D.name[0].toUpperCase() + D.name.slice(1)}. ${site.type === "depot" ? "The quay's hose reaches down here: she fills while she's tied up." : `${site.name} is up the shore: you warm up while she's tied up.`}`);
  }
  if (!site) return;
  if (GS.load.some(j => j.dest === site)) api.deliver(site);
  if (GS.claims.length) api.collectClaims(site);
}
// tied up at a jetty you have its place's warmth (and the quay's fuel hose at the quay jetty): the site, or null. Seated
// alongside it, or stood on its planks with her moored there.
function shoreSite(R) {
  const FOOT = api.FOOT, P = api.P;
  if (!FOOT.on) return (!api.MNT.on && !api.DMT.on && R.atSite) || null;
  if (floorAt(FOOT.x, FOOT.z) === null) return null;
  const D = dockAt(P.x, P.z); return D ? D.site : null;
}

/* ---------------- sea jobs (14.2b): freight between jetties, for the skiff only ----------------
   Once you own a skiff the Parcels board carries up to two sea jobs (`j.sea`): fish boxes, crab pots, an outboard for the
   workshop, from one jetty to another. They wait at the jetty, not in the village: they load only into the boat, tied up
   alongside (`collectClaims` in tracklayer.js skips them unless the current vehicle floats), and hand over the same way
   at the destination's jetty. Pay goes by the distance by sea (a flood-fill count from jetty to jetty, not the crow's
   line), and when the road between the two places is snowed in or shut for the winter at the moment the job is posted the
   sender pays 35% more ("ROAD SHUT +35%"): the boat is then the only way. The first job on a board leaves from the jetty
   nearest your boat. Nothing of its own is saved: posted jobs and claims are session state like every parcel, and a sea
   parcel aboard is saved with the boat's load by tlx-vehicles.js. */
const SEA_CARGO = [["Fish boxes on ice", 1, false], ["Coils of longline", 0.95, false], ["Crab pots", 0.9, false], ["An outboard for the workshop", 1.15, true],
  ["A drum of marine diesel", 1.05, false], ["Tubs of salmon smolt", 1.25, true], ["Net floats and rope", 0.85, false], ["Bales of klippfisk", 1, false], ["Lamp glass for the lighthouse", 1.2, true]];
const SEA_MAX = 2, SEA_GAP = 90, SEA_SHUT = 1.35;                              // posted at once; game seconds between postings; the road-shut premium
let seaT = 4, seaSaid = false; const seaKeep = [];
function seaCell(D) {                                                          // the cell of the quay's sea at this jetty's end
  const e = dockEnd(D);
  for (const [dx, dz] of [[0, 0], [SEA_C, 0], [-SEA_C, 0], [0, SEA_C], [0, -SEA_C]]) { const k = SEA.cell(e.x + dx, e.z + dz); if (k >= 0 && SEA.seen[k] === 1) return k; }
  return -1;
}
function seaKm(A, B) {                                                         // jetty to jetty by water, km (about: 4-connected steps, eased for the diagonals)
  const crow = Math.hypot(A.x - B.x, A.z - B.z) / 1000;
  if (A === B) return 0;
  if (!SEA) return crow * 1.3;
  if (!A.sd) {
    const N = SEA.N, sd = A.sd = new Int32Array(N * N).fill(-1), q = new Int32Array(N * N), s = seaCell(A);
    let h = 0, t = 0; if (s >= 0) { sd[s] = 0; q[t++] = s; }
    while (h < t) { const k = q[h++], i = k % N, j = (k / N) | 0; for (const n of [i > 0 ? k - 1 : -1, i < N - 1 ? k + 1 : -1, j > 0 ? k - N : -1, j < N - 1 ? k + N : -1]) if (n >= 0 && sd[n] < 0 && SEA.seen[n] === 1) { sd[n] = sd[k] + 1; q[t++] = n; } }
  }
  const k = seaCell(B), n = k >= 0 ? A.sd[k] : -1;
  return n < 0 ? crow * 1.3 : Math.max(crow, n * SEA_C * 0.8 / 1000);
}
function seaJobs() { const GS = api.GS; return (GS.jobs || []).concat(GS.claims || []).filter(j => j && j.sea); }
function seaPost() {
  const GS = api.GS, P = api.P, s = S(), boat = boats()[0];
  if (!boat || DOCKS.length < 2 || !Array.isArray(GS.jobs)) return null;
  const bx = s.cur === boat.uid ? P.x : boat.x, bz = s.cur === boat.uid ? P.z : boat.z, have = seaJobs();
  let home = DOCKS[0], hd = 1e9; for (const D of DOCKS) { const d = Math.hypot(D.x - bx, D.z - bz); if (d < hd) { hd = d; home = D; } }
  const pairs = []; for (const A of DOCKS) for (const B of DOCKS) if (A !== B && !have.some(j => j.from === A.site && j.dest === B.site)) pairs.push([A, B]);
  if (!pairs.length) return null;
  const fromHome = pairs.filter(p => p[0] === home), pool = fromHome.length && !have.some(j => j.from === home.site) ? fromHome : pairs;
  const [A, B] = pool[(Math.random() * pool.length) | 0];
  const cgs = SEA_CARGO.filter(c => !have.some(j => j.cargo === c[0]) && (c[0].indexOf("lighthouse") < 0 || B.site.type === "relay")), cg = cgs[(Math.random() * cgs.length) | 0] || SEA_CARGO[0];
  const km = seaKm(A, B), shut = (window.TLXR && TLXR.tripWarn && TLXR.tripWarn(A.site.x, A.site.z, B.site)) || "";
  const j = { dest: B.site, from: A.site, cargo: cg[0], fragile: cg[2], sea: true, seaKm: +km.toFixed(1), due: null,
    pay: Math.round((45 + km * 130) * cg[1] * (shut ? SEA_SHUT : 1) / 5) * 5 };
  if (shut) j.shut = shut;
  GS.jobs.push(j); seaKeep.push(j);
  return j;
}
function seaBoard(dt) {
  const GS = api.GS;
  if (!api.started() || api.busy() || api.tutHidden() || GS.dead || !Array.isArray(GS.jobs)) return;
  // the board is rebuilt wholesale (a new day, a drop-off while roaming, the ferry's freight): sea jobs not yet taken go back on
  for (let i = seaKeep.length - 1; i >= 0; i--) { const j = seaKeep[i]; if (j.hits !== undefined) seaKeep.splice(i, 1); else if (!GS.jobs.includes(j) && !GS.claims.includes(j)) { GS.jobs.push(j); api.TABLET.refresh("parcels"); } }
  seaT -= dt; if (seaT > 0) return;
  seaT = 2;
  const posted = GS.jobs.filter(j => j.sea).length;
  if (posted >= SEA_MAX || seaJobs().length >= ROW.slots) return;
  const j = seaPost(); if (!j) return;
  seaT = SEA_GAP; api.TABLET.refresh("parcels");
  if (!seaSaid) { seaSaid = true; api.TABLET.notify({ app: "parcels", title: "Sea freight for the skiff", body: `${j.cargo}, ${shortSite(j.from).toLowerCase() === "quay" ? "quay jetty" : shortSite(j.from) + " jetty"} to ${shortSite(j.dest)}: ${api.fmtCash(j.pay)}. Jobs marked BY BOAT load and hand over at the jetties.`, ttl: 9 }); }
}

/* ---------------- the model: a lofted V hull, thwarts, floorboards, the outboard and its tiller ---------------- */
function bw(z) { return z > -0.5 ? HB * (1 - Math.pow((z + 0.5) / 2.8, 2)) : HB - 0.07 * ((-0.5 - z) / 1.8); }   // half beam at the gunwale
function sheer(z) { return GUN + 0.3 * Math.pow(sstep(-0.2, HL, z), 1.6); }
function keelY(z) { return -0.28 + 0.6 * Math.pow(sstep(0.4, HL, z), 1.8); }
function chine(z) { return [bw(z) * 0.78, lerp(-0.13, 0.5, Math.pow(sstep(0.6, HL, z), 1.5))]; }
function hullGeo() {
  const st = []; for (let i = 0; i <= 22; i++) st.push(-HL + (2 * HL) * i / 22);
  const pos = [], col = [];
  const C1 = [0.62, 0.66, 0.69], C2 = [0.16, 0.3, 0.42];                       // bare aluminium; a painted topside band
  const tri = (a, b, c, k) => { pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) col.push(...k); };
  const quad = (a, b, c, d, k) => { tri(a, b, c, k); tri(a, c, d, k); };
  for (let i = 0; i < st.length - 1; i++) {
    const z0 = st[i], z1 = st[i + 1];
    for (const sd of [-1, 1]) {
      const k0 = [0, keelY(z0), z0], k1 = [0, keelY(z1), z1];
      const c0 = chine(z0), c1 = chine(z1), ch0 = [sd * c0[0], c0[1], z0], ch1 = [sd * c1[0], c1[1], z1];
      const m0 = [sd * bw(z0) * 0.97, lerp(c0[1], sheer(z0), 0.55), z0], m1 = [sd * bw(z1) * 0.97, lerp(c1[1], sheer(z1), 0.55), z1];
      const g0 = [sd * bw(z0), sheer(z0), z0], g1 = [sd * bw(z1), sheer(z1), z1];
      quad(k0, k1, ch1, ch0, C1); quad(ch0, ch1, m1, m0, C1); quad(m0, m1, g1, g0, C2);
    }
  }
  // the transom
  const z = -HL, c = chine(z), k = [0, keelY(z), z];
  for (const sd of [-1, 1]) { const ch = [sd * c[0], c[1], z], g = [sd * bw(z), sheer(z), z]; tri(k, ch, [0, sheer(z), z], C1); tri(ch, g, [0, sheer(z), z], C1); }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals(); return geo;
}
let MAT = null, HULL = null;
function mats() {
  if (MAT) return MAT;
  MAT = {
    hull: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.35, side: T.DoubleSide }),
    wood: new T.MeshStandardMaterial({ color: 0x8a6d4c, roughness: 0.85 }), rail: new T.MeshStandardMaterial({ color: 0x9aa2a8, roughness: 0.35, metalness: 0.5 }),
    motor: new T.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.45, metalness: 0.2 }), red: new T.MeshStandardMaterial({ color: 0xb2271f, roughness: 0.5 }),
    navR: new T.MeshBasicMaterial({ color: 0xff3020 }), navG: new T.MeshBasicMaterial({ color: 0x20ff60 }), navW: new T.MeshBasicMaterial({ color: 0xfff6dd }),
    parcel: new T.MeshStandardMaterial({ color: 0xa47c4e, roughness: 0.85 })
  };
  return MAT;
}
function runtime(r, d) {
  const M = mats(); if (!HULL) HULL = hullGeo();
  const grp = new T.Group(); grp.rotation.order = "YXZ"; grp.visible = false;
  const body = new T.Group(); grp.add(body);
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, par = body, sh = true) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = sh; m.receiveShadow = true; par.add(m); return m; };
  add(HULL, M.hull, 0, 0, 0);
  // gunwale rails along the sheer, thwarts, floorboards, a bow cap
  for (let i = 0; i < 10; i++) {
    const z0 = -HL + i * 0.45, z1 = Math.min(HL - 0.25, z0 + 0.45); if (z0 >= HL - 0.25) break;
    for (const sd of [-1, 1]) { const x0 = sd * bw(z0), x1 = sd * bw(z1), y0 = sheer(z0), y1 = sheer(z1), L = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const m = add(new T.BoxGeometry(0.05, 0.045, L + 0.02), M.rail, (x0 + x1) / 2, (y0 + y1) / 2 + 0.02, (z0 + z1) / 2); m.rotation.set(-Math.atan2(y1 - y0, z1 - z0), Math.atan2(x1 - x0, z1 - z0), 0, "YXZ"); }
  }
  for (const [z, w] of [[-1.55, 0.3], [0.05, 0.26], [1.25, 0.24]]) add(new T.BoxGeometry(bw(z) * 2 - 0.06, 0.045, w), M.wood, 0, 0.24, z);
  add(new T.BoxGeometry(0.8, 0.03, 3.4), M.wood, 0, FLOOR + 0.02, -0.45);
  add(new T.BoxGeometry(bw(-HL) * 2 - 0.04, 0.05, 0.08), M.wood, 0, sheer(-HL) - 0.02, -HL + 0.05);   // transom cap
  // the outboard: clamp bracket on the transom, a pivot that turns with the tiller, cowling, leg, cavitation plate, prop
  const om = R0.om = new T.Group(); om.position.set(0, sheer(-HL), -HL - 0.08); body.add(om);
  add(new T.BoxGeometry(0.16, 0.2, 0.12), M.motor, 0, -0.05, 0.04, 0, 0, 0, om);
  add(new T.BoxGeometry(0.34, 0.36, 0.5), M.motor, 0, 0.22, -0.12, 0, 0, 0, om);
  add(new T.BoxGeometry(0.35, 0.05, 0.51), M.red, 0, 0.1, -0.12, 0, 0, 0, om, false);
  add(new T.CylinderGeometry(0.05, 0.06, 0.82, 8), M.motor, 0, -0.45, -0.06, 0, 0, 0, om);
  add(new T.BoxGeometry(0.3, 0.02, 0.32), M.motor, 0, -0.66, -0.1, 0, 0, 0, om, false);
  add(new T.BoxGeometry(0.1, 0.14, 0.3), M.motor, 0, -0.84, -0.08, 0, 0, 0, om);
  const prop = R0.prop = add(new T.BoxGeometry(0.34, 0.06, 0.02), M.motor, 0, -0.84, -0.25, 0, 0, 0, om, false);
  // the tiller arm reaches forward from the cowling to the helmsman's hand
  const ta = R0.tiller = new T.Group(); ta.position.set(0, 0.12, 0.12); om.add(ta);
  add(new T.BoxGeometry(0.06, 0.05, 0.62), M.motor, 0, 0.04, 0.3, -0.12, 0, 0, ta);
  add(new T.CylinderGeometry(0.03, 0.03, 0.16, 8), M.red, 0, 0.08, 0.62, Math.PI / 2 - 0.12, 0, 0, ta, false);
  // nav lights: red to port (+x here is the boat's left), green to starboard, a white stern light on a short pole
  R0.nav = [add(new T.SphereGeometry(0.035, 8, 6), M.navR, 0.12, sheer(HL - 0.3) + 0.05, HL - 0.3, 0, 0, 0, body, false), add(new T.SphereGeometry(0.035, 8, 6), M.navG, -0.12, sheer(HL - 0.3) + 0.05, HL - 0.3, 0, 0, 0, body, false)];
  add(new T.CylinderGeometry(0.015, 0.015, 0.7, 6), M.rail, 0.55, sheer(-HL) + 0.35, -HL + 0.12);
  R0.nav.push(add(new T.SphereGeometry(0.04, 8, 6), M.navW, 0.55, sheer(-HL) + 0.72, -HL + 0.12, 0, 0, 0, body, false));
  // the helmsman: a walker figure, posed seated at the tiller each frame (built lazily: no figures from init)
  const R = Object.assign({ grp, body, om: R0.om, prop: R0.prop, tillerG: R0.tiller, nav: R0.nav, drvBody: new T.Group(), drvArms: new T.Object3D(),
    yr: 0, til: 0, heave: 0, hv: 0, pitch: 0, pv: 0, roll: 0, rv: 0, A: null, aground: 0, warnT: 0, lastW: null, spray: 0, parcels: -1, pbox: null, cond: r.cond }, {});
  R.drvBody.visible = false; body.add(R.drvBody);
  api.scene.add(grp);
  return R;
}
const R0 = {};
function driverFig(R) {
  if (R.fig) return R.fig;
  const g = api.newWalker(); R.drvBody.add(g); R.fig = g;
  return g;
}
function poseSeated(R) {
  const g = driverFig(R), U = g.userData, d = ROW;
  if (addon("pose", R, g)) return;                                              // working a handline over the side (tlx-seafish.js)
  g.position.set(d.seat.x, d.seat.y - 0.93, d.seat.z); g.rotation.set(0, 0.35, 0);   // turned a little toward the tiller
  U.torso.rotation.set(0.12, 0, 0); U.torso.position.y = 0.93; U.head.rotation.set(-0.06, -0.3, 0);
  for (let i = 0; i < 2; i++) { U.legs[i].rotation.set(-1.42, 0, (i ? 1 : -1) * 0.1); U.legs[i].position.set(i ? 0.1 : -0.1, 0.93, 0); U.shins[i].rotation.x = 1.38; U.ank[i].rotation.x = 0.05; }
  // left hand (arms[1]) on the tiller grip, which swings with the motor; right hand on the knee
  const t = R.til;
  U.arms[1].rotation.set(0.25 - 0.1 * t, 0, 0.35 + 0.55 * t); U.fore[1].rotation.x = -0.9;
  U.arms[0].rotation.set(-0.5, 0, -0.08); U.fore[0].rotation.x = -0.75;
}

/* ---------------- waves ---------------- */
function waveAmp() { const GS = api.GS; return 0.05 + 0.3 * clamp(GS.storm || 0, 0, 1); }
function waveAt(x, z, t) {
  const A = waveAmp();
  return A * (Math.sin(0.21 * x + 0.13 * z - 1.3 * t) + 0.55 * Math.sin(-0.11 * x + 0.29 * z - 1.9 * t + 1.7) + 0.3 * Math.sin(0.37 * x - 0.31 * z - 2.6 * t + 0.4));
}
// heave / pitch / roll the hull wants over the swell at (x, z, yaw)
function swell(x, z, yaw, t, out) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const b = waveAt(x + fx * 1.8, z + fz * 1.8, t), s = waveAt(x - fx * 1.8, z - fz * 1.8, t), l = waveAt(x + fz * 0.8, z - fx * 0.8, t), r = waveAt(x - fz * 0.8, z + fx * 0.8, t);
  out[0] = (b + s + l + r) / 4; out[1] = Math.atan2(b - s, 3.6); out[2] = Math.atan2(l - r, 1.6);
  return out;
}
const _sw = [0, 0, 0];

/* ---------------- the water physics (VEH.cur.core) ---------------- */
const RHO_K = 7.0;                                                            // N per (m/s)^2: 20 hp through the prop tops out ~10.8 m/s
function load(R) { const L = api.GS.load || []; return L.filter(j => j && !j.big).length; }
function core(R, dt) {
  const P = api.P, input = api.input, FOOT = api.FOOT, GS = api.GS, HELP = api.HELP, w = api.world, d = ROW, t = api.now();
  if (HELP.on && HELP.kind === "sea") { P.vx = P.vz = P.vy = 0; P.y = Math.max(w.rideSurf(P.x, P.z), P.wl - 0.5); P.gnd = true; P.wet = true; return; }
  let dep = depthAt(P.x, P.z);
  if (dep < 0.12) { relaunch(R); dep = depthAt(P.x, P.z); }
  const wl = w.wlvAt(P.x, P.z); if (wl !== null) P.wl = wl;
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), lx = fz, lz = -fx;
  let vf = P.vx * fx + P.vz * fz, vl = P.vx * lx + P.vz * lz;
  const parked = FOOT.on || GS.dead || api.MNT.on || api.DMT.on || !!R.fishing, fuel = GS.fuel > 0 && !GS.dead;
  const n = load(R), M = d.mass + 90 + 6 * n;
  const thr = fuel && !parked ? input.thr : 0, rev = fuel && !parked && input.brk > 0 && !(input.thr > 0);
  const pw = d.power * 0.55 * (0.75 + 0.25 * (R.rec.cond == null ? 1 : R.rec.cond / 100));
  let F = 0;
  if (thr > 0) F = thr * Math.min(d.fmax, pw / Math.max(0.5, vf));
  else if (rev) F = -0.4 * input.brk * Math.min(d.fmax, pw / Math.max(0.5, -vf));
  const storm = clamp(GS.storm || 0, 0, 1);
  const hump = 330 * Math.exp(-Math.pow((Math.abs(vf) - 4.6) / 1.7, 2));       // climbing over the bow wave onto the plane
  const drag = (RHO_K * (1 + 0.5 * storm) * vf * vf + hump + 45 * Math.abs(vf)) * Math.sign(vf) * (vf < 0 ? 2.2 : 1);   // a transom going backwards ships water and drags
  vf += (F - drag) / M * dt;
  if (Math.abs(vf) < 0.02 && !thr && !rev) vf = 0;
  vl *= Math.exp(-(1.4 + 0.25 * Math.abs(vf)) * dt);                          // the keel and the chines bite
  // the tiller: the outboard swings opposite the way you want to go; it turns the boat with thrust or with way on
  R.til += (input.steer * (parked ? 0 : 1) - R.til) * (1 - Math.exp(-6 * dt));
  const flow = Math.min(1, 0.11 * Math.abs(vf) + 0.85 * Math.abs(F) / d.fmax), dir = vf < -0.3 || (F < 0 && vf < 0.3) ? -1 : 1;
  const yrT = -R.til * (0.9 - 0.25 * sstep(6, 11, Math.abs(vf))) * flow * dir;
  R.yr += (yrT - R.yr) * (1 - Math.exp(-2.6 * dt));
  const dyaw = R.yr * dt; P.yaw = wrapA(P.yaw + dyaw); P.yr = R.yr;
  vl -= vf * dyaw * 0.15;                                                       // a hard turn at speed skids a little
  // the wind pushes an open boat about (a storm, off the weather's direction if there is one)
  const fx2 = Math.sin(P.yaw), fz2 = Math.cos(P.yaw), lx2 = fz2, lz2 = -fx2;
  let vx = fx2 * vf + lx2 * vl, vz = fz2 * vf + lz2 * vl;
  const wa = (api.WX && api.WX.windA !== undefined) ? api.WX.windA : 0.7; vx += Math.sin(wa) * storm * 0.25 * dt; vz += Math.cos(wa) * storm * 0.25 * dt;
  // the shallows: depth under the bow (or the stern going astern) against the draft
  const ahead = vf >= 0 ? HL - 0.2 : -HL + 0.1, nx = P.x + vx * dt, nz = P.z + vz * dt;
  const dAhead = depthAt(nx + fx2 * ahead, nz + fz2 * ahead), dMid = depthAt(nx, nz);
  if (dAhead < d.draft || dMid < d.draft * 0.8) {
    const imp = Math.abs(vf);
    if (imp > 0.6 && R.aground <= 0) {
      api.thud(Math.min(1, imp / 6)); P.shake = Math.max(P.shake || 0, Math.min(0.7, imp / 8));
      if (imp > 2.5) { R.rec.cond = Math.max(0, (R.rec.cond == null ? 100 : R.rec.cond) - Math.min(25, (imp - 2.5) * 5)); if (api.cargoHit) api.cargoHit(imp * 0.5); }
      if (R.warnT <= 0) { api.toast(imp > 2.5 ? "Aground, hard: the hull's dented. Back off in reverse." : `Aground in the shallows. ${api.btn("brake")} backs her off.`, imp > 2.5 ? "bad" : "warn"); R.warnT = 8; }
    }
    R.aground = 0.6;
    vx = vz = 0; vf = 0;                                                        // she sits on the bottom; reverse (or forward) the other way frees her
    if (rev && dMid >= d.draft * 0.8) { const st = depthAt(P.x - fx2 * (HL - 0.1), P.z - fz2 * (HL - 0.1)); if (st >= d.draft) { vx = -fx2 * 0.6; vz = -fz2 * 0.6; } }
  } else R.aground = Math.max(0, R.aground - dt);
  R.warnT = Math.max(0, R.warnT - dt);
  [vx, vz] = dockPush(P, vx, vz);
  P.x += vx * dt; P.z += vz * dt;
  const lim = w.half - 30; P.x = clamp(P.x, -lim, lim); P.z = clamp(P.z, -lim, lim);
  P.vx = vx; P.vz = vz; P.vy = 0; P.gnd = true; P.wet = false; P.sink = 0; P.airT = 0;
  // the hull on the water: heave, pitch and roll chase the swell on springs; squat and bow-up over the hump; slams at speed
  const spd = Math.hypot(vx, vz);
  swell(P.x, P.z, P.yaw, t, _sw);
  const trim = 0.075 * Math.exp(-Math.pow((spd - 4.6) / 2, 2)) + 0.025 * sstep(5, 9, spd) - (thr ? 0 : 0.01);
  const sink = 0.012 * n;
  R.hv += ((_sw[0] - sink - R.heave) * 60 - 7 * R.hv) * dt; R.heave += R.hv * dt;
  R.pv += ((_sw[1] * (1 - 0.4 * sstep(4, 9, spd)) + trim - R.pitch) * 40 - 6 * R.pv) * dt; R.pitch += R.pv * dt;
  R.rv += ((_sw[2] - R.yr * spd * 0.012 - R.roll) * 30 - 3.5 * R.rv) * dt; R.roll += R.rv * dt;
  R.roll = clamp(R.roll, -0.45, 0.45);
  if (spd > 5 && storm > 0.2 && R.pv < -0.25 && Math.random() < dt * spd * storm * 0.6) { P.shake = Math.max(P.shake || 0, 0.15 + storm * 0.3); api.thud(0.25 + storm * 0.3); }
  P.y = (wl === null ? P.y : wl) + R.heave;
  P.pitch = R.pitch; P.roll = R.roll;
  if (dep >= d.draft + 0.15 && !R.aground) R.lastW = { x: P.x, z: P.z, yaw: P.yaw };
  // fuel: idle, and the throttle
  if (api.started() && !GS.dead && !parked) GS.fuel = Math.max(0, GS.fuel - (0.0007 + Math.abs(F) / d.fmax * 0.0115) * d.burn * dt);
  api.LOG.m += spd * dt; P.odo += Math.abs(vf) * dt; P.dist += spd * dt;
  // white water: the bow wave and the wake
  if (spd > 1.5) {
    R.spray += spd * dt * (1.2 + storm * 2);
    while (R.spray > 1) { R.spray -= 1; const sd = Math.random() < 0.5 ? -1 : 1;
      api.emit(P.x + fx2 * 1.2 + lx2 * sd * 0.75, P.y + 0.05, P.z + fz2 * 1.2 + lz2 * sd * 0.75, lx2 * sd * 1.6 + vx * 0.3, 0.8 + spd * 0.12, lz2 * sd * 1.6 + vz * 0.3, 0.6, 0.8);
      api.emit(P.x - fx2 * 2.5, P.y - 0.05, P.z - fz2 * 2.5, -fx2 * 1.2, 0.4, -fz2 * 1.2, 0.8, 1.2); }
  }
  R.prop.rotation.z += (F / d.fmax) * 40 * dt;
  R.brake = rev ? 1 : 0;
}
// out of the water (a reset to the last safe spot on land, a damaged save): back to the last water she floated on
function relaunch(R) {
  const P = api.P; let p = R.lastW;
  if (!p || depthAt(p.x, p.z) < ROW.draft + 0.1) p = nearestWater(P.x, P.z);
  if (!p) return;
  P.x = p.x; P.z = p.z; if (p.yaw !== undefined) P.yaw = p.yaw; P.vx = P.vz = 0; R.yr = 0;
}
function nearestWater(x, z) {
  for (let r = 4; r <= 400; r += 4) for (let a = 0; a < 6.283; a += 4 / r) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (depthAt(px, pz) >= 1.2 && api.world.isSea(px, pz)) return { x: px, z: pz, yaw: Math.atan2(px - x, pz - z) }; }
  return null;
}

/* ---------------- placing it each frame (current or parked) ---------------- */
function place(R, P, isCur) {
  const grp = R.grp; grp.visible = true;
  grp.position.set(P.x, P.y, P.z);
  grp.rotation.set(-(isCur ? R.pitch : P.pitch), P.yaw, (isCur ? R.roll : P.roll));
  R.om.rotation.y = -R.til * 0.55;                                              // the motor swings against the tiller
  const night = 1 - api.dayFactor(); for (const m of R.nav) m.visible = night > 0.35;
}
const tmpP = { x: 0, z: 0, yaw: 0, y: 0, pitch: 0, roll: 0 };
function parkedTick(R, r, dt) {
  const t = api.now(), wl = api.world.wlvAt(r.x, r.z);
  swell(r.x, r.z, r.yaw, t, _sw);
  R.heave += (_sw[0] - R.heave) * (1 - Math.exp(-3 * dt)); R.pitch += (_sw[1] - R.pitch) * (1 - Math.exp(-3 * dt)); R.roll += (_sw[2] - R.roll) * (1 - Math.exp(-2 * dt));
  R.rv *= Math.exp(-2 * dt); R.roll += R.rv * dt;
  tmpP.x = r.x; tmpP.z = r.z; tmpP.yaw = r.yaw; tmpP.y = (wl === null ? 0 : wl) + R.heave; tmpP.pitch = R.pitch; tmpP.roll = R.roll;
  R.til *= Math.exp(-3 * dt);
  place(R, tmpP, false);
}
function parcels(R, n) {                                                       // parcels on the floor between the thwarts
  if (R.parcels === n) return; R.parcels = n;
  if (R.pbox) { R.body.remove(R.pbox); R.pbox = null; }
  if (!n) return;
  const g = new T.Group(), M = mats();
  for (let i = 0; i < n; i++) { const m = new T.Mesh(new T.BoxGeometry(0.38, 0.26, 0.32), M.parcel); m.position.set((i % 2 ? -0.22 : 0.22), FLOOR + 0.16 + Math.floor(i / 4) * 0.27, 0.55 + ((i >> 1) % 2) * 0.36); m.rotation.y = (i * 0.37) % 0.3; m.castShadow = true; g.add(m); }
  R.body.add(g); R.pbox = g;
}
function tick(R, r, isCur, dt) {
  const FOOT = api.FOOT, P = api.P;
  if (isCur) {
    if (!api.MNT.on && !api.DMT.on && R.A) R.A = null;
    if (FOOT.on && !api.MNT.on && !api.DMT.on) {                                 // you got out: she rides the swell where you left her
      const t = api.now(); swell(P.x, P.z, P.yaw, t, _sw);
      R.heave += (_sw[0] - R.heave) * (1 - Math.exp(-3 * dt)); R.pitch += (_sw[1] - R.pitch) * (1 - Math.exp(-3 * dt));
      R.rv += (( _sw[2] - R.roll) * 30 - 3 * R.rv) * dt; R.roll += R.rv * dt;
      const wl = api.world.wlvAt(P.x, P.z); if (wl !== null) P.y = wl + R.heave;
      R.til *= Math.exp(-3 * dt);
    }
    place(R, P, true);
    const seated = !FOOT.on && !api.MNT.on && !api.DMT.on;
    R.drvBody.visible = seated && !api.fp();
    if (R.drvBody.visible) poseSeated(R);
    if (seated) dockWork(R); else R.atSite = undefined;
    const ST = api.ST(); if (ST) ST.coldMul = seated ? R.baseCold * ROW.cold : R.baseCold;
    R.tillerG.rotation.y = 0;
  } else { R.drvBody.visible = false; parkedTick(R, r, dt); }
  parcels(R, isCur ? load(R) : (r.load || []).filter(j => j && !j.big).length);
  if (r === boats()[0]) seaBoard(dt);
  for (const o of ADDONS) if (o.tick) o.tick(R, r, isCur, dt);
}

/* ---------------- getting in and out ---------------- */
function toW(P, lx, lz) { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); return [P.x + fz * lx + fx * lz, P.z - fx * lx + fz * lz]; }
function toL(P, x, z) { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), dx = x - P.x, dz = z - P.z; return [dx * fz - dz * fx, dx * fx + dz * fz]; }
function hullDist(px, pz, yaw, x, z) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw), dx = x - px, dz = z - pz, lx = dx * fz - dz * fx, lz = dx * fx + dz * fz;
  return Math.hypot(Math.max(0, Math.abs(lx) - HB), Math.max(0, Math.abs(lz) - HL));
}
function standY(x, z) { const f = floorAt(x, z); return f !== null ? f : api.world.surf(x, z); }
function standable(x, z, wl) {                                                  // can a boot stand here to step in or out?
  const w = api.world, f = floorAt(x, z);
  if (f !== null) return f <= wl + 1.45;
  if (w.isSea(x, z) || w.isWater(x, z) || w.obNear(x, z, 0.35)) return false;
  const y = w.surf(x, z); return y <= wl + 1.4 && y >= wl - 0.2;
}
// where to stand: the nearest standable spot within reach of the gunwale (sides and bow), or null
function landSpot(P) {
  const wl = api.world.wlvAt(P.x, P.z) ?? P.y; let best = null, bd = 1e9;
  const cands = [];
  for (const sd of [-1, 1]) for (const lz of [-0.9, -0.3, 0.3, 0.9, -1.5, 1.4]) for (let off = 0.35; off <= 1.15; off += 0.2) cands.push([sd * (bw(lz) + off), lz, off]);
  for (let off = 0.25; off <= 1.0; off += 0.25) for (const lx of [0, -0.3, 0.3]) cands.push([lx, HL + off, off + 0.3]);
  for (const [lx, lz, off] of cands) { const [x, z] = toW(P, lx, lz); if (!standable(x, z, wl)) continue; const s = off + Math.abs(lz) * 0.08; if (s < bd) { bd = s; best = { x, z, lx, lz }; } }
  return best;
}
// keyframes for stepping in (u 0 -> 1); getting out runs them backwards. base "S": hip height over the spot you stand on;
// "B": over the boat's waterline. at: where the hips are between the stand spot (0), the plant point inside (1) and the seat (2).
const KF = [
  { u: 0.00, base: "S", h: 0.93, at: 0.0, yaw: 0, tor: 0.06, th: [0, 0], kn: [0.06, 0.06], an: [0, 0], ar: [-0.15, -0.15], az: [0.1, 0.1], fo: [-0.25, -0.25] },
  { u: 0.18, base: "S", h: 0.86, at: 0.08, yaw: 0, tor: 0.35, th: [-0.85, 0.12], kn: [1.25, 0.35], an: [0.2, 0.1], ar: [-0.85, -0.7], az: [0.3, 0.3], fo: [-0.6, -0.6] },
  { u: 0.38, base: "S", h: 0.62, at: 0.55, yaw: 0, tor: 0.55, th: [-0.55, 0.45], kn: [0.85, 0.75], an: [0.2, 0.3], ar: [-1.1, -1.0], az: [0.35, 0.35], fo: [-0.5, -0.5] },
  { u: 0.56, base: "B", h: FLOOR + 0.78, at: 1.0, yaw: 0.2, tor: 0.6, th: [-0.25, -1.25], kn: [0.7, 1.7], an: [0.25, 0.4], ar: [-1.15, -0.95], az: [0.25, 0.3], fo: [-0.45, -0.6] },
  { u: 0.74, base: "B", h: FLOOR + 0.74, at: 1.35, yaw: 1.4, tor: 0.5, th: [-0.7, -0.7], kn: [1.2, 1.2], an: [0.3, 0.3], ar: [-0.9, -0.9], az: [0.2, 0.2], fo: [-0.6, -0.6] },
  { u: 0.88, base: "B", h: ROW.seat.y + 0.12, at: 1.85, yaw: 2.6, tor: 0.3, th: [-1.2, -1.2], kn: [1.45, 1.45], an: [0.15, 0.15], ar: [-0.4, -0.4], az: [0.2, 0.2], fo: [-0.7, -0.7] },
  { u: 1.00, base: "B", h: ROW.seat.y, at: 2.0, yaw: 3.0, tor: 0.12, th: [-1.42, -1.42], kn: [1.38, 1.38], an: [0.05, 0.05], ar: [0.25, -0.5], az: [0.35, -0.08], fo: [-0.9, -0.75] }
];
const _k = { base: "S", h: 0, at: 0, yaw: 0, tor: 0, th: [0, 0], kn: [0, 0], an: [0, 0], ar: [0, 0], az: [0, 0], fo: [0, 0] };
function keyAt(u) {
  u = clamp(u, 0, 1); let i = 0; while (i < KF.length - 2 && u > KF[i + 1].u) i++;
  const a = KF[i], b = KF[i + 1], e = api.sm((u - a.u) / (b.u - a.u)), o = _k;
  for (const f of ["at", "yaw", "tor"]) o[f] = lerp(a[f], b[f], e);
  o.hA = a.h; o.hB = b.h; o.bA = a.base; o.bB = b.base; o.e = e;
  for (const f of ["th", "kn", "an", "ar", "az", "fo"]) for (let j = 0; j < 2; j++) o[f][j] = lerp(a[f][j], b[f][j], e);
  return o;
}
// pose the walker for key k: hips along stand spot -> plant point -> seat, facing from "toward the boat" round to the bow
function poseStep(R, k) {
  const FOOT = api.FOOT, P = api.P, A = R.A, g = FOOT.g, U = g.userData;
  const [plx, plz] = A.plant, sx = A.sx, sz = A.sz;
  const [px, pz] = toW(P, plx, plz), [cx, cz] = toW(P, ROW.seat.x, ROW.seat.z);
  let x, z;
  if (k.at <= 1) { x = lerp(sx, px, k.at); z = lerp(sz, pz, k.at); } else { x = lerp(px, cx, k.at - 1); z = lerp(pz, cz, k.at - 1); }
  const hy = b => b === "S" ? A.sy : P.y;
  const hip = lerp(hy(k.bA) + k.hA, hy(k.bB) + k.hB, k.e);
  const face = Math.atan2(px - sx, pz - sz), yaw = face + wrapA(P.yaw - face) * clamp(k.yaw / 3.0, 0, 1);
  FOOT.x = x; FOOT.z = z; FOOT.yaw = yaw; FOOT.y = hip - 0.93;
  g.visible = true; g.position.set(x, FOOT.y, z); g.rotation.set(0, yaw, 0, "YXZ");
  U.torso.rotation.set(k.tor, 0, 0); U.torso.position.y = 0.93; U.head.rotation.x = -k.tor * 0.5; U.head.rotation.y = 0;
  for (let i = 0; i < 2; i++) {
    U.legs[i].rotation.set(k.th[i], 0, (i ? 1 : -1) * 0.05); U.legs[i].position.set(i ? 0.1 : -0.1, 0.93, 0); U.shins[i].rotation.x = k.kn[i]; U.ank[i].rotation.x = k.an[i];
    U.arms[i].rotation.set(k.ar[i], 0, (i ? 1 : -1) * k.az[i]); U.fore[i].rotation.x = k.fo[i];
  }
}
function walkStep(dt, tx, tz, spd) {                                           // one gait step toward a point, on the planks or the shore
  const FOOT = api.FOOT, g = FOOT.g, dx = tx - FOOT.x, dz = tz - FOOT.z, dist = Math.hypot(dx, dz), st = Math.min(dist, spd * dt);
  if (dist > 1e-4) { FOOT.x += dx / dist * st; FOOT.z += dz / dist * st; const want = Math.atan2(dx, dz); FOOT.yaw += wrapA(want - FOOT.yaw) * (1 - Math.exp(-9 * dt)); }
  FOOT.sp = FOOT.go = st / dt; FOOT.crouch = 0; FOOT.strain = 0.35; FOOT.turn = 0; FOOT.tired = 0; FOOT.step += FOOT.sp * dt * 3.2;
  FOOT.y = standY(FOOT.x, FOOT.z); g.visible = true;
  const bob = api.poseWalker(g, dt); g.position.set(FOOT.x, FOOT.y + bob, FOOT.z); g.rotation.y = FOOT.yaw;
  return dist - st;
}
function plantFor(P, sx, sz) {                                                 // the floor spot inside nearest where you stand
  const [lx, lz] = toL(P, sx, sz); return [clamp(lx, -0.42, 0.42), clamp(lz, -1.1, 1.2)];
}
function nearMount(R) { const F = api.FOOT, P = api.P; return hullDist(P.x, P.z, P.yaw, F.x, F.z) < 2.0; }
function doMount(R) {
  const F = api.FOOT, P = api.P, MNT = api.MNT;
  const hd = hullDist(P.x, P.z, P.yaw, F.x, F.z);
  if (hd > 2.4) { api.toast("Get back to the boat first.", "warn"); return; }
  if (Math.hypot(P.vx, P.vz) > 0.8) { api.toast("She's drifting off: wait for her to come back alongside.", "warn"); return; }
  // stand at the gunwale: the reachable spot nearest you, or where you are if that's already close enough
  const ls = landSpot(P); let sx = F.x, sz = F.z;
  if (ls && Math.hypot(ls.x - F.x, ls.z - F.z) < 3.5) { sx = ls.x; sz = ls.z; }
  else if (hd > 1.15) { api.toast("Too far to step across. Bring her alongside the jetty or nose her into a low bit of shore.", "warn"); return; }
  MNT.on = true; MNT.t = 0; MNT.stepped = false; MNT.dur = 99; F.ski = false; F.dig = false; F.fwd = F.turn = F.sp = 0;
  R.A = { dir: "in", ph: 0, t: 0, sx, sz, sy: standY(sx, sz), plant: plantFor(P, sx, sz), heeled: false };
}
function doDismount(R) {
  const F = api.FOOT, P = api.P, DMT = api.DMT;
  if (Math.hypot(P.vx, P.vz) > 0.8) { api.toast("Stop the boat first.", "warn"); return; }
  const ls = landSpot(P);
  if (!ls) { api.toast("Nowhere to step out here. Bring her alongside the jetty or nose her into a low bit of shore.", "warn"); return; }
  for (const o of ADDONS) if (o.stop) o.stop(R);                                // the handline comes in before you step out
  DMT.on = true; DMT.t = 0; DMT.stepped = false; DMT.dur = 99;
  F.dig = false; F.sp = F.fwd = F.turn = F.go = 0; F.crouch = 0; F.ski = false; F.shoe = false; F.on = true;
  F.g.userData.shoes && F.g.userData.shoes.forEach(s => s.visible = false);
  P.vx = P.vz = 0; api.camState.init = false;
  R.A = { dir: "out", ph: 0, t: 0, sx: ls.x, sz: ls.z, sy: standY(ls.x, ls.z), plant: plantFor(P, ls.x, ls.z), heeled: false };
  R.drvBody.visible = false;
  poseStep(R, keyAt(1));
}
const T_STEP = 2.2;
function mountTick(R, dt) {
  const F = api.FOOT, MNT = api.MNT, P = api.P, A = R.A;
  if (!A || A.dir !== "in") { MNT.on = false; return; }
  A.t += dt; MNT.t = A.t;
  if (A.ph === 0) {                                                             // walk to the gunwale
    const left = walkStep(dt, A.sx, A.sz, 1.6);
    if (left < 0.04) { A.ph = 1; A.t = 0; A.sy = standY(A.sx, A.sz); A.plant = plantFor(P, A.sx, A.sz); }
    return;
  }
  const u = clamp(A.t / T_STEP, 0, 1);
  poseStep(R, keyAt(u));
  if (!A.heeled && u > 0.42) { A.heeled = true; const [lx] = A.plant; R.rv += (lx >= 0 ? 1 : -1) * 0.9; R.hv -= 0.35; api.thud(0.2); }   // weight onto the gunwale side: she heels and dips
  if (u >= 1) {
    MNT.on = false; F.on = false; F.dig = false; F.crouch = 0; F.g.visible = false; R.A = null;
    R.drvBody.visible = true; api.camState.init = false; api.camState.yaw = P.yaw;
  }
}
function dismountTick(R, dt) {
  const F = api.FOOT, DMT = api.DMT, P = api.P, A = R.A;
  if (!A || A.dir !== "out") { DMT.on = false; return; }
  A.t += dt; DMT.t = A.t;
  const u = clamp(A.t / (T_STEP * 0.9), 0, 1);
  poseStep(R, keyAt(1 - u));
  if (!A.heeled && u > 0.5) { A.heeled = true; const [lx] = A.plant; R.rv += (lx >= 0 ? 1 : -1) * 0.8; R.hv += 0.25; api.thud(0.2); }
  if (u >= 1) {
    F.x = A.sx; F.z = A.sz; F.y = standY(A.sx, A.sz); F.crouch = 0; F.step = 0; F.sp = 0; DMT.on = false; R.A = null;
    api.camState.init = false;
  }
}

/* ---------------- the VEH.cur driver ---------------- */
function driver(R) {
  return {
    pin: "boat", floats: true,                                                  // the game's drown test leaves P alone (beta 0178 #1)
    shore: () => shoreSite(R),                                                  // tied up at a jetty: its place's warmth, the quay's fuel (14.2b)
    // the use control in the boat (14.3): what it would do, do it, its hint; grab = it takes the gas / brake while it's on
    use: () => !!addon("use", R), useLabel: () => addon("useLabel", R), useHint: () => addon("useHint", R) || "", grab: (thr, brk) => !!addon("grab", R, thr, brk),
    get mass() { return ROW.mass + 90; },
    core: dt => core(R, dt),
    restat(ST) {
      R.baseCold = ST.coldMul;
      ST.fuel = ROW.fuel; ST.slots = ROW.slots; ST.bays = 0; ST.winch = 0; ST.camp = 0; ST.campCap = 0; ST.burn = ROW.burn; ST.power = 1; ST.light = Math.max(ST.light, 1);
      ST.coldMul = R.baseCold * ROW.cold; ST.cool = 0; ST.groom = 0;
    },
    visual() { place(R, api.P, true); },
    eye(v) { R.grp.updateMatrixWorld(true); return R.grp.localToWorld(v.set(ROW.eye[0], ROW.eye[1], ROW.eye[2])); },
    mount: () => doMount(R), dismount: () => doDismount(R),
    mountTick: dt => mountTick(R, dt), dismountTick: dt => dismountTick(R, dt),
    nearMount: () => nearMount(R)
  };
}
// after a swap or a reload puts P on the boat: float her where she is
function reset(R) {
  const P = api.P, wl = api.world.wlvAt(P.x, P.z);
  if (depthAt(P.x, P.z) < 0.12) relaunch(R);
  P.y = (api.world.wlvAt(P.x, P.z) ?? wl ?? 0) + R.heave; P.vy = 0; P.gnd = true; P.wet = false; P.sink = 0; R.yr = 0; R.A = null;
  if (R.baseCold === undefined) R.baseCold = 1;
}

/* ---------------- buying: the garage's Boats tab ---------------- */
function boats() { return S().owned.filter(r => r.id === ROW.id); }
function freeBerth() {
  const s = S(), P = api.P, taken = [];
  for (const r of s.owned) { const cur = s.cur === r.uid; taken.push(cur ? [P.x, P.z] : [r.x, r.z]); }
  for (const D of DOCKS) for (const sd of [-1, 1]) { if (D.site !== api.world.depot || !berthOK(D, sd)) continue; const b = berthPose(D, sd); if (taken.every(([x, z]) => Math.hypot(x - b.x, z - b.z) > 3)) return b; }
  return null;
}
function buy() {
  const s = S(), GS = api.GS;
  if (api.tutHidden()) { api.toast("Collect your first sled first.", "warn"); return; }
  if (boats().length >= MAX_BOATS) { api.toast(`The jetty has room for ${MAX_BOATS} of your boats.`, "warn"); return; }
  if (GS.cash < ROW.cost) { api.toast(`The ${ROW.name} is ${api.fmtCash(ROW.cost)}. You have ${api.fmtCash(GS.cash)}.`, "warn"); return; }
  const b = freeBerth(); if (!b) { api.toast("No free berth at the jetty: move a boat first.", "warn"); return; }
  GS.cash -= ROW.cost;
  s.seq = (s.seq || 0) + 1;
  s.owned.push({ uid: "v" + s.seq, id: ROW.id, x: b.x, z: b.z, yaw: b.yaw, fuel: ROW.fuel, cond: 100, load: [] });
  api.toast(`Bought the ${ROW.name}. She's moored at the jetty below the quay with a full tank: walk out along it and step in.`, "good");
  api.save(); api.garageRefresh();
}
function garageRows(body, row) {
  const GS = api.GS, n = boats().length, full = n >= MAX_BOATS;
  const spec = `${ROW.year} · 4.6 m welded aluminium · 20 hp tiller outboard · ${ROW.fuel} L tank · carries ${ROW.slots} parcels · open boat`;
  const how = `Moored at the jetty below the quay. Fast on flat water, wet and cold in a blow; the fjords never freeze, the lakes do. Mind the shallows: she draws 32 cm.`;
  row(ROW.name, `${spec}\n<span style="color:#9fd8a8">${how}</span>\n${ROW.blurb}`, n ? `Owned ×${n} · $${ROW.cost}` : "$" + ROW.cost, full || GS.cash < ROW.cost ? "locked" : "", () => buy(), String(ROW.year));
  for (const r of boats()) {
    const e = document.createElement("div"); e.className = "bfoot";
    let D = DOCKS[0], dd = 1e9; for (const Q of DOCKS) { const d = Math.hypot(r.x - Q.x, r.z - Q.z); if (d < dd) { dd = d; D = Q; } }
    dd = Math.round(dd);
    e.textContent = `${ROW.name}: ${Math.round(r.cond)}% hull, ${Number(r.fuel).toFixed(0)} of ${ROW.fuel} L, ${!D ? "afloat" : dd < 40 ? "at the " + D.name : dd + " m from the " + D.name}.`;
    body.appendChild(e);
  }
  const note = document.createElement("div"); note.className = "bfoot"; note.textContent = `Walk out along the jetty and get in. Step out at any jetty or onto a low bit of shore. ${Math.max(0, DOCKS.length - 1)} villages have a jetty of their own: tie up alongside and their parcels hand over there.`;
  body.appendChild(note);
}

function init(a) {
  api = a; T = a.THREE;
  const D = siteDock(a.world.depot.x, a.world.depot.z, []);
  if (D) { D.site = a.world.depot; D.name = "quay jetty"; DOCKS.push(D); buildDock(D); siteVillageDocks(); }
  a.veh.floor = floorAt;
  a.TABLET.addLayer("docks", () => DOCKS.map(D => { const e = dockEnd(D); return { x: e.x, z: e.z, name: D.name, kind: "dock" }; }));
  for (const o of ADDONS) if (o.init) o.init(a, { ROW, HB, HL, FLOOR, GUN, DOCKS, bw, sheer, depthAt, shortSite, boats });
}
// tlx-vehicles.js calls init first thing in its own init (a reload may put you straight back in the boat), and adds the tab
TLXV.addKind(ROW, { init, runtime, driver, tick, reset, dist: (r, x, z, yaw) => hullDist(x, z, yaw, api.FOOT.x, api.FOOT.z) - 0.6,
  tab: { id: "boats", name: "Boats", render: garageRows } });
window.TLXB = { addOn: o => { ADDONS.push(o); }, ROW, DOCKS, seaKm, seaPost, seaJobs, seaHold: t => { seaT = t; }, siteDock: (x, z) => siteDock(x, z, []), dockFor, dockAt, aimFor, dockEnd, seaLinked, sea: () => SEA, shoreNormal, floorAt, depthAt, landSpot: () => landSpot(api.P), berthPose, berthOK, buy, hullDist, waveAt, keyAt };
})();
