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
// Slice 6.2b: TWO SMALLER LIGHTS on other headlands (table SMALL): unmanned sea lights, each a whitewashed lantern
// hut with the lamp on its roof, sold by Real Estate as its own listing of type "light" (TLX.prop.addListing from
// here). One room: a bunk, a stove, the oil rack and the ladder up to the lantern. A smaller tank, a smaller burner
// and a smaller stipend than Slettnes (per-lamp numbers on the LAMPS row; LIGHTS holds the defaults), its own flash
// pattern, and the same rules: it is Kystverket's until you buy it, and only YOUR dry lamp is ever dark. They are
// not SITES: a drum's destination is the light's own drop point, and this file hands the drum over when the sled
// (or the skiff) stops within LIGHTS.dropR of it.
//
// Slice 6.3a: KEEPERS. Each light you own is a place of work for one keeper (tlx-staff.js: role "keeper", place
// "lt:<lamp>", hired, interviewed, paid and kept happy in the Staff app like anyone else). A keeper makes ROUNDS:
// every KEEP.round game hours divided by how hard they work (their hidden work trait x happiness; nothing while
// wages are owed). On a round they pump a drum from the oil store into the tank if it is down to KEEP.lowH lamp
// hours, and relight a lamp that is out with oil in the tank. They don't order or haul drums (the player does;
// 6.3b's oil driver will): an empty store is still yours to fill, and they tell you when they pump the last drum
// in. A good keeper's rounds (4-6 h) always catch a low tank; a slack or miserable one's (15-25 h) can come too
// late, and the lamp stands dark until the next round.
//
// SAVED under x.sys.lights: { lamps: { id: { oil (L in the tank), store (L in full drums in the oil store), on,
// lit / need (lamp hours burned / dark hours, this week), low, q (drums paid for and not yet at this light: at the
// quay or aboard), kT (game hours since the keeper's last round), kDid (what that round did) } }, hT (game hour last stepped), last: [weekly statements] } (`quay`, 6.2a's one count for
// Slettnes, is folded into its lamp's q on load). What's aboard isn't saved by the game (GS.load is the session's),
// so after a reload a drum that was on the sled waits at the quay again.
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
  dropR: 22,          // m: a sled stopped this close to a small light hands its drums over (a site's own radius)
  skipH: 24 * 14      // a clock jump longer than this many game hours counts as this many
};
// keepers (6.3a). round: game hours between a keeper's rounds at work 1.0 (divided by their work, so 0.36 = 16.7 h);
// lowH: a round pumps a drum in when the tank is under this many lamp hours; wage: base + per year, $ a week
const KEEP = { round: 6, lowH: 14, wage: [45, 3.6], roundMax: 30 };
// the two smaller lights (6.2b). region: the world they stand in; seed: the headland (the spot is searched round it);
// tank / burn / stipend / start / stockMax: this lamp's numbers; flash: [period s, [on at, for], ...]
const SMALL = [
  { id: "finnkirka", region: "nordkinn", name: "Finnkirka light", short: "Finnkirka light", lamp: "Finnkirka lykt", at: "Finnkirka", sign: "FINNKIRKA LYKT", seed: [-3740, -820],
    price: 4400, rent: 35, occ: 0.28, tank: 80, burn: 1, stipend: 6, start: 20, stockMax: 3, flash: [8, [0, 0.6], [1.5, 0.6]], jig: [-60, 64],
    blurb: "The sea light under the Finnkirka cliffs, at the mouth of the Kjøllefjord: a whitewashed lantern hut every ship into the fjord steers by. Two flashes every eight seconds." },
  { id: "kinnarodden", region: "nordkinn", name: "Kinnarodden light", short: "Kinnarodden light", lamp: "Kinnarodden lykt", at: "Kinnarodden", sign: "KINNARODDEN LYKT", seed: [-1060, -3820],
    price: 5200, rent: 35, occ: 0.28, tank: 80, burn: 1, stipend: 7, start: 20, stockMax: 3, flash: [6, [0, 4.2]], jig: [60, 64],
    blurb: "The lantern hut on the outermost point of the Nordkinn, the last light before the Barents Sea. A long ride out and nothing between it and the weather: Kystverket pays a little more for it." }
];
// every light with a lamp to keep: prop = the tlx-property listing that owns it, room = the interior with the oil
// store, rack / stair = their collider boxes in that room [x, z, w, d], up = what you climb to light it, where = the
// room in a sentence. tank / burn / stipend / start / stockMax default to LIGHTS's (Slettnes).
const LAMPS = [
  { id: "slettnes", prop: "slettnes", name: "Slettnes fyr", at: "Slettnes", room: "slettnes:tower", rack: [-1.75, 1.75, 1.35, 1.35], stair: [1.55, 1.55, 1.9, 1.9], up: "stair", where: "the tower room",
    site: W => (W.SITES || []).find(q => q.type === "relay" && q.x !== undefined) || null }
];
for (const m of SMALL) LAMPS.push({ id: m.id, prop: m.id, name: m.lamp, at: m.at, room: m.id + ":hut", rack: [-1.35, 1.4, 1.25, 1.1], stair: [1.5, 1.72, 0.8, 0.5], up: "ladder", where: "the lantern hut",
  tank: m.tank, burn: m.burn, stipend: m.stipend, start: m.start, stockMax: m.stockMax, small: m, site: () => m.drop || null });
let api = null, stepT = 0, landN = 0, landT = 0, landAt = null;
const lastAb = {};                                           // drums aboard per lamp at the last look (sync)
const N = (lp, k) => (lp && lp[k] !== undefined ? lp[k] : LIGHTS[k]);   // this lamp's number, or the default
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
  const s = S(), lp = lampOf(id); let r = s.lamps[id];
  if (!r || typeof r !== "object") r = s.lamps[id] = { oil: N(lp, "start"), store: 0, on: true, lit: 0, need: 0, low: false, q: 0, fresh: true };
  r.oil = clamp(+r.oil || 0, 0, N(lp, "tank")); r.store = clamp(+r.store || 0, 0, LIGHTS.drum * 40); r.on = !!r.on && r.oil > 0; r.lit = Math.max(0, +r.lit || 0); r.need = Math.max(0, +r.need || 0);
  r.q = clamp(Math.floor(+r.q || 0), 0, 40);
  r.kT = isFinite(+r.kT) ? Math.max(0, +r.kT) : 1e3;
  return r;
}
const dark = h => api.sunEl(((h % 24) + 24) % 24) < LIGHTS.darkEl;
// is this light dark when it should be burning? (tracklayer.js asks before it flashes the lamp: only YOUR dry lamp is)
function out(id) { const lp = lampOf(id); if (!lp || !api || !owns(lp)) return false; return !rec(id).on; }
const hoursLeft = (r, lp) => r.oil / N(lp, "burn");

// ---- the clock: the lamp burns while the sun is down ----
function burn(lp, r, t, dt) {
  if (!dark(t)) return;
  r.need += dt;
  if (!r.on) return;
  const can = Math.min(dt, hoursLeft(r, lp)); r.oil -= can * N(lp, "burn"); r.lit += can;
  if (r.oil <= 0.001) { r.oil = 0; r.on = false; wentOut(lp, r); }
}
function wentOut(lp, r) {
  r.low = true;
  try { api.TABLET.notify({ app: "lights", kind: "alert", ttl: 10, title: `${lp.name} is dark`, body: keeperOf(lp) && keeperWork(lp) > 0 ? `The tank ran dry and the lamp is out. No stipend until it burns again: ${r.store >= 1 ? `${kFirst(lp)} will pump a drum in and light it on the next round` : `haul a drum out and ${kFirst(lp)} will pump it in and light the lamp`}.` : `The tank ran dry and the lamp is out. No stipend until it burns again: ${r.store >= 1 ? "pump a drum into the tank" : "haul a drum out"} and climb the ${lp.up} to light it.` }); } catch (e) { }
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
    const kw = keeperWork(lp);
    if (!(kw > 0)) r.kT = 1e3;                                            // nobody on the job: whoever starts makes a round at once
    for (let i = 0; i < n; i++) { burn(lp, r, t0 + (i + 0.5) * dt, dt); if (kw > 0) { r.kT += dt; if (r.kT >= roundH(kw)) keeperRound(lp, r); } }
    if (r.on && hoursLeft(r, lp) < LIGHTS.lowH && !r.low) {
      r.low = true;
      if (!(kw > 0 && r.store >= 1)) try { api.TABLET.notify({ app: "lights", kind: "warn", ttl: 9, title: `${lp.name}: oil low`, body: `About ${Math.round(hoursLeft(r, lp))} lamp hours left in the tank. ${r.store >= 1 ? `${plural(drumsOf(r.store), "drum")} in the oil store: pump one in.` : "Nothing in the oil store: order a drum and haul it out."}` }); } catch (e) { }
    } else if (r.on && hoursLeft(r, lp) >= LIGHTS.lowH) r.low = false;
  }
}
// ---- 6.3a keepers: rounds ----
const kPlace = lp => "lt:" + lp.id;
const keeperOf = lp => (TLX.staff && TLX.staff.at ? TLX.staff.at(kPlace(lp)) : null);
const keeperWork = lp => (TLX.staff && TLX.staff.workAt ? +TLX.staff.workAt(kPlace(lp)) || 0 : 0);
const kFirst = lp => { const m = keeperOf(lp); return m ? String(m.name).split(" ")[0] : "the keeper"; };
const roundH = w => clamp(KEEP.round / Math.max(0.05, w), 1, KEEP.roundMax);
// one round: a drum into a tank that has run low, a match to a lamp that is out
function keeperRound(lp, r) {
  r.kT = 0;
  const L = Math.min(LIGHTS.drum, r.store), did = [];
  if (L >= 1 && hoursLeft(r, lp) < KEEP.lowH && N(lp, "tank") - r.oil >= L - 1e-6) {
    r.oil += L; r.store -= L; if (r.store < 0.5) r.store = 0; did.push("pump");
    if (r.store < 1) { try { api.TABLET.notify({ app: "lights", kind: "warn", ttl: 9, title: `${lp.name}: last drum pumped in`, body: `${kFirst(lp)} pumped the last drum into the tank: about ${Math.round(hoursLeft(r, lp))} lamp hours, and the oil store is empty. Order drums and haul them out.` }); } catch (e) { } }
  }
  if (!r.on && r.oil > 0) {
    r.on = true; r.low = hoursLeft(r, lp) < LIGHTS.lowH; did.push("light");
    try { api.TABLET.notify({ app: "lights", kind: "good", ttl: 8, title: `${lp.name} is lit again`, body: `${kFirst(lp)} climbed the ${lp.up} and lit the lamp.` }); } catch (e) { }
  }
  r.kDid = did.join("+");
  if (did.length) { try { api.TABLET.refresh("lights"); } catch (e) { } }
  return did;
}
// the keeper's line on a lamp's card in the Lights app
function keeperLine(lp, r) {
  const m = keeperOf(lp); if (!m) return ` No keeper: the lamp is yours to tend (the Staff app posts the job).`;
  const w = keeperWork(lp); if (!(w > 0)) return ` Keeper ${m.name} isn't working: wages are owed.`;
  return ` Keeper ${m.name}: a round about every ${Math.round(roundH(w))} hours, pumps a drum in when the tank runs low and relights the lamp.`;
}
function welcome(lp, r) {
  try { api.TABLET.notify({ app: "lights", kind: "info", ttl: 11, title: `Kystverket · ${lp.name}`, body: `The lamp is yours to keep burning: ${api.fmtCash(N(lp, "stipend"))} for every hour it's lit, paid Mondays. ${lp.small ? "There's" : "The last keeper left"} about ${Math.round(hoursLeft(r, lp))} hours of paraffin in the tank.` }); } catch (e) { }
}
function monday(week) {
  const s = S(), own = mine(); if (!own.length) return;
  let pay = 0, lit = 0, need = 0;
  for (const lp of own) { const r = rec(lp.id); lit += r.lit; need += r.need; pay += r.lit * N(lp, "stipend"); r.lit = 0; r.need = 0; }
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
function stock(lp) { const r = rec(lp.id); return r.q + drumsOf(r.store); }
function order(id) {
  const lp = lampOf(id), s = S(); if (!lp || !owns(lp)) return false;
  if (api.busy()) { api.toast("Finish the school course first.", "warn"); return false; }
  if (stock(lp) >= N(lp, "stockMax")) { api.toast(`That's ${plural(stock(lp), "drum")} on order or in the oil store already: plenty.`, "warn"); return false; }
  if (api.GS.cash < LIGHTS.drumCost) { api.toast(`A drum of paraffin is ${api.fmtCash(LIGHTS.drumCost)}. You have ${api.fmtCash(api.GS.cash)}.`, "warn"); return false; }
  const c = mkClaim(lp); if (!c) return false;
  api.GS.cash -= LIGHTS.drumCost; rec(lp.id).q++; api.GS.claims.push(c);
  api.ui.ping("good"); api.save();
  api.toast(`Paraffin drum paid for (${LIGHTS.drum} L). It's waiting at the quay: it rides in a parcel slot, out to ${lp.at}.`, "good");
  try { api.TABLET.refresh(); } catch (e) { }
  return true;
}
// what the session holds against what's paid for: after a reload (or a rescue that wiped the claims) the drums at
// the quay become claims again; a drum that was aboard and is gone (a blackout, a tow, the fjord) is lost
function sync() {
  if (api.busy()) return;                                  // a school course parks your own loads in the yard
  const s = S(), G = api.GS;
  for (const lp of LAMPS) {                                // each light keeps its own count (6.2b)
    if (!s.lamps[lp.id]) continue;
    const r = rec(lp.id), its = j => isDrum(j) && (lampOf(j.lamp) || LAMPS[0]) === lp;
    const ab = G.load.filter(its).length, cl = G.claims.filter(its).length, was = lastAb[lp.id] || 0;
    if (ab < was) r.q = Math.max(0, r.q - (was - ab));
    lastAb[lp.id] = ab;
    if (r.q < ab + cl) r.q = ab + cl;
    if (owns(lp)) for (let miss = r.q - ab - cl; miss > 0; miss--) { const c = mkClaim(lp); if (!c) break; G.claims.push(c); }
  }
}
// a small light isn't a SITE, so nothing in tracklayer.js hands its drums over: stopped within reach of it, we do
function dropTick() {
  const G = api.GS, P = api.P; if (!G.load.length || api.busy() || Math.hypot(P.vx, P.vz) >= 4) return;
  for (const lp of LAMPS) { const d = lp.small && lp.small.drop; if (d && Math.hypot(P.x - d.x, P.z - d.z) < LIGHTS.dropR && G.load.some(j => j.dest === d)) api.deliver(d); }
}
// tracklayer.js deliver(): a load of ours reached its light (j was taken off the sled already)
function land(j, site) {
  const lp = lampOf(j.lamp) || LAMPS[0], r = rec(lp.id);
  r.store += LIGHTS.drum; r.q = Math.max(0, r.q - 1); lastAb[lp.id] = Math.max(0, (lastAb[lp.id] || 0) - 1);
  landN++; landAt = lp;
  if (!landT) landT = setTimeout(() => {
    const q = rec(landAt.id), n = landN; landN = 0; landT = 0;
    api.toast(`${n > 1 ? plural(n, "paraffin drum") : "Paraffin drum"} rolled into the oil store at ${landAt.at}: ${plural(drumsOf(q.store), "drum")} there. Pump ${n > 1 ? "them" : "it"} into the tank in ${landAt.where}.`, "good");
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
  const r = rec(lp.id), L = Math.min(LIGHTS.drum, r.store, N(lp, "tank") - r.oil);
  r.oil += L; r.store -= L; if (r.store < 0.5) r.store = 0;
  stopPump(); api.save();
  api.toast(`${Math.round(L)} L pumped in: the tank holds ${Math.round(r.oil)} of ${N(lp, "tank")} L, about ${Math.round(hoursLeft(r, lp))} lamp hours.${r.on ? "" : ` The lamp's still out: the ${lp.up} is across the room.`}`, "good");
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
  r.on = true; r.low = hoursLeft(r, lp) < LIGHTS.lowH; api.ui.ping("good"); api.save();
  api.toast(`Up the ${lp.up}, the burner primed and a match to the mantle: ${lp.name} is lit again.`, "good");
  try { api.TABLET.refresh("lights"); } catch (e) { }
  return true;
}
const PROV = {
  use() {
    const lp = lampHere(); if (!lp) return null;
    const I = api.INT, r = rec(lp.id), kh = api.keyHint, P = TLX.prop;
    if (PUMP.on) return { label: "STOP", hint: () => `Pumping ${Math.round(100 * PUMP.t / LIGHTS.pumpT)}% · ${kh("use", "stop")}`, act: () => stopPump("Stopped pumping.") };
    if (P && ((P.SW && P.SW.on) || (P.DU && P.DU.cur >= 0))) return null;      // a sweep or a wipe under way: its STOP comes first
    const tank = `tank ${Math.round(r.oil)} of ${N(lp, "tank")} L`, st = r.store >= 1 ? `${plural(drumsOf(r.store), "full drum")} here` : "no full drum here";
    if (boxD(lp.stair, I.px, I.pz) < LIGHTS.reach && !r.on) {
      if (r.oil > 0) return { label: "LIGHT", hint: () => `${kh("use", "climb up and light the lamp")} · ${tank}`, act: () => light(lp) };
      return { label: "LAMP", hint: () => `The lamp is out and the tank is dry: ${r.store >= 1 ? "pump a drum in at the rack first" : "it needs a drum of paraffin from the quay (Lights app)"}`, act: () => api.toast(r.store >= 1 ? "Pump a drum into the tank at the rack first." : "The tank is dry and the oil store is empty: order a drum in the Lights app and haul it out.", "warn") };
    }
    if (boxD(lp.rack, I.px, I.pz) < LIGHTS.reach) {
      if (r.store >= 1 && r.oil < N(lp, "tank") - 1) return { label: "PUMP", hint: () => `${kh("use", "pump a drum into the tank")} · ${tank} · ${st}`, act: () => startPump(lp) };
      if (r.store < 1 && (!r.on || hoursLeft(r, lp) < LIGHTS.lowH)) return { label: "OIL", hint: () => `${tank[0].toUpperCase() + tank.slice(1)} · ${st}: order drums in the Lights app`, act: () => api.toast("No full drum in the oil store. The Lights app orders them; they wait at the quay.", "warn") };
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
  const rates = [...new Set(own.map(lp => api.fmtCash(N(lp, "stipend"))))];
  h += `<div class="tsub">${plural(own.length, "light")} to keep · ${rates.join(" / ")} a lamp hour, paid Mondays</div>`;
  for (const lp of own) {
    const r = rec(lp.id), st = stateOf(r), full = stock(lp) >= N(lp, "stockMax"), due = Math.round(r.lit * N(lp, "stipend")), nd = drumsOf(r.store);
    h += U.tabCard({ tf: "lamp:" + lp.id, title: lp.name, chips: U.chip(st.chip, st.cls) + (r.on && hoursLeft(r, lp) < LIGHTS.lowH ? U.chip("OIL LOW", "due") : ""),
      meta: `Tank ${Math.round(r.oil)} of ${N(lp, "tank")} L · ${r.oil > 0 ? `about ${Math.round(hoursLeft(r, lp))} lamp hours` : "dry"} · lamp ${st.word}${own.length > 1 ? ` · ${api.fmtCash(N(lp, "stipend"))} an hour lit` : ""}`,
      note: `This week: ${Math.round(r.lit)} lamp hours of ${Math.round(r.need)} dark · stipend so far ${api.fmtCash(due)}. Oil store: ${nd ? `${plural(nd, "full drum")} (${Math.round(r.store)} L)` : "empty"}.${r.q ? ` ${plural(r.q, "drum")} paid for, at the quay or aboard.` : ""}${keeperLine(lp, r)}`,
      warn: !r.on && keeperWork(lp) > 0 ? (r.oil > 0 || nd ? `The lamp is out. ${kFirst(lp)} will ${r.oil > 0 ? "light it" : "pump a drum in and light it"} on the next round, or do it yourself in ${lp.where}.` : `The lamp is out, the tank is dry and the oil store is empty. Order a drum and haul it out from the quay: ${kFirst(lp)} does the rest.`) : !r.on ? (r.oil > 0 ? `The lamp is out. There's oil in the tank: climb the ${lp.up} in ${lp.where} and light it.` : nd ? `The lamp is out and the tank is dry. Pump a drum into the tank at the rack in ${lp.where}, then climb up and light it.` : "The lamp is out, the tank is dry and the oil store is empty. Order a drum and haul it out from the quay.") : "",
      pay: api.fmtCash(LIGHTS.drumCost), act: "lord:" + lp.id, actLabel: "ORDER A DRUM", blocked: full || cash < LIGHTS.drumCost });
  }
  if (s.last.length) h += U.sec("Stipend statements", "") + `<div class="tsml2">${s.last.map(q => `<div class="tsm2 tprow"><b>${U.esc(q.d)}</b><span>Stipend +${api.fmtCash(q.pay)} · ${q.lit} of ${q.need} dark hours lit</span>${q.need - q.lit > 2 ? U.chip("DARK " + (q.need - q.lit) + " H", "due") : U.chip("PAID", "ok")}</div>`).join("")}</div>`;
  const days = lp => Math.round(N(lp, "tank") / N(lp, "burn") / 24);
  if (own.length === 1 && !own[0].small) h += `<p class="tnote2">The lamp burns ${LIGHTS.burn} L of paraffin an hour while the sun is down (a sun valve shuts it by day), so a full tank is about ${days(own[0])} days of polar night. A drum is ${LIGHTS.drum} L: it waits at the quay, rides out in a parcel slot, and is pumped into the tank by hand at the rack in the tower room. A lamp that runs dry stays out until someone climbs up and lights it.</p>`;
  else h += `<p class="tnote2">A lamp burns paraffin only while the sun is down (a sun valve shuts it by day): ${own.map(lp => `${lp.at} ${N(lp, "burn")} L an hour from a ${N(lp, "tank")} L tank, about ${days(lp)} days of polar night`).join("; ")}. A drum is ${LIGHTS.drum} L: it is ordered for one light, waits at the quay, rides out in a parcel slot, and is pumped into the tank by hand at the rack. A lamp that runs dry stays out until someone climbs up and lights it.</p>`;
  el.innerHTML = `<div class="tapp">${h}</div>`;
  for (const b of el.querySelectorAll("[data-act^='lord:']")) b.addEventListener("click", () => order(b.dataset.act.slice(5)));
}

/* ---------------- 6.2b: the two smaller lights ---------------- */
const A = () => api || TLX.api;                              // tlx-property.js places listings at ITS init, before ours
// where it stands: the flattest open ground round the seed with the most sea about it; the door looks inland
function placeSmall(m, W) {
  if (W.id !== m.region) return null;
  const sea = (x, z, R) => { let n = 0, sx = 0, sz = 0; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, c = Math.cos(a), s = Math.sin(a); if (W.isSea(x + c * R, z + s * R)) { n++; sx += c; sz += s; } } return { n, sx, sz }; };
  let best = null, bs = 1e9;
  for (let dx = -140; dx <= 140; dx += 10) for (let dz = -140; dz <= 140; dz += 10) {
    const x = m.seed[0] + dx, z = m.seed[1] + dz;
    if (Math.abs(x) > W.half - 150 || Math.abs(z) > W.half - 150) continue;
    if (W.bioAt(x, z) !== 0 || W.isWater(x, z) || W.groundAt(x, z) < 3) continue;
    let wet = false; for (const [ox, oz] of [[12, 0], [-12, 0], [0, 12], [0, -12]]) if (W.bioAt(x + ox, z + oz) !== 0 || W.isWater(x + ox, z + oz)) wet = true;
    if (wet || W.obNear(x, z, 9)) continue;
    const sc = W.slopeAt(x, z, 6) + W.slopeAt(x, z, 12) * 0.5 - sea(x, z, 100).n * 0.012 + Math.hypot(dx, dz) * 0.0004;
    if (sc < bs) { bs = sc; best = [x, z]; }
  }
  if (!best) return null;
  const [x, z] = best, q = sea(x, z, 100), ql = Math.hypot(q.sx, q.sz);
  let nx = -q.sx, nz = -q.sz;                                // inland: away from the sea round it
  if (ql < 0.5) { nx = W.depot.x - x; nz = W.depot.z - z; }
  const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
  const ry = Math.atan2(nx, nz), y = W.groundAt(x, z);
  m.at = { x, z, y, ry }; m.drop = { id: "lt_" + m.id, name: m.name, type: "light", x: x + nx * 6, z: z + nz * 6, y };
  return { x, z, y, rooms: { hut: { x: x + nx * 3.15, z: z + nz * 3.15, ry } }, sign: { x: x + nx * 4.4 + nz * 3.2, z: z + nz * 4.4 - nx * 3.2, ry },
    dress() { buildSmall(m, W); } };
}
let haloTex = null;
function halo() {
  if (haloTex) return haloTex;
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,244,205,1)"); gr.addColorStop(0.25, "rgba(255,236,180,0.55)"); gr.addColorStop(1, "rgba(255,230,160,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  haloTex = new (A().THREE).CanvasTexture(c); return haloTex;
}
// a whitewashed lantern hut on a stone footing, a pyramid roof, and the lamp on a short iron column above it
function buildSmall(m, W) {
  const a = A(), T = a.THREE, box = a.mesh.box, cyl = a.mesh.cyl, std = a.mesh.std, at = m.at;
  const g = new T.Group(); g.position.set(at.x, at.y + 0.1, at.z); g.rotation.y = at.ry; a.scene.add(g);
  const white = std(0xe9e6dc, 0.85), red = std(0xb02a20, 0.7), roof = std(0x2a2f36, 0.8), stone = std(0x6a6b6e, 0.95), iron = std(0x2b2e33, 0.5, 0.5), dark = std(0x23303a, 0.7);
  box(3.7, 2.0, 3.7, stone, 0, -0.6, 0, 0, 0, 0, g);                                  // the footing takes up the slope
  box(3.2, 2.5, 3.2, white, 0, 1.65, 0, 0, 0, 0, g);
  const rf = new T.Mesh(new T.ConeGeometry(2.55, 1.05, 4), roof); rf.position.y = 3.42; rf.rotation.y = Math.PI / 4; g.add(rf);
  box(0.96, 1.96, 0.1, dark, 0, 1.4, 1.61, 0, 0, 0, g); box(1.16, 0.12, 0.14, white, 0, 2.44, 1.62, 0, 0, 0, g);   // the door, facing inland
  box(1.3, 0.14, 0.7, stone, 0, 0.36, 1.95, 0, 0, 0, g);                             // its step
  box(0.1, 0.62, 0.56, dark, 1.61, 1.75, 0.2, 0, 0, 0, g);                           // a small window
  cyl(1.0, 1.0, 0.1, iron, 0, 3.98, 0, 0, 0, 0, g, 12);                              // the gallery, its rail
  for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4; cyl(0.02, 0.02, 0.7, iron, Math.cos(an) * 0.95, 4.36, Math.sin(an) * 0.95, 0, 0, 0, g, 5); }
  const rail = new T.Mesh(new T.TorusGeometry(0.95, 0.022, 5, 20), iron); rail.rotation.x = Math.PI / 2; rail.position.y = 4.7; g.add(rail);
  cyl(0.42, 0.52, 1.5, white, 0, 4.75, 0, 0, 0, 0, g, 10); cyl(0.46, 0.5, 0.42, red, 0, 4.8, 0, 0, 0, 0, g, 10);
  const glass = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.8, 10), new T.MeshLambertMaterial({ color: 0xbfe0f2, transparent: true, opacity: 0.5 })); glass.position.y = 5.9; g.add(glass);
  cyl(0.56, 0.56, 0.07, iron, 0, 5.5, 0, 0, 0, 0, g, 10);
  const cap = new T.Mesh(new T.ConeGeometry(0.68, 0.55, 10), red); cap.position.y = 6.57; g.add(cap);
  const blink = new T.Mesh(new T.SphereGeometry(0.3, 10, 8), new T.MeshBasicMaterial({ color: 0xfff1c0 })); blink.position.y = 5.9; g.add(blink);
  const glow = new T.Sprite(new T.SpriteMaterial({ map: halo(), color: 0xfff1c0, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); glow.position.y = 5.9; glow.scale.set(5, 5, 1); g.add(glow);
  // a drum left by the door, a stack of driftwood under the eave
  cyl(0.28, 0.28, 0.88, std(0x3c6152, 0.9), -1.15, 0.6, 1.95, 0, 0, 0, g, 12);
  box(0.9, 0.5, 0.4, std(0x7a6a55, 1), 1.95, 0.4, -0.6, 0, 0, 0, g);
  m.ob = { x: at.x, z: at.z, r: 2.0, top: 1e9 }; W.addOb(m.ob);
  m.vis = { g, blink, glow };
}
// is this light's lamp showing right now? (its own flash pattern; dark only when it is YOURS and out)
function flashOn(m, t) { const p = m.flash[0], ph = ((t % p) + p) % p; for (let i = 1; i < m.flash.length; i++) if (ph >= m.flash[i][0] && ph < m.flash[i][0] + m.flash[i][1]) return true; return false; }
function flashTick() {
  const t = api.now(), night = 1 - api.dayFactor();
  for (const m of SMALL) {
    const v = m.vis; if (!v) continue;
    const on = flashOn(m, t) && !out(m.id);
    v.blink.visible = on; v.glow.visible = on && night > 0.05; if (v.glow.visible) v.glow.material.opacity = 0.35 + 0.65 * night;
  }
}
// the lantern hut: a bunk, a stove, two drums on the rack, the ladder up through the hatch to the lamp
function hutRoom(R, K) {
  const a = A(), IM = K.IM, box = a.mesh.box, cyl = a.mesh.cyl;
  R.hx = 2.1; R.hz = 2.1; R.h = 2.5;
  K.shell(R, { plaster: true, doorX: 0, wins: [["z", -2.18, 0.45, 0.7, 1.15, 1.85]] });
  // the oil rack: two drums on a pallet, the hand pump on the nearer one
  const dg = K.sub(R, -1.35, 1.4, 0);
  for (const [x, m] of [[-0.3, IM.green], [0.32, IM.iron]]) { cyl(0.28, 0.28, 0.88, m, x, 0.5, 0, 0, 0, 0, dg, 14); cyl(0.29, 0.29, 0.03, IM.steel, x, 0.3, 0, 0, 0, 0, dg, 14); cyl(0.29, 0.29, 0.03, IM.steel, x, 0.72, 0, 0, 0, 0, dg, 14); }
  box(1.25, 0.06, 1.0, IM.wood, 0, 0.03, 0, 0, 0, 0, dg); cyl(0.02, 0.02, 0.5, IM.brass, 0.32, 1.18, 0, 0, 0, 0, dg, 6); box(0.18, 0.03, 0.03, IM.brass, 0.41, 1.42, 0, 0, 0, 0, dg);
  K.col(R, -1.35, 1.4, 1.25, 1.1, 0, 0.95);
  // the ladder: two rails leaning on the back wall, rungs, the hatch above it
  const lg = K.sub(R, 1.5, 1.72, 0);
  for (const sx of [-0.24, 0.24]) box(0.05, 2.5, 0.05, IM.wood, sx, 1.22, 0.06, -0.13, 0, 0, lg);
  for (let i = 0; i < 8; i++) box(0.48, 0.035, 0.04, IM.logD, 0, 0.3 + i * 0.28, 0.22 - i * 0.037, 0, 0, 0, lg);
  box(0.72, 0.04, 0.72, IM.dark, 0, R.h - 0.03, 0.02, 0, 0, 0, lg);
  K.col(R, 1.5, 1.72, 0.8, 0.5, 0, 3);
  K.bunk(R, 1.58, -0.35, Math.PI / 2);
  R.fire = K.stove(R, -1.72, -0.55, false, Math.PI / 2);
  K.crate(R, -1.68, -1.6, 0.6, 0.45, 0.5);
  K.hooks(R, -2.02, 0.45, Math.PI / 2, 2, true);
  K.lamp(R, -0.1, 0.25, "kero", 2.0);
}
if (TLX.prop && TLX.prop.addListing) for (const m of SMALL) TLX.prop.addListing({ id: m.id, type: "light", name: m.name, short: m.short, sign: m.sign, chip: "SEA LIGHT", price: m.price, rent: m.rent, occ: m.occ, blurb: m.blurb,
  rooms: [{ id: "hut", name: "Lantern hut", door: "The lantern hut's door", jig: m.jig, build: hutRoom, warm: "a bunk, a stove, paraffin drums and the ladder up to the lamp." }],
  place: W => placeSmall(m, W) });

/* ---------------- 6.3a: the keeper's job (tlx-staff.js hires, pays and keeps them happy) ---------------- */
if (TLX.staff && TLX.staff.addRole) {
  TLX.staff.addRole("keeper", { name: "Keeper", wage: KEEP.wage, blurb: "keeps the lamp burning: pumps the oil in, lights it when it's out",
    app: true,
    greet: p => `Hello! I saw the keeper job at ${p ? p.name : "your light"}.`,
    qs: { stove: { label: "LAMP OUT IN A GALE?", ask: "A gale at night, the lamp goes out and there's a ship off the point. What do you do?" } },
    note(m) {
      const lp = LAMPS.find(l => kPlace(l) === m.place), w = lp ? keeperWork(lp) : 0;
      return `Keeps the lamp burning: ${!(w > 0) ? "not working while wages are owed" : `a round about every ${Math.round(roundH(w))} hours (pumps a drum in when the tank runs low, relights the lamp)`}`;
    },
    // the interview in a keeper's words (tlx-staff.js has already caught a slip and checked an honest reference);
    // "" = the reference question, answered as anyone's
    answer(a, q, c) {
      const x = a.xp, r = a.xpReal, v = a.village;
      if (q === "xp") {
        if (c.slip) return `${x} years. Well... counting the summers I painted the tower, and the years I rowed the oil out with my father. Paid, as a keeper, more like ${r === 0 ? "none" : r === 1 ? "one" : r}.`;
        if (c.liar) return `${x} years, give or take. Lights, beacons, fog signals, you name it.${c.tail}`;
        return (x === 0 ? `None on a light, to be honest. I've fished out of ${v} all my life, so I know what a dark one costs.`
          : x <= 3 ? `${x} year${x > 1 ? "s" : ""} as relief keeper, filling in when the regular man was ashore.`
          : x <= 10 ? `${x} years on the lights for Kystverket: the burner, the clockwork, the log every watch.`
          : `${x} years. I kept a rock station till they automated it and sent us all home.`) + c.tail;
      }
      if (q === "stove") {
        if (c.slip) return "Go up and... switch it back on? I've mostly done the painting, if I'm honest.";
        if (c.liar) return `Oh, that happens. I'd have it burning again in no time. Never lost a night.${c.tail}`;
        return (r >= 3 ? "Check the tank first, then the mantle: nine times in ten it's the mantle. Fit the spare, prime the burner, light it, and stay up by it till the wind drops. Then it goes in the log."
          : "Honestly? I'd try a match to it, and ring you if it won't take.") + c.tail;
      }
      if (q === "why") {
        const w = a.tr && a.tr.work || 1;
        return (w >= 1.1 ? "A light has to burn every night, not most nights. I like work where that matters."
          : w <= 0.8 ? "It's quiet out there, and nobody looks over your shoulder."
          : `It's steady work, not far from ${v}, and I don't mind my own company.`) + (c.hot ? " Is that it?" : "");
      }
      return "";
    } });
  TLX.staff.addPlaces(() => {
    const out = [], a = A(); if (!a) return out;
    for (const lp of LAMPS) { if (!owns(lp)) continue; let p = null; try { p = lp.small ? lp.small.at : lp.site(a.world); } catch (e) { } out.push({ id: kPlace(lp), role: "keeper", name: lp.name, cab: lp.id, x: p ? p.x : undefined, z: p ? p.z : undefined }); }
    return out;
  });
}

TLX.register({
  id: "lights", v: 1,
  state0: () => ({ lamps: {}, hT: null, last: [] }),
  migrate(st) { return st; },
  init(a) {
    api = a; const s = S();
    if (!s.lamps || typeof s.lamps !== "object" || Array.isArray(s.lamps)) s.lamps = {};
    for (const k in s.lamps) if (!s.lamps[k] || typeof s.lamps[k] !== "object" || !lampOf(k)) delete s.lamps[k]; else rec(k);
    if (s.quay !== undefined) { const q = clamp(Math.floor(+s.quay || 0), 0, LIGHTS.stockMax); if (q > 0 && s.lamps.slettnes) s.lamps.slettnes.q = Math.max(s.lamps.slettnes.q || 0, q); delete s.quay; }   /* 6.2a kept one count, for Slettnes */
    if (s.hT !== null && !isFinite(+s.hT)) s.hT = null;
    s.last = Array.isArray(s.last) ? s.last.filter(q => q && typeof q === "object").slice(0, 4) : [];
    for (const k in lastAb) delete lastAb[k];
    if (a.footx && !a.footx.includes(PROV)) a.footx.unshift(PROV);
    a.TABLET.register({ id: "lights", name: "Lights", icon: ICON, order: 8.6, live: 10,
      hidden: () => !mine().length,
      badge: () => mine().some(lp => !rec(lp.id).on) ? "!" : "",
      render });
  },
  monday(week) { monday(week); },
  tick(dt) {
    if (!api || !api.started()) return;
    stepT += dt; if (stepT >= 1) { stepT = 0; if (!api.tutHidden()) { step(); sync(); dropTick(); } }
    if (PUMP.on) { pumpTick(dt); if (PUMP.on) posePump(); }
    flashTick();
  }
});
TLX.lights = { LIGHTS, LAMPS, rec, out, owns: id => { const lp = lampOf(id); return !!lp && owns(lp); }, mine, step, sync, monday, order, land, light: id => { const lp = lampOf(id); return !!lp && light(lp); },
  PUMP, startPump: id => startPump(lampOf(id)), stopPump, use: () => PROV.use(), dark, hoursLeft: id => hoursLeft(rec(id), lampOf(id)), stock: id => stock(lampOf(id)), state: S,
  // 6.2b: the smaller lights
  // 6.3a: keepers
  KEEP, keeper: id => { const lp = lampOf(id); return lp ? keeperOf(lp) : null; }, keeperWork: id => { const lp = lampOf(id); return lp ? keeperWork(lp) : 0; }, roundH, round: id => keeperRound(lampOf(id), rec(id)),
  SMALL, num: (id, k) => N(lampOf(id), k), flashOn, dropTick, small: id => { const lp = lampOf(id); return lp && lp.small || null; } };
})();
