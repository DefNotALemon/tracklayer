// Tracklayer — lighthouses (G4 milestone 6, loop/EXPANSION.md "6. Upkeep and lighthouses"). Slice 6.2a: the lamp at
// Slettnes once the station is yours (tlx-property.js sells it): its oil tank, paraffin drums hauled out from the
// quay, the Lights app, and Kystverket's Monday stipend by the hours the lamp burned.
//
// THE LAMP burns paraffin from a tank at the foot of the tower. A sun valve shuts it by day, so it burns (and earns)
// only while the sun is down: all day in the polar night, not at all under the midnight sun. A full tank is about
// three game days of burning. A dry tank puts the lamp out; it stays out until there's oil in the tank again AND
// someone has climbed the stair to light it. A light that isn't yours is Kystverket's business and never goes out.
//
// OIL comes in drums, ordered and paid for in the Lights app. A drum waits at the quay as a claimed pickup (the
// Jobs app and the compass track it like any parcel; it rides in a parcel slot), and stopping at the lighthouse
// rolls it into the oil store. In the tower room, at the drum rack, the use control pumps a drum into the tank
// (a few seconds at the hand pump); at the foot of the stair it lights a lamp that has gone out. Both go through
// the same footx provider as every on-foot use (keyboard, pad L3, the touch button), ahead of sweeping and dusting.
//
// THE STIPEND: Kystverket pays per lamp hour, on Mondays, with a statement. Hours the lamp should have burned but
// didn't are counted on the statement and earn nothing.
//
// SAVED under x.sys.lights: { lamps: { id: { oil (L in the tank), store (L in full drums in the oil store), on,
// lit / need (lamp hours burned / dark hours, this week), low } }, quay (drums paid for and not yet at a light: at
// the quay or aboard), hT (game hour last stepped), last: [weekly statements] }. What's aboard isn't saved by the
// game (GS.load is the session's), so after a reload a drum that was on the sled waits at the quay again.
(() => {
"use strict";
// ---- tunables ----
const LIGHTS = {
  tank: 180,          // L
  burn: 2.5,          // L per lamp hour: a full tank is 72 lamp hours, three game days of polar night
  drum: 60,           // L in a drum
  drumCost: 45,       // $ a drum, at the quay
  stockMax: 6,        // drums you can have on order + in a light's store at once
  stipend: 12,        // $ per lamp hour, paid Mondays
  start: 45,          // L in the tank when you get the keys
  pumpT: 5,           // game seconds at the hand pump per drum
  darkEl: -2,         // degrees: the sun valve opens the gas below this sun height (the game's dusk)
  lowH: 12,           // lamp hours left that count as "low"
  reach: 0.7,         // m from the rack / the stair for the use control
  skipH: 24 * 14      // a clock jump longer than this many game hours counts as this many
};
// every light with a lamp to keep: prop = the tlx-property listing that owns it, room = the interior with the oil
// store, rack / stair = their collider boxes in that room [x, z, w, d]. 6.2b adds the two smaller lights.
const LAMPS = [
  { id: "slettnes", prop: "slettnes", name: "Slettnes fyr", at: "Slettnes", room: "slettnes:tower", rack: [-1.75, 1.75, 1.35, 1.35], stair: [1.55, 1.55, 1.9, 1.9],
    site: W => (W.SITES || []).find(q => q.type === "relay" && q.x !== undefined) || null }
];
let api = null, stepT = 0, lastAb = 0, landN = 0, landT = 0, landAt = null;
const PUMP = { on: false, lamp: null, t: 0 };
const S = () => TLX.state("lights");
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const hour = () => (api && api.GS ? +api.GS.hour || 0 : 0);
const lampOf = id => LAMPS.find(l => l.id === id) || null;
const owns = lp => !!(TLX.prop && TLX.prop.owns && TLX.prop.owns(lp.prop));
const mine = () => LAMPS.filter(owns);
const drumsOf = L => Math.ceil(L / LIGHTS.drum - 1e-6);
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
function rec(id) {
  const s = S(); let r = s.lamps[id];
  if (!r || typeof r !== "object") r = s.lamps[id] = { oil: LIGHTS.start, store: 0, on: true, lit: 0, need: 0, low: false, fresh: true };
  r.oil = clamp(+r.oil || 0, 0, LIGHTS.tank); r.store = clamp(+r.store || 0, 0, LIGHTS.drum * 40); r.on = !!r.on && r.oil > 0; r.lit = Math.max(0, +r.lit || 0); r.need = Math.max(0, +r.need || 0);
  return r;
}
const dark = h => api.sunEl(((h % 24) + 24) % 24) < LIGHTS.darkEl;
// is this light dark when it should be burning? (tracklayer.js asks before it flashes the lamp: only YOUR dry lamp is)
function out(id) { const lp = lampOf(id); if (!lp || !api || !owns(lp)) return false; return !rec(id).on; }
const hoursLeft = r => r.oil / LIGHTS.burn;

// ---- the clock: the lamp burns while the sun is down ----
function burn(lp, r, t, dt) {
  if (!dark(t)) return;
  r.need += dt;
  if (!r.on) return;
  const can = Math.min(dt, hoursLeft(r)); r.oil -= can * LIGHTS.burn; r.lit += can;
  if (r.oil <= 0.001) { r.oil = 0; r.on = false; wentOut(lp, r); }
}
function wentOut(lp, r) {
  r.low = true;
  try { api.TABLET.notify({ app: "lights", kind: "alert", ttl: 10, title: `${lp.name} is dark`, body: `The tank ran dry and the lamp is out. No stipend until it burns again: ${r.store >= 1 ? "pump a drum into the tank" : "haul a drum out"} and climb up to light it.` }); } catch (e) { }
  try { api.TABLET.refresh("lights"); } catch (e) { }
}
function step() {
  const s = S(), h = hour();
  if (s.hT === null || s.hT === undefined || !isFinite(s.hT) || s.hT > h) { s.hT = h; return; }
  const dh = Math.min(LIGHTS.skipH, h - s.hT); if (dh < 0.01) return;
  const t0 = h - dh; s.hT = h;
  const own = mine(); if (!own.length) return;
  const n = Math.max(1, Math.ceil(dh / 0.25)), dt = dh / n;
  for (const lp of own) {
    const r = rec(lp.id);
    if (r.fresh) { delete r.fresh; welcome(lp, r); continue; }           // the keys came today: the clock starts now
    for (let i = 0; i < n; i++) burn(lp, r, t0 + (i + 0.5) * dt, dt);
    if (r.on && hoursLeft(r) < LIGHTS.lowH && !r.low) {
      r.low = true;
      try { api.TABLET.notify({ app: "lights", kind: "warn", ttl: 9, title: `${lp.name}: oil low`, body: `About ${Math.round(hoursLeft(r))} lamp hours left in the tank. ${r.store >= 1 ? `${plural(drumsOf(r.store), "drum")} in the oil store: pump one in.` : "Nothing in the oil store: order a drum and haul it out."}` }); } catch (e) { }
    } else if (r.on && hoursLeft(r) >= LIGHTS.lowH) r.low = false;
  }
}
function welcome(lp, r) {
  try { api.TABLET.notify({ app: "lights", kind: "info", ttl: 11, title: `Kystverket · ${lp.name}`, body: `The lamp is yours to keep burning: ${api.fmtCash(LIGHTS.stipend)} for every hour it's lit, paid Mondays. The last keeper left about ${Math.round(hoursLeft(r))} hours of paraffin in the tank.` }); } catch (e) { }
}
function monday(week) {
  const s = S(), own = mine(); if (!own.length) return;
  let pay = 0, lit = 0, need = 0;
  for (const lp of own) { const r = rec(lp.id); lit += r.lit; need += r.need; pay += r.lit * LIGHTS.stipend; r.lit = 0; r.need = 0; }
  pay = Math.round(pay); api.GS.cash += pay;
  const d = week && week.label || "", miss = Math.max(0, Math.round(need - lit));
  s.last.unshift({ d, pay, lit: Math.round(lit), need: Math.round(need) }); s.last = s.last.slice(0, 4);
  api.save(); try { api.TABLET.refresh("lights"); } catch (e) { }
  setTimeout(() => { try { api.TABLET.notify({ app: "lights", kind: miss > 2 ? "warn" : "good", title: `Kystverket · week to ${d}`, body: `Lamp stipend +${api.fmtCash(pay)} for ${Math.round(lit)} lamp hours${miss > 2 ? ` · dark for ${miss} hours it should have burned` : ""}`, ttl: 8 }); } catch (e) { } }, 7600);
}

// ---- drums: ordered in the app, a claimed pickup at the quay, rolled into the store at the light ----
const isDrum = j => !!(j && j.oil && j.own === "lights");
function mkClaim(lp) {
  const W = api.world, site = lp.site(W); if (!site) return null;
  return { oil: 1, own: "lights", lamp: lp.id, from: W.depot, dest: site, cargo: "Paraffin drum", fragile: false, pay: 0, due: null, hits: 0 };
}
function stock(lp) { return S().quay + drumsOf(rec(lp.id).store); }
function order(id) {
  const lp = lampOf(id), s = S(); if (!lp || !owns(lp)) return false;
  if (api.busy()) { api.toast("Finish the school course first.", "warn"); return false; }
  if (stock(lp) >= LIGHTS.stockMax) { api.toast(`That's ${plural(stock(lp), "drum")} on order or in the oil store already: plenty.`, "warn"); return false; }
  if (api.GS.cash < LIGHTS.drumCost) { api.toast(`A drum of paraffin is ${api.fmtCash(LIGHTS.drumCost)}. You have ${api.fmtCash(api.GS.cash)}.`, "warn"); return false; }
  const c = mkClaim(lp); if (!c) return false;
  api.GS.cash -= LIGHTS.drumCost; s.quay++; api.GS.claims.push(c);
  api.ui.ping("good"); api.save();
  api.toast(`Paraffin drum paid for (${LIGHTS.drum} L). It's waiting at the quay: it rides in a parcel slot, out to ${lp.at}.`, "good");
  try { api.TABLET.refresh(); } catch (e) { }
  return true;
}
// what the session holds against what's paid for: after a reload (or a rescue that wiped the claims) the drums at
// the quay become claims again; a drum that was aboard and is gone (a blackout, a tow, the fjord) is lost
function sync() {
  if (api.busy()) return;                                  // a school course parks your own loads in the yard
  const s = S(), G = api.GS, ab = G.load.filter(isDrum).length, cl = G.claims.filter(isDrum).length;
  if (ab < lastAb) s.quay = Math.max(0, s.quay - (lastAb - ab));
  lastAb = ab;
  if (s.quay < ab + cl) s.quay = ab + cl;
  const lp = mine()[0];
  for (let miss = s.quay - ab - cl; miss > 0 && lp; miss--) { const c = mkClaim(lp); if (c) G.claims.push(c); }
}
// tracklayer.js deliver(): a load of ours reached its light (j was taken off the sled already)
function land(j, site) {
  const lp = lampOf(j.lamp) || LAMPS[0], r = rec(lp.id), s = S();
  r.store += LIGHTS.drum; s.quay = Math.max(0, s.quay - 1); lastAb = Math.max(0, lastAb - 1);
  landN++; landAt = lp;
  if (!landT) landT = setTimeout(() => {
    const q = rec(landAt.id), n = landN; landN = 0; landT = 0;
    api.toast(`${n > 1 ? plural(n, "paraffin drum") : "Paraffin drum"} rolled into the oil store at ${landAt.at}: ${plural(drumsOf(q.store), "drum")} there. Pump ${n > 1 ? "them" : "it"} into the tank in the tower room.`, "good");
    try { api.TABLET.refresh(); } catch (e) { }
  }, 60);
}

// ---- in the tower room: the hand pump and the stair ----
const boxD = (b, x, z) => Math.hypot(Math.max(b[0] - b[2] / 2 - x, 0, x - b[0] - b[2] / 2), Math.max(b[1] - b[3] / 2 - z, 0, z - b[1] - b[3] / 2));
function lampHere() { const I = api.INT; if (!I.on || !I.cab) return null; const lp = LAMPS.find(l => l.room === I.cab.id); return lp && owns(lp) ? lp : null; }
function startPump(lp) {
  const I = api.INT, P = TLX.prop;
  if (P && P.SW && P.SW.on) P.stopSweep(); if (P && P.DU && P.DU.cur >= 0) P.stopDust();
  PUMP.on = true; PUMP.lamp = lp.id; PUMP.t = 0; I.slow = 0;
  api.FOOT.yaw = Math.atan2(lp.rack[0] - I.px, lp.rack[1] - I.pz);
}
function stopPump(msg) { if (!PUMP.on) return; PUMP.on = false; PUMP.t = 0; if (api.INT) api.INT.slow = 1; if (msg) api.toast(msg); }
function pumpTick(dt) {
  const I = api.INT, lp = lampHere();
  if (!lp || lp.id !== PUMP.lamp || boxD(lp.rack, I.px, I.pz) > LIGHTS.reach + 0.4) { stopPump(); return; }
  I.slow = 0; PUMP.t += dt;
  if (PUMP.t < LIGHTS.pumpT) return;
  const r = rec(lp.id), L = Math.min(LIGHTS.drum, r.store, LIGHTS.tank - r.oil);
  r.oil += L; r.store -= L; if (r.store < 0.5) r.store = 0;
  stopPump(); api.save();
  api.toast(`${Math.round(L)} L pumped in: the tank holds ${Math.round(r.oil)} of ${LIGHTS.tank} L, about ${Math.round(hoursLeft(r))} lamp hours.${r.on ? "" : " The lamp's still out: the stair is across the room."}`, "good");
  try { api.TABLET.refresh("lights"); } catch (e) { }
}
// one arm works the pump handle, the trunk follows a little, the other hand steadies on the drum
function posePump() {
  const g = api.FOOT.g; if (!g) return;
  const U = g.userData, k = Math.sin(api.now() * Math.PI * 2 * 0.9);
  U.arms[0].rotation.set(-0.95 + 0.38 * k, 0, 0.05); U.fore[0].rotation.set(-0.75 - 0.3 * k, 0, 0);
  U.arms[1].rotation.set(-0.55, 0, -0.12); U.fore[1].rotation.set(-0.5, 0, 0);
  U.torso.rotation.x = Math.max(U.torso.rotation.x, 0.12 + 0.05 * k);
}
function light(lp) {
  const r = rec(lp.id); if (r.on || r.oil <= 0) return false;
  r.on = true; r.low = hoursLeft(r) < LIGHTS.lowH; api.ui.ping("good"); api.save();
  api.toast(`Up the stair, the burner primed and a match to the mantle: ${lp.name} is lit again.`, "good");
  try { api.TABLET.refresh("lights"); } catch (e) { }
  return true;
}
const PROV = {
  use() {
    const lp = lampHere(); if (!lp) return null;
    const I = api.INT, r = rec(lp.id), kh = api.keyHint, P = TLX.prop;
    if (PUMP.on) return { label: "STOP", hint: () => `Pumping ${Math.round(100 * PUMP.t / LIGHTS.pumpT)}% · ${kh("use", "stop")}`, act: () => stopPump("Stopped pumping.") };
    if (P && ((P.SW && P.SW.on) || (P.DU && P.DU.cur >= 0))) return null;      // a sweep or a wipe under way: its STOP comes first
    const tank = `tank ${Math.round(r.oil)} of ${LIGHTS.tank} L`, st = r.store >= 1 ? `${plural(drumsOf(r.store), "full drum")} here` : "no full drum here";
    if (boxD(lp.stair, I.px, I.pz) < LIGHTS.reach && !r.on) {
      if (r.oil > 0) return { label: "LIGHT", hint: () => `${kh("use", "climb up and light the lamp")} · ${tank}`, act: () => light(lp) };
      return { label: "LAMP", hint: () => `The lamp is out and the tank is dry: ${r.store >= 1 ? "pump a drum in at the rack first" : "it needs a drum of paraffin from the quay (Lights app)"}`, act: () => api.toast(r.store >= 1 ? "Pump a drum into the tank at the rack first." : "The tank is dry and the oil store is empty: order a drum in the Lights app and haul it out.", "warn") };
    }
    if (boxD(lp.rack, I.px, I.pz) < LIGHTS.reach) {
      if (r.store >= 1 && r.oil < LIGHTS.tank - 1) return { label: "PUMP", hint: () => `${kh("use", "pump a drum into the tank")} · ${tank} · ${st}`, act: () => startPump(lp) };
      if (r.store < 1 && (!r.on || hoursLeft(r) < LIGHTS.lowH)) return { label: "OIL", hint: () => `${tank[0].toUpperCase() + tank.slice(1)} · ${st}: order drums in the Lights app`, act: () => api.toast("No full drum in the oil store. The Lights app orders them; they wait at the quay.", "warn") };
    }
    return null;
  },
  digging: () => false
};

// ---- the Lights app ----
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 21l1-11h3l1 11"/><path d="M8 21h8"/><path d="M10 10V7h4v3"/><path d="M9.3 7L12 4.6 14.7 7"/><path d="M6.5 6.2L3.5 5M6.5 8.8l-3 1.2M17.5 6.2l3-1.2M17.5 8.8l3 1.2"/></svg>';
function stateOf(r) {
  if (!r.on) return { chip: "DARK", cls: "due", word: "out" };
  if (dark(hour())) return { chip: "LIT", cls: "ok", word: "burning" };
  return { chip: "SUN VALVE SHUT", cls: "", word: "resting till dusk" };
}
function render(el) {
  const U = api.ui, s = S(), own = mine(), cash = api.GS.cash;
  let h = U.tabHead("LIGHTS · KYSTVERKET", own.length === 1 ? own[0].name : "Your lights", api.fmtCash(cash));
  h += `<div class="tsub">${plural(own.length, "light")} to keep · ${api.fmtCash(LIGHTS.stipend)} a lamp hour, paid Mondays</div>`;
  for (const lp of own) {
    const r = rec(lp.id), st = stateOf(r), full = stock(lp) >= LIGHTS.stockMax, due = Math.round(r.lit * LIGHTS.stipend), nd = drumsOf(r.store);
    h += U.tabCard({ tf: "lamp:" + lp.id, title: lp.name, chips: U.chip(st.chip, st.cls) + (r.on && hoursLeft(r) < LIGHTS.lowH ? U.chip("OIL LOW", "due") : ""),
      meta: `Tank ${Math.round(r.oil)} of ${LIGHTS.tank} L · ${r.oil > 0 ? `about ${Math.round(hoursLeft(r))} lamp hours` : "dry"} · lamp ${st.word}`,
      note: `This week: ${Math.round(r.lit)} lamp hours of ${Math.round(r.need)} dark · stipend so far ${api.fmtCash(due)}. Oil store: ${nd ? `${plural(nd, "full drum")} (${Math.round(r.store)} L)` : "empty"}.${s.quay ? ` ${plural(s.quay, "drum")} paid for, at the quay or aboard.` : ""}`,
      warn: !r.on ? (r.oil > 0 ? "The lamp is out. There's oil in the tank: climb the stair in the tower room and light it." : nd ? "The lamp is out and the tank is dry. Pump a drum into the tank at the rack in the tower room, then climb up and light it." : "The lamp is out, the tank is dry and the oil store is empty. Order a drum and haul it out from the quay.") : "",
      pay: api.fmtCash(LIGHTS.drumCost), act: "lord:" + lp.id, actLabel: "ORDER A DRUM", blocked: full || cash < LIGHTS.drumCost });
  }
  if (s.last.length) h += U.sec("Stipend statements", "") + `<div class="tsml2">${s.last.map(q => `<div class="tsm2 tprow"><b>${U.esc(q.d)}</b><span>Stipend +${api.fmtCash(q.pay)} · ${q.lit} of ${q.need} dark hours lit</span>${q.need - q.lit > 2 ? U.chip("DARK " + (q.need - q.lit) + " H", "due") : U.chip("PAID", "ok")}</div>`).join("")}</div>`;
  h += `<p class="tnote2">The lamp burns ${LIGHTS.burn} L of paraffin an hour while the sun is down (a sun valve shuts it by day), so a full tank is about ${Math.round(LIGHTS.tank / LIGHTS.burn / 24)} days of polar night. A drum is ${LIGHTS.drum} L: it waits at the quay, rides out in a parcel slot, and is pumped into the tank by hand at the rack in the tower room. A lamp that runs dry stays out until someone climbs up and lights it.</p>`;
  el.innerHTML = `<div class="tapp">${h}</div>`;
  for (const b of el.querySelectorAll("[data-act^='lord:']")) b.addEventListener("click", () => order(b.dataset.act.slice(5)));
}

TLX.register({
  id: "lights", v: 1,
  state0: () => ({ lamps: {}, quay: 0, hT: null, last: [] }),
  migrate(st) { return st; },
  init(a) {
    api = a; const s = S();
    if (!s.lamps || typeof s.lamps !== "object" || Array.isArray(s.lamps)) s.lamps = {};
    for (const k in s.lamps) if (!s.lamps[k] || typeof s.lamps[k] !== "object" || !lampOf(k)) delete s.lamps[k]; else rec(k);
    s.quay = clamp(Math.floor(+s.quay || 0), 0, LIGHTS.stockMax);
    if (s.hT !== null && !isFinite(+s.hT)) s.hT = null;
    s.last = Array.isArray(s.last) ? s.last.filter(q => q && typeof q === "object").slice(0, 4) : [];
    lastAb = 0;
    if (a.footx && !a.footx.includes(PROV)) a.footx.unshift(PROV);
    a.TABLET.register({ id: "lights", name: "Lights", icon: ICON, order: 8.6, live: 10,
      hidden: () => !mine().length,
      badge: () => mine().some(lp => !rec(lp.id).on) ? "!" : "",
      render });
  },
  monday(week) { monday(week); },
  tick(dt) {
    if (!api || !api.started()) return;
    stepT += dt; if (stepT >= 1) { stepT = 0; if (!api.tutHidden()) { step(); sync(); } }
    if (PUMP.on) { pumpTick(dt); if (PUMP.on) posePump(); }
  }
});
TLX.lights = { LIGHTS, LAMPS, rec, out, owns: id => { const lp = lampOf(id); return !!lp && owns(lp); }, mine, step, sync, monday, order, land, light: id => { const lp = lampOf(id); return !!lp && light(lp); },
  PUMP, startPump: id => startPump(lampOf(id)), stopPump, use: () => PROV.use(), dark, hoursLeft: id => hoursLeft(rec(id)), stock: id => stock(lampOf(id)), state: S };
})();
