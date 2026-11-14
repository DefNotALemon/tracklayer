// Tracklayer — clothing layers that matter (G4 slice 10.1, loop/EXPANSION.md milestone 10 "Stores and gear").
//
// Under the riding kit (helmet, jacket, bibs, boots, gloves: GEAR in tracklayer.js, sold at the garage) you now wear two
// layers, bought at Nordkinn Fisk & Friluft by the quay, which grows a "Base layers" and a "Mid layers" tab beside the
// tackle:
//   base  next to the skin: the cotton tee you start in (free), a merino top, wool long johns
//   mid   between: nothing to start, a fleece, a down jacket
// A layer adds warmth like a piece of riding kit (LAYERS[].warm goes into stats() as part of ST.warm). What makes them
// matter is sweat: hard work on foot (wading powder, a jog, digging) wets your base layer, faster under a heavy mid
// layer, and riding the open fell in a damp layer chills you (the cold rate is multiplied by coldK()). Cotton holds the
// wet and dries slowly; merino and wool wick it and keep most of their warmth damp. Down is the warmest mid layer while
// it's dry and loses most of its loft when soaked; a fleece shrugs it off. Through the ice soaks you to the skin.
// Indoors (any site's stove, your cabin, a room, the hospital) you dry out fast.
// A player who never visits the shop keeps today's game: the free cotton tee + no mid layer add no warmth, and only
// on-foot exertion (rare on a parcel run) or a swim dampens them.
//
// THE WINTER STORE (G4 10.2): Sport & Vinter, a walk-in shop in one of Kjøllefjord's houses (picked from the town's lit
// doors: a high-street house about 30 m from the quay, clear of Fisk & Friluft), with a sign over the door and the usual
// ring in front of it. Inside (an INT room built by intAddRoom): clothing rails, a table of folded layers, boots and skis
// on the walls, a stove, and the counter at the back. At the counter the use control (E / pad L3 / tap SHOP) opens the
// store's panel: the riding kit (GEAR, also still at the garage's Kit tab), the two layer tabs, and spares: dry gloves
// and socks, carried (up to SPARE_MAX), and changed into out on the trail with the use control (DRY PAIR) once you're
// damp. A dry pair takes PAIR off the wet: hands and feet are where a damp chill bites first.
//
// SAVED under x.sys.gear: { base, mid, own: { "base:merino": 1, ... }, wet, spares }. An old save starts in cotton, no mid,
// dry, no spares. Bridges in tracklayer.js: stats() adds TLXG.warm() to ST.warm; the cold drain line multiplies by
// TLXG.coldK(); api.intAdd (a walk-in room), api.shop (icefish.js's shop panel as another store), api.kit (the riding kit).
// icefish.js renders extra shop tabs from TLX.shopTabs (filtered by each tab's stores). Tests: x10_layers.mjs, x10_store.mjs.
(() => {
"use strict";
// warm: insulation points (riding kit runs 1-5 a piece); wick: how much of the wet's chill it lets through (cold rate x
// 1 + wick * wet); dry: wet lost per second out in the cold while not working; fade: share of its warmth lost when soaked
const LAYERS = {
  base: [
    { id: "cotton", name: "Cotton tee", cost: 0, warm: 0, wick: 0.45, dry: 1 / 900, note: "Comfortable in town. Holds sweat and dries slowly: damp cotton out on the fell is cold." },
    { id: "merino", name: "Merino top", cost: 85, warm: 0.5, wick: 0.15, dry: 1 / 200, note: "Fine wool that wicks sweat away and stays warm damp. Dries in a few minutes." },
    { id: "wool", name: "Wool long johns", cost: 140, warm: 1.2, wick: 0.1, dry: 1 / 400, note: "Heavy wool top and bottoms. The warmest base, warm even wet; slower to dry than merino." }
  ],
  mid: [
    { id: "none", name: "No mid layer", cost: 0, warm: 0, fade: 0, sweat: 0, note: "Just the base layer under your jacket." },
    { id: "fleece", name: "Fleece pullover", cost: 95, warm: 1.2, fade: 0.1, sweat: 0.5, note: "Breathes while you work and keeps its warmth when it gets damp." },
    { id: "down", name: "Down jacket", cost: 240, warm: 2.4, fade: 0.75, sweat: 1, note: "The warmest layer you can buy, while it's dry. Work up a sweat in it and the down clumps and goes cold." }
  ]
};
const SWEAT = 1 / 150;          // wet per second of hard work in a base layer with no mid layer (x 1 + mid.sweat)
const SOAK = 0.5;               // wet per second in the water (through the ice)
const DRY_IN = 1 / 25;          // wet per second lost indoors / by a stove
const WARN = 0.4;               // "you're soaked" toast above this
const TABS = [["base", "Base layers"], ["mid", "Mid layers"]];
const STORE = "winter", STORE_NAME = "Sport & Vinter";
const SPARE = 24, SPARE_MAX = 4, PAIR = 0.3, PAIR_MIN = 0.2;  // a pair's price, how many you carry, wet a change takes off, and the wet it's offered at
const COUNTER = { x: 1.4, z: 2.0, w: 1.8 };                   // in the room (door at -2.3 on the front wall, see intShell)
const SHOP = { b: null, D: null, sign: null };
let api = null;
const S = () => TLX.state("gear");
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const def = (slot, id) => LAYERS[slot].find(o => o.id === id) || LAYERS[slot][0];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const cash$ = n => api && api.fmtCash ? api.fmtCash(n) : "$" + Math.round(n);

// warmth the layers add while dry (into ST.warm via stats())
function warm() { const s = S(); if (!s) return 0; return def("base", s.base).warm + def("mid", s.mid).warm; }
// the multiplier on the cold drain from damp layers: the base's chill, and the mid layer's lost loft
function coldK() {
  const s = S(); if (!s || !api || s.wet <= 0.001) return 1;
  const b = def("base", s.base), m = def("mid", s.mid), ST = api.ST();
  const chill = 1 + b.wick * s.wet;
  const lost = m.warm * m.fade * s.wet;
  const mul = w => clamp(1.55 - w * 0.11, 0.3, 1.6);             // tracklayer.js stats(): coldMul from warmth
  const loft = ST && lost > 0 ? mul(ST.warm - lost) / mul(ST.warm) : 1;
  return chill * loft;
}
// how hard the body is working right now, 0..1 (on foot only: riding is cold, still work)
function exertion() {
  const F = api.FOOT; if (!F || !F.on) return 0;
  if (F.dig) return 1;
  const sp = Math.abs(F.sp || 0); if (sp < 0.4) return 0;
  return clamp(0.25 + 0.75 * clamp(((F.strain || 0.55) - 0.55) / 0.45, 0, 1) + 0.6 * (F.runW || 0), 0, 1);
}
function indoors() {
  const G = api.GS, W = api.world;
  if (api.INT && api.INT.on) return true;
  if (G.near) return true;                                        // every site in SITES has a stove (villages, cabins, the quay, the garage)
  const F = api.FOOT, x = F && F.on ? F.x : api.P.x, z = F && F.on ? F.z : api.P.z;
  return !!(api.hospHere && api.hospHere(x, z, 22));
}

function wearing(slot, id) { const s = S(); return !!s && s[slot] === id; }
function owns(slot, id) { const s = S(); return !!s && (def(slot, id).cost === 0 || !!s.own[slot + ":" + id]); }
function buy(slot, id) {
  const s = S(), o = LAYERS[slot] && LAYERS[slot].find(x => x.id === id); if (!s || !o) return false;
  const G = api.GS;
  if (!owns(slot, id)) {
    if (G.cash < o.cost) { api.toast(`That's ${cash$(o.cost)}. You have ${cash$(G.cash)}.`, "warn"); return false; }
    G.cash -= o.cost; s.own[slot + ":" + id] = 1;
  }
  s[slot] = id; api.restat(); api.save();
  api.toast(o.cost && slot === "mid" && id === "down" ? `${o.name} on under your jacket. Warm, but don't work up a sweat in it.` : `${o.name} on under your kit.`, "good");
  return true;
}

// the store's two extra tabs (icefish.js renders TLX.shopTabs beside the tackle)
const shopTab = slot => ({
  id: "lay_" + slot, label: TABS.find(t => t[0] === slot)[1],
  note: slot === "base" ? "What you wear next to the skin decides how a sweat feels. Cotton holds it; wool and merino wick it away and stay warm damp. Hard work on foot (wading powder, a jog, digging) is what wets it."
                        : "A mid layer under your jacket adds warmth. Down is the warmest while it's dry and clumps when you sweat in it; a fleece breathes and keeps going.",
  stores: ["fisk", STORE],
  render(cash) {
    return LAYERS[slot].map(o => {
      const own = owns(slot, o.id), on = wearing(slot, o.id), dis = on || (!own && cash < o.cost);
      const lbl = on ? "Wearing" : own ? "Wear this" : cash < o.cost ? `${cash$(o.cost)} · not enough cash` : `Buy & wear · ${cash$(o.cost)}`;
      const chips = [`<span class="ifchip">+${o.warm} warmth</span>`];
      if (slot === "base") chips.push(`<span class="ifchip${o.wick <= 0.15 ? " ok" : ""}">${o.wick <= 0.15 ? "warm when damp" : "cold when damp"}</span>`);
      else if (o.id !== "none") chips.push(`<span class="ifchip${o.fade <= 0.2 ? " ok" : " bad"}">${o.fade <= 0.2 ? "keeps warm damp" : "loses loft wet"}</span>`);
      if (own && !on && o.cost) chips.push(`<span class="ifchip ok">Owned</span>`);
      return `<div class="ifit${on ? " on" : ""}"><div class="ifhd"><span class="ifnm">${esc(o.name)}</span><span class="ifpr">${o.cost ? cash$(o.cost) : "free"}</span></div>
        <p class="ifnote">${esc(o.note)}</p><div class="ifchips">${chips.join("")}</div>
        <button type="button" data-layer="${slot}:${o.id}" ${dis ? "disabled" : ""}>${lbl}</button></div>`;
    }).join("");
  },
  bind(root, rerender) {
    root.querySelectorAll("button[data-layer]").forEach(b => b.onclick = () => { const [sl, id] = b.dataset.layer.split(":"); if (buy(sl, id)) rerender(); });
  }
});

// ---- the winter store's own tabs: the riding kit and spares ----
const kitTab = {
  id: "w_kit", label: "Riding kit", stores: [STORE],
  note: "Helmet, jacket, bibs, boots and gloves: the shell everything else goes under. Warmth adds up across every piece. The garage's Kit tab sells the same.",
  render(cash) {
    const K = api.kit; let out = "";
    for (const slot of K.ORDER) for (const o of K.GEAR[slot].options) {
      const own = K.owns(slot, o.id), on = api.GS.own.gear[slot] === o.id, dis = on || (!own && cash < o.cost);
      const lbl = on ? "Wearing" : own ? "Wear this" : cash < o.cost ? `${cash$(o.cost)} · not enough cash` : `Buy & wear · ${cash$(o.cost)}`;
      out += `<div class="ifit${on ? " on" : ""}"><div class="ifhd"><span class="ifnm">${esc(o.name)}</span><span class="ifpr">${o.cost ? cash$(o.cost) : "free"}</span></div>
        <span class="ifloc">${esc(K.GEAR[slot].label)}</span>${o.note ? `<p class="ifnote">${esc(o.note)}</p>` : ""}
        <div class="ifchips"><span class="ifchip">${o.warm} warmth</span>${own && !on && o.cost ? `<span class="ifchip ok">Owned</span>` : ""}</div>
        <button type="button" data-kit="${slot}:${o.id}" ${dis ? "disabled" : ""}>${lbl}</button></div>`;
    }
    return out;
  },
  bind(root, rerender) { root.querySelectorAll("button[data-kit]").forEach(b => b.onclick = () => { const [sl, id] = b.dataset.kit.split(":"); if (api.kit.wear(sl, id)) rerender(); }); }
};
const spareTab = {
  id: "w_spare", label: "Spares", stores: [STORE],
  note: "Damp gloves and socks are where a sweat turns cold first. Carry a dry pair and change out on the trail: the use control offers it once you're damp.",
  render(cash) {
    const s = S(), n = s ? s.spares : 0, full = n >= SPARE_MAX, dis = full || cash < SPARE;
    const lbl = full ? `Carrying ${SPARE_MAX}: that's all the pack holds` : cash < SPARE ? `${cash$(SPARE)} · not enough cash` : `Buy a pair · ${cash$(SPARE)}`;
    return `<div class="ifit${n ? " on" : ""}"><div class="ifhd"><span class="ifnm">Dry gloves &amp; socks</span><span class="ifpr">${cash$(SPARE)}</span></div>
      <span class="ifloc">Wool liner gloves and ragg socks, in a dry bag</span>
      <p class="ifnote">A change takes the worst of the damp off: about a third of a soaking. Used up when you change into them.</p>
      <div class="ifchips"><span class="ifchip${n ? " ok" : ""}">${n} of ${SPARE_MAX} carried</span></div>
      <button type="button" data-spare="1" ${dis ? "disabled" : ""}>${lbl}</button></div>`;
  },
  bind(root, rerender) { const b = root.querySelector("button[data-spare]"); if (b) b.onclick = () => { if (buySpare()) rerender(); }; }
};
function buySpare() {
  const s = S(), G = api.GS; if (!s) return false;
  if (s.spares >= SPARE_MAX) return false;
  if (G.cash < SPARE) { api.toast(`A pair is ${cash$(SPARE)}. You have ${cash$(G.cash)}.`, "warn"); return false; }
  G.cash -= SPARE; s.spares++; api.save();
  api.toast(`Dry gloves and socks in the pack: ${s.spares} pair${s.spares > 1 ? "s" : ""}.`, "good");
  return true;
}
function changePair() {
  const s = S(); if (!s || !s.spares) return;
  const w0 = s.wet; s.spares--; s.wet = Math.max(0, s.wet - PAIR); if (s.wet < WARN - 0.15) s.warned = false; api.save();
  api.toast(`Dry gloves and socks on: the worst of the damp is off${s.wet > WARN ? ", though your base layer's still wet" : ""}. ${s.spares ? s.spares + " pair" + (s.spares > 1 ? "s" : "") + " left." : "That was your last pair."}`, "good");
  return w0 - s.wet;
}

// ---- where the store is, its sign, and the room ----
function pickDoor() {
  const W = api.world, dp = W.depot, fs = api.fishSites && api.fishSites.shop;
  let best = null, bs = 1e9;
  for (const D of W.doors || []) {
    const r = Math.hypot(D.x - dp.x, D.z - dp.z); if (r > (api.townR || 108)) continue;
    const dx = D.x + D.nx * D.d / 2, dz = D.z + D.nz * D.d / 2, bx = dx + D.nx * 1.25, bz = dz + D.nz * 1.25;
    if (fs && Math.hypot(bx - fs.x, bz - fs.z) < 14) continue;                 // not where Fisk & Friluft's E would win
    if (W.isSea(bx, bz) || W.isWater(bx, bz)) continue;
    if (api.INT.beacons.some(b => Math.hypot(b.x - bx, b.z - bz) < 12)) continue;
    const sc = Math.abs(r - 30);                                                 // a high-street house, not the depot's doorstep
    if (sc < bs) { bs = sc; best = { D, dx, dz, bx, bz, ry: Math.atan2(D.nx, D.nz) }; }
  }
  return best;
}
function signTex() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#1f3a52"; g.fillRect(0, 0, 512, 128); g.strokeStyle = "#e9dcc0"; g.lineWidth = 8; g.strokeRect(10, 10, 492, 108);
  g.fillStyle = "#f3ead6"; g.font = "bold 58px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("SPORT & VINTER", 256, 58);
  g.font = "22px Georgia, serif"; g.fillText("klær · støvler · ull", 256, 100);
  const t = new api.THREE.CanvasTexture(c); t.encoding = api.THREE.sRGBEncoding; return t;
}
function buildSign(p) {
  const T = api.THREE, W = api.world, y = W.groundAt(p.D.x, p.D.z);
  const m = new T.Mesh(new T.PlaneGeometry(1.7, 0.43), new T.MeshLambertMaterial({ map: signTex() }));
  m.position.set(p.dx + p.D.nx * 0.12, y + 2.38, p.dz + p.D.nz * 0.12); m.rotation.y = p.ry; api.scene.add(m);
  return m;
}
// the shop floor: rails of jackets down the right wall, a table of folded layers, boots and skis on the left, the counter
// at the back with the till, a stove in the corner. The way from the door to the counter stays clear (x10_store walks it).
function buildRoom(R, K) {
  const IM = K.IM, box = api.mesh.box, cyl = api.mesh.cyl, std = api.mesh.std;
  const cols = [std(0xb5372a, 1), std(0x2f5d7c, 1), std(0x3c6152, 0.95), std(0x2a2d33, 1), std(0xd6a23a, 1), std(0x7a3d5c, 1)];
  K.shell(R, { plaster: true, doorX: -2.3, insul: true, wins: [["z", -3.88, 0.6, 1.3, 0.95, 1.8], ["x", 2.88, -0.9, 1.4, 0.95, 1.85]] });
  K.rug(R, -0.4, -0.2, 2.6, 1.7, IM.cloth2);
  K.counter(R, COUNTER.x, COUNTER.z, COUNTER.w, 0);
  R.fire = K.stove(R, 3.25, 2.25, false, 0);
  // clothing rails along the right wall: two posts, a bar, a row of jackets and bibs
  for (const [z0, z1, k] of [[-1.9, -0.5, 0], [-0.1, 1.2, 3]]) {
    const g = K.sub(R, 3.25, (z0 + z1) / 2, 0), L = z1 - z0;
    for (const sz of [-1, 1]) box(0.05, 1.62, 0.05, IM.steel, 0, 0.81, sz * L / 2, 0, 0, 0, g);
    box(0.04, 0.04, L, IM.steel, 0, 1.6, 0, 0, 0, 0, g);
    const n = Math.floor(L / 0.17);
    for (let i = 0; i < n; i++) { const z = -L / 2 + 0.12 + i * (L - 0.24) / Math.max(1, n - 1); box(0.5, i % 3 === 2 ? 0.95 : 0.72, 0.07, cols[(i + k) % cols.length], 0, i % 3 === 2 ? 1.08 : 1.2, z, 0, 0, 0, g); }
    K.col(R, 3.25, (z0 + z1) / 2, 0.6, L + 0.1, 0, 1.7);
  }
  // the table of folded base and mid layers
  K.table(R, -0.5, 0.2, 1.5, 0.85, 0.8, 0);
  for (let i = 0; i < 8; i++) { const x = -1.05 + (i % 4) * 0.36, z = i < 4 ? 0.0 : 0.4; for (let j = 0; j < 2 + (i % 3); j++) box(0.3, 0.06, 0.26, cols[(i + j) % cols.length], x, 0.865 + j * 0.06, z, 0, 0, 0, R.g); }
  // boots on a low bench by the left wall, skis and snowshoes above them, a coat hook row by the door
  K.bench(R, -3.4, 0.9, 1.5, Math.PI / 2, IM.wood);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) box(0.11, 0.24, 0.28, i % 2 ? IM.dark : IM.hide, -3.4 + s * 0.07, 0.62, 0.35 + i * 0.36, 0, 0, 0, R.g);
  K.wallGear(R, -3.72, 2.0, Math.PI / 2, "skis"); K.wallGear(R, -3.72, -0.3, Math.PI / 2, "shoes");
  K.hooks(R, -3.72, -1.5, Math.PI / 2, 2, true);
  K.shelf(R, -1.2, 2.55, 1.6, 0);
  for (let i = 0; i < 5; i++) box(0.22, 0.2, 0.2, cols[i], -1.85 + i * 0.32, 2.0, 2.55, 0, 0, 0, R.g);   // hats and mitts on the top shelf
  cyl(0.035, 0.035, 0.08, IM.brass, COUNTER.x + 0.55, 0.99, COUNTER.z - 0.1, 0, 0, 0, R.g, 10);           // the bell on the counter
  K.lamp(R, -0.5, 0.2, "pendant", 1.95); K.lamp(R, COUNTER.x, COUNTER.z - 0.4, "pendant", 1.95); K.lamp(R, 2.6, -1.2, "pendant", 1.95);
}
function atCounter() {
  const I = api.INT; if (!I.on || !I.cab || I.cab.id !== STORE) return false;
  return Math.abs(I.px - COUNTER.x) < COUNTER.w / 2 + 0.35 && I.pz > COUNTER.z - 1.45 && I.pz < COUNTER.z;
}
function buildStore() {
  if (SHOP.b || !api.intAdd || !api.world.doors) return;
  const p = pickDoor(); if (!p) return;
  SHOP.D = p; SHOP.sign = buildSign(p);
  SHOP.b = api.intAdd({ id: STORE, name: STORE_NAME, x: p.bx, z: p.bz, ry: p.ry, jig: [0, 52], door: STORE_NAME + "'s door", build: buildRoom,
    hint: () => atCounter() ? `${api.keyHint("use", "browse the shop")} · walk into the doorway to go out` : `${STORE_NAME}: the counter's at the back · walk into the doorway to go out`,
    enter: () => api.toast(`${STORE_NAME}: warm, and smelling of wool. The counter's at the back; walk back into the doorway to go out.`) });
}
// the use control: SHOP at the counter, DRY PAIR out on the trail once you're damp and carry a pair
const PROV = {
  use() {
    const I = api.INT, F = api.FOOT;
    if (I.on) return atCounter() && !(api.shopOpen && api.shopOpen()) ? { label: "SHOP", hint: () => `${api.keyHint("use", "browse the shop")} · walk into the doorway to go out`, act: () => api.shop(STORE) } : null;
    const s = S(); if (!s || !s.spares || s.wet < PAIR_MIN || api.GS.near || (F && F.dig)) return null;
    return { label: "DRY PAIR", hint: () => `${api.keyHint("use", "change into dry gloves and socks")} · ${s.spares} pair${s.spares > 1 ? "s" : ""} in the pack`, act: changePair };
  },
  digging: () => false
};

TLX.register({
  id: "gear", v: 1,
  state0: () => ({ base: "cotton", mid: "none", own: {}, wet: 0, warned: false, spares: 0 }),
  migrate(st) { return st; },
  init(a) {
    api = a; const s = S();
    if (s) { s.base = def("base", s.base).id; s.mid = def("mid", s.mid).id; if (!s.own || typeof s.own !== "object") s.own = {}; s.wet = clamp(+s.wet || 0, 0, 1); s.spares = clamp(Math.floor(+s.spares || 0), 0, SPARE_MAX); }
    api.restat();
    try { buildStore(); } catch (e) { console.error("TLX gear store", e); }
    if (api.footx && !api.footx.includes(PROV)) api.footx.push(PROV);
  },
  tick(dt) {
    const s = S(), G = api && api.GS; if (!s || !G || dt <= 0) return;
    if (!api.started() || G.dead || api.busy()) return;
    const H = api.HELP, b = def("base", s.base), m = def("mid", s.mid);
    if (H && H.on && H.kind === "sea") s.wet = Math.min(1, s.wet + SOAK * dt);            // through the ice: soaked through
    else if (indoors()) { s.wet = Math.max(0, s.wet - DRY_IN * dt); if (s.wet < WARN - 0.15) s.warned = false; }
    else {
      const e = exertion();
      if (e > 0) s.wet = Math.min(1, s.wet + SWEAT * e * (1 + m.sweat) * dt);
      else s.wet = Math.max(0, s.wet - b.dry * dt);
      if (s.wet < WARN - 0.15) s.warned = false;
    }
    if (s.wet > WARN && !s.warned && !(H && H.on)) {
      s.warned = true;
      api.toast(b.wick > 0.2 ? `Your ${b.name.toLowerCase()} is soaked with sweat: you'll feel the cold on the sled. A stove dries it; wool or merino at Fisk & Friluft wicks it.`
                             : `You've worked up a sweat. Your ${b.name.toLowerCase()} keeps most of its warmth damp.`, b.wick > 0.2 ? "warn" : "");
    }
  }
});
TLX.shopTabs = (TLX.shopTabs || []).concat([kitTab, shopTab("base"), shopTab("mid"), spareTab]);
TLX.stores = Object.assign(TLX.stores || {}, { [STORE]: { eyebrow: "Sport &amp; Vinter · Kjøllefjord", title: "Winter clothing",
  foot: "Everything goes on as soon as you buy it; swap back free any time, here or at the garage." } });
window.TLXG = { LAYERS, SWEAT, SOAK, DRY_IN, warm, coldK, exertion, buy, owns, wearing, state: S,
  STORE, SPARE, SPARE_MAX, PAIR, PAIR_MIN, COUNTER, shop: SHOP, atCounter, buySpare, changePair };
})();
