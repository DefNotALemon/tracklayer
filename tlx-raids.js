// Tracklayer — drug sites in the world, the crew living there, spotting one yourself, tip-offs (G9 slice A2a, loop/RAIDS.md).
//
// A2a is the world half of the raids: A2b (the alert and the fight, shooting the crew, wounds, taking the cash, the Politi clock) is NOT
// here. Nobody can be shot, nothing can be taken, the door is locked. What is here, and the seams A2b plugs into:
//
//  SITES. Each game week 2-3 sites are seeded (deterministic from the world and the week number) at real remote spots: 250 m or more
//  from every house door and village, on dry near-level ground off the roads and the ski trails and out of every plowed yard, with a
//  sled-able line in from the nearest village. They exist whether or not the player knows. At the week's end the crew moves on (the
//  site is dropped) unless the player is within sight of it. A site's meshes are built when the player is within TUNE.buildR (past the
//  fog) and disposed beyond TUNE.dropR; its crew is only simulated within TUNE.crewR. Far sites cost nothing.
//  A site is { id, kind, x, z, ry, week, n (crew size), seed, found, tipped, read }. KINDS is the table of kinds (A2a has "grow": the
//  grow barn; A3 adds more entries: name, short, crew roster, build(site), room(R, K, site)).
//
//  THE GROW BARN. Outside: a weathered outbuilding, blacked-out windows, a purple line of light under the door and round the boards at
//  night, a running generator (sound, exhaust), a snowed-in van, fuel cans, bin bags, an oil-drum fire, a chained dog, a packed sled
//  track and foot tracks in. Inside (a walk-in room through the game's interior mechanism): rows of plants under purple lamps, a drying
//  line, fans, a table with scales and cash piles (inert), a camp bed. The door is locked until A2b: its beacon is hidden; the test
//  hook TLXRD.testEnter(id) shows it and puts the player on it so the room can be walked into and photographed.
//
//  THE CREW. 3-5 men per site (look-out, two tub carriers, a shoveller who burns rubbish at night, a phone man who refuels the generator),
//  plus sometimes a rider on a sled with its lights off, plus the dog. Each is an object { o: {x,z,yaw}, v, path, state, g (the game's
//  figure rig, walked by api.walkAs with o.hard so it never wades) } on a daily routine by game time. They react to the player by
//  distance and line of sight: notice (heads turn, 90 m) > wary (work stops, 60 m) > warn-off (35 m: the look-out walks out, a hand up and a
//  shouted line) > barred (under 20 m after a warn-off: all go in and bar the door). Leave for 140 m for a few seconds and it all resets.
//
//  SPOTTING IT. No marker, no prompt, no HUD hint for an unknown site. While the player looks at a site's activity with a clear line of
//  sight from within TUNE.seen (further through the rifle's scope) a hidden read fills over seconds: faster closer, through the scope, at
//  night with the purple light showing, with more routines in view. A quiet HUD line shows once it is a third full; when full the site is
//  FOUND: a mark on the Map app (its own glyph and colour), a Jobs row with the compass, a toast and a note in the Vakt app. No licence,
//  rifle or standing is needed.
//
//  TIPS. Armed standing (tlx-armed.js, TLXAW.standing()) earns tips: the first after the fifth finished armed job with TUNE.tipMin points,
//  then one for every TUNE.tipEvery more points, never more than one a game day. A tip is a short thread (2-4 lines, 12 templates) from a
//  real person tied to the employer (or "the duty desk"), in the Vakt app's new Tips tab; it marks one of the week's live sites (tipped
//  glyph), adds a Jobs row with a compass target, and goes stale with its site (the thread says so). Found + tipped merge into one mark.
//
//  NEWS. A site that has been live a few days gets "odd goings-on" village talk on the news bus (never naming the player).
//
// SAVED under x.sys.raids: { week, sites: [...], tips: [...], seq, tipN, last: { day, pts }, told }. The meshes, the crew and the dog are
// rebuilt from the site record after a reload; an old save starts empty. Option "raids" (on by default): off = no site, mark, row or tip.
// Test hooks: window.TLXRD.
(() => {
"use strict";
let api = null, T = null, built = false;
const S = () => TLX.state("raids");
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const hashS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const W = () => api.world;
const here = () => api.FOOT.on ? api.FOOT : api.P;
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const money = v => api.fmtCash(Math.round(v));

TLX.option({ id: "raids", name: "Drug sites and tip-offs", hint: "Remote places in the world where people are up to something (a grow barn, to start), seen by watching from a distance, and tips from armed standing that put one on your map. Off = no sites, marks, rows or tips.", sys: "raids" });

const TUNE = {
  buildR: 1500, dropR: 1800, crewR: 760, crewDrop: 860,              // m: meshes built past the fog (exp 0.0017: a barn is a smudge at 1200 m), crew simulated only near
  seen: 220, scopeK: 0.45,                                           // m a site's activity can be read from; a scope's zoom x scopeK stretches it
  notice: 90, wary: 60, warn: 35, barred: 20, resetD: 140, resetT: 7, // m: the reactions, and how far for how long resets them
  fill: 0.04, decay: 0.012, hudAt: 0.34, cone: 0.62,                // read: per second at the base rate, lost per second looking away, the HUD line from here, the view cone (rad)
  tipMin: 12, tipJobs: 5, tipEvery: 8,                               // armed standing points for the first tip (and finished jobs), then every this many points
  minDoor: 250, minSite: 400, wait: 8
};
const KIND_TAG = { grow: "grow barn" };

/* ---------------- the table of kinds (A3 adds entries) ---------------- */
// build(site, B) furnishes the outside; roster: the crew in order (a site's n takes the first n); room: the walk-in room's builder
const KINDS = {};

/* ---------------- places ---------------- */
const sitesAll = () => W().SITES.filter(s => s.x !== undefined);
// the nearest named place to a point (for "Found: grow barn by <place>"): villages, cabins, lookouts, the quay town
function placeNear(x, z) {
  let best = null, bd = 1e12; const w = W();
  const cand = [{ name: "Kjøllefjord", x: w.depot.x, z: w.depot.z }];
  for (const s of sitesAll()) if (s.name && !/^\s*$/.test(s.name)) cand.push({ name: s.name, x: s.x, z: s.z });
  for (const L of w.LOOKOUTS || []) if (L.name) cand.push({ name: L.name, x: L.x, z: L.z });
  for (const c of cand) { const d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; best = c; } }
  return best ? best.name : "the fell";
}
const KIND_NAME = k => (KINDS[k] && KINDS[k].name) || "place";

/* ---------------- a site record ---------------- */
// the saved fields are plain data; the live parts (meshes B, crew C, and the moment-to-moment numbers) are hidden from JSON so a save never sees them
const HID = ["B", "C", "force", "watch", "lvl", "lvlName", "shouted", "barks", "barredAt", "testOpen"];
function mkSite(o) { for (const k of HID) Object.defineProperty(o, k, { value: k === "B" || k === "C" ? null : undefined, writable: true, enumerable: false, configurable: true }); return o; }
/* ---------------- seeding ---------------- */
const weekNow = () => Math.floor(api.CAL.dayIndex() / 7);
function groundOk(x, z) { const w = W(); return !(w.isSea(x, z) || w.isWater(x, z)); }
// is (x, z) a place a site may stand? returns { ry } (the way the door faces: toward the nearest village, where the track runs) or null
function spotOk(x, z, others) {
  const w = W(); if (Math.abs(x) > w.half - 320 || Math.abs(z) > w.half - 320) return null;
  if (!groundOk(x, z) || w.obstaclesNear(x, z, 22).some(o => !o.raid) || w.slopeAt(x, z, 10) > 0.07) return null;       // (not counting a site's own colliders)
  const doors = w.doors || [];
  for (const d of doors) if (Math.hypot(d.x - x, d.z - z) < TUNE.minDoor) return null;
  let near = null, nd = 1e12;
  for (const s of sitesAll()) { const d = Math.hypot(s.x - x, s.z - z); if (d < TUNE.minDoor) return null; if (s.type === "cabin" && d < nd) { nd = d; near = s; } }
  if (Math.hypot(w.depot.x - x, w.depot.z - z) < 600) return null;
  for (const o of others) if (Math.hypot(o.x - x, o.z - z) < TUNE.minSite) return null;
  const y0 = w.groundAt(x, z);                                    // the bare ground, not the snow on it: the weather must not change where a site is
  for (let a = 0; a < 16; a++) {
    const an = a * Math.PI / 8, x1 = x + Math.cos(an) * 8, z1 = z + Math.sin(an) * 8, x2 = x + Math.cos(an) * 15, z2 = z + Math.sin(an) * 15;
    if (!groundOk(x1, z1) || !groundOk(x2, z2) || Math.abs(w.groundAt(x1, z1) - y0) > 0.55 || Math.abs(w.groundAt(x2, z2) - y0) > 1.25) return null;
    if (w.yardAt && (w.yardAt(x1, z1) || w.yardAt(x2, z2))) return null;
  }
  if (w.yardAt && w.yardAt(x, z)) return null;
  if (window.TLXR && TLXR.ready && TLXR.near) { const n = TLXR.near(x, z); if (n && n.route && n.d < 70) return null; }
  if (window.TLXSK && TLXSK.ready && TLXSK.nearest && TLXSK.nearest(x, z, 70)) return null;
  if (!near) return null;
  // a sled-able line in from the nearest place: dry and not too steep, every 25 m
  const dx = near.x - x, dz = near.z - z, L = Math.hypot(dx, dz);
  for (let d = 30; d < L - 60; d += 25) { const px = x + dx / L * d, pz = z + dz / L * d; if (!groundOk(px, pz) || w.slopeAt(px, pz, 6) > 0.55) return null; }
  const ry = Math.atan2(dx, dz), gx = x + Math.sin(ry) * 34, gz = z + Math.cos(ry) * 34;
  if (!groundOk(gx, gz) || w.obstaclesNear(gx, gz, 6).some(o => !o.raid)) return null;
  return { ry: Math.round(ry * 1000) / 1000, from: near.name };
}
// a week's sites: deterministic from the world and the week number
function seedWeek(week) {
  const w = W(), R = rng(hashS("raids:" + w.id + ":" + week)), n = 2 + (R() < 0.5 ? 1 : 0), out = [], anchors = sitesAll().filter(s => s.type === "cabin");
  if (!anchors.length) return out;
  for (let tries = 0; tries < 6000 && out.length < n; tries++) {
    const a = anchors[Math.floor(R() * anchors.length)], r = 280 + R() * 1600, an = R() * Math.PI * 2, x = Math.round(a.x + Math.cos(an) * r), z = Math.round(a.z + Math.sin(an) * r);
    const ok = spotOk(x, z, out); if (!ok) continue;
    const k = out.length, crew = 3 + Math.floor(R() * 3);
    out.push(mkSite({ id: `g${week}-${k + 1}`, kind: "grow", x, z, ry: ok.ry, week, n: crew, seed: Math.floor(R() * 1e9), found: false, tipped: false, read: 0, told: false, rider: R() < 0.6 }));
  }
  return out;
}

/* ---------------- textures, materials, sprites, sound ---------------- */
let MT = null;
const cvs = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; };
function ctex(c, rx, ry, rot) {
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.anisotropy = 4;
  if (rot) { t.center.set(0.5, 0.5); t.rotation = rot; }
  if (window.TLXL && TLXL.srgb) t.encoding = T.sRGBEncoding; return t;
}
function plankCanvas(seed) {
  const c = cvs(256), g = c.getContext("2d"), R = rng(seed), n = 8, w = 256 / n;
  for (let i = 0; i < n; i++) {
    const v = 0.5 + R() * 0.22, r = Math.round(98 * v + 38), gr = Math.round(92 * v + 36), b = Math.round(80 * v + 34);
    g.fillStyle = `rgb(${r},${gr},${b})`; g.fillRect(i * w, 0, w, 256);
    for (let k = 0; k < 26; k++) { g.fillStyle = `rgba(${R() < 0.5 ? "30,26,22" : "190,184,170"},${0.05 + R() * 0.09})`; g.fillRect(i * w + R() * w, 0, 1 + R() * 1.6, 256 * (0.3 + R() * 0.7)); }
    if (R() < 0.8) { const ky = R() * 230 + 10, kx = i * w + w * (0.25 + R() * 0.5); g.fillStyle = "rgba(34,28,22,.55)"; g.beginPath(); g.ellipse(kx, ky, 3 + R() * 3, 6 + R() * 6, 0, 0, 7); g.fill(); }
    g.fillStyle = "rgba(14,12,10,.85)"; g.fillRect(i * w, 0, 2.2, 256); g.fillStyle = "rgba(210,205,190,.12)"; g.fillRect(i * w + 2.2, 0, 1.2, 256);
  }
  const gr2 = g.createLinearGradient(0, 0, 0, 256); gr2.addColorStop(0, "rgba(20,18,14,0)"); gr2.addColorStop(0.7, "rgba(20,18,14,0)"); gr2.addColorStop(1, "rgba(22,24,16,0.5)"); g.fillStyle = gr2; g.fillRect(0, 0, 256, 256);
  return c;
}
function roofCanvas(seed) {
  const c = cvs(128, 256), g = c.getContext("2d"), R = rng(seed);
  g.fillStyle = "#5e3f33"; g.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 256; y += 32) { const gr = g.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, "rgba(255,225,200,.28)"); gr.addColorStop(0.35, "rgba(0,0,0,0)"); gr.addColorStop(0.8, "rgba(0,0,0,.34)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, y, 128, 32); }
  for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${R() < 0.6 ? "120,62,28" : "40,28,24"},${0.12 + R() * 0.2})`; g.beginPath(); g.ellipse(R() * 128, R() * 256, 6 + R() * 16, 4 + R() * 12, 0, 0, 7); g.fill(); }
  for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(0,0,0,${0.05 + R() * 0.1})`; g.fillRect(R() * 128, 0, 1, 256 * R()); }
  return c;
}
function mats() {
  if (MT) return MT; const std = api.mesh.std;
  const side = ctex(plankCanvas(11), 0.57, 0.57, Math.PI / 2), cap = ctex(plankCanvas(11), 0.57, 0.57);
  MT = {
    plankSide: new T.MeshStandardMaterial({ map: side, roughness: 0.95, metalness: 0 }), plankCap: new T.MeshStandardMaterial({ map: cap, roughness: 0.95, metalness: 0 }),
    plank: new T.MeshStandardMaterial({ map: ctex(plankCanvas(23), 0.6, 0.6), roughness: 0.95, metalness: 0 }),
    roof: new T.MeshStandardMaterial({ map: ctex(roofCanvas(5), 1.4, 1.2), roughness: 0.62, metalness: 0.55 }),
    snow: std(0xf1f5f9, 1, 0), dark: std(0x131517, 0.9, 0.1), stone: std(0x6b6a66, 0.95, 0), rust: std(0x6b3a22, 0.8, 0.35), board: std(0x2b2520, 0.95, 0), boardP: std(0x6d6254, 0.95, 0),
    black: new T.MeshBasicMaterial({ color: 0x050607 }), steel: std(0x8d949b, 0.5, 0.6), dgrey: std(0x2c3036, 0.7, 0.3), white: std(0xd6d9dc, 0.7, 0.1), red: std(0xb02a20, 0.55, 0.1), yel: std(0xd9a82a, 0.6, 0.1),
    bag: std(0x15171a, 0.32, 0.1), card: std(0x9c7c52, 0.95, 0), tub: std(0x2c4258, 0.5, 0.1), tubL: std(0x3b546d, 0.5, 0.1), strap: std(0xd0b43c, 0.7, 0), rubber: std(0x0f1011, 0.95, 0), glass: std(0x1d2a38, 0.15, 0.6),
    wood: std(0x7a5c3c, 0.92, 0), woodD: std(0x4a3828, 0.95, 0), green: std(0x2f4a38, 0.7, 0.2), orange: std(0xcf6a1e, 0.6, 0.1),
    leak: new T.MeshBasicMaterial({ color: 0xb23cff, transparent: true, opacity: 0, depthWrite: false, fog: false }),
    glow: new T.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9, depthWrite: false }),
    glow2: new T.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.8, depthWrite: false })
  };
  return MT;
}
const halo = (() => { let t = null; return () => { if (t) return t; const c = cvs(64), g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (t = new T.CanvasTexture(c)); }; })();
const puffTex = (() => { let t = null; return () => { if (t) return t; const c = cvs(64), g = c.getContext("2d"); for (let i = 0; i < 7; i++) { const x = 32 + (Math.sin(i * 2.4) * 10), y = 32 + Math.cos(i * 1.7) * 9, gr = g.createRadialGradient(x, y, 0, x, y, 20); gr.addColorStop(0, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); } return (t = new T.CanvasTexture(c)); }; })();
const sprite = (g, x, y, z, sz, col) => { const s = new T.Sprite(new T.SpriteMaterial({ map: halo(), color: col, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, opacity: 0 })); s.position.set(x, y, z); s.scale.set(sz, sz, 1); g.add(s); return s; };

// smoke: one pool for every site (exhaust, the vent, cigarettes, the drum)
const SM = { pool: [], head: 0, n: 40 };
function smokeInit() {
  if (SM.pool.length) return;
  for (let i = 0; i < SM.n; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: puffTex(), color: 0x9aa0a6, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; s.userData = { age: 9, life: 1 }; api.scene.add(s); SM.pool.push(s); }
}
function smoke(x, y, z, vx, vy, vz, size, life, col, op) {
  if (!SM.pool.length) return; const s = SM.pool[SM.head++ % SM.n]; s.position.set(x, y, z); s.visible = true; s.material.color.setHex(col || 0x9aa0a6);
  Object.assign(s.userData, { age: 0, life, vx, vy, vz, size, op: op || 0.5 }); s.scale.set(size, size, 1);
}
function smokeTick(dt) {
  for (const s of SM.pool) { if (!s.visible) continue; const u = s.userData; u.age += dt; if (u.age >= u.life) { s.visible = false; continue; } const k = u.age / u.life;
    s.position.x += u.vx * dt; s.position.y += u.vy * dt; s.position.z += u.vz * dt; u.vx *= 0.985; u.vz *= 0.985; const sz = u.size * (1 + k * 2.4); s.scale.set(sz, sz, 1); s.material.opacity = u.op * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (1 - k * 0.4); }
}
// the generator's hum (an oscillator pair through the game's audio, louder near) and a dog's bark
const GEN = { nodes: null, vol: 0 };
function genSound(vol) {
  const au = api.audio && api.audio(); if (!au || !au.AC) return;
  if (!GEN.nodes) {
    if (vol <= 0) return; const AC = au.AC, o1 = AC.createOscillator(), o2 = AC.createOscillator(), f = AC.createBiquadFilter(), gn = AC.createGain();
    o1.type = "sawtooth"; o1.frequency.value = 47; o2.type = "square"; o2.frequency.value = 94.6; f.type = "lowpass"; f.frequency.value = 240; gn.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(gn); gn.connect(au.master); o1.start(); o2.start(); GEN.nodes = { o1, o2, f, gn };
  }
  const AC = au.AC, t = AC.currentTime; GEN.nodes.gn.gain.setTargetAtTime(vol * 0.06, t, 0.25); GEN.nodes.o1.frequency.setTargetAtTime(47 + Math.sin(performance.now() / 700) * 1.2, t, 0.1); GEN.vol = vol;
}
function bark(v) {
  const au = api.audio && api.audio(); if (!au || !au.AC) return; const { AC, master, buf } = au, t = AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), gn = AC.createGain(), o = AC.createOscillator(), og = AC.createGain();
  s.buffer = buf; s.playbackRate.value = 0.8; f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 1.4; gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.015); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  s.connect(f); f.connect(gn); gn.connect(master); s.start(t); s.stop(t + 0.2);
  o.type = "triangle"; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.14); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.28 * v, t + 0.012); og.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.18);
}

/* ---------------- building a site ---------------- */
const SITES_LIVE = [];                                          // sites with meshes (B)
function frame(site) {
  const w = W(), g = new T.Group(), y0 = w.surf(site.x, site.z), co = Math.cos(site.ry), si = Math.sin(site.ry);
  g.position.set(site.x, y0, site.z); g.rotation.y = site.ry; api.scene.add(g);
  const B = { site, g, y0, co, si, obs: [], rests: [], anim: [], night: [], tubs: [], parts: {}, pts: {}, door: null, beacon: null, leaks: [], glows: [] };
  B.wx = (lx, lz) => site.x + lx * co + lz * si; B.wz = (lx, lz) => site.z - lx * si + lz * co;
  B.pt = (lx, lz) => ({ x: B.wx(lx, lz), z: B.wz(lx, lz) });
  B.Y = (lx, lz) => w.surf(B.wx(lx, lz), B.wz(lx, lz)) - y0;
  B.ob = (lx, lz, r) => { const o = { x: B.wx(lx, lz), z: B.wz(lx, lz), r, top: 1e9, raid: site.id }; w.addOb(o); B.obs.push(o); return o; };
  B.rest = (name, obj, ref, kind) => B.rests.push({ name, obj, ref, kind: kind || "part" });
  B.press = (pts, r, k) => { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let d = 0; d <= L; d += Math.max(0.4, r * 0.7)) { const u = L ? d / L : 0; w.pressSnow(B.wx(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u), B.wz(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u), r, k); } } };
  return B;
}
function buildSite(site) {
  const K = KINDS[site.kind]; if (!K || site.B) return site.B;
  smokeInit(); mats(); const B = frame(site);
  try { K.build(site, B); } catch (e) { console.error("tlx-raids build", e); }
  site.B = B; SITES_LIVE.push(B); return B;
}
function disposeSite(site) {
  const B = site.B; if (!B) return; freeCrew(site);
  const w = W(); for (const o of B.obs) w.dropOb(o);
  if (B.beacon) { try { api.scene.remove(B.beacon.g); const i = api.INT.beacons.indexOf(B.beacon); if (i >= 0) api.INT.beacons.splice(i, 1); if (api.INT.xrooms) delete api.INT.xrooms[B.roomId]; } catch (e) { } }
  api.scene.remove(B.g); B.g.traverse(m => { if (m.geometry && !m.geometry.userData.keep) m.geometry.dispose(); });
  const i = SITES_LIVE.indexOf(B); if (i >= 0) SITES_LIVE.splice(i, 1); site.B = null;
}

/* ---------------- the grow barn, outside ---------------- */
const HX = 2.8, HZ = 4.2, EAVE = 2.5, RIDGE = 4.05;            // the barn: half width, half length, eave and ridge height above its base
function jerry(B, lx, lz, ry, col) {
  const M = api.mesh, g = B.g, y = B.Y(lx, lz), m = mats(), grp = new T.Group(); grp.position.set(lx, y - 0.015, lz); grp.rotation.y = ry; g.add(grp);
  M.box(0.34, 0.46, 0.16, col, 0, 0.23, 0, 0, 0, 0, grp); M.box(0.2, 0.05, 0.1, col, -0.02, 0.485, 0, 0, 0, 0, grp); M.cyl(0.025, 0.025, 0.08, m.dgrey, 0.1, 0.5, 0, 0, 0, 0, grp, 8); M.box(0.3, 0.02, 0.012, m.dgrey, 0, 0.3, 0.085, 0, 0, 0, grp); M.box(0.3, 0.02, 0.012, m.dgrey, 0, 0.16, 0.085, 0, 0, 0, grp);
  grp.userData.ry = ry; B.rest("can", grp, B.y0 + y); return grp;
}
function tubMesh(parent) {
  const M = api.mesh, m = mats(), g = new T.Group();
  M.box(0.62, 0.34, 0.42, m.tub, 0, 0.17, 0, 0, 0, 0, g); M.box(0.66, 0.06, 0.46, m.tubL, 0, 0.37, 0, 0, 0, 0, g);
  for (const sx of [-0.18, 0.18]) M.box(0.04, 0.4, 0.48, m.strap, sx, 0.2, 0, 0, 0, 0, g);
  M.box(0.2, 0.05, 0.06, m.tubL, 0, 0.3, 0.23, 0, 0, 0, g); M.box(0.2, 0.05, 0.06, m.tubL, 0, 0.3, -0.23, 0, 0, 0, g);
  g.userData.h = 0.4; if (parent) parent.add(g); return g;
}
function bagMesh(parent, r) { const M = api.mesh, m = mats(), g = new T.Group(); M.ball(r || 0.28, m.bag, 0, r || 0.28, 0, g, 1, 0.82, 0.9); M.cyl(0.015, 0.05, 0.12, m.bag, 0, (r || 0.28) * 1.75, 0, 0, 0, 0, g, 6); if (parent) parent.add(g); return g; }

function buildGrow(site, B) {
  const M = api.mesh, box = M.box, cyl = M.cyl, ball = M.ball, g = B.g, Y = B.Y, m = mats(), w = W(), R = rng(site.seed), PI = Math.PI;
  let lo = 1e9, hi = -1e9; for (const [x, z] of [[-HX, -HZ], [HX, -HZ], [-HX, HZ], [HX, HZ], [0, -HZ], [0, HZ], [-HX, 0], [HX, 0], [0, 0]]) { const y = Y(x, z); lo = Math.min(lo, y); hi = Math.max(hi, y); }
  const base = lo - 0.2, doorX = 0.5, fy = Y(doorX, HZ + 0.7);
  B.parts.base = base; B.parts.lo = lo;
  // the body: one extruded pentagon (walls and both gables), weathered boards
  const sh = new T.Shape(); sh.moveTo(-HX, 0); sh.lineTo(HX, 0); sh.lineTo(HX, EAVE); sh.lineTo(0, RIDGE); sh.lineTo(-HX, EAVE); sh.lineTo(-HX, 0);
  const body = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 2 * HZ, bevelEnabled: false, steps: 1 }), [m.plankCap, m.plankSide]); body.position.set(0, base, -HZ); body.castShadow = body.receiveShadow = true; g.add(body); B.parts.body = body;
  const plinth = box(2 * HX + 0.16, 0.7, 2 * HZ + 0.16, m.stone, 0, lo, 0, 0, 0, 0, g); B.rest("barn", plinth, B.y0 + lo, "barn");
  // the roof: rusted corrugated iron with an overhang, snow on it (bare round the vent, where the heat leaks), a snow ridge
  const ang = Math.atan2(RIDGE - EAVE, HX), rl = Math.hypot(HX, RIDGE - EAVE) + 0.36, cs = Math.cos(ang), sn = Math.sin(ang);
  for (const s of [-1, 1]) {
    const cx = s * (HX / 2 + 0.18 * cs) + s * sn * 0.045, cy = base + (EAVE + RIDGE) / 2 - 0.18 * sn + cs * 0.045;
    box(rl, 0.07, 2 * HZ + 0.7, m.roof, cx, cy, 0, 0, 0, -s * ang, g);
    for (const [z0, z1] of s === 1 ? [[-HZ - 0.3, -1.3], [0.9, HZ + 0.3]] : [[-HZ - 0.3, HZ + 0.3]]) {
      const len = z1 - z0, th = 0.22 + R() * 0.05, up = 0.045 + th / 2, ox = s * sn * up - s * cs * 0.12, oy = cs * up + sn * 0.12 * 0 - 0.04;
      box(rl - 0.5, th, len, m.snow, cx + ox, cy + oy - 0.0, (z0 + z1) / 2, 0, 0, -s * ang, g);
    }
    box(0.1, 0.22, 2 * HZ + 0.7, m.woodD, s * (HX + 0.3 * cs), base + EAVE - 0.28 * sn - 0.0, 0, 0, 0, -s * ang, g).visible = false;
  }
  box(0.62, 0.2, 2 * HZ + 0.7, m.snow, 0, base + RIDGE + 0.1, 0, 0, 0, 0, g);
  for (const z of [-HZ - 0.35, HZ + 0.35]) for (const s of [-1, 1]) box(rl, 0.17, 0.06, m.woodD, s * (HX / 2 + 0.18 * cs), base + (EAVE + RIDGE) / 2 - 0.18 * sn - 0.04, z, 0, 0, -s * ang, g);
  // the roof vent over the grow room: a pipe and a cowl, steam over it
  const vx = 0.9, vy = base + RIDGE - vx * (RIDGE - EAVE) / HX + 0.02; cyl(0.17, 0.17, 0.95, m.steel, vx, vy + 0.4, -0.2, 0, 0, 0, g, 12); cyl(0.04, 0.34, 0.26, m.dgrey, vx, vy + 1.0, -0.2, 0, 0, 0, g, 12); B.pts.vent = { lx: vx, ly: vy + 1.2, lz: -0.2 };
  // the rear duct: a fan housing on the back gable
  box(0.62, 0.62, 0.9, m.steel, -1.1, base + 1.55, -HZ - 0.45, 0, 0, 0, g); cyl(0.26, 0.26, 0.06, m.dgrey, -1.1, base + 1.55, -HZ - 0.92, PI / 2, 0, 0, g, 14); for (let i = -1; i <= 1; i++) box(0.5, 0.025, 0.02, m.dgrey, -1.1, base + 1.55 + i * 0.1, -HZ - 0.96, 0, 0, 0, g);
  // the door: a dark opening in the front gable and a sliding leaf over it (it slides left on a rail to let somebody through)
  const dk = box(1.7, 2.15, 0.03, m.black, doorX, fy + 1.075, HZ + 0.02, 0, 0, 0, g); B.parts.dark = dk;
  const leaf = new T.Group(); leaf.position.set(doorX, fy + 0.1, HZ + 0.1); g.add(leaf);
  box(1.92, 2.28, 0.07, m.plank, 0, 1.14, 0, 0, 0, 0, leaf); for (const yy of [0.35, 1.95]) box(1.9, 0.14, 0.05, m.woodD, 0, yy, 0.05, 0, 0, 0, leaf); const br = box(0.13, 2.45, 0.05, m.woodD, 0, 1.14, 0.055, 0, 0, 0.72, leaf);
  box(0.06, 0.2, 0.05, m.dgrey, 0.7, 1.05, 0.08, 0, 0, 0, leaf); B.door = { leaf, x0: doorX, slide: 0, target: 0, w: 1.92, barred: false, fy };
  box(4.6, 0.12, 0.12, m.dgrey, -0.5, fy + 2.4, HZ + 0.17, 0, 0, 0, g);
  const bar = box(2.4, 0.16, 0.06, m.woodD, doorX, fy + 1.1, HZ + 0.2, 0, 0, 0.0, g); bar.visible = false; B.door.bar = bar; box(0.12, 0.5, 0.08, m.dgrey, doorX - 1.1, fy + 1.1, HZ + 0.19, 0, 0, 0, g).visible = true;
  // blacked-out windows: a board over each, and a purple line round it at night (the leak strip sits behind the board)
  const leakBox = (w2, h2, lx, ly, lz, ry) => { const q = box(w2, h2, 0.012, m.leak, lx, ly, lz, 0, ry, 0, g); B.leaks.push(q); return q; };
  const win = (lx, ly, lz, ry) => {
    const grp = new T.Group(); grp.position.set(lx, ly, lz); grp.rotation.y = ry; g.add(grp);
    box(1.12, 1.22, 0.04, m.woodD, 0, 0, 0.0, 0, 0, 0, grp); const q = box(1.04, 1.14, 0.012, m.leak, 0, 0, 0.03, 0, 0, 0, grp); B.leaks.push(q);
    box(0.94, 1.04, 0.05, m.board, 0, 0, 0.065, 0, 0, 0, grp); for (const s of [-1, 1]) box(0.08, 1.3, 0.04, m.boardP, 0, 0, 0.11, 0, 0, s * 0.62 + (R() - 0.5) * 0.1, grp); box(1.0, 0.09, 0.04, m.boardP, 0, 0.3 * (R() < 0.5 ? 1 : -1), 0.105, 0, 0, (R() - 0.5) * 0.06, grp);
  };
  const wy = base + 1.5;
  win(2.0, wy, HZ + 0.01, 0);
  for (const z of [-2.6, 2.1]) win(HX + 0.01, wy, z, PI / 2);
  for (const z of [-2.6, -0.2, 2.2]) win(-HX - 0.01, wy, z, -PI / 2);
  // purple under the door and down its two edges
  leakBox(1.94, 0.08, doorX, fy + 0.05, HZ + 0.07, 0); for (const sx of [-1, 1]) leakBox(0.035, 2.3, doorX + sx * 0.99, fy + 1.25, HZ + 0.07, 0);
  // the glow on the snow in front of the door, and round the vent
  const dg = sprite(g, doorX, fy + 0.6, HZ + 0.9, 6.5, 0xa030ff); B.glows.push({ s: dg, k: 0.5 }); const vg = sprite(g, vx, vy + 1.3, -0.2, 3.5, 0xa030ff); B.glows.push({ s: vg, k: 0.18 });
  // collision: the barn is solid (a row of circles along it)
  for (let z = -HZ + 0.6; z <= HZ - 0.5; z += 1.9) for (const x of [-1.5, 0, 1.5]) B.ob(x, z, 1.55);
  // tracks in: a packed sled track from the gate to the door and on toward the village, foot tracks between the things
  B.pts.door = [doorX, HZ + 0.9]; B.pts.gate = [0.9, 34];
  const trk = []; for (let z = 100; z >= HZ + 1; z -= 6) trk.push([0.1 + Math.sin(z / 11) * 1.4 + (z > 34 ? 0 : 0), z]);
  try {
    B.press(trk.map(p => [p[0] - 0.55, p[1]]), 0.5, 0.45); B.press(trk.map(p => [p[0] + 0.55, p[1]]), 0.5, 0.45);
    B.press([[doorX, HZ + 1], [doorX - 0.5, 9], [-5.2, 5.8]], 0.55, 0.3); B.press([[doorX, HZ + 1], [4.1, 1.4]], 0.5, 0.3); B.press([[doorX, HZ + 1], [6.6, 5.4]], 0.5, 0.3); B.press([[doorX, HZ + 1], [3.8, 4.6]], 0.45, 0.3);
    B.press([[-6, 9.5], [-1.5, 10.5]], 0.55, 0.3); B.press([[1.4, 14], [3.4, 14]], 0.9, 0.3); B.press([[4.9, 3.4], [6.2, 4.4], [6.7, 5.5]], 0.5, 0.3);
    w.pressSnow(B.wx(2, 6.5), B.wz(2, 6.5), 12, 0.35);
  } catch (e) { }
  // the generator by the east wall, with its exhaust, cables to the wall and cans beside it
  const gx = 4.2, gz = 0.2, gy = Y(gx, gz), gen = new T.Group(); gen.position.set(gx, gy, gz); gen.rotation.y = 0.15; g.add(gen);
  box(1.05, 0.1, 0.62, m.dgrey, 0, 0.1, 0, 0, 0, 0, gen); for (const sx of [-0.45, 0.45]) for (const sz of [-0.25, 0.25]) box(0.07, 0.12, 0.07, m.rubber, sx, 0.04, sz, 0, 0, 0, gen);
  box(0.9, 0.52, 0.5, m.green, -0.02, 0.42, 0, 0, 0, 0, gen); box(0.4, 0.16, 0.3, m.red, -0.2, 0.76, 0, 0, 0, 0, gen); cyl(0.04, 0.04, 0.05, m.dgrey, -0.2, 0.86, 0, 0, 0, 0, gen, 8); box(0.3, 0.3, 0.02, m.dgrey, 0.2, 0.42, 0.26, 0, 0, 0, gen);
  for (const sx of [-0.4, 0.4]) cyl(0.015, 0.015, 0.55, m.steel, sx, 0.66, 0.3, 0, 0, 0, gen, 6); box(0.82, 0.02, 0.02, m.steel, 0, 0.93, 0.3, 0, 0, 0, gen); cyl(0.09, 0.09, 0.3, m.steel, 0.58, 0.45, 0, 0, 0, PI / 2, gen, 10); cyl(0.032, 0.032, 1.5, m.steel, 0.68, 1.2, 0, 0, 0, 0, gen, 8); cyl(0.05, 0.05, 0.09, m.dgrey, 0.68, 1.97, 0, 0, 0, 0, gen, 8);
  B.pts.genOut = { lx: gx + 0.68 * Math.cos(0.15), ly: gy + 2.0, lz: gz - 0.68 * Math.sin(0.15) }; B.pts.gen = [gx, gz]; B.rest("generator", gen, B.y0 + gy);
  box(1.0, 0.05, 0.05, m.rubber, 3.3, Y(3.3, gz - 0.2) + 0.04, gz - 0.2, 0, 0.15, 0, g); box(0.05, 0.05, 0.9, m.rubber, 2.9, Y(2.9, gz - 0.6) + 0.04, gz - 0.6, 0, 0, 0, g);
  B.ob(gx, gz, 0.85);
  const cans = [[5.35, 0.25, 0.3, m.red], [5.7, 0.8, -0.2, m.red], [5.25, 1.15, 0.7, m.yel]]; B.parts.cans = cans.map(c => jerry(B, c[0], c[1], c[2], c[3])); B.pts.cans = [5.0, 1.55];
  // fuel cans and a tub by the van, bin bags near the dog, the oil-drum fire
  B.parts.cans2 = [jerry(B, -4.55, 6.9, 0.9, m.red), jerry(B, -4.35, 7.3, -0.4, m.yel)];
  B.parts.bags = []; for (let i = 0; i < 9; i++) { const bx = 5.7 + (R() - 0.5) * 1.5 + (i % 3) * 0.1, bz = 3.0 + (R() - 0.5) * 1.1 + Math.floor(i / 3) * 0.35, br = 0.24 + R() * 0.09, b = bagMesh(g, br); b.position.set(bx, Y(bx, bz) - 0.03 - 0.18 * br + (i > 5 ? 0.3 : 0), bz); b.rotation.y = R() * 6; B.parts.bags.push(b); if (i <= 5) B.rest("bag", b, B.y0 + Y(bx, bz)); }
  B.pts.bags = [5.0, 4.05]; B.ob(5.7, 3.1, 1.0);
  const dx2 = 6.9, dz2 = 4.7, dy = Y(dx2, dz2), drum = new T.Group(); drum.position.set(dx2, dy - 0.03, dz2); g.add(drum);
  const db = new T.Group(); drum.add(db); cyl(0.31, 0.29, 0.9, m.rust, 0, 0.45, 0, 0, 0, 0, db, 16); for (const yy of [0.18, 0.5, 0.82]) cyl(0.322, 0.322, 0.04, m.dgrey, 0, yy, 0, 0, 0, 0, db, 16); for (let i = 0; i < 8; i++) box(0.05, 0.03, 0.02, m.black, Math.cos(i * 0.785) * 0.3, 0.12, Math.sin(i * 0.785) * 0.3, 0, -i * 0.785, 0, db);
  cyl(0.27, 0.27, 0.03, m.glow, 0, 0.84, 0, 0, 0, 0, drum, 14); const fl = []; for (let i = 0; i < 4; i++) { const f = cyl(0, 0.13 - i * 0.015, 0.5 + (i % 2) * 0.2, i % 2 ? m.glow2 : m.glow, Math.cos(i * 1.7) * 0.1, 1.05, Math.sin(i * 1.7) * 0.1, 0, 0, 0, drum, 8); fl.push(f); }
  const fg = sprite(drum, 0, 1.3, 0, 4.2, 0xff8a30); const fg2 = new T.Mesh(new T.CircleGeometry(4.2, 24), new T.MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false })); fg2.rotation.x = -PI / 2; fg2.position.y = 0.2; drum.add(fg2);
  B.parts.drum = { grp: drum, fl, fg, fg2, top: { lx: dx2, ly: dy - 0.03 + 0.95, lz: dz2 } }; B.rest("drum", db, B.y0 + dy); B.pts.drum = [dx2, dz2 - 1.15]; B.ob(dx2, dz2, 0.6);
  B.anim.push((dt, t, ctx) => { const D = B.parts.drum, f = 0.85 + Math.sin(t * 9.1) * 0.1 + Math.sin(t * 15.7) * 0.06; D.fl.forEach((q, i) => { q.scale.set(1 + Math.sin(t * 11 + i) * 0.15, 0.8 + f * 0.4 + Math.sin(t * 13 + i * 2) * 0.25, 1); q.position.y = 0.9 + q.scale.y * 0.22; });
    D.fg.material.opacity = (0.22 + ctx.dark * 0.7) * f; D.fg2.material.opacity = ctx.dark * 0.32 * f; D.fg.scale.setScalar(3.2 + f);
    if (ctx.near && Math.random() < dt * 5) { const p = B.pt(D.top.lx, D.top.lz); smoke(p.x + (Math.random() - 0.5) * 0.2, B.y0 + D.top.ly + 0.2, p.z + (Math.random() - 0.5) * 0.2, 0.15 + Math.random() * 0.1, 0.9 + Math.random() * 0.5, 0.1, 0.5, 2.6, 0x55585c, 0.5); } });
  // the dog's kennel and stake
  const kx = 3.7, kz = 3.4, ky = Y(kx, kz), ken = new T.Group(); ken.position.set(kx, ky - 0.03, kz); ken.rotation.y = 0.15; g.add(ken);
  box(0.8, 0.62, 1.0, m.wood, 0, 0.31, 0, 0, 0, 0, ken); box(0.5, 0.45, 0.04, m.black, 0, 0.26, 0.5, 0, 0, 0, ken); for (const s of [-1, 1]) box(0.6, 0.05, 1.18, m.woodD, s * 0.28, 0.7, 0, 0, 0, -s * 0.5, ken); box(0.5, 0.1, 1.2, m.snow, 0, 0.9, 0, 0, 0, 0, ken); B.rest("kennel", ken, B.y0 + ky); B.ob(kx, kz, 0.7);
  B.pts.stake = [3.5, 5.7]; B.pts.dogHome = [3.7, 4.55]; const sy = Y(3.5, 5.7); cyl(0.03, 0.03, 0.5, m.dgrey, 3.5, sy + 0.2, 5.7, 0, 0, 0, g, 6);
  // the van, snowed in (nose away from the barn, tail doors toward it, wheels sunk to the snow line)
  buildVan(B, -8.8, 6.5, -1.35, R);
  B.pts.look = [2.05, 4.95]; B.pts.phoneA = [-5.4, 9.6]; B.pts.phoneB = [-1.4, 10.8]; B.pts.shovel = [2.2, 14]; B.pts.drop = [-0.4, 5.55];
  // the beacon at the door (hidden: the door is locked until A2b), and the room behind it
  B.roomId = "grow-" + site.id; const bp = B.pt(doorX, HZ + 1.55);
  const idx = Math.max(0, (parseInt(site.id.split("-")[1], 10) || 1) - 1), wk = parseInt(site.id.slice(1), 10) || 0;
  try { B.beacon = api.intAdd({ id: B.roomId, name: "the grow barn", x: bp.x, z: bp.z, ry: site.ry, jig: [-90 - idx * 40, 160 + (wk % 5) * 30], door: "The barn door", col: 0xb060ff, build: (R2, K2) => growRoom(R2, K2, site), hint: () => "The barn · walk into the doorway to go out", enter: () => api.toast("Warm, damp and bright: the air is thick with the smell of the plants. Nobody is in here yet.") }); B.beacon.g.visible = !!site.testOpen; } catch (e) { console.error("tlx-raids beacon", e); }
  // the night: the purple strips and glows, by darkness and distance
  B.night.push(ctx => { const op = ctx.dark * (1 - sstep(260, 800, ctx.d)); m.leak.opacity = Math.max(m.leak.opacity, 0); for (const q of B.leaks) q.visible = op > 0.02; B.leakOp = op; });
}
function buildVan(B, vx, vz, th, R) {
  const M = api.mesh, box = M.box, cyl = M.cyl, ball = M.ball, m = mats(), g = B.g, PI = Math.PI, co = Math.cos(th), si = Math.sin(th);
  const W2 = (ox, oz) => [vx + ox * co + oz * si, vz - ox * si + oz * co];
  const wh = [[-0.95, 1.55], [0.95, 1.55], [-0.95, -1.45], [0.95, -1.45]].map(p => ({ ox: p[0], oz: p[1], y: B.Y(...W2(p[0], p[1])) }));
  const yv = wh.reduce((a, q) => a + q.y, 0) / 4, van = new T.Group(); van.position.set(vx, yv, vz); van.rotation.y = th; g.add(van); B.parts.van = van;
  const paint = M.std(0xc9cdd0, 0.55, 0.15), dirt = M.std(0x8d9296, 0.8, 0.1);
  box(1.95, 1.62, 3.5, paint, 0, 1.12, -0.7, 0, 0, 0, van); box(1.96, 0.5, 3.5, dirt, 0, 0.5, -0.7, 0, 0, 0, van);                   // the cargo body and its dirty skirt
  box(1.9, 0.62, 1.7, paint, 0, 0.72, 1.85, 0, 0, 0, van); box(1.9, 0.8, 1.15, paint, 0, 1.43, 0.95, 0, 0, 0, van);                 // bonnet, cab
  const ws = box(1.78, 0.75, 0.05, m.glass, 0, 1.45, 1.55, -0.62, 0, 0, van);
  for (const s of [-1, 1]) { box(0.04, 0.55, 1.0, m.glass, s * 0.96, 1.5, 0.95, 0, 0, 0, van); box(0.04, 0.5, 0.06, m.red, s * 0.97, 1.0, -2.42, 0, 0, 0, van).position.z = -2.45; box(0.22, 0.14, 0.04, m.yel, s * 0.7, 0.62, 2.7, 0, 0, 0, van); }
  box(2.04, 0.2, 0.28, m.dgrey, 0, 0.42, 2.75, 0, 0, 0, van); box(2.04, 0.2, 0.28, m.dgrey, 0, 0.42, -2.5, 0, 0, 0, van);
  box(0.5, 0.18, 0.04, m.white, 0, 0.66, 2.74, 0, 0, 0, van); box(1.9, 0.28, 0.06, m.dgrey, 0, 0.9, 2.66, 0, 0, 0, van);
  box(1.7, 0.2, 3.3, m.snow, 0, 1.97, -0.72, 0, 0, 0, van); box(1.7, 0.16, 1.1, m.snow, 0, 1.88, 0.98, 0, 0, 0, van); box(1.6, 0.12, 1.5, m.snow, 0, 1.1, 1.85, 0, 0, 0, van).position.y = 1.1;
  // the rear doors: one open, a dark hold with the tubs in it
  box(1.6, 1.4, 0.04, m.black, 0, 1.15, -2.46, 0, 0, 0, van); const rd = new T.Group(); rd.position.set(0.97, 1.15, -2.49); rd.rotation.y = -1.7; van.add(rd); box(0.92, 1.5, 0.05, paint, -0.46, 0, 0, 0, 0, 0, rd);
  const rd2 = new T.Group(); rd2.position.set(-0.97, 1.15, -2.49); rd2.rotation.y = 0.0; van.add(rd2); box(0.92, 1.5, 0.05, paint, 0.46, 0, 0, 0, 0, 0, rd2);
  for (let i = 0; i < 3; i++) { const t = tubMesh(van); t.position.set(-0.4 + (i % 2) * 0.7, 0.62, -2.0 + (i > 1 ? 0.5 : 0)); t.scale.setScalar(1); }
  // wheels: each at its own spot on the snow, the bottom of the tyre 22 cm under the surface
  B.parts.wheels = [];
  wh.forEach(q => { const grp = new T.Group(); grp.position.set(q.ox, q.y - yv + 0.14, q.oz); van.add(grp); cyl(0.36, 0.36, 0.24, m.rubber, 0, 0, 0, 0, 0, PI / 2, grp, 18); cyl(0.2, 0.2, 0.26, m.steel, 0, 0, 0, 0, 0, PI / 2, grp, 10); cyl(0.05, 0.05, 0.28, m.dgrey, 0, 0, 0, 0, 0, PI / 2, grp, 6);
    B.parts.wheels.push(grp); B.rest("wheel", grp, B.y0 + q.y, "wheel"); });
  B.rest("van", van, B.y0 + yv, "van");
  // snow banked against it
  for (const s of [-1, 1]) for (let z = -2.6; z <= 2.8; z += 1.15) ball(0.5 + R() * 0.12, m.snow, s * (1.18 + R() * 0.12), B.Y(...W2(s * 1.2, z)) - yv + 0.1, z, van, 1.0, 0.6, 1.5);
  for (const z of [3.0]) ball(0.6, m.snow, 0, B.Y(...W2(0, z)) - yv + 0.12, z, van, 1.8, 0.6, 1.0);
  const p = W2(0, -3.4); B.pts.pick = [W2(-0.2, -3.7)[0], W2(-0.2, -3.7)[1]]; B.pts.vanRear = [W2(0, -2.55)[0], W2(0, -2.55)[1]];
  B.ob(...W2(0, 1.6), 1.45); B.ob(...W2(0, -0.2), 1.5); B.ob(...W2(0, -1.7), 1.4);
  // the pile of tubs on the snow behind the doors
  B.parts.pile = []; for (let i = 0; i < 3; i++) { const t = tubMesh(g), pp = W2(0.1 + (i % 2) * 0.62, -3.15 - Math.floor(i / 2) * 0.3), y = B.Y(pp[0], pp[1]); t.position.set(pp[0], y - 0.02, pp[1]); t.rotation.y = th + 0.1 * i; B.parts.pile.push(t); B.rest("tub", t, B.y0 + y); }
}
KINDS.grow = { name: "grow barn", short: "barn", roster: ["look", "carA", "carB", "shov", "phone"], build: buildGrow, tag: "grow barn" };

/* ---------------- the crew: figures ---------------- */
const JK = [0x2a2f36, 0x3b3a30, 0x4a4036, 0x2d3a3a, 0x55504a, 0x1f2a3a, 0x40302a];
const FIGPOOL = [];                                             // walkers kept between sites (a rig is the dear part)
let V1 = null, V2 = null, V3 = null;
function person(seed, role) {
  let g = FIGPOOL.pop(); const std = api.mesh.std, r = rng(seed);
  if (!g) { g = api.newWalker({ jacket: std(JK[seed % JK.length], 0.85, 0), pants: std(0x23272e, 0.9, 0), trim: std(0x8e9398, 0.7, 0) }); g.scale.setScalar(1); api.scene.add(g); }
  else { const U = g.userData; U.arms.forEach(a => a.rotation.set(0, 0, 0)); }
  g.userData.raidRole = role; g.visible = false; const sc = 0.84 + r() * 0.08; g.scale.setScalar(sc);
  const hk = g.userData.headKit; if (hk) { for (const n in hk) for (const q of hk[n]) q.visible = false; for (const q of (role === "look" && hk.mask ? hk.mask : hk.beanie || hk.helmet)) q.visible = true; }
  return { g, sc };
}
function mkFig(site, role, seed) {
  const P = person(seed, role);
  return { site, role, g: P.g, sc: P.sc, o: { x: 0, z: 0, yaw: 0, tired: 0.05, hard: true, crouch: 0 }, v: 0, vmax: 1.3, path: [], hold: 0, t: 0, turn: 2.4, st: "in", stT: 0, inside: true, cr: 0, pz: {}, cb: null, seed, tub: null, prop: null, wob: 0 };
}
function freeFig(f) {
  if (f.R) { api.scene.remove(f.R.g); f.R = null; }
  if (f.g) { f.g.visible = false; if (f.g.userData.shovel) { api.scene.remove(f.g.userData.shovel); f.g.userData.shovel = null; } if (f.phoneM) { f.phoneM.parent && f.phoneM.parent.remove(f.phoneM); f.phoneM = null; } if (f.cig) { f.cig.parent && f.cig.parent.remove(f.cig); f.cig = null; } FIGPOOL.push(f.g); f.g = null; }
  if (f.dog) { try { api.gram.quad.free(f.dog); } catch (e) { } f.dog.g.visible = false; f.dog.g.parent && f.dog.g.parent.remove(f.dog.g); }
  if (f.chain) for (const c of f.chain) c.parent && c.parent.remove(c);
}
function freeCrew(site) {
  const C = site.C; if (!C) return;
  for (const f of C.figs) { if (f.tub && f.tub.parent) f.tub.parent.remove(f.tub); if (f.prop && f.prop.parent) f.prop.parent.remove(f.prop); freeFig(f); }
  for (const t of C.tubs || []) t.parent && t.parent.remove(t);
  if (C.shovelHeap) C.shovelHeap.parent && C.shovelHeap.parent.remove(C.shovelHeap);
  site.C = null;
}
const fp = (f, x, y, z, out) => { const sc = f.sc, c = Math.cos(f.o.yaw), s = Math.sin(f.o.yaw); return (out || new T.Vector3()).set(f.o.x + (c * x + s * z) * sc, f.o.y + y * sc, f.o.z + (-s * x + c * z) * sc); };
// two-bone arm to a world point (the shoulder is at (+-0.21, 0.53) in the torso's own space; the upper arm .25, the forearm to the wrist .285), blended by w over what the walker pose left
function handIK(f, i, p, w) {
  const U = f.g.userData, a = U.arms[i], fo = U.fore[i], tor = U.torso; if (w <= 0) return;
  V3.copy(p); tor.worldToLocal(V3); const sx = i ? 1 : -1, dx = V3.x - sx * 0.21, dy = V3.y - 0.53, dz = V3.z, l1 = 0.25, l2 = 0.285;
  const Lr = Math.hypot(dx, dy, dz), L = clamp(Lr, 0.14, (l1 + l2) * 0.995);
  const pp = Math.atan2(Math.hypot(dx, dz), -dy), al = Math.acos(clamp((l1 * l1 + L * L - l2 * l2) / (2 * l1 * L), -1, 1)), ga = Math.acos(clamp((l1 * l1 + l2 * l2 - L * L) / (2 * l1 * l2), -1, 1));
  const ax = -(pp - al), ay = Math.atan2(dx, dz), fx = -(Math.PI - ga);
  a.rotation.set(lerp(a.rotation.x, ax, w), lerp(a.rotation.y, Math.hypot(dx, dz) < 0.02 ? 0 : ay, w), lerp(a.rotation.z, 0, w)); fo.rotation.set(lerp(fo.rotation.x, fx, w), 0, 0);
}
function handPos(f, i, out) { const hd = f.g.userData.fore[i].userData.hand; return hd.getWorldPosition(out || V2); }
function headLook(f, tx, tz, w) {
  const U = f.g.userData, want = wrap(Math.atan2(tx - f.o.x, tz - f.o.z) - f.o.yaw - U.torso.rotation.y); U.head.rotation.y = lerp(U.head.rotation.y, clamp(want, -1.15, 1.15), w);
}
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
// level of detail: the figure kit is ~70 meshes a man; past ~55 m the small parts (fingers, buckles, straps: under 7 cm) are not seen, so they are not drawn, and they never cast a shadow
// level of detail: the figure kit is ~70 meshes a man; past ~55 m the small parts (fingers, buckles, straps: under 7 cm) are not seen, so they are not drawn, and they never cast a shadow
// merge a figure's loose leaf meshes: the kit has ~70 meshes a man, many of them small parts sharing a material under one bone; fusing the ones that share a parent and a
// material (no name, no userData, one material, no children) keeps the pose and the look and cuts the draw calls
function mergeLeaves(root) {
  let before = 0, after = 0; root.traverse(m => { if (m.isMesh) before++; });
  const nodes = []; root.traverse(n => { if (n.children.length) nodes.push(n); });
  for (const n of nodes) {
    const buckets = new Map();
    for (const c of n.children.slice()) {
      if (!c.isMesh || c.isSkinnedMesh || c.children.length || c.name || Object.keys(c.userData).length || Array.isArray(c.material) || !c.visible || !c.geometry || !c.geometry.attributes.position) continue;
      const k = c.material.uuid + (c.castShadow ? "s" : "n") + (c.receiveShadow ? "r" : "n") + (c.geometry.attributes.uv ? "u" : "x") + (c.geometry.attributes.normal ? "n" : "x"); (buckets.get(k) || buckets.set(k, []).get(k)).push(c);
    }
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      const P = [], N = [], U = [], I = []; let off = 0, ok = true; const hasU = !!list[0].geometry.attributes.uv, hasN = !!list[0].geometry.attributes.normal;
      for (const c of list) {
        c.updateMatrix(); const g = c.geometry.clone(); g.applyMatrix4(c.matrix); const p = g.attributes.position, cnt = p.count;
        for (let i = 0; i < cnt; i++) P.push(p.getX(i), p.getY(i), p.getZ(i));
        if (hasN) { const q = g.attributes.normal; for (let i = 0; i < cnt; i++) N.push(q.getX(i), q.getY(i), q.getZ(i)); }
        if (hasU) { const q = g.attributes.uv; for (let i = 0; i < cnt; i++) U.push(q.getX(i), q.getY(i)); }
        if (g.index) { for (let i = 0; i < g.index.count; i++) I.push(g.index.getX(i) + off); } else for (let i = 0; i < cnt; i++) I.push(i + off);
        off += cnt; g.dispose();
      }
      const G = new THREE.BufferGeometry(); G.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); if (hasN) G.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); if (hasU) G.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); G.setIndex(I);
      const M = new THREE.Mesh(G, list[0].material); M.castShadow = list[0].castShadow; M.receiveShadow = list[0].receiveShadow; M.frustumCulled = false; M.userData.merged = true;
      for (const c of list) n.remove(c); n.add(M);
    }
  }
  root.traverse(m => { if (m.isMesh) after++; });
  return [before, after];
}
function figLod(f) {
  const g = f.g; if (!g) return;
  if (!f.lodList) { g.updateMatrixWorld(true); f.lodList = []; g.traverse(m => { if (!m.isMesh || !m.geometry) return; if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); const sc = m.getWorldScale(V1 ? V1 : new THREE.Vector3()).x; f.lodList.push({ m, small: m.geometry.boundingSphere.radius * sc < 0.07, sh: m.castShadow }); }); f.lodFar = null; }
  const e = api.camera.position, d = Math.hypot(f.o.x - e.x, f.o.z - e.z), far = d > 45;
  if (far !== f.lodFar) { f.lodFar = far; for (const q of f.lodList) { q.m.castShadow = q.sh && !far; if (q.small) { if (far) { q.v = q.m.visible; q.m.visible = false; } else q.m.visible = q.v !== false; } } }
}
function figMove(f, dt) {
  const o = f.o; if (f.hold > 0) f.hold -= dt; let vt = 0;
  if (f.path.length && f.hold <= 0) {
    const tx = f.path[0], dx = tx[0] - o.x, dz = tx[1] - o.z, dd = Math.hypot(dx, dz);
    if (dd < (f.path.length > 1 ? 0.55 : 0.18)) { f.path.shift(); if (!f.path.length && f.cb) { const cb = f.cb; f.cb = null; cb(f); } }
    else {
      let want = Math.atan2(dx, dz); if (f.wob) want += Math.sin(f.t * 1.1) * f.wob;
      const dy = wrap(want - o.yaw), rate = f.turn || 2.4; o.yaw = wrap(o.yaw + clamp(dy, -rate * dt, rate * dt));
      vt = f.vmax * (Math.abs(dy) > 0.8 ? 0.2 : 1) * (f.path.length === 1 ? clamp(dd / 1.6, 0.3, 1) : 1);
    }
  }
  f.v = approach(f.v, vt, (vt > f.v ? 1.6 : 3.0) * dt);
  if (f.v > 0.02) { o.x += Math.sin(o.yaw) * f.v * dt; o.z += Math.cos(o.yaw) * f.v * dt; }
  f.t += dt; f.stT += dt;
}
const turnTo = (f, x, z, dt, rate) => { const dy = wrap(Math.atan2(x - f.o.x, z - f.o.z) - f.o.yaw); f.o.yaw = wrap(f.o.yaw + clamp(dy, -(rate || 1.8) * dt, (rate || 1.8) * dt)); return Math.abs(dy); };
const faceYaw = (f, yaw, dt, rate) => { const dy = wrap(yaw - f.o.yaw); f.o.yaw = wrap(f.o.yaw + clamp(dy, -(rate || 1.8) * dt, (rate || 1.8) * dt)); return Math.abs(dy); };
function go(f, pts, cb, vmax) { f.path = pts.map(p => p.slice()); f.cb = cb || null; f.hold = 0; if (vmax) f.vmax = vmax; }
function setSt(f, st) { f.st = st; f.stT = 0; }
function drawFig(f, dt) {
  const o = f.o, g = f.g; if (!g) return;
  o.crouch = f.cr; g.visible = true;
  api.walkAs(g, o, dt); g.updateMatrixWorld(true);
  const U = g.userData, z = f.pz;
  // loads on the torso: a tub in both arms leans the body back; a bend to the ground tips the torso further
  if (z.lean) { U.torso.rotation.x += z.lean; U.head.rotation.x -= z.lean * 0.6; }
  if (z.twist) U.torso.rotation.y += z.twist;
  g.updateMatrixWorld(true);
  if (z.hands) for (let i = 0; i < 2; i++) { const h = z.hands[i]; if (h) handIK(f, i, h.p, h.w === undefined ? 1 : h.w); }
  if (z.look) headLook(f, z.look.x, z.look.z, z.look.w === undefined ? 1 : z.look.w);
  g.updateMatrixWorld(true);
}

/* ---------------- the crew: a site's crew, their day and their reactions ---------------- */
const hourNow = () => ((api.GS.hour % 24) + 24) % 24;
const inH = (h, a, b) => a <= b ? h >= a && h < b : h >= a || h < b;
// who is out of doors at this hour (the rest are inside, asleep, at the plants, in the van's cab...): the daily routine
const SCHED = {
  look: () => true, carA: h => inH(h, 6.5, 21), carB: h => inH(h, 7, 21.5), shov: h => inH(h, 7, 17) || inH(h, 17.5, 4.5), phone: h => inH(h, 9, 23.5),
  rider: h => inH(h, 19, 2) || inH(h, 11, 14.5)
};
const routineOf = (role, h) => role === "shov" ? (inH(h, 7, 17) ? "shovel" : "burn") : role === "phone" ? "phone" : role === "look" ? "smoke" : role === "rider" ? "idle" : "carry";
const doorPt = B => B.pt(B.pts.door[0], B.pts.door[1] - 0.45);
const inPt = B => B.pt(B.pts.door[0], B.pts.door[1] - 0.95);
function emerge(f, B) { const p = B.pt(B.pts.door[0], B.pts.door[1] - 0.72); f.o.x = p.x; f.o.z = p.z; f.o.yaw = B.site.ry; f.o.px = undefined; f.inside = false; f.v = 0; f.cr = 0; if (f.g) f.g.visible = true; B.door.target = 1; B.door.hold = 2.4; }
function goIn(f, B, cb, v) {
  const d = doorPt(B), i = inPt(B); go(f, [[d.x, d.z], [i.x, i.z]], () => { f.inside = true; if (f.g) f.g.visible = false; B.door.hold = Math.max(B.door.hold || 0, 1.2); f.st = "in"; f.stT = 0; if (cb) cb(f); }, v || 1.6);
  f.passing = true;
}
function dropProp(f, B) {
  if (f.tub) { const T2 = f.tub, p = fp(f, 0, 0, 0.55); T2.position.set(p.x, W().surf(p.x, p.z) + 0.17, p.z); T2.rotation.set(0, f.o.yaw, 0); if (T2.parent !== api.scene) api.scene.add(T2); T2.userData.state = "stack"; T2.userData.age = 0; f.tub = null; }
  if (f.prop && f.prop.userData.bag) { f.prop.visible = false; f.prop = null; }
  f.pz = {};
}

/* a crew member's step: ctx = { B, site, lvl, pl: {x, z}, dP: distance to the door, dt, hour, los } */
const ROLE = {};
// the look-out smokes by the door, turns to watch you the whole way past, walks out to warn you off, goes in last when it is barred
ROLE.look = {
  start(f, c) { setSt(f, "post"); },
  step(f, dt, c) {
    const B = c.B, p = c.pl, lvl = c.lvl, post = B.pt(...B.pts.look), door = doorPt(B);
    f.pz = {};
    if (f.inside) { if (lvl === 0 && c.calm > 1.5 && !B.door.barred) { emerge(f, B); go(f, [[post.x, post.z]], f2 => setSt(f2, "post"), 1.4); setSt(f, "return"); } return; }
    if (lvl >= 4 && f.st !== "bar") { setSt(f, "bar"); f.waitIn = 1.8; }
    else if (lvl === 3 && (f.st === "post" || f.st === "return")) { setSt(f, "warn"); f.path = []; f.warned = false; }
    else if (lvl <= 2 && (f.st === "warn" || f.st === "bar")) { setSt(f, "return"); go(f, [[post.x, post.z]], f2 => setSt(f2, "post"), 1.5); }
    else if (lvl === 0 && f.st === "warn") { setSt(f, "return"); go(f, [[post.x, post.z]], f2 => setSt(f2, "post"), 1.4); }
    if (f.st === "post") {
      // by the wall: the arm up to the mouth now and again; turns to watch you once you are noticed
      const sees = lvl >= 1 && c.los;
      if (sees) turnTo(f, p.x, p.z, dt, 1.5); else faceYaw(f, B.site.ry + Math.sin(f.t * 0.23) * 0.55 + 0.1, dt, 0.6);
      const ph = (f.t % 7.5), up = ph < 1.7 ? Math.sin(Math.PI * clamp(ph / 1.7, 0, 1)) ** 0.5 : 0;
      f.pz.hands = [{ p: fp(f, -0.02, 1.5, 0.15), w: clamp(up * 1.15, 0, 1) }, null]; f.pz.look = sees ? { x: p.x, z: p.z } : { x: f.o.x + Math.sin(f.o.yaw + Math.sin(f.t * 0.5) * 0.6) * 5, z: f.o.z + Math.cos(f.o.yaw + Math.sin(f.t * 0.5) * 0.6) * 5, w: 0.7 };
      if (up > 0.9 && !f.puffed) { f.puffed = true; f.puffAt = f.t + 0.6; } if (up < 0.3) f.puffed = false;
      if (f.puffAt && f.t > f.puffAt) { f.puffAt = 0; const h = fp(f, -0.05, 1.5, 0.2); smoke(h.x, h.y, h.z, Math.sin(f.o.yaw) * 0.2, 0.35, Math.cos(f.o.yaw) * 0.2, 0.22, 2.2, 0xb8bcc0, 0.4); }
    } else if (f.st === "warn") {
      const dd = Math.hypot(p.x - door.x, p.z - door.z), want = clamp(dd - 15, 5, 22), dx = (p.x - door.x) / (dd || 1), dz = (p.z - door.z) / (dd || 1), tx = door.x + dx * want, tz = door.z + dz * want;
      const at = Math.hypot(f.o.x - tx, f.o.z - tz);
      if (at > 2.5 && !f.stand) { f.path = [[tx, tz]]; f.vmax = 1.9; } else { f.path = []; f.stand = true; }
      if (at > 5) f.stand = false;
      turnTo(f, p.x, p.z, dt, 2.2); f.pz.look = { x: p.x, z: p.z };
      if (!f.path.length) {
        f.shoutT = (f.shoutT || 0) - dt; const raise = f.shoutT > -0.1 ? 1 : 0;
        if (f.shoutT <= 0 && !f.handUp) { f.handUp = 3.2; f.shoutT = 13; const L = WARN_LINES[Math.floor(f.seed % 97 + f.warnN++) % WARN_LINES.length]; api.toast(`The man by the barn shouts: "${L}"`, "warn"); c.site.shouted = (c.site.shouted || 0) + 1; }
      }
      if (f.handUp > 0) { f.handUp -= dt; const k = Math.min(1, f.handUp / 0.4, (3.2 - f.handUp) / 0.45); f.pz.hands = [{ p: fp(f, -0.2, 1.88, 0.3), w: clamp(k, 0, 1) }, null]; }
    } else if (f.st === "bar") {
      f.pz.look = { x: p.x, z: p.z }; f.waitIn -= dt;
      if (f.waitIn <= 0 && !f.path.length && !f.inside) { const n = c.site.C.figs.filter(q => q !== f && q.role !== "dog" && q.role !== "rider" && !q.inside).length; if (n === 0 || f.waitIn < -4) { goIn(f, B, ff => { B.door.barred = true; B.door.target = 0; B.door.bar.visible = true; c.site.barredAt = api.GS.hour; }, 2.1); f.vmax = 2.1; } }
      if (f.waitIn > 0) turnTo(f, p.x, p.z, dt, 2);
    }
    if (f.st === "return" && !f.path.length) setSt(f, "post");
    if (f.st === "post" || f.st === "return") { if (!f.path.length) { const dp = Math.hypot(f.o.x - post.x, f.o.z - post.z); if (dp > 1.2) go(f, [[post.x, post.z]], f2 => setSt(f2, "post"), 1.4); } }
  }
};
const WARN_LINES = ["Hei! Det er privat her. Snu rundt!", "Stopp der! Her har du ingenting å gjøre!", "Hallo! Vi vil ikke ha folk her. Kjør videre.", "Du! Ja, du. Snu, og kjør hjem!", "Her er det ikke noe å se på. Forsvinn!", "Privat eiendom! Gå tilbake dit du kom fra!"];
// the tub carriers: van -> barn, both hands on a sealed tub, set it down at the door, back for the next
ROLE.carry = {
  step(f, dt, c) {
    const B = c.B, lvl = c.lvl, i = f.role === "carA" ? 0 : 1; f.pz = {}; const sc = f.sc;
    const pickAt = B.pt(B.pts.pick[0] - 0.05, B.pts.pick[1]), dropAt = B.pt(B.pts.drop[0] + i * 0.75, B.pts.drop[1]);
    const tub = f.tub, holdTub = () => { if (!tub) return; const w2 = fp(f, 0, 1.12, 0.34); tub.position.copy(w2).add(V1.set(0, -0.2, 0)); tub.rotation.set(0, f.o.yaw, 0); f.pz.hands = [{ p: fp(f, -0.34, 1.1, 0.33) }, { p: fp(f, 0.34, 1.1, 0.33) }]; f.pz.lean = -0.1; };
    const useTub = () => { if (!f.tub) { f.tub = takeTub(c.site.C); if (f.tub.parent !== api.scene) api.scene.add(f.tub); } return f.tub; };
    if (f.inside) { if (lvl === 0 && c.calm > 2.5 + i * 2 && !B.door.barred && SCHED[f.role](c.hour)) { emerge(f, B); setSt(f, "toVan"); go(f, [pickAt.x ? [pickAt.x, pickAt.z] : [0, 0]], f2 => setSt(f2, "pick"), 1.25); } return; }
    if (!SCHED[f.role](c.hour) && !f.tub && f.st !== "bar" && f.st !== "in") { setSt(f, "bar"); goIn(f, B, null, 1.3); return; }
    if (lvl >= 4 && f.st !== "bar") { if (f.tub) dropProp(f, B); setSt(f, "bar"); goIn(f, B, null, 2.1); return; }
    if (lvl >= 2 && f.st !== "bar" && f.st !== "pause" && f.st !== "setdown") {
      if (f.role === "carB" && lvl >= 3 && !f.tub) { setSt(f, "bar"); goIn(f, B, null, 1.7); return; }
      if (f.tub) { f.path = []; f.cb = null; setSt(f, "setdown"); f.setAt = f.o.x; } else { f.path = []; f.cb = null; setSt(f, "pause"); }
    }
    if (f.st === "pause") { f.pz.look = { x: c.pl.x, z: c.pl.z }; turnTo(f, c.pl.x, c.pl.z, dt, 1.2); if (lvl === 0 && c.calm > 3) { setSt(f, "toVan"); go(f, [[pickAt.x, pickAt.z]], f2 => setSt(f2, "pick"), 1.25); } return; }
    f.pz.look = lvl >= 1 ? { x: c.pl.x, z: c.pl.z, w: 0.8 } : null;
    switch (f.st) {
      case "toVan": if (!f.path.length) go(f, [[pickAt.x, pickAt.z]], f2 => setSt(f2, "pick"), 1.25); break;
      case "pick": {
        const t = f.stT, tb = useTub(), pile = B.parts.pile[i] || B.parts.pile[0];
        if (t < 0.5) { faceYaw(f, Math.atan2(pile.position.x - f.o.x, pile.position.z - f.o.z), dt, 3); f.cr = approach(f.cr, 0.95, dt * 2.2); tb.position.copy(pile.position).add(V1.set(0, 0.2, 0)); tb.rotation.y = f.o.yaw; f.pz.hands = [{ p: V2.copy(tb.position).add(V1.set(-0.34, 0.1, 0)).clone() }, { p: V3.copy(tb.position).add(V1.set(0.34, 0.1, 0)).clone() }]; }
        else if (t < 1.35) { f.cr = approach(f.cr, 0.9, dt); const u = sstep(0.5, 1.35, t), w2 = fp(f, 0, 1.12, 0.34); tb.position.set(lerp(pile.position.x, w2.x, u), lerp(pile.position.y + 0.2, w2.y - 0.2, u) + Math.sin(Math.PI * u) * 0.12, lerp(pile.position.z, w2.z, u)); tb.rotation.y = f.o.yaw; f.pz.hands = [{ p: fp(f, -0.34, 1.1, 0.33) }, { p: fp(f, 0.34, 1.1, 0.33) }]; f.cr = approach(f.cr, 0.0, dt * (u > 0.4 ? 1.2 : 0)); f.pz.lean = -0.1 * u; }
        else { f.cr = approach(f.cr, 0, dt * 2); holdTub(); if (f.cr < 0.02) { setSt(f, "carry"); go(f, [[(pickAt.x + dropAt.x) / 2, (pickAt.z + dropAt.z) / 2], [dropAt.x, dropAt.z]], f2 => setSt(f2, "set"), 1.15); } }
        if (t < 1.35 && f.cr > 0.5) f.pz.lean = 0;
        break; }
      case "carry": holdTub(); break;
      case "setdown": case "set": {
        const tb = f.tub; if (!tb) { setSt(f, f.st === "setdown" ? "pause" : "back"); break; }
        const t = f.stT, spot = f.st === "set" ? dropAt : { x: f.o.x, z: f.o.z }, gp = f.st === "set" ? V1.set(spot.x, W().surf(spot.x, spot.z) + 0.17, spot.z) : fp(f, 0, 0, 0.55);
        if (t < 0.9) { f.cr = approach(f.cr, 0.95, dt * 1.5); const u = sstep(0.1, 0.9, t), w2 = fp(f, 0, 1.12, 0.34); if (f.st === "set") faceYaw(f, Math.atan2(dropAt.x - f.o.x + 0.001, dropAt.z - f.o.z + 0.001) * 0 + f.o.yaw, dt, 1); tb.position.set(lerp(w2.x, gp.x, u), lerp(w2.y - 0.2, W().surf(gp.x, gp.z) + 0.17, u), lerp(w2.z, gp.z, u)); tb.rotation.y = f.o.yaw; f.pz.hands = [{ p: V2.copy(tb.position).add(V3.set(-0.34 * Math.cos(f.o.yaw), 0.12, 0.34 * Math.sin(f.o.yaw))).clone() }, { p: V3.copy(tb.position).add(V1.set(0.34 * Math.cos(f.o.yaw), 0.12, -0.34 * Math.sin(f.o.yaw))).clone() }]; }
        else { f.cr = approach(f.cr, 0, dt * 1.6); if (f.tub) { f.tub.userData.state = "stack"; f.tub.userData.age = 0; f.tub = null; } if (f.cr < 0.02) { if (f.st === "set") { setSt(f, "back"); go(f, [[(pickAt.x + dropAt.x) / 2, (pickAt.z + dropAt.z) / 2], [pickAt.x, pickAt.z]], f2 => setSt(f2, "pick"), 1.3); } else setSt(f, "pause"); } }
        break; }
      case "back": if (!f.path.length) go(f, [[pickAt.x, pickAt.z]], f2 => setSt(f2, "pick"), 1.3); break;
      case "bar": f.pz.look = null; break;
      case "in": break;
      default: setSt(f, "toVan");
    }
  }
};
// the shoveller (by day: scoops snow over the tracks) who by night feeds rubbish to the drum fire and warms his hands at it
ROLE.shov = {
  step(f, dt, c) {
    const B = c.B, lvl = c.lvl; f.pz = {}; const shovel = B.pt(...B.pts.shovel), want = routineOf("shov", c.hour);
    if (f.inside) { if (lvl === 0 && c.calm > 3.5 && !B.door.barred && SCHED.shov(c.hour)) { emerge(f, B); const st0 = want === "shovel" ? "toShovel" : "bagGo"; setSt(f, st0); go(f, want === "shovel" ? [[shovel.x, shovel.z]] : [B.pt(...B.pts.bags)].map(p => [p.x, p.z]), f2 => setSt(f2, want === "shovel" ? "shovel" : "bagPick"), 1.3); } return; }
    const away = st => ["bar", "pause", "in"].includes(st);
    if ((!SCHED.shov(c.hour)) && !away(f.st)) { hideProps(f); setSt(f, "bar"); goIn(f, B, null, 1.3); return; }
    if (lvl >= 4 && f.st !== "bar") { hideProps(f); setSt(f, "bar"); goIn(f, B, null, 2.1); return; }
    if (lvl >= 2 && !away(f.st)) { f.path = []; f.cb = null; setSt(f, "pause"); }
    if (f.st === "pause") { f.pz.look = { x: c.pl.x, z: c.pl.z }; turnTo(f, c.pl.x, c.pl.z, dt, 1.2); f.cr = approach(f.cr, 0, dt); if (f.g.userData.shovel) leanShovel(f, dt); if (lvl === 0 && c.calm > 3) { hideProps(f); const st0 = want === "shovel" ? "toShovel" : "bagGo"; setSt(f, st0); go(f, want === "shovel" ? [[shovel.x, shovel.z]] : [B.pt(...B.pts.bags)].map(p => [p.x, p.z]), f2 => setSt(f2, want === "shovel" ? "shovel" : "bagPick"), 1.3); } return; }
    if (lvl >= 1) f.pz.look = { x: c.pl.x, z: c.pl.z, w: 0.7 };
    const U = f.g.userData, bags = B.pt(...B.pts.bags), drum = B.pt(...B.pts.drum), D = B.parts.drum;
    if (want === "shovel" && ["bagGo", "bagPick", "bagWalk", "throw", "warm"].includes(f.st)) { hideProps(f); setSt(f, "toShovel"); go(f, [[shovel.x, shovel.z]], f2 => setSt(f2, "shovel"), 1.3); }
    if (want === "burn" && (f.st === "shovel" || f.st === "toShovel")) { hideProps(f); setSt(f, "bagGo"); go(f, [[bags.x, bags.z]], f2 => setSt(f2, "bagPick"), 1.3); }
    switch (f.st) {
      case "toShovel": if (!f.path.length) go(f, [[shovel.x, shovel.z]], f2 => setSt(f2, "shovel"), 1.3); break;
      case "shovel": {
        if (!U.shovel) U.shovel = shovelMesh();
        const T0 = 2.5, u = (f.stT % T0) / T0, cyc = Math.floor(f.stT / T0); faceYaw(f, B.site.ry + 0.9 + (cyc % 2) * 0.2, dt, 1);
        const keys = [[0, [0.12, 0.04, 0.98], 0.42], [0.3, [0.1, 0.04, 1.4], 0.46], [0.5, [0.38, 0.95, 0.9], 0.12], [0.6, [0.85, 1.05, 0.62], 0.08], [0.72, [0.7, 0.8, 0.7], 0.12], [1, [0.12, 0.04, 0.98], 0.42]];
        let k0 = keys[0], k1 = keys[1]; for (let q = 0; q < keys.length - 1; q++) if (u >= keys[q][0] && u <= keys[q + 1][0]) { k0 = keys[q]; k1 = keys[q + 1]; }
        const s = sstep(0, 1, (u - k0[0]) / (k1[0] - k0[0] || 1)), bl = [lerp(k0[1][0], k1[1][0], s), lerp(k0[1][1], k1[1][1], s), lerp(k0[1][2], k1[1][2], s)];
        f.cr = lerp(k0[2], k1[2], s); f.pz.twist = Math.sin(Math.PI * sstep(0.45, 0.62, u)) * 0.35 - sstep(0.62, 1, u) * 0.0;
        f.shB = bl; if (u > 0.58 && !f.tossed) { f.tossed = true; const p = fp(f, 0.85, 1.0, 0.62); for (let n = 0; n < 7; n++) api.emit(p.x, p.y, p.z, Math.cos(f.o.yaw) * 1.4 + (Math.random() - 0.5), 0.8 + Math.random() * 0.7, -Math.sin(f.o.yaw) * 1.4 + (Math.random() - 0.5), 0.6, 0.9); } if (u < 0.3) f.tossed = false;
        f.pz.shovel = true; break; }
      case "bagGo": if (!f.path.length) go(f, [[bags.x, bags.z]], f2 => setSt(f2, "bagPick"), 1.3); break;
      case "bagPick": {
        const t = f.stT; if (!f.prop) { f.prop = bagMesh(api.scene, 0.26); f.prop.userData.bag = true; } const bagP = B.parts.bags[3 % B.parts.bags.length], bp = V1.set(bagP.getWorldPosition(V2).x, 0, bagP.getWorldPosition(V2).z);
        if (t < 0.55) { f.cr = approach(f.cr, 0.8, dt * 2); const hp = fp(f, -0.2, 0.25, 0.4); f.prop.position.set(hp.x, W().surf(hp.x, hp.z) + 0.02, hp.z); f.pz.hands = [{ p: V3.copy(f.prop.position).add(V2.set(0, 0.2, 0)).clone() }, null]; }
        else if (t < 1.3) { f.cr = approach(f.cr, 0, dt * 1.6); const hand = handPos(f, 0, V2); f.prop.position.copy(hand).add(V3.set(0, -0.3, 0)); f.pz.hands = [{ p: fp(f, -0.3, 0.72, 0.25) }, null]; }
        else { setSt(f, "bagWalk"); go(f, [[drum.x, drum.z]], f2 => setSt(f2, "throw"), 1.25); }
        break; }
      case "bagWalk": { const hand = handPos(f, 0, V2); if (f.prop) f.prop.position.copy(hand).add(V3.set(0, -0.3, 0)); f.pz.hands = [{ p: fp(f, -0.32, 0.72, 0.15) }, null]; if (!f.path.length) go(f, [[drum.x, drum.z]], f2 => setSt(f2, "throw"), 1.25); break; }
      case "throw": {
        const t = f.stT, dp = B.pt(D.top.lx, D.top.lz), top = V1.set(dp.x, B.y0 + D.top.ly, dp.z); turnTo(f, dp.x, dp.z, dt, 3);
        if (t < 0.7) { const u = sstep(0, 0.7, t); f.pz.hands = [{ p: fp(f, -0.35, lerp(0.72, 1.7, u), lerp(0.15, 0.35, u)) }, null]; const hand = handPos(f, 0, V2); if (f.prop) f.prop.position.copy(hand).add(V3.set(0, -0.12 * (1 - u) - 0.1, 0)); f.pz.lean = -0.05 * u; }
        else if (t < 1.2) { const u = (t - 0.7) / 0.5; f.pz.hands = [{ p: fp(f, -0.2, lerp(1.7, 1.2, u), lerp(0.35, 0.7, u)) }, null]; if (f.prop) { const a = f.bagA || (f.bagA = handPos(f, 0, new T.Vector3()).clone()); f.prop.position.set(lerp(a.x, top.x, u), lerp(a.y, top.y + 0.2, u) + Math.sin(Math.PI * u) * 0.6, lerp(a.z, top.z, u)); if (u > 0.95) { f.prop.visible = false; f.prop = null; f.bagA = null; D.flare = 1; for (let n = 0; n < 8; n++) smoke(top.x + (Math.random() - 0.5) * 0.3, top.y, top.z + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4, 1.6, (Math.random() - 0.5) * 0.4, 0.35, 1.8, 0x3a3d40, 0.5); } } }
        else { setSt(f, "warm"); }
        break; }
      case "warm": {
        const dp = B.pt(D.top.lx, D.top.lz); turnTo(f, dp.x, dp.z, dt, 2); const top = V1.set(dp.x, B.y0 + D.top.ly - 0.05, dp.z);
        f.pz.hands = [{ p: V2.copy(top).add(V3.set(0.18, 0.12, 0)).clone() }, { p: new T.Vector3(top.x - 0.18, top.y + 0.12, top.z) }]; f.pz.lean = 0.05;
        if (f.stT > 5.5) { setSt(f, "bagGo"); go(f, [[bags.x, bags.z]], f2 => setSt(f2, "bagPick"), 1.3); }
        break; }
      case "bar": hideProps(f); break;
    }
    if (U.shovel) { if (f.st === "shovel") placeShovel(f); else if (f.st !== "pause") { U.shovel.visible = false; } }
  }
};
function shovelMesh() {
  const M = api.mesh, m = mats(), g = new T.Group(); M.cyl(0.018, 0.018, 1.15, m.wood, 0, 0.575, 0, 0, 0, 0, g, 6); M.box(0.3, 0.025, 0.34, m.steel, 0, -0.06, 0, 0.15, 0, 0, g); M.box(0.3, 0.02, 0.06, m.steel, 0, 0.0, 0.0, 0.15, 0, 0, g); M.box(0.12, 0.035, 0.04, m.dgrey, 0, 1.14, 0, 0, 0, 0, g);
  g.visible = true; api.scene.add(g); return g;
}
function placeShovel(f) {
  const U = f.g.userData, s = U.shovel, b = f.shB || [0.1, 0.05, 1], B2 = fp(f, b[0], b[1], b[2], new T.Vector3()), belly = fp(f, 0.02, 1.05, 0.12, new T.Vector3()), dir = belly.clone().sub(B2).normalize();
  s.visible = true; s.position.copy(B2); s.quaternion.setFromUnitVectors(V1.set(0, 1, 0), dir);
  // the hands: one near the top (beside the belly), one a forearm lower
  f.pz.hands = [{ p: B2.clone().addScaledVector(dir, 0.74) }, { p: B2.clone().addScaledVector(dir, 1.0).add(V2.set(0, 0.04, 0)) }];
  f.pz.hands[0].p = B2.clone().addScaledVector(dir, 0.74); f.pz.hands[1].p = B2.clone().addScaledVector(dir, 1.02);
}
function leanShovel(f, dt) { const s = f.g.userData.shovel; if (!s) return; s.visible = true; const p = fp(f, 0.3, 0, 0.3, V1); s.position.set(p.x, p.y, p.z); s.rotation.set(0.12, 0, -0.1); s.updateMatrixWorld(); f.pz.hands = [{ p: fp(f, 0.28, 0.92, 0.33), w: 0.8 }, null]; }
function hideProps(f) { if (f.prop) { f.prop.visible = false; f.prop = null; } if (f.g && f.g.userData.shovel) f.g.userData.shovel.visible = false; if (f.can) { returnCan(f); } }
// the phone man: paces on his phone (walks in the moment he sees you) and every so often carries a can to the generator
ROLE.phone = {
  step(f, dt, c) {
    const B = c.B, lvl = c.lvl; f.pz = {}; const pa = B.pt(...B.pts.phoneA), pb = B.pt(...B.pts.phoneB), cans = B.pt(...B.pts.cans), gen = B.pt(B.pts.gen[0] - 0.25, B.pts.gen[1] + 1.55);
    if (f.inside) { if (lvl === 0 && c.calm > 4 && !B.door.barred && SCHED.phone(c.hour)) { emerge(f, B); setSt(f, "pace"); f.leg = 0; go(f, [[pb.x, pb.z]], f2 => setSt(f2, "stop"), 1.0); } return; }
    if (!f.phoneM) { f.phoneM = api.mesh.box(0.055, 0.15, 0.022, mats().dgrey, -0.115, 0.12, 0.02, 0, 0, 0, f.g.userData.head); }
    const away = st => ["bar", "in"].includes(st);
    if (f.can && (lvl >= 1 || !SCHED.phone(c.hour))) returnCan(f);
    if ((!SCHED.phone(c.hour) || lvl >= 1) && !away(f.st)) { f.path = []; f.cb = null; f.phoneM.visible = false; setSt(f, "bar"); goIn(f, B, null, lvl >= 4 ? 2.1 : 1.6); return; }
    f.pz.look = lvl >= 1 ? { x: c.pl.x, z: c.pl.z, w: 0.8 } : null;
    const ph = f.st === "pace" || f.st === "stop"; f.phoneM.visible = ph;
    switch (f.st) {
      case "pace": if (!f.path.length) { f.leg ^= 1; go(f, [f.leg ? [pa.x, pa.z] : [pb.x, pb.z]], f2 => setSt(f2, "stop"), 1.0); } break;
      case "stop": { const t = f.stT; f.pz.look = f.pz.look || { x: f.o.x + Math.sin(f.o.yaw + Math.sin(f.t) * 0.6) * 6, z: f.o.z + Math.cos(f.o.yaw + Math.sin(f.t) * 0.6) * 6, w: 0.6 };
        f.pz.hands = [{ p: fp(f, -0.115, 1.6, 0.03) }, { p: fp(f, 0.22 + Math.sin(f.t * 2.2) * 0.1, 1.1 + Math.sin(f.t * 1.7) * 0.12, 0.3) }];
        if (t > 3.2 + (f.seed % 3)) { f.paces = (f.paces || 0) + 1; if (f.paces % 3 === 0) { setSt(f, "canGo"); f.phoneM.visible = false; go(f, [[cans.x, cans.z]], f2 => setSt(f2, "canPick"), 1.25); } else { setSt(f, "pace"); f.leg ^= 1; go(f, [f.leg ? [pa.x, pa.z] : [pb.x, pb.z]], f2 => setSt(f2, "stop"), 1.0); } }
        break; }
      case "canGo": if (!f.path.length) go(f, [[cans.x, cans.z]], f2 => setSt(f2, "canPick"), 1.25); break;
      case "canPick": {
        const can = B.parts.cans[0], t = f.stT; f.can = can; if (can.parent !== api.scene && !f.canTaken) { can.userData.home = can.position.clone(); can.userData.hq = can.rotation.y; f.canTaken = true; }
        if (t < 0.7) { f.cr = approach(f.cr, 0.85, dt * 2); const wp = can.getWorldPosition(V1); f.pz.hands = [{ p: new T.Vector3(wp.x, wp.y + 0.3, wp.z) }, null]; }
        else if (t < 1.4) { f.cr = approach(f.cr, 0, dt * 1.6); attachCan(f); f.pz.hands = [{ p: fp(f, -0.3, 0.74, 0.12) }, null]; }
        else { setSt(f, "canWalk"); go(f, [[gen.x, gen.z]], f2 => setSt(f2, "pour"), 1.2); }
        break; }
      case "canWalk": attachCan(f); f.pz.hands = [{ p: fp(f, -0.3, 0.74, 0.12) }, null]; if (!f.path.length) go(f, [[gen.x, gen.z]], f2 => setSt(f2, "pour"), 1.2); break;
      case "pour": {
        const t = f.stT, gp = B.pt(B.pts.gen[0] - 0.2, B.pts.gen[1]), top = V1.set(gp.x, B.y0 + B.Y(B.pts.gen[0], B.pts.gen[1]) + 0.98, gp.z); turnTo(f, gp.x, gp.z, dt, 2.5); f.cr = approach(f.cr, 0.12, dt);
        const k = Math.min(1, t / 0.8), out = Math.min(1, Math.max(0, (6.2 - t) / 0.7)); const hp = V2.set(top.x, top.y + 0.38 * k, top.z).clone(); hp.x += Math.sin(f.o.yaw) * -0.3 * k; hp.z += Math.cos(f.o.yaw) * -0.3 * k;
        f.pz.hands = [{ p: fp(f, -0.2, lerp(0.74, 1.15, Math.min(k, out)), lerp(0.12, 0.55, Math.min(k, out))) }, { p: new T.Vector3(top.x, top.y + 0.1, top.z) }];
        attachCan(f, lerp(0, 1.45, Math.min(k, out)));
        if (c.near && t > 1 && t < 6 && Math.random() < dt * 0.9) { const p = V3.set(top.x, top.y + 0.1, top.z); smoke(p.x, p.y, p.z, 0.05, 0.3, 0.02, 0.12, 1.2, 0xc8ccd0, 0.18); }
        B.genPause = t > 2 && t < 5.5 ? 1 : 0;
        if (t > 6.9) { B.genPause = 0; setSt(f, "canBack"); go(f, [[cans.x, cans.z]], f2 => setSt(f2, "canSet"), 1.25); }
        break; }
      case "canBack": attachCan(f); f.pz.hands = [{ p: fp(f, -0.3, 0.74, 0.12) }, null]; if (!f.path.length) go(f, [[cans.x, cans.z]], f2 => setSt(f2, "canSet"), 1.25); break;
      case "canSet": { const t = f.stT, can = f.can; if (!can) { setSt(f, "pace"); break; } if (t < 0.7) { f.cr = approach(f.cr, 0.85, dt * 2); const hp = can.userData.home ? B.pt(can.userData.home.x, can.userData.home.z) : cans; f.pz.hands = [{ p: new T.Vector3(hp.x, W().surf(hp.x, hp.z) + 0.3, hp.z) }, null]; attachCan(f, 0, true); if (t > 0.45) returnCan(f); } else { f.cr = approach(f.cr, 0, dt * 1.6); if (f.cr < 0.02) { setSt(f, "pace"); f.leg = 0; go(f, [[pb.x, pb.z]], f2 => setSt(f2, "stop"), 1.0); } } break; }
      case "bar": case "in": break;
      default: setSt(f, "pace"); f.leg = 0; go(f, [[pb.x, pb.z]], f2 => setSt(f2, "stop"), 1.0);
    }
  }
};
function attachCan(f, tilt, low) {
  const can = f.can; if (!can) return; if (can.parent !== api.scene) { api.scene.add(can); }
  const hand = handPos(f, 0, V2); can.position.copy(hand).add(V3.set(0, low ? -0.1 : -0.27, 0)); can.rotation.set(0, f.o.yaw + Math.PI / 2, 0);
  if (tilt) { can.position.copy(hand).add(V3.set(0, -0.05, 0)); can.rotation.set(0, f.o.yaw, 0); can.rotateZ(tilt); }
}
function returnCan(f) { const can = f.can; if (!can) return; const B = f.site.B; B.g.add(can); const h = can.userData.home; if (h) can.position.copy(h); can.rotation.set(0, can.userData.hq || 0, 0); f.can = null; f.canTaken = false; }

// the rider: a sled idling at the gate with its lights off; he rides off when you come near and is back once you have gone
ROLE.rider = {
  step(f, dt, c) {
    const B = c.B, gate = B.pt(...B.pts.gate), pl = c.pl; f.pz = {}; const R = f.R, act = SCHED.rider(c.hour);
    const dG = Math.hypot(pl.x - gate.x, pl.z - gate.z), far = B.pt(0.9, 118);
    if (f.hidden) { if (act && c.calm > 2) { f.hidden = false; f.o.x = far.x; f.o.z = far.z; f.o.yaw = B.site.ry + Math.PI; f.o.px = 0; setSt(f, "return"); go(f, [[gate.x, gate.z]], f2 => { setSt(f2, "idle"); f2.o.yaw = wrap(f2.o.yaw); }, 6.2); } return; }
    if (!act && f.st === "idle" && !c.near1) { setSt(f, "leave"); go(f, [[far.x, far.z]], f2 => { f2.hidden = true; if (f2.R) f2.R.g.visible = false; }, 6.0); return; }
    if ((dG < 95 || c.lvl >= 1) && (f.st === "idle" || f.st === "return")) {
      const dx = gate.x - pl.x, dz = gate.z - pl.z, L = Math.hypot(dx, dz) || 1, ax = gate.x + dx / L * 85, az = gate.z + dz / L * 85;
      setSt(f, "leave"); go(f, [[gate.x + dx / L * 30, gate.z + dz / L * 30], [ax, az]], f2 => setSt(f2, "away"), 6.4); f.turn = 1.7;
    }
    if (f.st === "away") { f.awayT = (f.awayT || 0) + dt; if (c.dSite > TUNE.resetD && f.stT > 9 && c.lvl === 0) { setSt(f, "return"); go(f, [[gate.x, gate.z]], f2 => setSt(f2, "idle"), 6.0); } }
    if (f.st === "idle") { faceYaw(f, B.site.ry + Math.PI + 0.12, dt, 0.4); if (c.near && Math.random() < dt * 0.9) { const p = f.o, e = fp(f, 0.0, 0.5, -1.3); smoke(e.x, e.y, e.z, 0, 0.35, 0, 0.18, 1.8, 0x8a8e92, 0.3); } }
  },
  draw(f, dt) { if (f.hidden || !f.R) { if (f.R) f.R.g.visible = false; return; } api.__rider.place(f.R, f.o.x, f.o.z, f.o.yaw, dt); }
};
// the dog on its chain
function dogTint(q) {
  const map = { 0xeceef0: 0xa38e72, 0xc9ccd0: 0x76654f, 0xf2f3f4: 0xa38e72 };
  q.g.traverse(m => { if (m.isMesh && m.material && map[m.material.color.getHex()] !== undefined) { m.material = m.material.clone(); m.material.color.setHex(map[m.material.color.getHex()]); } });
}
function mkDog(site, B) {
  const q = api.gram.quad.make("fox"); if (!q.g.parent) api.scene.add(q.g); q.g.scale.setScalar(1.45); q.g.visible = true; dogTint(q);
  const home = B.pt(...B.pts.dogHome), M = api.mesh, m = mats(), chain = [];
  for (let i = 0; i < 6; i++) { const c = new T.Mesh(new T.CylinderGeometry(0.011, 0.011, 1, 5), m.dgrey); c.visible = true; api.scene.add(c); chain.push(c); }
  return { role: "dog", site, dog: q, o: { x: home.x, z: home.z, yaw: site.ry }, v: 0, vmax: 2.4, st: "rest", stT: 0, t: 0, inside: false, graze: 0.7, chain, barkT: 0, pz: {}, path: [], seed: site.seed, headUp: 0 };
}
function dogStep(f, dt, c) {
  const B = c.B, st = B.pt(...B.pts.stake), home = B.pt(...B.pts.dogHome), pl = c.pl, o = f.o, dd = Math.hypot(pl.x - o.x, pl.z - o.z), lvl = c.lvl, MAXR = 3.4;
  f.t += dt; f.stT += dt;
  let want = "rest"; if (dd < 150 && lvl >= 1) want = "alert"; if (dd < 150 && lvl >= 2) want = "bark";
  if (want !== f.st) { f.st = want; f.stT = 0; }
  let vt = 0, tx = home.x, tz = home.z;
  if (f.st === "rest") { f.graze += (0.72 - f.graze) * Math.min(1, dt * 2); if (f.t % 17 < 2.2) f.graze += (0.0 - f.graze) * Math.min(1, dt * 2.5); }
  else { f.graze += (0 - f.graze) * Math.min(1, dt * 4); }
  if (f.st !== "rest") { const a = Math.atan2(pl.x - st.x, pl.z - st.z), r = f.st === "bark" ? MAXR : 1.4; tx = st.x + Math.sin(a) * r; tz = st.z + Math.cos(a) * r; }
  const ddt = Math.hypot(tx - o.x, tz - o.z);
  if (ddt > 0.35) { const dy = wrap(Math.atan2(tx - o.x, tz - o.z) - o.yaw); o.yaw = wrap(o.yaw + clamp(dy, -3 * dt, 3 * dt)); vt = (f.st === "bark" ? 2.4 : 0.9) * (Math.abs(dy) > 0.8 ? 0.2 : 1) * clamp(ddt / 1.0, 0.25, 1); }
  else if (f.st !== "rest") { const dy = wrap(Math.atan2(pl.x - o.x, pl.z - o.z) - o.yaw); o.yaw = wrap(o.yaw + clamp(dy, -3 * dt, 3 * dt)); }
  f.v = approach(f.v, vt, (vt > f.v ? 3 : 5) * dt);
  o.x += Math.sin(o.yaw) * f.v * dt; o.z += Math.cos(o.yaw) * f.v * dt;
  const sx = o.x - st.x, sz = o.z - st.z, sr = Math.hypot(sx, sz); if (sr > MAXR) { o.x = st.x + sx / sr * MAXR; o.z = st.z + sz / sr * MAXR; f.v *= 0.5; }
  // barking: a sound and a throw of the head, two or three at a time
  if (f.st === "bark") { f.barkT -= dt; if (f.barkT <= 0) { f.n = (f.n || 0) + 1; f.barkT = f.n % 3 === 0 ? 3.4 : 0.55; f.jerk = 1; bark(clamp(1 - dd / 320, 0.05, 1)); c.site.barks = (c.site.barks || 0) + 1; } }
  f.jerk = Math.max(0, (f.jerk || 0) - dt * 4.5);
}
function dogDraw(f, dt) {
  const q = f.dog, o = f.o, w = W(), y = w.surf(o.x, o.z); q.g.position.set(o.x, y - 0.05, o.z); q.g.rotation.y = o.yaw; q.g.visible = true;
  api.gram.quad.pose(q, dt, f.v / 1.45, f.graze, 0);
  if (f.jerk) { q.neck.rotation.x -= 0.28 * f.jerk; q.head.rotation.x -= 0.2 * f.jerk; q.body.position.y += 0.01 * f.jerk; }
  // the chain, from the stake to the collar, sagging
  const B = f.site.B, stk = B.pt(...B.pts.stake), p0 = V1.set(stk.x, w.surf(stk.x, stk.z) + 0.45, stk.z), p1 = V2.set(o.x + Math.sin(o.yaw) * 0.18, y + 0.42, o.z + Math.cos(o.yaw) * 0.18), n = f.chain.length, len = p0.distanceTo(p1);
  let prev = p0.clone();
  for (let i = 0; i < n; i++) { const u = (i + 1) / n, cur = new T.Vector3().lerpVectors(p0, p1, u); cur.y -= Math.sin(Math.PI * u) * Math.max(0, 0.9 - len * 0.18) * 0.5; cur.y = Math.max(cur.y, w.surf(cur.x, cur.z) + 0.02);
    const seg = f.chain[i], d = cur.clone().sub(prev), L = d.length() || 0.01; seg.position.copy(prev).addScaledVector(d, 0.5); seg.scale.set(1, L, 1); seg.quaternion.setFromUnitVectors(V3.set(0, 1, 0), d.multiplyScalar(1 / L)); prev = cur; }
}

/* ---------------- the crew: spawning and the per-frame tick ---------------- */
const CROUCH = new Set(["pick", "setdown", "set", "shovel", "bagPick", "canPick", "canSet", "pour"]);
const LVL = ["", "notice", "wary", "warn-off", "barred"];
function spawnCrew(site) {
  const B = site.B, K = KINDS[site.kind]; if (!B || site.C) return;
  const C = site.C = { figs: [], tubs: [], react: { lvl: 0, t3: 0, away: 0, calm: 0, ph: 0 }, queue: [], born: 0 };
  const roster = K.roster.slice(0, site.n); roster.forEach((role, i) => { C.queue.push(() => { const f = mkFig(site, role, site.seed + 101 * (i + 1)); f.warnN = 0; f.idx = i; C.figs.push(f); }); });
  if (site.rider) C.queue.push(() => { const f = mkFig(site, "rider", site.seed + 9); if (f.g) { f.g.visible = false; FIGPOOL.push(f.g); f.g = null; } f.R = api.__rider.build(site.seed + 5); f.R.g.visible = false; f.inside = false; f.hidden = true; f.st = "idle"; C.figs.push(f); });
  C.queue.push(() => { C.figs.push(mkDog(site, B)); });
  C.queue.push(() => { for (let i = 0; i < 6; i++) { const t = tubMesh(api.scene); t.visible = false; t.userData.state = ""; C.tubs.push(t); } });
}
function takeTub(C) { for (const t of C.tubs) if (!t.userData.state) { t.userData.state = "held"; t.visible = true; return t; } const t = C.tubs[0]; t.userData.state = "held"; return t; }
function crewReady(site) { return site.C && !site.C.queue.length; }
function spawnStep(site) { const C = site.C; if (C && C.queue.length) { C.queue.shift()(); return true; } return false; }
function losPts(ax, ay, az, bx, by, bz) {
  const w = W(), L = Math.hypot(bx - ax, bz - az), n = Math.min(40, Math.max(3, Math.ceil(L / 8)));
  for (let i = 1; i < n; i++) { const u = i / n; if (w.surf(ax + (bx - ax) * u, az + (bz - az) * u) > ay + (by - ay) * u + 0.15) return false; }
  return true;
}
function reactTick(site, dt, c) {
  const C = site.C, r = C.react, B = site.B, p = c.pl, d = c.dP, prev = r.lvl;
  const door = doorPt(B), los = c.los, heard = d < 40;
  let tgt = 0; if ((los || heard) && d < TUNE.notice) tgt = 1; if ((los || heard) && d < TUNE.wary) tgt = 2; if ((los || d < 28) && d < TUNE.warn) tgt = 3; if (d < TUNE.barred) tgt = 4;
  if (tgt > r.lvl) r.lvl = tgt >= 4 && r.lvl < 3 ? 3 : tgt;
  if (r.lvl === 3) { r.t3 += dt; if (tgt >= 4 && r.t3 > 2.2) r.lvl = 4; } else if (r.lvl < 3) r.t3 = 0;
  if (r.lvl > 0) { r.calm = 0; if (c.dSite > TUNE.resetD) { r.away += dt; if (r.away >= TUNE.resetT) { r.lvl = 0; r.away = 0; r.t3 = 0; B.door.barred = false; B.door.bar.visible = false; site.barredAt = null; for (const t of C.tubs) if (t.userData.state === "stack") { t.visible = false; t.userData.state = ""; } } } else r.away = 0; }
  else r.calm += dt;
  site.lvl = r.lvl; site.lvlName = LVL[r.lvl];
}
function crewTick(site, dt) {
  const C = site.C, B = site.B, p = here(), w = W(); if (!C) return;
  const door = doorPt(B), dP = Math.hypot(p.x - door.x, p.z - door.z), dSite = Math.hypot(p.x - site.x, p.z - site.z), dark = clamp(1 - api.dayFactor(), 0, 1);
  const eye = api.camera.position, los = losPts(eye.x, eye.y, eye.z, door.x, w.surf(door.x, door.z) + 1.5, door.z);
  const c = { B, site, pl: { x: p.x, z: p.z }, dP, dSite, dark, hour: hourNow(), los, near: dSite < 130, near1: dP < 110, lvl: C.react.lvl, calm: C.react.calm, dt };
  reactTick(site, dt, c); c.lvl = C.react.lvl; c.calm = C.react.calm;
  if (site.force) { site.force.t -= dt; if (site.force.t <= 0) site.force = null; }
  // the door: slides open for anyone passing, shut (and barred) when it is barred
  const D = B.door; D.hold = (D.hold || 0) - dt;
  for (const f of C.figs) if (f.passing && !f.inside && f.o) { if (Math.hypot(f.o.x - door.x, f.o.z - door.z) < 3.6) D.hold = Math.max(D.hold, 0.7); }
  D.target = D.barred ? 0 : (D.hold > 0 ? 1 : 0); D.slide = approach(D.slide, D.target, dt * 1.1); D.leaf.position.x = D.x0 - D.slide * D.w;
  for (const f of C.figs) {
    if (f.role === "dog") { dogStep(f, dt, c); dogDraw(f, dt); continue; }
    if (f.role === "rider") { ROLE.rider.step(f, dt, c); if (!f.hidden) { figMove(f, dt); } ROLE.rider.draw(f, dt); continue; }
    const R = ROLE[f.role === "carA" || f.role === "carB" ? "carry" : f.role];
    if (f.inside) { f.stT += dt; R.step(f, dt, c); if (f.inside) { if (f.g) f.g.visible = false; continue; } }
    else R.step(f, dt, c);
    if (!CROUCH.has(f.st)) f.cr = approach(f.cr, 0, dt * 2.5);                       // the body comes up out of a bend before it walks, never with a jump
    figMove(f, dt);
    if (f.passing && f.inside) f.passing = false;
    if (!f.inside) { drawFig(f, dt); figLod(f); }
    if (f.inside && f.g) f.g.visible = false;
  }
  // tubs set down at the door are taken in by somebody inside, one at a time
  const dropP = B.pt(B.pts.drop[0] + 0.4, B.pts.drop[1]);
  for (const t of C.tubs) { const u = t.userData;
    if (u.state === "stack") { u.age = (u.age || 0) + dt; if (u.age > 4.5 && !D.barred && C.react.lvl === 0 && Math.hypot(t.position.x - dropP.x, t.position.z - dropP.z) < 3.5) { u.state = "taken"; u.age = 0; u.from = t.position.clone(); D.hold = Math.max(D.hold, 2.2); } }
    else if (u.state === "taken") { u.age += dt; const k = clamp(u.age / 1.4, 0, 1), inD = B.pt(B.pts.door[0], B.pts.door[1] - 0.3); t.position.set(lerp(u.from.x, inD.x, k), lerp(u.from.y, u.from.y + 0.05, k), lerp(u.from.z, inD.z, k)); if (k >= 1) { t.visible = false; u.state = ""; } }
  }
}
// the world's clock for a built site: night glows, the generator, the vent
function siteTick(site, dt, d) {
  const B = site.B, t = performance.now() / 1000, dark = clamp(1 - api.dayFactor(), 0, 1), near = d < 160, m = mats();
  const op = dark * (1 - sstep(260, 800, d)); m.leak.opacity = op * 0.95; for (const q of B.leaks) q.visible = op > 0.02; B.leakOp = op;
  for (const g of B.glows) { g.s.material.opacity = op * g.k * (0.85 + Math.sin(t * 3 + g.k * 9) * 0.08); g.s.visible = op > 0.02; }
  for (const fn of B.anim) fn(dt, t, { dark, near, d });
  const D = B.parts.drum; if (D && D.flare > 0) D.flare = Math.max(0, D.flare - dt);
  // the generator's exhaust and the vent's steam
  if (near) {
    B.gp = (B.gp || 0) - dt; if (B.gp <= 0) { B.gp = (B.genPause ? 0.9 : 0.34) + Math.random() * 0.15; const o = B.pt(B.pts.genOut.lx, B.pts.genOut.lz); smoke(o.x, B.y0 + B.pts.genOut.ly, o.z, 0.1 + Math.random() * 0.08, 0.55, 0.05, 0.22, 2.4, 0x4a4d50, B.genPause ? 0.18 : 0.42); }
    B.vp = (B.vp || 0) - dt; if (B.vp <= 0) { B.vp = 0.5 + Math.random() * 0.3; const o = B.pt(B.pts.vent.lx, B.pts.vent.lz); smoke(o.x, B.y0 + B.pts.vent.ly, o.z, 0.05, 0.8, 0.03, 0.5, 3.4, 0xdfe6ea, 0.28); }
  }
}

/* ---------------- the grow room (the walk-in interior) ---------------- */
function growRoom(R, K, site) {
  const IM = K.IM, M = api.mesh, box = M.box, cyl = M.cyl, ball = M.ball, std = M.std, g = R.g, PI = Math.PI, Rn = rng(site.seed ^ 0x5bd1e995);
  R.hx = 4.8; R.hz = 3.6; R.h = 2.55;
  K.shell(R, { doorX: -3.2, wins: [], insul: true });
  const purple = new T.MeshBasicMaterial({ color: 0xc27bff }), bagM = std(0xc9b88f, 0.95, 0), black = std(0x0e0f10, 0.95, 0), leafM = std(0x2f6b2a, 0.8, 0), leafD = std(0x24531f, 0.85, 0), potM = std(0x2b2e33, 0.9, 0), steel = std(0xaab2b9, 0.4, 0.6), duct = std(0xb9c0c6, 0.5, 0.5), blue = std(0x2a5d86, 0.6, 0.2);
  const pl = (x, y, z, c, I, d) => { const L = new T.PointLight(c, I, d, 1.6); L.position.set(x, y, z); g.add(L); R.lights.push(L); return L; };
  // black plastic over the floor, boards nailed over the windows, light-proofing
  K.rug(R, 0.7, 0.55, 8.6, 4.4, black);
  for (const [x, z] of [[-4.78, -1.9], [-4.78, 1.6], [4.78, -1.0], [4.78, 2.0]]) { const b = box(0.06, 1.2, 1.1, IM.dark, x, 1.5, z, 0, 0, 0, g); for (const s of [-1, 1]) box(0.05, 1.5, 0.1, IM.wood, x + (x < 0 ? 0.05 : -0.05), 1.5, z, s * 0.6, 0, 0, g); }
  // two racks of plants under their lamps: a long low bench, the pots, the stems and fans of leaves, a purple bar light over each
  const rows = [-0.55, 1.65]; R.plants = [];
  rows.forEach((rz, ri) => {
    box(7.4, 0.07, 0.95, IM.wood, 0.6, 0.62, rz, 0, 0, 0, g); for (const x of [-2.9, -0.2, 2.5, 4.0]) for (const s of [-1, 1]) box(0.07, 0.62, 0.07, IM.wood, x, 0.31, rz + s * 0.4, 0, 0, 0, g); K.col(R, 0.6, rz, 7.4, 0.95, 0, 1.0);
    for (let i = 0; i < 11; i++) {
      const x = -2.75 + i * 0.66, grow = 0.75 + Rn() * 0.5 + (ri ? 0.2 : 0), pl2 = new T.Group(); pl2.position.set(x, 0.66, rz + (Rn() - 0.5) * 0.12); g.add(pl2);
      cyl(0.15, 0.12, 0.2, potM, 0, 0.1, 0, 0, 0, 0, pl2, 10); cyl(0.17, 0.17, 0.02, black, 0, 0.2, 0, 0, 0, 0, pl2, 10); cyl(0.018, 0.026, 0.55 * grow, leafD, 0, 0.2 + 0.275 * grow, 0, 0, 0, 0, pl2, 5);
      for (let k = 0; k < 9; k++) { const a = k * 2.4 + Rn(), lh = 0.18 + (k / 9) * 0.5 * grow, len = (0.32 - k * 0.012) * (0.8 + grow * 0.25); const lf = box(0.05, 0.012, len, k % 2 ? leafM : leafD, Math.sin(a) * len * 0.45, 0.2 + lh, Math.cos(a) * len * 0.45, 0.5, a, 0, pl2); lf.userData.leaf = true;
        for (const s of [-1, 1]) box(0.03, 0.01, len * 0.7, k % 2 ? leafD : leafM, Math.sin(a + s * 0.5) * len * 0.4, 0.2 + lh - 0.01, Math.cos(a + s * 0.5) * len * 0.4, 0.5, a + s * 0.5, 0, pl2); }
      ball(0.1 * grow, leafM, 0, 0.2 + 0.55 * grow, 0, pl2, 1, 1.5, 1); R.plants.push(pl2);
    }
    // the lamp bar: a long reflector with the purple tubes, chains to the ceiling
    box(7.2, 0.06, 0.62, steel, 0.6, 1.95, rz, 0, 0, 0, g); for (const dz of [-0.2, 0, 0.2]) box(7.0, 0.04, 0.05, purple, 0.6, 1.9, rz + dz, 0, 0, 0, g); for (const x of [-2.6, 3.8]) for (const s of [-0.28, 0.28]) cyl(0.008, 0.008, 0.6, black, x, 2.25, rz + s, 0, 0, 0, g, 4);
    for (const x of [-1.6, 2.8]) pl(x, 1.7, rz, 0xb35bff, 1.35, 7.5);
  });
  // a tray of seedlings by the back wall, a water barrel with hoses, soil bags stacked by the door
  K.table(R, -1.2, 3.0, 2.0, 0.7, 0.78, 0); for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { box(0.28, 0.09, 0.28, potM, -1.9 + i * 0.37, 0.84, 2.85 + j * 0.3, 0, 0, 0, g); ball(0.07, leafM, -1.9 + i * 0.37, 0.93, 2.85 + j * 0.3, g, 1, 1.1, 1); }
  cyl(0.34, 0.34, 0.95, blue, 4.1, 0.48, -2.7, 0, 0, 0, g, 14); K.col(R, 4.1, -2.7, 0.8, 0.8, 0, 1); cyl(0.02, 0.02, 3.2, black, 3.0, 0.05, -2.7, 0, 0, PI / 2, g, 5); cyl(0.02, 0.02, 2.0, black, 4.0, 0.05, -1.8, PI / 2, 0, 0, g, 5);
  for (let i = 0; i < 6; i++) { const x = 3.6 + (i % 2) * 0.55, y = Math.floor(i / 2) * 0.2; box(0.5, 0.18, 0.78, bagM, x, 0.1 + y, -2.0 - Math.floor(i / 2) * 0.0, 0, 0.1 * i, 0, g); } K.col(R, 3.9, -2.0, 1.2, 0.9, 0, 0.7);
  // the drying line: a rope across the back with bundles hanging head down
  box(5.6, 0.014, 0.014, black, -0.6, 2.1, 2.45, 0, 0, 0, g); R.dry = [];
  for (let i = 0; i < 9; i++) { const x = -3.0 + i * 0.6, b = new T.Group(); b.position.set(x, 2.1, 2.45); g.add(b); cyl(0.004, 0.004, 0.25, black, 0, -0.12, 0, 0, 0, 0, b, 3); cyl(0.07, 0.015, 0.34, i % 3 ? std(0x4f5a2a, 0.95, 0) : std(0x6a5a2c, 0.95, 0), 0, -0.4, 0, 0, 0, 0, b, 8); b.rotation.z = (Rn() - 0.5) * 0.06; R.dry.push(b); }
  // fans: two box fans on stands, blades turning; a round duct along the ceiling to the roof vent
  R.fans = []; for (const [fx, fz, ry] of [[-2.1, 0.55, 0.0], [3.5, 0.55, 3.14]]) { const f2 = new T.Group(); f2.position.set(fx, 0, fz); f2.rotation.y = ry; g.add(f2); cyl(0.03, 0.03, 1.05, steel, 0, 0.52, 0, 0, 0, 0, f2, 6); box(0.55, 0.05, 0.4, steel, 0, 0.03, 0, 0, 0, 0, f2); box(0.52, 0.52, 0.16, std(0xd6d9dc, 0.6, 0.2), 0, 1.15, 0, 0, 0, 0, f2); const bl = new T.Group(); bl.position.set(0, 1.15, 0.09); f2.add(bl); for (let k = 0; k < 4; k++) box(0.04, 0.22, 0.01, std(0x20242a, 0.6, 0.1), 0, 0, 0, 0, 0, k * PI / 2, bl).position.set(Math.sin(k * PI / 2) * -0.1, Math.cos(k * PI / 2) * 0.1, 0); R.fans.push(bl); K.col(R, fx, fz, 0.6, 0.45, ry, 1.6); }
  cyl(0.17, 0.17, 8.6, duct, 0.4, 2.3, -1.7, 0, 0, PI / 2, g, 14); for (const x of [-3.0, -0.5, 2.0, 4.0]) box(0.04, 0.2, 0.2, steel, x, 2.3, -1.7, 0, 0, 0, g);
  // the table with the scales and the cash (A2b takes it: the piles' room positions are in site.room.cash), and a camp bed
  const tx = 2.6, tz = 3.0; K.table(R, tx, tz, 2.2, 0.9, 0.8, 0);
  box(0.36, 0.035, 0.28, steel, tx - 0.8, 0.84, tz - 0.1, 0, 0.2, 0, g); box(0.18, 0.09, 0.07, black, tx - 0.8, 0.9, tz - 0.27, 0.0, 0.2, 0, g); box(0.1, 0.012, 0.05, std(0x93e6a4, 0.4, 0), tx - 0.8, 0.945, tz - 0.285, 0, 0.2, 0, g);
  box(0.34, 0.035, 0.26, steel, tx - 0.3, 0.84, tz + 0.2, 0, -0.3, 0, g); box(0.15, 0.08, 0.06, black, tx - 0.3, 0.89, tz + 0.05, 0, -0.3, 0, g);
  for (let i = 0; i < 4; i++) box(0.2, 0.03, 0.12, std(0xfbfbf4, 0.9, 0), tx - 1.0 + i * 0.12, 0.835 + 0.02, tz + 0.32 + (i % 2) * 0.03, 0, 0.2 * i, 0, g).visible = false;
  const piles = [[0.35, -0.2, 18], [0.7, 0.18, 12], [0.95, -0.15, 22], [0.1, 0.24, 9]]; R.cash = [];
  piles.forEach((q, i) => { const n = q[2], px = tx + q[0] * 0.8, pz = tz + q[1]; const gp = new T.Group(); gp.position.set(px, 0.835, pz); gp.rotation.y = 0.4 * i; g.add(gp); for (let k = 0; k < Math.ceil(n / 3); k++) box(0.17, 0.014, 0.08, std(i % 2 ? 0xb9b27a : 0xa9b38a, 0.9, 0), 0.0, 0.007 + k * 0.014, 0, 0, 0, 0, gp); box(0.03, 0.12 * 0.0 + Math.ceil(n / 3) * 0.014 + 0.004, 0.085, std(0xc9503a, 0.7, 0), 0, Math.ceil(n / 3) * 0.007, 0, 0, 0, 0, gp); R.cash.push({ x: px, z: pz, y: 0.84, grp: gp }); });
  site.room = { cash: R.cash.map((q, i) => ({ x: Math.round(q.x * 100) / 100, z: Math.round(q.z * 100) / 100, y: 0.84, amt: 700 + Math.floor(Rn() * 1400), taken: false, i })), size: [R.hx, R.hz], door: [-3.2, -R.hz] };
  K.bed(R, -3.5, 2.75, 0); K.col(R, -3.5, 2.75, 2, 1.0, 0, 1);
  box(0.4, 0.3, 0.3, std(0x3a3f46, 0.8, 0), -2.9, 0.15, 1.7, 0, 0.3, 0, g); box(0.34, 0.04, 0.34, std(0x8a2f26, 0.9, 0), -2.9, 0.32, 1.7, 0, 0.3, 0, g);
  const pad = box(1.2, 0.0001, 0.5, black, 0, 0, 0, 0, 0, 0, g); pad.visible = false;
  pl(-3.0, 2.2, 0.6, 0xffd9a0, 0.65, 6);
  R.raidAnim = (dt) => { const t = performance.now() / 1000; for (const b of R.fans) b.rotation.z += dt * 14; for (let i = 0; i < R.dry.length; i++) R.dry[i].rotation.z = Math.sin(t * 1.3 + i) * 0.04 + 0.0; for (let i = 0; i < R.plants.length; i++) R.plants[i].rotation.z = Math.sin(t * 1.1 + i * 0.7) * 0.012; };
  for (const L of R.lights) if (L.color.getHex() === 0xb35bff) L.userData.base = L.intensity;
}

/* ---------------- spotting a site yourself ---------------- */
let hudEl = null, hudKey = "";
function hudBox() {
  if (hudEl) return hudEl; hudEl = document.createElement("div"); hudEl.id = "rdHud"; hudEl.hidden = true;
  hudEl.style.cssText = "position:fixed;top:112px;left:50%;transform:translateX(-50%);z-index:30;max-width:min(88vw,460px);padding:5px 12px;border-radius:10px;background:rgba(18,12,26,.6);border:1px solid rgba(190,130,255,.28);color:#eadcf8;font:600 13px/1.35 system-ui,sans-serif;letter-spacing:.02em;text-align:center;pointer-events:none;font-style:italic";
  document.body.appendChild(hudEl); return hudEl;
}
function setHud(t) { const el = hudBox(); if (t === hudKey) return; hudKey = t; el.hidden = !t; el.textContent = t; }
const scoped = () => { try { const A = window.TLXGUN && TLXGUN.AIM; if (!A || !A.on || A.t < 0.9) return 0; const g = TLXGUN.gun(); return g ? Math.max(1, TLXGUN.stats(g).zoom || 1) : 0; } catch (e) { return 0; } };
const _dir = { x: 0, y: 0, z: 1 };
// what is going on outside that a watcher could read: points with a weight (the door and its light, the generator, the drum fire, each man out of doors)
function signs(site) {
  const B = site.B, out = [], w = W(), dark = clamp(1 - api.dayFactor(), 0, 1); if (!B) return out;
  const add = (lx, lz, ly, wt, name) => { const p = B.pt(lx, lz); out.push({ x: p.x, z: p.z, y: B.y0 + ly, w: wt, name }); };
  add(B.pts.door[0], B.pts.door[1], B.door.fy + 1.8, 0.35 + (B.leakOp > 0.3 ? 0.55 : 0), "door");
  add(B.pts.gen[0], B.pts.gen[1], B.Y(B.pts.gen[0], B.pts.gen[1]) + 1.2, 0.3, "generator");
  add(B.parts.drum.top.lx, B.parts.drum.top.lz, B.parts.drum.top.ly, 0.15 + dark * 0.5, "fire");
  if (site.C) for (const f of site.C.figs) { if (f.inside || f.hidden) continue; const o = f.o, k = f.role === "dog" ? 0.2 : f.role === "rider" ? 0.5 : f.st === "pause" || f.st === "post" ? 0.55 : 0.8; out.push({ x: o.x, z: o.z, y: w.surf(o.x, o.z) + 1.4, w: k * (1 - 0.4 * dark), name: f.role }); }
  return out;
}
function readTick(site, dt) {
  const B = site.B, p = here(); if (!B || site.found) return false;
  const cam = api.camera, eye = cam.position, zoom = scoped(), range = TUNE.seen * (zoom ? Math.max(1.5, zoom * TUNE.scopeK) : 1);
  if (Math.hypot(eye.x - site.x, eye.z - site.z) > range + 40) { site.watch = 0; site.read = Math.max(0, site.read - TUNE.decay * dt); return false; }
  cam.getWorldDirection(V1); const fx = V1.x, fy = V1.y, fz = V1.z;
  let tot = 0, seen = 0; const dark = clamp(1 - api.dayFactor(), 0, 1), cone = Math.cos(zoom ? 0.09 : TUNE.cone);
  let dMin = 1e9; const dr = doorPt(B), dRef = Math.hypot(eye.x - dr.x, eye.z - dr.z);
  for (const s of signs(site)) {
    const dx = s.x - eye.x, dy = s.y - eye.y, dz = s.z - eye.z, d = Math.hypot(dx, dy, dz); if (d > range) continue;
    if ((dx * fx + dy * fy + dz * fz) / (d || 1) < cone) continue;
    if (!losPts(eye.x, eye.y, eye.z, s.x, s.y, s.z)) continue;
    tot += s.w; seen++; dMin = Math.min(dMin, d);
  }
  if (api.INT.on || api.GS.dead || api.tablet() || !api.started()) tot = 0;
  site.watch = tot > 0.01 ? tot : 0;
  if (tot > 0.01) {
    const act = Math.min(1.2, tot), closeK = 1 + 2.2 * (1 - clamp(dRef / range, 0, 1)), night = dark > 0.4 && B.leakOp > 0.3 ? 1.8 : 1;
    site.read = Math.min(1, site.read + TUNE.fill * (0.45 + act) * closeK * (zoom ? 2.2 : 1) * night * dt);
  } else site.read = Math.max(0, site.read - TUNE.decay * dt);
  if (site.read >= 1 && !site.found) { foundSite(site); return true; }
  return false;
}
function foundSite(site) {
  site.found = true; site.read = 1; site.foundDay = api.CAL.dayIndex(); const place = placeNear(site.x, site.z), tag = KIND_NAME(site.kind);
  api.toast(`You've spotted something: a ${tag} by ${place}. It's marked on your map and in Jobs (${api.btn("tablet")} opens the tablet).`, "good");
  try { api.TABLET.notify({ app: "armed", kind: "info", title: "Vakt · a place you found", body: `A ${tag} by ${place}, spotted by your own eyes. Nothing about it is in the news.`, ttl: 8 }); } catch (e) { }
  api.save(); try { api.TABLET.refresh("armed"); api.TABLET.refresh("jobs"); api.TABLET.refresh("map"); } catch (e) { }
}
const hudWord = site => site.read >= 0.7 ? `Something's off about that ${KIND_NAME(site.kind)}... somebody is keeping watch.` : `Something's off about that ${KIND_NAME(site.kind)}...`;

/* ---------------- the Map mark, the Jobs rows ---------------- */
const liveSites = () => { const s = S(); return s && TLX.on("raids") ? s.sites : []; };
const known = site => site.found || site.tipped;
function markList() {
  const out = [];
  for (const s of liveSites()) {
    if (!known(s)) continue; const tag = KIND_NAME(s.kind).toUpperCase();
    if (s.tipped) out.push({ x: s.x, z: s.z, name: `${tag}${s.found ? " · TIPPED, AND FOUND" : " · TIP"}`, glyph: "!", col: "#ff5a4a" });
    else out.push({ x: s.x, z: s.z, name: `${tag} · FOUND`, glyph: "?", col: "#f0b030" });
  }
  return out;
}
function tipOf(site) { const s = S(); return s.tips.filter(t => t.site === site.id).slice(-1)[0] || null; }
function jobRow(k) {
  const L = liveSites().filter(known); const s = L[k]; if (!s) return null; const U = api.ui, tag = KIND_NAME(s.kind), place = placeNear(s.x, s.z), tp = s.tipped ? tipOf(s) : null;
  const title = s.tipped ? `Tip: ${tag} by ${place}${s.found ? " (and found)" : ""}` : `Found: ${tag} by ${place}`;
  const endDay = (s.week + 1) * 7, left = Math.max(0, endDay - api.CAL.dayIndex());
  return { obj: s, kind: "raid", tgt: { x: s.x, z: s.z, name: `${tag} by ${place}` }, col: s.tipped ? "#ff5a4a" : "#f0b030", title, chips: U.chip(s.tipped ? "TIP-OFF" : "FOUND BY YOU", "due") + U.chip(tag.toUpperCase()),
    meta: s.tipped && tp ? `From ${tp.whoName}${tp.whoTrade ? ", " + tp.whoTrade : ""} · they move on in ${left} day${left === 1 ? "" : "s"} · armed crew, be careful` : `You spotted it yourself · they move on in ${left} day${left === 1 ? "" : "s"} · armed crew, be careful`,
    hud: d => ({ title, sub: `${U.fmtMi(d)} · ${s.tipped ? "tip-off" : "found"}` }) };
}
const jobFns = [0, 1, 2, 3].map(k => () => jobRow(k));

/* ---------------- tips ---------------- */
const TIPS = [
  { id: "t1", lines: ["Got a minute? Not on the phone.", "There's a barn out past {place} that nobody farms. Lights on at night, a generator going, and it isn't hay.", "You carry a rifle for {emp} and you keep your mouth shut. That's why I'm telling you."] },
  { id: "t2", lines: ["Between us: the old outbuilding by {place}.", "Vans in and out, a man on the door all day. My cousin drove past and was waved on with a look.", "Don't go in blind. They're not farmers."] },
  { id: "t3", lines: ["{emp} won't hear this from me. Near {place} there's a shed with its windows blacked out.", "Purple light after dark. You can see it from the ridge.", "Stay low if you go, and be quick about it."] },
  { id: "t4", lines: ["Somebody's growing out beyond {place}.", "Plastic tubs go in the back of a white van every day. I've counted.", "Thought you ought to know. Delete this."] },
  { id: "t5", lines: ["Heard you did right by us on the last job.", "So here's one back: the barn near {place}. A generator running day and night where nobody lives.", "They'll be gone by next week."] },
  { id: "t6", lines: ["You didn't hear this from {first}.", "Farm building past {place}: a chained dog, two men carrying boxes, a third one watching the road.", "The lensmann has enough to do. Maybe you don't."] },
  { id: "t7", lines: ["Quiet word: {place}, the barn nobody owns any more.", "Steam from the roof vent in thirty degrees of frost. Somebody is keeping it warm in there.", "Go careful."] },
  { id: "t8", lines: ["I drive that road. There's a snowed-in van by a barn off {place}.", "It hasn't moved in a week, but there are fresh tracks every morning.", "I'd stay clear. But you're not the type."] },
  { id: "t9", lines: ["Off the record, from the {emp} desk: a place near {place}.", "Power they can't account for, a barn with no tenant, men who don't wave back. Treat it as dangerous.", "Good through this week only."] },
  { id: "t10", lines: ["Heard the dog first. Then the generator.", "Barn out by {place}, windows blacked out.", "That's all I'll say, and I never said it."] },
  { id: "t11", lines: ["You've been steady for us, so: {place}.", "A grow in a barn with every lamp burning. Four or five of them, and one always on the door.", "Take care of yourself out there."] },
  { id: "t12", lines: ["Somebody cut a track in to the old barn past {place} and keeps hauling bin bags out.", "They burn the rubbish in a drum at night. The smell is wrong.", "Thought of you."] }
];
const stand = () => (window.TLXAW && TLXAW.standing) ? TLXAW.standing() : { all: 0 };
function tipReady() {
  const s = S(), st = stand(), rec = window.TLXAW ? TLXAW.S().rec : { done: 0 }, day = api.CAL.dayIndex();
  if (st.all < TUNE.tipMin || rec.done < TUNE.tipJobs) return false;
  if (s.last.day >= day) return false;                                      // one a game day
  return st.all - s.last.pts >= (s.tipN ? TUNE.tipEvery : 0);
}
function giveTip(j, force) {
  const s = S(); if (!TLX.on("raids")) return null;
  const L = s.sites.filter(q => !q.tipped); if (!L.length) return null;
  const R = rng(hashS("tip:" + s.seq + ":" + s.sites.length + ":" + (j ? j.id : "x"))), nf = L.filter(q => !q.found), pool = nf.length ? nf : L, site = pool[Math.floor(R() * pool.length)];
  const emp = (j && j.emp) || "kommune", per = window.TLXAW ? TLXAW.contact(emp, j && j.post) : null, EMPN = window.TLXAW ? TLXAW.EMP[emp] : null;
  const empName = EMPN ? EMPN.name : "the office", tpl = TIPS[Math.floor(R() * TIPS.length)], place = placeNear(site.x, site.z);
  const whoName = per ? `${per.first} ${per.last}` : (EMPN && EMPN.state ? "The duty desk" : "The office"), first = per ? per.first : "a friend";
  const lines = tpl.lines.map(l => l.replace(/\{place\}/g, place).replace(/\{emp\}/g, empName).replace(/\{first\}/g, first));
  const tip = { id: "tip" + (++s.seq), site: site.id, kind: site.kind, x: site.x, z: site.z, place, whoName, whoTrade: per ? per.trade : "", whoVillage: per ? per.village : "", emp, empName, lines, day: api.CAL.dayIndex(), label: api.CAL.now().label, time: api.fmtTime(hourNow()), tpl: tpl.id, stale: false, read: false };
  s.tips.push(tip); if (s.tips.length > 20) s.tips.shift();
  site.tipped = true; s.tipN++; s.last = { day: api.CAL.dayIndex(), pts: stand().all };
  api.toast(`A tip from ${whoName}: a message in the Vakt app, and a ${KIND_NAME(site.kind)} is marked on your map (${api.btn("tablet")} opens the tablet).`, "good");
  try { api.TABLET.notify({ app: "armed", kind: "info", title: `Vakt · ${whoName}`, body: lines[0], ttl: 8 }); } catch (e) { }
  api.save(); try { api.TABLET.refresh("armed"); api.TABLET.refresh("jobs"); api.TABLET.refresh("map"); } catch (e) { }
  return tip;
}
function afterJob(j) { try { if (TLX.on("raids") && tipReady()) giveTip(j); } catch (e) { console.warn("tlx-raids tip", e); } }

/* ---------------- the Vakt app's Tips tab ---------------- */
function tipsHtml() {
  const s = S(), U = api.ui; if (!TLX.on("raids")) return `<p class="tnote2">Drug sites and tip-offs are switched off in Settings &gt; Options. Switch "Drug sites and tip-offs" back on to hear about them.</p>`;
  const st = stand(); let h = U.sec("Tip-offs", `${s.tips.length} message${s.tips.length === 1 ? "" : "s"}`);
  if (!s.tips.length) h += `<p class="tnote2">Nothing yet. People pass a word to someone they trust: finish armed work for the state and for companies and keep the rifle on your back. Armed standing ${st.all}. The first tip comes with about ${TUNE.tipJobs} finished jobs and ${TUNE.tipMin} points.</p>`;
  for (const t of s.tips.slice().reverse()) {
    const site = s.sites.find(q => q.id === t.site), stale = t.stale || !site;
    h += `<div class="tcard"><div class="tcb"><div class="tcm"><b>${esc(t.whoName)}</b>${t.whoTrade ? ` · ${esc(t.whoTrade)}${t.whoVillage ? ", " + esc(t.whoVillage) : ""}` : ""} · ${esc(t.label)} ${esc(t.time)} ${stale ? `<span class="bchip">STALE</span>` : `<span class="bchip due">LIVE</span>`}</div>` +
      t.lines.map(l => `<div class="tnote2" style="margin:5px 0">“${esc(l)}”</div>`).join("") + (stale ? `<div class="tnote2" style="margin:5px 0;color:#e8a090">The crew has moved on: whatever was out there is gone. This tip is no use now.</div>` : `<div class="tcm">On your map and in Jobs · they move on at the end of the week.</div>`) + `</div></div>`;
  }
  const found = s.sites.filter(q => q.found && !q.tipped);
  if (found.length) { h += U.sec("Places you found", "your own eyes"); h += found.map(q => `<div class="tcard"><div class="tcb"><div class="tcm"><b>${esc(KIND_NAME(q.kind))} by ${esc(placeNear(q.x, q.z))}</b> · spotted by you, nobody told you. Nothing about it is in the news.</div></div></div>`).join(""); }
  h += `<p class="tnote2">Armed standing: ${st.all} points. Tips come from people you have worked beside, never more than one a day, and only for places that are really out there this week.</p>`;
  return h;
}
const unread = () => { const s = S(); return s ? s.tips.filter(t => !t.read).length : 0; };

/* ---------------- news ---------------- */
function newsCheck() {
  if (!window.TLXN || !TLXN.post || !TLXN.people || !TLXN.people.length) return;
  const day = api.CAL.dayIndex();
  for (const s of liveSites()) {
    if (s.told || day - s.week * 7 < 3) continue; s.told = true;
    try {
      const v = TLXN.villages().slice().sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0], L = TLXN.people.filter(p => p.vid === (v && v.id) && p.age >= 30), who = L.length ? L[hashS(s.id) % L.length] : null, place = placeNear(s.x, s.z);
      TLXN.post({ kind: "odd", who, x: s.x, z: s.z, text: `${who ? who.first + " " + who.last : "Somebody"} says there have been lights and a generator running out by ${place} for days now, where nobody lives, and a white van that never seems to leave. "Odd goings-on," they say.`, data: { sys: "raids", what: "odd", site: s.id } });
    } catch (e) { }
  }
}

/* ---------------- the weeks ---------------- */
function retire(site, why) {
  const s = S(); disposeSite(site); s.sites = s.sites.filter(q => q !== site);
  for (const t of s.tips) if (t.site === site.id) t.stale = true;
  try { api.TABLET.refresh("armed"); api.TABLET.refresh("jobs"); api.TABLET.refresh("map"); } catch (e) { }
}
function weekCheck() {
  const s = S(), wk = weekNow(), p = here();
  // the roads and the trails are laid after the world: seeding waits for them, or a spot would be judged against half a map
  if (((window.TLXR && !TLXR.ready) || (window.TLXSK && !TLXSK.ready)) && ++seedWait < 60) return;
  if (s.week !== wk && (!s.sites.length || s.week < wk)) {
    const mine = seedWeek(wk), have = new Set(s.sites.map(q => q.id));
    for (const q of mine) if (!have.has(q.id)) s.sites.push(q);
    s.week = wk;
  }
  for (const site of s.sites.slice()) if (site.week < wk) {
    const d = Math.hypot(p.x - site.x, p.z - site.z), sight = d < 380 && losPts(p.x, W().surf(p.x, p.z) + 1.6, p.z, site.x, W().surf(site.x, site.z) + 2, site.z);
    if (!sight) retire(site, "moved");
  }
}

/* ---------------- the barn door (locked until A2b) ---------------- */
const PROV = {
  use() {
    if (!TLX.on("raids") || !api.FOOT.on || api.INT.on) return null; const p = api.FOOT;
    for (const site of liveSites()) { const B = site.B; if (!B || site.testOpen) continue; const d = doorPt(B); if (Math.hypot(p.x - d.x, p.z - d.z) < 3.3) return { label: "TRY DOOR", hint: () => api.keyHint("use", "try the barn door"), act: () => api.toast("The barn door is bolted from the inside. Nobody answers, and somebody is watching you try it.", "warn") }; }
    return null;
  },
  digging: () => false
};
/* ---------------- state ---------------- */
function sane(s) {
  const n = (v, d) => Number.isFinite(+v) ? +v : d, isO = o => o && typeof o === "object" && !Array.isArray(o);
  s.week = Math.floor(n(s.week, -1)); s.seq = Math.floor(n(s.seq, 0)); s.tipN = Math.floor(n(s.tipN, 0));
  s.sites = (Array.isArray(s.sites) ? s.sites : []).filter(q => isO(q) && typeof q.id === "string" && KINDS[q.kind] && Number.isFinite(+q.x) && Number.isFinite(+q.z) && Number.isFinite(+q.ry)).map(q => {
    const live = Object.prototype.hasOwnProperty.call(q, "B"), f = { id: q.id, kind: q.kind, x: +q.x, z: +q.z, ry: +q.ry, week: Math.floor(n(q.week, 0)), n: clamp(Math.floor(n(q.n, 4)), 3, 5), seed: Math.floor(n(q.seed, 1)), found: q.found === true, tipped: q.tipped === true, read: clamp(n(q.read, 0), 0, 1), told: q.told === true, rider: q.rider === true, foundDay: n(q.foundDay, 0) };
    if (isO(q.room) && Array.isArray(q.room.cash)) f.room = q.room;
    return live ? Object.assign(q, f) : mkSite(f);     // a live site keeps its meshes and its crew: the object stays the same one
  });
  s.tips = (Array.isArray(s.tips) ? s.tips : []).filter(t => isO(t) && typeof t.id === "string" && Array.isArray(t.lines) && typeof t.site === "string").slice(-20).map(t => ({ id: t.id, site: t.site, kind: t.kind || "grow", x: n(t.x, 0), z: n(t.z, 0), place: String(t.place || ""), whoName: String(t.whoName || "Someone"), whoTrade: String(t.whoTrade || ""), whoVillage: String(t.whoVillage || ""), emp: String(t.emp || ""), empName: String(t.empName || ""), lines: t.lines.map(String).slice(0, 5), day: n(t.day, 0), label: String(t.label || ""), time: String(t.time || ""), tpl: String(t.tpl || ""), stale: t.stale === true, read: t.read === true }));
  if (!isO(s.last)) s.last = { day: -9, pts: 0 }; s.last = { day: n(s.last.day, -9), pts: n(s.last.pts, 0) };
  for (const t of s.tips) if (!s.sites.some(q => q.id === t.site)) t.stale = true;
}
TLX.register({
  id: "raids", v: 1,
  state0: () => ({ week: -1, sites: [], tips: [], seq: 0, tipN: 0, last: { day: -9, pts: 0 } }),
  migrate: st => st,
  init(a) {
    api = a; T = a.THREE; V1 = new T.Vector3(); V2 = new T.Vector3(); V3 = new T.Vector3(); built = false; const s = S(); if (!s) return; sane(s);
    for (const b of SITES_LIVE.slice()) disposeSite(b.site);
    if (a.jobx) for (const f of jobFns) if (!a.jobx.includes(f)) a.jobx.push(f);
    if (a.footx && !a.footx.includes(PROV)) a.footx.push(PROV);
    if (a.TABLET.addLayer && !markPinned) { markPinned = true; a.TABLET.addLayer("marks", markList); }
    if (window.TLXAW && TLXAW.extraTab) TLXAW.extraTab({ id: "tips", label: "Tips", badge: () => unread() || "", html: tipsHtml, bind: () => { const q = S(); let ch = false; for (const t of q.tips) if (!t.read) { t.read = true; ch = true; } if (ch) a.save(); } });
    a.__rider = window.TLXAW && TLXAW.rider; built = true;
  },
  tick: dt => tick(dt),
  save() { sane(S()); }
});
let markPinned = false, accT = 0, seedWait = 0;
function tick(dt) {
  const s = S(); if (!api || !s || !built || dt <= 0) return;
  if (!TLX.on("raids")) { for (const b of SITES_LIVE.slice()) disposeSite(b.site); setHud(""); genSound(0); return; }
  smokeTick(dt);
  if (!api.started()) return;
  accT -= dt; if (accT <= 0) { accT = 1; try { weekCheck(); newsCheck(); } catch (e) { console.warn("tlx-raids week", e); } }
  const p = here(); let spawned = false, genVol = 0, hud = "", watched = null;
  for (const site of s.sites) {
    const d = Math.hypot(p.x - site.x, p.z - site.z);
    if (!site.B && d < TUNE.buildR && !spawned) { buildSite(site); spawned = true; }
    else if (site.B && d > TUNE.dropR) { disposeSite(site); continue; }
    if (!site.B) continue;
    siteTick(site, dt, d);
    if (d < TUNE.crewR && !site.C && !spawned) { spawnCrew(site); }
    if (site.C && site.C.queue.length && !spawned && d < TUNE.crewR) { spawnStep(site); spawned = true; }
    else if (site.C && d > TUNE.crewDrop) freeCrew(site);
    if (site.C && !site.C.queue.length) crewTick(site, dt);
    if (d < 260) genVol = Math.max(genVol, (1 - d / 260) ** 1.6 * (site.B.genPause ? 0.5 : 1));
    if (readTick(site, dt)) { }
    if (!site.found && site.read >= TUNE.hudAt && site.watch > 0) watched = site;
  }
  genSound(genVol);
  if (watched) hud = hudWord(watched);
  setHud(hud);
  if (api.INT.on && api.INT.room && api.INT.room.raidAnim) api.INT.room.raidAnim(dt);
}

/* ---------------- test hooks ---------------- */
function testEnter(id) {
  const site = S().sites.find(q => q.id === id); if (!site) return false; if (!site.B) buildSite(site); const b = site.B && site.B.beacon; if (!b) return false;
  site.testOpen = true; b.g.visible = true; const F = api.FOOT; F.on = true; F.x = b.x; F.z = b.z; F.y = W().surf(b.x, b.z); F.sp = F.fwd = 0; F.yaw = site.ry + Math.PI; try { api.camState.init = false; } catch (e) { } if (F.g) F.g.visible = true; return true;
}
window.TLXRD = {
  S, KINDS, TUNE, ROLE, SCHED, LVL, TIPS, SITES_LIVE, FIGPOOL, HX, HZ,
  live: liveSites, weekNow, seedWeek, spotOk, placeNear, build: buildSite, dispose: disposeSite, retire, weekCheck, newsCheck, sane,
  spawn: site => { if (!site.B) buildSite(site); spawnCrew(site); while (spawnStep(site)); return site.C; }, freeCrew,
  crew: site => site.C, react: site => site.C && site.C.react, fig: (site, role) => site.C && site.C.figs.find(f => f.role === role),
  markList, jobRow, jobFns, afterJob, giveTip, tipReady, tipsHtml, unread, testEnter, signs, foundSite, readTick, scoped,
  hud: () => hudKey, PROV, promptLine: () => api.keyHint("use", "try the barn door"), known, tipOf, losPts, growRoom, fp, handIK, mats, smokeCount: () => SM.pool.filter(s => s.visible).length, genVol: () => GEN.vol
};
})();
