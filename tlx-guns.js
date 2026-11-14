// Tracklayer — firearms, part one: the rifle, its parts, and the gun shop (G4 slice 11.1a, loop/EXPANSION.md milestone 11).
//
// Lemon (14 Nov 2026) wants Tarkov-style gun customization: scopes, magazines, better ammo, grips, longer barrels, stocks,
// handles, frames, with a quick way to swap on the go. This file is the model everything after it builds on:
//   FRAME  the base weapon (FRAMES; one to start: a bolt-action .308 hunting rifle). A frame lists its SLOTS.
//   PART   one option for one slot (PARTS[slot]): barrel, stock, grip, magazine, sight. Each carries stat deltas.
//          The first part of every slot is the frame's own stock part: free, and fitted to a new rifle, so a rifle
//          works the moment you buy it. Other parts are bought at the gun shop; once owned they swap on free, at the
//          counter now and anywhere with the quick-customize wheel (11.2, which calls fit()).
//   GUN    an owned rifle: { frame, parts: { barrel, stock, grip, magazine, sight }, rounds, ammo } (rounds = in the
//          magazine, ammo = which load they are: AMMOS, 11.3).
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
// Carrying it into the field, aiming, firing and the game you bring back are 11.1b: the block "in the field" below.
// People can never be shot: the trigger stays on safe with anyone, or any house, near the line of fire.
//
// SAVED under x.sys.guns: { owned: [gun...], cur, parts: { "sight:scope39": 1, ... }, ammo, alt: { load: n }, licence,
// game: [{ k }], taken: { kind: n } }. An old save, or a corrupt entry, starts with no rifle, no parts, no ammo, no licence, no game.
// Bridges in tracklayer.js: BTN.rifle + its key / pad / touch binding, the aim taking the walk controls in readInput,
// and api.wild / api.people / api.crack. Tests: x11_gunshop.mjs (the shop), x11_hunt.mjs (the field),
// x11_ammo.mjs (the four loads).
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
/* Cartridges (11.3). One calibre, four loads; the first is the standard soft point every rifle starts on. d: stat deltas
   like a part's, with "*stat" a multiplier (reach and noise scale with the load, they don't shift by a fixed amount).
   The magazine holds ONE load at a time (gun.ammo); changing load (the shop's Ammunition tab, or the Ammo slot of the
   quick wheel) empties the magazine back into the pack and it refills from the new load, a round at a time. When the load
   in use runs out, the magazine fills from the next load you carry and says so. The pack takes AMMO.max rounds, all loads
   together. Saved: s.ammo = soft points in the pack (the field every save since 11.1a has), s.alt = { id: n } the others. */
const AMMOS = [
  { id: "sp308", short: "soft point", name: ".308 soft point, box of 20", cost: 38, n: 20, d: {},
    note: "Bonded soft points: they hold together through a moose's shoulder and drop it clean. The load the rifle's sights are set for." },
  { id: "fmj308", short: "surplus ball", name: ".308 surplus ball, box of 20", cost: 24, n: 20, d: { spread: 0.6, "*range": 0.8 },
    note: "Old army full-metal-jacket, sold by weight. Cheap, and it shows: looser groups, and a bullet that doesn't open up kills clean only closer in." },
  { id: "match308", short: "match", name: ".308 match bonded, box of 20", cost: 74, n: 20, d: { spread: -0.5, "*range": 1.15, recoil: 0.05 },
    note: "Hand-weighed bonded bullets over a hotter charge. Tighter groups and more reach from the same rifle; a sharper push, and nearly twice the price." },
  { id: "sub308", short: "subsonic", name: ".308 subsonic, box of 20", cost: 58, n: 20, d: { "*noise": 0.4, "*range": 0.55, recoil: -0.3, spread: 0.3 },
    note: "A heavy bullet loaded below the speed of sound: no crack, so the next herd over keeps grazing. It drops fast: a close-range load." }
];
const AMMO = Object.assign({ max: 120 }, AMMOS[0]);
const ammoDef = id => AMMOS.find(a => a.id === id) || AMMOS[0];
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
  const am = ammoDef(gun.ammo).d;                                      // the load in the magazine (11.3)
  for (const k in am) { if (k[0] === "*") s[k.slice(1)] *= am[k]; else s[k] += am[k]; }
  s.spread = Math.max(0.4, +s.spread.toFixed(2)); s.recoil = Math.max(0.3, +s.recoil.toFixed(2)); s.handling = clamp(+s.handling.toFixed(2), 1, 10);
  s.kg = +s.kg.toFixed(2); s.noise = Math.max(0.3, +s.noise.toFixed(2)); s.range = Math.round(s.range);
  return s;
}
function newGun(fid) { const f = frameDef(fid), parts = {}; for (const sl of f.slots) parts[sl] = PARTS[sl][0].id; return { frame: fid, parts, rounds: 0, ammo: AMMOS[0].id }; }
// ---- the pack's rounds, by load ----
function pk(id) { const s = S(); if (!s) return 0; return id === AMMOS[0].id ? s.ammo : (isObj(s.alt) && s.alt[id] > 0 ? s.alt[id] : 0); }
function pkAdd(id, n) { const s = S(); if (!s || !AMMOS.some(a => a.id === id)) return; if (id === AMMOS[0].id) s.ammo = Math.max(0, s.ammo + n); else { if (!isObj(s.alt)) s.alt = {}; const v = Math.max(0, (s.alt[id] || 0) + n); if (v) s.alt[id] = v; else delete s.alt[id]; } }
const pkTotal = () => AMMOS.reduce((a, d) => a + pk(d.id), 0);
// the loads you can put in the rifle right now: what's in the magazine and whatever the pack holds
function ammoCarried() { const g = gun(); return AMMOS.filter(a => pk(a.id) > 0 || (g && g.ammo === a.id)); }
// what the magazine fills from: its own load while the pack has any, else (once it's empty) the next load you carry
function feed(g, say) {
  if (pk(g.ammo) > 0) return true;
  if (g.rounds > 0) return false;
  const a = AMMOS.find(d => pk(d.id) > 0); if (!a) return false;
  const was = ammoDef(g.ammo); g.ammo = a.id;
  if (say) api.toast(`Out of ${was.short} rounds: loading ${a.short}.`, "warn");
  return true;
}
// change the load in the rifle: the magazine's rounds go back in the pack, it refills from the new load
function loadAmmo(id, quiet) {
  const g = gun(), a = AMMOS.find(d => d.id === id); if (!g || !a) return false;
  if (g.ammo === id) return true;
  if (pk(id) <= 0) return false;
  /* beta 0192 #1: the magazine's rounds go back in a pack that takes AMMO.max. With the pack that full, as many of the
     new load go straight into the magazine as it takes to make the room (a round out for each round in); if you don't
     carry that many of the new load there's no room to do it, and the swap is refused. */
  const over = Math.max(0, pkTotal() + g.rounds - AMMO.max);
  if (over > pk(id)) { api.toast(`The pack's full (${pkTotal()} of ${AMMO.max}): no room for the ${g.rounds} ${ammoDef(g.ammo).short} ${g.rounds === 1 ? "round" : "rounds"} in the magazine. Fire a few off first.`, "warn"); return false; }
  pkAdd(g.ammo, g.rounds); g.ammo = id; g.rounds = over; pkAdd(id, -over);
  if (AIM.on) { AIM.load = TUNE.load; AIM.vmKey = ""; }
  api.save(); if (!quiet) api.toast(`${a.short[0].toUpperCase() + a.short.slice(1)} rounds for the magazine: ${pk(id)} in the pack.`, "good");
  return true;
}
function gun() { const s = S(); return s && s.cur >= 0 ? s.owned[s.cur] || null : null; }
function ownsPart(slot, id) { const s = S(), p = partList(slot) && partList(slot).find(o => o.id === id); return !!s && !!p && (p.cost === 0 || !!s.parts[slot + ":" + id]); }
function ownedParts(slot) { return (partList(slot) || []).filter(p => ownsPart(slot, p.id)); }
// swap an owned part onto the current rifle: free, instant (the quick-customize wheel, 11.2, calls this)
function fit(slot, id, quiet) {
  const g = gun(), L = partList(slot); if (!g || !L) return false;
  const p = L.find(o => o.id === id); if (!p || !ownsPart(slot, id) || !frameDef(g.frame).slots.includes(slot)) return false;
  if (g.parts[slot] === id) return true;
  const cap = stats(Object.assign({}, g, { parts: Object.assign({}, g.parts, { [slot]: id }) })).cap;
  if (g.rounds > cap) {                                               // a smaller magazine: the spare rounds go back in the pack, if it has the room (beta 0192 #1)
    const spare = g.rounds - cap;
    if (pkTotal() + spare > AMMO.max) { api.toast(`${p.name}: it holds ${cap}, and the pack's too full (${pkTotal()} of ${AMMO.max}) for the ${spare} ${spare === 1 ? "round" : "rounds"} left over. Fire a few off first.`, "warn"); return false; }
    pkAdd(g.ammo, spare); g.rounds = cap;
  }
  g.parts[slot] = id;
  api.save(); if (!quiet) api.toast(`${p.name} on the rifle.`, "good");
  return true;
}
function buyPart(slot, id) {
  const s = S(), L = partList(slot), p = L && L.find(o => o.id === id), G = api.GS; if (!s || !p) return false;
  if (!gun()) { api.toast("Buy the rifle first: parts fit a rifle.", "warn"); return false; }
  let bought = false;
  if (!ownsPart(slot, id)) {
    if (G.cash < p.cost) { api.toast(`That's ${cash$(p.cost)}. You have ${cash$(G.cash)}.`, "warn"); return false; }
    G.cash -= p.cost; s.parts[slot + ":" + id] = 1; bought = true;
  }
  if (fit(slot, id)) return true;
  if (bought) api.save();                                             // paid for, but it couldn't go on (a full pack): it's yours, the card says Owned
  return bought;
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
function buyAmmo(id) {
  const s = S(), G = api.GS, a = id === undefined ? AMMOS[0] : AMMOS.find(d => d.id === id); if (!s || !a) return false;
  if (!gun()) { api.toast("Buy a rifle first.", "warn"); return false; }
  if (pkTotal() + a.n > AMMO.max) return false;
  if (G.cash < a.cost) { api.toast(`A box is ${cash$(a.cost)}. You have ${cash$(G.cash)}.`, "warn"); return false; }
  G.cash -= a.cost; pkAdd(a.id, a.n); api.save();
  api.toast(a === AMMOS[0] ? `A box of ${a.n}: ${pk(a.id)} rounds in the pack.` : `A box of ${a.n} ${a.short}: ${pk(a.id)} of them in the pack, ${pkTotal()} rounds in all.`, "good");
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
      const fitted = own ? `<p class="ifnote">Fitted: ${f.slots.map(sl => esc(partDef(sl, g.parts[sl]).name)).join(" · ")}. ${g.rounds} in the magazine, ${pkTotal()} in the pack.</p>` : "";
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
  note: "Four loads for the .308, each a trade. The magazine holds one load at a time; the pack carries 120 rounds, all loads together. Change load here, or on the trail from the gun wheel's Ammo slot.",
  render(cash) {
    const g = gun(), tot = pkTotal();
    return AMMOS.map(a => {
      const n = pk(a.id), full = tot + a.n > AMMO.max, on = !!g && g.ammo === a.id;
      const lbl = !g ? "Buy a rifle first" : full ? `Carrying ${tot}: that's all the pack takes` : cash < a.cost ? `${cash$(a.cost)} · not enough cash` : `Buy a box · ${cash$(a.cost)}`;
      return card(esc(a.name), cash$(a.cost), esc(a.note),
        ammoChips(a, g) + `<span class="ifchip${n ? " ok" : ""}">${n} in the pack</span>` + (on ? `<span class="ifchip ok">Loaded · ${g.rounds} of ${stats(g).cap} in the magazine</span>` : ""),
        `<button type="button" data-gammo="${a.id}" ${!g || full || cash < a.cost ? "disabled" : ""}>${lbl}</button>` +
        (g && !on && n > 0 ? `<button type="button" data-gload="${a.id}">Load these</button>` : "")).replace('<div class="ifit">', `<div class="ifit${on ? " on" : ""}">`);
    }).join("");
  },
  bind(root, rerender) {
    root.querySelectorAll("button[data-gammo]").forEach(b => b.onclick = () => { if (buyAmmo(b.dataset.gammo)) rerender(); });
    root.querySelectorAll("button[data-gload]").forEach(b => b.onclick = () => { if (loadAmmo(b.dataset.gload)) rerender(); });
  }
};
// what a load changes, against the standard soft point in the same rifle
function ammoChips(a, g) {
  const base = g || newGun(FRAMES[0].id), cur = stats(Object.assign({}, base, { ammo: AMMOS[0].id })), nx = stats(Object.assign({}, base, { ammo: a.id })); let out = "";
  for (const [k, lbl, fmt, good] of STAT_ROWS) {
    const dv = nx[k] - cur[k]; if (Math.abs(dv) < 1e-6) continue;
    out += `<span class="ifchip ${dv * good > 0 ? "ok" : "bad"}">${lbl} ${dv > 0 ? "+" : "−"}${k === "spread" ? Math.abs(dv).toFixed(1) : k === "noise" || k === "recoil" ? Math.abs(dv).toFixed(2) : Math.round(Math.abs(dv))}</span>`;
  }
  return out || `<span class="ifchip">The standard load</span>`;
}

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
    const I = api.INT;
    if (AIM.on) return { label: "FIRE", hint: () => { const g = gun(), st = g && stats(g); return g ? `${api.keyHint("use", "fire")} · ${api.btn("turn")} / ${api.btn("walk")}: aim · ${api.keyHint("rifle", "sling it")} · clean to ${st.range} m` : ""; }, act: () => { fire(); } };
    if (!I.on && api.FOOT.on) { const c = carcass(); if (c) return { label: "DRESS", hint: () => api.keyHint("use", `dress the ${GAME[c.G.kind].name}`), act: () => { dress(); } }; }
    if (!I.on || !atCounter() || (api.shopOpen && api.shopOpen())) return null;
    return { label: "SHOP", hint: () => `${api.keyHint("use", "talk to the gunsmith")} · walk into the doorway to go out`, act: () => api.shop(STORE) };
  },
  digging: () => false
};
/* ---- in the field (11.1b): shoulder it, aim, fire, dress the animal, sell the game ----
   On foot, out of doors and clear of the houses, the rifle control (btn("rifle"): L / pad A / the RIFLE touch button)
   brings the rifle to the shoulder; the same control lowers it. Shouldered, you look down the rifle: the boots stay
   planted and the walk controls swing the aim (left/right turns you, forward/back raises and lowers the muzzle; a tap
   creeps, held it builds), at a speed set by the build's handling and its magnification. The view breathes (sway): it
   settles over the first seconds you hold still, a heavy swing or being out of breath stirs it up again, and a tighter
   build (bipod, heavy barrel, adjustable stock: the spread stat) holds steadier. The sight decides what you see: irons a
   post, the red dot a dot, the scope its ring and the magnified view. The use control (E / pad L3 / the touch button,
   which reads FIRE) is the trigger. A bolt action: each shot is followed by working the bolt (longer with more recoil),
   and an empty magazine is refilled from the pack, a round at a time.
   THE SHOT is a ray from the eye along the view plus the build's spread; it stops at the first hill. It takes the first
   live animal whose chest it passes through (WILD groups only: Santa's team and the dog aren't in them). Inside the
   build's clean-kill range the animal drops where it stands; past it the round has dropped below the chest: a miss, and
   the hint says so, so reach is bought with a barrel and a scope, never luck. The report (stat noise) puts every herd
   within SPOOK_R x noise metres to flight, hit or miss.
   PEOPLE CAN NEVER BE SHOT: before the trigger breaks, the line of fire is checked out to SAFE_REACH against everyone
   out of doors (other riders, anyone waiting on a rescue, the dog, drivers on the road) and against every house, village
   and cabin. Anything of theirs near the line and the rifle stays on safe: no shot, no round spent, and the reason
   toasts. Near houses it won't come to the shoulder at all.
   THE GAME: walk up to the animal and the use control dresses it (DRESS): its meat and pelt go on your tally (GAME:
   what the counter pays per kind; a grizzly, a lemming or an ermine is not game and pays nothing), up to CARRY_KG.
   The gun shop's counter buys it on a Game tab until the butcher comes (11.5). */
const TUNE = { sway: 0.003, settle: 2.2, raise: 0.85, turn: 0.9, bolt: 0.95, load: 0.5, fov: 52 };
const SPOOK_R = 420, SAFE_REACH = 700, MOA = 0.000291, CARRY_KG = 260, TOWN_PAD = 40, SITE_PAD = 70;
const GAME = { reindeer: { name: "reindeer", kg: 48, pay: 230 }, moose: { name: "moose", kg: 170, pay: 620 }, fox: { name: "fox", kg: 4, pay: 85, pelt: true }, hare: { name: "hare", kg: 3, pay: 22 } };
const KIND_NAME = { reindeer: "reindeer", moose: "moose", fox: "fox", hare: "hare", bear: "grizzly", lemming: "lemming", ermine: "ermine" };
const AIM = { on: false, t: 0, pitch: 0, ax: 0, ay: 0, hold: 0, still: 0, kick: 0, bolt: 0, load: 0, safeT: 0, ph: Math.random() * 9, sx: 0, sy: 0, vm: null, vmKey: "", last: null, dry: 0 };
const _eye = { x: 0, y: 0, z: 0 }, _dir = { x: 0, y: 0, z: 1 };
const outdoors = () => api && api.FOOT.on && !api.INT.on;
function nearHouses(x, z) {
  const W = api.world, dp = W.depot;
  if (Math.hypot(x - dp.x, z - dp.z) < (api.townR || 108) + TOWN_PAD) return "town";
  for (const s of W.SITES) if (s.x !== undefined && s.type !== "depot" && Math.hypot(s.x - x, s.z - z) < SITE_PAD) return s.name || "the houses";
  return null;
}
// can the rifle come up right here? null = yes, or the reason it stays slung
function slungWhy() {
  const g = gun(), F = api.FOOT;
  if (!g) return "none";
  if (!F.on || api.INT.on) return "foot";
  if (!api.swapOk() || F.ski || api.tablet() || (api.shopOpen && api.shopOpen()) || api.BOG.on) return "busy";
  const h = nearHouses(F.x, F.z); if (h) return h === "town" ? "town" : "site:" + h;
  return null;
}
const can = () => !!gun() && outdoors();          // the touch button shows whenever a rifle is on your back out of doors
/* beta 0190 #1: a menu over the game (Settings, the garage, the god panel, the death card). The keyboard's use key still
   reaches the trigger under Settings, so the rifle itself checks: a menu coming up slings it, and it neither fires nor
   comes up while one is open. */
const elUp = id => { const e = document.getElementById(id); return !!e && !e.hidden; };
const menuUp = () => !!(api.GS.garageOpen || api.GS.dead || elUp("settings") || elUp("god"));
function lower(quiet) {
  if (!AIM.on) return;
  AIM.on = false; AIM.t = 0; AIM.kick = 0; AIM.ax = AIM.ay = 0;
  if (AIM.vm) AIM.vm.visible = false;
  hud(false);
  const F = api.FOOT; if (F.g && F.on && !api.INT.on) F.g.visible = true;
  if (!quiet) api.toast("Rifle slung.");
}
function toggle() {
  if (!api || !api.started() || menuUp()) return false;
  if (AIM.on) { lower(); return true; }
  const why = slungWhy();
  if (why === "none" || why === "foot") { if (why === "none" && outdoors()) api.toast(`No rifle. ${FULL_NAME} in Kjøllefjord sells one.`, "warn"); return false; }
  if (why === "busy") { api.toast("Hands full: not now.", "warn"); return false; }
  if (why) { api.toast(why === "town" ? "Not in town: the rifle stays slung and empty until you're out on the fell." : `Too close to ${why.slice(5)}: the rifle stays slung near houses.`, "warn"); return false; }
  const g = gun(), s = S(), st = stats(g);
  AIM.on = true; AIM.t = 0; AIM.pitch = 0; AIM.hold = 0; AIM.still = 0; AIM.kick = 0; AIM.bolt = 0; AIM.dry = 0;
  const has = feed(g, true);
  AIM.load = g.rounds < st.cap && has ? TUNE.load : 0;
  api.toast(g.rounds || has ? `Rifle up. ${api.keyHint("use", "fire")} · ${api.keyHint("rifle", "sling it")}` : "Rifle up, and empty: not a round in the magazine or the pack.", g.rounds || has ? undefined : "warn");
  return true;
}
// the rifle you look down, built from the parts fitted (so a new barrel or a scope shows the moment it's on)
function viewModel() {
  const g = gun(), key = g ? g.frame + ":" + SLOTS.map(sl => g.parts[sl]).join(",") : "";
  if (AIM.vm && AIM.vmKey === key) return AIM.vm;
  if (AIM.vm) api.scene.remove(AIM.vm);
  const T = api.THREE, box = api.mesh.box, cyl = api.mesh.cyl, std = api.mesh.std, G = new T.Group(), p = g.parts, H = Math.PI / 2;
  const steel = std(0x22252a, 0.42, 0.7), black = std(0x15171a, 0.8, 0.1);
  const wood = p.stock === "walnut" ? std(0x2f1b0f, 0.55) : p.stock === "synth" ? std(0x2b2f33, 0.9) : std(0x4a4f45, 0.85);
  // -z is down-range. Butt at z = +0.30, action over the grip, fore-end out to -0.32, then the barrel.
  box(0.042, 0.11, 0.3, wood, 0, -0.06, 0.17, 0.16, 0, 0, G);                                    // butt
  box(0.044, 0.11, 0.012, black, 0, -0.085, 0.322, 0.16, 0, 0, G);                                // recoil pad
  if (p.stock === "adjust") box(0.034, 0.03, 0.16, black, 0, 0.0, 0.16, 0.16, 0, 0, G);       // raised comb
  box(0.04, 0.05, 0.36, wood, 0, -0.03, -0.16, 0, 0, 0, G);                                   // fore-end
  box(0.04, 0.1, 0.05, p.grip === "rubber" ? black : wood, 0, -0.075, 0.03, 0.35, 0, 0, G);     // wrist / grip
  cyl(0.019, 0.019, 0.24, steel, 0, 0.015, -0.06, H, 0, 0, G, 10);                              // receiver
  cyl(0.004, 0.004, 0.036, steel, 0.032, 0.006, 0.03, 0, 0, H * 0.7, G, 6);                      // bolt handle
  if (api.mesh.ball) api.mesh.ball(0.0065, steel, 0.048, -0.004, 0.03, G);
  const bl = p.barrel === "carb18" ? 0.42 : p.barrel === "heavy24" ? 0.6 : 0.54, br = p.barrel === "heavy24" ? 0.014 : 0.0105;
  cyl(br * 0.92, br, bl, steel, 0, 0.015, -0.18 - bl / 2, H, 0, 0, G, 10);
  const mz = -0.18 - bl;
  if (p.magazine !== "int3") { const mh = p.magazine === "det10" ? 0.15 : 0.06; box(0.03, mh, 0.075, black, 0, -0.065 - mh / 2, -0.08, 0.06, 0, 0, G); }
  box(0.012, 0.03, 0.09, steel, 0, -0.07, 0.0, 0, 0, 0, G);                                     // trigger guard
  if (p.grip === "bipod") for (const sx of [-1, 1]) cyl(0.005, 0.005, 0.24, steel, sx * 0.02, -0.07, -0.42, H * 0.92, 0, 0, G, 5);
  if (p.sight === "iron") { box(0.004, 0.022, 0.004, steel, 0, 0.037, mz + 0.03, 0, 0, 0, G); for (const sx of [-1, 1]) box(0.007, 0.012, 0.006, black, sx * 0.0075, 0.04, -0.14, 0, 0, 0, G); }   // front post, rear notch
  else if (p.sight === "red1") { box(0.03, 0.012, 0.05, black, 0, 0.04, -0.04, 0, 0, 0, G); for (const sx of [-1, 1]) box(0.004, 0.034, 0.045, black, sx * 0.017, 0.062, -0.04, 0, 0, 0, G); box(0.038, 0.004, 0.045, black, 0, 0.08, -0.04, 0, 0, 0, G); }   // an open window, so you see through it
  else { cyl(0.014, 0.014, 0.3, black, 0, 0.066, -0.04, H, 0, 0, G, 10); cyl(0.022, 0.016, 0.07, black, 0, 0.066, -0.2, H, 0, 0, G, 12); cyl(0.018, 0.02, 0.05, black, 0, 0.066, 0.12, H, 0, 0, G, 12);
    for (const z of [-0.1, 0.03]) box(0.02, 0.035, 0.018, steel, 0, 0.045, z, 0, 0, 0, G); }
  G.traverse(o => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  api.scene.add(G); AIM.vm = G; AIM.vmKey = key; AIM.len = 0.5 + bl;
  return G;
}
function hud(on) {
  let el = document.getElementById("gunHud");
  if (!on) { if (el) el.hidden = true; return null; }
  if (!el) {
    const st = document.createElement("style");
    st.textContent = `#gunHud{position:fixed;inset:0;pointer-events:none;z-index:6}
#gunHud .ret{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}
#gunHud .post{width:2px;height:9px;background:#111;box-shadow:0 0 0 1px rgba(255,255,255,.5);margin-top:5px}
#gunHud .dot{width:7px;height:7px;border-radius:50%;background:#ff3b2f;box-shadow:0 0 8px 2px rgba(255,59,47,.7)}
#gunHud .scope{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,transparent 0,transparent calc(min(42vh,42vw) - 2px),#000 min(42vh,42vw))}
#gunHud .scope:before,#gunHud .scope:after{content:"";position:absolute;background:rgba(0,0,0,.85)}
#gunHud .scope:before{left:50%;top:calc(50% - min(42vh,42vw));height:calc(2*min(42vh,42vw));width:1.5px;transform:translateX(-50%)}
#gunHud .scope:after{top:50%;left:calc(50% - min(42vh,42vw));width:calc(2*min(42vh,42vw));height:1.5px;transform:translateY(-50%)}
#gunHud .amm{position:absolute;left:50%;bottom:calc(206px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);font:700 13px/1 var(--display,system-ui);letter-spacing:.1em;color:#fff;text-shadow:0 1px 3px #000,0 0 8px rgba(0,0,0,.6);white-space:nowrap}
#gunHud .amm.safe{color:#ffb86b}`;
    document.head.appendChild(st);
    el = document.createElement("div"); el.id = "gunHud"; el.innerHTML = `<div class="scope" hidden></div><div class="ret"></div><div class="amm"></div>`;
    document.body.appendChild(el);
  }
  el.hidden = false; return el;
}
// who or what of people's is near the line of fire: null = clear. 2D, so a shot over a roof is still refused.
function unsafe(ox, oz, dx, dz) {
  const hl = Math.hypot(dx, dz) || 1, ux = dx / hl, uz = dz / hl, W = api.world;
  const off = (x, z, pad) => { const t = clamp((x - ox) * ux + (z - oz) * uz, 0, SAFE_REACH), d = Math.hypot(ox + ux * t - x, oz + uz * t - z); return d < pad + t * 0.03 ? t : -1; };
  const ppl = api.people ? api.people().slice() : [];
  const TT = window.TLXT; if (TT && Array.isArray(TT.cars)) for (const c of TT.cars) if (c.on && Number.isFinite(c.x) && Number.isFinite(c.z)) ppl.push({ x: c.x, z: c.z, who: "driver" });
  let best = null;
  for (const p of ppl) { const t = off(p.x, p.z, 6); if (t >= 0 && (!best || t < best.t)) best = { t, who: p.who === "dog" ? "a dog" : p.who === "driver" ? "a car" : p.who === "rider" ? "a rider" : "someone" }; }
  if (best) return `${best.who[0].toUpperCase() + best.who.slice(1)} is down-range, ${Math.round(best.t)} m out. The rifle stays on safe.`;
  if (off(W.depot.x, W.depot.z, (api.townR || 108)) >= 0) return "That's toward Kjøllefjord. The rifle stays on safe.";
  for (const s of W.SITES) if (s.x !== undefined && s.type !== "depot" && off(s.x, s.z, 45) >= 0) return `That's toward ${s.name || "the houses"}. The rifle stays on safe.`;
  for (const D of W.doors || []) if (off(D.x, D.z, 22) >= 0) return "There's a house down-range. The rifle stays on safe.";
  return null;
}
// first hill the bullet meets before `far` metres: the distance, or -1 for a clear line
function hillAt(far) {
  const W = api.world;
  for (let t = 3; t < far; t += 3) { const x = _eye.x + _dir.x * t, z = _eye.z + _dir.z * t; if (_eye.y + _dir.y * t < W.surf(x, z) - 0.05) return t; }
  return -1;
}
// the nearest live animal whose chest the line passes through
function target(dx, dy, dz) {
  const W = api.world; let best = null;
  for (const G of api.wild.groups()) for (const q of G.m) {
    if (q.dead || q.dive > 0 || !q.g.visible) continue;
    const sc = q.g.scale.x, cy = W.surf(q.x, q.z) + q.sp.hipY * sc * 0.92, r = Math.max(0.05, q.sp.len * 0.3 * sc);
    const rx = q.x - _eye.x, ry = cy - _eye.y, rz = q.z - _eye.z, t = rx * dx + ry * dy + rz * dz; if (t < 1.5) continue;
    const m = Math.hypot(rx - dx * t, ry - dy * t, rz - dz * t);
    if (m < r && (!best || t < best.t)) best = { G, q, t, m };
  }
  return best;
}
function fire() {
  const g = gun(), s = S(); if (!AIM.on || !g || menuUp()) return false;
  if (AIM.t < 1 || AIM.bolt > 0 || (AIM.load > 0 && g.rounds <= 0)) return false;
  AIM.load = 0;                                                       // firing breaks off topping the magazine up
  if (g.rounds <= 0) { AIM.last = { res: "empty" }; if (api.now() - AIM.dry > 1.5) { AIM.dry = api.now(); const has = feed(g, true); if (has && AIM.load <= 0) AIM.load = TUNE.load; api.toast(has ? "Click. Empty: loading." : "Click. Empty, and not a round in the pack.", "warn"); } return false; }
  const why = unsafe(_eye.x, _eye.z, _dir.x, _dir.z);
  if (why) { AIM.last = { res: "safe", why }; AIM.safeT = 2.5; api.toast(why, "warn"); return false; }
  const st = stats(g), sg = st.spread * MOA * 0.5, rn = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
  // the bullet: the view's line, opened by the build's spread
  const yaw = Math.atan2(_dir.x, _dir.z) + rn() * sg, pit = Math.asin(clamp(_dir.y, -1, 1)) + rn() * sg, cp = Math.cos(pit);
  const dx = Math.sin(yaw) * cp, dy = Math.sin(pit), dz = Math.cos(yaw) * cp;
  g.rounds--; AIM.kick = 1; AIM.bolt = TUNE.bolt * (0.75 + 0.35 * st.recoil); AIM.still *= 0.35;
  if (api.crack) api.crack(1); api.thud(0.7); if (api.whump) api.whump(0.5);
  const F = api.FOOT, n = api.wild.spook(F.x, F.z, SPOOK_R * st.noise);
  const hit = target(dx, dy, dz), hill = hillAt(hit ? hit.t : 400);
  let res = "miss", msg = "";
  if (hit && hill < 0) {
    const d = Math.round(hit.t), nm = KIND_NAME[hit.G.kind] || hit.G.kind;
    if (hit.t <= st.range) { api.wild.shot(hit.G, hit.q); res = "kill"; s.taken[hit.G.kind] = (s.taken[hit.G.kind] || 0) + 1;
      msg = GAME[hit.G.kind] ? `The ${nm} drops where it stood, ${d} m out. Walk up to it to dress it.` : hit.G.kind === "bear" ? `The grizzly goes down, ${d} m out.` : `The ${nm} is hit, ${d} m out. Not game: nothing to take.`; }
    else { res = "short"; msg = `${d} m: past this rifle's clean reach${g.ammo !== AMMOS[0].id ? " with " + ammoDef(g.ammo).short + " rounds" : ""} (${st.range} m). The round drops under the ${nm}'s chest and it's gone.`; }
  } else if (hit && hill >= 0) { res = "hill"; msg = "Snow jumps off the rise in front of it: the ground was in the way."; }
  AIM.last = { res, kind: hit ? hit.G.kind : null, d: hit ? hit.t : 0, spooked: n, rounds: g.rounds, ammo: g.ammo, reach: st.range, heard: SPOOK_R * st.noise };
  if (msg) api.toast(msg, res === "kill" ? "good" : "warn");
  if (g.rounds <= 0 && feed(g, true)) AIM.load = AIM.bolt + TUNE.load;
  api.save();
  return true;
}
// the carcass at your boots, if there is one to dress
function carcass() {
  const F = api.FOOT; let best = null, bd = 2.6;
  for (const G of api.wild.groups()) for (const q of G.m) { if (q.dead !== 1 || !GAME[G.kind]) continue; const d = Math.hypot(q.x - F.x, q.z - F.z); if (d < bd) { bd = d; best = { G, q }; } }
  return best;
}
const carriedKg = () => S().game.reduce((a, it) => a + (GAME[it.k] ? GAME[it.k].kg : 0), 0);
function dress() {
  const c = carcass(), s = S(); if (!c) return false;
  const gm = GAME[c.G.kind];
  if (carriedKg() + gm.kg > CARRY_KG) { api.toast(`You can't haul any more: ${Math.round(carriedKg())} kg of game already. Sell it at ${STORE_NAME} first.`, "warn"); return false; }
  c.q.dead = 2;                                                       // dressed: it stays where it fell, there's nothing more to take
  s.game.push({ k: c.G.kind }); api.save();
  api.toast(gm.pelt ? `The ${gm.name}'s pelt, rolled and in the pack. ${STORE_NAME} pays ${cash$(gm.pay)}.` : `The ${gm.name}, dressed: ${gm.kg} kg of meat on the sled. ${STORE_NAME} pays ${cash$(gm.pay)}.`, "good");
  return true;
}
function sellGame() {
  const s = S(); if (!s.game.length) return false;
  let pay = 0; for (const it of s.game) pay += GAME[it.k] ? GAME[it.k].pay : 0;
  const n = s.game.length; s.game = []; api.GS.cash += pay; api.save();
  api.toast(`${n === 1 ? "One animal" : n + " animals"} over the counter: ${cash$(pay)}.`, "good");
  return true;
}
const gameTab = {
  id: "g_game", label: "Game", stores: [STORE],
  note: "The counter buys what you bring in off the fell, dressed: reindeer, moose and hare by the animal, fox by the pelt.",
  render() {
    const s = S(), cnt = {}; let pay = 0;
    for (const it of s.game) { cnt[it.k] = (cnt[it.k] || 0) + 1; pay += GAME[it.k] ? GAME[it.k].pay : 0; }
    const rows = Object.keys(GAME).map(k => card(esc(GAME[k].name[0].toUpperCase() + GAME[k].name.slice(1)), cash$(GAME[k].pay), GAME[k].pelt ? "Paid by the pelt." : `About ${GAME[k].kg} kg dressed.`,
      `<span class="ifchip${cnt[k] ? " ok" : ""}">${cnt[k] || 0} with you</span>`, "")).join("");
    return card("What you've brought in", pay ? cash$(pay) : "", s.game.length ? `${s.game.length} ${s.game.length === 1 ? "animal" : "animals"}, ${Math.round(carriedKg())} kg of the ${CARRY_KG} kg you can haul.` : "Nothing yet. Shoulder the rifle out on the fell, well clear of the houses; walk up to the animal to dress it.", "",
      `<button type="button" data-gsell="1" ${s.game.length ? "" : "disabled"}>${s.game.length ? "Sell it all · " + cash$(pay) : "Nothing to sell"}</button>`) + rows;
  },
  bind(root, rerender) { const b = root.querySelector("button[data-gsell]"); if (b) b.onclick = () => { if (sellGame()) rerender(); }; }
};
function aimTick(dt) {
  const F = api.FOOT, g = gun();
  if (!AIM.on) return;
  if (!g || !F.on || api.INT.on || !api.swapOk() || api.tablet() || F.ski || (api.shopOpen && api.shopOpen()) || menuUp()) { lower(true); return; }
  const st = stats(g), s = S(), W = api.world, cam = api.camera;
  AIM.t = Math.min(1, AIM.t + dt / (TUNE.raise * (1.5 - st.handling * 0.08)));
  // swing: a tap creeps, a held push builds; a scope slows it to keep the animal in the glass
  const push = Math.max(Math.abs(AIM.ax), Math.abs(AIM.ay));
  AIM.hold = push > 0.1 ? AIM.hold + dt : 0;
  const rate = TUNE.turn * (0.5 + st.handling * 0.1) * (0.25 + 0.75 * api.sstep(0.1, 0.9, AIM.hold)) / Math.pow(st.zoom, 0.75);
  F.yaw += -AIM.ax * rate * dt; AIM.pitch = clamp(AIM.pitch + AIM.ay * rate * 0.6 * dt, -0.55, 0.6);
  AIM.still = push > 0.1 ? Math.max(0, AIM.still - dt * 1.2 * push) : Math.min(1, AIM.still + dt / TUNE.settle);
  AIM.kick = Math.max(0, AIM.kick - dt * (2.4 / st.recoil));
  if (AIM.bolt > 0) AIM.bolt = Math.max(0, AIM.bolt - dt);
  if (AIM.safeT > 0) AIM.safeT -= dt;
  if (AIM.load > 0 && (AIM.load -= dt) <= 0) {
    if (g.rounds < st.cap && feed(g, true)) { g.rounds++; pkAdd(g.ammo, -1); AIM.load = g.rounds < st.cap && pk(g.ammo) > 0 ? TUNE.load : 0; if (!AIM.load) api.save(); } else AIM.load = 0;
  }
  // sway: two slow breaths out of step; unsettled it is 3x wider, out of breath wider still
  AIM.ph += dt;
  const amp = TUNE.sway * (0.55 + st.spread / 4.4) * (1 + 2 * (1 - AIM.still) + 1.5 * clamp(F.wind || 0, 0, 1));
  AIM.sx = amp * (Math.sin(AIM.ph * 1.31) + 0.45 * Math.sin(AIM.ph * 2.9 + 1.3)); AIM.sy = amp * 0.8 * (Math.sin(AIM.ph * 0.97 + 0.6) + 0.4 * Math.sin(AIM.ph * 2.3));
  const up = api.sstep(0, 1, AIM.t), kick = AIM.kick * AIM.kick * 0.035 * st.recoil;
  const yaw = F.yaw + AIM.sx, pit = AIM.pitch + AIM.sy + kick, cp = Math.cos(pit);
  _dir.x = Math.sin(yaw) * cp; _dir.y = Math.sin(pit); _dir.z = Math.cos(yaw) * cp;
  _eye.x = F.x; _eye.z = F.z; _eye.y = Math.max(F.y, W.surf(F.x, F.z) - 0.4) + 1.6;
  if (F.g) F.g.visible = false;                                        // you're looking out of their eyes
  cam.position.set(_eye.x, _eye.y, _eye.z); cam.lookAt(_eye.x + _dir.x * 50, _eye.y + _dir.y * 50, _eye.z + _dir.z * 50);
  const fov = api.lerp(cam.fov, TUNE.fov / st.zoom, up >= 1 ? 1 : 1 - Math.exp(-10 * dt));
  if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
  cam.updateMatrixWorld();
  // the rifle in your hands: up from the hip as it's raised, back and up on the kick, canted while the bolt works
  const vm = viewModel(), scoped = st.zoom > 1.5;
  vm.visible = !scoped || up < 0.98;
  if (vm.visible) {
    const bk = AIM.bolt > 0 ? Math.sin(Math.PI * clamp(1 - AIM.bolt / (TUNE.bolt * (0.75 + 0.35 * st.recoil)), 0, 1)) : 0, ld = AIM.load > 0 && AIM.bolt <= 0 ? 1 : 0;
    vm.position.set(api.lerp(0.2, 0, up) + bk * 0.012, api.lerp(-0.42, g.parts.sight === "red1" ? -0.063 : -0.049, up) - ld * 0.05, -0.3 + AIM.kick * 0.05).applyMatrix4(cam.matrixWorld);
    vm.quaternion.copy(cam.quaternion); vm.rotateX((1 - up) * -0.5 + AIM.kick * 0.05 - ld * 0.16); vm.rotateZ(-bk * 0.28 - ld * 0.2); vm.rotateY((1 - up) * 0.35);
  }
  const el = hud(true), ret = el.children[1], sc = el.children[0], amm = el.children[2];
  const cls = up < 0.98 ? "" : st.zoom > 1.5 ? "" : g.parts.sight === "red1" ? "dot" : "post";
  if (ret.className !== "ret " + cls) ret.className = "ret " + cls;
  sc.hidden = !(scoped && up >= 0.98);
  const txt = AIM.safeT > 0 ? "ON SAFE" : AIM.load > 0 && AIM.bolt <= 0 ? `LOADING · ${g.rounds} / ${st.cap}` : `${g.rounds} / ${st.cap} · ${pk(g.ammo)} in the pack` + (g.ammo !== AMMOS[0].id || pkTotal() !== pk(g.ammo) ? " · " + ammoDef(g.ammo).short.toUpperCase() : "");
  if (amm.textContent !== txt) amm.textContent = txt;
  amm.classList.toggle("safe", AIM.safeT > 0);
}

// a saved entry that isn't what we wrote (old save, hand edit, a bug) becomes a clean one, never a throw
function sanitize(s) {
  if (!isObj(s.parts)) s.parts = {};
  for (const k of Object.keys(s.parts)) { const [sl, id] = k.split(":"); if (!partList(sl) || !partList(sl).some(p => p.id === id && p.cost > 0)) delete s.parts[k]; }
  s.owned = (Array.isArray(s.owned) ? s.owned : []).filter(g => isObj(g) && frameDef(g.frame)).map(g => {
    const f = frameDef(g.frame), parts = {};
    for (const sl of f.slots) { const id = isObj(g.parts) ? g.parts[sl] : null; parts[sl] = ownsPart(sl, id) ? id : PARTS[sl][0].id; }
    const ng = { frame: f.id, parts, rounds: 0, ammo: ammoDef(g.ammo).id }; ng.rounds = clamp(Math.floor(+g.rounds || 0), 0, stats(ng).cap); return ng;
  });
  s.cur = s.owned.length ? clamp(Math.floor(+s.cur || 0), 0, s.owned.length - 1) : -1;
  s.ammo = clamp(Math.floor(+s.ammo || 0), 0, AMMO.max); s.licence = s.licence === true;
  { const alt = {}; let room = AMMO.max - s.ammo;                      // the other loads: known ids, whole counts, the pack's 120 in all
    if (isObj(s.alt)) for (const a of AMMOS.slice(1)) { const n = clamp(Math.floor(+s.alt[a.id] || 0), 0, room); if (n > 0) { alt[a.id] = n; room -= n; } }
    s.alt = alt; }
  s.game = (Array.isArray(s.game) ? s.game : []).filter(it => isObj(it) && GAME[it.k]).slice(0, 40).map(it => ({ k: it.k }));
  if (!isObj(s.taken)) s.taken = {};
  for (const k of Object.keys(s.taken)) { if (!KIND_NAME[k] || !(s.taken[k] > 0)) delete s.taken[k]; else s.taken[k] = Math.floor(s.taken[k]); }
}

TLX.option({ id: "huntlic", name: "Hunter's licence", hint: "The gun shop sells a rifle only after a short licence course at its counter ($180). Off = no licence needed.", sys: "guns" });
TLX.register({
  id: "guns", v: 3,
  state0: () => ({ owned: [], cur: -1, parts: {}, ammo: 0, alt: {}, licence: false, game: [], taken: {} }),
  migrate(st) { return st; },
  init(a) {
    api = a; const s = S(); if (s) sanitize(s);
    AIM.on = false;
    try { buildStore(); } catch (e) { console.error("TLX gun shop", e); }
    if (api.footx && !api.footx.includes(PROV)) api.footx.unshift(PROV);       // first: with the rifle up, the use control is the trigger
  },
  tick(dt) { if (AIM.on) aimTick(dt); }
});
TLX.guns = { aim: AIM, toggle, can, fire, lower };
TLX.shopTabs = (TLX.shopTabs || []).concat([licTab, rifleTab, partsTab, ammoTab, gameTab]);
TLX.stores = Object.assign(TLX.stores || {}, { [STORE]: { eyebrow: "Jakt &amp; Våpen · Kjøllefjord", title: "Guns & ammunition",
  foot: "Parts you've bought are yours: swap them on and off free. People can never be shot, by anyone, ever." } });
window.TLXGUN = { SLOTS, FRAMES, PARTS, AMMO, AMMOS, ammoDef, ammoCarried, loadAmmo, pk, pkTotal, LICENCE, STORE, COUNTER, shop: SHOP, state: S, stats, gun, newGun, ownsPart, ownedParts, fit, buyPart, buyRifle, buyAmmo, takeCourse, atCounter, frameDef, partDef,
  AIM, TUNE, GAME, CARRY_KG, SPOOK_R, toggle, lower, fire, can, slungWhy, unsafe, target, carcass, dress, sellGame, carriedKg, eye: _eye, dir: _dir };
})();
