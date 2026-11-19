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
// Slice 6.3b1: THE OIL DRIVER. One driver (tlx-staff.js: role "oildriver", place "oil:quay") hauls the drums you have
// paid for from the quay out to your lights on a sled of their own, two a trip, to the light that is lowest; a storm
// keeps them at the quay or makes them late; with the standing order on they order the drums too. Block comment at
// DRV. Saved as `drv` beside the lamps.
//
// Slice 6.3b2a: THE DRIVER SEEN IN THE WORLD. The run to each light is a real line over the ground (never the sea),
// the trip is a place on it, and the driver's sled (a touring sled in their own colours, a freight sledge with the
// drums, the driver in the saddle) rides it at a sled's own pace and stands parked by the quay between trips. Block
// comment at RUN. Nothing more is saved.
//
// Slice 6.3b2b: THE DRIVER ON FOOT. At a light the driver gets off and carries the drums to the oil store's door one
// at a time (a stop that is part of the trip: st "unload", u of uT game hours on the saved trip); at the quay they
// stand by the parked sled; stopped, they can be hailed with the use control. Block comment at UN.
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
let api = null, stepT = 0, landN = 0, landT = 0, landAt = null, pinned = false;
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
  const n = Math.max(1, Math.ceil(dh / 0.25)), dt = dh / n, act = [];
  for (const lp of own) {
    const r = rec(lp.id);
    if (r.fresh) { delete r.fresh; welcome(lp, r); continue; }           // the keys came today: the clock starts now
    const kw = keeperWork(lp);
    if (!(kw > 0)) r.kT = 1e3;                                            // nobody on the job: whoever starts makes a round at once
    act.push([lp, r, kw]);
  }
  // lamps and the oil driver go through the hours together, piece by piece: a drum that lands at 03:00 of a night
  // slept through is there for the keeper's 04:00 round
  for (let i = 0; i < n; i++) {
    const t = t0 + (i + 0.5) * dt;
    for (const [lp, r, kw] of act) { burn(lp, r, t, dt); if (kw > 0) { r.kT += dt; if (r.kT >= roundH(kw)) keeperRound(lp, r); } }
    drvStep(t, dt);
  }
  for (const [lp, r, kw] of act) {
    if (r.on && hoursLeft(r, lp) < LIGHTS.lowH && !r.low) {
      r.low = true;
      if (!(kw > 0 && r.store >= 1)) try { api.TABLET.notify({ app: "lights", kind: "warn", ttl: 9, title: `${lp.name}: oil low`, body: `About ${Math.round(hoursLeft(r, lp))} lamp hours left in the tank. ${r.store >= 1 ? `${plural(drumsOf(r.store), "drum")} in the oil store: pump one in.` : drvHas(lp) ? `Nothing in the oil store: ${dFirst()} has ${plural(drvHas(lp), "drum")} for it at the quay or on the way.` : "Nothing in the oil store: order a drum and haul it out."}` }); } catch (e) { }
    } else if (r.on && hoursLeft(r, lp) >= LIGHTS.lowH) r.low = false;
  }
}
/* ---------------- 6.3b1: the oil driver (tlx-staff.js hires, pays and keeps them happy) ----------------
   ONE driver, at the quay, hauls the drums you have paid for out to whichever of your lights is lowest, DRV.cap at a
   time, on a sled of their own. The trip is stepped with the lamps' clock (drvStep, from step()): QUAY (DRV.load hours
   to load once there is a drum to take and the weather at the quay is under their limit) -> OUT along the run
   (DRV.vOut m a game hour x their work, slower in weather, sitting it out where they are at their limit) -> the drums
   into the light's oil store -> BACK empty (DRV.vBack) -> QUAY. Their limit is DRV.wx[0] + DRV.wx[1] x REAL years:
   an old hand rides through what keeps a beginner at the quay. Nothing while wages are owed. STANDING ORDER (q.so, on
   by default; the Staff card and the Oil run card switch it): at the quay they order drums on your account for a
   light under DRV.orderH lamp hours of oil in tank + store + on the way. They do not pump or light: the keeper does,
   or you. What they carry is saved (s.drv), so a reload mid-trip carries on; your own drums aboard are still yours. */
const DRV = { place: "oil:quay", wage: [70, 5], cap: 2, load: 0.5,
  vOut: 720, vBack: 900,  // m a GAME hour at work 1.0 (a game hour is 50 s of riding: 52 km/h loaded, 65 empty), so the sled you meet is the haul
  trail: 1.3,             // with no run by land (6.3b2a's route): the straight line x this
  wx: [0.45, 0.03, 10],   // the weather (WX.at, 0-1) they will not ride in: base + per REAL year, years counted to
  slow: 0.6,              // the share of their speed lost at that limit (linear under it)
  unload: true,           // at the light they get off and carry the drums in (6.3b2b: UN); false = the drums land the moment the sled arrives
  orderH: 60,             // standing order: a light under this many lamp hours (tank + store + drums on the way) gets drums ordered
  late: [1.5, 0.5] };     // a trip over this x its clean time + this many hours is late
const driverOf = () => (TLX.staff && TLX.staff.at ? TLX.staff.at(DRV.place) : null);
const driverWork = () => (TLX.staff && TLX.staff.workAt ? +TLX.staff.workAt(DRV.place) || 0 : 0);
const dFirst = () => { const m = driverOf(); return m ? String(m.name).split(" ")[0] : "the driver"; };
const drvLimit = m => DRV.wx[0] + DRV.wx[1] * Math.min(DRV.wx[2], Math.max(0, m && m.xpReal | 0));
const wxAt = (x, z, t) => { try { return clamp(+api.WX.at(x, z, t) || 0, 0, 1); } catch (e) { return 0; } };
function drvRec() {
  const s = S(); let q = s.drv;
  if (!q || typeof q !== "object" || Array.isArray(q)) q = s.drv = { st: "quay", lamp: null, n: 0, p: 0, d: 0, w: 0, t: 0, held: false, who: null, so: true, wkN: 0, wkLate: 0, told: "" };
  if (q.st !== "out" && q.st !== "back" && q.st !== "unload") q.st = "quay";
  for (const k of ["n", "p", "d", "w", "t", "wkN", "wkLate", "u", "uT"]) q[k] = isFinite(+q[k]) ? Math.max(0, +q[k]) : 0;
  q.n = Math.min(DRV.cap, Math.floor(q.n)); q.so = q.so !== false; q.held = !!q.held; q.told = typeof q.told === "string" ? q.told : "";
  if (q.st !== "quay" && (!lampOf(q.lamp) || !owns(lampOf(q.lamp)) || !lampOf(q.lamp).site(api.world) || !(q.d > 0))) { q.st = "quay"; q.lamp = null; q.n = 0; q.p = 0; }
  if (q.st === "unload" && (!(q.uT > 0) || q.n < 1)) { q.st = "out"; q.p = q.d; }                  /* a stop with nothing to time it by: they are at the light, and land */
  if (q.st === "quay") { q.lamp = null; q.n = 0; q.p = 0; }
  if (q.st === "back") q.n = 0;
  if (q.st !== "unload") { q.u = 0; q.uT = 0; }
  return q;
}
// drums of this light's on the driver's sled right now
function drvAboard(lp) { const q = S().drv; return q && typeof q === "object" && (q.st === "out" || q.st === "unload") && q.lamp === lp.id ? Math.max(0, Math.floor(+q.n || 0)) : 0; }
const itsDrum = lp => j => isDrum(j) && (lampOf(j.lamp) || LAMPS[0]) === lp;
// drums paid for and standing at the quay (not on your sled, not on the driver's)
function atQuay(lp) { const r = rec(lp.id); return Math.max(0, r.q - api.GS.load.filter(itsDrum(lp)).length - drvAboard(lp)); }
// drums of this light's that a WORKING driver has in hand (waiting at the quay or aboard), for the texts
function drvHas(lp) { return driverOf() && driverWork() > 0 ? atQuay(lp) + drvAboard(lp) : 0; }
function drvPos(q) {
  const W = api.world, lp = lampOf(q.lamp), to = lp && lp.site(W); if (!to || q.st === "quay") return { x: W.depot.x, z: W.depot.z };
  const k = clamp(q.d > 0 ? q.p / q.d : 1, 0, 1), f = q.st === "back" ? 1 - k : q.st === "unload" ? 1 : k, R = route(lp);
  if (R) { const a = posAt(R, f * R.len); return { x: a.x, z: a.z }; }    // on the run (6.3b2a); no way by land: the straight line
  return { x: W.depot.x + (to.x - W.depot.x) * f, z: W.depot.z + (to.z - W.depot.z) * f };
}
const dNote = (title, body, kind) => { try { api.TABLET.notify({ app: "lights", kind: kind || "info", ttl: 8, title, body }); } catch (e) { } };
// which light's drums go next: the one with the fewest lamp hours in tank + store
function drvPick() {
  let best = null, bh = 1e9;
  for (const lp of mine()) { if (atQuay(lp) < 1) continue; const r = rec(lp.id), h = (r.oil + r.store) / N(lp, "burn"); if (h < bh) { bh = h; best = lp; } }
  return best;
}
// the standing order: drums on your account for a light that is running down
function drvOrder(q, m) {
  for (const lp of mine()) {
    const r = rec(lp.id); let k = 0;
    while (k < DRV.cap && (r.oil + r.store + r.q * LIGHTS.drum) / N(lp, "burn") < DRV.orderH && stock(lp) < N(lp, "stockMax")) {
      if (api.GS.cash < LIGHTS.drumCost) {
        if (q.told !== "cash") { q.told = "cash"; dNote(`${m.name} can't order paraffin`, `${lp.name} needs a drum (${api.fmtCash(LIGHTS.drumCost)}) and your account is short. The standing order waits for the money.`, "warn"); }
        break;
      }
      const c = mkClaim(lp); if (!c) break;
      api.GS.cash -= LIGHTS.drumCost; r.q++; api.GS.claims.push(c); k++; if (q.told === "cash") q.told = "";
    }
    if (k) { dNote(`${m.name} ordered paraffin`, `${plural(k, "drum")} for ${lp.name} on your account (${api.fmtCash(k * LIGHTS.drumCost)}): the standing order.`); try { api.TABLET.refresh("lights"); } catch (e) { } }
  }
}
function drvTake(q, lp) {
  const W = api.world, to = lp.site(W), G = api.GS, n = Math.min(DRV.cap, atQuay(lp)); if (!to || n < 1) return false;
  let k = n; for (let i = G.claims.length - 1; i >= 0 && k > 0; i--) if (itsDrum(lp)(G.claims[i])) { G.claims.splice(i, 1); k--; }   // off the quay: no longer a pickup of yours
  q.st = "out"; q.lamp = lp.id; q.n = n; q.p = 0; q.w = 0; q.t = 0; q.held = false;
  const R = route(lp);
  q.d = R ? R.len : Math.max(200, Math.hypot(to.x - W.depot.x, to.z - W.depot.z) * DRV.trail);   // the run's own length (6.3b2a)
  try { api.TABLET.refresh("lights"); } catch (e) { }
  return true;
}
function drvLand(q, m, lp, w) {
  const r = rec(lp.id), n = q.n, clean = q.d / (DRV.vOut * w), over = q.t - clean;
  const late = q.t > clean * DRV.late[0] + DRV.late[1];
  r.store += LIGHTS.drum * n; r.q = Math.max(0, r.q - n); q.n = 0; q.wkN += n; if (late) q.wkLate++;
  const kp = keeperOf(lp) && keeperWork(lp) > 0;
  dNote(`${m.name} reached ${lp.at}`, `${plural(n, "paraffin drum")} rolled into the oil store: ${plural(drumsOf(r.store), "drum")} there.${late ? ` ${Math.max(1, Math.round(over))} hour${Math.round(over) > 1 ? "s" : ""} late: held up by the weather.` : ""}${kp ? "" : !r.on ? ` The lamp is out and nobody is keeping it: pump a drum in and light it in ${lp.where}.` : hoursLeft(r, lp) < LIGHTS.lowH ? ` The tank is low and nobody is keeping the lamp: pump one in at the rack.` : ""}`, late ? "warn" : "good");
  try { api.TABLET.refresh("lights"); } catch (e) { }
}
// the driver has gone (let go, walked out) or changed mid-trip: what was on the sled stands at the quay again
function drvAbort(q) { q.st = "quay"; q.lamp = null; q.n = 0; q.p = 0; q.w = 0; q.t = 0; q.held = false; }
function drvStep(t, dt) {
  const s = S(), m = driverOf();
  if (!m) { if (s.drv && typeof s.drv === "object") { if (s.drv.st !== "quay") drvAbort(s.drv); s.drv.who = null; } return; }
  const q = drvRec();
  if (q.who !== m.id) { drvAbort(q); q.who = m.id; q.told = ""; }
  const w0 = driverWork(); if (!(w0 > 0)) return;                          // wages owed: they stay where they are
  const w = clamp(w0, 0.5, 1.3), W = api.world, lim = drvLimit(m);
  if (q.st === "quay") {
    if (q.so) drvOrder(q, m);
    const lp = drvPick(); if (!lp) { q.w = 0; q.held = false; return; }
    if (wxAt(W.depot.x, W.depot.z, t) >= lim) { q.held = true; return; }
    q.held = false; q.w += dt; if (q.w >= DRV.load / w) drvTake(q, lp);
    return;
  }
  const lp = lampOf(q.lamp);
  if (q.st === "unload") {                                                 // at the light, walking the drums in: weather does not stop that
    q.held = false; q.u += dt;
    if (q.u >= q.uT) { drvLand(q, m, lp, w); q.st = "back"; q.p = 0; q.u = 0; q.uT = 0; }
    return;
  }
  const pos = drvPos(q), wx = wxAt(pos.x, pos.z, t);
  if (q.st === "out") q.t += dt;
  if (wx >= lim) { q.held = true; return; }                               // a storm over them: they sit it out where they are
  q.held = false;
  q.p += (q.st === "out" ? DRV.vOut : DRV.vBack) * w * (1 - DRV.slow * wx / lim) * dt;
  if (q.p < q.d) return;
  if (q.st === "out") {
    const un = DRV.unload ? unPlan(lp) : null;                              // 6.3b2b: off the sled and the drums carried in, one at a time
    if (un) { q.st = "unload"; q.p = q.d; q.u = 0; q.uT = unTot(un, q.n) / UN.hourS; try { api.TABLET.refresh("lights"); } catch (e) { } }
    else { drvLand(q, m, lp, w); q.st = "back"; q.p = 0; }
  }
  else { q.st = "quay"; q.lamp = null; q.p = 0; q.w = 0; q.t = 0; try { api.TABLET.refresh("lights"); } catch (e) { } }
}
// where the driver is and what they are doing, in a line (the Oil run card, the Staff card)
function drvLine(q, m) {
  if (!(driverWork() > 0)) return "not working: wages are owed";
  if (q.who !== m.id) return "at the quay, starting on the run";            /* hired this second: the last driver's trip is not theirs (beta 0330 #5) */
  const lp = lampOf(q.lamp), km = v => (Math.max(0, v) / 1000).toFixed(1);
  if (q.st === "unload") return `at ${lp.at}, carrying ${plural(q.n, "drum")} in to the oil store`;
  if (q.st === "out") return q.held ? `sitting out the weather ${km(q.p)} km out, ${plural(q.n, "drum")} for ${lp.at} aboard` : `on the way to ${lp.at} with ${plural(q.n, "drum")}, ${km(q.d - q.p)} km to go`;
  if (q.st === "back") return q.held ? `sitting out the weather on the way back from ${lp.at}` : `on the way back from ${lp.at}, ${km(q.d - q.p)} km to go`;
  const nx = drvPick();
  if (!nx) return "at the quay, nothing to haul";
  return q.held ? `at the quay with ${plural(Math.min(DRV.cap, atQuay(nx)), "drum")} for ${nx.at}, waiting for the weather to ease` : `at the quay, loading ${plural(Math.min(DRV.cap, atQuay(nx)), "drum")} for ${nx.at}`;
}
function drvToggle() { const q = drvRec(); q.so = !q.so; q.told = ""; api.ui.ping("note"); api.toast(q.so ? `Standing order on: ${dFirst()} orders drums on your account when a light runs down.` : "Standing order off: drums are ordered only when you order them.", "info"); api.save(); try { api.TABLET.refresh(); } catch (e) { } return q.so; }
function drvPins() {
  const m = driverOf(), q = m && S().drv; if (!q || typeof q !== "object" || q.st === "quay" || q.who !== m.id || !lampOf(q.lamp)) return [];
  const p = drvPos(q); return [{ x: p.x, z: p.z, name: `${dFirst().toUpperCase()} · OIL RUN`, glyph: "O", col: "#e8c36a" }];
}
/* ---------------- 6.3b2a: the oil driver seen in the world ----------------
   THE RUN is a real line over the ground, one per light (route(): an A* over RUN.cell squares from the quay to the
   light that never crosses the sea, pays for grade, lake ice, trees and anything standing, then is rounded, stepped
   out every RUN.step m and pushed sideways off whatever it still touches). The trip's progress q.p / q.d is a place
   on it, so the Map pin and the sled are where the haul really is, and DRV.vOut / vBack are a sled's honest pace
   (one game hour is 50 s of riding: 720 m a game hour is 52 km/h).
   THE SLED (dsTick, every frame; nothing saved) is a copy of a touring sled in the driver's own colour with a
   freight sledge on a drawbar, the drums that are aboard standing on it, and the driver in the saddle while out.
   It follows the snow (height, pitch and roll from the surface under it), leaves a pressed track near you, shows a
   headlamp in the dark, and stands parked beside the quay between trips (solid there; a storm or owed wages stop it
   where it is). Built only once it comes within RUN.show m of you. */
const RUN = { cell: 32, step: 6, stop: 12, show: 900, press: 260, sled: "trekker", paint: { body: 0x6b1a12, panel: 0x1c1c1c, trim: 0xe8e2d0, seat: 0x23201d } };
const routes = {};
let quayAt = null;
const segD = (x, z, s) => { const dx = s[2] - s[0], dz = s[3] - s[1], l = dx * dx + dz * dz || 1, t = clamp(((x - s[0]) * dx + (z - s[1]) * dz) / l, 0, 1); return Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t); };
// where the driver's sled stands between trips: flat, clear ground beside the quay, off the streets
function quaySpot() {
  if (quayAt) return quayAt;
  const W = api.world, d = W.depot, st = W.streets || []; let best = null, bs = 1e9;
  for (let k = 0; k < 48; k++) for (const r of [12, 15, 18, 22]) {
    const a = k * Math.PI / 24, x = d.x + Math.cos(a) * r, z = d.z + Math.sin(a) * r;
    if (W.isSea(x, z) || W.isWater(x, z) || W.obNear(x, z, 3.4)) continue;
    let sea = 0; for (let j = 0; j < 8; j++) if (W.isSea(x + Math.cos(j * Math.PI / 4) * 9, z + Math.sin(j * Math.PI / 4) * 9)) sea++;
    let road = 0; for (const s of st) if (segD(x, z, s) < 6) road = 4;
    const sc = W.slopeAt(x, z, 3) * 12 + sea * 2 + road + r * 0.03; if (sc < bs) { bs = sc; best = { x, z }; }
  }
  best = best || { x: d.x + 12, z: d.z };
  best.yaw = Math.atan2(best.x - d.x, best.z - d.z) + Math.PI / 2;       // side on to the quay
  return quayAt = best;
}
function mkRoute(W, a, b) {
  const C = RUN.cell, n = Math.floor(2 * W.half / C), ix = v => clamp(Math.floor((v + W.half) / C), 0, n - 1), cx = i => (i + 0.5) * C - W.half;
  const gi = ix(b.x), gj = ix(b.z), S0 = ix(a.z) * n + ix(a.x), G0 = gj * n + gi, NO = 1e9;
  const cost = new Float32Array(n * n).fill(-1);
  const cc = k => {
    let c = cost[k]; if (c >= 0) return c;
    const x = cx(k % n), z = cx((k / n) | 0);
    if (k === S0 || k === G0) c = 1;
    else if (W.isSea(x, z) || W.isSea(x + 13, z) || W.isSea(x - 13, z) || W.isSea(x, z + 13) || W.isSea(x, z - 13)) c = NO;
    else { const sl = W.slopeAt(x, z, 12); c = sl > 0.5 ? NO : 1 + (sl / 0.2) * (sl / 0.2) + (W.isWater(x, z) ? 6 : 0) + (W.bioAt(x, z) !== 0 ? 0.8 : 0) + (W.obNear(x, z, 10) ? 1.5 : 0); }
    return cost[k] = c;
  };
  const g = new Float32Array(n * n).fill(Infinity), from = new Int32Array(n * n).fill(-1), shut = new Uint8Array(n * n), hk = [], hf = [];
  const push = (k, f) => { let i = hk.length; hk.push(k); hf.push(f); while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hk[i] = hk[p]; hf[i] = hf[p]; i = p; } hk[i] = k; hf[i] = f; };
  const pop = () => { const k0 = hk[0], k = hk.pop(), f = hf.pop(), m = hk.length; if (m) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= m) break; if (c + 1 < m && hf[c + 1] < hf[c]) c++; if (hf[c] >= f) break; hk[i] = hk[c]; hf[i] = hf[c]; i = c; } hk[i] = k; hf[i] = f; } return k0; };
  const hh = k => Math.hypot((k % n) - gi, ((k / n) | 0) - gj) * C;
  g[S0] = 0; push(S0, hh(S0)); let found = false, guard = 0;
  while (hk.length && guard++ < 600000) {
    const k = pop(); if (shut[k]) continue; shut[k] = 1; if (k === G0) { found = true; break; }
    const i = k % n, j = (k / n) | 0, ck = cc(k);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const i2 = i + di, j2 = j + dj; if (i2 < 0 || j2 < 0 || i2 >= n || j2 >= n) continue;
      const k2 = j2 * n + i2; if (shut[k2]) continue; const c2 = cc(k2); if (c2 >= NO) continue;
      if (di && dj && (cc(j * n + i2) >= NO || cc(j2 * n + i) >= NO)) continue;                 // never cut a corner of the sea
      const ng = g[k] + C * (di && dj ? 1.4142 : 1) * (ck + c2) / 2; if (ng < g[k2]) { g[k2] = ng; from[k2] = k; push(k2, ng + hh(k2)); }
    }
  }
  if (!found) return null;
  let P = []; for (let k = G0; k >= 0; k = from[k]) P.push([cx(k % n), cx((k / n) | 0)]);
  P.reverse(); P[0] = [a.x, a.z]; P[P.length - 1] = [b.x, b.z];
  for (let it = 0; it < 2; it++) { const Q = [P[0]]; for (let i = 0; i < P.length - 1; i++) { const p = P[i], q = P[i + 1]; Q.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]); } Q.push(P[P.length - 1]); P = Q; }
  // step it out evenly, and stop short of the light's own door
  let tot = 0; for (let i = 1; i < P.length; i++) tot += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  const end = Math.max(RUN.step * 4, tot - RUN.stop), R = [P[0]]; let acc = 0, next = RUN.step;
  for (let i = 1; i < P.length && next <= end; i++) {
    const p = P[i - 1], q = P[i], l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    while (l > 0 && acc + l >= next && next <= end) { const t = (next - acc) / l; R.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); next += RUN.step; }
    acc += l;
  }
  // off anything it still touches: a sideways bump, eased over the points either side
  const bad = (x, z) => W.isSea(x, z) || W.obNear(x, z, 2.4); let left = 0;
  for (let pass = 0; pass < 4; pass++) {
    left = 0;
    for (let i = 2; i < R.length; i++) {
      const p = R[i]; if (!bad(p[0], p[1])) continue;
      const q0 = R[i - 1], q1 = R[Math.min(R.length - 1, i + 1)], tx = q1[0] - q0[0], tz = q1[1] - q0[1], tl = Math.hypot(tx, tz) || 1, nx = tz / tl, nz = -tx / tl; let off = 0;
      for (const d of [3, -3, 6, -6, 9, -9, 13, -13, 18, -18, 24, -24]) if (!bad(p[0] + nx * d, p[1] + nz * d)) { off = d; break; }
      if (!off) { left++; continue; }
      for (let j = Math.max(2, i - 5); j <= Math.min(R.length - 1, i + 5); j++) { const w = Math.cos((j - i) / 6 * Math.PI / 2); R[j] = [R[j][0] + nx * off * w * w, R[j][1] + nz * off * w * w]; }
    }
    let n2 = 0; for (let i = 2; i < R.length; i++) if (bad(R[i][0], R[i][1])) n2++;
    left = n2; if (!n2) break;
  }
  // ease the kinks the bumps left, wherever the eased point is still clear
  for (let it = 0; it < 8; it++) for (let i = 2; i < R.length - 1; i++) { const x = (R[i - 1][0] + R[i + 1][0]) * 0.25 + R[i][0] * 0.5, z = (R[i - 1][1] + R[i + 1][1]) * 0.25 + R[i][1] * 0.5; if (!bad(x, z)) R[i] = [x, z]; }
  left = 0; for (let i = 2; i < R.length; i++) if (bad(R[i][0], R[i][1])) left++;
  const cum = [0]; for (let i = 1; i < R.length; i++) cum.push(cum[i - 1] + Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]));
  return { pts: R, cum, len: cum[cum.length - 1], bad: left };
}
// the run out to this light (null: no way by land, and the driver's place is the straight line as before)
function route(lp) {
  if (!lp || !api) return null;
  if (routes[lp.id] !== undefined) return routes[lp.id];
  const W = api.world, to = lp.site(W); if (!to) return null;
  let r = null; try { r = mkRoute(W, quaySpot(), to); } catch (e) { r = null; }
  return routes[lp.id] = r && r.len > 60 ? r : null;
}
// the point s metres along a run, and the way it heads there
function posAt(R, s) {
  const c = R.cum, n = c.length; s = clamp(s, 0, R.len);
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
  const p = R.pts[lo], q = R.pts[hi], l = c[hi] - c[lo] || 1, t = (s - c[lo]) / l, tx = (q[0] - p[0]) / l, tz = (q[1] - p[1]) / l;
  return { x: p[0] + (q[0] - p[0]) * t, z: p[1] + (q[1] - p[1]) * t, tx, tz };
}
/* ---------------- 6.3b2b: the driver on foot ----------------
   AT THE LIGHT the sled stops at the end of the run and the driver gets off, walks back to the sledge, takes a drum on
   the shoulder, carries it to the door of the room with the oil store (unPlan(): a way on foot from the sledge to the
   door that goes round anything standing), is inside a moment, walks back for the next, and rides home. The stop is
   part of the trip (q.st "unload", q.u of q.uT game hours; the drums are in the store when it ends) and what you see
   is the same clock (unAt()). AT THE QUAY the driver stands by the parked sled, at the sledge while loading. On foot
   the figure walks with the walker's own gait (api.walkAs: the wade in loose snow, the walk on a packed path, boots
   planted, a trench behind). Stopped (at the quay, at a light, sat out in weather) they can be hailed with the use
   control within UN.reach, and that is where PRAISE / CRITICISE in the Staff app can be had. */
const UN = { hourS: 50,          // seconds of play in a game hour
  off: 1, on: 1,                 // s in the saddle before getting off / after getting back on
  seg: 3,                        // s on foot between the saddle and the sledge, each way
  lift: 1.6,                     // s to get a drum from the sledge onto the shoulder
  vC: 1.1, vB: 1.5,              // m/s with a drum on the shoulder / walking back for the next
  inT: 3,                        // s inside with each drum
  back: 4.2, side: 0.85,         // the sledge's middle behind the sled's; where they stand beside either
  far: 60,                       // m: a door further than this from the end of the run is no carry (the drums land as the sled arrives)
  reach: 3.2 };                  // m: the use control hails them from this close
const ease = x => { const r = 0.12; x = clamp(x, 0, 1); return x < r ? x * x / (2 * r * (1 - r)) : x > 1 - r ? 1 - (1 - x) * (1 - x) / (2 * r * (1 - r)) : (x - r / 2) / (1 - r); };
// a way on foot from A to B round whatever stands between them: a straight line if it is clear, else a search over
// 1 m squares, pulled tight
function walkWay(W, A, B) {
  const bad = (x, z) => W.isSea(x, z) || W.obNear(x, z, 0.75);
  const clear = (p, q) => { const l = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.ceil(l / 0.4); for (let i = 1; i < n; i++) if (bad(p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n)) return false; return true; };
  if (clear(A, B)) return [A, B];
  const pad = 14, x0 = Math.floor(Math.min(A[0], B[0]) - pad), z0 = Math.floor(Math.min(A[1], B[1]) - pad), w = Math.ceil(Math.abs(A[0] - B[0]) + 2 * pad) + 1, h = Math.ceil(Math.abs(A[1] - B[1]) + 2 * pad) + 1;
  if (w * h > 16000) return [A, B];
  const ci = p => (Math.round(p[1] - z0)) * w + Math.round(p[0] - x0), s = ci(A), g = ci(B), from = new Int32Array(w * h).fill(-2), blk = new Int8Array(w * h).fill(-1);
  const isB = k => { if (k === s || k === g) return false; if (blk[k] < 0) blk[k] = bad(x0 + k % w, z0 + ((k / w) | 0)) ? 1 : 0; return blk[k] === 1; };
  const Q = [s]; from[s] = -1; let found = false;
  for (let qi = 0; qi < Q.length && !found; qi++) {
    const k = Q[qi], i = k % w, j = (k / w) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const i2 = i + di, j2 = j + dj; if (i2 < 0 || j2 < 0 || i2 >= w || j2 >= h) continue;
      const k2 = j2 * w + i2; if (from[k2] !== -2 || isB(k2)) continue;
      if (di && dj && (isB(j * w + i2) || isB(j2 * w + i))) continue;
      from[k2] = k; if (k2 === g) { found = true; break; } Q.push(k2);
    }
  }
  if (!found) return [A, B];
  let P = []; for (let k = g; k >= 0; k = from[k]) P.push([x0 + k % w, z0 + ((k / w) | 0)]);
  P.reverse(); P[0] = A; P[P.length - 1] = B;
  const out = [A]; let i = 0;
  while (i < P.length - 1) { let j = P.length - 1; while (j > i + 1 && !clear(P[i], P[j])) j--; out.push(P[j]); i = j; }
  return out;
}
// the carry at this light: where they get off (Q), where they stand at the sledge (S), the way to the door (pts, as a
// run: posAt reads it), how long one drum takes. Kept on the run; null = no door within reach of it.
function unPlan(lp) {
  const R = route(lp); if (!R) return null;
  if (R.un !== undefined) return R.un;
  let un = null;
  try {
    const W = api.world, l = TLX.prop && TLX.prop.listing ? TLX.prop.listing(lp.prop) : null, d = l && l.at && l.at.rooms ? l.at.rooms[lp.room.split(":")[1]] : null;
    if (d) {
      const e = posAt(R, R.len), b = posAt(R, Math.max(0, R.len - UN.back)), lx = b.tz, lz = -b.tx;
      const side = (d.x - b.x) * lx + (d.z - b.z) * lz >= 0 ? 1 : -1;
      const S0 = [b.x + lx * side * UN.side, b.z + lz * side * UN.side], Q0 = [e.x + e.tz * side * UN.side - e.tx * 0.3, e.z - e.tx * side * UN.side - e.tz * 0.3];
      let nx = Math.sin(d.ry || 0), nz = Math.cos(d.ry || 0);                  // out of the door; the house is the other way
      if (!W.obNear(d.x - nx * 1.6, d.z - nz * 1.6, 0.4) && W.obNear(d.x + nx * 1.6, d.z + nz * 1.6, 0.4)) { nx = -nx; nz = -nz; }
      let k = 0; while (k < 1.6 && !W.obNear(d.x - nx * (k + 0.15), d.z - nz * (k + 0.15), 0.3)) k += 0.15;
      const pts = walkWay(W, S0, [d.x, d.z]).concat([[d.x - nx * (k + 0.35), d.z - nz * (k + 0.35)]]);
      const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const len = cum[cum.length - 1];
      if (len > 2 && len <= UN.far) un = { pts, cum, len, S: S0, Q: Q0, side, face: Math.atan2(b.x - S0[0], b.z - S0[1]), per: UN.lift + len / UN.vC + UN.inT + len / UN.vB };
    }
  } catch (e) { un = null; }
  return R.un = un;
}
const unTot = (un, n) => UN.off + UN.seg + n * un.per + UN.seg + UN.on;       // seconds for the whole stop with n drums
// what the driver is doing t seconds into the stop: m = seat | toS | lift | carry | in | back | toQ, k = how far
// through it, s = metres along the way to the door, done = drums already inside
function unAt(un, n, t) {
  if (t < UN.off) return { m: "seat", k: 0, done: 0 };
  t -= UN.off; if (t < UN.seg) return { m: "toS", k: ease(t / UN.seg), done: 0 };
  t -= UN.seg;
  for (let i = 0; i < n; i++) {
    if (t < UN.lift) return { m: "lift", k: t / UN.lift, done: i };
    t -= UN.lift; const tc = un.len / UN.vC; if (t < tc) return { m: "carry", k: t / tc, s: un.len * ease(t / tc), done: i };
    t -= tc; if (t < UN.inT) return { m: "in", k: t / UN.inT, done: i + 1 };
    t -= UN.inT; const tb = un.len / UN.vB; if (t < tb) return { m: "back", k: t / tb, s: un.len * (1 - ease(t / tb)), done: i + 1 };
    t -= tb;
  }
  if (t < UN.seg) return { m: "toQ", k: ease(t / UN.seg), done: n };
  return { m: "seat", k: 1, done: n };
}
const DS = { g: null, sg: null, s: 0, v: 0, tp: -1, tt: 0, key: "", obs: null, y: null, pS: -1e9, shown: false, moving: false, n: 0, fig: null, F: null, hail: null, mode: "", us: 0, uv: 0, up: 0, utt: 0, fq: null };
function dsOb(p) {
  const W = api.world;
  if (DS.obs && (!p || Math.hypot(DS.obs[0].x - p.x, DS.obs[0].z - p.z) > 0.5)) { for (const o of DS.obs) W.dropOb(o); DS.obs = null; }
  if (p && !DS.obs) { DS.obs = [{ x: p.x, z: p.z, r: 1.0, top: 1e9 }, { x: p.x - p.tx * 3.6, z: p.z - p.tz * 3.6, r: 0.8, top: 1e9 }]; for (const o of DS.obs) W.addOb(o); }
}
function dsBuild() {
  const T = api.THREE, box = api.mesh.box, cyl = api.mesh.cyl, std = api.mesh.std;
  const g = new T.Group(); g.rotation.order = "YXZ"; api.scene.add(g);
  const C = api.sledCopy(RUN.sled, RUN.paint); g.add(C.g);
  const dark = std(0x1b1d20, 0.6, 0.3), steel = std(0x8d9299, 0.45, 0.6), rubber = std(0x101112, 0.95, 0), wood = std(0x7b6548, 0.95, 0), drumM = std(0x3c6152, 0.85, 0.1), strap = std(0xc9a233, 0.9, 0);
  // the bars and their column (your own sled's are one set, shared by every machine you own)
  cyl(0.022, 0.026, 0.5, dark, 0, C.barY - 0.22, C.barZ + 0.075, -0.33, 0, 0, g, 8);
  cyl(0.015, 0.015, 0.74, dark, 0, C.barY, C.barZ, 0, 0, Math.PI / 2, g, 8);
  for (const sx of [-1, 1]) { cyl(0.021, 0.021, 0.13, rubber, sx * 0.325, C.barY, C.barZ, 0, 0, Math.PI / 2, g, 8); box(0.14, 0.12, 0.02, dark, sx * 0.33, C.barY + 0.02, C.barZ + 0.09, -0.3, 0, 0, g); }
  // headlamp: a glow at the nose in the dark
  const lamp = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), new T.MeshBasicMaterial({ color: 0xfff2c8 })); lamp.position.set(0, 0.86, 1.2); g.add(lamp);
  const glow = new T.Sprite(new T.SpriteMaterial({ map: halo(), color: 0xfff1c0, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); glow.position.set(0, 0.86, 1.3); glow.scale.set(2.2, 2.2, 1); g.add(glow);
  // the driver, in the saddle: thighs along the seat, shins down to the boards, a lean into the bars, hands on the grips
  const mats = { jacket: std(0x2d4a63, 0.85, 0), pants: std(0x202328, 0.9, 0), trim: std(0xd8b23a, 0.7, 0) };
  const r = api.newWalker(mats), U = r.userData, hz = -0.24, lean = 0.5;
  r.position.set(0, C.seatAt(hz) + 0.1 - 0.93, hz); g.add(r);
  U.legs[0].rotation.set(-1.27, 0, -0.16); U.legs[1].rotation.set(-1.27, 0, 0.16); for (const s of U.shins) s.rotation.set(1.22, 0, 0); for (const a of U.ank) a.rotation.set(0.05, 0, 0);
  U.torso.rotation.x = lean; U.head.rotation.x = -0.36;
  for (let i = 0; i < 2; i++) {
    const sx = i ? 1 : -1, a = U.arms[i], f = U.fore[i];
    // the grip in the torso's own frame (the torso turns about its pivot, 0.93 up the figure)
    const wy = C.barY + 0.03 - r.position.y - 0.93, wz = C.barZ - 0.02 - hz, ly = wy * Math.cos(lean) + wz * Math.sin(lean), lz = -wy * Math.sin(lean) + wz * Math.cos(lean);
    const dx = sx * 0.325 - sx * 0.25, dy = ly - 0.53, dz = lz, L = Math.min(0.485, Math.hypot(dx, dy, dz)), l1 = 0.25, l2 = 0.24;
    const p = Math.atan2(Math.hypot(dx, dz), -dy), al = Math.acos(clamp((l1 * l1 + L * L - l2 * l2) / (2 * l1 * L), -1, 1)), ga = Math.acos(clamp((l1 * l1 + l2 * l2 - L * L) / (2 * l1 * l2), -1, 1));
    a.rotation.set(-(p - al), Math.atan2(dx, dz), 0); f.rotation.set(-(Math.PI - ga), 0, 0);
  }
  // the freight sledge: two steel runners, a plank deck, a V drawbar to the sled's hitch
  const sg = new T.Group(); sg.rotation.order = "YXZ"; api.scene.add(sg);
  box(0.8, 0.05, 1.75, wood, 0, 0.27, 0, 0, 0, 0, sg);
  for (const sx of [-1, 1]) {
    box(0.06, 0.035, 1.9, steel, sx * 0.34, 0.02, 0, 0, 0, 0, sg); box(0.06, 0.035, 0.34, steel, sx * 0.34, 0.09, 1.09, -0.45, 0, 0, sg);
    for (const z of [-0.7, 0, 0.7]) box(0.04, 0.22, 0.04, steel, sx * 0.34, 0.14, z, 0, 0, 0, sg);
    box(0.04, 0.04, 1.75, wood, sx * 0.38, 0.33, 0, 0, 0, 0, sg);
  }
  const bar = (x0, y0, z0, x1, y1, z1) => { const m = cyl(0.018, 0.018, Math.hypot(x1 - x0, y1 - y0, z1 - z0), steel, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, 0, 0, sg, 6); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(x1 - x0, y1 - y0, z1 - z0).normalize()); };
  const hitch = -C.zBack + 0.22, gap = 2.15;                               // sled origin -> its hitch; hitch -> the sledge's middle
  bar(-0.3, 0.2, 0.9, 0, 0.42, gap); bar(0.3, 0.2, 0.9, 0, 0.42, gap);
  const drums = [];
  for (const z of [0.4, -0.4]) {
    const d = new T.Group(); d.position.set(0, 0.295, z); sg.add(d);
    cyl(0.2, 0.2, 0.62, drumM, 0, 0.31, 0, 0, 0, 0, d, 14); for (const y of [0.2, 0.42]) cyl(0.207, 0.207, 0.025, steel, 0, y, 0, 0, 0, 0, d, 14);
    cyl(0.03, 0.03, 0.03, steel, 0.1, 0.635, 0, 0, 0, 0, d, 6); box(0.84, 0.012, 0.05, strap, 0, 0.63, 0, 0, 0, 0, d); for (const sx of [-1, 1]) box(0.012, 0.36, 0.05, strap, sx * 0.3, 0.46, 0, 0, 0, sx * 0.3, d);
    drums.push(d);
  }
  Object.assign(DS, { g, sg, rider: r, lamp, glow, drums, back: hitch + gap, C });
  // the same driver on foot (6.3b2b), and the drum that goes on the shoulder: its middle is its origin; the mount is
  // where it lies on the right shoulder, bung forward
  const f = api.newWalker(mats); f.visible = false; api.scene.add(f);
  const mount = new T.Object3D(); mount.position.set(-0.335, 0.8, 0.0); mount.rotation.set(Math.PI / 2 - 0.1, 0, 0); f.userData.torso.add(mount);
  const cd = new T.Group(); cd.visible = false; api.scene.add(cd);
  cyl(0.2, 0.2, 0.62, drumM, 0, 0, 0, 0, 0, 0, cd, 14); for (const y of [-0.11, 0.11]) cyl(0.207, 0.207, 0.025, steel, 0, y, 0, 0, 0, 0, cd, 14); cyl(0.03, 0.03, 0.03, steel, 0.1, 0.325, 0, 0, 0, 0, cd, 6);
  Object.assign(DS, { fig: f, mount, cd, F: { x: 0, z: 0, yaw: 0, tired: 0.1 }, hy: 0, v1: new T.Vector3(), v2: new T.Vector3(), q1: new T.Quaternion(), q2: new T.Quaternion() });
}
function dsHide() { if (DS.g) { DS.g.visible = false; DS.sg.visible = false; DS.fig.visible = false; DS.cd.visible = false; } DS.shown = false; DS.moving = false; DS.hail = null; DS.mode = ""; }
// the driver on foot at (x, z), turning to face yawT: the walker's own gait for the ground covered since the last frame
function figPut(x, z, yawT, dt, pl) {
  const F = DS.F, f = DS.fig;
  if (!f.visible) { F.yaw = yawT; F.px = undefined; }
  F.x = x; F.z = z; F.yaw += Math.atan2(Math.sin(yawT - F.yaw), Math.cos(yawT - F.yaw)) * Math.min(1, dt * 7);
  const far = Math.hypot(pl.x - x, pl.z - z); F.vol = far < 14 ? 0.45 * (1 - far / 14) : 0; F.quiet = far > RUN.press;
  api.walkAs(f, F, dt); f.visible = true;
}
// a drum on the right shoulder (w 0..1), the right arm up over it, the left out for balance, the trunk a little under
// the load and off to the left; reach (0..1): both hands down on a drum that stands on the sledge
function figCarry(w, reach) {
  const U = DS.fig.userData, L = (a, b, t) => a + (b - a) * t;
  if (reach > 0) {
    for (let i = 0; i < 2; i++) { const a = U.arms[i], sd = i ? 1 : -1; a.rotation.set(L(a.rotation.x, -1.0, reach), 0, L(a.rotation.z, -sd * 0.1, reach)); U.fore[i].rotation.x = L(U.fore[i].rotation.x, -0.35, reach); }
    U.torso.rotation.x = L(U.torso.rotation.x, 0.42, reach); U.head.rotation.x = L(U.head.rotation.x, 0.1, reach);
  }
  if (w > 0) {
    const a = U.arms[0], b = U.arms[1];
    a.rotation.set(L(a.rotation.x, -2.5, w), 0, L(a.rotation.z, -0.3, w)); U.fore[0].rotation.x = L(U.fore[0].rotation.x, -0.95, w);
    b.rotation.x *= 1 - 0.45 * w; b.rotation.z = L(b.rotation.z, 0.26, w);
    U.torso.rotation.x = L(U.torso.rotation.x, Math.min(U.torso.rotation.x, 0.24) + 0.06, w); U.torso.rotation.z = L(U.torso.rotation.z, -0.07, w); U.head.rotation.x = L(U.head.rotation.x, -0.12, w); U.head.rotation.z = -0.2 * w;   /* upright under the load, even wading */
  } else U.head.rotation.z = 0;
}
// the driver hailed: a line in their own words about what they are at
function hail() {
  const m = driverOf(), q = m && S().drv; if (!m || !q) return;
  const lp = lampOf(q.lamp), nx = q.st === "quay" ? drvPick() : null;
  const say = !(driverWork() > 0) ? "No wages, no oil. Square up with me and I'll get on with it."
    : q.st === "unload" ? `${q.n > 1 ? "These two" : "This one"} into the store here, then home. ${lp.name} is good for a while.`
    : q.st === "quay" ? (q.held ? "Not in this. I'll go when it eases." : nx ? `Loading for ${nx.at}. Away in a minute.` : q.so ? "Nothing to haul just now. I'll order more when a light runs down." : "Nothing to haul just now. Order the drums and I'll take them out.")
    : q.held ? "Sitting it out. Drums don't spoil." : "Can't stop!";
  api.ui.ping("note"); api.toast(`${dFirst()}: "${say}" (The Staff app: praise or a word of criticism can be had while you stand here.)`, "info");
}
function hailUse() {
  const h = DS.hail, F = api.FOOT; if (!h || !DS.shown || api.INT.on || !F.on || !driverOf() || Math.hypot(F.x - h.x, F.z - h.z) > UN.reach) return null;
  return { label: "TALK", hint: () => api.keyHint("use", `talk to ${dFirst()}`), act: hail };
}
function dsTick(dt) {
  const m = driverOf(), s = S(), q = m && s.drv && typeof s.drv === "object" && s.drv.who === m.id ? s.drv : null;
  if (!q || !mine().length || api.tutHidden()) { dsHide(); dsOb(null); DS.key = ""; return; }
  const W = api.world, lp = lampOf(q.lamp), R = q.st !== "quay" && lp ? route(lp) : null, now = api.now();
  const un = q.st === "unload" && lp ? unPlan(lp) : null;                 // (before the parked sled goes down as something standing)
  let a, dir = 1, along = 0;
  if (q.st === "quay") { const u = quaySpot(); a = { x: u.x, z: u.z, tx: Math.sin(u.yaw), tz: Math.cos(u.yaw) }; DS.key = "quay"; DS.v = 0; DS.moving = false; dsOb(a); }
  else if (q.st === "unload") {
    if (!R) { dsHide(); dsOb(null); return; }
    // stopped at the end of the run; the stop's own clock (q.u moves once a second) carried on between its steps
    const key = "unload" + q.lamp, us = q.u * UN.hourS;
    if (DS.key !== key) { DS.key = key; DS.us = us; DS.uv = 0; DS.up = us; DS.utt = now; }
    if (us !== DS.up) { const e = now - DS.utt; DS.uv = us > DS.up && e > 0.2 && e < 3 ? (us - DS.up) / e : 0; DS.up = us; DS.utt = now; }
    const el = now - DS.utt; if (el > 1.6) DS.uv = 0;
    const ideal = DS.up + DS.uv * Math.min(el, 1.15);
    if (Math.abs(ideal - DS.us) > 5) DS.us = ideal; else DS.us = Math.max(DS.us, DS.us + (ideal - DS.us) * Math.min(1, dt * 5));
    DS.v = 0; DS.moving = false; along = R.len; a = posAt(R, along); dsOb(a);
  }
  else {
    dsOb(null);
    if (!R) { dsHide(); return; }
    // q.p moves once a second, in steps: carry on at the pace of the last step until the next one comes
    const key = q.st + q.lamp;
    if (DS.key !== key) { DS.key = key; DS.s = q.p; DS.v = 0; DS.tp = q.p; DS.tt = now; }
    if (q.p !== DS.tp) { const e = now - DS.tt; DS.v = q.p > DS.tp && e > 0.2 && e < 3 ? (q.p - DS.tp) / e : 0; DS.tp = q.p; DS.tt = now; }
    const el = now - DS.tt; if (el > 1.6) DS.v = 0;
    const ideal = DS.tp + DS.v * Math.min(el, 1.15);
    if (Math.abs(ideal - DS.s) > 70) DS.s = ideal; else DS.s = Math.max(DS.s, DS.s + (ideal - DS.s) * Math.min(1, dt * 5));
    DS.moving = DS.v > 0.5;
    const f = clamp(q.d > 0 ? DS.s / q.d : 1, 0, 1);
    dir = q.st === "out" ? 1 : -1; along = (dir > 0 ? f : 1 - f) * R.len;
    a = posAt(R, along); a.tx *= dir; a.tz *= dir;
  }
  DS.at = a;
  const F = api.FOOT, pl = F.on ? F : api.P;
  if (Math.hypot(pl.x - a.x, pl.z - a.z) > RUN.show) { dsHide(); return; }
  if (!DS.g) dsBuild();
  const g = DS.g, sg = DS.sg, k = DS.shown ? Math.min(1, dt * 9) : 1;
  // the sledge trails on the run behind the sled (parked: straight behind it)
  let b; if (R) { const sb = along - dir * DS.back; b = sb >= 0 && sb <= R.len ? posAt(R, sb) : null; }
  if (!b) b = { x: a.x - a.tx * DS.back, z: a.z - a.tz * DS.back };
  const yaw = Math.atan2(a.tx, a.tz), wrap = v => Math.atan2(Math.sin(v), Math.cos(v));
  const lx = Math.cos(yaw), lz = -Math.sin(yaw);                          // the sled's left
  // the sled bridges the snow from ski to track: its height is the mean under nose, middle and tail
  const sF = W.surf(a.x + a.tx * 1.0, a.z + a.tz * 1.0), sB = W.surf(a.x - a.tx * 1.2, a.z - a.tz * 1.2);
  const sink = 0.05, ya = (sF + sB + W.surf(a.x, a.z)) / 3 - sink, yb = (W.surf(b.x + a.tx * 0.7, b.z + a.tz * 0.7) + W.surf(b.x - a.tx * 0.7, b.z - a.tz * 0.7)) / 2 - sink * 0.6;
  const pitch = Math.atan2(sF - sB, 2.2), roll = Math.atan2(W.surf(a.x + lx * 0.5, a.z + lz * 0.5) - W.surf(a.x - lx * 0.5, a.z - lz * 0.5), 1.0);
  g.position.set(a.x, ya, a.z);
  g.rotation.y = DS.shown ? g.rotation.y + wrap(yaw - g.rotation.y) * Math.min(1, dt * 6) : yaw;
  g.rotation.x += (clamp(-pitch, -0.6, 0.6) - g.rotation.x) * k * 0.6; g.rotation.z += (clamp(roll, -0.45, 0.45) - g.rotation.z) * k * 0.6;
  // the sledge looks at the hitch
  const hx = a.x - Math.sin(g.rotation.y) * (DS.back - 2.15), hz = a.z - Math.cos(g.rotation.y) * (DS.back - 2.15), syaw = Math.atan2(hx - b.x, hz - b.z);
  sg.position.set(hx - Math.sin(syaw) * 2.15, yb, hz - Math.cos(syaw) * 2.15);
  sg.rotation.y = syaw; sg.rotation.x += (clamp(-Math.atan2(ya + 0.1 - yb, DS.back), -0.6, 0.6) - sg.rotation.x) * k * 0.6;
  g.visible = sg.visible = true; DS.shown = true;
  const night = 1 - api.dayFactor();
  // who is where: in the saddle (riding, or the first and last moment of a stop), or on foot
  let seated = q.st === "out" || q.st === "back", n = 0, fig = false, cdOn = false, mode = seated ? "ride" : "";
  if (q.st === "out") n = q.n;
  else if (q.st === "quay") {
    const nx = q.w > 0 && !q.held ? drvPick() : null; n = nx ? Math.min(DRV.cap, atQuay(nx)) : 0;
    // by the sled; at the sledge while there are drums going on it. They walk between the two.
    const ld = n > 0, bx = a.x - a.tx * (ld ? DS.back : 0.2), bz = a.z - a.tz * (ld ? DS.back : 0.2), tx = bx + lx * UN.side, tz = bz + lz * UN.side, face = ld ? Math.atan2(-lx, -lz) : Math.atan2(lx * 0.8 + a.tx * 0.6, lz * 0.8 + a.tz * 0.6);
    if (!DS.fq || !DS.fig.visible || Math.hypot(DS.fq.x - tx, DS.fq.z - tz) > 9) DS.fq = { x: tx, z: tz };
    const dx = tx - DS.fq.x, dz = tz - DS.fq.z, dd = Math.hypot(dx, dz), st = Math.min(dd, 1.3 * dt);
    if (dd > 0.02) { DS.fq.x += dx / dd * st; DS.fq.z += dz / dd * st; }
    figPut(DS.fq.x, DS.fq.z, dd > 0.25 ? Math.atan2(dx, dz) : face, dt, pl); figCarry(0, 0); fig = true; mode = dd > 0.25 ? "walk" : ld ? "load" : "stand";
  } else if (q.st === "unload") {
    const u = un ? unAt(un, q.n, DS.us) : { m: "seat", done: 0 };
    mode = u.m; seated = u.m === "seat"; n = q.n - u.done - (u.m === "lift" || u.m === "carry" ? 1 : 0);
    if (u.m === "toS" || u.m === "toQ") {
      const k = u.m === "toS" ? u.k : 1 - u.k, back = u.m === "toS" ? 0 : Math.PI;
      figPut(un.Q[0] + (un.S[0] - un.Q[0]) * k, un.Q[1] + (un.S[1] - un.Q[1]) * k, Math.atan2(un.S[0] - un.Q[0], un.S[1] - un.Q[1]) + back, dt, pl); figCarry(0, 0); fig = true;
    } else if (u.m === "lift") {
      figPut(un.S[0], un.S[1], un.face, dt, pl); fig = true; cdOn = true;
      const up = api.sstep(0.3, 0.95, u.k);
      figCarry(api.sstep(0.45, 1, u.k), api.sstep(0, 0.28, u.k) * (1 - api.sstep(0.45, 0.9, u.k)));
      DS.fig.updateMatrixWorld(true); sg.updateMatrixWorld(true);
      const slot = DS.drums[Math.max(0, n)];                               // the one being taken: the next index after those left
      DS.v1.set(0, 0.31, 0); slot.localToWorld(DS.v1); sg.getWorldQuaternion(DS.q1);
      DS.mount.getWorldPosition(DS.v2); DS.mount.getWorldQuaternion(DS.q2);
      DS.cd.position.lerpVectors(DS.v1, DS.v2, up); DS.cd.position.y += 0.12 * Math.sin(Math.PI * up); DS.cd.quaternion.copy(DS.q1).slerp(DS.q2, up);
    } else if (u.m === "carry" || u.m === "back") {
      const p = posAt(un, u.s), bk = u.m === "back";
      figPut(p.x, p.z, Math.atan2(bk ? -p.tx : p.tx, bk ? -p.tz : p.tz), dt, pl); fig = true; cdOn = !bk;
      figCarry(bk ? 0 : 1, 0);
      if (cdOn) { DS.fig.updateMatrixWorld(true); DS.mount.getWorldPosition(DS.cd.position); DS.mount.getWorldQuaternion(DS.cd.quaternion); }
    }
  }
  DS.mode = mode; DS.fig.visible = fig; DS.cd.visible = cdOn;
  if (fig) {                                                              // standing, they look round at you when you come close
    const F = DS.F, dP = Math.hypot(pl.x - F.x, pl.z - F.z), still = mode === "stand" || mode === "load";
    const want = still && dP < 9 && dP > 0.4 ? clamp(Math.atan2(Math.sin(Math.atan2(pl.x - F.x, pl.z - F.z) - F.yaw), Math.cos(Math.atan2(pl.x - F.x, pl.z - F.z) - F.yaw)), -1.15, 1.15) : 0;
    DS.hy += (want - DS.hy) * Math.min(1, dt * 4); DS.fig.userData.head.rotation.y += DS.hy;
  }
  DS.hail = fig ? { x: DS.F.x, z: DS.F.z } : seated && !DS.moving && (q.held || !(driverWork() > 0)) ? { x: a.x, z: a.z } : null;
  DS.rider.visible = seated; DS.lamp.visible = seated; DS.glow.visible = seated && night > 0.05; if (DS.glow.visible) DS.glow.material.opacity = 0.3 + 0.7 * night;
  if (seated) DS.rider.userData.torso.rotation.x = 0.5 + (DS.moving ? Math.sin(now * 6.3) * 0.012 + clamp(-pitch, -0.3, 0.3) * 0.25 : 0.06);
  DS.n = n; for (let i = 0; i < DS.drums.length; i++) DS.drums[i].visible = i < n;
  // a pressed track where you can see it
  if (DS.moving && Math.abs(DS.s - DS.pS) >= 0.5 && Math.hypot(pl.x - a.x, pl.z - a.z) < RUN.press) {
    DS.pS = DS.s;
    try { for (const sx of [-1, 1]) W.pressSnow(a.x - a.tx * 1.9 + lx * sx * 0.3, a.z - a.tz * 1.9 + lz * sx * 0.3, 0.3, 0.78); W.pressSnow(b.x - a.tx * 1.2, b.z - a.tz * 1.2, 0.42, 0.7); W.markTrail(a.x, a.z, true); } catch (e) { }
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
    if (r.store < 1) { try { api.TABLET.notify({ app: "lights", kind: "warn", ttl: 9, title: `${lp.name}: last drum pumped in`, body: `${kFirst(lp)} pumped the last drum into the tank: about ${Math.round(hoursLeft(r, lp))} lamp hours, and the oil store is empty. ${driverOf() && driverWork() > 0 ? `${dFirst()} hauls the next ones out from the quay${drvRec().so ? "" : " once you order them"}.` : "Order drums and haul them out."}` }); } catch (e) { } }
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
  if (s.drv && typeof s.drv === "object") { s.drv.wkN = 0; s.drv.wkLate = 0; }
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
  api.toast(`Paraffin drum paid for (${LIGHTS.drum} L). It's waiting at the quay: ${driverOf() && driverWork() > 0 ? `${dFirst()} will haul it out to ${lp.at}, or take it yourself in a parcel slot.` : `it rides in a parcel slot, out to ${lp.at}.`}`, "good");
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
    const r = rec(lp.id), its = itsDrum(lp), dv = drvAboard(lp);          // dv: on the oil driver's sled (6.3b1), saved with the driver
    const ab = G.load.filter(its).length, cl = G.claims.filter(its).length, was = lastAb[lp.id] || 0;
    if (ab < was) r.q = Math.max(0, r.q - (was - ab));
    lastAb[lp.id] = ab;
    if (r.q < ab + cl + dv) r.q = ab + cl + dv;
    if (owns(lp)) for (let miss = r.q - ab - cl - dv; miss > 0; miss--) { const c = mkClaim(lp); if (!c) break; G.claims.push(c); }
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
    const lp = lampHere(); if (!lp) return hailUse();                      // out of doors: the oil driver within reach (6.3b2b)
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
  const dm = driverOf();
  if (dm) {
    const q = drvRec();
    h += U.tabCard({ tf: "oilrun", title: "Oil run", chips: U.chip("OIL DRIVER", "ok") + (driverWork() > 0 ? (q.held ? U.chip("WEATHER", "due") : q.st !== "quay" ? U.chip("OUT") : "") : U.chip("NOT WORKING", "due")),
      meta: `${U.esc(dm.name)}: ${U.esc(drvLine(q, dm))}`,
      note: `This week: ${plural(q.wkN, "drum")} hauled${q.wkLate ? `, ${q.wkLate} trip${q.wkLate === 1 ? "" : "s"} late` : ""}. ${q.so ? `Standing order on: at the quay ${U.esc(dFirst())} orders drums on your account (${api.fmtCash(LIGHTS.drumCost)} each) for a light under ${DRV.orderH} lamp hours of oil in the tank, the store and on the way.` : "Standing order off: drums are ordered only when you order them."} Hauls ${DRV.cap} a trip, to the light that is lowest; pumping and lighting are the keeper's, or yours.`,
      act: "lso", actLabel: q.so ? "STOP THE STANDING ORDER" : "START A STANDING ORDER" });
  }
  for (const lp of own) {
    const r = rec(lp.id), st = stateOf(r), full = stock(lp) >= N(lp, "stockMax"), due = Math.round(r.lit * N(lp, "stipend")), nd = drumsOf(r.store);
    h += U.tabCard({ tf: "lamp:" + lp.id, title: lp.name, chips: U.chip(st.chip, st.cls) + (r.on && hoursLeft(r, lp) < LIGHTS.lowH ? U.chip("OIL LOW", "due") : ""),
      meta: `Tank ${Math.round(r.oil)} of ${N(lp, "tank")} L · ${r.oil > 0 ? `about ${Math.round(hoursLeft(r, lp))} lamp hours` : "dry"} · lamp ${st.word}${own.length > 1 ? ` · ${api.fmtCash(N(lp, "stipend"))} an hour lit` : ""}`,
      note: `This week: ${Math.round(r.lit)} lamp hours of ${Math.round(r.need)} dark · stipend so far ${api.fmtCash(due)}. Oil store: ${nd ? `${plural(nd, "full drum")} (${Math.round(r.store)} L)` : "empty"}.${r.q ? ` ${plural(r.q, "drum")} paid for, ${drvAboard(lp) ? `${drvAboard(lp)} on ${dFirst()}'s sled${r.q > drvAboard(lp) ? ", the rest at the quay or aboard" : ""}` : "at the quay or aboard"}.` : ""}${keeperLine(lp, r)}`,
      warn: !r.on && keeperWork(lp) > 0 ? (r.oil > 0 || nd ? `The lamp is out. ${kFirst(lp)} will ${r.oil > 0 ? "light it" : "pump a drum in and light it"} on the next round, or do it yourself in ${lp.where}.` : `The lamp is out, the tank is dry and the oil store is empty. Order a drum and haul it out from the quay: ${kFirst(lp)} does the rest.`) : !r.on ? (r.oil > 0 ? `The lamp is out. There's oil in the tank: climb the ${lp.up} in ${lp.where} and light it.` : nd ? `The lamp is out and the tank is dry. Pump a drum into the tank at the rack in ${lp.where}, then climb up and light it.` : "The lamp is out, the tank is dry and the oil store is empty. Order a drum and haul it out from the quay.") : "",
      pay: api.fmtCash(LIGHTS.drumCost), act: "lord:" + lp.id, actLabel: "ORDER A DRUM", blocked: full || cash < LIGHTS.drumCost });
  }
  if (s.last.length) h += U.sec("Stipend statements", "") + `<div class="tsml2">${s.last.map(q => `<div class="tsm2 tprow"><b>${U.esc(q.d)}</b><span>Stipend +${api.fmtCash(q.pay)} · ${q.lit} of ${q.need} dark hours lit</span>${q.need - q.lit > 2 ? U.chip("DARK " + (q.need - q.lit) + " H", "due") : U.chip("PAID", "ok")}</div>`).join("")}</div>`;
  const days = lp => Math.round(N(lp, "tank") / N(lp, "burn") / 24);
  if (own.length === 1 && !own[0].small) h += `<p class="tnote2">The lamp burns ${LIGHTS.burn} L of paraffin an hour while the sun is down (a sun valve shuts it by day), so a full tank is about ${days(own[0])} days of polar night. A drum is ${LIGHTS.drum} L: it waits at the quay, rides out in a parcel slot, and is pumped into the tank by hand at the rack in the tower room. A lamp that runs dry stays out until someone climbs up and lights it.</p>`;
  else h += `<p class="tnote2">A lamp burns paraffin only while the sun is down (a sun valve shuts it by day): ${own.map(lp => `${lp.at} ${N(lp, "burn")} L an hour from a ${N(lp, "tank")} L tank, about ${days(lp)} days of polar night`).join("; ")}. A drum is ${LIGHTS.drum} L: it is ordered for one light, waits at the quay, rides out in a parcel slot, and is pumped into the tank by hand at the rack. A lamp that runs dry stays out until someone climbs up and lights it.</p>`;
  el.innerHTML = `<div class="tapp">${h}</div>`;
  for (const b of el.querySelectorAll("[data-act^='lord:']")) b.addEventListener("click", () => order(b.dataset.act.slice(5)));
  for (const b of el.querySelectorAll("[data-act='lso']")) b.addEventListener("click", drvToggle);
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
  /* 6.3b1: the oil driver's job, on the oil run from the quay (one driver for every light you own) */
  TLX.staff.addRole("oildriver", { name: "Oil driver", wage: DRV.wage, blurb: "hauls the paraffin drums from the quay out to your lights",
    app: true, at: "on the", the: true,
    greet: () => "Hello! I saw you want a driver for the oil run out to the lights.",
    qs: { stove: { label: "WHITEOUT ON THE FELL?", ask: "Halfway out with two drums on the sled and it closes in to a whiteout. What do you do?" } },
    tag: a => "own sled",
    note(m) {
      const q = api ? drvRec() : null; if (!q) return "Hauls the paraffin drums out to your lights";
      return `Hauls the paraffin drums out to your lights, ${DRV.cap} a trip: ${drvLine(q, m)}. Rides in weather up to ${drvLimit(m) >= 0.66 ? "a full gale" : drvLimit(m) >= 0.54 ? "a stiff blow" : "a fresh breeze"}; standing order ${q.so ? "on" : "off"}`;
    },
    acts: () => { const q = api ? drvRec() : null; return q ? [{ k: "so", label: q.so ? "STOP THE STANDING ORDER" : "START A STANDING ORDER" }] : []; },
    act(m, k) { if (k === "so") { drvToggle(); return true; } return false; },
    answer(a, q, c) {
      const x = a.xp, r = a.xpReal, v = a.village;
      if (q === "xp") {
        if (c.slip) return `${x} years. Well... that's counting riding to school on my brother's sled, and a winter of weekends. Hauling for pay, more like ${r === 0 ? "none" : r === 1 ? "one" : r}.`;
        if (c.liar) return `${x} years, give or take. Freight, fuel, the lot. Never dropped a load.${c.tail}`;
        return (x === 0 ? `None for pay. I've ridden the fell out of ${v} since I could reach the bars, and I've a sled and a freight sledge of my own.`
          : x <= 3 ? `${x} winter${x > 1 ? "s" : ""} hauling fuel and feed to the herder cabins out of ${v}.`
          : x <= 10 ? `${x} winters on freight: fuel drums, stoves, whatever needed to get out past the road end.`
          : `${x} winters. I hauled for the lights before Kystverket put them out to tender, so I know every cairn on the way.`) + c.tail;
      }
      if (q === "stove") {
        if (c.slip) return "Keep the throttle in and hope I hit the coast? I've... mostly ridden in good weather, to be fair.";
        if (c.liar) return `Whiteouts don't bother me. I'd be there on time, same as always.${c.tail}`;
        return (r >= 3 ? "Stop. Back to the sled's own track if I can still see it, engine off, dig in on the lee side and wait: drums don't spoil. Late is a dark lamp for a night. Lost is a search party."
          : "Turn round while I can still see my own track, and ring you from the quay. I'd rather be late than be looked for.") + c.tail;
      }
      if (q === "why") {
        const w = a.tr && a.tr.work || 1;
        return (w >= 1.1 ? "I like a run with a point to it. Somebody is steering by that lamp, and it burns what I bring."
          : w <= 0.8 ? "It's riding, mostly, and nobody timing me. Suits me."
          : `It's steady winter work out of ${v}, and I'd be out on the sled anyway.`) + (c.hot ? " Is that it?" : "");
      }
      return "";
    } });
  // where they can be talked to in person (6.3b2b): wherever they are STOPPED, at the quay, carrying drums in at a light,
  // sat out in weather or idle over owed wages on the run. Riding, nowhere.
  TLX.staff.addPlaces(() => {
    const a = A(); if (!a || !api || !mine().length) return [];
    const m = driverOf(), q = m && S() && S().drv && typeof S().drv === "object" && S().drv.who === m.id ? S().drv : null, away = !!(q && q.st !== "quay");
    let pos = null, spot = "the quay", talk = `Go to the quay to talk to ${dFirst()} in person.`;
    if (!away) { try { pos = quaySpot(); } catch (e) { pos = a.world.depot; } }
    else if (q.st === "unload" || q.held || !(driverWork() > 0)) {
      pos = drvPos(q); const lp = lampOf(q.lamp); spot = q.st === "unload" && lp ? lp.at : "their sled";
      talk = q.st === "unload" && lp ? `${dFirst()} is carrying drums in at ${lp.at}: go there to talk in person.` : `${dFirst()} is stopped out on the run (the Map shows where): go to their sled to talk in person.`;
    } else talk = `${dFirst()} is riding the run: have a word when they are stopped, at the quay or carrying the drums in at a light.`;
    return [{ id: DRV.place, role: "oildriver", name: "oil run", spot, x: pos ? pos.x : undefined, z: pos ? pos.z : undefined, talk }];
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
    if (s.drv !== undefined && (!s.drv || typeof s.drv !== "object" || Array.isArray(s.drv))) delete s.drv;                /* 6.3b1: the oil driver's trip (drvRec tidies the rest at the first step, once the lights are placed) */
    if (a.TABLET.addLayer && !pinned) { pinned = true; a.TABLET.addLayer("marks", drvPins); }                              // the driver on the Map while out on the run
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
    dsTick(dt);
  }
});
TLX.lights = { LIGHTS, LAMPS, rec, out, owns: id => { const lp = lampOf(id); return !!lp && owns(lp); }, mine, step, sync, monday, order, land, light: id => { const lp = lampOf(id); return !!lp && light(lp); },
  PUMP, startPump: id => startPump(lampOf(id)), stopPump, use: () => PROV.use(), dark, hoursLeft: id => hoursLeft(rec(id), lampOf(id)), stock: id => stock(lampOf(id)), state: S,
  // 6.2b: the smaller lights
  // 6.3a: keepers
  KEEP, keeper: id => { const lp = lampOf(id); return lp ? keeperOf(lp) : null; }, keeperWork: id => { const lp = lampOf(id); return lp ? keeperWork(lp) : 0; }, roundH, round: id => keeperRound(lampOf(id), rec(id)),
  // 6.3b1: the oil driver
  DRV, driver: driverOf, driverWork, drv: () => drvRec(), drvPos: () => drvPos(drvRec()), drvLine: () => { const m = driverOf(); return m ? drvLine(drvRec(), m) : ""; }, drvLimit, drvToggle, drvPins, atQuay: id => atQuay(lampOf(id)), drvAboard: id => drvAboard(lampOf(id)),
  // 6.3b2a: the run over the ground and the sled on it
  RUN, route: id => route(lampOf(id)), posAt, quaySpot, sled: () => DS,
  // 6.3b2b: the driver on foot
  UN, unPlan: id => unPlan(lampOf(id)), unTot, unAt, hail, hailUse,
  SMALL, num: (id, k) => N(lampOf(id), k), flashOn, dropTick, small: id => { const lp = lampOf(id); return lp && lp.small || null; } };
})();
