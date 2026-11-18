// Tracklayer expansion — plowing (milestone 4, loop/EXPANSION.md). Slices 4.1a1 (the blade on the Fjellvogn) and
// 4.1a2 (the road credit: a snowed-in road stretch you plow both sides of is open).
//
// WHAT THE PLAYER GETS. The garage has a Plow tab: the Fjellskjær 2.3, a 2.3 m angled blade, fits a pickup you own
// that stands within 60 m of the garage ($1,450 once; taking it off puts it in the shed and refitting is free). In a
// bladed truck the use control (E / L3 / the touch pill, which reads BLADE DOWN or BLADE UP) drops and lifts it, so the
// horn is gone from that control in a bladed truck (a bladeless truck keeps it). With the blade down and the truck
// rolling forward it cuts the snow in front of the bumper down to the level of a plowed yard, two metres wide, and
// throws what it took off into a windrow along the right-hand side, as the council's truck does. The wheels follow in
// the cut, so the pickup no longer sinks: what limits it now is the push on the blade, which grows with the depth of
// the snow, the square of the speed and what is heaped on the blade. Thirty centimetres is steady work, sixty a crawl,
// and a drift over the top of the blade stops it with a line that says so. The riding hint tells you when to drop it
// and, while it is down, the speed and the depth it is cutting.
//
// HOW. The cut and the windrow are snow cells (api.world.bladeSnow / heapSnow, tracklayer.js beside pressSnow): a
// windrow is snow standing deeper than the snowpack. Cells are not saved and snowfall eases them back, so a cut off
// the road is gone after a reload: what must last is a road stretch (4.1a2, the road credit) or a contract's own lane
// (4.2). The push goes into the truck's physics through TLXV.addLoad (kg, pin, drag, why), the control through
// TLXV.addUse, the model onto each truck's group through TLXV.onModel. tlx-vehicles.js knows nothing else about it.
//
// THE ROAD CREDIT (4.1a2). The roads keep their snow per 400 m stretch (tlx-roads.js). While the blade is down and the
// truck rolls forward within the road's half-width of a road's line, the 10 m length of the stretch under the blade's
// middle is marked for the SIDE of the centre line the blade's middle is on. A stretch with 80% of its lengths marked
// on BOTH sides is plowed for good (TLXR.plowSeg: its snow to 0 across the whole width, the scraped hour stamped, the
// Map repainted) with a line that names the road. So the 2 m blade opens a stretch by going out on one side and coming
// back on the other; twice along the same side does not, and the hint says how much of each side is done. The marks
// are not saved, and are dropped when the stretch is opened (by you or the council's plow) or new snow falls on it.
//
// SAVED: x.sys.plow = { blades: { truckUid: { id, cond } }, shed: [bladeId...], m: metres cut in all, opened: road
// stretches opened }. Up/down is not saved: a reload finds the blade up. A blade whose truck is gone (sold, an old
// save) moves to the shed.
// NOT YET: the throw side, back-dragging, a solid blade that trips, wear, sound,
// used blades (4.1b), the plow truck (4.1c), pay (4.2).
(() => {
"use strict";
/* ---------------- tunables ---------------- */
const BLADES = [
  // w, h: the mouldboard, m. ang: how far it is slewed (rad; 28 degrees: it clears w x cos = 2.03 m, the pickup is 1.96).
  // z: its middle, m ahead of the truck's centre. leave: what it leaves standing, as a share of the snowpack (the yard level).
  { id: "b23", name: "Fjellskjær 2.3", fits: ["pickup"], cost: 1450, kg: 280, w: 2.3, h: 0.65, ang: 0.49, z: 3.25, leave: 0.15 }
];
const BL = {
  face: 2600,      // N per m2 of snow face (depth cut x width cleared), standing
  v2: 0.15,        // the face term grows by 1 + v2 x v^2: the snow has to be thrown, not just pushed
  over: 9000,      // N per m2 of face ABOVE the mouldboard's top: it spills back over the blade onto the truck
  carryN: 900,     // N per m3 riding on the blade
  carryMax: 1.2,   // m3 the blade holds before it spills ahead
  scrape: 150,     // N, the cutting edge on the ground
  backN: 300,      // N reversing with it down
  rowW: 0.8,       // m, the width of one row of the windrow
  rows: [0.8, 0.6, 0.35],   // m each row may stand over the snowpack, nearest first: what one can't take rolls out to the next, so it slopes away
  rowMax: 0.8,     // m a pile dropped in front may stand over the snowpack
  garage: 60,      // m from the garage to fit or take off
  lift: 0.3,       // m the blade rides up
  liftT: 0.5,      // s to drop or lift
  sunk: 0.1,       // m the wheels sink, on average, from which a standing truck is told to start from cleared ground
  hintMin: 0.08,   // m of snow ahead, over what the blade would leave, before the hint suggests dropping it (not on a plowed street)
  whyN: 6000,      // N on the blade from which "stuck" is the blade's doing
  // the road credit (4.1a2)
  bin: 10,         // m: a road stretch is counted in lengths this long, per side of its centre line
  credit: 0.8,     // the share of a stretch's lengths, on each side, that opens it
  both: 3,         // m: a blade clearing this much or more marks both sides in one pass (the plow truck's, 4.1c)
  rise: 0.1        // new snow on a stretch (its level up by this much since the marks began) wipes the marks
};
const byId = id => BLADES.find(b => b.id === id) || null;
let api = null, T = null;
const S = () => TLX.state("plow");
const RTB = new Map();                                                        // truck uid -> { down, k (0 up .. 1 down), carry, last, drag, cut, depth, full, grp, B, lens }
const rt = uid => { uid = String(uid); let r = RTB.get(uid); if (!r) RTB.set(uid, r = { down: false, k: 0, carry: 0, last: null, drag: 0, cut: 0, depth: 0, full: false, stopT: 0, volCut: 0, volLaid: 0 }); return r; };
const bladeOf = uid => { const s = S(), b = s && s.blades[uid]; return b ? byId(b.id) : null; };
const trucks = () => (window.TLXV ? TLXV.state().owned : []).filter(r => !TLXV.kinds[r.id]);
const curUid = () => (window.TLXV ? TLXV.state().cur : null);

/* ---------------- the save's housekeeping ---------------- */
function tidy() {
  const s = S(); if (!s) return;
  if (!s.blades || typeof s.blades !== "object" || Array.isArray(s.blades)) s.blades = {};
  if (!Array.isArray(s.shed)) s.shed = [];
  if (!Number.isFinite(s.m)) s.m = 0;
  if (!Number.isFinite(s.opened)) s.opened = 0;
  s.shed = s.shed.filter(id => byId(id));
  const own = trucks();
  for (const uid of Object.keys(s.blades)) {
    const b = s.blades[uid], d = b && byId(b.id), r = own.find(q => String(q.uid) === uid);
    if (!d) { delete s.blades[uid]; continue; }
    if (!r || !d.fits.includes(r.id)) { delete s.blades[uid]; s.shed.push(d.id); drop(uid); continue; }   // the truck is gone: the blade is in the shed
    if (!Number.isFinite(b.cond)) b.cond = 100;
  }
}
function drop(uid) { uid = String(uid); const r = RTB.get(uid); if (r && r.grp && r.grp.parent) r.grp.parent.remove(r.grp); RTB.delete(uid); }

/* ---------------- fitting it: the garage's Plow tab ---------------- */
function truckPos(r) { return curUid() === r.uid ? api.P : r; }
function near(r) { const g = api.world.garage(), p = truckPos(r); return Math.hypot(p.x - g.x, p.z - g.z) <= BL.garage; }
function fit(uid, id) {
  const s = S(), d = byId(id), r = trucks().find(q => q.uid === uid), GS = api.GS;
  if (!d || !r || !d.fits.includes(r.id) || s.blades[uid]) return false;
  if (!near(r)) { api.toast(`Bring the truck within ${BL.garage} m of the garage to fit a blade.`, "warn"); return false; }
  const i = s.shed.indexOf(id);
  if (i >= 0) s.shed.splice(i, 1);
  else { if (GS.cash < d.cost) { api.toast(`The ${d.name} is ${api.fmtCash(d.cost)}. You have ${api.fmtCash(GS.cash)}.`, "warn"); return false; } GS.cash -= d.cost; }
  s.blades[uid] = { id, cond: 100 };
  const R = TLXV.runtimeOf(uid); if (R) model(R);
  api.toast(i >= 0 ? `The ${d.name} is back on the truck.` : `The ${d.name} is fitted. ${useLine()}`, "good");
  api.save(); api.garageRefresh(); return true;
}
function unfit(uid) {
  const s = S(), b = s.blades[uid], r = trucks().find(q => q.uid === uid);
  if (!b) return false;
  if (r && !near(r)) { api.toast(`Bring the truck within ${BL.garage} m of the garage to take the blade off.`, "warn"); return false; }
  const B = RTB.get(String(uid)); if (B && B.carry > 0) spill(B, uid);
  delete s.blades[uid]; s.shed.push(b.id); drop(uid);
  api.toast(`The ${byId(b.id).name} is off the truck and in the garage's shed. Fitting it again costs nothing.`);
  api.save(); api.garageRefresh(); return true;
}
function garageRows(body, row) {
  tidy();
  const s = S(), GS = api.GS, own = trucks(), V = TLXV.VEHICLES;
  const foot = t => { const e = document.createElement("div"); e.className = "bfoot"; e.textContent = t; body.appendChild(e); };
  for (const d of BLADES) {
    const can = own.filter(r => d.fits.includes(r.id)), inShed = s.shed.filter(id => id === d.id).length;
    const spec = `${d.w.toFixed(1)} m steel mouldboard, slewed to throw right · clears ${(d.w * Math.cos(d.ang)).toFixed(1)} m · ${d.kg} kg on the nose · fits the ${d.fits.map(id => (V.find(v => v.id === id) || {}).name || id).join(", ")}`;
    const how = `${useLine()} Down and rolling forward it cuts the snow to a plowed yard's level and throws it into a windrow on the right. The deeper the snow and the faster you go, the harder it pushes back: a drift over the blade's top stops the truck, so take it in bites.`;
    if (!can.length) { row(d.name, `${spec}\n<span style="color:#9fd8a8">${how}</span>\n<span style="color:#f0c674">It goes on a pickup. Buy one on the Trucks tab first.</span>`, "$" + d.cost, "locked", () => { }, "plow"); continue; }
    can.forEach((r, i) => {
      const tn = (V.find(v => v.id === r.id) || {}).name + (can.length > 1 ? " no. " + (i + 1) : ""), here = near(r), has = s.blades[r.uid];
      const away = here ? "" : `\n<span style="color:#f0c674">The ${tn} stands ${Math.round(Math.hypot(truckPos(r).x - api.world.garage().x, truckPos(r).z - api.world.garage().z))} m from the garage. Bring it within ${BL.garage} m.</span>`;
      if (has) row(`Take the ${d.name} off the ${tn}`, `It goes into the garage's shed and fitting it again costs nothing. The truck gets its horn back on the use control and ${d.kg} kg off its nose.${away}`, "To the shed", here ? "" : "locked", () => unfit(r.uid), "plow");
      else row(`Fit the ${d.name} to the ${tn}`, `${spec}\n<span style="color:#9fd8a8">${how}</span>${inShed ? "\nYours already: it is in the shed." : ""}${away}`, inShed ? "Yours · free" : "$" + d.cost, !here || (!inShed && GS.cash < d.cost) ? "locked" : "", () => fit(r.uid, d.id), "plow");
    });
  }
  foot((s.m >= 50 ? `Snow cut with a blade so far: ${s.m >= 1000 ? (s.m / 1000).toFixed(1) + " km" : Math.round(s.m) + " m"}. ` : "A blade clears snow where you drive it. ") + "A cut off the road snows in again. A snowed-in road is open once you have plowed both sides of it: out on one side, back on the other." + (s.opened > 0 ? ` Road stretches you have opened: ${s.opened}.` : ""));
}

/* ---------------- the model: built onto the truck's own group ---------------- */
// one geometry from many boxes and rods, vertex-coloured, so the whole blade is three draw calls
function merge(parts) {
  let nv = 0, ni = 0;
  for (const p of parts) { p.g.applyMatrix4(p.m); nv += p.g.attributes.position.count; ni += p.g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint32Array(ni), c = new T.Color();
  let v = 0, i = 0;
  for (const p of parts) {
    const n = p.g.attributes.position.count; c.setHex(p.c).convertSRGBToLinear();
    pos.set(p.g.attributes.position.array, v * 3); nor.set(p.g.attributes.normal.array, v * 3);
    for (let k = 0; k < n; k++) { col[(v + k) * 3] = c.r; col[(v + k) * 3 + 1] = c.g; col[(v + k) * 3 + 2] = c.b; }
    const ia = p.g.index.array; for (let k = 0; k < ia.length; k++) idx[i + k] = ia[k] + v;
    v += n; i += ia.length; p.g.dispose();
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("normal", new T.BufferAttribute(nor, 3)); g.setAttribute("color", new T.BufferAttribute(col, 3));
  g.setIndex(new T.BufferAttribute(idx, 1)); g.computeBoundingSphere();
  return g;
}
const _e = { v: null };
function mx(x, y, z, rx = 0, ry = 0, rz = 0) { if (!_e.v) _e.v = new T.Euler(0, 0, 0, "YXZ"); _e.v.set(rx, ry, rz); return new T.Matrix4().makeRotationFromEuler(_e.v).setPosition(x, y, z); }
const bx = (w, h, d, c, x, y, z, rx, ry, rz) => ({ g: new T.BoxGeometry(w, h, d), c, m: mx(x, y, z, rx, ry, rz) });
const rod = (r, h, c, x, y, z, rx, ry, rz) => ({ g: new T.CylinderGeometry(r, r, h, 8), c, m: mx(x, y, z, rx, ry, rz) });
const C_FRAME = 0x1d2024, C_BLADE = 0xd9a514, C_EDGE = 0x6d7379, C_ROD = 0x23262a, C_TIP = 0xff6a1a, C_RAM = 0xb4bac0;
let MAT = null;
function mats() { return MAT || (MAT = { paint: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.25 }), lens: new T.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.3, metalness: 0.1, emissive: 0xfff1cf, emissiveIntensity: 0 }) }); }
function model(R) {
  const uid = R.rec.uid, d = bladeOf(uid); if (!d) return;
  const B = rt(uid); if (B.grp && B.grp.parent === R.grp) return;
  const M = mats(), grp = B.grp = new T.Group(), zb = d.z, hw = d.w / 2;
  // on the truck: the push frame's mount under the bumper, the lift tower, the lamp bar over the bonnet
  const fixed = [
    bx(1.1, 0.1, 0.12, C_FRAME, 0, 0.36, 2.62), bx(0.1, 0.72, 0.1, C_FRAME, 0.34, 0.74, 2.74), bx(0.1, 0.72, 0.1, C_FRAME, -0.34, 0.74, 2.74),
    bx(0.82, 0.08, 0.1, C_FRAME, 0, 1.08, 2.74), bx(0.07, 0.3, 0.07, C_FRAME, 0.5, 1.26, 2.74), bx(0.07, 0.3, 0.07, C_FRAME, -0.5, 1.26, 2.74),
    bx(1.24, 0.06, 0.08, C_FRAME, 0, 1.4, 2.74), bx(0.2, 0.15, 0.13, C_FRAME, 0.5, 1.5, 2.72), bx(0.2, 0.15, 0.13, C_FRAME, -0.5, 1.5, 2.72)
  ];
  const fm = new T.Mesh(merge(fixed), M.paint); fm.castShadow = true; grp.add(fm);
  const lens = B.lens = new T.Mesh(merge([bx(0.16, 0.11, 0.02, 0xffffff, 0.5, 1.5, 2.795), bx(0.16, 0.11, 0.02, 0xffffff, -0.5, 1.5, 2.795)]), M.lens.clone()); grp.add(lens);
  // the part that lifts: the A-frame, the ram, the mouldboard in three strips, its cutting edge, ribs and the two marker rods
  const a = -d.ang, sa = Math.sin(d.ang), ca = Math.cos(d.ang);
  const onB = (lx, y, lz) => [lx * ca - lz * sa, y, zb + lx * sa + lz * ca];              // a point lx along the blade (+ = left), lz ahead of its face
  const mov = [];
  for (const sg of [1, -1]) { const x0 = sg * 0.42, z0 = 2.66, x1 = sg * 0.12, z1 = zb - 0.2, L = Math.hypot(x1 - x0, z1 - z0); mov.push(bx(0.08, 0.09, L, C_FRAME, (x0 + x1) / 2, 0.2, (z0 + z1) / 2, 0, Math.atan2(x1 - x0, z1 - z0), 0)); }
  mov.push(bx(0.5, 0.1, 0.1, C_FRAME, 0, 0.2, zb - 0.22));
  { const y0 = 0.3, z0 = zb - 0.24, y1 = 0.74, z1 = 2.8, L = Math.hypot(y1 - y0, z1 - z0); mov.push(rod(0.035, L, C_RAM, 0, (y0 + y1) / 2, (z0 + z1) / 2, Math.atan2(z1 - z0, y1 - y0), 0, 0)); }
  const strip = (h, y, lz, rx, c) => { const p = onB(0, y, lz); mov.push(bx(d.w, h, 0.035, c, p[0], p[1], p[2], rx, a, 0)); };
  strip(0.25, 0.185, 0.0, -0.42, C_BLADE); strip(0.22, 0.4, -0.045, 0, C_BLADE); strip(0.22, 0.595, 0.0, 0.46, C_BLADE);
  strip(0.09, 0.045, 0.07, -0.42, C_EDGE);
  for (const lx of [-0.95, -0.32, 0.32, 0.95]) { const p = onB(lx, 0.36, -0.1); mov.push(bx(0.04, 0.56, 0.12, C_FRAME, p[0], p[1], p[2], 0, a, 0)); }
  for (const sg of [1, -1]) { const p = onB(sg * (hw - 0.04), 0, 0); mov.push(rod(0.012, 0.6, C_ROD, p[0], 0.98, p[2])); mov.push(rod(0.022, 0.12, C_TIP, p[0], 1.3, p[2])); }
  const bm = new T.Mesh(merge(mov), M.paint); bm.castShadow = true; B.B = new T.Group(); B.B.add(bm); grp.add(B.B);
  B.B.position.y = BL.lift * (1 - B.k);
  R.grp.add(grp);
}

/* ---------------- the blade's two ends in the world ---------------- */
const _a = [0, 0], _b = [0, 0];
function ends(d, P, out, dz = 0) {
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), hx = d.w / 2 * Math.cos(d.ang), hz = d.w / 2 * Math.sin(d.ang);
  const L = (lx, lz, o, i) => { o[i] = P.x + fz * lx + fx * lz; o[i + 1] = P.z - fx * lx + fz * lz; };
  L(hx, d.z + hz + dz, out, 0); L(-hx, d.z - hz + dz, out, 2); return out;      // [left x, z, right x, z]
}
const _n = [0, 0, 0, 0], _m = [0, 0, 0, 0];
function depthLine(q, leave) {                                                   // the snow along a line: [mean depth, mean depth above what the blade leaves]
  const W = api.world, CELL = W.cell, HALF = W.half; let sd = 0, sc = 0; const N = 9;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), x = q[0] + (q[2] - q[0]) * t, z = q[1] + (q[3] - q[1]) * t, ix = Math.round((x + HALF) / CELL), iz = Math.round((z + HALF) / CELL);
    const dd = W.depthAt(ix, iz), f = W.freshAt(ix, iz); sd += dd; sc += Math.max(0, dd - f * leave);
  }
  return [sd / N, sc / N];
}
function heapAt(d, P, lx, lz, r, vol, cap = BL.rowMax) { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); return api.world.heapSnow(P.x + fz * lx + fx * lz, P.z - fx * lx + fz * lz, r, vol, cap); }
function spill(B, uid) {                                                         // what rides on the blade drops in a pile in front of it
  const d = bladeOf(uid), P = truckPose(uid); if (!d || !P || !(B.carry > 0)) { B.carry = 0; return; }
  B.volLaid += heapAt(d, P, 0, d.z + 1.1, 0.9, B.carry); B.carry = 0;
}
function truckPose(uid) { if (curUid() === uid) return api.P; return trucks().find(r => r.uid === uid) || null; }

/* ---------------- the road credit (4.1a2) ---------------- */
const RC = new Map();                                                         // "routeId:stretch" -> { n lengths, m: [Uint8Array, Uint8Array] marked per side, c: [count, count], s0: the lowest snow level seen }
function roadSide(rt, s, x, z) {                                              // which side of the route's line (x, z) is on: 0 = left of it facing up the route, 1 = right
  const c = rt.cum, p = rt.pts; let lo = 1, hi = c.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (c[m] < s) lo = m + 1; else hi = m; }
  const a = p[lo - 1], b = p[lo];
  return (b[1] - a[1]) * (x - a[0]) - (b[0] - a[0]) * (z - a[1]) >= 0 ? 0 : 1;
}
function roadMark(d, x, z, mark) {                                            // -> { name, mine, other } (shares done, this side and the other) on a stretch with snow on it, else null
  const TR = window.TLXR; if (!TR || !TR.ready || !TR.plowSeg) return null;
  const n = TR.near(x, z), r = n.route; if (!r || r.closed || !r.st || !r.cum || !(n.d <= TR.ROADS.half)) return null;
  const SEG = TR.ROADS.seg, i = Math.floor(n.s / SEG), g = r.seg[i]; if (!g || !g.legs.length || !(i < r.st.s.length)) return null;
  const sn = r.st.s[i], key = r.id + ":" + i; let c = RC.get(key);
  if (!(sn > 0.02)) { if (c) RC.delete(key); return null; }                   // nothing on it (the council's plow has been, or it never drifted)
  if (c && sn > c.s0 + BL.rise) { RC.delete(key); c = null; }                 // new snow since: what was cut is filled in
  const side = roadSide(r, n.s, x, z);
  if (!c) {
    if (!mark) return { name: r.name, mine: 0, other: 0 };
    const nb = Math.max(1, Math.ceil(Math.min(SEG, r.len - i * SEG) / BL.bin));
    RC.set(key, c = { n: nb, m: [new Uint8Array(nb), new Uint8Array(nb)], c: [0, 0], s0: sn });
  }
  if (sn < c.s0) c.s0 = sn;
  if (mark) {
    const b = Math.max(0, Math.min(c.n - 1, Math.floor((n.s - i * SEG) / BL.bin))), wide = d.w * Math.cos(d.ang) >= BL.both;
    for (let sd = 0; sd < 2; sd++) if ((wide || sd === side) && !c.m[sd][b]) { c.m[sd][b] = 1; c.c[sd]++; }
    if (c.c[0] >= BL.credit * c.n && c.c[1] >= BL.credit * c.n) { RC.delete(key); opened(r, i, sn); return null; }
  }
  return { name: r.name, mine: c.c[side] / c.n, other: c.c[1 - side] / c.n };
}
function opened(r, i, sn) {
  const TR = window.TLXR, SEG = TR.ROADS.seg, wasShut = sn >= TR.ROADS.shut;
  TR.plowSeg(r.id, i * SEG + 1, true);                                         // quiet: the roads' own "the plow's been round" is not said for your work
  const s = S(); s.opened = (s.opened || 0) + 1;
  const km = v => (v / 1000).toFixed(1), from = `km ${km(i * SEG)} to ${km(Math.min(r.len, (i + 1) * SEG))}`;
  api.toast(!wasShut ? `You've plowed the ${r.name}, ${from}.` : TR.status(r.id) === "open" ? `The ${r.name} is open again: your blade cleared ${from}.` : `You've opened the ${r.name}, ${from}. More of it is still snowed in.`, "good");
  api.save();
}

/* ---------------- each frame ---------------- */
function work(uid, d, B, dt) {
  const P = api.P, W = api.world, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), vf = P.vx * fx + P.vz * fz, wEff = d.w * Math.cos(d.ang);
  const dl = depthLine(ends(d, P, _m, 0.35), d.leave);
  B.depth = dl[0]; B.cut = dl[1];
  if (!B.down) { B.drag = 0; B.full = false; B.last = null; B.why = ""; B.road = null; return; }
  const q = ends(d, P, _n), L = B.last;
  B.road = roadMark(d, (q[0] + q[2]) / 2, (q[1] + q[3]) / 2, !!L && vf > 0.3 && P.gnd !== false && dt > 0 && Math.max(Math.abs(q[0] - L[0]), Math.abs(q[1] - L[1])) < 5);
  if (L && vf > 0.3 && P.gnd !== false) {
    const mv = Math.max(Math.hypot(q[0] - L[0], q[1] - L[1]), Math.hypot(q[2] - L[2], q[3] - L[3]));
    if (mv < 5) {                                                                // further than that in a frame is a teleport, not plowing
      const n = Math.max(1, Math.min(40, Math.ceil(mv / (W.cell * 0.5)))); let vol = 0;
      for (let i = 1; i <= n; i++) { const t = i / n; vol += W.bladeSnow(L[0] + (q[0] - L[0]) * t, L[1] + (q[1] - L[1]) * t, L[2] + (q[2] - L[2]) * t, L[3] + (q[3] - L[3]) * t, d.leave); }
      B.carry += vol; B.volCut += vol; if (vol > 0) S().m += vf * dt;
      // the windrow: off the trailing (right-hand) end; what the first row can't take rolls one row further out
      const hx = wEff / 2, hz = d.w / 2 * Math.sin(d.ang), r = BL.rowW / 2;
      for (let i = 0; i < BL.rows.length && B.carry > 1e-4; i++) { const p = heapAt(d, P, -(hx + 0.25 + r * (2 * i + 1)), d.z - hz - 0.35 - 0.25 * i, r, B.carry, BL.rows[i]); B.carry -= p; B.volLaid += p; }
      if (B.carry > BL.carryMax) { const p = heapAt(d, P, 0, d.z + 1.1, 0.9, B.carry - BL.carryMax); B.volLaid += p; B.carry = BL.carryMax; B.full = true; } else if (B.carry < BL.carryMax * 0.6) B.full = false;
      // a plume off the trailing end, more of it at speed
      if (vol > 0.002) { const n2 = vf > 8 ? 3 : 1, lx = fz, lz = -fx; for (let i = 0; i < n2; i++) if (Math.random() < 0.7) api.emit(q[2] - lx * 0.3, P.y + 0.35, q[3] - lz * 0.3, -lx * (2 + vf * 0.25) + fx * vf * 0.5, 1.2 + vf * 0.15, -lz * (2 + vf * 0.25) + fz * vf * 0.5, 1.6, 0.9); }
    }
  }
  B.last = B.last || [0, 0, 0, 0]; B.last[0] = q[0]; B.last[1] = q[1]; B.last[2] = q[2]; B.last[3] = q[3];
  if (Math.abs(vf) < 0.15) { B.stopT += dt; if (B.stopT > 1.2 && B.carry > 0) spill(B, uid); } else B.stopT = 0;
  // the push it puts on the truck (read by core() through TLXV.addLoad next frame)
  if (vf < -0.2) { B.drag = BL.backN; B.why = ""; return; }
  const v = Math.max(0, vf);
  B.drag = BL.scrape + BL.face * B.cut * wEff * (1 + BL.v2 * v * v) + BL.over * Math.max(0, B.depth - d.h) * wEff + BL.carryN * B.carry;
  B.why = B.drag >= BL.whyN ? `The blade is into more snow than the truck can push. Lift it${INPdev() === "touch" ? "" : " (" + api.btn("use") + ")"}, back up and take it in bites.` : "";
}
const INPdev = () => api.INP.dev;
function tick(dt) {
  if (!api || !window.TLXV) return;
  const s = S(); if (!s || !s.blades) return;
  const cur = curUid(), night = 1 - api.dayFactor();
  for (const uid of Object.keys(s.blades)) {
    const r = trucks().find(q => String(q.uid) === uid); if (!r) { tidy(); return; }
    const d = byId(s.blades[uid].id), B = rt(r.uid), R = TLXV.runtimeOf(r.uid);
    if (R && (!B.grp || B.grp.parent !== R.grp)) { B.grp = null; model(R); }
    const mine = cur === r.uid, seated = mine && !api.FOOT.on;
    if (mine) work(r.uid, d, B, seated ? dt : 0); else { B.drag = 0; B.last = null; B.why = ""; B.road = null; }
    B.k = Math.max(0, Math.min(1, B.k + (B.down ? 1 : -1) * dt / BL.liftT));
    if (B.B) B.B.position.y = BL.lift * (1 - B.k);
    if (B.lens) B.lens.material.emissiveIntensity = seated && night > 0.35 && api.GS.fuel > 0 ? 1.7 : 0;
  }
}

/* ---------------- the control and what it says ---------------- */
function useLine() { return INPdev() === "touch" ? "In the truck, the BLADE DOWN / BLADE UP button drops and lifts it." : `In the truck, ${api.btn("use")} drops and lifts it.`; }
function toggle(R) {
  const uid = R.rec.uid, d = bladeOf(uid); if (!d || api.FOOT.on || curUid() !== uid) return false;
  const B = rt(uid); B.down = !B.down; B.last = null;
  if (!B.down && B.carry > 0) spill(B, uid);
  return true;
}
function label(R) { const d = bladeOf(R.rec.uid); if (!d || api.FOOT.on) return null; return rt(R.rec.uid).down ? "BLADE UP" : "BLADE DOWN"; }
function rideLine() {
  const uid = curUid(); if (uid == null || api.FOOT.on) return "";
  const d = bladeOf(uid); if (!d) return "";
  const B = rt(uid), P = api.P, v = Math.hypot(P.vx, P.vz), touch = INPdev() === "touch";
  if (!B.down) return v < 3 && B.cut >= BL.hintMin ? (touch ? "tap BLADE DOWN" : api.btn("use") + ": drop the blade") + ` · ${Math.round(B.depth * 100)} cm of snow ahead` : "";
  const lift = touch ? "tap BLADE UP" : api.btn("use") + ": lift it";
  // dropped where the truck stands in deep snow: the wheels are in snow the blade never reached, and that is what holds it
  if (v < 0.5 && B.cut > 0.02) { const R = TLXV.runtimeOf(uid), sk = R && R.sink ? (R.sink[0] + R.sink[1] + R.sink[2] + R.sink[3]) / 4 : 0; if (sk > BL.sunk) return `BLADE DOWN · your wheels stand in snow it has not cut: back up to cleared ground and plow in from there · ${lift}`; }
  if (B.full) return `BLADE DOWN · the blade is full: lift it or ease off · ${lift}`;
  const pc = x => Math.round(Math.min(1, x / BL.credit) * 100), rd = B.road ? ` · ${B.road.name}: this side ${pc(B.road.mine)}%, the other side ${pc(B.road.other)}%` : "";   // of what opens the stretch
  return `BLADE DOWN · ${Math.round(v * 3.6)} km/h · ${B.cut > 0.04 ? "cutting " + Math.round(B.depth * 100) + " cm" : "nothing to cut"}${rd} · ${lift}`;
}
const XL = { kg: 0, pin: 0, drag: 0, brakeN: 0, hold: false, held: false, why: "" };
function load(uid) { const d = bladeOf(uid); if (!d) return null; const B = rt(uid); XL.kg = d.kg; XL.pin = d.kg; XL.drag = B.drag || 0; XL.why = B.why || ""; return XL; }

window.TLXPL = { BLADES, BL, state: S, rt, fit, unfit, bladeOf, ends, hint: rideLine, tidy, road: RC, roadSide };

TLX.register({
  id: "plow", v: 1,
  state0: () => ({ blades: {}, shed: [], m: 0, opened: 0 }),
  migrate: st => st,
  init(a) {
    api = a; T = a.THREE; RTB.clear(); RC.clear();
    if (!window.TLXV) return;
    tidy();
    a.veh.tabs.push({ id: "plow", name: "Plow", render: garageRows });
    TLXV.addLoad(load);
    TLXV.addUse({ use: toggle, label });
    TLXV.onModel(model);
    if (a.ridex) a.ridex.push(rideLine);
  },
  tick,
  save() { tidy(); }
});
})();
