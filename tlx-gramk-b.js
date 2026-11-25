// Tracklayer: Gram's moments, part B: action (frozen at the peak) and animals up close.
(() => {
"use strict";
const K = window.TLXGK; if (!K) return;
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, mulb = K.mulb;
const GH = () => window.TLXGR.H, A = () => GH().A, W = () => GH().A.world, T = () => GH().A.THREE, SP = K.spot, surf = (x, z) => W().surf(x, z);
const who = id => GH().who(id), person = K.person, armTo = K.armTo, markFig = K.markFig;
const yawOfAz = az => Math.atan2(Math.cos(az), Math.sin(az));
const openOk = (x, z, r) => GH().openOk(x, z, r);
const _v = () => new (T().Vector3)();
const pickR = (r, a) => a[Math.floor(r() * a.length)];
const markBust = (E, w, k) => { const h = K.headPos(w, _v()), s = w.g.scale.x; E.marks.push([h.x, h.y + 0.14 * s, h.z], [h.x, h.y - (k || 0.42) * s, h.z]); E.faces.push({ x: h.x, y: h.y, z: h.z, yaw: w.o.yaw }); E.needH = 0.3; };
// snow thrown up behind something that moves along a line: closed form in the time it was thrown
K.spray = (E, x0, z0, yaw, speed, size, n, hz) => {
  const fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx;
  E.emitter({ n: n || 90, life: 1.2, size0: 0.3 * size, size1: 1.2 * size, a: 0.6, g: 5, drag: 1.5, spread: 1.7, fn(te, q) { const s = speed * (te - (hz || 0)); q.on = 1; q.x = x0 + fx * s - fx * 1.6; q.z = z0 + fz * s - fz * 1.6; q.y = surf(q.x, q.z) + 0.3; q.vx = -fx * speed * 0.18 + lx * 1.5; q.vz = -fz * speed * 0.18 + lz * 1.5; q.vy = 2.2 + speed * 0.1; } });
};
const slopeDir = c => c.slope ? Math.atan2(c.slope.dx, c.slope.dz) : null;
const NIGHTK = h => clamp((4 - A().sunEl(((h % 24) + 24) % 24)) / 14, 0, 1);

/* ---------------- action ---------------- */
K.add({
  id: "cornice", fam: "action", chip: "AIR", paint: "sled", need: { sled: 1 }, open: true,
  w: c => c.slope && (c.int.sled || c.int.racing || c.adult) && c.snow && c.el > -17 && c.storm < 0.55 ? (c.int.sled ? 3 : 0.6) + (c.int.racing ? 1.5 : 0) : 0,
  anchor(c, rng) { const s = c.slope; if (!s) return null; return { x: s.x - s.dx * 5, z: s.z - s.dz * 5, a: Math.atan2(s.dx, s.dz), place: c.vil.name + " fell", w: [c.p.id] }; },
  plan(rec, E) {
    const r = mulb(rec.sd), yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, v = 13, side = r() < 0.5 ? 1 : -1, night = NIGHTK(rec.h);
    return { dur: 3, still: 1.5, need: { sled: 1 }, hour: rec.h, storm: rec.s, vig: 0.22,
      frame(t, E) {
        K.begin(E); const s = v * (t - 1.5), x = rec.x + fx * (s + 6), z = rec.z + fz * (s + 6), a = E.sleds[0], lift = Math.max(0, 1.7 - 0.9 * Math.pow(t - 1.5, 2));
        E.placeSled(a, x, z, yaw, v, 0.25 * side, false, { lean: 0.2, glance: 0.1 }); a.g.position.y += lift; a.g.rotation.x += 0.06 + 0.1 * (t - 1.5); a.g.rotation.z = 0.06 * side; E.sledLights(a, true, true, night); a.blob.visible = false;
        K.spray(E, rec.x + fx * 6, rec.z + fz * 6, yaw, v, 1.1, 120, 1.5 - 0.0);
        const cx = rec.x + fx * 4 + lx * side * 5.4, cz = rec.z + fz * 4 + lz * side * 5.4, py = surf(x, z) + lift + 0.9;
        E.look(cx, Math.max(surf(cx, cz) + 1.1, py - 0.4), cz, x, py - 0.3, z, 54, -0.03 * side); E.marks.push([x, py - 0.8, z], [x, py + 0.7, z]); E.needH = 0.2;
      } };
  },
  vars: (c, rec) => ({ m: pickR(mulb(rec.sd), ["three", "four", "six", "five"]) }),
  cap: [["w", "Off the edge at {place}. The sled and I held it for exactly one second."], ["c", "OKAY so this is me OFF THE EDGE and yes my mother has seen it and no I will not apologise"], ["d", "{place}. Airborne. Landing not pictured."], ["t", "{place}. Air."], ["y", "Peak of the jump: elegant. Landing: not on the program."], ["e", "A clean jump at {place}, and a careful landing. Slow down in the bumps, all of you."], ["w", "Frozen at the best second, the whole fell underneath."], ["c", "{pic1}'s friend filmed it and THIS is the frame that proves I flew"], ["y", "{m} metres of air and a lot of regret in the knees."], ["d", "Someone has to test the slope. It might as well be the one with the better sled."]],
  cm: { pic: [], nb: ["That is the bump behind {place}, I fixed that fence myself.", "Did you land it? Tell me you landed it.", "Mind the rocks at the bottom of that one.", "Frame it. That is the photo of the winter."], grump: ["That bank is for kids, not for sleds."], reply: ["Landed it. Sort of.", "Rocks missed, fence missed, I count that a win."] }
});

K.add({
  id: "powderturn", fam: "action", chip: "POWDER", paint: "sled", need: { sled: 1 }, open: true,
  w: c => (c.int.sled || c.int.racing) && c.snow && c.el > -17 && c.storm < 0.5 && (c.depth > 0.15 || c.sinceStorm) ? 2.6 : 0,
  anchor(c, rng) { const sp = SP.ring(rng, c.vil.x, c.vil.z, 150, 1100, 6); if (!sp) return null; const yaw = rng() * TAU; for (let d = -12; d <= 42; d += 6) if (!openOk(sp[0] + Math.sin(yaw) * d, sp[1] + Math.cos(yaw) * d, 2.5)) return null; return { x: sp[0], z: sp[1], a: yaw, place: c.vil.name + " backcountry", w: [c.p.id] }; },
  plan(rec, E) {
    const r = mulb(rec.sd), yaw0 = rec.a, v = 11, om = (r() < 0.5 ? 1 : -1) * 0.5, night = NIGHTK(rec.h), R = v / Math.abs(om);
    const pos = (t, o) => { const y = yaw0 + om * (t - 2.5); const k = v / om; o.x = rec.x + k * (Math.cos(yaw0) - Math.cos(y)); o.z = rec.z + k * (Math.sin(y) - Math.sin(yaw0)); o.y = y; return o; };
    const o = { x: 0, z: 0, y: 0 };
    return { dur: 5, still: 2.5, need: { sled: 1 }, hour: rec.h, storm: rec.s, vig: 0.22,
      frame(t, E) {
        K.begin(E); pos(t, o); const a = E.sleds[0]; E.placeSled(a, o.x, o.z, o.y, v, -Math.sign(om) * 1.2, false, { lean: 0.15 }); E.sledLights(a, true, true, night); a.g.rotation.z += -Math.sign(om) * 0.22; a.body.rotation.z = -Math.sign(om) * 0.2;
        const o2 = { x: 0, z: 0 }; E.emitter({ n: 180, life: 1.3, size0: 0.35, size1: 1.6, a: 0.62, g: 4.5, drag: 1.4, spread: 1.4, fn(te, q) { const p = { x: 0, z: 0, y: 0 }; pos(te, p); q.on = 1; const sx = Math.cos(p.y), sz = -Math.sin(p.y), sg = -Math.sign(om); q.x = p.x + sx * 0.6 * sg - Math.sin(p.y) * 1.2; q.z = p.z + sz * 0.6 * sg - Math.cos(p.y) * 1.2; q.y = surf(q.x, q.z) + 0.35; q.vx = sx * sg * 4.2 - Math.sin(p.y) * 1.4; q.vz = sz * sg * 4.2 - Math.cos(p.y) * 1.4; q.vy = 2.6; } });
        const fa = o.y + Math.PI * 0.62 * Math.sign(om), cx = o.x + Math.sin(fa) * 5.6, cz = o.z + Math.cos(fa) * 5.6, py = surf(o.x, o.z) + 0.8; E.look(cx, surf(cx, cz) + 0.45, cz, o.x, py, o.z, 52, 0.05 * Math.sign(om)); E.marks.push([o.x, py - 0.7, o.z], [o.x, py + 0.8, o.z]); E.needH = 0.2;
      } };
  },
  cap: [["w", "Waist-deep powder behind {place} and the sled laughing the whole way round."], ["c", "THE POWDER. {place}. I have never been this happy and I have snow in places I did not know I had"], ["d", "Fresh snow, a long turn, no one else around."], ["t", "Powder. {place}."], ["y", "The turn went exactly as planned. The snow in my collar was not in the plan."], ["e", "A quiet morning in the powder at {place}. These are the days you remember."], ["w", "Carving through the fresh at {hr}. Cold face, warm heart."], ["c", "okay so I went round once and then I went round nine more times"], ["y", "Leaving a signature in the snow. Legible from space, I am told."], ["d", "Untracked until I got there. Tracked now."]],
  cm: { pic: [], nb: ["Where is that? It looks like past the second lake.", "Save some for us!", "Did you wear the beacon? Always the beacon.", "That spray! Perfect frame."], grump: ["Stay off the reindeer pasture, please."], reply: ["Second lake, yes. Beacon on.", "Far from the pasture, promise."] }
});

K.add({
  id: "hilltail", fam: "action", chip: "CLIMB", paint: "sled", need: { sled: 1 }, open: true,
  w: c => c.slope && (c.int.sled || c.int.racing) && c.snow && c.el > -17 && c.storm < 0.55 ? 2.4 : 0,
  anchor(c, rng) { const s = c.slope; if (!s) return null; return { x: s.x, z: s.z, a: Math.atan2(-s.dx, -s.dz), place: c.vil.name + " hill", w: [c.p.id] }; },
  plan(rec, E) {
    const r = mulb(rec.sd), yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, side = r() < 0.5 ? 1 : -1, night = NIGHTK(rec.h);
    return { dur: 3, still: 1.2, need: { sled: 1 }, hour: rec.h, storm: rec.s, vig: 0.22,
      frame(t, E) {
        K.begin(E); const x = rec.x + fx * (t - 1.2) * 3, z = rec.z + fz * (t - 1.2) * 3, a = E.sleds[0];
        E.placeSled(a, x, z, yaw, 6, 0, false, { lean: -0.2 }); a.g.rotation.x -= 0.6; a.g.position.y += 0.3; E.sledLights(a, true, true, night); a.blob.visible = false;
        E.emitter({ n: 120, life: 1.2, size0: 0.4, size1: 1.5, a: 0.6, g: 4.5, drag: 1.3, spread: 1.6, fn(te, q) { q.on = 1; q.x = x - fx * 1.9 + lx * 0.3 * Math.sin(te * 9); q.z = z - fz * 1.9 + lz * 0.3 * Math.sin(te * 9); q.y = surf(q.x, q.z) + 0.35; q.vx = -fx * 3; q.vz = -fz * 3; q.vy = 3.2; } });
        const cx = x + lx * side * 6.2 + fx * 0.6, cz = z + lz * side * 6.2 + fz * 0.6, py = surf(x, z) + 1.1; E.look(cx, surf(cx, cz) + 0.7, cz, x, py, z, 50, 0); E.marks.push([x, py - 0.6, z], [x, py + 1.0, z]); E.needH = 0.2;
      } };
  },
  cap: [["w", "The hill won this one. Sled on its tail at {place}, me hanging on."], ["c", "HALF A SECOND LATER I was on my back in the snow but LOOK at the angle!!"], ["d", "{place}. The sled stood up. I stayed with it."], ["t", "{place}. Nearly."], ["y", "The sled is trying to tell me something about the throttle."], ["e", "{place} is steeper than it looks. We made it back down in one piece."], ["w", "Right on the edge of it. The engine pulled, the hill pushed back."], ["c", "{pic1} says it was a controlled wheelie. {pic1} is lying"], ["y", "Technically a vertical take-off."], ["d", "Third try at {place}. The first two do not exist."]],
  cm: { pic: [], nb: ["Ha! Same hill took my brother's skis last winter.", "Lean forward, lean forward!", "Did the sled make it up in the end?", "That angle! Frame it."], grump: ["That is a hill for kids with plastic sleds."], reply: ["Made it on the fourth go.", "Leaning, leaning."] }
});

K.add({
  id: "sledgebank", fam: "action", chip: "KIDS", paint: "kid", need: { walker: 3 }, close: false,
  w: c => (c.kid || c.kidsList.length) && c.slope && c.snow && c.el > -17 && c.storm < 0.45 && c.hr >= 11 && c.hr <= 19 ? 3 : 0,
  anchor(c, rng) {
    const s = c.slope; if (!s) return null; const ks = TLXN.peopleIn(c.vil.id).filter(q => q.age >= 5 && q.age <= 13), fk = (c.kid ? [c.p] : c.kidsList).concat(ks.filter(() => rng() < 0.5)); const seen = new Set(), picks = []; for (const k of fk) { if (!seen.has(k.id) && picks.length < (rng() < 0.3 ? 3 : 2)) { seen.add(k.id); picks.push(k); } } if (picks.length < 2) return null;
    return { x: s.x, z: s.z, a: Math.atan2(s.dx, s.dz), place: c.vil.name, w: picks.map(q => q.id) };
  },
  plan(rec, E) {
    const r = mulb(rec.sd), yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, ps = rec.w.map(who).filter(Boolean), cols = [0xd8352a, 0x2a6ad0, 0xe0a020];
    return { dur: 4, still: 1, need: { walker: 3 }, hour: rec.h, storm: rec.s, vig: 0.18, light: { fill: 0.5 },
      frame(t, E) {
        K.begin(E); const cx = rec.x + fx * 8.7, cz = rec.z + fz * 8.7;
        ps.forEach((p, i) => {
          const off = (i - (ps.length - 1) / 2) * 1.15 + (r() - 0.5) * 0.2, back = 4.6 - i * 0.45 + (t - 1) * 8, x = rec.x + lx * off + fx * back, z = rec.z + lz * off + fz * back, face = yaw + (i - 1) * 0.12;
          K.prop(E, "plasticSled", i, x, z, face, { c: cols[i], key: "s" + cols[i], dy: 0.02, rx: -0.08 }); const w = person(E, i, p, x, z, face, { }); K.sit(w, surf(x, z) + 0.15, { lean: -0.2 }); K.grin(w, 1);
          const U = w.U; U.head.rotation.set(-0.15, 0.05, (i - 1) * 0.12); U.arms[0].rotation.set(-2.5 + 0.15 * Math.sin(t * 8 + i), 0, -0.4); U.fore[0].rotation.set(-0.3, 0, 0); U.arms[1].rotation.set(-1.0, 0, 0.35); U.fore[1].rotation.set(-0.9, 0, 0);
          const h = K.headPos(w, _v()); E.marks.push([h.x, h.y + 0.14 * w.g.scale.x, h.z], [x, surf(x, z), z]); E.faces.push({ x: h.x, y: h.y, z: h.z, yaw: face });
          E.emitter({ n: 40, life: 1, size0: 0.25, size1: 0.9, a: 0.5, g: 5, drag: 1.5, spread: 1.2, fn(te, q) { q.on = 1; q.x = x - fx * 1.4 * 0 + fx * -8 * (te - t); q.z = z + fz * -8 * (te - t); q.y = surf(q.x, q.z) + 0.2; q.vx = -fx * -3; q.vz = -fz * -3; q.vy = 1.8; } });
        });
        const dh = 0.95; const mx = rec.x + fx * (4.1 + (t - 1) * 8), mz = rec.z + fz * (4.1 + (t - 1) * 8); E.look(cx, surf(cx, cz) + 1.1, cz, mx, surf(mx, mz) + dh, mz, 54, 0); E.needH = 0.2;
      } };
  },
  vars: (c, rec) => ({ kids: rec.w.map(q => (who(q) || {}).first).join(", ").replace(/, ([^,]*)$/, " and $1") }),
  cap: [["w", "{kids} on the way down the hill behind {place}. Nobody is going in for lunch."], ["c", "SLEDDING!! {kids} have done this hill about forty times and I have been told to stop counting"], ["d", "{kids}. The hill. Three sleds. Zero regrets."], ["t", "{kids} on the hill."], ["y", "{kids} have discovered that gravity is free. The rest of us are paying for the hot chocolate."], ["e", "{kids} laughing all the way down. This is what the winter is for."], ["w", "All three of them at once, shrieking. Happy children, red cheeks."], ["c", "{kids} came down so fast I did not even get the focus right but you can SEE the joy"], ["y", "Three sleds, one hill, and an agreement about who goes first that lasted four seconds."], ["d", "Snow in the hair. Snow in the mittens. That is a good day."]],
  cm: { pic: ["I won!", "next one is mine", "can we go again?"], nb: ["Mind the bottom of the hill, there is a road.", "Mine are on the other side, wave to them!", "Hot chocolate at ours after!"], grump: ["The shouting can be heard from the other side of the fjord."], reply: ["Mind the road, yes. We will.", "Wave sent."] }
});

K.add({
  id: "snowball", fam: "action", chip: "FUN", paint: "kid", need: { walker: 2 }, close: false,
  w: c => (c.kid || c.kidsList.length || c.household > 2) && c.snow && c.el > -17 && c.storm < 0.4 && c.hr >= 10 && c.hr <= 20 ? 2.2 : 0,
  anchor(c, rng) {
    const fam = TLXN.family(c.p).filter(q => q && q.age > 5), pool = fam.length >= 2 ? fam : TLXN.peopleIn(c.vil.id).filter(q => q.age > 6 && q.age < 60), a = pool[Math.floor(rng() * pool.length)], b = pool[Math.floor(rng() * pool.length)]; if (!a || !b || a.id === b.id) return null;
    const sp = SP.ring(rng, c.vil.x, c.vil.z, 20, 130, 6); if (!sp) return null; const bv = SP.bestView(rng, sp[0], sp[1], 1.3, 16); return { x: sp[0], z: sp[1], a: bv ? bv.az : rng() * TAU, place: c.vil.name, w: [a.id, b.id] };
  },
  plan(rec, E) {
    const r = mulb(rec.sd), az = rec.a, fy = yawOfAz(az + Math.PI), pa = who(rec.w[0]), pb = who(rec.w[1]), fx = Math.sin(fy), fz = Math.cos(fy), lx = fz, lz = -fx;
    return { dur: 3, still: 1, need: { walker: 2 }, hour: rec.h, storm: rec.s, vig: 0.18,
      frame(t, E) {
        K.begin(E); const x1 = rec.x, z1 = rec.z, x2 = x1 - fx * 3.2 + lx * 1.9, z2 = z1 - fz * 3.2 + lz * 1.9;
        const w1 = person(E, 0, pa, x1, z1, fy + Math.PI - 0.3, {}), U = w1.U; K.grin(w1, 1); U.torso.rotation.set(-0.12, -0.5, 0); U.head.rotation.set(0, 0.5, 0.05); U.arms[1].rotation.set(-0.5, 0, 0.5); U.fore[1].rotation.set(-1.6, 0, 0); armTo(w1, 0, -0.1, 0.9, 0.3); U.arms[0].rotation.set(-2.9, 0, -0.5); U.fore[0].rotation.set(-0.5, 0, 0);
        const sb = K.prop(E, "snowball", 0, x1, z1, 0, { y: surf(x1, z1) + 2.05 * w1.g.scale.x, s: 1.6 }); const w2 = person(E, 1, pb, x2, z2, fy + 0.2, {}); w2.U.torso.rotation.set(0.1, 0.4, 0); w2.U.head.rotation.set(0, 0.6, 0);
        K.prop(E, "snowball", 1, x2 + Math.sin(fy) * 0.6, z2 + Math.cos(fy) * 0.6, 0, { y: surf(x2, z2) + 1.15, s: 1.7 });
        const h = K.headPos(w1, _v()), cx = x2 - fx * 1.0 + lx * 0.2, cz = z2 - fz * 1.0 + lz * 0.2; E.look(cx, surf(cx, cz) + 1.3, cz, h.x, h.y - 0.45, h.z, 58, 0.04); markFig(E, w1, true); E.needH = 0.2;
      } };
  },
  cap: [["w", "{pic1} and {pic2} at it again behind {place}. I took the only shot before the snowball hit."], ["c", "THE SNOWBALL FIGHT OF THE CENTURY!! {pic1} versus {pic2}, I am hiding behind the fence"], ["d", "{pic1} has a snowball. {pic2} has no plan."], ["t", "{pic1} vs {pic2}."], ["y", "{pic2} is about to learn that {pic1} has been practising."], ["e", "Laughing so hard that nobody saw it coming. {pic1} and {pic2}, a good afternoon."], ["w", "Snow flying, hats lost, and everyone grinning."], ["c", "{pic1} said it was only a little snowball. It was not little"], ["y", "Evidence for the court: {pic1} threw first."], ["d", "{pic2} will be wet in about one second. It was worth the photo."]],
  cm: { pic: ["I threw first? Never.", "I will get you back.", "That was a perfect throw."], nb: ["We heard the shouting from the road. Fine afternoon for it.", "Aim for the hat!"], grump: ["Not at the windows, please."], reply: ["Only at {pic1}.", "Not at the windows, promise."] }
});

K.add({
  id: "trailskier", fam: "action", chip: "SKI", paint: "ski", need: {}, close: false,
  w: c => c.int.ski && c.snow && c.el > -17 && c.storm < 0.55 && window.TLXSK && TLXSK.ready ? 2.6 : 0,
  anchor(c, rng) { const t = SP.trail(rng, c.vil, false); if (!t) return null; return { x: t.x, z: t.z, a: t.yaw, place: t.name, w: [c.p.id] }; },
  plan(rec, E) {
    const p = who(rec.w[0]), yaw = rec.a, r = mulb(rec.sd), night = NIGHTK(rec.h), cyaw = yaw + Math.PI + (r() - 0.5) * 0.5, fx = Math.sin(cyaw), fz = Math.cos(cyaw);
    return { dur: 3, still: 1, need: {}, hour: rec.h, storm: rec.s, vig: 0.2, light: night > 0.4 ? { fill: 0.7, warm: 0.2 } : undefined,
      frame(t, E) {
        K.begin(E); const X = window.TLXSK, g = X.shotPose({ x: rec.x, z: rec.z, yaw: cyaw, p: p ? p.id : 0, pack: true, lamp: night > 0.3 }); E.skierOn = !!g; const y = surf(rec.x, rec.z), cx = rec.x + fx * 4.6, cz = rec.z + fz * 4.6;
        E.look(cx, surf(cx, cz) + 1.35, cz, rec.x, y + 1.0, rec.z, 48, 0); E.marks.push([rec.x, y + 1.75, rec.z], [rec.x, y + 0.05, rec.z]); E.faces.push({ x: rec.x, y: y + 1.6, z: rec.z, yaw: cyaw }); E.needH = 0.3;
        if (night > 0.3) K.lampPool(E, "ski", rec.x + fx * 0.8, rec.z + fz * 0.8, 6, 0xfff0c8, 0.5);
      } };
  },
  vars: (c, rec, an) => { const q = who(rec.w[0]); return { trail: (an && an.place || rec.place || "") || "the trail", km: (3 + (rec.sd % 80) / 10).toFixed(1) }; },
  cap: [["w", "Stopped on {trail} for one photo. Ten kilometres to go and the snow is perfect."], ["c", "{trail}!! {km} km so far and I have not met a single soul, which is exactly how I like it"], ["d", "{trail}. Skis, poles, cold. All present."], ["t", "{trail}. Out."], ["y", "{trail}, {km} km. The knees are filing paperwork."], ["e", "Out on {trail} {hr}. The track is kept, the air is clean, and I am grateful."], ["w", "A good track and a good day. Thank you to whoever sets {trail}."], ["c", "someone stopped me on {trail} and said smile!! so I did"], ["y", "Pausing to admire the view. Not at all to breathe."], ["d", "{trail}. {km} km. I will not discuss the uphill."]],
  cm: { pic: [], nb: ["Was the track set this morning?", "Is that the stretch before the lamp posts?", "We go that way on Saturdays. Say hello if you see us.", "Good colour on the jacket, easy to find in a whiteout."], grump: ["Hold your poles so the sled people can see them."], reply: ["Set this morning, firm and fast.", "Poles held high, promise."] }
});

/* ---------------- animals ---------------- */
K.add({
  id: "reindeernose", fam: "animals", chip: "SNOW HOLE", paint: "deer", need: {}, close: true, open: true,
  w: c => c.snow && c.el > -17 && c.storm < 0.6 ? (c.sami ? 1.4 : 0.7) + (c.int.dogs ? 0.4 : 0) + (c.int.photos ? 0.5 : 0) : 0,
  anchor(c, rng) { const sp = SP.ring(rng, c.vil.x, c.vil.z, 60, 700, 5); if (!sp) return null; return { x: sp[0], z: sp[1], a: rng() * TAU, place: c.vil.name, w: [] }; },
  plan(rec, E) {
    const r = mulb(rec.sd), ca = r() * TAU, d = 2.3, face = Math.atan2(Math.cos(ca), Math.sin(ca)) ;
    const cx = rec.x + Math.cos(ca) * d, cz = rec.z + Math.sin(ca) * d, cyaw = Math.atan2(rec.x - cx, rec.z - cz);
    return { dur: 4, still: 1, need: {}, hour: rec.h, storm: rec.s, vig: 0.12, light: { fill: 0.95 },
      frame(t, E) {
        K.begin(E); const q = K.animal(E, "reindeer", 0, rec.x, rec.z, face, { graze: 0, v: 0 }); q.head.updateWorldMatrix(true, false); const h = _v(); q.head.getWorldPosition(h);
        K.animal(E, "reindeer", 1, rec.x + Math.cos(ca + 2.2) * 4.5, rec.z + Math.sin(ca + 2.2) * 4.5, face + 0.7, { graze: 0.8 });
        E.look(cx, surf(cx, cz) + 0.55, cz, h.x, h.y + 0.04, h.z, 54, 0); E.marks.push([h.x, h.y - 0.28, h.z], [h.x, h.y + 0.5, h.z]); E.needH = 0.28;
      } };
  },
  cap: [["w", "She walked right up and breathed on the lens. I did not move."], ["c", "A REINDEER NOSE. IN THE LENS. I will never wash this phone again!!"], ["d", "Close enough to count the whiskers. I stopped counting."], ["t", "Reindeer. Very close."], ["y", "The reindeer has opinions about my camera. They are not favourable."], ["e", "We stood nose to nose for a minute. I think she was checking on me."], ["w", "Big dark eyes, frost on her muzzle. Just us and the snow."], ["c", "okay so she was licking the snow next to my boot and then SHE LOOKED UP"], ["y", "Technically I am the one in her field."], ["d", "She sniffed the phone and left. Review: not edible."]],
  cm: { pic: [], nb: ["That is one of the herder's, she has a notch in her right ear.", "They come down to the village when the snow crusts up.", "Please do not feed them, they get used to it.", "Lucky you! They never come this close for me."], grump: ["Keep your distance, they are tired this time of year."], reply: ["Did not feed, did not move.", "I stayed still, promise."] }
});

K.add({
  id: "herdroad", fam: "animals", chip: "ROAD", paint: "deer", need: {}, close: false, open: true,
  w: c => c.snow && c.el < 6 && c.storm < 0.7 && (c.sami || c.adult) ? 1.2 + (c.el < -2 ? 1.4 : 0) : 0,
  anchor(c, rng) { const rd = SP.road(rng, c.vil); if (!rd) return null; return { x: rd.x, z: rd.z, a: rd.yaw, place: rd.name || (c.vil.name + " road"), w: [] }; },
  plan(rec, E) {
    const r = mulb(rec.sd), yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, night = NIGHTK(rec.h), n = 4 + Math.floor(r() * 3);
    const cx = rec.x - fx * 7.2, cz = rec.z - fz * 7.2;
    return { dur: 5, still: 1, need: {}, hour: rec.h, storm: rec.s, vig: 0.26, light: { fill: 0.35, hemi: 0.15, warm: 0.2 },
      frame(t, E) {
        K.begin(E); const rr = mulb(rec.sd + 7); let mnx = 9, mxx = -9;
        for (let i = 0; i < n; i++) { const along = (i % 3) * 2.2 + rr() * 1.6, across = (i - (n - 1) / 2) * 1.4 + (rr() - 0.5) * 0.8 + (t - 1) * 0.8, x = rec.x + fx * along + lx * across, z = rec.z + fz * along + lz * across, q = K.animal(E, "reindeer", i, x, z, yaw + Math.PI / 2 + (rr() - 0.5) * 0.5, { v: 0.3, graze: 0, dt: 0.04 * t }); E.marks.push([x, surf(x, z) + 0.2, z]); }
        E.marks.length = 0; E.marks.push([rec.x, surf(rec.x, rec.z) + 0.1, rec.z], [rec.x, surf(rec.x, rec.z) + 1.75, rec.z]); if (night > 0.1) { K.lampPool(E, "head", rec.x - fx * 4.5, rec.z - fz * 4.5, 12, 0xfff0d0, 0.65 * night); }
        E.look(cx, surf(cx, cz) + 1.15, cz, rec.x, surf(rec.x, rec.z) + 1.1, rec.z, 52, 0); E.needH = 0.2;
      } };
  },
  vars: (c, rec, an) => ({ road: (an && an.place || rec.place || "") }),
  cap: [["w", "The whole herd across {road} in the headlights. Everybody waited and nobody minded."], ["c", "OKAY the herd just crossed {road} and every single car stopped and turned the engine off, it was like church"], ["d", "{road}. Reindeer. We are the traffic jam now."], ["t", "Herd on {road}. Waited."], ["y", "They crossed {road} in their own time, as they have for a thousand years. We were guests."], ["e", "The herd came down onto {road} at dusk. We sat in the car and watched the whole river of them."], ["w", "Antlers in the lights, breath in the cold. I never get tired of this."], ["c", "twenty minutes on {road} behind the herd and I would do it again tomorrow"], ["y", "The speed limit on {road} is set by whoever has antlers."], ["d", "Stopped on {road}. Not for the police."]],
  cm: { pic: [], nb: ["I was in the car behind you, did you see the little one?", "That is the herd from the river. They cross every evening in this snow.", "They always pick the bend, never the straight!", "Slow down for them at the bend, everybody."], grump: ["I was late for work because of this. Lovely picture though."], reply: ["The little one, yes!", "Always the bend."] }
});

K.add({
  id: "foxquay", fam: "animals", chip: "FOX", paint: "deer", need: {}, close: true,
  w: c => c.coast && c.el > -17 && c.storm < 0.5 ? (c.int.birds ? 1.4 : 0.9) + (c.int.fish ? 1 : 0) : 0,
  anchor(c, rng) { const co = c.coast; if (!co) return null; const a = rng() * TAU, sp = [co.x + Math.cos(a) * 4, co.z + Math.sin(a) * 4]; if (!openOk(sp[0], sp[1], 1)) return null; return { x: sp[0], z: sp[1], a: rng() * TAU, place: c.vil.name + " quay", w: [] }; },
  plan(rec, E) {
    const r = mulb(rec.sd), ca = r() * TAU, d = 1.9, cx = rec.x + Math.cos(ca) * d, cz = rec.z + Math.sin(ca) * d, face = Math.atan2(Math.cos(ca), Math.sin(ca)) + (r() - 0.5) * 0.7;
    return { dur: 4, still: 1, need: {}, hour: rec.h, storm: rec.s, vig: 0.22, light: { fill: 0.55 },
      frame(t, E) {
        K.begin(E); const q = K.animal(E, "fox", 0, rec.x, rec.z, face, { v: 0 }); const hd = _v(); q.head.getWorldPosition(hd);
        const fe = E.extraOf("gc:foxfish", () => { const g = K.PB.fish({ s: 0.5 }), rr = new (T().Group)(); rr.add(g); rr.traverse(o => { o.frustumCulled = false; }); return rr; }); if (fe.m.parent !== q.head) q.head.add(fe.m); fe.m.position.set(0, -0.07, 0.17); fe.m.rotation.set(0, Math.PI / 2, 0.3); fe.m.scale.setScalar(0.62); fe.m.visible = true; fe.on = true;
        E.look(cx, surf(cx, cz) + 0.5, cz, hd.x, hd.y - 0.1, hd.z, 46, 0); E.marks.push([hd.x, hd.y - 0.3, hd.z], [hd.x, hd.y + 0.25, hd.z]); E.needH = 0.26;
      } };
  },
  cap: [["w", "The fox that took a fish off the quay, caught in the act and not one bit sorry."], ["c", "THE FOX. THE FISH. The whole village has been losing cod to this one for a week and now I have PROOF"], ["d", "Fox. Quay. Fish. It looked at me. I looked at the fish."], ["t", "Fox with my fish."], ["y", "Evidence: one fox, one stolen cod, no remorse."], ["e", "I should be angry about the fish. I cannot be, look at its face."], ["w", "White coat, black nose, and our dinner. Beautiful thief."], ["c", "it just trotted up, picked it up, turned round and gave me a LOOK"], ["y", "The fox has better fishing luck than half the harbour."], ["d", "A fox with a cod at {place}. I am not chasing it."]],
  cm: { pic: [], nb: ["It took one from my crate Tuesday!", "Is that the cod from the green boat? Because that is mine.", "Same fox that sits on the bait shed every morning.", "Put the fish in the lid-box, it knows the lids."], grump: ["Do not feed foxes, it only makes it worse."], reply: ["I did not feed it, it just took it.", "Lids on from tomorrow."] }
});

K.add({
  id: "moosewindow", fam: "animals", chip: "MOOSE", paint: "deer", need: {}, close: false, open: true,
  w: c => c.snow && c.storm < 0.6 && c.hr >= 14 || c.hr < 9 ? (c.vil && ["lebesby", "ifjord", "skjanes"].includes(c.vil.id) ? 1.0 : 0.4) : 0,
  anchor(c, rng) { const d = SP.door(rng, c.vil); if (!d) return null; return { x: d.x + d.nx * 5.5, z: d.z + d.nz * 5.5, a: d.yaw, place: c.vil.name, w: [], v: 0 }; },
  plan(rec, E) {
    const r = mulb(rec.sd), yaw = rec.a, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = fz, lz = -fx, face = yaw + Math.PI + (r() - 0.5) * 1.1, cx = rec.x + fx * 7.5 + lx * 2.2, cz = rec.z + fz * 7.5 + lz * 2.2;
    return { dur: 4, still: 1, need: {}, hour: rec.h, storm: rec.s, vig: 0.24, light: { fill: 0.5 },
      frame(t, E) {
        K.begin(E); const q = K.animal(E, "moose", 0, rec.x, rec.z, face, { v: 0 }); const hd = _v(); q.head.getWorldPosition(hd);
        E.look(cx, surf(cx, cz) + 1.5, cz, rec.x - fx * 1.5, surf(rec.x, rec.z) + 1.5, rec.z - fz * 1.5, 50, 0); E.marks.push([rec.x, surf(rec.x, rec.z) + 0.2, rec.z], [hd.x, hd.y + 0.3, hd.z]); E.needH = 0.25;
      } };
  },
  cap: [["w", "A moose at our kitchen window, looking in at the waffles. We looked back."], ["c", "THERE IS A MOOSE LOOKING IN OUR WINDOW and the kids are screaming and the moose is chewing the hedge"], ["d", "Moose. Garden. I am staying in."], ["t", "Moose at the window."], ["y", "The moose has been standing at the window for ten minutes. I think it wants the recipe."], ["e", "A big bull, close to the house. We kept the lights low and let it be."], ["w", "Tall as the window, quiet as the snow. What a visitor."], ["c", "okay so it ate half of the birch and then stared at ME through the glass"], ["y", "Hedge trimmed free of charge. Standard moose service."], ["d", "The moose is on the lawn. The lawn is under a metre of snow. The moose does not care."]],
  cm: { pic: [], nb: ["Mine had the same one this morning, it likes the rowan.", "Keep the dog in!", "Is that the bull with the broken tine?", "Stay inside, a moose that size is not to be argued with."], grump: ["It ate my hedge last week. Please send it back."], reply: ["Dog is in.", "Hedge eaten. Tea made."] }
});

})();
