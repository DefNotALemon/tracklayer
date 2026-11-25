// Tracklayer: Gram's moments, part A: people, and the first animals. See tlx-gramkinds.js for how a row works.
(() => {
"use strict";
const K = window.TLXGK; if (!K) return;
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, mulb = K.mulb;
const GH = () => window.TLXGR.H, A = () => GH().A, W = () => GH().A.world, T = () => GH().A.THREE, SP = K.spot, surf = (x, z) => W().surf(x, z);
const who = id => GH().who(id), person = K.person, armTo = K.armTo, markFig = K.markFig;
const yawOfAz = az => Math.atan2(Math.cos(az), Math.sin(az));                                         // trig azimuth -> game yaw (forward = sin, cos)
const opp = az => az + Math.PI;
const openOk = (x, z, r) => GH().openOk(x, z, r);
const _v = () => new (T().Vector3)();
const markBust = (E, w) => { const h = K.headPos(w, _v()), s = w.g.scale.x; E.marks.push([h.x, h.y + 0.14 * s, h.z], [h.x, h.y - 0.42 * s, h.z]); E.faces.push({ x: h.x, y: h.y, z: h.z, yaw: w.o.yaw }); E.needH = 0.29; };
const markHead = (E, w) => { const h = K.headPos(w, _v()), s = w.g.scale.x; E.marks.push([h.x, h.y + 0.14 * s, h.z], [h.x, h.y - 0.13 * s, h.z]); E.faces.push({ x: h.x, y: h.y, z: h.z, yaw: w.o.yaw }); E.needH = 0.28; };
K.PB.log = () => { const g = new (T().Group)(); const m = A().mesh.std(0x6a4a2c, 0.95, 0); const c = new (T().Mesh)(new (T().CylinderGeometry)(0.2, 0.2, 1.5, 10), m); c.rotation.z = Math.PI / 2; c.position.y = 0.2; g.add(c); return g; };
const fishName = c => c.coast ? ["cod", "haddock", "saithe", "halibut", "redfish"] : ["char", "grayling", "trout"];
const kidsOf = p => GH().A && window.TLXN ? TLXN.family(p).filter(q => q && q.age >= 3 && q.age < 14) : [];
const noon = c => c.el > -17;
const T_ = (lines) => lines;

/* ---------------- people ---------------- */
K.add({
  id: "summitselfie", fam: "people", chip: "VIEW", paint: "face", need: { walker: 1 }, close: true,
  w: c => c.lookout && c.lookout.d < 7000 && c.el > -17 && c.storm < 0.55 && c.adult || (c.lookout && c.kid && c.el > -17 && c.storm < 0.5) ? (c.int.photos ? 1.6 : 0.5) + (c.int.ski ? 0.5 : 0) + (c.int.sled ? 0.5 : 0) : 0,
  anchor(c, rng) {
    const sp = SP.lookout(rng, c.vil); if (!sp) return null; let best = null;
    for (let k = 0; k < 8; k++) { const a = rng() * TAU, r = k ? 1.5 + rng() * 14 : 0, px = sp.x + Math.cos(a) * r, pz = sp.z + Math.sin(a) * r; if (!openOk(px, pz, 1.2)) continue; if (Math.abs(surf(px, pz) - surf(sp.x, sp.z)) > 1.2) continue; const bv = SP.bestView(rng, px, pz, 1.7, 20); if (bv && bv.score > 0.2 && (!best || bv.score > best.s)) best = { px, pz, az: bv.az, s: bv.score }; }
    if (!best) return null; return { x: best.px, z: best.pz, a: best.az, place: sp.name, w: [c.p.id] };
  },
  plan(rec, E) {
    const p = who(rec.w[0]), az = rec.a, fy = yawOfAz(opp(az)), px = rec.x, pz = rec.z, r = mulb(rec.sd), roll = (r() - 0.5) * 0.12, wave = r() < 0.6, fov = 62 + r() * 6;
    return { dur: 5, still: 1.1, need: { walker: 1 }, hour: rec.h, storm: rec.s, vig: 0.14,
      frame(t, E) {
        K.begin(E); const w = person(E, 0, p, px, pz, fy, { warm: true }), U = w.U; K.grin(w, 1);
        armTo(w, 1, 0.38, 0.52, 0.4); U.head.rotation.set(-0.05, 0.1 * Math.sin(t * 0.8), 0.1 + 0.03 * Math.sin(t)); U.torso.rotation.set(-0.04, 0, 0);
        if (wave) { U.arms[0].rotation.set(-2.3 - 0.1 * Math.sin(t * 5), 0, -0.35); U.fore[0].rotation.set(-0.45 - 0.3 * Math.sin(t * 5), 0, 0); } else { armTo(w, 0, -0.16, 0.55, 0.15); }
        w.g.updateMatrixWorld(true); const c = new (T().Vector3)(0.4, 0.66, 0.6); U.torso.localToWorld(c); const h = K.headPos(w, _v());
        E.look(c.x, c.y, c.z, h.x, h.y + 0.1 * w.g.scale.x, h.z, fov, roll); markHead(E, w);
      } };
  },
  cap: [["w", "{look}, finally. Look at the view behind me!"], ["c", "Okay so I climbed all the way up {look} for this and my legs have stopped talking to me, but LOOK."], ["d", "{look}. Took the long way up. The view is behind me, in case you cannot tell."], ["t", "{look}. Made it."], ["y", "Selfie at {look}, proof that I went outside on purpose."], ["e", "Stood on {look} {hr} and thought how lucky we are. This one is for the family."], ["w", "Red cheeks, crooked hat, the whole fjord at my back. Happy."], ["c", "{hr} on {look}!! this is what I do instead of cleaning the house!!"], ["y", "{look}: the only place where the wind and I agree about my hat."], ["d", "Got to the top of {look}. The camera blames the wind. I blame the camera."]],
  vars: (c, rec, an) => ({ look: an.place }),
  cm: { pic: ["Why is my own selfie the one I like?"], nb: ["Is that the cairn behind you? Climbed it Tuesday.", "Which way did you come up, past the fence or the gully?", "Good light up there at this hour.", "I know the spot, that is the best view on the whole fell."], grump: ["Did you shut the gate at the bottom?", "Hope you stayed off the cornice."], reply: ["The gully, and never again.", "Gate shut, promise."] }
});

K.add({
  id: "catchheld", fam: "sea", chip: "CATCH", paint: "fish", need: { walker: 1 }, close: true,
  w: c => c.coast && c.el > -17 && c.storm < 0.5 ? (c.int.fish ? 4 : 0.5) : 0,
  anchor(c, rng) {
    const co = c.coast; if (!co) return null; const b = co.yaw; let best = null;
    for (let k = 0; k < 8; k++) { const r = k ? rng() * 14 : 0, a = rng() * TAU, px = co.x + Math.cos(a) * r, pz = co.z + Math.sin(a) * r; if (!openOk(px, pz, 1.2)) continue; let sea = 0; for (let d = 12; d < 200; d += 20) if (W().isSea(px + Math.cos(b) * d, pz + Math.sin(b) * d)) sea++; if (sea >= 3) { best = [px, pz]; break; } }
    if (!best) return null; const fam = c.p.age > 12 ? [c.p] : [c.p]; return { x: best[0], z: best[1], a: b, place: c.vil.name + " harbour", w: [c.p.id], v: Math.floor(rng() * 5) };
  },
  plan(rec, E) {
    const p = who(rec.w[0]), b = rec.a, fy = yawOfAz(opp(b)), r = mulb(rec.sd);
    return { dur: 5, still: 1.0, need: { walker: 1 }, hour: rec.h, storm: rec.s, vig: 0.14,
      frame(t, E) {
        K.begin(E); const w = person(E, 0, p, rec.x, rec.z, fy, { warm: r() < 0.5 }), U = w.U; K.grin(w, 1); const sway = Math.sin(t * 1.6) * 0.03;
        U.torso.rotation.set(-0.08, 0, 0); U.head.rotation.set(-0.04, 0.06, 0.07); armTo(w, 0, -0.2, 0.34, 0.33); armTo(w, 1, 0.2, 0.36, 0.33);
        const f = K.carry(E, w, "fish", 0, 0.36 + sway, 0.36, [0.04, Math.PI / 2, -0.12], { s: 1.15 + 0.15 * r() });
        const h = K.headPos(w, _v()), sc = w.g.scale.x, cx = h.x + Math.sin(fy) * 1.45, cz = h.z + Math.cos(fy) * 1.45;
        E.look(cx, h.y - 0.02, cz, h.x, h.y - 0.26 * sc, h.z, 50, 0);
        markHead(E, w); f.updateMatrixWorld(true); const q = _v().set(0, 0, 0); f.localToWorld(q); E.marks.push([q.x, q.y, q.z]); E.needH = 0.29;
      } };
  },
  vars: (c, rec) => { const r = mulb(rec.sd), f = fishName(c); return { fish: f[Math.floor(r() * f.length)], n: (2 + Math.floor(r() * 14) * 0.5).toFixed(1) }; },
  cap: [["w", "Look at this! {n} kilos of {fish}, straight off the quay."], ["c", "{n} KILOS. {fish}. I am never washing this jacket!!"], ["d", "{fish}. {n} kg. I will not be taking questions."], ["t", "{fish}, {n} kg."], ["y", "Behold, the {fish}. It put up more of a fight than the weather."], ["e", "A good {fish} from {place} today, {n} kilos. Fish soup for the street."], ["w", "Cold hands and a grin that will not go away. {fish}!"], ["c", "ok so it bit at six, I landed it by seven, and now I cannot feel my fingers but LOOK at it"], ["y", "The {fish} was the one that wanted a photograph. I only held it."], ["d", "{n} kg of {fish} for the freezer. The gulls have already been told they are not invited."]],
  cm: { pic: [], nb: ["Fish soup at yours tonight?", "Which side of the quay? I need to know where to stand.", "That is a proper fish. Share some!", "Told you the {place} quay was the spot."], grump: ["You are standing on my net, you know."], reply: ["Soup at seven, bring bread.", "Left of the crane, early."] }
});

K.add({
  id: "kidgrin", fam: "people", chip: "KIDS", paint: "kid", need: { walker: 1 }, close: true,
  w: c => (c.kid || kidsOf(c.p).length) && c.snow && c.el > -17 && c.storm < 0.5 && c.hr >= 10 && c.hr <= 20 ? (c.kid ? 3.5 : 2.4) : 0,
  anchor(c, rng) {
    const ks = c.kid ? [c.p] : kidsOf(c.p); if (!ks.length) return null; const kid = ks[Math.floor(rng() * ks.length)]; const base = c.slope ? [c.slope.x, c.slope.z] : [c.vil.x, c.vil.z], sp = SP.ring(rng, base[0], base[1], 5, c.slope ? 40 : 90, 3); if (!sp) return null;
    const bv = SP.bestView(rng, sp[0], sp[1], 1.0, 20); if (!bv || bv.score < -0.2) return null; return { x: sp[0], z: sp[1], a: bv.az, place: c.vil.name, w: [kid.id] };
  },
  plan(rec, E) {
    const p = who(rec.w[0]), az = rec.a, fy = yawOfAz(opp(az)), r = mulb(rec.sd), col = [0xd8352a, 0x2a6ad0, 0xe0a020, 0x2fa05a][Math.floor(r() * 4)], tilt = (r() - 0.5) * 0.16;
    return { dur: 5, still: 1, need: { walker: 1 }, hour: rec.h, storm: rec.s, vig: 0.14,
      frame(t, E) {
        K.begin(E); const w = person(E, 0, p, rec.x, rec.z, fy, { bn: 0 }), U = w.U; K.grin(w, 1);
        U.head.rotation.set(-0.12, 0.08 * Math.sin(t * 2), tilt + 0.05 * Math.sin(t * 3)); U.torso.rotation.set(-0.04, 0, 0);
        armTo(w, 0, -0.25, 0.18, 0.12); U.arms[1].rotation.set(-2.5 + 0.1 * Math.sin(t * 6), 0, 0.3); U.fore[1].rotation.set(-0.4, 0, 0);
        const sx = rec.x + Math.cos(fy) * 0.55, sz = rec.z - Math.sin(fy) * 0.55; K.prop(E, "plasticSled", 0, sx, sz, fy + 0.5, { c: col, key: "k" + col, rx: 0 });
        const h = K.headPos(w, _v()); const sc = w.g.scale.x; E.look(h.x + Math.sin(fy) * 1.9 * sc + 0.2, h.y + 0.03, h.z + Math.cos(fy) * 1.9 * sc, h.x, h.y - 0.2 * sc, h.z, 50, tilt * 0.5); markBust(E, w);
      } };
  },
  vars: (c, rec) => { const q = who(rec.w[0]); return { kid: q ? q.first : "the kid" }; },
  cap: [["w", "{pic1} after the fifth run down the hill. Cheeks like apples."], ["c", "this is {pic1} and THIS is what happiness looks like!! (sled is out of shot)"], ["d", "{pic1}, the sled, the hill. No further commentary needed."], ["t", "{pic1}. Sledding. Happy."], ["y", "{pic1} has been told it is time to go home four times. This is the face of someone who heard none of it."], ["e", "{pic1} laughing on the way up the hill again. I will remember this winter."], ["w", "Snow in the eyebrows and not a care in the world."], ["c", "{pic1} says she is NOT cold, {pic1} says it with blue lips!!"], ["y", "The hill won. {pic1} is delighted anyway."], ["d", "{pic1}: undefeated against gravity today."]],
  cm: { pic: ["can I post one of you now", "that was the best run"], nb: ["Mine are on that hill too, mind the bottom of it.", "Bring them in for hot chocolate after!", "Lovely smile. Kids here are made of snow."], grump: ["The bottom of that hill is a road, you know."], reply: ["We will, promise.", "Mind the bottom, yes!"] }
});

K.add({
  id: "gpthermos", fam: "people", chip: "FIRE", paint: "fire", need: { walker: 1 }, close: false, wide: false,
  w: c => (c.age_ok || true) && c.el > -17 && c.storm < 0.5 && (c.p.age > 55 || TLXN.family(c.p).some(q => q && q.age > 58)) ? 2.2 + (c.int.ski ? 1 : 0) : 0,
  anchor(c, rng) {
    const elder = c.p.age > 55 ? c.p : TLXN.family(c.p).find(q => q && q.age > 58); if (!elder) return null; const g = SP.gapahuk(c.vil);
    if (g) { const fx = g.x + 2.6 * Math.sin(g.yaw), fz = g.z + 2.6 * Math.cos(g.yaw); return { x: g.x, z: g.z, a: g.yaw, place: (g.t && g.t.name ? g.t.name + " gapahuk" : "the gapahuk"), w: [elder.id], v: 1 }; }
    const sp = SP.ring(rng, c.vil.x, c.vil.z, 30, 160, 5); if (!sp) return null; return { x: sp[0], z: sp[1], a: rng() * TAU, place: "a fire behind " + c.vil.name, w: [elder.id], v: 0 };
  },
  plan(rec, E) {
    const p = who(rec.w[0]), yaw = rec.a, g = { x: rec.x, z: rec.z }, fx = rec.v ? rec.x + 2.6 * Math.sin(yaw) : rec.x, fz = rec.v ? rec.z + 2.6 * Math.cos(yaw) : rec.z, fwd = rec.v ? yaw : rec.a, sn = Math.sin(fwd), cs = Math.cos(fwd);
    const ex = fx - sn * 1.4, ez = fz - cs * 1.4, camx = fx + sn * 2.3, camz = fz + cs * 2.3;
    return { dur: 6, still: 1.2, need: { walker: 1 }, hour: rec.h, storm: rec.s, vig: 0.22, light: { fill: 0.55, hemi: 0.2, exp: 0.5, warm: 0.7, swing: 0.7 },
      frame(t, E) {
        K.begin(E); K.prop(E, "fire", 0, fx, fz, t * 0.1, { s: 1 }); K.lampPool(E, "fire", fx, fz, 9, 0xff8a2a, 0.55 + 0.1 * Math.sin(t * 9));
        K.prop(E, "log", 0, ex - Math.cos(fwd) * 0.0, ez + Math.sin(fwd) * 0.0, fwd + Math.PI / 2, {});
        const w = person(E, 0, p, ex, ez, fwd, { warm: true }), U = w.U; K.sit(w, surf(ex, ez) + 0.42); K.grin(w, 0.6);
        U.head.rotation.set(0.04, 0.12 * Math.sin(t * 0.7), -0.06); armTo(w, 0, -0.14, 0.42, 0.3); armTo(w, 1, 0.18, 0.3, 0.2);
        K.carry(E, w, "cup", -0.14, 0.44, 0.34, [0, 0, 0], { s: 1.1 }); K.prop(E, "thermos", 0, ex + Math.cos(fwd) * 0.55, ez - Math.sin(fwd) * 0.55, 0, { dy: 0.36 });
        const h = K.headPos(w, _v()); E.look(camx, surf(camx, camz) + 1.05, camz, ex, h.y - 0.28, ez, 50, 0); markHead(E, w); E.marks.push([ex, surf(ex, ez) + 0.1, ez]); E.faces.pop(); E.faces.push({ x: h.x, y: h.y, z: h.z, yaw: w.o.yaw }); E.needH = 0.3;
      } };
  },
  vars: (c, rec) => { const q = who(rec.w[0]); return { gp: q ? q.first : "Bestefar", fire: "the fire" }; },
  cap: [["w", "{pic1} at the fire with the thermos. Fifty years on this fell and still the best coffee."], ["c", "{pic1} says the coffee tastes better by a fire, and honestly I am not going to argue with someone who has been right for eighty years"], ["d", "{pic1}. Thermos. Fire. Nothing to add."], ["t", "{pic1} at {place}. Coffee."], ["y", "{pic1} has brought a thermos to a gapahuk, as is the law."], ["e", "{pic1} told the old stories by the fire again. We stayed until the last log."], ["w", "Warm cup, warm fire, warm man. A good day out."], ["c", "{pic1} just poured me a cup and told me I was holding it wrong!!"], ["y", "{pic1} says the fire is too small. It is the third fire he has said that about today."], ["d", "{place}, the fire lit, the thermos open. We could stay all day. We will."]],
  cm: { pic: ["Black, no sugar, always.", "The thermos is older than you are."], nb: ["Is the wood dry up there?", "Save me a cup, I am coming up after lunch.", "Is that the old thermos? Hold on to it."], grump: ["Did anyone put the fire out properly last time?"], reply: ["Wood is dry, someone left a stack.", "Always, there is a second cup."] }
});

/* ---------------- animals, close ---------------- */
K.add({
  id: "wildclose", fam: "animals", chip: "WILD", paint: "deer", need: {}, close: false,
  w: c => c.snow && c.el > -17 && c.storm < 0.6 ? (c.sami ? 1.1 : 0.6) + (c.int.photos ? 0.4 : 0) + (c.int.birds ? 0.2 : 0) : 0,
  anchor(c, rng) {
    const kind = rng() < 0.62 ? "reindeer" : rng() < 0.4 ? "fox" : rng() < 0.5 ? "moose" : "hare", sp = SP.ring(rng, c.vil.x, c.vil.z, 40, 420, 6); if (!sp) return null;
    return { x: sp[0], z: sp[1], a: rng() * TAU, place: c.vil.name, v: kind };
  },
  plan(rec, E) {
    const kind = rec.v || "reindeer", r = mulb(rec.sd), yaw = rec.a, dist = kind === "moose" ? 7.5 : kind === "reindeer" ? 4.8 : kind === "fox" ? 1.9 : 1.6, hh = kind === "moose" ? 2.1 : kind === "reindeer" ? 1.0 : kind === "fox" ? 0.28 : 0.2, hgt = kind === "moose" ? 1.7 : kind === "reindeer" ? 1.2 : kind === "fox" ? 0.45 : 0.4, ca = r() * TAU;
    const cx = rec.x + Math.cos(ca) * dist, cz = rec.z + Math.sin(ca) * dist, ay = yawOfAz(ca + Math.PI + 0.0) , face = Math.atan2(cx - rec.x, cz - rec.z) + (r() - 0.5) * 0.9;
    return { dur: 6, still: 1, need: {}, hour: rec.h, storm: rec.s, vig: 0.2, light: { warm: 0.0 },
      frame(t, E) {
        K.begin(E); const n = kind === "reindeer" ? 1 + Math.floor(r() * 0) : 1; const q = K.animal(E, kind, 0, rec.x, rec.z, face, { s: 1, graze: 0, v: 0 });
        if (kind === "reindeer") { K.animal(E, "reindeer", 1, rec.x + Math.cos(ca + 1.9) * 3.2, rec.z + Math.sin(ca + 1.9) * 3.2, face + 0.8, { graze: 0.7 }); }
        const y = surf(rec.x, rec.z); E.look(cx, surf(cx, cz) + (kind === "moose" ? 1.5 : kind === "reindeer" ? 1.3 : 0.45), cz, rec.x, y + hh, rec.z, kind === "fox" || kind === "hare" ? 44 : 42, 0);
        E.marks.push([rec.x, y + 0.05, rec.z], [rec.x, y + hgt, rec.z]); E.needH = 0.26;
      } };
  },
  vars: (c, rec) => ({ animal: rec.v === "reindeer" ? "reindeer" : rec.v === "moose" ? "moose" : rec.v === "fox" ? "fox" : "hare", an: rec.v === "moose" ? "A moose" : rec.v === "reindeer" ? "A reindeer" : rec.v === "fox" ? "A fox" : "A hare" }),
  cap: [["w", "{an} right behind {place}, looking straight at me. I did not breathe."], ["c", "{an}!! I was just walking to the shop and {an} was JUST THERE and I have so many questions"], ["d", "{an} at {place}. I was here first. Technically."], ["t", "{an}. {place}. Close."], ["y", "{an} walked past as if it owned the road. It probably does."], ["e", "Stood still for ten minutes and the {animal} stood still too. Neither of us blinked."], ["w", "Cold nose, calm eyes. {an} at {place} this {hr}."], ["c", "okay the {animal} looked at me and I looked at the {animal} and honestly I think we understand each other now"], ["y", "Could not get closer without becoming part of the herd. Did not try."], ["d", "The {animal} let me take one photo, then turned its back. Fair."]],
  cm: { pic: [], nb: ["Same one was by my fence at six.", "Keep the dog in, the {animal} is still around.", "That is the one that always crosses by the shop.", "Beautiful. Mind the road."], grump: ["Do not feed it, please."], reply: ["I did not, promise.", "Dog is in, thank you."] }
});

K.ready2 = true;
})();
