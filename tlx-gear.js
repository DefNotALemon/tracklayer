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
// SAVED under x.sys.gear: { base, mid, own: { "base:merino": 1, ... }, wet }. An old save starts in cotton, no mid, dry.
// Bridges in tracklayer.js: stats() adds TLXG.warm() to ST.warm; the cold drain line multiplies by TLXG.coldK().
// icefish.js renders extra shop tabs from TLX.shopTabs. Test: tools/playtest/scenarios/x10_layers.mjs.
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

TLX.register({
  id: "gear", v: 1,
  state0: () => ({ base: "cotton", mid: "none", own: {}, wet: 0, warned: false }),
  migrate(st) { return st; },
  init(a) {
    api = a; const s = S();
    if (s) { s.base = def("base", s.base).id; s.mid = def("mid", s.mid).id; if (!s.own || typeof s.own !== "object") s.own = {}; s.wet = clamp(+s.wet || 0, 0, 1); }
    api.restat();
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
TLX.shopTabs = (TLX.shopTabs || []).concat([shopTab("base"), shopTab("mid")]);
window.TLXG = { LAYERS, SWEAT, SOAK, DRY_IN, warm, coldK, exertion, buy, owns, wearing, state: S };
})();
