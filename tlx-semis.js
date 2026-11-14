// Tracklayer — semis (slice 3.5a of the Four Seasons & Enterprise expansion, loop/EXPANSION.md). Loaded after tlx-cars.js,
// before tlx-traffic.js.
//
// WHAT IT IS. The shapes and sizes of the articulated lorries that share the open roads with 3.4's drivers. A semi is a
// tractor unit and a semitrailer on its fifth wheel: the trailer's kingpin sits on the tractor's coupling plate just ahead
// of its drive axles and the trailer's own axles sit near its tail, so on a bend the trailer runs inside the tractor's line
// (off-tracking) and straightens out behind it after. tlx-traffic.js drives them (one road driver like the cars, slower and
// gentler) and swings the trailer with the follow-the-coupling rule: each frame the trailer's axle point is pulled straight
// toward the kingpin until it is exactly the trailer's wheelbase behind it (a tractrix, which is what a real trailer does).
//
// THE SIZES (TYPES below, all within the Norwegian 4.0 m height and 16.5 m semi length rules):
//   dist  — a two-axle day cab with a 10.5 m refrigerated box (Coop and fish runs between the villages)
//   haul  — a three-axle high-roof sleeper with a 13.6 m curtainsider (long haul from the south)
//   tank  — a three-axle day cab with an 11.6 m fuel tanker (the fuel depots)
// Each part is three merged geometries: paint (tinted per lorry), the rest (vertex-coloured: glass, chrome, black trim,
// rails) and lamps (unlit, brightened after dark by the traffic's lamp material). Wheels are not here: the traffic draws
// them as instances of the parked cars' wheel (TLXC.geo.wheel) scaled up, so they turn as the lorry rolls.
//
// Coordinates: metres, +z forward, y up from the ground, x across. Tractor origin: midway along it on the ground, as a
// car's. Trailer origin: under the kingpin on the ground; its axle group's centre is L m behind, its tail L + over.
//
// TLXS (window): TYPES, make(THREE, std, lampMat, type) -> { tractor: Group, trailer: Group, paint: [materials] }.
// Saved: nothing (the drivers are placed afresh on every load, like the cars).
(() => {
"use strict";
const WR = 0.52;                                                     // tyre radius (315/80 R22.5)
const TYPES = {
  dist: { name: "distribution", wheelR: WR,
    tr: { front: 2.9, depth: 2.0, top: 3.05, sleeper: false, axles: [{ z: 1.5, steer: 1 }, { z: -2.1 }], fifth: -1.6, end: -2.95 },
    tl: { kind: "box", front: 1.6, L: 7.3, over: 2.2, axles: [-0.655, 0.655], cols: [0xeef0f2, 0xeef0f2, 0xd8dde2, 0x2a6b3b] },
    cabs: [0xd6dadf, 0x1f4f8a, 0x8d1f1c, 0xe9ebee, 0x2d4635] },
  haul: { name: "long haul", wheelR: WR,
    tr: { front: 3.0, depth: 2.45, top: 3.85, sleeper: true, axles: [{ z: 1.6, steer: 1 }, { z: -1.6 }, { z: -2.95 }], fifth: -1.5, end: -3.7 },
    tl: { kind: "curtain", front: 1.6, L: 7.7, over: 4.3, axles: [-1.31, 0, 1.31], cols: [0x1f3f73, 0x7d1d1b, 0x2f5e3a, 0xd9dcdf, 0x3a3f46] },
    cabs: [0xe9ebee, 0x1d2024, 0x8d1f1c, 0x1f2f4f, 0xc9a227] },
  tank: { name: "tanker", wheelR: WR,
    tr: { front: 3.0, depth: 2.0, top: 3.1, sleeper: false, axles: [{ z: 1.6, steer: 1 }, { z: -1.6 }, { z: -2.95 }], fifth: -1.5, end: -3.6 },
    tl: { kind: "tank", front: 1.0, L: 7.2, over: 3.4, axles: [-0.655, 0.655], cols: [0xd4d7db, 0xd4d7db, 0xc2c6cb] },
    cabs: [0xe9ebee, 0xc8102e, 0x1f4f8a, 0xf2c200] }
};
for (const k in TYPES) {
  const t = TYPES[k], tl = t.tl;
  tl.len = tl.front + tl.L + tl.over;                                // trailer body length
  t.len = (t.tr.front - t.tr.fifth) + tl.L + tl.over;               // nose to tail, straight
}

function merge(T, parts) {
  const pos = [], nor = [], col = [];
  for (const [g, c] of parts) {
    const n = g.index ? g.toNonIndexed() : g, p = n.attributes.position, q = n.attributes.normal, cc = new T.Color(c);
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(q.getX(i), q.getY(i), q.getZ(i)); col.push(cc.r, cc.g, cc.b); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}
const C = { glass: 0x1a2129, black: 0x16181b, dark: 0x2a2d31, grey: 0x5a6068, chrome: 0xc9ccd0, alu: 0xb4b9bf, head: 0xfff4d6, tail: 0x9a1212, amber: 0xd98a12, white: 0xffffff };

// one part's three lists: paint (white, tinted by the material), rest (own colours), lamps
function kit(T) {
  const L = { paint: [], rest: [], lamp: [] };
  const bx = (list, w, h, d, x, y, z, c, rx = 0, ry = 0, rz = 0) => { const g = new T.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz); g.translate(x, y, z); L[list].push([g, c ?? C.white]); };
  const cz = (list, r, len, x, y, z, c, sx = 1, sy = 1, seg = 16) => { const g = new T.CylinderGeometry(r, r, len, seg); g.rotateX(Math.PI / 2); g.scale(sx, sy, 1); g.translate(x, y, z); L[list].push([g, c]); };
  const cy = (list, r, len, x, y, z, c, seg = 10) => { const g = new T.CylinderGeometry(r, r, len, seg); g.translate(x, y, z); L[list].push([g, c]); };
  return { L, bx, cz, cy };
}

function tractorGeo(T, t) {
  const { L, bx, cz, cy } = kit(T), r = t.tr, W = 2.48, h = W / 2, f = r.front, b = f - r.depth, y0 = 1.2, top = r.top;
  const fa = r.axles[0].z, ra = r.axles[r.axles.length - 1].z;
  // chassis: two rails, cross members, the coupling plate
  for (const x of [-0.43, 0.43]) bx("rest", 0.1, 0.28, f - 0.4 - r.end, x, 0.98, (f - 0.4 + r.end) / 2, C.black);
  for (let z = r.end + 0.3; z < f - 0.6; z += 1.2) bx("rest", 0.86, 0.08, 0.1, 0, 0.94, z, C.dark);
  bx("rest", 1.1, 0.1, 1.05, 0, 1.17, r.fifth, C.black); bx("rest", 1.24, 0.14, 0.5, 0, 1.08, r.fifth - 0.15, C.dark);
  // the cab: body, a slight rake on the windscreen, sides, roof, sleeper box and deflector
  bx("paint", W, top - y0 - 0.05, r.depth, 0, (top + y0) / 2 - 0.02, (f + b) / 2);
  bx("rest", W - 0.22, 0.95, 0.05, 0, 2.33, f + 0.015, C.glass, -0.05);
  for (const s of [-1, 1]) {
    bx("rest", 0.04, 0.72, 0.85, s * (h + 0.01), 2.32, f - 0.62, C.glass);       // door glass
    bx("rest", 0.03, 0.04, 0.95, s * (h + 0.012), 1.86, f - 0.62, C.dark);       // window sill trim
    bx("rest", 0.03, 1.0, 0.03, s * (h + 0.012), 1.48, f - 1.12, C.dark);        // door shut line
    bx("rest", 0.06, 0.06, 0.42, s * (h + 0.18), 2.55, f - 0.32, C.dark);        // mirror arm
    bx("rest", 0.1, 0.62, 0.24, s * (h + 0.4), 2.38, f - 0.2, C.black);          // mirror
    for (let k = 0; k < 3; k++) bx("rest", 0.36, 0.05, 0.26, s * (h - 0.25), 0.55 + k * 0.32, fa - 0.8, C.alu);   // steps, behind the front wheel
    bx("rest", 0.5, 0.06, 1.1, s * (h - 0.25), 1.2, fa, C.black);                // front wing
    bx("rest", 0.5, 0.42, 0.06, s * (h - 0.25), 1.0, fa - 0.55, C.black);
  }
  if (r.sleeper) {
    bx("paint", W - 0.1, 0.5, r.depth - 0.4, 0, top + 0.2, (f + b) / 2 - 0.15, C.white, -0.06);    // high roof deflector
    for (const s of [-1, 1]) bx("paint", 0.08, top - 1.4, 0.35, s * (h + 0.04), (top + 1.4) / 2, b - 0.15);  // side extenders
  }
  bx("paint", W - 0.1, 0.12, 0.42, 0, top - 0.06, f + 0.16, C.white, 0.12);       // sun visor
  for (let k = -2; k <= 2; k++) bx("lamp", 0.12, 0.07, 0.07, k * 0.34, top - 0.04, f + 0.38, C.amber);   // roof markers
  // the face: grille with chrome bars, bumper, lamps, and the lower step panel
  bx("rest", 1.6, 0.6, 0.05, 0, 1.55, f + 0.02, C.black);
  for (let k = 0; k < 4; k++) bx("rest", 1.5, 0.04, 0.03, 0, 1.33 + k * 0.15, f + 0.05, C.chrome);
  bx("rest", 0.55, 0.12, 0.04, 0, 1.95, f + 0.04, C.chrome);                      // badge bar
  bx("rest", W, 0.42, 0.36, 0, 0.72, f + 0.1, C.dark);
  bx("rest", W - 0.3, 0.06, 0.2, 0, 0.5, f + 0.2, C.black);                       // spoiler lip
  for (const s of [-1, 1]) {
    bx("lamp", 0.5, 0.17, 0.05, s * 0.86, 0.82, f + 0.29, C.head);
    bx("lamp", 0.16, 0.08, 0.05, s * 1.1, 0.64, f + 0.29, C.amber);
    bx("rest", 0.36, 0.12, 0.05, s * 0.86, 1.24, f + 0.02, C.dark);              // lamp shroud under the grille
  }
  // tanks, air tanks, battery box, exhaust stack behind the cab, rear wings and flaps, tail lamps
  // between the steps and the first drive axle
  const a1 = r.axles[1].z, hi = fa - 1.2, lo = a1 + 0.62, mid = (hi + lo) / 2, tl = Math.min(1.5, hi - lo);
  cz("rest", 0.32, tl, -(h - 0.36), 0.78, mid, C.alu); bx("rest", 0.06, 0.66, tl - 0.1, -(h - 0.05), 0.78, mid, C.dark);
  bx("rest", 0.62, 0.55, Math.min(0.8, tl), h - 0.34, 0.8, mid, C.black);           // battery + tool box
  cz("rest", 0.13, 0.9, h - 0.3, 1.18, mid, C.grey); cz("rest", 0.13, 0.9, -(h - 0.3), 1.18, mid, C.grey);
  cy("rest", 0.075, top + 0.25 - 1.3, h - 0.18, (top + 0.25 + 1.3) / 2, b - 0.12, C.chrome);
  bx("rest", 0.24, 0.5, 0.2, h - 0.18, 1.55, b - 0.12, C.dark);                   // stack heat shield
  for (const s of [-1, 1]) {
    for (const a of r.axles.slice(1)) bx("rest", 0.68, 0.06, 1.2, s * (h - 0.32), 1.2, a.z, C.black);
    bx("rest", 0.66, 0.6, 0.03, s * (h - 0.32), 0.6, ra - 0.72, C.black);        // mud flap
    bx("lamp", 0.22, 0.12, 0.05, s * 0.8, 0.98, r.end - 0.02, C.tail);
  }
  bx("rest", 2.0, 0.12, 0.1, 0, 0.96, r.end, C.dark);
  return L;
}

function trailerGeo(T, t) {
  const { L, bx, cz, cy } = kit(T), q = t.tl, W = 2.55, h = W / 2, f = q.front, rear = -(q.L + q.over), fl = 1.25;
  const ax = q.axles.map(a => -q.L + a);
  const legs = Math.min(f - 2.3, -1.6), mid = (f + rear) / 2;
  if (q.kind === "tank") {
    const R = 1.08, yc = fl + R + 0.05, len = q.len - 0.5;
    cz("paint", R, len, 0, yc, mid, C.white, 1.14, 1, 24);
    for (const e of [-1, 1]) { const g = new T.SphereGeometry(R, 20, 10); g.scale(1.14, 1, 0.22); g.translate(0, yc, mid + e * len / 2); L.paint.push([g, C.white]); }
    for (const z of [mid - len * 0.3, mid, mid + len * 0.3]) cz("rest", R + 0.02, 0.08, 0, yc, z, C.alu, 1.14, 1, 24);   // tank bands
    bx("rest", 0.7, 0.05, len * 0.8, 0, yc + R + 0.02, mid, C.grey);                     // walkway
    for (const s of [-1, 1]) bx("rest", 0.04, 0.04, len * 0.8, s * 0.38, yc + R + 0.42, mid, C.chrome);
    for (let k = 0; k < 4; k++) cy("rest", 0.16, 0.12, 0, yc + R + 0.08, mid - len * 0.3 + k * len * 0.2, C.alu, 12);   // manlids
    bx("rest", 1.2, 0.18, len - 0.6, 0, fl + 0.05, mid, C.black);                        // sub frame
    bx("rest", 1.0, 0.7, 1.3, 0, fl - 0.35, ax[0] - 1.6, C.alu);                         // hose and valve cabinet
    bx("rest", 1.0, 0.35, 1.0, 0, 1.18, 0, C.black);                                     // kingpin plate
    bx("lamp", 0.06, 0.06, 0.06, 0, yc + R * 0.7, mid + len / 2 + 0.2, C.amber);
  } else {
    const top = 4.0, body = top - fl;
    bx("paint", W, body - 0.16, q.len, 0, fl + 0.12 + (body - 0.16) / 2, mid);
    bx("rest", W + 0.02, 0.14, q.len, 0, fl + 0.07, mid, C.grey);                         // bottom rail
    bx("rest", W + 0.02, 0.1, q.len, 0, top - 0.05, mid, q.kind === "curtain" ? C.grey : C.alu);   // top rail
    if (q.kind === "curtain") {
      for (let z = rear + 1.1; z < f - 0.6; z += 1.36) for (const s of [-1, 1]) bx("rest", 0.03, body - 0.28, 0.06, s * (h + 0.01), fl + body / 2, z, C.dark);
      for (let z = rear + 0.4; z < f - 0.2; z += 0.62) for (const s of [-1, 1]) bx("rest", 0.02, 0.36, 0.05, s * (h + 0.012), fl + 0.36, z, C.black);   // curtain straps
    } else {
      for (let z = rear + 0.6; z < f - 0.3; z += 0.9) for (const s of [-1, 1]) bx("rest", 0.02, body - 0.25, 0.03, s * (h + 0.006), fl + body / 2, z, C.alu);   // panel seams
      bx("rest", 2.0, 1.3, 0.38, 0, 2.95, f + 0.19, C.grey); bx("rest", 1.7, 0.9, 0.04, 0, 2.95, f + 0.39, C.dark);   // reefer unit
      bx("rest", 1.2, 0.12, 0.04, 0, 3.45, f + 0.4, C.chrome);
    }
    // rear doors: frame, hinge bars, lock rods
    bx("rest", W, 0.12, 0.06, 0, top - 0.06, rear - 0.02, C.alu); bx("rest", 0.06, body, 0.06, 0, fl + body / 2, rear - 0.03, C.dark);
    for (const s of [-1, 1]) { bx("rest", 0.08, body, 0.06, s * (h - 0.04), fl + body / 2, rear - 0.03, C.alu); for (const x of [0.32, 0.9]) bx("rest", 0.04, body - 0.2, 0.05, s * x, fl + body / 2, rear - 0.05, C.chrome); }
    bx("rest", 1.2, 0.16, 1.2, 0, fl - 0.08, 0, C.black);                                // kingpin plate
    for (let z = rear + 0.5; z < f - 0.4; z += 1.0) bx("rest", 2.2, 0.08, 0.1, 0, fl - 0.04, z, C.dark);   // floor cross members
    for (const s of [-1, 1]) for (let z = rear + 1.0; z < f - 0.4; z += 2.6) bx("lamp", 0.04, 0.06, 0.12, s * (h + 0.02), fl + 0.06, z, C.amber);   // side markers
  }
  for (const s of [-1, 1]) {
    bx("rest", 0.1, fl - 0.3, 0.12, s * 0.9, 0.2 + (fl - 0.3) / 2, legs, C.dark);         // landing legs, wound up
    bx("rest", 0.26, 0.05, 0.26, s * 0.9, 0.38, legs, C.black);
    bx("rest", 0.03, 0.2, (ax[0] - 0.8) - (legs + 0.3), s * (h - 0.05), 0.75, (ax[0] - 0.8 + legs + 0.3) / 2, C.alu);   // side guard
    bx("rest", 0.62, 0.05, ax[ax.length - 1] - ax[0] + 1.25, s * (h - 0.34), fl - 0.1, (ax[0] + ax[ax.length - 1]) / 2, C.black);   // wheel guards
    bx("rest", 0.62, 0.55, 0.03, s * (h - 0.34), 0.62, ax[0] - 0.72, C.black);           // flaps
    bx("lamp", 0.34, 0.16, 0.05, s * 0.95, 0.72, rear - 0.05, C.tail);
    bx("lamp", 0.1, 0.1, 0.05, s * 1.18, 0.72, rear - 0.05, C.amber);
  }
  for (const a of ax) bx("rest", 1.9, 0.14, 0.14, 0, WR, a, C.black);                    // axle beams
  bx("rest", 2.3, 0.14, 0.12, 0, 0.5, rear + 0.3, C.grey);                               // underrun bar
  for (const s of [-1, 1]) bx("rest", 0.1, 0.62, 0.1, s * 0.75, 0.8, rear + 0.3, C.dark);
  return L;
}

const cache = {};
function geos(T, type) {
  if (cache[type]) return cache[type];
  const t = TYPES[type], a = tractorGeo(T, t), b = trailerGeo(T, t), m = l => l.length ? merge(T, l) : null;
  return (cache[type] = { tractor: { paint: m(a.paint), rest: m(a.rest), lamp: m(a.lamp) }, trailer: { paint: m(b.paint), rest: m(b.rest), lamp: m(b.lamp) } });
}
// the meshes for one lorry: two groups (tractor, trailer) of three meshes each
function make(T, std, lampMat, type, low) {
  const G = geos(T, type), rest = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.25 });
  const out = { type, paint: [] };
  for (const part of ["tractor", "trailer"]) {
    const grp = new T.Group(); grp.name = "semi_" + type + "_" + part;
    const pm = std(0xffffff, part === "trailer" && type === "tank" ? 0.3 : 0.45, part === "trailer" && type === "tank" ? 0.7 : 0.3);
    pm.vertexColors = true; out.paint.push(pm);
    for (const [k, mat] of [["paint", pm], ["rest", rest], ["lamp", lampMat]]) {
      if (!G[part][k]) continue;
      const me = new T.Mesh(G[part][k], mat); me.castShadow = !low && k !== "lamp"; me.receiveShadow = true; me.frustumCulled = false; me.name = grp.name + "_" + k; grp.add(me);
    }
    out[part] = grp;
  }
  return out;
}
window.TLXS = { TYPES, make, WR };
})();
