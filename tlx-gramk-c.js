// Tracklayer: Gram's moments, part C: the rest of people, the sea and the work, the weather at the door, cosy, funny, and what happened to you.
(() => {
"use strict";
const K = window.TLXGK; if (!K) return;
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, mulb = K.mulb;
const GH = () => window.TLXGR.H, A = () => GH().A, W = () => GH().A.world, T = () => GH().A.THREE, SP = K.spot, surf = (x, z) => W().surf(x, z);
const who = id => GH().who(id), person = K.person, armTo = K.armTo, markFig = K.markFig;
const yawOfAz = az => Math.atan2(Math.cos(az), Math.sin(az));
const openOk = (x, z, r) => GH().openOk(x, z, r);
const _v = () => new (T().Vector3)();
const NIGHTK = h => clamp((4 - A().sunEl(((h % 24) + 24) % 24)) / 14, 0, 1);
const PB = K.PB;
PB.shovel = () => { const g = new (T().Group)(), w = A().mesh.std(0x8a6a3a, 0.9, 0), m = A().mesh.std(0x8a949e, 0.4, 0.6); const h = new (T().Mesh)(new (T().CylinderGeometry)(0.014, 0.014, 1.1, 6), w); h.rotation.x = Math.PI / 2; h.position.z = 0.1; g.add(h); const b = new (T().Mesh)(new (T().BoxGeometry)(0.3, 0.02, 0.36), m); b.position.z = 0.78; b.rotation.x = 0.25; g.add(b); const gr = new (T().Mesh)(new (T().BoxGeometry)(0.12, 0.03, 0.03), w); gr.position.z = -0.42; g.add(gr); return g; };
PB.drift = (o) => { const g = new (T().Group)(), m = A().mesh.std(0xeef3f8, 0.97, 0), s = o && o.s || 1; for (const [x, z, r, h] of [[0, 0, 1.0, 0.7], [0.9, 0.3, 0.8, 0.5], [-0.8, -0.2, 0.9, 0.55], [0.2, 0.7, 0.7, 0.45]]) { const e = new (T().Mesh)(new (T().SphereGeometry)(1, 12, 8), m); e.scale.set(r * s, h * s, r * s); e.position.set(x * s, 0.05, z * s); g.add(e); } return g; };
PB.wall = () => { const g = new (T().Group)(), m = A().mesh.std(0xeaf0f6, 0.97, 0); const e = new (T().Mesh)(new (T().SphereGeometry)(1, 16, 12), m); e.scale.set(2.4, 1.7, 0.9); e.position.y = 0.4; g.add(e); const e2 = new (T().Mesh)(new (T().SphereGeometry)(1, 12, 8), m); e2.scale.set(1.4, 1.3, 0.8); e2.position.set(1.4, 0.2, -0.2); g.add(e2); return g; };
// a spot in front of a house door: { x, z (the subject), nx, nz (out), yaw (facing out), door }
const frontOf = (c, rng, dist, wide) => { const d = SP.door(rng, c.vil); if (!d) return null; const lat = (wide ? (rng() - 0.5) * wide : 0), x = d.x + d.nx * dist + d.nz * lat, z = d.z + d.nz * dist - d.nx * lat; if (!openOk(x, z, 0.8)) return null; return { x, z, a: d.yaw, dx: d.x, dz: d.z, place: c.vil.name }; };
// camera in front of a door scene: cd metres out along the door's normal, looking back at the subject
const camFront = (E, rec, cd, ch, ty, fov, lat) => { const nx = Math.sin(rec.a), nz = Math.cos(rec.a), cx = rec.x + nx * cd + nz * (lat || 0), cz = rec.z + nz * cd - nx * (lat || 0); E.look(cx, surf(cx, cz) + ch, cz, rec.x, surf(rec.x, rec.z) + ty, rec.z, fov, 0); return [cx, cz]; };
const mark2 = (E, x, z, h0, h1) => { const y = surf(x, z); E.marks.push([x, y + h0, z], [x, y + h1, z]); };
const NOWIN = true;

/* ---------------- people ---------------- */
K.add({
  id: "familyskis", fam: "people", chip: "FAMILY", paint: "group", need: { walker: 5 }, close: false, open: true,
  w: c => c.household >= 3 && c.int.ski !== undefined && c.snow && c.el > -46 && c.storm < 0.5 && c.hr >= 9 && c.hr <= 17 && window.TLXSK && TLXSK.ready ? 2.2 + (c.int.ski ? 1.5 : 0) : 0,
  anchor(c, rng) { const t = SP.trail(rng, c.vil, true); if (!t) return null; const fam = TLXN.family(c.p).filter(q => q && q.age > 2).slice(0, 5); if (fam.length < 3) return null; return { x: t.x, z: t.z, a: t.yaw, place: t.name + " trailhead", w: fam.map(q => q.id) }; },
  plan(rec, E) {
    const r = mulb(rec.sd), ps = rec.w.map(who).filter(Boolean).sort((a, b) => b.age - a.age), n = ps.length, fy = rec.a + (r() - 0.5) * 0.8, fx = Math.sin(fy), fz = Math.cos(fy), lx = fz, lz = -fx;
    return { dur: 4, still: 1, need: { walker: 5 }, hour: rec.h, storm: rec.s, vig: 0.18,
      frame(t, E) {
        K.begin(E); const order = []; ps.forEach((p, i) => order.push(i)); const idx = i => (i % 2 ? n - 1 - (i >> 1) : (i >> 1)); const hs = [];
        ps.forEach((p, k) => { const slot = k, off = (slot - (n - 1) / 2) * 0.82, back = p.age < 14 ? 0.5 : -0.1, x = rec.x + lx * off + fx * back, z = rec.z + lz * off + fz * back, w = person(E, k, p, x, z, fy + (off * 0.05), {}); K.grin(w, 0.7); const U = w.U; U.head.rotation.set(0, 0.08 * (slot - 1), 0.04 * (slot - 1));
          if (p.age < 14) { U.arms[1].rotation.set(-2.5 + 0.1 * Math.sin(t * 6 + k), 0, 0.3); U.fore[1].rotation.set(-0.4, 0, 0); } markFig(E, w, true); });
        K.prop(E, "skis", 0, rec.x - fx * 0.2 + lx * (-1.4), rec.z - fz * 0.2 + lz * (-1.4), fy + 1.5, { rz: 0.04 }); K.prop(E, "skis", 1, rec.x - fx * 0.2 + lx * (1.5), rec.z - fz * 0.2 + lz * 1.5, fy + 1.7, {});
        const cx = rec.x + fx * 6.4, cz = rec.z + fz * 6.4; E.look(cx, surf(cx, cz) + 1.2, cz, rec.x, surf(rec.x, rec.z) + 0.85, rec.z, 50, 0); E.needH = 0.26;
      } };
  },
  vars: (c, rec, an) => ({ fam: rec.w.map(q => (who(q) || {}).first).slice(0, 4).join(", ").replace(/, ([^,]*)$/, " and $1"), trail: (an && an.place || rec.place || "") }),
  cap: [["w", "All of us at {trail} before the first kilometre. Skis waxed, spirits high."], ["c", "WHOLE FAMILY ON SKIS!! {fam}!! the timer on my phone and a snowbank as a tripod!!"], ["d", "{fam}. {trail}. The photo is now taken. We may start."], ["t", "{fam} at {trail}."], ["y", "Family photo before the first complaint about the cold. Time: forty seconds."], ["e", "{fam}, together at {trail}. These are the days that stay."], ["w", "Everybody wearing the wrong hat and everybody happy."], ["c", "this is the only moment all of us face the same direction, do NOT scroll past it"], ["y", "Photographic evidence that all of us can stand still at once."], ["d", "{trail} trailhead, {hr}. Kids first, adults complain after."]],
  cm: { pic: ["we look so cool", "I was cold already", "can we get waffles now"], nb: ["Is {trail} set today?", "Say hello if you pass our hut, the red one!", "The kids have grown!"], grump: ["Were you the sled that blocked the trailhead on Saturday?"], reply: ["Set this morning, firm.", "Not us, we walked."] }
});

K.add({
  id: "couplerail", fam: "people", chip: "TOGETHER", paint: "group", need: { walker: 2 }, close: true, open: true,
  w: c => c.coast && c.el > -46 && c.storm < 0.5 && (TLXN.family(c.p).filter(q => q && q.age >= 22).length >= 2) ? 1.8 + (c.int.photos ? 1 : 0) : 0,
  anchor(c, rng) { const co = c.coast; if (!co) return null; const ad = TLXN.family(c.p).filter(q => q && q.age >= 22 && q.age < 85); if (ad.length < 2) return null; const b = co.yaw; for (let k = 0; k < 8; k++) { const r = k ? rng() * 14 : 0, a = rng() * TAU, px = co.x + Math.cos(a) * r, pz = co.z + Math.sin(a) * r; if (openOk(px, pz, 1.4)) return { x: px, z: pz, a: b, place: c.vil.name + " harbour", w: [ad[0].id, ad[1].id] }; } return null; },
  plan(rec, E) {
    const r = mulb(rec.sd), fy = yawOfAz(rec.a + Math.PI), fx = Math.sin(fy), fz = Math.cos(fy), lx = fz, lz = -fx, pa = who(rec.w[0]), pb = who(rec.w[1]);
    return { dur: 4, still: 1, need: { walker: 2 }, hour: rec.h, storm: rec.s, vig: 0.18,
      frame(t, E) {
        K.begin(E); const xa = rec.x - lx * 0.3, za = rec.z - lz * 0.3, xb = rec.x + lx * 0.3, zb = rec.z + lz * 0.3; K.prop(E, "rail", 0, rec.x - fx * 1.0, rec.z - fz * 1.0, fy + Math.PI / 2, { n: 6 });
        const wa = person(E, 0, pa, xa, za, fy, {}), wb = person(E, 1, pb, xb, zb, fy, {}); K.grin(wa, 0.8); K.grin(wb, 0.8); wa.U.head.rotation.set(0, 0, -0.12); wb.U.head.rotation.set(0, 0, 0.12); armTo(wa, 1, 0.42, 0.5, -0.06); armTo(wb, 0, -0.42, 0.46, -0.06); wa.U.torso.rotation.set(0, 0, -0.05); wb.U.torso.rotation.set(0, 0, 0.05);
        const hA = K.headPos(wa, _v()), hB = K.headPos(wb, _v()), cx = rec.x + fx * 2.6, cz = rec.z + fz * 2.6, s = wa.g.scale.x; E.look(cx, surf(cx, cz) + 1.2, cz, rec.x, (hA.y + hB.y) / 2 - 0.22, rec.z, 50, 0);
        for (const w of [wa, wb]) { const h = K.headPos(w, _v()); E.marks.push([h.x, h.y + 0.14 * s, h.z], [h.x, h.y - 0.55 * s, h.z]); E.faces.push({ x: h.x, y: h.y, z: h.z, yaw: fy }); } E.needH = 0.3;
      } };
  },
  vars: (c, rec) => ({ both: rec.w.map(q => (who(q) || {}).first).join(" and ") }),
  cap: [["w", "{both} at the harbour rail, the fjord at our backs. Thirty years and still the same spot."], ["c", "{both} and the SEA and the LIGHT and one of us is crying a bit, guess which"], ["d", "{both}. Harbour rail. Cold."], ["t", "{both}, harbour."], ["y", "We stood very close because of the wind. That is the official story."], ["e", "{both} at the rail {hr}. Grateful for every winter we have had here."], ["w", "A little bench, a little rail, a lot of sea. Our spot."], ["c", "someone asked us to move for the ferry and we did NOT"], ["y", "Romantic evening: free, windy, includes fish smell."], ["d", "{place}. {both}. The sea does not care. We do."]],
  cm: { pic: ["Aw", "He cried a bit too"], nb: ["That rail was put up by the council in ninety-six, and you have used it since.", "Lovely, both of you.", "Is the ferry in? It looks like the ferry light behind you."], grump: ["You are standing where we land the fish."], reply: ["Thanks, neighbour.", "We will move when the boat comes."] }
});

/* ---------------- the sea and the work ---------------- */
const RT = () => window.TLXRL.types;
function viaReel(id, still, markFn) {
  return {
    anchor: (c, rng) => RT()[id].anchor(c, rng),
    plan(rec, E) { const rr = { id: 1, ty: id, sd: rec.sd, x: rec.x, z: rec.z, a: rec.a, k: rec.v || undefined, h: rec.h, s: rec.s, t: rec.h }, Sc = RT()[id].plan(rr, E), fr = Sc.frame; Sc.still = still; Sc.vig = 0.2; Sc.frame = (t, E2) => { K.begin(E2); fr(t, E2); markFn(E2, rec); }; return Sc; }
  };
}
K.add(Object.assign({
  id: "plowwall", wideOk: true, fam: "sea", chip: "PLOW", paint: "road", need: {}, close: false, open: true,
  w: c => 0,            // only ever pinned to the real plow (evPin), never staged on its own
  cap: [["w", "The plow came by {place} and gave me the whole road, and a lot of snow. Thank you, driver!"], ["c", "THE PLOW! A WALL OF SNOW! I was standing there like an idiot with my phone and it came right at me"], ["d", "The plow on {place}. Road open. I am a snowman."], ["t", "Plow on {place}. Open."], ["y", "Nordkinn plowing: you get no say, you get snow."], ["e", "Early out on {place} and the plow was already there. Thank you to everyone who works at night."], ["w", "Waved at the plow driver, got a white wall in return. Fair."], ["c", "Look at that SPRAY. Peak winter!!"], ["y", "Free exfoliation, courtesy of the kommune."], ["d", "Plow, then silence, then snow on my hat."]],
  cm: { pic: [], nb: ["That is Aslak driving, he waves every time.", "Good to see the road open again.", "He did the bend at {place} twice, you could tell.", "Standing too close, be careful."], grump: ["They should plow earlier than ten."], reply: ["Always wave back.", "Was plowed at six, this is the second pass."] }
}, viaReel("plowwall", 3.75, (E, rec) => { const e = E.extra.find(q => q.key === "plowtruck"); if (e) { const p = e.m.position; E.marks.push([p.x, p.y + 0.3, p.z], [p.x, p.y + 3.2, p.z]); E.needH = 0.22; } })));

K.add({
  id: "digout", fam: "sea", chip: "DIGGING", paint: "mound", need: { walker: 1 }, close: false, open: true,
  w: c => c.snow && (c.sinceStorm || c.depth > 0.3) && c.el > -6 ? (c.adult ? 3 : 0.5) : 0,
  anchor(c, rng) { const f = frontOf(c, rng, 7.5, 0); if (!f) return null; f.w = [c.p.id]; return f; },
  plan(rec, E) {
    const p = who(rec.w[0]), nx = Math.sin(rec.a), nz = Math.cos(rec.a), lx = nz, lz = -nx, fy = rec.a, r = mulb(rec.sd);
    return { dur: 4, still: 1, need: { walker: 1 }, hour: rec.h, storm: rec.s, vig: 0.2,
      frame(t, E) {
        K.begin(E); K.prop(E, "carMound", 0, rec.x, rec.z, rec.a + 1.57, {}); const px = rec.x + lx * 2.7 + nx * 1.2, pz = rec.z + lz * 2.7 + nz * 1.2;
        const w = person(E, 0, p, px, pz, fy + 0.3, { warm: true }), U = w.U; K.grin(w, 0.8); U.torso.rotation.set(0.12, 0, 0); armTo(w, 0, -0.16, 0.32, 0.38); armTo(w, 1, 0.18, 0.55, 0.12);
        const sh = K.carry(E, w, "shovel", 0, 0.28, 0.2, [0.9, 0, 0], { s: 1 }); U.head.rotation.set(-0.05, 0.1, 0.06);
        const h = K.headPos(w, _v()), cx = rec.x + nx * 7.0 + lx * 0.8, cz = rec.z + nz * 7.0 + lz * 0.8; E.look(cx, surf(cx, cz) + 1.3, cz, rec.x + lx * 1.0, surf(rec.x, rec.z) + 0.9, rec.z + lz * 1.0, 54, 0);
        markFig(E, w, true); E.marks.push([rec.x, surf(rec.x, rec.z) + 1.4, rec.z]); E.needH = 0.28;
      } };
  },
  cap: [["w", "Somewhere under that is our car. {pic1} has been out with the shovel since breakfast."], ["c", "THE CAR IS GONE. Only the aerial is showing. {pic1} says it is fine. {pic1} is smiling. {pic1} is lying"], ["d", "Car. Snow. Shovel. Order of difficulty."], ["t", "Digging out the car."], ["y", "Winter parking: a lottery where nobody wins and everybody shovels."], ["e", "After the storm, the street out digging. We help each other here."], ["w", "Cold hands, warm coffee waiting. Slowly, slowly the roof appears."], ["c", "six hours later the door finally opens and it makes a sound like a sigh"], ["y", "I have found the wipers. Progress."], ["d", "Roof found. Doors next. Roads later."]],
  cm: { pic: ["I am not smiling, I am wincing", "next time we park in the garage"], nb: ["I have a second shovel, I am coming over.", "Mine is under the same drift, we should swap.", "Did you find the wipers yet?", "Coffee on at ours when you are done."], grump: ["Do not throw it back in the road, please."], reply: ["Thank you, coming over after.", "Not in the road, I promise."] }
});

/* ---------------- weather at the door ---------------- */
K.add({
  id: "doorwall", off: true, fam: "weather", chip: "STORM", paint: "mound", need: {}, close: true, open: true,
  w: c => c.snow && (c.sinceStorm || c.depth > 0.35) && c.el > -46 ? 2.2 : 0,
  anchor(c, rng) { const d = SP.door(rng, c.vil); if (!d) return null; return { x: d.x + d.nx * 0.9, z: d.z + d.nz * 0.9, a: d.yaw, place: c.vil.name, w: [] }; },
  plan(rec, E) {
    const nx = Math.sin(rec.a), nz = Math.cos(rec.a), r = mulb(rec.sd);
    return { dur: 3, still: 1, need: {}, hour: rec.h, storm: Math.min(rec.s, 0.35), vig: 0.2, light: { fill: 0.6, swing: 0.9 },
      frame(t, E) {
        K.begin(E); const wx = rec.x + nx * 1.6, wz = rec.z + nz * 1.6, y = surf(rec.x, rec.z); K.prop(E, "wall", 0, wx, wz, rec.a + 1.57, { y: y + 0.2, s: 1 });
        K.prop(E, "shovel", 0, rec.x + nz * 0.5, rec.z - nx * 0.5, rec.a, { y: y + 0.9, rx: -1.35 });
        E.look(rec.x - nx * 0.6, y + 1.4, rec.z - nz * 0.6, wx, y + 1.3, wz, 72, 0.02); E.marks.push([wx, y + 0.2, wz], [wx, y + 2.1, wz]); E.needH = 0.5;
      } };
  },
  cap: [["w", "Opened the front door this morning and this is what was waiting. Good morning, Nordkinn."], ["c", "I OPENED THE DOOR AND THERE WAS A WALL!! A WHOLE WALL!! I live in a snow globe now"], ["d", "The door opens inwards for a reason."], ["t", "Door. Wall. Shovel."], ["y", "Plan for today: leave the house. Obstacle: the house, apparently."], ["e", "A white wall at the door after the night. We will dig out and check on the neighbours."], ["w", "No light through the window, only snow. I stood and laughed."], ["c", "the dog looked at it and went back to bed and honestly I might too"], ["y", "Snow: one. Door: nil."], ["d", "{place}. Metre and a half at the step. Shovel time."]],
  cm: { pic: [], nb: ["Mine is the same, I went out through the cellar!", "Do you need a hand with the steps?", "The plow will be round at ten, I heard.", "We got a metre at ours too."], grump: ["It is only snow."], reply: ["Cellar door tomorrow, then.", "I will take the hand at noon."] }
});

K.add({
  id: "thisistheroad", fam: "weather", chip: "WHITEOUT", paint: "road", need: {}, close: false, open: true,
  w: c => c.storm >= 0.55 && c.el > -46 && c.snow ? 3 : 0,
  anchor(c, rng) { const rd = SP.road(rng, c.vil); if (!rd) return null; return { x: rd.x, z: rd.z, a: rd.yaw, place: rd.name || (c.vil.name + " road"), w: [], s: Math.max(0.82, c.storm) }; },
  plan(rec, E) {
    const fx = Math.sin(rec.a), fz = Math.cos(rec.a), r = mulb(rec.sd);
    return { dur: 4, still: 1, need: {}, hour: rec.h, storm: Math.max(rec.s, 0.82), fog: 0.045, vig: 0.4, light: { fill: 0.4, hemi: 0.5, exp: 0.3 }, flat: true,
      frame(t, E) {
        // something to read in the white: a marker pole close by, a half-buried road sign at its foot, and (some of the time) the faint tail lamps of a car ahead
        K.begin(E); const lx = fz, lz = -fx, px = rec.x + fx * 5.5 + lx * 0.6, pz = rec.z + fz * 5.5 + lz * 0.6, sx = px - lx * 1.9 + fx * 1.2, sz = pz - lz * 1.9 + fz * 1.2, tail = r() < 0.6;
        K.prop(E, "pole", 0, px, pz, 0, {}); K.prop(E, "sign", 0, sx, sz, rec.a + 2.7, { dy: -0.75, rz: 0.12 }); K.prop(E, "pole", 1, rec.x + fx * 21 + lx * 3, rec.z + fz * 21 + lz * 3, 0, {});
        K.prop(E, "berm", 0, sx + fx * 0.3, sz + fz * 0.3, rec.a, { s: 0.55, dy: -0.1 }); if (tail) K.prop(E, "tail", 0, rec.x + fx * 17 - lx * 0.3, rec.z + fz * 17 - lz * 0.3, rec.a, {});
        E.look(rec.x, surf(rec.x, rec.z) + 1.5, rec.z, px - lx * 0.5 + fx * 3, surf(px, pz) + 1.3, pz - lz * 0.5 + fz * 3, 58, 0); E.flakes(-6 - 3 * Math.sin(t), -1.2, 2, 0.85, 0.06, [16, 9, 26], 6); E.marks.push([px, surf(px, pz) + 0.1, pz], [px, surf(px, pz) + 2.4, pz]); E.needH = 0.25;
      } };
  },
  vars: (c, rec, an) => ({ road: (an && an.place || rec.place || "") }),
  cap: [["w", "This is {road}. I promise. There is a pole, and the pole is the road."], ["c", "okay so this is {road} and I cannot see ANYTHING except one pole and I am following the pole like it is my best friend"], ["d", "{road}. Visibility: one pole."], ["t", "{road}. Whiteout."], ["y", "Scenic route. The scenery is white. So is the other scenery."], ["e", "Driving {road} in this, slowly, one pole at a time. If you can stay home, stay home."], ["w", "White, soft and enormous. The wind is the only sound."], ["c", "we have been on this road for forty minutes and passed the same pole twice, I think"], ["y", "The pole and I have an understanding."], ["d", "Next pole. Then the next. Home eventually."]],
  cm: { pic: [], nb: ["The poles are every fifty metres here, count them.", "Stay on the right of the poles, there is a ditch on the left!", "Stay home, please.", "Do you want me to come and meet you with the sled?"], grump: ["Why were you out in this?"], reply: ["Counting, counting.", "Almost home, thank you."] }
});

K.add({
  id: "carmound", fam: "funny", chip: "WINTER", paint: "mound", need: {}, close: false, open: true,
  w: c => c.snow && c.el > -46 ? ((c.sinceStorm || c.depth > 0.3) ? 1.3 : 0.5) : 0,
  anchor(c, rng) { const f = frontOf(c, rng, 8, 5); if (!f) return null; f.w = []; return f; },
  plan(rec, E) {
    const r = mulb(rec.sd), nx = Math.sin(rec.a), nz = Math.cos(rec.a);
    return { dur: 3, still: 1, need: {}, hour: rec.h, storm: rec.s, vig: 0.2, light: { fill: 0.5 },
      frame(t, E) { K.begin(E); K.prop(E, "carMound", 0, rec.x, rec.z, rec.a + 1.57 + (r() - 0.5) * 0.4, {}); camFront(E, rec, 5.8, 1.35, 0.7, 52, 1.2); mark2(E, rec.x, rec.z, 0.05, 1.6); E.needH = 0.28; } };
  },
  cap: [["w", "That used to be a car. It is a lovely hill now."], ["c", "WHO CAN TELL ME WHERE MY CAR IS. I can see the aerial. That is the car. That is all of the car"], ["d", "Car. Under there. Somewhere."], ["t", "The car is a mound."], ["y", "Our car has gone into hibernation and I respect that."], ["e", "A whole street of cars like this after the night. Please dig your neighbours out too."], ["w", "A white bump with one aerial, standing proud. That is us."], ["c", "if you need me I will be digging until spring"], ["y", "Not a parking ticket in sight. Nothing in sight."], ["d", "Aerial: visible. Car: theoretical."]],
  cm: { pic: [], nb: ["Is that the blue one? I thought it was the neighbour's compost.", "Mine is the one with the other aerial, three doors down.", "You can borrow my shovel, it is on the porch.", "I laughed out loud, sorry."], grump: ["Do not shovel it into the road."], reply: ["The blue one, yes.", "Not into the road, I promise."] }
});

/* ---------------- cosy ---------------- */
K.add({
  id: "snowlantern", fam: "cosy", chip: "COSY", paint: "house", need: {}, close: true, open: true,
  w: c => c.snow && c.storm < 0.5 && c.el < 0 && c.hr >= 14 ? (c.household > 1 ? 2.4 : 1.6) : 0,
  anchor(c, rng) { const f = frontOf(c, rng, 4.2, 4); if (!f) return null; f.w = []; return f; },
  plan(rec, E) {
    const r = mulb(rec.sd); return { dur: 3, still: 1, need: {}, hour: rec.h, storm: Math.min(rec.s, 0.3), vig: 0.26, light: { fill: 0.25, hemi: 0.1, exp: 0.4, warm: 0.4 },
      frame(t, E) { K.begin(E); K.prop(E, "lantern", 0, rec.x, rec.z, r() * 6, { s: 1.4 }); K.lampPool(E, "lan", rec.x, rec.z, 4.5, 0xffa850, 0.5 + 0.08 * Math.sin(t * 7)); camFront(E, rec, 2.0, 0.55, 0.45, 52, 0.15); mark2(E, rec.x, rec.z, 0.05, 0.75); E.needH = 0.3; } };
  },
  cap: [["w", "Made a snow lantern at the door with a candle in it. The whole step glows."], ["c", "A LANTERN MADE OF SNOW and it glows orange from the inside and I am never going back in"], ["d", "Snow, candle, door. Done."], ["t", "Snow lantern. Candle."], ["y", "Quality of the lantern: considerable. Quality of the fingers: gone."], ["e", "A small light at the door for anyone who walks by in the dark."], ["w", "Candlelight through the ice. That is what the polar night is for."], ["c", "the kids made six and we lit all of them!!"], ["y", "Free lighting, hand-packed, eco-friendly, melts in April."], ["d", "{place}, {hr}. One candle, one lantern, all quiet."]],
  cm: { pic: [], nb: ["We saw it from the road, it looks so warm.", "How long does the candle last in the cold?", "The kids did the same at ours.", "Beautiful, {first}."], grump: ["Mind that the candle is out before bed."], reply: ["About four hours.", "Out before bed, promise."] }
});

K.add({
  id: "snowmanfamily", fam: "cosy", chip: "SNOW FAMILY", paint: "snowman", need: {}, close: false, open: true,
  w: c => c.snow && c.el > -46 && c.storm < 0.4 && c.household >= 2 && c.hr >= 10 && c.hr <= 17 ? ((c.kid || c.kidsList.length) ? 1.3 : 0.5) : 0,
  anchor(c, rng) { const f = frontOf(c, rng, 8, 3); if (!f) return null; const fam = TLXN.family(c.p).filter(q => q).slice(0, 6); f.w = fam.map(q => q.id); return f; },
  plan(rec, E) {
    const r = mulb(rec.sd), ps = rec.w.map(who).filter(Boolean).sort((a, b) => b.age - a.age), nx = Math.sin(rec.a), nz = Math.cos(rec.a), lx = nz, lz = -nx, n = ps.length;
    return { dur: 3, still: 1, need: {}, hour: rec.h, storm: rec.s, vig: 0.2,
      frame(t, E) {
        K.begin(E); let tall = 0; ps.forEach((p, i) => { const off = (i - (n - 1) / 2) * 1.05, s = clamp(0.38 + p.age / 48, 0.42, 1.2), x = rec.x + lx * off, z = rec.z + lz * off, L = K.lookOf(p); tall = Math.max(tall, s); K.prop(E, "snowman", i, x, z, rec.a + (r() - 0.5) * 0.3, { s, hat: p.age > 12 ? L.bn : 0, scarf: L.tr, key: "h" + L.bn + L.tr + (p.age > 12 ? "a" : "k") }); mark2(E, x, z, 0.05, 1.3 * s); });
        camFront(E, rec, 6.2, 1.3, 0.6, 50, 0); E.needH = 0.24;
      } };
  },
  vars: (c, rec) => ({ fam: rec.w.map(q => (who(q) || {}).first).join(", ").replace(/, ([^,]*)$/, " and $1"), n: rec.w.length, nn: rec.w.length === 2 ? "two" : rec.w.length === 3 ? "three" : rec.w.length === 4 ? "four" : "five" }),
  cap: [["w", "The whole family, in snow: {nn} of them, tallest to smallest. Even the hats match."], ["c", "WE MADE THE FAMILY!! {fam}!! and {fam} are all the right height and the little one has the biggest scarf!!"], ["d", "{fam}, rebuilt in snow. The carrots were the hard part."], ["t", "Snow family. {n} figures."], ["y", "The snow version of us is quieter, more patient and smiles more."], ["e", "{fam} out in the yard {hr}, building each other in snow. Slow afternoon, good afternoon."], ["w", "Every one with a name, and every one a little too wonky."], ["c", "we ran out of carrots at number three so the small one has a pine cone"], ["y", "{fam}: now made of something that does not argue."], ["d", "Standing in a row outside the house. Passers-by wave."]],
  cm: { pic: ["I am the tall one", "mine has the best hat", "who made mine so short"], nb: ["The little one on the end looks just like {pic1}!", "We all waved at them on the way past.", "Brilliant, they will last until the thaw.", "Saw them from the school bus."], grump: ["Do not put a hat on them, it blows into the road."], reply: ["Hats are glued on, promise.", "Waving back from the window."] }
});

K.add({
  id: "kicksled", fam: "cosy", chip: "SPARK", paint: "house", need: {}, close: false, open: true,
  w: c => c.snow && c.storm < 0.5 && c.el > -46 && c.hr >= 9 && c.hr <= 18 ? 1.6 + (c.p.age > 55 ? 1.2 : 0) : 0,
  anchor(c, rng) { const f = frontOf(c, rng, 3.4, 5); if (!f) return null; f.w = []; return f; },
  plan(rec, E) {
    const r = mulb(rec.sd); return { dur: 3, still: 1, need: {}, hour: rec.h, storm: rec.s, vig: 0.2, light: { fill: 0.45 },
      frame(t, E) { K.begin(E); K.prop(E, "kicksled", 0, rec.x, rec.z, rec.a + 0.6 + (r() - 0.5) * 0.5, { rx: -0.05, s: 1.25 }); K.prop(E, "drift", 0, rec.x - Math.sin(rec.a) * 0.2, rec.z - Math.cos(rec.a) * 0.2 + 0.2, 0, { s: 0.6 }); camFront(E, rec, 2.7, 0.85, 0.55, 50, 0.9); mark2(E, rec.x, rec.z, 0.02, 1.25); E.needH = 0.26; } };
  },
  cap: [["w", "The kicksled outside the shop. It has carried half this village's shopping, and the other half's grandchildren."], ["c", "the spark!! the kicksled!! outside the shop where it always is and I will not hear a word against it"], ["d", "Kicksled. Shop. Waiting."], ["t", "Kicksled at the shop."], ["y", "The Nordkinn's most reliable vehicle, parked illegally."], ["e", "Outside the shop {hr}. Everyone borrows it, nobody forgets to bring it back."], ["w", "A good old kicksled and a fresh drift at the door."], ["c", "{first}'s granddad built this one in 1974 and it STILL goes"], ["y", "No fuel, no insurance, no complaints."], ["d", "Left at the door. Will be there tomorrow. And the day after."]],
  cm: { pic: [], nb: ["I borrowed it Thursday, sorry, it is back now.", "Whose is it? I want to buy one!", "The runners are new, aren't they?", "Mine is the exact same one, in blue."], grump: ["It is in front of the door, you know."], reply: ["Thursday, no problem.", "Moving it now!"] }
});

K.add({
  id: "skisoutside", fam: "cosy", chip: "COSY", paint: "house", need: {}, close: false, open: true,
  w: c => c.snow && c.storm < 0.55 && (c.el < 2 ? 2.4 : 1.2) && c.int.ski !== undefined ? 1.4 + (c.int.ski ? 1.8 : 0) : 0,
  anchor(c, rng) { const f = frontOf(c, rng, 3.0, 4); if (!f) return null; f.w = []; return f; },
  plan(rec, E) {
    const r = mulb(rec.sd); return { dur: 3, still: 1, need: {}, hour: rec.h, storm: Math.min(rec.s, 0.35), vig: 0.24, light: { fill: 0.3, warm: 0.3 },
      frame(t, E) { K.begin(E); K.prop(E, "skis", 0, rec.x, rec.z, rec.a + 1.57, { rz: 0.04, s: 1.3 }); K.prop(E, "skis", 1, rec.x + 0.5, rec.z + 0.2, rec.a + 1.4, { rz: -0.05, s: 1.3 }); camFront(E, rec, 3.3, 1.05, 0.95, 50, 0.4); mark2(E, rec.x, rec.z, 0.05, 1.9); E.needH = 0.26; } };
  },
  cap: [["w", "Skis in the drift outside the cabin, and the window glowing behind. Home."], ["c", "THE LIGHT IN THE WINDOW and the skis in the snow and soup on the stove, this is peak winter!!"], ["d", "Skis outside. Stove inside."], ["t", "Skis. Cabin. Home."], ["y", "Evidence that I have gone out and come back, in that order."], ["e", "Back from {place}, skis parked, the stove already warm. A good day."], ["w", "Frost on the skis and a yellow window. That says it all."], ["c", "we skied until the light went and now everyone is in front of the fire"], ["y", "The skis are tired. So am I. The window is the only awake one."], ["d", "Out. In. Done."]],
  cm: { pic: [], nb: ["The window looks so warm from the road.", "Which wax did you use? They look fast.", "Soup at yours?", "I had the same view from the trail."], grump: ["Wipe the skis, the porch is wet."], reply: ["Blue wax, from the shop.", "Soup at seven."] }
});

K.add({
  id: "bonfire", fam: "cosy", chip: "FIRE", paint: "fire", need: { walker: 4 }, close: false, open: true,
  w: c => c.snow && c.storm < 0.45 && c.el > -46 && c.household >= 2 && c.hr >= 13 ? 2 + (c.el < 0 ? 1 : 0) + (c.kid || c.kidsList.length ? 1 : 0) : 0,
  anchor(c, rng) { const fam = TLXN.family(c.p).filter(q => q && q.age > 3).slice(0, 4); if (fam.length < 2) return null; const sp = SP.ring(rng, c.vil.x, c.vil.z, 30, 200, 5); if (!sp) return null; return { x: sp[0], z: sp[1], a: rng() * TAU, place: "behind " + c.vil.name, w: fam.map(q => q.id) }; },
  plan(rec, E) {
    const r = mulb(rec.sd), ps = rec.w.map(who).filter(Boolean), n = ps.length, ua = rec.a, ux = Math.sin(ua), uz = Math.cos(ua), lx = uz, lz = -ux;
    return { dur: 5, still: 1, need: { walker: 4 }, hour: rec.h, storm: rec.s, vig: 0.24, light: { fill: 0.3, hemi: 0, exp: 0.15, warm: 0.7, swing: 0.7 },
      frame(t, E) {
        K.begin(E); K.prop(E, "fire", 0, rec.x, rec.z, t * 0.1, {}); K.lampPool(E, "fire", rec.x, rec.z, 10, 0xff8a2a, 0.55 + 0.1 * Math.sin(t * 9));
        ps.forEach((p, i) => { const off = (i - (n - 1) / 2) * 1.2, x = rec.x + ux * 1.8 + lx * off, z = rec.z + uz * 1.8 + lz * off, w = person(E, i, p, x, z, ua + Math.PI + off * 0.12, { warm: true }), U = w.U; K.grin(w, 0.7);
          if (i % 2 === 0) K.sit(w, surf(x, z) + 0.36, {}); armTo(w, 0, -0.1, 0.38, 0.3); armTo(w, 1, 0.1, 0.4, 0.28); K.carry(E, w, "stick", 0, 0.36, 0.3, [-0.2 - i * 0.04, 0, 0], { key: "s" + i }); K.carry; markFig(E, w, true); });
        const cx = rec.x - ux * 4.4, cz = rec.z - uz * 4.4; E.look(cx, surf(cx, cz) + 1.2, cz, rec.x + ux * 1.4, surf(rec.x, rec.z) + 0.9, rec.z + uz * 1.4, 54, 0); E.needH = 0.2;
      } };
  },
  vars: (c, rec) => ({ fam: rec.w.map(q => (who(q) || {}).first).join(", ").replace(/, ([^,]*)$/, " and $1") }),
  cap: [["w", "Bonfire and sausages on sticks. {fam} around the fire, everybody's cheeks glowing."], ["c", "SAUSAGES ON STICKS!! {fam}!! the fire is so big and I smell like smoke and I am so happy!!"], ["d", "Fire. Sausages. Family. That is the whole plan."], ["t", "Bonfire. {fam}."], ["y", "The sausages are black on the outside and raw on the inside. A family tradition."], ["e", "{fam} by the fire {hr}. We stayed until the last coal."], ["w", "Warm faces, cold backs, and a long evening ahead."], ["c", "the dog got a sausage, the sausage got a dog, nobody got a plate"], ["y", "Cooking over open fire: the only time anybody here is patient."], ["d", "Sticks cut from the birch. Sausages from the shop. Fire from sheer will."]],
  cm: { pic: ["mine is the burnt one", "can I have another", "the best one tonight"], nb: ["We could smell it from the road!", "Is there room for two more with mustard?", "Fire wood from the dry stack, I hope?", "Save a sausage for the dog next door."], grump: ["Is the fire permit in order?"], reply: ["Come over, plenty of sausage.", "Yes, from the dry stack."] }
});

K.add({
  id: "waffletable", fam: "cosy", chip: "SKIDAG", paint: "group", need: { walker: 2 }, close: false, open: true,
  w: c => c.snow && c.storm < 0.5 && c.hr >= 10 && c.hr <= 16 && c.household > 1 && window.TLXSK && TLXSK.ready ? ((c.dow === 0 || c.dow === 6) ? 3.2 : 0.7) : 0,
  anchor(c, rng) { const t = SP.trail(rng, c.vil, true); if (!t) return null; const ad = TLXN.peopleIn(c.vil.id).filter(q => q.age > 14 && q.age < 80); if (ad.length < 2) return null; const a = ad[Math.floor(rng() * ad.length)], b = ad[Math.floor(rng() * ad.length)]; return { x: t.x, z: t.z, a: t.yaw + Math.PI * 0.5, place: t.name + " skidag", w: [a.id, b.id === a.id ? c.p.id : b.id] }; },
  plan(rec, E) {
    const r = mulb(rec.sd), fy = rec.a, fx = Math.sin(fy), fz = Math.cos(fy), lx = fz, lz = -fx, pa = who(rec.w[0]), pb = who(rec.w[1]);
    return { dur: 4, still: 1, need: { walker: 2 }, hour: rec.h, storm: rec.s, vig: 0.2,
      frame(t, E) {
        K.begin(E); K.prop(E, "table", 0, rec.x, rec.z, fy + Math.PI / 2, {}); const wa = person(E, 0, pa, rec.x - lx * 0.5 - fx * 0.9, rec.z - lz * 0.5 - fz * 0.9, fy, {}), wb = person(E, 1, pb, rec.x + lx * 0.6 - fx * 0.9, rec.z + lz * 0.6 - fz * 0.9, fy, {});
        K.grin(wa, 0.9); K.grin(wb, 0.8); armTo(wa, 0, -0.14, 0.4, 0.34); armTo(wa, 1, 0.16, 0.36, 0.3); wa.U.arms[1].rotation.set(-1.1, 0, 0.2); armTo(wb, 1, 0.3, 0.7, 0.2); wb.U.arms[1].rotation.set(-2.5, 0, 0.3); wb.U.fore[1].rotation.set(-0.4, 0, 0);
        markFig(E, wa, true); markFig(E, wb, true); const cx = rec.x + fx * 4.4, cz = rec.z + fz * 4.4; E.look(cx, surf(cx, cz) + 1.2, cz, rec.x - fx * 0.6, surf(rec.x, rec.z) + 0.95, rec.z - fz * 0.6, 52, 0); E.needH = 0.28;
      } };
  },
  vars: (c, rec, an) => ({ pair: rec.w.map(q => (who(q) || {}).first).join(" and "), trail: (an && an.place || rec.place || "") }),
  cap: [["w", "Waffles at the trailhead, {pair} serving with a smile. Jam, cream, brown cheese."], ["c", "WAFFLES AT THE SKIDAG!! {pair} have been at the iron since nine and the queue is out to the trail!!"], ["d", "{pair}. Waffles. Skidag. Queue is real."], ["t", "Skidag waffles. {pair}."], ["y", "{pair} are the real reason anyone comes to the skidag. The skiing is a pretext."], ["e", "{pair} keep the iron hot for everyone. Thank you for making the day."], ["w", "Steam and sugar and cold hands round a warm plate."], ["c", "twelve waffles and one thermos of coffee and a very large number of children"], ["y", "Ski a lap, eat a waffle. Ski another lap, eat another waffle. It is training."], ["d", "{trail}, {hr}. Waffles."]],
  cm: { pic: ["there is more batter", "the next one is for you"], nb: ["Save me one with jam!", "Is there coffee as well?", "I will come after my lap.", "Best day of the month."], grump: ["Last time they ran out by two."], reply: ["There is a second iron today.", "Plenty, promise."] }
});

K.add({
  id: "woodpile", fam: "cosy", chip: "WOOD", paint: "house", need: {}, close: false, open: true,
  w: c => c.snow && c.storm < 0.5 && c.el > -46 ? (c.p.age > 40 ? 1.8 : 0.7) : 0,
  anchor(c, rng) { const f = frontOf(c, rng, 5.2, 5); if (!f) return null; f.w = []; return f; },
  plan(rec, E) {
    const r = mulb(rec.sd); return { dur: 3, still: 1, need: {}, hour: rec.h, storm: rec.s, vig: 0.2, light: { fill: 0.4 },
      frame(t, E) { K.begin(E); K.prop(E, "woodpile", 0, rec.x, rec.z, rec.a + 1.57, {}); camFront(E, rec, 3.2, 1.2, 0.6, 52, 0.8); mark2(E, rec.x, rec.z, 0.02, 0.85); E.needH = 0.2; } };
  },
  cap: [["w", "Next winter's wood, stacked, squared and covered. I am prouder of this than of most things."], ["c", "LOOK AT THE STACK!! every log the same way round, three weeks of work, do NOT touch it!!"], ["d", "Wood. Stacked. Enough."], ["t", "Woodpile done."], ["y", "My other hobby is arguing about woodpiles. This one wins."], ["e", "A full woodpile is the best feeling in the north. We will be warm."], ["w", "Birch from the valley, dry by March. Smells wonderful."], ["c", "{first} said it leans a bit and I said that is called character"], ["y", "Measured twice, stacked once, photographed immediately."], ["d", "Split, stacked, done. Now let it snow."]],
  cm: { pic: [], nb: ["That leans a little on the left!", "Is that birch or pine?", "Mine is not even half of that.", "That is a proper stack."], grump: ["It is closer to my fence than you said."], reply: ["Character, not lean.", "Birch, from the valley."] }
});

/* ---------------- funny ---------------- */
K.add({
  id: "sledburied", fam: "funny", chip: "OOPS", paint: "sled", need: { sled: 1, walker: 1 }, close: false, open: true,
  w: c => c.snow && (c.int.sled || c.int.racing) && c.el > -46 && (c.depth > 0.2 || c.sinceStorm || c.storm > 0.3) ? 2.4 : c.depth > 0.1 ? 1 : 0,
  anchor(c, rng) { let sp = null; for (let k = 0; k < 14 && !sp; k++) { const q = SP.ring(rng, c.vil.x, c.vil.z, 90, 900, 4); if (q && Math.abs(surf(q[0] + 4, q[1]) - surf(q[0] - 4, q[1])) < 0.5 && Math.abs(surf(q[0], q[1] + 4) - surf(q[0], q[1] - 4)) < 0.5) sp = q; } if (!sp) return null; return { x: sp[0], z: sp[1], a: rng() * TAU, place: c.vil.name + " backcountry", w: [c.p.id] }; },
  plan(rec, E) {
    const r = mulb(rec.sd), night = NIGHTK(rec.h), yaw = rec.a, p = who(rec.w[0]) || { id: "x", first: "?", age: 30 }, fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw), shrug = r() < 0.6, side = r() < 0.5 ? 1 : -1;
    return { dur: 4, still: 1.4, need: { sled: 1, walker: 1 }, hour: rec.h, storm: rec.s, vig: 0.2, light: { fill: 0.55 },
      frame(t, E) {
        K.begin(E); const a = E.sleds[0], y = surf(rec.x, rec.z); E.placeSled(a, rec.x, rec.z, yaw, 0, 0, false, { noRider: true }); a.g.position.y -= 0.3; a.g.rotation.x += 0.07; a.g.rotation.z += 0.03 * side; E.sledLights(a, true, true, night); a.blob.visible = false;
        // snow thrown round the track: berms to the sides and behind (low, so the seat, windshield and bars stand clear), and a puff hanging where the track dug in
        K.prop(E, "berm", 0, rec.x + lx * 1.0, rec.z + lz * 1.0, yaw + 0.3, { s: 0.8, dy: -0.06 }); K.prop(E, "berm", 1, rec.x - lx * 1.0, rec.z - lz * 1.0, yaw - 0.4, { s: 0.75, dy: -0.06 }); K.prop(E, "berm", 2, rec.x - fx * 1.7, rec.z - fz * 1.7, yaw, { s: 1.0, dy: -0.06 }); K.prop(E, "berm", 3, rec.x + fx * 1.55, rec.z + fz * 1.55, yaw + 1, { s: 0.7, dy: -0.06 });
        E.emitter({ n: 120, life: 1.8, size0: 0.25, size1: 0.8, a: 0.5, g: 5, drag: 2.2, spread: 0.9, fn(te, o) { o.on = 1; const q = (te * 3.1) % 6.28; o.x = rec.x - fx * 1.3 + Math.cos(q) * 0.45; o.z = rec.z - fz * 1.3 + Math.sin(q) * 0.45; o.y = y + 0.1; o.vx = -fx * 1.5 + Math.cos(q) * 1.2; o.vz = -fz * 1.5 + Math.sin(q) * 1.2; o.vy = 3.4; } });
        // the rider stands beside it facing the lens: a shrug (arms out, palms up) or a thumbs-up arm, a rueful grin
        const cx = rec.x + lx * 4.2 * side + fx * 0.9, cz = rec.z + lz * 4.2 * side + fz * 0.9, px = rec.x - lx * 0.2 * side + fx * 2.1, pz = rec.z - lz * 0.2 * side + fz * 2.1, fy = Math.atan2(cx - px, cz - pz);
        const w = person(E, 0, p, px, pz, fy, { smile: 1.0 }), U = w.U; U.head.rotation.set(0.02, 0, 0.12 * side); U.torso.rotation.set(-0.02, 0, 0.04 * side);
        if (shrug) { for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1; U.arms[i].rotation.set(-0.15, 0, sd * 0.95); U.fore[i].rotation.set(-1.05, sd * 0.2, 0); } U.head.rotation.z = 0.2 * side; w.g.position.y += 0.01 * Math.sin(t * 6); }
        else { U.arms[1].rotation.set(-2.5 + 0.12 * Math.sin(t * 4), 0, 0.25); U.fore[1].rotation.set(-0.35, 0, 0); armTo(w, 0, -0.2, 0.38, 0.25); }
        markFig(E, w, true); const hd = K.headPos(w, _v()); E.look(cx, surf(cx, cz) + 1.2, cz, rec.x + fx * 1.0, y + 0.8, rec.z + fz * 1.0, 62, 0); E.marks.push([rec.x, y - 0.05, rec.z], [rec.x, y + 1.15, rec.z], [hd.x, hd.y + 0.15, hd.z]); E.needH = 0.3;
      } };
  },
  cap: [["w", "The sled is parked. Properly parked. Up to the handlebars. It is fine."], ["c", "OKAY SO IT IS FINE. IT IS COMPLETELY FINE. the sled is just resting. in the snow. up to the bars."], ["d", "Stuck. Dug in. Not asking for help."], ["t", "Sled buried. It is fine."], ["y", "It is not stuck, it is making a point about snow depth."], ["e", "A sled in a drift near {place}. I went for help and I am laughing as I type."], ["w", "A soft landing, a little further than planned. Thermos time."], ["c", "{pic1} says if we just rock it a bit. we have been rocking it for an hour"], ["y", "Technically it is now a permanent installation."], ["d", "The snow won. Rope needed."]],
  cm: { pic: [], nb: ["Do you need a rope? I have one in the car.", "Spent half of January in that same drift.", "Stay with the sled, I am coming with the tractor.", "Do not stand under the cornice while you dig."], grump: ["That is the third this week at that spot."], reply: ["Rope please, yes!", "Staying with it, thank you."] }
});

K.add({
  id: "gloveonpost", fam: "funny", chip: "WHOSE?", paint: "house", need: {}, close: true, open: true,
  w: c => c.snow && c.storm < 0.55 && c.el > -46 ? 1.4 : 0,
  anchor(c, rng) { const f = frontOf(c, rng, 6.5, 12); if (!f) return null; f.w = []; return f; },
  plan(rec, E) {
    const r = mulb(rec.sd); return { dur: 3, still: 1, need: {}, hour: rec.h, storm: rec.s, vig: 0.22, light: { fill: 0.5 },
      frame(t, E) { K.begin(E); const y = surf(rec.x, rec.z); K.prop(E, "post", 0, rec.x, rec.z, 0, { h: 1.2 }); K.prop(E, "glove", 0, rec.x, rec.z, rec.a + 0.4, { y: y + 1.26 }); camFront(E, rec, 2.6, 1.25, 1.1, 48, 0.3); E.marks.push([rec.x, y + 1.2, rec.z], [rec.x, y + 1.55, rec.z], [rec.x, y + 0.05, rec.z]); E.needH = 0.3; } };
  },
  cap: [["w", "Somebody's red glove, put up on the fence post where everybody can see it. Whose?"], ["c", "WHOSE GLOVE IS THIS?? It has been on the post since Tuesday and nobody has come for it!!"], ["d", "Glove. Post. Claim it."], ["t", "Glove on the post. Whose?"], ["y", "The gloves of this village are in a stable relationship with the posts."], ["e", "Found by the shop and put up where the owner will look. Please claim it."], ["w", "It waves in the wind like a little hello."], ["c", "I tried it on, it is too big, so it is a man's, so I have narrowed it down to half the village"], ["y", "Lost: one glove. Found: a small monument to carelessness."], ["d", "It is the left hand. The right one is somewhere."]],
  cm: { pic: [], nb: ["That one is {first}'s, I recognise the stitching.", "I think the owner is a tall man who walks to the harbour.", "I lost one the same colour on Monday!", "Thank you for hanging it up."], grump: ["Do not leave it on my fence, please."], reply: ["Taking it to the shop board.", "Will move it to the shop."] }
});

/* ---------------- about you ---------------- */
K.add({
  id: "crashseen", fam: "you", chip: "WRECK", paint: "sled", need: { sled: 1, walker: 1 }, close: false, open: true, wide: false,
  w: c => 0,
  anchor(c, rng) { return null; },
  plan(rec, E) {
    const r = mulb(rec.sd), night = NIGHTK(rec.h), yaw = rec.a, bog = rec.v === 1, you = { id: "you", first: "Courier", age: 30 };
    return { dur: 4, still: 1, need: { sled: 1, walker: 1 }, hour: rec.h, storm: rec.s, vig: 0.22, light: { fill: 0.55 },
      frame(t, E) {
        K.begin(E); const a = E.sleds[0]; E.placeSled(a, rec.x, rec.z, yaw, 0, 0, false, { noRider: true }); if (bog) { a.g.position.y -= 0.5; a.g.rotation.x += 0.2; } else { a.g.rotation.z = 1.25; a.g.position.y += 0.25; a.g.rotation.y += 0.4; } E.sledLights(a, true, true, night); a.blob.visible = false;
        const px = rec.x + Math.sin(yaw + 1.2) * 2.8, pz = rec.z + Math.cos(yaw + 1.2) * 2.8, cx = rec.x + Math.sin(yaw + 2.4) * 6.2, cz = rec.z + Math.cos(yaw + 2.4) * 6.2, fy = Math.atan2(cx - px, cz - pz);
        const w = person(E, 0, you, px, pz, fy, { jk: 0xe8a020 }), U = w.U; K.grin(w, bog ? 0.9 : 0.2); U.arms[0].rotation.set(-0.4, 0, -0.9); U.arms[1].rotation.set(-0.4, 0, 0.9); U.fore[0].rotation.set(-0.6, 0, 0); U.fore[1].rotation.set(-0.6, 0, 0); U.head.rotation.set(0.1, 0, 0.1);
        E.look(cx, surf(cx, cz) + 1.35, cz, (px + rec.x) / 2, surf(px, pz) + 0.8, (pz + rec.z) / 2, 56, 0); markFig(E, w, true); E.marks.push([rec.x, surf(rec.x, rec.z) + 0.8, rec.z]); E.needH = 0.25;
      } };
  },
  vars: (c, rec) => ({ you: "@courier" }),
  cap: [["w", "{you} came off at {place} and walked away. The sled is resting."], ["c", "did you SEE {you} go over at {place}?? I was watching from the road!!"], ["d", "{you}, {place}. The sled is on its side. {you} is fine."], ["t", "{you} down at {place}. Fine."], ["y", "{you} has found a new way down {place}. It involves less sled."], ["e", "Glad {you} is all right after the fall at {place}. Rest, drink something warm."], ["w", "Everyone fine, sled in the snow, spirits intact."], ["c", "{you} just stood up and waved so I think we are good!"], ["y", "Style: five. Landing: two. Spirit: ten."], ["d", "{place}. {you}. Standing. Good."]],
  cm: { pic: [], nb: ["I have a rope if you need it!", "Is {you} hurt? The sled looks fine.", "That is the soft spot below the bend, it gets everyone.", "Standing up is a good sign."], grump: ["They should slow down there."], reply: [] }
});

K.add({
  id: "groomed", fam: "you", chip: "TRAIL", paint: "ski", need: {}, close: false, open: true,
  w: c => c.int.ski && c.snow && c.el > -46 && c.storm < 0.4 && window.TLXSK && TLXSK.ready ? 1.1 : 0,
  anchor(c, rng) { const t = SP.trail(rng, c.vil, false); if (!t) return null; return { x: t.x, z: t.z, a: t.yaw, place: t.name, w: [] }; },
  plan(rec, E) {
    const fx = Math.sin(rec.a), fz = Math.cos(rec.a), lx = Math.cos(rec.a), lz = -Math.sin(rec.a), r = mulb(rec.sd), side = r() < 0.5 ? 1 : -1; return { dur: 3, still: 1, need: {}, hour: rec.h, storm: rec.s, vig: 0.2, light: { fill: 0.55 },
      frame(t, E) {
        K.begin(E); K.corduroy(E, rec.x, rec.z, rec.a, 46, 3.4, 9);
        // the marker poles in a line down one edge, every 7 m, getting smaller; a trailhead board at the near edge
        for (let i = 0; i < 6; i++) { const s = 4 + i * 7, px = rec.x + fx * s + lx * 2.0 * side, pz = rec.z + fz * s + lz * 2.0 * side; K.prop(E, "pole", i, px, pz, 0, {}); }
        const bxp = rec.x + fx * 5.0 - lx * 2.4 * side, bzp = rec.z + fz * 5.0 - lz * 2.4 * side; K.prop(E, "board", 0, bxp, bzp, Math.atan2(lx * side, lz * side) * 0 + rec.a + (side > 0 ? 0.9 : -0.9) + Math.PI, { s: 1.0 });
        const cx = rec.x - fx * 2.6 - lx * 0.3 * side, cz = rec.z - fz * 2.6 - lz * 0.3 * side; E.look(cx, surf(cx, cz) + 1.15, cz, rec.x + fx * 12, surf(rec.x + fx * 12, rec.z + fz * 12) + 0.7, rec.z + fz * 12, 62, 0);
        const py = rec.x + fx * 25, pz2 = rec.z + fz * 25; mark2(E, rec.x + fx * 4 + lx * 2.0 * side, rec.z + fz * 4 + lz * 2.0 * side, 0.02, 2.4); mark2(E, rec.x + fx * 25 + lx * 2.0 * side, rec.z + fz * 25 + lz * 2.0 * side, 0.02, 2.4); E.needH = 0.2;
      } };
  },
  vars: (c, rec, an) => ({ trail: (an && an.place || rec.place || ""), you: "@courier" }),
  cap: [["w", "First light on {trail} and the corduroy is perfect. Someone set it in the night."], ["c", "{trail} IS PERFECT!! the lines are so straight!! thank you whoever did this!!"], ["d", "{trail}, set. Skis on, then."], ["t", "{trail}. Fresh track."], ["y", "{trail} looks like a cut lawn. In snow. I approve."], ["e", "Someone has set {trail} before the sun. Thank you, whoever you are."], ["w", "Long blue shadows, straight lines and nobody ahead of me."], ["c", "I am the first one on it and I feel like a king"], ["y", "Corduroy: the only fabric I would wear to the fell."], ["d", "{trail}, {hr}. Set. Go."]],
  cm: { pic: [], nb: ["{you} did it, I saw the groomer at five.", "Was it that firm yesterday? It is a joy.", "Thank you to whoever did it!", "Going this afternoon."], grump: ["Hold your dog back from the track, please."], reply: ["Thank you!", "Dog is on a lead."] }
});
})();
