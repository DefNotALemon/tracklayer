// Tracklayer: Gram's moments, part D: the rest of the catalogue (H2R-c): the whole village in the road for the sun's return, stockfish racks under the aurora, a moon halo, Christmas lights on a house,
// spot the ptarmigan, the snapped ski pole, the convoy's tail lamps going over the fell.
(() => {
"use strict";
const K = window.TLXGK; if (!K) return;
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, mulb = K.mulb;
const GH = () => window.TLXGR.H, A = () => GH().A, W = () => GH().A.world, T = () => GH().A.THREE, SP = K.spot, surf = (x, z) => W().surf(x, z);
const who = id => GH().who(id), person = K.person, markFig = K.markFig;
const _v = () => new (T().Vector3)();
const PB = K.PB, mat = (c, r, m) => A().mesh.std(c, r === undefined ? 0.8 : r, m || 0);
const noon = h => A().sunEl(12);                                                                          // today's highest sun, to know the week the sun comes back
const sunWeek = c => { const e = A().sunEl(12); return e > -0.6 && e < 3.2; };

/* ---- props ---- */
const ELL = (g, m, rx, ry, rz, x, y, z, rot) => { const t = T(), o = new t.Mesh(new t.SphereGeometry(1, 12, 9), m); o.scale.set(rx, ry, rz); o.position.set(x, y, z); if (rot) o.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0); g.add(o); return o; };
const CYL = (g, m, rt, rb, h, x, y, z, rot, seg) => { const t = T(), o = new t.Mesh(new t.CylinderGeometry(rt, rb, h, seg || 7), m); o.position.set(x, y, z); if (rot) o.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0); g.add(o); return o; };
const BOX = (g, m, w, h, d, x, y, z, rot) => { const t = T(), o = new t.Mesh(new t.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (rot) o.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0); g.add(o); return o; };
// a ptarmigan in its white winter coat: round body, short neck, small head with a red comb over the eye, black beak and tail edge, feathered feet
PB.ptarmigan = () => { const g = new (T().Group)(), wh = mat(0xf4f6f8, 0.95), sh = mat(0xdfe6ee, 0.95), bk = mat(0x15181c, 0.6), rd = mat(0xc83a2a, 0.7);
  ELL(g, wh, 0.13, 0.12, 0.2, 0, 0.15, 0); ELL(g, sh, 0.115, 0.07, 0.17, 0, 0.1, -0.02); ELL(g, wh, 0.085, 0.09, 0.09, 0, 0.27, 0.14); ELL(g, wh, 0.062, 0.058, 0.07, 0, 0.33, 0.19);
  BOX(g, bk, 0.2, 0.015, 0.05, 0, 0.14, -0.22, [0.2, 0, 0]); ELL(g, bk, 0.012, 0.01, 0.028, 0, 0.32, 0.26); for (const s of [-1, 1]) { ELL(g, bk, 0.01, 0.01, 0.01, s * 0.045, 0.345, 0.21); ELL(g, rd, 0.016, 0.006, 0.02, s * 0.04, 0.368, 0.2); ELL(g, sh, 0.03, 0.02, 0.07, s * 0.05, 0.04, 0.02); } return g; };
PB.twigs = (o) => { const g = new (T().Group)(), m = mat(0x3a2e24, 0.9); const n = 9; for (let i = 0; i < n; i++) { const a = i / n * TAU, l = 0.35 + (i % 3) * 0.12; CYL(g, m, 0.004, 0.007, l, Math.cos(a) * 0.12, l / 2 - 0.02, Math.sin(a) * 0.12, [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], 4); } return g; };
// a stockfish rack: an A-frame of poles with long rails, cod hung in pairs by the tail
PB.hjell = (o) => { const g = new (T().Group)(), wd = mat(0x6a4a2c, 0.9), fi = mat(0xe8dcc0, 0.85), dk = mat(0xb89a68, 0.9); const L = 5.6;
  for (let i = 0; i < 4; i++) { const x = -L / 2 + L * i / 3; for (const s of [-1, 1]) CYL(g, wd, 0.045, 0.05, 2.7, x, 1.3, s * 0.35, [s * 0.14, 0, 0], 6); }
  for (const y of [1.15, 1.9, 2.5]) for (const s of [-1, 1]) CYL(g, wd, 0.03, 0.03, L + 0.4, 0, y, s * (0.35 - (y - 0.4) * 0.065), [0, 0, Math.PI / 2], 5);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 17; i++) { const x = -L / 2 + 0.15 + (L - 0.3) * i / 16, y = [1.15, 1.9, 2.5][r], z = 0; for (const s of [-1, 1]) { const f = ELL(g, i % 2 ? fi : dk, 0.05, 0.3, 0.07, x + 0.04 * s, y - 0.27, s * (0.33 - (y - 0.4) * 0.065) + 0, [0, 0, 0.06 * s]); } }
  return g; };
PB.skipole = () => { const g = new (T().Group)(), al = mat(0x2a6aa8, 0.4, 0.5), bk = mat(0x1a1a1a, 0.7), rb = mat(0x8a8a90, 0.5, 0.4);
  CYL(g, al, 0.009, 0.009, 0.95, 0, 0.08, 0, [1.35, 0, 0.1], 6); const bs = CYL(g, bk, 0.07, 0.07, 0.008, 0, 0.1, 0.38, [Math.PI / 2 + 0.2, 0, 0], 12); CYL(g, al, 0.009, 0.009, 0.5, 0.18, 0.5, -0.3, [0.5, 0, 0.9], 6); BOX(g, bk, 0.03, 0.03, 0.13, 0.3, 0.7, -0.4, [0.5, 0.4, 0.3]); CYL(g, rb, 0.02, 0.02, 0.02, 0.06, 0.12, -0.46, [1.4, 0, 0], 6); return g; };
// a string of Christmas lights is a drooping chain of coloured glows
const lightsRow = (E, key, n) => E.extraOf(key, () => { const t = T(), g = new t.Group(), cols = [0xff3a2a, 0xffc02a, 0x4aff6a, 0x3a8aff, 0xff4ac8]; for (let i = 0; i < n; i++) { const sp = new t.Sprite(new t.SpriteMaterial({ map: E.tex().glow, color: cols[i % 5], transparent: true, depthWrite: false, blending: t.AdditiveBlending, fog: false })); sp.scale.set(1.9, 1.9, 1); g.add(sp); } g.traverse(q => { q.frustumCulled = false; }); return g; });
const DRY = { cm: { pic: [], nb: [], grump: [], reply: [] } };
const frontOf = (c, rng, dist, wide) => { const d = SP.door(rng, c.vil); if (!d) return null; const lat = (wide ? (rng() - 0.5) * wide : 0), x = d.x + d.nx * dist + d.nz * lat, z = d.z + d.nz * dist - d.nx * lat; if (!GH().openOk(x, z, 0.8) || !W().obNear(d.x - d.nx * 2.2, d.z - d.nz * 2.2, 1.6)) return null; /* a house really stands behind the door */ return { x, z, a: d.yaw, dx: d.x, dz: d.z, place: c.vil.name }; };

/* ---- the whole village in the road for the sun's return ---- */
K.add({
  id: "sunreturn", fam: "people", chip: "THE SUN", paint: "group", need: { walker: 11 }, close: false, open: true, wideOk: true,
  w: c => c.snow && c.storm < 0.35 && sunWeek(c) && c.el > -0.5 && c.el < 3.5 && c.hr >= 10 && c.hr <= 14 && c.household >= 2 ? 7 : 0,
  anchor(c, rng) {
    const ppl = window.TLXN.peopleIn(c.vil.id).filter(q => q.age > 3).slice(0, 40); if (ppl.length < 6) return null; const rd = SP.road(rng, c.vil), sp = rd ? [rd.x, rd.z] : SP.ring(rng, c.vil.x, c.vil.z, 30, 260, 8); if (!sp) return null;
    const pick = []; const pool = ppl.slice(); while (pick.length < 11 && pool.length) pick.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return { x: sp[0], z: sp[1], a: rng() * TAU, place: c.vil.name, w: pick.map(q => q.id) };
  },
  plan(rec, E) {
    const ps = rec.w.map(who).filter(Boolean), n = ps.length, fx = Math.sin(rec.a), fz = Math.cos(rec.a), lx = fz, lz = -fx, r = mulb(rec.sd);
    return { dur: 4, still: 1.2, need: { walker: 11 }, hour: rec.h, storm: rec.s, vig: 0.16, light: { fill: 1.1, hemi: 0.4, warm: 1, swing: 1 },
      frame(t, E) {
        K.begin(E); const rows = [Math.ceil(n * 0.5), n - Math.ceil(n * 0.5)];
        for (let i = 0; i < n; i++) { const row = i < rows[0] ? 0 : 1, col = row ? i - rows[0] : i, cnt = rows[row], off = (col - (cnt - 1) / 2) * 0.82 + row * 0.38, dep = row * 0.95 + (r() - 0.5) * 0.2, x = rec.x + lx * off - fx * dep, z = rec.z + lz * off - fz * dep, fy = Math.atan2(fx, fz) + (r() - 0.5) * 0.25;
          const w = person(E, i, ps[i], x, z, fy, { warm: true }), U = w.U; K.stand(w, { nod: -0.08, look: (r() - 0.5) * 0.2 }); K.grin(w, 1.1); if (i % 3 === 0) { U.arms[1].rotation.set(-2.5 + 0.2 * Math.sin(t * 4 + i), 0, 0.2); U.fore[1].rotation.set(-0.3, 0, 0); }
          if (i < 2 || i === n - 1) markFig(E, w, true); else { const h = K.headPos(w, _v()); E.faces.push({ x: h.x, y: h.y, z: h.z, yaw: w.o.yaw }); } }
        const cx = rec.x + fx * 5.4, cz = rec.z + fz * 5.4; E.look(cx, surf(cx, cz) + 1.15, cz, rec.x - fx * 0.4, surf(rec.x, rec.z) + 1.1, rec.z - fz * 0.4, 62, 0); E.needH = 0.2;
      } };
  },
  cap: [["w", "The whole of {place} came out into the road at noon. First sun since November. We stood there like plants."], ["c", "THE SUN IS BACK!!! everyone is in the road!!! {place}!!! I am crying a bit and so is Anders"], ["d", "Sun. {place}. Everyone out. Back to work in ten minutes."], ["t", "Sunreturn at {place}."], ["y", "Seventy-odd days without it, and the whole village stands in the road squinting at a hill."], ["e", "We do this every year and it gets me every year. Warm on the face for the first time since the autumn."], ["w", "{pic} and everyone else, faces up, mouths open. The sun is only over the ridge for ten minutes, but it was there."], ["c", "okay but WHY did nobody tell me to bring sunglasses"], ["y", "A village full of people who forgot how bright it is."], ["d", "It came over the fell at 11:52. We counted."]],
  cm: { pic: [], nb: ["We stood on our steps and saw it hit the church.", "I held the baby up so she could say she saw it.", "Where is the sun bun? The saffron one?", "Same here! Ten minutes of glory."], grump: ["Now it is going to be bright in the shop and I will see the dust."], reply: ["Ten minutes!", "The whole road!"] }
});

/* ---- stockfish racks under the aurora ---- */
K.add({
  id: "stockfish", fam: "sea", chip: "STOCKFISH", paint: "house", need: {}, close: false, open: true,
  w: c => c.coast && c.snow && c.storm < 0.4 && c.el < -8 ? (c.int.fish ? 3.2 : 1.4) : 0,
  anchor(c, rng) { const co = c.coast; if (!co) return null; let best = null; for (let k = 0; k < 10 && !best; k++) { const a = rng() * TAU, rr = 8 + rng() * 40, px = co.x + Math.cos(a) * rr, pz = co.z + Math.sin(a) * rr; if (GH().openOk(px, pz, 4)) best = [px, pz]; } if (!best) return null; return { x: best[0], z: best[1], a: co.yaw + (rng() - 0.5) * 0.6, place: c.vil.name + " harbour", w: [] }; },
  plan(rec, E) {
    const r = mulb(rec.sd), fy = rec.a + Math.PI / 2 + (r() - 0.5) * 0.3;
    return { dur: 3, still: 1, need: {}, hour: rec.h, storm: Math.min(rec.s, 0.2), vig: 0.22, light: { fill: 0.5, hemi: 0.4, exp: 0.3, warm: 0.2, swing: 0.8 },
      frame(t, E) {
        K.begin(E); E.forceAur = true; const hx = rec.x, hz = rec.z; K.prop(E, "hjell", 0, hx, hz, fy, { s: 1.2 });         K.lampPool(E, "hj", hx + Math.sin(fy) * 1.5, hz + Math.cos(fy) * 1.5, 7, 0xffd9a0, 0.25);
        const cx = hx + Math.sin(fy) * 7.6, cz = hz + Math.cos(fy) * 7.6; E.look(cx, surf(cx, cz) + 0.9, cz, hx, surf(hx, hz) + 2.9, hz, 66, 0);
        const y = surf(hx, hz); E.marks.push([hx, y + 0.9, hz], [hx, y + 3.3, hz]); E.needH = 0.26;
      } };
  },
  cap: [["w", "Stockfish on the racks at {place}, and the aurora over them. This is what the Nordkinn smells like."], ["c", "THE RACKS!! THE AURORA!! the whole harbour smells like cod and I would not change a thing"], ["d", "Cod. Racks. Green sky."], ["t", "Stockfish under the lights."], ["y", "Dried fish by the thousand, lit by the sky. Norway, sold separately."], ["e", "Hung in February, taken in at midsummer. In between: weather, wind and this."], ["w", "Rows of cod, white in the green light. A very old way to keep a winter."], ["c", "okay the fish are glowing and I am not okay"], ["y", "The aurora does not usually appear for dried cod but here we are."], ["d", "{place}, {hr}. Racks full. Sky doing a thing."]],
  cm: { pic: [], nb: ["Those hung in February, they'll be ready by the summer.", "The wind is exactly right for it this year.", "My grandfather's racks looked just like that.", "Save me a tail!"], grump: ["Mind the racks, there is a gull problem."], reply: ["Save you one.", "Ready by June."] }
});

/* ---- a moon halo over the roofs ---- */
K.add({
  id: "moonhalo", fam: "weather", chip: "HALO", paint: "house", need: {}, close: false, open: true, flat: true,
  w: c => c.snow && c.storm < 0.25 && c.el < -10 ? 2.2 : 0,
  anchor(c, rng) { const d = SP.door(rng, c.vil); if (!d) return null; const x = d.x + d.nx * 9, z = d.z + d.nz * 9; if (!GH().openOk(x, z, 1) || !W().obNear(d.x - d.nx * 2.2, d.z - d.nz * 2.2, 1.6)) return null; return { x, z, a: d.yaw, dx: d.x, dz: d.z, place: c.vil.name, w: [] }; },
  plan(rec, E) {
    const r = mulb(rec.sd), fx = -Math.sin(rec.a), fz = -Math.cos(rec.a), side = (r() - 0.5) * 0.5;
    return { dur: 3, still: 1, need: {}, hour: rec.h, storm: Math.min(rec.s, 0.1), vig: 0.3, light: { fill: 0.5, hemi: 0.6, exp: 0.35 },
      frame(t, E) {
        K.begin(E); const T3 = T(); const mdir = new T3.Vector3(fx * 0.7 + fz * side, 0.72, fz * 0.7 - fx * side).normalize(); E.moonDir = mdir;
        const cx = rec.x, cz = rec.z, cy = surf(cx, cz) + 1.5; const tx = cx + fx * 12, tz = cz + fz * 12; E.look(cx, cy, cz, tx, cy + 12 * Math.tan(0.5), tz, 70, 0);
        const halo = E.extraOf("gp:halo", () => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"), gr = g.createRadialGradient(128, 128, 60, 128, 128, 126); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(190,215,255,0.04)"); gr.addColorStop(0.7, "rgba(220,235,255,0.22)"); gr.addColorStop(0.8, "rgba(255,240,220,0.3)"); gr.addColorStop(0.9, "rgba(200,225,255,0.1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const sp = new T3.Sprite(new T3.SpriteMaterial({ map: new T3.CanvasTexture(c), transparent: true, depthWrite: false, blending: T3.AdditiveBlending, fog: false })); sp.frustumCulled = false; return sp; });
        halo.m.position.set(cx + mdir.x * 420, cy + mdir.y * 420, cz + mdir.z * 420); halo.m.scale.set(400, 400, 1); halo.m.visible = true; halo.on = true;
        const dx = rec.x - Math.sin(rec.a) * 9, dz = rec.z - Math.cos(rec.a) * 9, y = surf(dx, dz); E.marks.push([dx, y + 0.3, dz], [dx, y + 4.6, dz]); E.needH = 0.2;
      } };
  },
  cap: [["w", "A ring round the moon over {place} tonight. Ice crystals, they say. I say magic."], ["c", "THERE IS A RING AROUND THE MOON. a whole ring. {place}. look UP."], ["d", "Moon halo. {place}. Cold coming."], ["t", "Halo round the moon. {place}."], ["y", "The moon is wearing a hat tonight. Forecast: cold."], ["e", "Old people here say a ring round the moon means weather in two days. I never get tired of looking."], ["w", "Frost in the air, a pale ring in the sky, and one lit window under it."], ["c", "okay but why is it so big!!"], ["y", "Ring around the moon. Ring around my fingers, they have gone numb."], ["d", "{hr}. Clear. Minus twenty. Ring."]],
  cm: { pic: [], nb: ["My grandmother says it means snow by Thursday.", "We saw it from the harbour too!", "Look at the size of it.", "The cold is coming in, check your pipes."], grump: ["Some of us have to sleep, look up tomorrow."], reply: ["Thursday, she says.", "Pipes are wrapped."] }
});

/* ---- Christmas lights on the last house before the fell ---- */
K.add({
  id: "xmaslights", fam: "cosy", chip: "LIGHTS", paint: "house", need: {}, close: false, open: true,
  w: c => c.snow && c.storm < 0.5 && c.el < 0 && c.hr >= 15 ? (c.household > 1 ? 2.6 : 1.6) : 0,
  anchor(c, rng) { const f = frontOf(c, rng, 8, 0); if (!f) return null; f.w = []; return f; },
  plan(rec, E) {
    const r = mulb(rec.sd), nx = Math.sin(rec.a), nz = Math.cos(rec.a), lx = Math.cos(rec.a), lz = -Math.sin(rec.a), N = 22, dx = rec.x - nx * 8, dz = rec.z - nz * 8;
    return { dur: 3, still: 1, need: {}, hour: rec.h, storm: Math.min(rec.s, 0.3), vig: 0.26, light: { fill: 0.35, hemi: 0.35, exp: 0.4, warm: 0.5 },
      frame(t, E) {
        K.begin(E); const row = lightsRow(E, "gp:xmas", N), y0 = surf(dx, dz);
        for (let i = 0; i < N; i++) { const u = (i / (N - 1) - 0.5) * 8.4, droop = 0.28 * Math.sin((i % 7) / 6 * Math.PI) - 0.1 * Math.abs(u) / 4, sp = row.m.children[i]; sp.position.set(dx + lx * u + nx * 1.0, y0 + 2.75 + droop, dz + lz * u + nz * 1.0); const tw = 0.85 + 0.15 * Math.sin(t * 3 + i * 1.7); sp.material.opacity = tw; }
        row.m.visible = true; row.on = true; K.lampPool(E, "xm", dx + nx * 2.2, dz + nz * 2.2, 9, 0xffb070, 0.35);
        const cx = rec.x + nx * 4.6, cz = rec.z + nz * 4.6; E.look(cx, surf(cx, cz) + 1.4, cz, dx, y0 + 2.3, dz, 58, 0); E.marks.push([dx - lx * 4.2, y0 + 3.6, dz - lz * 4.2], [dx + lx * 4.2, y0 + 0.2, dz + lz * 4.2]); E.needH = 0.2;
      } };
  },
  cap: [["w", "The last house before the fell, and it is lit like a ship. Somebody up there loves December."], ["c", "THE LIGHTS ON THE LAST HOUSE!!! it is the whole reason I drive home this way!!"], ["d", "Lights. House. {place}."], ["t", "Christmas lights, {place}."], ["y", "Visible from space, and from the ferry, and from the neighbour who has been complaining about it since November."], ["e", "Every year they add another string, and every year the road to the fell looks warmer."], ["w", "Red, yellow, green, blue, in the blue snow. A good last house to pass."], ["c", "okay I stopped the car to take this and then to just look"], ["y", "Electricity bill: considerable. Joy: also considerable."], ["d", "{hr}. Dark. Lit. Well done, {fam}."]],
  cm: { pic: [], nb: ["We see them from our kitchen!", "They are on a timer, you know, until midnight.", "The best-lit house in the municipality.", "Is that a new string on the left?"], grump: ["It is bright enough to read by in my bedroom."], reply: ["New string, yes!", "Timer, midnight."] }
});

/* ---- spot the ptarmigan ---- */
K.add({
  id: "ptarmigan", fam: "animals", chip: "SPOT IT", paint: "deer", need: {}, close: true, open: true, flat: true,
  w: c => c.snow && c.el > -9 && c.storm < 0.5 ? (c.int.birds ? 2.6 : c.int.photos ? 1.4 : 0.7) : 0,
  anchor(c, rng) { const sp = SP.ring(rng, c.vil.x, c.vil.z, 120, 900, 3); if (!sp) return null; return { x: sp[0], z: sp[1], a: rng() * TAU, place: c.vil.name, w: [] }; },
  plan(rec, E) {
    const r = mulb(rec.sd), ca = rec.a + 1.6, d = 1.9;
    return { dur: 3, still: 1, need: {}, hour: rec.h, storm: Math.min(rec.s, 0.3), vig: 0.16, light: { fill: 0.8, hemi: 0.4, exp: 0.2 },
      frame(t, E) {
        K.begin(E); const y = surf(rec.x, rec.z); const px = rec.x + Math.cos(ca) * d, pz = rec.z + Math.sin(ca) * d; K.prop(E, "ptarmigan", 0, rec.x, rec.z, Math.atan2(px - rec.x, pz - rec.z) + 0.45, { s: 1.5 }); for (let i = 0; i < 4; i++) { const a = r() * TAU, rr = 0.7 + r() * 1.6; K.prop(E, "twigs", i, rec.x + Math.cos(a) * rr, rec.z + Math.sin(a) * rr, a, {}); }
        const cx = rec.x + Math.cos(ca) * d, cz = rec.z + Math.sin(ca) * d; E.look(cx, surf(cx, cz) + 0.5, cz, rec.x, y + 0.34, rec.z, 46, 0); E.marks.push([rec.x, y + 0.08, rec.z], [rec.x, y + 0.55, rec.z]); E.needH = 0.24;
      } };
  },
  cap: [["w", "There is a ptarmigan in this picture. Take your time."], ["c", "SPOT THE PTARMIGAN!! she is RIGHT THERE and I have been staring at her for ten minutes and she has not blinked"], ["d", "One bird. White. On snow. Good luck."], ["t", "Ptarmigan, somewhere."], ["y", "Camouflage: working. Photographer: also, to an extent."], ["e", "The willow ptarmigan changes coat twice a year. In winter she is the snow with an opinion."], ["w", "She let me come within two metres. Then she looked at me as if I was the strange one."], ["c", "okay the black eye is the only reason I can find her"], ["y", "If you can see her without the caption you have better eyes than me."], ["d", "{place}. Willow ptarmigan. Frozen, still, perfect."]],
  cm: { pic: [], nb: ["Found her! Right of the twigs.", "They come down to the birch in the cold weeks.", "I am still looking. Hint?", "You were lucky, they are shy."], grump: ["Please do not chase them, they use a lot of energy this time of year."], reply: ["Right of the twigs!", "I stayed still."] }
});

/* ---- the snapped ski pole ---- */
K.add({
  id: "skipole", off: true, fam: "funny", chip: "SNAP", paint: "ski", need: {}, close: false, open: true,
  w: c => c.int.ski !== undefined && c.snow && c.storm < 0.5 && c.el > -9 ? 1.2 + (c.int.ski ? 2 : 0) : 0,
  anchor(c, rng) { const sp = SP.ring(rng, c.vil.x, c.vil.z, 60, 700, 3); if (!sp) return null; return { x: sp[0], z: sp[1], a: rng() * TAU, place: c.vil.name + " trail", w: [] }; },
  plan(rec, E) {
    const r = mulb(rec.sd), ca = rec.a + 2.2, d = 2.4;
    return { dur: 3, still: 1, need: {}, hour: rec.h, storm: Math.min(rec.s, 0.3), vig: 0.2, light: { fill: 0.7, hemi: 0.3, exp: 0.15 },
      frame(t, E) {
        K.begin(E); const y = surf(rec.x, rec.z); K.prop(E, "drift", 0, rec.x, rec.z, 0, { s: 0.55 }); K.prop(E, "skipole", 0, rec.x, rec.z, rec.a, { dy: 0.12, s: 2.1 }); K.prop(E, "glove", 0, rec.x + 0.4, rec.z - 0.7, rec.a, { s: 1.4 });
        const cx = rec.x + Math.cos(ca) * d, cz = rec.z + Math.sin(ca) * d; E.look(cx, surf(cx, cz) + 0.8, cz, rec.x, y + 0.4, rec.z, 54, 0); E.marks.push([rec.x, y + 0.05, rec.z], [rec.x, y + 1.0, rec.z]); E.needH = 0.2;
      } };
  },
  cap: [["w", "It snapped about two kilometres from the car. I carried both halves home like a trophy."], ["c", "my POLE. my BELOVED pole. it went in half on the downhill and I kept going on one pole like a flamingo"], ["d", "Pole: snapped. Skis: crossed. Mood: stable."], ["t", "Snapped pole on {place}."], ["y", "Equipment failure. Technique unrelated."], ["e", "Thirty years on that pole and it chose today."], ["w", "It was a good pole. We will have a small ceremony at the shop."], ["c", "okay but WHO sold me carbon"], ["y", "It is not a broken pole, it is a pole in two stages."], ["d", "{place}. Pole down. Long walk back."]],
  cm: { pic: [], nb: ["The shop has new ones in the corner, the blue ones.", "I have a spare, come by.", "That is the same pole you snapped last year!", "Clean break at least."], grump: ["Do not leave it on the trail, someone will skate over it."], reply: ["Blue ones, thanks.", "Taking it home."] }
});

/* ---- the convoy's tail lamps going over the fell ---- */
K.add({
  id: "convoytail", fam: "sea", chip: "CONVOY", paint: "road", need: {}, close: false, open: true, wideOk: true, flat: true,
  w: c => c.snow && c.storm < 0.7 && c.el < -3 && c.hr >= 15 ? 1.6 : 0,
  anchor(c, rng) { const rd = SP.road(rng, c.vil); if (!rd) return null; return { x: rd.x, z: rd.z, a: rd.yaw, place: rd.name || c.vil.name + " road", w: [], s: Math.min(0.5, c.storm) }; },
  plan(rec, E) {
    const fx = Math.sin(rec.a), fz = Math.cos(rec.a), lx = fz, lz = -fx;
    return { dur: 3, still: 1, need: {}, hour: rec.h, storm: rec.s, vig: 0.3, light: { fill: 0.4, hemi: 0.4, exp: 0.35 }, flat: true,
      frame(t, E) {
        K.begin(E); E.forceAur = E.forceAur || false; let top = 0; for (let i = 0; i < 4; i++) { const d = 26 + i * 33, x = rec.x + fx * d + lx * (i % 2 ? 1.6 : -1.2), z = rec.z + fz * d + lz * (i % 2 ? 1.6 : -1.2); K.prop(E, "tail", i, x, z, rec.a, { s: 1.0 + i * 0.5 }); top = Math.max(top, surf(x, z)); }
        const cx = rec.x - fx * 2, cz = rec.z - fz * 2; E.look(cx, surf(cx, cz) + 1.6, cz, rec.x + fx * 90, surf(rec.x + fx * 90, rec.z + fz * 90) + 6, rec.z + fz * 90, 50, 0); E.marks.push([rec.x + fx * 26, surf(rec.x + fx * 26, rec.z + fz * 26) + 0.4, rec.z + fz * 26], [rec.x + fx * 140, surf(rec.x + fx * 140, rec.z + fz * 140) + 9, rec.z + fz * 140]); E.needH = 0.2;
      } };
  },
  cap: [["w", "Four sets of tail lamps going over the fell, one behind the other. That is the supply convoy for Mehamn."], ["c", "THE CONVOY!!! all the tail lamps going up the fell in the dark, I stopped the car just to watch"], ["d", "Convoy. {place}. Dark. Red lights."], ["t", "Convoy going over."], ["y", "Four trucks, one road, one very long night for somebody."], ["e", "They go in a line when the road is bad, so that if one stops, all of them know."], ["w", "A string of red lights climbing into the dark. It looks like a necklace on the hill."], ["c", "okay I am going to wave and nobody can see me"], ["y", "If they are going slowly it is because the road is going to be fun."], ["d", "{hr}. {place}. Tail lamps. Home safe, all of you."]],
  cm: { pic: [], nb: ["That will be the Tuesday run.", "They are late, the road must be bad.", "My cousin drives the second one!", "Safe trip to them."], grump: ["They wake the whole street at five."], reply: ["Safe trip!", "Tuesday run."] }
});

})();
