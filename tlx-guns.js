// Tracklayer — firearms, part one: the rifle, its parts, and the gun shop (G4 slice 11.1a, loop/EXPANSION.md milestone 11).
//
// Lemon (14 Nov 2026) wants Tarkov-style gun customization: scopes, magazines, better ammo, grips, longer barrels, stocks,
// handles, frames, with a quick way to swap on the go. This file is the model everything after it builds on:
//   FRAME  the base weapon (FRAMES; one to start: a bolt-action .308 hunting rifle). A frame lists its SLOTS.
//   PART   one option for one slot (PARTS[slot]): barrel, stock, grip, magazine, sight. Each carries stat deltas.
//          The first part of every slot is the frame's own stock part: free, and fitted to a new rifle, so a rifle
//          works the moment you buy it. Other parts are bought at the gun shop; once owned they swap on free, at the
//          counter now and anywhere with the quick-customize wheel (11.2, which calls fit()).
//   GUN    an owned rifle: { frame, parts: { barrel, stock, grip, magazine, sight }, rounds } (rounds = in the magazine).
//   STATS  stats(gun): spread (MOA: smaller is more accurate), recoil (how far the muzzle kicks; slower follow-up),
//          handling (how fast it comes up and swings: aim speed), kg (carried weight), noise (x the spook radius of
//          animals, 11.1b), range (m of clean-kill reach), cap (rounds a magazine holds), zoom (x magnification).
//          Every part trades something: the carbine barrel handles faster but reaches less and is louder, the scope
//          reaches far and steadies the shot but weighs and slows the swing.
// THE GUN SHOP: Nordkinn Jakt & Våpen, a walk-in room in one of Kjøllefjord's houses (the 10.5 shell), built the same way
// as Sport & Vinter (tlx-gear.js): door picked from the town's lit doors (~55 m from the quay, clear of the other shops),
// a sign over it, a room with the rifle rack, a glass case, antlers, an ammunition shelf, a stove, and the counter. At the
// counter the use control (E / pad L3 / tap SHOP) opens its panel: Licence, Rifles, Parts, Ammunition.
// THE HUNTER'S LICENCE (option "huntlic", on by default): the shop sells a rifle only to a licence holder; the course is
// a card at the counter (the rules: identify the animal, never aim at a person, safe direction, carry it empty in town)
// and a fee. Off = no licence needed.
// Firing, carrying it on the sled rack and hunting the wildlife are 11.1b; people can never be shot (11.1b gates the
// trigger off on any human-shaped target).
//
// SAVED under x.sys.guns: { owned: [gun...], cur, parts: { "sight:scope39": 1, ... }, ammo, licence }. An old save, or
// a corrupt entry, starts with no rifle, no parts, no ammo, no licence. No bridge in tracklayer.js: everything goes
// through the api (intAdd, shop, footx, keyHint). Test: x11_gunshop.mjs.
(() => {
"use strict";
const SLOTS = ["barrel", "stock", "grip", "magazine", "sight"];
const SLOT_NAME = { barrel: "Barrel", stock: "Stock", grip: "Grip", magazine: "Magazine", sight: "Sight" };
const FRAMES = [
  { id: "bolt308", name: "Bolt-action rifle, .308", cost: 1450, cal: ".308 Win", slots: SLOTS,
    base: { spread: 2.2, recoil: 1.0, handling: 5, kg: 2.9, noise: 1.0, range: 140, cap: 3, zoom: 1 },
    note: "A plain, honest hunting rifle: a push-feed bolt action in .308 Winchester, the round most of the north hunts moose and reindeer with. Comes with its stock parts fitted; every slot takes the shop's other parts." }
];
// d: stat deltas from the frame's base (cap and zoom are set outright with =cap / =zoom)
const PARTS = {
  barrel: [
    { id: "std22", name: "22\" sporter barrel", cost: 0, d: {}, note: "The barrel the rifle comes with. A good balance of reach and handling." },
    { id: "carb18", name: "18\" carbine barrel", cost: 320, d: { handling: 1.5, range: -25, noise: 0.25, kg: -0.35, spread: 0.3 }, note: "Shorter and lighter: swings fast through birch and from the sled. Louder, and it gives up some reach." },
    { id: "heavy24", name: "24\" heavy barrel", cost: 540, d: { handling: -1.2, range: 40, spread: -0.6, kg: 0.7, noise: -0.1 }, note: "A thick target-weight barrel. Tighter groups and more reach; heavy to carry and slow to swing." }
  ],
  stock: [
    { id: "walnut", name: "Walnut stock", cost: 0, d: {}, note: "Oiled walnut. Handsome, a little heavy, cold on the cheek at minus twenty." },
    { id: "synth", name: "Synthetic stock", cost: 260, d: { kg: -0.6, recoil: 0.1, handling: 0.5 }, note: "Glass-filled polymer. Lighter, doesn't swell in wet snow or chill your cheek; kicks a touch more." },
    { id: "adjust", name: "Adjustable stock", cost: 410, d: { recoil: -0.2, spread: -0.2, kg: 0.3 }, note: "Comb and length of pull set to you: a steadier cheek weld and a softer push back. Heavier." }
  ],
  grip: [
    { id: "plain", name: "Plain wood grip", cost: 0, d: {}, note: "The stock's own grip." },
    { id: "rubber", name: "Rubber-wrapped grip", cost: 90, d: { recoil: -0.15, handling: 0.5 }, note: "Grippy in mittens and when it's wet. A little less kick, a little quicker into the shoulder." },
    { id: "bipod", name: "Bipod fore-grip", cost: 230, d: { spread: -0.5, handling: -0.8, kg: 0.35 }, note: "Folding legs under the fore-end. Prone or off a sled seat it rests rock steady; slower to bring up." }
  ],
  magazine: [
    { id: "int3", name: "3-round internal box", cost: 0, d: { "=cap": 3 }, note: "The rifle's own fixed box. Three rounds, loaded from the top." },
    { id: "det5", name: "5-round detachable", cost: 140, d: { "=cap": 5, kg: 0.15, handling: -0.2 }, note: "A flush polymer magazine: five rounds and a quick change. A little extra weight under the rifle." },
    { id: "det10", name: "10-round extended", cost: 290, d: { "=cap": 10, kg: 0.45, handling: -0.6, noise: 0.05 }, note: "Ten rounds hanging below the rifle. You'll rarely reload; it snags and weighs." }
  ],
  sight: [
    { id: "iron", name: "Iron sights", cost: 0, d: {}, note: "Open sights: a wide view, fast on close game, short of reach." },
    { id: "red1", name: "1x red dot", cost: 180, d: { handling: 0.4, spread: -0.2, range: 10, kg: 0.15 }, note: "A dot that sits on the animal. Fastest sight there is, no magnification." },
    { id: "scope39", name: "3-9x hunting scope", cost: 480, d: { "=zoom": 6, range: 110, spread: -0.6, kg: 0.5, handling: -1 }, note: "A proper hunting scope. Reaches across a valley and steadies the shot; heavy, and slow to swing on a running hare." }
  ]
};
const AMMO = { id: "sp308", name: ".308 soft point, box of 20", cost: 38, n: 20, max: 120 };
const LICENCE = 180;
const LIC_RULES = [
  "Know your animal before you touch the trigger: moose, reindeer, fox and hare are game; nothing else is.",
  "Never point a rifle at a person, loaded or not. On the Nordkinn a rifle will not fire at anyone, ever.",
  "Pick a safe direction: a rising slope behind the animal, never a road, a cabin or a trail.",
  "Carry it unloaded in town and on the sled; load only out on the fell."
];
const STORE = "guns", STORE_NAME = "Jakt & Våpen", FULL_NAME = "Nordkinn Jakt & Våpen";
const COUNTER = { x: 1.4, z: 2.0, w: 1.8 };
const SHOP = { b: null, D: null, sign: null };
let api = null;
const S = () => TLX.state("guns");
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const isObj = o => !!o && typeof o === "object" && !Array.isArray(o);
const frameDef = id => FRAMES.find(f => f.id === id) || null;
const partList = slot => Array.isArray(PARTS[slot]) && SLOTS.includes(slot) ? PARTS[slot] : null;
const partDef = (slot, id) => { const L = partList(slot); return L ? (L.find(o => o.id === id) || L[0]) : null; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const cash$ = n => api && api.fmtCash ? api.fmtCash(n) : "$" + Math.round(n);
const licNeeded = () => TLX.on("huntlic");

// ---- the model ----
function stats(gun) {
  const f = gun && frameDef(gun.frame); if (!f) return null;
  const s = Object.assign({}, f.base);
  for (const slot of f.slots) {
    const p = partDef(slot, gun.parts && gun.parts[slot]); if (!p) continue;
    for (const k in p.d) { if (k[0] === "=") s[k.slice(1)] = p.d[k]; else s[k] += p.d[k]; }
  }
  s.spread = Math.max(0.4, +s.spread.toFixed(2)); s.recoil = Math.max(0.3, +s.recoil.toFixed(2)); s.handling = clamp(+s.handling.toFixed(2), 1, 10);
  s.kg = +s.kg.toFixed(2); s.noise = Math.max(0.5, +s.noise.toFixed(2)); s.range = Math.round(s.range);
  return s;
}
function newGun(fid) { const f = frameDef(fid), parts = {}; for (const sl of f.slots) parts[sl] = PARTS[sl][0].id; return { frame: fid, parts, rounds: 0 }; }
function gun() { const s = S(); return s && s.cur >= 0 ? s.owned[s.cur] || null : null; }
function ownsPart(slot, id) { const s = S(), p = partList(slot) && partList(slot).find(o => o.id === id); return !!s && !!p && (p.cost === 0 || !!s.parts[slot + ":" + id]); }
function ownedParts(slot) { return (partList(slot) || []).filter(p => ownsPart(slot, p.id)); }
// swap an owned part onto the current rifle: free, instant (the quick-customize wheel, 11.2, calls this)
function fit(slot, id, quiet) {
  const g = gun(), L = partList(slot); if (!g || !L) return false;
  const p = L.find(o => o.id === id); if (!p || !ownsPart(slot, id) || !frameDef(g.frame).slots.includes(slot)) return false;
  if (g.parts[slot] === id) return true;
  g.parts[slot] = id;
  const cap = stats(g).cap; if (g.rounds > cap) { S().ammo += g.rounds - cap; g.rounds = cap; }   // a smaller magazine: the spare rounds go back in the box
  api.save(); if (!quiet) api.toast(`${p.name} on the rifle.`, "good");
  return true;
}
function buyPart(slot, id) {
  const s = S(), L = partList(slot), p = L && L.find(o => o.id === id), G = api.GS; if (!s || !p) return false;
  if (!gun()) { api.toast("Buy the rifle first: parts fit a rifle.", "warn"); return false; }
  if (!ownsPart(slot, id)) {
    if (G.cash < p.cost) { api.toast(`That's ${cash$(p.cost)}. You have ${cash$(G.cash)}.`, "warn"); return false; }
    G.cash -= p.cost; s.parts[slot + ":" + id] = 1;
  }
  return fit(slot, id);
}
function buyRifle(fid) {
  const s = S(), f = frameDef(fid), G = api.GS; if (!s || !f) return false;
  if (licNeeded() && !s.licence) { api.toast("The counter sells a rifle only to a licence holder: take the course first (Licence tab).", "warn"); return false; }
  if (s.owned.some(g => g.frame === fid)) return false;
  if (G.cash < f.cost) { api.toast(`The ${f.name} is ${cash$(f.cost)}. You have ${cash$(G.cash)}.`, "warn"); return false; }
  G.cash -= f.cost; s.owned.push(newGun(fid)); s.cur = s.owned.length - 1; api.save();
  api.toast(`${f.name}: yours. It's fitted with its stock parts; the Parts tab swaps them. Buy a box of rounds before you head out.`, "good");
  return true;
}
function buyAmmo() {
  const s = S(), G = api.GS; if (!s) return false;
  if (!gun()) { api.toast("Buy a rifle first.", "warn"); return false; }
  if (s.ammo + AMMO.n > AMMO.max) return false;
  if (G.cash < AMMO.cost) { api.toast(`A box is ${cash$(AMMO.cost)}. You have ${cash$(G.cash)}.`, "warn"); return false; }
  G.cash -= AMMO.cost; s.ammo += AMMO.n; api.save(); api.toast(`A box of ${AMMO.n}: ${s.ammo} rounds in the pack.`, "good");
  return true;
}
function takeCourse() {
  const s = S(), G = api.GS; if (!s || s.licence) return false;
  if (G.cash < LICENCE) { api.toast(`The course is ${cash$(LICENCE)}. You have ${cash$(G.cash)}.`, "warn"); return false; }
  G.cash -= LICENCE; s.licence = true; api.save();
  api.toast("Hunter's licence: passed. The card goes in your wallet; the counter will sell you a rifle now.", "good");
  return true;
}

// ---- the shop panel's tabs (icefish.js renders TLX.shopTabs filtered by store) ----
const STAT_ROWS = [["spread", "Accuracy", v => v.toFixed(1) + " MOA", -1], ["recoil", "Recoil", v => v.toFixed(2), -1], ["handling", "Handling", v => v.toFixed(1), 1],
  ["range", "Clean-kill range", v => v + " m", 1], ["kg", "Weight", v => v.toFixed(2) + " kg", -1], ["noise", "Noise", v => "x" + v.toFixed(2), -1], ["cap", "Magazine", v => v + " rds", 1], ["zoom", "Magnification", v => v + "x", 1]];
function deltaChips(slot, p, g) {
  const cur = stats(g), nx = stats(Object.assign({}, g, { parts: Object.assign({}, g.parts, { [slot]: p.id }) })); let out = "";
  for (const [k, lbl, fmt, good] of STAT_ROWS) {
    const dv = nx[k] - cur[k]; if (Math.abs(dv) < 1e-6) continue;
    out += `<span class="ifchip ${dv * good > 0 ? "ok" : "bad"}">${lbl} ${dv > 0 ? "+" : "−"}${k === "spread" ? Math.abs(dv).toFixed(1) : k === "kg" ? Math.abs(dv).toFixed(2) : k === "noise" || k === "recoil" ? Math.abs(dv).toFixed(2) : Math.round(Math.abs(dv))}</span>`;
  }
  return out;
}
function statTable(g) {
  const s = stats(g); return `<div class="ifchips">${STAT_ROWS.map(([k, lbl, fmt]) => `<span class="ifchip">${lbl} ${fmt(s[k])}</span>`).join("")}</div>`;
}
const card = (name, price, note, chips, btn) => `<div class="ifit"><div class="ifhd"><span class="ifnm">${name}</span><span class="ifpr">${price}</span></div>${note ? `<p class="ifnote">${note}</p>` : ""}${chips ? `<div class="ifchips">${chips}</div>` : ""}${btn}</div>`;
const licTab = {
  id: "g_lic", label: "Licence", stores: [STORE],
  note: "Everyone who buys a rifle here holds a hunter's licence. The course is the rules below and a few questions at the counter.",
  render(cash) {
    const s = S();
    if (!licNeeded()) return card("Hunter's licence", "not needed", "The hunter's licence option is off in Settings: the counter sells rifles to anyone. The rules still hold.", "", "") + LIC_RULES.map(r => `<p class="ifnote">· ${esc(r)}</p>`).join("");
    const lbl = s.licence ? "Licence held" : cash < LICENCE ? `${cash$(LICENCE)} · not enough cash` : `Take the course · ${cash$(LICENCE)}`;
    return card("Hunter's licence course", cash$(LICENCE), LIC_RULES.map(r => "· " + esc(r)).join("<br>"), s.licence ? `<span class="ifchip ok">Passed</span>` : "",
      `<button type="button" data-glic="1" ${s.licence || cash < LICENCE ? "disabled" : ""}>${lbl}</button>`);
  },
  bind(root, rerender) { const b = root.querySelector("button[data-glic]"); if (b) b.onclick = () => { if (takeCourse()) rerender(); }; }
};
const rifleTab = {
  id: "g_rifle", label: "Rifles", stores: [STORE],
  note: "The rifle is the frame every part bolts to. It comes with its stock parts fitted, so it works the day you buy it.",
  render(cash) {
    const s = S();
    return FRAMES.map(f => {
      const own = s.owned.some(g => g.frame === f.id), lic = !licNeeded() || s.licence;
      const lbl = own ? "Owned" : !lic ? "Licence first (Licence tab)" : cash < f.cost ? `${cash$(f.cost)} · not enough cash` : `Buy · ${cash$(f.cost)}`;
      const g = own ? s.owned.find(x => x.frame === f.id) : newGun(f.id);
      const fitted = own ? `<p class="ifnote">Fitted: ${f.slots.map(sl => esc(partDef(sl, g.parts[sl]).name)).join(" · ")}. ${g.rounds} in the magazine, ${s.ammo} in the pack.</p>` : "";
      return card(esc(f.name), cash$(f.cost), esc(f.note) + `</p>${fitted}<p class="ifnote">${own ? "As built" : "Stock"}:`, statTable(g),
        `<button type="button" data-grifle="${f.id}" ${own || !lic || cash < f.cost ? "disabled" : ""}>${lbl}</button>`);
    }).join("");
  },
  bind(root, rerender) { root.querySelectorAll("button[data-grifle]").forEach(b => b.onclick = () => { if (buyRifle(b.dataset.grifle)) rerender(); }); }
};
const partsTab = {
  id: "g_parts", label: "Parts", stores: [STORE],
  note: "Every part trades something. Bought once, a part is yours: swap it on and off free, here or on the trail.",
  render(cash) {
    const g = gun();
    if (!g) return card("No rifle yet", "", "Parts fit a rifle: buy one on the Rifles tab first, then come back and build it the way you hunt.", "", "");
    let out = "";
    for (const slot of frameDef(g.frame).slots) {
      out += `<div class="ifloc" style="grid-column:1/-1;margin:8px 0 0;font-size:13px;font-weight:700;font-style:normal;letter-spacing:.08em;text-transform:uppercase">${SLOT_NAME[slot]}</div>`;
      for (const p of PARTS[slot]) {
        const own = ownsPart(slot, p.id), on = g.parts[slot] === p.id, dis = on || (!own && cash < p.cost);
        const lbl = on ? "Fitted" : own ? "Fit this" : cash < p.cost ? `${cash$(p.cost)} · not enough cash` : `Buy & fit · ${cash$(p.cost)}`;
        out += card(esc(p.name), p.cost ? cash$(p.cost) : "stock", esc(p.note), (on ? "" : deltaChips(slot, p, g)) + (own && !on && p.cost ? `<span class="ifchip ok">Owned</span>` : ""),
          `<button type="button" data-gpart="${slot}:${p.id}" ${dis ? "disabled" : ""}>${lbl}</button>`).replace('<div class="ifit">', `<div class="ifit${on ? " on" : ""}">`);
      }
    }
    return out;
  },
  bind(root, rerender) { root.querySelectorAll("button[data-gpart]").forEach(b => b.onclick = () => { const [sl, id] = b.dataset.gpart.split(":"); if (buyPart(sl, id)) rerender(); }); }
};
const ammoTab = {
  id: "g_ammo", label: "Ammunition", stores: [STORE],
  note: "Soft-point hunting rounds for the .308. Carried in the pack; the magazine holds what its part allows.",
  render(cash) {
    const s = S(), g = gun(), full = s.ammo + AMMO.n > AMMO.max;
    const lbl = !g ? "Buy a rifle first" : full ? `Carrying ${s.ammo}: that's all the pack takes` : cash < AMMO.cost ? `${cash$(AMMO.cost)} · not enough cash` : `Buy a box · ${cash$(AMMO.cost)}`;
    return card(esc(AMMO.name), cash$(AMMO.cost), "Bonded soft points: they hold together through a moose's shoulder and drop it clean.",
      `<span class="ifchip${s.ammo ? " ok" : ""}">${s.ammo} in the pack</span>` + (g ? `<span class="ifchip">${g.rounds} of ${stats(g).cap} in the magazine</span>` : ""),
      `<button type="button" data-gammo="1" ${!g || full || cash < AMMO.cost ? "disabled" : ""}>${lbl}</button>`);
  },
  bind(root, rerender) { const b = root.querySelector("button[data-gammo]"); if (b) b.onclick = () => { if (buyAmmo()) rerender(); }; }
};

// ---- where the shop is, its sign, and the room ----
function pickDoor() {
  const W = api.world, dp = W.depot, fs = api.fishSites && api.fishSites.shop;
  let best = null, bs = 1e9;
  for (const D of W.doors || []) {
    const r = Math.hypot(D.x - dp.x, D.z - dp.z); if (r > (api.townR || 108)) continue;
    const dx = D.x + D.nx * D.d / 2, dz = D.z + D.nz * D.d / 2, bx = dx + D.nx * 1.25, bz = dz + D.nz * 1.25;
    if (fs && Math.hypot(bx - fs.x, bz - fs.z) < 14) continue;
    if (W.isSea(bx, bz) || W.isWater(bx, bz)) continue;
    if (api.INT.beacons.some(b => Math.hypot(b.x - bx, b.z - bz) < 14)) continue;          // clear of Sport & Vinter and every other door ring
    const sc = Math.abs(r - 55);                                                             // a quieter street than the clothes shop
    if (sc < bs) { bs = sc; best = { D, dx, dz, bx, bz, ry: Math.atan2(D.nx, D.nz) }; }
  }
  return best;
}
function signTex() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#2c3a26"; g.fillRect(0, 0, 512, 128); g.strokeStyle = "#d9c79a"; g.lineWidth = 8; g.strokeRect(10, 10, 492, 108);
  g.fillStyle = "#efe4c4"; g.font = "bold 56px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("JAKT & VÅPEN", 256, 56);
  g.font = "22px Georgia, serif"; g.fillText("rifler · ammunisjon · jegerkurs", 256, 100);
  const t = new api.THREE.CanvasTexture(c); t.encoding = api.THREE.sRGBEncoding; return t;
}
function buildSign(p) {
  const T = api.THREE, W = api.world, y = W.groundAt(p.D.x, p.D.z);
  const m = new T.Mesh(new T.PlaneGeometry(1.7, 0.43), new T.MeshLambertMaterial({ map: signTex() }));
  m.position.set(p.dx + p.D.nx * 0.12, y + 2.38, p.dz + p.D.nz * 0.12); m.rotation.y = p.ry; api.scene.add(m);
  return m;
}
// the shop floor: the rifle rack on the back wall to the left, a glass case in the middle, antlers and the ammunition
// shelf on the right wall, a stove in the corner and the counter at the back. Door -> counter stays clear (x11_gunshop).
function buildRoom(R, K) {
  const IM = K.IM, box = api.mesh.box, cyl = api.mesh.cyl, std = api.mesh.std;
  const walnut = std(0x6b3f22, 0.7), blued = std(0x23262b, 0.45, 0.6), green = std(0x3b4a30, 1);
  K.shell(R, { plaster: true, doorX: -2.3, insul: true, wins: [["z", -3.88, 0.6, 1.3, 0.95, 1.8], ["x", 2.88, -0.9, 1.4, 0.95, 1.85]] });
  K.rug(R, -0.3, -0.4, 2.4, 1.6, IM.cloth);
  K.counter(R, COUNTER.x, COUNTER.z, COUNTER.w, 0);
  R.fire = K.stove(R, 3.25, 2.25, false, 0);
  // the rifle rack: a dark backboard, six rifles standing in it, two with scopes, a padlocked chain across
  { const g = K.sub(R, -1.6, 2.72, 0);
    box(2.3, 1.5, 0.06, IM.logD, 0, 1.15, 0.05, 0, 0, 0, g); box(2.3, 0.14, 0.32, IM.wood, 0, 0.35, -0.08, 0, 0, 0, g);
    for (let i = 0; i < 6; i++) {
      const x = -0.95 + i * 0.38;
      box(0.06, 0.5, 0.15, i % 3 === 1 ? green : walnut, x, 0.68, -0.06, 0, 0, 0, g);                    // stock
      cyl(0.014, 0.017, 0.95, blued, x, 1.38, -0.05, 0, 0, 0, g, 6);                                    // barrel + action
      box(0.045, 0.16, 0.06, blued, x, 1.0, -0.05, 0, 0, 0, g);
      if (i % 2 === 0) cyl(0.022, 0.022, 0.3, blued, x, 1.12, -0.11, 0, 0, 0, g, 8);                    // scope
    }
    box(2.2, 0.02, 0.02, IM.steel, 0, 1.25, -0.16, 0, 0, 0, g);
    K.col(R, -1.6, 2.62, 2.4, 0.42, 0, 1.9); }
  // the glass case: a table with a glazed top, scopes, magazines and boxes of rounds under the glass
  K.table(R, -0.6, 0.55, 1.4, 0.7, 0.85, 0);
  box(1.36, 0.22, 0.66, IM.glass, -0.6, 0.98, 0.55, 0, 0, 0, R.g);
  for (let i = 0; i < 4; i++) cyl(0.025, 0.025, 0.28, blued, -1.05 + i * 0.3, 0.9, 0.45, 0, 0, Math.PI / 2, R.g, 8);
  for (let i = 0; i < 5; i++) box(0.12, 0.05, 0.08, i % 2 ? std(0xb8402c, 1) : std(0xd8b34a, 1), -1.1 + i * 0.25, 0.89, 0.72, 0, 0, 0, R.g);
  // antlers over the stove side: a plaque and two branching beams
  { const g = K.sub(R, 3.74, 0.4, Math.PI / 2), bone = std(0xd8cdb4, 0.8);
    box(0.36, 0.42, 0.05, IM.wood, 0, 2.05, 0, 0, 0, 0, g);
    for (const s of [-1, 1]) {
      cyl(0.022, 0.03, 0.55, bone, s * 0.2, 2.3, -0.06, 0.2, 0, s * 0.7, g, 6);
      for (let k = 0; k < 3; k++) cyl(0.012, 0.018, 0.2, bone, s * (0.3 + k * 0.06), 2.45 + k * 0.07, -0.08, 0.3, 0, s * (0.1 - k * 0.2), g, 5);
    } }
  // ammunition shelf on the right wall
  K.shelf(R, 3.55, -1.3, 1.4, -Math.PI / 2);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 6; i++) box(0.14, 0.09, 0.2, [std(0xb8402c, 1), std(0xd8b34a, 1), std(0x2f5d7c, 1)][(i + j) % 3], 3.55, 1.5 + j * 0.46, -1.9 + i * 0.22, 0, 0, 0, R.g);
  K.bench(R, -3.4, 0.9, 1.5, Math.PI / 2, IM.wood);
  K.hooks(R, -3.72, -1.5, Math.PI / 2, 2, true);
  cyl(0.035, 0.035, 0.08, IM.brass, COUNTER.x + 0.55, 0.99, COUNTER.z - 0.1, 0, 0, 0, R.g, 10);           // the bell on the counter
  K.lamp(R, -0.6, 0.55, "pendant", 1.95); K.lamp(R, COUNTER.x, COUNTER.z - 0.4, "pendant", 1.95); K.lamp(R, -1.6, 1.9, "pendant", 1.95);
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
    hint: () => atCounter() ? `${api.keyHint("use", "talk to the gunsmith")} · walk into the doorway to go out` : `${STORE_NAME}: the counter's at the back · walk into the doorway to go out`,
    enter: () => api.toast(`${FULL_NAME}: gun oil and woodsmoke. The counter's at the back; walk back into the doorway to go out.`) });
}
const PROV = {
  use() {
    const I = api.INT; if (!I.on || !atCounter() || (api.shopOpen && api.shopOpen())) return null;
    return { label: "SHOP", hint: () => `${api.keyHint("use", "talk to the gunsmith")} · walk into the doorway to go out`, act: () => api.shop(STORE) };
  },
  digging: () => false
};
// a saved entry that isn't what we wrote (old save, hand edit, a bug) becomes a clean one, never a throw
function sanitize(s) {
  if (!isObj(s.parts)) s.parts = {};
  for (const k of Object.keys(s.parts)) { const [sl, id] = k.split(":"); if (!partList(sl) || !partList(sl).some(p => p.id === id && p.cost > 0)) delete s.parts[k]; }
  s.owned = (Array.isArray(s.owned) ? s.owned : []).filter(g => isObj(g) && frameDef(g.frame)).map(g => {
    const f = frameDef(g.frame), parts = {};
    for (const sl of f.slots) { const id = isObj(g.parts) ? g.parts[sl] : null; parts[sl] = ownsPart(sl, id) ? id : PARTS[sl][0].id; }
    const ng = { frame: f.id, parts, rounds: 0 }; ng.rounds = clamp(Math.floor(+g.rounds || 0), 0, stats(ng).cap); return ng;
  });
  s.cur = s.owned.length ? clamp(Math.floor(+s.cur || 0), 0, s.owned.length - 1) : -1;
  s.ammo = clamp(Math.floor(+s.ammo || 0), 0, AMMO.max); s.licence = s.licence === true;
}

TLX.option({ id: "huntlic", name: "Hunter's licence", hint: "The gun shop sells a rifle only after a short licence course at its counter ($180). Off = no licence needed.", sys: "guns" });
TLX.register({
  id: "guns", v: 1,
  state0: () => ({ owned: [], cur: -1, parts: {}, ammo: 0, licence: false }),
  migrate(st) { return st; },
  init(a) {
    api = a; const s = S(); if (s) sanitize(s);
    try { buildStore(); } catch (e) { console.error("TLX gun shop", e); }
    if (api.footx && !api.footx.includes(PROV)) api.footx.push(PROV);
  }
});
TLX.shopTabs = (TLX.shopTabs || []).concat([licTab, rifleTab, partsTab, ammoTab]);
TLX.stores = Object.assign(TLX.stores || {}, { [STORE]: { eyebrow: "Jakt &amp; Våpen · Kjøllefjord", title: "Guns & ammunition",
  foot: "Parts you've bought are yours: swap them on and off free. People can never be shot, by anyone, ever." } });
window.TLXGUN = { SLOTS, FRAMES, PARTS, AMMO, LICENCE, STORE, COUNTER, shop: SHOP, state: S, stats, gun, newGun, ownsPart, ownedParts, fit, buyPart, buyRifle, buyAmmo, takeCourse, atCounter, frameDef, partDef };
})();
