// Tracklayer: the Field guide (goal G7, loop/HOME.md I7). Every animal and fish of the land has a page that fills in
// as you meet it: your best photograph (from the Camera), how often, when (by hour and month) and where (pins on the
// map) you have seen it, how close it has let you, its TRACKS and its DEN once found.
//
// TRACKS ARE IN THE WORLD. Animals leave prints in the snow as they move, and each one you come across already has a
// back-trail behind it, older the further back it goes, that begins at its den (a fixed place: a fox earth, a bear's
// den, lemming holes, a hare's form, a stoat's scree, a moose bed, the reindeers' feeding craters). Stand over a
// print on foot and the use control reads it: whose, how old, which way. Follow it forward for the animal, back for
// the den. Snow covers prints; a storm wipes them.
(() => {
"use strict";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, TAU = Math.PI * 2;
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };
let api = null, S = null, W = null;
const X = window.TLXFG = { err: "", page: "", prints: [], dens: [], ready: false, lastRead: null };
const CARD = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
const SP = {
  reindeer: { name: "Reindeer", local: "rein", group: "Mammals", cls: "hoof", pw: 0.11, stride: 1.35, track: "Two crescents side by side, the dew claws showing behind in soft snow. Many together: a herd walks in each other's steps.", eats: "Lichen dug out from under the snow, sedge, birch tips.", note: "Semi-tame and owned by somebody. Lets a quiet walker close; a sled sends the whole herd off.", den: "feeding craters", denNote: "Pits dug down to the lichen. A herd comes back to them until they ice over." },
  moose: { name: "Moose", local: "elg", group: "Mammals", cls: "hoof", pw: 0.16, stride: 2.2, track: "A long pointed cloven print as big as your hand, deep, a metre and more apart.", eats: "Birch and willow twigs, pine shoots in a hard winter.", note: "Stands its ground. A cow with a calf will come at you: give her room.", den: "bed", denNote: "A melted oval in the snow under the birches where it lay up. Droppings beside it." },
  fox: { name: "Fox", local: "rev", group: "Mammals", cls: "paw", pw: 0.05, stride: 0.55, track: "Small neat paw prints in one straight line, each hind foot set in the fore print.", eats: "Lemmings, hares, eggs, whatever the tide and the village leave.", note: "Curious at a distance, gone the moment you step towards it.", den: "earth", denNote: "A hole in a dry bank with a fan of dug soil and a strong smell. Used year after year." },
  hare: { name: "Mountain hare", local: "hare", group: "Mammals", cls: "bound", pw: 0.09, stride: 0.8, track: "Groups of four: two small prints one behind the other, and the two long hind feet landing ahead of them.", eats: "Willow and birch bark, heather under the snow.", note: "White in winter and trusts it: sits tight until you nearly tread on it.", den: "form", denNote: "A shallow scrape in the lee of a stone, packed smooth, where it sits out the day." },
  lemming: { name: "Lemming", local: "lemen", group: "Mammals", cls: "tiny", pw: 0.025, stride: 0.1, track: "A stitching of tiny paired dots between holes in the snow, never far.", eats: "Moss, sedge and grass, under the snow all winter.", note: "Stands and scolds anything, a snowmobile included. In a lemming year they are everywhere.", den: "burrows", denNote: "Round holes down through the snow to the tunnels in the moss." },
  ermine: { name: "Stoat", local: "røyskatt", group: "Mammals", cls: "bound", pw: 0.035, stride: 0.38, track: "Pairs of small prints, a long bound between each pair, diving under the snow and out again.", eats: "Lemmings and voles, hunted in their own tunnels.", note: "All white but the black tail tip. Never still: you get a few seconds.", den: "scree", denNote: "A gap among stones, lined with lemming fur." },
  bear: { name: "Bear", local: "bjørn", group: "Mammals", cls: "paw", pw: 0.2, stride: 1.7, track: "A broad paw with five toes and the claw marks well ahead of them; the hind print long like a bare foot.", eats: "Anything. Roots, berries, carrion, a reindeer calf.", note: "Do not go closer. If it faces you and huffs, back away.", den: "den", denNote: "A hole dug into a snowed-over slope, the entrance iced from breath." }
};
X.SP = SP;
const hod = () => ((api.GS.hour % 24) + 24) % 24;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function mon() { try { const c = api.CAL.now(); for (const k of ["month", "mo", "mon", "m"]) if (typeof c[k] === "number") return clamp(Math.round(c[k]) - (k === "m" && c[k] > 11 ? 1 : 0), 0, 11) % 12; const i = MON.findIndex(n => (c.label || "").indexOf(n) >= 0); if (i >= 0) return i; } catch (e) { } return 0; }
function area(x, z) { let b = null, bd = 1e9; for (const s of W.SITES || []) { if (s.x === undefined || !s.name || (s.type !== "village" && s.type !== "depot" && s.type !== "cabin")) continue; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; b = s; } } return b ? (bd < 400 ? b.name : "near " + b.name) : "the fell"; }
const rec = k => S.sp[k] || (S.sp[k] = { n: 0, first: 0, last: 0, close: 0, hours: [0, 0, 0, 0, 0, 0, 0, 0], months: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], pins: [], tracks: 0, photo: null, areas: {} });
X.count = () => { const all = Object.keys(SP).length + fishAll().length; let seen = 0; for (const k in SP) if (S.sp[k] && (S.sp[k].n || S.sp[k].photo)) seen++; return { seen: seen + fishGot().length, all }; };
const fishAll = () => window.TLFish && TLFish.SPECIES ? Object.keys(TLFish.SPECIES) : [];
const fishBest = () => { try { return (api.GS.fish && api.GS.fish.log && api.GS.fish.log.best) || {}; } catch (e) { return {}; } };
const fishGot = () => { const b = fishBest(); return fishAll().filter(k => b[k]); };

/* ---------------- dens: one fixed place a 600 m cell and kind ---------------- */
const CELLM = 600;
function denOf(kind, x, z) {
  const cx = Math.floor(x / CELLM), cz = Math.floor(z / CELLM), id = kind + ":" + cx + ":" + cz; let d = X.denCache[id]; if (d !== undefined) return d;
  d = null; for (let t = 0; t < 14 && !d; t++) { const dx = (cx + 0.12 + 0.76 * hash(id + "x" + t)) * CELLM, dz = (cz + 0.12 + 0.76 * hash(id + "z" + t)) * CELLM; if (W.isSea(dx, dz) || W.isWater(dx, dz) || W.slopeAt(dx, dz, 4) > 0.4 || W.obNear(dx, dz, 6)) continue; if ((W.SITES || []).some(s => s.x !== undefined && Math.hypot(s.x - dx, s.z - dz) < 140)) continue; d = { id, kind, x: dx, z: dz, yaw: hash(id + "y") * TAU }; }
  return (X.denCache[id] = d);
}
X.denCache = {}; X.denOf = denOf;
const denPool = [];
function denMesh(kind) {
  const TH = api.THREE, g = new TH.Group(), snow = api.mesh.std(0xe9eef4, 0.95, 0), dark = new TH.MeshBasicMaterial({ color: 0x0c0f13 }), soil = api.mesh.std(0x4a3d2e, 1, 0), rock = api.mesh.std(0x6e7278, 0.9, 0);
  const mound = (rx, ry, rz, x, z, m) => { const o = new TH.Mesh(new TH.SphereGeometry(1, 12, 8), m || snow); o.scale.set(rx, ry, rz); o.position.set(x || 0, ry * 0.25, z || 0); g.add(o); return o; };
  const hole = (r, x, y, z, tilt) => { const o = new TH.Mesh(new TH.CircleGeometry(r, 14), dark); o.position.set(x, y, z); o.rotation.x = -Math.PI / 2 + (tilt || 0); g.add(o); return o; };
  if (kind === "fox") { mound(1.5, 0.8, 1.2); hole(0.17, 0, 0.42, 1.02, 1.1); const f = new TH.Mesh(new TH.CircleGeometry(0.6, 12), soil); f.rotation.x = -Math.PI / 2; f.position.set(0, 0.04, 1.6); f.scale.set(1, 1.5, 1); g.add(f); }
  else if (kind === "bear") { mound(3.2, 1.7, 2.6); hole(0.5, 0, 0.75, 2.2, 1.15); mound(0.9, 0.3, 0.6, 0, 2.9); }
  else if (kind === "lemming") { for (let i = 0; i < 6; i++) hole(0.035, Math.cos(i * 2.1) * (0.25 + i * 0.09), 0.03, Math.sin(i * 2.1) * (0.25 + i * 0.09)); }
  else if (kind === "hare") { const r = new TH.Mesh(new TH.DodecahedronGeometry(0.55, 0), rock); r.position.set(0, 0.3, -0.4); r.scale.set(1.3, 0.9, 0.9); g.add(r); const f = new TH.Mesh(new TH.CircleGeometry(0.28, 12), api.mesh.std(0xcfd8e2, 1, 0)); f.rotation.x = -Math.PI / 2; f.position.set(0, 0.035, 0.15); f.scale.set(1, 1.4, 1); g.add(f); }
  else if (kind === "ermine") { for (let i = 0; i < 5; i++) { const r = new TH.Mesh(new TH.DodecahedronGeometry(0.22 + (i % 3) * 0.08, 0), rock); r.position.set(Math.cos(i * 1.3) * 0.35, 0.14 + (i % 2) * 0.12, Math.sin(i * 1.3) * 0.3); g.add(r); } hole(0.05, 0.1, 0.16, 0.42, 1.2); }
  else if (kind === "moose") { const f = new TH.Mesh(new TH.CircleGeometry(1, 16), api.mesh.std(0xbcc8d4, 1, 0)); f.rotation.x = -Math.PI / 2; f.position.y = 0.035; f.scale.set(0.8, 1.5, 1); g.add(f); for (let i = 0; i < 7; i++) { const p = new TH.Mesh(new TH.SphereGeometry(0.035, 6, 5), soil); p.position.set(1 + Math.cos(i) * 0.14, 0.05, Math.sin(i * 1.7) * 0.14); g.add(p); } }
  else { for (let i = 0; i < 4; i++) { const f = new TH.Mesh(new TH.CircleGeometry(0.55 + (i % 2) * 0.2, 12), api.mesh.std(0x7d8468, 1, 0)); f.rotation.x = -Math.PI / 2; f.position.set(Math.cos(i * 1.7) * 1.6, 0.04, Math.sin(i * 1.7) * 1.6); g.add(f); mound(0.5, 0.22, 0.3, Math.cos(i * 1.7) * 1.6 + 0.7, Math.sin(i * 1.7) * 1.6); } }
  g.traverse(o => { o.frustumCulled = true; }); api.scene.add(g); return g;
}
function densTick(px, pz) {
  // dens that matter near you: the ones you have found, and the ones an animal out now came from
  const want = []; for (const id in S.dens) { const d = S.dens[id]; if (Math.hypot(d.x - px, d.z - pz) < 320) want.push(denOf(d.kind, d.x, d.z)); }
  for (const G of api.wild.groups()) if (G._den && Math.hypot(G._den.x - px, G._den.z - pz) < 320 && !want.includes(G._den)) want.push(G._den);
  X.dens = want.filter(Boolean).slice(0, 5);
  for (const p of denPool) p.used = false;
  for (const d of X.dens) { let p = denPool.find(q => q.id === d.id); if (!p) { p = denPool.find(q => !q.used && q.kind === d.kind && !X.dens.some(e => e.id === q.id)); if (!p) { p = { g: denMesh(d.kind), kind: d.kind }; denPool.push(p); } p.id = d.id; p.g.position.set(d.x, W.surf(d.x, d.z) - 0.02, d.z); p.g.rotation.y = d.yaw; } p.used = true; p.g.visible = true;
    if (!S.dens[d.id] && Math.hypot(d.x - px, d.z - pz) < 7) { S.dens[d.id] = { kind: d.kind, x: Math.round(d.x), z: Math.round(d.z), t: api.GS.hour }; const sp = SP[d.kind]; api.toast(`Field guide: ${sp.name.toLowerCase()} ${sp.den} found, ${area(d.x, d.z)}.`, "good"); api.save(); } }
  for (const p of denPool) if (!p.used) p.g.visible = false;
}

/* ---------------- prints ---------------- */
const CLS = { hoof: { cap: 260 }, paw: { cap: 200 }, bound: { cap: 160 }, tiny: { cap: 120 } };
function printTex(cls) {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); g.fillStyle = "#fff";
  const el = (x, y, rx, ry, r) => { g.beginPath(); g.ellipse(x, y, rx, ry, r || 0, 0, TAU); g.fill(); };
  if (cls === "hoof") { el(24, 30, 8, 20, 0.12); el(40, 30, 8, 20, -0.12); el(22, 57, 3.5, 4); el(42, 57, 3.5, 4); }
  else if (cls === "paw") { el(32, 42, 14, 12); for (let i = 0; i < 4; i++) el(14 + i * 12, 20 - (i === 1 || i === 2 ? 5 : 0), 5, 6.5); }
  else if (cls === "bound") { el(20, 14, 6, 13, 0.15); el(44, 14, 6, 13, -0.15); el(30, 40, 5, 6); el(34, 54, 5, 6); }
  else { el(24, 22, 6, 7); el(40, 22, 6, 7); el(24, 44, 6, 7); el(40, 44, 6, 7); }
  const t = new api.THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}
function printsInit() {
  const TH = api.THREE; X.M = {}; X.fresh = new TH.Color(0.42, 0.47, 0.56); X.old = new TH.Color(0.86, 0.89, 0.93);
  for (const k in CLS) { const geo = new TH.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2); const mat = new TH.MeshLambertMaterial({ map: printTex(k), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, alphaTest: 0.2 }); const m = new TH.InstancedMesh(geo, mat, CLS[k].cap); m.count = 0; m.frustumCulled = false; m.renderOrder = 2; api.scene.add(m); X.M[k] = { m, list: [], next: 0, dirty: false }; }
  X._o = new TH.Object3D(); X._c = new TH.Color();
}
function addPrint(kind, x, z, yaw, born) {
  const sp = SP[kind], B = X.M[sp.cls]; if (!B || W.isSea(x, z) || W.isWater(x, z)) return; const cap = CLS[sp.cls].cap, p = { kind, x, z, yaw, born, y: W.surf(x, z) + 0.035, s: sp.pw * (sp.cls === "bound" ? 4.2 : sp.cls === "tiny" ? 3 : 2.1) };
  if (B.list.length < cap) B.list.push(p); else { B.list[B.next] = p; B.next = (B.next + 1) % cap; } B.dirty = true;
}
X.addPrint = addPrint;
const ageOf = p => api.GS.hour - p.born;
function printsDraw() {
  for (const k in X.M) { const B = X.M[k]; if (!B.dirty) continue; B.dirty = false; const o = X._o; let i = 0;
    for (const p of B.list) { const a = clamp(ageOf(p) / 20, 0, 1); o.position.set(p.x, p.y, p.z); o.rotation.set(0, p.yaw, 0); o.scale.set(p.s, 1, p.s); o.updateMatrix(); B.m.setMatrixAt(i, o.matrix); X._c.copy(X.fresh).lerp(X.old, a); B.m.setColorAt(i, X._c); i++; }
    B.m.count = i; B.m.instanceMatrix.needsUpdate = true; if (B.m.instanceColor) B.m.instanceColor.needsUpdate = true; }
}
// snow covers them: a print older than 20 h has gone, and falling snow ages them all
function printsAge(dtH) {
  const storm = api.GS.storm || 0, extra = storm > 0.15 ? dtH * storm * 14 : 0;
  for (const k in X.M) { const B = X.M[k]; let ch = extra > 0; if (extra) for (const p of B.list) p.born -= extra; const n0 = B.list.length; B.list = B.list.filter(p => ageOf(p) < 20); if (B.list.length !== n0) { B.next = 0; ch = true; } if (ch || Math.random() < 0.05) B.dirty = true; }
}
// the trail an animal already had behind it when you came upon it: from its den, older the further back
function backTrail(G) {
  const sp = SP[G.kind]; if (!sp) return; const den = denOf(G.kind, G.x, G.z); G._den = den || null;
  const sx = den ? den.x : G.x - Math.sin(G.yaw) * 180, sz = den ? den.z : G.z - Math.cos(G.yaw) * 180, L = Math.hypot(G.x - sx, G.z - sz); if (L < 6) return;
  const walkL = Math.min(L, sp.cls === "tiny" ? 40 : 520), gap = Math.max(sp.stride, walkL / 110), n = Math.floor(walkL / gap), nx = (G.x - sx) / L, nz = (G.z - sz) / L, ph = hash(G.kind + Math.round(G.x)) * 9, amp = Math.min(14, L * 0.08), oldest = sp.cls === "tiny" ? 1 : clamp(L / 90, 1, 9);
  for (let i = 0; i <= n; i++) { const d = L - walkL + i * gap, k = d / L, w = Math.sin(k * Math.PI) * amp, off = Math.sin(d * 0.045 + ph) * w + Math.sin(d * 0.011 + ph * 2) * w * 0.6, dd = Math.cos(d * 0.045 + ph) * 0.045 * w; const side = (i % 2 ? 1 : -1) * sp.pw * (sp.cls === "bound" || sp.cls === "tiny" ? 0 : 0.9);
    addPrint(G.kind, sx + nx * d - nz * (off + side), sz + nz * d + nx * (off + side), Math.atan2(nx - nz * dd, nz + nx * dd), api.GS.hour - oldest * (1 - i / Math.max(1, n)) - 0.05); }
}
function liveTrail(G) {
  const sp = SP[G.kind], gap = Math.max(sp.stride, 0.35) * (G.state === "flee" ? 1.7 : 1);
  for (const q of G.m) { if (q.dead) continue; if (q._fx === undefined) { q._fx = q.x; q._fz = q.z; q._fs = 0; continue; } const dx = q.x - q._fx, dz = q.z - q._fz, d = Math.hypot(dx, dz); if (d < gap) continue; if (d > 60) { q._fx = q.x; q._fz = q.z; continue; }
    const nx = dx / d, nz = dz / d, n = Math.min(8, Math.floor(d / gap)), yaw = Math.atan2(dx, dz);
    for (let i = 1; i <= n; i++) { q._fs ^= 1; const side = (q._fs ? 1 : -1) * sp.pw * (sp.cls === "bound" || sp.cls === "tiny" ? 0 : 0.9), k = d * i / n; addPrint(G.kind, q._fx + nx * k - nz * side, q._fz + nz * k + nx * side, yaw, api.GS.hour); }
    q._fx = q.x; q._fz = q.z; }
}
function nearPrint(x, z, r) { let best = null, bd = r; for (const k in X.M) for (const p of X.M[k].list) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } } return best; }
X.nearPrint = nearPrint;
function read(p) {
  const sp = SP[p.kind], r = rec(p.kind), a = ageOf(p), known = r.n > 0 || r.photo || r.tracks > 0, b = ((p.yaw * 180 / Math.PI) % 360 + 360) % 360, way = CARD[Math.round(b / 45) % 8];
  const how = a < 0.25 ? "minutes old, the edges still sharp" : a < 1.5 ? "about an hour old" : a < 5 ? "a few hours old, the edges going soft" : a < 12 ? "from earlier today, half drifted in" : "old, nearly gone";
  const first = !r.tracks; r.tracks++; if (first) { api.toast(`Field guide: ${sp.name.toLowerCase()} tracks added.`, "good"); api.save(); }
  const text = `${known || first ? sp.name : "Something"} tracks, ${how}, heading ${way}.` + (a < 1.5 ? " It is not far ahead." : a > 5 ? " Follow them back and you may find where it lies up." : "");
  X.lastRead = { kind: p.kind, age: a, way, text, first }; api.toast(text); return X.lastRead;
}
X.read = read;
const kh = (a, w) => api.INP.dev === "touch" ? "tap " + api.btn(a) : api.btn(a) + ": " + w;
const FOOTX = { use() { if (!api.FOOT.on || !X.ready || (api.INT && api.INT.on)) return null; if (window.TLXFOLK && TLXFOLK.near && TLXFOLK.near(2.8)) return null; const p = nearPrint(api.FOOT.x, api.FOOT.z, 1.5); if (!p) return null; return { label: "TRACKS", hint: () => kh("use", "read the tracks"), act: () => read(p) }; } };
X.FOOTX = FOOTX;

/* ---------------- sightings ---------------- */
let _dir = null;
function sight(px, pz) {
  const cam = api.camera; if (!_dir) _dir = new api.THREE.Vector3(); cam.getWorldDirection(_dir); const h = hod(), m = mon();
  for (const G of api.wild.groups()) {
    if (!SP[G.kind] || G.state === "dead") continue; const d = Math.hypot(G.x - px, G.z - pz);
    if (!G._fgTrail && d < 520) { G._fgTrail = 1; backTrail(G); }
    if (d < 320) liveTrail(G);
    if (d > 190) continue; let seen = d < 22;
    if (!seen) { const q = G.m[0], dx = q.x - cam.position.x, dz = q.z - cam.position.z, dy = W.surf(q.x, q.z) + 0.5 - cam.position.y, L = Math.hypot(dx, dy, dz); if ((dx * _dir.x + dy * _dir.y + dz * _dir.z) / L > 0.78) { seen = true; for (let i = 1; i < 6; i++) { const k = i / 6; if (W.surf(lerp(cam.position.x, q.x, k), lerp(cam.position.z, q.z, k)) > lerp(cam.position.y, cam.position.y + dy, k) + 0.4) { seen = false; break; } } } }
    if (!seen) continue; const r = rec(G.kind);
    if (!G._fgSeen) { G._fgSeen = 1; const first = !r.n; r.n++; if (first) r.first = api.GS.hour; r.last = api.GS.hour; r.hours[Math.floor(h / 3) % 8]++; r.months[m]++; const ar = area(G.x, G.z); r.areas[ar] = (r.areas[ar] || 0) + 1; r.pins.push({ x: Math.round(G.x), z: Math.round(G.z), h: +h.toFixed(1), m }); if (r.pins.length > 14) r.pins.shift(); if (first) api.toast(`New in the field guide: ${SP[G.kind].name}.`, "good"); api.save(); }
    if (G.state === "graze" || G.state === "walk") { if (!r.close || d < r.close) r.close = Math.max(1, Math.round(d)); }
  }
}
let slowT = 0, ageH = null;
function tick(dt) {
  if (!api.started() || !api.tutDone()) return; slowT -= dt; if (slowT > 0) { return; } slowT = 0.5;
  const F = api.FOOT, P = api.P, px = F.on ? F.x : P.x, pz = F.on ? F.z : P.z;
  if (ageH === null) ageH = api.GS.hour; const dh = api.GS.hour - ageH; ageH = api.GS.hour; if (dh > 0 && dh < 48) printsAge(dh); else if (dh >= 48 || dh < 0) for (const k in X.M) { X.M[k].list = []; X.M[k].dirty = true; }
  if (!(api.INT && api.INT.on)) sight(px, pz); densTick(px, pz); printsDraw();
}

/* ---------------- the app ---------------- */
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 9c1.500-1 3-1 4.500 0M9.500 13.500h.01M13.500 13.500h.01M11.500 16h.01"/></svg>';
function printSvg(cls) { const p = { hoof: '<ellipse cx="13" cy="15" rx="4" ry="10" transform="rotate(7 13 15)"/><ellipse cx="23" cy="15" rx="4" ry="10" transform="rotate(-7 23 15)"/><circle cx="12" cy="30" r="2"/><circle cx="24" cy="30" r="2"/>', paw: '<ellipse cx="18" cy="23" rx="8" ry="7"/><ellipse cx="8" cy="11" rx="3" ry="4"/><ellipse cx="15" cy="8" rx="3" ry="4"/><ellipse cx="22" cy="8" rx="3" ry="4"/><ellipse cx="29" cy="11" rx="3" ry="4"/>', bound: '<ellipse cx="11" cy="8" rx="3.500" ry="7" transform="rotate(8 11 8)"/><ellipse cx="25" cy="8" rx="3.500" ry="7" transform="rotate(-8 25 8)"/><ellipse cx="17" cy="22" rx="3" ry="3.500"/><ellipse cx="19" cy="30" rx="3" ry="3.500"/>', tiny: '<circle cx="13" cy="12" r="3"/><circle cx="23" cy="12" r="3"/><circle cx="13" cy="24" r="3"/><circle cx="23" cy="24" r="3"/>' }[cls]; return `<svg viewBox="0 0 36 36" width="44" height="44" fill="currentColor" aria-hidden="true">${p}</svg>`; }
const bars = (arr, labels) => { const mx = Math.max(1, ...arr); return `<div style="display:flex;gap:2px;align-items:flex-end;height:34px">${arr.map((v, i) => `<div title="${labels[i]}" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%"><div style="width:100%;height:${Math.round(v / mx * 24) + (v ? 2 : 0)}px;background:${v ? "#ff7a3a" : "rgba(255,255,255,.12)"};min-height:2px;border-radius:2px"></div><div style="font-size:8.5px;opacity:.65;margin-top:1px">${labels[i]}</div></div>`).join("")}</div>`; };
function mapHtml(k) { return `<canvas data-fgmap="${k}" width="220" height="220" style="width:min(220px,100%);aspect-ratio:1;border-radius:8px;background:#0b1218;display:block"></canvas>`; }
function drawMap(cv, k) {
  try { const g = cv.getContext("2d"), M = W.map, half = W.half, sc = cv.width / W.size; if (M && M.canvas) g.drawImage(M.canvas, 0, 0, cv.width, cv.height); const dot = (x, z, col, r) => { g.fillStyle = col; g.strokeStyle = "rgba(0,0,0,.6)"; g.beginPath(); g.arc((x + half) * sc, (z + half) * sc, r, 0, TAU); g.fill(); g.stroke(); };
    const r = S.sp[k]; if (r) for (const p of r.pins) dot(p.x, p.z, "#ff7a3a", 3.2); for (const id in S.dens) if (S.dens[id].kind === k) dot(S.dens[id].x, S.dens[id].z, "#58b4ff", 4); } catch (e) { X.err = "map: " + e; }
}
function pageHtml(k) {
  const Ui = api.ui, sp = SP[k], r = S.sp[k] || {}, met = r.n > 0 || r.photo, dens = Object.values(S.dens).filter(d => d.kind === k);
  let h = `<div style="margin:0 0 6px"><button type="button" class="tbtn" data-tf="fg:back" data-act="fg:">‹ ALL ANIMALS</button></div>`;
  h += Ui.tabHead(sp.group.toUpperCase(), met || r.tracks ? sp.name : "Not met yet", met ? `seen ${r.n}×` : "");
  if (!met && !r.tracks) return h + `<div class="tnote2">You have not met this one. Its page fills in when you see it, photograph it, or read its tracks.</div>`;
  h += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:6px">`;
  h += `<div><div style="aspect-ratio:16/9;border-radius:8px;background:#0b1218 center/cover no-repeat;${r.photo && r.photo.img ? `background-image:url(${r.photo.img})` : ""};display:flex;align-items:center;justify-content:center;font-size:11px;opacity:${r.photo ? 1 : 0.7}">${r.photo ? "" : "No photograph yet: lift the camera"}</div>${r.photo ? `<div style="font-size:11px;opacity:.8;margin-top:3px">Your best: ${"★".repeat(r.photo.stars)}${"☆".repeat(5 - r.photo.stars)} ${r.photo.score}${r.photo.pose ? ", " + Ui.esc(r.photo.pose) : ""}</div>` : ""}
    <div class="tnote2" style="margin-top:6px"><b>${Ui.esc(sp.name)}</b> <i>(${Ui.esc(sp.local)})</i>. ${met ? Ui.esc(sp.note) : "Known only by its tracks so far."}</div>${met ? `<div class="tnote2"><b>Eats:</b> ${Ui.esc(sp.eats)}</div><div class="tnote2"><b>How close:</b> ${r.close ? `it has let you to ${r.close} m before moving off.` : "you have not been near one at rest yet."}</div>` : ""}</div>`;
  h += `<div>${mapHtml(k)}<div style="font-size:10.5px;opacity:.75;margin-top:3px"><span style="color:#ff7a3a">●</span> seen &nbsp; <span style="color:#58b4ff">●</span> ${Ui.esc(sp.den)}</div>${met ? `<div style="font-size:11px;margin-top:5px">${Object.entries(r.areas || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([a, n]) => `${Ui.esc(a)} ${n}×`).join(" · ")}</div>` : ""}</div></div>`;
  if (met) h += Ui.sec("When", "by hour of the day, and by month") + `<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:10px">${bars(r.hours, ["0", "3", "6", "9", "12", "15", "18", "21"])}${bars(r.months, MON.map(m => m[0]))}</div>`;
  h += Ui.sec("Tracks", r.tracks ? `read ${r.tracks}×` : "not read yet");
  h += r.tracks ? `<div style="display:flex;gap:10px;align-items:center"><div style="color:#cfd8e2">${printSvg(sp.cls)}</div><div class="tnote2" style="margin:0">${Ui.esc(sp.track)} About ${Math.round(sp.pw * 100)} cm across, ${sp.stride >= 1 ? sp.stride.toFixed(1) + " m" : Math.round(sp.stride * 100) + " cm"} between.</div></div>` : `<div class="tnote2">Stand over a print in the snow on foot and read it.</div>`;
  h += Ui.sec(sp.den[0].toUpperCase() + sp.den.slice(1), dens.length ? `${dens.length} found` : "not found yet");
  h += dens.length ? `<div class="tnote2">${Ui.esc(sp.denNote)} Found ${dens.map(d => Ui.esc(area(d.x, d.z))).join("; ")}.</div>` : `<div class="tnote2">Follow a trail backwards, towards the older prints.</div>`;
  return h;
}
function render(el) {
  const Ui = api.ui, c = X.count();
  if (X.page && SP[X.page]) { el.innerHTML = pageHtml(X.page); const cv = el.querySelector("[data-fgmap]"); if (cv) drawMap(cv, X.page); }
  else {
    let h = Ui.tabHead("FIELD GUIDE", `${c.seen} of ${c.all} met`, `${Object.keys(S.dens).length} dens · ${Object.values(S.sp).filter(r => r.tracks).length} tracks`);
    h += Ui.sec("Mammals", `${Object.keys(SP).filter(k => S.sp[k] && (S.sp[k].n || S.sp[k].photo)).length} of ${Object.keys(SP).length}`);
    for (const k in SP) { const sp = SP[k], r = S.sp[k] || {}, met = r.n > 0 || r.photo, tr = r.tracks > 0, dn = Object.values(S.dens).some(d => d.kind === k);
      h += Ui.tabCard({ tf: "fg:" + k, title: met || tr ? sp.name : "? ? ?", chips: (r.photo ? Ui.chip("photo", "ok") : "") + (tr ? Ui.chip("tracks", "ok") : "") + (dn ? Ui.chip(sp.den, "ok") : ""), meta: met ? `seen ${r.n}×${r.close ? ` · closest ${r.close} m` : ""}${r.areas ? " · " + Ui.esc(Object.keys(r.areas).slice(0, 2).join(", ")) : ""}` : tr ? "Known by its tracks only." : "Not met yet.", act: "fg:" + k, actLabel: met || tr ? "OPEN" : "?" }); }
    const FA = fishAll(), FB = fishBest(); if (FA.length) { h += Ui.sec("Fish", `${fishGot().length} of ${FA.length}`); for (const k of FA) { const f = TLFish.SPECIES[k], b = FB[k]; h += Ui.tabCard({ tf: "fgf:" + k, title: b ? f.name : "? ? ?", chips: b ? Ui.chip(f.local || "", "") : "", meta: b ? `best ${b.kg} kg${b.cm ? `, ${b.cm} cm` : ""} · ${Ui.esc(b.lake || "")}${b.at ? " · " + Ui.esc(b.at) : ""}` : "Not caught yet." }); } }
    const areas = {}; for (const k in S.sp) for (const a in (S.sp[k].areas || {})) areas[a] = (areas[a] || 0) + 1; const al = Object.entries(areas).sort((a, b) => b[1] - a[1]);
    if (al.length) h += Ui.sec("By place", "kinds met there") + `<div class="tnote2">${al.map(([a, n]) => `${Ui.esc(a)}: ${n}`).join(" · ")}</div>`;
    el.innerHTML = h;
  }
  for (const b of el.querySelectorAll("[data-act^='fg:']")) b.addEventListener("click", () => { X.page = b.dataset.act.slice(3); render(el); el.scrollTop = 0; });
}
X.render = render;
function onShot(ph) { if (!SP[ph.kind]) return; const r = rec(ph.kind); if (!r.photo || ph.score > r.photo.score) r.photo = { score: ph.score, stars: ph.stars, img: ph.img, pose: ph.pose, t: ph.t }; }
TLX.register({
  id: "guide", v: 1, state0: () => ({ sp: {}, dens: {} }),
  init(a) {
    api = a; W = a.world; S = TLX.state("guide"); for (const k of ["sp", "dens"]) if (!S[k] || typeof S[k] !== "object" || Array.isArray(S[k])) S[k] = {};
    for (const k in S.sp) { const r = S.sp[k]; if (!r || typeof r !== "object" || !SP[k]) { delete S.sp[k]; continue; } S.sp[k] = Object.assign({ n: 0, first: 0, last: 0, close: 0, tracks: 0, photo: null }, r); const q = S.sp[k]; if (!Array.isArray(q.hours) || q.hours.length !== 8) q.hours = [0, 0, 0, 0, 0, 0, 0, 0]; if (!Array.isArray(q.months) || q.months.length !== 12) q.months = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; if (!Array.isArray(q.pins)) q.pins = []; if (!q.areas || typeof q.areas !== "object") q.areas = {}; }
    for (const id in S.dens) { const d = S.dens[id]; if (!d || !SP[d.kind] || !isFinite(d.x) || !isFinite(d.z)) delete S.dens[id]; }
    printsInit(); a.footx.push(FOOTX); a.TABLET.register({ id: "guide", name: "Field guide", icon: ICON, order: 1.7, render });
    if (window.TLXCAM) TLXCAM.onShot.push(onShot); X.ready = true;
  },
  tick(dt) { if (!X.ready) return; try { tick(dt); } catch (e) { if (!X.err) { X.err = String(e && e.stack || e); console.error("TLX guide", e); } } }
});
})();
