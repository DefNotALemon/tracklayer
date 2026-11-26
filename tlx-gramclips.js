// Tracklayer: Gram's clips (goal G7, loop/HOME.md H2R-b). The reels of the moment table: each is a CLIP of a moment, the same people, place, hour and light plan as the photo of that moment (a row of TLXGK.kinds
// whose id is also a reel type) or a moment that only moves (wheelie, roof slide, bonfire, dig-out). A clip is a plan like the photos' (tlx-gramkinds.js): { dur, need, hour, storm, light, frame(t, E) } with every
// actor a closed-form function of the clip time t, so a loop is exact; people walk with the kit's own gait from the ground they cover (E.walk), animals gait from their speed, sleds spin their track belt
// (E.belt) and throw roost, and the clip's recipe (kind, people, place, hour, seed) is the same few numbers the photo keeps. Registered into TLXRL.types, which the reel engine, director and tab already speak.
(() => {
"use strict";
const K = window.TLXGK, R = window.TLXRL; if (!K || !R) return;
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, ease = R.ease, mulb = R.mulb, SP = K.spot;
const GH = () => window.TLXGR.H, A = () => GH().A, W = () => GH().A.world, T = () => GH().A.THREE, surf = (x, z) => W().surf(x, z), who = id => GH().who(id);
const openOk = (x, z, r) => GH().openOk(x, z, r), sunEl = h => A().sunEl(((h % 24) + 24) % 24);
const NIGHT = h => clamp((4 - sunEl(h)) / 14, 0, 1);
const yawOfAz = az => Math.atan2(Math.cos(az), Math.sin(az)), opp = az => az + Math.PI;
const _v = () => new (T().Vector3)();
const shake = (t, k) => [Math.sin(t * 9.1) * 0.012 * k, Math.sin(t * 7.3 + 1) * 0.01 * k];
const frac = x => x - Math.floor(x);
// a moving figure: dressed from its person and walking with the kit's gait from the ground it covers
function mover(E, slot, p, x, z, yaw, o) { const w = E.walkers[slot], L = K.dress(w, p, o || {}); E.walk(w, x, z, yaw, L.sc); K.grin(w, o && o.smile !== undefined ? o.smile : 0.5); return w; }
const blink = (w, t, ph) => { if (!w.faceFx) return; const b = frac(t / 2.7 + (ph || 0)) > 0.94 ? 0.15 : 1; for (const e of w.faceFx.userData.eyes) e.scale.y = b * (e.scale.y > 0.5 || b < 1 ? 1 : 1); };
const mk = (E, x, y, z) => E.marks.push([x, y, z]);
const sled = (E, i, x, z, yaw, v, turn, o) => { const a = E.sleds[i]; E.placeSled(a, x, z, yaw, v, turn || 0, v > 2, o); return a; };
// snow thrown up from a point: closed form in the throw time; on(te) 0..1, pos(te, q) sets q.x/y/z and the velocity
const puff = (E, n, life, s0, s1, a, g, fn) => E.emitter({ n, life, size0: s0, size1: s1, a, g: g === undefined ? 5 : g, drag: 1.5, spread: 1.4, fn });
const D = {};                                                                                           // the clips by id

function def(id, o) {
  D[id] = o;
  R.types[id] = {
    chip: o.chip, dur: o.dur, need: o.need || {}, pk: o.pk || "view", pspeed: o.pspeed || 8, moment: true, row: o, weight: o.w, fit: o.fit || (() => true),
    anchor(c, rng) { const a = o.anchor(c, rng); if (!a) return null; return Object.assign({ h: c.H, s: Math.min(c.storm, 0.9), w: [c.p.id], v: 0 }, a); },
    plan(rec, E) { const Sc = o.plan(rec, E); if (Sc) { Sc.dur = Sc.dur || o.dur; Sc.light = Sc.light || {}; Sc.lit = true; } return Sc; },
    cap: o.capfn || null
  };
}
K.defClip = def;

/* ---------------- a photo kind's clip: the same row, the same anchor ---------------- */
function linked(id, o) {
  const row = K.kinds[id]; if (!row) return;
  def(id, Object.assign({ chip: row.chip, fam: row.fam, pk: row.paint, w: c => row.w(c), anchor: (c, rng) => { const a = row.anchor(c, rng); return a && { x: a.x, z: a.z, a: a.a, w: a.w || [c.p.id], v: a.v === undefined ? 0 : a.v, place: a.place, k: a.k }; }, cap: row.cap, cm: row.cm, vars: row.vars }, o));
}

/* ---- 1. summit selfie: a handheld video, the view sliding behind, a glance over the shoulder, a wave, a blink ---- */
linked("summitselfie", { dur: 6, need: { walker: 1 }, pspeed: 4,
  plan(rec, E) {
    const p = who(rec.w[0]), az = rec.a, fy = yawOfAz(opp(az)), r = mulb(rec.sd), fov = 62 + r() * 6, wave = r() < 0.75, night = NIGHT(rec.h), dur = 6;
    return { dur, need: { walker: 1 }, hour: rec.h, storm: rec.s, vig: 0.14,
      frame(t, E) {
        K.begin(E); const w = K.person(E, 0, p, rec.x, rec.z, fy, { warm: false }), U = w.U, ph = t / dur * TAU;
        const look = ease((t - 2.1) / 0.5) * (1 - ease((t - 3.5) / 0.5)), wv = ease((t - 0.6) / 0.4) * (1 - ease((t - 2.0) / 0.4)), big = 0.8 + 0.5 * Math.max(0, Math.sin(ph * 2 - 0.5));
        K.grin(w, clamp(big, 0.6, 1.3)); blink(w, t, 0);
        U.head.rotation.set(-0.05 + 0.04 * Math.sin(ph * 2), 0.55 * look + 0.1 * Math.sin(ph), 0.08 + 0.05 * Math.sin(ph * 3)); U.torso.rotation.set(-0.04, 0.12 * look, 0.03 * Math.sin(ph * 2));
        armTo(w, 1, 0.26 + 0.01 * Math.sin(t * 3.1), 0.48 + 0.012 * Math.sin(t * 2.3), 0.4);
        if (wave) { U.arms[0].rotation.set(lerp(-0.2, -2.3 - 0.15 * Math.sin(t * 9), wv), 0, lerp(-0.1, -0.35, wv)); U.fore[0].rotation.set(lerp(-0.2, -0.45 - 0.35 * Math.sin(t * 9), wv), 0, 0); } else armTo(w, 0, -0.16, 0.5 + 0.1 * wv, 0.2);
        w.g.updateMatrixWorld(true); const c = _v().set(0.3 + 0.012 * Math.sin(t * 5.3), 0.6 + 0.012 * Math.sin(t * 4.1), 0.5); U.torso.localToWorld(c); const h = K.headPos(w, _v()), sc = w.g.scale.x, yw = 0.4 * Math.sin(ph) + 0.2 * Math.sin(ph * 3);
        const dx = h.x - c.x, dz = h.z - c.z, d = Math.hypot(dx, dz), ca = Math.atan2(dx, dz) + yw * 0.35, tx = c.x + Math.sin(ca) * d, tz = c.z + Math.cos(ca) * d;
        E.look(c.x, c.y, c.z, tx, h.y + 0.1 * sc - 0.05 * Math.sin(ph * 2), tz, fov, 0.05 * Math.sin(ph * 2) + 0.03 * Math.sin(t * 3)); mk(E, h.x, h.y + 0.14 * sc, h.z); mk(E, h.x, h.y - 0.42 * sc, h.z); E.faces.push({ x: h.x, y: h.y, z: h.z, yaw: w.o.yaw }); E.needH = 0.29;
      } };
  } });
const armTo = K.armTo;

/* ---- 2. the kid with the sled: walks up the hill into the lens pulling it, laughs ---- */
linked("kidgrin", { dur: 6, need: { walker: 1 }, pspeed: 6,
  plan(rec, E) {
    const p = who(rec.w[0]), az = rec.a, r = mulb(rec.sd), col = [0xd8352a, 0x2a6ad0, 0xe0a020, 0x2fa05a][Math.floor(r() * 4)], dur = 6, D0 = 9, D1 = 1.15, v = 1.55, tS = (D0 - D1) / v;
    const dx = Math.cos(az), dz = Math.sin(az), fy = Math.atan2(-dx, -dz), cx = rec.x, cz = rec.z;
    const dist = t => Math.max(D1, D0 - v * Math.min(t, tS) - 0.15 * Math.max(0, t - tS) * 0);
    return { dur, need: { walker: 1 }, hour: rec.h, storm: rec.s, vig: 0.16,
      frame(t, E) {
        K.begin(E); const d = dist(t), x = cx + dx * d, z = cz + dz * d, w = mover(E, 0, p, x, z, fy, { bn: 0, smile: 0.8 }), U = w.U, stop = ease((t - tS) / 0.4), lau = ease((t - tS - 0.2) / 0.6) * (1 - ease((t - 5.3) / 0.5));
        K.grin(w, 0.7 + 0.65 * lau); blink(w, t, 0.3); const sc = w.g.scale.x;
        U.arms[1].rotation.set(lerp(-0.5 * 0 + U.arms[1].rotation.x, -0.55, 0.9), 0, 0.12); U.fore[1].rotation.set(-0.5, 0, 0);                 // the hand on the rope
        if (stop > 0.01) { U.arms[0].rotation.set(lerp(U.arms[0].rotation.x, -2.4 + 0.12 * Math.sin(t * 6), stop), 0, lerp(U.arms[0].rotation.z, 0.3, stop)); U.fore[0].rotation.set(lerp(U.fore[0].rotation.x, -0.35, stop), 0, 0); U.head.rotation.set(-0.12 * lau, 0.05 * Math.sin(t * 2), 0.08 * Math.sin(t * 7) * lau); U.torso.rotation.x += -0.06 * lau; }
        const lag = dist(t - 0.35), sx = cx + dx * (lag + 1.65), sz = cz + dz * (lag + 1.65), sy = Math.atan2(dx, dz); K.prop(E, "plasticSled", 0, sx, sz, sy + Math.PI, { c: col, key: "k" + col, rx: 0 });
        const h = K.headPos(w, _v()); E.look(cx, surf(cx, cz) + 1.0, cz, h.x, h.y - 0.25 * sc * (1 - stop * 0.4), h.z, 50, 0.02 * Math.sin(t)); mk(E, h.x, h.y + 0.13 * sc, h.z); mk(E, x, surf(x, z), z); E.faces.push({ x: h.x, y: h.y, z: h.z, yaw: w.o.yaw }); E.needH = d > 4 ? 0.12 : 0.26;
      } };
  } });

/* ---- 3. off the cornice, mid-air: the run-up, the lip, a long flight nose-up then nose-down, the powder burst ---- */
linked("cornice", { dur: 5, need: { sled: 1 }, pspeed: 20,
  plan(rec, E) {
    const r = mulb(rec.sd), yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, v = 14, side = r() < 0.5 ? 1 : -1, night = NIGHT(rec.h), tL = 1.7, tF = 1.5, dur = 5, x0 = rec.x + fx * 6, z0 = rec.z + fz * 6;
    const S = t => v * (t - tL), lift = t => t > tL && t < tL + tF ? 3.0 * Math.sin(Math.PI * (t - tL) / tF) * (1 - 0.0) : 0, pit = t => t > tL && t < tL + tF ? 0.32 * Math.cos(Math.PI * (t - tL) / tF) : 0;
    return { dur, need: { sled: 1 }, hour: rec.h, storm: rec.s, vig: 0.22,
      frame(t, E) {
        K.begin(E); const s = S(t), x = x0 + fx * s, z = z0 + fz * s, a = sled(E, 0, x, z, yaw, v, 0.2 * side * Math.sin(t * 1.3), { lean: 0.2 + 0.2 * Math.sin(Math.PI * clamp((t - tL) / tF, 0, 1)), glance: 0.05 }); E.belt = s * 1.1; a.g.position.y += lift(t); a.g.rotation.x -= pit(t); a.g.rotation.z = 0.05 * side * Math.sin(t * 3); E.sledLights(a, true, true, night); if (t > tL && t < tL + tF) a.blob.visible = false;
        puff(E, 110, 1.3, 0.3, 1.3, 0.6, 5, (te, q) => { const ss = S(te); q.on = te < tL ? 1 : 0.0; q.x = x0 + fx * ss - fx * 1.6 + lx * (r() * 0 + 0.3 * Math.sin(te * 40)); q.z = z0 + fz * ss - fz * 1.6; q.y = surf(q.x, q.z) + 0.3; q.vx = -fx * 2.5; q.vz = -fz * 2.5; q.vy = 2.6; });
        const xl = x0 + fx * S(tL + tF), zl = z0 + fz * S(tL + tF); puff(E, 220, 1.9, 0.4, 2.2, 0.72, 3.5, (te, q) => { q.on = te > tL + tF - 0.05 && te < tL + tF + 1.1 ? 1 : 0; const ss = S(Math.max(te, tL + tF)); q.x = x0 + fx * ss - fx * 0.8; q.z = z0 + fz * ss - fz * 0.8; q.y = surf(q.x, q.z) + 0.2; q.vx = lx * side * 3 * (Math.sin(te * 70)) - fx * 1.5; q.vz = lz * side * 3 * Math.sin(te * 70) - fz * 1.5; q.vy = 3.4 + Math.abs(Math.sin(te * 53)) * 2; });
        const cx = rec.x + fx * 14 + lx * side * 5.6, cz = rec.z + fz * 14 + lz * side * 5.6, py = surf(x, z) + lift(t) + 0.9, ay = lerp(0.9, 0, ease((t - 3.3) / 0.6)); E.look(cx, surf(cx, cz) + 1.35, cz, x + fx * 3, py - 0.3, z + fz * 3, 52, -0.03 * side);
        E.marks.push([x, py - 0.8, z], [x, py + 0.7, z]); E.needH = 0.12;
      } };
  } });

/* ---- 4. the hill climb that stalls: spinning track and roost, the nose comes up, it hangs, slides back down tail first ---- */
linked("hilltail", { dur: 6.5, need: { sled: 1 }, pspeed: 14,
  plan(rec, E) {
    const r = mulb(rec.sd), yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, side = r() < 0.5 ? 1 : -1, night = NIGHT(rec.h), dur = 6.5, tU = 3.0, tS = 4.0, v0 = 7;
    const S = t => t < tU ? v0 * t : t < tS ? v0 * tU + v0 * (t - tU) - 0.5 * v0 * (t - tU) * (t - tU) / (tS - tU) : v0 * tU + 0.5 * v0 * (tS - tU) - 1.7 * Math.pow(t - tS, 1.0) - 0.55 * Math.pow(t - tS, 2) * 0;
    const spin = t => t < tS ? v0 * 1.6 * t : v0 * 1.6 * tS + v0 * 1.6 * 0.5 * Math.max(0, 1 - (t - tS) / 1.5) * (t - tS);
    const x0 = rec.x - fx * 12, z0 = rec.z - fz * 12, P = t => clamp((t - tU + 0.2) / 0.9, 0, 1) * (1 - clamp((t - 5.0) / 1.0, 0, 1)) * 0.75;
    return { dur, need: { sled: 1 }, hour: rec.h, storm: rec.s, vig: 0.22,
      frame(t, E) {
        K.begin(E); const s = S(t), x = x0 + fx * s, z = z0 + fz * s, up = P(t), vv = t < tU ? v0 : t < tS ? v0 * (1 - (t - tU) / (tS - tU)) : -1.7, a = sled(E, 0, x, z, yaw, Math.abs(vv), 0, { lean: -0.15 - 0.35 * up, glance: t > 4.4 ? 0.4 : 0 });
        E.belt = spin(t); a.g.rotation.x -= up; a.g.position.y += 0.95 * Math.sin(up); E.sledLights(a, true, true, night); a.blob.visible = false;
        const on = te => (te > 0.6 && te < tS + 0.6 ? 1 : 0) * (te < tU ? 0.5 : 1);
        puff(E, 160, 1.4, 0.4, 1.8, 0.62, 4.5, (te, q) => { const ss = S(Math.min(te, tS)); q.on = on(te); q.x = x0 + fx * ss - fx * 1.9 + lx * 0.45 * Math.sin(te * 17); q.z = z0 + fz * ss - fz * 1.9 + lz * 0.45 * Math.sin(te * 17); q.y = surf(q.x, q.z) + 0.35; q.vx = -fx * (te < tU ? 3 : 5.5) + lx * Math.sin(te * 23) * 2; q.vz = -fz * (te < tU ? 3 : 5.5) + lz * Math.sin(te * 23) * 2; q.vy = 3.2 + 2 * up; });
        const cx = x0 + fx * 12 + lx * side * 5.0, cz = z0 + fz * 12 + lz * side * 5.0, py = surf(x, z) + 1.0; E.look(cx, surf(cx, cz) + 1.0, cz, x0 + fx * (12 + (s - 12) * 0.55), py + 0.4 * up, z0 + fz * (12 + (s - 12) * 0.55), 54, 0); E.marks.push([x, py - 0.6, z], [x, py + 1.0, z]); E.needH = 0.14;
      } };
  } });

/* ---- 5. the herd crossing the road in the headlights, two sleds waiting at the frame's edges ---- */
linked("herdroad", { dur: 8, need: { sled: 2 }, pspeed: 4,
  plan(rec, E) {
    const r = mulb(rec.sd), yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, night = NIGHT(rec.h), n = 5 + Math.floor(r() * 3), dur = 8, v = 16 / dur, cx = rec.x - fx * 4.6, cz = rec.z - fz * 4.6, rr = mulb(rec.sd + 7);
    const D2 = Array.from({ length: n }, (_, i) => ({ al: (i % 3) * 2.1 + rr() * 1.4 - 1.4, u0: i * 16 / n + rr() * 0.8, face: (rr() - 0.5) * 0.35, g: rr() < 0.25 })), need = { sled: 2 };
    return { dur, need, hour: rec.h, storm: rec.s, vig: 0.26, light: { fill: 0.35, hemi: 0.15, warm: 0.2 },
      frame(t, E) {
        K.begin(E); for (let i = 0; i < n; i++) { const q = D2[i], ac = -8 + frac((q.u0 + v * t) / 16) * 16, x = rec.x + fx * q.al + lx * ac, z = rec.z + fz * q.al + lz * ac; K.animal(E, "reindeer", i, x, z, yaw + Math.PI / 2 + q.face, { v, dt: E.dt || 0, graze: 0 }); }
        for (let i = 0; i < 2; i++) { const sx = cx - fx * 0.2 + lx * (i ? 1.5 : -1.5), sz = cz - fz * 0.2 + lz * (i ? 1.5 : -1.5), a = sled(E, i, sx, sz, yaw, 0, 0, { lean: 0, glance: i ? 0.3 * Math.sin(t * 0.7) : 0 }); E.sledLights(a, true, true, Math.max(night, 0.45)); a.blob.visible = false; }
        mk(E, rec.x, surf(rec.x, rec.z) + 0.1, rec.z); mk(E, rec.x, surf(rec.x, rec.z) + 1.75, rec.z); K.lampPool(E, "hd", rec.x - fx * 3.8, rec.z - fz * 3.8, 12, 0xfff0d0, 0.65 * Math.max(night, 0.3));
        E.look(cx, surf(cx, cz) + 0.95 + 0.03 * Math.sin(t * 1.2), cz, rec.x, surf(rec.x, rec.z) + 1.0, rec.z, 50, 0); E.needH = 0.18;
      } };
  } });

/* ---- 6. the fox with the fish: trots in across the quay with it in its jaws, stops, looks at the lens, trots on ---- */
linked("foxquay", { dur: 6, need: {}, pspeed: 6,
  plan(rec, E) {
    const r = mulb(rec.sd), ca = r() * TAU, d = 1.6, cx = rec.x + Math.cos(ca) * d, cz = rec.z + Math.sin(ca) * d, dirAng = ca + Math.PI / 2 * (r() < 0.5 ? 1 : -1), dx = Math.cos(dirAng), dz = Math.sin(dirAng), dur = 6, vT = 2.8;
    const S = t => t < 1.9 ? -5 + vT * t - 0.0 : t < 3.4 ? -5 + vT * 1.9 : -5 + vT * 1.9 + vT * (t - 3.4), V = t => t < 1.6 ? vT : t < 1.9 ? vT * (1 - (t - 1.6) / 0.3) : t < 3.4 ? 0 : t < 3.7 ? vT * (t - 3.4) / 0.3 : vT;
    return { dur, need: {}, hour: rec.h, storm: rec.s, vig: 0.22, light: { fill: 0.6 },
      frame(t, E) {
        K.begin(E); const s = S(t) * 0.55 - 0.0, x = rec.x + dx * s, z = rec.z + dz * s, face = Math.atan2(dx, dz), look = ease((t - 2.0) / 0.5) * (1 - ease((t - 3.2) / 0.5)), q = K.animal(E, "fox", 0, x, z, face + look * Math.atan2(cx - x, cz - z) * 0 + look * (((Math.atan2(cx - x, cz - z) - face + Math.PI * 3) % TAU) - Math.PI) * 0.8, { v: V(t) * 0.55, dt: E.dt || 0 });
        const fe = E.extraOf("gc:foxfish", () => { const g = K.PB.fish({ s: 0.5 }), rr = new (T().Group)(); rr.add(g); rr.traverse(o => { o.frustumCulled = false; }); return rr; }); if (fe.m.parent !== q.head) q.head.add(fe.m); fe.m.position.set(0, -0.07, 0.17); fe.m.rotation.set(0, Math.PI / 2, 0.3 + 0.05 * Math.sin(t * 9) * (V(t) > 1 ? 1 : 0)); fe.m.scale.setScalar(0.62); fe.m.visible = true; fe.on = true;
        q.head.rotation.y = 0.0; const hd = _v(); q.head.getWorldPosition(hd); E.look(cx, surf(cx, cz) + 0.45, cz, hd.x * 0.8 + x * 0.2, hd.y - 0.08, hd.z * 0.8 + z * 0.2, 46, 0); mk(E, hd.x, hd.y - 0.3, hd.z); mk(E, hd.x, hd.y + 0.25, hd.z); E.needH = 0.2;
      } };
  } });

/* ---- 7. the snowball fight: wind-up, the arc, the hit, the stagger, the scoop and the throw back, the duck ---- */
linked("snowball", { dur: 6, need: { walker: 2 }, pspeed: 4,
  plan(rec, E) {
    const r = mulb(rec.sd), az = rec.a, fy = yawOfAz(az + Math.PI), pa = who(rec.w[0]), pb = who(rec.w[1]), fx = Math.sin(fy), fz = Math.cos(fy), lx = fz, lz = -fx, dur = 6, side = r() < 0.5 ? 1 : -1;
    const x1 = rec.x, z1 = rec.z, x2 = x1 + lx * 2.3 * side, z2 = z1 + lz * 2.3 * side, ya = Math.atan2(x2 - x1, z2 - z1), yb = ya + Math.PI;
    const hand = (x, z, sc) => [x, surf(x, z) + 1.55 * sc, z], tgt = (x, z, sc) => [x, surf(x, z) + 1.3 * sc, z];
    const throwArm = (w, k, back) => { const U = w.U; U.arms[1].rotation.set(lerp(0.9, -2.75, k), 0, lerp(0.4, 0.15, k)); U.fore[1].rotation.set(lerp(-1.4, -0.3, k), 0, 0); U.torso.rotation.set(lerp(-0.1, 0.15, k), lerp(0.55, -0.45, k) * (back || 1), 0); U.head.rotation.set(0, lerp(-0.4, 0.25, k), 0); };
    return { dur, need: { walker: 2 }, hour: rec.h, storm: rec.s, vig: 0.18,
      frame(t, E) {
        K.begin(E); const wa = K.person(E, 0, pa, x1, z1, ya + 0.2, {}), wb = K.person(E, 1, pb, x2, z2, yb - 0.2, {}); K.grin(wa, 1); K.grin(wb, 0.7); const sa = wa.g.scale.x, sb = wb.g.scale.x;
        const wA = ease((t - 0.5) / 0.4) - ease((t - 1.0) / 0.12) * 0, tA = clamp((t - 0.5) / 0.5, 0, 1), relA = t > 0.95, hit = t > 1.72 && t < 2.5, dk = ease((t - 3.55) / 0.35) * (1 - ease((t - 4.4) / 0.5)), scoopB = ease((t - 2.45) / 0.4) * (1 - ease((t - 2.95) / 0.3)), tB = clamp((t - 3.0) / 0.4, 0, 1), scoopA = ease((t - 4.9) / 0.4) * (1 - ease((t - 5.5) / 0.4));
        const UA = wa.U, UB = wb.U;
        if (t < 1.1) { const k = t < 0.95 ? ease((t - 0.5) / 0.45) : 1; if (t < 0.5) { /* idle */ } else throwArm(wa, t < 0.95 ? 0 : ease((t - 0.95) / 0.15), 1); UA.arms[1].rotation.x = t < 0.5 ? UA.arms[1].rotation.x : (t < 0.95 ? lerp(UA.arms[1].rotation.x, 0.9, k) : UA.arms[1].rotation.x); }
        else if (t < 1.5) { UA.arms[1].rotation.set(lerp(-2.75, 0.1, ease((t - 1.1) / 0.4)), 0, 0.2); UA.fore[1].rotation.set(-0.3, 0, 0); UA.torso.rotation.y = lerp(-0.45, 0, ease((t - 1.1) / 0.4)); }
        if (t >= 1.72 && t < 2.5) { const k = Math.sin(Math.PI * clamp((t - 1.72) / 0.8, 0, 1)); UB.torso.rotation.set(-0.35 * k, 0.4 * k, 0.15 * k); UB.head.rotation.set(-0.2 * k, 0.5 * k, 0); UB.arms[0].rotation.set(-0.8 * k, 0, -0.6 * k); UB.arms[1].rotation.set(-0.8 * k, 0, 0.6 * k); K.grin(wb, 0.2 + 0.0 * k); }
        if (scoopB > 0.01) { UB.torso.rotation.set(0.9 * scoopB, 0, 0); UB.head.rotation.x = -0.4 * scoopB; for (let i = 0; i < 2; i++) { UB.arms[i].rotation.set(0.6 * scoopB, 0, (i ? 1 : -1) * 0.1); UB.fore[i].rotation.set(-0.5 * scoopB, 0, 0); } }
        if (t >= 3.0 && t < 3.9) { throwArm(wb, t < 3.4 ? 0 : ease((t - 3.4) / 0.14), -1); if (t >= 3.54) { UB.arms[1].rotation.x = lerp(-2.75, 0.1, ease((t - 3.54) / 0.4)); UB.torso.rotation.y = lerp(0.45, 0, ease((t - 3.54) / 0.4)); } UB.arms[1].rotation.x = t < 3.4 ? lerp(UB.arms[1].rotation.x, 0.9, ease((t - 3.0) / 0.4)) : UB.arms[1].rotation.x; }
        if (dk > 0.01) { UA.torso.rotation.set(0.7 * dk, 0.2 * dk, 0); UA.head.rotation.set(0.1, 0.4 * dk, 0); wa.g.position.y -= 0.12 * dk; K.grin(wa, 1.2); }
        if (scoopA > 0.01) { UA.torso.rotation.set(0.9 * scoopA, 0, 0); for (let i = 0; i < 2; i++) { UA.arms[i].rotation.set(0.6 * scoopA, 0, (i ? 1 : -1) * 0.1); UA.fore[i].rotation.set(-0.5 * scoopA, 0, 0); } }
        const ball = (t0, from, to, sc, id) => { const u = (t - t0) / 0.7; if (u < 0 || u > 1) return; const a = hand(from[0], from[1], sc), b = tgt(to[0], to[1], 1); K.prop(E, "snowball", id, lerp(a[0], b[0], u), 0, 0, { y: lerp(a[1], b[1], u) + 0.9 * Math.sin(Math.PI * u), z: 0, s: 1.7 }); const m = E.extra.find(q => q.key === "gp:snowball" + id); if (m) m.m.position.z = lerp(a[2], b[2], u); };
        ball(1.0, [x1, z1], [x2, z2], sa, 0); ball(3.5, [x2, z2], [x1, z1 + 0.0], sb, 1); const hb = _v(); wa.g.updateMatrixWorld(true);
        puff(E, 70, 0.9, 0.18, 0.8, 0.8, 4, (te, q) => { q.on = te > 1.72 && te < 1.95 ? 1 : (te > 4.08 && te < 4.3 ? 1 : 0); const second = te > 3.9; q.x = second ? x1 : x2; q.z = second ? z1 : z2; q.y = surf(q.x, q.z) + (second ? 1.4 : 1.35); q.vx = (Math.sin(te * 90) * 2); q.vz = Math.cos(te * 77) * 2; q.vy = 1.2 + Math.abs(Math.sin(te * 61)) * 1.5; });
        const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, cx = mx + fx * 4.6, cz = mz + fz * 4.6, pan = 0.1 * Math.sin(t / dur * TAU); E.look(cx, surf(cx, cz) + 1.25, cz, mx + lx * pan * 6, surf(mx, mz) + 1.1, mz + lz * pan * 6, 56, 0);
        const h1 = K.headPos(wa, _v()), h2 = K.headPos(wb, _v()); mk(E, h1.x, h1.y + 0.14 * sa, h1.z); mk(E, x1, surf(x1, z1), z1); mk(E, h2.x, h2.y + 0.14 * sb, h2.z); E.needH = 0.16;
      } };
  } });

/* ---- 8. the kids' sledging bank: down the slope into the lens, whooping, the last one tips off in a roll ---- */
linked("sledgebank", { dur: 6.5, need: { walker: 3 }, pspeed: 8,
  plan(rec, E) {
    const r = mulb(rec.sd), yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, ps = rec.w.map(who).filter(Boolean), cols = [0xd8352a, 0x2a6ad0, 0xe0a020], dur = 6.5, cx = rec.x + fx * 11.5, cz = rec.z + fz * 11.5, n = ps.length, tTip = 3.7;
    const SD = 3.6, S = (i, t) => { const u = clamp((t - 0.4 - i * 0.35) / SD, 0, 1); return -6 + 13 * (u * u * (3 - 2 * u)); }, V = (i, t) => { const u = clamp((t - 0.4 - i * 0.35) / SD, 0, 1); return u > 0 && u < 1 ? 13 * 6 * u * (1 - u) / SD : 0; };
    return { dur, need: { walker: 3 }, hour: rec.h, storm: rec.s, vig: 0.18, light: { fill: 0.5 },
      frame(t, E) {
        K.begin(E); let mxs = -99;
        ps.forEach((p, i) => {
          const off = (i - (n - 1) / 2) * 1.2, tip = i === 0 && t > tTip, tt = tip ? (t - tTip) : 0; let s = S(i, t); if (i === 0 && t > tTip) s = S(0, tTip) + 1.6 * (1 - Math.exp(-tt * 1.8));
          const x = rec.x + lx * off + fx * (s + 0), z = rec.z + lz * off + fz * (s + 0), face = yaw + (i - 1) * 0.08 + Math.PI, v = V(i, t), cols_ = cols[i % 3];
          K.prop(E, "plasticSled", i, x, z, face, { c: cols_, key: "s" + cols_, dy: 0.02, rx: -0.08 + (tip ? -0.0 : 0) , rz: tip ? Math.min(2.8, tt * 4) : 0 });
          const w = mover(E, i, p, x, z, yaw + Math.PI, { smile: 1 }); const U = w.U; K.sit(w, surf(x, z) + 0.15, { lean: -0.2 }); K.grin(w, 1.2); blink(w, t, i * 0.3);
          U.head.rotation.set(-0.12, 0.05 * Math.sin(t * 2 + i), (i - 1) * 0.1); U.arms[0].rotation.set(-2.5 + 0.2 * Math.sin(t * 8 + i), 0, -0.4); U.fore[0].rotation.set(-0.3, 0, 0); U.arms[1].rotation.set(-2.2 + 0.2 * Math.sin(t * 7 + i * 2), 0, 0.4); U.fore[1].rotation.set(-0.3, 0, 0);
          if (tip) { const k = ease(tt / 0.5), roll = Math.min(1, tt / 1.0); w.g.rotation.z = k * 1.55; w.g.position.y = surf(x, z) + 0.12 * (1 - k) + 0.1 * k - 0.0; w.g.position.x += lx * k * 0.5; U.torso.rotation.x = 0.2 * k; U.arms[0].rotation.set(-2.5, 0, -0.4 - k); U.arms[1].rotation.set(-2.2, 0, 0.4 + k); K.grin(w, 1.4); }
          if (v > 2) puff(E, 30, 0.9, 0.2, 0.8, 0.5, 5, (te, q) => { const ss = S(i, te); q.on = V(i, te) > 2 && te < (i === 0 ? tTip : 99) ? 1 : 0; q.x = rec.x + lx * off + fx * (ss - 1.3); q.z = rec.z + lz * off + fz * (ss - 1.3); q.y = surf(q.x, q.z) + 0.2; q.vx = -fx * 1.5 + lx * Math.sin(te * 61) * 1.4; q.vz = -fz * 1.5 + lz * Math.sin(te * 61) * 1.4; q.vy = 1.8; });
          const h = K.headPos(w, _v()); mk(E, h.x, h.y + 0.14 * w.g.scale.x, h.z); mk(E, x, surf(x, z), z); E.faces.push({ x: h.x, y: h.y, z: h.z, yaw: face - Math.PI }); mxs = Math.max(mxs, s);
        });
        if (t > tTip) puff(E, 60, 1.1, 0.3, 1.3, 0.7, 3, (te, q) => { q.on = te > tTip && te < tTip + 0.7 ? 1 : 0; const ss = S(0, tTip) + 1.6 * (1 - Math.exp(-(te - tTip) * 1.8)); q.x = rec.x + lx * (-(n - 1) / 2 * 1.5) + fx * ss; q.z = rec.z + lz * (-(n - 1) / 2 * 1.5) + fz * ss; q.y = surf(q.x, q.z) + 0.3; q.vx = Math.sin(te * 90) * 2; q.vz = Math.cos(te * 70) * 2; q.vy = 1.6; });
        const tx = rec.x + fx * clamp(mxs - 1.5, -2, 5), tz = rec.z + fz * clamp(mxs - 1.5, -2, 5); E.look(cx, surf(cx, cz) + 1.2, cz, tx, surf(tx, tz) + 0.8, tz, 52, 0); E.needH = 0.14;
      } };
  } });

/* ---- 9. the harbour road wheelie: up to speed, the front comes up and stays there, the track clawing, then down ---- */
def("wheelie", { chip: "WHEELIE", fam: "action", dur: 5.5, need: { sled: 1 }, pk: "sled", pspeed: 18,
  w: c => (c.int.sled || c.int.racing) && c.snow && c.el > -17 && c.storm < 0.5 && window.TLXR && TLXR.ready ? 2.0 + (c.int.racing ? 1.4 : 0) : 0,
  anchor(c, rng) {
    const v = c.vil, rs = TLXR.routes.filter(r => r.pts && r.pts.length > 14); for (let k = 0; k < 90 && rs.length; k++) {
      const rt = rs[Math.floor(rng() * rs.length)], i = 1 + Math.floor(rng() * (rt.pts.length - 12)), p0 = rt.pts[i], p1 = rt.pts[i + 9]; if (!p0 || !p1) continue; const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); if (d < 24) continue; const yaw = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]), fx = Math.sin(yaw), fz = Math.cos(yaw); let ok = Math.hypot(p0[0] - v.x, p0[1] - v.z) < 3500;
      for (let s = -6; s <= 85 && ok; s += 5) { const x = p0[0] + fx * s, z = p0[1] + fz * s; if (W().isSea(x, z) || W().obNear(x, z, 1.8)) ok = false; } const side = rng() < 0.5 ? 1 : -1, cx = p0[0] + fz * 7 * side + fx * 38, cz = p0[1] - fx * 7 * side + fz * 38; if (!ok || !openOk(cx, cz, 0.8)) continue;
      return { x: p0[0], z: p0[1], a: yaw, k: side > 0 ? "r" : "l", place: rt.name || v.name };
    } return null;
  },
  plan(rec, E) {
    const yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, side = rec.k === "l" ? -1 : 1, night = NIGHT(rec.h), dur = 5.5, a0 = 4.2;
    const S = t => 0.5 * a0 * t * t, V = t => a0 * t, up = t => ease((t - 1.5) / 0.7) * (1 - ease((t - 3.7) / 0.5)) * 0.78 + 0.05 * Math.sin((t - 3.8) * 14) * Math.exp(-(t - 4.2) * 2) * (t > 4.2 ? 1 : 0);
    return { dur, need: { sled: 1 }, hour: rec.h, storm: rec.s, vig: 0.24,
      frame(t, E) {
        K.begin(E); const s = S(t), x = rec.x + fx * s, z = rec.z + fz * s, u = up(t), a = sled(E, 0, x, z, yaw, V(t), 0, { lean: -0.1 - 0.4 * u / 0.78 }); E.belt = s * 1.0 + (u > 0.1 ? 8 * t : 0); a.g.rotation.x -= u; a.g.position.y += 1.0 * Math.sin(u); E.sledLights(a, true, true, night); if (u > 0.1) a.blob.visible = false;
        const cx = rec.x + fx * 15 + lx * side * 4.6, cz = rec.z + fz * 15 + lz * side * 4.6; E.look(cx, surf(cx, cz) + 1.2, cz, x + fx * 0.5, surf(x, z) + 1.0 + 0.5 * u, z + fz * 0.5, 56, 0); E.marks.push([x, surf(x, z), z], [x, surf(x, z) + 1.5, z]); E.needH = 0.12;
      } };
  },
  capfn: (c, v, r) => [`Front wheel up the whole length of the harbour road. Do not tell the council.`, `Wheelie on ${v.place}. Three seconds of glory, two of regret.`, `The sled and I disagree about which end goes first.`, `Held it all the way past the shop. Nobody clapped.`][Math.floor(r() * 4)] });

/* ---- 10. snow off the roof onto the path just shovelled ---- */
def("roofslide", { chip: "OOPS", fam: "funny", dur: 6, need: { walker: 1 }, pk: "house", pspeed: 4,
  w: c => c.snow && c.storm < 0.55 && c.el > -17 && (c.depth > 0.15 || c.sinceStorm) ? 1.8 : 0,
  // the standing spot is 1.5 m out from the front wall (SP.door gives the wall, not the house's centre)
  anchor(c, rng) { const d = SP.door(rng, c.vil); if (!d) return null; const x = d.x + d.nx * 1.5, z = d.z + d.nz * 1.5; if (!openOk(x + d.nx * 1.2, z + d.nz * 1.2, 0.5) || !openOk(x + d.nx * 5.2, z + d.nz * 5.2, 0.8)) return null; return { x, z, a: d.yaw, place: c.vil.name, w: [c.p.id] }; },
  plan(rec, E) {
    const p = who(rec.w[0]), yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, dur = 6, tS = 1.9, night = NIGHT(rec.h), r = mulb(rec.sd), side = r() < 0.5 ? 1 : -1;
    const wallX = rec.x - fx * 1.5, wallZ = rec.z - fz * 1.5;                                               // the wall face; the eave hangs 0.5 m out from it
    return { dur, need: { walker: 1 }, hour: rec.h, storm: rec.s, vig: 0.2, light: { fill: 0.55 },
      frame(t, E) {
        K.begin(E); const y0 = surf(wallX, wallZ), EV = 3.0, tF = tS + 0.55, g0 = 9.8, tI = tF + Math.sqrt(2 * (EV - 0.3) / g0);
        // the slab of roof snow: creeps, slides out over the eave (tilting), falls, and breaks on the path in a cloud
        let slabY = EV;
        if (t < tI + 0.4) {
          const sg = E.extraOf("gp:slab", () => { const m = new (T().Mesh)(new (T().BoxGeometry)(3.6, 0.45, 1.5), A().mesh.std(0xf4f8fc, 0.95, 0)); m.frustumCulled = false; return m; }), m = sg.m, ku = clamp((t - tS) / 0.55, 0, 1), creep = 0.12 * ease(t / tS);
          let y, off, tilt, sy = 1; if (t < tF) { y = EV + 0.12; off = 0.0 + creep + 0.75 * ku * ku; tilt = 0.08 + 0.5 * ku; } else if (t < tI) { const tau = t - tF; y = EV - 0.5 * g0 * tau * tau; off = 0.87 + 0.6 * tau; tilt = 0.58 + 0.8 * tau; } else { const k2 = (t - tI) / 0.4; y = 0.3 - 0.15 * k2; off = 1.3; tilt = 1.1 - 1.0 * k2; sy = 1 - 0.75 * k2; }
          slabY = y; m.visible = true; m.position.set(wallX + fx * off, y0 + y, wallZ + fz * off); m.rotation.set(0, yaw, 0); m.rotateX(-tilt); m.scale.set(1, sy, 1);
        }
        // the heap it leaves on the path
        if (t >= tI) { const hp = E.extraOf("gp:heap", () => { const m = new (T().Mesh)(new (T().SphereGeometry)(1, 12, 7, 0, TAU, 0, Math.PI / 2), A().mesh.std(0xeef4fa, 0.95, 0)); m.frustumCulled = false; return m; }).m, k3 = ease((t - tI) / 0.3); hp.visible = true; hp.position.set(wallX + fx * 1.3, y0, wallZ + fz * 1.3); hp.rotation.set(0, yaw, 0); hp.scale.set(1.9 * k3 + 0.01, 0.55 * k3 + 0.01, 1.0 * k3 + 0.01); }
        const px = rec.x + lx * 0.2 * side, pz = rec.z + lz * 0.2 * side, back = ease((t - tF) / 0.45) * 1.5, turn = ease((t - (tF + Math.sqrt(2 * 2.7 / 9.8)) - 1.0) / 0.7), w = K.person(E, 0, p, px + fx * back, pz + fz * back, yaw + Math.PI * (1 - turn) * side, { warm: true }); const U = w.U, sc = w.g.scale.x, shov = t < tF ? 1 : 0, ph = t * 3.4;
        const flinch = ease((t - tF) / 0.2) * (1 - ease((t - tI - 0.9) / 0.9)), after = ease((t - tI - 1.0) / 0.6);
        const sh = K.prop(E, "shovel", 0, px, pz, yaw, {});
        if (shov) { const dig = Math.sin(ph); U.torso.rotation.set(0.42 + 0.3 * dig, 0.35 * Math.sin(ph * 0.5), 0); for (let i = 0; i < 2; i++) { U.arms[i].rotation.set(-0.8 - 0.6 * dig, 0, (i ? 1 : -1) * 0.12); U.fore[i].rotation.set(-0.5 + 0.2 * dig, 0, 0); } K.grin(w, 0.4);
          sh.visible = true; sh.position.set(px - fx * 0.55 + lx * 0.15, surf(px, pz) + 0.75 + 0.3 * dig, pz - fz * 0.55 + lz * 0.15); sh.rotation.set(-0.9 - 0.5 * dig, yaw, 0); }
        else {                                                                                                // jumps back, arms up; then drops them and turns the head to the camera: the look
          U.torso.rotation.set(-0.35 * flinch, 0, 0); for (let i = 0; i < 2; i++) { U.arms[i].rotation.set(-2.2 * flinch - 0.1 * after, 0, (i ? 1 : -1) * (0.15 + 0.7 * flinch + 0.5 * after)); U.fore[i].rotation.set(-0.9 * flinch, 0, 0); } K.grin(w, 0.05 + 0.5 * after);
          sh.visible = true; sh.position.set(px - fx * 0.2 + lx * 0.5, surf(px, pz) + 0.06, pz - fz * 0.2 + lz * 0.5); sh.rotation.set(-1.5, yaw + 0.7, 0); }                                                            // the shovel dropped on the path
        puff(E, 200, 1.9, 0.7, 3.2, 0.9, 2.0, (te, q) => { q.on = te > tI - 0.02 && te < tI + 0.7 ? 1 : 0; q.x = wallX + fx * 1.3 + lx * (Math.sin(te * 131) * 2.4); q.z = wallZ + fz * 1.3 + lz * (Math.sin(te * 131) * 2.4); q.y = surf(q.x, q.z) + 0.25; q.vx = fx * 2.0 + lx * Math.sin(te * 87) * 2.4; q.vz = fz * 2.0 + lz * Math.sin(te * 87) * 2.4; q.vy = 2.6 + Math.abs(Math.sin(te * 53)) * 2.0; });
        // a handheld phone from the yard: looking at the shoveller, whips up to the roof as it lets go, follows the slab down, jolts on the hit, settles on the look
        const [sx, sy2] = shake(t, 1.6), h = K.headPos(w, _v()), cx = rec.x + fx * 5.0 + lx * 1.5 * side, cz = rec.z + fz * 5.0 + lz * 1.5 * side;
        const upk = ease((t - tS + 0.25) / 0.4) * (1 - ease((t - tF) / (tI - tF))), jolt = t > tI ? Math.exp(-(t - tI) * 5) * Math.sin((t - tI) * 38) * 0.09 : 0, push = 0.9 * ease((t - tI - 0.6) / 1.2);
        const ty = lerp(1.15, EV + 0.2, upk) + (t > tF && t < tI ? 0 : 0) + jolt, fov = lerp(58, 46, push);
        E.look(cx - fx * push + sx * 3, surf(cx, cz) + 1.45 + sy2 * 3, cz - fz * push, rec.x - fx * 0.8 + lx * sx * 6, surf(rec.x, rec.z) + ty, rec.z - fz * 0.8 + lz * sx * 6, fov, sx * 0.6 + jolt * 0.5);
        mk(E, h.x, h.y + 0.14 * sc, h.z); mk(E, w.g.position.x, surf(px, pz), w.g.position.z); E.needH = 0.18;
      } };
  },
  capfn: (c, v, r) => [`Shovelled the path for an hour. The roof had other plans.`, `The roof gave the path back what I had just taken away.`, `Four hours of snow came off the roof in four seconds. Right on the path.`, `Do not stand under the eaves. I stood under the eaves.`][Math.floor(r() * 4)] });

/* ---- 11. bonfire and sausages ---- */
def("bonfire", { chip: "FIRE", fam: "cosy", dur: 7, need: { walker: 2 }, pk: "fire", pspeed: 2,
  w: c => c.snow && c.el > -17 && c.storm < 0.45 && (c.el < 4 || c.dow === 0 || c.dow === 6) && c.household > 1 ? 1.8 : 0,
  anchor(c, rng) { const sp = SP.ring(rng, c.vil.x, c.vil.z, 30, 200, 6); if (!sp) return null; const fam = TLXN.family(c.p).filter(q => q && q.age > 4), pair = fam.length ? [c.p, fam[Math.floor(rng() * fam.length)]] : [c.p]; return { x: sp[0], z: sp[1], a: rng() * TAU, place: "a fire behind " + c.vil.name, w: pair.map(q => q.id) }; },
  plan(rec, E) {
    const ps = rec.w.map(who).filter(Boolean), r = mulb(rec.sd), dur = 7, night = NIGHT(rec.h), ang = rec.a, n = Math.max(1, ps.length), need = { walker: Math.max(2, n) };
    return { dur, need, hour: rec.h, storm: rec.s, vig: 0.24, light: { fill: 0.3, hemi: 0, exp: -0.12, warm: 0.7, swing: 0.7 },
      frame(t, E) {
        K.begin(E); const fl = 1 + 0.1 * Math.sin(t * 17) + 0.07 * Math.sin(t * 29); { const fm = K.prop(E, "fire", 0, rec.x, rec.z, t * 0.1, { s: 0.95 }), fg = fm.children[0] && fm.children[0].children; if (fg) { let q = 0; for (const f of fg) { const b = f.userData && f.userData.b; if (!b) continue; const ph = q * 2.3 + 1; f.scale.set(b[0] * (1 + 0.16 * Math.sin(t * (11 + q * 5) + ph)), b[1] * (1 + 0.22 * Math.sin(t * (13 + q * 7) + ph * 2) + 0.1 * Math.sin(t * 29 + q)), 1); f.position.x = b[2] + 0.04 * Math.sin(t * (6 + q * 3) + ph); q++; } } } K.lampPool(E, "bf", rec.x, rec.z, 6, 0xff8a2a, 0.2 + 0.3 * night + 0.07 * Math.sin(t * 19) + 0.05 * Math.sin(t * 7));
        puff(E, 50, 1.6, 0.05, 0.12, 0.9, -2.5, (te, q) => { q.on = 1; q.x = rec.x + Math.sin(te * 91) * 0.3; q.z = rec.z + Math.cos(te * 77) * 0.3; q.y = surf(rec.x, rec.z) + 0.8; q.vx = Math.sin(te * 57) * 0.5; q.vz = Math.cos(te * 43) * 0.5; q.vy = 1.5 + Math.abs(Math.sin(te * 31)) * 1.2; });
        puff(E, 40, 1.6, 0.045, 0.06, 1, -3.2, (te, q) => { q.on = 1; q.x = rec.x + Math.sin(te * 61) * 0.25; q.z = rec.z + Math.cos(te * 47) * 0.25; q.y = surf(rec.x, rec.z) + 0.7; q.vx = Math.sin(te * 83) * 0.9; q.vz = Math.cos(te * 71) * 0.9; q.vy = 2.2 + Math.abs(Math.sin(te * 37)) * 2.4; });
        let tx = 0, tz = 0;
        const hs = []; for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * 0.95, ex = rec.x + Math.cos(a) * 1.75, ez = rec.z + Math.sin(a) * 1.75, fy = Math.atan2(rec.x - ex, rec.z - ez), w = K.person(E, i, ps[i], ex, ez, fy, { warm: true }), U = w.U; K.prop(E, "logseat", i, ex + (ex - rec.x) * 0.03, ez + (ez - rec.z) * 0.03, fy + Math.PI / 2, {}); K.sit(w, surf(ex, ez) + 0.4); K.grin(w, 0.7 + 0.3 * Math.sin(t * 0.8 + i)); blink(w, t, i * 0.4);
          const turn = Math.sin(t * 1.4 + i * 1.7), eat = ease(Math.sin(t / dur * TAU + i * 2) * 3 - 1.2); U.head.rotation.set(0.05 - 0.05 * eat, 0.15 * Math.sin(t * 0.5 + i), 0.04); armTo(w, 0, -0.14, 0.34 + 0.06 * turn, 0.3 + 0.14 * (1 - eat)); armTo(w, 1, 0.16, 0.3 + 0.12 * eat, 0.38 - 0.1 * eat);
          K.carry(E, w, "stick", 0.16, 0.32, 0.38, [-0.35 - 0.15 * eat, 0, 0], { key: "s" + i }); tx += ex; tz += ez; const h = K.headPos(w, _v()); hs.push([h.x, h.y, h.z]); mk(E, h.x, h.y, h.z); E.faces.push({ x: h.x, y: h.y, z: h.z, yaw: w.o.yaw }); }
        const sw = 0.28 * Math.sin(t / dur * TAU), ca = ang + Math.PI + sw, cx = rec.x + Math.cos(ca) * 2.7, cz = rec.z + Math.sin(ca) * 2.7, mx = hs.reduce((q, h) => q + h[0], 0) / hs.length, my = hs.reduce((q, h) => q + h[1], 0) / hs.length, mz = hs.reduce((q, h) => q + h[2], 0) / hs.length;      // the lens across the fire from the people: the flame low in the foreground, the faces lit behind it
        E.look(cx, surf(cx, cz) + 1.2, cz, mx, my - 0.25, mz, 54, 0); for (const h of hs) mk(E, h[0], h[1] + 0.13, h[2]); mk(E, mx, surf(rec.x, rec.z) + 0.2, mz); E.needH = 0.2;
      } };
  },
  capfn: (c, v, r) => [`Bonfire, sausages on sticks, and nobody in a hurry to go home.`, `The sausage was burnt on one side. Perfect.`, `${v.place.charAt(0).toUpperCase() + v.place.slice(1)}, snow to the knees, hot chocolate in the bag.`, `Somebody always eats the best one before it is ready.`][Math.floor(r() * 4)] });

/* ---- 12. digging the car out: shovel strokes and flying snow ---- */
def("digout", { chip: "DIG", fam: "weather", dur: 6, need: { walker: 2 }, pk: "mound", pspeed: 2,
  w: c => c.snow && c.storm < 0.6 && c.el > -17 && (c.sinceStorm || c.depth > 0.2) ? 1.6 : 0,
  anchor(c, rng) { const d = SP.door(rng, c.vil); if (!d) return null; const fam = TLXN.family(c.p).filter(q => q && q.age > 11), pair = fam.length ? [c.p, fam[Math.floor(rng() * fam.length)]] : [c.p]; return { x: d.x + d.nx * 7, z: d.z + d.nz * 7, a: d.yaw, place: c.vil.name, w: pair.map(q => q.id) }; },
  plan(rec, E) {
    const ps = rec.w.map(who).filter(Boolean), yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, n = Math.max(1, ps.length), dur = 6, need = { walker: 2 }, ph0 = 0;
    return { dur, need, hour: rec.h, storm: rec.s, vig: 0.2, light: { fill: 0.55 },
      frame(t, E) {
        K.begin(E); K.prop(E, "carMound", 0, rec.x, rec.z, yaw + 0.35, { s: 0.85 });
        for (let i = 0; i < n; i++) { const side = i ? 1 : -1, x = rec.x + lx * side * 1.75 + fx * 0.9, z = rec.z + lz * side * 1.75 + fz * 0.9, per = 1.5, ph = frac(t / per + i * 0.4), face = Math.atan2(rec.x - x, rec.z - z), w = K.person(E, i, ps[i], x, z, face, { warm: true }), U = w.U, dig = ph < 0.45 ? ease(ph / 0.45) : 1 - ease((ph - 0.45) / 0.35), thr = ph > 0.7 ? ease((ph - 0.7) / 0.15) * (1 - ease((ph - 0.85) / 0.15)) : 0;
          U.torso.rotation.set(0.75 * dig - 0.15 * thr, 0.5 * thr * side, 0); U.head.rotation.set(-0.3 * dig, 0, 0); for (let k = 0; k < 2; k++) { U.arms[k].rotation.set(-0.5 - 0.7 * dig + 0.8 * thr, 0, (k ? 1 : -1) * 0.1); U.fore[k].rotation.set(-0.5 - 0.5 * thr, 0, 0); } K.grin(w, 0.3);
          const hx = x + (rec.x - x) * 0.35 * (dig * 0.8 + 0.2), hz = z + (rec.z - z) * 0.35 * (dig * 0.8 + 0.2), sh = K.prop(E, "shovel", i, hx, hz, face, { y: surf(hx, hz) + 0.55 + 0.35 * thr - 0.25 * dig }); sh.rotation.x = 0.15 + 1.0 * dig - 1.2 * thr;
          puff(E, 36, 1.0, 0.18, 0.7, 0.8, 7, (te, q) => { const p2 = frac(te / per + i * 0.4); q.on = p2 > 0.72 && p2 < 0.95 ? 1 : 0; q.x = x + lx * side * 0.3 - lx * side * 1.2 * 0 + (rec.x - x) * 0.2; q.z = z + lz * side * 0.3 + (rec.z - z) * 0.2; q.y = surf(q.x, q.z) + 1.0; q.vx = lx * side * 3.2 + Math.sin(te * 71) * 0.8; q.vz = lz * side * 3.2 + Math.cos(te * 63) * 0.8; q.vy = 2.8; });
          const h = K.headPos(w, _v()); mk(E, h.x, h.y, h.z); }
        const cx = rec.x + fx * 6.0 + lx * 0.4 * Math.sin(t / dur * TAU), cz = rec.z + fz * 6.0 + lz * 0.4 * Math.sin(t / dur * TAU); E.look(cx, surf(cx, cz) + 1.55, cz, rec.x, surf(rec.x, rec.z) + 0.95, rec.z, 60, 0); mk(E, rec.x, surf(rec.x, rec.z) + 0.2, rec.z); mk(E, rec.x, surf(rec.x, rec.z) + 1.6, rec.z); E.needH = 0.2;
      } };
  },
  capfn: (c, v, r) => [`Day two of digging the car out. The car is winning.`, `Only the aerial showed this morning. We have found the doors.`, `Shovel, shovel, shovel. The snow does not run out.`, `Teamwork: one digs, one throws it back where it came from.`][Math.floor(r() * 4)] });

// the painted fallback card (low preset) draws its subject from a small set of silhouettes: each clip names the nearest
const PK = { summitselfie: "summit", kidgrin: "kids", cornice: "powder", hilltail: "powder", herdroad: "deer", foxquay: "deer", snowball: "kids", sledgebank: "kids", wheelie: "powder", roofslide: "plow", bonfire: "summit", digout: "plow" };
for (const id of Object.keys(PK)) if (R.types[id]) R.types[id].pk = PK[id];
K.clips = D; K.clipsReady = true;
})();
