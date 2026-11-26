// Tracklayer: the reels' scene scripts (goal G7, H2b). Each type of reel is a row in TLXRL.types:
//   weight(c)      how well this reel fits a person at an hour (c = tlx-gram's context: interests, hour, storm, coast, lookout, lake, slope...)
//   fit(p)         may this person post it (the bus picks one by interests)
//   anchor(c, rng) the place: { x, z, a, k, h, s, place } or null. A viewpoint is checked by height sampling (no rendering) and re-picked a few times
//   plan(rec, E)   the scene script: { dur, need: { sled, walker, deer }, hour, storm, setup(E), frame(t, E), post(g, t, w, h, E) } -- the camera and every actor are closed-form functions of clip time t
//   cap(c, vars, rng) the caption in the poster's own words
// The recipe stored for a reel is only (type, seed, x, z, a, k, hour, storm); plan() rebuilds everything from it, so a reel is the same after a reload.
(() => {
"use strict";
const R = window.TLXRL; if (!R) return;
const { mulb, clamp, lerp, ease } = R, TAU = Math.PI * 2;
const H = () => R.H, A = () => R.A, W = () => R.A.world;
const surf = (x, z) => W().surf(x, z), yawOf = (dx, dz) => Math.atan2(dx, dz);                                // a game yaw: forward = (sin, cos)
const landOk = (x, z) => !W().isSea(x, z) && !W().isWater(x, z) && W().groundAt(x, z) > 1;
const openOk = (x, z, r) => landOk(x, z) && !W().obNear(x, z, r === undefined ? 2.2 : r);
const sunEl = h => A().sunEl(((h % 24) + 24) % 24);
const has = (c, k) => !!c.int[k];
// the skyline's elevation angle (rad) from (cx, cy, cz) along trig azimuth az, and how far away it is
function skyAng(cx, cz, cy, az, out) {
  const dx = Math.cos(az), dz = Math.sin(az); let mx = -9, hd = 0;
  for (let d = 20; d <= 7000; d *= 1.18) { const e = (surf(cx + dx * d, cz + dz * d) - cy) / d; if (e > mx) { mx = e; hd = d; } }
  if (out) out.d = hd; return Math.atan(mx);
}
function skyTable(cx, cz, cy, n) {
  const T = new Float32Array(n), D = new Float32Array(n), o = { d: 0 }; for (let i = 0; i < n; i++) { T[i] = skyAng(cx, cz, cy, i / n * TAU, o); D[i] = o.d; }
  const S = new Float32Array(n); for (let i = 0; i < n; i++) { let s = 0; for (let k = -2; k <= 2; k++) s += T[(i + k + n) % n]; S[i] = s / 5; } return { T: S, D, n };
}
const tabAt = (tb, az) => { const u = (((az / TAU) % 1) + 1) % 1 * tb.n, i = Math.floor(u), f = u - i; return tb.T[i % tb.n] * (1 - f) + tb.T[(i + 1) % tb.n] * f; };
const dirX = a => Math.cos(a), dirZ = a => Math.sin(a);
const person = (id, i) => { const P = window.TLXN; let p = id && id !== "you" ? P.person(id) : null; return p; };
const ZOOM = { t: 0 };
// a path that a closure answers: the position, heading and speed of an actor at clip time t (written into out, no allocation)
const shake = (t, k) => [Math.sin(t * 9.1) * 0.012 * k, Math.sin(t * 7.3 + 1) * 0.01 * k];

/* ---------------- 1. summit pan ---------------- */
R.types.summit = {
  chip: "SUMMIT", dur: 7.5, need: { sled: 1, walker: 1 }, pk: "summit", pspeed: 6,
  weight: c => c.lookout && c.el > -7 && c.el < 9 && c.storm < 0.5 ? (c.int.photos ? 3 : 0) + (c.int.sled ? 1.5 : 0) + (c.int.ski ? 1 : 0) + (c.int.birds ? 0.8 : 0) + 0.3 : 0,
  fit: p => p.interests.includes("photos") || p.interests.includes("sled") || p.interests.includes("ski"),
  anchor(c, rng) {
    const L = c.lookout.L, sp = H().openSpot(L.x, L.z, 2.5); if (!sp) return null; const cx = sp[0], cz = sp[1], cy = surf(cx, cz) + 1.7, tb = skyTable(cx, cz, cy, 64);
    let best = null, bs = -1; const A0 = rng() * TAU;
    for (let k = 0; k < 24; k++) {
      const a0 = A0 + k * TAU / 24, a1 = a0 + 1.35, pa = a1 + 0.0, px = cx + dirX(pa) * 3.7, pz = cz + dirZ(pa) * 3.7, sx = cx + dirX(a1 + 0.2) * 6.2, sz = cz + dirZ(a1 + 0.2) * 6.2;
      if (!openOk(px, pz, 0.8) || !openOk(sx, sz, 1.3)) continue; if (Math.abs(surf(px, pz) - surf(cx, cz)) > 0.9) continue;
      let mn = 9, mx = -9, near = false, sea = 0; for (let i = 0; i <= 12; i++) { const az = a0 + 1.35 * i / 12, v = tabAt(tb, az); mn = Math.min(mn, v); mx = Math.max(mx, v); const u = Math.floor((((az / TAU) % 1) + 1) % 1 * tb.n) % tb.n; if (tb.D[u] < 140 && v > 0.13) near = true; if (W().isSea(cx + dirX(az) * 300, cz + dirZ(az) * 300)) sea++; }
      if (near) continue; const sc = (mx - mn) * 3 + (mx < 0.12 ? 0.3 : 0) + sea * 0.05 + (mn > -0.45 ? 0.2 : -1);
      if (sc > bs) { bs = sc; best = { a0, sc }; }
    }
    if (!best || bs < 0.2) return null;
    return { x: cx, z: cz, a: best.a0, k: String(c.lookout.L.id || ""), place: c.lookout.L.name, h: c.H };
  },
  plan(rec, E) {
    const cx = rec.x, cz = rec.z, cy = surf(cx, cz) + 1.7, tb = skyTable(cx, cz, cy, 64), a0 = rec.a, arc = 1.35, a1 = a0 + arc, fov = 64, th = Math.tan(fov * Math.PI / 360), rng = mulb(rec.sd);
    const px = cx + dirX(a1 - 0.07) * 3.7, pz = cz + dirZ(a1 - 0.07) * 3.7, sx = cx + dirX(a1 + 0.2) * 6.2, sz = cz + dirZ(a1 + 0.2) * 6.2, syaw = yawOf(dirX(a1 + 2.6), dirZ(a1 + 2.6)), pyaw = yawOf(cx - px, cz - pz);
    const off = A().sunEl; const dur = 7.5; const row = 0.56;
    return {
      dur, need: { sled: 1, walker: 1 }, hour: rec.h, storm: rec.s, vig: 0.3,
      frame(t, E) {
        const u = ease(t / dur), az = a0 + arc * u, sh = shake(t, 1), pitchH = tabAt(tb, az) + Math.atan((2 * row - 1) * th), py = surf(px, pz) + 1.05;
        const pitchP = Math.atan2(py - cy, 3.7) + 0.02, k = ease((u - 0.68) / 0.3), pitch = lerp(pitchH, pitchP, k);
        const ex = cx + dirX(az) * 1, ez = cz + dirZ(az) * 1, tx = cx + dirX(az) * 50, tz = cz + dirZ(az) * 50, ty = cy + Math.tan(pitch) * 50;
        E.look(cx, cy + sh[1], cz, tx + sh[0] * 50, ty, tz, fov, 0);
        E.placeSled(E.sleds[0], sx, sz, syaw, 0, 0, false, { noRider: true }); E.sledLights(E.sleds[0], false, false, 0);
        const w = E.walkers[0]; E.walk(w, px, pz, pyaw); const wv = ease((t / dur - 0.84) / 0.08) * (1 - ease((t / dur - 0.96) / 0.04)), U = w.U;
        if (wv > 0.01) { U.arms[0].rotation.set(-2.4 - 0.1 * Math.sin(t * 7), 0, 0.3 + 0.2 * Math.sin(t * 7)); U.arms[0].rotation.x = lerp(U.arms[0].rotation.x, 0, 1 - wv); U.fore[0].rotation.x = -0.4 * wv; U.head.rotation.y = 0; }
      }
    };
  },
  cap: (c, v, r) => { const L = v.look; return r() < 0.5 ? [`Slow turn on top of ${L}, then the sled and me. ${v.w}`, `${L} at ${v.hr}. Panning is harder than it looks.`, `All the way round on ${L}. The sled waited.`][Math.floor(r() * 3)] : [`${L}, ${v.hr}. Camera on a rock, me in the corner.`, `Climbed ${L} for this. Worth it.`, `The whole view from ${L}, then a wave.`][Math.floor(r() * 3)]; }
};

/* ---------------- 5. storm ride ---------------- */
function pathPos(P, i, t, o) {                                                                           // the i-th rider's place at clip time t: along a heading with a lazy weave
  const f = P.fx, g = P.fz, l = P.lx, m = P.lz, v = P.v[i], s = P.gap[i] + v * t, w = P.lat[i] + P.amp[i] * Math.sin(P.fr[i] * t + P.ph[i]), dw = P.amp[i] * P.fr[i] * Math.cos(P.fr[i] * t + P.ph[i]);
  o.x = P.x0 + f * s + l * w; o.z = P.z0 + g * s + m * w; o.yaw = P.yaw + Math.atan2(dw, v); o.speed = Math.hypot(v, dw); o.turn = -P.amp[i] * P.fr[i] * P.fr[i] * Math.sin(P.fr[i] * t + P.ph[i]) / (v * 4); return o;
}
function roostSpec(P, i, pf, size) {                                                                      // snow thrown up behind a sled: closed form from its path
  const o = { x: 0, z: 0, yaw: 0, speed: 0, turn: 0 };
  return { n: 90, life: 1.1, size0: size || 0.3, size1: (size || 0.3) * 3.2, a: 0.5, g: 6, drag: 1.7, spread: 1.6, fn(te, q) {
    pf(P, i, te, o); const fx = Math.sin(o.yaw), fz = Math.cos(o.yaw); q.on = clamp((o.speed - 2) / 6, 0, 1); q.x = o.x - fx * 1.7; q.z = o.z - fz * 1.7; q.y = surf(q.x, q.z) + 0.3;
    q.vx = -fx * (o.speed * 0.28 + 1.5) + fz * 0.0; q.vz = -fz * (o.speed * 0.28 + 1.5); q.vy = 2.2 + o.speed * 0.12;
  } };
}
R.roostSpec = roostSpec;
R.types.stormride = {
  chip: "STORM RIDE", dur: 7.5, need: { sled: 4 }, pk: "stormride", pspeed: 30, notyet: true,
  weight: c => (c.int.sled || c.int.racing) && c.storm >= 0.45 && c.snow ? 3.5 : 0,
  fit: p => p.interests.includes("sled") || p.interests.includes("racing"),
  anchor(c, rng) {
    const v = c.vil; for (let k = 0; k < 60; k++) {
      const a = rng() * TAU, r = 160 + rng() * 1300, x = v.x + Math.cos(a) * r, z = v.z + Math.sin(a) * r, yaw = rng() * TAU; let ok = true;
      for (let d = -34; d <= 140 && ok; d += 5) { const px = x + Math.sin(yaw) * d, pz = z + Math.cos(yaw) * d; if (!openOk(px, pz, 2.6) || W().slopeAt(px, pz, 6) > 0.14) ok = false; }
      if (ok) return { x, z, a: yaw, s: Math.max(c.storm, 0.85), place: v.name, h: c.H };
    }
    return null;
  },
  plan(rec, E) {
    const r = mulb(rec.sd), yaw = rec.a, v = 11 + r() * 2.5;
    const PP = { x0: rec.x, z0: rec.z, yaw, fx: Math.sin(yaw), fz: Math.cos(yaw), lx: Math.cos(yaw), lz: -Math.sin(yaw), v: [v, v + 0.3, v - 0.2, v + 0.1], gap: [0, 6.5 + r() * 2, 12.5 + r() * 2, -9 - r() * 1.5], lat: [0, -1.9, 1.7, 3.2], amp: [1.1, 1.0, 1.3, 1.0], fr: [0.7, 0.8, 0.65, 0.75], ph: [r() * 6, r() * 6, r() * 6, r() * 6] };
    const night = clamp(E.nightAt(rec.h) * 0.8 + 0.28, 0, 1), dur = 7.5, o = { x: 0, z: 0, yaw: 0, speed: 0, turn: 0 }, o3 = { x: 0, z: 0, yaw: 0, speed: 0, turn: 0 }, wind = [-7, -1.2, 3.5];
    const specs = [1, 2, 3, 0].map(i => roostSpec(PP, i, pathPos, 0.3));
    return {
      dur, need: { sled: 4 }, hour: rec.h, storm: Math.max(rec.s, 0.88), fog: 0.05, vig: 0.45,
      frame(t, E) {
        for (let i = 0; i < 4; i++) { pathPos(PP, i, t, o); const a = E.sleds[i]; E.placeSled(a, o.x, o.z, o.yaw, o.speed, o.turn, true, { noRider: i === 0, lean: 0.1, glance: i === 3 ? 0 : (i === 1 && t > 2.2 && t < 3.6 ? 0.5 : 0) }); E.sledLights(a, true, i !== 3, night, i === 0); }
        for (const s of specs) E.emitter(s);
        const a = E.sleds[0]; pathPos(PP, 0, t, o);
        const g = ease((t - 3.9) / 0.7) * (1 - ease((t - 5.3) / 0.8)); pathPos(PP, 3, t, o3); let gl = Math.atan2(o3.x - o.x, o3.z - o.z) - o.yaw; gl = (((gl % TAU) + TAU) % TAU); gl *= g;
        a.g.updateMatrixWorld(true); E.v2.set(0, 1.64, -0.12); a.g.localToWorld(E.v2); const ex = E.v2.x, ey = E.v2.y, ez = E.v2.z, hd = o.yaw + gl, sh = shake(t, 1.6);
        E.look(ex, ey + sh[1], ez, ex + Math.sin(hd) * 10 + sh[0] * 10, ey - 0.9 + g * 0.5, ez + Math.cos(hd) * 10, 68, 0.03 * Math.sin(t * 1.3) + g * 0.05);
        E.flakes(wind[0], wind[1], wind[2], 0.85, 0.055, [16, 9, 26], 7);
      },
      post(g, t, w, h) {
        g.fillStyle = "rgba(226,234,244,.22)"; g.fillRect(0, 0, w, h);
        g.strokeStyle = "rgba(255,255,255,.38)"; g.lineWidth = 1.1; g.beginPath(); const rr = mulb(Math.floor(t * 20) + 5);
        for (let i = 0; i < 40; i++) { const x = rr() * w, y = rr() * h, L = 14 + rr() * 26; g.moveTo(x, y); g.lineTo(x - L, y + L * 0.28); } g.stroke();
      }
    };
  },
  cap: (c, v, r) => [`Out with the lads in ${v.wst}. Two lamps and a prayer. ${v.w}`, `Whiteout ride: tail lamps ahead, headlights behind, nothing else.`, `Do not do this at home. I did it near ${v.place}.`, `Stayed on the lamp in front. Do not look at the speedo.`][Math.floor(r() * 4)]
};

/* ---------------- 7. night ski ---------------- */
R.types.nightski = {
  chip: "NIGHT SKI", dur: 7, need: {}, pk: "nightski", pspeed: 10, tr: "lys",
  weight: c => window.TLXSK && TLXSK.ready && c.el < -6 && c.storm < 0.5 && c.snow ? (c.int.ski ? 4 : 0.5) : 0,
  fit: p => p.interests.includes("ski"),
  anchor(c, rng) { const t = TLXSK.list.find(q => q.id === "lys"); if (!t) return null; const m = t.mid[Math.floor(t.mid.length / 2)] || { x: 0, z: 0 }; return { x: m.x, z: m.z, a: 0, k: "lys", place: t.name, h: c.H, s: Math.min(c.storm, 0.2) }; },
  plan(rec, E) {
    const X = window.TLXSK; if (!X || !X.ready) return null; const rng = mulb(rec.sd), pid = rec.who && rec.who !== "you" ? rec.who : ((window.TLXN.people.find(p => p.interests.includes("ski")) || {}).id);
    const run = X.shotRun({ trail: rec.k || "lys", p: pid, lamp: true }); if (!run) return null;
    const tk = run.runs.filter(q => q.gait === "tuck" && q.tau1 - q.tau0 >= 2.2).sort((a, b) => (b.tau1 - b.tau0) - (a.tau1 - a.tau0));
    const pickR = tk.length ? tk[Math.floor(rng() * Math.min(2, tk.length))] : run.runs.slice().sort((a, b) => (b.tau1 - b.tau0) - (a.tau1 - a.tau0))[0]; if (!pickR) return null;
    const dur = 7, t0 = Math.max(0, Math.min(pickR.tau0 - 2.4, run.T - dur - 0.5)), night = Math.max(0.6, E.nightAt(rec.h));
    const hist = { n: 80, t: new Float32Array(80), x: new Float32Array(80), z: new Float32Array(80), yaw: new Float32Array(80), v: new Float32Array(80), i: 0, last: -9 };
    const spray = { n: 60, life: 0.9, size0: 0.14, size1: 0.5, a: 0.4, g: 5, drag: 2.2, spread: 0.9, fn(te, q) { let best = -1, bd = 0.07; for (let k = 0; k < hist.n; k++) { const d = Math.abs(hist.t[k] - te); if (d < bd) { bd = d; best = k; } } if (best < 0) { q.on = 0; return; } const fx = Math.sin(hist.yaw[best]), fz = Math.cos(hist.yaw[best]); q.on = clamp((hist.v[best] - 3) / 7, 0, 1); q.x = hist.x[best] - fx * 0.5; q.z = hist.z[best] - fz * 0.5; q.y = surf(q.x, q.z) + 0.1; q.vx = -fx * 0.8; q.vz = -fz * 0.8; q.vy = 1.2; } };
    let px = 0, pz = 0, pt = -9;
    return {
      dur, need: {}, hour: rec.h, storm: rec.s || 0, vig: 0.42, setup() { hist.i = 0; hist.t.fill(-9); },
      frame(t, E) {
        const tau = t0 + t; const P1 = X.shotRunAt(Math.max(0, tau - 0.28)); const ly = P1.yaw; const P = X.shotRunAt(tau); E.skierOn = true;
        const v = t > 0 && pt >= 0 && t >= pt ? Math.hypot(P.x - px, P.z - pz) / Math.max(1e-3, t - pt) : 6; px = P.x; pz = P.z; pt = t;
        const k = hist.i++ % hist.n; hist.t[k] = t; hist.x[k] = P.x; hist.z[k] = P.z; hist.yaw[k] = P.yaw; hist.v[k] = v;
        const fx = Math.sin(ly), fz = Math.cos(ly), sx = P.x - fx * 3.3 + fz * 0.55, sz = P.z - fz * 3.3 - fx * 0.55, sy = surf(sx, sz) + 1.5, ty = surf(P.x, P.z) + 1.0, sh = shake(t, 0.8);
        E.look(sx, sy + sh[1], sz, P.x + fx * 1.5, ty + 0.1, P.z + fz * 1.5, 66, 0.015 * Math.sin(t * 0.8));
        E.emitter(spray); E.flakes(-0.6, -0.9, 0.4, 0.55, 0.03, [14, 8, 16], 5);
      },
      post(g, t, w, h) { g.fillStyle = "rgba(255,200,120,.05)"; g.fillRect(0, 0, w, h); }
    };
  },
  cap: (c, v, r) => [`Lysløypa after dark, camera on my chest. The lamps do the rest.`, `Tuck on the long downhill under the lamps. Do not tell my knees.`, `Night run on Lysløypa. The track is silk.`, `Headlamp and the long glide down. Nothing else matters.`][Math.floor(r() * 4)]
};

/* ---------------- shared: the lake, the crowd, the rope ---------------- */
const bio = (x, z) => W().bioAt(x, z);
const wrapA = a => a - Math.round(a / TAU) * TAU;
function shoreR(L, a) { for (let r = L.r * 0.4; r < L.r * 2.4; r += 3) { const x = L.x + Math.cos(a) * r, z = L.z + Math.sin(a) * r; if (bio(x, z) !== 1 && landOk(x, z)) return r; } return 0; }
const LN = 7;                                                                                              // the lane's distance from the shore, metres
function lakePick(c, rng) {                                                                               // a frozen lake near the village and a stretch of its shore with open ground behind and 60 m of clear ice
  const L = c.lake; if (!L || !(L.ok !== false) || !c.snow) return null; const v = c.vil, a0 = Math.atan2(v.z - L.z, v.x - L.x);
  for (let k = 0; k < 40; k++) {
    const a = a0 + (rng() - 0.5) * (k < 12 ? 1.4 : 5.5), rs = shoreR(L, a); if (rs < 60) continue; const rl = rs - LN, span = 100 / rl; let ok = true;
    for (let i = -0.15; i <= 1.0 + 1e-6 && ok; i += 0.05) { const th = a + i * span; for (const off of [-3.5, 0, 3.5]) { const x = L.x + Math.cos(th) * (rl + off), z = L.z + Math.sin(th) * (rl + off); if (bio(x, z) !== 1 || W().obNear(x, z, 1.5)) ok = false; } const bx = L.x + Math.cos(th) * (rs + 2), bz = L.z + Math.sin(th) * (rs + 2); if (!openOk(bx, bz, 0.6)) ok = false; }
    if (ok) return { L, a, rs };
  }
  return null;
}
// the lane is an arc round the lake's centre, 11 m off the shore; u = metres along it, off = metres toward the shore
function laneAt(G, u, off, o) { const rl = G.rs - LN + off, th = G.a + u / (G.rs - LN); o.x = G.L.x + Math.cos(th) * rl; o.z = G.L.z + Math.sin(th) * rl; o.yaw = Math.atan2(-Math.sin(th), Math.cos(th)); return o; }
let sledS = function (G, i, t) { const t0 = 0.6, tau = Math.max(0, t - t0), a = G.acc[i] * 0.78, vm = G.vmax[i] * 0.9, tc = vm / a; return tau < tc ? 0.5 * a * tau * tau : 0.5 * a * tc * tc + vm * (tau - tc); }
let sledV = function (G, i, t) { const tau = Math.max(0, t - 0.6), a = G.acc[i] * 0.78, vm = G.vmax[i] * 0.9; return Math.min(vm, a * tau); }
function raceG(rec) {
  const lk = A().world.LAKES[+rec.k]; const rs = shoreR(lk, rec.a), r = mulb(rec.sd);
  return { L: lk, a: rec.a, rs, acc: [7.2 + r() * 0.8, 7.0 + r() * 1.0, 6.7 + r() * 1.0], vmax: [25 + r() * 3, 24 + r() * 3, 23 + r() * 3], lane: [-1, 0, 1], r };
}
function raceCrowd(G, rng, n, u0, u1, camU, camR, avoidNear) {                                              // villagers along the shore at the rope: [u, off] with off >= 0.8 beyond the shore, none on the camera
  const out = []; for (let j = 0; j < n; j++) { const u = u0 + (u1 - u0) * (j + rng() * 0.6) / n, row = rng() < 0.3 ? 1 : 0, off = LN + 0.9 + row * 1.5 + rng() * 0.5; if (avoidNear && Math.abs(u - camU) < 3.4 && off - LN < camR + 0.6) continue; out.push([u, off, rng(), rng()]); } return out;
}
const lakeHint = c => c.lake && c.snow;
function raceWeight(c, mul) { return lakeHint(c) && c.el > -5 && c.storm < 0.45 ? ((c.int.racing ? 4 : 0) + (c.int.sled ? 1.6 : 0) + (c.int.gossip ? 0.8 : 0) + 0.2) * mul * (c.dow === 0 || c.dow === 6 ? 1.8 : 1) : 0; }
function raceAnchor(c, rng) { const lp = lakePick(c, rng); if (!lp) return null; const idx = A().world.LAKES.indexOf(lp.L); return { x: lp.L.x, z: lp.L.z, a: lp.a, k: String(idx), place: "a lake near " + c.vil.name, h: c.H, s: Math.min(c.storm, 0.3) }; }
function racePlan(rec, E, mode) {
  const G = raceG(rec), r = G.r, o = { x: 0, z: 0, yaw: 0 }, o2 = { x: 0, z: 0, yaw: 0 }, oc = { x: 0, z: 0, yaw: 0 }, nw = mode === "watch" ? 16 : 13, dur = 6.5, night = clamp(E.nightAt(rec.h), 0, 1);
  const camU = mode === "watch" ? 8 : 7, camOff = mode === "watch" ? LN + 6.2 : LN - 1.8;
  const crowd = raceCrowd(G, r, nw, mode === "watch" ? -9 : -13, mode === "watch" ? 46 : 20, camU, camOff - LN, true).slice(0, mode === "watch" ? nw : 6); const near = []; if (mode === "watch") for (let j = 0; j < 5; j++) near.push([camU - 4.2 + j * 2.2 + (r() - 0.5) * 0.8, camOff - 1.7 - r() * 1.2, r(), r()]); else for (let j = 0; j < 8; j++) near.push([camU - 2.3 - j * 1.0 + (r() - 0.5) * 0.4, camOff + 0.75 + (j % 2) * 0.7 + r() * 0.3, r(), r()]);      // the foreground crowd: eight at the lens's shore-side edge, a few more along the rope
  const all = crowd.concat(near);
  const pose = (i, t) => { const s = sledS(G, i, t); laneAt(G, s, G.lane[i] * 2.5 + 0.0, o); return s; };
  const roosts = [0, 1, 2].map(i => ({ n: 100, life: 1.5, size0: 0.35, size1: 1.7, a: 0.62, g: 5, drag: 1.5, spread: 1.8, fn(te, q) { const s = sledS(G, i, te), v = sledV(G, i, te); laneAt(G, s, G.lane[i] * 2.5, o2); const fx = Math.sin(o2.yaw), fz = Math.cos(o2.yaw); q.on = te > 0.3 ? clamp(0.3 + v / 9, 0, 1) : 0; q.x = o2.x - fx * 1.7; q.z = o2.z - fz * 1.7; q.y = surf(q.x, q.z) + 0.3; q.vx = -fx * (v * 0.3 + 1.0); q.vz = -fz * (v * 0.3 + 1.0); q.vy = 2.0 + v * 0.16; } }));
  const rope = { on: true }; let ropeObj = null;
  return {
    dur, need: { sled: 3, walker: all.length }, hour: rec.h, storm: rec.s, vig: 0.34,
    setup(E) {
      const T = A().THREE; ropeObj = E.extraOf("rope", () => { const g = new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({ color: 0xd8302a })); g.frustumCulled = false; g.geometry.setAttribute("position", new T.BufferAttribute(new Float32Array(3 * 2 * 40), 3)); return g; });
      E.extraOf("lanemarks", () => { const gg = new T.Group(), strip = (pts, w, col, op) => { const pos = [], idx = []; for (let i = 0; i < pts.length; i++) { const a = pts[i]; pos.push(a[0][0], a[0][1], a[0][2], a[1][0], a[1][1], a[1][2]); if (i) idx.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2); } const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(new Float32Array(pos), 3)); geo.setIndex(idx); const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: T.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, fog: true })); m.frustumCulled = false; m.renderOrder = 3; gg.add(m); };
        const q = { x: 0, z: 0, yaw: 0 }, rib = (u0, u1, o, w, step) => { const pts = []; for (let u = u0; u <= u1 + 1e-6; u += step) { const row = []; for (const dw of [-w / 2, w / 2]) { laneAt(G, u, o + dw, q); row.push([q.x, surf(q.x, q.z) + 0.05, q.z]); } pts.push(row); } return pts; };
        for (const o of [-3.75, -1.25, 1.25, 3.75]) strip(rib(-6, 72, o, 0.16, 3), 0.16, 0x1d3f78, 0.8);          // four lines make three lanes, one sled to a lane
        strip(rib(-0.2, 0.2, 0, 8.4, 0.2).map(r => r), 0, 0xf2f4f8, 0.95); strip(rib(-0.6, -0.2, 0, 8.4, 0.2), 0, 0x2a2a30, 0.85);      // the start line (white, the dark line behind it)
        gg.traverse(o => { o.frustumCulled = false; }); return gg; });
      const pos = ropeObj.m.geometry.attributes.position.array; let k = 0, prev = null; for (let u = -12; u <= 52; u += 2) { laneAt(G, u, LN - 0.9, oc); const x = oc.x, z = oc.z, y = surf(x, z) + 0.95; if (prev) { pos[k++] = prev[0]; pos[k++] = prev[1]; pos[k++] = prev[2]; pos[k++] = x; pos[k++] = y; pos[k++] = z; } prev = [x, y, z]; }
      ropeObj.m.geometry.setDrawRange(0, k / 3); ropeObj.m.geometry.attributes.position.needsUpdate = true;
    },
    frame(t, E) {
      E.extraOf("rope", null); E.extraOf("lanemarks", null);
      for (let i = 0; i < 3; i++) { const s = pose(i, t), v = sledV(G, i, t), a = E.sleds[i]; E.placeSled(a, o.x, o.z, o.yaw, v, 0, v > 1, { lean: 0.05 + 0.2 * clamp(v / 25, 0, 1) }); E.sledLights(a, false, false, 0); E.emitter(roosts[i]); a.ph += 0; }
      E.belt = sledS(G, 0, t) * 1.0;
      for (let j = 0; j < all.length; j++) { const q = all[j], w = E.walkers[j]; laneAt(G, q[0], q[1], oc); const yaw = Math.atan2(G.L.x + Math.cos(G.a + q[0] / (G.rs - LN)) * (G.rs - LN - 2) - oc.x, G.L.z + Math.sin(G.a + q[0] / (G.rs - LN)) * (G.rs - LN - 2) - oc.z) + (q[2] - 0.5) * 0.3;
        E.walk(w, oc.x, oc.z, yaw); const run = ease((t - 0.8) / 1.6), k = 0.25 + 0.75 * run; E.cheer(w, clamp(k * 1.3, 0, 1) * (0.8 + q[3] * 0.2), t * (1.1 + q[2] * 0.5) + q[3] * 3, q[2] > 0.45 && t > 0.4); }
      // camera: on the shore at the rope, turning to follow the lead sled
      laneAt(G, camU, camOff, oc); const ex = oc.x, ez = oc.z, ey = surf(ex, ez) + (mode === "watch" ? 1.62 : 1.2);
      const sLead = Math.max(sledS(G, 0, t), sledS(G, 1, t), sledS(G, 2, t)), back = ease((t - 3.5) / 1.0), uT = t < 1.0 ? 2 + ease(t / 1.0) * 1 : Math.min(sLead + 1.6, camU + 28);
      laneAt(G, uT, 0, o2); const crowdU = mode === "watch" ? camU - 1 : -3; laneAt(G, crowdU, LN + 1.0, oc);
      const tx = lerp(o2.x, oc.x, back), tz = lerp(o2.z, oc.z, back), ty = lerp(surf(o2.x, o2.z) + 0.9, surf(oc.x, oc.z) + 1.5, back);
      const sh = shake(t, mode === "watch" ? 1.2 : 0.7);
      if (mode === "watch") E.look(ex, ey + sh[1], ez, tx + sh[0] * 20, ty, tz, 62, 0);
      else {                                                                                               // the start: behind the line, low, looking down the three lanes with the crowd at the rope on the right; the roost from the launch rolls over the lens, then clears to the sleds running away down their lanes
        laneAt(G, camU, camOff, oc); const sx = oc.x, sz = oc.z, sy = surf(sx, sz) + 0.55, tl = Math.max(0, t - 0.3), lu = Math.max(sledS(G, 0, tl), sledS(G, 1, tl), sledS(G, 2, tl)); laneAt(G, clamp(lu * 0.92 + 0.5, 1.5, 60), -0.4 + 0.8 * ease((t - 4.2) / 1.5), o2);
        { const q1 = { x: 0, z: 0, yaw: 0 }, q2 = { x: 0, z: 0, yaw: 0 }; laneAt(G, camU - 12, camOff - 2.6, q1); laneAt(G, camU - 12, camOff - 4.4, q2); const k0 = ease((t - 1.3) / 1.1), ax = lerp(lerp(q1.x, q2.x, 0.3), o2.x, k0), az = lerp(lerp(q1.z, q2.z, 0.3), o2.z, k0);       // the opening looks down the rope with the crowd at the edge and the lanes beyond, then follows the lead sled
          E.look(sx, sy + sh[1], sz, ax + sh[0] * 20, lerp(sy + 0.1, surf(o2.x, o2.z) + 0.85, k0), az, 88, 0); }      // the camera is low at the rope, ahead of the line and 2 m off the near lane: the sleds launch at the lens and tear past it (a third of the frame), the camera whips round after them; the crowd stands along the shore at the frame's edge
      }
    },
    post(g, t, w, h) { }
  };
}
const RACE_CAP = (c, v, r) => [`Lake drag race at ${v.place}, three sleds and the whole village at the rope.`, `Three on the line, one flag, no rules. ${v.place}.`, `Waited all winter for this. Ice is good at ${v.place}.`, `Sleds, roost, and everyone screaming. ${v.place} on a Sunday.`][Math.floor(r() * 4)];
R.types.lakerace = { chip: "DRAG RACE", dur: 6.5, need: { sled: 3, walker: 14 }, pk: "race", pspeed: 30, notyet: true, weight: c => raceWeight(c, 1), fit: p => p.interests.includes("racing") || p.interests.includes("sled"), anchor: raceAnchor, plan: (rec, E) => racePlan(rec, E, "side"), cap: RACE_CAP };
R.types.watchrace = { chip: "AT THE ROPE", dur: 6.5, need: { sled: 3, walker: 21 }, pk: "watch", pspeed: 30, notyet: true, weight: c => raceWeight(c, 0.8), fit: p => p.interests.includes("gossip") || p.interests.includes("racing"), anchor: raceAnchor, plan: (rec, E) => racePlan(rec, E, "watch"), cap: (c, v, r) => [`Front row at the lake. Phones up.`, `Got the whole village in the shot and three sleds just past their heads.`, `Behind everyone's hats at ${v.place}. Worth it.`, `If you did not film it, did it happen? Drag race at ${v.place}.`][Math.floor(r() * 4)] };


/* ---------------- 4. water skip ---------------- */
function crossing(x, z, yaw) {                                                                              // along a heading from a dry spot: where open water starts and ends (metres), or null
  const fx = Math.sin(yaw), fz = Math.cos(yaw); let ws = -1, we = -1;
  for (let d = 0; d <= 420; d += 2) { const px = x + fx * d, pz = z + fz * d, w = W().wlvAt(px, pz) !== null; if (ws < 0 && w) ws = d; else if (ws >= 0 && !w) { we = d; break; } }
  return ws > 8 && we > ws ? { ws, we } : null;
}
R.types.waterskip = {
  chip: "WATER SKIP", dur: 6.5, need: { sled: 1, walker: 1 }, pk: "skip", pspeed: 24, notyet: true,
  weight: c => c.int.sled && c.coast && c.el > -3 && c.storm < 0.45 ? 2.0 + (c.int.racing ? 1.5 : 0) : 0,
  fit: p => p.interests.includes("sled") || p.interests.includes("racing"),
  anchor(c, rng) {
    const v = c.vil; for (let k = 0; k < 90; k++) {
      const a = rng() * TAU, r = 80 + rng() * 2400, x = v.x + Math.cos(a) * r, z = v.z + Math.sin(a) * r; if (!openOk(x, z, 3)) continue;
      for (let q = 0; q < 12; q++) { const yaw = q / 12 * TAU + rng() * 0.2, cr = crossing(x, z, yaw); if (cr && cr.ws <= 330 && cr.we - cr.ws >= 30 && cr.we - cr.ws <= 95) { const ex = x + Math.sin(yaw) * (cr.we + 16), ez = z + Math.cos(yaw) * (cr.we + 16); if (!openOk(ex, ez, 1.5)) continue; if (surf(ex, ez) - (W().wlvAt(x + Math.sin(yaw) * (cr.ws + 3), z + Math.cos(yaw) * (cr.ws + 3)) || 0) > 3.2) continue; let ok = true; for (let d = -70; d < 0; d += 6) if (!openOk(x + Math.sin(yaw) * d, z + Math.cos(yaw) * d, 1.6)) ok = false; if (!ok) continue; const sx = x + Math.sin(yaw) * Math.max(0, cr.ws - 62), sz = z + Math.cos(yaw) * Math.max(0, cr.ws - 62); let ok2 = true; for (let d = 0; d < Math.min(62, cr.ws); d += 5) { const px = sx + Math.sin(yaw) * d, pz = sz + Math.cos(yaw) * d; if (W().obNear(px, pz, 1.5) || W().slopeAt(px, pz, 5) > 0.7 || (d < 50 && W().wlvAt(px, pz) !== null)) ok2 = false; } if (!ok2 || !crossing(sx, sz, yaw)) continue; return { x: sx, z: sz, a: yaw, k: rng() < 0.62 ? "make" : "sink", place: v.name, h: c.H, s: Math.min(c.storm, 0.3) }; } }
    }
    return null;
  },
  plan(rec, E) {
    const x0 = rec.x, z0 = rec.z, yaw = rec.a, cr = crossing(x0, z0, yaw); if (!cr) return null; const sink = rec.k === "sink", fx = Math.sin(yaw), fz = Math.cos(yaw), nx = Math.cos(yaw), nz = -Math.sin(yaw), rng = mulb(rec.sd), dur = 6.5;
    const ws = cr.ws, we = cr.we, run0 = Math.max(0, ws - 62), V0 = 21 + rng() * 2, side = rng() < 0.5 ? 1 : -1, cd = Math.max(22, (we - ws) * 0.55);
    // distance along the line at time t, and speed: 62 m of run-up at about 22 m/s, then skimming; the sinking one runs out of speed 24 m into the water
    const sFn = t => { const k = Math.max(0, t - 0.2); if (!sink) return run0 + V0 * k - 0.4 * k * k * (t > 3 ? 0 : 0); const sw = ws + 24; const s1 = run0 + V0 * k; return s1 < sw ? s1 : sw + 0.0 + (1 - Math.exp(-(s1 - sw) / 8)) * 8 - 0 ; };
    const o = { x: 0, z: 0, yaw, speed: 0, s: 0 }, tmp = { x: 0, z: 0, yaw, speed: 0, s: 0 }, wl = x => W().wlvAt(x[0], x[1]);
    const state = (t, q) => {                                                                                // where the sled is, how high, pitch, speed
      const k = Math.max(0, t - 0.2); let s = run0 + V0 * k, sp = V0; let y = null, pit = 0, hop = 0, sunk = 0;
      if (sink) { const s24 = ws + 24; if (s > s24) { const e = s - s24; s = s24 + 7 * (1 - Math.exp(-e / 7)); sp = V0 * Math.exp(-e / 7) + 0.5; } const tSink = (s24 - run0) / V0 + 0.2 + 0.9; sunk = ease((t - tSink) / 1.3); }
      const px = x0 + fx * s, pz = z0 + fz * s, inW = s > ws - 1 && W().wlvAt(px, pz) !== null; const kk = (s - ws) / V0;
      if (inW && sp > 6) { hop = Math.max(0, Math.sin(Math.PI * ((s - ws) / 17))) * 0.32 * Math.exp(-(s - ws) / 70); pit = 0.07 + 0.04 * Math.cos(Math.PI * ((s - ws) / 17)); }
      q.x = x0 + fx * s; q.z = z0 + fz * s; q.speed = sp; q.s = s; q.inW = inW; q.hop = hop; q.pit = pit; q.sunk = sunk; q.fx = fx; q.fz = fz; return q;
    };
    const Q = { x: 0, z: 0, speed: 0, s: 0, inW: false, hop: 0, pit: 0, sunk: 0 }, Q2 = { x: 0, z: 0, speed: 0, s: 0, inW: false, hop: 0, pit: 0, sunk: 0 };
    const sprays = [-1, 1].map(sd => ({ n: 150, life: 1.1, size0: 0.35, size1: 1.7, a: 0.7, g: 9, drag: 0.9, spread: 1.3, fn(te, q) { state(te, Q2); q.on = Q2.inW && Q2.speed > 5 && Q2.sunk < 0.6 ? clamp(Q2.speed / 14, 0, 1) : 0; q.x = Q2.x + nx * sd * 0.6 + fx * 0.6; q.z = Q2.z + nz * sd * 0.6 + fz * 0.6; q.y = (W().wlvAt(q.x, q.z) || 0) + 0.15; q.vx = nx * sd * (4 + Q2.speed * 0.12) - fx * 1.5; q.vz = nz * sd * (4 + Q2.speed * 0.12) - fz * 1.5; q.vy = 2.4 + Q2.speed * 0.06 + Q2.hop * 4; } }));
    const tail = { n: 160, life: 1.3, size0: 0.5, size1: 2.4, a: 0.55, g: 5, drag: 1.1, spread: 2.2, fn(te, q) { state(te, Q2); q.on = Q2.inW && Q2.speed > 5 && Q2.sunk < 0.5 ? 1 : 0; q.x = Q2.x - fx * 1.8; q.z = Q2.z - fz * 1.8; q.y = (W().wlvAt(q.x, q.z) || 0) + 0.2; q.vx = -fx * (Q2.speed * 0.25 + 1); q.vz = -fz * (Q2.speed * 0.25 + 1); q.vy = 2 + Q2.speed * 0.07; } };
    const roost = { n: 70, life: 1.2, size0: 0.3, size1: 1.2, a: 0.55, g: 6, drag: 1.6, spread: 1.4, fn(te, q) { state(te, Q2); q.on = !Q2.inW && Q2.speed > 6 && te > 0.3 ? 1 : 0; q.x = Q2.x - fx * 1.7; q.z = Q2.z - fz * 1.7; q.y = surf(q.x, q.z) + 0.3; q.vx = -fx * (Q2.speed * 0.28 + 1); q.vz = -fz * (Q2.speed * 0.28 + 1); q.vy = 2 + Q2.speed * 0.12; } };
    const drops = { n: 40, life: 0.8, size0: 0.04, size1: 0.07, a: 0.8, g: 14, drag: 0.5, spread: 0.5, fn(te, q) { q.on = te > 4.3 ? 1 : 0; q.x = bx + (rng0(te * 7) - 0.5) * 0.4; q.z = bz + (rng0(te * 11) - 0.5) * 0.4; q.y = surf(bx, bz) + 1.1 + rng0(te * 13) * 0.6; q.vx = 0; q.vz = 0; q.vy = 0; } };
    const rng0 = k => frac(Math.sin(k * 12.9898) * 43758.5453), frac = x => x - Math.floor(x);
    const bx = x0 + fx * (ws - 3.4) + nx * side * 2.6, bz = z0 + fz * (ws - 3.4) + nz * side * 2.6;
    return {
      dur, need: { sled: 1, walker: 1 }, hour: rec.h, storm: rec.s, vig: 0.3,
      frame(t, E) {
        state(t, Q); const a = E.sleds[0], wl0 = W().wlvAt(Q.x, Q.z), sy = wl0 !== null ? wl0 : null, yawS = yaw, show = !(sink && Q.sunk > 0.98);
        E.placeSled(a, Q.x, Q.z, yawS, Q.speed, 0, Q.speed > 3 && !Q.inW, { lean: 0.15 + Q.pit * 2 });
        if (Q.inW) { const y = (wl0 !== null ? wl0 : 0) + 0.05 + Q.hop - Q.sunk * 1.15; a.g.position.y = y; a.g.rotation.x = -Q.pit - Q.sunk * 0.5; a.blob.visible = false; a.blobOn = false; }
        a.on = show; a.rider.visible = !(sink && Q.sunk > 0.25);
        E.belt = Q.s * 1.0; E.sledLights(a, false, false, 0);
        if (Q.inW || sink) { E.emitter(sprays[0]); E.emitter(sprays[1]); E.emitter(tail); } E.emitter(roost);
        const w = E.walkers[0]; w.on = false;
        if (sink && t > 4.0) { const k = ease((t - 4.0) / 0.6); E.walk(w, bx, bz, yaw + Math.PI * 0.85 * 0 + 2.7); const U = w.U, sh = Math.sin(t * 22) * 0.05; U.arms[0].rotation.set(-2.2 * k, 0, 0.5 * k); U.arms[1].rotation.set(-2.2 * k, 0, -0.5 * k); U.fore[0].rotation.x = -1.8 * k; U.fore[1].rotation.x = -1.8 * k; U.torso.rotation.x = 0.12 + sh; E.emitter(drops); }
        // the camera: a chase camera behind and beside the sled, low over the water; the sunk one swings back to the rider on the bank
        const back = 8.0, cx = Q.x - fx * back + nx * side * 3.4, cz = Q.z - fz * back + nz * side * 3.4, cy = Math.max(surf(cx, cz), W().wlvAt(cx, cz) || 0, 0) + 1.6; let tx, tz, ty;
        if (sink && t > 3.8) { const k = ease((t - 3.8) / 1.0); tx = lerp(Q.x + fx * 3, bx, k); tz = lerp(Q.z + fz * 3, bz, k); ty = lerp((wl0 || 0) + 0.7, surf(bx, bz) + 1.1, k); }
        else { tx = Q.x + fx * 3.5; tz = Q.z + fz * 3.5; ty = (Q.inW ? (wl0 || 0) : surf(Q.x, Q.z)) + 0.7; }
        let cx2 = cx, cy2 = cy, cz2 = cz, fv = 66; if (sink && t > 3.9) { const k = ease((t - 3.9) / 1.3), px = bx + nx * side * 2.3 - fx * 2.0, pz = bz + nz * side * 2.3 - fz * 2.0; cx2 = lerp(cx, px, k); cz2 = lerp(cz, pz, k); cy2 = lerp(cy, Math.max(surf(px, pz) + 1.3, surf(bx, bz) + 1.45), k); fv = lerp(66, 48, k); }       // the clip ends close on the wet rider on the bank
        E.look(cx2, cy2 + shake(t, 1)[1], cz2, tx, ty, tz, fv, 0.0);
      }
    };
  },
  cap: (c, v, r) => [`Hit the fjord at full throttle. Do not try this.`, `Skipped it. Water is a very soft road.`, `Full send at ${v.place}. No regrets, mostly.`, `Look at that spray. Look at that far bank.`][Math.floor(r() * 4)]
};

/* ---------------- 6. reindeer and the snow hole ---------------- */
R.types.reindeer = {
  chip: "SNOW HOLE", dur: 7, need: { deer: 1 }, pk: "deer", pspeed: 4, notyet: true,
  weight: c => (c.int.dogs || c.int.photos || c.sami) && c.el > -6 && c.storm < 0.5 && c.snow ? 2.4 : 0,
  fit: p => p.interests.includes("dogs") || p.interests.includes("photos") || p.interests.includes("birds"),
  anchor(c, rng) { const v = c.vil, a = rng() * TAU, b = H().openSpot(v.x + Math.cos(a) * (90 + rng() * 260), v.z + Math.sin(a) * (90 + rng() * 260), 6); if (!b) return null; for (let r = 2; r <= 5; r += 3) if (!openOk(b[0] + Math.cos(a) * r, b[1] + Math.sin(a) * r, 1.2)) return null; return { x: b[0], z: b[1], a: a, place: v.name, h: c.H, s: Math.min(c.storm, 0.4) }; },
  plan(rec, E) {
    const hx = rec.x, hz = rec.z, ang = rec.a, rng = mulb(rec.sd), dur = 7, yaw0 = yawOf(Math.cos(ang), Math.sin(ang)), g0 = surf(hx, hz), T = A().THREE;
    const hole = E.extraOf("snowhole", () => { const g = new T.Group(), mat = new T.MeshLambertMaterial({ color: 0xdfe8f2, emissive: 0x8a9db4, side: T.BackSide }); const cyl = new T.Mesh(new T.CylinderGeometry(0.9, 1.15, 2.2, 20, 1, true), mat); cyl.position.y = -0.9; g.add(cyl); const rim = new T.Mesh(new T.TorusGeometry(0.98, 0.16, 8, 24), new T.MeshLambertMaterial({ color: 0xeef4fa, emissive: 0x5a6a80 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.12; g.add(rim); return g; });
    hole.m.position.set(hx, g0, hz); const d = E.deer[0], q = d.q;
    // the herd stands beyond the rim; one comes to look: its head over the edge at 1.6 s, down at the lens by 3.4 s, a lick at 4.0 to 4.7, away by 6.4
    const bxz = [hx + Math.sin(yaw0) * 1.55, hz + Math.cos(yaw0) * 1.55], face = yaw0 + Math.PI;
    return {
      dur, need: { deer: 1 }, hour: rec.h, storm: rec.s, vig: 0.42,
      frame(t, E) {
        hole.on = true; const k = ease((t - 1.1) / 1.9) * (1 - ease((t - 5.4) / 1.3)), lk = ease((t - 3.5) / 0.5) * (1 - ease((t - 4.9) / 0.5));
        E.deerPlace(d, bxz[0] + Math.sin(yaw0) * (0.7 * (1 - k) - 0.5 * k * 0), bxz[1] + Math.cos(yaw0) * (0.7 * (1 - k)), face, 0, 0, E.dt || 0.04);
        q.neck.rotation.x = lerp(-0.4, 1.35, k) + 0.04 * Math.sin(t * 2.3); q.head.rotation.x = lerp(0.5, 1.0, k) + 0.1 * Math.sin(t * 5) * lk; q.body.rotation.x = 0.28 * k; q.body.position.y = 0.8 - 0.14 * k;
        d.tongue.visible = lk > 0.02; d.tongue.position.set(0, -0.12, 0.38); d.tongue.rotation.set(Math.PI / 2 + 0.25 + 0.3 * Math.sin(t * 12) * lk, 0, 0); d.tongue.scale.set(1, 0.4 + 1.1 * lk * (0.7 + 0.3 * Math.sin(t * 11)), 1);
        E.look(hx, g0 - 0.9, hz, hx + Math.sin(yaw0) * 0.35 * (1 - k * 0.2), g0 + 0.2 + 1.2 * 0, hz + Math.cos(yaw0) * 0.35, 66, 0); E.cam.lookAt(hx + Math.sin(yaw0) * 0.5, g0 + 0.9, hz + Math.cos(yaw0) * 0.5); E.cam.rotateZ(0.04 * Math.sin(t * 1.7)); E.cam.updateMatrixWorld(true);
        E.flakes(0.4, -1.1, 0.2, 0.7, 0.03, [4, 4, 4], 1.5);
      },
      post(g, t, w, h) {                                                                                      // the lens: breath fog while it sniffs, a smear where the tongue went, drying slowly
        const sn = ease((t - 2.9) / 0.6) * (1 - ease((t - 3.6) / 0.5)), lk = ease((t - 4.0) / 0.3), sm = ease((t - 4.1) / 0.4) * (1 - ease((t - 5.6) / 1.4));
        if (sn > 0.01) { const r = g.createRadialGradient(w * 0.5, h * 0.45, 10, w * 0.5, h * 0.45, h * 0.5); r.addColorStop(0, `rgba(235,242,250,${0.55 * sn})`); r.addColorStop(1, "rgba(235,242,250,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); }
        if (sm > 0.01) { g.save(); g.globalAlpha = 0.34 * sm; g.fillStyle = "#d9dfe6"; for (let i = 0; i < 7; i++) { const yy = h * (0.22 + 0.55 * ((i * 0.37 + 0.13) % 1)), ww = w * (0.5 + 0.4 * ((i * 0.53) % 1)); g.beginPath(); g.ellipse(w * 0.5 + Math.sin(i * 2.1) * 40, yy, ww * 0.5, 16 + 8 * (i % 3), Math.sin(i) * 0.4, 0, TAU); g.fill(); } g.restore(); g.fillStyle = `rgba(230,232,236,${0.12 * sm})`; g.fillRect(0, 0, w, h); }
      }
    };
  },
  cap: (c, v, r) => [`She came over to say hello. And lick the camera.`, `Dug a snow hole to film the herd. The herd had other ideas.`, `Reindeer, lens, tongue. Do not wipe it off.`, `Not a photo, a reindeer kiss.`][Math.floor(r() * 4)]
};


/* ---------------- 8. plow wall ---------------- */
function plowMesh() {
  const T = A().THREE, g = new T.Group(), std = (c, r, m) => new T.MeshStandardMaterial({ color: c, roughness: r === undefined ? 0.6 : r, metalness: m || 0 }), add = (geo, mat, x, y, z, p) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); (p || g).add(m); return m; };
  const orange = std(0xe86a1a, 0.55, 0.1), dark = std(0x22262c, 0.7, 0.2), glass = std(0x1c2b36, 0.1, 0.5), yel = std(0xf0c020, 0.5, 0.1), steel = std(0x9aa3ad, 0.4, 0.6), tire = std(0x101112, 0.95);
  add(new T.BoxGeometry(2.3, 0.7, 6.0), dark, 0, 0.95, -0.4); add(new T.BoxGeometry(2.3, 1.55, 1.9), orange, 0, 1.85, 1.2); add(new T.BoxGeometry(2.1, 0.8, 0.05), glass, 0, 2.2, 2.18); add(new T.BoxGeometry(2.1, 0.7, 1.4), orange, 0, 1.3, 2.15);
  add(new T.BoxGeometry(2.2, 0.55, 2.8), orange, 0, 1.5, -2.3);                                            // the hopper behind the cab
  for (const sx of [-1, 1]) for (const z of [1.7, -1.5]) { const w = add(new T.CylinderGeometry(0.55, 0.55, 0.45, 16), tire, sx * 1.1, 0.55, z); w.rotation.z = Math.PI / 2; w.userData.wheel = true; }
  const bl = new T.Group(); bl.position.set(0, 0.85, 3.4); bl.rotation.y = -0.45; g.add(bl);                  // the blade: a long curved plate, angled to throw right
  const plate = add(new T.BoxGeometry(3.6, 1.05, 0.12), yel, 0, 0.35, 0, bl); plate.rotation.x = -0.35; add(new T.BoxGeometry(3.7, 0.08, 0.3), steel, 0, -0.1, 0.1, bl);
  for (const sx of [-1, 1]) add(new T.BoxGeometry(0.2, 0.2, 0.2), std(0xfff2c0, 0.2), sx * 0.8, 1.35, 2.92);
  const bar = add(new T.BoxGeometry(1.2, 0.14, 0.3), dark, 0, 2.7, 1.0); const ob = new T.Sprite(new T.SpriteMaterial({ map: tex2(), color: 0xff9a1a, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false })); ob.scale.set(1.2, 1.2, 1); ob.position.set(0, 2.85, 1.0); g.add(ob); g.userData.beacon = ob;
  return g;
}
let _t2 = null; function tex2() { if (_t2) return _t2; const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), r = x.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(255,255,255,.6)"); r.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = r; x.fillRect(0, 0, 64, 64); return (_t2 = new (A().THREE).CanvasTexture(c)); }
R.types.plowwall = {
  chip: "PLOW", dur: 6.5, need: {}, pk: "plow", pspeed: 14,
  weight: c => c.snow && (c.sinceStorm || c.depth > 0.2) && c.el > -7 ? 1.8 + (c.int.gossip ? 1 : 0) : 0,
  fit: p => p.age > 12,
  anchor(c, rng) {
    if (!window.TLXR || !TLXR.ready) return null; const v = c.vil, rs = TLXR.routes.filter(r => r.pts && r.pts.length > 4);
    for (let k = 0; k < 80; k++) {
      const r = rs[Math.floor(rng() * rs.length)]; if (!r) continue; if (r.pts.length < 14) continue; const i = 1 + Math.floor(rng() * (r.pts.length - 12)), p0 = r.pts[i], pm = r.pts[i + 4], p1 = r.pts[i + 9]; if (!p0 || !p1 || !pm) continue; const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); if (d < 20) continue; const a1 = Math.atan2(pm[0] - p0[0], pm[1] - p0[1]), a2 = Math.atan2(p1[0] - pm[0], p1[1] - pm[1]); if (Math.abs(wrapA(a2 - a1)) > 0.1) continue;
      const yaw = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]), side = rng() < 0.5 ? 1 : -1, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = fz, rz = -fx; let ok = true;
      for (let s = -50; s <= 30; s += 6) { const x = p0[0] + fx * s, z = p0[1] + fz * s; if (W().isSea(x, z) || W().obNear(x, z, 1.8) || Math.hypot(x - v.x, z - v.z) > 3500) ok = false; }
      const cx = p0[0] + rx * 4.3 * side, cz = p0[1] + rz * 4.3 * side; if (!openOk(cx, cz, 0.8)) ok = false; if (!ok) continue; return { x: p0[0], z: p0[1], a: yaw, k: side > 0 ? "r" : "l", place: r.name || v.name, h: c.H, s: Math.min(c.storm, 0.4) };
    }
    return null;
  },
  plan(rec, E) {
    const x0 = rec.x, z0 = rec.z, yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = fz, rz = -fx, side = rec.k === "l" ? -1 : 1, T = A().THREE, dur = 6.5, V = 9.5, t0 = 4.2;   // the truck is level with the camera at t0
    const truck = E.extraOf("plowtruck", plowMesh); const bl = truck.m.children[truck.m.children.length - 1];
    const pos = (t, q) => { const s = (t - t0) * V; q.x = x0 + fx * s + rx * (side * 0.25); q.z = z0 + fz * s + rz * (side * 0.25); q.s = s; return q; };
    const Q = { x: 0, z: 0, s: 0 }, wall = { n: 380, life: 2.1, size0: 1.2, size1: 4.2, a: 0.9, g: 3.0, drag: 0.9, spread: 4.2, fn(te, q) { pos(te, Q); const bx = Q.x + fx * 3.7 + rx * side * 1.2, bz = Q.z + fz * 3.7 + rz * side * 1.2; q.on = Q.s > -48 && Q.s < 20 ? 1 : 0; q.x = bx; q.z = bz; q.y = surf(bx, bz) + 0.9; q.vx = rx * side * 9.5 + fx * 2.5; q.vz = rz * side * 9.5 + fz * 2.5; q.vy = 5.2; } };
    const low = { n: 120, life: 1.4, size0: 0.6, size1: 2.0, a: 0.55, g: 5, drag: 1.1, spread: 2.2, fn(te, q) { pos(te, Q); const bx = Q.x + fx * 3.4 + rx * side * 0.3, bz = Q.z + fz * 3.4 + rz * side * 0.3; q.on = Q.s > -48 && Q.s < 20 ? 1 : 0; q.x = bx; q.z = bz; q.y = surf(bx, bz) + 0.3; q.vx = rx * side * 7; q.vz = rz * side * 7; q.vy = 2.0; } };
    const cx = x0 + rx * 4.3 * side, cz = z0 + rz * 4.3 * side, cy = surf(cx, cz) + 1.25;
    return {
      dur, need: {}, hour: rec.h, storm: rec.s, vig: 0.3,
      frame(t, E) {
        truck.on = true; pos(t, Q); const g = truck.m, y = surf(Q.x, Q.z), yF = surf(Q.x + fx * 2.5, Q.z + fz * 2.5), yR = surf(Q.x - fx * 2.5, Q.z - fz * 2.5); g.position.set(Q.x, (y + yF + yR) / 3, Q.z); g.rotation.set(-Math.atan2(yF - yR, 5), yaw, 0, "YXZ");
        const rot = Q.s / 0.55; for (const c of g.children) if (c.userData.wheel) c.rotation.x = rot; const bc = g.userData.beacon; if (bc) { bc.visible = ((t * 3) % 1) < 0.5; }
        E.emitter(wall); E.emitter(low);
        const la = Math.max(0, 1 - Math.abs(Q.s) / 14); const aim = Q.s < 4 ? Q.s + 3 : 4 + (Q.s - 4) * 0.4; const tx = x0 + fx * (aim - 1) + rx * side * 0.2, tz = z0 + fz * (aim - 1) + rz * side * 0.2, sh = shake(t, 1 + 3 * la);
        E.look(cx, cy + sh[1], cz, tx, surf(tx, tz) + 1.5, tz, 62, 0.0);
        E.flakes(0.3, -0.8, 0.2, 0.5, 0.03, [14, 8, 16], 5);
      },
      post(g, t, w, h) { const k = Math.exp(-Math.pow((t - (t0 + 0.45)) / 0.5, 2)); if (k > 0.02) { g.fillStyle = `rgba(238,244,250,${0.88 * k})`; g.fillRect(0, 0, w, h); const rr = mulb(Math.floor(t * 24)); g.strokeStyle = `rgba(255,255,255,${0.5 * k})`; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 40; i++) { const x = rr() * w, y = rr() * h; g.moveTo(x, y); g.lineTo(x + 30 + rr() * 40, y - 6); } g.stroke(); } }
    };
  },
  cap: (c, v, r) => [`Stood at the verge and the plow gave me the whole road.`, `Nordkinn plowing: you do not get a say, you get snow.`, `Plow on ${v.place}. I am now a snowman.`, `Waved at the plow driver. He waved back with a wall of snow.`][Math.floor(r() * 4)]
};

/* ---------------- 9. aurora over the lighthouse ---------------- */
function lampOf(rec) { const sites = A().world.SITES, rel = sites.find(q => q.type === "relay" && q.x !== undefined); return rel ? { x: rel.x, z: rel.z, h: 31.5 } : null; }
R.types.aurora = {
  chip: "AURORA", dur: 8, need: {}, pk: "aurora", pspeed: 3,
  weight: c => c.el < -10 && c.aur > 0.3 && c.storm < 0.3 && lampOf() ? 2.2 + (c.int.photos ? 3 : 0) : 0,
  fit: p => p.interests.includes("photos") || p.interests.includes("birds"),
  anchor(c, rng) {
    const L = lampOf(); if (!L) return null; let h = null; for (let q = 0; q < 48; q++) { const hh = c.H - q * 0.5; if (sunEl(hh) < -11 && A().gram.aur().level(hh) > 0.45) { h = hh; break; } } if (h === null) return null;
    for (let k = 0; k < 160; k++) { const a = Math.PI / 2 + (rng() - 0.5) * (k < 80 ? 1.5 : 3.2), r = 40 + rng() * 55, x = L.x + Math.cos(a) * r, z = L.z + Math.sin(a) * r; if (!openOk(x, z, 2.5)) continue; const yaw = Math.atan2(L.x - x, L.z - z); let ok = true; for (let d = 5; d < r - 8; d += 6) if (W().obNear(x + Math.sin(yaw) * d, z + Math.cos(yaw) * d, 1.4)) ok = false; if (!ok) continue; return { x, z, a: yaw, place: "Slettnes lighthouse", h, s: 0 }; }
    return null;
  },
  plan(rec, E) {
    const L = lampOf(); if (!L) return null; const T = A().THREE, dur = 8, cx = rec.x, cz = rec.z, cy = surf(cx, cz) + 1.6, yawL = rec.a, ly = surf(L.x, L.z) + L.h, dist = Math.hypot(L.x - cx, L.z - cz);
    const beam = E.extraOf("beams", () => { const g = new T.Group(); for (let i = 0; i < 2; i++) { const cg = new T.ConeGeometry(34, 900, 16, 1, true); cg.translate(0, -450, 0); cg.rotateX(-Math.PI / 2); const m = new T.Mesh(cg, new T.MeshBasicMaterial({ map: R.beamTex(), color: 0xfff0c0, transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false })); m.userData.dir = i; g.add(m); } const gl = new T.Sprite(new T.SpriteMaterial({ map: tex2(), color: 0xfff2c8, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false })); gl.scale.set(14, 14, 1); gl.userData.glow = true; g.add(gl); return g; });
    beam.m.position.set(L.x, ly, L.z);
    return {
      dur, need: {}, hour: rec.h, storm: 0, vig: 0.45,
      frame(t, E) {
        beam.on = true; const u = ease(t / dur), pitch = lerp(0.02, 0.66, u), sw = t * 0.62 + (rec.sd % 7);
        for (const m of beam.m.children) { if (m.userData.glow) { const toC = Math.atan2(cx - L.x, cz - L.z), df = Math.cos(sw - toC), df2 = Math.cos(sw + Math.PI - toC); m.material.opacity = 0.35 + 0.65 * Math.pow(Math.max(0, df, df2), 10); m.scale.setScalar(10 + 22 * Math.pow(Math.max(0, df, df2), 10)); continue; } m.rotation.set(0.0, sw + m.userData.dir * Math.PI, 0); m.rotation.order = "YXZ"; }
        const sh = shake(t, 0.5), ty = cy + Math.tan(pitch) * 60 + 0.0, a = yawL + Math.sin(t * 0.4) * 0.08;
        E.look(cx, cy + sh[1], cz, cx + Math.sin(a) * 60 + sh[0] * 60, ty, cz + Math.cos(a) * 60, 68, 0);
      }
    };
  },
  cap: (c, v, r) => [`Slow tilt up from the lighthouse. The sky did the rest.`, `The light sweeps, the sky moves. Slettnes tonight.`, `Aurora over the lighthouse. I forgot to breathe.`, `Green over the fyr. Cold feet, no regrets.`][Math.floor(r() * 4)]
};


/* ---------------- 10. the sea: a skiff's bow in swell, gulls ---------------- */
function skiffMesh() {
  const T = A().THREE, g = new T.Group(), std = (c, r, m) => new T.MeshStandardMaterial({ color: c, roughness: r === undefined ? 0.55 : r, metalness: m || 0 }), add = (geo, mat, x, y, z, rx, ry, rz) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (rx) m.rotation.set(rx, ry || 0, rz || 0); g.add(m); return m; };
  const hull = std(0xc9d2da, 0.45, 0.5), inside = std(0x8aa0b0, 0.5, 0.4), red = std(0xc23a2a, 0.6), wood = std(0x8a6a44, 0.9), dark = std(0x22262c, 0.7);
  const bow = new T.Shape(); bow.moveTo(-0.85, 0); bow.lineTo(0.85, 0); bow.lineTo(0.62, 2.2); bow.lineTo(0, 3.5); bow.lineTo(-0.62, 2.2); bow.lineTo(-0.85, 0);
  const deckG = new T.ShapeGeometry(bow); deckG.rotateX(-Math.PI / 2); const deck = new T.Mesh(deckG, inside); deck.position.set(0, 0.55, -0.6); g.add(deck);
  for (const sx of [-1, 1]) { const side = new T.Mesh(new T.BoxGeometry(0.07, 0.65, 3.7), hull); side.position.set(sx * 0.78, 0.3, 1.1); side.rotation.y = -sx * 0.17; g.add(side); const rail = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 3.9), red); rail.position.set(sx * 0.77, 0.66, 1.1); rail.rotation.y = -sx * 0.17; g.add(rail); }
  add(new T.BoxGeometry(1.5, 0.08, 0.35), wood, 0, 0.6, -0.3); add(new T.BoxGeometry(0.16, 0.5, 0.16), dark, 0, 0.9, 2.55); add(new T.SphereGeometry(0.22, 10, 8), std(0xff7a1a, 0.7), 0.55, 0.45, 2.1);
  const bw = new T.Mesh(new T.BoxGeometry(0.1, 0.9, 1.6), hull); bw.position.set(0, 0.2, 2.9); bw.rotation.set(0.55, 0, 0); g.add(bw);
  return g;
}
function gullMesh() {                                                                                      // a real gull: body, head with a yellow bill and red spot, a fan tail, and wings of two segments (arm and hand) that flap with the hand lagging the arm
  const T = A().THREE, g = new T.Group(), white = new T.MeshLambertMaterial({ color: 0xf3f5f7, side: T.DoubleSide }), grey = new T.MeshLambertMaterial({ color: 0x9aa4ae, side: T.DoubleSide }), tip = new T.MeshLambertMaterial({ color: 0x23272c, side: T.DoubleSide }), yel = new T.MeshLambertMaterial({ color: 0xe8b030 });
  const body = new T.Mesh(new T.SphereGeometry(0.14, 10, 8), white); body.scale.set(0.78, 0.72, 2.1); g.add(body); const chest = new T.Mesh(new T.SphereGeometry(0.1, 8, 6), white); chest.position.set(0, -0.005, 0.2); g.add(chest);
  const head = new T.Mesh(new T.SphereGeometry(0.065, 10, 8), white); head.position.set(0, 0.07, 0.34); g.add(head); const bill = new T.Mesh(new T.ConeGeometry(0.02, 0.12, 6), yel); bill.rotation.x = Math.PI / 2 + 0.08; bill.position.set(0, 0.058, 0.43); g.add(bill); const eye = new T.Mesh(new T.SphereGeometry(0.011, 6, 5), tip); eye.position.set(0.04, 0.085, 0.385); g.add(eye); const eye2 = eye.clone(); eye2.position.x = -0.04; g.add(eye2);
  const tail = new T.Mesh(new T.CircleGeometry(0.1, 8, 0, Math.PI), white); tail.rotation.x = -Math.PI / 2 + 0.1; tail.rotation.z = Math.PI; tail.position.set(0, 0.02, -0.28); g.add(tail);
  const wingShape = (len, w0, w1, sw) => { const sh = new T.Shape(); sh.moveTo(0, -w0 / 2); sh.lineTo(len, -w1 / 2 - sw); sh.lineTo(len, w1 / 2 - sw); sh.lineTo(0, w0 / 2); sh.closePath(); const geo = new T.ShapeGeometry(sh); geo.rotateX(Math.PI / 2); return geo; };
  for (const s of [-1, 1]) {
    const p = new T.Group(); p.position.set(s * 0.07, 0.05, 0.08); g.add(p); const inner = new T.Mesh(wingShape(0.3, 0.22, 0.17, 0.0), white); if (s < 0) inner.scale.x = -1; p.add(inner);
    const o = new T.Group(); o.position.set(s * 0.3, 0, 0); p.add(o); const outer = new T.Mesh(wingShape(0.3, 0.17, 0.05, 0.06), grey); if (s < 0) outer.scale.x = -1; o.add(outer); const tp = new T.Mesh(wingShape(0.09, 0.07, 0.03, 0.03), tip); tp.position.x = s * 0.21; if (s < 0) tp.scale.x = -1; tp.position.y = 0.0006; o.add(tp);
    g.userData["w" + (s > 0 ? "R" : "L")] = p; g.userData["o" + (s > 0 ? "R" : "L")] = o; p.userData.s = s;
  }
  return g;
}
R.hooks = R.hooks || {};                                                                                     // R.hooks.sea(t, E, ctx): H4's whales and seabirds hang here
R.types.sea = {
  chip: "SEA", dur: 7, need: {}, pk: "sea", pspeed: 14,
  weight: () => 0,      // dropped from the feed (v277): a skiff's bow and gulls over an empty sea was the one reel the strips showed as dull; the type stays so saved reels still play
  fit: p => p.interests.includes("fish") || p.interests.includes("birds") || p.interests.includes("photos"),
  anchor(c, rng) {
    const cs = c.coast; if (!cs) return null; const dir = H().seaDir(cs.x, cs.z); if (dir === null) return null;
    for (let d = 30; d < 160; d += 10) { const x = cs.x + Math.cos(dir) * d, z = cs.z + Math.sin(dir) * d; if (W().isSea(x, z)) { let ok = true; for (let q = 20; q <= 220; q += 20) if (!W().isSea(x + Math.cos(dir) * q, z + Math.sin(dir) * q)) ok = false; if (!ok) continue; return { x, z, a: yawOf(Math.cos(dir), Math.sin(dir)), place: c.vil.name, h: c.H, s: Math.min(0.55, c.storm + 0.1) }; } }
    return null;
  },
  plan(rec, E) {
    const dur = 7, T = A().THREE, rng = mulb(rec.sd), yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), sw = 0.22 + 0.2 * rec.s, per = 4.4 - rec.s, sp = 3.2;
    const boat = E.extraOf("skiff", skiffMesh), gulls = E.extraOf("gulls", () => { const g = new T.Group(); for (let i = 0; i < 6; i++) { const m = gullMesh(); g.add(m); } return g; });
    const gp = []; for (let i = 0; i < 6; i++) gp.push({ r: 4 + rng() * 6, h: 1.8 + rng() * 3.6, w: (0.35 + rng() * 0.3) * (rng() < 0.5 ? -1 : 1), ph: rng() * TAU, fl: 3.2 + rng() * 1.6, ox: (rng() - 0.5) * 14, oz: 8 + rng() * 14 });
    const BS = { x: 0, z: 0, y: 0, p: 0 }, bs = (t, q) => { const ph = t / per * TAU; q.x = rec.x + fx * sp * t; q.z = rec.z + fz * sp * t; q.y = (W().wlvAt(q.x, q.z) || 0) + 0.25 + sw * 0.5 * Math.sin(ph); q.p = 0.07 * Math.sin(ph + 0.9) * (0.6 + sw * 2); return q; };
    const spr = { n: 80, life: 1.0, size0: 0.12, size1: 0.5, a: 0.6, g: 9, drag: 1.2, spread: 1.3, fn(te, q) { bs(te, BS); const dn = Math.cos(te / per * TAU + 0.9); q.on = clamp(-dn * (0.4 + sw * 3) + 0.1, 0, 1) * clamp(sw * 5, 0.3, 1); q.x = BS.x + fx * 3.6; q.z = BS.z + fz * 3.6; q.y = BS.y + 0.2; q.vx = fx * 0.5; q.vz = fz * 0.5; q.vy = 2.6; } };
    return {
      dur, need: {}, hour: rec.h, storm: rec.s, vig: 0.3,
      frame(t, E) {
        boat.on = true; gulls.on = true; const ph = t / per * TAU, heave = sw * 0.5 * Math.sin(ph), pitch = 0.07 * Math.sin(ph + 0.9) * (0.6 + sw * 2), roll = 0.045 * Math.sin(ph * 0.73 + 1.2);
        const bx = rec.x + fx * sp * t, bz = rec.z + fz * sp * t, by = (W().wlvAt(bx, bz) || 0) + 0.25 + heave;
        boat.m.position.set(bx, by, bz); boat.m.rotation.set(-pitch, yaw, roll, "YXZ");
        for (let i = 0; i < 6; i++) { const q = gp[i], m = gulls.m.children[i], a = q.w * t + q.ph, gx = bx + fx * q.oz + Math.cos(a) * q.r + (-fz) * q.ox * 0.3, gz = bz + fz * q.oz + Math.sin(a) * q.r + fx * q.ox * 0.3, gy = by + q.h + 0.6 * Math.sin(t * 0.7 + q.ph); m.position.set(gx, gy, gz); const dx = -Math.sin(a) * q.w * q.r, dz = Math.cos(a) * q.w * q.r; m.rotation.set(0, Math.atan2(dx, dz), -0.35 * Math.sign(q.w), "YXZ"); const ph = t * q.fl * TAU + q.ph, f = Math.sin(ph) * 0.62, f2 = Math.sin(ph - 0.9) * 0.5; m.userData.wR.rotation.z = -f; m.userData.wL.rotation.z = f; m.userData.oR.rotation.z = -f2 * 1.1; m.userData.oL.rotation.z = f2 * 1.1; }
        if (R.hooks.sea) R.hooks.sea(t, E, { bx, bz, by, yaw });
        const sh = shake(t, 0.5); boat.m.updateMatrixWorld(true); E.v2.set(0, 1.55, 0.7); boat.m.localToWorld(E.v2); const ex = E.v2.x, ey = E.v2.y, ez = E.v2.z, pan = Math.sin(t * 0.45) * 0.22, tx = ex + Math.sin(yaw + pan) * 40, tz = ez + Math.cos(yaw + pan) * 40;
        E.look(ex, ey + sh[1], ez, tx, ey - 1.5 + 0.8 * Math.sin(t * 0.5), tz, 64, roll * 0.8);
        E.emitter(spr);
      }
    };
  },
  cap: (c, v, r) => [`Bow in the swell, gulls on the wake. ${v.place}.`, `Out on the fjord before the weather turns.`, `The sea does what it likes. The gulls follow anyway.`, `Cold hands, good light. ${v.place} from the skiff.`][Math.floor(r() * 4)]
};

/* ---------------- 11. kids sledging down a village bank ---------------- */
function sledgeMesh() {
  const T = A().THREE, g = new T.Group(), wood = new T.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.85 }), steel = new T.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.4, metalness: 0.6 }), red = new T.MeshStandardMaterial({ color: 0xc23a2a, roughness: 0.7 });
  const add = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  add(new T.BoxGeometry(0.46, 0.04, 1.0), wood, 0, 0.17, 0); for (const sx of [-1, 1]) { add(new T.BoxGeometry(0.03, 0.04, 1.2), steel, sx * 0.22, 0.04, 0); const c = add(new T.BoxGeometry(0.03, 0.04, 0.22), steel, sx * 0.22, 0.1, 0.66); c.rotation.x = -0.6; add(new T.BoxGeometry(0.03, 0.13, 0.03), steel, sx * 0.22, 0.1, 0.35); add(new T.BoxGeometry(0.03, 0.13, 0.03), steel, sx * 0.22, 0.1, -0.35); }
  add(new T.BoxGeometry(0.4, 0.02, 0.04), red, 0, 0.2, 0.46); return g;
}
R.types.kidssled = {
  chip: "KIDS", dur: 7, need: { walker: 4 }, pk: "kids", pspeed: 8,
  weight: c => (c.kid ? 4 : c.adultKids ? 1.5 : 0) * (c.snow && c.slope && c.el > -4 && c.hr >= 10 && c.hr <= 21 && c.storm < 0.5 ? 1 : 0),
  fit: p => p.age < 16 || p.age > 25,
  anchor(c, rng) {
    const sl = c.slope; if (!sl) return null; const L = 30, dx = sl.dx, dz = sl.dz;
    for (let s = -34; s <= L; s += 4) if (!openOk(sl.x + dx * s, sl.z + dz * s, 1.4)) return null;
    for (let s = -14; s <= 14; s += 7) for (const lat of [-6, 6]) if (!openOk(sl.x + dx * (L - 12) - dz * lat, sl.z + dz * (L - 12) + dx * lat, 1.0)) return null;
    return { x: sl.x, z: sl.z, a: yawOf(dx, dz), place: c.vil.name, h: c.H, s: Math.min(c.storm, 0.3) };
  },
  plan(rec, E) {
    const yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw), x0 = rec.x - fx * 20, z0 = rec.z - fz * 20, rng = mulb(rec.sd), dur = 7, T = A().THREE;
    const sledges = [E.extraOf("sledgeA", sledgeMesh), E.extraOf("sledgeB", sledgeMesh)];
    const run = { t0: 0.6, a: 1.55, vmax: 8.4, tEnd: 0 };                                                    // the main kid: down the slope from t0, brakes by the bank's foot, tips over at the end
    const sA = t => { const k = Math.max(0, t - run.t0); const tc = run.vmax / run.a, s0 = 0.5 * run.a * tc * tc; return k < tc ? 0.5 * run.a * k * k : s0 + run.vmax * (k - tc); };
    const stopS = 36, tTip0 = 3.5;
    const sMain = t => Math.min(sA(t), t < tTip0 ? 1e9 : 0) + (t >= tTip0 ? sA(tTip0) + 1.8 * (1 - Math.exp(-(t - tTip0) * 2.2)) : 0);
    const spray = { n: 60, life: 0.9, size0: 0.16, size1: 0.6, a: 0.5, g: 5, drag: 2, spread: 1, fn(te, q) { const s = sMain(te); q.on = te > run.t0 && te < tTip0 + 0.5 ? clamp((te - run.t0) / 1.2, 0, 1) : 0; q.x = x0 + fx * (s - 0.6) + lx * 0.2; q.z = z0 + fz * (s - 0.6) + lz * 0.2; q.y = surf(q.x, q.z) + 0.2; q.vx = -fx * 1.5 + lx * 1.2; q.vz = -fz * 1.5 + lz * 1.2; q.vy = 1.5; } };
    const puff = { n: 50, life: 1.0, size0: 0.3, size1: 1.0, a: 0.6, g: 3, drag: 1.5, spread: 1.8, fn(te, q) { const s = sMain(te); q.on = te > tTip0 - 0.1 && te < tTip0 + 1.4 ? 1 : 0; q.x = x0 + fx * s; q.z = z0 + fz * s; q.y = surf(q.x, q.z) + 0.3; q.vx = 0; q.vz = 0; q.vy = 1.2; } };
    const sx = t => x0 + fx * sMain(t), sz = t => z0 + fz * sMain(t);
    return {
      dur, need: { walker: 4 }, hour: rec.h, storm: rec.s, vig: 0.3,
      frame(t, E) {
        const k = E.walkers[0], s = sMain(t), x = x0 + fx * s, z = z0 + fz * s; const slide = t >= run.t0 && t < tTip0;
        // the sledge: down the line, nose along the slope; the kid sits on it, legs out in front, hands on the rope
        const sgA = sledges[0]; sgA.on = true; const yS = surf(x, z), yF = surf(x + fx * 0.7, z + fz * 0.7), yR = surf(x - fx * 0.7, z - fz * 0.7); sgA.m.position.set(x, (yS + yF + yR) / 3, z); sgA.m.rotation.set(-Math.atan2(yF - yR, 1.4), yaw, 0, "YXZ");
        if (t < tTip0 + 0.05) {
          E.walk(k, x, z, yaw); k.on = true; const U = k.U; k.g.position.set(x - fx * 0.12, (yS + yF + yR) / 3 + 0.22 + 0.26, z - fz * 0.12); k.g.rotation.set(-Math.atan2(yF - yR, 1.4), yaw, 0, "YXZ");
          U.legs[0].rotation.set(-1.45, 0, -0.14); U.legs[1].rotation.set(-1.45, 0, 0.14); U.shins[0].rotation.x = 0.15; U.shins[1].rotation.x = 0.15; U.torso.rotation.set(-0.35 + 0.06 * Math.sin(t * 7), 0, 0); U.head.rotation.x = 0.2;
          for (let i = 0; i < 2; i++) { U.arms[i].rotation.set(-0.75, 0, (i ? 1 : -1) * 0.22); U.fore[i].rotation.x = -0.75; }
          k.blob.visible = false; k.blobOn = false;
        } else {                                                                                               // the tip: the sledge stops, the kid goes over it in a roll, lies a moment, then gets up laughing
          const u = t - tTip0, bx = x0 + fx * (s + 0.6), bz = z0 + fz * (s + 0.6), tipR = ease(u / 0.9) * (1 - ease((u - 0.9) / 0.3)); sgA.m.rotation.z = 0.2 * Math.sin(Math.min(1, u * 2.5) * Math.PI);
          const roll = ease(u / 1.0) * 5.4, lay = ease((u - 1.0) / 0.3) * (1 - ease((u - 2.0) / 0.9)), up = ease((u - 1.9) / 0.9);
          E.walk(k, bx + fx * 1.0 * ease(u / 1.0), bz + fz * 1.0 * ease(u / 1.0), yaw + 0.3 * ease(u / 1.4)); const U = k.U, gs = k.g; const gy = surf(bx + fx, bz + fz);
          if (u < 2.8) { gs.rotation.order = "YXZ"; const body = 0.5; gs.rotation.x = u < 1.0 ? roll : (1 - up) * (roll - TAU + 1.0 * 0) + (u < 1.9 ? -0.55 + 0 : 0); if (u >= 1.0) gs.rotation.x = lerp(Math.PI * 0.5 * 0 - 1.4, 0, up) * 1.0; gs.position.y = gy + 0.12 + (1 - Math.cos(Math.min(roll, Math.PI * 2))) * 0.24 * (1 - lay) + 0.3 * (u < 1.0 ? Math.sin(u * 3.14) : 0) + 0.9 * up * 0 ; }
          const flail = (u < 1.1 ? 1 : 0.2) * (1 - up * 0.8), ph = u * 11; U.arms[0].rotation.set(-2.0 * (1 - up) * 0 + Math.sin(ph) * 1.2 * flail - 0.6 * up, 0, -0.9 * flail); U.arms[1].rotation.set(Math.sin(ph + 2) * 1.2 * flail - 0.6 * up, 0, 0.9 * flail); U.legs[0].rotation.set(Math.sin(ph + 1) * 0.9 * flail - 0.4 * (1 - up), 0, -0.2); U.legs[1].rotation.set(Math.sin(ph + 3) * 0.9 * flail - 0.2 * (1 - up), 0, 0.2); U.shins[0].rotation.x = 0.6 * flail; U.shins[1].rotation.x = 0.5 * flail;
          if (u > 2.4) { const lg = ease((u - 2.5) / 0.4); for (let i = 0; i < 2; i++) { U.arms[i].rotation.set(-2.5 * lg + 0.4 * (1 - lg), 0, (i ? 1 : -1) * 0.3 * lg); U.fore[i].rotation.x = -0.4 * lg; } U.torso.rotation.x = -0.15 + 0.2 * Math.sin(u * 14) * lg; gs.position.y += Math.max(0, Math.sin(u * 14)) * 0.1 * lg; }
        }
        E.emitter(spray); E.emitter(puff);
        // two more at the top of the bank: one pulling a sledge up, one watching
        const w1 = E.walkers[1], p1 = Math.min(1, t / 4.5), up1 = -2 + 1.5 * p1; const cx1 = x0 + fx * (stopS * 0.0 + 5.5 + 7 * (1 - p1) * 0 + 10 * (1 - p1)) + lx * 2.6, cz1 = z0 + fz * (5.5 + 10 * (1 - p1)) + lz * 2.6;
        E.walk(w1, cx1, cz1, yaw + Math.PI); const sgB = sledges[1]; sgB.on = true; sgB.m.position.set(cx1 + fx * 1.4, surf(cx1 + fx * 1.4, cz1 + fz * 1.4), cz1 + fz * 1.4); sgB.m.rotation.set(0, yaw + 0.1, 0);
        const w2 = E.walkers[2]; E.walk(w2, x0 + fx * 38 + lx * 3.2, z0 + fz * 38 + lz * 3.2, yaw + Math.PI * 0.8); E.cheer(w2, ease((t - 3.3) / 0.8) * 0.9, t * 1.7, false);
        const w3 = E.walkers[3]; E.walk(w3, x0 + fx * 34 - lx * 3.6, z0 + fz * 34 - lz * 3.6, yaw + Math.PI * 1.1); E.cheer(w3, ease((t - 3.4) / 0.8) * 0.7, t * 1.9 + 1, false);
        // camera: down at the foot of the bank looking up the slope, panning with the sledge as it comes, then holding on the tumble
        const cx = x0 + fx * 41 + lx * 4.6, cz = z0 + fz * 41 + lz * 4.6, cy = surf(cx, cz) + 1.15; const ta = Math.min(s, 38); const tx = x0 + fx * (t < tTip0 ? ta + 2 : s + 1.5), tz = z0 + fz * (t < tTip0 ? ta + 2 : s + 1.5);
        const sh = shake(t, 0.8); E.look(cx, cy + sh[1], cz, tx + sh[0] * 6, surf(tx, tz) + 0.9, tz, 58, 0);
      }
    };
  },
  cap: (c, v, r) => [`Fourth time down the bank and I finally fell off. Worth it.`, `The hill behind ${v.place} is ours today. Mind the bottom.`, `He said he would steer. He did not steer.`, `Tumble at the bottom, laughing for ten minutes.`][Math.floor(r() * 4)]
};

/* ---------------- 12. powder turn ---------------- */
R.types.powder = {
  chip: "POWDER", dur: 6.5, need: { sled: 1 }, pk: "powder", pspeed: 20, notyet: false,
  weight: c => (c.int.sled || c.int.racing) && c.snow && c.el > -2 && c.storm < 0.4 && c.depth > 0.2 ? 2.4 + (c.int.racing ? 1.5 : 0) : 0,
  fit: p => p.interests.includes("sled") || p.interests.includes("racing"),
  anchor(c, rng) {
    const v = c.vil; for (let k = 0; k < 120; k++) {
      const a = rng() * TAU, r = 400 + rng() * 2400, x = v.x + Math.cos(a) * r, z = v.z + Math.sin(a) * r; if (!openOk(x, z, 4)) continue;
      const gx = (surf(x + 8, z) - surf(x - 8, z)) / 16, gz = (surf(x, z + 8) - surf(x, z - 8)) / 16, g = Math.hypot(gx, gz); if (g < 0.14 || g > 0.34) continue; const dx = -gx / g, dz = -gz / g, yaw = yawOf(dx, dz); let ok = true;
      for (let s = -20; s <= 80; s += 6) if (!openOk(x + dx * s, z + dz * s, 2.4) || W().slopeAt(x + dx * s, z + dz * s, 6) > 0.45 || W().slopeAt(x + dx * s, z + dz * s, 6) < 0.05) ok = false; for (const lat of [-12, 12]) if (!openOk(x - dz * lat + dx * 30, z + dx * lat + dz * 30, 1.5)) ok = false;
      if (ok) return { x, z, a: yaw, place: v.name, h: c.H, s: Math.min(c.storm, 0.2) };
    }
    return null;
  },
  plan(rec, E) {
    const yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw), dur = 6.5, rng = mulb(rec.sd), dir = rng() < 0.5 ? 1 : -1, V = 12.5, x0 = rec.x, z0 = rec.z;
    // the line: down the fall line, then a deep carve across it (a turn of about 120 degrees at 16 m radius) and out
    const path = (t, q) => { const s = t * V * 0.9; const sT = 24, R = 15; if (s < sT) { q.x = x0 + fx * s; q.z = z0 + fz * s; q.yaw = yaw; q.turn = 0; } else { const arc = Math.min((s - sT) / R, 2.1), a = yaw + dir * arc; q.yaw = a; const cx = x0 + fx * sT + lx * dir * R, cz = z0 + fz * sT + lz * dir * R; const th = Math.atan2(-lz * dir, -lx * dir) ; const px = -lx * dir * R, pz = -lz * dir * R; const ca = Math.cos(dir * arc), sa = Math.sin(dir * arc); q.x = cx + (px * ca - pz * sa * 0) ; q.z = cz; const rx = px, rz = pz; /* rotate (rx,rz) about y by -dir*arc */ const ang = -dir * arc; q.x = cx + rx * Math.cos(ang) - rz * Math.sin(ang); q.z = cz + rx * Math.sin(ang) + rz * Math.cos(ang); q.turn = dir * 0.8 * (s - sT < R * 2.1 ? 1 : 0); if ((s - sT) / R > 2.1) { const e = s - sT - R * 2.1; q.x += Math.sin(a) * e; q.z += Math.cos(a) * e; q.turn = 0; } } q.speed = V; return q; };
    const Q = { x: 0, z: 0, yaw: 0, turn: 0, speed: V }, Q2 = { x: 0, z: 0, yaw: 0, turn: 0, speed: V };
    const sheet = { n: 300, life: 2.0, size0: 0.5, size1: 2.0, a: 0.55, g: 3, drag: 0.8, spread: 2.4, fn(te, q) { path(te, Q2); const f = Math.sin(Q2.yaw), g = Math.cos(Q2.yaw), l = Math.cos(Q2.yaw), m = -Math.sin(Q2.yaw), sd = -Math.sign(Q2.turn || 1); q.on = te > 1.2 ? (Q2.turn ? 1 : 0.35) : 0; q.x = Q2.x - f * 1.6 + l * sd * 0.4; q.z = Q2.z - g * 1.6 + m * sd * 0.4; q.y = surf(q.x, q.z) + 0.4; q.vx = l * sd * (5 + (Q2.turn ? 3 : 0)) - f * 3; q.vz = m * sd * (5 + (Q2.turn ? 3 : 0)) - g * 3; q.vy = 4.0 + (Q2.turn ? 2.5 : 0); } };
    const roost = R.roostSpec(null, 0, (P, i, te, o) => { path(te, Q2); o.x = Q2.x; o.z = Q2.z; o.yaw = Q2.yaw; o.speed = Q2.speed; o.turn = Q2.turn; }, 0.35);
    const camL = { x: x0 + fx * 52 + lx * -dir * 7, z: z0 + fz * 52 + lz * -dir * 7 };
    return {
      dur, need: { sled: 1 }, hour: rec.h, storm: rec.s, vig: 0.32,
      frame(t, E) {
        path(t, Q); const a = E.sleds[0]; E.placeSled(a, Q.x, Q.z, Q.yaw, Q.speed, Q.turn, true, { lean: Q.turn ? 0.25 : 0.1 }); a.body.rotation.z = -Q.turn * 0.5 * 0 + a.body.rotation.z; if (Q.turn) a.body.rotation.z = -dir * 0.5; E.sledLights(a, false, false, 0); E.belt = t * 12;
        E.emitter(sheet); E.emitter(roost);
        const cx = x0 + fx * 62 + lx * dir * 4, cz = z0 + fz * 62 + lz * dir * 4, cy = surf(cx, cz) + 0.9; const sh = shake(t, 1);
        E.look(cx, cy + sh[1], cz, Q.x + fx * 1, surf(Q.x, Q.z) + 1.3, Q.z + fz * 1, 56, 0);
      }
    };
  },
  cap: (c, v, r) => [`Carving a deep one below the ridge. The powder hung in the light.`, `Fresh snow, full lean, and nobody else on the hill.`, `That turn was a little bit of luck and a lot of snow.`, `Shot from the bottom: snow in the air, sled somewhere inside it.`][Math.floor(r() * 4)]
};


/* ---------------- revisions after the first strips ---------------- */
// 6. reindeer: a shallow pit, the camera at the bottom looking toward the rim; one reindeer WALKS up, stops with its forefeet at the edge, reaches down, sniffs, licks the lens, lifts away
R.types.reindeer.plan = function (rec, E) {
  const hx = rec.x, hz = rec.z, ang = rec.a, dur = 7, yaw0 = yawOf(Math.cos(ang), Math.sin(ang)), g0 = surf(hx, hz), T = A().THREE, fx = Math.sin(yaw0), fz = Math.cos(yaw0), face = yaw0 + Math.PI, rng = mulb(rec.sd);
  const hole = E.extraOf("snowhole", () => { const g = new T.Group(), mat = new T.MeshLambertMaterial({ color: 0xe6edf5, emissive: 0x7a8ea6, side: T.BackSide }); const cyl = new T.Mesh(new T.CylinderGeometry(0.7, 0.95, 1.5, 22, 1, true), mat); cyl.position.y = -0.45; g.add(cyl); const rim = new T.Mesh(new T.TorusGeometry(0.8, 0.17, 8, 26), new T.MeshLambertMaterial({ color: 0xf2f6fb, emissive: 0x5a6a80 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.12; g.add(rim); return g; });
  hole.m.position.set(hx, g0, hz); const d = E.deer[0], q = d.q, DD0 = 3.9, DD1 = 1.62, tw0 = 0.5, tw1 = 3.0;
  const dd = t => t < tw0 ? DD0 : t < tw1 ? lerp(DD0, DD1, ease((t - tw0) / (tw1 - tw0))) : DD1 - 0.05 * ease((t - 3.2) / 0.6) + 0.35 * ease((t - 5.2) / 1.2);
  const spd = t => { const e = 0.04; return -(dd(t + e) - dd(t - e)) / (2 * e); };
  const sn = new T.Vector3();
  return {
    dur, need: { deer: 1 }, hour: rec.h, storm: rec.s, vig: 0.42,
    frame(t, E) {
      hole.on = true; const D = dd(t), v = t > tw0 && t < tw1 + 0.2 ? Math.max(0, spd(t)) : 0;
      const reach = ease((t - 2.5) / 0.9) * (1 - ease((t - 5.0) / 1.0)), lick = ease((t - 3.6) / 0.3) * (1 - ease((t - 5.0) / 0.4)), lift = ease((t - 5.0) / 1.0);
      E.deerPlace(d, hx + fx * D, hz + fz * D, face, v, 0, E.dt || 0.04);
      q.neck.rotation.x = lerp(-0.45, 1.45, reach) + 0.05 * Math.sin(t * 2.6) * (1 - reach) - 0.3 * lift; q.head.rotation.x = lerp(0.55, 1.25, reach) + 0.12 * Math.sin(t * 5.2) * lick; q.body.rotation.x = 0.4 * reach; q.body.position.y = 0.8 - 0.16 * reach;
      if (reach > 0.01) { q.g.updateMatrixWorld(true); E.v3.set(0, -0.06, 0.34); q.head.localToWorld(E.v3); q.g.position.x += (hx + fx * 0.28 - E.v3.x) * reach; q.g.position.z += (hz + fz * 0.28 - E.v3.z) * reach; q.g.position.y += (g0 - 0.02 - E.v3.y) * reach * 0.8; }
      d.tongue.visible = lick > 0.02; d.tongue.position.set(0, -0.15, 0.4); d.tongue.rotation.set(Math.PI / 2 + 0.2 + 0.25 * Math.sin(t * 11) * lick, 0, 0); d.tongue.scale.set(1, 0.3 + 1.7 * lick * (0.65 + 0.35 * Math.sin(t * 10)), 1);
      const cy = g0 - 0.3, sh = shake(t, 0.5);
      E.look(hx, cy, hz, hx + fx * 0.6, cy + 0.9, hz + fz * 0.6, 80, 0.03 * Math.sin(t * 1.4));
      E.flakes(0.4, -1.0, 0.2, 0.75, 0.03, [4, 4, 4], 1.5);
    },
    post(g, t, w, h) {
      const sn = ease((t - 2.9) / 0.5) * (1 - ease((t - 3.7) / 0.5)), sm = ease((t - 4.0) / 0.4) * (1 - ease((t - 5.4) / 1.6));
      if (sn > 0.01) { const r = g.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, h * 0.55); r.addColorStop(0, `rgba(238,244,250,${0.6 * sn})`); r.addColorStop(1, "rgba(238,244,250,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); }
      if (sm > 0.01) { g.save(); g.globalAlpha = 0.34 * sm; g.fillStyle = "#d9dfe6"; for (let i = 0; i < 7; i++) { const yy = h * (0.2 + 0.6 * ((i * 0.37 + 0.13) % 1)), ww = w * (0.5 + 0.4 * ((i * 0.53) % 1)); g.beginPath(); g.ellipse(w * 0.5 + Math.sin(i * 2.1) * 40, yy, ww * 0.5, 16 + 8 * (i % 3), Math.sin(i) * 0.4, 0, TAU); g.fill(); } g.restore(); g.fillStyle = `rgba(230,232,236,${0.12 * sm})`; g.fillRect(0, 0, w, h); }
    }
  };
};

// 11. kids sledging: the run is short (a village bank), so the camera stands beside its foot and the kid comes down straight at it, tips at the bottom within a few metres of the lens
R.types.kidssled.plan = function (rec, E) {
  const yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw), x0 = rec.x - fx * 6, z0 = rec.z - fz * 6, dur = 7;
  const sledges = [E.extraOf("sledgeA", sledgeMesh), E.extraOf("sledgeB", sledgeMesh)], t0 = 0.4, acc = 2.3, tTip = 3.4, vmax = 7.5;
  const sA = t => { const k = Math.max(0, Math.min(t, tTip) - t0), tc = vmax / acc; return k < tc ? 0.5 * acc * k * k : 0.5 * acc * tc * tc + vmax * (k - tc); };
  const sMain = t => t < tTip ? sA(t) : sA(tTip) + 2.2 * (1 - Math.exp(-(t - tTip) * 2.4));
  const tmp = { x: 0, z: 0 };
  const spray = { n: 70, life: 0.9, size0: 0.18, size1: 0.7, a: 0.55, g: 5, drag: 2, spread: 1.1, fn(te, q) { const s = sMain(te); q.on = te > t0 && te < tTip + 0.6 ? clamp((te - t0) / 0.9, 0, 1) : 0; q.x = x0 + fx * (s - 0.7); q.z = z0 + fz * (s - 0.7); q.y = surf(q.x, q.z) + 0.2; q.vx = -fx * 1.6 + lx * 1.4; q.vz = -fz * 1.6 + lz * 1.4; q.vy = 1.6; } };
  const puff = { n: 60, life: 1.1, size0: 0.35, size1: 1.2, a: 0.65, g: 3, drag: 1.5, spread: 2.0, fn(te, q) { const s = sMain(te); q.on = te > tTip - 0.1 && te < tTip + 1.5 ? 1 : 0; q.x = x0 + fx * s; q.z = z0 + fz * s; q.y = surf(q.x, q.z) + 0.3; q.vx = 0; q.vz = 0; q.vy = 1.3; } };
  const endU = sA(tTip) + 2.2, cu = endU + 3.4, camLat = 3.4;
  return {
    dur, need: { walker: 4 }, hour: rec.h, storm: rec.s, vig: 0.3,
    frame(t, E) {
      const k = E.walkers[0], s = sMain(t), x = x0 + fx * s, z = z0 + fz * s, yS = surf(x, z), yF = surf(x + fx * 0.7, z + fz * 0.7), yR = surf(x - fx * 0.7, z - fz * 0.7), pit = -Math.atan2(yF - yR, 1.4), U = k.U, gs = k.g;
      const sgA = sledges[0]; sgA.on = true; sgA.m.position.set(x, (yS + yF + yR) / 3, z); sgA.m.rotation.set(pit, yaw, 0, "YXZ");
      if (t < tTip + 0.02) {
        E.walk(k, x, z, yaw); gs.position.set(x - fx * 0.1, (yS + yF + yR) / 3 + 0.3, z - fz * 0.1); gs.rotation.set(pit, yaw, 0, "YXZ");
        U.legs[0].rotation.set(-1.4, 0, -0.14); U.legs[1].rotation.set(-1.4, 0, 0.14); U.shins[0].rotation.x = 0.2; U.shins[1].rotation.x = 0.2; U.torso.rotation.set(-0.3 + 0.05 * Math.sin(t * 8), 0, 0); U.head.rotation.x = 0.15;
        for (let i = 0; i < 2; i++) { U.arms[i].rotation.set(-0.75, 0, (i ? 1 : -1) * 0.2); U.fore[i].rotation.x = -0.8; }
        k.blob.visible = false; k.blobOn = false;
      } else {                                                                                             // the sledge stops and tips; the kid goes over it in a forward roll, lies a moment, then sits up and gets to their feet laughing
        const u = t - tTip, ro = ease(u / 0.9), lay = ease((u - 0.9) / 0.25) * (1 - ease((u - 1.7) / 0.6)), up = ease((u - 1.6) / 0.9), lau = ease((u - 2.3) / 0.4);
        sgA.m.rotation.z = 0.35 * Math.sin(Math.min(1, u * 2.2) * Math.PI) * (u < 0.9 ? 1 : 0);
        const bx = x + fx * 1.1 * ro, bz = z + fz * 1.1 * ro; E.walk(k, bx, bz, yaw + 0.5 * ease(u / 1.8)); const gy = surf(bx, bz);
        gs.rotation.order = "YXZ"; const rollA = ro * TAU * 0.84;                                                // 0 -> ~300 degrees forward, ending on the back
        const roll = u < 1.0 ? rollA : lerp(rollA - TAU, 0, up) * (1 - 0) + (u < 1.6 ? 0 : 0);
        gs.rotation.x = u < 1.0 ? rollA : lerp(-1.55, 0, up); gs.position.set(bx, gy + (u < 1.0 ? 0.28 + 0.34 * Math.sin(ro * Math.PI) + 0.12 * (1 - Math.cos(rollA)) * 0.5 : lerp(0.2, 0, up)), bz);
        const fl = (u < 1.1 ? 1 : 0.15) * (1 - up * 0.85), ph = u * 12;
        U.arms[0].rotation.set(Math.sin(ph) * 1.2 * fl - 0.9 * lay * 0 + 0.4 * (1 - up) * 0, 0, -0.9 * fl); U.arms[1].rotation.set(Math.sin(ph + 2) * 1.2 * fl, 0, 0.9 * fl);
        U.legs[0].rotation.set(Math.sin(ph + 1) * 0.9 * fl - 0.45 * (1 - up), 0, -0.2); U.legs[1].rotation.set(Math.sin(ph + 3) * 0.9 * fl - 0.2 * (1 - up), 0, 0.2); U.shins[0].rotation.x = 0.7 * fl + 0.5 * (1 - up) * lay; U.shins[1].rotation.x = 0.6 * fl + 0.3 * (1 - up) * lay; U.torso.rotation.set(-0.2 * (1 - up), 0, 0);
        if (u > 2.2) { for (let i = 0; i < 2; i++) { U.arms[i].rotation.set(-2.5 * lau + 0.3 * (1 - lau), 0, (i ? 1 : -1) * 0.3 * lau); U.fore[i].rotation.x = -0.4 * lau; } U.torso.rotation.set(-0.12 + 0.18 * Math.sin(u * 15) * lau, 0, 0); U.head.rotation.x = -0.2 * lau; gs.position.y += Math.max(0, Math.sin(u * 15)) * 0.12 * lau; }
        k.blob.visible = true; k.blobOn = true;
      }
      E.emitter(spray); E.emitter(puff);
      const w1 = E.walkers[1], pu = Math.min(1, t / 3.0), ux = 9 * (1 - pu) - 3; E.walk(w1, x0 + fx * (ux + 4) + lx * 3.2, z0 + fz * (ux + 4) + lz * 3.2, yaw + Math.PI); const sgB = sledges[1]; sgB.on = true; sgB.m.position.set(x0 + fx * (ux + 5.6) + lx * 3.2, surf(x0 + fx * (ux + 5.6), z0 + fz * (ux + 5.6)), z0 + fz * (ux + 5.6) + lz * 3.2); sgB.m.rotation.set(0, yaw + 0.05, 0);
      const w2 = E.walkers[2]; E.walk(w2, x0 + fx * (endU - 0.5) - lx * 2.6, z0 + fz * (endU - 0.5) - lz * 2.6, yaw + Math.PI * 0.9 + 0.3); E.cheer(w2, 0.25 + 0.7 * ease((t - tTip) / 0.6), t * 1.7, false);
      const w3 = E.walkers[3]; E.walk(w3, x0 + fx * (endU - 4) - lx * 3.3, z0 + fz * (endU - 4) - lz * 3.3, yaw + Math.PI * 1.1); E.cheer(w3, 0.2 + 0.6 * ease((t - tTip) / 0.8), t * 1.9 + 1, false);
      const cx = x0 + fx * cu + lx * camLat, cz = z0 + fz * cu + lz * camLat, cy = surf(cx, cz) + 1.05, aimS = t < tTip ? s + 1.5 : s + 0.8, tx = x0 + fx * aimS, tz = z0 + fz * aimS, sh = shake(t, 0.8);
      E.look(cx, cy + sh[1], cz, tx + sh[0] * 6, surf(tx, tz) + 0.8, tz, 64, 0);
    }
  };
};
// 12. powder turn: a tighter arc, the camera low and close below it
R.types.powder.plan = function (rec, E) {
  const yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw), dur = 6.5, rng = mulb(rec.sd), dir = rng() < 0.5 ? 1 : -1, V = 11.5, x0 = rec.x, z0 = rec.z, sT = 22, Rr = 11, ARC = 2.2;
  const path = (t, q) => { const s = Math.max(0, t) * V; if (s < sT) { q.x = x0 + fx * s; q.z = z0 + fz * s; q.yaw = yaw; q.turn = 0; } else { const arc = Math.min((s - sT) / Rr, ARC), cx = x0 + fx * sT + lx * dir * Rr, cz = z0 + fz * sT + lz * dir * Rr, rx = -lx * dir * Rr, rz = -lz * dir * Rr, ang = -dir * arc, a = yaw + dir * arc; q.yaw = a; q.x = cx + rx * Math.cos(ang) - rz * Math.sin(ang); q.z = cz + rx * Math.sin(ang) + rz * Math.cos(ang); q.turn = arc < ARC ? dir : 0; if ((s - sT) / Rr > ARC) { const e = s - sT - Rr * ARC; q.x += Math.sin(a) * e; q.z += Math.cos(a) * e; } } q.speed = V; return q; };
  const Q = { x: 0, z: 0, yaw: 0, turn: 0, speed: V }, Q2 = { x: 0, z: 0, yaw: 0, turn: 0, speed: V };
  const sheet = { n: 420, life: 2.0, size0: 0.9, size1: 3.4, a: 0.5, g: 2.0, drag: 0.9, spread: 3.6, fn(te, q) { path(te, Q2); const f = Math.sin(Q2.yaw), g = Math.cos(Q2.yaw), l = Math.cos(Q2.yaw), m = -Math.sin(Q2.yaw), sd = -(Q2.turn || dir); q.on = te > 1.5 ? (Q2.turn ? 1 : 0.3) : 0; q.x = Q2.x - f * 1.5 + l * sd * 0.5; q.z = Q2.z - g * 1.5 + m * sd * 0.5; q.y = surf(q.x, q.z) + 0.4; q.vx = l * sd * (5.5 + (Q2.turn ? 3 : 0)) - f * 3; q.vz = m * sd * (5.5 + (Q2.turn ? 3 : 0)) - g * 3; q.vy = 2.2 + (Q2.turn ? 1.6 : 0); } };
  const roost = R.roostSpec(null, 0, (P, i, te, o) => { path(te, Q2); o.x = Q2.x; o.z = Q2.z; o.yaw = Q2.yaw; o.speed = Q2.speed; o.turn = Q2.turn; }, 0.4);
  const cx = x0 + fx * (sT + 1.5) + lx * dir * (Rr + 2.2), cz = z0 + fz * (sT + 1.5) + lz * dir * (Rr + 2.2);
  return {
    dur, need: { sled: 1 }, hour: rec.h, storm: rec.s, vig: 0.32,
    frame(t, E) {
      path(t, Q); const a = E.sleds[0]; E.placeSled(a, Q.x, Q.z, Q.yaw, Q.speed, Q.turn, true, { lean: Q.turn ? 0.25 : 0.1 }); if (Q.turn) a.body.rotation.z = -dir * 0.55; E.sledLights(a, false, false, 0); E.belt = t * 12;
      E.emitter(sheet); E.emitter(roost); const cy = surf(cx, cz) + 0.85, sh = shake(t, 1);
      E.look(cx, cy + sh[1], cz, Q.x, surf(Q.x, Q.z) + 1.1, Q.z, 58, 0);
    }
  };
};

})();
