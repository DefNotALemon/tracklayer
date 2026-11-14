// Tracklayer — the quick-customize wheel (G4 slice 11.2, loop/EXPANSION.md milestone 11; Lemon, 14 Nov 2026: "i want tarkov
// customization with streamlining for on the go quick customization").
//
// tlx-guns.js is the rifle: the model (frame, five slots, parts, stats), Jakt & Våpen where parts are BOUGHT, and the field
// (shoulder, aim, fire, dress). This file is only the way to change what's on the rifle in a moment, on the trail. HOLD the gun
// control (R on a keyboard, D-pad left on a pad, the GUN button on touch; BTN.gun) and a wheel opens over the game at once,
// pausing nothing, on foot or on the sled, even with the rifle shouldered: the five slots (barrel, stock, grip, magazine, sight)
// round a silhouette of YOUR rifle as it is fitted now. Pick a slot and a strip shows only the parts you ALREADY OWN for it
// (TLXGUN.ownedParts), each with small +/- bars against what's fitted (accuracy, recoil, handling, reach, weight, noise: the
// same stats() the shop's cards use). Pick one: TLXGUN.fit() swaps it on free, it snaps on (a thud and a buzz on a phone), the
// wheel closes. Buying a new part stays the shop's job; the wheel is purely a swap of parts already in the kit.
//   Keyboard: hold R, then 1-5 for the slot and 1-9 for the part (or click), R or Esc closes (Esc doesn't open Settings).
//   Pad: hold D-pad left (a quick tap still wipes the visor), D-pad / stick / LB RB move round, A picks, B backs out.
//   Touch: hold GUN, tap the slot, tap the part, or the ✕. Holding opens it; letting go leaves it open for the picks.
// Every label comes from the api's btn() / keyHint(), never a typed key name. Nothing here fires, aims or hits anything: the
// rule that people can never be shot lives in tlx-guns.js (unsafe()).
// No saved state. Bridges in tracklayer.js: BTN gun / wmove / wclose, api.wipe + api.pads, the pad loop's wheel branch and its
// D-pad left hold. Test: x11_wheel.mjs.
(() => {
"use strict";
const BAR = [                       // what the strip shows: stat, label, how much fills a bar, which way is better (+1 higher, -1 lower)
  ["spread", "Accuracy", 0.8, -1], ["recoil", "Recoil", 0.4, -1], ["handling", "Handling", 2, 1],
  ["range", "Reach", 60, 1], ["kg", "Weight", 1, -1], ["noise", "Noise", 0.3, -1]
];
const HOLD_OPEN = 0.18;              // s of holding the gun control that opens the wheel
let api = null, wheel = null, touchBtn = null, hinted = false;
const W = { open: false, stage: "slot", hl: 0, slot: -1, part: 0 };
const H = { kb: 0, pad: 0, touch: 0, touchOn: false, padPrev: {}, padDown: false };
const GN = () => window.TLXGUN;
const gun = () => GN() && GN().gun();
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const $ = id => document.getElementById(id);
const stats = g => GN().stats(g || gun());
const slotsOf = g => GN().frameDef(g.frame).slots;
const SLOTN = { barrel: "Barrel", stock: "Stock", grip: "Grip", magazine: "Magazine", sight: "Sight" };
const modal = () => api.GS.garageOpen || !$("settings").hidden || (!!$("god") && !$("god").hidden) || api.tablet() || api.shopOpen() || api.busy() || api.GS.dead;

function css() {
  if ($("gnCss")) return;
  const st = document.createElement("style"); st.id = "gnCss";
  st.textContent = `
  #gnWheel{position:fixed;inset:0;z-index:25;pointer-events:none;display:flex;align-items:center;justify-content:center;font-family:var(--display,sans-serif);color:#eef3f6}
  #gnWheel[hidden]{display:none}
  #gnWheel .gwp{pointer-events:auto;position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 14px;border-radius:22px;background:rgba(8,14,20,.78);box-shadow:0 0 0 1px rgba(255,255,255,.12),0 18px 60px rgba(0,0,0,.55);backdrop-filter:blur(3px);max-width:96vw}
  #gnWheel .gwr{position:relative;width:var(--gw);height:var(--gw);--gw:min(300px,40vh,76vw)}
  #gnWheel .gwr svg{position:absolute;left:14%;top:30%;width:72%;height:40%;overflow:visible}
  #gnWheel .gws{position:absolute;width:76px;height:50px;margin:-25px 0 0 -38px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(30,44,58,.9);color:#eef3f6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;cursor:pointer;padding:2px;font:700 9px/1.15 var(--display,sans-serif);letter-spacing:.08em;text-transform:uppercase}
  #gnWheel .gws i{font-style:normal;font-weight:600;letter-spacing:0;text-transform:none;opacity:.8;font-size:9px;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #gnWheel .gws em{font-style:normal;color:#ffd24a;font-size:9px}
  #gnWheel .gws.hl,#gnWheel .gws:focus-visible{border-color:#ffd24a;background:rgba(70,60,20,.92);outline:none}
  #gnWheel .gws.on{border-color:#7fd89a}
  #gnWheel .gwh{font:700 10px/1.3 var(--display,sans-serif);letter-spacing:.1em;opacity:.8;text-align:center;max-width:min(420px,88vw)}
  #gnWheel .gwst{display:flex;gap:8px;max-width:92vw;overflow-x:auto;padding:2px}
  #gnWheel .gwc{flex:0 0 128px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(24,36,48,.95);padding:7px 8px;cursor:pointer;color:inherit;text-align:left;font:inherit;display:flex;flex-direction:column;gap:3px}
  #gnWheel .gwc.hl{border-color:#ffd24a;background:rgba(66,58,22,.95)}
  #gnWheel .gwc.eq{border-color:#7fd89a}
  #gnWheel .gwc b{font:700 11px/1.15 var(--display,sans-serif)}
  #gnWheel .gwc small{font:600 9px/1.2 var(--display,sans-serif);opacity:.7}
  #gnWheel .gwd{display:grid;grid-template-columns:44px 1fr 34px;align-items:center;gap:4px;font:600 8.5px/1 var(--display,sans-serif);opacity:.95}
  #gnWheel .gwb{position:relative;height:6px;background:rgba(255,255,255,.12);border-radius:3px}
  #gnWheel .gwb:after{content:"";position:absolute;left:50%;top:-1px;bottom:-1px;width:1px;background:rgba(255,255,255,.4)}
  #gnWheel .gwb i{position:absolute;top:0;bottom:0;border-radius:3px}
  #gnWheel .gwb i.up{left:50%;background:#58d27b}#gnWheel .gwb i.dn{right:50%;background:#e8604c}
  #gnWheel .gwd span.n.up{color:#7fe29b}#gnWheel .gwd span.n.dn{color:#f08a79}
  #gnWheel .gwd span.n{text-align:right}
  #gnWheel .gwx{pointer-events:auto;position:absolute;right:6px;top:6px;border:0;background:rgba(255,255,255,.1);color:#fff;width:28px;height:28px;border-radius:14px;font-size:14px;cursor:pointer}
  #touch .gnb{position:absolute;pointer-events:auto;box-sizing:border-box;border-radius:50%;border:1.5px solid rgba(234,242,248,.4);background:rgba(10,18,26,.5);color:#eef3f6;font:800 11px var(--display,sans-serif);letter-spacing:.1em;display:flex;align-items:center;justify-content:center;text-align:center;touch-action:none}
  #touch .gnb.on{background:rgba(255,210,74,.35)}
  #touch #gnGun{right:22px;bottom:calc(232px + var(--sb,0px));width:56px;height:56px;font-size:10px}`;
  document.head.appendChild(st);
  wheel = document.createElement("div"); wheel.id = "gnWheel"; wheel.hidden = true; wheel.setAttribute("role", "dialog"); document.body.appendChild(wheel);
  const t = $("touch");
  if (t) {
    const b = touchBtn = document.createElement("button"); b.type = "button"; b.className = "gnb"; b.id = "gnGun"; b.textContent = "GUN"; b.hidden = true; t.appendChild(b);
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.classList.add("on"); H.touchOn = true; H.touch = 0; });
    for (const ev of ["pointerup", "pointercancel"]) b.addEventListener(ev, () => { b.classList.remove("on"); if (H.touchOn && H.touch < HOLD_OPEN && !W.open && gun()) api.toast(`Hold ${api.btn("gun")} to change parts.`); H.touchOn = false; H.touch = 0; });
    b.addEventListener("contextmenu", e => e.preventDefault());
  }
}
// the rifle in the middle of the wheel: a side-on silhouette of what's fitted now
const LEN = { std22: 0.62, carb18: 0.46, heavy24: 0.8 }, STOCK = { walnut: "#6b4423", synth: "#23282e", adjust: "#3a3f2c" };
function silhouette(g) {
  const bl = LEN[g.parts.barrel] || 0.62, sc = g.parts.sight, mg = g.parts.magazine, st = g.parts.stock, gr = g.parts.grip;
  const L = 250, bx = 118, by = 40, bw = bl / 0.62 * 100, stCol = STOCK[st] || "#6b4423";
  let o = `<svg viewBox="0 0 ${L} 100" aria-hidden="true">`;
  o += `<path d="M6 46 L${bx} 40 L${bx} 58 L60 62 L${st === "adjust" ? 4 : 10} 70 Z" fill="${stCol}" stroke="#0007"/>`;
  if (st === "adjust") o += `<rect x="1" y="44" width="7" height="26" rx="2" fill="#15181b"/>`;
  o += `<rect x="${bx}" y="${by}" width="46" height="20" rx="3" fill="#59606a"/>`;
  o += `<rect x="${bx + 46}" y="${by + 6}" width="${bw}" height="7" rx="2" fill="#2d3238"/>`;
  o += `<rect x="${bx + 46 + bw - 2}" y="${by + 3}" width="7" height="13" rx="2" fill="#1a1d20"/>`;
  o += `<path d="M${bx + 6} 58 L${bx + 22} 58 L${bx + 18} 76 L${bx + 8} 76 Z" fill="${gr === "rubber" ? "#3b3f45" : "#2a2d31"}"/>`;
  if (gr === "bipod") o += `<path d="M${bx + 70} ${by + 13} L${bx + 62} 86 M${bx + 80} ${by + 13} L${bx + 90} 86" stroke="#3a3e44" stroke-width="3" fill="none"/>`;
  const mh = mg === "det10" ? 24 : mg === "det5" ? 12 : 6;
  o += `<rect x="${bx + 24}" y="58" width="${mg === "int3" ? 16 : 14}" height="${mh}" rx="2" fill="#3c4046"/>`;
  if (sc === "iron") o += `<rect x="${bx + 2}" y="${by - 6}" width="3" height="7" fill="#222"/><rect x="${bx + 46 + bw - 8}" y="${by - 4}" width="3" height="7" fill="#222"/>`;
  else if (sc === "red1") o += `<rect x="${bx + 8}" y="${by - 12}" width="22" height="12" rx="3" fill="#1b1e22"/><circle cx="${bx + 19}" cy="${by - 6}" r="2.2" fill="#ff4d3d"/>`;
  else o += `<rect x="${bx + 2}" y="${by - 16}" width="64" height="12" rx="6" fill="#1b1e22"/><rect x="${bx + 8}" y="${by - 12}" width="6" height="12" fill="#2a2d31"/><circle cx="${bx + 66}" cy="${by - 10}" r="6.5" fill="#2e4a63"/>`;
  return o + "</svg>";
}
const ownedFor = slot => GN().ownedParts(slot);
function deltaRows(slot, p) {
  const g = gun(), cur = stats(g), nx = stats(Object.assign({}, g, { parts: Object.assign({}, g.parts, { [slot]: p.id }) }));
  return BAR.map(([k, lbl, sc, good]) => {
    const d = nx[k] - cur[k], better = d * good, w = Math.min(1, Math.abs(d) / sc) * 50, cls = better > 1e-6 ? "up" : better < -1e-6 ? "dn" : "";
    const a = Math.abs(d), n = a < 1e-6 ? "·" : (d > 0 ? "+" : "−") + (k === "range" ? Math.round(a) : k === "handling" ? a.toFixed(1) : a.toFixed(2));
    return `<div class="gwd"><span>${lbl}</span><span class="gwb">${cls ? `<i class="${cls}" style="width:${w.toFixed(0)}%"></i>` : ""}</span><span class="n ${cls}">${n}</span></div>`;
  }).join("");
}
function renderWheel() {
  const g = gun(); if (!wheel || !g) return;
  const sl = slotsOf(g), N = sl.length, st = stats(g);
  let slots = "";
  sl.forEach((s, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / N, x = 50 + 41 * Math.cos(a), y = 50 + 41 * Math.sin(a), p = GN().partDef(s, g.parts[s]);
    slots += `<button type="button" class="gws${W.hl === i && W.stage === "slot" ? " hl" : ""}${W.slot === i ? " on" : ""}" data-slot="${i}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%"><em>${i + 1}</em>${SLOTN[s]}<i>${esc(p.name)}</i></button>`;
  });
  let strip = "", help = "";
  if (W.slot >= 0) {
    const s = sl[W.slot], list = ownedFor(s), cur = g.parts[s];
    strip = `<div class="gwst" id="gnStrip">${list.map((p, i) => `<button type="button" class="gwc${i === W.part ? " hl" : ""}${p.id === cur ? " eq" : ""}" data-part="${p.id}"><b>${i + 1}. ${esc(p.name)}</b><small>${p.id === cur ? "FITTED" : esc(p.note.split(". ")[0])}</small>${p.id === cur ? "" : deltaRows(s, p)}</button>`).join("")}</div>`;
    help = list.length < 2 ? `Only the stock ${SLOTN[s].toLowerCase()} so far: buy more at Jakt & Våpen.` : `${api.btn("pick")} fits it · ${api.btn("wclose")} back`;
  } else help = `${api.btn("wmove")} pick a slot · ${api.btn("wclose")} close · swaps parts you own, buying is at Jakt & Våpen`;
  wheel.innerHTML = `<div class="gwp"><button type="button" class="gwx" id="gnX" aria-label="Close">✕</button>
    <div class="gwr">${silhouette(g)}${slots}</div>${strip}
    <div class="gwh">${esc(GN().frameDef(g.frame).name)} · ${st.kg.toFixed(1)} kg · ${st.cap} rounds · ${st.zoom}x · ${help}</div></div>`;
  wheel.querySelectorAll("button[data-slot]").forEach(b => b.onclick = () => openSlot(+b.dataset.slot));
  wheel.querySelectorAll("button[data-part]").forEach(b => b.onclick = () => pickPart(b.dataset.part));
  $("gnX").onclick = closeWheel;
}
function openWheel() {
  const g = gun();
  if (!g) { if (api.started()) api.toast("You don't have a rifle yet: Jakt & Våpen in Kjøllefjord.", "warn"); return false; }
  if (W.open) return true;
  if (!api.swapOk() || !$("settings").hidden) return false;
  css(); W.open = true; W.stage = "slot"; W.hl = 0; W.slot = -1; W.part = 0;
  H.padPrev = padSnapshot(); renderWheel(); wheel.hidden = false; return true;
}
function closeWheel() { W.open = false; W.slot = -1; if (wheel) wheel.hidden = true; }
function openSlot(i) {
  const g = gun(); if (!g) return; const s = slotsOf(g)[i]; if (!s) return;
  W.slot = i; W.hl = i; W.stage = "part"; const list = ownedFor(s); W.part = Math.max(0, list.findIndex(p => p.id === g.parts[s])); renderWheel();
}
function pickPart(id) {
  const g = gun(); if (!g || W.slot < 0) return false; const s = slotsOf(g)[W.slot];
  if (!GN().ownsPart(s, id) || !GN().fit(s, id, true)) return false;          // swapping is for parts you own: buying is the shop's job
  const p = GN().partDef(s, id);
  try { api.thud(0.18); if (navigator.vibrate) navigator.vibrate(18); } catch (e) { }
  api.toast(`${p.name} fitted.`, "good"); closeWheel(); return true;
}
function wheelKey(e) {
  const c = e.code;
  if (c === "KeyR" && e.repeat) return true;                                     // still holding the key that opened it
  if (c === "Escape" || c === "KeyR") { closeWheel(); return true; }
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(c);
  if (m) {
    const n = +m[1] - 1, g = gun();
    if (W.slot < 0) { if (n < slotsOf(g).length) openSlot(n); }
    else { const l = ownedFor(slotsOf(g)[W.slot]); if (l[n]) pickPart(l[n].id); }
    return true;
  }
  if (c === "Backspace" && W.slot >= 0) { W.slot = -1; W.stage = "slot"; renderWheel(); return true; }
  return false;
}
// ---- the pad: D-pad / stick / LB RB move round the wheel, A picks, B backs out
function padSnapshot() { const gp = (api.pads ? api.pads() : [])[0], o = {}; if (gp) for (let i = 0; i < 16; i++) o[i] = !!(gp.buttons[i] && gp.buttons[i].pressed); return o; }
function padWheel() {
  const gp = (api.pads ? api.pads() : [])[0]; if (!gp) return;
  const now = padSnapshot(), pv = H.padPrev, edge = i => now[i] && !pv[i];
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, sx = Math.abs(ax) > 0.6 ? Math.sign(ax) : 0, sy = Math.abs(ay) > 0.6 ? Math.sign(ay) : 0, sp = H.stick || { x: 0, y: 0 };
  const step = (edge(15) || edge(5) || (sx && !sp.x && sx > 0) || edge(13) || (sy > 0 && !sp.y)) ? 1 : (edge(14) || edge(4) || (sx && !sp.x && sx < 0) || edge(12) || (sy < 0 && !sp.y)) ? -1 : 0;
  H.stick = { x: sx, y: sy };
  const g = gun(); if (!g) { closeWheel(); H.padPrev = now; return; }
  const N = slotsOf(g).length;
  if (W.stage === "slot") {
    if (step) { W.hl = (W.hl + step + N) % N; renderWheel(); }
    if (edge(0)) openSlot(W.hl);
    else if (edge(1)) closeWheel();
  } else {
    const l = ownedFor(slotsOf(g)[W.slot]);
    if (step && l.length) { W.part = (W.part + step + l.length) % l.length; renderWheel(); const el = wheel.querySelector(".gwc.hl"); if (el && el.scrollIntoView) try { el.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) { } }
    if (edge(0) && l[W.part]) pickPart(l[W.part].id);
    else if (edge(1)) { W.slot = -1; W.stage = "slot"; renderWheel(); }
  }
  H.padPrev = now;
}

function holdTick(dt) {
  const k = api.keys, g = gun(); if (!g) { H.kb = H.pad = H.touch = 0; return; }
  // keyboard: hold R
  if (k && k.has("KeyR") && !W.open) { H.kb += dt; if (H.kb >= HOLD_OPEN) { H.kb = 0; k.delete("KeyR"); openWheel(); } } else if (!k || !k.has("KeyR")) H.kb = 0;
  // touch: hold GUN
  if (H.touchOn && !W.open) { H.touch += dt; if (H.touch >= HOLD_OPEN) { H.touchOn = false; H.touch = 0; $("gnGun").classList.remove("on"); openWheel(); } }
  // pad: hold D-pad left (a quick tap still wipes the visor, on release: the base game defers to us for rifle owners)
  const gp = (api.pads ? api.pads() : [])[0], dl = !!(gp && gp.buttons[14] && gp.buttons[14].pressed);
  if (W.open) { H.pad = 0; H.padDown = dl; return; }
  if (dl && api.started() && !modal()) { H.pad += dt; H.padDown = true; if (H.pad >= HOLD_OPEN) { H.pad = -99; openWheel(); } }
  else { if (H.padDown && H.pad > 0 && H.pad < HOLD_OPEN && api.started() && !modal() && api.wipe) api.wipe(); H.pad = 0; H.padDown = false; }
}
function keyListener(e) {
  if (!api || !api.started() || (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
  if (W.open) { if (wheelKey(e)) { e.preventDefault(); e.stopImmediatePropagation(); } return; }
}

function touchTick() {
  if (!touchBtn) return;
  const on = !!gun() && api.started() && !modal() && api.touch() && !api.INT.on;
  if (touchBtn.hidden === on) touchBtn.hidden = !on;
}
// a one-time pointer to the wheel the first time you walk out with a rifle
function hintTick() {
  if (hinted || !gun() || !api.started() || !api.FOOT.on || api.INT.on || modal()) return;
  hinted = true; api.toast(`Hold ${api.btn("gun")} to change the parts on your rifle.`);
}
TLX.register({
  id: "gunwheel", v: 1,
  state0: () => ({}),
  init(a) {
    api = a;
    try { css(); } catch (e) { console.error("TLX gunwheel css", e); }
    window.addEventListener("keydown", keyListener, true);
  },
  tick(dt) {
    if (!api || dt <= 0 || !GN()) return;
    if (!api.started()) { if (W.open) closeWheel(); return; }
    if (W.open && (!api.swapOk() || !$("settings").hidden)) closeWheel();
    holdTick(dt);
    if (W.open) padWheel();
    touchTick(); hintTick();
  }
});
window.TLXWHEEL = { BAR, W, open: openWheel, close: closeWheel, openSlot, pick: pickPart, claimsDpadLeft: () => !!gun(), wheelOpen: () => W.open };
TLX.gunwheel = window.TLXWHEEL;
})();
