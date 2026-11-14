// Slice 3.5a (G4): semis on the open roads. Asserts, exit 1 on a failure.
//  A. tlx-semis.js loaded: three sizes, each within 16.5 m nose to tail; the traffic has its semis after its cars.
//  B. a straight: a semi gets up to speed (<= 11 m/s), the trailer runs straight behind (|articulation| < 1.5 deg),
//     the kingpin-to-axle distance stays the trailer's wheelbase.
//  C. the tightest bends on the network: the trailer articulates (> 4 deg) but never jackknifes (< 70 deg), its axles stay
//     on the road (<= 5.5 m from the centreline), the wheelbase holds, speed under the car profile x 0.88.
//  D. a car behind a stopped semi stops short of its TAIL (car front >= 2 m off the trailer's back), not inside it.
//  E. the car then pulls out round the stopped semi, never touches it, and moves back in only ahead of the tractor.
//  F. at the road's end a semi never U-turns: it waits; with you far off it has gone (placed elsewhere).
//  G. solid: a sled driven into the trailer's side at 8 m/s is stopped outside it (a bump counted, a "lorry" toast);
//     a walker put inside the trailer is pushed out.
//  H. meshes: each size's tractor + trailer groups visible on the road, 2 wheels an axle; no tick error.
// Stills: each size side-on by day, a bend from above, the night front.
import { boot, ev, sleep, done, shot } from "../lib.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };
const J = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const clock = () => ev("gameClock");
const NOSTILLS = !!process.env.NOSTILLS;
let camHooked = false;
async function cam(expr) {   // expr: JS returning [px,py,pz, lx,ly,lz]
  if (!camHooked) { await ev(`(() => { const _r = renderer.render.bind(renderer); renderer.render = (s, c) => { if (window.camOv) window.camOv(c); _r(s, c); }; return true; })()`); camHooked = true; }
  await ev(`(() => { window.camOv = c => { const v = (${expr}); c.position.set(v[0], v[1], v[2]); c.lookAt(v[3], v[4], v[5]); }; return true; })()`);
  await sleep(350);
}
const camOff = () => ev("window.camOv = null; true");
async function waitGame(s, fn) { const t0 = await clock(); while ((await clock()) - t0 < s) { if (fn && await fn()) return true; await sleep(120); } return false; }

await boot();
await ev(`tutSkip(); crashCancel(); FOOT.on = false; WX.at = () => 0; GS.storm = 0; GS.hour = 34; true`); await sleep(1000);

// ---- A
const A = await J(`(() => { const S = window.TLXS, T = TLXT; return { ready: T.ready, err: T.err, n: T.n, ns: T.nSemi, cars: T.cars.length,
  semiIdx: T.cars.map((c, i) => c.semi ? i : -1).filter(i => i >= 0), types: S ? Object.keys(S.TYPES).map(k => ({ k, len: +S.TYPES[k].len.toFixed(2) })) : null }; })()`);
console.log("A:", JSON.stringify(A));
ok(A.ready && !A.err && A.types && A.types.length >= 3, "A: three semi sizes (" + (A.types || []).map(t => t.k + " " + t.len + " m").join(", ") + ")");
ok(A.types && A.types.every(t => t.len <= 16.51 && t.len > 13), "A: every size within 16.5 m nose to tail");
ok(A.ns >= 1 && A.semiIdx[0] === A.n && A.cars === A.n + A.ns, "A: " + A.ns + " semi(s) after " + A.n + " cars");
const SI = A.semiIdx[0];

// a long straight (300 m at full car speed both ways), as x3_pass
const spot = await J(`(() => { const rs = TLXT.routes.slice().sort((a, b) => b.len - a.len);
  for (const r of rs) { for (let s = r.s0 + 200; s < r.s1 - 400; s += 20) { let good = true; for (let u = s; u < s + 300; u += 5) { let k = 0; while (k < r.cum.length - 2 && r.cum[k + 1] <= u) k++; if (r.vP[k] < 12.4 || r.vM[k] < 12.4 || r.street[k]) { good = false; break; } } if (good) return { id: r.id, s, s1: r.s1, s0: r.s0 }; } }
  return null; })()`);
ok(!!spot, "found a 300 m straight");
const RID = spot.id, S0 = spot.s;
const away = (rid, s) => `(() => { crashCancel(); FOOT.on = false; const p = TLXT.lanePt("${rid}", ${s}, 1); P.x = p.cx + 90; P.z = p.cz + 90; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`;
const info = `TLXT.semiInfo(${SI})`;
// stills: the world streams round the player, so park the sled 30 m off the far side of the semi (out of frame)
const near = `(() => { const q = TLXT.semiInfo(${SI}), a = q.yaw - Math.PI / 2; crashCancel(); FOOT.on = false; P.x = q.x + Math.sin(a) * 30; P.z = q.z + Math.cos(a) * 30; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); return true; })()`;

// ---- B: straight
await ev(away(RID, S0 - 300));
await ev(`(() => { TLXT.place("${RID}", ${S0} - 200, 1); TLXT.cars[0].on = false; TLXT.place("${RID}", ${S0}, 1, ${SI}, "haul"); return true; })()`);
let Bv = 0, BdL = 0;
await waitGame(16, async () => { const q = await J(info); Bv = Math.max(Bv, q.v); BdL = Math.max(BdL, Math.abs(Math.hypot(q.hx - q.ax, q.hz - q.az) - q.L)); return false; });
const B = await J(info);
console.log("B:", JSON.stringify({ v: B.v, Bv, art: B.art, BdL }));
ok(Bv > 8 && Bv <= 11.05, "B: up to " + Bv.toFixed(2) + " m/s on the straight (<= 11)");
ok(Math.abs(B.art) * 180 / Math.PI < 1.5, "B: trailer straight behind on the straight (" + (B.art * 180 / Math.PI).toFixed(2) + " deg)");
ok(BdL < 0.01, "B: kingpin to trailer axles stays the wheelbase (off by " + BdL.toFixed(4) + " m)");
if (!NOSTILLS) {
  for (const ty of ["dist", "haul", "tank"]) {
    await ev(`(() => { const c = TLXT.place("${RID}", ${S0} + 60, 1, ${SI}, "${ty}"); c.hold = 1e9; return true; })()`); await waitGame(0.5);
    await ev(near); await waitGame(0.6);
    await cam(`(() => { const q = TLXT.semiInfo(${SI}), mx = (q.x + q.ax) / 2, mz = (q.z + q.az) / 2, a = q.yaw + Math.PI / 2, y = surf(mx, mz); return [mx + Math.sin(a) * 17, y + 3.2, mz + Math.cos(a) * 17, mx, y + 1.8, mz]; })()`);
    await shot("x3s_side_" + ty);
    await cam(`(() => { const q = TLXT.semiInfo(${SI}), a = q.yaw + 0.7, y = surf(q.x, q.z); return [q.x + Math.sin(a) * 10, y + 2.6, q.z + Math.cos(a) * 10, q.x - Math.sin(q.yaw) * 3, y + 1.8, q.z - Math.cos(q.yaw) * 3]; })()`);
    await shot("x3s_front_" + ty);
  }
  await camOff();
}

// ---- C: the tightest bends
const bend = await J(`(() => { let best = null; for (const r of TLXT.routes) { for (let i = 3; i < r.pts.length - 3; i++) { if (r.street[i] || r.cum[i] - r.s0 < 150 || r.s1 - r.cum[i] < 150) continue; const R = TLXR.turnR(r.pts, i); if (!best || R < best.R) best = { id: r.id, s: r.cum[i], R, i }; } } return best; })()`);
console.log("bend:", JSON.stringify(bend));
await ev(away(bend.id, bend.s));
await ev(`(() => { TLXT.place("${bend.id}", ${bend.s} - 110, 1); TLXT.cars[0].on = false; TLXT.place("${bend.id}", ${bend.s} - 110, 1, ${SI}, "haul"); return true; })()`);
let Cart = 0, Coff = 0, CdL = 0, Cvx = 0, CshotDone = false;
const CJ = `(() => { const q = TLXT.semiInfo(${SI}), r = TLXT.routes.find(x => x.id === "${bend.id}"); let m = 1e9; for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1; let t = ((q.ax - a[0]) * dx + (q.az - a[1]) * dz) / L2; t = Math.max(0, Math.min(1, t)); m = Math.min(m, Math.hypot(q.ax - a[0] - dx * t, q.az - a[1] - dz * t)); } const c = TLXT.cars[${SI}]; let k = 0; while (k < r.cum.length - 2 && r.cum[k + 1] <= c.s) k++; return { art: q.art, off: m, dL: Math.abs(Math.hypot(q.hx - q.ax, q.hz - q.az) - q.L), v: q.v, prof: Math.min(r.vP[k], r.vP[k + 1]), s: c.s }; })()`;
await waitGame(40, async () => { const q = await J(CJ); Cart = Math.max(Cart, Math.abs(q.art)); Coff = Math.max(Coff, q.off); CdL = Math.max(CdL, q.dL); Cvx = Math.max(Cvx, q.v - q.prof * 0.88);
  if (!NOSTILLS && !CshotDone && Math.abs(q.art) > 0.12) { CshotDone = true; await ev(near); await cam(`(() => { const q = TLXT.semiInfo(${SI}), mx = (q.x + q.ax) / 2, mz = (q.z + q.az) / 2, y = surf(mx, mz); return [mx + 14, y + 22, mz + 14, mx, y, mz]; })()`); await shot("x3s_bend"); await camOff(); }
  return q.s > bend.s + 80; });
console.log("C:", JSON.stringify({ R: bend.R, Cart: Cart * 180 / Math.PI, Coff, CdL, Cvx }));
ok(Cart * 180 / Math.PI > 4 && Cart * 180 / Math.PI < 70, "C: on a " + bend.R.toFixed(1) + " m bend the trailer swings " + (Cart * 180 / Math.PI).toFixed(1) + " deg (4..70)");
ok(Coff <= 5.5, "C: trailer axles at most " + Coff.toFixed(2) + " m off the centreline (<= 5.5)");
ok(CdL < 0.01 && Cvx < 1.0, "C: wheelbase holds (" + CdL.toFixed(4) + " m), speed within 0.88 x the car profile + a frame of braking (over by " + Cvx.toFixed(2) + ")");

// ---- D + E: a car comes up behind a stopped semi, then passes it
await ev(away(RID, S0 - 300));
await ev(`(() => { TLXT.place("${RID}", ${S0}, 1); const s = TLXT.place("${RID}", ${S0} + 90, 1, ${SI}, "haul"); s.hold = 1e9; window.__h0 = TLXT.hits; return true; })()`);
let Dstop = null, Emin = 1e9, Elane = 9, Ein = null;
const Edone = await waitGame(70, async () => {
  const q = await J(`(() => { const c = TLXT.cars[0], s = TLXT.semiInfo(${SI}), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), tail = s.pts[2], tx = tail[0] - Math.sin(s.tyaw) * 2.15, tz = tail[1] - Math.cos(s.tyaw) * 2.15;
    let m = 1e9; for (const u of [-1.45, 0, 1.45]) for (const k of s.circ) m = Math.min(m, Math.hypot(c.x + fx * u - k[0], c.z + fz * u - k[1]) - k[2] - 0.95);
    return { v: c.v, why: c.why, gapTail: (tx - c.x) * fx + (tz - c.z) * fz - 2.15, m, lane: c.lane, pass: c.pass ? c.pass.st : null, ahead: (c.x - s.x) * Math.sin(s.yaw) + (c.z - s.z) * Math.cos(s.yaw), t: gameClock }; })()`);
  if (!Dstop && q.v < 0.3 && q.why === "car" && q.gapTail < 15) Dstop = q;
  if (Dstop) { Emin = Math.min(Emin, q.m); Elane = Math.min(Elane, q.lane); }
  if (Dstop && !Ein && q.pass === "back") Ein = q;
  return Dstop && !q.pass && q.lane > 1.5 && q.ahead > 8; });
const Eh = await J(`TLXT.hits - window.__h0`);
console.log("D/E:", JSON.stringify({ Dstop, Emin, Elane, Ein, Edone, Eh }));
ok(!!Dstop && Dstop.gapTail >= 2 && Dstop.gapTail < 8, "D: a car stopped " + (Dstop ? Dstop.gapTail.toFixed(2) : "-") + " m short of the semi's tail (2..8)");
ok(Edone && Elane < -1.4, "E: it pulled out round the semi (lane " + Elane.toFixed(2) + ") and back in ahead of it");
ok(Emin > 0.2 && Eh === 0, "E: never touched it (closest " + Emin.toFixed(2) + " m between bodies, bumps " + Eh + ")");
ok(!!Ein && Ein.ahead > 2.5, "E: moved back in only past the tractor's nose (" + (Ein ? Ein.ahead.toFixed(1) : "-") + " m ahead of its middle)");

// ---- F: the road's end
const F0 = await J(`(() => { const r = TLXT.routes.find(q => q.id === "${RID}"); TLXT.place("${RID}", r.s1 - 70, 1); TLXT.cars[0].on = false; TLXT.place("${RID}", r.s1 - 70, 1, ${SI}, "dist"); const c = TLXT.cars[${SI}]; return { x: c.x, z: c.z, s1: r.s1 }; })()`);
await ev(`(() => { const c = TLXT.cars[${SI}]; P.x = c.x + 60; P.z = c.z + 60; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; return true; })()`);
let Fturn = false;
await waitGame(30, async () => { const q = await J(`({ st: TLXT.cars[${SI}].st, w: TLXT.cars[${SI}].waiting })`); if (q.st === "turn") Fturn = true; return false; });
const F1 = await J(`({ st: TLXT.cars[${SI}].st, w: !!TLXT.cars[${SI}].waiting, why: TLXT.cars[${SI}].why, v: TLXT.cars[${SI}].v })`);
await ev(`(() => { const c = TLXT.cars[${SI}]; let q = null; for (const r of TLXT.routes) { for (const p of r.pts) { const d = Math.hypot(p[0] - c.x, p[1] - c.z); if (d > 450 && d < 1200) { q = p; break; } } if (q) break; } P.x = q[0]; P.z = q[1]; P.y = surf(P.x, P.z) + 0.3; P.vx = P.vz = 0; recenter(P.x, P.z, true); TLXT.hold = false; return true; })()`);   // on a road (land) 450+ m off, not into the sea
await waitGame(3);
const F2 = await J(`(() => { const c = TLXT.cars[${SI}]; return { on: c.on, w: !!c.waiting, v: c.v, d: Math.hypot(c.x - ${F0.x}, c.z - ${F0.z}) }; })()`);
await ev(`TLXT.hold = true; true`);
console.log("F:", JSON.stringify({ F1, F2, Fturn }));
ok(!Fturn && F1.w && F1.why === "end" && F1.v < 0.3, "F: at the road's end the semi waits (no U-turn)");
ok(!F2.on || (!F2.w && F2.v > 1), "F: with you 450+ m off it has gone (" + (F2.on ? "turned up again " + F2.d.toFixed(0) + " m from where it waited, driving at " + F2.v.toFixed(1) + " m/s" : "off the road") + ")");

// ---- G: solid
await ev(away(RID, S0 - 300));
await ev(`(() => { TLXT.place("${RID}", ${S0} + 90, 1); TLXT.cars[0].on = false; const s = TLXT.place("${RID}", ${S0} + 90, 1, ${SI}, "haul"); s.hold = 1e9; return true; })()`);
await waitGame(0.4);
await ev(`(() => { const q = TLXT.semiInfo(${SI}), tl = q.pts[2], nx = -Math.sin(q.tyaw), nz = -Math.cos(q.tyaw); window.__gn = [nx, nz]; P.x = tl[0] + nx * 16; P.z = tl[1] + nz * 16; P.y = surf(P.x, P.z) + 0.2; P.yaw = Math.atan2(-nx, -nz); P.vx = -nx * 8; P.vz = -nz * 8; window.__h1 = TLXT.hits; return true; })()`);
let Gmin = 1e9;
// driven at it: 8 m/s held until it touches (powder off the road slows a coasting sled), as x3_traffic's bump
await waitGame(3, async () => { await ev(`(() => { if (TLXT.hits === window.__h1) { crashCancel(); FOOT.on = false; P.vx = -window.__gn[0] * 8; P.vz = -window.__gn[1] * 8; } return true; })()`); return await J(`TLXT.hits > window.__h1`); });
await waitGame(1.2, async () => { const m = await J(`(() => { const q = TLXT.semiInfo(${SI}); let m = 1e9; for (const k of q.circ) for (const off of [1.15, -0.7]) m = Math.min(m, Math.hypot(P.x + Math.sin(P.yaw) * off - k[0], P.z + Math.cos(P.yaw) * off - k[1]) - k[2]); return m; })()`); Gmin = m; return false; });
const G1 = await J(`({ hits: TLXT.hits - window.__h1, toast: Array.from(document.querySelectorAll("#toasts > *")).map(e => e.textContent).concat((typeof TOASTQ !== "undefined" ? TOASTQ : []).map(t => t.msg || t.text || String(t))).join(" | ") })`);
console.log("G:", JSON.stringify({ Gmin, G1, st: await J(`({ v: Math.hypot(P.vx, P.vz), crash: CRASH.on, foot: FOOT.on, bog: typeof BOG !== "undefined" ? !!BOG.on : null })`) }));
ok(Gmin > 0.45, "G: the sled driven into the tail stopped outside the trailer (closest at the end " + Gmin.toFixed(2) + " m from a body circle to the sled's)");
ok(G1.hits >= 1 && /lorry/.test(G1.toast), "G: a bump counted with a lorry toast (" + G1.hits + ")");
await ev(`(() => { const q = TLXT.semiInfo(${SI}), mid = q.pts[1]; FOOT.on = true; FOOT.x = mid[0]; FOOT.z = mid[1] + 0.3; FOOT.y = surf(FOOT.x, FOOT.z); return true; })()`);
await waitGame(0.6);
const G2 = await J(`(() => { const q = TLXT.semiInfo(${SI}); let m = 1e9; for (const k of q.circ) m = Math.min(m, Math.hypot(FOOT.x - k[0], FOOT.z - k[1]) - k[2]); return m; })()`);
ok(G2 > 0.3, "G: a walker inside the trailer is pushed out (" + G2.toFixed(2) + " m clear)");
await ev(`FOOT.on = false; true`);

// ---- H: meshes
const H = await J(`(() => { const c = TLXT.cars[${SI}], o = c.ms && c.ms[c.semiK]; const ax = c.T.tr.axles.length + c.T.tl.axles.length; let other = 0; for (const k in c.ms || {}) if (k !== c.semiK && (c.ms[k].tractor.visible || c.ms[k].trailer.visible)) other++; return { vis: !!(o && o.tractor.visible && o.trailer.visible), wheels: TLXT.swheels.count, ax, other, built: Object.keys(c.ms || {}).length, err: TLXT.tickErr || null }; })()`);
console.log("H:", JSON.stringify(H));
ok(H.vis && H.other === 0, "H: the semi's tractor and trailer show, the other sizes' are hidden (" + H.built + " sizes built)");
ok(H.wheels >= 2 * H.ax, "H: " + H.wheels + " semi wheels for " + H.ax + " axles");
const dc = await J(`(() => { renderer.render(scene, camera); const on = renderer.info.render.calls; TLXT.group.visible = false; renderer.render(scene, camera); const off = renderer.info.render.calls; TLXT.group.visible = true; return { on, off }; })()`);
console.log("draw calls (traffic incl. semi):", dc.on - dc.off);
if (!NOSTILLS) {
  await ev(`(() => { GS.hour = 45; const s = TLXT.place("${RID}", ${S0} + 90, 1, ${SI}, "tank"); s.hold = 1e9; return true; })()`); await waitGame(1.5);
  await ev(near); await waitGame(0.6);
  await cam(`(() => { const q = TLXT.semiInfo(${SI}), y = surf(q.x, q.z), fx = Math.sin(q.yaw), fz = Math.cos(q.yaw); return [q.x + fx * 16 + fz * 4, y + 2.4, q.z + fz * 16 - fx * 4, q.x, y + 1.4, q.z]; })()`);
  await shot("x3s_night_front"); await camOff();
}
const tErr = await J(`TLXT.tickErr || TLXT.err || null`);
ok(!tErr, "H: no tick error (" + tErr + ")");
console.log(fails ? `${fails} FAILED` : "all ok");
await done(fails ? 1 : 0);
