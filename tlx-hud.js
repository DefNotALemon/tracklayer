// Tracklayer — the minimalist HUD (11 Nov 2026, loop/LOOP.md Owner note "minimalist HUD + survival stats + bleed/bandage").
// Loaded after tlx-survival.js, before tlx-wounds.js. Markup and CSS are in index.html (#vit, #speedo/#rev, #compass).
//
//  * BOTTOM-LEFT, four thin bars, bottom to top: red warmth, brown hunger, yellow fuel, blue thirst. A bar fades to
//    near-invisible after VB_IDLE seconds without a real change (>= VB_STEP points since it last lit) and snaps back the
//    moment its value moves. A bar under VB_LOW of full stays lit and pulses.
//  * BOTTOM-RIGHT, the speed number (written by tracklayer.js updHud into #spd) with a quarter-and-a-bit arc round its
//    top-left that tracks engine rpm (P.rpm); it goes red at the redline.
//  * TOP-MIDDLE, an Elder-Scrolls style compass strip: N/E/S/W and the in-betweens slide as the camera turns, a triangle
//    stays fixed under the middle, and the tracked target is a small diamond on the strip. When the target is under the
//    triangle its title fades in for LBL_SHOW seconds, then out. tracklayer.js updGameHud picks the target and the text
//    (same priority chain as before) and hands them over through TLX.hud.compass(...).
// State: none saved. The bars read GS.warmth / GS.fuel / GS.hunger / GS.thirst.
(() => {
"use strict";
const VB_IDLE = 4, VB_STEP = 2, VB_LOW = 0.25, LBL_SHOW = 2.8, CONE = 5, SPAN = 140;   // seconds idle, points, fraction, seconds, degrees, degrees shown
let api = null;
const $ = id => document.getElementById(id);
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const bars = [];               // { el, fill, get, anchor, t, frac }
let revLast = -1, mwT = 0, cp = null;

function mkBar(id, get) { const el = $(id); if (!el) return; bars.push({ el, fill: el.firstElementChild, get, anchor: null, t: 0, frac: 1 }); }
function barTick(now) {
  for (const b of bars) {
    const v = b.get();                                                    // 0..100
    const f = clamp(v / 100, 0, 1);
    if (Math.abs(f - b.frac) > 0.002) { b.frac = f; b.fill.style.transform = `scaleX(${f.toFixed(3)})`; }
    const low = f < VB_LOW;
    if (b.anchor === null || Math.abs(v - b.anchor) >= VB_STEP) { b.anchor = v; b.t = now; }
    const lit = low || now - b.t < VB_IDLE * 1000;
    if (b.lit !== lit) { b.lit = lit; b.el.classList.toggle("on", lit); }
    if (b.low !== low) { b.low = low; b.el.classList.toggle("low", low); }
  }
}
// something happened to a bar (took damage, got cold): light it now
function poke(i) { const b = bars[i]; if (b) { b.t = performance.now(); b.anchor = b.get(); } }

/* ---- compass ---- */
function cpBuild() {
  const strip = $("cpStrip"); if (!strip) return null;
  strip.textContent = "";
  const items = [];
  const NAMES = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" };
  for (let a = 0; a < 360; a += 15) {
    const el = document.createElement("b");
    if (a % 45 === 0) { el.textContent = NAMES[a]; el.className = a % 90 === 0 ? "c" + (a === 0 ? " n" : "") : "m"; }
    else el.className = "t";
    strip.appendChild(el); items.push({ el, b: a });
  }
  const key = document.createElement("b"); key.className = "k"; key.hidden = true;
  key.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L20 12 L12 21 L4 12 Z" fill="currentColor"/></svg>';
  strip.appendChild(key);
  return { strip, items, key, w: 0, inCone: false, shownAt: -1e9, shownKey: "", armed: true, lastKey: "", head: 0, offs: 0, vis: false };
}
function wrap180(d) { return ((d % 360) + 540) % 360 - 180; }
// yaw: camState.yaw (radians); rel: bearing of the target minus yaw, as updGameHud computes it for the old arrow; title/sub: the job's text; col: its colour
function compass(yaw, rel, title, sub, col) {
  if (!cp) { cp = cpBuild(); if (!cp) return; }
  const w = cp.strip.clientWidth || 420, ppd = w / SPAN, head = wrap180(180 - yaw * 180 / Math.PI);
  cp.head = head;
  for (const it of cp.items) { const x = wrap180(it.b - head) * ppd; if (Math.abs(x) > w / 2 + 12) { if (!it.hid) { it.hid = true; it.el.style.display = "none"; } continue; } it.hid = false; it.el.style.display = ""; it.el.style.left = (w / 2 + x).toFixed(1) + "px"; }
  const offs = wrap180(-rel * 180 / Math.PI); cp.offs = offs;
  const kx = offs * ppd, inRange = Math.abs(kx) < w / 2;
  cp.key.hidden = !inRange; if (inRange) { cp.key.style.left = (w / 2 + kx).toFixed(1) + "px"; cp.key.style.color = col || ""; }
  // the label: fades in when the target is under the triangle, for LBL_SHOW seconds, again each time you swing onto it
  const now = performance.now(), inCone = Math.abs(offs) < CONE, k = title || "";
  if (inCone && (!cp.inCone || k !== cp.shownKey)) { cp.shownAt = now; cp.shownKey = k; }
  cp.inCone = inCone;
  const on = inCone && now - cp.shownAt < LBL_SHOW * 1000;
  const lbl = $("cpLbl");
  if (on) { if ($("cpT").textContent !== k) $("cpT").textContent = k; if ($("cpS").textContent !== (sub || "")) $("cpS").textContent = sub || ""; if (col) $("cpT").style.color = col; }
  if (cp.vis !== on) { cp.vis = on; lbl.classList.toggle("on", on); }
}

function tick() {
  if (!api) return;
  const now = performance.now(), sp = $("speedo");
  const shown = !!sp && !sp.hidden;
  const vit = $("vit"); if (vit && vit.hidden === shown) vit.hidden = !shown;
  const cpEl = $("compass"); if (cpEl && cpEl.hidden === shown) cpEl.hidden = !shown;
  if (!shown) return;
  barTick(now);
  // rev arc round the speed number
  const rp = api.P.rpm, f = clamp((rp - 0.14) / 0.9, 0, 1);
  if (Math.abs(f - revLast) > 0.004) { revLast = f; const a = $("revArc"); a.setAttribute("stroke-dasharray", (f * 100).toFixed(1) + " 100"); a.classList.toggle("red", f > 0.9); }
  // keep the speed number clear of the minimap, whose width changes with the layout
  if (now - mwT > 500) { mwT = now; const m = $("mapWrap"), w = m && m.getClientRects().length ? m.offsetWidth : 0; document.documentElement.style.setProperty("--mw", w + "px"); }
}

TLX.register({
  id: "hud", v: 1, state0: () => ({}),
  init(a) {
    api = a;
    const G = a.GS;
    mkBar("vbWarm", () => G.warmth);
    mkBar("vbHunger", () => G.hunger === undefined ? 100 : G.hunger);
    mkBar("vbFuel", () => G.fuel / Math.max(1, G.cap) * 100);
    mkBar("vbThirst", () => G.thirst === undefined ? 100 : G.thirst);
  },
  tick
});
TLX.hud = { compass, poke, bars, get cp() { return cp; }, consts: { VB_IDLE, VB_STEP, VB_LOW, LBL_SHOW, CONE, SPAN } };
})();
