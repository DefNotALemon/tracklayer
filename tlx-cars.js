// Tracklayer — parked cars (slice 3.3a of the Four Seasons & Enterprise expansion, loop/EXPANSION.md).
//
// People live in Kjøllefjord and the villages, so their cars stand outside their houses: one in front of about half
// the lit doors, nosed in toward the house on the plowed ground beside the door, never in a road, a lane's middle,
// the sea or a tree. Same map, same doors, same cars every boot (a seeded pick per door), so nothing about where
// they stand is saved.
//
// SNOW. A storm buries them. Each car has its own snow b (0 = clear, 1 = a rounded drift over the roof), filled by
// the weather at the car at the roads' rate (CARS.fill per game hour at full strength, nothing in a drizzle). A
// dusting shows as snow on the roof and hood; from CARS.mound up a drift grows round the car, at 1 it covers the
// roof. "Buried" reads from CARS.buried. Once the weather there eases each owner digs their car out after their own
// wait (seeded: most within a few hours, about a quarter are away for a day or two), so after a storm some cars
// stand clear and some are still drifts. A clock jump (a night's sleep) is stepped through at the weather of the
// moment. Saved in x.sys.cars: { h, c: { key: [b, waited] } } for the cars with snow on; a save without it (every
// save before this slice) starts with every car clear.
//
// WHAT IT COSTS. Six instanced meshes for every car on the map (paint, glass, dark trim + wheels, lamps, the snow on
// top, the drift), so the draw calls don't grow with the count. Each car is three obstacle circles (o.car), low
// enough (top = the roof) that a jump clears one.
//
// 3.3b (next): the "Dig out buried cars" option, digging one out by hand for pay. 3.4: drivers.
//
// TLXC (window, for later slices and scenarios): cars [{ x, z, y, yaw, sx, sy, col, b, wait, wt, key }], ready, ms,
// err, buried() -> count, setSnow(i | null, v), step(dh) (one weather step), group (the meshes).
(() => {
"use strict";
const CARS = {
  share: 0.5,              // of the lit doors that get a car
  off: [3.2, -3.2, 4.4, -4.4],  // sideways from the door axis, m (first that fits)
  out: 3.5,                // how far in front of the wall the car's middle stands, m
  len: 4.3, wid: 1.76,
  fill: 0.16, fillA: 0.5, fillB: 0.95,   // per game hour at full strength, ramp in by weather (the roads' numbers)
  calm: 0.45,              // owners dig out once the weather at the car is under this
  mound: 0.1, buried: 0.35, gone: 0.85,   // drift shows / counts as buried / covers the car whole
  skip: 2,                 // a clock jump over this many game hours is stepped through
  cols: [0xe9ebee, 0xe9ebee, 0xb9bec4, 0xb9bec4, 0x4a4f55, 0x1d2024, 0x1f2f4f, 0x8d1f1c, 0x2d4635, 0x6d7a86, 0x9a8a6c],
};
const C = window.TLXC = { cars: [], ready: false, ms: 0, err: null, group: null };
let api = null, M = {};
const CS = () => TLX.state("cars");

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- where they stand
function fits(W, x, z, yaw) {
  if (W.isSea(x, z) || W.isWater(x, z)) return false;
  if (W.slopeAt(x, z, 2.5) > 0.14) return false;
  if (W.yardAt(x, z) < 0.3) return false;                          // people park on plowed ground
  const R = window.TLXR;
  if (R && R.ready && R.near(x, z).d < 3.2 + 2.6) return false;    // off the road, plowed half + the car's half + room to pass
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  for (const u of [-1.6, 0, 1.6]) {
    const px = x + fx * u, pz = z + fz * u;
    for (const o of W.obstaclesNear(px, pz, 4)) if (!(o.top < -1e8) && Math.hypot(o.x - px, o.z - pz) < o.r + 1.05) return false;
  }
  return true;
}
function place(W) {
  const rnd = rng(0x3c3a7), out = [], seen = new Set();
  for (const D of W.doors) {
    const pick = rnd(), side = rnd() < 0.5 ? 1 : -1, ci = Math.floor(rnd() * CARS.cols.length), tall = rnd(), lenK = 0.92 + rnd() * 0.16, w0 = rnd(), w1 = rnd();
    if (pick > CARS.share) continue;
    const k0 = Math.round(D.x) + "_" + Math.round(D.z); if (seen.has(k0)) continue; seen.add(k0);
    const tx = D.nz, tz = -D.nx, yaw = Math.atan2(-D.nx, -D.nz);   // nosed in toward the house
    for (const o of CARS.off) {
      const s = o * side, d = D.d / 2 + CARS.out, x = D.x + D.nx * d + tx * s, z = D.z + D.nz * d + tz * s;
      if (!fits(W, x, z, yaw)) continue;
      const sy = tall < 0.3 ? 1.16 : 1;                                       // a third are estates / SUVs, taller
      const car = { x, z, y: W.surf(x, z), yaw, sx: lenK, sy, col: CARS.cols[ci], b: 0, wt: 0, wait: w0 < 0.25 ? 20 + w1 * 40 : 1 + w1 * 9, key: Math.round(x) + "_" + Math.round(z), i: out.length };
      out.push(car);
      const top = car.y + 1.5 * sy;
      for (const u of [-1.45, 0, 1.45]) W.addOb({ x: x + Math.sin(yaw) * u * lenK, z: z + Math.cos(yaw) * u * lenK, r: 0.95, top, car: car.i, ax: yaw });
      break;
    }
  }
  return out;
}

// ---- the meshes: one geometry per material, built from boxes and wheel cylinders and merged by hand
function merge(T, parts) {
  const pos = [], nor = [], col = [];
  for (const [g, c] of parts) {
    const n = g.index ? g.toNonIndexed() : g, p = n.attributes.position, q = n.attributes.normal;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(q.getX(i), q.getY(i), q.getZ(i)); if (c) col.push(c.r, c.g, c.b); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
  if (col.length) g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  return g;
}
function build(a) {
  // the glasshouse: its top pulled in, the windscreen raked back, the rear window a little
  const taper = (g, cy) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > cy) { p.setX(i, p.getX(i) * 0.92); p.setZ(i, p.getZ(i) > -0.3 ? p.getZ(i) - 0.45 : p.getZ(i) + 0.2); } g.computeVertexNormals(); return g; };
  const T = a.THREE, bx = (w, h, d, x, y, z) => new T.BoxGeometry(w, h, d).translate(x, y, z), L = CARS.len / 2;
  const G = {
    paint: merge(T, [[bx(CARS.wid, 0.6, CARS.len, 0, 0.66, 0)], [bx(1.46, 0.07, 1.62, 0, 1.46, -0.42)]]),
    glass: merge(T, [[taper(bx(1.58, 0.5, 2.2, 0, 1.18, -0.3), 1.18)]]),
    dark: merge(T, [...[[0.74, 1.38], [-0.74, 1.38], [0.74, -1.38], [-0.74, -1.38]].map(([x, z]) => [new T.CylinderGeometry(0.33, 0.33, 0.24, 12).rotateZ(Math.PI / 2).translate(x, 0.33, z)]),
      [bx(1.82, 0.2, 0.14, 0, 0.42, L + 0.02)], [bx(1.82, 0.2, 0.14, 0, 0.42, -L - 0.02)], [bx(CARS.wid + 0.02, 0.1, CARS.len - 1.4, 0, 0.4, 0)]]),
    lamps: merge(T, [[bx(0.34, 0.12, 0.04, 0.62, 0.78, L + 0.01), new T.Color(0xeeeadc)], [bx(0.34, 0.12, 0.04, -0.62, 0.78, L + 0.01), new T.Color(0xeeeadc)],
      [bx(0.3, 0.14, 0.04, 0.66, 0.82, -L - 0.01), new T.Color(0x8a1414)], [bx(0.3, 0.14, 0.04, -0.66, 0.82, -L - 0.01), new T.Color(0x8a1414)]]),
    cap: merge(T, [[bx(1.4, 1, 1.5, 0, 0.5, -0.42)]]),          // unit height, scaled per car (roof); a second instance does the hood
    mound: new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)
  };
  const snow = new T.MeshLambertMaterial({ color: 0xf3f7fc });
  M = {
    paint: new T.InstancedMesh(G.paint, a.mesh.std(0xffffff, 0.45, 0.35), C.cars.length),
    glass: new T.InstancedMesh(G.glass, a.mesh.std(0x1a2129, 0.15, 0.6), C.cars.length),
    dark: new T.InstancedMesh(G.dark, a.mesh.std(0x16181b, 0.85, 0.05), C.cars.length),
    lamps: new T.InstancedMesh(G.lamps, new T.MeshLambertMaterial({ vertexColors: true }), C.cars.length),
    cap: new T.InstancedMesh(G.cap, snow, C.cars.length * 2),
    mound: new T.InstancedMesh(G.mound, snow, C.cars.length)
  };
  const grp = C.group = new T.Group(); grp.name = "parkedCars";
  const m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3(), col = new T.Color(), up = new T.Vector3(0, 1, 0);
  C.cars.forEach((c, i) => {
    q.setFromAxisAngle(up, c.yaw); p.set(c.x, c.y - 0.04, c.z); s.set(1, c.sy, c.sx); m.compose(p, q, s); c.m = m.clone();
    for (const k of ["paint", "glass", "dark", "lamps"]) M[k].setMatrixAt(i, m);
    col.setHex(c.col); M.paint.setColorAt(i, col);
  });
  for (const k in M) { const o = M[k]; o.frustumCulled = false; o.castShadow = k !== "lamps" && k !== "cap"; o.receiveShadow = true; o.name = "car_" + k; grp.add(o); }
  if (M.paint.instanceColor) M.paint.instanceColor.needsUpdate = true;
  a.scene.add(grp);
  C.T = T; C.q = { m, q, p, s, up };
  C.cars.forEach(c => { c.qb = -1; });
  snowLook();
}
// the snow on and round each car, re-laid only for cars whose snow moved a step
function snowLook() {
  const { m, q, p, s, up } = C.q, T = C.T, zero = new T.Matrix4().makeScale(0, 0, 0), loc = new T.Matrix4();
  let dirty = false;
  C.cars.forEach((c, i) => {
    const qb = Math.round(c.b * 40) / 40; if (qb === c.qb) return; c.qb = qb; dirty = true;
    const cap = Math.min(1, qb / 0.08);
    if (cap <= 0) { M.cap.setMatrixAt(2 * i, zero); M.cap.setMatrixAt(2 * i + 1, zero); }
    else {
      const h = 0.04 + 0.16 * cap;
      loc.makeScale(1, h, 1).setPosition(0, 1.5, 0); m.multiplyMatrices(c.m, loc); M.cap.setMatrixAt(2 * i, m);
      loc.makeScale(1.04, h * 0.7, 0.62).setPosition(0, 0.96, 1.62); m.multiplyMatrices(c.m, loc); M.cap.setMatrixAt(2 * i + 1, m);
    }
    // under a full drift the car is gone from sight: hide it (its corners would poke through the dome) and the roof snow
    const hide = qb >= CARS.gone;
    if (hide !== !!c.hid) { c.hid = hide; for (const k of ["paint", "glass", "dark", "lamps"]) { M[k].setMatrixAt(i, hide ? zero : c.m); M[k].instanceMatrix.needsUpdate = true; } }
    if (hide) { M.cap.setMatrixAt(2 * i, zero); M.cap.setMatrixAt(2 * i + 1, zero); }
    if (qb < CARS.mound) M.mound.setMatrixAt(i, zero);
    else { q.setFromAxisAngle(up, c.yaw); p.set(c.x, c.y - 0.28, c.z); s.set(1.95, 0.4 + 1.55 * qb * (0.5 + 0.5 * c.sy), 3.15 * c.sx); m.compose(p, q, s); M.mound.setMatrixAt(i, m); }
  });
  if (dirty) { M.cap.instanceMatrix.needsUpdate = true; M.mound.instanceMatrix.needsUpdate = true; }
}

// ---- snow: the storm fills, owners dig out
function step(dh) {
  const WX = api.WX, ss = api.sstep;
  for (const c of C.cars) {
    const w = WX.at(c.x, c.z);
    if (w > CARS.fillA) c.b = Math.min(1, c.b + dh * CARS.fill * ss(CARS.fillA, CARS.fillB, w));
    if (c.b > 0 && w < CARS.calm) { c.wt += dh; if (c.wt >= c.wait) { c.b = 0; c.wt = 0; } }
    else c.wt = 0;
  }
}
function tick() {
  const st = CS(); if (!C.ready || !st) return;
  const H = api.GS.hour;
  if (!(st.h >= 0) || H < st.h) { st.h = H; return; }
  let dh = H - st.h; if (dh < 0.02) return;
  st.h = H;
  if (dh > CARS.skip) { dh = Math.min(dh, 72); for (let t = 0; t < dh; t += 0.5) step(Math.min(0.5, dh - t)); }
  else step(dh);
  snowLook();
}
C.buried = () => C.cars.filter(c => c.b >= CARS.buried).length;
C.setSnow = (i, v) => { for (const c of C.cars) if (i === null || i === undefined || c.i === i) { c.b = Math.max(0, Math.min(1, v)); c.wt = 0; } snowLook(); };
C.step = dh => { step(dh); snowLook(); };
C.CARS = CARS;

TLX.register({
  id: "cars", v: 1,
  state0: () => ({ h: -1, c: {} }),
  migrate: st => Object.assign({ h: -1, c: {} }, st || {}),
  init(a) {
    api = a; const t0 = performance.now();
    try {
      C.cars = place(a.world);
      const st = CS(), saved = (st && st.c) || {};
      for (const c of C.cars) { const v = saved[c.key]; if (Array.isArray(v)) { c.b = Math.max(0, Math.min(1, +v[0] || 0)); c.wt = Math.max(0, +v[1] || 0); } }
      build(a); C.ready = true;
    } catch (e) { console.error("TLX cars", e); C.err = String(e); }
    C.ms = Math.round(performance.now() - t0);
  },
  tick() { try { tick(); } catch (e) { if (!C.tickErr) console.error("TLX cars tick", e); C.tickErr = String(e); } },
  save() {
    const st = CS(); if (!st) return;
    st.c = {}; for (const c of C.cars) if (c.b > 0.005) st.c[c.key] = [Math.round(c.b * 1000) / 1000, Math.round(c.wt * 100) / 100];
    if (st.h >= 0) st.h = Math.round(st.h * 1000) / 1000;
  }
});
})();
